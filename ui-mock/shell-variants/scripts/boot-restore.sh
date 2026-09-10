#!/usr/bin/env bash
# dev.sh — cold-start restorer for the shell-variants review surface (:3000).
#
# WHAT THIS SERVES: THIS stream's app — ui-mock/shell-variants (the full
# spec-18 study: 596 tests, 83 stories, annotakit review surface). The
# parallel shell-mini stream serves its own env; per-env :3000 ownership was
# set by user directive ("serve YOURS in this env").
#
# THE CHAIN: public URL → FC edge → Caddy :81 (platform, always up) →
# localhost:3000 → Storybook 10.6 dev. The edge rewrites Host to
# ...fcapp.run; the committed .storybook/main.ts sets core.allowedHosts:true
# (builder-vite forwards it to vite server.allowedHosts) so the public URL
# works. Verification law: localhost curl is a FALSE PASS — probe the
# annotakit health path (/annotakit/api/health) locally, then the real
# public URL (or curl -H 'Host: preview-chat-<id>.fcapp.run' :81).
#
# LAYERS:
#   1. repo clone /home/z/nle-core-spec (overlay — dies on recycle; restore
#      from newest /home/sync/nle-core-spec-*.bundle, PAT-free)
#   2. RUNTIME copy /home/z/my-project/shell-variants (persistent volume:
#      node_modules, vendored annotakit dist, .env w/ ANNOTAKIT_GH_TOKEN,
#      own git store branch `annotakit-store` — threads.db git-push
#      durability)
#   3. double-fork daemon scripts/sb3000.py (fork→setsid→fork; grandchild
#      PPID=1 survives the per-toolcall descendant-tree reap)
#
# CODE-SYNC LAW (2026-09-07 incident): the runtime is a SERVING COPY, the
# repo is the source of truth. A recycle used to restore the daemon but
# NOT the code — the public review URL served a stale tree while GitHub
# was two rounds ahead (user: "i see nothing changed"). boot-restore now
# reconciles repo→runtime on EVERY boot (stamp-gated no-op when in sync),
# BEFORE the health-exit so a live-but-stale daemon hot-reloads too.
#
# Idempotent — safe to run at boot (harness hook) or any time, twice.

set -u
LOG="$(cd "$(dirname "$0")" && pwd)/dev.log"
REPO=/home/z/nle-core-spec
RUNTIME=/home/z/my-project/shell-variants
BUNDLE=$(ls -t /home/sync/nle-core-spec-*.bundle 2>/dev/null | head -1)

exec >>"$LOG" 2>&1
echo "=== dev.sh (shell-variants) $(date -Is) ==="

# 1. Repo (source of truth; overlay dies on recycle).
if [ ! -d "$REPO/.git" ]; then
  echo "repo missing — restoring from ${BUNDLE:-<none>}"
  if [ -n "${BUNDLE:-}" ]; then
    git clone "$BUNDLE" "$REPO" || echo "bundle clone FAILED (continuing — runtime copy is the serving host)"
    [ -d "$REPO/.git" ] && git -C "$REPO" remote set-url origin https://github.com/frejogochukwuout/nle-core-spec.git
    # CHECKOUT GUARD (2026-09-10 incident): the sync bundles' HEAD points at a
    # ref they don't carry — `git clone` leaves master unborn with NO working
    # tree, code-sync then no-ops (empty REPO_HEAD) and the runtime serves a
    # stale tree silently. Repair: force a local main at origin/main.
    if [ -d "$REPO/.git" ] && [ ! -f "$REPO/ui-mock/shell-variants/package.json" ]; then
      git -C "$REPO" checkout -f -B main origin/main 2>/dev/null \
        && echo "repo checkout repaired (main @ $(git -C "$REPO" rev-parse --short HEAD))"
    fi
  else
    echo "no bundle — relying on runtime copy alone this boot"
  fi
fi

# 1b. Best-effort fast-forward from GitHub — a recycle must be able to pick
#     up commits NEWER than the newest bundle (token never logged; failures
#     fall back to serving the bundle state).
GH_TOK="${ANNOTAKIT_GH_TOKEN:-$(sed -n 's/^ANNOTAKIT_GH_TOKEN=//p' "$RUNTIME/.env" 2>/dev/null | head -1)}"
if [ -n "${GH_TOK:-}" ] && [ -d "$REPO/.git" ]; then
  if git -C "$REPO" fetch -q "https://${GH_TOK}@github.com/frejogochukwuout/nle-core-spec.git" main 2>/dev/null \
     && git -C "$REPO" merge --ff-only -q FETCH_HEAD 2>/dev/null; then
    echo "repo fast-forwarded: $(git -C "$REPO" rev-parse --short HEAD)"
  else
    echo "github fast-forward skipped (offline/diverged — serving bundle state)"
  fi
fi

# 1c. CODE SYNC repo→runtime (stamp-gated). Runtime-only state is protected:
# .git/ (incl. the annotakit threads.db store), .env, node_modules, dist,
# logs, the stamp itself. A live daemon hot-reloads the synced files.
REPO_HEAD=$(git -C "$REPO" rev-parse HEAD 2>/dev/null || echo "")
STAMP="$RUNTIME/.code-sync-stamp"
if [ -n "$REPO_HEAD" ] && [ -f "$REPO/ui-mock/shell-variants/package.json" ]; then
  if [ "$(cat "$STAMP" 2>/dev/null)" != "$REPO_HEAD" ]; then
    if command -v rsync >/dev/null 2>&1; then
      echo "code-sync: runtime ← repo @ ${REPO_HEAD} (was: $(cat "$STAMP" 2>/dev/null || echo none))"
      mkdir -p "$RUNTIME"
      PKG_BEFORE=$(md5sum "$RUNTIME/package.json" 2>/dev/null | cut -d' ' -f1)
      rsync -a --delete \
        --exclude '/.git/' --exclude '/.env' \
        --exclude '/node_modules/' --exclude '/dist/' \
        --exclude '/.code-sync-stamp' \
        --exclude '/.storybook/annotakit/' \
        --exclude 'sb3000.log' --exclude 'dev.log' --exclude 'dev.pid' \
        "$REPO/ui-mock/shell-variants/" "$RUNTIME/"
      # ELOOP guard: self-referential symlinks crash vite's watcher (the
      # R23 shots/ absolute-path links did exactly this once synced into
      # the runtime). Dangling links die too — harmless, tree stays clean.
      find "$RUNTIME" \( -name node_modules -o -name .git -o -name dist \) -prune -o -type l -print 2>/dev/null \
        | while read -r L; do stat -L "$L" >/dev/null 2>&1 || rm -f "$L"; done
      # Deps drift: if package.json changed, refresh node_modules to match.
      if [ -f "$RUNTIME/package.json" ] && [ "$(md5sum "$RUNTIME/package.json" 2>/dev/null | cut -d' ' -f1)" != "${PKG_BEFORE:-none}" ]; then
        echo "package.json changed — npm ci"
        (cd "$RUNTIME" && npm ci --no-audit --no-fund) || echo "npm ci FAILED (serving with stale deps)"
      fi
      echo "$REPO_HEAD" > "$STAMP"
    else
      echo "code-sync SKIPPED — rsync not installed (cp fallback only rebuilds a MISSING runtime)"
    fi
  fi
fi

# 2. Runtime copy missing entirely? Rebuild from repo (rsync-less fallback).
if [ ! -f "$RUNTIME/package.json" ]; then
  echo "runtime copy missing — rebuilding from repo"
  if [ -d "$REPO/ui-mock/shell-variants/package.json" ]; then
    mkdir -p "$RUNTIME"
    cp -a "$REPO/ui-mock/shell-variants/." "$RUNTIME/"
    [ -n "$REPO_HEAD" ] && echo "$REPO_HEAD" > "$STAMP"
  else
    echo "no source available — cannot rebuild runtime"
    exit 1
  fi
fi

# 0. Already up AND code in sync? (health endpoint, not a bare 200 —
#    half-dead tenants bound but not serving must be freed, not trusted)
if curl -s -m 2 -o /dev/null http://127.0.0.1:3000/annotakit/api/health; then
  echo ":3000 health OK — nothing to do"
  exit 0
fi

# 0b. Free :3000 from half-dead tenants.
PIDS=$(ss -tlnp 2>/dev/null | awk '/:3000 /{print $NF}' | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u)
if [ -n "${PIDS:-}" ]; then
  echo ":3000 bound but unhealthy — killing: $PIDS"
  kill $PIDS 2>/dev/null
  sleep 1
fi

cd "$RUNTIME" || exit 1

# 3. Deps.
if [ ! -x node_modules/.bin/storybook ]; then
  echo "node_modules missing — npm ci"
  npm ci --no-audit --no-fund || { echo "npm ci FAILED"; exit 1; }
fi

# 4. Vendored annotakit dist (gitignored in the main repo — rebuild if missing).
if [ ! -f vendor/storybook-annotakit/dist/server.cjs ]; then
  echo "annotakit dist missing — vendor:build"
  npm run vendor:build || echo "vendor build FAILED (review API degraded)"
fi

# 5. .env token (gitignored; PAT comes from chat/ANNOTAKIT_GH_TOKEN env var).
if [ ! -f .env ] && [ -n "${ANNOTAKIT_GH_TOKEN:-}" ]; then
  printf 'ANNOTAKIT_GH_TOKEN=%s\nANNOTAKIT_GH_REPO=frejogochukwuout/nle-core-spec\n' "$ANNOTAKIT_GH_TOKEN" > .env
fi

# 6. Launch (double-fork — survives per-toolcall reaping).
echo "launching sb3000.py"
python3 scripts/sb3000.py
sleep 8
if curl -s -m 3 -o /dev/null http://127.0.0.1:3000/annotakit/api/health; then
  echo "RESTORED — :3000 serving shell-variants Storybook (verify the public URL too)"
else
  echo "WARNING — launch issued but health not green yet (check $RUNTIME/sb3000.log)"
fi

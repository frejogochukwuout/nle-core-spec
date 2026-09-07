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
#   3. double-fork daemon scripts/sb3000.py (fork→setsid→fork→exec; grandchild
#      PPID=1 survives the per-toolcall descendant-tree reap)
#
# Idempotent — safe to run at boot (harness hook) or any time, twice.

set -u
LOG="$(cd "$(dirname "$0")" && pwd)/dev.log"
REPO=/home/z/nle-core-spec
RUNTIME=/home/z/my-project/shell-variants
BUNDLE=$(ls -t /home/sync/nle-core-spec-*.bundle 2>/dev/null | head -1)

exec >>"$LOG" 2>&1
echo "=== dev.sh (shell-variants) $(date -Is) ==="

# 0. Already up? (health endpoint, not a bare 200 — half-dead tenants bound
#    but not serving must be freed, not trusted)
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

# 1. Repo (source of truth; overlay dies on recycle).
if [ ! -d "$REPO/.git" ]; then
  echo "repo missing — restoring from ${BUNDLE:-<none>}"
  if [ -n "${BUNDLE:-}" ]; then
    git clone "$BUNDLE" "$REPO" || echo "bundle clone FAILED (continuing — runtime copy is the serving host)"
    [ -d "$REPO/.git" ] && git -C "$REPO" remote set-url origin https://github.com/frejogochukwuout/nle-core-spec.git
  else
    echo "no bundle — relying on runtime copy alone this boot"
  fi
fi

# 2. Runtime copy missing? Rebuild from repo.
if [ ! -f "$RUNTIME/package.json" ]; then
  echo "runtime copy missing — rebuilding from repo"
  if [ -d "$REPO/ui-mock/shell-variants/package.json" ]; then
    mkdir -p "$RUNTIME"
    cp -a "$REPO/ui-mock/shell-variants/." "$RUNTIME/"
  else
    echo "no source available — cannot rebuild runtime"
    exit 1
  fi
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

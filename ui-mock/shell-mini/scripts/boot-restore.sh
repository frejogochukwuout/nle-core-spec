#!/usr/bin/env bash
# boot-restore.sh — cold-start restorer. R18 layout: the FULL Storybook dev
# server owns :3000 (the PUBLIC review surface); the app is localhost :3001.
#
# WHY THIS EXISTS: the public preview URL (https://preview-chat-<chat-id>.*.space-z.ai/)
#   → FC edge → Caddy :81 → localhost:3000. Caddy is platform plumbing that is
#   ALWAYS running; the only requirement is that OUR storybook dev server holds
#   :3000 (serving rule per user directive R18 — the same pattern the sibling
#   shell-variants stream verified in its own env; see .agents/SKILL.md R17/R18).
#   A container recycle kills the double-forked daemons (and the
#   /home/z/nle-core-spec clone on overlay) — this script re-converges.
#
# WHERE THIS RUNS: the sandbox harness runs .zscripts/dev.sh at boot (the one
#   user-controllable boot hook; an iso of THIS file). It is also safe to run
#   manually at ANY time — fully idempotent. If the harness does not execute
#   it, the next agent session must run it as first action (see
#   .agents/HANDOFF.md in nle-core-spec).
#
# NO PATs IN HERE (deliberately): the repo is restored from the /home/sync git
#   bundle (durable OSS). It may be a session or two stale; the next agent
#   session pulls from origin/gitlab with the PAT from chat.
#
# LOG: .zscripts/dev.log (iso copy) / boot.log — untracked, survives
#   watchdog force-checkouts.

set -u
LOG="$(cd "$(dirname "$0")" && pwd)/boot.log"
REPO=/home/z/nle-core-spec
BUNDLE=$(ls -t /home/sync/nle-core-spec-*.bundle 2>/dev/null | head -1)
TARBALL=$(ls -t /home/sync/nle-core-spec-*.tgz 2>/dev/null | head -1)

exec >>"$LOG" 2>&1
echo "=== boot-restore $(date -Is) ==="

# 0. Already up? Probe the STORYBOOK INDEX (asset-chain proof, not bare HTML).
if curl -s -m 3 -o /dev/null http://127.0.0.1:3000/index.json; then
  echo ":3000 storybook index answering — nothing to do"
  exit 0
fi

# 0b. Port bound but not answering (half-dead daemon or stale tenant)?
#     User directive R18: the storybook server OWNS :3000. Free it.
#     (Identify before killing: cwd, not just cmdline — R17 gotcha 7.)
PIDS=$(ss -tlnp 2>/dev/null | awk '/:3000 /{print $NF}' | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u)
if [ -n "${PIDS:-}" ]; then
  echo ":3000 bound but index dead — inspecting then killing: $PIDS"
  for p in $PIDS; do
    echo "  pid $p cwd=$(readlink /proc/$p/cwd 2>/dev/null || echo '?') cmd=$(tr '\0' ' ' </proc/$p/cmdline 2>/dev/null | cut -c1-80)"
  done
  kill $PIDS 2>/dev/null
  sleep 1
  kill -9 $PIDS 2>/dev/null || true
  sleep 1
fi

# 1. Ensure the repo exists (overlay rootfs dies on recycle).
if [ ! -d "$REPO/.git" ]; then
  echo "repo missing — restoring from ${BUNDLE:-<none>}"
  if [ -n "${BUNDLE:-}" ]; then
    git clone "$BUNDLE" "$REPO" || { echo "bundle clone FAILED"; exit 1; }
    git -C "$REPO" remote set-url origin https://github.com/frejogochukwuout/nle-core-spec.git
  elif [ -n "${TARBALL:-}" ]; then
    echo "bundle missing — extracting $TARBALL"
    tar xzf "$TARBALL" -C /home/z || { echo "tarball extract FAILED"; exit 1; }
  else
    echo "no restore source in /home/sync — need agent session (clone w/ PAT)"
    exit 1
  fi
fi

# 2. Ensure deps (node_modules is not in git).
cd "$REPO/ui-mock/shell-mini" || { echo "shell-mini dir missing"; exit 1; }
if [ ! -d node_modules ]; then
  echo "node_modules missing — npm ci"
  npm ci --no-audit --no-fund || { echo "npm ci FAILED"; exit 1; }
fi

# 3. MUST-SUCCEED: launch the full storybook dev server on :3000 (double-fork
#    daemon — survives per-toolcall reaping). Poll the asset chain (SB dev
#    needs 25-40s on a cold optimizer cache; ~300ms warm).
echo "launching sb3000.py (must-succeed)"
python3 scripts/sb3000.py
for i in $(seq 1 24); do
  if curl -s -m 3 -o /dev/null http://127.0.0.1:3000/index.json; then break; fi
  sleep 5
done
if curl -s -m 3 -o /dev/null http://127.0.0.1:3000/index.json; then
  echo "STORYBOOK RESTORED — :3000 serving the public review surface"
else
  echo "FATAL — storybook not answering on :3000 (check sb.log in shell-mini)"
  exit 1
fi

# 4. Best-effort, non-fatal: the app dev server on localhost :3001 (agent
#    dev loop for the app itself; NOT public).
echo "launching dev3000.py (:3001, best-effort)"
python3 scripts/dev3000.py || echo "app dev launch failed (non-fatal)"

# 5. Belt-and-braces verification through the platform proxy layer.
sleep 2
if curl -s -m 5 -o /dev/null -H 'Host: preview-chat-4c1120aa-eb90-4156-b501-f6e57f6fe7a9.fcapp.run' http://127.0.0.1:81/; then
  echo "forged-Host probe through Caddy :81 — OK"
else
  echo "WARNING — forged-Host probe through :81 failed (check Caddy/Host acceptance)"
fi

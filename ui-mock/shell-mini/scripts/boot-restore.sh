#!/usr/bin/env bash
# dev.sh — cold-start restorer for the shell-mini preview app (port 3000).
#
# WHY THIS EXISTS: the public preview URL (https://preview-chat-<chat-id>.*.space-z.ai/)
#   → FC edge → Caddy :81 → localhost:3000. Caddy is platform plumbing that is
#   ALWAYS running; the only requirement is that OUR app holds :3000. A container
#   recycle kills the double-forked dev daemon (and the /home/z/nle-core-spec
#   clone on overlay) — this script re-converges the arrangement.
#
# WHERE THIS RUNS: the sandbox harness runs .zscripts/dev.sh at boot (the one
#   user-controllable boot hook). It is also safe to run manually at ANY time —
#   fully idempotent. If the harness does not execute it, the next agent session
#   must run it as first action (see .agents/HANDOFF.md in nle-core-spec).
#
# NO PATs IN HERE (deliberately): the repo is restored from the /home/sync git
#   bundle (durable OSS). It may be a session or two stale; the next agent
#   session pulls from origin/gitlab with the PAT from chat.
#
# LOG: .zscripts/dev.log (this dir, untracked in the my-project git repo —
#   survives the watchdog force-checkout, which only resets tracked files).

set -u
LOG="$(cd "$(dirname "$0")" && pwd)/dev.log"
REPO=/home/z/nle-core-spec
BUNDLE=$(ls -t /home/sync/nle-core-spec-*.bundle 2>/dev/null | head -1)
TARBALL=$(ls -t /home/sync/nle-core-spec-*.tgz 2>/dev/null | head -1)

exec >>"$LOG" 2>&1
echo "=== dev.sh $(date -Is) ==="

# 0. Already up? Single probe, no loops.
if curl -s -m 2 -o /dev/null http://127.0.0.1:3000/; then
  echo ":3000 answering — nothing to do"
  exit 0
fi

# 0b. Port bound but not answering (half-dead vite or stale tenant)?
#     User directive: shell-mini OWNS :3000. Free it.
PIDS=$(ss -tlnp 2>/dev/null | awk '/:3000 /{print $NF}' | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u)
if [ -n "${PIDS:-}" ]; then
  echo ":3000 bound but not answering — killing: $PIDS"
  kill $PIDS 2>/dev/null
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

# 3. Launch the app (double-fork daemon — survives per-toolcall reaping).
echo "launching dev3000.py"
python3 scripts/dev3000.py
sleep 3
if curl -s -m 2 -o /dev/null http://127.0.0.1:3000/; then
  echo "APP RESTORED — :3000 serving (public: / and /stories/index.html)"
else
  echo "WARNING — launch issued but :3000 not answering yet (check dev.log in shell-mini)"
fi

# 4. Launch the localhost dev storybook (best-effort, non-fatal — the PUBLIC
#    storybook is the static build at /stories/ served by the app itself;
#    6007 is only the HMR dev loop for agent sessions).
echo "launching sb6007.py (best-effort)"
python3 scripts/sb6007.py || echo "storybook dev launch failed (non-fatal)"

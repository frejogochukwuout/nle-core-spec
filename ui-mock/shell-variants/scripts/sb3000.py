#!/usr/bin/env python3
"""Double-fork Storybook dev-server launcher for port 3000 (shell-variants).

Serves MY app (ui-mock/shell-variants — the full spec-18 study, 596 tests,
83 stories + annotakit review surface) on the public preview URL:
public URL → FC edge → Caddy :81 → localhost:3000 → Storybook 10.6 dev.

The Z-container kills the whole descendant tree of every bash toolcall at
call end — plain `nohup`/`setsid`/`disown` all die with it (verified twice
this session). A double-forked grandchild reparents to PID 1 (tini) and
escapes the reap:

    fork -> setsid -> fork -> (grandchild, PPID=1) -> chdir -> exec node

Log: sb3000.log in the runtime root (gitignored via *.log).
Refuses to start a second server if :3000 is already answering.
Frees :3000 from half-dead tenants first (same rule as boot-restore.sh).
Relaunch after container recycle: `python3 scripts/sb3000.py`
(canonical copy: /home/z/my-project/.zscripts/sb3000.py iso).

Host-header law: the FC edge rewrites Host to ...fcapp.run; Caddy passes it
through; Storybook 10.6 core-server validates hosts — the committed
.storybook/main.ts sets core.allowedHosts: true (builder-vite forwards it
into vite server.allowedHosts), so the public URL works. A localhost curl
is a FALSE PASS for public liveness — probe with
`curl -H 'Host: preview-chat-<id>.fcapp.run' http://127.0.0.1:81/` or the
real public URL.
"""
import os
import socket
import subprocess
import sys
import time

RUNTIME = '/home/z/my-project/shell-variants'  # persistent-volume runtime copy (preferred host)
if not os.path.isfile(os.path.join(RUNTIME, 'node_modules/.bin/storybook')):
    # fallback: derive from this script's location (repo checkout layout
    # <root>/ui-mock/shell-variants/scripts/sb3000.py)
    RUNTIME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG = os.path.join(RUNTIME, 'sb3000.log')
PORT = 3000


def port_answering(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(('127.0.0.1', port)) == 0


def free_port(port: int) -> None:
    """Kill half-dead tenants bound to the port but not answering HTTP."""
    try:
        out = subprocess.run(
            ['ss', '-tlnp'], capture_output=True, text=True, timeout=5
        ).stdout
    except Exception:
        return
    pids = set()
    for line in out.splitlines():
        if f':{port} ' in line:
            for tok in line.split():
                if tok.startswith('pid='):
                    pids.add(int(tok[4:]))
    for pid in pids:
        if pid == os.getpid():
            continue
        try:
            os.kill(pid, 15)
            print(f'killed half-dead tenant pid={pid}')
        except ProcessLookupError:
            pass
    if pids:
        time.sleep(1)


def daemonize() -> None:
    if os.fork():                      # parent exits -> shell returns immediately
        sys.exit(0)
    os.setsid()                        # new session, no controlling tty
    if os.fork():                      # first child exits -> grandchild PPID=1
        os._exit(0)
    sys.stdout.flush()
    sys.stderr.flush()


def main() -> None:
    if port_answering(PORT):
        print(f'port {PORT} already answering — server likely up; NOT starting another')
        sys.exit(0)
    free_port(PORT)

    devnull = os.open('/dev/null', os.O_RDWR)
    logfd = os.open(LOG, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
    os.dup2(devnull, 0)
    os.dup2(logfd, 1)                  # stdout/stderr -> sb3000.log
    os.dup2(logfd, 2)

    daemonize()
    os.chdir(RUNTIME)
    # storybook dev on :3000 (the .storybook/main.ts core.allowedHosts:true
    # handles the edge-rewritten Host). node executes the npm .bin shim
    # directly (bypassing its shebang).
    os.execvp('node', ['node', 'node_modules/.bin/storybook', 'dev', '-p', '3000',
                       '--no-open'])
    # execvp never returns on success


if __name__ == '__main__':
    main()

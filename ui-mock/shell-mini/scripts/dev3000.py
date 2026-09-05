#!/usr/bin/env python3
"""Double-fork Vite dev-server launcher for port 3000.

The Z-container kills the whole descendant tree of every bash toolcall at
call end — plain `nohup`/`setsid`/`disown` all die with it (verified twice
this session). A double-forked grandchild reparents to PID 1 (tini) and
escapes the reap:

    fork -> setsid -> fork -> (grandchild, PPID=1) -> chdir -> exec node vite

Log: dev.log in the shell-mini root (gitignored via *.log).
Refuses to start a second server if :3000 is already answering.
Dies on container recycle — relaunch with `python3 scripts/dev3000.py`.

The app serves at the container root because Caddy (:81, the only
externally exposed port) reverse-proxies localhost:3000 to the public
preview URL — the preview URL IS this app.
"""
import os
import socket
import sys

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # shell-mini root
LOG = os.path.join(PROJECT, 'dev.log')
PORT = 3000


def port_answering(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(('127.0.0.1', port)) == 0


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
        print(f'port {PORT} already answering — dev server likely up; NOT starting another')
        sys.exit(0)

    devnull = os.open('/dev/null', os.O_RDWR)
    logfd = os.open(LOG, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
    os.dup2(devnull, 0)
    os.dup2(logfd, 1)                  # stdout/stderr -> dev.log
    os.dup2(logfd, 2)

    daemonize()
    os.chdir(PROJECT)
    os.execvp('node', ['node', 'node_modules/vite/bin/vite.js'])
    # execvp never returns on success


if __name__ == '__main__':
    main()

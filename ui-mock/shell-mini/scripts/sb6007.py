#!/usr/bin/env python3
"""Double-fork Storybook dev-server launcher for port 6007 (localhost dev surface).

Same daemonization law as scripts/dev3000.py: the Z-container kills the whole
descendant tree of every bash toolcall at call end — only a double-forked
grandchild (reparented to PID 1) survives. fork -> setsid -> fork -> exec.

Scope:
- 6007 is the LOCALHOST dev storybook (HMR for the agent's dev loop).
  It is NOT the public review surface — the public one is the static build
  mounted at /stories/ on the app's Vite (:3000), because a dev server's
  multi-asset UI cannot work through ?XTransformPort (sub-requests lose the
  query and fall to :3000) and the dev iframe uses root-absolute Vite paths
  that escape any sub-path proxy. See .agents/SKILL.md preview-serving laws.

Log: sb.log in the shell-mini root (gitignored via *.log).
Refuses to start a second instance if :6007 is already answering.
"""
import os
import socket
import sys

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # shell-mini root
LOG = os.path.join(PROJECT, 'sb.log')
PORT = 6007
ENTRY = os.path.join(PROJECT, 'node_modules/storybook/dist/bin/dispatcher.js')


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
        print(f'port {PORT} already answering — storybook dev likely up; NOT starting another')
        sys.exit(0)
    if not os.path.exists(ENTRY):
        print(f'storybook entry missing: {ENTRY} — run npm ci first')
        sys.exit(1)

    devnull = os.open('/dev/null', os.O_RDWR)
    logfd = os.open(LOG, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
    os.dup2(devnull, 0)
    os.dup2(logfd, 1)                  # stdout/stderr -> sb.log
    os.dup2(logfd, 2)

    daemonize()
    os.chdir(PROJECT)
    os.execvp('node', ['node', ENTRY, 'dev', '-p', str(PORT)])
    # execvp never returns on success


if __name__ == '__main__':
    main()

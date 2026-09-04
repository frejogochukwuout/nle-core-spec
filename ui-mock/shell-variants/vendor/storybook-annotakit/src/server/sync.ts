/**
 * storybook-annotakit — durable store auto-sync.
 *
 * Problem: agent sandboxes have non-durable disks. A dev server accumulates
 * feedback in <configDir>/annotakit/threads.db, the sandbox dies, everything is
 * lost. Solution: the store file is COMMITTED to git and auto-pushed (debounced)
 * after mutations — the user never has to remember to push.
 *
 * Safety rules:
 *   - only the store file is ever staged/committed (`git commit --only`), user
 *     changes are never touched;
 *   - WAL is checkpointed first so the .db is self-contained (-wal/-shm stay
 *     gitignored);
 *   - git runs ASYNC (spawn) — a slow push must never freeze the dev server's
 *     event loop (HMR, the annotakit API, everything shares it);
 *   - the push token goes in an http extraHeader, never the URL or argv —
 *     and every piece of git output is redacted before it can reach a log;
 *   - non-fast-forward pushes (a collaborator/agent pushed meanwhile) recover
 *     via pull --rebase (abort on conflict, surface clear instructions);
 *   - failures are logged once and retried on the next mutation, never thrown;
 *   - disable with {"autoSync": false} in annotakit.config.json.
 */

import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { ghToken, currentBranch, detectGithubRepo, isGitRepo, projectRoot } from './env';

export interface AutoSync {
  /** Called after every store mutation (debounced). */
  notify(): void;
  /** Best-effort final sync (shutdown hooks). */
  flushSync(timeoutMs?: number): void;
  /** Human-readable state for /health. */
  describe(): string;
  /** Durability classification for the health agentSurfaces block. */
  durability(): 'git-push' | 'git-commit' | 'disk-only';
  /** Stop timers. */
  stop(): void;
}

const DEBOUNCE_MS = 6000;
const COMMIT_IDENTITY = [
  '-c',
  'user.name=storybook-annotakit',
  '-c',
  'user.email=annotakit@users.noreply.github.com',
];

/** Credentials/tokens must never reach a log line or an error string. */
function redact(text: string): string {
  return text
    .replace(/x-access-token:[^@\s]+@/g, 'x-access-token:***@')
    .replace(/https:\/\/[^@\s]+@github\.com/g, 'https://github.com')
    .replace(/AUTHORIZATION:\s*basic\s+\S+/gi, 'AUTHORIZATION: basic ***')
    .replace(/ghp_[A-Za-z0-9]+/g, 'ghp_***');
}

interface GitResult { ok: boolean; out: string; err: string }

/** Both captured streams joined for diagnostics (each already redacted). */
function bothStreams(r: GitResult): string {
  return r.out && r.err ? `${r.out}\n${r.err}` : r.out || r.err;
}

/** Async git (spawn) — the debounced path; never blocks the event loop.
 *  stderr is piped AND captured: git writes its rejections there (`! [rejected]`,
 *  `failed to push some refs`) — stdout-only capture made push failures
 *  invisible and the non-fast-forward recovery below unmatchable. */
function gitAsync(root: string, args: string[], timeoutMs: number): Promise<GitResult> {
  return new Promise((resolve) => {
    let out = '';
    let errOut = '';
    let settled = false;
    const finish = (ok: boolean): void => {
      if (settled) return;
      settled = true;
      resolve({ ok, out: redact(out).slice(0, 300), err: redact(errOut).slice(0, 300) });
    };
    const child = spawn('git', ['--no-optional-locks', '-C', root, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(false);
    }, timeoutMs);
    child.stdout?.on('data', (d: Buffer) => (out += d.toString()));
    child.stderr?.on('data', (d: Buffer) => (errOut += d.toString()));
    child.on('error', (err) => {
      clearTimeout(timer);
      errOut += `spawn error: ${err.message}`;
      finish(false);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      finish(code === 0);
    });
  });
}

/** Sync git (execFileSync) — shutdown flush only, where blocking is accepted.
 *  stderr is piped too so failures are as legible as the async path. */
function gitSyncExec(root: string, args: string[], timeoutMs: number): GitResult {
  try {
    const out = spawnSync('git', ['--no-optional-locks', '-C', root, ...args], {
      encoding: 'utf8',
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return {
      ok: out.status === 0,
      out: redact(String(out.stdout ?? '')).slice(0, 300),
      err: redact(String(out.stderr ?? '')).slice(0, 300),
    };
  } catch (err) {
    return { ok: false, out: '', err: redact(err instanceof Error ? err.message : String(err)).slice(0, 300) };
  }
}

export function createAutoSync(opts: {
  configDir: string;
  storePath: string;
  checkpoint: () => void;
  countThreads: () => number | Promise<number>;
  autoSyncEnabled: boolean;
}): AutoSync {
  const root = projectRoot(opts.configDir);
  const relStore = path.relative(root, opts.storePath) || opts.storePath;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let stopped = false;
  let state = 'init';
  let lastError = '';

  const enabled = opts.autoSyncEnabled && isGitRepo(root);
  const { repo } = detectGithubRepo(root);

  if (!opts.autoSyncEnabled) {
    state = 'disabled by config (autoSync: false)';
  } else if (!isGitRepo(root)) {
    state = 'disabled: not a git repo — feedback persists to disk only (threads.db)';
  } else if (!repo) {
    state = 'partial: git repo without a github remote (commits, no push)';
  }

  const logOnce = (msg: string): void => {
    const safe = redact(msg);
    if (safe !== lastError) {
      lastError = safe;
      console.warn(`[storybook-annotakit] auto-sync: ${safe}`);
    }
  };

  /** Push credentials via http extraHeader — the token never appears in the
   *  URL, the child argv, or any error output (belt-and-braces: redact too). */
  const pushArgs = (repoName: string, branch: string): string[] => {
    const token = ghToken();
    const url = `https://github.com/${repoName}.git`;
    if (token) {
      const basic = Buffer.from(`x-access-token:${token}`).toString('base64');
      return ['-c', `http.https://github.com/.extraheader=AUTHORIZATION: basic ${basic}`, 'push', url, `HEAD:refs/heads/${branch}`];
    }
    return ['push', url, `HEAD:refs/heads/${branch}`];
  };

  const syncOnce = async (timeoutMs = 8000, reason = 'mutation', countLabel = '?'): Promise<boolean> => {
    if (stopped) return false;
    if (running) return false; // one git cycle at a time
    running = true;
    try {
      opts.checkpoint(); // fold WAL into the .db so the file is self-contained

      const add = await gitAsync(root, ['add', '--', relStore], timeoutMs);
      if (!add.ok) {
        logOnce(`git add failed (${bothStreams(add)})`);
        state = 'error: git add';
        return false;
      }
      // nothing staged for our path? skip commit
      const dirty = await gitAsync(root, ['status', '--porcelain', '--', relStore], timeoutMs);
      if (!dirty.ok || !dirty.out.trim()) {
        state = `up to date (${reason})`;
        return true;
      }
      const commit = await gitAsync(
        root,
        [...COMMIT_IDENTITY, 'commit', '--only', '-m', `annotakit: sync feedback store (${countLabel} threads)`, '--', relStore],
        timeoutMs,
      );
      if (!commit.ok) {
        logOnce(`git commit failed (${bothStreams(commit)})`);
        state = 'error: git commit';
        return false;
      }
      if (repo) {
        const branch = currentBranch(root);
        if (!branch) {
          state = 'committed; push skipped (detached HEAD)';
          return true;
        }
        let push = await gitAsync(root, pushArgs(repo, branch), timeoutMs);
        // git writes rejections to STDERR — match against BOTH captured streams.
        if (!push.ok && /non-fast-forward|fetch first|rejected \(fetch first\)|failed to push/i.test(bothStreams(push))) {
          // a collaborator/agent pushed meanwhile — rebase our store commits on
          // top and retry once. Conflicts (someone else's threads.db) abort
          // cleanly: local data is safe, the state says what to do.
          const pull = await gitAsync(root, ['pull', '--rebase', '--autostash', `https://github.com/${repo}.git`, branch], timeoutMs * 2);
          if (pull.ok) {
            push = await gitAsync(root, pushArgs(repo, branch), timeoutMs);
          } else {
            await gitAsync(root, ['rebase', '--abort'], 4000).catch(() => undefined);
            logOnce('remote diverged and rebase did not apply cleanly — run `git pull --rebase` manually, then the next mutation will push');
            state = 'diverged: rebase needed (local commits are safe)';
            return false;
          }
        }
        if (!push.ok) {
          logOnce(`git push failed (${bothStreams(push)})${ghToken() ? '' : ' — no ANNOTAKIT_GH_TOKEN in .env?'}`);
          state = 'committed; push failed';
          return false;
        }
        // push happens via header (never touches remote config) — update the
        // remote-tracking ref so `git status`/ahead-count stays honest
        await gitAsync(root, ['update-ref', `refs/remotes/origin/${branch}`, 'HEAD'], timeoutMs);
        state = `pushed to ${repo}:${branch} (${reason})`;
        return true;
      }
      state = 'committed (no github remote to push)';
      return true;
    } catch (err) {
      logOnce(`unexpected error (${err instanceof Error ? err.message : String(err)})`);
      state = 'error';
      return false;
    } finally {
      running = false;
    }
  };

  const notify = (): void => {
    if (!enabled || stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      // resolve the thread count async, then sync with a real label
      Promise.resolve()
        .then(() => opts.countThreads())
        .then(
          (n) => {
            // ZERO threads → nothing to commit. Skipping is not just an
            // optimization: at boot the store file is CREATED empty, and
            // committing it would silently write an empty-db commit into
            // whatever enclosing repo git finds (agent workspaces nested in
            // git-tracked parents — the sharp edge found in local-mode E2E).
            if (n === 0) {
              state = 'up to date (empty store)';
              return;
            }
            void syncOnce(8000, 'mutation', String(n ?? '?'));
          },
          () => void syncOnce(8000, 'mutation'),
        );
    }, DEBOUNCE_MS);
    timer.unref?.();
  };

  // final best-effort sync on shutdown — don't swallow the signal itself
  const flushSync = (timeoutMs = 2500): void => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (stopped || !enabled) return;
    try {
      opts.checkpoint();
      const add = gitSyncExec(root, ['add', '--', relStore], timeoutMs);
      if (!add.ok) return;
      const dirty = gitSyncExec(root, ['status', '--porcelain', '--', relStore], timeoutMs);
      if (!dirty.ok || !dirty.out.trim()) return;
      gitSyncExec(
        root,
        [...COMMIT_IDENTITY, 'commit', '--only', '-m', 'annotakit: sync feedback store (shutdown)', '--', relStore],
        timeoutMs,
      );
      if (repo) {
        const branch = currentBranch(root);
        if (branch) {
          const token = ghToken();
          const basic = token ? Buffer.from(`x-access-token:${token}`).toString('base64') : '';
          const args = token
            ? ['-c', `http.https://github.com/.extraheader=AUTHORIZATION: basic ${basic}`, 'push', `https://github.com/${repo}.git`, `HEAD:refs/heads/${branch}`]
            : ['push', `https://github.com/${repo}.git`, `HEAD:refs/heads/${branch}`];
          gitSyncExec(root, args, timeoutMs);
          gitSyncExec(root, ['update-ref', `refs/remotes/origin/${branch}`, 'HEAD'], timeoutMs);
        }
      }
    } catch {
      /* best effort by definition */
    }
  };
  const onSignal = (): void => flushSync(2500);
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  const stop = (): void => {
    stopped = true;
    if (timer) clearTimeout(timer);
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
  };

  const describe = (): string => state;

  const durability = (): 'git-push' | 'git-commit' | 'disk-only' => {
    if (!enabled) return 'disk-only';
    if (!repo) return 'git-commit';
    // A remote without credentials cannot actually be pushed to — claiming
    // "git-push" in local mode (no token yet) would overstate durability.
    return ghToken() ? 'git-push' : 'git-commit';
  };

  if (enabled) {
    console.warn(
      `[storybook-annotakit] store auto-sync ON: ${relStore} → git${repo ? ` → ${repo}` : ' (no remote)'} — feedback survives sandbox death`,
    );
    // catch pre-existing un-pushed state at startup
    notify();
  } else {
    console.warn(`[storybook-annotakit] store auto-sync ${state} — the .db file still persists to disk`);
  }

  return { notify, flushSync, describe, durability, stop };
}

/**
 * storybook-annotakit — environment bootstrapping.
 *
 * Kills the two biggest agent onboarding frictions by making the dev server
 * self-configure:
 *   - ANNOTAKIT_GH_TOKEN: a `.env` file next to the project root is loaded
 *     automatically (no dotenv dependency, ~30 lines). The agent drops the PAT
 *     into .env once and every publish just works.
 *   - ghRepo: auto-detected from `git remote get-url origin` (or package.json
 *     repository field) — no "no repo: pass {...}" wall.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Keys we care about (we only fill UNSET vars — never override the shell). */
const ENV_KEYS = ['ANNOTAKIT_GH_TOKEN', 'ANNOTAKIT_GH_API', 'ANNOTAKIT_GH_AUTO', 'ANNOTAKIT_GH_POLL', 'ANNOTAKIT_GH_INTERVAL', 'ANNOTAKIT_GH_REPO'] as const;

/** Resolve the consumer project root from a (possibly relative) configDir. */
export function projectRoot(configDir: string): string {
  const abs = path.isAbsolute(configDir) ? configDir : path.resolve(process.cwd(), configDir);
  return path.dirname(abs); // <root>/.storybook → <root>
}

/** Parse a .env file body: KEY=VALUE lines, quotes, comments, `export ` prefix. */
export function parseDotEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const cleaned = line.startsWith('export ') ? line.slice(7) : line;
    const eq = cleaned.indexOf('=');
    if (eq <= 0) continue;
    const key = cleaned.slice(0, eq).trim();
    let value = cleaned.slice(eq + 1).trim();
    const m = value.match(/^(["'])([\s\S]*)\1$/);
    if (m) value = m[2] ?? '';
    if (key) out[key] = value;
  }
  return out;
}

let envLoaded = false;

/**
 * Load `.env` (searched at project root, configDir, cwd) into process.env for
 * UNSET keys only. Idempotent. Returns the keys that were applied.
 */
export function loadDotEnv(configDir: string): string[] {
  if (envLoaded) return [];
  envLoaded = true;
  const root = projectRoot(configDir);
  const candidates = [
    path.join(root, '.env'),
    path.isAbsolute(configDir) ? path.join(configDir, '.env') : path.resolve(process.cwd(), configDir, '.env'),
    path.resolve(process.cwd(), '.env'),
  ];
  const file = candidates.find((p) => existsSync(p));
  if (!file) return [];
  try {
    const parsed = parseDotEnv(readFileSync(file, 'utf8'));
    const applied: string[] = [];
    for (const key of ENV_KEYS) {
      const v = parsed[key];
      if (v && !process.env[key]) {
        process.env[key] = v;
        applied.push(key);
      }
    }
    if (applied.length) {
      console.warn(`[storybook-annotakit] loaded ${applied.join(', ')} from ${file}`);
    }
    return applied;
  } catch {
    return [];
  }
}

/** The GitHub token after env/config resolution. */
export function ghToken(): string | undefined {
  return process.env.ANNOTAKIT_GH_TOKEN || undefined;
}

/** Repo override from env (beats detection, loses to config file). */
export function ghRepoEnv(): string | null {
  const v = process.env.ANNOTAKIT_GH_REPO;
  return v && /^[^/\s]+\/[^/\s]+$/.test(v) ? v : null;
}

/* --------------------------------- git facts --------------------------------- */

let gitRootCache: string | null | undefined;

/**
 * Rewrite a project-relative path (fiber/_debugStack reports paths relative to
 * the SB project root = cwd of the dev server) to REPO-root-relative, so an
 * agent reading GitHub issues can find the file without guessing the demo
 * prefix. Falls back unchanged when not in a git work tree or the path lives
 * outside it. Memoized (one `git rev-parse` per process).
 */
export function repoRelPath(p: string | undefined): string | undefined {
  if (!p) return undefined;
  if (gitRootCache === undefined) {
    gitRootCache = git(process.cwd(), ['rev-parse', '--show-toplevel']);
  }
  const root = gitRootCache;
  if (!root) return p;
  const abs = path.resolve(process.cwd(), p);
  if (abs !== root && !abs.startsWith(root + path.sep)) return p;
  return path.relative(root, abs).replace(/\\/g, '/');
}

function git(root: string, args: string[]): string | null {
  try {
    return execFileSync('git', ['--no-optional-locks', '-C', root, ...args], {
      encoding: 'utf8',
      timeout: 4000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/** Parse any github remote URL form → owner/name. */
export function parseGithubRepo(url: string): string | null {
  const m =
    url.match(/github\.com[/:]([^/\s]+)\/([^/\s#?]+?)(?:\.git)?(?:[/\s?#].*)?$/i) ??
    url.match(/^github:([^/\s]+)\/([^/\s]+)$/i);
  if (!m) return null;
  const [, owner, name] = m;
  if (!owner || !name) return null;
  return `${owner}/${name}`;
}

let repoCache: { repo: string | null; source: string } | null = null;

/**
 * Detect the GitHub repo for the project: git remote origin first, then
 * package.json's repository field. Cached.
 */
export function detectGithubRepo(root: string): { repo: string | null; source: string } {
  if (repoCache) return repoCache;
  const remote = git(root, ['remote', 'get-url', 'origin']);
  if (remote) {
    const repo = parseGithubRepo(remote);
    if (repo) {
      repoCache = { repo, source: 'git remote origin' };
      return repoCache;
    }
  }
  try {
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as {
      repository?: string | { url?: string };
    };
    const repoUrl = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
    if (repoUrl) {
      const repo = parseGithubRepo(repoUrl);
      if (repo) {
        repoCache = { repo, source: 'package.json repository' };
        return repoCache;
      }
    }
  } catch {
    /* no package.json / no repository field */
  }
  repoCache = { repo: null, source: 'not found' };
  return repoCache;
}

/** Current branch name (for pushes). */
export function currentBranch(root: string): string | null {
  const b = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  return b && b !== 'HEAD' ? b : null;
}

/** Is the given directory inside a git work tree? */
export function isGitRepo(root: string): boolean {
  return git(root, ['rev-parse', '--is-inside-work-tree']) === 'true';
}

/** A push URL with the token embedded (https form, works for classic PATs). */
export function pushUrlFor(repo: string, token: string | undefined): string {
  const base = `https://github.com/${repo}.git`;
  return token ? `https://x-access-token:${token}@github.com/${repo}.git` : base;
}

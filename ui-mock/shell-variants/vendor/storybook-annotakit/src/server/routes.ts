/**
 * storybook-annotakit — dev-server integration.
 *
 * Mounts the review API on the Storybook dev server itself (polka ServerApp),
 * via the official `experimental_devServer` preset hook (SB ≥ 9.1.16) and
 * broadcasts changes over the official server channel (`experimental_serverChannel`).
 *
 * Result: the preview iframe AND the manager are same-origin with the API —
 * no CORS, no proxy, no separate dashboard, no db setup. `storybook dev` is
 * the whole review stack. On startup it also self-configures: .env token
 * load, git-remote repo detection, and git auto-sync of the store file.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { getStore, nowIso, readConfig, type Store } from './store';
import { renderDigest } from './digest';
import { createGhSync, type GhSync } from './ghsync';
import { createAutoSync, type AutoSync } from './sync';
import { detectGithubRepo, ghRepoEnv, ghToken, loadDotEnv, projectRoot } from './env';
import { API_BASE, THREADS_CHANGED, type ThreadsChangedPayload } from '../shared/events';
import type { AgentSurfaces, Comment, ExportBundle, ExportedStory, GhSyncStatus, GhSyncSummary, HealthInfo, Thread, ThreadInput } from '../shared/types';

const VERSION = '0.4.0';
const CONFIG_FILE = 'annotakit.config.json';
const GH_LABEL = 'annotakit';

/* ------------------------- channel singleton (dev WS) ------------------------- */

type EmitFn = (event: string, payload: unknown) => void;
let emitToChannel: EmitFn | null = null;

/** Called by the preset's experimental_serverChannel hook. */
export function setChannelEmitter(emit: EmitFn | null): void {
  emitToChannel = emit;
}

function broadcast(payload: ThreadsChangedPayload): void {
  try {
    emitToChannel?.(THREADS_CHANGED, payload);
  } catch {
    /* channel is best-effort live sync; REST is the source of truth */
  }
}

/* ------------------------------ server bootstrap ------------------------------ */

interface Runtime {
  store: Store;
  sync: AutoSync;
  /** GitHub lifecycle mirror engine (1 thread = 1 issue, both directions). */
  ghsync: GhSync;
  config: Record<string, unknown>;
  root: string;
  configPath: string;
  /** repo after full resolution chain (config beats env beats detection). */
  repo: string | null;
  repoSource: string;
  /** Last seen dev-server origin (for issue-body story links). */
  origin: string;
  started: boolean;
}

let runtime: Runtime | null = null;

/** config/env number parse: finite & >= 0, else undefined. */
function nonNegNum(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number.parseInt(v, 10) : typeof v === 'number' ? v : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function bootstrap(configDir: string, port?: number): Runtime {
  if (runtime) return runtime;
  loadDotEnv(configDir); // .env ANNOTAKIT_* — before anything reads them
  const store = getStore(configDir);
  const config = readConfig(configDir);
  const root = projectRoot(configDir);
  const detected = detectGithubRepo(root);
  const configRepo = typeof config.ghRepo === 'string' ? config.ghRepo : null;
  const envRepo = ghRepoEnv();
  const sync = createAutoSync({
    configDir,
    storePath: store.storePath,
    checkpoint: () => store.checkpoint(),
    countThreads: () => store.countThreads(),
    autoSyncEnabled: config.autoSync !== false,
  });
  const repo = configRepo ?? envRepo ?? detected.repo;
  const repoSource = configRepo ? `${CONFIG_FILE} ghRepo` : envRepo ? 'ANNOTAKIT_GH_REPO env' : detected.source;
  const configToken = typeof config.ghToken === 'string' ? config.ghToken : undefined;
  const ghAuto = config.ghAuto !== false && !['0', 'false', 'off', 'no'].includes(String(process.env.ANNOTAKIT_GH_AUTO ?? '').toLowerCase());
  const pollSec = nonNegNum(process.env.ANNOTAKIT_GH_POLL) ?? nonNegNum(config.ghPoll) ?? 60;
  const intervalMs = nonNegNum(process.env.ANNOTAKIT_GH_INTERVAL) ?? 700;
  const ghsync = createGhSync({
    store,
    repo,
    token: () => ghToken() ?? configToken,
    configPath: `${configDir}/${CONFIG_FILE}`,
    enabled: ghAuto,
    pollSec,
    intervalMs,
    origin: () => runtime?.origin ?? 'http://localhost:6006',
    onEngineMutation: (thread, reason) => {
      // engine-side writes (gh mapping, pulled replies) are mutations too:
      // broadcast to every surface + schedule the durable git store sync
      broadcast({ storyId: thread.storyId, threadId: thread.id, reason });
      sync.notify();
    },
  });
  runtime = { store, sync, ghsync, config, root, configPath: `${configDir}/${CONFIG_FILE}`, repo, repoSource, origin: port ? `http://localhost:${port}` : 'http://localhost:6006', started: true };
  if (repo) {
    console.warn(`[storybook-annotakit] GitHub mirror target: ${repo} (${repoSource})`);
  } else {
    console.warn(
      `[storybook-annotakit] no GitHub repo configured — local mode: REST + digests work fully; POST /sync explains how to add the mirror (${CONFIG_FILE}, .env, or git remote)`,
    );
  }
  ghsync.start(); // initial backfill + first pull (async, non-blocking; noop in local mode)
  return runtime;
}

/** Mutation bookkeeping: broadcast + schedule durable sync + queue GH mirror push. */
function afterMutation(rt: Runtime, payload: ThreadsChangedPayload): void {
  broadcast(payload);
  rt.sync.notify();
  if (payload.threadId) rt.ghsync.enqueue(payload.threadId);
}

/* --------------------------------- helpers ----------------------------------- */

/**
 * CORS: browser access is limited to loopback origins (the developer's own
 * local tooling). Same-origin (manager/preview) needs no header at all; a
 * foreign website gets NOTHING — drive-by reads/mutations of localhost review
 * data are blocked. Non-browser agents (curl/Node) are unaffected.
 */
function applyCors(req: IncomingMessage, res: ServerResponse, methods = 'GET,POST,PATCH,DELETE,OPTIONS'): void {
  const origin = req.headers.origin;
  if (!origin) return;
  let host = '';
  try {
    host = new URL(origin).hostname;
  } catch {
    return;
  }
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(host)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Vary', 'Origin'); // deliberate: no ACAO for foreign origins
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(data);
}

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > 2_000_000) {
        reject(Object.assign(new Error('body too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('invalid JSON body'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function notFound(res: ServerResponse): void {
  sendJson(res, 404, { error: 'not found' });
}

function fail(res: ServerResponse, err: unknown): void {
  const status = (err as { status?: number })?.status ?? 500;
  const message = err instanceof Error ? err.message : String(err);
  sendJson(res, status, { error: message });
}

/** Validate a ThreadInput enough to store it (trust-but-shape-check). */
function validateThreadInput(body: Record<string, unknown>): ThreadInput {
  const storyId = typeof body.storyId === 'string' ? body.storyId : '';
  const target = body.target as ThreadInput['target'] | undefined;
  const comments = Array.isArray(body.comments) ? (body.comments as Comment[]) : [];
  if (!storyId) throw Object.assign(new Error('storyId is required'), { status: 400 });
  if (!target || typeof target !== 'object') {
    throw Object.assign(new Error('target is required'), { status: 400 });
  }
  if (comments.length === 0) {
    throw Object.assign(new Error('at least one comment is required'), { status: 400 });
  }
  for (const c of comments) {
    if (!c.body?.trim()) throw Object.assign(new Error('comment body is required'), { status: 400 });
  }
  return body as unknown as ThreadInput;
}

/** PATCH requires the full document (mirrors AnnotaKit C2 discipline). */
function validateThreadFull(body: Record<string, unknown>): Thread {
  const t = body as unknown as Thread;
  if (!t.id || !t.storyId || !Array.isArray(t.comments) || !t.target) {
    throw Object.assign(
      new Error('PATCH expects the FULL thread document (GET /threads, mutate, PATCH back)'),
      { status: 400 },
    );
  }
  return t;
}

/* ---------------------------------- routes ----------------------------------- */

function groupByStory(threads: Thread[], origin: string): ExportedStory[] {
  const map = new Map<string, ExportedStory>();
  for (const t of threads) {
    let entry = map.get(t.storyId);
    if (!entry) {
      entry = {
        story: { ...t.story, url: t.story.url ?? `${origin}/?path=/story/${t.storyId}` },
        counts: { open: 0, resolved: 0 },
        threads: [],
      };
      map.set(t.storyId, entry);
    }
    entry.threads.push(t);
    if (t.status === 'open') entry.counts.open++;
    else entry.counts.resolved++;
  }
  const out = [...map.values()];
  for (const s of out) s.threads.sort((a, b) => a.number - b.number);
  return out;
}

async function handleApi(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  configDir: string,
  origin: string,
): Promise<boolean> {
  const rt = bootstrap(configDir);
  const store = rt.store;
  const p = url.pathname;
  const method = req.method ?? 'GET';

  /* health ---------------------------------------------------------------- */
  if (p === `${API_BASE}/health` && (method === 'GET' || method === 'HEAD')) {
    const ghSync = await rt.ghsync.status();
    const hasToken = Boolean(ghToken() || (typeof rt.config.ghToken === 'string' && rt.config.ghToken));
    const surfaces: AgentSurfaces = {
      rest: true,
      digests: ['md', 'json'],
      github: ghSync.mode === 'auto',
      githubLabel: GH_LABEL,
      ...(ghSync.mode !== 'auto'
        ? { githubReason: ghSync.mode === 'off' ? 'disabled (ANNOTAKIT_GH_AUTO=0 / ghAuto:false)' : !hasToken ? 'no token' : 'no repo' }
        : {}),
      durability: rt.sync.durability(),
    };
    const info: HealthInfo = {
      ok: true,
      version: VERSION,
      store: store.kind,
      storePath: store.storePath,
      threads: await store.countThreads(),
      agentSurfaces: surfaces,
      gh: {
        repo: rt.repo,
        hasToken,
        autoSync: rt.sync.describe(),
        ghSync,
      },
    };
    if (method === 'HEAD') {
      res.writeHead(200);
      res.end();
      return true;
    }
    sendJson(res, 200, info);
    return true;
  }

  /* threads ---------------------------------------------------------------- */
  if (p === `${API_BASE}/threads`) {
    if (method === 'GET') {
      const threads = await store.listThreads({
        storyId: url.searchParams.get('storyId') ?? undefined,
        status: url.searchParams.get('status') ?? undefined,
      });
      sendJson(res, 200, { threads });
      return true;
    }
    if (method === 'POST') {
      const input = validateThreadInput(await readBody(req));
      // idempotent upsert: replaying a client POST with the same id is NOT a
      // new thread — respond 200 (not 201) so callers can tell the difference
      const preexisting = input.id ? await store.getThread(input.id) : null;
      const thread = await store.createThread(input);
      afterMutation(rt, { storyId: thread.storyId, threadId: thread.id, reason: 'created' });
      sendJson(res, preexisting ? 200 : 201, thread);
      return true;
    }
    if (method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!id) throw Object.assign(new Error('?id= required'), { status: 400 });
      const prev = await store.getThread(id);
      const ok = await store.deleteThread(id);
      if (!ok) return notFound(res), true;
      // mirrored issue gets closed once (tombstone is durable in the db)
      if (prev?.gh?.issue) rt.ghsync.enqueueDelete(prev.gh.issue);
      afterMutation(rt, { storyId: prev?.storyId, threadId: undefined, reason: 'updated' });
      sendJson(res, 200, { ok: true });
      return true;
    }
  }

  const threadMatch = p.match(new RegExp(`^${API_BASE}/threads/([^/]+)(/comments)?$`));
  if (threadMatch) {
    const id = decodeURIComponent(threadMatch[1] ?? '');
    const isComments = Boolean(threadMatch[2]);

    if (method === 'GET' && !isComments) {
      const thread = await store.getThread(id);
      if (!thread) return notFound(res), true;
      sendJson(res, 200, thread);
      return true;
    }
    if (method === 'PATCH' && !isComments) {
      const full = validateThreadFull(await readBody(req));
      if (full.id !== id) throw Object.assign(new Error('id mismatch between URL and body'), { status: 400 });
      const prev = await store.getThread(id);
      if (!prev) return notFound(res), true;
      // server-side resolve bookkeeping: agents forget resolvedAt — the server
      // stamps/clears it on transitions so digests stay consistent
      if (prev.status === 'open' && full.status === 'resolved' && !full.resolvedAt) {
        full.resolvedAt = nowIso();
      }
      if (prev.status === 'resolved' && full.status === 'open') {
        delete full.resolvedAt;
      }
      // SERVER-OWNED mirror fields: a client PATCHing a stale snapshot would
      // otherwise wipe thread.gh → the next sync would create a DUPLICATE issue,
      // and pulled comments would lose their dedupe ids. Always keep ours.
      if (prev.gh) full.gh = prev.gh;
      // UNION comments by id: a stale snapshot must not DROP newer comments
      // (pull-imported replies, concurrent user replies). Body wins for ids it
      // knows; anything only the server has is preserved.
      const bodyIds = new Set(full.comments.map((c) => c.id));
      for (const pc of prev.comments) {
        if (!bodyIds.has(pc.id)) full.comments.push(pc);
      }
      for (const c of full.comments) {
        const pc = prev.comments.find((x) => x.id === c.id);
        if (pc) {
          if (pc.ghId && !c.ghId) c.ghId = pc.ghId;
          if (pc.source && !c.source) c.source = pc.source;
        }
      }
      const updated = await store.updateThread(full);
      if (!updated) return notFound(res), true; // deleted concurrently — never resurrect
      afterMutation(rt, {
        storyId: updated.storyId,
        threadId: updated.id,
        reason:
          prev.status === 'open' && updated.status === 'resolved'
            ? 'resolved'
            : prev.status === 'resolved' && updated.status === 'open'
              ? 'reopened'
              : 'updated',
      });
      sendJson(res, 200, updated);
      return true;
    }
    if (method === 'POST' && isComments) {
      const body = await readBody(req);
      const thread = await store.getThread(id);
      if (!thread) return notFound(res), true;
      const comment: Comment = {
        id: `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        author: typeof body.author === 'string' && body.author.trim() ? body.author.trim() : 'anonymous',
        body: typeof body.body === 'string' ? body.body : '',
        createdAt: new Date().toISOString(),
      };
      if (!comment.body.trim()) throw Object.assign(new Error('comment body is required'), { status: 400 });
      thread.comments.push(comment);
      const updated = await store.updateThread(thread);
      if (!updated) return notFound(res), true; // deleted concurrently
      afterMutation(rt, { storyId: updated.storyId, threadId: updated.id, reason: 'commented' });
      sendJson(res, 201, updated);
      return true;
    }
  }

  /* export ------------------------------------------------------------------ */
  if (p === `${API_BASE}/export` && method === 'GET') {
    const storyId = url.searchParams.get('storyId') ?? undefined;
    const status = url.searchParams.get('status') ?? undefined;
    const threads = await store.listThreads({ storyId, status });
    const stories = groupByStory(threads, origin);
    const format = (url.searchParams.get('format') ?? 'md').toLowerCase();

    if (format === 'json' || format === 'jsonl') {
      const bundle: ExportBundle = { generatedAt: new Date().toISOString(), exportUrl: `${origin}${API_BASE}/export`, stories };
      sendJson(res, 200, bundle);
      return true;
    }
    // local export → local footer (PATCH guidance for Path-B agents); GitHub
    // issue bodies (ghsync.issueBody) pass mirror:true for the GH-native footer
    const md = renderDigest(stories, { origin });
    res.writeHead(200, {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(md);
    return true;
  }

  /* sync (GitHub lifecycle mirror) ----------------------------------------- */
  if (p === `${API_BASE}/sync`) {
    if (method === 'GET') {
      sendJson(res, 200, await rt.ghsync.status());
      return true;
    }
    if (method === 'POST') {
      // Force reconcile BOTH directions. Idempotent: unmapped threads get an
      // issue (once, ever); mapped ones only receive actual deltas; remote
      // changes land locally. Unconfigured → 200 {ok, noop, reason} (local mode
      // is a state, not an error — reason carries the a/b/c setup steps).
      const summary: GhSyncSummary = await rt.ghsync.syncAll();
      sendJson(res, 200, summary);
      return true;
    }
  }

  /* github (legacy digest publish → now a sync alias) ----------------------- */
  if (p === `${API_BASE}/gh` && method === 'POST') {
    const summary = await rt.ghsync.syncAll();
    sendJson(res, 200, {
      ...summary,
      note: 'digest issues are gone: each thread mirrors to exactly ONE issue now. POST /annotakit/api/sync is the canonical force-reconcile; this alias behaves identically.',
    });
    return true;
  }

  return false;
}

/* --------------------------- 405 vs 404 resolution --------------------------- */

const KNOWN_API_ROUTES: [RegExp, string][] = [
  [new RegExp(`^${API_BASE}/health$`), 'GET, HEAD, OPTIONS'],
  [new RegExp(`^${API_BASE}/threads$`), 'GET, POST, DELETE, OPTIONS'],
  [new RegExp(`^${API_BASE}/threads/[^/]+$`), 'GET, PATCH, OPTIONS'],
  [new RegExp(`^${API_BASE}/threads/[^/]+/comments$`), 'POST, OPTIONS'],
  [new RegExp(`^${API_BASE}/export$`), 'GET, OPTIONS'],
  [new RegExp(`^${API_BASE}/sync$`), 'GET, POST, OPTIONS'],
  [new RegExp(`^${API_BASE}/gh$`), 'POST, OPTIONS'],
];

function resolveNotHandled(res: ServerResponse, pathname: string): void {
  for (const [re, allow] of KNOWN_API_ROUTES) {
    if (re.test(pathname)) {
      res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8', Allow: allow, 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ error: `method not allowed (Allow: ${allow})` }));
      return;
    }
  }
  notFound(res);
}

/* -------------------------------- middleware --------------------------------- */

interface ServerAppLike {
  use(pattern: string | RegExp, ...handlers: unknown[]): unknown;
  use(...handlers: unknown[]): unknown;
}

/**
 * The experimental_devServer hook: mounts /annotakit/* on the storybook dev
 * server. Works with polka (SB's ServerApp) and any connect-style stack.
 */
export function createMiddleware(configDir: string): (req: IncomingMessage, res: ServerResponse, next?: (err?: unknown) => void) => void {
  return (req, res, next) => {
    const urlStr = req.url ?? '';
    if (!urlStr.startsWith('/annotakit/')) {
      next?.();
      return;
    }
    const origin = `http://${req.headers.host ?? 'localhost:6006'}`;
    const rt = runtime;
    if (rt) rt.origin = origin; // engine uses the freshest origin for links
    let url: URL;
    try {
      url = new URL(urlStr, origin);
    } catch {
      sendJson(res, 400, { error: 'bad url' });
      return;
    }
    if (url.pathname === '/annotakit/' || url.pathname === '/annotakit') {
      // Landing note for humans who poke the URL.
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`storybook-annotakit ${VERSION} — API at ${API_BASE}/* (health, threads, export, gh)`);
      return;
    }
    if (url.pathname.startsWith(API_BASE)) {
      // CORS first (loopback-only; set via headers so every response carries it)
      applyCors(req, res);
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
      handleApi(req, res, url, configDir, origin).then(
        (handled) => {
          if (!handled) resolveNotHandled(res, url.pathname);
        },
        (err) => fail(res, err),
      );
      return;
    }
    next?.();
  };
}

/**
 * The experimental_serverChannel hook: remembers how to emit server→clients.
 * In dev the WS server channel fans out to the manager and every preview iframe.
 */
export function serverChannelHook(channel: { on: (e: string, cb: (...a: unknown[]) => void) => void; emit: EmitFn }): void {
  setChannelEmitter((event, payload) => {
    try {
      channel.emit(event, payload);
    } catch {
      /* ignore */
    }
  });
}

/** Mount helper used by the preset (polka ServerApp). */
export function devServerHook(app: ServerAppLike, options?: { configDir?: string; port?: number; [k: string]: unknown }): void {
  const configDir =
    options?.configDir ??
    (process.env.STORYBOOK_CONFIG_DIR as string | undefined) ??
    '.storybook';
  // port comes from SB's dev options (-p/--port): issue-body story links must
  // be correct from the very first backfill, BEFORE any HTTP request teaches
  // the middleware the real origin (the 6006-in-6007 bug of v0.4.0-rc1)
  const port = typeof options?.port === 'number' ? options.port : undefined;
  bootstrap(configDir, port); // .env + repo detect + auto-sync start at server boot
  const middleware = createMiddleware(configDir);
  app.use(middleware as unknown as Parameters<ServerAppLike['use']>[1]);
}

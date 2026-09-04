/**
 * storybook-annotakit — embedded thread store.
 *
 * Primary: SQLite via node:sqlite (Node ≥ 22.13/24, zero native deps, in-process —
 * "the embedded db the storybook server uses"). Fallback: atomic JSON file for
 * older Node. Lives under <configDir>/annotakit/.
 *
 * Durability: threads.db is DESIGNED to be git-tracked and auto-synced (see
 * sync.ts) — only the -wal/-shm sidecars are gitignored.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Thread, ThreadInput } from '../shared/types';

export interface StoreKind {
  kind: 'sqlite' | 'json';
  storePath: string;
}

export interface Store extends StoreKind {
  listThreads(filter?: { storyId?: string; status?: string }): Promise<Thread[]>;
  getThread(id: string): Promise<Thread | null>;
  createThread(input: ThreadInput): Promise<Thread>;
  /** Replace a whole thread doc. Returns null when the id no longer exists —
   *  callers MUST treat that as "thread was deleted concurrently" (never
   *  resurrect: the old JSON-store behavior re-inserted deleted threads). */
  updateThread(thread: Thread): Promise<Thread | null>;
  /** Atomic read-modify-write by id: re-reads the CURRENT row, applies fn,
   *  writes the result. This is the ONLY safe write path for async actors
   *  (the GH mirror engine): a full-doc write after seconds of awaited HTTP
   *  would clobber concurrent user mutations (lost replies). Returns null if
   *  the thread vanished (deleted mid-flight) — engine callers self-heal. */
  mutateThread(id: string, fn: (t: Thread) => Thread | void): Promise<Thread | null>;
  deleteThread(id: string): Promise<boolean>;
  countThreads(): Promise<number>;
  /** Fold the WAL into the main db file (sqlite); no-op for json. */
  checkpoint(): void;
  /** Remember a deleted thread's GitHub issue so the mirror engine can close
   *  it exactly once (durable — same db file as the threads). */
  tombstone(issue: number): Promise<void>;
  listOpenTombstones(): Promise<number[]>;
  tombstoneDone(issue: number): Promise<void>;
  close(): void;
}

/** Stable JSON comparison for upserts. */
export function newId(): string {
  return `th_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL,
  story_id TEXT NOT NULL,
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_threads_story ON threads(story_id);
CREATE TABLE IF NOT EXISTS counters (
  story_id TEXT PRIMARY KEY,
  next_number INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tombstones (
  issue INTEGER PRIMARY KEY,
  done INTEGER NOT NULL DEFAULT 0
);
`;

/* ------------------------------- sqlite store -------------------------------- */

interface SqliteDb {
  exec(sql: string): void;
  prepare(sql: string): {
    get(...args: unknown[]): Record<string, unknown> | undefined;
    all(...args: unknown[]): Record<string, unknown>[];
    run(...args: unknown[]): { changes: number | bigint };
  };
}

function sqliteStore(db: SqliteDb, storePath: string): Store {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 3000;');
  db.exec(SCHEMA);

  const rowToThread = (row: Record<string, unknown>): Thread =>
    JSON.parse(row.payload as string) as Thread;

  const listThreads = async (filter?: { storyId?: string; status?: string }): Promise<Thread[]> => {
    const where: string[] = [];
    const args: unknown[] = [];
    if (filter?.storyId) {
      where.push('story_id = ?');
      args.push(filter.storyId);
    }
    if (filter?.status) {
      where.push('status = ?');
      args.push(filter.status);
    }
    // stable order: story, then number — resolving must never reshuffle lists
    const sql = `SELECT payload FROM threads ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY story_id ASC, number ASC`;
    const rows = db.prepare(sql).all(...args);
    return rows.map(rowToThread);
  };

  const getThread = async (id: string): Promise<Thread | null> => {
    const row = db.prepare('SELECT payload FROM threads WHERE id = ?').get(id);
    return row ? rowToThread(row) : null;
  };

  const nextNumber = (storyId: string): number => {
    const row = db.prepare('SELECT next_number FROM counters WHERE story_id = ?').get(storyId);
    const n = row ? Number(row.next_number) : 1;
    db.prepare(
      'INSERT INTO counters (story_id, next_number) VALUES (?, ?) ON CONFLICT(story_id) DO UPDATE SET next_number = ?',
    ).run(storyId, n + 1, n + 1);
    return n;
  };

  const createThread = async (input: ThreadInput): Promise<Thread> => {
    const id = input.id ?? newId();
    const existing = db.prepare('SELECT payload FROM threads WHERE id = ?').get(id);
    if (existing) return rowToThread(existing); // idempotent upsert
    const ts = nowIso();
    const first = input.comments[0];
    const thread: Thread = {
      id,
      number: nextNumber(input.storyId),
      storyId: input.storyId,
      status: 'open',
      createdAt: ts,
      updatedAt: ts,
      author: first?.author ?? 'anonymous',
      story: {
        storyId: input.storyId,
        ...input.story,
      },
      component: input.component ?? null,
      target: input.target,
      comments: input.comments,
    };
    db.prepare('INSERT INTO threads (id, number, story_id, status, updated_at, payload) VALUES (?, ?, ?, ?, ?, ?)').run(
      id,
      thread.number,
      thread.storyId,
      thread.status,
      thread.updatedAt,
      JSON.stringify(thread),
    );
    return thread;
  };

  const updateThread = async (thread: Thread): Promise<Thread | null> => {
    const next = { ...thread, updatedAt: nowIso() };
    const r = db
      .prepare('UPDATE threads SET number = ?, story_id = ?, status = ?, updated_at = ?, payload = ? WHERE id = ?')
      .run(next.number, next.storyId, next.status, next.updatedAt, JSON.stringify(next), next.id);
    return Number(r.changes) > 0 ? next : null; // deleted concurrently — do NOT resurrect
  };

  const mutateThread = async (id: string, fn: (t: Thread) => Thread | void): Promise<Thread | null> => {
    const row = db.prepare('SELECT payload FROM threads WHERE id = ?').get(id);
    if (!row) return null;
    const t = rowToThread(row);
    const out = fn(t) ?? t; // fn may mutate in place or return a replacement
    const next = { ...out, updatedAt: nowIso() };
    db.prepare('UPDATE threads SET number = ?, story_id = ?, status = ?, updated_at = ?, payload = ? WHERE id = ?').run(
      next.number,
      next.storyId,
      next.status,
      next.updatedAt,
      JSON.stringify(next),
      next.id,
    );
    return next;
  };

  const deleteThread = async (id: string): Promise<boolean> => {
    const r = db.prepare('DELETE FROM threads WHERE id = ?').run(id);
    return Number(r.changes) > 0;
  };

  const countThreads = async (): Promise<number> => {
    const row = db.prepare('SELECT COUNT(*) AS c FROM threads').get();
    return Number(row?.c ?? 0);
  };

  const checkpoint = (): void => {
    try {
      db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    } catch {
      /* best effort */
    }
  };

  const tombstone = async (issue: number): Promise<void> => {
    if (!Number.isFinite(issue) || issue <= 0) return;
    db.prepare('INSERT OR IGNORE INTO tombstones (issue, done) VALUES (?, 0)').run(issue);
  };
  const listOpenTombstones = async (): Promise<number[]> =>
    db.prepare('SELECT issue FROM tombstones WHERE done = 0 ORDER BY issue ASC').all().map((r) => Number(r.issue));
  const tombstoneDone = async (issue: number): Promise<void> => {
    // done rows are pruned immediately: the "already closed?" check in the
    // pull loop keeps the close idempotent without needing history, and the
    // table must not grow forever in local (no-GH) mode.
    db.prepare('DELETE FROM tombstones WHERE issue = ?').run(issue);
  };

  return {
    kind: 'sqlite',
    storePath,
    listThreads,
    getThread,
    createThread,
    updateThread,
    mutateThread,
    deleteThread,
    countThreads,
    checkpoint,
    tombstone,
    listOpenTombstones,
    tombstoneDone,
    close: () => {
      try {
        (db as unknown as { close?: () => void }).close?.();
      } catch {
        /* ignore */
      }
    },
  };
}

/* -------------------------------- json store --------------------------------- */

function jsonStore(storePath: string): Store {
  type Doc = { threads: Thread[]; counters: Record<string, number>; tombstones: { issue: number; done: boolean }[] };
  let doc: Doc = { threads: [], counters: {}, tombstones: [] };
  let queue: Promise<unknown> = Promise.resolve();
  let loaded = false;

  const load = async (): Promise<void> => {
    try {
      const parsed = JSON.parse(await fs.readFile(storePath, 'utf8')) as Partial<Doc>;
      doc = { threads: parsed.threads ?? [], counters: parsed.counters ?? {}, tombstones: parsed.tombstones ?? [] };
      loaded = true;
    } catch (err) {
      // A MISSING file is a legitimate empty store (first boot) — cache it.
      // Any other failure (transient EBUSY, parse error…) must NOT be cached:
      // keep the last-known doc, leave `loaded` false, and the next read
      // retries. (Old behavior: one failed read cached an EMPTY doc forever —
      // and the next write persisted that empty doc, wiping the file.)
      if ((err as NodeJS.ErrnoException | null)?.code === 'ENOENT') {
        doc = { threads: [], counters: {}, tombstones: [] };
        loaded = true;
      }
    }
  };

  const persist = async (): Promise<void> => {
    const tmp = `${storePath}.${process.pid}.tmp`;
    await fs.mkdir(path.dirname(storePath), { recursive: true });
    await fs.writeFile(tmp, JSON.stringify(doc, null, 1));
    await fs.rename(tmp, storePath);
  };

  const mutate = <T>(fn: () => Promise<T> | T): Promise<T> => {
    // Chain discipline mirrors ghsync's `run` mutex: the CALLER sees the real
    // error, but the queue itself survives it — chaining naively onto a
    // rejected promise would wedge every later write after one transient
    // load/persist failure.
    const exec = async (): Promise<T> => {
      await load();
      const out = await fn();
      await persist();
      return out;
    };
    const p = queue.then(exec, exec);
    queue = p.catch(() => undefined); // keep the chain alive through failures
    return p;
  };

  const loadRead = async (): Promise<void> => {
    if (!loaded) await load();
  };

  return {
    kind: 'json',
    storePath,
    listThreads: async (filter) => {
      await loadRead();
      return doc.threads
        .filter(
          (t) =>
            (!filter?.storyId || t.storyId === filter.storyId) &&
            (!filter?.status || t.status === filter.status),
        )
        .sort((a, b) => (a.storyId !== b.storyId ? (a.storyId < b.storyId ? -1 : 1) : (a.number ?? 0) - (b.number ?? 0)));
    },
    getThread: async (id) => {
      await loadRead();
      return doc.threads.find((t) => t.id === id) ?? null;
    },
    createThread: (input) =>
      mutate(async () => {
        const id = input.id ?? newId();
        const existing = doc.threads.find((t) => t.id === id);
        if (existing) return existing;
        const ts = nowIso();
        const n = doc.counters[input.storyId] ?? 1;
        doc.counters[input.storyId] = n + 1;
        const thread: Thread = {
          id,
          number: n,
          storyId: input.storyId,
          status: 'open',
          createdAt: ts,
          updatedAt: ts,
          author: input.comments[0]?.author ?? 'anonymous',
          story: { storyId: input.storyId, ...input.story },
          component: input.component ?? null,
          target: input.target,
          comments: input.comments,
        };
        doc.threads.push(thread);
        return thread;
      }),
    updateThread: (thread) =>
      mutate(async () => {
        const next = { ...thread, updatedAt: nowIso() };
        const idx = doc.threads.findIndex((t) => t.id === next.id);
        if (idx < 0) return null; // deleted concurrently — never resurrect
        doc.threads[idx] = next;
        return next;
      }),
    mutateThread: (id, fn) =>
      mutate(async () => {
        const idx = doc.threads.findIndex((t) => t.id === id);
        if (idx < 0) return null;
        const t = JSON.parse(JSON.stringify(doc.threads[idx])) as Thread; // copy — avoid aliasing
        const out = fn(t) ?? t;
        const next = { ...out, updatedAt: nowIso() };
        doc.threads[idx] = next;
        return next;
      }),
    deleteThread: (id) =>
      mutate(async () => {
        const idx = doc.threads.findIndex((t) => t.id === id);
        if (idx < 0) return false;
        doc.threads.splice(idx, 1);
        return true;
      }),
    countThreads: async () => {
      await loadRead();
      return doc.threads.length;
    },
    checkpoint: () => undefined,
    tombstone: (issue) =>
      mutate(async () => {
        if (Number.isFinite(issue) && issue > 0 && !doc.tombstones.some((t) => t.issue === issue)) {
          doc.tombstones.push({ issue, done: false });
        }
      }),
    listOpenTombstones: async () => {
      await loadRead();
      return doc.tombstones.filter((t) => !t.done).map((t) => t.issue);
    },
    tombstoneDone: (issue) =>
      mutate(async () => {
        doc.tombstones = doc.tombstones.filter((t) => t.issue !== issue);
      }),
    close: () => undefined,
  };
}

/* --------------------------------- factory ----------------------------------- */

let current: Store | null = null;

export function getStore(configDir: string): Store {
  if (current) return current;
  const dataDir = path.resolve(configDir, 'annotakit');
  try {
    const fsSync = require('node:fs') as typeof import('node:fs');
    fsSync.mkdirSync(dataDir, { recursive: true });
    // process.getBuiltinModule keeps the node: prefix intact — bundlers rewrite
    // plain require('node:sqlite') to a bare specifier that Node cannot resolve.
    const nodeSqlite = (
      process as unknown as { getBuiltinModule?: (id: string) => unknown }
    ).getBuiltinModule?.('node:sqlite') as
      | { DatabaseSync: new (p: string) => SqliteDb }
      | undefined;
    if (!nodeSqlite?.DatabaseSync) throw Object.assign(new Error('node:sqlite unavailable on this Node'), { benignFallback: true });
    const dbPath = path.join(dataDir, 'threads.db');
    let db: SqliteDb;
    try {
      db = new nodeSqlite.DatabaseSync(dbPath);
    } catch (openErr) {
      // A populated database failing to OPEN is NOT a fallback situation — the
      // old behavior silently swapped in an empty JSON store and users saw all
      // their feedback "vanish". Fail loud instead; the API surfaces it as 500.
      const hasData = fsSync.existsSync(dbPath) && fsSync.statSync(dbPath).size > 0;
      throw Object.assign(
        new Error(`threads.db failed to open (${openErr instanceof Error ? openErr.message : String(openErr)})${hasData ? ' — refusing to silently fall back to an empty store; is another dev server running?' : ''}`),
        { status: 500 },
      );
    }
    current = sqliteStore(db, dbPath);
  } catch (err) {
    if (!(err as { benignFallback?: boolean })?.benignFallback) {
      // Real failure (locked/corrupt/populated-but-unopenable) — do not swallow.
      throw err;
    }
    // Only the legitimate case falls back: this Node has no node:sqlite.
    console.warn(
      `[storybook-annotakit] node:sqlite unavailable (${err instanceof Error ? err.message : String(err)}) — using JSON file store`,
    );
    current = jsonStore(path.join(dataDir, 'threads.json'));
  }
  return current;
}

/** Read <configDir>/annotakit.config.json (optional). */
export function readConfig(configDir: string): Record<string, unknown> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fsSync = require('node:fs') as typeof import('node:fs');
    return JSON.parse(
      fsSync.readFileSync(path.resolve(configDir, 'annotakit.config.json'), 'utf8'),
    ) as Record<string, unknown>;
  } catch {
    return {};
  }
}

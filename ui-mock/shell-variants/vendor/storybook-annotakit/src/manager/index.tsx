/**
 * storybook-annotakit — manager entry.
 *
 * Registers:
 *   - a Review PANEL (bottom dock): threads for the current story (or all),
 *     reply / resolve, lean exports (copy/download markdown+json), and the
 *     GitHub lifecycle mirror status (per-thread issue links, sync-now).
 *   - a canvas TOOL: show/hide the preview capture layer.
 *
 * Bug-fix hardening: NEVER use SB's useChannel(eventMap) without deps — it
 * subscribes with the FIRST render's closures (scope/storyId go stale, live
 * updates stop, the list looks like it randomly filters). An explicit effect
 * with [scope, storyId, refresh] deps re-subscribes correctly.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { addons, types, useStorybookApi, useStorybookState } from 'storybook/manager-api';
import { useTheme } from 'storybook/theming';
import { CheckIcon, CommentIcon, EyeIcon, EyeCloseIcon, LinkIcon, SyncIcon } from '@storybook/icons';
import { API_BASE, FOCUS_THREAD, THREADS_CHANGED, THREAD_FOCUSED, TOGGLE_LAYER, type ThreadsChangedPayload } from '../shared/events';
import type { GhSyncStatus, GhSyncSummary, Thread } from '../shared/types';

const ADDON_ID = 'annotakit';
const PANEL_ID = `${ADDON_ID}/panel`;
const TOOL_ID = `${ADDON_ID}/tool`;
const AUTHOR_KEY = 'annotakit:author';

interface HealthInfo {
  ok?: boolean;
  store?: string;
  threads?: number;
  agentSurfaces?: { rest?: boolean; digests?: string[]; github?: boolean; githubReason?: string; durability?: string };
  gh?: { repo?: string | null; hasToken?: boolean; autoSync?: string } | null;
}

/* --------------------------------- fetch api --------------------------------- */

async function jfetch(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, init);
  const text = await res.text();
  // non-JSON error pages (proxy 502s, HTML) must not surface as SyntaxError
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    throw new Error(
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `HTTP ${res.status}${text.slice(0, 120) ? `: ${text.slice(0, 120)}` : ''}`,
    );
  }
  return body;
}

const getThreads = (storyId?: string): Promise<Thread[]> =>
  jfetch(`${API_BASE}/threads${storyId ? `?storyId=${encodeURIComponent(storyId)}` : ''}`).then(
    (b) => (b as { threads: Thread[] }).threads ?? [],
  );

const getHealth = (): Promise<HealthInfo | null> =>
  fetch(`${API_BASE}/health`, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

const getExport = (format: 'md' | 'json', storyId?: string): Promise<string> =>
  fetch(
    `${API_BASE}/export?format=${format}${storyId ? `&storyId=${encodeURIComponent(storyId)}` : ''}`,
    { cache: 'no-store' },
  ).then((r) => {
    if (!r.ok) throw new Error(`export failed: HTTP ${r.status}`);
    return r.text();
  });

const getSyncStatus = (): Promise<GhSyncStatus | null> =>
  fetch(`${API_BASE}/sync`, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

const postSync = (): Promise<GhSyncSummary> =>
  jfetch(`${API_BASE}/sync`, { method: 'POST' }) as Promise<GhSyncSummary>;

/** Stable list order: story title, then per-story number ascending — resolving
 *  a thread must NEVER reorder or "shrink" the list. */
function stableSort(threads: Thread[]): Thread[] {
  return [...threads].sort((a, b) => {
    const sa = a.story?.title ?? a.storyId;
    const sb = b.story?.title ?? b.storyId;
    if (sa !== sb) return sa < sb ? -1 : 1;
    return (a.number ?? 0) - (b.number ?? 0);
  });
}

/** "12s ago" / "3m ago" for the sync status line. */
function ago(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

/* ------------------------------------ panel ----------------------------------- */

function ReviewPanel(): React.ReactElement {
  const theme = useTheme();
  const storybookApi = useStorybookApi();
  const state = useStorybookState();
  const storyId = state.storyId as string | undefined;

  const [scope, setScope] = useState<'story' | 'all'>('story');
  const [filter, setFilter] = useState<'open' | 'all'>('all');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [author, setAuthor] = useState('reviewer');
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [ghOpen, setGhOpen] = useState(false);
  const [sync, setSync] = useState<GhSyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [health, setHealth] = useState<HealthInfo | null>(null);

  useEffect(() => {
    try {
      const a = localStorage.getItem(AUTHOR_KEY);
      if (a) setAuthor(a);
    } catch {
      /* ignore */
    }
  }, []);

  /* one-shot: server health + sync status */
  useEffect(() => {
    let alive = true;
    void getHealth().then((h) => {
      if (!alive || !h) return;
      setHealth(h);
    });
    void getSyncStatus().then((s) => {
      if (alive && s) setSync(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const list = await getThreads(scope === 'story' ? storyId : undefined);
      setThreads(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    // piggyback: mirror status + health ride along so the sync line stays fresh
    void getSyncStatus().then((s) => {
      if (s) setSync(s);
    });
    void getHealth().then((h) => {
      if (h) setHealth(h);
    });
  }, [scope, storyId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /* live updates — explicit subscription with FRESH deps (stale-closure fix) */
  useEffect(() => {
    const ch = addons.getChannel();
    const onChange = (payload: ThreadsChangedPayload) => {
      if (scope === 'all' || !payload?.storyId || payload.storyId === storyId) void refresh();
    };
    ch.on(THREADS_CHANGED, onChange);
    return () => {
      ch.removeListener(THREADS_CHANGED, onChange);
    };
  }, [scope, storyId, refresh]);

  const saveAuthor = (value: string): void => {
    setAuthor(value);
    try {
      localStorage.setItem(AUTHOR_KEY, value);
    } catch {
      /* ignore */
    }
  };

  const focusThread = (t: Thread): void => {
    if (t.storyId !== storyId) {
      storybookApi.selectStory(t.storyId);
      // Cross-story focus is a RACE: the preview's anchors map still belongs
      // to the previous story until the new story's fetch + resolve passes
      // (350/1200 ms) land. Retry-until-ack: the preview emits THREAD_FOCUSED
      // only when the pin actually resolved + flashed — until then, re-emit
      // (R14 fix; was a fixed 400 ms one-shot that silently dead-clicked).
      const ch = addons.getChannel();
      let attempts = 0;
      const ack = () => { attempts = 99; ch.removeListener(THREAD_FOCUSED, ack); };
      ch.on(THREAD_FOCUSED, ack);
      const emitOnce = () => {
        if (attempts >= 5) { ch.removeListener(THREAD_FOCUSED, ack); return; }
        attempts += 1;
        ch.emit(FOCUS_THREAD, t.id);
        window.setTimeout(emitOnce, 400); // re-armed until ack / 5 attempts
      };
      window.setTimeout(emitOnce, 400);
    } else {
      addons.getChannel().emit(FOCUS_THREAD, t.id);
    }
    setActiveThread(t.id);
  };

  const reply = async (t: Thread, body: string): Promise<boolean> => {
    if (!body.trim()) return false;
    setBusy(true);
    try {
      await jfetch(`${API_BASE}/threads/${encodeURIComponent(t.id)}/comments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body, author }),
      });
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false; // caller keeps the draft — failed replies must not vanish
    } finally {
      setBusy(false);
    }
  };

  const toggleResolve = async (t: Thread): Promise<void> => {
    setBusy(true);
    try {
      const next: Thread = {
        ...t,
        status: t.status === 'open' ? 'resolved' : 'open',
        resolvedAt: t.status === 'open' ? new Date().toISOString() : undefined,
      };
      await jfetch(`${API_BASE}/threads/${encodeURIComponent(t.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(next),
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, what: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`${what} copied to clipboard`);
      window.setTimeout(() => setNotice(null), 2500);
    } catch {
      setError('clipboard blocked — use Download instead');
    }
  };

  const download = (text: string, filename: string): void => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** Force reconcile — idempotent by design: never creates duplicate issues. */
  const syncNow = async (): Promise<void> => {
    setSyncing(true);
    try {
      const summary = await postSync();
      if (summary.noop) {
        // local mode: a state, not an error — show the a/b/c steps as a notice
        setNotice(`GitHub mirror not configured — local mode. ${summary.reason ?? ''}`.slice(0, 400));
      } else {
        setNotice(
          `synced: ${summary.created} issue${summary.created === 1 ? '' : 's'} created · ${summary.pushed} pushed · ${summary.pulled} pulled from GitHub${summary.stalled ? ` · ${summary.stalled} stalled (will retry)` : ''}`,
        );
      }
      window.setTimeout(() => setNotice(null), 6000);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  const ordered = useMemo(() => stableSort(threads), [threads]);
  const shown = useMemo(
    () => ordered.filter((t) => (filter === 'all' ? true : t.status === 'open')),
    [ordered, filter],
  );
  const openCount = ordered.filter((t) => t.status === 'open').length;
  const chip = (bg: string, color: string): React.CSSProperties => ({
    background: bg,
    color,
    borderRadius: 999,
    padding: '1px 7px',
    fontSize: 10,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    border: `1px solid ${color}33`,
  });
  const miniBtn = (bg: string, active: boolean): React.CSSProperties => ({
    padding: '3px 10px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    background: active ? bg : 'transparent',
    color: active ? '#fff' : theme.textColor,
  });

  return (
    <div style={{ fontFamily: theme.fontBase, fontSize: 13, padding: '8px 10px', height: '100%', overflow: 'auto', color: theme.textColor }}>
      {/* header row */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 6, borderBottom: `1px solid ${theme.appBorderColor}` }}>
        <div style={{ display: 'flex', gap: 0, border: `1px solid ${theme.appBorderColor}`, borderRadius: 7, overflow: 'hidden' }}>
          <button style={miniBtn(theme.colorSecondary, scope === 'story')} onClick={() => setScope('story')}>
            This story
          </button>
          <button style={miniBtn(theme.colorSecondary, scope === 'all')} onClick={() => setScope('all')}>
            All stories
          </button>
        </div>
        <div style={{ display: 'flex', gap: 0, border: `1px solid ${theme.appBorderColor}`, borderRadius: 7, overflow: 'hidden' }}>
          <button style={miniBtn(theme.colorSecondary, filter === 'all')} onClick={() => setFilter('all')} title="Show open + resolved">
            all
          </button>
          <button style={miniBtn(theme.colorSecondary, filter === 'open')} onClick={() => setFilter('open')} title="Show only open">
            open
          </button>
        </div>
        <span style={{ fontSize: 11, color: theme.textMutedColor }}>
          {threads.length ? `${openCount} open / ${threads.length} threads` : 'no threads'}
        </span>
        <span style={{ flex: 1 }} />
        <input
          style={{ padding: '3px 8px', fontSize: 11, borderRadius: 6, border: `1px solid ${theme.inputBorder || theme.appBorderColor}`, background: theme.inputBackground || 'transparent', color: theme.textColor, width: 110 }}
          value={author}
          onChange={(e) => saveAuthor(e.target.value)}
          placeholder="your name"
          aria-label="Author name"
          title="Author name (shared with the preview composer)"
        />
        <button style={{ padding: '3px 9px', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 6, border: `1px solid ${theme.appBorderColor}`, background: 'transparent', color: theme.textColor }} onClick={() => setGhOpen((v) => !v)} title="GitHub lifecycle sync">
          <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            <SyncIcon width={12} height={12} /> GitHub
            {/* honest indicator: green ONLY when auto AND healthy; red on lastError; amber otherwise */}
            {sync && sync.mode === 'auto' && !sync.lastError && <span style={{ width: 6, height: 6, borderRadius: 999, background: theme.colorPositive, display: 'inline-block' }} />}
            {sync?.lastError && <span style={{ width: 6, height: 6, borderRadius: 999, background: theme.colorNegative, display: 'inline-block' }} title="sync error — open for details" />}
            {sync && sync.mode !== 'auto' && !sync.lastError && <span style={{ width: 6, height: 6, borderRadius: 999, background: '#f59e0b', display: 'inline-block' }} title={sync.mode === 'unconfigured' ? 'local mode — GitHub mirror not configured' : 'mirror disabled'} />}
          </span>
        </button>
      </div>

      {/* gh lifecycle sync */}
      {ghOpen && (
        <div style={{ padding: '8px 0', borderBottom: `1px solid ${theme.appBorderColor}`, fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {sync ? (
              <>
                <span style={{ ...chip(sync.mode === 'auto' ? `${theme.colorPositive}22` : '#f59e0b22', sync.mode === 'auto' ? theme.colorPositive : '#b45309') }}>
                  {sync.mode === 'auto' ? 'auto-sync' : sync.mode === 'unconfigured' ? 'local mode' : 'mirror off'}
                </span>
                <span style={{ color: theme.textMutedColor }}>
                  {sync.mode === 'auto' && <>{sync.mapped}/{sync.threads} threads mirrored{sync.pending > 0 ? ` · ${sync.pending} queued` : ''}{sync.stalled > 0 ? ` · ${sync.stalled} stalled` : ''}{sync.lastPushAt ? ` · pushed ${ago(sync.lastPushAt)}` : ''}{sync.lastPullAt ? ` · pulled ${ago(sync.lastPullAt)}` : ''}{sync.pollSec > 0 ? ` · polls every ${sync.pollSec}s` : ''}</>}
                  {sync.backoffUntil && <>{sync.lastError ? ' · ' : ''}backoff until {new Date(sync.backoffUntil).toLocaleTimeString()}</>}
                </span>
              </>
            ) : (
              <span style={{ color: theme.textMutedColor }}>sync status unavailable (dev server offline?)</span>
            )}
            <span style={{ flex: 1 }} />
            <button
              style={{ padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: syncing ? 'default' : 'pointer', borderRadius: 6, border: 'none', background: theme.colorSecondary, color: '#fff', display: 'inline-flex', gap: 4, alignItems: 'center' }}
              disabled={syncing}
              onClick={() => void syncNow()}
              title="Force reconcile both directions — idempotent, never duplicates issues"
            >
              <SyncIcon width={11} height={11} /> {syncing ? 'syncing…' : 'Sync now'}
            </button>
          </div>
          {sync?.lastError && (
            <div style={{ padding: '4px 8px', borderRadius: 6, background: `${theme.colorNegative}18`, color: theme.colorNegative, whiteSpace: 'pre-wrap' }}>
              last sync error: {sync.lastError}
            </div>
          )}
          {sync?.note && (
            <span style={{ fontSize: 10, color: theme.textMutedColor, whiteSpace: 'pre-wrap' }}>{sync.note}</span>
          )}
          <span style={{ fontSize: 10, color: theme.textMutedColor }}>
            {health?.agentSurfaces?.github
              ? <>repo: <b>{health.gh?.repo}</b> · durability: {health.agentSurfaces.durability} · store: {health.gh?.autoSync}</>
              : health?.agentSurfaces
                ? <>local mode — reviews live here (REST + digests); GitHub mirror: {health.agentSurfaces.githubReason ?? 'off'}{health.agentSurfaces.durability ? ` · durability: ${health.agentSurfaces.durability}` : ''}</>
                : 'set ANNOTAKIT_GH_TOKEN in .env (auto-loaded) · repo auto-detected from git remote'}
          </span>
          <span style={{ fontSize: 10, color: theme.textMutedColor }}>
            Every thread mirrors to exactly ONE issue — status (open/resolved), replies and fix evidence sync both ways automatically. “Sync now” only reconciles; it never creates a duplicate issue.
          </span>
        </div>
      )}

      {error && (
        <div style={{ margin: '6px 0', padding: '5px 8px', fontSize: 11, borderRadius: 6, background: `${theme.colorNegative}22`, color: theme.colorNegative, whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
      )}
      {notice && (
        <div style={{ margin: '6px 0', padding: '5px 8px', fontSize: 11, borderRadius: 6, background: `${theme.colorPositive}22`, color: theme.colorPositive }}>
          {notice}
        </div>
      )}

      {/* thread list */}
      {shown.length === 0 && (
        <div style={{ padding: '12px 4px', fontSize: 12, color: theme.textMutedColor }}>
          {threads.length === 0
            ? scope === 'story'
              ? <>No threads for this story. Press <b>C</b> in the canvas and click an element — or <b>R</b> to drag a region. Everything saves automatically to the dev-server store.</>
              : <>No threads yet. Press <b>C</b> in the canvas and click an element.</>
            : <>All threads resolved 🎉 — switch the filter to “all” to see them.</>}
        </div>
      )}
      {shown.map((t) => {
        const active = t.id === activeThread;
        return (
          <div
            key={t.id}
            role="button"
            tabIndex={0}
            aria-label={`Thread #${t.number} by ${t.author ?? 'anonymous'} — ${t.status === 'open' ? 'open' : 'resolved'} — ${t.comments[0]?.body?.slice(0, 60) ?? '(no text)'}`}
            style={{
              padding: '6px 6px 6px 8px',
              margin: '5px 0',
              borderRadius: 7,
              border: `1px solid ${active ? theme.colorSecondary : theme.appBorderColor}`,
              background: active ? `${theme.colorSecondary}11` : 'transparent',
              cursor: 'pointer',
              opacity: t.status === 'open' ? 1 : 0.75,
            }}
            onClick={() => focusThread(t)}
            onKeyDown={(e) => {
              /* keyboard parity (R13 review): the card is the gate for reply +
                 resolve — pointer-only divs made the panel's core actions
                 unreachable by keyboard */
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                focusThread(t);
              }
            }}
          >
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={chip(t.status === 'open' ? '#f59e0b22' : '#16a34a22', t.status === 'open' ? '#b45309' : '#15803d')}>
                #{t.number} {t.status === 'open' ? 'open' : 'resolved'}
              </span>
              {t.gh?.url && (
                <a
                  href={t.gh.url}
                  target="_blank"
                  rel="noreferrer"
                  title={`GitHub issue #${t.gh.issue} — mirrors this thread's lifecycle (open/closed + replies)`}
                  style={{ ...chip(`${theme.colorSecondary}18`, theme.colorSecondary), textDecoration: 'none', display: 'inline-flex', gap: 3, alignItems: 'center', cursor: 'pointer' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <LinkIcon width={10} height={10} /> {t.gh.issue}
                </a>
              )}
              {t.component?.name && <span style={chip(`${theme.colorSecondary}18`, theme.colorSecondary)}>{t.component.name}</span>}
              {scope === 'all' && t.story.name && <span style={chip('#64748b18', theme.textMutedColor)}>{t.story.name}</span>}
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 10, color: theme.textMutedColor }}>{t.createdAt.slice(0, 10)}</span>
            </div>
            <div style={{ fontSize: 12, marginTop: 3, color: theme.textColor, textDecoration: t.status === 'open' ? 'none' : 'line-through' }}>
              {t.comments[0]?.body?.split('\n')[0]?.slice(0, 140) ?? '(no text)'}
            </div>
            {t.component?.source && (
              <div style={{ fontSize: 10.5, color: theme.textMutedColor, fontFamily: theme.fontMonospace, marginTop: 2 }}>
                {t.component.source.file}
                {t.component.source.line ? `:${t.component.source.line}` : ''}
              </div>
            )}
            {t.comments.length > 1 && (
              <div style={{ fontSize: 10.5, color: theme.textMutedColor, marginTop: 2 }}>+{t.comments.length - 1} replies</div>
            )}
            <ThreadActions thread={t} busy={busy} onReply={reply} onToggleResolve={toggleResolve} active={active} />
          </div>
        );
      })}

      {/* footer: exports */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', paddingTop: 8, marginTop: 6, borderTop: `1px solid ${theme.appBorderColor}`, position: 'sticky', bottom: 0, background: theme.backgroundBar ?? theme.background }}
      >
        <span style={{ fontSize: 10.5, color: theme.textMutedColor, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
          <CommentIcon width={11} height={11} /> agent digest:
        </span>
        <MiniButton theme={theme} onClick={() => void getExport('md', scope === 'story' ? storyId : undefined).then((md) => copy(md, 'markdown digest')).catch((e) => setError(e instanceof Error ? e.message : String(e)))}>copy md</MiniButton>
        <MiniButton theme={theme} onClick={() => void getExport('json', scope === 'story' ? storyId : undefined).then((json) => copy(json, 'JSON bundle')).catch((e) => setError(e instanceof Error ? e.message : String(e)))}>copy json</MiniButton>
        <MiniButton theme={theme} onClick={() => void getExport('md', scope === 'story' ? storyId : undefined).then((md) => download(md, 'annotakit-review.md')).catch((e) => setError(e instanceof Error ? e.message : String(e)))}>download md</MiniButton>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: theme.textMutedColor, fontFamily: theme.fontMonospace }}>
          curl {API_BASE}/export?format=md
        </span>
      </div>
    </div>
  );
}

function ThreadActions(props: {
  thread: Thread;
  busy: boolean;
  active: boolean;
  onReply: (t: Thread, body: string) => Promise<boolean>;
  onToggleResolve: (t: Thread) => void;
}): React.ReactElement {
  const [body, setBody] = useState('');
  const theme = useTheme();
  if (!props.active) return <></>;
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 6 }} onClick={(e) => e.stopPropagation()}>
      <input
        style={{ flex: 1, padding: '3px 8px', fontSize: 12, borderRadius: 6, border: `1px solid ${theme.appBorderColor}`, background: 'transparent', color: theme.textColor }}
        aria-label={`Reply to thread #${props.thread.number}`}
        placeholder="reply…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && body.trim() && !props.busy) {
            // clear ONLY on success — a failed reply must not eat the draft
            void props.onReply(props.thread, body).then((ok) => {
              if (ok) setBody('');
            });
          }
        }}
      />
      <button
        style={{ padding: '3px 9px', fontSize: 11, fontWeight: 600, cursor: props.busy ? 'default' : 'pointer', borderRadius: 6, border: `1px solid ${props.thread.status === 'open' ? '#86efac' : '#fecaca'}`, background: 'transparent', color: props.thread.status === 'open' ? '#15803d' : '#b91c1c', display: 'inline-flex', gap: 4, alignItems: 'center' }}
        disabled={props.busy}
        onClick={() => props.onToggleResolve(props.thread)}
      >
        <CheckIcon width={11} height={11} />
        {props.thread.status === 'open' ? 'resolve' : 'reopen'}
      </button>
    </div>
  );
}

function MiniButton(props: { theme: ReturnType<typeof useTheme>; onClick: () => void; children: React.ReactNode }): React.ReactElement {
  return (
    <button
      style={{ padding: '2px 8px', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', borderRadius: 6, border: `1px solid ${props.theme.appBorderColor}`, background: 'transparent', color: props.theme.textColor }}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

/* ------------------------------------ tool ------------------------------------ */

function LayerToggleTool(): React.ReactElement {
  const [visible, setVisible] = useState(true);
  const theme = useTheme();
  const label = visible ? 'Hide Annotakit pins' : 'Show Annotakit pins';
  return (
    <button
      key="annotakit-layer-toggle"
      title={label}
      aria-label={label}
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: theme.barTextColor, display: 'inline-flex', alignItems: 'center', opacity: visible ? 1 : 0.5 }}
      onClick={() => {
        const next = !visible;
        setVisible(next);
        addons.getChannel().emit(TOGGLE_LAYER, next);
      }}
    >
      {visible ? <EyeIcon width={14} height={14} /> : <EyeCloseIcon width={14} height={14} />}
    </button>
  );
}

/* --------------------------------- registration -------------------------------- */

addons.register(ADDON_ID, () => {
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: 'Annotakit',
    match: ({ viewMode }: { viewMode?: string }) => viewMode === 'story',
    render: ({ active }: { active?: boolean }) => (active ? <ReviewPanel /> : null),
  });

  addons.add(TOOL_ID, {
    type: types.TOOL,
    title: 'Annotakit: toggle pins',
    render: () => <LayerToggleTool />,
  });
});

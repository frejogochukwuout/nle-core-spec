/**
 * storybook-annotakit — the preview overlay: pin/region capture, thread pins,
 * composer, drawer, launcher.
 *
 * Loading contract (bug-fix hardening):
 *   - threads are fetched on mount / story change with NO apiOk gating and
 *     retried with backoff on transient failure (a slow dev server must never
 *     swallow pins);
 *   - the health probe only decides the "dev only" banner, never blocks data;
 *   - a freshly submitted thread is echoed into local state from the server
 *     response (the pin appears instantly, refresh is just reconciliation);
 *   - anchors re-resolve in multiple passes (rAF + 350ms + 1200ms) so stories
 *     that render asynchronously still get their pins placed;
 *   - every card (composer/thread) is clamped inside the iframe viewport with
 *     its MEASURED size — never a hardcoded guess.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { addons } from 'storybook/preview-api';
import { captureAnchor, resolveAnchor, type AnchorResolution } from './anchor';
import { inspectComponent } from './fiber';
import { buildStoryRef } from './story-meta';
import { addComment, createThread, getThreads, patchThread, probeHealth } from './api';
import { injectOverlayCss } from './styles';
import {
  FOCUS_THREAD,
  LAYER_STATE,
  THREADS_CHANGED,
  THREAD_FOCUSED,
  TOGGLE_LAYER,
  type ThreadsChangedPayload,
} from '../shared/events';
import type { Comment, Thread, ThreadTarget } from '../shared/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Minimal structural Channel (on/off/emit) — avoids importing SB internal types. */
interface ChannelLike {
  on(event: string, cb: (...args: any[]) => void): void;
  removeListener(event: string, cb: (...args: any[]) => void): void;
  emit(event: string, payload?: unknown): void;
}

function sbChannel(): ChannelLike {
  return (addons as any).getChannel() as ChannelLike;
}

/* ---------------------------------- utils ------------------------------------ */

const AUTHOR_KEY = 'annotakit:author';

function getAuthor(): string {
  try {
    return localStorage.getItem(AUTHOR_KEY) || 'reviewer';
  } catch {
    return 'reviewer';
  }
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return (
    t.tagName === 'INPUT' ||
    t.tagName === 'TEXTAREA' ||
    t.tagName === 'SELECT' ||
    t.isContentEditable
  );
}

function storyRoot(): HTMLElement {
  return (document.getElementById('storybook-root') as HTMLElement | null) ?? document.body;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max < min ? min : max);
}

/* --------------------------------- hotkeys ----------------------------------- */

/** Key spec: 'c', 'k', or 'alt+c'. Single letter (or '?' / 'escape'). */
export interface HotkeySpec {
  key: string;
  alt: boolean;
}

export interface Hotkeys {
  pin: string;
  region: string;
  layer: string;
  drawer: string;
  help: string;
}

export const DEFAULT_HOTKEYS: Hotkeys = { pin: 'c', region: 'r', layer: 'l', drawer: 'd', help: '?' };

function parseHotkey(spec: string | undefined, fallback: string): HotkeySpec {
  const raw = (spec || fallback).trim().toLowerCase();
  const altPrefix = /^(?:alt|option|⌥|option\+|alt\+)\s*/;
  const withAlt = altPrefix.test(raw);
  const key = raw.replace(altPrefix, '');
  return { key: key || fallback, alt: withAlt };
}

function hotkeyMatches(e: KeyboardEvent, spec: HotkeySpec): boolean {
  const key = e.key.toLowerCase();
  if (key !== spec.key) return false;
  if (e.ctrlKey || e.metaKey) return false; // never hijack ⌘/Ctrl browser shortcuts
  return e.altKey === spec.alt;
}

/* -------------------------------- component ---------------------------------- */

export interface AnnotaLayerProps {
  storyId: string;
  title?: string;
  name?: string;
  /** Custom hotkeys (from parameters.annotakit.hotkeys). */
  hotkeys?: Partial<Hotkeys> | false;
}

interface ResolvedPin {
  el: HTMLElement | null;
  status: AnchorResolution['status'];
  strategy: AnchorResolution['strategy'];
}

interface ComposerState {
  x: number;
  y: number;
  target: ThreadTarget;
  element?: HTMLElement | null;
}

export function AnnotaLayer({ storyId, title, name, hotkeys }: AnnotaLayerProps): React.ReactElement | null {
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [anchors, setAnchors] = useState<Map<string, ResolvedPin>>(new Map());
  const [visible, setVisible] = useState(true);
  const [mode, setMode] = useState<'idle' | 'pin' | 'region'>('idle');
  const [composer, setComposer] = useState<ComposerState | null>(null);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [hoverBox, setHoverBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [dragRect, setDragRect] = useState<{ x: number; y: number; h: number; w: number } | null>(null);

  const hk = useMemo<Hotkeys>(() => ({ ...DEFAULT_HOTKEYS, ...(hotkeys ?? {}) }), [hotkeys]);
  const hkPin = useMemo(() => parseHotkey(hk.pin, DEFAULT_HOTKEYS.pin), [hk.pin]);
  const hkRegion = useMemo(() => parseHotkey(hk.region, DEFAULT_HOTKEYS.region), [hk.region]);
  const hkLayer = useMemo(() => parseHotkey(hk.layer, DEFAULT_HOTKEYS.layer), [hk.layer]);
  const hkDrawer = useMemo(() => parseHotkey(hk.drawer, DEFAULT_HOTKEYS.drawer), [hk.drawer]);
  const hkHelp = useMemo(() => parseHotkey(hk.help, DEFAULT_HOTKEYS.help), [hk.help]);

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const storyIdRef = useRef(storyId);
  storyIdRef.current = storyId;
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const mountedRef = useRef(true);

  /* ---- css ---- */
  useEffect(() => {
    injectOverlayCss();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  /* ---- fetch threads (mount, story change, broadcast) — never apiOk-gated ---- */
  const refresh = useCallback(async (): Promise<void> => {
    try {
      const list = await getThreads(storyIdRef.current);
      if (!mountedRef.current) return;
      retryCount.current = 0;
      setThreads(list);
      setError(null);
    } catch (e) {
      if (!mountedRef.current) return;
      // transient? retry with backoff (max 5); a cold dev server must not lose pins
      if (retryCount.current < 5) {
        const delay = 400 * 2 ** retryCount.current;
        retryCount.current += 1;
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(() => void refresh(), delay);
        return;
      }
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    retryCount.current = 0;
    void refresh();
  }, [storyId, refresh]);

  useEffect(() => {
    const ch = sbChannel();
    const onChange = (payload: ThreadsChangedPayload) => {
      if (!payload?.storyId || payload.storyId === storyIdRef.current) void refresh();
    };
    ch.on(THREADS_CHANGED, onChange);
    return () => {
      ch.removeListener(THREADS_CHANGED, onChange);
    };
  }, [refresh]);

  /* ---- health probe: informational only (drives the "dev only" banner).
   *  Retried with backoff — a transient boot failure must not permanently
   *  hide pins while the threads fetch (which retries 5×) would succeed. ---- */
  useEffect(() => {
    let alive = true;
    let attempt = 0;
    const tryProbe = (): void => {
      probeHealth().then(
        (h) => {
          if (!alive) return;
          if (h.ok) setApiOk(true);
          else if (attempt < 4) {
            attempt++;
            window.setTimeout(tryProbe, 400 * attempt);
          } else setApiOk(false); // honestly offline after 5 tries (~4s)
        },
        () => {
          if (!alive) return;
          if (attempt < 4) {
            attempt++;
            window.setTimeout(tryProbe, 400 * attempt);
          } else setApiOk(false);
        },
      );
    };
    tryProbe();
    return () => {
      alive = false;
    };
  }, []);

  /* ---- re-resolve anchors (multi-pass so async-rendering stories settle) ---- */
  const resolveAll = useCallback(() => {
    const root = storyRoot();
    const map = new Map<string, ResolvedPin>();
    for (const t of threads) {
      if (t.target.kind === 'region') {
        map.set(t.id, { el: null, status: 'resolved', strategy: 'none' });
        continue;
      }
      const r = resolveAnchor(t.target, root);
      map.set(t.id, { el: r.element, status: r.status, strategy: r.strategy });
    }
    setAnchors(map);
    setTick((n) => n + 1);
  }, [threads]);

  useEffect(() => {
    if (apiOk === false) return;
    resolveAll();
    // stories can render late (async effects, suspense, fonts) — re-anchor in
    // additional passes; each is idempotent and cheap.
    const t1 = setTimeout(resolveAll, 350);
    const t2 = setTimeout(resolveAll, 1200);
    const raf = requestAnimationFrame(() => setTick((n) => n + 1)); // post-layout measure
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      cancelAnimationFrame(raf);
    };
  }, [apiOk, resolveAll]);

  /* DOM mutation + scroll/resize → re-resolve (debounced) / re-measure (rAF) */
  useEffect(() => {
    if (apiOk === false) return;
    const root = storyRoot();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const obs = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(resolveAll, 350);
    });
    obs.observe(root, { childList: true, subtree: true, characterData: true, attributes: true });
    let raf = 0;
    const onReflow = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setTick((n) => n + 1));
    };
    window.addEventListener('scroll', onReflow, { passive: true, capture: true });
    window.addEventListener('resize', onReflow);
    return () => {
      obs.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onReflow, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', onReflow);
    };
  }, [apiOk, resolveAll]);

  const emitLayerState = useCallback((v: boolean) => {
    try {
      sbChannel().emit(LAYER_STATE, v);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    emitLayerState(visible);
  }, [visible, emitLayerState]);

  /* ---- focus / flash ---- */
  const focusThread = useCallback(
    (threadId: string) => {
      setActiveThread(threadId);
      const pin = anchors.get(threadId);
      const el = pin?.el ?? null;
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.setAttribute('data-annota-flash', '1');
        window.setTimeout(() => el.removeAttribute('data-annota-flash'), 3400);
        // ack ONLY on a resolved pin — an anchors map still owned by the
        // previous story stays silent so the manager re-emits (retry race fix)
        sbChannel().emit(THREAD_FOCUSED, threadId);
      }
    },
    [anchors],
  );

  /* ---- channel: manager commands ----
   * Explicit deps (was: NO array → re-subscribed on every render). The effect
   * must live AFTER focusThread's declaration: the deps array is evaluated
   * during render, so referencing focusThread before its `const` initializer
   * would be a TDZ ReferenceError. */
  useEffect(() => {
    const ch = sbChannel();
    const onFocus = (threadId: string) => {
      focusThread(threadId);
    };
    const onToggle = (state: unknown) => {
      const next = typeof state === 'boolean' ? state : !visible;
      setVisible(next);
    };
    ch.on(FOCUS_THREAD, onFocus);
    ch.on(TOGGLE_LAYER, onToggle);
    return () => {
      ch.removeListener(FOCUS_THREAD, onFocus);
      ch.removeListener(TOGGLE_LAYER, onToggle);
    };
  }, [focusThread, visible]);

  /* ---- capture modes ---- */
  const enterMode = useCallback((m: 'pin' | 'region' | 'idle') => {
    setMode(m);
    setComposer(null);
    setActiveThread(null);
    if (m === 'pin') document.body.classList.add('annota-cursor');
    else document.body.classList.remove('annota-cursor');
  }, []);

  const exitMode = useCallback(() => {
    setMode('idle');
    setHoverBox(null);
    setDragRect(null);
    dragStart.current = null;
    document.body.classList.remove('annota-cursor');
  }, []);

  useEffect(() => {
    if (mode === 'idle') return undefined;

    const skipOverlay = (el: Element | null): HTMLElement | null => {
      if (!el) return null;
      if (el.closest('[data-annota-overlay]')) return null;
      return el as HTMLElement;
    };

    const onClick = (e: MouseEvent) => {
      if (mode !== 'pin') return;
      e.preventDefault();
      e.stopPropagation();
      const el = skipOverlay(document.elementFromPoint(e.clientX, e.clientY));
      if (!el) return;
      const root = storyRoot();
      const anchor = captureAnchor(el, root);
      setComposer({
        x: e.clientX,
        y: e.clientY,
        target: { kind: 'pin', ...anchor },
        element: el,
      });
      exitMode();
    };

    const onMove = (e: MouseEvent) => {
      if (mode === 'pin') {
        const el = skipOverlay(document.elementFromPoint(e.clientX, e.clientY));
        if (el) {
          const r = el.getBoundingClientRect();
          setHoverBox({ x: r.left, y: r.top, w: r.width, h: r.height });
        } else setHoverBox(null);
      } else if (mode === 'region' && dragStart.current) {
        const s = dragStart.current;
        const x = Math.min(s.x, e.clientX);
        const y = Math.min(s.y, e.clientY);
        setDragRect({ x, y, w: Math.abs(e.clientX - s.x), h: Math.abs(e.clientY - s.y) });
      }
    };

    const onDown = (e: MouseEvent) => {
      if (mode !== 'region') return;
      if ((e.target as Element)?.closest?.('[data-annota-overlay]')) return;
      e.preventDefault();
      dragStart.current = { x: e.clientX, y: e.clientY };
    };

    const onUp = (e: MouseEvent) => {
      if (mode !== 'region' || !dragStart.current) return;
      const s = dragStart.current;
      const rect = { x: Math.min(s.x, e.clientX), y: Math.min(s.y, e.clientY), w: Math.abs(e.clientX - s.x), h: Math.abs(e.clientY - s.y) };
      dragStart.current = null;
      setDragRect(null);
      if (rect.w < 8 || rect.h < 8) return;
      const root = storyRoot();
      const rootRect = root.getBoundingClientRect();
      const target: ThreadTarget = {
        kind: 'region',
        selector: { fragment: { x: Math.round(rect.x - rootRect.left), y: Math.round(rect.y - rootRect.top), w: Math.round(rect.w), h: Math.round(rect.h) } },
        context: { tag: 'region' },
        bbox: { x: Math.round(rect.x - rootRect.left), y: Math.round(rect.y - rootRect.top), w: Math.round(rect.w), h: Math.round(rect.h) },
        captureViewportWidth: Math.round(rootRect.width),
      };
      setComposer({ x: rect.x + rect.w / 2, y: rect.y + 8, target, element: null });
      exitMode();
    };

    document.addEventListener('click', onClick, { capture: true });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mousedown', onDown, { capture: true });
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('click', onClick, { capture: true });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mousedown', onDown, { capture: true });
      document.removeEventListener('mouseup', onUp);
    };
  }, [mode, exitMode]);

  /* ---- keyboard (single-key by default, alt+key always available) ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }
      if (hotkeys === false) {
        if (e.key === 'Escape') {
          if (mode !== 'idle') exitMode();
          else if (composer) setComposer(null);
        }
        return;
      }
      const altOf = (spec: HotkeySpec): boolean => hotkeyMatches(e, spec) || (e.altKey && e.key.toLowerCase() === spec.key && !spec.alt);
      if (hotkeyMatches(e, hkHelp)) {
        setHelpOpen((h) => !h);
        return;
      }
      if (e.key.toLowerCase() === 'escape') {
        if (mode !== 'idle') exitMode();
        else if (composer) setComposer(null);
        else if (activeThread) setActiveThread(null);
        else if (drawerOpen) setDrawerOpen(false);
        else if (helpOpen) setHelpOpen(false);
        return;
      }
      if (altOf(hkPin)) {
        if (!composer && !activeThread) enterMode(mode === 'pin' ? 'idle' : 'pin');
      } else if (altOf(hkRegion)) {
        if (!composer && !activeThread) enterMode(mode === 'region' ? 'idle' : 'region');
      } else if (altOf(hkLayer)) {
        setVisible((v) => !v);
      } else if (altOf(hkDrawer)) {
        setDrawerOpen((d) => !d);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode, composer, activeThread, drawerOpen, helpOpen, enterMode, exitMode, hkPin, hkRegion, hkLayer, hkDrawer, hkHelp, hotkeys]);

  /* ---- mutations ---- */
  const submitThread = useCallback(
    async (body: string) => {
      if (!composer) return;
      setBusy(true);
      try {
        const component = composer.target.kind === 'pin' && composer.element
          ? inspectComponent(composer.element)
          : null;
        const story = await buildStoryRef(storyId, { title, name });
        const comment: Comment = { id: uid('c'), author: getAuthor(), body, createdAt: new Date().toISOString() };
        const created = await createThread({
          storyId,
          story,
          component,
          target: composer.target,
          comments: [comment],
        });
        setComposer(null);
        // optimistic echo: the pin renders immediately from the server response;
        // refresh() below is just reconciliation (broadcast may also trigger it).
        setThreads((prev) => [created, ...prev.filter((t) => t.id !== created.id)]);
        void refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [composer, storyId, title, name, refresh],
  );

  const reply = useCallback(
    async (thread: Thread, body: string): Promise<boolean> => {
      if (!body.trim()) return false;
      setBusy(true);
      try {
        const updated = await addComment(thread.id, body, getAuthor());
        setThreads((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        void refresh();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return false; // caller keeps the draft — failed replies must not vanish
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const toggleResolve = useCallback(
    async (thread: Thread) => {
      setBusy(true);
      try {
        const next: Thread = {
          ...thread,
          status: thread.status === 'open' ? 'resolved' : 'open',
          resolvedAt: thread.status === 'open' ? new Date().toISOString() : undefined,
        };
        const updated = await patchThread(next);
        setThreads((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        void refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  /* ---- pin positions (recomputed each render via tick; clamped to viewport) ---- */
  const pinViews = useMemo(() => {
    void tick;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const out: Array<{
      thread: Thread;
      fixed: { x: number; y: number; w: number; h: number };
      status: ResolvedPin['status'];
    }> = [];
    for (const t of threads) {
      const pin = anchors.get(t.id) ?? { el: null, status: 'orphan' as const, strategy: 'none' as const };
      if (t.target.kind === 'region') {
        const rootRect = storyRoot().getBoundingClientRect();
        const f = t.target.selector.fragment ?? t.target.bbox;
        out.push({
          thread: t,
          fixed: { x: rootRect.left + f.x, y: rootRect.top + f.y, w: f.w, h: f.h },
          status: 'resolved',
        });
        continue;
      }
      if (pin.el) {
        const r = pin.el.getBoundingClientRect();
        out.push({ thread: t, fixed: { x: r.left, y: r.top, w: r.width, h: r.height }, status: pin.status });
      } else {
        // orphan: fall back to stored fragment (root-relative)
        const rootRect = storyRoot().getBoundingClientRect();
        const f = t.target.selector.fragment ?? t.target.bbox;
        out.push({ thread: t, fixed: { x: rootRect.left + f.x, y: rootRect.top + f.y, w: f.w, h: f.h }, status: 'orphan' });
      }
    }
    void vw;
    void vh;
    return out;
  }, [threads, anchors, tick]);

  /* ---- render ---- */
  if (apiOk === false) {
    return (
      <div data-annota-overlay="1" className="annota-root">
        <div className="annota-launcher" title="Annotakit requires `storybook dev` (the review API lives on the dev server)">
          📌 Annotakit — dev only
        </div>
      </div>
    );
  }

  const openCount = threads.filter((t) => t.status === 'open').length;
  const activeT = threads.find((t) => t.id === activeThread) ?? null;

  return (
    <div data-annota-overlay="1" className="annota-root">
      {/* pins + regions */}
      {visible &&
        pinViews.map(({ thread, fixed, status }) =>
          thread.target.kind === 'region' ? (
            <div
              key={thread.id}
              className={`annota-region${thread.status === 'resolved' ? ' is-resolved' : ''}${thread.id === activeThread ? ' is-active' : ''}`}
              style={{ left: clamp(fixed.x, 0, Math.max(window.innerWidth - fixed.w, 0)), top: clamp(fixed.y, 0, Math.max(window.innerHeight - fixed.h, 0)), width: fixed.w, height: fixed.h }}
              onClick={() => setActiveThread(thread.id)}
              title={`#${thread.number}`}
            >
              <span className="annota-region-tag">#{thread.number}</span>
            </div>
          ) : (
            <div
              key={thread.id}
              className={[
                'annota-pin',
                thread.status === 'resolved' ? 'is-resolved' : '',
                status === 'orphan' ? 'is-orphan' : '',
                thread.id === activeThread ? 'is-active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                left: clamp(fixed.x - 4, 2, Math.max(window.innerWidth - 26, 2)),
                top: clamp(fixed.y - 26, 2, Math.max(window.innerHeight - 26, 2)),
              }}
              onClick={() => setActiveThread(thread.id)}
              title={`#${thread.number}${status === 'orphan' ? ' (orphaned — element not found)' : ''}`}
            >
              {thread.number}
            </div>
          ),
        )}

      {/* capture affordances */}
      {mode !== 'idle' && (
        <div className="annota-capture-hint">
          {mode === 'pin' ? 'Click the element to pin · Esc cancels' : 'Drag to mark a region · Esc cancels'}
        </div>
      )}
      {hoverBox && <div className="annota-hover-box" style={{ left: hoverBox.x, top: hoverBox.y, width: hoverBox.w, height: hoverBox.h }} />}
      {dragRect && <div className="annota-drag-rect" style={{ left: dragRect.x, top: dragRect.y, width: dragRect.w, height: dragRect.h }} />}

      {/* transient error surface (never silent) */}
      {error && !composer && (
        <div className="annota-toast is-error" role="alert">
          {error}
          <button className="annota-btn is-small" onClick={() => setError(null)}>
            ✕
          </button>
        </div>
      )}

      {/* composer */}
      {composer && (
        <ComposerCard
          x={composer.x}
          y={composer.y}
          busy={busy}
          error={error}
          component={
            composer.target.kind === 'pin' && composer.element ? inspectComponent(composer.element) : null
          }
          context={composer.target.context}
          onSubmit={submitThread}
          onCancel={() => setComposer(null)}
        />
      )}

      {/* thread popover */}
      {activeT && !composer && (
        <ThreadCard
          thread={activeT}
          pin={pinViews.find((p) => p.thread.id === activeT.id) ?? null}
          busy={busy}
          error={error}
          onReply={reply}
          onToggleResolve={toggleResolve}
          onClose={() => setActiveThread(null)}
        />
      )}

      {/* drawer */}
      {drawerOpen && !composer && (
        <DrawerCard
          threads={threads}
          anchors={anchors}
          activeThread={activeThread}
          busy={busy}
          hotkeys={hk}
          onSelect={(id) => focusThread(id)}
          onToggleResolve={toggleResolve}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {/* help */}
      {helpOpen && <HelpCard hotkeys={hk} onClose={() => setHelpOpen(false)} />}

      {/* launcher */}
      <div className="annota-launcher" onClick={() => setDrawerOpen((d) => !d)} title="Annotakit — review layer">
        📌 Annotakit
        <span className={`annota-count${openCount ? ' is-open' : threads.length ? ' is-zero' : ''}`}>
          {threads.length ? `${openCount}/${threads.length}` : '0'}
        </span>
      </div>
    </div>
  );
}

/* ---------------------------- viewport clamping ------------------------------- */

/**
 * Keeps a fixed-position card fully inside the iframe viewport using its
 * MEASURED size (bug fix: hardcoded guesses produced off-screen cards when the
 * canvas is small — Storybook's left panel + docks shrink the iframe).
 */
function useClampedPosition(x: number, y: number): { ref: React.RefObject<HTMLDivElement | null>; style: React.CSSProperties } {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<React.CSSProperties>({ left: x, top: y });

  const apply = useCallback(() => {
    const el = ref.current;
    const w = el?.offsetWidth ?? 340;
    const h = el?.offsetHeight ?? 260;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setPos({
      left: clamp(x - w / 2, 8, Math.max(vw - w - 8, 8)),
      top: clamp(y - 40, 8, Math.max(vh - h - 8, 8)),
    });
  }, [x, y]);

  useLayoutEffect(() => {
    apply();
  }, [apply]);

  useEffect(() => {
    const onResize = () => apply();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [apply]);

  return { ref, style: pos };
}

/* ------------------------------- sub components ------------------------------- */

function ComposerCard(props: {
  x: number;
  y: number;
  busy: boolean;
  error: string | null;
  component: ReturnType<typeof inspectComponent>;
  context: { tag: string; text?: string; ariaLabel?: string };
  onSubmit: (body: string) => void;
  onCancel: () => void;
}): React.ReactElement {
  const [body, setBody] = React.useState('');
  const { ref, style } = useClampedPosition(props.x, props.y);
  return (
    <div ref={ref} className="annota-card annota-composer" style={style}>
      <div className="annota-card-header">
        <span className="annota-grow">New comment</span>
        <span className="annota-chip is-meta">&lt;{props.context.tag}&gt;</span>
      </div>
      <div className="annota-meta-rows">
        <div>
          <b>element:</b> {props.context.text?.slice(0, 60) ?? props.context.ariaLabel ?? '(no text)'}
        </div>
        {props.component?.name && (
          <div>
            <b>component:</b> {props.component.name}
          </div>
        )}
        {props.component?.source && (
          <div>
            <b>jsx:</b> {props.component.source.file}
            {props.component.source.line ? `:${props.component.source.line}` : ''}
          </div>
        )}
      </div>
      {props.error && <div className="annota-status-banner is-error">{props.error}</div>}
      <div style={{ padding: '10px 12px' }}>
        <textarea
          className="annota-textarea"
          autoFocus
          placeholder="What's wrong here? (⌘/Ctrl+Enter to pin)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && body.trim()) {
              e.preventDefault();
              props.onSubmit(body);
            }
          }}
        />
      </div>
      <div className="annota-reply-row">
        <span style={{ flex: 1 }} />
        <button className="annota-btn" onClick={props.onCancel}>
          Cancel
        </button>
        <button className="annota-btn is-primary" disabled={!body.trim() || props.busy} onClick={() => props.onSubmit(body)}>
          Pin it
        </button>
      </div>
    </div>
  );
}

function ThreadCard(props: {
  thread: Thread;
  pin: { fixed: { x: number; y: number } } | null;
  busy: boolean;
  error: string | null;
  onReply: (t: Thread, body: string) => Promise<boolean>;
  onToggleResolve: (t: Thread) => void;
  onClose: () => void;
}): React.ReactElement {
  const [replyBody, setReplyBody] = React.useState('');
  const t = props.thread;
  const near = props.pin?.fixed;
  const { ref, style } = useClampedPosition(near ? near.x + (near.x > window.innerWidth / 2 ? -120 : 120) : 40, near ? near.y : 60);
  const comp = t.component;
  return (
    <div ref={ref} className="annota-card" style={style}>
      <div className="annota-card-header">
        <span className="annota-grow">
          #{t.number} {t.status === 'open' ? '' : '(resolved)'}
        </span>
        {t.gh?.url && (
          <a
            className="annota-chip is-gh"
            href={t.gh.url}
            target="_blank"
            rel="noreferrer"
            title={`GitHub issue #${t.gh.issue} — lifecycle + replies mirror both ways`}
          >
            ⤴ #{t.gh.issue}
          </a>
        )}
        {comp?.name && <span className="annota-chip is-component">{comp.name}</span>}
        <button className="annota-btn is-small" onClick={props.onClose}>
          ✕
        </button>
      </div>
      <div className="annota-meta-rows">
        {t.story.importPath && (
          <div>
            <b>story:</b> {t.story.title}/{t.story.name} — {t.story.importPath}
          </div>
        )}
        {comp?.source && (
          <div>
            <b>jsx:</b> {comp.source.file}
            {comp.source.line ? `:${comp.source.line}` : ''}
          </div>
        )}
        {comp && comp.chain?.length > 1 && (
          <div>
            <b>chain:</b> {comp.chain.slice(0, 5).join(' > ')}
          </div>
        )}
        {t.target.selector.cssSelector && (
          <div>
            <b>selector:</b> {t.target.selector.cssSelector}
          </div>
        )}
      </div>
      {t.comments.map((c) => (
        <div key={c.id} className="annota-comment">
          <div className="annota-comment-head">
            <b>
              {c.author}
              {c.source === 'github' ? ' · from GitHub' : ''}
            </b>
            <span>{c.createdAt.slice(0, 16).replace('T', ' ')}</span>
          </div>
          <p>{c.body}</p>
        </div>
      ))}
      {props.error && <div className="annota-status-banner is-error">{props.error}</div>}
      <div className="annota-reply-row">
        <input
          className="annota-input"
          placeholder="Reply…"
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && replyBody.trim() && !props.busy) {
              // clear ONLY on success — a failed reply must not eat the draft
              void props.onReply(t, replyBody).then((ok) => {
                if (ok) setReplyBody('');
              });
            }
          }}
        />
        <button
          className={`annota-btn ${t.status === 'open' ? 'is-ok' : 'is-danger'}`}
          disabled={props.busy}
          onClick={() => props.onToggleResolve(t)}
        >
          {t.status === 'open' ? 'Resolve' : 'Reopen'}
        </button>
      </div>
    </div>
  );
}

function DrawerCard(props: {
  threads: Thread[];
  anchors: Map<string, ResolvedPin>;
  activeThread: string | null;
  busy: boolean;
  hotkeys: Hotkeys;
  onSelect: (id: string) => void;
  onToggleResolve: (t: Thread) => void;
  onClose: () => void;
}): React.ReactElement {
  const [filter, setFilter] = useState<'open' | 'all'>('all');
  const shown = props.threads.filter((t) => (filter === 'all' ? true : t.status === 'open'));
  return (
    <div className="annota-card annota-drawer">
      <div className="annota-card-header">
        <span className="annota-grow">
          Threads — this story ({props.threads.filter((t) => t.status === 'open').length} open)
        </span>
        <button
          className={`annota-btn is-small${filter === 'open' ? ' is-primary' : ''}`}
          onClick={() => setFilter((f) => (f === 'open' ? 'all' : 'open'))}
          title="Show only open threads"
        >
          {filter === 'open' ? 'open only' : 'all'}
        </button>
        <button className="annota-btn is-small" onClick={props.onClose}>
          ✕
        </button>
      </div>
      {props.threads.length === 0 && (
        <div className="annota-status-banner is-info">
          No threads yet. Press <b>{props.hotkeys.pin.toUpperCase()}</b> and click an element (or{' '}
          <b>{props.hotkeys.region.toUpperCase()}</b> to drag a region).
        </div>
      )}
      {props.threads.length > 0 && shown.length === 0 && (
        <div className="annota-status-banner is-info">All threads resolved 🎉 (showing “open only”).</div>
      )}
      {shown.map((t) => {
        const status = props.anchors.get(t.id)?.status ?? 'orphan';
        return (
          <div
            key={t.id}
            className={`annota-thread-row${t.id === props.activeThread ? ' is-active' : ''}${t.status === 'resolved' ? ' is-resolved' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={`Thread #${t.number} — ${t.status === 'open' ? 'open' : 'resolved'} — ${t.comments[0]?.body?.split('\n')[0]?.slice(0, 60) ?? '(no text)'}`}
            onClick={() => props.onSelect(t.id)}
            onKeyDown={(e) => {
              /* keyboard parity (R13 review) — mirror of the manager card fix */
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                props.onSelect(t.id);
              }
            }}
          >
            <div className="annota-thread-title">
              <span className={`annota-dot${t.status === 'resolved' ? ' is-resolved' : status === 'orphan' ? ' is-orphan' : ''}`} />
              #{t.number} {t.comments[0]?.body?.split('\n')[0]?.slice(0, 60) ?? '(no text)'}
            </div>
            <div className="annota-thread-sub">
              {t.component?.name ? `${t.component.name} · ` : ''}
              {t.comments.length - 1 > 0 ? `${t.comments.length - 1} replies · ` : ''}
              {t.author} · {t.createdAt.slice(0, 10)}
            </div>
            <div style={{ marginTop: 4 }}>
              <button
                className={`annota-btn is-small ${t.status === 'open' ? 'is-ok' : 'is-danger'}`}
                disabled={props.busy}
                onClick={(e) => {
                  e.stopPropagation();
                  props.onToggleResolve(t);
                }}
              >
                {t.status === 'open' ? 'Resolve' : 'Reopen'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HelpCard(props: { hotkeys: Hotkeys; onClose: () => void }): React.ReactElement {
  const k = (spec: string): string => {
    const s = parseHotkey(spec, spec);
    return s.key === '?' ? '?' : s.key.toUpperCase();
  };
  return (
    <div className="annota-card annota-help">
      <div className="annota-card-header">
        <span className="annota-grow">Annotakit shortcuts</span>
        <button className="annota-btn is-small" onClick={props.onClose}>
          ✕
        </button>
      </div>
      <table>
        <tbody>
          <tr><td><span className="annota-kbd">{k(props.hotkeys.pin)}</span></td><td>pin an element (click it)</td></tr>
          <tr><td><span className="annota-kbd">{k(props.hotkeys.region)}</span></td><td>mark a region (drag)</td></tr>
          <tr><td><span className="annota-kbd">{k(props.hotkeys.layer)}</span></td><td>show / hide pins</td></tr>
          <tr><td><span className="annota-kbd">{k(props.hotkeys.drawer)}</span></td><td>threads drawer</td></tr>
          <tr><td><span className="annota-kbd">Esc</span></td><td>cancel / close</td></tr>
          <tr><td><span className="annota-kbd">⌘/Ctrl+↵</span></td><td>submit comment</td></tr>
        </tbody>
      </table>
      <div style={{ padding: '0 12px 10px', fontSize: 11, color: '#64748b' }}>
        Every shortcut also works with <b>Alt/⌥ held</b> (useful when a story listens for the plain key). Customize via{' '}
        <code>parameters.annotakit.hotkeys</code> in the story file. Threads persist in the Storybook dev
        server's embedded store — export from the Annotakit panel (bottom dock).
      </div>
    </div>
  );
}

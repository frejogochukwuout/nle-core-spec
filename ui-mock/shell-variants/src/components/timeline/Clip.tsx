/* Clip — spec 05 §7.3 anatomy: position:absolute, timeToPx geometry,
   filmstrip / waveform / label children, trim handles (12px hit), fade
   triangles (§9), linked badge. Two render modes:
   filmstrip (spec 05 canonical) | blocks (davinci mock compact).
   Selected = accent outline + tint; locked = stripes (legible, not faded);
   drag = optimistic preview + live TC bubble; commit on release (18 §5).
   R15 T2 gesture discipline (canonical §5): pointerdown arms a PENDING
   gesture; the preview/commit machinery engages only past the strict 5px
   threshold (either axis); release back within 5px = drag-back cancel;
   buttons-mask-0 moves and pointercancel cancel; lastGestureWasDrag
   swallows the follow-up click after a completed drag. Right-click does
   NOT stopPropagation — the Timeline scroll surface routes the menu. */

import { useEffect, useRef, useState } from 'react';
import { Link2 } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { useVariantClipStyle } from '../../state/variantHooks';
import { mediaById, findElement, EFFECT_DEFS, TRANSITION_PRESENTATIONS, type ElementJSON, type TrackJSON } from '../../lib/mockData';
import { snapToFrame, tc } from '../../lib/timecode';
import { DRAG_THRESHOLD_PX } from '../../lib/pixel';
import { resolveGroupMove, toCreateTrackPlans, dragRejectionToast } from '../../lib/timelinePlacement';
import { getWaveform } from '../../lib/waveform';
import { ContextMenu, isMenuKey, useContextMenu, type MenuItem } from '../shell/ContextMenu';
import { useConfirm, type ConfirmFn } from '../shell/ConfirmDialog';

interface ClipProps {
  el: ElementJSON;
  track: TrackJSON;
  pxPerSec: number;
  laneHeight: number;
  snapTargets: number[];
  /* R15 T3 cross-track drag seam: while a MOVE drag is active the Clip
     reports pointer geometry upward (the Timeline owns lane layout + the
     drop-target resolution) and defers the release commit to the host.
     Without a host (isolated mounts — the Clip test harness) the Clip
     commits through the same pure resolveGroupMove against its own lane. */
  dragHost?: ClipDragHost;
  /** the host suppresses the clip's own optimistic preview while the drag is
   *  cross-track engaged — the ghost at the resolved target replaces it. */
  previewSuppressed?: boolean;
}

/* R15 T3: the drag-geometry contract the Clip emits on every ACTIVE move
   (and once at activation). `previewStart` is the anchor's frame-snapped
   preview time; the host resolves the drop target from pointer position. */
export interface ClipDragEvent {
  anchorId: string;
  phase: 'start' | 'move' | 'end';
  pointerId: number;
  clientX: number;
  clientY: number;
  startX: number;
  startY: number;
  previewStart: number;
  alt: boolean;
  cancelled: boolean; // end only — Esc / buttons-mask / pointercancel / drag-back
  commit: boolean;    // end only — release past threshold, not cancelled
}
export type ClipDragHost = (e: ClipDragEvent) => void;

/* R15 T2 canonical gesture discipline: every move/trim gesture starts
   `pending` — pointerdown does NOT enter drag mode. The optimistic-preview
   machinery (geometry, TC bubble, alt ghost) engages only when the pointer
   moves STRICTLY more than DRAG_THRESHOLD_PX (5px, either axis) from the
   gesture origin. A release under threshold is a plain click (onClick
   carries select semantics); a release back within 5px after activation is
   a drag-back CANCEL (no store write, no history); a pointermove with
   (buttons & 1) === 0 mid-gesture cancels it (left button released
   off-window — capture still delivers the move). */
type DragState = {
  phase: 'pending' | 'active';
  mode: 'move' | 'l' | 'r';
  pointerId: number;
  startX: number; // gesture origin (screen px) — threshold + drag-back math
  startY: number;
  origStart: number;
  origDur: number;
  cur: number;
  alt: boolean;
} | null;

/* effects-rail drag payload type (HTML5 DnD): the AppShell effects rail
   drags rows as application/x-nle-effect JSON {name, cat} (cat: 'Blur' |
   'Stylize' | 'Transition') — the twin of MediaPool's POOL_DRAG_TYPE. */
export const EFFECT_DRAG_TYPE = 'application/x-nle-effect';

/* nominal effect-param defaults — INSPECTOR TWIN: mockData's EFFECT_DEFS
   carries no default column (spec 07's registry does; Inspector.tsx:64-77
   keeps the same map module-private — shell/ is another agent's surface, so
   the drop path inlines the identical values/rule: param default =
   PARAM_DEFAULTS[key] ?? param.min). */
const PARAM_DEFAULTS: Record<string, number> = { radius: 12, length: 24, angle: 0, amount: 50, feather: 50, intensity: 50, offset: 5 };
const defaultsFor = (def: (typeof EFFECT_DEFS)[number]): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const p of def.params) out[p.key] = PARAM_DEFAULTS[p.key] ?? p.min;
  return out;
};

/* ---------- §4.9 clip menu builder (shared surface).
   R15 T2 context-menu routing: the clip no longer owns an onContextMenu
   handler (that pattern stopPropagation'd, breaking the canonical
   right-click law). ONE handler on the Timeline scroll surface routes
   bubbling contextmenu events: clip under cursor → THIS menu (after
   select-if-unselected), else the empty-lane menu. The clip keeps the
   keyboard route (Shift+F10 / ContextMenu key) and calls the same builder.
   Multi-select: right-clicking a selected element makes the WHOLE
   selection the command target; an unselected clip targets itself (the
   router selects it first, so targets end up selection-wide either way).
   All store reads are LIVE (useUi.getState()) — the builder runs at open
   time, after the router's selection write. */
export function buildClipMenuItems(el: ElementJSON, track: TrackJSON, confirm: ConfirmFn): MenuItem[] {
  const targets = useUi.getState().selection.includes(el.id)
    ? useUi.getState().selection
    : [el.id];
  const deleteSelected = (ripple: boolean) => {
    const run = () => {
      useUi.getState().deleteElements(targets, ripple);
      useUi.getState().pushToast({
        kind: 'info',
        title: `Deleted ${targets.length} clip${targets.length === 1 ? '' : 's'}${ripple ? ' — ripple' : ''}`,
        detail: ripple ? 'Later clips shifted left' : 'Delete leaves a gap — ⇧⌫ ripples (spec 16 C8)',
      });
    };
    // §6.4: multi-delete ≥ 5 elements confirms first
    if (targets.length >= 5) {
      confirm({
        title: `Delete ${targets.length} clips?`,
        body: `${targets.length} selected elements will be removed from the timeline. Undo can restore them.`,
        confirmLabel: 'Delete',
        danger: true,
        onConfirm: run,
      });
    } else run();
  };
  const focusInspector = () => {
    const s = useUi.getState();
    if (s.page !== 'edit') s.setPage('edit');
    if (!s.panels.inspector) s.togglePanel('inspector');
    s.setInspectorTab('video');
    // focus call: the panel root is not focusable — focus its F6 region wrapper
    requestAnimationFrame(() => {
      const root = document.querySelector('[data-testid="shell-inspector"]');
      (root?.closest('.shell-region') as HTMLElement | null)?.focus();
    });
  };
  return [
    /* §4.9 clip-menu enumeration — Cut/Copy/Paste are honest disabled rows
       (the mock has no clipboard model); the real commands live below. */
    { id: 'cut', label: 'Cut', shortcut: '⌘X', disabled: true, tip: 'mock: no clipboard — Delete + ⌘D instead' },
    { id: 'copy', label: 'Copy', shortcut: '⌘C', disabled: true, tip: 'mock: no clipboard — ⌘D duplicates in place' },
    { id: 'paste', label: 'Paste', shortcut: '⌘V', disabled: true, tip: 'mock: no clipboard (timeline toolbar carries the same disabled row)' },
    { id: 'open-in-viewer', label: 'Open in viewer', sep: true, onSelect: () => useUi.getState().pushToast({ kind: 'info', title: 'Open in viewer', detail: `mock: v1.1 source preview is the §4.3 plain-<video> fallback (not built here; dual viewer = §8.5 v2) — dbl-click a pool card reveals instead (§4.2) — ${el.name}` }) },
    { id: 'split', label: 'Split at playhead', shortcut: '⌘B', onSelect: () => {
      const t = useUi.getState().playhead;
      // fan-out; real shell sends ONE batched split command (spec 15 §7)
      targets.forEach((id) => useUi.getState().splitElement(id, t));
    } },
    { id: 'duplicate', label: 'Duplicate', shortcut: '⌘D', onSelect: () => useUi.getState().duplicateElements(targets) },
    { id: 'remove-effects', label: 'Remove Effects', disabled: targets.length === 0 || !targets.some((id) => (findElement(useUi.getState().scenes, id)?.element.effects?.length ?? 0) > 0), tip: 'clears the effect stack of every selected clip', sep: true, onSelect: () => {
      targets.forEach((id) => useUi.getState().setElementField(id, { effects: [] }));
    } },
    { id: 'add-transition', label: 'Add Transition…', onSelect: () => {
      // default crossfade (spec 09 TransitionJSON) per selected clip
      targets.forEach((id) => useUi.getState().setTransition(id, {}));
    } },
    { id: 'rename', label: 'Rename', disabled: true, tip: 'mock: name edits live in the Inspector (Properties →)' },
    { id: 'reveal', label: 'Reveal in Media Pool', disabled: !el.mediaId, tip: el.mediaId ? `selects ${el.mediaId} in the pool` : 'text clips have no media asset', onSelect: () => {
      if (!el.mediaId) return;
      const s = useUi.getState();
      s.setMediaSelection([el.mediaId!]);
      if (!s.panels.mediaPool) s.togglePanel('mediaPool');
      requestAnimationFrame(() => {
        const pool = document.querySelector('[data-testid="shell-mediapool"]');
        (pool?.closest('.shell-region') as HTMLElement | null)?.focus();
      });
    } },
    { id: 'delete', label: 'Delete', shortcut: '⌫', danger: true, sep: true, onSelect: () => deleteSelected(false) },
    { id: 'ripple-delete', label: 'Ripple delete', shortcut: '⇧⌫', danger: true, onSelect: () => deleteSelected(true) },
    { id: 'detach-audio', label: 'Detach audio', disabled: true, tip: 'mock: not in spec 15 union', sep: true },
    { id: 'properties', label: 'Properties', onSelect: focusInspector },
    { id: 'mix-track', label: 'Mix this track…', sep: true, onSelect: () => {
      useUi.getState().enterAudioFocus('escalation', track.id);
    } },
  ];
}

export function Clip({ el, track, pxPerSec, laneHeight, snapTargets, dragHost, previewSuppressed }: ClipProps) {
  const clipStyle = useVariantClipStyle();
  const tool = useUi((s) => s.tool);
  const selection = useUi((s) => s.selection);
  const selectElement = useUi((s) => s.selectElement);
  const splitElement = useUi((s) => s.splitElement);
  const trimElement = useUi((s) => s.trimElement);
  const pushToast = useUi((s) => s.pushToast);
  const snap = useUi((s) => s.snap);
  const menu = useContextMenu();   // §4.9 clip menu (right-click + Shift+F10)
  const confirm = useConfirm();    // §6.4 multi-delete ≥ 5 confirmation

  const [drag, setDrag] = useState<DragState>(null);
  const [hover, setHover] = useState(false);
  const [fxHover, setFxHover] = useState(false); // effects-rail drag over THIS clip (R14)
  const ref = useRef<HTMLDivElement>(null);
  const dragCancelled = useRef(false); // Esc during a gesture → drop dispatches nothing
  /* R15 T3: the last ClipDragEvent sent to the host (start/move). Every
     termination path (release, drag-back, Esc, buttons-mask, pointercancel)
     flushes an 'end' from it — the host drops its preview, stops the
     auto-scroll rAF and (on commit) performs the resolved store writes. */
  const dragGeoRef = useRef<ClipDragEvent | null>(null);
  /* canonical §5: set when a gesture crossed the 5px threshold and ENDED as a
     drag; survives pointerup so the browser's synthesized follow-up click
     never re-toggles/re-selects. Drag-back-cancel and Esc-cancel clear it
     (canonical cancel() / mouseup-within-threshold paths). Reset on the NEXT
     pointerdown and consumed by the first click. (Replaces the old
     suppressClick ref, which only covered alt-drop + Esc.) */
  const lastGestureWasDrag = useRef(false);
  const dragOn = drag !== null;
  const dragActive = drag?.phase === 'active';

  /* Escape cancels an active gesture — pending OR past-threshold (the R15 T2
     escape ladder's first rung, before the shell Esc cascade). Canonical
     cancel() clears lastGestureWasDrag, so the trailing click may select.
     Capture-phase + stopPropagation so the shell Esc cascade (tool →
     deselect) doesn't also fire while a gesture is in flight. */
  useEffect(() => {
    if (!dragOn) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      dragCancelled.current = true;
      lastGestureWasDrag.current = false; // canonical cancel() semantics
      notifyHostEnd(true, false);
      setDrag(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [dragOn]);

  const selected = selection.includes(el.id);
  const locked = track.locked;
  const media = mediaById(el.mediaId);
  const isAudio = el.type === 'audio';
  const isText = el.type === 'text';

  /* ---- R15 T3 drag-host seam helpers (stable via refs; the Timeline's host
     callback is identity-stable) ---- */
  const hostRef = useRef(dragHost);
  hostRef.current = dragHost;
  const notifyHostMove = (e: React.PointerEvent, d: NonNullable<DragState>, phase: 'start' | 'move') => {
    if (!hostRef.current || d.mode !== 'move') return;
    const evt: ClipDragEvent = {
      anchorId: el.id,
      phase,
      pointerId: d.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      startX: d.startX,
      startY: d.startY,
      previewStart: d.cur,
      alt: d.alt,
      cancelled: false,
      commit: false,
    };
    dragGeoRef.current = evt;
    hostRef.current(evt);
  };
  const notifyHostEnd = (cancelled: boolean, commit: boolean, e?: { clientX: number; clientY: number }) => {
    const geo = dragGeoRef.current;
    dragGeoRef.current = null;
    if (!hostRef.current || !geo) return;
    hostRef.current({
      ...geo,
      phase: 'end',
      cancelled,
      commit,
      clientX: e?.clientX ?? geo.clientX,
      clientY: e?.clientY ?? geo.clientY,
    });
  };
  /* HOSTLESS fallback (isolated Clip mounts): the Clip commits the gesture
     itself through the SAME pure resolveGroupMove — group = selection when
     the anchor is selected, else the anchor alone (canonical drag group). */
  const commitMoveLocally = (previewStart: number, alt: boolean) => {
    const s = useUi.getState();
    const scene = s.scenes.find((x) => x.id === s.activeSceneId);
    if (!scene) return;
    const groupIds = s.selection.includes(el.id) ? s.selection : [el.id];
    const res = resolveGroupMove(scene, el.id, { trackId: track.id }, previewStart, groupIds);
    if (!res.ok) {
      s.pushToast(dragRejectionToast(res.reason));
      return;
    }
    const createTracks = toCreateTrackPlans(scene, res.createTracks);
    if (alt) s.duplicateAndMove({ ids: groupIds, moves: res.moves, createTracks });
    else s.moveElements({ moves: res.moves, createTracks });
  };

  // live geometry (drag preview = optimistic DOM state, spec 18 §5). While a
  // cross-track drag is ENGAGED the host renders the ghost at the resolved
  // target — the clip itself falls back to its ORIGINAL position, faded.
  const geo = drag
    ? drag.mode === 'move'
      ? previewSuppressed
        ? { left: el.startTime * pxPerSec, width: el.duration * pxPerSec }
        : { left: drag.cur * pxPerSec, width: el.duration * pxPerSec }
      : drag.mode === 'l'
        ? { left: drag.cur * pxPerSec, width: (drag.origStart + drag.origDur - drag.cur) * pxPerSec }
        : { left: el.startTime * pxPerSec, width: (drag.cur - el.startTime) * pxPerSec }
    : { left: el.startTime * pxPerSec, width: el.duration * pxPerSec };

  const applySnap = (t: number, ignoreSelf: boolean): { t: number; snapped: boolean } => {
    const frameSnapped = snapToFrame(t);
    if (!snap) return { t: frameSnapped, snapped: false };
    const tolPx = 10 / pxPerSec; // 10px screen-space (spec 05 §9)
    let best = frameSnapped, bestD = tolPx, snapped = false;
    for (const target of snapTargets) {
      if (ignoreSelf && Math.abs(target - el.startTime) < 1e-6) continue;
      const d = Math.abs(target - t);
      if (d < bestD) { best = target; bestD = d; snapped = true; }
    }
    return { t: Math.max(0, best), snapped };
  };

  const onPointerDownBody = (e: React.PointerEvent) => {
    if (locked) return;
    if (tool === 'blade') return; // handled by click
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).focus(); // roving focus — Shift+F10 host (§4.9)
    dragCancelled.current = false;
    lastGestureWasDrag.current = false; // fresh gesture — canonical reset-on-pointerdown
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    // PENDING gesture: no drag mode yet — the 5px threshold gates activation
    setDrag({ phase: 'pending', mode: 'move', pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, origStart: el.startTime, origDur: el.duration, cur: el.startTime, alt: e.altKey });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    /* buttons-bitmask (canonical §5, belt-and-braces under pointer capture):
       a move with the left button released — the pointer left the window and
       came back, or the button was dropped off-window — cancels the gesture:
       preview discarded, nothing commits. */
    if ((e.buttons & 1) === 0) {
      dragCancelled.current = true; // the pointerup that follows must be a no-op
      lastGestureWasDrag.current = dragActive; // a real drag happened: swallow the stray click
      notifyHostEnd(true, false);
      setDrag(null);
      return;
    }
    const wasPending = drag.phase === 'pending';
    let d = drag;
    if (wasPending) {
      // strict > 5px on EITHER axis from the gesture origin → activate
      if (Math.abs(e.clientX - d.startX) <= DRAG_THRESHOLD_PX && Math.abs(e.clientY - d.startY) <= DRAG_THRESHOLD_PX) return;
      d = { ...d, phase: 'active' };
    }
    const dt = (e.clientX - d.startX) / pxPerSec;
    if (d.mode === 'move') {
      const { t } = applySnap(d.origStart + dt, false);
      const next = { ...d, cur: t, alt: e.altKey }; // Alt held? = duplicate gesture
      setDrag(next);
      // R15 T3: report the 2D geometry upward — the host owns lane layout,
      // drop-target resolution and the auto-scroll rAF. 'start' fires once
      // (activation) so the host can mint the new-track ids; the SAME event
      // then carries a 'move' so the preview resolves on the FIRST qualifying
      // move (a single-move drag must already show the drop target).
      if (wasPending) notifyHostMove(e, next, 'start');
      notifyHostMove(e, next, 'move');
    } else if (d.mode === 'l') {
      const { t } = applySnap(d.origStart + dt, false);
      const maxStart = d.origStart + d.origDur - 0.25;
      setDrag({ ...d, cur: Math.min(t, maxStart) });
    } else {
      const { t } = applySnap(d.origStart + d.origDur + dt, true);
      setDrag({ ...d, cur: Math.max(d.origStart + 0.25, t) });
    }
  };

  const onPointerUp = (e?: React.PointerEvent) => {
    if (!drag) {
      dragCancelled.current = false; // stale flag after an Esc-cancelled drag
      return;
    }
    if (dragCancelled.current) {
      // Esc / buttons-mask / pointercancel killed the gesture mid-flight:
      // restore the element, dispatch nothing
      dragCancelled.current = false;
      notifyHostEnd(true, false, e);
      setDrag(null);
      return;
    }
    if (drag.phase === 'pending') {
      // Under threshold on release = plain click — onClick carries the
      // semantics (select / blade-split). lastGestureWasDrag stays false.
      setDrag(null);
      return;
    }
    /* Drag-back-cancel (canonical §5): the drag ends with the pointer within
       5px of the gesture origin (BOTH axes) → CANCEL — no store write, no
       history entry, and lastGestureWasDrag stays false (the release is
       treated as a click). */
    if (e && Math.abs(e.clientX - drag.startX) <= DRAG_THRESHOLD_PX && Math.abs(e.clientY - drag.startY) <= DRAG_THRESHOLD_PX) {
      notifyHostEnd(true, false, e);
      setDrag(null);
      return;
    }
    // A real drag is completing — the follow-up click must not re-select
    lastGestureWasDrag.current = true;
    if (drag.mode === 'move') {
      if (dragHost) {
        // R15 T3: the HOST owns the commit — it resolves the drop target from
        // the release geometry and writes the (group) moves / alt duplicates.
        notifyHostEnd(false, true, e);
      } else {
        // hostless fallback: same laws, resolved against the anchor's own lane
        commitMoveLocally(drag.cur, drag.alt);
      }
    }
    if (drag.mode === 'l') trimElement(el.id, 'l', drag.cur, drag.origStart + drag.origDur - drag.cur);
    if (drag.mode === 'r') trimElement(el.id, 'r', el.startTime, drag.cur - el.startTime);
    setDrag(null);
  };

  /* pointercancel (touch interruption / alt-tab): same as Esc — discard the
     preview, commit nothing. Bubbles here from the trim handles too (their
     capture retargets the cancel event at the handle, which bubbles up). */
  const onPointerCancelGesture = () => {
    dragCancelled.current = true;
    lastGestureWasDrag.current = dragActive;
    notifyHostEnd(true, false);
    setDrag(null);
  };

  const onClick = (e: React.MouseEvent) => {
    if (lastGestureWasDrag.current) {
      // canonical §5: a completed drag persists past pointerup — the
      // browser-synthesized follow-up click must NOT re-toggle/re-select
      lastGestureWasDrag.current = false; // consumed
      return;
    }
    if (locked) return;
    if (tool === 'blade') {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const local = e.clientX - rect.left;
      const cutTime = el.startTime + local / pxPerSec;
      splitElement(el.id, cutTime);
      return;
    }
    selectElement(el.id, e.shiftKey || e.metaKey);
  };

  const cursor = locked ? 'not-allowed' : tool === 'blade' ? 'crosshair' : drag?.mode === 'move' ? 'grabbing' : 'move';

  /* §4.9 clip menu items for the keyboard route (Shift+F10 / ContextMenu
     key — the clip keeps this route; the POINTER right-click route is
     routed by the Timeline scroll surface, which calls the same builder). */
  const buildMenuItems = (): MenuItem[] => buildClipMenuItems(el, track, confirm);

  /* ---------- effects-rail drop target (R14 wiring): mirrors the Timeline
     lane pool-drop grammar — type guard, preventDefault, locked-track
     not-allowed cursor, ring feedback while an effect drag hovers. The
     clip's own move/trim gestures are POINTER events, so HTML5 DnD and the
     pointer grammar never collide; the lane's pool handlers ignore this
     drag type entirely. */
  const onEffectDrop = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(EFFECT_DRAG_TYPE)) return;
    e.preventDefault();
    setFxHover(false);
    if (locked) return; // locked-track guard: not-allowed, nothing commits
    let payload: { name: string; cat: string } | null = null;
    try { payload = JSON.parse(e.dataTransfer.getData(EFFECT_DRAG_TYPE) || 'null'); } catch { payload = null; }
    if (!payload || typeof payload.name !== 'string' || typeof payload.cat !== 'string') {
      pushToast({ kind: 'error', title: 'Effect drop failed', detail: 'unreadable drag payload from the effects rail (mock dataTransfer)' });
      return;
    }
    const { name, cat } = payload;
    if (cat === 'Transition') {
      const pres = TRANSITION_PRESENTATIONS.find((p) => p === name);
      if (!pres) {
        pushToast({ kind: 'info', title: 'Unknown transition', detail: `'${name}' is not in the mock's transition vocabulary (spec 09 §3.4 presentations)` });
        return;
      }
      /* Honest type mapping: the mock's TransitionJSON has ONE type —
         'crossfade' (spec 09 §3.4 mock slice). Every presentation (Dip to
         Black, Wipe Left, …) rides on it; the timeline's transition marker
         displays the presentation. No dip/wipe types exist to map to, so
         none are invented. */
      useUi.getState().setTransition(el.id, { presentation: pres });
      return;
    }
    const def = EFFECT_DEFS.find((d) => d.name === name);
    if (!def) {
      pushToast({ kind: 'info', title: 'Unknown effect', detail: `'${name}' is not in EFFECT_DEFS (the mock's effect registry)` });
      return;
    }
    useUi.getState().addEffectToElement(el.id, { name: def.name, enabled: true, params: defaultsFor(def) });
  };

  const fadeLeftW = (el.audioFadeIn ?? 0) * pxPerSec;
  const fadeRightW = (el.audioFadeOut ?? 0) * pxPerSec;

  const clipLabel = (color: string, align: 'left' | 'center' = 'left') => (
    <span
      className="pointer-events-none absolute bottom-0 left-0 right-0 truncate px-1.5 pb-[3px] font-medium"
      style={{ fontSize: 11, color, textAlign: align, textShadow: '0 1px 2px rgba(0,0,0,0.6)', lineHeight: 1.2 }}
    >
      {el.name}
      {el.speed && el.speed !== 1 && <span className="mono ml-1 opacity-70">{Math.round(el.speed * 100)}%</span>}
    </span>
  );

  /* ---------- clip body by mode/type ---------- */
  let body: React.ReactNode;
  if (clipStyle === 'blocks') {
    body = (
      <div
        className="flex h-full items-center overflow-hidden px-1.5"
        style={{
          background: isAudio ? 'linear-gradient(to bottom, var(--clip-audio-a), var(--clip-audio-b))' : isText ? 'var(--clip-text)' : 'var(--clip-video)',
          borderRight: `1px solid var(--clip-audio-edge)`,
        }}
      >
        {clipLabel(isAudio ? 'var(--clip-audio-label)' : 'var(--clip-label-text)')}
      </div>
    );
  } else if (isAudio) {
    const bars = getWaveform(el.id, Math.max(8, Math.floor(geo.width / 4)), { amplitude: 1 });
    const h = laneHeight - 12;
    body = (
      <div className="relative h-full w-full" style={{ background: 'linear-gradient(to bottom, var(--clip-audio-a), var(--clip-audio-b))' }}>
        <svg className="absolute inset-x-0 bottom-[2px]" width="100%" height={h} preserveAspectRatio="none" aria-hidden="true">
          {bars.map((b, i) => (
            <rect key={i} x={`${i * (100 / bars.length)}%`} y={h / 2 - b.max * (h / 2)} width={`${100 / bars.length - 0.4}%`} height={Math.max(1, (b.max + b.min) * (h / 2) * 0.5)} fill="var(--waveform)" opacity={0.9} />
          ))}
        </svg>
        {/* fade ramps — white lines + handle dots + soft fill (spec 05 §14.10) */}
        {fadeLeftW > 6 && (
          <svg className="pointer-events-none absolute inset-y-0 left-0" width={fadeLeftW} height="100%" aria-hidden="true">
            <line x1="1" y1="0" x2={fadeLeftW - 1} y2="100%" stroke="var(--fade-line)" strokeWidth="2" />
            <circle cx="3" cy="3" r="2.6" fill="var(--fade-line)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
          </svg>
        )}
        {fadeRightW > 6 && (
          <svg className="pointer-events-none absolute inset-y-0 right-0" width={fadeRightW} height="100%" aria-hidden="true">
            <line x1={fadeRightW - 2} y1="0" x2="1" y2="100%" stroke="var(--fade-line)" strokeWidth="2" />
            <circle cx={fadeRightW - 4} cy="3" r="2.6" fill="var(--fade-line)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
          </svg>
        )}
        {clipLabel('var(--clip-audio-label)')}
      </div>
    );
  } else if (isText) {
    body = (
      <div
        className="flex h-full items-center justify-center overflow-hidden"
        style={{ background: 'var(--clip-text)', borderRight: '1px solid rgba(0,0,0,0.25)' }}
      >
        {clipLabel('var(--clip-text-label)', 'center')}
      </div>
    );
  } else {
    // filmstrip video clip (spec 05 §7.1: 80px-wide thumbs, 60px strip in 80px lane)
    const stripH = Math.min(60, laneHeight - 18);
    body = (
      <div className="relative h-full w-full" style={{ background: 'var(--clip-video)' }}>
        {media?.thumbnail && (
          <div
            className="w-full"
            style={{
              height: stripH,
              backgroundImage: `url(${media.thumbnail})`,
              backgroundSize: '80px 100%',
              backgroundRepeat: 'repeat-x',
              filter: media.offline ? 'grayscale(1) opacity(0.35)' : 'none',
            }}
          />
        )}
        {clipLabel('var(--clip-label-text)')}
        {media?.offline && (
          <span className="mono absolute right-1.5 top-1 rounded-sm bg-[var(--danger)]/90 px-1 py-px text-[11px] font-bold text-white">OFFLINE</span>
        )}
      </div>
    );
  }

  /* Alt+drag duplicate gesture: faded ghost copy pinned at the ORIGINAL
     position (visual only — the dragged preview is the copy-in-flight; on
     drop the store duplicates and the original never moves). Gated on the
     ACTIVE phase — the ghost respects the 5px threshold like the drag
     itself (R15 T2). While cross-track engaged the host's resolved ghost
     replaces the preview entirely, so the pinned copy hides (the clip itself
     is already sitting faded at the original position). */
  const showGhost = dragActive && drag.mode === 'move' && drag.alt && !previewSuppressed;
  const ghost = showGhost ? (
    <div
      data-testid={`clip-ghost-${el.id}`}
      aria-hidden="true"
      className="clip-drag-ghost absolute top-[2px] bottom-[2px] rounded-[2px]"
      style={{
        left: drag.origStart * pxPerSec,
        width: Math.max(6, el.duration * pxPerSec),
        background: isAudio
          ? 'linear-gradient(to bottom, var(--clip-audio-a), var(--clip-audio-b))'
          : isText
            ? 'var(--clip-text)'
            : 'var(--clip-video)',
      }}
    >
      {clipLabel(isAudio ? 'var(--clip-audio-label)' : isText ? 'var(--clip-text-label)' : 'var(--clip-label-text)')}
    </div>
  ) : null;

  return (
    <>
      {ghost}
      <div
        ref={ref}
        role="button"
        aria-label={`${el.name}, ${tc(el.startTime)}`}
        data-testid={`clip-${el.id}`}
        data-clip-id={el.id} /* R15 T2 context-menu routing hook — the Timeline scroll surface's single onContextMenu resolves the clip under the cursor via closest('[data-clip-id]') */
        tabIndex={-1} /* programmatic focus only — roving host for Shift+F10 (§4.9) */
        className={`clip-box absolute top-[2px] bottom-[2px] ${fxHover ? 'ring-1 ring-accent' : ''}`}
        onDoubleClick={(e) => {
          // M3 escalation preview (design doc §3.1): dbl-click audio clip → Audio focus + strip focus
          if (track.kind === 'audio') {
            useUi.getState().enterAudioFocus('escalation', track.id);
          }
        }}
        /* R15 T2 canonical right-click law: NO onContextMenu here — the event
           bubbles (un-stopped) to the Timeline scroll surface, whose single
           router selects-if-unselected and opens the clip menu. */
        onKeyDown={(e) => {
          if (isMenuKey(e)) {
            e.preventDefault();
            e.stopPropagation();
            menu.openForElement(ref.current, buildMenuItems(), 'clip');
            return;
          }
          /* ARIA button pattern (WAI-ARIA authoring §Button) + spec 18 §11
             keyboard floor: role="button" activates on Enter/Space — plain =
             select, ⇧ = extend, mirroring onClick (Space prevented: page
             scroll). Blade splits stay pointer-driven — ⌘B owns the keyboard
             route. Locked tracks keep the same inert contract as clicks. */
          if (e.key === 'Enter' || e.key === ' ') {
            if (locked) return;
            e.preventDefault();
            selectElement(el.id, e.shiftKey || e.metaKey);
          }
        }}
      style={{
        left: geo.left,
        width: Math.max(6, geo.width),
        /* R15 T9 z-order (canonical §17): clips sit at z 1, selected 5; an
           active drag lifts to the ghost layer (10, below snap 40 / playhead
           100). Inline so the utilities never fight over precedence. */
        zIndex: dragActive ? 10 : selected ? 5 : 1,
        opacity: previewSuppressed ? 0.45 : undefined,
        cursor,
        pointerEvents: locked ? 'none' : 'auto',
        outline: selected ? '1.5px solid var(--accent-selection)' : hover ? '1px solid var(--border-strong)' : 'none',
        outlineOffset: 0,
        boxShadow: selected
          ? 'inset 0 0 0 999px color-mix(in srgb, var(--accent-selection) 12%, transparent)'
          : dragActive
            ? '0 4px 12px rgba(0,0,0,0.45)'
            : 'none',
      }}
      onPointerDown={onPointerDownBody}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancelGesture}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(EFFECT_DRAG_TYPE)) return;
        e.preventDefault(); // the ONLY drop the clip itself accepts
        e.dataTransfer.dropEffect = locked ? 'none' : 'copy';
        if (!locked) setFxHover(true);
      }}
      onDragLeave={(e) => {
        if (!e.dataTransfer.types.includes(EFFECT_DRAG_TYPE)) return;
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setFxHover(false);
      }}
      onDrop={onEffectDrop}
    >
      {/* inner clipping box (label + body clip; badges overflow) */}
      <div className="clip-box absolute inset-0 overflow-hidden">{body}</div>

      {/* locked overlay — stripes ON TOP of the body (legible, R2) */}
      {locked && <div className="locked-stripes pointer-events-none absolute inset-0 z-[2]" aria-hidden="true" />}

      {/* live trim/move TC bubble (spec 06 §8 overlay pattern) — active
          gestures only (the 5px threshold gates the optimistic preview) */}
      {dragActive && (
        <span
          className="mono pointer-events-none absolute -top-[22px] left-0 whitespace-nowrap rounded-[var(--radius-sm)] border border-strong bg-inset px-1.5 py-px text-[11px] text-tprimary shadow-lg"
          data-testid="clip-drag-tc"
        >
          {tc(drag.mode === 'move' ? drag.cur : drag.mode === 'l' ? drag.cur : el.startTime)}
          {' · '}
          {tc(
            drag.mode === 'move'
              ? el.duration
              : drag.mode === 'l'
                ? drag.origStart + drag.origDur - drag.cur
                : drag.cur - el.startTime,
          )}
        </span>
      )}

      {/* trim handles — 12px hit strips, ew-resize (spec 05 §14.2). Gestures
          start PENDING (R15 T2): the 5px threshold gates the trim preview —
          a press-release without crossing it is a plain click (no trim). */}
      {!locked && (
        <>
          <div
            className="absolute inset-y-0 left-0 w-3 rounded-l-[2px]"
            style={{ cursor: 'ew-resize' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (tool !== 'select') return;
              dragCancelled.current = false;
              lastGestureWasDrag.current = false; // fresh gesture
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              setDrag({ phase: 'pending', mode: 'l', pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, origStart: el.startTime, origDur: el.duration, cur: el.startTime, alt: false });
            }}
            onPointerMove={(e) => { e.stopPropagation(); onPointerMove(e); }}
            onPointerUp={(e) => { e.stopPropagation(); onPointerUp(e); }}
          />
          <div
            className="absolute inset-y-0 right-0 w-3 rounded-r-[2px]"
            style={{ cursor: 'ew-resize' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (tool !== 'select') return;
              dragCancelled.current = false;
              lastGestureWasDrag.current = false; // fresh gesture
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              setDrag({ phase: 'pending', mode: 'r', pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, origStart: el.startTime, origDur: el.duration, cur: el.startTime + el.duration, alt: false });
            }}
            onPointerMove={(e) => { e.stopPropagation(); onPointerMove(e); }}
            onPointerUp={(e) => { e.stopPropagation(); onPointerUp(e); }}
          />
        </>
      )}

      {/* linked A/V badge (spec 05 §12.3) */}
      {el.linkedTo && (
        <span
          className="absolute right-1 top-1 flex items-center rounded-sm bg-black/55 px-1 py-px text-tprimary"
          title="Linked A/V"
          aria-label="Linked audio and video"
        >
          <Link2 size={10} strokeWidth={2.2} />
        </span>
      )}

      {/* effect badges (F/T/S/♪ — spec 18 §9) */}
      {el.effects?.some((f) => f.enabled) && (
        <span className="mono absolute left-1 top-1 rounded-sm bg-black/55 px-1 text-[11px] font-bold text-white">F</span>
      )}
    </div>
    {menu.state && <ContextMenu {...menu.state} onClose={menu.close} />}
    </>
  );
}

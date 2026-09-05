/* Clip — spec 05 §7.3 anatomy: position:absolute, timeToPx geometry,
   filmstrip / waveform / label children, trim handles (8px outside edges),
   fade triangles (§9), linked badge. Two render modes:
   filmstrip (spec 05 canonical) | blocks (davinci mock compact).
   Selected = accent outline + tint; locked = stripes (legible, not faded);
   drag = optimistic preview + live TC bubble; commit on release (18 §5).
   R15 T2 gesture discipline (canonical §5): pointerdown arms a PENDING
   gesture; the preview/commit machinery engages only past the strict 5px
   threshold (either axis); release back within 5px = drag-back cancel;
   buttons-mask-0 moves and pointercancel cancel; lastGestureWasDrag
   swallows the follow-up click after a completed drag. Right-click does
   NOT stopPropagation — the Timeline scroll surface routes the menu.
   R15 T4 trim laws + tool gestures (spec-06 §10.5 OT-GAP): 1-frame min,
   neighbor/source bounds, frame-snap-once with the store as trusting single
   owner, and the roll/ripple/slip/slide/stretch gestures — all sharing the
   T2 discipline and the preview→commit + ONE history entry contract. */

import { useEffect, useRef, useState } from 'react';
import { Link2 } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { useVariantClipStyle } from '../../state/variantHooks';
import { mediaById, findElement, EFFECT_DEFS, TRANSITION_PRESENTATIONS, type ElementJSON, type TrackJSON } from '../../lib/mockData';
import { snapToFrame, tc, clamp } from '../../lib/timecode';
import { DRAG_THRESHOLD_PX } from '../../lib/pixel';
import { resolveGroupMove, toCreateTrackPlans, dragRejectionToast } from '../../lib/timelinePlacement';
import {
  RATE_MIN,
  RATE_MAX,
  adjacentBefore,
  adjacentAfter,
  batchTrimBounds,
  rollDeltaBounds,
  rippleDeltaBounds,
  slipTargetBounds,
  slideStartBounds,
  stretchDeltaBounds,
} from '../../lib/trimLaws';
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
   preview time; the host resolves the drop target from pointer position.
   R15 T4/T5: `kind` splits the two host relationships — 'move' events drive
   the T3 drop resolution + release commit; 'trim' events (every T4
   edge/body tool gesture) only feed the snap indicator — the CLIP commits
   those itself. `snapAt` carries the active snap target (content time) for
   the Timeline's indicator line, null when the gesture holds none. */
export interface ClipDragEvent {
  anchorId: string;
  phase: 'start' | 'move' | 'end';
  kind: 'move' | 'trim';
  pointerId: number;
  clientX: number;
  clientY: number;
  startX: number;
  startY: number;
  previewStart: number;
  snapAt: number | null;
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
   off-window — capture still delivers the move).
   R15 T4 tool-gesture modes (spec-06 §10.5 OT-GAP) — ONE state machine:
     'move'      select-tool body drag (the T3 2D host seam)
     'slip'      slip-tool body drag: content slides under a FIXED clip
     'slide'     slide-tool body drag: clip moves, neighbors make room
     'l'/'r'     select-tool edge drag (plain trim)
     'roll-*'    junction drag (roll tool, or ⌥-edge-drag in select)
     'ripple-*'  edge drag + later clips stay glued to the new end
     'stretch-*' edge drag + speed compensates (rate clamp [0.01, 5])
   `cur` semantics per family: move/slide → preview start; slip → content
   offset seconds (pointer direction); left-edge family → preview left-edge
   time; right-edge family → preview end time. */
type DragMode =
  | 'move'
  | 'slip'
  | 'slide'
  | 'l'
  | 'r'
  | 'roll-l'
  | 'roll-r'
  | 'ripple-l'
  | 'ripple-r'
  | 'stretch-l'
  | 'stretch-r';
type DragState = {
  phase: 'pending' | 'active';
  mode: DragMode;
  pointerId: number;
  startX: number; // gesture origin (screen px) — threshold + drag-back math
  startY: number;
  origStart: number;
  origDur: number;
  cur: number;
  alt: boolean;
  /* R15 T5: the active snap target (content time) from the last move —
   * surfaced through the host seam for the Timeline's indicator line. */
  snapAt: number | null;
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
  /* R15 T4: the drag group — canonical: the selection when the anchor is
   * selected, else the anchor alone. Shared by the batch-trim commit, the
   * slip commit and the snap-target self-exclusion. */
  const groupIds = (): string[] => {
    const s = useUi.getState();
    return s.selection.includes(el.id) ? s.selection : [el.id];
  };
  const notifyHostMove = (e: React.PointerEvent, d: NonNullable<DragState>, phase: 'start' | 'move') => {
    if (!hostRef.current) return;
    const evt: ClipDragEvent = {
      anchorId: el.id,
      phase,
      kind: d.mode === 'move' ? 'move' : 'trim',
      pointerId: d.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      startX: d.startX,
      startY: d.startY,
      previewStart: d.cur,
      snapAt: d.snapAt ?? null,
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

  /* live geometry (drag preview = optimistic DOM state, spec 18 §5). While a
     cross-track drag is ENGAGED the host renders the ghost at the resolved
     target — the clip itself falls back to its ORIGINAL position, faded.
     R15 T4 per-mode geometry: slip keeps the box FIXED (content translates
     inside); ripple-l trims the head — the clip keeps its start when the head
     is removed (the committed interval model), pulls left when extended. */
  const origEnd = drag ? drag.origStart + drag.origDur : el.startTime + el.duration;
  const geo = drag
    ? drag.mode === 'move'
      ? previewSuppressed
        ? { left: el.startTime * pxPerSec, width: el.duration * pxPerSec }
        : { left: drag.cur * pxPerSec, width: el.duration * pxPerSec }
      : drag.mode === 'slide'
        ? { left: drag.cur * pxPerSec, width: el.duration * pxPerSec }
        : drag.mode === 'slip'
          ? { left: el.startTime * pxPerSec, width: el.duration * pxPerSec } // position FIXED (spec-06 §5.6)
          : drag.mode === 'l' || drag.mode === 'roll-l' || drag.mode === 'stretch-l'
            ? { left: drag.cur * pxPerSec, width: Math.max(0, origEnd - drag.cur) * pxPerSec }
            : drag.mode === 'ripple-l'
              ? { left: Math.min(drag.origStart, drag.cur) * pxPerSec, width: Math.max(0, drag.origDur - (drag.cur - drag.origStart)) * pxPerSec }
              : { left: drag.origStart * pxPerSec, width: Math.max(0, drag.cur - drag.origStart) * pxPerSec }
    : { left: el.startTime * pxPerSec, width: el.duration * pxPerSec };

  /* ---- R15 T4 per-mode preview readouts ---- */
  const isLeftEdgeMode = drag != null && (drag.mode === 'l' || drag.mode === 'roll-l' || drag.mode === 'ripple-l' || drag.mode === 'stretch-l');
  const slipActive = dragActive && drag?.mode === 'slip';
  const slipOffsetPx = slipActive ? drag!.cur * pxPerSec : 0;
  const stretchPreviewDur = dragActive && (drag?.mode === 'stretch-l' || drag?.mode === 'stretch-r')
    ? drag!.mode === 'stretch-l'
      ? drag!.origStart + drag!.origDur - drag!.cur
      : drag!.cur - drag!.origStart
    : null;
  const bubbleTime = !drag
    ? el.startTime
    : drag.mode === 'move' || drag.mode === 'slide'
      ? drag.cur
      : drag.mode === 'slip'
        ? (el.sourceStart ?? 0) - drag.cur // the new source-window start (position is FIXED)
        : isLeftEdgeMode
          ? drag.cur
          : el.startTime;
  const bubbleDur = !drag
    ? el.duration
    : drag.mode === 'move' || drag.mode === 'slide' || drag.mode === 'slip'
      ? el.duration
      : isLeftEdgeMode
        ? drag.origStart + drag.origDur - drag.cur
        : drag.cur - drag.origStart;

  /* R15 T5: closest-wins snapping (strict <, earliest wins ties) over the
     host's target list — which already excludes locked tracks — and EXCLUDING
     the dragged group's own edges (value-identical targets drop with them;
     a coincident foreign target is equivalent to no motion). SHIFT suppresses
     snapping entirely (canonical §5, every gesture). Returns the snap target
     so the host can draw the indicator line. */
  const applySnap = (t: number, shiftKey: boolean): { t: number; snapAt: number | null } => {
    const frameSnapped = snapToFrame(t);
    if (!snap || shiftKey) return { t: frameSnapped, snapAt: null };
    const selfTimes = new Set<number>();
    const s = useUi.getState();
    const scene = s.scenes.find((x) => x.id === s.activeSceneId);
    const group = new Set(groupIds());
    if (scene) {
      for (const tr of scene.tracks) for (const e2 of tr.elements) {
        if (!group.has(e2.id)) continue;
        selfTimes.add(e2.startTime);
        selfTimes.add(e2.startTime + e2.duration);
      }
    }
    const tolPx = 10 / pxPerSec; // 10px screen-space (spec 05 §9)
    let best = frameSnapped, bestD = tolPx, snapAt: number | null = null;
    for (const target of snapTargets) {
      if (selfTimes.has(target)) continue; // group/self edges are never targets
      const d = Math.abs(target - t);
      if (d < bestD) { best = target; bestD = d; snapAt = target; }
    }
    return { t: Math.max(0, best), snapAt };
  };

  /* R15 T4: the bounds law for the active mode, computed with the SAME pure
     functions the store commits through (lib/trimLaws) — the optimistic
     preview can never show a position the commit would clamp away. Null =
     unclamped (move: the store's overlap rejection + honest toast own it;
     slip: bounds apply to the source window, not to `cur`). */
  const curBounds = (mode: DragMode): { lo: number; hi: number } | null => {
    const s = useUi.getState();
    const scene = s.scenes.find((x) => x.id === s.activeSceneId);
    switch (mode) {
      case 'move':
      case 'slip':
        return null;
      case 'slide':
        return slideStartBounds(track, el);
      case 'l':
      case 'r': {
        if (!scene) return null;
        const b = batchTrimBounds(scene, groupIds().map((id) => ({ id, edge: mode })));
        if (!b) return null;
        return mode === 'l'
          ? { lo: el.startTime + b.lo, hi: el.startTime + b.hi }
          : { lo: el.startTime + el.duration + b.lo, hi: el.startTime + el.duration + b.hi };
      }
      case 'roll-l': {
        const a = adjacentBefore(track, el);
        if (!a) return null;
        const b = rollDeltaBounds(a, el);
        return { lo: el.startTime + b.lo, hi: el.startTime + b.hi };
      }
      case 'roll-r': {
        const b = adjacentAfter(track, el);
        if (!b) return null;
        const bd = rollDeltaBounds(el, b);
        return { lo: el.startTime + el.duration + bd.lo, hi: el.startTime + el.duration + bd.hi };
      }
      case 'ripple-l': {
        const b = rippleDeltaBounds(track, el, 'l');
        return { lo: el.startTime + b.lo, hi: el.startTime + b.hi };
      }
      case 'ripple-r': {
        const b = rippleDeltaBounds(track, el, 'r');
        return { lo: el.startTime + el.duration + b.lo, hi: el.startTime + el.duration + b.hi };
      }
      case 'stretch-l':
      case 'stretch-r': {
        const edge = mode === 'stretch-l' ? 'l' : 'r';
        const b = stretchDeltaBounds(track, el, edge);
        return edge === 'l'
          ? { lo: el.startTime + b.lo, hi: el.startTime + b.hi }
          : { lo: el.startTime + el.duration + b.lo, hi: el.startTime + el.duration + b.hi };
      }
    }
  };

  /* R15 T4: handle routing — plain trim (select), roll (roll tool, or
     ⌥-drag an edge in select — needs an adjacent neighbor: a gap has no
     junction), ripple, stretch. Slip/slide/blade render no handles. */
  const handleModeFor = (edge: 'l' | 'r', alt: boolean): DragMode | null => {
    if (tool === 'roll' || (tool === 'select' && alt)) {
      const neighbor = edge === 'l' ? adjacentBefore(track, el) : adjacentAfter(track, el);
      return neighbor ? ((`roll-${edge}`) as DragMode) : null;
    }
    if (tool === 'select') return edge;
    if (tool === 'ripple') return `ripple-${edge}` as DragMode;
    if (tool === 'stretch') return `stretch-${edge}` as DragMode;
    return null;
  };

  const onPointerDownBody = (e: React.PointerEvent) => {
    if (locked) return;
    if (tool === 'blade') return; // handled by click
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).focus(); // roving focus — Shift+F10 host (§4.9)
    dragCancelled.current = false;
    lastGestureWasDrag.current = false; // fresh gesture — canonical reset-on-pointerdown
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    /* R15 T4: body gestures route by tool — slip/slide own the body drag in
       their tools; every other tool keeps the T3 2D move. */
    const mode: DragMode = tool === 'slip' ? 'slip' : tool === 'slide' ? 'slide' : 'move';
    setDrag({ phase: 'pending', mode, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, origStart: el.startTime, origDur: el.duration, cur: mode === 'slip' ? 0 : el.startTime, alt: e.altKey, snapAt: null });
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
    const shift = e.shiftKey; // R15 T5: shift suppresses snapping in EVERY gesture
    let next: NonNullable<DragState>;
    if (d.mode === 'move' || d.mode === 'slide') {
      const { t, snapAt } = applySnap(d.origStart + dt, shift);
      const b = curBounds(d.mode);
      const cur = b ? clamp(t, b.lo, b.hi) : t;
      // the indicator only reports a snap that SURVIVED the bounds clamp —
      // a clamped-away target is not held (the edge never reached it)
      next = { ...d, cur, alt: e.altKey, snapAt: cur === t ? snapAt : null }; // Alt held? = duplicate gesture (move only)
    } else if (d.mode === 'slip') {
      /* grab-the-content (spec-06 §5.6): the film follows the pointer — drag
         right shows EARLIER material (sourceStart decreases). Store frames use
         the slipNudge convention (+frames = later content), so the gesture
         negates. FRAME-SNAP-ONCE: the rounded frames are the single source
         of truth; the bounds clamp keeps the preview honest (clamped target). */
      const b = slipTargetBounds(el);
      const base = el.sourceStart ?? 0;
      const frames = Math.round(-dt * 24);
      const target = b ? clamp(base + frames / 24, b.lo, b.hi) : base + frames / 24;
      next = { ...d, cur: base - target }; // cur = content offset (s), follows the pointer
    } else {
      /* edge family: ONE frame-snap of the edge time, then the mode's bounds
         clamp (shared with the store) — single owner, no double snap. */
      const isLeft = d.mode === 'l' || d.mode === 'roll-l' || d.mode === 'ripple-l' || d.mode === 'stretch-l';
      const raw = isLeft ? d.origStart + dt : d.origStart + d.origDur + dt;
      const { t, snapAt } = applySnap(raw, shift);
      const b = curBounds(d.mode);
      const cur = b ? clamp(t, b.lo, b.hi) : t;
      next = { ...d, cur, snapAt: cur === t ? snapAt : null }; // clamp ate the snap → not held
    }
    setDrag(next);
    /* R15 T3/T5: report the geometry upward on EVERY qualifying move — the
       host tracks the snap indicator for all gestures and owns drop-target
       resolution + the auto-scroll rAF for MOVE drags only. 'start' fires
       once (activation) so the host can mint the new-track ids; the SAME
       event then carries a 'move' so a single-move drag already resolves. */
    if (wasPending) notifyHostMove(e, next, 'start');
    notifyHostMove(e, next, 'move');
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
    } else {
      /* R15 T4: every tool/trim gesture commits HERE (the store clamps with
         the same shared bounds the preview used); the host's 'end' event only
         drops its snap indicator — kind 'trim' ends never resolve or commit. */
      const left = drag.mode === 'l' || drag.mode === 'roll-l' || drag.mode === 'ripple-l' || drag.mode === 'stretch-l';
      const edge = left ? 'l' : 'r';
      const delta = left ? drag.cur - drag.origStart : drag.cur - (drag.origStart + drag.origDur);
      const group = groupIds();
      switch (drag.mode) {
        case 'l':
        case 'r':
          // selection trims together: batch API, bounds intersection, ONE entry
          useUi.getState().trimElements(group.map((id) => ({ id, edge, delta })));
          break;
        case 'roll-l':
        case 'roll-r': {
          const neighbor = left ? adjacentBefore(track, el) : adjacentAfter(track, el);
          if (neighbor) useUi.getState().rollTrim(left ? neighbor.id : el.id, left ? el.id : neighbor.id, delta);
          break;
        }
        case 'ripple-l':
        case 'ripple-r':
          useUi.getState().rippleTrim(el.id, edge, delta);
          break;
        case 'slip':
          // cur = content offset (pointer direction); store frames are the
          // slipNudge convention (+frames = later content) → negated here
          useUi.getState().slipDrag(group, Math.round(-drag.cur * 24));
          break;
        case 'slide':
          useUi.getState().slideMove(el.id, drag.cur);
          break;
        case 'stretch-l':
        case 'stretch-r':
          useUi.getState().stretchTrim(el.id, edge, delta);
          break;
      }
      notifyHostEnd(false, true, e);
    }
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

  const cursor = locked
    ? 'not-allowed'
    : tool === 'blade'
      ? 'crosshair'
      : dragActive && (drag?.mode === 'move' || drag?.mode === 'slip' || drag?.mode === 'slide')
        ? 'grabbing'
        : 'move';

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
      {/* inner clipping box (label + body clip; badges overflow). R15 T4 slip
          preview: the content (filmstrip/waveform/label) TRANSLATES under the
          fixed clip box — “content slides under the clip” (spec-06 §5.6). */}
      <div
        data-testid={`clip-content-${el.id}`}
        className="clip-box absolute inset-0 overflow-hidden"
        style={slipActive ? { transform: `translateX(${slipOffsetPx}px)` } : undefined}
      >
        {body}
      </div>

      {/* locked overlay — stripes ON TOP of the body (legible, R2) */}
      {locked && <div className="locked-stripes pointer-events-none absolute inset-0 z-[2]" aria-hidden="true" />}

      {/* live trim/move TC bubble (spec 06 §8 overlay pattern) — active
          gestures only (the 5px threshold gates the optimistic preview).
          R15 T4: per-mode readout — the moving edge for edge gestures, the
          source-window start for slip (position is fixed), duration reflects
          the gesture family's own law. */}
      {dragActive && (
        <span
          className="mono pointer-events-none absolute -top-[22px] left-0 whitespace-nowrap rounded-[var(--radius-sm)] border border-strong bg-inset px-1.5 py-px text-[11px] text-tprimary shadow-lg"
          data-testid="clip-drag-tc"
        >
          {tc(bubbleTime)}
          {' · '}
          {tc(bubbleDur)}
        </span>
      )}

      {/* R15 T4 stretch preview: the live speed badge (the committed clip
          shows the same % through clipLabel) — rate clamp included so the
          preview never lies about the [0.01, 5] law. */}
      {dragActive && stretchPreviewDur != null && stretchPreviewDur > 0 && (
        <span
          data-testid="clip-stretch-badge"
          className="mono pointer-events-none absolute left-1 top-1 rounded-sm bg-black/60 px-1 text-[11px] font-bold text-white"
        >
          {Math.round(clamp((el.duration * (el.speed ?? 1)) / stretchPreviewDur, RATE_MIN, RATE_MAX) * 100)}%
        </span>
      )}

      {/* trim handles — R15 T4 canonical §17: SELECTED clips only, 8px wide,
          offset ±4px OUTSIDE the clip edges (replaces the 12px inside
          strips), w-resize/e-resize cursors; active in the select / roll /
          ripple / stretch tools (slip/slide/blade render none). Gestures
          start PENDING (R15 T2): the 5px threshold gates the trim preview —
          a press-release without crossing it is a plain click (no trim).
          Roll also engages via ⌥-drag in the select tool (spec-06 §5.5). */}
      {!locked && selected && (tool === 'select' || tool === 'roll' || tool === 'ripple' || tool === 'stretch') && (
        <>
          <div
            data-testid={`clip-trim-l-${el.id}`}
            className="absolute inset-y-0"
            style={{ left: -4, width: 8, cursor: 'w-resize' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (e.button !== 0) return;
              const mode = handleModeFor('l', e.altKey);
              if (!mode) return; // e.g. roll with no adjacent neighbor — inert
              dragCancelled.current = false;
              lastGestureWasDrag.current = false; // fresh gesture
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              setDrag({ phase: 'pending', mode, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, origStart: el.startTime, origDur: el.duration, cur: el.startTime, alt: false, snapAt: null });
            }}
            onPointerMove={(e) => { e.stopPropagation(); onPointerMove(e); }}
            onPointerUp={(e) => { e.stopPropagation(); onPointerUp(e); }}
          />
          <div
            data-testid={`clip-trim-r-${el.id}`}
            className="absolute inset-y-0"
            style={{ right: -4, width: 8, cursor: 'e-resize' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (e.button !== 0) return;
              const mode = handleModeFor('r', e.altKey);
              if (!mode) return;
              dragCancelled.current = false;
              lastGestureWasDrag.current = false; // fresh gesture
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              setDrag({ phase: 'pending', mode, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, origStart: el.startTime, origDur: el.duration, cur: el.startTime + el.duration, alt: false, snapAt: null });
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

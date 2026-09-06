/* Timeline — spec 18 §3.1/§4.7 + spec 05 internals (mock-level):
   160px (or 112px slim) header column with big TC readout, native-scroll
   lanes area, sticky ruler (scrolls horizontally with content, stays visible
   vertically), playhead (2px line + head, spec-05 §14.3 canonical) spanning
   the FULL scroll viewport, per-track lanes + clips.
   R15 T1 wheel grammar (spec-18 §5A revision R15-2 + canonical): Cmd/Ctrl+
   wheel = rAF-coalesced zoom (capped ±30, exp(−Δ/300)) through the zoom
   controller (two-regime playhead anchor, spec-05 §5.2); plain wheel:
   horizontal when shift or |δX|>|δY| (±40px clamped manual), else vertical.
   R15 T2: ONE context-menu router on the scroll surface (clip under cursor
   → select-if-unselected + §4.9 clip menu; else timeline-empty menu) and
   the marquee gesture discipline (5px strict activation, additive
   shift/ctrl/meta = live-merge ratchet, buttons-mask cancel). */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useUi, trackHeights, mintTrackIds } from '../../state/useUiStore';
import { useVariant } from '../debug/VariantProvider';
import { sceneDuration, mediaById, findElement, type ElementJSON, type TrackJSON } from '../../lib/mockData';
import { tc, snapToFrame } from '../../lib/timecode';
import { dynamicContentWidth, snapPxToDeviceGrid, zoomMinPps, PLAYHEAD_LINE_PX, HORIZONTAL_WHEEL_STEP_PX, DRAG_THRESHOLD_PX } from '../../lib/pixel';
import {
  resolveHoverTarget,
  resolveGroupMove,
  toCreateTrackPlans,
  dragRejectionToast,
  type GroupMoveFail,
  type PlannedMove,
  type PlannedTrack,
} from '../../lib/timelinePlacement';
import { createEdgeAutoScroll } from '../../lib/edgeScroll';
import { zoomController, createWheelZoomAccumulator } from '../../lib/zoomController';
import { Ruler } from './Ruler';
import { TrackHeader } from './TrackHeader';
import { Clip, buildClipMenuItems, CAPTION_PARCHMENT, type ClipDragEvent, type ClipDragHost } from './Clip';
import { SpeedGaugeIcon } from './editModeIcons';
import { ContextMenu, isMenuKey, useContextMenu, type MenuItem } from '../shell/ContextMenu';
import { POOL_DRAG_TYPE, isDroppable } from '../shell/MediaPool';
import { useConfirm } from '../shell/ConfirmDialog';
import { useInsertPreview } from '../../hooks/useInsertPreview';

/* R15 T3 — the drop-target PREVIEW the Timeline renders while a cross-track
   drag is engaged. `ghosts` are content-space boxes at the RESOLVED target
   (members included); a `conflict` preview keeps the ghosts (task: the ghost
   still shows at the snapped time / freezes at the last-valid target) but
   suppresses the lane highlight and drives the not-allowed cursor. */
interface DragGhostBox {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
  type: ElementJSON['type'];
  top: number;   // content space (zoneH included)
  height: number;
  anchor: boolean;
}
interface DragPreview {
  anchorId: string;
  memberIds: string[];
  /** lane index to band-highlight (valid existing-track targets only). */
  hoverIndex: number | null;
  /** content-space Y of the 2px insert line (new-track targets only). */
  insertLineY: number | null;
  ghosts: DragGhostBox[];
  conflict: GroupMoveFail | null;
  /** ghosts frozen at the LAST-VALID target (incompatible / mixed hover). */
  frozen: boolean;
}

/* rAF auto-scroll constants + the loop itself live in lib/edgeScroll.ts
   (R15-F1 FIX 4e: the RULER SCRUB reuses the exact same law — threshold
   100px, 15px/frame max, intensity ramp 1 − dist/threshold). */

export function Timeline() {
  const { variant } = useVariant();
  const scene = useUi((s) => s.scenes.find((x) => x.id === s.activeSceneId)!);
  const pxPerSec = useUi((s) => s.pxPerSec);
  const playhead = useUi((s) => s.playhead);
  const setPlayhead = useUi((s) => s.setPlayhead);
  const snap = useUi((s) => s.snap);
  const setSelection = useUi((s) => s.setSelection);
  const addTrack = useUi((s) => s.addTrack);
  const addMarker = useUi((s) => s.addMarker);
  const loadSampleProject = useUi((s) => s.loadSampleProject);
  const pushToast = useUi((s) => s.pushToast);
  const mediaDrag = useUi((s) => s.mediaDrag); // pool drag-to-lane state (18 §4.2)
  const selection = useUi((s) => s.selection); // R15 T9: selected clips are never virtualized away
  /* R20-W2 (C48): the armed hover-placement preview — plan computed by the
     SAME pure planner the commit runs (useInsertPreview hook; never a raw
     zustand selector). ok:false renders NO geometry (the source bar's tip
     carries the refusal instead). */
  const insertPreview = useInsertPreview();
  /* R20-W2 (thread #65 / contract §5): source-mode-only frozen-lane guard —
     while an AUDIO source is loaded in the source viewer, non-audio lanes
     render dimmed + aria-disabled and refuse drops honestly. PROGRAM MODE
     NEVER DIMS (the guard is viewerMode==='source' && audio source —
     exitSourcePreview clearing is the side-effect). */
  const viewerMode = useUi((s) => s.viewerMode);
  const sourceMediaId = useUi((s) => s.sourceMediaId);
  const audioSourceFrozen = viewerMode === 'source'
    && (sourceMediaId ? mediaById(sourceMediaId)?.type === 'audio' : false);
  const menu = useContextMenu(); // §4.9 timeline-empty + clip menus (R15 T2 router)
  const confirm = useConfirm(); // §6.4 multi-delete confirmation (clip menu route)

  const headersRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* R15 T1 — reactive scroll/viewport state: drives the Ruler's tick
     virtualization window + the dynamic content width (the canonical cost —
     the ruler re-renders on scroll; React batches the events). */
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportW, setViewportW] = useState(0);

  /* §4.9 timeline-empty menu items — the DEFAULT branch of the R15 T2
     context-menu router below (right-click / Shift+F10 on the empty lane
     surface; the ruler and track headers keep their own stopPropagation
     handlers, and clips are routed to the clip menu). */
  const buildMenuItems = (): MenuItem[] => [
    { id: 'paste', label: 'Paste', shortcut: '⌘V', disabled: true, tip: 'mock: clipboard paste needs spec 15 §4.3.70' },
    { id: 'add-marker', label: 'Add marker', onSelect: () => addMarker(useUi.getState().playhead) },
    { id: 'add-track', label: 'Add track (audio)', onSelect: () => addTrack('audio') },
    { id: 'import-media', label: 'Import media', shortcut: '⌘I', onSelect: () => {
      /* §4.9 timeline-empty menu wants the ⌘I import flow; the toast text
         mirrors useShortcuts' ⌘I binding EXACTLY so surface parity is
         testable (same title + detail, both routes say the same thing) */
      pushToast({ kind: 'info', title: 'Import media', detail: 'File picker is mock — drop files on the Media Pool' });
    } },
    { id: 'load-sample', label: 'Load sample project', sep: true, onSelect: () => {
      loadSampleProject();
      pushToast({ kind: 'success', title: 'Sample project loaded', detail: '30 s demo · 3 video + 1 text + 1 audio + crossfade (18 §4.10)' });
    } },
  ];

  /* marquee rubber-band selection — R15 T2/T7 canonical: the gesture starts
     PENDING on pointerdown and activates only when the pointer moves STRICTLY
     more than 5px (either axis, screen space) — the rubber band renders and
     selection changes only from then on. A release under threshold is a
     plain click → clears selection (replaces the old plain empty-lane
     deselect). Additive marquee (shift/ctrl/meta held at START): live-merge
     RATCHET — each move merges the rect's intersections into the LIVE
     selection, so it only ever GROWS (shrinking the rect never un-selects);
     release writes nothing more. Non-additive: replace at release (current
     behavior). Buttons-mask: a move with the left button released cancels
     the gesture (additive live merges are not rolled back — canonical
     cancel() leaves them). */
  const [marquee, setMarquee] = useState<{
    x0: number; y0: number;   // content-space origin (rect + hit-testing)
    sx: number; sy: number;   // screen-space origin (threshold math)
    x1: number; y1: number;
    additive: boolean;        // modifiers held at marquee START
    active: boolean;          // threshold crossed
  } | null>(null);
  const marqueeOn = marquee !== null; // pending OR active — gates the Esc canceller

  const toContent = (e: { clientX: number; clientY: number }): { x: number; y: number } | null => {
    const sc = scrollRef.current;
    if (!sc) return null;
    const box = sc.getBoundingClientRect();
    return { x: e.clientX - box.left + sc.scrollLeft, y: e.clientY - box.top + sc.scrollTop };
  };

  const startMarquee = (e: React.PointerEvent) => {
    const p = toContent(e);
    if (!p) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setMarquee({
      x0: p.x, y0: p.y,
      sx: e.clientX, sy: e.clientY,
      x1: p.x, y1: p.y,
      additive: e.shiftKey || e.ctrlKey || e.metaKey,
      active: false,
    });
  };

  /* interval + lane-band hit test (unchanged math) — returns intersected ids */
  const marqueeHit = (m: { x0: number; y0: number; x1: number; y1: number }): string[] => {
    const tMin = Math.min(m.x0, m.x1) / pxPerSec;
    const tMax = Math.max(m.x0, m.x1) / pxPerSec;
    const yTop = Math.min(m.y0, m.y1);
    const yBot = Math.max(m.y0, m.y1);
    const ids: string[] = [];
    let top = zoneH; // first lane starts below the ruler zone
    for (const track of scene.tracks) {
      const h = laneHeight(track.kind);
      if (!track.locked && yBot > top && yTop < top + h) {
        for (const el of track.elements) {
          if (tMax > el.startTime && tMin < el.startTime + el.duration) ids.push(el.id);
        }
      }
      top += h;
    }
    return ids;
  };

  const moveMarquee = (e: React.PointerEvent) => {
    if (!marquee) return;
    // buttons-bitmask: left button released (off-window) → cancel the gesture
    if ((e.buttons & 1) === 0) {
      setMarquee(null);
      return;
    }
    const p = toContent(e);
    if (!p) return;
    const next = { ...marquee, x1: p.x, y1: p.y };
    if (!next.active) {
      // strict > 5px on either axis (screen space) before activation
      if (Math.abs(e.clientX - marquee.sx) <= DRAG_THRESHOLD_PX && Math.abs(e.clientY - marquee.sy) <= DRAG_THRESHOLD_PX) return;
      next.active = true;
    }
    setMarquee(next);
    if (next.active && next.additive) {
      // LIVE-MERGE RATCHET (canonical mergeElementsIntoSelection): union into
      // the LIVE selection on every move — grow-only by construction
      const ids = marqueeHit(next);
      const live = useUi.getState().selection;
      const merged = [...new Set([...live, ...ids])];
      if (merged.length !== live.length) useUi.getState().setSelection(merged);
    }
  };

  /* R15 T2 item 9 — follow-up click swallow analysis: the canonical
     justFinishedSelecting rAF guard swallows the click a browser synthesizes
     after an ACTIVE marquee's mouseup. Here it CANNOT fire a deselect: the
     deselect lives inside THIS pointerup handler's under-threshold branch
     (never reached once active), and the lanes/scroll surface register no
     onClick at all — a stray click has no listener to hit. (jsdom fires no
     synthesized clicks either.) Documented instead of dead code, per the
     task contract. */
  const finishMarquee = () => {
    const m = marquee;
    setMarquee(null);
    if (!m) return;
    if (!m.active) {
      setSelection([]); // click-no-drag on empty lane → deselect (kept behavior)
      return;
    }
    if (m.additive) return; // ratchet already wrote the live merges — nothing more
    setSelection(marqueeHit(m));
  };

  /* Escape cancels an active marquee — pending OR active (capture — beats
     the shell Esc handler; R15 T2 escape-ladder rung 1). Additive live
     merges are NOT rolled back (canonical cancel() leaves the grown
     selection); non-additive never wrote, so it cancels clean. */
  useEffect(() => {
    if (!marqueeOn) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setMarquee(null);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [marqueeOn]);

  const duration = sceneDuration(scene);
  /* R15 T1 — dynamic content width from the shared pixel lib (canonical
     dynamicTimelineWidth: content + 0.75→0.15 padding, floored at viewport;
     replaces (dur+4)·pps). Single source — the Ruler receives it as a prop
     (dedup: it recomputed its own (dur+4)·pps before). */
  const zoomMin = useUi((s) => s.zoomMinPps);
  const vw = viewportW || 900;
  /* fixes th_mto2zq0g — BOUNDED SCROLL RUNWAY: the canonical padding adds
     up to 75% of the viewport of empty scrollable runway past the content
     end ("keep scrolling into nothing"). Cap the runway at 25% of the
     viewport — the zoomMinPps fit-25% convention — so scrolling STOPS just
     past the content end, while the viewport floor keeps the lanes filling
     the scroller at zoom-to-fit. The Ruler ticks + lane backgrounds still
     paint the FULL contentW (only the trailing runway shrinks). Scroll law:
     scrollMax = scrollWidth − clientWidth = contentW − viewport. */
  const contentW = Math.max(
    Math.min(dynamicContentWidth(duration, pxPerSec, vw, zoomMin), duration * pxPerSec + 0.25 * vw),
    vw,
  );
  const zoneH = variant.headerStyle === 'readout' ? 44 : 22;
  const colW = variant.headerStyle === 'readout' ? 160 : 112;

  const audioLaneBoost = useUi((s) => s.audioLaneBoost);
  const trackHeightPref = useUi((s) => s.trackHeightPref);
  const laneHeight = (kind: TrackJSON['kind']) => {
    /* R19 caption lane (gap C34): 32px Sub-lane (reference §2.5 — the 24px
       parchment chips + 4px insets); filmstrip/blocks kind heights apply to
       every other kind. */
    const base = kind === 'caption' ? 32 : trackHeights(kind, variant.clipStyle);
    /* spec 18 §4.9 Height pref (track-header menu): compact = 60% /
       tall = 140% of the kind-based auto height (normal = auto, the
       default), min 24px, rounded to px. B3 registration: the state-home
       question (per-track vs global) is a seal item — the mock answers
       GLOBAL (one pref for all lanes); deviation noted in the store. */
    const sized = trackHeightPref === 'compact'
      ? Math.max(24, Math.round(base * 0.6))
      : trackHeightPref === 'tall'
        ? Math.max(24, Math.round(base * 1.4))
        : base;
    // audio focus: audio lanes ×1.6, video/overlay compress (design doc §3.2)
    // — applied on the PREF'D height so the two axes compose
    if (audioLaneBoost) return kind === 'audio' ? Math.round(sized * 1.6) : kind === 'main' ? Math.min(sized, 40) : Math.min(sized, 28);
    return sized;
  };

  // R15 T5 snap targets: element edges on UNLOCKED tracks only (locked
  // lanes are inert — their edges are not snap sources), + playhead, 0,
  // sequence end, MARKERS, and the in/out points (loop.start/end). The
  // dragged group/self is excluded per-gesture inside the Clip (it knows the
  // group); marquee never snaps.
  const loop = useUi((s) => s.loop);
  const snapTargets = scene.tracks
    .filter((t) => !t.locked)
    .flatMap((t) => t.elements.flatMap((e) => [e.startTime, e.startTime + e.duration]));
  snapTargets.push(playhead, 0, duration);
  for (const m of scene.markers) snapTargets.push(m.time);
  snapTargets.push(loop.start, loop.end);

  /* lane geometry (content space): the band-top walk + the lane index under
     a content Y. Contiguous lanes (1px borders) — no gap resolution needed
     (canonical gap law N/A, design T3). */
  const laneTopAt = (index: number): number => {
    let top = zoneH;
    for (let i = 0; i < index && i < scene.tracks.length; i++) top += laneHeight(scene.tracks[i]!.kind);
    return top;
  };
  const laneAtContentY = (contentY: number): number | 'above' | 'below' => {
    if (contentY < zoneH) return 'above';
    let top = zoneH;
    for (let i = 0; i < scene.tracks.length; i++) {
      const h = laneHeight(scene.tracks[i]!.kind);
      if (contentY < top + h) return i;
      top += h;
    }
    return 'below';
  };

  /* ---- R15 T3: the Clip → Timeline drag seam. The Clip owns the gesture
     laws; THIS component owns the lane layout + drop-target resolution and
     performs the release commit (resolved group moves / alt duplicates) —
     the resolution itself is the pure resolveGroupMove in lib/.
     R15 T5: the seam also carries the SNAP INDICATOR — every active clip
     gesture (move AND the T4 trim/tool family) reports its snap target
     (snapAt); kind 'trim' events never resolve drop targets or commit (the
     Clip commits those itself — the host only mirrors the indicator). */
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  /* R15 T5: the active gesture's snap point (content time) while it holds
   * one AND snapping is on — drives the 2px accent indicator line (z 40). */
  const [snapIndicator, setSnapIndicator] = useState<number | null>(null);
  interface DragSession {
    anchorId: string;
    anchorType: ElementJSON['type'];
    anchorTrackIdx: number;
    groupIds: string[];        // canonical drag group: selection incl. anchor, else [anchor]
    mintedIds: string[];       // pre-minted new-track ids, one per member (max)
    pointerX: number;          // live pointer (screen) — feeds the auto-scroll rAF
    lastValid: DragPreview | null; // frozen-ghost source for invalid hovers
  }
  const dragSessionRef = useRef<DragSession | null>(null);

  /* edge auto-scroll while a clip drag is active (canonical
     use-edge-auto-scroll): threshold 100px, max 15px/frame, ramp
     1 − dist/100; horizontal only — our vertical content is short.
     R15-F1 FIX 3/4e: shared lib/edgeScroll loop — the session gate parks it
     when the drag ends, is cancelled, OR is dropped wholesale by the
     scene-switch cleanup below. */
  const autoScroll = useRef<ReturnType<typeof createEdgeAutoScroll> | null>(null);
  const stopAutoScroll = () => {
    autoScroll.current?.stop();
  };
  const startAutoScroll = () => {
    if (!autoScroll.current) {
      autoScroll.current = createEdgeAutoScroll({
        getScroller: () => scrollRef.current,
        getPointerX: () => dragSessionRef.current?.pointerX ?? NaN,
        isActive: () => dragSessionRef.current !== null,
        onScroll: (next) => setScrollLeft(next), // keep ruler ticks + clip virtualization live
      });
    }
    autoScroll.current.start();
  };
  useEffect(() => stopAutoScroll, []); // unmount safety — never leak the rAF

  /* the drop-target resolution shared by the PREVIEW (each move) and the
     COMMIT (release): engagement = pointer ≥5px outside the anchor's own
     lane band; then the lane under the pointer (above/below all → new
     track), the pure resolveGroupMove over the CURRENT doc. */
  const resolveDrag = (
    currentScene: typeof scene,
    session: DragSession,
    clientX: number,
    clientY: number,
    previewStart: number,
  ): { engaged: boolean; hover: number | 'above' | 'below'; resolution: ReturnType<typeof resolveGroupMove> } => {
    const sc = scrollRef.current;
    const box = sc?.getBoundingClientRect();
    const contentY = box ? clientY - box.top + (sc?.scrollTop ?? 0) : 0;
    const ownTop = laneTopAt(session.anchorTrackIdx);
    const ownH = laneHeight(scene.tracks[session.anchorTrackIdx]?.kind ?? 'main');
    const engaged = box ? contentY <= ownTop - DRAG_THRESHOLD_PX || contentY >= ownTop + ownH + DRAG_THRESHOLD_PX : false;
    if (!engaged) {
      // horizontal-only: target = the anchor's own lane (the clip's own
      // optimistic preview is the ghost)
      const ownTrackId = scene.tracks[session.anchorTrackIdx]?.id;
      return {
        engaged: false,
        hover: session.anchorTrackIdx,
        resolution: ownTrackId
          ? resolveGroupMove(currentScene, session.anchorId, { trackId: ownTrackId }, previewStart, session.groupIds)
          : { ok: false as const, reason: 'no-track' },
      };
    }
    const hover = laneAtContentY(contentY);
    const hoverTarget = resolveHoverTarget(currentScene, session.anchorType, hover);
    if (hoverTarget.kind === 'invalid') {
      return { engaged: true, hover, resolution: { ok: false as const, reason: hoverTarget.reason } };
    }
    const target = hoverTarget.kind === 'new'
      ? { newTrackIds: session.mintedIds, insertIndex: hoverTarget.insertIndex }
      : { trackId: currentScene.tracks[hoverTarget.trackIndex]!.id };
    return { engaged: true, hover, resolution: resolveGroupMove(currentScene, session.anchorId, target, previewStart, session.groupIds) };
  };

  /* ghost geometry: the virtual layout = current tracks + planned new tracks
     at their insert indices (sequential splices stack the block in member
     order, exactly like the commit's "insert above X" runs). */
  const buildGhosts = (res: { ok: true; moves: PlannedMove[]; createTracks: PlannedTrack[] }, anchorId: string): { ghosts: DragGhostBox[]; insertLineY: number | null } => {
    const layout: { kind: TrackJSON['kind']; id: string }[] = scene.tracks.map((t) => ({ kind: t.kind, id: t.id }));
    const sortedPlanned = [...res.createTracks].sort((a, b) => a.insertIndex - b.insertIndex);
    for (const ct of sortedPlanned) layout.splice(Math.min(ct.insertIndex, layout.length), 0, { kind: ct.kind, id: ct.id });
    const tops: number[] = [];
    let acc = zoneH;
    for (const l of layout) {
      tops.push(acc);
      acc += laneHeight(l.kind);
    }
    const elsById = new Map<string, ElementJSON>();
    for (const t of scene.tracks) for (const e of t.elements) elsById.set(e.id, e);
    const ghosts: DragGhostBox[] = res.moves.map((move) => {
      const layoutIdx = layout.findIndex((l) => l.id === move.trackId);
      const el = elsById.get(move.id);
      return {
        id: move.id,
        trackId: move.trackId,
        startTime: move.startTime,
        duration: el?.duration ?? 0,
        type: el?.type ?? 'video',
        top: tops[Math.max(0, layoutIdx)] ?? zoneH,
        height: laneHeight(layout[Math.max(0, layoutIdx)]?.kind ?? 'main') - 4,
        anchor: move.id === anchorId,
      };
    });
    const firstPlanned = sortedPlanned[0];
    const insertLineY = firstPlanned ? (tops[layout.findIndex((l) => l.id === firstPlanned.id)] ?? zoneH) - 1 : null;
    return { ghosts, insertLineY };
  };

  const onClipDragEvent: ClipDragHost = (e: ClipDragEvent) => {
    if (e.phase === 'start') {
      // R15 T5: trim-family gestures (kind 'trim') never mint sessions, never
      // auto-scroll — the CLIP commits them; the host mirrors the indicator
      // only. (Trim deltas are screen-relative: auto-scroll would not move
      // the edge anyway.)
      setSnapIndicator(e.snapAt);
      if (e.kind !== 'move') return;
      // canonical reservedNewTrackIds: one per moving clip (max) — the target
      // identity is stable across pointermove recomputes
      const s = useUi.getState();
      const groupIds = s.selection.includes(e.anchorId) ? s.selection : [e.anchorId];
      const anchorIdx = scene.tracks.findIndex((t) => t.elements.some((el) => el.id === e.anchorId));
      const anchorType = findElement(s.scenes, e.anchorId)?.element.type ?? 'video';
      dragSessionRef.current = { anchorId: e.anchorId, anchorType, anchorTrackIdx: anchorIdx, groupIds, mintedIds: mintTrackIds(Math.max(1, groupIds.length)), pointerX: e.clientX, lastValid: null };
      startAutoScroll();
      return;
    }
    if (e.phase === 'move') {
      // R15 T5: the indicator tracks EVERY gesture's snap point, before any
      // drop resolution (a not-engaged horizontal move still holds a snap).
      setSnapIndicator(e.snapAt);
      if (e.kind !== 'move') return;
      const session = dragSessionRef.current;
      if (!session) return;
      session.pointerX = e.clientX;
      const { engaged, hover, resolution } = resolveDrag(scene, session, e.clientX, e.clientY, e.previewStart);
      if (!engaged) {
        setDragPreview(null); // the dragged clip's own preview is the ghost
        return;
      }
      if (resolution.ok) {
        const { ghosts, insertLineY } = buildGhosts(resolution, session.anchorId);
        const preview: DragPreview = {
          anchorId: session.anchorId,
          memberIds: resolution.moves.map((m) => m.id),
          // existing-track target → band-highlight the hovered lane; new-track
          // targets render the insert line instead
          hoverIndex: resolution.createTracks.length > 0 ? null : typeof hover === 'number' ? hover : null,
          insertLineY,
          ghosts,
          conflict: null,
          frozen: false,
        };
        session.lastValid = preview;
        setDragPreview(preview);
        return;
      }
      const reason = resolution.reason;
      if (reason === 'incompatible' || reason === 'locked' || reason === 'mixed-group') {
        // ghost FREEZES at the last-valid target; lane NOT highlighted
        setDragPreview(session.lastValid
          ? { ...session.lastValid, frozen: true, conflict: reason, hoverIndex: null }
          : { anchorId: session.anchorId, memberIds: [session.anchorId], hoverIndex: null, insertLineY: null, ghosts: [], conflict: reason, frozen: true });
        return;
      }
      // overlap / no-track: the ghost still shows AT the snapped time in the
      // hovered lane (anchor-only), conflict-edged — release is a no-op
      const elsById = new Map<string, ElementJSON>();
      for (const t of scene.tracks) for (const el of t.elements) elsById.set(el.id, el);
      const anchorEl = elsById.get(session.anchorId);
      const hoveredIdx = typeof hover === 'number' ? hover : null;
      const ghost: DragGhostBox | null = anchorEl && hoveredIdx !== null
        ? {
            id: session.anchorId,
            trackId: scene.tracks[hoveredIdx]!.id,
            startTime: e.previewStart,
            duration: anchorEl.duration,
            type: anchorEl.type,
            top: laneTopAt(hoveredIdx),
            height: laneHeight(scene.tracks[hoveredIdx]!.kind) - 4,
            anchor: true,
          }
        : null;
      setDragPreview({
        anchorId: session.anchorId,
        memberIds: [session.anchorId],
        hoverIndex: null,
        insertLineY: null,
        ghosts: ghost ? [ghost] : [],
        conflict: reason,
        frozen: false,
      });
      return;
    }
    // 'end' — release / cancel: drop the indicator FIRST (every gesture),
    // then the move-commit path
    setSnapIndicator(null);
    stopAutoScroll();
    if (e.kind !== 'move') return; // trim-family: the Clip already committed
    const session = dragSessionRef.current;
    dragSessionRef.current = null;
    setDragPreview(null);
    if (!session || e.cancelled || !e.commit) return;
    // resolve fresh from the RELEASE geometry (pure over the CURRENT doc)
    const s = useUi.getState();
    const liveScene = s.scenes.find((x) => x.id === s.activeSceneId);
    if (!liveScene) return;
    const { resolution } = resolveDrag(liveScene, session, e.clientX, e.clientY, e.previewStart);
    if (!resolution.ok) {
      s.pushToast(dragRejectionToast(resolution.reason));
      return;
    }
    const createTracks = toCreateTrackPlans(liveScene, resolution.createTracks);
    if (e.alt) s.duplicateAndMove({ ids: session.groupIds, moves: resolution.moves, createTracks });
    else s.moveElements({ moves: resolution.moves, createTracks });
  };

  /* two-way scroll sync (W0-21): lanes ⇄ headers — a wheel over EITHER
     column keeps the pair aligned (the real shell has ONE scroll region;
     two synced panes is the mock's stand-in). Loop guard: writes happen
     only when the two scrollTops differ, so the rebound scroll the write
     provokes is a no-op; the syncing ref covers the synchronous re-entry
     window. */
  const syncing = useRef(false);
  const syncVertical = (from: HTMLElement, to: HTMLElement | null) => {
    if (syncing.current || !to || Math.abs(to.scrollTop - from.scrollTop) < 1) return;
    syncing.current = true;
    to.scrollTop = from.scrollTop;
    syncing.current = false;
  };
  const onScrollSync = () => {
    if (scrollRef.current) syncVertical(scrollRef.current, headersRef.current);
  };
  const onHeaderScrollSync = () => {
    if (headersRef.current) syncVertical(headersRef.current, scrollRef.current);
  };

  /* wheel grammar R15 T1 (canonical use-timeline-zoom): ONE non-passive
     capture listener. Zoom path (ctrl/meta): rAF-coalesced accumulator —
     deltas accumulate, ONE capped (±30) exp(−Δ/300) factor per animation
     frame (event-count independent), routed through the zoom controller so
     pre-zoom scroll is captured at request time (two-regime anchoring).
     Non-zoom: preventDefault + manual scroll — horizontal (shift or
     |δX|>|δY|) → scrollLeft ±min(|raw|, 40); else scrollTop += deltaY. */
  const ppsRef = useRef(pxPerSec);
  ppsRef.current = pxPerSec;
  const durRef = useRef(duration);
  durRef.current = duration;
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const wheelZoom = createWheelZoomAccumulator({
      isZoomEvent: (e) => e.ctrlKey || e.metaKey,
      onApplyFactor: (factor) => {
        zoomController.setZoomLevel(ppsRef.current * factor, { duration: durRef.current });
      },
    });
    const onWheelNative = (e: WheelEvent) => {
      if (wheelZoom.handleWheel(e)) return;
      e.preventDefault();
      const horizontal = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (horizontal) {
        const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        sc.scrollLeft += Math.sign(raw) * Math.min(Math.abs(raw), HORIZONTAL_WHEEL_STEP_PX);
      } else {
        sc.scrollTop += e.deltaY;
      }
    };
    sc.addEventListener('wheel', onWheelNative, { passive: false, capture: true });
    return () => {
      sc.removeEventListener('wheel', onWheelNative, { capture: true });
      wheelZoom.destroy();
    };
  }, []);

  /* zoom controller lifecycle: attach the scroller, run applyZoomLayout in a
     layout effect after the zoom re-render (anchoring math needs the NEW
     scrollWidth), reset stale anchor state on scene switch. */
  useLayoutEffect(() => {
    zoomController.attach({
      getScroller: () => scrollRef.current,
    });
    return () => zoomController.detach();
  }, []);
  const ppsForLayout = pxPerSec; // dependency below: re-run after every zoom re-render
  useLayoutEffect(() => {
    zoomController.applyZoomLayout(duration);
  }, [ppsForLayout, duration]);
  useEffect(() => {
    zoomController.reset(); // scene switch: anchor state stale by construction
    /* R15-F1 FIX 3 (b) + P3 sweep: a scene switch mid-gesture unmounts every
       Clip — the drag session, snap indicator, ghost previews and the
       auto-scroll rAF must drop with them (an 'end' may never fire; the
       Clips' own unmount flush also fires, this is the belt-and-braces +
       host-session clear). Stale-by-construction view state goes too: the
       scrollLeft position (the new scene's content differs) and a live
       marquee band. */
    stopAutoScroll();
    dragSessionRef.current = null;
    setSnapIndicator(null);
    setDragPreview(null);
    setMarquee(null);
    const sc = scrollRef.current;
    if (sc && sc.scrollLeft !== 0) {
      sc.scrollLeft = 0;
      setScrollLeft(0);
    }
  }, [scene.id]);

  /* viewport measurement + dynamic min reconcile (spec-05 §5.2): ResizeObserver
     on the lanes scroller → viewportW + zoomMinPps = fit-with-25%-headroom;
     jsdom has no RO → the 900 fallback matches the old measureLanes pattern. */
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc || typeof ResizeObserver === 'undefined') {
      setViewportW(900);
      useUi.getState().setZoomMin(zoomMinPps(900, duration));
      return;
    }
    const ro = new ResizeObserver(() => {
      const w = sc.clientWidth || 900;
      setViewportW(w);
      useUi.getState().setZoomMin(zoomMinPps(w, durRef.current));
    });
    ro.observe(sc);
    const w = sc.clientWidth || 900;
    setViewportW(w);
    useUi.getState().setZoomMin(zoomMinPps(w, duration));
    return () => ro.disconnect();
  }, []);
  // duration changes re-derive the min (scene switch / load sample)
  useEffect(() => {
    useUi.getState().setZoomMin(zoomMinPps(viewportW || 900, duration));
  }, [duration, viewportW]);

  /* playhead follow-scroll (canonical playhead-controller playback update):
     while PLAYING (never mid-scrub), when the playhead pixel leaves the
     viewport, re-center it. Clamp [0, scrollW − viewW]. */
  const playing = useUi((s) => s.playing);
  useEffect(() => {
    if (!playing) return;
    const sc = scrollRef.current;
    if (!sc) return;
    const px = playhead * pxPerSec;
    const viewW = sc.clientWidth;
    if (px < sc.scrollLeft || px > sc.scrollLeft + viewW) {
      sc.scrollLeft = Math.max(0, Math.min(px - viewW / 2, sc.scrollWidth - viewW));
      setScrollLeft(sc.scrollLeft);
    }
  }, [playhead, playing, pxPerSec]);

  const laneBg = (kind: TrackJSON['kind']) =>
    kind === 'main' ? 'var(--lane-video)'
      : kind === 'audio' ? 'var(--lane-audio)'
        : kind === 'caption'
          ? `color-mix(in srgb, ${CAPTION_PARCHMENT} 10%, var(--lane-overlay))` /* R19: dedicated caption-lane tint (local constant — tokens.css is B4-owned) */
          : 'var(--lane-overlay)';

  /* R15 T3 ghost chrome: the drag-preview ghost body per element type (the
     alt-ghost twin) + the conflict edge. */
  const ghostBg = (type: ElementJSON['type']) =>
    type === 'audio' ? 'linear-gradient(to bottom, var(--clip-audio-a), var(--clip-audio-b))'
      : type === 'text' ? 'var(--clip-text)'
        : 'var(--clip-video)';

  /* R15 T9 clip virtualization: skip rendering clips entirely outside
     [scrollLeft − 200, scrollLeft + viewportW + 200]; selected or dragging
     clips are NEVER skipped (with the fixture at default zoom nothing is
     culled — the cull only bites at high zoom + far scroll). */
  const dragGroupIds = dragSessionRef.current
    ? new Set([dragSessionRef.current.anchorId, ...dragSessionRef.current.groupIds])
    : null;
  const clipVisible = (el: ElementJSON): boolean => {
    if (selection.includes(el.id)) return true;
    if (dragGroupIds?.has(el.id)) return true;
    const left = el.startTime * pxPerSec;
    return left + el.duration * pxPerSec >= scrollLeft - 200 && left <= scrollLeft + (viewportW || 900) + 200;
  };

  return (
    <div data-testid="shell-timeline" className="flex min-h-0 flex-1 overflow-hidden">
      {/* ---- track headers column ---- */}
      <div
        id="track-headers"
        ref={headersRef}
        data-testid="shell-track-headers"
        className="relative z-20 flex shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-hairline bg-raised"
        style={{ width: colW, minWidth: colW }}
        onScroll={onHeaderScrollSync}
      >
        {variant.headerStyle === 'readout' ? (
          <div className="flex shrink-0 items-center border-b border-hairline bg-shell px-3" style={{ height: zoneH }}>
            <span className="mono text-[19px] font-semibold tracking-[-0.3px] text-tprimary" data-testid="shell-timeline-tc">
              {tc(playhead)}
            </span>
          </div>
        ) : (
          <div className="flex shrink-0 items-center justify-center border-b border-hairline bg-shell px-2" style={{ height: zoneH }}>
            <span className="mono text-[11px] text-tprimary">{tc(playhead)}</span>
          </div>
        )}
        {scene.tracks.map((track) => (
          <TrackHeader key={track.id} track={track} sceneId={scene.id} height={laneHeight(track.kind)} />
        ))}
        {/* add-track affordance (mock: adds a real audio track) */}
        <button
          className="flex h-[26px] shrink-0 items-center justify-center gap-1 border-b border-hairline text-[11px] text-tmuted hover:bg-[var(--hover-overlay)] hover:text-tprimary"
          aria-label="Add audio track"
          onClick={() => addTrack('audio')}
        >
          + track
        </button>
        {/* filler below tracks keeps the column background solid to the bottom */}
        <div className="min-h-0 flex-1 bg-raised" aria-hidden="true" />
      </div>

      {/* ---- scrollable lanes ---- */}
      <div
        id="timeline-scroll"
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-auto bg-timeline"
        style={{ cursor: dragPreview?.conflict ? 'not-allowed' : undefined }} /* R15 T3: conflict drop = not-allowed cursor */
        tabIndex={-1} /* focusable surface for the §4.9 Shift+F10 keyboard route */
        /* R15 T2 context-menu ROUTER — ONE handler on the scroll surface.
           Clips no longer stopPropagation their right-clicks (canonical §5:
           the contextmenu must bubble). Route: clip under cursor (resolved
           via closest('[data-clip-id]') — the outer clip box carries the id)
           → select-if-unselected FIRST (plain select; linked A/V pair joins
           per the store's selectElement), then the §4.9 clip menu; anything
           else (empty lane, playhead head, transition marker) → the
           timeline-empty menu. The ruler/track headers keep their own
           stopPropagation handlers and never reach this router. */
        onContextMenu={(e) => {
          e.preventDefault();
          const clipNode = (e.target as HTMLElement).closest('[data-clip-id]') as HTMLElement | null;
          if (clipNode) {
            const id = clipNode.getAttribute('data-clip-id')!;
            const hit = findElement(useUi.getState().scenes, id);
            if (hit) {
              if (!useUi.getState().selection.includes(id)) {
                useUi.getState().selectElement(id, false); // select-if-unselected, NO toggle
              }
              clipNode.focus(); // opener for focus-return (§4.9)
              menu.open(e.clientX, e.clientY, buildClipMenuItems(hit.element, hit.track, confirm), 'clip');
              return;
            }
          }
          menu.open(e.clientX, e.clientY, buildMenuItems(), 'timeline-empty');
        }}
        onKeyDown={(e) => {
          /* R15 T2 escape ladder, verified: an ACTIVE gesture (clip drag /
             marquee) is cancelled FIRST by the capture-phase window listeners
             in Clip/Timeline (stopPropagation blocks this handler and the
             shell). With no gesture, Escape intentionally falls through — the
             shell's useShortcuts window listener clears the selection (after
             its audio/tool rungs). The surface adds no competing handler so
             the shell ladder is never bypassed or doubled. */
          if (!isMenuKey(e)) return;
          e.preventDefault();
          e.stopPropagation();
          menu.openForElement(scrollRef.current, buildMenuItems(), 'timeline-empty');
        }}
        onPointerDown={(e) => {
          // roving focus for the keyboard route: empty-surface clicks focus
          // the scroll surface; clips + the ruler focus themselves
          const t = e.target as HTMLElement;
          if (!t.closest('.clip-box') && !t.closest('[role="slider"]')) {
            (e.currentTarget as HTMLElement).focus();
          }
        }}
        onScroll={() => {
          onScrollSync();
          setScrollLeft(scrollRef.current?.scrollLeft ?? 0);
        }}
        onPointerMove={moveMarquee}
        onPointerUp={finishMarquee}
        onPointerCancel={() => setMarquee(null)}
      >
        <div id="timeline-content" className="relative" style={{ width: contentW, minHeight: '100%' }}>
          <Ruler scene={scene} duration={duration} pxPerSec={pxPerSec} playhead={playhead} contentW={contentW} view={{ scrollLeft, viewportW: viewportW || 900 }} />

          {scene.tracks.map((track, trackIdx) => {
            const h = laneHeight(track.kind);
            /* R15 T3: band-highlight the hovered lane while a VALID cross-track
               drop target holds (conflict/frozen previews never highlight). */
            const dragHighlight = !!dragPreview && !dragPreview.conflict && !dragPreview.frozen && dragPreview.hoverIndex === trackIdx;
            /* media-pool drag-to-lane (18 §4.2): lane = drop target while a
               pool card drag is in flight; highlight + copy/not-allowed cursor
               come from mediaDrag. R20-W2 (contract §7): the DROP now commits
               the REAL placement through plan/apply (insertMediaAt with the
               drop time + this lane as the explicit target; Alt = overwrite)
               — the old toast-only path never touched the doc. The frozen
               guard (thread #65) marks non-audio lanes not-allowed while an
               audio source is loaded in source mode. */
            const frozenLane = audioSourceFrozen && track.kind !== 'audio';
            const over = mediaDrag?.overTrackId === track.id;
            const laneDropCls = over ? (mediaDrag && mediaDrag.allowed ? ' pool-lane-ok' : ' pool-lane-bad') : '';
            return (
              <div
                key={track.id}
                aria-disabled={frozenLane || undefined}
                data-frozen={frozenLane || undefined}
                className={`relative shrink-0 border-b border-hairline cursor-crosshair${laneDropCls}`}
                style={{
                  height: h,
                  background: laneBg(track.kind),
                  /* visible-off stays 0.35; the frozen guard dims ON TOP of it
                     (source-mode only — program mode never dims) */
                  opacity: (track.visible ? 1 : 0.35) * (frozenLane ? 0.55 : 1),
                  cursor: track.locked ? 'not-allowed' : over && mediaDrag ? (mediaDrag.allowed ? 'copy' : 'not-allowed') : frozenLane ? 'not-allowed' : undefined,
                }}
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes(POOL_DRAG_TYPE)) return;
                  e.preventDefault();
                  const md = useUi.getState().mediaDrag;
                  if (!md) return;
                  const media = mediaById(md.mediaId);
                  const allowed = !!media && !track.locked && isDroppable(track.kind, media.type) && !frozenLane;
                  e.dataTransfer.dropEffect = allowed ? 'copy' : 'none';
                  if (md.overTrackId !== track.id || md.allowed !== allowed) {
                    useUi.getState().setMediaDrag({ mediaId: md.mediaId, overTrackId: track.id, allowed });
                  }
                }}
                onDragLeave={(e) => {
                  if (!e.dataTransfer.types.includes(POOL_DRAG_TYPE)) return;
                  if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                  const md = useUi.getState().mediaDrag;
                  if (md && md.overTrackId === track.id) {
                    useUi.getState().setMediaDrag({ mediaId: md.mediaId, overTrackId: null, allowed: false });
                  }
                }}
                onDrop={(e) => {
                  if (!e.dataTransfer.types.includes(POOL_DRAG_TYPE)) return;
                  e.preventDefault();
                  const md = useUi.getState().mediaDrag;
                  const media = md ? mediaById(md.mediaId) : undefined;
                  if (md && media) {
                    if (frozenLane) {
                      /* thread #65 honest refusal — pointer-events stay ALLOWED
                         (the lane stays interactive, just not a legal target
                         for the loaded audio source), so the drop gets the
                         truthful toast, never silence */
                      useUi.getState().pushToast({
                        kind: 'error',
                        title: 'Frozen lane',
                        detail: 'an audio source targets audio lanes — video lanes are frozen while the source viewer holds audio (thread #65)',
                      });
                    } else if (md.allowed && md.overTrackId === track.id) {
                      /* R20-W2: real placement — plan+apply through
                         insertMediaAt (mode 'insert'; Alt = 'overwrite') with
                         the drop x as the time + this lane as the explicit
                         target. The success toast is the insert-family
                         toast — what actually happened.
                         NaN guard: a drop event without a finite clientX
                         (jsdom's Event fallback, keyboard-initiated drops)
                         falls back to the planner's playhead semantics —
                         never a NaN time. */
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const rawT = (e.clientX - rect.left) / pxPerSec;
                      const dropTime = Number.isFinite(rawT) ? Math.max(0, rawT) : undefined;
                      useUi.getState().insertMediaAt(md.mediaId, e.altKey ? 'overwrite' : 'insert', { time: dropTime, targetTrackId: track.id });
                    } else {
                      useUi.getState().pushToast({
                        kind: 'error',
                        title: `Can't place ${media.type} media on ${track.badge}`,
                        detail: 'placement compatibility (spec 06 §5.9) — video→V, image→T, audio→A lanes',
                      });
                    }
                  }
                  useUi.getState().setMediaDrag(null);
                }}
                onPointerDown={(e) => {
                  // marquee starts only on the EMPTY lane background (target ===
                  // currentTarget ⇒ not a clip / transition marker). Clip drags
                  // stop propagation concerns aside: clips are children, so a
                  // pointerdown on them never reaches this branch.
                  if (e.target !== e.currentTarget || e.button !== 0 || track.locked) return;
                  startMarquee(e);
                }}
              >
                {dragHighlight && (
                  <div
                    data-testid="drag-lane-highlight"
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{ background: 'color-mix(in srgb, var(--accent-selection) 12%, transparent)' }}
                  />
                )}

                {track.elements.filter(clipVisible).map((el) => (
                  <Clip
                    key={el.id}
                    el={el}
                    track={track}
                    pxPerSec={pxPerSec}
                    laneHeight={h}
                    snapTargets={snapTargets}
                    dragHost={onClipDragEvent}
                    previewSuppressed={dragPreview?.anchorId === el.id}
                    /* R20-W2 translate-preview: displaced followers glide to
                       their final position (the reference's final-state view) */
                    insertPreviewShift={insertPreview?.ok
                      ? insertPreview.geometry.displaced?.find((d) => d.elId === el.id)?.dx
                      : undefined}
                  />
                ))}

                {/* transition markers — Resolve-style box straddling the cut.
                    fixes th_mto31dyp: full-lane height minus a 4px inset, clean
                    1px border, subtle VERTICAL gradient of --transition-mark
                    (30% → 70% opacity), rounded 2px, centered slim crossfade
                    glyph (two overlapping triangles), title/aria preserved.
                    z 7: above clips (1/5), below drag ghosts (10) — see the
                    R15 T9 z-order note at the playhead. */}
                {track.elements.filter((e) => e.transitionOut).map((e) => {
                  const cut = (e.startTime + e.duration) * pxPerSec;
                  const w = e.transitionOut!.duration * pxPerSec;
                  return (
                    <div
                      key={`tr-${e.id}`}
                      className="absolute top-[2px] z-[7] flex items-center justify-center overflow-hidden rounded-[2px]"
                      style={{
                        left: cut - w / 2,
                        width: Math.max(w, 14),
                        height: h - 4,
                        background: 'linear-gradient(to bottom, color-mix(in srgb, var(--transition-mark) 30%, transparent), color-mix(in srgb, var(--transition-mark) 70%, transparent))',
                        border: '1px solid var(--transition-mark)',
                        boxShadow: '0 0 0 1px rgba(0,0,0,0.25)',
                      }}
                      title={`Crossfade · ${e.transitionOut!.presentation} · ${e.transitionOut!.duration}s`}
                      aria-label={`Crossfade transition, ${e.transitionOut!.duration} seconds`}
                      data-testid={`transition-${e.id}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                        {/* slim crossfade glyph: two overlapping triangles */}
                        <path d="M3 3 L8.5 7 L3 11 Z" fill="white" opacity="0.92" />
                        <path d="M11 3 L5.5 7 L11 11 Z" fill="white" opacity="0.92" />
                      </svg>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* ---- R15 T3 drag-preview ghosts: one box per resolved member at
               the target lane band (anchor full, members translucent);
               conflict previews keep the ghost (red edge) but never
               highlight the lane. z = 10 (canonical dragLine layer — below
               the snap indicator 40 / dropIndicator 50 / playhead 100). ---- */}
          {dragPreview?.ghosts.map((g) => (
            <div
              key={`drag-ghost-${g.id}`}
              data-testid={`drag-ghost-${g.id}`}
              data-track-id={g.trackId}
              data-conflict={dragPreview.conflict ?? undefined}
              data-frozen={dragPreview.frozen || undefined}
              aria-hidden="true"
              className="clip-drag-ghost absolute rounded-[2px]"
              style={{
                left: g.startTime * pxPerSec,
                top: g.top + 2,
                width: Math.max(6, g.duration * pxPerSec),
                height: Math.max(4, g.height),
                zIndex: 10,
                background: ghostBg(g.type),
                opacity: dragPreview.conflict ? 0.75 : g.anchor ? 0.9 : 0.55,
                border: dragPreview.conflict ? '1.5px solid var(--danger)' : '1px solid var(--border-strong)',
                cursor: dragPreview.conflict ? 'not-allowed' : 'grabbing',
              }}
            />
          ))}

          {/* ---- R15 T3 insert line: 2px accent line at the new-track
               position (new-track targets only) ---- */}
          {dragPreview?.insertLineY != null && (
            <div
              data-testid="drag-insert-line"
              aria-hidden="true"
              className="pointer-events-none absolute left-0 right-0"
              style={{ top: dragPreview.insertLineY, height: 2, background: 'var(--accent)', zIndex: 10, boxShadow: '0 0 2px rgba(0,0,0,0.6)' }}
            />
          )}

          {/* ---- R20-W2 hover-placement preview (C48): the SAME plan the
               commit would run, painted in the reference's ghost grammar
               (timeline_edit_modes (2).html §1.3) in the z-10 ghost layer.
               ok:false renders NOTHING here — the refusal lives in the
               source bar's tip + status line (never paint geometry the op
               won't perform). All pieces aria-hidden: the a11y route is the
               toolbar's role=status description, not this layer. ---- */}
          {insertPreview?.ok && insertPreview.geometry.ghost && (() => {
            const g = insertPreview.geometry.ghost;
            const laneTop = laneTopAt(g.laneIndex);
            const laneH = laneHeight(g.laneKind);
            const gLeft = g.start * pxPerSec;
            const gWidth = Math.max(6, g.dur * pxPerSec);
            const elsById = new Map<string, ElementJSON>();
            for (const t of scene.tracks) for (const e of t.elements) elsById.set(e.id, e);
            return (
              <div data-testid="insert-preview-layer" aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ zIndex: 10 }}>
                {/* ghost clip — the reference .clip-ghost law: 2px dashed
                    border (≈#646464 → --border-strong token), radius 4,
                    ghostBg(type) fill (contract §3.2) */}
                <div
                  data-testid="insert-preview-ghost"
                  data-track-id={g.trackId}
                  data-start={g.start}
                  data-dur={g.dur}
                  className="clip-drag-ghost absolute rounded-[4px]"
                  style={{
                    left: gLeft, top: laneTop + 2, width: gWidth, height: Math.max(4, laneH - 4),
                    background: ghostBg(insertPreview.type),
                    border: '2px dashed var(--border-strong)',
                    opacity: 0.9,
                  }}
                />
                {/* fit-to-fill speed badge — reference gauge SVG (verbatim)
                    + the computed rate on the ghost (§1.3 badge styles) */}
                {g.speed !== undefined && (
                  <div
                    data-testid="insert-preview-speed-badge"
                    className="absolute flex items-center gap-[3px] rounded-[10px]"
                    style={{
                      left: gLeft + 4, top: laneTop + 4,
                      padding: '1px 8px 1px 6px',
                      background: 'rgba(17,17,17,.62)', border: '1px solid rgba(255,255,255,.28)',
                      color: '#fff', fontSize: 10, fontWeight: 700,
                    }}
                  >
                    <SpeedGaugeIcon />
                    <span>{g.speed.toFixed(2)}×</span>
                  </div>
                )}
                {/* overwrite-span shading — covered regions of EXISTING clips
                    (rgba(0,0,0,.55) + diagonal hatch ≈ the reference's
                    brightness(.45) slot treatment, contract §3.2) */}
                {insertPreview.geometry.overwriteSpans?.map((s, i) => (
                  <div
                    key={`ovs-${i}`}
                    data-testid="insert-preview-overwrite-span"
                    data-track-id={s.trackId}
                    className="absolute"
                    style={{
                      left: s.start * pxPerSec, top: laneTop,
                      width: Math.max(2, s.dur * pxPerSec), height: laneH,
                      background: 'rgba(0,0,0,.55)',
                      backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 4px, rgba(255,255,255,0.08) 4px 8px)',
                    }}
                  />
                ))}
                {/* insert straddler: the 2px split tick at the cut + the
                    right half's dashed ghost at its FINAL position (the
                    clip itself stays rendered; the split tick shows the cut) */}
                {insertPreview.geometry.splitAt !== undefined && (
                  <div
                    data-testid="insert-preview-split-tick"
                    className="absolute"
                    style={{ left: insertPreview.geometry.splitAt * pxPerSec - 1, top: laneTop, width: 2, height: laneH, background: 'var(--accent)', opacity: 0.8 }}
                  />
                )}
                {insertPreview.geometry.splitGhost && (
                  <div
                    data-testid="insert-preview-split-ghost"
                    data-track-id={insertPreview.geometry.splitGhost.trackId}
                    className="clip-drag-ghost absolute rounded-[4px]"
                    style={{
                      left: insertPreview.geometry.splitGhost.start * pxPerSec,
                      top: laneTop + 2,
                      width: Math.max(6, insertPreview.geometry.splitGhost.dur * pxPerSec),
                      height: Math.max(4, laneH - 4),
                      background: ghostBg(insertPreview.type),
                      border: '2px dashed var(--border-strong)',
                      opacity: 0.55,
                    }}
                  />
                )}
                {/* displaced followers: dashed outline at the ORIGINAL
                    position — the clip element itself translates to its
                    final position via Clip.insertPreviewShift (REV-A P2-6:
                    the reference shows the FINAL state) */}
                {insertPreview.geometry.displaced?.map((d) => {
                  const dEl = elsById.get(d.elId);
                  if (!dEl) return null;
                  return (
                    <div
                      key={`dis-${d.elId}`}
                      data-testid={`insert-preview-displaced-ghost-${d.elId}`}
                      className="absolute rounded-[2px]"
                      style={{
                        left: dEl.startTime * pxPerSec, top: laneTop + 2,
                        width: Math.max(6, dEl.duration * pxPerSec), height: Math.max(4, laneH - 4),
                        border: '1px dashed var(--border-strong)', opacity: 0.6,
                      }}
                    />
                  );
                })}
                {/* white displacement arrows — reference SVG paths VERBATIM
                    (§1.3): 16×28 down at the ghost center-x (the source
                    enters the track, drop-shadow like the reference), 28×16
                    right at each displaced clip's ORIGINAL left edge
                    (followers shift — insert/ripple only, by construction) */}
                {insertPreview.geometry.arrows?.down && (
                  <svg
                    data-testid="insert-preview-arrow-down"
                    width={16} height={28} viewBox="0 0 16 28"
                    className="absolute"
                    style={{ left: gLeft + gWidth / 2 - 8, top: laneTop + Math.max(0, (laneH - 28) / 2), filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.6))' }}
                  >
                    <path d="M 5 0 L 11 0 L 11 16 L 16 16 L 8 28 L 0 16 L 5 16 Z" fill="#ffffff" />
                  </svg>
                )}
                {insertPreview.geometry.arrows?.right && insertPreview.geometry.displaced?.map((d) => {
                  const dEl = elsById.get(d.elId);
                  if (!dEl) return null;
                  return (
                    <svg
                      key={`arw-${d.elId}`}
                      data-testid={`insert-preview-arrow-right-${d.elId}`}
                      width={28} height={16} viewBox="0 0 28 16"
                      className="absolute"
                      style={{ left: dEl.startTime * pxPerSec, top: laneTop + Math.max(0, (laneH - 16) / 2), filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.6))' }}
                    >
                      <path d="M 0 5 L 16 5 L 16 0 L 28 8 L 16 16 L 16 11 L 0 11 Z" fill="#ffffff" />
                    </svg>
                  );
                })}
              </div>
            );
          })()}

          {/* ---- R15 T5 SNAP INDICATOR: 2px accent line at 40% opacity
               (z 40 — above drag ghosts 10 / marquee 35, below the playhead
               100), spanning the timeline body (ruler + lanes — the content
               div covers both), positioned at the snapped CONTENT px.
               Rendered ONLY while an active clip gesture (move or trim —
               marquee excluded) holds a snap point AND snapping is on; the
               Clip's applySnap reports the target through the drag seam. ---- */}
          {snapIndicator != null && snap && (
            <div
              data-testid="snap-indicator"
              aria-hidden="true"
              className="pointer-events-none absolute top-0"
              style={{
                left: snapPxToDeviceGrid(snapIndicator * pxPerSec) - PLAYHEAD_LINE_PX / 2,
                bottom: 0,
                width: PLAYHEAD_LINE_PX,
                zIndex: 40,
                background: 'var(--accent)',
                opacity: 0.4,
              }}
            />
          )}

          {/* ---- marquee rubber-band rect (dashed accent border + 10% alpha
               fill via .timeline-marquee; geometry in content coords).
               Renders only once the gesture is ACTIVE — the 5px threshold
               gates the band like the selection writes (R15 T2/T7). ---- */}
          {marquee?.active && (
            <div
              data-testid="timeline-marquee"
              className="timeline-marquee absolute z-[35]"
              aria-hidden="true"
              style={{
                left: Math.min(marquee.x0, marquee.x1),
                top: Math.min(marquee.y0, marquee.y1),
                width: Math.abs(marquee.x1 - marquee.x0),
                height: Math.abs(marquee.y1 - marquee.y0),
              }}
            />
          )}

          {/* empty-scene state row (spec 18 §4.2 state table): no tracks at all */}
          {scene.tracks.length === 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center gap-2 text-[12px] text-tfaint" data-testid="shell-timeline-state-empty">
              <span>Drop clips here, or press Cmd+I</span>
            </div>
          )}

          {/* ---- playhead (2px line + head, spec-05 §14.3 canonical) — spans
               full viewport; line center-aligned (left = px − 1), device-grid
               snapped. R15 T9 z-order: playhead 100 (canonical §17) — above
               the marquee 35, drag ghosts/insert line 10, clips 1/5. ---- */}
          <div className="pointer-events-none absolute bottom-0 top-0 z-[100]" style={{ left: snapPxToDeviceGrid(playhead * pxPerSec) - PLAYHEAD_LINE_PX / 2, height: '100%', zIndex: 100 }} aria-hidden="true">
            <div
              className="absolute bottom-0 top-0"
              style={{ width: PLAYHEAD_LINE_PX, background: 'var(--playhead)', boxShadow: '0 0 1px rgba(0,0,0,0.8)' }}
            />
            <div
              className="pointer-events-auto sticky top-0 z-[100] cursor-col-resize"
              style={{ top: 0, width: 18, height: zoneH + 6, marginLeft: -(18 / 2) + PLAYHEAD_LINE_PX / 2 }}
              onPointerDown={(e) => {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                e.stopPropagation();
              }}
              onPointerMove={(e) => {
                if (e.buttons !== 1) return;
                const box = scrollRef.current?.getBoundingClientRect();
                if (!box) return;
                const x = e.clientX - box.left + (scrollRef.current?.scrollLeft ?? 0);
                /* R15 T8 (R15-F1 FIX 4b): head-drag scrub is CLAMPED to
                   [0, scene duration] (was unclamped above 30 s) and
                   frame-snaps when element snap is OFF (N) — the design's
                   "frame-snap always" for the snap-off leg. With snap ON the
                   pinned closest-wins edge-snap behavior is kept as-is: its
                   raw fallthrough (no target in tolerance) and its
                   shift-suppression both land raw by pinned test contract;
                   the edge targets themselves are frame-clean in practice
                   (the playhead-as-target is the one off-grid possibility —
                   accepted, registered in the worklog). */
                let t = Math.max(0, Math.min(x / pxPerSec, duration));
                if (snap && !e.shiftKey) {
                  /* R15 T5: CLOSEST-WINS (strict <, earliest wins ties) — the
                     old first-match-in-order loop could snap to a far target in
                     front of a nearer one. SHIFT suppresses snapping (canonical
                     §5, every gesture incl. scrub). Head-drag targets include
                     markers + in/out via the shared list above. */
                  const tol = 10 / pxPerSec;
                  let best = t;
                  let bestD = tol;
                  for (const target of snapTargets) {
                    const d = Math.abs(target - t);
                    if (d < bestD) { best = target; bestD = d; }
                  }
                  t = best;
                } else if (!snap) {
                  t = snapToFrame(t);
                }
                setPlayhead(t);
              }}
            >
              <svg width="18" height="13" viewBox="0 0 18 13" className="mt-[1px] block">
                {/* triangle apex at x=9 + the marginLeft offset lands ON the
                    2px line's center (px) — one shared centerline */}
                <path d="M3.5 0h11v6.2L9 11.5 3.5 6.2V0z" fill="var(--playhead)" stroke="rgba(0,0,0,0.35)" strokeWidth="0.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {menu.state && <ContextMenu {...menu.state} onClose={menu.close} />}
    </div>
  );
}

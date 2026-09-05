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
import { tc } from '../../lib/timecode';
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
import { zoomController, createWheelZoomAccumulator } from '../../lib/zoomController';
import { Ruler } from './Ruler';
import { TrackHeader } from './TrackHeader';
import { Clip, buildClipMenuItems, type ClipDragEvent, type ClipDragHost } from './Clip';
import { ContextMenu, isMenuKey, useContextMenu, type MenuItem } from '../shell/ContextMenu';
import { POOL_DRAG_TYPE, isDroppable } from '../shell/MediaPool';
import { useConfirm } from '../shell/ConfirmDialog';

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

/* rAF auto-scroll constants (canonical use-edge-auto-scroll): 100px edge
   threshold, 15px/frame max, intensity ramps 1 − dist/threshold. */
const EDGE_SCROLL_THRESHOLD_PX = 100;
const EDGE_SCROLL_MAX_SPEED = 15;

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
  const contentW = dynamicContentWidth(duration, pxPerSec, viewportW || 900, zoomMin);
  const zoneH = variant.headerStyle === 'readout' ? 44 : 22;
  const colW = variant.headerStyle === 'readout' ? 160 : 112;

  const audioLaneBoost = useUi((s) => s.audioLaneBoost);
  const trackHeightPref = useUi((s) => s.trackHeightPref);
  const laneHeight = (kind: TrackJSON['kind']) => {
    const base = trackHeights(kind, variant.clipStyle);
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

  // snap targets: all clip edges + playhead + sequence ends (spec 05 §9)
  const snapTargets = scene.tracks.flatMap((t) => t.elements.flatMap((e) => [e.startTime, e.startTime + e.duration]));
  snapTargets.push(playhead, 0, duration);

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
     the resolution itself is the pure resolveGroupMove in lib/. */
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
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
     use-edge-auto-scroll; deferred from T2): threshold 100px, max 15px/frame,
     ramp 1 − dist/100; horizontal only — our vertical content is short. */
  const autoScrollRaf = useRef<number | null>(null);
  const stopAutoScroll = () => {
    if (autoScrollRaf.current !== null) {
      cancelAnimationFrame(autoScrollRaf.current);
      autoScrollRaf.current = null;
    }
  };
  const startAutoScroll = () => {
    if (autoScrollRaf.current !== null) return;
    const tick = () => {
      const session = dragSessionRef.current;
      const sc = scrollRef.current;
      if (!session || !sc) {
        autoScrollRaf.current = null;
        return;
      }
      const box = sc.getBoundingClientRect();
      const relativeX = session.pointerX - box.left;
      const viewW = sc.clientWidth || box.width;
      const scrollMax = Math.max(0, sc.scrollWidth - viewW);
      let speed = 0;
      if (relativeX < EDGE_SCROLL_THRESHOLD_PX && sc.scrollLeft > 0) {
        const dist = Math.max(0, relativeX);
        speed = -EDGE_SCROLL_MAX_SPEED * (1 - dist / EDGE_SCROLL_THRESHOLD_PX);
      } else if (relativeX > viewW - EDGE_SCROLL_THRESHOLD_PX && sc.scrollLeft < scrollMax) {
        const dist = Math.max(0, viewW - relativeX);
        speed = EDGE_SCROLL_MAX_SPEED * (1 - dist / EDGE_SCROLL_THRESHOLD_PX);
      }
      if (speed !== 0) {
        const next = Math.max(0, Math.min(scrollMax, sc.scrollLeft + speed));
        if (next !== sc.scrollLeft) {
          sc.scrollLeft = next;
          setScrollLeft(next); // keep ruler ticks + clip virtualization live
        }
      }
      autoScrollRaf.current = requestAnimationFrame(tick);
    };
    autoScrollRaf.current = requestAnimationFrame(tick);
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
    // 'end' — release / cancel
    stopAutoScroll();
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
    kind === 'main' ? 'var(--lane-video)' : kind === 'audio' ? 'var(--lane-audio)' : 'var(--lane-overlay)';

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
               come from mediaDrag, drop commits an honest-mock toast (the
               store has no insertElement action yet) */
            const over = mediaDrag?.overTrackId === track.id;
            const laneDropCls = over ? (mediaDrag && mediaDrag.allowed ? ' pool-lane-ok' : ' pool-lane-bad') : '';
            return (
              <div
                key={track.id}
                className={`relative shrink-0 border-b border-hairline cursor-crosshair${laneDropCls}`}
                style={{
                  height: h,
                  background: laneBg(track.kind),
                  opacity: track.visible ? 1 : 0.35,
                  cursor: track.locked ? 'not-allowed' : over && mediaDrag ? (mediaDrag.allowed ? 'copy' : 'not-allowed') : undefined,
                }}
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes(POOL_DRAG_TYPE)) return;
                  e.preventDefault();
                  const md = useUi.getState().mediaDrag;
                  if (!md) return;
                  const media = mediaById(md.mediaId);
                  const allowed = !!media && !track.locked && isDroppable(track.kind, media.type);
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
                    if (md.allowed && md.overTrackId === track.id) {
                      useUi.getState().pushToast({
                        kind: 'success',
                        title: `Placed ${media.name} on ${track.badge}`,
                        detail: 'mock: insertElement lands with the engine round (spec 15 §5.4 / 06 §5.9)',
                      });
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
                  />
                ))}

                {/* transition markers — Resolve-style box straddling the cut */}
                {track.elements.filter((e) => e.transitionOut).map((e) => {
                  const cut = (e.startTime + e.duration) * pxPerSec;
                  const w = e.transitionOut!.duration * pxPerSec;
                  return (
                    <div
                      key={`tr-${e.id}`}
                      className="absolute top-[3px] z-[7] flex items-center justify-center overflow-hidden rounded-[2px]"
                      style={{
                        left: cut - w / 2,
                        width: Math.max(w, 14),
                        height: h - 8,
                        background: 'linear-gradient(135deg, var(--transition-mark), color-mix(in srgb, var(--transition-mark) 45%, #000))',
                        border: '1px solid var(--transition-mark)',
                        boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
                      }}
                      title={`Crossfade · ${e.transitionOut!.presentation} · ${e.transitionOut!.duration}s`}
                      aria-label={`Crossfade transition, ${e.transitionOut!.duration} seconds`}
                      data-testid={`transition-${e.id}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                        <path d="M3 3 L11 11 M11 3 L3 11" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.95" />
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
                let t = Math.max(0, x / pxPerSec);
                if (snap) {
                  const tol = 10 / pxPerSec;
                  for (const target of snapTargets) {
                    if (Math.abs(target - t) < tol) { t = target; break; }
                  }
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

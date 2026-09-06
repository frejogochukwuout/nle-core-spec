/* The mini store (DESIGN D6, audit M2 + review round fixes) — one Zustand
   slice: doc (data) + ui (view) + history (whole-doc snapshots, max 50).
   Laws baked in:
   - commit(mutator) wraps every doc change: snapshot → past, clear future,
     ONE entry per committed gesture (nudge = one entry per click).
   - drag session: beginDrag snapshots the doc (no history), preview* mutates
     the live doc freely, endDrag pushes exactly ONE history entry
     (pre-drag doc), cancelDrag restores it (Esc).
   - interaction lock: while dragActive, ONLY Esc is honored — commit(),
     every command action, selection changes, zoom/snap/playhead writes are
     all gated (review fix #4: the keyboard layer is only half the surface).
   - selection validation after every history op / commit.
   - no-op guard: an action that changes nothing pushes NO history entry.
   - split law (review fix #6): the SELECTED clip is the split target; the
     topmost-under-playhead fallback runs ONLY when nothing is selected. */

import { create } from 'zustand';
import {
  seedDoc,
  mintClipId,
  laneForMedia,
  TRACK_VIDEO,
  TRACK_AUDIO,
  type Clip,
  type Doc,
  type Media,
  type Track,
  type TrackKind,
} from '../lib/mockData';
import {
  MAX_HISTORY,
  MIN_DUR,
  DEFAULT_ZOOM_STEP,
  PPS_STEPS,
  neighborBounds,
  wouldOverlap,
  insertPlacement,
  insertPushedIds,
  clipsOfTrack,
  clampTrimStart,
  clampTrimEnd,
  splitPoint,
  contentEnd,
  clampPlayhead,
  quantize,
  insertionAt,
  rippleShiftAfter,
} from '../lib/geometry';

export interface ToastMsg {
  kind: 'info' | 'error';
  text: string;
  seq: number; // increments so identical texts still re-fire the toast
}

/** R18j (thread #16): common viewer aspect ratios. `ratio` = numeric w/h
 *  (sizing math); `css` feeds `aspect-ratio` directly. */
export const VIEWER_ASPECTS = [
  { id: '16:9', label: '16:9', ratio: 16 / 9, css: '16 / 9' },
  { id: '4:3', label: '4:3', ratio: 4 / 3, css: '4 / 3' },
  { id: '1:1', label: '1:1', ratio: 1, css: '1 / 1' },
  { id: '9:16', label: '9:16', ratio: 9 / 16, css: '9 / 16' },
  { id: '2.39:1', label: '2.39:1 · Cinema', ratio: 2.39, css: '2.39 / 1' },
] as const;
export type ViewerAspect = (typeof VIEWER_ASPECTS)[number]['id'];

/** ViewerAspect → its entry (falls back to 16:9 for stray values). */
export function aspectEntry(id: string): (typeof VIEWER_ASPECTS)[number] {
  return VIEWER_ASPECTS.find((a) => a.id === id) ?? VIEWER_ASPECTS[0];
}

/* ---- R18k track-binding selectors (threads #21/#23/#3) --------------
 * Pure helpers — every consumer (Timeline lanes, Viewer lookup, ruler
 * extent) asks the same question: which tracks/clips does the bound
 * mini actually show? */

/** The tracks the mini renders: bound pair in paired mode, the bound
 *  video track alone in video-only mode. Order = render order (video
 *  first, audio under). */
export function visibleTracks(
  doc: Doc,
  mode: 'paired' | 'video',
  boundVideo: string,
  boundAudio: string,
): Track[] {
  const video = doc.tracks.find((t) => t.id === boundVideo && t.kind === 'video');
  if (!video) return [];
  if (mode === 'video') return [video];
  const audio = doc.tracks.find((t) => t.id === boundAudio && t.kind === 'audio');
  return audio ? [video, audio] : [video];
}

/** Clips living on the visible tracks — the mini's entire world for
 *  the ruler extent, viewer wrap and playback content. */
export function boundClips(
  doc: Doc,
  mode: 'paired' | 'video',
  boundVideo: string,
  boundAudio: string,
): Clip[] {
  const ids = new Set(visibleTracks(doc, mode, boundVideo, boundAudio).map((t) => t.id));
  return doc.clips.filter((c) => ids.has(c.trackId));
}

/** The bound track of a given kind — the append/insert target. */
export function boundTrackOfKind(
  doc: Doc,
  kind: TrackKind,
  boundVideo: string,
  boundAudio: string,
): Track | undefined {
  const want = kind === 'audio' ? boundAudio : boundVideo;
  return doc.tracks.find((t) => t.id === want && t.kind === kind);
}

export interface MiniState {
  doc: Doc;
  playhead: number; // unquantized seconds (D5)
  playing: boolean;
  zoomStep: number; // 0-4 (D7)
  /** snap OFF by default (R18e, feedback #10 — the magnet surprised the
   *  reviewer on first drag; turning it on is now a deliberate act) */
  snapOn: boolean;
  /** ripple edit mode (R18e, feedback #16): destructive edits close the
   *  gap — delete/end-trim/start-trim shift downstream followers */
  rippleOn: boolean;
  /** filmstrip vs color-block clip bodies (R18e, feedback #15) */
  filmstripOn: boolean;
  /** A1 lane visibility (R18e, feedback #8) — view state only */
  audioLaneVisible: boolean;
  /** R18i (thread #12, ruler): the ruler extent — max(contentEnd, min 8s,
   *  viewport coverage) synced from the Timeline component. setPlayhead
   *  clamps HERE, not to contentEnd: an NLE ruler is scrubbable across its
   *  whole surface, even past the last clip (Premiere/Resolve/FCP all
   *  populate + allow scrubbing the full visible ruler). Playback wrap
   *  stays at contentEnd (D3.3) — that is about CONTENT, this is about
   *  the ruler surface. Default 8 = the pre-R18i min runway. */
  rulerEnd: number;
  setRulerEnd: (end: number) => void;
  /* ---- R18j layout state (threads #13/#14/#15/#16/#19) -------------
   *  View-only chrome state — never in history, always drag-gated (a
   *  relayout mid-gesture would invalidate the live pointer math).
   *  viewerMax (thread #19) is COMPOSED, not stored per-panel: the
   *  effective collapse is `individual flag || viewerMax`, so entering
   *  max mode leaves the user's individual choices intact and exiting
   *  restores their exact layout. timelineMinimized (thread #13) is
   *  "minimize", not hide — the compact strip keeps seeking/drag/trim. */
  poolCollapsed: boolean;
  inspectorCollapsed: boolean;
  timelineMinimized: boolean;
  viewerMax: boolean;
  /** R18j (thread #16): viewer frame aspect — the letterboxed stage AR */
  viewerAspect: ViewerAspect;
  togglePool: () => void;
  toggleInspector: () => void;
  toggleTimelineMin: () => void;
  toggleViewerMax: () => void;
  setPoolCollapsed: (collapsed: boolean) => void;
  setInspectorCollapsed: (collapsed: boolean) => void;
  setTimelineMinimized: (minimized: boolean) => void;
  setViewerAspect: (aspect: ViewerAspect) => void;

  /* ---- R18k track binding (threads #21/#23/#3) --------------------
   * The mini is a window onto the PROJECT, not the whole project: it
   * binds ONE video track (+ ONE audio track in paired mode) and edits
   * there. 'paired' (default) = the current V1+A1 grammar. 'video' =
   * the simplified special mode (thread #23): video clips only, audio
   * is what's baked into them — one lane, pool filtered to video with
   * no tabs, no A1 anywhere. trackBindingLocked = the embedded-host
   * injection (thread #3): the outer wrapper pinned the pair, so the
   * lane-head selector is disabled AND the labels are invisible (an
   * injected environment has no numbered track name to show). View
   * state — never history, drag-gated like the rest of the layout
   * family (a rebind mid-gesture would swap the lanes under the
   * pointer). */
  trackMode: 'paired' | 'video';
  boundVideoTrack: string;
  boundAudioTrack: string;
  trackBindingLocked: boolean;
  setTrackMode: (mode: 'paired' | 'video') => void;
  setBoundVideoTrack: (trackId: string) => void;
  setBoundAudioTrack: (trackId: string) => void;
  setTrackBindingLocked: (locked: boolean) => void;
  selectedId: string | null;
  dragActive: boolean; // interaction lock (audit M2)
  toast: ToastMsg | null;
  past: Doc[];
  future: Doc[];
  /** pre-drag doc snapshot — only meaningful while dragActive */
  dragSnapshot: Doc | null;

  /* internal (test surface) */
  _validateSelection: () => void;
  _commit: (mutate: (doc: Doc) => Doc | void) => boolean;

  /* history */
  undo: () => void;
  redo: () => void;

  /* ui actions */
  select: (id: string | null) => void;
  setPlayhead: (t: number) => void;
  togglePlay: () => void;
  tick: (dt: number) => void; // rAF playback step (wrap law in D3.3)
  setZoomStep: (step: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleSnap: () => void;
  toggleRipple: () => void;
  toggleFilmstrip: () => void;
  toggleAudioLane: () => void;
  pushToast: (kind: ToastMsg['kind'], text: string) => void;
  dismissToast: () => void;

  /* drag session (M2): begin → preview* → end|cancel */
  beginDrag: () => void;
  endDrag: () => void;
  cancelDrag: () => void;
  previewMove: (id: string, newStart: number) => void;
  previewTrim: (id: string, edge: 'start' | 'end', newTime: number) => void;

  /* doc actions (each = one history entry; snapping is resolved by the
     caller via resolveSnap — these clamp, they do not snap) */
  moveClip: (id: string, newStart: number) => void;
  trimClip: (id: string, edge: 'start' | 'end', newTime: number) => void;
  splitAtPlayhead: () => void;
  deleteSelected: () => void;
  /** RH cut styles (R18e, feedback #7): discard the selected clip's head
   *  / tail at the playhead (裁剪开始 / 裁剪结束). Ripple-aware. */
  cutHeadAtPlayhead: () => void;
  cutTailAtPlayhead: () => void;
  addClipFromMedia: (mediaId: string) => void;
  /** pool→timeline DnD commit (R18e): media → track at requested time;
   *  exact spot when free, next fitting gap otherwise. */
  insertMediaAt: (mediaId: string, trackId: string, t: number) => void;
  nudge: (id: string, delta: number) => void;
  reset: () => void;
  /* R19 (thread #47): track selection — the inspector's second subject.
   * Mutually exclusive with clip selection (ONE subject at a time). */
  selectedTrackId: string | null;
  selectTrack: (id: string | null) => void;
  /** R19 (thread #53): seek to the head of the under-playhead clip (the
   *  bound VIDEO world — the viewer's world); taps at a clip head walk
   *  back edit by edit. */
  seekToClipHead: () => void;
  /** R19: the follower ids the live insert-preview is pushing (affordance
   *  state for is-pushed; recomputed every previewMove event, cleared at
   *  drag end). */
  pushedIds: string[];
}

function clampZoom(step: number): number {
  // R19: the ladder length is the single source of truth (was hardcoded 4)
  return Math.min(Math.max(Math.round(step), 0), PPS_STEPS.length - 1);
}

const findMedia = (doc: Doc, id: string): Media | undefined => doc.media.find((m) => m.id === id);
const findClip = (doc: Doc, id: string): Clip | undefined => doc.clips.find((c) => c.id === id);

export const useMini = create<MiniState>((set, get) => {
  /** commit — one history entry per call; returns whether anything changed. */
  const commit = (mutate: (doc: Doc) => Doc | void): boolean => {
    const state = get();
    if (state.dragActive) return false; // interaction lock: no commits mid-drag
    const draft: Doc = {
      tracks: state.doc.tracks,
      media: state.doc.media,
      clips: state.doc.clips.map((c) => ({ ...c })),
    };
    const result = mutate(draft) ?? draft;
    const changed = docChanged(state.doc, result);
    if (!changed) return false;
    const past = [...state.past, state.doc].slice(-MAX_HISTORY);
    set({ doc: result, past, future: [] });
    get()._validateSelection();
    return true;
  };

  /** structural "did anything change" (identity would false-positive on
      preview map() re-copies) — shared by commit and endDrag (review #10). */
  const docChanged = (a: Doc, b: Doc): boolean =>
    a.clips.length !== b.clips.length ||
    a.clips.some(
      (c, i) =>
        c.start !== b.clips[i]?.start ||
        c.duration !== b.clips[i]?.duration ||
        c.id !== b.clips[i]?.id ||
        c.trackId !== b.clips[i]?.trackId ||
        c.mediaId !== b.clips[i]?.mediaId,
    );

  return {
    doc: seedDoc(),
    playhead: 0,
    playing: false,
    zoomStep: DEFAULT_ZOOM_STEP,
    snapOn: false, // default OFF (R18e, feedback #10)
    rippleOn: false,
    filmstripOn: true,
    audioLaneVisible: true,
    rulerEnd: 8, // R18i: floor = the min runway; Timeline raises it to viewport coverage
    // R18j layout defaults: everything expanded, normal (non-max) viewer
    poolCollapsed: false,
    inspectorCollapsed: false,
    timelineMinimized: false,
    viewerMax: false,
    viewerAspect: '16:9',
    /* R18k (threads #21/#23/#3): default binding = the basic V1/A1 pair —
     * the seed project's only pair, so the default frame is unchanged. */
    trackMode: 'paired',
    boundVideoTrack: TRACK_VIDEO,
    boundAudioTrack: TRACK_AUDIO,
    trackBindingLocked: false,
    selectedId: null,
    selectedTrackId: null,
    pushedIds: [],
    dragActive: false,
    toast: null,
    past: [],
    future: [],
    dragSnapshot: null,

    _validateSelection: () => {
      const { selectedId, selectedTrackId, doc, trackMode, boundVideoTrack, boundAudioTrack } = get();
      if (selectedId && !findClip(doc, selectedId)) set({ selectedId: null });
      /* R19: the track selection heals the same survive-iff-visible law —
       * a doc swap (undo/redo/story control) can strand it on a track that
       * no longer exists or left the bound world. (The collapsed audio
       * lane is still "visible" here — the head badge keeps selecting it.) */
      if (selectedTrackId) {
        const vis = visibleTracks(doc, trackMode, boundVideoTrack, boundAudioTrack).some(
          (t) => t.id === selectedTrackId,
        );
        if (!vis) set({ selectedTrackId: null });
      }
    },

    _commit: commit,

    undo: () => {
      const { past, doc, future, dragActive } = get();
      if (dragActive) return; // interaction lock
      if (past.length === 0) {
        get().pushToast('info', 'Nothing to undo.');
        return;
      }
      const prev = past[past.length - 1];
      set({ doc: prev, past: past.slice(0, -1), future: [doc, ...future].slice(0, MAX_HISTORY) });
      get()._validateSelection();
    },

    redo: () => {
      const { future, doc, past, dragActive } = get();
      if (dragActive) return;
      if (future.length === 0) {
        get().pushToast('info', 'Nothing to redo.');
        return;
      }
      const next = future[0];
      set({ doc: next, future: future.slice(1), past: [...past, doc].slice(-MAX_HISTORY) });
      get()._validateSelection();
    },

    select: (id) => {
      if (get().dragActive) return; // interaction lock
      if (id && !findClip(get().doc, id)) return;
      // R19: clip selection REPLACES track selection — one inspector subject
      set({ selectedId: id, selectedTrackId: null });
    },

    selectTrack: (id) => {
      if (get().dragActive) return; // same lock as select (lane head-click is a pointerdown)
      if (id && !get().doc.tracks.some((t) => t.id === id)) return;
      // R19 (thread #47): the lane's empty surface + the head badge select
      // the TRACK (the inspector shows its card); replaces clip selection
      set({ selectedTrackId: id, selectedId: null });
    },

    seekToClipHead: () => {
      const state = get();
      if (state.dragActive) return;
      const world = boundClips(state.doc, state.trackMode, state.boundVideoTrack, state.boundAudioTrack)
        .filter((c) => {
          const m = findMedia(state.doc, c.mediaId);
          return m && m.kind !== 'audio';
        })
        .sort((a, b) => a.start - b.start);
      let target: number;
      const under = world.find(
        (c) => state.playhead >= c.start - 1e-9 && state.playhead < c.start + c.duration,
      );
      if (under) {
        if (Math.abs(state.playhead - under.start) > 1e-9) {
          target = under.start; // the head of the clip under the playhead
        } else {
          // sitting exactly ON a head → step to the previous edit point
          // (repeated taps walk back clip by clip — the pro-NLE behavior)
          const idx = world.indexOf(under);
          target = idx > 0 ? world[idx - 1].start : 0;
        }
      } else {
        // in a gap (or past the tail): the most recent head before the playhead
        const prev = [...world].reverse().find((c) => c.start < state.playhead - 1e-9);
        target = prev ? prev.start : 0;
      }
      get().setPlayhead(target);
    },

    setPlayhead: (t) => {
      if (get().dragActive) return; // interaction lock (review #4)
      // R18i: clamp to the RULER extent — scrubbing over the last shown
      // timestamp keeps following the pointer (the reported bug); the old
      // contentEnd clamp pinned the playhead at the last clip's edge while
      // the ruler surface continued bare for hundreds of px
      set({ playhead: clampPlayhead(t, get().rulerEnd) });
    },

    setRulerEnd: (end) => {
      const next = Math.max(end, 0);
      if (Math.abs(get().rulerEnd - next) < 1e-9) return; // no-op churn guard
      set({ rulerEnd: next });
    },

    togglePlay: () => {
      const state = get();
      if (state.dragActive) return; // interaction lock
      // R18k: "empty" means the BOUND world is empty (video-only mode with
      // only audio clips bound-elsewhere is still nothing to play here)
      const world = boundClips(state.doc, state.trackMode, state.boundVideoTrack, state.boundAudioTrack);
      if (!state.playing && contentEnd(world) === 0) {
        // empty doc → immediate pause, never a zero-length loop (D3.3)
        set({ playing: false });
        get().pushToast('info', 'Nothing to play — the timeline is empty.');
        return;
      }
      set({ playing: !state.playing });
    },

    tick: (dt) => {
      const state = get();
      const { playing, playhead, doc } = state;
      if (!playing) return;
      // R18k: playback content = the bound tracks' clips (same world the
      // ruler and viewer show)
      const end = contentEnd(
        boundClips(doc, state.trackMode, state.boundVideoTrack, state.boundAudioTrack),
      );
      if (end === 0) {
        // doc emptied WHILE playing (review #5): stop, never a zero-length loop
        set({ playing: false, playhead: 0 });
        return;
      }
      let next = playhead + dt;
      if (next >= end) next = 0; // wrap to 0 and continue (D3.3, audit m1)
      set({ playhead: next });
    },

    setZoomStep: (step) => {
      if (get().dragActive) return; // interaction lock
      set({ zoomStep: clampZoom(step) });
    },
    zoomIn: () => get().setZoomStep(get().zoomStep + 1),
    zoomOut: () => get().setZoomStep(get().zoomStep - 1),
    toggleSnap: () => {
      if (get().dragActive) return; // interaction lock
      set({ snapOn: !get().snapOn });
    },
    toggleRipple: () => {
      if (get().dragActive) return; // interaction lock
      set({ rippleOn: !get().rippleOn });
    },
    toggleFilmstrip: () => {
      if (get().dragActive) return; // interaction lock
      set({ filmstripOn: !get().filmstripOn });
    },
    toggleAudioLane: () => {
      if (get().dragActive) return; // interaction lock
      set({ audioLaneVisible: !get().audioLaneVisible });
    },

    /* ---- R18j layout actions (view-only, drag-gated) ---------------- */

    togglePool: () => {
      if (get().dragActive) return; // relayout mid-gesture breaks pointer math
      set({ poolCollapsed: !get().poolCollapsed });
    },

    toggleInspector: () => {
      if (get().dragActive) return;
      set({ inspectorCollapsed: !get().inspectorCollapsed });
    },

    toggleTimelineMin: () => {
      if (get().dragActive) return;
      set({ timelineMinimized: !get().timelineMinimized });
    },

    toggleViewerMax: () => {
      if (get().dragActive) return;
      set({ viewerMax: !get().viewerMax });
    },

    setPoolCollapsed: (collapsed) => {
      if (get().dragActive) return;
      if (get().poolCollapsed === collapsed) return; // no-op churn guard
      set({ poolCollapsed: collapsed });
    },

    setInspectorCollapsed: (collapsed) => {
      if (get().dragActive) return;
      if (get().inspectorCollapsed === collapsed) return;
      set({ inspectorCollapsed: collapsed });
    },

    setTimelineMinimized: (minimized) => {
      if (get().dragActive) return;
      if (get().timelineMinimized === minimized) return;
      set({ timelineMinimized: minimized });
    },

    setViewerAspect: (aspect) => {
      if (get().dragActive) return; // the frame resize moves hit targets
      if (get().viewerAspect === aspect) return;
      set({ viewerAspect: aspect });
    },

    /* ---- R18k track binding (threads #21/#23/#3) --------------------
     * View-only, drag-gated. Selection law (review P2-3, unified): keep
     * the selectedId iff its clip stays VISIBLE after the change — a
     * selection pointing at an invisible clip is a trap (inspector facts
     * about off-screen state; keyboard targets acting blind), but a
     * selection that survives the world change is continuity, not a
     * trap. ONE helper, three setters. */

    setTrackMode: (mode) => {
      const state = get();
      if (state.dragActive) return;
      if (state.trackMode === mode) return;
      if (state.trackBindingLocked) return; // pinned environment — mode is the host's call
      const sel = state.selectedId;
      const selClip = sel ? state.doc.clips.find((c) => c.id === sel) : undefined;
      const visibleIds = new Set(
        visibleTracks(state.doc, mode, state.boundVideoTrack, state.boundAudioTrack).map((t) => t.id),
      );
      set({
        trackMode: mode,
        selectedId: selClip && visibleIds.has(selClip.trackId) ? sel : null,
        // R19: track selection survives iff the track stays visible (the
        // same unified law — a TrackInspector about an invisible track is
        // the same trap the clip law was written against)
        selectedTrackId:
          state.selectedTrackId && visibleIds.has(state.selectedTrackId) ? state.selectedTrackId : null,
      });
    },

    setBoundVideoTrack: (trackId) => {
      const state = get();
      if (state.dragActive) return;
      if (state.trackBindingLocked) return; // injected environment — pinned
      if (state.boundVideoTrack === trackId) return;
      const track = state.doc.tracks.find((t) => t.id === trackId && t.kind === 'video');
      if (!track) return; // only real video tracks bind
      const sel = state.selectedId;
      const selClip = sel ? state.doc.clips.find((c) => c.id === sel) : undefined;
      const visibleIds = new Set(
        visibleTracks(state.doc, state.trackMode, trackId, state.boundAudioTrack).map((t) => t.id),
      );
      set({
        boundVideoTrack: trackId,
        selectedId: selClip && visibleIds.has(selClip.trackId) ? sel : null,
        selectedTrackId:
          state.selectedTrackId && visibleIds.has(state.selectedTrackId) ? state.selectedTrackId : null,
      });
    },

    setBoundAudioTrack: (trackId) => {
      const state = get();
      if (state.dragActive) return;
      if (state.trackBindingLocked) return;
      if (state.boundAudioTrack === trackId) return;
      const track = state.doc.tracks.find((t) => t.id === trackId && t.kind === 'audio');
      if (!track) return;
      const sel = state.selectedId;
      const selClip = sel ? state.doc.clips.find((c) => c.id === sel) : undefined;
      const visibleIds = new Set(
        visibleTracks(state.doc, state.trackMode, state.boundVideoTrack, trackId).map((t) => t.id),
      );
      set({
        boundAudioTrack: trackId,
        selectedId: selClip && visibleIds.has(selClip.trackId) ? sel : null,
        selectedTrackId:
          state.selectedTrackId && visibleIds.has(state.selectedTrackId) ? state.selectedTrackId : null,
      });
    },

    setTrackBindingLocked: (locked) => {
      if (get().dragActive) return;
      if (get().trackBindingLocked === locked) return;
      set({ trackBindingLocked: locked });
    },

    pushToast: (kind, text) => {
      const seq = (get().toast?.seq ?? 0) + 1;
      set({ toast: { kind, text, seq } });
    },
    dismissToast: () => set({ toast: null }),

    /* ---- drag session ------------------------------------------------ */

    beginDrag: () => {
      const state = get();
      if (state.dragActive) return;
      set({ dragActive: true, dragSnapshot: state.doc });
    },

    endDrag: () => {
      const state = get();
      if (!state.dragActive || !state.dragSnapshot) return;
      const pristine = state.dragSnapshot;
      const changed = docChanged(pristine, state.doc);
      const past = changed ? [...state.past, pristine].slice(-MAX_HISTORY) : state.past;
      set({ dragActive: false, dragSnapshot: null, past, future: changed ? [] : state.future, pushedIds: [] });
      get()._validateSelection();
    },

    cancelDrag: () => {
      const state = get();
      if (!state.dragActive || !state.dragSnapshot) return;
      set({ doc: state.dragSnapshot, dragActive: false, dragSnapshot: null, pushedIds: [] });
      get()._validateSelection();
    },

    previewMove: (id, newStart) => {
      /* R19 — the drag-drop law (see docs/OT-SEAMS.md). FREE drag: the
       * clip follows the pointer across the whole lane (the one-lane
       * clamp is gone). Computed from the PRE-DRAG SNAPSHOT every event
       * (idempotent — the same discipline as the ripple preview):
       *   span [R, R+dur) free of same-track siblings → plain move;
       *   conflicting → insertPlacement pushes the conflicting tail
       *   right (Premiere insert-edit geometry; the single-pair window's
       *   stand-in for OT's new-track escape). The component resolves
       *   the magnet BEFORE calling (magnetMove — both edges, frozen
       *   snapshot targets). */
      const state = get();
      if (!state.dragActive) return; // previews only exist inside a session
      if (!state.dragSnapshot) return;
      const snapClip = findClip(state.dragSnapshot, id);
      if (!snapClip) return;
      const r = Math.max(0, newStart);
      set({
        doc: { ...state.doc, clips: insertPlacement(state.dragSnapshot.clips, id, r, snapClip.duration) },
        pushedIds: insertPushedIds(state.dragSnapshot.clips, id, r, snapClip.duration),
      });
    },

    previewTrim: (id, edge, newTime) => {
      const state = get();
      if (!state.dragActive) return;
      const clip = findClip(state.doc, id);
      if (!clip) return;

      /* RIPPLE preview (R18e): each event renders the state FROM THE
       * PRE-DRAG SNAPSHOT (idempotent — followers land at snapshotStart +
       * delta every time, never accumulating drift):
       *   end-trim   — dur = clamp(t) − snapStart (media-bounded, followers
       *                pushed, the neighbor bound does NOT apply);
       *   start-trim — LEFT EDGE FROZEN at snapStart (documented law: the
       *                remaining content closes onto the edit point). */
      if (state.rippleOn && state.dragSnapshot) {
        const snap = findClip(state.dragSnapshot, id);
        if (snap) {
          const snapEnd = snap.start + snap.duration;
          const media = findMedia(state.doc, clip.mediaId);
          const { prevEnd } = neighborBounds(state.dragSnapshot, snap);
          let newDur: number;
          if (edge === 'start') {
            const t = Math.min(
              Math.max(newTime, Math.max(prevEnd, media ? snapEnd - media.duration : -Infinity)),
              snapEnd - MIN_DUR,
            );
            newDur = snapEnd - t;
          } else {
            const t = Math.min(
              Math.max(newTime, snap.start + MIN_DUR),
              snap.start + (media?.duration ?? Infinity),
            );
            newDur = t - snap.start;
          }
          const delta = newDur - snap.duration;
          // R18f (review P1-2): quantize the DELTA (not each result) and floor
          // followers at the edited clip's new end — an off-grid follower
          // must never round into an overlap with the edited clip
          const shift = quantize(delta);
          const floor = snap.start + newDur;
          const snapshot = state.dragSnapshot;
          set({
            doc: {
              ...state.doc,
              clips: state.doc.clips.map((c) => {
                if (c.id === id) {
                  return {
                    ...c,
                    // start-trim keeps the frozen left edge; end-trim keeps start
                    start: edge === 'start' ? snap.start : c.start,
                    duration: newDur,
                  };
                }
                // follower: same-track clips whose SNAPSHOT start was at/after
                // the snapshot end → live start = snapshot start + shift
                const twin = snapshot.clips.find((x) => x.id === c.id) ?? c;
                if (twin.trackId === snap.trackId && twin.start >= snapEnd - 1e-9) {
                  return { ...c, start: Math.max(floor, twin.start + shift) };
                }
                return c;
              }),
            },
          });
          return;
        }
      }

      const { prevEnd, nextStart } = neighborBounds(state.doc, clip);
      set({
        doc: {
          ...state.doc,
          clips: state.doc.clips.map((c) => {
            if (c.id !== id) return c;
            if (edge === 'start') {
              const r = clampTrimStart(newTime, c, prevEnd, findMedia(state.doc, c.mediaId));
              return { ...c, start: r.start, duration: r.duration };
            }
            const r = clampTrimEnd(newTime, c, nextStart, findMedia(state.doc, c.mediaId));
            return { ...c, start: r.start, duration: r.duration };
          }),
        },
      });
    },

    /* ---- doc actions -------------------------------------------------- */

    moveClip: (id, newStart) => {
      /* R19 (OT seam — the timeline.move wire law): REJECT on conflict,
       * never clamp. A programmatic move must land the span free of
       * same-track siblings or refuse with an honest toast (the mini's
       * rendering of {ok:false, code:'CONFLICT'}). The GESTURE path
       * resolves conflicts via insert-push instead (previewMove+
       * endDrag) — that's the UX law; THIS is the seam law. Negative
       * newStart is rejected (OT requireNonNegativeTicks). */
      const state = get();
      if (state.dragActive) return; // guard BEFORE the toast — no mid-gesture spam
      const clip = findClip(state.doc, id);
      if (!clip) return;
      if (!Number.isFinite(newStart) || newStart < 0) {
        get().pushToast('error', 'Move refused — the start must be at or after 0.');
        return;
      }
      const trackClips = clipsOfTrack(state.doc, clip.trackId);
      if (wouldOverlap(trackClips, newStart, clip.duration, id)) {
        get().pushToast(
          'error',
          `No room at ${newStart.toFixed(1)}s — the ${clip.duration}s clip would overlap its neighbor.`,
        );
        return;
      }
      commit((doc) => {
        const c = doc.clips.find((x) => x.id === id);
        if (!c) return;
        c.start = newStart;
      });
    },

    trimClip: (id, edge, newTime) => {
      const state = get();
      const clip = findClip(state.doc, id);
      if (!clip) return;

      /* RIPPLE commit (R18e) — same laws as the preview path, computed from
       * the resting doc: end-trim bounded by the MEDIA duration (followers
       * are pushed, not blocked); start-trim freezes the left edge and
       * closes the head gap. */
      if (state.rippleOn) {
        const snapEnd = clip.start + clip.duration;
        const media = findMedia(state.doc, clip.mediaId);
        const { prevEnd } = neighborBounds(state.doc, clip);
        let newDur: number;
        if (edge === 'start') {
          const lo = Math.max(prevEnd, media ? snapEnd - media.duration : -Infinity);
          const t = Math.min(Math.max(newTime, lo), snapEnd - MIN_DUR);
          newDur = snapEnd - t;
        } else {
          const lo = clip.start + MIN_DUR;
          const hi = clip.start + (media?.duration ?? Infinity);
          newDur = Math.min(Math.max(newTime, lo), hi) - clip.start;
        }
        if (newDur === clip.duration) return; // no-op guard
        const delta = newDur - clip.duration;
        const floor = clip.start + newDur; // the edited clip's new end
        commit((doc) => {
          const c = doc.clips.find((x) => x.id === id);
          if (!c) return;
          doc.clips = rippleShiftAfter(doc.clips, c.trackId, snapEnd, delta, id, floor).map((x) =>
            x.id === id ? { ...x, duration: newDur } : x,
          );
        });
        return;
      }

      const { prevEnd, nextStart } = neighborBounds(state.doc, clip);
      commit((doc) => {
        const c = doc.clips.find((x) => x.id === id);
        if (!c) return;
        if (edge === 'start') {
          const { start, duration } = clampTrimStart(newTime, c, prevEnd, findMedia(doc, c.mediaId));
          c.start = start;
          c.duration = duration;
        } else {
          const { start, duration } = clampTrimEnd(newTime, c, nextStart, findMedia(doc, c.mediaId));
          c.start = start;
          c.duration = duration;
        }
      });
    },

    splitAtPlayhead: () => {
      const state = get();
      if (state.dragActive) return; // interaction lock

      // review fix #6: the selected clip is the target, full stop. The
      // topmost-under-playhead fallback runs ONLY with NO selection.
      let target: string | null = null;
      if (state.selectedId) {
        const clip = findClip(state.doc, state.selectedId);
        if (clip && splitPoint(state.playhead, clip) !== null) target = state.selectedId;
      } else {
        // topmost (last-starting) clip under the playhead, any track
        const under = state.doc.clips
          .filter((c) => splitPoint(state.playhead, c) !== null)
          .sort((a, b) => b.start - a.start);
        target = under[0]?.id ?? null;
      }
      if (!target) {
        get().pushToast(
          'info',
          state.selectedId
            ? 'Playhead is not inside the selected (≥1s) clip.'
            : 'Nothing under the playhead to split.',
        );
        return;
      }
      const id = target;
      const p = splitPoint(state.playhead, findClip(state.doc, id)!)!;
      commit((doc) => {
        const c = doc.clips.find((x) => x.id === id);
        if (!c) return;
        const q = splitPoint(get().playhead, c);
        if (q === null) return;
        const right: Clip = {
          id: mintClipId(),
          trackId: c.trackId,
          mediaId: c.mediaId,
          start: q,
          duration: c.start + c.duration - q,
        };
        c.duration = q - c.start;
        doc.clips.push(right);
      });
      // keep the left half selected (the split product the user is editing)
      if (p !== null) set({ selectedId: id });
    },

    deleteSelected: () => {
      const { selectedId, dragActive, rippleOn } = get();
      if (dragActive) return; // interaction lock
      if (!selectedId) {
        get().pushToast('info', 'Nothing selected.');
        return;
      }
      const id = selectedId;
      // RIPPLE (R18e): followers at/after the deleted end shift LEFT to
      // close the gap — the recommended mini-mode edit style (feedback #16)
      const clip = findClip(get().doc, id);
      const gap = rippleOn && clip ? clip.duration : 0;
      const removedEnd = clip ? clip.start + clip.duration : 0;
      commit((doc) => {
        const c = doc.clips.find((x) => x.id === id);
        const end = c ? c.start + c.duration : removedEnd;
        doc.clips = doc.clips.filter((x) => x.id !== id);
        if (gap > 0 && c) {
          // followers close onto the removed clip's START (R18f floor law)
          doc.clips = rippleShiftAfter(doc.clips, c.trackId, end, -gap, undefined, c.start);
        }
      });
    },

    cutHeadAtPlayhead: () => {
      const state = get();
      if (state.dragActive) return; // interaction lock
      const target = cutTarget(state);
      if (!target) {
        // R18f (review P3): honest phrasing for both no-selection and
        // selection-elsewhere — the old text blamed "the selected clip"
        // even when nothing was selected
        get().pushToast(
          'info',
          state.selectedId
            ? 'Playhead is not inside the selected clip.'
            : 'Nothing under the playhead to cut.',
        );
        return;
      }
      const clip = findClip(state.doc, target)!;
      const t = Math.min(Math.max(quantize(state.playhead), clip.start), clip.start + clip.duration - MIN_DUR);
      if (t <= clip.start) {
        get().pushToast('info', 'Nothing to cut before the playhead.');
        return;
      }
      get().trimClip(target, 'start', t); // ripple-aware when rippleOn
      set({ selectedId: target });
    },

    cutTailAtPlayhead: () => {
      const state = get();
      if (state.dragActive) return; // interaction lock
      const target = cutTarget(state);
      if (!target) {
        get().pushToast(
          'info',
          state.selectedId
            ? 'Playhead is not inside the selected clip.'
            : 'Nothing under the playhead to cut.',
        );
        return;
      }
      const clip = findClip(state.doc, target)!;
      const t = Math.max(Math.min(quantize(state.playhead), clip.start + clip.duration), clip.start + MIN_DUR);
      if (t >= clip.start + clip.duration) {
        get().pushToast('info', 'Nothing to cut after the playhead.');
        return;
      }
      get().trimClip(target, 'end', t); // ripple-aware when rippleOn
      set({ selectedId: target });
    },

    addClipFromMedia: (mediaId) => {
      const state = get();
      if (state.dragActive) return; // interaction lock
      const media = findMedia(state.doc, mediaId);
      if (!media) return;
      // R18k (threads #21/#3): the append target is the BOUND track of the
      // media's kind — not a global constant. Video-only mode is strictly
      // video media (thread #23: "filter to just video types" — audio is
      // baked into the clips, stills live in the full editor; the pool
      // never offers them there, but the store re-validates like the
      // drop zones do).
      const wantKind = laneForMedia(media.kind);
      if (state.trackMode === 'video' && media.kind !== 'video') {
        state.pushToast('info', 'Video-only mode — audio and stills live in the full editor.');
        return;
      }
      const track = boundTrackOfKind(state.doc, wantKind, state.boundVideoTrack, state.boundAudioTrack);
      if (!track) {
        // R18k (review P2-2): refusal parity — every other refusal toasts;
        // a silent no-op reads as a dead button
        state.pushToast('info', `No ${wantKind} track is bound — nothing to append to.`);
        return;
      }
      const trackId = track.id;
      const ok = commit((doc) => {
        const trackClips = doc.clips.filter((c) => c.trackId === trackId);
        const end = contentEnd(trackClips);
        doc.clips.push({
          id: mintClipId(),
          trackId,
          mediaId,
          start: quantize(end),
          duration: media.duration,
        });
      });
      if (ok) state.pushToast('info', `Added ${media.name} to ${trackId}.`);
    },

    insertMediaAt: (mediaId, trackId, t) => {
      const state = get();
      if (state.dragActive) return; // interaction lock
      const media = findMedia(state.doc, mediaId);
      if (!media) return;
      // R18k (threads #21/#3): kind routing (D3.2) now resolves to the
      // BOUND track of the media's kind — the drop zone is the source of
      // truth for WHICH track, but the store re-validates against the
      // binding (and the mode: video-only accepts strictly video media).
      const wantKind = laneForMedia(media.kind);
      if (state.trackMode === 'video' && media.kind !== 'video') {
        state.pushToast('info', 'Video-only mode — audio and stills live in the full editor.');
        return;
      }
      const bound = boundTrackOfKind(state.doc, wantKind, state.boundVideoTrack, state.boundAudioTrack);
      if (!bound || trackId !== bound.id) {
        state.pushToast('info', `${media.kind} media belongs on ${bound?.id ?? 'its bound lane'}.`);
        return;
      }
      const trackClips = state.doc.clips.filter((c) => c.trackId === trackId);
      const place = insertionAt(trackClips, media.duration, t);
      if (!place) {
        state.pushToast('error', `No room for ${media.name} at that spot — the lane is full to the end.`);
        return;
      }
      const ok = commit((doc) => {
        doc.clips.push({
          id: mintClipId(),
          trackId,
          mediaId,
          start: place.start,
          duration: media.duration,
        });
      });
      if (ok) {
        state.pushToast(
          'info',
          place.exact
            ? `Placed ${media.name} at ${place.start}s on ${trackId}.`
            : `Placed ${media.name} at the next open spot (${place.start}s on ${trackId}).`,
        );
      }
    },

    nudge: (id, delta) => {
      // R19: nudge routes the moveClip law — nudging into a neighbor is
      // REFUSED with a toast (was: silent clamp-park, the same one-lane
      // street the drag overhaul removes). Precise edits deserve honest
      // refusal, not silent parking.
      const state = get();
      const clip = findClip(state.doc, id);
      if (!clip) return;
      get().moveClip(id, clip.start + delta);
    },

    reset: () => {
      set({
        doc: seedDoc(),
        playhead: 0,
        playing: false,
        zoomStep: DEFAULT_ZOOM_STEP,
        snapOn: false,
        rippleOn: false,
        filmstripOn: true,
        audioLaneVisible: true,
        rulerEnd: 8,
        poolCollapsed: false,
        inspectorCollapsed: false,
        timelineMinimized: false,
        viewerMax: false,
        viewerAspect: '16:9',
        trackMode: 'paired',
        boundVideoTrack: TRACK_VIDEO,
        boundAudioTrack: TRACK_AUDIO,
        trackBindingLocked: false,
        selectedId: null,
        selectedTrackId: null,
        pushedIds: [],
        dragActive: false,
        toast: null,
        past: [],
        future: [],
        dragSnapshot: null,
      });
    },
  };
});

/** Shared target resolution for the cut styles (R18e): the SELECTED clip
 *  when the playhead is inside it, else the topmost clip under the
 *  playhead (split law parity — review fix #6). */
function cutTarget(state: { selectedId: string | null; doc: Doc; playhead: number }): string | null {
  if (state.selectedId) {
    const clip = findClip(state.doc, state.selectedId);
    if (clip && state.playhead >= clip.start && state.playhead < clip.start + clip.duration) {
      return state.selectedId;
    }
    return null; // a selection exists but the playhead is elsewhere — honest
  }
  const under = state.doc.clips
    .filter((c) => state.playhead >= c.start && state.playhead < c.start + c.duration)
    .sort((a, b) => b.start - a.start);
  return under[0]?.id ?? null;
}

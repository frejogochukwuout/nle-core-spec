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
} from '../lib/mockData';
import {
  MAX_HISTORY,
  DEFAULT_ZOOM_STEP,
  neighborBounds,
  clampMove,
  clampTrimStart,
  clampTrimEnd,
  splitPoint,
  contentEnd,
  clampPlayhead,
  quantize,
} from '../lib/geometry';

export interface ToastMsg {
  kind: 'info' | 'error';
  text: string;
  seq: number; // increments so identical texts still re-fire the toast
}

export interface MiniState {
  doc: Doc;
  playhead: number; // unquantized seconds (D5)
  playing: boolean;
  zoomStep: number; // 0-4 (D7)
  snapOn: boolean; // governs grid quantization AND magnet (D7)
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
  addClipFromMedia: (mediaId: string) => void;
  nudge: (id: string, delta: number) => void;
  reset: () => void;
}

function clampZoom(step: number): number {
  return Math.min(Math.max(Math.round(step), 0), 4);
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
    snapOn: true,
    selectedId: null,
    dragActive: false,
    toast: null,
    past: [],
    future: [],
    dragSnapshot: null,

    _validateSelection: () => {
      const { selectedId, doc } = get();
      if (selectedId && !findClip(doc, selectedId)) set({ selectedId: null });
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
      set({ selectedId: id });
    },

    setPlayhead: (t) => {
      if (get().dragActive) return; // interaction lock (review #4)
      set({ playhead: clampPlayhead(t, contentEnd(get().doc.clips)) });
    },

    togglePlay: () => {
      const state = get();
      if (state.dragActive) return; // interaction lock
      if (!state.playing && contentEnd(state.doc.clips) === 0) {
        // empty doc → immediate pause, never a zero-length loop (D3.3)
        set({ playing: false });
        get().pushToast('info', 'Nothing to play — the timeline is empty.');
        return;
      }
      set({ playing: !state.playing });
    },

    tick: (dt) => {
      const { playing, playhead, doc } = get();
      if (!playing) return;
      const end = contentEnd(doc.clips);
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
      set({ dragActive: false, dragSnapshot: null, past, future: changed ? [] : state.future });
      get()._validateSelection();
    },

    cancelDrag: () => {
      const state = get();
      if (!state.dragActive || !state.dragSnapshot) return;
      set({ doc: state.dragSnapshot, dragActive: false, dragSnapshot: null });
      get()._validateSelection();
    },

    previewMove: (id, newStart) => {
      const state = get();
      if (!state.dragActive) return; // previews only exist inside a session
      const clip = findClip(state.doc, id);
      if (!clip) return;
      const { prevEnd, nextStart } = neighborBounds(state.doc, clip);
      // the component already applied resolveSnap (magnet+grid); clamps only
      set({
        doc: {
          ...state.doc,
          clips: state.doc.clips.map((c) =>
            c.id === id
              ? { ...c, start: clampMove(newStart, c.duration, prevEnd, nextStart) }
              : c,
          ),
        },
      });
    },

    previewTrim: (id, edge, newTime) => {
      const state = get();
      if (!state.dragActive) return;
      const clip = findClip(state.doc, id);
      if (!clip) return;
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
      const state = get();
      const clip = findClip(state.doc, id);
      if (!clip) return;
      const { prevEnd, nextStart } = neighborBounds(state.doc, clip);
      commit((doc) => {
        const c = doc.clips.find((x) => x.id === id);
        if (!c) return;
        c.start = clampMove(newStart, c.duration, prevEnd, nextStart);
      });
    },

    trimClip: (id, edge, newTime) => {
      const state = get();
      const clip = findClip(state.doc, id);
      if (!clip) return;
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
      const { selectedId, dragActive } = get();
      if (dragActive) return; // interaction lock
      if (!selectedId) {
        get().pushToast('info', 'Nothing selected.');
        return;
      }
      const id = selectedId;
      commit((doc) => {
        doc.clips = doc.clips.filter((c) => c.id !== id);
      });
    },

    addClipFromMedia: (mediaId) => {
      const state = get();
      if (state.dragActive) return; // interaction lock
      const media = findMedia(state.doc, mediaId);
      if (!media) return;
      const trackId = laneForMedia(media.kind) === 'audio' ? TRACK_AUDIO : TRACK_VIDEO;
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

    nudge: (id, delta) => {
      const state = get();
      const clip = findClip(state.doc, id);
      if (!clip) return;
      const { prevEnd, nextStart } = neighborBounds(state.doc, clip);
      commit((doc) => {
        const c = doc.clips.find((x) => x.id === id);
        if (!c) return;
        c.start = clampMove(c.start + delta, c.duration, prevEnd, nextStart);
      });
    },

    reset: () => {
      set({
        doc: seedDoc(),
        playhead: 0,
        playing: false,
        zoomStep: DEFAULT_ZOOM_STEP,
        snapOn: true,
        selectedId: null,
        dragActive: false,
        toast: null,
        past: [],
        future: [],
        dragSnapshot: null,
      });
    },
  };
});

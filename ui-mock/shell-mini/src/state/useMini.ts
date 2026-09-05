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
  MIN_DUR,
  DEFAULT_ZOOM_STEP,
  neighborBounds,
  clampMove,
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
    snapOn: false, // default OFF (R18e, feedback #10)
    rippleOn: false,
    filmstripOn: true,
    audioLaneVisible: true,
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

    insertMediaAt: (mediaId, trackId, t) => {
      const state = get();
      if (state.dragActive) return; // interaction lock
      const media = findMedia(state.doc, mediaId);
      if (!media) return;
      // kind routing (D3.2): audio→A1, video/image→V1 — the drop zone is
      // the source of truth for WHICH track, but the store re-validates.
      const needTrack = laneForMedia(media.kind) === 'audio' ? TRACK_AUDIO : TRACK_VIDEO;
      if (trackId !== needTrack) {
        state.pushToast('info', `${media.kind} media belongs on ${needTrack}.`);
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
        snapOn: false,
        rippleOn: false,
        filmstripOn: true,
        audioLaneVisible: true,
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

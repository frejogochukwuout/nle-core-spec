/* insertPlan — R20-W2 (DESIGN-R20 D2, REV-B P2-4/P2-5): the PURE half of the
   insert-media split. planInsertMedia computes EVERYTHING the old monolithic
   insertMediaAt computed — placement, splits, ripple shifts, overwrite-span
   trims, marker re-offsets, sourceStart shifts, transitionOut sever/keep,
   linkedTo severing, the pushedRight double-shift guard, the
   placeOnTop-with-overlaps→insert variant, the aux/replace/fitToFill
   branches — but as a DECLARED plan (geometry + a field-level patch list),
   never touching a store.

   Why: hover-placement preview (C48) needs the edit result BEFORE the commit,
   and preview==commit can only be guaranteed by construction — the preview
   and the commit run the SAME planner over the same doc. The ids are minted
   through an injected idFactory so PREVIEW calls can pass a counting-only
   fake that never advances the store's real id counter; the commit path
   (insertMediaAt → applyInsertPlan) plans with the real one.

   The planner works on a PRIVATE deep clone (the same clone discipline the
   store's withHistory uses) and records every mutation it makes as an op —
   the dry-run IS the patch. applyInsertPlan (in useUiStore) replays the ops
   verbatim under ONE withHistory entry.

   OT seam map (contract §4, ledger C45): insert = insert{ripple:true}
   composite, overwrite = split+delete+insert, append = insert@laneTail,
   placeOnTop = engine insertElementOnNewTrack, rippleOverwrite =
   rippleDelete+insert, replace = delete+insert(+overwrite spans),
   fitToFill = insert+updateElements{retime}. All app-composites today; the
   mock documents the eventual wire mapping, it does not claim OT parity. */

import {
  mediaById,
  type ClipMarker,
  type ElementJSON,
  type ElementType,
  type SceneJSON,
  type TrackJSON,
} from './mockData';
import { clamp, snapToFrame } from './timecode';
import { spansOverlap, trackAcceptsElement } from './timelinePlacement';
import { RATE_MIN, RATE_MAX } from './trimLaws';

/* the 7 Resolve edit functions (R19 union — moved here so the planner owns
   the mode type; useUiStore re-exports it, keeping the import surface
   stable for existing consumers) */
export type InsertMediaMode = 'insert' | 'overwrite' | 'append' | 'placeOnTop' | 'rippleOverwrite' | 'replace' | 'fitToFill';

/** id minting seam — the store passes its real nextId; previews pass a
 *  counting-only fake (never advances the real counter). */
export type InsertIdFactory = (prefix: string) => string;

/** honest refusal — verbatim today's toast payloads (kind/title/detail). */
export interface InsertPlanReason {
  kind: 'info' | 'error';
  title: string;
  detail: string;
}

/* ---- the patch descriptor: the exact field-level mutation list the
   applier executes. Order matters — ops replay in emission order, mirroring
   the dry-run's mutation sequence exactly. ---- */
export type InsertPatchOp =
  /** placeOnTop lane-create: minted track inserted above `insertIndex`. */
  | { op: 'createTrack'; trackId: string; track: Omit<TrackJSON, 'elements'> & { elements: ElementJSON[] }; insertIndex: number }
  /** append a fully-formed element (the placed clip / a split right half). */
  | { op: 'insertElement'; trackId: string; element: ElementJSON }
  /** remove an element (replace's target / fully-covered overwrite spans). */
  | { op: 'removeElement'; trackId: string; id: string }
  /** field-level patch on an existing element; a value of `undefined` means
   *  DELETE the key (transitionOut sever, linkedTo sever) — the applier
   *  deletes, never assigns undefined. */
  | { op: 'patchElement'; trackId: string; id: string; fields: Partial<ElementJSON> };

export interface InsertPlanGeometry {
  /** where the NEW clip lands (fitToFill carries the computed rate).
   *
   * `laneIndex` is WORKING-scene numbering — the planner mutates its private
   * clone (placeOnTop's minted track spliced in), so the index is the
   * POST-COMMIT lane number. `insertLineAfter` (R20-W6FIX P2-1) is set when
   * the plan MINTS a track: the LIVE-scene splice index the new track enters
   * at — the renderer draws the ghost at that INSERT LINE
   * (laneTopAt(insertLineAfter)), never at a lane-index walk over the LIVE
   * array (the prefix above the splice is identical, so the two agree for
   * today's single mint site — the field pins the law by construction). */
  ghost?: { trackId: string; start: number; dur: number; speed?: number; laneIndex: number; laneKind: TrackJSON['kind']; insertLineAfter?: number };
  /** reference arrow grammar: down = the source enters the track, right =
   *  followers shift (insert/ripple only — the reference shows the right
   *  arrow in exactly those two views). */
  arrows?: { down: boolean; right: boolean };
  /** regions of EXISTING clips the placement covers (overwrite family:
   *  overwrite / rippleOverwrite / replace / fitToFill). */
  overwriteSpans?: { trackId: string; start: number; dur: number }[];
  /** pure-translate shifts (insert/ripple followers). A clip whose duration
   *  also changes (overwrite trims) is NOT here — it is shaded, not moved. */
  displaced?: { elId: string; from: number; to: number; dx: number }[];
  /** insert straddler: where the cut lands (split tick) + the right half's
   *  final resting place (dashed outline ghost). */
  splitAt?: number;
  splitGhost?: { trackId: string; start: number; dur: number };
}

export interface InsertPlan {
  ok: boolean;
  /** refusal payload — the applier pushes it as the honest toast. Absent
   *  with ok:false only for the (defensive) no-active-scene case, which
   *  today's insertMediaAt also leaves silent. */
  reason?: InsertPlanReason;
  /** success toast payload (ok plans) — verbatim today's kinds/titles. */
  toast?: { kind: 'success'; title: string; detail: string };
  sceneId: string;
  mode: InsertMediaMode;
  mediaId: string;
  mediaName: string;
  type: ElementType;
  /** resolved target lane (rendering + status line). */
  targetTrackId?: string;
  geometry: InsertPlanGeometry;
  patch: InsertPatchOp[];
  /** the 5 shared modes clear the selection today; replace/fitToFill do not. */
  clearSelection: boolean;
}

/** planner inputs — everything the old insertMediaAt read from the store. */
export interface InsertPlanContext {
  playhead: number;
  loop: { start: number; end: number };
  selection: string[];
  /** explicit time override (insertMediaAt's opts.time — pool drops). */
  time?: number;
  /** explicit lane target (pool drop path — validated for compatibility). */
  targetTrackId?: string;
  /** R22 #84/#85 — the SOURCE viewer's trimmed in/out range (seconds into
   *  the source media). ABSENT = the full media (today's behavior — the
   *  backward-compat default, pinned). When present: placed duration =
   *  end−start (clamped to the media's remaining tail + the 30s cap) and
   *  sourceStart = start (the placed clip references the trimmed-in
   *  offset); fitToFill retimes the RANGE length. */
  sourceRange?: { start: number; end: number };
}

/* R22 #84: the range-aware placement duration + source offset. The clamps
   mirror the old Math.min(m.duration ?? 4, 30) law exactly when no range. */
function sourceDurOf(m: { duration: number | null }, ctx: InsertPlanContext): number {
  if (!ctx.sourceRange) return Math.min(m.duration ?? 4, 30);
  const len = ctx.sourceRange.end - ctx.sourceRange.start;
  const tail = (m.duration ?? 4) - ctx.sourceRange.start;
  return Math.max(FRAME, Math.min(len, tail, 30));
}
function sourceStartOf(ctx: InsertPlanContext): number {
  return ctx.sourceRange ? Math.max(0, ctx.sourceRange.start) : 0;
}

/* ---- private deep clone (mirrors useUiStore's cloneEl/clone discipline:
   nested effects/params, transitionOut, clip markers and eq tuples are
   cloned so the dry-run can mutate freely without leaking into the live
   doc — the R11/R13 undo-round-trip lesson applied to planning). A local
   twin, not an import, so the planner stays store-cycle-free. ---- */
const cloneEl = (e: ElementJSON): ElementJSON => ({
  ...e,
  ...(e.effects ? { effects: e.effects.map((f) => ({ ...f, ...(f.params ? { params: { ...f.params } } : {}) })) } : {}),
  ...(e.transitionOut ? { transitionOut: { ...e.transitionOut } } : {}),
  ...(e.markers ? { markers: e.markers.map((m) => ({ ...m })) } : {}),
  ...(e.eq ? { eq: [...e.eq] as ElementJSON['eq'] } : {}),
});
const cloneScenes = (scenes: SceneJSON[]): SceneJSON[] =>
  scenes.map((s) => ({ ...s, tracks: s.tracks.map((t) => ({ ...t, elements: t.elements.map(cloneEl) })), markers: s.markers.map((m) => ({ ...m })) }));

const findInScene = (sc: SceneJSON, id: string): { el: ElementJSON; track: TrackJSON } | null => {
  for (const t of sc.tracks) {
    const el = t.elements.find((e) => e.id === id);
    if (el) return { el, track: t };
  }
  return null;
};

const FRAME = 1 / 24;
const EPS = 1e-9;

/** shared refusal word for the "no unlocked lane" toasts (verbatim). */
const laneWord = (type: ElementType): string => (type === 'audio' ? 'audio' : type === 'image' ? 'overlay' : 'video');
const MODE_LABEL: Record<Exclude<InsertMediaMode, 'replace' | 'fitToFill'>, string> = {
  insert: 'Inserted', overwrite: 'Overwrote', append: 'Appended',
  placeOnTop: 'Placed on top', rippleOverwrite: 'Ripple-overwrote',
};
const SUCCESS_DETAIL = 'real placement (frame-snap + half-open spans + ripple laws, spec 06 §5.9) — undoable as one step';

/* ---- the recording twin of the old store-private applyOverwriteSpans:
   mutates the WORKING track exactly like the original (fully-covered →
   removed, head/tail straddles → trimmed, middle straddle → split with the
   R19-REV P2 split law: right half built from the PRE-mutation shape keeps
   transitionOut + severs linkedTo; left half loses transitionOut), and
   every mutation is recorded as an op. Returns the DISPLACED seconds —
   ripple-overwrite's delta = dur − displaced. ---- */
function planOverwriteSpans(
  track: TrackJSON,
  time: number,
  dur: number,
  ops: InsertPatchOp[],
  idFactory: InsertIdFactory,
): number {
  let displaced = 0;
  const overlaps = track.elements.filter((e) => spansOverlap({ startTime: time, duration: dur }, e));
  for (const e of overlaps) {
    const eStart = e.startTime, eEnd = e.startTime + e.duration;
    if (eStart >= time - EPS && eEnd <= time + dur + EPS) {
      // fully covered → removed
      track.elements = track.elements.filter((x) => x.id !== e.id);
      displaced += e.duration;
      ops.push({ op: 'removeElement', trackId: track.id, id: e.id });
    } else if (eStart >= time - EPS) {
      // covered from the left → trim the head (sourceStart + markers ride)
      const cut = time + dur - eStart;
      const fields: Partial<ElementJSON> = { startTime: time + dur, duration: e.duration - cut };
      if (e.sourceStart !== undefined) { e.sourceStart += cut; fields.sourceStart = e.sourceStart; }
      if (e.markers) {
        e.markers = e.markers.filter((cm) => cm.offset >= cut).map((cm) => ({ ...cm, offset: cm.offset - cut }));
        fields.markers = e.markers;
      }
      e.startTime = time + dur;
      e.duration -= cut;
      displaced += cut;
      ops.push({ op: 'patchElement', trackId: track.id, id: e.id, fields });
    } else if (eEnd <= time + dur + EPS) {
      // covered from the right → trim the tail (markers filtered against
      // the NEW duration — original order preserved)
      displaced += eEnd - time;
      e.duration = time - eStart;
      const fields: Partial<ElementJSON> = { duration: e.duration };
      if (e.markers) {
        e.markers = e.markers.filter((cm) => cm.offset <= e.duration);
        fields.markers = e.markers;
      }
      ops.push({ op: 'patchElement', trackId: track.id, id: e.id, fields });
    } else {
      // straddle: the new clip covers the MIDDLE → split into left + right
      const rightDur = eEnd - (time + dur);
      const leftDur = time - eStart;
      displaced += dur;
      if (rightDur >= FRAME - EPS) {
        const right: ElementJSON = {
          ...e, id: idFactory(`${e.id}-b`),
          startTime: time + dur,
          duration: rightDur,
          ...(e.sourceStart !== undefined ? { sourceStart: e.sourceStart + (time + dur - eStart) } : {}),
          markers: e.markers ? e.markers.filter((cm) => cm.offset >= leftDur + dur).map((cm) => ({ ...cm, offset: cm.offset - (leftDur + dur) })) : undefined,
        };
        delete right.linkedTo;
        track.elements.push(right);
        ops.push({ op: 'insertElement', trackId: track.id, element: right });
      }
      e.duration = leftDur;
      delete e.transitionOut;
      ops.push({ op: 'patchElement', trackId: track.id, id: e.id, fields: { duration: leftDur, transitionOut: undefined } });
    }
  }
  return displaced;
}

/** covered sub-spans of EXISTING content — the overwrite-shading geometry
 *  (the honest regions the placement replaces; empty gap stays unshaded). */
function coveredSpans(track: TrackJSON, time: number, dur: number): { trackId: string; start: number; dur: number }[] {
  return track.elements
    .filter((e) => spansOverlap({ startTime: time, duration: dur }, e))
    .map((e) => ({
      trackId: track.id,
      start: Math.max(time, e.startTime),
      dur: Math.min(time + dur, e.startTime + e.duration) - Math.max(time, e.startTime),
    }));
}

/** THE PLANNER — pure: no store, no ids minted into shared state, no
 *  mutation of the passed scenes (it clones internally). Mirrors every
 *  branch of the pre-R20-W2 insertMediaAt (useUiStore.ts:864-1056 @ 5b3d351). */
export function planInsertMedia(
  scenes: SceneJSON[],
  activeSceneId: string,
  mediaId: string,
  mode: InsertMediaMode,
  ctx: InsertPlanContext,
  idFactory: InsertIdFactory,
): InsertPlan {
  const base: InsertPlan = {
    ok: false, sceneId: activeSceneId, mode, mediaId, mediaName: mediaId,
    type: 'video', geometry: {}, patch: [], clearSelection: false,
  };
  const m = mediaById(mediaId);
  if (!m) {
    return { ...base, reason: { kind: 'error', title: 'Edit action', detail: `unknown media ${mediaId}` } };
  }
  const scene = scenes.find((x) => x.id === activeSceneId);
  if (!scene) {
    /* today's insertMediaAt returns silently here — preserved (no reason →
       the applier fires no toast; never a NEW silent branch, just the old
       one, documented). */
    return base;
  }
  const type: ElementType = m.type === 'audio' ? 'audio' : m.type === 'image' ? 'image' : 'video';
  base.type = type;
  base.mediaName = m.name;

  // private working copy — the dry-run mutates ONLY this
  const work = cloneScenes(scenes);
  const wscene = work.find((x) => x.id === activeSceneId)!;
  const ops: InsertPatchOp[] = [];
  const geometry: InsertPlanGeometry = {};

  const laneIndexOf = (t: TrackJSON): number => wscene.tracks.findIndex((x) => x.id === t.id);
  const ghostOf = (t: TrackJSON, start: number, dur: number, speed?: number) => ({
    trackId: t.id, start, dur, ...(speed !== undefined ? { speed } : {}),
    laneIndex: Math.max(0, laneIndexOf(t)), laneKind: t.kind,
  });

  /* ---- replace: needs a selected element on a compatible track ---- */
  if (mode === 'replace') {
    const sel = ctx.selection.map((id) => findInScene(wscene, id)).filter(Boolean) as { el: ElementJSON; track: TrackJSON }[];
    const target = sel.find((h) => trackAcceptsElement(h.track.kind, type) && !h.track.locked);
    if (!target) {
      return { ...base, reason: { kind: 'info', title: 'Replace', detail: 'select a clip on a compatible track first (replace swaps the selected clip for this media — Resolve edit-function semantics)' } };
    }
    const start = target.el.startTime;
    const t = target.track;
    /* shading BEFORE any mutation — the covered regions are the PRE-op
       doc state (the replaced clip + any downstream content the longer
       replacement covers); computing after would see the trimmed doc. */
    const dur = sourceDurOf(m, ctx);
    geometry.overwriteSpans = coveredSpans(t, start, dur);
    t.elements = t.elements.filter((e) => e.id !== target.el.id);
    ops.push({ op: 'removeElement', trackId: t.id, id: target.el.id });
    /* replace = remove + OVERWRITE-place: downstream neighbors the longer
       replacement now covers are trimmed/removed too (the naive version
       left overlaps on the doc — caught while writing the R19 tests). */
    planOverwriteSpans(t, start, dur, ops, idFactory);
    const el: ElementJSON = { id: idFactory('el-'), type, trackId: t.id, name: m.name, startTime: start, duration: dur, sourceStart: sourceStartOf(ctx), mediaId, speed: 1, opacity: 1 };
    t.elements.push(el);
    ops.push({ op: 'insertElement', trackId: t.id, element: el });
    geometry.ghost = ghostOf(t, start, dur);
    geometry.arrows = { down: true, right: false };
    return {
      ...base, ok: true, targetTrackId: t.id, geometry, patch: ops, clearSelection: false,
      toast: { kind: 'success', title: `Replaced with ${m.name}`, detail: 'replace: selected clip removed, media placed at its start (spec 06 edit functions)' },
    };
  }

  /* ---- fitToFill: needs a >1-frame loop range; rate-clamped honest refusal ---- */
  if (mode === 'fitToFill') {
    const span = ctx.loop.end - ctx.loop.start;
    /* R22 #84: the retimed length is the RANGE (end−start), not the whole
       media — "trim the range of source ... apply to source for the
       timeline insertion operation" (#84/#85). */
    const srcDur = ctx.sourceRange
      ? ctx.sourceRange.end - ctx.sourceRange.start
      : m.duration ?? 0;
    if (span <= FRAME || srcDur <= 0) {
      return { ...base, reason: { kind: 'info', title: 'Fit to Fill', detail: 'set an In/Out range (I / O) with duration, and use a media asset with known duration — fit-to-fill retimes the source into the range' } };
    }
    const rate = clamp(srcDur / span, RATE_MIN, RATE_MAX);
    if (Math.abs(rate - srcDur / span) > 1e-6) {
      return { ...base, reason: { kind: 'error', title: 'Fit to Fill', detail: `source ${srcDur.toFixed(1)}s cannot fill ${span.toFixed(1)}s within the rate clamp [${RATE_MIN}, ${RATE_MAX}] — refusing rather than silently mis-fitting` } };
    }
    /* P2-4 (R20-W6FIX): fitToFill NEVER retargets through the selection —
       R19's law (first unlocked lane of the media's kind) stands; the
       contract's §5(b) selection fallback belongs to the 5 shared modes
       only. Pinned: a selection whose track accepts the source type must
       NOT hijack the fit-to-fill lane. */
    const t = resolveTargetTrack(wscene, type, ctx, { retarget: false });
    if (!t) {
      /* the no-op guard: withHistory returning undefined (every compatible
         lane locked) must NOT hear the success toast — refusal here. */
      return { ...base, reason: { kind: 'error', title: 'Fit to Fill', detail: `no unlocked ${type === 'audio' ? 'audio' : 'video'} lane for ${m.name} (locked lanes refuse placement — spec 06)` } };
    }
    const at = snapToFrame(ctx.loop.start);
    geometry.overwriteSpans = coveredSpans(t, at, span); // pre-mutation shading
    planOverwriteSpans(t, at, span, ops, idFactory);
    const el: ElementJSON = { id: idFactory('el-'), type, trackId: t.id, name: m.name, startTime: at, duration: snapToFrame(span), sourceStart: sourceStartOf(ctx), mediaId, speed: rate, opacity: 1 };
    t.elements.push(el);
    ops.push({ op: 'insertElement', trackId: t.id, element: el });
    geometry.ghost = ghostOf(t, at, snapToFrame(span), rate);
    geometry.arrows = { down: true, right: false };
    return {
      ...base, ok: true, targetTrackId: t.id, geometry, patch: ops, clearSelection: false,
      toast: { kind: 'success', title: `Fit to fill ${m.name}`, detail: `retimed ${srcDur.toFixed(1)}s source into the ${span.toFixed(1)}s In/Out range at ${rate.toFixed(3)}× (rate-clamped laws, spec 06 §5.8)` },
    };
  }

  /* ---- shared placement: insert / overwrite / append / placeOnTop / rippleOverwrite ---- */
  let track: TrackJSON | undefined;
  /** P2-1 (R20-W6FIX): set when THIS plan mints a track — the live-scene
   * splice index, carried on the ghost so the preview renders at the insert
   * line instead of trusting working-scene lane numbering. */
  let plannedTrackInsert: number | undefined;
  if (mode === 'placeOnTop' && type !== 'audio') {
    // P2 (R19-REV): place-on-top is a VISUAL-lane concept; audio has no
    // "top" — audio media falls through to its own kind routing below
    track = [...wscene.tracks].reverse().find((t) => t.kind === 'overlay' && !t.locked);
    if (!track) {
      // create one above the main track (the addTrack shape)
      const mainIdx = wscene.tracks.findIndex((t) => t.kind === 'main');
      const insertIndex = mainIdx < 0 ? 0 : mainIdx;
      track = { id: idFactory('t-overlay-'), kind: 'overlay', name: 'Text 2', badge: 'T2', muted: false, solo: false, locked: false, visible: true, elements: [] };
      wscene.tracks.splice(insertIndex, 0, track);
      ops.push({ op: 'createTrack', trackId: track.id, track, insertIndex });
      plannedTrackInsert = insertIndex;
    }
  } else {
    // P2-4 (R20-W6FIX): the selection retarget is the 5 shared modes' law
    // (contract §5(b)); fitToFill passes retarget:false — see its branch.
    track = resolveTargetTrack(wscene, type, ctx, { retarget: true });
  }
  if (!track) {
    return { ...base, reason: { kind: 'error', title: 'Edit action', detail: `no unlocked ${laneWord(type)} lane for ${m.name} (locked lanes refuse placement — spec 06)` } };
  }

  const dur = sourceDurOf(m, ctx);
  let time: number;
  if (mode === 'append') {
    time = track.elements.reduce((end, e) => Math.max(end, e.startTime + e.duration), 0);
  } else {
    // NaN-guarded ctx.time (a non-finite time — bad drop event — falls back
    // to the playhead exactly like an unspecified one; never NaN geometry)
    time = snapToFrame(Math.max(0, typeof ctx.time === 'number' && Number.isFinite(ctx.time) ? ctx.time : ctx.playhead));
  }

  const overlaps = track.elements.filter((e) => spansOverlap({ startTime: time, duration: dur }, e));
  const displaced: { elId: string; from: number; to: number; dx: number }[] = [];

  if (mode === 'insert' || (mode === 'placeOnTop' && overlaps.length > 0)) {
    // ripple insert: split straddlers, push everything at/after `time` right
    const pushedRight = new Set<string>(); // R19 test caught the double-shift: pushed right halves must NOT re-shift
    for (const e of overlaps) {
      if (e.startTime < time - EPS) {
        // straddler → right half lands after the new clip; left half keeps
        // the slot. SPLIT LAW (splitElement's settled shape, R19-REV P2):
        // the right half is built from the PRE-mutation shape so it KEEPS
        // transitionOut (the transition rides the tail) and SEVERS linkedTo
        // (the audio partner never links to both halves — R14 law).
        const rightDur = e.startTime + e.duration - time;
        const leftDur = time - e.startTime;
        if (rightDur >= FRAME - EPS) {
          const rightId = idFactory(`${e.id}-b`);
          pushedRight.add(rightId);
          const right: ElementJSON = {
            ...e, id: rightId,
            startTime: time + dur,
            duration: rightDur,
            ...(e.sourceStart !== undefined ? { sourceStart: e.sourceStart + leftDur } : {}),
            markers: e.markers ? e.markers.filter((cm) => cm.offset >= leftDur).map((cm) => ({ ...cm, offset: cm.offset - leftDur })) : undefined,
          };
          delete right.linkedTo;
          track.elements.push(right);
          ops.push({ op: 'insertElement', trackId: track.id, element: right });
          geometry.splitGhost = { trackId: track.id, start: time + dur, dur: rightDur };
        }
        e.duration = leftDur;
        delete e.transitionOut;
        ops.push({ op: 'patchElement', trackId: track.id, id: e.id, fields: { duration: leftDur, transitionOut: undefined } });
        geometry.splitAt = time;
      } else {
        e.startTime += dur;
        displaced.push({ elId: e.id, from: e.startTime - dur, to: e.startTime, dx: dur });
        ops.push({ op: 'patchElement', trackId: track.id, id: e.id, fields: { startTime: e.startTime } });
      }
    }
    // non-overlapping later elements also shift right (the ripple half
    // of the insert law; straddlers were split above, so they're excluded)
    const later = track.elements.filter((e) => e.startTime > time + dur - EPS && !pushedRight.has(e.id) && overlaps.every((o) => o.id !== e.id));
    for (const e of later) {
      e.startTime += dur;
      displaced.push({ elId: e.id, from: e.startTime - dur, to: e.startTime, dx: dur });
      ops.push({ op: 'patchElement', trackId: track.id, id: e.id, fields: { startTime: e.startTime } });
    }
  } else if (mode === 'overwrite' || mode === 'rippleOverwrite') {
    geometry.overwriteSpans = coveredSpans(track, time, dur); // pre-mutation shading
    const covered = planOverwriteSpans(track, time, dur, ops, idFactory);
    if (mode === 'rippleOverwrite') {
      // close/open the gap: later content shifts by (inserted − displaced)
      const delta = dur - covered;
      if (Math.abs(delta) >= FRAME) {
        const later = track.elements.filter((e) => e.startTime >= time + dur - EPS);
        for (const e of later) {
          const from = e.startTime;
          e.startTime = Math.max(time + dur, snapToFrame(e.startTime + delta));
          displaced.push({ elId: e.id, from, to: e.startTime, dx: e.startTime - from });
          ops.push({ op: 'patchElement', trackId: track.id, id: e.id, fields: { startTime: e.startTime } });
        }
      }
    }
  }

  const el: ElementJSON = {
    id: idFactory('el-'), type, trackId: track.id, name: m.name,
    startTime: time, duration: dur, sourceStart: sourceStartOf(ctx), mediaId,
    speed: 1, opacity: 1,
  };
  track.elements.push(el);
  ops.push({ op: 'insertElement', trackId: track.id, element: el });

  geometry.ghost = ghostOf(track, time, dur);
  if (plannedTrackInsert !== undefined) geometry.ghost.insertLineAfter = plannedTrackInsert; // P2-1 insert line
  geometry.displaced = displaced.length > 0 ? displaced : undefined;
  geometry.arrows = { down: true, right: displaced.length > 0 };
  // insert straddlers keep their split tick (set above); overwrite family
  // keeps its shading (set above); append/fitToFill carry nothing extra.

  return {
    ...base, ok: true, targetTrackId: track.id, geometry, patch: ops, clearSelection: true,
    toast: { kind: 'success', title: `${MODE_LABEL[mode as Exclude<InsertMediaMode, 'replace' | 'fitToFill'>]} ${m.name}`, detail: SUCCESS_DETAIL },
  };
}

/* ---- target resolution (thread #65 / contract §5, DESIGN-R20 D2 audio
   routing): TYPE WINS. (a) an explicit targetTrackId (the pool drop path)
   is validated for kind compatibility + lock; (b) a selected element of
   the SAME ELEMENT KIND as the source retargets there ("target track of
   selected clip", contract §5(b) — R20-W6FIX P2-4: the pre-W6 reading
   tested whether the selected element's TRACK ACCEPTS the source type,
   which let a video source retarget through a selected TEXT/IMAGE clip
   onto the overlay lane; the contract's law is exact element-type
   equality — video retargets via a selected VIDEO clip, audio via AUDIO,
   image via IMAGE; a different-kind selection is IGNORED, never obeyed);
   (c) media-type default = first unlocked lane of the routed kind. A
   locked retarget candidate falls through to (c) — the refusal law stays
   "no unlocked compatible lane AT ALL", exactly today's shape.
   `retarget:false` (fitToFill) skips (b) entirely — R19's kind-lane law. ---- */
function resolveTargetTrack(
  scene: SceneJSON,
  type: ElementType,
  ctx: InsertPlanContext,
  opts: { retarget: boolean },
): TrackJSON | undefined {
  if (ctx.targetTrackId) {
    const t = scene.tracks.find((x) => x.id === ctx.targetTrackId);
    if (t && !t.locked && trackAcceptsElement(t.kind, type)) return t;
    return undefined; // explicit target refused → honest refusal, never silent redirect
  }
  const selHit = opts.retarget
    ? ctx.selection
        .map((id) => findInScene(scene, id))
        .find((h): h is { el: ElementJSON; track: TrackJSON } => !!h && h.el.type === type && !h.track.locked)
    : undefined;
  const wantKind: TrackJSON['kind'] = type === 'audio' ? 'audio' : type === 'image' ? 'overlay' : 'main';
  return selHit?.track ?? scene.tracks.find((t) => t.kind === wantKind && !t.locked);
}

/** fresh counting-only idFactory for PREVIEW calls — deterministic per
 *  computation, never touches the store's counter. A FACTORY (not a shared
 *  instance) so every plan computation starts its count at 0. */
export function makePreviewIdFactory(): InsertIdFactory {
  let n = 0;
  return (prefix: string) => `preview-${prefix}-${n++}`;
}

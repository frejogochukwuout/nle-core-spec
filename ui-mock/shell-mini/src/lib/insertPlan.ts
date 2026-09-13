/* insertPlan — R24-miniplus W4 (DESIGN-R24 D7): the PURE insert-mode
 * planner. planInsert computes the whole edit (placement, straddle
 * splits, overwrite trims/removals, the ripple delta, replace's
 * exact-length swap, fit-to-fill's retime) as a DECLARED patch — never
 * touching a store. Why pure: preview==commit can only be guaranteed by
 * construction — the store's insertFromSource runs THIS planner and
 * passes the returned patch through commit() (ONE history entry); the
 * patch mutates the DRAFT commit hands it (already deep-cloned — the F1
 * law), locating clips BY ID so the plan and the application share one
 * truth.
 *
 * Laws baked in (D7 + the mini's register):
 * - placed duration = out − in (clamped to the media tail); images place
 *   media.duration (a still's extent is an edit decision, not a window);
 *   sourceStart = in (absent at 0 — the legacy semantic).
 * - the 0.5 grid: every placed start/duration quantizes (the inputs are
 *   already grid-clean; quantize is the defensive re-application).
 * - the split FIELD-DISPOSITION TABLE (D2, F2 — the splitAtPlayhead
 *   table): the right half is built from the PRE-mutation shape, keeps
 *   transitionOut (the tail rides) and speed/volume/opacity/effects;
 *   fadeIn stays LEFT (clamped), fadeOut rides RIGHT (clamped); the left
 *   half loses the tail family. overwrite's covered removal drops the
 *   clip's transitionOut with it; the seam-orphan cases are re-validated
 *   by commit()'s sanitizeTransitions (deviation #15 — one place, every
 *   path).
 * - honest refusal: every impossible edit returns {ok:false, reason} —
 *   the caller toasts it; a dead button is the anti-pattern. */

import { laneForMedia, mintClipId, type Clip, type Doc, type Media, type Track } from './mockData';
import { MIN_DUR, quantize, contentEnd } from './geometry';

/** The 6 reference edit functions (the mode card's vocabulary; the mini
 *  drops placeOnTop — the mini's lanes are the binding window's pair). */
export type InsertMode = 'insert' | 'overwrite' | 'replace' | 'append' | 'rippleOverwrite' | 'fitToFill';

/** planner inputs — everything insertFromSource reads from the state. */
export interface InsertOpts {
  /** the program playhead (insert/overwrite/ripple land here) */
  playhead: number;
  /** explicit target lane (the mini's binding window picks it; validated
   *  for kind compatibility — a mismatch REFUSES, never a silent redirect) */
  targetTrackId?: string;
  /** the source viewer's marked window; absent = the full media. */
  sourceRange?: { in: number; out: number };
  /** the current selection — replace/fitToFill's target. */
  selectedClipId?: string;
}

export type InsertResult =
  | { ok: true; patch: (doc: Doc) => void; toast?: string }
  | { ok: false; reason: string };

const EPS = 1e-9;
/** fit-to-fill's honest rate clamp (the setClipSpeed pair). */
const RATE_MIN = 0.1;
const RATE_MAX = 4;

const refuse = (reason: string): InsertResult => ({ ok: false, reason });

/** the placed source window: duration + in-point. Images place the whole
 *  media (no window); everything else places out−in clamped to the tail. */
function placedWindow(media: Media, range: InsertOpts['sourceRange']): { dur: number; sourceStart: number } {
  if (media.kind === 'image') return { dur: media.duration, sourceStart: 0 };
  const inPt = range?.in ?? 0;
  const outPt = range?.out ?? media.duration;
  const tail = Math.max(0, media.duration - inPt);
  /* grid law: out−in is grid-clean through the range setters; the clamp +
   * floor are the defensive re-application (a plan never places a
   * sub-MIN or off-grid duration). */
  const dur = quantize(Math.max(MIN_DUR, Math.min(outPt - inPt, tail)));
  return { dur, sourceStart: inPt };
}

/** the placed clip (the absent-is-default law: sourceStart 0 stays absent,
 *  speed 1 stays absent — the doc stays minimal). */
function placedClip(
  media: Media,
  trackId: string,
  start: number,
  dur: number,
  sourceStart: number,
  speed?: number,
): Clip {
  const c: Clip = { id: mintClipId(), trackId, mediaId: media.id, start, duration: dur };
  if (sourceStart > 0) c.sourceStart = sourceStart;
  if (speed !== undefined && speed !== 1) c.speed = speed;
  return c;
}

/** the D2 split table applied at `cut`: mutates the LEFT half in place
 *  (duration shrinks, the tail family leaves) and returns the RIGHT half
 *  built from the PRE-mutation shape, resting at `rightStart` with
 *  `rightDur`. `consumedSource` = the source seconds the left half (plus,
 *  for overwrite, the covered span) burned off the clip's window — the
 *  right half's sourceStart advances by it. Nested effects/transitionOut
 *  are cloned — the halves never alias (the F1 undo-corruption class). */
function splitClipAt(c: Clip, cut: number, rightStart: number, rightDur: number, consumedSource: number): Clip {
  const leftDur = cut - c.start;
  const right: Clip = { id: mintClipId(), trackId: c.trackId, mediaId: c.mediaId, start: rightStart, duration: rightDur };
  if (c.sourceStart !== undefined || consumedSource > 0) right.sourceStart = (c.sourceStart ?? 0) + consumedSource;
  if (c.speed !== undefined) right.speed = c.speed;
  if (c.volume !== undefined) right.volume = c.volume;
  if (c.opacity !== undefined) right.opacity = c.opacity;
  if (c.effects) right.effects = c.effects.map((e) => ({ ...e, params: e.params ? { ...e.params } : undefined }));
  if (c.fadeOut !== undefined) right.fadeOut = Math.min(c.fadeOut, rightDur);
  if (c.transitionOut) right.transitionOut = { ...c.transitionOut };
  // left half: the tail-family fields leave with the cut
  c.duration = leftDur;
  if (c.fadeIn !== undefined) c.fadeIn = Math.min(c.fadeIn, leftDur);
  delete c.fadeOut;
  delete c.transitionOut;
  return right;
}

/** target-track resolution: the media's kind routes (audio → an audio
 *  lane, video/image → a video lane). An explicit targetTrackId is
 *  validated for kind compatibility (a mismatch refuses — never a silent
 *  redirect); otherwise the FIRST track of the kind. The mini's binding
 *  window passes the bound lane as targetTrackId. */
function resolveTargetTrack(doc: Doc, media: Media, opts: InsertOpts): Track | undefined {
  const wantKind = laneForMedia(media.kind);
  if (opts.targetTrackId) {
    const t = doc.tracks.find((x) => x.id === opts.targetTrackId);
    return t && t.kind === wantKind ? t : undefined;
  }
  return doc.tracks.find((t) => t.kind === wantKind);
}

/** THE PLANNER — pure: no store, no mutation of the passed doc (the patch
 *  mutates only the draft commit hands it). */
export function planInsert(doc: Doc, media: Media, mode: InsertMode, opts: InsertOpts): InsertResult {
  const { dur, sourceStart } = placedWindow(media, opts.sourceRange);

  /* ---- replace / fitToFill: the SELECTION is the target (exact-length
   *    swap geometry — F10, deviation #12: NO downstream trim, that is
   *    ripple-overwrite's job). ---- */
  if (mode === 'replace' || mode === 'fitToFill') {
    const sel = opts.selectedClipId ? doc.clips.find((c) => c.id === opts.selectedClipId) : undefined;
    if (!sel) {
      return refuse(
        mode === 'replace'
          ? 'Replace needs a selected clip — pick the clip to swap first.'
          : 'Fit to fill needs a marked span — select the clip to fill first.',
      );
    }
    const track = doc.tracks.find((t) => t.id === sel.trackId);
    if (!track || track.kind !== laneForMedia(media.kind)) {
      return refuse(`${media.name} is ${laneForMedia(media.kind)}-lane media — the selected clip lives on the other lane.`);
    }
    const span = sel.duration; // the replaced clip's exact length
    const start = sel.start;
    const selId = sel.id;

    if (mode === 'replace') {
      /* images CAN replace — a still's extent is an edit decision (no
       * window arithmetic); time-based media refuses when the window
       * cannot cover the replaced length, else the window slides to fit
       * (in' = clamp(in, 0, extent − dur) — the out follows). */
      let inPt = 0;
      if (media.kind !== 'image') {
        if (media.duration < span - EPS) {
          return refuse(`${media.name} is shorter than the ${span}s clip being replaced — the window cannot cover it.`);
        }
        inPt = Math.min(sourceStart, Math.max(0, media.duration - span));
      }
      return {
        ok: true,
        patch: (d) => {
          d.clips = d.clips.filter((c) => c.id !== selId); // the seam died with the clip
          d.clips.push(placedClip(media, track.id, start, span, inPt));
        },
        toast: `Replaced the selected clip with ${media.name} (${span}s at ${start}s).`,
      };
    }

    /* fitToFill: the marked window retimed into the selection's span —
     * rate recorded, duration = span, replace geometry. Images refuse
     * (F19e — a still has no source window to retime); no marked range
     * refuses (the full window is not an edit decision); a raw rate
     * outside the clamp refuses rather than silently mis-fitting. */
    if (media.kind === 'image') {
      return refuse('Fit to fill refuses images — a still has no source window to retime.');
    }
    if (!opts.sourceRange) {
      return refuse('Fit to fill needs a marked in/out range (I / O in the source viewer).');
    }
    const window = opts.sourceRange.out - opts.sourceRange.in;
    const raw = window / span;
    if (raw < RATE_MIN - EPS || raw > RATE_MAX + EPS) {
      return refuse(
        `A ${window}s source cannot fill a ${span}s span within the rate clamp [${RATE_MIN}, ${RATE_MAX}] — refusing rather than silently mis-fitting.`,
      );
    }
    const rate = Math.min(Math.max(raw, RATE_MIN), RATE_MAX);
    const inPt = opts.sourceRange.in;
    return {
      ok: true,
      patch: (d) => {
        d.clips = d.clips.filter((c) => c.id !== selId);
        d.clips.push(placedClip(media, track.id, start, span, inPt, rate));
      },
      toast: `Fit to fill: ${window}s of ${media.name} into ${span}s at ${rate.toFixed(2)}×.`,
    };
  }

  /* ---- the placement family: insert / overwrite / append / rippleOverwrite ---- */
  const track = resolveTargetTrack(doc, media, opts);
  if (!track) {
    return refuse(`No ${laneForMedia(media.kind)} track is bound for ${media.name} — nothing to place on.`);
  }
  const trackId = track.id;

  if (mode === 'append') {
    /* the lane tail, playhead ignored (the family's honest law). PR69
     * C15: never below the tail — quantize() rounds to NEAREST and an
     * off-grid tail must not round the append INTO the last clip. */
    const end = contentEnd(doc.clips.filter((c) => c.trackId === trackId));
    const time = Math.max(end, quantize(end));
    return {
      ok: true,
      patch: (d) => {
        d.clips.push(placedClip(media, trackId, time, dur, sourceStart));
      },
      toast: `Appended ${media.name} at ${time}s on ${trackId}.`,
    };
  }

  const time = Math.max(0, quantize(opts.playhead));

  if (mode === 'insert') {
    /* ripple insert: straddlers split at the playhead (the D2 table —
     * the right half rests after the placed clip), every same-track clip
     * at/after the placed start shifts right by the placed duration.
     * Grid law: time and clip edges are 0.5-clean, so both split halves
     * are >= MIN_DUR by construction. */
    const patch = (d: Doc) => {
      const halves: Clip[] = [];
      for (const c of d.clips.filter((x) => x.trackId === trackId)) {
        if (c.start < time - EPS && c.start + c.duration > time + EPS) {
          // straddler → split; the right half's content = [time, end)
          const rate = c.speed ?? 1;
          const right = splitClipAt(c, time, time + dur, c.start + c.duration - time, (time - c.start) * rate);
          halves.push(right);
        } else if (c.start >= time - EPS) {
          c.start += dur; // later clips (incl. head-covered) ride right
        }
      }
      d.clips.push(...halves, placedClip(media, trackId, time, dur, sourceStart));
    };
    return {
      ok: true,
      patch,
      toast: `Inserted ${media.name} at ${time}s on ${trackId} — later clips shifted ${dur}s right.`,
    };
  }

  /* overwrite (+ the ripple delta): fully-covered clips are removed; head
   * straddles trim from the left (start moves, sourceStart advances — the
   * head-trim law); tail straddles trim the tail; middle straddles split
   * with the covered span cut OUT (the right half's head trims past it).
   * The seam-orphan cases are commit's sanitize job (deviation #15). */
  const patch = (d: Doc) => {
    const removals = new Set<string>();
    const halves: Clip[] = [];
    let displaced = 0; // the covered CONTENT seconds — ripple's delta base
    for (const c of d.clips.filter((x) => x.trackId === trackId)) {
      const end = c.start + c.duration;
      if (!(c.start < time + dur - EPS && end > time + EPS)) continue; // untouched
      if (c.start >= time - EPS && end <= time + dur + EPS) {
        removals.add(c.id); // fully covered — removed (transitionOut drops with it)
        displaced += c.duration;
      } else if (c.start >= time - EPS) {
        // head straddle — the covered head leaves; the window advances
        const cut = time + dur - c.start;
        c.sourceStart = (c.sourceStart ?? 0) + cut * (c.speed ?? 1);
        c.start = time + dur;
        c.duration -= cut;
        if (c.fadeIn !== undefined) c.fadeIn = Math.min(c.fadeIn, c.duration);
        if (c.fadeOut !== undefined) c.fadeOut = Math.min(c.fadeOut, c.duration);
        displaced += cut;
      } else if (end <= time + dur + EPS) {
        // tail straddle — the covered tail leaves (the head family stays)
        displaced += end - time;
        c.duration = time - c.start;
        if (c.fadeIn !== undefined) c.fadeIn = Math.min(c.fadeIn, c.duration);
        if (c.fadeOut !== undefined) c.fadeOut = Math.min(c.fadeOut, c.duration);
      } else {
        // middle straddle — the covered span is cut out; the right half
        // lands after the placed clip, its window advanced past the span
        displaced += dur;
        const rate = c.speed ?? 1;
        halves.push(splitClipAt(c, time, time + dur, end - (time + dur), (time + dur - c.start) * rate));
      }
    }
    if (mode === 'rippleOverwrite') {
      /* close/open the gap: delta = placed − displaced; followers at/after
       * the placed end shift by it — floored at the placed end so a
       * negative delta never overlaps (and never passes 0). */
      const delta = dur - displaced;
      if (Math.abs(delta) >= EPS) {
        for (const c of d.clips) {
          if (c.trackId !== trackId || removals.has(c.id) || c.start < time + dur - EPS) continue;
          c.start = Math.max(time + dur, c.start + delta);
        }
      }
    }
    d.clips = d.clips.filter((c) => !removals.has(c.id));
    d.clips.push(...halves, placedClip(media, trackId, time, dur, sourceStart));
  };
  return {
    ok: true,
    patch,
    toast:
      mode === 'overwrite'
        ? `Overwrote ${time}s–${time + dur}s on ${trackId} with ${media.name}.`
        : `Ripple-overwrote at ${time}s on ${trackId} with ${media.name} — later clips shifted by the difference.`,
  };
}

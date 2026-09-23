/* otProject — the mini-side half of the C1 fixture bridge (OT-SEAMS §1.6 +
   §3.4). Every formula here is REGISTERED in docs/OT-SEAMS.md — this module
   makes the registered conversion laws executable and unit-pinned instead of
   prose-pinned; nothing is invented.

   ⚠ ROLE (the honest limit): this repo is not a package — the crawl app
   CANNOT import this file. It is a TESTED REFERENCE the C1 sceneBridge
   copies verbatim (spec 14 §3.1 C1 row (d): "mini multiTrackDoc ⇄ OT
   SceneTracks via the sceneBridge family"). The mini itself has NO OT
   dependency, by design.

   Field names are MINI-OWNED and provisional (`ProjectedClip`): the OT
   element's real field names + the SceneTracks track mapping (main
   singleton / overlay[] / audio[] — which mini video track becomes the OT
   main) are the REGISTERED C1-ENTRY DECISION (docs/CORE-SEAMS.md S6/S19),
   pinned when the OT snapshot is vendored into the app workspace. The
   CONVERSION LAWS below are the seam; the binding names are not.

   Registered laws encoded:
   - Time base (OT-SEAMS §3.4): seconds × 120000 → ticks. The 0.5s grid
     becomes the fps quantizer's rounding step when real media carries fps.
   - toTicks rounding policy: Math.round — the mini commits raw pointer
     times (snap-off drags + raw trims land off-grid), so seconds×120000
     is NOT integral in general; the nearest-tick policy is the bridge law
     (ties round half-up toward +∞: toTicks(0.5 + 1/240000) = 60001).
   - Element model (OT-SEAMS §1.6): the mini's clip is a full window over
     its source from in-point 0 → project to
     {trimStart: 0, trimEnd: sourceDuration − duration}. trimEnd is
     derived by TICK arithmetic (sourceDurationTicks − durationTicks), not
     by projecting the float difference — the tick path pins the invariant
     trimStart + duration + trimEnd === sourceDurationTicks exactly.
   - Stills caveat (README deviation #13): an image media's `duration` is
     a SYNTHETIC extent (an image has no intrinsic length), so
     sourceDurationTicks for stills is an edit decision, not decoded
     truth — registered as a C1 open question, not decided here. */

import type { Clip, Media } from './mockData';

/** OT-SEAMS §3.4 — the registered seconds↔ticks conversion factor. */
export const OT_TICKS_PER_SECOND = 120000;

/** Seconds → ticks, nearest-tick policy (see the header: pointer-committed
 *  times may be off-grid; grid-clean values are exact by construction). */
export function toTicks(seconds: number): number {
  return Math.round(seconds * OT_TICKS_PER_SECOND);
}

/** Ticks → seconds (the inverse; exact on the grid, sub-half-tick elsewhere). */
export function fromTicks(ticks: number): number {
  return ticks / OT_TICKS_PER_SECOND;
}

/** The projected element shape — MINI-OWNED provisional names (see the
 *  header: names are the C1-entry binding decision; the LAWS are the seam).
 *  Field set per the registered OT-SEAMS §1.6/§1.4 surfaces: a start, a
 *  duration, and the trim triple over the source. */
export interface ProjectedClip {
  /** passthrough identity (the OT element id binding is C1-entry) */
  id: string;
  /** passthrough — maps to the OT track/lane binding (C1-entry decision) */
  trackId: string;
  /** passthrough — the source asset reference */
  mediaId: string;
  startTicks: number;
  durationTicks: number;
  /** the registered in-point-0 model: always 0 on the mini→OT projection */
  trimStartTicks: number;
  /** sourceDurationTicks − durationTicks (tick arithmetic — see header) */
  trimEndTicks: number;
  sourceDurationTicks: number;
}

/** Project a mini clip (full window over its source, in-point 0) into the
 *  OT element field family (OT-SEAMS §1.6). Throws on the doc-invariant
 *  violations — duration > source, or non-finite/negative times — the
 *  store's clamp laws make those unreachable for valid docs, so a throw
 *  means an upstream bug, not a projection choice. */
export function projectClip(clip: Clip, media: Media): ProjectedClip {
  if (
    !Number.isFinite(clip.duration) ||
    !Number.isFinite(clip.start) ||
    !Number.isFinite(media.duration) ||
    clip.duration < 0 ||
    clip.start < 0
  ) {
    throw new Error(
      `otProject: clip ${clip.id} carries non-finite/negative times — doc invariant violated`,
    );
  }
  if (clip.duration > media.duration) {
    throw new Error(
      `otProject: clip ${clip.id} duration ${clip.duration}s exceeds its source ${media.duration}s — doc invariant violated`,
    );
  }
  const startTicks = toTicks(clip.start);
  const durationTicks = toTicks(clip.duration);
  const sourceDurationTicks = toTicks(media.duration);
  return {
    id: clip.id,
    trackId: clip.trackId,
    mediaId: clip.mediaId,
    startTicks,
    durationTicks,
    trimStartTicks: 0,
    // tick arithmetic — the invariant below is exact by construction
    trimEndTicks: sourceDurationTicks - durationTicks,
    sourceDurationTicks,
  };
}

/** The inverse projection (OT element → mini window) — the same registered
 *  formula family read backwards: the mini's window duration = the source
 *  minus BOTH trims; the window starts at the element's start. Structural
 *  input (only the registered fields) — no OT types imported, no guessing.
 */
export function projectClipBack(element: {
  startTicks: number;
  trimStartTicks: number;
  trimEndTicks: number;
  sourceDurationTicks: number;
}): { start: number; duration: number } {
  const windowTicks =
    element.sourceDurationTicks - element.trimStartTicks - element.trimEndTicks;
  return {
    start: fromTicks(element.startTicks),
    duration: fromTicks(windowTicks),
  };
}

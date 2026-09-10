/* ripple.ts — canonical diff-based ripple editing (R15 T3), ported from
   opencut-timeline `src/lib/timeline/ripple/index.ts` (shift.ts, apply.ts,
   diff.ts) and adapted to the mock's SceneJSON (flat track array, seconds,
   ElementJSON {startTime, duration}).

   The "vacated − joined interval diff" pattern (nle-core-spec 00-master
   Decision 2): per track, diff the BEFORE/AFTER element span sets —
     vacated = removed spans (elements gone from the whole doc) + tail
                shrinkage (before.end > after.end → [after.end, before.end))
     joined   = newly appeared spans (ids not in the before set)
     freed    = vacated − joined (interval subtraction)
   Each freed interval [s, e) becomes an adjustment {afterTime: e,
   shiftAmount: e − s}: elements with startTime ≥ e shift LEFT by (e − s).
   Per track the adjustments apply sorted DESCENDING by afterTime, so a
   later freed interval shifts first and an earlier one still sees the
   already-shifted starts (non-contiguous multi-delete: deleting el-1+el-3
   shifts el-4 by el-1's span + el-3's span — the old single-span shift
   collapsed everything to the first gap).

   Pure + framework-free: the store's deleteElements(ripple=true) feeds it
   before/after element lists; T4's ripple trim can reuse the same seam. */

import type { ElementJSON } from './mockData';

export interface RippleAdjustment {
  trackId: string;
  afterTime: number;
  shiftAmount: number;
}

interface Interval {
  startTime: number;
  endTime: number;
}

interface ElementSpan extends Interval {
  id: string;
}

/** shift elements with startTime ≥ afterTime LEFT by shiftAmount (in place). */
export function rippleShiftElements<T extends { startTime: number }>(
  elements: T[],
  afterTime: number,
  shiftAmount: number,
): T[] {
  return elements.map((element) =>
    element.startTime >= afterTime
      ? { ...element, startTime: Math.max(0, element.startTime - shiftAmount) }
      : element,
  );
}

/** apply per-track adjustments, sorted descending by afterTime (canonical). */
export function applyRippleAdjustmentsToElements(
  elements: ElementJSON[],
  adjustments: { afterTime: number; shiftAmount: number }[],
): ElementJSON[] {
  if (adjustments.length === 0) return elements;
  const sorted = [...adjustments].sort((a, b) => b.afterTime - a.afterTime);
  let out = elements;
  for (const adjustment of sorted) {
    out = rippleShiftElements(out, adjustment.afterTime, adjustment.shiftAmount);
  }
  return out;
}

/**
 * Per-track interval diff (canonical computeTrackRippleAdjustments).
 * `allAfterElementIds` = every element id present in the AFTER doc across ALL
 * tracks — an element that merely changed tracks is NOT vacated on its old
 * lane (it joined another lane; that lane's diff books the join).
 */
export function computeTrackRippleAdjustments(
  trackId: string,
  beforeElements: ElementJSON[],
  afterElements: ElementJSON[],
  allAfterElementIds: Set<string>,
): RippleAdjustment[] {
  const beforeById = buildElementSpanMap(beforeElements);
  const afterById = buildElementSpanMap(afterElements);
  const { vacatedIntervals, joinedIntervals } = collectTrackIntervals(beforeById, afterById, allAfterElementIds);
  const freedIntervals = subtractIntervalSets(vacatedIntervals, joinedIntervals);
  return buildAdjustments(trackId, freedIntervals);
}

function buildElementSpanMap(elements: ElementJSON[]): Map<string, ElementSpan> {
  return new Map(
    elements.map((element) => [
      element.id,
      { id: element.id, startTime: element.startTime, endTime: element.startTime + element.duration },
    ]),
  );
}

function collectTrackIntervals(
  beforeById: Map<string, ElementSpan>,
  afterById: Map<string, ElementSpan>,
  allAfterElementIds: Set<string>,
): { vacatedIntervals: Interval[]; joinedIntervals: Interval[] } {
  const vacatedIntervals: Interval[] = [];
  const joinedIntervals: Interval[] = [];

  for (const beforeElement of beforeById.values()) {
    const afterElement = afterById.get(beforeElement.id);
    if (!afterElement) {
      const wasMovedToAnotherTrack = allAfterElementIds.has(beforeElement.id);
      if (!wasMovedToAnotherTrack) {
        pushInterval(vacatedIntervals, beforeElement.startTime, beforeElement.endTime);
      }
      continue;
    }
    // tail shrinkage: the element kept its id but its end pulled in
    if (beforeElement.endTime > afterElement.endTime) {
      pushInterval(vacatedIntervals, afterElement.endTime, beforeElement.endTime);
    }
  }

  for (const afterElement of afterById.values()) {
    if (beforeById.has(afterElement.id)) continue;
    pushInterval(joinedIntervals, afterElement.startTime, afterElement.endTime);
  }

  return {
    vacatedIntervals: normalizeIntervals(vacatedIntervals),
    joinedIntervals: normalizeIntervals(joinedIntervals),
  };
}

function buildAdjustments(trackId: string, intervals: Interval[]): RippleAdjustment[] {
  return intervals.flatMap((interval) => {
    const shiftAmount = interval.endTime - interval.startTime;
    if (shiftAmount <= 0) return [];
    return [{ trackId, afterTime: interval.endTime, shiftAmount }];
  });
}

function subtractIntervalSets(sourceIntervals: Interval[], overlappingIntervals: Interval[]): Interval[] {
  return normalizeIntervals(sourceIntervals).flatMap((sourceInterval) =>
    subtractSingleInterval(sourceInterval, normalizeIntervals(overlappingIntervals)),
  );
}

function normalizeIntervals(intervals: Interval[]): Interval[] {
  const validIntervals: Interval[] = [];
  for (const interval of intervals) pushInterval(validIntervals, interval.startTime, interval.endTime);
  const sorted = validIntervals.sort((a, b) => a.startTime - b.startTime);
  if (sorted.length === 0) return [];
  const merged: Interval[] = [{ ...sorted[0]! }];
  for (const interval of sorted.slice(1)) {
    const previous = merged[merged.length - 1]!;
    if (interval.startTime <= previous.endTime) {
      previous.endTime = Math.max(previous.endTime, interval.endTime);
      continue;
    }
    merged.push({ ...interval });
  }
  return merged;
}

function subtractSingleInterval(sourceInterval: Interval, overlappingIntervals: Interval[]): Interval[] {
  let remaining: Interval[] = [{ ...sourceInterval }];
  for (const overlapping of overlappingIntervals) {
    remaining = remaining.flatMap((interval) => {
      if (overlapping.endTime <= interval.startTime || overlapping.startTime >= interval.endTime) {
        return [interval];
      }
      const next: Interval[] = [];
      pushInterval(next, interval.startTime, overlapping.startTime);
      pushInterval(next, overlapping.endTime, interval.endTime);
      return next;
    });
    if (remaining.length === 0) return [];
  }
  return remaining;
}

function pushInterval(intervals: Interval[], startTime: number, endTime: number): void {
  if (endTime <= startTime) return;
  intervals.push({ startTime, endTime });
}

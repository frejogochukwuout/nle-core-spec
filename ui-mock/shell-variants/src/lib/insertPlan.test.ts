/* insertPlan.test — R20-W6FIX P1-1a/P1-1c: the tests W2 promised and the
   adversarial review found missing. The PURE planner's contract, pinned per
   mode (geometry + patch ops), the refusal paths, the P2-4 same-kind
   retarget law, the P2-1 minted-track ghost geometry, and the two
   preview==commit proofs:
   - patch-replay equivalence: the SAME plan computed with a real and a
     counting-fake idFactory, both applied through applyInsertPlan on
     identical pre-states, deep-compared (ids differ, geometry equal);
   - GEOMETRY vs the applied scene diff (displaced[].to == post-apply
     startTime, ghost == the placed element, overwriteSpans == the
     removed/trimmed spans);
   - preview NEVER advances the store's real id counter.

   Fixtures = the sample project (spec 18 §4.10). The planner takes scenes
   as a PARAMETER, so the pure tests clone project.scenes directly; the
   replay/apply tests drive the store (setup.ts resets it per test). */

import { describe, expect, it } from 'vitest';
import { act } from '@testing-library/react';
import { makePreviewIdFactory, planInsertMedia, type InsertIdFactory, type InsertMediaMode, type InsertPlan, type InsertPlanContext } from './insertPlan';
import { useUi, mintTrackIds } from '../state/useUiStore';
import { project, type ElementJSON, type SceneJSON, type TrackJSON } from './mockData';
import { spansOverlap } from './timelinePlacement';

/* ---------- helpers ---------- */

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const scenes = (): SceneJSON[] => clone(project.scenes);
const S = () => useUi.getState();
const trackOf = (sc: SceneJSON, id: string) => sc.tracks.find((t) => t.id === id)!;
const elsOf = (sc: SceneJSON, id: string) => trackOf(sc, id).elements;

const ctx = (patch: Partial<InsertPlanContext> = {}): InsertPlanContext => ({
  playhead: 16, loop: { start: 2, end: 28 }, selection: [], ...patch,
});

/** deterministic factory that RECORDS every id it mints (the replay test
 *  scrubs exactly these out of the compared scenes). */
const recordingFactory = (tag: string, seen: Set<string>): InsertIdFactory => (prefix) => {
  const id = `${prefix}${tag}-${seen.size + 1}`;
  seen.add(id);
  return id;
};
/** plain deterministic factory (no store, no shared counter). */
const seqFactory = (tag: string): InsertIdFactory => {
  let n = 0;
  return (prefix) => `${prefix}${tag}-${++n}`;
};

/** replace every MINTED id string with a positional marker so two scenes
 *  that differ ONLY in minted identities compare equal. */
const scrub = (value: unknown, minted: Set<string>): unknown =>
  JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === 'string' && minted.has(v) ? '<minted>' : v)));

/** ids a plan minted (createTrack track ids + insertElement element ids). */
const mintedIdsOf = (plan: InsertPlan): string[] =>
  plan.patch.flatMap((op) => (op.op === 'createTrack' ? [op.trackId] : op.op === 'insertElement' ? [op.element.id] : []));

/** apply a plan on an EXACT pre-state snapshot (mirrors the commit path:
 *  the store's applyInsertPlan under one act()). */
const applyOn = (pre: SceneJSON[], plan: InsertPlan): SceneJSON[] => {
  useUi.setState({ scenes: pre, activeSceneId: 'sc-1' });
  act(() => { S().applyInsertPlan(plan); });
  return clone(S().scenes);
};

/** lock every track of the given kinds in a cloned scene list. */
const lockKinds = (scs: SceneJSON[], kinds: TrackJSON['kind'][]): SceneJSON[] =>
  scs.map((sc) => ({ ...sc, tracks: sc.tracks.map((t) => (kinds.includes(t.kind) ? { ...t, locked: true } : t)) }));

const LABELS: Record<InsertMediaMode, string> = {
  insert: 'Inserted', overwrite: 'Overwrote', append: 'Appended',
  placeOnTop: 'Placed on top', rippleOverwrite: 'Ripple-overwrote',
  replace: 'Replaced with', fitToFill: 'Fit to fill',
};

/* =====================================================================
 * P1-1a — the 7 modes: ok-path plans (geometry + patch ops, in order)
 * ===================================================================== */

describe('insertPlan ok-path plans (geometry + patch ops per mode)', () => {
  it('insert: ripple-split straddler, push later clips, ghost + splitGhost + displaced', () => {
    const plan = planInsertMedia(scenes(), 'sc-1', 'm-03', 'insert', ctx({ playhead: 12 }), seqFactory('real'));
    expect(plan.ok).toBe(true);
    expect(plan.targetTrackId).toBe('tr-main');
    expect(plan.mediaName).toBe('drone_launch.mp4');
    // ghost: where the new clip lands
    expect(plan.geometry.ghost).toMatchObject({ trackId: 'tr-main', start: 12, dur: 18.6, laneIndex: 1, laneKind: 'main' });
    expect(plan.geometry.ghost!.insertLineAfter).toBeUndefined(); // no track minted
    // split tick + right half's final resting place (el-2 [8.5,17) straddles 12)
    expect(plan.geometry.splitAt).toBe(12);
    expect(plan.geometry.splitGhost).toEqual({ trackId: 'tr-main', start: 30.6, dur: 5 });
    // followers shift right by the insert duration
    expect(plan.geometry.displaced).toEqual([
      { elId: 'el-3', from: 17, to: 35.6, dx: 18.6 },
      { elId: 'el-4', from: 24, to: 42.6, dx: 18.6 },
    ]);
    expect(plan.geometry.arrows).toEqual({ down: true, right: true });
    // patch ops, in emission order (the applier replays exactly this)
    expect(plan.patch.map((o) => o.op)).toEqual(['insertElement', 'patchElement', 'patchElement', 'patchElement', 'insertElement']);
    // the split right half: PRE-mutation shape → keeps transitionOut, severs
    // linkedTo; sourceStart + leftDur; markers re-offset past the cut
    const right = plan.patch[0] as Extract<InsertPlan['patch'][number], { op: 'insertElement' }>;
    expect(right.element).toMatchObject({ id: 'el-2-breal-1', startTime: 30.6, duration: 5, sourceStart: 6.5 });
    expect(right.element.transitionOut).toMatchObject({ presentation: 'Cross Dissolve' });
    expect(right.element.linkedTo).toBeUndefined();
    expect(right.element.markers).toEqual([{ id: 'cm-2', offset: 2, label: 'Laugh', color: 'purple' }]);
    // left half: duration trimmed, transitionOut SEVERED (the transition
    // rides the tail — R19-REV P2 split law)
    const left = plan.patch[1] as Extract<InsertPlan['patch'][number], { op: 'patchElement' }>;
    expect(left.fields).toEqual({ duration: 3.5, transitionOut: undefined });
    // pure translates for the pushed followers
    expect((plan.patch[2] as { fields: { startTime: number } }).fields.startTime).toBeCloseTo(35.6, 6);
    expect((plan.patch[3] as { fields: { startTime: number } }).fields.startTime).toBeCloseTo(42.6, 6);
    // the placed clip
    const placed = plan.patch[4] as Extract<InsertPlan['patch'][number], { op: 'insertElement' }>;
    expect(placed.element).toMatchObject({ mediaId: 'm-03', type: 'video', trackId: 'tr-main', startTime: 12, duration: 18.6, speed: 1 });
    expect(plan.clearSelection).toBe(true);
    expect(plan.toast).toMatchObject({ kind: 'success', title: `${LABELS.insert} drone_launch.mp4` });
  });

  it('overwrite: fully-covered clip removed, straddler head-trimmed, spans shaded pre-mutation', () => {
    const plan = planInsertMedia(scenes(), 'sc-1', 'm-05', 'overwrite', ctx({ playhead: 8.5 }), seqFactory('real'));
    expect(plan.ok).toBe(true);
    expect(plan.targetTrackId).toBe('tr-main');
    expect(plan.geometry.ghost).toMatchObject({ trackId: 'tr-main', start: 8.5, dur: 12.8, laneIndex: 1 });
    // the covered regions of EXISTING clips (pre-op doc state): el-2 fully,
    // el-3's head (frame-clean 4.3 is 21.3−17 in float arithmetic → closeTo)
    const ovs = plan.geometry.overwriteSpans!;
    expect(ovs.map((s) => [s.trackId, s.start])).toEqual([['tr-main', 8.5], ['tr-main', 17]]);
    expect(ovs[0]!.dur).toBe(8.5);
    expect(ovs[1]!.dur).toBeCloseTo(4.3, 6);
    // overwrite trims, never moves: no displaced, right arrow off
    expect(plan.geometry.displaced).toBeUndefined();
    expect(plan.geometry.splitAt).toBeUndefined();
    expect(plan.geometry.arrows).toEqual({ down: true, right: false });
    expect(plan.patch.map((o) => o.op)).toEqual(['removeElement', 'patchElement', 'insertElement']);
    expect((plan.patch[0] as { id: string }).id).toBe('el-2');
    // head-trim: startTime/duration/sourceStart ride, markers filtered past the cut
    const trim = plan.patch[1] as Extract<InsertPlan['patch'][number], { op: 'patchElement' }>;
    expect(trim.id).toBe('el-3');
    expect(trim.fields.startTime).toBeCloseTo(21.3, 6);
    expect(trim.fields.duration).toBeCloseTo(2.7, 6);
    expect(trim.fields.sourceStart).toBeCloseTo(4.3, 6);
    expect(trim.fields.markers).toEqual([]);
    const placed = plan.patch[2] as Extract<InsertPlan['patch'][number], { op: 'insertElement' }>;
    expect(placed.element).toMatchObject({ mediaId: 'm-05', startTime: 8.5, duration: 12.8 });
    expect(plan.toast).toMatchObject({ kind: 'success', title: `${LABELS.overwrite} sunset_timelapse.mp4` });
  });

  it('append: lands at the lane tail, no spans, no displaced', () => {
    const plan = planInsertMedia(scenes(), 'sc-1', 'm-08', 'append', ctx(), seqFactory('real'));
    expect(plan.ok).toBe(true);
    expect(plan.targetTrackId).toBe('tr-overlay-1'); // image → overlay kind
    // tr-overlay-1 tail = el-5 end = 12; duration-less source → 4s
    expect(plan.geometry.ghost).toEqual({ trackId: 'tr-overlay-1', start: 12, dur: 4, laneIndex: 0, laneKind: 'overlay' });
    expect(plan.geometry.displaced).toBeUndefined();
    expect(plan.geometry.overwriteSpans).toBeUndefined();
    expect(plan.geometry.arrows).toEqual({ down: true, right: false });
    expect(plan.patch).toHaveLength(1);
    expect(plan.patch[0]).toMatchObject({ op: 'insertElement', trackId: 'tr-overlay-1' });
    expect((plan.patch[0] as { element: ElementJSON }).element).toMatchObject({ mediaId: 'm-08', type: 'image', startTime: 12, duration: 4 });
    expect(plan.toast).toMatchObject({ kind: 'success', title: `${LABELS.append} title_card.png` });
  });

  it('placeOnTop (unlocked overlay exists): topmost overlay, plain place, no mint', () => {
    const plan = planInsertMedia(scenes(), 'sc-1', 'm-08', 'placeOnTop', ctx({ playhead: 2 }), seqFactory('real'));
    expect(plan.ok).toBe(true);
    expect(plan.targetTrackId).toBe('tr-overlay-1');
    expect(plan.geometry.ghost).toEqual({ trackId: 'tr-overlay-1', start: 2, dur: 4, laneIndex: 0, laneKind: 'overlay' });
    expect(plan.geometry.arrows).toEqual({ down: true, right: false });
    expect(plan.patch).toHaveLength(1);
    expect(plan.patch[0]).toMatchObject({ op: 'insertElement', trackId: 'tr-overlay-1' });
    expect(plan.toast).toMatchObject({ kind: 'success', title: `${LABELS.placeOnTop} title_card.png` });
  });

  it('rippleOverwrite: covered span displaced == insert duration → no gap shift (delta 0)', () => {
    const plan = planInsertMedia(scenes(), 'sc-1', 'm-05', 'rippleOverwrite', ctx({ playhead: 0 }), seqFactory('real'));
    expect(plan.ok).toBe(true);
    expect(plan.targetTrackId).toBe('tr-main');
    // [0,12.8): el-1 fully covered (8.5) + el-2 head-trimmed (4.3) → 12.8 == dur
    const ovs = plan.geometry.overwriteSpans!;
    expect(ovs.map((s) => [s.trackId, s.start])).toEqual([['tr-main', 0], ['tr-main', 8.5]]);
    expect(ovs[0]!.dur).toBe(8.5);
    expect(ovs[1]!.dur).toBeCloseTo(4.3, 6);
    expect(plan.geometry.ghost).toMatchObject({ trackId: 'tr-main', start: 0, dur: 12.8, laneIndex: 1 });
    expect(plan.geometry.displaced).toBeUndefined(); // delta 0 → el-4 stays at 24
    expect(plan.patch.map((o) => o.op)).toEqual(['removeElement', 'patchElement', 'insertElement']);
    expect((plan.patch[0] as { id: string }).id).toBe('el-1');
    const trim = plan.patch[1] as Extract<InsertPlan['patch'][number], { op: 'patchElement' }>;
    expect(trim.id).toBe('el-2');
    expect(trim.fields.startTime).toBeCloseTo(12.8, 6);
    expect(trim.fields.duration).toBeCloseTo(4.2, 6);
    expect(trim.fields.sourceStart).toBeCloseTo(7.3, 6);
    expect(trim.fields.markers).toHaveLength(1);
    expect(trim.fields.markers![0]).toMatchObject({ id: 'cm-2', label: 'Laugh', color: 'purple' });
    expect(trim.fields.markers![0]!.offset).toBeCloseTo(1.2, 6);
    expect(plan.toast).toMatchObject({ kind: 'success', title: `${LABELS.rippleOverwrite} sunset_timelapse.mp4` });
  });

  it('rippleOverwrite with a shorter displaced span: later content closes the gap (delta = dur − displaced)', () => {
    // synthetic lane: A [0,2) + B [14,16) — a 12.8s ripple-overwrite at 0
    // covers A (2s) → delta +10.8 → B shifts 14 → 24.8 (glued, no gap)
    const scs = scenes();
    const main = trackOf(scs[0]!, 'tr-main');
    main.elements = [
      { ...main.elements[0]!, id: 'syn-A', startTime: 0, duration: 2 },
      { ...main.elements[0]!, id: 'syn-B', startTime: 14, duration: 2 },
    ];
    const plan = planInsertMedia(scs, 'sc-1', 'm-05', 'rippleOverwrite', ctx({ playhead: 0 }), seqFactory('real'));
    expect(plan.ok).toBe(true);
    // B lands frame-snapped at 595/24 (24.8 raw)
    expect(plan.geometry.displaced).toHaveLength(1);
    expect(plan.geometry.displaced![0]).toMatchObject({ elId: 'syn-B', from: 14 });
    expect(plan.geometry.displaced![0]!.to).toBeCloseTo(595 / 24, 6);
    expect(plan.geometry.displaced![0]!.dx).toBeCloseTo(595 / 24 - 14, 6);
    expect(plan.geometry.arrows).toEqual({ down: true, right: true });
    expect(plan.patch.map((o) => o.op)).toEqual(['removeElement', 'patchElement', 'insertElement']);
    expect((plan.patch[0] as { id: string }).id).toBe('syn-A');
  });

  it('replace: selected clip removed, media placed at its start, downstream covered too', () => {
    const plan = planInsertMedia(scenes(), 'sc-1', 'm-03', 'replace', ctx({ selection: ['el-1'] }), seqFactory('real'));
    expect(plan.ok).toBe(true);
    expect(plan.targetTrackId).toBe('tr-main');
    expect(plan.geometry.ghost).toMatchObject({ trackId: 'tr-main', start: 0, dur: 18.6, laneIndex: 1 });
    // pre-mutation shading: the replaced clip + downstream content the
    // longer replacement covers (el-3's head 1.6 = 18.6−17 in float → closeTo)
    const ovs = plan.geometry.overwriteSpans!;
    expect(ovs.map((s) => [s.trackId, s.start])).toEqual([['tr-main', 0], ['tr-main', 8.5], ['tr-main', 17]]);
    expect(ovs[0]!.dur).toBe(8.5);
    expect(ovs[1]!.dur).toBe(8.5);
    expect(ovs[2]!.dur).toBeCloseTo(1.6, 6);
    expect(plan.patch.map((o) => o.op)).toEqual(['removeElement', 'removeElement', 'patchElement', 'insertElement']);
    expect((plan.patch[0] as { id: string }).id).toBe('el-1'); // the selected clip
    expect((plan.patch[1] as { id: string }).id).toBe('el-2'); // downstream, fully covered
    const placed = plan.patch[3] as Extract<InsertPlan['patch'][number], { op: 'insertElement' }>;
    expect(placed.element).toMatchObject({ mediaId: 'm-03', startTime: 0, duration: 18.6 });
    // replace keeps the selection (store law — only the 5 shared modes clear)
    expect(plan.clearSelection).toBe(false);
    expect(plan.toast).toMatchObject({ kind: 'success', title: `${LABELS.replace} drone_launch.mp4` });
  });

  it('fitToFill: retimes into the loop span, carries the computed rate on the ghost', () => {
    const plan = planInsertMedia(scenes(), 'sc-1', 'm-05', 'fitToFill', ctx(), seqFactory('real'));
    expect(plan.ok).toBe(true);
    expect(plan.targetTrackId).toBe('tr-main');
    // 12.8s source → 26s range at 12.8/26× (within the rate clamp)
    expect(plan.geometry.ghost).toMatchObject({ trackId: 'tr-main', start: 2, dur: 26, laneIndex: 1, laneKind: 'main' });
    expect(plan.geometry.ghost!.speed).toBeCloseTo(12.8 / 26, 6);
    expect(plan.geometry.arrows).toEqual({ down: true, right: false });
    // the range's covered spans + trims: el-1 tail, el-2/el-3 fully, el-4 head
    expect(plan.patch.map((o) => o.op)).toEqual(['patchElement', 'removeElement', 'removeElement', 'patchElement', 'insertElement']);
    expect((plan.patch[0] as { id: string; fields: { duration: number } }).fields.duration).toBe(2);
    expect((plan.patch[1] as { id: string }).id).toBe('el-2');
    expect((plan.patch[2] as { id: string }).id).toBe('el-3');
    const tail = plan.patch[3] as { id: string; fields: { startTime: number; duration: number } };
    expect(tail.id).toBe('el-4');
    expect(tail.fields.startTime).toBe(28);
    expect(tail.fields.duration).toBe(2);
    const placed = plan.patch[4] as Extract<InsertPlan['patch'][number], { op: 'insertElement' }>;
    expect(placed.element).toMatchObject({ mediaId: 'm-05', startTime: 2, duration: 26 });
    expect(placed.element.speed).toBeCloseTo(12.8 / 26, 6);
    expect(plan.clearSelection).toBe(false);
    expect(plan.toast).toMatchObject({ kind: 'success', title: `${LABELS.fitToFill} sunset_timelapse.mp4` });
  });

  it('the planner is PURE: the input scenes are never mutated', () => {
    const input = scenes();
    const before = JSON.stringify(input);
    planInsertMedia(input, 'sc-1', 'm-03', 'insert', ctx({ playhead: 12 }), seqFactory('real'));
    planInsertMedia(input, 'sc-1', 'm-08', 'placeOnTop', ctx({ playhead: 2 }), seqFactory('real'));
    expect(JSON.stringify(input)).toBe(before);
  });
});

/* =====================================================================
 * P1-1a — refusal paths (ok:false + honest reason, verbatim payloads)
 * ===================================================================== */

describe('insertPlan refusal paths (honest ok:false, never a silent no-op)', () => {
  it('unknown media → error reason', () => {
    const plan = planInsertMedia(scenes(), 'sc-1', 'm-99', 'insert', ctx(), seqFactory('real'));
    expect(plan.ok).toBe(false);
    expect(plan.reason).toEqual({ kind: 'error', title: 'Edit action', detail: 'unknown media m-99' });
  });

  it('insert/overwrite/rippleOverwrite with every video lane locked → the no-unlocked-lane refusal', () => {
    const locked = lockKinds(scenes(), ['main', 'overlay']);
    for (const mode of ['insert', 'overwrite', 'rippleOverwrite'] as InsertMediaMode[]) {
      const plan = planInsertMedia(locked, 'sc-1', 'm-03', mode, ctx(), seqFactory('real'));
      expect(plan.ok).toBe(false);
      expect(plan.reason).toEqual({
        kind: 'error', title: 'Edit action',
        detail: 'no unlocked video lane for drone_launch.mp4 (locked lanes refuse placement — spec 06)',
      });
      expect(plan.patch).toHaveLength(0);
    }
  });

  it('append (image) with every overlay lane locked → the overlay laneWord refusal', () => {
    const locked = lockKinds(scenes(), ['overlay']);
    const plan = planInsertMedia(locked, 'sc-1', 'm-08', 'append', ctx(), seqFactory('real'));
    expect(plan.ok).toBe(false);
    expect(plan.reason).toEqual({
      kind: 'error', title: 'Edit action',
      detail: 'no unlocked overlay lane for title_card.png (locked lanes refuse placement — spec 06)',
    });
  });

  it('placeOnTop with an AUDIO source and every audio lane locked → the audio refusal (audio has no "top")', () => {
    const locked = lockKinds(scenes(), ['audio']);
    const plan = planInsertMedia(locked, 'sc-1', 'm-06', 'placeOnTop', ctx(), seqFactory('real'));
    expect(plan.ok).toBe(false);
    expect(plan.reason).toEqual({
      kind: 'error', title: 'Edit action',
      detail: 'no unlocked audio lane for ocean_ambience.wav (locked lanes refuse placement — spec 06)',
    });
  });

  it('replace with no compatible selection → the info refusal', () => {
    const plan = planInsertMedia(scenes(), 'sc-1', 'm-03', 'replace', ctx({ selection: [] }), seqFactory('real'));
    expect(plan.ok).toBe(false);
    expect(plan.reason).toEqual({
      kind: 'info', title: 'Replace',
      detail: 'select a clip on a compatible track first (replace swaps the selected clip for this media — Resolve edit-function semantics)',
    });
  });

  it('fitToFill for a duration-less source → the In/Out info refusal', () => {
    const plan = planInsertMedia(scenes(), 'sc-1', 'm-08', 'fitToFill', ctx(), seqFactory('real'));
    expect(plan.ok).toBe(false);
    expect(plan.reason).toEqual({
      kind: 'info', title: 'Fit to Fill',
      detail: 'set an In/Out range (I / O) with duration, and use a media asset with known duration — fit-to-fill retimes the source into the range',
    });
  });

  it('fitToFill outside the rate clamp → the honest error refusal (never a silent mis-fit)', () => {
    // 120s source into a 2s range → rate 60 > 5
    const plan = planInsertMedia(scenes(), 'sc-1', 'm-06', 'fitToFill', ctx({ loop: { start: 2, end: 4 } }), seqFactory('real'));
    expect(plan.ok).toBe(false);
    expect(plan.reason).toEqual({
      kind: 'error', title: 'Fit to Fill',
      detail: 'source 120.0s cannot fill 2.0s within the rate clamp [0.01, 5] — refusing rather than silently mis-fitting',
    });
  });

  it('no active scene → the preserved silent branch (ok:false, NO reason)', () => {
    const plan = planInsertMedia(scenes(), 'sc-404', 'm-03', 'insert', ctx(), seqFactory('real'));
    expect(plan.ok).toBe(false);
    expect(plan.reason).toBeUndefined();
  });

  it('explicit targetTrackId refused (locked/incompatible) → honest refusal, never a silent redirect', () => {
    // locked A2
    const plan = planInsertMedia(scenes(), 'sc-1', 'm-06', 'insert', ctx({ targetTrackId: 'tr-audio-2' }), seqFactory('real'));
    expect(plan.ok).toBe(false);
    expect(plan.reason).toMatchObject({ kind: 'error', title: 'Edit action' });
    // incompatible: video over an audio lane
    const plan2 = planInsertMedia(scenes(), 'sc-1', 'm-03', 'insert', ctx({ targetTrackId: 'tr-audio-1' }), seqFactory('real'));
    expect(plan2.ok).toBe(false);
    expect(plan2.reason).toMatchObject({ kind: 'error', title: 'Edit action' });
  });
});

/* =====================================================================
 * P2-4 (R20-W6FIX) — the same-element-KIND retarget law (contract §5(b))
 * ===================================================================== */

describe('R20-W6FIX P2-4: resolveTargetTrack retargets by SAME ELEMENT KIND', () => {
  it('video source + TEXT clip selected → MAIN (the old track-accepts reading landed on the overlay)', () => {
    const plan = planInsertMedia(scenes(), 'sc-1', 'm-03', 'insert', ctx({ playhead: 12, selection: ['el-5'] }), seqFactory('real'));
    expect(plan.ok).toBe(true);
    expect(plan.targetTrackId).toBe('tr-main'); // same-kind law: text ≠ video → IGNORED
    expect(plan.geometry.ghost!.trackId).toBe('tr-main');
  });

  it('audio source + VIDEO clip selected → the audio lane (type wins)', () => {
    const plan = planInsertMedia(scenes(), 'sc-1', 'm-06', 'append', ctx({ selection: ['el-1'] }), seqFactory('real'));
    expect(plan.ok).toBe(true);
    expect(plan.targetTrackId).toBe('tr-audio-1');
  });

  it('same-kind selection DOES retarget: a video element living on an overlay lane pulls the video source there', () => {
    const scs = scenes();
    trackOf(scs[0]!, 'tr-overlay-1').elements.push({
      ...trackOf(scs[0]!, 'tr-overlay-1').elements[0]!,
      id: 'syn-v', type: 'video', trackId: 'tr-overlay-1', startTime: 20, duration: 4, mediaId: 'm-01',
    });
    const plan = planInsertMedia(scs, 'sc-1', 'm-03', 'insert', ctx({ playhead: 21, selection: ['syn-v'] }), seqFactory('real'));
    expect(plan.ok).toBe(true);
    expect(plan.targetTrackId).toBe('tr-overlay-1'); // retarget fired (kind default would be tr-main)
  });

  it('image source retargets via a selected IMAGE clip to ITS lane (not the first overlay)', () => {
    const scs = scenes();
    const secondOverlay: TrackJSON = {
      id: 'tr-overlay-2', kind: 'overlay', name: 'Text 2', badge: 'T2',
      muted: false, solo: false, locked: false, visible: true,
      elements: [{ id: 'syn-img', type: 'image', trackId: 'tr-overlay-2', name: 'card', startTime: 20, duration: 4, mediaId: 'm-08', opacity: 1 }],
    };
    scs[0]!.tracks.splice(2, 0, secondOverlay); // BELOW tr-overlay-1
    const plan = planInsertMedia(scs, 'sc-1', 'm-08', 'insert', ctx({ playhead: 21, selection: ['syn-img'] }), seqFactory('real'));
    expect(plan.ok).toBe(true);
    expect(plan.targetTrackId).toBe('tr-overlay-2'); // same-kind retarget beats the first-unlocked kind lane
  });

  it('fitToFill NEVER retargets: an overlay-resident selection cannot hijack the lane (R19 kind-lane law)', () => {
    // el-5 is a TEXT clip on tr-overlay-1 — the overlay ACCEPTS video, so
    // the pre-W6 law would have fit-to-filled onto tr-overlay-1
    const plan = planInsertMedia(scenes(), 'sc-1', 'm-05', 'fitToFill', ctx({ selection: ['el-5'] }), seqFactory('real'));
    expect(plan.ok).toBe(true);
    expect(plan.targetTrackId).toBe('tr-main');
    expect(plan.geometry.ghost!.trackId).toBe('tr-main');
  });
});

/* =====================================================================
 * P2-1 (R20-W6FIX) — placeOnTop minted-track ghost geometry
 * ===================================================================== */

describe('R20-W6FIX P2-1: placeOnTop with a MINTED track (no unlocked overlay)', () => {
  it('mints the track above main and declares the live-scene INSERT line on the ghost', () => {
    const locked = lockKinds(scenes(), ['overlay']);
    const plan = planInsertMedia(locked, 'sc-1', 'm-08', 'placeOnTop', ctx({ playhead: 2 }), seqFactory('real'));
    expect(plan.ok).toBe(true);
    // createTrack splices at the main index (live array position 1)
    const create = plan.patch.find((o) => o.op === 'createTrack') as Extract<InsertPlan['patch'][number], { op: 'createTrack' }>;
    expect(create).toBeDefined();
    expect(create.insertIndex).toBe(1);
    expect(create.track.kind).toBe('overlay');
    // the ghost carries the insert line (P2-1) + working-scene lane numbering
    expect(plan.geometry.ghost!.insertLineAfter).toBe(1);
    expect(plan.geometry.ghost!.laneIndex).toBe(1); // post-commit numbering (splice shifts main to 2)
    expect(plan.geometry.ghost!.laneKind).toBe('overlay');
    expect(plan.geometry.ghost).toMatchObject({ start: 2, dur: 4 });
    expect(plan.patch.map((o) => o.op)).toEqual(['createTrack', 'insertElement']);
    expect(plan.clearSelection).toBe(true);
  });
});

/* =====================================================================
 * P1-1a/P1-1c — patch-replay equivalence (preview == commit by construction)
 * ===================================================================== */

const REPLAY_CASES: { name: string; mediaId: string; mode: InsertMediaMode; ctx: InsertPlanContext; lockOverlay?: boolean }[] = [
  { name: 'insert (split + ripple)', mediaId: 'm-03', mode: 'insert', ctx: ctx({ playhead: 12 }) },
  { name: 'overwrite (remove + trim)', mediaId: 'm-05', mode: 'overwrite', ctx: ctx({ playhead: 8.5 }) },
  { name: 'append (lane tail)', mediaId: 'm-08', mode: 'append', ctx: ctx() },
  { name: 'placeOnTop (MINTED track — lockOverlay)', mediaId: 'm-08', mode: 'placeOnTop', ctx: ctx({ playhead: 2 }), lockOverlay: true },
  { name: 'rippleOverwrite (delta 0)', mediaId: 'm-05', mode: 'rippleOverwrite', ctx: ctx({ playhead: 0 }) },
  { name: 'replace (selection-driven)', mediaId: 'm-03', mode: 'replace', ctx: ctx({ selection: ['el-1'] }) },
  { name: 'fitToFill (retimed)', mediaId: 'm-05', mode: 'fitToFill', ctx: ctx() },
];

describe('patch-replay equivalence: real-id plan vs preview-fake-id plan (all 7 modes)', () => {
  it.each(REPLAY_CASES)('$name', ({ mediaId, mode, ctx: c, lockOverlay }) => {
    if (lockOverlay) act(() => { S().toggleTrackCmd('sc-1', 'tr-overlay-1', 'locked'); });
    const snap = clone(S().scenes);
    const realSeen = new Set<string>();
    const fakeSeen = new Set<string>();
    const planA = planInsertMedia(snap, 'sc-1', mediaId, mode, c, recordingFactory('real', realSeen));
    const planB = planInsertMedia(snap, 'sc-1', mediaId, mode, c, recordingFactory('fake', fakeSeen));
    expect(planA.ok).toBe(true);
    expect(planB.ok).toBe(true);

    // commit the REAL-id plan on the exact pre-state; snapshot
    const sceneA = applyOn(snap, planA);
    // commit the FAKE-id plan on the identical pre-state; snapshot
    const sceneB = applyOn(snap, planB);

    // the minted ids differ (real vs fake tags, zero overlap)…
    expect(realSeen.size).toBe(fakeSeen.size);
    expect(realSeen.size).toBeGreaterThan(0);
    expect([...realSeen].filter((id) => fakeSeen.has(id))).toEqual([]);
    // …and every minted id really is in the applied doc
    for (const id of realSeen) expect(JSON.stringify(sceneA)).toContain(id);
    for (const id of fakeSeen) expect(JSON.stringify(sceneB)).toContain(id);
    // GEOMETRY EQUAL: the two docs are identical once minted identities are
    // scrubbed — the patch is id-independent, so the preview IS the commit
    expect(scrub(sceneA, realSeen)).toEqual(scrub(sceneB, fakeSeen));
    expect(scrub(planA.geometry, realSeen)).toEqual(scrub(planB.geometry, fakeSeen));
    expect(scrub(planA.patch, realSeen)).toEqual(scrub(planB.patch, fakeSeen));
  });
});

describe('preview id discipline (the C48 law: preview never advances ids)', () => {
  it('a preview plan NEVER advances the store\'s real id counter', () => {
    const seqOf = (ids: string[]) => Number(ids[0]!.split('-').pop());
    const before = mintTrackIds(1);
    // a full preview computation over the live doc (the useInsertPreview call)
    planInsertMedia(S().scenes, 'sc-1', 'm-03', 'insert', ctx({ playhead: 12 }), makePreviewIdFactory());
    planInsertMedia(S().scenes, 'sc-1', 'm-08', 'placeOnTop', ctx({ playhead: 2 }), makePreviewIdFactory());
    const after = mintTrackIds(1);
    // exactly MY probe's +1 — the two previews advanced the shared counter 0
    expect(seqOf(after) - seqOf(before)).toBe(1);
  });

  it('preview ids are deterministic per computation (a FRESH factory per plan)', () => {
    const snap = clone(S().scenes);
    const p1 = planInsertMedia(snap, 'sc-1', 'm-03', 'insert', ctx({ playhead: 12 }), makePreviewIdFactory());
    const p2 = planInsertMedia(snap, 'sc-1', 'm-03', 'insert', ctx({ playhead: 12 }), makePreviewIdFactory());
    expect(mintedIdsOf(p1)).toEqual(mintedIdsOf(p2));
    expect(mintedIdsOf(p1).every((id) => id.startsWith('preview-'))).toBe(true);
  });
});

/* =====================================================================
 * P1-1c — preview == commit GEOMETRY: plan.geometry vs the applied diff
 * ===================================================================== */

describe('preview == commit GEOMETRY (plan.geometry vs the applied scene diff)', () => {
  it('insert: displaced[].to == post-apply startTime; ghost + splitGhost == the applied elements', () => {
    const snap = clone(S().scenes);
    const plan = planInsertMedia(snap, 'sc-1', 'm-03', 'insert', ctx({ playhead: 12 }), seqFactory('g'));
    const after = applyOn(snap, plan);
    const main = elsOf(after[0]!, 'tr-main');
    const placedId = (plan.patch.at(-1) as { element: ElementJSON }).element.id;
    const placed = main.find((e) => e.id === placedId)!;
    // ghost.start/dur == the NEW element's startTime/duration
    expect(placed.startTime).toBe(plan.geometry.ghost!.start);
    expect(placed.duration).toBe(plan.geometry.ghost!.dur);
    // every displaced follower sits exactly at displaced[].to (pure
    // translate — its duration is unchanged from the pre-state)
    for (const d of plan.geometry.displaced ?? []) {
      const el = main.find((e) => e.id === d.elId)!;
      const pre = elsOf(snap[0]!, 'tr-main').find((e) => e.id === d.elId)!;
      expect(el.startTime).toBeCloseTo(d.to, 6);
      expect(el.duration).toBe(pre.duration);
    }
    // splitGhost == the right half's final resting place
    const right = main.find((e) => e.id.startsWith('el-2-b'))!;
    expect(right.startTime).toBeCloseTo(plan.geometry.splitGhost!.start, 6);
    expect(right.duration).toBeCloseTo(plan.geometry.splitGhost!.dur, 6);
  });

  it('overwrite: overwriteSpans == the removed/trimmed spans (survivors disjoint, spans were real content)', () => {
    const snap = clone(S().scenes);
    const plan = planInsertMedia(snap, 'sc-1', 'm-05', 'overwrite', ctx({ playhead: 8.5 }), seqFactory('g'));
    const after = applyOn(snap, plan);
    const main = elsOf(after[0]!, 'tr-main');
    const placedId = (plan.patch.at(-1) as { element: ElementJSON }).element.id;
    const spans = plan.geometry.overwriteSpans!;
    expect(spans.length).toBe(2);
    // every span was REAL pre-op content (non-empty overlap with the pre doc)
    for (const s of spans) {
      expect(s.dur).toBeGreaterThan(0);
      const pre = elsOf(snap[0]!, 'tr-main');
      expect(pre.some((e) => spansOverlap({ startTime: s.start, duration: s.dur }, e))).toBe(true);
    }
    // post-apply: NO surviving (non-placed) element intersects any span —
    // the spans are exactly the removed/trimmed-away regions
    const survivors = main.filter((e) => e.id !== placedId);
    expect(survivors.map((e) => e.id).sort()).toEqual(['el-1', 'el-3', 'el-4']);
    for (const s of spans) {
      for (const e of survivors) {
        expect(spansOverlap({ startTime: s.start, duration: s.dur }, e)).toBe(false);
      }
    }
    // and the placed clip fills the whole overwrite window
    const placed = main.find((e) => e.id === placedId)!;
    expect(placed.startTime).toBe(8.5);
    expect(placed.duration).toBe(12.8);
  });

  it('fitToFill: ghost.start/dur/speed == the applied retimed element', () => {
    const snap = clone(S().scenes);
    const plan = planInsertMedia(snap, 'sc-1', 'm-05', 'fitToFill', ctx(), seqFactory('g'));
    const after = applyOn(snap, plan);
    const main = elsOf(after[0]!, 'tr-main');
    const placedId = (plan.patch.at(-1) as { element: ElementJSON }).element.id;
    const placed = main.find((e) => e.id === placedId)!;
    expect(placed.startTime).toBe(plan.geometry.ghost!.start);
    expect(placed.duration).toBe(plan.geometry.ghost!.dur);
    expect(placed.speed).toBeCloseTo(plan.geometry.ghost!.speed!, 6);
  });

  it('placeOnTop mint: the ghost\'s insert line == where applyInsertPlan splices the new track', () => {
    act(() => { S().toggleTrackCmd('sc-1', 'tr-overlay-1', 'locked'); });
    const snap = clone(S().scenes);
    const plan = planInsertMedia(snap, 'sc-1', 'm-08', 'placeOnTop', ctx({ playhead: 2 }), seqFactory('g'));
    const after = applyOn(snap, plan);
    const create = plan.patch.find((o) => o.op === 'createTrack') as Extract<InsertPlan['patch'][number], { op: 'createTrack' }>;
    // the applied track array: minted track AT insertIndex, main pushed down
    const idx = after[0]!.tracks.findIndex((t) => t.id === create.trackId);
    expect(idx).toBe(create.insertIndex);
    expect(after[0]!.tracks[idx]!.kind).toBe('overlay');
    expect(after[0]!.tracks[idx + 1]!.id).toBe('tr-main');
    // the ghost declared the same insert line (P2-1)
    expect(plan.geometry.ghost!.insertLineAfter).toBe(idx);
  });
});

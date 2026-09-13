/* insertPlan nets — R24-miniplus W4 (DESIGN-R24 D7): the pure planner's
 * per-mode laws, on tiny grid-clean fixtures (the patch is applied to a
 * clone the way commit applies it to the draft; strict equality — the
 * grid is binary-exact). */

import { describe, expect, it, beforeEach } from 'vitest';
import { planInsert } from './insertPlan';
import { seedDoc, cloneClip, __resetClipIds, type Doc, type Media } from './mockData';

const S_media = (doc: Doc, id: string): Media => doc.media.find((m) => m.id === id)!;

/** commit's draft discipline: clone the clips, run the patch, return the
 *  doc the store would have sealed. */
function apply(doc: Doc, media: Media, mode: Parameters<typeof planInsert>[2], opts: Parameters<typeof planInsert>[3]) {
  const plan = planInsert(doc, media, mode, opts);
  if (!plan.ok) return { ok: false as const, reason: plan.reason, doc };
  const draft: Doc = { tracks: doc.tracks, media: doc.media, clips: doc.clips.map(cloneClip) };
  plan.patch(draft);
  return { ok: true as const, toast: plan.toast, doc: draft };
}

/** touching chain: cA [0,3.5] | cB [3.5,7] (both m-drone/m-beach, 4.5 media). */
const chainDoc = (): Doc => ({
  tracks: seedDoc().tracks,
  media: seedDoc().media,
  clips: [
    { id: 'cA', trackId: 'V1', mediaId: 'm-drone', start: 0, duration: 3.5 },
    { id: 'cB', trackId: 'V1', mediaId: 'm-beach', start: 3.5, duration: 3.5 },
  ],
});

beforeEach(() => {
  __resetClipIds();
});

describe('R24 W4 planInsert: insert (split + ripple shift)', () => {
  it('splits the straddler per the D2 table and shifts later clips right', () => {
    const doc = chainDoc();
    // cA carries the full plus family so the disposition table is visible
    doc.clips[0] = {
      ...doc.clips[0],
      sourceStart: 0.5,
      fadeIn: 1,
      fadeOut: 0.5,
      transitionOut: { type: 'crossfade', presentation: 'Cross Dissolve', duration: 0.5, alignment: 0.5 },
    };
    const r = apply(doc, S_media(doc, 'm-drone'), 'insert', { playhead: 1.5, sourceRange: { in: 1, out: 2 } });
    expect(r.ok).toBe(true);
    const v1 = r.doc.clips.filter((c) => c.trackId === 'V1').sort((a, b) => a.start - b.start);
    // [cA-left 0-1.5][placed 1.5-2.5][cA-right 2.5-4.5][cB 4.5-8]
    expect(v1.map((c) => [c.start, c.duration])).toEqual([
      [0, 1.5],
      [1.5, 1],
      [2.5, 2],
      [4.5, 3.5],
    ]);
    const placed = v1[1];
    expect(placed.mediaId).toBe('m-drone');
    expect(placed.sourceStart).toBe(1); // sourceStart = in
    const left = v1[0];
    const right = v1[2];
    // the split table: left keeps fadeIn (clamped), loses fadeOut + transitionOut
    expect(left.fadeIn).toBe(1);
    expect(left.fadeOut).toBeUndefined();
    expect(left.transitionOut).toBeUndefined();
    // right: sourceStart advances by the consumed offset; fadeOut rides;
    // transitionOut rides (from the PRE-mutation shape, cloned — no alias)
    expect(right.sourceStart).toBe(2); // 0.5 + (1.5 - 0)
    expect(right.fadeOut).toBe(0.5);
    expect(right.fadeIn).toBeUndefined();
    expect(right.transitionOut).toEqual(doc.clips[0].transitionOut);
    expect(right.transitionOut).not.toBe(doc.clips[0].transitionOut);
    expect(right.mediaId).toBe('m-drone');
  });

  it('refuses an explicit target lane of the wrong kind (never a silent redirect)', () => {
    const r = apply(chainDoc(), S_media(chainDoc(), 'm-drone'), 'insert', { playhead: 0, targetTrackId: 'A1' });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/V1|video|audio/i);
  });
});

describe('R24 W4 planInsert: overwrite (the straddle cases)', () => {
  it('tail straddle trims the tail; head straddle trims the head + advances the window', () => {
    const doc: Doc = {
      tracks: seedDoc().tracks,
      media: seedDoc().media,
      clips: [
        { id: 'cA', trackId: 'V1', mediaId: 'm-drone', start: 0, duration: 3 }, // [0,3]
        { id: 'cB', trackId: 'V1', mediaId: 'm-beach', start: 3, duration: 4.5, sourceStart: 0.5 }, // [3,7.5]
      ],
    };
    // placed [2,5): cA is a TAIL straddle (end 3 <= 5); cB a HEAD straddle
    const r = apply(doc, S_media(doc, 'm-drone'), 'overwrite', { playhead: 2, sourceRange: { in: 0, out: 3 } });
    expect(r.ok).toBe(true);
    const cA = r.doc.clips.find((c) => c.id === 'cA')!;
    const cB = r.doc.clips.find((c) => c.id === 'cB')!;
    const placed = r.doc.clips.find((c) => c.id !== 'cA' && c.id !== 'cB')!;
    expect(cA.duration).toBe(2); // the covered tail [2,3) left
    expect(cA.start).toBe(0);
    expect(cB.start).toBe(5); // the covered head [3,5) left
    expect(cB.duration).toBe(2.5);
    expect(cB.sourceStart).toBe(2.5); // 0.5 + (5 - 3) — the window advances
    expect(placed.start).toBe(2);
    expect(placed.duration).toBe(3);
    expect(r.doc.clips).toHaveLength(3);
  });

  it('a fully-covered clip is removed (its transitionOut drops with it)', () => {
    const doc: Doc = {
      tracks: seedDoc().tracks,
      media: seedDoc().media,
      clips: [
        { id: 'cA', trackId: 'V1', mediaId: 'm-drone', start: 0, duration: 1.5 },
        { id: 'cB', trackId: 'V1', mediaId: 'm-beach', start: 2, duration: 1 },
      ],
    };
    // placed [2,4): cB [2,3] is fully covered → gone
    const r = apply(doc, S_media(doc, 'm-drone'), 'overwrite', { playhead: 2, sourceRange: { in: 0.5, out: 2.5 } });
    expect(r.ok).toBe(true);
    expect(r.doc.clips.find((c) => c.id === 'cB')).toBeUndefined();
    expect(r.doc.clips).toHaveLength(2); // cA + the placed clip
  });

  it('a middle straddle splits with the covered span cut OUT (the right half lands after)', () => {
    const doc: Doc = {
      tracks: seedDoc().tracks,
      media: seedDoc().media,
      clips: [
        {
          id: 'cC',
          trackId: 'V1',
          mediaId: 'm-gopro',
          start: 1,
          duration: 5.5,
          sourceStart: 0.5,
          fadeOut: 0.5,
        }, // [1,6.5]
      ],
    };
    // placed [2.5,4.5): cC covers the middle on both sides
    const r = apply(doc, S_media(doc, 'm-sunset'), 'overwrite', { playhead: 2.5, sourceRange: { in: 0, out: 2 } });
    expect(r.ok).toBe(true);
    const v1 = r.doc.clips.filter((c) => c.trackId === 'V1').sort((a, b) => a.start - b.start);
    expect(v1.map((c) => [c.start, c.duration])).toEqual([
      [1, 1.5], // the left keeps the head
      [2.5, 2], // the placed clip
      [4.5, 2], // the right half lands after the placed clip
    ]);
    const right = v1[2];
    expect(right.sourceStart).toBe(4); // 0.5 + (4.5 - 1) — advanced PAST the span
    expect(right.fadeOut).toBe(0.5); // the tail family rides
    expect(v1[0].fadeOut).toBeUndefined(); // the left loses it
    expect(v1[0].mediaId).toBe('m-gopro');
  });
});

describe('R24 W4 planInsert: replace (exact-length, F10)', () => {
  it('swaps the selected clip at the same start/length; NO downstream trim', () => {
    const doc = chainDoc();
    const r = apply(doc, S_media(doc, 'm-beach'), 'replace', { playhead: 0, selectedClipId: 'cA' });
    expect(r.ok).toBe(true);
    const v1 = r.doc.clips.filter((c) => c.trackId === 'V1').sort((a, b) => a.start - b.start);
    expect(v1).toHaveLength(2);
    expect(v1[0]).toMatchObject({ start: 0, duration: 3.5, mediaId: 'm-beach' });
    expect(v1[0].sourceStart).toBeUndefined(); // window fits at 0 — absent
    expect(v1[1]).toMatchObject({ id: 'cB', start: 3.5, duration: 3.5 }); // untouched
  });

  it('the window slides to fit (in clamps to extent − dur); refuses when it cannot cover', () => {
    const doc = chainDoc();
    // m-gopro 5.5s, marked in 2.5 → slides to 5.5 − 3.5 = 2
    const r = apply(doc, S_media(doc, 'm-gopro'), 'replace', {
      playhead: 0,
      selectedClipId: 'cA',
      sourceRange: { in: 2.5, out: 5.5 },
    });
    expect(r.ok).toBe(true);
    expect(r.doc.clips.find((c) => c.id !== 'cB')!.sourceStart).toBe(2);
    // a 5s window cannot be covered by a 4.5s media → honest refusal
    const longDoc: Doc = {
      tracks: seedDoc().tracks,
      media: seedDoc().media,
      clips: [{ id: 'cX', trackId: 'V1', mediaId: 'm-gopro', start: 0, duration: 5 }],
    };
    const bad = apply(longDoc, S_media(longDoc, 'm-beach'), 'replace', { playhead: 0, selectedClipId: 'cX' });
    expect(bad.ok).toBe(false);
    expect(bad.reason).toMatch(/cannot cover|shorter/i);
    // no selection → refusal
    expect(apply(doc, S_media(doc, 'm-beach'), 'replace', { playhead: 0 }).ok).toBe(false);
  });

  it('images CAN replace (an extent is an edit decision — no window arithmetic)', () => {
    const doc = chainDoc();
    const r = apply(doc, S_media(doc, 'm-title'), 'replace', { playhead: 0, selectedClipId: 'cA' });
    expect(r.ok).toBe(true);
    const placed = r.doc.clips.find((c) => c.id !== 'cB')!;
    expect(placed).toMatchObject({ mediaId: 'm-title', start: 0, duration: 3.5 }); // the replaced length
    expect(placed.sourceStart).toBeUndefined(); // a still has no window
  });
});

describe('R24 W4 planInsert: append (lane tail, playhead ignored)', () => {
  it('places at the content end regardless of the playhead', () => {
    const doc = chainDoc(); // contentEnd = 7
    const r = apply(doc, S_media(doc, 'm-sunset'), 'append', { playhead: 5 });
    const placed = r.doc.clips.find((c) => c.id !== 'cA' && c.id !== 'cB')!;
    expect(placed.start).toBe(7); // the tail, NOT the playhead
    expect(placed.duration).toBe(4); // the full media window
    expect(r.doc.clips).toHaveLength(3);
  });

  it("images append media.duration (a still's extent is the media fact)", () => {
    const doc = chainDoc();
    const r = apply(doc, S_media(doc, 'm-title'), 'append', { playhead: 0 });
    const placed = r.doc.clips.find((c) => c.id !== 'cA' && c.id !== 'cB')!;
    expect(placed.duration).toBe(3.5);
    expect(placed.sourceStart).toBeUndefined();
  });
});

describe('R24 W4 planInsert: rippleOverwrite (the delta law)', () => {
  it('later clips shift by placed − displaced (the gap closes), floored at the placed end', () => {
    const doc: Doc = {
      tracks: seedDoc().tracks,
      media: seedDoc().media,
      clips: [
        { id: 'cA', trackId: 'V1', mediaId: 'm-drone', start: 0, duration: 1 }, // [0,1]
        { id: 'cB', trackId: 'V1', mediaId: 'm-beach', start: 3, duration: 1 }, // [3,4] (gap [1,3))
      ],
    };
    // placed [0,2.5): cA fully covered (displaced 1); cB untouched by the
    // overwrite (starts at 3 >= 2.5); delta = 2.5 − 1 = 1.5 → cB → 4.5
    const r = apply(doc, S_media(doc, 'm-drone'), 'rippleOverwrite', { playhead: 0, sourceRange: { in: 0, out: 2.5 } });
    expect(r.ok).toBe(true);
    const cB = r.doc.clips.find((c) => c.id === 'cB')!;
    expect(cB.start).toBe(4.5);
    expect(cB.duration).toBe(1);
    expect(r.doc.clips.find((c) => c.id === 'cA')).toBeUndefined();
    const placed = r.doc.clips.find((c) => c.id !== 'cB')!;
    expect(placed).toMatchObject({ start: 0, duration: 2.5 });
  });

  it('a fully tiled span nets delta 0 — followers stay put', () => {
    const doc: Doc = {
      tracks: seedDoc().tracks,
      media: seedDoc().media,
      clips: [
        { id: 'cA', trackId: 'V1', mediaId: 'm-drone', start: 0, duration: 1 }, // [0,1]
        { id: 'cB', trackId: 'V1', mediaId: 'm-beach', start: 1, duration: 1 }, // [1,2]
      ],
    };
    // placed [0,1): cA fully covered (displaced 1); cB head-straddles at
    // cut 0 → unchanged; delta = 1 − 1 = 0 → nothing moves
    const r = apply(doc, S_media(doc, 'm-drone'), 'rippleOverwrite', { playhead: 0, sourceRange: { in: 0, out: 1 } });
    const cB = r.doc.clips.find((c) => c.id === 'cB')!;
    expect(cB.start).toBe(1);
    expect(cB.duration).toBe(1);
  });
});

describe('R24 W4 planInsert: fitToFill (rate + refusals)', () => {
  const spanDoc = (): Doc => ({
    tracks: seedDoc().tracks,
    media: seedDoc().media,
    clips: [{ id: 'cA', trackId: 'V1', mediaId: 'm-drone', start: 0, duration: 3 }], // the span
  });

  it('retimes the marked window into the span — speed recorded, duration = span', () => {
    const doc = spanDoc();
    const r = apply(doc, S_media(doc, 'm-sunset'), 'fitToFill', {
      playhead: 0,
      selectedClipId: 'cA',
      sourceRange: { in: 1, out: 3 }, // a 2s window into a 3s span → 2/3×
    });
    expect(r.ok).toBe(true);
    const placed = r.doc.clips.find((c) => c.id !== 'cA')!;
    expect(r.doc.clips.find((c) => c.id === 'cA')).toBeUndefined(); // replaced
    expect(placed.start).toBe(0);
    expect(placed.duration).toBe(3); // the span
    expect(placed.speed).toBeCloseTo(2 / 3, 6);
    expect(placed.sourceStart).toBe(1);
  });

  it('refuses: no selection, no marked range, images, and outside the rate clamp', () => {
    const doc = spanDoc();
    const media = (id: string) => S_media(doc, id);
    expect(apply(doc, media('m-sunset'), 'fitToFill', { playhead: 0, sourceRange: { in: 1, out: 3 } }).ok).toBe(false);
    expect(apply(doc, media('m-sunset'), 'fitToFill', { playhead: 0, selectedClipId: 'cA' }).ok).toBe(false);
    expect(
      apply(doc, media('m-title'), 'fitToFill', { playhead: 0, selectedClipId: 'cA', sourceRange: { in: 0, out: 2 } }).ok,
    ).toBe(false);
    // 4s window into a 0.5s span = 8× — outside [0.1, 4]
    const tinyDoc: Doc = {
      tracks: seedDoc().tracks,
      media: seedDoc().media,
      clips: [{ id: 'cT', trackId: 'V1', mediaId: 'm-drone', start: 0, duration: 0.5 }],
    };
    const bad = apply(tinyDoc, S_media(tinyDoc, 'm-sunset'), 'fitToFill', {
      playhead: 0,
      selectedClipId: 'cT',
      sourceRange: { in: 0, out: 4 },
    });
    expect(bad.ok).toBe(false);
    expect(bad.reason).toMatch(/clamp/i);
  });
});

/* otProject tests — the executable seam pins (OT-SEAMS §1.6/§3.4).
   Every law here is the REGISTERED conversion made testable: the C1
   sceneBridge copies this module verbatim, and these nets travel with it
   as the bridge's acceptance floor (spec 14 §3.1 C1 row (d)). */

import { describe, expect, it } from 'vitest';
import { seedDoc, type Clip, type Media } from './mockData';
import {
  OT_TICKS_PER_SECOND,
  fromTicks,
  projectClip,
  projectClipBack,
  toTicks,
} from './otProject';

describe('toTicks / fromTicks (OT-SEAMS §3.4 — the registered time base)', () => {
  it('grid-clean values are exact integers (strict equality)', () => {
    // the 0.5 grid is binary-exact: every doc time converts losslessly
    expect(toTicks(0)).toBe(0);
    expect(toTicks(0.5)).toBe(60_000);
    expect(toTicks(12.5)).toBe(1_500_000);
    expect(toTicks(4.5)).toBe(540_000);
  });

  it('rounds off-grid pointer times to the NEAREST tick (the registered policy)', () => {
    // a snap-off drag parks the playhead/clip at raw pointer times; the
    // bridge policy is nearest-tick, never truncation
    expect(toTicks(1 / 7)).toBe(17_143); // 17142.857… → 17143
    expect(toTicks(0.5000001)).toBe(60_000);
    expect(toTicks(0.5000041)).toBe(60_000); // the half-tick boundary is 0.5 + 1/240000
    expect(toTicks(0.5000042)).toBe(60_001); // just past it (60000.504 rounds up)
  });

  it('fromTicks inverts exactly on the grid and to sub-half-tick elsewhere', () => {
    expect(fromTicks(toTicks(12.5))).toBe(12.5);
    expect(fromTicks(60_000)).toBe(0.5);
    const raw = 6.333_333_3;
    const back = fromTicks(toTicks(raw));
    expect(Math.abs(back - raw)).toBeLessThan(0.5 / OT_TICKS_PER_SECOND);
  });
});

describe('projectClip (OT-SEAMS §1.6 — the in-point-0 element model)', () => {
  const doc = seedDoc();

  it('projects the seed c1 exactly: start 0, dur 3.5 over the 4.5s source', () => {
    // the registered formula: {trimStart: 0, trimEnd: sourceDuration − duration}
    const p = projectClip(doc.clips[0], doc.media[0]);
    expect(p.id).toBe('c1');
    expect(p.startTicks).toBe(0);
    expect(p.durationTicks).toBe(420_000);
    expect(p.sourceDurationTicks).toBe(540_000);
    expect(p.trimStartTicks).toBe(0);
    expect(p.trimEndTicks).toBe(120_000); // 4.5s − 3.5s = 1.0s of unshown tail
  });

  it('a full-window clip projects trimEnd 0 (the whole source is shown)', () => {
    const media: Media = { id: 'm-x', name: 'x.mp4', kind: 'video', duration: 4, hue: 0 };
    const clip: Clip = { id: 'c-x', trackId: 'V1', mediaId: 'm-x', start: 2, duration: 4 };
    const p = projectClip(clip, media);
    expect(p.trimStartTicks).toBe(0);
    expect(p.trimEndTicks).toBe(0);
    expect(p.durationTicks).toBe(p.sourceDurationTicks);
  });

  it('off-grid trims keep the trim invariant EXACT (tick arithmetic, not float difference)', () => {
    // a raw end-trim can land the duration off-grid; the invariant
    // trimStart + duration + trimEnd === sourceDuration holds exactly in
    // ticks because trimEnd is derived by tick subtraction
    const media: Media = { id: 'm-y', name: 'y.mp4', kind: 'video', duration: 5.5, hue: 90 };
    const clip: Clip = {
      id: 'c-y',
      trackId: 'V1',
      mediaId: 'm-y',
      start: 1.234_567_8,
      duration: 3.213_733_3, // a raw pointer trim result (snap off)
    };
    const p = projectClip(clip, media);
    expect(p.trimStartTicks + p.durationTicks + p.trimEndTicks).toBe(p.sourceDurationTicks);
    expect(fromTicks(p.durationTicks)).toBeCloseTo(clip.duration, 5);
    expect(p.durationTicks).toBeLessThanOrEqual(p.sourceDurationTicks);
  });

  it('throws on the doc-invariant violation (duration > source)', () => {
    // unreachable for valid docs (the clamp laws bound every trim by the
    // media duration) — a throw means an upstream bug, not a choice
    const media: Media = { id: 'm-z', name: 'z.mp4', kind: 'video', duration: 2, hue: 180 };
    const clip: Clip = { id: 'c-z', trackId: 'V1', mediaId: 'm-z', start: 0, duration: 2.5 };
    expect(() => projectClip(clip, media)).toThrow(/doc invariant violated/);
  });
});

describe('projectClipBack (the inverse — OT element → mini window)', () => {
  it('round-trips the seed corpus: project → back-project restores start + duration', () => {
    const doc = seedDoc();
    for (const clip of doc.clips) {
      const media = doc.media.find((m) => m.id === clip.mediaId)!;
      const p = projectClip(clip, media);
      const back = projectClipBack(p);
      expect(back.start).toBe(clip.start); // grid-clean: exact
      expect(back.duration).toBe(clip.duration); // grid-clean: exact
    }
  });

  it('round-trips off-grid windows to sub-half-tick tolerance', () => {
    const media: Media = { id: 'm-w', name: 'w.mp4', kind: 'video', duration: 6, hue: 45 };
    const clip: Clip = { id: 'c-w', trackId: 'V1', mediaId: 'm-w', start: 1.111_111_1, duration: 4.444_444_4 };
    const back = projectClipBack(projectClip(clip, media));
    expect(Math.abs(back.start - clip.start)).toBeLessThan(0.5 / OT_TICKS_PER_SECOND);
    expect(Math.abs(back.duration - clip.duration)).toBeLessThan(0.5 / OT_TICKS_PER_SECOND);
  });

  it('reads the registered example: window duration = source − trimStart − trimEnd', () => {
    // an OT-side element that trimmed 1s off the head and 0.5s off the
    // tail of a 6s source projects back to a 4.5s mini window
    const back = projectClipBack({
      startTicks: 240_000,
      trimStartTicks: 120_000,
      trimEndTicks: 60_000,
      sourceDurationTicks: 720_000,
    });
    expect(back.start).toBe(2);
    expect(back.duration).toBe(4.5);
  });
});

/* timecode.ts — SMPTE NDF formatter + shared time-field parser (spec 03 §4,
   spec 18 §4.4). The parser grammar contract is spec-facing: every time-based
   inspector field routes through parseTc, so its edge cases are pinned here. */

import { describe, expect, it } from 'vitest';
import { FPS, clamp, frame, parseTc, snapToFrame, tc, tcRuler, totalDuration } from './timecode';

describe('tc — SMPTE NDF formatter (24 fps project)', () => {
  it('formats zero as 00:00:00:00', () => {
    expect(tc(0)).toBe('00:00:00:00');
  });

  it('rounds to the nearest frame (half up)', () => {
    // frame boundary at 0.5: 0.4 frames → 0, 0.5 frames → 1 (Math.round)
    expect(tc(0.4 / 24)).toBe('00:00:00:00');
    expect(tc(0.5 / 24)).toBe('00:00:00:01');
    expect(tc(0.75 / 24)).toBe('00:00:00:01');
  });

  it('clamps negatives to zero', () => {
    expect(tc(-5)).toBe('00:00:00:00');
  });

  it('carries seconds/minutes/hours', () => {
    expect(tc(1)).toBe('00:00:01:00');
    expect(tc(60)).toBe('00:01:00:00');
    expect(tc(3600)).toBe('01:00:00:00');
    expect(tc(8.5)).toBe('00:00:08:12'); // 8s + 12 frames = sample clip el-2 start
  });

  it('honors a custom fps', () => {
    expect(tc(1, 25)).toBe('00:00:01:00');
    expect(tc(0.04, 25)).toBe('00:00:00:01');
  });

  it('minutes/seconds pad to two digits', () => {
    expect(tc(3661.5)).toBe('01:01:01:12');
  });
});

describe('tcRuler — short ruler label', () => {
  it('drops frames by default and hours when zero', () => {
    expect(tcRuler(8.5)).toBe('00:08');
    expect(tcRuler(0)).toBe('00:00');
  });

  it('keeps hours once nonzero', () => {
    expect(tcRuler(3600 + 90)).toBe('1:01:30');
  });

  it('includes frames on request', () => {
    expect(tcRuler(8.5, true)).toBe('00:08:12');
  });
});

describe('frame / clamp / snapToFrame / totalDuration', () => {
  it('frame() = 1/fps', () => {
    expect(frame()).toBeCloseTo(1 / 24);
    expect(frame(30)).toBeCloseTo(1 / 30);
  });

  it('clamp pins into [lo, hi]', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });

  it('snapToFrame rounds to the frame grid', () => {
    expect(snapToFrame(0.02)).toBeCloseTo(0);
    expect(snapToFrame(0.03)).toBeCloseTo(1 / 24);
    // already-clean values are stable (idempotent)
    expect(snapToFrame(8.5)).toBe(8.5);
  });
});

describe('totalDuration', () => {
  it('renders m:ss', () => {
    expect(totalDuration(62.4)).toBe('1:02');
    expect(totalDuration(0)).toBe('0:00');
    expect(totalDuration(65)).toBe('1:05');
  });

  it('R13 fix: minute rollover rounds BEFORE the split (no ":60")', () => {
    expect(totalDuration(119.6)).toBe('2:00'); // was "1:60"
    expect(totalDuration(59.9)).toBe('1:00');
    expect(totalDuration(120.4)).toBe('2:00');
  });
});

describe('parseTc — spec 18 §4.4 field grammar', () => {
  it('parses full HH:MM:SS:FF', () => {
    expect(parseTc('01:02:03:12')).toBeCloseTo(3723.5);
  });

  it('parses short forms with last group = frames', () => {
    expect(parseTc('08:12')).toBeCloseTo(8.5); // SS:FF
    expect(parseTc('01:08:12')).toBeCloseTo(68.5); // MM:SS:FF
  });

  it('rejects frame overflow as a typo', () => {
    expect(parseTc('00:00:00:24')).toBeNull(); // 24 frames at 24fps
    expect(parseTc('00:24')).toBeNull(); // 24 frames short form
  });

  it('parses plain seconds with optional fraction', () => {
    expect(parseTc('5')).toBe(5);
    expect(parseTc('0.75')).toBe(0.75);
    expect(parseTc('.5')).toBe(0.5);
  });

  it('parses the Nf frame-count form, case-insensitive', () => {
    expect(parseTc('18f')).toBeCloseTo(0.75);
    expect(parseTc('18F')).toBeCloseTo(0.75);
  });

  it('trims whitespace', () => {
    expect(parseTc('  08:12  ')).toBeCloseTo(8.5);
  });

  it('returns null for garbage and empty', () => {
    expect(parseTc('')).toBeNull();
    expect(parseTc('   ')).toBeNull();
    expect(parseTc('abc')).toBeNull();
    expect(parseTc('1:2:3:4:5')).toBeNull(); // 4+ colons — outside the grammar
    expect(parseTc('12:34:56')).toBeNull(); // last group 56 = frame overflow at 24fps
  });

  it('treats the 3-group form as MM:SS:FF with the last group = frames', () => {
    // Grammar per source: 2-3 group short forms, LAST group = frames.
    // '01:08:12' → 1m 8s + 12f = 68.5s
    expect(parseTc('01:08:12')).toBeCloseTo(68.5);
  });

  it('R13 fix: seconds/minutes above 59 in the group forms are typos → null', () => {
    expect(parseTc('00:75:12')).toBeNull(); // SS=75 in MM:SS:FF
    expect(parseTc('75:12')).toBeNull(); // SS=75 in SS:FF
    expect(parseTc('01:60:12')).toBeNull(); // SS=60 — boundary typo
    expect(parseTc('24:75')).toBeNull(); // FF=75 — frame overflow path
    // 2-group with SS ≤ 59 stays valid
    expect(parseTc('59:23')).toBeCloseTo(59 + 23 / 24);
    // hours (3-digit first group) are unbounded by design
    expect(parseTc('100:00:00:00')).toBeCloseTo(360000);
  });
});

describe('FPS constant', () => {
  it('is 24 (project fps)', () => {
    expect(FPS).toBe(24);
  });
});

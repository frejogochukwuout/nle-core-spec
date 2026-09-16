/* PR69 C5: the pure formatting seam finally has direct unit tests —
   every readout (transport, inspector, playhead pill, pool chips) flows
   through fmtTimecode/fmtRulerLabel, and the sibling shell-variants
   shipped a real :60-rollover bug in exactly this class. This
   implementation truncates (floor) instead of rounding — that invariant
   was previously guarded by nothing. filmstrip.ts gets the smoke net
   (URI parses + deterministic) it never had. */

import { describe, expect, it } from 'vitest';
import { fmtTimecode, fmtRulerLabel } from './timecode';
import { filmstripFor, thumbGradientFor } from './filmstrip';
import { seedDoc } from './mockData';

describe('fmtTimecode (MM:SS.d — one decimal, TRUNCATED)', () => {
  it('zero and exact grid values', () => {
    expect(fmtTimecode(0)).toBe('00:00.0');
    expect(fmtTimecode(59.99)).toBe('00:59.9'); // truncation, not rounding (0.99 → .9)
    expect(fmtTimecode(65.25)).toBe('01:05.2'); // :60 rollover — 65s → 1m 05s, .25 → .2
    expect(fmtTimecode(60)).toBe('01:00.0');
  });

  it('hours keep rolling minutes (no HH field by design)', () => {
    expect(fmtTimecode(3600)).toBe('60:00.0');
    expect(fmtTimecode(3605.999)).toBe('60:05.9');
  });

  it('negatives clamp to zero (the playhead never renders -0.x)', () => {
    expect(fmtTimecode(-0.5)).toBe('00:00.0');
    expect(fmtTimecode(-65)).toBe('00:00.0');
  });

  it('sub-frame floats truncate, never round up into the next second', () => {
    // 59.999 must NOT round to "01:00.0" — truncation keeps it 00:59.9
    expect(fmtTimecode(59.999)).toBe('00:59.9');
    expect(fmtTimecode(2.999)).toBe('00:02.9');
    // floating-point noise around the grid (0.1+0.2 class) stays put
    expect(fmtTimecode(1.0000000001)).toBe('00:01.0');
  });
});

describe('fmtRulerLabel (MM:SS — whole seconds, rounded, ≥ 1s steps by law)', () => {
  it('zero, mid-minute, and the :60 rollover', () => {
    expect(fmtRulerLabel(0)).toBe('00:00');
    expect(fmtRulerLabel(59.6)).toBe('01:00'); // rounds to 60 → rolls the minute (no "00:60" bug)
    expect(fmtRulerLabel(60)).toBe('01:00');
    expect(fmtRulerLabel(125)).toBe('02:05');
  });

  it('negatives clamp to zero', () => {
    expect(fmtRulerLabel(-1)).toBe('00:00');
  });
});

describe('filmstrip (smoke — URI parses + deterministic)', () => {
  const media = seedDoc().media[0];

  it('filmstripFor returns a deterministic SVG data-URI css url()', () => {
    const css = filmstripFor(media);
    expect(css).toMatch(/^url\("data:image\/svg\+xml/);
    expect(filmstripFor(media)).toBe(css); // deterministic — same media, same URI
  });

  it('thumbGradientFor parses as a data URI and is stable', () => {
    const g = thumbGradientFor(media);
    expect(g).toContain('linear-gradient');
    expect(thumbGradientFor(media)).toBe(g);
  });
});

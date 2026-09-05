/* variants.ts — variant model + serialization + persistence precedence
   (URL hash > localStorage > default). parseVariant's lenient defaults are a
   contract: only `theme` is required to be a known value; every other
   dimension falls back to the canon value when unknown. */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { DEFAULT_VARIANT, PRESETS, matchesPreset, parseVariant, saveVariant, serializeVariant, loadVariant, type Variant } from './variants';

describe('serializeVariant / parseVariant round-trip', () => {
  it('round-trips the default', () => {
    expect(parseVariant(serializeVariant(DEFAULT_VARIANT))).toEqual(DEFAULT_VARIANT);
  });

  it('round-trips each preset', () => {
    for (const p of PRESETS) {
      expect(parseVariant(serializeVariant(p.variant))).toEqual(p.variant);
    }
  });

  it('round-trips off-preset combinations', () => {
    const v: Variant = { theme: 'studio', density: 'pro', clipStyle: 'blocks', accent: 'ember', headerStyle: 'readout' };
    expect(parseVariant(serializeVariant(v))).toEqual(v);
  });

  it('survives whitespace padding', () => {
    const s = serializeVariant(DEFAULT_VARIANT).replaceAll(',', ' , ');
    expect(parseVariant(s)).toEqual(DEFAULT_VARIANT);
  });
});

describe('parseVariant fallback semantics', () => {
  it('requires a known theme — unknown theme returns null', () => {
    expect(parseVariant('theme:neon,density:pro')).toBeNull();
    expect(parseVariant('theme:resolve')).toEqual(DEFAULT_VARIANT);
  });

  it('returns null for null/undefined/empty', () => {
    expect(parseVariant(null)).toBeNull();
    expect(parseVariant(undefined)).toBeNull();
    expect(parseVariant('')).toBeNull();
  });

  it('falls back to canon for unknown density/clip/accent/header values', () => {
    const v = parseVariant('theme:light,density:cozy,clip:chunky,accent:magenta,header:fancy');
    expect(v).toEqual({ ...DEFAULT_VARIANT, theme: 'light' });
  });

  it('parses all three accent options', () => {
    for (const accent of ['gold', 'ember', 'violet'] as const) {
      expect(parseVariant(`theme:studio,accent:${accent}`)).toEqual({ ...DEFAULT_VARIANT, theme: 'studio', accent });
    }
  });
});

describe('PRESETS invariants', () => {
  it('has exactly A/B/C with unique ids', () => {
    expect(PRESETS.map((p) => p.id)).toEqual(['A', 'B', 'C']);
  });

  it('preset A is the spec canon (DEFAULT_VARIANT)', () => {
    expect(PRESETS[0].variant).toEqual(DEFAULT_VARIANT);
    expect(matchesPreset(DEFAULT_VARIANT, PRESETS[0])).toBe(true);
  });

  it('every preset matches itself and no other', () => {
    for (const a of PRESETS) for (const b of PRESETS) {
      expect(matchesPreset(a.variant, b)).toBe(a === b);
    }
  });
});

describe('loadVariant precedence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', window.location.pathname);
  });
  afterEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', window.location.pathname);
  });

  it('returns the default when nothing is stored', () => {
    expect(loadVariant()).toEqual(DEFAULT_VARIANT);
  });

  it('URL hash wins over localStorage', () => {
    window.localStorage.setItem('nle-shell-variants:v1', serializeVariant(PRESETS[1].variant));
    window.location.hash = `v=${serializeVariant(PRESETS[2].variant)}`;
    expect(loadVariant()).toEqual(PRESETS[2].variant);
  });

  it('falls back to localStorage when no hash', () => {
    window.localStorage.setItem('nle-shell-variants:v1', serializeVariant(PRESETS[1].variant));
    expect(loadVariant()).toEqual(PRESETS[1].variant);
  });

  it('ignores a hash with an invalid value (falls to LS/default)', () => {
    window.localStorage.setItem('nle-shell-variants:v1', serializeVariant(PRESETS[1].variant));
    window.location.hash = 'v=theme:neon';
    expect(loadVariant()).toEqual(PRESETS[1].variant);
  });
});

describe('saveVariant side effects', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', window.location.pathname);
  });
  afterEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', window.location.pathname);
  });

  it('writes localStorage and mirrors into the hash', () => {
    saveVariant(PRESETS[1].variant);
    expect(window.localStorage.getItem('nle-shell-variants:v1')).toBe(serializeVariant(PRESETS[1].variant));
    expect(window.location.hash).toContain(`v=${encodeURIComponent(serializeVariant(PRESETS[1].variant))}`);
  });
});

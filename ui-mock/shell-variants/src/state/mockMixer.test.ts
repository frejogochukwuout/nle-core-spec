/* mockMixer.ts — the mock G-layer sidecar (spec 20 §4.2 shape). Role
   assignment cycles dialogue→bgm→sfx→music; default ducking points every
   bgm/music track at the first dialogue track; db↔slider math must be
   inverse (the fader control round-trips through it). */

import { describe, expect, it } from 'vitest';
import { ROLES, ROLE_LABEL, createMixerScene, dbLabel, dbToSlider, sliderToDb } from './mockMixer';

describe('createMixerScene', () => {
  it('assigns roles in dialogue→bgm→sfx→music order, cycling', () => {
    const scene = createMixerScene(['a', 'b', 'c', 'd', 'e']);
    expect(scene.roles).toEqual({
      a: 'dialogue', b: 'bgm', c: 'sfx', d: 'music', e: 'dialogue',
    });
  });

  it('builds a strip for every audio track id', () => {
    const scene = createMixerScene(['t1', 't2']);
    expect(Object.keys(scene.tracks)).toEqual(['t1', 't2']);
  });

  it('gives the first dialogue strip the sample defaults (−3 dB, EQ insert)', () => {
    const scene = createMixerScene(['a', 'b']);
    expect(scene.tracks.a).toEqual({
      fader: -3, pan: 0, inserts: ['EQ', null], auxA: 0, auxB: 0, auxPreFader: false, outputBus: 0,
    });
  });

  it('non-first tracks get −12 / −6 dB and empty insert slots', () => {
    const scene = createMixerScene(['a', 'b', 'c']);
    expect(scene.tracks.b.fader).toBe(-12);
    expect(scene.tracks.c.fader).toBe(-6);
    expect(scene.tracks.b.inserts).toEqual([null, null]);
  });

  it('sets default ducking for bgm/music tracks pointing at the dialogue track', () => {
    const scene = createMixerScene(['a', 'b', 'c', 'd']);
    // b = bgm, d = music → both duck under a (dialogue); sfx c has none
    expect(scene.ducking.b).toEqual({ source: 'a', amount: 0.6, attack: 20, release: 400 });
    expect(scene.ducking.d).toEqual({ source: 'a', amount: 0.6, attack: 20, release: 400 });
    expect(scene.ducking.a).toBeUndefined();
    expect(scene.ducking.c).toBeUndefined();
  });

  it('aux buses are the Reverb/Spare fixtures', () => {
    const scene = createMixerScene(['a']);
    expect(scene.buses.a1).toEqual({ name: 'Reverb', returnGain: -6, on: true });
    expect(scene.buses.a2).toEqual({ name: 'Spare', returnGain: 0, on: false });
  });

  it('music (4th) track gets the 0.3 auxA send', () => {
    const scene = createMixerScene(['a', 'b', 'c', 'd']);
    expect(scene.tracks.d.auxA).toBe(0.3);
    expect(scene.tracks.a.auxA).toBe(0);
  });

  it('handles an empty track list', () => {
    const scene = createMixerScene([]);
    expect(scene.tracks).toEqual({});
    expect(scene.ducking).toEqual({});
  });

  it('returns fresh object graphs per call (no shared mutation)', () => {
    const s1 = createMixerScene(['a', 'b']);
    const s2 = createMixerScene(['a', 'b']);
    s1.tracks.a.fader = 0;
    expect(s2.tracks.a.fader).toBe(-3);
  });
});

describe('db ↔ slider math', () => {
  it('round-trips through the pair', () => {
    for (const db of [-60, -48, -24, -6, 0, 3, 6]) {
      expect(sliderToDb(dbToSlider(db))).toBeCloseTo(db, 6);
    }
  });

  it('maps the −60 dB floor to 0 and +6 dB to 1', () => {
    expect(dbToSlider(-60)).toBe(0);
    expect(dbToSlider(6)).toBe(1);
  });

  it('clamps out-of-range db into the slider span (values outside just extrapolate — components clamp before)', () => {
    // documented behavior: the formulas are linear over [-60, +6]; callers clamp
    expect(dbToSlider(-70)).toBeLessThan(0);
    expect(dbToSlider(10)).toBeGreaterThan(1);
  });
});

describe('dbLabel', () => {
  it('renders −∞ at the floor', () => {
    expect(dbLabel(-60)).toBe('−∞');
    expect(dbLabel(-100)).toBe('−∞');
  });

  it('formats one decimal with explicit + for positive (ASCII minus, ∞ only for the floor)', () => {
    expect(dbLabel(-6)).toBe('-6.0 dB');
    expect(dbLabel(0)).toBe('0.0 dB');
    expect(dbLabel(3.5)).toBe('+3.5 dB');
  });
});

describe('role tables', () => {
  it('ROLES and ROLE_LABEL cover the same four keys', () => {
    expect(ROLES).toEqual(['dialogue', 'bgm', 'sfx', 'music']);
    expect(Object.keys(ROLE_LABEL).sort()).toEqual([...ROLES].sort());
  });
});

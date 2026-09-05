/* Real-ish waveform envelopes (R18e — feedback #12).
   The RH reference renders decoded audio as discrete vertical bars; the
   mock kept the bar GRAMMAR but every bar was the same height, which read
   as a placeholder pattern. This module generates a deterministic,
   audio-shaped envelope per media asset: smooth low-frequency body +
   mid-frequency detail + per-bar jitter, attack/decay ramps at the ends.
   Same input → same waveform (no Math.random), so stories and tests stay
   stable. Rendering stays discrete bars (the look the user liked). */

import type { Media } from './mockData';

/** FNV-1a 32-bit — tiny, deterministic, no dependencies. */
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const clamp01 = (v: number): number => Math.min(Math.max(v, 0), 1);

/**
 * Sample the envelope for a media asset at normalized position u ∈ [0,1].
 * Value ∈ (0,1]: 1 = full-height bar. Deterministic per media id.
 */
export function envelopeAt(media: Media, u: number): number {
  const seed = hash32(media.id);
  const phase = (seed % 1000) / 1000 * Math.PI * 2;
  const detPhase = ((seed >>> 10) % 1000) / 1000 * Math.PI * 2;
  // body: two slow waves (speech/music-like pacing)
  const body = 0.5 + 0.22 * Math.sin(phase + u * Math.PI * 2 * 1.7) + 0.16 * Math.sin(phase * 1.3 + u * Math.PI * 2 * 3.1);
  // detail: mid-frequency flutter, seeded per-asset
  const detail = 0.09 * Math.sin(detPhase + u * Math.PI * 2 * 23);
  // ends: attack ramp in / decay ramp out (16% each side)
  const ramp = Math.min(1, u / 0.16, (1 - u) / 0.16);
  // small deterministic per-position jitter (hash of quantized u)
  const jit = ((hash32(`${media.id}:${Math.round(u * 96)}`) % 100) / 100 - 0.5) * 0.12;
  return clamp01(0.12 + Math.abs(body + detail + jit) * ramp);
}

/**
 * Envelope bars for rendering: `bars` samples of the envelope, each the
 * relative bar height (0..1). Bar count is caller-chosen (clip width / px
 * per bar) and the envelope is resolution-independent (sampled by u).
 */
export function waveformFor(media: Media, bars: number): number[] {
  const n = Math.max(1, Math.min(Math.round(bars), 256));
  const out = new Array<number>(n);
  for (let i = 0; i < n; i += 1) {
    out[i] = envelopeAt(media, n === 1 ? 0.5 : i / (n - 1));
  }
  return out;
}

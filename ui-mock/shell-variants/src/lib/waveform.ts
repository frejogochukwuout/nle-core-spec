/* Deterministic seeded waveform generator (spec 02 §8.3 is the real source;
   this is a mock-level stand-in so audio clips render believable waveforms) */

export interface WaveBar {
  min: number; // 0..1 below midline
  max: number; // 0..1 above midline
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const cache = new Map<string, WaveBar[]>();

export interface WaveformOpts {
  amplitude?: number;
  /* R19 B3 (fixes th_mto2xtgc): optional ATTACK/DECAY ramps — the first and
     last `ramp`·bars bars of the envelope are scaled by a linear rise/fall so
     a clip's waveform reads like real program audio (quiet head + tail — the
     pattern the task calls "body waves + attack/decay ramps"). DEFAULT 0 =
     body waves only: the pool / viewer / sound-library callers keep their
     exact current look (opt-in; the timeline Clip passes 0.08). */
  ramp?: number;
}

export function getWaveform(id: string, bars: number, opts?: WaveformOpts): WaveBar[] {
  const amp = opts?.amplitude ?? 1;
  const ramp = clamp01(opts?.ramp ?? 0);
  const key = `${id}:${bars}:${amp}:${ramp}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const rand = mulberry32(hashStr(id));
  /* ramp window: up to half the bars on each end (clamped); the linear shape
     (i+1)/(rampBars+1) keeps the apex strictly inside the window so the very
     first/last bar is never a hard zero (≥ 1/(rampBars+1) of the body energy). */
  const rampBars = Math.floor(bars * Math.min(ramp, 0.5));
  const out: WaveBar[] = [];
  let energy = 0.5;
  for (let i = 0; i < bars; i++) {
    // slow envelope drift + per-bar jitter → speech/music-ish look
    energy = clamp01(energy + (rand() - 0.5) * 0.35);
    const peak = (0.25 + energy * 0.75) * amp;
    let shape = 1;
    if (rampBars > 0) {
      if (i < rampBars) shape = (i + 1) / (rampBars + 1);
      else if (i >= bars - rampBars) shape = (bars - i) / (rampBars + 1);
    }
    const max = peak * shape * (0.55 + rand() * 0.45);
    const min = peak * shape * (0.55 + rand() * 0.45);
    out.push({ min: Math.min(min, 1), max: Math.min(max, 1) });
  }
  cache.set(key, out);
  return out;
}

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x));
}

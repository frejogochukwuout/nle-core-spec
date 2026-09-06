/* StripGraphs — the EQ + dynamics sparkline thumbnails from the Fairlight
   reference (audio_mixer.html §2.4 row 5: two 28px-tall graph boxes). Pure
   display: the curves are DETERMINISTIC per key (FNV-1a seed → mulberry32),
   so the same track always paints the same curves across renders/tests —
   no state, no engine. Token strokes only (the reference's cyan/olive/blue
   map to --type-audio / --meter-amber / --knob-active).
   R19-B1: part of the reference strip anatomy integration. */

/** FNV-1a string hash → 32-bit seed (same family as meterEngine/waveform) */
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — deterministic PRNG from a seed */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** EQ thumbnail — 5 control points (y ∈ [6, 24], inverted = dB) joined by a
    smooth Q/T path in the reference's grammar. flat=true paints the master's
    unity line (reference M1). */
export function eqPathFor(key: string, flat = false): string {
  if (flat) return 'M 0 15 L 100 15';
  const rng = seededRng(hashSeed(`${key}#eq`));
  const y = (i: number) => (i === 0 ? 15 : 12 + Math.round(rng() * 12));
  const p0 = y(0), p1 = y(1), p2 = y(2), p3 = y(3), p4 = y(4);
  return `M 0 ${p0} Q 12.5 ${p0}, 25 ${p1} T 50 ${p2} T 75 ${p3} T 100 ${p4}`;
}

/** dynamics thumbnail — transfer curve with a knee + a vertical threshold
    line position (x ∈ [40, 80]); both deterministic per key. */
export function dynCurveFor(key: string): { path: string; threshold: number } {
  const rng = seededRng(hashSeed(`${key}#dyn`));
  const threshold = 40 + Math.floor(rng() * 41); // 40..80
  const kneeY = Math.round(30 - threshold * 0.3);
  return { path: `M 0 30 L ${threshold} ${kneeY} L 100 0`, threshold };
}

/** EQ sparkline box — 28px tall, viewBox 100×30 (reference geometry) */
export function EqThumb({ trackKey, flat = false, testId = 'eq-thumb' }: {
  trackKey: string; flat?: boolean; testId?: string;
}) {
  return (
    <svg
      data-testid={testId}
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="h-[28px] w-full shrink-0 rounded-[2px] border border-strong bg-inset"
    >
      <path data-testid={`${testId}-path`} d={eqPathFor(trackKey, flat)} fill="none" stroke="var(--type-audio)" strokeWidth={1.5} />
    </svg>
  );
}

/** dynamics sparkline box — 28px tall, transfer curve + threshold line */
export function DynThumb({ trackKey, testId = 'dyn-thumb' }: { trackKey: string; testId?: string }) {
  const { path, threshold } = dynCurveFor(trackKey);
  return (
    <svg
      data-testid={testId}
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="h-[28px] w-full shrink-0 rounded-[2px] border border-strong bg-inset"
    >
      <path data-testid={`${testId}-path`} d={path} fill="none" stroke="var(--meter-amber)" strokeWidth={1.5} />
      <line x1={threshold} y1={2} x2={threshold} y2={28} stroke="var(--knob-active)" strokeWidth={1} />
    </svg>
  );
}

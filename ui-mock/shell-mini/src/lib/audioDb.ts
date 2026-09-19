/* R24-miniplus (DESIGN-R24 D2/F8): the ONE volume map — the doc stores
 * LINEAR gain [0, 2] (the spec-15 ClipJSON vocabulary); the UI speaks dB
 * (the professional grammar: the inspector field + the mixer fader).
 * ONE module owns the conversion so the two surfaces can never disagree
 * (the variants' one-map law). The coherent pair: linear [0, 2] ↔ dB
 * [−18, +6] (0 dB = 1.0 unity; −18 dB = 0.126; +6 dB = 1.995 ≈ 2). */

export const VOL_MIN = 0;
export const VOL_MAX = 2;
export const DB_MIN = -18;
export const DB_MAX = 6;

/** linear → dB (clamped to the ONE declared pair [DB_MIN, DB_MAX] —
 *  F7/wave-review: the DB_FLOOR escape hatch is retired; a near-zero
 *  linear clamps to DB_MIN so the Volume field never shows a value its
 *  own validation rejects). */
export function volToDb(v: number): number {
  const lin = Math.min(Math.max(v, VOL_MIN), VOL_MAX);
  if (lin <= 0) return DB_MIN;
  const db = 20 * Math.log10(lin);
  return Math.min(Math.max(db, DB_MIN), DB_MAX);
}

/** dB → linear (clamped to the pair). */
export function dbToVol(db: number): number {
  const d = Math.min(Math.max(db, DB_MIN), DB_MAX);
  const lin = Math.pow(10, d / 20);
  return Math.min(Math.max(lin, VOL_MIN), VOL_MAX);
}

/** The display form: dB with one decimal; the floor renders as its number
 * (the mini's grammar — no −∞ glyph; the floor IS the minimum). */
export function fmtDb(db: number): string {
  return `${db >= 0 ? '+' : ''}${db.toFixed(1)} dB`;
}

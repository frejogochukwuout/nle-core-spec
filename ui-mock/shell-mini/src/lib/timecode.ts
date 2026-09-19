/* Timecode formatting — MM:SS.d (DESIGN D5 / audit Q3).
   The single seam for the no-fps decision: ruler labels use MM:SS
   (labelStep is floored at 1s, so labels never need the decimal),
   the playhead pill + transport readout use MM:SS.d. */

/** MM:SS.d — e.g. 0 → "00:00.0", 65.25 → "01:05.2" (one decimal, truncated). */
export function fmtTimecode(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const m = Math.floor(clamped / 60);
  const s = Math.floor(clamped % 60);
  const d = Math.floor((clamped - Math.floor(clamped)) * 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${d}`;
}

/** MM:SS — ruler labels (whole seconds; labelStep >= 1s by law). */
export function fmtRulerLabel(seconds: number): string {
  const clamped = Math.max(0, Math.round(seconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

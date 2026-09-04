/* SMPTE NDF timecode — spec 03 §4 formatter (mock-level, 24 fps project) */

export const FPS = 24;

export function tc(seconds: number, fps: number = FPS): string {
  const total = Math.max(0, Math.round(seconds * fps));
  const f = total % fps;
  const s = Math.floor(total / fps) % 60;
  const m = Math.floor(total / (fps * 60)) % 60;
  const h = Math.floor(total / (fps * 3600));
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${p2(h)}:${p2(m)}:${p2(s)}:${p2(f)}`;
}

/** short label for ruler: drops hours+frames at coarse zoom */
export function tcRuler(seconds: number, withFrames = false): string {
  const total = Math.round(seconds * FPS);
  const f = total % FPS;
  const s = Math.floor(total / FPS) % 60;
  const m = Math.floor(total / (FPS * 60)) % 60;
  const h = Math.floor(total / (FPS * 3600));
  const p2 = (n: number) => String(n).padStart(2, '0');
  const core = `${h > 0 ? h + ':' : ''}${p2(m)}:${p2(s)}`;
  return withFrames ? `${core}:${p2(f)}` : core;
}

export const frame = (fps: number = FPS) => 1 / fps;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** snap seconds to the frame grid (spec 03 MediaTime discipline, mock-level) */
export function snapToFrame(seconds: number, fps: number = FPS): number {
  return Math.round(seconds * fps) / fps;
}

export function totalDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* ---- shared time-field parser (spec 18 §4.4 field contracts) ----------
   ONE parser for every time-based inspector field — never per-field.
   Grammar (validated against project fps):
     "HH:MM:SS:FF"  NDF timecode; 2- and 3-group short forms ("SS:FF",
                    "MM:SS:FF") also resolve, last group = frames
     "SS.s"         seconds with optional fraction ("5", "0.75", ".5")
     "Nf"           frame count, case-insensitive suffix ("18f")
   Returns seconds, or null when unparseable / frames overflow fps.
   Range checking stays in the NumberField (it owns the invalid-state
   contract: red border + message + no dispatch). */
export function parseTc(input: string, fps: number = FPS): number | null {
  const s = input.trim();
  if (!s) return null;
  const frames = s.match(/^(\d+)\s*f$/i);
  if (frames) return Number(frames[1]) / fps;
  if (/^\d{1,3}(:\d{1,2}){1,3}$/.test(s)) {
    const parts = s.split(':').map(Number);
    const ff = parts[parts.length - 1];
    if (ff >= fps) return null; // frame overflow reads as a typo, not a guess
    let secs = 0;
    let unit = 1; // right-to-left places: seconds, minutes, hours
    for (let i = parts.length - 2; i >= 0; i--) {
      secs += parts[i] * unit;
      unit *= 60;
    }
    return secs + ff / fps;
  }
  if (/^-?(\d+(\.\d+)?|\.\d+)$/.test(s)) return Number(s);
  return null;
}

/* WheelsPanel — R20-W4b, the ColorConsole Primaries tab (C51; formerly the
   rail tab, D3 rework). Reference anatomy (resolvecolorwheels_html, color-
   cluster §1) UNCHANGED: header row (Primaries — Color Wheels | LOG toggle |
   reset), Temp/Tint/Contrast/Pivot/Mid-Detail compact dual-column top
   controls, the 4 wheels in the responsive grid (150px ring + 124px disc +
   puck + rotated thumb dot + center crosshair), per-wheel YRGB rows + the
   master luma DIAL, the 6 bottom master sliders with gradient color-bars,
   the LUT select footer.

   WHAT CHANGED (the R19 sin fixed): every value is STORE-DRIVEN — the panel
   reads the target's GradeParams (W4a lib/color, spec 08 §4.2 field names
   verbatim) through useGradeRecord and writes via setGrade; there is NO
   local useState for grade values (only transient gesture buffers that
   commit on pointer-up — ONE undoable setGrade per drag, the D3 law).

   R25-W3 (DESIGN-R25 §1 R6/§3 W3/§6 A3; issue th_mtzolu4o "these controls
   are not working correctly — research how those work in Resolve first"):
   the puck grammar is REWRITTEN to A3's Resolve verdict. The old absolute
   model (direction = hue from the gesture, distance = amount, one jump per
   drag) was WRONG. The new law:
     · disc drags are RELATIVE/ACCUMULATING (trackball-style): pointerdown
       grabs anywhere (NO jump); every pointermove adds Δpointer to the
       balance vector v (1:1 px in disc space, screen-Y flipped), clamped at
       the disc radius |v| ≤ 62. The puck position IS v and PERSISTS between
       gestures through the store's hue/amount fields (derive v on idle
       renders, accumulate during the gesture).
     · center = neutral; crossing the center = the complementary hue
       (continuous — v simply negates, no snap). Dead zone ≤3% of the radius
       zeroes the committed amount (tiny jitters stay neutral).
     · Shift+drag = ABSOLUTE jump (v = pointer − center, clamped at the rim).
     · Ctrl/Cmd+drag INSIDE the disc routes the drag to the MASTER scalar
       (Resolve's documented modifier) — the same left/right map as the
       horizontal master dial below the wheel.
     · LIVE preview: every pointermove updates the transient puck + the YRGB
       readouts; ONE setGrade per gesture on pointer-up (the D3 law).
     · dbl-click the DISC = color-only reset (v → 0, master untouched); the
       per-wheel corner button = color AND master reset; the numeric-row
       dbl-click resets keep the R24-W5a resetTo semantics.
     · hue ring orientation is VECTORSCOPE-style (A3): red upper-LEFT at
       330°, 60° spacing — matching the house vectorscope graticule
       (scopesMath targets, R ≈ 347° idealized to 330°); see HUE_RING_ZERO.

   The luma DIAL writes the wheel's SCALAR (lift/gamma/gain/offset, spec 08
   §16.A "independent RGB multiplier controls" — one f32 each) as a relative
   horizontal drag (left = darker, right = lighter). YRGB rows are DERIVED
   READOUTS (yrgbReadout, offset ×1023 code values) — read-only with the
   spec 08 §16.A aria hint, not editable (engine seam has no per-channel
   numeric editing).

   LOG toggle: spec 08 defines NO log-space wheels (W4a's grep-verified
   note) — the toggle swaps the wheel LABELS only (Lift/Gamma/Gain →
   Shadows/Midtones/Highlights), the math is unchanged; the honest boundary
   is the button's data-tip. */

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Crosshair, RotateCcw } from 'lucide-react';
import { MicroSlider, NumCell, ReadCell } from './controls';
import { useGradeRecord, type GradeRecord } from './useGradeTarget';
import { useGradingToast, useHonestToast } from './useHonestToast';
import { DEFAULT_GRADE, hsv2rgb, yrgbReadout, type WheelId, type YrgbReadout } from '../../../lib/color';
import { clamp } from '../../../lib/timecode';
import type { GradePatch } from '../../../state/useUiStore';

/** one-field store write helper (typed patch — computed keys stay strict). */
const fieldPatch = (key: 'shHue' | 'midHue' | 'hlHue' | 'offHue' | 'shAmount' | 'midAmount' | 'hlAmount' | 'offAmount' | 'lift' | 'gamma' | 'gain' | 'offset' | 'temperature' | 'tint' | 'contrast' | 'pivot' | 'midDetail' | 'colorBoost' | 'shadows' | 'highlights' | 'saturation' | 'hue' | 'lumMix' | 'exposure', v: number): GradePatch => {
  const p: GradePatch = {};
  p[key] = v;
  return p;
};

/* ---------- geometry / constants (color-cluster.md §1.4) ---------- */

const RING_CIRC = 295.3; // 2π·47 — the ring arc dasharray
const WHEEL_BOX = 150; // outer ring container (svg viewBox 100 → 1.5px/unit)
const DISC = 124; // color disc diameter
/** R25-W3 (A3): the puck clamp radius — |v| ≤ DISC_R in disc px; the disc
 *  drag is 1:1 px so a 62px pull from center = amount 1.0 (full). */
const DISC_R = DISC / 2;
/** R25-W3 (A3): tiny center dead zone (≤3% of the radius) — |v| inside it
 *  commits amount 0 (jitters stay neutral; the puck still renders). */
const DEAD_ZONE = 0.03;
/** R25-W3 (A3): the master px→value map — this many px of horizontal drag
 *  spans the wheel's full [min, max] (the dial + Ctrl/Cmd+disc route share
 *  it, so both masters agree for the same gesture). */
const MASTER_PX_SPAN = 200;
/** R25-W3 (A3): the hue ring's vectorscope orientation — HUE 0 (red) sits
 *  at disc angle 330° (upper-LEFT, ~11 o'clock) with 60° spacing: R 330 /
 *  Mg 30 / B 90 / Cy 150 / G 210 / Yl 270 clockwise from up. This matches
 *  the house vectorscope graticule (scopesMath's computed targets: R≈347°,
 *  Mg≈29°, B≈103°, Cy≈167°, G≈209°, Yl≈283° — each within ~17° of the
 *  idealized hexagon). The pre-W3 ring had red at 12 o'clock (θ=0), which
 *  A3's "red upper-left" verdict supersedes. */
const HUE_RING_ZERO = 330;

interface WheelMeta {
  key: WheelId;
  /** GradeParams tint fields (spec 08 §4.2 verbatim). */
  hueField: 'shHue' | 'midHue' | 'hlHue' | 'offHue';
  amountField: 'shAmount' | 'midAmount' | 'hlAmount' | 'offAmount';
  label: string;
  logLabel: string;
  /** scalar bounds (color-layout §3.5) */
  min: number;
  max: number;
  step: number;
  /** the reference's per-wheel arc start rotation quirk */
  rot: number;
  hasY: boolean;
}

const WHEELS: WheelMeta[] = [
  { key: 'lift', hueField: 'shHue', amountField: 'shAmount', label: 'Lift', logLabel: 'Shadows', min: -0.2, max: 0.2, step: 0.001, rot: 90, hasY: true },
  { key: 'gamma', hueField: 'midHue', amountField: 'midAmount', label: 'Gamma', logLabel: 'Midtones', min: 0.25, max: 4, step: 0.01, rot: 90, hasY: true },
  { key: 'gain', hueField: 'hlHue', amountField: 'hlAmount', label: 'Gain', logLabel: 'Highlights', min: 0.25, max: 4, step: 0.01, rot: -90, hasY: true },
  { key: 'offset', hueField: 'offHue', amountField: 'offAmount', label: 'Offset', logLabel: 'Offset', min: -0.2, max: 0.2, step: 0.001, rot: 90, hasY: false },
];

const CHANNEL_BARS: Record<'Y' | 'R' | 'G' | 'B', string> = {
  Y: '#ffffff',
  R: '#ff3333',
  G: '#33cc33',
  B: '#3366ff',
};

/* ---------- R25-W3 (A3): puck ⇄ state mapping ---------- */

const mod360 = (x: number) => ((x % 360) + 360) % 360;
/** disc angle θ (0=up, CW) → spec hue, on the vectorscope-rotated ring: the
 *  disc's conic stops are HSV-hue DESCENDING from the red stop at
 *  HUE_RING_ZERO, so hue = (ZERO − θ) mod 360 — the puck sits ON the disc
 *  color it selects (up is 30° toward magenta, red itself is upper-left). */
const angleToHue = (theta: number) => mod360(HUE_RING_ZERO - Math.round(theta));
const hueToAngle = (hue: number) => mod360(HUE_RING_ZERO - Math.round(hue));

/** the balance vector v in DISC px (y UP — screen-Y flipped). */
interface Vec {
  x: number;
  y: number;
}
const thetaOf = (v: Vec) => mod360((Math.atan2(v.x, v.y) * 180) / Math.PI);
const vecFromPolar = (theta: number, len: number): Vec => ({
  x: Math.sin((theta * Math.PI) / 180) * len,
  y: Math.cos((theta * Math.PI) / 180) * len,
});
/** A3's rim clamp: |v| ≤ DISC_R (complementary crossing stays continuous —
 *  only the LENGTH is capped, never the direction). */
const clampVec = (v: Vec): Vec => {
  const len = Math.hypot(v.x, v.y);
  if (len <= DISC_R || len === 0) return v;
  return { x: (v.x / len) * DISC_R, y: (v.y / len) * DISC_R };
};
/** |v| → the spec amount 0..1 with the ≤3% dead zone (jitters stay neutral). */
const amountOf = (v: Vec) => {
  const m = Math.hypot(v.x, v.y) / DISC_R;
  return m <= DEAD_ZONE ? 0 : Math.min(1, m);
};

/* ---------- top controls (ref §1.3) — GradeParams fields ---------- */

const TOP_CTRL: {
  key: 'temperature' | 'tint' | 'contrast' | 'pivot' | 'midDetail';
  label: string;
  fmt: (v: number) => string;
  min: number;
  max: number;
  step: number;
  bar?: string;
}[] = [
  { key: 'temperature', label: 'Temp', fmt: (v) => v.toFixed(1), min: -100, max: 100, step: 0.5, bar: 'linear-gradient(to right, #3b82f6, #9ca3af, #f97316)' },
  { key: 'tint', label: 'Tint', fmt: (v) => v.toFixed(2), min: -100, max: 100, step: 0.5, bar: 'linear-gradient(to right, #22c55e, #9ca3af, #ec4899)' },
  { key: 'contrast', label: 'Contrast', fmt: (v) => v.toFixed(3), min: 0, max: 2, step: 0.005 },
  { key: 'pivot', label: 'Pivot', fmt: (v) => v.toFixed(3), min: 0, max: 1, step: 0.005 },
  { key: 'midDetail', label: 'Mid/Detail', fmt: (v) => v.toFixed(2), min: -100, max: 100, step: 1 },
];

/* ---------- bottom master sliders (ref §1.5) — GradeParams fields ---------- */

const MASTER_CTRL: {
  key: 'colorBoost' | 'shadows' | 'highlights' | 'saturation' | 'hue' | 'lumMix';
  label: string;
  min: number;
  max: number;
  fmt: (v: number) => string;
  bar?: string;
}[] = [
  { key: 'colorBoost', label: 'Color Boost', min: -100, max: 100, fmt: (v) => v.toFixed(2), bar: 'linear-gradient(to right, #ef4444, #22c55e, #3164ff)' },
  { key: 'shadows', label: 'Shadows', min: -100, max: 100, fmt: (v) => v.toFixed(2) },
  { key: 'highlights', label: 'Highlights', min: -100, max: 100, fmt: (v) => v.toFixed(2) },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100, fmt: (v) => v.toFixed(2), bar: 'linear-gradient(to right, #6b7280, #f87171, #60a5fa)' },
  { key: 'hue', label: 'Hue', min: 0, max: 100, fmt: (v) => v.toFixed(2), bar: 'linear-gradient(to right, #a855f7, #facc15, #4ade80)' },
  { key: 'lumMix', label: 'Lum Mix', min: 0, max: 100, fmt: (v) => v.toFixed(2), bar: 'linear-gradient(to right, #ef4444, #22c55e, #3164ff)' },
];

const LUT_OPTIONS = ['None', 'Kodak 2383', 'Rec709 → sRGB'];

/* ---------- the wheel ---------- */

/** ONE transient disc gesture (A3/R25-W3) — the D3 law: local preview, a
 *  single setGrade on release. `v` is the accumulating balance vector; it
 *  seeds from the STORE's hue/amount at pointerdown (the puck persists
 *  between gestures), and `master` goes non-null the first move that routes
 *  to the master scalar (Ctrl/Cmd) — so a modifier flip mid-gesture commits
 *  both touched fields in ONE undo entry. */
interface WheelGesture {
  lastX: number;
  lastY: number;
  v: Vec;
  master: number | null;
  colorTouched: boolean;
}

/** R25-W3 (A3): the MASTER LUMA DIAL — a horizontal ridged thumbwheel BELOW
 *  the wheel (left = darker, right = lighter) writing the wheel's scalar
 *  (lift/gamma/gain/offset). RELATIVE drag (Δpx → value via
 *  MASTER_PX_SPAN — 200px spans the full range), live visual + live YRGB,
 *  ONE setGrade per gesture (D3); dbl-click = the spec 08 default (the
 *  R24-W5a resetTo law); keyboard = discrete commits (±step, ⇧×5,
 *  Home/End). role=slider keeps the old thumbwheel's a11y contract. */
function LumaDial({
  meta,
  value,
  onCommit,
  onFirstTouch,
}: {
  meta: WheelMeta;
  value: number;
  onCommit: (v: number) => void;
  onFirstTouch: () => void;
}) {
  const [drag, setDrag] = useState<{ lastX: number; v: number } | null>(null);
  const shown = drag ? drag.v : value;
  const sens = (meta.max - meta.min) / MASTER_PX_SPAN;
  const pct = ((clamp(shown, meta.min, meta.max) - meta.min) / (meta.max - meta.min)) * 100;

  const commit = () => {
    if (!drag) return;
    const final = drag.v;
    setDrag(null);
    if (final !== value) onCommit(final);
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={`${meta.label} luma`}
      aria-valuemin={meta.min}
      aria-valuemax={meta.max}
      aria-valuenow={Math.round(clamp(shown, meta.min, meta.max) * 1000) / 1000}
      aria-valuetext={`${shown.toFixed(3)}${meta.key === 'offset' ? ' ·' : ''}`}
      aria-orientation="horizontal"
      data-testid={`shell-color-wheel-${meta.key}-luma-dial`}
      className="relative h-[14px] w-full cursor-ew-resize select-none rounded-[3px] border border-black"
      style={{
        background: 'repeating-linear-gradient(90deg, #26262a 0 2px, #101013 2px 4px)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.9), 0 1px 0 rgba(255,255,255,0.04)',
      }}
      onPointerDown={(e) => {
        /* R24-W5c (F4-P3): GUARDED capture — the Fader/Knob/PanBox law. */
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch { /* inactive pointer id — drag still works, capture best-effort */ }
        onFirstTouch();
        setDrag({ lastX: e.clientX, v: value });
      }}
      onPointerMove={(e) => {
        if (e.buttons !== 1 || !drag) return;
        setDrag({ lastX: e.clientX, v: clamp(drag.v + (e.clientX - drag.lastX) * sens, meta.min, meta.max) });
      }}
      onPointerUp={commit}
      onPointerCancel={() => setDrag(null)}
      onLostPointerCapture={commit}
      /* R24-W5a (F2-P2): dbl-click = the param's documented default, NEVER
         the range midpoint (Gamma luma → 1, not 2.125). */
      onDoubleClick={() => onCommit(DEFAULT_GRADE[meta.key])}
      onKeyDown={(e) => {
        const s = meta.step * (e.shiftKey ? 5 : 1);
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          onFirstTouch();
          onCommit(clamp(Math.round((value + s) / meta.step) * meta.step, meta.min, meta.max));
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          onFirstTouch();
          onCommit(clamp(Math.round((value - s) / meta.step) * meta.step, meta.min, meta.max));
        } else if (e.key === 'Home') {
          e.preventDefault();
          onFirstTouch();
          onCommit(meta.min);
        } else if (e.key === 'End') {
          e.preventDefault();
          onFirstTouch();
          onCommit(meta.max);
        }
      }}
    >
      {/* the value notch — left = darker, right = lighter (the span map) */}
      <div
        aria-hidden
        className="absolute top-1/2 h-[10px] w-[3px] -translate-y-1/2 rounded-[1px] bg-white/90 shadow-[0_0_3px_rgba(0,0,0,0.9)]"
        style={{ left: `calc(${pct}% - 1.5px)` }}
      />
    </div>
  );
}

function WheelControl({
  meta,
  grade,
  setGrade,
  tell,
}: {
  meta: WheelMeta;
  grade: GradeRecord['grade'];
  setGrade: GradeRecord['setGrade'];
  tell: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const hasY = meta.hasY;
  const channels: (0 | 1 | 2 | 3)[] = hasY ? [0, 1, 2, 3] : [1, 2, 3];

  const hue = grade[meta.hueField];
  const amount = grade[meta.amountField];
  const scalar = grade[meta.key];

  const [gesture, setGesture] = useState<WheelGesture | null>(null);

  /* the puck position IS the balance vector v (A3): idle renders derive it
     from the STORE's (hue, amount) — the persistence between gestures —
     while a live gesture carries the accumulated vector. */
  const v: Vec = gesture ? gesture.v : vecFromPolar(hueToAngle(hue), amount * DISC_R);
  const masterShown = gesture && gesture.master != null ? gesture.master : scalar;
  const theta = thetaOf(v);
  const mag = amountOf(v);

  /* puck-driven readouts follow the transient while dragging (the readouts
     are displays; hue in the readout is the SPEC hue, not the disc angle) */
  const readout: YrgbReadout = yrgbReadout(meta.key, angleToHue(theta), mag, masterShown);

  /* pointer position → disc-space vector (y flipped; the box is centered on
     the disc, so box-center = the neutral origin) — the Shift absolute jump. */
  const pointerToVec = (clientX: number, clientY: number): Vec | null => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return null;
    return {
      x: clientX - box.left - box.width / 2,
      y: -(clientY - box.top - box.height / 2),
    };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    /* R24-W5c (DESIGN-R24 §2 F4-P3): GUARDED capture — a synthetic/
       inactive pointer id throws NotFoundError in real browsers (the
       Fader/Knob/PanBox law; the old unguarded call died before the
       puck math ran in automation). Best-effort capture only. */
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch { /* inactive pointer id — drag still works, capture best-effort */ }
    tell();
    /* grab-and-accumulate: pointerdown alone NEVER moves the puck (the old
       absolute jump is dead) — except Shift, A3's absolute jump. */
    let vStart = v;
    let colorTouched = false;
    if (e.shiftKey) {
      const p = pointerToVec(e.clientX, e.clientY);
      if (p) {
        vStart = clampVec(p);
        colorTouched = true;
      }
    }
    setGesture({ lastX: e.clientX, lastY: e.clientY, v: vStart, master: null, colorTouched });
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!gesture || e.buttons !== 1) return;
    const dx = e.clientX - gesture.lastX;
    const dy = e.clientY - gesture.lastY;
    let vNext = gesture.v;
    let masterNext = gesture.master;
    let colorTouched = gesture.colorTouched;
    if (e.ctrlKey || e.metaKey) {
      /* Ctrl/Cmd = the master route (Resolve's documented modifier) — the
         same left/right px→value map as the dial below the wheel. */
      const base = masterNext ?? scalar;
      masterNext = clamp(base + dx * ((meta.max - meta.min) / MASTER_PX_SPAN), meta.min, meta.max);
    } else if (e.shiftKey) {
      /* Shift = the absolute jump (v = pointer − center, rim-clamped). */
      const p = pointerToVec(e.clientX, e.clientY);
      if (p) {
        vNext = clampVec(p);
        colorTouched = true;
      }
    } else {
      /* the plain trackball law: v += Δpointer (1:1 px, screen-Y flipped). */
      vNext = clampVec({ x: gesture.v.x + dx, y: gesture.v.y - dy });
      colorTouched = true;
    }
    setGesture({ lastX: e.clientX, lastY: e.clientY, v: vNext, master: masterNext, colorTouched });
  };

  /* ONE setGrade per gesture (the D3 law): everything the gesture touched —
     color, master, or both (a mid-drag modifier flip) — commits together.
     Neutral (amount 0, dead zone included) commits the DOCUMENTED defaults
     for both fields so a jitter-in/dead-zone gesture is a true no-op (no
     fabricated hue-only history entry). */
  const commitGesture = () => {
    if (!gesture) return;
    const g = gesture;
    setGesture(null);
    const patch: GradePatch = {};
    if (g.colorTouched) {
      const a = amountOf(g.v);
      patch[meta.amountField] = a;
      patch[meta.hueField] = a === 0 ? DEFAULT_GRADE[meta.hueField] : angleToHue(thetaOf(g.v));
    }
    if (g.master != null) patch[meta.key] = g.master;
    if (Object.keys(patch).length > 0) setGrade(patch);
  };

  /* visible arc ≈ 3% + 50%·mag of the circumference (the reference's
     per-wheel dashoffset map, driven by the SPEC amount) */
  const dashOffset = RING_CIRC * (1 - Math.min(0.9, 0.03 + mag * 0.5));

  /* the disc hue under the puck, for the hub glow read (honest feedback) */
  const tint = hsv2rgb(angleToHue(theta) / 360, 1, 1);

  return (
    <div className="flex min-w-0 flex-col items-center">
      {/* column header: crosshair | label | per-wheel reset (ref §1.4) */}
      <div className="mb-2 flex w-full items-center justify-between px-3">
        {hasY ? <Crosshair size={14} aria-hidden className="text-tfaint" /> : <span aria-hidden className="h-3.5 w-3.5" />}
        <span className={`text-[13px] font-semibold text-tprimary ${hasY ? '' : 'ml-3'}`}>{meta.label}</span>
        <button
          type="button"
          aria-label={`Reset ${meta.label}`}
          data-tip={`Reset ${meta.label} color + master`}
          className="flex h-5 w-5 items-center justify-center text-tfaint transition-colors hover:text-tprimary"
          onClick={() => {
            const patch = fieldPatch(meta.amountField, DEFAULT_GRADE[meta.amountField]);
            patch[meta.hueField] = DEFAULT_GRADE[meta.hueField];
            patch[meta.key] = DEFAULT_GRADE[meta.key];
            setGrade(patch);
          }}
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* wheel: 150px ring box, 124px disc, puck = the balance vector v */}
      <div
        ref={boxRef}
        data-testid={`shell-color-wheel-${meta.key}`}
        role="img"
        aria-label={`${meta.label} color wheel`}
        className="relative touch-none"
        style={{ width: WHEEL_BOX, height: WHEEL_BOX, cursor: 'grab' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={commitGesture}
        onPointerCancel={() => setGesture(null)}
        onLostPointerCapture={commitGesture}
        /* R25-W3 (A3): dbl-click the DISC = COLOR-ONLY reset (v → 0, the
           master untouched). The numeric-row/corner-button resets keep
           their own laws (R24-W5a resetTo / the both-fields reset above). */
        onDoubleClick={() => {
          const patch = fieldPatch(meta.amountField, DEFAULT_GRADE[meta.amountField]);
          patch[meta.hueField] = DEFAULT_GRADE[meta.hueField];
          setGrade(patch);
        }}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" style={{ transform: `rotate(${meta.rot}deg)` }} aria-hidden>
          <circle cx="50" cy="50" r="47" fill="none" stroke="var(--wheel-ring-track)" strokeWidth="6" />
          <circle cx="50" cy="50" r="47" fill="none" stroke="var(--wheel-ring-arc)" strokeWidth="6" strokeDasharray={RING_CIRC} strokeDashoffset={dashOffset} />
        </svg>
        {/* ring thumb dot — the hue direction indicator (θ, the same angle
            the puck's v points at) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-20" style={{ transform: `rotate(${theta}deg)` }}>
          <div
            className="absolute left-1/2 top-[1.5px] h-3 w-3 -translate-x-1/2 rounded-full border border-gray-600 shadow-sm"
            style={{ background: `rgb(${tint.map((c) => Math.round(c * 255)).join(',')})` }}
          />
        </div>
        {/* color disc — dark desaturated hub → saturated rim (ref §1.4); the
            conic starts at HUE_RING_ZERO so RED sits upper-LEFT (A3's
            vectorscope orientation — the disc's color under any puck angle
            is the hue angleToHue(θ) selects). */}
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px]"
          style={{
            width: DISC,
            height: DISC,
            borderColor: 'var(--wheel-border)',
            background:
              `radial-gradient(circle at 50% 50%, #252528 40%, #252528bb 55%, transparent 75%, rgba(0,0,0,0.8) 100%), conic-gradient(from ${HUE_RING_ZERO}deg, #ff2a2a, #ff2aff, #2a2aff, #2affff, #2aff2a, #ffff2a, #ff2a2a)`,
            boxShadow: 'inset 0 0 12px rgba(0,0,0,1)',
          }}
        />
        {/* the PUCK — position IS the balance vector v (disc px, y-up),
            translated live during the gesture; margin-centering so the
            inline transform carries ONLY v (render px rounded to 1/100 —
            the polar re-derivation leaves ~1e-16 noise otherwise). */}
        <div
          aria-hidden
          data-testid={`shell-color-wheel-${meta.key}-puck`}
          className="pointer-events-none absolute left-1/2 top-1/2 z-30 h-[10px] w-[10px] rounded-full border border-white/90 bg-white shadow-[0_0_6px_rgba(0,0,0,0.9)]"
          style={{
            marginLeft: -5,
            marginTop: -5,
            transform: `translate(${Math.round(v.x * 100) / 100}px, ${Math.round(-v.y * 100) / 100}px)`,
          }}
        />
        {/* center crosshair — static reference point (neutral) */}
        <div aria-hidden className="absolute left-1/2 top-1/2 z-20 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-md" />
      </div>

      {/* YRGB derived readouts (color-layout §3.5; offset ×1023). Offset is
          RGB-only per the reference; Y = the scalar in the wheel's unit.
          R25-W3: these follow the TRANSIENT gesture state — live during
          every drag (color and master alike). */}
      <div className={`mt-3 flex items-start ${hasY ? 'gap-[2px]' : 'justify-center gap-[3px]'}`}>
        {channels.map((ch) => {
          const name = (['Y', 'R', 'G', 'B'] as const)[ch];
          const value = ch === 0 ? readout.y : ch === 1 ? readout.r : ch === 2 ? readout.g : readout.b;
          return (
            <div key={name} className="flex flex-col items-center gap-[2px]">
              <ReadCell
                ariaLabel={`${meta.label} ${name}`}
                value={value}
                width={36}
                format={(v) => v.toFixed(2)}
                title="derived from the puck (spec 08 §4.2 tint + §16.A — no per-channel editing)"
              />
              <div aria-hidden className="h-[2px] w-[36px] rounded-[1px]" style={{ background: CHANNEL_BARS[name] }} />
            </div>
          );
        })}
      </div>

      {/* master luma DIAL — R25-W3 (A3): the horizontal ridged dial below
          the wheel (left = darker, right = lighter); relative drag, live
          YRGB, ONE commit per gesture; Ctrl/Cmd+drag inside the disc routes
          here too. Replaces the R20 luma thumbwheel (same a11y contract). */}
      <div className="mt-2 w-full">
        <LumaDial
          meta={meta}
          value={scalar}
          onCommit={(val) => setGrade(fieldPatch(meta.key, val))}
          onFirstTouch={tell}
        />
      </div>
    </div>
  );
}

/* ---------- the panel ---------- */

export function WheelsPanel() {
  const rec = useGradeRecord();
  const tell = useGradingToast();
  /* the LUT keeps its own one-time toast (the select is REAL display state;
     only the preview is deferred — spec 08 gap ledger) */
  const tellLut = useHonestToast('Color params', LUT_TOAST_DETAIL);
  const [logMode, setLogMode] = useState(false);
  const [lut, setLut] = useState('None');

  if (rec.targetId == null) {
    return (
      <div data-testid="shell-color-wheels" className="flex h-full min-h-0 items-center justify-center bg-panel p-6 text-center">
        <p className="text-[12px] text-tmuted">
          No clip selected — click a clip in the lane strip (or switch the target to Timeline) to grade.
        </p>
      </div>
    );
  }

  const { grade, setGrade, resetGrade } = rec;

  return (
    <div data-testid="shell-color-wheels" className="flex flex-col">
      {/* header row: Primaries — Color Wheels | LOG / reset */}
      <div className="flex h-[32px] shrink-0 items-center justify-between border-b border-hairline bg-shell px-3">
        <span data-testid="shell-color-wheels-title" className="text-[13px] font-bold tracking-wide text-tprimary">
          Primaries — {logMode ? 'LOG' : 'Color Wheels'}
        </span>
        <div className="flex items-center gap-2 text-tmuted">
          {/* Primaries ↔ LOG labels toggle: spec 08 defines no log wheels
              (W4a grep note) — labels only, math unchanged (data-tip honest) */}
          <button
            type="button"
            aria-label="LOG mode"
            aria-pressed={logMode}
            data-testid="shell-color-log-toggle"
            data-tip="Labels only — spec 08 defines no log-space wheels (the math is unchanged)"
            onClick={() => setLogMode((v) => !v)}
            className={`rounded-[2px] border px-[7px] py-[1px] text-[10px] font-bold tracking-wide transition-colors ${
              logMode ? 'border-tprimary text-tprimary' : 'border-strong text-tmuted hover:text-tprimary'
            }`}
          >
            LOG
          </button>
          <button type="button" aria-label="Reset primaries" data-tip="Reset" className="icon-btn" onClick={resetGrade}>
            <RotateCcw size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* top controls — compact dual column (ref §1.3), store-bound */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-hairline bg-raised px-3 py-2.5">
        {TOP_CTRL.map((c) => (
          <div key={c.key} className="flex min-w-0 items-center gap-2">
            <span className="w-[58px] shrink-0 text-[11px] text-tmuted">{c.label}</span>
            <NumCell
              ariaLabel={`${c.label} value`}
              value={grade[c.key]}
              width={48}
              className="shrink-0 text-center"
              format={c.fmt}
              onFirstTouch={tell}
              /* R23-FIX (review-sweep R4-P3#7): NumCell is free-text and
                 clamps NOWHERE — the typed value used to reach setGrade raw
                 (typing 999 into Contrast wrote 999). The seam clamps to the
                 row's own min/max (the MicroSlider twins' domain), so the
                 typed path and the drag path agree. */
              onCommit={(v) => setGrade(fieldPatch(c.key, clamp(v, c.min, c.max)))}
            />
            {/* R24-W5a (DESIGN-R24 §2 F2-P2 — the affordance lie): Temp/Tint
                used to render a DECORATIVE 2px gradient bar (aria-hidden div,
                no role, no keyboard, no pointer) next to the typed field —
                they are REAL bar-sliders now, the master-row grammar below
                (variant="bar" + the gradient as trackStyle, the same
                MicroSlider keyboard/drag/commit law as every other row). */}
            <MicroSlider
              ariaLabel={c.label}
              value={grade[c.key]}
              min={c.min}
              max={c.max}
              step={c.step}
              valueText={c.fmt(grade[c.key])}
              variant={c.bar ? 'bar' : 'mini'}
              trackStyle={c.bar ? { background: c.bar } : undefined}
              resetTo={DEFAULT_GRADE[c.key]}
              className="min-w-0 flex-1"
              onFirstTouch={tell}
              onChange={(v) => setGrade(fieldPatch(c.key, v))}
            />
          </div>
        ))}
      </div>

      {/* the four wheels — natively 4-across at console width (≥1000px),
          auto-reflow 2×2 below (R19 grid rule kept) */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-2 gap-y-4 px-2 py-4" style={{ background: '#212124' }}>
        {WHEELS.map((meta) => (
          <WheelControl
            key={meta.key}
            meta={{ ...meta, label: logMode ? meta.logLabel : meta.label }}
            grade={grade}
            setGrade={setGrade}
            tell={tell}
          />
        ))}
      </div>

      {/* bottom master sliders — dual column, gradient color-bars (ref §1.5),
          store-bound (spec bounds: saturation −100..100, hue 0..100 w/ 50 = neutral) */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-hairline bg-raised px-3 py-2.5">
        {MASTER_CTRL.map((c) => (
          <div key={c.key} className="flex min-w-0 items-center gap-2">
            <span className="w-[58px] shrink-0 text-[11px] text-tmuted">{c.label}</span>
            <NumCell
              ariaLabel={`${c.label} value`}
              value={grade[c.key]}
              width={48}
              className="shrink-0 text-center"
              format={c.fmt}
              onFirstTouch={tell}
              onCommit={(v) => setGrade(fieldPatch(c.key, clamp(v, c.min, c.max)))} /* R23-FIX R4-P3#7 — the master-row twin of the clamp above */
            />
            <MicroSlider
              ariaLabel={c.label}
              value={grade[c.key]}
              min={c.min}
              max={c.max}
              step={1}
              valueText={c.fmt(grade[c.key])}
              variant={c.bar ? 'bar' : 'mini'}
              trackStyle={c.bar ? { background: c.bar } : undefined}
              resetTo={DEFAULT_GRADE[c.key]}
              className="min-w-0 flex-1"
              onFirstTouch={tell}
              onChange={(v) => setGrade(fieldPatch(c.key, v))}
            />
          </div>
        ))}
      </div>

      {/* LUT footer — REAL display state (R14): the choice updates the
          readout; the preview itself lands with the render round (spec 08) */}
      <div className="flex items-center gap-2 border-t border-hairline bg-shell px-3 py-2">
        <span className="text-[11px] text-tmuted">LUT</span>
        <select
          aria-label="LUT select"
          className="field min-w-0 flex-1 cursor-pointer"
          value={lut}
          onChange={(e) => {
            setLut(e.target.value);
            tellLut();
          }}
        >
          {LUT_OPTIONS.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <span data-testid="shell-color-lut-readout" className="mono shrink-0 text-[11px] text-tprimary">
          LUT: {lut}
        </span>
      </div>
    </div>
  );
}

export const LUT_TOAST_DETAIL = 'LUT preview lands with the render round (spec 08)';

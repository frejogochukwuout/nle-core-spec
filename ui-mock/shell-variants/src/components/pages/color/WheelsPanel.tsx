/* WheelsPanel — R20-W4b, the ColorConsole Primaries tab (C51; formerly the
   rail tab, D3 rework). Reference anatomy (resolvecolorwheels_html, color-
   cluster §1) UNCHANGED: header row (Primaries — Color Wheels | LOG toggle |
   reset), Temp/Tint/Contrast/Pivot/Mid-Detail compact dual-column top
   controls, the 4 wheels in the responsive grid (150px ring + 124px disc +
   rotated thumb dot + center crosshair), per-wheel YRGB rows + knurled luma
   thumbwheel, the 6 bottom master sliders with gradient color-bars, the LUT
   select footer.

   WHAT CHANGED (the R19 sin fixed): every value is STORE-DRIVEN — the panel
   reads the target's GradeParams (W4a lib/color, spec 08 §4.2 field names
   verbatim) through useGradeRecord and writes via setGrade; there is NO
   local useState for grade values (only transient gesture buffers that
   commit on pointer-up — ONE undoable setGrade per drag, the D3 law).

   Puck ⇄ state mapping (color-layout §3.5): puck angle θ (0° = up, CW — the
   existing drag math) sits ON the disc color it selects; the disc's conic
   order (R→Mg→B→Cy→G→Yl, CW) is HSV-hue DESCENDING, so
   `hue = (360 − θ) mod 360`; magnitude 0..1 = spec's `amount`. The luma
   thumbwheel writes the wheel's SCALAR (lift/gamma/gain/offset, spec 08
   §16.A "independent RGB multiplier controls" — one f32 each). YRGB rows
   are DERIVED READOUTS (yrgbReadout, offset ×1023 code values) — read-only
   with the spec 08 §16.A aria hint, not editable (engine seam has no
   per-channel numeric editing).

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

/** disc angle θ (0=up, CW) → spec hue: the disc's conic order is HSV-hue
    DESCENDING (R→Mg→B→Cy→G→Yl), so the puck sits on its own tint. */
const angleToHue = (theta: number) => (360 - Math.round(theta)) % 360;
const hueToAngle = (hue: number) => (360 - Math.round(hue)) % 360;

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

  /* transient puck drag (angle/mag in DISPLAY space) — commits ONE
     setGrade({hueField, amountField}) on pointer-up (the D3 gesture law). */
  const [drag, setDrag] = useState<{ theta: number; mag: number } | null>(null);
  const theta = drag ? drag.theta : hueToAngle(hue);
  const mag = drag ? drag.mag : amount;

  /* puck-driven readouts follow the transient while dragging (the readouts
     are displays; hue in the readout is the SPEC hue, not the disc angle) */
  const readout: YrgbReadout = yrgbReadout(meta.key, angleToHue(theta), mag, scalar);

  /* 2D puck drag: direction → ring dot angle, distance → amount (0..1),
     constrained to the disc radius. */
  const applyPuck = (clientX: number, clientY: number) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    const dx = (clientX - box.left - box.width / 2) / (box.width / 2);
    const dy = (clientY - box.top - box.height / 2) / (box.height / 2);
    const len = Math.min(1, Math.hypot(dx, dy));
    const angle = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    setDrag({ theta: angle, mag: len });
  };
  const commitPuck = () => {
    if (!drag) return;
    const patch = fieldPatch(meta.amountField, Math.round(drag.mag * 1000) / 1000);
    patch[meta.hueField] = angleToHue(drag.theta);
    setDrag(null);
    setGrade(patch);
  };
  const onPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.type === 'pointerdown') {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      tell();
      applyPuck(e.clientX, e.clientY);
    } else if (e.type === 'pointermove' && e.buttons === 1 && drag) {
      applyPuck(e.clientX, e.clientY);
    }
  };

  /* visible arc ≈ 3% + 50%·mag of the circumference (the reference's
     per-wheel dashoffset map, now driven by the SPEC amount) */
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

      {/* wheel: 150px ring box, 124px disc, rotated thumb dot on the ring */}
      <div
        ref={boxRef}
        data-testid={`shell-color-wheel-${meta.key}`}
        role="img"
        aria-label={`${meta.label} color wheel`}
        className="relative touch-none"
        style={{ width: WHEEL_BOX, height: WHEEL_BOX, cursor: 'grab' }}
        onPointerDown={onPointer}
        onPointerMove={onPointer}
        onPointerUp={commitPuck}
        onPointerCancel={() => setDrag(null)}
        onLostPointerCapture={commitPuck}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" style={{ transform: `rotate(${meta.rot}deg)` }} aria-hidden>
          <circle cx="50" cy="50" r="47" fill="none" stroke="var(--wheel-ring-track)" strokeWidth="6" />
          <circle cx="50" cy="50" r="47" fill="none" stroke="var(--wheel-ring-arc)" strokeWidth="6" strokeDasharray={RING_CIRC} strokeDashoffset={dashOffset} />
        </svg>
        {/* ring thumb dot — position indicator driven by the puck angle */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-20" style={{ transform: `rotate(${theta}deg)` }}>
          <div
            className="absolute left-1/2 top-[1.5px] h-3 w-3 -translate-x-1/2 rounded-full border border-gray-600 shadow-sm"
            style={{ background: `rgb(${tint.map((c) => Math.round(c * 255)).join(',')})` }}
          />
        </div>
        {/* color disc — dark desaturated hub → saturated rim (ref §1.4) */}
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px]"
          style={{
            width: DISC,
            height: DISC,
            borderColor: 'var(--wheel-border)',
            background:
              'radial-gradient(circle at 50% 50%, #252528 40%, #252528bb 55%, transparent 75%, rgba(0,0,0,0.8) 100%), conic-gradient(from 0deg, #ff2a2a, #ff2aff, #2a2aff, #2affff, #2aff2a, #ffff2a, #ff2a2a)',
            boxShadow: 'inset 0 0 12px rgba(0,0,0,1)',
          }}
        />
        {/* center crosshair — static reference point */}
        <div aria-hidden className="absolute left-1/2 top-1/2 z-20 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-md" />
      </div>

      {/* YRGB derived readouts (color-layout §3.5; offset ×1023). Offset is
          RGB-only per the reference; Y = the scalar in the wheel's unit. */}
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

      {/* luma thumbwheel — the wheel's SCALAR (lift/gamma/gain/offset),
          spec bounds per color-layout §3.5; ONE commit per drag */}
      <div className="mt-2 w-full">
        <MicroSlider
          ariaLabel={`${meta.label} luma`}
          value={scalar}
          min={meta.min}
          max={meta.max}
          step={meta.step}
          valueText={`${scalar.toFixed(3)}${meta.key === 'offset' ? ' ·' : ''}`}
          variant="mini"
          className="w-full"
          trackStyle={{
            height: 12,
            borderRadius: 6,
            background: 'linear-gradient(to bottom, #0a0a0c, #2a2a2e 40%, #0a0a0c)',
            border: '1px solid #000',
            boxShadow: '0 1px 1px rgba(255,255,255,0.05), inset 0 0 0 1px rgba(0,0,0,0.6)',
          }}
          onFirstTouch={tell}
          onChange={(v) => setGrade(fieldPatch(meta.key, v))}
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
              onCommit={(v) => setGrade(fieldPatch(c.key, v))}
            />
            {c.bar ? (
              <div aria-hidden className="h-[2px] min-w-0 flex-1 rounded-[1px]" style={{ background: c.bar }} />
            ) : (
              <MicroSlider
                ariaLabel={c.label}
                value={grade[c.key]}
                min={c.min}
                max={c.max}
                step={c.step}
                valueText={c.fmt(grade[c.key])}
                className="min-w-0 flex-1"
                onFirstTouch={tell}
                onChange={(v) => setGrade(fieldPatch(c.key, v))}
              />
            )}
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
              onCommit={(v) => setGrade(fieldPatch(c.key, v))}
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

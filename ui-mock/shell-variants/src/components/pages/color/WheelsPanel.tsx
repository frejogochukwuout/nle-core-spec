/* WheelsPanel — rail tab 1 (R19-B4). Reference-grade rebuild of
   resolvecolorwheels_html (color-cluster.md §1) reflowed 980px → rail width:
   header row (Primaries | LOG toggle | reset), Temp/Tint/Contrast/Pivot/
   Mid-Detail compact dual-column top controls, the 4 wheels in a responsive
   2×2 grid (150px ring + 124px disc per reference geometry: r47 sw6 ring,
   dasharray 295.3 arc, rotated thumb dot, center crosshair), per-wheel YRGB
   numeric rows + knurled luma thumbwheel, the 6 bottom master sliders with
   gradient color-bars, and the LUT select (kept REAL display state — R14).
   Every value is LOCAL display state (spec 08 §4 render round): the wheel
   puck is a real 2D pointer drag (angle → ring dot + arc length), all
   readouts follow, and the first interaction per mount fires ONE honest
   toast. Keyboard paths for the wheel values: the YRGB cells + the luma
   thumbwheel (role=slider) — the puck itself stays role=img (a 2D spatial
   control; no arrow-key promise, R13 honesty precedent). */

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Crosshair, RotateCcw, SlidersVertical, Target } from 'lucide-react';
import { MicroSlider, NumCell } from './controls';
import { useGradingToast, useHonestToast } from './useHonestToast';

/* ---------- geometry / constants (color-cluster.md §1.4) ---------- */

const RING_CIRC = 295.3; // 2π·47 — the ring arc dasharray
const WHEEL_BOX = 150; // outer ring container (svg viewBox 100 → 1.5px/unit)
const DISC = 124; // color disc diameter

type WheelKey = 'lift' | 'gamma' | 'gain' | 'offset';

interface WheelVals {
  /** puck angle in degrees, 0 = up, clockwise (dot wrapper rotation) */
  angle: number;
  /** puck magnitude 0..1 — drives the ring arc length */
  mag: number;
  /** Y, R, G, B per-wheel values (Offset renders R/G/B only) */
  yrgb: [number, number, number, number];
  /** luma thumbwheel 0..100 */
  luma: number;
}

/* reference defaults: dot angles 205/190/45/200°, arc dashoffsets
   275/285/255/278 → mags 0.137/0.07/0.27/0.117 under arc = .03+mag·.5 */
const DEFAULT_WHEELS: Record<WheelKey, WheelVals> = {
  lift: { angle: 205, mag: 0.137, yrgb: [0, 0, 0, 0], luma: 50 },
  gamma: { angle: 190, mag: 0.07, yrgb: [0, 0, 0, 0], luma: 50 },
  gain: { angle: 45, mag: 0.27, yrgb: [1, 1, 1, 1], luma: 50 },
  offset: { angle: 200, mag: 0.117, yrgb: [25, 25, 25, 25], luma: 50 },
};

/* reference quirk: lift/gamma/offset arcs start bottom (rotate-90), gain
 * starts top (-rotate-90) — transcribed as-is */
const WHEEL_ROT: Record<WheelKey, number> = { lift: 90, gamma: 90, gain: -90, offset: 90 };
/* Lift/Gamma/Gain carry a Y (luma) channel; Offset is RGB-only */
const WHEEL_HAS_Y: Record<WheelKey, boolean> = { lift: true, gamma: true, gain: true, offset: false };

const WHEEL_META: { key: WheelKey; label: string; logLabel: string }[] = [
  { key: 'lift', label: 'Lift', logLabel: 'Shadows' },
  { key: 'gamma', label: 'Gamma', logLabel: 'Midtones' },
  { key: 'gain', label: 'Gain', logLabel: 'Highlights' },
  { key: 'offset', label: 'Offset', logLabel: 'Offset' },
];

const CHANNEL_BARS: Record<'Y' | 'R' | 'G' | 'B', string> = {
  Y: '#ffffff',
  R: '#ff3333',
  G: '#33cc33',
  B: '#3366ff',
};

/* ---------- top controls (ref §1.3) ---------- */

interface TopState {
  temp: number;
  tint: number;
  contrast: number;
  pivot: number;
  midDetail: number;
}

const TOP_CTRL: {
  key: keyof TopState;
  label: string;
  fmt: (v: number) => string;
  min: number;
  max: number;
  step: number;
  bar?: string;
}[] = [
  { key: 'temp', label: 'Temp', fmt: (v) => v.toFixed(1), min: -100, max: 100, step: 0.5, bar: 'linear-gradient(to right, #3b82f6, #9ca3af, #f97316)' },
  { key: 'tint', label: 'Tint', fmt: (v) => v.toFixed(2), min: -100, max: 100, step: 0.5, bar: 'linear-gradient(to right, #22c55e, #9ca3af, #ec4899)' },
  { key: 'contrast', label: 'Contrast', fmt: (v) => v.toFixed(3), min: 0, max: 2, step: 0.005 },
  { key: 'pivot', label: 'Pivot', fmt: (v) => v.toFixed(3), min: 0, max: 1, step: 0.005 },
  { key: 'midDetail', label: 'Mid/Detail', fmt: (v) => v.toFixed(2), min: -1, max: 1, step: 0.01 },
];

const DEFAULT_TOP: TopState = { temp: 0, tint: 0, contrast: 1, pivot: 0.435, midDetail: 0 };

/* ---------- bottom master sliders (ref §1.5) ---------- */

interface MasterState {
  colorBoost: number;
  shadows: number;
  highlights: number;
  saturation: number;
  hue: number;
  lumMix: number;
}

const MASTER_CTRL: { key: keyof MasterState; label: string; min: number; max: number; bar?: string }[] = [
  { key: 'colorBoost', label: 'Color Boost', min: -100, max: 100, bar: 'linear-gradient(to right, #ef4444, #22c55e, #3b82f6)' },
  { key: 'shadows', label: 'Shadows', min: -100, max: 100 },
  { key: 'highlights', label: 'Highlights', min: -100, max: 100 },
  { key: 'saturation', label: 'Saturation', min: 0, max: 100, bar: 'linear-gradient(to right, #6b7280, #f87171, #60a5fa)' },
  { key: 'hue', label: 'Hue', min: 0, max: 100, bar: 'linear-gradient(to right, #a855f7, #facc15, #4ade80)' },
  { key: 'lumMix', label: 'Lum Mix', min: 0, max: 100, bar: 'linear-gradient(to right, #ef4444, #22c55e, #3b82f6)' },
];

const DEFAULT_MASTER: MasterState = { colorBoost: 0, shadows: 0, highlights: 0, saturation: 50, hue: 50, lumMix: 100 };

const LUT_OPTIONS = ['None', 'Kodak 2383', 'Rec709 → sRGB'];

/* ---------- the wheel ---------- */

function WheelControl({
  wheelKey,
  label,
  vals,
  onPuck,
  onLuma,
  onChannel,
  onReset,
  tell,
}: {
  wheelKey: WheelKey;
  label: string;
  vals: WheelVals;
  onPuck: (angle: number, mag: number) => void;
  onLuma: (v: number) => void;
  onChannel: (ch: 0 | 1 | 2 | 3, v: number) => void;
  onReset: () => void;
  tell: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const hasY = WHEEL_HAS_Y[wheelKey];
  const channels: (0 | 1 | 2 | 3)[] = hasY ? [0, 1, 2, 3] : [1, 2, 3];

  /* 2D puck drag: direction → ring dot angle, distance → arc magnitude.
     Constrained to the disc radius. */
  const applyPuck = (clientX: number, clientY: number) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    const dx = (clientX - box.left - box.width / 2) / (box.width / 2);
    const dy = (clientY - box.top - box.height / 2) / (box.height / 2);
    const len = Math.min(1, Math.hypot(dx, dy));
    const angle = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    onPuck(angle, len);
  };
  const onPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.type === 'pointerdown') {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      tell();
      applyPuck(e.clientX, e.clientY);
    } else if (e.type === 'pointermove' && e.buttons === 1) {
      applyPuck(e.clientX, e.clientY);
    }
  };

  /* visible arc ≈ 3% + 50%·mag of the circumference (deterministic map of
     the reference's per-wheel dashoffsets — see DEFAULT_WHEELS comment) */
  const dashOffset = RING_CIRC * (1 - Math.min(0.9, 0.03 + vals.mag * 0.5));

  return (
    <div className="flex min-w-0 flex-col items-center">
      {/* column header: crosshair | label | per-wheel reset (ref §1.4) */}
      <div className="mb-2 flex w-full items-center justify-between px-3">
        {hasY ? <Crosshair size={14} aria-hidden className="text-tfaint" /> : <span aria-hidden className="h-3.5 w-3.5" />}
        <span className={`text-[13px] font-semibold text-tprimary ${hasY ? '' : 'ml-3'}`}>{label}</span>
        <button
          type="button"
          aria-label={`Reset ${label}`}
          className="flex h-5 w-5 items-center justify-center text-tfaint transition-colors hover:text-tprimary"
          onClick={onReset}
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* wheel: 150px ring box, 124px disc, rotated thumb dot on the ring */}
      <div
        ref={boxRef}
        data-testid={`shell-color-wheel-${wheelKey}`}
        role="img"
        aria-label={`${label} color wheel`}
        className="relative touch-none"
        style={{ width: WHEEL_BOX, height: WHEEL_BOX, cursor: 'grab' }}
        onPointerDown={onPointer}
        onPointerMove={onPointer}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" style={{ transform: `rotate(${WHEEL_ROT[wheelKey]}deg)` }} aria-hidden>
          <circle cx="50" cy="50" r="47" fill="none" stroke="var(--wheel-ring-track)" strokeWidth="6" />
          <circle cx="50" cy="50" r="47" fill="none" stroke="var(--wheel-ring-arc)" strokeWidth="6" strokeDasharray={RING_CIRC} strokeDashoffset={dashOffset} />
        </svg>
        {/* ring thumb dot — position indicator driven by the puck angle */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-20" style={{ transform: `rotate(${vals.angle}deg)` }}>
          <div className="absolute left-1/2 top-[1.5px] h-3 w-3 -translate-x-1/2 rounded-full border border-gray-600 bg-[var(--wheel-hub)] shadow-sm" />
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

      {/* YRGB numeric row: Lift/Gamma/Gain 4 cells @0.00, Gain @1.00,
          Offset 3 cells (R/G/B) @25.00 — 2px channel bars under each (ref) */}
      <div className={`mt-3 flex items-start ${hasY ? 'gap-[2px]' : 'justify-center gap-[3px]'}`}>
        {channels.map((ch) => {
          const name = (['Y', 'R', 'G', 'B'] as const)[ch];
          return (
            <div key={name} className="flex flex-col items-center gap-[2px]">
              <NumCell
                ariaLabel={`${label} ${name}`}
                value={vals.yrgb[ch]}
                width={36}
                format={(v) => v.toFixed(2)}
                onFirstTouch={tell}
                onCommit={(v) => onChannel(ch, v)}
              />
              <div aria-hidden className="h-[2px] w-[36px] rounded-[1px]" style={{ background: CHANNEL_BARS[name] }} />
            </div>
          );
        })}
      </div>

      {/* luma thumbwheel — knurled scrub strip (ew-resize), needle readout */}
      <div className="mt-2 w-full">
        <MicroSlider
          ariaLabel={`${label} luma`}
          value={vals.luma}
          min={0}
          max={100}
          valueText={`${vals.luma.toFixed(0)}`}
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
          onChange={onLuma}
        />
      </div>
    </div>
  );
}

/* ---------- the panel ---------- */

export function WheelsPanel() {
  const tell = useGradingToast();
  /* the LUT keeps its own one-time toast (distinct message — the select is
     REAL display state; only the *preview* is deferred) */
  const tellLut = useHonestToast('Color params', LUT_TOAST_DETAIL);
  const [logMode, setLogMode] = useState(false);
  const [wheels, setWheels] = useState<Record<WheelKey, WheelVals>>(() => structuredClone(DEFAULT_WHEELS));
  const [top, setTop] = useState<TopState>({ ...DEFAULT_TOP });
  const [master, setMaster] = useState<MasterState>({ ...DEFAULT_MASTER });
  const [lut, setLut] = useState('None');

  const setWheel = (key: WheelKey, patch: Partial<WheelVals>) => {
    setWheels((w) => ({ ...w, [key]: { ...w[key], ...patch } }));
  };

  const resetAll = () => {
    setWheels(structuredClone(DEFAULT_WHEELS));
    setTop({ ...DEFAULT_TOP });
    setMaster({ ...DEFAULT_MASTER });
  };

  return (
    <div data-testid="shell-color-wheels" className="flex flex-col">
      {/* header row: Primaries — Color Wheels | target / sliders / LOG / reset */}
      <div className="flex h-[32px] shrink-0 items-center justify-between border-b border-hairline bg-shell px-3">
        <span data-testid="shell-color-wheels-title" className="text-[13px] font-bold tracking-wide text-tprimary">
          Primaries — {logMode ? 'LOG' : 'Color Wheels'}
        </span>
        <div className="flex items-center gap-2 text-tmuted">
          <button type="button" aria-label="Color wheels view options" data-tip="Color Wheels" className="icon-btn" onClick={tell}>
            <Target size={16} strokeWidth={2} />
          </button>
          <button type="button" aria-label="Panel sliders" data-tip="Sliders" className="icon-btn" onClick={tell}>
            <SlidersVertical size={16} strokeWidth={2} />
          </button>
          {/* Primaries ↔ LOG mode toggle — real local state: swaps the wheel
              labels (Lift/Gamma/Gain → Shadows/Midtones/Highlights) */}
          <button
            type="button"
            aria-label="LOG mode"
            aria-pressed={logMode}
            data-testid="shell-color-log-toggle"
            onClick={() => setLogMode((v) => !v)}
            className={`rounded-[2px] border px-[7px] py-[1px] text-[10px] font-bold tracking-wide transition-colors ${
              logMode ? 'border-tprimary text-tprimary' : 'border-strong text-tmuted hover:text-tprimary'
            }`}
          >
            LOG
          </button>
          <button type="button" aria-label="Reset primaries" data-tip="Reset" className="icon-btn" onClick={resetAll}>
            <RotateCcw size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* top controls — compact dual column (ref §1.3) */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-hairline bg-raised px-3 py-2.5">
        {TOP_CTRL.map((c) => (
          <div key={c.key} className="flex min-w-0 items-center gap-2">
            <span className="w-[58px] shrink-0 text-[11px] text-tmuted">{c.label}</span>
            <NumCell
              ariaLabel={`${c.label} value`}
              value={top[c.key]}
              width={48}
              className="shrink-0 text-center"
              format={c.fmt}
              onFirstTouch={tell}
              onCommit={(v) => setTop((t) => ({ ...t, [c.key]: v }))}
            />
            {c.bar ? (
              <div aria-hidden className="h-[2px] min-w-0 flex-1 rounded-[1px]" style={{ background: c.bar }} />
            ) : (
              <MicroSlider
                ariaLabel={c.label}
                value={top[c.key]}
                min={c.min}
                max={c.max}
                step={c.step}
                valueText={c.fmt(top[c.key])}
                className="min-w-0 flex-1"
                onFirstTouch={tell}
                onChange={(v) => setTop((t) => ({ ...t, [c.key]: v }))}
              />
            )}
          </div>
        ))}
      </div>

      {/* the four wheels — 2×2 at rail width, auto-reflow (wider rails grow) */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-2 gap-y-4 px-2 py-4" style={{ background: '#212124' }}>
        {WHEEL_META.map(({ key, label, logLabel }) => (
          <WheelControl
            key={key}
            wheelKey={key}
            label={logMode ? logLabel : label}
            vals={wheels[key]}
            tell={tell}
            onPuck={(angle, mag) => setWheel(key, { angle, mag })}
            onLuma={(v) => setWheel(key, { luma: v })}
            onChannel={(ch, v) =>
              setWheels((w) => {
                const yrgb = [...w[key].yrgb] as [number, number, number, number];
                yrgb[ch] = v;
                return { ...w, [key]: { ...w[key], yrgb } };
              })
            }
            onReset={() => setWheel(key, { ...structuredClone(DEFAULT_WHEELS)[key] })}
          />
        ))}
      </div>

      {/* bottom master sliders — dual column, gradient color-bars (ref §1.5) */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-hairline bg-raised px-3 py-2.5">
        {MASTER_CTRL.map((c) => (
          <div key={c.key} className="flex min-w-0 items-center gap-2">
            <span className="w-[58px] shrink-0 text-[11px] text-tmuted">{c.label}</span>
            <NumCell
              ariaLabel={`${c.label} value`}
              value={master[c.key]}
              width={48}
              className="shrink-0 text-center"
              format={(v) => v.toFixed(2)}
              onFirstTouch={tell}
              onCommit={(v) => setMaster((m) => ({ ...m, [c.key]: v }))}
            />
            <MicroSlider
              ariaLabel={c.label}
              value={master[c.key]}
              min={c.min}
              max={c.max}
              step={1}
              valueText={master[c.key].toFixed(2)}
              variant={c.bar ? 'bar' : 'mini'}
              trackStyle={c.bar ? { background: c.bar } : undefined}
              className="min-w-0 flex-1"
              onFirstTouch={tell}
              onChange={(v) => setMaster((m) => ({ ...m, [c.key]: v }))}
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

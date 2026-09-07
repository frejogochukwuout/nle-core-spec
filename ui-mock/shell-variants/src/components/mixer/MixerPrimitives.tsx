/* Mixer primitives — fader / pan knob / pan box / stereo strip meter.
   R15-A1: the knob is a DAW-grammar dial (270° SVG arc + dasharray + indicator
   line ABOVE center, vertical drag 200px/full-range, Shift ×0.2 fine,
   non-passive wheel, pointer-release-only detent) restyled to OUR tokens.
   R15-A2: StripMeter is a view over the shared stereo metering engine
   (lib/meterEngine).
   R19-B1 (audio_mixer.html reference — r19-analysis/audio-cluster.md §2.5):
   - NEW piecewise DISPLAY taper (dbToPos/posToDb): the MODEL stays linear
     −60..+6 dB (mockMixer.dbToSlider, pinned by tests); the VIEW reproduces
     the reference scale geometry — 0 dB at 15% from top, +10 dB headroom
     above it, marks −5/−10/−15/−20/−30/−40/−50 at 28/42/55/68/80/90/98%,
     −60 floor at 100%. Drag math routes through the map (px→pos→dB).
     fixes th_mtoyq7jt
   - Fader: 6px groove centered in a wide hit column, 22×36 gradient thumb
     with grip lines, scale marks at the reference piecewise positions,
     optional 24px HEADROOM strip carrying the dB readout (signed 1dp, no
     unit, −∞ guard). fixes th_mtoyq7jt
   - StripMeter: fillHeight no longer eats the strip width — the meter column
     is FIXED (default 14px = 2×6.5px stereo bars + 1px gap, per the
     reference). fixes th_mto617w1
   - PanBox: the reference's 48px crosshair pan position box (4px dot at
     left = 50 + pan/2 %) with OUR drag/keyboard grammar (mono tracks render
     one dot — no stereo-flag field exists, gap noted in ChannelStrip).
   R20-W1 (mixer-contract §1/§3/§4.4, DESIGN-R20 D1.2/D1.3):
   - B7: the Fader now has the Knob's full pointer-release discipline
     (pointerup + pointercancel + lostpointercapture clear the drag state).
   - B8: aria-orientation on both sliders (vertical fader, horizontal pan).
   - B9: StripMeter maps its fill through the SAME piecewise taper as the
     fader/scale/grid — fill = 1 − dbToPos(db) → 0 dB lands at 85% height
     (the 15% gridline), and the zone stops re-anchor to the taper
     positions (−18 dB → 37.2%, −6 dB → 69.2%). Palette stays OUR 3-zone
     + clip semantics (deliberate C41 deviation).
   - D2: FaderGridlines — the reference's .fader-section::before technique
     (token-colored 1px bands at 15/28/42/55/68/80/90%) so 0 dB reads
     across strips. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { dbLabel } from '../../state/mockMixer';
import { useMeter } from '../../lib/meterEngine';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/* ---------- piecewise display taper (R19-B1, reference §2.5) ----------
   pos = 0..1 measured FROM THE TOP of the fader columns. Anchors are the
   reference's exact mark positions. The map is strictly monotonic and
   piecewise-linear, so dB→pos→dB round-trips exactly on the anchors and to
   float precision everywhere else (pinned by unit tests). The MODEL range
   stays −60..+6: values above +6 clamp at pos 6% (the top of +6..+10
   headroom is display-only). */
export const FADER_TAPER: ReadonlyArray<{ pos: number; db: number }> = [
  { pos: 0.0, db: 10 },
  { pos: 0.15, db: 0 },
  { pos: 0.28, db: -5 },
  { pos: 0.42, db: -10 },
  { pos: 0.55, db: -15 },
  { pos: 0.68, db: -20 },
  { pos: 0.8, db: -30 },
  { pos: 0.9, db: -40 },
  { pos: 0.98, db: -50 },
  { pos: 1.0, db: -60 },
];

/** dB → position 0..1 from the top (display map; clamps outside the taper) */
export function dbToPos(db: number): number {
  if (db <= -60) return 1;
  if (db >= 10) return 0;
  for (let i = 1; i < FADER_TAPER.length; i++) {
    const a = FADER_TAPER[i - 1];
    const b = FADER_TAPER[i];
    if (db >= b.db) {
      // dB falls in [b.db, a.db] — interpolate along the segment
      return a.pos + ((db - a.db) / (b.db - a.db)) * (b.pos - a.pos);
    }
  }
  return 1;
}

/** position 0..1 from the top → dB (display map; clamps outside the taper) */
export function posToDb(pos: number): number {
  const p = clamp(pos, 0, 1);
  for (let i = 1; i < FADER_TAPER.length; i++) {
    const a = FADER_TAPER[i - 1];
    const b = FADER_TAPER[i];
    if (p <= b.pos) {
      return a.db + ((p - a.pos) / (b.pos - a.pos)) * (b.db - a.db);
    }
  }
  return -60;
}

/* ---------- cross-strip dB gridlines (R20-W1 D2, contract §1.3) ----------
   The reference's .fader-section::before technique: ONE multi-stop gradient
   painting 1px token-colored bands at the taper positions (0dB@15, −5@28,
   −10@42, −15@55, −20@68, −30@80, −40@90% — the −50@98 stop is dropped:
   it would collide with the bottom endcap) spanning the whole trio row
   (scale + groove + meter), so 0dB reads ACROSS strips. Rendered by the
   fader section's columns row; pointer-events none, painted BEHIND the
   columns (first positioned child, same z, DOM order wins). */
const GRIDLINE_POSITIONS = [15, 28, 42, 55, 68, 80, 90] as const;
const GRIDLINE_GRADIENT =
  `linear-gradient(to bottom, ${GRIDLINE_POSITIONS.flatMap((p) => [
    `transparent ${p - 0.5}%`, `var(--fader-grid) ${p}%`, `transparent ${p + 0.5}%`,
  ]).join(', ')})`;

export function FaderGridlines() {
  return (
    <div
      data-testid="fader-gridlines"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ backgroundImage: GRIDLINE_GRADIENT }}
    />
  );
}

/* the model keeps the pinned linear −60..+6 range (mockMixer + tests); the
   view clamps every onChange into it so the headroom above +6 is honest */
const MODEL_MIN = -60;
const MODEL_MAX = 6;

/** headroom readout format (reference §2.5): signed 1dp, NO unit, −∞ floor */
export const dbHeadroomLabel = (db: number) =>
  db <= -59.5 ? '−∞' : `${db > 0 ? '+' : ''}${db.toFixed(1)}`;

/** live peak readout format: signed 1dp, no unit, −∞ floor */
export const peakLabel = (peakDb: number) =>
  peakDb <= -60 ? '−∞' : `${peakDb > 0 ? '+' : ''}${peakDb.toFixed(1)}`;

/* ---------- shared 24px headroom strip (fixes th_mtoyq7jt) ----------
   One row above the fader/meter/scale columns: fader dB (signed 1dp, no
   unit) left + live engine peak right. Strips, aux returns, master and the
   channel editor all render it — the readout is SHARED by the columns
   below instead of living inside the fader's own column. */
export function HeadroomReadout({ db, peakDb, testId }: { db: number; peakDb: number; testId?: string }) {
  return (
    <div
      data-testid={testId}
      className="mono flex h-[24px] w-full shrink-0 items-baseline justify-between px-1.5 pt-0.5 text-[9px] leading-none"
    >
      <span className="text-tprimary">{dbHeadroomLabel(db)}</span>
      <span className="text-[var(--meter-green)]">{peakLabel(peakDb)}</span>
    </div>
  );
}

/* ---------- vertical fader (dB-tapered) ----------
   R19-B1 reference geometry: 6px groove centered in a ~46px hit column
   (wide pointer target, same drag math — the groove spans the column's
   full height), 22×36 gradient thumb (grip lines, overhangs the groove),
   0 dB notch at 15% from the top, end caps, and the dB scale column
   (14px) at the reference piecewise positions. `headroom` renders the
   24px readout strip above the columns (default: on for standalone
   faders; strips pass false and render the SHARED HeadroomReadout so the
   meter column gets the same headroom). `accent` keeps the master
   --fader-cap-accent-1/2 pair.
   Grammar: drag routes through the piecewise map (px→pos→dB, model-clamped);
   keyboard stays in the dB domain (arrows ±1/±0.2, Page ±6, Home/End,
   double-click reset 0). */
const FADER_SCALE_LABELS: { db: number; label: string }[] = [
  { db: 0, label: '0' },
  { db: -5, label: '−5' },
  { db: -10, label: '−10' },
  { db: -15, label: '−15' },
  { db: -20, label: '−20' },
  { db: -30, label: '−30' },
  { db: -40, label: '−40' },
  { db: -50, label: '−50' },
];

export function Fader({ db, onChange, height = 96, fillHeight = false, scale = false, accent = false, headroom = true, ariaLabel }: {
  db: number; onChange: (db: number) => void; height?: number;
  /** side-dock mode: the track fills the strip's fader-section height */
  fillHeight?: boolean;
  /** dB label column at the reference piecewise positions (channel strips) */
  scale?: boolean;
  /** master cap: --fader-cap-accent-1/2 gradient (flat, no glow) */
  accent?: boolean;
  /** 24px headroom strip with the dB readout above the columns — strips
      pass false and share one HeadroomReadout with the meter column */
  headroom?: boolean;
  ariaLabel: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  // drag math routes through the display map: pos 0..1 FROM THE TOP
  const drag = useRef<{ startY: number; startPos: number } | null>(null);

  const setFromEvent = useCallback((clientY: number, fine: boolean) => {
    const box = trackRef.current?.getBoundingClientRect();
    if (!box || !drag.current) return;
    /* th_mtr0prj5 (#55, R23 wrap): the thumb must FOLLOW the pointer —
     * pos is 0..1 FROM THE TOP, so dragging UP (clientY decreasing) must
     * DECREASE pos (toward the top = louder). The old (startY − clientY)
     * sign had the thumb run AWAY from the cursor — physically reversed. */
    const dPos = ((clientY - drag.current.startY) / box.height) * (fine ? 0.25 : 1);
    onChange(clamp(posToDb(drag.current.startPos + dPos), MODEL_MIN, MODEL_MAX));
  }, [onChange]);

  /* R20-W1 B7 (contract §3.1): the Knob's pointer-release discipline — a
     stray pointerup/pointercancel/lostpointercapture must clear the drag
     anchor, or the NEXT pointerdown could inherit a stale startPos. The
     capture release is guarded (browsers/jsdom disagree on double release). */
  const releaseDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    try {
      const el = e.currentTarget;
      if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
    } catch { /* capture already released */ }
  };

  const capGradient = accent
    ? 'linear-gradient(180deg, var(--fader-cap-accent-1), var(--fader-cap-accent-2))'
    : 'linear-gradient(180deg, var(--fader-thumb-1), var(--fader-thumb-2))';

  const pos = dbToPos(db);

  return (
    <div className={`flex min-h-0 flex-col ${fillHeight ? 'self-stretch' : ''}`}>
      {headroom && (
        <div
          data-testid="fader-headroom"
          className="mono flex h-[24px] shrink-0 items-baseline pl-1 pr-1.5 text-[9px] leading-none text-tprimary"
        >
          {dbHeadroomLabel(db)}
        </div>
      )}
      {/* scale column + hit column share one items-stretch row — the labels
          align with the groove's exact height (equal-height law, th_mtoyq7jt) */}
      <div
        className={`flex items-stretch justify-center gap-1 ${fillHeight ? 'min-h-[80px] flex-1' : ''}`}
        style={fillHeight ? undefined : { height }}
      >
        {scale && (
          <div
            data-testid="fader-scale"
            data-col="scale"
            aria-hidden="true"
            className="relative mr-0.5 w-[14px] shrink-0 self-stretch select-none text-right text-[8px] leading-none text-tfaint"
          >
            {FADER_SCALE_LABELS.map(({ db: t, label }) => (
              <span
                key={t}
                className="absolute right-0"
                style={{ top: `${dbToPos(t) * 100}%`, transform: 'translateY(-50%)' }}
              >
                {label}
              </span>
            ))}
          </div>
        )}
        {/* hit column — the whole fader column is the drag target (reference
            §3.4: "widen the pointer hit area"); the 6px groove is centered */}
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label={ariaLabel}
          aria-orientation="vertical"
          aria-valuemin={-60}
          aria-valuemax={6}
          aria-valuenow={Math.round(db)}
          aria-valuetext={dbLabel(db)}
          /* R23-FIX (review-sweep R1-P3): touch-none — a touch drag on the
             fader column used to scroll the page before the pointermove
             grammar engaged (the Knob/PanBox twins already carried it). */
          className="relative flex w-[46px] shrink-0 cursor-ns-resize touch-none select-none items-stretch justify-center self-stretch"
          onPointerDown={(e) => {
            try {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            } catch { /* inactive pointer id — drag still works, capture best-effort */ }
            const box = trackRef.current!.getBoundingClientRect();
            const p = clamp((e.clientY - box.top) / box.height, 0, 1);
            const nextDb = clamp(posToDb(p), MODEL_MIN, MODEL_MAX);
            onChange(nextDb);
            drag.current = { startY: e.clientY, startPos: p };
          }}
          onPointerMove={(e) => {
            if (e.buttons !== 1 || !drag.current) return;
            setFromEvent(e.clientY, e.shiftKey);
          }}
          onPointerUp={releaseDrag}
          onPointerCancel={releaseDrag}
          onLostPointerCapture={() => { drag.current = null; }}
          onDoubleClick={() => onChange(0)}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 0.2 : 1;
            if (e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.min(6, db + step)); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(-60, db - step)); }
            else if (e.key === 'PageUp') { e.preventDefault(); onChange(Math.min(6, db + 6)); }
            else if (e.key === 'PageDown') { e.preventDefault(); onChange(Math.max(-60, db - 6)); }
            else if (e.key === 'Home') { e.preventDefault(); onChange(-60); }
            else if (e.key === 'End') { e.preventDefault(); onChange(6); }
          }}
        >
          {/* groove — 6px, full column height, inset shadow (reference §2.5) */}
          <div
            data-testid="fader-groove"
            data-col="groove"
            className="relative w-[6px] shrink-0 self-stretch rounded-[3px] border border-strong bg-inset shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]"
          >
            {/* end caps — the slot's visible travel stops */}
            <span data-testid="fader-endcap-top" className="absolute inset-x-0 top-0 h-[2px] rounded-t-[1px] bg-strong" aria-hidden="true" />
            <span data-testid="fader-endcap-bottom" className="absolute inset-x-0 bottom-0 h-[2px] rounded-b-[1px] bg-strong" aria-hidden="true" />
            {/* 0 dB unity notch — reference: 1px #888 at 15% from the top,
                extending 2px past both sides of the groove */}
            <span
              data-testid="fader-unity-notch"
              className="absolute left-1/2 h-[1px] w-[10px] -translate-x-1/2 bg-tprimary/40"
              style={{ top: '15%' }}
              aria-hidden="true"
            />
            {/* thumb — 22×36 gradient (reference #d6d6d6→#999 ≈ our
                --fader-thumb-1/2 pair), grip lines, centered on the taper
                position (overhangs the groove by 8px each side) */}
            <span
              data-testid="fader-thumb"
              className="absolute left-1/2 z-[2] h-[36px] w-[22px] -translate-x-1/2 -translate-y-1/2 rounded-[2px] border border-black shadow-[0_4px_6px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.6)]"
              style={{ top: `${pos * 100}%`, background: capGradient }}
              aria-hidden="true"
            >
              <span data-testid="fader-grip" className="absolute inset-x-[2px] top-1/2 h-[2px] -translate-y-1/2 bg-black/80" aria-hidden="true" />
              <span className="absolute inset-x-[2px] top-[calc(50%-3px)] h-px bg-white/70" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- generic knob (R15-A1) ----------
   DAW-exact interaction grammar, NLE-tuned visuals:
   - angle law −135..+135 (270° sweep), t = (v−min)/(max−min)
   - vertical drag: Δv = −(clientY − startY)·range/200; Shift ×0.2
   - pointer capture on currentTarget (NOT the child under the pointer) with
     a hasPointerCapture-guarded release + pointercancel reset
   - non-passive native wheel listener (React onWheel is passive → the page
     scrolls); step = range·0.02, Shift ×0.2
   - double-click → defaultValue; detent snaps to defaultValue when |v−detent|
     ≤ 2 at POINTER RELEASE only (C2: keyboard detent breaks ±1 fine steps)
   - keyboard grammar is OURS (kept as-is; no detent on keys)
   PanKnob below is the pan-flavoured wrapper (C/L/R format, ±100, ±5/±1). */
const ARC_PATH = 'M 20 80 A 40 40 0 1 1 80 80';
const ARC_LEN = 183.5; // measured path length (C2-verified; 188.5 is ~3% long)

export function Knob({ value, onChange, min, max, size = 22, ariaLabel, format, defaultValue, step, fineStep }: {
  value: number; onChange: (v: number) => void; min: number; max: number; size?: number;
  ariaLabel: string; /** aria-valuetext + persistent label + bubble text */
  format: (v: number) => string;
  /** double-click reset target + pointer-release detent target */
  defaultValue?: number;
  /** keyboard steps (ours: pan uses 5 / 1) */
  step?: number; fineStep?: number;
}) {
  const range = max - min;
  const kbStep = step ?? Math.round(range * 0.025);
  const kbFine = fineStep ?? Math.max(1, Math.round(range * 0.005));

  // the wheel handler must read the LATEST controlled value + callback without
  // re-binding the native listener every render
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState(false);
  const drag = useRef<{ startY: number; startValue: number; lastValue: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // non-passive native wheel (preventDefault works; the page never scrolls)
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const fine = e.shiftKey ? 0.2 : 1;
      const dir = e.deltaY < 0 ? 1 : -1;
      onChangeRef.current(clamp(valueRef.current + dir * range * 0.02 * fine, min, max));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [min, max, range]);

  const releasePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    try {
      if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
    } catch { /* capture already released — jsdom/browsers can disagree */ }
  };

  const t = (value - min) / range;
  const angle = -135 + t * 270;
  const label = format(value);
  const dash = ((angle + 135) / 270) * ARC_LEN;

  return (
    <div className="relative flex flex-col items-center gap-0.5">
      {/* value bubble — hover + drag only, mono tabular-nums (persistent label
          below the dial stays; the bubble is the precision readout) */}
      {(hover || dragging) && (
        <span
          data-testid="knob-bubble"
          className="mono absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] border border-strong bg-inset px-1 py-px text-[10px] leading-none text-tprimary"
        >
          {label}
        </span>
      )}
      <div
        ref={rootRef}
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Math.round(value)}
        aria-valuetext={label}
        className="relative cursor-ns-resize touch-none select-none rounded-full border border-strong"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 35% 30%, var(--knob-face-1), var(--knob-face-2) 65%)`,
          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.45), 0 1px 2px rgba(0, 0, 0, 0.3)',
        }}
        onPointerDown={(e) => {
          // capture on the CURRENT target (never the child under the pointer —
          // release would throw NotFoundError); guarded: synthetic/inactive
          // pointer ids throw on capture (browsers + test automation)
          try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          } catch { /* inactive pointer id — drag still works, capture is best-effort */ }
          drag.current = { startY: e.clientY, startValue: value, lastValue: value };
          setDragging(true);
        }}
        onPointerMove={(e) => {
          if (!drag.current || e.buttons !== 1) return;
          const fine = e.shiftKey ? 0.2 : 1;
          const dv = -(e.clientY - drag.current.startY) * (range / 200) * fine;
          const v = clamp(drag.current.startValue + dv, min, max);
          drag.current.lastValue = v;
          onChange(v);
        }}
        onPointerUp={(e) => {
          if (!drag.current) return;
          const v = drag.current.lastValue;
          drag.current = null;
          setDragging(false);
          releasePointer(e);
          // detent: pointer-release ONLY (C2 — keyboard ±1 must pass through)
          if (defaultValue !== undefined && Math.abs(v - defaultValue) <= 2) onChange(defaultValue);
        }}
        onPointerCancel={(e) => {
          drag.current = null;
          setDragging(false);
          releasePointer(e);
        }}
        onDoubleClick={() => {
          if (defaultValue !== undefined) onChange(defaultValue);
        }}
        onKeyDown={(e) => {
          const s = e.shiftKey ? kbFine : kbStep;
          /* R23-FIX (review-sweep R1-P3): ArrowUp/Down join Left/Right — the
             dial's drag grammar is VERTICAL (cursor-ns-resize), so the
             natural key pair was missing; Up = +, Down = − (clamped). */
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(clamp(value + s, min, max)); }
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(clamp(value - s, min, max)); }
        }}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
      >
        {/* R23-FIX (review-sweep R1-P3): the 24px hit floor — a pointer-affordance
            child extends the interactive surface past the visual dial when
            size < 24 (the 22px dial keeps its geometry; events on the layer
            bubble to THIS element's handlers). Hit target ≠ visual size. */}
        {size < 24 && <span aria-hidden="true" className="absolute" style={{ inset: -(24 - size) / 2 }} />}
        {/* dial face — SVG viewBox 0 0 100 100, absolutely inset, inert.
            Round caps read as endpoints — NO endpoint ticks (sub-pixel at
            22/24px, C2). Indicator line sits ABOVE center (y 35→20, the C2
            antiphase fix) with stroke 7 (≈1.5px at 22px). */}
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <path data-testid="knob-track-arc" d={ARC_PATH} fill="none" stroke="var(--knob-track)" strokeWidth={6} strokeLinecap="round" />
          <path
            data-testid="knob-active-arc"
            d={ARC_PATH}
            fill="none"
            stroke="var(--knob-active)"
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${ARC_LEN}`}
            style={{ transition: dragging ? 'none' : 'stroke-dasharray 100ms linear' }}
          />
          <line
            data-testid="knob-indicator"
            x1={50} y1={35} x2={50} y2={20}
            transform={`rotate(${angle} 50 50)`}
            stroke="var(--knob-active)"
            strokeWidth={7}
            strokeLinecap="round"
          />
          <circle cx={50} cy={50} r={4.5} fill="var(--text-primary)" opacity={0.2} />
        </svg>
      </div>
      <span className="mono text-[10px] text-tmuted">{label}</span>
    </div>
  );
}

/* ---------- pan knob (C/L/R flavour of the generic dial) ---------- */
const panLabel = (v: number) => (v === 0 ? 'C' : v < 0 ? `L${Math.abs(Math.round(v))}` : `R${Math.round(v)}`);

export function PanKnob({ pan, onChange, size = 22, ariaLabel }: {
  pan: number; onChange: (pan: number) => void; size?: number; ariaLabel: string;
}) {
  return (
    <Knob
      value={pan}
      onChange={onChange}
      min={-100}
      max={100}
      size={size}
      ariaLabel={ariaLabel}
      format={panLabel}
      defaultValue={0}
      step={5}
      fineStep={1}
    />
  );
}

/* ---------- pan crosshair box (R19-B1, reference §2.4 row 6) ----------
   The Fairlight pan position box: 48px square, 1px crosshair at 50%, one
   4px blue dot at top 25% / left = 50 + pan/2 % (mono — our model has no
   stereo-flag field, so the reference's green stereo-extent dots are not
   rendered; gap noted in ChannelStrip). Keeps OUR control grammar in the
   box: click/drag = jump + relative horizontal drag (48px = ±100), keyboard
   ±5 / ⇧±1, double-click center — same semantics as the PanKnob it
   replaces on strips (the knob stays in the ChannelEditor). */
export function PanBox({ pan, onChange, ariaLabel, size = 48 }: {
  pan: number; onChange: (pan: number) => void; ariaLabel: string;
  /** 48px reference box (T0) / 36px lean box (T1-T2, DESIGN-R20 D1.3) */
  size?: number;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startPan: number } | null>(null);
  const leftPct = 50 + pan / 2;

  const setFromEvent = (clientX: number) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || !drag.current) return;
    const dPan = ((clientX - drag.current.startX) / box.width) * 200;
    onChange(clamp(drag.current.startPan + dPan, -100, 100));
  };

  return (
    <div
      ref={boxRef}
      data-testid="pan-box"
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      aria-valuemin={-100}
      aria-valuemax={100}
      aria-valuenow={Math.round(pan)}
      aria-valuetext={panLabel(pan)}
      title={`${ariaLabel}: ${panLabel(pan)}`}
      className={`relative ${size === 48 ? 'h-[48px] w-[48px]' : 'h-[36px] w-[36px]'} cursor-ew-resize touch-none select-none rounded-[2px] border border-strong bg-inset`}
      onPointerDown={(e) => {
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch { /* inactive pointer id — drag still works, capture best-effort */ }
        const box = boxRef.current!.getBoundingClientRect();
        const p = clamp((e.clientX - box.left) / box.width, 0, 1);
        const nextPan = clamp(p * 200 - 100, -100, 100);
        onChange(nextPan);
        drag.current = { startX: e.clientX, startPan: nextPan };
      }}
      onPointerMove={(e) => {
        if (e.buttons !== 1 || !drag.current) return;
        setFromEvent(e.clientX);
      }}
      /* R23-FIX (review-sweep R1-P3 — PanBox release discipline): the B7
         law the Fader/Knob already carry — pointerup / pointercancel /
         lostpointercapture all CLEAR the drag state (the drag ref used to
         outlive the gesture; a stray buttons=1 move re-entered a stale
         session). */
      onPointerUp={() => { drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }}
      onLostPointerCapture={() => { drag.current = null; }}
      onDoubleClick={() => onChange(0)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 1 : 5;
        if (e.key === 'ArrowRight') { e.preventDefault(); onChange(clamp(pan + step, -100, 100)); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); onChange(clamp(pan - step, -100, 100)); }
      }}
    >
      {/* crosshair grid — 1px lines at 50% (reference #2a2a2a → --border-soft) */}
      <span className="pointer-events-none absolute top-1/2 h-px w-full bg-soft" aria-hidden="true" />
      <span className="pointer-events-none absolute left-1/2 h-full w-px bg-soft" aria-hidden="true" />
      {/* pan position dot — 4px, blue (reference #2fa1d6 ≈ --mk-blue) */}
      <span
        data-testid="pan-dot"
        className="pointer-events-none absolute top-1/4 h-[4px] w-[4px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ left: `${leftPct}%`, background: 'var(--mk-blue)' }}
        aria-hidden="true"
      />
    </div>
  );
}

/* ---------- stereo strip meter — a view over the shared engine (R15-A2) ----------
   R20-W1 B9 (contract §4.4): the fill maps through the SAME piecewise taper
   as the fader/scale/gridlines — fillPct = 1 − dbToPos(db) — so 0 dB lands
   at 85% height (the 15% gridline position) instead of 100%, and the strip's
   two instruments finally agree about where 0 dB is. Zone stops re-anchor to
   the taper positions: amber at dbToPos(−18) → 37.2% fill, red at
   dbToPos(−6) → 69.2% fill (the engine's dB-linear `level` 0..1 is converted
   back to dB first). Peak line: 1px white/90 at the SAME taper position
   (kept white over the reference's yellow — documented choice, B10). The
   palette keeps OUR 3-zone + clip semantics (deliberate C41 deviation).
   LED segments: 3px repeating overlay. Muted: opacity 0.2 + data-state.
   R19-B1: fillHeight fills HEIGHT only — the column is a FIXED width
   (default 6.5px per bar → 14px total = 2×6.5 + 1px gap, the reference
   §2.5 geometry; fixes th_mto617w1). Title keeps the pinned contract
   (fader dB + live peak). aria-hidden — never a live region (design §4). */
export function StripMeter({ trackId, db, height = 88, width = 6.5, duckAmount = 0, fillHeight = false, coarse = false, label }: {
  trackId: string; db: number; height?: number; width?: number; duckAmount?: number;
  /** rail/strip mode: no inline height — fill the flex parent's height; the
      WIDTH stays fixed (never w-full — th_mto617w1) */
  fillHeight?: boolean;
  /** micro-meter (toolbar, 14px): 4 coarse chunks, no 3px LED segments */
  coarse?: boolean;
  label: string;
}) {
  // the engine owns the signal (program sim, duck, solo-in-place, master
  // aggregation); the db prop stays the title's fader readout and the
  // generic-key fallback source (store-backed keys read the G-slice directly)
  const snap = useMeter(trackId, { db, duckAmount });
  const peak = Math.max(snap.l.peakDb, snap.r.peakDb);
  const peakText = peak <= -60 ? '−∞' : `${peak > 0 ? '+' : ''}${peak.toFixed(1)} dB`;
  const state = snap.muted ? 'muted' : snap.l.clipped || snap.r.clipped ? 'clip' : undefined;

  /* the taper display map, shared with the fader: dB → fill fraction from
     the BOTTOM. 0dB → 0.85 (the 15% gridline), −60 → 0, +10 headroom → 1.
     The engine's `level` is dB-linear 0..1 over [−60, 0] — convert to dB
     first, then map (the fill and the peak use the SAME dB→fill map). */
  const fillOfDb = (db: number) => 1 - dbToPos(db);
  // zone stops re-anchored to the taper (C41 palette, B9 geometry)
  const AMBER_STOP = Math.round((1 - dbToPos(-18)) * 1000) / 10; // 37.2
  const RED_STOP = Math.round((1 - dbToPos(-6)) * 1000) / 10; // 69.2

  return (
    <div
      className={`meter-well relative flex items-stretch gap-px overflow-hidden rounded-[2px] border border-hairline ${snap.muted ? 'opacity-20' : ''} ${fillHeight ? 'h-full min-h-0' : ''}`}
      style={{ ...(fillHeight ? {} : { height }), width: width * 2 + 1 }}
      aria-hidden="true"
      data-state={state}
      title={`${label}: ${dbLabel(db)} · peak ${peakText}`}
    >
      {(['l', 'r'] as const).map((ch) => {
        const c = snap[ch];
        const pct = Math.round(fillOfDb(c.level * 60 - 60) * 10000) / 100;
        const peakPct = c.peakDb <= -60 ? null : Math.round(Math.min(1, fillOfDb(c.peakDb)) * 10000) / 100;
        return (
          <div key={ch} data-channel={ch} className="relative min-w-0 flex-1 overflow-hidden">
            {/* fill: full-height gradient layer clipped from the top — the
                stops sit at the TAPER positions (amber = −18 dB → 37.2%,
                red = −6 dB → 69.2%), agreeing with the gridlines above */}
            <div
              className="absolute inset-x-0 bottom-0 h-full"
              style={{
                background: c.clipped
                  ? 'var(--meter-red)'
                  : `linear-gradient(to top, var(--meter-green) 0%, var(--meter-amber) ${AMBER_STOP}%, var(--meter-red) ${RED_STOP}%)`,
                clipPath: `inset(${100 - pct}% 0 0 0)`,
                transition: 'clip-path 50ms linear, background 100ms linear',
              }}
            />
            <div className={`pointer-events-none absolute inset-0 ${coarse ? 'meter-segments-coarse' : 'meter-segments'}`} />
            {peakPct !== null && (
              <div data-testid="meter-peak" className="pointer-events-none absolute inset-x-0 h-px bg-white/90" style={{ bottom: `${peakPct}%` }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

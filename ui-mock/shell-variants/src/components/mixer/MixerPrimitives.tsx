/* Mixer primitives — fader / pan knob / stereo strip meter.
   R15-A1: the knob is a DAW-grammar dial (270° SVG arc + dasharray + indicator
   line ABOVE center, vertical drag 200px/full-range, Shift ×0.2 fine,
   non-passive wheel, pointer-release-only detent) restyled to OUR tokens —
   no imported orange, no oklch sheet (design v2 borrow discipline).
   R15-A2: StripMeter is a view over the shared stereo metering engine
   (lib/meterEngine): dB-linear display [−60,0], token palette anchored to the
   well, LED segments, 1px peak line, mute/clip states.
   Fader drag grammar (SCOUT-R8-C): Shift+drag = fine, double-click = reset,
   full keyboard grammar (design doc §6). */

import { useCallback, useEffect, useRef, useState } from 'react';
import { dbLabel, dbToSlider, sliderToDb } from '../../state/mockMixer';
import { useMeter } from '../../lib/meterEngine';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/* ---------- vertical fader (dB-tapered) ---------- */
export function Fader({ db, onChange, height = 96, fillHeight = false, ariaLabel }: {
  db: number; onChange: (db: number) => void; height?: number;
  /** side-dock mode: the track fills the strip's centerpiece height */
  fillHeight?: boolean; ariaLabel: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; startDb: number } | null>(null);

  const setFromEvent = useCallback((clientY: number, fine: boolean) => {
    const box = trackRef.current?.getBoundingClientRect();
    if (!box || !drag.current) return;
    const dy = drag.current.startY - clientY;
    const dDb = (dy / box.height) * 66 * (fine ? 0.25 : 1);
    onChange(Math.min(6, Math.max(-60, drag.current.startDb + dDb)));
  }, [onChange]);

  return (
    <div className={`flex flex-col items-center gap-1 ${fillHeight ? 'self-stretch' : ''}`}>
      <span className="mono text-[10px] text-tmuted">{dbLabel(db)}</span>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={-60}
        aria-valuemax={6}
        aria-valuenow={Math.round(db)}
        aria-valuetext={dbLabel(db)}
        className={`relative w-[14px] cursor-ns-resize rounded-[3px] bg-inset ${fillHeight ? 'min-h-[80px] flex-1' : ''}`}
        style={fillHeight ? undefined : { height }}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          const box = trackRef.current!.getBoundingClientRect();
          const v = 1 - (e.clientY - box.top) / box.height;
          const nextDb = sliderToDb(v);
          onChange(nextDb);
          drag.current = { startY: e.clientY, startDb: nextDb };
        }}
        onPointerMove={(e) => {
          if (e.buttons !== 1 || !drag.current) return;
          setFromEvent(e.clientY, e.shiftKey);
        }}
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
        {/* dB scale ticks */}
        {[6, 0, -12, -24, -48, -60].map((t) => (
          <span key={t} className="absolute left-0 h-px w-[3px] bg-tfaint" style={{ bottom: `${dbToSlider(t) * 100}%` }} aria-hidden="true" />
        ))}
        {/* thumb — A0 fader-thumb token pair (flat cap; unity notch + scale
            column are the A3 wave, deliberately not here) */}
        <span
          className="absolute left-1/2 h-[10px] w-[12px] -translate-x-1/2 rounded-[2px] border border-strong bg-[linear-gradient(180deg,var(--fader-thumb-1),var(--fader-thumb-2))] shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
          style={{ bottom: `calc(${dbToSlider(db) * 100}% - 5px)` }}
          aria-hidden="true"
        />
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
          if (e.key === 'ArrowRight') { e.preventDefault(); onChange(clamp(value + s, min, max)); }
          else if (e.key === 'ArrowLeft') { e.preventDefault(); onChange(clamp(value - s, min, max)); }
        }}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
      >
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

/* ---------- stereo strip meter — a view over the shared engine (R15-A2) ----------
   Display range [−60, 0] dBFS dB-linear: fill fraction = clamp((db+60)/60);
   db ≥ 0 → full + clip state. The palette gradient is anchored to the WELL via
   clip-path so the stops agree with the dB zones (amber 70% = −18 dB,
   red 90% = −6 dB). LED segments: 3px repeating overlay (4 coarse chunks for
   the 14px micro-meter). Peak line: 1px white/90 at the dB-linear peak
   position. Muted: opacity 0.2 + data-state. Title keeps the pinned contract
   (fader dB + live peak; 4 test files pin it). aria-hidden — never a live
   region (design doc §4). */
export function StripMeter({ trackId, db, height = 88, width = 7, duckAmount = 0, fillHeight = false, coarse = false, label }: {
  trackId: string; db: number; height?: number; width?: number; duckAmount?: number;
  /** rail/strip mode: no inline height — fill the flex parent instead */
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

  return (
    <div
      className={`meter-well relative flex items-stretch gap-px overflow-hidden rounded-[2px] border border-hairline ${snap.muted ? 'opacity-20' : ''} ${fillHeight ? 'h-full min-h-0 w-full' : ''}`}
      style={fillHeight ? undefined : { height, width: width * 2 + 1 }}
      aria-hidden="true"
      data-state={state}
      title={`${label}: ${dbLabel(db)} · peak ${peakText}`}
    >
      {(['l', 'r'] as const).map((ch) => {
        const c = snap[ch];
        const pct = Math.round(c.level * 10000) / 100;
        const peakPct = c.peakDb <= -60 ? null : Math.round(Math.min(1, (c.peakDb + 60) / 60) * 10000) / 100;
        return (
          <div key={ch} data-channel={ch} className="relative min-w-0 flex-1 overflow-hidden">
            {/* fill: full-height gradient layer clipped from the top — the
                stops stay at absolute dB positions (amber = −18, red = −6) */}
            <div
              className="absolute inset-x-0 bottom-0 h-full"
              style={{
                background: c.clipped
                  ? 'var(--meter-red)'
                  : 'linear-gradient(to top, var(--meter-green) 0%, var(--meter-amber) 70%, var(--meter-red) 90%)',
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

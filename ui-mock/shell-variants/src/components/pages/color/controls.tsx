/* R20-W4b — shared control primitives for the color grading surfaces
   (WheelsPanel / QualifierPanel / CurvesPanel / ColorInspectorRail).

   MicroSlider: the mock grammar's micro sliders, now STORE-DRIVEN with the
   D3 commit law — "one history entry per committed edit (pointer-up / field
   commit)". The slider keeps a TRANSIENT drag buffer (null when idle: the
   shown value is ALWAYS the controlled store value); pointer drag moves the
   handle visually, pointer-up/cancel/lostpointercapture commits ONE
   onChange. Keyboard (arrows/Home/End) and double-click are DISCRETE commits
   (one onChange each). No grade value lives here — only the gesture buffer.

   ReadCell: the derived readout cell (YRGB rows, curve coords) — visually the
   NumCell grammar but read-only with an aria hint (spec 08 §16.A: the engine
   seam has no per-channel numeric editing; derived-from-puck values are
   displays, not controls).

   NumCell: numeric field that stays free-text while focused and commits on
   blur/Enter (one store write per commit). */

import { useRef, useState, type CSSProperties } from 'react';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/* ---------- MicroSlider ---------- */

export type SliderVariant = 'mini' | 'finesse' | 'bar';

const VARIANT: Record<SliderVariant, { track: string; handle: string; hit: string }> = {
  /* wheels top-controls mini slider: 4px track, 8×4 thumb (ref §1.3) */
  mini: {
    track: 'h-[4px] rounded-[2px] border border-[#222] bg-[#111] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]',
    handle: 'h-[4px] w-[8px] rounded-[1px] bg-[#888]',
    hit: 'h-[14px]',
  },
  /* matte finesse: 2px track, 4×10 handle (ref §2.5) */
  finesse: {
    track: 'h-[2px] rounded-[1px] bg-[#3a3a3a]',
    handle: 'h-[10px] w-[4px] rounded-[1px] bg-[var(--wheel-ring-arc)] shadow-[0_1px_2px_rgba(0,0,0,0.5)]',
    hit: 'h-[14px]',
  },
  /* gradient color-bar: 2px gradient strip + thin value needle (ref §1.5) */
  bar: {
    track: 'h-[2px] rounded-[1px]',
    handle: 'h-[8px] w-[2px] rounded-[1px] bg-white/90 shadow-[0_0_2px_rgba(0,0,0,0.8)]',
    hit: 'h-[14px]',
  },
};

export interface MicroSliderProps {
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  valueText?: string;
  onChange: (v: number) => void;
  /** first-interaction hook (fires the once-per-mount honesty toast) */
  onFirstTouch?: () => void;
  variant?: SliderVariant;
  /** gradient color-bars (linear-gradient string) */
  trackStyle?: CSSProperties;
  className?: string;
}

export function MicroSlider({
  ariaLabel,
  value,
  min,
  max,
  step = 1,
  valueText,
  onChange,
  onFirstTouch,
  variant = 'mini',
  trackStyle,
  className = '',
}: MicroSliderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const v = VARIANT[variant];
  /* transient gesture buffer — D3: preview local, commit on release (ONE
     undoable setGrade per drag; the R19 panel wrote nothing, the interim
     draft would have written per pointermove = 50 history entries/drag). */
  const [drag, setDrag] = useState<number | null>(null);
  const shown = drag ?? value;
  const pct = ((clamp(shown, min, max) - min) / (max - min)) * 100;

  const quantize = (raw: number) => clamp(Math.round(raw / step) * step, min, max);

  const setFromClientX = (clientX: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const t = clamp((clientX - box.left) / box.width, 0, 1);
    setDrag(quantize(min + t * (max - min)));
  };

  const commit = () => {
    if (drag === null) return;
    const final = quantize(drag);
    setDrag(null);
    if (final !== value) onChange(final);
  };

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(clamp(shown, min, max) * 1000) / 1000}
      aria-valuetext={valueText}
      /* R23-FIX (review-sweep R4-P3#5): aria-orientation="horizontal" — the
         slider's grammar is a horizontal track (the Fader/PanBox twins
         already declare theirs; the attr is part of the §11.3 contract). */
      aria-orientation="horizontal"
      className={`relative cursor-ew-resize select-none ${v.hit} ${className}`}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        onFirstTouch?.();
        setFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons !== 1 || drag === null) return;
        setFromClientX(e.clientX);
      }}
      onPointerUp={commit}
      onPointerCancel={() => setDrag(null)}
      onLostPointerCapture={commit}
      onDoubleClick={() => onChange(min + (max - min) / 2)}
      onKeyDown={(e) => {
        const s = step * (e.shiftKey ? 5 : 1);
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          onFirstTouch?.();
          onChange(quantize(value + s));
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          onFirstTouch?.();
          onChange(quantize(value - s));
        } else if (e.key === 'Home') {
          e.preventDefault();
          onFirstTouch?.();
          onChange(min);
        } else if (e.key === 'End') {
          e.preventDefault();
          onFirstTouch?.();
          onChange(max);
        }
      }}
    >
      <div aria-hidden className={`absolute inset-x-0 top-1/2 -translate-y-1/2 ${v.track}`} style={trackStyle} />
      <div aria-hidden className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 ${v.handle}`} style={{ left: `${pct}%` }} />
    </div>
  );
}

/* ---------- ReadCell (derived readout — NOT a control) ---------- */

export interface ReadCellProps {
  ariaLabel: string;
  value: number;
  format: (v: number) => string;
  /** the derived-from hint (spec 08 §16.A honesty: readouts, not editors) */
  title?: string;
  width?: number | string;
  className?: string;
}

export function ReadCell({ ariaLabel, value, format, title, width = 36, className = '' }: ReadCellProps) {
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      title={title ?? 'derived readout — spec 08 §16.A (no per-channel numeric editing at the engine seam)'}
      className={`mono rounded-[2px] border border-hairline bg-inset px-[3px] py-[2px] text-center text-[11.5px] text-tprimary shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] ${className}`}
      style={{ width, display: 'inline-block' }}
    >
      {format(value)}
    </span>
  );
}

/* ---------- NumCell ---------- */

export interface NumCellProps {
  ariaLabel: string;
  value: number;
  format: (v: number) => string;
  onCommit: (v: number) => void;
  onFirstTouch?: () => void;
  width?: number | string;
  className?: string;
}

export function NumCell({ ariaLabel, value, format, onCommit, onFirstTouch, width = 48, className = '' }: NumCellProps) {
  /* free text while focused — the formatted readout only re-asserts on blur,
     so an in-progress "1.5" or "-0." isn't clobbered by the formatter */
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? format(value);

  const commit = () => {
    if (text == null) return;
    const parsed = parseFloat(text);
    setText(null);
    if (Number.isFinite(parsed)) {
      onFirstTouch?.();
      onCommit(parsed);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      value={shown}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.currentTarget as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setText(null);
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      className={`mono rounded-[2px] border border-hairline bg-inset px-[3px] py-[2px] text-[11.5px] text-tprimary shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] transition-colors focus:border-[#555] focus:outline-none ${className}`}
      style={{ width }}
    />
  );
}

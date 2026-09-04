/* Mixer primitives — fader / pan knob / mock meter.
   Drag grammar (SCOUT-R8-C, the one portable part): Shift+drag = fine mode,
   double-click = reset. Faders are keyboard-operable sliders (design doc §6:
   arrows ±1 dB / ±5%, Home = −∞, End = +6, Page = ±6 dB). */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useUi } from '../../state/useUiStore';
import { dbLabel, dbToSlider, sliderToDb } from '../../state/mockMixer';

/* ---------- vertical fader (dB-tapered) ---------- */
export function Fader({ db, onChange, height = 96, ariaLabel }: {
  db: number; onChange: (db: number) => void; height?: number; ariaLabel: string;
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
    <div className="flex flex-col items-center gap-1">
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
        className="relative w-[14px] cursor-ns-resize rounded-[3px] bg-inset"
        style={{ height }}
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
        {/* thumb */}
        <span
          className="absolute left-1/2 h-[10px] w-[12px] -translate-x-1/2 rounded-[2px] border border-strong bg-[linear-gradient(180deg,#d8d8d8,#9a9a9e)] shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
          style={{ bottom: `calc(${dbToSlider(db) * 100}% - 5px)` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

/* ---------- pan knob ---------- */
export function PanKnob({ pan, onChange, size = 22, ariaLabel }: {
  pan: number; onChange: (pan: number) => void; size?: number; ariaLabel: string;
}) {
  const drag = useRef<{ startX: number; startPan: number } | null>(null);
  const angle = -135 + ((pan + 100) / 200) * 270;
  const label = pan === 0 ? 'C' : pan < 0 ? `L${Math.abs(Math.round(pan))}` : `R${Math.round(pan)}`;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={-100}
        aria-valuemax={100}
        aria-valuenow={Math.round(pan)}
        aria-valuetext={label}
        className="relative cursor-grab rounded-full border border-strong bg-inset active:cursor-grabbing"
        style={{ width: size, height: size }}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          drag.current = { startX: e.clientX, startPan: pan };
        }}
        onPointerMove={(e) => {
          if (e.buttons !== 1 || !drag.current) return;
          const d = (e.clientX - drag.current.startX) * (e.shiftKey ? 0.25 : 1);
          onChange(Math.min(100, Math.max(-100, drag.current.startPan + d)));
        }}
        onDoubleClick={() => onChange(0)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') { e.preventDefault(); onChange(Math.max(-100, pan - (e.shiftKey ? 1 : 5))); }
          else if (e.key === 'ArrowRight') { e.preventDefault(); onChange(Math.min(100, pan + (e.shiftKey ? 1 : 5))); }
        }}
      >
        <span
          className="absolute left-1/2 top-full h-[7px] w-[2px] -translate-x-1/2 rounded-full bg-tprimary"
          style={{ transform: `translateX(-50%) rotate(${angle}deg)`, transformOrigin: '50% 0%' }}
          aria-hidden="true"
        />
      </div>
      <span className="mono text-[10px] text-tmuted">{label}</span>
    </div>
  );
}

/* ---------- mock stereo meter (rAF while playing; seeded noise walk) ----------
   aria-hidden with a textual dB exposed via title (focus/query only —
   design doc §4: never aria-live, no 60fps announcement spam) */
let meterPlaying = false;
useUi.subscribe((s) => { meterPlaying = s.playing; });

export function StripMeter({ trackId, db, height = 88, width = 7, duckAmount = 0, label }: {
  trackId: string; db: number; height?: number; width?: number; duckAmount?: number; label: string;
}) {
  const [level, setLevel] = useState(0);
  const phase = useRef((trackId.charCodeAt(0) + trackId.length) * 0.7);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (meterPlaying) {
        phase.current += 0.18;
        const base = db <= -59.5 ? 0.02 : Math.pow(10, db / 20) * 0.9;
        const wobble = 0.72 + 0.28 * Math.sin(phase.current) * Math.sin(phase.current * 0.61 + 1.7);
        const ducked = base * (1 - duckAmount * 0.75);
        setLevel(Math.min(1, ducked * wobble));
      } else {
        setLevel((l) => (l < 0.01 ? 0 : l * 0.8));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [db, duckAmount]);

  return (
    <div
      className="relative flex items-end gap-[1px] overflow-hidden rounded-[2px] border border-hairline bg-black/70"
      style={{ height, width: width * 2 + 1 }}
      aria-hidden="true"
      title={`${label}: ${dbLabel(db)} · peak ${Math.round(level * 100)}%`}
    >
      <span className="h-full w-full origin-bottom scale-y-[var(--m)] bg-[linear-gradient(180deg,#e8c331_72%,#d9913a_86%,#fa1024_94%)]" style={{ ['--m' as any]: level }} />
      <span className="h-full w-full origin-bottom scale-y-[var(--m)] bg-[linear-gradient(180deg,#e8c331_72%,#d9913a_86%,#fa1024_94%)]" style={{ ['--m' as any]: level * 0.97 }} />
    </div>
  );
}

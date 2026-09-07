/* QualifierPanel — R20-W4b, the ColorConsole Qualifier tab (C51/C54;
   formerly the rail tab). Reference anatomy (qualifier_ui.html, color-cluster
   §2) as an EMBEDDED panel: toolbar row (Preview Matte toggle | Invert), the
   three HSL sections (red-dot header + reset; 24px hue bar / 16px sat-lum
   bars with the 65% out-of-range masks + dual triangle handles), the numeric
   fields, strength + the spec-08 §17.E secondary corrections.

   WHAT CHANGED (the R19 sin fixed): every value is STORE-DRIVEN — the panel
   reads/writes GradeParams.qualifier (W4a's QualifierParams, spec 08 §8.1
   field names verbatim) through useGradeRecord.setGrade; NO local useState
   for qualifier values (transient gesture buffers commit on pointer-up —
   ONE undoable setGrade per gesture, the D3 law).

   The 14-field "Matte Finesse" block is GONE — those were reference-HTML
   display fields with no spec 08 §8 counterpart; the honest spec-shaped
   surface is the §17.E secondary correction (exposure/sat/temp/tint) +
   strength/invert. R20-W4c (C54) made the eyedropper + viewer matte real:
   the toggle arms the viewer canvas picker (qualifierPickerOn view-state);
   the click-through samples the graded buffer and seeds the qualifier
   Center values (one setGrade per pick; the pick disarms), and the green
   matte overlay renders in the viewer while qualifierPreviewOn (the toggle
   also mirrors showMask into the grade record so it round-trips undo). */

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Contrast, Eye, Pipette, RotateCcw } from 'lucide-react';
import { MicroSlider, NumCell } from './controls';
import { useGradeRecord } from './useGradeTarget';
import { useGradingToast } from './useHonestToast';
import { DEFAULT_QUALIFIER, type QualifierParams } from '../../../lib/color';
import { useUi } from '../../../state/useUiStore';

/* ---------- gradients (ref §2.4) ---------- */

const GRADIENTS = {
  hue: 'linear-gradient(to right, #f0f 0%, #f00 16.6%, #ff0 33.3%, #0f0 50%, #0ff 66.6%, #00f 83.3%, #f0f 100%)',
  sat: 'linear-gradient(to right, #666, #2a52ff)',
  lum: 'linear-gradient(to right, #000, #fff)',
};

/** the handles' Type-A/Type-B triangle glyphs (ref §2.4) */
function HandleA() {
  return (
    <svg viewBox="0 0 12 24" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
      <line x1="1.5" y1="0" x2="1.5" y2="24" stroke="#e0e0e0" strokeWidth="1.5" />
      <polygon points="1.5,22.5 10.5,22.5 1.5,13.5" fill="#e0e0e0" stroke="#000" strokeWidth="1" />
    </svg>
  );
}

function HandleB() {
  return (
    <svg viewBox="0 0 12 24" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
      <line x1="10.5" y1="0" x2="10.5" y2="24" stroke="#e0e0e0" strokeWidth="1.5" />
      <polygon points="1.5,22.5 10.5,22.5 10.5,13.5" fill="#e0e0e0" stroke="#000" strokeWidth="1" />
    </svg>
  );
}

/* ---------- the dual-handle range widget (store-bound) ----------
   `toPct`/`fromPct` map the store's 0..1 (or 0..360) span to bar percents.
   Drag = transient (both handles preview), pointer-up = ONE commit. */

function RangeWidget({
  testid,
  section,
  gradient,
  big,
  leftType,
  rightType,
  loPct,
  hiPct,
  min,
  max,
  onCommit,
  onFirstTouch,
}: {
  testid: string;
  section: string;
  gradient: string;
  big: boolean;
  leftType: 'A' | 'B';
  rightType: 'A' | 'B';
  /** handle positions in STORE units (already lo ≤ hi). */
  loPct: number;
  hiPct: number;
  min: number;
  max: number;
  /** commit the final (lo, hi) in STORE units. */
  onCommit: (lo: number, hi: number) => void;
  onFirstTouch: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const height = big ? 24 : 16;
  const handleW = big ? 12 : 10;
  const span = max - min;

  const [drag, setDrag] = useState<{ which: 'lo' | 'hi'; lo: number; hi: number } | null>(null);
  const lo = drag ? drag.lo : loPct;
  const hi = drag ? drag.hi : hiPct;

  const setPos = (which: 'lo' | 'hi', clientX: number) => {
    const box = trackRef.current?.getBoundingClientRect();
    if (!box) return;
    const t = Math.min(100, Math.max(0, ((clientX - box.left) / box.width) * 100));
    const v = min + (t / 100) * span;
    if (which === 'lo') setDrag({ which, lo: Math.min(v, hi - 2 * (span / 100)), hi: drag?.hi ?? hiPct });
    else setDrag({ which, lo: drag?.lo ?? loPct, hi: Math.max(v, lo + 2 * (span / 100)) });
  };
  const commit = () => {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    onCommit(d.lo, d.hi);
  };

  const handle = (which: 'lo' | 'hi', type: 'A' | 'B') => {
    const pos = which === 'lo' ? lo : hi;
    const pct = ((pos - min) / span) * 100;
    return (
      <div
        key={which}
        role="slider"
        tabIndex={0}
        aria-label={`${section} range ${which === 'lo' ? 'low' : 'high'}`}
        aria-valuemin={Math.round(min)}
        aria-valuemax={Math.round(max)}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={pos.toFixed(1)}
        className="absolute top-0 z-10 h-full cursor-ew-resize touch-none"
        style={{ left: `${pct}%`, width: handleW, transform: 'translateX(-50%)' }}
        onPointerDown={(e: ReactPointerEvent<HTMLDivElement>) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          onFirstTouch();
          setPos(which, e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons !== 1 || !drag || drag.which !== which) return;
          setPos(which, e.clientX);
        }}
        onPointerUp={commit}
        onPointerCancel={() => setDrag(null)}
        onLostPointerCapture={commit}
        onKeyDown={(e) => {
          const s = (span / 100) * (e.shiftKey ? 5 : 1);
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            onFirstTouch();
            if (which === 'lo') onCommit(Math.min(lo + s, hi - 2 * (span / 100)), hi);
            else onCommit(lo, Math.min(max, Math.max(lo + 2 * (span / 100), hi + s)));
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            onFirstTouch();
            if (which === 'lo') onCommit(Math.max(min, lo - s), hi);
            else onCommit(lo, Math.max(lo + 2 * (span / 100), hi - s));
          } else if (e.key === 'Home') {
            e.preventDefault();
            onFirstTouch();
            if (which === 'lo') onCommit(min, hi);
            /* R23-FIX (review-sweep item 16, R4-P2#1): Home on the HI handle
               clamps to the separation law — hi >= lo + 2% AND >= min + 2%.
               The old write (min + 2·span/100) could land BELOW lo, inverting
               lo/hi (pinned: satHigh >= satLow after Home on hi). */
            else onCommit(lo, Math.max(lo + 2 * (span / 100), min + 2 * (span / 100)));
          } else if (e.key === 'End') {
            e.preventDefault();
            onFirstTouch();
            if (which === 'lo') onCommit(Math.min(max, hi - 2 * (span / 100)), hi);
            else onCommit(lo, max);
          }
        }}
      >
        {type === 'A' ? <HandleA /> : <HandleB />}
      </div>
    );
  };

  const loP = ((lo - min) / span) * 100;
  const hiP = ((hi - min) / span) * 100;

  return (
    <div
      ref={trackRef}
      data-testid={testid}
      className="relative w-full overflow-hidden rounded-[4px] border border-black bg-black"
      style={{ height }}
    >
      <div aria-hidden className="absolute inset-0 rounded-[3px]" style={{ background: gradient }} />
      {/* softness zones — out-of-range masks, 65% black (ref §2.4) */}
      <div aria-hidden className="absolute inset-y-0 left-0 bg-black/65" style={{ width: `${loP}%` }} />
      <div aria-hidden className="absolute inset-y-0 bg-black/65" style={{ left: `${hiP}%`, right: 0 }} />
      {/* center line — range midpoint marker */}
      <div aria-hidden className="absolute inset-y-0 w-px bg-white/25" style={{ left: `${(loP + hiP) / 2}%` }} />
      {handle('lo', leftType)}
      {handle('hi', rightType)}
    </div>
  );
}

/* ---------- one HSL section ---------- */

function Section({
  title,
  testid,
  gradient,
  big,
  leftType,
  rightType,
  qualifier,
  setQualifier,
  onReset,
  tell,
  fields,
  range,
}: {
  title: string;
  testid: string;
  gradient: string;
  big: boolean;
  leftType: 'A' | 'B';
  rightType: 'A' | 'B';
  qualifier: QualifierParams;
  setQualifier: (patch: Partial<QualifierParams>) => void;
  onReset: () => void;
  tell: () => void;
  /** numeric fields: label + read + write in DISPLAY units */
  fields: { label: string; get: (q: QualifierParams) => number; set: (q: QualifierParams, v: number) => Partial<QualifierParams>; fmt: (v: number) => string }[];
  /** the dual-handle bar: store-unit span + read/write of (lo, hi) */
  range: {
    min: number;
    max: number;
    get: (q: QualifierParams) => { lo: number; hi: number };
    set: (lo: number, hi: number) => Partial<QualifierParams>;
  };
}) {
  const q = qualifier;
  const bar = range.get(q);
  return (
    <section data-testid={testid} className="flex flex-col gap-2.5">
      <header className="flex items-center gap-2.5">
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: '#fc4438', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.3)' }} />
        <span className="flex-grow text-[13px] font-semibold text-tprimary">{title}</span>
        <button
          type="button"
          aria-label={`Reset ${title}`}
          className="flex h-5 w-5 items-center justify-center opacity-50 transition-opacity hover:opacity-100"
          onClick={onReset}
        >
          <RotateCcw size={14} />
        </button>
      </header>
      <RangeWidget
        testid={`${testid}-range`}
        section={title}
        gradient={gradient}
        big={big}
        leftType={leftType}
        rightType={rightType}
        loPct={bar.lo}
        hiPct={bar.hi}
        min={range.min}
        max={range.max}
        onFirstTouch={tell}
        onCommit={(lo, hi) => setQualifier(range.set(lo, hi))}
      />
      <div className="flex flex-wrap justify-end gap-x-3.5 gap-y-1">
        {fields.map((f) => (
          <label key={f.label} className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#959595]">{f.label}</span>
            <NumCell
              ariaLabel={`${title} ${f.label}`}
              value={f.get(q)}
              width={42}
              className="text-left"
              format={f.fmt}
              onFirstTouch={tell}
              onCommit={(n) => setQualifier(f.set(q, n))}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

/* ---------- the panel ---------- */

export function QualifierPanel() {
  const rec = useGradeRecord();
  const tell = useGradingToast();
  const previewOn = useUi((s) => s.qualifierPreviewOn);
  const setPreviewOn = useUi((s) => s.setQualifierPreviewOn);
  const pickerOn = useUi((s) => s.qualifierPickerOn);
  const setPickerOn = useUi((s) => s.setQualifierPickerOn);

  if (rec.targetId == null) {
    return (
      <div data-testid="shell-color-qualifier" className="flex h-full min-h-0 items-center justify-center bg-panel p-6 text-center">
        <p className="text-[12px] text-tmuted">
          No clip selected — click a clip in the lane strip (or switch the target to Timeline) to qualify.
        </p>
      </div>
    );
  }

  const { grade, setGrade } = rec;
  /* the secondary node: absent qualifier = DEFAULT (spec 08 §8.1) — first
     write materializes it via the deep-merge qualifier patch */
  const q: QualifierParams = grade.qualifier ?? DEFAULT_QUALIFIER;
  const setQualifier = (patch: Partial<QualifierParams>) => setGrade({ qualifier: patch });

  /* Preview Matte: the toggle writes the view-state (immediate, never
     snapshotted — W4c's viewer-overlay seam) AND mirrors showMask into the
     grade record (the spec 08 §8.1 field — undoable, round-trips). */
  const togglePreview = (v: boolean) => {
    setPreviewOn(v);
    setQualifier({ showMask: v });
  };

  return (
    <div data-testid="shell-color-qualifier" className="flex flex-col">
      {/* embedded header — window chrome dropped (embedded-panel directive) */}
      <div className="flex h-[32px] shrink-0 items-center justify-between border-b border-hairline bg-shell px-3">
        <span className="text-[13px] font-semibold text-tprimary">Qualifier — HSL</span>
        <button
          type="button"
          aria-label="Reset qualifier"
          data-tip="Reset"
          className="icon-btn"
          onClick={() => setGrade({ qualifier: null })}
        >
          <RotateCcw size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* toolbar row: Preview Matte | Invert | Eyedropper (all REAL — store-bound) */}
      <div className="flex h-[38px] shrink-0 items-center gap-3 border-b border-hairline bg-raised px-3">
        <button
          type="button"
          aria-label="Preview matte"
          aria-pressed={previewOn}
          data-testid="shell-color-qualifier-preview"
          data-tip="Matte preview overlay in the viewer (C54)"
          className={`icon-btn ${previewOn ? 'toggled' : ''}`}
          onClick={() => togglePreview(!previewOn)}
        >
          <Eye size={16} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          aria-label="Invert qualifier"
          aria-pressed={q.invert}
          data-testid="shell-color-qualifier-invert"
          data-tip="Invert the matte (spec 08 §8.1 invertMask)"
          className={`icon-btn ${q.invert ? 'toggled' : ''}`}
          onClick={() => setQualifier({ invert: !q.invert })}
        >
          <Contrast size={16} strokeWidth={1.5} />
        </button>
        {/* R20-W4c (C54): the eyedropper — arms the viewer canvas picker
            (qualifierPickerOn view-state); the click-through samples the
            graded buffer and seeds the Center values via setGrade. */}
        <button
          type="button"
          aria-label="Qualifier eyedropper"
          aria-pressed={pickerOn}
          data-testid="shell-color-qualifier-picker"
          data-tip="Arm the eyedropper — click the viewer image to seed the qualifier center (C54)"
          className={`icon-btn ml-auto ${pickerOn ? 'toggled' : ''}`}
          onClick={() => setPickerOn(!pickerOn)}
        >
          <Pipette size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* HSL sections — store-bound dual handles + fields (spec 08 §8.1) */}
      <div className="flex flex-col gap-6 px-5 py-5" style={{ background: '#232323' }}>
        <Section
          title="Hue"
          testid="shell-color-hue"
          gradient={GRADIENTS.hue}
          big
          leftType="B"
          rightType="A"
          qualifier={q}
          setQualifier={setQualifier}
          onReset={() => setQualifier({ hueCenter: DEFAULT_QUALIFIER.hueCenter, hueWidth: DEFAULT_QUALIFIER.hueWidth, hueSoftness: DEFAULT_QUALIFIER.hueSoftness })}
          tell={tell}
          range={{
            min: 0,
            max: 360,
            get: (qq) => {
              const lo = qq.hueCenter - qq.hueWidth / 2;
              const hi = qq.hueCenter + qq.hueWidth / 2;
              return { lo: Math.max(0, lo), hi: Math.min(360, hi) };
            },
            set: (lo, hi) => ({ hueCenter: (lo + hi) / 2, hueWidth: hi - lo }),
          }}
          fields={[
            { label: 'Center', get: (qq) => qq.hueCenter, set: (_qq, n) => ({ hueCenter: Math.min(360, Math.max(0, n)) }), fmt: (v) => v.toFixed(1) },
            { label: 'Width', get: (qq) => qq.hueWidth, set: (_qq, n) => ({ hueWidth: Math.min(360, Math.max(0, n)) }), fmt: (v) => v.toFixed(1) },
            { label: 'Soft', get: (qq) => qq.hueSoftness, set: (_qq, n) => ({ hueSoftness: Math.min(360, Math.max(0, n)) }), fmt: (v) => v.toFixed(1) },
          ]}
        />
        <Section
          title="Saturation"
          testid="shell-color-sat"
          gradient={GRADIENTS.sat}
          big={false}
          leftType="A"
          rightType="B"
          qualifier={q}
          setQualifier={setQualifier}
          onReset={() => setQualifier({ satLow: DEFAULT_QUALIFIER.satLow, satHigh: DEFAULT_QUALIFIER.satHigh, satSoftness: DEFAULT_QUALIFIER.satSoftness })}
          tell={tell}
          range={{
            min: 0,
            max: 100, // display % (store 0..1)
            get: (qq) => ({ lo: qq.satLow * 100, hi: qq.satHigh * 100 }),
            set: (lo, hi) => ({ satLow: lo / 100, satHigh: hi / 100 }),
          }}
          fields={[
            { label: 'Low', get: (qq) => qq.satLow * 100, set: (_qq, n) => ({ satLow: Math.min(100, Math.max(0, n)) / 100 }), fmt: (v) => v.toFixed(1) },
            { label: 'High', get: (qq) => qq.satHigh * 100, set: (_qq, n) => ({ satHigh: Math.min(100, Math.max(0, n)) / 100 }), fmt: (v) => v.toFixed(1) },
            { label: 'Soft', get: (qq) => qq.satSoftness * 100, set: (_qq, n) => ({ satSoftness: Math.min(100, Math.max(0, n)) / 100 }), fmt: (v) => v.toFixed(1) },
          ]}
        />
        <Section
          title="Luminance"
          testid="shell-color-lum"
          gradient={GRADIENTS.lum}
          big={false}
          leftType="A"
          rightType="B"
          qualifier={q}
          setQualifier={setQualifier}
          onReset={() => setQualifier({ lumaLow: DEFAULT_QUALIFIER.lumaLow, lumaHigh: DEFAULT_QUALIFIER.lumaHigh, lumaSoftness: DEFAULT_QUALIFIER.lumaSoftness })}
          tell={tell}
          range={{
            min: 0,
            max: 100, // display % (store 0..1)
            get: (qq) => ({ lo: qq.lumaLow * 100, hi: qq.lumaHigh * 100 }),
            set: (lo, hi) => ({ lumaLow: lo / 100, lumaHigh: hi / 100 }),
          }}
          fields={[
            { label: 'Low', get: (qq) => qq.lumaLow * 100, set: (_qq, n) => ({ lumaLow: Math.min(100, Math.max(0, n)) / 100 }), fmt: (v) => v.toFixed(1) },
            { label: 'High', get: (qq) => qq.lumaHigh * 100, set: (_qq, n) => ({ lumaHigh: Math.min(100, Math.max(0, n)) / 100 }), fmt: (v) => v.toFixed(1) },
            { label: 'Soft', get: (qq) => qq.lumaSoftness * 100, set: (_qq, n) => ({ lumaSoftness: Math.min(100, Math.max(0, n)) / 100 }), fmt: (v) => v.toFixed(1) },
          ]}
        />

        {/* strength — spec 08 §8.1 (0..1; displayed 0..100) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-[#a0a0a0]">Strength</span>
            <span data-testid="shell-color-qualifier-strength" className="mono text-[11px] text-tprimary">
              {(q.strength * 100).toFixed(0)}%
            </span>
          </div>
          <MicroSlider
            ariaLabel="Qualifier strength"
            value={q.strength * 100}
            min={0}
            max={100}
            step={1}
            valueText={`${(q.strength * 100).toFixed(0)}%`}
            variant="finesse"
            onFirstTouch={tell}
            onChange={(v) => setQualifier({ strength: v / 100 })}
          />
        </div>
      </div>

      {/* the spec 08 §17.E secondary correction (applied INSIDE the matte by
          applyQualifierCorrection — W4c composes it in the viewer) */}
      <div className="flex flex-col gap-3.5 border-t border-hairline bg-panel px-4 py-4">
        <h3 className="mb-0.5 text-[14px] font-semibold text-tprimary">Secondary Correction</h3>
        <CorrSlider label="Exposure" value={q.exposure} min={-2} max={2} step={0.05} fmt={(v) => v.toFixed(2)} onChange={(v) => setQualifier({ exposure: v })} tell={tell} />
        <CorrSlider label="Saturation" value={q.saturation} min={-100} max={100} step={1} fmt={(v) => v.toFixed(1)} onChange={(v) => setQualifier({ saturation: v })} tell={tell} />
        <CorrSlider label="Temperature" value={q.temperature} min={-100} max={100} step={1} fmt={(v) => v.toFixed(1)} onChange={(v) => setQualifier({ temperature: v })} tell={tell} />
        <CorrSlider label="Tint" value={q.tint} min={-100} max={100} step={1} fmt={(v) => v.toFixed(1)} onChange={(v) => setQualifier({ tint: v })} tell={tell} />
      </div>
    </div>
  );
}

function CorrSlider({ label, value, min, max, step, fmt, onChange, tell }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
  onChange: (v: number) => void;
  tell: () => void;
}) {
  return (
    <div data-testid={`shell-color-qualifier-corr-${label.toLowerCase()}`} className="flex flex-1 flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-[#a0a0a0]">{label}</span>
        <span className="mono text-[11px] text-tprimary">{fmt(value)}</span>
      </div>
      <MicroSlider
        ariaLabel={`Qualifier ${label}`}
        value={value}
        min={min}
        max={max}
        step={step}
        valueText={fmt(value)}
        variant="finesse"
        onFirstTouch={tell}
        onChange={onChange}
      />
    </div>
  );
}

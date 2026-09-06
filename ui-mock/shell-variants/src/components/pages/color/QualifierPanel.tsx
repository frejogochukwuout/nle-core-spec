/* QualifierPanel — rail tab 2 (R19-B4). Reference-grade rebuild of
   qualifier_ui.html (color-cluster.md §2) as an EMBEDDED panel (no floating
   window chrome — user directive: dialogs → embedded panels). Structure:
   eyedropper toolbar row (pick / − / + / _ / feather / invert — selectable
   display state), then the three HSL sections (red-dot header + reset),
   each with the 24px RANGE WIDGET (gradient track + 65% black masks + the
   two Type-A/Type-B triangle handles with softness-zone render) and 4
   numeric fields; then Matte Finesse: the 14 fields as compact 2px-track
   sliders + the Morph Operation pseudo-select ("Shrink").
   Handle drags and numeric edits are TWO-WAY local display state (masks and
   fields derive from the same lo/hi pair); first interaction per mount
   fires ONE honest toast (spec 08 §4 render round). */

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Contrast, Pipette, RotateCcw, Feather } from 'lucide-react';
import { MicroSlider, NumCell } from './controls';
import { useGradingToast } from './useHonestToast';

/* ---------- tools (ref §2.3) ---------- */

type ToolId = 'pick' | 'pickMinus' | 'pickPlus' | 'pickSoft' | 'feather' | 'invert';

const TOOLS: { id: ToolId; label: string; badge?: string; lucide: 'pipette' | 'feather' | 'contrast' }[] = [
  { id: 'pick', label: 'Eyedropper', lucide: 'pipette' },
  { id: 'pickMinus', label: 'Eyedropper subtract', badge: '−', lucide: 'pipette' },
  { id: 'pickPlus', label: 'Eyedropper add', badge: '+', lucide: 'pipette' },
  { id: 'pickSoft', label: 'Eyedropper narrow softness', badge: '_', lucide: 'pipette' },
  { id: 'feather', label: 'Feather', lucide: 'feather' },
  { id: 'invert', label: 'Invert qualifier', lucide: 'contrast' },
];

/* ---------- HSL sections (ref §2.4) ---------- */

interface SectionVals {
  lo: number;
  hi: number;
  softA: number;
  softB: number;
}

/* reference values (ref §2.4): the FIELD defaults (87.6/14.4, 2.2/14.2,
   61.1/71.4) are the source of truth — lo/hi derive from them so fields ↔
   handles are ONE two-way state (the reference's mask geometry 76/95 vs
   87.6/14.4 is internally inconsistent; the task pins the field formats). */
const DEFAULT_HUE: SectionVals = { lo: 80.4, hi: 94.8, softA: 3.5, softB: 50 };
const DEFAULT_SAT: SectionVals = { lo: 2.2, hi: 14.2, softA: 1.7, softB: 1.0 };
const DEFAULT_LUM: SectionVals = { lo: 61.1, hi: 71.4, softA: 2.6, softB: 2.6 };

const GRADIENTS = {
  hue: 'linear-gradient(to right, #f0f 0%, #f00 16.6%, #ff0 33.3%, #0f0 50%, #0ff 66.6%, #00f 83.3%, #f0f 100%)',
  sat: 'linear-gradient(to right, #666, #2a52ff)',
  lum: 'linear-gradient(to right, #000, #fff)',
};

/* ---------- the range widget ---------- */

/** Type A "|>" — triangle fans RIGHT from a left-side vertical line. */
function HandleA() {
  return (
    <svg viewBox="0 0 12 24" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
      <line x1="1.5" y1="0" x2="1.5" y2="24" stroke="#e0e0e0" strokeWidth="1.5" />
      <polygon points="1.5,22.5 10.5,22.5 1.5,13.5" fill="#e0e0e0" stroke="#000" strokeWidth="1" />
    </svg>
  );
}

/** Type B "<|" — triangle fans LEFT from a right-side vertical line. */
function HandleB() {
  return (
    <svg viewBox="0 0 12 24" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
      <line x1="10.5" y1="0" x2="10.5" y2="24" stroke="#e0e0e0" strokeWidth="1.5" />
      <polygon points="1.5,22.5 10.5,22.5 10.5,13.5" fill="#e0e0e0" stroke="#000" strokeWidth="1" />
    </svg>
  );
}

function RangeWidget({
  testid,
  section,
  gradient,
  vals,
  onChange,
  tell,
  big,
  leftType,
  rightType,
}: {
  testid: string;
  section: string;
  gradient: string;
  vals: SectionVals;
  onChange: (patch: Partial<SectionVals>) => void;
  tell: () => void;
  /** hue bar is 24px tall w/ 12px handles; sat/lum bars are smaller (16px/10px) */
  big: boolean;
  leftType: 'A' | 'B';
  rightType: 'A' | 'B';
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const height = big ? 24 : 16;
  const handleW = big ? 12 : 10;

  const setPos = (which: 'lo' | 'hi', clientX: number) => {
    const box = trackRef.current?.getBoundingClientRect();
    if (!box) return;
    const t = Math.min(100, Math.max(0, ((clientX - box.left) / box.width) * 100));
    if (which === 'lo') onChange({ lo: Math.min(t, vals.hi - 2) });
    else onChange({ hi: Math.max(t, vals.lo + 2) });
  };

  const handle = (which: 'lo' | 'hi', type: 'A' | 'B') => {
    const pos = which === 'lo' ? vals.lo : vals.hi;
    return (
      <div
        key={which}
        role="slider"
        tabIndex={0}
        aria-label={`${section} range ${which === 'lo' ? 'low' : 'high'}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        className="absolute top-0 z-10 h-full cursor-ew-resize touch-none"
        style={{ left: `${pos}%`, width: handleW, transform: 'translateX(-50%)' }}
        onPointerDown={(e: ReactPointerEvent<HTMLDivElement>) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          tell();
          setPos(which, e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons !== 1) return;
          setPos(which, e.clientX);
        }}
        onKeyDown={(e) => {
          const s = e.shiftKey ? 5 : 1;
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            tell();
            const p = Math.min(100, pos + s);
            onChange(which === 'lo' ? { lo: Math.min(p, vals.hi - 2) } : { hi: Math.max(p, vals.lo + 2) });
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            tell();
            const p = Math.max(0, pos - s);
            onChange(which === 'lo' ? { lo: Math.min(p, vals.hi - 2) } : { hi: Math.max(p, vals.lo + 2) });
          } else if (e.key === 'Home') {
            e.preventDefault();
            tell();
            onChange(which === 'lo' ? { lo: 0 } : { hi: Math.max(0, vals.lo + 2) });
          } else if (e.key === 'End') {
            e.preventDefault();
            tell();
            onChange(which === 'lo' ? { lo: Math.min(100, vals.hi - 2) } : { hi: 100 });
          }
        }}
      >
        {type === 'A' ? <HandleA /> : <HandleB />}
      </div>
    );
  };

  return (
    <div
      ref={trackRef}
      data-testid={testid}
      className="relative w-full overflow-hidden rounded-[4px] border border-black bg-black"
      style={{ height }}
    >
      <div aria-hidden className="absolute inset-0 rounded-[3px]" style={{ background: gradient }} />
      {/* softness zones — out-of-range masks, 65% black (ref §2.4) */}
      <div aria-hidden className="absolute inset-y-0 left-0 bg-black/65" style={{ width: `${vals.lo}%` }} />
      <div aria-hidden className="absolute inset-y-0 bg-black/65" style={{ left: `${vals.hi}%`, right: 0 }} />
      {/* center line — range midpoint marker */}
      <div aria-hidden className="absolute inset-y-0 w-px bg-white/25" style={{ left: `${(vals.lo + vals.hi) / 2}%` }} />
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
  vals,
  fields,
  big,
  leftType,
  rightType,
  onChange,
  onReset,
  tell,
}: {
  title: string;
  testid: string;
  gradient: string;
  vals: SectionVals;
  fields: { key: 'a' | 'b' | 'c' | 'd'; label: string; get: (v: SectionVals) => number; set: (v: SectionVals, n: number) => Partial<SectionVals> }[];
  big: boolean;
  leftType: 'A' | 'B';
  rightType: 'A' | 'B';
  onChange: (patch: Partial<SectionVals>) => void;
  onReset: () => void;
  tell: () => void;
}) {
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
        vals={vals}
        big={big}
        leftType={leftType}
        rightType={rightType}
        onChange={onChange}
        tell={tell}
      />
      <div className="flex flex-wrap justify-end gap-x-3.5 gap-y-1">
        {fields.map((f) => (
          <label key={f.label} className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#959595]">{f.label}</span>
            <NumCell
              ariaLabel={`${title} ${f.label}`}
              value={f.get(vals)}
              width={42}
              className="text-left"
              format={(v) => v.toFixed(1)}
              onFirstTouch={tell}
              onCommit={(n) => onChange(f.set(vals, Math.min(100, Math.max(0, n))))}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

/* ---------- Matte Finesse (ref §2.5) ---------- */

interface MatteVals {
  preFilter: number;
  cleanBlack: number;
  blackClip: number;
  cleanWhite: number;
  whiteClip: number;
  blurRadius: number;
  inOutRatio: number;
  morphRadius: number;
  shadow: number;
  midtone: number;
  highlight: number;
  denoise: number;
  postFilter: number;
}

type MatteKey = keyof MatteVals;

const MATTE_FIELDS: Record<MatteKey, { label: string; min: number; max: number }> = {
  preFilter: { label: 'Pre-Filter', min: 0, max: 1 },
  cleanBlack: { label: 'Clean Black', min: 0, max: 100 },
  blackClip: { label: 'Black Clip', min: 0, max: 100 },
  cleanWhite: { label: 'Clean White', min: 0, max: 100 },
  whiteClip: { label: 'White Clip', min: 0, max: 100 },
  blurRadius: { label: 'Blur Radius', min: 0, max: 100 },
  inOutRatio: { label: 'In/Out Ratio', min: 0, max: 100 },
  morphRadius: { label: 'Morph Radius', min: 0, max: 100 },
  shadow: { label: 'Shadow', min: 0, max: 100 },
  midtone: { label: 'Midtone', min: 0, max: 100 },
  highlight: { label: 'Highlight', min: 0, max: 100 },
  denoise: { label: 'Denoise', min: 0, max: 100 },
  postFilter: { label: 'Post-Filter', min: 0, max: 1 },
};

const DEFAULT_MATTE: MatteVals = {
  preFilter: 0.8,
  cleanBlack: 0,
  blackClip: 0,
  cleanWhite: 0,
  whiteClip: 100,
  blurRadius: 0,
  inOutRatio: 0,
  morphRadius: 0,
  shadow: 100,
  midtone: 100,
  highlight: 100,
  denoise: 0,
  postFilter: 0,
};

function MatteCol({ mk, value, onChange, tell }: { mk: MatteKey; value: number; onChange: (v: number) => void; tell: () => void }) {
  const def = MATTE_FIELDS[mk];
  const kebab = mk.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  return (
    <div data-testid={`shell-color-matte-${kebab}`} className="flex flex-1 flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-[#a0a0a0]">{def.label}</span>
        <span className="mono text-[11px] text-tprimary">{value.toFixed(1)}</span>
      </div>
      <MicroSlider
        ariaLabel={`Matte ${def.label}`}
        value={value}
        min={def.min}
        max={def.max}
        step={def.max <= 1 ? 0.05 : 1}
        valueText={value.toFixed(1)}
        variant="finesse"
        onFirstTouch={tell}
        onChange={onChange}
      />
    </div>
  );
}

/* ---------- the panel ---------- */

export function QualifierPanel() {
  const tell = useGradingToast();
  const [tool, setTool] = useState<ToolId>('pick');
  const [hue, setHue] = useState<SectionVals>({ ...DEFAULT_HUE });
  const [sat, setSat] = useState<SectionVals>({ ...DEFAULT_SAT });
  const [lum, setLum] = useState<SectionVals>({ ...DEFAULT_LUM });
  const [matte, setMatte] = useState<MatteVals>({ ...DEFAULT_MATTE });
  const [morphOp] = useState('Shrink');

  const setMatteVal = (k: MatteKey, v: number) => setMatte((m) => ({ ...m, [k]: v }));

  return (
    <div data-testid="shell-color-qualifier" className="flex flex-col">
      {/* embedded header — the reference's floating window becomes a section
          title + reset (window chrome dropped per the embedded-panel directive) */}
      <div className="flex h-[32px] shrink-0 items-center justify-between border-b border-hairline bg-shell px-3">
        <span className="text-[13px] font-semibold text-tprimary">Qualifier — HSL</span>
        <button
          type="button"
          aria-label="Reset qualifier"
          data-tip="Reset"
          className="icon-btn"
          onClick={() => {
            setTool('pick');
            setHue({ ...DEFAULT_HUE });
            setSat({ ...DEFAULT_SAT });
            setLum({ ...DEFAULT_LUM });
            setMatte({ ...DEFAULT_MATTE });
          }}
        >
          <RotateCcw size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* eyedropper toolbar row (ref §2.3) — selectable display state */}
      <div className="flex h-[38px] shrink-0 items-center gap-3 border-b border-hairline bg-raised px-3">
        {TOOLS.map((t) => {
          const active = tool === t.id;
          const Icon = t.lucide === 'pipette' ? Pipette : t.lucide === 'feather' ? Feather : Contrast;
          return (
            <button
              key={t.id}
              type="button"
              aria-label={t.label}
              aria-pressed={active}
              className={`icon-btn relative ${active ? 'toggled' : ''}`}
              onClick={() => {
                setTool(t.id);
                tell();
              }}
            >
              <Icon size={16} strokeWidth={1.5} />
              {t.badge && <span aria-hidden className="absolute bottom-[2px] right-[2px] text-[10px] font-bold leading-none">{t.badge}</span>}
            </button>
          );
        })}
      </div>

      {/* HSL sections */}
      <div className="flex flex-col gap-6 px-5 py-5" style={{ background: '#232323' }}>
        <Section
          title="Hue"
          testid="shell-color-hue"
          gradient={GRADIENTS.hue}
          vals={hue}
          big
          leftType="B"
          rightType="A"
          onChange={(p) => setHue((v) => ({ ...v, ...p }))}
          onReset={() => setHue({ ...DEFAULT_HUE })}
          tell={tell}
          fields={[
            { key: 'a', label: 'Center', get: (v) => (v.lo + v.hi) / 2, set: (v, n) => ({ lo: Math.max(0, n - (v.hi - v.lo) / 2), hi: Math.min(100, n + (v.hi - v.lo) / 2) }) },
            { key: 'b', label: 'Width', get: (v) => v.hi - v.lo, set: (v, n) => ({ lo: Math.max(0, (v.lo + v.hi) / 2 - n / 2), hi: Math.min(100, (v.lo + v.hi) / 2 + n / 2) }) },
            { key: 'c', label: 'Soft', get: (v) => v.softA, set: (_v, n) => ({ softA: n }) },
            { key: 'd', label: 'Sym', get: (v) => v.softB, set: (_v, n) => ({ softB: n }) },
          ]}
        />
        <Section
          title="Saturation"
          testid="shell-color-sat"
          gradient={GRADIENTS.sat}
          vals={sat}
          big={false}
          leftType="A"
          rightType="B"
          onChange={(p) => setSat((v) => ({ ...v, ...p }))}
          onReset={() => setSat({ ...DEFAULT_SAT })}
          tell={tell}
          fields={[
            { key: 'a', label: 'Low', get: (v) => v.lo, set: (_v, n) => ({ lo: n }) },
            { key: 'b', label: 'High', get: (v) => v.hi, set: (_v, n) => ({ hi: n }) },
            { key: 'c', label: 'L. Soft', get: (v) => v.softA, set: (_v, n) => ({ softA: n }) },
            { key: 'd', label: 'H. Soft', get: (v) => v.softB, set: (_v, n) => ({ softB: n }) },
          ]}
        />
        <Section
          title="Luminance"
          testid="shell-color-lum"
          gradient={GRADIENTS.lum}
          vals={lum}
          big={false}
          leftType="A"
          rightType="B"
          onChange={(p) => setLum((v) => ({ ...v, ...p }))}
          onReset={() => setLum({ ...DEFAULT_LUM })}
          tell={tell}
          fields={[
            { key: 'a', label: 'Low', get: (v) => v.lo, set: (_v, n) => ({ lo: n }) },
            { key: 'b', label: 'High', get: (v) => v.hi, set: (_v, n) => ({ hi: n }) },
            { key: 'c', label: 'L. Soft', get: (v) => v.softA, set: (_v, n) => ({ softA: n }) },
            { key: 'd', label: 'H. Soft', get: (v) => v.softB, set: (_v, n) => ({ softB: n }) },
          ]}
        />
      </div>

      {/* Matte Finesse — 14 fields (13 sliders + the Morph pseudo-select) */}
      <div className="flex flex-col gap-3.5 border-t border-hairline bg-panel px-4 py-4">
        <h3 className="mb-0.5 text-[14px] font-semibold text-tprimary">Matte Finesse</h3>

        <MatteCol mk="preFilter" value={matte.preFilter} onChange={(v) => setMatteVal('preFilter', v)} tell={tell} />

        <div className="flex gap-4">
          <MatteCol mk="cleanBlack" value={matte.cleanBlack} onChange={(v) => setMatteVal('cleanBlack', v)} tell={tell} />
          <MatteCol mk="blackClip" value={matte.blackClip} onChange={(v) => setMatteVal('blackClip', v)} tell={tell} />
        </div>
        <div className="flex gap-4">
          <MatteCol mk="cleanWhite" value={matte.cleanWhite} onChange={(v) => setMatteVal('cleanWhite', v)} tell={tell} />
          <MatteCol mk="whiteClip" value={matte.whiteClip} onChange={(v) => setMatteVal('whiteClip', v)} tell={tell} />
        </div>
        <div className="flex gap-4">
          <MatteCol mk="blurRadius" value={matte.blurRadius} onChange={(v) => setMatteVal('blurRadius', v)} tell={tell} />
          <MatteCol mk="inOutRatio" value={matte.inOutRatio} onChange={(v) => setMatteVal('inOutRatio', v)} tell={tell} />
        </div>
        <div className="flex items-start gap-4">
          {/* Morph Operation — pseudo-select (display state; click = honest
              toast — the real menu lands with the render round) */}
          <div data-testid="shell-color-matte-morph-operation" className="mt-[2px] flex flex-1 flex-col gap-1">
            <span className="text-[11px] text-[#a0a0a0]">Morph Operation</span>
            <button
              type="button"
              aria-label="Morph operation"
              aria-haspopup="listbox"
              className="flex w-full items-center justify-between rounded-[2px] border border-[#151515] bg-[#1a1a1a] px-2 py-1 text-left text-[11px] text-tprimary"
              onClick={tell}
            >
              {morphOp}
              <svg width="8" height="5" viewBox="0 0 8 5" aria-hidden>
                <path d="M0 0L4 4L8 0" fill="none" stroke="#959595" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
          <MatteCol mk="shadow" value={matte.shadow} onChange={(v) => setMatteVal('shadow', v)} tell={tell} />
        </div>
        <div className="flex gap-4">
          <MatteCol mk="morphRadius" value={matte.morphRadius} onChange={(v) => setMatteVal('morphRadius', v)} tell={tell} />
          <MatteCol mk="midtone" value={matte.midtone} onChange={(v) => setMatteVal('midtone', v)} tell={tell} />
        </div>
        <div className="flex gap-4">
          <MatteCol mk="denoise" value={matte.denoise} onChange={(v) => setMatteVal('denoise', v)} tell={tell} />
          <MatteCol mk="highlight" value={matte.highlight} onChange={(v) => setMatteVal('highlight', v)} tell={tell} />
        </div>

        <div className="-mt-1">
          <MatteCol mk="postFilter" value={matte.postFilter} onChange={(v) => setMatteVal('postFilter', v)} tell={tell} />
        </div>
      </div>
    </div>
  );
}

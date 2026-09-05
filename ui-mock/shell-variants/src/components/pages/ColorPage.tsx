/* ColorPage — spec 18 §4.8: Color enters a color-focus mode that swaps the
   inspector for a simplified single-column grading stack (spec 08's panels,
   heavily reduced). Timeline stays live below. Interactive display state:
   sliders/LUT are LOCAL state (real readout behavior, §11 floor) + one
   honest toast per mount on first touch — no fake engine writes (spec 08
   §4 render round). Wheels stay honest role="img" statics. */

import { useState } from 'react';
import { Contrast, Spline, Pipette, Circle } from 'lucide-react';
import { useUi } from '../../state/useUiStore';

function Wheel({ label, tint }: { label: string; tint: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* decorative mock dial — no interaction, so role="slider" was a lie
         (an AT user would expect arrow keys); honest role=img with a name
         (R13 fix). Real shell: draggable 2D lift/gamma/gain/offset wheels. */}
      <div
        className="relative h-[78px] w-[78px] rounded-full border border-strong"
        style={{ background: `radial-gradient(circle at 42% 38%, ${tint} 0%, var(--bg-inset) 72%)` }}
        role="img"
        aria-label={`${label} color wheel (static mock)`}
      >
        <div className="absolute left-1/2 top-1/2 h-[4px] w-[4px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-tprimary" />
        <div className="absolute left-1/2 top-1/2 h-[1.5px] w-[24px] -translate-x-1/2 -translate-y-1/2 bg-tfaint" />
        <div className="absolute left-1/2 top-1/2 h-[24px] w-[1.5px] -translate-x-1/2 -translate-y-1/2 bg-tfaint" />
        <div className="absolute left-[62%] top-[40%] h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 bg-accent" />
      </div>
      <span className="text-[11px] uppercase tracking-wide text-tmuted">{label}</span>
    </div>
  );
}

function Slider({ label, value, unit = '', onChange }: { label: string; value: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[72px] shrink-0 text-[11px] text-tmuted">{label}</span>
      <input type="range" min={-100} max={100} value={value} className="min-w-0 flex-1" aria-label={label} onChange={(e) => onChange(+e.target.value)} />
      <span className="mono w-[46px] shrink-0 text-right text-[11px] text-tprimary">{value > 0 ? '+' : ''}{value}{unit}</span>
    </div>
  );
}

export function ColorPage() {
  const pushToast = useUi((s) => s.pushToast);

  /* grading params = display state (R14 no-op fix): controlled LOCAL values
     so the readout follows the control — honest local behavior without
     pretending the engine re-grades. First interaction per mount fires ONE
     toast saying exactly that (spec 08 §4 render round). */
  const [params, setParams] = useState({ contrast: 12, pivot: 35, saturation: -8 });
  const [qualifierHue, setQualifierHue] = useState(40);
  const [lut, setLut] = useState('None');
  const [toldParams, setToldParams] = useState(false);
  const [toldLut, setToldLut] = useState(false);
  const tellParamsOnce = () => {
    if (toldParams) return;
    setToldParams(true);
    pushToast({ kind: 'info', title: 'Color params', detail: 'grading stack is static in the mock — values are display state (spec 08 §4 render round)' });
  };

  return (
    <div data-testid="shell-color" className="flex h-full w-full min-h-0 flex-col bg-panel">
      <div className="flex items-center gap-2 border-b border-hairline px-3" style={{ height: 28, minHeight: 28 }}>
        <span className="text-[12px] font-semibold text-tprimary">Color</span>
        <span className="text-[11px] text-tmuted">single-column simplified stack (spec 18 §4.8)</span>
      </div>

      <div className="scroll-y min-h-0 flex-1">
        {/* wheels — 2×2 grid so nothing clips at 340px rail width */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-4 border-b border-hairline px-3 py-4">
          <Wheel label="Lift" tint="rgba(70,110,200,0.35)" />
          <Wheel label="Gamma" tint="rgba(120,200,150,0.30)" />
          <Wheel label="Gain" tint="rgba(230,180,75,0.32)" />
          <Wheel label="Offset" tint="rgba(200,120,220,0.30)" />
          {/* LUT readout under the wheels (R14): the select below is display
              state — this row shows which LUT the mock "applies" */}
          <span className="col-span-2 text-center text-[11px] text-tmuted" data-testid="shell-color-lut-readout">
            LUT: {lut}
          </span>
        </div>

        {/* primaries */}
        <div className="flex flex-col gap-2 border-b border-hairline px-3 py-3">
          <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-tmuted">
            <Contrast size={11} /> Primaries
          </div>
          <Slider label="Contrast" value={params.contrast} onChange={(v) => { setParams((p) => ({ ...p, contrast: v })); tellParamsOnce(); }} />
          <Slider label="Pivot" value={params.pivot} onChange={(v) => { setParams((p) => ({ ...p, pivot: v })); tellParamsOnce(); }} />
          <Slider label="Saturation" value={params.saturation} onChange={(v) => { setParams((p) => ({ ...p, saturation: v })); tellParamsOnce(); }} />
        </div>

        {/* curves mini */}
        <div className="flex items-center gap-3 border-b border-hairline px-3 py-3">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-tmuted">
              <Spline size={11} /> Curves
            </span>
            <svg width="180" height="100" className="rounded-[var(--radius)] border border-soft bg-inset" aria-label="Curves editor">
              <line x1="0" y1="50" x2="180" y2="50" stroke="var(--border-soft)" strokeWidth="0.5" />
              <line x1="90" y1="0" x2="90" y2="100" stroke="var(--border-soft)" strokeWidth="0.5" />
              <path d="M0 100 C 50 85, 70 55, 90 50 C 110 45, 135 25, 180 0" fill="none" stroke="var(--accent-selection)" strokeWidth="1.5" />
              <circle cx="90" cy="50" r="3" fill="var(--accent-focus)" />
            </svg>
          </div>
          {/* scopes */}
          <div className="ml-auto flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-tmuted">Scopes</span>
            <svg width="120" height="62" className="rounded-[var(--radius)] border border-soft bg-inset" aria-label="Waveform scope">
              {Array.from({ length: 24 }).map((_, i) => (
                <rect key={i} x={i * 5} y={62 - (10 + ((i * 37) % 40))} width="3" height={10 + ((i * 37) % 40)} fill="var(--waveform)" opacity="0.7" />
              ))}
            </svg>
            <svg width="120" height="40" className="rounded-[var(--radius)] border border-soft bg-inset" aria-label="Histogram scope">
              <path d="M0 40 L0 20 Q 20 6 40 18 T 80 30 T 120 12 L120 40 Z" fill="var(--accent-focus)" opacity="0.35" />
            </svg>
          </div>
        </div>

        {/* LUT + qualifier */}
        <div className="flex flex-col gap-2 px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="w-[72px] shrink-0 text-[11px] text-tmuted">LUT</span>
            {/* display state (R14): the choice updates the readout under the
                wheels; the preview itself lands with the render round (spec 08) */}
            <select
              className="field flex-1 cursor-pointer"
              aria-label="LUT select"
              value={lut}
              onChange={(e) => {
                setLut(e.target.value);
                if (!toldLut) {
                  setToldLut(true);
                  pushToast({ kind: 'info', title: 'Color params', detail: 'LUT preview lands with the render round (spec 08)' });
                }
              }}
            >
              <option>None</option>
              <option>Kodak 2383</option>
              <option>Rec709 → sRGB</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex w-[72px] shrink-0 items-center gap-1 text-[11px] text-tmuted"><Pipette size={11} /> HSL</span>
            <input type="range" min={0} max={100} value={qualifierHue} className="flex-1" aria-label="Qualifier hue" onChange={(e) => { setQualifierHue(+e.target.value); tellParamsOnce(); }} />
            <button
              className="icon-btn !h-[20px]"
              data-tip="Power window"
              aria-label="Power window"
              /* honest mock: v2 grading surface — answer, don't stay silent */
              onClick={() => pushToast({ kind: 'info', title: 'Power window', detail: 'windowing is a v2 grading surface (spec 08)' })}
            >
              <Circle size={13} strokeWidth={1.6} />
            </button>
          </div>
          <p className="pt-1 text-[11px] leading-snug text-tmuted">
            Node-graph layout deferred — single-column per spec 18 §15.3 (seal-round question).
          </p>
        </div>
      </div>
    </div>
  );
}

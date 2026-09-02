/* ColorPage — spec 18 §4.8: Color enters a color-focus mode that swaps the
   inspector for a simplified single-column grading stack (spec 08's panels,
   heavily reduced). Timeline stays live below. Static mock. */

import { Contrast, Spline, Pipette, Circle } from 'lucide-react';

function Wheel({ label, tint }: { label: string; tint: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="relative h-[78px] w-[78px] rounded-full border border-strong"
        style={{ background: `radial-gradient(circle at 42% 38%, ${tint} 0%, var(--bg-inset) 72%)` }}
        role="slider"
        aria-label={`${label} color wheel`}
        aria-valuetext="centered"
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

function Slider({ label, value, unit = '' }: { label: string; value: number; unit?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[72px] shrink-0 text-[11px] text-tmuted">{label}</span>
      <input type="range" min={-100} max={100} defaultValue={value} className="min-w-0 flex-1" aria-label={label} />
      <span className="mono w-[46px] shrink-0 text-right text-[10.5px] text-tprimary">{value > 0 ? '+' : ''}{value}{unit}</span>
    </div>
  );
}

export function ColorPage() {
  return (
    <div data-testid="shell-color" className="flex h-full min-h-0 flex-col bg-panel">
      <div className="flex items-center gap-2 border-b border-hairline px-3" style={{ height: 28, minHeight: 28 }}>
        <span className="text-[12px] font-semibold text-tprimary">Color</span>
        <span className="text-[11px] text-tfaint">single-column simplified stack (spec 18 §4.8)</span>
      </div>

      <div className="scroll-y min-h-0 flex-1">
        {/* wheels — 2×2 grid so nothing clips at 340px rail width */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-4 border-b border-hairline px-3 py-4">
          <Wheel label="Lift" tint="rgba(70,110,200,0.35)" />
          <Wheel label="Gamma" tint="rgba(120,200,150,0.30)" />
          <Wheel label="Gain" tint="rgba(230,180,75,0.32)" />
          <Wheel label="Offset" tint="rgba(200,120,220,0.30)" />
        </div>

        {/* primaries */}
        <div className="flex flex-col gap-2 border-b border-hairline px-3 py-3">
          <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-tmuted">
            <Contrast size={11} /> Primaries
          </div>
          <Slider label="Contrast" value={12} />
          <Slider label="Pivot" value={35} />
          <Slider label="Saturation" value={-8} />
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
            <select className="field flex-1 cursor-pointer" aria-label="LUT select">
              <option>None</option>
              <option>Kodak 2383</option>
              <option>Rec709 → sRGB</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex w-[72px] shrink-0 items-center gap-1 text-[11px] text-tmuted"><Pipette size={11} /> HSL</span>
            <input type="range" min={0} max={100} defaultValue={40} className="flex-1" aria-label="Qualifier hue" />
            <button className="icon-btn !h-[20px]" data-tip="Power window" aria-label="Power window">
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

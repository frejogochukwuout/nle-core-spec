/* ColorScopesDock — the under-viewer scopes dock (R19-B4). Reference-grade
   rebuild of color_grading_scopes.html (color-cluster.md §4) as an EMBEDDED
   dock (floating window → docked panel per the user directive): 36px
   "Scopes" header (label + collapse chevron + settings icon → honest toast),
   2×2 quadrant grid with 2px black gaps — Parade | Waveform / Vectorscope |
   Histogram. Each quadrant: 32px RIGHT-aligned header (label + mode chevron
   + settings icon) over a canvas that draws its deterministic seeded trace
   (scopeTraces.ts) at live size × DPR, redrawn via ResizeObserver.
   Pure display: canvases are role="img" with per-scope aria-labels, no fake
   interactivity (hover crosshair = R19-TODO render round). Collapse is REAL
   local state (aria-expanded + hidden grid). */

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { drawHistogram, drawParade, drawVectorscope, drawWaveform } from './scopeTraces';
import { useHonestToast } from './useHonestToast';

type ScopeKind = 'parade' | 'waveform' | 'vectorscope' | 'histogram';

const SCOPES: { kind: ScopeKind; label: string; aria: string; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void }[] = [
  { kind: 'parade', label: 'Parade', aria: 'RGB parade scope', draw: drawParade },
  { kind: 'waveform', label: 'Waveform', aria: 'Waveform scope', draw: drawWaveform },
  { kind: 'vectorscope', label: 'Vectorscope', aria: 'Vectorscope scope', draw: drawVectorscope },
  { kind: 'histogram', label: 'Histogram', aria: 'Histogram scope', draw: drawHistogram },
];

function ScopeCanvas({ draw, ariaLabel }: { draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; ariaLabel: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const render = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return; // jsdom: no 2d context — the a11y contract still holds
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      draw(ctx, rect.width, rect.height);
    };

    render();
    const ro = new ResizeObserver(render);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [draw]);

  return (
    <div ref={wrapRef} className="relative min-h-0 flex-1">
      <canvas ref={canvasRef} role="img" aria-label={ariaLabel} className="absolute inset-0 block h-full w-full" />
    </div>
  );
}

export function ColorScopesDock() {
  /* honest one-shot toast for the mock-only scope header controls (layout
     settings + per-scope mode menus) — never a silent no-op */
  const tell = useHonestToast('Scopes', 'scope traces are seeded display data — live scopes land with the render round (spec 08 §4)');
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div data-testid="shell-color-scopes" className="flex h-full min-h-0 w-full flex-col">
      {/* 36px dock header (ref §4.2): label + collapse chevron + settings */}
      <div className="flex h-[36px] shrink-0 items-center justify-between border-b border-hairline bg-shell px-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={collapsed ? 'Expand scopes' : 'Collapse scopes'}
            aria-expanded={!collapsed}
            aria-controls="shell-color-scopes-grid"
            data-testid="shell-color-scopes-collapse"
            className="icon-btn"
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
          <span className="px-1 text-[14px] font-medium text-tprimary">Scopes</span>
        </div>
        <button
          type="button"
          aria-label="Scopes settings"
          data-tip="Scope settings"
          className="icon-btn"
          onClick={tell}
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {/* 2×2 quadrant grid — 2px black gaps (ref §4.2) */}
      {!collapsed && (
        <div id="shell-color-scopes-grid" data-testid="shell-color-scopes-grid" className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-[2px]" style={{ background: '#000' }}>
          {SCOPES.map((s) => (
            <div key={s.kind} data-testid={`shell-color-scope-${s.kind}`} className="flex min-h-0 min-w-0 flex-col" style={{ background: 'var(--scope-bg)' }}>
              {/* 32px right-aligned per-scope header: label + chevron + settings */}
              <div className="flex h-[32px] shrink-0 items-center justify-end gap-1 border-b border-[#1a1a1a] px-3 text-tmuted">
                <button
                  type="button"
                  aria-label={`${s.label} mode`}
                  className="flex items-center gap-1 rounded px-1 py-0.5 text-[13px] font-medium transition-colors hover:text-tprimary"
                  onClick={tell}
                >
                  <span className="mr-1">{s.label}</span>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
                    <path d="M7 10l5 5 5-5z" transform="scale(0.7)" />
                  </svg>
                </button>
                <button type="button" aria-label={`${s.label} settings`} className="flex h-5 w-5 items-center justify-center transition-colors hover:text-tprimary" onClick={tell}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
                  </svg>
                </button>
              </div>
              <ScopeCanvas draw={s.draw} ariaLabel={s.aria} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

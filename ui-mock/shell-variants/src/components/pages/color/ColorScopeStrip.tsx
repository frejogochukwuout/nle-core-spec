/* ColorScopeStrip — R20-W4c (DESIGN-R20 D3; gap C53; color-layout §3.7 +
   spec 08 §11/§11.3/§11.4). The REAL scopes: the 2×2 strip under the viewer
   (never a console tab — the simultaneity law: colorists watch scopes while
   dragging wheels). The data is the CURRENT graded display buffer published
   by GradedViewerCanvas on the frame bus (gradedFrameBus — the BUFFER half
   of the seam; useScopeSource is the STORE half: target/grades/preview).

   Traces: W4a's scopesMath reductions (column-histogram waveform/parade
   with density alpha + 'lighter' composition, BT.601 vectorscope with the
   spec-08 §11.3 graticule + 123° skin-tone line, 3-track histogram) drawn
   by scopeDraw's painters, REDRAWN at the 10fps throttle (spec 08 §11.4).

   R20-W4b kept the slot + collapse + testids; W4c fills the internals.
   The R19 seeded-trace dock stays deleted (C53 supersedes). */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';
import { waveformColumns, parade, vectorscopePoints, histogram } from '../../../lib/color';
import { useUi, resolveGradeTargetId, gradeOf, TIMELINE_GRADE_KEY, type MockGrade } from '../../../state/useUiStore';
import { getGradedFrame, subscribeGradedFrame, type GradedFrame } from './gradedFrameBus';
import {
  drawWaveformScope,
  drawParadeScope,
  drawVectorscopeScope,
  drawHistogramScope,
  type ScopeKind,
} from './scopeDraw';

export interface ScopeSource {
  /** The resolved grade target ('timeline' | elementId | null). */
  targetId: string | null;
  /** The target's grade record (identity default when absent). */
  grade: MockGrade;
  /** The post-clip timeline grade (identity default when absent). */
  timelineGrade: MockGrade;
  /** True while the viewer shows the qualifier matte overlay (status hint). */
  qualifierPreviewOn: boolean;
}

/** THE STORE HALF of the W4c seam — one selector pair, stable references
 *  (same law as useGradeRecord; the buffer half is gradedFrameBus). */
export function useScopeSource(): ScopeSource {
  const targetId = useUi((s) => resolveGradeTargetId(s));
  const grade = useUi((s) => gradeOf(s, targetId ?? '__none__'));
  const timelineGrade = useUi((s) => gradeOf(s, TIMELINE_GRADE_KEY));
  const qualifierPreviewOn = useUi((s) => s.qualifierPreviewOn);
  return { targetId, grade, timelineGrade, qualifierPreviewOn };
}

/* scope panel native resolutions (CSS stretches them to the quadrant) */
const PANEL_W = 320;
const PANEL_H = 160;

const PANELS: { kind: ScopeKind; label: string; a11y: string }[] = [
  { kind: 'waveform', label: 'WFM', a11y: 'Luma waveform scope (BT.601 column histogram)' },
  { kind: 'parade', label: 'RGB', a11y: 'RGB parade scope (three channel waveforms, shared scale)' },
  { kind: 'vectorscope', label: 'VEC', a11y: 'Vectorscope (BT.601, spec 08 §11.3 graticule + 123° skin-tone line)' },
  { kind: 'histogram', label: 'HIST', a11y: 'RGB histogram scope (three stacked 256-bin tracks)' },
];

/** The 10fps redraw interval (spec 08 §11.4). */
export const SCOPE_THROTTLE_MS = 100;

export function ColorScopeStrip() {
  const [collapsed, setCollapsed] = useState(false);
  const src = useScopeSource(); // the store half stays live (status line)
  const [frame, setFrame] = useState<GradedFrame | null>(() => getGradedFrame());

  /* the buffer half: subscribe to the viewer's graded-frame publishes */
  useEffect(() => subscribeGradedFrame(setFrame), []);

  const refs = useRef<Record<ScopeKind, HTMLCanvasElement | null>>({ waveform: null, parade: null, vectorscope: null, histogram: null });
  /* −Infinity: the FIRST frame after mount draws immediately (no frame yet —
     never a 100ms dead window on the first paint), then the 10fps cadence */
  const lastDrawRef = useRef(Number.NEGATIVE_INFINITY);

  const drawNow = useCallback(() => {
    if (!frame) return;
    const img = frame.imageData;
    const ctxOf = (kind: ScopeKind): CanvasRenderingContext2D | null => {
      const c = refs.current[kind];
      if (!c) return null;
      if (c.width !== PANEL_W) c.width = PANEL_W;
      if (c.height !== PANEL_H) c.height = PANEL_H;
      return c.getContext('2d');
    };
    const wfm = ctxOf('waveform');
    if (wfm) drawWaveformScope(wfm, PANEL_W, PANEL_H, waveformColumns(img, 'y'));
    const par = ctxOf('parade');
    if (par) drawParadeScope(par, PANEL_W, PANEL_H, parade(img));
    const vec = ctxOf('vectorscope');
    if (vec) drawVectorscopeScope(vec, PANEL_W, PANEL_H, vectorscopePoints(img));
    const his = ctxOf('histogram');
    if (his) drawHistogramScope(his, PANEL_W, PANEL_H, histogram(img));
  }, [frame]);

  /* redraw at the 10fps throttle: a frame arriving inside the window is
     deferred (latest-wins), the timer is cleared on every new frame */
  useEffect(() => {
    if (!frame || collapsed) return;
    const elapsed = performance.now() - lastDrawRef.current;
    if (elapsed >= SCOPE_THROTTLE_MS) {
      lastDrawRef.current = performance.now();
      drawNow();
      return;
    }
    const t = window.setTimeout(() => {
      lastDrawRef.current = performance.now();
      drawNow();
    }, SCOPE_THROTTLE_MS - elapsed);
    return () => window.clearTimeout(t);
  }, [frame, collapsed, drawNow]);

  return (
    <div data-testid="shell-color-scopes" className="flex min-h-0 shrink-0 flex-col" style={{ background: 'var(--bg-shell)' }}>
      <div className="flex h-[26px] shrink-0 items-center gap-1 border-b border-hairline px-2">
        <button
          type="button"
          aria-label={collapsed ? 'Expand scopes' : 'Collapse scopes'}
          aria-expanded={!collapsed}
          aria-controls="shell-color-scopes-grid"
          data-testid="shell-color-scopes-collapse"
          className="icon-btn"
          onClick={() => setCollapsed((v) => !v)}
        >
          <Activity size={14} />
        </button>
        <span className="px-1 text-[11px] font-medium text-tprimary">Scopes</span>
        <span data-testid="shell-color-scopes-status" className="mono ml-auto text-[10px] text-tfaint">
          {frame ? `${frame.width}×${frame.height} · 10 fps` : 'standby — no graded frame'}
          {src.qualifierPreviewOn ? ' · matte preview on' : ''}
        </span>
      </div>
      {!collapsed && (
        <div id="shell-color-scopes-grid" data-testid="shell-color-scopes-grid" className="grid min-h-[120px] shrink-0 grid-cols-2 gap-[2px]" style={{ background: '#000' }}>
          {PANELS.map((p) => (
            <div key={p.kind} data-testid={`shell-color-scope-${p.kind}`} className="relative min-h-[56px] overflow-hidden rounded-[2px]" style={{ background: 'var(--scope-bg)' }}>
              <span aria-hidden className="mono absolute left-1 top-0.5 z-10 text-[9px] font-semibold uppercase tracking-[0.08em] text-white/55">
                {p.label}
              </span>
              {frame ? (
                <canvas
                  ref={(el) => { refs.current[p.kind] = el; }}
                  role="img"
                  aria-label={p.a11y}
                  data-testid={`shell-color-scope-${p.kind}-canvas`}
                  className="block h-full w-full"
                />
              ) : (
                <span className="flex h-full min-h-[56px] items-center justify-center text-[10px] text-tfaint">
                  no signal — grade a frame in the viewer
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ScopesDock — R23-WB (DESIGN-R23 D-B1; issues #90/#95; supersedes the R22
   ColorScopeStrip, deleted this wave). The scopes console moved from
   UNDER-THE-VIEWER to the TIMELINE-AREA CONSOLE ROW — the row that already
   carries the MixerDock ("stacked next to the multi-track just like where
   Mixer console is", #90) — and the four scopes became TABS (Luma WFM /
   RGB Parade / Vector / Histogram): ONE scope renders at a time at the
   panel's FULL size ("make these multi-tabs so they can render normally
   instead of being squeezed", #95). The W4c simultaneity law (colorists
   watch all four scopes at once under the viewer) is REVERSED by this
   ruling — registered in the README deviation ledger.

   The REAL trace machinery is unchanged from W4c, moved verbatim: the data
   is the CURRENT graded display buffer published by GradedViewerCanvas on
   the frame bus (gradedFrameBus — the BUFFER half of the seam;
   useScopeSource is the STORE half: target/grades/preview flag); traces are
   W4a's scopesMath reductions drawn by scopeDraw's painters, REDRAWN at the
   10fps throttle (spec 08 §11.4). While the node graph owns the viewer
   region (D-B2) no NEW frames publish — the dock honestly keeps drawing the
   LAST published frame and says so in the status line (Part IX ruling 14,
   registered deviation).

   Geometry law (the R22 percentage-in-flex law): the dock fills the console
   row's FULL height via flex/min-h-0 — never a % height; the width is the
   row's flex share (min 320px, owned by the AppShell wrapper). The canvas
   keeps the 320×160 native resolution and is CSS-stretched to the panel
   (the W4c stretch law — the trace math and its pins are
   resolution-stable). */

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

/** THE STORE HALF of the W4c seam (moved unchanged from ColorScopeStrip) —
 *  one selector pair, stable references (same law as useGradeRecord; the
 *  buffer half is gradedFrameBus). */
export function useScopeSource(): ScopeSource {
  const targetId = useUi((s) => resolveGradeTargetId(s));
  const grade = useUi((s) => gradeOf(s, targetId ?? '__none__'));
  const timelineGrade = useUi((s) => gradeOf(s, TIMELINE_GRADE_KEY));
  const qualifierPreviewOn = useUi((s) => s.qualifierPreviewOn);
  return { targetId, grade, timelineGrade, qualifierPreviewOn };
}

/* scope panel native resolution (CSS stretches it to the full panel — the
   W4c law; one scope now gets the whole dock instead of a quadrant) */
const PANEL_W = 320;
const PANEL_H = 160;

const PANELS: { kind: ScopeKind; label: string; a11y: string }[] = [
  { kind: 'waveform', label: 'Luma WFM', a11y: 'Luma waveform scope (BT.601 column histogram)' },
  { kind: 'parade', label: 'RGB Parade', a11y: 'RGB parade scope (three channel waveforms, shared scale)' },
  { kind: 'vectorscope', label: 'Vector', a11y: 'Vectorscope (BT.601, spec 08 §11.3 graticule + 123° skin-tone line)' },
  { kind: 'histogram', label: 'Histogram', a11y: 'RGB histogram scope (three stacked 256-bin tracks)' },
];

/** The 10fps redraw interval (spec 08 §11.4) — moved unchanged. */
export const SCOPE_THROTTLE_MS = 100;

export function ScopesDock() {
  /* R22-D3 → R23-WB: the dock state is STORE-driven ('off' = NOT rendered at
     all — the mixer's collapsed law; the AppShell gates the console row slot
     and the Toolbar2 toggle writes this). */
  const mode = useUi((s) => s.colorScopesState);
  const nodesOwnViewer = useUi((s) => s.colorNodesDock);
  const src = useScopeSource(); // the store half stays live (status line)
  const [frame, setFrame] = useState<GradedFrame | null>(() => getGradedFrame());
  /* D-B1: ONE scope at a time — the active tab (local view state; the
     4-state machine's row/grid layouts died with the squeeze). */
  const [active, setActive] = useState<ScopeKind>('waveform');

  /* the buffer half: subscribe to the viewer's graded-frame publishes */
  useEffect(() => subscribeGradedFrame(setFrame), []);

  const refs = useRef<Record<ScopeKind, HTMLCanvasElement | null>>({ waveform: null, parade: null, vectorscope: null, histogram: null });
  /* −Infinity: the FIRST frame after mount draws immediately (no frame yet —
     never a 100ms dead window on the first paint), then the 10fps cadence */
  const lastDrawRef = useRef(Number.NEGATIVE_INFINITY);

  const drawNow = useCallback(() => {
    if (!frame) return;
    const img = frame.imageData;
    const c = refs.current[active];
    if (!c) return;
    if (c.width !== PANEL_W) c.width = PANEL_W;
    if (c.height !== PANEL_H) c.height = PANEL_H;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    if (active === 'waveform') drawWaveformScope(ctx, PANEL_W, PANEL_H, waveformColumns(img, 'y'));
    else if (active === 'parade') drawParadeScope(ctx, PANEL_W, PANEL_H, parade(img));
    else if (active === 'vectorscope') drawVectorscopeScope(ctx, PANEL_W, PANEL_H, vectorscopePoints(img));
    else drawHistogramScope(ctx, PANEL_W, PANEL_H, histogram(img));
  }, [frame, active]);

  /* redraw at the 10fps throttle: a frame arriving inside the window is
     deferred (latest-wins), the timer is cleared on every new frame; a TAB
     switch re-runs the effect so the newly mounted canvas paints at once */
  useEffect(() => {
    if (!frame) return;
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
  }, [frame, active, drawNow]);

  /* the ARIA tabs pattern (roving tabindex — the house law): one tab stop,
     ←/→ switch the scope (wrapping), aria-selected carries the active panel */
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  /* a tab switch is NOT a frame arrival — the throttle rate-limits FRAME
     redraws; a newly revealed canvas paints at once (never a dead scope
     waiting out someone else's window). */
  const selectScope = (kind: ScopeKind) => {
    lastDrawRef.current = Number.NEGATIVE_INFINITY;
    setActive(kind);
  };
  const onTabsKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const idx = PANELS.findIndex((p) => p.kind === active);
    const next = (idx + (e.key === 'ArrowRight' ? 1 : -1) + PANELS.length) % PANELS.length;
    selectScope(PANELS[next].kind);
    tabRefs.current[next]?.focus();
  };

  const activePanel = PANELS.find((p) => p.kind === active)!;

  /* 'off' = NOT rendered at all (the mixer's collapsed law — the AppShell
     gates too; solo mounts see the same law so a story/test never shows a
     ghost dock). */
  if (mode === 'off') return null;

  return (
    <div
      data-testid="shell-color-scopes"
      aria-label="Scopes console"
      className="flex h-full min-h-0 w-full flex-col overflow-hidden border-l border-hairline bg-panel"
    >
      {/* the dock header — the reference's window-bar anatomy (title +
          status), 26px shell-bar height; the layout/collapse toggles died
          with the 4-state machine (the TABS are the layout now) */}
      <div className="flex h-[26px] shrink-0 items-center gap-1 border-b border-hairline px-2">
        <Activity size={12} aria-hidden className="text-tmuted" />
        <span className="px-1 text-[11px] font-medium text-tprimary">Scopes</span>
        <span data-testid="shell-color-scopes-status" className="mono ml-auto truncate text-[10px] text-tfaint">
          {frame ? `${frame.width}×${frame.height} · 10 fps` : 'standby — no graded frame'}
          {src.qualifierPreviewOn ? ' · matte preview on' : ''}
          {/* ruling 14: while the node graph owns the viewer region no NEW
              frames publish — the dock keeps the LAST frame and says so */}
          {frame && nodesOwnViewer ? ' · stale — node graph owns the viewer' : ''}
        </span>
      </div>

      {/* the four scopes as TABS (#95 — one scope at a time, never squeezed) */}
      <div
        role="tablist"
        aria-label="Scope views"
        className="flex shrink-0 items-stretch border-b border-hairline"
        onKeyDown={onTabsKeyDown}
      >
        {PANELS.map((p, i) => (
          <button
            key={p.kind}
            type="button"
            role="tab"
            id={`shell-color-scopes-tab-${p.kind}`}
            aria-selected={active === p.kind}
            aria-controls="shell-color-scopes-panel"
            tabIndex={active === p.kind ? 0 : -1}
            data-testid={`shell-color-scopes-tab-${p.kind}`}
            ref={(el) => { tabRefs.current[i] = el; }}
            onClick={() => selectScope(p.kind)}
            className={`flex flex-1 items-center justify-center px-2 py-1 text-[10px] font-medium transition-colors ${
              active === p.kind
                ? 'border-b-2 border-[var(--accent-selection)] text-tprimary'
                : 'border-b-2 border-transparent text-tmuted hover:text-tprimary'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* the ONE active scope at the panel's FULL size (flex/min-h-0 — the
          row-height law; NEVER a % height) */}
      <div
        id="shell-color-scopes-panel"
        role="tabpanel"
        aria-labelledby={`shell-color-scopes-tab-${active}`}
        data-testid={`shell-color-scope-${active}`}
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{ background: 'var(--scope-bg)' }}
      >
        <span aria-hidden className="mono absolute left-1 top-0.5 z-10 text-[9px] font-semibold uppercase tracking-[0.08em] text-white/55">
          {activePanel.label}
        </span>
        {frame ? (
          /* key={active}: every tab switch mounts a FRESH canvas — the trace
             registry (and the canvas bitmap) must never carry the previous
             scope's draws under the new one (the draw's black bg fill makes
             the pixels honest, but a reused element keeps stale recorded
             geometry — the pin caught it). */
          <canvas
            key={active}
            ref={(el) => { refs.current[active] = el; }}
            role="img"
            aria-label={activePanel.a11y}
            data-testid={`shell-color-scope-${active}-canvas`}
            className="block h-full w-full"
          />
        ) : (
          <span className="flex h-full min-h-[56px] items-center justify-center text-[10px] text-tfaint">
            no signal — grade a frame in the viewer
          </span>
        )}
      </div>
    </div>
  );
}

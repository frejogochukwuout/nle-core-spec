/* ScopesDock — R23-WB (DESIGN-R23 D-B1) → R24-W2 (DESIGN-R24 §1.2
   A2-R2/R3; issues #90/#95/#68/#67). The scopes console moved AGAIN —
   from the timeline-area console row to the ~160px PANE UNDER THE
   VIEWER, inside F6 region [2]'s column (Viewer flex-1 + the pane below),
   colorScopesState-gated ('off' = not rendered) and NEVER a new F6 stop
   (the pane adds no region to the cycle). The R23-WB ruling-14 stale-frame
   hint is DELETED with the re-home: region [2] is always Viewer-led now
   (A2-R1), so the viewer keeps publishing frames while every console is
   open — there is no stale state left to confess.

   The tabs carry the REFERENCE's exact labels (Parade / Waveform /
   Vectorscope / Histogram — A2-R2) and keep the R23-WB one-scope-at-a-time
   law (#95) + the ARIA tabs roving pattern. The 2×2 four-up layout is NOT
   a mode: Resolve's pane menu offers single/2-up/4-up layouts, but this
   mock's window bar is fake — the four-up button fires a ONE-SHOT honest
   toast telling the reviewer the 2×2 is reference-only (the layout lands
   with the window-chrome round).

   The REAL trace machinery is unchanged: the data is the CURRENT graded
   display buffer published by GradedViewerCanvas on the frame bus
   (gradedFrameBus — the BUFFER half of the seam; useScopeSource is the
   STORE half: target/grades/preview flag); traces are W4a's scopesMath
   reductions drawn by scopeDraw's painters, REDRAWN at the 10fps throttle
   (spec 08 §11.4).

   Geometry law: the dock fills the pane's FULL height via flex/min-h-0 —
   never a % height; the pane wrapper owns the seam border (the splitter
   seam law). The canvas keeps the 320×160 native resolution and is
   CSS-stretched to the panel (the W4c stretch law — the trace math and its
   pins are resolution-stable). */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, LayoutGrid } from 'lucide-react';
import { waveformColumns, parade, vectorscopePoints, histogram } from '../../../lib/color';
import { useUi, resolveGradeTargetId, gradeOf, TIMELINE_GRADE_KEY, type MockGrade } from '../../../state/useUiStore';
import { getGradedFrame, subscribeGradedFrame, type GradedFrame } from './gradedFrameBus';
import { useHonestToast } from './useHonestToast';
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
  { kind: 'parade', label: 'Parade', a11y: 'RGB parade scope (three channel waveforms, shared scale)' },
  { kind: 'waveform', label: 'Waveform', a11y: 'Luma waveform scope (BT.601 column histogram)' },
  { kind: 'vectorscope', label: 'Vectorscope', a11y: 'Vectorscope (BT.601, spec 08 §11.3 graticule + 123° skin-tone line)' },
  { kind: 'histogram', label: 'Histogram', a11y: 'RGB histogram scope (three stacked 256-bin tracks)' },
];

/** The 10fps redraw interval (spec 08 §11.4) — moved unchanged. */
export const SCOPE_THROTTLE_MS = 100;

export function ScopesDock() {
  /* R22-D3 → R23-WB → R24-W2: the dock state is STORE-driven ('off' = NOT
     rendered at all — the mixer's collapsed law; the AppShell gates the
     viewer-column pane and the Toolbar2 toggle writes this). */
  const mode = useUi((s) => s.colorScopesState);
  const src = useScopeSource(); // the store half stays live (status line)
  const [frame, setFrame] = useState<GradedFrame | null>(() => getGradedFrame());
  /* D-B1: ONE scope at a time — the active tab (local view state; the
     4-state machine's row/grid layouts died with the squeeze). */
  const [active, setActive] = useState<ScopeKind>('waveform');
  /* A2-R2/R3: the 2×2 four-up is a ONE-SHOT honest toast, not a mode —
     Resolve's pane menu layouts (single/2-up/4-up) need a real window
     bar; this mock's is fake, so the button says exactly that, once per
     mount (the useHonestToast law). */
  const tellFourUp = useHonestToast(
    'Scopes',
    'the 2×2 four-up layout is reference-only — this mock renders one scope at a time (pane layouts land with the window-chrome round)',
  );

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
     switch re-runs the effect so the newly mounted canvas paints at once.
     R23-FIX (review-sweep R4-P3#11): `mode` riding the deps is now PINNED
     (ScopesDock.test — a dock kept mounted through off→open with the frame
     already on the bus repaints on the flip; without mode in the deps the
     effect never re-runs and the canvas stays blank). */
  useEffect(() => {
    if (!frame) return;
    /* `mode` rides the deps (R23-WB-REV P3 #1): a solo mount at 'off'
       flipped to 'open' with the frame already on the bus must repaint —
       in-app the AppShell gates the mount, but a future unconditional
       consumer must not paint a stale/blank canvas on the state flip. */
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
  }, [frame, active, drawNow, mode]);

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
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-panel"
    >
      {/* the dock header — the reference's window-bar anatomy (title +
          status), 26px shell-bar height; the layout/collapse toggles died
          with the 4-state machine (the TABS are the layout now — the 2×2
          four-up is the one-shot honest toast, A2-R2/R3) */}
      <div className="flex h-[26px] shrink-0 items-center gap-1 border-b border-hairline px-2">
        <Activity size={12} aria-hidden className="text-tmuted" />
        <span className="px-1 text-[11px] font-medium text-tprimary">Scopes</span>
        <button
          type="button"
          data-testid="shell-color-scopes-fourup"
          aria-label="2×2 four-up scopes layout"
          data-tip="2×2 four-up — reference-only in this mock (one scope at a time)"
          className="icon-btn"
          onClick={tellFourUp}
        >
          <LayoutGrid size={13} strokeWidth={1.7} />
        </button>
        <span data-testid="shell-color-scopes-status" className="mono ml-auto truncate text-[10px] text-tfaint">
          {frame ? `${frame.width}×${frame.height} · 10 fps` : 'standby — no graded frame'}
          {src.qualifierPreviewOn ? ' · matte preview on' : ''}
        </span>
      </div>

      {/* the four scopes as TABS (#95 — one scope at a time, never
          squeezed; A2-R2: the reference's exact labels) */}
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
        tabIndex={0} /* R23-FIX (review-sweep R4-P3#4): the WAI-ARIA tabs pattern makes the panel focusable so keyboard users can move INTO the controlled surface (not just between the tabs). */
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

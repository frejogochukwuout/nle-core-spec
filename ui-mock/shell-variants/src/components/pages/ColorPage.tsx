/* ColorPage — spec 18 §4.8 color-focus mode. R22 REWRITE (DESIGN-R22 D1) →
   R23-WB (DESIGN-R23 track B, issues #90–#97) — the color composition's
   REFINEMENTS:
     - the COLOR INSPECTOR (right rail) — the ONE grading surface, tabs
       [Primaries|Curves|Qualifier] under this one inspector panel (#78) —
       unchanged;
     - the SCOPES DOCK (ScopesDock) moved UNDER→OUT: the tabbed console now
       lives in the TIMELINE-AREA CONSOLE ROW beside the compact strip
       (#90/#95, D-B1; ColorScopeStrip deleted; one scope at a time);
     - the NODE GRAPH renders as the VIEWER-REGION surface (#93, D-B2;
       NodeGraphDock deleted; the AppShell swaps Viewer ⇄ ColorNodeGraph);
     - TIMELINE COMPACT is the default on color, with the EVERY-PAGE density
       toggle (#94, D-B3) + the real trackhead select button (#96);
     - the left dock is the STILLS GALLERY (#91/#97, D-B4 — stills only).
   This module is the composition's import line (re-exports) + a thin
   standalone wrapper for stories.

   Gap ledger: C50 (grade sidecar) real; C52 superseded by this layout;
   C52/C53/C54/C55/C56 from R20-W4 all survive (the panels are unchanged);
   C59 (stills are clip-level presets, not node snapshots) — D7 → D-B4. */

export { ColorInspector } from './color/ColorInspector';
export { ColorNodeGraph } from './color/ColorNodeGraph';
export { ScopesDock, useScopeSource } from './color/ScopesDock';
export { WheelsPanel } from './color/WheelsPanel';
export { CurvesPanel } from './color/CurvesPanel';
export { QualifierPanel } from './color/QualifierPanel';

import { ColorInspector } from './color/ColorInspector';

/** The inspector anatomy standalone (stories/solo mounts — the AppShell
    mounts ColorInspector directly in the inspector slot). */
export function ColorPage() {
  return (
    <div data-testid="shell-color" className="flex h-full w-full min-h-0 flex-col bg-panel">
      <div className="flex items-center gap-2 border-b border-hairline px-3" style={{ height: 28, minHeight: 28 }}>
        <span className="text-[12px] font-semibold text-tprimary">Color</span>
        <span className="text-[11px] text-tmuted">inspector — clip-level color tools as tabs (spec 18 §4.8, R22)</span>
      </div>
      <div className="min-h-0 flex-1">
        <ColorInspector />
      </div>
    </div>
  );
}

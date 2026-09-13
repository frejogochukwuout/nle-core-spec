/* ColorPage — spec 18 §4.8 color-focus mode. R22 REWRITE (DESIGN-R22 D1) →
   R23-WB (DESIGN-R23 track B, issues #90–#97) → R24-W2 (DESIGN-R24 §1.2
   A2-R1..R5, issues #67–#70) — the color composition's CURRENT truth:
     - the COLOR INSPECTOR (right rail) — the ONE grading surface, tabs
       [Primaries|Curves|Qualifier] under this one inspector panel (#78);
       the Curves tab is the YRGB rebuild (A2-R4: the [Y|R|G|B] radiogroup,
       per-channel curves + the channel histogram behind the grid);
     - the SCOPES PANE lives UNDER THE VIEWER (A2-R2/R3 — region [2]'s
       column, Viewer flex-1 + the ~160px pane below; colorScopesState-
       gated; the reference-exact Parade/Waveform/Vectorscope/Histogram
       tabs);
     - the NODE GRAPH is the TIMELINE-AREA CONSOLE dock (A2-R1 — F6 slot
       [6], its own 26px nodeviewer header + 38px toolbar + the 706×268
       scroll-both workspace; the viewer-swap is DELETED, region [2] is
       always Viewer-led);
     - TIMELINE COMPACT is the default on color, with the EVERY-PAGE density
       toggle (#94, D-B3) + the real trackhead select button (#96);
     - the left dock is the GALLERY (A2-R5 — the stills panel renamed;
       apply = replace-not-merge, the #70 context menu).
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

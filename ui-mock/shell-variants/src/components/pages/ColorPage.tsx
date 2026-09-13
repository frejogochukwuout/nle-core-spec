/* ColorPage — spec 18 §4.8 color-focus mode. R22 REWRITE (DESIGN-R22 D1) →
   R23-WB (DESIGN-R23 track B, issues #90–#97) → R24-W2 (DESIGN-R24 §1.2
   A2-R1..R5, issues #67–#70) → R25-W3 (DESIGN-R25 §3 W3 / §6 A2; issues
   th_mtzom4xu/th_mtzonhlu/th_mtzoo09d/th_mtzokuem/th_mtzoi7vr) — the color
   composition's CURRENT truth:
     - the COLOR INSPECTOR (right rail) — the ONE grading surface, tabs
       [Primaries|Curves|Qualifier] under this one inspector panel (#78)
       under A2's 3-chip GRADE TARGET breadcrumb; the Curves tab is the
       YRGB rebuild (A2-R4);
     - the CONSOLE ROW is the TAB STRIP [Timeline | Nodes | Scopes] — the
       ACTIVE tab's panel takes the row (the R24 under-viewer scopes pane
       and the side-by-side nodeviewer slot are retired; ConsoleTabs +
       the consoleTab atom);
     - TIMELINE COMPACT is the default on color, with the EVERY-PAGE
       density toggle (#94, D-B3) + the real trackhead select button (#96);
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

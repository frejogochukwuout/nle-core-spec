/* ColorPage — spec 18 §4.8 color-focus mode. R22 REWRITE (DESIGN-R22 D1):
   the grading surface composition the user directed (issues #77/#78/#79):
     - the COLOR INSPECTOR (right rail) — the ONE grading surface, tabs
       [Primaries|Curves|Qualifier] under this one inspector panel (#78);
     - the SCOPES DOCK (ColorScopeStrip, store-driven off/collapsed/row/grid)
       — a minimized + toggled console under the viewer, never permanent
       (#77); REAL traces from the graded frame bus (W4c, #76);
     - the NODE GRAPH DOCK (NodeGraphDock) — the global/separate-view console
       beside the compact timeline, toggled like the mixer (#78);
     - TIMELINE COMPACT — the #75 generalized frozen strip (V/A/T coded);
     - the AppShell composes them (the color page swaps Timeline for
       TimelineCompact + the docks; the viewer is the dominant center).
   This module is the composition's import line (re-exports) + a thin
   standalone wrapper for stories.

   Gap ledger: C50 (grade sidecar) real; C52 superseded by this layout;
   C52/C53/C54/C55/C56 from R20-W4 all survive (the panels are unchanged);
   C59 (stills are clip-level presets, not node snapshots) — D7. */

export { ColorInspector } from './color/ColorInspector';
export { ColorNodeGraph } from './color/ColorNodeGraph';
export { NodeGraphDock } from './color/NodeGraphDock';
export { ColorScopeStrip, useScopeSource } from './color/ColorScopeStrip';
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

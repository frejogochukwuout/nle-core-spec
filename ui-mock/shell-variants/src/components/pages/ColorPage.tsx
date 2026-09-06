/* ColorPage — spec 18 §4.8 color-focus mode. R20-W4b rework (DESIGN-R20
   D3): the grading surface is now the TIMELINE-AREA ColorConsole (AppShell
   swaps <Timeline/> for it on the color page — see ColorConsole.tsx); the
   right rail carries the clip-level color sections (ColorInspectorRail, the
   W3 inspector grammar); the left dock keeps the node graph; since R20-W4c
   the viewer is the graded <canvas> and the scope strip under it draws real
   traces from the published graded frame (GradedViewerCanvas +
   ColorScopeStrip + the gradedFrameBus seam).
   This module is the composition's one-import line (re-exports) + a thin
   standalone wrapper for stories.

   Gap ledger: C50 (grade sidecar) + C51 (console layout) live here;
   C52 (viewer canvas) + C53 (real scopes) + C54 (qualifier overlay +
   eyedropper) = W4c, real; C55 curves (W4b); C56 node binding (W4b). */

export { ColorConsole } from './color/ColorConsole';
export { ColorInspectorRail } from './color/ColorInspectorRail';
export { ColorNodeGraph } from './color/ColorNodeGraph';
export { ColorScopeStrip, useScopeSource } from './color/ColorScopeStrip';
export { WheelsPanel } from './color/WheelsPanel';
export { CurvesPanel } from './color/CurvesPanel';
export { QualifierPanel } from './color/QualifierPanel';

import { ColorInspectorRail } from './color/ColorInspectorRail';

/** The rail anatomy standalone (stories/solo mounts — the AppShell mounts
    ColorInspectorRail directly in the inspector slot). */
export function ColorPage() {
  return (
    <div data-testid="shell-color" className="flex h-full w-full min-h-0 flex-col bg-panel">
      <div className="flex items-center gap-2 border-b border-hairline px-3" style={{ height: 28, minHeight: 28 }}>
        <span className="text-[12px] font-semibold text-tprimary">Color</span>
        <span className="text-[11px] text-tmuted">inspector rail — clip-level color sections (spec 18 §4.8)</span>
      </div>
      <div className="min-h-0 flex-1">
        <ColorInspectorRail />
      </div>
    </div>
  );
}

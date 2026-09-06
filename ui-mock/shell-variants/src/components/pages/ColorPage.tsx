/* ColorPage — spec 18 §4.8 color-focus mode. R20-W4b rework (DESIGN-R20
   D3): the grading surface is now the TIMELINE-AREA ColorConsole (AppShell
   swaps <Timeline/> for it on the color page — see ColorConsole.tsx); the
   right rail carries the clip-level color sections (ColorInspectorRail, the
   W3 inspector grammar); the left dock keeps the node graph; the scope
   strip under the viewer is the W4c placeholder (ColorScopeStrip).
   This module is the composition's one-import line (re-exports) + a thin
   standalone wrapper for stories.

   Gap ledger: C50 (grade sidecar) + C51 (console layout) live here;
   C52/C53 (viewer canvas + real scopes) = W4c; C54 qualifier keying is
   REAL in the math (W4a) with the viewer overlay = W4c; C55 curves panel
   (this wave); C56 node binding (this wave). */

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

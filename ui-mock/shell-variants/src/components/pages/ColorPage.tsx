/* ColorPage — spec 18 §4.8: Color enters a color-focus mode that swaps the
   inspector rail for the grading stack. R19-B4: the single-column simplified
   stack is now the reference-grade surface (color-cluster.md) — this page
   composes the tabbed rail panel standalone for the CURRENT routing
   (AppShell mounts <ColorPage/> in the rail; the orchestrator's Wave III
   swaps to <ColorRailPanel/> + <ColorNodeGraph/> in the left dock +
   <ColorScopesDock/> under the viewer).
   Everything is display-state honest (spec 08 §4 render round): values are
   LOCAL state with real readout behavior, one honest toast per mount per
   surface. Timeline stays live below (spec 18 §4.8).
   Gap ledger: node-graph layout = C36 (18 §15.3 upgrade proposal); the 2×2
   scopes dock + seeded traces = C43 (08 scope-accuracy needs the render
   readback the mock cannot produce). */

import { ColorRailPanel } from './color/ColorRailPanel';

/* convenience re-exports so AppShell/orchestrator wiring is one import line */
export { ColorRailPanel } from './color/ColorRailPanel';
export { ColorNodeGraph } from './color/ColorNodeGraph';
export { ColorScopesDock } from './color/ColorScopesDock';
export { WheelsPanel } from './color/WheelsPanel';
export { QualifierPanel } from './color/QualifierPanel';

export function ColorPage() {
  return (
    <div data-testid="shell-color" className="flex h-full w-full min-h-0 flex-col bg-panel">
      <div className="flex items-center gap-2 border-b border-hairline px-3" style={{ height: 28, minHeight: 28 }}>
        <span className="text-[12px] font-semibold text-tprimary">Color</span>
        <span className="text-[11px] text-tmuted">grading surface — wheels · qualifier (spec 18 §4.8)</span>
      </div>
      <div className="min-h-0 flex-1">
        <ColorRailPanel />
      </div>
    </div>
  );
}

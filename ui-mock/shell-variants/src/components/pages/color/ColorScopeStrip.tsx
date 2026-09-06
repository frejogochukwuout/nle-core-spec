/* ColorScopeStrip — R20-W4b (DESIGN-R20 D3; the slot RESERVE for gap C53,
   real scopes — W4c implements the internals). This placeholder component
   owns the LAYOUT SLOT under the viewer (never a console tab — the
   simultaneity law: colorists watch scopes while dragging wheels) and the
   W4c SEAM:

     useScopeSource() — the data seam. Returns the resolved grade target,
     its grade record, the post-clip timeline grade, and the qualifier
     preview flag. W4c renders real traces from the graded display buffer
     (lib/color scopesMath: waveformColumns / parade / histogram /
     vectorscopePoints; 10fps throttle per spec 08 §11.4) fed through this
     hook — replacing the SKELETON grid below, NOT the component contract
     (testids + collapse stay stable so AppShell geometry holds).

   The R19 seeded-trace dock (ColorScopesDock + scopeTraces.ts — the sin()-
   shaped fake data) is DELETED: C53 supersedes it (grep-verified nothing
   else consumed scopeTraces; StripGraphs has its own mixer traces). */

import { useState } from 'react';
import { Activity } from 'lucide-react';
import { useUi, resolveGradeTargetId, gradeOf, TIMELINE_GRADE_KEY, type MockGrade } from '../../../state/useUiStore';

export interface ScopeSource {
  /** The resolved grade target ('timeline' | elementId | null). */
  targetId: string | null;
  /** The target's grade record (identity default when absent). */
  grade: MockGrade;
  /** The post-clip timeline grade (identity default when absent). */
  timelineGrade: MockGrade;
  /** W4c composes [clipGrade → timelineGrade] per color-layout §3.6. */
  qualifierPreviewOn: boolean;
}

/** THE W4c SEAM — one selector pair, stable references (same law as
    useGradeRecord; the viewer/scopes side of the store contract). */
export function useScopeSource(): ScopeSource {
  const targetId = useUi((s) => resolveGradeTargetId(s));
  const grade = useUi((s) => gradeOf(s, targetId ?? '__none__'));
  const timelineGrade = useUi((s) => gradeOf(s, TIMELINE_GRADE_KEY));
  const qualifierPreviewOn = useUi((s) => s.qualifierPreviewOn);
  return { targetId, grade, timelineGrade, qualifierPreviewOn };
}

const SCOPES = [
  { kind: 'waveform', label: 'Waveform' },
  { kind: 'parade', label: 'Parade' },
  { kind: 'vectorscope', label: 'Vectorscope' },
  { kind: 'histogram', label: 'Histogram' },
] as const;

export function ColorScopeStrip() {
  /* W4c fills the internals; the placeholder keeps the slot + collapse REAL
     (the AppShell viewer/scopes split depends on it). */
  const [collapsed, setCollapsed] = useState(false);
  const src = useScopeSource(); // the seam stays live so W4c drops in cold

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
          real traces land with the viewer canvas (C53/W4c)
          {src.qualifierPreviewOn ? ' · matte preview on' : ''}
        </span>
      </div>
      {!collapsed && (
        <div id="shell-color-scopes-grid" data-testid="shell-color-scopes-grid" className="grid min-h-[120px] shrink-0 grid-cols-2 gap-[2px]" style={{ background: '#000' }}>
          {SCOPES.map((s) => (
            <div key={s.kind} data-testid={`shell-color-scope-${s.kind}`} className="flex min-h-[56px] items-center justify-center rounded-[2px]" style={{ background: 'var(--scope-bg)' }}>
              <span className="text-[10px] text-tfaint">{s.label} — placeholder (W4c)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

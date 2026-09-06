/* ColorInspector — R22 (DESIGN-R22 D2; issues #78/#79). The color page's
   ONE grading surface, in the right rail: "it could have been just
   multi-tabbing with wheel vs other things all under this one inspector
   panel" (#78) — so the wheels/curves/qualifier panels live HERE as tabs,
   and the scrapped ColorConsole/ColorInspectorRail duplication dies.

   Anatomy:
   ┌ W3 type-driven header (clip name/kind/duration — NOT tall-icon tabs)
   ├ 26px compact text tab bar [Primaries | Curves | Qualifier] (the
   │   timeline_edit_modes tab-nav grammar the user approved; tablist +
   │   arrow roving + aria-selected)
   ├ context row — node chip (C56: which surface the inspector edits) + the
   │   Clip ⇄ Timeline grade-target toggle + target label (single-owner law:
   │   the timeline grade's ONLY editor is this inspector's timeline mode)
   └ the active tab's panel (WheelsPanel / CurvesPanel / QualifierPanel —
       the reference-faithful, store-driven panels from R20-W4b/W4c, adapted
       to the 420px rail; internal scroll at small heights)

   Every panel is STORE-DRIVEN through useGradeRecord (the mockGrades
   sidecar) — one undoable setGrade per committed gesture (the D3 commit
   law). Node selection in the NodeGraphDock routes this inspector's tab. */

import { type KeyboardEvent } from 'react';
import { Film } from 'lucide-react';
import { useUi, useActiveScene, resolveGradeTargetId, TIMELINE_GRADE_KEY } from '../../../state/useUiStore';
import { findElement } from '../../../lib/mockData';
import { WheelsPanel } from './WheelsPanel';
import { CurvesPanel } from './CurvesPanel';
import { QualifierPanel } from './QualifierPanel';
import { gradeTargetLabel } from './useGradeTarget';

/* ---------- tabs ---------- */

type InspectorTab = 'primaries' | 'curves' | 'qualifier';

const TABS: { id: InspectorTab; label: string }[] = [
  { id: 'primaries', label: 'Primaries' },
  { id: 'curves', label: 'Curves' },
  { id: 'qualifier', label: 'Qualifier' },
];

const NODE_CHIP: Record<string, string> = {
  primary: 'Node 01 · Primaries',
  secondary: 'Node 02 · Qualifier',
};

const kindLabel: Record<string, string> = {
  main: 'Video',
  overlay: 'Video (overlay)',
  audio: 'Audio',
  caption: 'Text',
  image: 'Image',
};

export function ColorInspector() {
  const tab = useUi((s) => s.colorInspectorTab);
  const setTab = useUi((s) => s.setColorInspectorTab);
  const target = useUi((s) => s.colorGradeTarget);
  const setTarget = useUi((s) => s.setColorGradeTarget);
  const scenes = useUi((s) => s.scenes);
  const activeSceneId = useUi((s) => s.activeSceneId);
  const targetId = useUi((s) => resolveGradeTargetId(s));
  const selectedNode = useUi((s) => s.selectedColorNodeId);

  const scene = scenes.find((x) => x.id === activeSceneId) ?? scenes[0];
  const found = targetId && targetId !== TIMELINE_GRADE_KEY ? findElement(scenes, targetId) : null;
  const el = found?.element ?? null;
  const trackKind = found?.track.kind ?? null;

  const label = gradeTargetLabel(scenes, targetId);
  const nodeChip = selectedNode ? NODE_CHIP[selectedNode] : null;

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, current: InspectorTab) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const idx = TABS.findIndex((t) => t.id === current);
    const next = TABS[(idx + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length].id;
    setTab(next);
    /* synchronous focus — the tab stop follows the rove immediately (the
       rAF deferral lost focus races under jsdom/userEvent) */
    document.getElementById(`shell-color-inspector-tab-${next}`)?.focus();
  };

  return (
    <div data-testid="shell-color-inspector" className="flex h-full min-h-0 w-full flex-col bg-panel">
      {/* W3 type-driven header — the clip the grade binds to (no tall-icon
          tabs; the R22-D2 law) */}
      <div className="flex items-center gap-2 border-b border-hairline px-3 py-2.5">
        <Film size={14} aria-hidden className="shrink-0 text-tmuted" />
        {targetId == null ? (
          <span data-testid="shell-color-inspector-chip" className="text-[11.5px] font-medium text-tfaint">
            Color — no clip selected
          </span>
        ) : (
          <>
            <span data-testid="shell-color-inspector-chip" className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-tprimary" title={label}>
              {label}
            </span>
            {el && trackKind && (
              <span data-testid="shell-color-inspector-kind" className="shrink-0 rounded-[2px] border border-strong px-[5px] py-[1px] text-[10px] text-tmuted">
                {kindLabel[trackKind] ?? trackKind}
              </span>
            )}
            {targetId === TIMELINE_GRADE_KEY && (
              <span
                data-testid="shell-color-inspector-timeline-badge"
                className="shrink-0 rounded-[2px] border border-strong px-[5px] py-[1px] text-[10px] font-semibold tracking-wide text-tprimary"
                title="The post-clip timeline grade — its ONLY editor is this inspector (single owner)"
              >
                Timeline grade
              </span>
            )}
          </>
        )}
      </div>

      {/* the tab bar — the #78 directive: multi-tab under ONE inspector panel */}
      <div role="tablist" aria-label="Color inspector tools" className="flex h-[26px] shrink-0 items-stretch border-b border-hairline bg-shell">
        {TABS.map((t) => {
          const selected = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`shell-color-inspector-tab-${t.id}`}
              aria-selected={selected}
              aria-controls="shell-color-inspector-panel"
              tabIndex={selected ? 0 : -1}
              data-testid={`shell-color-inspector-tab-${t.id}`}
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => onTabKey(e, t.id)}
              className={`border-b-2 px-3 text-[12px] transition-colors ${
                selected ? 'border-accent text-tprimary' : 'border-transparent text-tmuted hover:text-tprimary'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* context row — node chip + Clip ⇄ Timeline grade-target toggle
          (the old console's law migrates here, D2) */}
      <div className="flex h-[24px] shrink-0 items-center gap-1.5 border-b border-hairline px-2">
        {nodeChip && (
          <span data-testid="shell-color-inspector-node" className="rounded-[2px] border border-strong px-[6px] py-[1px] text-[10px] text-tmuted">
            {nodeChip}
          </span>
        )}
        <div className="grow" />
        <div role="group" aria-label="Grade target" className="flex items-center gap-1.5">
          <button
            type="button"
            aria-pressed={target === 'clip'}
            data-testid="shell-color-inspector-target-clip"
            aria-label="Grade target: selected clip"
            onClick={() => setTarget('clip')}
            className={`rounded-[2px] border px-[6px] py-[1px] text-[10px] font-semibold transition-colors ${
              target === 'clip' ? 'border-accent text-tprimary' : 'border-strong text-tmuted hover:text-tprimary'
            }`}
          >
            Clip
          </button>
          <button
            type="button"
            aria-pressed={target === 'timeline'}
            data-testid="shell-color-inspector-target-timeline"
            aria-label="Grade target: timeline"
            onClick={() => setTarget('timeline')}
            className={`rounded-[2px] border px-[6px] py-[1px] text-[10px] font-semibold transition-colors ${
              target === 'timeline' ? 'border-accent text-tprimary' : 'border-strong text-tmuted hover:text-tprimary'
            }`}
          >
            Timeline
          </button>
          <span
            data-testid="shell-color-inspector-target"
            className="mono max-w-[140px] truncate text-[10px] text-tmuted"
            title={targetId === TIMELINE_GRADE_KEY ? 'Timeline grade' : targetId ?? 'No clip selected'}
          >
            {targetId === TIMELINE_GRADE_KEY ? 'Timeline grade' : targetId ? label : 'no clip selected'}
          </span>
        </div>
      </div>

      {/* the panel body — internal scroll (the 1280×800 floor stays
          registered in the README) */}
      <div
        role="tabpanel"
        id="shell-color-inspector-panel"
        data-testid="shell-color-inspector-panel"
        aria-labelledby={`shell-color-inspector-tab-${tab}`}
        className="scroll-y min-h-0 flex-1 overflow-y-auto"
      >
        {tab === 'primaries' ? <WheelsPanel /> : tab === 'curves' ? <CurvesPanel /> : <QualifierPanel />}
      </div>
    </div>
  );
}

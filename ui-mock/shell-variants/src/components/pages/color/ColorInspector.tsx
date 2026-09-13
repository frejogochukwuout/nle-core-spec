/* ColorInspector — R22 (DESIGN-R22 D2; issues #78/#79). The color page's
   ONE grading surface, in the right rail: "it could have been just
   multi-tabbing with wheel vs other things all under this one inspector
   panel" (#78) — so the wheels/curves/qualifier panels live HERE as tabs,
   and the scrapped ColorConsole/ColorInspectorRail duplication dies.

   R25-W3 (DESIGN-R25 §1 R7–R10 / §3 W3 / §6 A2; issues th_mtzom4xu "what
   does this mean?", th_mtzomdge, th_mtzonhlu "extremely confusing — clip
   or node editor?", th_mtzoo09d "one track? all?"): the old type-driven
   header + context row (the Clip⇄Timeline toggle the reviewer could not
   read) is REPLACED by A2's 3-chip breadcrumb:

     GRADE TARGET  [Clip 03 · V2] ▸ [Clip grade | Timeline grade] ▸ [Node 2 · Balance]

     · chip 1 (SCOPE) — the selected clip's name + track, or
       `Timeline (all clips)` at the timeline level (th_mtzoo09d: the
       timeline grade is post-clip and whole-timeline — NEVER "one track";
       Resolve has no track grade). Carries the accent highlight + the
       timeline tooltip; the old Timeline-grade BADGE is FOLDED into it
       (the breadcrumb subsumes its meaning — the R22 badge + the
       `shell-color-inspector-target` mono label are retired with it).
     · chip 2 (LEVEL) — the `Clip grade | Timeline grade` segmented pair
       (GradeTargetSegmented — the SAME store atom colorGradeTarget the
       node-graph header's twin segmented control reads; one source of
       truth). The timeline segment carries A2's exact copy.
     · chip 3 (NODE) — `Node n · label` (COLOR_NODE_LABELS, the graph's own
       map), clickable → sets selectedColorNodeId (the store's node
       selection — the graph highlights it with the accent border) AND
       switches the console row to the Nodes tab so the focus is visible.
       Reads the selected node or the first node (Primary).

   Orange dots on the inspector tabs (A2): a tab holding adjustments in the
   current target's grade record carries a small dot (derived — the
   mockGrades record vs DEFAULT_GRADE; no new dirty plumbing).

   Every panel is STORE-DRIVEN through useGradeRecord (the mockGrades
   sidecar) — one undoable setGrade per committed gesture (the D3 commit
   law). Node selection in the node graph (the console-row Nodes tab,
   R25-W3) routes this inspector's tab. */

import { type KeyboardEvent } from 'react';
import { Crosshair } from 'lucide-react';
import { useUi, resolveGradeTargetId, gradeOf, TIMELINE_GRADE_KEY, type MockGrade } from '../../../state/useUiStore';
import { findElement } from '../../../lib/mockData';
import { DEFAULT_GRADE, isIdentityQualifier } from '../../../lib/color';
import { WheelsPanel } from './WheelsPanel';
import { CurvesPanel } from './CurvesPanel';
import { QualifierPanel } from './QualifierPanel';
import { GradeTargetSegmented, TIMELINE_GRADE_TIP } from './GradeTargetSegmented';
import { COLOR_NODE_LABELS } from './ColorNodeGraph';

/* ---------- tabs ---------- */

type InspectorTab = 'primaries' | 'curves' | 'qualifier';

const TABS: { id: InspectorTab; label: string }[] = [
  { id: 'primaries', label: 'Primaries' },
  { id: 'curves', label: 'Curves' },
  { id: 'qualifier', label: 'Qualifier' },
];

const kindLabel: Record<string, string> = {
  main: 'Video',
  overlay: 'Video (overlay)',
  audio: 'Audio',
  caption: 'Text',
  image: 'Image',
};

/* ---------- A2's orange-dot seam (cheap: derived from the record) ---------- */

/** the record's primaries surface (wheel/levels/temp… fields) vs the spec
 *  default — qualifier/curves are the other tabs' own records. */
const primariesDirty = (g: MockGrade) => {
  const strip = (x: MockGrade) => {
    const { qualifier: _q, curves: _c, ...rest } = x;
    return JSON.stringify(rest);
  };
  return strip(g) !== strip(DEFAULT_GRADE);
};

/* R25-F1-C3: the qualifier dot lights on ADJUSTMENTS (DEFAULT-equality),
 * not on the record's mere existence — a materialized DEFAULT-equal node
 * (the old Preview-Matte view-mirror's residue) must read as clean. */
const qualifierDirty = (g: MockGrade) => !isIdentityQualifier(g.qualifier);

export function ColorInspector() {
  const tab = useUi((s) => s.colorInspectorTab);
  const setTab = useUi((s) => s.setColorInspectorTab);
  const scenes = useUi((s) => s.scenes);
  const activeSceneId = useUi((s) => s.activeSceneId);
  const targetId = useUi((s) => resolveGradeTargetId(s));
  const selectedNode = useUi((s) => s.selectedColorNodeId);
  const setColorNode = useUi((s) => s.setColorNode);
  const setConsoleTab = useUi((s) => s.setConsoleTab);
  const grade = useUi((s) => gradeOf(s, targetId ?? '__none__'));

  const scene = scenes.find((x) => x.id === activeSceneId) ?? scenes[0];
  const found = targetId && targetId !== TIMELINE_GRADE_KEY ? findElement(scenes, targetId) : null;
  const el = found?.element ?? null;
  const trackKind = found?.track.kind ?? null;
  const trackName = found?.track.name ?? null;
  const isTimeline = targetId === TIMELINE_GRADE_KEY;

  /* chip 3: the selected node or the FIRST node (Primary — the store's
     C56 default); clicking sets the selection + focuses the graph (the
     Nodes console tab — the accent highlight is the graph's own). */
  const nodeKey = selectedNode ?? 'primary';
  const nodeLabel = COLOR_NODE_LABELS[nodeKey] ?? null;

  /* A2's orange dots — the tab's surface holds adjustments in the record */
  const dots: Record<InspectorTab, boolean> = {
    primaries: primariesDirty(grade),
    curves: grade.curves != null,
    qualifier: qualifierDirty(grade),
  };

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
      {/* R25-W3 (A2): the 3-chip GRADE TARGET breadcrumb — the old
          type-driven header + context row fold into ONE self-explaining
          row (scope ▸ level ▸ node). */}
      <div
        data-testid="shell-color-inspector-breadcrumb"
        className="flex h-[30px] shrink-0 items-center gap-1.5 border-b border-hairline bg-shell px-3"
      >
        <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.08em] text-tfaint">Grade target</span>
        {targetId == null ? (
          /* R25-F4 (AA5): informative text rides text-tmuted — tfaint is
             decorative-only (tokens.css's own law, 18 §9); the no-target
             chip is real information, not a watermark. */
          <span data-testid="shell-color-inspector-chip" className="min-w-0 flex-1 truncate text-[11px] font-medium text-tmuted">
            Color — no clip selected
          </span>
        ) : (
          <>
            {/* chip 1 — the SCOPE: which clip (name · track) or the whole
                timeline; the accent highlight + the A2 timeline copy. The
                old Timeline-grade badge is folded HERE (its testid retired
                with the R22 grammar). */}
            <span
              data-testid="shell-color-inspector-chip"
              className={`flex min-w-0 items-center gap-1 truncate rounded-[3px] border px-[6px] py-[1px] text-[11px] font-medium ${
                isTimeline ? 'border-accent text-tprimary' : 'border-strong text-tprimary'
              }`}
              title={isTimeline ? TIMELINE_GRADE_TIP : el ? `${el.name} · ${trackName}` : undefined}
            >
              <span className="truncate">{isTimeline ? 'Timeline (all clips)' : el ? `${el.name} · ${trackName}` : targetId}</span>
              {el && trackKind && (
                <span data-testid="shell-color-inspector-kind" className="shrink-0 text-[9px] uppercase tracking-wide text-tfaint">
                  {kindLabel[trackKind] ?? trackKind}
                </span>
              )}
            </span>
            <span aria-hidden className="shrink-0 text-[9px] text-tfaint">▸</span>
            {/* chip 2 — the LEVEL: the segmented pair (one source with the
                node-graph header; A2's exact timeline copy on the segment) */}
            <GradeTargetSegmented />
            <span aria-hidden className="shrink-0 text-[9px] text-tfaint">▸</span>
            {/* chip 3 — the NODE: `Node n · label`, clickable → select the
                node + focus the graph (console row → the Nodes tab) */}
            <button
              type="button"
              data-testid="shell-color-inspector-node"
              aria-label={`Focus ${nodeLabel ?? 'node'} in the node graph`}
              title={nodeLabel ? `${nodeLabel} — click to focus it in the node graph` : undefined}
              onClick={() => {
                setColorNode(nodeKey);
                setConsoleTab('nodes');
              }}
              className="flex min-w-0 shrink-0 items-center gap-1 truncate rounded-[3px] border border-strong px-[6px] py-[1px] text-[10px] text-tmuted transition-colors hover:border-accent hover:text-tprimary"
            >
              <Crosshair size={10} aria-hidden className="shrink-0 text-tfaint" />
              <span className="truncate">{nodeLabel ?? 'Node —'}</span>
            </button>
          </>
        )}
      </div>

      {/* the tab bar — the #78 directive: multi-tab under ONE inspector panel.
          R25-W3 (A2): a tab whose surface holds adjustments carries the
          orange dot (derived from the grade record — no dirty plumbing). */}
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
              className={`flex items-center gap-1.5 border-b-2 px-3 text-[12px] transition-colors ${
                selected ? 'border-accent text-tprimary' : 'border-transparent text-tmuted hover:text-tprimary'
              }`}
            >
              <span>{t.label}</span>
              {dots[t.id] && (
                <span
                  aria-hidden
                  data-testid={`shell-color-inspector-tab-dot-${t.id}`}
                  title="holds adjustments"
                  className="h-[5px] w-[5px] shrink-0 rounded-full"
                  style={{ background: '#f59e0b' }}
                />
              )}
            </button>
          );
        })}
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

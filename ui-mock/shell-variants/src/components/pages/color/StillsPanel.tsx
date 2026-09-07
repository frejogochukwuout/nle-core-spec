/* StillsPanel — R22-D7 (DESIGN-R22; issue #82: "under Color Grading view for
   color grading assets"). The COLOR page's left-dock assets tab: a grid of
   stills = saved GradeParams snapshots. REAL behavior through the existing
   grade store seams:
     - click a still  → apply its GradeParams to the CURRENT grade target via
       setGrade (ONE undoable history entry — the D3 commit law);
     - alt/⌥-click    → (while a target is selected) SAVE the target's current
       grade as a new still (reads through useGradeRecord + the mockGrades
       sidecar; the new still lands in the list immediately).
   Honest boundary (registered gap C59): stills are CLIP-LEVEL presets — they
   are not node-graph snapshots and carry no qualifier-by-node binding; the
   data-tip says so. The fixtures live here (gradeRecord math from lib/color)
   so the panel needs no new store fields beyond the stills list state. */

import { useState, type MouseEvent } from 'react';
import { useUi, resolveGradeTargetId } from '../../../state/useUiStore';
import { useGradeRecord } from './useGradeTarget';
import { useGradingToast } from './useHonestToast';
import { DEFAULT_GRADE, type GradeParams } from '../../../lib/color';

/* ---------- fixtures: the seed stills (GradeParams snapshots) ---------- */

const SEED_STILLS: { id: string; name: string; mediaId: string; grade: GradeParams }[] = [
  { id: 'still-01', name: 'Marina cool', mediaId: 'm-01', grade: { ...DEFAULT_GRADE, temperature: -18, contrast: 1.08, saturation: 8 } },
  { id: 'still-02', name: 'Golden hour', mediaId: 'm-01', grade: { ...DEFAULT_GRADE, temperature: 26, tint: 6, saturation: 18, highlights: -6 } },
  { id: 'still-03', name: 'Bleach lift', mediaId: 'm-04', grade: { ...DEFAULT_GRADE, lift: 0.04, saturation: -32, contrast: 1.22 } },
  { id: 'still-04', name: 'Night teal', mediaId: 'm-01', grade: { ...DEFAULT_GRADE, temperature: -30, tint: -10, midHue: 190, midAmount: 0.12, pivot: 0.38 } },
];

export function StillsPanel() {
  const scenes = useUi((s) => s.scenes);
  const [stills, setStills] = useState(SEED_STILLS);
  const tell = useGradingToast();

  /* the CURRENT grade target (the resolver the ColorInspector shares — one
     selection domain, they can never disagree) */
  const targetId = useUi((s) => resolveGradeTargetId(s));
  const rec = useGradeRecord();

  const applyStill = (still: (typeof SEED_STILLS)[number], e: MouseEvent<HTMLButtonElement>) => {
    if (e.altKey) {
      /* ⌥-click = SAVE the target's current grade as a new still (the
         honest direction: reads the REAL sidecar, not a fake copy). */
      if (rec.targetId == null) {
        useUi.getState().pushToast({
          kind: 'info',
          title: 'No grade target',
          detail: 'select a clip (or the timeline target) in the color inspector first — a still saves THAT grade',
        });
        return;
      }
      const id = `still-${String(stills.length + 1).padStart(2, '0')}`;
      setStills([...stills, { id, name: `Still ${stills.length + 1}`, mediaId: 'm-01', grade: { ...rec.grade } }]);
      tell();
      return;
    }
    /* click = APPLY the still to the current target (one history entry). */
    if (rec.targetId == null) {
      useUi.getState().pushToast({
        kind: 'info',
        title: 'No grade target',
        detail: 'select a clip (or the timeline target) in the color inspector first — the still applies to THAT grade',
      });
      return;
    }
    rec.setGrade({ ...still.grade });
    tell();
  };

  return (
    <div data-testid="shell-stills" className="flex h-full min-h-0 w-full flex-col bg-shell">
      <div
        className="flex items-center gap-2 border-b border-hairline px-2.5 py-1.5"
        data-tip="Stills are clip-level grade presets — apply to the current target with a click; ⌥-click saves the target's grade as a new still (node-graph snapshots land later, gap C59)"
      >
        <span className="text-[11px] font-semibold text-tprimary">Stills</span>
        <span className="mono text-[10px] text-tfaint">{stills.length}</span>
      </div>
      <div className="scroll-y min-h-0 flex-1 p-1.5" role="list" aria-label="Grade stills">
        <div className="grid grid-cols-2 gap-1.5">
          {stills.map((st) => (
            <button
              key={st.id}
              type="button"
              role="listitem"
              data-testid={`shell-still-${st.id}`}
              aria-label={`Still ${st.name} — click to apply${targetId ? ' to the current grade target' : ''}, alt-click to save the target's grade`}
              onClick={(e) => applyStill(st, e)}
              className="group flex flex-col overflow-hidden rounded-[var(--radius)] border border-soft bg-panel text-left transition-colors hover:border-strong"
            >
              {/* the still "thumbnail" — a swatch derived from its grade's
                  temp/tint/sat (honest: a preview chip, not a decoded frame;
                  the real gallery renders decoded stills in the render round) */}
              <span
                aria-hidden
                className="block h-[54px] w-full"
                style={{
                  background: `linear-gradient(135deg,
                    hsl(${((st.grade.temperature + 100) / 200) * 60 + 10} ${Math.abs(st.grade.saturation) + 20}% ${Math.round(34 + st.grade.lift * 100)}%),
                    hsl(${((st.grade.tint + 100) / 200) * 60 + 80} ${Math.abs(st.grade.saturation) + 12}% ${Math.round(26 + st.grade.gain * 8)}%))`,
                }}
              />
              <span className="flex items-center justify-between gap-1 px-1.5 py-1">
                <span className="truncate text-[10px] text-tmuted group-hover:text-tprimary">{st.name}</span>
                <span className="mono shrink-0 text-[9px] text-tfaint">{st.grade.saturation > 0 ? `+${st.grade.saturation}` : st.grade.saturation} sat</span>
              </span>
            </button>
          ))}
        </div>
        <p className="px-1 pt-2 text-[10px] leading-relaxed text-tfaint">
          {scenes.length
            ? 'Apply: click. Save the current target\u2019s grade: ⌥-click any still slot. Clip-level presets (gap C59).'
            : ''}
        </p>
      </div>
    </div>
  );
}

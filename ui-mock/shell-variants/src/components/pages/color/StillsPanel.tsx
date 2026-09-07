/* StillsPanel — R22-D7 → R23-WB (DESIGN-R23 D-B4; issues #97/#91/#82): the
   COLOR page's left dock, now the DaVinci-style GALLERY (STILLS ONLY — the
   Pool|Stills tabs died, #91: "this should be the only tab in Media Bin").

   What a still IS (the Resolve workflow, #97's researched answer): a
   captured graded frame of a timeline clip — carried here as its grade
   record; the card's gradient thumbnail is the honest mock of the decoded
   frame (the real gallery renders decoded stills in the render round).
   The panel's rows are still CARDS: gradient thumbnail + grade name + a
   node-count chip (PRIMARY always + 1 when the record carries a qualifier
   node + 1 when its curve is non-identity — the honest derived count, not
   a fake topology).

   The #97 answer is IN THE UI: the caption line says what a still applies
   to — "Applies to the selected clip's grade (clip level)". Track-level
   application is NOT offered (Resolve applies grades to selections, never
   at track level — the honest answer is clip level, stated).

   REAL seams, all through the store:
     - click a card  → APPLY its GradeParams to the CURRENT grade target via
       rec.setGrade (ONE undoable history entry — the D3 commit law);
     - Save Still    → the visible button that promotes the old ⌥-click
       seam: captures the current target's grade into the STORE's colorStills
       (view state, the sourceRanges precedent) so stills survive page/tab
       unmounts — the R22 local-useState home died with the D-B4 ruling;
     - delete        → removeColorStill (view state);
     - .drx export   → the honest toast (PowerGrade export is a render-round
       boundary — the grade record itself is real).
   Honest boundary (registered gap C59, kept): stills are CLIP-LEVEL grade
   presets — not node-graph snapshots, no per-node binding. */

import { type MouseEvent } from 'react';
import { ImagePlus, Trash2, FileDown } from 'lucide-react';
import { useUi, resolveGradeTargetId, type Still } from '../../../state/useUiStore';
import { useGradeRecord } from './useGradeTarget';
import { useGradingToast } from './useHonestToast';
import { findElement } from '../../../lib/mockData';

/* the node-count chip: the grade pipeline the record actually carries —
   PRIMARY (always) + the Secondary qualifier node when present + the
   Curves node when non-identity. Derived, honest, never a fake count. */
const nodeCountOf = (st: Still): number =>
  1 + (st.grade.qualifier ? 1 : 0) + (st.grade.curves && st.grade.curves.master.length > 2 ? 1 : 0);

/** the still "thumbnail" — a swatch derived from its grade's temp/tint/sat
 *  (honest: a preview chip, not a decoded frame; the real gallery renders
 *  decoded stills in the render round — the D-B4 registered mock). */
const thumbStyle = (st: Still) => ({
  background: `linear-gradient(135deg,
    hsl(${((st.grade.temperature + 100) / 200) * 60 + 10} ${Math.abs(st.grade.saturation) + 20}% ${Math.round(34 + st.grade.lift * 100)}%),
    hsl(${((st.grade.tint + 100) / 200) * 60 + 80} ${Math.abs(st.grade.saturation) + 12}% ${Math.round(26 + st.grade.gain * 8)}%))`,
});

export function StillsPanel() {
  const stills = useUi((s) => s.colorStills);
  const addColorStill = useUi((s) => s.addColorStill);
  const removeColorStill = useUi((s) => s.removeColorStill);
  const tell = useGradingToast();

  /* the CURRENT grade target (the resolver the ColorInspector shares — one
     selection domain, they can never disagree) */
  const targetId = useUi((s) => resolveGradeTargetId(s));
  const scenes = useUi((s) => s.scenes);
  const rec = useGradeRecord();

  /* D-B4: the visible Save Still button — promotes the old ⌥-click seam
     (⌥-clicking a card still saves, the same handler). Reads the REAL
     sidecar record, never a fake copy. */
  const saveStill = () => {
    if (rec.targetId == null) {
      useUi.getState().pushToast({
        kind: 'info',
        title: 'No grade target',
        detail: 'select a clip (or the timeline target) in the color inspector first — a still captures THAT grade',
      });
      return;
    }
    const mediaId = rec.targetId ? (findElement(scenes, rec.targetId)?.element.mediaId ?? null) : null;
    addColorStill({ ...rec.grade }, { mediaId });
    tell();
  };

  const applyStill = (still: Still, e: MouseEvent<HTMLButtonElement>) => {
    if (e.altKey) {
      saveStill(); // the promoted seam's old gesture — one handler, both routes
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

  const exportDrx = (still: Still) => {
    useUi.getState().pushToast({
      kind: 'info',
      title: 'Stills',
      detail: `PowerGrade .drx export for “${still.name}” lands with the render round — the grade record itself is real (mockGrades)`,
    });
  };

  return (
    <div data-testid="shell-stills" className="flex h-full min-h-0 w-full flex-col bg-shell">
      <div className="flex items-center gap-2 border-b border-hairline px-2.5 py-1.5">
        <span className="text-[11px] font-semibold text-tprimary">Stills</span>
        <span className="mono text-[10px] text-tfaint">{stills.length}</span>
        <button
          type="button"
          data-testid="shell-stills-save"
          aria-label="Save the current grade target's grade as a new still"
          data-tip="Capture the current grade target's grade as a new still (the old ⌥-click, promoted)"
          onClick={saveStill}
          className="ml-auto flex items-center gap-1 rounded-[var(--radius)] border border-strong px-1.5 py-0.5 text-[10px] font-medium text-tmuted transition-colors hover:border-strong hover:text-tprimary"
        >
          <ImagePlus size={11} strokeWidth={1.7} />
          <span>Save Still</span>
        </button>
      </div>
      <div className="scroll-y min-h-0 flex-1 p-1.5" role="list" aria-label="Grade stills">
        <div className="grid grid-cols-2 gap-1.5">
          {stills.map((st) => (
            <div
              key={st.id}
              data-testid={`shell-still-${st.id}`}
              role="listitem"
              className="group flex flex-col overflow-hidden rounded-[var(--radius)] border border-soft bg-panel text-left transition-colors hover:border-strong"
            >
              {/* the card head — click = apply to the current grade target
                  (⌥-click = save the target's grade, the promoted seam) */}
              <button
                type="button"
                data-testid={`shell-still-${st.id}-apply`}
                aria-label={`Still ${st.name} — click to apply${targetId ? ' to the current grade target' : ''}, alt-click to save the target's grade`}
                onClick={(e) => applyStill(st, e)}
                className="flex flex-col text-left"
              >
                <span aria-hidden className="block h-[54px] w-full" style={thumbStyle(st)} />
                <span className="flex items-center gap-1 px-1.5 py-1">
                  <span className="truncate text-[10px] text-tmuted group-hover:text-tprimary">{st.name}</span>
                  <span
                    data-testid={`shell-still-${st.id}-nodes`}
                    data-tip="The grade pipeline the still carries (Primary + qualifier + curves)"
                    className="mono ml-auto shrink-0 rounded border border-strong px-1 text-[9px] leading-[13px] text-tfaint"
                  >
                    {nodeCountOf(st)}N
                  </span>
                </span>
              </button>
              {/* the card's action row — delete + the .drx export */}
              <div className="flex border-t border-soft">
                <button
                  type="button"
                  data-testid={`shell-still-${st.id}-delete`}
                  aria-label={`Delete still ${st.name}`}
                  data-tip="Delete this still (view state — never undoable doc data)"
                  onClick={() => removeColorStill(st.id)}
                  className="flex flex-1 items-center justify-center py-0.5 text-tfaint transition-colors hover:text-[var(--danger)]"
                >
                  <Trash2 size={11} strokeWidth={1.7} />
                </button>
                <button
                  type="button"
                  data-testid={`shell-still-${st.id}-drx`}
                  aria-label={`Export still ${st.name} as a PowerGrade .drx`}
                  data-tip="Export PowerGrade (.drx) — render-round boundary"
                  onClick={() => exportDrx(st)}
                  className="flex flex-1 items-center justify-center border-l border-soft py-0.5 text-tfaint transition-colors hover:text-tprimary"
                >
                  <FileDown size={11} strokeWidth={1.7} />
                </button>
              </div>
            </div>
          ))}
        </div>
        {/* the #97 answer, IN the UI: what a still applies to (clip level —
            the researched Resolve answer; track level is NOT offered) */}
        <p data-testid="shell-stills-scope" className="px-1 pt-2 text-[10px] leading-relaxed text-tfaint">
          {scenes.length
            ? 'Applies to the selected clip\u2019s grade (clip level) — click a card to apply, Save Still captures the current target\u2019s grade. Clip-level presets (gap C59).'
            : ''}
        </p>
      </div>
    </div>
  );
}

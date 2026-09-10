/* StillsPanel — R22-D7 → R23-WB (D-B4) → R24-W2 (DESIGN-R24 §1.2 A2-R5 +
   F4-P2; issues #97/#91/#70). The COLOR page's left dock, the DaVinci-style
   GALLERY (stills only) — RENAMED Gallery this wave (header + count + the
   leftDockContent label; surface key + every testid STABLE — only the label
   changes, #70's "full audit of the color grade view" ruling).

   What a still IS (the Resolve workflow, #97's researched answer): a
   captured graded frame of a timeline clip — carried here as its grade
   record; the card's gradient thumbnail is the honest mock of the decoded
   frame (the real gallery renders decoded stills in the render round).

   THE #70 RULINGS (A2-R5, this wave):
     - the per-card delete + .drx export buttons are DELETED — Resolve has
       ZERO per-card buttons; every card action lives in the shared
       ContextMenu (spec 18 §4.9, BOTH routes: right-click the card AND
       the keyboard route Shift+F10 / ContextMenu with focus in the card):
       Apply / Delete / Export PowerGrade;
     - click = APPLY (unchanged);
     - APPLY = REPLACE, NOT MERGE (F4-P2): the extracted applyStillToTarget
       seam does reset-then-set in ONE setGrade patch — a still WITH curves
       replaces the target's curves wholesale; a curves-free still on a
       non-identity target RESETS them (the patch carries the empty curve
       set — every channel absent = identity); a curves-free still on an
       identity target is a no-op (no history entry). Both routes (card
       click + menu Apply) share the seam.

   REAL seams, all through the store:
     - Save Still → the visible button that captures the current target's
       grade into the STORE's colorStills (view state, the sourceRanges
       precedent) so stills survive page/tab unmounts;
     - delete (menu) → removeColorStill (view state);
     - Export PowerGrade (menu) → the honest toast (the .drx render-round
       boundary — the grade record itself is real).
   Honest boundary (registered gap C59, kept): stills are CLIP-LEVEL grade
   presets — not node-graph snapshots, no per-node binding. */

import { type KeyboardEvent as ReactKeyboardEvent, type MouseEvent } from 'react';
import { ImagePlus } from 'lucide-react';
import { useUi, resolveGradeTargetId, type GradePatch, type Still } from '../../../state/useUiStore';
import { useGradeRecord } from './useGradeTarget';
import { useGradingToast } from './useHonestToast';
import { isIdentityCurve } from './curveMath';
import { ContextMenu, isMenuKey, useContextMenu, type MenuItem } from '../../shell/ContextMenu';
import { findElement } from '../../../lib/mockData';

/* the node-count chip: the grade pipeline the record actually carries —
   PRIMARY (always) + the Secondary qualifier node when present + the
   Curves node when the set is non-identity (ANY channel off the diagonal).
   Derived, honest, never a fake count. */
const nodeCountOf = (st: Still): number =>
  1 + (st.grade.qualifier ? 1 : 0) + (isIdentityCurve(st.grade.curves) ? 0 : 1);

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

  /* the #70 context menu — the shared ContextMenu component, both §4.9
     routes (right-click the card + the keyboard route with focus in the
     card). One menu at a time; focus returns to the opener on close. */
  const menu = useContextMenu();

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

  /* A2-R5 / F4-P2: APPLY = REPLACE, NOT MERGE — reset-then-set in ONE
   * setGrade patch (one undoable history entry). The still's full record
   * (every GradeParams field present) IS the reset: a target field the
   * still doesn't carry falls back to the still's default, never keeps the
   * target's old value. Curves follow the three-case law:
   *   still HAS curves        → wholesale replace (its tagged set verbatim);
   *   still curve-free + non-identity target → the EMPTY curve set (every
   *                            channel absent = identity) — the reset;
   *   still curve-free + identity target → the curves key is OMITTED (a
   *                            no-op patch mints no history entry).
   * [recon storage note] the contract's literal `curves: {}` cannot ride
   * the frozen store's mergeGrade (it deep-copies `master` unguarded);
   * the faithful alternative is the empty set `curves: { master: [] }` —
   * every channel absent = identity, the exact same semantics. */
  const applyStillToTarget = (still: Still) => {
    if (rec.targetId == null) {
      useUi.getState().pushToast({
        kind: 'info',
        title: 'No grade target',
        detail: 'select a clip (or the timeline target) in the color inspector first — the still applies to THAT grade',
      });
      return;
    }
    const stillHasCurves = !isIdentityCurve(still.grade.curves);
    const targetNonIdentity = !isIdentityCurve(rec.grade.curves);
    /* strip the still's curves key — the three-case law below owns it */
    const { curves: _curves, ...rest } = still.grade;
    const patch: GradePatch = {
      ...rest,
      /* a still without a qualifier CLEARS the target's (reset-then-set) */
      qualifier: still.grade.qualifier ?? null,
      ...(stillHasCurves
        ? { curves: { master: still.grade.curves!.master.map((p) => ({ ...p })) } }
        : targetNonIdentity
          ? { curves: { master: [] } }
          : {}),
    };
    rec.setGrade(patch);
    tell();
  };

  const applyStill = (still: Still, e: MouseEvent<HTMLButtonElement>) => {
    if (e.altKey) {
      saveStill(); // the promoted seam's old gesture — one handler, both routes
      return;
    }
    /* click = APPLY the still to the current target (replace-not-merge). */
    applyStillToTarget(still);
  };

  const exportDrx = (still: Still) => {
    useUi.getState().pushToast({
      kind: 'info',
      title: 'Stills',
      detail: `PowerGrade .drx export for “${still.name}” lands with the render round — the grade record itself is real (mockGrades)`,
    });
  };

  /* the #70 menu items — Apply / Delete / Export PowerGrade (both §4.9
     routes share one builder so the routes can never disagree) */
  const stillMenuItems = (st: Still): MenuItem[] => [
    {
      id: 'apply',
      label: 'Apply',
      tip: 'Replace the current grade target with this still (one undoable entry)',
      onSelect: () => applyStillToTarget(st),
    },
    {
      id: 'delete',
      label: 'Delete',
      danger: true,
      tip: 'Delete this still (view state — never undoable doc data)',
      onSelect: () => removeColorStill(st.id),
    },
    {
      id: 'export',
      label: 'Export PowerGrade',
      tip: 'PowerGrade .drx export — render-round boundary',
      onSelect: () => exportDrx(st),
    },
  ];
  const openStillMenu = (st: Still, e: MouseEvent) => {
    e.preventDefault();
    menu.open(e.clientX, e.clientY, stillMenuItems(st), 'stills');
  };
  const onCardKeyDown = (st: Still, e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!isMenuKey(e)) return;
    e.preventDefault();
    menu.openForElement(e.currentTarget, stillMenuItems(st), 'stills');
  };

  return (
    <div data-testid="shell-stills" className="flex h-full min-h-0 w-full flex-col bg-shell">
      <div className="flex items-center gap-2 border-b border-hairline px-2.5 py-1.5">
        {/* A2-R5: the header + count rename — Gallery (the surface key and
            every testid are stable; only the label changed) */}
        <span className="text-[11px] font-semibold text-tprimary">Gallery</span>
        <span data-testid="shell-stills-count" className="mono text-[10px] text-tfaint">{stills.length}</span>
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
      <div className="scroll-y min-h-0 flex-1 p-1.5" role="list" aria-label="Gallery stills">
        <div className="grid grid-cols-2 gap-1.5">
          {stills.map((st) => (
            <div
              key={st.id}
              data-testid={`shell-still-${st.id}`}
              role="listitem"
              className="group flex flex-col overflow-hidden rounded-[var(--radius)] border border-soft bg-panel text-left transition-colors hover:border-strong"
            >
              {/* the card — click = apply to the current grade target
                  (⌥-click = save the target's grade, the promoted seam);
                  right-click / Shift+F10 = the #70 context menu (the
                  per-card button row is DEAD — Resolve has zero per-card
                  buttons) */}
              <button
                type="button"
                data-testid={`shell-still-${st.id}-apply`}
                aria-label={`Still ${st.name} — click to apply${targetId ? ' to the current grade target' : ''}, alt-click to save the target's grade, right-click for the menu`}
                onClick={(e) => applyStill(st, e)}
                onContextMenu={(e) => openStillMenu(st, e)}
                onKeyDown={(e) => onCardKeyDown(st, e)}
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
            </div>
          ))}
        </div>
        {/* the #97 answer, IN the UI: what a still applies to (clip level —
            the researched Resolve answer; track level is NOT offered) */}
        <p data-testid="shell-stills-scope" className="px-1 pt-2 text-[10px] leading-relaxed text-tfaint">
          {scenes.length
            ? 'Applies to the selected clip\u2019s grade (clip level) — click a card to apply, right-click a card for apply / delete / export. Clip-level presets (gap C59).'
            : ''}
        </p>
      </div>
      {menu.state && <ContextMenu {...menu.state} onClose={menu.close} />}
    </div>
  );
}

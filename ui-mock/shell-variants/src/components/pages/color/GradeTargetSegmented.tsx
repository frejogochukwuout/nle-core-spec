/* GradeTargetSegmented — R25-W3 (DESIGN-R25 §1 R7–R10 / §3 W3 / §6 A2;
   issues th_mtzom4xu "what does this mean?", th_mtzomdge, th_mtzonhlu
   "extremely confusing", th_mtzoo09d "one track? all?"). A2's LEVEL chip:
   the `Clip grade | Timeline grade` segmented pair, ONE shared component
   bound to the store's colorGradeTarget — the SAME atom the inspector
   breadcrumb (chip 2) and the node-graph header both render, so the two
   surfaces can never disagree about which level is being edited (the
   single-source law resolveGradeTargetId already enforces for labels).

   The timeline segment carries A2's EXACT copy — never "one track"
   (Resolve has no track grade; the post-clip timeline grade applies to
   every clip in the timeline, AFTER clip grades). */
import { useUi } from '../../../state/useUiStore';

/** A2's exact timeline-grade tooltip copy (th_mtzoo09d — pinned verbatim). */
export const TIMELINE_GRADE_TIP = 'Timeline grade — applies to every clip in this timeline, after clip grades.';
export const CLIP_GRADE_TIP = 'Clip grade — applies to the selected clip only.';

export function GradeTargetSegmented({ idPrefix = 'shell-color-inspector-' }: { idPrefix?: string }) {
  const target = useUi((s) => s.colorGradeTarget);
  const setTarget = useUi((s) => s.setColorGradeTarget);
  const seg = (active: boolean) =>
    `px-[7px] py-[2px] text-[10px] font-semibold tracking-wide whitespace-nowrap transition-colors ${
      active ? 'bg-accent/15 text-tprimary' : 'text-tmuted hover:text-tprimary'
    }`;
  return (
    <div
      role="group"
      aria-label="Grade level"
      className="flex shrink-0 items-stretch overflow-hidden rounded-[3px] border border-strong bg-inset"
    >
      <button
        type="button"
        aria-pressed={target === 'clip'}
        aria-label="Grade target: selected clip"
        data-testid={`${idPrefix}target-clip`}
        title={CLIP_GRADE_TIP}
        data-tip={CLIP_GRADE_TIP}
        onClick={() => setTarget('clip')}
        className={seg(target === 'clip')}
      >
        Clip grade
      </button>
      <button
        type="button"
        aria-pressed={target === 'timeline'}
        aria-label="Grade target: timeline"
        data-testid={`${idPrefix}target-timeline`}
        title={TIMELINE_GRADE_TIP}
        data-tip={TIMELINE_GRADE_TIP}
        onClick={() => setTarget('timeline')}
        className={`border-l border-hairline ${seg(target === 'timeline')}`}
      >
        Timeline grade
      </button>
    </div>
  );
}

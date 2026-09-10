/* SourceEditBar — R20-W2 (DESIGN-R20 D2 / contract §2 / C46): the 7 Resolve
   edit functions as a HORIZONTAL one-shot action bar in the SOURCE-preview
   transport row (Viewer.tsx) — the single-viewer adaptation of Resolve's
   under-source edit overlay / Premiere's source-monitor Insert+Overwrite
   next to the transport. The program-monitor EditOverlay dock is REMOVED in
   the same commit (issue #63: "supposed to apply to the SOURCE (when in
   source preview)").

   Semantics (contract §2, researched):
   - ONE-SHOT ACTIONS, not a mode radiogroup — no NLE keeps a persistent
     insert mode, so no aria-pressed / role=radio anywhere here. Every
     button = one edit action with a data-tip condensed from the reference
     descriptions (timeline_edit_modes (2).html §1.2).
   - Buttons act on sourceMediaId (NOT mediaSelection — the R19 wrong-asset
     bug: Clip.tsx 'Open in viewer' sets sourceMediaId without touching
     mediaSelection, so the old dock could insert a DIFFERENT asset than
     the source monitor showed).
   - Roving tabindex toolbar (ARIA toolbar pattern, horizontal): ONE tab
     stop, ←/→ move + wrap, Home/End jump the ends.
   - HOVER-PLACEMENT PREVIEW (C48): onFocus+onMouseEnter arm the preview
     after a ≥150 ms dwell; onBlur/onMouseLeave cancel + clear (no residue —
     checked against the live store so a sibling's arm is never clobbered).
     Keyboard and pointer have parity (REV-A P2-5). ok:false previews arm
     too — the button's data-tip swaps to the honest refusal reason and the
     shared status line announces it; NO geometry ever paints.
   - R22 (#83: "i think we are missing a few timeline insert / edit modes you
     only showed two buttons here"): ALL SEVEN mode buttons are ALWAYS
     visible inline — the old <560px kebab collapse HID five modes (the
     reviewer saw two) and is RETIRED. R24-W5b (DESIGN-R24 §2 F1-P1)
     SUPERSEDES the R22 narrow-width WRAP law: the bar lives in the FIXED
     32px transport row, and flex-wrap made it two rows tall (46px, measured
     at the 1280×800 floor — the 7th button occluded by the HSplitter z-10,
     colliding with the SourceRangeBar band). The bar is now ONE ROW,
     always: h-8 single-line + overflow-x-auto at genuinely narrow widths
     (the buttons scroll horizontally — reachable, never occluded, never
     wrapped) + the 24px house hit floor on every button; the mode set is
     the reference's six (insert/overwrite/replace/append/ripple/
     fitfill) + placeOnTop (nle_edit_workflow §3.4).
   - R22 (#83): the hover placement preview FADES+SLIDES in/out (the
     reference's own motion: 0.3s ease-in-out, translateY 4px — CSS on the
     timeline's insert-preview layer, prefers-reduced-motion honored), never
     an instant pop.
   - After a commit the preview clears and the viewer STAYS in source mode
     (repeated inserts are the point — Resolve/Premiere behavior). */

import { useEffect, useRef, useState } from 'react';
import { useUi, type InsertMediaMode } from '../../state/useUiStore';
import { useInsertPreview } from '../../hooks/useInsertPreview';
import { tc } from '../../lib/timecode';
import { mediaById } from '../../lib/mockData';
import type { InsertPlan } from '../../lib/insertPlan';
import {
  InsertModeIcon, OverwriteModeIcon, ReplaceModeIcon, AppendModeIcon,
  RippleOverwriteModeIcon, PlaceOnTopModeIcon, FitToFillModeIcon,
  type EditModeIconComponent,
} from '../timeline/editModeIcons';

/** hover/focus dwell before the preview arms — long enough that a fast
 *  pointer pass never flashes geometry, short enough to feel instant. */
const DWELL_MS = 150;
const slug = (label: string) => label.toLowerCase().replace(/\s+/g, '-');

/* primary pair + the secondary five — reference descriptions condensed to
   one line each (contract §1.2 verbatim source, §1.4 condensation law);
   Icon resolved through the ICONS registry (withIcon) */
interface ModeDef { mode: InsertMediaMode; label: string; tip: string; Icon?: EditModeIconComponent }
const PRIMARY: ModeDef[] = [
  { mode: 'insert', label: 'Insert', tip: 'Inserts at the playhead and pushes everything else down — splits a straddling clip' },
  { mode: 'overwrite', label: 'Overwrite', tip: 'Places a new clip at the playhead, writing over whatever clips were there' },
];
const SECONDARY: ModeDef[] = [
  { mode: 'replace', label: 'Replace', tip: 'Replaces a single selected clip with one of the exact same length (needs a clip selection)', Icon: ReplaceModeIcon },
  { mode: 'append', label: 'Append at End', tip: 'Places the source after the last edit on the timeline, wherever the playhead is' },
  { mode: 'rippleOverwrite', label: 'Ripple Overwrite', tip: 'Replaces a shot of a different length — pushes down or pulls in so there are no gaps' },
  { mode: 'placeOnTop', label: 'Place on Top', tip: 'Drops the source on the topmost overlay track (audio falls to its own lane)', Icon: PlaceOnTopModeIcon },
  { mode: 'fitToFill', label: 'Fit to Fill', tip: 'Retimes the marked source (speed change) to fit the In/Out range (needs I/O)', Icon: FitToFillModeIcon },
];
const ICONS: Record<InsertMediaMode, EditModeIconComponent> = {
  insert: InsertModeIcon, overwrite: OverwriteModeIcon, replace: ReplaceModeIcon,
  append: AppendModeIcon, placeOnTop: PlaceOnTopModeIcon,
  rippleOverwrite: RippleOverwriteModeIcon, fitToFill: FitToFillModeIcon,
};
const withIcon = (d: ModeDef): ModeDef => ({ ...d, Icon: d.Icon ?? ICONS[d.mode] });

/* R23-WE (DESIGN-R23 D-E2, #102): the preview MODE BADGE's name source —
   derived from the SAME label table the buttons render (single source: the
   badge never re-spells a mode name; it shows exactly the hovered button's
   own label). The Timeline's insert-preview layer imports this. */
export const MODE_LABELS: Record<InsertMediaMode, string> = Object.fromEntries(
  [...PRIMARY, ...SECONDARY].map((d) => [d.mode, d.label]),
) as Record<InsertMediaMode, string>;

const DESC_ID = 'shell-source-edit-desc';

interface ModeButtonProps {
  def: Required<ModeDef>;
  mediaId: string | null;
  run: (mode: InsertMediaMode) => void;
  setHover: (v: { mediaId: string; mode: InsertMediaMode } | null) => void;
  /** honest refusal text for THIS mode while its preview is armed+refused */
  refusal: string | null;
  asMenuItem?: boolean;
  /** rover props (ref/tabIndex/onFocus) injected by the parent toolbar. */
  extraProps?: Record<string, unknown>;
}

/* The one-shot action button. Owns its dwell timer + arm/clear law; reads
   the LIVE store on clear so it never clobbers a sibling's armed preview. */
function ModeButton({ def, mediaId, run, setHover, refusal, asMenuItem = false, extraProps }: ModeButtonProps) {
  const dwellRef = useRef<number | null>(null);
  const arm = () => {
    if (dwellRef.current !== null || !mediaId) return;
    dwellRef.current = window.setTimeout(() => {
      dwellRef.current = null;
      if (mediaId) setHover({ mediaId, mode: def.mode });
    }, DWELL_MS);
  };
  const disarm = () => {
    if (dwellRef.current !== null) {
      window.clearTimeout(dwellRef.current);
      dwellRef.current = null;
    }
    // clear only OUR arm — a sibling that armed meanwhile stays armed
    const cur = useUi.getState().hoverInsertPreview;
    if (cur && cur.mediaId === mediaId && cur.mode === def.mode) setHover(null);
  };
  // unmount (width collapse / mode-swap) must never leak the timer nor a
  // residue preview — the preview is ambient state with exactly one owner
  useEffect(() => () => {
    if (dwellRef.current !== null) window.clearTimeout(dwellRef.current);
    const cur = useUi.getState().hoverInsertPreview;
    if (cur && cur.mediaId === mediaId && cur.mode === def.mode) useUi.getState().setHoverInsertPreview(null);
  }, [mediaId, def.mode]);

  const tip = refusal ?? def.tip;
  const button = (
    <button
      type="button"
      {...(asMenuItem ? { role: 'menuitem' as const, tabIndex: -1 } : {})}
      {...(extraProps ?? {})}
      /* the house 24px hit floor (R24-W5b): was 22px — the F1 hit-floor
         sweep; icon-btn is flex-shrink:0 so the row scrolls, never squishes */
      className="icon-btn !h-[24px] !w-[24px]"
      aria-label={def.label}
      aria-describedby={DESC_ID}
      data-testid={`shell-source-edit-${slug(def.label)}`}
      data-tip={tip}
      data-refused={refusal ? 'true' : undefined}
      onClick={() => run(def.mode)}
      onMouseEnter={arm}
      onMouseLeave={disarm}
      onFocus={arm}
      onBlur={disarm}
    >
      <def.Icon size={16} />
    </button>
  );
  return button;
}

export function SourceEditBar() {
  const sourceMediaId = useUi((s) => s.sourceMediaId);
  const insertMediaAt = useUi((s) => s.insertMediaAt);
  const pushToast = useUi((s) => s.pushToast);
  const setHover = useUi((s) => s.setHoverInsertPreview);
  const plan = useInsertPreview();

  /* ---- roving tabindex (Toolbar2 pattern, horizontal): ONE tab stop;
     ←/→ move in DOM order (wrapping), Home/End jump the ends. The roster
     is ALL SEVEN mode buttons — always visible (#83), never a kebab. */
  const roverRefs = useRef<(HTMLElement | null)[]>([]);
  const [rover, setRover] = useState(0);
  const focusRover = (i: number) => {
    const n = roverRefs.current.length;
    const idx = ((i % n) + n) % n;
    setRover(idx);
    roverRefs.current[idx]?.focus();
  };
  const onToolbarKey = (e: React.KeyboardEvent) => {
    const n = roverRefs.current.length;
    if (n === 0) return;
    const cur = roverRefs.current.indexOf(document.activeElement as HTMLElement);
    const from = cur === -1 ? rover : cur;
    if (e.key === 'ArrowRight') { e.preventDefault(); focusRover(from + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); focusRover(from - 1); }
    else if (e.key === 'Home') { e.preventDefault(); focusRover(0); }
    else if (e.key === 'End') { e.preventDefault(); focusRover(n - 1); }
  };
  const roverProps = (i: number) => ({
    ref: (el: HTMLElement | null) => { roverRefs.current[i] = el; },
    tabIndex: i === rover ? 0 : -1,
    onFocus: () => setRover(i),
  });

  /* ---- the commit: one-shot action on the SOURCE asset (wrong-asset bug
     fix — never mediaSelection). Refusal honesty lives in the planner.
     After the commit the preview clears and the viewer STAYS in source
     mode (§2.6 — repeated inserts are the point). Returns whether it
     committed — the menu's activation wrapper returns focus to the kebab
     only on a real commit (the refusal path keeps the menu open). */
  const run = (mode: InsertMediaMode): boolean => {
    if (!sourceMediaId) {
      pushToast({
        kind: 'info',
        title: 'Edit functions',
        detail: 'open a media asset in the source viewer first (the edit functions act on the source asset — Resolve semantics)',
      });
      return false;
    }
    insertMediaAt(sourceMediaId, mode);
    useUi.getState().setHoverInsertPreview(null); // preview clears on commit
    return true;
  };

  /* ---- the shared live description (aria-describedby target): announces
     the armed preview / refusal for pointer AND keyboard users (§3.2). */
  const descText = describePreview(plan, sourceMediaId);

  /* the honest-refusal tip for a mode: the plan is the ARMED preview — it
     only ever belongs to the hovered/focused button, so a matching mode
     with ok:false swaps exactly that button's tip (§3.2 refusal law). */
  const refusalFor = (mode: InsertMediaMode): string | null =>
    plan && plan.mode === mode && !plan.ok && plan.reason ? `${plan.reason.title} — ${plan.reason.detail}` : null;

  const withIcons = (d: ModeDef): Required<ModeDef> => ({ ...d, Icon: d.Icon ?? ICONS[d.mode] });
  const primary = PRIMARY.map(withIcons);
  const secondary = SECONDARY.map(withIcons);

  return (
    <div
      data-testid="shell-source-edit-bar"
      role="toolbar"
      aria-label="Edit functions"
      aria-orientation="horizontal"
      onKeyDown={onToolbarKey}
      /* R24-W5b (F1 P1): ONE ROW — h-8 (the transport row's own height,
         no two-row wrap can overflow it), no flex-wrap, overflow-x-auto
         as the narrow-width escape (buttons scroll, never hide/occlude). */
      className="flex h-8 w-full min-w-0 items-center gap-0.5 overflow-x-auto"
    >
      {primary.map((def, i) => (
        <ModeButton
          key={def.mode}
          def={def}
          mediaId={sourceMediaId}
          run={run}
          setHover={setHover}
          refusal={refusalFor(def.mode)}
          extraProps={roverProps(i)}
        />
      ))}

      {/* hairline divider: the universal pair | the secondary modes */}
      <div role="separator" aria-orientation="vertical" className="mx-1 h-[16px] w-px shrink-0 bg-hairline" />

      {secondary.map((def, i) => (
        <ModeButton
          key={def.mode}
          def={def}
          mediaId={sourceMediaId}
          run={run}
          setHover={setHover}
          refusal={refusalFor(def.mode)}
          extraProps={roverProps(i + 2)}
        />
      ))}

      {/* shared live description — one element, described-by every button
          (a11y: the preview state is announced, not just visible) */}
      <span
        id={DESC_ID}
        role="status"
        data-testid="shell-source-edit-desc"
        className="sr-only"
      >
        {descText}
      </span>
    </div>
  );
}

/** the status-line text for the armed plan (contract §3.2: "Preview: insert
 *  sunset_timelapse at 00:00:08:12 on V1 — 2 clips shift right"). */
function describePreview(plan: InsertPlan | null, mediaId: string | null): string {
  const m = mediaId ? mediaById(mediaId) : undefined;
  if (!plan) {
    return m
      ? `Edit functions act on the source asset ${m.name}. Hover a mode to preview its placement.`
      : 'Edit functions act on the source asset — none loaded.';
  }
  if (!plan.ok) {
    return plan.reason ? `Refused: ${plan.reason.title} — ${plan.reason.detail}` : 'No preview available.';
  }
  const g = plan.geometry.ghost;
  const n = plan.geometry.displaced?.length ?? 0;
  const parts = [
    `Preview: ${plan.mode} ${plan.mediaName}`,
    g ? ` at ${tc(g.start)} on lane ${g.laneIndex + 1}` : '',
    g?.speed !== undefined ? ` at ${g.speed.toFixed(2)}×` : '',
    n > 0 ? ` — ${n} clip${n > 1 ? 's' : ''} shift` : '',
  ];
  return parts.filter(Boolean).join('');
}

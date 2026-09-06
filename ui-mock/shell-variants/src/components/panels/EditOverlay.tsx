/* EditOverlay — R19 B5: the 7 Resolve edit functions (nle_edit_workflow.html
   §3.4) as a VERTICAL strip of icon buttons docked on the viewer's right
   edge (B2's Viewer mounts <EditOverlay/> — the component itself is just the
   44px column). Reference rows: Insert / Overwrite / Replace / Fit to Fill —
   divider — Place on Top / Append at End / Ripple Overwrite.

   Wiring law (Resolve semantics): the edit functions act on the SOURCE
   selection — mediaSelection[0]. No media selected → the honest "select a
   media asset in the pool first" toast, never a silent no-op. With media,
   every button calls insertMediaAt(mediaId, mode) — real placement (frame-
   snap + half-open spans + ripple laws, spec 06 §5.9), undoable as one step.
   replace/fitToFill degrade to their own honest toasts INSIDE the store op
   when the clip selection / loop range is missing.

   Keyboard: roving-tabindex toolbar (the Toolbar2 pattern, vertical) — one
   tab stop, ↑/↓ move + wrap, Home/End jump the ends (ARIA toolbar pattern,
   spec 18 §11.1 P2). */

import { useRef, useState, type ComponentType } from 'react';
import {
  ArrowDownToLine, ChevronsRight, CornerDownRight, Expand, Layers, ListPlus, Replace,
} from 'lucide-react';
import { useUi, type InsertMediaMode } from '../../state/useUiStore';

const BUTTONS: { mode: InsertMediaMode; label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }>; tip: string }[] = [
  { mode: 'insert', label: 'Insert', icon: CornerDownRight, tip: 'Insert — ripple the timeline right at the playhead' },
  { mode: 'overwrite', label: 'Overwrite', icon: ArrowDownToLine, tip: 'Overwrite — lay the source over whatever is under the playhead' },
  { mode: 'replace', label: 'Replace', icon: Replace, tip: 'Replace — swap the selected clip for the source (needs a clip selection)' },
  { mode: 'fitToFill', label: 'Fit to Fill', icon: Expand, tip: 'Fit to Fill — retime the source into the In/Out range (needs I/O)' },
  { mode: 'placeOnTop', label: 'Place on Top', icon: Layers, tip: 'Place on Top — drop the source on the topmost overlay track' },
  { mode: 'append', label: 'Append at End', icon: ListPlus, tip: 'Append at End — add the source after the last clip' },
  { mode: 'rippleOverwrite', label: 'Ripple Overwrite', icon: ChevronsRight, tip: 'Ripple Overwrite — overwrite, then close the gap' },
];

const slug = (label: string) => label.toLowerCase().replace(/\s+/g, '-');
/** button order index of the divider — after "Fit to Fill" (reference §3.4) */
const DIVIDER_AFTER = 3;

export function EditOverlay() {
  const mediaSelection = useUi((s) => s.mediaSelection);
  const insertMediaAt = useUi((s) => s.insertMediaAt);
  const pushToast = useUi((s) => s.pushToast);

  /* roving tabindex (Toolbar2 pattern, vertical variant): exactly ONE tab
     stop; ↑/↓ move in DOM order (wrapping), Home/End jump the ends */
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [rover, setRover] = useState(0);
  const focusRover = (i: number) => {
    const n = btnRefs.current.length;
    const idx = ((i % n) + n) % n;
    setRover(idx);
    btnRefs.current[idx]?.focus();
  };
  const onToolbarKey = (e: React.KeyboardEvent) => {
    const n = btnRefs.current.length;
    if (n === 0) return;
    const cur = btnRefs.current.indexOf(document.activeElement as HTMLButtonElement);
    const from = cur === -1 ? rover : cur;
    if (e.key === 'ArrowDown') { e.preventDefault(); focusRover(from + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusRover(from - 1); }
    else if (e.key === 'Home') { e.preventDefault(); focusRover(0); }
    else if (e.key === 'End') { e.preventDefault(); focusRover(n - 1); }
  };
  const roverProps = (i: number) => ({
    ref: (el: HTMLButtonElement | null) => { btnRefs.current[i] = el; },
    tabIndex: i === rover ? 0 : -1,
    onFocus: () => setRover(i),
  });

  const run = (mode: InsertMediaMode) => {
    const mediaId = mediaSelection[0];
    if (!mediaId) {
      /* honest refusal — the edit functions act on the source selection */
      pushToast({
        kind: 'info',
        title: 'Edit functions',
        detail: 'select a media asset in the pool first (the edit functions act on the source selection — Resolve semantics)',
      });
      return;
    }
    insertMediaAt(mediaId, mode);
  };

  return (
    <div
      data-testid="shell-edit-overlay"
      role="toolbar"
      aria-label="Edit functions"
      aria-orientation="vertical"
      onKeyDown={onToolbarKey}
      className="flex w-[44px] shrink-0 flex-col items-center gap-0.5 border-l border-hairline bg-panel/95 py-2"
    >
      {BUTTONS.map((b, i) => {
        const Icon = b.icon;
        const button = (
          <button
            {...roverProps(i)}
            key={b.mode}
            type="button"
            className="icon-btn boxed h-[32px] w-[32px]"
            aria-label={b.label}
            data-testid={`shell-edit-overlay-${slug(b.label)}`}
            data-tip={b.tip}
            onClick={() => run(b.mode)}
          >
            <Icon size={14} strokeWidth={1.7} />
          </button>
        );
        return (
          <div key={b.mode} className="flex flex-col items-center">
            {button}
            {/* divider after Fit to Fill — in-place edits vs structural
                (reference's border-t divider row) */}
            {i === DIVIDER_AFTER && <div role="separator" className="my-1 h-px w-[24px] bg-hairline" />}
          </div>
        );
      })}
    </div>
  );
}

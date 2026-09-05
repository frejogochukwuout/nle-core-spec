/* toolbar2 — spec 18 §4.1: panel toggles left, project title center,
   inspector/fullscreen/quick-export right. Mock's Index/Sound Library/
   Mixer/Metadata dropped per §8 chrome-removal ledger. */

import { useRef, useState } from 'react';
import { PanelLeft, Sparkles, SlidersHorizontal, Maximize2 } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { project } from '../../lib/mockData';

export function Toolbar2() {
  const panels = useUi((s) => s.panels);
  const togglePanel = useUi((s) => s.togglePanel);
  const pushToast = useUi((s) => s.pushToast);

  /* roving tabindex (spec 18 §11.1 P2, ARIA toolbar pattern): exactly ONE
     button is a tab stop; ←/→ move focus between buttons in DOM order
     (wrapping), Home/End jump to the ends. Tab is left natural — it exits
     the toolbar to the next document stop, as the pattern prescribes. */
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [rover, setRover] = useState(0);
  const focusRover = (i: number) => {
    const n = btnRefs.current.length;
    const idx = ((i % n) + n) % n; // wrap in both directions
    setRover(idx);
    btnRefs.current[idx]?.focus();
  };
  const onToolbarKey = (e: React.KeyboardEvent) => {
    const n = btnRefs.current.length;
    if (n === 0) return;
    /* focus (document.activeElement) is the source of truth — the rover
       state only tracks the tab stop, so direct .focus() calls (tests,
       screen readers) can never desync the arrow model */
    const cur = btnRefs.current.indexOf(document.activeElement as HTMLButtonElement);
    const from = cur === -1 ? rover : cur;
    if (e.key === 'ArrowRight') { e.preventDefault(); focusRover(from + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); focusRover(from - 1); }
    else if (e.key === 'Home') { e.preventDefault(); focusRover(0); }
    else if (e.key === 'End') { e.preventDefault(); focusRover(n - 1); }
  };
  /* per-button roving props (spread in DOM order: pool=0, effects=1,
     inspector=2, fullscreen=3); onFocus keeps the tab stop synced with
     real focus so clicks/mouse users don't fight the arrow model */
  const roverProps = (i: number) => ({
    ref: (el: HTMLButtonElement | null) => { btnRefs.current[i] = el; },
    tabIndex: i === rover ? 0 : -1,
    onFocus: () => setRover(i),
  });

  return (
    <div
      data-testid="shell-toolbar"
      role="toolbar"
      aria-label="Shell toolbar"
      onKeyDown={onToolbarKey}
      className="flex items-center gap-2 border-b border-hairline bg-shell px-2.5"
      style={{ height: 'var(--bar-h)', minHeight: 'var(--bar-h)' }}
    >
      <div className="flex items-center gap-1.5 pr-1" aria-hidden="true">
        <span className="h-[11px] w-[11px] rounded-full bg-[#fd5f4d]" />
        <span className="h-[11px] w-[11px] rounded-full bg-[#fdbb2e]" />
        <span className="h-[11px] w-[11px] rounded-full bg-[#28c83f]" />
      </div>

      <div className="vsep" />

      <button
        {...roverProps(0)}
        className={`toolbtn ${panels.mediaPool ? 'active' : ''}`}
        data-testid="shell-toolbar-btn-mediapool"
        aria-pressed={panels.mediaPool}
        onClick={() => togglePanel('mediaPool')}
      >
        <PanelLeft size={14} strokeWidth={1.7} />
        <span>Media Pool</span>
      </button>
      <button
        {...roverProps(1)}
        className={`toolbtn ${panels.effects ? 'active' : ''}`}
        data-testid="shell-toolbar-btn-effects"
        aria-pressed={panels.effects}
        onClick={() => togglePanel('effects')}
      >
        <Sparkles size={14} strokeWidth={1.7} />
        <span>Effects</span>
      </button>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-3">
        <span className="max-w-[240px] truncate font-semibold text-tprimary" title={project.metadata.name}>
          {project.metadata.name}
        </span>
        <span className="text-tfaint">|</span>
        <span className="text-tmuted">{project.metadata.status}</span>
      </div>

      <button
        {...roverProps(2)}
        className={`toolbtn ${panels.inspector ? 'active' : ''}`}
        data-testid="shell-toolbar-btn-inspector"
        aria-pressed={panels.inspector}
        onClick={() => togglePanel('inspector')}
      >
        <SlidersHorizontal size={14} strokeWidth={1.8} />
        <span>Inspector</span>
      </button>
      <button
        {...roverProps(3)}
        className="icon-btn"
        data-tip="Toggle fullscreen viewer"
        aria-label="Toggle fullscreen viewer"
        /* honest mock: the v2 fullscreen viewer surface isn't built — the
           control answers with the §8.5 deferral toast instead of silence */
        onClick={() => pushToast({ kind: 'info', title: 'Fullscreen viewer', detail: 'v2 surface (spec 18 §8.5) — not built in the mock' })}
      >
        <Maximize2 size={13} strokeWidth={1.6} />
      </button>
    </div>
  );
}

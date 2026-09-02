/* toolbar2 — spec 18 §4.1: panel toggles left, project title center,
   inspector/fullscreen/quick-export right. Mock's Index/Sound Library/
   Mixer/Metadata dropped per §8 chrome-removal ledger. */

import { PanelLeft, Sparkles, SlidersHorizontal, Maximize2 } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { project } from '../../lib/mockData';

export function Toolbar2() {
  const panels = useUi((s) => s.panels);
  const togglePanel = useUi((s) => s.togglePanel);

  return (
    <div
      data-testid="shell-toolbar"
      role="toolbar"
      aria-label="Shell toolbar"
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
        className={`toolbtn ${panels.mediaPool ? 'active' : ''}`}
        data-testid="shell-toolbar-btn-mediapool"
        aria-pressed={panels.mediaPool}
        onClick={() => togglePanel('mediaPool')}
      >
        <PanelLeft size={14} strokeWidth={1.7} />
        <span>Media Pool</span>
      </button>
      <button
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
        className={`toolbtn ${panels.inspector ? 'active' : ''}`}
        data-testid="shell-toolbar-btn-inspector"
        aria-pressed={panels.inspector}
        onClick={() => togglePanel('inspector')}
      >
        <SlidersHorizontal size={14} strokeWidth={1.8} />
        <span>Inspector</span>
      </button>
      <button className="icon-btn" data-tip="Toggle fullscreen viewer" aria-label="Toggle fullscreen viewer">
        <Maximize2 size={13} strokeWidth={1.6} />
      </button>
    </div>
  );
}

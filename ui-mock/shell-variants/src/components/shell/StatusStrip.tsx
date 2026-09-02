/* StatusStrip — spec 18 §3.1/§6.3: 12px strip, save-status chip (autosave
   lifecycle), selection info (aria-live), duration, zoom readout. */

import { useUi } from '../../state/useUiStore';
import { sceneDuration } from '../../lib/mockData';
import { tc } from '../../lib/timecode';

export function StatusStrip() {
  const scenes = useUi((s) => s.scenes);
  const activeSceneId = useUi((s) => s.activeSceneId);
  const selection = useUi((s) => s.selection);
  const pxPerSec = useUi((s) => s.pxPerSec);
  const scene = scenes.find((s) => s.id === activeSceneId) ?? scenes[0];

  return (
    <div className="flex shrink-0 items-center gap-3 border-t border-hairline bg-shell px-3 text-[11px] text-tmuted" style={{ height: 14, minHeight: 14 }}>
      <span data-testid="shell-status-save" className="flex items-center gap-1">
        <span className="h-[5px] w-[5px] rounded-full bg-[var(--mk-green)]" />
        Saved 12s ago
      </span>
      <span aria-live="polite" className="mono">
        {selection.length > 0 ? `${selection.length} clip${selection.length > 1 ? 's' : ''} selected` : 'no selection'}
      </span>
      <span className="mono">{tc(sceneDuration(scene))}</span>
      <span className="grow" />
      <span className="mono">{Math.round(pxPerSec)} px/s</span>
      <span className="mono">OPFS · local</span>
    </div>
  );
}

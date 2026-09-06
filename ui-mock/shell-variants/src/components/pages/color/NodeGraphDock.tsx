/* NodeGraphDock — R22 (DESIGN-R22 D4; issues #74/#78). The node graph as a
   TOGGLEABLE CONSOLE in the timeline area — the exact mixer-console
   mechanism: "what falls out of this inspector panel should be things that
   are global or require a separate view (like node editor, etc.) which
   should also be toggled just like mixer console" (#78).

   The #74 fix (nodes penetrating the edge into the next view): the dock
   CLIPS (overflow-hidden) and the workspace inside scrolls at its natural
   size (the reference workspace is ~1010×250 — nodes at x≥670; at the
   1280×800 floor the dock shows a pannable viewport, not the whole chain:
   honest, no penetration, no invisible clipping — the reference's own hand
   tool + scrollbars pan).

   Default OFF (colorNodesDock in the store). Toggled from Toolbar2
   (right side, color page only). F6 region parity: the AppShell assigns
   the [6]/[7] region slots to the visible timeline-area consoles
   (single-writer per index — see AppShell). */

import { Hand, Layers, MousePointer2 } from 'lucide-react';
import { useUi } from '../../../state/useUiStore';
import { ColorNodeGraph } from './ColorNodeGraph';

export function NodeGraphDock() {
  const page = useUi((s) => s.page);
  if (page !== 'color') return null;

  return (
    <div
      data-testid="shell-color-nodedock"
      className="flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-l border-hairline bg-panel"
      style={{ width: '48%', minWidth: 420 }}
      aria-label="Node graph console"
    >
      {/* dock header (26px — the shell bar grammar; the console's provenance
          label + the pan hint for the floor case) */}
      <div className="flex h-[26px] shrink-0 items-center gap-2 border-b border-hairline px-2">
        <Layers size={12} aria-hidden className="text-tmuted" />
        <span className="text-[11px] font-medium text-tprimary">Nodes</span>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-tfaint" title="The reference workspace (1010×250) pans inside the dock — scroll or drag with the hand tool">
          <Hand size={10} aria-hidden /> pan
        </span>
        <MousePointer2 size={10} aria-hidden className="text-tfaint" />
      </div>

      {/* the workspace — SCROLLABLE at natural size, the dock clips (#74) */}
      <div className="scroll-both min-h-0 flex-1 overflow-auto" style={{ background: '#24252a' }}>
        <ColorNodeGraph docked />
      </div>
    </div>
  );
}

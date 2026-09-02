/* CheatSheet — spec 16 §7.3 modal opened via "?". Single ShortcutMap source
   (SCOUT-R8-C 10-take), platform-aware glyphs. */

import { X, FolderOpen } from 'lucide-react';
import { useUi } from '../../state/useUiStore';

const GROUPS: { title: string; rows: [string, string][] }[] = [
  {
    title: 'Playback',
    rows: [
      ['Space', 'Play / pause'],
      ['←  →', 'Step ±1 frame'],
      ['⇧←  ⇧→', 'Step ±10 frames'],
      ['Home / End', 'Go to start / end'],
      ['I / O', 'Mark in / mark out'],
      ['⌥X', 'Clear in + out'],
    ],
  },
  {
    title: 'Tools',
    rows: [
      ['V', 'Selection tool'],
      ['B', 'Blade tool'],
      ['T', 'Roll tool'],
      ['Y / U', 'Slip / slide'],
      ['N', 'Toggle snapping'],
      ['R', 'Toggle ripple mode'],
    ],
  },
  {
    title: 'Editing',
    rows: [
      ['⌘B / S', 'Split at playhead'],
      ['⌫', 'Delete (leaves gap!)'],
      ['⇧⌫', 'Ripple delete'],
      ['⌘D', 'Duplicate'],
      [', / .', 'Nudge ±1 frame'],
      ['⇧, / ⇧.', 'Nudge ±10 frames'],
    ],
  },
  {
    title: 'Project',
    rows: [
      ['⌘Z / ⇧⌘Z', 'Undo / redo'],
      ['⌘S', 'Save'],
      ['⌘I', 'Import media'],
      ['⌘1 / ⌘2 / ⌘3', 'Edit / Color / Deliver'],
      ['M / ⇧M', 'Add / delete marker'],
      ['?', 'This cheat sheet'],
    ],
  },
];

export function CheatSheet() {
  const open = useUi((s) => s.cheatOpen);
  const close = useUi((s) => s.setCheatOpen);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard cheat sheet"
      onClick={() => close(false)}
    >
      <div
        className="max-h-[80vh] w-[640px] max-w-[92vw] overflow-hidden rounded-lg border border-strong bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-hairline bg-raised px-4 py-2.5">
          <span className="text-[14px] font-semibold text-tprimary">Keyboard cheat sheet</span>
          <span className="text-[10.5px] text-tfaint">spec 16 · ~180 bindings · showing core set</span>
          <div className="grow" />
          <button onClick={() => close(false)} aria-label="Close cheat sheet" className="icon-btn !h-7 !w-7"><X size={14} /></button>
        </div>
        <div className="scroll-y grid max-h-[60vh] grid-cols-2 gap-x-6 gap-y-4 px-5 py-4">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-tfaint">{g.title}</div>
              <div className="flex flex-col gap-1">
                {g.rows.map(([k, d]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3">
                    <span className="mono rounded border border-soft bg-inset px-1.5 py-0.5 text-[10.5px] text-tprimary">{k}</span>
                    <span className="text-[11px] text-tmuted">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-hairline bg-raised px-4 py-2.5 text-[10.5px] text-tfaint">
          <FolderOpen size={12} />
          Footer: load the 30s sample project (spec 18 §4.10) — doubles as the test fixture.
          <button className="ml-auto text-accent underline-offset-2 hover:underline">Load sample project</button>
        </div>
      </div>
    </div>
  );
}

/* AppDock — spec 18 §4.8: brand left, THREE-page dock center (Edit / Color /
   Deliver — mock's 7 pages collapsed), cheat-sheet + settings right.
   Icon-only in resolve theme, icon+label in studio/light; aria-label keeps
   the accessible name regardless of visible label. */

import { ScissorsLineDashed, Palette, Send, Keyboard, Settings2, House } from 'lucide-react';
import { useUi, type Page } from '../../state/useUiStore';

const PAGES: { id: Page; label: string; icon: typeof ScissorsLineDashed; tip: string }[] = [
  { id: 'edit', label: 'Edit', icon: ScissorsLineDashed, tip: 'Edit — rough cut (⌘1)' },
  { id: 'color', label: 'Color', icon: Palette, tip: 'Color — grading (⌘2)' },
  { id: 'deliver', label: 'Deliver', icon: Send, tip: 'Deliver — export & handoff (⌘3)' },
];

export function AppDock() {
  const page = useUi((s) => s.page);
  const setPage = useUi((s) => s.setPage);
  const setCheatOpen = useUi((s) => s.setCheatOpen);

  return (
    <div
      data-testid="shell-dock"
      className="flex shrink-0 items-center border-t border-hairline bg-app px-3"
      style={{ height: 42, minHeight: 42 }}
    >
      <div className="mr-4 flex shrink-0 items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="11" stroke="var(--border-strong)" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="4" fill="var(--type-video)" />
        </svg>
        <span className="whitespace-nowrap text-[12px] font-medium text-tprimary">
          nle-core <span className="text-tmuted">· shell study</span>
        </span>
      </div>

      <div className="flex h-full flex-1 items-center justify-center gap-0">
        {PAGES.map((p) => {
          const Icon = p.icon;
          const active = page === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPage(p.id)}
              data-testid={`shell-dock-page-${p.id}`}
              data-tip={p.tip}
              aria-label={p.label}
              aria-current={active ? 'page' : undefined}
              className={`dock-tab relative flex h-full items-center gap-1.5 px-4 ${active ? 'text-tprimary' : 'text-tmuted hover:text-tprimary'}`}
            >
              <Icon size={19} strokeWidth={1.6} />
              <span className="dock-label">{p.label}</span>
              {active && <div className="absolute inset-x-3 bottom-0 h-[2px]" style={{ background: 'var(--accent-selection)' }} />}
            </button>
          );
        })}
      </div>

      <div className="ml-4 flex shrink-0 items-center gap-1">
        <button className="icon-btn" onClick={() => setCheatOpen(true)} data-tip="Keyboard cheat sheet (?)" aria-label="Keyboard cheat sheet">
          <Keyboard size={16} strokeWidth={1.7} />
        </button>
        <button className="icon-btn" data-tip="Project home" aria-label="Project home">
          <House size={16} strokeWidth={1.7} />
        </button>
        <button className="icon-btn" data-tip="Settings (deferred §8.12)" aria-label="Settings">
          <Settings2 size={16} strokeWidth={1.7} />
        </button>
      </div>
    </div>
  );
}

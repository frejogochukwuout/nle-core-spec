/* ConsoleTabs — R25-W3 (DESIGN-R25 §1 R11/R12 / §3 W3 / §6 A2; issues
   th_mtzokuem "panel or under inspector?", th_mtzoi7vr "console multi-tab
   next to timeline"). The reviewer's ruling supersedes BOTH the R23-WB
   console-row dock AND the R24-#68 under-viewer pane: the color page's
   console row carries a thin 26px TAB STRIP — [Timeline | Nodes | Scopes] —
   and the ACTIVE tab's panel takes the row's space ("it takes the same
   space just a thin tab showing up to toggle both"). Rendered on the COLOR
   page only (every other page's console row is timeline-only, so the strip
   would be a lone tab answering nothing).

   The strip follows the house tab grammar (the ScopesDock/ColorInspector
   tab bars): role=tablist, roving tabindex (exactly ONE tab stop, ←/→
   wrap), aria-selected carries the active panel. The tabs write
   consoleTab — VIEW STATE (never snapshotted; the store's setConsoleTab
   is a plain set, so a flip can never mint undo history). The Timeline
   tab is always present and the default; the Nodes/Scopes tabs mount
   their panels in the AppShell's console row (the graph's own × returns
   here). Toolbar2's Scopes/Nodes buttons activate their tab (the button
   stays aria-pressed reflecting the tab-active state). */

import { useRef } from 'react';
import { useUi } from '../../../state/useUiStore';

type ConsoleTabId = 'timeline' | 'nodes' | 'scopes';

const CONSOLE_TABS: { id: ConsoleTabId; label: string }[] = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'nodes', label: 'Nodes' },
  { id: 'scopes', label: 'Scopes' },
];

export function ConsoleTabs() {
  const tab = useUi((s) => s.consoleTab);
  const setTab = useUi((s) => s.setConsoleTab);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onTabsKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const idx = CONSOLE_TABS.findIndex((t) => t.id === tab);
    const next = (idx + (e.key === 'ArrowRight' ? 1 : -1) + CONSOLE_TABS.length) % CONSOLE_TABS.length;
    setTab(CONSOLE_TABS[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Console"
      data-testid="shell-console-tabs"
      className="flex h-[26px] shrink-0 items-stretch border-b border-hairline bg-shell"
      onKeyDown={onTabsKeyDown}
    >
      {CONSOLE_TABS.map((t, i) => {
        const selected = tab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            ref={(el) => { refs.current[i] = el; }}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            data-testid={`shell-console-tab-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 text-[11px] font-medium transition-colors ${
              selected ? 'border-accent text-tprimary' : 'border-transparent text-tmuted hover:text-tprimary'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

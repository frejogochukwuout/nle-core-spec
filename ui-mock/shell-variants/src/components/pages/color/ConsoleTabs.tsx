/* ConsoleTabs — R25-W3 (DESIGN-R25 §1 R11/R12 / §3 W3 / §6 A2; issues
   th_mtzokuem "panel or under inspector?", th_mtzoi7vr "console multi-tab
   next to timeline") → R25-W5 (DESIGN-R25 §1 R18 / §3 W5; issue
   th_mtzp4arw "this perhaps can be kept in a separate panel the same place
   we do mixer console etc. … as it is not inspection"). The reviewer's
   ruling supersedes BOTH the R23-WB console-row dock AND the R24-#68
   under-viewer pane: the console row carries a thin 26px TAB STRIP and the
   ACTIVE tab's panel takes the row's space ("it takes the same space just
   a thin tab showing up to toggle both").

   W3 shipped the strip COLOR-ONLY: [Timeline | Nodes | Scopes]. W5 widens
   the grammar to the DELIVER page: [Timeline | Export] — the export summary
   is operational readout, not inspection, so it joins the console-row panel
   family where "we do mixer console etc." The tab LIST is parameterized per
   page (the strip itself stays page-agnostic); every other page's console
   row is timeline-only, so the AppShell still mounts no strip there (a lone
   tab answers nothing).

   The strip follows the house tab grammar (the ScopesDock/ColorInspector
   tab bars): role=tablist, roving tabindex (exactly ONE tab stop, ←/→
   wrap), aria-selected carries the active panel. The tabs write
   consoleTab — VIEW STATE (never snapshotted; the store's setConsoleTab
   is a plain set, so a flip can never mint undo history). The Timeline
   tab is always present and the default; the Nodes/Scopes tabs mount
   their panels in the AppShell's console row (the graph's own × returns
   here); the Export tab mounts DeliverExportConsole. Toolbar2's
   Scopes/Nodes buttons activate their tab (color only — the button stays
   aria-pressed reflecting the tab-active state).

   Standalone honesty: the strip normalizes a consoleTab id its page does
   not carry (a stranded color-only id on deliver, or 'export' on color) to
   'timeline' — the setPage exit law makes that unreachable from the UI,
   but a StoreBoot patch or direct setState could strand one, and a strip
   with NO selected tab would lie about the row's state. */

import { useRef } from 'react';
import { useUi, type Page } from '../../../state/useUiStore';

export type ConsoleTabId = 'timeline' | 'nodes' | 'scopes' | 'export';

/* the strip's per-page grammar — Timeline first + the page's own panels.
   Pages not listed render no strip at all (AppShell mount law). */
const CONSOLE_TABS: Partial<Record<Page, { id: ConsoleTabId; label: string }[]>> = {
  color: [
    { id: 'timeline', label: 'Timeline' },
    { id: 'nodes', label: 'Nodes' },
    { id: 'scopes', label: 'Scopes' },
  ],
  deliver: [
    { id: 'timeline', label: 'Timeline' },
    { id: 'export', label: 'Export' },
  ],
};

/** the tab list a page's strip renders (empty = the page mounts no strip). */
export const consoleTabsForPage = (page: Page): { id: ConsoleTabId; label: string }[] =>
  CONSOLE_TABS[page] ?? [];

export function ConsoleTabs({ page }: { page: 'color' | 'deliver' }) {
  const tab = useUi((s) => s.consoleTab);
  const setTab = useUi((s) => s.setConsoleTab);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const tabs = consoleTabsForPage(page);
  /* standalone honesty: a stranded foreign tab id (color id on deliver /
     'export' on color) falls back to 'timeline' — exactly ONE selected tab
     or the strip lies (unreachable via the UI; the exit law owns it). */
  const active: ConsoleTabId = tabs.some((t) => t.id === tab) ? tab : 'timeline';

  const onTabsKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const idx = tabs.findIndex((t) => t.id === active);
    const next = (idx + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    setTab(tabs[next].id);
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
      {tabs.map((t, i) => {
        const selected = active === t.id;
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

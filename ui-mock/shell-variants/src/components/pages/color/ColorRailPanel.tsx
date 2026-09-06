/* ColorRailPanel — the right-rail tabbed grading panel (R19-B4).
   Self-contained (fills its container — the AppShell rail slot at
   inspectorW 280–560) so the orchestrator's Wave III can mount it directly:
   [Wheels | Qualifier] tabs over the two reference-grade panels. Tabs follow
   the WAI-ARIA tabs pattern (role=tablist/tab, roving tabindex, arrow-key
   tab switch). */

import { useState, type KeyboardEvent } from 'react';
import { WheelsPanel } from './WheelsPanel';
import { QualifierPanel } from './QualifierPanel';

type ColorTab = 'wheels' | 'qualifier';

const TABS: { id: ColorTab; label: string }[] = [
  { id: 'wheels', label: 'Wheels' },
  { id: 'qualifier', label: 'Qualifier' },
];

export function ColorRailPanel() {
  const [tab, setTab] = useState<ColorTab>('wheels');

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, current: ColorTab) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = current === 'wheels' ? 'qualifier' : 'wheels';
    setTab(next);
    requestAnimationFrame(() => document.getElementById(`shell-color-tab-${next}`)?.focus());
  };

  return (
    <div data-testid="shell-color-rail" className="flex h-full min-h-0 w-full flex-col bg-panel">
      <div role="tablist" aria-label="Color grading tools" className="flex h-[28px] shrink-0 items-stretch border-b border-hairline bg-shell">
        {TABS.map((t) => {
          const selected = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`shell-color-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`shell-color-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => onTabKey(e, t.id)}
              className={`border-b-2 px-3 text-[12px] transition-colors ${
                selected ? 'border-accent text-tprimary' : 'border-transparent text-tmuted hover:text-tprimary'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {tab === 'wheels' ? (
        <div role="tabpanel" id="shell-color-panel-wheels" aria-labelledby="shell-color-tab-wheels" className="scroll-y min-h-0 flex-1">
          <WheelsPanel />
        </div>
      ) : (
        <div role="tabpanel" id="shell-color-panel-qualifier" aria-labelledby="shell-color-tab-qualifier" className="scroll-y min-h-0 flex-1">
          <QualifierPanel />
        </div>
      )}
    </div>
  );
}

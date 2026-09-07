/* LeftDock — R19 th_mtoyt5fv ("use the same area as bin"): the left mediaW
   slot becomes ONE surface instead of two side-by-side strips.
   R22-D1/D7 (DESIGN-R22): the COLOR page keeps the media pool here — tabs
   [Pool | Stills]; the Stills tab is the color-grading-asset surface
   (issue #82: "under Color Grading view for color grading assets").
   The node graph NEVER docks here (it is the NodeGraphDock console, #77/#78).
   R23-WA (DESIGN-R23 D-A5, Part IX ruling 4): the FX page docks the
   FxBrowser here (its ONLY content — no tab bar, #106's law); the EDIT
   page's Effects TAB RETIRES with the Effect view (#86 — AppShell.test
   pinned the retirement) — Edit renders the Media Pool ALONE and
   panels.effects becomes dead view state (the toolbar's Effects button
   already went in R22-D5). The EffectsPanel component itself MOVED to
   components/fx/FxBrowser.tsx (promoted + extended per D-A5 — the drag
   payload contract byte-identical).
   Routing law (reads the store only — the AppShell mounts <LeftDock/> in
   the mediaW slot):
     - page 'audio'  → SoundLibrary (the pre-existing audio-focus swap);
     - page 'fx'     → FxBrowser (the FX page's asset surface);
     - page 'color'  → tabs [Pool | Stills] (pool toggle gates the dock);
     - else (edit)   → Media Pool alone (the Effects tab retired, #86/#82);
     - pool toggle off (non-color) → nothing (the parent hides the slot). */

import { useRef, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { MediaPool } from './MediaPool';
import { SoundLibrary } from '../mixer/SoundLibrary';
import { StillsPanel } from '../pages/color/StillsPanel';
import { FxBrowser } from '../fx/FxBrowser';

/* ---------- the dock ---------- */

type LeftDockTab = 'pool' | 'stills';

/* the COLOR page's tab row — Pool | Stills (the color assets, R22-D7). */
function ColorTabs({ tab, setTab, tabRefs, onTabsKeyDown }: {
  tab: LeftDockTab;
  setTab: (t: LeftDockTab) => void;
  tabRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
  onTabsKeyDown: (e: React.KeyboardEvent) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Left dock"
      className="flex shrink-0 items-stretch border-b border-hairline"
      onKeyDown={onTabsKeyDown}
    >
      <button
        type="button"
        role="tab"
        id="leftdock-tab-pool"
        aria-selected={tab === 'pool'}
        aria-controls="leftdock-panel-pool"
        tabIndex={tab === 'pool' ? 0 : -1}
        data-testid="shell-leftdock-tab-pool"
        ref={(el) => { tabRefs.current[0] = el; }}
        onClick={() => setTab('pool')}
        className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium transition-colors ${
          tab === 'pool' ? 'border-b-2 border-[var(--accent-selection)] text-tprimary' : 'border-b-2 border-transparent text-tmuted hover:text-tprimary'
        }`}
      >
        Media Pool
      </button>
      <button
        type="button"
        role="tab"
        id="leftdock-tab-stills"
        aria-selected={tab === 'stills'}
        aria-controls="leftdock-panel-stills"
        tabIndex={tab === 'stills' ? 0 : -1}
        data-testid="shell-leftdock-tab-stills"
        ref={(el) => { tabRefs.current[1] = el; }}
        onClick={() => setTab('stills')}
        className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium transition-colors ${
          tab === 'stills' ? 'border-b-2 border-[var(--accent-selection)] text-tprimary' : 'border-b-2 border-transparent text-tmuted hover:text-tprimary'
        }`}
      >
        <ImageIcon size={11} strokeWidth={1.7} aria-hidden="true" />
        Stills
      </button>
    </div>
  );
}

export function LeftDock() {
  const page = useUi((s) => s.page);
  const panels = useUi((s) => s.panels);
  const [tab, setTab] = useState<LeftDockTab>('pool'); // local view state — not doc, not a store pref
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /* the audio page owns the whole slot (Fairlight-style left dock), exactly
     like the pre-R19 AppShell swap — no pool/effects tabs on the audio page */
  if (page === 'audio') return <SoundLibrary />;

  /* R23-WA (D-A5): the FX page's dock is the FxBrowser — its ONLY content
     (no tab bar, #106's law; the pool toggle gates the slot in AppShell). */
  if (page === 'fx') return <FxBrowser />;

  const poolOn = panels.mediaPool;
  const colorPage = page === 'color';

  /* ARIA tabs pattern (roving tabindex): one tab stop, ←/→ switch tabs
     (wrapping); aria-selected carries the active panel. */
  const onTabsKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next: LeftDockTab = tab === 'pool' ? 'stills' : 'pool';
      setTab(next);
      const idx = next === 'pool' ? 0 : 1;
      tabRefs.current[idx]?.focus();
    }
  };

  /* R22-D7: on the COLOR page the second tab is STILLS (the color assets,
     issue #82) and it is ALWAYS present beside the pool — the mediaPool
     toggle gates the whole dock (the user's #77 law: the pool STAYS). */
  if (colorPage) {
    if (!poolOn) return null; // parent hides the slot; nothing to dock
    return (
      <div data-testid="shell-leftdock" className="flex h-full w-full min-h-0 min-w-0 flex-col bg-shell">
        <ColorTabs tab={tab} setTab={setTab} tabRefs={tabRefs} onTabsKeyDown={onTabsKeyDown} />
        <div className="min-h-0 flex-1">
          {tab === 'stills' ? (
            <div id="leftdock-panel-stills" role="tabpanel" aria-labelledby="leftdock-tab-stills" className="h-full min-h-0">
              <StillsPanel />
            </div>
          ) : (
            <div id="leftdock-panel-pool" role="tabpanel" aria-labelledby="leftdock-tab-pool" className="h-full min-h-0">
              <MediaPool />
            </div>
          )}
        </div>
      </div>
    );
  }

  /* R23-WA (ruling 4): the EDIT page renders the Media Pool ALONE — the
     Effects tab retired with the FX view (#86/#82). panels.effects is dead
     view state (harmless — same as the R22-D5 toolbar button's flag); the
     effects assets live on the FX page's FxBrowser now. */
  if (!poolOn) return null; // parent hides the slot; nothing to dock

  return (
    <div data-testid="shell-leftdock" className="flex h-full w-full min-h-0 min-w-0 flex-col bg-shell">
      <div className="min-h-0 flex-1">
        <div id="leftdock-panel-pool" role="tabpanel" className="h-full min-h-0">
          <MediaPool />
        </div>
      </div>
    </div>
  );
}

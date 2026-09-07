/* LeftDock — R19 th_mtoyt5fv ("use the same area as bin"): the left mediaW
   slot becomes ONE surface instead of two side-by-side strips.
   R22-D1/D7 (DESIGN-R22): the COLOR page keeps the media pool here — tabs
   [Pool | Stills].
   R23-WB (DESIGN-R23 D-B4/#91): the COLOR page's dock is the STILLS
   GALLERY — STILLS ONLY, no tab bar ("this should be the only tab in Media
   Bin … we don't need the media bin tab at all"; the Pool|Stills tabs died
   with it — re-homed, the retirement is pinned in LeftDock.test). The
   Toolbar2 left toggle is labeled "Stills" on color (D-D1's content table).
   The node graph NEVER docks here (it is the viewer-region surface, #93).
   R23-WA (DESIGN-R23 D-A5, Part IX ruling 4): the FX page docks the
   FxBrowser here (its ONLY content — no tab bar, #106's law); the EDIT
   page's Effects TAB RETIRED with the Effect view (#86 — AppShell.test
   pinned the retirement) — Edit renders the Media Pool ALONE and
   panels.effects becomes dead view state. The EffectsPanel component moved
   to components/fx/FxBrowser.tsx (promoted + extended per D-A5).
   Routing law (reads the store only — the AppShell mounts <LeftDock/> in
   the mediaW slot):
     - page 'audio'  → SoundLibrary (the pre-existing audio-focus swap);
     - page 'fx'     → FxBrowser (the FX page's asset surface);
     - page 'color'  → StillsPanel ALONE (the Gallery, #91/#97 — no tabs);
     - else (edit)   → Media Pool alone (the Effects tab retired, #86/#82);
     - pool toggle off (non-color) → nothing (the parent hides the slot). */

import { useUi } from '../../state/useUiStore';
import { MediaPool } from './MediaPool';
import { SoundLibrary } from '../mixer/SoundLibrary';
import { StillsPanel } from '../pages/color/StillsPanel';
import { FxBrowser } from '../fx/FxBrowser';

/* ---------- the dock ---------- */

export function LeftDock() {
  const page = useUi((s) => s.page);
  const panels = useUi((s) => s.panels);

  /* the audio page owns the whole slot (Fairlight-style left dock), exactly
     like the pre-R19 AppShell swap — no pool/effects tabs on the audio page */
  if (page === 'audio') return <SoundLibrary />;

  /* R23-WA (D-A5): the FX page's dock is the FxBrowser — its ONLY content
     (no tab bar, #106's law; the pool toggle gates the slot in AppShell). */
  if (page === 'fx') return <FxBrowser />;

  const poolOn = panels.mediaPool;
  const colorPage = page === 'color';

  /* R23-WB (D-B4/#91): the COLOR page's dock is the STILLS GALLERY ALONE —
     the Pool|Stills tab bar died ("this should be the only tab in Media
     Bin"); the mediaPool toggle gates the whole dock exactly as before
     (the Toolbar2 toggle is honestly labeled "Stills" on color). */
  if (colorPage) {
    if (!poolOn) return null; // parent hides the slot; nothing to dock
    return (
      <div data-testid="shell-leftdock" className="flex h-full w-full min-h-0 min-w-0 flex-col bg-shell">
        <div className="min-h-0 flex-1">
          <StillsPanel />
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

/* LeftDock — R19 th_mtoyt5fv ("use the same area as bin"): the left mediaW
   slot becomes ONE surface instead of two side-by-side strips.
   R22-D1/D7 (DESIGN-R22): the COLOR page keeps the media pool here — tabs
   [Pool | Stills].
   R23-WB (DESIGN-R23 D-B4/#91): the COLOR page's dock is the STILLS
   GALLERY — STILLS ONLY, no tab bar ("this should be the only tab in Media
   Bin … we don't need the media bin tab at all"; the Pool|Stills tabs died
   with it — re-homed, the retirement is pinned in LeftDock.test). The
   node graph NEVER docks here (it is the viewer-region surface, #93).
   R23-WA (DESIGN-R23 D-A5, Part IX ruling 4): the FX page docks the
   FxBrowser here (its ONLY content — no tab bar, #106's law); the EDIT
   page's Effects TAB RETIRED with the Effect view (#86 — AppShell.test
   pinned the retirement) — Edit renders the Media Pool ALONE and
   panels.effects becomes dead view state. The EffectsPanel component moved
   to components/fx/FxBrowser.tsx (promoted + extended per D-A5).
   R23-WD (DESIGN-R23 D-D1; #100/#106/#91): the routing now reads the ONE
   table — leftDockContent(page) — so the dock mounts EXACTLY the surface
   the Toolbar2 toggle's label names (the label/content law; single
   content = no tab bar anywhere). DELIVER's null entry mounts nothing (the
   AppShell never mounts the dock there anyway — the deliver mainbody is
   DeliverPage's own 3-region layout with its own presets rail, ruling 16).
   Routing law (reads the store only — the AppShell mounts <LeftDock/> in
   the mediaW slot):
     - page 'audio'  → SoundLibrary (the pre-existing audio-focus swap);
     - page 'fx'     → FxBrowser (the FX page's asset surface);
     - page 'color'  → StillsPanel ALONE (the Gallery, #91/#97 — no tabs);
     - page 'edit'   → Media Pool alone (the Effects tab retired, #86/#82);
     - page 'deliver'→ nothing (the table's null entry);
     - pool toggle off (edit/color) → nothing (the parent hides the slot). */

import { useUi } from '../../state/useUiStore';
import { leftDockContent } from './leftDockContent';
import { MediaPool } from './MediaPool';
import { SoundLibrary } from '../mixer/SoundLibrary';
import { StillsPanel } from '../pages/color/StillsPanel';
import { FxBrowser } from '../fx/FxBrowser';

/* ---------- the dock ---------- */

export function LeftDock() {
  const page = useUi((s) => s.page);
  const panels = useUi((s) => s.panels);

  /* R23-WD (D-D1): the ONE table decides what the dock is. Deliver's null
     entry never mounts a surface — the dock doesn't exist on that page
     (DeliverPage owns its own presets rail, ruling 16). */
  const dock = leftDockContent(page);
  if (!dock) return null;

  /* edit/color: the mediaPool toggle gates the dock exactly as before; the
     audio + fx pages own the whole slot regardless of the pool flag (the
     Fairlight left-dock law, carried by the table's gatedByPool field). */
  if (dock.gatedByPool && !panels.mediaPool) return null; // parent hides the slot

  switch (dock.surface) {
    /* the audio page owns the whole slot (Fairlight-style left dock),
       exactly like the pre-R19 AppShell swap — no pool/effects tabs */
    case 'sound-library':
      return <SoundLibrary />;
    /* R23-WA (D-A5): the FX page's dock is the FxBrowser — its ONLY content
       (no tab bar, #106's law; the pool toggle gates the slot in AppShell). */
    case 'fx-browser':
      return <FxBrowser />;
    /* R23-WB (D-B4/#91): the COLOR page's dock is the STILLS GALLERY ALONE —
       the Pool|Stills tab bar died ("this should be the only tab in Media
       Bin"); the Toolbar2 toggle is honestly labeled "Stills" on color. */
    case 'stills':
      return (
        <div data-testid="shell-leftdock" className="flex h-full w-full min-h-0 min-w-0 flex-col bg-shell">
          <div className="min-h-0 flex-1">
            <StillsPanel />
          </div>
        </div>
      );
    /* R23-WA (ruling 4): the EDIT page renders the Media Pool ALONE — the
       Effects tab retired with the FX view (#86/#82). panels.effects is dead
       view state (harmless); the effects assets live on the FX page's
       FxBrowser now. */
    case 'media-pool':
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
}

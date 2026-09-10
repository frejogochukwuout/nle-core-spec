/* leftDockContent — R23-WD (DESIGN-R23 D-D1) → R24-W2 (DESIGN-R24 §1.2
   A2-R5, issue #70): the ONE table for what the left dock IS on each
   page. Toolbar2's left toggle (label + icon + whether it renders at all)
   and LeftDock's content routing both read it, so the button can never lie
   about the dock it opens (#100) and the dock can never mount a surface
   the label doesn't name (#106: "this tab is unnecessary if you name
   things correctly"). Single content per page = no tab bar anywhere.
     Edit    = Media Pool   (pool ONLY — the Effects TAB retired with the FX
                             view in Wave A, ruling 4; AppShell.test pins it)
     Color   = Gallery      (R24-W2 A2-R5: the stills-only gallery RENAMED —
                             Resolve's own name; the surface key 'stills' +
                             every testid STABLE, only the label changed)
     Audio   = Sound Library
     FX      = Effects      (the FxBrowser)
     Deliver = HIDDEN       (null — DeliverPage owns its own presets rail in
                             its 3-region mainbody; a toolbar toggle there
                             would be the lying control #100 flags, ruling 16).
   The dock never mounts on deliver (AppShell swaps the whole mainbody for
   DeliverPage), and the Toolbar2 toggle is DOM-absent there — the null
   entry is the single source both sides read. */

import { PanelLeft, ImageIcon, AudioWaveform, Sparkles, type LucideIcon } from 'lucide-react';
import type { Page } from '../../state/useUiStore';

/** what the dock MOUNTS for a page — LeftDock switches on this key. */
export type LeftDockSurface = 'media-pool' | 'stills' | 'sound-library' | 'fx-browser';

export interface LeftDockContent {
  /** the Toolbar2 toggle's label — the name IS the content (#106) */
  label: string;
  /** the toggle's glyph — same domain as the label */
  icon: LucideIcon;
  /** the surface LeftDock mounts for the page */
  surface: LeftDockSurface;
  /** does the mediaPool flag gate the dock? edit/color: yes; the audio + fx
   *  pages own the whole slot regardless of the pool flag (the Fairlight
   *  left-dock law, unchanged from the pre-WD routing). */
  gatedByPool: boolean;
}

/** the table. Deliver's null = the hidden law (ruling 16). Record<Page, …>
 *  is exhaustive by construction — a future page MUST decide here. */
export const LEFT_DOCK_CONTENT: Record<Page, LeftDockContent | null> = {
  edit: { label: 'Media Pool', icon: PanelLeft, surface: 'media-pool', gatedByPool: true },
  color: { label: 'Gallery', icon: ImageIcon, surface: 'stills', gatedByPool: true },
  audio: { label: 'Sound Library', icon: AudioWaveform, surface: 'sound-library', gatedByPool: false },
  fx: { label: 'Effects', icon: Sparkles, surface: 'fx-browser', gatedByPool: false },
  deliver: null,
};

/** the single accessor — consumers go through this, never the table spread
 *  around (so the null-entry law has one reader-side shape). */
export function leftDockContent(page: Page): LeftDockContent | null {
  return LEFT_DOCK_CONTENT[page] ?? null;
}

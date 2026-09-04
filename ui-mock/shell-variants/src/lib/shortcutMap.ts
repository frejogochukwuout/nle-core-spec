/* ShortcutMap — spec 16 §8.6 single source of truth for every IMPLEMENTED
   keyboard binding in this mock. The cheat sheet (§7.3) renders these rows
   verbatim; hooks/useShortcuts.ts is the behavioral twin. One row per
   implemented binding, action ids kebab-case — cheat-sheet rows carry
   data-testid={`shortcut-${action}`} so tests can assert completeness. */

export interface ShortcutRow {
  action: string; // kebab-case id, e.g. 'transport-play'
  keys: string;   // human form, e.g. '⌘Z', '⇧Delete', '← / → (⇧ ×10)'
  group: string;  // one of SHORTCUT_GROUPS
  desc: string;   // user-facing one-liner
}

/** Cheat-sheet section order (spec 16 §7.3). Scenes has no bindings in v1. */
export const SHORTCUT_GROUPS: string[] = [
  'Transport', 'Tools', 'Clips', 'Markers', 'Selection', 'Timeline', 'Panels', 'Scenes',
];

export const SHORTCUT_MAP: ShortcutRow[] = [
  /* ---- Transport (spec 16 §3.1) ---- */
  { action: 'transport-play', keys: 'Space', group: 'Transport', desc: 'Play / pause toggle' },
  { action: 'transport-shuttle', keys: 'J / L', group: 'Transport', desc: 'Shuttle reverse / forward — tap to accelerate 1× → 2× → 4×' },
  { action: 'transport-shuttle-stop', keys: 'K', group: 'Transport', desc: 'Pause shuttle (JKL stop)' },
  { action: 'transport-step', keys: '← / → (⇧ ×10)', group: 'Transport', desc: 'Step playhead ±1 frame (±10 with ⇧)' },
  { action: 'transport-mark-inout', keys: 'I / O', group: 'Transport', desc: 'Mark in / mark out at playhead' },
  { action: 'transport-clear-inout', keys: '⌥X', group: 'Transport', desc: 'Clear in + out points' },
  { action: 'transport-master-mute', keys: '⌘M', group: 'Transport', desc: 'Toggle master mute' },
  { action: 'transport-loop', keys: '⌘⇧G', group: 'Transport', desc: 'Toggle loop playback' },

  /* ---- Tools (spec 16 §3.2) ---- */
  { action: 'tool-select', keys: 'V', group: 'Tools', desc: 'Select tool' },
  { action: 'tool-blade', keys: 'B', group: 'Tools', desc: 'Blade (razor) tool' },
  { action: 'tool-roll', keys: 'T', group: 'Tools', desc: 'Roll trim tool' },
  { action: 'tool-slip', keys: 'Y', group: 'Tools', desc: 'Slip tool' },
  { action: 'tool-slide', keys: 'U', group: 'Tools', desc: 'Slide tool' },
  { action: 'tool-ripple', keys: 'R', group: 'Tools', desc: 'Ripple tool' },
  { action: 'tool-snap', keys: 'N', group: 'Tools', desc: 'Toggle snapping' },

  /* ---- Clips + edit history (spec 16 §3.3/§3.4/§3.10) ---- */
  { action: 'clips-select-neighbor', keys: 'Tab / ⇧Tab', group: 'Clips', desc: 'Select next / previous clip (main track)' },
  { action: 'clips-select-all', keys: '⌘A', group: 'Clips', desc: 'Select all clips on main track' },
  { action: 'clips-deselect-all', keys: '⇧⌘A', group: 'Clips', desc: 'Clear selection' },
  { action: 'clips-delete', keys: 'Delete', group: 'Clips', desc: 'Delete selection (leaves gap)' },
  { action: 'clips-ripple-delete', keys: '⇧Delete', group: 'Clips', desc: 'Ripple delete (closes gap)' },
  { action: 'clips-split', keys: '⌘B', group: 'Clips', desc: 'Split clip under playhead, at playhead' },
  { action: 'clips-duplicate', keys: '⌘D', group: 'Clips', desc: 'Duplicate selection' },
  { action: 'clips-trim-start', keys: '⌥[', group: 'Clips', desc: 'Ripple-trim clip start to playhead' },
  { action: 'clips-trim-end', keys: '⌥]', group: 'Clips', desc: 'Ripple-trim clip end to playhead' },
  { action: 'clips-slip', keys: ', / .', group: 'Clips', desc: 'Slip selection ∓1 frame' },
  { action: 'clips-undo', keys: '⌘Z', group: 'Clips', desc: 'Undo' },
  { action: 'clips-redo', keys: '⇧⌘Z', group: 'Clips', desc: 'Redo' },

  /* ---- Markers (spec 16 §3.7) ---- */
  { action: 'markers-add', keys: 'M', group: 'Markers', desc: 'Add marker at playhead' },
  { action: 'markers-add-color', keys: '⇧M', group: 'Markers', desc: 'Add marker, cycling palette color' },

  /* ---- Selection (spec 16 §3.3 / §5.4) ---- */
  { action: 'selection-track-focus', keys: '↑ / ↓', group: 'Selection', desc: 'Move track focus up / down' },
  { action: 'selection-escape', keys: 'Esc', group: 'Selection', desc: 'Tool → select; else clear selection' },

  /* ---- Timeline nav (spec 16 §3.6) ---- */
  { action: 'timeline-home-end', keys: 'Home / End', group: 'Timeline', desc: 'Jump playhead to start / end' },
  { action: 'timeline-edit-points', keys: 'PageUp / PageDn', group: 'Timeline', desc: 'Jump to previous / next edit point' },

  /* ---- Panels / pages (spec 16 §3.9 + spec 18) ---- */
  { action: 'panels-page', keys: '⌘1 / ⌘2 / ⌘3', group: 'Panels', desc: 'Switch page: Edit / Color / Deliver' },
  { action: 'panels-audio-focus', keys: '⌘4', group: 'Panels', desc: 'Toggle Audio focus (BGM / SFX mixer)' },
  { action: 'panels-mixer', keys: 'toolbar button', group: 'Panels', desc: 'Mixer row: collapsed / meter bridge / full' },
  { action: 'escape-audio', keys: 'Esc', group: 'Panels', desc: 'Exit Audio focus back to Edit' },
  { action: 'panels-import', keys: '⌘I', group: 'Panels', desc: 'Import media (mock toast — drop on Media Pool)' },
  { action: 'panels-cheatsheet', keys: '?', group: 'Panels', desc: 'Toggle this cheat sheet' },
  { action: 'panels-region-focus', keys: 'F6 (⇧ reverse)', group: 'Panels', desc: 'Cycle focus across shell regions' },
];

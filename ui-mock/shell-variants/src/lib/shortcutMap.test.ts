/* shortcutMap.ts — the documented keyboard contract (spec 16 §8.6). The cheat
   sheet renders these rows verbatim and hooks/useShortcuts.ts is the
   behavioral twin: the completeness contract is that every implemented
   binding has exactly one row, with unique kebab-case action ids and a
   valid group. */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SHORTCUT_GROUPS, SHORTCUT_MAP, type ShortcutRow } from './shortcutMap';

describe('SHORTCUT_MAP integrity', () => {
  it('action ids are unique kebab-case', () => {
    const ids = SHORTCUT_MAP.map((r) => r.action);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('every row uses a declared group', () => {
    for (const row of SHORTCUT_MAP) {
      expect(SHORTCUT_GROUPS).toContain(row.group);
    }
  });

  it('every row has a key label and a description', () => {
    for (const row of SHORTCUT_MAP) {
      expect(row.keys.length).toBeGreaterThan(0);
      expect(row.desc.length).toBeGreaterThan(0);
    }
  });

  it('every group except Scenes is used (Scenes is intentionally empty in v1 — documented)', () => {
    const used = new Set(SHORTCUT_MAP.map((r) => r.group));
    for (const g of SHORTCUT_GROUPS) {
      if (g === 'Scenes') continue; // no scene bindings in v1 per the source comment
      expect(used.has(g)).toBe(true);
    }
    // and the map uses no group outside the list
    for (const g of used) expect(SHORTCUT_GROUPS).toContain(g);
  });
});

describe('coverage of the implemented binding families', () => {
  const actions = new Set(SHORTCUT_MAP.map((r) => r.action));

  it('documents the transport family (play, JKL, step, I/O, loop)', () => {
    for (const a of ['transport-play', 'transport-shuttle', 'transport-shuttle-stop', 'transport-step', 'transport-mark-inout', 'transport-clear-inout', 'transport-loop', 'audio-mute']) {
      expect(actions.has(a)).toBe(true);
    }
  });

  it('documents every tool key (V B T Y U R + snap N)', () => {
    for (const a of ['tool-select', 'tool-blade', 'tool-roll', 'tool-slip', 'tool-slide', 'tool-ripple', 'tool-snap']) {
      expect(actions.has(a)).toBe(true);
    }
  });

  it('documents the clip-edit family (delete, ripple-delete, split, duplicate, slip, trim, undo/redo)', () => {
    for (const a of ['clips-delete', 'clips-ripple-delete', 'clips-split', 'clips-duplicate', 'clips-slip', 'clips-trim-start', 'clips-trim-end', 'clips-undo', 'clips-redo', 'clips-select-neighbor', 'clips-select-all']) {
      expect(actions.has(a)).toBe(true);
    }
  });

  it('documents the marker family (add, delete, add-with-color)', () => {
    for (const a of ['markers-add', 'markers-delete', 'markers-add-color']) {
      expect(actions.has(a)).toBe(true);
    }
  });

  it('documents pages/audio-focus/escape and region cycling', () => {
    for (const a of ['panels-page', 'panels-audio-focus', 'escape-audio', 'selection-escape', 'selection-track-focus', 'timeline-home-end', 'timeline-edit-points', 'panels-import', 'panels-cheatsheet', 'panels-region-focus', 'panels-mixer']) {
      expect(actions.has(a)).toBe(true);
    }
  });
});

describe('shortcut parity with useShortcuts (twin contract)', () => {
  /* The behavioral twin (src/hooks/useShortcuts.ts) must implement everything
     documented here that is a real binding (toolbar-button rows are exempt).
     This list is the fixed expectation; the hook test file pins the behavior
     itself. */
  it('documents Space as the play/pause binding', () => {
    expect(SHORTCUT_MAP.find((r) => r.action === 'transport-play')!.keys).toBe('Space');
  });

  it('documents ⌘Z undo + ⇧⌘Z redo', () => {
    expect(SHORTCUT_MAP.find((r) => r.action === 'clips-undo')!.keys).toBe('⌘Z');
    expect(SHORTCUT_MAP.find((r) => r.action === 'clips-redo')!.keys).toBe('⇧⌘Z');
  });

  it('documents the JKL accel semantics in the desc', () => {
    const row = SHORTCUT_MAP.find((r) => r.action === 'transport-shuttle')!;
    expect(row.desc).toContain('1×');
    expect(row.desc).toContain('4×');
  });
});

/* ---------- R23-WA (DESIGN-R23 D-A1 / ruling 18): the FX page chord ---------- */

describe('R23-WA: the ⌘5 FX page row (spec 16\'s free chord)', () => {
  it('documents the FX page binding next to the ⌘1-4 page family', () => {
    const row = SHORTCUT_MAP.find((r) => r.action === 'panels-page-fx')!;
    expect(row).toBeDefined();
    expect(row.keys).toBe('⌘5');
    expect(row.group).toBe('Panels');
    expect(row.desc).toContain('FX page');
  });
});

/* ---------- R23-FIX (review-sweep R5-P3#7): the doc fixes + the exhaustive
   twin-parity contract (every documented row ↔ a real dispatch in the hook) ---------- */

describe('R23-FIX R5-P3#7: doc fixes + the exhaustive twin parity', () => {
  it('the zoom-step row says 1.7× — the R15-1 canonical factor (matching ZOOM_BUTTON_FACTOR + the toolbar ±)', () => {
    const row = SHORTCUT_MAP.find((r) => r.action === 'timeline-zoom-step')!;
    expect(row.desc).toContain('1.7×');
    expect(row.desc).not.toContain('1.5×'); // the stale factor is gone
  });

  it('the clips-delete desc documents the FX-first path (ruling 22: a selected transition/fade object deletes before the clips)', () => {
    const row = SHORTCUT_MAP.find((r) => r.action === 'clips-delete')!;
    expect(row.desc).toContain('transition');
    expect(row.desc).toContain('fade');
    expect(row.desc).toContain('ruling 22');
  });

  /* THE EXHAUSTIVE TWIN-PARITY TEST. Forward: every documented row (except
     the toolbar-button row + F6 — Toolbar2/AppShell own those) must have a
     matching key dispatch in hooks/useShortcuts.ts. Reverse: every dispatch
     token in the hook must be documented (with an explicit alias list for
     hardware/code-form twins). Checked at the source-text level — the hook
     is a ~430-line switch; its quoted-key comparisons ARE the dispatch
     inventory (the appLayers.test precedent: source reads are the reliable
     channel for whole-file contracts). */
  const hook = readFileSync(resolve(process.cwd(), 'src/hooks/useShortcuts.ts'), 'utf8');

  /** one documented binding label → the hook tokens its dispatch must carry */
  function tokensForRow(row: ShortcutRow): string[] {
    if (row.keys === 'toolbar button' || row.keys.startsWith('F6')) return []; // exempt: other surfaces
    const out: string[] = [];
    for (let part of row.keys.split(' / ')) {
      part = part.replace(/\s*\([^)]*\)/g, '').trim(); // drop "(⇧ ×10)" / "(source mode)"
      const isAlt = part.includes('⌥');
      const bare = part.replace(/[⌘⇧⌥]/g, '').trim();
      if (bare === '') continue;
      if (isAlt) { // ⌥ combos dispatch on e.code (Mac alt-key layouts remap e.key)
        if (bare === 'X') out.push('KeyX');
        else if (bare === 'M') out.push('KeyM');
        else if (bare === '[') out.push('BracketLeft');
        else if (bare === ']') out.push('BracketRight');
        continue;
      }
      if (bare === 'Space') { out.push(' '); continue; }
      if (bare === 'Esc') { out.push('Escape'); continue; }
      if (bare === 'PageDn') { out.push('PageDown'); continue; }
      const mapped = bare === '←' ? 'ArrowLeft' : bare === '→' ? 'ArrowRight'
        : bare === '↑' ? 'ArrowUp' : bare === '↓' ? 'ArrowDown'
        : bare === '−' ? '-' : bare;
      out.push(mapped.length === 1 && /[A-Z]/.test(mapped) ? mapped.toLowerCase() : mapped);
    }
    return out;
  }

  /** the hook's dispatch inventory: every quoted key it compares against */
  const dispatchTokens = new Set<string>();
  for (const re of [/case\s+'([^']+)'/g, /key\s*===\s*'([^']+)'/g, /lower\s*===\s*'([^']+)'/g, /code\s*===\s*'([^']+)'/g]) {
    for (const m of hook.matchAll(re)) {
      // the regex reads RAW source: key === '\\' captures the two literal
      // backslashes of the escape — normalize to the one-char key it names
      dispatchTokens.add(m[1]!.length === 2 && m[1] === '\\\\' ? '\\' : m[1]!);
    }
  }

  /** implemented-but-aliased twins — every entry names its documented owner */
  const ALIASES: Record<string, string> = {
    Backspace: "the clips-delete row's hardware alias (case 'Backspace' joins Delete)",
    '=': "the timeline-zoom-step row's shifted-form alias of +",
  };

  it('forward parity: EVERY documented binding has a dispatch token in useShortcuts (no cheat-sheet lies)', () => {
    const misses: string[] = [];
    for (const row of SHORTCUT_MAP) {
      for (const tok of tokensForRow(row)) {
        if (tok === '\\') {
          // the ⌘\ row: the hook compares key === '\\' (escaped in source)
          if (!hook.includes("'\\\\'")) misses.push(`${row.action}: \\`);
          continue;
        }
        if (!dispatchTokens.has(tok)) misses.push(`${row.action}: ${tok}`);
      }
    }
    expect(misses).toEqual([]);
  });

  it('reverse parity: every dispatch token in useShortcuts is documented (or a registered alias)', () => {
    const documented = new Set<string>();
    for (const row of SHORTCUT_MAP) for (const tok of tokensForRow(row)) documented.add(tok);
    const misses: string[] = [];
    for (const tok of dispatchTokens) {
      if (documented.has(tok) || tok in ALIASES) continue;
      misses.push(tok);
    }
    expect(misses).toEqual([]);
  });
});

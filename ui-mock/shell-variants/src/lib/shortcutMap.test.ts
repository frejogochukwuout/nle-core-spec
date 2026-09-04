/* shortcutMap.ts — the documented keyboard contract (spec 16 §8.6). The cheat
   sheet renders these rows verbatim and hooks/useShortcuts.ts is the
   behavioral twin: the completeness contract is that every implemented
   binding has exactly one row, with unique kebab-case action ids and a
   valid group. */

import { describe, expect, it } from 'vitest';
import { SHORTCUT_GROUPS, SHORTCUT_MAP } from './shortcutMap';

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

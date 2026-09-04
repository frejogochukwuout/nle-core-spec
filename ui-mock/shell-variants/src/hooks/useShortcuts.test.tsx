/* useShortcuts — spec 16 keyboard layer. One window keydown listener; these
   tests fire real KeyboardEvents at window and assert the store reactions:
   JKL tap-accel (500 ms window), the Esc ladder, ⌘/⌥ combos, the text-input
   guard (§8.5), and the cheat-sheet keyboard handoff. performance.now is
   mocked manually for deterministic JKL timing. */

import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { useShortcuts } from './useShortcuts';
import { useUi } from '../state/useUiStore';

const S = () => useUi.getState();

function Harness({ duration = 30, confirm }: { duration?: number; confirm?: (opts: { title: string; onConfirm: () => void }) => void }) {
  useShortcuts(duration, confirm);
  return null;
}

interface PressInit {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

function press(init: PressInit) {
  const { key, code = '', ctrlKey = false, metaKey = false, altKey = false, shiftKey = false } = init;
  window.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true, ctrlKey, metaKey, altKey, shiftKey }));
}

/** grab an element out of the current doc */
const el = (id: string) => {
  for (const sc of S().scenes) for (const t of sc.tracks) {
    const hit = t.elements.find((e) => e.id === id);
    if (hit) return hit;
  }
  throw new Error(`element ${id} not found`);
};

beforeEach(() => {
  render(<Harness />);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/* ---- JKL shuttle ---- */

describe('JKL shuttle with 500 ms tap-accel', () => {
  it('single L plays forward at 1×, single J reverses at −1×', () => {
    press({ key: 'l' });
    expect(S().playRate).toBe(1);
    expect(S().playing).toBe(true);
    press({ key: 'j' });
    expect(S().playRate).toBe(-1);
  });

  it('same-direction taps within 500 ms accelerate 1× → 2× → 4× (capped)', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    press({ key: 'l' });              // tap 1 → 1×
    expect(S().playRate).toBe(1);
    now = 100; press({ key: 'l' });   // tap 2 → 2×
    expect(S().playRate).toBe(2);
    now = 200; press({ key: 'l' });   // tap 3 → 4×
    expect(S().playRate).toBe(4);
    now = 300; press({ key: 'l' });   // tap 4 → capped at 4×
    expect(S().playRate).toBe(4);
  });

  it('the accel window resets after 500 ms of silence', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    press({ key: 'l' });
    now = 100; press({ key: 'l' });
    expect(S().playRate).toBe(2);
    now = 100 + 501; press({ key: 'l' }); // window expired → fresh 1×
    expect(S().playRate).toBe(1);
  });

  it('switching direction restarts the tap count', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    press({ key: 'l' });
    now = 100; press({ key: 'l' });
    expect(S().playRate).toBe(2);
    now = 150; press({ key: 'j' }); // direction change → 1× reverse
    expect(S().playRate).toBe(-1);
  });

  it('K stops the shuttle (JKL stop) and clears the tap state', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    press({ key: 'l' });
    now = 100; press({ key: 'l' });
    press({ key: 'k' });
    expect(S().playing).toBe(false);
    expect(S().playRate).toBe(0);
    // K cleared the ref — a fresh L must be 1×, not 4×
    now = 150; press({ key: 'l' });
    expect(S().playRate).toBe(1);
  });

  it('JKL keys are inert while ⌘ is held (no transport hijack of ⌘L etc.)', () => {
    press({ key: 'l', metaKey: true });
    expect(S().playRate).toBe(1); // boot default — unchanged
    expect(S().playing).toBe(false);
  });
});

/* ---- transport + playhead ---- */

describe('transport keys', () => {
  it('Space toggles play', () => {
    press({ key: ' ' });
    expect(S().playing).toBe(true);
    press({ key: ' ' });
    expect(S().playing).toBe(false);
  });

  it('← / → step ±1 frame; ⇧ steps ±10', () => {
    press({ key: 'ArrowRight' });
    expect(S().playhead).toBeCloseTo(16 + 1 / 24, 6);
    press({ key: 'ArrowRight', shiftKey: true });
    expect(S().playhead).toBeCloseTo(16 + 11 / 24, 6);
    press({ key: 'ArrowLeft', shiftKey: true });
    expect(S().playhead).toBeCloseTo(16 + 1 / 24, 6);
  });

  it('↑ / ↓ move the track focus (clamped at the stack ends)', () => {
    press({ key: 'ArrowDown' });
    expect(S().focusedTrackId).toBe('tr-overlay-1');
    press({ key: 'ArrowUp' }); // already at index 0 — clamps, stays
    expect(S().focusedTrackId).toBe('tr-overlay-1');
    press({ key: 'ArrowDown' });
    expect(S().focusedTrackId).toBe('tr-main');
  });

  it('Home / End jump to 0 / scene duration', () => {
    press({ key: 'End' });
    expect(S().playhead).toBe(30);
    press({ key: 'Home' });
    expect(S().playhead).toBe(0);
  });

  it('PageUp / PageDn jump between main-track edit points (nearest-prev, not earliest)', () => {
    // playhead 16; main-track edges: 0, 8.5, 17, 24, 30
    press({ key: 'PageDown' });
    expect(S().playhead).toBeCloseTo(17.01, 4); // first edge after 16
    press({ key: 'PageUp' });
    expect(S().playhead).toBeCloseTo(8.49, 4); // NEAREST edge before 17.01 — R13 fix (was: earliest → ~0)
    press({ key: 'PageUp' });
    expect(S().playhead).toBe(0); // next lower edge is 0 → clamped at 0
  });

  it('I / O mark in/out at the playhead', () => {
    press({ key: 'i' });
    expect(S().loop.start).toBe(16);
    press({ key: 'o' });
    expect(S().loop.end).toBe(16);
  });

  it('⌥X clears in/out (alt combos read e.code)', () => {
    press({ key: 'i' });
    press({ key: 'x', code: 'KeyX', altKey: true });
    expect(S().loop.start).toBe(0);
    expect(S().loop.end).toBe(30);
  });

  it('⌘⇧G toggles loop playback', () => {
    press({ key: 'g', metaKey: true, shiftKey: true });
    expect(S().loopEnabled).toBe(true);
    press({ key: 'g', metaKey: true, shiftKey: true });
    expect(S().loopEnabled).toBe(false);
  });
});

/* ---- tools ---- */

describe('tool keys', () => {
  it('V B T Y U R switch tools; N toggles snap', () => {
    for (const [k, tool] of [['b', 'blade'], ['t', 'roll'], ['y', 'slip'], ['u', 'slide'], ['r', 'ripple'], ['v', 'select']] as const) {
      press({ key: k });
      expect(S().tool).toBe(tool);
    }
    press({ key: 'n' });
    expect(S().snap).toBe(false);
  });
});

/* ---- selection + clips ---- */

describe('clip + selection keys', () => {
  it('Tab / ⇧Tab walk main-track neighbors — scoped to focus inside the timeline region (a11y nav kept elsewhere)', () => {
    // R13 fix: the global Tab hijack made keyboard navigation impossible
    // outside text fields; Tab now selects neighbors ONLY while focus lives
    // inside the timeline region.
    const timeline = document.createElement('div');
    timeline.setAttribute('data-testid', 'shell-timeline');
    timeline.tabIndex = -1;
    document.body.appendChild(timeline);
    (timeline as HTMLElement).focus();
    press({ key: 'Tab' });
    expect(S().selection).toEqual(['el-3']);
    press({ key: 'Tab', shiftKey: true });
    expect(S().selection).toEqual(['el-2']);
    timeline.remove();
    // focus back on body → Tab does NOT hijack (no selection change)
    (document.activeElement as HTMLElement | null)?.blur?.();
    press({ key: 'Tab' });
    expect(S().selection).toEqual(['el-2']); // unchanged — default Tab navigation flows
  });

  it('Delete removes the selection; ⇧Delete ripple-deletes', () => {
    press({ key: 'Delete' });
    expect(S().selection).toEqual([]);
    expect(() => el('el-2')).toThrow(); // gone
    expect(el('el-3').startTime).toBe(17); // gap left behind
    // set up for ripple
    useUi.setState({ selection: ['el-3'] });
    press({ key: 'Delete', shiftKey: true });
    expect(() => el('el-3')).toThrow();
    expect(el('el-4').startTime).toBeLessThan(24); // gap closed
  });

  it('⌘Delete is swallowed as an unmatched ⌘ combo (structural keys no longer fire under modifiers)', () => {
    press({ key: 'Delete', metaKey: true });
    expect(el('el-2')).toBeDefined(); // survived — R13 guard
    press({ key: 'Delete', altKey: true });
    expect(el('el-2')).toBeDefined();
  });

  it('Delete with an empty selection does nothing (no preventDefault crash)', () => {
    useUi.setState({ selection: [] });
    expect(() => press({ key: 'Delete' })).not.toThrow();
  });

  it('⌘A selects the first track when nothing is focused; ⇧⌘A selects everything', () => {
    press({ key: 'a', metaKey: true });
    expect(S().selection).toEqual(['el-5']); // tracks[0] = overlay
    press({ key: 'a', metaKey: true, shiftKey: true });
    expect(S().selection).toHaveLength(7); // all elements in sc-1
  });

  it('⌘A respects the focused track', () => {
    useUi.setState({ focusedTrackId: 'tr-main' });
    press({ key: 'a', metaKey: true });
    expect(S().selection).toEqual(['el-1', 'el-2', 'el-3', 'el-4']);
  });

  it('⌘B splits the clip under the playhead (main track)', () => {
    // playhead 16 sits inside el-2 (8.5..17)
    press({ key: 'b', metaKey: true });
    const ids = S().scenes.find((sc) => sc.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-main')!.elements.map((e) => e.id);
    expect(ids.some((id) => id.startsWith('el-2-b'))).toBe(true);
  });

  it('⌘D duplicates the selection and selects the copies', () => {
    press({ key: 'd', metaKey: true });
    expect(S().selection[0]).toMatch(/^el-2-d/);
    expect(el(S().selection[0]).startTime).toBeCloseTo(17, 5);
  });

  it(', / . slip the selection ∓1 frame', () => {
    press({ key: ',' });
    expect(el('el-2').sourceStart).toBeCloseTo(3 - 1 / 24, 6);
    press({ key: '.' });
    expect(el('el-2').sourceStart).toBeCloseTo(3, 6);
  });

  it('⌥[ / ⌥] ripple-trim closes the gap (alt combos read e.code)', () => {
    // l-edge at 16 on the SELECTED el-2 (8.5..17): the head region is removed
    // ripple-style — el-2 keeps its start, shows its tail, downstream closes
    // the gap; the unselected audio bed under the same playhead is untouched
    // (P1 target constraint)
    press({ key: '[', code: 'BracketLeft', altKey: true });
    expect(el('el-2').startTime).toBe(8.5);                    // start kept
    expect(el('el-2').duration).toBeCloseTo(1.0, 5);           // head removed
    expect(el('el-2').sourceStart).toBeCloseTo(10.5, 5);       // source advanced
    expect(el('el-3').startTime).toBeCloseTo(9.5, 5);          // gap closed
    expect(el('el-4').startTime).toBeCloseTo(16.5, 5);
    expect(el('el-6').duration).toBe(30);                      // NOT selected → untouched
    // clear the selection → main-track fallback targets el-4 (16.5..22.5);
    // r-edge at 20 removes the tail [20..22.5]
    useUi.setState({ playhead: 20, selection: [] });
    press({ key: ']', code: 'BracketRight', altKey: true });
    expect(el('el-4').duration).toBeCloseTo(3.5, 5);           // 20 - 16.5
  });


  it('§6.4: keyboard multi-delete (≥5) routes through the confirm dialog — not a bypass', () => {
    const calls: { title: string; onConfirm: () => void }[] = [];
    const fakeConfirm = (opts: { title: string; onConfirm: () => void }) => calls.push(opts);
    cleanup();
    render(<Harness confirm={fakeConfirm} />); // re-render the harness WITH a confirm fn
    useUi.setState({ selection: ['el-1', 'el-2', 'el-3', 'el-4', 'el-5', 'el-6'] });
    press({ key: 'Delete' });
    expect(calls).toHaveLength(1);                 // dialog requested
    expect(calls[0].title).toBe('Delete 6 clips?');
    expect(el('el-1')).toBeDefined();            // nothing deleted yet
    act(() => calls[0].onConfirm());
    expect(() => el('el-1')).toThrow();             // confirmed → deleted (unlocked ones)
    // 4-clipped selections still delete directly
    calls.length = 0;
    useUi.setState({ selection: ['el-1', 'el-2', 'el-3', 'el-4'] });
    press({ key: 'Delete' });
    expect(calls).toHaveLength(0);                 // no dialog below the threshold
  });
  it('undo / redo with empty history pushes an info toast instead', () => {
    press({ key: 'z', metaKey: true });
    expect(S().toasts.map((t) => t.title)).toContain('Nothing to undo');
    press({ key: 'z', metaKey: true, shiftKey: true });
    expect(S().toasts.map((t) => t.title)).toContain('Nothing to redo');
  });

  it('⌘Z / ⇧⌘Z undo and redo a real mutation', () => {
    press({ key: 'd', metaKey: true }); // duplicate
    press({ key: 'z', metaKey: true }); // undo
    expect(S().scenes.find((sc) => sc.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-main')!.elements).toHaveLength(4);
    press({ key: 'z', metaKey: true, shiftKey: true }); // redo
    expect(S().scenes.find((sc) => sc.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-main')!.elements).toHaveLength(5);
  });
});

/* ---- markers ---- */

describe('marker keys', () => {
  it('M adds a marker at the playhead; ⇧M deletes it', () => {
    press({ key: 'm' });
    const markers = S().scenes.find((sc) => sc.id === 'sc-1')!.markers;
    expect(markers).toHaveLength(5); // 4 fixtures + 1
    press({ key: 'm', shiftKey: true });
    expect(S().scenes.find((sc) => sc.id === 'sc-1')!.markers).toHaveLength(4);
  });

  it('⌥⇧M adds a marker with the cycled palette color (e.code-stable under alt)', () => {
    press({ key: 'µ', code: 'KeyM', shiftKey: true, altKey: true }); // Mac layout remaps e.key
    const added = S().scenes.find((sc) => sc.id === 'sc-1')!.markers.find((mk) => mk.time === 16)!;
    expect(added).toBeDefined();
    expect(added.color).toBe('red'); // palette cursor starts at red
    press({ key: 'µ', code: 'KeyM', shiftKey: true, altKey: true });
    const at16 = S().scenes.find((sc) => sc.id === 'sc-1')!.markers.filter((mk) => mk.time === 16);
    expect(at16.at(-1)!.color).toBe('orange'); // cursor advanced
  });
});

/* ---- pages + audio focus ---- */

describe('page and audio-focus keys', () => {
  it('⌘1 / ⌘2 / ⌘3 switch Edit / Color / Deliver', () => {
    press({ key: '2', metaKey: true });
    expect(S().page).toBe('color');
    press({ key: '3', metaKey: true });
    expect(S().page).toBe('deliver');
    press({ key: '1', metaKey: true });
    expect(S().page).toBe('edit');
  });

  it('⌘4 toggles audio focus; Esc exits it back to Edit', () => {
    press({ key: '4', metaKey: true });
    expect(S().page).toBe('audio');
    expect(S().mixerState).toBe('full');
    expect(S().audioLaneBoost).toBe(true);
    press({ key: 'Escape' });
    expect(S().page).toBe('edit');
    expect(S().audioLaneBoost).toBe(false);
  });

  it('⌘I explains the mock import path as a toast', () => {
    press({ key: 'i', metaKey: true });
    const toast = S().toasts.find((t) => t.title === 'Import media')!;
    expect(toast).toBeDefined();
    expect(toast.kind).toBe('info');
    expect(toast.detail).toContain('Media Pool');
  });

  it('⌘M mutes the focused audio track; falls back to master mute when unfocused', () => {
    useUi.setState({ focusedTrackId: 'tr-audio-1' });
    press({ key: 'm', metaKey: true });
    const t = S().scenes.find((sc) => sc.id === 'sc-1')!.tracks.find((x) => x.id === 'tr-audio-1')!;
    expect(t.muted).toBe(true);
    useUi.setState({ focusedTrackId: null });
    press({ key: 'm', metaKey: true });
    expect(S().masterMuted).toBe(true); // fallback path
  });
});

/* ---- escape ladder ---- */

describe('the Esc ladder (spec 16 §3.3 escape)', () => {
  it('audio page → exit focus; non-select tool → select; selection → clear', () => {
    useUi.setState({ page: 'audio' });
    press({ key: 'Escape' });
    expect(S().page).toBe('edit');
    useUi.setState({ tool: 'blade' });
    press({ key: 'Escape' });
    expect(S().tool).toBe('select');
    expect(S().selection).toEqual(['el-2']); // still held
    press({ key: 'Escape' });
    expect(S().selection).toEqual([]);
  });
});

/* ---- cheat sheet ---- */

describe('cheat sheet', () => {
  it('? toggles the cheat sheet; while open, the hook suppresses other keys', () => {
    press({ key: '?' });
    expect(S().cheatOpen).toBe(true);
    press({ key: ' ' }); // suppressed — cheat owns the keyboard
    expect(S().playing).toBe(false);
    press({ key: 'v' }); // also suppressed
    expect(S().tool).toBe('select');
  });
});

/* ---- §8.5 text-input guard ---- */

describe('text-input guard (spec 16 §8.5)', () => {
  it('keys typed into INPUT/SELECT/TEXTAREA never reach the shortcut layer', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    // dispatch from the input (bubbles to window) with target = input
    const evt = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    Object.defineProperty(evt, 'target', { value: input });
    input.dispatchEvent(evt);
    expect(S().playing).toBe(false);
    input.remove();
  });

  it('cheat-sheet guard: the hook reads state BEFORE the handler runs', () => {
    // (sanity: the two guards are independent — opening the sheet blocks keys
    //  even when focus is on body)
    useUi.setState({ cheatOpen: true });
    press({ key: ' ' });
    expect(S().playing).toBe(false);
  });
});

/* useUiStore — the mock UI + doc state machine. This is the heart of the
   "frontend UI logic" test surface: view-state actions, selection semantics,
   toast stack, undo history mechanics, every document mutation (the editing
   command set), the audio-focus state machine, and the mixer sidecar
   immutability discipline. Fixtures = the sample project (spec 18 §4.10). */

import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useActiveScene, trackHeights, useUi } from './useUiStore';
import { project } from '../lib/mockData';

/* ---------- helpers ---------- */

const S = () => useUi.getState();
const el = (id: string) => {
  for (const sc of S().scenes) for (const t of sc.tracks) {
    const hit = t.elements.find((e) => e.id === id);
    if (hit) return hit;
  }
  throw new Error(`element ${id} not found`);
};
const track = (sceneId: string, trackId: string) =>
  S().scenes.find((sc) => sc.id === sceneId)!.tracks.find((t) => t.id === trackId)!;
const mainEls = () => track('sc-1', 'tr-main').elements.map((e) => e.id);

/* ---------- initial state ---------- */

describe('initial state (sample project boot)', () => {
  it('boots into Edit page, sc-1 active, select tool, snap+link on', () => {
    expect(S().page).toBe('edit');
    expect(S().activeSceneId).toBe('sc-1');
    expect(S().tool).toBe('select');
    expect(S().snap).toBe(true);
    expect(S().link).toBe(true);
    expect(S().lockAll).toBe(false);
  });

  it('boots with el-2 selected at 16 s, 46 px/s, loop from project', () => {
    expect(S().selection).toEqual(['el-2']);
    expect(S().playhead).toBe(16);
    expect(S().pxPerSec).toBe(46);
    expect(S().loop).toEqual(project.loop);
  });

  it('boots panels mediaPool+inspector on, effects off; mediaW 280 / inspectorW 340', () => {
    expect(S().panels).toEqual({ mediaPool: true, effects: false, inspector: true });
    expect(S().mediaW).toBe(280);
    expect(S().inspectorW).toBe(340);
  });

  it('boots the mixer sidecar covering every audio track in the project, dock collapsed', () => {
    expect(Object.keys(S().mixer.tracks).sort()).toEqual(['sc2-audio-1', 'tr-audio-1', 'tr-audio-2']);
    expect(S().mixerState).toBe('collapsed');
    expect(S().audioLaneBoost).toBe(false);
  });

  it('scenes are a detached clone of the fixture (mutating the store never leaks into project)', () => {
    act(() => { S().moveElement('el-1', 3); });
    expect(project.scenes[0].tracks[1].elements[0].startTime).toBe(0);
    expect(el('el-1').startTime).toBe(3);
  });
});

/* ---------- view state ---------- */

describe('page + view toggles', () => {
  it('setPage switches pages; leaving audio resets the lane boost (design §3.3)', () => {
    act(() => { S().setPage('audio'); });
    expect(S().page).toBe('audio');
    act(() => { S().setAudioLaneBoost(true); });
    act(() => { S().setPage('edit'); });
    expect(S().audioLaneBoost).toBe(false);
  });

  it('setTool / toggleSnap / toggleLink / toggleViewerOverlays / toggleViewerSafeGuides', () => {
    act(() => { S().setTool('blade'); S().toggleSnap(); S().toggleLink(); S().toggleViewerOverlays(); S().toggleViewerSafeGuides(); });
    expect(S().tool).toBe('blade');
    expect(S().snap).toBe(false);
    expect(S().link).toBe(false);
    expect(S().viewerOverlays).toBe(false);
    expect(S().viewerSafeGuides).toBe(true);
  });

  it('togglePanel flips one panel without touching the others', () => {
    act(() => { S().togglePanel('effects'); });
    expect(S().panels).toEqual({ mediaPool: true, effects: true, inspector: true });
    act(() => { S().togglePanel('mediaPool'); });
    expect(S().panels).toEqual({ mediaPool: false, effects: true, inspector: true });
  });

  it('width/height setters clamp to their spec ranges', () => {
    act(() => { S().setMediaW(50); });
    expect(S().mediaW).toBe(200);
    act(() => { S().setMediaW(9999); });
    expect(S().mediaW).toBe(480);
    act(() => { S().setInspectorW(10); });
    expect(S().inspectorW).toBe(280);
    act(() => { S().setInspectorW(9999); });
    expect(S().inspectorW).toBe(560);
    act(() => { S().setMainBodyH(5); });
    expect(S().mainBodyH).toBe(320);
    act(() => { S().setMainBodyH(9999); });
    expect(S().mainBodyH).toBe(900);
  });
});

/* ---------- transport ---------- */

describe('transport + playhead', () => {
  it('setPlayhead clamps to 0..600', () => {
    act(() => { S().setPlayhead(-1); });
    expect(S().playhead).toBe(0);
    act(() => { S().setPlayhead(9999); });
    expect(S().playhead).toBe(600);
  });

  it('nudgePlayhead moves by frames (1 frame = 1/24 s)', () => {
    act(() => { S().nudgePlayhead(24); });
    expect(S().playhead).toBe(17);
    act(() => { S().nudgePlayhead(-24); });
    expect(S().playhead).toBe(16);
  });

  it('togglePlay flips playing and resets rate to 1', () => {
    act(() => { S().setShuttle(4); });
    expect(S().playRate).toBe(4);
    act(() => { S().togglePlay(); });
    expect(S().playing).toBe(false);
    expect(S().playRate).toBe(1);
  });

  it('setPlaying(false) resets the rate; setShuttle(0) pauses', () => {
    act(() => { S().setShuttle(-2); });
    expect(S().playing).toBe(true);
    expect(S().playRate).toBe(-2);
    act(() => { S().setPlaying(false); });
    expect(S().playRate).toBe(1);
    act(() => { S().setShuttle(0); });
    expect(S().playing).toBe(false);
  });

  it('markIn / markOut snap the playhead to the frame grid', () => {
    act(() => { S().setPlayhead(16.02); });
    act(() => { S().markIn(); });
    expect(S().loop.start).toBe(16); // 16.02 s is inside frame 384 (16.0)
    act(() => { S().setPlayhead(20.02); S().markOut(); });
    expect(S().loop.end).toBe(20); // 20.02 → frame 480 (20.0)
  });

  it('clearInOut resets start=0 and end=scene duration (fallback 30)', () => {
    act(() => { S().markIn(); S().markOut(); S().clearInOut(); });
    expect(S().loop.start).toBe(0);
    expect(S().loop.end).toBe(30); // sc-1 duration
  });

  it('setLoopEnabled toggles', () => {
    act(() => { S().setLoopEnabled(true); });
    expect(S().loopEnabled).toBe(true);
  });
});

/* ---------- zoom ---------- */

describe('zoom', () => {
  it('setZoom / zoomStep clamp to 8..240 px/s', () => {
    act(() => { S().setZoom(2); });
    expect(S().pxPerSec).toBe(8);
    act(() => { S().setZoom(9999); });
    expect(S().pxPerSec).toBe(240);
    act(() => { S().setZoom(46); S().zoomStep(4); });
    expect(S().pxPerSec).toBe(184);
    act(() => { S().zoomStep(100); });
    expect(S().pxPerSec).toBe(240); // clamped
  });

  it('zoomFit solves px/s from container width and duration', () => {
    // 1024px container, 30 s → (1024-24)/32 = 31.25
    act(() => { S().zoomFit(1024, 30); });
    expect(S().pxPerSec).toBeCloseTo(31.25, 5);
  });
});

/* ---------- selection ---------- */

describe('selection semantics', () => {
  it('selectElement replaces by default, toggles when additive', () => {
    act(() => { S().selectElement('el-4', false); });
    expect(S().selection).toEqual(['el-4']);
    act(() => { S().selectElement('el-1', true); });
    expect(S().selection).toEqual(['el-4', 'el-1']);
    act(() => { S().selectElement('el-4', true); }); // toggle off
    expect(S().selection).toEqual(['el-1']);
  });

  it('selectTrackElements selects a whole track; additive merges as a set', () => {
    act(() => { S().setSelection(['el-2']); S().selectTrackElements('tr-audio-1', true); });
    expect(S().selection.sort()).toEqual(['el-2', 'el-6'].sort());
    act(() => { S().selectTrackElements('tr-main', false); });
    expect(S().selection).toEqual(['el-1', 'el-2', 'el-3', 'el-4']);
  });

  it('selectNeighbors walks the main track in time order, both directions', () => {
    // initial selection el-2
    act(() => { S().selectNeighbors(1); });
    expect(S().selection).toEqual(['el-3']);
    act(() => { S().selectNeighbors(1); });
    expect(S().selection).toEqual(['el-4']);
    act(() => { S().selectNeighbors(-1); });
    expect(S().selection).toEqual(['el-3']);
  });

  it('selectNeighbors with no selection lands on first (dir=1) / last (dir=-1)', () => {
    act(() => { S().setSelection([]); S().selectNeighbors(1); });
    expect(S().selection).toEqual(['el-1']);
    act(() => { S().setSelection([]); S().selectNeighbors(-1); });
    expect(S().selection).toEqual(['el-4']);
  });

  it('setActiveScene clears the selection', () => {
    act(() => { S().setActiveScene('sc-2'); });
    expect(S().activeSceneId).toBe('sc-2');
    expect(S().selection).toEqual([]);
  });
});

/* ---------- media pool selection ---------- */

describe('media pool state', () => {
  it('toggleMediaSelection replaces / additive-toggles / range-toggles', () => {
    expect(S().mediaSelection).toEqual(['m-02']); // boot default
    act(() => { S().toggleMediaSelection('m-01', false, false); });
    expect(S().mediaSelection).toEqual(['m-01']);
    act(() => { S().toggleMediaSelection('m-03', true, false); });
    expect(S().mediaSelection).toEqual(['m-01', 'm-03']);
    act(() => { S().toggleMediaSelection('m-01', true, false); });
    expect(S().mediaSelection).toEqual(['m-03']);
    // range behaves as additive-toggle in the mock (anchor approximation)
    act(() => { S().toggleMediaSelection('m-05', true, true); });
    expect(S().mediaSelection).toEqual(['m-03', 'm-05']);
  });

  it('setMediaDrag tracks the ghost (mediaId/overTrackId/allowed)', () => {
    act(() => { S().setMediaDrag({ mediaId: 'm-06', overTrackId: 'tr-audio-1', allowed: true }); });
    expect(S().mediaDrag).toEqual({ mediaId: 'm-06', overTrackId: 'tr-audio-1', allowed: true });
    act(() => { S().setMediaDrag(null); });
    expect(S().mediaDrag).toBeNull();
  });

  it('media view / search / sort prefs round-trip', () => {
    act(() => { S().setMediaView('list'); S().setSearch('marina'); S().setSortBy('duration'); S().setSortDir('desc'); });
    expect(S().mediaView).toBe('list');
    expect(S().search).toBe('marina');
    expect(S().sortBy).toBe('duration');
    expect(S().sortDir).toBe('desc');
  });
});

/* ---------- track focus ---------- */

describe('track focus (spec 16 §3.6)', () => {
  it('moveFocusedTrack from null enters at top (dir 1) / bottom (dir -1)', () => {
    act(() => { S().moveFocusedTrack(1); });
    expect(S().focusedTrackId).toBe('tr-overlay-1');
    act(() => { S().setFocusedTrack(null); S().moveFocusedTrack(-1); });
    expect(S().focusedTrackId).toBe('tr-audio-2');
  });

  it('moveFocusedTrack walks the stack and clamps at the ends', () => {
    act(() => { S().setFocusedTrack('tr-overlay-1'); S().moveFocusedTrack(1); });
    expect(S().focusedTrackId).toBe('tr-main');
    act(() => { S().moveFocusedTrack(-1); });
    expect(S().focusedTrackId).toBe('tr-overlay-1');
    act(() => { S().moveFocusedTrack(-1); });
    expect(S().focusedTrackId).toBe('tr-overlay-1'); // clamped
  });
});

/* ---------- toasts (spec 18 §6.4 + declared mock deviation) ---------- */

describe('toast stack', () => {
  it('pushes toasts with auto-incrementing ids and kinds', () => {
    act(() => { S().pushToast({ kind: 'error', title: 'A', detail: 'd' }); });
    act(() => { S().pushToast({ kind: 'info', title: 'B' }); });
    const toasts = S().toasts;
    expect(toasts).toHaveLength(2);
    expect(toasts[0].kind).toBe('error');
    expect(toasts[0].detail).toBe('d');
    expect(toasts[1].id).toBeGreaterThan(toasts[0].id);
  });

  it('MOCK DEVIATION (registered): stack max 3 — the oldest is DROPPED, not collapsed to an icon row', () => {
    for (const t of ['1st', '2nd', '3rd', '4th', '5th']) {
      act(() => { S().pushToast({ kind: 'info', title: t }); });
    }
    const titles = S().toasts.map((t) => t.title);
    expect(titles).toEqual(['3rd', '4th', '5th']); // oldest dropped (spec: oldest collapses)
  });

  it('dismissToast removes exactly one', () => {
    act(() => { S().pushToast({ kind: 'persist', title: 'keep' }); S().pushToast({ kind: 'info', title: 'gone' }); });
    const id = S().toasts.find((t) => t.title === 'gone')!.id;
    act(() => { S().dismissToast(id); });
    expect(S().toasts.map((t) => t.title)).toEqual(['keep']);
  });
});

/* ---------- save machine ---------- */

describe('save retry machine', () => {
  it('retrySave clears the failure flag and counts attempts', () => {
    act(() => { S().setSimulateSaveFail(true); S().retrySave(); });
    expect(S().simulateSaveFail).toBe(false);
    expect(S().saveAttempt).toBe(1);
  });
});

/* ---------- markers ---------- */

describe('markers', () => {
  it('addMarker snaps the time and cycles the palette', () => {
    act(() => { S().setPlayhead(20); S().addMarker(20.02); });
    const mk = S().scenes.find((sc) => sc.id === 'sc-1')!.markers;
    const added = mk.find((m) => Math.abs(m.time - 20) < 0.01)!;
    expect(added).toBeDefined();
    expect(added.label).toBe('Marker');
    // palette cursor = sc.markers.length % 8 BEFORE push (4) → colors[4] = 'blue'
    expect(added.color).toBe('blue');
  });

  it('addMarker with explicit color wins', () => {
    act(() => { S().addMarker(25, 'purple'); });
    const mk = S().scenes.find((sc) => sc.id === 'sc-1')!.markers;
    expect(mk.find((m) => m.time === 25)!.color).toBe('purple');
  });

  it('removeMarkersAt removes markers at the playhead (within 1 frame)', () => {
    act(() => { S().setPlayhead(15.5); S().removeMarkersAt(15.5); });
    const times = S().scenes.find((sc) => sc.id === 'sc-1')!.markers.map((m) => m.time);
    expect(times).not.toContain(15.5);
    expect(times).toEqual([0, 8.5, 24.0]);
  });

  it('removeMarkersAt with nothing to remove is a true no-op (no history entry)', () => {
    const pastBefore = S().past.length;
    act(() => { S().setPlayhead(19.7); S().removeMarkersAt(19.7); }); // no marker there
    expect(S().past.length).toBe(pastBefore);
  });
});

/* ---------- track flags + lock-all fan-out ---------- */

describe('track flag commands', () => {
  it('toggleTrackCmd flips one field on one track (undoable)', () => {
    act(() => { S().toggleTrackCmd('sc-1', 'tr-audio-1', 'muted'); });
    expect(track('sc-1', 'tr-audio-1').muted).toBe(true);
    act(() => { S().undo(); });
    expect(track('sc-1', 'tr-audio-1').muted).toBe(false);
  });

  it('toggleLockAll fans out to every track in the active scene (spec 18 §4.5)', () => {
    act(() => { S().toggleLockAll(); });
    const tracks = S().scenes.find((sc) => sc.id === 'sc-1')!.tracks;
    expect(S().lockAll).toBe(true);
    for (const t of tracks) expect(t.locked).toBe(true);
    act(() => { S().toggleLockAll(); });
    expect(S().lockAll).toBe(false);
    expect(track('sc-1', 'tr-audio-2').locked).toBe(false); // originally locked, now unlocked
  });
});

/* ---------- audio focus state machine (design doc §3) ---------- */

describe('audio focus', () => {
  it('enterAudioFocus switches page, opens the full dock, boosts lanes, focuses the strip', () => {
    act(() => { S().enterAudioFocus('shortcut', 'tr-audio-1'); });
    expect(S().page).toBe('audio');
    expect(S().mixerState).toBe('full');
    expect(S().audioLaneBoost).toBe(true);
    expect(S().stripFocus).toBe('tr-audio-1');
  });

  it('escalation trigger keeps the existing stripFocus; dock entry leaves it untouched', () => {
    act(() => { S().setStripFocus('tr-audio-2'); S().enterAudioFocus('escalation'); });
    expect(S().stripFocus).toBe('tr-audio-2');
    act(() => { S().exitAudioFocus(); S().enterAudioFocus('dock'); });
    expect(S().stripFocus).toBe('tr-audio-2'); // dock never resets it — only trackId sets it
  });

  it('exitAudioFocus returns to Edit and drops the lane boost', () => {
    act(() => { S().enterAudioFocus('dock'); S().exitAudioFocus(); });
    expect(S().page).toBe('edit');
    expect(S().audioLaneBoost).toBe(false);
  });

  it('auto-creates strips for audio tracks added after boot (G-slice sync)', () => {
    act(() => { S().addTrack('audio'); });
    const newId = S().scenes.find((sc) => sc.id === 'sc-1')!.tracks.at(-1)!.id;
    expect(S().mixer.tracks[newId]).toBeUndefined(); // not yet — sync happens on entry
    act(() => { S().enterAudioFocus('dock'); });
    expect(S().mixer.tracks[newId]).toBeDefined();
    expect(S().mixer.tracks[newId].fader).toBe(-6);
  });

  it('cycleMixerState: Edit walks collapsed → bridge → full → collapsed; Audio toggles bridge ↔ full', () => {
    act(() => { S().cycleMixerState(); });
    expect(S().mixerState).toBe('bridge');
    act(() => { S().cycleMixerState(); });
    expect(S().mixerState).toBe('full');
    act(() => { S().cycleMixerState(); });
    expect(S().mixerState).toBe('collapsed');
    act(() => { S().setPage('audio'); S().setMixerState('full'); S().cycleMixerState(); });
    expect(S().mixerState).toBe('bridge');
    act(() => { S().cycleMixerState(); });
    expect(S().mixerState).toBe('full');
  });
});

describe('mixer sidecar patches (immutability discipline)', () => {
  it('setMixerTrack patches one track on a fresh mixer object', () => {
    const before = S().mixer;
    act(() => { S().setMixerTrack('tr-audio-1', { fader: -12, pan: 25 }); });
    const after = S().mixer;
    expect(after).not.toBe(before);
    expect(after.tracks['tr-audio-1'].fader).toBe(-12);
    expect(after.tracks['tr-audio-1'].pan).toBe(25);
    expect(after.tracks['tr-audio-2']).toBe(before.tracks['tr-audio-2']); // untouched ref
  });

  it('setAuxBus patches one bus', () => {
    act(() => { S().setAuxBus('a2', { name: 'Delay', on: true }); });
    expect(S().mixer.buses.a2).toEqual({ name: 'Delay', returnGain: 0, on: true });
    expect(S().mixer.buses.a1.on).toBe(true); // untouched
  });

  it('setDucking creates defaults for unknown tracks then patches', () => {
    act(() => { S().setDucking('tr-audio-1', { amount: 0.9 }); });
    expect(S().mixer.ducking['tr-audio-1']).toEqual({ source: null, amount: 0.9, attack: 20, release: 400 });
  });
});

/* ---------- undo / redo mechanics ---------- */

describe('undo history mechanics', () => {
  it('undo on empty history is a no-op', () => {
    expect(() => act(() => { S().undo(); })).not.toThrow();
    expect(S().scenes).toHaveLength(2);
  });

  it('a doc mutation clears the redo stack (standard undo semantics)', () => {
    act(() => { S().deleteElements(['el-4'], false); });
    act(() => { S().undo(); });
    expect(S().future).toHaveLength(1);
    act(() => { S().deleteElements(['el-3'], false); }); // new mutation
    expect(S().future).toHaveLength(0);
  });

  it('undo restores the document AND the active scene id', () => {
    act(() => { S().deleteScene('sc-1'); });
    expect(S().activeSceneId).toBe('sc-2');
    act(() => { S().undo(); });
    expect(S().activeSceneId).toBe('sc-1');
    expect(S().scenes).toHaveLength(2);
    expect(mainEls()).toHaveLength(4);
  });

  it('redo re-applies the undone mutation; redo on empty future is a no-op', () => {
    act(() => { S().deleteElements(['el-1'], false); S().undo(); });
    expect(mainEls()).toContain('el-1');
    act(() => { S().redo(); });
    expect(mainEls()).not.toContain('el-1');
    expect(() => act(() => { S().redo(); })).not.toThrow();
  });

  it('history is capped at 50 entries', () => {
    for (let i = 0; i < 55; i++) {
      act(() => { S().toggleTrackCmd('sc-1', 'tr-audio-1', 'solo'); });
    }
    expect(S().past.length).toBeLessThanOrEqual(50);
  });
});

/* ---------- document mutations: the editing command set ---------- */

describe('moveElement', () => {
  it('moves with frame snapping and a 0 floor', () => {
    act(() => { S().moveElement('el-3', 17.02); });
    expect(el('el-3').startTime).toBe(17);
    act(() => { S().moveElement('el-3', -5); });
    expect(el('el-3').startTime).toBe(0);
  });
});

describe('trimElement', () => {
  it('left trim moves the start, keeps material, shifts sourceStart', () => {
    // el-2: 8.5..17.0, sourceStart 3.0
    act(() => { S().trimElement('el-2', 'l', 10.5, 6.5); });
    const e = el('el-2');
    expect(e.startTime).toBe(10.5);
    expect(e.duration).toBe(6.5);
    expect(e.sourceStart).toBeCloseTo(5.0, 5); // 3.0 + (10.5-8.5)
  });

  it('right trim keeps the start; sourceStart untouched', () => {
    act(() => { S().trimElement('el-1', 'r', 0, 4); });
    const e = el('el-1');
    expect(e.startTime).toBe(0);
    expect(e.duration).toBe(4);
    expect(e.sourceStart).toBe(12.0);
  });

  it('enforces the 0.25 s minimum duration', () => {
    act(() => { S().trimElement('el-3', 'r', 17, 0.01); });
    expect(el('el-3').duration).toBe(0.25);
  });
});

describe('splitElement', () => {
  it('splits at the cut: two clips, ids stable + -b suffix, source window split', () => {
    act(() => { S().splitElement('el-2', 12.75); });
    const els = mainEls();
    expect(els).toEqual(['el-1', 'el-2', 'el-2-b4', 'el-3', 'el-4']);
    const left = el('el-2');
    const right = el('el-2-b4');
    expect(left.duration).toBe(4.25);
    expect(right.startTime).toBe(12.75);
    expect(right.duration).toBe(4.25);
    expect(right.sourceStart).toBeCloseTo(7.25, 5);
    expect(left.transitionOut).toBeUndefined(); // left clip loses the transitionOut
  });

  it('rejects cuts within 0.1 s of either edge — no history entry', () => {
    const pastBefore = S().past.length;
    act(() => { S().splitElement('el-2', 8.5); }); // exactly at start
    expect(S().past.length).toBe(pastBefore);
    expect(mainEls()).toHaveLength(4);
    act(() => { S().splitElement('el-2', 16.95); }); // 0.05 before end
    expect(S().past.length).toBe(pastBefore);
  });

  it('unknown id is a no-op', () => {
    act(() => { S().splitElement('nope', 5); });
    expect(mainEls()).toHaveLength(4);
  });
});

describe('effects commands', () => {
  it('toggleEffect flips the enabled flag (fx-1 starts disabled)', () => {
    act(() => { S().toggleEffect('el-1', 'fx-1'); });
    expect(el('el-1').effects![0].enabled).toBe(true);
    act(() => { S().undo(); });
    expect(el('el-1').effects![0].enabled).toBe(false);
  });

  it('addEffectToElement creates the effects array and assigns an id', () => {
    act(() => { S().addEffectToElement('el-3', { name: 'Vignette', enabled: true }); });
    const fx = el('el-3').effects!;
    expect(fx).toHaveLength(1);
    expect(fx[0].name).toBe('Vignette');
    expect(fx[0].id).toMatch(/^fx-/);
  });

  it('setEffectParam writes into params (creating the record) and removeEffect drops it', () => {
    act(() => { S().setEffectParam('el-1', 'fx-1', 'radius', 42); });
    expect(el('el-1').effects![0].params).toEqual({ radius: 42 });
    act(() => { S().removeEffect('el-1', 'fx-1'); });
    expect(el('el-1').effects).toEqual([]);
  });

  it('REGRESSION (deep clone): undo/redo round-trips NESTED mutations — effects + transitionOut', () => {
    // R11 shallow-clone bug: nested refs were shared across history snapshots,
    // so undo silently kept the mutation. The deep clone fixes the round-trip.
    act(() => { S().setEffectParam('el-1', 'fx-1', 'radius', 42); });
    act(() => { S().setTransition('el-2', { duration: 2 }); });
    act(() => { S().undo(); S().undo(); });
    expect(el('el-1').effects![0].params).toBeUndefined();  // param edit undone
    expect(el('el-2').transitionOut!.duration).toBe(0.75);  // transition patch undone
    act(() => { S().redo(); });
    expect(el('el-1').effects![0].params).toEqual({ radius: 42 }); // redo restores
  });
});

describe('deleteElements', () => {
  it('plain delete leaves a gap (later clips keep their start times)', () => {
    act(() => { S().deleteElements(['el-2'], false); });
    expect(mainEls()).toEqual(['el-1', 'el-3', 'el-4']);
    expect(el('el-3').startTime).toBe(17.0);
  });

  it('ripple delete closes the gap by shifting later clips left', () => {
    act(() => { S().deleteElements(['el-2'], true); });
    expect(mainEls()).toEqual(['el-1', 'el-3', 'el-4']);
    expect(el('el-3').startTime).toBeCloseTo(8.5, 5);  // 17.0 - 8.5
    expect(el('el-4').startTime).toBeCloseTo(15.5, 5); // 24.0 - 8.5
  });

  it('prunes deleted ids out of the selection', () => {
    act(() => { S().deleteElements(['el-2'], false); }); // selection was [el-2]
    expect(S().selection).toEqual([]);
  });

  it('deletes across tracks in one command', () => {
    act(() => { S().deleteElements(['el-2', 'el-6'], false); });
    expect(mainEls()).toEqual(['el-1', 'el-3', 'el-4']);
    expect(track('sc-1', 'tr-audio-1').elements).toHaveLength(0);
  });
});

describe('duplicateElements', () => {
  it('appends copies after the originals and selects the copies', () => {
    act(() => { S().duplicateElements(['el-2']); });
    const els = mainEls();
    expect(els).toHaveLength(5);
    const dupe = els.find((id) => id.startsWith('el-2-d'))!;
    expect(el(dupe).startTime).toBeCloseTo(17.0, 5); // 8.5 + 8.5
    expect(el(dupe).duration).toBe(8.5);
    expect(S().selection).toEqual([dupe]);
  });
});

describe('slipNudge', () => {
  it('slips the source window by frames while placement stays fixed', () => {
    act(() => { S().slipNudge(['el-2'], 24); }); // +1 s of source
    const e = el('el-2');
    expect(e.sourceStart).toBeCloseTo(4.0, 5);
    expect(e.startTime).toBe(8.5);
    expect(e.duration).toBe(8.5);
  });

  it('guards: slipping far negative leaves the sourceStart untouched (never < 0)', () => {
    act(() => { S().setActiveScene('sc-2'); S().slipNudge(['s2-1'], -100 * 24); });
    expect(el('s2-1').sourceStart).toBe(20.0);
  });

  it('ignores elements without a sourceStart (e.g. text el-5)', () => {
    act(() => { S().slipNudge(['el-5'], 24); });
    expect(el('el-5').sourceStart).toBeUndefined();
  });
});

describe('trimToPlayhead', () => {
  it('l-edge: trims clip start to the playhead (unlocked tracks only)', () => {
    act(() => { S().setPlayhead(16); S().trimToPlayhead('l', false); });
    const e = el('el-2'); // 8.5..17.0 contains 16
    expect(e.startTime).toBe(16);
    expect(e.duration).toBeCloseTo(1.0, 5);
    expect(e.sourceStart).toBeCloseTo(10.5, 5); // 3.0 + 7.5
  });

  it('r-edge: trims clip end to the playhead', () => {
    act(() => { S().setPlayhead(4); S().trimToPlayhead('r', false); });
    expect(el('el-1').duration).toBe(4);
  });

  it('skips locked tracks (tr-audio-2 is locked in the fixture)', () => {
    act(() => { S().setPlayhead(10); S().trimToPlayhead('l', false); });
    expect(el('el-7').duration).toBe(8.5); // untouched
  });

  it('guards a 0.1 s minimum REMAINING duration on both edges', () => {
    act(() => { S().setPlayhead(16.95); S().trimToPlayhead('l', false); }); // end − 0.05 → reject
    expect(el('el-2').startTime).toBe(8.5); // unchanged
    act(() => { S().setPlayhead(8.6); S().trimToPlayhead('r', false); }); // start + 0.083 → reject
    expect(el('el-2').duration).toBe(8.5); // unchanged
  });
});

describe('setElementField / setTransition', () => {
  it('setElementField merges a patch into the element', () => {
    act(() => { S().setElementField('el-6', { volume: 0.55, audioFadeOut: 3 }); });
    const e = el('el-6');
    expect(e.volume).toBe(0.55);
    expect(e.audioFadeOut).toBe(3);
  });

  it('setTransition creates a default crossfade then patches when none exists', () => {
    act(() => { S().setTransition('el-3', { duration: 1.25, presentation: 'Dip to Black' }); });
    const t = el('el-3').transitionOut!;
    expect(t.type).toBe('crossfade');
    expect(t.presentation).toBe('Dip to Black');
    expect(t.duration).toBe(1.25);
    expect(t.alignment).toBe(0.5);
  });

  it('setTransition patches the existing transition in place', () => {
    act(() => { S().setTransition('el-2', { alignment: 0.25 }); });
    expect(el('el-2').transitionOut!.alignment).toBe(0.25);
    expect(el('el-2').transitionOut!.duration).toBe(0.75); // untouched
  });
});

describe('addTrack', () => {
  it('inserts overlay tracks above main (spec 05 §12.1)', () => {
    act(() => { S().addTrack('overlay'); });
    const kinds = S().scenes.find((sc) => sc.id === 'sc-1')!.tracks.map((t) => t.kind);
    expect(kinds).toEqual(['overlay', 'overlay', 'main', 'audio', 'audio']);
    const added = S().scenes.find((sc) => sc.id === 'sc-1')!.tracks[1];
    expect(added.name).toBe('Text 2');
    expect(added.badge).toBe('T2');
  });

  it('inserts main tracks directly below main', () => {
    act(() => { S().addTrack('main'); });
    const kinds = S().scenes.find((sc) => sc.id === 'sc-1')!.tracks.map((t) => t.kind);
    expect(kinds).toEqual(['overlay', 'main', 'main', 'audio', 'audio']);
    expect(S().scenes.find((sc) => sc.id === 'sc-1')!.tracks[2].badge).toBe('V2');
  });

  it('appends audio tracks at the bottom with waveform on', () => {
    act(() => { S().addTrack('audio'); });
    const tracks = S().scenes.find((sc) => sc.id === 'sc-1')!.tracks;
    expect(tracks.at(-1)!.kind).toBe('audio');
    expect(tracks.at(-1)!.waveform).toBe(true);
    expect(tracks.at(-1)!.badge).toBe('A3');
  });
});

describe('scene management', () => {
  it('createScene adds a 3-track scene, activates it, clears selection', () => {
    act(() => { S().createScene(); });
    expect(S().scenes).toHaveLength(3);
    const sc = S().scenes.at(-1)!;
    expect(S().activeSceneId).toBe(sc.id);
    expect(sc.dirty).toBe(true);
    expect(sc.tracks.map((t) => t.kind)).toEqual(['overlay', 'main', 'audio']);
    expect(S().selection).toEqual([]);
  });

  it('deleteScene refuses to delete the last scene', () => {
    act(() => { S().deleteScene('sc-2'); S().deleteScene('sc-1'); });
    expect(S().scenes).toHaveLength(1);
  });

  it('deleteScene of the active scene moves activation to the neighbor', () => {
    act(() => { S().deleteScene('sc-1'); });
    expect(S().activeSceneId).toBe('sc-2');
    expect(S().selection).toEqual([]);
  });
});

describe('loadSampleProject (spec 18 §4.10 recipe)', () => {
  it('replaces the active scene with the 30 s sample layout and resets transport', () => {
    act(() => { S().loadSampleProject(); });
    const sc = S().scenes.find((x) => x.id === 'sc-1')!;
    expect(sc.tracks.map((t) => t.id)).toEqual(['t-ov-sample', 't-mn-sample', 't-au-sample']);
    expect(sc.markers).toEqual([{ id: 'mk-sample-1', time: 10, label: 'Marker', color: 'blue' }]);
    expect(S().selection).toEqual([]);
    expect(S().playhead).toBe(0);
    // 3 video + 1 text + 1 audio + crossfade on v1
    expect(sc.tracks[1].elements).toHaveLength(3);
    expect(sc.tracks[1].elements[0].transitionOut!.duration).toBe(1);
    expect(sc.tracks[2].elements[0].duration).toBe(30);
  });
});

/* ---------- derived helpers ---------- */

describe('useActiveScene', () => {
  it('tracks the active scene id', () => {
    const { result, rerender } = renderHook(() => useActiveScene());
    expect(result.current.id).toBe('sc-1');
    act(() => { S().setActiveScene('sc-2'); });
    rerender();
    expect(result.current.id).toBe('sc-2');
  });
});

describe('trackHeights (spec 05 §12.2)', () => {
  it('filmstrip: main 80 / audio 60 / overlay 60', () => {
    expect(trackHeights('main', 'filmstrip')).toBe(80);
    expect(trackHeights('audio', 'filmstrip')).toBe(60);
    expect(trackHeights('overlay', 'filmstrip')).toBe(60);
  });

  it('blocks (davinci-compact): main 40 / audio 34 / overlay 28', () => {
    expect(trackHeights('main', 'blocks')).toBe(40);
    expect(trackHeights('audio', 'blocks')).toBe(34);
    expect(trackHeights('overlay', 'blocks')).toBe(28);
  });
});

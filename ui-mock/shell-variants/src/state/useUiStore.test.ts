/* useUiStore — the mock UI + doc state machine. This is the heart of the
   "frontend UI logic" test surface: view-state actions, selection semantics,
   toast stack, undo history mechanics, every document mutation (the editing
   command set), the audio-focus state machine, and the mixer sidecar
   immutability discipline. Fixtures = the sample project (spec 18 §4.10). */

import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useActiveScene, trackHeights, useUi, mintTrackIds, activeTrackOf, resolveTimelineCompact } from './useUiStore';
import { resolveGroupMove } from '../lib/timelinePlacement';
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
    // el-5 lives on the sparsely-populated overlay lane — a free-spot move
    // (R15 T3: main-track moves now zero-anchor + reject overlaps, so el-1
    // to t=3 would magnetically land at 0 instead of stacking onto el-2)
    act(() => { S().moveElement('el-5', 3); });
    expect(project.scenes[0].tracks[0].elements[0].startTime).toBe(8.75);
    expect(el('el-5').startTime).toBe(3);
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
  it('setPlayhead clamps to [0, ACTIVE SCENE duration] (R15 T8 — R15-F1 FIX 4a replaces the 600 law)', () => {
    act(() => { S().setPlayhead(-1); });
    expect(S().playhead).toBe(0);
    act(() => { S().setPlayhead(9999); });
    expect(S().playhead).toBe(30); // sc-1 duration (fixture: el-4 / el-6 end at 30)
    // the domain follows the ACTIVE scene (sc-2 = 19.5 s) and an empty
    // scene clamps to [0, 0]
    act(() => { S().setActiveScene('sc-2'); S().setPlayhead(50); });
    expect(S().playhead).toBe(19.5);
    act(() => { S().createScene(); S().setPlayhead(5); });
    expect(S().playhead).toBe(0);
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
  it('setZoom / zoomStep clamp to the canonical 5..5000 px/s zoom domain (R15 T1: pps = 50 × zoom ∈ [0.1, 100])', () => {
    act(() => { S().setZoom(2); });
    expect(S().pxPerSec).toBe(5);
    act(() => { S().setZoom(9999); });
    expect(S().pxPerSec).toBe(5000);
    act(() => { S().setZoom(46); S().zoomStep(4); });
    expect(S().pxPerSec).toBe(184);
    act(() => { S().zoomStep(100); });
    expect(S().pxPerSec).toBe(5000); // clamped
  });

  it('setZoomMin stores the dynamic fit-min (spec-05 §5.2) and reconciles zoom below it', () => {
    act(() => { S().setZoom(46); S().setZoomMin(20); });
    expect(S().zoomMinPps).toBe(20);
    expect(S().pxPerSec).toBe(46); // above the min: untouched
    act(() => { S().setZoom(10); });
    expect(S().pxPerSec).toBe(20); // below the min: reconciled up
    act(() => { S().setZoomMin(2); });
    expect(S().zoomMinPps).toBe(5); // static floor 0.1 zoom
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

  /* ---------- R23-FIX (review-sweep): the domain-clear law closes its gaps ---------- */

  it('R23-FIX item 2 (R2-F1): scene switch clears the marker domain — the 7th clear-site law', () => {
    act(() => { S().setActiveScene('sc-1'); });
    act(() => { S().selectMarker('mk-2'); });
    expect(S().selectedMarkerId).toBe('mk-2');
    act(() => { S().setActiveScene('sc-2'); });
    /* marker ids are scene-scoped (scene.markers): a carried id resolved to
       nothing in the new scene and the AppShell rail swap mounted a BLANK
       MarkerInspector (the stale-id blank-rail bug, R2-F1/R5-P2-1) */
    expect(S().selectedMarkerId).toBe(null);
    act(() => { S().setActiveScene('sc-1'); }); // restore for the siblings below
  });

  it('R23-FIX item 2: deleting the ACTIVE scene clears the marker domain too (it is a scene switch)', () => {
    act(() => { S().setActiveScene('sc-1'); });
    act(() => { S().selectMarker('mk-2'); });
    act(() => { S().deleteScene('sc-1'); });
    expect(S().activeSceneId).toBe('sc-2');
    expect(S().selectedMarkerId).toBe(null); // never a stale blank rail on the successor scene
    act(() => { S().undo(); }); // restore sc-1 (the undo-history suite's own pattern)
    expect(S().activeSceneId).toBe('sc-1');
  });

  /* R24-W5c (DESIGN-R24 §2 F4-P3): the 8th clear-site domain — stripFocus.
     A focused strip carried across a scene switch resolved to a track id
     that exists in NO new scene (harmless today — the ChannelEditor's
     stripLive resolver degrades to the first-track fallback — but the
     store carried the stale id; the D-C2 class). */
  it('R24-W5c F4: scene switch clears stripFocus — the 8th clear-site domain (no stale mixer focus)', () => {
    act(() => { S().setActiveScene('sc-1'); });
    act(() => { S().setStripFocus('tr-audio-2'); });
    expect(S().stripFocus).toBe('tr-audio-2');
    act(() => { S().setActiveScene('sc-2'); });
    expect(S().stripFocus).toBe(null); // the focus died with the scene
    act(() => { S().setActiveScene('sc-1'); }); // restore for the siblings below
  });

  it('R23-FIX item 3 (R5-P2-2): Tab selection clears the marker domain (+ track + project mode)', () => {
    /* the prior state a Tab walk can hit: marker rail live + a selection
       cursor + project mode on (booted directly — the domain writers can't
       co-live through their own APIs, but the neighbor writer must clear
       them from ANY prior state, the same spread setSelection carries) */
    act(() => {
      useUi.setState({ activeSceneId: 'sc-1', selection: ['el-2'], selectedMarkerId: 'mk-2', selectedTrackId: 'tr-audio-1', inspectorProjectMode: true });
    });
    act(() => { S().selectNeighbors(1); }); // Tab → el-3
    expect(S().selection).toEqual(['el-3']);
    expect(S().selectedMarkerId).toBe(null); // the marker domain died with the fresh clip selection
    expect(S().selectedTrackId).toBe(null);
    expect(S().inspectorProjectMode).toBe(false); // a domain change exits project mode
  });

  it('R23-FIX item 3: ⌘A (selectTrackElements) exits project mode + clears the marker domain', () => {
    act(() => {
      useUi.setState({ activeSceneId: 'sc-1', selection: ['el-2'], selectedMarkerId: 'mk-1', inspectorProjectMode: true });
    });
    act(() => { S().selectTrackElements('tr-main', false); });
    expect(S().selection).toEqual(['el-1', 'el-2', 'el-3', 'el-4']);
    expect(S().inspectorProjectMode).toBe(false); // ⌘A exits project mode — same spread setSelection uses
    expect(S().selectedMarkerId).toBe(null);
    expect(S().selectedTrackId).toBe(null);
  });

  it('R23-FIX item 3: the effect domain rides the Tab survival law (alive while its clip IS the selection, dead when it leaves)', () => {
    act(() => { useUi.setState({ activeSceneId: 'sc-1', selection: ['el-1'] }); });
    act(() => { S().selectEffect('el-1', 'fx-1'); });
    act(() => { S().selectNeighbors(-1); }); // clamps at el-1 (first on main) — the clip survives the write
    expect(S().selection).toEqual(['el-1']);
    expect(S().selectedEffectId).toBe('fx-1'); // alive — its clip IS the new selection (D4.2)
    act(() => { S().selectNeighbors(1); }); // Tab → el-2: the effect's clip left the selection
    expect(S().selection).toEqual(['el-2']);
    expect(S().selectedEffectId).toBe(null); // dead — the same law setSelection carries
    expect(S().selectedEffectClipId).toBe(null);
  });
});

/* ---------- media pool selection ---------- */

describe('media pool state', () => {
  it('toggleMediaSelection replaces / additive-toggles (range selection is MediaPool-owned)', () => {
    expect(S().mediaSelection).toEqual(['m-02']); // boot default
    act(() => { S().toggleMediaSelection('m-01', false); });
    expect(S().mediaSelection).toEqual(['m-01']);
    act(() => { S().toggleMediaSelection('m-03', true); });
    expect(S().mediaSelection).toEqual(['m-01', 'm-03']);
    act(() => { S().toggleMediaSelection('m-01', true); });
    expect(S().mediaSelection).toEqual(['m-03']);
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
    expect(S().focusedTrackId).toBe('tr-caption'); // R19: the caption lane is the bottom track now
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
    // palette cursor = sc.markers.length % 8 BEFORE push (5) → colors[5] = 'purple'
    expect(added.color).toBe('purple');
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
    expect(times).toEqual([0, 8.5, 24.0, 17.0]); // the 17-24 range marker survives (R19)
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

  /* R24-W1 (DESIGN-R24 §1.3 A3-R3; issues #65/#66 — cycleMixerState is
     DELETED; these pins guard the deletion so it can never silently
     return): the store exposes NO cycle action and NO floor-warn flag. */
  it('R24-W1 deletion pins: cycleMixerState + mixerFloorWarned are gone from the store (they can never silently return)', () => {
    const s = S() as unknown as Record<string, unknown>;
    expect(s.cycleMixerState).toBeUndefined();
    expect(s.mixerFloorWarned).toBeUndefined();
    // the cycle's page-aware meters↔full branch died with it — the only
    // writers left are setMixerState (raw) + toggleMixerOpen (binary)
    expect(typeof s.setMixerState).toBe('function');
    expect(typeof s.toggleMixerOpen).toBe('function');
  });

  it('R24-W1 (A3-R3/#65/#66): toggleMixerOpen is a BINARY toggle with lastVisual memory (full by default)', () => {
    expect(S().mixerState).toBe('collapsed');
    expect(S().mixerLastVisual).toBe('full'); // the default re-open target
    act(() => { S().toggleMixerOpen(); });
    expect(S().mixerState).toBe('full'); // collapsed → the remembered visual
    act(() => { S().toggleMixerOpen(); });
    expect(S().mixerState).toBe('collapsed'); // open → closed, memory kept
    expect(S().mixerLastVisual).toBe('full');
    act(() => { S().toggleMixerOpen(); });
    expect(S().mixerState).toBe('full'); // round-trip returns to the memory
    // the meters visual is a legit memory (the audio page's mode — the dock
    // header's mode action writes it, the close remembers it)
    act(() => { S().setMixerState('meters'); });
    act(() => { S().toggleMixerOpen(); });
    expect(S().mixerState).toBe('collapsed');
    expect(S().mixerLastVisual).toBe('meters');
    act(() => { S().toggleMixerOpen(); });
    expect(S().mixerState).toBe('meters'); // re-open returns to the LAST non-collapsed state
    act(() => { useUi.setState({ mixerState: 'collapsed', mixerLastVisual: 'full' }); });
  });

  it('strip display flags (R20-W1 B6): R/I toggle in STORE view-state, defaulting off/on', () => {
    expect(S().stripArm).toEqual({});
    expect(S().stripInsertsOn).toEqual({});
    act(() => { S().toggleStripArm('tr-audio-1'); });
    expect(S().stripArm['tr-audio-1']).toBe(true);
    act(() => { S().toggleStripArm('tr-audio-1'); });
    expect(S().stripArm['tr-audio-1']).toBe(false);
    act(() => { S().toggleStripInserts('tr-audio-2'); });
    expect(S().stripInsertsOn['tr-audio-2']).toBe(false); // boots ON (?? true)
    act(() => { S().toggleStripInserts('tr-audio-2'); });
    expect(S().stripInsertsOn['tr-audio-2']).toBe(true);
    // R24-W1: mixerFloorWarned is DELETED (the floor is a silent render-level
    // fallback in MixerDock's container now — deletion-pinned above)
  });

  /* R23-WC (DESIGN-R23 D-C3; issue #70): the full dock's master/bus bank
     meters-only collapse — view state in the stripArm precedent's law, never
     inside a withHistory snapshot (the undo round-trip is the pin). */
  it('masterBusCollapsed (D-C3/#70): boots expanded, toggles, and never rides a snapshot', () => {
    expect(S().masterBusCollapsed).toBe(false); // the bank boots FULL strips
    act(() => { S().toggleMasterBus(); });
    expect(S().masterBusCollapsed).toBe(true);
    // a doc mutation mints a history entry; undoing it must NOT revert the
    // flag (the snapshot slice stays scenes/activeSceneId/lockAll/selection/
    // mockGrades — view state rides no snapshot)
    const pastBefore = S().past.length;
    act(() => { S().toggleTrackCmd('sc-1', 'tr-audio-1', 'solo'); });
    expect(S().past.length).toBe(pastBefore + 1);
    act(() => { S().undo(); });
    expect(S().past.length).toBe(pastBefore);
    expect(S().masterBusCollapsed).toBe(true); // survived the undo round-trip
    act(() => { S().toggleMasterBus(); });
    expect(S().masterBusCollapsed).toBe(false);
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
    // el-5 (overlay, sole occupant) — free-spot moves so the snap + floor
    // laws are observable without tripping the overlap rejection
    act(() => { S().moveElement('el-5', 12.51); });
    expect(el('el-5').startTime).toBe(12.5);
    act(() => { S().moveElement('el-5', -5); });
    expect(el('el-5').startTime).toBe(0);
  });

  /* R15 T3 CONTRACT CHANGE (canonical, spec-05 §8.3 / seam §12): moves
     REJECT half-open overlaps instead of silently stacking — the old mock
     let moveElement park clips on top of each other. */
  it('R15 T3: overlapping moves are REJECTED (half-open [start,end)) — no write, no history', () => {
    const pastBefore = S().past.length;
    // el-3 [17,24) → 18 would overlap el-4 [24,30) by 1 s
    act(() => { S().moveElement('el-3', 18); });
    expect(el('el-3').startTime).toBe(17); // stays
    expect(S().past.length).toBe(pastBefore);
    // boundary case (sc-2): abutting end-to-start is NOT an overlap (half-open)
    act(() => { S().setActiveScene('sc-2'); S().moveElement('s2-6', 14.25); });
    expect(el('s2-6').startTime).toBe(14.25); // [14.25,19.25) abuts s2-5's end 14.25
    // 1 frame earlier WOULD overlap s2-5 → rejected
    act(() => { S().moveElement('s2-6', 14); });
    expect(el('s2-6').startTime).toBe(14.25);
  });

  it('R15 T3: zero-anchor (spec-05 §14.5A) — a main move at/before the earliest stationary main start pins at 0', () => {
    // clear el-1 so the earliest STATIONARY main clip is el-3 at 17
    act(() => { S().deleteElements(['el-1'], false); });
    // el-2 [8.5,17) → 5: 5 ≤ 17 → magnetic main pins the request at 0
    act(() => { S().moveElement('el-2', 5); });
    expect(el('el-2').startTime).toBe(0); // landed at 0, not 5
    // a request PAST the earliest stationary start keeps the requested time
    act(() => { S().moveElement('el-2', 30); });
    expect(el('el-2').startTime).toBe(30);
    // sole main element: main is (virtually) empty → always 0, it can never leave
    act(() => { S().deleteElements(['el-3', 'el-4'], false); });
    act(() => { S().moveElement('el-2', 12); });
    expect(el('el-2').startTime).toBe(0);
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

  it('enforces the 1-frame minimum duration (spec-06 §5.2 — R15 T4 replaced the 0.25 s mock floor)', () => {
    act(() => { S().trimElement('el-3', 'r', 17, 0.01); });
    expect(el('el-3').duration).toBeCloseTo(1 / 24, 6);
  });

  it('R15 T4: trimElement does NOT re-snap — the gesture owns frame alignment (single owner)', () => {
    // 7.6 is off the 24 fps grid; the R14 law snapped it to 7.5833. The T4
    // law trusts the caller's delta (the gesture already frame-snapped once);
    // only bounds may pull a value off-grid (source-extent beats alignment).
    // el-6 (A1, no right neighbor, 120 s source) has extension room to spare.
    act(() => { S().trimElement('el-6', 'r', 0, 7.6); });
    expect(el('el-6').duration).toBeCloseTo(7.6, 6);
  });
});

describe('splitElement', () => {
  it('splits at the cut: two clips, stable left id + unique right id, source window split', () => {
    act(() => { S().splitElement('el-2', 12.75); });
    const els = mainEls();
    expect(els).toHaveLength(5);
    const rightId = els.find((id) => id !== 'el-2' && id.startsWith('el-2-b'))!;
    expect(els).toEqual(['el-1', 'el-2', rightId, 'el-3', 'el-4']);
    const left = el('el-2');
    const right = el(rightId);
    expect(left.duration).toBe(4.25);
    expect(right.startTime).toBe(12.75);
    expect(right.duration).toBe(4.25);
    expect(right.sourceStart).toBeCloseTo(7.25, 5);
    expect(left.transitionOut).toBeUndefined(); // left clip loses the transitionOut
  });

  it('rejects cuts within 1 frame of either edge — no history entry (spec-06 §5.2, R15 T4)', () => {
    const pastBefore = S().past.length;
    act(() => { S().splitElement('el-2', 8.5); }); // exactly at start
    expect(S().past.length).toBe(pastBefore);
    expect(mainEls()).toHaveLength(4);
    act(() => { S().splitElement('el-2', 16.99); }); // 0.01 s before end — sub-frame
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
  it("l-edge: trims the SELECTED clip's start to the playhead (unlocked tracks only)", () => {
    act(() => { S().setPlayhead(16); S().trimToPlayhead('l', false); });
    const e = el('el-2'); // selection ['el-2'] contains 16
    expect(e.startTime).toBe(16);
    expect(e.duration).toBeCloseTo(1.0, 5);
    expect(e.sourceStart).toBeCloseTo(10.5, 5); // 3.0 + 7.5
    // P1 target constraint: the audio bed under the same playhead is UNTOUCHED
    expect(el('el-6').duration).toBe(30);
  });

  it('r-edge: with no selection, trims the main-track clip under the playhead', () => {
    act(() => { S().setSelection([]); S().setPlayhead(4); S().trimToPlayhead('r', false); });
    expect(el('el-1').duration).toBe(4); // main-track fallback target
  });

  it('P1 fix: one keypress never destroys unselected material — other scenes and unselected tracks untouched', () => {
    // sc-2's selects sit under the playhead too (0..19.5) — they must survive
    act(() => { S().setPlayhead(10); S().trimToPlayhead('r', true); });
    expect(el('s2-1').duration).toBe(6.25); // sc-2 untouched
    expect(el('s2-2').duration).toBe(7.75);
    expect(el('el-6').duration).toBe(30);   // audio bed untouched (not selected)
  });

  it('skips locked tracks (tr-audio-2 is locked in the fixture)', () => {
    act(() => { S().setPlayhead(10); S().trimToPlayhead('l', false); });
    expect(el('el-7').duration).toBe(8.5); // untouched
  });

  it('guards a 1-frame minimum REMAINING duration on both edges (spec-06 §5.2, R15 T4)', () => {
    // 16.97 snaps to end − MIN exactly (16.9583) — the boundary is exclusive → refuse
    act(() => { S().setPlayhead(16.97); S().trimToPlayhead('l', false); });
    expect(el('el-2').startTime).toBe(8.5); // unchanged
    // 8.53 snaps to start + MIN exactly (8.5417) — likewise refused
    act(() => { S().setPlayhead(8.53); S().trimToPlayhead('r', false); });
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
    expect(kinds).toEqual(['overlay', 'overlay', 'main', 'audio', 'audio', 'caption']);
    const added = S().scenes.find((sc) => sc.id === 'sc-1')!.tracks[1];
    expect(added.name).toBe('Text 2');
    expect(added.badge).toBe('T2');
  });

  it('inserts main tracks directly below main', () => {
    act(() => { S().addTrack('main'); });
    const kinds = S().scenes.find((sc) => sc.id === 'sc-1')!.tracks.map((t) => t.kind);
    expect(kinds).toEqual(['overlay', 'main', 'main', 'audio', 'audio', 'caption']);
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

describe('setMainBodyH (0 = auto sentinel)', () => {
  it('preserves 0 as the §3.2 auto value (40% of viewport); drags clamp to 320..900', () => {
    act(() => { S().setMainBodyH(0); });
    expect(S().mainBodyH).toBe(0);
    act(() => { S().setMainBodyH(-5); });
    expect(S().mainBodyH).toBe(0); // negatives collapse to auto
    act(() => { S().setMainBodyH(440); });
    expect(S().mainBodyH).toBe(440);
    act(() => { S().setMainBodyH(9999); });
    expect(S().mainBodyH).toBe(900);
  });
});

/* ---------- R13 review-fix regressions ---------- */

describe('R13 review fixes', () => {
  it('P1 fix: setMixerTrack on a track missing from the sidecar seeds full defaults (no partial record)', () => {
    // addTrack('audio') creates a track the G-slice does not know yet
    act(() => { S().addTrack('audio'); });
    const newId = S().scenes.find((sc) => sc.id === 'sc-1')!.tracks.at(-1)!.id;
    act(() => { S().setMixerTrack(newId, { fader: -10 }); });
    const strip = S().mixer.tracks[newId];
    expect(strip).toEqual({
      fader: -10, pan: 0, inserts: [null, null], auxA: 0, auxB: 0, auxPreFader: false, outputBus: 0,
    });
  });

  it('P2 fix: undoing lock-all restores the lockAll flag too (no aria-pressed lie)', () => {
    act(() => { S().toggleLockAll(); });
    expect(S().lockAll).toBe(true);
    act(() => { S().undo(); });
    expect(S().lockAll).toBe(false); // flag restored alongside the doc
    // doc restored to the fixture state: only tr-audio-2 is locked
    const tracks = S().scenes.find((sc) => sc.id === 'sc-1')!.tracks;
    expect(tracks.map((t) => t.locked)).toEqual([false, false, false, true, false]);
    // and a fresh lock-all after the undo still works in the right direction
    act(() => { S().toggleLockAll(); });
    expect(S().lockAll).toBe(true);
    const fresh = S().scenes.find((sc) => sc.id === 'sc-1')!.tracks; // re-fetch: history clones the doc
    expect(fresh.map((t) => t.locked)).toEqual([true, true, true, true, true]);
  });

  it('P2 fix: deleteElements is inert on locked tracks (spec 18 §4.5 / the pinned clip-guard)', () => {
    // el-7 lives on the LOCKED tr-audio-2 fixture track
    act(() => { S().deleteElements(['el-7'], false); });
    expect(el('el-7')).toBeDefined(); // survived
    expect(S().past.length).toBe(0);  // true no-op — no history entry
    expect(S().selection).toEqual(['el-2']); // not pruned either
    // mixed selection: the unlocked half deletes, the locked half stays
    act(() => { S().deleteElements(['el-2', 'el-7'], false); });
    expect(() => el('el-2')).toThrow();
    expect(el('el-7')).toBeDefined();
  });

  it('P2 fix: trimToPlayhead ripple-l removes the head and closes the gap (deleteElements ripple model)', () => {
    act(() => { S().setPlayhead(16); S().trimToPlayhead('l', true); });
    const e = el('el-2'); // was 8.5..17
    expect(e.startTime).toBe(8.5);               // clip keeps its start
    expect(e.duration).toBeCloseTo(1.0, 5);      // head [8.5..16] removed
    expect(e.sourceStart).toBeCloseTo(10.5, 5);  // source advanced past the head
    expect(el('el-3').startTime).toBeCloseTo(9.5, 5);  // downstream closed
    expect(el('el-4').startTime).toBeCloseTo(16.5, 5);
  });

  it('P2 fix: trimToPlayhead ripple-r removes the tail; downstream abuts the new end', () => {
    act(() => { S().setPlayhead(10); S().trimToPlayhead('r', true); });
    expect(el('el-1').duration).toBe(8.5); // ph 10 sits past el-1 — untouched
    const e2 = el('el-2'); // was 8.5..17 — the tail [10..17] is REMOVED (7 s)
    expect(e2.duration).toBe(1.5);                 // 10 - 8.5
    expect(el('el-3').startTime).toBeCloseTo(10, 5);   // 17 - 7 — abuts el-2's new end
    expect(el('el-3').startTime).toBeCloseTo(e2.startTime + e2.duration, 5);
    expect(el('el-4').startTime).toBeCloseTo(17, 5);   // 24 - 7
  });

  it('P2 fix: trimToPlayhead is a true no-op when the playhead is outside every clip', () => {
    act(() => { S().setPlayhead(30.5); S().trimToPlayhead('l', true); });
    expect(S().past.length).toBe(0);
    expect(mainEls()).toHaveLength(4);
  });

  it('spec 05 §12.3: selectElement takes the A/V pair as a group, both directions, additive toggle', () => {
    act(() => { S().selectElement('el-2', false); });
    expect(S().selection).toEqual(['el-2', 'el-7']);
    act(() => { S().selectElement('el-7', false); }); // from the other side
    expect(S().selection).toEqual(['el-7', 'el-2']);
    act(() => { S().setSelection(['el-1']); S().selectElement('el-2', true); });
    expect(S().selection).toEqual(['el-1', 'el-2', 'el-7']);
    act(() => { S().selectElement('el-2', true); }); // toggle the pair off together
    expect(S().selection).toEqual(['el-1']);
  });

  it('toggleTrackCmd on unknown ids is a true no-op (no history entry)', () => {
    const past = S().past.length;
    act(() => { S().toggleTrackCmd('sc-1', 'nope', 'muted'); });
    expect(S().past.length).toBe(past);
    act(() => { S().toggleTrackCmd('no-scene', 'tr-main', 'muted'); });
    expect(S().past.length).toBe(past);
  });

  it('setPlaying(true) preserves the shuttle rate; false resets it', () => {
    act(() => { S().setShuttle(4); S().setPlaying(false); });
    expect(S().playRate).toBe(1);
    act(() => { S().setShuttle(2); S().setPlaying(true); });
    expect(S().playRate).toBe(2);
  });
  it('R13 fix: setActiveScene re-derives lockAll from the target scene (no stale pressed-state)', () => {
    act(() => { S().toggleLockAll(); });
    expect(S().lockAll).toBe(true);
    act(() => { S().setActiveScene('sc-2'); });
    expect(S().lockAll).toBe(false); // sc-2 has nothing locked
    act(() => { S().setActiveScene('sc-1'); });
    expect(S().lockAll).toBe(true); // sc-1 was fully locked
  });

  it('R13 fix: undo/redo restore the SELECTION alongside the doc (no dangling ids)', () => {
    act(() => { S().duplicateElements(['el-2']); });
    expect(S().selection[0]).toMatch(/^el-2-d/);
    act(() => { S().undo(); });
    expect(S().selection).toEqual(['el-2']); // pre-duplicate selection restored — the dupe id is gone
    act(() => { S().redo(); });
    expect(S().selection[0]).toMatch(/^el-2-d/); // valid again after redo
  });

  it('R13 fix: id collisions are impossible — same-millisecond creates get unique ids', () => {
    act(() => { S().addMarker(1); S().addMarker(2); }); // same ms in practice
    const markers = S().scenes.find((sc) => sc.id === 'sc-1')!.markers;
    const ids = markers.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('R13 fix: press-release trim/move gestures record no history entry', () => {
    act(() => { S().trimElement('el-2', 'l', 8.5, 8.5); }); // identical values
    expect(S().past.length).toBe(0);
    act(() => { S().moveElement('el-3', 17.0); }); // unchanged start
    expect(S().past.length).toBe(0);
    act(() => { S().setEffectParam('el-1', 'fx-1', 'radius', 0); }); // param… fx-1 has no params yet — this CREATES one
    expect(S().past.length).toBe(1); // creating a param is a change (undefined → 0)
    act(() => { S().setEffectParam('el-1', 'fx-1', 'radius', 0); }); // identical re-set
    expect(S().past.length).toBe(1); // no second entry
  });

  it('R13 fix: locked tracks are inert for store mutations (split/slip/duplicate/inspector writes)', () => {
    // el-7 sits on the LOCKED tr-audio-2
    act(() => { S().splitElement('el-7', 12); });
    expect(S().past.length).toBe(0);
    act(() => { S().slipNudge(['el-7'], 24); });
    expect(S().past.length).toBe(0);
    expect(el('el-7').sourceStart).toBe(3);
    act(() => { S().duplicateElements(['el-7']); });
    expect(S().past.length).toBe(0);
    act(() => { S().setElementField('el-7', { volume: 0.1 }); });
    expect(S().past.length).toBe(0);
    expect(el('el-7').volume).toBe(0.8); // unchanged
    act(() => { S().setTransition('el-7', { duration: 1 }); });
    expect(S().past.length).toBe(0);
    expect(el('el-7').transitionOut).toBeUndefined();
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

/* ---------- R14 fix batch ---------- */

describe('R14: loop ordering law (markIn/markOut can never invert)', () => {
  it('markIn past the out point drags out along — start <= end invariant holds', () => {
    act(() => { S().setPlayhead(29); S().markIn(); });
    expect(S().loop.start).toBe(29);
    expect(S().loop.end).toBeGreaterThanOrEqual(29); // was 28 — dragged up, not left behind
  });
  it('markOut before the in point drags in along', () => {
    act(() => { S().setPlayhead(1); S().markOut(); });
    expect(S().loop.end).toBe(1);
    expect(S().loop.start).toBeLessThanOrEqual(1); // was 2 — dragged down
  });
  /* R23-WF (D-F1, #107): s.loop now has THREE writers — markIn/markOut
     here, the full Ruler's bracket applyBracket, and the deliver range
     band's commitBand (TimelineCompact's head row). The honest
     triple-source risk is pinned AT STORE LEVEL: the ordering law
     (start <= end) must hold from EVERY writer, so the store's own two
     writers are swept across the whole playhead domain below (the two
     component writers' verbatim-formula clones are pinned in their own
     files: Ruler.test 'ordering law' + TimelineCompact.test's R23-WF
     band pins). */
  it('R23-WF: the ordering law holds from the store writers across the whole playhead domain (the triple-source sweep)', () => {
    for (const t of [0, 0.4, 2, 15.999, 28, 29.9, 30]) {
      act(() => { S().setPlayhead(t); S().markIn(); });
      expect(S().loop.start).toBeLessThanOrEqual(S().loop.end);
      act(() => { S().setPlayhead(t); S().markOut(); });
      expect(S().loop.start).toBeLessThanOrEqual(S().loop.end);
    }
    // the sweep ends at the degenerate full-tail window {30,30}; marking out
    // at 0 then pulls start down WITH it — the invariant survives every edge
    act(() => { S().setPlayhead(0); S().markOut(); });
    expect(S().loop).toEqual({ start: 0, end: 0 });
  });
});

describe('R14: split link law (linkedTo never duplicated to both halves)', () => {
  it('left half keeps the link, right half severs it', () => {
    act(() => { S().splitElement('el-2', 12.75); });
    const els = mainEls();
    const rightId = els.find((id) => id.startsWith('el-2-b'))!;
    expect(el('el-2').linkedTo).toBe('el-7'); // original keeps the pair (05 §12.3)
    expect(el(rightId).linkedTo).toBeUndefined(); // new half claims no pair
  });
});

describe('R14: duplicateElements(ids, at) — one composite history entry', () => {
  it('lands the copy AT the drop point and costs ONE undo', () => {
    const pastBefore = S().past.length;
    act(() => { S().duplicateElements(['el-2'], 5); });
    const dupe = mainEls().find((id) => id.startsWith('el-2-d'))!;
    expect(el(dupe).startTime).toBe(5); // at the drop point, not appended after
    expect(S().past.length).toBe(pastBefore + 1); // ONE entry (was: duplicate + move = two)
    act(() => { S().undo(); });
    expect(mainEls()).toHaveLength(4); // fully unwound by a single ⌘Z
    expect(mainEls().find((id) => id.startsWith('el-2-d'))).toBeUndefined();
  });
});

describe('R14: toggleMuteAll (⌘⇧M set-all batch)', () => {
  it('mutes every track in the active scene in one undoable batch', () => {
    const pastBefore = S().past.length;
    act(() => { S().toggleMuteAll(); });
    const sc = S().scenes.find((x) => x.id === S().activeSceneId)!;
    expect(sc.tracks.every((t) => t.muted)).toBe(true);
    expect(S().past.length).toBe(pastBefore + 1);
    act(() => { S().undo(); });
    const scAfter = S().scenes.find((x) => x.id === S().activeSceneId)!;
    expect(scAfter.tracks.every((t) => t.muted)).toBe(false);
  });
});

describe('R14: clearLoopIn / clearLoopOut (⌘⇧I / ⌘⇧O halves)', () => {
  it('clearLoopIn reverts start to 0; clearLoopOut reverts end to the scene tail', () => {
    act(() => { S().clearLoopIn(); });
    expect(S().loop.start).toBe(0);
    expect(S().loop.end).toBe(28); // untouched half
    act(() => { S().clearLoopOut(); });
    expect(S().loop.end).toBe(30); // sample project tail
  });
});

describe('R14: loadSampleProject rebuilds the mixer sidecar', () => {
  it('mixer keys track the new audio ids — no stale pre-sample strips', () => {
    act(() => { S().loadSampleProject(); });
    expect(Object.keys(S().mixer.tracks)).toContain('t-au-sample');
    const oldAudioIds = ['tr-audio-1', 'tr-audio-2'];
    for (const id of oldAudioIds) expect(Object.keys(S().mixer.tracks)).not.toContain(id);
  });
});

describe('R14: link toggle gates pair propagation (was inert)', () => {
  it('link OFF — selecting one half of the A/V pair selects it alone', () => {
    act(() => { S().toggleLink(); }); // default ON
    act(() => { S().selectElement('el-2', false); });
    expect(S().selection).toEqual(['el-2']); // no el-7 propagation
    act(() => { S().toggleLink(); }); // back ON
    act(() => { S().selectElement('el-2', false); });
    expect(S().selection).toEqual(['el-2', 'el-7']); // 05 §12.3 pair again
  });
});

describe('R14: MIN_DUR is one law across the trim family (R15 T4: 1 frame, spec-06 §5.2)', () => {
  it('trimToPlayhead refuses to leave a sub-1-frame remainder (no history entry)', () => {
    const pastBefore = S().past.length;
    // l-edge 0.02 s before the end (snaps to the exact end−MIN boundary) — refused
    act(() => { S().setPlayhead(16.97); S().trimToPlayhead('l', false); }); // el-2: [8.5, 17)
    expect(el('el-2').duration).toBe(8.5); // untouched
    expect(S().past.length).toBe(pastBefore);
    // r-edge 0.03 s past the start (snaps to start+MIN exactly) — refused
    act(() => { S().setPlayhead(8.53); S().trimToPlayhead('r', false); });
    expect(el('el-2').duration).toBe(8.5);
    expect(S().past.length).toBe(pastBefore);
  });
  it('splitElement refuses sub-1-frame halves', () => {
    const pastBefore = S().past.length;
    act(() => { S().splitElement('el-2', 8.53); }); // 0.0417 s left half — exactly MIN → refused
    expect(mainEls()).toHaveLength(4);
    expect(S().past.length).toBe(pastBefore);
  });
});

describe('R14: trackHeightPref (spec 18 §4.9 Height rows)', () => {
  it('boots null (auto) and setTrackHeightPref writes view state WITHOUT history', () => {
    expect(S().trackHeightPref).toBeNull(); // null = kind-based trackHeights()
    act(() => { S().setTrackHeightPref('compact'); });
    expect(S().trackHeightPref).toBe('compact');
    expect(S().past).toHaveLength(0); // view pref, not a doc mutation
    act(() => { S().setTrackHeightPref('tall'); });
    expect(S().trackHeightPref).toBe('tall');
    act(() => { S().setTrackHeightPref(null); });
    expect(S().trackHeightPref).toBeNull(); // back to auto
  });
});

describe('R14: addTrack position routes (spec 18 §4.9 above/below)', () => {
  it('explicit above/below inserts at the ref track index, overriding the §12.1 default law', () => {
    // sc-1 boot order: [T1, V1, A1, A2, CC]
    act(() => { S().addTrack('audio', 'above', 'tr-audio-1'); });
    expect(S().scenes.find((sc) => sc.id === 'sc-1')!.tracks.map((t) => t.badge))
      .toEqual(['T1', 'V1', 'A3', 'A1', 'A2', 'CC']); // A3 above A1 — NOT appended at the end
    act(() => { S().addTrack('audio', 'below', 'tr-audio-1'); });
    expect(S().scenes.find((sc) => sc.id === 'sc-1')!.tracks.map((t) => t.badge))
      .toEqual(['T1', 'V1', 'A3', 'A1', 'A4', 'A2', 'CC']); // A4 below A1, above A2
    expect(S().past).toHaveLength(2); // each insert is its own undoable batch
  });

  it('a position without a resolvable ref track falls back to the default kind route', () => {
    act(() => { S().addTrack('audio', 'above', 'no-such-track'); });
    const tracks = S().scenes.find((sc) => sc.id === 'sc-1')!.tracks;
    expect(tracks.at(-1)!.badge).toBe('A3'); // appended at the bottom (§12.1 law)
  });

  it('no position keeps the spec 05 §12.1 kind-ordering law (existing callers)', () => {
    act(() => { S().addTrack('overlay'); });
    expect(S().scenes.find((sc) => sc.id === 'sc-1')!.tracks.map((t) => t.kind))
      .toEqual(['overlay', 'overlay', 'main', 'audio', 'audio', 'caption']);
  });
});

/* ---------- R15 T3: cross-track drag & placement (batch move engine) ---------- */

describe('R15 T3: moveElements — batch laws (one entry, overlap, zero-anchor, locks)', () => {
  const scene1 = () => S().scenes.find((sc) => sc.id === 'sc-1')!;

  it('one batch = ONE history entry; doc mutation only; undo restores positions', () => {
    const pastBefore = S().past.length;
    // el-2 → overlay @ 15 (free) + el-5 → overlay @ 24 (free): two moves, one entry
    act(() => {
      S().moveElements({
        moves: [
          { id: 'el-2', trackId: 'tr-overlay-1', startTime: 15 },
          { id: 'el-5', trackId: 'tr-overlay-1', startTime: 24 },
        ],
      });
    });
    expect(el('el-2').startTime).toBe(15);
    expect(track('sc-1', 'tr-overlay-1').elements.map((e) => e.id)).toContain('el-2');
    expect(el('el-5').startTime).toBe(24);
    expect(S().past.length).toBe(pastBefore + 1); // ONE entry for the whole batch
    act(() => { S().undo(); });
    expect(el('el-2').startTime).toBe(8.5); // both restored by a single ⌘Z
    expect(el('el-2').trackId).toBe('tr-main');
    expect(track('sc-1', 'tr-overlay-1').elements.map((e) => e.id)).toEqual(['el-5']);
  });

  it('virtual-removal shuffle: a group may re-place onto its OWN vacated spans (intra-batch ok, stationary overlap rejected per-move)', () => {
    // el-1 [0,8.5) → 8.5 vacates its span; el-2 [8.5,17) → 0 takes el-1's old
    // span — both movers are virtually removed first, so the swap is legal
    act(() => {
      S().moveElements({
        moves: [
          { id: 'el-1', trackId: 'tr-main', startTime: 8.5 },
          { id: 'el-2', trackId: 'tr-main', startTime: 0 },
        ],
      });
    });
    expect(el('el-1').startTime).toBe(8.5);
    expect(el('el-2').startTime).toBe(0);
    expect(S().past).toHaveLength(1);
    // zero-anchor does NOT fire: el-2's request (0) is ≤ earliest stationary
    // main start (17) → it pins at 0 anyway; el-1's request 8.5 > 17? No — 8.5
    // ≤ 17 → magnet → the EARLIEST main move pins at 0 and offsets survive:
    // the batch landed [el-2@0, el-1@8.5] — exactly the requested shuffle.
    // Now a stationary overlap: el-1 onto el-3's span → that move alone drops
    act(() => {
      S().moveElements({
        moves: [
          { id: 'el-1', trackId: 'tr-main', startTime: 20 }, // overlaps el-3 [17,24)
          { id: 'el-5', trackId: 'tr-overlay-1', startTime: 20 }, // free
        ],
      });
    });
    expect(el('el-1').startTime).toBe(8.5); // rejected — stayed
    expect(el('el-5').startTime).toBe(20); // the valid move proceeded
    expect(S().past).toHaveLength(2); // the partial batch still committed one entry
  });

  it('intra-batch overlap → WHOLE batch rejected (no-op, no history)', () => {
    const pastBefore = S().past.length;
    act(() => {
      S().moveElements({
        moves: [
          { id: 'el-1', trackId: 'tr-overlay-1', startTime: 20 },
          { id: 'el-2', trackId: 'tr-overlay-1', startTime: 22 }, // [22,30.5) overlaps [20,28.5)
        ],
      });
    });
    expect(el('el-1').trackId).toBe('tr-main'); // nothing moved
    expect(el('el-5').startTime).toBe(8.75);
    expect(S().past.length).toBe(pastBefore);
  });

  it('anchor clamp: the whole batch shifts up so the min start ≥ 0 (offsets preserved)', () => {
    // el-6 [0,30) + el-7 [8.5,17): anchor el-6 to −10 → anchorStart snaps to
    // −10; the clamp shifts +10 → el-6 @ 0, el-7 @ 8.5−10+10... offsets: el-7
    // offset = +8.5 → lands at 0 + 8.5 = 8.5 — but el-7's source is LOCKED
    // (dropped), so the group is el-6 alone: request −10 → shift → 0
    act(() => { S().toggleTrackCmd('sc-1', 'tr-audio-2', 'locked'); }); // unlock
    act(() => {
      S().moveElements({
        moves: [
          { id: 'el-6', trackId: 'tr-audio-1', startTime: -10 },
          { id: 'el-7', trackId: 'tr-audio-1', startTime: 8.5 - 10 }, // offset kept
        ],
      });
    });
    expect(el('el-6').startTime).toBe(0); // shifted up by 10
    expect(el('el-7').startTime).toBe(8.5); // offset preserved (−10 + shift 10)
  });

  it('locked target: that move is rejected, others proceed; ALL rejected → no-op', () => {
    // tr-audio-2 ships locked — targeting it is inert
    act(() => {
      S().moveElements({
        moves: [
          { id: 'el-6', trackId: 'tr-audio-2', startTime: 40 }, // locked target
          { id: 'el-5', trackId: 'tr-overlay-1', startTime: 20 }, // proceeds
        ],
      });
    });
    expect(track('sc-1', 'tr-audio-2').elements.map((e) => e.id)).toEqual(['el-7']); // untouched
    expect(el('el-5').startTime).toBe(20);
    // all moves rejected → whole call is a no-op (no history)
    const pastBefore = S().past.length;
    act(() => { S().moveElements({ moves: [{ id: 'el-6', trackId: 'tr-audio-2', startTime: 40 }] }); });
    expect(el('el-6').trackId).toBe('tr-audio-1');
    expect(S().past.length).toBe(pastBefore);
  });

  it('locked SOURCE is likewise inert (per-move drop)', () => {
    // el-7 lives on the locked tr-audio-2 — moving it off is rejected
    act(() => { S().moveElements({ moves: [{ id: 'el-7', trackId: 'tr-audio-1', startTime: 40 }] }); });
    expect(track('sc-1', 'tr-audio-2').elements.map((e) => e.id)).toEqual(['el-7']); // never left
    expect(S().past).toHaveLength(0);
  });

  it('no-op batch (same track + same time) records NO history entry', () => {
    const pastBefore = S().past.length;
    act(() => {
      S().moveElements({
        moves: [
          { id: 'el-1', trackId: 'tr-main', startTime: 0 },
          { id: 'el-3', trackId: 'tr-main', startTime: 17 },
        ],
      });
    });
    expect(S().past.length).toBe(pastBefore);
  });

  it('createTracks: pre-minted identity lands the track at the insert position (audio clamped below main)', () => {
    const [minted] = mintTrackIds(1);
    act(() => {
      S().moveElements({
        moves: [{ id: 'el-6', trackId: minted, startTime: 10 }],
        createTracks: [{ id: minted, kind: 'audio', insertAboveTrackId: 'tr-overlay-1' }], // above main — clamped
      });
    });
    const tracks = scene1().tracks;
    const idx = tracks.findIndex((t) => t.id === minted);
    expect(idx).toBe(2); // inserted just below main (audio never above main)
    expect(tracks[idx]!.kind).toBe('audio');
    expect(tracks[idx]!.elements.map((e) => e.id)).toEqual(['el-6']); // the move targeted the pre-minted id
    expect(el('el-6').startTime).toBe(10);
    expect(S().past).toHaveLength(1);
    // undo removes the track AND restores el-6
    act(() => { S().undo(); });
    expect(scene1().tracks.some((t) => t.id === minted)).toBe(false);
    expect(el('el-6').trackId).toBe('tr-audio-1');
  });
});

describe('R15 T3: resolveGroupMove — pure resolution (outward mapping + mixed reject)', () => {
  const scene = () => S().scenes.find((sc) => sc.id === 'sc-1')!;

  it('existing-track path: anchor to the target, same-lane members follow, outward members walk compatible lanes', () => {
    // unlock A2 so the linked pair el-2 (main) + el-7 (audio) is fully movable
    act(() => { S().toggleTrackCmd('sc-1', 'tr-audio-2', 'locked'); });
    const res = resolveGroupMove(
      scene(), 'el-2',
      { trackId: 'tr-main' },
      30,
      ['el-2', 'el-7'],
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.moves).toEqual([
      { id: 'el-2', trackId: 'tr-main', startTime: 30 },
      { id: 'el-7', trackId: 'tr-audio-1', startTime: 30 }, // outward: audio → A1 (skipping main — incompatible)
    ]);
    // video → overlay is compatible; the audio member walks down to A1
    const resUp = resolveGroupMove(scene(), 'el-2', { trackId: 'tr-overlay-1' }, 30, ['el-2', 'el-7']);
    expect(resUp.ok && resUp.moves.find((m) => m.id === 'el-7')!.trackId).toBe('tr-audio-1');
  });

  it('new-track path: mixed audio+non-audio group → REJECTED (spec-05 §8.3 note 3)', () => {
    act(() => { S().toggleTrackCmd('sc-1', 'tr-audio-2', 'locked'); });
    const res = resolveGroupMove(
      scene(), 'el-2',
      { newTrackIds: ['n-1', 'n-2'], insertIndex: 0 },
      10,
      ['el-2', 'el-7'], // video + audio — mixed
    );
    expect(res).toEqual({ ok: false, reason: 'mixed-group' });
    // homogeneous groups resolve: one new track per member at the hover position
    const resOne = resolveGroupMove(scene(), 'el-2', { newTrackIds: ['n-1'], insertIndex: 0 }, 10, ['el-2']);
    expect(resOne.ok && resOne.createTracks).toEqual([{ id: 'n-1', kind: 'overlay', insertIndex: 0 }]);
  });

  it('new-track path clamps by kind section: audio never above main, visual never below main', () => {
    const resAudio = resolveGroupMove(scene(), 'el-6', { newTrackIds: ['n-1'], insertIndex: 0 }, 5);
    expect(resAudio.ok && resAudio.createTracks[0]!.insertIndex).toBe(2); // main idx 1 + 1 (0-based)
    const resVisual = resolveGroupMove(scene(), 'el-1', { newTrackIds: ['n-1'], insertIndex: 4 }, 5); // below all
    expect(resVisual.ok && resVisual.createTracks[0]!.insertIndex).toBe(1); // clamped to main's index (above main)
  });

  it('overlap: the resolution fails when the anchor span hits a stationary clip (half-open)', () => {
    const res = resolveGroupMove(scene(), 'el-2', { trackId: 'tr-overlay-1' }, 8.5); // [8.5,17) vs el-5 [8.75,12)
    expect(res).toEqual({ ok: false, reason: 'overlap' });
    const resFree = resolveGroupMove(scene(), 'el-2', { trackId: 'tr-overlay-1' }, 15);
    expect(resFree.ok).toBe(true);
  });

  it('incompatible anchor target + locked lanes are rejected with the matching reason', () => {
    // audio cannot go on main/overlay (spec-06 §5.9)
    expect(resolveGroupMove(scene(), 'el-6', { trackId: 'tr-main' }, 40)).toEqual({ ok: false, reason: 'incompatible' });
    // tr-audio-2 ships locked
    expect(resolveGroupMove(scene(), 'el-6', { trackId: 'tr-audio-2' }, 40)).toEqual({ ok: false, reason: 'locked' });
    // locked members are dropped from the group (locked = inert, others move)
    const res = resolveGroupMove(scene(), 'el-2', { trackId: 'tr-main' }, 30, ['el-2', 'el-7']);
    expect(res.ok && res.moves.map((m) => m.id)).toEqual(['el-2']);
  });
});

describe('R15 T3: ripple delete — vacated−joined interval diff (non-contiguous multi-delete)', () => {
  it(`deleting el-1+el-3 shifts el-4 by el-1's span + el-3's span (NOT to 0)`, () => {
    act(() => { S().deleteElements(['el-1', 'el-3'], true); });
    expect(mainEls()).toEqual(['el-2', 'el-4']);
    expect(el('el-2').startTime).toBe(0); // 8.5 − 8.5 (el-1's span)
    expect(el('el-4').startTime).toBeCloseTo(8.5, 5); // 24 − 8.5 − 7 (both freed spans)
  });

  it('single-delete ripple is unchanged (contiguous case)', () => {
    act(() => { S().deleteElements(['el-2'], true); });
    expect(el('el-3').startTime).toBeCloseTo(8.5, 5);
    expect(el('el-4').startTime).toBeCloseTo(15.5, 5);
  });

  it('plain delete never shifts (gap left behind)', () => {
    act(() => { S().deleteElements(['el-1', 'el-3'], false); });
    expect(el('el-2').startTime).toBe(8.5);
    expect(el('el-4').startTime).toBe(24);
  });

  it('ripple shifts are per-track (audio lanes do not follow main-track deletions)', () => {
    act(() => { S().deleteElements(['el-1'], true); });
    expect(el('el-6').startTime).toBe(0); // A1 bed unmoved
    expect(el('el-7').startTime).toBe(8.5); // locked A2 unmoved
  });
});

describe('R15 T3: duplicateAndMove — Alt+drag duplicate to the resolved target', () => {
  it('copies land at the planned (track, time) in ONE history entry; selection = copies', () => {
    const pastBefore = S().past.length;
    act(() => {
      S().duplicateAndMove({
        ids: ['el-2'],
        moves: [{ id: 'el-2', trackId: 'tr-overlay-1', startTime: 15 }],
      });
    });
    const copyId = S().selection[0]!;
    expect(copyId).toMatch(/^el-2-d/);
    expect(el(copyId).trackId).toBe('tr-overlay-1');
    expect(el(copyId).startTime).toBe(15);
    expect(el('el-2').startTime).toBe(8.5); // original never moves
    expect(S().past.length).toBe(pastBefore + 1);
    act(() => { S().undo(); });
    expect(track('sc-1', 'tr-overlay-1').elements.map((e) => e.id)).toEqual(['el-5']); // fully unwound
  });

  it('an overlapping duplicate target is a no-op (copies never persist)', () => {
    const pastBefore = S().past.length;
    act(() => {
      S().duplicateAndMove({
        ids: ['el-2'],
        moves: [{ id: 'el-2', trackId: 'tr-main', startTime: 10 }], // overlaps el-3 + the stationary original
      });
    });
    expect(S().past.length).toBe(pastBefore);
    expect(mainEls()).toEqual(['el-1', 'el-2', 'el-3', 'el-4']); // no copies
  });

  /* ---------- R15-F1 FIX 1 regression tests (the review's P1 repro) ---------- */

  it('R15-F1: PARTIAL rejection is ATOMIC — the repro batch (el-1+el-5 Alt+drag +4s after moving el-1 to the overlay) rejects whole: no stranded clone, no history, honest toast', () => {
    // repro setup: move el-1 onto tr-overlay-1 (same lane as el-5) first
    act(() => { S().moveElements({ moves: [{ id: 'el-1', trackId: 'tr-overlay-1', startTime: 0 }] }); });
    const pastBefore = S().past.length;
    // the preview-equivalent resolution (originals as movers): el-1 → 4,
    // el-5 → 12.75 — valid for a MOVE (the group vacates), but the COPIES
    // must clear the ORIGINALS too: el-1-d [4,12.5) overlaps stationary
    // el-1 [0,8.5). Old behavior: el-1's move dropped (clone STRANDED on top
    // of el-1, overlap invariant broken, 1 history entry) while el-5's copy
    // landed at 12.75. New: all-or-nothing.
    act(() => {
      S().duplicateAndMove({
        ids: ['el-1', 'el-5'],
        moves: [
          { id: 'el-1', trackId: 'tr-overlay-1', startTime: 4 },
          { id: 'el-5', trackId: 'tr-overlay-1', startTime: 12.75 },
        ],
      });
    });
    const overlay = track('sc-1', 'tr-overlay-1').elements.map((e) => e.id).sort();
    expect(overlay).toEqual(['el-1', 'el-5']); // NO copies — nothing stranded, nothing landed
    expect(S().past.length).toBe(pastBefore); // no history entry
    expect(S().toasts.at(-1)!.kind).toBe('error');
    expect(S().toasts.at(-1)!.title).toBe('Drop rejected');
    expect(S().toasts.at(-1)!.detail).toBe('clips would overlap (spec-05 §8.3)'); // dragRejectionToast reuse
  });

  it('R15-F1: single-clip variant — a copy that would overlap its own original (same lane, delta < own duration) rejects with an HONEST toast (was a SILENT no-op: preview said ok, release did nothing)', () => {
    const pastBefore = S().past.length;
    // el-5 [8.75,12) → +1.125 s on its OWN lane: the preview (originals as
    // movers) resolves it fine — the copy [10,13.25) must clear the ORIGINAL
    act(() => {
      S().duplicateAndMove({ ids: ['el-5'], moves: [{ id: 'el-5', trackId: 'tr-overlay-1', startTime: 10 }] });
    });
    expect(track('sc-1', 'tr-overlay-1').elements.map((e) => e.id)).toEqual(['el-5']); // no copy
    expect(S().past.length).toBe(pastBefore);
    expect(S().toasts.at(-1)!.title).toBe('Drop rejected'); // honest, not silent
  });

  it('R15-F1: a happy-path duplicate still lands ALL copies + selection in ONE entry (the atomic path must not over-reject)', () => {
    const pastBefore = S().past.length;
    act(() => {
      S().duplicateAndMove({
        ids: ['el-5'],
        moves: [{ id: 'el-5', trackId: 'tr-overlay-1', startTime: 20 }], // [20,23.25) clear of el-5 [8.75,12)
      });
    });
    const copies = track('sc-1', 'tr-overlay-1').elements.filter((e) => e.id.startsWith('el-5-d'));
    expect(copies).toHaveLength(1);
    expect(copies[0]!.startTime).toBe(20);
    expect(S().selection).toEqual([copies[0]!.id]);
    expect(S().past.length).toBe(pastBefore + 1);
    expect(S().toasts).toHaveLength(0); // committed — no rejection toast
  });
});

/* ---------- R15 T4: trim laws + tool-gesture store actions ---------- */

describe('R15-F1 FIX 2: zero-anchor — ONE law (the pure resolveGroupMove group-wide shift)', () => {
  const scene = () => S().scenes.find((sc) => sc.id === 'sc-1')!;

  it('the raw batch API matches the pure resolution: moveElements fed resolveGroupMove\'s moves lands EXACTLY there (the old main-subset shift re-pinned el-2 at 0, splitting the A/V group)', () => {
    // review repro setup: main virtually empty (delete the other main clips)
    act(() => { S().deleteElements(['el-1', 'el-3', 'el-4'], false); });
    // the pure resolution of the gesture "drag el-2 to main@5 with el-6 in
    // the group" — the anchor clamp keeps el-6 ≥ 0 at its −8.5 offset, so
    // el-2 lands at 8.5 (the magnet then fires but the anchor clamp wins:
    // anchorStart = minAnchorStart = 8.5)
    const res = resolveGroupMove(scene(), 'el-2', { trackId: 'tr-main' }, 5, ['el-2', 'el-6']);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.moves.find((m) => m.id === 'el-2')!.startTime).toBe(8.5);
    expect(res.moves.find((m) => m.id === 'el-6')!.startTime).toBe(0);
    // commit through the PUBLIC batch API — same answer, group un-split
    act(() => { S().moveElements({ moves: res.moves }); });
    expect(el('el-2').startTime).toBe(8.5); // NOT 0 — the pure law wins
    expect(el('el-6').startTime).toBe(0);
  });

  it('the magnet shifts the WHOLE batch — the review repro batch (el-2→main@5, el-6→audio@5, main virtually empty) clamps the GROUP left edge to 0 (was a main-subset-only 5s A/V split)', () => {
    act(() => { S().deleteElements(['el-1', 'el-3', 'el-4'], false); });
    const pastBefore = S().past.length;
    act(() => {
      S().moveElements({
        moves: [
          { id: 'el-2', trackId: 'tr-main', startTime: 5 },
          { id: 'el-6', trackId: 'tr-audio-1', startTime: 5 },
        ],
      });
    });
    // group-wide clamp: BOTH starts shift up by 5 — offsets preserved
    expect(el('el-2').startTime).toBe(0);
    expect(el('el-6').startTime).toBe(0); // was stranded at 5 by the old main-subset shift
    expect(S().past).toHaveLength(pastBefore + 1); // one entry for the whole batch
  });
});

describe('R15-F1 P3: rollDeltaBounds — B\'s source TAIL at rate ≠ 1', () => {
  it('a rate-0.5 B keeps its window inside the source tail (unbounded rolls previously ran past the media end)', () => {
    // junction el-3 [17,24) | el-4 [24,30); retime el-4 to 0.5× and pin its
    // window near the m-05 tail (12.8 s): [9, 9 + 6·0.5) = [9, 12)
    act(() => { S().setElementField('el-4', { speed: 0.5, sourceStart: 9 }); });
    // roll +3: without the B-tail bound, d clamps only at B's 1-frame min →
    // el-4's window would run to 12 + 1.5 = 13.5 > 12.8 (past the media
    // tail). With it: d ≤ (12.8 − 9 − 6·0.5)/(1 − 0.5) = 1.6
    act(() => { S().rollTrim('el-3', 'el-4', 3); });
    expect(el('el-3').duration).toBeCloseTo(7 + 1.6, 5); // A grew by the CLAMPED delta
    expect(el('el-4').startTime).toBeCloseTo(24 + 1.6, 5);
    expect(el('el-4').duration).toBeCloseTo(6 - 1.6, 5);
    expect(el('el-4').sourceStart).toBeCloseTo(9 + 1.6, 5);
    // the window tail lands exactly at the media tail, never past it
    expect(el('el-4').sourceStart! + el('el-4').duration * 0.5).toBeCloseTo(12.8, 5);
  });
});

describe('R15 T4: trimElements — neighbor, source, 1-frame, batch intersection', () => {
  it('right-edge extension cannot cross the NEXT clip start (canonical §9 neighbor law)', () => {
    const pastBefore = S().past.length;
    act(() => { S().trimElements([{ id: 'el-2', edge: 'r', delta: 2 }]); }); // el-3 starts at 17 = el-2's end
    expect(el('el-2').duration).toBe(8.5); // clamped to delta 0 — NOOP
    expect(S().past.length).toBe(pastBefore); // no history for a no-op batch
    // trimming IN still works on the same edge
    act(() => { S().trimElements([{ id: 'el-2', edge: 'r', delta: -2 }]); });
    expect(el('el-2').duration).toBe(6.5);
  });

  it('left-edge extension cannot cross the PREVIOUS clip end', () => {
    const pastBefore = S().past.length;
    act(() => { S().trimElements([{ id: 'el-2', edge: 'l', delta: -2 }]); }); // el-1 ends at 8.5 = el-2's start
    expect(el('el-2').startTime).toBe(8.5); // never crossed el-1
    expect(S().past.length).toBe(pastBefore);
  });

  it('source-extent bound: the window cannot run past the media tail (el-4/m-05 12.8 s, el-6/m-06 120 s)', () => {
    act(() => { S().trimElements([{ id: 'el-4', edge: 'r', delta: 20 }]); });
    expect(el('el-4').duration).toBeCloseTo(12.8, 5); // extent beats the request AND frame alignment
    act(() => { S().trimElements([{ id: 'el-6', edge: 'r', delta: 200 }]); });
    expect(el('el-6').duration).toBe(120); // m-06's full tail
  });

  it('text clips (no media) fall back to ∞ — unbounded trim', () => {
    act(() => { S().trimElements([{ id: 'el-5', edge: 'r', delta: 5 }]); });
    expect(el('el-5').duration).toBe(8.25); // 3.25 + 5, no source bound
  });

  it('batch trim: the whole selection moves by ONE delta — bounds are the INTERSECTION (tightest wins)', () => {
    const pastBefore = S().past.length;
    // el-1 + el-3 + el-5 right edges, −2 s each: every member has room → all land
    act(() => {
      S().trimElements([
        { id: 'el-1', edge: 'r', delta: -2 },
        { id: 'el-3', edge: 'r', delta: -2 },
        { id: 'el-5', edge: 'r', delta: -2 },
      ]);
    });
    expect(el('el-1').duration).toBe(6.5);
    expect(el('el-3').duration).toBe(5);
    expect(el('el-5').duration).toBe(1.25);
    expect(S().past.length).toBe(pastBefore + 1); // ONE entry for the whole batch
    act(() => { S().undo(); });
    expect(el('el-1').duration).toBe(8.5); // a single ⌘Z restores every member
    expect(el('el-3').duration).toBe(7);
    // the intersection is TIGHTEST: el-1 has room to extend but el-2's right
    // neighbor bound (nextStart 17 = end) zeroes the WHOLE batch
    const past2 = S().past.length;
    act(() => {
      S().trimElements([
        { id: 'el-1', edge: 'r', delta: 1 }, // free (would extend into the el-2 gap only if el-2 also moved)
        { id: 'el-2', edge: 'r', delta: 1 }, // blocked: el-3 starts at el-2's end
      ]);
    });
    expect(el('el-1').duration).toBe(8.5); // the tightest bound clamps BOTH members
    expect(el('el-2').duration).toBe(8.5);
    expect(S().past.length).toBe(past2); // clamped to a no-op — no history
  });

  it('trimElement delegates to the batch engine (same bounds, one entry)', () => {
    act(() => { S().trimElement('el-2', 'l', 10.5, 6.5); });
    expect(el('el-2').startTime).toBe(10.5);
    expect(el('el-2').duration).toBe(6.5);
    expect(S().past).toHaveLength(1);
  });
});

describe('R15 T4: rollTrim (spec-06 §5.5 — the junction slides, total preserved)', () => {
  it('A grows, B shrinks, sourceStart follows, ONE entry', () => {
    const pastBefore = S().past.length;
    act(() => { S().rollTrim('el-1', 'el-2', 1); });
    expect(el('el-1').duration).toBe(9.5);
    expect(el('el-2').startTime).toBe(9.5);
    expect(el('el-2').duration).toBe(7.5);
    expect(el('el-2').sourceStart).toBeCloseTo(4.0, 5);
    expect(el('el-1').startTime + el('el-1').duration + el('el-2').duration).toBe(17); // total preserved
    expect(S().past.length).toBe(pastBefore + 1);
  });

  it("bounded: B keeps its 1-frame minimum; rolling back is bounded by B's regained source head", () => {
    act(() => { S().rollTrim('el-2', 'el-3', 100); });
    expect(el('el-3').duration).toBeCloseTo(1 / 24, 6); // B pinned at 1 frame
    expect(el('el-2').duration).toBeCloseTo(8.5 + 7 - 1 / 24, 5); // grew by B's (dur − MIN)
    expect(el('el-3').sourceStart).toBeCloseTo(7 - 1 / 24, 5); // B gave up its head
    // rolling back by MORE than B's head clamps exactly to it — both clips
    // land restored at the original cut (B's window can never start < 0)
    act(() => { S().rollTrim('el-2', 'el-3', -10); });
    expect(el('el-2').duration).toBeCloseTo(8.5, 5);
    expect(el('el-3').startTime).toBeCloseTo(17, 5);
    expect(el('el-3').duration).toBeCloseTo(7, 5);
    expect(el('el-3').sourceStart).toBeCloseTo(0, 5);
    expect(S().past).toHaveLength(2); // one entry per gesture
  });

  it('non-adjacent pairs have no junction — no-op', () => {
    const pastBefore = S().past.length;
    act(() => { S().rollTrim('el-1', 'el-3', 1); }); // el-1 ends 8.5 ≠ el-3 start 17
    expect(el('el-1').duration).toBe(8.5);
    expect(S().past.length).toBe(pastBefore);
  });
});

describe('R15 T4: rippleTrim (later clips stay glued to the new end)', () => {
  it('right edge IN: downstream shifts left by the trimmed amount; right edge OUT: shifts right', () => {
    act(() => { S().rippleTrim('el-2', 'r', -2); });
    expect(el('el-2').duration).toBe(6.5);
    expect(el('el-3').startTime).toBe(15); // glued to the new end
    expect(el('el-4').startTime).toBe(22);
    act(() => { S().rippleTrim('el-2', 'r', 2); });
    expect(el('el-2').duration).toBe(8.5); // restored
    expect(el('el-3').startTime).toBe(17);
    expect(el('el-4').startTime).toBe(24);
    expect(S().past).toHaveLength(2); // one entry per gesture
  });

  it('right edge OUT: downstream shifts right with the extension (no overlap, junction stays glued)', () => {
    act(() => { S().rippleTrim('el-2', 'r', 2); });
    expect(el('el-2').duration).toBe(10.5);
    expect(el('el-3').startTime).toBe(19); // moved WITH the end — never overlapped
    expect(el('el-4').startTime).toBe(26);
  });

  it('left-edge extension is bounded by the PREVIOUS clip (it never shifts in a ripple)', () => {
    const pastBefore = S().past.length;
    act(() => { S().rippleTrim('el-2', 'l', -2); }); // el-1 ends at 8.5 = el-2's start
    expect(el('el-2').startTime).toBe(8.5); // clamped — the previous clip is immovable
    expect(S().past.length).toBe(pastBefore); // no-op, no history
  });

  it('the right edge is NOT bounded by the next clip (it shifts) but IS bounded by the source tail', () => {
    // el-2 extends right THROUGH el-3's old start — downstream moves with it
    act(() => { S().rippleTrim('el-2', 'r', 2); });
    expect(el('el-2').duration).toBe(10.5); // NOT clamped by el-3's start (17)
    expect(el('el-3').startTime).toBe(19);
    // el-4 is the LAST clip (no downstream): the source tail is the only bound
    act(() => { S().rippleTrim('el-4', 'r', 100); });
    expect(el('el-4').duration).toBeCloseTo(12.8, 5); // m-05's tail caps it
  });
});

describe('R15 T4: slipDrag (gesture seam) vs slipNudge (keyboard) bounds', () => {
  it('slipDrag CLAMPS to [0, extent − duration·rate] — the preview lands where it pointed', () => {
    act(() => { S().slipDrag(['el-2'], 24); }); // +1 s (same convention as slipNudge)
    expect(el('el-2').sourceStart).toBeCloseTo(4.0, 5);
    act(() => { S().slipDrag(['el-2'], 100 * 24); }); // way past m-02's tail
    expect(el('el-2').sourceStart).toBeCloseTo(95.2 - 8.5, 5); // 86.7 — the window's last legal home
    act(() => { S().slipDrag(['el-2'], -400 * 24); }); // way before the head
    expect(el('el-2').sourceStart).toBe(0); // clamped, not refused
  });

  it('slipNudge REFUSES out-of-bounds nudges (keyboard law, unchanged shape) — upper bound is new', () => {
    const pastBefore = S().past.length;
    act(() => { S().slipNudge(['el-2'], 90 * 24); }); // 3 + 90 = 93 > 86.7
    expect(el('el-2').sourceStart).toBe(3); // refused
    expect(S().past.length).toBe(pastBefore);
    act(() => { S().slipNudge(['el-2'], -4 * 24); }); // 3 − 4 < 0
    expect(el('el-2').sourceStart).toBe(3); // refused
    // in-bounds nudges still apply
    act(() => { S().slipNudge(['el-2'], 24); });
    expect(el('el-2').sourceStart).toBeCloseTo(4, 5);
  });
});

describe('R15 T4: slideMove (spec-06 §5.7 — clip moves, neighbors make room)', () => {
  it('slide right: the left neighbor extends, the right neighbor trims its head — glued, no overlap', () => {
    const pastBefore = S().past.length;
    act(() => { S().slideMove('el-2', 10); });
    expect(el('el-2').startTime).toBe(10);
    expect(el('el-1').duration).toBe(10); // right edge followed the clip
    expect(el('el-1').sourceStart).toBe(12); // window start unchanged (grew at the tail)
    expect(el('el-3').startTime).toBe(18.5); // left edge trimmed to abut
    expect(el('el-3').duration).toBeCloseTo(5.5, 5);
    expect(el('el-3').sourceStart).toBeCloseTo(1.5, 5);
    expect(S().past.length).toBe(pastBefore + 1); // ONE entry
  });

  it('slide bounded: the right neighbor keeps its 1-frame minimum', () => {
    act(() => { S().slideMove('el-2', 100); });
    const hi = 17 + 7 - 1 / 24 - 8.5; // next.end − MIN − el.dur
    expect(el('el-2').startTime).toBeCloseTo(hi, 5);
    expect(el('el-3').duration).toBeCloseTo(1 / 24, 6);
  });

  it('slide left: the left neighbor trims (making room); the right neighbor cannot extend past its source HEAD → a gap opens, never an overlap', () => {
    act(() => { S().slideMove('el-2', 2); });
    expect(el('el-2').startTime).toBe(2);
    expect(el('el-1').duration).toBeCloseTo(2, 5); // trimmed to make room
    expect(el('el-3').startTime).toBe(17); // sourceStart 0 → no head to extend → stays
    expect(el('el-3').duration).toBe(7);
    // gap [10.5, 17) — the capped edge opens a gap instead of overlapping
    expect(el('el-2').startTime + el('el-2').duration).toBeLessThan(el('el-3').startTime);
  });

  it('a neighbor capped by its SOURCE TAIL opens a gap instead of extending', () => {
    // slide el-4 far right: its left neighbor el-3 (m-03 18.6 s, sourceStart 0)
    // can only extend its right edge to 17 + 18.6 = 35.6 — past that a GAP opens
    act(() => { S().slideMove('el-4', 40); });
    expect(el('el-4').startTime).toBe(40);
    expect(el('el-3').duration).toBeCloseTo(18.6, 5); // extended to its full source
    expect(el('el-3').startTime + el('el-3').duration).toBeLessThan(40 - 1e-9); // gap [35.6, 40)
  });
});

describe('R15 T4: stretchTrim (spec-06 §5.8 — speed compensates, rate clamp)', () => {
  it('duration changes; speed = sourceSpan/duration compensates; ONE entry', () => {
    const pastBefore = S().past.length;
    act(() => { S().stretchTrim('el-6', 'r', 10); }); // el-6 [0,30), span 30, no neighbor
    expect(el('el-6').duration).toBe(40);
    expect(el('el-6').speed).toBeCloseTo(30 / 40, 5); // 0.75
    expect(el('el-6').duration * (el('el-6').speed ?? 1)).toBeCloseTo(30, 5); // span invariant
    expect(S().past.length).toBe(pastBefore + 1);
  });

  it('left edge: the end stays fixed, the start moves with the edge', () => {
    act(() => { S().stretchTrim('el-2', 'l', 2); }); // start 8.5 → 10.5, dur 6.5
    expect(el('el-2').startTime).toBe(10.5);
    expect(el('el-2').duration).toBeCloseTo(6.5, 5);
    expect(el('el-2').speed).toBeCloseTo(8.5 / 6.5, 5);
  });

  it('rate clamp [0.01, 5]: extreme stretches pin at the floor/ceiling', () => {
    act(() => { S().stretchTrim('el-6', 'r', 2970); });
    expect(el('el-6').duration).toBe(3000); // span / 0.01
    expect(el('el-6').speed).toBeCloseTo(0.01, 5);
    act(() => { S().stretchTrim('el-6', 'r', -2994); });
    expect(el('el-6').duration).toBeCloseTo(6, 5); // span / 5
    expect(el('el-6').speed).toBeCloseTo(5, 5);
  });

  it('the edge still respects the neighbor bound (no overlap) — bounded, no write', () => {
    const pastBefore = S().past.length;
    act(() => { S().stretchTrim('el-2', 'r', 2); }); // el-3 starts at el-2's end
    expect(el('el-2').duration).toBe(8.5); // clamped to a no-op
    expect(S().past.length).toBe(pastBefore);
  });
});

/* ---------- R19: marker v2 / captions / source-preview / insertMediaAt ---------- */

describe('R19: marker v2 (select / update / remove / clip markers)', () => {
  it('selectMarker swaps the selection domain and clips clear it back', () => {
    act(() => { S().selectMarker('mk-2'); });
    expect(S().selectedMarkerId).toBe('mk-2');
    expect(S().selection).toEqual([]);
    act(() => { S().setSelection(['el-1']); });
    expect(S().selectedMarkerId).toBe(null);
  });

  it('updateMarker patches fields with the range law, undo round-trips', () => {
    const pastBefore = S().past.length;
    act(() => { S().updateMarker('mk-5', { time: 18.0, duration: 4.0, label: 'Drone pass', notes: 'n', keyword: 'k' }); });
    const m = S().scenes.find((sc) => sc.id === 'sc-1')!.markers.find((x) => x.id === 'mk-5')!;
    expect(m.time).toBe(18);
    expect(m.duration).toBe(4);
    expect(m.label).toBe('Drone pass');
    // range law: duration clamps so time+duration ≤ scene duration (30)
    act(() => { S().updateMarker('mk-5', { time: 29, duration: 5 }); });
    const m2 = S().scenes.find((sc) => sc.id === 'sc-1')!.markers.find((x) => x.id === 'mk-5')!;
    expect(m2.time).toBe(29);
    expect(m2.duration).toBe(1); // 30 − 29
    act(() => { S().undo(); act(() => { S().undo(); }); });
    const m3 = S().scenes.find((sc) => sc.id === 'sc-1')!.markers.find((x) => x.id === 'mk-5')!;
    expect(m3.time).toBe(17);
    expect(m3.duration).toBe(7);
    expect(S().past.length).toBe(pastBefore);
  });

  it('removeMarker deletes exactly one and clears the selection if it pointed there', () => {
    act(() => { S().selectMarker('mk-1'); });
    act(() => { S().removeMarker('mk-1'); });
    expect(S().scenes.find((sc) => sc.id === 'sc-1')!.markers.map((m) => m.id)).not.toContain('mk-1');
    expect(S().selectedMarkerId).toBe(null);
  });

  it('addClipMarker clamps the offset into the clip and clones for undo; removeClipMarker prunes', () => {
    act(() => { S().addClipMarker('el-2', 99, 'pink'); }); // clamp → last frame
    const el2 = S().scenes.find((sc) => sc.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-main')!.elements.find((e) => e.id === 'el-2')!;
    expect(el2.markers).toHaveLength(3);
    expect(el2.markers!.at(-1)!.offset).toBeCloseTo(el2.duration - 1 / 24, 6);
    act(() => { S().undo(); });
    expect(S().scenes.find((sc) => sc.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-main')!.elements.find((e) => e.id === 'el-2')!.markers).toHaveLength(2);
    act(() => { S().removeClipMarker('el-2', 'cm-1'); });
    expect(S().scenes.find((sc) => sc.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-main')!.elements.find((e) => e.id === 'el-2')!.markers!.map((m) => m.id)).toEqual(['cm-2']);
  });
});

describe('R19: captions (addCaption gap-scan)', () => {
  it('inserts a new caption at the first free slot after the reference, undoable', () => {
    const pastBefore = S().past.length;
    act(() => { S().addCaption('cap-1'); });
    const cc = S().scenes.find((sc) => sc.id === 'sc-1')!.tracks.find((t) => t.kind === 'caption')!;
    expect(cc.elements).toHaveLength(6);
    const added = cc.elements.at(-1)!;
    // gap-scan: the 1.5s new caption can't fit before cap-3/4/5 (dense row) →
    // first free slot is after cap-5's end (312/24 = 13.0)
    expect(added.startTime).toBeCloseTo(13, 6);
    expect(added.text).toBe('New caption');
    expect(added.type).toBe('text');
    act(() => { S().undo(); });
    expect(S().scenes.find((sc) => sc.id === 'sc-1')!.tracks.find((t) => t.kind === 'caption')!.elements).toHaveLength(5);
    expect(S().past.length).toBe(pastBefore);
  });
});

describe('R19: source preview (spec 18 §4.3 v1.1 + C39 deviation)', () => {
  it('enter/exit swaps the viewer mode and media id', () => {
    act(() => { S().enterSourcePreview('m-03'); });
    expect(S().viewerMode).toBe('source');
    expect(S().sourceMediaId).toBe('m-03');
    act(() => { S().exitSourcePreview(); });
    expect(S().viewerMode).toBe('program');
    expect(S().sourceMediaId).toBe(null);
  });
});

describe('R19: insertMediaAt — the 7 Resolve edit functions (real placement)', () => {
  const elsOn = (trackId: string) => S().scenes.find((sc) => sc.id === 'sc-1')!.tracks.find((t) => t.id === trackId)!.elements;

  it('append lands at the track tail, one undo entry', () => {
    act(() => { S().insertMediaAt('m-02', 'append'); });
    // tr-main tail = 30 (el-4 ends 30)
    const main = elsOn('tr-main');
    expect(main.at(-1)!.startTime).toBe(30);
    expect(main.at(-1)!.mediaId).toBe('m-02');
    expect(S().past).toHaveLength(1);
    act(() => { S().undo(); });
    expect(elsOn('tr-main')).toHaveLength(4);
    expect(S().past).toHaveLength(0);
  });

  it('insert splits the straddler and ripples later clips right', () => {
    act(() => { S().setPlayhead(12); });
    act(() => { S().insertMediaAt('m-03', 'insert'); }); // drone 18.6s → capped? no: 18.6 ≤ 30 → dur 18.6
    const main = elsOn('tr-main');
    // el-2 [8.5,17) straddles 12 → left half [8.5,12), right half [30.6, 35.6)
    const el2 = main.find((e) => e.id === 'el-2')!;
    expect(el2.duration).toBe(3.5);
    const right = main.find((e) => e.id.startsWith('el-2-b'))!;
    expect(right.startTime).toBeCloseTo(12 + 18.6, 6);
    // el-3 [17,24) → shifted right by 18.6
    expect(main.find((e) => e.id === 'el-3')!.startTime).toBeCloseTo(35.6, 6);
    // the new clip sits at 12
    expect(main.find((e) => e.mediaId === 'm-03' && e.startTime === 12)).toBeDefined();
  });

  it('overwrite removes fully-covered clips and trims straddlers', () => {
    act(() => { S().setPlayhead(8.5); });
    act(() => { S().insertMediaAt('m-05', 'overwrite'); }); // sunset 12.8s at 8.5 on main
    const main = elsOn('tr-main');
    // span [8.5, 21.3): el-2 [8.5,17) FULLY covered → removed
    expect(main.find((e) => e.id === 'el-2')).toBeUndefined();
    // el-3 [17,24) head-covered → start 21.3, dur 2.7, sourceStart shifted
    const el3 = main.find((e) => e.id === 'el-3')!;
    expect(el3.startTime).toBeCloseTo(8.5 + 12.8, 6);
    expect(el3.duration).toBeCloseTo(24 - (8.5 + 12.8), 6);
    // el-1 [0,8.5) half-open → untouched; el-4 [24,30) after the span → untouched
    expect(main.find((e) => e.id === 'el-1')!.duration).toBe(8.5);
    expect(main.find((e) => e.id === 'el-4')!.startTime).toBe(24);
  });

  it('placeOnTop creates an overlay track when none is compatible and inserts above main', () => {
    act(() => { S().setPlayhead(2); });
    act(() => { S().insertMediaAt('m-08', 'placeOnTop'); }); // image → overlay anyway; tr-overlay-1 exists → lands there
    const ov = S().scenes.find((sc) => sc.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-overlay-1')!;
    expect(ov.elements.some((e) => e.mediaId === 'm-08' && e.startTime === 2)).toBe(true);
  });

  it('replace refuses honestly with no selection; swaps the selected clip with one', () => {
    act(() => { S().setSelection([]); });
    act(() => { S().insertMediaAt('m-02', 'replace'); });
    expect(S().toasts.at(-1)!.title).toBe('Replace');
    act(() => { S().setSelection(['el-1']); });
    act(() => { S().insertMediaAt('m-03', 'replace'); });
    const main = elsOn('tr-main');
    expect(main.find((e) => e.id === 'el-1')).toBeUndefined();
    expect(main.find((e) => e.mediaId === 'm-03' && e.startTime === 0)).toBeDefined();
  });

  it('fitToFill retimes the source into the loop span (rate-clamped honest refusal)', () => {
    // loop fixture {2,28} → span 26; source m-05 12.8s → rate 12.8/26 ≈ 0.4923 (within clamp)
    act(() => { S().insertMediaAt('m-05', 'fitToFill'); });
    const main = elsOn('tr-main');
    const fitted = main.find((e) => e.mediaId === 'm-05' && e.startTime === 2 && Math.abs(e.duration - 26) < 0.01);
    expect(fitted).toBeDefined();
    expect(fitted!.speed).toBeCloseTo(12.8 / 26, 4);
  });

  it('rippleOverwrite closes the gap when the displaced span exceeds the insert', () => {
    // span [0,12.8): el-1 [0,8.5) removed (displaced 8.5) + el-2 [8.5,17)
    // head-trimmed (displaced 4.3) → displaced 12.8 == dur → delta 0 → el-4 [24,30) stays
    act(() => { S().setPlayhead(0); });
    act(() => { S().insertMediaAt('m-05', 'rippleOverwrite'); });
    const main = elsOn('tr-main');
    expect(main.find((e) => e.id === 'el-1')).toBeUndefined();
    expect(main.find((e) => e.id === 'el-2')!.startTime).toBeCloseTo(12.8, 6);
    expect(main.find((e) => e.id === 'el-2')!.duration).toBeCloseTo(4.2, 6);
    expect(main.find((e) => e.id === 'el-4')!.startTime).toBe(24); // delta 0 → no shift
  });

  it('audio media routes to the audio track (kind law)', () => {
    act(() => { S().setPlayhead(4); });
    act(() => { S().insertMediaAt('m-06', 'append'); });
    const a1 = elsOn('tr-audio-1');
    expect(a1.at(-1)!.mediaId).toBe('m-06');
    expect(a1.at(-1)!.type).toBe('audio');
  });
});

/* R20-W6FIX (P2-4): the retarget law is now SAME-ELEMENT-KIND (contract
   insert-modes.md §5(b)) — the selection fallback fires only when the
   selected clip's TYPE equals the source's mapped type; the pre-W6
   "selected element's TRACK accepts the source type" reading let a video
   source retarget through a selected TEXT/IMAGE clip onto the overlay.
   fitToFill never retargets at all (R19's first-unlocked-kind-lane law).
   The positive same-kind direction is pinned at the planner level
   (insertPlan.test.ts, synthetic overlay-resident video/image elements). */
describe('R20-W6FIX P2-4: insertMediaAt retargets by SAME ELEMENT KIND (contract §5(b))', () => {
  it('video source + TEXT clip selected → places on MAIN, not the selected clip\'s overlay lane', () => {
    act(() => { S().setSelection(['el-5']); }); // el-5 = text on tr-overlay-1
    act(() => { S().setPlayhead(12); });
    act(() => { S().insertMediaAt('m-03', 'insert'); });
    const main = track('sc-1', 'tr-main').elements;
    expect(main.find((e) => e.mediaId === 'm-03' && e.startTime === 12)).toBeDefined();
    // the overlay lane NEVER received it (the old track-accepts reading landed there)
    expect(track('sc-1', 'tr-overlay-1').elements.some((e) => e.mediaId === 'm-03')).toBe(false);
  });

  it('audio source + VIDEO clip selected → the audio lane (type wins)', () => {
    act(() => { S().setSelection(['el-1']); });
    act(() => { S().insertMediaAt('m-07', 'append'); });
    const a1 = track('sc-1', 'tr-audio-1').elements;
    expect(a1.at(-1)!.mediaId).toBe('m-07');
    expect(a1.at(-1)!.startTime).toBe(30); // lane tail, after el-6
    expect(a1.at(-1)!.type).toBe('audio');
  });

  it('fitToFill NEVER retargets: an overlay-resident selection cannot hijack the lane', () => {
    // el-5 (text) lives on tr-overlay-1, which ACCEPTS video — the pre-W6
    // retarget would have fit-to-filled onto the overlay; the kind law
    // (first unlocked lane of the media's kind = main) stands
    act(() => { S().setSelection(['el-5']); });
    act(() => { S().insertMediaAt('m-05', 'fitToFill'); });
    const fitted = track('sc-1', 'tr-main').elements.find((e) => e.mediaId === 'm-05' && Math.abs(e.duration - 26) < 0.01);
    expect(fitted).toBeDefined();
    expect(fitted!.speed).toBeCloseTo(12.8 / 26, 4);
    expect(track('sc-1', 'tr-overlay-1').elements.some((e) => e.mediaId === 'm-05')).toBe(false);
  });
});

describe('R19: activeTrackOf (inspector empty-selection fallback)', () => {
  it('derivation: focused track wins, then topmost visual under the playhead, then main', () => {
    const sc = project.scenes[0];
    expect(activeTrackOf(sc, 'tr-audio-1', 16)!.id).toBe('tr-audio-1'); // focused wins
    expect(activeTrackOf(sc, null, 13)!.id).toBe('tr-main'); // el-2 covers 13 on main; el-5 ends at 12
    expect(activeTrackOf(sc, null, 10.5)!.id).toBe('tr-overlay-1'); // el-5 [8.75,12) covers 10.5
    expect(activeTrackOf(sc, null, 29.9)!.id).toBe('tr-main'); // past content → main fallback
  });
});

/* R20-W3 (D4.2): the track/effect selection domains — mirrors of the R19
   selectedMarkerId domain-swap law. Store-level pins (the component-level
   matrix lives in Inspector.test.tsx); the inspectorTab surface is GONE
   (the tab strip was removed per thread #53 — 18 §4.4 deviation registered). */
describe('R20-W3: track/effect selection domains + project mode', () => {
  it('selectTrack clears the clip selection + marker/effect domains; setSelection clears it back', () => {
    act(() => { S().selectElement('el-2', false); });
    act(() => { S().selectTrack('tr-audio-1'); });
    expect(S().selectedTrackId).toBe('tr-audio-1');
    expect(S().selection).toEqual([]);
    expect(S().selectedMarkerId).toBe(null);
    act(() => { S().setSelection(['el-1']); });
    expect(S().selectedTrackId).toBe(null); // one domain at a time
  });

  it('selectEffect keeps its clip selected; the clip deselecting clears the effect', () => {
    act(() => { S().setSelection(['el-1']); });
    act(() => { S().selectEffect('el-1', 'fx-1'); });
    expect(S().selectedEffectId).toBe('fx-1');
    expect(S().selectedEffectClipId).toBe('el-1');
    expect(S().selection).toEqual(['el-1']); // the clip STAYS selected (accordion in place)
    expect(S().selectedTrackId).toBe(null);
    // the effect survives a selection that still holds its clip...
    act(() => { S().setSelection(['el-1', 'el-2']); });
    expect(S().selectedEffectId).toBe('fx-1');
    // ...and dies when the clip deselects
    act(() => { S().setSelection(['el-2']); });
    expect(S().selectedEffectId).toBe(null);
    expect(S().selectedEffectClipId).toBe(null);
  });

  it('selectTrack / selectEffect / selectMarker exit project mode; the toggle flips it', () => {
    act(() => { S().toggleInspectorProjectMode(); });
    expect(S().inspectorProjectMode).toBe(true);
    act(() => { S().selectTrack('tr-main'); });
    expect(S().inspectorProjectMode).toBe(false);
    act(() => { S().toggleInspectorProjectMode(); });
    act(() => { S().selectEffect('el-1', 'fx-1'); });
    expect(S().inspectorProjectMode).toBe(false);
    act(() => { S().toggleInspectorProjectMode(); });
    act(() => { S().selectMarker('mk-2'); });
    expect(S().inspectorProjectMode).toBe(false);
  });

  it('scene switch clears the track/effect domains (stale ids never survive)', () => {
    act(() => { S().selectTrack('tr-audio-1'); });
    act(() => { S().setActiveScene('sc-2'); });
    expect(S().selectedTrackId).toBe(null);
    expect(S().selection).toEqual([]);
  });

  it('the inspectorTab surface is gone (the tab strip removal, thread #53)', () => {
    const s = S() as unknown as Record<string, unknown>;
    expect(s.inspectorTab).toBeUndefined();
    expect(s.setInspectorTab).toBeUndefined();
  });
});

/* ---------- R23-WA (DESIGN-R23 D-A2/D-A3): the FX engine state machine ---------- */

describe('R23-WA: fxMode — the single-source coupling (Part IX ruling 2)', () => {
  it('boots OFF; setTool(fx) turns it on, any other tool turns it off', () => {
    expect(S().fxMode).toBe(false);
    act(() => { S().setTool('fx'); });
    expect(S().fxMode).toBe(true);
    expect(S().tool).toBe('fx');
    for (const t of ['select', 'blade', 'roll', 'ripple', 'slip', 'slide', 'stretch'] as const) {
      act(() => { S().setTool(t); });
      expect(S().fxMode).toBe(false);
    }
  });

  it('setPage: entering the FX page owns fxMode; leaving resets it AND re-seats a stranded FX tool', () => {
    act(() => { S().setPage('fx'); });
    expect(S().fxMode).toBe(true);
    // on the FX page tool changes never kill the engine (the page owns it)
    act(() => { S().setTool('blade'); });
    expect(S().fxMode).toBe(true);
    expect(S().tool).toBe('blade');
    act(() => { S().setTool('fx'); });
    act(() => { S().setPage('edit'); });
    expect(S().fxMode).toBe(false);
    expect(S().tool).toBe('select'); // the radio never claims a dead fxMode
    // leaving via any other route re-seats too (audioLaneBoost's exit law)
    act(() => { S().setPage('fx'); });
    act(() => { S().setTool('fx'); });
    act(() => { S().setPage('color'); });
    expect(S().fxMode).toBe(false);
    expect(S().tool).toBe('select');
  });

  it('the RAW page writers carry the exit law too: enterAudioFocus from the FX page resets fxMode + re-seats the tool (ruling 2 belt-and-braces)', () => {
    // the audio-focus actions write `page` directly (they seed mixer state in
    // the same commit) — they must not strand a live engine on the audio page
    act(() => { S().setPage('fx'); });
    act(() => { S().setTool('fx'); });
    act(() => { S().enterAudioFocus('shortcut'); });
    expect(S().page).toBe('audio');
    expect(S().fxMode).toBe(false);
    expect(S().tool).toBe('select'); // no stranded FX tool on the audio page
    // exit lands on Edit with the engine off (belt-and-braces)
    act(() => { S().exitAudioFocus(); });
    expect(S().page).toBe('edit');
    expect(S().fxMode).toBe(false);
    expect(S().tool).toBe('select');
  });
});

describe('R23-WA: selectedFxObject — the seventh selection domain', () => {
  it('selectFxObject clears marker/track/effect domains but KEEPS the clip selection (the selectEffect mirror)', () => {
    act(() => { S().setSelection(['el-1']); });
    act(() => { S().selectEffect('el-1', 'fx-1'); });
    act(() => { S().selectFxObject({ kind: 'fade', elementId: 'el-1', side: 'in' }); });
    expect(S().selectedFxObject).toEqual({ kind: 'fade', elementId: 'el-1', side: 'in' });
    expect(S().selection).toEqual(['el-1']); // the clip STAYS selected
    expect(S().selectedMarkerId).toBe(null);
    expect(S().selectedTrackId).toBe(null);
    expect(S().selectedEffectId).toBe(null);
    expect(S().selectedEffectClipId).toBe(null);
    expect(S().inspectorProjectMode).toBe(false);
  });

  it('the domain rides the survival law: alive while its element stays selected, dead when it deselects', () => {
    act(() => { S().setSelection(['el-1', 'el-2']); });
    act(() => { S().selectFxObject({ kind: 'transition', elementId: 'el-2' }); });
    act(() => { S().setSelection(['el-1', 'el-2']); }); // element still held
    expect(S().selectedFxObject).toEqual({ kind: 'transition', elementId: 'el-2' });
    act(() => { S().setSelection(['el-1']); }); // dropped
    expect(S().selectedFxObject).toBe(null);
  });

  it('selectElement additive toggle-off drops the pointing object (the effect domain\'s own law)', () => {
    act(() => { S().selectElement('el-1', false); });
    act(() => { S().selectFxObject({ kind: 'fade', elementId: 'el-1', side: 'out' }); });
    act(() => { S().selectElement('el-1', true); }); // additive re-click = toggle-off
    expect(S().selection).toEqual([]);
    expect(S().selectedFxObject).toBe(null);
  });

  it('mutual exclusivity: selectMarker / selectTrack / selectEffect each clear the FX domain', () => {
    const fx = { kind: 'fade' as const, elementId: 'el-1', side: 'in' as const };
    act(() => { S().setSelection(['el-1']); });
    act(() => { S().selectFxObject(fx); });
    act(() => { S().selectMarker('mk-1'); });
    expect(S().selectedFxObject).toBe(null);
    act(() => { S().selectFxObject(fx); });
    act(() => { S().selectTrack('tr-main'); });
    expect(S().selectedFxObject).toBe(null);
    act(() => { S().selectFxObject(fx); });
    act(() => { S().selectEffect('el-1', 'fx-1'); });
    expect(S().selectedFxObject).toBe(null);
    // and the reverse: selectFxObject clears the effect domain
    act(() => { S().selectEffect('el-1', 'fx-1'); });
    act(() => { S().selectFxObject(fx); });
    expect(S().selectedEffectId).toBe(null);
    expect(S().selectedEffectClipId).toBe(null);
  });

  it('the scene switch clears the domain (stale ids never survive — the sixth site)', () => {
    act(() => { S().setSelection(['el-1']); });
    act(() => { S().selectFxObject({ kind: 'fade', elementId: 'el-1', side: 'in' }); });
    act(() => { S().setActiveScene('sc-2'); });
    expect(S().selectedFxObject).toBe(null);
  });

  it('deleteElements belt-and-braces: a pointing object dies with its element', () => {
    act(() => { S().setSelection(['el-3']); });
    act(() => { S().selectFxObject({ kind: 'fade', elementId: 'el-3', side: 'in' }); });
    act(() => { S().deleteElements(['el-3'], false); });
    expect(S().selectedFxObject).toBe(null);
  });
});

describe('R24-W0: the store prep — fx-domain exit laws + the transition no-op twin + split clears the pointing rail', () => {
  it('W0.1: leaving the FX page clears selectedFxObject (the page-transition leak — F5-P2)', () => {
    act(() => { S().setPage('fx'); });
    act(() => { S().setSelection(['el-1']); });
    act(() => { S().selectFxObject({ kind: 'fade', elementId: 'el-1', side: 'in' }); });
    expect(S().selectedFxObject).toEqual({ kind: 'fade', elementId: 'el-1', side: 'in' });
    act(() => { S().setPage('edit'); }); // ⌘1 — the leak route Delete abused
    expect(S().selectedFxObject).toBe(null);
    // the survival law still holds WITHIN the page (selection changes only)
    act(() => { S().setPage('fx'); });
    act(() => { S().selectFxObject({ kind: 'transition', elementId: 'el-2' }); });
    expect(S().selectedFxObject).toEqual({ kind: 'transition', elementId: 'el-2' });
    act(() => { S().setPage('color'); });
    expect(S().selectedFxObject).toBe(null);
  });

  it('W0.1 raw-writer twin: enterAudioFocus from the FX page clears the domain (the fxMode coupling pattern)', () => {
    act(() => { S().setPage('fx'); });
    act(() => { S().selectFxObject({ kind: 'fade', elementId: 'el-1', side: 'out' }); });
    act(() => { S().enterAudioFocus('shortcut'); });
    expect(S().page).toBe('audio');
    expect(S().selectedFxObject).toBe(null);
  });

  it('W0.2: an IDENTICAL patch on an existing transition mints NO history entry (A1 no-op twin)', () => {
    // el-2's fixture transition: crossfade / Cross Dissolve / 0.75s / alignment 0.5
    const pastBefore = S().past.length;
    act(() => { S().setTransition('el-2', { duration: 0.75, presentation: 'Cross Dissolve' }); });
    expect(S().past.length).toBe(pastBefore); // true no-op
    expect(el('el-2').transitionOut?.duration).toBe(0.75);
    // a REAL patch still mints exactly one entry
    act(() => { S().setTransition('el-2', { duration: 1.25 }); });
    expect(S().past.length).toBe(pastBefore + 1);
    expect(el('el-2').transitionOut?.duration).toBe(1.25);
    act(() => { S().undo(); });
    expect(el('el-2').transitionOut?.duration).toBe(0.75); // round-trips
  });

  it('W0.2 fresh-mint guard: the no-op guard NEVER fires when no transition exists (the R24 first-cut bug)', () => {
    expect(el('el-4').transitionOut).toBeUndefined(); // virgin seam
    const pastBefore = S().past.length;
    act(() => { S().setTransition('el-4', { duration: 0.5, presentation: 'Cross Dissolve', alignment: 0.5 }); });
    expect(S().past.length).toBe(pastBefore + 1); // fresh-mint IS a change
    expect(el('el-4').transitionOut?.presentation).toBe('Cross Dissolve');
    // and a second identical patch on the NOW-existing transition is the no-op
    act(() => { S().setTransition('el-4', { duration: 0.5 }); });
    expect(S().past.length).toBe(pastBefore + 1);
  });

  it('W0.3: split clears a selectedFxObject pointing at the split element (the lying rail — F5)', () => {
    act(() => { S().setPage('fx'); });
    act(() => { S().setSelection(['el-2']); });
    // point at el-2's transition BEFORE the split — after ⌘B the transition
    // moves to the new right-half id (el-2-b…), the rail would lie
    act(() => { S().selectFxObject({ kind: 'transition', elementId: 'el-2' }); });
    act(() => { S().splitElement('el-2', 12.75); });
    expect(S().selectedFxObject).toBe(null);
    // and the transition itself moved to the right half (the pre-existing law)
    expect(el('el-2').transitionOut).toBeUndefined();
    expect(mainEls().some((id) => id.startsWith('el-2-b'))).toBe(true);
    // a domain pointing ELSEWHERE survives a REAL split of a different
    // element (no over-clearing — el-3 spans 17→24, split at 20 is valid)
    act(() => { S().selectFxObject({ kind: 'fade', elementId: 'el-1', side: 'in' }); });
    act(() => { S().splitElement('el-3', 20); });
    expect(S().selectedFxObject).toEqual({ kind: 'fade', elementId: 'el-1', side: 'in' });
  });
});

describe('R23-WA: setFade — the ONE effective-fade writer (D-A3)', () => {
  it('routes video/text to fadeIn/fadeOut, audio to audioFadeIn/audioFadeOut (fieldOfFade, single owner)', () => {
    act(() => { S().setFade('el-1', 'in', 1.25); });
    expect(el('el-1').fadeIn).toBe(1.25);
    expect(el('el-1').fadeOut).toBe(0.75); // untouched
    act(() => { S().setFade('el-6', 'out', 3); }); // audio element
    expect(el('el-6').audioFadeOut).toBe(3);
    expect(el('el-6').fadeOut).toBeUndefined(); // never the wrong domain
  });

  it('store-owned clamp [0, clip duration] + the 24 fps frame grid', () => {
    act(() => { S().setFade('el-1', 'in', 99); }); // duration 8.5
    expect(el('el-1').fadeIn).toBe(8.5);
    act(() => { S().setFade('el-1', 'in', -3); });
    expect(el('el-1').fadeIn).toBe(0);
    act(() => { S().setFade('el-1', 'in', 0.317); }); // off-grid → snapped (0.317×24 = 7.6 → 8 frames)
    expect(el('el-1').fadeIn).toBeCloseTo(8 / 24, 10);
  });

  it('history-backed; a no-op write mints NO history entry', () => {
    // the setup contract resets the store per test — fixtures are pristine
    const before = S().past.length;
    expect(el('el-1').fadeIn).toBe(0.5); // the fixture value
    act(() => { S().setFade('el-1', 'in', 2); });
    expect(S().past.length).toBe(before + 1);
    const cur = el('el-1').fadeIn!;
    act(() => { S().setFade('el-1', 'in', cur); }); // same value
    expect(S().past.length).toBe(before + 1); // the no-op minted nothing
    act(() => { S().undo(); });
    expect(el('el-1').fadeIn).toBe(0.5); // one undo step = one write
  });

  it('locked lanes refuse the write (the marquee/trim lock law)', () => {
    act(() => { S().setFade('el-7', 'in', 1); }); // tr-audio-2 is locked
    expect(el('el-7').audioFadeIn).toBeUndefined();
  });
});

describe('R23-WA: removeFade / removeTransition — delete-aware removal (R23-B C1)', () => {
  it('removeFade DELETES the field (Object.assign can never unset) + clears the pointing selection', () => {
    act(() => { S().setSelection(['el-1']); });
    act(() => { S().selectFxObject({ kind: 'fade', elementId: 'el-1', side: 'in' }); });
    const before = S().past.length;
    act(() => { S().removeFade('el-1', 'in'); });
    expect('fadeIn' in el('el-1')).toBe(false); // the key is GONE, not 0
    expect(el('el-1').fadeOut).toBe(0.75); // the other side untouched
    expect(S().selectedFxObject).toBe(null);
    expect(S().past.length).toBe(before + 1);
    act(() => { S().undo(); });
    expect(el('el-1').fadeIn).toBe(0.5); // undo restores the field
  });

  it('removeFade on a side with no fade is a no-op (no history entry)', () => {
    const before = S().past.length;
    act(() => { S().removeFade('el-5', 'in'); }); // no fades on the text clip
    expect(S().past.length).toBe(before);
  });

  it('removeFade only clears the selection when it points at THAT side', () => {
    act(() => { S().setSelection(['el-1']); });
    act(() => { S().selectFxObject({ kind: 'fade', elementId: 'el-1', side: 'out' }); });
    act(() => { S().removeFade('el-1', 'in'); });
    expect(S().selectedFxObject).toEqual({ kind: 'fade', elementId: 'el-1', side: 'out' });
  });

  it('removeTransition DELETES transitionOut + clears a pointing transition selection (the disabled boundary dies)', () => {
    expect(el('el-2').transitionOut).toBeDefined();
    act(() => { S().selectFxObject({ kind: 'transition', elementId: 'el-2' }); });
    const before = S().past.length;
    act(() => { S().removeTransition('el-2'); });
    expect('transitionOut' in el('el-2')).toBe(false);
    expect(S().selectedFxObject).toBe(null);
    expect(S().past.length).toBe(before + 1);
    act(() => { S().undo(); });
    expect(el('el-2').transitionOut).toEqual({ type: 'crossfade', presentation: 'Cross Dissolve', duration: 0.75, alignment: 0.5 });
    // removing what IS there mints one entry; removing nothing is a no-op
    const after = S().past.length;
    act(() => { S().removeTransition('el-2'); });
    expect(el('el-2').transitionOut).toBeUndefined();
    act(() => { S().removeTransition('el-2'); }); // truly absent now
    expect(S().past.length).toBe(after + 1); // exactly ONE entry for the real removal
  });
});

/* ---------- R23-WB (DESIGN-R23 track B): the color-view store law ---------- */

describe('R23-WB D-B1: the scopes console state (the 4-state machine dies)', () => {
  it("boots 'off' (nothing permanent in the console row, #77) and toggles off ↔ open", () => {
    expect(S().colorScopesState).toBe('off');
    act(() => { S().setColorScopesState('open'); });
    expect(S().colorScopesState).toBe('open');
    act(() => { S().setColorScopesState('off'); });
    expect(S().colorScopesState).toBe('off');
  });
});

describe('R23-WB D-B5/#92 → R24-W1 A3-R3: entering any page ≠ audio collapses the mixer (the exit law)', () => {
  it('an open mixer carried into ANY non-audio page collapses — edit included (audio-only surfaces)', () => {
    act(() => { S().setMixerState('full'); });
    act(() => { S().setPage('color'); });
    expect(S().page).toBe('color');
    expect(S().mixerState).toBe('collapsed'); // #92 supersedes #73 for the color page
    // R24-W1 (A3-R3 — supersedes R23-WB's edit+audio): EDIT carries no mixer
    // toggle either (audio-only), so an open mixer carried there would strand
    // unclosable — the exit law collapses it too
    act(() => { S().setMixerState('meters'); });
    act(() => { S().setPage('edit'); });
    expect(S().mixerState).toBe('collapsed');
    // entering AUDIO leaves the mixer state alone (audio seeds its own via
    // enterAudioFocus; setPage('audio') itself never fights an external write)
    act(() => { S().setMixerState('meters'); });
    act(() => { S().setPage('audio'); });
    expect(S().mixerState).toBe('meters');
  });

  it('staying on color does not fight an external write (the exit law fires on ENTRY only)', () => {
    act(() => { S().setPage('color'); });
    expect(S().mixerState).toBe('collapsed');
    act(() => { S().setPage('color'); }); // a no-op page write must not clobber
    expect(S().mixerState).toBe('collapsed');
  });

  it('R24-W1: exitAudioFocus carries the exit law too (the raw-writer twin) — the dock never survives onto the edit page', () => {
    act(() => { S().enterAudioFocus('dock'); });
    expect(S().mixerState).toBe('full');
    act(() => { S().exitAudioFocus(); });
    expect(S().page).toBe('edit');
    expect(S().mixerState).toBe('collapsed'); // no stranded unclosable dock on edit
  });
});

describe('R23-WB D-B3: the timeline density law (timelineCompact + the ONE resolver)', () => {
  it("boots 'auto' and resolves per page: compact on color + deliver, full elsewhere", () => {
    expect(S().timelineCompact).toBe('auto');
    act(() => { S().setPage('edit'); });
    expect(resolveTimelineCompact(S())).toBe(false);
    act(() => { S().setPage('color'); });
    expect(resolveTimelineCompact(S())).toBe(true);
    act(() => { S().setPage('deliver'); });
    expect(resolveTimelineCompact(S())).toBe(true); // deliver per D-F1 (Wave F fills the range band)
    act(() => { S().setPage('audio'); });
    expect(resolveTimelineCompact(S())).toBe(false);
    act(() => { S().setPage('fx'); });
    expect(resolveTimelineCompact(S())).toBe(false);
  });

  it("the user's 'on'/'off' override wins on every page EXCEPT fx (per-session, not a pref)", () => {
    act(() => { S().setTimelineCompact('on'); });
    act(() => { S().setPage('edit'); });
    expect(resolveTimelineCompact(S())).toBe(true); // compact on edit — #94 "everywhere"
    act(() => { S().setTimelineCompact('off'); });
    act(() => { S().setPage('color'); });
    expect(resolveTimelineCompact(S())).toBe(false); // full tracks on color — the #94 ask
    act(() => { S().setTimelineCompact('auto'); });
    expect(S().timelineCompact).toBe('auto');
  });

  /* R23-FIX (review-sweep R-b, R3-P2#3 — RE-PINNED): the FX page forces the
     FULL Timeline — even the user's 'on' override yields there (D-A1/ruling 8:
     seam hit-zones + transition boxes need real lane pixel geometry). The old
     "wins on EVERY page" law above was the D-D2 matrix's density row; ruling 8
     supersedes it for fx (the matrix + the toolbar's DOM-absence are updated
     to match — see TimelineToolbar.test). */
  it("R23-FIX R-b: fx + the user's 'on' override STILL resolves the full Timeline (the resolver is the single writer of the truth)", () => {
    act(() => { S().setTimelineCompact('on'); });
    act(() => { S().setPage('fx'); });
    expect(resolveTimelineCompact(S())).toBe(false); // the page beats the session word on fx
    act(() => { S().setPage('edit'); });
    expect(resolveTimelineCompact(S())).toBe(true); // the override still works everywhere else
    act(() => { S().setTimelineCompact('auto'); });
    act(() => { S().setPage('edit'); });
  });
});

describe('R23-WB D-B4: the Stills Gallery store home (colorStills — view state)', () => {
  it('boots the four seed stills (the R22-D7 fixtures, re-homed to the store)', () => {
    expect(S().colorStills.map((st) => st.id)).toEqual(['still-01', 'still-02', 'still-03', 'still-04']);
    expect(S().colorStills[0]).toMatchObject({ name: 'Marina cool', mediaId: 'm-01' });
  });

  it('addColorStill mints a monotonic id + name; removeColorStill drops by id', () => {
    act(() => { S().removeColorStill('still-02'); });
    const still = S().addColorStill({ ...S().colorStills[0].grade, exposure: 0.3 });
    // monotonic over the LIVE list: still-02's slot is free but the mint is still-05 — no collision
    expect(still.id).toBe('still-05');
    expect(still.name).toBe('Still 5');
    expect(S().colorStills.at(-1)?.id).toBe('still-05');
    expect(S().colorStills).toHaveLength(4);
    expect(S().addColorStill(S().colorStills[0].grade, { name: 'Named' }).name).toBe('Named');
  });

  it('the Gallery writes NEVER mint history (the sourceRanges precedent — view state)', () => {
    const before = S().past.length;
    act(() => { S().addColorStill(S().colorStills[0].grade); });
    act(() => { S().removeColorStill('still-01'); });
    expect(S().past.length).toBe(before);
    expect(S().colorStills.some((st) => st.id === 'still-01')).toBe(false);
  });
});

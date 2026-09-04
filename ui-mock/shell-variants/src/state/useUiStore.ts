/* UI store (Zustand) — spec 18 §6.2: view state only (tool, snap, panels,
   zoom, selection, playhead) + the mock document slice so drag/trim/split
   commits can re-render. In the real shell the doc comes from SceneState
   snapshots + EngineEvents; the mock co-locates it for simplicity.
   R11 additions: undo history (mock), full editing command set (delete /
   duplicate / ripple-trim / slip / transitions / effect params), toast
   region state, JKL shuttle, track focus, media multi-select + drag ghost,
   keyboard-completeness fields. */

import { create } from 'zustand';
import { project, type SceneJSON, type ElementJSON, type TrackJSON, type Marker, type EffectJSON, type TransitionPresentation } from '../lib/mockData';
import { clamp, snapToFrame } from '../lib/timecode';
import { createMixerScene, type MockMixerScene, type MixerTrackSettings, type DuckingSettings, type AuxBusSettings } from './mockMixer';

export type ToolId = 'select' | 'blade' | 'roll' | 'ripple' | 'slip' | 'slide' | 'stretch';
export type Page = 'edit' | 'color' | 'audio' | 'deliver';
export type InspectorTab = 'video' | 'audio' | 'effects' | 'transition';
export type ToastKind = 'info' | 'success' | 'error' | 'persist';
export type MixerDockState = 'collapsed' | 'bridge' | 'full';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  detail?: string;
}

/* deep structural clone of the doc slice: nested element arrays (effects,
   transitionOut, effect params) are cloned too, so undo/redo round-trips
   nested mutations (effect toggles, param edits, transition patches). The
   R11 shallow version shared those refs across history snapshots — undo
   silently kept the mutation. Caught by the R13 store test-suite. */
const cloneEl = (e: ElementJSON): ElementJSON => ({
  ...e,
  ...(e.effects ? { effects: e.effects.map((f) => ({ ...f, ...(f.params ? { params: { ...f.params } } : {}) })) } : {}),
  ...(e.transitionOut ? { transitionOut: { ...e.transitionOut } } : {}),
});
const clone = (scenes: SceneJSON[]): SceneJSON[] => scenes.map((s) => ({ ...s, tracks: s.tracks.map((t) => ({ ...t, elements: t.elements.map(cloneEl) })), markers: s.markers.map((m) => ({ ...m })) }));

const findEl = (scenes: SceneJSON[], id: string): { el: ElementJSON; track: TrackJSON; scene: SceneJSON } | null => {
  for (const sc of scenes) for (const t of sc.tracks) {
    const el = t.elements.find((e) => e.id === id);
    if (el) return { el, track: t, scene: sc };
  }
  return null;
};

interface UiState {
  page: Page;
  activeSceneId: string;
  tool: ToolId;
  snap: boolean;
  link: boolean;
  lockAll: boolean;
  playhead: number;
  playing: boolean;
  playRate: number;            // JKL shuttle: 0=pause, 1,2,4 forward, -1,-2,-4 reverse
  loopEnabled: boolean;
  // viewer UI prefs (spec 18 §4.3 viewer-toolbar) — store-level so the mock
  // state is testable/pinnable, not component-local
  viewerOverlays: boolean;   // in-canvas overlays toggle (Eye)
  viewerSafeGuides: boolean; // action/title safe-area guides (Frame)
  loop: { start: number; end: number };
  selection: string[];
  pxPerSec: number;
  panels: { mediaPool: boolean; effects: boolean; inspector: boolean };
  mediaView: 'grid' | 'list';
  search: string;
  sortBy: 'name' | 'duration' | 'date' | 'type';
  sortDir: 'asc' | 'desc';
  inspectorTab: InspectorTab;
  masterMuted: boolean;
  masterVolume: number;
  mediaW: number;
  inspectorW: number;
  mainBodyH: number;
  cheatOpen: boolean;
  scenes: SceneJSON[];
  mediaSelection: string[];    // multi-select per spec 18 §4.2
  mediaDrag: { mediaId: string; overTrackId: string | null; allowed: boolean } | null;
  focusedTrackId: string | null; // ↑/↓ track focus (spec 16 §3.6)
  toasts: Toast[];
  saveAttempt: number;
  simulateSaveFail: boolean;
  past: { scenes: SceneJSON[]; activeSceneId: string; lockAll?: boolean }[];
  future: { scenes: SceneJSON[]; activeSceneId: string; lockAll?: boolean }[];
  // ---- audio focus mode (design doc docs/DESIGN-audio-mode.md v2.1) ----
  mixer: MockMixerScene;      // mock G-slice (spec 20 §4.2 shape)
  mixerState: MixerDockState;
  audioLaneBoost: boolean;
  stripFocus: string | null;
  stripFlash: number;

  // actions
  setPage: (p: Page) => void;
  setActiveScene: (id: string) => void;
  createScene: () => void;
  deleteScene: (id: string) => void;
  setTool: (t: ToolId) => void;
  toggleSnap: () => void;
  toggleLink: () => void;
  toggleLockAll: () => void;
  setPlayhead: (t: number) => void;
  nudgePlayhead: (frames: number) => void;
  togglePlay: () => void;
  setPlaying: (p: boolean) => void;
  setShuttle: (rate: number) => void;
  setLoopEnabled: (v: boolean) => void;
  toggleViewerOverlays: () => void;
  toggleViewerSafeGuides: () => void;
  markIn: () => void;
  markOut: () => void;
  clearInOut: () => void;
  addMarker: (time: number, color?: Marker['color']) => void;
  setSelection: (ids: string[]) => void;
  selectElement: (id: string, additive: boolean) => void;
  selectTrackElements: (trackId: string, additive: boolean) => void;
  selectNeighbors: (dir: 1 | -1) => void;
  setZoom: (px: number) => void;
  zoomStep: (factor: number) => void;
  zoomFit: (containerW: number, duration: number) => void;
  togglePanel: (p: keyof UiState['panels']) => void;
  setMediaView: (v: 'grid' | 'list') => void;
  setSearch: (s: string) => void;
  setSortBy: (s: UiState['sortBy']) => void;
  setSortDir: (d: UiState['sortDir']) => void;
  setInspectorTab: (t: InspectorTab) => void;
  toggleMasterMute: () => void;
  setMasterVolume: (v: number) => void;
  setMediaW: (w: number) => void;
  setInspectorW: (w: number) => void;
  setMainBodyH: (h: number) => void;
  setCheatOpen: (v: boolean) => void;
  setMediaSelection: (ids: string[]) => void;
  toggleMediaSelection: (id: string, additive: boolean, range: boolean) => void;
  setMediaDrag: (d: UiState['mediaDrag']) => void;
  setFocusedTrack: (id: string | null) => void;
  moveFocusedTrack: (dir: 1 | -1) => void;
  pushToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  setSimulateSaveFail: (v: boolean) => void;
  retrySave: () => void;
  removeMarkersAt: (time: number) => void;
  toggleTrackCmd: (sceneId: string, trackId: string, field: 'muted' | 'solo' | 'locked' | 'visible' | 'waveform') => void;
  enterAudioFocus: (trigger: 'dock' | 'shortcut' | 'escalation', trackId?: string) => void;
  exitAudioFocus: () => void;
  setMixerState: (m: MixerDockState) => void;
  cycleMixerState: () => void;
  setAudioLaneBoost: (v: boolean) => void;
  setStripFocus: (id: string | null) => void;
  setMixerTrack: (trackId: string, patch: Partial<MixerTrackSettings>) => void;
  setAuxBus: (bus: 'a1' | 'a2', patch: Partial<AuxBusSettings>) => void;
  setDucking: (trackId: string, patch: Partial<DuckingSettings>) => void;
  undo: () => void;
  redo: () => void;
  moveElement: (id: string, startTime: number) => void;
  trimElement: (id: string, edge: 'l' | 'r', newStart: number, newDur: number) => void;
  splitElement: (id: string, time: number) => void;
  toggleEffect: (elementId: string, fxId: string) => void;
  addTrack: (kind: TrackJSON['kind']) => void;
  deleteElements: (ids: string[], ripple: boolean) => void;
  duplicateElements: (ids: string[]) => void;
  slipNudge: (ids: string[], frames: number) => void;
  trimToPlayhead: (edge: 'l' | 'r', ripple: boolean) => void;
  setElementField: (id: string, patch: Partial<ElementJSON>) => void;
  setTransition: (id: string, patch: Partial<NonNullable<ElementJSON['transitionOut']>>) => void;
  setEffectParam: (elementId: string, fxId: string, param: string, value: number) => void;
  addEffectToElement: (elementId: string, fx: Omit<EffectJSON, 'id'>) => void;
  removeEffect: (elementId: string, fxId: string) => void;
  loadSampleProject: () => void;
}

const MIN_PPS = 8;
const MAX_PPS = 240;

/* history wrapper: snapshot before each doc mutation, 50-deep.
   Returning undefined from `mutate` = no-op: NOTHING is set (no history
   entry) — this is the contract the no-pollution comments in splitElement /
   removeMarkersAt / deleteScene describe. (R13: previously a no-op still
   pushed a history entry; the store test-suite pins the fixed behavior.)
   The snapshot carries `lockAll` alongside the doc because toggleLockAll
   fans out into the doc AND flips the view flag atomically — undoing one
   half of that pair left the flag inverted (aria-pressed lying, next toggle
   doing the OPPOSITE of its label). */
const HISTORY = 50;
function withHistory(set: (partial: any) => void, get: () => UiState, mutate: (scenes: SceneJSON[]) => SceneJSON[] | void) {
  const s = get();
  const before = { scenes: clone(s.scenes), activeSceneId: s.activeSceneId, lockAll: s.lockAll };
  const next = mutate(clone(s.scenes));
  if (next === undefined) return; // no-op — no history entry
  set({
    past: [...s.past.slice(-HISTORY + 1), before],
    future: [],
    ...(next ? { scenes: next } : {}),
  });
}

/* default strip for audio tracks that appear in the mixer before the G-slice
   knows about them (addTrack → drag a fader before entering audio focus).
   Same shape enterAudioFocus seeds; R13: without this, setMixerTrack spread
   `undefined` into a partial record and the next ChannelStrip render crashed
   on `strip.inserts[0]` — caught by the code review wave. */
const DEFAULT_MIXER_TRACK: MixerTrackSettings = { fader: -6, pan: 0, inserts: [null, null], auxA: 0, auxB: 0, auxPreFader: false, outputBus: 0 };

let toastSeq = 1;

export const useUi = create<UiState>((set, get) => ({
  page: 'edit',
  activeSceneId: 'sc-1',
  tool: 'select',
  snap: true,
  link: true,
  lockAll: false,
  playhead: 16,
  playing: false,
  playRate: 1,
  loopEnabled: false,
  viewerOverlays: true,
  viewerSafeGuides: false,
  loop: { ...project.loop },
  selection: ['el-2'],
  pxPerSec: 46,
  panels: { mediaPool: true, effects: false, inspector: true },
  mediaView: 'grid',
  search: '',
  sortBy: 'name',
  sortDir: 'asc',
  inspectorTab: 'video',
  masterMuted: false,
  masterVolume: 0.78,
  mediaW: 280,
  inspectorW: 340,
  mainBodyH: 0, // 0 = auto (40% of viewport per spec 18 §3.2)
  cheatOpen: false,
  scenes: clone(project.scenes),
  mediaSelection: ['m-02'],
  mediaDrag: null,
  focusedTrackId: null,
  toasts: [],
  saveAttempt: 0,
  simulateSaveFail: false,
  past: [],
  future: [],
  mixer: createMixerScene(project.scenes.flatMap((sc) => sc.tracks.filter((t) => t.kind === 'audio').map((t) => t.id))),
  mixerState: 'collapsed',
  audioLaneBoost: false,
  stripFocus: null,
  stripFlash: 0,

  setPage: (p) => set((s) => ({
    page: p,
    // leaving audio focus by ANY route resets the lane boost (design §3.3)
    ...(s.page === 'audio' && p !== 'audio' ? { audioLaneBoost: false } : {}),
  })),
  setActiveScene: (id) => set((s) => ({ activeSceneId: id, selection: [] })),
  createScene: () => withHistory(set, get, (scenes) => {
    const n = scenes.length + 1;
    const sc: SceneJSON = {
      id: `sc-${Date.now()}`,
      name: `Scene ${n}`,
      tracks: [
        { id: `t-ov-${n}`, kind: 'overlay', name: `Text 1`, badge: `T1`, muted: false, solo: false, locked: false, visible: true, elements: [] },
        { id: `t-mn-${n}`, kind: 'main', name: 'Video 1', badge: 'V1', muted: false, solo: false, locked: false, visible: true, elements: [] },
        { id: `t-au-${n}`, kind: 'audio', name: 'Audio 1', badge: 'A1', muted: false, solo: false, locked: false, visible: true, waveform: true, elements: [] },
      ],
      markers: [],
      dirty: true,
    };
    scenes.push(sc);
    set({ activeSceneId: sc.id, selection: [] });
    return scenes;
  }),
  deleteScene: (id) => withHistory(set, get, (scenes) => {
    const idx = scenes.findIndex((x) => x.id === id);
    if (idx === -1 || scenes.length <= 1) return;
    scenes.splice(idx, 1);
    const s = get();
    if (s.activeSceneId === id) set({ activeSceneId: scenes[Math.max(0, idx - 1)].id, selection: [] });
    return scenes;
  }),
  setTool: (t) => set({ tool: t }),
  toggleSnap: () => set((s) => ({ snap: !s.snap })),
  toggleLink: () => set((s) => ({ link: !s.link })),
  toggleLockAll: () => {
    // spec 18 §4.5: lock-all = per-track toggleTrackLock fan-out (undoable batch)
    withHistory(set, get, (scenes) => {
      const s = get();
      const sc = scenes.find((x) => x.id === s.activeSceneId)!;
      const target = !s.lockAll;
      sc.tracks.forEach((t) => { t.locked = target; });
      set({ lockAll: target });
      return scenes;
    });
  },
  setPlayhead: (t) => set({ playhead: clamp(t, 0, 600) }),
  nudgePlayhead: (frames) => set((s) => ({ playhead: clamp(s.playhead + frames / 24, 0, 600) })),
  togglePlay: () => set((s) => ({ playing: !s.playing, playRate: 1 })),
  setPlaying: (p) => set({ playing: p, ...(p ? {} : { playRate: 1 }) }),
  setShuttle: (rate) => set({ playRate: rate, playing: rate !== 0 }),
  setLoopEnabled: (v) => set({ loopEnabled: v }),
  toggleViewerOverlays: () => set((s) => ({ viewerOverlays: !s.viewerOverlays })),
  toggleViewerSafeGuides: () => set((s) => ({ viewerSafeGuides: !s.viewerSafeGuides })),
  markIn: () => set((s) => ({ loop: { ...s.loop, start: snapToFrame(s.playhead) } })),
  markOut: () => set((s) => ({ loop: { ...s.loop, end: snapToFrame(s.playhead) } })),
  clearInOut: () => set((s) => ({ loop: { ...s.loop, start: 0, end: s.scenes.find((x) => x.id === s.activeSceneId) ? (function () { const sc = s.scenes.find((x) => x.id === s.activeSceneId)!; let d = 0; for (const t of sc.tracks) for (const e of t.elements) d = Math.max(d, e.startTime + e.duration); return d || 30; })() : 30 } })),
  addMarker: (time, color) => withHistory(set, get, (scenes) => {
    const s = get();
    const sc = scenes.find((x) => x.id === s.activeSceneId)!;
    const colors: Marker['color'][] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'];
    sc.markers.push({ id: `mk-${Date.now()}`, time: snapToFrame(time), label: 'Marker', color: color ?? colors[sc.markers.length % 8] });
    return scenes;
  }),
  setSelection: (ids) => set({ selection: ids }),
  selectElement: (id, additive) => set((s) => {
    // spec 05 §12.3 linked selection: "selecting one selects both" — the A/V
    // pair (el-2 ↔ el-7 in the fixture) enters/leaves the selection as a
    // group. Moves stay independent (sync-lock is 06 §6, a seal item).
    const pairOf = (target: string): string[] => {
      const hit = findEl(s.scenes, target);
      const other = hit?.el.linkedTo;
      return other && other !== target ? [target, other] : [target];
    };
    const group = pairOf(id);
    if (!additive) return { selection: group };
    const groupSelected = group.every((x) => s.selection.includes(x));
    if (groupSelected) return { selection: s.selection.filter((x) => !group.includes(x)) };
    return { selection: [...s.selection.filter((x) => !group.includes(x)), ...group] };
  }),
  selectTrackElements: (trackId, additive) => set((s) => {
    const sc = s.scenes.find((x) => x.id === s.activeSceneId);
    const track = sc?.tracks.find((t) => t.id === trackId);
    const ids = (track?.elements ?? []).map((e) => e.id);
    if (!additive) return { selection: ids };
    const merged = new Set([...s.selection, ...ids]);
    return { selection: [...merged] };
  }),
  selectNeighbors: (dir) => set((s) => {
    const sc = s.scenes.find((x) => x.id === s.activeSceneId);
    const main = sc?.tracks.find((t) => t.kind === 'main');
    const els = (main?.elements ?? []).slice().sort((a, b) => a.startTime - b.startTime);
    if (els.length === 0) return {};
    const cur = s.selection[0] ? els.findIndex((e) => e.id === s.selection[0]) : -1;
    const next = cur === -1 ? (dir === 1 ? 0 : els.length - 1) : clamp(cur + dir, 0, els.length - 1);
    return { selection: [els[next].id] };
  }),
  setZoom: (px) => set({ pxPerSec: clamp(px, MIN_PPS, MAX_PPS) }),
  zoomStep: (factor) => set((s) => ({ pxPerSec: clamp(s.pxPerSec * factor, MIN_PPS, MAX_PPS) })),
  zoomFit: (containerW, duration) => set({ pxPerSec: clamp((containerW - 24) / (duration + 2), MIN_PPS, MAX_PPS) }),
  togglePanel: (p) => set((s) => ({ panels: { ...s.panels, [p]: !s.panels[p] } })),
  setMediaView: (v) => set({ mediaView: v }),
  setSearch: (s) => set({ search: s }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortDir: (d) => set({ sortDir: d }),
  setInspectorTab: (t) => set({ inspectorTab: t }),
  toggleMasterMute: () => set((s) => ({ masterMuted: !s.masterMuted })),
  setMasterVolume: (v) => set({ masterVolume: clamp(v, 0, 1) }),
  setMediaW: (w) => set({ mediaW: clamp(w, 200, 480) }),
  setInspectorW: (w) => set({ inspectorW: clamp(w, 280, 560) }),
  setMainBodyH: (h) => set({ mainBodyH: h <= 0 ? 0 : clamp(h, 320, 900) }), // 0 = auto (40% of viewport, spec 18 §3.2)
  setCheatOpen: (v) => set({ cheatOpen: v }),
  setMediaSelection: (ids) => set({ mediaSelection: ids }),
  toggleMediaSelection: (id, additive, range) => set((s) => {
    if (range) {
      // shift-range over the flat filtered list (MediaPool supplies order via mediaSelection; mock: anchor = first)
      const anchor = s.mediaSelection[0];
      void anchor;
      const has = s.mediaSelection.includes(id);
      return { mediaSelection: has ? s.mediaSelection.filter((x) => x !== id) : [...s.mediaSelection, id] };
    }
    if (!additive) return { mediaSelection: [id] };
    const has = s.mediaSelection.includes(id);
    return { mediaSelection: has ? s.mediaSelection.filter((x) => x !== id) : [...s.mediaSelection, id] };
  }),
  setMediaDrag: (d) => set({ mediaDrag: d }),
  setFocusedTrack: (id) => set({ focusedTrackId: id }),
  moveFocusedTrack: (dir) => set((s) => {
    const sc = s.scenes.find((x) => x.id === s.activeSceneId);
    const tracks = sc?.tracks ?? [];
    if (tracks.length === 0) return {};
    const idx = tracks.findIndex((t) => t.id === s.focusedTrackId);
    const next = idx === -1 ? (dir === 1 ? 0 : tracks.length - 1) : clamp(idx + dir, 0, tracks.length - 1);
    return { focusedTrackId: tracks[next].id };
  }),
  pushToast: (t) => set((s) => {
    const toast: Toast = { ...t, id: toastSeq++ };
    // max-3 stack — MOCK DEVIATION from spec 18 §6.4 (registered seal item):
    // the spec says the OLDEST toast collapses to an icon row; the mock DROPS
    // it. Timings (4s info/success, 6s persist, no timer on error) are exact.
    const next = [...s.toasts, toast];
    return { toasts: next.length > 3 ? next.slice(next.length - 3) : next };
  }),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setSimulateSaveFail: (v) => set({ simulateSaveFail: v }),
  retrySave: () => set((s) => ({ simulateSaveFail: false, saveAttempt: s.saveAttempt + 1 })),

  removeMarkersAt: (time) => withHistory(set, get, (scenes) => {
    const s = get();
    const sc = scenes.find((x) => x.id === s.activeSceneId)!;
    const before = sc.markers.length;
    sc.markers = sc.markers.filter((m) => Math.abs(m.time - snapToFrame(time)) > 1 / 24);
    if (sc.markers.length === before) return; // nothing removed — no history entry
    return scenes;
  }),
  toggleTrackCmd: (sceneId, trackId, field) => withHistory(set, get, (scenes) => {
    const t = scenes.find((x) => x.id === sceneId)?.tracks.find((x) => x.id === trackId);
    if (!t) return; // unknown scene/track — true no-op, no history entry
    (t as any)[field] = !(t as any)[field];
    return scenes;
  }),

  // ---- audio focus (design doc §3) ----
  enterAudioFocus: (trigger, trackId) => set((s) => {
    // ensure the G-slice covers every audio trackId (tracks may have been added)
    const audioIds = s.scenes.flatMap((sc) => sc.tracks.filter((t) => t.kind === 'audio').map((t) => t.id));
    const mixer = { ...s.mixer };
    for (const id of audioIds) if (!mixer.tracks[id]) {
      mixer.tracks = { ...mixer.tracks, [id]: { fader: -6, pan: 0, inserts: [null, null], auxA: 0, auxB: 0, auxPreFader: false, outputBus: 0 } };
    }
    return {
      page: 'audio',
      mixer,
      mixerState: 'full',
      audioLaneBoost: true,
      ...(trackId || trigger === 'escalation' ? { stripFocus: trackId ?? s.stripFocus } : {}),
      stripFlash: trackId ? Date.now() : s.stripFlash,
    };
  }),
  exitAudioFocus: () => set({ page: 'edit', audioLaneBoost: false }),
  setMixerState: (m) => set({ mixerState: m }),
  cycleMixerState: () => set((s) => {
    // design doc v2.2 revision (end of file): Edit — collapsed → bridge →
    // full (compact is now a height-driven property of the dock, not a 4th
    // state); Audio — bridge ↔ full
    if (s.page === 'audio') return { mixerState: s.mixerState === 'full' ? 'bridge' : 'full' };
    return { mixerState: s.mixerState === 'collapsed' ? 'bridge' : s.mixerState === 'bridge' ? 'full' : 'collapsed' };
  }),
  setAudioLaneBoost: (v) => set({ audioLaneBoost: v }),
  setStripFocus: (id) => set({ stripFocus: id }),
  setMixerTrack: (trackId, patch) => set((s) => ({
    // ?? DEFAULT_MIXER_TRACK: a track missing from the sidecar (added after
    // boot, before enterAudioFocus syncs it) must never persist a partial
    // record — ChannelStrip/ChannelEditor read strip.inserts unguarded.
    mixer: { ...s.mixer, tracks: { ...s.mixer.tracks, [trackId]: { ...(s.mixer.tracks[trackId] ?? DEFAULT_MIXER_TRACK), ...patch } } },
  })),
  setAuxBus: (bus, patch) => set((s) => ({
    mixer: { ...s.mixer, buses: { ...s.mixer.buses, [bus]: { ...s.mixer.buses[bus], ...patch } } },
  })),
  setDucking: (trackId, patch) => set((s) => ({
    mixer: {
      ...s.mixer,
      ducking: { ...s.mixer.ducking, [trackId]: { ...(s.mixer.ducking[trackId] ?? { source: null, amount: 0.5, attack: 20, release: 400 }), ...patch } },
    },
  })),

  undo: () => set((s) => {
    if (s.past.length === 0) return {};
    const prev = s.past[s.past.length - 1];
    return {
      past: s.past.slice(0, -1),
      future: [{ scenes: clone(s.scenes), activeSceneId: s.activeSceneId, lockAll: s.lockAll }, ...s.future].slice(0, HISTORY),
      scenes: prev.scenes,
      activeSceneId: prev.activeSceneId,
      ...(prev.lockAll !== undefined ? { lockAll: prev.lockAll } : {}),
    };
  }),
  redo: () => set((s) => {
    if (s.future.length === 0) return {};
    const next = s.future[0];
    return {
      future: s.future.slice(1),
      past: [...s.past, { scenes: clone(s.scenes), activeSceneId: s.activeSceneId, lockAll: s.lockAll }].slice(-HISTORY),
      scenes: next.scenes,
      activeSceneId: next.activeSceneId,
      ...(next.lockAll !== undefined ? { lockAll: next.lockAll } : {}),
    };
  }),

  // ---- document mutations (mock-level; real shell = EngineCommand) ----
  moveElement: (id, startTime) => withHistory(set, get, (scenes) => {
    const hit = findEl(scenes, id);
    if (hit) hit.el.startTime = snapToFrame(Math.max(0, startTime));
    return scenes;
  }),
  trimElement: (id, edge, newStart, newDur) => withHistory(set, get, (scenes) => {
    const hit = findEl(scenes, id);
    if (hit) {
      const prevStart = hit.el.startTime;
      hit.el.startTime = snapToFrame(Math.max(0, newStart));
      hit.el.duration = snapToFrame(Math.max(0.25, newDur));
      if (hit.el.sourceStart !== undefined && edge === 'l') hit.el.sourceStart = Math.max(0, hit.el.sourceStart + (hit.el.startTime - prevStart));
    }
    return scenes;
  }),
  splitElement: (id, time) => withHistory(set, get, (scenes) => {
    // pre-validate against the CURRENT doc so no-op splits don't pollute history
    const pre = findEl(get().scenes, id);
    const preCut = snapToFrame(time);
    if (!pre || preCut - pre.el.startTime <= 0.1 || preCut - pre.el.startTime >= pre.el.duration - 0.1) return;
    for (const sc of scenes) for (const t of sc.tracks) {
      const idx = t.elements.findIndex((e) => e.id === id);
      if (idx === -1) continue;
      const el = t.elements[idx];
      const cut = snapToFrame(time);
      const offset = cut - el.startTime;
      if (offset <= 0.1 || offset >= el.duration - 0.1) return;
      const left: ElementJSON = { ...el, duration: offset };
      const right: ElementJSON = { ...el, id: `${el.id}-b${t.elements.length}`, startTime: cut, duration: el.duration - offset };
      if (right.sourceStart !== undefined) right.sourceStart = el.sourceStart! + offset;
      delete left.transitionOut;
      t.elements.splice(idx, 1, left, right);
    }
    return scenes;
  }),
  toggleEffect: (elementId, fxId) => withHistory(set, get, (scenes) => {
    const hit = findEl(scenes, elementId);
    if (hit?.el.effects) {
      const fx = hit.el.effects.find((f) => f.id === fxId);
      if (fx) fx.enabled = !fx.enabled;
    }
    return scenes;
  }),
  addEffectToElement: (elementId, fx) => withHistory(set, get, (scenes) => {
    const hit = findEl(scenes, elementId);
    if (hit) {
      if (!hit.el.effects) hit.el.effects = [];
      hit.el.effects.push({ ...fx, id: `fx-${Date.now()}` });
    }
    return scenes;
  }),
  removeEffect: (elementId, fxId) => withHistory(set, get, (scenes) => {
    const hit = findEl(scenes, elementId);
    if (hit?.el.effects) hit.el.effects = hit.el.effects.filter((f) => f.id !== fxId);
    return scenes;
  }),
  setEffectParam: (elementId, fxId, param, value) => withHistory(set, get, (scenes) => {
    const hit = findEl(scenes, elementId);
    const fx = hit?.el.effects?.find((f) => f.id === fxId);
    if (fx) {
      if (!fx.params) fx.params = {};
      fx.params[param] = value;
    }
    return scenes;
  }),
  deleteElements: (ids, ripple) => withHistory(set, get, (scenes) => {
    const removedIds: string[] = [];
    for (const sc of scenes) for (const t of sc.tracks) {
      if (t.locked) continue; // locked tracks are inert — same guard as trimToPlayhead / drag / marquee
      const removed = t.elements.filter((e) => ids.includes(e.id));
      if (removed.length === 0) continue;
      removedIds.push(...removed.map((e) => e.id));
      t.elements = t.elements.filter((e) => !ids.includes(e.id));
      if (ripple) {
        const earliest = Math.min(...removed.map((e) => e.startTime));
        const dur = removed.reduce((a, e) => Math.max(a, e.startTime + e.duration), earliest) - earliest;
        t.elements.forEach((e) => { if (e.startTime > earliest) e.startTime = Math.max(earliest, e.startTime - dur); });
      }
    }
    if (removedIds.length === 0) return; // nothing deletable (all locked / unknown ids) — no-op, no history
    set((st) => ({ selection: st.selection.filter((id) => !removedIds.includes(id)) }));
    return scenes;
  }),
  duplicateElements: (ids) => withHistory(set, get, (scenes) => {
    const s = get();
    const newIds: string[] = [];
    for (const sc of scenes) for (const t of sc.tracks) {
      const dupes: ElementJSON[] = [];
      for (const e of t.elements) {
        if (ids.includes(e.id)) {
          const copy: ElementJSON = { ...e, id: `${e.id}-d${Date.now()}`, startTime: e.startTime + e.duration };
          dupes.push(copy);
          newIds.push(copy.id);
        }
      }
      t.elements.push(...dupes);
    }
    set({ selection: newIds.length ? newIds : s.selection });
    return scenes;
  }),
  slipNudge: (ids, frames) => withHistory(set, get, (scenes) => {
    for (const sc of scenes) for (const t of sc.tracks) for (const e of t.elements) {
      if (!ids.includes(e.id)) continue;
      if (e.sourceStart === undefined) continue;
      // slip: shift source window, keep placement
      const next = e.sourceStart + frames / 24;
      if (next >= 0) e.sourceStart = next;
    }
    return scenes;
  }),
  trimToPlayhead: (edge, ripple) => withHistory(set, get, (scenes) => {
    const s = get();
    const ph = snapToFrame(s.playhead);
    let changed = false;
    for (const sc of scenes) for (const t of sc.tracks) {
      if (t.locked) continue;
      // ripple bookkeeping per track: [removed span end, removed span length]
      let rippleEnd: number | null = null;
      let rippleLen = 0;
      for (const e of t.elements) {
        if (edge === 'l' && ph > e.startTime && ph < e.startTime + e.duration - 0.1) {
          const cut = ph - e.startTime;
          if (e.sourceStart !== undefined) e.sourceStart += cut;
          e.duration -= cut;
          if (ripple) {
            // ripple-l = the head region is REMOVED and the gap closes (same
            // model as deleteElements' ripple): the clip KEEPS its start and
            // shows its tail (sourceStart advanced); everything from the old
            // end left-shifts by the removed head.
            rippleEnd = e.startTime + e.duration + cut; // old end (upstream boundary)
            rippleLen = cut;
          } else {
            e.startTime = ph;
          }
          changed = true;
        } else if (edge === 'r' && ph > e.startTime + 0.1 && ph < e.startTime + e.duration) {
          const removed = e.startTime + e.duration - ph;
          e.duration = ph - e.startTime;
          if (ripple) {
            // ripple-r = the tail region is removed; downstream abuts the new end
            rippleEnd = ph + removed; // old end (upstream boundary)
            rippleLen = removed;
          }
          changed = true;
        }
      }
      if (ripple && rippleEnd !== null) {
        for (const e of t.elements) {
          if (e.startTime >= rippleEnd - 0.001) e.startTime = Math.max(0, e.startTime - rippleLen);
        }
        t.elements.sort((a, b) => a.startTime - b.startTime); // keep lanes ordered after shifts
      }
    }
    if (!changed) return; // playhead outside any clip — no-op, no history
    return scenes;
  }),
  setElementField: (id, patch) => withHistory(set, get, (scenes) => {
    const hit = findEl(scenes, id);
    if (hit) Object.assign(hit.el, patch);
    return scenes;
  }),
  setTransition: (id, patch) => withHistory(set, get, (scenes) => {
    const hit = findEl(scenes, id);
    if (hit) {
      if (!hit.el.transitionOut) hit.el.transitionOut = { type: 'crossfade', presentation: 'Cross Dissolve', duration: 0.5, alignment: 0.5 };
      Object.assign(hit.el.transitionOut, patch);
    }
    return scenes;
  }),
  addTrack: (kind) => withHistory(set, get, (scenes) => {
    const s = get();
    const sc = scenes.find((x) => x.id === s.activeSceneId)!;
    const sameKind = sc.tracks.filter((t) => t.kind === kind);
    const n = sameKind.length + 1;
    const prefix = kind === 'audio' ? 'A' : kind === 'overlay' ? 'T' : 'V';
    const track: TrackJSON = {
      id: `t-${kind}-${Date.now()}`,
      kind,
      name: kind === 'audio' ? `Audio ${n}` : kind === 'overlay' ? `Text ${n}` : `Video ${n}`,
      badge: `${prefix}${n}`,
      muted: false, solo: false, locked: false, visible: true,
      waveform: kind === 'audio' ? true : undefined,
      elements: [],
    };
    // audio below main; overlay above main (spec 05 §12.1)
    const mainIdx = sc.tracks.findIndex((t) => t.kind === 'main');
    const insertAt = kind === 'audio' ? sc.tracks.length : kind === 'overlay' ? Math.max(0, mainIdx) : mainIdx + 1;
    sc.tracks.splice(insertAt, 0, track);
    return scenes;
  }),
  loadSampleProject: () => withHistory(set, get, (scenes) => {
    // spec 18 §4.10 recipe: 30s, 3 video + 1 text + 1 audio + 1 crossfade
    const sc = scenes.find((x) => x.id === get().activeSceneId)!;
    sc.tracks = [
      {
        id: 't-ov-sample', kind: 'overlay', name: 'Text 1', badge: 'T1',
        muted: false, solo: false, locked: false, visible: true,
        elements: [{
          id: 'el-sample-text', type: 'text', trackId: 't-ov-sample', name: 'TITLE CARD',
          startTime: 2, duration: 4, sourceStart: 0,
        }],
      },
      {
        id: 't-mn-sample', kind: 'main', name: 'Video 1', badge: 'V1',
        muted: false, solo: false, locked: false, visible: true,
        elements: [
          { id: 'el-sample-v1', type: 'video', trackId: 't-mn-sample', mediaId: 'm-01', name: 'Coastal dawn', startTime: 0, duration: 10, sourceStart: 0, transitionOut: { type: 'crossfade', presentation: 'Cross Dissolve', duration: 1, alignment: 0.5 } },
          { id: 'el-sample-v2', type: 'video', trackId: 't-mn-sample', mediaId: 'm-02', name: 'Marina interview', startTime: 10, duration: 12, sourceStart: 0 },
          { id: 'el-sample-v3', type: 'video', trackId: 't-mn-sample', mediaId: 'm-04', name: 'Golden hour cliffs', startTime: 22, duration: 8, sourceStart: 0 },
        ],
      },
      {
        id: 't-au-sample', kind: 'audio', name: 'Audio 1', badge: 'A1',
        muted: false, solo: false, locked: false, visible: true, waveform: true,
        elements: [{ id: 'el-sample-a1', type: 'audio', trackId: 't-au-sample', mediaId: 'm-05', name: 'Ambient waves loop', startTime: 0, duration: 30, sourceStart: 0 }],
      },
    ];
    sc.markers = [{ id: 'mk-sample-1', time: 10, label: 'Marker', color: 'blue' }];
    set({ selection: [], playhead: 0 });
    return scenes;
  }),
}));

export function useActiveScene(): SceneJSON {
  return useUi((s) => s.scenes.find((x) => x.id === s.activeSceneId) ?? s.scenes[0]);
}

export function trackHeights(kind: TrackJSON['kind'], clipStyle: 'filmstrip' | 'blocks'): number {
  // spec 05 §12.2 canonical (filmstrip) vs davinci-mock compact (blocks)
  if (clipStyle === 'filmstrip') {
    if (kind === 'main') return 80;
    if (kind === 'audio') return 60;
    return 60; // overlay/text
  }
  if (kind === 'main') return 40;
  if (kind === 'audio') return 34;
  return 28;
}

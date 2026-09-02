/* UI store (Zustand) — spec 18 §6.2: view state only (tool, snap, panels,
   zoom, selection, playhead) + the mock document slice so drag/trim/split
   commits can re-render. In the real shell the doc comes from SceneState
   snapshots + EngineEvents; the mock co-locates it for simplicity. */

import { create } from 'zustand';
import { project, type SceneJSON, type ElementJSON, type TrackJSON, type Marker } from '../lib/mockData';
import { clamp, snapToFrame } from '../lib/timecode';

export type ToolId = 'select' | 'blade' | 'roll' | 'slip' | 'slide';
export type Page = 'edit' | 'color' | 'deliver';
export type InspectorTab = 'video' | 'audio' | 'effects' | 'transition';

const clone = (scenes: SceneJSON[]): SceneJSON[] => scenes.map((s) => ({ ...s, tracks: s.tracks.map((t) => ({ ...t, elements: t.elements.map((e) => ({ ...e })) })), markers: s.markers.map((m) => ({ ...m })) }));

interface UiState {
  page: Page;
  activeSceneId: string;
  tool: ToolId;
  snap: boolean;
  link: boolean;
  lockAll: boolean;
  playhead: number;
  playing: boolean;
  loopEnabled: boolean;
  loop: { start: number; end: number };
  selection: string[];
  pxPerSec: number;
  panels: { mediaPool: boolean; effects: boolean; inspector: boolean };
  mediaView: 'grid' | 'list';
  search: string;
  sortBy: 'name' | 'duration' | 'date' | 'type';
  inspectorTab: InspectorTab;
  masterMuted: boolean;
  masterVolume: number;
  mediaW: number;
  inspectorW: number;
  mainBodyH: number;
  cheatOpen: boolean;
  scenes: SceneJSON[];

  // actions
  setPage: (p: Page) => void;
  setActiveScene: (id: string) => void;
  setTool: (t: ToolId) => void;
  toggleSnap: () => void;
  toggleLink: () => void;
  toggleLockAll: () => void;
  setPlayhead: (t: number) => void;
  nudgePlayhead: (frames: number) => void;
  togglePlay: () => void;
  setPlaying: (p: boolean) => void;
  setLoopEnabled: (v: boolean) => void;
  markIn: () => void;
  markOut: () => void;
  addMarker: (time: number) => void;
  setSelection: (ids: string[]) => void;
  selectElement: (id: string, additive: boolean) => void;
  setZoom: (px: number) => void;
  zoomStep: (factor: number) => void;
  zoomFit: (containerW: number, duration: number) => void;
  togglePanel: (p: keyof UiState['panels']) => void;
  setMediaView: (v: 'grid' | 'list') => void;
  setSearch: (s: string) => void;
  setSortBy: (s: UiState['sortBy']) => void;
  setInspectorTab: (t: InspectorTab) => void;
  toggleMasterMute: () => void;
  setMasterVolume: (v: number) => void;
  setMediaW: (w: number) => void;
  setInspectorW: (w: number) => void;
  setMainBodyH: (h: number) => void;
  setCheatOpen: (v: boolean) => void;
  moveElement: (id: string, startTime: number) => void;
  trimElement: (id: string, edge: 'l' | 'r', newStart: number, newDur: number) => void;
  splitElement: (id: string, time: number) => void;
  toggleEffect: (elementId: string, fxId: string) => void;
}

const MIN_PPS = 8;
const MAX_PPS = 240;

export const useUi = create<UiState>((set, get) => ({
  page: 'edit',
  activeSceneId: 'sc-1',
  tool: 'select',
  snap: true,
  link: true,
  lockAll: false,
  playhead: 16,
  playing: false,
  loopEnabled: false,
  loop: { ...project.loop },
  selection: ['el-2'],
  pxPerSec: 46,
  panels: { mediaPool: true, effects: false, inspector: true },
  mediaView: 'grid',
  search: '',
  sortBy: 'name',
  inspectorTab: 'video',
  masterMuted: false,
  masterVolume: 0.78,
  mediaW: 280,
  inspectorW: 340,
  mainBodyH: 0, // 0 = auto (40% of viewport per spec 18 §3.2)
  cheatOpen: false,
  scenes: clone(project.scenes),

  setPage: (p) => set({ page: p }),
  setActiveScene: (id) => set((s) => ({ activeSceneId: id, selection: [] })),
  setTool: (t) => set({ tool: t }),
  toggleSnap: () => set((s) => ({ snap: !s.snap })),
  toggleLink: () => set((s) => ({ link: !s.link })),
  toggleLockAll: () => set((s) => ({ lockAll: !s.lockAll })),
  setPlayhead: (t) => set({ playhead: clamp(t, 0, 600) }),
  nudgePlayhead: (frames) => set((s) => ({ playhead: clamp(s.playhead + frames / 24, 0, 600) })),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  setPlaying: (p) => set({ playing: p }),
  setLoopEnabled: (v) => set({ loopEnabled: v }),
  markIn: () => set((s) => ({ loop: { ...s.loop, start: snapToFrame(s.playhead) } })),
  markOut: () => set((s) => ({ loop: { ...s.loop, end: snapToFrame(s.playhead) } })),
  addMarker: (time) => set((s) => {
    const scenes = clone(s.scenes);
    const sc = scenes.find((x) => x.id === s.activeSceneId)!;
    const colors: Marker['color'][] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'];
    sc.markers.push({ id: `mk-${Date.now()}`, time: snapToFrame(time), label: 'Marker', color: colors[sc.markers.length % 8] });
    return { scenes };
  }),
  setSelection: (ids) => set({ selection: ids }),
  selectElement: (id, additive) => set((s) => {
    if (!additive) return { selection: [id] };
    const has = s.selection.includes(id);
    return { selection: has ? s.selection.filter((x) => x !== id) : [...s.selection, id] };
  }),
  setZoom: (px) => set({ pxPerSec: clamp(px, MIN_PPS, MAX_PPS) }),
  zoomStep: (factor) => set((s) => ({ pxPerSec: clamp(s.pxPerSec * factor, MIN_PPS, MAX_PPS) })),
  zoomFit: (containerW, duration) => set({ pxPerSec: clamp((containerW - 24) / (duration + 2), MIN_PPS, MAX_PPS) }),
  togglePanel: (p) => set((s) => ({ panels: { ...s.panels, [p]: !s.panels[p] } })),
  setMediaView: (v) => set({ mediaView: v }),
  setSearch: (s) => set({ search: s }),
  setSortBy: (sortBy) => set({ sortBy }),
  setInspectorTab: (t) => set({ inspectorTab: t }),
  toggleMasterMute: () => set((s) => ({ masterMuted: !s.masterMuted })),
  setMasterVolume: (v) => set({ masterVolume: v }),
  setMediaW: (w) => set({ mediaW: clamp(w, 200, 480) }),
  setInspectorW: (w) => set({ inspectorW: clamp(w, 280, 560) }),
  setMainBodyH: (h) => set({ mainBodyH: clamp(h, 320, 900) }),
  setCheatOpen: (v) => set({ cheatOpen: v }),

  // ---- document mutations (mock-level; real shell = EngineCommand) ----
  moveElement: (id, startTime) => set((s) => {
    const scenes = clone(s.scenes);
    for (const sc of scenes) for (const t of sc.tracks) {
      const el = t.elements.find((e) => e.id === id);
      if (el) el.startTime = snapToFrame(Math.max(0, startTime));
    }
    return { scenes };
  }),
  trimElement: (id, edge, newStart, newDur) => set((s) => {
    const scenes = clone(s.scenes);
    for (const sc of scenes) for (const t of sc.tracks) {
      const el = t.elements.find((e) => e.id === id);
      if (el) {
        el.startTime = snapToFrame(Math.max(0, newStart));
        el.duration = snapToFrame(Math.max(0.25, newDur));
        if (el.sourceStart !== undefined && edge === 'l') el.sourceStart = Math.max(0, el.sourceStart + (newStart - el.startTime));
      }
    }
    return { scenes };
  }),
  splitElement: (id, time) => set((s) => {
    const scenes = clone(s.scenes);
    for (const sc of scenes) for (const t of sc.tracks) {
      const idx = t.elements.findIndex((e) => e.id === id);
      if (idx === -1) continue;
      const el = t.elements[idx];
      const cut = snapToFrame(time);
      const offset = cut - el.startTime;
      if (offset <= 0.1 || offset >= el.duration - 0.1) return {};
      const left: ElementJSON = { ...el, duration: offset };
      const right: ElementJSON = { ...el, id: `${el.id}-b${t.elements.length}`, startTime: cut, duration: el.duration - offset };
      if (right.sourceStart !== undefined) right.sourceStart = el.sourceStart! + offset;
      delete left.transitionOut;
      t.elements.splice(idx, 1, left, right);
    }
    return { scenes };
  }),
  toggleEffect: (elementId, fxId) => set((s) => {
    const scenes = clone(s.scenes);
    for (const sc of scenes) for (const t of sc.tracks) {
      const el = t.elements.find((e) => e.id === elementId);
      if (el?.effects) {
        const fx = el.effects.find((f) => f.id === fxId);
        if (fx) fx.enabled = !fx.enabled;
      }
    }
    return { scenes };
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

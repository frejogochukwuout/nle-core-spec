/* Mock project data — field names follow spec 09 §3.1 (ProjectJSON /
   MediaRecord / ElementJSON / TrackJSON) so the mockup exercises the real
   model shape. Values = the sample "30-second demo project" (spec 18 §4.10).
   Times are frame-clean at 24 fps. */

export type MediaType = 'video' | 'audio' | 'image';
export type ElementType = 'video' | 'audio' | 'text' | 'image';
export type TrackKind = 'overlay' | 'main' | 'audio';

export interface MediaRecord {
  id: string;
  name: string;
  type: MediaType;
  size: string;
  duration: number | null; // seconds
  width?: number;
  height?: number;
  fps?: number;
  importedAt: string; // ISO date
  thumbnail: string; // path under /mockup/media/
  offline?: boolean;  // spec 18 §4.2 missing-asset state
}

export const TRANSITION_PRESENTATIONS = [
  'Cross Dissolve', 'Dip to Black', 'Dip to White', 'Fade In', 'Fade Out',
  'Wipe Left', 'Wipe Right', 'Wipe Up', 'Wipe Down',
  'Push Left', 'Push Right', 'Push Up', 'Push Down',
  'Slide Left', 'Slide Right', 'Slide Up', 'Slide Down',
  'Zoom In', 'Zoom Out', 'Spin Blur', 'Center Wipe',
  'Blinds', 'Checkerboard', 'Circle Wipe', 'Diamond Wipe',
  'Iris Open', 'Iris Close',
] as const;
export type TransitionPresentation = (typeof TRANSITION_PRESENTATIONS)[number];

export interface TransitionJSON {
  type: 'crossfade';
  presentation: TransitionPresentation;
  duration: number; // seconds
  alignment: number; // 0..1, cut-centered at 0.5
}

export interface EffectJSON {
  id: string;
  name: string;
  enabled: boolean;
  params?: Record<string, number>;
}

export interface ElementJSON {
  id: string;
  type: ElementType;
  trackId: string;
  name: string;
  startTime: number;
  duration: number;
  sourceStart?: number;
  sourceDuration?: number;
  mediaId?: string;
  speed?: number;
  volume?: number;
  opacity?: number;
  audioFadeIn?: number;
  audioFadeOut?: number;
  effects?: EffectJSON[];
  transitionOut?: TransitionJSON;
  linkedTo?: string; // A/V link (spec 05 §12.3)
}

export interface TrackJSON {
  id: string;
  kind: TrackKind;
  name: string;       // "V1" | "Text 1" | "A1" ...
  badge: string;      // short badge: V1 / T1 / A1
  muted: boolean;
  solo: boolean;
  locked: boolean;
  visible: boolean;
  waveform?: boolean;  // mock-level view pref (real home: UI store per spec 18 §4.7)
  elements: ElementJSON[];
}

export interface Marker {
  id: string;
  time: number;
  label: string;
  color: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'gray';
}

export interface SceneJSON {
  id: string;
  name: string;
  dirty: boolean;
  tracks: TrackJSON[];
  markers: Marker[];
}

export const EFFECT_DEFS: { name: string; params: { key: string; label: string; min: number; max: number; step: number; unit?: string }[] }[] = [
  { name: 'Gaussian Blur', params: [{ key: 'radius', label: 'Radius', min: 0, max: 100, step: 1, unit: 'px' }] },
  { name: 'Motion Blur', params: [{ key: 'length', label: 'Length', min: 0, max: 100, step: 1, unit: 'px' }, { key: 'angle', label: 'Angle', min: 0, max: 360, step: 1, unit: '°' }] },
  { name: 'Vignette', params: [{ key: 'amount', label: 'Amount', min: 0, max: 100, step: 1, unit: '%' }, { key: 'feather', label: 'Feather', min: 0, max: 100, step: 1, unit: '%' }] },
  { name: 'Glow', params: [{ key: 'intensity', label: 'Intensity', min: 0, max: 100, step: 1, unit: '%' }, { key: 'radius', label: 'Radius', min: 0, max: 100, step: 1, unit: 'px' }] },
  { name: 'Chromatic Aberration', params: [{ key: 'offset', label: 'Offset', min: 0, max: 50, step: 0.5, unit: 'px' }] },
];

export interface Project {
  metadata: { name: string; status: string };
  settings: { fps: number; width: number; height: number; sampleRate: number; channels: number };
  scenes: SceneJSON[];
  media: MediaRecord[];
  loop: { start: number; end: number }; // setLoop state (spec 16 §3.4 note)
}

const IMG = (n: string) => `${import.meta.env.BASE_URL}media/${n}.jpg`;

export const media: MediaRecord[] = [
  { id: 'm-01', name: 'A012_C034_beach_wide.mp4', type: 'video', size: '1.8 GB', duration: 62.4, width: 3840, height: 2160, fps: 24, importedAt: '2026-08-28', thumbnail: IMG('beach_wide') },
  { id: 'm-02', name: 'interview_marina.mp4', type: 'video', size: '412 MB', duration: 95.2, width: 1920, height: 1080, fps: 24, importedAt: '2026-08-28', thumbnail: IMG('interview_marina') },
  { id: 'm-03', name: 'drone_launch.mp4', type: 'video', size: '1.2 GB', duration: 18.6, width: 3840, height: 2160, fps: 24, importedAt: '2026-08-29', thumbnail: IMG('drone_launch') },
  { id: 'm-04', name: 'waves_closeup.mp4', type: 'video', size: '268 MB', duration: 24.0, width: 1920, height: 1080, fps: 24, importedAt: '2026-08-29', thumbnail: IMG('waves_closeup'), offline: true },
  { id: 'm-05', name: 'sunset_timelapse.mp4', type: 'video', size: '940 MB', duration: 12.8, width: 3840, height: 2160, fps: 30, importedAt: '2026-08-30', thumbnail: IMG('sunset_timelapse') },
  { id: 'm-06', name: 'ocean_ambience.wav', type: 'audio', size: '116 MB', duration: 120.0, importedAt: '2026-08-28', thumbnail: '' },
  { id: 'm-07', name: 'interview_marina.wav', type: 'audio', size: '92 MB', duration: 95.2, importedAt: '2026-08-28', thumbnail: '' },
  { id: 'm-08', name: 'title_card.png', type: 'image', size: '2.1 MB', duration: null, width: 1920, height: 1080, importedAt: '2026-08-30', thumbnail: IMG('title_card') },
];

/* ---------- Scene 1: "Rough Cut v3" — the sample 30s timeline ---------- */

const scene1: SceneJSON = {
  id: 'sc-1',
  name: 'Rough Cut v3',
  dirty: true,
  tracks: [
    {
      id: 'tr-overlay-1', kind: 'overlay', name: 'Text 1', badge: 'T1',
      muted: false, solo: false, locked: false, visible: true,
      elements: [
        { id: 'el-5', type: 'text', trackId: 'tr-overlay-1', name: 'MARINA — FISHERWOMAN', startTime: 8.75, duration: 3.25, opacity: 1 },
      ],
    },
    {
      id: 'tr-main', kind: 'main', name: 'V1', badge: 'V1',
      muted: false, solo: false, locked: false, visible: true,
      elements: [
        {
          id: 'el-1', type: 'video', trackId: 'tr-main', name: 'A012_C034_beach_wide', startTime: 0, duration: 8.5,
          sourceStart: 12.0, sourceDuration: 8.5, mediaId: 'm-01', speed: 1, opacity: 1,
          effects: [{ id: 'fx-1', name: 'Gaussian Blur', enabled: false }],
        },
        {
          id: 'el-2', type: 'video', trackId: 'tr-main', name: 'Marina interview', startTime: 8.5, duration: 8.5,
          sourceStart: 3.0, sourceDuration: 8.5, mediaId: 'm-02', speed: 1, opacity: 1,
          transitionOut: { type: 'crossfade', presentation: 'Cross Dissolve', duration: 0.75, alignment: 0.5 },
          linkedTo: 'el-7',
        },
        {
          id: 'el-3', type: 'video', trackId: 'tr-main', name: 'drone_launch', startTime: 17.0, duration: 7.0,
          sourceStart: 0, sourceDuration: 7.0, mediaId: 'm-03', speed: 1, opacity: 1,
        },
        {
          id: 'el-4', type: 'video', trackId: 'tr-main', name: 'sunset_timelapse', startTime: 24.0, duration: 6.0,
          sourceStart: 0, sourceDuration: 6.0, mediaId: 'm-05', speed: 1, opacity: 0.9,
        },
      ],
    },
    {
      id: 'tr-audio-1', kind: 'audio', name: 'A1', badge: 'A1',
      muted: false, solo: false, locked: false, visible: true,
      elements: [
        {
          id: 'el-6', type: 'audio', trackId: 'tr-audio-1', name: 'ocean_ambience', startTime: 0, duration: 30,
          sourceStart: 0, mediaId: 'm-06', volume: 0.35, audioFadeIn: 1.0, audioFadeOut: 2.0,
        },
      ],
    },
    {
      id: 'tr-audio-2', kind: 'audio', name: 'A2', badge: 'A2',
      muted: false, solo: false, locked: true, visible: true,
      elements: [
        {
          id: 'el-7', type: 'audio', trackId: 'tr-audio-2', name: 'interview_marina', startTime: 8.5, duration: 8.5,
          sourceStart: 3.0, mediaId: 'm-07', volume: 0.8, linkedTo: 'el-2',
        },
      ],
    },
  ],
  markers: [
    { id: 'mk-1', time: 0, label: 'Hook', color: 'red' },
    { id: 'mk-2', time: 8.5, label: 'Interview', color: 'blue' },
    { id: 'mk-3', time: 15.5, label: 'Pull quote', color: 'yellow' },
    { id: 'mk-4', time: 24.0, label: 'Sunset', color: 'orange' },
  ],
};

/* ---------- Scene 2: "Interview selects" — lighter secondary scene ---------- */

const scene2: SceneJSON = {
  id: 'sc-2',
  name: 'Interview selects',
  dirty: false,
  tracks: [
    {
      id: 'sc2-main', kind: 'main', name: 'V1', badge: 'V1',
      muted: false, solo: false, locked: false, visible: true,
      elements: [
        { id: 's2-1', type: 'video', trackId: 'sc2-main', name: 'interview_marina (take 1)', startTime: 0, duration: 6.25, sourceStart: 20.0, mediaId: 'm-02', speed: 1, opacity: 1 },
        { id: 's2-2', type: 'video', trackId: 'sc2-main', name: 'interview_marina (take 4)', startTime: 6.5, duration: 7.75, sourceStart: 44.0, mediaId: 'm-02', speed: 1, opacity: 1 },
        { id: 's2-3', type: 'video', trackId: 'sc2-main', name: 'interview_marina (take 7)', startTime: 14.5, duration: 5.0, sourceStart: 71.0, mediaId: 'm-02', speed: 1, opacity: 1 },
      ],
    },
    {
      id: 'sc2-audio-1', kind: 'audio', name: 'A1', badge: 'A1',
      muted: false, solo: false, locked: false, visible: true,
      elements: [
        { id: 's2-4', type: 'audio', trackId: 'sc2-audio-1', name: 'interview_marina', startTime: 0, duration: 6.25, sourceStart: 20.0, mediaId: 'm-07', volume: 1 },
        { id: 's2-5', type: 'audio', trackId: 'sc2-audio-1', name: 'interview_marina', startTime: 6.5, duration: 7.75, sourceStart: 44.0, mediaId: 'm-07', volume: 1 },
        { id: 's2-6', type: 'audio', trackId: 'sc2-audio-1', name: 'interview_marina', startTime: 14.5, duration: 5.0, sourceStart: 71.0, mediaId: 'm-07', volume: 1 },
      ],
    },
  ],
  markers: [
    { id: 's2-mk-1', time: 6.5, label: 'Best take', color: 'green' },
  ],
};

export const project: Project = {
  metadata: { name: 'Beach Doc — Rough Cut', status: 'Edited' },
  settings: { fps: 24, width: 1920, height: 1080, sampleRate: 48000, channels: 2 },
  scenes: [scene1, scene2],
  media,
  loop: { start: 2.0, end: 28.0 },
};

export function sceneDuration(s: SceneJSON): number {
  let end = 0;
  for (const t of s.tracks) for (const e of t.elements) end = Math.max(end, e.startTime + e.duration);
  return end;
}

export function findElement(scenes: SceneJSON[], id: string): { scene: SceneJSON; track: TrackJSON; element: ElementJSON } | null {
  for (const s of scenes) {
    for (const t of s.tracks) {
      const el = t.elements.find((e) => e.id === id);
      if (el) return { scene: s, track: t, element: el };
    }
  }
  return null;
}

export function mediaById(id: string | undefined): MediaRecord | undefined {
  return media.find((m) => m.id === id);
}

/** element under the playhead on the main/overlay tracks (viewer source).
 *  Multi-track law (R14 review): iterate ALL tracks of each kind — the
 *  single-`find` version made clips on a second Video/Text/Audio track
 *  (addTrack creates them) invisible to the viewer. Topmost track wins:
 *  later tracks render above earlier ones, so the scan runs in reverse. */
export function elementAtTime(scene: SceneJSON, time: number): ElementJSON | null {
  const order: TrackKind[] = ['overlay', 'main'];
  for (const kind of order) {
    const kindTracks = scene.tracks.filter((tr) => tr.kind === kind);
    for (let i = kindTracks.length - 1; i >= 0; i--) {
      const hit = kindTracks[i].elements.find((e) => time >= e.startTime && time < e.startTime + e.duration);
      if (hit) return hit;
    }
  }
  return null;
}

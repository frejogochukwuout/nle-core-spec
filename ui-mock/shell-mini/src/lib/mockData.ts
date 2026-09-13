/* Mock project data — spec-09-shaped subset (DESIGN D5).
   Grid invariant: every doc time (media durations, clip starts/durations)
   is an exact multiple of 0.5 (binary-exact — tests use strict equality).
   The seed is deterministic (D5): V1 3 clips spanning 12.5s, A1 1 clip. */

export type MediaKind = 'video' | 'audio' | 'image';
export type TrackKind = 'video' | 'audio';

export interface Media {
  id: string;
  name: string;
  kind: MediaKind;
  duration: number; // seconds, grid-clean multiple of 0.5
  hue: number; // degrees → CSS gradient thumb / filmstrip tint
}

export interface Track {
  id: string;
  kind: TrackKind;
  label: string; // "V1" | "A1"
  /** R20 (thread #29 — wave 8): per-track edit-state MUTE flag. Unmuted by
   *  default (optional so every existing Track literal stays valid). The
   *  mini has no audio engine — this is the SAVED edit state + the visual
   *  law (the lane dims, the head carries an M chip); audible rendering is
   *  the nle-engine audio seam's job at swap time. */
  muted?: boolean;
  /** R24-miniplus (DESIGN-R24 D8): per-track SOLO flag — solo-in-place
   *  law: effectiveMute = muted || (anySolo && !solo). Doc state (one
   *  history entry per toggle), optional like muted. */
  solo?: boolean;
}

/* ---------- R24-miniplus: the effect/transition model (D2) ---------- */

/** EffectJSON (the spec-15 wire shape, ported from the variants): a clip's
 *  effect stack entry. Data-only in the mini — no renderer; the Inspector
 *  edits params, the doc carries them (the honest-mock subset). */
export interface EffectJSON {
  id: string;
  name: string;
  enabled: boolean;
  params?: Record<string, number>;
}

export interface EffectDef {
  id: string;
  name: string;
  /** param specs: min/max/step/default (the NumberField + slider laws) */
  params: { key: string; label: string; min: number; max: number; step: number; default: number }[];
}

/** The 5-def honest-mock registry (the variants' EFFECT_DEFS, verbatim in
 *  shape): Gaussian/Motion Blur, Vignette, Glow, Chromatic Aberration. */
export const EFFECT_DEFS: EffectDef[] = [
  {
    id: 'fx-blur',
    name: 'Gaussian Blur',
    params: [{ key: 'radius', label: 'Radius', min: 0, max: 100, step: 1, default: 4 }],
  },
  {
    id: 'fx-motion-blur',
    name: 'Motion Blur',
    params: [
      { key: 'length', label: 'Length', min: 0, max: 100, step: 1, default: 12 },
      { key: 'angle', label: 'Angle', min: 0, max: 360, step: 1, default: 0 },
    ],
  },
  {
    id: 'fx-vignette',
    name: 'Vignette',
    params: [
      { key: 'amount', label: 'Amount', min: 0, max: 100, step: 1, default: 25 },
      { key: 'feather', label: 'Feather', min: 0, max: 100, step: 1, default: 50 },
    ],
  },
  {
    id: 'fx-glow',
    name: 'Glow',
    params: [
      { key: 'intensity', label: 'Intensity', min: 0, max: 100, step: 1, default: 30 },
      { key: 'radius', label: 'Radius', min: 0, max: 100, step: 1, default: 10 },
    ],
  },
  {
    id: 'fx-chromatic',
    name: 'Chromatic Aberration',
    params: [{ key: 'offset', label: 'Offset', min: 0, max: 50, step: 0.5, default: 2 }],
  },
];

/** The clip's effect id mint (deterministic, like mintClipId). */
let fxSeq = 0;
export function mintEffectId(): string {
  fxSeq += 1;
  return `fx_${fxSeq}`;
}
/** Test hook: reset the effect id sequence. */
export function __resetEffectIds(): void {
  fxSeq = 0;
}

export type TransitionPresentation =
  | 'Cross Dissolve'
  | 'Dip to Black'
  | 'Dip to White'
  | 'Wipe Left'
  | 'Wipe Right'
  | 'Wipe Up'
  | 'Wipe Down'
  | 'Slide Push';

/** The 8-presentation mini registry (DESIGN-R24 D2/F19b: the variants' 27
 *  trimmed; fade in/out at clip edges are the Clip.fadeIn/fadeOut FIELDS,
 *  not presentations — this list carries no fade names). */
export const TRANSITION_PRESENTATIONS: TransitionPresentation[] = [
  'Cross Dissolve',
  'Dip to Black',
  'Dip to White',
  'Wipe Left',
  'Wipe Right',
  'Wipe Up',
  'Wipe Down',
  'Slide Push',
];

/** TransitionJSON (the spec-07 §6.1A two-tier shape, ported): carried as
 *  `transitionOut` on the LEFT clip of a seam (the single outgoing
 *  transition per element — no between-clip pair object). */
export interface TransitionJSON {
  type: 'crossfade';
  presentation: TransitionPresentation;
  /** seconds, 0.5-grid, <= min(left.duration, right.duration) - MIN */
  duration: number;
  /** 0..1 — the cut position within the transition (0.5 = centered) */
  alignment: number;
}

/** The spec-09 default a mint lands with (the variants' setTransition
 *  default, grid-adapted). */
export function defaultTransition(): TransitionJSON {
  return { type: 'crossfade', presentation: 'Cross Dissolve', duration: 0.5, alignment: 0.5 };
}

export interface Clip {
  id: string;
  trackId: string;
  mediaId: string;
  start: number; // seconds, grid-clean
  duration: number; // seconds, grid-clean, >= 0.5, <= media duration
  /* ---------- R24-miniplus (DESIGN-R24 D2 — all optional, absent = the
   * legacy semantic; the legacy seeds stay byte-identical) ---------- */
  /** in-point into the media window (absent = 0 — the R23 full-window
   *  law). Not a placement fact: not grid-bound. */
  sourceStart?: number;
  /** recorded rate (absent = 1). Approximate: duration is grid-quantized
   *  (README deviation #1); the recorded rate is the window/duration ratio. */
  speed?: number;
  /** LINEAR gain [0, 2] (absent = 1 — unity). The spec-15 ClipJSON
   *  vocabulary; the UI maps dB (the ONE map: lib/audioDb.ts, −18..+6). */
  volume?: number;
  /** 0..1 (absent = 1). */
  opacity?: number;
  /** seconds, 0.5-grid, clamped to duration. */
  fadeIn?: number;
  fadeOut?: number;
  /** the effect stack (D4). */
  effects?: EffectJSON[];
  /** the outgoing seam transition (D5) — the LEFT clip of the pair. */
  transitionOut?: TransitionJSON;
}

/** R24-miniplus (D2, the F1 P0 fix): the ONE deep-clone law for Clip —
 *  nested effects/transitionOut MUST be cloned (a shallow {...c} shares
 *  references: a nested mutation would write through into the live doc
 *  AND every history entry — undo corruption). Every copy site uses this. */
export function cloneClip(c: Clip): Clip {
  return {
    ...c,
    effects: c.effects?.map((e) => ({ ...e, params: e.params ? { ...e.params } : undefined })),
    transitionOut: c.transitionOut ? { ...c.transitionOut } : undefined,
  };
}

export interface Doc {
  tracks: Track[];
  media: Media[];
  clips: Clip[];
}

export const TRACK_VIDEO = 'V1';
export const TRACK_AUDIO = 'A1';

export const SEED_MEDIA: Media[] = [
  { id: 'm-drone', name: 'drone_launch.mp4', kind: 'video', duration: 4.5, hue: 210 },
  { id: 'm-beach', name: 'beach_wide.mp4', kind: 'video', duration: 4.5, hue: 32 },
  { id: 'm-title', name: 'title_card.png', kind: 'image', duration: 3.5, hue: 268 },
  { id: 'm-interview', name: 'interview_audio.wav', kind: 'audio', duration: 7, hue: 145 },
  // R18e (feedback #13): the pool needs enough assets to genuinely overflow
  // and prove its scrollbar — four more mock assets, still grid-clean.
  { id: 'm-gopro', name: 'gopro_shore.mp4', kind: 'video', duration: 5.5, hue: 195 },
  { id: 'm-sunset', name: 'sunset_lapse.mp4', kind: 'video', duration: 4, hue: 18 },
  { id: 'm-lower', name: 'lower_third.png', kind: 'image', duration: 2.5, hue: 240 },
  { id: 'm-ambience', name: 'shore_ambience.wav', kind: 'audio', duration: 6, hue: 120 },
];

export const SEED_TRACKS: Track[] = [
  { id: TRACK_VIDEO, kind: 'video', label: 'V1' },
  { id: TRACK_AUDIO, kind: 'audio', label: 'A1' },
];

/** Deterministic seed doc (D5, v2 amendment): V1 three clips with 0.5s
 *  gaps (0→3.5, 4.5→8, 9→12.5) so move-drag has real slack — the audit's
 *  back-to-back variant made every V1 move degenerate (caught while
 *  writing the drag tests). A1: 1.5→8.5. contentEnd = 12.5s. */
export function seedDoc(): Doc {
  return {
    tracks: SEED_TRACKS.map((t) => ({ ...t })),
    media: SEED_MEDIA.map((m) => ({ ...m })),
    clips: [
      { id: 'c1', trackId: TRACK_VIDEO, mediaId: 'm-drone', start: 0, duration: 3.5 },
      { id: 'c2', trackId: TRACK_VIDEO, mediaId: 'm-beach', start: 4.5, duration: 3.5 },
      { id: 'c3', trackId: TRACK_VIDEO, mediaId: 'm-title', start: 9, duration: 3.5 },
      { id: 'c4', trackId: TRACK_AUDIO, mediaId: 'm-interview', start: 1.5, duration: 7 },
    ],
  };
}

/** The lane a media kind appends to (D3.2: audio→A1, video/image→V1). */
export function laneForMedia(kind: MediaKind): TrackKind {
  return kind === 'audio' ? 'audio' : 'video';
}

/** R18k (threads #21/#3): a project with MORE than the basic V1/A1 pair —
 *  the mini binds to ONE video + ONE audio track (the track-selector
 *  dropdowns demo against this doc). Deterministic, grid-clean, same
 *  media pool. V2 carries the GoPro b-roll, A2 the ambience bed, so
 *  binding V2/A2 visibly swaps the lane content. */
export function multiTrackDoc(): Doc {
  return {
    tracks: [
      { id: TRACK_VIDEO, kind: 'video', label: 'V1' },
      { id: 'V2', kind: 'video', label: 'V2' },
      { id: TRACK_AUDIO, kind: 'audio', label: 'A1' },
      { id: 'A2', kind: 'audio', label: 'A2' },
    ],
    media: SEED_MEDIA.map((m) => ({ ...m })),
    clips: [
      { id: 'c1', trackId: TRACK_VIDEO, mediaId: 'm-drone', start: 0, duration: 3.5 },
      { id: 'c2', trackId: TRACK_VIDEO, mediaId: 'm-beach', start: 4.5, duration: 3.5 },
      { id: 'c3', trackId: TRACK_VIDEO, mediaId: 'm-title', start: 9, duration: 3.5 },
      { id: 'c4', trackId: TRACK_AUDIO, mediaId: 'm-interview', start: 1.5, duration: 7 },
      // V2: b-roll under the interview stretch
      { id: 'c5', trackId: 'V2', mediaId: 'm-gopro', start: 1, duration: 5.5 },
      { id: 'c6', trackId: 'V2', mediaId: 'm-sunset', start: 8, duration: 4 },
      // A2: ambience bed
      { id: 'c7', trackId: 'A2', mediaId: 'm-ambience', start: 0.5, duration: 6 },
    ],
  };
}

/** Deterministic clip-id minting (no Date.now — deterministic testids;
 *  the per-module counter alone is collision-safe). */
let clipSeq = 0;
export function mintClipId(): string {
  clipSeq += 1;
  return `clip_${clipSeq}`;
}

/** Test hook: reset the id sequence so suites stay deterministic. */
export function __resetClipIds(): void {
  clipSeq = 0;
}


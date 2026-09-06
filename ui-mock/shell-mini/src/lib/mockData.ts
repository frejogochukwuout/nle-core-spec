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
}

export interface Clip {
  id: string;
  trackId: string;
  mediaId: string;
  start: number; // seconds, grid-clean
  duration: number; // seconds, grid-clean, >= 0.5, <= media duration
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


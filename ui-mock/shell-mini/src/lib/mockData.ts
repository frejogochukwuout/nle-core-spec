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

/** Deterministic clip-id minting (no Math.random — story/test friendly). */
let clipSeq = 0;
export function mintClipId(): string {
  clipSeq += 1;
  return `clip_${Date.now().toString(36)}_${clipSeq}`;
}

/** Test hook: reset the id sequence so suites stay deterministic. */
export function __resetClipIds(): void {
  clipSeq = 0;
}

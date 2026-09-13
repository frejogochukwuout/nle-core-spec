/* exportJson — R25-W5 item 2 (DESIGN-R25 §1 R19 / §3 W5; thread th_mtzp4xeb
   "add a custom JSON format too"): the Custom JSON export preset's PURE half.
   The reviewer asked the deliver preset list to grow a project-interchange
   JSON format; unlike the render presets (whose queue is an honest mock — no
   encode ever runs), a JSON export is data the mock ACTUALLY has, so the
   export is REAL: build the doc from the live store state and download it.

   Split (the testable-seam law):
   - `buildExportJson(state, sceneId)` — PURE: an explicit, deterministic
     construction of the interchange document (project metadata + the active
     scene's tracks/elements in the ElementJSON shape). Key order is the
     construction order — every object is built field-by-field with
     conditional spreads for the optional ElementJSON fields, so two calls on
     the same state serialize IDENTICALLY (the interchange schema is stable,
     not key-order-roulette). This half carries the structure pins.
   - `downloadJson(doc, filename)` — the thin DOM wrapper (Blob +
     URL.createObjectURL + a synthesized anchor click + revoke). Raw jsdom
     has no URL.createObjectURL, so the wrapper GUARDS on the API and
     no-ops when it is absent; the wrapper's own contract (blob type,
     anchor download name, click, revoke) is pinned in exportJson.test
     against stubbed URL/anchor seams.

   Schema "nle-interchange/1" — the mock's own interchange dialect: the
   summary's "Schema" row and the downloaded file agree on this string. */

import { project, sceneDuration, type ElementJSON, type SceneJSON, type TrackJSON, type Marker, type ClipMarker, type EffectJSON } from './mockData';

/** The doc half of the export state — exactly what the store owns that the
 *  export reads (the scenes + the loop range). DeliverPage passes its live
 *  `useUi` slice; the fallback resolver mirrors the page's (`?? scenes[0]`). */
export interface ExportJsonState {
  scenes: SceneJSON[];
  loop: { start: number; end: number };
}

/* ---- the interchange document (types mirror the construction order) ---- */

export interface ExportJsonProject {
  name: string;
  status: string;
  fps: number;
  width: number;
  height: number;
  sampleRate: number;
  channels: number;
}

export interface ExportJsonTrack {
  id: string;
  kind: TrackJSON['kind'];
  name: string;
  badge: string;
  muted: boolean;
  solo: boolean;
  locked: boolean;
  visible: boolean;
  language?: string;
  elements: ExportJsonElement[];
}

/** The interchange element — the ElementJSON fields in the documented order.
 *  `waveform` (a view pref) is DELIBERATELY absent: view state never enters
 *  the export (the house law). */
export interface ExportJsonElement {
  id: string;
  type: ElementJSON['type'];
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
  pan?: number;
  pitchSemitones?: number;
  pitchCents?: number;
  eq?: [number, number, number, number];
  text?: string;
  markers?: ClipMarker[];
  audioFadeIn?: number;
  audioFadeOut?: number;
  fadeIn?: number;
  fadeOut?: number;
  effects?: EffectJSON[];
  transitionOut?: { type: string; presentation: string; duration: number; alignment: number };
  linkedTo?: string;
}

export interface ExportJsonTimeline {
  id: string;
  name: string;
  duration: number;
  range: { start: number; end: number };
  markers: Marker[];
  tracks: ExportJsonTrack[];
}

export interface ExportJsonDoc {
  schema: 'nle-interchange/1';
  project: ExportJsonProject;
  timeline: ExportJsonTimeline;
}

/* ---- explicit per-entity constructors (the deterministic key order) ---- */

const toInterchangeProject = (): ExportJsonProject => ({
  name: project.metadata.name,
  status: project.metadata.status,
  fps: project.settings.fps,
  width: project.settings.width,
  height: project.settings.height,
  sampleRate: project.settings.sampleRate,
  channels: project.settings.channels,
});

const toInterchangeElement = (e: ElementJSON): ExportJsonElement => ({
  id: e.id,
  type: e.type,
  trackId: e.trackId,
  name: e.name,
  startTime: e.startTime,
  duration: e.duration,
  ...(e.sourceStart !== undefined ? { sourceStart: e.sourceStart } : {}),
  ...(e.sourceDuration !== undefined ? { sourceDuration: e.sourceDuration } : {}),
  ...(e.mediaId !== undefined ? { mediaId: e.mediaId } : {}),
  ...(e.speed !== undefined ? { speed: e.speed } : {}),
  ...(e.volume !== undefined ? { volume: e.volume } : {}),
  ...(e.opacity !== undefined ? { opacity: e.opacity } : {}),
  ...(e.pan !== undefined ? { pan: e.pan } : {}),
  ...(e.pitchSemitones !== undefined ? { pitchSemitones: e.pitchSemitones } : {}),
  ...(e.pitchCents !== undefined ? { pitchCents: e.pitchCents } : {}),
  ...(e.eq !== undefined ? { eq: [...e.eq] } : {}),
  ...(e.text !== undefined ? { text: e.text } : {}),
  /* clip markers ride the element (offsets are element-relative) */
  ...(e.markers !== undefined && e.markers.length > 0 ? { markers: e.markers.map((m) => ({ ...m })) } : {}),
  ...(e.audioFadeIn !== undefined ? { audioFadeIn: e.audioFadeIn } : {}),
  ...(e.audioFadeOut !== undefined ? { audioFadeOut: e.audioFadeOut } : {}),
  ...(e.fadeIn !== undefined ? { fadeIn: e.fadeIn } : {}),
  ...(e.fadeOut !== undefined ? { fadeOut: e.fadeOut } : {}),
  ...(e.effects !== undefined && e.effects.length > 0 ? { effects: e.effects.map((fx) => ({ ...fx })) } : {}),
  ...(e.transitionOut !== undefined
    ? { transitionOut: { type: e.transitionOut.type, presentation: e.transitionOut.presentation, duration: e.transitionOut.duration, alignment: e.transitionOut.alignment } }
    : {}),
  ...(e.linkedTo !== undefined ? { linkedTo: e.linkedTo } : {}),
});

const toInterchangeTrack = (t: TrackJSON): ExportJsonTrack => ({
  id: t.id,
  kind: t.kind,
  name: t.name,
  badge: t.badge,
  muted: t.muted,
  solo: t.solo,
  locked: t.locked,
  visible: t.visible,
  /* captions tracks carry their language tag (content); `waveform` is a view
     pref and stays OUT of the interchange — view state never exports */
  ...(t.language !== undefined ? { language: t.language } : {}),
  elements: t.elements.map(toInterchangeElement),
});

/**
 * Build the interchange document for one scene. Pure + total: an unknown
 * sceneId falls back to the FIRST scene (the same resolver DeliverPage uses
 * for its export target), and the loop range rides the doc so the recipient
 * knows the in→out span the export was cut for.
 */
export function buildExportJson(state: ExportJsonState, sceneId: string): ExportJsonDoc {
  const scene = state.scenes.find((s) => s.id === sceneId) ?? state.scenes[0];
  return {
    schema: 'nle-interchange/1',
    project: toInterchangeProject(),
    timeline: {
      id: scene.id,
      name: scene.name,
      duration: sceneDuration(scene),
      range: { start: state.loop.start, end: state.loop.end },
      markers: scene.markers.map((m) => ({ ...m })),
      tracks: scene.tracks.map(toInterchangeTrack),
    },
  };
}

/** The downloaded file's name — the project's name + the exported timeline
 *  (live data, never a hardcoded stem: the queue rows hardcode theirs; the
 *  REAL download does not get to lie). */
export const exportJsonFileName = (projectName: string, sceneName: string): string =>
  `${projectName} — ${sceneName}.json`;

/**
 * The DOM half — a real browser download of the pretty-printed doc.
 * jsdom guard: raw jsdom does NOT implement `URL.createObjectURL`, so the
 * wrapper no-ops instead of throwing when the API is absent (a host that
 * has it — vitest's jsdom env does — runs the real path; component tests
 * stub the anchor's click so jsdom never attempts navigation). The seam's
 * contract — blob type, anchor download name, click, revoke — is pinned in
 * exportJson.test against stubbed URL/anchor globals.
 */
export function downloadJson(doc: ExportJsonDoc, filename: string): void {
  if (typeof URL.createObjectURL !== 'function') return; // no blob URLs here: skip the DOM half
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

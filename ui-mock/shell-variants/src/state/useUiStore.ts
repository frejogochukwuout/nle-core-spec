/* UI store (Zustand) — spec 18 §6.2: view state only (tool, snap, panels,
   zoom, selection, playhead) + the mock document slice so drag/trim/split
   commits can re-render. In the real shell the doc comes from SceneState
   snapshots + EngineEvents; the mock co-locates it for simplicity.
   R11 additions: undo history (mock), full editing command set (delete /
   duplicate / ripple-trim / slip / transitions / effect params), toast
   region state, JKL shuttle, track focus, media multi-select + drag ghost,
   keyboard-completeness fields. */

import { create } from 'zustand';
import { project, sceneDuration, mediaById, fieldOfFade, type SceneJSON, type ElementJSON, type TrackJSON, type Marker, type EffectJSON, type TransitionPresentation, type ElementType } from '../lib/mockData';
import { clamp, snapToFrame } from '../lib/timecode';
import { PPS_MIN as MIN_PPS, PPS_MAX as MAX_PPS } from '../lib/pixel';
import { trackAcceptsElement, spansOverlap, zeroAnchorShift, dragRejectionToast, type GroupMoveFail } from '../lib/timelinePlacement';
import { computeTrackRippleAdjustments, applyRippleAdjustmentsToElements } from '../lib/ripple';
/* R20-W2 (DESIGN-R20 D2, REV-B P2-4/P2-5): the insert-media split — the
   pure planner lives in lib/insertPlan.ts (no store import); this module
   keeps the APPLY half (applyInsertPlan executes the plan's patch under
   ONE withHistory entry) + the thin insertMediaAt wrapper so the store
   surface and every existing test stay green. */
import { planInsertMedia, type InsertPlan, type InsertPlanContext } from '../lib/insertPlan';
/* R15 T4 trim laws (lib/trimLaws.ts — ONE home shared with the Clip gesture
   so preview and commit always agree): MIN_DUR = 1 frame, neighbor bounds,
   source-extent bounds, batch intersection, rate clamp. */
import {
  MIN_DUR,
  RATE_MIN,
  RATE_MAX,
  rateOf,
  sourceExtentOf,
  batchTrimBounds,
  neighborBefore,
  neighborAfter,
  rollDeltaBounds,
  rippleDeltaBounds,
  slipTargetBounds,
  slideStartBounds,
  stretchDeltaBounds,
} from '../lib/trimLaws';
import { createMixerScene, type MockMixerScene, type MixerTrackSettings, type DuckingSettings, type AuxBusSettings } from './mockMixer';
/* R20-W4b (DESIGN-R20 D3, gap C50): the grade sidecar. GradeParams/defaults
   come VERBATIM from W4a's lib/color (spec 08 §4.2 WheelsParams field names —
   the store never renames them); the mock-only curves extension (spec 08 §5
   point model, gap C55) is curveMath's CurveSet — lib/color is read-only
   this wave, so MockGrade EXTENDS it structurally instead. */
import { DEFAULT_GRADE, DEFAULT_QUALIFIER, type GradeParams, type QualifierParams } from '../lib/color';
import type { CurveSet } from '../components/pages/color/curveMath';

/* R23-WA (DESIGN-R23 D-A1/D-A2): the FX tool joins the edit-tool union —
   activating it flips the Timeline into fxMode (the transition/fade engine);
   the FX PAGE renders the same engine via the page coupling (single source:
   setTool + setPage are the ONLY writers of fxMode — see the actions). */
export type ToolId = 'select' | 'blade' | 'roll' | 'ripple' | 'slip' | 'slide' | 'stretch' | 'fx';
/* R23-WA (D-A1): the FX page — the dedicated workflow view (left dock = FX
   browser, right rail = FX inspector, timeline area = the full Timeline in
   fxMode). Dock order: Edit / Color / Audio / FX / Deliver (⌘5). */
export type Page = 'edit' | 'color' | 'audio' | 'fx' | 'deliver';
/* R23-WA (D-A3): the FX selection domain — a seam transition or a clip fade
   object. Mirrors the R20-W3 domain laws: mutually exclusive with the other
   selection domains (clears at every existing clear-site), kept alive by
   selectElement/setSelection while its element stays selected (the effect
   domain's own survival law), cleared by removeTransition/removeFade and the
   scene switch (stale ids). */
export interface SelectedFxObject {
  kind: 'transition' | 'fade';
  elementId: string;
  /** fade side (fade objects only — a transition has none) */
  side?: 'in' | 'out';
}
export type ToastKind = 'info' | 'success' | 'error' | 'persist';
/* R20-W1 (DESIGN-R20 D1.4): 'bridge' renamed 'meters' — the minimized
   state is now full-height thin meter COLUMNS, not a stacked rail. */
export type MixerDockState = 'collapsed' | 'meters' | 'full';
/* R19 edit-overlay ops (nle_edit_workflow reference): the 7 Resolve edit
   functions. insert/overwrite/append/placeOnTop/rippleOverwrite are REAL
   placement (timelinePlacement laws); replace needs a selected element;
   fitToFill needs a loop range — honest toasts otherwise. R20-W2: the
   union moved to lib/insertPlan.ts (the pure planner owns it); re-exported
   so the historical `import from state/useUiStore` surface stays stable. */
export type { InsertMediaMode } from '../lib/insertPlan';
import type { InsertMediaMode } from '../lib/insertPlan';

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
  /* R19: nested marker arrays + eq tuple clone too — undo round-trips
     marker/eq edits (the R11 lesson extended to the new fields). */
  ...(e.markers ? { markers: e.markers.map((m) => ({ ...m })) } : {}),
  ...(e.eq ? { eq: [...e.eq] as ElementJSON['eq'] } : {}),
});
const clone = (scenes: SceneJSON[]): SceneJSON[] => scenes.map((s) => ({ ...s, tracks: s.tracks.map((t) => ({ ...t, elements: t.elements.map(cloneEl) })), markers: s.markers.map((m) => ({ ...m })) }));

/* ---------- R20-W4b: the mockGrades sidecar (gap C50) ----------

   GradeParams per elementId + the special TIMELINE_GRADE_KEY (the post-clip /
   timeline-level grade — Resolve post-clip semantics). NEVER on ElementJSON
   (spec 09 has no color fields; the mockMixer sidecar is the precedent).
   Absent key = DEFAULT_GRADE (identity), so reset = key deletion. */

export const TIMELINE_GRADE_KEY = 'timeline';

/** GradeParams (spec 08 §4.2, W4a) + the mock curves extension (spec 08 §5). */
export type MockGrade = GradeParams & { curves?: CurveSet };

/* R23-WB (DESIGN-R23 D-B4; issues #97/#91): a Gallery still — a captured
 * graded frame of a timeline clip, carried as its grade record (the
 * gradient thumbnail the panel paints is the honest mock of the decoded
 * frame). View state — the seeds below are the panel's old fixtures, moved
 * to the store so stills survive page/tab unmounts (the sourceRanges
 * precedent); NEVER inside a withHistory snapshot. */
export interface Still {
  id: string;
  name: string;
  /** The captured clip's source media (thumbnail provenance; null = timeline-level). */
  mediaId: string | null;
  grade: MockGrade;
}

/** R23-WB (D-B4): the seed gallery — the R22-D7 fixtures, re-homed to the
 *  store (the panel's local useState died with it). */
const SEED_STILLS: Still[] = [
  { id: 'still-01', name: 'Marina cool', mediaId: 'm-01', grade: { ...DEFAULT_GRADE, temperature: -18, contrast: 1.08, saturation: 8 } },
  { id: 'still-02', name: 'Golden hour', mediaId: 'm-01', grade: { ...DEFAULT_GRADE, temperature: 26, tint: 6, saturation: 18, highlights: -6 } },
  { id: 'still-03', name: 'Bleach lift', mediaId: 'm-04', grade: { ...DEFAULT_GRADE, lift: 0.04, saturation: -32, contrast: 1.22 } },
  { id: 'still-04', name: 'Night teal', mediaId: 'm-01', grade: { ...DEFAULT_GRADE, temperature: -30, tint: -10, midHue: 190, midAmount: 0.12, pivot: 0.38 } },
];

/** Partial patch: qualifier merges deeply, curves replaces the set. */
export type GradePatch = Partial<Omit<MockGrade, 'qualifier' | 'curves'>> & {
  qualifier?: Partial<QualifierParams> | null;
  curves?: CurveSet;
};

const DEFAULT_MOCK_GRADE: MockGrade = { ...DEFAULT_GRADE };

const cloneGrades = (g: Record<string, MockGrade>): Record<string, MockGrade> => {
  const out: Record<string, MockGrade> = {};
  for (const k of Object.keys(g)) {
    const v = g[k];
    out[k] = {
      ...v,
      ...(v.qualifier ? { qualifier: { ...v.qualifier } } : {}),
      ...(v.curves ? { curves: { master: v.curves.master.map((p) => ({ ...p })) } } : {}),
    };
  }
  return out;
};

/** Deep partial merge of a patch onto a grade record (qualifier merges). */
function mergeGrade(base: MockGrade, patch: GradePatch): MockGrade {
  const out: MockGrade = { ...base };
  for (const key of Object.keys(patch) as (keyof GradePatch)[]) {
    if (key === 'qualifier') {
      const q = patch.qualifier;
      if (q === null) out.qualifier = null;
      else if (q !== undefined) out.qualifier = { ...(base.qualifier ?? DEFAULT_QUALIFIER), ...q };
    } else if (key === 'curves') {
      if (patch.curves !== undefined) out.curves = { master: patch.curves.master.map((p) => ({ ...p })) };
    } else {
      const v = patch[key];
      if (v !== undefined) (out as unknown as Record<string, unknown>)[key as string] = v;
    }
  }
  return out;
}

/** Deep equality (records are ~30 numbers + two small objects; key order is
    insertion-stable because mergeGrade spreads base first — stringify is a
    faithful equality here and used ONLY to detect no-op patches). */
const gradeEqual = (a: MockGrade, b: MockGrade): boolean => JSON.stringify(a) === JSON.stringify(b);

/** The grade the console/rail edit: 'timeline' when the target toggle says so,
    else the FIRST selected clip (the single-owner law — every surface resolves
    the SAME id from the store, so console and rail can never disagree). */
export function resolveGradeTargetId(s: Pick<UiState, 'colorGradeTarget' | 'selection'>): string | null {
  return s.colorGradeTarget === 'timeline' ? TIMELINE_GRADE_KEY : (s.selection[0] ?? null);
}

/** Record lookup with the identity default (absent key = DEFAULT_GRADE). */
export function gradeOf(s: Pick<UiState, 'mockGrades'>, id: string): MockGrade {
  return s.mockGrades[id] ?? DEFAULT_MOCK_GRADE;
}

/* R23-WB (DESIGN-R23 D-B3; issue #94): the ONE density resolver — 'auto'
 * means COMPACT on color + deliver (deliver per D-F1's ruling that Wave F
 * mounts the strip), full tracks elsewhere; 'on'/'off' are the user's
 * per-session overrides. Both consumers (the AppShell mount decision + the
 * TimelineToolbar toggle's honest aria-pressed) read THIS so they can never
 * disagree about what is rendered. */
export function resolveTimelineCompact(s: Pick<UiState, 'timelineCompact' | 'page'>): boolean {
  if (s.timelineCompact === 'on') return true;
  if (s.timelineCompact === 'off') return false;
  return s.page === 'color' || s.page === 'deliver';
}

const findEl = (scenes: SceneJSON[], id: string): { el: ElementJSON; track: TrackJSON; scene: SceneJSON } | null => {
  for (const sc of scenes) for (const t of sc.tracks) {
    const el = t.elements.find((e) => e.id === id);
    if (el) return { el, track: t, scene: sc };
  }
  return null;
};

const findInScene = (sc: SceneJSON, id: string): { el: ElementJSON; track: TrackJSON } | null => {
  for (const t of sc.tracks) {
    const el = t.elements.find((e) => e.id === id);
    if (el) return { el, track: t };
  }
  return null;
};

/* ---------- R15 T3: cross-track move machinery (canonical laws) ----------

   One shared engine for moveElements / moveElement / duplicateAndMove —
   the pure resolution half lives in lib/timelinePlacement.ts (drag PREVIEW
   + commit share it); this half commits onto the cloned scene:
     1. frame-snap each startTime (snapToFrame)
     2. anchor clamp: min startTime across the batch ≥ 0 (shift the whole
        batch up if needed)
     3. zero-anchor (spec-05 §14.5A): the main-targeting subset pins its
        earliest move at 0 when main is (virtually) empty or the request is
        ≤ the earliest stationary main start
     4. half-open overlap [start, end) revalidated after VIRTUALLY REMOVING
        the movers (a group may shuffle within itself): intra-batch overlap
        → WHOLE batch rejected; overlap vs stationary → THAT move rejected
        (others proceed; all rejected → no-op)
     5. locked tracks: moves from a locked source or onto a locked target
        are rejected per-move (others proceed; all rejected → no-op)
   Returns false for no-ops — withHistory then records NO history entry. */
export interface MoveElementPlan {
  id: string;
  trackId: string;
  startTime: number;
}
export interface CreateTrackPlan {
  /** pre-minted identity from the drag gesture (stable across recomputes);
   *  omitted → generated (untargetable by moves, still a real doc change). */
  id?: string;
  kind: TrackJSON['kind'];
  /** insert ABOVE this track; undefined → append at the bottom. */
  insertAboveTrackId?: string;
}

function newTrackFor(sc: SceneJSON, kind: TrackJSON['kind'], type?: ElementJSON['type']): TrackJSON {
  const n = sc.tracks.filter((t) => t.kind === kind).length + 1;
  /* lane naming follows the incoming element when known (a video clip gets
     a "Video n"/Vn lane even though its kind is the overlay section — main
     stays a singleton, canonical); kind-based otherwise (addTrack twin). */
  const isVideo = type === 'video' || (type === undefined && kind === 'main');
  const isAudio = type === 'audio' || (type === undefined && kind === 'audio');
  const name = isAudio ? `Audio ${n}` : isVideo ? `Video ${n}` : `Text ${n}`;
  const badge = `${isAudio ? 'A' : isVideo ? 'V' : 'T'}${n}`;
  return {
    id: nextId(`t-${kind}-`),
    kind, name, badge,
    muted: false, solo: false, locked: false, visible: true,
    waveform: kind === 'audio' ? true : undefined,
    elements: [],
  };
}

/* R15-F1 FIX 1/FIX 2: the engine verdict. `applied` = committed (one entry);
   `applied: false` alone = honest no-op (nothing changed — NO toast, the
   plain moveElements contract); `applied: false` + `reason` = the ATOMIC
   duplicate path's whole-batch rejection (the caller toasts honestly). */
export interface MoveEngineVerdict {
  applied: boolean;
  reason?: GroupMoveFail;
}

interface MoveEngineOpts {
  hasNewElements?: boolean;
  /** R15-F1 FIX 1 (duplicate path): per-move rejections (locked target /
   *  incompatible / overlap vs stationary) fail the WHOLE batch instead of
   *  dropping moves — the preview's whole-batch law. The old per-move drop
   * stranded an un-lifted clone parked exactly ON TOP of its original
   * (overlap invariant broken, one history entry) while the other copies
   * landed — the R15-V1 review's P1. */
  atomic?: boolean;
  /** R15-F1 FIX 1: cloneId → in-memory copy (NOT yet in the doc). The
   *  duplicate path validates + places VIRTUAL clones: they are never
   *  pre-parked on the source lanes, so a dropped move can never leave a
   *  stranded overlapping copy behind. Source lift is a no-op for them. */
  virtualElements?: Map<string, ElementJSON>;
}

function applyMovesToScene(
  sc: SceneJSON,
  moves: MoveElementPlan[],
  createTracks: CreateTrackPlan[],
  opts: MoveEngineOpts = {},
): MoveEngineVerdict {
  if (moves.length === 0 && createTracks.length === 0) return { applied: false };
  // duplicate ids would append the element once per move — corrupting the
  // doc with same-id duplicates (canonical guard, whole batch rejected)
  if (new Set(moves.map((m) => m.id)).size !== moves.length) return { applied: false };

  // resolve elements (locked sources + unknown ids dropped per-move; virtual
  // clones resolve from the map — minted copies not yet in the doc)
  const resolved: { id: string; el: ElementJSON; source: TrackJSON | null; targetId: string; startTime: number }[] = [];
  for (const mv of moves) {
    const hit = findInScene(sc, mv.id);
    if (hit) {
      if (hit.track.locked) continue; // locked source — inert (18 §4.5)
      resolved.push({ id: mv.id, el: hit.el, source: hit.track, targetId: mv.trackId, startTime: snapToFrame(mv.startTime) });
    } else {
      const virtual = opts.virtualElements?.get(mv.id);
      if (virtual) {
        // a virtual clone is minted but NOT in the doc — nothing is ever
        // lifted from a source lane (source: null); it only lands.
        resolved.push({ id: mv.id, el: virtual, source: null, targetId: mv.trackId, startTime: snapToFrame(mv.startTime) });
      }
    }
  }

  // create planned tracks (in array order; block entries share one
  // insertAboveTrackId so sequential "above X" inserts stack in order).
  // Audio clamps below main (spec-05 §12.1) — the defensive engine twin of
  // the resolution's insert-index clamp. (Rejection rolls the whole cloned
  // scene back — withHistory discards it — so create-then-validate is safe.)
  const createdIds = new Set<string>();
  for (const ct of createTracks) {
    let idx = ct.insertAboveTrackId !== undefined
      ? sc.tracks.findIndex((t) => t.id === ct.insertAboveTrackId)
      : sc.tracks.length;
    if (idx === -1) idx = sc.tracks.length;
    if (ct.kind === 'audio') {
      const mainIdx = sc.tracks.findIndex((t) => t.kind === 'main');
      if (idx < mainIdx + 1) idx = mainIdx + 1;
    }
    const id = ct.id ?? nextId(`t-${ct.kind}-`);
    createdIds.add(id);
    const incoming = resolved.find((r) => r.targetId === id);
    const track = newTrackFor(sc, ct.kind, incoming?.el.type);
    track.id = id; // pre-minted identity wins
    sc.tracks.splice(idx, 0, track);
  }

  // target validation (locked target / compatibility). NON-atomic: the
  // per-move drop law (others proceed — pinned by the moveElements tests);
  // atomic (duplicate path): any rejection fails the whole batch.
  const reject = (reason: GroupMoveFail): MoveEngineVerdict =>
    opts.atomic ? { applied: false, reason } : { applied: false };
  const invalids = resolved.filter((r) => {
    const target = sc.tracks.find((t) => t.id === r.targetId);
    if (!target || target.locked || !trackAcceptsElement(target.kind, r.el.type)) return true;
    return false;
  });
  if (invalids.length > 0 && opts.atomic) {
    const target = sc.tracks.find((t) => t.id === invalids[0]!.targetId);
    return reject(target ? (target.locked ? 'locked' : 'incompatible') : 'no-track');
  }
  const valid = resolved.filter((r) => {
    const target = sc.tracks.find((t) => t.id === r.targetId);
    if (!target) return false;
    if (target.locked) return false;
    return trackAcceptsElement(target.kind, r.el.type);
  });
  if (valid.length === 0) return { applied: false }; // all moves rejected → no-op

  // anchor clamp: min startTime ≥ 0 (shift the whole batch up)
  const minStart = Math.min(...valid.map((r) => r.startTime));
  if (minStart < 0) for (const r of valid) r.startTime = snapToFrame(r.startTime - minStart);

  // zero-anchor (magnetic main, spec-05 §14.5A) — R15-F1 FIX 2: the SHARED
  // pure law (zeroAnchorShift, the same code resolveGroupMove runs), i.e.
  // the magnet shifts the WHOLE batch so its left edge pins at 0. The old
  // store-side re-implementation shifted only the main-targeting subset —
  // the R15-V1 review verified the divergence (a raw A/V batch committed a
  // 5s split the pure law answers as a clamped no-op). For the duplicate
  // path the stationary set keeps the ORIGINALS (they stay — the copies
  // must clear them like any other stationary clip).
  const main = sc.tracks.find((t) => t.kind === 'main');
  if (main) {
    const shift = zeroAnchorShift(
      main.elements,
      valid.map((r) => ({
        id: r.id,
        targetOnMain: sc.tracks.find((t) => t.id === r.targetId)?.kind === 'main',
        startTime: r.startTime,
      })),
    );
    if (shift !== 0) for (const r of valid) r.startTime = snapToFrame(r.startTime + shift);
  }

  // durations for the overlap laws (virtual clones included)
  const elementsById = new Map<string, ElementJSON>();
  for (const track of sc.tracks) for (const e of track.elements) elementsById.set(e.id, e);
  if (opts.virtualElements) for (const [id, el] of opts.virtualElements) elementsById.set(id, el);

  // intra-batch overlap (per target track) → whole batch rejected
  const byTarget = new Map<string, { startTime: number; duration: number }[]>();
  for (const r of valid) {
    const list = byTarget.get(r.targetId) ?? [];
    list.push({ startTime: r.startTime, duration: elementsById.get(r.id)?.duration ?? 0 });
    byTarget.set(r.targetId, list);
  }
  for (const spans of byTarget.values()) {
    const sorted = [...spans].sort((a, b) => a.startTime - b.startTime);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i - 1]!.startTime + sorted[i - 1]!.duration > sorted[i]!.startTime) return { applied: false, reason: 'overlap' };
    }
  }

  // overlap vs stationary (movers virtually removed): NON-atomic drops that
  // move (others proceed); atomic (duplicate path) fails the whole batch.
  // Virtual clones are NOT in the doc, so stationary = the full lane — a
  // copy must clear its own ORIGINAL exactly like any foreign clip (the
  // half-open law holds in the FINAL scene, the invariant the P1 broke).
  const moverIds = new Set(valid.map((r) => r.id));
  const overlapped = valid.filter((r) => {
    const target = sc.tracks.find((t) => t.id === r.targetId)!;
    const stationary = target.elements.filter((e) => !moverIds.has(e.id));
    return stationary.some((e) => spansOverlap({ startTime: r.startTime, duration: elementsById.get(r.id)?.duration ?? 0 }, e));
  });
  if (overlapped.length > 0 && opts.atomic) return { applied: false, reason: 'overlap' };
  const survivors = overlapped.length > 0 ? valid.filter((r) => !overlapped.includes(r)) : valid;
  if (survivors.length === 0) return { applied: false }; // every move overlapped — no-op

  // change detection: NOOP batches never create history (canonical)
  const changed = (opts.hasNewElements ?? false) || createdIds.size > 0 || survivors.some((r) => {
    const target = sc.tracks.find((t) => t.id === r.targetId)!;
    return (r.source ? r.source.id !== target.id : true) || r.startTime !== r.el.startTime;
  });
  if (!changed) return { applied: false };

  // apply: lift from the source lane, land on the target lane
  const affected = new Set<TrackJSON>();
  for (const r of survivors) {
    const target = sc.tracks.find((t) => t.id === r.targetId)!;
    if (r.source) {
      r.source.elements = r.source.elements.filter((e) => e.id !== r.id);
      affected.add(r.source);
    }
    r.el.startTime = r.startTime;
    r.el.trackId = target.id; // denormalized field stays coherent
    target.elements.push(r.el);
    affected.add(target);
  }
  for (const t of affected) t.elements.sort((a, b) => a.startTime - b.startTime); // lanes stay time-ordered
  return { applied: true };
}

/* pre-minted new-track identities for the drag gesture: one per moving clip
   (max), minted at drag ACTIVATION so the target identity is stable across
   pointermove recomputes (canonical reservedNewTrackIds). */
export function mintTrackIds(count: number): string[] {
  return Array.from({ length: count }, () => nextId('t-new-'));
}

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
  /* R23-WA (DESIGN-R23 D-A2/D-A3): the FX/transition engine's view state —
     ONE flag, written ONLY by setTool (fx tool ⇔ fxMode off the FX page) and
     setPage (fx page owns it; leaving resets). While on: clips recede, seam
     /head/tail zones render, transition boxes become interactive. View
     state, never snapshotted. */
  fxMode: boolean;
  /* R23-WA (D-A3): the FX selection domain (see the SelectedFxObject comment
     at the type). View state, never snapshotted. */
  selectedFxObject: SelectedFxObject | null;
  /* R20-W3 (DESIGN-R20 D4.2): the track/effect selection domains — mirrors
     of the R19 selectedMarkerId domain-swap law. selectTrack clears the clip
     selection + marker + effect domains; selectEffect keeps its clip selected
     (the effect domain is {clipId, fxId} — a composite, documented judgment:
     an effect never exists without its clip, and the pair lets selection
     writes clear the domain when the clip deselects, without a doc lookup).
     View state, never snapshotted. */
  selectedTrackId: string | null;
  selectedEffectId: string | null;
  /** the clip the selectedEffectId lives on (the domain's other half) */
  selectedEffectClipId: string | null;
  /* R20-W3 (D4.4 descoped): the minimal Project sheet toggle — the toolbar
     button flips this view-state flag; selecting ANY entity exits it. */
  inspectorProjectMode: boolean;
  pxPerSec: number;
  /** dynamic minimum pps (spec-05 §5.2) — slider bottom / reconcile floor */
  zoomMinPps: number;
  panels: { mediaPool: boolean; effects: boolean; inspector: boolean };
  mediaView: 'grid' | 'list';
  search: string;
  sortBy: 'name' | 'duration' | 'date' | 'type';
  sortDir: 'asc' | 'desc';
  masterMuted: boolean;
  masterVolume: number;
  mediaW: number;
  inspectorW: number;
  mainBodyH: number;
  /** R22-D8: the user has DRAGGED the mainbody HSplitter (their height wins
   *  and persists across page flips; otherwise the color page defaults to
   *  55% and others 40% — the viewer-first law, issue #77). */
  mainBodyUserSet: boolean;
  /** R22-D2: the user has dragged the inspector VSplitter (their width wins;
   *  otherwise the color page defaults to the reference's 420px inspector). */
  inspectorWUserSet: boolean;
  cheatOpen: boolean;
  scenes: SceneJSON[];
  mediaSelection: string[];    // multi-select per spec 18 §4.2
  mediaDrag: { mediaId: string; overTrackId: string | null; allowed: boolean } | null;
  focusedTrackId: string | null; // ↑/↓ track focus (spec 16 §3.6)
  toasts: Toast[];
  saveAttempt: number;
  simulateSaveFail: boolean;
  past: HistoryEntry[];
  future: HistoryEntry[];
  // ---- audio focus mode (design doc docs/DESIGN-audio-mode.md v2.1) ----
  mixer: MockMixerScene;      // mock G-slice (spec 20 §4.2 shape)
  mixerState: MixerDockState;
  audioLaneBoost: boolean;
  stripFocus: string | null;
  stripFlash: number;
  /* R20-W1 B6 (mixer-contract §3.1): strip display flags live at the STORE
     level (not component useState) so they survive dock unmounts / state
     cycles / scene switches. View-state only — the G-slice shape is
     unchanged and there is no doc-slice field (gap C40 honesty toasts stay). */
  stripArm: Record<string, boolean>;       // record-arm display state per trackId
  stripInsertsOn: Record<string, boolean>;  // inserts-power display state per trackId
  /* R20-W1 D1.3: ONE honest floor-fallback toast per session — the dock
     auto-falls back to the meters state below MIXER_TIER.FLOOR. */
  mixerFloorWarned: boolean;
  /* spec 18 §4.9 track-header Height rows (Compact/Normal/Tall): GLOBAL lane-
     height pref (null = auto: kind-based trackHeights()). B3 registration: the
     state-home question (per-track vs global) is a seal item — the mock answers
     GLOBAL, a noted deviation; view state, not doc. */
  trackHeightPref: 'compact' | 'normal' | 'tall' | null;
  /* R20-W5 (thread #58 / D1.5, gap C57): PER-TRACK pixel-height overrides —
     trackId → px; ABSENT = auto (the kind-based height × the global pref).
     VIEW state: never inside a withHistory snapshot (the snapshot slice
     stays scenes/activeSceneId/lockAll/selection/mockGrades) — the pref
     precedent's law. Track ids are stable per scene; stale ids are harmless
     (looked up per the active scene's tracks). Drag math note: in audio
     focus the override participates in the page-level boost PROPORTIONALLY
     (audio ×1.6; custom main >40 CAPS in focus — the documented yield rule,
     timeline-cluster.md thread-4 §4b; switch to "override wins absolutely"
     is a one-line change in Timeline.laneHeight if reviewers object). */
  trackHeightOverrides: Record<string, number>;
  /* R20-W5 (thread #67 / D1.5): media-bay MODE filter — when ON, the pool +
     SoundLibrary auto-filter to audio assets (audio type + audio-bearing
     video, the SoundLibrary grouping) with an honest count chip + an
     'Audio only' toggle. Default ON so the AUDIO page (where it is honored)
     boots filtered; Edit/Color/Deliver pages render the pool unfiltered
     (MediaPool gates the effect on page === 'audio' — SoundLibrary is the
     audio-page surface, so it honors the flag directly). View state, never
     persisted, never snapshotted. */
  poolModeFilter: boolean;

  /* ---- R20-W4b (DESIGN-R20 D3, gaps C50/C51/C55/C56) ---- */
  /* mockGrades is UNDOABLE (the withHistory snapshot carries it — undo/redo
     round-trips grades; one history entry per committed setGrade/resetGrade).
     The console view-state below is NEVER snapshotted (mockMixer view-state
     law). */
  mockGrades: Record<string, MockGrade>;
  /** Active ColorInspector tab (C51; R22 rename from colorConsoleTab — the
   *  grading surface moved from the scrapped ColorConsole into the right
   *  rail's ColorInspector per DESIGN-R22 D2). */
  colorInspectorTab: 'primaries' | 'curves' | 'qualifier';
  /** R22-D3 → R23-WB (DESIGN-R23 D-B1; issues #90/#95): the scopes console
   *  state — 'off' = the dock is NOT rendered at all (the mixer's collapsed
   *  law, the default per issue #77); 'open' = the tabbed ScopesDock in the
   *  TIMELINE-AREA console row. The R22 4-state machine (collapsed/row/grid)
   *  died with the squeeze it defended — the W4c simultaneity law is
   *  REVERSED by #90/#95 (registered in the README deviation ledger). The
   *  state is never persisted, so the ruling-13 migration (any legacy
   *  non-'off' value → 'open') is enforced at the type + every StoreBoot/
   *  test patch site; colorScopesLastVisual is REMOVED (Part IX ruling 13).
   *  View state, never snapshotted. */
  colorScopesState: 'off' | 'open';
  /** R22-D4 → R23-WB (DESIGN-R23 D-B2; issue #93): the node-graph flag now
   *  points at the VIEWER-REGION surface — true = ColorNodeGraph replaces
   *  the Viewer in the mainbody center ("fit better on the preview window …
   *  we can cross it out just like a normal asset preview"); the timeline-
   *  area dock died ("stacking next to multi-track is perhaps not a great
   *  place as we need more space for it"). Toggled from Toolbar2 on color;
   *  the surface's × restores the viewer. View state, never snapshotted. */
  colorNodesDock: boolean;
  /** R23-WB (DESIGN-R23 D-B3; issue #94): timeline density — 'auto' resolves
   *  per page (COMPACT on color + deliver per D-F1, full elsewhere);
   *  'on'/'off' are the per-session user overrides from the TimelineToolbar's
   *  density toggle (available on EVERY page — "this super compact mode we
   *  should allow to be used everywhere"). View state, not a pref (resets on
   *  reload); never snapshotted. */
  timelineCompact: 'auto' | 'on' | 'off';
  /** R23-WB (D-B4; #97/#91): the color page's Gallery — view state, never
   *  snapshotted (stills survive unmounts; grades are NOT doc data). */
  colorStills: Still[];
  /** Clip ⇄ Timeline grade-target toggle (C51); 'clip' resolves to selection[0]. */
  colorGradeTarget: 'clip' | 'timeline';
  /** Qualifier matte-preview overlay switch (C54 preview half — W4c renders
     the viewer overlay; this view-state is the immediate toggle). */
  qualifierPreviewOn: boolean;
  /** R20-W4c (C54): qualifier EYEDROPPER armed — the viewer canvas samples
     the clicked pixel from the graded buffer and seeds the target's
     qualifier Center values (one setGrade per pick; the pick disarms).
     View-state, never snapshotted (same law as qualifierPreviewOn). */
  qualifierPickerOn: boolean;
  /** Selected node-graph node (C56) — 'primary'/'secondary' bind to the
     target's GradeParams/qualifier surfaces; other node kinds are honest
     display state (C56 toast). */
  selectedColorNodeId: string | null;

  /* ---- R19: marker v2 / captions / source-preview view state ---- */
  selectedMarkerId: string | null; // marker inspector routing (rail swap)
  /* spec 18 §4.3 v1.1 source-preview: program canvas ↔ raw-asset preview.
     R19 deviation (C39): pool-card selection ALSO enters the mode (reviewer
     request — the spec's triggers are the clip menu + source-card play). */
  viewerMode: 'program' | 'source';
  sourceMediaId: string | null;
  /* R22 #84/#85: the SOURCE viewer's per-media in/out trim range (seconds
   *  into the media; absent key = full media). VIEW STATE — never inside a
   *  withHistory snapshot (the same law as the loop marks); keyed per
   *  mediaId so switching sources keeps each trim. */
  sourceRanges: Record<string, { in: number; out: number } | null>;
  /** R22 #84/#85: set/clear the source's in/out range (clamped to [0, dur]
   *  with in < out; a 0-length range refuses — the honest guard). */
  setSourceRangeIn: (mediaId: string, t: number) => void;
  setSourceRangeOut: (mediaId: string, t: number) => void;
  clearSourceRange: (mediaId: string) => void;
  /* R20-W2 (DESIGN-R20 D2 / C48 hover-placement preview): the store holds
     THE MODE, never a plan object (REV-B P2-4 — a stored plan goes stale
     and fresh-object identity traps zustand-v5 selectors). The plan is
     recomputed by the useInsertPreview hook's useMemo against the live
     doc. View state, NEVER inside a withHistory snapshot (the snapshot
     slice stays scenes/activeSceneId/lockAll/selection); set via plain
     set, so hover arms/disarms can never mint undo entries. Cleared as a
     side-effect by exitSourcePreview (program mode never previews). */
  hoverInsertPreview: { mediaId: string; mode: InsertMediaMode } | null;

  // actions
  setPage: (p: Page) => void;
  setActiveScene: (id: string) => void;
  createScene: () => void;
  deleteScene: (id: string) => void;
  setTool: (t: ToolId) => void;
  toggleSnap: () => void;
  toggleLink: () => void;
  toggleLockAll: () => void;
  toggleMuteAll: () => void;
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
  clearLoopIn: () => void;
  clearLoopOut: () => void;
  clearInOut: () => void;
  addMarker: (time: number, color?: Marker['color']) => void;
  /* ---- R19 marker v2 / captions / source-preview / edit-overlay ---- */
  selectMarker: (id: string | null) => void;
  updateMarker: (id: string, patch: Partial<Marker>) => void;
  removeMarker: (id: string) => void;
  addClipMarker: (elementId: string, offset: number, color?: Marker['color']) => void;
  removeClipMarker: (elementId: string, markerId: string) => void;
  addCaption: (prevId: string) => void;
  enterSourcePreview: (mediaId: string) => void;
  exitSourcePreview: () => void;
  /* R20-W2: arms/disarms the hover-placement preview (view-state only). */
  setHoverInsertPreview: (v: { mediaId: string; mode: InsertMediaMode } | null) => void;
  insertMediaAt: (mediaId: string, mode: InsertMediaMode, opts?: { time?: number; targetTrackId?: string }) => void;
  /* R20-W2 (REV-B P2-4/P2-5): executes a planned insert — the commit half
   * of the plan/apply split. ONE history entry; preserves today's toast
   * kinds/titles verbatim; selection clears ONLY for the 5 shared modes
   * (replace/fitToFill do NOT clear selection today). */
  applyInsertPlan: (plan: InsertPlan) => void;
  setSelection: (ids: string[]) => void;
  selectElement: (id: string, additive: boolean) => void;
  selectTrackElements: (trackId: string, additive: boolean) => void;
  selectNeighbors: (dir: 1 | -1) => void;
  /* R23-WA (DESIGN-R23 D-A3): the FX-object selection write — clears the
   * marker/track/effect domains (the effect⇄fx-object swap — both are
   * clip-children, one at a time) but KEEPS the clip selection (the
   * fade-object pointerdown selects the clip first, exactly the
   * selectEffect mirror). */
  selectFxObject: (sel: SelectedFxObject) => void;
  setZoom: (px: number) => void;
  setZoomMin: (pps: number) => void;
  zoomStep: (factor: number) => void;
  zoomFit: (containerW: number, duration: number) => void;
  togglePanel: (p: keyof UiState['panels']) => void;
  setMediaView: (v: 'grid' | 'list') => void;
  setSearch: (s: string) => void;
  setSortBy: (s: UiState['sortBy']) => void;
  setSortDir: (d: UiState['sortDir']) => void;
  /* R20-W3: selection-domain setters (see the state-field comment above) */
  selectTrack: (id: string | null) => void;
  selectEffect: (clipId: string, fxId: string | null) => void;
  toggleInspectorProjectMode: () => void;
  toggleMasterMute: () => void;
  setMasterVolume: (v: number) => void;
  setMediaW: (w: number) => void;
  setInspectorW: (w: number) => void;
  setMainBodyH: (h: number) => void;
  setCheatOpen: (v: boolean) => void;
  setMediaSelection: (ids: string[]) => void;
  toggleMediaSelection: (id: string, additive: boolean) => void;
  setMediaDrag: (d: UiState['mediaDrag']) => void;
  setFocusedTrack: (id: string | null) => void;
  moveFocusedTrack: (dir: 1 | -1) => void;
  pushToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  setSimulateSaveFail: (v: boolean) => void;
  retrySave: () => void;
  saveNow: () => void;
  removeMarkersAt: (time: number) => void;
  toggleTrackCmd: (sceneId: string, trackId: string, field: 'muted' | 'solo' | 'locked' | 'visible' | 'waveform') => void;
  enterAudioFocus: (trigger: 'dock' | 'shortcut' | 'escalation', trackId?: string) => void;
  exitAudioFocus: () => void;
  setMixerState: (m: MixerDockState) => void;
  cycleMixerState: () => void;
  toggleStripArm: (trackId: string) => void;
  toggleStripInserts: (trackId: string) => void;
  setAudioLaneBoost: (v: boolean) => void;
  setTrackHeightPref: (p: UiState['trackHeightPref']) => void;
  /** R20-W5 (thread #58): per-track height write. `px` is clamped by the
   *  store to [min, 240] where min = 32 for caption tracks (the 24px chip +
   *  4px insets floor) else 24 — the single owner of the law; `null` = reset
   *  to auto (key deleted). View state: no history entry ever. */
  setTrackHeight: (trackId: string, px: number | null) => void;
  setPoolModeFilter: (v: boolean) => void;
  setStripFocus: (id: string | null) => void;
  setMixerTrack: (trackId: string, patch: Partial<MixerTrackSettings>) => void;
  setAuxBus: (bus: 'a1' | 'a2', patch: Partial<AuxBusSettings>) => void;
  setDucking: (trackId: string, patch: Partial<DuckingSettings>) => void;
  /* R20-W4b grade sidecar + console view-state (C50/C51). */
  setGrade: (id: string, patch: GradePatch) => void;
  resetGrade: (id: string) => void;
  setColorInspectorTab: (tab: UiState['colorInspectorTab']) => void;
  /** R22-D3 → R23-WB: sets the scopes console state (dedicated setter —
   *  togglePanel is boolean-keyed; the 'open' state is the only visual now). */
  setColorScopesState: (state: UiState['colorScopesState']) => void;
  /** R22-D4 → R23-WB: toggles the node-graph viewer-region surface (D-B2). */
  toggleColorNodesDock: () => void;
  /** R23-WB (D-B3): the density override write ('auto' | 'on' | 'off'). */
  setTimelineCompact: (v: UiState['timelineCompact']) => void;
  /** R23-WB (D-B4): saves a Gallery still from a grade record (the id is
   *  minted HERE, monotonic over the existing ids — a delete can never cause
   *  a collision). View-state write, no history entry. */
  addColorStill: (grade: MockGrade, opts?: { name?: string; mediaId?: string | null }) => Still;
  /** R23-WB (D-B4): deletes a Gallery still by id. View-state write. */
  removeColorStill: (id: string) => void;
  setColorGradeTarget: (t: UiState['colorGradeTarget']) => void;
  setQualifierPreviewOn: (v: boolean) => void;
  setQualifierPickerOn: (v: boolean) => void;
  setColorNode: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  /* R15 T3 batch move: ONE history entry, doc mutation only. Laws (frame-snap,
     anchor clamp, zero-anchor, half-open overlap rejection w/ virtual
     removal, locked tracks, pre-minted new-track identity) live in
     applyMovesToScene + lib/timelinePlacement.resolveGroupMove. */
  moveElements: (args: { moves: MoveElementPlan[]; createTracks?: CreateTrackPlan[] }) => void;
  /** Alt+drag duplicate to the RESOLVED target: clones the ids, lands the
   *  copies at the planned positions — ONE composite history entry. */
  duplicateAndMove: (args: { ids: string[]; moves: MoveElementPlan[]; createTracks?: CreateTrackPlan[] }) => void;
  moveElement: (id: string, startTime: number) => void;
  /* R15 T4 trim family. FRAME-SNAP-ONCE / SINGLE OWNER: the GESTURE computes
     the final edge from ONE frame-snapped delta; the store applies the delta
     with NO independent re-snap of startTime/duration (the R14 re-snap could
     round the two fields in OPPOSITE directions, drifting the end off the
     frame grid). Bounds (neighbor, source extent, 1-frame min) may still pull
     a value off the grid — source-extent beats frame alignment (canonical). */
  /** batch trim: the selection trims together — per-member bounds
   *  INTERSECTED into one common delta; ONE history entry. */
  trimElements: (members: { id: string; edge: 'l' | 'r'; delta: number }[]) => void;
  /** legacy single-clip seam (tests / keyboard callers) — derives the delta
   *  and delegates to trimElements. */
  trimElement: (id: string, edge: 'l' | 'r', newStart: number, newDur: number) => void;
  /** roll (spec-06 §5.5): A's right edge + B's left edge move by the same
   *  delta — the junction slides, total duration preserved; ONE entry. */
  rollTrim: (aId: string, bId: string, delta: number) => void;
  /** ripple trim (R15 T4): trim the edge, then keep every LATER same-track
   *  clip glued to the trimmed clip's new end (freed intervals close, joined
   *  intervals open — the deleteElements interval math's unified form). */
  rippleTrim: (id: string, edge: 'l' | 'r', delta: number) => void;
  /** slip gesture (spec-06 §5.6): fixed position/duration, the source window
   *  slides within [0, extent − duration·rate] — CLAMPED (the preview is
   *  live-bounded); slipNudge keeps its no-op-out-of-bounds keyboard law. */
  slipDrag: (ids: string[], deltaFrames: number) => void;
  /** slide (spec-06 §5.7): the clip moves between its neighbors; the
   *  neighbors' facing edges follow (each clamped by its own min/source).
   *  No overlap ever — an edge capped by a source bound opens a gap instead. */
  slideMove: (id: string, newStart: number) => void;
  /** stretch / retime (spec-06 §5.8): duration changes, speed = span/duration
   *  compensates, rate clamp [0.01, 5]; ONE entry. */
  stretchTrim: (id: string, edge: 'l' | 'r', delta: number) => void;
  splitElement: (id: string, time: number) => void;
  toggleEffect: (elementId: string, fxId: string) => void;
  addTrack: (kind: TrackJSON['kind'], position?: 'above' | 'below', refTrackId?: string) => void;
  deleteElements: (ids: string[], ripple: boolean) => void;
  duplicateElements: (ids: string[], at?: number) => void;
  slipNudge: (ids: string[], frames: number) => void;
  trimToPlayhead: (edge: 'l' | 'r', ripple: boolean) => void;
  setElementField: (id: string, patch: Partial<ElementJSON>) => void;
  setTransition: (id: string, patch: Partial<NonNullable<ElementJSON['transitionOut']>>) => void;
  /* R23-WA (DESIGN-R23 D-A3): the ONE effective-fade writer for BOTH fade
   * domains (audio elements → audioFadeIn/Out, everything else →
   * fadeIn/Out; the field picker is mockData.fieldOfFade — single owner).
   * History-backed with the store-owned clamp [0, clip duration]; no-op
   * writes (same value) mint NO history entry (the gesture clamp-commit
   * law's twin). */
  setFade: (id: string, side: 'in' | 'out', seconds: number) => void;
  /* R23-WA: DELETE-AWARE removal — setElementField's Object.assign cannot
   * unset (R23-B correction 1), so both removes DELETE the field (the
   * undefined→delete grammar from insertPlan) under withHistory, and clear
   * a pointing selectedFxObject (the removeEffect belt-and-braces
   * precedent). */
  removeFade: (id: string, side: 'in' | 'out') => void;
  removeTransition: (id: string) => void;
  setEffectParam: (elementId: string, fxId: string, param: string, value: number) => void;
  addEffectToElement: (elementId: string, fx: Omit<EffectJSON, 'id'>) => void;
  removeEffect: (elementId: string, fxId: string) => void;
  loadSampleProject: () => void;
}

/* one minimum-duration law for every trim-family mutation — R15 T4 (spec-06
   §5.2 alignment, no registration): MIN_DUR = ONE FRAME (1/24 s), imported
   from lib/trimLaws.ts. The R14 0.25 s constant unified the trim family at a
   coarser floor than the engine spec's; 1 frame is the canonical law. */

/* R15 T8 (R15-F1 FIX 4a): the seek domain = the ACTIVE scene's duration
   (design T8 "replaces 600"). An empty scene clamps to [0, 0] — the
   playhead cannot leave a duration-less timeline. */
const activeSceneDuration = (s: UiState): number => {
  const sc = s.scenes.find((x) => x.id === s.activeSceneId) ?? s.scenes[0];
  return sc ? sceneDuration(sc) : 0;
};

/* history wrapper: snapshot before each doc mutation, 50-deep.
   Returning undefined from `mutate` = no-op: NOTHING is set (no history
   entry) — this is the contract the no-pollution comments in splitElement /
   removeMarkersAt / deleteScene describe. (R13: previously a no-op still
   pushed a history entry; the store test-suite pins the fixed behavior.)
   The snapshot carries `lockAll` alongside the doc because toggleLockAll
   fans out into the doc AND flips the view flag atomically — undoing one
   half of that pair left the flag inverted (aria-pressed lying, next toggle
   doing the OPPOSITE of its label).
   R20-W4b (C50): the snapshot ALSO carries mockGrades — grade writes ride
   the SAME wrapper (setGrade mutates the sidecar via a direct set() inside
   mutate, exactly the toggleLockAll fan-out pattern), so undo/redo
   round-trip grades one history entry per committed edit. Existing snapshot
   consumers assert their own fields — the extra key is additive. */
const HISTORY = 50;
interface HistoryEntry {
  scenes: SceneJSON[];
  activeSceneId: string;
  lockAll?: boolean;
  selection?: string[];
  /** R20-W4b (C50): the grade sidecar rides the snapshot. */
  mockGrades?: Record<string, MockGrade>;
}
function withHistory(set: (partial: any) => void, get: () => UiState, mutate: (scenes: SceneJSON[]) => SceneJSON[] | void) {
  const s = get();
  const before: HistoryEntry = { scenes: clone(s.scenes), activeSceneId: s.activeSceneId, lockAll: s.lockAll, selection: [...s.selection], mockGrades: cloneGrades(s.mockGrades) };
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

/* R19: overwrite-span resolution moved to lib/insertPlan.ts (R20-W2) as the
   recording twin planOverwriteSpans — the same trim engine (fully-covered →
   removed, head/tail straddles trimmed, middle straddle split with the
   R19-REV P2 split law) + a patch-op recording so preview and commit share
   ONE computation. Its only consumers were insertMediaAt's branches, all of
   which now go through the planner. */

let toastSeq = 1;
/* monotonic id suffix — Date.now() alone collides on same-millisecond creates
   (two rapid markers → identical ids → broken React keys + removal hits both;
   the R13 test suite pins id-uniqueness as a mock invariant, so the counter
   makes the invariant actually hold). */
let idSeq = 0;
const nextId = (prefix: string) => `${prefix}${Date.now().toString(36)}-${idSeq++}`;

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
  zoomMinPps: 5, // reconciled to the dynamic fit-min by the Timeline mount
  panels: { mediaPool: true, effects: false, inspector: true },
  mediaView: 'grid',
  search: '',
  sortBy: 'name',
  sortDir: 'asc',
  masterMuted: false,
  masterVolume: 0.78,
  mediaW: 280,
  inspectorW: 340,
  mainBodyH: 0, // 0 = auto (page-aware: 40% viewport; 55% on color, R22-D8)
  mainBodyUserSet: false,
  inspectorWUserSet: false,
  cheatOpen: false,
  scenes: clone(project.scenes),
  mediaSelection: ['m-02'],
  mediaDrag: null,
  focusedTrackId: null,
  selectedMarkerId: null,
  selectedTrackId: null,
  selectedEffectId: null,
  selectedEffectClipId: null,
  inspectorProjectMode: false,
  viewerMode: 'program',
  sourceMediaId: null,
  hoverInsertPreview: null, // R20-W2: view-state, never snapshotted
  sourceRanges: {}, // R22 #84/#85: per-media source trim ranges (view state)
  toasts: [],
  saveAttempt: 0,
  simulateSaveFail: false,
  past: [] as HistoryEntry[],
  future: [] as HistoryEntry[],
  mixer: createMixerScene(project.scenes.flatMap((sc) => sc.tracks.filter((t) => t.kind === 'audio').map((t) => t.id))),
  mixerState: 'collapsed',
  audioLaneBoost: false,
  stripFocus: null,
  stripFlash: 0,
  stripArm: {},
  stripInsertsOn: {},
  mixerFloorWarned: false,
  trackHeightPref: null,
  trackHeightOverrides: {}, // R20-W5: per-track view state, absent = auto
  poolModeFilter: true, // R20-W5: default ON — the audio page boots filtered
  /* R20-W4b: the grade sidecar boots EMPTY (absent key = identity grade);
     console view-state defaults: Primaries tab, Clip target, no matte
     preview, Primary node selected (C56 default binding). */
  mockGrades: {},
  colorInspectorTab: 'primaries',
  colorScopesState: 'off', // R22-D3/R23-WB: default OFF (#77 "shouldn't always be there")
  colorNodesDock: false, // R23-WB (D-B2): the viewer-region surface, default OFF
  timelineCompact: 'auto', // R23-WB (D-B3): per-page resolution until the user toggles
  colorStills: SEED_STILLS, // R23-WB (D-B4): the Gallery's seed stills (view state)
  colorGradeTarget: 'clip',
  qualifierPreviewOn: false,
  qualifierPickerOn: false,
  selectedColorNodeId: 'primary',
  fxMode: false, // R23-WA: the FX engine flag (setTool/setPage are the writers)
  selectedFxObject: null, // R23-WA: the FX selection domain

  setPage: (p) => set((s) => ({
    page: p,
    // leaving audio focus by ANY route resets the lane boost (design §3.3)
    ...(s.page === 'audio' && p !== 'audio' ? { audioLaneBoost: false } : {}),
    /* R23-WA (DESIGN-R23 Part IX ruling 2): entering the FX page sets fxMode,
       leaving it resets — the fx-page exit law (the audioLaneBoost pattern).
       A stranded FX TOOL would lie about the timeline mode after the reset,
       so the exit also re-seats it to select (one transition, one writer —
       the radio never claims fxMode that no longer holds). */
    fxMode: p === 'fx',
    ...(s.page === 'fx' && p !== 'fx' && s.tool === 'fx' ? { tool: 'select' as ToolId } : {}),
    /* R23-WB (DESIGN-R23 D-B5; issue #92 — SUPERSEDES #73's R22-era "mixer
       renders on ALL pages" for the color page, registered in the README
       deviation ledger): entering the color page collapses the mixer console
       (the audioLaneBoost exit-law pattern). The Toolbar2 toggle is
       Edit+Audio only now, so an open mixer carried into color would be
       unclosable from that page — the exit law keeps every console
       closable on the page that owns it. */
    ...(p === 'color' && s.mixerState !== 'collapsed' ? { mixerState: 'collapsed' as MixerDockState } : {}),
  })),
  setActiveScene: (id) => set((s) => {
    // lockAll is scene-derived view state — re-derive on switch so the toolbar
    // pressed-state never lies about the newly active scene (R13: previously
    // the flag stuck from the previous scene and the next click did the
    // OPPOSITE of its label on the fresh scene)
    const sc = s.scenes.find((x) => x.id === id);
    // R15-V2 P3: reconcile a stale playhead beyond the NEW scene's duration
    // (display-only staleness otherwise — every write path clamps, but the
    // ruler/TC read shows the old position until the first tick)
    const newDur = sc ? sceneDuration(sc) : 0;
    const playhead = Math.min(s.playhead, newDur);
    return {
      activeSceneId: id,
      selection: [],
      playhead,
      /* R20-W3: the track/effect domains die with the scene switch (stale ids) */
      selectedTrackId: null,
      selectedEffectId: null,
      selectedEffectClipId: null,
      /* R23-WA: the FX domain dies with the scene switch (stale element ids —
         the same law as the effect/track domains). */
      selectedFxObject: null,
      ...(sc ? { lockAll: sc.tracks.every((t) => t.locked) } : {}),
    };
  }),
  createScene: () => withHistory(set, get, (scenes) => {
    const n = scenes.length + 1;
    const sc: SceneJSON = {
      id: nextId('sc-'),
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
  /* R23-WA (Part IX ruling 2 — fxMode single source): setTool is the writer
     OFF the FX page (fx tool ⇔ fxMode); ON the FX page the PAGE owns the
     flag, so tool changes there never kill the engine (the page has no
     Escape rung — a page, not a mode; Escape's tool→select rung stays
     harmless there). */
  setTool: (t) => set((s) => ({ tool: t, fxMode: s.page === 'fx' ? true : t === 'fx' })),
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
  toggleMuteAll: () => {
    // spec 16 §3.5 ⌘⇧M "mute all tracks" — set-all batch (undoable), the
    // audio twin of toggleLockAll. Target = NOT all-muted so a mixed state
    // converges to muted on one press (no per-track flip-flop).
    withHistory(set, get, (scenes) => {
      const s = get();
      const sc = scenes.find((x) => x.id === s.activeSceneId)!;
      const target = !sc.tracks.every((t) => t.muted);
      sc.tracks.forEach((t) => { t.muted = target; });
      return scenes;
    });
  },
  setPlayhead: (t) => set((s) => ({ playhead: clamp(t, 0, activeSceneDuration(s)) })), // R15 T8: clamp [0, scene duration]
  nudgePlayhead: (frames) => set((s) => ({ playhead: clamp(s.playhead + frames / 24, 0, activeSceneDuration(s)) })),
  togglePlay: () => set((s) => ({ playing: !s.playing, playRate: 1 })),
  setPlaying: (p) => set({ playing: p, ...(p ? {} : { playRate: 1 }) }),
  setShuttle: (rate) => set({ playRate: rate, playing: rate !== 0 }),
  setLoopEnabled: (v) => set({ loopEnabled: v }),
  toggleViewerOverlays: () => set((s) => ({ viewerOverlays: !s.viewerOverlays })),
  toggleViewerSafeGuides: () => set((s) => ({ viewerSafeGuides: !s.viewerSafeGuides })),
  markIn: () => set((s) => {
    // ordering law (R14): start <= end ALWAYS — an inverted window pegs the
    // playback tick (t >= end resets to start) and the playhead never advances
    // (R13 review found the hang). Setting in past out drags out along.
    const start = snapToFrame(s.playhead);
    return { loop: { ...s.loop, start, end: Math.max(s.loop.end, start) } };
  }),
  markOut: () => set((s) => {
    const end = snapToFrame(s.playhead);
    return { loop: { ...s.loop, end, start: Math.min(s.loop.start, end) } };
  }),
  clearInOut: () => set((s) => ({ loop: { ...s.loop, start: 0, end: s.scenes.find((x) => x.id === s.activeSceneId) ? (function () { const sc = s.scenes.find((x) => x.id === s.activeSceneId)!; let d = 0; for (const t of sc.tracks) for (const e of t.elements) d = Math.max(d, e.startTime + e.duration); return d || 30; })() : 30 } })),
  clearLoopIn: () => set((s) => ({ loop: { ...s.loop, start: 0 } })),
  clearLoopOut: () => set((s) => ({
    // spec 16 §3.1 ⌘⇧O "clear out" — the out half reverts to the scene tail
    // (open-ended), same computation clearInOut uses for its end.
    loop: { ...s.loop, end: (function () { const sc = s.scenes.find((x) => x.id === s.activeSceneId); if (!sc) return 30; let d = 0; for (const t of sc.tracks) for (const e of t.elements) d = Math.max(d, e.startTime + e.duration); return d || 30; })() },
  })),
  addMarker: (time, color) => withHistory(set, get, (scenes) => {
    const s = get();
    const sc = scenes.find((x) => x.id === s.activeSceneId)!;
    const colors: Marker['color'][] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'];
    sc.markers.push({ id: nextId('mk-'), time: snapToFrame(time), label: 'Marker', color: color ?? colors[sc.markers.length % 8] });
    return scenes;
  }),

  /* ---- R19 marker v2 / captions / source-preview / edit-overlay ---- */

  selectMarker: (id) => set((s) => ({
    selectedMarkerId: id,
    /* mutual exclusivity (one selection domain at a time): picking a marker
       clears the clip selection so the inspector rail swaps domains cleanly.
       R20-W3: the track/effect domains clear too (selectTrack law's mirror).
       R23-WA: the FX domain joins the clear (all six sites — D-A3). */
    ...(id ? {
      selection: [],
      selectedTrackId: null,
      selectedEffectId: null,
      selectedEffectClipId: null,
      selectedFxObject: null,
      inspectorProjectMode: false,
    } : {}),
  })),
  updateMarker: (id, patch) => withHistory(set, get, (scenes) => {
    const s = get();
    const sc = scenes.find((x) => x.id === s.activeSceneId)!;
    const m = sc.markers.find((x) => x.id === id);
    if (!m) return; // unknown marker — true no-op
    const dur = sceneDuration(sc) || 30;
    if (patch.time !== undefined) m.time = Math.max(0, Math.min(snapToFrame(patch.time), dur));
    if (patch.duration !== undefined) {
      // range law: >= 1 frame, end clamped to scene duration; undefined/neg → point
      m.duration = patch.duration === null ? undefined : Math.max(1 / 24, Math.min(snapToFrame(patch.duration), dur - m.time));
    }
    if (patch.label !== undefined) m.label = patch.label;
    if (patch.notes !== undefined) m.notes = patch.notes;
    if (patch.keyword !== undefined) m.keyword = patch.keyword;
    if (patch.color !== undefined) m.color = patch.color;
    return scenes;
  }),
  removeMarker: (id) => withHistory(set, get, (scenes) => {
    const s = get();
    const sc = scenes.find((x) => x.id === s.activeSceneId)!;
    const before = sc.markers.length;
    sc.markers = sc.markers.filter((m) => m.id !== id);
    if (sc.markers.length === before) return;
    if (s.selectedMarkerId === id) set({ selectedMarkerId: null });
    return scenes;
  }),
  addClipMarker: (elementId, offset, color) => withHistory(set, get, (scenes) => {
    const s = get();
    const hit = findEl(scenes, elementId);
    if (!hit) return;
    const { el } = hit;
    el.markers = el.markers ? [...el.markers] : [];
    const colors: Marker['color'][] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'];
    el.markers.push({
      id: nextId('cm-'),
      offset: Math.max(0, Math.min(snapToFrame(offset), Math.max(0, el.duration - 1 / 24))),
      label: 'Clip marker',
      color: color ?? colors[el.markers.length % 8],
    });
    return scenes;
  }),
  removeClipMarker: (elementId, markerId) => withHistory(set, get, (scenes) => {
    const hit = findEl(scenes, elementId);
    if (!hit || !hit.el.markers) return;
    const before = hit.el.markers.length;
    hit.el.markers = hit.el.markers.filter((m) => m.id !== markerId);
    if (hit.el.markers.length === before) return;
    if (hit.el.markers.length === 0) delete hit.el.markers;
    return scenes;
  }),
  addCaption: (prevId) => withHistory(set, get, (scenes) => {
    const s = get();
    const hit = findEl(scenes, prevId);
    if (!hit || hit.track.kind !== 'caption') return;
    const { track, el } = hit;
    // first free slot at/after the previous caption's end (frame-snapped)
    let start = snapToFrame(el.startTime + el.duration);
    const sorted = [...track.elements].sort((a, b) => a.startTime - b.startTime);
    for (const e of sorted) {
      if (e.startTime + e.duration <= start + 1e-9) continue;
      if (e.startTime < start + 1.5 - 1e-9) { start = snapToFrame(e.startTime + e.duration); }
      else break;
    }
    const n = track.elements.length + 1;
    track.elements.push({
      id: nextId('cap-'), type: 'text', trackId: track.id, name: `Sub ${n}`,
      startTime: start, duration: 1.5, text: 'New caption',
    });
    return scenes;
  }),
  enterSourcePreview: (mediaId) => set({ viewerMode: 'source', sourceMediaId: mediaId }),
  /* R20-W2 (DESIGN-R20 D2): exiting source preview also DISARMS the hover
     preview — program mode is the output view and never previews inserts
     (the guard is the law, the clearing is the side-effect). */
  exitSourcePreview: () => set({ viewerMode: 'program', sourceMediaId: null, hoverInsertPreview: null }),
  /* R22 #84/#85: the source trim-range setters — clamp to the media's
   * duration; in < out always (an inverted/equal range refuses by keeping
   * the previous edge — the honest guard, no silent snap). */
  setSourceRangeIn: (mediaId, t) => set((s) => {
    const dur = mediaById(mediaId)?.duration;
    const cur = s.sourceRanges[mediaId] ?? { in: 0, out: dur ?? 0 };
    const v = Math.max(0, Math.min(t, cur.out - 1 / 24));
    return { sourceRanges: { ...s.sourceRanges, [mediaId]: { in: v, out: cur.out } } };
  }),
  setSourceRangeOut: (mediaId, t) => set((s) => {
    const dur = mediaById(mediaId)?.duration;
    const cur = s.sourceRanges[mediaId] ?? { in: 0, out: dur ?? 0 };
    const v = Math.min(dur ?? t, Math.max(t, cur.in + 1 / 24));
    return { sourceRanges: { ...s.sourceRanges, [mediaId]: { in: cur.in, out: v } } };
  }),
  clearSourceRange: (mediaId) => set((s) => {
    const next = { ...s.sourceRanges };
    delete next[mediaId];
    return { sourceRanges: next };
  }),
  /* R20-W2: view-state arm/disarm for the hover-placement preview — plain
     set, deliberately OUTSIDE any withHistory call (hovering can never mint
     an undo entry; the snapshot slice stays scenes/activeSceneId/lockAll/
     selection). */
  setHoverInsertPreview: (v) => set({ hoverInsertPreview: v }),

  /* ---- R19 insertMediaAt: the 7 Resolve edit functions (nle_edit_workflow
     reference), real placement against the same laws the drag/trim gestures
     use (timelinePlacement + frame-snap + half-open spans). ONE history entry
     per op. Modes that lack their inputs degrade to honest toasts (replace:
     no selection; fitToFill: no loop range) — never a silent no-op.
     R20-W2 (REV-B P2-4/P2-5): thin wrapper — plan (pure, lib/insertPlan,
     REAL idFactory so committed ids are real) → applyInsertPlan. All the
     placement laws, split laws, marker re-offsets, ripple shifts, audio
     type-wins routing and toast payloads are the planner's; behavior is
     equal to the pre-split monolith (the store suite pins it; the new
     preview==commit geometry test is the WYSIWYG guarantee). */
  insertMediaAt: (mediaId, mode, opts) => {
    const s = get();
    const ctx: InsertPlanContext = {
      playhead: s.playhead,
      loop: s.loop,
      selection: s.selection,
      ...(opts?.time !== undefined ? { time: opts.time } : {}),
      ...(opts?.targetTrackId !== undefined ? { targetTrackId: opts.targetTrackId } : {}),
      /* R22 #84/#85: the SOURCE viewer's trimmed range rides the plan —
       * the placed clip references sourceStart + the range length. */
      ...(s.sourceRanges?.[mediaId] ? { sourceRange: { start: s.sourceRanges[mediaId]!.in, end: s.sourceRanges[mediaId]!.out } } : {}),
    };
    const plan = planInsertMedia(s.scenes, s.activeSceneId, mediaId, mode, ctx, nextId);
    get().applyInsertPlan(plan);
  },

  /* ---- R20-W2 applyInsertPlan: the commit half. Executes the plan's patch
     ops IN EMISSION ORDER (mirroring the planner's dry-run exactly) on the
     withHistory clone: ONE undo entry, toasts preserved verbatim
     (plan.reason = the refusal toast, plan.toast = the success toast),
     set({selection: []}) ONLY for the 5 shared modes (replace/fitToFill do
     NOT clear selection today — plan.clearSelection is the planner's law).
     A stale plan (scene/tracks gone since planning — only possible if an
     old plan object is applied) leaves BOTH the doc and the toast stack
     untouched: undefined from mutate = no history entry (withHistory's
     no-op contract). */
  applyInsertPlan: (plan) => {
    if (!plan.ok) {
      // honest refusal — never a silent no-op (the no-reason variant is the
      // preserved no-active-scene silence of the old monolith)
      if (plan.reason) get().pushToast(plan.reason);
      return;
    }
    const before = get().scenes;
    withHistory(set, get, (scenes) => {
      const sc = scenes.find((x) => x.id === plan.sceneId);
      if (!sc) return; // stale — no history entry, no toast
      const affected = new Set<string>();
      for (const op of plan.patch) {
        if (op.op === 'createTrack') {
          sc.tracks.splice(Math.min(op.insertIndex, sc.tracks.length), 0, op.track);
          continue;
        }
        const t = sc.tracks.find((x) => x.id === op.trackId);
        if (!t) return; // stale — abort before any history entry
        if (op.op === 'insertElement') {
          t.elements.push(op.element);
        } else if (op.op === 'removeElement') {
          t.elements = t.elements.filter((e) => e.id !== op.id);
        } else {
          const el = t.elements.find((e) => e.id === op.id);
          if (!el) return; // stale — abort before any history entry
          for (const [k, v] of Object.entries(op.fields)) {
            if (v === undefined) delete (el as unknown as Record<string, unknown>)[k]; // transitionOut/linkedTo SEVER
            else (el as unknown as Record<string, unknown>)[k] = v;
          }
        }
        affected.add(t.id);
      }
      // lanes stay time-ordered (every branch of the old monolith sorted the
      // touched track; the applier sorts exactly the affected ones)
      for (const tid of affected) {
        const t = sc.tracks.find((x) => x.id === tid);
        if (t) t.elements.sort((a, b) => a.startTime - b.startTime);
      }
      if (plan.clearSelection) set({ selection: [] }); // 5 shared modes only — inside the entry, like today
      return scenes;
    });
    if (get().scenes === before) return; // no-op (stale plan) — no toast
    get().pushToast(plan.toast!);
  },

  setSelection: (ids) => set((s) => ({
    selection: ids,
    selectedMarkerId: null,
    selectedTrackId: null,
    /* the effect domain survives ONLY while its clip stays selected (D4.2) */
    ...(s.selectedEffectClipId !== null && !ids.includes(s.selectedEffectClipId)
      ? { selectedEffectId: null, selectedEffectClipId: null }
      : {}),
    /* R23-WA: the FX domain survives while its element stays selected (the
       effect domain's own survival law, mirrored — the fade-object press
       selects the clip AND the object in one gesture). */
    ...(s.selectedFxObject !== null && !ids.includes(s.selectedFxObject.elementId)
      ? { selectedFxObject: null }
      : {}),
    inspectorProjectMode: false,
  })),
  selectElement: (id, additive) => set((s) => {
    // spec 05 §12.3 linked selection: "selecting one selects both" — the A/V
    // pair (el-2 ↔ el-7 in the fixture) enters/leaves the selection as a
    // group. Moves stay independent (sync-lock is 06 §6, a seal item).
    const pairOf = (target: string): string[] => {
      // link toggle GATES pair propagation (R14 — the flag was previously
      // inert: pairs propagated with the toggle off). ON = 05 §12.3
      // "selecting one selects both"; OFF = plain single selection.
      // (Sync-lock move-following stays 06 §6, a seal item — never claimed.)
      if (!s.link) return [target];
      const hit = findEl(s.scenes, target);
      const other = hit?.el.linkedTo;
      return other && other !== target ? [target, other] : [target];
    };
    const group = pairOf(id);
    /* R20-W3 domain laws: a fresh clip selection clears the marker/track
       domains and exits project mode; the effect domain survives only when
       its clip stays in the new selection (toggle-off drops it). R23-WA:
       the FX domain rides the same survival law. */
    const keepFx = (next: string[]) =>
      s.selectedEffectClipId !== null && next.includes(s.selectedEffectClipId);
    const fxClear = (next: string[]): Partial<UiState> =>
      (keepFx(next) ? {} : { selectedEffectId: null, selectedEffectClipId: null });
    const keepFxObj = (next: string[]) =>
      s.selectedFxObject !== null && next.includes(s.selectedFxObject.elementId);
    const fxObjClear = (next: string[]): Partial<UiState> =>
      (keepFxObj(next) ? {} : { selectedFxObject: null });
    const domainClear = (next: string[]): Partial<UiState> => ({ ...fxClear(next), ...fxObjClear(next) });
    if (!additive) return { selection: group, selectedMarkerId: null, selectedTrackId: null, inspectorProjectMode: false, ...domainClear(group) };
    const groupSelected = group.every((x) => s.selection.includes(x));
    if (groupSelected) {
      const next = s.selection.filter((x) => !group.includes(x));
      return { selection: next, ...domainClear(next) };
    }
    const grown = [...s.selection.filter((x) => !group.includes(x)), ...group];
    return { selection: grown, selectedMarkerId: null, selectedTrackId: null, inspectorProjectMode: false, ...domainClear(grown) };
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
  setZoom: (px) => set((s) => ({ pxPerSec: clamp(px, Math.max(MIN_PPS, s.zoomMinPps), MAX_PPS) })),
  // dynamic min (spec-05 §5.2): view state write from the Timeline's live
  // measurement; also reconciles a now-out-of-bounds zoom UP to the min
  setZoomMin: (pps) => set((s) => {
    const min = clamp(pps, MIN_PPS, MAX_PPS);
    const patch: Partial<UiState> = { zoomMinPps: min };
    if (s.pxPerSec < min) patch.pxPerSec = min;
    return patch as UiState;
  }),
  /* R15-F1 P3 (documented skip): zoomStep/zoomFit stay STORE-level seams —
     routing them through zoomBus would import zoomController, which imports
     THIS module: a module-evaluation cycle (the controller instantiates at
     import time and reads useUi.getState() in its class fields — TDZ crash
     when this module is evaluated first). Every COMPONENT zoom path already
     routes through the bus (toolbar / shortcuts / wheel); these two remain
     the raw store API the zoom unit tests pin. */
  zoomStep: (factor) => set((s) => ({ pxPerSec: clamp(s.pxPerSec * factor, Math.max(MIN_PPS, s.zoomMinPps), MAX_PPS) })),
  zoomFit: (containerW, duration) => set((s) => ({ pxPerSec: clamp((containerW - 24) / (Math.max(duration, 0.001) + 2), Math.max(MIN_PPS, s.zoomMinPps), MAX_PPS) })),
  togglePanel: (p) => set((s) => ({ panels: { ...s.panels, [p]: !s.panels[p] } })),
  setMediaView: (v) => set({ mediaView: v }),
  setSearch: (s) => set({ search: s }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortDir: (d) => set({ sortDir: d }),
  /* R20-W3: the domain-clearing spread shared by every selection write —
     mirrors the selectedMarkerId law (selectMarker :775): one selection
     domain at a time. The effect domain dies with its clip: setSelection /
     selectElement drop it unless the new selection still holds the clip. */
  selectTrack: (id) => set((s) => ({
    selectedTrackId: id,
    ...(id ? {
      selection: [],
      selectedMarkerId: null,
      selectedEffectId: null,
      selectedEffectClipId: null,
      selectedFxObject: null, // R23-WA: the FX domain dies with the track takeover
      inspectorProjectMode: false,
    } : {}),
  })),
  selectEffect: (clipId, fxId) => set((s) => ({
    selectedEffectId: fxId,
    selectedEffectClipId: fxId ? clipId : null,
    ...(fxId ? {
      /* the effect's clip STAYS selected (the accordion expands in place);
       * the track + marker domains clear, project mode exits */
      selectedTrackId: null,
      selectedMarkerId: null,
      /* R23-WA: the FX⇄effect domain swap — both are clip-children, one
       * sub-domain at a time (selecting effect params retires the FX target). */
      selectedFxObject: null,
      inspectorProjectMode: false,
    } : {}),
  })),
  /* R23-WA (DESIGN-R23 D-A3): the FX-object selection write — the selectEffect
     mirror (clip selection survives; marker/track/effect domains clear). */
  selectFxObject: (sel) => set((s) => ({
    selectedFxObject: sel,
    selectedMarkerId: null,
    selectedTrackId: null,
    selectedEffectId: null,
    selectedEffectClipId: null,
    inspectorProjectMode: false,
  })),
  toggleInspectorProjectMode: () => set((s) => ({ inspectorProjectMode: !s.inspectorProjectMode })),
  toggleMasterMute: () => set((s) => ({ masterMuted: !s.masterMuted })),
  setMasterVolume: (v) => set({ masterVolume: clamp(v, 0, 1) }),
  setMediaW: (w) => set({ mediaW: clamp(w, 200, 480) }),
  setInspectorW: (w) => set({ inspectorW: clamp(w, 280, 560), inspectorWUserSet: true }),
  setMainBodyH: (h) => set({ mainBodyH: h <= 0 ? 0 : clamp(h, 320, 900), mainBodyUserSet: true }), // 0 = auto (page-aware default, R22-D8; spec 18 §3.2)
  setCheatOpen: (v) => set({ cheatOpen: v }),
  setMediaSelection: (ids) => set({ mediaSelection: ids }),
  toggleMediaSelection: (id, additive) => set((s) => {
    // range selection is OWNED by MediaPool (it has the flat filtered order +
    // the click anchor); this action only handles replace/additive-toggle.
    // (R13: the old `range` param was a stub behaving as additive-toggle —
    // signature advertised behavior the store never had.)
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
  saveNow: () => set((s) => ({ saveAttempt: s.saveAttempt + 1 })), // ⌘S: runs the save cycle WITHOUT clearing a armed simulateSaveFail drill

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
      /* R23-WA (Part IX ruling 2 — the fx-page exit law): this action writes
         `page` RAW (it seeds mixer state in the same commit), so it must
         carry setPage's coupling itself — leaving the FX page resets fxMode
         and re-seats a stranded FX tool, else the audio page would render
         the FX engine's seam zones on a page that never asked for them. */
      fxMode: false,
      ...(s.page === 'fx' && s.tool === 'fx' ? { tool: 'select' as ToolId } : {}),
      mixer,
      mixerState: 'full',
      audioLaneBoost: true,
      ...(trackId || trigger === 'escalation' ? { stripFocus: trackId ?? s.stripFocus } : {}),
      stripFlash: trackId ? Date.now() : s.stripFlash,
    };
  }),
  /* R23-WA (ruling 2, same law): exit lands on Edit — not the FX page — so
     the engine must be off there too (belt-and-braces: exit is only
     reachable from the audio page, where fxMode is already false). */
  exitAudioFocus: () => set((s) => ({
    page: 'edit',
    audioLaneBoost: false,
    fxMode: false,
    ...(s.page === 'fx' && s.tool === 'fx' ? { tool: 'select' as ToolId } : {}),
  })),
  setMixerState: (m) => set({ mixerState: m }),
  cycleMixerState: () => set((s) => {
    // R20-W1 (DESIGN-R20 D1.4, thread #61): Edit — collapsed → meters →
    // full → collapsed; Audio — meters ↔ full (the page-aware branch is
    // PRESERVED from the v2.2 revision — pinned by useUiStore.test).
    if (s.page === 'audio') return { mixerState: s.mixerState === 'full' ? 'meters' : 'full' };
    return { mixerState: s.mixerState === 'collapsed' ? 'meters' : s.mixerState === 'meters' ? 'full' : 'collapsed' };
  }),
  toggleStripArm: (trackId) => set((s) => ({ stripArm: { ...s.stripArm, [trackId]: !(s.stripArm[trackId] ?? false) } })),
  toggleStripInserts: (trackId) => set((s) => ({ stripInsertsOn: { ...s.stripInsertsOn, [trackId]: !(s.stripInsertsOn[trackId] ?? true) } })),
  setAudioLaneBoost: (v) => set({ audioLaneBoost: v }),
  setTrackHeightPref: (p) => set({ trackHeightPref: p }), /* §4.9 Height pref — view state, no history */
  setTrackHeight: (trackId, px) => set((s) => {
    /* R20-W5 (thread #58): clamp law lives HERE (single owner) — min 32 for
       caption tracks (the 24px chip + 4px insets floor), else 24; max 240.
       The kind lookup scans scenes (a track exists in exactly one scene;
       unknown ids get the generic 24 floor — harmless). */
    const kind = (() => {
      for (const sc of s.scenes) {
        const hit = sc.tracks.find((t) => t.id === trackId);
        if (hit) return hit.kind;
      }
      return null;
    })();
    if (px === null) {
      const next = { ...s.trackHeightOverrides };
      delete next[trackId];
      return { trackHeightOverrides: next };
    }
    const min = kind === 'caption' ? 32 : 24;
    const clamped = Math.round(Math.min(240, Math.max(min, px)));
    return { trackHeightOverrides: { ...s.trackHeightOverrides, [trackId]: clamped } };
  }),
  setPoolModeFilter: (v) => set({ poolModeFilter: v }), /* R20-W5: view state, no history */
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

  /* ---- R20-W4b: grade sidecar + console view-state ---- */
  setGrade: (id, patch) => withHistory(set, get, (scenes) => {
    const s = get();
    const base = s.mockGrades[id] ?? DEFAULT_MOCK_GRADE;
    const merged = mergeGrade(base, patch);
    if (gradeEqual(merged, base)) return; // no-op → no history entry
    // scenes ride along unchanged (the clone IS the new doc); the sidecar is
    // the real payload — the toggleLockAll fan-out pattern.
    set({ mockGrades: { ...s.mockGrades, [id]: merged } });
    return scenes;
  }),
  resetGrade: (id) => withHistory(set, get, (scenes) => {
    const s = get();
    if (!(id in s.mockGrades)) return; // already identity → no history entry
    const next = { ...s.mockGrades };
    delete next[id];
    set({ mockGrades: next });
    return scenes;
  }),
  setColorInspectorTab: (tab) => set({ colorInspectorTab: tab }),
  setColorScopesState: (state) => set({ colorScopesState: state }),
  toggleColorNodesDock: () => set((s) => ({ colorNodesDock: !s.colorNodesDock })),
  setTimelineCompact: (v) => set({ timelineCompact: v }),
  /* R23-WB (D-B4): the Gallery writes — plain view-state `set`, never a
   *  withHistory entry (the sourceRanges law: stills are captured working
   *  state, not doc edits; the APPLY path is the one that mints history via
   *  rec.setGrade). The id counter is monotonic over the live list so a
   *  delete-then-save can never mint a colliding id. */
  addColorStill: (grade, opts) => {
    const s = get();
    const n = s.colorStills.reduce((m, st) => {
      const v = Number(st.id.replace(/^still-/, ''));
      return Number.isFinite(v) ? Math.max(m, v) : m;
    }, 0) + 1;
    const still: Still = {
      id: `still-${String(n).padStart(2, '0')}`,
      name: opts?.name ?? `Still ${n}`,
      mediaId: opts?.mediaId ?? null,
      /* deep copy the record (qualifier + curves are objects — the capture
         must not alias the live grade the user keeps editing) */
      grade: {
        ...grade,
        ...(grade.qualifier ? { qualifier: { ...grade.qualifier } } : {}),
        ...(grade.curves ? { curves: { master: grade.curves.master.map((pt) => ({ ...pt })) } } : {}),
      },
    };
    set({ colorStills: [...s.colorStills, still] });
    return still;
  },
  removeColorStill: (id) => set((s) => ({ colorStills: s.colorStills.filter((st) => st.id !== id) })),
  setColorGradeTarget: (t) => set({ colorGradeTarget: t }),
  setQualifierPreviewOn: (v) => set({ qualifierPreviewOn: v }),
  setQualifierPickerOn: (v) => set({ qualifierPickerOn: v }),
  /* C56: node selection is view-state (never snapshotted); 'primary' and
     'secondary' are the two honest bindings — selecting them routes the
     console tab to the surface they own (the node graph's click handler
     does the routing; the store only records the selection). */
  setColorNode: (id) => set({ selectedColorNodeId: id }),

  undo: () => set((s) => {
    if (s.past.length === 0) return {};
    const prev = s.past[s.past.length - 1];
    return {
      past: s.past.slice(0, -1),
      future: [{ scenes: clone(s.scenes), activeSceneId: s.activeSceneId, lockAll: s.lockAll, selection: [...s.selection], mockGrades: cloneGrades(s.mockGrades) }, ...s.future].slice(0, HISTORY),
      scenes: prev.scenes,
      activeSceneId: prev.activeSceneId,
      ...(prev.lockAll !== undefined ? { lockAll: prev.lockAll } : {}),
      ...(prev.selection !== undefined ? { selection: [...prev.selection] } : {}),
      /* R20-W4b (C50): round-trip the grade sidecar with the doc — a grade
         write undone restores the pre-edit grades (view-state stays). */
      ...(prev.mockGrades !== undefined ? { mockGrades: prev.mockGrades } : {}),
    };
  }),
  redo: () => set((s) => {
    if (s.future.length === 0) return {};
    const next = s.future[0];
    return {
      future: s.future.slice(1),
      past: [...s.past, { scenes: clone(s.scenes), activeSceneId: s.activeSceneId, lockAll: s.lockAll, selection: [...s.selection], mockGrades: cloneGrades(s.mockGrades) }].slice(-HISTORY),
      scenes: next.scenes,
      activeSceneId: next.activeSceneId,
      ...(next.lockAll !== undefined ? { lockAll: next.lockAll } : {}),
      ...(next.selection !== undefined ? { selection: [...next.selection] } : {}),
      ...(next.mockGrades !== undefined ? { mockGrades: next.mockGrades } : {}),
    };
  }),

  // ---- document mutations (mock-level; real shell = EngineCommand) ----
  /* locked-track law: every element-level mutation is inert on locked tracks
     (spec 18 §4.5 lock; gestures already gate at the component level — these
     store guards close the keyboard/command surface: ⌘B, Delete, ⌘D, slip,
     inspector fan-out writes). Track-level flags (M/S/L) stay togglable. */
  /* R15 T3: moveElement DELEGATES to the batch engine (applyMovesToScene) —
     same frame-snap / anchor-clamp / zero-anchor / half-open-overlap laws as
     moveElements. CONTRACT CHANGE (canonical, spec-05 §8.3): the old mock
     silently stacked overlapping moves; now an overlapping move is REJECTED
     (element stays, no history entry). */
  moveElement: (id, startTime) => withHistory(set, get, (scenes) => {
    const s = get();
    const sc = scenes.find((x) => x.id === s.activeSceneId);
    if (!sc) return;
    const hit = findInScene(sc, id);
    if (!hit || hit.track.locked) return;
    if (!applyMovesToScene(sc, [{ id, trackId: hit.track.id, startTime }], []).applied) return;
    return scenes;
  }),
  moveElements: ({ moves, createTracks = [] }) => withHistory(set, get, (scenes) => {
    const s = get();
    const sc = scenes.find((x) => x.id === s.activeSceneId);
    if (!sc) return;
    if (!applyMovesToScene(sc, moves, createTracks).applied) return; // no-op / rejected → no history
    return scenes;
  }),
  duplicateAndMove: ({ ids, moves, createTracks = [] }) => withHistory(set, get, (scenes) => {
    const s = get();
    const sc = scenes.find((x) => x.id === s.activeSceneId);
    if (!sc) return;
    /* R15-F1 FIX 1: ATOMIC Alt-drag duplicate. The clones are MINTED but
       never pre-parked on the source lanes — the remapped moves are validated
       as VIRTUAL clones against the current scene, where the ORIGINALS stay
       (a duplicate leaves them in place, so a copy must clear its own
       original like any other stationary clip; the preview over the
       originals-as-movers is the only place those spans ever vacate). The
       batch is all-or-nothing — the preview's whole-batch law — so a partial
       rejection can never strand an un-lifted copy on top of its original.
       A rejected batch is an honest toast (the review's silent single-clip
       no-op), no mutation, no history entry. */
    const virtual = new Map<string, ElementJSON>();
    for (const id of [...new Set(ids)]) {
      const hit = findInScene(sc, id);
      if (!hit || hit.track.locked) continue;
      const copy = cloneEl(hit.el);
      copy.id = nextId(`${id}-d`);
      virtual.set(id, copy);
    }
    if (virtual.size === 0) return;
    const remapped = moves.filter((m) => virtual.has(m.id)).map((m) => ({ ...m, id: virtual.get(m.id)!.id }));
    const verdict = applyMovesToScene(sc, remapped, createTracks, {
      hasNewElements: true,
      atomic: true,
      virtualElements: new Map([...virtual.entries()].map(([el0, el]) => [el.id, el] as const)),
    });
    if (!verdict.applied) {
      s.pushToast(dragRejectionToast(verdict.reason ?? 'overlap'));
      return; // no mutation, no history — withHistory discards the cloned scene
    }
    set({ selection: [...virtual.values()].map((el) => el.id) });
    return scenes;
  }),
  /* ---- R15 T4 trim family ---- */
  /* trimElements engine: bounds = the INTERSECTION of every member's
     neighbor/source/min bounds (tightest wins — the selection moves its
     edges by ONE common delta), NO re-snap (single owner: the gesture's
     frame-snapped delta is trusted), −0 → 0, NOOP batches never create
     history (canonical). */
  trimElements: (members) => withHistory(set, get, (scenes) => {
    const s = get();
    const sc = scenes.find((x) => x.id === s.activeSceneId);
    if (!sc) return;
    const bounds = batchTrimBounds(sc, members);
    if (!bounds || bounds.lo > bounds.hi) return; // nothing resolvable / empty intersection
    let changed = false;
    for (const m of members) {
      const hit = findInScene(sc, m.id);
      if (!hit || hit.track.locked) continue;
      const d = clamp(m.delta, bounds.lo, bounds.hi);
      if (d === 0) continue; // −0 → 0 (canonical)
      const el = hit.el;
      if (m.edge === 'l') {
        const start = el.startTime + d;
        const dur = el.duration - d;
        if (start === el.startTime && dur === el.duration) continue;
        if (el.sourceStart !== undefined) el.sourceStart = el.sourceStart + d;
        el.startTime = start;
        el.duration = dur;
        changed = true;
      } else {
        const dur = el.duration + d;
        if (dur === el.duration) continue;
        el.duration = dur;
        changed = true;
      }
    }
    if (!changed) return;
    return scenes;
  }),
  trimElement: (id, edge, newStart, newDur) => withHistory(set, get, (scenes) => {
    const s = get();
    const sc = scenes.find((x) => x.id === s.activeSceneId);
    if (!sc) return;
    const hit = findInScene(sc, id);
    if (!hit) return;
    // derive the delta from the (gesture-trusted) absolute fields and route
    // through the batch engine — same bounds, same no-pollution contract
    const delta = edge === 'l' ? newStart - hit.el.startTime : newDur - hit.el.duration;
    const ok = (() => {
      const bounds = batchTrimBounds(sc, [{ id, edge }]);
      if (!bounds || bounds.lo > bounds.hi) return false;
      let changed = false;
      const d = clamp(delta, bounds.lo, bounds.hi);
      if (d !== 0) {
        if (edge === 'l') {
          const start = hit.el.startTime + d;
          const dur = hit.el.duration - d;
          if (start !== hit.el.startTime || dur !== hit.el.duration) {
            if (hit.el.sourceStart !== undefined) hit.el.sourceStart = hit.el.sourceStart + d;
            hit.el.startTime = start;
            hit.el.duration = dur;
            changed = true;
          }
        } else {
          const dur = hit.el.duration + d;
          if (dur !== hit.el.duration) { hit.el.duration = dur; changed = true; }
        }
      }
      return changed;
    })();
    if (!ok) return;
    return scenes;
  }),
  rollTrim: (aId, bId, delta) => withHistory(set, get, (scenes) => {
    const s = get();
    const sc = scenes.find((x) => x.id === s.activeSceneId);
    if (!sc) return;
    const a = findInScene(sc, aId);
    const b = findInScene(sc, bId);
    if (!a || !b || a.track.locked || b.track.locked || a.track.id !== b.track.id) return;
    // a real junction: A's end must BE B's start (a gap has no shared cut point)
    if (Math.abs(a.el.startTime + a.el.duration - b.el.startTime) > 1e-6) return;
    const bounds = rollDeltaBounds(a.el, b.el);
    const d = clamp(delta, bounds.lo, bounds.hi);
    if (d === 0) return;
    /* spec-06 §5.5 FreeCut order (shrink the loser, then extend) is expressed
       here as ONE atomic mutation on a pre-clamped delta — the mock has no
       per-trim adjacency guards to race. */
    a.el.duration += d; // A: [aStart, aEnd + d)
    b.el.startTime += d; // B: [bStart + d, bEnd)
    b.el.duration -= d;
    if (b.el.sourceStart !== undefined) b.el.sourceStart += d; // B shows earlier/later content
    return scenes;
  }),
  rippleTrim: (id, edge, delta) => withHistory(set, get, (scenes) => {
    const s = get();
    const sc = scenes.find((x) => x.id === s.activeSceneId);
    if (!sc) return;
    const hit = findInScene(sc, id);
    if (!hit || hit.track.locked) return;
    const { el, track } = hit;
    const origEnd = el.startTime + el.duration;
    const bounds = rippleDeltaBounds(track, el, edge);
    const d = clamp(delta, bounds.lo, bounds.hi);
    if (d === 0) return;
    if (edge === 'r') {
      el.duration += d;
    } else {
      /* ripple-l (trimToPlayhead's pinned model, “the same interval math as
         ripple delete”): trimming the head IN (d > 0) REMOVES the head region
         — the clip KEEPS its start, shrinks, shows later content (sourceStart
         advances); extending OUT (d < 0) pulls the edge left. The clip's END
         moves by −d in the trim-in direction and stays fixed on extension. */
      if (d < 0) el.startTime += d;
      el.duration -= d;
      if (el.sourceStart !== undefined) el.sourceStart += d;
    }
    /* unified interval law: every LATER same-track clip stays GLUED to the
       trimmed clip's new end — freed intervals close (trim in: shift left),
       joined intervals open (extend: shift right). Never overlaps: the shift
       equals the end's own move. */
    const shift = el.startTime + el.duration - origEnd;
    if (shift !== 0) {
      for (const e2 of track.elements) {
        if (e2 === el) continue;
        if (e2.startTime >= origEnd - 1e-6) e2.startTime = Math.max(0, e2.startTime + shift);
      }
      track.elements.sort((a, b) => a.startTime - b.startTime); // lanes stay ordered after shifts
    }
    return scenes;
  }),
  slipDrag: (ids, deltaFrames) => withHistory(set, get, (scenes) => {
    /* the GESTURE seam: CLAMPED to [0, extent − duration·rate] — the live
       preview shows exactly the clamped window, so the commit lands where the
       preview pointed. (slipNudge keeps the keyboard's no-op-out-of-bounds
       law below.) */
    let changed = false;
    for (const sc of scenes) for (const t of sc.tracks) {
      if (t.locked) continue; // locked tracks are inert
      for (const e of t.elements) {
        if (!ids.includes(e.id)) continue;
        const b = slipTargetBounds(e);
        if (!b) continue; // no source window — slip is inert
        const next = clamp(e.sourceStart! + deltaFrames / 24, b.lo, b.hi);
        if (next !== e.sourceStart) { e.sourceStart = next; changed = true; }
      }
    }
    if (!changed) return;
    return scenes;
  }),
  slideMove: (id, newStart) => withHistory(set, get, (scenes) => {
    const s = get();
    const sc = scenes.find((x) => x.id === s.activeSceneId);
    if (!sc) return;
    const hit = findInScene(sc, id);
    if (!hit || hit.track.locked) return;
    const { el, track } = hit;
    const bounds = slideStartBounds(track, el);
    const start = clamp(newStart, bounds.lo, bounds.hi);
    let changed = el.startTime !== start;
    el.startTime = start;
    const newEnd = start + el.duration;
    /* the neighbors' FACING edges follow the clip (spec-06 §5.7 slide): the
       left neighbor's right edge and the right neighbor's left edge trim/extend
       to stay glued, each clamped by its OWN 1-frame minimum and source extent
       — a capped edge opens a GAP instead of ever overlapping. */
    const prev = neighborBefore(track, el);
    if (prev) {
      let prevEnd = start;
      const ext = sourceExtentOf(prev);
      if (isFinite(ext)) {
        const maxEnd = prev.startTime + (ext - (prev.sourceStart ?? 0)) / rateOf(prev);
        if (prevEnd > maxEnd) prevEnd = maxEnd; // source caps the extension → gap
      }
      const prevDur = prevEnd - prev.startTime;
      if (prevDur >= MIN_DUR && prevDur !== prev.duration) { prev.duration = prevDur; changed = true; }
    }
    const next = neighborAfter(track, el);
    if (next) {
      let nextStart = newEnd;
      if (next.sourceStart !== undefined) {
        const minStart = next.startTime - next.sourceStart; // head-extension floor
        if (nextStart < minStart) nextStart = minStart; // source head caps → gap
      }
      const nextDur = next.startTime + next.duration - nextStart;
      if (nextDur >= MIN_DUR && (nextStart !== next.startTime || nextDur !== next.duration)) {
        if (next.sourceStart !== undefined) next.sourceStart += nextStart - next.startTime;
        next.startTime = nextStart;
        next.duration = nextDur;
        changed = true;
      }
    }
    if (!changed) return;
    track.elements.sort((a, b) => a.startTime - b.startTime);
    return scenes;
  }),
  stretchTrim: (id, edge, delta) => withHistory(set, get, (scenes) => {
    const s = get();
    const sc = scenes.find((x) => x.id === s.activeSceneId);
    if (!sc) return;
    const hit = findInScene(sc, id);
    if (!hit || hit.track.locked) return;
    const { el, track } = hit;
    const bounds = stretchDeltaBounds(track, el, edge);
    const d = clamp(delta, bounds.lo, bounds.hi);
    if (d === 0) return;
    const newDur = edge === 'r' ? el.duration + d : el.duration - d;
    if (newDur === el.duration) return;
    const span = el.duration * rateOf(el); // consumed source — speed compensates to preserve it
    if (edge === 'l') el.startTime += d;
    el.duration = newDur;
    el.speed = clamp(span / newDur, RATE_MIN, RATE_MAX);
    return scenes;
  }),
  splitElement: (id, time) => withHistory(set, get, (scenes) => {
    // pre-validate against the CURRENT doc so no-op splits don't pollute history
    const pre = findEl(get().scenes, id);
    const preCut = snapToFrame(time);
    if (!pre || pre.track.locked || preCut - pre.el.startTime <= MIN_DUR || preCut - pre.el.startTime >= pre.el.duration - MIN_DUR) return;
    for (const sc of scenes) for (const t of sc.tracks) {
      const idx = t.elements.findIndex((e) => e.id === id);
      if (idx === -1) continue;
      const el = t.elements[idx];
      const cut = snapToFrame(time);
      const offset = cut - el.startTime;
      if (offset <= MIN_DUR || offset >= el.duration - MIN_DUR) return;
      const left: ElementJSON = { ...el, duration: offset };
      const right: ElementJSON = { ...el, id: nextId(`${el.id}-b`), startTime: cut, duration: el.duration - offset };
      if (right.sourceStart !== undefined) right.sourceStart = el.sourceStart! + offset;
      delete left.transitionOut;
      // link law (R14): the audio partner must never be linked to BOTH halves
      // (the R13 review caught split copying linkedTo onto each side). The
      // left half — which owns the original startTime — keeps the pair; the
      // new right half severs it, so the badge + pair-selection stay truthful.
      delete right.linkedTo;
      t.elements.splice(idx, 1, left, right);
    }
    return scenes;
  }),
  toggleEffect: (elementId, fxId) => withHistory(set, get, (scenes) => {
    const hit = findEl(scenes, elementId);
    if (hit?.track.locked) return;
    if (hit?.el.effects) {
      const fx = hit.el.effects.find((f) => f.id === fxId);
      if (fx) fx.enabled = !fx.enabled;
    }
    return scenes;
  }),
  addEffectToElement: (elementId, fx) => withHistory(set, get, (scenes) => {
    const hit = findEl(scenes, elementId);
    if (!hit || hit.track.locked) return;
    if (!hit.el.effects) hit.el.effects = [];
    hit.el.effects.push({ ...fx, id: nextId('fx-') });
    return scenes;
  }),
  removeEffect: (elementId, fxId) => withHistory(set, get, (scenes) => {
    const hit = findEl(scenes, elementId);
    if (!hit || hit.track.locked) return;
    if (hit.el.effects) hit.el.effects = hit.el.effects.filter((f) => f.id !== fxId);
    // R20-W3: the effect domain dies with its effect
    const s = get();
    if (s.selectedEffectId === fxId) set({ selectedEffectId: null, selectedEffectClipId: null });
    return scenes;
  }),
  setEffectParam: (elementId, fxId, param, value) => withHistory(set, get, (scenes) => {
    const hit = findEl(scenes, elementId);
    if (!hit || hit.track.locked) return;
    const fx = hit.el.effects?.find((f) => f.id === fxId);
    if (fx) {
      if (!fx.params) fx.params = {};
      if (fx.params[param] === value) return; // unchanged — no history entry
      fx.params[param] = value;
    }
    return scenes;
  }),
  deleteElements: (ids, ripple) => withHistory(set, get, (scenes) => {
    const removedIds: string[] = [];
    /* R15 T3 ripple upgrade: the canonical vacated−joined interval diff
       (lib/ripple.ts, opencut diff.ts port) replaces the single-span shift —
       non-contiguous multi-delete now shifts each survivor by the SUM of the
       freed spans before it (delete el-1+el-3 → el-4 lands at 8.5, not 0).
       Per track: before/after span sets → vacated (removed spans + tail
       shrinkage) − joined (newly appeared) = freed; each freed [s,e) shifts
       startTime ≥ e LEFT by (e−s), adjustments applied descending. */
    const rippled: { track: TrackJSON; before: ElementJSON[]; after: ElementJSON[] }[] = [];
    for (const sc of scenes) for (const t of sc.tracks) {
      if (t.locked) continue; // locked tracks are inert — same guard as trimToPlayhead / drag / marquee
      const removed = t.elements.filter((e) => ids.includes(e.id));
      if (removed.length === 0) continue;
      removedIds.push(...removed.map((e) => e.id));
      const before = t.elements;
      t.elements = t.elements.filter((e) => !ids.includes(e.id));
      if (ripple) rippled.push({ track: t, before, after: t.elements });
    }
    if (removedIds.length === 0) return; // nothing deletable (all locked / unknown ids) — no-op, no history
    if (ripple) {
      // ids remaining anywhere AFTER the delete — an element that merely
      // changed tracks is never "vacated" on its old lane
      const allAfterIds = new Set<string>();
      for (const sc of scenes) for (const t of sc.tracks) for (const e of t.elements) allAfterIds.add(e.id);
      for (const { track, before, after } of rippled) {
        const adjustments = computeTrackRippleAdjustments(track.id, before, after, allAfterIds);
        if (adjustments.length > 0) {
          track.elements = applyRippleAdjustmentsToElements(track.elements, adjustments);
          track.elements.sort((a, b) => a.startTime - b.startTime); // lanes stay time-ordered after shifts
        }
      }
    }
    set((st) => ({
      selection: st.selection.filter((id) => !removedIds.includes(id)),
      /* R23-WA belt-and-braces (the removeEffect precedent): a deleted
         element's FX object dies with it — a stale selectedFxObject would
         point at nothing. */
      ...(st.selectedFxObject !== null && removedIds.includes(st.selectedFxObject.elementId)
        ? { selectedFxObject: null }
        : {}),
    }));
    return scenes;
  }),
  duplicateElements: (ids, at) => withHistory(set, get, (scenes) => {
    const newIds: string[] = [];
    for (const sc of scenes) for (const t of sc.tracks) {
      if (t.locked) continue; // locked tracks are inert
      const dupes: ElementJSON[] = [];
      for (const e of t.elements) {
        if (ids.includes(e.id)) {
          // `at` (Alt+drag drop point) lands the copy AT the drop position in
          // the SAME history entry — one gesture = one undo (R14: was
          // duplicate + moveElement = two entries with a flashing
          // intermediate overlapping the next clip).
          const copy: ElementJSON = { ...e, id: nextId(`${e.id}-d`), startTime: at !== undefined ? snapToFrame(Math.max(0, at)) : e.startTime + e.duration };
          dupes.push(copy);
          newIds.push(copy.id);
        }
      }
      t.elements.push(...dupes);
    }
    if (newIds.length === 0) return; // nothing duplicable — no history entry
    set({ selection: newIds });
    return scenes;
  }),
  slipNudge: (ids, frames) => withHistory(set, get, (scenes) => {
    let changed = false;
    for (const sc of scenes) for (const t of sc.tracks) {
      if (t.locked) continue; // locked tracks are inert
      for (const e of t.elements) {
        if (!ids.includes(e.id)) continue;
        if (e.sourceStart === undefined) continue;
        // slip: shift source window, keep placement. R15 T4: bounded BOTH
        // ways now — the window must stay inside [0, extent − duration·rate]
        // (the old law only refused negatives, letting the keyboard slip run
        // past the media tail). Out-of-bounds = the WHOLE nudge refuses
        // (keyboard semantics; the gesture seam slipDrag clamps instead).
        const b = slipTargetBounds(e);
        if (!b) continue;
        const next = e.sourceStart + frames / 24;
        if (next >= b.lo && next <= b.hi && next !== e.sourceStart) { e.sourceStart = next; changed = true; }
      }
    }
    if (!changed) return; // nothing slipped (all locked / no sourceStart / out of bounds) — no history
    return scenes;
  }),
  trimToPlayhead: (edge, ripple) => withHistory(set, get, (scenes) => {
    const s = get();
    const ph = snapToFrame(s.playhead);
    /* target constraint (R13 P1): the trim hits the SELECTION when one exists,
       else the clip under the playhead on the main track — always scoped to
       the ACTIVE scene. The original fan-out hit every unlocked clip under
       the playhead across ALL scenes and tracks: one ⌥[ press silently
       destroyed unselected material (sc-2 selects, the music bed...). */
    const sc = scenes.find((x) => x.id === s.activeSceneId);
    if (!sc) return;
    const targetSet = new Set(s.selection.length > 0
      ? s.selection
      : (sc.tracks.find((t) => t.kind === 'main' && !t.locked)?.elements ?? []).map((e) => e.id));
    if (targetSet.size === 0) return;
    let changed = false;
    for (const t of sc.tracks) {
      if (t.locked) continue;
      // ripple bookkeeping per track: [removed span end, removed span length]
      let rippleEnd: number | null = null;
      let rippleLen = 0;
      for (const e of t.elements) {
        if (!targetSet.has(e.id)) continue;
        if (edge === 'l' && ph > e.startTime && ph < e.startTime + e.duration - MIN_DUR) {
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
        } else if (edge === 'r' && ph > e.startTime + MIN_DUR && ph < e.startTime + e.duration) {
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
    if (!changed) return; // playhead outside any target clip — no-op, no history
    return scenes;
  }),
  setElementField: (id, patch) => withHistory(set, get, (scenes) => {
    const hit = findEl(scenes, id);
    if (!hit || hit.track.locked) return;
    Object.assign(hit.el, patch);
    return scenes;
  }),
  setTransition: (id, patch) => withHistory(set, get, (scenes) => {
    const hit = findEl(scenes, id);
    if (!hit || hit.track.locked) return;
    if (!hit.el.transitionOut) hit.el.transitionOut = { type: 'crossfade', presentation: 'Cross Dissolve', duration: 0.5, alignment: 0.5 };
    Object.assign(hit.el.transitionOut, patch);
    return scenes;
  }),
  /* R23-WA (DESIGN-R23 D-A3): the ONE effective-fade writer — history-backed,
     store-owned clamp [0, clip duration], frame-snapped (the fade-object
     grammar's grid). No-op writes mint NO history entry (the gesture's own
     no-op guard's belt-and-braces twin). */
  setFade: (id, side, seconds) => withHistory(set, get, (scenes) => {
    const hit = findEl(scenes, id);
    if (!hit || hit.track.locked) return;
    const field = fieldOfFade(hit.el, side);
    const t = clamp(snapToFrame(seconds), 0, hit.el.duration);
    if ((hit.el[field] ?? 0) === t) return; // no-op — no history entry
    hit.el[field] = t;
    return scenes;
  }),
  /* R23-WA: DELETE-AWARE fade removal (Object.assign cannot unset — R23-B
     correction 1). Clears a pointing selectedFxObject inside the same
     history entry (the removeEffect belt-and-braces pattern; the set() runs
     BEFORE withHistory's own set, so both land in one React commit). */
  removeFade: (id, side) => withHistory(set, get, (scenes) => {
    const hit = findEl(scenes, id);
    if (!hit || hit.track.locked) return;
    const field = fieldOfFade(hit.el, side);
    if (hit.el[field] === undefined) return; // nothing to remove — no history
    delete hit.el[field];
    const s = get();
    if (s.selectedFxObject?.kind === 'fade' && s.selectedFxObject.elementId === id && s.selectedFxObject.side === side) {
      set({ selectedFxObject: null });
    }
    return scenes;
  }),
  /* R23-WA: DELETE-AWARE transition removal — the Inspector's disabled
     "Remove transition" boundary dies with this action (the mock's reason
     was the missing store seam, now real). */
  removeTransition: (id) => withHistory(set, get, (scenes) => {
    const hit = findEl(scenes, id);
    if (!hit || hit.track.locked) return;
    if (hit.el.transitionOut === undefined) return; // nothing to remove
    delete hit.el.transitionOut;
    const s = get();
    if (s.selectedFxObject?.kind === 'transition' && s.selectedFxObject.elementId === id) {
      set({ selectedFxObject: null });
    }
    return scenes;
  }),
  addTrack: (kind, position, refTrackId) => withHistory(set, get, (scenes) => {
    const s = get();
    const sc = scenes.find((x) => x.id === s.activeSceneId)!;
    const sameKind = sc.tracks.filter((t) => t.kind === kind);
    const n = sameKind.length + 1;
    const prefix = kind === 'audio' ? 'A' : kind === 'overlay' ? 'T' : kind === 'caption' ? 'CC' : 'V';
    const track: TrackJSON = {
      id: nextId(`t-${kind}-`),
      kind,
      name: kind === 'audio' ? `Audio ${n}` : kind === 'overlay' ? `Text ${n}` : kind === 'caption' ? `Captions ${n}` : `Video ${n}`,
      badge: `${prefix}${n}`,
      muted: false, solo: false, locked: false, visible: true,
      waveform: kind === 'audio' ? true : undefined,
      elements: [],
    };
    /* Two routes (spec 18 §4.9 track-header "Add track above/below"):
       DEFAULT (no position) keeps the spec 05 §12.1 kind-ordering law —
       audio below main, overlay above main. The EXPLICIT route (position +
       refTrackId from the header menu) inserts at the header's own index —
       user direction wins over §12.1, which governs only the default
       insertion (kind ordering is NOT re-normalized after an explicit
       insert). */
    const mainIdx = sc.tracks.findIndex((t) => t.kind === 'main');
    let insertAt: number;
    const refIdx = refTrackId ? sc.tracks.findIndex((t) => t.id === refTrackId) : -1;
    if (position && refIdx !== -1) {
      insertAt = position === 'above' ? refIdx : refIdx + 1;
    } else {
      insertAt = kind === 'audio' ? sc.tracks.length : kind === 'overlay' ? Math.max(0, mainIdx) : mainIdx + 1;
    }
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
    // G-slice coherence (R14 review): rebuild the mixer sidecar from the NEW
    // audio track ids — the old keys leaked stale faders/roles/ducking and the
    // sample's strip fell back to defaults until enterAudioFocus patched it.
    set({ selection: [], playhead: 0, mixer: createMixerScene(sc.tracks.filter((t) => t.kind === 'audio').map((t) => t.id)) });
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

/* R19: the inspector's empty-selection fallback track (thread th_mto5fdf6 —
   research answer: Resolve/Premiere clear the inspector when nothing is
   selected; track-level inspection is the Fairlight/mixer precedent and the
   reviewer's instinct). Derivation law: the ↑/↓ focused track wins (spec 16
   §3.6), then the topmost visual track bearing an element under the playhead,
   then the first main track, then the first track — always SOME track, so the
   inspector never renders a dead rail. */
export function activeTrackOf(scene: SceneJSON, focusedTrackId: string | null, playhead: number): TrackJSON | null {
  if (scene.tracks.length === 0) return null;
  const focused = scene.tracks.find((t) => t.id === focusedTrackId);
  if (focused) return focused;
  const order: TrackJSON['kind'][] = ['overlay', 'main'];
  for (const kind of order) {
    const kindTracks = scene.tracks.filter((t) => t.kind === kind);
    for (let i = kindTracks.length - 1; i >= 0; i--) {
      const hit = kindTracks[i].elements.find((e) => playhead >= e.startTime && playhead < e.startTime + e.duration);
      if (hit) return kindTracks[i];
    }
  }
  return scene.tracks.find((t) => t.kind === 'main') ?? scene.tracks[0];
}

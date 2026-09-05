/* timelinePlacement.ts — R15 T3 cross-track drag & placement (pure laws),
   ported from opencut-timeline `src/lib/timeline/placement/index.ts`
   (compatibility / overlap / main-track / insert-index / resolve) and
   `src/lib/timeline/ops/group-move.ts` (build-group / resolve-move), adapted
   to the mock model (SceneJSON flat track array, seconds + snapToFrame,
   kinds overlay|main|audio).

   Canonical laws implemented here:
   - Compatibility (spec-06 §5.9): video → main + overlay; image/text →
     overlay only; audio → audio only. Locked tracks accept nothing.
   - Overlap: REJECTED, never shifted — half-open [start, end), revalidated
     after VIRTUALLY REMOVING the moving group (a group may shuffle within
     itself); intra-batch overlap fails the whole resolution.
   - Zero-anchor (spec-05 §14.5A, magnetic main): when any member lands on
     main — main (virtually) empty, or the requested main start ≤ the
     earliest STATIONARY main start — the group shifts so the main member
     pins at 0 (the group-level clampAnchorStartTime port; the anchor never
     breaks the min-start clamp doing so).
   - Anchor clamp: group left edge ≥ 0 (min anchor = −min timeOffset).
   - Existing-track path maps members OUTWARD around the anchor's target:
     same-lane members follow the anchor; lanes above the anchor's original
     lane walk UP, below walk DOWN, skipping used / incompatible / locked
     lanes. Walk-off (no lane found) fails with 'no-track' — this mock does
     NOT fall through to invented new tracks on the existing path.
   - New-track path (anchor target = a track to create): one new track per
     member, block-inserted at the hover position clamped by kind section
     (audio never above main, spec-05 §12.1; visual never below main).
     Mixed audio+non-audio groups are REJECTED (spec-05 §8.3 note 3).

   Deviation from canonical preferIndex (task-pinned, spec-05 §8.3 mock law):
   canonical computes a new-track fallback when the hovered track is
   incompatible or the placement overlaps; this mock surfaces the REJECTION
   instead (conflict ghost + honest toast) — new tracks are created only for
   pointer-above-all / pointer-below-all targets. */

import type { ElementJSON, SceneJSON, TrackJSON } from './mockData';
import { snapToFrame } from './timecode';

/* ---------- compatibility (spec-06 §5.9) ---------- */

export function trackAcceptsElement(kind: TrackJSON['kind'], type: ElementJSON['type']): boolean {
  if (type === 'audio') return kind === 'audio';
  if (type === 'video') return kind === 'main' || kind === 'overlay';
  return kind === 'overlay'; // image, text
}

/** kind of a NEW track created for an element (canonical: visual elements
 *  get overlay-section tracks, audio gets audio tracks; main stays a
 *  singleton). */
export function newTrackKindFor(type: ElementJSON['type']): TrackJSON['kind'] {
  return type === 'audio' ? 'audio' : 'overlay';
}

/* ---------- resolved shapes ---------- */

export interface PlannedMove {
  id: string;
  trackId: string;
  startTime: number;
}

export interface PlannedTrack {
  id: string; // pre-minted identity (stable across pointermove recomputes)
  kind: TrackJSON['kind'];
  insertIndex: number; // index in the CURRENT track array the block starts at
}

export type GroupMoveFail =
  | 'unknown-anchor' // anchor id resolves to nothing
  | 'locked' // anchor's own track is locked (nothing may move)
  | 'incompatible' // anchor type cannot live on the target track
  | 'no-track' // member walk-off / unknown target track / not enough minted ids
  | 'mixed-group' // audio+non-audio group on the new-track path (05 §8.3 n3)
  | 'overlap'; // half-open overlap (stationary or intra-batch)

export type GroupMoveResolution =
  | { ok: true; moves: PlannedMove[]; createTracks: PlannedTrack[] }
  | { ok: false; reason: GroupMoveFail };

/* ---------- hover resolution (track-index space, no pixels) ---------- */

export type HoverTarget =
  | { kind: 'new'; insertIndex: number } // pointer above/below all lanes
  | { kind: 'existing'; trackIndex: number }
  | { kind: 'invalid'; reason: 'locked' | 'incompatible' };

/** Resolve the anchor's drop target from a hovered lane index, 'above' (all
 *  lanes) or 'below' (all lanes). Compatibility + locked are checked HERE so
 *  the component can freeze the ghost at the last-valid target. */
export function resolveHoverTarget(
  scene: SceneJSON,
  anchorType: ElementJSON['type'],
  hover: number | 'above' | 'below',
): HoverTarget {
  if (hover === 'above') return { kind: 'new', insertIndex: 0 };
  if (hover === 'below') return { kind: 'new', insertIndex: scene.tracks.length };
  const track = scene.tracks[hover];
  if (!track) return { kind: 'invalid', reason: 'incompatible' };
  if (track.locked) return { kind: 'invalid', reason: 'locked' };
  if (!trackAcceptsElement(track.kind, anchorType)) return { kind: 'invalid', reason: 'incompatible' };
  return { kind: 'existing', trackIndex: hover };
}

/* ---------- group move resolution ---------- */

interface GroupMember {
  el: ElementJSON;
  trackIndex: number;
  /** startTime − anchor.startTime — members keep their time offsets. */
  timeOffset: number;
}

function findInScene(scene: SceneJSON, id: string): { el: ElementJSON; track: TrackJSON } | null {
  for (const track of scene.tracks) {
    const el = track.elements.find((e) => e.id === id);
    if (el) return { el, track };
  }
  return null;
}

/**
 * resolveGroupMove — the pure drop resolution the drag PREVIEW and the
 * moveElements COMMIT share. `target` is either an existing track id or a
 * new-track block ({newTrackIds, insertIndex} — ids pre-minted at drag
 * start, one per member, so the target identity is stable across
 * recomputes). `groupIds` defaults to [anchorId]; the caller passes the
 * drag group (selection when the anchor is selected, else the anchor
 * alone). Members on locked source tracks are dropped (locked = inert).
 */
export function resolveGroupMove(
  scene: SceneJSON,
  anchorId: string,
  target: { trackId: string } | { newTrackIds: string[]; insertIndex: number },
  targetStart: number,
  groupIds?: string[],
): GroupMoveResolution {
  const anchorHit = findInScene(scene, anchorId);
  if (!anchorHit) return { ok: false, reason: 'unknown-anchor' };
  if (anchorHit.track.locked) return { ok: false, reason: 'locked' };

  // build the member list (deduped, anchor first; locked sources dropped)
  const ids = [...new Set(groupIds ?? [anchorId])];
  const members: GroupMember[] = [];
  for (const id of ids) {
    const hit = id === anchorId ? anchorHit : findInScene(scene, id);
    if (!hit) continue; // unknown id — dropped
    if (hit.track.locked) continue; // locked source — dropped (locked-track law)
    members.push({
      el: hit.el,
      trackIndex: scene.tracks.indexOf(hit.track),
      timeOffset: hit.el.startTime - anchorHit.el.startTime,
    });
  }
  if (members.length === 0) return { ok: false, reason: 'locked' };

  // anchor clamp: group left edge ≥ 0 (min anchor = −min timeOffset)
  const minAnchorStart = Math.max(0, ...members.map((m) => -m.timeOffset));
  let anchorStart = Math.max(snapToFrame(targetStart), minAnchorStart);

  if ('newTrackIds' in target) {
    return resolveNewTrackMove(scene, members, anchorId, anchorStart, target.newTrackIds, target.insertIndex);
  }
  return resolveExistingTrackMove(scene, members, anchorId, anchorStart, target.trackId);
}

/* ---------- R15-F1 FIX 3: the gesture-active flag ---------- */

/* Lightweight module-level signal: TRUE while ANY Clip gesture (move or
   trim-family) is past its 5px activation threshold. The Clip owns the
   writes (activation / end / unmount — see Clip.tsx); useShortcuts reads it
   to swallow destructive keys (⌫ / ⌘Z / ⌘⇧Z) mid-gesture: firing one unmounts
   the dragged Clip before its 'end' can flush, leaking the Timeline's drag
   session (auto-scroll rAF + snap indicator + ghost previews — the R15-V1
   review's mid-drag-unmount leak). Deliberately NOT store state: it is
   transient component-gesture state, not view/doc state (same containment
   contract as meterEngine — reset from setup.ts afterEach). */
let gestureActive = false;
export function setGestureActive(v: boolean): void {
  gestureActive = v;
}
export function isGestureActive(): boolean {
  return gestureActive;
}
/** test containment — setup.ts afterEach mirrors meterEngine.__reset */
export function __resetGestureFlag(): void {
  gestureActive = false;
}

/* ---------- zero-anchor (spec-05 §14.5A, magnetic main) — ONE law ---------- */

/** R15-F1 FIX 2: the GROUP-WIDE magnetic-main law, extracted so the pure
 *  resolution (resolveGroupMove — drag preview + release) and the store's
 *  batch engine (applyMovesToScene — the public moveElements / moveElement /
 *  duplicateAndMove API) run the SAME code. The store previously carried a
 *  divergent re-implementation (main-subset-only shift) — the R15-V1 review
 *  verified it splitting a raw A/V batch the pure law answers as a clamped
 *  no-op.
 *
 *  Law: when a main-targeting request would land at/before the earliest
 *  STATIONARY main start (or main is virtually empty of stationaries), the
 *  WHOLE batch shifts up so its LEFT EDGE pins at 0 — offsets preserved, the
 *  anchor clamp never violated (the shift only ever moves left; starts are
 *  ≥ 0 on entry by the anchor clamp). Returns the shift (≤ 0) to add to
 *  EVERY move's startTime; 0 when the magnet does not fire. */
export function zeroAnchorShift(
  mainElements: ElementJSON[],
  moves: { id: string; targetOnMain: boolean; startTime: number }[],
): number {
  const mainMoves = moves.filter((m) => m.targetOnMain);
  if (mainMoves.length === 0) return 0;
  const moverIds = new Set(moves.map((m) => m.id));
  const stationary = mainElements.filter((e) => !moverIds.has(e.id));
  const earliest = stationary.length > 0 ? Math.min(...stationary.map((e) => e.startTime)) : null;
  const minReq = Math.min(...mainMoves.map((m) => m.startTime));
  if (earliest !== null && minReq > earliest) return 0; // magnet does not fire
  return -Math.min(...moves.map((m) => m.startTime)); // left edge → 0
}

/* ---- existing-track path ---- */

function resolveExistingTrackMove(
  scene: SceneJSON,
  members: GroupMember[],
  anchorId: string,
  anchorStart: number,
  anchorTargetTrackId: string,
): GroupMoveResolution {
  const tracks = scene.tracks;
  const anchor = members.find((m) => m.el.id === anchorId)!;
  const anchorTargetIdx = tracks.findIndex((t) => t.id === anchorTargetTrackId);
  if (anchorTargetIdx === -1) return { ok: false, reason: 'no-track' };
  const anchorTargetTrack = tracks[anchorTargetIdx]!;
  if (anchorTargetTrack.locked) return { ok: false, reason: 'locked' };
  if (!trackAcceptsElement(anchorTargetTrack.kind, anchor.el.type)) return { ok: false, reason: 'incompatible' };

  // outward mapping: same-lane members follow the anchor; above/below walk
  // outward from the anchor's target, skipping used / incompatible / locked
  const targetTrackIds = new Map<string, string>();
  const used = new Set<string>([anchorTargetTrack.id]);
  targetTrackIds.set(anchor.el.id, anchorTargetTrack.id);
  for (const member of members) {
    if (member.el.id === anchor.el.id) continue;
    const laneDelta = member.trackIndex - anchor.trackIndex;
    if (laneDelta === 0) {
      targetTrackIds.set(member.el.id, anchorTargetTrack.id); // same lane follows the anchor
      continue;
    }
    const step = laneDelta < 0 ? -1 : 1;
    let idx = anchorTargetIdx + step;
    for (; idx >= 0 && idx < tracks.length; idx += step) {
      const candidate = tracks[idx]!;
      if (candidate.locked) continue;
      if (!trackAcceptsElement(candidate.kind, member.el.type)) continue;
      if (used.has(candidate.id)) continue;
      break;
    }
    if (idx < 0 || idx >= tracks.length) return { ok: false, reason: 'no-track' };
    targetTrackIds.set(member.el.id, tracks[idx]!.id);
    used.add(tracks[idx]!.id);
  }

  // zero-anchor (spec-05 §14.5A): any member landing on main — the shared
  // GROUP-WIDE law (zeroAnchorShift; R15-F1 FIX 2 unified preview + commit)
  const mainTrack = tracks.find((t) => t.kind === 'main');
  if (mainTrack) {
    const shift = zeroAnchorShift(
      mainTrack.elements,
      members.map((m) => ({
        id: m.el.id,
        targetOnMain: targetTrackIds.get(m.el.id) === mainTrack.id,
        startTime: anchorStart + m.timeOffset,
      })),
    );
    anchorStart += shift;
  }

  const moves: PlannedMove[] = members.map((m) => ({
    id: m.el.id,
    trackId: targetTrackIds.get(m.el.id)!,
    startTime: snapToFrame(anchorStart + m.timeOffset),
  }));

  // overlap revalidation after virtually removing the movers (a group may
  // shuffle within itself); intra-batch overlap fails the whole resolution
  if (!canApplyMovesToTracks(tracks, moves)) return { ok: false, reason: 'overlap' };

  return { ok: true, moves, createTracks: [] };
}

function minAnchorStartOf(members: GroupMember[]): number {
  return Math.max(0, ...members.map((m) => -m.timeOffset));
}
// (kept: resolveGroupMove's anchor clamp uses it above; the zero-anchor
// max() interplay collapsed into zeroAnchorShift's left-edge→0 shift —
// equivalent because the anchor's own offset 0 keeps the member minimum ≤ 0)

/* ---- new-track path ---- */

function resolveNewTrackMove(
  scene: SceneJSON,
  members: GroupMember[],
  anchorId: string,
  anchorStart: number,
  newTrackIds: string[],
  insertIndex: number,
): GroupMoveResolution {
  // mixed audio+non-audio group on the new-track path → REJECTED
  // (spec-05 §8.3 note 3 normative)
  const hasAudio = members.some((m) => m.el.type === 'audio');
  const hasNonAudio = members.some((m) => m.el.type !== 'audio');
  if (hasAudio && hasNonAudio) return { ok: false, reason: 'mixed-group' };
  if (newTrackIds.length < members.length) return { ok: false, reason: 'no-track' };

  const tracks = scene.tracks;
  const mainIdx = tracks.findIndex((t) => t.kind === 'main');
  const sorted = [...members].sort((a, b) => a.trackIndex - b.trackIndex);
  const anchorMemberIndex = sorted.findIndex((m) => m.el.id === anchorId);
  // block start: the anchor's new track lands at the hover position, the
  // block extends outward preserving member order; clamped by kind section —
  // audio never above main (spec-05 §12.1), visual never below main
  let blockStart = insertIndex - anchorMemberIndex;
  if (hasAudio) {
    blockStart = Math.max(mainIdx + 1, Math.min(blockStart, tracks.length));
  } else {
    blockStart = Math.max(0, Math.min(blockStart, Math.max(mainIdx, 0)));
  }

  const createTracks: PlannedTrack[] = sorted.map((member, i) => ({
    id: newTrackIds[i]!,
    kind: newTrackKindFor(member.el.type),
    insertIndex: blockStart + i,
  }));
  const moves: PlannedMove[] = sorted.map((member, i) => ({
    id: member.el.id,
    trackId: newTrackIds[i]!,
    startTime: snapToFrame(anchorStart + member.timeOffset),
  }));
  return { ok: true, moves, createTracks };
}

/* ---- overlap law (half-open [start, end), virtual removal) ---- */

export function spansOverlap(a: { startTime: number; duration: number }, b: { startTime: number; duration: number }): boolean {
  return a.startTime < b.startTime + b.duration && b.startTime < a.startTime + a.duration;
}

function canApplyMovesToTracks(tracks: TrackJSON[], moves: PlannedMove[]): boolean {
  const movingIds = new Set(moves.map((m) => m.id));
  const elementsById = new Map<string, ElementJSON>();
  for (const track of tracks) for (const el of track.elements) elementsById.set(el.id, el);

  const byTarget = new Map<string, PlannedMove[]>();
  for (const move of moves) {
    const list = byTarget.get(move.trackId) ?? [];
    list.push(move);
    byTarget.set(move.trackId, list);
  }

  for (const [targetTrackId, targetMoves] of byTarget) {
    const targetTrack = tracks.find((t) => t.id === targetTrackId);
    if (!targetTrack) return false;
    // intra-batch overlap
    const spans = targetMoves
      .map((m) => ({ startTime: m.startTime, duration: elementsById.get(m.id)?.duration ?? 0 }))
      .sort((a, b) => a.startTime - b.startTime);
    for (let i = 1; i < spans.length; i++) {
      if (spans[i - 1]!.startTime + spans[i - 1]!.duration > spans[i]!.startTime) return false;
    }
    // vs stationary elements (movers virtually removed)
    const stationary = targetTrack.elements.filter((e) => !movingIds.has(e.id));
    for (const move of targetMoves) {
      const duration = elementsById.get(move.id)?.duration ?? 0;
      if (stationary.some((e) => spansOverlap({ startTime: move.startTime, duration }, e))) return false;
    }
  }
  return true;
}

/** the ghost geometry helper: cumulative lane top for a track index over the
 *  variant-aware lane heights (content space; the caller adds the ruler zone
 *  offset). Pure math, exported for the Timeline's preview walk. */
export function laneBandTops(
  trackCount: number,
  laneHeight: (index: number) => number,
): number[] {
  const tops: number[] = [];
  let top = 0;
  for (let i = 0; i < trackCount; i++) {
    tops.push(top);
    top += laneHeight(i);
  }
  return tops;
}

/** map the resolution's insertIndex-space plans onto the store's commit
 *  shape ({id, kind, insertAboveTrackId}). Block entries share ONE anchor
 *  track — the track at the block's start index — because sequential
 *  "insert above X" splices stack in member order ([new1, new2, X]). */
export function toCreateTrackPlans(
  scene: SceneJSON,
  planned: PlannedTrack[],
): { id: string; kind: TrackJSON['kind']; insertAboveTrackId?: string }[] {
  if (planned.length === 0) return [];
  const minIdx = Math.min(...planned.map((t) => t.insertIndex));
  const insertAboveTrackId = minIdx < scene.tracks.length ? scene.tracks[minIdx]!.id : undefined;
  return planned.map((t) => ({ id: t.id, kind: t.kind, insertAboveTrackId }));
}

/** honest rejection copy for a failed drop (task: the toast text for overlaps
 *  is pinned; the other reasons carry the governing spec rows). */
export function dragRejectionToast(reason: GroupMoveFail): { kind: 'error'; title: string; detail: string } {
  switch (reason) {
    case 'overlap':
      return { kind: 'error', title: 'Drop rejected', detail: 'clips would overlap (spec-05 §8.3)' };
    case 'mixed-group':
      return { kind: 'error', title: 'Drop rejected', detail: "mixed audio+video groups can't create tracks (spec-05 §8.3 note 3)" };
    case 'incompatible':
      return { kind: 'error', title: 'Drop rejected', detail: 'placement compatibility (spec 06 §5.9) — video→V/overlay, image/text→overlay, audio→A lanes' };
    case 'locked':
      return { kind: 'error', title: 'Drop rejected', detail: 'target track is locked (spec 18 §4.5)' };
    default:
      return { kind: 'error', title: 'Drop rejected', detail: 'no compatible lane for the drop (spec 06 §5.9)' };
  }
}

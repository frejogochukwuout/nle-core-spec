/* useGradeTarget — R20-W4b. ONE resolver shared by every grade-bound surface
   (console tabs, inspector rail, node-graph chips, W4c's viewer + scopes):
   the target id comes from the STORE (resolveGradeTargetId — 'timeline' or
   selection[0]), the record from the mockGrades sidecar, the writes go
   through setGrade/resetGrade. Console and rail therefore CANNOT disagree —
   they read the same two selectors.

   Gesture law (DESIGN-R20 D3 "one history entry per committed edit"):
   panels keep at most a TRANSIENT drag buffer (null when idle — the shown
   value is ALWAYS the store's); pointer-up / Enter commits ONE setGrade.
   The grade values' only durable home is the store (the R19 sin — grade
   state living in component useState — is gone). */

import { useUi, resolveGradeTargetId, gradeOf, TIMELINE_GRADE_KEY, type GradePatch, type MockGrade } from '../../../state/useUiStore';
import { findElement, type SceneJSON } from '../../../lib/mockData';

export interface GradeRecord {
  /** 'timeline' | elementId | null (clip mode + empty selection). */
  targetId: string | null;
  isTimeline: boolean;
  grade: MockGrade;
  /** ONE committed store write (undoable). */
  setGrade: (patch: GradePatch) => void;
  resetGrade: () => void;
}

export function useGradeRecord(): GradeRecord {
  const targetId = useUi((s) => resolveGradeTargetId(s));
  // gradeOf returns a stable reference (the stored record, or the module-level
  // identity default) — no fresh-object selector trap.
  const grade = useUi((s) => gradeOf(s, targetId ?? '__none__'));
  const setGradeRaw = useUi((s) => s.setGrade);
  const resetGradeRaw = useUi((s) => s.resetGrade);
  return {
    targetId,
    isTimeline: targetId === TIMELINE_GRADE_KEY,
    grade,
    // null target (clip mode, empty selection) = no writes — the panels render
    // the empty state instead, so these guards are belt-and-braces.
    setGrade: (patch) => { if (targetId != null) setGradeRaw(targetId, patch); },
    resetGrade: () => { if (targetId != null) resetGradeRaw(targetId); },
  };
}

/** Human label for the target: clip name, 'Timeline', or the no-target
 *  fallback. null (no target live — the node-viewer header case) gets its
 *  OWN label rather than masquerading as the Timeline grade (R23-WB-REV
 *  P3 #5: the header claimed "Timeline" when nothing was targeted). */
export function gradeTargetLabel(scenes: SceneJSON[], targetId: string | null): string {
  if (targetId == null) return 'No target — click a clip';
  if (targetId === TIMELINE_GRADE_KEY) return 'Timeline';
  const hit = findElement(scenes, targetId);
  return hit ? hit.element.name : 'No target — click a clip';
}

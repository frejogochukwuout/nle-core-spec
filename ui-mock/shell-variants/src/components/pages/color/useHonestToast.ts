/* R20-W4b — the once-per-mount honest toast. The R19-B4 boundary ("grading
   stack is display state") is GONE: every control writes the mockGrades
   sidecar for real (undoable). R25-F2 (C8 re-truth): the viewer-preview
   deferral copy is gone too — the grade canvas SHIPPED with W4c (decode →
   grade stack → encode, rAF-coalesced), so the once-per-mount toast is now
   the ORIENTATION notice, not a boundary: it says exactly what is real
   where (grade values land in mockGrades; the viewer preview renders them
   through the canvas). LUT select, eyedropper tools and non-bound node
   types keep their own one-shot messages (each a real deferral, never a
   silent no-op). */

import { useRef } from 'react';
import { useUi } from '../../../state/useUiStore';

/** The shared grade-write boundary message (wording pinned by tests). */
export const GRADING_TOAST = {
  title: 'Color grades',
  detail: 'grade values are real (mockGrades) — viewer preview renders with the canvas (spec 08 §12)',
} as const;

/** One-shot toast: fires on first call per component mount, then never. */
export function useHonestToast(title: string, detail: string) {
  const pushToast = useUi((s) => s.pushToast);
  const told = useRef(false);
  return () => {
    if (told.current) return;
    told.current = true;
    pushToast({ kind: 'info', title, detail });
  };
}

/** Grade-write boundary variant (wheels/curves/qualifier/rail). */
export function useGradingToast() {
  return useHonestToast(GRADING_TOAST.title, GRADING_TOAST.detail);
}

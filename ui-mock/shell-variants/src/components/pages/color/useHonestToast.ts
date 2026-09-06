/* R19-B4 — the once-per-mount honest toast (spec 08 §4 render-round
   boundary). Extends ColorPage's R14 display-state contract to the whole
   reference-grade grading surface: every control does REAL local state work
   (readouts follow), and the FIRST interaction per mount fires exactly ONE
   toast saying the engine doesn't grade yet. Further touches stay silent. */

import { useRef } from 'react';
import { useUi } from '../../../state/useUiStore';

/** The shared wheels/qualifier message (wording pinned by tests). */
export const GRADING_TOAST = {
  title: 'Color params',
  detail: 'grading stack is display state (spec 08 §4 render round)',
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

/** Wheels + qualifier variant of the one-shot toast. */
export function useGradingToast() {
  return useHonestToast(GRADING_TOAST.title, GRADING_TOAST.detail);
}

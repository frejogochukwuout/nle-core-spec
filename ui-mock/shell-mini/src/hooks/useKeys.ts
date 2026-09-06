/* Keyboard surface (D3.8, audit m4): Space, S, [ ], Del, ⌘Z/⌘⇧Z, ±, 0, Esc.
   Esc priority: cancel active drag FIRST, else deselect.
   While dragActive OR gesturePending, ONLY Esc is honored (audit M2
   interaction lock; PR69 C53 extends it to the sub-threshold window —
   ⌘Z firing under a held pointer was live-proven). Form-control targets
   (typing in a field, opening a select) are skipped so the surface stays
   honest — R18k (review P2-4): SELECT joins the skip list; a focused track
   binding / aspect dropdown must keep its own keys (Space opens it,
   typing letters finds options) instead of firing global split/zoom.
   R18e: [ / ] = cut head / cut tail at playhead (RH 裁剪开始/裁剪结束).
   PR69 C16: e.repeat is gated — a held key must not machine-gun the
   binding (S-hold committed double splits, Space-hold strobed play/pause;
   both live-proven). Undo is NOT excepted: rapid-fire ⌘Z was never a
   registered feature.
   PR69 C1: Space yields to the focused NATIVE control (button/a) — the
   global preventDefault was suppressing the browser's Space-activation
   of every button in the shell (live-proven on Split at playhead). */

import { useEffect } from 'react';
import { useMini } from '../state/useMini';
import { DEFAULT_ZOOM_STEP } from '../lib/geometry';

export function useKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      /* PR69 C16: OS key-repeat re-fires keydown ~20-30/s while held — the
       * bindings are single-shot actions, not scrub surfaces. (Esc above
       * stays idempotent either way.) */
      if (e.repeat) return;
      const s = useMini.getState();

      if (e.key === 'Escape') {
        if (s.dragActive) s.cancelDrag(); // drag-cancel outranks deselect (m4)
        /* R1-a#5: a PENDING gesture (sub-threshold, lock not yet engaged)
         * also owns Esc — the old fall-through deselected the clip under
         * the pointer while the gesture was still opening. Nothing is
         * cancelable yet (no doc state exists); the pointerup closes the
         * window. Swallow the key so the deselect can't fire mid-gesture. */
        else if (s.gesturePending) {
          /* pending — the pointerup resolves it */
        } else s.select(null);
        e.preventDefault();
        return;
      }
      if (s.dragActive || s.gesturePending) return; // interaction lock: nothing else mid-gesture (M2) — incl. the sub-threshold window (PR69 C53)

      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }

      // R18f (review P3): bracket keys are layout-dependent (e.key differs on
      // non-US layouts) — accept the physical e.code as a fallback; the
      // shifted forms ({ }) ride along on US layouts
      if (e.key === '[' || e.key === '{' || e.code === 'BracketLeft') {
        e.preventDefault();
        s.cutHeadAtPlayhead();
        return;
      }
      if (e.key === ']' || e.key === '}' || e.code === 'BracketRight') {
        e.preventDefault();
        s.cutTailAtPlayhead();
        return;
      }

      switch (e.key) {
        case ' ':
          /* PR69 C1: the focused NATIVE control wins — preventDefault here
           * suppressed the browser's own Space-activation of every button
           * in the shell. Only NATIVE activatables (button/a) get the
           * yield: ARIA-role elements (the clip's role=button) have no
           * UA activation, so the global Space=play law still reaches
           * them (D3.8 — and C46's fix depends on it). Window/document
           * targets (tests dispatch on window) have no closest. */
          if (target instanceof Element && target.closest('button, a')) return;
          e.preventDefault();
          s.togglePlay();
          break;
        case 's':
        case 'S':
          e.preventDefault();
          s.splitAtPlayhead();
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          s.deleteSelected();
          break;
        case '+':
        case '=':
          e.preventDefault();
          s.zoomIn();
          break;
        case '-':
        case '_':
          e.preventDefault();
          s.zoomOut();
          break;
        case '0':
          e.preventDefault();
          // R19: default is the ladder constant (was hardcoded 1 — off by
          // one rung after the 9-step ladder renumber)
          s.setZoomStep(DEFAULT_ZOOM_STEP);
          break;
        case 'Home':
          // R19 (thread #53): Home seeks to the beginning — the keyboard
          // twin of the viewer's to-start button
          e.preventDefault();
          s.setPlayhead(0);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

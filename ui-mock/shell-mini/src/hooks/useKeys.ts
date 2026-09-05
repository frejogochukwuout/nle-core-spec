/* Keyboard surface (D3.8, audit m4): Space, S, Del, ⌘Z/⌘⇧Z, ±, 0, Esc.
   Esc priority: cancel active drag FIRST, else deselect.
   While dragActive, ONLY Esc is honored (audit M2 interaction lock) —
   every other key returns early. Input targets (typing in a field) are
   skipped so the surface stays honest. */

import { useEffect } from 'react';
import { useMini } from '../state/useMini';

export function useKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      const s = useMini.getState();

      if (e.key === 'Escape') {
        if (s.dragActive) s.cancelDrag(); // drag-cancel outranks deselect (m4)
        else s.select(null);
        e.preventDefault();
        return;
      }
      if (s.dragActive) return; // interaction lock: nothing else mid-drag (M2)

      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }

      switch (e.key) {
        case ' ':
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
          s.setZoomStep(1); // 0 = default zoom (48pps), D7
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

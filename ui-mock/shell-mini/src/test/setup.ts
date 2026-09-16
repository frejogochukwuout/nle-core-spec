/* Vitest setup — jsdom polyfills the pointer surface the mini uses
   (same posture as the sibling app's setup.ts) + the per-test store-reset
   contract: after every test the store re-hydrates from the pristine seed
   so module-level singletons never leak between tests. */

import { afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { useMini } from '../state/useMini';
import { __resetClipIds } from '../lib/mockData';

beforeAll(() => {
  // jsdom lacks PointerEvent + capture APIs the timeline uses
  if (!window.PointerEvent) {
    class PointerEventShim extends MouseEvent {
      pointerId: number;
      constructor(type: string, init: MouseEventInit & { pointerId?: number } = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
      }
    }
    (window as unknown as { PointerEvent: typeof PointerEventShim }).PointerEvent = PointerEventShim;
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => undefined;
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => undefined;
  }
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (cb: FrameRequestCallback) =>
      window.setTimeout(() => cb(performance.now()), 16);
    window.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
  }
});

afterEach(() => {
  cleanup(); // RTL auto-cleanup (vitest globals are OFF)
  __resetClipIds();
  useMini.getState().reset();
});

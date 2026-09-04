/* Global test setup — jsdom polyfills, jest-dom, store/ls/hash containment.
   Mirrors the Storybook withStoreReset contract (src/stories/decorators.tsx):
   every test starts from the pristine store snapshot and clean localStorage /
   location.hash, so module-level singletons never leak between tests. */

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { useUi } from '../state/useUiStore';
import { __reset as resetMeterEngine } from '../lib/meterEngine';

/* React 19 act() contract — RTL calls act() internally. */
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

/* ---- jsdom polyfills for APIs the shell uses ---- */

class ResizeObserverStub implements ResizeObserver {
  observe(): void { /* no-op */ }
  unobserve(): void { /* no-op */ }
  disconnect(): void { /* no-op */ }
}
if (!('ResizeObserver' in globalThis)) {
  (globalThis as Record<string, unknown>).ResizeObserver = ResizeObserverStub;
}

if (!('IntersectionObserver' in globalThis)) {
  class IntersectionObserverStub implements IntersectionObserver {
    root = null;
    rootMargin = '';
    thresholds = [];
    scrollMargin = '';
    observe(): void { /* no-op */ }
    unobserve(): void { /* no-op */ }
    disconnect(): void { /* no-op */ }
    takeRecords(): IntersectionObserverEntry[] { return []; }
  }
  (globalThis as Record<string, unknown>).IntersectionObserver = IntersectionObserverStub;
}

if (!('matchMedia' in window)) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => { /* deprecated API stub */ },
      removeListener: () => { /* deprecated API stub */ },
      addEventListener: () => { /* no-op */ },
      removeEventListener: () => { /* no-op */ },
      dispatchEvent: () => false,
    }),
  });
}

/* scrollIntoView is not implemented in jsdom (Timeline / strips call it). */
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => { /* no-op */ };
}

/* requestAnimationFrame — jsdom in vitest lacks it. */
if (!('requestAnimationFrame' in window)) {
  (window as unknown as Record<string, unknown>).requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 16) as unknown as number;
  (window as unknown as Record<string, unknown>).cancelAnimationFrame = (id: number) =>
    clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
}

/* Pointer capture APIs (Clip drag + the R15 knob drag path use
   setPointerCapture; the knob's guarded release also probes hasPointerCapture,
   which jsdom lacks — without the stub it throws "not a function"). */
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => { /* no-op */ };
  Element.prototype.releasePointerCapture = () => { /* no-op */ };
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}

/* ---- containment (the withStoreReset contract, per-test) ---- */

const LS_KEYS = ['nle-shell-variants:v1', 'nle-mock-pool-prefs'];
const DOC_ATTRS = ['data-theme', 'data-density', 'data-clipstyle', 'data-accent', 'data-headerstyle', 'data-variant'];

afterEach(() => {
  cleanup();
  // replace semantics — full re-hydration of the pristine module state
  useUi.setState(useUi.getInitialState(), true);
  // meterEngine is a module-level singleton too (keys, ballistics, rAF loop) —
  // same containment contract: every test starts from a silent, stopped engine
  resetMeterEngine();
  for (const key of LS_KEYS) {
    try { window.localStorage.removeItem(key); } catch { /* storage unavailable */ }
  }
  try {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search);
  } catch { /* history unavailable */ }
  for (const attr of DOC_ATTRS) window.document.documentElement.removeAttribute(attr);
});

/* gradedFrameBus.ts — R20-W4c. THE graded-frame seam (C53): a tiny
   module-level observable carrying the CURRENT working-res graded display
   buffer. GradedViewerCanvas publishes after every coalesced re-grade; the
   ColorScopeStrip subscribes and draws its traces at the 10fps throttle.
   This replaces prop-drilling through AppShell/Viewer (the viewer and the
   strip are siblings of the same center column — the bus is the meterEngine
   singleton precedent) and keeps W4b's useScopeSource as the STORE half of
   the seam (target/grades/preview flag) while this is the BUFFER half.

   Containment: module state per test file (vitest isolate:true); the owning
   test files call __clearGradedFrameBus() in afterEach. */

/** The published frame — the graded display buffer the scopes measure. */
export interface GradedFrame {
  /** Post-encode 8-bit display buffer (display-referred, §3.7 data source). */
  imageData: ImageData;
  width: number;
  height: number;
  /** Source asset (scrub-following). */
  mediaId: string;
  /** Program mode: the under-playhead element (grade owner); source: null. */
  elementId: string | null;
  /** 'program' (clip+timeline stack) | 'source' (raw, ungraded). */
  mode: 'program' | 'source';
}

type Listener = (frame: GradedFrame) => void;

let latest: GradedFrame | null = null;
const listeners = new Set<Listener>();

/** Publish the current graded frame (viewer side; latest-wins). */
export function publishGradedFrame(frame: GradedFrame): void {
  latest = frame;
  for (const l of listeners) l(frame);
}

/** Subscribe to frame publishes; returns the unsubscribe. */
export function subscribeGradedFrame(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** The most recent frame (null before the first grade). */
export function getGradedFrame(): GradedFrame | null {
  return latest;
}

/** Test containment — drop the frame + listeners. */
export function __clearGradedFrameBus(): void {
  latest = null;
  listeners.clear();
}

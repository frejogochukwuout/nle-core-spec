/* edgeScroll.ts — R15-F1 FIX 4e: the canonical edge auto-scroll loop
   (design T2: "edge auto-scroll during clip drags + playhead scrub"),
   extracted from Timeline.tsx so the RULER SCRUB reuses the exact same law
   (threshold 100px, 15px/frame max, intensity ramp 1 − dist/threshold)
   instead of a per-event variant. One rAF loop per consumer; horizontal
   only (our vertical content is short); the consumer owns "am I active"
   (a clip drag session / a ruler scrub) and the live pointer X. */

export const EDGE_SCROLL_THRESHOLD_PX = 100;
export const EDGE_SCROLL_MAX_SPEED = 15;

export interface EdgeAutoScroll {
  /** start the rAF loop (no-op if already running) */
  start: () => void;
  /** cancel the loop (pointer release / cancel / lost capture / teardown) */
  stop: () => void;
}

export function createEdgeAutoScroll(opts: {
  getScroller: () => HTMLElement | null;
  /** live screen-space pointer X feeding the ramp */
  getPointerX: () => number;
  /** false → the loop parks itself (gesture over / session dropped) */
  isActive: () => boolean;
  /** called with the new scrollLeft when the loop writes it (the Timeline
   *  keeps its reactive scrollLeft state live for ruler ticks + clip
   *  virtualization) */
  onScroll?: (nextLeft: number) => void;
}): EdgeAutoScroll {
  let rafId: number | null = null;
  const tick = () => {
    rafId = null;
    const sc = opts.getScroller();
    if (!sc || !opts.isActive()) return; // parked — no re-arm
    const box = sc.getBoundingClientRect();
    const relativeX = opts.getPointerX() - box.left;
    const viewW = sc.clientWidth || box.width;
    const scrollMax = Math.max(0, sc.scrollWidth - viewW);
    let speed = 0;
    if (relativeX < EDGE_SCROLL_THRESHOLD_PX && sc.scrollLeft > 0) {
      const dist = Math.max(0, relativeX);
      speed = -EDGE_SCROLL_MAX_SPEED * (1 - dist / EDGE_SCROLL_THRESHOLD_PX);
    } else if (relativeX > viewW - EDGE_SCROLL_THRESHOLD_PX && sc.scrollLeft < scrollMax) {
      const dist = Math.max(0, viewW - relativeX);
      speed = EDGE_SCROLL_MAX_SPEED * (1 - dist / EDGE_SCROLL_THRESHOLD_PX);
    }
    if (speed !== 0) {
      const next = Math.max(0, Math.min(scrollMax, sc.scrollLeft + speed));
      if (next !== sc.scrollLeft) {
        sc.scrollLeft = next;
        opts.onScroll?.(next);
      }
    }
    rafId = requestAnimationFrame(tick);
  };
  return {
    start() {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(tick);
    },
    stop() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    },
  };
}

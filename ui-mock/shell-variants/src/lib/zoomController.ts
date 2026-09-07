/* zoomController.ts — canonical two-regime playhead-anchored zoom (R15 T1).
   Ported (stripped) from opencut-timeline `src/lib/timeline/controllers/zoom-controller.ts`
   + the view-side rAF-coalesced wheel hook (`hooks/use-timeline-zoom.ts`),
   adapted to our Zustand store + single-scroller layout (their ruler is a
   separate follower scroller; ours is sticky INSIDE the scroll content, so
   one scroller is the whole write surface).

   WHY A CONTROLLER (R15-C1): `preZoomScrollLeft` MUST be captured at zoom
   REQUEST time — when content shrinks, the browser auto-clamps scrollLeft in
   the same commit, so by layout-effect time the "before" value is gone. The
   controller owns capture; the layout effect (in Timeline) applies anchoring
   after re-render.

   Two-regime law (spec-05 §5.2 + DECISIONS #17, canonical):
   - slider percent ≥ 0.15 → keep the PLAYHEAD's viewport offset stable:
       next = playhead·newPps − (playhead·prevPps − preZoomScrollLeft)
     clamped to [0, scrollW − viewW], written in the same tick.
   - slider percent < 0.15 → NO scroll adjustment (classic regime).
   - Crossing UP (prev < 0.15 → now ≥ 0.15) saves the pre-anchor scroll and
     enters anchor mode; crossing DOWN with a prior up-crossing restores it.

   Module bus: toolbar buttons/slider and keyboard shortcuts route through
   `zoomBus.request*` so EVERY zoom path gets the capture (canonical routes
   all zoom through the controller). The controller is a module singleton —
   no live Timeline mount just means getScroller() returns null (pre-capture
   0); there is no direct-store fallback path. */

import { useUi } from '../state/useUiStore';
import {
  ZOOM_ANCHOR_PLAYHEAD_THRESHOLD,
  ZOOM_BUTTON_FACTOR,
  PPS_MIN,
  PPS_MAX,
  clamp,
  zoomToSlider,
} from './pixel';

interface ZoomControllerConfig {
  getScroller: () => HTMLElement | null;
  /** Post-anchoring hook — the Timeline's layout effect (applies captured state). */
  onZoomApplied?: () => void;
}

export interface PendingZoomLayout {
  prevPps: number;
  nextPps: number;
  preZoomScrollLeft: number;
  prePlayheadAnchorScrollLeft: number | null;
  isInPlayheadAnchorMode: boolean;
}

class TimelineZoomController {
  private configRef: { current: ZoomControllerConfig } = { current: { getScroller: () => null } };

  private pending: PendingZoomLayout | null = null;
  private prevPps = useUi.getState?.().pxPerSec ?? 46;
  private prePlayheadAnchorScrollLeft: number | null = null;
  private isInPlayheadAnchorMode = false;

  attach(config: ZoomControllerConfig) {
    this.configRef.current = config;
  }

  /** R15-F1 P3: honest attach probe — TRUE while a Timeline is mounted and
   *  has handed us a live scroller (detach() swaps in the null-scroller
   *  config, so this reads the CURRENT wiring, not the singleton's
   *  existence). The old bus-level isAttached() lied: it returned true even
   *  detached ("controller is a module singleton" — the attach state is
   *  exactly what the caller is asking about). */
  isAttached(): boolean {
    return this.configRef.current.getScroller() != null;
  }

  detach() {
    this.configRef.current = { getScroller: () => null };
    this.pending = null;
    this.prePlayheadAnchorScrollLeft = null;
    this.isInPlayheadAnchorMode = false;
  }

  /** Scene switch / teardown — stale anchor state by construction. */
  reset() {
    this.pending = null;
    this.prePlayheadAnchorScrollLeft = null;
    this.isInPlayheadAnchorMode = false;
  }

  getPendingLayout(): PendingZoomLayout | null {
    return this.pending;
  }

  clearPending() {
    this.pending = null;
  }

  /**
   * The single zoom entry point. Captures pre-zoom scroll state BEFORE the
   * store write (canonical setZoomLevel), then writes the store.
   */
  setZoomLevel(nextPpsRaw: number, opts?: { duration?: number }) {
    const store = useUi.getState();
    const nextPps = clamp(nextPpsRaw, PPS_MIN, PPS_MAX);
    const prevPps = store.pxPerSec;
    if (nextPps === prevPps) return; // clamped no-op (canonical)

    const sc = this.configRef.current.getScroller();
    const preZoomScrollLeft = sc ? sc.scrollLeft : 0;
    const duration = opts?.duration ?? Infinity;

    // dynamic min (spec-05 §5.2) — reconcile: zoom never below content-fit
    const minPps = store.zoomMinPps;
    const effectivePps = Math.max(nextPps, Math.min(minPps, PPS_MAX));
    if (effectivePps === prevPps) return;

    this.pending = {
      prevPps,
      nextPps: effectivePps,
      preZoomScrollLeft,
      prePlayheadAnchorScrollLeft: this.prePlayheadAnchorScrollLeft,
      isInPlayheadAnchorMode: this.isInPlayheadAnchorMode,
    };
    store.setZoom(effectivePps);
  }

  /**
   * applyZoomLayout — run in a useLayoutEffect AFTER the re-render with the
   * new content width (called by Timeline). Regime math on slider percent
   * measured against the DYNAMIC min (both sides).
   */
  applyZoomLayout(duration: number): void {
    const p = this.pending;
    if (!p) return;
    const sc = this.configRef.current.getScroller();
    const store = useUi.getState();
    const minPps = Math.max(store.zoomMinPps, PPS_MIN);
    const nowPps = store.pxPerSec;

    const prevSlider = zoomToSlider(p.prevPps, minPps);
    const nowSlider = zoomToSlider(nowPps, minPps);
    const crossingUp = prevSlider < ZOOM_ANCHOR_PLAYHEAD_THRESHOLD && nowSlider >= ZOOM_ANCHOR_PLAYHEAD_THRESHOLD;
    const crossingDown = prevSlider >= ZOOM_ANCHOR_PLAYHEAD_THRESHOLD && nowSlider < ZOOM_ANCHOR_PLAYHEAD_THRESHOLD;

    if (crossingUp) {
      this.prePlayheadAnchorScrollLeft = p.preZoomScrollLeft;
      this.isInPlayheadAnchorMode = true;
    }

    if (sc) {
      const playhead = store.playhead;
      if (nowSlider >= ZOOM_ANCHOR_PLAYHEAD_THRESHOLD) {
        // playhead-anchored: keep the playhead's viewport offset stable
        const viewportOffset = playhead * p.prevPps - p.preZoomScrollLeft;
        const next = clamp(
          playhead * nowPps - viewportOffset,
          0,
          Math.max(0, sc.scrollWidth - sc.clientWidth),
        );
        sc.scrollLeft = next;
      } else if (crossingDown && this.isInPlayheadAnchorMode && this.prePlayheadAnchorScrollLeft !== null) {
        // restore the pre-anchor scroll (canonical down-crossing restore)
        sc.scrollLeft = clamp(
          this.prePlayheadAnchorScrollLeft,
          0,
          Math.max(0, sc.scrollWidth - sc.clientWidth),
        );
        this.isInPlayheadAnchorMode = false;
      }
      // regime < 0.15 without a prior up-crossing: NO scroll adjustment
    }

    if (crossingDown) this.prePlayheadAnchorScrollLeft = null;
    this.pending = null;
    this.configRef.current.onZoomApplied?.();
    void duration;
  }

  zoomStep(factor: number) {
    this.setZoomLevel(useUi.getState().pxPerSec * factor);
  }

  zoomIn() {
    this.zoomStep(ZOOM_BUTTON_FACTOR);
  }

  zoomOut() {
    this.zoomStep(1 / ZOOM_BUTTON_FACTOR);
  }

  zoomFit(containerW: number, durationSec: number) {
    // fill-style fit (spec-16 ⌘\ intent), clamped to the store bounds; the
    // dynamic-min reconcile in setZoomLevel floors it
    this.setZoomLevel((containerW - 24) / (Math.max(durationSec, 0.001) + 2));
  }
}

/** ONE controller instance per Timeline mount (config attach/detach). */
export const zoomController = new TimelineZoomController();

/* ---------------- module bus (toolbar / shortcut routing) ---------------- */

interface BusEntry {
  (nextPps: number, opts?: { duration?: number }): void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomStep: (factor: number) => void;
  zoomFit: (containerW: number, durationSec: number) => void;
  isAttached: () => boolean;
}

/* R15-F1 P3: the dead `direct` fallback is DELETED — the bus body's
   `zoomController['configRef']` guard was always truthy and setZoomLevel
   never throws, so the try/catch + direct store write were unreachable
   code claiming a fallback path that could not exist. No-Timeline contexts
   (stories, isolated toolbars) go through setZoomLevel with a null
   scroller: preZoomScrollLeft 0, pending captured, store written — the
   anchoring simply no-ops without a scroller. */
export const zoomBus: BusEntry = Object.assign(
  (nextPps: number, opts?: { duration?: number }) => {
    zoomController.setZoomLevel(nextPps, opts);
  },
  {
    zoomIn: () => zoomBus(useUi.getState().pxPerSec * ZOOM_BUTTON_FACTOR),
    zoomOut: () => zoomBus(useUi.getState().pxPerSec / ZOOM_BUTTON_FACTOR),
    zoomStep: (factor: number) => zoomBus(useUi.getState().pxPerSec * factor),
    zoomFit: (containerW: number, durationSec: number) =>
      zoomBus((containerW - 24) / (Math.max(durationSec, 0.001) + 2), { duration: durationSec }),
    isAttached: () => zoomController.isAttached(),
  },
);

/* ---------------- rAF-coalesced wheel zoom (canonical hook core) ----------------
   Accumulates wheel deltas; ONE application per animation frame with the
   normalized delta capped at ±30 and factor = exp(−Δ/300). Event-count
   independent (two wheel events in a frame = one zoom step). */

export interface WheelZoomAccumulator {
  handleWheel: (e: WheelEvent) => boolean; // true = consumed (zoom path)
  destroy: () => void;
}

export const createWheelZoomAccumulator = (opts: {
  isZoomEvent: (e: WheelEvent) => boolean;
  onApplyFactor: (factor: number) => void;
}): WheelZoomAccumulator => {
  let pendingDelta = 0;
  let rafId: number | null = null;

  const apply = () => {
    rafId = null;
    const capped = clamp(pendingDelta, -30, 30);
    pendingDelta = 0;
    if (capped === 0) return;
    opts.onApplyFactor(Math.exp(-capped / 300));
  };

  return {
    handleWheel: (e) => {
      if (!opts.isZoomEvent(e)) return false;
      e.preventDefault();
      const normalized = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      pendingDelta += normalized;
      if (rafId === null) {
        rafId = requestAnimationFrame(apply);
      }
      return true;
    },
    destroy: () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      pendingDelta = 0;
    },
  };
};

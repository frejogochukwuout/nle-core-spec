/* Timeline — spec 18 §3.1/§4.7 + spec 05 internals (mock-level):
   160px (or 112px slim) header column with big TC readout, native-scroll
   lanes area, sticky ruler (scrolls horizontally with content, stays visible
   vertically), playhead (2px line + head, spec-05 §14.3 canonical) spanning
   the FULL scroll viewport, per-track lanes + clips.
   R15 T1 wheel grammar (spec-18 §5A revision R15-2 + canonical): Cmd/Ctrl+
   wheel = rAF-coalesced zoom (capped ±30, exp(−Δ/300)) through the zoom
   controller (two-regime playhead anchor, spec-05 §5.2); plain wheel:
   horizontal when shift or |δX|>|δY| (±40px clamped manual), else vertical. */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useUi, trackHeights } from '../../state/useUiStore';
import { useVariant } from '../debug/VariantProvider';
import { sceneDuration, mediaById, type TrackJSON } from '../../lib/mockData';
import { tc } from '../../lib/timecode';
import { dynamicContentWidth, snapPxToDeviceGrid, zoomMinPps, PLAYHEAD_LINE_PX, HORIZONTAL_WHEEL_STEP_PX } from '../../lib/pixel';
import { zoomController, createWheelZoomAccumulator } from '../../lib/zoomController';
import { Ruler } from './Ruler';
import { TrackHeader } from './TrackHeader';
import { Clip } from './Clip';
import { ContextMenu, isMenuKey, useContextMenu, type MenuItem } from '../shell/ContextMenu';
import { POOL_DRAG_TYPE, isDroppable } from '../shell/MediaPool';

export function Timeline() {
  const { variant } = useVariant();
  const scene = useUi((s) => s.scenes.find((x) => x.id === s.activeSceneId)!);
  const pxPerSec = useUi((s) => s.pxPerSec);
  const playhead = useUi((s) => s.playhead);
  const setPlayhead = useUi((s) => s.setPlayhead);
  const snap = useUi((s) => s.snap);
  const setSelection = useUi((s) => s.setSelection);
  const addTrack = useUi((s) => s.addTrack);
  const addMarker = useUi((s) => s.addMarker);
  const loadSampleProject = useUi((s) => s.loadSampleProject);
  const pushToast = useUi((s) => s.pushToast);
  const mediaDrag = useUi((s) => s.mediaDrag); // pool drag-to-lane state (18 §4.2)
  const menu = useContextMenu(); // §4.9 timeline-empty menu

  const headersRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* R15 T1 — reactive scroll/viewport state: drives the Ruler's tick
     virtualization window + the dynamic content width (the canonical cost —
     the ruler re-renders on scroll; React batches the events). */
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportW, setViewportW] = useState(0);

  /* §4.9 timeline-empty menu — right-click / Shift+F10 on the empty lane
     surface. Clips and the ruler stopPropagation for their own menus, so
     anything that reaches the scroll surface is empty lane. */
  const buildMenuItems = (): MenuItem[] => [
    { id: 'paste', label: 'Paste', shortcut: '⌘V', disabled: true, tip: 'mock: clipboard paste needs spec 15 §4.3.70' },
    { id: 'add-marker', label: 'Add marker', onSelect: () => addMarker(useUi.getState().playhead) },
    { id: 'add-track', label: 'Add track (audio)', onSelect: () => addTrack('audio') },
    { id: 'import-media', label: 'Import media', shortcut: '⌘I', onSelect: () => {
      /* §4.9 timeline-empty menu wants the ⌘I import flow; the toast text
         mirrors useShortcuts' ⌘I binding EXACTLY so surface parity is
         testable (same title + detail, both routes say the same thing) */
      pushToast({ kind: 'info', title: 'Import media', detail: 'File picker is mock — drop files on the Media Pool' });
    } },
    { id: 'load-sample', label: 'Load sample project', sep: true, onSelect: () => {
      loadSampleProject();
      pushToast({ kind: 'success', title: 'Sample project loaded', detail: '30 s demo · 3 video + 1 text + 1 audio + crossfade (18 §4.10)' });
    } },
  ];

  /* marquee rubber-band selection — rect in CONTENT coordinates (scroll
     offsets applied). Started by pointerdown on an empty lane background;
     a <4px release is a click → clears selection (replaces the old plain
     empty-lane deselect); Escape mid-drag cancels without changing it. */
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const marqueeOn = marquee !== null;

  const toContent = (e: { clientX: number; clientY: number }): { x: number; y: number } | null => {
    const sc = scrollRef.current;
    if (!sc) return null;
    const box = sc.getBoundingClientRect();
    return { x: e.clientX - box.left + sc.scrollLeft, y: e.clientY - box.top + sc.scrollTop };
  };

  const startMarquee = (e: React.PointerEvent) => {
    const p = toContent(e);
    if (!p) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setMarquee({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  };

  const moveMarquee = (e: React.PointerEvent) => {
    if (!marquee) return;
    const p = toContent(e);
    if (!p) return;
    setMarquee({ ...marquee, x1: p.x, y1: p.y });
  };

  const finishMarquee = () => {
    const m = marquee;
    setMarquee(null);
    if (!m) return;
    if (Math.hypot(m.x1 - m.x0, m.y1 - m.y0) < 4) {
      setSelection([]); // click-no-drag on empty lane → deselect (kept behavior)
      return;
    }
    const tMin = Math.min(m.x0, m.x1) / pxPerSec;
    const tMax = Math.max(m.x0, m.x1) / pxPerSec;
    const yTop = Math.min(m.y0, m.y1);
    const yBot = Math.max(m.y0, m.y1);
    const ids: string[] = [];
    let top = zoneH; // first lane starts below the ruler zone
    for (const track of scene.tracks) {
      const h = laneHeight(track.kind);
      if (!track.locked && yBot > top && yTop < top + h) {
        for (const el of track.elements) {
          if (tMax > el.startTime && tMin < el.startTime + el.duration) ids.push(el.id);
        }
      }
      top += h;
    }
    setSelection(ids);
  };

  /* Escape cancels an active marquee (capture — beats the shell Esc handler) */
  useEffect(() => {
    if (!marqueeOn) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setMarquee(null);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [marqueeOn]);

  const duration = sceneDuration(scene);
  /* R15 T1 — dynamic content width from the shared pixel lib (canonical
     dynamicTimelineWidth: content + 0.75→0.15 padding, floored at viewport;
     replaces (dur+4)·pps). Single source — the Ruler receives it as a prop
     (dedup: it recomputed its own (dur+4)·pps before). */
  const zoomMin = useUi((s) => s.zoomMinPps);
  const contentW = dynamicContentWidth(duration, pxPerSec, viewportW || 900, zoomMin);
  const zoneH = variant.headerStyle === 'readout' ? 44 : 22;
  const colW = variant.headerStyle === 'readout' ? 160 : 112;

  const audioLaneBoost = useUi((s) => s.audioLaneBoost);
  const trackHeightPref = useUi((s) => s.trackHeightPref);
  const laneHeight = (kind: TrackJSON['kind']) => {
    const base = trackHeights(kind, variant.clipStyle);
    /* spec 18 §4.9 Height pref (track-header menu): compact = 60% /
       tall = 140% of the kind-based auto height (normal = auto, the
       default), min 24px, rounded to px. B3 registration: the state-home
       question (per-track vs global) is a seal item — the mock answers
       GLOBAL (one pref for all lanes); deviation noted in the store. */
    const sized = trackHeightPref === 'compact'
      ? Math.max(24, Math.round(base * 0.6))
      : trackHeightPref === 'tall'
        ? Math.max(24, Math.round(base * 1.4))
        : base;
    // audio focus: audio lanes ×1.6, video/overlay compress (design doc §3.2)
    // — applied on the PREF'D height so the two axes compose
    if (audioLaneBoost) return kind === 'audio' ? Math.round(sized * 1.6) : kind === 'main' ? Math.min(sized, 40) : Math.min(sized, 28);
    return sized;
  };

  // snap targets: all clip edges + playhead + sequence ends (spec 05 §9)
  const snapTargets = scene.tracks.flatMap((t) => t.elements.flatMap((e) => [e.startTime, e.startTime + e.duration]));
  snapTargets.push(playhead, 0, duration);

  /* two-way scroll sync (W0-21): lanes ⇄ headers — a wheel over EITHER
     column keeps the pair aligned (the real shell has ONE scroll region;
     two synced panes is the mock's stand-in). Loop guard: writes happen
     only when the two scrollTops differ, so the rebound scroll the write
     provokes is a no-op; the syncing ref covers the synchronous re-entry
     window. */
  const syncing = useRef(false);
  const syncVertical = (from: HTMLElement, to: HTMLElement | null) => {
    if (syncing.current || !to || Math.abs(to.scrollTop - from.scrollTop) < 1) return;
    syncing.current = true;
    to.scrollTop = from.scrollTop;
    syncing.current = false;
  };
  const onScrollSync = () => {
    if (scrollRef.current) syncVertical(scrollRef.current, headersRef.current);
  };
  const onHeaderScrollSync = () => {
    if (headersRef.current) syncVertical(headersRef.current, scrollRef.current);
  };

  /* wheel grammar R15 T1 (canonical use-timeline-zoom): ONE non-passive
     capture listener. Zoom path (ctrl/meta): rAF-coalesced accumulator —
     deltas accumulate, ONE capped (±30) exp(−Δ/300) factor per animation
     frame (event-count independent), routed through the zoom controller so
     pre-zoom scroll is captured at request time (two-regime anchoring).
     Non-zoom: preventDefault + manual scroll — horizontal (shift or
     |δX|>|δY|) → scrollLeft ±min(|raw|, 40); else scrollTop += deltaY. */
  const ppsRef = useRef(pxPerSec);
  ppsRef.current = pxPerSec;
  const durRef = useRef(duration);
  durRef.current = duration;
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const wheelZoom = createWheelZoomAccumulator({
      isZoomEvent: (e) => e.ctrlKey || e.metaKey,
      onApplyFactor: (factor) => {
        zoomController.setZoomLevel(ppsRef.current * factor, { duration: durRef.current });
      },
    });
    const onWheelNative = (e: WheelEvent) => {
      if (wheelZoom.handleWheel(e)) return;
      e.preventDefault();
      const horizontal = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (horizontal) {
        const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        sc.scrollLeft += Math.sign(raw) * Math.min(Math.abs(raw), HORIZONTAL_WHEEL_STEP_PX);
      } else {
        sc.scrollTop += e.deltaY;
      }
    };
    sc.addEventListener('wheel', onWheelNative, { passive: false, capture: true });
    return () => {
      sc.removeEventListener('wheel', onWheelNative, { capture: true });
      wheelZoom.destroy();
    };
  }, []);

  /* zoom controller lifecycle: attach the scroller, run applyZoomLayout in a
     layout effect after the zoom re-render (anchoring math needs the NEW
     scrollWidth), reset stale anchor state on scene switch. */
  useLayoutEffect(() => {
    zoomController.attach({
      getScroller: () => scrollRef.current,
    });
    return () => zoomController.detach();
  }, []);
  const ppsForLayout = pxPerSec; // dependency below: re-run after every zoom re-render
  useLayoutEffect(() => {
    zoomController.applyZoomLayout(duration);
  }, [ppsForLayout, duration]);
  useEffect(() => {
    zoomController.reset(); // scene switch: anchor state stale by construction
  }, [scene.id]);

  /* viewport measurement + dynamic min reconcile (spec-05 §5.2): ResizeObserver
     on the lanes scroller → viewportW + zoomMinPps = fit-with-25%-headroom;
     jsdom has no RO → the 900 fallback matches the old measureLanes pattern. */
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc || typeof ResizeObserver === 'undefined') {
      setViewportW(900);
      useUi.getState().setZoomMin(zoomMinPps(900, duration));
      return;
    }
    const ro = new ResizeObserver(() => {
      const w = sc.clientWidth || 900;
      setViewportW(w);
      useUi.getState().setZoomMin(zoomMinPps(w, durRef.current));
    });
    ro.observe(sc);
    const w = sc.clientWidth || 900;
    setViewportW(w);
    useUi.getState().setZoomMin(zoomMinPps(w, duration));
    return () => ro.disconnect();
  }, []);
  // duration changes re-derive the min (scene switch / load sample)
  useEffect(() => {
    useUi.getState().setZoomMin(zoomMinPps(viewportW || 900, duration));
  }, [duration, viewportW]);

  /* playhead follow-scroll (canonical playhead-controller playback update):
     while PLAYING (never mid-scrub), when the playhead pixel leaves the
     viewport, re-center it. Clamp [0, scrollW − viewW]. */
  const playing = useUi((s) => s.playing);
  useEffect(() => {
    if (!playing) return;
    const sc = scrollRef.current;
    if (!sc) return;
    const px = playhead * pxPerSec;
    const viewW = sc.clientWidth;
    if (px < sc.scrollLeft || px > sc.scrollLeft + viewW) {
      sc.scrollLeft = Math.max(0, Math.min(px - viewW / 2, sc.scrollWidth - viewW));
      setScrollLeft(sc.scrollLeft);
    }
  }, [playhead, playing, pxPerSec]);

  const laneBg = (kind: TrackJSON['kind']) =>
    kind === 'main' ? 'var(--lane-video)' : kind === 'audio' ? 'var(--lane-audio)' : 'var(--lane-overlay)';

  return (
    <div data-testid="shell-timeline" className="flex min-h-0 flex-1 overflow-hidden">
      {/* ---- track headers column ---- */}
      <div
        id="track-headers"
        ref={headersRef}
        data-testid="shell-track-headers"
        className="relative z-20 flex shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-hairline bg-raised"
        style={{ width: colW, minWidth: colW }}
        onScroll={onHeaderScrollSync}
      >
        {variant.headerStyle === 'readout' ? (
          <div className="flex shrink-0 items-center border-b border-hairline bg-shell px-3" style={{ height: zoneH }}>
            <span className="mono text-[19px] font-semibold tracking-[-0.3px] text-tprimary" data-testid="shell-timeline-tc">
              {tc(playhead)}
            </span>
          </div>
        ) : (
          <div className="flex shrink-0 items-center justify-center border-b border-hairline bg-shell px-2" style={{ height: zoneH }}>
            <span className="mono text-[11px] text-tprimary">{tc(playhead)}</span>
          </div>
        )}
        {scene.tracks.map((track) => (
          <TrackHeader key={track.id} track={track} sceneId={scene.id} height={laneHeight(track.kind)} />
        ))}
        {/* add-track affordance (mock: adds a real audio track) */}
        <button
          className="flex h-[26px] shrink-0 items-center justify-center gap-1 border-b border-hairline text-[11px] text-tmuted hover:bg-[var(--hover-overlay)] hover:text-tprimary"
          aria-label="Add audio track"
          onClick={() => addTrack('audio')}
        >
          + track
        </button>
        {/* filler below tracks keeps the column background solid to the bottom */}
        <div className="min-h-0 flex-1 bg-raised" aria-hidden="true" />
      </div>

      {/* ---- scrollable lanes ---- */}
      <div
        id="timeline-scroll"
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-auto bg-timeline"
        tabIndex={-1} /* focusable surface for the §4.9 Shift+F10 keyboard route */
        onContextMenu={(e) => {
          e.preventDefault();
          menu.open(e.clientX, e.clientY, buildMenuItems(), 'timeline-empty');
        }}
        onKeyDown={(e) => {
          if (!isMenuKey(e)) return;
          e.preventDefault();
          e.stopPropagation();
          menu.openForElement(scrollRef.current, buildMenuItems(), 'timeline-empty');
        }}
        onPointerDown={(e) => {
          // roving focus for the keyboard route: empty-surface clicks focus
          // the scroll surface; clips + the ruler focus themselves
          const t = e.target as HTMLElement;
          if (!t.closest('.clip-box') && !t.closest('[role="slider"]')) {
            (e.currentTarget as HTMLElement).focus();
          }
        }}
        onScroll={() => {
          onScrollSync();
          setScrollLeft(scrollRef.current?.scrollLeft ?? 0);
        }}
        onPointerMove={moveMarquee}
        onPointerUp={finishMarquee}
        onPointerCancel={() => setMarquee(null)}
      >
        <div id="timeline-content" className="relative" style={{ width: contentW, minHeight: '100%' }}>
          <Ruler scene={scene} duration={duration} pxPerSec={pxPerSec} playhead={playhead} contentW={contentW} view={{ scrollLeft, viewportW: viewportW || 900 }} />

          {scene.tracks.map((track) => {
            const h = laneHeight(track.kind);
            /* media-pool drag-to-lane (18 §4.2): lane = drop target while a
               pool card drag is in flight; highlight + copy/not-allowed cursor
               come from mediaDrag, drop commits an honest-mock toast (the
               store has no insertElement action yet) */
            const over = mediaDrag?.overTrackId === track.id;
            const laneDropCls = over ? (mediaDrag && mediaDrag.allowed ? ' pool-lane-ok' : ' pool-lane-bad') : '';
            return (
              <div
                key={track.id}
                className={`relative shrink-0 border-b border-hairline cursor-crosshair${laneDropCls}`}
                style={{
                  height: h,
                  background: laneBg(track.kind),
                  opacity: track.visible ? 1 : 0.35,
                  cursor: track.locked ? 'not-allowed' : over && mediaDrag ? (mediaDrag.allowed ? 'copy' : 'not-allowed') : undefined,
                }}
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes(POOL_DRAG_TYPE)) return;
                  e.preventDefault();
                  const md = useUi.getState().mediaDrag;
                  if (!md) return;
                  const media = mediaById(md.mediaId);
                  const allowed = !!media && !track.locked && isDroppable(track.kind, media.type);
                  e.dataTransfer.dropEffect = allowed ? 'copy' : 'none';
                  if (md.overTrackId !== track.id || md.allowed !== allowed) {
                    useUi.getState().setMediaDrag({ mediaId: md.mediaId, overTrackId: track.id, allowed });
                  }
                }}
                onDragLeave={(e) => {
                  if (!e.dataTransfer.types.includes(POOL_DRAG_TYPE)) return;
                  if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                  const md = useUi.getState().mediaDrag;
                  if (md && md.overTrackId === track.id) {
                    useUi.getState().setMediaDrag({ mediaId: md.mediaId, overTrackId: null, allowed: false });
                  }
                }}
                onDrop={(e) => {
                  if (!e.dataTransfer.types.includes(POOL_DRAG_TYPE)) return;
                  e.preventDefault();
                  const md = useUi.getState().mediaDrag;
                  const media = md ? mediaById(md.mediaId) : undefined;
                  if (md && media) {
                    if (md.allowed && md.overTrackId === track.id) {
                      useUi.getState().pushToast({
                        kind: 'success',
                        title: `Placed ${media.name} on ${track.badge}`,
                        detail: 'mock: insertElement lands with the engine round (spec 15 §5.4 / 06 §5.9)',
                      });
                    } else {
                      useUi.getState().pushToast({
                        kind: 'error',
                        title: `Can't place ${media.type} media on ${track.badge}`,
                        detail: 'placement compatibility (spec 06 §5.9) — video→V, image→T, audio→A lanes',
                      });
                    }
                  }
                  useUi.getState().setMediaDrag(null);
                }}
                onPointerDown={(e) => {
                  // marquee starts only on the EMPTY lane background (target ===
                  // currentTarget ⇒ not a clip / transition marker). Clip drags
                  // stop propagation concerns aside: clips are children, so a
                  // pointerdown on them never reaches this branch.
                  if (e.target !== e.currentTarget || e.button !== 0 || track.locked) return;
                  startMarquee(e);
                }}
              >
                {track.elements.map((el) => (
                  <Clip key={el.id} el={el} track={track} pxPerSec={pxPerSec} laneHeight={h} snapTargets={snapTargets} />
                ))}

                {/* transition markers — Resolve-style box straddling the cut */}
                {track.elements.filter((e) => e.transitionOut).map((e) => {
                  const cut = (e.startTime + e.duration) * pxPerSec;
                  const w = e.transitionOut!.duration * pxPerSec;
                  return (
                    <div
                      key={`tr-${e.id}`}
                      className="absolute top-[3px] z-[7] flex items-center justify-center overflow-hidden rounded-[2px]"
                      style={{
                        left: cut - w / 2,
                        width: Math.max(w, 14),
                        height: h - 8,
                        background: 'linear-gradient(135deg, var(--transition-mark), color-mix(in srgb, var(--transition-mark) 45%, #000))',
                        border: '1px solid var(--transition-mark)',
                        boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
                      }}
                      title={`Crossfade · ${e.transitionOut!.presentation} · ${e.transitionOut!.duration}s`}
                      aria-label={`Crossfade transition, ${e.transitionOut!.duration} seconds`}
                      data-testid={`transition-${e.id}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                        <path d="M3 3 L11 11 M11 3 L3 11" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.95" />
                      </svg>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* ---- marquee rubber-band rect (dashed accent border + 10% alpha
               fill via .timeline-marquee; geometry in content coords) ---- */}
          {marquee && (
            <div
              data-testid="timeline-marquee"
              className="timeline-marquee absolute z-[35]"
              aria-hidden="true"
              style={{
                left: Math.min(marquee.x0, marquee.x1),
                top: Math.min(marquee.y0, marquee.y1),
                width: Math.abs(marquee.x1 - marquee.x0),
                height: Math.abs(marquee.y1 - marquee.y0),
              }}
            />
          )}

          {/* empty-scene state row (spec 18 §4.2 state table): no tracks at all */}
          {scene.tracks.length === 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center gap-2 text-[12px] text-tfaint" data-testid="shell-timeline-state-empty">
              <span>Drop clips here, or press Cmd+I</span>
            </div>
          )}

          {/* ---- playhead (2px line + head, spec-05 §14.3 canonical) — spans
               full viewport; line center-aligned (left = px − 1), device-grid
               snapped ---- */}
          <div className="pointer-events-none absolute bottom-0 top-0 z-40" style={{ left: snapPxToDeviceGrid(playhead * pxPerSec) - PLAYHEAD_LINE_PX / 2, height: '100%' }} aria-hidden="true">
            <div
              className="absolute bottom-0 top-0"
              style={{ width: PLAYHEAD_LINE_PX, background: 'var(--playhead)', boxShadow: '0 0 1px rgba(0,0,0,0.8)' }}
            />
            <div
              className="pointer-events-auto sticky top-0 z-40 cursor-col-resize"
              style={{ top: 0, width: 18, height: zoneH + 6, marginLeft: -(18 / 2) + PLAYHEAD_LINE_PX / 2 }}
              onPointerDown={(e) => {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                e.stopPropagation();
              }}
              onPointerMove={(e) => {
                if (e.buttons !== 1) return;
                const box = scrollRef.current?.getBoundingClientRect();
                if (!box) return;
                const x = e.clientX - box.left + (scrollRef.current?.scrollLeft ?? 0);
                let t = Math.max(0, x / pxPerSec);
                if (snap) {
                  const tol = 10 / pxPerSec;
                  for (const target of snapTargets) {
                    if (Math.abs(target - t) < tol) { t = target; break; }
                  }
                }
                setPlayhead(t);
              }}
            >
              <svg width="18" height="13" viewBox="0 0 18 13" className="mt-[1px] block">
                {/* triangle apex at x=9 + the marginLeft offset lands ON the
                    2px line's center (px) — one shared centerline */}
                <path d="M3.5 0h11v6.2L9 11.5 3.5 6.2V0z" fill="var(--playhead)" stroke="rgba(0,0,0,0.35)" strokeWidth="0.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {menu.state && <ContextMenu {...menu.state} onClose={menu.close} />}
    </div>
  );
}

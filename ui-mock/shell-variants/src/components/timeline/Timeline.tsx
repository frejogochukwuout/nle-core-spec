/* Timeline — spec 18 §3.1/§4.7 + spec 05 internals (mock-level):
   160px (or 112px slim) header column with big TC readout, native-scroll
   lanes area, sticky ruler (scrolls horizontally with content, stays visible
   vertically), playhead (3px + head) spanning the FULL scroll viewport,
   per-track lanes + clips. Wheel grammar (spec 18 §5A): Cmd/Ctrl+wheel =
   zoom-to-cursor, Shift+wheel = fast horizontal pan, plain wheel = vertical. */

import { useEffect, useRef, useState } from 'react';
import { useUi, trackHeights } from '../../state/useUiStore';
import { useVariant } from '../debug/VariantProvider';
import { sceneDuration, mediaById, type TrackJSON } from '../../lib/mockData';
import { tc } from '../../lib/timecode';
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
  const setZoom = useUi((s) => s.setZoom);
  const setSelection = useUi((s) => s.setSelection);
  const addTrack = useUi((s) => s.addTrack);
  const addMarker = useUi((s) => s.addMarker);
  const loadSampleProject = useUi((s) => s.loadSampleProject);
  const pushToast = useUi((s) => s.pushToast);
  const mediaDrag = useUi((s) => s.mediaDrag); // pool drag-to-lane state (18 §4.2)
  const menu = useContextMenu(); // §4.9 timeline-empty menu

  const headersRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* §4.9 timeline-empty menu — right-click / Shift+F10 on the empty lane
     surface. Clips and the ruler stopPropagation for their own menus, so
     anything that reaches the scroll surface is empty lane. */
  const buildMenuItems = (): MenuItem[] => [
    { id: 'paste', label: 'Paste', shortcut: '⌘V', disabled: true, tip: 'mock: clipboard paste needs spec 15 §4.3.70' },
    { id: 'add-marker', label: 'Add marker', onSelect: () => addMarker(useUi.getState().playhead) },
    { id: 'add-track', label: 'Add track (audio)', onSelect: () => addTrack('audio') },
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
  const contentW = (duration + 4) * pxPerSec;
  const zoneH = variant.headerStyle === 'readout' ? 44 : 22;
  const colW = variant.headerStyle === 'readout' ? 160 : 112;

  const audioLaneBoost = useUi((s) => s.audioLaneBoost);
  const laneHeight = (kind: TrackJSON['kind']) => {
    const base = trackHeights(kind, variant.clipStyle);
    // audio focus: audio lanes ×1.6, video/overlay compress (design doc §3.2)
    if (audioLaneBoost) return kind === 'audio' ? Math.round(base * 1.6) : kind === 'main' ? Math.min(base, 40) : Math.min(base, 28);
    return base;
  };

  // snap targets: all clip edges + playhead + sequence ends (spec 05 §9)
  const snapTargets = scene.tracks.flatMap((t) => t.elements.flatMap((e) => [e.startTime, e.startTime + e.duration]));
  snapTargets.push(playhead, 0, duration);

  const onScrollSync = () => {
    if (headersRef.current && scrollRef.current) {
      headersRef.current.scrollTop = scrollRef.current.scrollTop;
    }
  };

  /* wheel grammar (spec 18 §5A) — zoom anchored at the pointer's time-position */
  const onWheel = (e: React.WheelEvent) => {
    const sc = scrollRef.current;
    if (!sc) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const box = sc.getBoundingClientRect();
      const anchorX = e.clientX - box.left + sc.scrollLeft;
      const anchorT = anchorX / pxPerSec;
      const factor = Math.exp(-e.deltaY * 0.0018); // smooth exponential zoom
      setZoom(pxPerSec * factor);
      requestAnimationFrame(() => {
        const sc2 = scrollRef.current;
        if (!sc2) return;
        const newPps = useUi.getState().pxPerSec;
        sc2.scrollLeft = Math.max(0, anchorT * newPps - (e.clientX - sc2.getBoundingClientRect().left));
      });
    } else if (e.shiftKey) {
      // fast horizontal pan (×10)
      e.preventDefault();
      sc.scrollBy({ left: e.deltaY * 10, behavior: 'instant' as ScrollBehavior });
    }
    // plain wheel: native vertical scroll (and horizontal trackpad pan)
  };

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
        onScroll={onScrollSync}
        onWheel={onWheel}
        onPointerMove={moveMarquee}
        onPointerUp={finishMarquee}
        onPointerCancel={() => setMarquee(null)}
      >
        <div id="timeline-content" className="relative" style={{ width: contentW, minHeight: '100%' }}>
          <Ruler scene={scene} duration={duration} pxPerSec={pxPerSec} playhead={playhead} />

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

          {/* ---- playhead (3px line + head, spec 05 §14.3) — spans full viewport ---- */}
          <div className="pointer-events-none absolute bottom-0 top-0 z-40" style={{ left: playhead * pxPerSec, height: '100%' }} aria-hidden="true">
            <div
              className="absolute bottom-0 top-0 -translate-x-1/2"
              style={{ width: 3, background: 'var(--playhead)', boxShadow: '0 0 1px rgba(0,0,0,0.8)' }}
            />
            <div
              className="pointer-events-auto sticky top-0 z-40 cursor-col-resize"
              style={{ top: 0, width: 18, height: zoneH + 6, marginLeft: -9 }}
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
              <svg width="14" height="13" viewBox="0 0 13 13" className="mt-[1px]">
                <path d="M1 0h11v6.2L6.5 11.5 1 6.2V0z" fill="var(--playhead)" stroke="rgba(0,0,0,0.35)" strokeWidth="0.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {menu.state && <ContextMenu {...menu.state} onClose={menu.close} />}
    </div>
  );
}

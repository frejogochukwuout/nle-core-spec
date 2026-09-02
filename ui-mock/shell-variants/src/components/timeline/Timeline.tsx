/* Timeline — spec 18 §3.1/§4.7 + spec 05 internals (mock-level):
   160px (or 112px slim) header column with big TC readout, native-scroll
   lanes area, ruler, playhead (3px + head), per-track lanes + clips. */

import { useRef } from 'react';
import { useUi, trackHeights } from '../../state/useUiStore';
import { useVariant } from '../debug/VariantProvider';
import { sceneDuration, type TrackJSON } from '../../lib/mockData';
import { tc } from '../../lib/timecode';
import { Ruler } from './Ruler';
import { TrackHeader } from './TrackHeader';
import { Clip } from './Clip';

export function Timeline() {
  const { variant } = useVariant();
  const scene = useUi((s) => s.scenes.find((x) => x.id === s.activeSceneId)!);
  const pxPerSec = useUi((s) => s.pxPerSec);
  const playhead = useUi((s) => s.playhead);
  const setPlayhead = useUi((s) => s.setPlayhead);
  const snap = useUi((s) => s.snap);

  const headersRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const duration = sceneDuration(scene);
  const contentW = (duration + 4) * pxPerSec;
  const zoneH = variant.headerStyle === 'readout' ? 44 : 22;
  const colW = variant.headerStyle === 'readout' ? 160 : 112;

  const laneHeight = (kind: TrackJSON['kind']) => trackHeights(kind, variant.clipStyle);

  // snap targets: all clip edges + playhead + sequence ends (spec 05 §9)
  const snapTargets = scene.tracks.flatMap((t) => t.elements.flatMap((e) => [e.startTime, e.startTime + e.duration]));
  snapTargets.push(playhead, 0, duration);
  const onScrollSync = () => {
    if (headersRef.current && scrollRef.current) {
      headersRef.current.scrollTop = scrollRef.current.scrollTop;
    }
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
        className="relative z-20 flex shrink-0 flex-col overflow-y-auto border-r border-hairline bg-raised"
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
        {/* add-track affordance (G11) */}
        <button className="flex h-[26px] shrink-0 items-center justify-center gap-1 text-[10px] text-tfaint hover:bg-[var(--hover-overlay)] hover:text-tmuted" aria-label="Add track">
          + track
        </button>
      </div>

      {/* ---- scrollable lanes ---- */}
      <div
        id="timeline-scroll"
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-auto bg-timeline"
        onScroll={onScrollSync}
      >
        <div id="timeline-content" className="relative" style={{ width: contentW }}>
          <Ruler scene={scene} duration={duration} pxPerSec={pxPerSec} playhead={playhead} />

          {scene.tracks.map((track) => {
            const h = laneHeight(track.kind);
            return (
              <div
                key={track.id}
                className="relative shrink-0 border-b border-hairline"
                style={{ height: h, background: laneBg(track.kind), opacity: track.visible ? 1 : 0.35, cursor: track.locked ? 'not-allowed' : 'default' }}
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

          {/* ---- playhead (3px line + head, spec 05 §14.3; dedicated time token) ---- */}
          <div className="pointer-events-none absolute bottom-0 top-0 z-40" style={{ left: playhead * pxPerSec }} aria-hidden="true">
            <div
              className="absolute bottom-0 top-0 -translate-x-1/2"
              style={{ width: 3, background: 'var(--playhead)', boxShadow: '0 0 1px rgba(0,0,0,0.8)' }}
            />
            <div
              className="pointer-events-auto absolute -translate-x-1/2 cursor-col-resize"
              style={{ top: 0, width: 18, height: zoneH + 6 }}
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
    </div>
  );
}

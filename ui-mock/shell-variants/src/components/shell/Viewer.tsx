/* ViewerPanel — spec 18 §4.3: viewer-toolbar (zoom/TC/fps/safe-area),
   video-frame (letterboxed program frame + DOM overlays), scrub-row (in/out
   band + clip boundary ticks + hover TC), transport-row (center cluster +
   loop/in/out/marker). WebGPU canvas stand-in = static frame of the element
   under the playhead. */

import { useRef, useState } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, SkipBack, SkipForward, Repeat, Flag, Frame } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { mediaById, type ElementJSON, type SceneJSON } from '../../lib/mockData';
import { tc } from '../../lib/timecode';

function mainElementAt(scene: SceneJSON, time: number): ElementJSON | null {
  const t = scene.tracks.find((tr) => tr.kind === 'main');
  return t?.elements.find((e) => time >= e.startTime && time < e.startTime + e.duration) ?? null;
}
function overlayElementAt(scene: SceneJSON, time: number): ElementJSON | null {
  const t = scene.tracks.find((tr) => tr.kind === 'overlay');
  return t?.elements.find((e) => time >= e.startTime && time < e.startTime + e.duration) ?? null;
}

function MarkIcon({ dir, label }: { dir: 'l' | 'r'; label: string }) {
  return (
    <svg width="11" height="14" viewBox="0 0 24 24" fill="currentColor" aria-label={label}>
      {dir === 'l' ? <polygon points="19 5 19 19 5 12" /> : <polygon points="5 5 5 19 19 12" />}
    </svg>
  );
}

export function Viewer({ duration }: { duration: number }) {
  const scene = useUi((s) => s.scenes.find((x) => x.id === s.activeSceneId)!);
  const playhead = useUi((s) => s.playhead);
  const playing = useUi((s) => s.playing);
  const loop = useUi((s) => s.loop);
  const loopEnabled = useUi((s) => s.loopEnabled);
  const setPlayhead = useUi((s) => s.setPlayhead);
  const togglePlay = useUi((s) => s.togglePlay);
  const nudge = useUi((s) => s.nudgePlayhead);
  const markIn = useUi((s) => s.markIn);
  const markOut = useUi((s) => s.markOut);
  const addMarker = useUi((s) => s.addMarker);
  const setLoopEnabled = useUi((s) => s.setLoopEnabled);

  const scrubRef = useRef<HTMLDivElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const el = mainElementAt(scene, playhead);
  const overlayEl = overlayElementAt(scene, playhead);
  const img = el ? mediaById(el.mediaId) : undefined;
  const boundaries = scene.tracks.find((t) => t.kind === 'main')?.elements ?? [];

  const pct = (t: number) => `${(t / duration) * 100}%`;

  const seekFromEvent = (clientX: number) => {
    const box = scrubRef.current?.getBoundingClientRect();
    if (!box) return;
    setPlayhead(((clientX - box.left) / box.width) * duration);
  };

  const zoomOptions = ['Fit', '50%', '75%', '100%'];

  return (
    <div data-testid="shell-viewer" className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-shell">
      {/* viewer-toolbar (28px) */}
      <div className="relative flex items-center gap-2.5 border-b border-hairline px-2.5 text-[11px]" style={{ height: 28, minHeight: 28 }}>
        <select aria-label="Viewer zoom" defaultValue="Fit" className="field cursor-pointer py-0.5">
          {zoomOptions.map((z) => <option key={z}>{z}</option>)}
        </select>
        <span className="tc-chip" data-testid="shell-viewer-tc">{tc(playhead)}</span>
        <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 font-medium tracking-wide text-tmuted">
          TIMELINE
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9" /></svg>
        </div>
        <div className="grow" />
        <span className="tc-chip !py-0.5 !text-[10.5px]">1920×1080</span>
        <span className="tc-chip !py-0.5 !text-[10.5px]">24 fps</span>
        <button className="icon-btn !h-[20px]" data-tip="Safe area guides (UI pref)" aria-label="Toggle safe area guides">
          <Frame size={13} strokeWidth={1.6} />
        </button>
      </div>

      {/* video-frame — letterboxed program monitor */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-frame p-4">
        <div className="relative aspect-video max-h-full w-full max-w-full overflow-hidden rounded-[calc(var(--radius))] bg-black">
          {img && !img.offline ? (
            <img src={img.thumbnail} alt="" aria-label={`Program monitor: ${el?.name ?? 'empty'}`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#0a0a0c] text-[13px] text-tfaint">
              {img?.offline ? 'Media offline' : 'No media — import or drop a file'}
            </div>
          )}

          {/* in-canvas overlays (spec 18 §4.3) — hidden while dragging (§9) */}
          <div className="pointer-events-none absolute left-2 top-2 flex flex-col gap-1 text-[11px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {el && (
              <span className="mono">{el.name} · {tc(el.sourceStart ?? 0)}–{tc((el.sourceStart ?? 0) + el.duration)}</span>
            )}
          </div>
          <div className="pointer-events-none absolute right-2 top-2 flex gap-1.5 text-[10px] font-medium text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            <span className="mono">1920×1080</span>
            <span className="mono">24p</span>
          </div>

          {/* text overlay element composited over the frame */}
          {overlayEl && (
            <div className="pointer-events-none absolute bottom-[14%] left-1/2 -translate-x-1/2 text-center">
              <span className="text-[20px] font-semibold uppercase tracking-[0.22em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                {overlayEl.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* scrub-row — in/out band, boundary ticks, playhead, hover TC */}
      <div
        ref={scrubRef}
        className="relative flex h-[22px] shrink-0 cursor-pointer items-center border-t border-hairline px-3"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          seekFromEvent(e.clientX);
        }}
        onPointerMove={(e) => {
          setHoverX(e.clientX - (scrubRef.current?.getBoundingClientRect().left ?? 0));
          if (e.buttons === 1) seekFromEvent(e.clientX);
        }}
        onPointerLeave={() => setHoverX(null)}
        role="slider"
        aria-label="Scrub timeline"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration * 24)}
        aria-valuenow={Math.round(playhead * 24)}
        aria-valuetext={tc(playhead)}
        data-testid="shell-viewer-scrub"
      >
        <div className="relative h-full w-full">
          {/* track */}
          <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-sm bg-[var(--border-soft)]" />
          {/* in/out + loop range band */}
          <div
            className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-sm"
            style={{ left: pct(loop.start), width: `calc(${pct(loop.end)} - ${pct(loop.start)})`, background: 'var(--accent-selection)', opacity: loopEnabled ? 0.85 : 0.35 }}
          />
          {/* clip boundary ticks */}
          {boundaries.map((b) => (
            <div key={b.id} className="absolute top-1/2 h-[7px] w-px -translate-y-1/2 bg-tfaint" style={{ left: pct(b.startTime) }} />
          ))}
          {/* playhead marker */}
          <div className="absolute top-1/2 h-[11px] w-[3px] -translate-y-1/2 rounded-sm" style={{ left: pct(playhead), background: 'var(--accent-selection)', transform: 'translate(-50%, -50%)' }} />
          {/* hover TC tooltip */}
          {hoverX !== null && (
            <span
              className="mono pointer-events-none absolute -top-[9px] -translate-x-1/2 rounded-sm border border-strong bg-inset px-1 py-px text-[9.5px] text-tmuted"
              style={{ left: hoverX }}
            >
              {tc((hoverX / (scrubRef.current?.clientWidth || 1)) * duration)}
            </span>
          )}
        </div>
      </div>

      {/* transport-row */}
      <div className="relative flex shrink-0 items-center gap-2.5 border-t border-hairline px-3" style={{ height: 34, minHeight: 34 }} data-testid="shell-viewer-transport">
        <div className="flex items-center gap-1">
          <button className="icon-btn !h-[20px]" data-tip="Viewer mode" aria-label="Viewer mode">
            <svg width="15" height="12" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="1" y="1" width="22" height="16" rx="1.5" /></svg>
          </button>
          <button className="icon-btn !h-[20px]" data-tip="Clip / Timeline" aria-label="Source mode">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
        </div>

        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3">
          <button className="icon-btn !h-[20px] !w-[20px]" onClick={() => setPlayhead(0)} data-tip="Go to start (Home)" aria-label="Go to start">
            <SkipBack size={13} strokeWidth={1.6} />
          </button>
          <button className="icon-btn !h-[20px] !w-[20px]" onClick={() => nudge(-1)} data-tip="Step back 1 frame (←)" aria-label="Step back one frame">
            <ChevronLeft size={14} strokeWidth={2} />
          </button>
          <button
            className="icon-btn !h-[22px] !w-[22px] !rounded-[var(--radius)]"
            onClick={togglePlay}
            data-testid="shell-viewer-btn-play"
            data-tip="Play / Pause (Space)"
            aria-label="Play or pause"
            style={{ color: 'var(--text-primary)' }}
          >
            {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          </button>
          <button className="icon-btn !h-[20px] !w-[20px]" onClick={() => nudge(1)} data-tip="Step forward 1 frame (→)" aria-label="Step forward one frame">
            <ChevronRight size={14} strokeWidth={2} />
          </button>
          <button className="icon-btn !h-[20px] !w-[20px]" onClick={() => setPlayhead(duration)} data-tip="Go to end (End)" aria-label="Go to end">
            <SkipForward size={13} strokeWidth={1.6} />
          </button>

          <div className="mx-1 h-4 w-px bg-[var(--border-soft)]" />

          <button className="icon-btn !h-[20px] !w-[20px]" onClick={markIn} data-tip="Mark in (I)" aria-label="Mark in">
            <MarkIcon dir="l" label="Mark in" />
          </button>
          <button className="icon-btn !h-[20px] !w-[20px]" onClick={markOut} data-tip="Mark out (O)" aria-label="Mark out">
            <MarkIcon dir="r" label="Mark out" />
          </button>
          <button
            className={`icon-btn !h-[20px] !w-[20px] ${loopEnabled ? 'toggled' : ''}`}
            onClick={() => setLoopEnabled(!loopEnabled)}
            data-tip="Loop playback (L)"
            aria-label="Toggle loop playback"
          >
            <Repeat size={13} strokeWidth={2} />
          </button>
          <button className="icon-btn !h-[20px] !w-[20px]" onClick={() => addMarker(playhead)} data-tip="Add marker (M)" aria-label="Add marker">
            <Flag size={13} strokeWidth={1.8} />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button className="icon-btn !h-[20px]" data-tip="Mark clip" aria-label="Mark clip">
            <svg width="13" height="11" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="1" width="22" height="18" rx="2" /><line x1="7" y1="1" x2="7" y2="19" /><line x1="17" y1="1" x2="17" y2="19" /></svg>
          </button>
          <button className="icon-btn !h-[20px]" data-tip="Next edit point (↓)" aria-label="Next edit point">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="4 5 4 19 15 12" /><rect x="16" y="5" width="3" height="14" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

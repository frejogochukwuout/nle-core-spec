/* ViewerPanel — spec 18 §4.3: viewer-toolbar (zoom/TC/fps/safe-area + overlay
   toggle), video-frame (letterboxed program frame + DOM overlays, hidden while
   tool-drag, toggleable), scrub-row (12px: in/out band + clip boundary ticks +
   hover TC + playhead marker), transport-row (32px: CENTER = jump/step/play
   cluster, RIGHT = loop, mark-in I, mark-out O, add-marker M + compact palette).
   WebGPU canvas stand-in = static frame of the element under the playhead. */

import { useRef, useState } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, SkipBack, SkipForward, Repeat, Flag, Frame, Eye } from 'lucide-react';
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

function MarkIcon({ dir }: { dir: 'l' | 'r' }) {
  return (
    <svg width="11" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {dir === 'l' ? <polygon points="19 5 19 19 5 12" /> : <polygon points="5 5 5 19 19 12" />}
    </svg>
  );
}

const MARKER_PALETTE = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'] as const;

export function Viewer({ duration }: { duration: number }) {
  const scene = useUi((s) => s.scenes.find((x) => x.id === s.activeSceneId)!);
  const playhead = useUi((s) => s.playhead);
  const playing = useUi((s) => s.playing);
  const loop = useUi((s) => s.loop);
  const loopEnabled = useUi((s) => s.loopEnabled);
  const tool = useUi((s) => s.tool);
  const setPlayhead = useUi((s) => s.setPlayhead);
  const togglePlay = useUi((s) => s.togglePlay);
  const nudge = useUi((s) => s.nudgePlayhead);
  const markIn = useUi((s) => s.markIn);
  const markOut = useUi((s) => s.markOut);
  const addMarker = useUi((s) => s.addMarker);
  const setLoopEnabled = useUi((s) => s.setLoopEnabled);

  const scrubRef = useRef<HTMLDivElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [overlaysOn, setOverlaysOn] = useState(true);
  const [zoom, setZoom] = useState('Fit');
  const [paletteOpen, setPaletteOpen] = useState(false);

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

  const zoomOptions = ['Fit', '50%', '100%', '200%'];
  // zoom mock: Fit = letterbox-fill; 50/100/200 = fixed magnification of the
  // fit-size frame (overflow-auto on the monitor lets 100/200 scroll)
  const m = zoom === 'Fit' ? 1 : zoom === '50%' ? 0.5 : zoom === '100%' ? 2 : 4;
  const zoomStyle: React.CSSProperties = zoom === 'Fit'
    ? { width: '100%' }
    : { width: `${m * 100}%`, maxWidth: 'none', maxHeight: 'none', flexShrink: 0 };

  /* overlays hidden while a tool drag is active (spec 18 §4.3/§9) */
  const hideOverlays = !overlaysOn || tool !== 'select';

  return (
    <div data-testid="shell-viewer" className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-shell">
      {/* viewer-toolbar (28px) */}
      <div className="relative flex items-center gap-2 border-b border-hairline px-2 text-[11px]" style={{ height: 28, minHeight: 28 }}>
        <select aria-label="Viewer zoom" value={zoom} onChange={(e) => setZoom(e.target.value)} className="field cursor-pointer py-0">
          {zoomOptions.map((z) => <option key={z}>{z}</option>)}
        </select>
        <span className="tc-chip" data-testid="shell-viewer-tc">{tc(playhead)}</span>
        <div className="grow" />
        <span className="tc-chip">1920×1080</span>
        <span className="tc-chip">24 fps</span>
        <button
          className={`icon-btn !h-[20px] ${overlaysOn ? 'toggled' : ''}`}
          data-tip="Toggle in-canvas overlays"
          aria-label="Toggle in-canvas overlays"
          aria-pressed={overlaysOn}
          onClick={() => setOverlaysOn(!overlaysOn)}
        >
          <Eye size={13} strokeWidth={1.6} />
        </button>
        <button className="icon-btn !h-[20px]" data-tip="Safe area guides (UI pref)" aria-label="Toggle safe area guides">
          <Frame size={13} strokeWidth={1.6} />
        </button>
      </div>

      {/* video-frame — letterboxed program monitor */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-frame p-4">
        <div
          className="relative aspect-video max-h-full max-w-full overflow-hidden rounded-[var(--radius)] bg-black"
          style={zoomStyle}
        >
          {img && !img.offline ? (
            <img src={img.thumbnail} alt="" aria-label={`Program monitor: ${el?.name ?? 'empty'}`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#0a0a0c] text-[13px] text-tmuted">
              {img?.offline ? 'Media offline' : 'No media — import or drop a file'}
            </div>
          )}

          {/* in-canvas overlays (spec 18 §4.3) — hidden while tool-drag, toggleable */}
          {!hideOverlays && (
            <div className="pointer-events-none absolute left-2 top-2 flex flex-col gap-1 text-[11px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              {el && (
                <span className="mono">{el.name} · {tc(el.sourceStart ?? 0)}–{tc((el.sourceStart ?? 0) + el.duration)}</span>
              )}
            </div>
          )}
          {!hideOverlays && (
            <div className="pointer-events-none absolute right-2 top-2 flex gap-1.5 text-[11px] font-medium text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              <span className="mono">1920×1080</span>
              <span className="mono">24p</span>
            </div>
          )}

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

      {/* scrub-row — 12px (spec 18 §3.1): in/out band, boundary ticks, playhead, hover TC */}
      <div
        ref={scrubRef}
        className="relative flex shrink-0 cursor-pointer items-center border-t border-hairline px-2"
        style={{ height: 12, minHeight: 12 }}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
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
          <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-sm bg-[var(--border-soft)]" />
          {/* in/out + loop range band — dimmed, never erased */}
          <div
            className="absolute top-1/2 h-[2px] -translate-y-1/2 rounded-sm"
            style={{ left: pct(loop.start), width: `calc(${pct(loop.end)} - ${pct(loop.start)})`, background: 'var(--accent-selection)', opacity: loopEnabled ? 0.85 : 0.3 }}
          />
          {/* clip boundary ticks */}
          {boundaries.map((b) => (
            <div key={b.id} className="absolute top-1/2 h-[5px] w-px -translate-y-1/2 bg-tfaint" style={{ left: pct(b.startTime) }} />
          ))}
          {/* playhead marker — dedicated time color */}
          <div className="absolute top-1/2 h-[11px] w-[2px] -translate-y-1/2 rounded-sm" style={{ left: pct(playhead), background: 'var(--playhead)' }} />
          {/* hover TC tooltip — floats above the row */}
          {hoverX !== null && (
            <span
              className="mono pointer-events-none absolute -top-[14px] -translate-x-1/2 rounded-sm border border-strong bg-inset px-1 text-[11px] text-tmuted"
              style={{ left: hoverX }}
            >
              {tc((hoverX / (scrubRef.current?.clientWidth || 1)) * duration)}
            </span>
          )}
        </div>
      </div>

      {/* transport-row (32px, spec 18 §4.3): CENTER = transport cluster, RIGHT = loop + marks + marker palette */}
      <div className="relative flex shrink-0 items-center px-2" style={{ height: 32, minHeight: 32 }} data-testid="shell-viewer-transport">
        <div className="flex flex-1 items-center" />

        <div className="flex items-center gap-2">
          <button className="icon-btn !h-[20px] !w-[20px]" onClick={() => setPlayhead(0)} data-tip="Go to start (Home)" aria-label="Go to start">
            <SkipBack size={13} strokeWidth={1.6} />
          </button>
          <button className="icon-btn !h-[20px] !w-[20px]" onClick={() => nudge(-1)} data-tip="Step back 1 frame (←)" aria-label="Step back one frame">
            <ChevronLeft size={14} strokeWidth={1.6} />
          </button>
          <button
            className="flex h-[24px] w-[28px] items-center justify-center rounded-[var(--radius)] transition-colors"
            onClick={togglePlay}
            data-testid="shell-viewer-btn-play"
            data-tip="Play / Pause (Space)"
            aria-label="Play or pause"
            style={{
              color: 'var(--text-primary)',
              background: playing ? 'var(--active-overlay)' : 'var(--bg-inset)',
              border: `1px solid ${playing ? 'var(--border-strong)' : 'var(--border-soft)'}`,
            }}
          >
            {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-[2px]" />}
          </button>
          <button className="icon-btn !h-[20px] !w-[20px]" onClick={() => nudge(1)} data-tip="Step forward 1 frame (→)" aria-label="Step forward one frame">
            <ChevronRight size={14} strokeWidth={1.6} />
          </button>
          <button className="icon-btn !h-[20px] !w-[20px]" onClick={() => setPlayhead(duration)} data-tip="Go to end (End)" aria-label="Go to end">
            <SkipForward size={13} strokeWidth={1.6} />
          </button>
        </div>

        <div className="flex flex-1 items-center justify-end gap-1">
          <button className="icon-btn !h-[20px] !w-[20px]" onClick={markIn} data-tip="Mark in (I)" aria-label="Mark in">
            <MarkIcon dir="l" />
          </button>
          <button className="icon-btn !h-[20px] !w-[20px]" onClick={markOut} data-tip="Mark out (O)" aria-label="Mark out">
            <MarkIcon dir="r" />
          </button>
          <button
            className={`icon-btn !h-[20px] !w-[20px] ${loopEnabled ? 'toggled' : ''}`}
            onClick={() => setLoopEnabled(!loopEnabled)}
            data-tip="Loop playback (⌘⇧G)"
            aria-label="Toggle loop playback"
            aria-pressed={loopEnabled}
          >
            <Repeat size={13} strokeWidth={1.6} />
          </button>
          {/* marker button + compact color palette (spec 18 §4.3) */}
          <span className="relative flex items-center">
            <button
              className="icon-btn !h-[20px] !w-[20px]"
              onClick={() => { addMarker(playhead); setPaletteOpen(false); }}
              onContextMenu={(e) => { e.preventDefault(); setPaletteOpen(!paletteOpen); }}
              data-tip="Add marker (M · right-click for colors)"
              aria-label="Add marker"
              aria-haspopup="menu"
              aria-expanded={paletteOpen}
            >
              <Flag size={13} strokeWidth={1.6} />
            </button>
            {paletteOpen && (
              <span className="absolute right-0 top-[110%] z-50 flex items-center gap-1 rounded-[var(--radius)] border border-strong bg-inset p-1" role="menu" aria-label="Marker color">
                {MARKER_PALETTE.map((c) => (
                  <button
                    key={c}
                    role="menuitemradio"
                    aria-label={`Marker color ${c}`}
                    className="h-[12px] w-[12px] rounded-full border border-black/40 hover:scale-110"
                    style={{ background: `var(--mk-${c})` }}
                    onClick={() => { addMarker(playhead, c); setPaletteOpen(false); }}
                  />
                ))}
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

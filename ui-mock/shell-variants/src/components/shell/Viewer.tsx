/* ViewerPanel — spec 18 §4.3: viewer-toolbar (zoom/TC/fps/safe-area + overlay
   toggle), video-frame (letterboxed program frame + DOM overlays, hidden while
   tool-drag, toggleable), scrub-row (12px: in/out band + clip boundary ticks +
   hover TC + playhead marker), transport-row (32px: CENTER = jump/step/play
   cluster, RIGHT = loop, mark-in I, mark-out O, add-marker M + compact palette).
   WebGPU canvas stand-in = static frame of the element under the playhead.
   R19: dual-purpose SOURCE PREVIEW MODE (th_mto3504c, spec 18 §4.3 v1.1) —
   viewerMode 'source' swaps the chrome to a raw-asset poster view; caption
   overlay chips (caption-track elements under the playhead).
   R20-W2 (D2 / issues #63+#64): the 7 edit functions moved INTO the source
   transport row as the horizontal SourceEditBar — the program-monitor
   EditOverlay dock is REMOVED (the program monitor is a clean full-frame
   output; the bar's mount point is the source-mode transport).
   W1-B (DESIGN-R25 §3 / §6 A1 — R2 "no play control, I/O crop not
   functional"): the SOURCE mode gains the FULL transport (A1: a still is a
   normal 5s clip in Resolve — play "plays" the frozen frame; the honest
   mock is a moving playhead + running TC over the poster). The source-mode
   transport row = [left: live source TC] [center: go-to-start / step / /
   play / step / go-to-end — the program grammar] | [SourceEditBar — the
   PRIORITY cluster] [trim cluster] [duration readout]. W1-A (R1, the
   flex-starvation rescue): the row degrades by PRIORITY — the readouts
   hide first, the edit bar drops to icon-only, the trim icons + the
   transport + the 7 mode buttons NEVER hide (a ResizeObserver-driven
   ladder; the W5b overflow-x-scroll stays only as the LAST resort below
   the icon-only floor). NO dimming on the poster image (A1: the feedback
   is the strip); the poster gets a 2px playhead progress line instead. */

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, ChevronDown, ChevronLeft, ChevronRight, SkipBack, SkipForward, Repeat, Flag, Frame, Eye, X } from 'lucide-react';
import { useUi, sourcePlayheadOf, SOURCE_STILL_PSEUDO_DUR } from '../../state/useUiStore';
import { mediaById, sceneDuration, type ElementJSON, type SceneJSON, type TrackJSON } from '../../lib/mockData';
import { snapToFrame, tc } from '../../lib/timecode';
import { getWaveform } from '../../lib/waveform';
import { SourceEditBar } from './SourceEditBar';
import { GradedViewerCanvas } from './GradedViewerCanvas';
import { SourceRangeBar } from './SourceRangeBar';

/* multi-track law (R14): scan ALL tracks of the kind, topmost wins — the
   single-find version hid clips on a second Video/Text track (addTrack makes
   them) from the viewer. Same contract as elementAtTime in lib/mockData.
   R25-F1-E1: the half-open [start, start+duration) probe misses at the exact
   scene tail (t === duration → nothing covers it), so a POPULATED timeline
   fell to the import CTA at its own end frame. At the tail the monitor HOLDS
   the last main element ending exactly there (Resolve holds the last frame).
   t < duration keeps the strict half-open law (the frame AFTER a clip's last
   frame belongs to the next clip); only the exact-tail edge is closed. */
function mainElementAt(scene: SceneJSON, time: number): ElementJSON | null {
  const kindTracks = scene.tracks.filter((tr) => tr.kind === 'main');
  for (let i = kindTracks.length - 1; i >= 0; i--) {
    const hit = kindTracks[i].elements.find((e) => time >= e.startTime && time < e.startTime + e.duration);
    if (hit) return hit;
  }
  const tail = sceneDuration(scene);
  if (time === tail && tail > 0) {
    for (let i = kindTracks.length - 1; i >= 0; i--) {
      const hold = kindTracks[i].elements.find((e) => e.duration > 0 && e.startTime + e.duration === tail);
      if (hold) return hold;
    }
  }
  return null;
}
function overlayElementAt(scene: SceneJSON, time: number): ElementJSON | null {
  const kindTracks = scene.tracks.filter((tr) => tr.kind === 'overlay');
  for (let i = kindTracks.length - 1; i >= 0; i--) {
    const hit = kindTracks[i].elements.find((e) => time >= e.startTime && time < e.startTime + e.duration);
    if (hit) return hit;
  }
  return null;
}

/* R19 caption overlay: caption-track elements covering the playhead, ALL
   caption tracks scanned, track order preserved (first = primary language).
   Half-open [start, end) like every other at-time probe in the shell. */
function captionHitsAt(scene: SceneJSON, time: number): { track: TrackJSON; el: ElementJSON }[] {
  return scene.tracks
    .filter((t) => t.kind === 'caption')
    .flatMap((t) =>
      t.elements
        .filter((e) => time >= e.startTime && time < e.startTime + e.duration)
        .map((el) => ({ track: t, el })));
}

function MarkIcon({ dir }: { dir: 'l' | 'r' }) {
  return (
    <svg width="11" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {dir === 'l' ? <polygon points="19 5 19 19 5 12" /> : <polygon points="5 5 5 19 19 12" />}
    </svg>
  );
}

const MARKER_PALETTE = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'] as const;
/* the store's plain flag-click / M cycles an 8-color wheel (spec 16 §3.7);
   the compact palette shows the first 6 — aria-checked marks the color a
   plain click would add next (honest radio state, no fake default) */
const MARKER_CYCLE = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'] as const;

/* ---- W1-A (DESIGN-R25 §3, R1 — the flex-starvation rescue): the source
   transport row's degradation thresholds (row widths, measured via RO).
   The honest content math: readout-visible row ≈ TC 73 + transport 140 +
   divider 10 + icon-bar 190 + trim 72 + readout 178 + gaps/padding 56
   ≈ 719 → 720; TC-visible row ≈ 475 → 490. Below the floors the READOUTS
   drop (full text survives in data-tip + the strip's aria-label) — the
   5 transport buttons, the trim icons and the 7 edit-mode buttons NEVER
   hide; the W5b overflow-x-auto inside the edit bar stays only as the
   LAST resort below its icon-only floor. */
const SOURCE_ROW_READOUT_MIN_PX = 720;
const SOURCE_ROW_TC_MIN_PX = 490;

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

  /* th_mto3504c — spec 18 §4.3 v1.1 source preview: the monitor is
     dual-purpose; 'source' shows the raw asset poster (entered by the pool
     selection law in MediaPool / the clip menu 'Open in viewer'), 'program'
     is the timeline monitor. */
  const viewerMode = useUi((s) => s.viewerMode);
  const sourceMediaId = useUi((s) => s.sourceMediaId);
  /* W1-B (DESIGN-R25 §6 A1): the source transport's live state — the
     effective playhead (store-clamped into the [in,out] domain) drives
     the TC readout, the strip marker and the poster progress line; the
     play flag drives the rAF loop + the play button's honest state. */
  const sourcePlaying = useUi((s) => s.sourcePlaying);
  const sourcePh = useUi((s) => (sourceMediaId ? sourcePlayheadOf(s, sourceMediaId) : 0));
  const seekSource = useUi((s) => s.seekSource);
  const nudgeSource = useUi((s) => s.nudgeSource);
  const toggleSourcePlay = useUi((s) => s.toggleSourcePlay);
  /* R23-FIX (review-sweep item 7, R2-F5): the source-range readout
     SUBSCRIBES to sourceRanges — it previously read useUi.getState()
     mid-render, so a keyboard trim (SourceRangeBar / the in-out buttons)
     committed a new range and the readout kept the stale string until an
     unrelated re-render. Reactive selector = the readout follows every
     writer (the store is the single source). */
  const sourceRange = useUi((s) => (sourceMediaId ? s.sourceRanges[sourceMediaId] : undefined));
  const exitSourcePreview = useUi((s) => s.exitSourcePreview);
  const page = useUi((s) => s.page);
  const sourceMode = viewerMode === 'source';
  const sourceMedia = sourceMode ? mediaById(sourceMediaId ?? undefined) : undefined;
  const sourceDur = sourceMedia?.duration ?? null;
  /* the transport's duration: a real media duration, or A1's 5s
     pseudo-duration for stills ("a still = a normal 5s clip"). */
  const sourceTransportDur = sourceMedia ? (sourceMedia.duration ?? SOURCE_STILL_PSEUDO_DUR) : null;

  const scrubRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLSpanElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [zoom, setZoom] = useState('Fit');
  const [paletteOpen, setPaletteOpen] = useState(false);

  // viewer UI prefs — store-level (spec 18 §4.3): testable/pinnable mock state
  const overlaysOn = useUi((s) => s.viewerOverlays);
  const safeGuides = useUi((s) => s.viewerSafeGuides);
  const toggleOverlays = useUi((s) => s.toggleViewerOverlays);
  const toggleSafeGuides = useUi((s) => s.toggleViewerSafeGuides);

  const el = mainElementAt(scene, playhead);
  const overlayEl = overlayElementAt(scene, playhead);
  const img = el ? mediaById(el.mediaId) : undefined;
  const boundaries = scene.tracks.find((t) => t.kind === 'main')?.elements ?? [];
  /* R19 caption overlay data: caption elements covering the playhead
     (program mode only — source preview shows the raw asset instead) */
  const captionHits = sourceMode ? [] : captionHitsAt(scene, playhead);

  /* §4.2 viewer state rows (R14):
     - LOADING: when the resolved program element's mediaId CHANGES (a cut),
       a first-frame skeleton row shows for ~600 ms (mock decode) before the
       program image renders. The initial resolve at mount skips the theater
       — a boot has no "previous frame" to decode away from. Real shell:
       EngineEvents first-frame per spec 09 §6.1.
     - ERROR: the program <img> onError flips to the decode-failure row
       (spec 18 §4.2 viewer error row) with a Retry that clears the state and
       re-attempts by re-keying the img; one error toast per failure. */
  const [frameLoading, setFrameLoading] = useState(false);
  const [decodeFailed, setDecodeFailed] = useState(false);
  const [imgKey, setImgKey] = useState(0);
  const prevMediaRef = useRef<string | null | undefined>(undefined);
  const mediaId = el?.mediaId ?? null;
  useEffect(() => {
    const prev = prevMediaRef.current;
    prevMediaRef.current = mediaId;
    if (prev === undefined || prev === mediaId) return; // boot or unchanged
    setDecodeFailed(false); // a new frame means the old failure is stale
    setFrameLoading(true);
    const t = setTimeout(() => setFrameLoading(false), 600);
    return () => clearTimeout(t); // a further cut restarts the window
  }, [mediaId]);
  const pushToast = useUi((s) => s.pushToast);
  const onImgError = () => {
    setDecodeFailed(true);
    pushToast({ kind: 'error', title: 'Media failed to decode', detail: 'program frame failed to decode — check the media pool (spec 18 §4.2)' });
  };
  const retryDecode = () => {
    setDecodeFailed(false);
    setImgKey((k) => k + 1); // re-key → the img remounts and re-attempts
  };

  /* duration 0 (empty scene) would render NaN% — every pct() caller paints
     0% instead (R13 fix: NaN-safe empty scene) */
  const pct = (t: number) => (duration > 0 ? `${(t / duration) * 100}%` : '0%');

  /* palette dismissal while open (R13 fix): outside pointerdown closes (the
     trigger + palette span is the safe zone); Esc closes via a CAPTURE
     listener that stops propagation — the global Esc ladder in useShortcuts
     deselects, this popover consumes Esc locally (CheatSheet pattern). */
  useEffect(() => {
    if (!paletteOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setPaletteOpen(false); }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (markerRef.current && !markerRef.current.contains(e.target as Node)) setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [paletteOpen]);

  const seekFromEvent = (clientX: number) => {
    const box = scrubRef.current?.getBoundingClientRect();
    if (!box) return;
    // frame-grid discipline: seeks land ON the frame grid like every other
    // playhead mover (R13 review: raw pixel-derived times landed off-grid)
    setPlayhead(snapToFrame(((clientX - box.left) / box.width) * duration));
  };

  /* ---- W1-A (DESIGN-R25 §3, R1 — the priority-row ladder) ----
     The source-mode transport row's MEASURED width (ResizeObserver, the
     MixerDock D1.3 pattern; jsdom's silent stub never fires → null = the
     full rendering, deterministic tests). Drives the readout degradation:
     the duration readout hides below SOURCE_ROW_READOUT_MIN_PX, the live
     TC below SOURCE_ROW_TC_MIN_PX — the transport buttons, the trim icons
     and the 7 edit-mode buttons NEVER hide (the edit bar's own ladder in
     SourceEditBar drops it to icon-only). */
  const sourceRowRef = useRef<HTMLDivElement>(null);
  const [sourceRowW, setSourceRowW] = useState<number | null>(null);
  useEffect(() => {
    if (!sourceMode) return;
    const rowEl = sourceRowRef.current;
    if (!rowEl || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const w = rowEl.getBoundingClientRect().width;
      if (w > 0) setSourceRowW(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(rowEl);
    return () => ro.disconnect();
  }, [sourceMode]);
  const sourceReadoutHidden = sourceRowW !== null && sourceRowW < SOURCE_ROW_READOUT_MIN_PX;
  const sourceTcHidden = sourceRowW !== null && sourceRowW < SOURCE_ROW_TC_MIN_PX;

  /* ---- W1-B (DESIGN-R25 §3/§6 A1): the source playback loop — the rAF
     twin of AppShell's program loop. Each frame advances the playhead
     through the STORE's testable seam (tickSourcePlayback), which stops
     at the out point / the source end by dropping sourcePlaying (this
     effect then tears the loop down via its deps). dt is capped at 100ms
     so a background tab's catch-up burst never jumps the playhead. Tests
     drive tickSourcePlayback directly — NO rAF reliance in jsdom (the
     seam is the documented contract). */
  useEffect(() => {
    if (!sourceMode || !sourcePlaying || !sourceMediaId) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      useUi.getState().tickSourcePlayback(dt);
      const s = useUi.getState();
      if (s.sourcePlaying && s.viewerMode === 'source' && s.sourceMediaId) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [sourceMode, sourcePlaying, sourceMediaId]);

  /* fit-anchored magnification ladder — honest labels for what the code
     does: Fit = letterbox-fill (1× fit width), the rest multiply the fit
     width (overflow-auto lets ≥2× scroll). The old 50/100/200% labels were
     container-percentages, not magnifications (R13 fix). */
  const zoomOptions = ['Fit', '1.25×', '1.5×', '2×', '4×'] as const;
  // R20 (thread th_mtp93qp5 / GH #66): 1.25× added — a fine-grained step the
  // reviewer asked for; DEVIATION from spec 18 §3.3's Fit/1.5/2/4 ladder
  // (registered in README deviations register).
  const m = zoom === 'Fit' ? 1 : zoom === '1.25×' ? 1.25 : zoom === '1.5×' ? 1.5 : zoom === '2×' ? 2 : 4;
  const zoomStyle: React.CSSProperties = zoom === 'Fit'
    ? { width: '100%' }
    : { width: `${m * 100}%`, maxWidth: 'none', maxHeight: 'none', flexShrink: 0 };

  /* overlays hidden while a tool drag is active (spec 18 §4.3/§9) */
  const hideOverlays = !overlaysOn || tool !== 'select';

  return (
    <div data-testid="shell-viewer" className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-shell">
      {/* viewer-toolbar (28px) — th_mto3504c: SOURCE mode swaps the chrome to
          exit-control + asset name + SOURCE chip + the asset's OWN res/fps
          (honest: a 4K/30 source says 4K/30); program keeps the §4.3 contract */}
      {sourceMode ? (
        <div className="relative flex items-center gap-2 border-b border-hairline px-2 text-[11px]" style={{ height: 28, minHeight: 28 }}>
          <button
            type="button"
            className="icon-btn !h-[20px] shrink-0"
            onClick={exitSourcePreview}
            data-tip="Back to program"
            aria-label="Back to program"
          >
            <X size={13} strokeWidth={1.7} />
          </button>
          <span className="min-w-0 truncate font-semibold text-tprimary" title={sourceMedia?.name}>
            {sourceMedia?.name ?? 'Source media missing'}
          </span>
          <span
            data-testid="shell-viewer-source-chip"
            className="mono shrink-0 rounded-sm border px-1 text-[10px] font-bold uppercase tracking-[0.08em]"
            style={{ borderColor: 'var(--accent-selection)', color: 'var(--accent-selection)' }}
          >
            SOURCE
          </span>
          <div className="grow" />
          {sourceMedia?.width ? <span className="tc-chip">{sourceMedia.width}×{sourceMedia.height}</span> : null}
          {sourceMedia?.fps ? <span className="tc-chip">{sourceMedia.fps} fps</span> : null}
        </div>
      ) : (
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
          onClick={toggleOverlays}
        >
          <Eye size={13} strokeWidth={1.6} />
        </button>
        <button
          className={`icon-btn !h-[20px] ${safeGuides ? 'toggled' : ''}`}
          data-tip="Safe area guides (UI pref)"
          aria-label="Toggle safe area guides"
          aria-pressed={safeGuides}
          onClick={toggleSafeGuides}
        >
          <Frame size={13} strokeWidth={1.6} />
        </button>
      </div>
      )}

      {/* video-frame — letterboxed monitor: PROGRAM (program monitor + DOM
          overlays) or SOURCE (asset poster, object-contain letterbox) */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-frame p-4">
        <div
          className="relative aspect-video max-h-full max-w-full overflow-hidden rounded-[var(--radius)] bg-black"
          style={zoomStyle}
        >
        {sourceMode ? (
          /* ---- SOURCE PREVIEW (th_mto3504c, spec 18 §4.3 v1.1) ----
             letterboxed poster (object-contain); audio assets show the same
             deterministic waveform grammar the pool uses; a small caption
             names the mode honestly — the poster is NOT played back. */
          <>
            {sourceMedia && sourceMedia.type !== 'audio' && !sourceMedia.offline ? (
              page === 'color' ? (
                /* R20-W4c (D3): the color page's source preview is the graded
                   canvas surface too — but the stack is EMPTY (the raw,
                   ungraded asset; color-layout §3.6 divergence). */
                <GradedViewerCanvas mediaId={sourceMediaId} elementId={null} mode="source" />
              ) : (
              <img
                src={sourceMedia.thumbnail}
                alt={`Source preview: ${sourceMedia.name}`}
                className="h-full w-full object-contain"
                onError={() => pushToast({ kind: 'error', title: 'Source preview failed to decode', detail: 'poster decode failed — check the media pool (spec 18 §4.2)' })}
              />
              )
            ) : sourceMedia?.type === 'audio' ? (
              <div className="flex h-full w-full items-center justify-center bg-[#0a0a0c] px-10">
                <svg width="100%" height={96} preserveAspectRatio="none" aria-hidden="true" className="max-h-[60%]">
                  {getWaveform(sourceMedia.id, 96, { amplitude: 0.9 }).map((b, i, all) => (
                    <rect
                      key={i}
                      x={`${i * (100 / all.length)}%`}
                      y={48 - b.max * 48}
                      width={`${100 / all.length - 0.5}%`}
                      height={Math.max(1, (b.max + b.min) * 48)}
                      fill="var(--waveform)"
                      opacity={0.85}
                      rx={0.5}
                    />
                  ))}
                </svg>
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#0a0a0c] text-[13px] text-[#9a9aa5]">
                {sourceMedia?.offline ? 'Media offline' : 'No source media — select a pool card'}
              </div>
            )}
            <span
              data-testid="shell-viewer-source-caption"
              className="mono pointer-events-none absolute bottom-2 left-2 rounded-sm bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white/85"
            >
              Source preview — spec 18 §4.3 v1.1
            </span>
            {/* W1-B (Fix C — A1: NEVER dim the image; the feedback is the
                strip). The poster's "playing" state = the live TC ticking +
                this thin accent progress line at the bottom edge (2px,
                width = playhead/duration, the house --playhead color) —
                its style tracks the playhead, playing or paused. Offline
                media carries no poster to preview, so no line. */}
            {sourceTransportDur != null && !sourceMedia?.offline && (
              <div
                data-testid="shell-viewer-source-progress"
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 left-0 h-[2px]"
                style={{ width: `${(sourcePh / sourceTransportDur) * 100}%`, background: 'var(--playhead)', opacity: 0.9 }}
              />
            )}
          </>
        ) : (
          <>
          {/* one name, one channel: real alt text (alt="" would mark the
              monitor decorative and drop the name from the a11y tree —
              R13 review caught alt="" + aria-label conflicting).
              R20-W4c (D3): on the COLOR page the image surface is the graded
              <canvas> (GradedViewerCanvas — decode→grade stack→encode, rAF
              coalesced); every OTHER page keeps this <img> (the program
              monitor boundary — 60+ Viewer tests pin it). */}
          {page === 'color' ? (
            <GradedViewerCanvas mediaId={el?.mediaId ?? null} elementId={el?.id ?? null} mode="program" />
          ) : img && !img.offline ? (
            frameLoading ? (
              /* §4.2 loading row: first-frame decode skeleton (pulse) */
              <div data-testid="shell-viewer-state-loading" role="status" className="flex h-full w-full animate-pulse items-center justify-center bg-[#0a0a0c] text-[13px] text-[#9a9aa5]">
                Loading first frame…
              </div>
            ) : decodeFailed ? (
              /* §4.2 viewer error row: decode failure + retry re-attempt */
              <div data-testid="shell-viewer-state-error" role="alert" className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#0a0a0c] text-[13px] text-[#9a9aa5]">
                <span>Media failed to decode — check the pool</span>
                <button type="button" onClick={retryDecode} className="underline decoration-dotted hover:text-white" aria-label="Retry decoding the program frame">
                  Retry
                </button>
              </div>
            ) : (
              <img key={imgKey} src={img.thumbnail} alt={`Program monitor: ${el?.name ?? 'empty'}`} className="h-full w-full object-cover" onError={onImgError} />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#0a0a0c] text-[13px] text-[#9a9aa5]">
              {/* theme-invariant on-canvas text: the monitor surround is always
                  near-black, so the light theme's --text-muted (3.1:1 here) must
                  not leak onto it — fixed #9a9aa5 measures ~7:1 (R13 review) */}
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

          {/* text overlay element composited over the frame — R24-W5b
              (F1 P3): joins the hideOverlays law (the 4th group of
              in-canvas overlay chrome: name chip, res chips, THIS text
              overlay, the safe guides — a non-select tool or the Eye pref
              off hides ALL of them; the Eye's aria-pressed stays the
              honest PREF state) */}
          {overlayEl && !hideOverlays && (
            <div className="pointer-events-none absolute bottom-[14%] left-1/2 -translate-x-1/2 text-center">
              <span className="text-[20px] font-semibold uppercase tracking-[0.22em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                {overlayEl.name}
              </span>
            </div>
          )}

          {/* R19 caption overlay (edit page, program mode): chips for
              caption-track elements under the playhead — bottom-anchored
              centered column, bg-black/75 + white 12px, rounded 3px, max-w
              80%. A SECOND overlapping caption renders under in yellow-400
              (the FR reference line). TODO(bilingual pairing): the real impl
              pairs an EN caption with its FR sibling across tracks by overlap;
              the mock renders the active captions in track order — index > 0
              takes the second-language styling. */}
          {page === 'edit' && captionHits.length > 0 && (
            <div
              data-testid="shell-viewer-caption"
              className="pointer-events-none absolute bottom-[7%] left-1/2 flex w-[80%] -translate-x-1/2 flex-col items-center gap-1"
              aria-live="off"
            >
              {captionHits.map(({ el: capEl }, i) => (
                <span
                  key={capEl.id}
                  className="rounded-[3px] bg-black/75 px-2 py-0.5 text-center text-[12px] leading-snug"
                  style={i > 0 ? { color: '#facc15' } : undefined}
                >
                  {capEl.text}
                </span>
              ))}
            </div>
          )}

      {/* R20-W2 (D2 / issue #63): the program-monitor EditOverlay dock is
          REMOVED — the edit functions belong to the SOURCE transport row
          (SourceEditBar, mounted below); the program monitor is a clean
          full-frame output (the old dock also covered ~44px of the image). */}

      {/* safe-area guides (viewer UI pref) — broadcast convention:
              90% action-safe + 80% title-safe centered rects, thin lines
              (labels: 10px strip-family floor + drop-shadow like the
              other in-canvas chips — spec 18 §11.12 / §9).
              R24-W5b (F1 P3): the guides join the hideOverlays law —
              all FOUR in-canvas overlay groups hide together while a
              non-select tool is armed or the Eye pref is off. */}
          {safeGuides && !hideOverlays && (
            <div className="pointer-events-none absolute inset-0" data-testid="shell-viewer-safe-guides" aria-hidden="true">
              <div className="absolute inset-[5%] border border-white/45" />
              <div className="absolute inset-[10%] border border-white/25" />
              <span className="absolute left-[5.5%] top-[5.5%] mono text-[10px] font-medium text-white/70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                action safe 90%
              </span>
              <span className="absolute left-[10.5%] bottom-[10.5%] mono text-[10px] font-medium text-white/55 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                title safe 80%
              </span>
            </div>
          )}
          </>
        )}

        </div>
      </div>

      {/* scrub-row — SOURCE mode (W1-B, A1): the real SCRUB STRIP
          (SourceRangeBar — the source PLAYHEAD marker + the dual in/out
          trim handles + the out-of-range dimming; playhead clamps to the
          range when one is set). Stills ride the 5s pseudo-duration (A1: a
          still = a normal 5s clip). The program mode keeps the timeline
          scrub row below. */}
      {sourceMode ? (
        sourceMediaId ? (
          <SourceRangeBar mediaId={sourceMediaId} />
        ) : (
          <div
            className="relative flex shrink-0 items-center border-t border-hairline px-2"
            style={{ height: 14, minHeight: 14 }}
            data-testid="shell-viewer-scrub"
            aria-label="Source duration (static preview)"
          >
            <div className="relative h-full w-full">
              <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-sm bg-[var(--border-soft)]" />
            </div>
          </div>
        )
      ) : (
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
        tabIndex={0}
        onKeyDown={(e) => {
          // slider contract (spec 18 §11.3): the scrub row is keyboard-operable —
          // ←/→ nudge ±1 frame (⇧ ×10), Home/End jump (same grammar as the
          // transport keys; R13 review: role=slider was keyboard-dead)
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            useUi.getState().nudgePlayhead((e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 10 : 1));
          } else if (e.key === 'Home' || e.key === 'End') {
            e.preventDefault();
            useUi.getState().setPlayhead(e.key === 'Home' ? 0 : duration);
          }
        }}
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
          <div data-testid="shell-viewer-scrub-playhead" className="absolute top-1/2 h-[11px] w-[2px] -translate-y-1/2 rounded-sm" style={{ left: pct(playhead), background: 'var(--playhead)' }} />
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
      )}

      {/* transport-row (32px, spec 18 §4.3): CENTER = transport cluster,
          RIGHT = loop + marks + marker palette. SOURCE mode (W1-B, A1):
          [LEFT: the live source TC] [CENTER: the 5-button transport —
          go-to-start / step / play / step / go-to-end, the program mode's
          exact grammar] | [the SourceEditBar — the PRIORITY cluster] [the
          trim cluster] [the duration readout]. The mark/loop ops stay
          program-mode (markIn/markOut write the program loop — A1's
          Mark-In/Out right cluster is covered by the source-range I/O
          handles + trim buttons per the R22 W4 law). W1-A (R1): the row
          degrades by PRIORITY — readouts hide first, the buttons NEVER. */}
      {sourceMode ? (
        <div
          ref={sourceRowRef}
          className="relative flex shrink-0 items-center gap-2 px-2"
          style={{ height: 32, minHeight: 32 }}
          data-testid="shell-viewer-transport"
        >
          {/* W1-B: LEFT = the live source TC — tc(sourcePlayhead), mono 11px;
              ticks live while playing (the readout IS the playing feedback,
              with the poster progress line). W1-A: hides below the row's
              TC floor (data-tip keeps the position; the strip's aria-label
              carries it too). */}
          <span
            data-testid="shell-viewer-source-tc"
            data-tip={`Source playhead ${tc(sourcePh)}`}
            hidden={sourceTcHidden || undefined}
            className="mono shrink-0 text-[11px] text-tmuted"
          >
            {tc(sourcePh)}
          </span>
          {/* W1-B: the CENTER transport cluster — the program mode's exact
              5-button pattern, riding the SOURCE playhead's store seam.
              The store's domain clamp makes Home/End honor a set trim
              range (go-to-start lands on range.in when trimmed). No
              source open → the handlers guard to no-ops (honest inert,
              no toast spam). */}
          <div role="group" aria-label="Source transport" data-testid="shell-source-transport" className="flex shrink-0 items-center gap-2">
            <button
              className="icon-btn !h-[20px] !w-[20px]"
              onClick={() => sourceMediaId && seekSource(sourceMediaId, 0)}
              data-tip="Go to start (Home)"
              aria-label="Go to start"
              data-testid="shell-source-btn-goto-start"
            >
              <SkipBack size={13} strokeWidth={1.6} />
            </button>
            <button
              className="icon-btn !h-[20px] !w-[20px]"
              onClick={() => sourceMediaId && nudgeSource(sourceMediaId, -1)}
              data-tip="Step back 1 frame (←)"
              aria-label="Step back one frame"
              data-testid="shell-source-btn-step-back"
            >
              <ChevronLeft size={14} strokeWidth={1.6} />
            </button>
            <button
              className="flex h-[24px] w-[28px] items-center justify-center rounded-[var(--radius)] transition-colors"
              onClick={() => sourceMediaId && toggleSourcePlay()}
              data-testid="shell-viewer-btn-play"
              data-tip="Play / Pause (Space)"
              aria-label="Play or pause"
              style={{
                color: 'var(--text-primary)',
                background: sourcePlaying ? 'var(--active-overlay)' : 'var(--bg-inset)',
                border: `1px solid ${sourcePlaying ? 'var(--border-strong)' : 'var(--border-soft)'}`,
              }}
            >
              {sourcePlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-[2px]" />}
            </button>
            <button
              className="icon-btn !h-[20px] !w-[20px]"
              onClick={() => sourceMediaId && nudgeSource(sourceMediaId, 1)}
              data-tip="Step forward 1 frame (→)"
              aria-label="Step forward one frame"
              data-testid="shell-source-btn-step-fwd"
            >
              <ChevronRight size={14} strokeWidth={1.6} />
            </button>
            <button
              className="icon-btn !h-[20px] !w-[20px]"
              onClick={() => sourceMediaId && seekSource(sourceMediaId, Infinity)}
              data-tip="Go to end (End)"
              aria-label="Go to end"
              data-testid="shell-source-btn-goto-end"
            >
              <SkipForward size={13} strokeWidth={1.6} />
            </button>
          </div>
          {/* the divider: the transport | the edit functions (A1: the 7
              edit-mode buttons stay in the row — Premiere's Source-Monitor
              placement — behind a clear divider). */}
          <div role="separator" aria-orientation="vertical" aria-label="Transport and edit functions" className="h-[16px] w-px shrink-0 bg-hairline" />
          {/* W1-A (R1 — THE RESCUE): the edit bar is the row's PRIORITY
              consumer — flex-1 + a 190px FLEX BASIS (the 7-icon-only floor:
              7 × 24px + gaps). The old row starved the flex-1 wrapper to
              0px at ≤900px canvas because the shrink-0 siblings (trim 72 +
              readout 178) always won; the basis + the readouts' degradation
              (they hide below their floors) keep the wrapper fed — the 7
              mode buttons are visible at every usable width, and the bar's
              own measured ladder (SourceEditBar) drops it to icon-only
              before it can starve. */}
          <div className="flex h-8 min-w-0 flex-1 items-center" style={{ flexBasis: '190px' }}>
            <SourceEditBar />
          </div>
          {/* R22 #84/#85: the trim-edit controls (the source-range I/O
              cluster — W1-A: degrades SECOND, i.e. it KEEPS its icons at
              every width). R24-W5b (F1 P2, the honest-control law): the
              definite commit is the head/tail reset — trim-in resets the
              range start to the source head, trim-out extends the end to
              the tail (both through the SAME store setters the handles
              use, so the readout moves). Until a range exists (and once an
              edge already sits at its end) the button is aria-disabled
              with the reason in the tip and carries NO onClick — nothing
              can mint the old semantically-identical full range. */}
          {sourceMediaId && sourceDur != null && (
            <div role="group" aria-label="Source trim controls" className="flex shrink-0 items-center gap-1" data-testid="shell-source-trim-controls">
              {(() => {
                /* enabled ⟺ the commit would move the readout (range exists
                   AND the edge is not already at its end) — a control that
                   would commit nothing renders honestly disabled */
                const range = sourceRange ?? null;
                const inDisabled = !range || range.in <= 0;
                const outDisabled = !range || range.out >= sourceDur;
                const clearDisabled = !range;
                return (
                  <>
                    <button
                      type="button"
                      className={`icon-btn !h-[20px] !w-[22px] !text-[13px] !font-bold ${inDisabled ? 'disabled' : ''}`}
                      data-tip={
                        !range
                          ? 'Trim in — disabled: drag the IN handle below to set a range first'
                          : inDisabled
                            ? 'Trim in — disabled: the range already starts at the source head'
                            : 'Trim in — reset the range start to the source head (drag the IN handle for fine trim)'
                      }
                      aria-label="Set source in point"
                      data-testid="shell-source-trim-in"
                      aria-disabled={inDisabled || undefined}
                      onClick={inDisabled ? undefined : () => useUi.getState().setSourceRangeIn(sourceMediaId!, 0)}
                    >
                      <span aria-hidden>[</span>
                    </button>
                    <button
                      type="button"
                      className={`icon-btn !h-[20px] !w-[22px] !text-[13px] !font-bold ${outDisabled ? 'disabled' : ''}`}
                      data-tip={
                        !range
                          ? 'Trim out — disabled: drag the OUT handle below to set a range first'
                          : outDisabled
                            ? 'Trim out — disabled: the range already runs to the source tail'
                            : 'Trim out — extend the range end to the source tail (drag the OUT handle for fine trim)'
                      }
                      aria-label="Set source out point"
                      data-testid="shell-source-trim-out"
                      aria-disabled={outDisabled || undefined}
                      onClick={outDisabled ? undefined : () => useUi.getState().setSourceRangeOut(sourceMediaId!, sourceDur!)}
                    >
                      <span aria-hidden>]</span>
                    </button>
                    <button
                      type="button"
                      className={`icon-btn !h-[20px] !w-[20px] !text-[12px] !font-bold ${clearDisabled ? 'disabled' : ''}`}
                      data-tip={
                        clearDisabled
                          ? 'Clear trim range — disabled: no range is set (the full source already inserts)'
                          : 'Clear the trim range — the full source inserts again'
                      }
                      aria-label="Clear source trim range"
                      data-testid="shell-source-trim-clear"
                      aria-disabled={clearDisabled || undefined}
                      onClick={clearDisabled ? undefined : () => useUi.getState().clearSourceRange(sourceMediaId!)}
                    >
                      <span aria-hidden>×</span>
                    </button>
                  </>
                );
              })()}
            </div>
          )}
          {/* W1-A: the duration readout DEGRADES FIRST — below the row's
              readout floor it hides entirely (the full text survives in
              data-tip + the scrub strip's aria-label); above it, it may
              truncate (min-w-0 + shrink) instead of starving the priority
              clusters. The R23-FIX reactive subscription stays (the
              readout follows every range writer). */}
          <span
            hidden={sourceReadoutHidden || undefined}
            className="mono min-w-0 shrink truncate text-[11px] text-tmuted"
            data-testid="shell-viewer-source-duration"
            data-tip={
              sourceMediaId && sourceDur != null && sourceRange
                ? `Range ${tc(sourceRange.in)}–${tc(sourceRange.out)} · ${tc(sourceRange.out - sourceRange.in)} of ${tc(sourceDur)}`
                : `Source duration ${sourceDur !== null ? tc(sourceDur) : '— still image'}`
            }
          >
            {sourceMediaId && sourceDur != null && sourceRange
              ? `Range ${tc(sourceRange.in)}–${tc(sourceRange.out)} · ${tc(sourceRange.out - sourceRange.in)} of ${tc(sourceDur)}`
              : `Source duration ${sourceDur !== null ? tc(sourceDur) : '— still image'}`}
          </span>
        </div>
      ) : (
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
          <span ref={markerRef} className="relative flex items-center">
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
            {/* explicit keyboard-open path: a labelled chevron toggle next to
                the flag (R13 fix — the palette was right-click-only) */}
            <button
              className="icon-btn !h-[20px] !w-[16px]"
              onClick={() => setPaletteOpen(!paletteOpen)}
              data-tip="Marker color palette"
              aria-label="Marker color"
              aria-haspopup="menu"
              aria-expanded={paletteOpen}
            >
              <ChevronDown size={11} strokeWidth={1.8} />
            </button>
            {paletteOpen && (
              <span className="absolute right-0 top-[110%] z-50 flex items-center gap-1 rounded-[var(--radius)] border border-strong bg-inset p-1" role="menu" aria-label="Marker color">
                {MARKER_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="menuitemradio"
                    aria-checked={c === MARKER_CYCLE[scene.markers.length % MARKER_CYCLE.length]}
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
      )}
    </div>
  );
}

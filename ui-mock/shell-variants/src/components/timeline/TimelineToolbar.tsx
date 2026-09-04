/* TimelineToolbar — spec 18 §4.5: tool cluster (radio, spec 16 keys),
   snap/link/lock toggles, marker cluster, zoom cluster, master audio.
   Mock's sync-bin/auto-sync/dyntrim dropped (§8.10 / §8.9). */

import { useRef } from 'react';
import { MousePointer2, Magnet, Link2, Lock, Flag, ScanSearch, Frame, Volume2, VolumeX, AudioLines } from 'lucide-react';
import { useUi, type ToolId } from '../../state/useUiStore';
import { sceneDuration } from '../../lib/mockData';
import { StripMeter } from '../mixer/MixerPrimitives';
import { ContextMenu, useContextMenu } from '../shell/ContextMenu';
import { markerColorItems } from './Ruler';

const BladeIcon = () => (
  <svg width="13" height="15" viewBox="0 0 20 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <line x1="10" y1="1" x2="10" y2="23" strokeDasharray="3 3" />
    <polygon points="6 1 14 1 10 7" fill="currentColor" stroke="none" />
  </svg>
);
const RollIcon = () => (
  <svg width="15" height="13" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M3 2 L9 10 L3 18" /><path d="M21 2 L15 10 L21 18" />
  </svg>
);
const RippleIcon = () => (
  <svg width="15" height="13" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M8 2 L14 10 L8 18" /><path d="M16 6 L20 10 L16 14" />
    <path d="M4 10h4" /><path d="M20 10h0" />
  </svg>
);

const TOOLS: { id: ToolId; tip: string; icon: React.ReactNode }[] = [
  { id: 'select', tip: 'Selection (V)', icon: <MousePointer2 size={14} strokeWidth={1.8} /> },
  { id: 'blade', tip: 'Blade (B)', icon: <BladeIcon /> },
  { id: 'roll', tip: 'Roll (T)', icon: <RollIcon /> },
  { id: 'ripple', tip: 'Ripple (R)', icon: <RippleIcon /> },
  { id: 'slip', tip: 'Slip (Y)', icon: <svg width="15" height="13" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 10h20" /><path d="M7 5l-5 5 5 5" /><path d="M17 5l5 5-5 5" /></svg> },
  { id: 'slide', tip: 'Slide (U)', icon: <svg width="15" height="13" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="8" y="4" width="8" height="12" rx="1" /><path d="M3 10h3" /><path d="M18 10h3" /></svg> },
  { id: 'stretch', tip: 'Rate stretch', icon: <svg width="15" height="13" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 3v14" strokeDasharray="2 2" /><path d="M20 3v14" strokeDasharray="2 2" /><path d="M7 10h10" /><path d="M14 7l3 3-3 3" /><path d="M10 7l-3 3 3 3" /></svg> },
];

/* R15 T1 — zoom math from the shared pixel lib (single source; this file
   previously carried its own 8–240 bounds + log map). The slider maps
   EXPONENTIALLY against the DYNAMIC min (spec-05 §5.2): slider 0 ⇔ fit-with-
   headroom (content = 25% of viewport). All zoom mutations route through the
   zoom bus so the controller captures pre-zoom scroll (two-regime anchoring). */
import { zoomToSlider, sliderToZoomPps } from '../../lib/pixel';
import { zoomBus } from '../../lib/zoomController';

export function TimelineToolbar() {
  const tool = useUi((s) => s.tool);
  const setTool = useUi((s) => s.setTool);
  const snap = useUi((s) => s.snap);
  const link = useUi((s) => s.link);
  const lockAll = useUi((s) => s.lockAll);
  const toggleSnap = useUi((s) => s.toggleSnap);
  const toggleLink = useUi((s) => s.toggleLink);
  const toggleLockAll = useUi((s) => s.toggleLockAll);
  const pxPerSec = useUi((s) => s.pxPerSec);
  const zoomMinPps = useUi((s) => s.zoomMinPps);
  const setZoom = useUi((s) => s.setZoom);
  const playhead = useUi((s) => s.playhead);
  const addMarker = useUi((s) => s.addMarker);
  const masterMuted = useUi((s) => s.masterMuted);
  const masterVolume = useUi((s) => s.masterVolume);
  const toggleMasterMute = useUi((s) => s.toggleMasterMute);
  const setMasterVolume = useUi((s) => s.setMasterVolume);
  const mixerState = useUi((s) => s.mixerState);
  const cycleMixerState = useUi((s) => s.cycleMixerState);
  const scene = useUi((s) => s.scenes.find((x) => x.id === s.activeSceneId)!);
  const pushToast = useUi((s) => s.pushToast);
  const menu = useContextMenu(); // §4.9 marker-color dropdown (R14 no-op sweep)
  const sliderRef = useRef<HTMLInputElement>(null); // magnifier focuses the zoom slider

  /* lane-viewport measurement for the zoom cluster — same source as the ⌘\
     binding (useShortcuts): #timeline-scroll's clientWidth, 900 fallback when
     the element is absent OR jsdom reports 0 (no layout). */
  const measureLanes = () => {
    const w = document.getElementById('timeline-scroll')?.clientWidth ?? 900;
    return w > 0 ? w : 900;
  };

  /* zoom-to-selection (R14 no-op sweep): span = min start → max end of the
     selection across the ACTIVE scene; empty selection or span ≤ 0 → honest
     info toast; else setZoom so the span fills ~80% of the lane viewport
     (setZoom clamps 8..240 px/s — the spec 16 §3.8 zoom window). */
  const zoomToSelection = () => {
    const s = useUi.getState();
    const sc = s.scenes.find((x) => x.id === s.activeSceneId)!;
    let tMin = Infinity, tMax = -Infinity, hits = 0;
    for (const t of sc.tracks) for (const el of t.elements) {
      if (!s.selection.includes(el.id)) continue;
      hits++;
      tMin = Math.min(tMin, el.startTime);
      tMax = Math.max(tMax, el.startTime + el.duration);
    }
    const span = tMax - tMin;
    if (hits === 0 || !(span > 0)) {
      pushToast({ kind: 'info', title: 'Zoom to selection', detail: 'No selection — select clips to zoom to their span' });
      return;
    }
    setZoom((measureLanes() * 0.8) / span);
    // center the span after the zoom re-render (R15: routed via rAF so the
    // new content width is laid out first)
    requestAnimationFrame(() => {
      const scEl = document.getElementById('timeline-scroll');
      if (scEl) scEl.scrollLeft = Math.max(0, tMin * useUi.getState().pxPerSec - scEl.clientWidth / 2);
    });
  };

  return (
    <>
      <div
      data-testid="shell-timeline-toolbar"
      role="toolbar"
      aria-label="Timeline toolbar"
      className="flex shrink-0 items-center gap-1 border-b border-hairline bg-shell px-2.5"
      style={{ height: 'var(--bar-h)', minHeight: 'var(--bar-h)' }}
    >
      {/* view options — honest mock: the popover isn't specced; density and
          clip-style live in the debug overlay, so the button explains instead
          of silently doing nothing (R14 no-op sweep) */}
      <button
        className="icon-btn"
        data-testid="shell-timeline-toolbar-btn-view-options"
        data-tip="Timeline view options"
        aria-label="Timeline view options"
        onClick={() => pushToast({ kind: 'info', title: 'View options', detail: 'popover not specced — density/clip-style live in the debug overlay (ctrl+`)' })}
      >
        <svg width="16" height="13" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="1" y="1" width="22" height="4" /><rect x="1" y="7" width="22" height="4" /><rect x="1" y="13" width="22" height="4" />
        </svg>
      </button>

      <div className="grow" />

      {/* tool cluster (radio) — §11.1: arrow-key navigation + roving focus */}
      <div
        className="flex items-center gap-0.5"
        role="radiogroup"
        aria-label="Edit tool"
        onKeyDown={(e) => {
          // spec 18 §11.1: "the tool radio group uses arrow-key navigation".
          // R14: the radios were click/Tab-only — arrow roving was missing.
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
          e.preventDefault();
          const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
          const idx = TOOLS.findIndex((t) => t.id === tool);
          const next = (idx + dir + TOOLS.length) % TOOLS.length;
          setTool(TOOLS[next].id);
          // rove focus with the checked state (radios: focus follows selection)
          document.querySelector<HTMLElement>(`[data-testid="shell-timeline-toolbar-tool-${TOOLS[next].id}"]`)?.focus();
        }}
      >
        {TOOLS.map((t) => (
          <button
            key={t.id}
            role="radio"
            aria-checked={tool === t.id}
            data-testid={`shell-timeline-toolbar-tool-${t.id}`}
            className={`icon-btn ${tool === t.id ? 'toggled' : ''}`}
            data-tip={t.tip}
            aria-label={t.tip}
            onClick={() => setTool(t.id)}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className="vsep" />

      {/* snap / link / lock */}
      <button
        id="btn-magnet"
        className={`icon-btn ${snap ? 'toggled' : ''}`}
        data-testid="shell-timeline-toolbar-btn-snap"
        data-tip="Snapping (N)"
        aria-label="Toggle snapping"
        aria-pressed={snap}
        onClick={toggleSnap}
      >
        <Magnet size={15} strokeWidth={1.8} />
      </button>
      <button
        className={`icon-btn ${link ? 'toggled' : ''}`}
        data-tip="Link A/V"
        aria-label="Toggle A/V link"
        aria-pressed={link}
        onClick={toggleLink}
      >
        <Link2 size={15} strokeWidth={2} />
      </button>
      <button
        className={`icon-btn ${lockAll ? 'toggled' : ''}`}
        data-tip="Lock all tracks"
        aria-label="Lock all tracks"
        aria-pressed={lockAll}
        onClick={toggleLockAll}
      >
        <Lock size={13} strokeWidth={1.8} />
      </button>

      <div className="vsep" />

      {/* markers */}
      <button className="flex items-center gap-1.5 rounded-[var(--radius)] px-1.5 py-1 hover:bg-[var(--hover-overlay)]" data-tip="Add marker (M)" aria-label="Add marker" onClick={() => addMarker(playhead)}>
        <Flag size={13} strokeWidth={1.8} className="text-[var(--mk-blue)]" />
      </button>
      {/* marker-color dropdown (R14 no-op sweep: the color-dot + chevron was
          dead). Opens the SHARED §4.9 8-color palette row (markerColorItems,
          the same builder the ruler menu renders) at the button; picking a
          color adds a colored marker at the playhead. Roving/Esc are the
          ContextMenu machinery's own. */}
      <button
        className="flex items-center gap-1 rounded-[var(--radius)] px-1.5 py-1 hover:bg-[var(--hover-overlay)]"
        data-testid="shell-timeline-toolbar-btn-marker-color"
        data-tip="Marker color"
        aria-label="Marker color options"
        aria-haspopup="menu"
        aria-expanded={menu.state !== null}
        onClick={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          menu.open(
            r.left, r.bottom + 2,
            markerColorItems(
              (c) => { menu.close(); addMarker(useUi.getState().playhead, c); },
              'shell-menu-tb-marker-color',
            ),
            'tb-marker-color',
          );
        }}
      >
        <span className="h-[13px] w-[13px] rounded-full" style={{ background: 'var(--mk-blue)' }} />
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="3"><polyline points="6 9 12 15 18 9" /></svg>
      </button>

      <div className="vsep" />

      {/* zoom cluster (R14 no-op sweep — all three icon buttons were dead).
          R15 T1: fit + ± route through the zoom bus (controller pre-capture /
          two-regime anchoring); the slider maps exponentially against the
          DYNAMIC min (spec-05 §5.2); ± step factor 1.7 (canonical, spec-16
          §3.8 revision R15-1). Magnifier: focuses the zoom slider (distinct
          honest effect — exposing the slider's keyboard grammar, spec 18 §11.3). */}
      <button
        className="icon-btn"
        data-testid="shell-timeline-toolbar-btn-zoom-fit"
        data-tip="Zoom to fit (⌘\)"
        aria-label="Zoom to fit"
        onClick={() => zoomBus.zoomFit(measureLanes(), sceneDuration(scene))}
      >
        <ScanSearch size={15} strokeWidth={1.5} />
      </button>
      <button
        className="icon-btn"
        data-testid="shell-timeline-toolbar-btn-zoom-selection"
        data-tip="Zoom to selection"
        aria-label="Zoom to selection"
        onClick={zoomToSelection}
      >
        <Frame size={14} strokeWidth={1.6} />
      </button>
      <button
        className="icon-btn"
        data-tip="Focus zoom slider"
        aria-label="Focus zoom slider"
        onClick={() => sliderRef.current?.focus()}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </button>
      <button className="icon-btn !h-[18px] !w-[18px] !text-[15px]" onClick={() => zoomBus.zoomOut()} data-tip="Zoom out (−)" aria-label="Zoom out">−</button>
      <input
        ref={sliderRef}
        type="range"
        min={0}
        max={100}
        step={0.5}
        value={zoomToSlider(pxPerSec, zoomMinPps) * 100}
        onChange={(e) => zoomBus(sliderToZoomPps(Number(e.target.value) / 100, zoomMinPps))}
        aria-label="Timeline zoom"
        aria-valuetext={`${Math.round(pxPerSec)} px/s`} /* §11.3 slider contract */
        className="w-[90px]"
      />
      <button className="icon-btn !h-[18px] !w-[18px] !text-[15px]" onClick={() => zoomBus.zoomIn()} data-tip="Zoom in (+)" aria-label="Zoom in">+</button>
      <span className="mono hidden shrink-0 pl-1 text-[11px] text-tmuted xl:inline">{Math.round(pxPerSec)} px/s</span>

      <div className="vsep" />

      {/* mixer dock state — design doc v2.2 §4: Edit cycles collapsed→bridge→full;
          Audio toggles bridge↔full. No chord (⌘⇧M is spec 16 §3.5 mute-all). */}
      <button
        className={`icon-btn ${mixerState !== 'collapsed' ? 'toggled' : ''}`}
        data-tip="Mixer dock (bridge / full, beside the lanes)"
        aria-label="Toggle mixer dock"
        aria-pressed={mixerState !== 'collapsed'}
        onClick={cycleMixerState}
        data-testid="btn-mixer-state"
      >
        <AudioLines size={14} strokeWidth={1.6} />
      </button>

      <div className="vsep" />

      {/* master audio + always-on micro-meter (design doc §3.2 — zero new regions).
          ⌘M tooltip honesty: spec 16 §3.5 binds ⌘M to FOCUSED-track mute; the
          mock falls back to master only when nothing is focused (registered). */}
      <button
        className={`icon-btn ${masterMuted ? 'toggled' : ''}`}
        data-tip="Mute focused track (⌘M — master when nothing focused)"
        aria-label="Mute master"
        aria-pressed={masterMuted}
        onClick={toggleMasterMute}
      >
        {masterMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>
      {/* R15-A2: the shared engine's ONE master key + the micro-meter variant
          (14px: 4 coarse chunks, no 3px LED segments, same palette/engine) */}
      <StripMeter trackId="master" db={masterMuted ? -60 : masterVolume * 66 - 60} height={14} width={4} coarse label="Master" />
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(masterVolume * 100)}
        onChange={(e) => setMasterVolume(Number(e.target.value) / 100)}
        className="green-fill w-[70px]"
        style={{ ['--fill' as string]: `${Math.round(masterVolume * 100)}%` }}
        aria-label="Master volume"
        aria-valuetext={`${Math.round(masterVolume * 100)}%`} /* §11.3 slider contract */
      />
      {/* DIM chip — display-only (R14 no-op sweep): master dim is M2 (spec 20
          §12); no local toggle is possible without the audio path, so the chip
          carries the disabled contract (aria-disabled + tip) instead of
          pretending to be a live control */}
      <span
        aria-disabled="true"
        data-tip="Master dim is M2 (spec 20 §12) — display-only in the mock"
        className="shrink-0 rounded-[var(--radius-sm)] border border-strong px-1.5 py-px text-[11px] text-tmuted"
      >
        DIM
      </span>
      </div>
      {menu.state && <ContextMenu {...menu.state} onClose={menu.close} />}
    </>
  );
}

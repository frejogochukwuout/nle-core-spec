/* TimelineToolbar — spec 18 §4.5: tool cluster (radio, spec 16 keys),
   snap/link/lock toggles, marker cluster, zoom cluster, master audio.
   Mock's sync-bin/auto-sync/dyntrim dropped (§8.10 / §8.9). */

import { MousePointer2, Magnet, Link2, Lock, Flag, ScanSearch, Frame, Volume2, VolumeX } from 'lucide-react';
import { useUi, type ToolId } from '../../state/useUiStore';

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

const MIN_PPS = 8, MAX_PPS = 240;
const ppsToSlider = (pps: number) => (Math.log(pps / MIN_PPS) / Math.log(MAX_PPS / MIN_PPS)) * 100;
const sliderToPps = (v: number) => MIN_PPS * Math.pow(MAX_PPS / MIN_PPS, v / 100);

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
  const setZoom = useUi((s) => s.setZoom);
  const zoomStep = useUi((s) => s.zoomStep);
  const playhead = useUi((s) => s.playhead);
  const addMarker = useUi((s) => s.addMarker);
  const masterMuted = useUi((s) => s.masterMuted);
  const masterVolume = useUi((s) => s.masterVolume);
  const toggleMasterMute = useUi((s) => s.toggleMasterMute);
  const setMasterVolume = useUi((s) => s.setMasterVolume);

  return (
    <div
      data-testid="shell-timeline-toolbar"
      role="toolbar"
      aria-label="Timeline toolbar"
      className="flex shrink-0 items-center gap-1 border-b border-hairline bg-shell px-2.5"
      style={{ height: 'var(--bar-h)', minHeight: 'var(--bar-h)' }}
    >
      <button className="icon-btn" data-tip="Timeline view options" aria-label="Timeline view options">
        <svg width="16" height="13" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="1" y="1" width="22" height="4" /><rect x="1" y="7" width="22" height="4" /><rect x="1" y="13" width="22" height="4" />
        </svg>
      </button>

      <div className="grow" />

      {/* tool cluster (radio) */}
      <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Edit tool">
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
      <button className="flex items-center gap-1 rounded-[var(--radius)] px-1.5 py-1 hover:bg-[var(--hover-overlay)]" data-tip="Marker color" aria-label="Marker color options">
        <span className="h-[13px] w-[13px] rounded-full" style={{ background: 'var(--mk-blue)' }} />
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="3"><polyline points="6 9 12 15 18 9" /></svg>
      </button>

      <div className="vsep" />

      {/* zoom cluster */}
      <button className="icon-btn" data-tip="Zoom to fit (⌘\)" aria-label="Zoom to fit">
        <ScanSearch size={15} strokeWidth={1.5} />
      </button>
      <button className="icon-btn" data-tip="Zoom to selection" aria-label="Zoom to selection">
        <Frame size={14} strokeWidth={1.6} />
      </button>
      <button className="icon-btn" data-tip="Timeline zoom" aria-label="Timeline zoom">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </button>
      <button className="icon-btn !h-[18px] !w-[18px] !text-[15px]" onClick={() => zoomStep(1 / 1.5)} data-tip="Zoom out (−)" aria-label="Zoom out">−</button>
      <input
        type="range"
        min={0}
        max={100}
        step={0.5}
        value={ppsToSlider(pxPerSec)}
        onChange={(e) => setZoom(sliderToPps(Number(e.target.value)))}
        aria-label="Timeline zoom"
        className="w-[90px]"
      />
      <button className="icon-btn !h-[18px] !w-[18px] !text-[15px]" onClick={() => zoomStep(1.5)} data-tip="Zoom in (+)" aria-label="Zoom in">+</button>
      <span className="mono hidden shrink-0 pl-1 text-[11px] text-tmuted xl:inline">{Math.round(pxPerSec)} px/s</span>

      <div className="vsep" />

      {/* master audio */}
      <button
        className={`icon-btn ${masterMuted ? 'toggled' : ''}`}
        data-tip="Mute master"
        aria-label="Mute master"
        aria-pressed={masterMuted}
        onClick={toggleMasterMute}
      >
        {masterMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(masterVolume * 100)}
        onChange={(e) => setMasterVolume(Number(e.target.value) / 100)}
        className="green-fill w-[70px]"
        style={{ ['--fill' as string]: `${Math.round(masterVolume * 100)}%` }}
        aria-label="Master volume"
      />
      <span className="shrink-0 rounded-[var(--radius-sm)] border border-strong px-1.5 py-px text-[11px] text-tmuted">DIM</span>
    </div>
  );
}

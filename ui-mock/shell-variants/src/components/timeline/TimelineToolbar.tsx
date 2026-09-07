/* TimelineToolbar — spec 18 §4.5: tool cluster (radio, spec 16 keys),
   snap/link/lock toggles, marker cluster, zoom cluster, master audio.
   Mock's sync-bin/auto-sync/dyntrim dropped (§8.10 / §8.9).
   R23-WB (DESIGN-R23 D-B3; issue #94): the DENSITY toggle — compact strip
   ↔ full tracks, available on every page EXCEPT FX ("this super compact
   mode we should allow to be used everywhere"); the pressed state reads
   the ONE store resolver (resolveTimelineCompact) so the button never lies
   about what is rendered, and the click writes the user's per-session
   override ('on'/'off'; 'auto' remains the boot default per page).
   R23-WD (DESIGN-R23 D-D2; issue #108, Part IX ruling 15): the PER-PAGE
   cluster matrix — [research-informed: Resolve's pages carry different
   toolbars: Color has no timeline toolbar (the filmstrip replaces it),
   Deliver none, Cut/Edit carry the editing tools]. Our first-pass matrix
   (R23-FIX review-sweep R-b: the FX density cell is ✗ now — D-A1/ruling 8
   wins over the matrix's density row; the design doc's matrix row is
   updated to match):

     cluster               | Edit | Color | Audio | FX | Deliver |
     ----------------------|------|-------|-------|----|---------|
     edit tools radio (+FX)|  ✔  |   —   |   —   | —  |    —    |
     snap                  |  ✔  |   —   |   ✔   | —  |    —    |
     link / lock           |  ✔  |   —   |   —   | —  |    —    |
     markers               |  ✔  |   —   |   —   | —  |    —    |
     density               |  ✔  |   ✔   |   ✔   | ✗  |    ✔    |
     zoom                  |  ✔  |   ✔   |   ✔   | ✔  | ✔ (read-mostly) |
     mixer state           |  ✔  |   —   |   ✔   | —  |    —    |
     master audio          |  ✔  |   —   |   ✔   | —  |    —    |

   Every hidden cluster is DOM-ABSENT (never display:none — the F6/rover
   dense laws); the vseps ride along (a separator between two clusters
   renders only when BOTH clusters render — an absent cluster never leaves
   a dangling bar). The mixer-state + master-audio clusters hide on color
   AND fx AND deliver (ruling 15: Edit + Audio only). The view-options
   button is the pre-matrix house button — it stays on every page. */

import { useRef } from 'react';
import { MousePointer2, Magnet, Link2, Lock, Flag, ScanSearch, Frame, Volume2, VolumeX, AudioLines, PanelRight, SlidersHorizontal, Rows3 } from 'lucide-react';
import { useUi, resolveTimelineCompact, type Page, type ToolId } from '../../state/useUiStore';
import { sceneDuration } from '../../lib/mockData';
import { StripMeter } from '../mixer/MixerPrimitives';
import { mixerStateLabel } from '../mixer/MixerDock';
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
/* R23-WA (DESIGN-R23 D-A1): the FX tool's glyph — the transition marker's
   own crossfade mark (two overlapping triangles), so the tool and the
   objects it edits read as ONE domain. */
const FxToolIcon = () => (
  <svg width="15" height="13" viewBox="0 0 24 20" fill="none">
    <path d="M5 3 L12 10 L5 17 Z" fill="currentColor" stroke="none" opacity="0.9" />
    <path d="M19 3 L12 10 L19 17 Z" fill="currentColor" stroke="none" opacity="0.9" />
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
  /* R23-WA (D-A1): the FX tool — the "general tool mode in Edit" path
     (#105): clips recede, seam/head/tail zones + transition boxes become
     the edit targets. Escape (the existing tool rung) exits; the FX page
     (⌘5) is the other door into the same engine. No plain-key binding —
     the letters V/B/T/Y/U/R are spec 16 §3.2's; the radio + ⌘5 own this. */
  { id: 'fx', tip: 'FX — transitions & fades (Esc exits)', icon: <FxToolIcon /> },
];

/* R15 T1 — zoom math from the shared pixel lib (single source; this file
   previously carried its own 8–240 bounds + log map). The slider maps
   EXPONENTIALLY against the DYNAMIC min (spec-05 §5.2): slider 0 ⇔ fit-with-
   headroom (content = 25% of viewport). All zoom mutations route through the
   zoom bus so the controller captures pre-zoom scroll (two-regime anchoring). */
import { zoomToSlider, sliderToZoomPps } from '../../lib/pixel';
import { zoomBus } from '../../lib/zoomController';

/* R23-WD (D-D2/#108): the per-page cluster matrix — the table above, in
   code. density + zoom ride on every page EXCEPT FX's density (R23-FIX
   R-b: the FX page forces the full Timeline — the resolver returns false
   there and the toggle is DOM-absent so no control can claim otherwise);
   the flags exist anyway so the code mirrors the design table 1:1 and a
   future page MUST decide. Record<Page, …> is exhaustive by construction. */
interface PageClusters {
  tools: boolean;   /* the 8-tool radio (+ the FX tool, D-A1) */
  snap: boolean;    /* the magnet — Edit + Audio (Audio needs snap for clip
                       placement; no link/lock — audio tracks carry no A/V
                       link domain) */
  linkLock: boolean;/* link A/V + lock-all — Edit only */
  markers: boolean; /* add-marker + marker-color — Edit only */
  density: boolean; /* the D-B3 toggle — every page EXCEPT fx (R-b: the FX
                       timeline is the full Timeline, always) */
  zoom: boolean;    /* the zoom cluster — every page (read-mostly on deliver:
                       the deliver timeline is live, so zoom still works) */
  mixer: boolean;   /* mixer-state — Edit + Audio (ruling 15) */
  master: boolean;  /* master mute/volume/meter/DIM — Edit + Audio (ruling 15) */
}
const CLUSTERS: Record<Page, PageClusters> = {
  edit:    { tools: true,  snap: true,  linkLock: true,  markers: true,  density: true, zoom: true, mixer: true,  master: true },
  color:   { tools: false, snap: false, linkLock: false, markers: false, density: true, zoom: true, mixer: false, master: false },
  audio:   { tools: false, snap: true,  linkLock: false, markers: false, density: true, zoom: true, mixer: true,  master: true },
  fx:      { tools: false, snap: false, linkLock: false, markers: false, density: false, zoom: true, mixer: false, master: false },
  deliver: { tools: false, snap: false, linkLock: false, markers: false, density: true, zoom: true, mixer: false, master: false },
};

/* the right-side clusters in DOM order — drives the vsep law (a separator
   renders only BETWEEN two present clusters) */
const RIGHT_CLUSTER_ORDER = ['tools', 'snapGroup', 'markers', 'zoom', 'mixer', 'master'] as const;
type RightCluster = (typeof RIGHT_CLUSTER_ORDER)[number];

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
  const playhead = useUi((s) => s.playhead);
  const addMarker = useUi((s) => s.addMarker);
  const masterMuted = useUi((s) => s.masterMuted);
  const masterVolume = useUi((s) => s.masterVolume);
  const toggleMasterMute = useUi((s) => s.toggleMasterMute);
  const setMasterVolume = useUi((s) => s.setMasterVolume);
  const mixerState = useUi((s) => s.mixerState);
  const page = useUi((s) => s.page);
  const cycleMixerState = useUi((s) => s.cycleMixerState);
  /* R23-WB (D-B3): the density law — the ONE resolver, shared with the
     AppShell's mount decision (they can never disagree). */
  const compact = useUi((s) => resolveTimelineCompact(s));
  const setTimelineCompact = useUi((s) => s.setTimelineCompact);
  const scene = useUi((s) => s.scenes.find((x) => x.id === s.activeSceneId)!);
  const pushToast = useUi((s) => s.pushToast);
  const menu = useContextMenu(); // §4.9 marker-color dropdown (R14 no-op sweep)
  const sliderRef = useRef<HTMLInputElement>(null); // magnifier focuses the zoom slider

  /* R23-WD (D-D2): this page's row of the cluster matrix — every hidden
     cluster below is DOM-ABSENT (not display:none). */
  const m = CLUSTERS[page];

  /* the vsep law: a separator renders only between two PRESENT right-side
     clusters (order: tools, snap/link/lock, markers, zoom, mixer, master).
     An absent cluster takes its separators with it — a dangling bar would
     read as a phantom divider and violate the dense-DOM law. */
  const clusterOn: Record<RightCluster, boolean> = {
    tools: m.tools,
    snapGroup: m.snap || m.linkLock,
    markers: m.markers,
    zoom: m.zoom,
    mixer: m.mixer,
    master: m.master,
  };
  const vsep: Record<RightCluster, boolean> = { tools: false, snapGroup: false, markers: false, zoom: false, mixer: false, master: false };
  let seenPresent = false;
  for (const k of RIGHT_CLUSTER_ORDER) {
    vsep[k] = clusterOn[k] && seenPresent;
    seenPresent = seenPresent || clusterOn[k];
  }

  /* lane-viewport measurement for the zoom cluster — same source as the ⌘\
     binding (useShortcuts): #timeline-scroll's clientWidth, 900 fallback when
     the element is absent OR jsdom reports 0 (no layout). */
  const measureLanes = () => {
    const w = document.getElementById('timeline-scroll')?.clientWidth ?? 900;
    return w > 0 ? w : 900;
  };

  /* zoom-to-selection (R14 no-op sweep): span = min start → max end of the
     selection across the ACTIVE scene; empty selection or span ≤ 0 → honest
     info toast; else route through the ZOOM BUS (R15-F1 P3 — was a raw
     setZoom write bypassing the controller's pre-zoom scroll capture /
     two-regime anchoring) so the span fills ~80% of the lane viewport
     (the bus + store clamp to the 5..5000 domain + dynamic min). */
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
    zoomBus((measureLanes() * 0.8) / span, { duration: sceneDuration(sc) });
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
          of silently doing nothing (R14 no-op sweep). R23-WD (D-D2): this is
          the one PRE-matrix house button — it is not a matrix cluster and
          stays on every page. */}
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

      {/* R23-WB (D-B3/#94): the density toggle — compact strip (frozen) ↔
          full tracks, on every page EXCEPT fx.
          R23-FIX (review-sweep R-b, R3-P2#3): on the FX page the toggle is
          DOM-ABSENT — the page forces the full Timeline (seam hit-zones +
          transition boxes need real lane geometry; ruling 8), so a toggle
          there would advertise a compact strip the page can never render
          (the lying-control law; the resolver ignores the override on fx).
          Elsewhere: aria-pressed is the RESOLVED state (honest — it
          reflects the timeline actually rendered); the click writes the
          per-session override, so 'auto' only survives until the user
          speaks. R23-WD (D-D2): only the render gate reads the matrix. */}
      {m.density && (
        <button
          className={`icon-btn ${compact ? 'toggled' : ''}`}
          data-testid="shell-timeline-toolbar-btn-density"
          data-tip="Compact strip (frozen) ↔ full tracks"
          aria-label="Toggle compact timeline"
          aria-pressed={compact}
          onClick={() => setTimelineCompact(compact ? 'off' : 'on')}
        >
          <Rows3 size={14} strokeWidth={1.8} />
        </button>
      )}

      <div className="grow" />

      {/* tool cluster (radio) — §11.1: arrow-key navigation + roving focus.
          R23-WD (D-D2): Edit ONLY — the other pages carry no editing tools
          (Resolve's grammar: Cut/Edit carry the tools); DOM-absent, never
          display:none. The radio + its 8-tool wiring are otherwise untouched. */}
      {m.tools && (
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
      )}

      {/* vsep law: renders only between two PRESENT clusters (D-D2) */}
      {vsep.snapGroup && <div className="vsep" />}

      {/* snap / link / lock — R23-WD (D-D2): snap renders on Edit + Audio
          (audio needs clip-placement snapping); link/lock are Edit-only
          (audio tracks carry no A/V link domain). */}
      {m.snap && (
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
      )}
      {m.linkLock && (
        <>
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
        </>
      )}

      {/* vsep law: renders only between two PRESENT clusters (D-D2) */}
      {vsep.markers && <div className="vsep" />}

      {/* markers — R23-WD (D-D2): Edit only. */}
      {m.markers && (
        <>
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
        </>
      )}

      {/* vsep law: renders only between two PRESENT clusters (D-D2) */}
      {vsep.zoom && <div className="vsep" />}

      {/* zoom cluster (R14 no-op sweep — all three icon buttons were dead).
          R15 T1: fit + ± route through the zoom bus (controller pre-capture /
          two-regime anchoring); the slider maps exponentially against the
          DYNAMIC min (spec-05 §5.2); ± step factor 1.7 (canonical, spec-16
          §3.8 revision R15-1). Magnifier: focuses the zoom slider (distinct
          honest effect — exposing the slider's keyboard grammar, spec 18 §11.3).
          R23-WD (D-D2): the ONE cluster present on every page (read-mostly on
          deliver — the timeline is live there, so zoom still works). */}
      {m.zoom && (
        <>
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
        </>
      )}

      {/* vsep law: renders only between two PRESENT clusters (D-D2) */}
      {vsep.mixer && <div className="vsep" />}

      {/* mixer dock state — R20-W1 (DESIGN-R20 D1.4): Edit cycles
          closed→meters→full→closed; Audio toggles meters↔full. B4: the
          glyph + label reflect the CURRENT state (closed → SlidersHorizontal,
          meters → PanelRight, full → AudioLines strips). No chord (⌘M is
          spec 16 §3.5 focused-track mute).
          R23-WD (D-D2, ruling 15): Edit + Audio ONLY — DOM-absent on
          color/fx/deliver (same law as Toolbar2's Mixer toggle). */}
      {m.mixer && (
        <button
          className={`icon-btn ${mixerState !== 'collapsed' ? 'toggled' : ''}`}
          data-tip={mixerStateLabel(mixerState, page)}
          aria-label={mixerStateLabel(mixerState, page)}
          aria-pressed={mixerState !== 'collapsed'}
          onClick={cycleMixerState}
          data-testid="btn-mixer-state"
        >
          {mixerState === 'full' ? (
            <AudioLines size={14} strokeWidth={1.6} />
          ) : mixerState === 'meters' ? (
            <PanelRight size={14} strokeWidth={1.6} />
          ) : (
            <SlidersHorizontal size={14} strokeWidth={1.6} />
          )}
        </button>
      )}

      {/* vsep law: renders only between two PRESENT clusters (D-D2) */}
      {vsep.master && <div className="vsep" />}

      {/* master audio + always-on micro-meter (design doc §3.2 — zero new regions).
          ⌘M tooltip honesty: spec 16 §3.5 binds ⌘M to FOCUSED-track mute; the
          mock falls back to master only when nothing is focused (registered).
          R23-WD (D-D2, ruling 15): Edit + Audio ONLY — the whole cluster
          (mute + meter + volume + DIM) is DOM-absent on color/fx/deliver. */}
      {m.master && (
        <>
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
        </>
      )}
      </div>
      {menu.state && <ContextMenu {...menu.state} onClose={menu.close} />}
    </>
  );
}

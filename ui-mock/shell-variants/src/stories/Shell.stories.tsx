/* Shell component stories — solo panels + overlay regions. Everything is
   store-driven except Viewer (duration prop) and ContextMenu (explicit open
   state). Panels render in PanelBox at their shell widths so splitters and
   layout context aren't needed. */

import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MediaPool } from '../components/shell/MediaPool';
import { LeftDock } from '../components/shell/LeftDock';
import { Viewer } from '../components/shell/Viewer';
import { Inspector } from '../components/shell/Inspector';
import { StatusStrip } from '../components/shell/StatusStrip';
import { ToastRegion } from '../components/shell/ToastRegion';
import { ContextMenu, type MenuItem } from '../components/shell/ContextMenu';
import { CheatSheet } from '../components/shell/CheatSheet';
import { useUi } from '../state/useUiStore';
import { sceneDuration } from '../lib/mockData';
import { StoreBoot, PanelBox, type UiPatch } from './decorators';

const meta: Meta = {
  title: 'Shell/Components',
};

export default meta;

/* ---- media pool (grid / list) ----------------------------------------------
   NOTE: the pool shows a ~900 ms "reading OPFS" skeleton on first mount —
   that boot state is part of the design (spec 18 §4.2), so it stays. */

function PoolStory({ patch }: { patch: UiPatch }) {
  return (
    <>
      <StoreBoot patch={patch} />
      <PanelBox width={280} height={700}>
        <MediaPool />
      </PanelBox>
    </>
  );
}

export const MediaPoolGrid: StoryObj = {
  name: 'Media pool — grid',
  parameters: { layout: 'padded' },
  render: () => <PoolStory patch={{ mediaView: 'grid' }} />,
};

export const MediaPoolList: StoryObj = {
  name: 'Media pool — list',
  parameters: { layout: 'padded' },
  render: () => <PoolStory patch={{ mediaView: 'list' }} />,
};

/** R20-W5 (thread #67 / D1.5): the media-bay MODE filter — on the AUDIO page
 *  the pool auto-filters to audio + audio-bearing video (the shared
 *  isAudioBearing predicate) with the honest count chip + the small 'Audio
 *  only' toggle in the header; Edit/Color/Deliver pages render the pool
 *  unfiltered. The SoundLibrary (the audio-page dock swap) honors the same
 *  view-state flag — see the Mixer/SoundLibrary story. */
export const MediaPoolAudioModeFilter: StoryObj = {
  name: 'Media pool — audio mode filter (thread #67)',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <PoolStory patch={{ page: 'audio' }} />
      <div className="mono mt-2 text-[11px] text-tmuted">
        ( 6/8 audio-bearing assets shown — offline video + stills hidden; the AudioLines toggle lifts
        the filter; the chip always reports visible/total )
      </div>
    </>
  ),
};

/** R19 th_mto2s2nc — hover-dwell scrub preview: the play fn dwells on the
 *  first card ≥ 400 ms so the ambient preview chrome (PREVIEW chip + the
 *  ken-burns pan + progress hairline) is reviewable without a mouse. The
 *  chips/fps-icon badges (th_mto2qzoh/th_mto2sako) and the Download import
 *  glyph (th_mto2t03u) are visible in every pool story. */
export const MediaPoolHoverPreview: StoryObj = {
  name: 'Media pool — hover scrub preview (gap C42)',
  parameters: { layout: 'padded' },
  play: async ({ canvasElement }) => {
    const card = canvasElement?.querySelector<HTMLElement>('[data-testid="shell-mediapool-card"]');
    if (!card) return;
    card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    await new Promise((r) => setTimeout(r, 600)); // ≥ 400 ms dwell arms the preview
  },
  render: () => <PoolStory patch={{}} />,
};

/* ---- left dock (R19 th_mtoyt5fv: one tabbed surface in the bin slot) ------
   R23-WA-REV P2 #3: the three effects-era stories below were RE-HOMED to
   the FX page (the Wave A retirement killed the Edit-page Pool|Effects tab
   + the panels.effects toggle's dock route — the old plays/stories would
   render a pool-only or empty dock and LIE). The FX-page compositions keep
   the same review surfaces (the browser rows, the drag affordances) live. */

function LeftDockStory({ patch, width = 280 }: { patch: UiPatch; width?: number }) {
  return (
    <>
      <StoreBoot patch={patch} />
      <PanelBox width={width} height={700}>
        <LeftDock />
      </PanelBox>
    </>
  );
}

/** R23-WA-REV P2 #3 — the three effects-era stories RE-HOMED to the FX page
 *  (the Wave A retirement killed the Edit-page effects tab; these keep the
 *  same review surfaces — the browser rows + drag affordances — live and
 *  honest on the page that actually owns them now). */

/** The FX page's dock: the effects browser (Effects / Video Transitions /
 *  Fades categories) as the slot's ONLY content — no tab bar (#106's law). */
export const LeftDockTabbed: StoryObj = {
  name: 'Left dock — FX browser (FX page)',
  parameters: { layout: 'padded' },
  render: () => <LeftDockStory patch={{ page: 'fx', fxMode: true }} />,
};

/** The browser's transitions category: the 27-presentation registry rows a
 *  reviewer drags onto timeline seams (the FX engine's drop targets). */
export const LeftDockEffectsTab: StoryObj = {
  name: 'Left dock — FX browser rows (transitions + fades)',
  parameters: { layout: 'padded' },
  render: () => <LeftDockStory patch={{ page: 'fx', fxMode: true }} width={240} />,
};

/** Narrow dock variant: the browser wraps at 220px (the drag rows keep
 *  their affordances — the honest minimum-width check). */
export const LeftDockEffectsOnly: StoryObj = {
  name: 'Left dock — FX browser narrow (220px)',
  parameters: { layout: 'padded' },
  render: () => <LeftDockStory patch={{ page: 'fx', fxMode: true }} width={220} />,
};

/** Audio page: the slot is the SoundLibrary (Fairlight-style left dock). */
export const LeftDockAudio: StoryObj = {
  name: 'Left dock — audio page (Sound Library)',
  parameters: { layout: 'padded' },
  render: () => <LeftDockStory patch={{ page: 'audio' }} />,
};

/* ---- viewer ------------------------------------------------------------------ */

function ViewerPanel() {
  const duration = useUi((s) => sceneDuration(s.scenes.find((x) => x.id === s.activeSceneId)!));
  return (
    <PanelBox width={960} height={620}>
      <Viewer duration={duration} />
    </PanelBox>
  );
}

/** Program monitor at playhead 16 (Marina interview), overlays on. */
export const ViewerStory: StoryObj = {
  name: 'Viewer',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot />
      <ViewerPanel />
    </>
  ),
};

/* ---- inspector (R20-W3 D4: type-driven, one scroll of sections) ---------- */

function InspectorStory({ patch }: { patch: UiPatch }) {
  return (
    <>
      <StoreBoot patch={patch} />
      <PanelBox width={340} height={700}>
        <Inspector />
      </PanelBox>
    </>
  );
}

/** Video clip (el-2 "Marina interview", default selection): entity chip +
 *  Transform / Composite / Speed Change / Audio ([Levels|EQ] sub-tabs) /
 *  Effects / Transition — the full section stack in ONE scroll. */
export const InspectorVideoClip: StoryObj = {
  name: 'Inspector — video clip (type-driven sections)',
  parameters: { layout: 'padded' },
  render: () => <InspectorStory patch={{ selection: ['el-2'] }} />,
};

/** Audio clip (el-6): Audio section + Effects only — the spatial family is
 *  hidden (the section-visibility matrix, hidden-not-visible). */
export const InspectorAudioClip: StoryObj = {
  name: 'Inspector — audio clip (Levels|EQ sub-tabs)',
  parameters: { layout: 'padded' },
  render: () => <InspectorStory patch={{ selection: ['el-6'] }} />,
};

/** Track sheet (the track domain): selectedTrackId — the reviewer's
 *  track-level inspection (M/S/L/V toggles, lane height, Track FX inserts,
 *  mixer strip for audio tracks). */
export const InspectorTrackSheet: StoryObj = {
  name: 'Inspector — track sheet (track domain)',
  parameters: { layout: 'padded' },
  render: () => <InspectorStory patch={{ selection: [], selectedTrackId: 'tr-audio-1' }} />,
};

/** Effect editor (the effect domain): the selected effect's params expand
 *  in place (accordion) + the breadcrumb chip (track > clip > effect). */
export const InspectorEffectEditor: StoryObj = {
  name: 'Inspector — effect editor (accordion + breadcrumb)',
  parameters: { layout: 'padded' },
  render: () => (
    <InspectorStory patch={{ selection: ['el-1'], selectedEffectId: 'fx-1', selectedEffectClipId: 'el-1' }} />
  ),
};

/** Empty selection → the R19 ACTIVE-TRACK fallback sheet (th_mto5fdf6):
 *  the same TrackSheet component, via="fallback". */
export const InspectorEmptyFallback: StoryObj = {
  name: 'Inspector — empty selection (active-track fallback)',
  parameters: { layout: 'padded' },
  render: () => <InspectorStory patch={{ selection: [] }} />,
};

/** The minimal Project sheet (D4.4 descoped): read-only summary + the
 *  honest C58 note — toggled from the Toolbar2 Project button. */
export const InspectorProjectSheet: StoryObj = {
  name: 'Inspector — project sheet (read-only, C58 pending)',
  parameters: { layout: 'padded' },
  render: () => <InspectorStory patch={{ inspectorProjectMode: true }} />,
};

/* ---- status strip states -------------------------------------------------------- */

/** Fires a doc mutation ~150 ms after mount so the strip's autosave state
 *  machine runs its Saving → Saved/Failed path in front of the reviewer. */
function StatusStripScenario({ fail }: { fail: boolean }) {
  useEffect(() => {
    const t = window.setTimeout(() => {
      useUi.getState().addMarker(useUi.getState().playhead, 'green');
    }, 150);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <>
      <StoreBoot patch={{ simulateSaveFail: fail }} />
      <div className="flex h-screen w-full flex-col justify-end">
        <StatusStrip />
      </div>
    </>
  );
}

export const StatusSaved: StoryObj = {
  name: 'Status strip — saved',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <>
      <StoreBoot />
      <div className="flex h-screen w-full flex-col justify-end">
        <StatusStrip />
      </div>
    </>
  ),
};

export const StatusSaving: StoryObj = {
  name: 'Status strip — saving (transient → saved)',
  parameters: { layout: 'fullscreen' },
  render: () => <StatusStripScenario fail={false} />,
};

export const StatusFailed: StoryObj = {
  name: 'Status strip — save failed (retry link)',
  parameters: { layout: 'fullscreen' },
  render: () => <StatusStripScenario fail />,
};

/* ---- toast region ---------------------------------------------------------------- */

/** Fires one toast per kind: info/success (4 s), persist (6 s), error persists.
 *  Max-3 stack is enforced by the store. */
function ToastScenario() {
  useEffect(() => {
    const s = useUi.getState();
    s.pushToast({ kind: 'info', title: 'Marker added', detail: 'spec 16 §3.7 — palette colors' });
    s.pushToast({ kind: 'success', title: 'Sample project loaded', detail: '30 s demo · 3 video + 1 text + 1 audio' });
    s.pushToast({ kind: 'persist', title: 'Renderer updated', detail: 'persists until dismissed — warning class' });
  }, []);
  return (
    <>
      <StoreBoot />
      <div className="h-screen w-full bg-app">
        <ToastRegion />
      </div>
    </>
  );
}

export const ToastRegionStory: StoryObj = {
  name: 'Toast region',
  parameters: { layout: 'fullscreen' },
  render: () => <ToastScenario />,
};

/* ---- context menu (open state) ------------------------------------------------ */

const MENU_ITEMS: MenuItem[] = [
  { id: 'open-in-viewer', label: 'Open in viewer', onSelect: () => {} },
  { id: 'split', label: 'Split at playhead', shortcut: '⌘B', sep: true, onSelect: () => {} },
  { id: 'duplicate', label: 'Duplicate', shortcut: '⌘D', onSelect: () => {} },
  { id: 'delete', label: 'Delete', shortcut: '⌫', danger: true, sep: true, onSelect: () => {} },
  { id: 'ripple-delete', label: 'Ripple delete', shortcut: '⇧⌫', danger: true, onSelect: () => {} },
  { id: 'detach-audio', label: 'Detach audio', disabled: true, tip: 'mock: not in spec 15 union', sep: true },
  { id: 'properties', label: 'Properties', onSelect: () => {} },
  { id: 'mix-track', label: 'Mix this track…', sep: true, onSelect: () => {} },
];

export const ContextMenuStory: StoryObj = {
  name: 'Context menu — open state',
  parameters: { layout: 'padded' },
  render: () => (
    <div className="h-screen w-full bg-app">
      {/* a lane-ish backdrop so the popup reads in context */}
      <div className="h-[60px] w-full border-b border-hairline" style={{ background: 'var(--lane-video)' }} aria-hidden="true" />
      <ContextMenu x={120} y={110} items={MENU_ITEMS} name="demo" onClose={() => { /* story shows the open state */ }} />
    </div>
  ),
};

/* ---- cheat sheet ----------------------------------------------------------------- */

export const CheatSheetStory: StoryObj = {
  name: 'Cheat sheet',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <>
      <StoreBoot patch={{ cheatOpen: true }} />
      <div className="h-screen w-full bg-app">
        <CheatSheet />
      </div>
    </>
  ),
};

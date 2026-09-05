/* Shell component stories — solo panels + overlay regions. Everything is
   store-driven except Viewer (duration prop) and ContextMenu (explicit open
   state). Panels render in PanelBox at their shell widths so splitters and
   layout context aren't needed. */

import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MediaPool } from '../components/shell/MediaPool';
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

/* ---- inspector tabs ------------------------------------------------------------ */

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

/** Video tab over el-2 "Marina interview" (default selection). */
export const InspectorVideo: StoryObj = {
  name: 'Inspector — video tab',
  parameters: { layout: 'padded' },
  render: () => <InspectorStory patch={{ inspectorTab: 'video', selection: ['el-2'] }} />,
};

/** Audio tab over el-7 "interview_marina" (linked audio element). */
export const InspectorAudio: StoryObj = {
  name: 'Inspector — audio tab',
  parameters: { layout: 'padded' },
  render: () => <InspectorStory patch={{ inspectorTab: 'audio', selection: ['el-7'] }} />,
};

/** Effects tab over el-1 (carries a disabled Gaussian Blur). */
export const InspectorEffects: StoryObj = {
  name: 'Inspector — effects tab',
  parameters: { layout: 'padded' },
  render: () => <InspectorStory patch={{ inspectorTab: 'effects', selection: ['el-1'] }} />,
};

/** Transition tab over el-2 (carries a Cross Dissolve out). */
export const InspectorTransition: StoryObj = {
  name: 'Inspector — transition tab',
  parameters: { layout: 'padded' },
  render: () => <InspectorStory patch={{ inspectorTab: 'transition', selection: ['el-2'] }} />,
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

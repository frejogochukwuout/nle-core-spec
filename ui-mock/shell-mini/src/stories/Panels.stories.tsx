/* Panel stories (R18k restructure — the mid level of the taxonomy):
   each shell REGION solo — topbar, media pool, viewer, inspector, and
   the toast overlay — in fixed frames so the leaves are reviewable
   without the full shell. One story per panel with CONTROLS for its
   state variations (the old Regions+Overlays pair had 13 list items;
   the reviewer asked for fewer, driven by controls). */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Topbar } from '../shell/Topbar';
import { MediaPool } from '../shell/MediaPool';
import { Viewer } from '../shell/Viewer';
import { Inspector } from '../shell/Inspector';
import { ToastRegion } from '../shell/ToastRegion';
import { useMini, VIEWER_ASPECTS, type ViewerAspect } from '../state/useMini';
import { seedDoc } from '../lib/mockData';
import { StoreArgs, selectionFor, type Patch } from './storyKit';

const meta: Meta = {
  title: 'Panels',
};
export default meta;

function Backdrop({ children, w = 1400, h = 900 }: { children: React.ReactNode; w?: number; h?: number }) {
  return (
    <div
      style={{
        background: 'radial-gradient(120% 90% at 50% 0%, #17181a 0%, #111214 46%, #0d0d0d 100%)',
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 48,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: w, height: h, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Topbar — stateless chrome by design (the host customization point) */

export const TopbarPanel: StoryObj = {
  name: 'Topbar — chrome strip (customization point)',
  render: () => (
    <Backdrop h={36}>
      <Topbar />
    </Backdrop>
  ),
};

/* ------------------------------------------------------------------ */
/* Media pool — type tabs / video-only head / collapsed rail           */

interface PoolArgs {
  videoOnly: boolean;
  collapsed: boolean;
}

export const MediaPoolPanel: StoryObj<PoolArgs> = {
  name: 'Media pool — tabs, video-only head, rail',
  args: { videoOnly: false, collapsed: false },
  argTypes: {
    videoOnly: { control: 'boolean', description: 'single-track mode: no tabs, video-only list (thread #23)' },
    collapsed: { control: 'boolean', description: 'the 30px vertical-label rail' },
  },
  render: ({ videoOnly, collapsed }) => (
    <Backdrop w={260} h={600}>
      <StoreArgs patch={{ trackMode: videoOnly ? 'video' : 'paired', poolCollapsed: collapsed }} />
      <MediaPool />
    </Backdrop>
  ),
};

/* ------------------------------------------------------------------ */
/* Viewer — aspect / playing / empty as controls                       */

interface ViewerArgs {
  aspect: ViewerAspect;
  playhead: number;
  playing: boolean;
}

export const ViewerPanel: StoryObj<ViewerArgs> = {
  name: 'Viewer — aspect, playing, empty',
  args: { aspect: '16:9', playhead: 1, playing: false },
  argTypes: {
    aspect: { control: 'select', options: VIEWER_ASPECTS.map((a) => a.id) },
    playhead: { control: { type: 'range', min: 0, max: 14, step: 0.25 }, description: 'past 12.5 = the empty state' },
    playing: { control: 'boolean' },
  },
  render: ({ aspect, playhead, playing }) => (
    <Backdrop w={900} h={620}>
      <StoreArgs patch={{ viewerAspect: aspect, playhead, playing, doc: seedDoc() }} />
      <Viewer />
    </Backdrop>
  ),
};

/* ------------------------------------------------------------------ */
/* Inspector — selection kind as a control                             */

interface InspectorArgs {
  selection: string;
}

export const InspectorPanel: StoryObj<InspectorArgs> = {
  name: 'Inspector — selection kinds',
  args: { selection: 'c2' },
  argTypes: {
    selection: { control: 'inline-radio', options: ['none', 'c1', 'c2', 'c3', 'c4'] },
  },
  render: ({ selection }) => (
    <Backdrop w={240} h={620}>
      <StoreArgs patch={{ doc: seedDoc(), selectedId: selectionFor(selection) }} />
      <Inspector />
    </Backdrop>
  ),
};

/* ------------------------------------------------------------------ */
/* Toast — kind + text as controls (patched directly into state, NOT
   via pushToast: the real action would arm the 2.6s auto-dismiss and
   blank the story mid-review) */

interface ToastArgs {
  kind: 'info' | 'error';
  text: string;
}

export const ToastPanel: StoryObj<ToastArgs> = {
  name: 'Toast — overlay variants',
  args: { kind: 'info', text: 'Added title_card.png to V1.' },
  argTypes: {
    kind: { control: 'inline-radio', options: ['info', 'error'] },
    text: { control: 'text' },
  },
  render: ({ kind, text }) => {
    const patch: Patch = { toast: { kind, text, seq: 1 } };
    return (
      <Backdrop w={900} h={400}>
        <StoreArgs patch={patch} />
        <ToastRegion />
      </Backdrop>
    );
  },
};

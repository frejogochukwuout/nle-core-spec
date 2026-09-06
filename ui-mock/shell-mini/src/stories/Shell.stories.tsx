/* Shell stories (R18k restructure — the MACRO level): the whole mini app.
   Three focused stories instead of six state clones:
   - default: content/editing state via controls (zoom, playhead,
     selection, snap, project)
   - layout states: the collapse/minimize/max family via controls
   - video-only mode: the simplified single-track special mode
     (thread #23) with the track-binding dropdown + the host-locked
     variant (thread #3)
   StoreBoot semantics: StoreArgs re-applies the args patch before first
   paint and on every control change (the global decorator guarantees a
   fresh store per story). */

import type { Meta, StoryObj } from '@storybook/react-vite';
import App from '../App';
import { StoreArgs, docFor, selectionFor, type Patch } from './storyKit';

const meta: Meta = {
  title: 'Shell',
};
export default meta;

function FullShell({ patch }: { patch?: Patch }) {
  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      {/* R18f (UX P1-1): #storybook-root has no height → .mini-root
          content-sized and pushed the timeline below the fold. The
          explicit 100vh frame keeps the shell viewport-shaped. */}
      {patch && <StoreArgs patch={patch} />}
      <App />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1. the default review surface — content state as controls            */

interface DefaultArgs {
  zoomStep: number;
  playhead: number;
  selection: string;
  snapOn: boolean;
  project: 'seed' | 'multi' | 'empty';
}

export const Default: StoryObj<DefaultArgs> = {
  name: 'App — default (seed)',
  args: { zoomStep: 1, playhead: 5.5, selection: 'none', snapOn: false, project: 'seed' },
  argTypes: {
    zoomStep: {
      control: 'radio',
      options: [0, 1, 2, 3, 4],
      labels: { 0: '0 · 24pps overview', 1: '1 · 48pps default', 2: '2 · 96pps', 3: '3 · 192pps', 4: '4 · 384pps' },
    },
    playhead: { control: { type: 'range', min: 0, max: 14, step: 0.25 } },
    selection: { control: 'inline-radio', options: ['none', 'c1', 'c2', 'c3', 'c4'] },
    snapOn: { control: 'boolean' },
    project: {
      control: 'radio',
      options: ['seed', 'multi', 'empty'] as const,
      labels: { seed: 'seed (V1+A1)', multi: 'multi-track (V1/V2/A1/A2 — binding dropdowns live)', empty: 'empty timeline' },
    },
  },
  render: ({ zoomStep, playhead, selection, snapOn, project }) => (
    <FullShell
      patch={{
        doc: docFor(project),
        zoomStep,
        playhead,
        selectedId: selectionFor(selection),
        snapOn,
      }}
    />
  ),
};

/* ------------------------------------------------------------------ */
/* 2. layout states — the collapse/minimize/max family                  */

interface LayoutArgs {
  poolCollapsed: boolean;
  inspectorCollapsed: boolean;
  timelineMinimized: boolean;
  viewerMax: boolean;
}

export const LayoutStates: StoryObj<LayoutArgs> = {
  name: 'App — layout states',
  args: { poolCollapsed: false, inspectorCollapsed: false, timelineMinimized: false, viewerMax: false },
  argTypes: {
    poolCollapsed: { control: 'boolean', description: 'left rail (30px vertical label)' },
    inspectorCollapsed: { control: 'boolean', description: 'right rail' },
    timelineMinimized: { control: 'boolean', description: 'compact strip — video pills only, gestures live (thread #21)' },
    viewerMax: { control: 'boolean', description: 'composed max: both rails + minimized strip, exact restore' },
  },
  render: (args) => (
    <FullShell
      patch={{
        poolCollapsed: args.poolCollapsed,
        inspectorCollapsed: args.inspectorCollapsed,
        timelineMinimized: args.timelineMinimized,
        viewerMax: args.viewerMax,
      }}
    />
  ),
};

/* ------------------------------------------------------------------ */
/* 3. video-only mode — the simplified single-track special mode        */

interface VideoOnlyArgs {
  project: 'seed' | 'multi';
  trackBindingLocked: boolean;
  boundVideoTrack: string;
}

export const VideoOnly: StoryObj<VideoOnlyArgs> = {
  name: 'App — video-only mode (single track)',
  args: { project: 'multi', trackBindingLocked: false, boundVideoTrack: 'V1' },
  argTypes: {
    project: {
      control: 'radio',
      options: ['seed', 'multi'] as const,
      labels: { seed: 'seed (one video track — no selector)', multi: 'multi-track (selector: V1/V2)' },
    },
    trackBindingLocked: { control: 'boolean', description: 'host-injected binding — selector hidden, lane headless (thread #3)' },
    boundVideoTrack: { control: 'inline-radio', options: ['V1', 'V2'], description: 'which project video track the lane binds' },
  },
  render: ({ project, trackBindingLocked, boundVideoTrack }) => (
    <FullShell
      patch={{
        doc: docFor(project),
        trackMode: 'video',
        trackBindingLocked,
        boundVideoTrack,
        selectedId: null,
      }}
    />
  ),
};

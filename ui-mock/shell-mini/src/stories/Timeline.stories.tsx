/* Timeline stories (R18k restructure — micro → macro within the timeline
   component group): the CLIP atom, the TOOLBAR, then the whole PANEL.
   State variations (zoom tiers, toggles, selection, playhead, modes,
   track binding) are CONTROLS on the panel stories — not a list item
   per state (the old file had 15; the reviewer asked for fewer items
   with controls covering the variations).

   Coordinate note: all stories render the real components — ClipItem's
   gesture engine and ToolsRow's actions are live in every story. */

import type { ArgTypes, Meta, StoryObj } from '@storybook/react-vite';
import { Timeline, ToolsRow, ClipItem } from '../timeline/Timeline';
import { ppsFor } from '../lib/geometry';
import { seedDoc } from '../lib/mockData';
import { StoreArgs, docFor, selectionFor, type Patch } from './storyKit';

const meta: Meta = {
  title: 'Timeline',
};
export default meta;

/* the solo-panel frame: the app's own vignette so the panel reads on the
   real surface, 100vh like the Shell stories */
function Frame({ children, patch }: { children: React.ReactNode; patch?: Patch }) {
  return (
    <div
      style={{
        background: 'radial-gradient(120% 90% at 50% 0%, #17181a 0%, #111214 46%, #0d0d0d 100%)',
        height: '100vh',
        padding: 24,
        boxSizing: 'border-box',
      }}
    >
      {patch && <StoreArgs patch={patch} />}
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1. the clip atom — anatomy review at natural size                   */

interface ClipArgs {
  media: 'video' | 'image' | 'audio';
  selected: boolean;
  filmstripOn: boolean;
  compact: boolean;
  zoomStep: number;
}

const CLIP_MEDIA: Record<ClipArgs['media'], string> = {
  video: 'm-drone',
  image: 'm-title',
  audio: 'm-interview',
};

export const Clip: StoryObj<ClipArgs> = {
  name: 'Clip — anatomy & states',
  args: { media: 'video', selected: false, filmstripOn: true, compact: false, zoomStep: 2 },
  argTypes: {
    media: { control: 'inline-radio', options: ['video', 'image', 'audio'] },
    selected: { control: 'boolean' },
    filmstripOn: { control: 'boolean', description: 'filmstrip ↔ color-block body (video/image clips)' },
    compact: { control: 'boolean', description: 'pill body — the minimized strip render' },
    zoomStep: {
      control: 'radio',
      options: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      labels: {
        0: '0 · 24pps',
        1: '1 · 36pps',
        2: '2 · 48pps default',
        3: '3 · 72pps',
        4: '4 · 96pps',
        5: '5 · 144pps',
        6: '6 · 192pps',
        7: '7 · 288pps',
        8: '8 · 384pps',
      },
    },
  },
  render: ({ media, selected, filmstripOn, compact, zoomStep }) => {
    const doc = seedDoc();
    const m = doc.media.find((x) => x.id === CLIP_MEDIA[media])!;
    // the demo clip lives IN the store doc (review P3-6) — gestures are
    // real: drag/trim commit through the actual store + history, not a
    // prop-only ghost the keyboard/delete actions would silently miss
    const demoClip = { id: 'clip-demo', trackId: 'V1', mediaId: m.id, start: 1, duration: m.duration };
    return (
      <Frame
        patch={{
          doc: { ...doc, clips: [demoClip] },
          filmstripOn,
          selectedId: selected ? 'clip-demo' : null,
        }}
      >
        <div className="qc-timeline" data-testid="mini-timeline" style={{ ['--qc-minor-tick-step' as string]: '48px' }}>
          <div className="qc-stage">
            <div className="qc-track-layout">
              {/* the real geometry (review P3-6): an empty head rail keeps
                  the lane at RENDER_ORIGIN (46) so gesture math is honest */}
              <div className="qc-track-heads" aria-hidden="true" />
              <div className="qc-tracks">
                <div
                  className="qc-track-row__content"
                  role="group"
                  aria-label={`Clip anatomy — ${media}`}
                  data-testid="mini-clip-harness"
                  style={{ height: compact ? 20 : 36, flex: '0 0 auto' }}
                >
                  <ClipItem
                    clip={demoClip}
                    media={m}
                    pps={ppsFor(zoomStep)}
                    snapOn={false}
                    selected={selected}
                    filmstripOn={filmstripOn}
                    snapTargets={[]}
                    onSnapGuide={() => {}}
                    compact={compact}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.52)', fontSize: 11, margin: '14px 2px 0' }}>
          Real ClipItem on a real lane surface — hover the clip edges for the trim affordance, drag to move,
          drag the edge zones to trim. Filmstrip/waveform/label anatomy per media kind.
        </p>
      </Frame>
    );
  },
};

/* ------------------------------------------------------------------ */
/* 2. the toolbar — toggles + history states as controls               */

interface ToolbarArgs {
  snapOn: boolean;
  rippleOn: boolean;
  filmstripOn: boolean;
  audioLaneVisible: boolean;
  videoOnly: boolean;
  hasHistory: boolean;
  hasSelection: boolean;
}

export const Toolbar: StoryObj<ToolbarArgs> = {
  name: 'Toolbar — tools & toggles',
  args: { snapOn: true, rippleOn: false, filmstripOn: true, audioLaneVisible: true, videoOnly: false, hasHistory: true, hasSelection: true },
  argTypes: {
    snapOn: { control: 'boolean' },
    rippleOn: { control: 'boolean' },
    filmstripOn: { control: 'boolean' },
    audioLaneVisible: { control: 'boolean' },
    videoOnly: { control: 'boolean', description: 'video-only mode — the audio-lane eye leaves the toolbar' },
    hasHistory: { control: 'boolean', description: 'undo/redo enabled (patches a past entry)' },
    hasSelection: { control: 'boolean', description: 'a selected clip (delete tool enabled)' },
  },
  render: ({ snapOn, rippleOn, filmstripOn, audioLaneVisible, videoOnly, hasHistory, hasSelection }) => (
    <Frame
      patch={{
        snapOn,
        rippleOn,
        filmstripOn,
        audioLaneVisible,
        trackMode: videoOnly ? 'video' : 'paired',
        past: hasHistory ? [seedDoc()] : [],
        future: [],
        selectedId: hasSelection ? 'c2' : null,
      }}
    >
      <div className="qc-timeline" data-testid="mini-timeline" style={{ ['--qc-minor-tick-step' as string]: '48px' }}>
        <ToolsRow />
      </div>
      <p style={{ color: 'rgba(255,255,255,0.52)', fontSize: 11, margin: '14px 2px 0' }}>
        The tools row solo: the minimize toggle leads (thread #2), the active chips carry the R18k contrast fix
        (thread #4) — every button is live (undo/redo/split/cut/delete toggles act on the seed doc).
      </p>
    </Frame>
  ),
};

/* ------------------------------------------------------------------ */
/* 3. the panel — all state variations as controls                     */

interface PanelArgs {
  zoomStep: number;
  playhead: number;
  selection: string;
  snapOn: boolean;
  rippleOn: boolean;
  filmstripOn: boolean;
  audioLaneVisible: boolean;
  timelineMinimized: boolean;
  videoOnly: boolean;
  locked: boolean;
  project: 'seed' | 'multi' | 'empty';
  boundVideoTrack: string;
  boundAudioTrack: string;
}

const panelArgTypes: ArgTypes<PanelArgs> = {
  zoomStep: {
    control: 'radio',
    options: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    labels: {
      0: '0 · 24pps overview',
      1: '1 · 36pps',
      2: '2 · 48pps default',
      3: '3 · 72pps',
      4: '4 · 96pps',
      5: '5 · 144pps',
      6: '6 · 192pps',
      7: '7 · 288pps',
      8: '8 · 384pps',
    },
  },
  playhead: { control: { type: 'range', min: 0, max: 14, step: 0.25 } },
  selection: { control: 'inline-radio', options: ['none', 'c1', 'c2', 'c3', 'c4'] },
  snapOn: { control: 'boolean' },
  rippleOn: { control: 'boolean' },
  filmstripOn: { control: 'boolean' },
  audioLaneVisible: { control: 'boolean' },
  timelineMinimized: { control: 'boolean', description: 'compact strip — video pills only (thread #21)' },
  videoOnly: { control: 'boolean', description: 'single-track special mode (thread #23)' },
  locked: { control: 'boolean', description: 'host-injected binding — selector hidden (thread #3)' },
  project: {
    control: 'radio',
    options: ['seed', 'multi', 'empty'] as const,
    labels: { seed: 'seed (V1+A1)', multi: 'multi-track (V1/V2/A1/A2)', empty: 'empty lanes' },
  },
  boundVideoTrack: { control: 'inline-radio', options: ['V1', 'V2'], description: 'which project video track the lane binds (needs the multi project)' },
  boundAudioTrack: { control: 'inline-radio', options: ['A1', 'A2'], description: 'which project audio track the lane binds (needs the multi project)' },
};

function panelPatch(args: PanelArgs): Patch {
  return {
    doc: docFor(args.project),
    zoomStep: args.zoomStep,
    playhead: args.playhead,
    selectedId: selectionFor(args.selection),
    snapOn: args.snapOn,
    rippleOn: args.rippleOn,
    filmstripOn: args.filmstripOn,
    audioLaneVisible: args.audioLaneVisible,
    timelineMinimized: args.timelineMinimized,
    trackMode: args.videoOnly ? 'video' : 'paired',
    trackBindingLocked: args.locked,
    boundVideoTrack: args.boundVideoTrack,
    boundAudioTrack: args.boundAudioTrack,
  };
}

export const PanelDefault: StoryObj<PanelArgs> = {
  name: 'Panel — default (state controls)',
  args: {
    zoomStep: 2,
    playhead: 5.25,
    selection: 'none',
    snapOn: false,
    rippleOn: false,
    filmstripOn: true,
    audioLaneVisible: true,
    timelineMinimized: false,
    videoOnly: false,
    locked: false,
    project: 'seed',
    boundVideoTrack: 'V1',
    boundAudioTrack: 'A1',
  },
  argTypes: panelArgTypes,
  render: (args) => (
    <Frame patch={panelPatch(args)}>
      <Timeline />
    </Frame>
  ),
};

export const PanelEmptyLanes: StoryObj<PanelArgs> = {
  name: 'Panel — empty lanes',
  args: {
    zoomStep: 2,
    playhead: 0,
    selection: 'none',
    snapOn: false,
    rippleOn: false,
    filmstripOn: true,
    audioLaneVisible: true,
    timelineMinimized: false,
    videoOnly: false,
    locked: false,
    project: 'empty',
    boundVideoTrack: 'V1',
    boundAudioTrack: 'A1',
  },
  argTypes: panelArgTypes,
  render: (args) => (
    <Frame patch={panelPatch(args)}>
      <Timeline />
    </Frame>
  ),
};

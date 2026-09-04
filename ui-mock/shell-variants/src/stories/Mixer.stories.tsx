/* Mixer stories — the design-doc v2.2 revision (end of file) audio surfaces:
   the 3-state side dock beside the multi-track lanes, a solo ChannelStrip,
   the Audio-focus inspector swap (ChannelEditor), and the SoundLibrary pool
   swap. All store-driven; the default mock mixer covers scene 1's audio
   tracks (A1 dialogue / A2 bgm with duck-under). */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { MixerDock } from '../components/mixer/MixerDock';
import { ChannelStrip } from '../components/mixer/ChannelStrip';
import { ChannelEditor } from '../components/mixer/ChannelEditor';
import { SoundLibrary } from '../components/mixer/SoundLibrary';
import { useUi } from '../state/useUiStore';
import type { TrackJSON } from '../lib/mockData';
import { StoreBoot, PanelBox, type UiPatch } from './decorators';

const meta: Meta = {
  title: 'Mixer',
};

export default meta;

/* ---- the 3-state side dock (rendered where the shell puts it: right of
   the multi-track lanes) --------------------------------------------------- */

function MixerDockStory({ patch }: { patch: UiPatch }) {
  return (
    <>
      <StoreBoot patch={patch} />
      <div className="flex h-screen bg-app">
        <div className="mono flex min-w-0 flex-1 items-center justify-center text-[11px] text-tmuted">
          ( multi-track lanes sit here in the real shell — mixer dock preview only )
        </div>
        <MixerDock />
      </div>
    </>
  );
}

/** Classic strip row: per-track ChannelStrips + aux returns + master, fader
 *  room = the timeline area's height. */
export const FullDock: StoryObj = {
  name: 'Mixer — Full dock (side by side)',
  parameters: { layout: 'fullscreen' },
  render: () => <MixerDockStory patch={{ mixerState: 'full' }} />,
};

/** 44px meter-bridge rail: vertical stereo meter per track + master cluster. */
export const BridgeRail: StoryObj = {
  name: 'Mixer — Bridge rail',
  parameters: { layout: 'fullscreen' },
  render: () => <MixerDockStory patch={{ mixerState: 'bridge' }} />,
};

/** Collapse path: state = collapsed renders nothing (bounds-check story). */
export const Collapsed: StoryObj = {
  name: 'Mixer — Collapsed (renders nothing)',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ mixerState: 'collapsed' }} />
      <div className="flex h-[200px] items-center justify-center bg-app text-[11px] text-tmuted">
        ( mixer dock collapsed — nothing rendered here )
      </div>
    </>
  ),
};

/* ---- ChannelStrip solo ----------------------------------------------------- */

function StripSolo({ compact = false }: { compact?: boolean }) {
  const track = useUi((s) => s.scenes[0].tracks.find((t): t is TrackJSON => t.id === 'tr-audio-2'));
  if (!track) return null;
  return (
    <div className={`flex items-stretch border border-hairline ${compact ? 'h-[260px]' : 'h-[460px]'}`}>
      <ChannelStrip track={track} sceneId="sc-1" compact={compact} focused onStripClick={() => { /* demo */ }} />
    </div>
  );
}

/** A2 (BGM role): full strip with duck-under row, focused ring. */
export const ChannelStripSolo: StoryObj = {
  name: 'Mixer — ChannelStrip solo',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ stripFocus: 'tr-audio-2' }} />
      <StripSolo />
    </>
  ),
};

/** Compact strip: what the dock shows when the timeline area is short. */
export const ChannelStripCompact: StoryObj = {
  name: 'Mixer — ChannelStrip compact',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ stripFocus: 'tr-audio-2' }} />
      <StripSolo compact />
    </>
  ),
};

/* ---- channel editor (audio-focus inspector) -------------------------------- */

/** CLIP section = selected element's audio fields; TRACK section = the
 *  focused track's G-strip in detail (fader/pan/inserts/sends/bus/duck). */
export const ChannelEditorStory: StoryObj = {
  name: 'Channel editor',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ page: 'audio', selection: ['el-7'], stripFocus: 'tr-audio-2' }} />
      <PanelBox width={340} height={700}>
        <ChannelEditor />
      </PanelBox>
    </>
  ),
};

/* ---- sound library (audio-focus media pool) -------------------------------- */

/** Audio media + audio-bearing video grouped by role, role chips, import CTA. */
export const SoundLibraryStory: StoryObj = {
  name: 'Sound library',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ page: 'audio' }} />
      <PanelBox width={300} height={700}>
        <SoundLibrary />
      </PanelBox>
    </>
  ),
};

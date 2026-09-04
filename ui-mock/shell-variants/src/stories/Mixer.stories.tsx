/* Mixer stories — the design-doc §4 audio surfaces: the 3-state row under the
   timeline, a solo ChannelStrip, the Audio-focus inspector swap
   (ChannelEditor), and the SoundLibrary pool swap. All store-driven; the
   default mock mixer covers scene 1's audio tracks (A1 dialogue / A2 bgm
   with duck-under). */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { MixerRow } from '../components/mixer/MixerRow';
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

/* ---- the 3-state row (rendered where the shell puts it: timeline above) --- */

function MixerRowStory({ patch }: { patch: UiPatch }) {
  return (
    <>
      <StoreBoot patch={patch} />
      <div className="flex h-screen flex-col bg-app">
        <div className="mono flex flex-1 items-center justify-center text-[11px] text-tmuted">
          ( timeline sits here in the real shell — mixer row preview only )
        </div>
        <MixerRow />
      </div>
    </>
  );
}

/** ~176px strip row: per-track ChannelStrips + aux returns + master. */
export const FullRow: StoryObj = {
  name: 'Mixer — Full row',
  parameters: { layout: 'fullscreen' },
  render: () => <MixerRowStory patch={{ mixerState: 'full' }} />,
};

/** ~32px meter bridge: badge + name + meter + M/S/L chips + master cluster. */
export const Bridge: StoryObj = {
  name: 'Mixer — Bridge',
  parameters: { layout: 'fullscreen' },
  render: () => <MixerRowStory patch={{ mixerState: 'bridge' }} />,
};

/* ---- ChannelStrip solo ----------------------------------------------------- */

function StripSolo() {
  const track = useUi((s) => s.scenes[0].tracks.find((t): t is TrackJSON => t.id === 'tr-audio-2'));
  if (!track) return null;
  return (
    <div className="flex h-[420px] items-stretch border border-hairline">
      <ChannelStrip track={track} sceneId="sc-1" compact={false} focused onStripClick={() => { /* demo */ }} />
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

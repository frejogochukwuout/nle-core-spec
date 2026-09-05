/* Mixer stories — the design-doc v2.2 revision (end of file) audio surfaces:
   the 3-state side dock beside the multi-track lanes, a solo ChannelStrip,
   the Audio-focus inspector swap (ChannelEditor), and the SoundLibrary pool
   swap. All store-driven; the default mock mixer covers scene 1's audio
   tracks (A1 dialogue / A2 bgm with duck-under).
   R15-A5: the *Levels stories pin the A2/A3/A4 surfaces deterministically —
   meter levels injected through the shared engine's __setLevel debug hook
   (fixed values, holds re-armed; see decorators.MeterLevels), so the base
   bars / readout rows / peak lines / clip state are screenshottable without
   the seeded program walk. */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { MixerDock } from '../components/mixer/MixerDock';
import { ChannelStrip } from '../components/mixer/ChannelStrip';
import { ChannelEditor } from '../components/mixer/ChannelEditor';
import { SoundLibrary } from '../components/mixer/SoundLibrary';
import { useUi } from '../state/useUiStore';
import type { TrackJSON } from '../lib/mockData';
import { StoreBoot, PanelBox, MeterLevels, type UiPatch } from './decorators';

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

/* ---- R15 A3/A4 chrome + deterministic engine levels ----------------------- */

/* Fixed levels injected through the shared engine's __setLevel debug hook
   (see decorators.MeterLevels): A1 dialogue at −12 (green/amber zone), A2 bgm
   CLIPPING at 0 dBFS (red + data-state=clip on its strip meter), master
   peak-held (fill −6 / peak line −1). The peak pair = two entries on one key
   (the first sets the held peak, the second the fill). Aux returns stay
   honest: nothing feeds the buses — no-source chip, engine silent. */
const DOCK_LEVELS: { key: string; db: number; channel?: 'l' | 'r' }[] = [
  { key: 'tr-audio-1', db: -12 },
  { key: 'tr-audio-2', db: 0 },
  { key: 'master', db: -1 },
  { key: 'master', db: -6 },
];

/** Full dock with the R15 A3/A4 strip chrome — role-color h-1 base bars
 *  (dialogue/bgm from --mk-role-*), section hairlines, alternating bg
 *  parity, A3 fader scale columns + unity notch, readout rows (fader dB +
 *  live engine peak, mono tabular), 20×18 M/S/L — plus deterministic meter
 *  levels so the review frame pins every state without randomness: A1
 *  normal, A2 clip, master peak-held. Aux strips show the honest no-source
 *  chip. */
export const FullDockLevels: StoryObj = {
  name: 'Mixer — Full dock, deterministic levels (R15 chrome)',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <>
      <StoreBoot patch={{ mixerState: 'full' }} />
      <MeterLevels levels={DOCK_LEVELS} />
      <div className="flex h-screen bg-app">
        <div className="mono flex min-w-0 flex-1 items-center justify-center px-8 text-center text-[11px] text-tmuted">
          ( multi-track lanes sit here in the real shell — mixer dock preview only ·
          A1 −12 normal / A2 0 dBFS clip / master −6 peak −1 / aux no-source )
        </div>
        <MixerDock />
      </div>
    </>
  ),
};

/** The 44px bridge rail with the same deterministic levels — the glance
 *  surface: per-track stereo meters (A1 normal, A2 clip) + the master
 *  cluster meter peak-held. One engine key per surface: bridge, strips and
 *  the toolbar micro-meter can never disagree (R15-A2 unification). */
export const BridgeRailLevels: StoryObj = {
  name: 'Mixer — Bridge rail, deterministic levels',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <>
      <StoreBoot patch={{ mixerState: 'bridge' }} />
      <MeterLevels levels={DOCK_LEVELS} />
      <div className="flex h-screen bg-app">
        <div className="mono flex min-w-0 flex-1 items-center justify-center px-8 text-center text-[11px] text-tmuted">
          ( multi-track lanes sit here in the real shell — bridge rail preview only ·
          A1 −12 normal / A2 0 dBFS clip / master −6 peak −1 )
        </div>
        <MixerDock />
      </div>
    </>
  ),
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

/* The solo strip with live levels: A2 bgm at −18 with the duck-under row
   visible — the readout row's live peak (engine view) + the strip meter run
   at the injected level while the ducking row shows the v2.2 §5 sidechain
   mock (amount 0.6 under A1). */
const SOLO_LEVELS: { key: string; db: number }[] = [{ key: 'tr-audio-2', db: -18 }];

/** ChannelStrip solo + deterministic level (−18) + the A4 chrome: bgm role
 *  base bar, readout row (fader dB −12.0 + live peak −18.0), duck-under row,
 *  scale column + unity notch on the fader, 24px dial. */
export const ChannelStripSoloLevel: StoryObj = {
  name: 'Mixer — ChannelStrip solo, deterministic level',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ stripFocus: 'tr-audio-2' }} />
      <MeterLevels levels={SOLO_LEVELS} />
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

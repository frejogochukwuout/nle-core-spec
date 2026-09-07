/* Mixer stories — the design-doc v2.2 revision (end of file) audio surfaces:
   the 3-state side dock beside the multi-track lanes, a solo ChannelStrip,
   the Audio-focus inspector swap (ChannelEditor), and the SoundLibrary pool
   swap. All store-driven; the default mock mixer covers scene 1's audio
   tracks (A1 dialogue / A2 bgm with duck-under).
   R15-A5: the *Levels stories pin the A2/A3/A4 surfaces deterministically —
   meter levels injected through the shared engine's __setLevel debug hook
   (fixed values, holds re-armed; see decorators.MeterLevels), so the base
   bars / readout rows / peak lines / clip state are screenshottable without
   the seeded program walk.
   R19-B1: strips carry the Fairlight reference anatomy (3px top bar, input
   row, FX chip rack + "I", graph thumbnails, R/S/M, pan box) with the
   TERMINAL fader section — shared 24px headroom + equal-height
   [meter | fader+scale] columns; aux returns + master pin to the dock's
   right edge. */

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

/** R20 meters state: full dock height, thin per-track 24px meter columns
 *  side-by-side (badge row + 2×8px stereo bars + M/S dots; master pinned
 *  right) — the collapsed/minimized mixer per thread #61 (NOT the old 44px
 *  vertically-stacked bridge rail). */
export const MetersState: StoryObj = {
  name: 'Mixer — Meters state (full-height columns)',
  parameters: { layout: 'fullscreen' },
  render: () => <MixerDockStory patch={{ mixerState: 'meters' }} />,
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

/** The R20 meters state with deterministic levels — the glance surface:
 *  per-track 24px columns (A1 normal, A2 clip) + the master column
 *  peak-held. One engine key per surface: meters, strips and the toolbar
 *  micro-meter can never disagree (R15-A2 unification). */
export const MetersStateLevels: StoryObj = {
  name: 'Mixer — Meters state, deterministic levels',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <>
      <StoreBoot patch={{ mixerState: 'meters' }} />
      <MeterLevels levels={DOCK_LEVELS} />
      <div className="flex h-screen bg-app">
        <div className="mono flex min-w-0 flex-1 items-center justify-center px-8 text-center text-[11px] text-tmuted">
          ( multi-track lanes sit here in the real shell — meter columns preview only ·
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

/* ---- ChannelStrip solo (tier API: MIXER_TIER {FULL 560, LEAN 420, MIN
   340, FLOOR 280}; the strip's own height drives the accessory stack) ---- */

function StripSolo({ tier = 0, height = 520, narrow = false }: { tier?: 0 | 1 | 2 | 3; height?: number; narrow?: boolean }) {
  const track = useUi((s) => s.scenes[0].tracks.find((t): t is TrackJSON => t.id === 'tr-audio-2'));
  if (!track) return null;
  return (
    <div className="flex items-stretch border border-hairline" style={{ height }}>
      <ChannelStrip track={track} sceneId="sc-1" tier={tier} narrow={narrow} stripH={height} focused onStripClick={() => { /* demo */ }} />
    </div>
  );
}

/** A2 (BGM role): the full reference anatomy — 3px role top bar, "No Input"
 *  row, FX chip rack ("+" add slots — A2 ships empty, honest toast on click)
 *  + gold "I" power button, EQ/dynamics thumbnails, role label, R/S/M, 48px
 *  pan crosshair box, then the TERMINAL fader section: shared 24px headroom
 *  readout (−12.0 + live peak) over equal-height [meter | fader+scale]
 *  columns, flush to the strip bottom. Focused ring. */
export const ChannelStripSolo: StoryObj = {
  name: 'Mixer — ChannelStrip solo (reference anatomy)',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ stripFocus: 'tr-audio-2' }} />
      <StripSolo />
    </>
  ),
};

/* The solo strip with live levels: A2 bgm at −18 — the headroom readout's
   live peak (engine view) + the strip meter run at the injected level; the
   terminal fader fills the remaining strip height (fader = meter height,
   th_mtoyq7jt) while the ducking mock (amount 0.6 under A1) reads from the
   store in the ChannelEditor rail. */
const SOLO_LEVELS: { key: string; db: number }[] = [{ key: 'tr-audio-2', db: -18 }];

/** ChannelStrip solo + deterministic level (−18): the full reference anatomy
 *  + live metering — headroom readout (−12.0 + peak −18.0), meter fill at
 *  −18, the piecewise dB scale marks down the fader column. */
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

/** Lean tier (T1, 420-559px dock): graphs collapse to one combined row,
 *  pan box compacts 48→36, fx-rack shows 3 slots. */
export const ChannelStripLean: StoryObj = {
  name: 'Mixer — ChannelStrip lean tier (T1 @460px)',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ stripFocus: 'tr-audio-2' }} />
      <StripSolo tier={1} height={460} />
    </>
  ),
};

/** T3 (<340px): the per-channel VERTICAL SCROLL tier — the accessory stack
 *  (input/fx/graphs/pan/routing/title/RSM) scrolls inside the strip while
 *  the fader+scale+meter trio stays PINNED at the bottom (travel ≥140px,
 *  proportions locked) — thread #59's "tight vertical space, per-channel
 *  scroll if we truly need more space". */
export const ChannelStripT3: StoryObj = {
  name: 'Mixer — ChannelStrip T3 (per-channel scroll @300px)',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ stripFocus: 'tr-audio-2' }} />
      <StripSolo tier={3} height={300} />
    </>
  ),
};

/** Narrow dock variant (width-only trigger, D1.3): the dock's width budget
 *  falls below N×86 — 72px scale+fader-only strips (meters via the meters
 *  state). */
export const ChannelStripNarrow: StoryObj = {
  name: 'Mixer — ChannelStrip narrow (72px variant)',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ stripFocus: 'tr-audio-2' }} />
      <StripSolo tier={1} height={420} narrow />
    </>
  ),
};

/* ---- channel editor (audio-focus inspector) -------------------------------- */

/** CLIP section = selected element's audio fields; TRACK section = the
 *  focused track's G-strip in detail (pan/inserts/sends/bus/duck) beside
 *  the TERMINAL fader block — [meter | fader+scale] fills all remaining
 *  vertical space with the shared headroom readout (R19-B1). */
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

/** Audio media + audio-bearing video grouped by role, role chips, import CTA.
 *  R20-W5 (thread #67): the library honors the media-bay MODE filter
 *  (poolModeFilter, default ON) — the honest count chip shows visible/total
 *  and the 'Audio only' toggle in the header lists the WHOLE pool when off. */
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

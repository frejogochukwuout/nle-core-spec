/* Primitives stories — the leaf mixer controls from design doc v2.2 §6: the
   dB-tapered fader, the pan knob, and the mock stereo meter. Fader + PanKnob
   are plain controlled props, so the stories hold local state and the drag /
   double-click-reset / keyboard grammar stays reviewable; StripMeter's rAF
   noise walk is driven by the store's `playing` flag, booted per story.
   NOTE — the Effects library is deliberately NOT here: EffectsPanel is
   internal to AppShell.tsx (not an exported component); its review surface is
   the 'Chrome/Full Shell — Effects panel on' story (a full shell with the
   panels patch). */

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Fader, PanKnob, StripMeter } from '../components/mixer/MixerPrimitives';
import { StoreBoot } from './decorators';

const meta: Meta = {
  title: 'Primitives',
  parameters: { layout: 'padded' },
};

export default meta;

/* ---- fader -------------------------------------------------------------------- */

/* Local-state wrappers: Fader/PanKnob are plain controlled props, so the
   story owns the value and the drag / keyboard grammar stays live. */
function FaderDuo() {
  const [a, setA] = useState(-6);
  const [b, setB] = useState(-24);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="mono text-[11px] text-tmuted">fader — fixed 96px track height (−6 / −24)</div>
      <div className="flex w-fit gap-4 border border-hairline bg-shell p-3">
        <Fader db={a} onChange={setA} ariaLabel="Demo fader A (−6 dB)" />
        <Fader db={b} onChange={setB} ariaLabel="Demo fader B (−24 dB)" />
      </div>
    </div>
  );
}

/** Fixed-height faders at −6 and −24: dB taper tick placement (6/0/−12/−24/
 *  −48/−60), thumb positions, mono dB readouts — drag, Shift+drag fine mode,
 *  double-click reset and arrow keys all live. */
export const FaderFixed: StoryObj = {
  name: 'Fader — fixed height',
  render: () => <FaderDuo />,
};

function FaderDocked() {
  const [db, setDb] = useState(-6);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="mono text-[11px] text-tmuted">fader — fillHeight inside a 300px-tall flex container</div>
      <div className="flex h-[300px] w-[72px] items-stretch border border-hairline bg-shell py-3">
        <Fader db={db} onChange={setDb} fillHeight ariaLabel="Demo dock fader (−6 dB)" />
      </div>
    </div>
  );
}

/** fillHeight mode (side-dock centerpiece): no inline height — the track
 *  stretches to fill a 300px-tall flex parent, min 80px, so the strip's
 *  fader room = whatever the dock gives it. */
export const FaderFillHeight: StoryObj = {
  name: 'Fader — fill-height (dock mode)',
  render: () => <FaderDocked />,
};

/* ---- pan knob ------------------------------------------------------------------ */

function PanSolo({ initial, caption }: { initial: number; caption: string }) {
  const [pan, setPan] = useState(initial);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="mono text-[11px] text-tmuted">{caption}</div>
      <div className="flex w-fit border border-hairline bg-shell p-3">
        <PanKnob pan={pan} onChange={setPan} ariaLabel="Demo pan knob" />
      </div>
    </div>
  );
}

/** Centered pan: pointer at top-dead-center, readout 'C' — the double-click
 *  reset target and the default state of every new channel. */
export const PanKnobCentered: StoryObj = {
  name: 'Pan knob — centered',
  render: () => <PanSolo initial={0} caption="pan knob — centered (C) · drag / double-click resets" />,
};

/** Off-center L25: indicator rotated left, mono 'L25' readout — the knob's
 *  readable offset state (arrow keys ±5, Shift ±1). */
export const PanKnobL25: StoryObj = {
  name: 'Pan knob — L25',
  render: () => <PanSolo initial={-25} caption="pan knob — L25 off-center" />,
};

/* ---- mock stereo meter ----------------------------------------------------------- */

/** Paused meters at rest: levels decayed to empty, only the black stereo
 *  frame + hairline border read — plus the toolbar micro-meter geometry
 *  (14px tall, 4px bars) beside the default 88px strip meter. */
export const StripMeterStatic: StoryObj = {
  name: 'Strip meter — static (paused)',
  render: () => (
    <>
      <StoreBoot patch={{ playing: false }} />
      <div className="flex flex-col gap-1.5">
        <div className="mono text-[11px] text-tmuted">strip meter — paused (levels at rest) · 88px strip + 14px micro</div>
        <div className="flex w-fit items-end gap-4 border border-hairline bg-shell p-3">
          <StripMeter trackId="meter-a" db={-6} label="A1 @ −6 dB" />
          <StripMeter trackId="meter-b" db={-24} label="A2 @ −24 dB" />
          <StripMeter trackId="meter-c" db={-60} label="Muted @ −60 dB" />
          <StripMeter trackId="meter-d" db={-6} height={14} width={4} label="Toolbar micro-meter" />
        </div>
      </div>
    </>
  ),
};

/** Playing meters (store playing: true drives the seeded rAF noise walk):
 *  −6 program level, −18 secondary, −60 silent floor, and a −18 with
 *  duckAmount 0.8 to surface the duck-under dimming in the same frame. */
export const StripMeterPlaying: StoryObj = {
  name: 'Strip meter — playing',
  render: () => (
    <>
      <StoreBoot patch={{ playing: true }} />
      <div className="flex flex-col gap-1.5">
        <div className="mono text-[11px] text-tmuted">strip meter — playing (rAF noise walk) · hover for peak %</div>
        <div className="flex w-fit items-end gap-4 border border-hairline bg-shell p-3">
          <StripMeter trackId="meter-a" db={-6} label="A1 @ −6 dB" />
          <StripMeter trackId="meter-b" db={-18} label="A2 @ −18 dB" />
          <StripMeter trackId="meter-c" db={-60} label="Silent @ −60 dB" />
          <StripMeter trackId="meter-e" db={-18} duckAmount={0.8} label="A2 ducked (−18, 80%)" />
        </div>
      </div>
    </>
  ),
};

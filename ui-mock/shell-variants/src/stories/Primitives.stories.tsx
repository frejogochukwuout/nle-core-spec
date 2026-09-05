/* Primitives stories — the leaf mixer controls from design doc v2.2 §4
   (full strip anatomy): the dB-tapered fader, the pan knob, and the mock
   stereo meter. Fader + PanKnob + the generic Knob are plain controlled
   props, so the stories hold local state and the drag /
   double-click-reset / keyboard / detent grammar stays reviewable.
   R15-A2: StripMeter is a VIEW over the shared stereo engine
   (lib/meterEngine) — the `db` prop stays the title's fader readout and the
   generic-key fallback source (fader for the sim), while levels come from
   the engine: the seeded program walk while `playing` (StripMeterPlaying)
   or the deterministic `__setLevel` debug hook (StripMeterLevels — no
   randomness, transient holds re-armed).
   NOTE — the Effects library is deliberately NOT here: EffectsPanel is
   internal to AppShell.tsx (not an exported component); its review surface is
   the 'Chrome/Full Shell — Effects panel on' story (a full shell with the
   panels patch). */

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Fader, Knob, PanKnob, StripMeter } from '../components/mixer/MixerPrimitives';
import { project } from '../lib/mockData';
import { StoreBoot, MeterLevels } from './decorators';

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

/* ---- fader: A3 scale column + unity notch + master cap --------------------- */

function FaderScaleDuo() {
  const [a, setA] = useState(-12);
  const [m, setM] = useState(0);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="mono text-[11px] text-tmuted">
        fader — A3 dB scale column at TRUE taper positions · 2px unity notch · end caps · master accent cap (flat)
      </div>
      <div className="flex h-[240px] w-fit items-stretch gap-6 border border-hairline bg-shell py-3 pl-4 pr-6">
        <Fader db={a} onChange={setA} fillHeight scale ariaLabel="Demo channel fader (−12 dB)" />
        <Fader db={m} onChange={setM} fillHeight accent ariaLabel="Demo master fader (0 dB)" />
      </div>
    </div>
  );
}

/** R15-A3 channel-strip grammar: the fader carries its dB label column
 *  (+6/0/−6/−12/−24/−48/−∞ at exact (db+60)/66 taper positions, 8px
 *  aria-hidden, labels hugging the track — the taper is linear-in-dB so the
 *  positions are accurate, not decorative), a 2px 0 dB unity notch, and end
 *  caps at both travel stops. Right: the master's accent cap
 *  (--fader-cap-accent-1/2, flat — no glow). Drag / keyboard still live. */
export const FaderScaleColumn: StoryObj = {
  name: 'Fader — scale column + unity notch (+ master cap)',
  render: () => <FaderScaleDuo />,
};

/* ---- knob: the generic R15-A1 dial --------------------------------------- */

const panFmt = (v: number) => (v === 0 ? 'C' : v < 0 ? `L${Math.abs(Math.round(v))}` : `R${Math.round(v)}`);

function KnobDial({ initial, caption }: { initial: number; caption: string }) {
  const [v, setV] = useState(initial);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="mono max-w-[150px] text-[11px] text-tmuted">{caption}</div>
      <div className="flex w-fit border border-hairline bg-shell p-3">
        <Knob value={v} onChange={setV} min={-100} max={100} size={24} ariaLabel="Demo pan dial" format={panFmt} defaultValue={0} step={5} fineStep={1} />
      </div>
    </div>
  );
}

/** The four dial states of the R15-A1 SVG knob (270° sweep, −135..+135,
 *  183.5 dasharray arc, indicator line ABOVE center): min = track arc only,
 *  detent ZONE = |v − 0| ≤ 2 (the pointer-RELEASE law snaps to 0 — the knob
 *  itself renders the raw value until then), center = the double-click reset
 *  target, max = full arc + indicator at +135. Drag is vertical
 *  (200px/full-range, Shift ×0.2); the bubble + persistent C/L/R label stay
 *  live. PanKnob (the pan flavour of this dial) is the next story pair. */
export const KnobDialStates: StoryObj = {
  name: 'Knob — dial states (min / detent zone / center / max)',
  render: () => (
    <div className="flex flex-wrap gap-6">
      <KnobDial initial={-100} caption="min — indicator −135°, active arc 0" />
      <KnobDial initial={-2} caption="detent zone — |v| ≤ 2: release snaps to 0" />
      <KnobDial initial={0} caption="center (C) — dbl-click reset target" />
      <KnobDial initial={100} caption="max — indicator +135°, arc full" />
    </div>
  ),
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

/* ---- mock stereo meter (R15-A2 engine view) ---------------------------------- */

/** Paused meters at rest: the engine is idle → every level at the floor, only
 *  the --meter-well frame + hairline border read — plus the toolbar
 *  micro-meter geometry (14px tall, 4px bars, `coarse` = 4 chunks instead of
 *  the 3px LED segments) beside the default 88px strip meter. */
export const StripMeterStatic: StoryObj = {
  name: 'Strip meter — static (paused)',
  render: () => (
    <>
      <StoreBoot patch={{ playing: false }} />
      <div className="flex flex-col gap-1.5">
        <div className="mono text-[11px] text-tmuted">strip meter — paused (engine idle, levels at floor) · 88px strip + 14px micro</div>
        <div className="flex w-fit items-end gap-4 border border-hairline bg-shell p-3">
          <StripMeter trackId="meter-a" db={-6} label="A1 @ −6 dB" />
          <StripMeter trackId="meter-b" db={-24} label="A2 @ −24 dB" />
          <StripMeter trackId="meter-c" db={-60} label="Muted @ −60 dB" />
          <StripMeter trackId="meter-d" db={-6} height={14} width={4} coarse label="Toolbar micro-meter" />
        </div>
      </div>
    </>
  ),
};

/** Playing meters (store playing: true → the shared engine's seeded program
 *  walk, L/R independent seeds, −30..−4 dB + the fader/duck from the props):
 *  −6 and −18 faders, a −60 (−∞ fader → silent), and −18 with duckAmount 0.8
 *  (gain-reduction viz: −12 dB × amount). Hover a well for the title's live
 *  peak readout. */
export const StripMeterPlaying: StoryObj = {
  name: 'Strip meter — playing (seeded walk)',
  render: () => (
    <>
      <StoreBoot patch={{ playing: true }} />
      <div className="flex flex-col gap-1.5">
        <div className="mono text-[11px] text-tmuted">strip meter — playing (engine program walk, L/R seeds) · hover for peak</div>
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

/* ---- deterministic levels via the engine's __setLevel debug hook ---------- */

/* scene-1 clone with A1 muted — effectiveMuted (muted ∨ anySolo ∧ ¬solo) is
   what dims + silences the engine key; the meter's db prop stays the title
   readout (the strip fader). */
const MUTED_A1_SCENES = project.scenes.map((sc) =>
  sc.id === 'sc-1'
    ? { ...sc, tracks: sc.tracks.map((t) => (t.id === 'tr-audio-1' ? { ...t, muted: true } : t)) }
    : sc,
);

/* the peak idiom: two entries on one key — the first sets the HELD peak
   (−3), the second the display fill (−18); the fill reads −18 dB (70%), the
   1px white peak line sits at −3 (95%). MeterLevels re-arms every 900 ms so
   the 1 s peak hold + 2 s clip latch never expire while the story is open. */
const METER_LEVELS: { key: string; db: number; channel?: 'l' | 'r' }[] = [
  { key: 'story-meter-normal', db: -12 },
  { key: 'story-meter-peak', db: -3 },
  { key: 'story-meter-peak', db: -18 },
  { key: 'story-meter-clip', db: 0 },
];

/** R15-A2 review frame — the four meter states, all deterministic (no seeded
 *  walk): normal (−12, green→amber zone), peak-held (fill −18 + peak line at
 *  −3), clip (0 dBFS → full + red + data-state=clip, 2 s latch), and muted
 *  (A1 muted in the scene → effectiveMute: opacity 0.2 + level 0). dB-linear
 *  display [−60, 0]: fill = (db+60)/60; zone stops agree with the palette
 *  (amber 70% = −18 dB, red 90% = −6 dB). */
export const StripMeterLevels: StoryObj = {
  name: 'Strip meter — deterministic levels (engine __setLevel)',
  render: () => (
    <>
      <StoreBoot patch={{ scenes: MUTED_A1_SCENES }} />
      <MeterLevels levels={METER_LEVELS} />
      <div className="flex flex-col gap-1.5">
        <div className="mono text-[11px] text-tmuted">
          strip meter — normal −12 · peak-held (fill −18 / line −3) · clip 0 dBFS · A1 muted · injected via meterEngine.__setLevel, re-armed 0.9 s
        </div>
        <div className="flex w-fit items-end gap-4 border border-hairline bg-shell p-3">
          <StripMeter trackId="story-meter-normal" db={-6} label="Normal @ −12 dB" />
          <StripMeter trackId="story-meter-peak" db={-6} label="Peak-held @ −18 (peak −3)" />
          <StripMeter trackId="story-meter-clip" db={0} label="Clip @ 0 dBFS" />
          <StripMeter trackId="tr-audio-1" db={-3} label="A1 muted (effectiveMute)" />
        </div>
      </div>
    </>
  ),
};

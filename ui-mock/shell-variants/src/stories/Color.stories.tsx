/* Color stories — the R20-W4b anatomy (DESIGN-R20 D3): the ColorConsole is
   the timeline-area grading surface (frozen lane strip + [Primaries |
   Curves | Qualifier] tabs + Clip ⇄ Timeline target toggle); the right rail
   is the clip-level color sections (W3 inspector grammar); the node graph
   stays in the left dock; the scope strip under the viewer is the W4c
   placeholder. All values are STORE-DRIVEN (mockGrades sidecar) — stories
   seed the sidecar via StoreBoot to show real review states. */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { ColorConsole } from '../components/pages/color/ColorConsole';
import { ColorInspectorRail } from '../components/pages/color/ColorInspectorRail';
import { ColorNodeGraph } from '../components/pages/color/ColorNodeGraph';
import { ColorScopeStrip } from '../components/pages/color/ColorScopeStrip';
import { StoreBoot, PanelBox } from './decorators';
import { DEFAULT_GRADE, DEFAULT_QUALIFIER } from '../lib/color';

const meta: Meta = {
  title: 'Color',
};

export default meta;

const COLOR_BOOT = { page: 'color' as const, selection: ['el-2'] };

/* ---- the console (timeline area) ----------------------------------------- */

/** Primaries tab: frozen lane strip + 4-wheel strip + top/master controls.
 *  Drag the wheels — every control writes the mockGrades sidecar (undoable). */
export const ConsolePrimaries: StoryObj = {
  name: 'ColorConsole — Primaries',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ ...COLOR_BOOT, colorConsoleTab: 'primaries', mockGrades: { 'el-2': { ...DEFAULT_GRADE, shHue: 205, shAmount: 0.137, lift: 0.02 } } }} />
      <PanelBox width={1040} height={420}>
        <ColorConsole />
      </PanelBox>
    </>
  ),
};

/** Curves tab (C55): the master RGB monotone spline — drag points,
 *  double-click to add, Delete to remove; points live in the grade record. */
export const ConsoleCurves: StoryObj = {
  name: 'ColorConsole — Curves',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ ...COLOR_BOOT, colorConsoleTab: 'curves', mockGrades: { 'el-2': { ...DEFAULT_GRADE, curves: { master: [{ x: 0, y: 0 }, { x: 0.35, y: 0.55 }, { x: 1, y: 0.85 }] } } } }} />
      <PanelBox width={1040} height={420}>
        <ColorConsole />
      </PanelBox>
    </>
  ),
};

/** Qualifier tab (C54): the spec 08 §8.1 HSL keyer — dual-handle bars,
 *  invert/strength, the §17.E secondary correction, Preview Matte (W4c seam). */
export const ConsoleQualifier: StoryObj = {
  name: 'ColorConsole — Qualifier',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ ...COLOR_BOOT, colorConsoleTab: 'qualifier', mockGrades: { 'el-2': { ...DEFAULT_GRADE, qualifier: { ...DEFAULT_QUALIFIER, hueCenter: 12, hueWidth: 40, satLow: 0.1, lumaHigh: 0.9 } } } }} />
      <PanelBox width={1040} height={420}>
        <ColorConsole />
      </PanelBox>
    </>
  ),
};

/** Timeline target: the Clip ⇄ toggle switched to Timeline — the console and
 *  rail edit the post-clip timeline grade (its ONLY editor; the lane strip
 *  stops highlighting a clip). */
export const ConsoleTimelineTarget: StoryObj = {
  name: 'ColorConsole — Timeline target',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ ...COLOR_BOOT, colorGradeTarget: 'timeline', mockGrades: { timeline: { ...DEFAULT_GRADE, temperature: 18, contrast: 1.15 } } }} />
      <PanelBox width={1040} height={420}>
        <ColorConsole />
      </PanelBox>
    </>
  ),
};

/* ---- the right rail (inspector slot) ------------------------------------- */

/** Clip-level color sections — Group/ParamRow grammar (W3), same target
 *  resolver as the console; the Timeline badge story shows the toggle state. */
export const InspectorRail: StoryObj = {
  name: 'Color inspector rail — clip sections',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ ...COLOR_BOOT }} />
      <PanelBox width={340} height={560}>
        <ColorInspectorRail />
      </PanelBox>
    </>
  ),
};

export const InspectorRailTimeline: StoryObj = {
  name: 'Color inspector rail — Timeline grade badge',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ ...COLOR_BOOT, colorGradeTarget: 'timeline' }} />
      <PanelBox width={340} height={560}>
        <ColorInspectorRail />
      </PanelBox>
    </>
  ),
};

/* ---- node graph (left dock) + scope strip (under viewer) ------------------ */

/** Master In → Primary 01 → {Secondary 02 ∥ Water 03} → Mixer → Tilt Shift
 *  05 → Lens Flare 06 → Master Out. Primary/Secondary bind (C56); the
 *  others honestly defer. */
export const NodeGraph: StoryObj = {
  name: 'Node graph',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ ...COLOR_BOOT }} />
      <PanelBox width={560} height={400}>
        <ColorNodeGraph />
      </PanelBox>
    </>
  ),
};

/** The W4c slot placeholder (C53): collapse is real; the traces land with
 *  the viewer canvas. */
export const ScopeStrip: StoryObj = {
  name: 'Scope strip (W4c placeholder)',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ ...COLOR_BOOT }} />
      <PanelBox width={720} height={240}>
        <ColorScopeStrip />
      </PanelBox>
    </>
  ),
};

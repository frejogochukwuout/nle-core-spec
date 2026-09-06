/* Color stories — the R19-B4 reference-grade grading surfaces, solo in
   PanelBox frames at their shell slot sizes (pattern per Shell/Mixer
   stories): Wheels panel + Qualifier panel (right-rail ~340px), the node
   graph (left dock), the scopes dock (under viewer), plus the composed
   ColorPage rail. All surfaces are store-driven only for toasts — the
   grading values are LOCAL display state (spec 08 §4), so stories render
   the exact review states without engine setup. */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { ColorPage } from '../components/pages/ColorPage';
import { ColorRailPanel } from '../components/pages/color/ColorRailPanel';
import { WheelsPanel } from '../components/pages/color/WheelsPanel';
import { QualifierPanel } from '../components/pages/color/QualifierPanel';
import { ColorNodeGraph } from '../components/pages/color/ColorNodeGraph';
import { ColorScopesDock } from '../components/pages/color/ColorScopesDock';
import { StoreBoot, PanelBox } from './decorators';

const meta: Meta = {
  title: 'Color',
};

export default meta;

/* ---- right-rail tabbed panel (what the orchestrator mounts in the rail) -- */

/** [Wheels | Qualifier] tabs at the default inspectorW (340px). */
export const RailPanel: StoryObj = {
  name: 'Color rail panel — Wheels / Qualifier tabs',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ page: 'color' }} />
      <PanelBox width={340} height={760}>
        <ColorRailPanel />
      </PanelBox>
    </>
  ),
};

/** The composed ColorPage at rail width (current AppShell routing). */
export const ColorPageStory: StoryObj = {
  name: 'Color page — grading rail',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ page: 'color' }} />
      <PanelBox width={340} height={760}>
        <ColorPage />
      </PanelBox>
    </>
  ),
};

/* ---- solo panels --------------------------------------------------------- */

/** Primaries — Color Wheels: 2×2 wheels (ring + disc + puck), Temp/Tint/
 *  Contrast/Pivot/Mid-Detail, master sliders with gradient color-bars,
 *  LUT footer. Interactive display state. */
export const WheelsPanelStory: StoryObj = {
  name: 'Wheels panel',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ page: 'color' }} />
      <PanelBox width={340} height={760}>
        <WheelsPanel />
      </PanelBox>
    </>
  ),
};

/** Qualifier — HSL: eyedropper row, Hue/Sat/Lum range widgets with the
 *  Type-A/B triangle handles + 65% masks, 14 Matte Finesse fields. */
export const QualifierPanelStory: StoryObj = {
  name: 'Qualifier panel',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ page: 'color' }} />
      <PanelBox width={340} height={760}>
        <QualifierPanel />
      </PanelBox>
    </>
  ),
};

/* ---- node graph (left dock slot) ----------------------------------------- */

/** Master In → Primary 01 → {Secondary 02 ∥ Water 03} → Mixer → Tilt Shift
 *  05 → Lens Flare 06 (selected) → Master Out, on the 64px grid. */
export const NodeGraph: StoryObj = {
  name: 'Node graph',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ page: 'color' }} />
      <PanelBox width={560} height={400}>
        <ColorNodeGraph />
      </PanelBox>
    </>
  ),
};

/* ---- scopes dock (under viewer) ------------------------------------------ */

/** 2×2 Parade | Waveform | Vectorscope | Histogram — deterministic seeded
 *  traces, collapsible via the header chevron. */
export const ScopesDock: StoryObj = {
  name: 'Scopes dock',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ page: 'color' }} />
      <PanelBox width={720} height={360}>
        <ColorScopesDock />
      </PanelBox>
    </>
  ),
};

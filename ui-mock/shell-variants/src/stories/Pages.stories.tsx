/* Page-mode rail stories — the spec-18 §4.8 right-rail swaps rendered at their
   shell geometry (340px rail × 700px) without the rest of the shell: the Color
   grading stack and the ChannelEditor empty state (the Audio-focus inspector
   swap with nothing selected — its populated state lives in Mixer.stories).
   R19 th_mto37ba3: the DeliverPage is now a FULL-VIEW export surface (3
   regions, fills its container) — its stories render at whole-mainbody
   geometry (1100×700); the Wave III shell routes the full mainbody there. */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { ColorPage } from '../components/pages/ColorPage';
import { DeliverPage } from '../components/pages/DeliverPage';
import { ChannelEditor } from '../components/mixer/ChannelEditor';
import { FxBrowser } from '../components/fx/FxBrowser';
import { FxInspector } from '../components/fx/FxInspector';
import { Timeline } from '../components/timeline/Timeline';
import { StoreBoot, PanelBox } from './decorators';

const meta: Meta = {
  title: 'Pages',
};

export default meta;

/* ---- color page (spec 18 §4.8) --------------------------------------------- */

/** R20-W4b: the color page's RAIL = the clip-level color sections (W3
 *  grammar, store-bound to the grade target); the wheels/curves/qualifier
 *  live in the TIMELINE-AREA console (see Color stories) and the scope
 *  strip sits under the viewer. */
export const ColorPageStory: StoryObj = {
  name: 'Color page — inspector rail',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ page: 'color' }} />
      <PanelBox width={340} height={700}>
        <ColorPage />
      </PanelBox>
    </>
  ),
};

/* ---- deliver page (spec 18 §4.8 / specs 10-11) — R19 full-view surface --- */

/** The full-view export surface at whole-mainbody geometry: LEFT = presets
 *  (2-col breathing-room tiles, th_mto38qzp) + the render queue; CENTER =
 *  export summary with the store-loop-driven In → Out range; RIGHT = render
 *  settings (the th_mto35hrm wrap/truncate overflow fix). One job running at
 *  38% with spinner + progress bar + retry, two done rows with reveal, one
 *  failed row. */
export const DeliverPageStory: StoryObj = {
  name: 'Deliver page — full export view',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ page: 'deliver' }} />
      <PanelBox width={1100} height={700}>
        <DeliverPage />
      </PanelBox>
    </>
  ),
};

/** Cloud-master preset selected + a custom loop range (the play step clicks
 *  the card; the loop patch is what timeline I/O marks would write): accent
 *  tile ring, re-labeled CTA, the summary range block follows, queue below. */
export const DeliverMasterPreset: StoryObj = {
  name: 'Deliver page — cloud master + custom range',
  parameters: { layout: 'padded' },
  play: async ({ canvasElement }) => {
    canvasElement
      ?.querySelector<HTMLButtonElement>('[data-testid="shell-deliver-preset-master"]')
      ?.click();
  },
  render: () => (
    <>
      <StoreBoot patch={{ page: 'deliver', loop: { start: 8.5, end: 17 } }} />
      <PanelBox width={1100} height={700}>
        <DeliverPage />
      </PanelBox>
    </>
  ),
};

/** Narrow-container fallback (the pre-Wave-III 340px rail mount): the three
 *  regions keep their minimums and the row scrolls instead of clipping — the
 *  honest transition state until the shell routes the whole mainbody. */
export const DeliverPageRail: StoryObj = {
  name: 'Deliver page — narrow container (rail fallback)',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ page: 'deliver' }} />
      <PanelBox width={340} height={700}>
        <DeliverPage />
      </PanelBox>
    </>
  ),
};

/* ---- channel editor, empty clip section (design doc §3.2) ------------------ */

/** CLIP section with nothing selected (selection: []): the empty-state row
 *  “Select an audio clip to edit its level”, while the TRACK section stays
 *  live on the default strip (A1, stripFocus null → first audio track). */
export const ChannelEditorEmpty: StoryObj = {
  name: 'Channel editor — no clip selected',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ page: 'audio', selection: [] }} />
      <PanelBox width={340} height={700}>
        <ChannelEditor />
      </PanelBox>
    </>
  ),
};

/* ---- R23-WA (DESIGN-R23 D-A1): the FX page components -------------------- */

/** The FX page's three-region composition at component geometry: the
 *  FxBrowser (left, 280px — the dock width law) beside the FxInspector rail
 *  (340px) with the el-2 transition selected (the parametric state).
 *  The full shell composes them via AppShell — see Shell/AppShell's
 *  “Full Shell — FX”. */
export const FxPageStory: StoryObj = {
  name: 'FX page — browser & inspector',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ page: 'fx', fxMode: true, selection: [], selectedFxObject: { kind: 'transition', elementId: 'el-2' } }} />
      <div className="flex gap-2">
        <PanelBox width={280} height={700}>
          <FxBrowser />
        </PanelBox>
        <PanelBox width={340} height={700}>
          <FxInspector />
        </PanelBox>
      </div>
    </>
  ),
};

/** The FX engine's timeline at lane geometry: the full Timeline with fxMode
 *  booted (tool 'fx') — clips receded, seam/head/tail zones live, fade
 *  objects on every main-track clip, the el-2 transition box interactive. */
export const FxTimeline: StoryObj = {
  name: 'FX page — timeline (fxMode)',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ page: 'fx', fxMode: true, tool: 'fx', selection: [] }} />
      <div className="h-[420px] w-[1100px] overflow-hidden">
        <Timeline />
      </div>
    </>
  ),
};

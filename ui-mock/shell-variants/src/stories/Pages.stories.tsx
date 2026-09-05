/* Page-mode rail stories — the spec-18 §4.8 right-rail swaps rendered at their
   shell geometry (340px rail × 700px) without the rest of the shell: the Color
   grading stack, the Deliver export panel, and the ChannelEditor empty state
   (the Audio-focus inspector swap with nothing selected — its populated state
   lives in Mixer.stories). */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { ColorPage } from '../components/pages/ColorPage';
import { DeliverPage } from '../components/pages/DeliverPage';
import { ChannelEditor } from '../components/mixer/ChannelEditor';
import { StoreBoot, PanelBox } from './decorators';

const meta: Meta = {
  title: 'Pages',
};

export default meta;

/* ---- color page (spec 18 §4.8) --------------------------------------------- */

/** The single-column grading stack at rail width: 2×2 wheels, primaries
 *  sliders, curves + scopes, LUT / HSL qualifier — nothing clipped at 340px. */
export const ColorPageStory: StoryObj = {
  name: 'Color page — grading stack',
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

/* ---- deliver page (spec 18 §4.8 / specs 10-11) ----------------------------- */

/** The full export panel: project metadata card, 3 presets (FCPXML active),
 *  render settings, accent CTA and the job queue — one job running at 38%
 *  with spinner + progress bar + retry, two done rows with reveal. */
export const DeliverPageStory: StoryObj = {
  name: 'Deliver page — settings + job queue',
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

/** Cloud-master preset selected (the play step clicks the card like a reviewer
 *  would — preset choice is component-local state): accent ring + re-labeled
 *  CTA, queue below. */
export const DeliverMasterPreset: StoryObj = {
  name: 'Deliver page — cloud master preset',
  parameters: { layout: 'padded' },
  play: async ({ canvasElement }) => {
    canvasElement
      ?.querySelector<HTMLButtonElement>('[data-testid="shell-deliver-preset-master"]')
      ?.click();
  },
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

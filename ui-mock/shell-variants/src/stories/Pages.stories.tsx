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
import { ToastRegion } from '../components/shell/ToastRegion';
import { Timeline } from '../components/timeline/Timeline';
import { TimelineCompact } from '../components/timeline/TimelineCompact';
import { StoreBoot, PanelBox } from './decorators';

const meta: Meta = {
  title: 'Pages',
};

export default meta;

/* ---- color page (spec 18 §4.8) --------------------------------------------- */

/** R20-W4b → R23-WB: the color page's RAIL = the ONE grading surface (the
 *  W3 grammar, store-bound to the grade target — wheels/curves/qualifier as
 *  tabs under this one inspector panel); the tabbed ScopesDock console row
 *  and the node-graph viewer surface live in the timeline area / viewer
 *  region of the shell (see Color stories for their solo geometry). */
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

/** The whole-mainbody export surface at its own geometry (R22 W5, #88/#89
 *  — captions re-truthed R24-W4): LEFT = presets ONLY (2-col
 *  breathing-room tiles, th_mto38qzp — the queue is NOT here); CENTER = the
 *  video preview (the queue replaces it while rendering / whenever the
 *  header toggle asks); RIGHT = the deliver INSPECTOR — the export summary
 *  (incl. the store-loop-driven In → Out range) + the render settings. The
 *  fixture boots IDLE: one failed row + three done rows, no running row
 *  (§4.2's error state rides the failed row's Retry). */
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
 *  tile ring, re-labeled CTA, the summary range block follows — the queue
 *  stays the CENTER view's swap (never the presets rail). */
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
 *  regions keep their minimums and the row scrolls instead of clipping.
 *  R23-FIX (review-sweep item 8, R2-F6): this claim is TRUE since the fix —
 *  the region row carries overflow-x-auto + min-w-0 (the three minimums sum
 *  ≥ ~900px; before the fix the row clipped with no scroll reachable, and
 *  this comment described an aspirational state). */
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

/** R24-W4 (A3-R7, #71): the deliver STRIP — the coexistence head stack at
 *  860×200 strip geometry: the 22px READ-ONLY ruler (rulerTiers ticks + TC
 *  labels + the in/out bracket FLAGS at the loop edges) with the 32px
 *  interactive in/out RANGE BAND below it (54px total). The band carries the
 *  full A3-R7 grammar: the solid 30% accent-tint fill with 1px 65%-accent
 *  edges, the ~40% dark mask outside in→out, the live TC readout, and the
 *  12px hover-brighten bracket handles (drag them — the export range IS the
 *  loop seam; the release commits the preview exactly). The frozen lanes
 *  ride below (click-to-select). */
export const DeliverStrip: StoryObj = {
  name: 'Deliver page — compact strip (ruler + range band)',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ page: 'deliver', loop: { start: 2, end: 28 } }} />
      <PanelBox width={860} height={200}>
        <TimelineCompact rangeBand clipClick="select" />
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
 *  “Full Shell — FX”.
 *  R24-W5d (F5-P3, DESIGN-R24 §3 W5d): the story mounts the ToastRegion —
 *  the browser's click-fallback toast was INVISIBLE here (live
 *  toastRegion=false), while the full-shell story showed it fine; the
 *  notification surface is part of the page's honest composition. */
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
      <ToastRegion />
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

/* Standalone shell-region stories at realistic geometry — the Viewer program
   monitor (800×500), MediaPool state rows (300×700) and the Inspector's
   empty / multi-select states (340×700). Companion to Shell/Components (which
   covers the default grid/list views and the four inspector tabs): this file
   covers the state variants each region still needs reviewed.

   Viewer caveat read from source: zoom + the in-canvas-overlay eye toggle are
   LOCAL component state (no store field), and the safe-area-guides button is
   a non-wired mock (no state at all). Coverable store paths are booted here:
   overlays hide via the tool-drag rule (tool ≠ select), zoom 50% is driven
   through the toolbar select by a play step. */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Viewer } from '../components/shell/Viewer';
import { MediaPool } from '../components/shell/MediaPool';
import { Inspector } from '../components/shell/Inspector';
import { useUi } from '../state/useUiStore';
import { sceneDuration } from '../lib/mockData';
import { StoreBoot, PanelBox, type UiPatch } from './decorators';

const meta: Meta = {
  title: 'Regions',
};

export default meta;

/* ---- viewer (spec 18 §4.3) -------------------------------------------------- */

function ViewerPanel({ patch }: { patch: UiPatch }) {
  const duration = useUi((s) => sceneDuration(s.scenes.find((x) => x.id === s.activeSceneId)!));
  return (
    <>
      <StoreBoot patch={patch} />
      <PanelBox width={800} height={500}>
        <Viewer duration={duration} />
      </PanelBox>
    </>
  );
}

/** Program monitor at playhead 16 with overlays on: letterboxed frame,
 *  in-canvas name/TC + format overlays, scrub row and transport cluster. */
export const ViewerDefault: StoryObj = {
  name: 'Viewer — program monitor',
  parameters: { layout: 'padded' },
  render: () => <ViewerPanel patch={{}} />,
};

/** In-canvas overlays suppressed through the store-bootable path — the
 *  §4.3/§9 rule “overlays hidden while a tool drag is active” (tool: blade).
 *  The eye toggle itself is local state; the composited text overlay and the
 *  name/TC chips must all disappear here. */
export const ViewerOverlaysHidden: StoryObj = {
  name: 'Viewer — in-canvas overlays hidden (blade tool)',
  parameters: { layout: 'padded' },
  render: () => <ViewerPanel patch={{ tool: 'blade' }} />,
};

/** Zoom 50% (play step drives the toolbar select — the only control surface):
 *  the frame letterboxes at half width inside the overflow-auto monitor. */
export const ViewerZoom50: StoryObj = {
  name: 'Viewer — zoom 50 %',
  parameters: { layout: 'padded' },
  play: async ({ canvasElement }) => {
    const select = canvasElement?.querySelector<HTMLSelectElement>('select[aria-label="Viewer zoom"]');
    if (!select) return;
    // native setter bypasses React's value tracker so the change event lands
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    if (!setter) return;
    setter.call(select, '50%');
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  },
  render: () => <ViewerPanel patch={{}} />,
};

/* ---- media pool state rows (spec 18 §4.2) ------------------------------------
   The pool's clip list derives from the static project.media module (not the
   store), so the empty-pool row is not bootable — the reachable state rows are
   the offline-asset treatment and the search no-result row. NOTE: every pool
   story also shows the 900 ms OPFS skeleton on mount by design. */

/** Offline-asset treatment on m-04 “waves_closeup.mp4” (list view so all 8
 *  assets fit): red left stripe, grayscale thumb, “Media offline” badge +
 *  warning icon, duration still readable. */
export const MediaPoolOffline: StoryObj = {
  name: 'Media pool — offline asset',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ mediaView: 'list' }} />
      <PanelBox width={300} height={700}>
        <MediaPool />
      </PanelBox>
    </>
  ),
};

/** Search no-result state row (distinct from the empty pool, §4.2): icon +
 *  “No clips match …” + clear-search link, footer counts at zero. The store
 *  filter is booted and the play step types the query through the real
 *  debounced input so the row shows the matching text. */
const NO_MATCH = 'zzz-no-match';
export const MediaPoolNoResults: StoryObj = {
  name: 'Media pool — no search results',
  parameters: { layout: 'padded' },
  play: async ({ canvasElement }) => {
    const input = canvasElement?.querySelector<HTMLInputElement>('input[aria-label="Search media"]');
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (!setter) return;
    setter.call(input, NO_MATCH);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  },
  render: () => (
    <>
      <StoreBoot patch={{ search: NO_MATCH }} />
      <PanelBox width={300} height={700}>
        <MediaPool />
      </PanelBox>
    </>
  ),
};

/* ---- inspector: empty + multi-select (spec 18 §4.4) -------------------------- */

/** Nothing selected (selection: []): “Nothing to inspect” state row and the
 *  hidden-not-disabled tab strip collapsed to Video only (the §4.4 empty-state
 *  rule — no phantom audio/effects tabs). */
export const InspectorEmpty: StoryObj = {
  name: 'Inspector — nothing selected',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ selection: [] }} />
      <PanelBox width={340} height={700}>
        <Inspector />
      </PanelBox>
    </>
  ),
};

/** Multi-select of 2 clips with differing model values (el-1 opacity 1 vs
 *  el-4 opacity 0.9): “2 clips selected” header, no source card, and the
 *  Opacity row in its §4.4 mixed treatment — slider replaced by the
 *  “Mixed values” chip, field blank until typed (then writes both). */
export const InspectorMultiMixed: StoryObj = {
  name: 'Inspector — multi-select mixed values',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ selection: ['el-1', 'el-4'], inspectorTab: 'video' }} />
      <PanelBox width={340} height={700}>
        <Inspector />
      </PanelBox>
    </>
  ),
};

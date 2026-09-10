/* Standalone shell-region stories at realistic geometry — the Viewer program
   monitor (800×500), MediaPool state rows (300×700) and the Inspector's
   empty / multi-select states (340×700). Companion to Shell/Components (which
   covers the default grid/list views and the four inspector tabs): this file
   covers the state variants each region still needs reviewed.

   Store paths since R12 W4: the in-canvas-overlays eye toggle AND the
   safe-area guides are store-level UI prefs (viewerOverlays /
   viewerSafeGuides, spec 18 §4.3 "UI pref" + §6.2 view-state home) — both are
   directly bootable below. Only zoom remains component-local; its 2× story
   drives the toolbar select via a play step (native-setter technique).
   R19 adds: viewerMode 'source' previews (th_mto3504c) + the caption-overlay
   story — all store-bootable. */

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
 *  The eye toggle is store state (viewerOverlays); the composited text
 *  overlay and the name/TC chips must all disappear here. Mock approximation
 *  (registered, PLAN item 23): the mock hides overlays whenever the active
 *  tool ≠ select, not only while a drag is running (Viewer.tsx). R20-W2:
 *  the program frame is now CLEAN — the 7 edit functions live in the
 *  SOURCE transport row (SourceEditBar), not a program-monitor dock. */
export const ViewerOverlaysHidden: StoryObj = {
  name: 'Viewer — in-canvas overlays hidden (blade tool)',
  parameters: { layout: 'padded' },
  render: () => <ViewerPanel patch={{ tool: 'blade' }} />,
};

/** Safe-area guides on (viewer UI pref, store state): 90% action-safe +
 *  80% title-safe centered rects with labels over the program frame. */
export const ViewerSafeGuides: StoryObj = {
  name: 'Viewer — safe-area guides on',
  parameters: { layout: 'padded' },
  render: () => <ViewerPanel patch={{ viewerSafeGuides: true }} />,
};

/** R19 th_mto3504c — SOURCE PREVIEW MODE (spec 18 §4.3 v1.1): the monitor is
 *  dual-purpose; booting viewerMode 'source' + sourceMediaId swaps the chrome
 *  to the exit control + asset name + SOURCE chip, letterboxes the asset
 *  poster (object-contain) with the spec caption, and replaces the transport
 *  cluster with the SourceEditBar (R20-W2: the 7 one-shot edit functions,
 *  reference icons) + the static source duration TC (no fake playback).
 *  In the shell this is entered by selecting exactly one pool card (C39). */
export const ViewerSourcePreview: StoryObj = {
  name: 'Viewer — source preview mode',
  parameters: { layout: 'padded' },
  render: () => <ViewerPanel patch={{ viewerMode: 'source', sourceMediaId: 'm-01' }} />,
};

/** R19 — audio source preview: no poster to letterbox, so the deterministic
 *  waveform (the pool's audio-thumb grammar) stands in; static duration TC. */
export const ViewerSourceAudio: StoryObj = {
  name: 'Viewer — source preview (audio waveform)',
  parameters: { layout: 'padded' },
  render: () => <ViewerPanel patch={{ viewerMode: 'source', sourceMediaId: 'm-06' }} />,
};

/** R19 — caption overlay: playhead 5 s sits inside cap-1 [100/24, 135/24) —
 *  the bottom-anchored black/75 chip with the caption body renders over the
 *  program frame (bilingual second line lands with real FR-track data). */
export const ViewerCaptionOverlay: StoryObj = {
  name: 'Viewer — caption overlay at playhead',
  parameters: { layout: 'padded' },
  render: () => <ViewerPanel patch={{ playhead: 5 }} />,
};

/** Zoom 2× (play step drives the toolbar select — the only control surface):
 *  the frame letterboxes at twice the fit width inside the overflow-auto
 *  monitor. (R19: the ladder is Fit/1.5×/2×/4× — the old 50 % story drove a
 *  rung that no longer exists; this one drives a real rung.) */
export const ViewerZoom2x: StoryObj = {
  name: 'Viewer — zoom 2×',
  parameters: { layout: 'padded' },
  play: async ({ canvasElement }) => {
    const select = canvasElement?.querySelector<HTMLSelectElement>('select[aria-label="Viewer zoom"]');
    if (!select) return;
    // native setter bypasses React's value tracker so the change event lands
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    if (!setter) return;
    setter.call(select, '2×');
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

/* ---- inspector: empty + multi-select (spec 18 §4.4 / R20-W3 D4) ------------ */

/** Nothing selected (selection: []): the ACTIVE-TRACK fallback sheet
 *  (th_mto5fdf6) — the same TrackSheet the track domain renders, with the
 *  "select a clip" hint row. The old tab strip is gone (R20-W3). */
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
      <StoreBoot patch={{ selection: ['el-1', 'el-4'] }} />
      <PanelBox width={340} height={700}>
        <Inspector />
      </PanelBox>
    </>
  ),
};

/* Color stories — the R22 anatomy (DESIGN-R22 D1, issues #77/#78/#79): the
   COLOR INSPECTOR (right rail) is the ONE grading surface — the
   [Primaries | Curves | Qualifier] tabs under this one inspector panel; the
   scopes console under the viewer is toggleable (off/collapsed/row/grid);
   the node graph docks beside the compact timeline (NodeGraphDock); the
   viewer is the real CPU-graded <canvas> (decode → grade stack → encode,
   rAF-coalesced, W4c) and the scopes draw REAL traces from the published
   graded frame. All values are STORE-DRIVEN (mockGrades sidecar) — stories
   seed the sidecar via StoreBoot to show real review states. */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { ColorInspector } from '../components/pages/color/ColorInspector';
import { NodeGraphDock } from '../components/pages/color/NodeGraphDock';
import { TimelineCompact } from '../components/timeline/TimelineCompact';
import { ColorNodeGraph } from '../components/pages/color/ColorNodeGraph';
import { ColorScopeStrip } from '../components/pages/color/ColorScopeStrip';
import { Viewer } from '../components/shell/Viewer';
import { GradedViewerCanvas } from '../components/shell/GradedViewerCanvas';
import { StoreBoot, PanelBox } from './decorators';
import { DEFAULT_GRADE, DEFAULT_QUALIFIER } from '../lib/color';

const meta: Meta = {
  title: 'Color',
};

export default meta;

const COLOR_BOOT = { page: 'color' as const, selection: ['el-2'] };

/* ---- the inspector (the ONE grading surface, the right rail) ------------- */

/** Primaries tab: the 4-wheel strip + top/master controls in the 420px rail.
 *  Drag the wheels — every control writes the mockGrades sidecar (undoable). */
export const InspectorPrimaries: StoryObj = {
  name: 'ColorInspector — Primaries',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ ...COLOR_BOOT, colorInspectorTab: 'primaries', mockGrades: { 'el-2': { ...DEFAULT_GRADE, shHue: 205, shAmount: 0.137, lift: 0.02 } } }} />
      <PanelBox width={420} height={640}>
        <ColorInspector />
      </PanelBox>
    </>
  ),
};

/** Curves tab (C55): the master RGB monotone spline — drag points,
 *  double-click to add, Delete to remove; points live in the grade record. */
export const InspectorCurves: StoryObj = {
  name: 'ColorInspector — Curves',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ ...COLOR_BOOT, colorInspectorTab: 'curves', mockGrades: { 'el-2': { ...DEFAULT_GRADE, curves: { master: [{ x: 0, y: 0 }, { x: 0.35, y: 0.55 }, { x: 1, y: 0.85 }] } } } }} />
      <PanelBox width={420} height={640}>
        <ColorInspector />
      </PanelBox>
    </>
  ),
};

/** Qualifier tab (C54): the spec 08 §8.1 HSL keyer — dual-handle bars,
 *  invert/strength, the §17.E secondary correction, Preview Matte (W4c seam). */
export const InspectorQualifier: StoryObj = {
  name: 'ColorInspector — Qualifier',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ ...COLOR_BOOT, colorInspectorTab: 'qualifier', mockGrades: { 'el-2': { ...DEFAULT_GRADE, qualifier: { ...DEFAULT_QUALIFIER, hueCenter: 12, hueWidth: 40, satLow: 0.1, lumaHigh: 0.9 } } } }} />
      <PanelBox width={420} height={640}>
        <ColorInspector />
      </PanelBox>
    </>
  ),
};

/** Timeline target: the Clip ⇄ toggle switched to Timeline — the inspector
 *  edits the post-clip timeline grade (its ONLY editor; the compact strip
 *  stops highlighting a clip). */
export const InspectorTimelineTarget: StoryObj = {
  name: 'ColorInspector — Timeline target',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ ...COLOR_BOOT, colorGradeTarget: 'timeline', mockGrades: { timeline: { ...DEFAULT_GRADE, temperature: 18, contrast: 1.15 } } }} />
      <PanelBox width={420} height={640}>
        <ColorInspector />
      </PanelBox>
    </>
  ),
};

/* ---- the compact timeline + the console docks (#75/#78) ------------------- */

/** The #75 compact strip solo — V/A/T color-coded, frozen, click = grade
 *  target. "a timeline style that can be generalized." */
export const CompactStrip: StoryObj = {
  name: 'TimelineCompact — the compact strip',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ ...COLOR_BOOT }} />
      <PanelBox width={860} height={180}>
        <TimelineCompact />
      </PanelBox>
    </>
  ),
};

/** The node graph DOCKED in the timeline area (D4): scrollable workspace at
 *  natural size, the dock clips (the #74 fix); toggle from the toolbar. */
export const NodesDock: StoryObj = {
  name: 'NodeGraphDock — the node console',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ ...COLOR_BOOT, colorNodesDock: true }} />
      <div className="flex h-[280px] w-full min-h-0">
        <div className="flex min-h-0 flex-1 flex-col">
          <TimelineCompact />
        </div>
        <NodeGraphDock />
      </div>
    </>
  ),
};

/** The scopes console states (D3): row + grid layouts, both live off the
 *  graded-frame bus. */
export const ScopesConsole: StoryObj = {
  name: 'ScopesDock — row + grid (no frame: standby)',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ ...COLOR_BOOT, colorScopesState: 'grid' }} />
      <PanelBox width={720} height={300}>
        <ColorScopeStrip />
      </PanelBox>
    </>
  ),
};

/* ---- node graph (standalone) + scope strip (under viewer) ------------------ */

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

/** The strip solo = the standby state (the bus has no graded frame until a
 *  viewer grades one — see the GradedViewer story for live traces). */
export const ScopeStrip: StoryObj = {
  name: 'Scope strip — standby (no graded frame)',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ ...COLOR_BOOT, colorScopesState: 'grid' }} />
      <PanelBox width={720} height={300}>
        <ColorScopeStrip />
      </PanelBox>
    </>
  ),
};

/* ---- W4c: the graded viewer canvas + real scopes (C52/C53) --------------- */

/** GradedViewer — canvas + scopes: the color-page viewer surface. The image
 *  is the REAL still (public/media, ≤960×540 working res) decoded to
 *  scene-linear, graded through the [clip → timeline] stack (curve LUT +
 *  qualifier composed in the pixel loop), encoded, drawn — and the scope
 *  strip draws WFM/Parade/Vector/Histogram traces from the exact frame at
 *  the 10fps throttle. Scrub the playhead: the grade follows the clip. */
export const GradedViewer: StoryObj = {
  name: 'GradedViewer — canvas + scopes',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot
        patch={{
          ...COLOR_BOOT,
          playhead: 16, // el-2 (Marina interview) under the playhead
          colorScopesState: 'grid',
          mockGrades: {
            'el-2': { ...DEFAULT_GRADE, shHue: 210, shAmount: 0.12, temperature: 12, contrast: 1.08, saturation: 8, curves: { master: [{ x: 0, y: 0 }, { x: 0.35, y: 0.42 }, { x: 1, y: 0.92 }] } },
            timeline: { ...DEFAULT_GRADE, temperature: 6 },
          },
        }}
      />
      <PanelBox width={760} height={600}>
        <div className="flex h-full min-h-0 flex-col">
          <Viewer duration={30} />
          <ColorScopeStrip />
        </div>
      </PanelBox>
    </>
  ),
};

/** Qualifier matte + eyedropper (C54): the console's Qualifier tab with a
 *  warm HSL key seeded on el-2, Preview Matte ON (green overlay over the
 *  showMask grayscale in the viewer) and the eyedropper ARMED — click the
 *  viewer image to re-seed the qualifier center values. */
export const QualifierMatteEyedropper: StoryObj = {
  name: 'Qualifier matte + eyedropper',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot
        patch={{
          ...COLOR_BOOT,
          playhead: 16,
          colorInspectorTab: 'qualifier',
          qualifierPreviewOn: true,
          qualifierPickerOn: true,
          mockGrades: {
            'el-2': {
              ...DEFAULT_GRADE,
              qualifier: { ...DEFAULT_QUALIFIER, hueCenter: 28, hueWidth: 46, satLow: 0.18, lumaHigh: 0.82, showMask: true, exposure: 0.35 },
            },
          },
        }}
      />
      <div className="flex gap-2">
        <PanelBox width={760} height={430}>
          <div className="flex h-full min-h-0 flex-col">
            <Viewer duration={30} />
          </div>
        </PanelBox>
        <PanelBox width={420} height={430}>
          <div className="h-full overflow-auto">
            <ColorInspector />
          </div>
        </PanelBox>
      </div>
    </>
  ),
};

/** The §4.2 decode-failure state row (canvas path): a broken src surfaces
 *  the honest error row + Retry (the srcOverride hook is story/test-only). */
export const DecodeFailureRow: StoryObj = {
  name: 'GradedViewer — decode failure state row',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ ...COLOR_BOOT }} />
      <PanelBox width={640} height={360}>
        <GradedViewerCanvas mediaId="m-01" elementId="el-1" mode="program" srcOverride="/media/missing-asset.jpg" />
      </PanelBox>
    </>
  ),
};

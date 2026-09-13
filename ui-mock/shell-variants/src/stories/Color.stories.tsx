/* Color stories — the R22 anatomy (DESIGN-R22 D1, issues #77/#78/#79) →
   R23-WB (DESIGN-R23 track B, #90–#97): the COLOR INSPECTOR (right rail)
   is the ONE grading surface — the [Primaries | Curves | Qualifier] tabs
   under this one inspector panel; the scopes console is the TABBED
   ScopesDock in the TIMELINE-AREA CONSOLE ROW (one scope at a time at full
   panel size — #90/#95); the node graph takes the VIEWER REGION when
   toggled (#93, × restores the viewer); the viewer is the real CPU-graded
   <canvas> (decode → grade stack → encode, rAF-coalesced, W4c) and the
   scopes draw REAL traces from the published graded frame. All values are
   STORE-DRIVEN (mockGrades sidecar) — stories seed the sidecar via StoreBoot
   to show real review states. */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { ColorInspector } from '../components/pages/color/ColorInspector';
import { TimelineCompact } from '../components/timeline/TimelineCompact';
import { ColorNodeGraph } from '../components/pages/color/ColorNodeGraph';
import { ScopesDock } from '../components/pages/color/ScopesDock';
import { StillsPanel } from '../components/pages/color/StillsPanel';
import { Layers, X } from 'lucide-react';
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

/* ---- the compact timeline + the console row (#75/#90/#94) ------------------ */

/** The #75 compact strip solo — V/A/T color-coded, frozen, click = grade
 *  target, REAL trackhead select buttons (#96). "a timeline style that can
 *  be generalized." */
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

/** The console ROW the D-B1 ruling built (#90/#95): the compact strip
 *  shares the timeline area with the TABBED ScopesDock — one scope at a
 *  time at the panel's full size, never squeezed. Standby state (the bus
 *  has no graded frame until a viewer grades one — see GradedViewer). */
export const ScopesConsoleRow: StoryObj = {
  name: 'ScopesDock — the console row (tabs, standby)',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ ...COLOR_BOOT, colorScopesState: 'open' }} />
      <div className="flex h-[240px] w-full min-h-0">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <TimelineCompact />
        </div>
        <div className="flex min-h-0 min-w-[320px] flex-1">
          <ScopesDock />
        </div>
      </div>
    </>
  ),
};

/** The Stills Gallery (D-B4/#97/#91): still CARDS — gradient thumbnail,
 *  grade name, node-count chip — the clip-level caption, Save Still,
 *  delete, and the honest .drx export toast. Store-backed (colorStills), so
 *  saved stills survive unmounts. */
export const StillsGallery: StoryObj = {
  name: 'Stills — the Gallery (clip-level)',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ ...COLOR_BOOT }} />
      <PanelBox width={340} height={560}>
        <StillsPanel />
      </PanelBox>
    </>
  ),
};

/* ---- node graph: the viewer-region surface (#93, D-B2) -------------------- */

/** The node graph AS THE VIEWER (D-B2/#93): the AppShell's surface swap —
 *  the header names the grade target, × restores the viewer, the workspace
 *  scrolls at natural size (706×268; Master In → Primary 01 → {Secondary 02 ∥
 *  Water 03} → Mixer → Tilt Shift 05 → Lens Flare 06 → Master Out).
 *  Primary/Secondary bind (C56); the others honestly defer. */
export const NodesViewerSurface: StoryObj = {
  name: 'Nodes — the viewer-region surface (#93)',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ ...COLOR_BOOT, colorNodesDock: true }} />
      <PanelBox width={760} height={480}>
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius)] bg-panel">
          <div className="flex h-[26px] shrink-0 items-center gap-2 border-b border-hairline bg-shell px-2">
            <Layers size={12} aria-hidden className="text-tmuted" />
            <span className="text-[11px] font-medium text-tprimary">Nodes</span>
            <span className="truncate text-[11px] text-tmuted">Marina interview</span>
            <button type="button" className="icon-btn ml-auto" aria-label="Close node graph and restore the viewer" data-tip="Restore the viewer">
              <X size={13} strokeWidth={1.8} />
            </button>
          </div>
          <div className="scroll-both min-h-0 flex-1 overflow-auto">
            <ColorNodeGraph />
          </div>
        </div>
      </PanelBox>
    </>
  ),
};

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

/* ---- W4c: the graded viewer canvas + real scopes (C52/C53) --------------- */

/** GradedViewer — canvas + the console row: the color-page composition
 *  (D-B1 — the viewer up top, the compact strip + the TABBED ScopesDock in
 *  the timeline-area console row below). The image is the REAL still
 *  (public/media, ≤960×540 working res) decoded to scene-linear, graded
 *  through the [clip → timeline] stack (curve LUT + qualifier composed in
 *  the pixel loop), encoded, drawn — and the scope tabs draw WFM/Parade/
 *  Vector/Histogram traces from the exact frame at the 10fps throttle.
 *  Scrub the playhead: the grade follows the clip. */
export const GradedViewer: StoryObj = {
  name: 'GradedViewer — canvas + scopes console',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot
        patch={{
          ...COLOR_BOOT,
          playhead: 16, // el-2 (Marina interview) under the playhead
          colorScopesState: 'open',
          mockGrades: {
            'el-2': { ...DEFAULT_GRADE, shHue: 210, shAmount: 0.12, temperature: 12, contrast: 1.08, saturation: 8, curves: { master: [{ x: 0, y: 0 }, { x: 0.35, y: 0.42 }, { x: 1, y: 0.92 }] } },
            timeline: { ...DEFAULT_GRADE, temperature: 6 },
          },
        }}
      />
      <PanelBox width={900} height={600}>
        <div className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1">
            <Viewer duration={30} />
          </div>
          <div className="flex h-[220px] min-h-0 shrink-0">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <TimelineCompact />
            </div>
            <div className="flex min-h-0 min-w-[320px] flex-1">
              <ScopesDock />
            </div>
          </div>
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

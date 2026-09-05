/* Timeline stories — spec 05/18 surfaces: the full timeline block, the
   blocks clip-style dimension, clip anatomy states rendered solo, the
   ruler with markers, the R15-T1 CapCut ruler tiers, and the R15-T5 snap
   indicator driven by a real (programmatic) clip drag. Timeline itself is
   fully store-driven (needs VariantProvider only — supplied by the global
   decorator). */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Timeline } from '../components/timeline/Timeline';
import { Clip } from '../components/timeline/Clip';
import { Ruler } from '../components/timeline/Ruler';
import { useUi, trackHeights } from '../state/useUiStore';
import { sceneDuration, type ElementJSON, type TrackJSON } from '../lib/mockData';
import { DEFAULT_VARIANT } from '../lib/variants';
import { StoreBoot, VariantBoot } from './decorators';

const meta: Meta = {
  title: 'Timeline',
};

export default meta;

/** Default: filmstrip clips, readout headers, scene 1 "Rough Cut v3". */
export const Default: StoryObj = {
  name: 'Timeline — default',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <>
      <StoreBoot />
      <div className="flex h-screen flex-col bg-app">
        <div className="mono flex h-[40px] shrink-0 items-center px-3 text-[11px] text-tmuted">
          ( timeline toolbar + scene tabs sit here in the real shell )
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <Timeline />
        </div>
      </div>
    </>
  ),
};

/** data-clipstyle="blocks": compact lanes (40/34/28px), flat clip bodies. */
export const BlocksStyle: StoryObj = {
  name: 'Timeline — blocks style',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <>
      <StoreBoot />
      <VariantBoot variant={{ ...DEFAULT_VARIANT, clipStyle: 'blocks' }} />
      <div className="flex h-screen flex-col bg-app">
        <div className="mono flex h-[40px] shrink-0 items-center px-3 text-[11px] text-tmuted">
          ( timeline toolbar + scene tabs sit here in the real shell )
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <Timeline />
        </div>
      </div>
    </>
  ),
};

/* ---- clip anatomy states (Clip rendered directly with mock props) --------- */

const mainLane: TrackJSON = {
  id: 'demo-main', kind: 'main', name: 'V1', badge: 'V1',
  muted: false, solo: false, locked: false, visible: true,
  elements: [],
};
const audioLane: TrackJSON = {
  id: 'demo-a1', kind: 'audio', name: 'A1', badge: 'A1',
  muted: false, solo: false, locked: false, visible: true, waveform: true,
  elements: [],
};
const lockedAudioLane: TrackJSON = {
  id: 'demo-a2', kind: 'audio', name: 'A2 (locked)', badge: 'A2',
  muted: false, solo: false, locked: true, visible: true, waveform: true,
  elements: [],
};

/* pxPerSec 46 (store default), snap targets on whole seconds */
const SNAP_TARGETS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const videoEls: ElementJSON[] = [
  { id: 'demo-sel', type: 'video', trackId: 'demo-main', name: 'beach_wide — selected', startTime: 0.5, duration: 4.5, sourceStart: 0, mediaId: 'm-01' },
  { id: 'demo-offline', type: 'video', trackId: 'demo-main', name: 'waves_closeup — offline', startTime: 6.5, duration: 4, sourceStart: 0, mediaId: 'm-04' },
  { id: 'demo-fx', type: 'video', trackId: 'demo-main', name: 'drone_launch — F badge', startTime: 12, duration: 5, sourceStart: 0, mediaId: 'm-03', effects: [{ id: 'demo-fx-1', name: 'Vignette', enabled: true }] },
  { id: 'demo-link', type: 'video', trackId: 'demo-main', name: 'interview — linked, 50%', startTime: 18, duration: 5, sourceStart: 0, mediaId: 'm-02', speed: 0.5, linkedTo: 'demo-audio-1' },
];
const audioEls: ElementJSON[] = [
  { id: 'demo-audio-1', type: 'audio', trackId: 'demo-a1', name: 'ocean_ambience — fade in/out', startTime: 0, duration: 10, sourceStart: 0, mediaId: 'm-06', volume: 0.4, audioFadeIn: 1.2, audioFadeOut: 1.5 },
];
const lockedEls: ElementJSON[] = [
  { id: 'demo-locked', type: 'audio', trackId: 'demo-a2', name: 'interview_marina — locked track', startTime: 3, duration: 8, sourceStart: 0, mediaId: 'm-07', volume: 0.8 },
];

function Lane({ label, track, els, kind }: { label: string; track: TrackJSON; els: ElementJSON[]; kind: TrackJSON['kind'] }) {
  const pxPerSec = useUi((s) => s.pxPerSec);
  const h = trackHeights(kind, 'filmstrip'); // this story previews the spec-05 canonical geometry
  return (
    <div>
      <div className="mono mb-1 text-[11px] text-tmuted">{label}</div>
      <div
        className="relative w-full border-b border-hairline"
        style={{ height: h, background: kind === 'main' ? 'var(--lane-video)' : kind === 'audio' ? 'var(--lane-audio)' : 'var(--lane-overlay)' }}
      >
        {els.map((el) => (
          <Clip key={el.id} el={el} track={track} pxPerSec={pxPerSec} laneHeight={h} snapTargets={SNAP_TARGETS} />
        ))}
      </div>
    </div>
  );
}

/** One lane per state: selected / offline / effect badge / linked+speed /
 *  audio fades / locked-track stripes (spec 05 §7.3, §9, §12.2-3). */
export const ClipStates: StoryObj = {
  name: 'Clip states',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot patch={{ selection: ['demo-sel'] }} />
      <div className="flex flex-col gap-4 p-4">
        <Lane label="V1 · main — selected, offline, F-badge, linked+50%" track={mainLane} els={videoEls} kind="main" />
        <Lane label="A1 · audio — fade ramps" track={audioLane} els={audioEls} kind="audio" />
        <Lane label="A2 · audio — locked track (stripes)" track={lockedAudioLane} els={lockedEls} kind="audio" />
      </div>
    </>
  ),
};

/* ---- ruler + markers -------------------------------------------------------- */

function RulerStory() {
  const scene = useUi((s) => s.scenes.find((x) => x.id === s.activeSceneId)!);
  const pxPerSec = useUi((s) => s.pxPerSec);
  const playhead = useUi((s) => s.playhead);
  return (
    <div className="w-full">
      <Ruler scene={scene} duration={sceneDuration(scene)} pxPerSec={pxPerSec} playhead={playhead} contentW={(sceneDuration(scene) + 4) * pxPerSec} view={{ scrollLeft: 0, viewportW: 1200 }} />
      {/* a lane-ish backdrop so the ruler reads in context */}
      <div className="h-[60px] w-full border-b border-hairline" style={{ background: 'var(--lane-video)' }} aria-hidden="true" />
    </div>
  );
}

/** 44px readout zone, in/out brackets, loop shading, 4 colored markers. */
export const RulerMarkers: StoryObj = {
  name: 'Ruler + markers',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot />
      <RulerStory />
    </>
  ),
};

/* ---- R15 T1: the CapCut ruler tiers (lib/rulerTiers) ---------------------- */

function TierRuler({ pps, caption }: { pps: number; caption: string }) {
  const scene = useUi((s) => s.scenes.find((x) => x.id === s.activeSceneId)!);
  const playhead = useUi((s) => s.playhead);
  const dur = sceneDuration(scene);
  return (
    <div className="flex flex-col gap-1">
      <div className="mono text-[11px] text-tmuted">{caption}</div>
      {/* overflow-hidden: the ruler's own width is the full content width —
          ticks are VIRTUALIZED to [scrollLeft − buffer, scrollLeft + viewport
          + buffer], so only this window of DOM exists (view prop, 1000 px) */}
      <div className="w-full overflow-hidden border-b border-hairline">
        <Ruler
          scene={scene}
          duration={dur}
          pxPerSec={pps}
          playhead={playhead}
          contentW={(dur + 4) * pps}
          view={{ scrollLeft: 0, viewportW: 1000 }}
        />
      </div>
    </div>
  );
}

/** The adaptive tier tables at three zooms (label spacing ≥ 120 px, tick ≥ 18
 *  px, tick divides label evenly; ε 0.0001): at 46 px/s labels land on the
 *  3-second grid (MM:SS at second boundaries); at 120 px/s the label grid
 *  tightens to 1 s with tick = label (no frame interval divides 1 s evenly
 *  AND clears the 18 px floor); at 240 px/s labels sit on the 15-FRAME grid —
 *  between second boundaries they render in frames (15f, 6f, 21f, …) with
 *  MM:SS only where the grid crosses a whole second (00:05). Same ruler,
 *  same markers, only the tier math changes. */
export const RulerTiers: StoryObj = {
  name: 'Ruler — CapCut tiers (46 / 120 / 240 px/s)',
  parameters: { layout: 'padded' },
  render: () => (
    <>
      <StoreBoot />
      <div className="flex flex-col gap-4">
        <TierRuler pps={46} caption="46 px/s — labels 3 s (MM:SS) · ticks 1 s" />
        <TierRuler pps={120} caption="120 px/s — labels 1 s · tick = label (no even divider ≥ 18 px)" />
        <TierRuler pps={240} caption="240 px/s — labels 15 frames (Xf between MM:SS seconds) · ticks 5 frames" />
      </div>
    </>
  ),
};

/* ---- R15 T5: the snap indicator, driven by a REAL clip drag ---------------- */

/** The play step performs the actual gesture on the real Timeline: presses
 *  el-5 (the T1 text clip), drags it 6.8 s right, and STOPS mid-gesture (no
 *  pointerup) with the preview sitting inside the 10 px snap tolerance of the
 *  mk-3 marker (15.5 s) — the drag seam reports snapAt, and the Timeline
 *  holds the 2 px accent/40 indicator line at 15.5 s (z 40: above the drag
 *  ghosts 10, below the playhead 100). Synthetic PointerEvents can't take
 *  pointer capture (inactive pointer id — the Clip's capture is guarded,
 *  R15-A5), so the gesture ends on the next real interaction: moving the
 *  mouse over the clip with no button cancels it (buttons-bitmask), any
 *  click/release commits. */
export const SnapIndicator: StoryObj = {
  name: 'Timeline — snap indicator (mid-drag)',
  parameters: { layout: 'fullscreen' },
  play: async ({ canvasElement }) => {
    const clip = canvasElement?.querySelector<HTMLElement>('[data-testid="clip-el-5"]');
    if (!clip) return;
    const box = clip.getBoundingClientRect();
    const sx = box.left + 20;
    const sy = box.top + box.height / 2;
    const ex = sx + 6.75 * 46 + 6; // 8.75 s + 6.75 s + 6 px → inside the 10 px tol of mk-3 @ 15.5 s
    const tick = () => new Promise<void>((r) => { setTimeout(r, 0); });
    clip.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, button: 0, bubbles: true, clientX: sx, clientY: sy }));
    await tick(); // discrete-event flush lands the pending gesture state
    // ONE qualifying move: activates the gesture past the 5 px threshold AND
    // captures the snap in the same event (start+move fire together — R15-T3b)
    clip.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, buttons: 1, bubbles: true, clientX: ex, clientY: sy }));
    await tick();
  },
  render: () => (
    <>
      <StoreBoot patch={{ selection: ['el-5'] }} />
      <div className="flex h-screen flex-col bg-app">
        <div className="mono flex h-[40px] shrink-0 items-center px-3 text-[11px] text-tmuted">
          ( timeline toolbar + scene tabs sit here in the real shell — el-5 is held MID-DRAG at the
          mk-3 marker: snap indicator 2 px accent/40 @ 15.5 s, ghost + TC bubble live · move the
          mouse over the clip with no button to cancel, or click to commit )
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <Timeline />
        </div>
      </div>
    </>
  ),
};

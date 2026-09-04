/* Chrome stories — the persistent shell regions from spec 18 §3/§4: the app
   toolbar (§4.1), the bottom page dock (§4.8), the timeline toolbar (§4.5),
   scene tabs (§4.6), and the 160px track-header column (§4.7). The bars are
   edge-to-edge in the real shell, so they render solo in fixed 1200px frames
   with a mono caption; the Effects library has no solo form (EffectsPanel is
   internal to AppShell.tsx), so it gets the one full-shell story at the
   bottom. Store state is booted per story via StoreBoot patches. */

import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toolbar2 } from '../components/shell/Toolbar2';
import { AppDock } from '../components/shell/AppDock';
import { TimelineToolbar } from '../components/timeline/TimelineToolbar';
import { SceneTabs } from '../components/timeline/SceneTabs';
import { TrackHeader } from '../components/timeline/TrackHeader';
import { trackHeights } from '../state/useUiStore';
import { project, type TrackJSON } from '../lib/mockData';
import { FullShell, StoreBoot, type UiPatch } from './decorators';

const meta: Meta = {
  title: 'Chrome',
  parameters: { layout: 'padded' },
};

export default meta;

/* ---- shared scaffolding ----------------------------------------------------- */

/** Fixed-width frame for the edge-to-edge chrome bars: the real shell
 *  stretches these regions between its splitters, so stories pin 1200px +
 *  a hairline border + a mono caption, leaving the bar's own height / flex /
 *  overflow logic as the thing under review. */
function Bar({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="mono text-[11px] text-tmuted">{label}</div>
      <div className="w-[1200px] overflow-hidden border border-hairline">{children}</div>
    </div>
  );
}

/* ---- app toolbar (spec 18 §4.1) --------------------------------------------- */

function ToolbarStory({ patch }: { patch?: UiPatch }) {
  return (
    <>
      <StoreBoot patch={patch} />
      <Bar label="toolbar2 — traffic dots · panel toggles · project title · inspector/fullscreen">
        <Toolbar2 />
      </Bar>
    </>
  );
}

/** Edit page with every panel toggle pressed — the fully-active chrome state
 *  (the store default keeps effects off; this pins it on so the pressed
 *  styling of all three toolbtns is screenshottable in one frame). */
export const ToolbarDefault: StoryObj = {
  name: 'Toolbar — default (Edit page, all panels on)',
  render: () => <ToolbarStory patch={{ page: 'edit', panels: { mediaPool: true, effects: true, inspector: true } }} />,
};

/** All three toggles off: unpressed toolbtn styling, and the centered project
 *  title cluster must keep centering with nothing flanking it but the dots. */
export const ToolbarPanelsOff: StoryObj = {
  name: 'Toolbar — all panels toggled off',
  render: () => <ToolbarStory patch={{ panels: { mediaPool: false, effects: false, inspector: false } }} />,
};

/** Audio page: the strip is page-invariant by design (page swaps live in the
 *  mainbody + dock, not the toolbar) — regression guard against accidental
 *  page-coupled chrome. */
export const ToolbarAudioPage: StoryObj = {
  name: 'Toolbar — audio page (page-invariant)',
  render: () => <ToolbarStory patch={{ page: 'audio' }} />,
};

/* ---- bottom page dock (spec 18 §4.8) ---------------------------------------- */

function DockStory({ patch }: { patch: UiPatch }) {
  return (
    <>
      <StoreBoot patch={patch} />
      <Bar label="app dock — brand · 4 pages · cheat/home/settings (42px)">
        <AppDock />
      </Bar>
    </>
  );
}

/** Edit active (⌘1): accent underline + tprimary on the active tab. The
 *  default resolve theme is icon-only — labels come with studio/light (see
 *  Shell/Variants), aria-label keeps the name either way. */
export const DockEdit: StoryObj = {
  name: 'App dock — Edit page',
  render: () => <DockStory patch={{ page: 'edit' }} />,
};

/** Color active (⌘2): same geometry, only the underline moves. */
export const DockColor: StoryObj = {
  name: 'App dock — Color page',
  render: () => <DockStory patch={{ page: 'color' }} />,
};

/** Audio active, patched with the full enterAudioFocus entry state (page +
 *  mixer full + lane boost + strip focus) — what the ⌘4 dock click actually
 *  lands in, not just the raw page flag. */
export const DockAudio: StoryObj = {
  name: 'App dock — Audio (audio focus)',
  render: () => (
    <DockStory patch={{ page: 'audio', mixerState: 'full', audioLaneBoost: true, stripFocus: 'tr-audio-1' }} />
  ),
};

/** Deliver active (⌘3 — MOCK DRIFT, registered: spec 16 §3.8/App A bind ⌘3 = Effects workspace, Deliver unbound; spec 18 dock tooltips carry the same drift, PLAN item 14): export/handoff tab pressed. */
export const DockDeliver: StoryObj = {
  name: 'App dock — Deliver page',
  render: () => <DockStory patch={{ page: 'deliver' }} />,
};

/* ---- timeline toolbar (spec 18 §4.5) ----------------------------------------- */

function TlToolbarStory({ patch }: { patch?: UiPatch }) {
  return (
    <>
      <StoreBoot patch={patch} />
      <Bar label="timeline toolbar — tools · snap/link/lock · markers · zoom · mixer · master">
        <TimelineToolbar />
      </Bar>
    </>
  );
}

/** Store defaults: selection tool radio-checked, snap + link on, lock off,
 *  mixer collapsed, master live at 78% with the always-on micro-meter. */
export const TimelineToolbarDefault: StoryObj = {
  name: 'Timeline toolbar — default (select, snap on)',
  render: () => <TlToolbarStory />,
};

/** Blade tool radio-checked + lock-all pressed — the destructive pairing;
 *  eyeball the toggled-state contrast vs the idle icons and that the radio
 *  only ever has one checked member. */
export const TimelineToolbarBladeLocked: StoryObj = {
  name: 'Timeline toolbar — blade tool + lock all',
  render: () => <TlToolbarStory patch={{ tool: 'blade', lockAll: true }} />,
};

/** mixerState 'full': the mixer-dock button in its toggled state while the
 *  rest of the cluster stays default (the dock itself has its own Mixer
 *  stories — this one reviews the toolbar-side affordance only). */
export const TimelineToolbarMixerFull: StoryObj = {
  name: 'Timeline toolbar — mixer dock full',
  render: () => <TlToolbarStory patch={{ mixerState: 'full' }} />,
};

/** Master muted: VolumeX icon + toggled styling, the micro-meter pinned dark
 *  (db −60), volume slider still rendered and operable at 78%. */
export const TimelineToolbarMasterMuted: StoryObj = {
  name: 'Timeline toolbar — master muted',
  render: () => <TlToolbarStory patch={{ masterMuted: true }} />,
};

/* ---- scene tabs (spec 18 §4.6) ----------------------------------------------- */

/** Default tab strip: two scenes, sc-1 active with its seeded dirty dot, the
 *  + create affordance. Close buttons are live — sc-1 carries clips, so it
 *  routes through the confirm dialog (ConfirmProvider comes with the global
 *  decorator). */
export const SceneTabsDefault: StoryObj = {
  name: 'Scene tabs — default (2 scenes, first active)',
  render: () => (
    <>
      <StoreBoot />
      <Bar label="scene tabs — 26px strip between timeline toolbar and lanes">
        <SceneTabs />
      </Bar>
    </>
  ),
};

/** Second scene active AND dirty (scenes patched with a shallow clone — no
 *  store mutation in render): the underline and the dirty dot both sit on
 *  tab 2 while sc-1 keeps its seeded dot. */
export const SceneTabsSecondDirty: StoryObj = {
  name: 'Scene tabs — second scene active + dirty',
  render: () => (
    <>
      <StoreBoot
        patch={{
          activeSceneId: 'sc-2',
          scenes: project.scenes.map((sc) => (sc.id === 'sc-2' ? { ...sc, dirty: true } : sc)),
        }}
      />
      <Bar label="scene tabs — 26px strip between timeline toolbar and lanes">
        <SceneTabs />
      </Bar>
    </>
  ),
};

/* ---- track-header column (spec 05 §10 / 18 §4.7) ------------------------------ */

/* Fake tracks in the Timeline.stories DEMO_TRACKS tradition: the header flags
   live on the track object itself (elements empty — headers never read them),
   and sceneId points at the real sc-1 so M/S/L clicks route into the real
   undoable toggleTrackCmd (a no-op for unknown ids, never a crash). */
const DEMO_TRACKS: TrackJSON[] = [
  { id: 'demo-v1', kind: 'main', name: 'V1', badge: 'V1', muted: false, solo: false, locked: false, visible: true, elements: [] },
  { id: 'demo-a1', kind: 'audio', name: 'A1', badge: 'A1', muted: false, solo: true, locked: false, visible: true, waveform: true, elements: [] },
  { id: 'demo-a2', kind: 'audio', name: 'A2', badge: 'A2', muted: false, solo: false, locked: true, visible: true, waveform: true, elements: [] },
  { id: 'demo-t1', kind: 'overlay', name: 'Text 1', badge: 'T1', muted: false, solo: false, locked: false, visible: true, elements: [] },
];

/** spec-05 canonical filmstrip lane heights. */
const filmstripH = (kind: TrackJSON['kind']) => trackHeights(kind, 'filmstrip');

/** Mirrors Timeline's laneHeight with audioLaneBoost on (design doc §3.2):
 *  audio ×1.6, main/overlay compressed — 96 / 40 / 28px. */
const boostedH = (kind: TrackJSON['kind']) => {
  const base = trackHeights(kind, 'filmstrip');
  return kind === 'audio' ? Math.round(base * 1.6) : kind === 'main' ? Math.min(base, 40) : Math.min(base, 28);
};

/** The fixed 160px column the shell gives TrackHeader, with the filler below
 *  the headers that keeps the column background solid (Timeline's column,
 *  minus its 44px timecode zone). */
function HeaderColumn({ laneHeight, label }: { laneHeight: (kind: TrackJSON['kind']) => number; label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="mono text-[11px] text-tmuted">{label}</div>
      <div className="flex h-[400px] w-[160px] flex-col overflow-hidden border border-hairline bg-raised">
        {DEMO_TRACKS.map((t) => (
          <TrackHeader key={t.id} track={t} sceneId="sc-1" height={laneHeight(t.kind)} />
        ))}
        <div className="min-h-0 flex-1 bg-raised" aria-hidden="true" />
      </div>
    </div>
  );
}

/** Tall two-row headers at spec-05 filmstrip heights (V1 80 / audio 60):
 *  V1 default, A1 solo (S pressed + headphones glyph), A2 locked, T1 text
 *  (visibility eye, no waveform button) — one column, zero horizontal
 *  overflow, name truncation + meta line per kind. */
export const TrackHeadersColumn: StoryObj = {
  name: 'Track headers — column (V1 / A1 solo / A2 locked / T1)',
  render: () => (
    <>
      <StoreBoot />
      <HeaderColumn
        laneHeight={filmstripH}
        label="track headers — 160px column, filmstrip heights (44px tc zone sits above in the shell)"
      />
    </>
  ),
};

/** Audio focus: page 'audio' adds the G-layer minifader row under every
 *  audio header and boosts lane heights (audio 96 / main 40 / overlay 28).
 *  focusedTrackId is patched to pin the ⌘M / ↑/↓ shortcut target — TrackHeader
 *  itself renders no focus chrome (it reads only page + mixer), so this story
 *  is where that honest non-affordance gets eyeballed. */
export const TrackHeadersAudioFocus: StoryObj = {
  name: 'Track headers — audio focus (minifaders)',
  render: () => (
    <>
      <StoreBoot patch={{ page: 'audio', focusedTrackId: 'demo-a1' }} />
      <HeaderColumn
        laneHeight={boostedH}
        label="track headers — audio-focus lane boost (main 40 / audio 96 / overlay 28)"
      />
    </>
  ),
};

/* ---- full shell: effects library (spec 18 §4.1) -------------------------------- */

/** The Effects library has no solo form — EffectsPanel is internal to
 *  AppShell.tsx — so this full-shell story is its review surface: all three
 *  toolbar toggles on, 220px library column docked between the media pool and
 *  the viewer, categories + drag affordances against the real splitters.
 *  (Otherwise the default-shell review is 'Shell/AppShell — Full Shell — Edit'.) */
export const FullShellEffectsPanel: StoryObj = {
  name: 'Full Shell — Effects panel on',
  parameters: { layout: 'fullscreen' },
  render: () => <FullShell patch={{ panels: { mediaPool: true, effects: true, inspector: true } }} />,
};

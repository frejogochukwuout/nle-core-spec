/* deliverViewStore — R24-W4 (DESIGN-R24 §3 W4 item 4, F5's P2): the deliver
   page's VIEW state lifted out of DeliverPage's component-local useState
   ("deliver jobs/showQueue component-local useState vs the store's
   unmount-survival law"). A NEW module-level zustand store (plain create(),
   the stills/sourceRanges/stripArm unmount-survival precedents — view state
   that must outlive its surface) — NOT a useUiStore edit for the jobs (W2–W5
   never touch it for THOSE; the disjoint-file law).
   R25-W5 (DESIGN-R25 §1 R18/R19 / §3 W5): the store's deliver mandate
   WIDENS — the RENDER SETTINGS (preset/codec/resolution/range/bundleMedia)
   move in too. Reason: the export summary moved to the CONSOLE-ROW Export
   tab (th_mtzp4arw — "kept in a separate panel the same place we do mixer
   console etc. … it is not inspection"), and that panel is an AppShell-
   rendered SIBLING tree of DeliverPage — component-local useState cannot be
   shared across the two trees, so the settings join the store the jobs
   already live in (the preset tiles + the format select + the summary rows
   are ONE choice — they can never disagree). Everything here stays VIEW
   state: never snapshotted, never undo history, reset by resetDeliverView.

   What lives here:
   - `jobs` — the render queue rows (the §4.2/§6.4 fixture: one permanently
     failed row + three done; the queue BOOTS IDLE — no running row, the
     video preview owns the center view, #88). Queued rows are minted by
     queueExport and carried to completion by the store-owned mock timer.
   - `showQueue` — the center-view flag, and its SINGLE-WRITER law: the
     queue toggle is honest mid-render (F5's P3 — the old center-view
     `renderActive || showQueue` read made the toggle a silent no-op while
     a render walked: aria-pressed flipped but the view could not leave the
     queue). Now `showQueue` alone decides the center view; a render may be
     collapsed to the preview and it keeps walking in the store.
   - the RENDER SETTINGS (R25-W5): preset (the preset-tile/format-select
     choice, 'json' = the Custom JSON interchange export), codec (the video
     master's codec row), resolution + range (feed the queued row's name),
     bundleMedia (the sidecar chip) — one `setExportSettings` writer, and
     they SURVIVE page switches like the jobs (the choice you made is still
     selected when you come back).
   - the MOCK RENDER TIMER — a module-level 500ms interval that walks the
     queue even while the page is unmounted (the survival pin) and
     self-stops when nothing is queued/running: one tick advances the FIRST
     queued/running row (FIFO order) — queued → running +25%/tick → done
     with a 'just now' timestamp, 4 ticks per job. queueExport arms it;
     completion (or resetDeliverView) disarms it.

   Test seams: `resetDeliverView()` restores the pristine fixture (jobs +
   showQueue + the render settings + the id counter) and DISARMS the timer;
   `__mockTimerActive()` is the containment probe — every test file that
   touches this store resets it in file-level beforeEach/afterEach, and
   those resets must be act() WRAPPED (see DeliverPage.test's header note:
   RTL cleanup registers LAST, so the file-level hooks run while the
   previous test's tree is still mounted — a bare setState there is the
   act() warning storm). */
import { create } from 'zustand';

export type DeliverJobState = 'done' | 'running' | 'queued' | 'failed';

/* R25-W5 (DESIGN-R25 §1 R19 / §3 W5; thread th_mtzp4xeb "add a custom JSON
   format too"): the preset ids gain 'json' — the Custom JSON interchange
   export. The union lives HERE (the store types the choice); DeliverPage's
   PRESETS table is the id's render-side truth. */
export type DeliverPresetId = 'fcpxml' | 'master' | 'frame' | 'json';
export type DeliverResolutionId = '1080' | '2160';
export type DeliverRangeMode = 'inout' | 'full';

export type DeliverJob = {
  id: string;
  name: string;
  progress: number;
  state: DeliverJobState;
  time: string;
  bundle?: boolean;
};

/** §4.2 error-state fixture (R14): one permanently-failed row (the Retry
    affordance's home) + three done rows. R22 W5: NO running row by default —
    the queue boots IDLE and the center shows the preview (#88). */
const JOBS: DeliverJob[] = [
  { id: 'j-0', name: 'Beach Doc — v2 master.mp4', progress: 62, state: 'failed', time: '12m ago' },
  { id: 'j-1', name: 'Beach Doc — v3 master.mp4', progress: 100, state: 'done', time: '2m ago' },
  { id: 'j-2', name: 'Beach Doc — v3.fcpxml', progress: 100, state: 'done', time: '2m ago' },
  { id: 'j-3', name: 'Interview selects master.mp4', progress: 100, state: 'done', time: '26m ago' },
];

/* the mock render cadence: 500ms ticks, +25% per tick — 4 ticks walk one
   queued row to done (running 25/50/75 → 100 'just now'). */
const TICK_MS = 500;
const TICK_PROGRESS = 25;
const JUST_NOW = 'just now';
/** queued-row ids mint from the fixture's tail; the counter resets with the
    store (test determinism — the pristine mount always queues j-4 first). */
const FIRST_MINTED_ID = JOBS.length;

const initialJobs = () => JOBS.map((j) => ({ ...j }));

/** the export-settings patch — the ONE writer surface (the page's selects,
   the preset tiles, and any future surface all funnel through here). */
export interface ExportSettingsPatch {
  preset?: DeliverPresetId;
  codec?: string;
  resolution?: DeliverResolutionId;
  range?: DeliverRangeMode;
  bundleMedia?: boolean;
}

interface DeliverView {
  jobs: DeliverJob[];
  /** the center-view flag — SINGLE WRITER for which surface the deliver
   *  mainbody's center renders (queue vs preview). */
  showQueue: boolean;
  /* ---- R25-W5: the render settings (lifted from DeliverPage's local
   *  useState so the console-row Export panel — an AppShell-rendered sibling
   *  tree — reads the SAME choice the deliver inspector edits). View state;
   *  the queued-row name + the summary rows are its readers. */
  /** the selected export preset ('json' = the Custom JSON interchange export —
   *  the R25-W5 real-download preset). */
  preset: DeliverPresetId;
  /** the video master's codec row (only meaningful while preset='master'). */
  codec: string;
  /** 1080p/2160p — feeds the queued row's name + the summary's size row. */
  resolution: DeliverResolutionId;
  /** In–Out vs Full — feeds the queued row's name. */
  range: DeliverRangeMode;
  /** sidecar media chip on the queued row (spec 10 round-trip). */
  bundleMedia: boolean;
  /** append a queued row (name + bundle chip from the page's render
   *  settings) + auto-show the queue view (#89: queueing an export flips
   *  the center) + arm the mock timer. */
  queueExport: (job: { name: string; bundle?: boolean }) => void;
  /** the center-view toggle — ALWAYS honest, mid-render included (F5 P3:
   *  no silent no-op; the render keeps walking in the store either way). */
  toggleShowQueue: () => void;
  /** the export settings' one writer (a plain set — view state, never a
   *  history entry; the settings SURVIVE page switches like the jobs). */
  setExportSettings: (patch: ExportSettingsPatch) => void;
  /** test seam: pristine fixture + default render settings + disarmed
   *  timer (containment contract — mirror of setup.ts's useUi reset; files
   *  that touch this store call it act-wrapped in file-level
   *  beforeEach/afterEach). */
  resetDeliverView: () => void;
}

/* ---- the store-owned mock timer (module-level — survives unmounts) ---- */

let mockTimer: ReturnType<typeof setInterval> | null = null;
let nextId = FIRST_MINTED_ID;

const stopMockTimer = () => {
  if (mockTimer === null) return;
  clearInterval(mockTimer);
  mockTimer = null;
};

/** the tick: FIFO — the FIRST queued/running row advances. `queued` flips to
 *  running at +25%; a running row climbs +25% per tick and lands `done` at
 *  100 with the 'just now' stamp. Nothing left to walk → self-stop. */
const tick = () => {
  const { jobs } = useDeliverView.getState();
  const idx = jobs.findIndex((j) => j.state === 'queued' || j.state === 'running');
  if (idx === -1) {
    stopMockTimer(); // self-stop at completion (the probe reads false)
    return;
  }
  const job = jobs[idx];
  const progress = job.progress + TICK_PROGRESS;
  const done = progress >= 100;
  const advanced: DeliverJob = done
    ? { ...job, progress: 100, state: 'done', time: JUST_NOW }
    : { ...job, progress, state: 'running', time: '' };
  const nextJobs = jobs.map((j, i) => (i === idx ? advanced : j));
  if (!nextJobs.some((j) => j.state === 'queued' || j.state === 'running')) stopMockTimer();
  useDeliverView.setState({ jobs: nextJobs });
};

const ensureMockTimer = () => {
  if (mockTimer !== null) return;
  mockTimer = setInterval(tick, TICK_MS);
};

/** containment probe (test-only): is the mock render interval armed? Every
 *  reset must disarm it — a walking timer leaks state into later tests. */
export const __mockTimerActive = () => mockTimer !== null;

export const useDeliverView = create<DeliverView>((set) => ({
  jobs: initialJobs(),
  showQueue: false,
  /* R25-W5: the render settings' pristine values — the R24-W4 defaults
     DeliverPage's local useState used to boot with (fcpxml master-of-record,
     h264, 1080p, In–Out, bundle ON). */
  preset: 'fcpxml',
  codec: 'h264',
  resolution: '1080',
  range: 'inout',
  bundleMedia: true,
  queueExport: ({ name, bundle }) => {
    const id = `j-${nextId}`;
    nextId += 1;
    ensureMockTimer();
    set((s) => ({
      jobs: [...s.jobs, { id, name, progress: 0, state: 'queued', time: '', bundle }],
      showQueue: true, // #89: queueing flips the center to the queue
    }));
  },
  toggleShowQueue: () => set((s) => ({ showQueue: !s.showQueue })),
  setExportSettings: (patch) => set(patch),
  resetDeliverView: () => {
    stopMockTimer();
    nextId = FIRST_MINTED_ID;
    set({
      jobs: initialJobs(),
      showQueue: false,
      preset: 'fcpxml',
      codec: 'h264',
      resolution: '1080',
      range: 'inout',
      bundleMedia: true,
    });
  },
}));

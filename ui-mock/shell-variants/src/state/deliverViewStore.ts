/* deliverViewStore — R24-W4 (DESIGN-R24 §3 W4 item 4, F5's P2): the deliver
   page's VIEW state lifted out of DeliverPage's component-local useState
   ("deliver jobs/showQueue component-local useState vs the store's
   unmount-survival law"). A NEW module-level zustand store (plain create(),
   the stills/sourceRanges/stripArm unmount-survival precedents — view state
   that must outlive its surface) — NOT a useUiStore edit (W2–W5 never touch
   it; the disjoint-file law).

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
   - the MOCK RENDER TIMER — a module-level 500ms interval that walks the
     queue even while the page is unmounted (the survival pin) and
     self-stops when nothing is queued/running: one tick advances the FIRST
     queued/running row (FIFO order) — queued → running +25%/tick → done
     with a 'just now' timestamp, 4 ticks per job. queueExport arms it;
     completion (or resetDeliverView) disarms it.

   Test seams: `resetDeliverView()` restores the pristine fixture (jobs +
   showQueue + the id counter) and DISARMS the timer; `__mockTimerActive()`
   is the containment probe — every test file that touches this store resets
   it in file-level beforeEach/afterEach, and those resets must be act()
   WRAPPED (see DeliverPage.test's header note: RTL cleanup registers LAST,
   so the file-level hooks run while the previous test's tree is still
   mounted — a bare setState there is the act() warning storm). */
import { create } from 'zustand';

export type DeliverJobState = 'done' | 'running' | 'queued' | 'failed';

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

interface DeliverView {
  jobs: DeliverJob[];
  /** the center-view flag — SINGLE WRITER for which surface the deliver
   *  mainbody's center renders (queue vs preview). */
  showQueue: boolean;
  /** append a queued row (name + bundle chip from the page's render
   *  settings) + auto-show the queue view (#89: queueing an export flips
   *  the center) + arm the mock timer. */
  queueExport: (job: { name: string; bundle?: boolean }) => void;
  /** the center-view toggle — ALWAYS honest, mid-render included (F5 P3:
   *  no silent no-op; the render keeps walking in the store either way). */
  toggleShowQueue: () => void;
  /** test seam: pristine fixture + disarmed timer (containment contract —
   *  mirror of setup.ts's useUi reset; files that touch this store call it
   *  act-wrapped in file-level beforeEach/afterEach). */
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
  resetDeliverView: () => {
    stopMockTimer();
    nextId = FIRST_MINTED_ID;
    set({ jobs: initialJobs(), showQueue: false });
  },
}));

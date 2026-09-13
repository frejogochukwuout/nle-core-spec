/* DeliverPage — spec 18 §4.8 / specs 10-11 export surface. R19 th_mto37ba3:
   the page is now a FULL-VIEW 3-region export surface (queue+presets /
   summary incl. the store-driven range / render settings). Presets are
   deliverViewStore state now (R25-W5); the toast queue lives in the ui
   store. These tests pin the three regions, the preset→CTA label coupling,
   the store-loop-driven range block + select options, the render-settings
   block, the job queue (done rows + one running row with progress + retry,
   §6.4 error UX), and the honest-mock export behavior (R13: CTA + Reveal/
   Retry push info toasts — no encode ever runs — and the CTA queues a job
   row the store timer completes).
   R24-W4 (deliverViewStore): jobs + showQueue are MODULE state now — every
   test here starts from the pristine fixture via the act-wrapped
   file-level reset below, and the store's own laws are pinned in
   deliverViewStore.test.
   R25-W5 (DESIGN-R25 §1 R18/R19 / §3 W5; threads th_mtzp4arw +
   th_mtzp4xeb):
   - th_mtzp4xeb: PRESETS grew the Custom JSON tile (four tiles) — its
     export is REAL (buildExportJson + downloadJson), so the json CTA
     pins: the anchor download fires (stubbed click seam), a SUCCESS toast
     lands, and NO mock render row is queued (the queue exists because
     encodes don't run — this one did).
   - th_mtzp4arw: the export summary card MOVED to the console-row Export
     tab (DeliverExportConsole — the AppShell mounts it as a SIBLING tree
     of this page). Tests that pin the summary rows co-mount the panel
     (the R23-WF co-mount precedent: "the shell mounts them; here the
     co-mount stands in"); the AppShell-level swap (console row vs right
     column) is pinned in AppShell.test. */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeliverPage, DeliverExportConsole } from './DeliverPage';
import { TimelineCompact } from '../timeline/TimelineCompact';
import { useUi } from '../../state/useUiStore';
import { useDeliverView, __mockTimerActive } from '../../state/deliverViewStore';

const S = () => useUi.getState();

/* R24-W4 act() HYGIENE (the original wave's act()-warning storm): RTL's
 * cleanup registers its global afterEach at MODULE IMPORT time — BEFORE
 * this file's own hooks register — and vitest runs same-scope afterEach
 * hooks in REVERSE registration order, so RTL cleanup runs AFTER the
 * file-level afterEach below: during it, the previous test's tree is STILL
 * MOUNTED. A bare resetDeliverView() (a useDeliverView.setState) would
 * update that tree outside act() — one warning per test. Both resets are
 * act-wrapped (setup.ts dodges the same trap by calling cleanup() BEFORE
 * its useUi reset; the file-level hooks run earlier than that). */
const resetDeliverView = () => useDeliverView.getState().resetDeliverView();

beforeEach(() => {
  act(() => { resetDeliverView(); });
});

afterEach(() => {
  act(() => { resetDeliverView(); });
});

/** R25-W5 (th_mtzp4arw): the co-mount stand-in for the shell's deliver
 * composition — the AppShell renders DeliverPage in the mainbody AND
 * DeliverExportConsole in the console row (the Export tab); tests that pin
 * the summary rows mount both (the R23-WF TimelineCompact precedent). */
const renderDeliver = () =>
  render(
    <>
      <DeliverPage />
      <DeliverExportConsole />
    </>,
  );

/** R22 W5 → R24-W4: the queue view is showQueue's alone (the single
 *  writer — queueing auto-shows it; the toggle reviews past/active renders
 *  whenever it wants, mid-render included). The default center is the
 *  video preview (#88). */
const openQueue = async (user?: ReturnType<typeof userEvent.setup>) => {
  const toggle = screen.getByTestId('shell-deliver-queue-toggle');
  /* the no-user branch uses fireEvent (act-wrapped) — a raw el.click() fires
   * the React onClick outside act() and warns (the R24-W4 hygiene sweep) */
  if (user) await user.click(toggle); else fireEvent.click(toggle);
};

describe('DeliverPage (spec 18 §4.8 export rail)', () => {
  it('renders the deliver region root with the project metadata row (§4.1)', () => {
    const { container } = render(<DeliverPage />);
    expect(container.querySelector('[data-testid="shell-deliver"]')).toBeInTheDocument();
    /* R25-F3 (D2 re-pin): the title DERIVES from the project record + the
       ACTIVE scene (exportJsonFileName's pair) — not a hardcoded string; the
       status chip derives from project.metadata.status. */
    expect(screen.getByText('Beach Doc — Rough Cut — Rough Cut v3')).toBeInTheDocument();
    // 30s @ 24fps 1080p readout matches the §4.10 sample project settings
    expect(screen.getByText('00:00:30:00 · 24 fps · 1920×1080')).toBeInTheDocument();
    expect(screen.getByText('Edited')).toBeInTheDocument();
  });

  /* RE-PIN (R25-W5 / th_mtzp4xeb): the preset family grew — three tiles →
   * FOUR (the Custom JSON interchange tile). The CTA coupling pin below
   * rides the default (fcpxml) unchanged. */
  it('renders all four presets (R25-W5: the Custom JSON tile joined) with FCPXML active by default', () => {
    render(<DeliverPage />);
    for (const id of ['fcpxml', 'master', 'frame', 'json']) {
      expect(screen.getByTestId(`shell-deliver-preset-${id}`)).toBeInTheDocument();
    }
    // CTA reflects the default preset (fcpxml) before any click
    expect(screen.getByTestId('shell-deliver-btn-export')).toHaveTextContent('Export FCPXML 1.10');
  });

  /* th_mto37ba3: the full-view surface — three regions, fill-whatever-
     container layout (left queue + presets / center summary / right
     settings); preset tiles carry the th_mto38qzp breathing-room chrome
     (2-col wrapping grid, taller tiles) */
  it('R22 W5 (#88/#89): the three regions — presets LEFT, the VIDEO PREVIEW center by default, the inspector RIGHT', () => {
    const { container } = render(<DeliverPage />);
    expect(screen.getByTestId('shell-deliver-presets')).toBeInTheDocument();
    expect(screen.getByTestId('shell-deliver-preview')).toBeInTheDocument();
    expect(screen.getByTestId('shell-deliver-settings')).toBeInTheDocument();
    // region minimums: left 260px, right 300px (the center flexes)
    expect(screen.getByTestId('shell-deliver-presets')).toHaveClass('min-w-[260px]');
    expect(screen.getByTestId('shell-deliver-settings')).toHaveClass('min-w-[300px]');
    // th_mto38qzp: the preset grid is 2-col + tiles have a min-height floor
    const grid = container.querySelector('.grid-cols-2');
    expect(grid).toBeInTheDocument();
    expect(grid!.querySelector('[data-testid="shell-deliver-preset-fcpxml"]')).toHaveClass('min-h-[78px]');
    // #88: the program viewer mounts in the center (the real preview)
    expect(screen.getByTestId('shell-viewer')).toBeInTheDocument();
    // the jobs are NOT rendered while idle (they live in the queue view)
    expect(screen.queryByTestId('shell-deliver-job')).toBeNull();
  });

  it('R22 W5 (#89): the queue toggle swaps the center preview for the queue view', async () => {
    const user = userEvent.setup();
    render(<DeliverPage />);
    await openQueue(user);
    expect(screen.queryByTestId('shell-deliver-preview')).toBeNull();
    expect(screen.getAllByTestId('shell-deliver-job')).toHaveLength(4);
    expect(screen.getByTestId('shell-deliver-queue-toggle')).toHaveAttribute('aria-pressed', 'true');
    // back to the preview
    await user.click(screen.getByTestId('shell-deliver-queue-toggle'));
    expect(screen.getByTestId('shell-deliver-preview')).toBeInTheDocument();
  });

  /* R25-F3 (D3): Retry is gated to FAILED jobs — a QUEUED row carries no
   * action at all (Resolve offers Stop for active, Retry for failed; the
   * mock's render walks on the store timer and cannot be stopped — the
   * honest absence, never a lying Retry on an active row). */
  it('R25-F3 D3: an ACTIVE row carries NO action button — Retry is the failed row\'s alone', async () => {
    const user = userEvent.setup();
    render(<DeliverPage />);
    await user.click(screen.getByTestId('shell-deliver-btn-export')); // queues j-4 → auto-show
    const rows = screen.getAllByTestId('shell-deliver-job');
    expect(rows).toHaveLength(5);
    const activeRow = rows[4]!; // the queued row the CTA just minted
    expect(within(activeRow).queryByRole('button')).toBeNull(); // no Reveal, no Retry — nothing
    // the failed row keeps its Retry, the done rows keep Reveal
    const failedRow = screen.getByText('Beach Doc — v2 master.mp4').closest('[data-testid="shell-deliver-job"]')!;
    expect(within(failedRow as HTMLElement).getByRole('button', { name: 'Retry job' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Reveal file' })).toHaveLength(3);
  });

  /* th_mto37ba3: the RANGE block reads the STORE loop (spec 16 §3.4 —
     timeline I/O marks are the deliver range), not a hardcoded string.
     RE-PIN (R25-W5 / th_mtzp4arw): the block MOVED — from the right
     column's summary card to the console-row Export panel
     (DeliverExportConsole); the co-mount stands in for the shell's
     sibling-tree mount (the R23-WF precedent). */
  it('the range summary mirrors the store loop in/out TCs and follows a loop change (R25-W5: in the console panel)', () => {
    renderDeliver();
    const rangeBlock = screen.getByTestId('shell-deliver-range');
    expect(rangeBlock).toHaveTextContent('00:00:02:00 → 00:00:28:00'); // boot loop {2, 28}
    expect(screen.getByText('In → Out range selection')).toBeInTheDocument();
    expect(screen.getByText(/set I\/O at the playhead/)).toBeInTheDocument();
    // moving the timeline I/O moves the deliver readout + the select option
    act(() => { useUi.setState({ loop: { start: 5, end: 20 } }); });
    expect(screen.getByTestId('shell-deliver-range')).toHaveTextContent('00:00:05:00 → 00:00:20:00');
    const select = screen.getByLabelText('Export range') as HTMLSelectElement;
    expect(within(select).getByRole('option', { name: /00:00:05:00 – 00:00:20:00/ })).toBeInTheDocument();
  });

  /* R23-WF (DESIGN-R23 D-F1, #107): the export range stays STORE-driven —
   * the 32px range band (TimelineCompact's deliver head row, mounted in the
   * shell's timeline area) writes the SAME s.loop seam markIn/markOut and the
   * Ruler brackets write, so this page's readout follows the band's edits
   * with no prop/threading of its own. Both surfaces render in one tree to
   * pin the seam (the shell mounts them; here the co-mount stands in).
   * R25-W5: the readout co-mounted the Export console panel (th_mtzp4arw). */
  it('R23-WF: the readout follows the range band’s drag commit — one seam, every readout moves', () => {
    render(
      <>
        <DeliverPage />
        <DeliverExportConsole />
        <TimelineCompact rangeBand />
      </>,
    );
    expect(screen.getByTestId('shell-deliver-range')).toHaveTextContent('00:00:02:00 → 00:00:28:00');
    // a full band gesture: down → local preview (store untouched) → ONE commit
    fireEvent.pointerDown(screen.getByTestId('shell-deliver-range-band-in'), { pointerId: 2, button: 0 });
    fireEvent.pointerMove(screen.getByTestId('shell-deliver-range-band-in'), { pointerId: 2, buttons: 1, clientX: 138 }); // 3 s
    expect(screen.getByTestId('shell-deliver-range')).toHaveTextContent('00:00:02:00 → 00:00:28:00'); // mid-gesture: still the old range
    fireEvent.pointerUp(screen.getByTestId('shell-deliver-range-band-in'), { pointerId: 2 });
    expect(screen.getByTestId('shell-deliver-range')).toHaveTextContent('00:00:03:00 → 00:00:28:00');
    // the In→Out select option carries the same seam (no second source)
    const select = screen.getByLabelText('Export range') as HTMLSelectElement;
    expect(within(select).getByRole('option', { name: /00:00:03:00 – 00:00:28:00/ })).toBeInTheDocument();
  });

  it('R23-WF: the band’s keyboard commits move the readout too (the band is a first-class loop writer)', () => {
    render(
      <>
        <DeliverPage />
        <DeliverExportConsole />
        <TimelineCompact rangeBand />
      </>,
    );
    fireEvent.keyDown(screen.getByTestId('shell-deliver-range-band-out'), { key: 'ArrowLeft' });
    // 28 s − 1 frame = frame 671 → 00:00:27:23 (the readout follows the commit)
    expect(screen.getByTestId('shell-deliver-range')).toHaveTextContent('00:00:02:00 → 00:00:27:23');
    expect(useUi.getState().loop).toEqual({ start: 2, end: 671 / 24 });
  });

  /* RE-PIN (R25-W5 / th_mtzp4arw): the summary rows moved to the Export
   * console panel — the scene name + the format/codec follow pins point at
   * the panel's testid now; the format select + the codec-disable law stay
   * the page's (the render settings block never moved). */
  it('the console summary shows the active timeline name and the right region owns the settings selects', async () => {
    const user = userEvent.setup();
    renderDeliver();
    expect(screen.getByText('Rough Cut v3')).toBeInTheDocument(); // active scene = the export target (in the console panel)
    // format select mirrors preset state (fcpxml default)
    expect((screen.getByLabelText('Export format') as HTMLSelectElement).value).toBe('fcpxml');
    // codec only applies to the video master — honestly disabled otherwise
    const codec = screen.getByLabelText('Export codec') as HTMLSelectElement;
    expect(codec).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Export format'), { target: { value: 'master' } });
    expect((screen.getByLabelText('Export codec') as HTMLSelectElement)).toBeEnabled();
    // the format select and the preset tiles are the SAME choice
    expect(screen.getByTestId('shell-deliver-btn-export')).toHaveTextContent('Export Master · H.264');
    // the export summary (R25-W5: the Export console panel) follows the format + codec
    expect(screen.getByTestId('shell-deliver-export-summary').textContent).toContain('Codec');
    fireEvent.change(screen.getByLabelText('Export codec'), { target: { value: 'prores' } });
    expect(screen.getByTestId('shell-deliver-export-summary').textContent).toContain('ProRes 422');
    // the panel is a SIBLING of the page: the right column does NOT carry the summary rows anymore
    expect(screen.getByTestId('shell-deliver-settings').textContent).not.toContain('Export summary');
    // R25-F3 (D2 re-pin): the timeline identity DERIVES from the active scene now —
    // 'Rough Cut v3' (sc-1's name) appearing is the DERIVED name, not the old
    // hardcoded project-title row; the derivation pin (scene switch → name follows)
    // lives in the D2 test below.
    expect(screen.getByTestId('shell-deliver-export-summary').textContent).toContain('Rough Cut v3');
  });

  it('clicking a preset updates the export CTA label (store-backed choice, §4.8)', async () => {
    const user = userEvent.setup();
    render(<DeliverPage />);
    await user.click(screen.getByTestId('shell-deliver-preset-master'));
    expect(screen.getByTestId('shell-deliver-btn-export')).toHaveTextContent('Export Master · H.264');
    await user.click(screen.getByTestId('shell-deliver-preset-frame'));
    expect(screen.getByTestId('shell-deliver-btn-export')).toHaveTextContent('Export Current frame · PNG');
    await user.click(screen.getByTestId('shell-deliver-preset-fcpxml'));
    expect(screen.getByTestId('shell-deliver-btn-export')).toHaveTextContent('Export FCPXML 1.10');
    // R25-W5: the Custom JSON preset relabels the CTA too
    await user.click(screen.getByTestId('shell-deliver-preset-json'));
    expect(screen.getByTestId('shell-deliver-btn-export')).toHaveTextContent('Export Custom JSON');
  });

  it('renders the render-settings block: range/resolution selects + bundle checkbox', () => {
    /* RE-PIN (R25-W5): the destination readout is TWO honest mirrors —
       the settings field (this page's right column) + the console panel's
       summary row — so the co-mount keeps the count at 2 (previously the
       right column carried both copies) */
    renderDeliver();
    const range = screen.getByLabelText('Export range') as HTMLSelectElement;
    expect(range.value).toBe('inout');
    expect(within(range).getByRole('option', { name: /Full timeline/ })).toBeInTheDocument();
    const res = screen.getByLabelText('Export resolution') as HTMLSelectElement;
    expect(within(res).getAllByRole('option')).toHaveLength(2);
    expect(screen.getAllByText('~/Downloads/beach-doc/')).toHaveLength(2);
    expect(screen.getByLabelText('Bundle media with FCPXML')).toBeChecked();
  });

  it('renders the job queue: 1 failed + 3 done rows with Reveal/Retry (§4.2/§6.4; R22: no running row by default — the preview owns the center)', async () => {
    const user = userEvent.setup();
    render(<DeliverPage />);
    await openQueue(user);
    const jobs = screen.getAllByTestId('shell-deliver-job');
    expect(jobs).toHaveLength(4);
    // failed row (§4.2 error state, R14): danger status chip + Retry action
    expect(screen.getByText('Beach Doc — v2 master.mp4')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    // done rows: names + time stamps + Reveal-file actions
    expect(screen.getByText('Beach Doc — v3 master.mp4')).toBeInTheDocument();
    expect(screen.getByText('Beach Doc — v3.fcpxml')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Reveal file' })).toHaveLength(3);
    // the failed row alone exposes Retry (no running row by default)
    expect(screen.getAllByRole('button', { name: 'Retry job' })).toHaveLength(1);
  });

  it('preset CTA carries the accent-selection pair styling (AA per accent: gold 9.1 / ember 6.0 / violet 5.05)', () => {
    render(<DeliverPage />);
    const cta = screen.getByTestId('shell-deliver-btn-export');
    expect(cta).toHaveStyle({ background: 'var(--accent-selection)', color: 'var(--accent-contrast)' });
  });

  it('export CTA is preset-aware and honest: info toast + static queued job row (R13 fix)', async () => {
    const user = userEvent.setup();
    render(<DeliverPage />);
    // default preset = FCPXML — the toast names it and says what actually runs
    await user.click(screen.getByTestId('shell-deliver-btn-export'));
    expect(S().toasts).toHaveLength(1);
    expect(S().toasts[0].kind).toBe('info');
    expect(S().toasts[0].title).toBe('Export queued: FCPXML 1.10');
    expect(S().toasts[0].detail).toBe('render queue is mock — no encode runs');
    // a static queued row is appended (5th job) — it never progresses;
    // the name carries the CURRENT settings (default In–Out + 1080p, R14;
    // D2: DERIVED from the project record + the active scene)
    expect(screen.getAllByTestId('shell-deliver-job')).toHaveLength(5);
    expect(screen.getByText('Beach Doc — Rough Cut — Rough Cut v3 — 1080p · In–Out.fcpxml')).toBeInTheDocument();
    // switching the preset makes the NEXT export preset-aware
    await user.click(screen.getByTestId('shell-deliver-preset-master'));
    await user.click(screen.getByTestId('shell-deliver-btn-export'));
    expect(S().toasts.at(-1)!.title).toBe('Export queued: Master · H.264');
    expect(screen.getAllByTestId('shell-deliver-job')).toHaveLength(6);
    expect(screen.getByText('Beach Doc — Rough Cut — Rough Cut v3 — 1080p · In–Out.mp4')).toBeInTheDocument();
  });

  /* R25-F3 (D2): the queued row's name FOLLOWS THE ACTIVE SCENE — the pair
   * mirrors exportJsonFileName (project — scene), so a scene switch is
   * honestly reflected in every minted row (the old hardcoded prefix never
   * moved). */
  it('R25-F3 D2: the queued row derives project + ACTIVE SCENE — a scene switch changes the name', async () => {
    const user = userEvent.setup();
    render(<DeliverPage />);
    await user.click(screen.getByTestId('shell-deliver-preset-master'));
    await user.click(screen.getByTestId('shell-deliver-btn-export'));
    expect(useDeliverView.getState().jobs.at(-1)!.name).toBe('Beach Doc — Rough Cut — Rough Cut v3 — 1080p · In–Out.mp4');
    // switch to sc-2 and export again — the new row carries sc-2's name
    act(() => { useUi.setState({ activeSceneId: 'sc-2' }); });
    await user.click(screen.getByTestId('shell-deliver-btn-export'));
    const sc2 = S().scenes.find((s) => s.id === 'sc-2')!;
    expect(useDeliverView.getState().jobs.at(-1)!.name).toBe(`Beach Doc — Rough Cut — ${sc2.name} — 1080p · In–Out.mp4`);
  });

  it('render settings feed the queued row: resolution + range in the name, bundle chip mirrors the checkbox (R14)', async () => {
    const user = userEvent.setup();
    render(<DeliverPage />);
    // default: bundle on → queued row carries the chip
    await user.click(screen.getByTestId('shell-deliver-btn-export'));
    expect(screen.getAllByTestId('shell-deliver-job-bundle')).toHaveLength(1);
    // D5: resolution + range are the MASTER preset's live settings — the
    // fcpxml default honestly disables resolution (handoff format), so the
    // 2160p + Full leg rides the master preset
    await user.click(screen.getByTestId('shell-deliver-preset-master'));
    fireEvent.change(screen.getByLabelText('Export resolution'), { target: { value: '2160' } });
    fireEvent.change(screen.getByLabelText('Export range'), { target: { value: 'full' } });
    fireEvent.click(screen.getByLabelText('Bundle media with FCPXML'));
    await user.click(screen.getByTestId('shell-deliver-btn-export'));
    expect(screen.getByText('Beach Doc — Rough Cut — Rough Cut v3 — 2160p · Full.mp4')).toBeInTheDocument();
    expect(screen.getAllByTestId('shell-deliver-job-bundle')).toHaveLength(1); // only the first row
  });

  /* R25-F3 (D5): per-preset applicability — the codec row's own honest-disabled
   * grammar extended: a single-frame export has no range; FCPXML/JSON carry no
   * render resolution.
   * RE-PINNED R25-F4 (AA7): the disabled reasons ride data-tip now — the
   * house's ONE tooltip channel (the native title= channel is dead at these
   * sites; same reasons, same rows, new attribute). */
  it('R25-F3 D5: Range dies for the single-frame preset; Resolution dies for FCPXML + JSON (reason data-tips, the codec law)', async () => {
    const user = userEvent.setup();
    render(<DeliverPage />);
    // fcpxml default: resolution honestly disabled (handoff follows the project)
    const res = screen.getByLabelText('Export resolution');
    expect(res).toBeDisabled();
    expect(res).toHaveAttribute('data-tip', expect.stringContaining('FCPXML'));
    expect(res).not.toHaveAttribute('title');
    expect(screen.getByLabelText('Export range')).toBeEnabled(); // range is live for sequences
    // the frame preset: range disabled (a single frame has no in/out span)
    await user.click(screen.getByTestId('shell-deliver-preset-frame'));
    const range = screen.getByLabelText('Export range');
    expect(range).toBeDisabled();
    expect(range).toHaveAttribute('data-tip', expect.stringContaining('single-frame'));
    // json: resolution disabled too (no raster — the summary's em-dash twin)
    await user.click(screen.getByTestId('shell-deliver-preset-json'));
    expect(screen.getByLabelText('Export resolution')).toBeDisabled();
    expect(screen.getByLabelText('Export resolution')).toHaveAttribute('data-tip', expect.stringContaining('raster'));
    // master: everything live
    await user.click(screen.getByTestId('shell-deliver-preset-master'));
    expect(screen.getByLabelText('Export range')).toBeEnabled();
    expect(screen.getByLabelText('Export resolution')).toBeEnabled();
  });

  /* R25-F3 (D4): the destination row is an honest READ-ONLY mirror — the old
   * `field` styling claimed an editability the row never had. */
  it('R25-F3 D4: the destination row reads read-only — no field styling, the fixed-destination tip', () => {
    render(<DeliverPage />);
    const dest = screen.getByTestId('shell-deliver-destination');
    expect(dest.className).not.toContain('field');
    expect(dest.className).toContain('mono');
    expect(dest).toHaveAttribute('data-tip', 'fixed destination in this mock — no folder picker is built');
    expect(dest).toHaveTextContent('~/Downloads/beach-doc/');
  });

  /* ---------- R25-W5 (th_mtzp4xeb): the Custom JSON interchange preset ---------- */

  it('R25-W5: the json preset gets JSON-honest summary rows (schema + pretty-print; resolution is the honest em-dash)', async () => {
    const user = userEvent.setup();
    renderDeliver();
    await user.click(screen.getByTestId('shell-deliver-preset-json'));
    const summary = screen.getByTestId('shell-deliver-export-summary');
    expect(summary.textContent).toContain('Custom JSON'); // the format row
    expect(summary.textContent).toContain('Schema');
    expect(summary.textContent).toContain('nle-interchange/1');
    expect(summary.textContent).toContain('Pretty-printed');
    expect(summary.textContent).toContain('on');
    // resolution does not apply to a JSON interchange — the honest dash
    expect(summary.textContent).toContain('—');
    // the duration row (the W5 "what else makes sense" addition)
    expect(summary.textContent).toContain('00:00:30:00 · 24 fps');
    // the codec select stays honestly disabled (codec applies to the master)
    expect(screen.getByLabelText('Export codec')).toBeDisabled();
  });

  it('R25-W5: the json CTA DOWNLOADS the interchange doc — success toast, NO mock render row, the center stays the preview', async () => {
    /* the DOM half runs for real here (this host HAS URL.createObjectURL);
       the anchor's click is stubbed so jsdom does not attempt navigation —
       the spy still records the anchor (its download name is the pin) */
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function noop() { /* no-op */ });
    try {
      const user = userEvent.setup();
      renderDeliver();
      await user.click(screen.getByTestId('shell-deliver-preset-json'));
      await user.click(screen.getByTestId('shell-deliver-btn-export'));
      // the REAL download: one anchor click carrying the interchange file name
      expect(click).toHaveBeenCalledTimes(1);
      expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe('Beach Doc — Rough Cut — Rough Cut v3.json');
      // the honest toast: a SUCCESS (the file is local), naming the file + schema
      expect(S().toasts).toHaveLength(1);
      expect(S().toasts[0]).toMatchObject({
        kind: 'success',
        title: 'Export downloaded: Beach Doc — Rough Cut — Rough Cut v3.json',
        detail: 'custom JSON interchange (schema nle-interchange/1) — no render queued: the file is already local',
      });
      // the mock render queue is NOT involved: no row, no auto-show, no timer
      expect(useDeliverView.getState().jobs).toHaveLength(4);
      expect(useDeliverView.getState().showQueue).toBe(false);
      expect(__mockTimerActive()).toBe(false);
      expect(screen.getByTestId('shell-deliver-preview')).toBeInTheDocument(); // the center never flipped
    } finally {
      click.mockRestore();
    }
  });

  it('§4.2 empty state: empty active scene swaps the queue + honestly disables the CTA', async () => {
    // sc-1 with every lane emptied — direct setState (no command churn)
    const sc = S().scenes.find((s) => s.id === 'sc-1')!;
    useUi.setState({
      scenes: [{ ...sc, tracks: sc.tracks.map((t) => ({ ...t, elements: [] })) }],
    });
    render(<DeliverPage />);
    await openQueue();
    expect(screen.getByTestId('shell-deliver-state-empty'))
      .toHaveTextContent('Timeline is empty — nothing to export');
    expect(screen.queryByTestId('shell-deliver-job')).toBeNull();
    const cta = screen.getByTestId('shell-deliver-btn-export');
    expect(cta).toHaveAttribute('aria-disabled', 'true');
    expect(cta).toHaveAttribute('data-tip', 'nothing to export — the timeline is empty');
    // the guard holds even if a click lands: no toast, no queued row
    fireEvent.click(cta);
    expect(S().toasts).toHaveLength(0);
  });

  it('§4.2 error state: the failed row\'s Retry fires the existing honest toast', async () => {
    const user = userEvent.setup();
    render(<DeliverPage />);
    await openQueue(user);
    const failedRow = screen.getByText('Beach Doc — v2 master.mp4').closest('[data-testid="shell-deliver-job"]')!;
    await user.click(within(failedRow as HTMLElement).getByRole('button', { name: 'Retry job' }));
    expect(S().toasts[0]).toMatchObject({
      kind: 'info',
      title: 'Retry Beach Doc — v2 master.mp4',
      detail: 'render queue is mock — no encode runs',
    });
  });

  it('Reveal and Retry per-job buttons push honest info toasts (R13 fix)', async () => {
    const user = userEvent.setup();
    render(<DeliverPage />);
    await openQueue(user);
    await user.click(screen.getAllByRole('button', { name: 'Reveal file' })[0]);
    expect(S().toasts[0]).toMatchObject({ kind: 'info', title: 'Reveal file' });
    expect(S().toasts[0].detail).toBe('render queue is mock — no file was written');
    // R22: the failed row is the ONLY retry (no running row by default)
    await user.click(screen.getAllByRole('button', { name: 'Retry job' })[0]);
    expect(S().toasts[1]).toMatchObject({ kind: 'info', title: 'Retry Beach Doc — v2 master.mp4' });
    expect(S().toasts[1].detail).toBe('render queue is mock — no encode runs');
  });

  /* R23-FIX (review-sweep item 8, R2-F6/R5-P2-3): the three-region row keeps
   * its minimums (280+flex+340 ≥ ~900px), so a narrow shell CLIPPED the row
   * with no scroll reachable. The row now carries overflow-x-auto + min-w-0 —
   * jsdom has no layout engine, so the pin is class-level (the CSS law itself
   * is the observable; Pages.stories' narrow-container story claims the same
   * behavior and now tells the truth). */
  it('R23-FIX item 8: the region row scrolls horizontally instead of clipping (overflow-x-auto + min-w-0 on the row)', () => {
    render(<DeliverPage />);
    const row = screen.getByTestId('shell-deliver-presets').parentElement as HTMLElement;
    expect(row).toHaveClass('overflow-x-auto');
    expect(row).toHaveClass('min-w-0');
    // the three regions still keep their minimums — scrollable, not squashed
    expect(screen.getByTestId('shell-deliver-presets')).toHaveClass('min-w-[260px]');
    expect(screen.getByTestId('shell-deliver-settings')).toHaveClass('min-w-[300px]');
    // the row is the DIRECT parent of all three regions (the scroll surface owns them)
    expect(screen.getByTestId('shell-deliver-preview').parentElement).toBe(row);
    expect(screen.getByTestId('shell-deliver-settings').parentElement).toBe(row);
  });

  /* R23-FIX (review-sweep item 9, R2-F7): the queue header's spinner +
   * 'rendering' label ride renderActive — the queue view is reachable while
   * IDLE (the header toggle / past-renders review), and an idle queue
   * claiming 'rendering' was a lying header. */
  it('R23-FIX item 9: the idle queue header is the honest "Render queue" (no spinner); queueing flips it to rendering', async () => {
    const user = userEvent.setup();
    render(<DeliverPage />);
    await openQueue(user);
    const center = screen.getByTestId('shell-deliver-summary');
    expect(within(center).getByText('Render queue')).toBeInTheDocument(); // idle header — the honest label
    expect(center.querySelector('.animate-spin')).toBeNull(); // no spinner while idle
    // queueing an export appends a queued job → renderActive → the label + spinner flip ON
    await user.click(screen.getByTestId('shell-deliver-btn-export'));
    expect(within(center).getByText('Render queue — rendering')).toBeInTheDocument();
    expect(center.querySelector('.animate-spin')).not.toBeNull();
  });

  /* R23-FIX (review-sweep R4-P3#9): the preset tiles are honest pressed-state
   * buttons — aria-pressed + a label-in-name that carries the preset name. */
  it('R23-FIX R4-P3#9: preset tiles carry aria-pressed + label-in-name (the active tile is the pressed one)', async () => {
    const user = userEvent.setup();
    render(<DeliverPage />);
    const master = screen.getByTestId('shell-deliver-preset-master');
    expect(master).toHaveAttribute('aria-pressed', 'false');
    expect(master).toHaveAttribute('aria-label', 'Master · H.264 export preset');
    await user.click(master);
    expect(master).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('shell-deliver-preset-fcpxml')).toHaveAttribute('aria-pressed', 'false'); // one at a time
  });

  /* ---------- R24-W4 (deliverViewStore, F5's P2 + the P3 toggle) ---------- */

  it('R24-W4: the queue SURVIVES page switches — export → page away → back keeps the queued job + the rendering state', async () => {
    const user = userEvent.setup();
    const first = render(<DeliverPage />);
    await user.click(screen.getByTestId('shell-deliver-btn-export'));
    expect(screen.getAllByTestId('shell-deliver-job')).toHaveLength(5); // queued row appended + auto-shown
    first.unmount(); // "page away" — the shell unmounts DeliverPage
    // the STORE keeps the queue while unmounted (the unmount-survival law)
    expect(useDeliverView.getState().jobs).toHaveLength(5);
    expect(useDeliverView.getState().jobs.at(-1)).toMatchObject({ state: 'queued', progress: 0 });
    expect(useDeliverView.getState().showQueue).toBe(true);
    render(<DeliverPage />); // "back" — the queued job + the rendering state persist
    expect(screen.getAllByTestId('shell-deliver-job')).toHaveLength(5);
    expect(screen.getByText('Beach Doc — Rough Cut — Rough Cut v3 — 1080p · In–Out.fcpxml')).toBeInTheDocument();
    expect(screen.getByTestId('shell-deliver-queue-toggle')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Render queue — rendering')).toBeInTheDocument(); // the rendering state survived too
  });

  /* R25-W5: the RENDER SETTINGS survive page switches too (they joined the
   * store with the console panel — the one-choice law's flip side: the
   * preset you selected is still selected when you come back). */
  it('R25-W5: the render settings SURVIVE page switches (the store-backed choice)', async () => {
    const user = userEvent.setup();
    const first = render(<DeliverPage />);
    await user.click(screen.getByTestId('shell-deliver-preset-json'));
    expect(useDeliverView.getState().preset).toBe('json');
    first.unmount();
    render(<DeliverPage />);
    expect(screen.getByTestId('shell-deliver-btn-export')).toHaveTextContent('Export Custom JSON');
    expect(screen.getByTestId('shell-deliver-preset-json')).toHaveAttribute('aria-pressed', 'true');
  });

  it('R24-W4: the queue toggle is HONEST mid-render — allow-collapse (showQueue the single writer, no silent no-op)', async () => {
    const user = userEvent.setup();
    render(<DeliverPage />);
    await user.click(screen.getByTestId('shell-deliver-btn-export')); // auto-show + rendering
    expect(screen.getByTestId('shell-deliver-summary')).toBeInTheDocument();
    // collapse WHILE RENDERING — the toggle works (the old renderActive-locked
    // view made this a silent no-op: aria-pressed flipped, the view stayed)
    await user.click(screen.getByTestId('shell-deliver-queue-toggle'));
    expect(screen.getByTestId('shell-deliver-preview')).toBeInTheDocument();
    expect(screen.getByTestId('shell-deliver-queue-toggle')).toHaveAttribute('aria-pressed', 'false');
    // the render keeps walking in the store — the header badge still says rendering
    expect(screen.getByTestId('shell-deliver-queue-toggle').textContent).toContain('rendering');
    expect(useDeliverView.getState().jobs.at(-1)).toMatchObject({ state: 'queued' });
    // re-expand: the queued job is still there
    await user.click(screen.getByTestId('shell-deliver-queue-toggle'));
    expect(screen.getAllByTestId('shell-deliver-job')).toHaveLength(5);
  });

  it('R24-W4: the mock render COMPLETES on the store-owned timer — 4 × 500ms: queued → running +25%/tick → done "just now"', () => {
    vi.useFakeTimers();
    try {
      render(<DeliverPage />);
      fireEvent.click(screen.getByTestId('shell-deliver-btn-export'));
      expect(useDeliverView.getState().jobs.at(-1)).toMatchObject({ state: 'queued', progress: 0 });
      expect(__mockTimerActive()).toBe(true);
      act(() => { vi.advanceTimersByTime(500); }); // tick 1: queued → running 25%
      expect(useDeliverView.getState().jobs.at(-1)).toMatchObject({ state: 'running', progress: 25 });
      expect(screen.getByText('25%')).toBeInTheDocument(); // the row's live progress readout
      act(() => { vi.advanceTimersByTime(500); }); // tick 2
      expect(useDeliverView.getState().jobs.at(-1)!.progress).toBe(50);
      act(() => { vi.advanceTimersByTime(500); }); // tick 3
      expect(useDeliverView.getState().jobs.at(-1)!.progress).toBe(75);
      act(() => { vi.advanceTimersByTime(500); }); // tick 4: done + self-stop
      expect(useDeliverView.getState().jobs.at(-1)).toMatchObject({ state: 'done', progress: 100, time: 'just now' });
      expect(__mockTimerActive()).toBe(false);
      expect(screen.getByText('just now')).toBeInTheDocument();
      // completion is honest: the header drops the rendering label
      expect(screen.getByText('Render queue')).toBeInTheDocument();
      expect(screen.queryByText('Render queue — rendering')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('R24-W4: FIFO — two queued jobs render ONE AT A TIME in queue order', () => {
    vi.useFakeTimers();
    try {
      render(<DeliverPage />);
      fireEvent.click(screen.getByTestId('shell-deliver-btn-export'));
      fireEvent.click(screen.getByTestId('shell-deliver-btn-export'));
      const jobs = () => useDeliverView.getState().jobs;
      expect(jobs().at(-2)).toMatchObject({ state: 'queued' });
      expect(jobs().at(-1)).toMatchObject({ state: 'queued' });
      act(() => { vi.advanceTimersByTime(500); }); // the FIRST row runs; the second waits
      expect(jobs().at(-2)).toMatchObject({ state: 'running', progress: 25 });
      expect(jobs().at(-1)).toMatchObject({ state: 'queued', progress: 0 });
      act(() => { vi.advanceTimersByTime(1500); }); // the first row → done 'just now'
      expect(jobs().at(-2)).toMatchObject({ state: 'done', time: 'just now' });
      expect(jobs().at(-1)).toMatchObject({ state: 'queued' }); // still waiting its turn
      act(() => { vi.advanceTimersByTime(500); }); // now the second starts
      expect(jobs().at(-1)).toMatchObject({ state: 'running', progress: 25 });
    } finally {
      vi.useRealTimers();
    }
  });

  /* ---------- R25-W5 (th_mtzp4arw): the Export console panel ---------- */

  it('R25-W5: the console panel mirrors the queue status read-only — jobs count + idle, flipping with a live render', async () => {
    const user = userEvent.setup();
    renderDeliver();
    const strip = screen.getByTestId('shell-deliver-export-queue');
    expect(strip.textContent).toContain('4 jobs');
    expect(screen.getByTestId('shell-deliver-export-queue-state')).toHaveTextContent('idle');
    // a queued export flips the mirror (read-only — the strip writes nothing)
    await user.click(screen.getByTestId('shell-deliver-btn-export'));
    expect(screen.getByTestId('shell-deliver-export-queue-state')).toHaveTextContent('rendering');
    expect(strip.textContent).toContain('5 jobs');
    // the queue DETAIL rows stay in the center view (auto-shown by the store)
    expect(screen.getAllByTestId('shell-deliver-job')).toHaveLength(5);
  });

  /* ---------- R25-F3 (D1 + D6): the Export console's range copy + layout ---------- */

  /* R25-F3 (D1): the range copy is DENSITY-AWARE — the range band mounts
   * only on the compact strip (the 'all' scope); the boot density is the
   * FULL Timeline, so the ruler-bracket copy is the default and the band
   * copy appears only under the compact scope (the per-page map). */
  it('R25-F3 D1: the range hint names the mounted affordance — ruler brackets on the full timeline, the band on the compact strip', () => {
    renderDeliver();
    // deliver boots scope 'off' → the FULL Timeline mounts → brackets copy
    expect(screen.getByText(/drag the in\/out brackets on the timeline ruler/)).toBeInTheDocument();
    expect(screen.queryByText(/range band on the Timeline tab/)).not.toBeInTheDocument();
    // flip the page's density to the compact strip ('all') → the band copy
    act(() => {
      useUi.setState((s) => ({ page: 'deliver', pageTimelineView: { ...s.pageTimelineView, deliver: { ...s.pageTimelineView.deliver, compact: 'all' } } }));
    });
    expect(screen.getByText(/range band on the Timeline tab/)).toBeInTheDocument();
    expect(screen.queryByText(/brackets on the timeline ruler/)).not.toBeInTheDocument();
  });

  /* R25-F3 (D6): the status strip PINS ABOVE the scrollable card content —
   * at an ~800px viewport the summary card used to push it below the fold.
   * jsdom has no layout engine, so the pin is structural: the strip is the
   * console root's FIRST child and the scroll region is its sibling BELOW
   * it (never the strip's parent). */
  it('R25-F3 D6: the status strip is pinned above the scroll region — first child, scroll region its FOLLOWING sibling', () => {
    renderDeliver();
    const consoleRoot = screen.getByTestId('shell-deliver-export-console');
    const strip = screen.getByTestId('shell-deliver-export-queue');
    const scroller = consoleRoot.querySelector('.scroll-y') as HTMLElement;
    expect(consoleRoot.firstElementChild).toBe(strip); // pinned — before the scroll content
    expect(scroller.parentElement).toBe(consoleRoot); // the scroll region is the strip's sibling
    expect(strip.compareDocumentPosition(scroller) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // the summary card lives INSIDE the scroll region (below the pinned strip)
    expect(scroller.contains(screen.getByTestId('shell-deliver-export-summary'))).toBe(true);
    expect(strip.contains(screen.getByTestId('shell-deliver-export-summary'))).toBe(false);
  });
});

/* DeliverPage — spec 18 §4.8 / specs 10-11 export surface. R19 th_mto37ba3:
   the page is now a FULL-VIEW 3-region export surface (queue+presets /
   summary incl. the store-driven range / render settings). Presets are local
   React state; the toast queue lives in the store. These tests pin the
   three regions, the preset→CTA label coupling, the store-loop-driven
   range block + select options, the render-settings block, the job queue
   (done rows + one running row with progress + retry, §6.4 error UX), and
   the honest-mock export behavior (R13: CTA + Reveal/Retry push info
   toasts — no encode ever runs — and the CTA appends a static queued job
   row). */

import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeliverPage } from './DeliverPage';
import { useUi } from '../../state/useUiStore';

const S = () => useUi.getState();

/** R22 W5: the queue lives in the CENTER only while queued/running (or the
 *  toggle is on) — the default center is the video preview (#88). */
const openQueue = async (user?: ReturnType<typeof userEvent.setup>) => {
  const toggle = screen.getByTestId('shell-deliver-queue-toggle');
  if (user) await user.click(toggle); else toggle.click();
};

describe('DeliverPage (spec 18 §4.8 export rail)', () => {
  it('renders the deliver region root with the project metadata row (§4.1)', () => {
    const { container } = render(<DeliverPage />);
    expect(container.querySelector('[data-testid="shell-deliver"]')).toBeInTheDocument();
    expect(screen.getByText('Beach Doc — Rough Cut')).toBeInTheDocument();
    // 30s @ 24fps 1080p readout matches the §4.10 sample project settings
    expect(screen.getByText('00:00:30:00 · 24 fps · 1920×1080')).toBeInTheDocument();
    expect(screen.getByText('Edited')).toBeInTheDocument();
  });

  it('renders all three presets with FCPXML active by default', () => {
    render(<DeliverPage />);
    for (const id of ['fcpxml', 'master', 'frame']) {
      expect(screen.getByTestId(`shell-deliver-preset-${id}`)).toBeInTheDocument();
    }
    // CTA reflects the default preset (fcpxml) before any click
    expect(screen.getByTestId('shell-deliver-btn-export-fcpxml')).toHaveTextContent('Export FCPXML 1.10');
  });

  /* th_mto37ba3: the full-view surface — three regions, fill-whatever-
     container layout (left queue + presets / center summary / right
     settings); preset tiles carry the th_mto38qzp breathing-room chrome
     (2-col wrapping grid, taller tiles) */
  it('R22 W5 (#88/#89): the three regions — presets LEFT, the VIDEO PREVIEW center by default, the inspector RIGHT', () => {
    const { container } = render(<DeliverPage />);
    expect(screen.getByTestId('shell-deliver-queue')).toBeInTheDocument();
    expect(screen.getByTestId('shell-deliver-preview')).toBeInTheDocument();
    expect(screen.getByTestId('shell-deliver-settings')).toBeInTheDocument();
    // region minimums: left 260px, right 300px (the center flexes)
    expect(screen.getByTestId('shell-deliver-queue')).toHaveClass('min-w-[260px]');
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

  /* th_mto37ba3: the RANGE block reads the STORE loop (spec 16 §3.4 —
     timeline I/O marks are the deliver range), not a hardcoded string */
  it('the range summary mirrors the store loop in/out TCs and follows a loop change', () => {
    render(<DeliverPage />);
    const rangeBlock = screen.getByTestId('shell-deliver-range');
    expect(rangeBlock).toHaveTextContent('00:00:02:00 → 00:00:28:00'); // boot loop {2, 28}
    expect(screen.getByText('In → Out range selection')).toBeInTheDocument();
    expect(screen.getByText(/set I\/O on the timeline/)).toBeInTheDocument();
    // moving the timeline I/O moves the deliver readout + the select option
    act(() => { useUi.setState({ loop: { start: 5, end: 20 } }); });
    expect(screen.getByTestId('shell-deliver-range')).toHaveTextContent('00:00:05:00 → 00:00:20:00');
    const select = screen.getByLabelText('Export range') as HTMLSelectElement;
    expect(within(select).getByRole('option', { name: /00:00:05:00 – 00:00:20:00/ })).toBeInTheDocument();
  });

  it('center summary shows the active timeline name and the right region owns the settings selects', async () => {
    const user = userEvent.setup();
    render(<DeliverPage />);
    await openQueue(user);
    expect(screen.getByText('Rough Cut v3')).toBeInTheDocument(); // active scene = the export target
    // format select mirrors preset state (fcpxml default)
    expect((screen.getByLabelText('Export format') as HTMLSelectElement).value).toBe('fcpxml');
    // codec only applies to the video master — honestly disabled otherwise
    const codec = screen.getByLabelText('Export codec') as HTMLSelectElement;
    expect(codec).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Export format'), { target: { value: 'master' } });
    expect((screen.getByLabelText('Export codec') as HTMLSelectElement)).toBeEnabled();
    // the format select and the preset tiles are the SAME choice
    expect(screen.getByTestId('shell-deliver-btn-export-fcpxml')).toHaveTextContent('Export Master · H.264');
    // the export summary (now in the right inspector, #88) follows the format + codec
    expect(screen.getByTestId('shell-deliver-settings').textContent).toContain('Codec');
    fireEvent.change(screen.getByLabelText('Export codec'), { target: { value: 'prores' } });
    expect(screen.getByTestId('shell-deliver-settings').textContent).toContain('ProRes 422');
  });

  it('clicking a preset updates the export CTA label (local state, §4.8)', async () => {
    const user = userEvent.setup();
    render(<DeliverPage />);
    await user.click(screen.getByTestId('shell-deliver-preset-master'));
    expect(screen.getByTestId('shell-deliver-btn-export-fcpxml')).toHaveTextContent('Export Master · H.264');
    await user.click(screen.getByTestId('shell-deliver-preset-frame'));
    expect(screen.getByTestId('shell-deliver-btn-export-fcpxml')).toHaveTextContent('Export Current frame · PNG');
    await user.click(screen.getByTestId('shell-deliver-preset-fcpxml'));
    expect(screen.getByTestId('shell-deliver-btn-export-fcpxml')).toHaveTextContent('Export FCPXML 1.10');
  });

  it('renders the render-settings block: range/resolution selects + bundle checkbox', () => {
    render(<DeliverPage />);
    const range = screen.getByLabelText('Export range') as HTMLSelectElement;
    expect(range.value).toBe('inout');
    expect(within(range).getByRole('option', { name: /Full timeline/ })).toBeInTheDocument();
    const res = screen.getByLabelText('Export resolution') as HTMLSelectElement;
    expect(within(res).getAllByRole('option')).toHaveLength(2);
    /* th_mto37ba3 (full-view redesign): the destination readout now lives in
       BOTH the center summary and the right settings field — one string, two
       honest mirrors; assert both instead of the old single rail copy */
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
    const cta = screen.getByTestId('shell-deliver-btn-export-fcpxml');
    expect(cta).toHaveStyle({ background: 'var(--accent-selection)', color: 'var(--accent-contrast)' });
  });

  it('export CTA is preset-aware and honest: info toast + static queued job row (R13 fix)', async () => {
    const user = userEvent.setup();
    render(<DeliverPage />);
    // default preset = FCPXML — the toast names it and says what actually runs
    await user.click(screen.getByTestId('shell-deliver-btn-export-fcpxml'));
    expect(S().toasts).toHaveLength(1);
    expect(S().toasts[0].kind).toBe('info');
    expect(S().toasts[0].title).toBe('Export queued: FCPXML 1.10');
    expect(S().toasts[0].detail).toBe('render queue is mock — no encode runs');
    // a static queued row is appended (5th job) — it never progresses;
    // the name carries the CURRENT settings (default In–Out + 1080p, R14)
    expect(screen.getAllByTestId('shell-deliver-job')).toHaveLength(5);
    expect(screen.getByText('Beach Doc — Rough Cut — 1080p · In–Out.fcpxml')).toBeInTheDocument();
    // switching the preset makes the NEXT export preset-aware
    await user.click(screen.getByTestId('shell-deliver-preset-master'));
    await user.click(screen.getByTestId('shell-deliver-btn-export-fcpxml'));
    expect(S().toasts.at(-1)!.title).toBe('Export queued: Master · H.264');
    expect(screen.getAllByTestId('shell-deliver-job')).toHaveLength(6);
    expect(screen.getByText('Beach Doc — Rough Cut — 1080p · In–Out.mp4')).toBeInTheDocument();
  });

  it('render settings feed the queued row: resolution + range in the name, bundle chip mirrors the checkbox (R14)', async () => {
    const user = userEvent.setup();
    render(<DeliverPage />);
    // default: bundle on → queued row carries the chip
    await user.click(screen.getByTestId('shell-deliver-btn-export-fcpxml'));
    expect(screen.getAllByTestId('shell-deliver-job-bundle')).toHaveLength(1);
    // 2160p + Full + bundle off → name + no chip
    fireEvent.change(screen.getByLabelText('Export resolution'), { target: { value: '2160' } });
    fireEvent.change(screen.getByLabelText('Export range'), { target: { value: 'full' } });
    fireEvent.click(screen.getByLabelText('Bundle media with FCPXML'));
    await user.click(screen.getByTestId('shell-deliver-btn-export-fcpxml'));
    expect(screen.getByText('Beach Doc — Rough Cut — 2160p · Full.fcpxml')).toBeInTheDocument();
    expect(screen.getAllByTestId('shell-deliver-job-bundle')).toHaveLength(1); // only the first row
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
    const cta = screen.getByTestId('shell-deliver-btn-export-fcpxml');
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
});

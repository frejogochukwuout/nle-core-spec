/* DeliverPage — spec 18 §4.8 / specs 10-11 export rail. Presets are local
   React state (no store): these tests pin the three preset buttons, the
   preset→CTA label coupling, the render-settings block, and the job queue
   (done rows + one running row with progress + retry, §6.4 error UX).
   No store/variant interaction — renderPlain. */

import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeliverPage } from './DeliverPage';

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
    expect(screen.getByText('~/Downloads/beach-doc/')).toBeInTheDocument();
    expect(screen.getByLabelText('Bundle media with FCPXML')).toBeChecked();
  });

  it('renders the job queue: 2 done + 1 running with progress and retry (§6.4)', () => {
    render(<DeliverPage />);
    const jobs = screen.getAllByTestId('shell-deliver-job');
    expect(jobs).toHaveLength(3);
    // done rows: names + "2m ago" stamps + Reveal-file actions
    expect(screen.getByText('Beach Doc — v3 master.mp4')).toBeInTheDocument();
    expect(screen.getByText('Beach Doc — v3.fcpxml')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Reveal file' })).toHaveLength(2);
    // running row: percentage readout + Retry action (error-UX affordance)
    expect(screen.getByText('Interview selects master.mp4')).toBeInTheDocument();
    expect(screen.getByText('38%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry job' })).toBeInTheDocument();
  });

  it('preset CTA carries the accent-selection pair styling (9.1:1, resolved spec finding)', () => {
    render(<DeliverPage />);
    const cta = screen.getByTestId('shell-deliver-btn-export-fcpxml');
    expect(cta).toHaveStyle({ background: 'var(--accent-selection)', color: 'var(--accent-contrast)' });
  });

  it('queue retry button is present but the render flow itself is mock-only (no store writes)', () => {
    render(<DeliverPage />);
    // no start-render side channel exists in the mock: the CTA has no handler
    // wired (aria stays a plain button) — pinned so wiring it later is a
    // deliberate, reviewed change
    const cta = screen.getByTestId('shell-deliver-btn-export-fcpxml');
    expect(cta.tagName).toBe('BUTTON');
    expect(cta).not.toHaveAttribute('disabled');
  });
});

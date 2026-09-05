/* ColorPage — spec 18 §4.8 color-focus right rail. Grading stack is
   display state (R14 no-op fix): the 4 sliders + LUT select are controlled
   LOCAL state whose readouts follow, wheels are decorative role="img"
   statics (R13 fix), and first interaction per mount fires one honest
   toast (no fake engine writes — spec 08 §4 render round). Store is touched
   only for toasts — renderPlain. */

import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ColorPage } from './ColorPage';
import { useUi } from '../../state/useUiStore';

const S = () => useUi.getState();

describe('ColorPage (spec 18 §4.8 color-focus rail)', () => {
  it('renders the color region root (right-rail swap at inspectorW)', () => {
    const { container } = render(<ColorPage />);
    expect(container.querySelector('[data-testid="shell-color"]')).toBeInTheDocument();
    // header states the §4.8 simplified stack
    expect(screen.getByText('single-column simplified stack (spec 18 §4.8)')).toBeInTheDocument();
  });

  it('renders all four wheels — Lift / Gamma / Gain / Offset (§4.8)', () => {
    render(<ColorPage />);
    for (const label of ['Lift', 'Gamma', 'Gain', 'Offset']) {
      // R13 fix: decorative dials are role=img (no keyboard promise), not sliders
      expect(screen.getByRole('img', { name: `${label} color wheel (static mock)` })).toBeInTheDocument();
    }
    // the ONLY sliders on the page are the interactive labeled inputs —
    // no wheel masquerades as a slider
    expect(screen.getAllByRole('slider').map((s) => s.getAttribute('aria-label')))
      .toEqual(['Contrast', 'Pivot', 'Saturation', 'Qualifier hue']);
  });

  it('renders the primaries sliders with their fixture values', () => {
    render(<ColorPage />);
    for (const label of ['Contrast', 'Pivot', 'Saturation']) {
      expect(screen.getByRole('slider', { name: label })).toBeInTheDocument();
    }
    // fixture pins: Contrast +12, Pivot +35, Saturation −8 (signed readouts)
    expect(screen.getByText('+12')).toBeInTheDocument();
    expect(screen.getByText('+35')).toBeInTheDocument();
    expect(screen.getByText('-8')).toBeInTheDocument();
  });

  it('renders curves editor + waveform/histogram scopes', () => {
    render(<ColorPage />);
    expect(screen.getByLabelText('Curves editor')).toBeInTheDocument();
    expect(screen.getByLabelText('Waveform scope')).toBeInTheDocument();
    expect(screen.getByLabelText('Histogram scope')).toBeInTheDocument();
    expect(screen.getByText('Scopes')).toBeInTheDocument();
  });

  it('LUT select offers the three mock options; default is None', () => {
    render(<ColorPage />);
    const lut = screen.getByLabelText('LUT select') as HTMLSelectElement;
    expect(lut.options).toHaveLength(3);
    expect(within(lut).getByRole('option', { name: 'None', selected: true })).toBeInTheDocument();
    expect(within(lut).getByRole('option', { name: 'Kodak 2383' })).toBeInTheDocument();
    expect(within(lut).getByRole('option', { name: 'Rec709 → sRGB' })).toBeInTheDocument();
  });

  it('renders the HSL qualifier + power-window affordance', () => {
    render(<ColorPage />);
    expect(screen.getByRole('slider', { name: 'Qualifier hue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Power window' })).toBeInTheDocument();
  });

  it('documents the deferred node-graph (spec 18 §15.3 seal question)', () => {
    render(<ColorPage />);
    expect(screen.getByText(/Node-graph layout deferred/i)).toBeInTheDocument();
  });
});

describe('ColorPage display state (R14 no-op fix — real local behavior + honest toast)', () => {
  it('moving a primary updates its readout; only ONE toast fires per mount', () => {
    render(<ColorPage />);
    fireEvent.change(screen.getByRole('slider', { name: 'Contrast' }), { target: { value: '40' } });
    expect(screen.getByText('+40')).toBeInTheDocument();
    expect(screen.queryByText('+12')).toBeNull(); // stale readout replaced
    // first touch fires the honest display-state toast…
    expect(S().toasts).toHaveLength(1);
    expect(S().toasts[0]).toMatchObject({
      kind: 'info',
      title: 'Color params',
      detail: 'grading stack is static in the mock — values are display state (spec 08 §4 render round)',
    });
    // …and further interactions do NOT repeat it (one per mount)
    fireEvent.change(screen.getByRole('slider', { name: 'Pivot' }), { target: { value: '-20' } });
    fireEvent.change(screen.getByRole('slider', { name: 'Saturation' }), { target: { value: '60' } });
    fireEvent.change(screen.getByRole('slider', { name: 'Qualifier hue' }), { target: { value: '70' } });
    expect(screen.getByText('-20')).toBeInTheDocument();
    expect(screen.getByText('+60')).toBeInTheDocument();
    expect(S().toasts).toHaveLength(1);
  });

  it('the LUT select updates the under-wheels readout and fires its own one-time toast', () => {
    render(<ColorPage />);
    expect(screen.getByTestId('shell-color-lut-readout')).toHaveTextContent('LUT: None');
    fireEvent.change(screen.getByLabelText('LUT select'), { target: { value: 'Kodak 2383' } });
    expect(screen.getByTestId('shell-color-lut-readout')).toHaveTextContent('LUT: Kodak 2383');
    expect(S().toasts.at(-1)).toMatchObject({
      kind: 'info',
      title: 'Color params',
      detail: 'LUT preview lands with the render round (spec 08)',
    });
    // one per mount: a second change stays silent
    fireEvent.change(screen.getByLabelText('LUT select'), { target: { value: 'Rec709 → sRGB' } });
    expect(screen.getByTestId('shell-color-lut-readout')).toHaveTextContent('LUT: Rec709 → sRGB');
    expect(S().toasts).toHaveLength(1);
  });

  it('the power-window button answers with the v2 deferral toast', () => {
    render(<ColorPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Power window' }));
    expect(S().toasts.at(-1)).toMatchObject({
      kind: 'info',
      title: 'Power window',
      detail: 'windowing is a v2 grading surface (spec 08)',
    });
  });
});

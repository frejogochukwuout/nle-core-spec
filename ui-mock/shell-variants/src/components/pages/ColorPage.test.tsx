/* ColorPage — spec 18 §4.8 color-focus right rail. Static grading mock:
   these tests pin the STRUCTURE (region root, the 4 wheels, primaries
   sliders, curves + scopes, LUT/qualifier) plus the §15.3 single-column
   deferral note. Wheels are role=slider with accessible names; sliders are
   labeled inputs (§11 a11y floor). No store interaction — renderPlain. */

import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ColorPage } from './ColorPage';

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
      const wheel = screen.getByRole('slider', { name: `${label} color wheel` });
      expect(wheel).toBeInTheDocument();
      // each wheel also exposes its centered mock position (§11 valuetext)
      expect(wheel).toHaveAttribute('aria-valuetext', 'centered');
    }
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

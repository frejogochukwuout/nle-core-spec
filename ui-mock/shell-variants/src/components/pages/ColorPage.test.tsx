/* ColorPage + the R19-B4 color surfaces (spec 18 §4.8 color-focus rail,
   color-cluster.md references). Grading stack is display state (R14/R19
   pattern): all values are controlled LOCAL state whose readouts follow,
   the first interaction per surface mount fires ONE honest toast (spec 08
   §4 render round), the LUT select stays REAL display state with its own
   one-time toast. Wheels tab renders the 4 wheels + master sliders; the
   Qualifier tab renders the hue range widget + 14 matte fields; the node
   graph renders the 8-node reference topology with working selection; the
   scopes dock renders the 4 quadrant headers + role=img canvases and
   collapses. Store is touched only for toasts — plain render. */

import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ColorPage, ColorNodeGraph, ColorRailPanel, ColorScopesDock } from './ColorPage';
import { useUi } from '../../state/useUiStore';

const S = () => useUi.getState();

const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

describe('ColorPage (spec 18 §4.8 — reference-grade grading rail)', () => {
  it('renders the page root with the tabbed rail; Wheels tab is selected', () => {
    render(<ColorPage />);
    expect(screen.getByTestId('shell-color')).toBeInTheDocument();
    expect(screen.getByText('grading surface — wheels · qualifier (spec 18 §4.8)')).toBeInTheDocument();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Wheels', 'Qualifier']);
    expect(screen.getByRole('tab', { name: 'Wheels' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'shell-color-tab-wheels');
  });

  it('renders all four wheels — Lift / Gamma / Gain / Offset (color-cluster §1.4)', () => {
    render(<ColorPage />);
    for (const key of ['lift', 'gamma', 'gain', 'offset']) {
      expect(screen.getByTestId(`shell-color-wheel-${key}`)).toBeInTheDocument();
    }
    // wheels are role=img with names (R13 honesty: no slider promise on the 2D puck)
    for (const label of ['Lift', 'Gamma', 'Gain', 'Offset']) {
      expect(screen.getByRole('img', { name: `${label} color wheel` })).toBeInTheDocument();
    }
    // YRGB rows: 4 cells on Lift/Gamma/Gain, 3 (RGB-only) on Offset
    expect(screen.getByLabelText('Lift Y')).toHaveValue('0.00');
    expect(screen.getByLabelText('Gain Y')).toHaveValue('1.00');
    expect(screen.queryByLabelText('Offset Y')).toBeNull();
    expect(screen.getByLabelText('Offset R')).toHaveValue('25.00');
    // per-wheel luma thumbwheels are real sliders (aria-valuenow contract)
    expect(screen.getByRole('slider', { name: 'Lift luma' })).toHaveAttribute('aria-valuenow', '50');
  });

  it('renders the master sliders + top controls with reference formats', () => {
    render(<ColorPage />);
    for (const label of ['Color Boost', 'Shadows', 'Highlights', 'Saturation', 'Hue', 'Lum Mix']) {
      expect(screen.getByRole('slider', { name: label })).toBeInTheDocument();
    }
    expect(input('Saturation value')).toHaveValue('50.00');
    expect(input('Hue value')).toHaveValue('50.00');
    expect(input('Lum Mix value')).toHaveValue('100.00');
    expect(input('Color Boost value')).toHaveValue('0.00');
    // top controls (ref §1.3): Temp/Tint inputs + Contrast/Pivot/Mid sliders
    expect(input('Temp value')).toHaveValue('0.0');
    expect(input('Tint value')).toHaveValue('0.00');
    expect(input('Contrast value')).toHaveValue('1.000');
    expect(input('Pivot value')).toHaveValue('0.435');
    expect(input('Mid/Detail value')).toHaveValue('0.00');
    expect(screen.getByRole('slider', { name: 'Contrast' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Pivot' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Mid/Detail' })).toBeInTheDocument();
  });

  it('the LOG toggle switches header state and wheel labels (real local state)', () => {
    render(<ColorPage />);
    const log = screen.getByTestId('shell-color-log-toggle');
    expect(log).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('shell-color-wheels-title')).toHaveTextContent('Primaries — Color Wheels');
    fireEvent.click(log);
    expect(log).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('shell-color-wheels-title')).toHaveTextContent('Primaries — LOG');
    // LOG grammar: Lift/Gamma/Gain → Shadows/Midtones/Highlights
    expect(screen.getByRole('img', { name: 'Midtones color wheel' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Gamma color wheel' })).toBeNull();
    fireEvent.click(log);
    expect(log).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('img', { name: 'Gamma color wheel' })).toBeInTheDocument();
  });

  it('LUT select stays REAL display state: options, readout, own one-time toast', () => {
    render(<ColorPage />);
    const lut = screen.getByLabelText('LUT select') as HTMLSelectElement;
    expect(lut.options).toHaveLength(3);
    expect(within(lut).getByRole('option', { name: 'None', selected: true })).toBeInTheDocument();
    expect(within(lut).getByRole('option', { name: 'Kodak 2383' })).toBeInTheDocument();
    expect(within(lut).getByRole('option', { name: 'Rec709 → sRGB' })).toBeInTheDocument();
    expect(screen.getByTestId('shell-color-lut-readout')).toHaveTextContent('LUT: None');

    fireEvent.change(lut, { target: { value: 'Kodak 2383' } });
    expect(screen.getByTestId('shell-color-lut-readout')).toHaveTextContent('LUT: Kodak 2383');
    expect(S().toasts.at(-1)).toMatchObject({
      kind: 'info',
      title: 'Color params',
      detail: 'LUT preview lands with the render round (spec 08)',
    });
    // one per mount: a second change stays silent
    fireEvent.change(lut, { target: { value: 'Rec709 → sRGB' } });
    expect(screen.getByTestId('shell-color-lut-readout')).toHaveTextContent('LUT: Rec709 → sRGB');
    expect(S().toasts).toHaveLength(1);
  });

  it('first interaction fires ONE honest display-state toast per mount', () => {
    render(<ColorPage />);
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Hue' }), { key: 'ArrowRight' });
    expect(S().toasts).toHaveLength(1);
    expect(S().toasts[0]).toMatchObject({
      kind: 'info',
      title: 'Color params',
      detail: 'grading stack is display state (spec 08 §4 render round)',
    });
    // further interactions do NOT repeat it
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Saturation' }), { key: 'ArrowRight' });
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Lift luma' }), { key: 'ArrowLeft' });
    expect(S().toasts).toHaveLength(1);
  });

  it('slider keyboard + numeric edits drive the readouts (local display state)', () => {
    render(<ColorPage />);
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Hue' }), { key: 'ArrowRight' });
    expect(input('Hue value')).toHaveValue('51.00');
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Hue' }), { key: 'Home' });
    expect(input('Hue value')).toHaveValue('0.00');
    // numeric cell commits on blur (free text while focused)
    fireEvent.change(input('Gain Y'), { target: { value: '1.25' } });
    fireEvent.blur(input('Gain Y'));
    expect(input('Gain Y')).toHaveValue('1.25');
  });

  it('arrow keys on the tablist switch tabs (WAI-ARIA tabs pattern)', () => {
    render(<ColorPage />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Wheels' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Qualifier' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'shell-color-tab-qualifier');
  });
});

describe('Qualifier tab (qualifier_ui.html — embedded HSL panel)', () => {
  it('renders the eyedropper row, hue range widget and the 14 matte fields', () => {
    render(<ColorRailPanel />);
    fireEvent.click(screen.getByRole('tab', { name: 'Qualifier' }));
    expect(screen.getByTestId('shell-color-qualifier')).toBeInTheDocument();
    // eyedropper toolbar row (ref §2.3): pick / − / + / _ / feather / invert
    for (const label of ['Eyedropper', 'Eyedropper subtract', 'Eyedropper add', 'Eyedropper narrow softness', 'Feather', 'Invert qualifier']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Eyedropper' })).toHaveAttribute('aria-pressed', 'true');
    // the range widgets: hue + sat + lum
    expect(screen.getByTestId('shell-color-hue-range')).toBeInTheDocument();
    expect(screen.getByTestId('shell-color-sat-range')).toBeInTheDocument();
    expect(screen.getByTestId('shell-color-lum-range')).toBeInTheDocument();
    // matte finesse: 14 fields (13 sliders + the Morph pseudo-select)
    const matte = document.querySelectorAll('[data-testid^="shell-color-matte-"]');
    expect(matte).toHaveLength(14);
    expect(screen.getByTestId('shell-color-matte-morph-operation')).toHaveTextContent('Shrink');
    // reference defaults: Pre-Filter 0.8, White Clip 100.0, Shadow 100.0
    expect(screen.getByTestId('shell-color-matte-pre-filter')).toHaveTextContent('Pre-Filter0.8');
    expect(screen.getByTestId('shell-color-matte-white-clip')).toHaveTextContent('White Clip100.0');
    expect(screen.getByTestId('shell-color-matte-shadow')).toHaveTextContent('Shadow100.0');
  });

  it('hue fields show the reference formats (87.6 / 14.4 / 3.5 / 50.0)', () => {
    render(<ColorRailPanel />);
    fireEvent.click(screen.getByRole('tab', { name: 'Qualifier' }));
    expect(input('Hue Center')).toHaveValue('87.6');
    expect(input('Hue Width')).toHaveValue('14.4');
    expect(input('Hue Soft')).toHaveValue('3.5');
    expect(input('Hue Sym')).toHaveValue('50.0');
    expect(input('Saturation Low')).toHaveValue('2.2');
    expect(input('Saturation High')).toHaveValue('14.2');
    expect(input('Luminance Low')).toHaveValue('61.1');
    expect(input('Luminance High')).toHaveValue('71.4');
  });

  it('range handles are two-way state: keyboard moves handle + derived fields', () => {
    render(<ColorRailPanel />);
    fireEvent.click(screen.getByRole('tab', { name: 'Qualifier' }));
    const low = screen.getByRole('slider', { name: 'Hue range low' });
    expect(low).toHaveAttribute('aria-valuenow', '80');
    fireEvent.keyDown(low, { key: 'ArrowRight' });
    expect(low).toHaveAttribute('aria-valuenow', '81');
    // the derived Center/Width fields follow the handles (one state)
    expect(input('Hue Center')).toHaveValue('88.1');
    expect(input('Hue Width')).toHaveValue('13.4');
    // first interaction fires the honest toast once
    expect(S().toasts).toHaveLength(1);
    fireEvent.keyDown(low, { key: 'ArrowLeft' });
    expect(S().toasts).toHaveLength(1);
  });

  it('a matte finesse slider updates its readout; morph pseudo-select answers honestly', () => {
    render(<ColorRailPanel />);
    fireEvent.click(screen.getByRole('tab', { name: 'Qualifier' }));
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Matte White Clip' }), { key: 'ArrowLeft' });
    expect(screen.getByTestId('shell-color-matte-white-clip')).toHaveTextContent('White Clip99.0');
    expect(S().toasts.at(-1)).toMatchObject({
      kind: 'info',
      title: 'Color params',
      detail: 'grading stack is display state (spec 08 §4 render round)',
    });
    // the Morph Operation pseudo-select is display state → honest toast (already fired once this mount)
    const toastsBefore = S().toasts.length;
    fireEvent.click(screen.getByTestId('shell-color-matte-morph-operation').querySelector('button')!);
    expect(S().toasts).toHaveLength(toastsBefore);
  });

  it('eyedropper tools are selectable state (aria-pressed, one active)', () => {
    render(<ColorRailPanel />);
    fireEvent.click(screen.getByRole('tab', { name: 'Qualifier' }));
    fireEvent.click(screen.getByRole('button', { name: 'Feather' }));
    expect(screen.getByRole('button', { name: 'Feather' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Eyedropper' })).toHaveAttribute('aria-pressed', 'false');
    // tool row is display state → the honest toast fired
    expect(S().toasts.at(-1)).toMatchObject({ kind: 'info', title: 'Color params' });
  });
});

describe('ColorNodeGraph (color_grading_node_graph.html — left dock)', () => {
  const nodeNames = [
    'Master Input node',
    'Primary node 01',
    'Secondary node 02',
    'Water node 03',
    'Mixer node',
    'Tilt Shift node 05',
    'Lens Flare node 06',
    'Master Output node',
  ];

  it('renders the 8-node reference topology + 8 straight edges', () => {
    const { container } = render(<ColorNodeGraph />);
    expect(screen.getByTestId('shell-color-nodegraph')).toBeInTheDocument();
    for (const name of nodeNames) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    // nodes are real <button>s — natively focusable, keyboard tab order = DOM order
    for (const name of nodeNames) {
      const btn = screen.getByRole('button', { name }) as HTMLButtonElement;
      expect(btn.tagName).toBe('BUTTON');
      btn.focus();
      expect(document.activeElement).toBe(btn);
    }
    const lines = container.querySelectorAll('svg line');
    expect(lines).toHaveLength(8);
    // straight 2px edges, --node-edge color
    const line = lines[0] as SVGLineElement;
    expect(line.getAttribute('stroke')).toBe('var(--node-edge)');
    expect(line.getAttribute('stroke-width')).toBe('2');
  });

  it('selection is real local state: click selects, ONE selected, click again deselects', () => {
    render(<ColorNodeGraph />);
    // reference default: Lens Flare carries the static .selected class
    expect(screen.getByRole('button', { name: 'Lens Flare node 06' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Water node 03' }));
    expect(screen.getByRole('button', { name: 'Water node 03' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Lens Flare node 06' })).toHaveAttribute('aria-pressed', 'false');
    // exactly one node selected (filter by node testids — the toolbar toggles
    // carry their own aria-pressed)
    const pressedNodes = document
      .querySelectorAll('[data-testid^="shell-color-node-"][aria-pressed="true"]');
    expect(pressedNodes).toHaveLength(1);
    // toggle off
    fireEvent.click(screen.getByRole('button', { name: 'Water node 03' }));
    expect(screen.getByRole('button', { name: 'Water node 03' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('toolbar: arrow/hand toggles + honest gesture-round toast on hand', () => {
    render(<ColorNodeGraph />);
    const arrow = screen.getByRole('button', { name: 'Arrow tool' });
    const hand = screen.getByRole('button', { name: 'Hand tool' });
    expect(arrow).toHaveAttribute('aria-pressed', 'true');
    expect(hand).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(hand);
    expect(hand).toHaveAttribute('aria-pressed', 'true');
    expect(arrow).toHaveAttribute('aria-pressed', 'false');
    expect(S().toasts.at(-1)).toMatchObject({
      kind: 'info',
      title: 'Node graph',
      detail: 'node graph controls are display state — drag / pan / zoom land in the interaction round (R19-TODO)',
    });
    // node selection itself stays real (no toast on selecting a node)
    const before = S().toasts.length;
    fireEvent.click(screen.getByRole('button', { name: 'Primary node 01' }));
    expect(S().toasts).toHaveLength(before);
  });

  it('renders the Clip chip + zoom look + page dots', () => {
    render(<ColorNodeGraph />);
    expect(screen.getByTestId('shell-color-nodegraph-clip')).toHaveTextContent('Clip');
    expect(screen.getByRole('button', { name: 'Node page 1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Node page 2' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Node graph menu' })).toBeInTheDocument();
  });
});

describe('ColorScopesDock (color_grading_scopes.html — under viewer)', () => {
  it('renders the 4 quadrant headers + 4 named role=img canvases', () => {
    render(<ColorScopesDock />);
    expect(screen.getByTestId('shell-color-scopes')).toBeInTheDocument();
    for (const label of ['Parade', 'Waveform', 'Vectorscope', 'Histogram']) {
      expect(screen.getByRole('button', { name: `${label} mode` })).toBeInTheDocument();
      expect(screen.getByTestId(`shell-color-scope-${label.toLowerCase()}`)).toBeInTheDocument();
    }
    for (const aria of ['RGB parade scope', 'Waveform scope', 'Vectorscope scope', 'Histogram scope']) {
      expect(screen.getByRole('img', { name: aria })).toBeInTheDocument();
    }
  });

  it('collapse chevron hides and restores the grid (real local state)', () => {
    render(<ColorScopesDock />);
    const collapse = screen.getByTestId('shell-color-scopes-collapse');
    expect(collapse).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('shell-color-scopes-grid')).toBeInTheDocument();
    fireEvent.click(collapse);
    expect(collapse).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('shell-color-scopes-grid')).toBeNull();
    // collapsed dock is just the header strip
    expect(screen.getByText('Scopes')).toBeInTheDocument();
    fireEvent.click(collapse);
    expect(screen.getByTestId('shell-color-scopes-grid')).toBeInTheDocument();
  });

  it('scope settings answer with the honest seeded-data toast (once per mount)', () => {
    render(<ColorScopesDock />);
    fireEvent.click(screen.getByRole('button', { name: 'Scopes settings' }));
    expect(S().toasts).toHaveLength(1);
    expect(S().toasts[0]).toMatchObject({
      kind: 'info',
      title: 'Scopes',
      detail: 'scope traces are seeded display data — live scopes land with the render round (spec 08 §4)',
    });
    // per-scope header controls share the one-shot (no repeat)
    fireEvent.click(screen.getByRole('button', { name: 'Parade mode' }));
    fireEvent.click(screen.getByRole('button', { name: 'Histogram settings' }));
    expect(S().toasts).toHaveLength(1);
  });
});

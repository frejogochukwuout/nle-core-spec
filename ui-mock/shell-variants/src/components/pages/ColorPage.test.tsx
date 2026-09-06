/* ColorPage + the R20-W4b/W4c color surfaces (spec 18 §4.8; DESIGN-R20 D3 /
   gaps C50/C51/C53/C54/C55/C56). CONTRACT CHANGE from R19-B4: the grading
   surfaces are STORE-DRIVEN (mockGrades sidecar, spec 08 §4.2/§8.1 field
   names verbatim) — every control asserts its STORE WRITE; the YRGB rows
   are DERIVED read-only readouts; the qualifier is the spec-shaped HSL
   keyer params; the curves editor edits the record's curve points; the
   node graph selection binds to the console's tab routing; the scope strip
   is REAL since W4c (fed by the graded-frame bus; the seeded-trace dock is
   deleted, C53) — the strip's own drawing tests live in
   ColorScopeStrip.test.tsx. */

import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import {
  ColorPage,
  ColorNodeGraph,
  ColorScopeStrip,
  ColorInspector,
  WheelsPanel,
  CurvesPanel,
  QualifierPanel,
} from './ColorPage';
import { useUi, TIMELINE_GRADE_KEY } from '../../state/useUiStore';
import { DEFAULT_GRADE, DEFAULT_QUALIFIER } from '../../lib/color';

const S = () => useUi.getState();

type Patch = Partial<ReturnType<typeof useUi.getState>>;

const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

const setStore = (patch?: Patch) => {
  useUi.setState({
    page: 'color', mockGrades: {}, past: [], future: [], colorInspectorTab: 'primaries',
    colorGradeTarget: 'clip', qualifierPreviewOn: false, selectedColorNodeId: 'primary',
    selection: ['el-2'], toasts: [],
    ...patch,
  });
};

const boot = (patch?: Patch) => {
  setStore(patch);
  return render(<ColorPage />);
};

beforeEach(() => {
  useUi.setState({ toasts: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const mockBox = (w = 400, h = 400) => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, top: 0, left: 0, width: w, height: h, right: w, bottom: h, toJSON: () => ({}),
  } as DOMRect);
};

/** boots the store + mounts the panel under test (solo — one render per test). */
const mountPanel = (ui: React.ReactElement, patch?: Patch) => {
  setStore(patch);
  return render(ui);
};

describe('ColorPage (spec 18 §4.8 — the inspector slot carries the color tools)', () => {
  it('renders the page root with the color inspector', () => {
    boot();
    expect(screen.getByTestId('shell-color')).toBeInTheDocument();
    expect(screen.getByText('inspector — clip-level color tools as tabs (spec 18 §4.8, R22)')).toBeInTheDocument();
    expect(screen.getByTestId('shell-color-inspector')).toBeInTheDocument();
  });
});

describe('WheelsPanel (Primaries — store-driven GradeParams)', () => {
  const mountWheels = (patch?: Patch) => mountPanel(<WheelsPanel />, patch);

  it('renders all four wheels; YRGB rows are DERIVED readouts at the spec defaults', () => {
    mountWheels();
    for (const key of ['lift', 'gamma', 'gain', 'offset']) {
      expect(screen.getByTestId(`shell-color-wheel-${key}`)).toBeInTheDocument();
    }
    for (const label of ['Lift', 'Gamma', 'Gain', 'Offset']) {
      expect(screen.getByRole('img', { name: `${label} color wheel` })).toBeInTheDocument();
    }
    // spec defaults (DEFAULT_GRADE): Y = the scalar, R/G/B = t_c·amount
    expect(screen.getByLabelText('Lift Y')).toHaveTextContent('0.00');
    expect(screen.getByLabelText('Gain Y')).toHaveTextContent('1.00');
    expect(screen.queryByLabelText('Offset Y')).toBeNull(); // offset is RGB-only
    expect(screen.getByLabelText('Offset R')).toHaveTextContent('0.00');
    // luma thumbwheels carry the spec scalar bounds
    expect(screen.getByRole('slider', { name: 'Lift luma' })).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByRole('slider', { name: 'Gamma luma' })).toHaveAttribute('aria-valuenow', '1');
  });

  it('top controls + master sliders show the spec 08 §4.2 defaults', () => {
    mountWheels();
    expect(input('Temp value')).toHaveValue('0.0');
    expect(input('Tint value')).toHaveValue('0.00');
    expect(input('Contrast value')).toHaveValue('1.000');
    expect(input('Pivot value')).toHaveValue('0.435');
    expect(input('Mid/Detail value')).toHaveValue('0.00');
    expect(input('Color Boost value')).toHaveValue('0.00');
    expect(input('Saturation value')).toHaveValue('0.00'); // spec: −100..100, 0 = neutral
    expect(input('Hue value')).toHaveValue('50.00');       // spec: 50 = no-op
    expect(input('Lum Mix value')).toHaveValue('100.00');
    for (const label of ['Contrast', 'Pivot', 'Mid/Detail', 'Color Boost', 'Shadows', 'Highlights', 'Saturation', 'Hue', 'Lum Mix']) {
      expect(screen.getByRole('slider', { name: label })).toBeInTheDocument();
    }
  });

  it('EVERY control writes its GradeParams field: sliders, numeric cells, thumbwheels', () => {
    mountWheels();
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Contrast' }), { key: 'ArrowRight' });
    expect(S().mockGrades['el-2'].contrast).toBeCloseTo(1.005, 5);
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Pivot' }), { key: 'ArrowRight' });
    expect(S().mockGrades['el-2'].pivot).toBeCloseTo(DEFAULT_GRADE.pivot + 0.005, 5);
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Shadows' }), { key: 'ArrowRight' });
    expect(S().mockGrades['el-2'].shadows).toBe(1);
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Lift luma' }), { key: 'ArrowRight' });
    expect(S().mockGrades['el-2'].lift).toBeCloseTo(0.001, 5);
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Offset luma' }), { key: 'ArrowLeft' });
    expect(S().mockGrades['el-2'].offset).toBeCloseTo(-0.001, 5);
    const cb = input('Color Boost value');
    fireEvent.change(cb, { target: { value: '12' } });
    fireEvent.blur(cb);
    expect(S().mockGrades['el-2'].colorBoost).toBe(12);
    const lm = input('Lum Mix value');
    fireEvent.change(lm, { target: { value: '80' } });
    fireEvent.blur(lm);
    expect(S().mockGrades['el-2'].lumMix).toBe(80);
  });

  it('derived YRGB readouts follow the store (offset ×1023; YRGB read-only)', () => {
    mockBox();
    mountWheels();
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Offset luma' }), { key: 'End' });
    expect(S().mockGrades['el-2'].offset).toBeCloseTo(0.2, 5);
    // R/G/B cells are t_c·amount — amount is still 0, so they read 0.00
    expect(screen.getByLabelText('Offset R')).toHaveTextContent('0.00');
    // drag the offset puck straight UP (θ=0 → hue 0 = red, amount 1)
    // → R cell = 1·1023 = 1023.00 (the ×1023 law, color-layout §3.5)
    const wheel = screen.getByTestId('shell-color-wheel-offset');
    fireEvent.pointerDown(wheel, { pointerId: 1, clientX: 200, clientY: 0, buttons: 1 });
    fireEvent.pointerUp(wheel, { pointerId: 1 });
    expect(S().mockGrades['el-2'].offHue).toBe(0);
    expect(S().mockGrades['el-2'].offAmount).toBeCloseTo(1, 2);
    expect(screen.getByLabelText('Offset R')).toHaveTextContent('1023.00');
  });

  it('the LOG toggle swaps the wheel labels + header (spec 08 defines no log math — labels only)', () => {
    mountWheels();
    const log = screen.getByTestId('shell-color-log-toggle');
    expect(log).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('shell-color-wheels-title')).toHaveTextContent('Primaries — Color Wheels');
    fireEvent.click(log);
    expect(log).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('shell-color-wheels-title')).toHaveTextContent('Primaries — LOG');
    expect(screen.getByRole('img', { name: 'Midtones color wheel' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Gamma color wheel' })).toBeNull();
    fireEvent.click(log);
    expect(screen.getByRole('img', { name: 'Gamma color wheel' })).toBeInTheDocument();
  });

  it('LUT select stays REAL display state: options, readout, own one-time toast', () => {
    mountWheels();
    const lut = screen.getByLabelText('LUT select') as HTMLSelectElement;
    expect(lut.options).toHaveLength(3);
    expect(within(lut).getByRole('option', { name: 'None', selected: true })).toBeInTheDocument();
    expect(screen.getByTestId('shell-color-lut-readout')).toHaveTextContent('LUT: None');

    fireEvent.change(lut, { target: { value: 'Kodak 2383' } });
    expect(screen.getByTestId('shell-color-lut-readout')).toHaveTextContent('LUT: Kodak 2383');
    expect(S().toasts.at(-1)).toMatchObject({
      kind: 'info',
      title: 'Color params',
      detail: 'LUT preview lands with the render round (spec 08)',
    });
    fireEvent.change(lut, { target: { value: 'Rec709 → sRGB' } });
    expect(S().toasts.at(-1)?.detail).toContain('LUT preview'); // one per mount
    expect(S().toasts.filter((t) => t.title === 'Color params')).toHaveLength(1);
  });

  it('first grade write fires ONE honest boundary toast per mount (the viewer preview deferral)', () => {
    mountWheels();
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Hue' }), { key: 'ArrowRight' });
    expect(S().toasts.at(-1)).toMatchObject({
      kind: 'info',
      title: 'Color grades',
      detail: 'grade values are real (mockGrades) — viewer preview renders with the canvas (spec 08 §12)',
    });
    const n = S().toasts.length;
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Saturation' }), { key: 'ArrowRight' });
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Lift luma' }), { key: 'ArrowLeft' });
    expect(S().toasts).toHaveLength(n);
  });

  it('the wheels panel standalone mounts with the same store contract (no props)', () => {
    mountWheels();
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Hue' }), { key: 'ArrowRight' });
    expect(S().mockGrades['el-2'].hue).toBe(51);
  });
});

describe('CurvesPanel (C55 — master RGB spline, record-stored points)', () => {
  const mountCurves = (patch?: Patch) => {
    setStore({ colorInspectorTab: 'curves', ...patch });
    return render(<CurvesPanel />);
  };
  it('boots at the identity diagonal: two endpoint points, monotone path renders', () => {
    mountCurves();
    expect(screen.getByTestId('shell-color-curves')).toBeInTheDocument();
    expect(screen.getByTestId('shell-color-curves-title')).toHaveTextContent('Curves — Master RGB');
    expect(screen.getByTestId('shell-color-curve-point-0')).toBeInTheDocument();
    expect(screen.getByTestId('shell-color-curve-point-1')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-color-curve-point-2')).toBeNull();
    const editor = screen.getByTestId('shell-color-curve-editor');
    const path = editor.querySelector('svg path');
    expect(path?.getAttribute('d')).toMatch(/^M 0\.00 100\.00/); // identity = the diagonal
  });

  it('arrow keys move a point and WRITE the record (one commit per press)', () => {
    mountCurves();
    fireEvent.keyDown(screen.getByTestId('shell-color-curve-point-1'), { key: 'ArrowDown' });
    const pts = S().mockGrades['el-2'].curves?.master;
    expect(pts).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0.99 }]);
    expect(S().past).toHaveLength(1);
  });

  it('endpoints move in Y only; interior points cannot cross neighbors', () => {
    mountCurves();
    fireEvent.keyDown(screen.getByTestId('shell-color-curve-point-1'), { key: 'ArrowLeft' });
    expect(S().mockGrades['el-2'].curves?.master[1].x).toBe(1); // x locked on endpoints
    fireEvent.keyDown(screen.getByTestId('shell-color-curve-point-1'), { key: 'Home' });
    expect(S().mockGrades['el-2'].curves?.master[1].y).toBe(0);
  });

  it('double-click inserts a point ON the curve; Delete removes interior points; endpoints persist', () => {
    mockBox(400, 400);
    mountCurves();
    const editor = screen.getByTestId('shell-color-curve-editor');
    fireEvent.dblClick(editor, { clientX: 200, clientY: 100 }); // x=0.5 (y lands on the diagonal = 0.5)
    expect(S().mockGrades['el-2'].curves?.master).toHaveLength(3);
    const mid = S().mockGrades['el-2'].curves?.master[1];
    expect(mid?.x).toBeCloseTo(0.5, 5);
    expect(mid?.y).toBeCloseTo(0.5, 5);
    fireEvent.keyDown(screen.getByTestId('shell-color-curve-point-1'), { key: 'Delete' });
    expect(S().mockGrades['el-2'].curves?.master).toHaveLength(2);
    // endpoints are permanent
    fireEvent.keyDown(screen.getByTestId('shell-color-curve-point-0'), { key: 'Delete' });
    expect(S().mockGrades['el-2'].curves?.master).toHaveLength(2);
  });

  it('point drag is transient; pointer-up commits ONCE (the D3 gesture law)', () => {
    mockBox(400, 400);
    mountCurves();
    const p = screen.getByTestId('shell-color-curve-point-1');
    fireEvent.pointerDown(p, { pointerId: 1, clientX: 380, clientY: 100, buttons: 1 });
    fireEvent.pointerMove(p, { pointerId: 1, clientX: 380, clientY: 100, buttons: 1 });
    expect(S().past).toHaveLength(0); // no history during the drag
    fireEvent.pointerUp(p, { pointerId: 1 });
    expect(S().past).toHaveLength(1);
    const pt = S().mockGrades['el-2'].curves?.master[1];
    expect(pt?.x).toBe(1); // endpoint x locked
    expect(pt?.y).toBeCloseTo(0.75, 5);
  });

  it('reset restores the identity diagonal record', () => {
    mountCurves();
    fireEvent.keyDown(screen.getByTestId('shell-color-curve-point-1'), { key: 'ArrowDown' });
    fireEvent.click(screen.getByRole('button', { name: 'Reset curve' }));
    expect(S().mockGrades['el-2'].curves).toEqual({ master: [{ x: 0, y: 0 }, { x: 1, y: 1 }] });
  });
});

describe('QualifierPanel (C54 — spec 08 §8.1 store-driven keyer)', () => {
  const mountQualifier = (patch?: Patch) => {
    setStore({ colorInspectorTab: 'qualifier', ...patch });
    return render(<QualifierPanel />);
  };

  it('renders the three HSL sections + preview/invert toggles at the spec defaults', () => {
    mountQualifier();
    expect(screen.getByTestId('shell-color-qualifier')).toBeInTheDocument();
    expect(screen.getByTestId('shell-color-hue-range')).toBeInTheDocument();
    expect(screen.getByTestId('shell-color-sat-range')).toBeInTheDocument();
    expect(screen.getByTestId('shell-color-lum-range')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview matte' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Invert qualifier' })).toHaveAttribute('aria-pressed', 'false');
    expect(input('Hue Center')).toHaveValue(DEFAULT_QUALIFIER.hueCenter.toFixed(1));
    expect(input('Hue Width')).toHaveValue(DEFAULT_QUALIFIER.hueWidth.toFixed(1));
    expect(input('Hue Soft')).toHaveValue(DEFAULT_QUALIFIER.hueSoftness.toFixed(1));
    expect(input('Saturation Low')).toHaveValue('0.0');
    expect(input('Saturation High')).toHaveValue('100.0');
    expect(input('Luminance Low')).toHaveValue('0.0');
    expect(input('Luminance High')).toHaveValue('100.0');
  });

  it('dual-handle keyboard commits center/width (the bars and fields are ONE state)', () => {
    mountQualifier();
    const low = screen.getByRole('slider', { name: 'Hue range low' });
    // spec defaults: center 0, width 35 → clamped bar [0, 17.5]
    expect(low).toHaveAttribute('aria-valuenow', '0');
    fireEvent.keyDown(low, { key: 'ArrowRight' });
    const q = S().mockGrades['el-2'].qualifier;
    expect(q).toBeDefined();
    expect(q?.hueCenter).toBeCloseTo(10.55, 2); // (3.6 + 17.5)/2
    expect(q?.hueWidth).toBeCloseTo(13.9, 2);
  });

  it('sat/lum handles + fields write the 0..1 store fields (percent display)', () => {
    mountQualifier();
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Saturation range low' }), { key: 'ArrowRight' });
    expect(S().mockGrades['el-2'].qualifier?.satLow).toBeCloseTo(0.01, 5);
    const hi = input('Luminance High');
    fireEvent.change(hi, { target: { value: '60' } });
    fireEvent.blur(hi);
    expect(S().mockGrades['el-2'].qualifier?.lumaHigh).toBeCloseTo(0.6, 5);
  });

  it('invert + strength + secondary corrections all write the qualifier record', () => {
    mountQualifier();
    fireEvent.click(screen.getByTestId('shell-color-qualifier-invert'));
    expect(S().mockGrades['el-2'].qualifier?.invert).toBe(true);
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Qualifier strength' }), { key: 'ArrowLeft' });
    expect(S().mockGrades['el-2'].qualifier?.strength).toBeCloseTo(0.99, 5);
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Qualifier Exposure' }), { key: 'ArrowRight' });
    expect(S().mockGrades['el-2'].qualifier?.exposure).toBeCloseTo(0.05, 5);
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Qualifier Temperature' }), { key: 'ArrowRight' });
    expect(S().mockGrades['el-2'].qualifier?.temperature).toBe(1);
  });

  it('Preview matte toggles the qualifierPreviewOn view-state AND mirrors showMask (undoable)', () => {
    mountQualifier();
    fireEvent.click(screen.getByTestId('shell-color-qualifier-preview'));
    expect(S().qualifierPreviewOn).toBe(true);
    expect(S().mockGrades['el-2'].qualifier?.showMask).toBe(true);
    // the view-state never mints history; the record write does (ONE entry)
    expect(S().past).toHaveLength(1);
    fireEvent.click(screen.getByTestId('shell-color-qualifier-preview'));
    expect(S().qualifierPreviewOn).toBe(false);
    expect(S().mockGrades['el-2'].qualifier?.showMask).toBe(false);
  });

  it('reset qualifier clears the secondary node (record falls back to null)', () => {
    mountQualifier();
    fireEvent.click(screen.getByTestId('shell-color-qualifier-invert'));
    expect(S().mockGrades['el-2'].qualifier).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reset qualifier' }));
    expect(S().mockGrades['el-2'].qualifier).toBeNull();
  });

  it('the 14-field matte-finesse block is GONE (no spec 08 §8 counterpart — C54 honesty)', () => {
    mountQualifier();
    expect(document.querySelectorAll('[data-testid^="shell-color-matte-"]')).toHaveLength(0);
  });

  it('R20-W4c: the EYEDROPPER toggle arms/disarms the viewer picker (view-state)', () => {
    mountQualifier();
    const picker = screen.getByTestId('shell-color-qualifier-picker');
    expect(picker).toHaveAttribute('aria-pressed', 'false');
    expect(S().qualifierPickerOn).toBe(false);
    fireEvent.click(picker);
    expect(picker).toHaveAttribute('aria-pressed', 'true');
    expect(S().qualifierPickerOn).toBe(true);
    expect(S().past).toHaveLength(0); // view-state, NEVER a history entry
    fireEvent.click(picker);
    expect(S().qualifierPickerOn).toBe(false);
  });
});

describe('ColorNodeGraph (left dock — reference topology kept, C56 binding)', () => {
  const nodeNames = [
    'Master Input node', 'Primary node 01', 'Secondary node 02', 'Water node 03',
    'Mixer node', 'Tilt Shift node 05', 'Lens Flare node 06', 'Master Output node',
  ];

  it('renders the 8-node reference topology + 8 straight edges', () => {
    const { container } = render(<ColorNodeGraph />);
    expect(screen.getByTestId('shell-color-nodegraph')).toBeInTheDocument();
    for (const name of nodeNames) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    const lines = container.querySelectorAll('svg line');
    expect(lines).toHaveLength(8);
    expect((lines[0] as SVGLineElement).getAttribute('stroke')).toBe('var(--node-edge)');
    expect((lines[0] as SVGLineElement).getAttribute('stroke-width')).toBe('2');
  });

  it('default selection = the PRIMARY node (the bound surface), not the reference static class', () => {
    render(<ColorNodeGraph />);
    expect(screen.getByRole('button', { name: 'Primary node 01' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Lens Flare node 06' })).toHaveAttribute('aria-pressed', 'false');
    const pressed = document.querySelectorAll('[data-testid^="shell-color-node-"][aria-pressed="true"]');
    expect(pressed).toHaveLength(1);
  });

  it('toolbar: arrow/hand toggles + honest gesture-round toast on hand', () => {
    render(<ColorNodeGraph />);
    const arrow = screen.getByRole('button', { name: 'Arrow tool' });
    const hand = screen.getByRole('button', { name: 'Hand tool' });
    fireEvent.click(hand);
    expect(hand).toHaveAttribute('aria-pressed', 'true');
    expect(arrow).toHaveAttribute('aria-pressed', 'false');
    expect(S().toasts.at(-1)).toMatchObject({
      kind: 'info',
      title: 'Node graph',
      detail: 'node graph controls are display state — drag / pan / zoom land in the interaction round (R19-TODO)',
    });
  });

  it('renders the Clip chip + zoom look + page dots', () => {
    render(<ColorNodeGraph />);
    expect(screen.getByTestId('shell-color-nodegraph-clip')).toHaveTextContent('Clip');
    expect(screen.getByRole('button', { name: 'Node page 1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Node graph menu' })).toBeInTheDocument();
  });
});

describe('ColorScopeStrip (C53 — real since W4c; solo = no bus frame yet)', () => {
  it('standby quadrants + the live status line + collapse (testids stable from W4b)', () => {
    act(() => { useUi.setState({ colorScopesState: 'grid' }); }); // R22-D3: solo mounts boot the dock OPEN
    render(<ColorScopeStrip />);
    expect(screen.getByTestId('shell-color-scopes')).toBeInTheDocument();
    expect(screen.getByTestId('shell-color-scopes-status')).toHaveTextContent(/standby — no graded frame/);
    for (const kind of ['waveform', 'parade', 'vectorscope', 'histogram']) {
      expect(screen.getByTestId(`shell-color-scope-${kind}`)).toHaveTextContent(/no signal/);
    }
    const collapse = screen.getByTestId('shell-color-scopes-collapse');
    expect(collapse).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(collapse);
    expect(screen.queryByTestId('shell-color-scopes-grid')).toBeNull();
    fireEvent.click(collapse);
    expect(screen.getByTestId('shell-color-scopes-grid')).toBeInTheDocument();
  });

  it('the seam stays live: qualifierPreviewOn shows in the status line', () => {
    act(() => { useUi.setState({ colorScopesState: 'grid' }); });
    render(<ColorScopeStrip />);
    expect(screen.getByTestId('shell-color-scopes-status')).not.toHaveTextContent(/matte preview on/);
    act(() => { useUi.setState({ qualifierPreviewOn: true }); });
    expect(screen.getByTestId('shell-color-scopes-status')).toHaveTextContent(/matte preview on/);
  });
});

describe('ColorInspector (C51 fold — the W3 grammar, same target resolver)', () => {
  it('chip shows WHICH target; the Timeline target adds the Timeline grade badge', () => {
    mountPanel(<ColorInspector />);
    expect(screen.getByTestId('shell-color-inspector-chip')).toHaveTextContent('Marina interview');
    expect(screen.queryByTestId('shell-color-inspector-timeline-badge')).toBeNull();
    act(() => { useUi.setState({ colorGradeTarget: 'timeline' }); });
    expect(screen.getByTestId('shell-color-inspector-chip')).toHaveTextContent('Timeline');
    expect(screen.getByTestId('shell-color-inspector-timeline-badge')).toBeInTheDocument();
  });

  it('R22 (#78): the inspector carries the PANELS as tabs — the wheels mount on Primaries', () => {
    mountPanel(<ColorInspector />);
    // the wheels reference anatomy: 4 wheel headers ride the panel body
    expect(screen.getByTestId('shell-color-inspector-tab-primaries')).toHaveAttribute('aria-selected', 'true');
    for (const w of ['Lift', 'Gamma', 'Gain', 'Offset']) {
      expect(screen.getByText(w)).toBeInTheDocument();
    }
  });

  it('the store round-trips through the SAME resolver (single-owner law, store-level)', () => {
    mountPanel(<ColorInspector />);
    act(() => { useUi.getState().setGrade('el-2', { exposure: 0.5, temperature: 12 }); });
    expect(S().mockGrades['el-2'].exposure).toBe(0.5);
    expect(S().mockGrades['el-2'].temperature).toBe(12);
    // timeline target: the SAME record domain writes the timeline record
    act(() => { useUi.setState({ colorGradeTarget: 'timeline' }); });
    act(() => { useUi.getState().setGrade(TIMELINE_GRADE_KEY, { exposure: 1.5 }); });
    expect(S().mockGrades[TIMELINE_GRADE_KEY].exposure).toBe(1.5);
    expect(S().mockGrades['el-2'].exposure).toBe(0.5); // clip record untouched
  });
});

/* ColorPage + the R20-W4b/W4c color surfaces (spec 18 §4.8; DESIGN-R20 D3 /
   gaps C50/C51/C53/C54/C55/C56). CONTRACT CHANGE from R19-B4: the grading
   surfaces are STORE-DRIVEN (mockGrades sidecar, spec 08 §4.2/§8.1 field
   names verbatim) — every control asserts its STORE WRITE; the YRGB rows
   are DERIVED read-only readouts; the qualifier is the spec-shaped HSL
   keyer params; the curves editor edits the record's curve points; the
   node graph selection binds to the console's tab routing; the scopes are
   REAL since W4c (fed by the graded-frame bus; the seeded-trace dock is
   deleted, C53; R23-WB: the strip became the tabbed ScopesDock, D-B1) —
   the dock's own drawing tests live in ScopesDock.test.tsx. */

import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import {
  ColorPage,
  ColorNodeGraph,
  ScopesDock,
  ColorInspector,
  WheelsPanel,
  CurvesPanel,
  QualifierPanel,
} from './ColorPage';
import { useUi, TIMELINE_GRADE_KEY } from '../../state/useUiStore';
import { DEFAULT_GRADE, DEFAULT_QUALIFIER, luma601 } from '../../lib/color';
import { publishGradedFrame, __clearGradedFrameBus } from './color/gradedFrameBus';
import { makeTestImageData } from '../../test/canvas2d';

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

describe('CurvesPanel (C55 → R24-W2 A2-R4 — the YRGB rebuild, issue #69)', () => {
  const mountCurves = (patch?: Patch) => {
    setStore({ colorInspectorTab: 'curves', ...patch });
    return render(<CurvesPanel />);
  };

  /* the graded-frame bus half of the histogram seam (the ScopesDock law) */
  const redFrame = () =>
    publishGradedFrame({ imageData: makeTestImageData(8, 4, () => [255, 0, 0]), width: 8, height: 4, mediaId: 'm-02', elementId: 'el-2', mode: 'program' as const });
  const grayFrame = () =>
    publishGradedFrame({ imageData: makeTestImageData(8, 4, () => [128, 128, 128]), width: 8, height: 4, mediaId: 'm-02', elementId: 'el-2', mode: 'program' as const });

  it('boots at the identity diagonal on Y: two endpoint handles, the monotone path, NO readout/footer', () => {
    mountCurves();
    expect(screen.getByTestId('shell-color-curves')).toBeInTheDocument();
    expect(screen.getByTestId('shell-color-curves-title')).toHaveTextContent('Curves');
    expect(screen.getByTestId('shell-color-curve-point-0')).toBeInTheDocument();
    expect(screen.getByTestId('shell-color-curve-point-1')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-color-curve-point-2')).toBeNull();
    const editor = screen.getByTestId('shell-color-curve-editor');
    const path = editor.querySelector('svg path');
    expect(path?.getAttribute('d')).toMatch(/^M 0\.00 100\.00/); // identity = the diagonal
    // A2-R4: the readout row + footer are DELETED
    expect(screen.queryByTestId('shell-color-curve-readout')).toBeNull();
    // square aspect + the max-w-[360px] cap
    expect(editor).toHaveClass('max-w-[360px]');
    expect(editor).toHaveStyle({ aspectRatio: '1 / 1' });
  });

  it('the [Y|R|G|B] radiogroup: four radios, Y checked, arrow roving selects + focuses (wrap)', () => {
    mountCurves();
    const group = screen.getByRole('radiogroup', { name: 'Curve channel' });
    expect(group).toBeInTheDocument();
    for (const id of ['y', 'r', 'g', 'b']) {
      expect(screen.getByTestId(`shell-color-curves-channel-${id}`)).toHaveAttribute('role', 'radio');
    }
    expect(screen.getByTestId('shell-color-curves-channel-y')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('shell-color-curves-channel-r')).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(screen.getByTestId('shell-color-curves-channel-r')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('shell-color-curves-channel-r')).toHaveFocus();
    // wrap: ← from the FIRST (Y) lands on the LAST (B)
    fireEvent.click(screen.getByTestId('shell-color-curves-channel-y'));
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(screen.getByTestId('shell-color-curves-channel-b')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('shell-color-curves-channel-b')).toHaveFocus();
    fireEvent.click(screen.getByTestId('shell-color-curves-channel-y'));
    expect(screen.getByTestId('shell-color-curves-channel-y')).toHaveAttribute('aria-checked', 'true');
  });

  it('grid grammar: the 25% grid + center crosshair + the SOLID 25%-white diagonal (the dashed diagonal is dead)', () => {
    mountCurves();
    const svg = screen.getByTestId('shell-color-curve-editor').querySelector('svg')!;
    const lines = Array.from(svg.querySelectorAll('line'));
    // 10 grid lines (5 vertical + 5 horizontal at 0/25/50/75/100) + the 2
    // crosshair lines + the diagonal reference
    expect(lines).toHaveLength(13);
    const diagonal = lines.find((l) => l.getAttribute('x1') === '0' && l.getAttribute('y1') === '100' && l.getAttribute('x2') === '100' && l.getAttribute('y2') === '0')!;
    expect(diagonal.getAttribute('stroke')).toBe('rgba(255,255,255,0.25)'); // SOLID 25% white
    expect(diagonal.getAttribute('stroke-dasharray')).toBeNull();           // the dashed diagonal died
    // the center crosshair
    expect(lines.some((l) => l.getAttribute('x1') === '50' && l.getAttribute('x2') === '50')).toBe(true);
    expect(lines.some((l) => l.getAttribute('y1') === '50' && l.getAttribute('y2') === '50')).toBe(true);
  });

  it('the 10px white handles with the 1.5px dark ring + the accent ring classes (A2-R4)', () => {
    mountCurves();
    const p = screen.getByTestId('shell-color-curve-point-1');
    expect(p).toHaveClass('h-[10px]');
    expect(p).toHaveClass('w-[10px]');
    expect(p).toHaveClass('border-[1.5px]');
    expect(p).toHaveClass('bg-white');
    expect(p).toHaveClass('hover:ring-2');
    expect(p).toHaveClass('hover:ring-[var(--accent)]');
    expect(p).toHaveClass('active:ring-2');
    expect(p).toHaveClass('active:ring-[var(--accent)]');
  });

  it('arrow keys move a point and WRITE the record on the ACTIVE channel (one commit per press)', () => {
    mountCurves();
    fireEvent.keyDown(screen.getByTestId('shell-color-curve-point-1'), { key: 'ArrowDown' });
    // the Y channel is untagged storage (the legacy master seam)
    expect(S().mockGrades['el-2'].curves?.master).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0.99 }]);
    expect(S().past).toHaveLength(1);
  });

  it('a channel edit lands TAGGED: the R channel writes r-tagged points while Y stays untouched', () => {
    mockBox(400, 400);
    mountCurves();
    fireEvent.click(screen.getByTestId('shell-color-curves-channel-r'));
    // single-click insert on the R channel at x=0.5
    fireEvent.click(screen.getByTestId('shell-color-curve-editor'), { clientX: 200, clientY: 200 });
    const master = S().mockGrades['el-2'].curves?.master;
    expect(master).toHaveLength(3); // the two R endpoints + the inserted mid — Y is absent
    expect(master?.every((p) => p.ch === 'r')).toBe(true);
    expect(master?.[1]).toMatchObject({ x: 0.5, ch: 'r' });
    // the editor shows the R channel's three handles
    expect(screen.getByTestId('shell-color-curve-point-2')).toBeInTheDocument();
  });

  it('endpoints move in Y only; interior points cannot cross neighbors (per channel)', () => {
    mountCurves();
    fireEvent.keyDown(screen.getByTestId('shell-color-curve-point-1'), { key: 'ArrowLeft' });
    expect(S().mockGrades['el-2'].curves?.master[1].x).toBe(1); // x locked on endpoints
    fireEvent.keyDown(screen.getByTestId('shell-color-curve-point-1'), { key: 'Home' });
    expect(S().mockGrades['el-2'].curves?.master[1].y).toBe(0);
  });

  it('SINGLE-CLICK inserts a point ON the curve; the 8% near-band SNAPS to the nearest handle instead', () => {
    mockBox(400, 400);
    mountCurves();
    const editor = screen.getByTestId('shell-color-curve-editor');
    // a plain click at x=0.5 (y lands on the diagonal = 0.5)
    fireEvent.click(editor, { clientX: 200, clientY: 200 });
    expect(S().mockGrades['el-2'].curves?.master).toHaveLength(3);
    const mid = S().mockGrades['el-2'].curves?.master[1];
    expect(mid?.x).toBeCloseTo(0.5, 5);
    expect(mid?.y).toBeCloseTo(0.5, 5);
    // a click INSIDE the 8% band of the new handle (x=0.5 → click at 0.54) —
    // no second point, the nearest handle takes focus instead
    fireEvent.click(editor, { clientX: 216, clientY: 200 });
    expect(S().mockGrades['el-2'].curves?.master).toHaveLength(3);
    expect(screen.getByTestId('shell-color-curve-point-1')).toHaveFocus();
    // OUTSIDE the band (x=0.65) inserts again
    fireEvent.click(editor, { clientX: 260, clientY: 200 });
    expect(S().mockGrades['el-2'].curves?.master).toHaveLength(4);
  });

  it('Delete removes interior points; right-click removes interior points; endpoints are immutable', () => {
    mockBox(400, 400);
    mountCurves();
    fireEvent.click(screen.getByTestId('shell-color-curve-editor'), { clientX: 200, clientY: 200 });
    expect(S().mockGrades['el-2'].curves?.master).toHaveLength(3);
    // Delete key on the interior point
    fireEvent.keyDown(screen.getByTestId('shell-color-curve-point-1'), { key: 'Delete' });
    expect(S().mockGrades['el-2'].curves?.master).toHaveLength(2);
    // right-click on an interior point removes it too (the browser menu is suppressed)
    fireEvent.click(screen.getByTestId('shell-color-curve-editor'), { clientX: 200, clientY: 200 });
    fireEvent.contextMenu(screen.getByTestId('shell-color-curve-point-1'));
    expect(S().mockGrades['el-2'].curves?.master).toHaveLength(2);
    // endpoints are permanent — Delete and right-click are both no-ops there
    fireEvent.keyDown(screen.getByTestId('shell-color-curve-point-0'), { key: 'Delete' });
    fireEvent.contextMenu(screen.getByTestId('shell-color-curve-point-0'));
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

  it('LOST-POINTER-CAPTURE COMMITS — the terminal gesture event lands the buffer (the color-family law)', () => {
    mockBox(400, 400);
    mountCurves();
    const p = screen.getByTestId('shell-color-curve-point-1');
    fireEvent.pointerDown(p, { pointerId: 1, clientX: 380, clientY: 100, buttons: 1 });
    fireEvent.pointerMove(p, { pointerId: 1, clientX: 380, clientY: 120, buttons: 1 });
    fireEvent(p, new Event('lostpointercapture', { bubbles: true }));
    expect(S().past).toHaveLength(1); // committed without a pointerup
    expect(S().mockGrades['el-2'].curves?.master[1].y).toBeCloseTo(0.7, 5);
  });

  it('reset restores the ACTIVE channel to identity (the other channels survive)', () => {
    mockBox(400, 400);
    mountCurves();
    // an r-channel curve exists (its 3 tagged points)
    fireEvent.click(screen.getByTestId('shell-color-curves-channel-r'));
    fireEvent.click(screen.getByTestId('shell-color-curve-editor'), { clientX: 200, clientY: 200 });
    // a y curve too (2 untagged points)
    fireEvent.click(screen.getByTestId('shell-color-curves-channel-y'));
    fireEvent.keyDown(screen.getByTestId('shell-color-curve-point-1'), { key: 'ArrowDown' });
    expect(S().mockGrades['el-2'].curves?.master).toHaveLength(5); // 2 y + 3 r
    // reset while Y is active → Y identity, the r channel untouched
    fireEvent.click(screen.getByRole('button', { name: 'Reset curve' }));
    const master = S().mockGrades['el-2'].curves?.master;
    expect(master).toHaveLength(3); // the r channel's 3 points survive
    expect(master?.every((p) => p.ch === 'r')).toBe(true);
  });

  it('the ~64-bin channel histogram: no frame → absent; a frame paints BEHIND the grid; the channel picks which histogram', async () => {
    vi.useFakeTimers();
    try {
      mountCurves();
      expect(screen.queryByTestId('shell-color-curve-histogram')).toBeNull(); // no graded frame yet
      act(() => { redFrame(); });
      await act(async () => { vi.advanceTimersByTime(0); });
      // red → the Y channel: BT.601 luma of red ≈ 76.2 → bin 19 of 64
      const histY = screen.getByTestId('shell-color-curve-histogram');
      expect(histY.querySelectorAll('rect')).toHaveLength(1);
      expect(Number(histY.querySelector('rect')!.getAttribute('x'))).toBeCloseTo((19 * 100) / 64, 1);
      // switch to R → the R channel histogram (red 255 → the LAST bin)
      fireEvent.click(screen.getByTestId('shell-color-curves-channel-r'));
      await act(async () => { vi.advanceTimersByTime(0); });
      const histR = screen.getByTestId('shell-color-curve-histogram');
      expect(Number(histR.querySelector('rect')!.getAttribute('x'))).toBeCloseTo((63 * 100) / 64, 1);
    } finally {
      vi.useRealTimers();
      __clearGradedFrameBus();
    }
  });

  it('the histogram rides the family 10fps throttle: a second frame inside the window defers, latest wins', async () => {
    vi.useFakeTimers();
    try {
      mountCurves();
      act(() => { redFrame(); });
      await act(async () => { vi.advanceTimersByTime(0); });
      const binOf = () => Number(screen.getByTestId('shell-color-curve-histogram').querySelector('rect')!.getAttribute('x'));
      expect(binOf()).toBeCloseTo((19 * 100) / 64, 1); // red's luma bin
      act(() => { grayFrame(); }); // inside the 100ms window
      expect(binOf()).toBeCloseTo((19 * 100) / 64, 1); // deferred — nothing yet
      await act(async () => { vi.advanceTimersByTime(100); });
      // gray 128: BT.601 luma lands at 127.999… in fp → bin 31 (derived from
      // the same luma601 the panel uses — the pin never fights the fp)
      const grayBin = Math.min(63, Math.floor((luma601(128, 128, 128) / 256) * 64));
      expect(binOf()).toBeCloseTo((grayBin * 100) / 64, 1);
    } finally {
      vi.useRealTimers();
      __clearGradedFrameBus();
    }
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

  /* R23-FIX (review-sweep item 16, R4-P2#1): Home on the HI handle clamps
     to the separation law — hi >= lo + 2% AND >= min + 2%. The old write
     (min + 2·span/100) landed BELOW a high lo, inverting lo/hi. Pin: with
     satLow at 0.9, Home on hi keeps satHigh >= satLow. */
  it('R23-FIX item 16: Home on the hi handle never inverts lo/hi (satHigh >= satLow)', () => {
    mountQualifier();
    const lo = input('Saturation Low');
    fireEvent.change(lo, { target: { value: '90' } });
    fireEvent.blur(lo);
    expect(S().mockGrades['el-2'].qualifier?.satLow).toBeCloseTo(0.9, 5);
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Saturation range high' }), { key: 'Home' });
    const q = S().mockGrades['el-2'].qualifier!;
    expect(q.satHigh).toBeCloseTo(0.92, 5); // lo + 2% — the separation law wins
    expect(q.satHigh).toBeGreaterThanOrEqual(q.satLow); // never inverted
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

  /* R24-W5c (DESIGN-R24 §2 F4-P3): the W5a resetTo hand-off — the
     qualifier's 5 MicroSliders (strength + the 4 §17.E corrections)
     thread the spec 08 defaults so dbl-click resets honestly (the
     no-default no-op law of controls.test; never a fabricated midpoint). */
  it('R24-W5c (W5a hand-off): dbl-click on the qualifier sliders writes the SPEC DEFAULT (5/5 threaded)', () => {
    mountQualifier();
    // move all five off-default through the store seam first
    act(() => {
      S().setGrade('el-2', { qualifier: { strength: 0.5, exposure: 0.75, saturation: 30, temperature: 20, tint: -40 } });
    });
    const q0 = S().mockGrades['el-2'].qualifier!;
    expect(q0.strength).toBeCloseTo(0.5, 5);
    expect(q0.exposure).toBeCloseTo(0.75, 5);
    fireEvent.doubleClick(screen.getByRole('slider', { name: 'Qualifier strength' }));
    expect(S().mockGrades['el-2'].qualifier?.strength).toBe(1); // DEFAULT_QUALIFIER.strength (display 100)
    fireEvent.doubleClick(screen.getByRole('slider', { name: 'Qualifier Exposure' }));
    expect(S().mockGrades['el-2'].qualifier?.exposure).toBe(0);
    fireEvent.doubleClick(screen.getByRole('slider', { name: 'Qualifier Saturation' }));
    expect(S().mockGrades['el-2'].qualifier?.saturation).toBe(0);
    fireEvent.doubleClick(screen.getByRole('slider', { name: 'Qualifier Temperature' }));
    expect(S().mockGrades['el-2'].qualifier?.temperature).toBe(0);
    fireEvent.doubleClick(screen.getByRole('slider', { name: 'Qualifier Tint' }));
    expect(S().mockGrades['el-2'].qualifier?.tint).toBe(0);
  });

  /* R24-W5c (F4-P3): the RangeWidget handle's pointer capture is guarded —
     the Fader/Knob/PanBox law (a synthetic/inactive pointer id throws
     NotFoundError in real browsers; jsdom's setup stub no-ops, so the throw
     is stubbed in). The old unguarded call died before the handle math. */
  it('R24-W5c F4: a bogus pointer id on a range handle never throws — the guarded capture keeps the gesture alive', () => {
    mountQualifier();
    mockBox(); // the hue bar measures 400px: clientX 120 → 30% → v=108
    const lo = screen.getByRole('slider', { name: 'Hue range low' });
    const real = Element.prototype.setPointerCapture;
    Element.prototype.setPointerCapture = () => {
      throw new DOMException('Invalid pointer id', 'NotFoundError');
    };
    try {
      expect(() => fireEvent.pointerDown(lo, { pointerId: 9999, clientX: 120 })).not.toThrow();
      fireEvent.pointerUp(lo, { pointerId: 9999 });
    } finally {
      Element.prototype.setPointerCapture = real;
    }
    // the gesture COMMITTED through the store seam (the handler survived
    // the capture throw; the separation law clamped lo to hi − 2%: 10.3/17.5)
    expect(S().mockGrades['el-2'].qualifier?.hueCenter).toBeCloseTo(13.9, 2);
    expect(S().mockGrades['el-2'].qualifier?.hueWidth).toBeCloseTo(7.2, 2);
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

describe('ScopesDock (C53 — real since W4c; R23-WB re-home: the tabbed console row, D-B1)', () => {
  it('standby panel + the live status line + the one-scope-at-a-time tab law (testids stable from W4b)', () => {
    act(() => { useUi.setState({ colorScopesState: 'open' }); }); // solo mounts boot the dock OPEN
    render(<ScopesDock />);
    expect(screen.getByTestId('shell-color-scopes')).toBeInTheDocument();
    expect(screen.getByTestId('shell-color-scopes-status')).toHaveTextContent(/standby — no graded frame/);
    // the default tab's panel renders the honest no-signal row; the others are ABSENT (one at a time)
    expect(screen.getByTestId('shell-color-scope-waveform')).toHaveTextContent(/no signal/);
    for (const kind of ['parade', 'vectorscope', 'histogram']) {
      expect(screen.queryByTestId(`shell-color-scope-${kind}`)).toBeNull();
    }
    // the R22 collapse law RE-HOMED as the tab law: switching swaps the ONE panel
    fireEvent.click(screen.getByTestId('shell-color-scopes-tab-vectorscope'));
    expect(screen.getByTestId('shell-color-scope-vectorscope')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-color-scope-waveform')).toBeNull();
    expect(screen.getByTestId('shell-color-scopes-tab-vectorscope')).toHaveAttribute('aria-selected', 'true');
  });

  it('the seam stays live: qualifierPreviewOn shows in the status line', () => {
    act(() => { useUi.setState({ colorScopesState: 'open' }); });
    render(<ScopesDock />);
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

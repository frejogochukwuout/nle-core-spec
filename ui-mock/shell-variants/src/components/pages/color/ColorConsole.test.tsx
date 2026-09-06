/* ColorConsole — R20-W4b (DESIGN-R20 D3, gap C51): the timeline-area grading
   surface. Pins: the frozen lane strip (ruler + video lanes 24 / audio 16
   dimmed; clips clickable = grade target + selection; NO editing gestures),
   the [Primaries | Curves | Qualifier] tablist, the Clip ⇄ Timeline
   grade-target toggle routing (writes land on the resolved record), the
   wheel write → store round-trip, and the node-graph selection honesty
   (C56). Every control asserts its STORE write — no display-state values. */

import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ColorConsole } from './ColorConsole';
import { ColorNodeGraph } from './ColorNodeGraph';
import { useUi, TIMELINE_GRADE_KEY } from '../../../state/useUiStore';
import { DEFAULT_GRADE } from '../../../lib/color';

const S = () => useUi.getState();

type Patch = Partial<ReturnType<typeof useUi.getState>>;

const boot = (patch?: Patch) => {
  useUi.setState({
    page: 'color', mockGrades: {}, past: [], future: [], colorConsoleTab: 'primaries',
    colorGradeTarget: 'clip', qualifierPreviewOn: false, selectedColorNodeId: 'primary',
    selection: ['el-2'],
    ...patch,
  });
  return render(<ColorConsole />);
};

beforeEach(() => {
  useUi.setState({ toasts: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* jsdom has no layout — the puck/curve pointer math needs a real box. */
const mockBox = (w = 400, h = 400) => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, top: 0, left: 0, width: w, height: h, right: w, bottom: h, toJSON: () => ({}),
  } as DOMRect);
};

describe('frozen lane strip (C51 compact set)', () => {
  it('renders the ruler + one mini lane per track: video 24px, audio 16px DIMMED', () => {
    boot();
    expect(screen.getByTestId('shell-color-console-ruler')).toBeInTheDocument();
    expect(screen.getByTestId('shell-color-console-lane-tr-overlay-1')).toHaveStyle({ height: '24px' });
    expect(screen.getByTestId('shell-color-console-lane-tr-main')).toHaveStyle({ height: '24px' });
    for (const id of ['tr-audio-1', 'tr-audio-2']) {
      const lane = screen.getByTestId(`shell-color-console-lane-${id}`);
      expect(lane).toHaveStyle({ height: '16px' });
      expect(lane.className).toContain('opacity-45'); // the frozen/dimmed law
    }
  });

  it('clips are read-only TARGET buttons: click selects the clip + routes the target (no gestures render)', () => {
    const { container } = boot();
    const clip = screen.getByTestId('shell-color-console-clip-el-3');
    expect(clip.tagName).toBe('BUTTON');
    expect(clip).toHaveAttribute('aria-pressed', 'false');
    // the target clip (el-2 = boot selection, clip mode) is highlighted
    expect(screen.getByTestId('shell-color-console-clip-el-2')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(clip);
    expect(S().selection).toEqual(['el-3']);
    expect(S().colorGradeTarget).toBe('clip');
    expect(screen.getByTestId('shell-color-console-clip-el-3')).toHaveAttribute('aria-pressed', 'true');
    // NO trim/drag affordances anywhere in the strip (frozen: buttons only)
    const strip = screen.getByTestId('shell-color-console-lanes');
    expect(strip.querySelectorAll('[data-testid^="shell-color-console-clip-"]').length).toBeGreaterThan(0);
    expect(within(strip).queryAllByRole('slider')).toHaveLength(0);
    expect(container.querySelectorAll('[data-drag-handle]').length).toBe(0);
  });

  it('target toggle ⇄ Timeline: the lane target highlight follows, clip chip switches', () => {
    boot();
    fireEvent.click(screen.getByTestId('shell-color-console-target-timeline'));
    expect(S().colorGradeTarget).toBe('timeline');
    expect(screen.getByTestId('shell-color-console-target')).toHaveTextContent('Timeline grade');
    // clip lanes no longer highlight a target
    expect(screen.getByTestId('shell-color-console-clip-el-2')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByTestId('shell-color-console-target-clip'));
    expect(S().colorGradeTarget).toBe('clip');
    expect(screen.getByTestId('shell-color-console-target')).not.toHaveTextContent('Timeline grade');
  });
});

describe('tab bar (timeline_edit_modes tab-nav style)', () => {
  it('three compact text tabs with tablist semantics; Primaries selected by default', () => {
    boot();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Primaries', 'Curves', 'Qualifier']);
    expect(screen.getByRole('tab', { name: 'Primaries' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'shell-color-console-tab-primaries');
    expect(screen.getByTestId('shell-color-wheels')).toBeInTheDocument(); // body mounts the panel
  });

  it('click + arrow keys switch tabs (roving tabindex), writing store view-state only', () => {
    const pastLen = S().past.length;
    boot();
    fireEvent.click(screen.getByRole('tab', { name: 'Curves' }));
    expect(S().colorConsoleTab).toBe('curves');
    expect(screen.getByTestId('shell-color-curves')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Curves' }), { key: 'ArrowRight' });
    expect(S().colorConsoleTab).toBe('qualifier');
    expect(screen.getByTestId('shell-color-qualifier')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Qualifier' }), { key: 'ArrowRight' });
    expect(S().colorConsoleTab).toBe('primaries'); // wraps
    // tab switching is view-state — never an undo entry
    expect(S().past).toHaveLength(pastLen);
  });
});

describe('wheel write → store round-trip (Primaries tab)', () => {
  it('keyboard on a master slider writes the target clip\'s GradeParams (spec 08 §4.2 field)', () => {
    boot();
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Hue' }), { key: 'ArrowRight' });
    expect(S().mockGrades['el-2'].hue).toBe(51);
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Saturation' }), { key: 'ArrowRight' });
    expect(S().mockGrades['el-2'].saturation).toBe(1);
    // numeric cell commit (free text while focused)
    const temp = screen.getByLabelText('Temp value') as HTMLInputElement;
    fireEvent.change(temp, { target: { value: '25' } });
    fireEvent.blur(temp);
    expect(S().mockGrades['el-2'].temperature).toBe(25);
  });

  it('target = Timeline: the SAME controls write the timeline record (single owner)', () => {
    boot({ colorGradeTarget: 'timeline' });
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Hue' }), { key: 'ArrowRight' });
    expect(S().mockGrades[TIMELINE_GRADE_KEY].hue).toBe(51);
    expect(S().mockGrades['el-2']).toBeUndefined(); // clip grade untouched
  });

  it('the luma thumbwheel writes the wheel SCALAR; the YRGB row is a derived readout (read-only)', () => {
    boot();
    const gainLuma = screen.getByRole('slider', { name: 'Gain luma' });
    expect(gainLuma).toHaveAttribute('aria-valuenow', '1'); // spec default gain 1
    // YRGB cells are ReadCells (role=img), never inputs — Y = the scalar
    const y = screen.getByLabelText('Gain Y');
    expect(y.getAttribute('role')).toBe('img');
    expect(y.textContent).toBe('1.00');
    expect((y as HTMLElement).querySelector('input')).toBeNull();
    fireEvent.keyDown(gainLuma, { key: 'End' });
    expect(S().mockGrades['el-2'].gain).toBe(4); // spec bound (color-layout §3.5)
    expect(screen.getByLabelText('Gain Y').textContent).toBe('4.00'); // derived follows the store
  });

  it('puck pointer drag commits hue+amount ONCE at pointer-up (angle→hue map: puck sits on its tint)', () => {
    mockBox(300, 300);
    boot();
    const wheel = screen.getByTestId('shell-color-wheel-lift');
    // drag to the right edge (dx=+1, dy=0 → θ=90° CW from up; hue = 360−90 = 270 → blue)
    fireEvent.pointerDown(wheel, { pointerId: 1, clientX: 300, clientY: 150, buttons: 1 });
    fireEvent.pointerMove(wheel, { pointerId: 1, clientX: 300, clientY: 150, buttons: 1 });
    const pastAfterMoves = S().past.length;
    expect(pastAfterMoves).toBe(0); // no history DURING the gesture (preview local)
    fireEvent.pointerUp(wheel, { pointerId: 1 });
    const g = S().mockGrades['el-2'];
    expect(g).toBeDefined();
    expect(g.shHue).toBe(270);
    expect(g.shAmount).toBeCloseTo(1, 2);
    expect(S().past).toHaveLength(1); // ONE commit = ONE undo entry
  });

  it('per-wheel reset + panel reset remove just the touched fields / the whole record', () => {
    boot();
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Hue' }), { key: 'ArrowRight' });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Lift' }));
    expect(S().mockGrades['el-2']).toMatchObject({ shHue: DEFAULT_GRADE.shHue, shAmount: 0, lift: 0, hue: 51 });
    fireEvent.click(screen.getByRole('button', { name: 'Reset primaries' }));
    expect(S().mockGrades['el-2']).toBeUndefined(); // record deleted = identity
  });

  it('undo/redo round-trips a wheel write (the C50 snapshot extension)', () => {
    boot();
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Hue' }), { key: 'ArrowRight' });
    expect(S().mockGrades['el-2'].hue).toBe(51);
    act(() => { S().undo(); });
    expect(S().mockGrades['el-2']).toBeUndefined();
    act(() => { S().redo(); });
    expect(S().mockGrades['el-2'].hue).toBe(51);
  });

  it('empty clip target renders the empty state (no controls, no writes)', () => {
    boot({ selection: [] });
    expect(screen.getByTestId('shell-color-wheels')).toHaveTextContent(/No clip selected/);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Curves' }), {});
    fireEvent.click(screen.getByRole('tab', { name: 'Curves' }));
    expect(screen.getByTestId('shell-color-curves')).toHaveTextContent(/No clip selected/);
  });
});

describe('node-graph selection honesty (C56)', () => {
  it('default = Primary node selected; Primary routes the console to Primaries, Secondary to Qualifier', () => {
    boot();
    expect(S().selectedColorNodeId).toBe('primary');
    expect(screen.getByTestId('shell-color-console-node')).toHaveTextContent('Node 01 · Primaries');
    render(<ColorNodeGraph />);
    fireEvent.click(screen.getByRole('button', { name: 'Secondary node 02' }));
    expect(S().selectedColorNodeId).toBe('secondary');
    expect(S().colorConsoleTab).toBe('qualifier');
    expect(screen.getByTestId('shell-color-console-node')).toHaveTextContent('Node 02 · Qualifier');
    fireEvent.click(screen.getByRole('button', { name: 'Primary node 01' }));
    expect(S().colorConsoleTab).toBe('primaries');
    // exactly ONE selected node; toggle-off clears (the old law)
    fireEvent.click(screen.getByRole('button', { name: 'Primary node 01' }));
    expect(S().selectedColorNodeId).toBeNull();
    expect(screen.queryByTestId('shell-color-console-node')).toBeNull();
  });

  it('non-bound node kinds (corrector/parallel/fx/master) select + ONE honest C56 toast', () => {
    boot();
    render(<ColorNodeGraph />);
    fireEvent.click(screen.getByRole('button', { name: 'Water node 03' }));
    expect(S().selectedColorNodeId).toBe('water');
    expect(S().colorConsoleTab).toBe('primaries'); // routing untouched — no fake binding
    expect(S().toasts.at(-1)).toMatchObject({
      kind: 'info',
      title: 'Node graph',
      detail: 'node graphs land with C56 — only the Primaries and Qualifier nodes bind today',
    });
    // once per mount: a second non-bound click stays silent
    const n = S().toasts.length;
    fireEvent.click(screen.getByRole('button', { name: 'Lens Flare node 06' }));
    expect(S().toasts).toHaveLength(n);
    // bound nodes never toast
    fireEvent.click(screen.getByRole('button', { name: 'Secondary node 02' }));
    expect(S().toasts).toHaveLength(n);
  });
});

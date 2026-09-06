/* ColorScopeStrip.test.tsx — R20-W4c (gap C53; color-layout §3.7 + spec 08
   §11.3/§11.4). The real scopes fed SYNTHETIC graded frames on the bus
   (the seam the viewer publishes to): red frame → vectorscope trace at
   ~103° with the spec-08 graticule, waveform/parade column histograms with
   density alpha + 'lighter' composition, the 10fps throttle, the standby
   row, the collapse law, and the matte-preview status hint. The 2d context
   is the LOCAL recording stub (src/test/canvas2d). */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ColorScopeStrip, SCOPE_THROTTLE_MS } from './ColorScopeStrip';
import { publishGradedFrame, getGradedFrame, subscribeGradedFrame, __clearGradedFrameBus } from './gradedFrameBus';
import { densityAlpha, VECTORSCOPE_TARGETS, DEFAULT_QUALIFIER } from '../../../lib/color';
import { drawWaveformScope, drawQualifierMatte } from './scopeDraw';
import { makeTestImageData, stubCanvas2D, type Canvas2DStub } from '../../../test/canvas2d';
import { useUi } from '../../../state/useUiStore';

const red = () => makeTestImageData(64, 36, () => [255, 0, 0]);
const gray = () => makeTestImageData(64, 36, () => [128, 128, 128]);

const publish = (img: ImageData) =>
  publishGradedFrame({ imageData: img, width: img.width, height: img.height, mediaId: 'm-02', elementId: 'el-2', mode: 'program' as const });

/* recording ctx for the pure-painter tests (no React) */
const recorder = () => {
  const calls: { op: string; args: unknown[] }[] = [];
  let last = '';
  const ctx = {
    fillStyle: '#000',
    strokeStyle: '#000',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    lineWidth: 1,
    font: '',
    fillRect: (...a: unknown[]) => calls.push({ op: 'fillRect', args: a }),
    clearRect: (...a: unknown[]) => calls.push({ op: 'clearRect', args: a }),
    strokeRect: (...a: unknown[]) => calls.push({ op: 'strokeRect', args: a }),
    beginPath: () => calls.push({ op: 'beginPath', args: [] }),
    arc: (...a: unknown[]) => calls.push({ op: 'arc', args: a }),
    moveTo: (...a: unknown[]) => calls.push({ op: 'moveTo', args: a }),
    lineTo: (...a: unknown[]) => calls.push({ op: 'lineTo', args: a }),
    stroke: () => calls.push({ op: 'stroke', args: [] }),
    fill: () => calls.push({ op: 'fill', args: [] }),
    fillText: (t: string, ...a: unknown[]) => calls.push({ op: 'fillText', args: [t, ...a] }),
  } as unknown as CanvasRenderingContext2D & { __calls: typeof calls };
  (ctx as unknown as { __calls: typeof calls }).__calls = calls;
  Object.defineProperty(ctx, 'fillStyle', {
    get: () => last,
    set: (v: string) => { last = v; calls.push({ op: 'set:fillStyle', args: [v] }); },
  });
  return ctx;
};

let stub: Canvas2DStub;

beforeEach(() => {
  vi.useFakeTimers();
  __clearGradedFrameBus();
  stub = stubCanvas2D();
});

afterEach(() => {
  stub.restore();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const canvasOf = (kind: string) => screen.getByTestId(`shell-color-scope-${kind}-canvas`) as HTMLCanvasElement;
const ops = (kind: string, op: string) => stub.calls(canvasOf(kind), op);
const fillRectsUnderTrace = (kind: string) => {
  const trace: unknown[][] = [];
  let last = '';
  for (const c of stub.callsFor(canvasOf(kind))) {
    if (c.op === 'set:fillStyle') last = String(c.args[0]);
    else if (c.op === 'fillRect' && last.includes('125,255,160')) trace.push(c.args);
  }
  return trace;
};

describe('the graded-frame bus (the W4c seam)', () => {
  it('publish/subscribe/get; unsubscribe stops delivery; __clear resets', () => {
    let seen = 0;
    const off = subscribeGradedFrame(() => { seen++; });
    expect(getGradedFrame()).toBeNull();
    publish(red());
    expect(seen).toBe(1);
    expect(getGradedFrame()?.elementId).toBe('el-2');
    off();
    publish(gray());
    expect(seen).toBe(1);
    __clearGradedFrameBus();
    expect(getGradedFrame()).toBeNull();
  });
});

describe("ColorScopeStrip — standby + collapse (W4b slot laws preserved)", () => {
  it('no graded frame yet: the four quadrants show the honest no-signal row (no canvas, no ctx)', () => {
    render(<ColorScopeStrip />);
    for (const kind of ['waveform', 'parade', 'vectorscope', 'histogram']) {
      expect(screen.getByTestId(`shell-color-scope-${kind}`)).toHaveTextContent(/no signal/);
      expect(screen.queryByTestId(`shell-color-scope-${kind}-canvas`)).toBeNull();
    }
    expect(screen.getByTestId('shell-color-scopes-status')).toHaveTextContent(/standby — no graded frame/);
  });

  it('collapse law: aria-expanded flips, the grid unmounts', () => {
    render(<ColorScopeStrip />);
    const collapse = screen.getByTestId('shell-color-scopes-collapse');
    expect(collapse).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(collapse);
    expect(screen.queryByTestId('shell-color-scopes-grid')).toBeNull();
    fireEvent.click(collapse);
    expect(screen.getByTestId('shell-color-scopes-grid')).toBeInTheDocument();
  });

  it('a frame on the bus flips the status line to the live geometry + fps', async () => {
    render(<ColorScopeStrip />);
    act(() => { publish(red()); });
    await act(async () => { vi.advanceTimersByTime(0); });
    expect(screen.getByTestId('shell-color-scopes-status')).toHaveTextContent(/64×36 · 10 fps/);
  });

  it('the matte-preview hint rides the status line (qualifierPreviewOn)', () => {
    render(<ColorScopeStrip />);
    act(() => { useUi.setState({ qualifierPreviewOn: true }); });
    expect(screen.getByTestId('shell-color-scopes-status')).toHaveTextContent(/matte preview on/);
    act(() => { useUi.setState({ qualifierPreviewOn: false }); });
    expect(screen.getByTestId('shell-color-scopes-status')).not.toHaveTextContent(/matte preview on/);
  });
});

describe('ColorScopeStrip — real traces from a red graded frame (§3.7)', () => {
  it('vectorscope: the trace lands at ~103° (BT.601 red), graticule + skin line + labels drawn', async () => {
    render(<ColorScopeStrip />);
    act(() => { publish(red()); });
    await act(async () => { vi.advanceTimersByTime(0); });
    // graticule: 3 circles (100/75/25%), crosshair, 6 target boxes, labels
    expect(ops('vectorscope', 'arc')).toHaveLength(3);
    expect(ops('vectorscope', 'strokeRect')).toHaveLength(6);
    const labels = ops('vectorscope', 'fillText').map((a) => a[0]);
    for (const t of VECTORSCOPE_TARGETS) expect(labels).toContain(t.label);
    // 'lighter' composite was armed for the trace pass
    expect(ops('vectorscope', 'set:globalCompositeOperation')).toContainEqual(['lighter']);
    // the trace: solid red → ONE hot density cell; its angle from center ≈ 103°
    const trace = fillRectsUnderTrace('vectorscope');
    expect(trace.length).toBeGreaterThan(0);
    const cx = 320 / 2;
    const cy = 160 / 2;
    const [x, y] = trace[0].map(Number);
    const angle = (Math.atan2(cy - y, x - cx) * 180) / Math.PI;
    expect(angle).toBeGreaterThan(100);
    expect(angle).toBeLessThan(107);
  });

  it('waveform: BT.601 luma of red (≈76) — one run per column at the matching height, density alpha 1', async () => {
    render(<ColorScopeStrip />);
    act(() => { publish(red()); });
    await act(async () => { vi.advanceTimersByTime(0); });
    expect(ops('waveform', 'set:globalCompositeOperation')).toContainEqual(['lighter']);
    const trace = fillRectsUnderTrace('waveform');
    // 64 source columns → cols=64, each a single level-run (uniform luma)
    expect(trace.length).toBe(64);
    const y = Number(trace[0][1]);
    expect(y).toBeGreaterThan(100);
    expect(y).toBeLessThan(122);
    // every column's run at the SAME luma height (uniform image)
    for (const r of trace) expect(Number(r[1])).toBeCloseTo(y, 0);
  });

  it('parade: three panels with per-channel colors at their x offsets', async () => {
    render(<ColorScopeStrip />);
    act(() => { publish(red()); });
    await act(async () => { vi.advanceTimersByTime(0); });
    const colorsSeen: string[] = [];
    let last = '';
    for (const c of stub.callsFor(canvasOf('parade'))) {
      if (c.op === 'set:fillStyle') {
        last = String(c.args[0]);
        if (last.startsWith('rgba(255,107,107') || last.startsWith('rgba(95,224,138') || last.startsWith('rgba(90,169,255')) colorsSeen.push(last);
      }
    }
    expect(colorsSeen.join(' ')).toContain('255,107,107'); // R panel trace
    expect(colorsSeen.join(' ')).toContain('95,224,138'); // G panel
    expect(colorsSeen.join(' ')).toContain('90,169,255'); // B panel
    // red input: R panel trace at the TOP (level 255), G/B at the bottom
    const panelTrace = (match: string): number[] => {
      const ys: number[] = [];
      let cur = '';
      for (const c of stub.callsFor(canvasOf('parade'))) {
        if (c.op === 'set:fillStyle') cur = String(c.args[0]);
        else if (c.op === 'fillRect' && cur.includes(match)) ys.push(Number(c.args[1]));
      }
      return ys;
    };
    expect(Math.min(...panelTrace('255,107,107'))).toBeLessThan(20); // top
    expect(Math.max(...panelTrace('95,224,138'))).toBeGreaterThan(140); // bottom
  });

  it('histogram: three stacked 256-bin tracks draw', async () => {
    render(<ColorScopeStrip />);
    act(() => { publish(red()); });
    await act(async () => { vi.advanceTimersByTime(0); });
    // three zero-axis lines (one per track) + bars in each third
    expect(ops('histogram', 'fillRect').length).toBeGreaterThan(6);
    const thirds = [0, 1, 2].map((i) =>
      ops('histogram', 'fillRect').filter((a) => Number(a[1]) > (i * 160) / 3 && Number(a[1]) < ((i + 1) * 160) / 3).length,
    );
    expect(thirds.every((n) => n > 0)).toBe(true);
  });

  it('THROTTLE (spec 08 §11.4): a second frame inside the window defers ONE draw', async () => {
    render(<ColorScopeStrip />);
    act(() => { publish(red()); });
    await act(async () => { vi.advanceTimersByTime(0); });
    const bgFills = () => ops('waveform', 'fillRect').filter((a) => a[0] === 0 && a[1] === 0 && a[2] === 320 && a[3] === 160).length;
    expect(bgFills()).toBe(1);
    act(() => { publish(gray()); }); // inside the 100ms window
    expect(bgFills()).toBe(1); // deferred, nothing yet
    await act(async () => { vi.advanceTimersByTime(SCOPE_THROTTLE_MS); });
    expect(bgFills()).toBe(2); // the LATEST frame drew once
  });
});

describe('the pure painters (scopeDraw, no React)', () => {
  it('drawWaveformScope uses densityAlpha — a single-level column reads full alpha', () => {
    const ctx = recorder();
    drawWaveformScope(ctx, 320, 160, { cols: 4, levels: 256, counts: new Uint32Array(4 * 256).fill(0).map((_, i) => (i % 256 === 40 ? 9 : 0)) as unknown as Uint32Array, max: 9 });
    const calls = (ctx as unknown as { __calls: { op: string; args: unknown[] }[] }).__calls;
    const trace = calls.filter((c) => c.op === 'set:fillStyle' && String(c.args[0]).includes('125,255,160,1'));
    expect(trace.length).toBeGreaterThan(0); // densityAlpha(9,9)=1 → alpha 1
    expect(densityAlpha(9, 9)).toBe(1);
  });

  it('drawQualifierMatte paints green rects with alpha = the sampled mask', () => {
    const ctx = recorder();
    // all-red: DEFAULT_QUALIFIER selects everything (hue 0, full sat/lum)
    drawQualifierMatte(ctx, red(), { ...DEFAULT_QUALIFIER });
    const calls = (ctx as unknown as { __calls: { op: string; args: unknown[] }[] }).__calls;
    const greens = calls.filter((c) => c.op === 'set:fillStyle' && String(c.args[0]).includes('46,230,90,1'));
    expect(greens.length).toBe(64 * 36); // stride 1 grid, mask 1 everywhere
  });
});

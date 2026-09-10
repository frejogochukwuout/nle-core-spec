/* ScopesDock.test.tsx — R23-WB (DESIGN-R23 D-B1; issues #90/#95). The 12
   ColorScopeStrip pins RE-HOMED here with the dock (never dropped — the
   R20-W6 law; ColorScopeStrip.tsx is deleted): the graded-frame bus seam,
   the real traces from synthetic frames (red → vectorscope ~103° with the
   spec-08 graticule, waveform/parade column histograms with density alpha +
   'lighter' composition, the 10fps throttle, the standby row, the
   matte-preview status hint), plus the NEW tab-law pins (one scope at a
   time at full panel size, the ARIA tabs roving pattern, the ruling-14
   stale-frame honesty while the node graph owns the viewer). The 2d context
   is the LOCAL recording stub (src/test/canvas2d).

   R24-W5c (DESIGN-R24 §2 F4-P3 ×2): the parade pins — the SHARED max
   drives the density math (honest cross-channel compare) and ONE shared
   10-bit label axis draws (not three per-panel sets). */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ScopesDock, SCOPE_THROTTLE_MS } from './ScopesDock';
import { publishGradedFrame, getGradedFrame, subscribeGradedFrame, __clearGradedFrameBus } from './gradedFrameBus';
import { densityAlpha, VECTORSCOPE_TARGETS, DEFAULT_QUALIFIER } from '../../../lib/color';
import { drawWaveformScope, drawParadeScope, drawQualifierMatte } from './scopeDraw';
import type { WaveformData, ParadeData } from '../../../lib/color';
import { makeTestImageData, stubCanvas2D, type Canvas2DStub } from '../../../test/canvas2d';
import { useUi } from '../../../state/useUiStore';

const red = () => makeTestImageData(64, 36, () => [255, 0, 0]);
const gray = () => makeTestImageData(64, 36, () => [128, 128, 128]);

const publish = (img: ImageData) =>
  publishGradedFrame({ imageData: img, width: img.width, height: img.height, mediaId: 'm-02', elementId: 'el-2', mode: 'program' as const });

/** R23-WB: solo mounts boot the dock OPEN (the store's 'off' default = the
 *  component is not rendered at all — the mixer collapsed law). */
const renderDock = () => {
  act(() => { useUi.setState({ colorScopesState: 'open' }); });
  return render(<ScopesDock />);
};

/** the tab-switch helper — one scope at a time means the trace tests must
 *  first SELECT the scope they assert. */
const selectTab = (kind: 'waveform' | 'parade' | 'vectorscope' | 'histogram') => {
  fireEvent.click(screen.getByTestId(`shell-color-scopes-tab-${kind}`));
};

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
  useUi.setState({ colorScopesState: 'open', qualifierPreviewOn: false, colorNodesDock: false });
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

describe('the graded-frame bus (the W4c seam, moved with the dock)', () => {
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

describe('ScopesDock — the D-B1 tab law (one scope at a time, #95)', () => {
  it('no graded frame yet: the ACTIVE panel shows the honest no-signal row (no canvas); only one panel in DOM', () => {
    renderDock();
    // the default tab is Luma WFM — its panel renders, the other three DO NOT
    expect(screen.getByTestId('shell-color-scope-waveform')).toHaveTextContent(/no signal/);
    expect(screen.queryByTestId('shell-color-scope-waveform-canvas')).toBeNull();
    for (const kind of ['parade', 'vectorscope', 'histogram']) {
      expect(screen.queryByTestId(`shell-color-scope-${kind}`)).toBeNull();
    }
    expect(screen.getByTestId('shell-color-scopes-status')).toHaveTextContent(/standby — no graded frame/);
  });

  it('a tab click swaps the ONE rendered scope (panel + canvas testids follow, one-scope-at-a-time law)', async () => {
    renderDock();
    act(() => { publish(red()); });
    await act(async () => { vi.advanceTimersByTime(0); });
    selectTab('vectorscope');
    await act(async () => { vi.advanceTimersByTime(0); });
    expect(screen.getByTestId('shell-color-scope-vectorscope-canvas')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-color-scope-waveform-canvas')).toBeNull();
    // the panel carries the ARIA tabpanel contract
    const panel = screen.getByTestId('shell-color-scope-vectorscope');
    expect(panel).toHaveAttribute('role', 'tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', 'shell-color-scopes-tab-vectorscope');
  });

  it('the ARIA tabs pattern (roving tabindex): one tab stop, aria-selected follows, arrows switch + wrap', () => {
    renderDock();
    // R24-W2 (A2-R2): the tab DOM order is the reference's panel order
    // (parade, waveform, vectorscope, histogram) — the R23 order died with
    // the label rename; the default active stays Waveform
    const par = screen.getByTestId('shell-color-scopes-tab-parade');
    const wf = screen.getByTestId('shell-color-scopes-tab-waveform');
    const vec = screen.getByTestId('shell-color-scopes-tab-vectorscope');
    const his = screen.getByTestId('shell-color-scopes-tab-histogram');
    expect(wf).toHaveAttribute('tabindex', '0');
    expect(par).toHaveAttribute('tabindex', '-1');
    expect(wf).toHaveAttribute('aria-selected', 'true');
    expect(par).toHaveAttribute('aria-selected', 'false');
    // arrows switch the scope AND move focus (radios: focus follows selection)
    fireEvent.keyDown(screen.getByRole('tablist', { name: 'Scope views' }), { key: 'ArrowRight' });
    expect(vec).toHaveAttribute('aria-selected', 'true');
    expect(vec).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('tablist', { name: 'Scope views' }), { key: 'ArrowLeft' });
    expect(wf).toHaveAttribute('aria-selected', 'true');
    expect(wf).toHaveFocus();
    // ← from Waveform lands on Parade (the DOM-first), ← again wraps to the LAST (Histogram)
    fireEvent.keyDown(screen.getByRole('tablist', { name: 'Scope views' }), { key: 'ArrowLeft' });
    expect(par).toHaveAttribute('aria-selected', 'true');
    expect(par).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('tablist', { name: 'Scope views' }), { key: 'ArrowLeft' });
    expect(his).toHaveAttribute('aria-selected', 'true');
    expect(his).toHaveFocus();
    // and → from the LAST wraps back to the DOM-first (Parade)
    fireEvent.keyDown(screen.getByRole('tablist', { name: 'Scope views' }), { key: 'ArrowRight' });
    expect(par).toHaveAttribute('aria-selected', 'true');
    expect(vec).toHaveAttribute('aria-selected', 'false');
  });

  it('the four tabs carry the reference\'s exact labels (Parade / Waveform / Vectorscope / Histogram — A2-R2)', () => {
    renderDock();
    for (const label of ['Parade', 'Waveform', 'Vectorscope', 'Histogram']) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument();
    }
    // the R23-era compound labels are gone (the rename is total)
    for (const old of ['Luma WFM', 'RGB Parade']) {
      expect(screen.queryByRole('tab', { name: old })).toBeNull();
    }
  });

  it("'off' = the dock is not rendered at all (the mixer's collapsed law, solo mount)", () => {
    act(() => { useUi.setState({ colorScopesState: 'off' }); });
    const { container } = render(<ScopesDock />);
    expect(container.firstChild).toBeNull();
  });
});

describe('ScopesDock — the status line (the store half stays live)', () => {
  it('a frame on the bus flips the status line to the live geometry + fps', async () => {
    renderDock();
    act(() => { publish(red()); });
    await act(async () => { vi.advanceTimersByTime(0); });
    expect(screen.getByTestId('shell-color-scopes-status')).toHaveTextContent(/64×36 · 10 fps/);
  });

  it('the matte-preview hint rides the status line (qualifierPreviewOn)', () => {
    renderDock();
    act(() => { useUi.setState({ qualifierPreviewOn: true }); });
    expect(screen.getByTestId('shell-color-scopes-status')).toHaveTextContent(/matte preview on/);
    act(() => { useUi.setState({ qualifierPreviewOn: false }); });
    expect(screen.getByTestId('shell-color-scopes-status')).not.toHaveTextContent(/matte preview on/);
  });

  it('ruling 14 is DEAD (A2-R1): the graph never owns the viewer now — no stale confession, the pane stays live even with nodes open', async () => {
    renderDock();
    act(() => { publish(red()); });
    await act(async () => { vi.advanceTimersByTime(0); });
    expect(screen.getByTestId('shell-color-scopes-status')).toHaveTextContent(/64×36 · 10 fps/);
    // the R23-WB viewer-swap (graph ⇄ viewer) is deleted — the graph lives
    // in the console row (W2 item 1), so opening it can NEVER make the
    // scopes pane's frame stale; the honest hint died with the defect
    act(() => { useUi.setState({ colorNodesDock: true }); });
    expect(screen.getByTestId('shell-color-scopes-status')).not.toHaveTextContent(/stale/);
    expect(screen.getByTestId('shell-color-scopes-status')).toHaveTextContent(/64×36 · 10 fps/);
    act(() => { useUi.setState({ colorNodesDock: false }); });
    expect(screen.getByTestId('shell-color-scopes-status')).not.toHaveTextContent(/stale/);
  });

  it('a frame-less mount never claims stale even with the node surface on (standby is the truth)', () => {
    act(() => { useUi.setState({ colorNodesDock: true }); });
    renderDock(); // no frame on the bus at all
    expect(screen.getByTestId('shell-color-scopes-status')).toHaveTextContent(/standby — no graded frame/);
    expect(screen.getByTestId('shell-color-scopes-status')).not.toHaveTextContent(/stale/);
  });
});

describe('ScopesDock — real traces from a red graded frame (§3.7, re-homed)', () => {
  it('vectorscope: the trace lands at ~103° (BT.601 red), graticule + skin line + labels drawn', async () => {
    renderDock();
    act(() => { publish(red()); });
    await act(async () => { vi.advanceTimersByTime(0); });
    selectTab('vectorscope');
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
    renderDock();
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
    renderDock();
    act(() => { publish(red()); });
    await act(async () => { vi.advanceTimersByTime(0); });
    selectTab('parade');
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

  it('R24-W5c F4: the parade draws ONE shared 10-bit label axis (5 labels, not 3×5)', async () => {
    renderDock();
    act(() => { publish(red()); });
    await act(async () => { vi.advanceTimersByTime(0); });
    selectTab('parade');
    await act(async () => { vi.advanceTimersByTime(0); });
    // ONE label set at the scope's left edge (the reference's graticule
    // grammar): the old painter drew a set per panel — 15 fillTexts
    const labels = ops('parade', 'fillText').map((a) => String(a[0]));
    expect(labels).toEqual(['0', '256', '512', '768', '1023']);
    // the gridlines are ONE shared axis too: 5 full-width hairlines (the
    // three per-panel ⅓-width segments were contiguous — same pixels)
    const lines = ops('parade', 'fillRect').filter((a) => a[3] === 1 && a[2] === 320);
    expect(lines).toHaveLength(5);
  });

  it('histogram: three stacked 256-bin tracks draw', async () => {
    renderDock();
    act(() => { publish(red()); });
    await act(async () => { vi.advanceTimersByTime(0); });
    selectTab('histogram');
    await act(async () => { vi.advanceTimersByTime(0); });
    // three zero-axis lines (one per track) + bars in each third
    expect(ops('histogram', 'fillRect').length).toBeGreaterThan(6);
    const thirds = [0, 1, 2].map((i) =>
      ops('histogram', 'fillRect').filter((a) => Number(a[1]) > (i * 160) / 3 && Number(a[1]) < ((i + 1) * 160) / 3).length,
    );
    expect(thirds.every((n) => n > 0)).toBe(true);
  });

  it('THROTTLE (spec 08 §11.4): a second frame inside the window defers ONE draw', async () => {
    renderDock();
    act(() => { publish(red()); });
    await act(async () => { vi.advanceTimersByTime(0); });
    const bgFills = () => ops('waveform', 'fillRect').filter((a) => a[0] === 0 && a[1] === 0 && a[2] === 320 && a[3] === 160).length;
    expect(bgFills()).toBe(1);
    act(() => { publish(gray()); }); // inside the 100ms window
    expect(bgFills()).toBe(1); // deferred, nothing yet
    await act(async () => { vi.advanceTimersByTime(SCOPE_THROTTLE_MS); });
    expect(bgFills()).toBe(2); // the LATEST frame drew once
  });

  /* R23-FIX (review-sweep R4-P3#11): `mode` rides the draw-effect deps — a
     dock kept mounted through off→open (the frame already on the bus, no new
     publish) repaints the FRESH canvas on the flip. Without mode in the deps
     the effect never re-runs (frame/active/drawNow all unchanged) and the
     remounted canvas stays blank. The off→open cycle mounts a NEW canvas
     node (the whole subtree unmounts at null — the registry log restarts),
     so the background-fill count is the per-draw marker. */
  it('R23-FIX R4-P3#11: a dock kept mounted through off→open repaints on the flip (mode rides the effect deps)', async () => {
    publish(red()); // the frame is already on the bus BEFORE the mount
    renderDock();
    await act(async () => { vi.advanceTimersByTime(0); });
    const bgFills = () => ops('waveform', 'fillRect').filter((a) => a[0] === 0 && a[1] === 0 && a[2] === 320 && a[3] === 160).length;
    expect(bgFills()).toBe(1); // the mount painted
    act(() => { useUi.setState({ colorScopesState: 'off' }); });
    expect(screen.queryByTestId('shell-color-scope-waveform-canvas')).toBeNull(); // the canvas unmounted
    act(() => { useUi.setState({ colorScopesState: 'open' }); });
    expect(screen.getByTestId('shell-color-scope-waveform-canvas')).toBeInTheDocument(); // a FRESH node
    expect(bgFills()).toBe(0); // nothing yet — the immediate path needs the effect re-run
    await act(async () => { vi.advanceTimersByTime(SCOPE_THROTTLE_MS + 10); }); // covers the deferred path too
    expect(bgFills()).toBe(1); // the mode flip re-ran the draw effect — the fresh canvas painted
  });

  it('a tab switch mid-throttle paints the newly mounted canvas immediately (no dead scope)', async () => {
    renderDock();
    act(() => { publish(red()); });
    await act(async () => { vi.advanceTimersByTime(0); });
    // a second frame DEFERRED (inside the window) — then switch tabs: the
    // new canvas must paint without waiting a full window
    act(() => { publish(gray()); });
    selectTab('vectorscope');
    await act(async () => { vi.advanceTimersByTime(0); });
    expect(stub.callsFor(canvasOf('vectorscope')).length).toBeGreaterThan(0);
  });

  it('a tab switch mounts a FRESH canvas — the new scope never inherits the previous scope\'s recorded draws', async () => {
    /* regression pin for the R23-WB defect the vectorscope-angle pin caught:
       React reuses the same <canvas> DOM node across tab switches (same type,
       same tree position) — the vectorscope testid then resolved to the
       element carrying the WAVEFORM's recorded trace calls (angle −169°
       instead of +103°). key={active} mounts a fresh node per scope. */
    renderDock();
    act(() => { publish(red()); });
    await act(async () => { vi.advanceTimersByTime(0); });
    expect(fillRectsUnderTrace('waveform').length).toBe(64); // the waveform drew its column runs
    selectTab('vectorscope');
    await act(async () => { vi.advanceTimersByTime(0); });
    // the vectorscope canvas's OWN trace cells — all inside the graticule
    // circle (cx 160, cy 80, r 74 + half a cell): the waveform's runs at
    // x≈0..317 / y≈112 sit far OUTSIDE and would fail this containment
    const trace = fillRectsUnderTrace('vectorscope');
    expect(trace.length).toBeGreaterThan(0);
    for (const r of trace) {
      const [x, y] = r.map(Number);
      expect(Math.hypot(x + 2.5 - 160, y + 2.5 - 80)).toBeLessThan(78);
    }
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

  it('R24-W5c F4: parade density normalizes on the SHARED max — same count, different per-panel maxes → the SAME alpha', () => {
    const ctx = recorder();
    /* R panel: one cell at n=9 (also its own busiest → local max 9);
       G panel: the SAME n=9 cell plus an n=99 cell (local max 99).
       sharedMax = 99. Under the OLD per-panel normalization R's n=9 read
       FULL alpha (densityAlpha(9,9)=1) while G's n=9 read ~0.5 — the same
       input value, different rendered intensity, a quiet channel lying
       as bright as its own busiest cell. The shared scale reads BOTH at
       densityAlpha(9,99) ≈ 0.5 (the honest cross-channel compare). */
    const wf = (cells: [number, number][], max: number): WaveformData => {
      const counts = new Uint32Array(256);
      for (const [level, n] of cells) counts[level] = n;
      return { cols: 1, levels: 256, counts, max };
    };
    const data: ParadeData = {
      r: wf([[40, 9]], 9),
      g: wf([[40, 9], [80, 99]], 99),
      b: wf([], 0),
      sharedMax: 99,
    };
    drawParadeScope(ctx, 320, 160, data);
    const calls = (ctx as unknown as { __calls: { op: string; args: unknown[] }[] }).__calls;
    const styles = calls.filter((c) => c.op === 'set:fillStyle').map((c) => String(c.args[0]));
    // sharedMax is actually USED: R's n=9 draws at the shared alpha ≈0.5,
    // NOT the per-panel full 1 the old data.max normalization produced
    expect(styles).toContain('rgba(255,107,107,0.5)');
    expect(styles).not.toContain('rgba(255,107,107,1)');
    // the same count in the busier panel reads IDENTICALLY
    expect(styles).toContain('rgba(95,224,138,0.5)');
    expect(densityAlpha(9, 99)).toBeCloseTo(0.5, 2);
    // and the label law at the painter level: ONE shared 10-bit axis
    const labels = calls.filter((c) => c.op === 'fillText').map((c) => String(c.args[0]));
    expect(labels).toEqual(['0', '256', '512', '768', '1023']);
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

/* GradedViewerCanvas.test.tsx — R20-W4c (C52/C54; color-layout §3.6).
   The canvas pipeline under the LOCAL 2d-context stub + the synchronous
   fake Image loader (src/test/canvas2d — no canvas package, jsdom law):
   working-res clamp + drawImage geometry, coalesced single-fire re-grades,
   the §4.2 state rows (loading/decode-failure+retry/offline), per-element
   grade lookup through the REAL Viewer (scrub across two graded clips),
   the timeline-key law, the qualifier matte overlay, the eyedropper
   click-through, and the scope-bus publish. */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { GradedViewerCanvas, __resetGradedViewerCaches } from './GradedViewerCanvas';
import { Viewer } from './Viewer';
import { useUi } from '../../state/useUiStore';
import { DEFAULT_GRADE, DEFAULT_QUALIFIER, decodeToLinear, gradeLinearImage } from '../../lib/color';
import { buildGradeStack, gradeLinearFrame } from '../pages/color/gradedFrame';
import { getGradedFrame, __clearGradedFrameBus } from '../pages/color/gradedFrameBus';
import { makeTestImageData, solid, stubCanvas2D, stubImage, type Canvas2DStub, type FakeImage } from '../../test/canvas2d';

const S = () => useUi.getState();
type Patch = Partial<ReturnType<typeof useUi.getState>>;

const grade = (patch: Record<string, number>) => ({ ...DEFAULT_GRADE, ...patch }) as typeof DEFAULT_GRADE;

const boot = (patch?: Patch) => {
  useUi.setState({
    page: 'color', mockGrades: {}, past: [], future: [], toasts: [],
    selection: [], colorGradeTarget: 'clip', qualifierPreviewOn: false, qualifierPickerOn: false,
    viewerMode: 'program', sourceMediaId: null,
    ...patch,
  });
};

const THUMB: Record<string, string> = {
  'm-01': '/media/beach_wide.jpg',
  'm-02': '/media/interview_marina.jpg',
  'm-03': '/media/drone_launch.jpg',
};

/** fire the coalesced grade (rAF stub → 16ms setTimeout, faked timers) */
const flushGrade = async () => {
  await act(async () => { vi.advanceTimersByTime(20); });
};

let ctx: Canvas2DStub;
let images: { restore: () => void; instances: FakeImage[] };
let failingSrc: ((src: string) => boolean) | null;

beforeEach(() => {
  vi.useFakeTimers();
  __resetGradedViewerCaches();
  __clearGradedFrameBus();
  failingSrc = null;
  ctx = stubCanvas2D({ imageData: solid(255, 0, 0) });
  images = stubImage({
    sizes: { [THUMB['m-01']]: [1920, 1080], [THUMB['m-02']]: [64, 36], [THUMB['m-03']]: [64, 36] },
    fail: (src) => (failingSrc ? failingSrc(src) : false),
  });
});

afterEach(() => {
  ctx.restore();
  images.restore();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const visibleCanvas = () => screen.getByTestId('shell-viewer-canvas') as HTMLCanvasElement;
const puts = (canvas: HTMLCanvasElement) => ctx.calls(canvas, 'putImageData');
const drawImages = () => ctx.allCalls().filter((c) => c.op === 'drawImage').map((c) => c.args);

describe('GradedViewerCanvas — the decode pass (working res ≤960×540)', () => {
  it('decodes the 1920×1080 source to EXACTLY 960×540 (drawImage args + canvas size)', async () => {
    boot();
    render(<GradedViewerCanvas mediaId="m-01" elementId="el-1" mode="program" />);
    await flushGrade();
    const draws = drawImages();
    expect(draws).toHaveLength(1);
    expect(draws[0][1]).toBe(0);
    expect(draws[0][2]).toBe(0);
    expect(draws[0][3]).toBe(960);
    expect(draws[0][4]).toBe(540);
    const canvas = visibleCanvas();
    expect(canvas.width).toBe(960);
    expect(canvas.height).toBe(540);
    expect(puts(canvas)).toHaveLength(1);
  });

  it('a cached decode is reused — a second mount never re-draws the source', async () => {
    boot();
    const first = render(<GradedViewerCanvas mediaId="m-02" elementId="el-2" mode="program" />);
    await flushGrade();
    first.unmount();
    const drawsAfterFirst = drawImages().length;
    render(<GradedViewerCanvas mediaId="m-02" elementId="el-2" mode="program" />);
    await flushGrade();
    expect(drawImages()).toHaveLength(drawsAfterFirst); // spec 08 §12.1 linear cache
    expect(getGradedFrame()?.mediaId).toBe('m-02');
  });

  it('small sources pass through unclamped (64×36)', async () => {
    boot();
    render(<GradedViewerCanvas mediaId="m-02" elementId="el-2" mode="program" />);
    await flushGrade();
    const canvas = visibleCanvas();
    expect(canvas.width).toBe(64);
    expect(canvas.height).toBe(36);
  });
});

describe('GradedViewerCanvas — state rows (spec 18 §4.2, canvas path)', () => {
  it('null media / offline / audio assets render the honest rows, never a broken canvas', () => {
    boot();
    const { rerender } = render(<GradedViewerCanvas mediaId={null} elementId={null} mode="program" />);
    expect(screen.getByText('No media — import or drop a file')).toBeInTheDocument();
    rerender(<GradedViewerCanvas mediaId="m-04" elementId="el-x" mode="program" />);
    expect(screen.getByTestId('shell-viewer-canvas-offline')).toHaveTextContent('Media offline');
    rerender(<GradedViewerCanvas mediaId="m-06" elementId="el-x" mode="program" />);
    expect(screen.getByText('Audio-only asset — no video frame')).toBeInTheDocument();
  });

  it('decode failure: the error row + one toast; Retry re-attempts (and recovers)', async () => {
    boot();
    failingSrc = (src) => src === THUMB['m-02'];
    render(<GradedViewerCanvas mediaId="m-02" elementId="el-2" mode="program" />);
    const row = screen.getByTestId('shell-viewer-state-error');
    expect(row).toHaveTextContent('Media failed to decode');
    expect(S().toasts.at(-1)).toMatchObject({ kind: 'error', title: 'Media failed to decode' });
    // recover on retry — the re-key re-attempts the load
    failingSrc = null;
    fireEvent.click(within(row).getByRole('button', { name: 'Retry decoding the program frame' }));
    await flushGrade();
    expect(screen.getByTestId('shell-viewer-canvas')).toBeInTheDocument();
  });

  it('loading row shows while the still decodes (a pending Image never resolves)', () => {
    boot();
    images.restore(); // the REAL jsdom Image fires no load events — pending
    render(<GradedViewerCanvas mediaId="m-02" elementId="el-2" mode="program" />);
    expect(screen.getByTestId('shell-viewer-state-loading')).toHaveTextContent(/Decoding/);
  });
});

describe('GradedViewerCanvas — the grade pass (rAF coalesced)', () => {
  it('coalesces two param edits into ONE re-grade (single putImageData per frame)', async () => {
    boot({ mockGrades: { 'el-2': grade({ exposure: 0 }) } });
    render(<GradedViewerCanvas mediaId="m-02" elementId="el-2" mode="program" />);
    await flushGrade();
    const canvas = visibleCanvas();
    expect(puts(canvas)).toHaveLength(1);
    const decodeCount = drawImages().length;
    act(() => { S().setGrade('el-2', { exposure: 0.5 }); });
    act(() => { S().setGrade('el-2', { exposure: 1 }); });
    await flushGrade();
    expect(puts(canvas)).toHaveLength(2); // NOT 3 — latest-wins per frame
    // a param change re-runs ONLY the grade pass (§12.2) — the decode
    // drawImage never re-fires (§12.1: the linear buffer is cached)
    expect(drawImages()).toHaveLength(decodeCount);
    const frame = puts(canvas).at(-1)![0] as ImageData;
    const expected = gradeLinearImage(decodeToLinear(makeTestImageData(64, 36, () => [255, 0, 0])), grade({ exposure: 1 }));
    expect([...frame.data.slice(0, 12)]).toEqual([...expected.data.slice(0, 12)]);
  });

  it('scrub through the REAL Viewer: the grade follows the clip under the playhead', async () => {
    boot({
      playhead: 16, // el-2 (Marina interview, m-02)
      mockGrades: {
        'el-2': grade({ lift: 0.05 }),
        'el-3': grade({ gain: 2 }),
      },
    });
    render(<Viewer duration={30} />);
    await flushGrade();
    let canvas = screen.getByTestId('shell-viewer-canvas') as HTMLCanvasElement;
    const onEl2 = puts(canvas).at(-1)![0] as ImageData;
    const src = makeTestImageData(64, 36, () => [255, 0, 0]);
    expect([...onEl2.data.slice(0, 4)]).toEqual([...gradeLinearImage(decodeToLinear(src), grade({ lift: 0.05 })).data.slice(0, 4)]);

    act(() => { S().setPlayhead(20); }); // el-3 (drone launch, m-03)
    await flushGrade();
    canvas = screen.getByTestId('shell-viewer-canvas') as HTMLCanvasElement;
    const onEl3 = puts(canvas).at(-1)![0] as ImageData;
    expect([...onEl3.data.slice(0, 4)]).toEqual([...gradeLinearImage(decodeToLinear(src), grade({ gain: 2 })).data.slice(0, 4)]);
    // scrub swapped the frame ATOMICALLY with the image (mediaId follows too)
    expect(getGradedFrame()?.mediaId).toBe('m-03');
    expect(getGradedFrame()?.elementId).toBe('el-3');
  });

  it('THE TIMELINE LAW: post-clip pass applies to elements without their own grade', async () => {
    boot({ mockGrades: { timeline: grade({ gain: 2 }) } });
    render(<GradedViewerCanvas mediaId="m-02" elementId="el-2" mode="program" />);
    await flushGrade();
    const frame = puts(visibleCanvas()).at(-1)![0] as ImageData;
    const src = makeTestImageData(64, 36, () => [255, 0, 0]);
    const expected = gradeLinearFrame(decodeToLinear(src), buildGradeStack(grade({}), grade({ gain: 2 })));
    expect([...frame.data.slice(0, 8)]).toEqual([...expected.data.slice(0, 8)]);
    // NOT first-found-wins-on-clip: a clip WITH its own grade gets BOTH passes
    act(() => { S().setGrade('el-2', { lift: 0.05 }); });
    await flushGrade();
    const both = puts(visibleCanvas()).at(-1)![0] as ImageData;
    const expectedBoth = gradeLinearFrame(decodeToLinear(src), buildGradeStack(grade({ lift: 0.05 }), grade({ gain: 2 })));
    expect([...both.data.slice(0, 8)]).toEqual([...expectedBoth.data.slice(0, 8)]);
  });

  it('source mode: the RAW poster (empty stack — passthrough ≤1 LSB) + the honest chip', async () => {
    boot();
    render(<GradedViewerCanvas mediaId="m-02" elementId={null} mode="source" />);
    await flushGrade();
    expect(screen.getByTestId('shell-viewer-canvas-raw-chip')).toHaveTextContent(/raw source — no grade/);
    const frame = puts(visibleCanvas()).at(-1)![0] as ImageData;
    expect(Math.abs(frame.data[0] - 255)).toBeLessThanOrEqual(1);
    expect(getGradedFrame()?.mode).toBe('source');
    expect(getGradedFrame()?.elementId).toBeNull();
  });
});

describe('GradedViewerCanvas — the qualifier (C54)', () => {
  it('qualifierPreviewOn overlays the green matte: all-red + default qualifier = full mask', async () => {
    boot({
      playhead: 16,
      selection: ['el-2'],
      mockGrades: { 'el-2': { ...grade({}), qualifier: { ...DEFAULT_QUALIFIER } } },
      qualifierPreviewOn: true,
    });
    render(<GradedViewerCanvas mediaId="m-02" elementId="el-2" mode="program" />);
    await flushGrade();
    const canvas = visibleCanvas();
    // fillRects issued under the matte-green fillStyle (the stub records
    // property sets separately — walk the stream)
    const greenRects = () => {
      let last = '';
      const out: unknown[][] = [];
      for (const c of ctx.callsFor(canvas)) {
        if (c.op === 'set:fillStyle') last = String(c.args[0]);
        else if (c.op === 'fillRect' && last.includes('46,230,90')) out.push(c.args);
      }
      return out;
    };
    // 64×36 grid, stride 1 → every cell mask=1 (red hue 0 in center/width)
    const green = greenRects();
    expect(green.length).toBe(64 * 36);
    expect(green[0][0]).toBe(0); // x
    // preview OFF → the redraw adds ZERO new green rects
    act(() => { useUi.setState({ qualifierPreviewOn: false }); });
    await flushGrade();
    expect(greenRects().length).toBe(green.length);
  });

  it('the eyedropper: click seeds the target qualifier Center values + disarms', async () => {
    boot({
      playhead: 16,
      selection: ['el-2'],
      qualifierPickerOn: true,
    });
    render(<GradedViewerCanvas mediaId="m-02" elementId="el-2" mode="program" />);
    await flushGrade();
    const canvas = visibleCanvas();
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, width: 64, height: 36, right: 64, bottom: 36, toJSON: () => ({}),
    } as DOMRect);
    fireEvent.click(canvas, { clientX: 10, clientY: 10 });
    const q = S().mockGrades['el-2']?.qualifier;
    expect(q).toBeDefined();
    expect(q?.hueCenter).toBeCloseTo(0); // red sample
    expect(q?.satLow).toBeCloseTo(0.92);
    expect(q?.satHigh).toBeCloseTo(1);
    expect(q?.lumaLow).toBeCloseTo(0.2126 - 0.06, 3);
    expect(q?.lumaHigh).toBeCloseTo(0.2126 + 0.06, 3);
    // ONE undoable commit + the one-shot disarm
    expect(S().past).toHaveLength(1);
    expect(S().qualifierPickerOn).toBe(false);
  });

  it('the eyedropper with NO target: the honest toast, no write', async () => {
    boot({ qualifierPickerOn: true, selection: [] });
    render(<GradedViewerCanvas mediaId="m-02" elementId="el-2" mode="program" />);
    await flushGrade();
    const canvas = visibleCanvas();
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, width: 64, height: 36, right: 64, bottom: 36, toJSON: () => ({}),
    } as DOMRect);
    fireEvent.click(canvas, { clientX: 10, clientY: 10 });
    expect(S().mockGrades).toEqual({});
    expect(S().toasts.at(-1)).toMatchObject({ kind: 'info', title: 'Eyedropper needs a target' });
    expect(S().qualifierPickerOn).toBe(true); // still armed — nothing consumed
  });

  /* R23-FIX (review-sweep item 17, R4-P2#2): the picker hint rides
     bottom-2 right-2 — it used to sit at right-2 top-2, exactly where the
     Viewer's res/fps badge (1920×1080 · 24p — Viewer.tsx:368, `absolute
     right-2 top-2`) renders over the canvas, so the two chips collided over
     the picker's frame. jsdom has no overlap geometry: the pin compares the
     class positions (the hint's corner is the badge-free bottom-right; the
     raw-source chip owns the source mode's bottom-LEFT). */
  it('R23-FIX item 17: the armed picker hint sits bottom-right (badge-free corner), away from the Viewer\'s top-right res/fps badge', async () => {
    boot({ qualifierPickerOn: true, selection: [] });
    render(<GradedViewerCanvas mediaId="m-02" elementId="el-2" mode="program" />);
    await flushGrade();
    const hint = screen.getByTestId('shell-viewer-canvas-picker-hint');
    expect(hint.className).toContain('bottom-2');
    expect(hint.className).toContain('right-2');
    expect(hint.className).not.toContain('top-2'); // the OLD position — the badge's corner
    // the store's picker flag is live (both surfaces render in the composed Viewer)
    expect(S().qualifierPickerOn).toBe(true);
    expect(screen.getByTestId('shell-viewer-canvas')).toBeInTheDocument();
  });
});

describe('GradedViewerCanvas — the scope-bus seam', () => {
  it('publishes the working-res graded frame after every coalesced re-grade', async () => {
    boot({ mockGrades: { 'el-2': grade({ exposure: 1 }) } });
    render(<GradedViewerCanvas mediaId="m-02" elementId="el-2" mode="program" />);
    await flushGrade();
    const f1 = getGradedFrame();
    expect(f1).not.toBeNull();
    expect(f1?.width).toBe(64);
    expect(f1?.elementId).toBe('el-2');
    expect(f1?.mode).toBe('program');
    act(() => { S().setGrade('el-2', { exposure: 2 }); });
    await flushGrade();
    const f2 = getGradedFrame();
    expect(f2).not.toBe(f1); // republished
    // the bus frame IS the frame drawn (scope source == viewer output)
    const drawn = puts(visibleCanvas()).at(-1)![0] as ImageData;
    expect(f2?.imageData).toBe(drawn);
  });
});

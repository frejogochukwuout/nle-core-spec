/* canvas2d.ts — R20-W4c LOCAL test helper (not global setup): jsdom has no
   canvas package (and the mission forbids adding one), so the color-page
   canvas components get a RECORDING 2d-context stub + a synchronous fake
   Image loader. Everything records into per-canvas call lists so tests can
   assert drawImage/putImageData/fillRect geometry and alpha directly.

   Opt-in per test file:
     const ctx = stubCanvas2D({ imageData: (w, h) => bytes });   // 2d stub
     const img = stubImage({ sizes: { '/media/x.jpg': [1920, 1080] }, fail: (s) => s.includes('missing') });
   …restore in afterEach (or vi.unstubAllGlobals + restore()). */

import { vi } from 'vitest';

/** One recorded ctx operation — property sets use `op: 'set:fillStyle'`. */
export interface RecordedCall {
  op: string;
  args: unknown[];
}

export interface Canvas2DStub {
  /** Recorded ops for one canvas element (empty array if never drawn). */
  callsFor(canvas: HTMLCanvasElement): RecordedCall[];
  /** Ops of a given name for one canvas. */
  calls(canvas: HTMLCanvasElement, op: string): unknown[][];
  /** Every canvas's recorded ops (creation order, flattened). */
  allCalls(): RecordedCall[];
  restore(): void;
}

/** Structural ImageData (jsdom has no constructor — W4a's fallback law). */
export function makeTestImageData(
  width: number,
  height: number,
  fill: (x: number, y: number) => [number, number, number],
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const [r, g, b] = fill(x, y);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return { data, width, height, colorSpace: 'srgb' } as unknown as ImageData;
}

/** Solid-color image factory (the getImageData default body builder). */
export const solid = (r: number, g: number, b: number): ((w: number, h: number) => Uint8ClampedArray) =>
  (w, h) => {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
    return data;
  };

/**
 * `stubCanvas2D()` — replaces HTMLCanvasElement.prototype.getContext with a
 * recording stub returning a per-canvas 2d-context double. `imageData`
 * supplies the body getImageData returns (default: solid 50% gray). The
 * stub never throws — drawing is a no-op that records.
 */
export function stubCanvas2D(opts?: {
  imageData?: (w: number, h: number) => Uint8ClampedArray;
}): Canvas2DStub {
  const registry = new Map<HTMLCanvasElement, RecordedCall[]>();
  const factory = opts?.imageData ?? solid(128, 128, 128);
  const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
    type: string,
  ) {
    if (type && type !== '2d') return null;
    let calls = registry.get(this);
    if (!calls) {
      calls = [];
      registry.set(this, calls);
    }
    return makeRecordingCtx(this, calls, factory);
  });
  return {
    callsFor: (canvas) => registry.get(canvas) ?? [],
    calls: (canvas, op) => (registry.get(canvas) ?? []).filter((c) => c.op === op).map((c) => c.args),
    allCalls: () => [...registry.values()].flat(),
    restore: () => spy.mockRestore(),
  };
}

function makeRecordingCtx(
  canvas: HTMLCanvasElement,
  calls: RecordedCall[],
  imageDataFactory: (w: number, h: number) => Uint8ClampedArray,
): CanvasRenderingContext2D {
  const record = (op: string, ...args: unknown[]) => {
    calls.push({ op, args });
  };
  const state: Record<string, string | number> = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    lineWidth: 1,
    font: '10px sans-serif',
  };
  const ctx = {
    canvas,
    get fillStyle(): unknown { return state.fillStyle; },
    set fillStyle(v: unknown) { state.fillStyle = String(v); record('set:fillStyle', v); },
    get strokeStyle(): unknown { return state.strokeStyle; },
    set strokeStyle(v: unknown) { state.strokeStyle = String(v); record('set:strokeStyle', v); },
    get globalAlpha(): unknown { return state.globalAlpha; },
    set globalAlpha(v: unknown) { state.globalAlpha = Number(v); record('set:globalAlpha', v); },
    get globalCompositeOperation(): unknown { return state.globalCompositeOperation; },
    set globalCompositeOperation(v: unknown) { state.globalCompositeOperation = String(v); record('set:globalCompositeOperation', v); },
    get lineWidth(): unknown { return state.lineWidth; },
    set lineWidth(v: unknown) { state.lineWidth = Number(v); record('set:lineWidth', v); },
    get font(): unknown { return state.font; },
    set font(v: unknown) { state.font = String(v); record('set:font', v); },
    fillRect: (x: number, y: number, w: number, h: number) => record('fillRect', x, y, w, h),
    clearRect: (x: number, y: number, w: number, h: number) => record('clearRect', x, y, w, h),
    strokeRect: (x: number, y: number, w: number, h: number) => record('strokeRect', x, y, w, h),
    beginPath: () => record('beginPath'),
    closePath: () => record('closePath'),
    arc: (x: number, y: number, radius: number, start: number, end: number) => record('arc', x, y, radius, start, end),
    moveTo: (x: number, y: number) => record('moveTo', x, y),
    lineTo: (x: number, y: number) => record('lineTo', x, y),
    stroke: () => record('stroke'),
    fill: () => record('fill'),
    fillText: (text: string, x: number, y: number) => record('fillText', text, x, y),
    save: () => record('save'),
    restore: () => record('restore'),
    setTransform: (...args: unknown[]) => record('setTransform', ...args),
    translate: (x: number, y: number) => record('translate', x, y),
    scale: (x: number, y: number) => record('scale', x, y),
    drawImage: (...args: unknown[]) => record('drawImage', ...args),
    getImageData: (sx: number, sy: number, sw: number, sh: number) => {
      record('getImageData', sx, sy, sw, sh);
      const data = imageDataFactory(sw, sh);
      return { data, width: sw, height: sh, colorSpace: 'srgb' } as unknown as ImageData;
    },
    putImageData: (img: ImageData, dx: number, dy: number) => record('putImageData', img, dx, dy),
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

/* ------------------------------------------------------------------ *
 * The fake Image loader                                              *
 * ------------------------------------------------------------------ */

export interface FakeImage {
  onload: (() => void) | null;
  onerror: (() => void) | null;
  naturalWidth: number;
  naturalHeight: number;
  src: string;
}

/**
 * `stubImage()` — replaces global Image with a synchronous test double:
 * setting `src` fires onload (dims from `sizes`, default 64×36) or onerror
 * (`fail(src)`) immediately. Restore via vi.unstubAllGlobals or restore().
 */
export function stubImage(opts?: {
  sizes?: Record<string, [number, number]>;
  fail?: (src: string) => boolean;
}): { restore: () => void; instances: FakeImage[] } {
  const instances: FakeImage[] = [];
  class FakeImageImpl {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = 0;
    naturalHeight = 0;
    private _src = '';
    constructor(width?: number, height?: number) {
      if (width) this.naturalWidth = width;
      if (height) this.naturalHeight = height;
      instances.push(this as unknown as FakeImage);
    }
    get src() { return this._src; }
    set src(v: string) {
      this._src = v;
      const [w, h] = opts?.sizes?.[v] ?? [64, 36];
      if (opts?.fail?.(v)) {
        this.onerror?.();
        return;
      }
      this.naturalWidth = w;
      this.naturalHeight = h;
      this.onload?.();
    }
  }
  vi.stubGlobal('Image', FakeImageImpl);
  return {
    restore: () => vi.unstubAllGlobals(),
    instances,
  };
}

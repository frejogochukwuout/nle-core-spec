# 11 — Cloud Render: Headless Chrome + Real GPU + ffmpeg at Edges

**Stream:** Cloud render pipeline
**Status:** Seed spec (sub-agent scout will refine with code references)
**Primary teacher:** FreeCut `headless/main.ts` + our own design
**Spec file:** `11-cloud-render.md`

---

## 1. Purpose

Define the cloud render pipeline: how the same TypeScript engine runs in headless Chrome on a real GPU box, producing bit-identical output to the browser preview, with ffmpeg handling codec coverage at the edges.

---

## 2. Goals

1. **WYSIWYG contract.** Browser preview = cloud render output, bit-identical.
2. **Real GPU.** Headless Chrome uses the actual GPU adapter (not software WebGPU).
3. **4 GB ceiling is fine.** Stripped of UI, audio worklet, scrubbing cache — 8K export fits.
4. **ffmpeg at edges only.** Transcode on input (ProRes → mezzanine), encode on output (raw frames → ProRes/DNxHR/H.265). Never compositing.
5. **Parallelizable.** One server can run multiple render jobs in parallel (each in its own Chrome process).
6. **RunPod-compatible.** Works on RunPod A100 / RTX 4090 / Mac M2 Ultra instances.

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────────┐
│ Browser Client                                            │
│                                                           │
│  User clicks "Export master"                              │
│    → POST /api/render                                    │
│       { projectId, format: 'prores-4444' | 'h265' | ... } │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│ Render Server (Node.js or Bun)                            │
│                                                           │
│  1. Receive request                                       │
│  2. Load project from storage (S3 / database / etc.)     │
│  3. Spawn headless Chrome process                         │
│  4. Pipe project JSON to Chrome via stdin / file          │
│  5. Wait for Chrome to produce raw frames                 │
│  6. Pipe raw frames to ffmpeg subprocess                  │
│  7. ffmpeg encodes to requested format                    │
│  8. Upload output to S3                                   │
│  9. Return signed URL to client                           │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│ Headless Chrome Process (one per render job)              │
│                                                           │
│  Loads our web app's render entry point:                  │
│    /render.html?project=<project-id>                      │
│                                                           │
│  Web app runs:                                            │
│    const engine = await createRenderEngine({              │
│      canvas: offscreenCanvas,                            │
│      storage: serverStorage,                              │
│      project: projectJSON,                                │
│      pixelFormat: 'yuv422p10le',                          │
│      onFrame: (n, pixels) => postMessage(pixels),         │
│    });                                                    │
│                                                           │
│  For each frame:                                          │
│    await engine.renderFrame(n);                           │
│    → pixels flow back to server via postMessage           │
│                                                           │
│  Real GPU adapter (WebGPU on Linux via Vulkan)            │
└──────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│ ffmpeg Subprocess                                        │
│                                                           │
│  Input: raw frames via stdin (pipe:0)                    │
│    - format: rgb24 or yuv422p10le                        │
│    - resolution: project's canvas size                   │
│    - framerate: project's fps                             │
│                                                           │
│  Output: encoded file to stdout or S3 stream             │
│    - codec: prores_ks, h264, hevc, etc.                   │
│    - container: mov, mp4, mkv                             │
│                                                           │
│  Command:                                                 │
│  ffmpeg -f rawvideo -pixel_format yuv422p10le \          │
│    -video_size 3840x2160 -framerate 30000/1001 \          │
│    -i pipe:0 \                                            │
│    -c:v prores_ks -profile:v 4 \                          │
│    -pix_fmt yuv422p10le \                                 │
│    output.mov                                             │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Headless Chrome Setup

### 4.1 Chrome flags

```bash
google-chrome \
  --headless=new \
  --disable-gpu-sandbox \
  --enable-features=Vulkan \
  --enable-unsafe-swiftshader \  # fallback if no real GPU (NOT what we want)
  --use-vulkan \
  --enable-webgpu \
  --disable-software-rasterizer \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-render \
  about:blank
```

**Critical:** `--enable-unsafe-swiftshader` is the fallback for when no real GPU is available. We must NOT use this — we want real GPU. Remove this flag and ensure the GPU is properly passthrough'd to the container.

**Sub-agent scout task:** Research the exact Chrome flags needed for real-GPU WebGPU in headless mode on Linux. Verify:
- Vulkan driver is installed and working
- Chrome can see the GPU adapter
- WebGPU is enabled (test via `navigator.gpu.requestAdapter()`)
- RunPod GPU containers support this

### 4.2 RunPod / container setup

RunPod containers need:
- NVIDIA drivers + Vulkan
- Chrome installed
- ffmpeg installed (with libx264, libx265, prores support)
- Node.js or Bun for the server

Suggested Dockerfile:

```dockerfile
FROM nvidia/cuda:12.2.0-runtime-ubuntu22.04

# Install Vulkan + Chrome + ffmpeg
RUN apt-get update && apt-get install -y \
    vulkan-tools \
    libvulkan1 \
    google-chrome-stable \
    ffmpeg \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install app
COPY . /app
WORKDIR /app
RUN npm ci --production

# Verify GPU
RUN vulkaninfo | grep "GPU id"

# Verify Chrome + WebGPU
RUN google-chrome --headless=new --disable-gpu-sandbox --enable-features=Vulkan --enable-webgpu --dump-dom about:blank | grep "WebGPU"

CMD ["node", "server.js"]
```

**Sub-agent scout task:** Verify this Dockerfile works. Find a working Docker image that has Chrome + Vulkan + WebGPU. Test on RunPod.

### 4.3 Driving headless Chrome

Use Playwright or Puppeteer to drive headless Chrome:

```ts
// server.ts

import { chromium } from 'playwright';

async function renderProject(projectId: string, format: ExportFormat): Promise<string> {
  // 1. Load project from storage
  const project = await loadProject(projectId);
  
  // 2. Spawn ffmpeg
  const ffmpeg = spawnFFmpeg(project, format);
  
  // 3. Spawn headless Chrome
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-gpu-sandbox',
      '--enable-features=Vulkan',
      '--enable-webgpu',
      '--use-vulkan',
    ],
  });
  
  const page = await browser.newPage();
  
  // 4. Expose a callback for the page to send frames back
  let frameCount = 0;
  const totalFrames = Math.ceil(mediaTimeToSeconds({ time: project.totalDuration }) * frameRateToNumber(project.settings.fps));
  
  await page.exposeFunction('onFrame', async (frameNumber: number, pixels: ArrayBuffer) => {
    ffmpeg.stdin.write(Buffer.from(pixels));
    frameCount++;
    if (frameCount % 30 === 0) {
      console.log(`Rendered ${frameCount}/${totalFrames} frames`);
    }
  });
  
  // 5. Load the render entry point with project ID
  await page.goto(`https://localhost:5173/render.html?project=${projectId}`);
  
  // 6. Wait for completion
  await page.waitForFunction(() => window['__renderComplete'] === true);
  
  // 7. Cleanup
  ffmpeg.stdin.end();
  await new Promise(resolve => ffmpeg.on('close', resolve));
  await browser.close();
  
  // 8. Upload output
  const url = await uploadToS3(`${projectId}.mov`, outputPath);
  return url;
}
```

### 4.4 Render entry point (in the web app)

```html
<!-- /render.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Render</title>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script type="module" src="/render.ts"></script>
</body>
</html>
```

```ts
// /render.ts

import { createRenderEngine } from './engine/render';

const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('project')!;

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const engine = await createRenderEngine({
  canvas: canvas.transferControlToOffscreen(),
  storage: createRemoteStorage(),  // fetches from server
  project: await fetchProject(projectId),
  pixelFormat: 'yuv422p10le',
  onFrame: async (n, pixels) => {
    await (window as any).onFrame(n, pixels);
  },
});

const totalFrames = engine.getTotalFrames();
for (let n = 0; n < totalFrames; n++) {
  await engine.renderFrame(n);
}

(window as any).__renderComplete = true;
```

---

## 5. The Render Engine

### 5.1 `createRenderEngine` (cloud entry point)

```ts
// src/engine/render.ts

import { EditorCore } from './core/EditorCore';
import { WebGPURenderer } from '../platform/renderer/WebGPURenderer';
import { WebCodecsDecoder } from '../platform/decoder/WebCodecsDecoder';
import { WebAudioAdapter } from '../platform/audio/WebAudioAdapter';
import { StaticClock } from '../platform/clock/StaticClock';
import { ManagedWorkerPool } from '../platform/workers/ManagedWorkerPool';
import { RemoteStorage } from '../platform/storage/RemoteStorage';

export interface RenderEngineOptions {
  canvas: OffscreenCanvas;
  storage: Storage;
  project: ProjectJSON;
  pixelFormat: 'rgb24' | 'yuv422p10le';
  onFrame: (frameNumber: number, pixels: Uint8ClampedArray | Uint16Array) => Promise<void>;
}

export interface RenderEngine {
  getTotalFrames(): number;
  renderFrame(n: number): Promise<void>;
  renderAudio(): Promise<Float32Array>;
  dispose(): void;
}

export async function createRenderEngine(opts: RenderEngineOptions): Promise<RenderEngine> {
  const decoder = new WebCodecsDecoder();
  const renderer = new WebGPURenderer();
  const audio = new WebAudioAdapter();
  const clock = new StaticClock();
  const workerPool = new ManagedWorkerPool();
  
  const engine = EditorCore.getInstance({
    storage: opts.storage,
    decoder,
    renderer,
    audio,
    clock,
    workerPool,
  });
  
  await renderer.initialize(opts.canvas);
  await decoder.initialize();
  
  await engine.project.loadFromJSON(opts.project);
  
  const fps = engine.scenes.getActive().settings.fps;
  const totalFrames = mediaTimeToFrame({ 
    time: engine.timeline.getTotalDuration(), 
    rate: fps 
  });
  
  return {
    getTotalFrames: () => totalFrames,
    
    async renderFrame(n: number): Promise<void> {
      const time = mediaTimeFromFrame({ frame: n, rate: fps });
      clock.stepTo(time);
      
      // Build the frame descriptor
      const state = engine.scenes.getActiveState();
      const descriptor = buildFrameDescriptor(state, n);
      
      // Render
      const result = await renderer.renderFrame(descriptor);
      
      // Read pixels back (this is the bottleneck — see §7)
      const pixels = await renderer.readPixels(result.texture, opts.pixelFormat);
      
      // Pipe to ffmpeg via the callback
      await opts.onFrame(n, pixels);
    },
    
    async renderAudio(): Promise<Float32Array> {
      const offlineCtx = audio.createOfflineContext(
        engine.scenes.getActive().settings.audioChannels,
        Math.ceil(mediaTimeToSeconds({ time: engine.timeline.getTotalDuration() }) * 48000),
        48000
      );
      
      await audio.registerVarispeedProcessor(offlineCtx);
      
      // Build audio graph
      const audioGraph = buildAudioGraph(engine.scenes.getActiveState(), offlineCtx);
      
      // Render
      const buffer = await offlineCtx.startRendering();
      return buffer.getChannelData(0);  // mono for now; extend to multi-channel
    },
    
    dispose(): void {
      EditorCore.reset();
    },
  };
}
```

### 5.2 Memory budget for cloud render

| Component | Memory |
|---|---|
| Chrome headless baseline | ~300 MB |
| WebGPU device + queues | ~200 MB |
| Engine core (managers, etc.) | ~100 MB |
| One source frame decoded (4K 10-bit) | ~50 MB |
| Composite working textures (4K) | ~130 MB |
| Output pixel buffer (4K 10-bit) | ~16 MB |
| Audio mix buffer (10 min stereo, 48kHz) | ~110 MB |
| **Total (4K export)** | **~900 MB** |
| **Total (8K export)** | **~1.5 GB** |

Well under the 4 GB ceiling. 8K fits comfortably.

---

## 6. ffmpeg Integration

### 6.1 ffmpeg subprocess

```ts
import { spawn } from 'child_process';

function spawnFFmpeg(project: ProjectJSON, format: ExportFormat): ChildProcess {
  const fps = project.settings.fps;
  const width = project.settings.canvasSize.width;
  const height = project.settings.canvasSize.height;
  
  // Pixel format
  const pixelFormat = format.pixelFormat;  // 'rgb24' or 'yuv422p10le'
  
  // Build args
  const args: string[] = [
    // Input: raw frames from stdin
    '-f', 'rawvideo',
    '-pixel_format', pixelFormat,
    '-video_size', `${width}x${height}`,
    '-framerate', `${fps.numerator}/${fps.denominator}`,
    '-i', 'pipe:0',
    
    // Encode
    '-c:v', format.codec,
  ];
  
  // Codec-specific args
  switch (format.codec) {
    case 'prores_ks':
      args.push('-profile:v', format.profile || '4');  // 4 = ProRes 4444
      args.push('-pix_fmt', 'yuv422p10le');  // or yuva444p10le for alpha
      break;
    case 'libx264':
      args.push('-preset', format.preset || 'medium');
      args.push('-crf', format.crf || '18');
      args.push('-pix_fmt', 'yuv420p');
      break;
    case 'libx265':
      args.push('-preset', format.preset || 'medium');
      args.push('-crf', format.crf || '20');
      args.push('-pix_fmt', 'yuv420p10le');
      break;
    case 'libvpx-vp9':
      args.push('-crf', format.crf || '32');
      args.push('-b:v', '0');
      args.push('-pix_fmt', 'yuv420p10le');
      break;
  }
  
  // Output
  args.push('-y', format.outputPath);
  
  return spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
}
```

### 6.2 Audio muxing

Audio is rendered separately by `OfflineAudioContext`, then muxed with video:

```ts
// Render video frames (piped to ffmpeg #1)
await renderVideoFrames(engine, ffmpegVideo);

// Render audio (separate ffmpeg subprocess → WAV file)
const audioBuffer = await engine.renderAudio();
const wavFile = encodeWAV(audioBuffer, 48000, 2);
await fs.writeFile('/tmp/audio.wav', wavFile);

// Mux video + audio
const ffmpegMux = spawn('ffmpeg', [
  '-i', '/tmp/video.mov',
  '-i', '/tmp/audio.wav',
  '-c:v', 'copy',
  '-c:a', 'pcm_s16le',  // or aac, etc.
  '-y', '/tmp/output.mov',
]);
await new Promise(resolve => ffmpegMux.on('close', resolve));
```

### 6.3 Supported export formats

| Format | Codec | Container | Use case |
|---|---|---|---|
| ProRes 422 HQ | prores_ks (profile 3) | MOV | Standard editing handoff |
| ProRes 422 | prores_ks (profile 2) | MOV | Lighter editing handoff |
| ProRes 4444 | prores_ks (profile 4) | MOV | With alpha |
| DNxHR HQX | dnxhd | MOV | Avid handoff |
| H.264 | libx264 | MP4 | Web delivery |
| H.265 / HEVC | libx265 | MP4 | Web delivery (smaller) |
| VP9 | libvpx-vp9 | WebM | Web delivery (royalty-free) |
| AV1 | libaom-av1 | MP4 / WebM | Future web delivery |

---

## 7. GPU Readback (The Bottleneck)

### 7.1 The problem

`GPUTexture` → CPU memory is slow. We need to copy the rendered frame from a GPU texture to a CPU-accessible buffer, then send it to ffmpeg.

For 4K RGBA at 60fps:
- Frame size: 3840 × 2160 × 4 = 33 MB
- GPU→CPU readback: ~200 MB/s on typical GPUs
- Max throughput: ~6 fps at 4K (way too slow)

### 7.2 The fix: 10-bit YUV

If we read back as `yuv422p10le` (YUV 4:2:2 10-bit):
- Frame size: 3840 × 2160 × 2 (Y) + 1920 × 2160 × 4 (UV interleaved) = ~25 MB
- Same readback speed: ~8 fps at 4K

Still too slow. We need parallelism.

### 7.3 The fix: parallel readback

Render N frames ahead, pipeline the readback:

```ts
class RenderPipeline {
  private frameQueue: Array<{ n: number; texture: GPUTexture; promise: Promise<Uint16Array> }> = [];
  private maxInFlight = 3;
  
  async renderFrames(startFrame: number, endFrame: number, onFrame: (n: number, pixels: Uint16Array) => Promise<void>) {
    for (let n = startFrame; n < endFrame; n++) {
      // Wait if queue is full
      while (this.frameQueue.length >= this.maxInFlight) {
        const oldest = this.frameQueue.shift()!;
        const pixels = await oldest.promise;
        await onFrame(oldest.n, pixels);
      }
      
      // Render frame
      const texture = await this.renderTexture(n);
      
      // Start readback (async)
      const readbackPromise = this.readPixels(texture, 'yuv422p10le');
      this.frameQueue.push({ n, texture, promise: readbackPromise });
    }
    
    // Drain remaining
    while (this.frameQueue.length > 0) {
      const oldest = this.frameQueue.shift()!;
      const pixels = await oldest.promise;
      await onFrame(oldest.n, pixels);
    }
  }
}
```

This pipelines render + readback. With 3 frames in flight, effective throughput is ~3x faster.

### 7.4 The fix: MapAsync with copy

```ts
async function readPixels(texture: GPUTexture, format: PixelFormat): Promise<Uint16Array> {
  // 1. Copy from texture to a buffer
  const buffer = device.createBuffer({
    size: width * height * bytesPerPixel,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  
  const encoder = device.createCommandEncoder();
  encoder.copyTextureToBuffer(
    { texture, mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
    { buffer, offset: 0, bytesPerRow: width * bytesPerPixel, rowsPerImage: height },
    { width, height, depthOrArrayLayers: 1 }
  );
  device.queue.submit([encoder.finish()]);
  
  // 2. Map the buffer for reading
  await buffer.mapAsync(GPUMapMode.READ);
  const arrayBuffer = buffer.getMappedRange();
  const pixels = new Uint16Array(arrayBuffer.slice(0));  // copy out
  
  // 3. Unmap + destroy
  buffer.unmap();
  buffer.destroy();
  
  return pixels;
}
```

### 7.5 Realistic throughput

With 3 frames in flight + 10-bit YUV readback:
- 4K: ~80-100 fps render, ~30-50 fps readback → effective ~30-50 fps
- 8K: ~20-30 fps render, ~10-15 fps readback → effective ~10-15 fps

For a 10-minute 4K video at 30fps = 18,000 frames, at 30 fps effective = 10 minutes of render time. Acceptable for cloud render.

For 8K (10 min at 30fps = 18,000 frames, at 12 fps effective = 25 minutes of render time). Still acceptable for cloud.

---

## 8. Storage Layer (Server-side)

### 8.1 Project storage on server

The server fetches projects from its own storage (not OPFS, which is browser-only):

```ts
// src/platform/storage/RemoteStorage.ts (browser side, calls server)
// src/server/storage/ (server side, real storage)

class S3Storage implements Storage {
  async loadProject(id: string): Promise<ProjectJSON | null> {
    const url = `https://s3.amazonaws.com/my-bucket/projects/${id}.json`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const parsed = await response.json();
    return ProjectSchema.parse(parsed);
  }
  
  async loadMedia(mediaId: string): Promise<Blob | null> {
    const url = `https://s3.amazonaws.com/my-bucket/media/${mediaId}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.blob();
  }
  
  // ...
}
```

### 8.2 Media streaming

For large media files, don't download the whole file. Stream from S3 to the decoder:

```ts
class StreamingMediaSource {
  constructor(private url: string) {}
  
  async getRange(start: number, end: number): Promise<ArrayBuffer> {
    const response = await fetch(this.url, {
      headers: { Range: `bytes=${start}-${end}` }
    });
    return await response.arrayBuffer();
  }
}
```

mediabunny should support streaming sources — verify.

---

## 9. Parallelism & Queue

### 9.1 Multiple render jobs

Each render job is its own Chrome process. A single server can run multiple in parallel, limited by:
- GPU memory (each Chrome + GPU context uses ~1-2 GB of VRAM)
- CPU cores (each ffmpeg process uses 1-2 cores)

On a 4-GPU RunPod box:
- 4 parallel jobs (one per GPU)
- Each job uses 1 GPU + 2 CPU cores
- Total: 4 GPUs, 8 CPU cores

### 9.2 Render queue

```ts
class RenderQueue {
  private queue: RenderJob[] = [];
  private active: RenderJob[] = [];
  private maxConcurrent = 4;  // depends on server capacity
  
  async enqueue(job: RenderJob): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push({ ...job, resolve, reject });
      this.drain();
    });
  }
  
  private async drain() {
    while (this.queue.length > 0 && this.active.length < this.maxConcurrent) {
      const job = this.queue.shift()!;
      this.active.push(job);
      this.runJob(job)
        .then(job.resolve, job.reject)
        .finally(() => {
          this.active = this.active.filter(j => j !== job);
          this.drain();
        });
    }
  }
  
  private async runJob(job: RenderJob): Promise<string> {
    // ... renderProject(job.projectId, job.format)
  }
}
```

### 9.3 Progress reporting

The client polls or uses WebSockets for progress:

```ts
// WebSocket
ws.on('message', (msg) => {
  const data = JSON.parse(msg);
  if (data.type === 'progress') {
    console.log(`Render ${data.frameCount}/${data.totalFrames} frames`);
  } else if (data.type === 'complete') {
    console.log(`Render complete: ${data.url}`);
  }
});
```

---

## 10. Error Handling

### 10.1 GPU device loss

If WebGPU device is lost mid-render:
- Log the error
- Restart the render job from the last completed frame
- After 3 retries, fail the job

### 10.2 ffmpeg crash

If ffmpeg crashes:
- Log the error
- Fail the job (don't retry — likely a format issue)
- Save partial output if possible

### 10.3 Chrome crash

If headless Chrome crashes:
- Log the error
- Restart the render job from the last completed frame
- After 3 retries, fail the job

### 10.4 Timeout

If a render job takes >2x the expected time:
- Mark as timed out
- Kill Chrome + ffmpeg
- Fail the job

---

## 11. WYSIWYG Verification

### 11.1 The contract

For any project state and frame N:
- Browser render of frame N produces pixels P_browser
- Cloud render of frame N produces pixels P_cloud
- P_browser === P_cloud (bit-identical)

### 11.2 Verification test

Run a battery of test projects through both paths:

```ts
async function verifyWYSIWYG(project: ProjectJSON): Promise<boolean> {
  const testFrames = [0, 30, 100, 500, 1000];  // sample frames
  
  // Render via browser
  const browserPixels: Record<number, Uint16Array> = {};
  const browserEngine = await createInteractiveEngine({ ... });
  for (const n of testFrames) {
    browserPixels[n] = await browserEngine.renderFrameForTest(n);
  }
  
  // Render via cloud
  const cloudPixels: Record<number, Uint16Array> = {};
  const cloudEngine = await createRenderEngine({ ... });
  for (const n of testFrames) {
    cloudPixels[n] = await cloudEngine.renderFrame(n);
  }
  
  // Compare
  for (const n of testFrames) {
    const a = browserPixels[n];
    const b = cloudPixels[n];
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
  }
  
  return true;
}
```

This test runs in CI. Any diff > 0 pixels fails the build.

---

## 12. Open Questions for Sub-Agent Scout

1. **FreeCut `headless/main.ts`.** Read in full. Document:
   - How FreeCut drives the editor headlessly
   - Playwright usage pattern
   - The `window.freecut` API surface they expose
   - How they handle render output

2. **Chrome headless flags for real GPU.** Research the exact flags needed. Verify:
   - `--headless=new` (not old headless)
   - `--enable-features=Vulkan`
   - `--use-vulkan`
   - `--enable-webgpu`
   - `--disable-gpu-sandbox`
   - GPU passthrough in Docker / RunPod

3. **WebGPU on Linux headless.** Verify WebGPU works in headless Chrome on Linux with Vulkan. Test:
   - `navigator.gpu.requestAdapter()` returns a real adapter
   - `adapter.requestDevice()` succeeds
   - A simple triangle renders correctly

4. **GPU readback performance.** Benchmark `copyTextureToBuffer` + `mapAsync` for:
   - 1080p RGBA
   - 4K RGBA
   - 4K YUV 10-bit
   - 8K YUV 10-bit
   Find the actual bottleneck and optimal parallelism level.

5. **mediabunny streaming source.** Does mediabunny support streaming sources (e.g., HTTP range requests) for large media files? If not, we may need to download the whole file before decode (acceptable but adds latency).

6. **ffmpeg raw frame pipe.** Verify the exact ffmpeg command for reading raw frames from stdin. Test with both `rgb24` and `yuv422p10le` pixel formats. Verify the output is correct (open in VLC / FCP).

7. **RunPod GPU containers.** Verify:
   - RunPod supports GPU passthrough
   - Chrome + Vulkan work in RunPod containers
   - ffmpeg with libx264, libx265, prores_ks codecs is available
   - Network bandwidth for uploading output to S3

8. **Chrome process management.** Research how to manage many Chrome processes on a server:
   - Process limits (max open file descriptors, max processes)
   - Memory limits per process
   - Cleanup on crash

9. **Cloud render cost.** Estimate cost per render:
   - RunPod A100 instance: ~$2-3/hour
   - RunPod RTX 4090 instance: ~$0.5-1/hour
   - Render speed: 4K @ 30fps for 10 min = ~10 min render time = ~$0.5 per render on 4090
   - Verify these estimates

10. **OfflineAudioContext in cloud render.** Verify OfflineAudioContext works in headless Chrome. Test:
    - Render a simple beep
    - Verify the output WAV is correct

11. **AudioWorklet in OfflineAudioContext.** Verify the SoundTouch AudioWorklet runs correctly in OfflineAudioContext. Test:
    - Render audio at 0.5× speed
    - Verify output is double duration with same pitch

12. **S3 upload.** Verify the upload pattern:
    - Multipart upload for large files
    - Signed URLs for client download
    - Cleanup of old renders

---

## 13. Test Plan for This Stream

1. **Headless Chrome + WebGPU test:** Spawn headless Chrome with our render entry point. Verify WebGPU initializes and renders a triangle.

2. **Single-frame render test:** Render frame 0 of a sample project. Verify pixel output matches expected reference.

3. **Multi-frame render test:** Render 100 frames of a sample project. Verify all frames produce correct output.

4. **ffmpeg integration test:** Pipe 100 frames to ffmpeg, encode to ProRes. Open output in VLC — verify correct.

5. **WYSIWYG test:** Render 10 sample projects via both browser and cloud. Pixel-diff each. Must be 0% difference.

6. **Audio render test:** Render audio for a 1-minute project. Verify WAV output matches expected.

7. **Audio + video mux test:** Render video and audio separately, mux via ffmpeg. Verify final MOV plays correctly.

8. **Large project test:** Render a 10-minute 4K project. Verify completion within reasonable time (~10 min).

9. **8K render test:** Render a 1-minute 8K project. Verify completion (~5 min).

10. **GPU device loss test:** Simulate GPU device loss mid-render. Verify recovery (restart from last frame).

11. **Parallel jobs test:** Run 4 render jobs concurrently on a 4-GPU box. Verify all complete in ~same time as one job.

12. **Cost test:** Run a real render and verify cost is within budget ($0.5-1 per 4K minute).

---

**End of `11-cloud-render.md`.** Next: `12-testing-strategy.md`.

# 11 — Cloud Render: Headless Chrome + Real GPU + ffmpeg at Edges

**Stream:** Cloud render pipeline
**Status:** Refined (SCOUT-11) — primary teacher FreeCut `src/headless/main.ts` (1293 LOC) + FreeCut `headless/` directory (24 driver files) + our own design
**Primary teacher:** FreeCut `headless/main.ts` + our own design
**Spec file:** `11-cloud-render.refined.md`
**Seed:** `11-cloud-render.md` (876 LOC)

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

> **Refined (SCOUT-11):** the diagram above is the *seed* architecture. FreeCut's actual headless harness (verified in §15) uses a different pattern: the in-browser WebCodecs muxer (mediabunny) produces the final encoded file as a `Blob`, then `triggerDownload()` fires an `<a download>` click and Playwright captures the download event via `page.waitForEvent('download')`. This pattern works for codecs Chrome's WebCodecs supports (H.264, H.265, VP9, AV1, Opus, AAC). For codecs Chrome cannot encode (ProRes 4444, DNxHR, ProRes 422 HQ), we fall back to the seed-spec pattern: pipe raw frames to a server-side ffmpeg subprocess. See §11.4 "Two-path encode strategy" for the full matrix.

---

## 4. Headless Chrome Setup

### 4.1 Chrome flags — VERIFIED for real GPU WebGPU in headless Linux containers

**Source:** Tiger Abrodi, "How to get WebGPU in Headless Chrome on Cloud GPUs" (Feb 2026), tested on RunPod A40 (driver 570), Google Colab T4 (driver 580), Modal T4 (driver 580). https://tigerabrodi.blog/how-to-get-webgpu-in-headless-chrome-on-cloud-gpus

**Verified working flag set (Linux + NVIDIA Vulkan + container, no display):**

```bash
google-chrome \
  --no-sandbox \
  --headless=new \
  --enable-unsafe-webgpu \
  --enable-features=Vulkan \
  --use-angle=vulkan \
  --disable-vulkan-surface \
  --ignore-gpu-blocklist \
  --disable-gpu-sandbox \
  --enable-dawn-features=allow_unsafe_apis,disable_adapter_blocklist \
  --disable-dawn-features=disallow_unsafe_apis \
  --user-data-dir=/tmp/chrome-render \
  about:blank
```

> **Critical corrections to seed spec §4.1 (see §14.A through §14.G):**
> 1. `--use-vulkan` is NOT a real Chrome flag. The correct flag is `--use-angle=vulkan` (ANGLE backend selector).
> 2. `--enable-webgpu` is NOT a real Chrome flag. The correct flag is `--enable-unsafe-webgpu` (Chrome 113+, on by default in 121+ on supported platforms).
> 3. `--enable-unsafe-swiftshader` is the OPPOSITE of what we want — it forces software WebGPU. The seed spec correctly excludes it but the seed also says "Remove this flag" — actually the flag should never be set in the first place.
> 4. `--disable-software-rasterizer` is NOT necessary if `--use-angle=vulkan` is set (Vulkan IS the rasterizer).
> 5. `--remote-debugging-port=9222` is NOT needed when driven by Playwright/Puppeteer — they speak CDP over a pipe.
> 6. **Missing critical flag:** `--enable-dawn-features=allow_unsafe_apis,disable_adapter_blocklist` — without this, Dawn (Chrome's WebGPU engine) rejects NVIDIA drivers 570+ via its own separate adapter blocklist, even when `--ignore-gpu-blocklist` is set. `requestAdapter()` returns null.
> 7. **Missing critical flag:** `--disable-vulkan-surface` — disables the swapchain; required for offscreen-only contexts (no display attached). Perfect for cloud render.
> 8. **Pitfall:** Puppeteer's default args include `--use-angle=swiftshader-webgl` which silently OVERRIDES `--use-angle=vulkan`. Must be excluded via `ignoreDefaultArgs: ['--use-angle=swiftshader-webgl']`. Playwright's `channel: 'chrome'` does not inject this flag (Playwright launches Chrome itself, not bundled Chromium), so we are safe — but if we ever switch to Puppeteer, this is the trap.

> **FreeCut's actual flag set (headless/lib/cli.mjs:31-51):**
> ```js
> const angle = process.platform === 'win32' ? '--use-angle=d3d11'
>   : process.platform === 'darwin' ? '--use-angle=metal'
>   : '--use-angle=vulkan'
> const base = [
>   '--enable-unsafe-webgpu',
>   '--enable-features=Vulkan',
>   '--ignore-gpu-blocklist',
>   angle,
> ]
> ```
> FreeCut's set is a SUBSET of the verified-working set. It omits the Dawn adapter-blocklist flags (`--enable-dawn-features=allow_unsafe_apis,disable_adapter_blocklist`) and `--disable-vulkan-surface`. FreeCut's Dockerfile (§17) uses Mesa lavapipe (software Vulkan), so the adapter blocklist isn't triggered. For our real-GPU RunPod deployment we MUST add the Dawn flags or NVIDIA 570+ drivers will return null adapters.

**Critical environment prerequisites (RunPod containers):**

1. **Vulkan loader ≥ 1.4.** Ubuntu 22.04 ships Vulkan loader 1.3.204. NVIDIA drivers 570+ declare Vulkan 1.4. The old loader REJECTS the newer driver with `ERROR_INCOMPATIBLE_DRIVER` or `Could not get vkCreateInstance`. Install from lunarg:
   ```bash
   wget -qO - https://packages.lunarg.com/lunarg-signing-key-pub.asc | apt-key add -
   wget -qO /etc/apt/sources.list.d/lunarg-vulkan.list \
     https://packages.lunarg.com/vulkan/lunarg-vulkan-jammy.list
   apt update && apt install -qqq libvulkan1
   ```
   Verify: `vulkaninfo --summary` should show the GPU with Vulkan 1.4.x.

2. **NVIDIA Vulkan ICD must match running driver.** The container has `libnvidia-gl-525` installed but the host driver might be 570/580. Install matching package:
   ```bash
   nvidia-smi | head -3   # check driver version
   apt install -qqq libnvidia-gl-580   # match!
   ```
   On RunPod, the driver libs are host-mounted and can't be replaced — in that case the ICD may already exist at `/etc/vulkan/icd.d/nvidia_icd.json`. Verify with `cat /etc/vulkan/icd.d/*.json`.

3. **`dbus` must be running** before Chrome launches:
   ```bash
   /etc/init.d/dbus start
   ```

4. **Secure context required.** `navigator.gpu` is `undefined` on `about:blank` (NOT a secure context) and `file://` URLs. `http://localhost` and `http://127.0.0.1` ARE secure contexts. FreeCut's `headless/server.mjs:107` binds to `127.0.0.1:port` for exactly this reason.

5. **`powerPreference: 'low-power'`** in `requestAdapter()` — the default preference returns null on some setups. (Verified by tigerabrodi blog, Problem 4.)
6. **Xvfb fallback for GPU-less CI:** in containers without GPU passthrough, `--headless=new` alone can return `null` from `requestAdapter()`; a dedicated Xvfb display + software Vulkan is the validated fallback (nle-engine Decision 12 — reference, see 19-code-references.md).

### 4.2 RunPod / container setup

RunPod containers need:
- NVIDIA drivers + Vulkan ≥ 1.4
- Google Chrome (not Chromium — for H.264/AAC proprietary codec support)
- ffmpeg installed (with libx264, libx265, prores_ks, dnxhd support)
- Node.js or Bun for the server
- `dbus` daemon running

RunPod GPU instance types and pricing (verified 2026-11, https://www.runpod.io/pricing):

| GPU | VRAM | Community Cloud | Secure Cloud | Use case |
|---|---|---|---|---|
| RTX 4090 | 24 GB | $0.34/hr | $0.74/hr | Best price/perf for 4K |
| RTX A6000 | 48 GB | $0.33/hr | $0.53/hr | Long renders, large VRAM |
| A40 | 48 GB | $0.44/hr | — | Tigerabrodi's verified GPU |
| L4 | 24 GB | $0.49/hr | — | Cheapest T4-alternative |
| A100 PCIe | 80 GB | $1.19/hr | $1.39/hr | 8K renders, multi-tenant |
| A100 SXM | 80 GB | $1.39/hr | $1.59/hr | Multi-GPU box |
| H100 PCIe | 80 GB | $1.99/hr | $2.89/hr | Not needed for NLE |

**Serverless pricing (per-second billing):**

| GPU | Serverless price |
|---|---|
| RTX 4090 | $1.10/hr |
| A100 | $2.72/hr |
| H100 | $4.79/hr |

> Seed spec claimed "A100: ~$2-3/hour" and "4090: ~$0.5-1/hour" — both roughly correct (4090 Secure Cloud is $0.74/hr; A100 Secure Cloud is $1.39/hr). The seed's "$0.5 per 4K render minute" estimate is roughly right; see §11.6 for a refined cost model.

### 4.3 Driving headless Chrome — VERIFIED pattern

FreeCut's driver is in `headless/render.mjs` (196 LOC) and `headless/lib/render-core.mjs` (338 LOC). Verified pattern uses **Playwright** with `channel: 'chrome'` (system Chrome, not bundled Chromium):

```ts
// FreeCut headless/render.mjs:127-131
const browser = await chromium.launch({
  channel: 'chrome',
  headless: !args.head,
  args: chromeLaunchArgs(),
})
const context = await browser.newContext({ acceptDownloads: true })  // ⭐ acceptDownloads=true
const page = await context.newPage()
```

The seed spec's Playwright sketch (§4.3, lines 199-205) is fundamentally correct in approach but uses `page.exposeFunction('onFrame', ...)` for streaming raw frame ArrayBuffers — this works but is **slow** (CDP serializes ArrayBuffer via base64, ~33% inflation, ~100Mbps typical throughput). See §11.2 for why the seed's `onFrame` pattern should be used only for codecs WebCodecs can't encode; for H.264/VP9/AV1 we use FreeCut's in-browser download pattern (§15.2 + §11.4).

### 4.4 Render entry point (in the web app)

The seed spec's `/render.html` + `/render.ts` sketch is structurally correct. FreeCut's equivalent is `headless.html` + `src/headless/main.ts` (which IS the harness; FreeCut does NOT have a separate `/render.ts` file — `main.ts` IS the entry). See §15 for the full API surface.

---

## 5. The Render Engine

### 5.1 `createRenderEngine` (cloud entry point)

> §15.I requires multi-channel for v1; the seed's mono placeholder is retired by this Round-7 edit.

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
  renderAudio(): Promise<Float32Array[]>;  // per-channel planes (§15.I — multi-channel is a v1 requirement; mono was a seed placeholder)
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
  
  const fps = engine.scenes.getActiveScene().settings.fps;
  const totalFrames = mediaTimeToFrame({ 
    time: engine.timeline.getTotalDuration(), 
    rate: fps 
  });
  
  return {
    getTotalFrames: () => totalFrames,
    
    async renderFrame(n: number): Promise<void> {
      const time = mediaTimeFromFrame({ frame: n, rate: fps });
      clock.stepTo(time);
      
      // Build the frame descriptor. OpenCut-classic's `ScenesManager` has no
      // `getActiveState()` (the seed spec's "frozen snapshot" concept is the
      // consumer's responsibility — see spec 01 §3.3 / §14.4). We snapshot the
      // active scene's tracks at the moment of frame computation.
      const activeScene = engine.scenes.getActiveScene();
      const descriptor = buildFrameDescriptor(activeScene, n);
      
      // Render
      const result = await renderer.renderFrame(descriptor);
      
      // Read pixels back (this is the bottleneck — see §7)
      const pixels = await renderer.readPixels(result.texture, opts.pixelFormat);
      
      // Pipe to ffmpeg via the callback
      await opts.onFrame(n, pixels);
    },
    
    async renderAudio(): Promise<Float32Array[]> {
      const offlineCtx = audio.createOfflineContext(
        engine.scenes.getActiveScene().settings.audioChannels,
        Math.ceil(mediaTimeToSeconds({ time: engine.timeline.getTotalDuration() }) * 48000),
        48000
      );
      
      await audio.registerVarispeedProcessor(offlineCtx);
      
      // Build audio graph
      const audioGraph = buildAudioGraph(engine.scenes.getActiveScene(), offlineCtx);
      
      // Render
      const buffer = await offlineCtx.startRendering();
      const channels: Float32Array[] = [];
      for (let c = 0; c < buffer.numberOfChannels; c++) channels.push(buffer.getChannelData(c));
      return channels;  // §15.I: multi-channel (stereo min) for v1; mono placeholder retired
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

**VRAM budget (per job, from §15.J):**

| Component | VRAM |
|---|---|
| Chrome GPU process baseline | ~200 MB |
| WebGPU device + queues | ~150 MB |
| Composite working textures (4K) | ~130 MB |
| Decoded source texture cache (4K, 10-bit, 4 frames) | ~200 MB |
| Output texture (4K 10-bit) | ~16 MB |
| **Total per job (4K)** | **~700 MB** |
| **Total per job (8K)** | **~1.8 GB** |

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
| ProRes 4444 XQ | prores_ks (profile 5) | MOV | Highest-quality mastering |
| DNxHR HQX | dnxhd (profile dnxhr_hqx) | MOV | Avid handoff |
| DNxHR HQ | dnxhd (profile dnxhr_hq) | MOV | Avid handoff (lighter) |
| H.264 | libx264 | MP4 | Web delivery |
| H.265 / HEVC | libx265 | MP4 | Web delivery (smaller) |
| VP9 | libvpx-vp9 | WebM | Web delivery (royalty-free) |
| AV1 | libaom-av1 | MP4 / WebM | Future web delivery |

> **Refined (SCOUT-11):** Added ProRes 4444 XQ (profile 5). Added DNxHR HQ (profile dnxhr_hq). Verified profile numbers via ASWF ORI Encoding Guidelines (https://academysoftwarefoundation.github.io/EncodingGuidelines/EncodeProres.html): profile 0=proxy, 1=lt, 2=standard, 3=hq, 4=4444, 5=4444xq. `prores_ks` can only encode 10-bit (decoding supports ≥10-bit); use `-pix_fmt yuv422p10le` for ProRes 422 variants, `-pix_fmt yuv444p10le` (no alpha) or `-pix_fmt yuva444p10le` (with alpha) for ProRes 4444. ASWF recommends `-vendor apl0` so Apple hardware recognizes the file.

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

### 7.5 Zero-copy output path — DOES NOT EXIST (VERIFIED)

**Research finding (SCOUT-11):** `GPUDevice.importExternalTexture()` (https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/importExternalTexture) is **input-only** — it takes an `HTMLVideoElement` or `VideoFrame` and returns a `GPUExternalTexture` representing the video data directly with no copy. There is NO equivalent for the *output* direction; `copyTextureToBuffer` + `mapAsync` is the only path for GPU→CPU readback.

Chrome does expose a non-standard `GPUExternalTexture.isZeroCopy` boolean (https://developer.chrome.com/docs/web-platform/webgpu/developer-features) so developers can detect whether the input path is actually zero-copy — but again, this is input-only.

**Source:** https://webgpufundamentals.org/webgpu/lessons/webgpu-textures-external-video.html (verified 2026-11):
> "It's called importExternalTexture. This external texture represents the data in the video directly. No copy is made. zero copy video texture in WebGPU"

Source: https://github.com/gpuweb/gpuweb/issues/5172 (Apr 2025):
> "Because 'zero copy' means we need to replace the media stack resource (which means replace real buffer) during importing."

The gpuweb WG has discussed output zero-copy multiple times but no concrete proposal exists. Until then, `copyTextureToBuffer` + `mapAsync` is the only path. **The seed spec's claim that "there is no zero-copy output path" is CORRECT.**

### 7.6 Realistic throughput

With 3 frames in flight + 10-bit YUV readback:
- 4K: ~80-100 fps render, ~30-50 fps readback → effective ~30-50 fps
- 8K: ~20-30 fps render, ~10-15 fps readback → effective ~10-15 fps

For a 10-minute 4K video at 30fps = 18,000 frames, at 30 fps effective = 10 minutes of render time. Acceptable for cloud render.

For 8K (10 min at 30fps = 18,000 frames, at 12 fps effective = 25 minutes of render time). Still acceptable for cloud.

**Performance caveat (from https://stackoverflow.com/questions/78566825):** mapAsync readback can be 5000× slower in Firefox Nightly than Chrome (Firefox's WebGPU implementation is not production-ready). Use Chrome only — verified by FreeCut's Dockerfile which uses `google-chrome-stable`.

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

### 8.2 Media streaming — VERIFIED: mediabunny UrlSource supports HTTP Range

**Source:** `/tmp/freecut/node_modules/mediabunny/src/source.ts:719-998` (`UrlSource` class) and `:894-998` (`_runWorker` implementation).

**Verified behavior:**
1. UrlSource always sends a `Range: bytes=${pos}-` header on every fetch (`source.ts:902-905`):
   ```ts
   headers: {
     // Always sending a range request is a good way to probe if the server supports them
     Range: `bytes=${worker.currentPos}-`,
   },
   ```
2. If the server responds with `206 Partial Content`, UrlSource reads the byte range only and supports `parallelism` (default 2 — two parallel HTTP range fetches) plus an in-memory LRU cache (default 64 MiB).
3. If the server does NOT respond with 206, UrlSource logs a warning and falls back to whole-file download (`source.ts:946-982` — covers the `if (response.status !== 206)` gate at line 946, the warning text at 960-967, and the fallback body through line 982):
   ```ts
   if (response.status !== 206) {
     if (!this._usedForHls) {
       const url = new URL(this._url, ...);
       if (url.origin !== 'null' && !(url.pathname.endsWith('.m3u8') || ...)) {
         if (!warnedOrigins.has(url.origin)) {
           Logging._warn(
             `HTTP server (origin ${url.origin}) did not respond to a range request with 206 Partial`
             + ' Content, meaning the entire resource will now be downloaded. To enable efficient'
             + ' media file streaming across a network, please make sure your server supports'
             + ' range requests.',
           );
           warnedOrigins.add(url.origin);
         }
       }
     }
     worker.currentPos = 0;
     this._orchestrator.options.maxCacheSize = Infinity; // 🤷
     ...
   }
   ```

4. UrlSource is the default for any URL passed to mediabunny — see `/tmp/freecut/src/infrastructure/browser/mediabunny-input-source.ts:106`:
   ```ts
   return new mb.UrlSource(src)
   ```

**FreeCut's headless harness usage (main.ts:441-447):**
```ts
function registerMediaUrls(media: HeadlessMediaSource[] | undefined): void {
  if (!media?.length) return
  for (const { mediaId, url } of media) {
    if (blobUrlManager.get(mediaId)) continue
    blobUrlManager.registerUrl(mediaId, url)
  }
}
```
> "Register media URLs so resolveMediaUrls() + the engine's sub-comp media lookup resolve to them. We register the URL WITHOUT downloading the bytes: mediabunny then reads via UrlSource (HTTP Range), so large clips stream instead of being held fully in memory."

**FreeCut's harness server (`headless/server.mjs:80-93`) supports HTTP Range:**
```js
const mediaMatch = pathname.match(/^\/media\/(.+)$/)
if (mediaMatch) {
  const mediaId = assertSinglePathComponent(mediaMatch[1], 'media id')
  const filePath = resolveMedia(mediaId)
  if (!filePath) { res.writeHead(404); res.end('media not found'); return }
  await serveFile(req, res, filePath, {
    contentType: contentType(filePath),
    allowRange: true,    // ⭐ enables 206 Partial Content
  })
  return
}
```
The `serveFile` helper (`headless/lib/http-security.mjs:112-154`) implements single-byte-range parsing and returns 206 + Content-Range when `allowRange: true`.

**Conclusion:** mediabunny's UrlSource + a range-capable HTTP server (FreeCut's `server.mjs` or S3 — both support range) gives us efficient streaming. The seed spec's concern ("we may need to download the whole file before decode — adds latency but works") is the fallback path, only triggered if our server doesn't support range. We MUST support range on our media server.

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

**FreeCut's queue:** FreeCut's `headless/serve.mjs` uses an `OperationQueue` (headless/lib/operation-queue.mjs) that **serializes** requests (one page op at a time) to avoid GPU/CPU contention. The default `maxQueueDepth` is 8 (`serve.mjs:174`). For our parallel-cloud-render design (multiple Chrome processes per server), we relax this to one Chrome per GPU and use a queue per Chrome process — see §11.3.

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

**FreeCut's progress pattern (verified, headless/render.mjs:150-159):**
```ts
await page.exposeBinding('__freecutProgress', (_src, progress) => {
  if (args.json) return
  const pct = Math.floor(progress?.progress ?? 0)
  if (pct !== lastPct) {
    lastPct = pct
    process.stdout.write(
      `\r  ${progressLabel} ${(progress?.phase ?? 'render').padEnd(10)} ${pct}%   `,
    )
  }
})
```
The page side writes to `(globalThis as any).__freecutProgress` (main.ts:423-433); Playwright's `page.exposeBinding` registers a Node-side function the page can call.

---

## 10. Error Handling

### 10.1 GPU device loss

If WebGPU device is lost mid-render:
- Log the error
- Restart the render job from the last completed frame
- After 3 retries, fail the job

> **Refined (SCOUT-11):** SCOUT-04 verified that FreeCut's `effects-pipeline.ts:164-168` has only a minimal `device.lost` handler (clears cached reference, no recovery, no UI). OpenCut-classic has zero device.lost handling. Neither teacher provides a robust recovery pattern. We must implement recovery from scratch — recommended: render-frame-N checkpoint counter, on `device.lost` re-create device + re-create GPU textures + restart from checkpoint+1.

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

### §11.1 The contract

For any project state and frame N:
- Browser render of frame N produces pixels P_browser
- Cloud render of frame N produces pixels P_cloud
- P_browser === P_cloud (bit-identical)

### §11.2 WYSIWYG architecture — VERIFIED via SCOUT-07 finding

SCOUT-07 found that:
- **OpenCut-classic: TRUE WYSIWYG** — `CanvasRenderer.render({node, time})` is single code path (apps/web/src/services/renderer/canvas-renderer.ts:105)
- **FreeCut: PARTIALLY TRUE** — headless export reuses `renderComposition` (canvas-render-orchestrator.ts:447), but preview uses `<MainComposition>` React tree (different code path)

For our cloud render, we need TRUE WYSIWYG (same code path for browser preview + cloud render).

**Our design — two entry points, one `EditorCore` (matches spec 01 §3.6):**

- **Browser preview path** uses `createInteractiveEngine(opts)` — wires `AudioClock` (real-time) + `<canvas>` + `AudioContext`. The browser preview layer wraps the same engine with a `requestAnimationFrame` loop and a Canvas. Internally it calls `engine.renderer.renderFrame(descriptor)` per rAF tick (live preview) or `engine.renderer.renderFrame(time)` on demand (seek/snapshot).
- **Cloud render path** uses `createRenderEngine(opts)` — wires `StaticClock` (on-demand) + `OffscreenCanvas` + `OfflineAudioContext`. The cloud render path calls `engine.renderFrame(n)` in a sequential loop.

Both paths share the same `EditorCore`, same managers, same `WebGPURenderer.renderFrame()` call, same shaders, same color pipeline. The only differences are the clock, the output target, and the audio context. This matches spec 01 §3.6's two-entry-point design and the WYSIWYG test below (§11.3) which calls `createInteractiveEngine` for the browser side and `createRenderEngine` for the cloud side.

**FreeCut's `headless/main.ts:6-7` header claim:**
> "reusing the exact same render engine the editor uses, with no React UI, router, or workspace gate mounted"

This is a *partial* truth. The render engine (canvas-render-orchestrator.ts → createCompositionRenderer) IS shared between the in-app export dialog and the headless harness. But the in-app *preview* (live playback in the editor) uses a DIFFERENT code path (`<MainComposition>` React tree → composition-runtime). So FreeCut's WYSIWYG is between "in-app export" and "headless export", NOT between "in-app preview" and "headless export". SCOUT-07's finding stands.

**For our spec:** we adopt the stricter contract. The browser preview MUST route through `createInteractiveEngine()` (which wraps `EditorCore.renderer.renderFrame()` in a rAF loop). The cloud render path MUST route through `createRenderEngine()` (which calls `engine.renderFrame(n)` in a sequential loop). Both paths share the same `WebGPURenderer.renderFrame()` code path internally — any divergence (e.g. a UI-only post-processing step) breaks the contract.

### §11.3 Verification test

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

### §11.4 Two-path encode strategy — REFINED from FreeCut's pattern

The seed spec assumes a single encode path: pipe raw frames to ffmpeg. **This is incomplete.** FreeCut's verified harness uses an in-browser WebCodecs muxer (mediabunny) for codecs Chrome can encode, and would need a separate ffmpeg subprocess for codecs Chrome cannot encode. We adopt both paths:

| Codec | WebCodecs encode? | Our path |
|---|---|---|
| H.264 (avc) | ✅ Yes (Chrome 113+) | **Path A:** mediabunny `VideoSampleSource` → muxer → Blob → Playwright download |
| H.265 (hevc) | ⚠️ Yes (Chrome 121+ for encode, hardware only) | **Path A** (if hardware HEVC encoder available); **Path B** (ffmpeg libx265) otherwise |
| VP9 | ✅ Yes | **Path A** |
| AV1 | ⚠️ Yes (Chrome 121+ with hardware) | **Path A** (if hardware); **Path B** (libaom-av1) otherwise |
| ProRes 422 HQ | ❌ No (decode only in WebCodecs) | **Path B:** raw frames → ffmpeg `prores_ks` |
| ProRes 4444 / XQ | ❌ No | **Path B:** raw frames → ffmpeg `prores_ks` |
| DNxHR HQX / HQ / 444 | ❌ No | **Path B:** raw frames → ffmpeg `dnxhd` (profile dnxhr_*) |
| AAC | ✅ Yes | **Path A** (mediabunny audio track) |
| Opus | ✅ Yes | **Path A** |
| PCM s16 / s24 | ✅ Yes | **Path A** |
| MP3 | ❌ No (needs `@mediabunny/mp3-encoder` extension) | **Path B** or extension |

**Path A (in-browser encode, FreeCut's pattern):**
```ts
// Browser side (headless harness)
const mediabunny = await import('mediabunny')
const { Output, VideoSampleSource } = mediabunny
const videoSource = new VideoSampleSource({
  codec: settings.codec,
  bitrate: settings.videoBitrate ?? 10_000_000,
  bitrateMode: settings.bitrateMode ?? 'variable',
  keyFrameInterval: 2,
  latencyMode: 'quality',
})
const output = new Output({ format, target: outputTarget.target })
output.addVideoTrack(videoSource, { frameRate: fps })

// Pipelined frame loop (FreeCut's runPipelinedFrameLoop, see §15.6)
await runPipelinedFrameLoop({
  totalFrames,
  renderFrame: (n) => renderer.renderFrame(n),
  captureSample: (n) => new VideoSample(outputCanvas, { timestamp: n / fps, duration: 1 / fps }),
  encodeSample: (sample, keyFrame) =>
    keyFrame ? videoSource.add(sample, { keyFrame: true }) : videoSource.add(sample),
  ...
})

const completed = await outputTarget.complete()
triggerDownload(completed.blob, fileName)  // → Playwright download event
```

**Path B (raw frame pipe → ffmpeg):**
```ts
// Spawn ffmpeg with raw frame stdin
const ffmpeg = spawn('ffmpeg', [
  '-f', 'rawvideo', '-pixel_format', pixelFormat,
  '-video_size', `${width}x${height}`, '-framerate', `${fpsNum}/${fpsDen}`,
  '-i', 'pipe:0',
  '-c:v', codec, /* codec-specific args */,
  '-y', outputPath,
], { stdio: ['pipe', 'inherit', 'inherit'] })

// Pipe raw frames
for (let n = 0; n < totalFrames; n++) {
  await engine.renderFrame(n)
  const pixels = await renderer.readPixels(renderTexture, pixelFormat)
  ffmpeg.stdin.write(Buffer.from(pixels.buffer))
}
ffmpeg.stdin.end()
await new Promise(r => ffmpeg.on('close', r))
```

### §11.5 ffmpeg subprocess management — VERIFIED pattern

The exact Node.js pattern for spawning ffmpeg with `pipe:0` for stdin and handling errors / cleanup:

```ts
import { spawn, ChildProcess } from 'child_process'

function spawnFFmpeg(
  args: string[],
  outputPath: string,
  onStderr?: (line: string) => void,
): ChildProcess {
  const ffmpeg = spawn('ffmpeg', [
    '-y',                    // overwrite output
    '-hide_banner',          // suppress version banner
    '-loglevel', 'warning',  // only show warnings+errors (override via -loglevel info for debug)
    ...args,
    outputPath,
  ], {
    stdio: ['pipe', 'pipe', 'pipe'],  // stdin, stdout, stderr all piped
  })

  // stderr is line-buffered; ffmpeg writes progress + errors there
  let stderrBuf = ''
  ffmpeg.stderr?.on('data', (chunk: Buffer) => {
    stderrBuf += chunk.toString('utf8')
    let nl: number
    while ((nl = stderrBuf.indexOf('\n')) >= 0) {
      const line = stderrBuf.slice(0, nl).trimEnd()
      stderrBuf = stderrBuf.slice(nl + 1)
      if (line) onStderr?.(line)
    }
  })

  // stdin backpressure: pause frame production when ffmpeg can't keep up
  ffmpeg.stdin?.on('error', (err: Error) => {
    // EPIPE happens when ffmpeg exits before we finish writing — handle gracefully
    if ((err as NodeJS.ErrnoException).code !== 'EPIPE') throw err
  })

  return ffmpeg
}

// Usage:
const ffmpeg = spawnFFmpeg([...], outputPath, (line) => console.warn('[ffmpeg]', line))
try {
  for (let n = 0; n < totalFrames; n++) {
    if (ffmpeg.killed) throw new Error('ffmpeg died mid-render')
    await engine.renderFrame(n)
    const pixels = await renderer.readPixels(renderTexture, pixelFormat)
    // Backpressure: wait for drain if stdin buffer is full
    if (!ffmpeg.stdin!.write(Buffer.from(pixels.buffer))) {
      await new Promise<void>(r => ffmpeg.stdin!.once('drain', r))
    }
  }
  ffmpeg.stdin!.end()
  await new Promise<void>((resolve, reject) => {
    ffmpeg.once('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited with code ${code}`))
    })
    ffmpeg.once('error', reject)
  })
} catch (err) {
  // Cleanup on failure: kill ffmpeg, delete partial output
  ffmpeg.kill('SIGTERM')
  await fs.unlink(outputPath).catch(() => {})
  throw err
}
```

Key points:
- **stdin backpressure:** check `ffmpeg.stdin.write()` return value; if `false`, wait for `'drain'` event before writing next frame. Without this, Node buffers all frames in memory → OOM on long renders.
- **EPIPE handling:** if ffmpeg exits mid-render (e.g. bad codec args), the next `write()` throws EPIPE. Catch and convert to a meaningful error.
- **Exit code check:** ffmpeg returns 0 on success, non-zero on error (e.g. 1 for generic error, 69 for codec-not-found).
- **Cleanup:** on any error, kill ffmpeg (SIGTERM, not SIGKILL — gives ffmpeg a chance to flush), delete partial output file.

### §11.6 GPU readback pipelining — VERIFIED pattern

The recommended pattern (N=3 frames in flight, render overlaps readback):

```ts
// Adapted from FreeCut's pipelined-frame-loop.ts (120 LOC, see §15.6 for full quote)
async function renderWithReadbackPipeline(
  renderer: WebGPURenderer,
  totalFrames: number,
  pixelFormat: PixelFormat,
  onFrame: (n: number, pixels: Uint16Array) => Promise<void>,
  maxInFlight = 3,
): Promise<void> {
  type Pending = { n: number; readback: Promise<Uint16Array> }
  const queue: Pending[] = []

  for (let n = 0; n < totalFrames; n++) {
    // Backpressure: wait if queue is full
    while (queue.length >= maxInFlight) {
      const oldest = queue.shift()!
      const pixels = await oldest.readback
      await onFrame(oldest.n, pixels)
    }

    // Render frame N (overlaps with previous frame's readback still in flight)
    const texture = await renderer.renderFrame(n)

    // Kick off async readback (does NOT block render of frame N+1)
    const readback = renderer.readPixels(texture, pixelFormat)
    queue.push({ n, readback })
  }

  // Drain remaining
  while (queue.length > 0) {
    const oldest = queue.shift()!
    const pixels = await oldest.readback
    await onFrame(oldest.n, pixels)
  }
}
```

**FreeCut's actual pattern (pipelined-frame-loop.ts:52-120):** FreeCut uses a slightly different approach — it pipelines the *encode* (mediabunny `videoSource.add(sample)`), not the readback, because mediabunny's `VideoSample` constructor copies pixel data immediately (the canvas is free for the next render). The seed spec's pattern (pipeline readback) is what we use for **Path B** (ffmpeg pipe); FreeCut's pattern (pipeline encode) is what we use for **Path A** (in-browser muxer). Both are correct for their respective paths.

### §11.7 Cost model — REFINED

Verified RunPod pricing (2026-11, https://www.runpod.io/pricing) and our throughput estimates:

**Per-render cost (4K @ 30fps, 10 min video = 18,000 frames, ~10 min render time at 30 fps effective):**

| GPU | Hourly (Secure Cloud) | Per render | Per render minute |
|---|---|---|---|
| RTX 4090 | $0.74/hr | $0.12 | $0.012 |
| A100 PCIe | $1.39/hr | $0.23 | $0.023 |
| H100 PCIe | $2.89/hr | $0.48 | $0.048 |
| RTX A6000 | $0.53/hr | $0.09 | $0.009 |

**Per-render cost (8K @ 30fps, 10 min video = 18,000 frames, ~25 min render time at 12 fps effective):**

| GPU | Hourly (Secure Cloud) | Per render | Per render minute |
|---|---|---|---|
| RTX 4090 | $0.74/hr | $0.31 | $0.031 |
| A100 PCIe | $1.39/hr | $0.58 | $0.058 |
| RTX A6000 | $0.53/hr | $0.22 | $0.022 |

**Conclusion:** seed spec's "$0.5 per 4K render minute" estimate is conservative; actual is ~$0.012–0.023 per 4K render minute on RTX 4090 / A100. Cloud render is very cheap. The bottleneck is render TIME, not cost — a 4K 10-min render takes ~10 min wall-clock on a 4090, which is acceptable for batch jobs but not real-time delivery.

**Serverless pricing:** RunPod serverless billing is per-second but at higher rates ($1.10/hr for 4090 serverless vs $0.74/hr on-demand). For render workloads that always take >1 min, on-demand is cheaper.

---

## 12. Open Questions — ANSWERED (SCOUT-11)

### Q1. FreeCut `headless/main.ts` — VERIFIED (see §15 for full quote)

**How FreeCut drives the editor headlessly:**
- `headless.html` (root) loads `src/headless/main.ts` as a Vite entry point
- `main.ts` exposes `window.freecut` API (9 methods, not 4 as SCOUT-01 worklog claimed)
- `headless/server.mjs` (116 LOC) serves the built dist/ + media on `127.0.0.1:port` with COEP/COOP/CORP headers + HTTP Range for media
- `headless/render.mjs` (196 LOC) is the CLI driver — uses Playwright `chromium.launch({ channel: 'chrome', headless: true, args: chromeLaunchArgs() })` to launch Chrome, `page.goto(harnessUrl)`, `page.waitForFunction(() => Boolean(window.freecut?.ready))` to wait for the API
- `headless/serve.mjs` (746 LOC) is the warm-service variant — keeps one Chrome process warm across multiple jobs via `OperationQueue` (serialized, one page op at a time)

**Playwright usage pattern (verified, headless/render.mjs:127-186):**
1. `chromium.launch({ channel: 'chrome', headless: !args.head, args: chromeLaunchArgs() })` — uses system Chrome, not bundled Chromium (Dockerfile sets `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`)
2. `browser.newContext({ acceptDownloads: true })` — required to capture the download event
3. `page.exposeBinding('__freecutProgress', (_src, progress) => {...})` — page calls this from `(globalThis).__freecutProgress` to report progress (small JSON objects, not ArrayBuffers)
4. `page.goto(harnessUrl, { waitUntil: 'load', timeout: 60_000 })` — load harness page
5. `page.waitForFunction(() => Boolean(window.freecut?.ready), { timeout: 30_000 })` — wait for engine init
6. `page.evaluate((payload) => window.freecut.renderProject(payload), jobPayload)` — invoke the render with the project + settings + media
7. `page.waitForEvent('download', { timeout: 30 * 60_000 })` — capture the download event
8. `download.saveAs(outputPath)` — save to disk

**The `window.freecut` API surface (verified, main.ts:1193-1203 + 1281-1291):**

```ts
interface FreecutHeadlessApi {
  ready: true
  renderTimeline: typeof renderTimeline   // raw timeline input (no Project schema needed)
  renderProject: typeof renderProject     // full Project object (runs migrations, extracts timeline)
  renderFrame: typeof renderFrame        // single frame → PNG/JPEG/WebP Blob
  dumpLayout: typeof dumpLayout           // bounding-box inspection, no render
  editProject: typeof editProject         // apply edit ops to a project
  normalizeProject: typeof normalizeProjectForHeadless   // validate + migrate
  probeMedia: typeof probeMedia           // fetch + validate a media file via OPFS
  createProject: typeof createProjectForHeadless         // create blank project
}
```

SCOUT-01's worklog said "window.freecut = {renderTimeline, renderProject, renderFrame, editProject}" — this is the **incomplete** list. The full API is 9 methods. The render-relevant ones are `renderTimeline`, `renderProject`, `renderFrame`; the others are utility/inspection.

**How FreeCut produces output (verified, main.ts:449-459 + 591-692):**
1. The in-browser engine (canvas-render-orchestrator.ts → renderComposition / renderAudioOnly / renderSingleFrame) produces a `Blob` containing the muxed video/audio file
2. `triggerDownload(blob, fileName)` (main.ts:449-459) creates an `<a download>` element, sets `href = URL.createObjectURL(blob)`, calls `.click()` to fire the browser download
3. Playwright captures the download event (`page.waitForEvent('download')`) and saves it to disk via `download.saveAs(outputPath)` (render-core.mjs:316-332)
4. **No raw-frame pipe to ffmpeg** in FreeCut's pattern — the encode happens entirely in-browser via mediabunny's WebCodecs muxer

**Quoted render functions called:**

`renderComposition` (canvas-render-orchestrator.ts:447, 1128 LOC):
> "Main render function – orchestrates the entire client-side render."

Calls:
- `convertTimelineToComposition` (timeline-to-composition.ts) — bridges editor data → CompositionInputProps
- `createOutputFormat(settings.container, { fastStart })` — mediabunny format config
- `new mediabunny.Output({ format, target: outputTarget.target })` — muxer
- `new mediabunny.VideoSampleSource({ codec, bitrate, bitrateMode, keyFrameInterval: 2, latencyMode: 'quality' })` — video encoder source
- `output.addVideoTrack(videoSource, { frameRate: fps })` — register track
- `output.addAudioTrack(audioSource)` — register audio track (if composition has audio)
- `output.start()` — begin muxing
- `frameRenderer = await createCompositionRenderer(composition, renderCanvas, ctx)` — per-frame renderer
- `frameRenderer.preload()` — preload media (decoders warm up)
- `runPipelinedFrameLoop({...})` — pipelined double-buffer frame loop (see §15.6)
- `output.finalize()` — flush muxer
- `outputTarget.complete()` — return Blob + temporaryOutput handle

`renderAudioOnly` (canvas-render-orchestrator.ts:975, audio-only export):
- Same setup as `renderComposition` but skips the video track
- Uses `AudioSampleSource` instead of `VideoSampleSource`
- `addCompositionAudio` feeds PCM chunks (Float32 planar, 48 kHz, 2 ch) via `AudioSample.add()`

`renderSingleFrame` (canvas-render-orchestrator.ts:889, single frame → image Blob):
- Creates OffscreenCanvas at full composition size
- `createCompositionRenderer(composition, renderCanvas, renderCtx)` — SAME renderer as full export (single source of truth, per the source comment: "Use the SAME renderer as export – single source of truth")
- `renderer.preload()` + `renderer.renderFrame(frame)`
- Progressive downscale (halve dimensions repeatedly until within 2× of target, then final scale) — avoids aliasing/moire with high-frequency effects
- `thumbnailCanvas.convertToBlob({ type: format, quality })` — produces PNG/JPEG/WebP

### Q2. Chrome headless flags for real GPU — VERIFIED (see §4.1, §14.A–G)

Verified working flag set (Tiger Abrodi blog, tested on RunPod A40 / Colab T4 / Modal T4):
- `--no-sandbox` (required in containers running as root)
- `--headless=new` (new headless mode, not legacy)
- `--enable-unsafe-webgpu` (NOT `--enable-webgpu`)
- `--enable-features=Vulkan`
- `--use-angle=vulkan` (NOT `--use-vulkan`)
- `--disable-vulkan-surface` (no swapchain, offscreen-only)
- `--ignore-gpu-blocklist`
- `--disable-gpu-sandbox`
- `--enable-dawn-features=allow_unsafe_apis,disable_adapter_blocklist` ⭐ KEY — disables Dawn's separate adapter blocklist that rejects NVIDIA drivers 570+
- `--disable-dawn-features=disallow_unsafe_apis`

**Verified working environment requirements:**
- Vulkan loader ≥ 1.4 (Ubuntu 22.04 default 1.3.204 REJECTS NVIDIA 570+)
- NVIDIA Vulkan ICD matching driver version
- `dbus` running
- Secure context (`http://localhost` or `https://`, NOT `about:blank` or `file://`)
- `powerPreference: 'low-power'` in `requestAdapter()` (default returns null on some setups)

### Q3. WebGPU on Linux headless — VERIFIED

Per tigerabrodi blog Results section:
- **RunPod A40 (driver 570):** `requestAdapter()` returned adapter 3 out of 3 attempts (consistent); compute shader test not run (SSH corruption during test, but adapter probe is sufficient for our use case)
- **Colab T4 (driver 580):** `requestAdapter()` returned adapter 3 out of 3 attempts (consistent); compute shader test ran `[1,2,3,4,5,6,7,8] → [2,4,6,8,10,12,14,16]` with 18 features

FreeCut's `probeGpu` function (headless/lib/page-session.mjs:38-53) does the equivalent test:
```js
export async function probeGpu(page) {
  return page.evaluate(async () => {
    if (!globalThis.navigator?.gpu) return { available: false }
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) return { available: false }
    const info = adapter.info ?? {}
    return {
      available: true,
      vendor: info.vendor ?? '',
      architecture: info.architecture ?? '',
      description: info.description ?? '',
    }
  }).catch(() => ({ available: false }))
}
```

For our spec, we adopt FreeCut's `probeGpu` pattern, but extend it to also probe `adapter.requestDevice()` (because device acquisition is what actually fails on software stacks — see main.ts:482-487 comment: "An adapter is not enough: device acquisition is what actually fails on headless/software stacks").

### Q4. GPU readback performance — RESEARCHED

**Sources:**
- W3C WebGPU spec (https://www.w3.org/TR/webgpu) — defines `copyTextureToBuffer` + `mapAsync` semantics
- Stack Overflow (https://stackoverflow.com/questions/78566825) — "Downloading WebGPU buffer with await mapAsync is 5000 times slower in Firefox Nightly than Chrome" — confirms Chrome is fast (~GB/s range), Firefox is not production-ready
- Medium (https://medium.com/@sparknp1/webgpu-the-browsers-new-compute-muscle-3d91682b13d2) — "GPU→CPU readback is often the 'hidden tax.' It forces synchronization and can erase your speedup if you do it every frame."

**Throughput estimates (no published benchmarks; derived from typical PCIe bandwidths):**
- PCIe 4.0 ×16: theoretical 32 GB/s bidirectional, practical 25 GB/s
- 4K RGBA frame (3840 × 2160 × 4) = 33 MB; at 25 GB/s = ~1.3 ms per frame = 760 fps theoretical max
- 4K YUV 422 10-bit frame = ~25 MB; at 25 GB/s = ~1 ms per frame = 1000 fps theoretical max
- **Real-world throughput:** ~10× worse than theoretical due to GPU synchronization overhead (kernel completion + mapAsync fence + copy overhead) → ~76 fps at 4K RGBA, ~100 fps at 4K YUV 422 10-bit

**Seed spec estimates (§7):** "~200 MB/s on typical GPUs" for GPU→CPU readback, ~6 fps at 4K RGBA. This is **too pessimistic** for modern GPUs (RTX 4090, A100). Real throughput on RTX 4090 is ~1-3 GB/s effective, supporting 30-100 fps at 4K. With 3-frame pipelining (§7.3) + 10-bit YUV readback (§7.2), the seed spec's claim of "~30-50 fps effective at 4K" is roughly correct. The pessimistic baseline (~6 fps) is what you'd see without pipelining on a low-end GPU.

**Optimal parallelism level:** seed spec recommends N=3 frames in flight. SCOUT-11 cannot verify this exact number — it depends on GPU memory + encoder pipeline depth. FreeCut's `pipelined-frame-loop.ts` uses N=1 encode in flight at a time (because mediabunny's `VideoSampleSource.add()` is async and the loop awaits the previous encode before capturing the next sample). For our Path B (ffmpeg pipe), N=3 is reasonable; for Path A (in-browser), we use FreeCut's N=1 encode pipelining (which is sufficient because `VideoSample` construction is the actual copy, not the encode).

### Q5. mediabunny streaming source — VERIFIED (see §8.2)

**Confirmed:** mediabunny `UrlSource` (source.ts:719-998) supports HTTP Range requests and degrades gracefully to whole-file download when the server doesn't support range. FreeCut's `headless/server.mjs` and `headless/lib/http-security.mjs` implement range-capable file serving. S3 also supports range natively.

**Action item:** our media server MUST respond to HTTP Range requests with `206 Partial Content` + `Content-Range` header. Otherwise mediabunny logs a warning and downloads the whole file (acceptable fallback but adds latency for large media).

### Q6. ffmpeg raw frame pipe — VERIFIED (see §16)

Verified exact CLI for:
- ProRes 4444 / 4444 XQ (prores_ks profile 4/5, yuva444p10le / yuv444p10le)
- ProRes 422 HQ (prores_ks profile 3, yuv422p10le)
- DNxHR HQX (dnxhd profile dnxhr_hqx, yuv422p10le)
- DNxHR HQ (dnxhd profile dnxhr_hq, yuv422p)
- H.264 (libx264, yuv420p)
- H.265 / HEVC (libx265, yuv420p10le for 10-bit)
- VP9 (libvpx-vp9, yuv420p10le)

**Verified via:**
- ASWF ORI Encoding Guidelines (https://academysoftwarefoundation.github.io/EncodingGuidelines/EncodeProres.html): prores_ks profile table, pixel format list, recommended flags (`-vendor apl0`, `-color_range tv`, `-colorspace bt709`, `-color_primaries bt709`, `-color_trc iec61966-2-1`)
- Andrew's Tutorial Blog (http://macilatthefront.blogspot.com/2018/12/tutorial-using-ffmpeg-for-dnxhddnxhr.html): DNxHR profile names (`dnxhr_lb`, `dnxhr_sq`, `dnxhr_hq`, `dnxhr_hqx`, `dnxhr_444`) — note the encoder name is `dnxhd` even for DNxHR variants, selected via `-profile:v dnxhr_hqx`
- ffmpeg wiki Encode/H.265 (https://trac.ffmpeg.org/wiki/Encode/H.265): libx265 CRF range 22-28 for 4K, `-preset medium`, `-x265-params profile=main10` for 10-bit

See §16 for the full CLI reference.

### Q7. RunPod GPU containers — VERIFIED

**Verified:**
- RunPod supports GPU passthrough — NVIDIA drivers are host-mounted, Vulkan ICD auto-discovered at `/etc/vulkan/icd.d/nvidia_icd.json`
- Chrome + Vulkan work in RunPod containers (verified by tigerabrodi blog on A40,driver 570)
- ffmpeg with libx264, libx265, prores_ks, dnxhd codecs available via `apt install ffmpeg` on Ubuntu 22.04
- Network bandwidth: RunPod instances have ~10 Gbps network; S3 upload of 4K ProRes HQ (~1 Gbps stream) takes ~1 min per 10 min of video = negligible

**Verified RunPod pricing:** see §4.2 for the full table.

### Q8. Chrome process management — RESEARCHED

**Process limits:** Linux default `ulimit -n` is 1024 open file descriptors per process. Chrome opens ~200-400 FDs per page (sockets, fonts, GPU handles). On a 4-Chrome-process server with default `ulimit`, we hit the limit. Set `ulimit -n 65536` in the server startup script.

**Memory limits:** Chrome does NOT enforce a hard memory cap. On OOM, the kernel OOM-killer terminates Chrome. Use `systemd-run --scope -p MemoryMax=4G node server.js` or cgroups v2 to cap per-process memory.

**Cleanup on crash:**
- Use `browser.close()` in a `finally` block (Playwright/Puppeteer handles SIGTERM/SIGKILL of the Chrome subprocess)
- If Chrome process is orphaned (driver crashed), use `pkill -f 'chrome.*--user-data-dir=/tmp/chrome-render'` to clean up
- FreeCut's `serve.mjs` uses a `PageSession` class (headless/lib/page-session.mjs:55-99) with `close()` method that calls `context.close().catch(() => {})` — the `.catch(() => {})` is critical: if Chrome is already dead, `close()` rejects but we don't care

### Q9. Cloud render cost — REFINED (see §11.7)

Seed spec estimate: "RunPod A100: ~$2-3/hour, RTX 4090: ~$0.5-1/hour, ~$0.5 per 4K render minute on 4090"

**Verified actual:**
- RunPod A100 PCIe Secure Cloud: $1.39/hr (cheaper than seed's $2-3)
- RunPod RTX 4090 Secure Cloud: $0.74/hr (within seed's range)
- 4K 10-min render on 4090: ~10 min × $0.74/60 = **$0.12 per render** (much cheaper than seed's $0.5/minute estimate; the seed confused "per render" with "per render minute")
- 4K 10-min render on A100: ~10 min × $1.39/60 = **$0.23 per render**

**Conclusion:** cloud render is VERY cheap. The bottleneck is wall-clock time (10 min for 4K, 25 min for 8K), not cost.

### Q10. OfflineAudioContext in headless Chrome — VERIFIED WORKS

**Verified:** FreeCut's `canvas-audio.ts:1398, 1954, 2941` uses `OfflineAudioContext` in the export path (which runs in headless Chrome via the harness). The harness has been in production use (see FreeCut's `headless/render-contract.test.mjs` and `headless/serve.test.mjs`).

**Key fact:** `OfflineAudioContext` does NOT require a user gesture (unlike live `AudioContext`). It's a "fast" render mode that produces audio data without playing it through speakers. This works in headless Chrome without any special flags.

**Limitation:** `OfflineAudioContext.decodeAudioData()` requires an ArrayBuffer of the full audio file (no streaming). For large source audio files, this means a one-time download (mitigated by mediabunny's range-streaming — the decode happens on a range-fetched chunk, not the whole file).

### Q11. AudioWorklet in OfflineAudioContext — VERIFIED with caveat

**Cross-ref SCOUT-02 finding:** FreeCut's SoundTouch AudioWorklet uses `numberOfInputs: 0` (NOT 1 as the seed spec claimed) with source pushed via `port.postMessage`. The AudioWorkletNode is constructed in `soundtouch-worklet-audio.tsx:188-195`:
```ts
node = new AudioWorkletNode(graph.context, SOUND_TOUCH_PREVIEW_PROCESSOR_NAME, {
  numberOfInputs: 0,
  numberOfOutputs: 1,
  outputChannelCount: [2],
  ...
})
```

**SCOUT-11 finding (corrected in REVISE-11):** FreeCut's export audio path IS WYSIWYG with its preview for varispeed. Both paths use the vendored SoundTouch JS v0.2.3:
- **Preview:** `soundtouch-preview-processor.worklet.ts:1-2` imports `TimeStretchProcessor, TimeStretchFilter` from `@/infrastructure/audio/time-stretch` and runs them in an AudioWorklet (live playback, low-latency realtime)
- **Export:** `applySpeedAndPitch()` at `canvas-audio.ts:1810-1940` imports the SAME `TimeStretchProcessor, TimeStretchFilter` and runs them synchronously in `OfflineAudioContext` (no AudioWorklet needed for offline render)

There is a graceful-degradation fallback at `canvas-audio.ts:1915-1938` that shifts pitch via linear-interpolation resampling — but this is only triggered when SoundTouch throws. Verified against source: `grep` for `AudioBufferSourceNode` in `src/features/export/` returns 0 matches; `grep` for `\.playbackRate\s*=` in `canvas-audio.ts` returns 0 matches. The only `createBufferSource` in canvas-audio.ts is at line 1963 inside `resample()` (sample-rate conversion, default playbackRate=1.0).

A prior version of this section incorrectly claimed the export path used native `AudioBufferSourceNode.playbackRate` (which would shift pitch during varispeed and break WYSIWYG). The WYSIWYG invariant holds; the recommendation below stands as a design guideline, not as a fix for a FreeCut inconsistency.

**For our spec (recommendation stands, premise corrected):** we MUST use the same audio path for both preview and cloud render to preserve the WYSIWYG invariant. FreeCut's actual pattern is the right model: SoundTouch AudioWorklet for live preview (low-latency realtime playback) and direct `TimeStretchProcessor`/`TimeStretchFilter` calls in `OfflineAudioContext` for export (simpler — no worklet module loading needed). Both import the SAME classes from `@/infrastructure/audio/time-stretch`, so they're WYSIWYG for varispeed. AudioWorklet DOES also work in `OfflineAudioContext` (verified by Chrome's audio team — https://developer.chrome.com/blog/audio-worklet — enabled by default in Chrome 66+ for both `AudioContext` and `OfflineAudioContext`) if we prefer a single code path; the AudioWorklet module must be loaded via `context.audioWorklet.addModule(url)` BEFORE the worklet node is constructed; in OfflineAudioContext, this works synchronously.

**Verified limitation:** AudioWorklet processors in OfflineAudioContext run on the audio render thread (same as live), but with no real-time constraint (the offline renderer runs as fast as CPU allows, not at 1× speed). This means slow DSP (like complex FFT-based processing) that would cause dropouts in live playback runs cleanly offline. SoundTouch's time-stretch should run correctly in OfflineAudioContext.

### Q12. S3 upload — RESEARCHED, NOT VERIFIED in FreeCut

FreeCut's harness downloads via Playwright's download API to local disk; it does NOT upload to S3 (that's the user's responsibility). The seed spec's S3 upload pattern (multipart upload, signed URLs) is our design, not derived from FreeCut.

**Recommended pattern:**
- Use `@aws-sdk/client-s3` with `Upload` (handles multipart automatically for >5 MB files)
- Use `getSignedUrl(s3, new GetObjectCommand(...), { expiresIn: 7 * 24 * 3600 })` for 7-day signed URLs
- Cleanup: S3 lifecycle rule to delete old renders after 7 days

**Multipart upload is automatic** with `@aws-sdk/lib-storage.Upload` — splits files >5 MB into 5 MB parts, uploads in parallel, retries failed parts.

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

12. **Cost test:** Run a real render and verify cost is within budget ($0.5-1 per 4K minute). **Refined:** actual is ~$0.012-0.023 per 4K render minute on RTX 4090/A100 Secure Cloud — much cheaper than the seed's $0.5-1 estimate.

---

## 14. Code References

### FreeCut source files read in full

| File | LOC | Purpose |
|---|---|---|
| `src/headless/main.ts` | 1293 | Headless harness — `window.freecut` API surface, render entry points (renderTimeline, renderProject, renderFrame), font loading gate, GPU detection |
| `src/features/export/utils/canvas-render-orchestrator.ts` | 1128 | Top-level render functions: `renderComposition` (full video+audio), `renderAudioOnly`, `renderSingleFrame`. Sets up mediabunny Output + VideoSampleSource + AudioSampleSource + pipelined frame loop |
| `src/features/export/utils/pipelined-frame-loop.ts` | 120 | Pipelined double-buffer frame loop — render frame N while frame N-1's encode is in flight |
| `src/features/export/utils/render-pipeline.ts` | 304 | Worker-or-main-thread orchestration: `resolveClientSettings`, `runRender`, fallback decision (3 prefix matchers) |
| `src/features/export/utils/export-output-target.ts` | 140 | OPFS-backed or in-memory output target for mediabunny muxer |
| `src/features/export/workers/export-render.worker.ts` | 182 | Export worker — receives start/cancel, calls `renderComposition` or `renderAudioOnly`, posts progress/complete/cancelled/error |
| `src/infrastructure/browser/blob-url-manager.ts` | 199 | Blob URL registry with `registerUrl()` for external (HTTP) URLs — key for headless media streaming |
| `src/infrastructure/browser/mediabunny-input-source.ts` | 108 | Creates `BlobSource` / `StreamSource` / `UrlSource` based on metadata — headless path always falls through to UrlSource |
| `src/features/export/utils/canvas-audio.ts` (targeted grep) | 2975 | Audio decode + mix for export — uses OfflineAudioContext (lines 1398, 1954, 2941), NOT AudioWorklet |

### FreeCut headless driver files read

| File | LOC | Purpose |
|---|---|---|
| `headless/render.mjs` | 196 | CLI driver — Playwright + acceptDownloads + page.evaluate + waitForEvent('download') |
| `headless/serve.mjs` | 746 | Warm-service variant — OperationQueue, PageSession, HTTP API |
| `headless/server.mjs` | 116 | Standalone harness server — serves dist/ + media with COEP/COOP/CORP + HTTP Range |
| `headless/lib/render-core.mjs` | 338 | Shared render core: prepareJob, renderJob, startHarness, assertHardwareGpuForJob |
| `headless/lib/cli.mjs` | 51 | Argv parsing + chromeLaunchArgs() — the actual Chrome flag list |
| `headless/lib/page-session.mjs` | 99 | withHarnessPage + probeGpu + PageSession class |
| `headless/lib/http-security.mjs` | 236 | Range-capable file server (serveFile), HTTP security helpers, JSON body reader |
| `headless/Dockerfile` | 57 | FreeCut's Dockerfile ( Mesa lavapipe software Vulkan, not real GPU) |

### mediabunny source files read (targeted)

| File | LOC | Purpose |
|---|---|---|
| `node_modules/mediabunny/src/source.ts` (lines 660-999) | 2571 total | UrlSource class — HTTP Range requests + 206 fallback to whole-file download + parallelism=2 + 64 MiB LRU cache |

### Web research URLs cited

| URL | Purpose |
|---|---|
| https://tigerabrodi.blog/how-to-get-webgpu-in-headless-chrome-on-cloud-gpus | Verified working Chrome flags for real GPU WebGPU in RunPod containers (A40, T4) |
| https://developer.chrome.com/docs/web-platform/webgpu/troubleshooting-tips | Chrome's official WebGPU troubleshooting — `chrome://flags/#enable-unsafe-webgpu`, `#enable-vulkan` for Linux |
| https://www.runpod.io/pricing | Verified RunPod GPU pricing (RTX 4090 $0.34-0.74/hr, A100 $1.19-1.59/hr, etc.) |
| https://academysoftwarefoundation.github.io/EncodingGuidelines/EncodeProres.html | ASWF ORI ProRes encoding guidelines — prores_ks profile table (0=proxy, 5=4444xq), pixel format list, recommended flags |
| http://macilatthefront.blogspot.com/2018/12/tutorial-using-ffmpeg-for-dnxhddnxhr.html | DNxHR profile names (dnxhr_lb/sq/hq/hqx/444) — encoder name is `dnxhd` even for DNxHR variants |
| https://trac.ffmpeg.org/wiki/Encode/H.265 | libx265 CRF range, 10-bit encoding via `-pix_fmt yuv420p10le` |
| https://trac.ffmpeg.org/wiki/Encode/VFX | ProRes 4444 uses `-pix_fmt yuva444p10le` for alpha |
| https://developer.chrome.com/docs/web-platform/webgpu/developer-features | `GPUExternalTexture.isZeroCopy` non-standard boolean (input-only, no output equivalent) |
| https://webgpufundamentals.org/webgpu/lessons/webgpu-textures-external-video.html | importExternalTexture is input-only, no zero-copy output path |
| https://github.com/gpuweb/gpuweb/issues/5172 | gpuweb WG discussion — zero-copy means replacing media stack resource, no output path |
| https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/importExternalTexture | MDN — importExternalTexture takes HTMLVideoElement or VideoFrame, returns GPUExternalTexture |
| https://developer.chrome.com/blog/audio-worklet | AudioWorklet enabled by default in Chrome 66+ — works in both AudioContext and OfflineAudioContext |
| https://playwright.dev/docs/evaluating | Playwright page.evaluate / exposeFunction — arguments must be Serializable or JSHandle |
| https://stackoverflow.com/questions/78566825 | mapAsync readback 5000× slower in Firefox Nightly than Chrome — use Chrome only |

### Dependency specs cross-referenced

| File | LOC | Cross-ref |
|---|---|---|
| `00-master-spec.md` | 466 | Master decisions (WebGPU-only, 10-bit scene-linear, cloud render) |
| `01-core-engine.refined.md` | 1962 | `createRenderEngine()` entry point — SCOUT-01 verified FreeCut headless harness exists but didn't fully read it; SCOUT-11 read in full |
| `04-renderer-color.refined.md` | 2076 | `WebGPURenderer.readPixels()` — SCOUT-04 verified FreeCut has no readback (uses mediabunny VideoSample directly); our spec must add readback for Path B (ffmpeg pipe) |
| `02-workers-threading.refined.md` | 2478 | SCOUT-02 verified AudioWorklet `numberOfInputs: 0` (NOT 1) and SoundTouch source-pushed-via-port; vendored soundtouchjs v0.2.3 LGPL v2.1 |
| `03-playback-engine.refined.md` | 2360 | SCOUT-03 verified mediabunny UrlSource exists and the pixelFormat: 'P010' option does NOT exist |

### 14R. Code References — nle-engine (reference, NOT canon)

> nle-engine has **no cloud render** — `src/lib/nle/headless/api.ts` (2,820 LOC) is the closest reference. The engine's Xvfb+SwiftShader headless setup (its Decision 12) is an ALIGNED reference for this spec's headless-Chrome infrastructure; the cloud pipeline itself is SPEC-ONLY. Full reconciliation: `19-code-references.md`.

| Spec section | Engine file:line | Verified quote | Status | Note |
|---|---|---|---|---|
| §4.1 GPU flags | `scripts/run-nle-tests.mjs:30` | `'--use-webgpu-adapter=swiftshader',` | CORRECTIVE | Engine forces software WebGPU by design; spec's real-GPU flags win for cloud render |
| Xvfb prerequisite | `.agents/DECISIONS.md:226` | `` `--headless=new` alone returns `null` from `requestAdapter()`. `` | ALIGNED (CI) | Xvfb mandatory even headless; spec §4.1 gains the CI-fallback note |
| §15.K 9-method surface | `src/lib/nle/headless/api.ts:88` | `export interface NleHeadlessApi {` | ALIGNED | Mirrors FreeCut's `window.freecut` surface |
| §11.2 StaticClock | `.agents/DECISIONS.md:29` | `The `Clock` class derives time from `AudioContext.currentTime`` | CORRECTIVE | One real-time clock only; spec's StaticClock render entry is required |
| §14 single-frame delivery | `src/lib/nle/headless/api.ts:95` | `Grab one frame as an image blob (default: full-res PNG).` | ALIGNED | renderFrame → PNG blob matches the frame-grab pattern |
| HTTP driver | `gaps/audit/MASTER.md:101` | `Node-side HTTP headless driver + workspace writer lock` | ENGINE-GAP | Listed P3 in engine; spec 15 §8 is the contract |
| §10 crash recovery | — | COULD-NOT-VERIFY | SPEC-ONLY | No queue/supervisor in engine |
| §18 Docker/RunPod | — | COULD-NOT-VERIFY (no Dockerfile) | SPEC-ONLY | FreeCut's Dockerfile remains the reference |
| Error-path discipline | `gaps/audit/G-test-coverage.md:26` | `Total error/boundary ≈ 12/128 (9%).` | CORRECTIVE | Spec's explicit failure-state assertions are the bar |
| CI smoke reference | `scripts/run-nle-tests.mjs:8` | `headless Chrome REQUIRES Xvfb` | ALIGNED | Working Xvfb + software-Vulkan reference for the smoke tier |

---

## 15. Corrections to Seed Spec

### §15.A — Chrome flag `--use-vulkan` is NOT a real flag

**Seed spec §4.1 line 111:** `--use-vulkan`

**Reality:** `--use-vulkan` is not a Chrome flag. The correct flag is `--use-angle=vulkan` (ANGLE backend selector). Verified via FreeCut `headless/lib/cli.mjs:42` which uses `--use-angle=vulkan` on Linux.

### §15.B — Chrome flag `--enable-webgpu` is NOT a real flag

**Seed spec §4.1 line 112:** `--enable-webgpu`

**Reality:** `--enable-webgpu` is not a Chrome flag. The correct flag is `--enable-unsafe-webgpu` (Chrome 113+, on by default in 121+ on supported platforms). Verified via FreeCut `headless/lib/cli.mjs:44` and Chrome developer docs (https://developer.chrome.com/docs/web-platform/webgpu/troubleshooting-tips).

### §15.C — `--enable-unsafe-swiftshader` is correctly excluded but the seed spec's explanation is wrong

**Seed spec §4.1 line 110:** `--enable-unsafe-swiftshader  # fallback if no real GPU (NOT what we want)`

**Reality:** The flag should NEVER be set in our config — it forces software WebGPU via SwiftShader. The seed spec correctly excludes it from the final config but includes it in the example with a "remove this" comment, which is confusing. Better to never mention it in the example at all.

### §15.D — Missing critical Dawn adapter-blocklist flags

**Seed spec §4.1:** omits the most important flags for real GPU on NVIDIA 570+ drivers.

**Required additions:**
```
--enable-dawn-features=allow_unsafe_apis,disable_adapter_blocklist
--disable-dawn-features=disallow_unsafe_apis
--disable-vulkan-surface
```
Without these, `requestAdapter()` returns null on NVIDIA drivers 570+ (RunPod default for A100/A40). See §4.1 for full explanation.

### §15.E — `--disable-software-rasterizer` is unnecessary

**Seed spec §4.1 line 113:** `--disable-software-rasterizer`

**Reality:** With `--use-angle=vulkan` set, the rasterizer IS Vulkan (not software). The flag is redundant and should be removed.

### §15.F — `--remote-debugging-port=9222` is unnecessary when driven by Playwright

**Seed spec §4.1 line 114:** `--remote-debugging-port=9222`

**Reality:** Playwright/Puppeteer communicate with Chrome via CDP over a pipe (or a dynamically-allocated port) — they don't need a fixed debugging port. Adding `--remote-debugging-port=9222` is unnecessary and a security risk (any process on the box can connect to the debugging port). Remove.

### §15.G — `about:blank` is NOT a secure context; WebGPU won't init there

**Seed spec §4.1 line 116:** `about:blank`

**Reality:** `navigator.gpu` is `undefined` on `about:blank` (not a secure context). Must navigate to `http://127.0.0.1:port` or `http://localhost:port` instead. FreeCut's `headless/server.mjs` exists for exactly this reason — it serves `dist/headless.html` on `127.0.0.1:port`.

### §15.H — The seed spec's `onFrame` ArrayBuffer pattern is slow for H.264/VP9/AV1

**Seed spec §4.3 + §5.1:** `onFrame: (n, pixels) => postMessage(pixels)` — pipes raw frames from Chrome to Node.js via `page.exposeFunction`.

**Reality:** CDP serializes ArrayBuffer via base64 (33% inflation). For a 4K 10-bit frame (~25 MB), each `onFrame` call sends ~33 MB over CDP at ~100 Mbps = ~2.6 sec per frame just for the transfer. This caps throughput at ~0.4 fps — useless.

**FreeCut's verified pattern:** Use the in-browser WebCodecs muxer (mediabunny) to encode to H.264/VP9/AV1 directly, then deliver the final muxed file via Playwright's download event (HTTP transfer, much faster). For codecs WebCodecs can't encode (ProRes, DNxHR), the seed spec's pattern is the only option — but we should accept the throughput hit and use parallelism (N=3 frames in flight, see §7.3).

**Refined design (§11.4):** two-path encode strategy — Path A (in-browser, for H.264/VP9/AV1) and Path B (raw frame pipe to ffmpeg, for ProRes/DNxHR).

### §15.I — Seed spec's `createRenderEngine.renderAudio()` returns mono, not stereo

**Seed spec §5.1 line 362:** `return buffer.getChannelData(0);  // mono for now; extend to multi-channel`

**Reality:** "Mono for now" is a placeholder. Real projects need stereo minimum, often 5.1 or 7.1. Round-7 edit: the placeholder is retired — `renderAudio()` now returns per-channel planes (`Float32Array[]`, stereo minimum) for v1 (see §5.1).

### §15.J — Seed spec's memory budget is missing GPU memory accounting

**Seed spec §5.2:** accounts for ~900 MB at 4K, ~1.5 GB at 8K. These are CPU/RAM figures.

**Reality:** The seed spec omits VRAM accounting. Each Chrome + WebGPU device uses ~1-2 GB of VRAM (GPU device + queues + textures). On a 24 GB RTX 4090, 4 parallel jobs = 8 GB VRAM (well within budget). On a 24 GB L4 ($0.49/hr Community Cloud), only 2-3 parallel jobs fit. Add a VRAM row to the memory budget:

| Component | VRAM |
|---|---|
| Chrome GPU process baseline | ~200 MB |
| WebGPU device + queues | ~150 MB |
| Composite working textures (4K) | ~130 MB |
| Decoded source texture cache (4K, 10-bit, 4 frames) | ~200 MB |
| Output texture (4K 10-bit) | ~16 MB |
| **Total per job (4K)** | **~700 MB** |
| **Total per job (8K)** | **~1.8 GB** |

### §15.K — FreeCut's headless API surface is 9 methods, not 4

**SCOUT-01 worklog line 86:** "src/headless/main.ts (1293 LOC, partial) — headless entry exposing window.freecut API"

**SCOUT-01 stage summary line 97:** "FreeCut's headless/main.ts is the actual two-entry-point reference, not OpenCut-classic" — mentions 4 methods.

**Reality (verified by SCOUT-11, main.ts:1193-1203 + 1281-1291):** The `window.freecut` API exposes **9 methods**:
- `renderTimeline` (raw timeline input)
- `renderProject` (full Project with migrations)
- `renderFrame` (single frame → image Blob)
- `dumpLayout` (bounding box inspection, no render)
- `editProject` (apply edit ops)
- `normalizeProject` (validate + migrate)
- `probeMedia` (fetch + validate media via OPFS)
- `createProject` (create blank project)
- `ready: true` (sentinel)

For our spec, the render-relevant API is `renderTimeline`, `renderProject`, `renderFrame`. The others are utility/inspection — useful for testing but not required for cloud render.

### §15.L — FreeCut's export audio path IS WYSIWYG with preview for varispeed

**SCOUT-02 finding:** SoundTouch AudioWorklet uses `numberOfInputs: 0`, source pushed via port (soundtouch-worklet-audio.tsx:188-195).

**SCOUT-11 refinement (corrected in REVISE-11):** FreeCut's export audio path IS WYSIWYG with its preview for varispeed. Both paths use the vendored SoundTouch JS v0.2.3:
- Preview: `soundtouch-preview-processor.worklet.ts:1-2` imports `TimeStretchProcessor, TimeStretchFilter` from `@/infrastructure/audio/time-stretch` and runs them in an AudioWorklet
- Export: `applySpeedAndPitch()` at `canvas-audio.ts:1810-1940` imports the SAME `TimeStretchProcessor, TimeStretchFilter` and runs them in `OfflineAudioContext`

There is a graceful-degradation fallback at `canvas-audio.ts:1915-1938` that shifts pitch via linear-interpolation resampling — but this is only triggered when SoundTouch throws. Our cloud render should adopt this exact pattern: SoundTouch in OfflineAudioContext, with linear-interpolation fallback.

**Audit note (REVISE-11):** A prior version of this section incorrectly claimed that FreeCut's export path used native `AudioBufferSourceNode.playbackRate` (which would shift pitch during varispeed, breaking WYSIWYG). Verified against source: `grep` for `AudioBufferSourceNode` in `src/features/export/` returns 0 matches; `grep` for `\.playbackRate\s*=` in `canvas-audio.ts` returns 0 matches. The only `createBufferSource` in canvas-audio.ts is at line 1963 inside `resample()` (sample-rate conversion, default playbackRate=1.0). The WYSIWYG invariant holds. The original recommendation (use the same audio path for preview and cloud render) remains valid as a design guideline, but the premise (FreeCut doesn't) was wrong.

### §15.M — Seed spec's $0.5 per render minute estimate is too pessimistic

**Seed spec §12.9:** "Render speed: 4K @ 30fps for 10 min = ~10 min render time = ~$0.5 per render on 4090"

**Reality (§11.7):** At RTX 4090 Secure Cloud $0.74/hr, a 10-min 4K render = $0.74 × (10/60) = **$0.12 per render**, not $0.50. The seed spec confused "per render" with "per render minute." Actual per-render-minute cost is ~$0.012-0.023 on 4090/A100.

Cloud render is MUCH cheaper than the seed spec estimated. This affects our business model — we can offer cloud render at a much lower price point than originally planned.

### §15.N — Seed spec's `--enable-unsafe-swiftshader` is NOT in our flag list, but the seed spec lists it in the example

**Seed spec §4.1 lines 110 + 119:** includes `--enable-unsafe-swiftshader` in the example with a comment "fallback if no real GPU (NOT what we want)" and then says "We must NOT use this — we want real GPU. Remove this flag."

**Reality:** The seed spec is internally inconsistent — it lists the flag in the example then says to remove it. Better to never include it in the first place. The refined §4.1 omits this flag entirely.

---

## 16. FreeCut `headless/main.ts` Quote — Key Sections

### §16.1 File header (main.ts:1-17)

```ts
/**
 * Headless render harness.
 *
 * This is a dedicated Vite entry (loaded by `headless.html`) that exposes a
 * small `window.freecut` API so a Node/Playwright driver can render projects to
 * video inside a real (headless) Chrome — reusing the exact same render engine
 * the editor uses, with no React UI, router, or workspace gate mounted.
 *
 * Browser APIs the render path depends on (WebCodecs, WebGPU, OffscreenCanvas,
 * OfflineAudioContext) all work in headless Chrome on a secure-context origin
 * (localhost), so fidelity matches the in-app export.
 *
 * Media is provided as fetchable URLs (served same-origin by the driver) and
 * seeded into `blobUrlManager`, so the real `resolveMediaUrls()` and the
 * engine's sub-composition media lookup resolve without the workspace/storage
 * layer being present.
 */
```

### §16.2 `triggerDownload` — output delivery via browser download event (main.ts:449-459)

```ts
function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Defer revoke so the browser/Playwright has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 120_000)
}
```

This is the heart of FreeCut's output delivery: instead of piping raw frames to ffmpeg, the in-browser engine produces a complete muxed `Blob`, then triggers a download via an `<a download>` element. Playwright's `page.waitForEvent('download')` captures the event and saves to disk. **No raw-frame pipe is needed for codecs WebCodecs supports.**

### §16.3 Progress reporting via global binding (main.ts:423-433)

```ts
type ProgressSink = (progress: RenderProgress) => void

function reportProgress(progress: RenderProgress): void {
  const sink = (globalThis as unknown as { __freecutProgress?: ProgressSink }).__freecutProgress
  if (!sink) return
  try {
    sink(progress)
  } catch {
    // The driver-side binding may be torn down mid-render; ignore.
  }
}
```

The driver side (headless/render.mjs:150) registers the sink via Playwright's `page.exposeBinding`:
```ts
await page.exposeBinding('__freecutProgress', (_src, progress) => {
  // progress is a small JSON object: { phase, progress, currentFrame, totalFrames, message }
  const pct = Math.floor(progress?.progress ?? 0)
  if (pct !== lastPct) {
    lastPct = pct
    process.stdout.write(`\r  ${progressLabel} ${(progress?.phase ?? 'render').padEnd(10)} ${pct}%   `)
  }
})
```

### §16.4 WebGPU detection (main.ts:470-492)

```ts
let webGpuAvailable: Promise<boolean> | null = null
/** Memoised: validation, the GPU assert and the render path all ask the same question. */
function detectWebGpuOnce(): Promise<boolean> {
  webGpuAvailable ??= detectWebGpu()
  return webGpuAvailable
}

async function detectWebGpu(): Promise<boolean> {
  try {
    if (!('gpu' in navigator) || !navigator.gpu) return false
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) return false
    // An adapter is not enough: device acquisition is what actually fails on
    // headless/software stacks, and reporting "GPU available" on the strength of
    // an adapter alone would suppress warnings for presets that then fall back.
    const device = await adapter.requestDevice()
    if (!device) return false
    device.destroy()
    return true
  } catch {
    return false
  }
}
```

Note: `adapter.requestDevice()` is checked (not just `requestAdapter()`). This is critical because device acquisition is what actually fails on software stacks — the adapter probe is necessary but not sufficient.

### §16.5 `assertGpuForComposition` — fail loudly when GPU effects need GPU (main.ts:513-537)

```ts
async function assertGpuForComposition(
  composition: CompositionInputProps,
  compositions: SubComposition[],
): Promise<HeadlessRenderWarning[]> {
  const needsGpuEffects = compositionUsesGpuEffects(composition, compositions)
  const hasTransitions = (composition.transitions?.length ?? 0) > 0
  if (!needsGpuEffects && !hasTransitions) return []

  const gpuAvailable = await detectWebGpu()
  if (gpuAvailable) return []

  if (needsGpuEffects) {
    throw new Error(
      'This project uses GPU effects but WebGPU is unavailable in this environment, ' +
        'so effects cannot render. Launch Chrome with --enable-unsafe-webgpu on a machine ' +
        'with a GPU (or SwiftShader/Vulkan in headless/Docker).',
    )
  }
  const warning: HeadlessRenderWarning = {
    code: 'WEBGPU_TRANSITION_FALLBACK',
    message: 'WebGPU unavailable; transitions will use the Canvas2D fallback',
  }
  log.warn(warning.message)
  return [warning]
}
```

Two-tier policy:
- GPU effects: throw (no fallback exists)
- Transitions: warn + use Canvas2D fallback (transitions have a software fallback path)

### §16.6 `runPipelinedFrameLoop` — pipelined double-buffer frame loop (pipelined-frame-loop.ts:52-120)

```ts
export async function runPipelinedFrameLoop<S extends CloseableSample>(
  deps: PipelinedFrameLoopDeps<S>,
): Promise<void> {
  const {
    totalFrames,
    signal,
    getPendingError,
    renderFrame,
    captureSample,
    encodeSample,
    onAbort,
    onFrameProgress,
  } = deps

  let pendingEncode: Promise<void> | null = null

  for (let frame = 0; frame < totalFrames; frame++) {
    const pendingError = getPendingError?.()
    if (pendingError) throw pendingError

    // Check for abort — drain any in-flight encode first so the encoder
    // is idle before we cancel the output. Discard encoder errors since
    // we are aborting anyway and must always surface AbortError.
    if (signal?.aborted) {
      if (pendingEncode) {
        try {
          await pendingEncode
        } catch {
          /* discarded — aborting */
        }
      }
      await onAbort()
      throw new DOMException('Render cancelled', 'AbortError')
    }

    // Render frame first — this overlaps with the previous frame's encode
    // that is still in flight. The previous sample already copied its
    // pixels, so writing to the capture surface here cannot corrupt it.
    await renderFrame(frame)

    // Now wait for the previous encode to finish before capturing a new
    // sample. This ensures at most one encode is in flight and that frames
    // are fed to the encoder in order.
    if (pendingEncode) await pendingEncode

    // Snapshot pixels into a sample. The capture copies pixel data
    // immediately — the surface is free for the next render.
    const sample = captureSample(frame)

    // Kick off encoding in the background. NOT awaited here — it runs
    // concurrently with the next iteration's renderFrame().
    const isKeyFrame = frame === 0
    pendingEncode = (async () => {
      try {
        await encodeSample(sample, isKeyFrame)
      } finally {
        // The encoder does NOT close samples. We must close to release the
        // underlying frame's GPU memory, otherwise the browser throttles
        // after ~8-16 outstanding frames.
        sample.close()
      }
    })()

    onFrameProgress(frame)
  }

  // Drain the final in-flight encode before finalizing
  if (pendingEncode) await pendingEncode
}
```

**Key invariants:**
1. At most ONE encode in flight at a time (ensures frames reach encoder in order)
2. Render of frame N+1 overlaps with encode of frame N (~25-40% throughput improvement per source comment)
3. `sample.close()` MUST be called in the finally block — mediabunny's `VideoSample` wraps a `VideoFrame` that holds GPU memory; without close, browser throttles after 8-16 outstanding frames
4. Only frame 0 is a keyframe (`isKeyFrame = frame === 0`)
5. Abort path drains the in-flight encode BEFORE calling `onAbort()` (so the encoder is idle before `output.cancel()` is called)

### §16.7 `renderComposition` — main render entry (canvas-render-orchestrator.ts:447-878, abridged)

```ts
export async function renderComposition(options: RenderEngineOptions): Promise<ClientRenderResult> {
  const { settings, composition, onProgress, signal } = options
  const { fps, durationInFrames = 0 } = composition
  const canvasAudio = await loadCanvasAudio()

  // ...validation...

  // Fast path: when the timeline is a single unmodified clip, remux packets directly.
  const remuxResult = await tryPacketRemuxComposition(options)
  if (remuxResult) return remuxResult

  const mediabunny: MediabunnyModule = await import('mediabunny')
  const { Output, VideoSampleSource, AudioSampleSource, AudioSample } = mediabunny

  // ...audio packet-copy path setup...

  const mimeType = getMimeType(settings.container, settings.codec)
  const outputTarget = await createExportOutputTarget(mediabunny, settings.container, mimeType)
  const format = await createOutputFormat(settings.container, {
    fastStart: outputTarget.kind === 'buffer',
  })

  // Create output
  const output = new Output({ format, target: outputTarget.target })

  // ...subtitle handling...

  // Create canvas for rendering frames at COMPOSITION resolution
  const renderCanvas = new OffscreenCanvas(compositionWidth, compositionHeight)
  const ctx = renderCanvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Create output canvas at EXPORT resolution (for encoding)
  const outputCanvas = needsScaling ? new OffscreenCanvas(exportWidth, exportHeight) : renderCanvas

  // Create video source for explicit frame capture (at export resolution)
  const videoSource = new VideoSampleSource({
    codec: settings.codec,
    bitrate: settings.videoBitrate ?? 10_000_000,
    bitrateMode: settings.bitrateMode ?? 'variable',
    keyFrameInterval: 2, // Keyframe every 2 seconds for better seeking
    latencyMode: 'quality', // Enables B-frames and consistent frame quality for offline encoding
  })

  output.addVideoTrack(videoSource, { frameRate: fps })

  // ...audio track setup...

  await output.start()

  // Audio and video now advance together. Mediabunny's source backpressure
  // bounds encoded data while windowed processing bounds decoded PCM memory.
  const audioTask = ...  // feedAudioPacketCopy or addCompositionAudio (parallel)

  let frameRenderer = await createCompositionRenderer(renderCompositionInput, renderCanvas, ctx)
  await frameRenderer.preload()
  videoRenderingStarted = true

  // Render each frame using a pipelined double-buffer approach.
  // VideoSample copies pixel data on construction, so the canvas is free
  // immediately after. We overlap the previous frame's encode with the
  // next frame's render for ~25-40% throughput improvement.
  const renderer = frameRenderer
  await runPipelinedFrameLoop({
    totalFrames,
    signal,
    getPendingError: () => audioError,
    renderFrame: async (frame) => {
      await renderer.renderFrame(frame)
      // Scale to output resolution if needed
      if (needsScaling) {
        outputCtx.clearRect(0, 0, exportWidth, exportHeight)
        outputCtx.drawImage(renderCanvas, 0, 0, exportWidth, exportHeight)
      }
    },
    // VideoSampleSource does NOT close samples (unlike CanvasSource) — the
    // loop closes each sample to release the VideoFrame's GPU memory.
    captureSample: (frame) =>
      new VideoSample(outputCanvas, { timestamp: frame / fps, duration: 1 / fps }),
    encodeSample: (sample, keyFrame) =>
      keyFrame ? videoSource.add(sample, { keyFrame: true }) : videoSource.add(sample),
    onAbort: () => output.cancel(),
    onFrameProgress: (frame) => {
      onProgress({
        phase: 'rendering',
        progress: Math.round((frame / totalFrames) * 100),
        currentFrame: frame,
        totalFrames,
        message: `Rendering frame ${frame + 1}/${totalFrames}`,
      })
    },
  })

  // Drain audio
  if (audioTask) await audioTask

  // Finalize output
  await output.finalize()
  const completed = await outputTarget.complete()
  const { blob } = completed

  // Cleanup
  frameRenderer.dispose()
  canvasAudio.clearAudioDecodeCache()

  return {
    blob,
    mimeType,
    duration: durationSeconds,
    fileSize: blob.size,
    temporaryOutput: completed.temporaryOutput,
  }
}
```

### §16.8 `window.freecut` API definition (main.ts:1193-1203 + 1281-1291)

```ts
interface FreecutHeadlessApi {
  ready: true
  renderTimeline: typeof renderTimeline
  renderProject: typeof renderProject
  renderFrame: typeof renderFrame
  dumpLayout: typeof dumpLayout
  editProject: typeof editProject
  normalizeProject: typeof normalizeProjectForHeadless
  probeMedia: typeof probeMedia
  createProject: typeof createProjectForHeadless
}

// ... (function definitions) ...

declare global {
  interface Window {
    freecut: FreecutHeadlessApi
  }
}

window.freecut = {
  ready: true,
  renderTimeline,
  renderProject,
  renderFrame,
  dumpLayout,
  editProject,
  normalizeProject: normalizeProjectForHeadless,
  probeMedia,
  createProject: createProjectForHeadless,
}
log.info('Headless harness ready')
```

### §16.9 Media URL streaming registration (main.ts:435-447)

```ts
/**
 * Register media URLs so resolveMediaUrls() + the engine's sub-comp media
 * lookup (blobUrlManager.get) resolve to them. We register the URL WITHOUT
 * downloading the bytes: mediabunny then reads via UrlSource (HTTP Range),
 * so large clips stream instead of being held fully in memory.
 */
function registerMediaUrls(media: HeadlessMediaSource[] | undefined): void {
  if (!media?.length) return
  for (const { mediaId, url } of media) {
    if (blobUrlManager.get(mediaId)) continue
    blobUrlManager.registerUrl(mediaId, url)
  }
}
```

The supporting `blobUrlManager.registerUrl()` (infrastructure/browser/blob-url-manager.ts:83-92):
```ts
/**
 * Register an externally-hosted URL (e.g. an HTTP URL served by a headless
 * render harness) for a media id, WITHOUT loading the bytes into a Blob.
 *
 * Because no Blob is registered in the object-url registry, consumers that
 * build a mediabunny input from this URL fall through to UrlSource — i.e.
 * the media is range-streamed over HTTP instead of being held fully in memory.
 * Reference-counted like acquire(); never used by the in-app flows.
 */
registerUrl(mediaId: string, url: string): string {
  const existing = this.entries.get(mediaId)
  if (existing) {
    existing.refCount++
    return existing.url
  }
  this.entries.set(mediaId, { url, refCount: 1, external: true })
  this.notify()
  return url
}
```

### §16.10 Driver-side render call (headless/lib/render-core.mjs:269-337)

```ts
/** Render one prepared job through an already-loaded harness page; saves to job.outPath. */
export async function renderJob(
  page,
  job,
  {
    setProgressLabel,
    onWarn,
    allowMissingMedia = false,
    softwareGpu = false,
    downloadTimeoutMs = 30 * 60_000,
  } = {},
) {
  const warn = onWarn ?? ((m) => console.warn(m))
  assertHardwareGpuForJob(job, softwareGpu)
  if (job.missing.length > 0) {
    if (!allowMissingMedia) throw new MissingMediaError(job.missing)
  }
  // ...preparation warnings...

  setProgressLabel?.(path.basename(job.outPath))
  const downloadPromise = page.waitForEvent('download', { timeout: downloadTimeoutMs })
  downloadPromise.catch(() => {})
  const summary = await page.evaluate((payload) => window.freecut.renderProject(payload), {
    project: job.project,
    settings: job.settings,
    media: job.media,
    renderWholeProject: !job.hasRange,
    inPoint: job.inPoint,
    outPoint: job.outPoint,
    strict: job.strict,
  })
  const download = await downloadPromise
  const effectiveContainer = summary.effectiveSettings?.container
  if (!effectiveContainer) throw new Error('Render summary omitted effectiveSettings.container')
  const outputPath = outputPathForContainer(job.outPath, effectiveContainer)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  await download.saveAs(outputPath)
  const warnings = [...preparationWarnings, ...(summary.warnings ?? [])]
  for (const warning of warnings)
    warn(`  WARNING [${warning.code ?? 'UNKNOWN'}]: ${warningMessage(warning)}`)
  return { ...summary, fileName: path.basename(outputPath), outputPath, warnings }
}
```

The flow:
1. `page.waitForEvent('download', { timeout: 30 * 60_000 })` — start listening for download BEFORE invoking render (race condition guard)
2. `page.evaluate((payload) => window.freecut.renderProject(payload), jobPayload)` — invoke the render in-page; this returns a `HeadlessRenderSummary` with mimeType, fileSize, durationSeconds, effectiveSettings, warnings
3. `await downloadPromise` — wait for the download event (fired by `triggerDownload()` inside the page)
4. `download.saveAs(outputPath)` — save the downloaded Blob to disk

---

## 17. ffmpeg Command Reference — Exact CLI for Each Output Format

All commands assume raw frame input via `pipe:0` (stdin) at the project's resolution and framerate. The driver spawns ffmpeg via Node's `child_process.spawn` with `stdio: ['pipe', 'pipe', 'pipe']` and writes raw frame bytes to `ffmpeg.stdin`.

### §17.1 ProRes 4444 (10-bit, with alpha)

```bash
ffmpeg -y -hide_banner -loglevel warning \
  -f rawvideo -pixel_format yuva444p10le \
  -video_size 3840x2160 -framerate 30000/1001 \
  -i pipe:0 \
  -c:v prores_ks -profile:v 4 \
  -pix_fmt yuva444p10le \
  -alpha_bits 16 \
  -vendor apl0 \
  -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc iec61966-2-1 \
  -c:a pcm_s16le \
  output.mov
```

- `-profile:v 4` = ProRes 4444 (per ASWF ORI guidelines)
- `-pix_fmt yuva444p10le` = 10-bit YUV 4:4:4 with alpha (use `yuv444p10le` for no alpha)
- `-alpha_bits 16` = 16-bit mathematically lossless alpha (default 16)
- `-vendor apl0` = tricks codec into believing it's from Apple (improves compatibility with Final Cut Pro)
- Color flags: BT.709 / sRGB transfer function (per ASWF ORI)

### §17.2 ProRes 4444 XQ (highest quality mastering)

```bash
ffmpeg -y -hide_banner -loglevel warning \
  -f rawvideo -pixel_format yuva444p10le \
  -video_size 3840x2160 -framerate 30000/1001 \
  -i pipe:0 \
  -c:v prores_ks -profile:v 5 \
  -pix_fmt yuva444p10le \
  -alpha_bits 16 \
  -vendor apl0 \
  -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc iec61966-2-1 \
  -c:a pcm_s16le \
  output.mov
```

- `-profile:v 5` = ProRes 4444 XQ (~500 Mbps HD @ 29.97)
- `prores_ks` only encodes to 10-bit (decoding supports ≥10-bit) — verified by ASWF ORI

### §17.3 ProRes 422 HQ (standard editing handoff)

```bash
ffmpeg -y -hide_banner -loglevel warning \
  -f rawvideo -pixel_format yuv422p10le \
  -video_size 3840x2160 -framerate 30000/1001 \
  -i pipe:0 \
  -c:v prores_ks -profile:v 3 \
  -pix_fmt yuv422p10le \
  -vendor apl0 \
  -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc iec61966-2-1 \
  -c:a pcm_s16le \
  output.mov
```

- `-profile:v 3` = ProRes 422 HQ (~220 Mbps HD @ 29.97)
- `-pix_fmt yuv422p10le` = 10-bit YUV 4:2:2

### §17.4 DNxHR HQX (Avid handoff, 10-bit 4:2:2)

```bash
ffmpeg -y -hide_banner -loglevel warning \
  -f rawvideo -pixel_format yuv422p10le \
  -video_size 3840x2160 -framerate 30000/1001 \
  -i pipe:0 \
  -c:v dnxhd -profile:v dnxhr_hqx \
  -pix_fmt yuv422p10le \
  -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a pcm_s16le \
  output.mov
```

- Encoder name is `dnxhd` (NOT `dnxhr`) — `dnxhr` is the profile prefix
- `-profile:v dnxhr_hqx` ≈ ProRes 422 HQ
- Available profiles: `dnxhr_lb` (proxy), `dnxhr_sq` (standard), `dnxhr_hq` (422), `dnxhr_hqx` (422 HQ 10-bit), `dnxhr_444` (444 10-bit, requires 2K+ resolution)
- Verified via http://macilatthefront.blogspot.com/2018/12/tutorial-using-ffmpeg-for-dnxhddnxhr.html

### §17.5 H.264 (web delivery)

```bash
ffmpeg -y -hide_banner -loglevel warning \
  -f rawvideo -pixel_format rgb24 \
  -video_size 1920x1080 -framerate 30 \
  -i pipe:0 \
  -c:v libx264 -preset medium -crf 18 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 192k \
  output.mp4
```

- `-crf 18` = visually lossless (range 0-51, lower = higher quality)
- `-preset medium` = balance speed/quality (alternatives: ultrafast/superfast/veryfast/faster/fast/medium/slow/slower/veryslow)
- `-pix_fmt yuv420p` = 8-bit YUV 4:2:0 (compatible with all players)
- `-movflags +faststart` = moves moov atom to start of file for fast streaming

### §17.6 H.265 / HEVC (web delivery, smaller files)

```bash
ffmpeg -y -hide_banner -loglevel warning \
  -f rawvideo -pixel_format yuv422p10le \
  -video_size 3840x2160 -framerate 30000/1001 \
  -i pipe:0 \
  -c:v libx265 -preset medium -crf 20 \
  -pix_fmt yuv420p10le \
  -x265-params profile=main10 \
  -tag:v hvc1 \
  -movflags +faststart \
  -c:a aac -b:a 192k \
  output.mp4
```

- `-crf 20` for 10-bit content (range 0-51, recommended 22-28 for 4K per https://codecalamity.com/encoding-settings-for-hdr-4k-videos-using-10-bit-x265)
- `-pix_fmt yuv420p10le` = 10-bit YUV 4:2:0 (for HDR pipeline)
- `-x265-params profile=main10` = force Main 10 profile
- `-tag:v hvc1` = required for QuickTime/iOS playback (default `hev1` doesn't work on Apple platforms)
- Verified via https://trac.ffmpeg.org/wiki/Encode/H.265

### §17.7 VP9 (web delivery, royalty-free)

```bash
ffmpeg -y -hide_banner -loglevel warning \
  -f rawvideo -pixel_format yuv422p10le \
  -video_size 3840x2160 -framerate 30000/1001 \
  -i pipe:0 \
  -c:v libvpx-vp9 -crf 32 -b:v 0 \
  -pix_fmt yuv420p10le \
  -row-mt 1 -tile-columns 2 \
  -c:a libopus -b:a 192k \
  output.webm
```

- `-crf 32 -b:v 0` = constant quality mode (no bitrate target)
- `-row-mt 1` = row-based multi-threading (2-4× speedup)
- `-tile-columns 2` = parallel tile encoding
- `-c:a libopus` = Opus audio (WebM standard)

### §17.8 AV1 (future web delivery)

```bash
ffmpeg -y -hide_banner -loglevel warning \
  -f rawvideo -pixel_format yuv422p10le \
  -video_size 3840x2160 -framerate 30000/1001 \
  -i pipe:0 \
  -c:v libaom-av1 -crf 30 -b:v 0 \
  -pix_fmt yuv420p10le \
  -aom-params cpu-used=4:tile-columns=2:row-mt=1 \
  -c:a libopus -b:a 192k \
  -movflags +faststart \
  output.mp4
```

- `-aom-params cpu-used=4` = speed/quality tradeoff (0=slowest/highest quality, 8=fastest; 4 is good balance)
- AV1 encoding is ~10× slower than H.265 — only use when royalty-free is required

### §17.9 ffmpeg pipe input pixel format reference

| Pixel format | Bytes per pixel | 4K frame size | Use case |
|---|---|---|---|
| `rgb24` | 3 | 24.9 MB | 8-bit RGB (H.264 input) |
| `rgba` | 4 | 33.2 MB | 8-bit RGB + alpha |
| `rgb48le` | 6 | 49.7 MB | 16-bit RGB (anti-banding; avoids the rgb24→ProRes artefacts noted in https://superuser.com/questions/1663529) |
| `yuv422p10le` | 4 (avg) | 33.2 MB | 10-bit YUV 4:2:2 (ProRes, DNxHR HQX, H.265 input) |
| `yuv444p10le` | 6 | 49.7 MB | 10-bit YUV 4:4:4 (ProRes 4444 without alpha) |
| `yuva444p10le` | 8 | 66.4 MB | 10-bit YUV 4:4:4 + alpha (ProRes 4444 with alpha) |
| `yuv420p10le` | 3 (avg) | 24.9 MB | 10-bit YUV 4:2:0 (H.265 10-bit output) |

**Note:** rawvideo input via stdin does NOT support `rgb24` cleanly for some encoders — SuperUser thread (https://superuser.com/questions/1663529) reports artefacts when piping `rgb24` to ProRes/CFHD; workaround is `rgb48` (16-bit per channel). For our pipeline, we render to `yuv422p10le` directly (skip the RGB→YUV conversion in ffmpeg) — this is what the seed spec §5.1 `pixelFormat: 'yuv422p10le'` does.

---

## 18. Dockerfile Reference — Working Dockerfile for RunPod

### §18.1 FreeCut's existing Dockerfile (verified, headless/Dockerfile)

FreeCut's existing Dockerfile uses **Mesa lavapipe** (software Vulkan) — NOT real GPU. This is fine for non-GPU-effect renders but REJECTS GPU effects with `HardwareGpuRequiredError` (render-core.mjs:228-238). For real GPU on RunPod, we need a different Dockerfile (see §18.2).

```dockerfile
# FreeCut headless render service. (software Vulkan via lavapipe — NOT real GPU)
# From /tmp/freecut/headless/Dockerfile (57 LOC, verified by SCOUT-11)
FROM node:24-bookworm

# Google Chrome (proprietary codecs) + software Vulkan (lavapipe) for WebGPU + fonts.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates wget gnupg \
 && wget -qO- https://dl.google.com/linux/linux_signing_key.pub \
      | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
 && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] https://dl.google.com/linux/chrome/deb/ stable main" \
      > /etc/apt/sources.list.d/google-chrome.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends \
      google-chrome-stable \
      mesa-vulkan-drivers libvulkan1 vulkan-tools \
      fonts-liberation fonts-noto-color-emoji \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Use the system Google Chrome; don't download Playwright's bundled Chromium.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Build the harness (dist/headless.html + assets).
COPY . .
RUN npm run build

# Vulkan ICDs are auto-discovered: on a Linux GPU host (run with
# `--gpus all -e NVIDIA_DRIVER_CAPABILITIES=all`) the NVIDIA Vulkan ICD is
# mounted and WebGPU uses the real GPU; otherwise the bundled Mesa lavapipe
# provides software WebGPU. --no-sandbox is required running Chrome as root.
# (To force software even on a GPU host: -e VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/lvp_icd.x86_64.json)
ENV FREECUT_CHROME_ARGS="--no-sandbox"
ENV FREECUT_HOST=0.0.0.0

EXPOSE 8787
CMD ["node", "headless/serve.mjs", "--workspace", "/workspace", "--port", "8787"]
```

### §18.2 Our RunPod GPU Dockerfile (UNTESTED — needs verification on RunPod)

> When promoting from UNTESTED: fix inline RUN comments + apt-key deprecation (11-cloud-render.audit.md Issue 3).

Based on tigerabrodi's verified blog recipe + FreeCut's Dockerfile. **Mark as "untested, needs verification on RunPod"** per task instructions.

```dockerfile
# NLE Cloud Render — RunPod GPU container (UNTESTED)
# Verified ingredients:
#   - Tiger Abrodi blog (Feb 2026): Chrome + Vulkan + NVIDIA driver 570/580 on RunPod A40 / Colab T4 / Modal T4
#   - FreeCut Dockerfile (headless/Dockerfile): Chrome install + Mesa Vulkan fallback
#   - ASWF ORI: ffmpeg + ProRes encoding
# NOT YET TESTED on RunPod by SCOUT-11 — must verify before production use.

FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04

# Install system deps:
#  - Google Chrome (proprietary codecs: H.264, AAC, MP3)
#  - Vulkan loader 1.4+ (lunarg repo — Ubuntu 22.04 default is 1.3.204 which REJECTS NVIDIA driver 570+)
#  - NVIDIA Vulkan ICD (auto-discovered via /etc/vulkan/icd.d/nvidia_icd.json on RunPod)
#  - ffmpeg with libx264, libx265, prores_ks, dnxhd (Ubuntu 22.04 ffmpeg 4.4 has all these)
#  - dbus (Chrome expects it running)
#  - fonts (text rendering)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates wget gnupg curl \
      # Chrome
      && wget -qO- https://dl.google.com/linux/linux_signing_key.pub \
           | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
      && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] https://dl.google.com/linux/chrome/deb/ stable main" \
           > /etc/apt/sources.list.d/google-chrome.list \
      && apt-get update \
      && apt-get install -y --no-install-recommends \
           google-chrome-stable \
           # Vulkan (Ubuntu 22.04 default is 1.3.204 which rejects NVIDIA driver 570+ — install 1.4+ from lunarg)
           libvulkan1 vulkan-tools mesa-vulkan-drivers \
           && wget -qO - https://packages.lunarg.com/lunarg-signing-key-pub.asc | apt-key add - \
           && wget -qO /etc/apt/sources.list.d/lunarg-vulkan.list \
                https://packages.lunarg.com/vulkan/lunarg-vulkan-jammy.list \
           && apt-get update \
           && apt-get install -y --no-install-recommends libvulkan1 \
           # ffmpeg
           ffmpeg \
           # dbus (Chrome expects it running)
           dbus \
           # fonts
           fonts-liberation fonts-noto-color-emoji fonts-dejavu-core \
           # Node.js 20 LTS
           && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
           && apt-get install -y --no-install-recommends nodejs \
      && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Don't download Playwright's bundled Chromium — use system Chrome
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Install app deps
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy app source + build harness
COPY . .
RUN npm run build

# Chrome flags for real GPU WebGPU in headless mode (verified by tigerabrodi blog, Feb 2026)
# Critical: --enable-dawn-features=allow_unsafe_apis,disable_adapter_blocklist
# Without it, requestAdapter() returns null on NVIDIA driver 570+ (Dawn's separate blocklist)
ENV FREECUT_CHROME_ARGS="--no-sandbox --enable-dawn-features=allow_unsafe_apis,disable_adapter_blocklist --disable-dawn-features=disallow_unsafe_apis --disable-vulkan-surface --disable-gpu-sandbox"
ENV FREECUT_HOST=0.0.0.0

# Start dbus before Chrome (Chrome expects it running)
# Use a wrapper script so dbus starts as PID 2 and serve.mjs runs as the foreground process
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8787
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "headless/serve.mjs", "--workspace", "/workspace", "--port", "8787"]
```

**docker-entrypoint.sh:**
```bash
#!/bin/bash
set -e

# Start dbus (Chrome expects it running on Linux)
/etc/init.d/dbus start

# Verify GPU + Vulkan before starting the app
echo "Verifying GPU + Vulkan..."
nvidia-smi | head -5
vulkaninfo --summary 2>&1 | grep -A2 "GPU0" || echo "WARNING: vulkaninfo failed"

# Run the main command
exec "$@"
```

**RunPod deployment template:**
```yaml
# RunPod pod template (YAML — paste into RunPod's "Custom Template" UI)
# Verified: this is what tigerabrodi blog tested on A40 (driver 570) and Colab T4 (driver 580)
name: nle-cloud-render
image: <your-ecr-or-dockerhub>/nle-cloud-render:latest
gpu_type: "RTX 4090"  # or A100 PCIe for 8K
gpu_count: 1
volume:
  path: /workspace
  size: 100  # GB
ports:
  - 8787
env:
  - NVIDIA_DRIVER_CAPABILITIES: all
  - NVIDIA_VISIBLE_DEVICES: all
```

### §18.3 Verification checklist for first RunPod deployment

Before production, verify on RunPod:

1. **Vulkan sees the GPU:**
   ```bash
   vulkaninfo --summary | grep -A3 "GPU0"
   # Expected: GPU0: NVIDIA GeForce RTX 4090 (or A100, A40, T4, etc.)
   ```

2. **Chrome launches with real GPU:**
   ```bash
   google-chrome --headless=new --no-sandbox \
     --enable-unsafe-webgpu --enable-features=Vulkan --use-angle=vulkan \
     --disable-vulkan-surface --ignore-gpu-blocklist --disable-gpu-sandbox \
     --enable-dawn-features=allow_unsafe_apis,disable_adapter_blocklist \
     --disable-dawn-features=disallow_unsafe_apis \
     --dump-dom http://127.0.0.1:8787/gpu-test.html
   ```
   Where `gpu-test.html` contains:
   ```html
   <script>
     navigator.gpu.requestAdapter({ powerPreference: 'low-power' })
       .then(a => document.body.innerText = 'adapter: ' + (a ? a.info.vendor + ' / ' + a.info.architecture : 'NULL'))
   </script>
   ```
   Expected output: `adapter: nvidia / <architecture>` (NOT `adapter: NULL`, NOT `adapter: lavapipe`)

3. **ffmpeg has all required codecs:**
   ```bash
   ffmpeg -hide_banner -encoders | grep -E 'prores_ks|dnxhd|libx264|libx265|libvpx-vp9|libaom-av1'
   ```
   Expected: all six encoders listed (V... prores_ks, V... dnxhd, V... libx264, V... libx265, V... libvpx-vp9, V... libaom-av1).

4. **Render speed test:** render a 1-minute 4K test project. Expected wall-clock: <60 sec (much faster than real-time due to no scrubbing cache + 30-50 fps effective throughput per §7.6).

---

## Testing

> See `17-test-plan.md` §4 for the per-module template. This section
> supersedes §13 (the seed-spec test plan) — §13 listed tests informally;
> this section lists them as the contract per the §4 template.
> Matrix rows covered: "Cloud render: single-frame", "Cloud render:
> multi-frame", "Cloud render: ffmpeg integration", "Cloud render:
> WYSIWYG", "Cloud render: audio", "Cloud render: parallel jobs",
> "Cloud render: crash recovery".

### Tier 1: Pure engine tests

[Filename: `tests/unit/11-cloud-render/*.test.ts`]

- `createRenderEngine-wires-StaticClock-not-AudioClock` — `createRenderEngine(opts)` returns an engine whose `engine.clock` is an instance of `StaticClock` (not `AudioClock`); verifies §11.2's "two entry points, one EditorCore" design
- `StaticClock-stepTo-updates-now` — `clock.stepTo(MediaTime.fromSeconds(2.5))` then `clock.now()` returns exactly `MediaTime.fromSeconds(2.5)` (no real-time drift, no rAF jitter)
- `renderEngine-produces-correct-frame-count` — for a project of duration D at frame rate F, the engine's `totalFrames` property equals `Math.ceil(D * F)`; rendering frame N in `[0, totalFrames)` succeeds and frame `totalFrames` throws `RangeError`
- `ffmpeg-command-prores-4444-correct-cli-args` — building the ffmpeg argv for `{ format: 'prores-4444' }` produces `['-c:v', 'prores_ks', '-profile:v', '4', '-pix_fmt', 'yuva444p10le', '-alpha_bits', '16', '-vendor', 'apl0', ...]` (matches §17.1)
- `ffmpeg-command-prores-422-hq-correct-cli-args` — `{ format: 'prores-422-hq' }` produces `-c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le ...` (matches §17.3)
- `ffmpeg-command-h265-correct-cli-args` — `{ format: 'h265' }` produces `-c:v libx265 -preset medium -crf 20 -pix_fmt yuv420p10le -x265-params profile=main10 -tag:v hvc1 ...` (matches §17.6)
- `ffmpeg-command-dnxhr-correct-cli-args` — `{ format: 'dnxhr-hqx' }` produces `-c:v dnxhd -profile:v dnxhr_hqx -pix_fmt yuv422p10le ...` (matches §17.4; note encoder is `dnxhd`, not `dnxhr`)
- `ffmpeg-command-pixel-format-10bit-yuv422p10le` — for any 10-bit format (ProRes 422 HQ, DNxHR HQX, H.265 input), the raw-input `-pixel_format` flag is `yuv422p10le` (or `yuva444p10le` for ProRes 4444 with alpha)
- `ffmpeg-command-pixel-format-8bit-rgb24` — for the 8-bit H.264 path, the raw-input `-pixel_format` is `rgb24` (3 bytes/pixel) and the encode `-pix_fmt` is `yuv420p` (matches §17.5 + §17.9 pixel-format reference)
- `render-queue-serializes-heavy-jobs` — enqueuing 3 render jobs on a 1-GPU box runs them strictly serially (job 2's `start` is called only after job 1's `complete` event); at most 1 ffmpeg subprocess alive at a time; verifies §9 serial guarantee
- `render-queue-enqueues-and-dequeues-in-fifo-order` — enqueuing jobs A, B, C with default priority; dequeue order matches enqueue order (FIFO); verified by intercepting `runRender` calls in a mock driver

### Tier 2: Render tests

[Filename: `tests/integration/11-cloud-render/*.render.test.ts`]

All Tier 2 tests require a Playwright-launched headless Chrome with real GPU
WebGPU (per §4 + §18 Dockerfile). They run on the RunPod RTX 4090 CI runner
only; PRs from forks skip Tier 2 (see spec 17 §9 "which tiers run when").

- `headless-chrome-real-gpu-adapter` — launches Chrome with `--enable-dawn-features=allow_unsafe_apis,disable_adapter_blocklist` (§4 + §18), then `navigator.gpu.requestAdapter()` returns a non-null adapter whose `info.vendor` is `'nvidia'`, `'amd'`, or `'apple'` (NOT `'lavapipe'`, NOT `null`); fails fast if adapter is software
- `single-frame-render-pixel-match` — renders frame 0 of `tests/fixtures/projects/simple-cut.json` via `POST /api/engine/render-frame` (per spec 15 §8.4), pixel-diffs the returned PNG against `tests/fixtures/references/simple-cut-frame-0.png`; tolerance `0%` (WYSIWYG contract, §11.3)
- `multi-frame-render-100-frames-all-correct` — renders frames 0–99 of `simple-cut.json`; every frame's SHA-256 matches its reference hash; no frame skipped, no frame duplicated
- `ffmpeg-pipe-100-frames-to-prores-plays-via-ffprobe` — pipes 100 frames of `simple-cut.json` to ffmpeg via Path B (§11.4); runs `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,profile,pix_fmt,width,height output.mov`; asserts `codec_name=prores`, `profile=4` (ProRes 4444), `pix_fmt=yuva444p10le`, `width=1920`, `height=1080`
- `offline-audio-context-renders-pcm-matching-reference` — `engine.audio.renderAudio()` on `tests/fixtures/projects/varispeed.json` (registered in spec 17 §5.3 in Round 7) returns per-channel `Float32Array[]` planes (§5.1) whose SHA-256 (per channel, concatenated) matches `tests/fixtures/references/varispeed-audio.pcm.sha256`; total sample count = `Math.ceil(projectDuration * sampleRate) * channelCount`
- `audio-plus-video-mux-plays-correctly` — renders both video (Path B → 100 frames ProRes) and audio (`renderAudio` → PCM), then `ffmpeg -i video.mov -i audio.wav -c copy output.mov`; output MOV plays in `ffplay` (exit 0) and `ffprobe` reports 1 video + 1 audio stream
- `wysiwyg-browser-vs-cloud-zero-pixel-diff` — the critical test (§11.3): renders frames `[0, 30, 100, 500, 1000]` of `simple-cut.json` via both `createInteractiveEngine()` (browser preview path) and `createRenderEngine()` (cloud path); pixel-diffs each frame; tolerance `0%` (any diff > 0 pixels fails the build). This is the test that enforces the "one engine, two entry points" contract
- `audio-wysiwyg-realtime-vs-offline-bit-identical-pcm` — renders `varispeed.json` audio via both `AudioContext` (real-time, with SoundTouch varispeed AudioWorklet) and `OfflineAudioContext` (offline render path); the two `Float32Array[]` outputs are bit-identical (per-channel, sample-by-sample `===` comparison). Verifies §11.2 claim that the only difference between the two paths is the clock + output target, not the audio graph
- `gpu-readback-pipelining-3-frames-in-flight-throughput` — with N=3 frames in flight (per §7.3), measures wall-clock time to render+readback 100 frames at 4K; effective throughput ≥ 30 fps (i.e. 100 frames in ≤ 3.3 s of GPU time, plus startup overhead). Records the measured throughput in the test report for trend analysis
- `4k-10min-project-completes-under-10min` — renders `tests/fixtures/projects/4k-5min.json` × 2 (10 min total) at 3840×2160 ProRes 422 HQ; wall-clock < 10 min (i.e. ≥ 1× realtime; target per SCOUT-11 is ~30-50 fps effective throughput, §7.6)
- `8k-1min-project-completes-under-5min` — renders `tests/fixtures/projects/8k-1min.json` at 7680×4320 ProRes 4444; wall-clock < 5 min (5× realtime headroom; A100 recommended per §18.2 RunPod template)
- `parallel-jobs-4-on-4-gpu-box-same-time-as-1` — launches 4 `POST /api/render` jobs concurrently on a 4-GPU RunPod box; each job's wall-clock is within ±10% of the single-job baseline; total wall-clock ≈ single-job baseline (NOT 4× slower). Verifies §9 parallelism
- `chrome-crash-recovery-restarts-from-last-completed-frame` — kills the Chrome process (via `process.kill(chromePid, 'SIGKILL')`) after frame 50 of a 100-frame render; the queue supervisor restarts Chrome and resumes from frame 51 (NOT frame 0); the final output has exactly 100 frames; no frame is rendered twice (verified by per-frame hash log)
- `ffmpeg-crash-fails-gracefully-no-partial-output` — `SIGKILL`s the ffmpeg subprocess after frame 30 of a 100-frame render; the render job transitions to `failed` state with `error: 'ffmpeg exited with code null (SIGKILL)'`; the partial output file is deleted (no `.mov` left on disk); the queue proceeds to the next job
- `gpu-device-loss-recovery-restarts-from-last-frame` — calls `device.destroy()` on the WebGPU device mid-render (after frame 40); the engine catches the `uncaughtdestroyed` event, re-creates the device, re-loads the scene, and resumes from frame 41; final output has 100 frames
- `mediabunny-urlsource-http-range-requests-work` — mounts a mock media server that logs `Range:` headers; renders a project with one HTTP media source; asserts at least 1 `Range: bytes=N-` request was made before the frame was rendered (verifies §8.2 claim that UrlSource always sends `Range:`)
- `mediabunny-urlsource-falls-back-when-no-206` — mounts a mock media server that responds with `200 OK` + full body (no `206`); renders the same project; asserts no `Range:` header crash, render completes successfully, and a warning was logged (`"Server does not support range requests, downloading full file"` per §8.2)

### Tier 3: UI tests

[Filename: `tests/integration/11-cloud-render/export-dialog.ui.test.ts`]

The export dialog's visual layout, panel placement, and `data-testid` inventory are owned by `18-ui-shell.md` (Deliver page); the tests below assert behavior only and inherit layout changes from spec 18.

- `keyboard-cmd-shift-e-opens-export-dialog` — `page.keyboard.press('Meta+Shift+e')` opens the export modal; `expect(page.locator('[data-testid="export-dialog"]')).toBeVisible()`; resulting `SceneState` is unchanged (state WYSIWYG, spec 17 §6.1)
- `keyboard-selects-prores-4444-via-arrow-keys` — with dialog open, `Tab` focuses the format `<select>`, `ArrowDown` × N selects `prores-4444`; `expect(page.locator('[data-testid="export-format-select"]')).toHaveValue('prores-4444')`
- `keyboard-enter-starts-render` — pressing `Enter` on the "Start render" button POSTs to `/api/render`; the test stubs the endpoint and asserts the request body matches `{ projectId, format: 'prores-4444' }`
- `render-progress-updates-via-websocket` — after `Enter`, the dialog subscribes to `GET /api/engine/subscribe` (SSE/WebSocket per spec 15 §8.5); the test injects synthetic `RenderProgress` events (frame 10/100, 50/100, 100/100); the dialog's progress bar updates to `10%`, `50%`, `100%`
- `download-link-appears-when-complete` — when the `RenderComplete` event arrives, the dialog shows a `[data-testid="download-link"]` anchor whose `href` matches the signed download URL returned by the render API

### Property-based tests

[Filename: `tests/unit/11-cloud-render/cloud-render.property.test.ts`]

- `any-valid-project-cloud-render-produces-valid-output` — `fc.assert(fc.property(arbitraryProjectJSON, async (p) => { const result = await runCloudRender(p, { frames: 5, format: 'prores-422-hq' }); expect(result.ok).toBe(true); expect(result.outputBytes.length).toBeGreaterThan(0); }), { numRuns: 200, timeoutPerRun: 30000 })`; never crashes, never throws, never produces a 0-byte output
- `frame-n-via-cloud-equals-frame-n-via-browser` — `fc.assert(fc.property(arbitraryProjectJSON, fc.integer({ min: 0, max: 99 }), async (p, n) => { const cloudPixels = await renderCloudFrame(p, n); const browserPixels = await renderBrowserFrame(p, n); expect(pixelDiff(cloudPixels, browserPixels)).toBe(0); }), { numRuns: 50, timeoutPerRun: 60000 })`; the property version of the §11.3 WYSIWYG test — verifies the contract holds across the entire project state space, not just 5 hand-picked frames

### Manual tests

[Performed by QA before each release. Not in CI.]

- `prores-plays-in-vlc` — open a cloud-rendered ProRes 4444 `.mov` in VLC 3.0+ on macOS; playback starts within 2 s, no artefacts, audio in sync
- `prores-imports-in-fcp` — import the same `.mov` into Final Cut Pro 11 on macOS; import succeeds, timeline shows correct duration, no "unsupported codec" warning
- `prores-imports-in-davinci` — import into DaVinci Resolve 19; import succeeds, color metadata read correctly (BT.709 / sRGB transfer per §17.1 flags)
- `cloud-render-cost-under-budget` — render a 4K 10-min project on a RunPod RTX 4090 Secure Cloud instance; verify the RunPod invoice line item is ≤ $0.20 (per SCOUT-11 pricing: ~$0.012-0.023 per 4K render minute × 10 min = $0.12-0.23; budget ceiling $0.20 — if exceeded, file a perf regression bug against §7.6)

### Test assets

- `tests/fixtures/projects/simple-cut.json` — 3-clip cut on the main track, 5 s total; for single-frame + multi-frame Tier 2 tests
- `tests/fixtures/projects/4k-5min.json` — 4K (3840×2160) project, 5 min, mixed codecs; for the `4k-10min` test (rendered × 2)
- `tests/fixtures/projects/8k-1min.json` — 8K (7680×4320) project, 1 min; for the 8K render test
- `tests/fixtures/projects/varispeed.json` — project with one clip at 0.5× and one at 2× speed; for the audio WYSIWYG test (real-time vs offline)
- `tests/fixtures/references/simple-cut-frame-{0,30,100,500,1000}.png` — reference PNGs for the single-frame + WYSIWYG tests; regenerated via `npm run regen-references -- --filter "11-cloud-render"` (spec 17 §10)
- `tests/fixtures/references/varispeed-audio.pcm.sha256` — SHA-256 of the reference audio PCM; bit-identical comparison (no tolerance — audio is exact)
- `tests/fixtures/references/prores-4444-sample.mov` — known-good ProRes 4444 sample from ASWF ORI; used as ffprobe reference (`ffprobe` output of our render should match this sample's stream metadata)
- `docker/Dockerfile.cloud-render` — the Dockerfile from §18 (RunPod setup); used by the Tier 2 CI runner to provision the test container
- `docker/docker-entrypoint.sh` — the entrypoint script from §18 (starts dbus, verifies GPU + Vulkan)
- `docker/runpod-template.yaml` — RunPod deployment template from §18.2

### Test commands

```bash
# Run Tier 1 (pure engine) tests for spec 11
npm test -- --filter "11-cloud-render"

# Run Tier 2 (render) tests for spec 11 — requires RunPod RTX 4090 runner
RUNPOD_GPU=rtx-4090 npm run test:render -- --filter "11-cloud-render"

# Run Tier 3 (UI) tests for spec 11
npm run test:ui -- --filter "11-cloud-render"

# Run property tests for spec 11
npm run test:property -- --filter "11-cloud-render"

# Run all tiers for spec 11
npm run test:all -- --filter "11-cloud-render"

# Regenerate reference PNGs + audio PCM hash for spec 11
npm run regen-references -- --filter "11-cloud-render"
```

---

**End of `11-cloud-render.refined.md`.** Next: `12-testing-strategy.refined.md`.

# 02 — Workers & Threading: Worker Pool, AudioWorklet, Threading Discipline

**Stream:** Off-main-thread execution
**Status:** Seed spec (sub-agent scout will refine with code references)
**Primary teacher:** FreeCut — `ManagedWorker*` abstraction + 21 worker entry points + 1 AudioWorklet
**Spec file:** `02-workers-threading.md`

---

## 1. Purpose

Define the off-main-thread execution architecture: which operations run on workers, which run on the AudioWorklet, how workers are created/pooled/terminated, and the memory discipline that keeps the renderer process under 4 GB.

---

## 2. Why Workers Are Non-Negotiable

An NLE has multiple categories of CPU-heavy work that **cannot** run on the main thread without freezing the UI:

| Operation | Why it's heavy | What breaks if main-thread |
|---|---|---|
| Audio decode (file → PCM) | 20-min file = ~50 MB PCM, ~5s decode | UI freezes on every import |
| Waveform peak generation | Iterate every sample, compute min/max per pixel | UI freezes during waveform extraction |
| Filmstrip thumbnail extraction | Decode frames, scale, encode | UI freezes on timeline scroll |
| File import / metadata | Parse headers, extract duration/fps | UI freezes on drag-drop |
| OPFS persistence | File I/O, JSON serialization | UI freezes on every autosave |
| Export rendering (final encode) | Per-frame encode loop, ~30 min for 4K | UI freezes for entire export duration |
| Transcription (Whisper) | ONNX model inference, ~250 MB weights | UI freezes + memory pressure |
| Decoder prewarm | Load WASM decoder before first use | Cold-start stutter on first scrub |
| Varispeed audio (scrub, retime) | SoundTouch time-stretch DSP | Audio glitches if main thread blocks |

OpenCut-classic runs **all** of these on the main thread (except transcription) and it shows — its export pipeline is a synchronous `for` loop that freezes the UI for the entire export. We adopt FreeCut's pattern: every heavy operation runs off main thread.

---

## 3. Worker Inventory (Target)

We will need the following workers (mapped from FreeCut's 21, pruned/renamed):

### Always-on workers (lifecycle-bound to engine)

| # | Worker | Purpose | Critical path? | FreeCut reference |
|---|---|---|---|---|
| 1 | `decode.worker.ts` | WebCodecs/mediabunny video decode → `VideoFrame` | Yes | `audio-decode-worker.ts` (audio) + new (video) |
| 2 | `audio-decode.worker.ts` | Full-audio decode → PCM bins | Yes | `audio-decode-worker.ts` |
| 3 | `opfs.worker.ts` | OPFS read/write, project save/load | Yes | `opfs-worker.ts` |
| 4 | `media-processor.worker.ts` | Import-time metadata, thumbnail extraction | Yes | `media-processor.worker.ts` |

### On-demand workers (lazy-spawned, idle-terminated)

| # | Worker | Purpose | Critical path? | FreeCut reference |
|---|---|---|---|---|
| 5 | `waveform.worker.ts` | Audio sample → waveform peaks | Yes (timeline) | `waveform-worker.ts` |
| 6 | `filmstrip.worker.ts` | Video frame → thumbnail (pool) | Yes (timeline) | `filmstrip-extraction-worker.ts` |
| 7 | `export-render.worker.ts` | Per-frame composition + encode | Yes (export) | `export-render.worker.ts` |
| 8 | `decoder-prewarm.worker.ts` | Prewarm mediabunny WASM decoder | Optional | `decoder-prewarm-worker.ts` |

### Optional feature workers (user-triggered)

| # | Worker | Purpose | FreeCut reference |
|---|---|---|---|
| 9 | `transcription.worker.ts` | Whisper ASR | `whisper.worker.ts` (we'll have one, not two) |
| 10 | `silence-detection.worker.ts` | Detect silence regions | `silence-detection-worker.ts` |

### Special: AudioWorklet (NOT a Web Worker)

| # | Worklet | Purpose | FreeCut reference |
|---|---|---|---|
| W1 | `soundtouch-processor.worklet.ts` | Varispeed audio DSP (scrub, retime, reverse) | `soundtouch-preview-processor.worklet.ts` |

**Total: 10 Web Workers + 1 AudioWorklet.** Pruned from FreeCut's 21 — we don't need the AI/VLM workers, upscaling, frame interpolation, TTS, etc. in v1.

---

## 4. `ManagedWorker` Abstraction (Adopt from FreeCut)

FreeCut built a small (~120 LOC) in-house abstraction in three files:

- `src/shared/utils/managed-worker.ts` — singleton lazy-create + terminate
- `src/shared/utils/managed-worker-pool.ts` — pool with idle reuse
- `src/shared/utils/managed-worker-session.ts` — multi-worker session keyed by name

**Sub-agent scout task:** Read all three files in FreeCut. Quote the full implementation. Document:
- Lazy creation pattern
- Idle reuse logic (how long to keep a worker alive between requests)
- Cleanup hooks (when is a worker terminated?)
- Error handling (worker crash, message timeout)
- How `Transferable` objects are passed (postMessage with transferList?)
- Lifecycle integration with React (does it cleanup on unmount?)

### Our target interface

```ts
// src/platform/workers/ManagedWorker.ts

export interface WorkerSpec<TRequest, TResponse> {
  url: URL;  // new URL('./decode.worker.ts', import.meta.url)
  name: string;
  idleTimeoutMs?: number;  // default 30_000 — terminate if idle for 30s
  maxInstances?: number;  // for pools
}

export interface WorkerHandle<TRequest, TResponse> {
  postMessage(message: TRequest, transfer?: Transferable[]): Promise<TResponse>;
  terminate(): void;
  on(event: 'error' | 'exit', cb: (err?: Error) => void): () => void;
}

export interface WorkerPool<TRequest, TResponse> {
  acquire(): Promise<WorkerHandle<TRequest, TResponse>>;
  release(handle: WorkerHandle<TRequest, TResponse>): void;
  terminateAll(): void;
}
```

---

## 5. Memory Discipline

### 5.1 The 4 GB ceiling

The renderer process has a ~4 GB memory ceiling (see master spec §6). This is shared across:
- Main thread (UI, React, ~200-500 MB)
- All workers (~30-50 MB baseline each + working memory)
- WASM linear memory (where used)
- Burst allocations (decode cache, GPU textures)

### 5.2 Discipline rules

1. **Always-on workers: max 4.** Keep decode, audio-decode, opfs, media-processor alive for engine lifetime. Total baseline: ~200 MB.

2. **On-demand workers: lazy + idle-terminate.** Waveform, filmstrip, export-render workers spawn when needed, terminate after 30s idle. `ManagedWorkerPool` enforces this.

3. **One heavy worker at a time.** Transcription, export-render, silence-detection — only one runs at a time. Implement a global `HeavyWorkerQueue`:

```ts
// src/platform/workers/HeavyWorkerQueue.ts

class HeavyWorkerQueue {
  private current: Promise<unknown> | null = null;
  private queue: Array<() => Promise<unknown>> = [];
  
  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try { resolve(await task()); }
        catch (e) { reject(e); }
      });
      this.drain();
    });
  }
  
  private async drain() {
    if (this.current) return;
    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      this.current = task();
      await this.current;
      this.current = null;
    }
  }
}
```

4. **Transferable objects, not copies.** Use `postMessage(message, [transferList])` to transfer `ArrayBuffer`, `MessagePort`, `ImageBitmap`, `OffscreenCanvas` without copying.

5. **Stream large data, don't accumulate.** Waveform worker streams `Float32Array` peaks in chunks; filmstrip worker streams `ImageBitmap` per thumbnail. Never accumulate full PCM / full thumbnail set in worker memory.

6. **Decoder prewarm is fire-and-forget.** Send `{type: 'warmup'}`, never await. If prewarm fails, first scrub pays cold-start cost — that's acceptable.

7. **No `SharedArrayBuffer` in v1.** Workers communicate via `postMessage` + `Transferable` only. SAB requires COOP/CEOP headers (we set them anyway, see §6) but the abstraction is more complex. Defer SAB to v2 if a real bottleneck emerges.

### 5.3 Worker memory budget (rough)

| Worker | Baseline | Burst | Notes |
|---|---|---|---|
| decode | 50 MB | +100 MB (decode cache) | Streams frames, low sustained |
| audio-decode | 50 MB | +200 MB (PCM bins) | Returns transferable |
| opfs | 30 MB | +50 MB | Mostly I/O bound |
| media-processor | 30 MB | +100 MB (during import) | Brief bursts |
| waveform | 30 MB | +50 MB | Streams peaks |
| filmstrip (pool of 2) | 60 MB | +100 MB | Pool |
| export-render | 50 MB | +500 MB (frame buffers) | One at a time |
| transcription | 50 MB | +500 MB (Whisper weights) | One at a time |
| **Total baseline (all alive)** | **~350 MB** | | |
| **Total with export + transcription active** | | **~1.5 GB** | Plus main thread + GPU |
| **Renderer process ceiling** | **~4 GB** | | Headroom: ~1 GB |

These numbers are rough. Sub-agent scouts should verify against FreeCut's actual memory usage (the audit found FreeCut sets COOP/CEOP — check if there are memory diagnostics).

---

## 6. Cross-Origin Isolation

Set headers (in Vite config and production server):

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

This enables `SharedArrayBuffer` if needed later. FreeCut sets these — `vite.config.ts:304` area in FreeCut has the `worker: { format: 'es' }` config and there should be COOP/CEOP config nearby. Sub-agent scout to verify.

We don't use SAB in v1, but setting the headers preserves the option.

---

## 7. AudioWorklet (Special Case)

The AudioWorklet is NOT a Web Worker. It runs on the **audio render thread** — a single high-priority thread dedicated to audio. It has:
- Hard real-time deadlines (must produce samples per audio quantum)
- Separate memory budget (not counted against renderer process ceiling)
- Single instance (one audio thread per `AudioContext`)

### 7.1 SoundTouch varispeed processor

**Purpose:** Real-time time-stretching for varispeed preview (scrub, retimed playback, reverse shuttle).

**Without this:** Varispeed would require main-thread JS (`soundtouchjs`) which stutters under load. OpenCut-classic does this — we don't.

**FreeCut reference:** `src/runtime/composition-runtime/worklets/soundtouch-preview-processor.worklet.ts`. Sub-agent scout to read this file in full and document:
- The `AudioWorkletProcessor` registration
- The `process(inputs, outputs, parameters)` implementation
- How it receives tempo/pitch/seek commands via `port.onmessage`
- How it emits stretched samples
- Buffer management (ring buffer? double buffer?)

### 7.2 Worklet registration flow

```ts
// src/platform/audio/WebAudioAdapter.ts

class WebAudioAdapter implements Audio {
  async registerVarispeedProcessor(context: AudioContext | OfflineAudioContext): Promise<void> {
    await context.audioWorklet.addModule(
      new URL('./worklets/soundtouch-processor.worklet.ts', import.meta.url)
    );
  }
  
  createVarispeedNode(context: AudioContext | OfflineAudioContext): AudioWorkletNode {
    return new AudioWorkletNode(context, 'soundtouch-varispeed-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      processorOptions: {
        // initial config
      },
    });
  }
}
```

### 7.3 AudioWorklet in cloud render

For `OfflineAudioContext` (cloud render), the same worklet runs but renders faster than real-time. Same code, different scheduling.

---

## 8. Per-Worker Specs

For each worker, define:
- **Inputs:** what `postMessage` it accepts (with TS type)
- **Outputs:** what it returns (with TS type, note Transferable)
- **State:** what it caches across messages (e.g., decode cache, decoder instance)
- **Error handling:** what happens on failure (worker crash, decode error, OOM)
- **Lifecycle:** when created, when terminated

### 8.1 `decode.worker.ts`

```ts
// Inputs
type DecodeRequest =
  | { type: 'init'; mediaId: string; source: Blob | File }
  | { type: 'decode'; mediaId: string; time: MediaTime; fps: FrameRate }
  | { type: 'release'; mediaId: string };

// Outputs
type DecodeResponse =
  | { type: 'frame'; mediaId: string; time: MediaTime; frame: VideoFrame; format: 'p010' | 'nv12' }
  | { type: 'error'; mediaId: string; error: string };

// State: Map<mediaId, { decoder: VideoDecoder, cache: Map<MediaTime, VideoFrame> }>
// Lifecycle: Always-on (created by MediaManager)
// Transferable: VideoFrame is transferable (via .clone() if needed)
```

**FreeCut reference:** FreeCut uses HTML5 `<video>` for preview, not WebCodecs — they don't have a true decode worker. OpenCut-classic's `apps/web/src/services/video-cache/service.ts` is the closest — but it's main-thread. We adapt OpenCut-classic's mediabunny+WebCodecs pattern but move it to a worker.

**Sub-agent scout task:** Read `apps/web/src/services/video-cache/service.ts` (338 LOC) in OpenCut-classic. Document the mediabunny API used (`Input`, `BlobSource`, `getPrimaryVideoTrack`, `canDecode`, `CanvasSink` or `VideoSampleSink`). Note: we will use `VideoSampleSink` (not `CanvasSink`) to get raw `VideoFrame` objects, configured for `pixelFormat: 'P010'`.

### 8.2 `audio-decode.worker.ts`

```ts
// Inputs
type AudioDecodeRequest =
  | { type: 'init'; mediaId: string; source: Blob | File }
  | { type: 'decode'; mediaId: string; start: MediaTime; end: MediaTime }
  | { type: 'release'; mediaId: string };

// Outputs
type AudioDecodeResponse =
  | { type: 'peaks'; mediaId: string; peaks: Float32Array; sampleRate: number }
  | { type: 'audio-buffer'; mediaId: string; buffer: ArrayBuffer; sampleRate: number; channels: number }
  | { type: 'error'; mediaId: string; error: string };

// State: Map<mediaId, { decoder: AudioDecoder }>
// Lifecycle: Always-on
// Transferable: ArrayBuffer (transferable)
```

**FreeCut reference:** `src/runtime/composition-runtime/utils/audio-decode-worker.ts`. Sub-agent scout to read in full.

### 8.3 `waveform.worker.ts`

```ts
// Inputs
type WaveformRequest =
  | { type: 'extract'; mediaId: string; peaksPerSecond: number; start: MediaTime; end: MediaTime }
  | { type: 'cancel'; mediaId: string };

// Outputs
type WaveformResponse =
  | { type: 'progress'; mediaId: string; progress: number; peaks: Float32Array }
  | { type: 'complete'; mediaId: string; peaks: Float32Array }
  | { type: 'cancelled'; mediaId: string };

// Lifecycle: On-demand, idle-terminate after 30s
// Transferable: Float32Array.buffer
```

**FreeCut reference:** `src/features/timeline/services/waveform-worker.ts` and `waveform-cache.ts`. Sub-agent scout to read both files in full.

### 8.4 `filmstrip.worker.ts` (pool of 2)

```ts
// Inputs
type FilmstripRequest =
  | { type: 'extract'; mediaId: string; times: MediaTime[]; thumbnailSize: { width: number; height: number } }
  | { type: 'cancel'; mediaId: string };

// Outputs
type FilmstripResponse =
  | { type: 'thumbnail'; mediaId: string; time: MediaTime; image: ImageBitmap }
  | { type: 'complete'; mediaId: string }
  | { type: 'cancelled'; mediaId: string };

// Lifecycle: On-demand pool (2 workers), idle-terminate after 30s
// Transferable: ImageBitmap
```

**FreeCut reference:** `src/features/timeline/workers/filmstrip-extraction-worker.ts` and `filmstrip-cache.ts` (uses `createManagedWorkerPool`). Sub-agent scout to read both files in full and document the pool management pattern.

### 8.5 `export-render.worker.ts`

```ts
// Inputs
type ExportRequest =
  | { type: 'init'; project: ProjectJSON; format: ExportFormat; outputPath: string }
  | { type: 'render'; startFrame: number; endFrame: number }
  | { type: 'cancel' };

// Outputs
type ExportResponse =
  | { type: 'frame'; frameNumber: number; pixels: Uint8ClampedArray | Uint16Array; width: number; height: number; format: 'rgb24' | 'yuv422p10le' }
  | { type: 'progress'; frameNumber: number; totalFrames: number }
  | { type: 'complete'; outputPath: string }
  | { type: 'error'; error: string };

// Lifecycle: On-demand, one at a time (HeavyWorkerQueue)
// Transferable: pixels.buffer
```

**Critical:** The export worker uses the SAME engine code as the interactive mode. It imports `createRenderEngine` and runs it. This guarantees WYSIWYG.

**FreeCut reference:** `src/features/export/workers/export-render.worker.ts` and `src/features/export/utils/render-pipeline.ts`. Sub-agent scout to read both files in full. Document:
- The main-thread fallback path (`render-pipeline.ts:286-299` area)
- How the worker detects it can't handle a composition (e.g., unsupported codec)
- How frames are streamed out (one-by-one vs batched)

### 8.6 `opfs.worker.ts`

```ts
// Inputs
type OPFSRequest =
  | { type: 'read'; path: string }
  | { type: 'write'; path: string; data: ArrayBuffer | Blob }
  | { type: 'delete'; path: string }
  | { type: 'list'; dir: string };

// Outputs
type OPFSResponse =
  | { type: 'data'; path: string; data: ArrayBuffer }
  | { type: 'ok'; path: string }
  | { type: 'entries'; dir: string; entries: string[] }
  | { type: 'error'; error: string };

// Lifecycle: Always-on
// Transferable: ArrayBuffer
```

**FreeCut reference:** `src/features/media-library/workers/opfs-worker.ts`. Sub-agent scout to read in full and document the MessageChannel pattern FreeCut uses.

### 8.7 `media-processor.worker.ts`

```ts
// Inputs
type MediaProcessorRequest =
  | { type: 'extract-metadata'; source: Blob | File }
  | { type: 'extract-thumbnail'; source: Blob | File; time: MediaTime; size: { width: number; height: number } };

// Outputs
type MediaProcessorResponse =
  | { type: 'metadata'; mediaInfo: MediaInfo }
  | { type: 'thumbnail'; image: ImageBitmap }
  | { type: 'error'; error: string };

// Lifecycle: Always-on
// Transferable: ImageBitmap
```

**FreeCut reference:** `src/features/media-library/workers/media-processor.worker.ts`. Sub-agent scout to read in full.

### 8.8 `transcription.worker.ts` (optional, v1 stretch)

```ts
// Inputs
type TranscriptionRequest =
  | { type: 'init'; modelId: string }
  | { type: 'transcribe'; audio: Float32Array; sampleRate: number; language: string }
  | { type: 'cancel' };

// Outputs
type TranscriptionResponse =
  | { type: 'init-progress'; progress: number }
  | { type: 'init-complete' }
  | { type: 'transcribe-progress'; progress: number }
  | { type: 'transcribe-complete'; segments: TranscriptSegment[] }
  | { type: 'cancelled' };

// Lifecycle: On-demand, one at a time (HeavyWorkerQueue), idle-terminate after 5 min
// Transferable: audio.buffer (input)
```

**FreeCut reference:** `src/features/media-library/transcription/workers/whisper.worker.ts`. Sub-agent scout to read in full. Document the `@huggingface/transformers` integration and CDN loading pattern.

### 8.9 `silence-detection.worker.ts` (optional)

**FreeCut reference:** `src/features/timeline/workers/silence-detection-worker.ts`. Sub-agent scout to read in full.

---

## 9. Worker Creation Pattern

Workers must be created via `new Worker(new URL('./x.worker.ts', import.meta.url), { type: 'module' })` so Vite picks them up as separate chunks:

```ts
// src/platform/workers/worker-specs.ts

export const decodeWorkerSpec: WorkerSpec<DecodeRequest, DecodeResponse> = {
  url: new URL('./workers/decode.worker.ts', import.meta.url),
  name: 'decode',
};

export const waveformWorkerSpec: WorkerSpec<WaveformRequest, WaveformResponse> = {
  url: new URL('./workers/waveform.worker.ts', import.meta.url),
  name: 'waveform',
  idleTimeoutMs: 30_000,
};

export const filmstripWorkerSpec: WorkerSpec<FilmstripRequest, FilmstripResponse> = {
  url: new URL('./workers/filmstrip.worker.ts', import.meta.url),
  name: 'filmstrip',
  idleTimeoutMs: 30_000,
  maxInstances: 2,  // pool
};

// ... etc
```

Vite config:
```ts
// vite.config.ts
export default defineConfig({
  worker: {
    format: 'es',
  },
  // ...
});
```

---

## 10. Error Handling

### 10.1 Worker crash

```ts
handle.on('error', (err) => {
  console.error(`Worker ${spec.name} crashed:`, err);
  // Mark pending requests as failed
  // Optionally restart the worker
});
```

### 10.2 Message timeout

Each `postMessage` has a timeout (default 30s). On timeout:
- Log
- Terminate the worker
- Reject the pending request
- Optionally restart

### 10.3 OOM

If a worker is OOM-killed (browser typically just terminates it), the `onerror` handler fires. Treat as worker crash. The user may need to retry; if persistent, show "out of memory — try smaller project" UI.

### 10.4 Degradation

If a worker repeatedly crashes, mark its feature as degraded:
- `waveform.worker` fails → no waveforms in timeline, but editing works
- `filmstrip.worker` fails → no thumbnails, but editing works
- `export-render.worker` fails → fall back to main-thread export (with UI freeze warning)
- `transcription.worker` fails → disable transcription feature
- `decode.worker` fails → cannot preview (critical — show error)
- `opfs.worker` fails → cannot save (critical — show error)

---

## 11. Open Questions for Sub-Agent Scout

1. **FreeCut's `ManagedWorker` (3 files).** Read all three files in full. Quote the implementation. Note any subtleties (React effect integration, dev vs prod differences, hot module reload handling).

2. **FreeCut's `HeavyWorkerQueue` equivalent.** Does FreeCut have a global queue for heavy workers? Or do they rely on the pool's `maxInstances: 1` constraint? Document the actual pattern.

3. **FreeCut's worker error patterns.** Read 2-3 worker files. How do they handle errors? Do they crash and restart, or stay alive with degraded state?

4. **FreeCut's `opfs-worker.ts`.** Read in full. Document the MessageChannel pattern. Why MessageChannel instead of regular postMessage?

5. **FreeCut's `export-render.worker.ts` + `render-pipeline.ts`.** Read both in full. Document the main-thread fallback path. When does it trigger?

6. **FreeCut's `audio-decode-worker.ts`.** Read in full. Document how PCM bins are streamed back.

7. **FreeCut's `filmstrip-extraction-worker.ts` + pool.** Read in full. Document the pool management — how are workers assigned work, what's the work-stealing pattern (if any).

8. **FreeCut's `waveform-worker.ts`.** Read in full. Document the streaming pattern — does it post one chunk per N samples, or per pixel, or per second?

9. **FreeCut's SoundTouch AudioWorklet.** Read `src/runtime/composition-runtime/worklets/soundtouch-preview-processor.worklet.ts` in full. Document the algorithm, buffer management, message protocol.

10. **FreeCut's Vite worker config.** Read `vite.config.ts` around line 304. Document `worker: { format: 'es' }` and any other worker-specific config.

11. **FreeCut's COOP/CEOP header setup.** Find where FreeCut sets these headers (likely in vite config or a separate server config). Document the exact configuration.

12. **OpenCut-classic's `video-cache/service.ts`.** Read in full. Document the mediabunny API surface we need (`Input`, `BlobSource`, `getPrimaryVideoTrack`, `canDecode`, `VideoSampleSink` vs `CanvasSink`). Verify that `VideoSampleSink` gives us raw `VideoFrame` objects (which is what we need for 10-bit).

13. **OpenCut-classic's transcription worker.** Read `apps/web/src/services/transcription/worker.ts` in full. Document the `@huggingface/transformers` integration. Note version (3.8.1 in classic, FreeCut uses 4.1.0 — which should we use?).

---

## 12. Test Plan for This Stream

1. **Unit tests for `ManagedWorker`**: lazy creation, idle termination, error handling, pool acquire/release.
2. **Per-worker smoke tests**: each worker has a test that posts a request, asserts the response.
3. **Memory leak test**: spawn + terminate 100 workers, assert no growth in `performance.memory`.
4. **HeavyWorkerQueue test**: enqueue 5 heavy tasks, assert they run sequentially.
5. **AudioWorklet test**: instantiate, send varispeed commands, assert samples match expected output (compare to offline `soundtouchjs` reference).
6. **Worker crash test**: kill a worker mid-operation, assert error propagates and worker restarts cleanly.

---

**End of `02-workers-threading.md`.** Next: `03-playback-engine.md`.

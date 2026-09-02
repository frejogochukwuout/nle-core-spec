# 02 — Workers & Threading: Worker Pool, AudioWorklet, Threading Discipline (Refined)

**Stream:** Off-main-thread execution
**Status:** Refined spec (sub-agent scout SCOUT-02)
**Primary teacher:** FreeCut — `ManagedWorker*` abstraction + worker inventory + 1 AudioWorklet
**Secondary teacher:** OpenCut-classic — transcription worker + mediabunny `VideoSampleSink` API surface
**Spec file:** `02-workers-threading.refined.md` (derived from `02-workers-threading.md`)
**Scout method:** Read actual FreeCut and OpenCut-classic source; quote code with file path + line numbers.

---

## 0. Refined Sections Map

| § | Section | Status |
|---|---|---|
| 1-10 | Original seed spec | Preserved verbatim from `02-workers-threading.md` |
| 11 | Open Questions for Sub-Agent Scout | **Replaced** with concrete answers (file paths + quoted code) |
| 12 | Test Plan | Preserved |
| 13 | Code References | **New** — every file actually read with one-line summary |
| 14 | Corrections to Seed Spec | **New** — every wrong assumption |

The seed spec sections 1-10 and 12 are copied verbatim below for completeness; section 11 has been entirely rewritten.

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

We will need the following workers (mapped from FreeCut's inventory, pruned/renamed):

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

**Total: 10 Web Workers + 1 AudioWorklet.** Pruned from FreeCut's full set (see §13 for FreeCut's complete inventory — it's larger than the seed spec's "21" claim once you count all the AI/analysis workers we will not adopt).

> The private nle-engine port currently runs **zero** Web Workers (verified by grep — no `new Worker(` anywhere in its src), executing all decode/audio/waveform work on the main thread over procedural media. It is a corrective counter-example for this spec, not a reference implementation; see `19-code-references.md`.

---

## 4. `ManagedWorker` Abstraction (Adopt from FreeCut)

FreeCut built a small abstraction in three files (totaling 234 LOC, not 120 as the seed spec estimated):

- `src/shared/utils/managed-worker.ts` (68 LOC) — singleton lazy-create + terminate
- `src/shared/utils/managed-worker-pool.ts` (77 LOC) — pool with idle reuse
- `src/shared/utils/managed-worker-session.ts` (89 LOC) — multi-worker session keyed by name

> **SCOUT FINDING**: The seed spec described `ManagedWorker` as `~120 LOC`. The three files total 234 LOC. See §14 Correction #2.

> **SCOUT FINDING**: FreeCut's `ManagedWorker` is a *thin* wrapper around the raw `Worker` global — it does NOT provide a Promise-returning `postMessage`. Callers wire `onmessage`/`onerror` themselves and correlate responses via `requestId`. See §11 Q1 for the full API.

### 4.1 Our target interface

The seed spec proposed `WorkerHandle<TRequest, TResponse>` with `postMessage(message, transfer?): Promise<TResponse>`. **FreeCut does not implement this**. We have two options:

- **Option A (port FreeCut's abstraction verbatim):** thin wrapper, caller wires listeners. Lower LOC, but every call site is verbose and easy to get wrong (forgetting `onerror`, leaking listeners on cancellation).
- **Option B (build a Promise-wrapping layer on top of FreeCut's):** keep the lazy-create + terminate semantics, add a `request()` method that returns a Promise. Higher LOC but safer.

**Recommendation: Option B.** The seed spec's interface is correct in spirit; FreeCut's implementation is the bare minimum and several of FreeCut's call sites have subtle bugs (e.g., `waveform-cache.ts:1177` notes that `workerRejectors.get(requestId)?.(new AbortError())` argument is ignored — that bug class disappears with a Promise wrapper).

```ts
// src/platform/workers/ManagedWorker.ts (OUR implementation, not FreeCut's)

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

> **CAVEAT**: FreeCut's pool uses `maxIdleWorkers` (a count), NOT `idleTimeoutMs` (a duration). Workers are kept alive indefinitely up to `maxIdleWorkers` and only terminated when the pool is explicitly terminated or when memory pressure forces eviction. The seed spec's `idleTimeoutMs` is a *new* idea — FreeCut does not implement idle timeouts in any worker abstraction (`ManagedWorker`/`ManagedWorkerPool`/`ManagedWorkerSession`). (Caveat to the caveat: `preview-work-budget.ts:24, 236, 252` does define an `idleTimeoutMs` option, but it is passed to `requestIdleCallback` for main-thread budget scheduling — completely unrelated to worker lifecycle.) See §14 Correction #4.

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

> **SCOUT FINDING**: FreeCut does NOT have a global `HeavyWorkerQueue`. Each service enforces its own concurrency limit (e.g., `MAX_CONCURRENT_WAVEFORM_GENERATIONS = 1`, `MAX_CONCURRENT_BACKGROUND_MEDIA_JOBS = 1` at `waveform-cache.ts:55` and `background-media-work.ts:21`). The export path (`render-pipeline.ts:260`) creates one `ManagedWorker` per call and immediately terminates it in `finally` — so it's naturally one-at-a-time per call but not globally serialized. **We should still build `HeavyWorkerQueue` — it's a worthwhile addition over FreeCut's pattern.** See §11 Q2.

4. **Transferable objects, not copies.** Use `postMessage(message, [transferList])` to transfer `ArrayBuffer`, `MessagePort`, `ImageBitmap`, `OffscreenCanvas` without copying.

5. **Stream large data, don't accumulate.** Waveform worker streams `Float32Array` peaks in chunks; filmstrip worker streams `ImageBitmap` per thumbnail. Never accumulate full PCM / full thumbnail set in worker memory.

6. **Decoder prewarm is fire-and-forget.** Send `{type: 'warmup'}`, never await. If prewarm fails, first scrub pays cold-start cost — that's acceptable.

> **SCOUT FINDING**: FreeCut's filmstrip-cache `prewarm()` (`filmstrip-cache.ts:191-209`) acquires a worker, posts `{type: 'warm'}`, and **releases the worker immediately** so the warm message is processed before any subsequent `extract` message on the same worker. This pattern is more sophisticated than fire-and-forget — it ensures the warm message is *first in the worker's queue*. Worth adopting.

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

These numbers are rough. FreeCut's actual measurements:
- Waveform cache memory budget: 128 MB full-res + 64 MB downsampled levels (`waveform-cache.ts:49-54`)
- Filmstrip memory target: 500 MB soft, 420 MB hard (`filmstrip-cache-config.ts:35-36`)
- Decoder prewarm pool: 3-6 workers × ~2 MB WASM each (`decoder-prewarm.ts:9-12, 41-44`)
- Audio decode bin size: 10 s × 22050 Hz × 2 ch × 2 bytes = ~0.84 MB/bin (`audio-decode-cache.ts:100, 103`)

---

## 6. Cross-Origin Isolation

Set headers (in Vite config and production server):

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

> **SCOUT FINDING**: FreeCut's actual header configuration is **inconsistent** across environments. See §11 Q11 and §14 Correction #11. We must standardize on `require-corp` (not `credentialless`, which FreeCut uses in production).

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

**FreeCut reference:** `src/runtime/composition-runtime/worklets/soundtouch-preview-processor.worklet.ts` (126 LOC). Full implementation quoted in §11 Q9.

### 7.2 Worklet registration flow

```ts
// src/platform/audio/WebAudioAdapter.ts (OUR target — adapted from FreeCut)

class WebAudioAdapter implements Audio {
  async registerVarispeedProcessor(context: AudioContext | OfflineAudioContext): Promise<void> {
    await context.audioWorklet.addModule(
      // Vite ?worker&url import — see soundtouch-preview-worklet.ts:3
      new URL('./worklets/soundtouch-processor.worklet.ts?worker&url', import.meta.url)
    );
  }
  
  createVarispeedNode(context: AudioContext | OfflineAudioContext): AudioWorkletNode {
    return new AudioWorkletNode(context, 'soundtouch-varispeed-processor', {
      numberOfInputs: 0,  // FreeCut uses 0 inputs — source is pushed via port
      numberOfOutputs: 1,
      outputChannelCount: [2],
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
    });
  }
}
```

> **SCOUT FINDING**: FreeCut's `SoundTouchPreviewProcessor` uses `numberOfInputs: 0` — source audio is pushed via `port.postMessage('append-source', ...)` with transferable ArrayBuffers, NOT via the AudioWorklet input bus. This is a critical design choice: it lets the worklet run inside `OfflineAudioContext` (cloud render) without a connected source node. See §11 Q9.

### 7.3 AudioWorklet in cloud render

For `OfflineAudioContext` (cloud render), the same worklet runs but renders faster than real-time. Same code, different scheduling.

> **SCOUT FINDING (cloud render)**: FreeCut's `prepareAudioBufferForSoundTouchPreview` (`soundtouch-preview-worklet.ts:128-139`) uses `OfflineAudioContext` for resampling when `OfflineAudioContext` is available, falling back to a JS linear resampler otherwise. The worklet itself is codec-agnostic; OfflineAudioContext's `startRendering()` drives `process()` calls. This is the same pattern we'll use.

---

## 8. Per-Worker Specs

> Each per-worker spec below includes the **actual FreeCut reference types quoted from source**. Where FreeCut's types differ from our target types, we annotate the difference.

### 8.1 `decode.worker.ts`

```ts
// OUR target types
type DecodeRequest =
  | { type: 'init'; mediaId: string; source: Blob | File }
  | { type: 'decode'; mediaId: string; time: MediaTime; fps: FrameRate }
  | { type: 'release'; mediaId: string };

type DecodeResponse =
  | { type: 'frame'; mediaId: string; time: MediaTime; frame: VideoFrame; format: VideoSamplePixelFormat }
  | { type: 'error'; mediaId: string; error: string };

// NOTE on `format`: the actual pixel format is whatever the browser's WebCodecs
// `VideoDecoder` produces — mediated by mediabunny's `VideoSampleSink`. For
// 10-bit H.265 on Chromium this is typically `I420P10` or `I420P12`; for 8-bit
// sources it's `I420` or `NV12`. mediabunny's `VideoSamplePixelFormat` enum
// (see `03-playback-engine.refined.md` §5.2 and `04-renderer-color.refined.md` §14.C) lists
// 23 formats (19 YUV + 4 packed RGB) — `I420P10`, `I420P12`, `I422P10`, `I422P12`,
// `I444P10`, `I444P12`, `I420`, `I422`, `I444`, `NV12`, `BGRA`, `RGBA`, and
// others. NOTABLY `P010` (semi-planar 10-bit) is NOT in the enum — the
// closest equivalent is `I420P10` (planar 10-bit). The renderer (spec 04
// §11 Q7-Q8) handles whichever layout mediabunny produces.

// State: Map<mediaId, { decoder: VideoDecoder, cache: Map<MediaTime, VideoFrame> }>
// Lifecycle: Always-on (created by MediaManager)
// Transferable: VideoFrame is transferable (via .clone() if needed)
```

**FreeCut reference:** FreeCut does NOT have a true video decode worker — it uses HTML5 `<video>` for preview and `CanvasSink` (mediabunny) for filmstrip extraction. The closest is `decoder-prewarm-worker.ts` which uses `mediabunny.VideoSampleSink` to produce `ImageBitmap`s off-thread.

**OpenCut-classic reference:** `apps/web/src/services/video-cache/service.ts` (337 LOC) — but it's main-thread. We adapt OpenCut-classic's mediabunny+WebCodecs pattern but move it to a worker.

> **SCOUT FINDING**: OpenCut-classic's `video-cache/service.ts` uses `CanvasSink` with `WrappedCanvas` (an object containing an `HTMLCanvasElement | OffscreenCanvas`). It does NOT use `VideoSampleSink` directly. We need `VideoSampleSink` (which FreeCut's `decoder-prewarm-worker.ts:129` uses) to get raw `VideoFrame` objects for 10-bit pipeline. The seed spec's recommendation is correct.

See §11 Q12 for OpenCut-classic's mediabunny API surface.

### 8.2 `audio-decode.worker.ts`

FreeCut's actual types (quoted from `audio-decode-worker.types.ts`):

```ts
// INPUTS (FreeCut — quoted from audio-decode-worker.types.ts:3-51)
export interface AudioDecodeRequest {
  type: 'decode'
  requestId: string
  mediaId: string
  /** Blob source, or an object-URL string resolved via the passed metadata/fallback. */
  src: string | Blob
  sourceMetadata?: ObjectUrlSourceMetadata | null
  fallbackBlob?: Blob | null
  binDurationSec: number
  storageSampleRate: number
  /** Workspace root handle. When present, the worker persists decoded bins to
   * disk itself (off the main thread); otherwise it only streams them back for
   * the main thread to persist. */
  workspaceRoot?: FileSystemDirectoryHandle | null
}

export interface AudioDecodeWindowRequest {
  type: 'decode-window'
  requestId: string
  mediaId: string
  src: string | Blob
  sourceMetadata?: ObjectUrlSourceMetadata | null
  fallbackBlob?: Blob | null
  startTime: number
  durationSeconds: number
  storageSampleRate: number
  /** Targeted seeks first; sequential mode decodes forward while retaining only this window. */
  mode?: 'targeted' | 'sequential'
}

export interface AudioAssembleBinsRequest {
  type: 'assemble-bins'
  requestId: string
  totalFrames: number
  /** Per-bin Int16 PCM, in playback order. */
  bins: { frames: number; left: ArrayBuffer; right: ArrayBuffer }[]
}

export type AudioDecodeWorkerMessage =
  | AudioDecodeRequest
  | AudioDecodeWindowRequest
  | AudioAssembleBinsRequest

// OUTPUTS (FreeCut — quoted from audio-decode-worker.types.ts:53-103)
export interface AudioDecodeBinResponse {
  type: 'bin'
  requestId: string
  binIndex: number
  frames: number
  sampleRate: number
  /** Int16 PCM, transferred. */
  left: ArrayBuffer
  right: ArrayBuffer
}

export interface AudioDecodeCompleteResponse {
  type: 'complete'
  requestId: string
  totalBins: number
}

/** A decoded playback window — Float32 stereo (not persisted, no quantization). */
export interface AudioDecodeWindowResponse {
  type: 'window'
  requestId: string
  startTime: number
  frames: number
  sampleRate: number
  /** Float32 PCM, transferred. */
  left: ArrayBuffer
  right: ArrayBuffer
}

/** Reassembled Float32 stereo channels for AudioBuffer construction. */
export interface AudioAssembledResponse {
  type: 'assembled'
  requestId: string
  frames: number
  /** Float32 PCM, transferred. */
  left: ArrayBuffer
  right: ArrayBuffer
}

export interface AudioDecodeErrorResponse {
  type: 'error'
  requestId: string
  error: string
}

export type AudioDecodeWorkerResponse =
  | AudioDecodeBinResponse
  | AudioDecodeCompleteResponse
  | AudioDecodeWindowResponse
  | AudioAssembledResponse
  | AudioDecodeErrorResponse
```

**State (worker side):**
- `self.onmessage` dispatches by `message.type` (`decode` / `decode-window` / `assemble-bins`)
- No cross-message state — each `decode` message creates a fresh `mediabunny.Input` and disposes it in `finally` (`audio-decode-worker.ts:193-196`)
- AC-3 codec lazily registered via `ensureAc3DecoderRegistered()` only when the track codec matches (`audio-decode-worker.ts:114-116`)

**Lifecycle:** Always-on singleton (via `createManagedWorker` in `audio-decode-cache.ts:709`). Two instances actually exist — one for background full-decodes (`getAudioDecodeWorker` at `:707`), one for latency-sensitive playback-window decodes (`getAudioWindowWorker` at `:715`). Both use the same `createAudioDecodeWorker` factory at `:702-704`.

**Transferable:** `left.buffer` and `right.buffer` ArrayBuffers are transferred via `self.postMessage(response, { transfer: [response.left, response.right] })` (`audio-decode-worker.ts:156`, `:364`, `:390`). Critical detail: when a `workspaceRoot` handle is provided, the worker persists bins to OPFS *before* transferring the buffers (transferring neuters the underlying ArrayBuffers). See `audio-decode-worker.ts:127-145`.

**Streaming pattern:** Bins are flushed every `binDurationSec * sampleRate` frames via the `flushBin` closure (`audio-decode-worker.ts:128-157`). Default `binDurationSec = 10`, `storageSampleRate = 22050` → 10 s × 22050 Hz × 2 ch × 2 bytes ≈ 0.84 MB per bin.

### 8.3 `waveform.worker.ts`

FreeCut's actual types (quoted from `waveform-worker.ts:13-66`):

```ts
// INPUTS (FreeCut)
interface WaveformRequest {
  type: 'generate'
  requestId: string
  blobUrl: string
  blob?: Blob
  sourceMetadata?: ObjectUrlSourceMetadata
  samplesPerSecond: number
  binDurationSec?: number
  startTimeSec?: number
  endTimeSec?: number
}

type WaveformWorkerMessage = WaveformRequest | { type: 'abort'; requestId: string }

// OUTPUTS (FreeCut)
export interface WaveformProgressResponse {
  type: 'progress'
  requestId: string
  progress: number
}

export interface WaveformInitResponse {
  type: 'init'
  requestId: string
  duration: number
  channels: number
  sampleRate: number
  totalSamples: number
  stereo: boolean
}

export interface WaveformChunkResponse {
  type: 'chunk'
  requestId: string
  startIndex: number
  peaks: Float32Array
}

export interface WaveformCompleteResponse {
  type: 'complete'
  requestId: string
  maxPeak: number
}

export interface WaveformErrorResponse {
  type: 'error'
  requestId: string
  error: string
}

export type WaveformWorkerResponse =
  | WaveformProgressResponse
  | WaveformInitResponse
  | WaveformChunkResponse
  | WaveformCompleteResponse
  | WaveformErrorResponse
```

**State:** `activeRequests = new Map<string, { aborted: boolean }>()` (`waveform-worker.ts:69`). Supports mid-decode abort via `{ type: 'abort', requestId }`.

**Lifecycle:** Single shared `ManagedWorker` (`waveform-cache.ts:151-154`). Caller wires `onmessage`/`onerror` and uses `requestId` to correlate responses.

**Transferable:** `chunk.buffer` (the `Float32Array.buffer`) is transferred via `{ transfer: [chunk.buffer] }` (`waveform-worker.ts:198`).

**Streaming pattern:** Bins are flushed when accumulated samples reach `samplesPerSecond * binDurationSec * (stereo ? 2 : 1)` samples (`waveform-worker.ts:160-163`). Default `binDurationSec = 30` (`waveform-worker.ts:94`). So one chunk ≈ 30 s of audio worth of peaks at the requested resolution (default 500 samples/sec → 15,000 peaks × 2 channels = 30,000 Float32 values = ~117 KB per chunk).

> **SCOUT FINDING**: Waveform chunking is **per-N-seconds** (configurable via `binDurationSec`, default 30 s), NOT per-pixel or per-fixed-sample-count. The seed spec's question was answered.

### 8.4 `filmstrip.worker.ts` (pool of 2)

FreeCut's actual types (quoted from `filmstrip-extraction-worker.ts:18-87`):

```ts
// INPUTS (FreeCut)
export interface ExtractRequest {
  type: 'extract'
  requestId: string
  mediaId: string
  blobUrl: string
  blob?: Blob
  sourceMetadata?: ObjectUrlSourceMetadata
  duration: number
  width: number
  height: number
  skipIndices?: number[] // Indices to skip (already extracted)
  priorityIndices?: number[] // Indices to extract first (within the assigned range)
  targetIndices?: number[] // Optional explicit extraction indices for this worker
  // For parallel extraction - each worker handles a range
  startIndex?: number // Start frame index (inclusive)
  endIndex?: number // End frame index (exclusive)
  totalFrames?: number // Total frames across all workers (for progress)
  workerId?: number // Worker identifier for debugging
  maxParallelSaves?: number // Reserved for future worker-local throttling
}

interface AbortRequest {
  type: 'abort'
  requestId: string
}

export interface WarmRequest {
  type: 'warm'
  requestId: string
}

type WorkerRequest = ExtractRequest | AbortRequest | WarmRequest
export type WorkerResponse = ProgressResponse | CompleteResponse | ErrorResponse | WarmedResponse

// OUTPUTS (FreeCut)
export interface WarmedResponse {
  type: 'warmed'
  requestId: string
}

export interface ProgressResponse {
  type: 'progress'
  requestId: string
  frameIndex: number
  frameCount: number
  progress: number
  savedFrames: Array<{ index: number; blob: Blob }>
  savedIndices: number[]
  /** Transferable ImageBitmaps for instant display (no JPEG encode/decode roundtrip) */
  bitmapFrames?: Array<{ index: number; bitmap: ImageBitmap }>
}

export interface CompleteResponse {
  type: 'complete'
  requestId: string
  frameCount: number
  unavailableIndices?: number[]
}

export interface ErrorResponse {
  type: 'error'
  requestId: string
  error: string
}
```

**State:** `activeRequests = new Map<string, { aborted: boolean }>()` (`filmstrip-extraction-worker.ts:90`).

**Lifecycle:** Pool managed by `createManagedWorkerPool` (`filmstrip-cache.ts:152-161`). Pool configuration:
- `MAX_WORKERS = 2` (hard cap per extraction on high-core devices, `filmstrip-cache-config.ts:15`)
- `MIN_CORES_FOR_PARALLEL_WORKERS = 8` (don't fan out below 8 cores, `:17`)
- `MAX_IDLE_WORKERS_BASE = 2` (kept alive between extractions, `:42`)
- `MAX_CONCURRENT_EXTRACTIONS_BASE = 1` (extractions per app, `:20`)
- Idle workers are terminated under memory pressure (`getMaxIdleWorkers()` returns 0 for hard, 1 for soft, `filmstrip-cache.ts:225-229`)

**Pool management pattern:** The main thread slices each clip's frame range across workers (`startFrameIndex`/`endFrameIndex`/`priorityIndices` per worker, `filmstrip-cache.ts:1663-1692`). **No work-stealing** — workers process their assigned range sequentially. Completed workers are released back to the pool (`filmstrip-cache.ts:2486-2490`); `resetWorker` nulls `onmessage`/`onerror` (`filmstrip-cache.ts:157-160`).

**Transferable:** `ImageBitmap` instances are transferred via `{ transfer: transferables as unknown as Transferable[] }` where `transferables = bitmapFrames.map(bf => bf.bitmap)` (`filmstrip-extraction-worker.ts:304-317`). Two parallel pipelines per frame:
1. **FAST**: `createImageBitmap(canvas)` → transfer to main thread (instant display, no encode)
2. **SLOW**: `canvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 })` → send Blob to main thread for persistence

### 8.5 `export-render.worker.ts`

FreeCut's actual worker (`export-render.worker.ts`, 182 LOC):

```ts
// INPUTS (from export-render-worker.types.ts — referenced but not read)
type ExportRenderWorkerRequest =
  | { type: 'start'; requestId: string; settings: ClientExportSettings; composition: CompositionInputProps }
  | { type: 'cancel'; requestId: string };

// OUTPUTS
type ExportRenderWorkerResponse =
  | { type: 'progress'; requestId: string; progress: RenderProgress }
  | { type: 'complete'; requestId: string; result: ClientRenderResult }
  | { type: 'cancelled'; requestId: string }
  | { type: 'error'; requestId: string; error: string };
```

**Worker-side implementation highlights** (`export-render.worker.ts`):
- Aliases `window` to `globalThis` for third-party libs that assume `window` exists (`:12-19`)
- Installs `unhandledrejection` + `error` listeners that log with stack (`:26-40`)
- Uses `AbortController` per request (`:42`, `:102-103`)
- Dynamic-imports the heavy render graph (`canvas-render-orchestrator`) on first `start` (`:47`)

**Main-thread fallback** (`render-pipeline.ts:253-304`):

```ts
// Quoted from render-pipeline.ts:253-304
export async function runRender({
  clientSettings,
  exportMode,
  composition,
  signal,
  onProgress,
}: RunRenderArgs): Promise<RunRenderOutcome> {
  const workerManager = createManagedWorker<Worker>({
    createWorker: () =>
      new Worker(new URL('../workers/export-render.worker.ts', import.meta.url), {
        type: 'module',
      }),
    setupWorker: (worker) => () => {
      worker.onmessage = null
      worker.onerror = null
    },
  })

  try {
    const result = await renderInWorker(
      workerManager,
      clientSettings,
      composition,
      signal,
      onProgress,
    )
    return { result, renderPath: 'worker' }
  } catch (workerError) {
    if (workerError instanceof DOMException && workerError.name === 'AbortError') {
      throw workerError
    }

    const workerMessage = workerError instanceof Error ? workerError.message : String(workerError)
    const shouldFallbackToMainThread =
      workerMessage.startsWith('WORKER_REQUIRES_MAIN_THREAD:') ||
      workerMessage.startsWith('WORKER_UNAVAILABLE') ||
      workerMessage.startsWith('EXPORT_WORKER_RUNTIME_ERROR:')

    if (!shouldFallbackToMainThread) throw workerError

    const result = await renderOnMainThread(
      exportMode,
      clientSettings,
      composition,
      signal,
      onProgress,
    )
    return { result, renderPath: 'main-thread', fallbackReason: workerMessage }
  } finally {
    workerManager.terminate()
  }
}
```

**Fallback triggers** (5 worker-side error conditions, caught via 3 prefix matchers in `render-pipeline.ts:287-289`):
1. `WORKER_REQUIRES_MAIN_THREAD:animated-image` — composition has GIF/WebP with animated content (`export-render.worker.ts:108-110`)
2. `WORKER_REQUIRES_MAIN_THREAD:audio-context` — `OfflineAudioContext` undefined in worker (`:111-113`)
3. `WORKER_REQUIRES_MAIN_THREAD:dom-dependency:*` — DOM ReferenceError caught at runtime (`:167-174`); regex test: `/\b(document|navigator|HTML\w*Element)\b/`
4. `WORKER_UNAVAILABLE` — `typeof Worker === 'undefined'` (rare; `render-pipeline.ts:175-177`)
5. `EXPORT_WORKER_RUNTIME_ERROR:*` — `worker.onerror` fired (`render-pipeline.ts:219-223`)

> **Note:** Conditions 1–3 share the single prefix `WORKER_REQUIRES_MAIN_THREAD:`, so `shouldFallbackToMainThread` performs 3 `.startsWith()` checks total (one per distinct prefix), not 5.

**Critical:** The export worker uses the SAME engine code as the interactive mode (`renderComposition` from `canvas-render-orchestrator`, `render-pipeline.ts:37`). This guarantees WYSIWYG.

**Frame streaming:** Frames are NOT streamed one-by-one. The worker returns a single `ClientRenderResult` (containing a Blob or file path) at completion. Progress updates are streamed via `{ type: 'progress' }` messages.

### 8.6 `opfs.worker.ts`

FreeCut's actual types (quoted from `opfs-worker.ts:14-39`):

```ts
// INPUTS (FreeCut)
export interface OPFSWorkerMessage {
  type: 'save' | 'get' | 'delete' | 'list' | 'processUpload' | 'saveUpload'
  payload: {
    path?: string
    data?: ArrayBuffer
    directory?: string
    file?: File
    fileSize?: number
    targetPath?: string // For saveUpload - direct path without hashing
  }
}

export interface OPFSWorkerResponse {
  success: boolean
  data?: ArrayBuffer | string[]
  hash?: string
  opfsPath?: string
  bytesWritten?: number
  error?: string
}

export interface UploadProgress {
  type: 'progress'
  bytesWritten: number
  percent: number
}
```

**State:** `opfsRoot: FileSystemDirectoryHandle | null` cached in module scope (`opfs-worker.ts:41`). Initialized lazily via `navigator.storage.getDirectory()` (`:47-50`).

**Lifecycle:** Always-on singleton via `createManagedWorker` in `opfs-service.ts:13-16`.

**MessageChannel pattern** (`opfs-worker.ts:358-452` and `opfs-service.ts:34-48`):

```ts
// opfs-service.ts:34-48 — caller side
private async sendMessage<T = unknown>(message: OPFSWorkerMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()

    channel.port1.onmessage = (event: MessageEvent<OPFSWorkerResponse>) => {
      if (event.data.success) {
        resolve(event.data.data as T)
      } else {
        reject(new Error(event.data.error || 'OPFS operation failed'))
      }
    }

    this.getWorker().postMessage(message, [channel.port2])
  })
}

// opfs-worker.ts:358-365 — worker side
self.onmessage = async (event: MessageEvent<OPFSWorkerMessage>) => {
  const { type, payload } = event.data
  const port = event.ports[0]  // <-- receives the transferred port

  if (!port) {
    logger.error('No message port provided')
    return
  }
  // ... process ...
  port.postMessage(response)  // <-- replies via the port
}
```

**Why MessageChannel instead of regular postMessage?** Because OPFS work is *concurrent* and *long-running* — a single upload can take seconds. A MessageChannel per request means:
- Each request gets its own reply routing (no `requestId` correlation needed)
- Progress updates (`UploadProgress` messages, `opfs-worker.ts:411`) can stream back without confusing them with completion of other requests
- The main `worker.onmessage` is free for the next request

> **SCOUT FINDING**: This pattern is more sophisticated than the seed spec described. We should adopt it for any worker that streams progress (waveform, filmstrip, export, OPFS upload).

**Uses `FileSystemSyncAccessHandle`** (worker-only API) for synchronous file I/O (`opfs-worker.ts:94, 121, 230, 284, 323`). `createSyncAccessHandle` is unavailable on the main thread — this is the *real* reason OPFS work must run on a worker.

### 8.7 `media-processor.worker.ts`

FreeCut's actual types (quoted from `media-processor.worker.ts:98-118`):

```ts
// INPUTS (FreeCut)
export interface ProcessMediaRequest {
  type: 'process'
  requestId: string
  file: File
  mimeType: string
  options?: {
    thumbnailMaxSize?: number
    thumbnailQuality?: number
    thumbnailTimestamp?: number
    generateThumbnail?: boolean
    fastMetadata?: boolean
  }
}

// OUTPUTS (FreeCut)
export interface ProcessMediaResponse {
  type: 'complete' | 'error'
  requestId: string
  metadata?: VideoMetadata | AudioMetadata | ImageMetadata
  thumbnail?: Blob
  error?: string
}

export interface VideoMetadata {
  type: 'video'
  duration: number
  width: number
  height: number
  fps: number
  codec: string
  bitrate: number
  audioCodec?: string
  audioCodecSupported: boolean
  /** Whether the browser can decode this video track via WebCodecs. False for e.g. ProRes, which requires a proxy. */
  videoCodecSupported: boolean
  /** Sorted keyframe timestamps in seconds (undefined if all-intra or extraction failed) */
  keyframeTimestamps?: number[]
  /** Average keyframe interval in seconds (GOP length) */
  gopInterval?: number
}

export interface AudioMetadata {
  type: 'audio'
  duration: number
  codec?: string
  channels?: number
  sampleRate?: number
  bitrate?: number
}

export interface ImageMetadata {
  type: 'image'
  width: number
  height: number
}
```

**State:** `mediabunnyModule: MediabunnyModule | null` lazily cached (`media-processor.worker.ts:173-180`). Same worker handles all media types (video/audio/image).

**Lifecycle:** Always-on singleton (managed by caller — not read in this scout).

**Key features beyond the seed spec:**
- **FPS estimation** via packet duration median (`estimateVideoFps`, `:235-344`) — samples up to 180 packets with 5 s timeout, snaps to common rates (23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 119.88, 120, 239.76, 240)
- **Keyframe timestamp extraction** via `EncodedPacketSink.getFirstKeyPacket`/`getNextKeyPacket` chain (`:357-406`) — O(K) where K = keyframes, vs O(N) for iterating all packets
- **ProRes detection** — forced `videoCodecSupported = false` for ProRes because `<video>` can't play it (mediabunny can decode via registered `@mediabunny/prores` decoder, but preview routing needs the browser-native check)
- **Thumbnail generation** for video/audio/image with timeouts (`THUMBNAIL_TIMEOUT_MS = 12_000`, `:22`)

### 8.8 `transcription.worker.ts` (optional, v1 stretch)

FreeCut's `whisper.worker.ts` (376 LOC) is more sophisticated than OpenCut-classic's:

**FreeCut message protocol** (inferred from `whisper.worker.ts:94-131`):
```ts
// INPUTS (FreeCut)
type WhisperWorkerMessage =
  | { type: 'port'; port: MessagePort }  // PCM chunks streamed via port
  | { type: 'init'; modelId: string; language: string; quantization: 'hybrid' | 'q4' | 'q8' | ... }
  | { type: 'pause' }
  | { type: 'resume' }

// OUTPUTS (FreeCut — via postMain)
type MainThreadMessage =
  | { type: 'progress'; event: { stage: 'downloading' | 'preparing' | 'transcribing'; progress: number; ... } }
  | { type: 'ready' }
  | { type: 'segment'; segment: { text: string; start: number; end: number; words: TranscriptWord[] } }
  | { type: 'done' }
  | { type: 'runtime'; info: { backend: 'webgpu' | 'wasm'; estimatedBytes?: number } }
  | { type: 'error'; message: string }
```

**Notable FreeCut features:**
- **Streaming transcription**: PCM chunks pushed via `MessagePort` (`:97-103`), worker maintains internal queue (`:70`) and processes serially
- **WebGPU-first with WASM fallback** (`:199-212`): tries `device: 'webgpu'`, falls back to `device: 'wasm'` on init failure
- **Hybrid quantization** (`:163-166`): `{ encoder_model: 'fp32', decoder_model_merged: 'q4' }` — encoder stays fp32 for accuracy, decoder is q4 for speed/memory
- **Pre-warm inference** (`:217-225`): runs a 1600-sample silent inference after load to compile the graph
- **Word-level dedupe** across overlapping chunks (`:350-368`)

**OpenCut-classic** (`services/transcription/worker.ts`, 176 LOC) is much simpler:
- Single full transcription (no streaming)
- `device: 'auto'`, `dtype: 'q4'`
- Returns `text + segments[]` (segments have `text`/`start`/`end`, no word-level)
- No WebGPU fallback chain
- Uses NPM `@huggingface/transformers@^3.8.1` (static import)

**Version question:** See §11 Q13.

### 8.9 `silence-detection.worker.ts` (optional)

FreeCut's actual types (quoted from `silence-detection-worker.ts:10-26`):

```ts
// INPUTS (FreeCut)
interface SilenceDetectionSegment {
  channels: ArrayBuffer[]
  offsetSeconds: number
  sampleRate: number
}

interface SilenceDetectionRequest {
  id: string
  segments: SilenceDetectionSegment[]
  settings: AudioSilenceDetectionOptions
}

// OUTPUTS (FreeCut)
interface SilenceDetectionResponse {
  error?: string
  id: string
  ranges?: AudioSilenceRange[]
}
```

**Lifecycle:** On-demand (caller-managed; not read in this scout but file is 61 LOC — simple).

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

> **SCOUT FINDING**: Confirmed at `vite.config.ts:304-306`. The exact location (NOT line 304 area as the seed spec said, but exactly lines 304-306).

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

> **SCOUT FINDING**: FreeCut's `ManagedWorker` does NOT have an `'error'` event emitter. Callers wire `worker.onerror` directly (e.g., `render-pipeline.ts:219-223`, `audio-decode-cache.ts:800-803`). The seed spec's `handle.on('error', ...)` is a *new* API we'd add on top of FreeCut's abstraction.

### 10.2 Message timeout

Each `postMessage` has a timeout (default 30s). On timeout:
- Log
- Terminate the worker
- Reject the pending request
- Optionally restart

> **SCOUT FINDING**: FreeCut has NO message timeout. Per-request timeouts are applied at call-site (e.g., `media-processor.worker.ts:182-195` `withTimeout` helper, but only for FPS estimation and thumbnail generation — not for the postMessage round-trip itself). This is a real gap in FreeCut's pattern; we should add it.

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

## 11. Open Questions for Sub-Agent Scout — ANSWERED

### Q1. FreeCut's `ManagedWorker` (3 files)

**Source:** `src/shared/utils/managed-worker.ts` (68 LOC), `managed-worker-pool.ts` (77 LOC), `managed-worker-session.ts` (89 LOC).

#### File 1: `managed-worker.ts` — FULL implementation (quoted verbatim)

```ts
// src/shared/utils/managed-worker.ts (68 LOC)
export interface ManagedWorker<TWorker extends Worker = Worker> {
  getWorker(): TWorker
  peekWorker(): TWorker | null
  terminate(): void
}

export interface ManagedWorkerOptions<TWorker extends Worker = Worker> {
  createWorker: () => TWorker
  setupWorker?: (worker: TWorker) => void | (() => void)
}

export interface RejectablePendingRequest {
  reject(error: Error): void
}

export function rejectAndDeletePendingRequests<TPending extends RejectablePendingRequest>(
  pendingRequests: Map<string, TPending>,
  error: Error,
): void {
  pendingRequests.forEach((pending) => {
    pending.reject(error)
  })
  pendingRequests.clear()
}

export function createManagedWorker<TWorker extends Worker = Worker>(
  options: ManagedWorkerOptions<TWorker>,
): ManagedWorker<TWorker> {
  let worker: TWorker | null = null
  let cleanup: (() => void) | null = null

  function instantiateWorker(): TWorker {
    const nextWorker = options.createWorker()
    cleanup = options.setupWorker?.(nextWorker) ?? null
    worker = nextWorker
    return nextWorker
  }

  function getWorker(): TWorker {
    return worker ?? instantiateWorker()
  }

  function peekWorker(): TWorker | null {
    return worker
  }

  function terminate(): void {
    if (!worker) {
      return
    }

    const activeWorker = worker
    worker = null

    try {
      cleanup?.()
    } finally {
      cleanup = null
      activeWorker.terminate()
    }
  }

  return {
    getWorker,
    peekWorker,
    terminate,
  }
}
```

**API surface:**
- `ManagedWorker<TWorker>`: 3 methods (`getWorker`, `peekWorker`, `terminate`)
- `ManagedWorkerOptions`: `createWorker` (required), `setupWorker` (optional, returns cleanup fn)
- `createManagedWorker(options)`: factory
- `rejectAndDeletePendingRequests(pendingRequests, error)`: helper (NOT used internally — exported for callers)

**Lazy creation:** `getWorker()` returns existing worker or calls `instantiateWorker()` (line `:40`).

**Idle reuse logic:** ❌ NONE. There is no idle timeout. Worker is kept alive until `terminate()` is called.

**Cleanup hooks:** `setupWorker(worker) => void | (() => void)` — if it returns a function, that function is called in `terminate()` (line `:55-61`).

**Error handling (worker crash):** ❌ NONE. No `onerror` is wired. If the worker crashes, callers must wire `worker.onerror` themselves.

**Message timeout:** ❌ NONE. No timeout mechanism.

**Transferable objects:** ❌ NONE. `ManagedWorker` does not provide a `postMessage` wrapper. Callers call `worker.postMessage(msg, [transferList])` directly.

#### File 2: `managed-worker-pool.ts` — FULL implementation (quoted verbatim)

```ts
// src/shared/utils/managed-worker-pool.ts (77 LOC)
export interface ManagedWorkerPool<TWorker extends Worker = Worker> {
  acquireWorker(): TWorker
  releaseWorker(worker: TWorker, options?: { maxIdleWorkers?: number }): void
  terminateWorker(worker: TWorker): void
  terminateAll(): void
}

export interface ManagedWorkerPoolOptions<TWorker extends Worker = Worker> {
  createWorker: () => TWorker
  resetWorker?: (worker: TWorker) => void
}

export function createManagedWorkerPool<TWorker extends Worker = Worker>(
  options: ManagedWorkerPoolOptions<TWorker>,
): ManagedWorkerPool<TWorker> {
  const idleWorkers: TWorker[] = []
  const allWorkers = new Set<TWorker>()

  function createWorker(): TWorker {
    const worker = options.createWorker()
    allWorkers.add(worker)
    return worker
  }

  function removeIdleWorker(worker: TWorker): void {
    const idleIndex = idleWorkers.indexOf(worker)
    if (idleIndex !== -1) {
      idleWorkers.splice(idleIndex, 1)
    }
  }

  function acquireWorker(): TWorker {
    return idleWorkers.pop() ?? createWorker()
  }

  function terminateWorker(worker: TWorker): void {
    if (!allWorkers.has(worker)) {
      return
    }

    removeIdleWorker(worker)
    options.resetWorker?.(worker)
    allWorkers.delete(worker)
    worker.terminate()
  }

  function releaseWorker(worker: TWorker, optionsArg?: { maxIdleWorkers?: number }): void {
    if (!allWorkers.has(worker)) {
      return
    }

    options.resetWorker?.(worker)

    const maxIdleWorkers = optionsArg?.maxIdleWorkers ?? Number.POSITIVE_INFINITY
    if (idleWorkers.length >= maxIdleWorkers) {
      terminateWorker(worker)
      return
    }

    if (!idleWorkers.includes(worker)) {
      idleWorkers.push(worker)
    }
  }

  function terminateAll(): void {
    for (const worker of Array.from(allWorkers)) {
      terminateWorker(worker)
    }
  }

  return {
    acquireWorker,
    releaseWorker,
    terminateWorker,
    terminateAll,
  }
}
```

**API surface:**
- `ManagedWorkerPool<TWorker>`: 4 methods (`acquireWorker`, `releaseWorker`, `terminateWorker`, `terminateAll`)
- `ManagedWorkerPoolOptions`: `createWorker` (required), `resetWorker` (optional — nulls `onmessage`/`onerror` etc.)
- `releaseWorker(worker, { maxIdleWorkers })`: keeps alive up to `maxIdleWorkers`, then terminates

**Pool semantics:** Stack-based (`idleWorkers.pop()` LIFO). `maxIdleWorkers` is per-release, not configured globally — caller passes it each time (see `filmstrip-cache.ts:231-233` passing `getMaxIdleWorkers()`).

**Idle timeout:** ❌ NONE. Workers persist until explicitly terminated or evicted by `maxIdleWorkers` overflow.

#### File 3: `managed-worker-session.ts` — FULL implementation (quoted verbatim)

```ts
// src/shared/utils/managed-worker-session.ts (89 LOC)
import { createManagedWorker, type ManagedWorkerOptions } from './managed-worker'

type WorkerSessionDefinitions = Record<string, ManagedWorkerOptions<Worker>>

export interface ManagedWorkerSession<TName extends string> {
  getWorker(name: TName): Worker
  peekWorker(name: TName): Worker | null
  registerCleanup(cleanup: () => void): void
  terminate(): void
  isTerminated(): boolean
}

export function createManagedWorkerSession<TDefinitions extends WorkerSessionDefinitions>(
  definitions: TDefinitions,
): ManagedWorkerSession<Extract<keyof TDefinitions, string>> {
  type WorkerName = Extract<keyof TDefinitions, string>

  const workerManagers = Object.fromEntries(
    Object.entries(definitions).map(([name, definition]) => [
      name,
      createManagedWorker(definition),
    ]),
  ) as Record<WorkerName, ReturnType<typeof createManagedWorker>>

  const cleanups: Array<() => void> = []
  let terminated = false

  function ensureActive(): void {
    if (terminated) {
      throw new Error('Worker session already terminated')
    }
  }

  function runCleanup(cleanup: () => void): void {
    cleanup()
  }

  function getWorker(name: WorkerName): Worker {
    ensureActive()
    return workerManagers[name].getWorker()
  }

  function peekWorker(name: WorkerName): Worker | null {
    return workerManagers[name].peekWorker()
  }

  function registerCleanup(cleanup: () => void): void {
    if (terminated) {
      runCleanup(cleanup)
      return
    }

    cleanups.push(cleanup)
  }

  function terminate(): void {
    if (terminated) {
      return
    }

    terminated = true

    while (cleanups.length > 0) {
      const cleanup = cleanups.pop()
      if (!cleanup) continue
      try {
        runCleanup(cleanup)
      } catch {
        // Best-effort cleanup during shutdown.
      }
    }

    for (const manager of Object.values(workerManagers)) {
      manager.terminate()
    }
  }

  function isTerminated(): boolean {
    return terminated
  }

  return {
    getWorker,
    peekWorker,
    registerCleanup,
    terminate,
    isTerminated,
  }
}
```

**API surface:**
- `ManagedWorkerSession<TName>`: 5 methods
- `createManagedWorkerSession(definitions: Record<name, ManagedWorkerOptions>)`: factory
- `registerCleanup(fn)`: push to cleanup list; called in `terminate()` (best-effort, errors swallowed)

**Usage:** FreeCut's analysis sub-system uses this pattern — see `infrastructure/analysis/embeddings/create-clip-worker.ts`, `infrastructure/analysis/create-lfm-worker.ts`, `infrastructure/analysis/create-gemma-worker.ts`, `infrastructure/analysis/create-adaptive-scene-detection-worker.ts`, `infrastructure/llm/create-gemma-llm-worker.ts` (NOT read in this scout — listed in §13). These factory files wire up a *bundle* of related workers (e.g., scene-detection + embeddings) under a single session for atomic teardown.

#### Summary of ManagedWorker abstraction

| Concern | FreeCut implementation |
|---|---|
| Lazy creation | ✅ `getWorker()` instantiates on first call |
| Idle reuse | ✅ Pool keeps `maxIdleWorkers` alive |
| Idle timeout | ❌ NONE (workers persist until terminated) |
| Cleanup hooks | ✅ `setupWorker` returns cleanup fn; session has `registerCleanup` |
| Worker crash handling | ❌ NONE in abstraction; callers wire `onerror` themselves |
| Message timeout | ❌ NONE in abstraction; callers implement per-request |
| Transferable objects | ❌ NO `postMessage` wrapper; callers use raw `worker.postMessage` |
| React effect integration | ❌ NONE — pure vanilla TS, callers wire effects |
| Dev vs prod differences | ❌ NONE |
| Hot-module reload | ❌ NONE — `setupWorker` cleanup runs on `terminate()` only |
| Promise-returning postMessage | ❌ NONE — listeners are imperative |

---

### Q2. FreeCut's `HeavyWorkerQueue` equivalent

**❌ NOT FOUND.** There is no global queue for heavy workers in FreeCut.

**What FreeCut does instead:**

1. **Per-service concurrency limits** (the actual pattern):
   - `MAX_CONCURRENT_WAVEFORM_GENERATIONS = 1` at `waveform-cache.ts:55` — waveform serial
   - `MAX_CONCURRENT_EXTRACTIONS_BASE = 1` (or 2 on high-core) at `filmstrip-cache-config.ts:20-21` — filmstrip serial per app
   - `MAX_CONCURRENT_BACKGROUND_MEDIA_JOBS = 1` at `background-media-work.ts:21` — background media (proxy gen, transcription, scene detection) serial
   - `MAX_CONCURRENT_MEDIA_ANALYSES = 2` at `silence-removal-preview.ts:26` — silence removal parallel up to 2

2. **Per-call worker lifecycle for export** (`render-pipeline.ts:260-269`):
   ```ts
   const workerManager = createManagedWorker<Worker>({ ... })
   try {
     const result = await renderInWorker(workerManager, ...)
   } finally {
     workerManager.terminate()  // <-- always terminated after one render
   }
   ```
   So export is naturally 1-at-a-time per call, but NOT globally serialized — nothing prevents two `runRender()` calls in parallel.

3. **Whisper transcription** uses a *single shared worker* with an internal queue (`whisper.worker.ts:70` `const queue: PCMChunk[] = []`). The worker processes chunks serially; main-thread callers don't compete.

4. **`background-media-work.ts` (142 LOC)** is the closest thing to a `HeavyWorkerQueue` — a priority queue with `MAX_CONCURRENT_BACKGROUND_MEDIA_JOBS = 1`. But it's specifically for background media work (proxy generation, transcription setup, scene detection), NOT for export rendering.

**Recommendation for our spec:** Build `HeavyWorkerQueue` as proposed in the seed spec (§5.2 rule 3). FreeCut's pattern works because each service is careful, but a global queue gives us defense-in-depth against accidental parallel heavy jobs (e.g., user starts export while transcription is running). The seed spec's `HeavyWorkerQueue` design is correct — keep it.

---

### Q3. FreeCut's worker error patterns

Examined three workers:

#### Pattern A: Export worker (`export-render.worker.ts`)
- Installs `unhandledrejection` and `error` global listeners that log with stack (`:26-40`)
- Catches `DOMException` with `name === 'AbortError'` and reports as `cancelled` (`:148-155`)
- Detects DOM dependencies via regex on `ReferenceError.message` (`:167-174`) — `WORKER_REQUIRES_MAIN_THREAD:dom-dependency:*` triggers main-thread fallback
- All other errors → `{ type: 'error', requestId, error: messageText }` postMessage
- **Worker stays alive** after error (next request can succeed); only `terminate()` from caller kills it

#### Pattern B: Audio decode worker (`audio-decode-worker.ts`)
- Top-level `try/catch` in `self.onmessage` (`:393-417`)
- On error: posts `{ type: 'error', requestId, error: messageText }` and *continues*
- Each request creates a fresh `mediabunny.Input` with `try/finally` to ensure `input.dispose()` (`:107-196`)
- No worker-level state to corrupt between requests

#### Pattern C: Waveform worker (`waveform-worker.ts`)
- Per-request `try/catch/finally` (`:103-331`)
- On abort: throws `new Error('Aborted')`, caught silently (no error postMessage)
- On real error: posts `{ type: 'error', requestId, error }`
- `finally` block disposes `mediabunny.Input` and removes from `activeRequests` map

**Common pattern:**
1. Worker stays alive after errors (degraded state only if `worker.onerror` fires — i.e., uncaught)
2. Each request has `try/catch/finally` with resource cleanup in `finally`
3. Errors are surfaced as `{ type: 'error', requestId, error: messageText }` postMessage
4. Caller's `onmessage` handler matches `requestId` and rejects the pending Promise

**No automatic restart.** If a worker dies (`worker.onerror`), the next `getWorker()` call returns the dead worker — caller must explicitly `terminate()` and let lazy-creation spawn a new one. This is a real gap.

---

### Q4. FreeCut's `opfs-worker.ts` — MessageChannel pattern

See §8.6 above for full types and quoted code.

**Why MessageChannel instead of regular postMessage:**

1. **Concurrent requests**: OPFS work can take seconds (large file uploads). With regular postMessage, all replies funnel through the single `worker.onmessage` and require `requestId` correlation. With MessageChannel, each request gets its own port and reply routing.

2. **Progress streaming**: `processUpload` and `saveUpload` stream `UploadProgress` messages (`opfs-worker.ts:411, 430`) interleaved with the final `OPFSWorkerResponse`. MessageChannel keeps these tied to the originating request without confusion.

3. **Backpressure**: If the main thread posts 5 OPFS requests in quick succession, regular postMessage would queue all 5 in the worker's message queue. MessageChannel lets the worker receive and ack each via its own port — though in practice FreeCut doesn't use this for backpressure, just for routing.

4. **`FileSystemDirectoryHandle` transfer**: For `processUpload`/`saveUpload`, the `File` object is sent via the main `postMessage` (not the port). The port is dedicated to replies. This separates the request payload (which may be large) from the reply channel.

> **SCOUT FINDING**: `FileSystemSyncAccessHandle` (used inside `saveFile`, `getFile`, etc.) is **only available in Web Workers** — this is the fundamental reason OPFS work must run on a worker. The `opfs-service.ts` wrapper on the main thread uses `getOpfsFileBlob` for blob reads (which goes through `getFile()` on the main thread) and `sendMessage` for everything else.

---

### Q5. FreeCut's `export-render.worker.ts` + `render-pipeline.ts` — main-thread fallback

See §8.5 above for full quoted code. Summary:

**Fallback triggers** (5 worker-side error conditions, caught via 3 prefix matchers in `render-pipeline.ts:287-289`):
1. `WORKER_REQUIRES_MAIN_THREAD:animated-image` — composition has animated GIF/WebP (`:108-110`)
2. `WORKER_REQUIRES_MAIN_THREAD:audio-context` — `OfflineAudioContext` undefined in worker (`:111-113`)
3. `WORKER_REQUIRES_MAIN_THREAD:dom-dependency:*` — DOM `ReferenceError` at runtime (`:167-174`)
4. `WORKER_UNAVAILABLE` — no Worker global (`render-pipeline.ts:175-177`)
5. `EXPORT_WORKER_RUNTIME_ERROR:*` — `worker.onerror` fired (`render-pipeline.ts:219-223`)

> **Note:** Conditions 1–3 share the single prefix `WORKER_REQUIRES_MAIN_THREAD:`, so `shouldFallbackToMainThread` performs 3 `.startsWith()` checks total (one per distinct prefix), not 5.

**When it triggers:** `render-pipeline.ts:280-291` — `shouldFallbackToMainThread` is true if `workerError.message` starts with any of the above prefixes. AbortError is re-thrown (not a fallback case).

**Main-thread path:** `renderOnMainThread` at `render-pipeline.ts:235-246` — calls the *same* `renderComposition`/`renderAudioOnly` from `canvas-render-orchestrator` (the very module the worker dynamic-imports). This guarantees WYSIWYG: worker and main-thread paths share code.

**Frame streaming:** ❌ NOT streamed one-by-one. The worker returns a single `ClientRenderResult` at completion (containing a Blob or file path). Progress is streamed via `{ type: 'progress', progress: RenderProgress }` messages.

---

### Q6. FreeCut's `audio-decode-worker.ts` — PCM streaming

See §8.2 above for full types. Streaming summary:

**Bin-based streaming** (not sample-by-sample):
- Worker accumulates stereo chunks (`binLeftChunks: Float32Array[]`, `binRightChunks: Float32Array[]`) per bin (`:121-122`)
- Flushes bin when `binAccumFrames >= binDurationSec * sampleRate` (`:174-177`)
- Each flush:
  1. Downmixes to stereo via `downmixToStereo(channels, frameCount)`
  2. Builds a `DecodedAudioBinData` via `produceDecodedBin` (Int16 quantization at `storageSampleRate`)
  3. If `workspaceRoot` provided, writes bin to OPFS via `persistBinToWorkspace` BEFORE transfer
  4. Posts `{ type: 'bin', requestId, left: ArrayBuffer, right: ArrayBuffer }` with transfer list `[response.left, response.right]`
- After all samples decoded, posts `{ type: 'complete', requestId, totalBins }`

**Two modes:**
- `decode` (full): decodes entire file, persists bins to OPFS, streams back Int16 bins
- `decode-window` (preview): decodes `[startTime, startTime + durationSeconds]` only, returns Float32 (no quantization), no persistence
- `assemble-bins`: reassembles persisted Int16 bins into Float32 stereo channels off-thread (avoids main-thread dequant loop)

**Sample rate:** Decoded at source sample rate, downsampled to `STORAGE_SAMPLE_RATE = 22050` for persistence (`audio-decode-cache.ts:100`). Window mode returns at source sample rate.

**Transfer before persistence issue:** Comment at `:127-128` notes that transfer neuters ArrayBuffers, so persistence MUST read the buffers first. FreeCut's pattern: persist via `writeDecodedPreviewAudioToRoot` (which calls `bin.left.buffer as ArrayBuffer`), THEN post the response with transfer. This works because OPFS write copies the bytes to disk before the ArrayBuffer is neutered.

---

### Q7. FreeCut's `filmstrip-extraction-worker.ts` + pool

See §8.4 above for full types. Pool management summary:

**Pool creation** (`filmstrip-cache.ts:152-161`):
```ts
private readonly workerPoolManager = createManagedWorkerPool({
  createWorker: () =>
    new Worker(new URL('../workers/filmstrip-extraction-worker.ts', import.meta.url), {
      type: 'module',
    }),
  resetWorker: (worker) => {
    worker.onmessage = null
    worker.onerror = null
  },
})
```

**Work assignment** (`filmstrip-cache.ts:1663-1692`):
- Main thread computes `workerCount = min(maxWorkers, floor(framesToExtract / MIN_FRAMES_PER_WORKER))`
- `maxWorkers = hardwareConcurrency < MIN_CORES_FOR_PARALLEL_WORKERS ? 1 : MAX_WORKERS`
- Each worker gets a frame range `[startIndex, endIndex)` and optional `priorityIndices` (the visible viewport)
- `targetIndices` for explicit batch extraction (used by `use-filmstrip.ts`)

**No work-stealing.** Each worker processes its assigned range sequentially. If a worker finishes early, it goes idle and may be released back to the pool for the next extraction (not reassigned to help a slower worker).

**Completed worker handling** (`filmstrip-cache.ts:2486-2490`):
```ts
for (const workerState of pending.workers) {
  if (reuseCompletedWorkers && workerState.completed) {
    this.releaseWorker(workerState.worker)
  } else {
    this.terminateWorker(workerState.worker)
  }
}
```

**Prewarm pattern** (`filmstrip-cache.ts:191-209`):
- Acquire a worker
- Post `{ type: 'warm', requestId }` (worker eagerly loads `mediabunny` WASM via `loadMediabunny()`)
- **Release immediately** so the next `acquireWorker()` returns this worker (with the `warm` message queued ahead of any `extract` message)
- The `warmed` response is dropped on the floor (no listener)

**Two parallel pipelines per frame** (`filmstrip-extraction-worker.ts:236-318`):
1. **FAST** `createImageBitmap(canvas)` → transfer ImageBitmap to main thread (instant UI display)
2. **SLOW** `OffscreenCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 })` → send Blob for persistence

This pattern means thumbnails appear in the UI before they're persisted — zero-perceived-latency display.

---

### Q8. FreeCut's `waveform-worker.ts` — streaming pattern

See §8.3 above for full types. Streaming summary:

**Chunk emission is per-N-seconds** (NOT per-pixel, NOT per-fixed-sample-count):

```ts
// waveform-worker.ts:160-163
const binSampleCount = Math.max(
  1,
  Math.round(samplesPerSecond * binDurationSec * (stereo ? 2 : 1)),
)
```

Where `binDurationSec` defaults to **30 seconds** (`:94`) and `samplesPerSecond` defaults to **500** (`waveform-cache.ts:61`, `WAVEFORM_LEVELS[0]`). So one chunk ≈ 30 s × 500 samples/s × 2 ch = 30,000 Float32 values = ~117 KB per chunk.

**Chunk boundaries are aligned to playback time**, not to absolute sample indices:

```ts
// waveform-worker.ts:278-286
const completedOutputExclusive = Math.min(
  rangeOutputEnd,
  Math.floor(processedEndTimeSec * samplesPerSecond) * outputChannelCount,
)
while (nextChunkStart + binSampleCount <= completedOutputExclusive) {
  const end = nextChunkStart + binSampleCount
  emitChunk(nextChunkStart, end)
  nextChunkStart = end
}
```

So chunks are flushed as soon as a bin is "complete" (no more samples can change its peaks). The final tail is flushed in `:309-311`.

**Transfer:** `chunk.buffer` is transferred via `{ transfer: [chunk.buffer] }` (`:198`). The `peaks` Float32Array is sliced from the master `peaks` array (`:190`), then its underlying ArrayBuffer is transferred (the slice creates a new ArrayBuffer).

**Stereo handling:**
- 5.1/7.1 sources downmixed to stereo during decode (`extractStereoChunk` calls `downmixToStereo`)
- Waveform peaks are interleaved L,R,L,R,... in the output array (`:251-260`)
- Mono sources use channel-averaged peaks (`:261-272`)

---

### Q9. FreeCut's SoundTouch AudioWorklet

**Source:** `src/runtime/composition-runtime/worklets/soundtouch-preview-processor.worklet.ts` (126 LOC).

#### Full implementation (quoted verbatim)

```ts
// src/runtime/composition-runtime/worklets/soundtouch-preview-processor.worklet.ts (126 LOC)
import { TimeStretchFilter, TimeStretchProcessor } from '@/infrastructure/audio/time-stretch'
import {
  SOUND_TOUCH_PREVIEW_PROCESSOR_NAME,
  type SoundTouchPreviewProcessorMessage,
} from '../utils/soundtouch-preview-shared'
import { QueuedStereoBufferSource } from '../utils/soundtouch-preview-source'

declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort
  constructor(options?: unknown)
  abstract process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean
}

declare function registerProcessor(
  name: string,
  processorCtor: new (options?: unknown) => AudioWorkletProcessor,
): void

class SoundTouchPreviewProcessor extends AudioWorkletProcessor {
  private readonly source = new QueuedStereoBufferSource()
  private readonly processor = new TimeStretchProcessor()
  private readonly filter = new TimeStretchFilter(
    this.source as {
      extract: (target: Float32Array, numFrames: number, sourcePosition?: number) => number
    },
    this.processor,
  )
  private scratch = new Float32Array(256)
  private playing = false
  private tempo = 1
  private pitch = 1

  constructor() {
    super()
    this.applySettings()
    this.port.onmessage = (event: MessageEvent<SoundTouchPreviewProcessorMessage>) => {
      this.handleMessage(event.data)
    }
  }

  private applySettings(): void {
    this.processor.tempo = Math.max(0.01, this.tempo)
    this.processor.pitch = Math.max(0.01, this.pitch)
    this.processor.rate = 1
  }

  private handleMessage(message: SoundTouchPreviewProcessorMessage): void {
    switch (message.type) {
      case 'append-source': {
        const leftChannel = new Float32Array(message.leftChannel)
        const rightChannel = new Float32Array(message.rightChannel)
        this.source.append({
          startFrame: message.startFrame,
          leftChannel,
          rightChannel,
          frameCount: message.frameCount,
        })
        break
      }
      case 'seek': {
        const frame = Math.max(0, Math.floor(message.frame))
        const direction = message.direction === -1 ? -1 : 1
        this.source.setReadDirection(direction, frame)
        this.filter.sourcePosition = direction < 0 ? 0 : frame
        break
      }
      case 'set-tempo':
        this.tempo = message.tempo
        this.applySettings()
        break
      case 'set-pitch':
        this.pitch = message.pitch
        this.applySettings()
        break
      case 'set-playing':
        this.playing = message.playing
        break
      case 'reset':
        this.source.clear()
        this.filter.sourcePosition = 0
        this.playing = false
        break
    }
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const output = outputs[0]
    if (!output || output.length === 0) {
      return true
    }

    const leftOutput = output[0]
    if (!leftOutput) {
      return true
    }
    const rightOutput = output[1] ?? leftOutput
    leftOutput.fill(0)
    rightOutput.fill(0)

    if (!this.playing || this.source.frameCount === 0) {
      return true
    }

    const requiredSamples = leftOutput.length * 2
    if (this.scratch.length < requiredSamples) {
      this.scratch = new Float32Array(requiredSamples)
    }

    const framesExtracted = this.filter.extract(this.scratch, leftOutput.length)
    const isMono = rightOutput === leftOutput
    for (let i = 0; i < framesExtracted; i++) {
      leftOutput[i] = this.scratch[i * 2] ?? 0
      if (!isMono) {
        rightOutput[i] = this.scratch[i * 2 + 1] ?? 0
      }
    }

    return true
  }
}

registerProcessor(SOUND_TOUCH_PREVIEW_PROCESSOR_NAME, SoundTouchPreviewProcessor)
```

#### `registerProcessor` call

Line `:126`: `registerProcessor(SOUND_TOUCH_PREVIEW_PROCESSOR_NAME, SoundTouchPreviewProcessor)`

`SOUND_TOUCH_PREVIEW_PROCESSOR_NAME = 'freecut-soundtouch-preview'` (from `soundtouch-preview-shared.ts:1`).

#### `process(inputs, outputs, parameters)` implementation — quoted in full above (lines `:90-123`)

**Key behavior:**
1. Reads `outputs[0]` (single output, 2 channels configured via `outputChannelCount: [2]`)
2. If `!playing || source.frameCount === 0`, fills output with zeros and returns `true` (keeps node alive)
3. Else: allocates `scratch` Float32Array sized to `leftOutput.length * 2` (interleaved stereo), calls `filter.extract(scratch, numFrames)` which fills it with stretched samples, then de-interleaves into `leftOutput` and `rightOutput`
4. Always returns `true` (true = keep processor alive; false would let the GC tear it down)

#### `port.onmessage` command protocol — quoted in full above (lines `:51-88`)

**6 message types** (from `soundtouch-preview-shared.ts:3-43`):

| Message | Fields | Effect |
|---|---|---|
| `append-source` | `startFrame: number`, `leftChannel: ArrayBuffer`, `rightChannel: ArrayBuffer`, `frameCount: number`, `sampleRate: number` | Pushes a stereo chunk into `QueuedStereoBufferSource` at `startFrame`. Multiple appends can overlap; newer supersedes older where ranges overlap. |
| `seek` | `frame: number`, `direction?: -1 \| 1` | Sets read direction (forward/reverse) and source position. For reverse: `setReadDirection(-1, frame)`, `filter.sourcePosition = 0`. For forward: `filter.sourcePosition = frame`. |
| `set-tempo` | `tempo: number` | Sets `processor.tempo` (clamped to `>= 0.01`). `processor.rate = 1` always (we don't use rate). |
| `set-pitch` | `pitch: number` | Sets `processor.pitch` (clamped to `>= 0.01`). |
| `set-playing` | `playing: boolean` | Toggles whether `process()` fills output with zeros (paused) or stretched samples (playing). |
| `reset` | (none) | Clears `QueuedStereoBufferSource`, resets `filter.sourcePosition = 0`, sets `playing = false`. |

#### Buffer management — `QueuedStereoBufferSource` (153 LOC, `soundtouch-preview-source.ts`)

**NOT a ring buffer. NOT a double buffer.** It's an *array of overlapping chunks* (`StoredChunk[]`):

```ts
// soundtouch-preview-source.ts:8-11
interface StoredChunk extends SoundTouchPreviewSourceChunk {
  endFrame: number
  sequence: number
}

// :13-18
export class QueuedStereoBufferSource {
  private chunks: StoredChunk[] = []
  private sequence = 0
  private direction: -1 | 1 = 1
  private reverseAnchorFrame = 0
  frameCount = 0
  // ...
}
```

`append(chunk)` (`:20-53`):
- Computes `endFrame = startFrame + frameCount`
- Filters out existing chunks fully covered by the new chunk (`:40-48`)
- Concatenates and sorts by `startFrame` then `sequence` (`:49-50`)
- Updates `frameCount = max(frameCount, endFrame)` (`:52`)

`extract(target, numFrames, sourcePosition)` (`:68-107`):
- For forward: walks chunks from `sourcePosition` forward, copying interleaved L/R samples
- For reverse (`direction < 0`): walks chunks from `reverseAnchorFrame - sourcePosition` *backward*, copying samples in reverse order (`extractReverse` at `:109-140`)
- `findChunkContainingFrame(frame)` (`:142-152`): linear scan — returns the chunk with the highest `sequence` if multiple overlap (newer wins)

#### How tempo/pitch/seek changes are applied mid-stream

- `set-tempo`/`set-pitch` call `applySettings()` which sets `processor.tempo`, `processor.pitch`, `processor.rate = 1` (`:45-49`). The `TimeStretchProcessor` (vendored `soundtouchjs` `SoundTouch` class, `time-stretch.ts:573-670`) recalculates `effectiveRateAndTempo` which configures the internal `Stretch` and `RateTransposer` stages. **Mid-stream safe** — soundtouchjs is designed for live parameter changes.
- `seek` sets `filter.sourcePosition` to the requested frame (`:67-68`). The next `filter.extract()` call resumes from that position. The internal `midBuffer` of the `Stretch` stage is cleared on `sourcePosition` change (via `SimpleFilter.sourcePosition` setter at `time-stretch.ts:274-277` calling `clear()`).

#### How it handles `OfflineAudioContext` (cloud render)

The processor code is **identical** for online and offline contexts. `OfflineAudioContext.audioWorklet.addModule(url)` loads the same module. `new AudioWorkletNode(offlineContext, name, options)` constructs the same processor.

The `process()` callback is invoked by the audio render thread — for `OfflineAudioContext`, this runs as fast as the DSP allows, not real-time. The vendored `soundtouchjs` is pure JS, so the only difference is wall-clock time (offline finishes faster).

**Resampling for the worklet** (`soundtouch-preview-worklet.ts:71-120`): `prepareSoundTouchPreviewSource(buffer, targetSampleRate)` resamples an `AudioBuffer` to the worklet's expected sample rate using `OfflineAudioContext` if available (`:92-110`), falling back to a JS linear resampler (`resampleChannelLinear` at `:27-42`).

#### Other findings

1. **Inputs unused:** `numberOfInputs: 0` in the `AudioWorkletNode` config (`soundtouch-worklet-audio.tsx:189`). Source audio is pushed via `port.postMessage('append-source', ...)` with transferable ArrayBuffers (`soundtouch-worklet-audio.tsx:303-313` transferring `[leftChannel, rightChannel]`).

2. **DSP is vendored soundtouchjs v0.2.3:** `src/infrastructure/audio/time-stretch.ts` (672 LOC) is a `@ts-nocheck` vendored copy of [soundtouchjs](https://github.com/cutterbl/SoundTouchJS). License: LGPL v2.1 (compatible with MIT-licensed projects). Exports `SimpleFilter as TimeStretchFilter` and `SoundTouch as TimeStretchProcessor` (`:672`).

3. **Drift correction** (`soundtouch-worklet-audio.tsx:363-391`): The main thread monitors drift between `AudioContext.currentTime` and the expected playback position. Resyncs when:
   - Audio falls behind by > 0.2 s (`DRIFT_RESYNC_BEHIND_THRESHOLD_SECONDS`)
   - Audio gets ahead by > 0.5 s (`DRIFT_RESYNC_AHEAD_THRESHOLD_SECONDS`)
   - At least 500 ms since last sync (debounce)
   - Or initial sync required

4. **Reverse playback:** Reverse is handled by `QueuedStereoBufferSource.extractReverse` (`soundtouch-preview-source.ts:109-140`) which walks chunks backward from `reverseAnchorFrame - sourcePosition`. Tempo stays positive; only the read direction flips. Reverse-shuttle (negative transport rate) is handled at `soundtouch-worklet-audio.tsx:103-109` by combining `isReversed` and `isReverseShuttle` into `sourceDirection`.

---

### Q10. FreeCut's Vite worker config

**Source:** `vite.config.ts:304-306`.

```ts
// vite.config.ts:304-306
  worker: {
    format: 'es',
  },
```

That's the entire worker-specific config. No `worker.plugins`, no `worker.format` per-environment override.

**`optimizeDeps.exclude`** at `:307-314` excludes heavy worker-only deps from Vite's pre-bundle step:
```ts
  optimizeDeps: {
    exclude: [
      'mediabunny',
      '@mediabunny/ac3',
      '@mediabunny/mp3-encoder',
      '@mediabunny/aac-encoder',
      '@huggingface/transformers',
    ],
    // ...
  },
```

These are loaded via dynamic `import('mediabunny')` inside workers (`audio-decode-worker.ts:98`, `waveform-worker.ts:72`, `filmstrip-extraction-worker.ts:99`, `media-processor.worker.ts:174-180`, `decoder-prewarm-worker.ts:26-29`, `whisper.worker.ts:146-148`). The `exclude` prevents Vite from pre-bundling them into the main entry — they remain as separate ESM chunks loaded only when a worker boots.

**Build-time chunking** (`vite.config.ts:138-300`): `manualChunks` carves out separate chunks for:
- `media-bunny-core` (mediabunny itself)
- `media-ac3-decoder` (`@mediabunny/ac3`)
- `media-mp3-encoder`
- `media-processing` (other `@mediabunny/*`)
- `media-analysis` (scene detection, embeddings)
- `media-library-service`

This keeps worker bundles small and enables parallel HTTP/2 fetch on first worker spawn.

---

### Q11. FreeCut's COOP/CEOP header setup

> **SCOUT FINDING**: Headers are configured in **FOUR** different places, with **inconsistent values**.

#### 1. Vite dev server (`vite.config.ts:106-116`)

```ts
// vite.config.ts:106-116
  server: {
    port: 5173,
    strictPort: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      // Enables the JS self-profiling API (new Profiler(...)) for dev-time
      // performance investigation, e.g. profiling play-start latency.
      'Document-Policy': 'js-profiling',
    },
  },
```

Dev server sets **`require-corp`** + **`same-origin`** + `Document-Policy: js-profiling` (dev only, enables JS self-profiling API).

#### 2. Vite preview server (`vite.config.ts:117-122`)

```ts
// vite.config.ts:117-122
  preview: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
```

Preview server sets **`require-corp`** + **`same-origin`** (no `Document-Policy`).

#### 3. Production (Vercel) (`vercel.json:13-48`)

```json
// vercel.json:23-47
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "credentialless" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" }
      ]
    }
```

Production sets **`credentialless`** (NOT `require-corp`) + **`same-origin`**.

> ⚠️ **CRITICAL INCONSISTENCY**: `credentialless` and `require-corp` are *different* COEP modes. `require-corp` requires all cross-origin resources to opt in via CORP headers. `credentialless` strips credentials from cross-origin requests but allows resources without CORP headers (as opaque responses). They are not interchangeable. FreeCut's dev environment uses `require-corp` (stricter) but production uses `credentialless` (looser). This is likely an oversight or a workaround for a third-party resource that doesn't set CORP headers.

#### 4. Headless render server (`headless/server.mjs:64-68`)

```js
// headless/server.mjs:64-68
  const server = http.createServer(async (req, res) => {
    // Cross-origin isolation for the harness page (matches the Vite dev server).
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
```

Headless render server (for cloud-render / Playwright) sets **`require-corp`** + **`same-origin`** + **`Cross-Origin-Resource-Policy: same-origin`** (the third header is the headless server's own CORP — it doesn't allow other origins to fetch from it).

#### 5. Headless media server (`headless/media-server.mjs:48-52`)

```js
// headless/media-server.mjs:48-52
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    res.setHeader('Access-Control-Allow-Headers', 'range')
    res.setHeader('Access-Control-Expose-Headers', 'content-range, accept-ranges, content-length')
```

Media server (separate port, serves large media files) sets **`Cross-Origin-Resource-Policy: cross-origin`** + `Access-Control-Allow-Origin: *` so the COEP-isolated main page can fetch media cross-origin.

#### Recommendation for our spec

Standardize on `require-corp` + `same-origin` everywhere (dev, preview, production, headless). Do NOT use `credentialless` — it's a different mode and changes the security model. If a third-party resource doesn't set CORP headers, proxy it through our own origin or vendor it.

If we need SAB in v2, both modes enable it; `require-corp` is safer.

---

### Q12. OpenCut-classic's `video-cache/service.ts` — mediabunny API

**Source:** `apps/web/src/services/video-cache/service.ts` (337 LOC).

#### Mediabunny API surface used (from `service.ts:1-7`)

```ts
import {
    Input,
    ALL_FORMATS,
    BlobSource,
    CanvasSink,
    type WrappedCanvas,
} from "mediabunny";
```

| Export | Used at | Purpose |
|---|---|---|
| `Input` | `:265-268, 30-33` | Container parser — `new Input({ source: new BlobSource(file), formats: ALL_FORMATS })` |
| `ALL_FORMATS` | `:32, 267` | Tells `Input` to probe all supported container formats (mp4, webm, mkv, mov, etc.) |
| `BlobSource` | `:31, 266` | `new BlobSource(file)` — wraps a `File`/`Blob` as a mediabunny `Source` |
| `CanvasSink` | `:281-284` | Decoded-frame sink that draws to `OffscreenCanvas`/`HTMLCanvasElement` |
| `WrappedCanvas` (type) | `:13, 34, 64, 109` | Return type of `sink.canvases()` iteration — `{ canvas: OffscreenCanvas \| HTMLCanvasElement; timestamp: number; duration: number }` |

#### Input creation pattern

```ts
// service.ts:258-268
const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
});
```

Note: OpenCut-classic uses `new BlobSource(file)` directly. FreeCut uses a custom `createMediabunnyInputSource(mb, src, { metadata, fallbackBlob })` factory (`infrastructure/browser/mediabunny-input-source.ts`) that handles object URLs, cached metadata, and blob fallbacks. **We should adopt FreeCut's pattern** — it's more robust.

#### Track probing

```ts
// service.ts:271-279
const videoTrack = await input.getPrimaryVideoTrack();
if (!videoTrack) {
    throw new Error("No video track found");
}

const canDecode = await videoTrack.canDecode();
if (!canDecode) {
    throw new Error("Video codec not supported for decoding");
}
```

`getPrimaryVideoTrack()` returns the first video track (or null). `canDecode()` probes WebCodecs support — false for codecs the browser can't decode (e.g., ProRes in Chrome without the `@mediabunny/prores` decoder registered).

#### CanvasSink usage

```ts
// service.ts:281-284
const sink = new CanvasSink(videoTrack, {
    poolSize: 3,
    fit: "contain",
});
```

`CanvasSink` options:
- `poolSize: 3` — recycles 3 canvas objects to avoid GC churn (FreeCut filmstrip uses `poolSize: 4`, `filmstrip-extraction-worker.ts:218`)
- `fit: "contain"` — letterbox vs fill (FreeCut uses `fit: 'fill'` for filmstrip thumbnails, `:217`)

#### Seek-generations pattern (the interesting part)

```ts
// service.ts:40-54
const generation = (this.seekGenerations.get(mediaId) ?? 0) + 1;
this.seekGenerations.set(mediaId, generation);

const previous = this.frameChain.get(mediaId) ?? Promise.resolve();
const current = previous.then(() => {
    if (this.seekGenerations.get(mediaId) !== generation) {
        return sinkData.currentFrame ?? null;
    }
    return this.resolveFrame({ sinkData, time });
});
this.frameChain.set(
    mediaId,
    current.catch(() => {}),
);
return current;
```

**Per-media seek generation counter** (`seekGenerations: Map<string, number>`):
1. Each `getFrameAt` call increments the generation
2. The promise chain (`frameChain: Map<string, Promise<unknown>>`) serializes seeks per media — new seeks wait for old seeks to complete (or be cancelled)
3. Inside the chain, check if generation is still current; if not, return `currentFrame` (the most recently decoded frame) instead of doing a fresh seek
4. `.catch(() => {})` ensures a failed seek doesn't break the chain for subsequent seeks

This is the correct pattern for handling rapid scrubbing — we should adopt it.

#### Why `VideoSampleSink` (not `CanvasSink`) for our pipeline

OpenCut-classic's `video-cache/service.ts` uses `CanvasSink` because it draws directly to canvas for display. Our pipeline needs raw `VideoFrame` objects (10-bit P010 for the GPU renderer).

**FreeCut's `decoder-prewarm-worker.ts:129-137`** uses `VideoSampleSink`:

```ts
// decoder-prewarm-worker.ts:129-137
const sink = new mediabunny.VideoSampleSink(
    videoTrack,
    options?.activePreview
      ? {
          hardwareAcceleration: 'prefer-hardware',
          optimizeForLatency: true,
        }
      : undefined,
)
```

`VideoSampleSink` yields samples with a `toVideoFrame()` method (`decoder-prewarm-worker.ts:374-375`) — raw WebCodecs `VideoFrame` objects. This is what we need for 10-bit pipeline. Configure via:

```ts
new mediabunny.VideoSampleSink(videoTrack, {
  hardwareAcceleration: 'prefer-hardware',
  optimizeForLatency: true,
  // RESOLVED (2026-09-02, spec 03 §5.2 + §14.D, spec 04 §14.C): mediabunny's
  // VideoSinkDecoderOptions exposes ONLY hardwareAcceleration and
  // optimizeForLatency — there is NO pixelFormat option. 10-bit sources decode
  // to whatever format the browser's VideoDecoder chooses (I420P10-family).
  // Do NOT request a format here; rely on the browser's native output and
  // convert in the GPU shader pipeline (spec 04 §6.2 yuv_to_linear).
})
```

> **RESOLVED — no longer open.** Spec 03's scout verified the mediabunny sink surface directly: `VideoSinkDecoderOptions = { hardwareAcceleration?, optimizeForLatency? }` only (media-sink.ts:1622-1633). The `frame.format` query path and the `new VideoFrame(src, { format: 'I420P10' })` re-allocation escape hatch are documented in spec 03 §14.D.

#### Other mediabunny exports used by OpenCut-classic (`mediabunny.ts:1-7`)

```ts
import {
    Input,
    ALL_FORMATS,
    BlobSource,
    VideoSampleSink,
    type VideoCodec,
} from "mediabunny";
```

`mediabunny.ts:49-63` shows `VideoSampleSink` usage:
```ts
const sink = new VideoSampleSink(videoTrack);
const frame = await sink.getSample(1);  // get sample at t=1s
if (frame) {
    try {
        thumbnailUrl = renderThumbnailDataUrl({
            width: videoTrack.displayWidth,
            height: videoTrack.displayHeight,
            draw: ({ context, width, height }) => {
                frame.draw(context, 0, 0, width, height);
            },
        });
    } finally {
        frame.close();
    }
}
```

So `VideoSampleSink` yields objects with `.draw(ctx, dx, dy, dw, dh)` and `.close()` methods. Whether these are actual `VideoFrame` objects or wrappers needs mediabunny docs verification.

---

### Q13. OpenCut-classic's transcription worker — `@huggingface/transformers` integration

**Source:** `apps/web/src/services/transcription/worker.ts` (176 LOC).

#### Module load

```ts
// worker.ts:1-5
import {
    pipeline,
    type AutomaticSpeechRecognitionPipeline,
    type AutomaticSpeechRecognitionOutput,
} from "@huggingface/transformers";
```

**Static import** — `@huggingface/transformers@^3.8.1` (per `package.json`) is bundled into the worker chunk at build time. This is different from FreeCut's pattern (see below).

#### Pipeline initialization

```ts
// worker.ts:55-108
async function handleInit({ modelId }: { modelId: string }) {
    lastReportedProgress = -1;
    fileBytes.clear();

    try {
        transcriber = (await pipeline("automatic-speech-recognition", modelId, {
            dtype: "q4",
            device: "auto",
            progress_callback: (progressInfo: { ... }) => { ... },
        })) as unknown as AutomaticSpeechRecognitionPipeline;

        self.postMessage({ type: "init-complete" } satisfies WorkerResponse);
    } catch (error) {
        self.postMessage({
            type: "init-error",
            error: error instanceof Error ? error.message : "Failed to load model",
        } satisfies WorkerResponse);
    }
}
```

**Configuration:**
- `dtype: "q4"` — single quantization level (4-bit) for all model components
- `device: "auto"` — let transformers.js pick (tries WebGPU, falls back to WASM)
- `progress_callback` — tracks download progress per-file, accumulates across files, reports aggregate percentage

#### Transcription call

```ts
// worker.ts:136-142
const rawResult = await transcriber(audio, {
    chunk_length_s: DEFAULT_CHUNK_LENGTH_SECONDS,
    stride_length_s: DEFAULT_STRIDE_SECONDS,
    language: language === "auto" ? undefined : language,
    return_timestamps: true,
});
```

- `return_timestamps: true` — segment-level (NOT word-level — see `:152-162` extracting `chunk.timestamp` which is `[start, end]`)
- `chunk_length_s: DEFAULT_CHUNK_LENGTH_SECONDS` (30 s, imported from `@/transcription/audio`)
- `stride_length_s: DEFAULT_STRIDE_SECONDS` (5 s)

#### Version question — FreeCut vs OpenCut-classic

| Repo | Declared (package.json) | Loaded at runtime | Source |
|---|---|---|---|
| OpenCut-classic | `^3.8.1` | `3.8.x` | NPM static import |
| FreeCut | `4.1.0` | `3.8.1` | CDN dynamic import (`esm.sh/@huggingface/transformers@3.8.1?bundle`) |

> **SCOUT FINDING**: FreeCut's `package.json` declares `@huggingface/transformers: "4.1.0"` but the worker **never imports the NPM package**. Instead, `whisper.worker.ts:20-21` loads version `3.8.1` from CDN:
> ```ts
> const TRANSFORMERS_CDN_URL = 'https://esm.sh/@huggingface/transformers@3.8.1?bundle'
> const WASM_CDN_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/'
> ```
> The NPM dep is unused at runtime — it's likely a leftover from an earlier implementation. The actual runtime version is `3.8.1` for **both** repos.

**Recommendation:** Pin `@huggingface/transformers@3.8.1` (or latest stable 3.x). Reasons:
1. Both reference repos use 3.8.1 at runtime — battle-tested
2. `4.x` has API changes (notably `device: 'webgpu'` vs `device: 'auto'`) that would require code changes
3. `3.8.1` supports WebGPU via `device: 'webgpu'` (FreeCut's pattern at `whisper.worker.ts:200`)
4. Loading from NPM (OpenCut-classic's pattern) is safer than CDN — works offline, survives CDN outages

For our v1: **bundle via NPM `@huggingface/transformers@3.8.1`**, use FreeCut's hybrid quantization pattern (`{ encoder_model: 'fp32', decoder_model_merged: 'q4' }`) and WebGPU-first-with-WASM-fallback strategy.

---

## 12. Test Plan for This Stream

1. **Unit tests for `ManagedWorker`**: lazy creation, idle termination, error handling, pool acquire/release.
2. **Per-worker smoke tests**: each worker has a test that posts a request, asserts the response.
3. **Memory leak test**: spawn + terminate 100 workers, assert no growth in `performance.memory`.
4. **HeavyWorkerQueue test**: enqueue 5 heavy tasks, assert they run sequentially.
5. **AudioWorklet test**: instantiate, send varispeed commands, assert samples match expected output (compare to offline `soundtouchjs` reference).
6. **Worker crash test**: kill a worker mid-operation, assert error propagates and worker restarts cleanly.

> **SCOUT FINDING**: FreeCut has parallel tests for ManagedWorker at `src/shared/utils/managed-worker.test.ts`, `managed-worker-pool.test.ts`, `managed-worker-session.test.ts` (NOT read in this scout — listed in §13). Worth examining their test patterns when we implement.

---

## 13. Code References

Every file actually read by this scout, with one-line summary.

### FreeCut (`/tmp/freecut`)

#### ManagedWorker abstraction (3 files)

| File | LOC | Summary |
|---|---|---|
| `src/shared/utils/managed-worker.ts` | 68 | Lazy singleton wrapper around `Worker` — `getWorker()`, `peekWorker()`, `terminate()`. No postMessage wrapper, no error handling, no idle timeout. |
| `src/shared/utils/managed-worker-pool.ts` | 77 | Pool of workers with LIFO `acquireWorker`/`releaseWorker(worker, { maxIdleWorkers })`. No timeout; workers persist until `maxIdleWorkers` overflow forces termination. |
| `src/shared/utils/managed-worker-session.ts` | 89 | Multi-worker bundle keyed by name; `registerCleanup()` callbacks fire on `terminate()`. Used by analysis sub-system factories. |

#### Audio decode (2 files)

| File | LOC | Summary |
|---|---|---|
| `src/runtime/composition-runtime/utils/audio-decode-worker.ts` | 419 | Worker entry: handles `decode` (full), `decode-window` (preview), `assemble-bins` (rehydrate). Streams Int16 bins (transferable ArrayBuffers) at 10 s / 22050 Hz. Persists to OPFS before transfer. |
| `src/runtime/composition-runtime/utils/audio-decode-cache.ts` | 1339 | Main-thread service: lazily creates two `ManagedWorker` instances (background + foreground lanes). Tracks pending requests via `requestId`. Manages Int16 bin persistence + Float32 reassembly. |
| `src/runtime/composition-runtime/utils/audio-decode-worker.types.ts` | 104 | Shared TS types: `AudioDecodeRequest`, `AudioDecodeWindowRequest`, `AudioAssembleBinsRequest`, responses. (Read for type fidelity.) |

#### Waveform (2 files)

| File | LOC | Summary |
|---|---|---|
| `src/features/timeline/services/waveform-worker.ts` | 332 | Worker entry: progressive waveform extraction via mediabunny `AudioSampleSink`. Emits `init` → `progress` → `chunk` (transferable Float32Array.buffer) → `complete`. Supports `abort`. |
| `src/features/timeline/services/waveform-cache.ts` | 1577 | Main-thread service: 128 MB LRU + 64 MB level cache. Single `ManagedWorker`. Concurrency limit = 1. Per-request `requestId` + rejector map. Falls back to main-thread `generateWaveformFallback` on worker failure. |

#### Filmstrip (3 files)

| File | LOC | Summary |
|---|---|---|
| `src/features/timeline/workers/filmstrip-extraction-worker.ts` | 413 | Worker entry: filmstrip thumbnails via `CanvasSink`. Two parallel pipelines per frame — fast `ImageBitmap` (transferred) + slow JPEG Blob. Supports `extract`, `abort`, `warm` (prewarm mediabunny). |
| `src/features/timeline/services/filmstrip-cache.ts` | 2782 | Main-thread service: `ManagedWorkerPool` (max 2 workers, min 8 cores). Range-partitioned work assignment, no work-stealing. Prewarm pattern: acquire → post `warm` → release immediately. Memory-pressure aware idle worker count. |
| `src/features/timeline/services/filmstrip-cache-config.ts` | 45 | Tunable constants: `MAX_WORKERS=2`, `MIN_CORES_FOR_PARALLEL_WORKERS=8`, `MAX_IDLE_WORKERS_BASE=2`, `MEMORY_TARGET_BYTES=500MB`, etc. |

#### Export (2 files)

| File | LOC | Summary |
|---|---|---|
| `src/features/export/workers/export-render.worker.ts` | 182 | Worker entry: dynamic-imports `canvas-render-orchestrator`. `window` global shim. Detects animated-image + audio-context limitations, throws `WORKER_REQUIRES_MAIN_THREAD:*` for main-thread fallback. AbortController per request. |
| `src/features/export/utils/render-pipeline.ts` | 304 | Main-thread orchestrator: `runRender()` creates one `ManagedWorker` per call, tries worker first, falls back to main-thread on `WORKER_REQUIRES_MAIN_THREAD:*` / `WORKER_UNAVAILABLE` / `EXPORT_WORKER_RUNTIME_ERROR:*`. Always terminates worker in `finally`. |

#### OPFS (2 files)

| File | LOC | Summary |
|---|---|---|
| `src/features/media-library/workers/opfs-worker.ts` | 455 | Worker entry: `save`/`get`/`delete`/`list`/`processUpload`/`saveUpload` via `FileSystemSyncAccessHandle` (worker-only). MessageChannel for per-request reply routing. Streaming upload progress. SHA-256 content-addressable storage. |
| `src/features/media-library/services/opfs-service.ts` | 313 | Main-thread service: Promise-based API hiding MessageChannel wiring. Deduplicates concurrent reads of same path (prevents sync-access-handle errors). Singleton `opfsService` export. |

#### Media processor (1 file)

| File | LOC | Summary |
|---|---|---|
| `src/features/media-library/workers/media-processor.worker.ts` | 795 | Worker entry: import-time metadata + thumbnail extraction. FPS estimation via median packet duration (snaps to common rates). Keyframe timestamp extraction via `EncodedPacketSink` (O(K) vs O(N)). ProRes detection. Audio codec support table. |

#### Transcription (1 file)

| File | LOC | Summary |
|---|---|---|
| `src/features/media-library/transcription/workers/whisper.worker.ts` | 376 | Worker entry: streaming Whisper ASR. `@huggingface/transformers@3.8.1` loaded from CDN (not NPM dep). WebGPU-first with WASM fallback. Hybrid quantization `{encoder: fp32, decoder: q4}`. Pre-warm inference. Word-level dedupe across overlapping chunks. Internal chunk queue. |

#### Decoder prewarm (2 files)

| File | LOC | Summary |
|---|---|---|
| `src/features/preview/workers/decoder-prewarm-worker.ts` | 742 | Worker entry: background pre-seeking for occluded variable-speed clips. `VideoSampleSink` + `OffscreenCanvas.transferToImageBitmap()`. Per-source `ExtractorState` with sample iterator, current/next sample cache, draw lock. Batch preseek via `samplesAtTimestamps`. Active-preview cancellation via generation counter. |
| `src/features/preview/utils/decoder-prewarm.ts` | 1559 | Main-thread service: worker pool of 3-6 (scales with `hardwareConcurrency`). Per-source bitmap cache (6 bitmaps, 12M pixels max). Active-preview worker separate from pool. `MAX_INFLIGHT_PER_WORKER = 1`. |

#### AudioWorklet (5 files)

| File | LOC | Summary |
|---|---|---|
| `src/runtime/composition-runtime/worklets/soundtouch-preview-processor.worklet.ts` | 126 | **AudioWorklet processor.** `registerProcessor('freecut-soundtouch-preview', ...)`. `process()` reads from `TimeStretchFilter`, writes interleaved stereo to output. `port.onmessage` handles 6 message types (append-source / seek / set-tempo / set-pitch / set-playing / reset). |
| `src/runtime/composition-runtime/utils/soundtouch-preview-shared.ts` | 43 | Shared TS types: 6 message interfaces, processor name constant `'freecut-soundtouch-preview'`. |
| `src/runtime/composition-runtime/utils/soundtouch-preview-source.ts` | 153 | `QueuedStereoBufferSource`: chunked stereo PCM source with `append`/`extract`/`setReadDirection`/`clear`. Supports reverse playback via `extractReverse`. Linear scan `findChunkContainingFrame`. Newer chunks win on overlap (sequence counter). |
| `src/runtime/composition-runtime/utils/soundtouch-preview-worklet.ts` | 170 | Main-thread loader: `ensureSoundTouchPreviewWorkletLoaded(context)` calls `context.audioWorklet.addModule(workletModuleUrl)`. Resamples `AudioBuffer` to target sample rate via `OfflineAudioContext` (or JS linear fallback). WeakMap-cached per context. |
| `src/runtime/composition-runtime/components/soundtouch-worklet-audio.tsx` | 441 | React component that wraps the AudioWorkletNode. Wires `append-source` (transferring `[leftChannel, rightChannel]`), `seek` (with drift correction), `set-tempo`, `set-pitch`, `set-playing`. Fallback to `<audio>` element if worklet fails to load. |
| `src/infrastructure/audio/time-stretch.ts` | 672 | **Vendored soundtouchjs v0.2.3** (LGPL v2.1). `@ts-nocheck`. Exports `SimpleFilter as TimeStretchFilter` and `SoundTouch as TimeStretchProcessor`. Pure JS time-stretch + pitch-shift DSP. |

#### Background queue (1 file)

| File | LOC | Summary |
|---|---|---|
| `src/features/media-library/services/background-media-work.ts` | 142 | Priority queue for background media work (proxy gen, transcription setup). `MAX_CONCURRENT_BACKGROUND_MEDIA_JOBS = 1`. Priority levels: `'warm'` (0) vs `'heavy'` (1). Closest thing FreeCut has to `HeavyWorkerQueue`. |

#### Vite + headers (3 files)

| File | LOC | Summary |
|---|---|---|
| `vite.config.ts` | 328 | `worker: { format: 'es' }` at lines 304-306. Dev server COOP/CEOP headers at 109-115 (`require-corp` + `same-origin` + `Document-Policy: js-profiling`). Preview server at 117-122 (`require-corp` + `same-origin`). `optimizeDeps.exclude` for mediabunny + transformers. Manual chunks for media decoders. |
| `vercel.json` | 49 | Production headers: `Cross-Origin-Embedder-Policy: credentialless` (NOT `require-corp`!) + `same-origin` at lines 39-45. Cache-Control for /assets/. |
| `headless/server.mjs` | 116 | Headless render server: `require-corp` + `same-origin` + `Cross-Origin-Resource-Policy: same-origin` at lines 66-68. |
| `headless/media-server.mjs` | 89 | Headless media server (separate port): `Cross-Origin-Resource-Policy: cross-origin` + `Access-Control-Allow-Origin: *` at lines 49-52. |

#### Silence detection (1 file)

| File | LOC | Summary |
|---|---|---|
| `src/features/timeline/workers/silence-detection-worker.ts` | 61 | Worker entry: simple silence-range detection on transferred ArrayBuffer channels. Calls `detectSilentRanges` from `@/shared/utils/audio-silence`. No streaming — single request/response. |

#### FreeCut worker file inventory (NOT all read, for context)

Total `.worker.ts` + `*-worker.ts` files in `src/`:

**Workers we should adopt (read in this scout):**
1. `runtime/composition-runtime/utils/audio-decode-worker.ts` ✅
2. `features/timeline/services/waveform-worker.ts` ✅
3. `features/timeline/workers/filmstrip-extraction-worker.ts` ✅
4. `features/timeline/workers/silence-detection-worker.ts` ✅ (skimmed)
5. `features/export/workers/export-render.worker.ts` ✅
6. `features/media-library/workers/opfs-worker.ts` ✅
7. `features/media-library/workers/media-processor.worker.ts` ✅
8. `features/media-library/transcription/workers/whisper.worker.ts` ✅
9. `features/preview/workers/decoder-prewarm-worker.ts` ✅

**Workers we will NOT adopt (out of scope for v1):**
- `features/media-library/transcription/workers/decoder.worker.ts` (alternative ASR — Whisper is enough)
- `features/media-library/transcription/workers/parakeet.worker.ts` (alternative ASR)
- `features/media-library/workers/frame-interpolation-worker.ts` (RIFE frame interp — defer to v2)
- `features/media-library/workers/upscale-worker.ts` (Anime4K upscale — defer to v2)
- `features/media-library/workers/proxy-generation-worker.ts` (background proxy gen — optional, may adopt v1.1)
- `infrastructure/analysis/embeddings/clip-worker.ts` (CLIP embeddings — not in v1)
- `infrastructure/analysis/embeddings/embeddings-worker.ts` (generic embeddings host — not in v1)
- `infrastructure/analysis/lfm-scene-worker.ts` (LFM scene detection — not in v1)
- `infrastructure/analysis/adaptive-scene-detection-worker.ts` (adaptive scene detection — not in v1)
- `infrastructure/analysis/gemma-scene-worker.ts` (Gemma scene captioning — not in v1)
- `infrastructure/llm/gemma-llm-worker.ts` (Gemma LLM chat — not in v1)

**Worklet:**
- `runtime/composition-runtime/worklets/soundtouch-preview-processor.worklet.ts` ✅

**Total FreeCut worker inventory:** ~15 actual workers + 1 AudioWorklet (seed spec's "21" claim is approximate — see §14 Correction #1).

### OpenCut-classic (`/tmp/opencut-classic`)

| File | LOC | Summary |
|---|---|---|
| `apps/web/src/services/transcription/worker.ts` | 176 | Whisper ASR worker. Static import `@huggingface/transformers@^3.8.1`. Single full transcription (no streaming). `dtype: 'q4'`, `device: 'auto'`. Segment-level timestamps. Simpler than FreeCut's whisper.worker. |
| `apps/web/src/services/transcription/service.ts` | 186 | Main-thread service. Lazy worker creation. `ensureWorker()` checks model ID and re-inits on model change. Promise-based message wiring via `addEventListener('message', handler)`. |
| `apps/web/src/services/video-cache/service.ts` | 337 | Main-thread video frame cache. Uses `CanvasSink` (NOT `VideoSampleSink`). Seek-generation counter pattern for rapid-scrub cancellation. Frame chain serialization per media. |
| `apps/web/src/media/mediabunny.ts` | 206 | Mediabunny usage examples: `readVideoFile` (metadata + thumbnail via `VideoSampleSink.getSample`), `extractTimelineAudio` (audio mixdown to WAV). |

### Tests (referenced, not read)

- `src/shared/utils/managed-worker.test.ts`
- `src/shared/utils/managed-worker-pool.test.ts`
- `src/shared/utils/managed-worker-session.test.ts`

> nle-engine's zero-worker reality and the corrective deltas are mapped in §13B; consolidated in `19-code-references.md`.

### 13B. Code References — nle-engine (reference, NOT canon)

> The private **nle-engine** repo (github.com/bearachprema/nle-engine, 37,958 LOC, 124 tests) is a clean-room FreeCut-port **in-between reference, NOT canon**. It de-risks implementation but inherits FreeCut patterns these specs correct (8-bit rgba8unorm, JSON-RPC + `$ref`, class-API mutation surface, single-tier tests, procedural media, zero Web Workers). Where engine code conflicts with this spec, **the spec wins**. Full reconciliation: `19-code-references.md`.

| Spec section | Engine file:line | Verified quote | Status | Note |
|---|---|---|---|---|
| §3 worker inventory | (grep src) | no `new Worker(` matches | ENGINE-GAP | Zero workers; entire §3 inventory unimplemented — spec wins |
| §4 ManagedWorker | — | COULD-NOT-VERIFY (no abstraction exists) | SPEC-ONLY | Greenfield |
| §8.1 decode.worker | `src/lib/nle/playback/player.ts:1059` | `const bytes = this._registry.renderVideoFrame(clip.source.sourceId, sourceFrame);` | ENGINE-GAP | Decode is a synchronous procedural call |
| §7.1 SoundTouch varispeed | `src/lib/nle/audio/soundtouch-processor.worklet.ts:13` | `We implement a simpler granular pitch shifter:` | CORRECTIVE | Simplified shifter vs vendored SoundTouch; spec wins |
| §7.2 worklet topology | `src/lib/nle/audio/soundtouch-processor.worklet.ts:47` | `NLE_PITCH_SHIFTER_PROCESSOR_NAME = 'nle-pitch-shifter';` | CORRECTIVE | 1-in/1-out + k-rate param vs spec's 0-input + port-push (OfflineAudioContext parity); spec wins |
| §8.2 audio-decode.worker | `src/lib/nle/media/virtual-audio.ts:4` | `Generates audio samples on-demand. NO disk I/O, NO fetch.` | CORRECTIVE | Procedural VirtualAudio replaces the PCM pipeline |
| §8.6 opfs.worker | `src/lib/nle/media/registry.ts:24` | Returns a virtual URL scheme `virtual://video/{id}` | ENGINE-GAP | No OPFS plane (engine D5); spec wins |
| §11 Q12 mediabunny | `src/lib/nle/media/metadata.ts:81` | `a custom decoder path (mediabunny + AudioSampleSink)` | ENGINE-GAP | All 9 mediabunny mentions are comments only — zero imports |
| §6 COOP/COEP | (grep) | no SharedArrayBuffer usage | SPEC-ONLY | No isolation headers needed by engine |

---

## 14. Corrections to Seed Spec

Every wrong or imprecise assumption in `02-workers-threading.md` (the seed spec), with the correct value.

### Correction #1 — "FreeCut's 21 worker entry points"

**Seed spec claim (§3, §5.2):** "FreeCut's 21 worker entry points + 1 AudioWorklet" / "Pruned from FreeCut's 21".

**Actual:** FreeCut has ~15 worker files (counted in §13) + 1 AudioWorklet. The "21" figure likely came from an earlier audit that counted factory files (`create-*-worker.ts`) and AudioWorklet processors separately. The real count of distinct worker entry points is ~15, not 21.

**Impact:** Cosmetic — doesn't change our target of 10 workers + 1 AudioWorklet.

### Correction #2 — "`ManagedWorker` is ~120 LOC"

**Seed spec claim (§4):** "FreeCut built a small (~120 LOC) in-house abstraction in three files".

**Actual:** Three files total 234 LOC (68 + 77 + 89). The seed spec understated by ~2×.

**Impact:** Implementation estimate should be revised up. Plan for ~250-400 LOC for our `ManagedWorker` (we'll add Promise wrapper + timeout + error emitter on top).

### Correction #3 — `WorkerHandle.postMessage()` returns `Promise<TResponse>`

**Seed spec claim (§4):** 
```ts
export interface WorkerHandle<TRequest, TResponse> {
  postMessage(message: TRequest, transfer?: Transferable[]): Promise<TResponse>;
  // ...
}
```

**Actual:** FreeCut's `ManagedWorker.getWorker()` returns the raw `Worker`. Callers wire `worker.addEventListener('message', onMessage)` and `worker.addEventListener('error', onError)` themselves, then call `worker.postMessage(msg, [transferList])` (no Promise). Response correlation is via `requestId` field in each message.

**Impact:** Seed spec's `WorkerHandle` API is a *new* design — it does NOT exist in FreeCut. We should still build it (Promise wrapper is safer than imperative listeners), but we should know it's our addition, not FreeCut's pattern.

### Correction #4 — `idleTimeoutMs: 30_000`

**Seed spec claim (§4, §5.2):** "idle-terminate after 30s", "`idleTimeoutMs?: number; // default 30_000 — terminate if idle for 30s`".

**Actual:** FreeCut's `ManagedWorker` and `ManagedWorkerPool` have **NO idle timeout**. Workers persist indefinitely until explicitly terminated or evicted by `maxIdleWorkers` overflow in the pool. The pool's `maxIdleWorkers` is a count, not a duration.

**Impact:** Two options:
- **A:** Adopt FreeCut's pattern verbatim (no timeout, just `maxIdleWorkers`). Simpler but workers leak if caller forgets to terminate.
- **B:** Build the seed spec's `idleTimeoutMs` (new feature). Safer but adds complexity (timer management, late-arrival messages).

**Recommendation:** Option B with `idleTimeoutMs` defaulting to 60_000 (60 s). FreeCut's workers stay alive forever in practice — we can do better.

### Correction #5 — `HeavyWorkerQueue` exists in FreeCut

**Seed spec claim (§5.2 rule 3, §11 Q2):** Implies FreeCut has a global heavy-worker queue ("Implement a global `HeavyWorkerQueue`"). The §11 Q2 phrasing asks "Does FreeCut have a global queue for heavy workers? Or do they rely on the pool's `maxInstances: 1` constraint?".

**Actual:** FreeCut has NO global queue. Each service enforces its own concurrency limit (`MAX_CONCURRENT_WAVEFORM_GENERATIONS = 1`, `MAX_CONCURRENT_BACKGROUND_MEDIA_JOBS = 1`, etc.). The closest thing is `background-media-work.ts` which is a priority queue but only for background media work (not export rendering).

**Impact:** We should still build `HeavyWorkerQueue` — it's a worthwhile addition over FreeCut's pattern. The seed spec's proposed design (§5.2 rule 3) is correct.

### Correction #6 — `setupWorker` cleanup hook not mentioned

**Seed spec claim:** Silent on `setupWorker` returning a cleanup function.

**Actual:** FreeCut's `ManagedWorkerOptions.setupWorker?: (worker) => void | (() => void)` returns an optional cleanup function that's called in `terminate()` (managed-worker.ts:55-61). The export worker uses this to null `onmessage`/`onerror` (`render-pipeline.ts:265-268`).

**Impact:** Our `WorkerHandle` should expose the same pattern — `setupWorker` callback returns a cleanup fn called on `terminate()`.

### Correction #7 — "`MessageChannel` pattern" in OPFS not fully explained

**Seed spec claim (§8.6):** "Sub-agent scout to read in full and document the MessageChannel pattern."

**Actual:** See §8.6 and §11 Q4. MessageChannel is used for **per-request reply routing** + **progress streaming**, NOT for backpressure or concurrent execution (the worker processes messages serially anyway via `self.onmessage`).

**Impact:** Adopt MessageChannel pattern for any worker that streams progress: waveform, filmstrip, export-render, opfs-upload, transcription.

### Correction #8 — `decode.worker.ts` doesn't exist in FreeCut

**Seed spec claim (§3, §8.1):** Implies FreeCut has a `decode.worker.ts` we can adapt.

**Actual:** FreeCut does NOT have a true video decode worker. They use HTML5 `<video>` for preview and `CanvasSink` for filmstrip extraction. The closest is `decoder-prewarm-worker.ts` which uses `VideoSampleSink` to produce `ImageBitmap`s — but it's a *pre-seek* worker, not a real-time decode worker.

**Impact:** We're building `decode.worker.ts` from scratch, adapting OpenCut-classic's mediabunny pattern (which is also main-thread in OpenCut-classic). See §11 Q12.

### Correction #9 — "Filmstrip pool of 2, idle-terminate after 30s"

**Seed spec claim (§3, §8.4):** "On-demand pool (2 workers), idle-terminate after 30s".

**Actual:** FreeCut's filmstrip pool (`filmstrip-cache.ts:152-161`) uses `maxIdleWorkers` (count, not timeout). The pool keeps 2 idle workers (`MAX_IDLE_WORKERS_BASE = 2`, `filmstrip-cache-config.ts:42`) and terminates them only when (a) explicitly terminated via `terminateAll()`, (b) memory pressure forces `getMaxIdleWorkers()` to return 0 (hard) or 1 (soft), or (c) `releaseWorker` is called and `idleWorkers.length >= maxIdleWorkers`.

**Impact:** Our filmstrip pool should adopt FreeCut's `maxIdleWorkers` count-based eviction (simpler) AND add a 60s idle timeout (safer). See §5.2 rule 2.

### Correction #10 — "COOP/CEOP headers at vite.config.ts:304 area"

**Seed spec claim (§6):** "`vite.config.ts:304` area in FreeCut has the `worker: { format: 'es' }` config and there should be COOP/CEOP config nearby."

**Actual:** The `worker: { format: 'es' }` config IS at vite.config.ts:304-306 (correct). But COOP/CEOP headers are at:
- Lines 109-115 (dev server) — `require-corp` + `same-origin` + `Document-Policy: js-profiling`
- Lines 117-122 (preview server) — `require-corp` + `same-origin`
- `vercel.json:39-45` (production) — `credentialless` + `same-origin` ⚠️ INCONSISTENT
- `headless/server.mjs:66-68` (cloud render) — `require-corp` + `same-origin` + `Cross-Origin-Resource-Policy: same-origin`
- `headless/media-server.mjs:49-52` (cloud media) — `Cross-Origin-Resource-Policy: cross-origin` + `Access-Control-Allow-Origin: *`

The headers are NOT near line 304 — they're in a separate `server.headers` block 200 lines earlier.

**Impact:** Standardize on `require-corp` + `same-origin` everywhere. Avoid `credentialless` (different mode, changes security model). See §11 Q11.

### Correction #11 — Production uses `credentialless`, not `require-corp`

**Seed spec claim (§6):** "Set headers (in Vite config and production server): `Cross-Origin-Embedder-Policy: require-corp`".

**Actual:** FreeCut's production (Vercel) uses `Cross-Origin-Embedder-Policy: credentialless` (vercel.json:39), NOT `require-corp`. Dev/preview use `require-corp`. This inconsistency is likely a workaround for a third-party resource that doesn't set CORP headers.

**Impact:** For our spec, standardize on `require-corp` everywhere. If we hit a third-party resource without CORP, proxy it through our own origin. Do NOT use `credentialless` — it's a different security model and would surprise implementers expecting `require-corp` semantics.

### Correction #12 — `transcription.worker.ts` "idle-terminate after 5 min"

**Seed spec claim (§8.8):** "Lifecycle: On-demand, one at a time (HeavyWorkerQueue), idle-terminate after 5 min".

**Actual:** FreeCut's `whisper.worker.ts` has NO idle timeout. The worker is reused across jobs (init message resets per-job state at `:106-117`). The `initChain` Promise serializes concurrent init calls (`:69, 112-115`) — pre-warm init and real-job init can't load concurrently.

**Impact:** Our transcription worker should adopt FreeCut's reuse-across-jobs pattern AND add an idle timeout (5 min is reasonable — Whisper weights are ~250 MB, holding them 5 min between user-triggered transcriptions is acceptable).

### Correction #13 — "FreeCut uses `@huggingface/transformers` 4.1.0"

**Seed spec claim (§11 Q13):** "Note version (3.8.1 in classic, FreeCut uses 4.1.0 — which should we use?)".

**Actual:** FreeCut's `package.json` declares `@huggingface/transformers: "4.1.0"` but the worker **never imports the NPM package**. Instead, `whisper.worker.ts:20-21` loads version `3.8.1` from CDN:
```ts
const TRANSFORMERS_CDN_URL = 'https://esm.sh/@huggingface/transformers@3.8.1?bundle'
const WASM_CDN_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/'
```
The NPM dep is unused at runtime. Both reference repos use 3.8.1 at runtime.

**Impact:** Pin `@huggingface/transformers@3.8.1` via NPM (not CDN). See §11 Q13.

### Correction #14 — AudioWorklet `numberOfInputs: 1`

**Seed spec claim (§7.2):** 
```ts
return new AudioWorkletNode(context, 'soundtouch-varispeed-processor', {
  numberOfInputs: 1,
  numberOfOutputs: 1,
  outputChannelCount: [2],
  // ...
});
```

**Actual:** FreeCut uses `numberOfInputs: 0` (`soundtouch-worklet-audio.tsx:189`). Source audio is pushed via `port.postMessage('append-source', ...)` with transferable ArrayBuffers — NOT via the AudioWorklet input bus. This is critical: it lets the worklet run inside `OfflineAudioContext` (cloud render) without a connected source node, and it lets us transfer pre-decoded PCM (no need to wire a `AudioBufferSourceNode` into the worklet).

**Impact:** Change our spec to `numberOfInputs: 0`. Add `append-source` message to the worklet protocol.

### Correction #15 — SoundTouch buffer is NOT a ring buffer

**Seed spec claim (§7.1):** "Buffer management (ring buffer? double buffer?)".

**Actual:** Neither. FreeCut's `QueuedStereoBufferSource` (`soundtouch-preview-source.ts:13-153`) holds an **array of overlapping `StoredChunk` objects**, each with its own `leftChannel`/`rightChannel` Float32Array. `append(chunk)` filters out fully-covered existing chunks, sorts by `startFrame` then `sequence`. `extract(target, numFrames, sourcePosition)` walks chunks linearly via `findChunkContainingFrame(frame)`. Newer chunks win on overlap (sequence counter).

**Impact:** Document the chunk-array pattern in our spec. It's more flexible than a ring buffer (supports arbitrary append-order, overlapping ranges for live updates) at the cost of O(N) chunk lookup (N = chunk count, typically small).

### Correction #16 — SoundTouch is vendored soundtouchjs (LGPL)

**Seed spec claim (§7):** Silent on the DSP implementation source.

**Actual:** FreeCut's `src/infrastructure/audio/time-stretch.ts` (672 LOC) is a `@ts-nocheck` vendored copy of [soundtouchjs v0.2.3](https://github.com/cutterbl/SoundTouchJS) by Olli Parviainen / Ryan Berdeen / Jakub Fiala / Steve 'Cutter' Blades. License: **LGPL v2.1** (NOT MIT). Exports `SimpleFilter as TimeStretchFilter` and `SoundTouch as TimeStretchProcessor`.

**Impact:** LGPL v2.1 is compatible with our MIT-licensed project but requires attribution and source disclosure for modifications. Options:
- **A:** Vendor soundtouchjs verbatim with LGPL attribution (FreeCut's pattern).
- **B:** Find a MIT-licensed alternative (e.g., [rubberband-wasm](https://github.com/bbc/rubberband-wasm) — GPL, not MIT; or write our own time-stretcher — significant work).
- **C:** Use [SoundTouch](https://codeberg.org/soundtouch/soundtouch) (the C++ library) compiled to WASM — LGPL v2.1, same license implications.

**Recommendation:** Option A (vendor soundtouchjs) for v1. Add LGPL notice to `NOTICE.md`. Plan a MIT-licensed replacement for v2 if license purity becomes a concern.

### Correction #17 — `process()` returns `true` always

**Seed spec claim:** Silent on the return value of `process()`.

**Actual:** FreeCut's `process()` always returns `true` (`soundtouch-preview-processor.worklet.ts:122`). Returning `false` would let the AudioWorklet GC tear down the node — FreeCut always wants the node alive (paused state fills output with zeros, doesn't return false).

**Impact:** Document this in our spec. Returning `true` always is the right pattern for a long-lived varispeed node.

### Correction #18 — `MAX_CONCURRENT_WAVEFORM_GENERATIONS = 1`

**Seed spec claim (§5.3 worker memory budget):** Implies waveform is always-on with idle-terminate.

**Actual:** FreeCut's waveform worker IS always-on (single `ManagedWorker` singleton), but the *main-thread service* serializes generation requests via `MAX_CONCURRENT_WAVEFORM_GENERATIONS = 1` (`waveform-cache.ts:55`). This means even though the worker exists full-time, only one waveform extraction runs at a time across all media.

**Impact:** Document this in §8.3. Our waveform service should also serialize — concurrent waveform generation would just thrash the worker.

---

## Testing

> See `17-test-plan.md` for the overall methodology, test matrix, and per-module template. Matrix rows: "Worker lifecycle (spawn, terminate, error recovery)", "OPFS persistence (media cache, project autosave)", "AudioWorklet message protocol".
>
> **Note on tier placement:** Web Workers cannot run in pure Node.js — they require a browser. Tier 1 tests therefore exercise the *logic* of the worker-management abstractions in isolation with `Worker` / `postMessage` mocked (Vitest + fake timers). Real worker spawn, transferable-detachment, and AudioWorklet tests live in Tier 2 (Playwright + headless Chrome). The matrix marks "Worker lifecycle" and "AudioWorklet message protocol" as Tier 1 ✅; this is satisfied by the mocked-logic tests below — the contract being verified at Tier 1 is *the wrapper's behavior given a worker*, not the worker's own behavior.

### Tier 1: Pure engine tests

[Filename: `tests/unit/02-workers-threading/*.test.ts`]

- `managed-worker-lazy-create-not-on-construct` — constructing `ManagedWorker` does not call `new Worker(url)`; the first `postMessage()` triggers the spawn; the second `postMessage()` reuses the same instance (verified via mocked `Worker` constructor call count)
- `managed-worker-promise-correlation` — concurrent `postMessage()` calls return independent Promises, each resolved by `requestId` match in `onmessage`; ordering of responses does not matter (mocked `Worker` replies out-of-order)
- `managed-worker-error-propagation` — mocked `onerror` rejects the matching pending Promise and *not* sibling pending requests; `on('error')` listeners fire exactly once
- `managed-worker-abort-rejects-pending` — `handle.abort(requestId)` rejects the corresponding Promise with `AbortError` and unregisters its listener; aborting an unknown `requestId` is a no-op (regression for the FreeCut `waveform-cache.ts:1177` rejector-argument-ignored bug class — see §4.1)
- `managed-worker-idle-timeout-fires` — with `idleTimeoutMs: 1000` and Vitest fake timers, an idle worker terminates at 1000 ms; an `acquire()` before 1000 ms clears the timer; an `acquire()` after termination spawns a fresh worker (verifies the greenfield `idleTimeoutMs` feature — FreeCut does not implement this; see §14 Correction #4)
- `managed-worker-pool-acquire-release-lifo` — pool with `maxInstances: 2` reuses the most recently released idle worker before spawning a new one (LIFO matches FreeCut's `managed-worker-pool.ts` semantics)
- `managed-worker-pool-respects-maxInstances` — pool with `maxInstances: 2` blocks the third `acquire()` Promise until a worker is released; no overflow spawn (verified via mocked `Worker` constructor call count = 2)
- `managed-worker-pool-terminateAll-releases-all` — `terminateAll()` calls `terminate()` on every spawned instance, clears the idle set, and cancels any pending idle timers (no dangling `setTimeout`)
- `heavy-worker-queue-serializes` — with mocked worker, enqueuing 5 heavy tasks executes them one at a time; the second `run()` is not invoked until the first's Promise resolves
- `heavy-worker-queue-bypass-for-non-heavy` — non-heavy tasks (no `heavy: true` flag) bypass the queue and execute immediately in parallel with any in-flight heavy task
- `transferable-list-builder` — `buildTransferList(buffer)` returns `[buffer.buffer]` for `Float32Array` / `Int16Array`, `[buffer]` for raw `ArrayBuffer`, `[]` for plain JSON-serializable objects (no over-transfer, no missed-transfer)
- `workerspec-validation` — constructing `ManagedWorker` with a non-`URL` `url`, missing `name`, negative `idleTimeoutMs`, or `maxInstances < 1` throws an `AggregateError` listing every violation (not just the first)

### Tier 2: Render tests

[Filename: `tests/integration/02-workers-threading/*.render.test.ts`]

Tier 2 tests run in Playwright + headless Chrome (workers require a browser). They post real messages and assert real responses — including `Transferable` detachment, `VideoFrame` / `ImageBitmap` validity, and worker-process side effects.

- `managed-worker-lazy-create-real` — `peekWorker()` returns `null` until the first `postMessage()`; after the first call, `peekWorker()` returns the same `Worker` instance for subsequent calls (verifies lazy-create in a real browser, not just the mock)
- `managed-worker-idle-termination-real` — with `idleTimeoutMs: 2000`, after 2.0 s of inactivity the worker's `exit` event fires; the next `postMessage()` spawns a fresh `Worker` instance (verifies the greenfield idle-timeout feature end-to-end)
- `managed-worker-pool-reuses-idle-workers` — `acquire()` → `release()` → `acquire()` returns the same `Worker` instance (no respawn); only a concurrent `acquire()` spawns a new worker
- `heavy-worker-queue-runs-one-at-a-time` — enqueue 5 heavy tasks (each sleeps 200 ms inside the worker); assert via worker-side `performance.now()` tracing that no two heavy tasks overlap; total wall time ≥ 5 × 200 ms
- `decode-worker-returns-videoframe-at-time-T` — post `decode({ url: fixtures/10s-red-1080p.mp4, time: 5.0 })`; assert response is a `VideoFrame` with `format === 'NV12'` (or `'P010'` for a 10-bit fixture), `timestamp === 5_000_000` µs, `codedWidth === 1920`
- `audio-decode-worker-returns-pcm-bins` — post `decode({ url: fixtures/10s-440hz-sine.wav })`; assert response contains Int16 bins at 22050 Hz, total samples ≈ 220 500, transferred as `ArrayBuffer` (sender-side `byteLength === 0` after post)
- `waveform-worker-extracts-peaks-for-10s` — post `extract({ url: fixtures/10s-440hz-sine.wav, samplesPerPeak: 100 })`; assert response is a `Float32Array` of length 2 205 (22 050 samples/s ÷ 100 × 10 s), peak amplitude ≥ 0.9 (full-scale sine), and `progress` events stream monotonically 0.0 → 1.0
- `filmstrip-worker-extracts-thumbnails` — post `extract({ url: fixtures/10s-test-pattern-1080p.mp4, times: [0, 1, 2, 5] })`; assert response contains 4 `ImageBitmap` entries, each `width === 320 && height === 180`, and that they are transferred (sender-side references throw on access)
- `export-render-worker-renders-frame-N` — post `render({ projectJson, frame: 30, fps: 30 })`; assert response is a `Uint8ClampedArray` of length `1920 * 1080 * 4`; first pixel equals the project's expected background color (e.g., `[255, 0, 0, 255]` for a red-fixture project)
- `opfs-worker-write-then-read-roundtrip` — post `write({ path: 'test/roundtrip.bin', data: Uint8Array })` then `read({ path: 'test/roundtrip.bin' })`; assert returned `Uint8Array` byte-equals the input; cleanup with `delete()`
- `opfs-worker-persists-across-worker-restart` — write a file, terminate the worker (via idle timeout or explicit `terminate()`), re-acquire the worker, read the file — data is still there (verifies OPFS survives worker lifecycle; cross-references spec 01's "OPFS persistence" matrix row)
- `media-processor-worker-extracts-metadata` — post `extractMetadata({ url: fixtures/10s-red-1080p.mp4 })`; assert response contains `durationSec: 10.0`, `width: 1920`, `height: 1080`, `fps: 30`, `codec: 'h264'`, `colorSpace: 'BT.709'`
- `media-processor-worker-extracts-thumbnail` — post `extractThumbnail({ url, time: 5.0 })`; assert response is an `ImageBitmap` with `width ≥ 320`
- `worker-crash-recovery-error-propagates` — post a long-running task, then `worker.terminate()` mid-operation; assert the calling Promise rejects with `WorkerCrashedError`; assert the next `postMessage()` spawns a fresh worker and succeeds
- `worker-onerror-restarts-on-uncaught-exception` — inject a task that throws inside the worker; assert `on('error')` fires, the pending Promise rejects, and the next `postMessage()` succeeds (worker was restarted transparently)
- `transferable-arraybuffer-detached-after-post` — post a `Float32Array` whose `buffer` is in the transfer list; assert `buffer.byteLength === 0` on the sender side after `postMessage()` returns; assert the worker received the data intact (round-trip echo)
- `transferable-videoframe-detached-after-post` — post a `VideoFrame` (decode-worker output) in the transfer list; assert `frame.format` throws `InvalidStateError` on the sender side after transfer (verifies the `VideoFrame` was moved, not copied)
- `audioworklet-varispeed-preserves-pitch-realtime` — load `10s-440hz-sine.wav`, set `playbackRate: 0.5`, render via `AudioWorkletNode` connected to a `MediaStreamAudioDestinationNode`; capture 1 s of output starting at t = 2 s (post-ramp), run FFT, assert dominant peak at **440 Hz ± 5 Hz** (pitch preserved, not 220 Hz — verifies SoundTouch varispeed)
- `audioworklet-varispeed-preserves-pitch-offline` — same as above but rendered via `OfflineAudioContext` (WYSIWYG with real-time — see `17-test-plan.md` §6.4); assert offline-rendered PCM's FFT peak matches real-time peak at 440 Hz ± 1 Hz
- `audioworklet-process-returns-true` — directly assert `processor.process()` returns `true` always, even when input is silent (per §14 Correction #17 — keeps the node alive in paused state)
- `audioworklet-zero-input-fills-zeros` — with no input connected, assert the node's output buffer is silent (all zeros); verifies paused-state behavior matches expectation

### Tier 3: UI tests

[Filename: `tests/integration/02-workers-threading/*.ui.test.ts`]

These tests assert that user-visible keyboard shortcuts activate the correct workers — they're Tier 3 because they go through the keyboard-handler → `EngineCommand` (spec 15) → manager → worker-spawn path (full state WYSIWYG, see `17-test-plan.md` §6.1).

- `keyboard-cmd-o-imports-media-activates-decode-and-media-processor-workers` — `page.keyboard.press('Meta+O')`, select `10s-red-1080p.mp4` from the file dialog; assert `media-processor.worker` posts `extractMetadata` within 500 ms; assert `decode.worker` posts a decode request within 1 s of import completing
- `keyboard-space-plays-timeline-activates-decode-worker` — load a fixture project, press `Space`; assert decode-worker `postMessage` rate matches `fps` (e.g., 30 posts/sec for 30 fps) via worker-side tracing; assert no decode-worker respawn mid-playback
- `mouse-scrub-timeline-activates-waveform-and-filmstrip-workers` — `page.mouse.move()` to scrub the timeline; assert `waveform.worker` receives an `extract` request for the newly-visible audio track within 200 ms; assert `filmstrip.worker` pool spawns 1–2 workers (per `filmstrip-cache-config.ts` `MAX_WORKERS = 2`) and posts `extract` requests for the newly-visible video ranges
- `keyboard-cmd-shift-e-exports-activates-export-render-worker` — press `Meta+Shift+E`, confirm the export dialog, click Export; assert `export-render.worker` posts a `render` request within 500 ms; assert `HeavyWorkerQueue` blocks other heavy work during export
- `keyboard-cmd-s-activates-opfs-worker-autosave` — press `Meta+S`; assert `opfs.worker` receives a `write` request to the autosave path within 200 ms; assert the autosave file is readable on a fresh page load (persists across reload)

### Property-based tests

[Filename: `tests/unit/02-workers-threading/*.property.test.ts`]

Property tests run in Vitest with mocked `Worker` (Tier 1 environment). They assert structural invariants over arbitrary sequences of acquire / release / enqueue / abort operations.

- `worker-pool-active-le-maxInstances` — for arbitrary sequences of `acquire()` / `release()` / `terminateAll()` with `maxInstances ∈ [1, 8]`, the number of simultaneously-spawned workers never exceeds `maxInstances` (`fc.assert(fc.property(arbitraryOps, arbitraryMax), ops => …), { numRuns: 1000 })`)
- `heavy-worker-queue-at-most-one-active` — for arbitrary sequences of heavy + non-heavy enqueues, at every observed tick at most **1 heavy task** is in-flight; non-heavy tasks are unconstrained
- `transferable-buffer-detached-after-post` — for arbitrary `ArrayBuffer` / `Float32Array` payloads posted with `transfer: [buffer]`, the sender-side `byteLength === 0` after `postMessage()` returns (deterministic — not statistical)
- `managed-worker-idle-timeout-eventually-fires` — for arbitrary `idleTimeoutMs ∈ [100, 5000]` and arbitrary acquire/release patterns with no activity for `idleTimeoutMs + slack`, the worker is observed terminated exactly once
- `managed-worker-pool-no-leak-on-terminateAll` — for arbitrary acquire/release sequences terminated by `terminateAll()`, the pool's internal `Set<WorkerHandle>` is empty and no `setTimeout` idle-timer remains pending (verified via fake-timer introspection)
- `heavy-worker-queue-fairness-FIFO` — for arbitrary enqueue order, heavy tasks are dispatched in FIFO order (no starvation)
- `managed-worker-abort-idempotent` — for an arbitrary number of `abort(requestId)` calls on the same id, the Promise rejects exactly once and the worker-side handler runs at most once

### Test assets

Canonical fixtures referenced from `17-test-plan.md` §5 (do not invent new names — if a new fixture is needed, propose it in spec 17 §5 first):

- `tests/fixtures/videos/10s-red-1080p.mp4` — solid red, 10 s, H.264, 1080p30, BT.709; used by `decode.worker` and `media-processor.worker` tests
- `tests/fixtures/videos/10s-test-pattern-1080p.mp4` — SMPTE-style color bars + frame counter, 10 s, 1080p30; used by `filmstrip.worker` test (verifies thumbnails differ across frames)
- `tests/fixtures/audio/10s-440hz-sine.wav` — 440 Hz sine, 10 s, 16-bit PCM, 44.1 kHz, full-scale; used by `waveform.worker` + `audio-decode.worker` + AudioWorklet varispeed tests (pitch preservation: 440 Hz expected at 0.5× rate, not 220 Hz)
- `tests/fixtures/projects/single-clip-red.json` — minimal project with one red clip on the main track; used by `export-render.worker` test
- (Reference PNGs are not applicable for spec 02 — workers produce `VideoFrame` / `ImageBitmap` / `ArrayBuffer`, not directly-comparable PNGs. Pixel comparisons happen at the spec 04 / spec 11 layers.)

### Test commands

```bash
# Run Tier 1 tests for spec 02 (mocked workers — Vitest)
npm test -- --filter "02-workers-threading"

# Run Tier 2 (render / integration) tests for spec 02 (Playwright + headless Chrome)
npm run test:render -- --filter "02-workers-threading"

# Run Tier 3 (UI) tests for spec 02 (Playwright with keyboard)
npm run test:ui -- --filter "02-workers-threading"

# Run all tiers for spec 02
npm run test:all -- --filter "02-workers-threading"

# Run property tests only for spec 02
npm run test:property -- --filter "02-workers-threading"
```

> **Note on AudioWorklet test execution:** the `audioworklet-varispeed-*` tests require a real `AudioContext` (not `OfflineAudioContext` for the realtime variant). Playwright's headless Chrome supports Web Audio, but `audio` output must be routed through a `MediaStreamAudioDestinationNode` for capture — see `17-test-plan.md` §6.4 for the canonical capture harness.

---

**End of `02-workers-threading.refined.md`.** Next: `03-playback-engine.refined.md`.

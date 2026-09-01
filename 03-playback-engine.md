# 03 — Playback Engine: Clock, Decode, Sync, Scrubbing, Varispeed

**Stream:** Real-time playback pipeline
**Status:** Seed spec (sub-agent scout will refine with code references)
**Primary teacher:** FreeCut `Clock.ts` + OpenCut-classic `PlaybackManager`
**Spec file:** `03-playback-engine.md`

---

## 1. Purpose

Define how the engine plays back video + audio in real time, frame-accurately, with smooth scrubbing and varispeed support. This is the most performance-critical stream — any drift, jitter, or stall is immediately visible to the user.

---

## 2. Goals

1. **Frame-accurate playback.** At 30fps, frame N must be displayed at exactly N/30 seconds (±half a frame).
2. **No AV drift.** Audio and video stay in sync for the full duration — no progressive drift.
3. **Smooth scrubbing.** Drag the playhead, see frames appear within 50ms of the drag stop.
4. **Varispeed without audio glitch.** Play at 0.5×, 2×, -1× (reverse) without audio stutter.
5. **Cloud-render parity.** `createRenderEngine().renderFrame(N)` produces the same pixels as the browser at frame N.

---

## 3. The Clock — FreeCut's Key Insight

### 3.1 The problem with `performance.now()`

Most browser media players use `performance.now()` + `requestAnimationFrame` to drive playback:

```ts
function tick() {
  const now = performance.now();
  const elapsed = now - startTime;
  const currentFrame = Math.floor(elapsed / (1000 / fps));
  // render frame currentFrame
  requestAnimationFrame(tick);
}
```

**The flaw:** `performance.now()` is monotonic but subject to JS event loop jitter. If GC pauses for 5ms, the next `rAF` is delayed, the elapsed time jumps, and you skip a frame. Worse, audio plays through a separate `AudioContext` whose clock runs on the audio hardware — those two clocks drift, and after 10 minutes you have visible AV desync.

### 3.2 FreeCut's solution — `AudioContext.currentTime` as ground truth

FreeCut's `Clock.ts` (642 LOC, zero UI deps) uses **`AudioContext.currentTime` as the master clock**:

```ts
// FreeCut's pattern (sketch — sub-agent to verify exact code)
class Clock {
  private audioContext: AudioContext;
  private startTime: number;  // audioContext.currentTime at play start
  private startMediaTime: MediaTime;
  
  private _now(): MediaTime {
    const audioElapsed = this.audioContext.currentTime - this.startTime;
    return mediaTimeAdd(this.startMediaTime, mediaTimeFromSeconds({ seconds: audioElapsed }));
  }
  
  // rAF loop drives frame computation; audio clock drives time
  private _startAnimationLoop() {
    const tick = () => {
      const current = this._now();
      const frame = this._computeFrameAtTime(current);
      this._renderFrame(frame);
      this._animationFrameId = requestAnimationFrame(tick);
    };
    this._animationFrameId = requestAnimationFrame(tick);
  }
  
  private _computeFrameAtTime(time: MediaTime): number {
    // floor for forward, ceil for reverse (FreeCut pattern)
    return this.rate >= 0 
      ? floorToFrame({ time, rate: this.fps })
      : ceilToFrame({ time, rate: this.fps });
  }
}
```

**Why this works:**
- The audio hardware clock runs on its own crystal, independent of the JS event loop
- Even if GC pauses or rAF is missed, the audio clock keeps accurate time
- The next rAF snaps to the correct frame based on the audio clock, not the wall clock
- Audio and video are derived from the same source — no drift possible by construction

### 3.3 What we adopt

We adopt FreeCut's `Clock.ts` essentially verbatim. Sub-agent scout to read the full file (`src/runtime/player/clock/Clock.ts` in FreeCut, ~642 LOC) and document:
- The `_now()` method — exact implementation
- The monotonic offset map for source switching
- `seekToFrame` — does it re-anchor if playing?
- `setInPoint` / `setOutPoint` for range playback
- `_catchUpToCurrentTime` — visibility/focus re-catch-up logic
- Edge cases (rate = 0, negative rates, very large seeks)

### 3.4 StaticClock (render entry)

For the cloud render entry point, we use a `StaticClock` that doesn't advance on its own:

```ts
class StaticClock implements Clock {
  private current: MediaTime = mediaTimeFromSeconds({ seconds: 0 });
  private rate: number = 1;
  
  now(): MediaTime { return this.current; }
  start(): void { /* no-op */ }
  stop(): void { /* no-op */ }
  seek(time: MediaTime): void { this.current = time; }
  setRate(rate: number): void { this.rate = rate; }
  onTick(cb: (time: MediaTime) => void): () => void { return () => {}; }
  
  // For render: step manually
  stepTo(time: MediaTime): void { this.current = time; }
}
```

The render engine calls `clock.stepTo(timeForFrameN)` before each `renderFrame(N)`. Same math, no real-time scheduling.

---

## 4. MediaTime & FrameRate

### 4.1 MediaTime (integer ticks)

```ts
// src/engine/types/media-time.ts

declare const __mediaTime: unique symbol;
export type MediaTime = number & { readonly __mediaTime: unique symbol };

export const TICKS_PER_SECOND = 120_000;

export function mediaTimeFromSeconds({ seconds }: { seconds: number }): MediaTime {
  if (!Number.isFinite(seconds)) throw new Error(`Invalid seconds: ${seconds}`);
  return Math.round(seconds * TICKS_PER_SECOND) as MediaTime;
}

export function mediaTimeToSeconds({ time }: { time: MediaTime }): number {
  return time / TICKS_PER_SECOND;
}

export function mediaTimeFromFrame({ frame, rate }: { frame: number; rate: FrameRate }): MediaTime {
  // ticks = frame * TICKS_PER_SECOND * denom / num
  // e.g., 29.97 (30000/1001): frame * 120000 * 1001 / 30000 = frame * 4004
  const ticksPerFrame = Math.round(TICKS_PER_SECOND * rate.denominator / rate.numerator);
  return (frame * ticksPerFrame) as MediaTime;
}

export function mediaTimeToFrame({ time, rate }: { time: MediaTime; rate: FrameRate }): number {
  const ticksPerFrame = Math.round(TICKS_PER_SECOND * rate.denominator / rate.numerator);
  return Math.floor(time / ticksPerFrame);
}

export function roundToFrame({ time, rate }: { time: MediaTime; rate: FrameRate }): MediaTime {
  return mediaTimeFromFrame({ frame: mediaTimeToFrame({ time, rate }), rate });
}

export function floorToFrame({ time, rate }: { time: MediaTime; rate: FrameRate }): MediaTime {
  return mediaTimeFromFrame({ frame: Math.floor(mediaTimeToFrame({ time, rate })), rate });
}

export function mediaTimeAdd(a: MediaTime, b: MediaTime): MediaTime { return (a + b) as MediaTime; }
export function mediaTimeSub(a: MediaTime, b: MediaTime): MediaTime { return (a - b) as MediaTime; }
export function mediaTimeMin(a: MediaTime, b: MediaTime): MediaTime { return Math.min(a, b) as MediaTime; }
export function mediaTimeMax(a: MediaTime, b: MediaTime): MediaTime { return Math.max(a, b) as MediaTime; }
export function mediaTimeClamp({ time, min, max }: { time: MediaTime; min: MediaTime; max: MediaTime }): MediaTime {
  return mediaTimeMax(min, mediaTimeMin(max, time));
}
```

**Adopted from:** OpenCut-classic `rust/crates/time/src/`. Sub-agent scout to verify the exact tick count (120,000) and that all standard frame rates divide evenly.

### 4.2 FrameRate (rational)

```ts
// src/engine/types/frame-rate.ts

export interface FrameRate {
  numerator: number;   // e.g., 30000
  denominator: number; // e.g., 1001 for 29.97
}

export const FRAME_RATES = {
  '23.976': { numerator: 24000, denominator: 1001 },
  '24':     { numerator: 24, denominator: 1 },
  '25':     { numerator: 25, denominator: 1 },
  '29.97':  { numerator: 30000, denominator: 1001 },
  '30':     { numerator: 30, denominator: 1 },
  '48':     { numerator: 48, denominator: 1 },
  '50':     { numerator: 50, denominator: 1 },
  '59.94':  { numerator: 60000, denominator: 1001 },
  '60':     { numerator: 60, denominator: 1 },
  '120':    { numerator: 120, denominator: 1 },
} as const;

export type FrameRatePreset = keyof typeof FRAME_RATES;

export function frameRateToNumber(rate: FrameRate): number {
  return rate.numerator / rate.denominator;
}
```

### 4.3 Why integer ticks + rational rates

- `23.976` stored as `23.976` is a lie — it's actually `24000/1001` ≈ 23.976023976...
- Float arithmetic accumulates drift: 1000 ops of `time + (1/23.976)` is off by ~sub-millisecond
- Integer ticks (120,000/sec) divide evenly by 24, 25, 30, 50, 60, 120, and even drop-frame rates (23.976 → 5005 ticks/frame, 29.97 → 4004 ticks/frame)
- Rational `FrameRate` makes 29.97 exact (`30000/1001`), no representation error

**This is the single biggest correctness win we adopt from OpenCut-classic.**

---

## 5. Decode Pipeline (WebCodecs + mediabunny)

### 5.1 Why mediabunny+WebCodecs, not `<video>`

FreeCut uses HTML5 `<video>` + `requestVideoFrameCallback` for preview decode. We override this:

| Concern | `<video>` + RVFC | WebCodecs via mediabunny |
|---|---|---|
| Frame accuracy | Approximate (browser may skip) | Exact (one `VideoFrame` per call) |
| Codec extensibility | Browser's native set only | WebCodecs set + custom decoders (ProRes via `register-prores-decoder`) |
| Worker compatibility | ❌ `<video>` cannot run in worker | ✅ `VideoDecoder` runs in worker |
| 10-bit support | ❌ Browser canvas is 8-bit | ✅ `pixelFormat: 'P010'` |
| Frame caching | Implicit (browser-managed) | Explicit (we control) |

### 5.2 The decode worker

`decode.worker.ts` (see `02-workers-threading.md` §8.1) handles all video decode. It:
1. Receives `{type: 'init', mediaId, source: Blob}` and constructs a mediabunny `Input` + `VideoTrack` + `VideoSampleSink` (NOT `CanvasSink` — we need raw `VideoFrame`s, not 2D canvas draws)
2. Receives `{type: 'decode', mediaId, time}` and returns the `VideoFrame` at that time (or nearest available)
3. Caches recently-decoded frames (small LRU, ~5 frames per source)
4. Releases frames when no longer needed (via `VideoFrame.close()`)

### 5.3 The 10-bit configuration

```ts
// Inside decode.worker.ts

import { Input, BlobSource, ALL_FORMATS } from 'mediabunny';

async function initDecoder(source: Blob) {
  const input = new Input({ source: new BlobSource(source), formats: ALL_FORMATS });
  const videoTrack = await input.getPrimaryVideoTrack();
  const canDecode = await videoTrack.canDecode();
  if (!canDecode) throw new Error('Cannot decode this video');
  
  // Use VideoSampleSink (not CanvasSink) to get raw VideoFrame objects
  // Configure for 10-bit P010 output
  const sink = new VideoSampleSink(videoTrack, {
    pixelFormat: 'P010',  // 10-bit YUV 4:2:0 planar
    // Other options sub-agent to verify against mediabunny API
  });
  
  return { input, videoTrack, sink };
}

async function decodeAt(time: MediaTime, fps: FrameRate): Promise<VideoFrame> {
  const frame = await sink.seek(mediaTimeToSeconds({ time }));
  return frame;  // VideoFrame is transferable via .clone()
}
```

**Sub-agent scout task:** Read mediabunny's source / docs to verify:
- `VideoSampleSink` exists (or equivalent — might be `VideoFrameSink`)
- `pixelFormat: 'P010'` is supported
- The exact API for seek + decode + read frame
- Whether `VideoFrame` is transferable across worker boundary (likely needs `.clone()` first)

### 5.4 Source pool

Multiple timeline elements may reference the same source clip (e.g., split into 3 parts). Don't decode the same source 3 times — pool:

```ts
class VideoSourcePool {
  private sources: Map<string, { decoder: Decoder, refCount: number }> = new Map();
  
  acquire(mediaId: string, source: Blob): Decoder {
    const existing = this.sources.get(mediaId);
    if (existing) {
      existing.refCount++;
      return existing.decoder;
    }
    const decoder = new Decoder(source);
    this.sources.set(mediaId, { decoder, refCount: 1 });
    return decoder;
  }
  
  release(mediaId: string) {
    const existing = this.sources.get(mediaId);
    if (!existing) return;
    existing.refCount--;
    if (existing.refCount <= 0) {
      existing.decoder.dispose();
      this.sources.delete(mediaId);
    }
  }
}
```

**FreeCut reference:** `src/runtime/player/video/VideoSourcePool.ts`. Sub-agent scout to read in full and document the pool management, eviction policy, and integration with the decode worker.

---

## 6. The Five RVFC Sync Plans (Borrow from FreeCut)

FreeCut's `video-content.tsx` (1,300 LOC) has **five distinct sync plans** for different playback states:

1. **Paused-frame sync** — when paused, sync video to the seeked frame
2. **Initial playing sync** — when transitioning from pause to play, sync to the first frame
3. **Drift correction** — during playback, if video drifts from audio clock, snap back
4. **Premount sync** — when about to play, premount the first frame to avoid black flash
5. **Reverse shuttle** — when playing backwards (negative rate), special handling

**Sub-agent scout task:** Read `src/runtime/composition-runtime/components/video-content.tsx` and `video-sync-plan.ts` in FreeCut. Document each plan's:
- Trigger condition (when does it activate?)
- Sync mechanism (how does it align video to clock?)
- Edge cases (rate change mid-plan, seek during plan, etc.)

### 6.1 Our adaptation

We don't use `<video>` + RVFC, so the sync plans look different — but the *problems* are the same:

1. **Paused-frame sync** → decode worker fetches frame N, GPU renders to canvas
2. **Initial playing sync** → premount frame N, when play starts, advance to N+1 on next tick
3. **Drift correction** → if decode is slow and frame N+1 isn't ready when clock says it should be, skip ahead or show last available frame (sub-agent to study FreeCut's choice)
4. **Premount sync** → prefetch frame N+1 during frame N's display
5. **Reverse shuttle** → prefetch frame N-1, handle direction-aware frame stepping

These become states in our `PlaybackManager`:

```ts
type PlaybackState =
  | { kind: 'paused'; frame: number }
  | { kind: 'playing'; startFrame: number; startTime: MediaTime; rate: number }
  | { kind: 'seeking'; targetFrame: number; currentFrame: number }
  | { kind: 'scrubbing'; targetFrame: number; prefetchAhead: number };
```

---

## 7. Scrubbing

### 7.1 The seek-generation pattern

When the user scrubs rapidly, multiple decode requests can be in flight. We must:
1. Invalidate stale requests (don't display an old frame that arrived late)
2. Prefetch ahead of the scrub direction for smoothness
3. Fall back to lower-quality (proxy) frames if decode can't keep up

OpenCut-classic's `VideoCache` uses a `seekGenerations` counter to invalidate stale seeks. We adopt this pattern:

```ts
class VideoCache {
  private seekGeneration: number = 0;
  
  async seek(time: MediaTime): Promise<VideoFrame> {
    const myGen = ++this.seekGeneration;
    const frame = await this.decoder.decode(time);
    if (myGen !== this.seekGeneration) {
      // Stale — discard
      frame.close();
      throw new Error('Stale seek');
    }
    return frame;
  }
}
```

**OpenCut-classic reference:** `apps/web/src/services/video-cache/service.ts` (338 LOC). Sub-agent scout to read in full and document:
- The `seekGenerations` pattern
- The current/next-frame prefetch chain
- Cache eviction policy
- How it handles decode failures

### 7.2 Scrubbing cache (separate from playback cache)

Scrubbing has different requirements from playback:
- Latency matters more than throughput (show *something* fast)
- Backward scrubbing is common (don't assume forward prefetch)
- User may stop scrubbing at any time (cleanup)

FreeCut has a separate `scrubbing-cache.ts` (`src/features/preview/utils/`). Sub-agent scout to read in full and document:
- `scrubbing-cache.ts` — the cache itself
- `fast-scrub-prewarm.ts` — prewarm logic
- `fast-scrub-overlay-guard.ts` — overlay guard
- `scrub-proxy-fallback.ts` — proxy fallback when decode can't keep up
- `scrub-throttle.ts` — throttling decode requests
- `decoder-prewarm.ts` — decoder prewarm
- `preview-scrubbing-cache-bridge.ts` — bridge between preview and scrubbing

These are a lot of files — they encode the accumulated insight of "how to make scrubbing feel good." We adopt the patterns, possibly simplified.

### 7.3 Target: 50ms scrub latency

From user pointer stop to frame on screen: ≤50ms. This is achievable if:
- Decode worker is warm (prewarmed)
- Cache hit rate is high (prefetch ahead works)
- Proxy fallback kicks in for slow sources

---

## 8. Varispeed (Audio Worklet)

### 8.1 The problem

At 1× speed, audio plays at the source sample rate. At 0.5× speed:
- Option A: Play at half sample rate → pitch drops an octave (bad for speech)
- Option B: Time-stretch without pitch change → pitch preserved (what we want)

Option B requires SoundTouch (or similar) DSP. OpenCut-classic runs this on the main thread (`soundtouchjs`) — stutters under load. FreeCut runs it in an AudioWorklet — runs on the audio render thread, immune to main-thread jank.

### 8.2 Our approach

Adopt FreeCut's pattern: a SoundTouch AudioWorklet processor that:
1. Receives stereo PCM chunks via `port.onmessage` (or via message port from a source node)
2. Receives tempo/pitch/seek commands via `port.onmessage`
3. Emits stretched samples in `process(inputs, outputs, parameters)`
4. Handles real-time (interactive) and offline (render) modes identically (just different scheduling)

**FreeCut reference:** `src/runtime/composition-runtime/worklets/soundtouch-preview-processor.worklet.ts`. Sub-agent scout to read in full and document:
- The `AudioWorkletProcessor` registration
- The `process()` implementation
- Buffer management (input ring buffer, output ring buffer)
- How tempo/pitch changes are applied mid-stream
- The `port.onmessage` command protocol
- How seek is handled (flush buffers? reset state?)

### 8.3 Varispeed in cloud render

For `OfflineAudioContext`, the same worklet runs but processes faster than real-time. Same code, different scheduling. WYSIWYG preserved.

### 8.4 Reverse playback

Negative rates (e.g., -1× for reverse) require:
- Decode frames in reverse order (mediabunny can do this; OpenCut-classic has `reverse-shuttle-audio.ts`)
- Audio DSP that reverses + time-stretches (SoundTouch can do this)

**FreeCut reference:** `src/runtime/composition-runtime/utils/reverse-shuttle-audio.ts` (mentioned in audit). Sub-agent scout to read and document.

---

## 9. Audio Pipeline

### 9.1 The audio graph

```
Source clip (decode worker)
    │ (PCM samples via postMessage)
    ▼
AudioBufferSourceNode (or AudioWorkletNode for streaming)
    │
    ▼
SoundTouch varispeed AudioWorkletNode (if rate ≠ 1)
    │
    ▼
GainNode (clip volume)
    │
    ▼
ChannelSplitter → track-specific processing (EQ, fades)
    │
    ▼
ChannelMerger → master mix
    │
    ▼
DestinationNode (speakers) — interactive
OR
OfflineAudioContext.destination — render
```

### 9.2 Streaming audio chunks

For long clips, don't decode the entire PCM at once. Stream chunks:

1. Decode worker decodes ~1s of PCM, posts to main thread (transferable `ArrayBuffer`)
2. Main thread creates an `AudioBufferSourceNode` for the chunk
3. Schedule it to play at the right time via `source.start(when, offset, duration)`
4. Schedule the next chunk before the current ends (look-ahead ~100ms)

**FreeCut reference:** `src/runtime/composition-runtime/utils/preview-audio-graph.ts`. Sub-agent scout to read in full and document the streaming pattern.

### 9.3 Audio in cloud render

For `OfflineAudioContext`, the same graph runs but:
- `OfflineAudioContext` renders as fast as CPU allows (not real-time)
- `startRendering()` returns the final `AudioBuffer`
- We extract PCM samples and pipe to ffmpeg

See `11-cloud-render.md` for the cloud-side audio pipeline.

---

## 10. Frame Rendering Loop

### 10.1 Interactive (browser)

```
1. rAF fires
2. Clock.now() → current media time
3. mediaTimeToFrame() → current frame number
4. If different from last frame:
   a. Composition runtime builds FrameDescriptor for this frame
   b. Renderer.renderFrame(descriptor) → GPU composite
   c. Canvas shows result
5. Schedule next rAF
```

The decode worker runs ahead of the renderer (prefetch). If a frame isn't ready when needed, show last available frame (drop frame) — better than stuttering.

### 10.2 Render (cloud)

```
for (frame = 0; frame < totalFrames; frame++) {
  clock.stepTo(mediaTimeFromFrame({ frame, rate: fps }));
  const descriptor = composition.buildFrameDescriptor(frame);
  await renderer.renderFrame(descriptor);
  const pixels = await renderer.readPixels({ format: 'yuv422p10le' });
  ffmpeg.stdin.write(pixels);
}
```

No rAF, no clock drift, no real-time. Sequential, deterministic.

---

## 11. Open Questions for Sub-Agent Scout

1. **FreeCut `Clock.ts` full source.** Read `src/runtime/player/clock/Clock.ts` (642 LOC). Quote the implementation. Document every method, especially:
   - `_now()` — exact code
   - `_computeFrameAtTime` — exact code
   - `seekToFrame` — re-anchor logic
   - `_catchUpToCurrentTime` — focus/visibility re-catch-up
   - Monotonic offset map for source switching
   - Rate change handling
   - Range playback (`setInPoint` / `setOutPoint`)

2. **FreeCut `video-content.tsx` + `video-sync-plan.ts`.** Read both files in full. Document the five sync plans:
   - Trigger conditions
   - Sync mechanism
   - State transitions
   - Edge cases

3. **FreeCut `VideoSourcePool.ts`.** Read in full. Document pool management, eviction, integration with the decode worker.

4. **FreeCut `preview-audio-graph.ts`.** Read in full. Document the streaming chunk pattern, look-ahead scheduling, and how varispeed integrates.

5. **FreeCut `soundtouch-preview-processor.worklet.ts`.** Read in full. Document the DSP algorithm, buffer management, command protocol.

6. **FreeCut `reverse-shuttle-audio.ts`.** Read in full. Document reverse playback audio handling.

7. **FreeCut scrubbing utilities** (`src/features/preview/utils/`). Read each file in full:
   - `scrubbing-cache.ts`
   - `fast-scrub-prewarm.ts`
   - `fast-scrub-overlay-guard.ts`
   - `scrub-proxy-fallback.ts`
   - `scrub-throttle.ts`
   - `decoder-prewarm.ts`
   - `preview-scrubbing-cache-bridge.ts`

8. **FreeCut `Player.tsx` + `use-player.ts` + `player-emitter.ts`.** Read all three. Document the public Player API and event emission pattern.

9. **OpenCut-classic `PlaybackManager`.** Read `apps/web/src/core/managers/playback-manager.ts` (257 LOC). Document the rAF loop, frame computation, integration with `EditorCore`. Note: we override the clock with FreeCut's audio-clock trick.

10. **OpenCut-classic `VideoCache`.** Read `apps/web/src/services/video-cache/service.ts` (338 LOC). Document `seekGenerations`, prefetch chain, cache eviction.

11. **OpenCut-classic `MediaTime` / `FrameRate` Rust source.** Read `rust/crates/time/src/`. Document the tick count, frame rate constants, and all exported functions. Verify 120,000 ticks/sec divides evenly by all standard rates including drop-frame.

12. **OpenCut-classic `media/mediabunny.ts`.** Read in full. Document the mediabunny API surface used (`Input`, `BlobSource`, `getPrimaryVideoTrack`, `canDecode`, `CanvasSink`, `VideoSampleSink`?). Verify `VideoSampleSink` exists and gives raw `VideoFrame`s (needed for 10-bit).

13. **mediabunny package docs.** Verify the mediabunny API for:
    - Requesting `pixelFormat: 'P010'` on decode
    - Getting raw `VideoFrame` objects (not canvas)
    - Worker-context compatibility (does mediabunny work in a Worker?)
    - Reverse seek (for varispeed)

---

## 12. Test Plan for This Stream

1. **Clock unit tests:**
   - `now()` returns monotonically increasing values
   - `seek()` re-anchors correctly
   - `setRate()` changes frame stepping
   - Negative rates compute frames with `ceil` not `floor`
   - Range playback respects in/out points

2. **MediaTime unit tests:**
   - 23.976 divides evenly: 5005 ticks/frame
   - 29.97 divides evenly: 4004 ticks/frame
   - `fromFrame({frame: 1000, rate: 29.97})` is exact
   - `add`/`sub`/`min`/`max`/`clamp` work as expected

3. **Decode worker integration test:**
   - Load a 10-second H.264 1080p test clip
   - Decode frame 0, 150, 299 — assert pixel content matches reference PNGs
   - Decode with `pixelFormat: 'P010'` — assert 10-bit data is present (Y plane has values > 1023)

4. **Playback integration test:**
   - Load a clip, play for 2 seconds, assert ~60 frames rendered at 30fps
   - Assert no AV drift: at t=1.0s, the visible frame corresponds to source t=1.0s ±half frame

5. **Scrubbing test:**
   - Programmatically scrub through a 30s clip in 100ms steps
   - Assert each scrub resolves within 50ms
   - Assert no stale frames displayed (seek generation invalidation)

6. **Varispeed test:**
   - Play at 0.5× — assert audio pitch unchanged, duration doubled
   - Play at 2× — assert audio pitch unchanged, duration halved
   - Play at -1× — assert reverse playback works

7. **WYSIWYG test:**
   - Render frame 100 via interactive engine → screenshot
   - Render frame 100 via render engine → PNG
   - Pixel-diff: must be 0% difference

---

**End of `03-playback-engine.md`.** Next: `04-renderer-color.md`.

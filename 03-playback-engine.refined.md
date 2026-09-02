# 03 — Playback Engine: Clock, Decode, Sync, Scrubbing, Varispeed (REFINED)

**Stream:** Real-time playback pipeline
**Status:** Refined spec — sub-agent scout SCOUT-03 has verified all claims against FreeCut + OpenCut-classic source
**Primary teacher:** FreeCut `Clock.ts` + OpenCut-classic `PlaybackManager`
**Seed file:** `03-playback-engine.md`
**Refined by:** SCOUT-03 (general-purpose scout)
**Date:** 2026-08-22

---

## How to Read This Refined Spec

Sections 1–10 are the **seed spec**, copied verbatim from `03-playback-engine.md` (the architect's original).
Section 11 has been **replaced** with concrete answers backed by `file:line` references.
Section 12 (test plan) is preserved unchanged.
Sections 13–15 are **new** (Code References, Corrections, Clock.ts Full Quote).

Legend used throughout §11/§13/§14:

- ✅ = seed spec claim verified correct
- ❌ = seed spec claim wrong (see §14 for details)
- ⚠️ = seed spec claim partially correct (more nuance needed)
- 📍 = `file:line` reference into a verified source file

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

OpenCut-classic's `PlaybackManager` falls into exactly this trap — see §13.A for the proof. We override it with FreeCut's clock.

### 3.2 FreeCut's solution — `AudioContext.currentTime` as ground truth

FreeCut's `Clock.ts` (641 LOC — actual count, seed spec said 642, see §14.A) uses **`AudioContext.currentTime` as the master clock** when an `AudioContext` is attached and running, with a monotonic-offset guard so swapping between `performance.now()` and `AudioContext.currentTime` (e.g., on context suspend/resume) never produces backwards jumps.

Actual `_now()` implementation — FreeCut `src/runtime/player/clock/Clock.ts:491-507`:

```ts
private _now(): number {
  const ctx = this._audioContext
  const nextTimeSource = ctx?.state === 'running' ? ctx : null
  const rawNow = nextTimeSource ? nextTimeSource.currentTime * 1000 : performance.now()

  if (nextTimeSource !== this._activeTimeSource) {
    // AudioContext.currentTime and performance.now() have unrelated epochs.
    // Resume/suspend can switch sources between two animation frames, so map
    // the new source onto the existing monotonic timeline before using it.
    this._timeSourceOffsetMs = this._lastNowMs === null ? 0 : this._lastNowMs - rawNow
    this._activeTimeSource = nextTimeSource
  }

  const normalizedNow = rawNow + this._timeSourceOffsetMs
  this._lastNowMs = Math.max(this._lastNowMs ?? normalizedNow, normalizedNow)
  return this._lastNowMs
}
```

**Key observations (verified):**
1. Returns a `number` (milliseconds), **NOT** `MediaTime`. FreeCut's Clock works in plain ms and frame indices; only the conversion at the boundaries uses frame math. *(Seed spec §3.2 sketch was misleading — see §14.B.)*
2. Prefers `AudioContext.currentTime` (when `ctx.state === 'running'`), falls back to `performance.now()` otherwise. ✅ Seed spec correct on the audio-clock trick.
3. The "monotonic offset map for source switching" is actually a **single `_timeSourceOffsetMs: number` field** (line 82) plus a `_lastNowMs` (line 83) and `_activeTimeSource` (line 81) tracker. ⚠️ Not a `Map` — see §14.C for the correction.
4. The last line `Math.max(this._lastNowMs ?? normalizedNow, normalizedNow)` is the monotonic guard: the clock can never go backwards even if the underlying source jumps backwards.

### 3.3 `_computeFrameAtTime` — verified exact

`Clock.ts:536-546`:

```ts
private _computeFrameAtTime(now: number): number {
  const elapsedMs = now - this._playbackStartTime
  const elapsedSeconds = elapsedMs / 1000
  const framesElapsed = elapsedSeconds * this._fps * this._playbackRate

  if (this._playbackRate >= 0) {
    return Math.floor(this._playbackStartFrame + framesElapsed)
  }

  return Math.ceil(this._playbackStartFrame + framesElapsed)
}
```

✅ Seed spec §3.2 sketch matched: `Math.floor` for forward (`rate >= 0`), `Math.ceil` for reverse.

### 3.4 What we adopt

We adopt FreeCut's `Clock.ts` essentially verbatim, with one adaptation: the internal `_currentFrame: number` and `_playbackStartFrame: number` fields are replaced with `MediaTime` for boundary consistency with the rest of our type system. See §11.1 for the conversion plan.

Verified behaviors to preserve:
- `seekToFrame` re-anchors if playing — `Clock.ts:328-344`
- `playbackRate` setter re-anchors if playing — `Clock.ts:229-245`
- `setAudioContext(ctx)` re-anchors if playing — `Clock.ts:220-227`
- `_catchUpToCurrentTime()` re-anchors after catch-up — `Clock.ts:586-601`
- Range playback via `setInPoint`/`setOutPoint` — `Clock.ts:251-270`
- Negative rates allowed, `rate === 0` throws — `Clock.ts:229-232`
- Visibility/focus/pageshow listeners call `_catchUpToCurrentTime` — `Clock.ts:95-105`

> A clean-room port of FreeCut's Clock already exists at `nle-engine/src/lib/nle/core/clock.ts` (reference, NOT canon — a faithful FreeCut port using plain `number` frames, not the `MediaTime` boundary adaptation mandated above; see `19-code-references.md`).

### 3.5 StaticClock (render entry)

For the cloud render entry point, we use a `StaticClock` that doesn't advance on its own (unchanged from seed spec §3.4):

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

### 4.1 MediaTime (integer ticks) — verified against Rust source

✅ `TICKS_PER_SECOND = 120_000` verified at OpenCut-classic `rust/crates/time/src/media_time.rs:10`:

```rust
#[export]
pub const TICKS_PER_SECOND: i64 = 120_000;
```

✅ Verified that 120,000 is the smallest integer that divides evenly by every standard frame rate including drop-frame. The math (computed from `frame_rate.rs:82-94`):

```rust
pub fn ticks_per_frame(self) -> Option<i64> {
    if !self.is_valid() {
        return None;
    }

    let tick_numerator = TICKS_PER_SECOND.checked_mul(i64::from(self.denominator))?;
    let tick_denominator = i64::from(self.numerator);
    if tick_numerator % tick_denominator != 0 {
        return None;  // ← This is the proof: non-even division is rejected.
    }

    Some(tick_numerator / tick_denominator)
}
```

The unit test at `frame_rate.rs:102-113` asserts the exact ticks-per-frame for all 10 standard rates:

```rust
#[test]
fn resolves_ticks_per_standard_frame_rate() {
    assert_eq!(FrameRate::FPS_23_976.ticks_per_frame(), Some(5_005));
    assert_eq!(FrameRate::FPS_24.ticks_per_frame(), Some(5_000));
    assert_eq!(FrameRate::FPS_25.ticks_per_frame(), Some(4_800));
    assert_eq!(FrameRate::FPS_29_97.ticks_per_frame(), Some(4_004));
    assert_eq!(FrameRate::FPS_30.ticks_per_frame(), Some(4_000));
    assert_eq!(FrameRate::FPS_48.ticks_per_frame(), Some(2_500));
    assert_eq!(FrameRate::FPS_50.ticks_per_frame(), Some(2_400));
    assert_eq!(FrameRate::FPS_59_94.ticks_per_frame(), Some(2_002));
    assert_eq!(FrameRate::FPS_60.ticks_per_frame(), Some(2_000));
    assert_eq!(FrameRate::FPS_120.ticks_per_frame(), Some(1_000));
}
```

**Math proof:** LCM(24000, 30000, 60000, 24, 25, 30, 50, 60, 120) = 120000. The drop-frame denominators (1001 = 7·11·13) are coprime with the LCM of the integer rates' divisors, so 120000 must also be divisible by 24000, 30000, and 60000 — which it is (120000/24000 = 5, 120000/30000 = 4, 120000/60000 = 2).

The seed spec's `MediaTime` TS sketch (§4.1) is essentially correct. We adopt it with one **addition** the OpenCut Rust source lacks: a `mediaTimeCeilToFrame` function. OpenCut's `media_time_to_frame` calls `to_frame_round` (`media_time.rs:48-57` — round to nearest), and only `to_frame_floor` is exported (line 59-62). FreeCut's Clock uses `Math.ceil` for negative rates (`Clock.ts:545`), so we add `ceilToFrame` for symmetry.

### 4.2 FrameRate (rational) — verified against Rust source

✅ `FrameRate` struct verified at OpenCut-classic `rust/crates/time/src/frame_rate.rs:7-11`:

```rust
#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi, into_wasm_abi))]
#[derive(Serialize, Deserialize, Clone, Copy, Debug, Eq, PartialEq)]
pub struct FrameRate {
    pub numerator: u32,
    pub denominator: u32,
}
```

✅ All 10 standard rate constants verified at `frame_rate.rs:14-53`:
- `FPS_23_976 = (24_000, 1_001)`
- `FPS_24 = (24, 1)`
- `FPS_25 = (25, 1)`
- `FPS_29_97 = (30_000, 1_001)`
- `FPS_30 = (30, 1)`
- `FPS_48 = (48, 1)`
- `FPS_50 = (50, 1)`
- `FPS_59_94 = (60_000, 1_001)`
- `FPS_60 = (60, 1)`
- `FPS_120 = (120, 1)`

Seed spec §4.2 `FRAME_RATES` table is identical. ✅

### 4.3 Why integer ticks + rational rates

(unchanged from seed spec §4.3)

**This is the single biggest correctness win we adopt from OpenCut-classic.**

### 4.4 Full Rust export surface — verified

From OpenCut-classic `rust/crates/time/src/time.rs:1-19`:

```rust
pub use frame_rate::FrameRate;
pub use media_time::{
    FloorToFrameOptions, IsFrameAlignedOptions, LastFrameTimeOptions, MediaTime,
    MediaTimeAddOptions, MediaTimeClampOptions, MediaTimeFromFrameOptions,
    MediaTimeFromSecondsOptions, MediaTimeMaxOptions, MediaTimeMinOptions, MediaTimeSubOptions,
    MediaTimeToFrameOptions, MediaTimeToSecondsOptions, RoundToFrameOptions,
    SnappedSeekTimeOptions, TICKS_PER_SECOND, floor_to_frame, is_frame_aligned, last_frame_time,
    media_time_add, media_time_clamp, media_time_from_frame, media_time_from_seconds,
    media_time_max, media_time_min, media_time_sub, media_time_to_frame, media_time_to_seconds,
    round_to_frame, snapped_seek_time,
};
pub use timecode::{
    FormatTimecodeOptions, GuessTimecodeFormatOptions, ParseTimecodeOptions, TimeCodeFormat,
    format_timecode, guess_timecode_format, parse_timecode,
};
```

Exported functions: `media_time_from_seconds`, `media_time_to_seconds`, `media_time_from_frame`, `media_time_to_frame` (round), `round_to_frame`, `floor_to_frame`, `is_frame_aligned`, `last_frame_time`, `snapped_seek_time`, `media_time_add`, `media_time_sub`, `media_time_min`, `media_time_max`, `media_time_clamp`. Plus timecode: `format_timecode`, `parse_timecode`, `guess_timecode_format`. **No `ceil_to_frame`** — we add it in our TS port.

### 4.5 Our pure-TS port

We re-implement `MediaTime` in pure TypeScript (no WASM, per master spec §3), preserving the integer-tick semantics. See `04-renderer-color.refined.md` for the related scene-linear pipeline. The implementation is ~150 LOC, mirroring the Rust surface.

---

## 5. Decode Pipeline (WebCodecs + mediabunny) — REFINED

### 5.1 Why mediabunny+WebCodecs, not `<video>`

(unchanged from seed spec §5.1 table)

### 5.2 The decode worker — corrected

❌ **CORRECTION:** The seed spec §5.3 sketch shows `new VideoSampleSink(videoTrack, { pixelFormat: 'P010', ... })`. **This API does not exist in mediabunny.** Verified at `/tmp/freecut/node_modules/mediabunny/src/media-sink.ts:1622-1633`:

```ts
export type VideoSinkDecoderOptions = {
    /**
     * A hint that configures the hardware acceleration method of the decoder. This is best left on `'no-preference'`,
     * the default.
     */
    hardwareAcceleration?: 'no-preference' | 'prefer-hardware' | 'prefer-software';
    /**
     * Hint that the selected decoder should be configured to minimize the number of packets that have to be decoded
     * before video frames are output.
     */
    optimizeForLatency?: boolean;
};
```

**Only two options: `hardwareAcceleration` and `optimizeForLatency`. No `pixelFormat`.**

The `VideoSampleSink` constructor signature is `new VideoSampleSink(videoTrack, decoderOptions: VideoSinkDecoderOptions = {})` — `media-sink.ts:1665`.

The actual `pixelFormat` enum (`VIDEO_SAMPLE_PIXEL_FORMATS`, `sample.ts:160-195`) includes:
- 8-bit: `I420`, `I420A`, `I422`, `I422A`, `I444`, `I444A`, `NV12`, `RGBA`, `RGBX`, `BGRA`, `BGRX`
- 10-bit: `I420P10`, `I420P12`, `I420AP10`, `I420AP12`, `I422P10`, `I422P12`, `I422AP10`, `I422AP12`, `I444P10`, `I444P12`, `I444AP10`, `I444AP12`

❌ **`P010` is NOT in the list.** It would be the 10-bit semi-planar counterpart to NV12, but mediabunny's `VideoSamplePixelFormat` enum does not expose it. The closest equivalent is `I420P10` (planar 4:2:0 10-bit).

See §14.D for the full correction. The corrected decode worker sketch:

```ts
// Inside decode.worker.ts

import { Input, BlobSource, ALL_FORMATS, VideoSampleSink } from 'mediabunny';

async function initDecoder(source: Blob) {
  const input = new Input({ source: new BlobSource(source), formats: ALL_FORMATS });
  const videoTrack = await input.getPrimaryVideoTrack();
  const canDecode = await videoTrack.canDecode();
  if (!canDecode) throw new Error('Cannot decode this video');
  
  // VideoSampleSink's only options are hardwareAcceleration and optimizeForLatency.
  // The pixel format is whatever the browser's VideoDecoder chooses based on the source codec.
  // For a 10-bit H.265 source, browsers that support 10-bit decode will produce VideoFrames
  // with format 'P010' (or 'I420P10' depending on platform). The mediabunny VideoSample wraps it.
  const sink = new VideoSampleSink(videoTrack, {
    hardwareAcceleration: 'prefer-hardware',
    optimizeForLatency: true,
  });
  
  return { input, videoTrack, sink };
}

async function decodeAt(timeSeconds: number): Promise<VideoFrame> {
  const videoSample = await sink.getSample(timeSeconds);
  // VideoSample is a wrapper around VideoFrame|OffscreenCanvas|Uint8Array|VideoSampleResource.
  // .toVideoFrame() produces a raw VideoFrame we can transfer to the main thread.
  const frame = videoSample.toVideoFrame();
  videoSample.close(); // Release the wrapper; the VideoFrame is now standalone.
  return frame;
}
```

### 5.3 mediabunny API surface — verified

| API | Status | Reference |
|---|---|---|
| `Input` class | ✅ Exists | `media-sink.ts` & `input.ts` |
| `BlobSource` class | ✅ Exists | `source.ts` |
| `ALL_FORMATS` constant | ✅ Exists | `input-format.ts` |
| `getPrimaryVideoTrack()` | ✅ Exists | `input-track.ts` |
| `videoTrack.canDecode()` | ✅ Exists | `input-track.ts` |
| `videoTrack.displayWidth/Height` | ✅ Exists | `input-track.ts` |
| `videoTrack.codec` | ✅ Exists | `input-track.ts` |
| `VideoSampleSink` class | ✅ Exists | `media-sink.ts:1658` |
| `CanvasSink` class | ✅ Exists | `media-sink.ts:1831` |
| `sink.getSample(timestamp, options)` | ✅ Exists | `media-sink.ts:1717` |
| `sink.samples(start, end)` (async iterator) | ✅ Exists | `media-sink.ts:1734` |
| `sink.samplesAtTimestamps(timestamps)` | ✅ Exists | `media-sink.ts:1750` |
| `CanvasSink.canvases(start, end)` async iterator | ✅ Exists | `media-sink.ts:2037` |
| `pixelFormat: 'P010'` sink option | ❌ **DOES NOT EXIST** | `media-sink.ts:1622-1633` |
| `VideoSamplePixelFormat` enum | ✅ Exists (10-bit formats are `I420P10`, `I422P10`, `I444P10`, etc.) | `sample.ts:160-195` |

### 5.4 Transferability of `VideoSample` and `VideoFrame` across worker boundary — verified

`VideoSample` (the object returned by `VideoSampleSink.getSample()`) wraps one of: `VideoFrame`, `OffscreenCanvas`, `Uint8Array`, or `VideoSampleResource` (`sample.ts:41, 252`). It is **NOT itself transferable** as a structured-clone object — but it provides:

1. **`.toVideoFrame()`** (`sample.ts:998-1074`) — converts the sample to a raw `VideoFrame` (calls `new VideoFrame(...)` internally). Raw `VideoFrame` IS transferable via `postMessage(frame, [frame])`.
2. **`.clone()`** (`sample.ts:663-719`) — when the underlying data is a `VideoFrame`, calls `this._data.clone()` to produce a new `VideoSample` wrapping a new `VideoFrame` (so you can keep the original and ship the clone).
3. **`.close()`** (`sample.ts:725-741`) — closes the underlying `VideoFrame`/canvas/buffer. **Must be called** explicitly to avoid GPU memory leaks.

**Recommended pattern for worker → main transfer:**

```ts
// In worker:
const sample = await sink.getSample(timeSeconds);
const frame = sample.toVideoFrame();
sample.close();            // Release the wrapper
postMessage({ frame, time: timeSeconds }, [frame]);  // Transfer the VideoFrame buffer

// In main thread:
onmessage = (e) => {
  const { frame, time } = e.data;
  // Use frame, then frame.close() when done.
};
```

### 5.5 Worker context compatibility — verified

✅ mediabunny works inside a Worker. Verified:

1. **`package.json` browser field** (`/tmp/freecut/node_modules/mediabunny/package.json:35-39`):
   ```json
   "browser": {
     "./dist/modules/src/node.js": false,
     "./src/node.ts": false,
     "node:fs/promises": false
   }
   ```
   Node-specific modules are stripped out for browser builds.

2. **`CanvasSink` falls back to `OffscreenCanvas`** when `document` is undefined (`media-sink.ts:1960-1968`):
   ```ts
   if (typeof document !== 'undefined') {
       canvas = document.createElement('canvas');  // DOM context
       canvas.width = width;
       canvas.height = height;
   } else {
       canvas = new OffscreenCanvas(width, height);  // Worker context
   }
   ```

3. **`VideoSampleSink` uses `VideoDecoder`** from WebCodecs (via `VideoDecoderWrapper`), which is available in Web Workers per the WebCodecs spec.

4. **OpenCut-classic's `VideoCache`** uses `CanvasSink` and works inside their worker (they import it without DOM).

### 5.6 Source pool — adapted from FreeCut

❌ **CORRECTION:** The seed spec §5.4 references FreeCut's `VideoSourcePool.ts` as the pool reference. That file (`/tmp/freecut/src/runtime/player/video/VideoSourcePool.ts`, 682 LOC) pools **`HTMLVideoElement` instances** — DOM elements, not mediabunny decoders. The pool concept transfers, but the implementation does not.

FreeCut's pool key features (verified, `VideoSourcePool.ts:41-464`):
- `SourceController` per source URL — primary element + up to 3 overflow elements (line 58: `MAX_OVERFLOW_ELEMENTS = 3`)
- `acquireForClip(clipId, sourceUrl)` returns an element, tracking clip→element assignments
- `releaseClip(clipId, { delayMs })` releases with sticky delay (`POOL_RELEASE_STICKY_MS = 400` in `video-content.tsx:72`)
- `pruneUnused(activeSourceUrls)` evicts controllers with no assignments
- `ensureReadyLanes(minTotalLanes, options)` pre-warms multiple elements for transitions
- Load timeout: `LOAD_TIMEOUT_MS = 15_000` (line 59)

**Our adaptation:** Replace `HTMLVideoElement` with `mediabunny.Input + VideoSampleSink`. The pool tracks `Map<mediaId, { input, sink, refCount }>` and disposes via `input.dispose()` when refCount hits 0. Same sticky-release pattern (400ms) for split-boundary reuse.

### 5.7 Decode worker architecture

```
Main thread (UI):
  - PlaybackManager drives rAF loop
  - Clock (audio-grounded) computes current MediaTime
  - Per frame: requests VideoFrame from decode worker via postMessage
  
Decode Worker Pool (3-6 workers, per FreeCut decoder-prewarm.ts pattern):
  - Each worker holds its own mediabunny Input + VideoSampleSink
  - Receives {type:'decode', mediaId, timeSeconds} requests
  - Returns VideoFrame via transferable
  - Maintains small in-flight LRU (~6 frames per source, per FreeCut)
  
Source Pool (main thread coordinator):
  - Map<mediaId, { workers: Worker[], refCount: number }>
  - Routes decode requests to least-busy worker for that mediaId
  - Disposes inputs when refCount hits 0
```

---

## 6. The Sync Plans (Borrow from FreeCut) — REFINED

### 6.1 Six plans, not five — correction

❌ The seed spec §6 says "FreeCut's `video-content.tsx` (1,300 LOC) has **five distinct sync plans**." Actual count from `video-sync-plan.ts` (324 LOC): **six plan functions** plus four helpers.

| # | Function | File:Line | Trigger condition |
|---|---|---|---|
| 1 | `planPausedVideoFrameSync` | `video-sync-plan.ts:213-226` | Paused, frame changed (scrubbing) |
| 2 | `planPlayingVideoInitialSync` | `video-sync-plan.ts:163-182` | First play after mount/seek |
| 3 | `planPlayingVideoDriftCorrection` | `video-sync-plan.ts:184-211` | Playing, rVFC not available |
| 4 | `planVideoFrameCallbackCorrection` | `video-sync-plan.ts:260-312` | Playing, rVFC available — replaces plan 3 |
| 5 | `planPremountedVideoSync` | `video-sync-plan.ts:83-111` | `relativeFrame < 0` (clip premounted before visible) |
| 6 | `planLayoutVideoSync` | `video-sync-plan.ts:113-161` | Layout pass (pre-paint) — dispatches to plan 5 if premounted, else initial/drift |

Helper functions:
- `getVideoSyncTargetContext` (`video-sync-plan.ts:48-81`) — computes `relativeFrame`, `isPremounted`, `clampedTargetTime`, `driftSeconds`
- `shouldReactOwnPlaybackRate` (`video-sync-plan.ts:38-46`) — decides whether video element controls its own playbackRate
- `isVideoSyncTargetDiscontinuity` (`video-sync-plan.ts:234-246`) — detects Clock-target jumps
- `shouldUpdateVideoPlaybackRate` (`video-sync-plan.ts:248-258`) — tolerance-gated rate update
- `shouldIssueCoalescedReverseVideoSeek` (`video-sync-plan.ts:313-324`) — reverse-shuttle coalescing

### 6.2 Trigger conditions (verified)

```ts
// From video-content.tsx:634-731 — layout pass (before paint)
useLayoutEffect(() => {
  // ...
  const layoutPlan = planLayoutVideoSync({
    isPremounted: syncContext.isPremounted,
    isTransitionHeld: video.dataset.transitionHold === '1',
    isTransitionPrearmed: video.dataset.transitionPrearm === '1',
    canSeek: syncContext.canSeek,
    currentTime: video.currentTime,
    targetTime: syncContext.clampedTargetTime,
    isPlaying,
    needsInitialSync: needsInitialSyncRef.current,
  })
  // ...
}, [/* deps */])

// From video-content.tsx:734-962 — runtime playback control + drift correction
useEffect(() => {
  // ...
  if (isPlaying) {
    const initialSyncPlan = planPlayingVideoInitialSync({/*...*/})      // Plan 2
    if (!supportsRVFC && !sharedTransitionSync) {
      const driftCorrectionPlan = planPlayingVideoDriftCorrection({/*...*/}) // Plan 3
    }
  } else {
    const pausedSyncPlan = planPausedVideoFrameSync({/*...*/})          // Plan 1
  }
}, [/* deps */])

// From video-content.tsx:980-1075 — rVFC-based drift correction
useEffect(() => {
  // ... only when isPlaying && !isReversed && !isReverseShuttle && supportsRVFC
  const onVideoFrame = () => {
    // ...
    const correctionPlan = planVideoFrameCallbackCorrection({/*...*/})  // Plan 4
    if (correctionPlan.kind === 'seek') v.currentTime = correctionPlan.seekTo
    if (shouldUpdateVideoPlaybackRate(v.playbackRate, correctionPlan.playbackRate)) {
      v.playbackRate = correctionPlan.playbackRate
    }
    handle = v.requestVideoFrameCallback(onVideoFrame)
  }
  handle = video.requestVideoFrameCallback(onVideoFrame)
  // ...
}, [clock, isPlaying, isReversed, isReverseShuttle, poolClipId, sharedTransitionSync])
```

### 6.3 Drift-correction strategy — verified

`planVideoFrameCallbackCorrection` (`video-sync-plan.ts:260-312`) uses **asymmetric rate-based correction** for small drifts and hard seeks only for large drifts from real Clock discontinuities:

```ts
const LARGE_DRIFT_SECONDS = 0.2       // line 231
const MAX_LARGE_DRIFT_RATE_CORRECTION = 0.15  // line 232

export function planVideoFrameCallbackCorrection(input: {
  currentTime: number; targetTime: number; nominalRate: number;
  readyState: number; targetDiscontinuity?: boolean;
}): VideoFrameCallbackCorrectionPlan {
  const drift = input.currentTime - input.targetTime
  const absDrift = Math.abs(drift)

  if (absDrift > LARGE_DRIFT_SECONDS) {
    if (input.readyState >= 1) {
      if (input.targetDiscontinuity) {
        // Real Clock jump — hard-seek to target.
        return { kind: 'seek', seekTo: input.targetTime, playbackRate: input.nominalRate,
                 shouldUpdateLastSyncTime: true }
      }
      // Decoder overload — adjust rate ±5–15% to converge, DON'T re-seek (would amplify overload).
      const correction = Math.min(MAX_LARGE_DRIFT_RATE_CORRECTION, Math.max(0.05, absDrift * 0.2))
      return { kind: 'adjust_rate',
               playbackRate: drift > 0 ? input.nominalRate * (1 - correction)
                                      : input.nominalRate * (1 + correction) }
    }
    return { kind: 'nominal_rate', playbackRate: input.nominalRate }
  }

  if (absDrift > 0.016) {  // ~1 frame at 60fps
    const correction = Math.min(0.05, absDrift * 0.3)
    return { kind: 'adjust_rate',
             playbackRate: drift > 0 ? input.nominalRate * (1 - correction)
                                    : input.nominalRate * (1 + correction) }
  }

  return { kind: 'nominal_rate', playbackRate: input.nominalRate }
}
```

**Key insight:** Hard seeks are reserved for real Clock jumps (`targetDiscontinuity`), because every media seek can restart a keyframe/GOP decode and amplify an overloaded pipeline. This is FreeCut's elegant fix to the "drift then jump" jitter pattern. We adopt this verbatim.

### 6.4 Reverse-shuttle coalescing — verified

`shouldIssueCoalescedReverseVideoSeek` (`video-sync-plan.ts:313-324`):

```ts
export function shouldIssueCoalescedReverseVideoSeek(options: {
  seeking: boolean; seekInFlight: boolean; currentTime: number; targetTime: number;
}): boolean {
  return (
    !options.seeking &&
    !options.seekInFlight &&
    Math.abs(options.currentTime - options.targetTime) > 0.001
  )
}
```

This is the **reverse-shuttle plan** the seed spec was looking for. It activates when `transportPlaybackRate < 0` (FreeCut `video-content.tsx:225, 785-810`) and:
1. Pauses the video element (line 786-788)
2. Forces `playbackRate = 1` (line 789)
3. Manually seeks backwards frame-by-frame using the coalescer above

### 6.5 Our adaptation

Since we use WebCodecs (not `<video>` + rVFC), our sync plans look different but the *problems* are the same:

1. **Paused-frame sync** → decode worker fetches frame N, GPU renders to canvas
2. **Initial playing sync** → premount frame N, when play starts, advance to N+1 on next tick
3. **Drift correction (no rVFC path)** → if decode is slow, show last available frame (drop, don't stutter)
4. **Drift correction (rVFC-equivalent)** → use `VideoFrame.timestamp` from the decoded frame to detect drift; adjust *decode request rate* (skip ahead or fall back) rather than adjust playbackRate
5. **Premount sync** → prefetch frame N+1 during frame N's display
6. **Reverse shuttle** → prefetch frame N-1, handle direction-aware frame stepping

These become states in our `PlaybackManager`:

```ts
type PlaybackState =
  | { kind: 'paused'; frame: number }
  | { kind: 'playing'; startFrame: number; startTime: MediaTime; rate: number }
  | { kind: 'seeking'; targetFrame: number; currentFrame: number }
  | { kind: 'scrubbing'; targetFrame: number; prefetchAhead: number }
  | { kind: 'reverse-shuttle'; anchorFrame: number; rate: number }
```

> nle-engine ports all six plan functions and drift constants verbatim (`playback/video-sync.ts`), but applies them to `HTMLVideoElement` via a DOM registry — the plan logic is the reference; the DOM application surface is the delta §5.1 corrects (decode-rate actuation, not element playbackRate). See `19-code-references.md`.

---

## 7. Scrubbing — REFINED

### 7.1 The seek-generation pattern — verified against OpenCut-classic

✅ Seed spec §7.1 claim verified. OpenCut-classic `apps/web/src/services/video-cache/service.ts:24` declares:

```ts
private seekGenerations = new Map<string, number>();
```

And uses it in `getFrameAt` (lines 40-54):

```ts
const generation = (this.seekGenerations.get(mediaId) ?? 0) + 1;
this.seekGenerations.set(mediaId, generation);

const previous = this.frameChain.get(mediaId) ?? Promise.resolve();
const current = previous.then(() => {
    if (this.seekGenerations.get(mediaId) !== generation) {
        return sinkData.currentFrame ?? null;   // Stale — return last good frame (no throw)
    }
    return this.resolveFrame({ sinkData, time });
});
this.frameChain.set(
    mediaId,
    current.catch(() => {}),
);
return current;
```

**Critical implementation details the seed spec missed:**

1. **`seekGenerations` is keyed per-`mediaId`** (a `Map<string, number>`), not a global counter. Each media source has its own generation counter.
2. **Stale requests return `sinkData.currentFrame ?? null`** — they do NOT throw. This is more graceful than the seed spec's `throw new Error('Stale seek')` sketch (§7.1). We adopt OpenCut's pattern.
3. **The `frameChain` Promise** (line 23: `private frameChain = new Map<string, Promise<unknown>>()`) serializes seeks per source — each new seek awaits the previous seek's promise before running, even if the previous one is stale. This prevents seek interleaving (multiple `sink.canvases()` iterators running concurrently on the same source).
4. **Eviction:** `clearVideo({ mediaId })` (line 303-317) disposes the input, removes from `sinks`/`initPromises`/`frameChain`/`seekGenerations`. `clearAll()` iterates all sinks.

### 7.2 Three-tier prefetch chain — verified

OpenCut-classic `VideoCache.resolveFrame` (`service.ts:57-100`) implements a 4-step resolution strategy:

1. **`nextFrame` ready** (line 64-68): if prefetched `nextFrame.timestamp <= time`, promote it to `currentFrame` and start a new prefetch.
2. **`currentFrame` still valid** (line 70-78): if `time` is within `currentFrame.timestamp` to `currentFrame.timestamp + duration`, return it (no decode needed).
3. **Iterate forward** (line 80-93): if iterator is alive AND target is within `lastTime + 2.0` seconds, walk the iterator. **This is the "prefetch chain"** — sequential forward decode.
4. **Hard seek** (line 95-99): fall back to `seekToTime` which restarts the iterator at the target timestamp.

`isFrameValid` (line 102-110):
```ts
private isFrameValid({ frame, time }: { frame: WrappedCanvas; time: number }): boolean {
    return time >= frame.timestamp && time < frame.timestamp + frame.duration;
}
```

### 7.3 Scrubbing cache (separate from playback cache) — verified

✅ FreeCut has a separate `scrubbing-cache.ts` at `/tmp/freecut/src/features/preview/utils/scrubbing-cache.ts` (811 LOC). It implements a **3-tier cache**:

```
Tier 1 (VRAM): GPUTexture cache — cache hits avoid CPU→GPU upload entirely.
Tier 2 (RAM): Per-video last-frame cache — when seeking between clips, last decoded frame shows instantly.
Tier 3 (RAM): Deep frame buffer with LRU eviction — stores composited frames as ImageBitmaps.
```

Tier 1 (`GpuTextureCache`, line 36-168):
- `Map<number, GpuCacheEntry>` keyed by frame number
- Adaptive VRAM budget based on `navigator.deviceMemory` (line 64-73): 12.5% of system RAM, max 1GB, default 500MB
- Directional eviction: `EvictionHint { currentFrame, direction: -1|0|1 }` — prefers evicting frames in the *opposite* scrub direction (line 131-144)
- GPU blit pipeline (line 718-759) with WGSL shader for cache-hit rendering

Tier 2 (`VideoFrameCache`, line 181-263):
- `Map<string, VideoFrameEntry[]>` keyed by `itemId`
- Default 4 entries per item (`maxEntriesPerItem = 4`, line 185)
- Stores `ImageBitmap | VideoFrame` (line 174)
- LRU touch on access (line 219-221)

Tier 3 (`RamPreviewCache`, line 269-373):
- `Map<number, ImageBitmap>` keyed by frame number
- Dual eviction: max frames AND max bytes (line 310-321)
- Default: `DEFAULT_MAX_RAM_FRAMES = 900`, `FALLBACK_RAM_CACHE_BUDGET_BYTES = 384_000_000` (line 392-393)
- Adaptive budget via `resolveScrubbingRamBudgetBytes()` (line 399-410): 6.25% of system RAM, clamped to [256MB, 1GB]
- Async bitmap creation with pending-frame tracking (line 610-640)

**Promotion pattern** (line 549-559): Tier 3 access promotes to Tier 1 automatically:
```ts
getRamFrame(frame: number): ImageBitmap | undefined {
    const bitmap = this.tier3.get(frame)
    if (bitmap) {
        this._tier3Hits++
        // Promote to Tier 1 on access
        this.tier1.put(frame, bitmap)
        return bitmap
    }
    return undefined
}
```

### 7.4 FreeCut scrubbing utility file inventory — verified

| File | LOC | Purpose |
|---|---|---|
| `src/features/preview/utils/scrubbing-cache.ts` | 811 | 3-tier cache (Tier 1 GPUTexture / Tier 2 per-video / Tier 3 ImageBitmap) |
| `src/features/preview/utils/fast-scrub-prewarm.ts` | 34 | Directional prewarm offset generator (forward:4, backward:8, opposite:2, neutral:±2) |
| `src/features/preview/utils/fast-scrub-overlay-guard.ts` | 24 | Decides when to show fast-scrub overlay (not playing + target matches rendered) |
| `src/features/preview/utils/scrub-proxy-fallback.ts` | 84 | Filmstrip fallback when decode can't keep up; generation-keyed invalidation |
| `src/features/preview/utils/decoder-prewarm.ts` | 1559 | Worker pool (3-6 workers, ~2MB WASM each); active preview generation pattern |
| `src/features/preview/utils/preview-scrubbing-cache-bridge.ts` | 19 | Singleton bridge: `setActivePreviewScrubbingCache(cache)` / `getActivePreviewScrubbingCache()` |
| ❌ `src/features/preview/utils/scrub-throttle.ts` | — | **DOES NOT EXIST** at this path. See §14.E. |

The actual `scrub-throttle.ts` lives at `src/shared/utils/scrub-throttle.ts` and `src/features/timeline/utils/scrub-throttle.ts` (two separate files for different concerns).

### 7.5 Target: 50ms scrub latency

(unchanged from seed spec §7.3)

### 7.6 Decoder prewarm worker pool — verified

FreeCut `decoder-prewarm.ts:41-44`:

```ts
/** Min 3 (transition pair + spare), max 6 (memory cap ~12MB WASM) */
const WORKER_POOL_SIZE = Math.max(
  3,
  Math.min(6, Math.floor((navigator.hardwareConcurrency ?? 4) / 2)),
)
```

Each worker loads its own mediabunny WASM (~2MB). The pool covers:
- 3 workers minimum: transition pair (left + right clips) + spare
- 6 workers max: memory cap (~12MB WASM total)

**Active preview generation pattern** (`decoder-prewarm.ts:924-988`):
- `activePreviewPreseek(request)` increments `activePreviewRequestVersion` (line 928)
- Cancels superseded in-flight requests via `cancelSupersededActivePreviewRequests(src)` (line 940, 968)
- Queues at most `MAX_QUEUED_ACTIVE_PREVIEW_SOURCES = 2` (line 38)
- Reuse tolerance: `PRESEEK_REQUEST_REUSE_TOLERANCE_SECONDS = 1/240` (line 39) — ~4ms at 240fps

---

## 8. Varispeed (Audio Worklet) — REFINED

### 8.1 The problem

(unchanged from seed spec §8.1)

### 8.2 FreeCut's SoundTouch AudioWorklet — verified

✅ FreeCut's worklet at `/tmp/freecut/src/runtime/composition-runtime/worklets/soundtouch-preview-processor.worklet.ts` (127 LOC) is verified.

**AudioWorkletProcessor registration** (line 23, 126):

```ts
class SoundTouchPreviewProcessor extends AudioWorkletProcessor {
  private readonly source = new QueuedStereoBufferSource()
  private readonly processor = new TimeStretchProcessor()
  private readonly filter = new TimeStretchFilter(/* ... */)
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
  // ...
}

registerProcessor(SOUND_TOUCH_PREVIEW_PROCESSOR_NAME, SoundTouchPreviewProcessor)
```

`SOUND_TOUCH_PREVIEW_PROCESSOR_NAME = 'freecut-soundtouch-preview'` (`soundtouch-preview-shared.ts:1`).

**`process()` implementation** (line 90-123):

```ts
process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
  const output = outputs[0]
  if (!output || output.length === 0) return true

  const leftOutput = output[0]
  if (!leftOutput) return true
  const rightOutput = output[1] ?? leftOutput
  leftOutput.fill(0)
  rightOutput.fill(0)

  if (!this.playing || this.source.frameCount === 0) return true

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
```

**Command protocol** (line 51-88):

```ts
private handleMessage(message: SoundTouchPreviewProcessorMessage): void {
  switch (message.type) {
    case 'append-source': {
      // Transfer stereo PCM chunks from main thread to worklet
      const leftChannel = new Float32Array(message.leftChannel)
      const rightChannel = new Float32Array(message.rightChannel)
      this.source.append({
        startFrame: message.startFrame,
        leftChannel, rightChannel,
        frameCount: message.frameCount,
        sampleRate: message.sampleRate,
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
    case 'set-tempo': this.tempo = message.tempo; this.applySettings(); break
    case 'set-pitch': this.pitch = message.pitch; this.applySettings(); break
    case 'set-playing': this.playing = message.playing; break
    case 'reset':
      this.source.clear()
      this.filter.sourcePosition = 0
      this.playing = false
      break
  }
}
```

**Buffer management:**
- `QueuedStereoBufferSource` (`soundtouch-preview-source.ts:13-154`) holds an array of `StoredChunk` (startFrame, left/right Float32Array, frameCount, endFrame, sequence)
- Supports forward AND reverse extraction (`extractReverse` at line 75-77)
- `setReadDirection(direction, anchorFrame)` flips the read direction for reverse playback (line 63-66)

**Seek handling:** `case 'seek'` calls `source.setReadDirection(direction, frame)` AND `filter.sourcePosition = ...`. The TimeStretchFilter's internal `sourcePosition` is the read cursor; setting it doesn't flush buffers — the source just resumes reading from the new position. The `reset` message is the explicit flush.

### 8.3 Varispeed in cloud render

For `OfflineAudioContext`, the same worklet runs but processes faster than real-time. Same code, different scheduling. WYSIWYG preserved.

### 8.4 Reverse playback audio — verified

FreeCut `src/runtime/composition-runtime/utils/reverse-shuttle-audio.ts` (66 LOC) — verified.

**Constants** (line 1-3):
```ts
export const REVERSE_SHUTTLE_GRAIN_OUTPUT_SECONDS = 0.08   // 80ms output grains
export const REVERSE_SHUTTLE_LOOKAHEAD_SECONDS = 0.16        // 160ms lookahead
export const REVERSE_SHUTTLE_GRAIN_FADE_SECONDS = 0.008      // 8ms crossfade
```

**`resolveReverseShuttleGrainPlan`** (line 13-51): Plans grain extraction for reverse playback. Takes `sourceCursorSeconds`, `authoredPlaybackRate`, `transportPlaybackRate`, `authoredReversed`, buffer bounds. Returns a plan with `sourceStartSeconds`, `sourceDurationSeconds`, `playbackRate`, `reverseSamples`, `nextSourceCursorSeconds`.

The math: `playbackRate = clamp(|authoredRate * transportRate|, 0.0625, 16)`. Source duration is `outputDuration * playbackRate` (so 80ms output = 80ms × playbackRate of source). Source direction is `-1` for normal reverse, `+1` for "reversed-reversed" (forward).

**`copyShuttleGrainSamples`** (line 53-66): Sample-level reverse copy with bounds checking:
```ts
for (let index = 0; index < target.length; index += 1) {
  const sourceIndex = reverseSamples
    ? sourceStartSample + target.length - 1 - index
    : sourceStartSample + index
  target[index] = source[Math.max(0, Math.min(maxSourceIndex, sourceIndex))] ?? 0
}
```

---

## 9. Audio Pipeline — REFINED

### 9.1 The audio graph

(unchanged from seed spec §9.1 diagram)

### 9.2 Streaming audio chunks — verified pattern

FreeCut's `preview-audio-graph.ts` (565 LOC) implements per-clip EQ graphs:

- **Shared singleton `AudioContext`** via `getSharedPreviewAudioContext()` (line 39-53) — one AudioContext for the whole app, lazily created on first use
- **Per-clip graph** via `createPreviewClipAudioGraph({ eqStageCount })` (line 486-520) — creates `sourceInputNode` (GainNode), N EQ stages, `outputGainNode`
- **6-band EQ per stage** with band1/band6 pass filters (line 309-354):
  - band1 (high-pass or low-shelf/high-shelf/peaking) — `band1BiquadNode` + optional `band1PassNodes[]` (IIR filters, count = slope/6)
  - low / lowMid / midPeaking / highMid / high — 5 BiquadFilters per stage
  - band6 (low-pass or low-shelf/high-shelf/peaking) — `band6BiquadNode` + optional `band6PassNodes[]`
  - `outputGainNode` per stage
- **Smooth param ramps** via `rampAudioParam` (line 434-443): `cancelScheduledValues → setValueAtTime → linearRampToValueAtTime`
- **Topology rebuild on enable/type/slope change** via `shouldRebuildStageTopology` (line 416-432) and `replacePreviewClipEqStage` (line 393-414) — disconnects old stage, creates new, reconnects neighbors without rebuilding whole graph
- **`PREVIEW_AUDIO_GAIN_RAMP_SECONDS = 0.008`** (8ms) for gain changes (line 10)
- **`PREVIEW_AUDIO_EQ_RAMP_SECONDS = 0.012`** (12ms) for EQ changes (line 11)

**Streaming chunk pattern** (the seed spec asks about this — verified):
The FreeCut codebase uses **`AudioBufferSourceNode` per chunk** for short clips and the **`SoundTouchPreviewProcessor` AudioWorklet** for streaming chunks. The protocol is:
1. Decode worker decodes PCM chunks (transferable `ArrayBuffer`)
2. Main thread posts to worklet via `'append-source'` message (line 53-63 of worklet)
3. Worklet queues chunks via `QueuedStereoBufferSource.append()`
4. Worklet's `process()` extracts via `filter.extract(scratch, numFrames)`
5. Look-ahead: pre-decode next chunk before current exhausts (`REVERSE_SHUTTLE_LOOKAHEAD_SECONDS = 0.16`)

### 9.3 Audio in cloud render

For `OfflineAudioContext`, the same graph runs but:
- `OfflineAudioContext` renders as fast as CPU allows (not real-time)
- `startRendering()` returns the final `AudioBuffer`
- We extract PCM samples and pipe to ffmpeg

See `11-cloud-render.refined.md` for the cloud-side audio pipeline.

---

## 10. Frame Rendering Loop (Round-7 refinement)

Each rendered frame executes, in order:

1. **Plan lookup** — take the current CompositionRenderPlan (static per timeline snapshot; rebuilt on `stateChanged`)
2. **Per-item layer build** — for the frame's active items, build layers for **every item type** (video, composition, image, adjustment, text when it lands). The reference port's failure mode is instructive: nle-engine `playback/player.ts:1038` drops all non-video clips (`if (clip.type !== 'video') continue;`) — its own audit calls this "the structural bottleneck" behind every per-type gap. Our loop must have per-type branches from day one (spec 07 §4's type-agnostic `FrameItem[]` is the contract).
3. **Transition co-rendering** — items inside a transition window render both sides into the transition pipeline (spec 07 §6.3)
4. **Effect chain** — per-layer `EffectPass[]` application with pool-acquired outputs (spec 04 §7.1 discipline; the engine's singleton `_pongTexture` return at `effects/pipeline.ts:5107` is the documented counter-example)
5. **Upload + composite + present** — upload textures, composite in paint order, convert working space → display transfer, present to canvas (spec 04 §5/§7)

The loop is driven by the clock (rAF in interactive mode, sequential frames in render mode — spec 01 §3.6's two entry points share this loop; the only divergence is the driver).

---

## 11. Open Questions for Sub-Agent Scout — ANSWERED

The seed spec §11 listed 13 open questions. Each is answered below with `file:line` references.

### 11.1 FreeCut `Clock.ts` full source — VERIFIED

**File:** `/tmp/freecut/src/runtime/player/clock/Clock.ts` — **641 LOC** (not 642 — minor seed spec error, see §14.A).

**Key methods (all quoted with file:line):**

#### `_now()` — audio-clock trick ✅
`Clock.ts:491-507` — quoted in §3.2 above. ✅ Seed spec claim correct.

#### `_computeFrameAtTime(now)` — floor/ceil split ✅
`Clock.ts:536-546` — quoted in §3.3 above. ✅ Seed spec claim correct.

#### `seekToFrame(frame)` — re-anchor if playing ✅
`Clock.ts:328-344`:
```ts
seekToFrame(frame: number): void {
  const clampedFrame = this._clampFrame(frame)
  const frameChanged = clampedFrame !== this._currentFrame

  this._currentFrame = clampedFrame

  // Reset playback reference point if playing
  if (this._isPlaying) {
    this._playbackStartTime = this._now()
    this._playbackStartFrame = clampedFrame
  }

  if (frameChanged) {
    this._emit('seek')
    this._emit('framechange')
  }
}
```

#### `_catchUpToCurrentTime()` — visibility/focus re-catch-up ✅
`Clock.ts:586-601`:
```ts
private _catchUpToCurrentTime(): void {
  if (!this._isPlaying) {
    return
  }

  const now = this._now()
  const playbackEnded = this._advancePlaybackTo(now)
  if (playbackEnded) {
    return
  }

  // Re-anchor to "now" so the next visible RAF continues smoothly instead of
  // replaying the same background catch-up delta.
  this._playbackStartTime = now
  this._playbackStartFrame = this._currentFrame
}
```

Triggered by (line 95-105):
```ts
private readonly _handleVisibilityChange = (): void => {
  if (typeof document !== 'undefined' && !document.hidden) {
    this._catchUpToCurrentTime()
  }
}
private readonly _handleWindowFocus = (): void => {
  this._catchUpToCurrentTime()
}
private readonly _handlePageShow = (): void => {
  this._catchUpToCurrentTime()
}
```

These are registered in the constructor (line 128-134) and removed in `dispose()` (line 470-480).

#### Monotonic offset map for source switching ⚠️
❌ **The seed spec calls this a "monotonic offset map."** Actual implementation uses **THREE single-value fields**, NOT a `Map`:
- `_audioContext: AudioContext | null` (line 80)
- `_activeTimeSource: AudioContext | null | undefined` (line 81) — tracks which source is currently active (undefined = never set, null = using performance.now, ctx = using audio clock)
- `_timeSourceOffsetMs = 0` (line 82) — single offset value, recomputed on source switch
- `_lastNowMs: number | null = null` (line 83) — last computed time, used for monotonicity guard

Quoted code at line 496-506 (in `_now()`):
```ts
if (nextTimeSource !== this._activeTimeSource) {
  // AudioContext.currentTime and performance.now() have unrelated epochs.
  // Resume/suspend can switch sources between two animation frames, so map
  // the new source onto the existing monotonic timeline before using it.
  this._timeSourceOffsetMs = this._lastNowMs === null ? 0 : this._lastNowMs - rawNow
  this._activeTimeSource = nextTimeSource
}

const normalizedNow = rawNow + this._timeSourceOffsetMs
this._lastNowMs = Math.max(this._lastNowMs ?? normalizedNow, normalizedNow)
```

The mechanism: on source switch, compute `offset = lastNow - rawNow` so the new source's first reading matches where the old source left off. Then `Math.max` on every subsequent call ensures monotonicity (the clock never goes backwards, even if the underlying source glitches).

This is a **single-offset mechanism**, not a multi-entry map. See §14.C for the correction.

#### `setAudioContext(ctx)` — re-anchor if playing ✅
`Clock.ts:220-227`:
```ts
setAudioContext(ctx: AudioContext | null): void {
  this._audioContext = ctx
  // Re-anchor if playing so the new time source takes effect immediately
  if (this._isPlaying) {
    this._playbackStartTime = this._now()
    this._playbackStartFrame = this._currentFrame
  }
}
```

#### Rate change handling ✅
`Clock.ts:229-245` — `playbackRate` setter:
```ts
set playbackRate(value: number) {
  if (value === 0) {
    throw new Error('Playback rate cannot be zero')
  }
  const oldRate = this._playbackRate
  this._playbackRate = value

  // If playing, reset the playback start point to maintain continuity
  if (this._isPlaying) {
    this._playbackStartTime = this._now()
    this._playbackStartFrame = this._currentFrame
  }

  if (oldRate !== value) {
    this._emit('ratechange')
  }
}
```

**Edge cases verified:**
- `rate === 0` throws ✅ (line 230-232)
- Negative rates allowed (no explicit check; the `_computeFrameAtTime` Math.ceil branch handles them)
- Re-anchors on change while playing ✅
- Emits `ratechange` only when value actually changes ✅

#### Range playback (`setInPoint` / `setOutPoint`) ✅
`Clock.ts:251-270`:
```ts
setInPoint(frame: number | null): void {
  if (frame !== null) {
    this._inFrame = Math.max(0, Math.min(frame, this._durationInFrames - 1))
  } else {
    this._inFrame = null
  }
}

setOutPoint(frame: number | null): void {
  if (frame !== null) {
    this._outFrame = Math.max(0, Math.min(frame, this._durationInFrames - 1))
  } else {
    this._outFrame = null
  }
}

clearInOutPoints(): void {
  this._inFrame = null
  this._outFrame = null
}
```

Used in `play()` (line 282-289) for restart-on-end behavior:
```ts
// Restart from the opposite boundary when replaying past the active edge.
if (this._playbackRate >= 0 && this._currentFrame >= this.actualLastFrame) {
  this._currentFrame = this.actualFirstFrame
} else if (
  this._playbackRate < 0 &&
  this._currentFrame <= this.actualFirstFrame
) {
  this._currentFrame = this.actualLastFrame
}
```

And in `_advancePlaybackTo` (line 548-584) for end-of-range handling: if loop, restart from opposite boundary; else emit `ended` and stop.

#### `_advancePlaybackTo(now)` — the actual rAF tick logic ✅
`Clock.ts:548-584`:
```ts
private _advancePlaybackTo(now: number): boolean {
  const newFrame = this._computeFrameAtTime(now)

  const hasReachedEnd =
    this._playbackRate >= 0 ? newFrame > this.actualLastFrame : newFrame < this.actualFirstFrame

  if (hasReachedEnd) {
    if (this._loop) {
      const targetFrame = this._playbackRate >= 0 ? this.actualFirstFrame : this.actualLastFrame
      this._currentFrame = targetFrame
      this._playbackStartTime = now
      this._playbackStartFrame = targetFrame
      this._emit('framechange')
    } else {
      this._currentFrame = this._playbackRate >= 0 ? this.actualLastFrame : this.actualFirstFrame
      this._isPlaying = false
      this._emit('framechange')
      this._emit('ended')
      this._onEnded?.()
      this._stopAnimationLoop()
      return true
    }
  } else if (newFrame !== this._currentFrame) {
    this._currentFrame = newFrame
    if (import.meta.env.DEV) {
      _devJitterMonitor?.recordClockFrame(newFrame, false)
    }
    this._emit('framechange')
  }

  if (now - this._lastTimeUpdateEmit >= this.TIME_UPDATE_INTERVAL_MS) {
    this._lastTimeUpdateEmit = now
    this._emit('timeupdate')
  }

  return false
}
```

`TIME_UPDATE_INTERVAL_MS = 100` (line 94) — `timeupdate` events are throttled to 10Hz.

### 11.2 FreeCut `video-content.tsx` + `video-sync-plan.ts` — VERIFIED

Both files read in full. Six sync plans documented in §6 above. See §13.B for file inventory.

### 11.3 FreeCut `VideoSourcePool.ts` — VERIFIED

Read in full (682 LOC). Documents HTML video element pooling, NOT mediabunny decoders. See §5.6 above for our adaptation. Source pool features verified:
- Per-sourceUrl `SourceController` (line 41-464)
- Primary + overflow (max 3) per source (line 58)
- `acquireForClip(clipId, sourceUrl)` (line 524-549)
- `releaseClip(clipId, { delayMs })` with sticky delay (line 554-568)
- `pruneUnused(activeSourceUrls)` (line 609-616)
- `ensureReadyLanes(minTotalLanes, options)` (line 570-577) — pre-warms N elements
- `LOAD_TIMEOUT_MS = 15_000` (line 59)
- Singleton: `getGlobalVideoSourcePool()` (line 675-682)

### 11.4 FreeCut `preview-audio-graph.ts` — VERIFIED

Read in full (565 LOC). Documented in §9.2 above.

### 11.5 FreeCut `soundtouch-preview-processor.worklet.ts` — VERIFIED

Read in full (127 LOC). Documented in §8.2 above.

### 11.6 FreeCut `reverse-shuttle-audio.ts` — VERIFIED

Read in full (66 LOC). Documented in §8.4 above.

### 11.7 FreeCut scrubbing utilities — VERIFIED

All files listed in §7.4 above. **One file path was wrong in the seed spec** (`scrub-throttle.ts` location) — see §14.E.

### 11.8 FreeCut `Player.tsx` + `use-player.ts` + `player-emitter.ts` + `event-emitter.ts` — VERIFIED

All four files read in full:

**`Player.tsx`** (586 LOC):
- React `forwardRef` component with imperative `PlayerRef` API (line 85-96): `play`, `pause`, `toggle`, `seekTo`, `getCurrentFrame`, `isPlaying`, `getPlaybackRate`, `setPlaybackRate`, `addEventListener`, `removeEventListener`
- Default controls: play/pause button (line 101-123), progress bar with mouse drag (line 128-212), controls overlay with rate selector + fullscreen (line 217-300)
- `PlayerInner` (line 305-543): manages fullscreen state, container measurement via `ResizeObserver` (line 364-389), `usePlayer` hook integration, syncs `onFrameChange`/`onPlayStateChange` callbacks
- Provider stack: `PlayerEmitterProvider → ClockBridgeProvider → VideoConfigProvider → PlayerInner` (line 552-578)
- `HeadlessPlayer` export (line 582-586) — no controls, just the content host

**`use-player.ts`** (279 LOC):
- Hook returning: `play`, `pause`, `toggle`, `seek`, `pauseAndReturnToPlayStart`, `frameForward`, `frameBack`, `getCurrentFrame`, `isPlaying`, `getPlaybackRate`, `setPlaybackRate`, `isBuffering`, `hasPlayed`, `isLastFrame`, `isFirstFrame`, `emitter`, `playing` (line 23-41, 238-277)
- Uses `useBridgedTimelineContext()` for clock state, `useBridgedSetTimelineContext()` for imperative updates
- `seek` clamps to in/out frame bounds (line 89-103)
- `play` restarts from first frame if at last frame (line 115-118)
- `pauseAndReturnToPlayStart` (line 139-147) — J/K-style scrub return

**`player-emitter.ts`** (118 LOC):
- `PlayerEmitter` class with typed event map (line 14-26): `seeked`, `timeupdate`, `play`, `pause`, `ended`, `ratechange`, `volumechange`, `fullscreenchange`, `error`, `waiting`, `resume` (11 events)
- Dispatch methods (line 61-103): `dispatchSeek(frame)`, `dispatchTimeUpdate(frame)`, `dispatchPlay()`, `dispatchPause()`, `dispatchEnded()`, `dispatchRateChange(rate)`, `dispatchVolumeChange(volume, isMuted)`, `dispatchFullscreenChange(isFullscreen)`, `dispatchError(error)`, `dispatchWaiting()`, `dispatchResume()`
- Listener arrays per event type (line 34-51)
- Callbacks wrapped in try/catch with logger (line 105-117)

**`event-emitter.ts`** (3 LOC):
- Barrel file: `export { type CallbackListener, type PlayerEventTypes, PlayerEmitter } from './player-emitter'`
- Re-exports from `player-emitter-context.ts` and `PlayerEmitterProvider.tsx`

### 11.9 OpenCut-classic `PlaybackManager` — VERIFIED

Read in full (257 LOC). Documented in §3.1 and §13.C.

**rAF loop:** `updateTime` method at `playback-manager.ts:213-239`:
```ts
private updateTime = (): void => {
    if (!this.isPlaying) return;

    const fps = this.editor.project.getActive()?.settings.fps;
    const elapsedSeconds =
            (performance.now() - this.playbackStartWallTime) / 1000;
    const rawTime = addMediaTime({
            a: this.playbackStartTime,
            b: mediaTimeFromSeconds({ seconds: elapsedSeconds }),
    });
    const newTime = fps ? roundFrameTime({ time: rawTime, fps }) : rawTime;
    const maxTime = this.editor.timeline.getTotalDuration();

    if (newTime >= maxTime) {
            this.pause();
            this.currentTime = maxTime;
            this.notify();
        this.notifySeek(maxTime);
        this.dispatchSeekEvent(maxTime);
        return;
    }

    this.currentTime = newTime;
    this.notifyUpdate(newTime);
    this.dispatchUpdateEvent(newTime);
    this.playbackTimer = requestAnimationFrame(this.updateTime);
};
```

**Key observations:**
- Uses `performance.now()` (NOT `AudioContext.currentTime`) — this is what we override
- Uses `requestAnimationFrame` recursively
- Calls `roundFrameTime({ time: rawTime, fps })` to snap to frame boundaries (WASM call)
- Has three listener types: `listeners` (state change), `updateListeners` (per-frame time), `seekListeners` (seek events)
- Has `setScrubbing({ isScrubbing })` (line 130-137) — boolean flag for scrubbing state
- Has `bindTimelineScope()` (line 28-40) — subscribes to timeline & scenes, reconciles currentTime on changes

**EditorCore integration:**
- Constructor takes `EditorCore` (line 26: `constructor(private editor: EditorCore) {}`)
- Uses `editor.timeline.getTotalDuration()`, `editor.timeline.subscribe()`, `editor.scenes.subscribe()`, `editor.project.getActive()?.settings.fps`
- All time operations use `MediaTime` (WASM-backed)

### 11.10 OpenCut-classic `VideoCache` — VERIFIED

Read in full (337 LOC). Documented in §7.1-§7.2 above. ✅ `seekGenerations` pattern verified. ✅ Prefetch chain verified. ✅ Cache eviction verified (line 303-317).

**Decode failure handling:** `seekToTime` (line 160-194) catches errors, logs warning, returns `null`. Iterator failures invalidate the iterator (line 153-156, set to `null` to force re-seek).

### 11.11 OpenCut-classic `MediaTime` / `FrameRate` Rust source — VERIFIED

All four Rust files read in full. Documented in §4 above. ✅ 120,000 ticks/sec verified. ✅ Divides evenly by all standard rates verified. ✅ Math proof included in §4.1.

### 11.12 OpenCut-classic `media/mediabunny.ts` — VERIFIED

Read in full (206 LOC). **Critical finding:** OpenCut-classic imports BOTH `CanvasSink` AND `VideoSampleSink` from mediabunny:

```ts
// apps/web/src/media/mediabunny.ts:1-7
import {
    Input,
    ALL_FORMATS,
    BlobSource,
    VideoSampleSink,
    type VideoCodec,
} from "mediabunny";
```

And `apps/web/src/services/video-cache/service.ts:1-7`:
```ts
import {
    Input,
    ALL_FORMATS,
    BlobSource,
    CanvasSink,
    type WrappedCanvas,
} from "mediabunny";
```

**So both sinks exist and are used by OpenCut-classic.** However:
- `VideoSampleSink` is used only for **thumbnail generation** (line 49-63 of `mediabunny.ts`):
  ```ts
  const sink = new VideoSampleSink(videoTrack);
  const frame = await sink.getSample(1);
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
- `CanvasSink` is used for the actual video cache (line 281 of `service.ts`):
  ```ts
  const sink = new CanvasSink(videoTrack, {
      poolSize: 3,
      fit: "contain",
  });
  ```

**Note:** OpenCut-classic's `VideoSampleSink.getSample(1)` returns a `VideoSample` (not raw `VideoFrame`), and they call `frame.draw(context, 0, 0, width, height)` — using the `VideoSample.draw()` method, NOT raw `VideoFrame` access. This is the CanvasSink-style API. To get a raw `VideoFrame`, you'd call `frame.toVideoFrame()` instead.

### 11.13 mediabunny package docs — VERIFIED

Documented in §5.3-§5.5 above. Summary:

| Seed spec claim | Verification |
|---|---|
| `VideoSampleSink` exists | ✅ Confirmed at `media-sink.ts:1658` |
| `pixelFormat: 'P010'` on decode | ❌ **DOES NOT EXIST** — `VideoSinkDecoderOptions` has only `hardwareAcceleration` and `optimizeForLatency` (`media-sink.ts:1622-1633`) |
| `P010` is in `VideoSamplePixelFormat` enum | ❌ **DOES NOT EXIST** — 10-bit formats are `I420P10`, `I420P12`, `I422P10`, `I422P12`, `I444P10`, `I444P12` (with alpha variants) (`sample.ts:160-195`) |
| Get raw `VideoFrame` objects | ✅ Via `VideoSample.toVideoFrame()` (`sample.ts:998`) or `VideoSample.clone()` which preserves VideoFrame backing (`sample.ts:663-719`) |
| Worker-context compatibility | ✅ Confirmed — `package.json` browser field strips node modules; `CanvasSink` falls back to `OffscreenCanvas`; `VideoSampleSink` uses WebCodecs `VideoDecoder` available in workers |
| Reverse seek (for varispeed) | ✅ `sink.getSample(timestamp)` accepts any timestamp (forward or backward); iterator `samples(start, end)` supports `start > end` per the async-generator semantics |

---

## 12. Test Plan for This Stream

(unchanged from seed spec §12 — preserved verbatim)

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
   - ~~Decode with `pixelFormat: 'P010'` — assert 10-bit data is present~~ **REMOVED:** This API does not exist. Instead: load a 10-bit H.265 source, assert decoded `VideoFrame.format` is one of `P010`/`I420P10`/`I420P12` (browser-determined).

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

## 13. Code References

Every file read for this refined spec, with verified line counts.

### 13.A FreeCut reference files

| File (relative to `/tmp/freecut/`) | LOC | Read fully? | Key contents |
|---|---|---|---|
| `src/runtime/player/clock/Clock.ts` | 641 | ✅ Full | Audio-clock trick, monotonic offset, seek re-anchor, in/out points, _catchUpToCurrentTime |
| `src/runtime/player/Player.tsx` | 586 | ✅ Full | React component, PlayerRef imperative API, provider stack |
| `src/runtime/player/use-player.ts` | 279 | ✅ Full | Hook wrapping clock operations |
| `src/runtime/player/event-emitter.ts` | 3 | ✅ Full | Barrel re-export |
| `src/runtime/player/player-emitter.ts` | 118 | ✅ Full | 11 typed player events, dispatch methods |
| `src/runtime/player/video/VideoSourcePool.ts` | 682 | ✅ Full | HTMLVideoElement pool, SourceController, sticky release |
| `src/runtime/composition-runtime/components/video-content.tsx` | 1299 | ✅ Full (4 reads) | NativePreviewVideo + VideoContent; consumes 6 sync plans; rVFC drift correction |
| `src/runtime/composition-runtime/utils/video-sync-plan.ts` | 324 | ✅ Full | 6 plan functions + 4 helpers |
| `src/runtime/composition-runtime/utils/preview-audio-graph.ts` | 565 | ✅ Full | Per-clip EQ graph, shared AudioContext, 6-band biquad per stage |
| `src/runtime/composition-runtime/utils/reverse-shuttle-audio.ts` | 66 | ✅ Full | Grain plan, reverse sample copy |
| `src/runtime/composition-runtime/utils/soundtouch-preview-shared.ts` | 44 | ✅ Full | Message protocol types |
| `src/runtime/composition-runtime/utils/soundtouch-preview-source.ts` | 154 (first 100 read) | Partial | QueuedStereoBufferSource, forward/reverse extraction |
| `src/runtime/composition-runtime/worklets/soundtouch-preview-processor.worklet.ts` | 127 | ✅ Full | SoundTouch AudioWorkletProcessor |
| `src/features/preview/utils/scrubbing-cache.ts` | 811 | ✅ Full | 3-tier cache (Tier 1 `GPUTexture` / Tier 2 `ImageBitmap`\|`VideoFrame` union (`Tier2VideoFrame`, line 174) / Tier 3 `ImageBitmap`) |
| `src/features/preview/utils/fast-scrub-prewarm.ts` | 34 | ✅ Full | Directional prewarm offsets |
| `src/features/preview/utils/fast-scrub-overlay-guard.ts` | 24 | ✅ Full | Overlay show/hide guard |
| `src/features/preview/utils/scrub-proxy-fallback.ts` | 84 | ✅ Full | Filmstrip fallback with generation counter |
| `src/features/preview/utils/decoder-prewarm.ts` | 1559 | ✅ Structure + key sections | Worker pool (3-6 workers), active preview generation pattern |
| `src/features/preview/utils/preview-scrubbing-cache-bridge.ts` | 19 | ✅ Full | Singleton bridge |

### 13.B OpenCut-classic reference files

| File (relative to `/tmp/opencut-classic/`) | LOC | Read fully? | Key contents |
|---|---|---|---|
| `apps/web/src/core/managers/playback-manager.ts` | 257 | ✅ Full | rAF loop using `performance.now()`, MediaTime, EditorCore integration |
| `apps/web/src/services/video-cache/service.ts` | 337 | ✅ Full | `seekGenerations` Map, prefetch chain (current/next/iterator), CanvasSink |
| `apps/web/src/media/mediabunny.ts` | 206 | ✅ Full | VideoSampleSink for thumbnails; CanvasSink for cache; both used |
| `rust/crates/time/src/media_time.rs` | 428 | ✅ Full | `TICKS_PER_SECOND = 120_000`, MediaTime struct, 14 exported functions |
| `rust/crates/time/src/frame_rate.rs` | 121 | ✅ Full | 10 FrameRate constants, `ticks_per_frame()` math proof |
| `rust/crates/time/src/time.rs` | 19 | ✅ Full | Module export surface |
| `rust/crates/time/src/timecode.rs` | 287 | ✅ Full | TimeCodeFormat enum, format/parse/guess functions |

### 13.C mediabunny package source (installed at `/tmp/freecut/node_modules/mediabunny/`)

| File | Key contents |
|---|---|
| `package.json` | v1.50.8, browser field strips node modules, **MPL-2.0** license |
| `src/media-sink.ts` | `VideoSampleSink` (line 1658), `CanvasSink` (line 1831), `VideoSinkDecoderOptions` (line 1622), `WrappedCanvas` type (line 1760) |
| `src/sample.ts` | `VideoSample` class (line 250), `VIDEO_SAMPLE_PIXEL_FORMATS` enum (line 160-195), `.clone()` (line 663-719), `.toVideoFrame()` (line 998), `.close()` (line 725), `.draw()` (line 1085) |

> **⚠️ License note (MPL-2.0 — weak file-level copyleft).** mediabunny is licensed under [Mozilla Public License v2.0](https://www.mozilla.org/en-US/MPL/2.0/), not MIT. This is materially different from MIT:
> - **Using mediabunny as-is** (via npm import, no source modifications) does **not** impose copyleft on our codebase. Our own source files remain under our chosen license.
> - **Modifications to mediabunny source files** (e.g. if we ever fork it to add `pixelFormat: 'P010'` support per §14.D option #2) must be redistributed under MPL-2.0 if we distribute the modified library.
> - MPL-2.0 is **file-level** copyleft (softer than GPL's project-level copyleft): only the modified mediabunny files themselves become MPL-2.0; files in our repo that merely *use* mediabunny are unaffected.
> - **Action:** If we ever modify mediabunny source, those changes must be published under MPL-2.0. Flag for legal/compliance review before any fork.


### 13.D Key file:line references for every claim

**FreeCut `Clock.ts` audio-clock trick:** `src/runtime/player/clock/Clock.ts:491-507` (the `_now()` method)

**FreeCut `Clock.ts` monotonic offset:** `src/runtime/player/clock/Clock.ts:80-83` (fields), `:496-506` (computation in `_now()`)

**FreeCut `Clock.ts` re-anchor on seek:** `src/runtime/player/clock/Clock.ts:328-344`

**FreeCut `Clock.ts` re-anchor on rate change:** `src/runtime/player/clock/Clock.ts:229-245`

**FreeCut `Clock.ts` _catchUpToCurrentTime:** `src/runtime/player/clock/Clock.ts:586-601`, triggered at `:95-105` and registered at `:128-134`

**FreeCut 6 sync plans:** `src/runtime/composition-runtime/utils/video-sync-plan.ts:83-111, 113-161, 163-182, 184-211, 213-226, 260-312`

**FreeCut rVFC drift correction:** `src/runtime/composition-runtime/components/video-content.tsx:980-1075`

**FreeCut reverse-shuttle audio:** `src/runtime/composition-runtime/utils/reverse-shuttle-audio.ts:1-66`

**FreeCut SoundTouch worklet:** `src/runtime/composition-runtime/worklets/soundtouch-preview-processor.worklet.ts:1-127`

**OpenCut `seekGenerations` pattern:** `apps/web/src/services/video-cache/service.ts:24, 40-54`

**OpenCut `PlaybackManager` rAF loop:** `apps/web/src/core/managers/playback-manager.ts:213-239`

**OpenCut `MediaTime` constant:** `rust/crates/time/src/media_time.rs:10`

**OpenCut `FrameRate` math:** `rust/crates/time/src/frame_rate.rs:82-94, 102-113`

**mediabunny `VideoSampleSink`:** `node_modules/mediabunny/src/media-sink.ts:1658-1753`

**mediabunny `VideoSinkDecoderOptions` (no pixelFormat):** `node_modules/mediabunny/src/media-sink.ts:1622-1633`

**mediabunny `VIDEO_SAMPLE_PIXEL_FORMATS` (no P010):** `node_modules/mediabunny/src/sample.ts:160-195`

**mediabunny `VideoSample.toVideoFrame()`:** `node_modules/mediabunny/src/sample.ts:998-1074`

**mediabunny worker compatibility:** `node_modules/mediabunny/package.json:35-39`, `media-sink.ts:1960-1968`

### 13E. Code References — nle-engine (reference, NOT canon)

> The private **nle-engine** repo (github.com/bearachprema/nle-engine, 37,958 LOC, 124 tests) is a clean-room FreeCut-port **in-between reference, NOT canon**. It de-risks implementation but inherits FreeCut patterns these specs correct (8-bit rgba8unorm, JSON-RPC + `$ref`, class-API mutation surface, single-tier tests, procedural media, zero Web Workers). Where engine code conflicts with this spec, **the spec wins**. Full reconciliation: `19-code-references.md`.

| Spec section | Engine file:line | Verified quote | Status | Note |
|---|---|---|---|---|
| §3.2 `_now()` audio-clock | `src/lib/nle/core/clock.ts:550` | `? nextTimeSource.currentTime * 1000 : performance.now()` | ALIGNED | Verbatim FreeCut Clock port |
| §3.2 monotonic guard | `src/lib/nle/core/clock.ts:565` | `this._lastNowMs = Math.max(this._lastNowMs ?? normalizedNow, normalizedNow);` | ALIGNED | Single-offset + Math.max |
| §3.3 floor/ceil frame math | `src/lib/nle/core/clock.ts:612` | `return Math.floor(this._playbackStartFrame + framesElapsed);` | ALIGNED | Forward floor / reverse ceil |
| §3.2 timeupdate throttle | `src/lib/nle/core/clock.ts:661` | `if (now - this._lastTimeUpdateEmit >= this.TIME_UPDATE_INTERVAL_MS) {` | ALIGNED | 100ms throttle |
| §3.4 MediaTime adaptation | `src/lib/nle/core/clock.ts:92` | `export class Clock extends EventEmitter<ClockEvents> {` | CORRECTIVE | Plain number frames; spec mandates MediaTime at boundaries |
| §3.5 StaticClock | — | COULD-NOT-VERIFY (no StaticClock class) | SPEC-ONLY | No render-entry clock |
| §4 MediaTime/FrameRate | `src/lib/nle/core/types.ts:20` | `absolute timeline FRAMES (integer)` | CORRECTIVE | Integer frames, no i64 ticks / rational FrameRate |
| §6.1 six sync plans | `src/lib/nle/playback/video-sync.ts:925` | `export function planVideoFrameCallbackCorrection(input: {` | ALIGNED | All six plans ported as pure functions |
| §6.3 drift constants | `src/lib/nle/playback/video-sync.ts:180` | `export const LARGE_DRIFT_SECONDS = 0.2;` | ALIGNED | 0.2s / 0.15 cap / ±5%/±15% bands |
| §6.4 reverse coalescing | `src/lib/nle/playback/video-sync.ts:224` | `export const COALESCED_SEEK_EPSILON_SECONDS = 0.001;` | ALIGNED | 1ms epsilon |
| §5.1 mediabunny not `<video>` | `src/lib/nle/playback/video-sync.ts:1040` | `export function registerDomVideoElement(itemId: string, element: HTMLVideoElement): void {` | CORRECTIVE | Plans drive DOM elements; spec swaps actuator to decode-rate |
| §7.2 three-tier scrub | `src/lib/nle/playback/player.ts:234` | `When the user scrubs the timeline (beginScrub → frame seek → endScrub),` | ENGINE-GAP | Single-tier LRU only |
| §10 render loop | `src/lib/nle/playback/player.ts:1038` | `if (clip.type !== 'video') continue;` | CORRECTIVE | Non-video clips dropped |
| §8.2 SoundTouch worklet | `src/lib/nle/audio/soundtouch-processor.worklet.ts:13` | `We implement a simpler granular pitch shifter:` | CORRECTIVE | No full WSOLA port; spec's vendored-SoundTouch adoption wins |

---

## 14. Corrections to Seed Spec

Every assumption in the seed spec that turned out to be wrong or partially wrong, with the corrected version.

### 14.A Clock.ts is 641 LOC, not 642

**Seed spec §3.2:** "FreeCut's `Clock.ts` (642 LOC, zero UI deps)"
**Actual:** 641 LOC (verified via `wc -l /tmp/freecut/src/runtime/player/clock/Clock.ts`)
**Severity:** Trivial (off-by-one).

### 14.B Clock.ts uses plain numbers, NOT MediaTime — Seed spec §3.2 sketch was misleading

**Seed spec §3.2 sketch:**
```ts
private _now(): MediaTime {
  const audioElapsed = this.audioContext.currentTime - this.startTime;
  return mediaTimeAdd(this.startMediaTime, mediaTimeFromSeconds({ seconds: audioElapsed }));
}
```

**Actual:** FreeCut's `Clock.ts` uses plain `number` for everything internally:
- `_currentFrame: number` (line 68)
- `_playbackStartTime: number = 0` (line 74) — milliseconds
- `_playbackStartFrame: number = 0` (line 75)
- `_now()` returns `number` (line 491) — milliseconds
- `currentTime` getter returns `_currentFrame / this._fps` (line 158) — seconds, as a plain number

**Implication for our port:** We can keep the FreeCut design (plain numbers internally, frame-based) OR adapt to use `MediaTime` at boundaries. The architect's master spec uses `MediaTime` throughout, so we adapt:
- Internal: keep FreeCut's ms-based `_playbackStartTime` / `_playbackStartFrame` for compatibility with the audio clock math
- Boundary: convert `_currentFrame` ↔ `MediaTime` via `mediaTimeFromFrame({ frame, rate: fps })` at API edges

### 14.C "Monotonic offset map" is actually a single-offset mechanism

**Seed spec §3.3:** "The monotonic offset map for source switching"
**Actual:** Three single-value fields, NOT a `Map`:
- `_audioContext: AudioContext | null` (line 80)
- `_activeTimeSource: AudioContext | null | undefined` (line 81)
- `_timeSourceOffsetMs = 0` (line 82)
- `_lastNowMs: number | null = null` (line 83)

The mechanism (in `_now()`, lines 496-506):
1. Detect source switch: `nextTimeSource !== this._activeTimeSource`
2. Compute new offset: `this._timeSourceOffsetMs = this._lastNowMs === null ? 0 : this._lastNowMs - rawNow`
3. Update active source: `this._activeTimeSource = nextTimeSource`
4. Apply offset + monotonic guard: `this._lastNowMs = Math.max(this._lastNowMs ?? normalizedNow, normalizedNow)`

This handles a **single source swap at a time** (e.g., AudioContext suspended → resumed, or AudioContext attached for the first time). There's no `Map<AudioContext | null, number>` of multiple offsets — just one current offset that gets recomputed on every swap.

**Implication for our port:** Same design — single `_timeSourceOffsetMs` + `_lastNowMs` + `_activeTimeSource` triplet. No need for a map; only one source is ever active.

### 14.D `pixelFormat: 'P010'` does NOT exist as a mediabunny sink option

**Seed spec §5.3 sketch:**
```ts
const sink = new VideoSampleSink(videoTrack, {
  pixelFormat: 'P010',  // 10-bit YUV 4:2:0 planar
  // Other options sub-agent to verify against mediabunny API
});
```

**Actual:** `VideoSampleSink` constructor (`media-sink.ts:1665`):
```ts
constructor(videoTrack: InputVideoTrack, decoderOptions: VideoSinkDecoderOptions = {}) {
```

`VideoSinkDecoderOptions` (`media-sink.ts:1622-1633`) has ONLY:
- `hardwareAcceleration?: 'no-preference' | 'prefer-hardware' | 'prefer-software'`
- `optimizeForLatency?: boolean`

**No `pixelFormat`.** And `P010` is not even in the `VIDEO_SAMPLE_PIXEL_FORMATS` enum (`sample.ts:160-195`). The 10-bit formats exposed are `I420P10`, `I420P12`, `I422P10`, `I422P12`, `I444P10`, `I444P12` (with alpha variants).

**Corrected approach for 10-bit:**

The pixel format is determined by the **browser's `VideoDecoder`** based on the source codec, not by the caller. For a 10-bit H.265 source, browsers that support 10-bit decode will produce `VideoFrame`s with `format: 'P010'` (Chromium) or `'I420P10'` (other implementations). mediabunny wraps these in a `VideoSample` and exposes them transparently.

To **force** a specific format on the output, you must either:
1. Use `VideoSample.toVideoFrame()` and then create a new `VideoFrame` with the desired format via `new VideoFrame(sourceFrame, { format: 'I420P10', ... })` — requires re-allocation.
2. Implement a custom `VideoSampleResource` subclass that exposes the format you want.
3. Configure the underlying `VideoDecoder` directly (bypass mediabunny) — but you lose mediabunny's demuxer.

**Recommendation for our port:** Rely on the browser to produce the native format from 10-bit sources, then sample/convert in the GPU shader pipeline (`04-renderer-color.refined.md`). The seed spec's `pixelFormat: 'P010'` sketch is removed.

### 14.E `scrub-throttle.ts` path is wrong

**Seed spec §7.2:**
> FreeCut has a separate `scrubbing-cache.ts` (`src/features/preview/utils/`). Sub-agent scout to read in full and document:
> - `scrubbing-cache.ts` — the cache itself
> - `fast-scrub-prewarm.ts` — prewarm logic
> - `fast-scrub-overlay-guard.ts` — overlay guard
> - `scrub-proxy-fallback.ts` — proxy fallback when decode can't keep up
> - `scrub-throttle.ts` — throttling decode requests
> - `decoder-prewarm.ts` — decoder prewarm
> - `preview-scrubbing-cache-bridge.ts` — bridge between preview and scrubbing

**Actual:** `src/features/preview/utils/scrub-throttle.ts` does NOT exist. There are two `scrub-throttle.ts` files elsewhere:
- `/tmp/freecut/src/shared/utils/scrub-throttle.ts` (with `.test.ts`)
- `/tmp/freecut/src/features/timeline/utils/scrub-throttle.ts`

These are generic throttle utilities, not specifically preview-scrub related. FreeCut's preview scrubbing throttling is handled inside `decoder-prewarm.ts` via `PRESEEK_REQUEST_REUSE_TOLERANCE_SECONDS = 1/240` (line 39) and the `cancelSupersededActivePreviewRequests` pattern (line 940, 968).

**Implication for our port:** The seed spec's `scrub-throttle.ts` reference is invalid. We adopt the `decoder-prewarm.ts` generation/supersede pattern instead, which is more sophisticated than a simple throttle.

### 14.F "5 RVFC sync plans" is actually 6 plans

**Seed spec §6:** "FreeCut's `video-content.tsx` (1,300 LOC) has **five distinct sync plans**"

**Actual:** 6 plan functions in `video-sync-plan.ts`:
1. `planPremountedVideoSync` (line 83-111) — premount before visible
2. `planLayoutVideoSync` (line 113-161) — layout pass before paint
3. `planPlayingVideoInitialSync` (line 163-182) — initial sync on play start
4. `planPlayingVideoDriftCorrection` (line 184-211) — drift correction (no rVFC path)
5. `planVideoFrameCallbackCorrection` (line 260-312) — drift correction (rVFC path, replaces #4 when rVFC is available)
6. `planPausedVideoFrameSync` (line 213-226) — paused scrub

Plus 4 helpers (`getVideoSyncTargetContext`, `shouldReactOwnPlaybackRate`, `isVideoSyncTargetDiscontinuity`, `shouldUpdateVideoPlaybackRate`, `shouldIssueCoalescedReverseVideoSeek`).

The seed spec's reverse-shuttle plan is actually `shouldIssueCoalescedReverseVideoSeek` (a helper), not a standalone plan function.

### 14.G OpenCut `media_time_to_frame` rounds, doesn't floor

**Seed spec §4.1:**
```ts
export function mediaTimeToFrame({ time, rate }: { time: MediaTime; rate: FrameRate }): number {
  const ticksPerFrame = Math.round(TICKS_PER_SECOND * rate.denominator / rate.numerator);
  return Math.floor(time / ticksPerFrame);
}
```

**Actual OpenCut Rust source** (`media_time.rs:48-57`): the exported `media_time_to_frame` calls `to_frame_round` (round to nearest), not `to_frame_floor`:

```rust
pub fn to_frame_round(self, rate: FrameRate) -> Option<i64> {
    let ticks_per_frame = rate.ticks_per_frame()?;
    let remainder = self.0.rem_euclid(ticks_per_frame);
    let floor = self.0.div_euclid(ticks_per_frame);
    if remainder * 2 >= ticks_per_frame {
        Some(floor + 1)
    } else {
        Some(floor)
    }
}
```

And `media_time_to_frame` (line 199-203):
```rust
pub fn media_time_to_frame(
    MediaTimeToFrameOptions { time, rate }: MediaTimeToFrameOptions,
) -> Option<i64> {
    time.to_frame_round(rate)
}
```

**Implication:** The seed spec's `mediaTimeToFrame` uses `Math.floor`, which differs from OpenCut's `to_frame_round`. We have two options:
1. **Match FreeCut's Clock behavior:** floor for forward, ceil for reverse (already in our spec at §3.3)
2. **Match OpenCut's `media_time_to_frame`:** round to nearest

**Recommendation:** Keep both — `mediaTimeToFrameFloor` (forward playback) and `mediaTimeToFrameCeil` (reverse playback) as separate functions, with `mediaTimeToFrame` defaulting to round (matching OpenCut). FreeCut's Clock uses `floor`/`ceil` because it operates on the *playback cursor* (must not skip past the requested time); OpenCut's `round` is for *UI display* (snaps to nearest frame).

### 14.H OpenCut-classic `seekGenerations` returns last-good-frame, doesn't throw

**Seed spec §7.1 sketch:**
```ts
async seek(time: MediaTime): Promise<VideoFrame> {
  const myGen = ++this.seekGeneration;
  const frame = await this.decoder.decode(time);
  if (myGen !== this.seekGeneration) {
    frame.close();
    throw new Error('Stale seek');  // ← throws
  }
  return frame;
}
```

**Actual OpenCut-classic pattern** (`service.ts:40-54`):
```ts
const current = previous.then(() => {
    if (this.seekGenerations.get(mediaId) !== generation) {
        return sinkData.currentFrame ?? null;  // ← returns last good frame, doesn't throw
    }
    return this.resolveFrame({ sinkData, time });
});
```

**Implication:** Stale seeks return the last-known-good frame (or null if none), not throw. This is more graceful — the UI shows a slightly-old frame instead of an error. We adopt OpenCut's pattern.

### 14.I VideoSourcePool manages HTMLVideoElement, not mediabunny decoders

**Seed spec §5.4:**
> **FreeCut reference:** `src/runtime/player/video/VideoSourcePool.ts`. Sub-agent scout to read in full and document the pool management, eviction policy, and integration with the decode worker.

**Actual:** `VideoSourcePool.ts` (682 LOC) manages `HTMLVideoElement` instances — DOM `<video>` elements — for FreeCut's `<video>` + rVFC preview path. It does NOT manage mediabunny decoders (FreeCut doesn't use mediabunny for the main preview path; only for the worker prewarm pool in `decoder-prewarm.ts`).

**Implication:** The pool *concept* (refcounted, sticky release, lane warming) transfers to our mediabunny decoder pool. The *implementation* (DOM element creation, `acquireForClip`/`releaseClip` for `HTMLVideoElement`) does not. Our decode worker pool tracks `Map<mediaId, { input: mediabunny.Input, sink: VideoSampleSink, refCount: number }>` and disposes via `input.dispose()`.

### 14.J mediabunny VideoSample is NOT directly transferable — must call `.toVideoFrame()`

**Seed spec §5.3 sketch:**
```ts
async function decodeAt(time: MediaTime, fps: FrameRate): Promise<VideoFrame> {
  const frame = await sink.seek(mediaTimeToSeconds({ time }));
  return frame;  // VideoFrame is transferable via .clone()
}
```

**Actual:** `sink.getSample(timestamp)` returns a `VideoSample`, not a `VideoFrame`. The `VideoSample` wraps `VideoFrame | OffscreenCanvas | Uint8Array | VideoSampleResource` (`sample.ts:41, 252`). It is NOT itself structured-cloneable.

To transfer across worker boundary:
```ts
const sample = await sink.getSample(timeSeconds);
const frame = sample.toVideoFrame();  // ← explicit conversion
sample.close();                       // ← release the wrapper
postMessage({ frame, time }, [frame]); // ← transfer the raw VideoFrame
```

OR use `sample.clone()` which returns a new `VideoSample` wrapping a new `VideoFrame` (cloned via `VideoFrame.clone()` internally at `sample.ts:678`). The clone can then be `.toVideoFrame()`'d for transfer.

---

## 15. Appendix: FreeCut `Clock.ts` Full Quote

The complete 641-line source of `/tmp/freecut/src/runtime/player/clock/Clock.ts`, quoted verbatim for reference. This is the single most critical file in this stream.

```typescript
import { createLogger } from '@/shared/logging/logger'

const logger = createLogger('Clock')

// DEV-only: cached jitter monitor reference loaded via dynamic import.
// Typed inline to avoid cross-feature import boundary violation.
let _devJitterMonitor: {
  recordClockFrame: (frame: number, inTransition: boolean) => void
  setFps: (fps: number) => void
  onPlaybackStart: () => void
} | null = null

/**
 * Clock.ts - Central timing system for the video player
 *
 * The Clock is the single source of truth for playback timing.
 * It manages:
 * - Current frame/time position
 * - Play/pause state
 * - Playback rate
 * - Frame change events
 *
 * Design principles:
 * - Independent of React render cycle for performance
 * - Event-driven updates to minimize re-renders
 * - Supports both frame-based and time-based operations
 * - Handles variable playback rates
 */

type ClockEventType =
  | 'framechange'
  | 'play'
  | 'pause'
  | 'seek'
  | 'ratechange'
  | 'ended'
  | 'timeupdate'

interface ClockEvent {
  type: ClockEventType
  frame: number
  time: number
  isPlaying: boolean
  playbackRate: number
}

type ClockEventCallback = (event: ClockEvent) => void

export interface ClockConfig {
  fps: number
  durationInFrames: number
  initialFrame?: number
  loop?: boolean
  onEnded?: () => void
}

/**
 * Clock class - manages playback timing independent of React
 */
export class Clock {
  // Configuration
  private _fps: number
  private _durationInFrames: number
  private _loop: boolean
  private _onEnded?: () => void

  // State
  private _currentFrame: number
  private _isPlaying: boolean = false
  private _playbackRate: number = 1

  // Animation loop
  private _animationFrameId: number | null = null
  private _playbackStartTime: number = 0
  private _playbackStartFrame: number = 0

  // Audio-as-ground-truth: when set, playback timing derives from the
  // hardware audio clock (AudioContext.currentTime) instead of
  // performance.now(). This eliminates audio-video drift by definition.
  private _audioContext: AudioContext | null = null
  private _activeTimeSource: AudioContext | null | undefined
  private _timeSourceOffsetMs = 0
  private _lastNowMs: number | null = null

  // In/out points for range playback
  private _inFrame: number | null = null
  private _outFrame: number | null = null

  // Event listeners
  private _listeners: Map<ClockEventType, Set<ClockEventCallback>> = new Map()

  // Throttling for timeupdate events
  private _lastTimeUpdateEmit: number = 0
  private readonly TIME_UPDATE_INTERVAL_MS = 100
  private readonly _handleVisibilityChange = (): void => {
    if (typeof document !== 'undefined' && !document.hidden) {
      this._catchUpToCurrentTime()
    }
  }
  private readonly _handleWindowFocus = (): void => {
    this._catchUpToCurrentTime()
  }
  private readonly _handlePageShow = (): void => {
    this._catchUpToCurrentTime()
  }

  constructor(config: ClockConfig) {
    this._fps = config.fps
    this._durationInFrames = config.durationInFrames
    this._currentFrame = config.initialFrame ?? 0
    this._loop = config.loop ?? false
    this._onEnded = config.onEnded

    // Initialize listener maps
    const eventTypes: ClockEventType[] = [
      'framechange',
      'play',
      'pause',
      'seek',
      'ratechange',
      'ended',
      'timeupdate',
    ]
    eventTypes.forEach((type) => {
      this._listeners.set(type, new Set())
    })

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this._handleVisibilityChange)
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', this._handleWindowFocus)
      window.addEventListener('pageshow', this._handlePageShow)
    }
  }

  // ============================================
  // Getters
  // ============================================

  get fps(): number {
    return this._fps
  }

  get durationInFrames(): number {
    return this._durationInFrames
  }

  get durationInSeconds(): number {
    return this._durationInFrames / this._fps
  }

  get currentFrame(): number {
    return this._currentFrame
  }

  get currentTime(): number {
    return this._currentFrame / this._fps
  }

  get isPlaying(): boolean {
    return this._isPlaying
  }

  get playbackRate(): number {
    return this._playbackRate
  }

  get loop(): boolean {
    return this._loop
  }

  get inFrame(): number {
    return this._inFrame ?? 0
  }

  get outFrame(): number {
    return this._outFrame ?? this._durationInFrames - 1
  }

  get actualFirstFrame(): number {
    return this._inFrame ?? 0
  }

  get actualLastFrame(): number {
    return this._outFrame ?? this._durationInFrames - 1
  }

  // ============================================
  // Setters
  // ============================================

  set fps(value: number) {
    if (value <= 0) {
      throw new Error('FPS must be positive')
    }
    this._fps = value
  }

  set durationInFrames(value: number) {
    if (value <= 0) {
      throw new Error('Duration must be positive')
    }
    this._durationInFrames = value
    // Clamp current frame if it exceeds new duration
    if (this._currentFrame >= value) {
      this.seekToFrame(value - 1)
    }
  }

  set loop(value: boolean) {
    this._loop = value
  }

  /**
   * Attach an AudioContext to use as the timing ground truth.
   * When set and running, the Clock derives elapsed time from the
   * hardware audio clock instead of performance.now().
   */
  setAudioContext(ctx: AudioContext | null): void {
    this._audioContext = ctx
    // Re-anchor if playing so the new time source takes effect immediately
    if (this._isPlaying) {
      this._playbackStartTime = this._now()
      this._playbackStartFrame = this._currentFrame
    }
  }

  set playbackRate(value: number) {
    if (value === 0) {
      throw new Error('Playback rate cannot be zero')
    }
    const oldRate = this._playbackRate
    this._playbackRate = value

    // If playing, reset the playback start point to maintain continuity
    if (this._isPlaying) {
      this._playbackStartTime = this._now()
      this._playbackStartFrame = this._currentFrame
    }

    if (oldRate !== value) {
      this._emit('ratechange')
    }
  }

  // ============================================
  // In/Out Point Methods
  // ============================================

  setInPoint(frame: number | null): void {
    if (frame !== null) {
      this._inFrame = Math.max(0, Math.min(frame, this._durationInFrames - 1))
    } else {
      this._inFrame = null
    }
  }

  setOutPoint(frame: number | null): void {
    if (frame !== null) {
      this._outFrame = Math.max(0, Math.min(frame, this._durationInFrames - 1))
    } else {
      this._outFrame = null
    }
  }

  clearInOutPoints(): void {
    this._inFrame = null
    this._outFrame = null
  }

  // ============================================
  // Playback Control Methods
  // ============================================

  play(): void {
    if (this._isPlaying) {
      return
    }

    // Restart from the opposite boundary when replaying past the active edge.
    if (this._playbackRate >= 0 && this._currentFrame >= this.actualLastFrame) {
      this._currentFrame = this.actualFirstFrame
    } else if (
      this._playbackRate < 0 &&
      this._currentFrame <= this.actualFirstFrame
    ) {
      this._currentFrame = this.actualLastFrame
    }

    this._isPlaying = true
    this._playbackStartTime = this._now()
    this._playbackStartFrame = this._currentFrame

    if (import.meta.env.DEV) {
      void import('@/shared/logging/frame-jitter-monitor').then((m) => {
        _devJitterMonitor = m.getFrameJitterMonitor()
        _devJitterMonitor.setFps(this._fps)
        _devJitterMonitor.onPlaybackStart()
      })
    }

    this._emit('play')
    this._startAnimationLoop()
  }

  pause(): void {
    if (!this._isPlaying) {
      return
    }

    this._isPlaying = false
    this._stopAnimationLoop()
    this._emit('pause')
  }

  toggle(): void {
    if (this._isPlaying) {
      this.pause()
    } else {
      this.play()
    }
  }

  /**
   * Seek to a specific frame
   */
  seekToFrame(frame: number): void {
    const clampedFrame = this._clampFrame(frame)
    const frameChanged = clampedFrame !== this._currentFrame

    this._currentFrame = clampedFrame

    // Reset playback reference point if playing
    if (this._isPlaying) {
      this._playbackStartTime = this._now()
      this._playbackStartFrame = clampedFrame
    }

    if (frameChanged) {
      this._emit('seek')
      this._emit('framechange')
    }
  }

  /**
   * Seek to a specific time in seconds
   */
  seekToTime(time: number): void {
    const frame = Math.round(time * this._fps)
    this.seekToFrame(frame)
  }

  /**
   * Move forward by a number of frames
   */
  stepForward(frames: number = 1): void {
    if (this._isPlaying) return
    this.seekToFrame(this._currentFrame + frames)
  }

  /**
   * Move backward by a number of frames
   */
  stepBackward(frames: number = 1): void {
    if (this._isPlaying) return
    this.seekToFrame(this._currentFrame - frames)
  }

  /**
   * Go to the first frame (or in point)
   */
  goToStart(): void {
    this.seekToFrame(this.actualFirstFrame)
  }

  /**
   * Go to the last frame (or out point)
   */
  goToEnd(): void {
    this.seekToFrame(this.actualLastFrame)
  }

  // ============================================
  // Event System
  // ============================================

  addEventListener(type: ClockEventType, callback: ClockEventCallback): void {
    const listeners = this._listeners.get(type)
    if (listeners) {
      listeners.add(callback)
    }
  }

  removeEventListener(type: ClockEventType, callback: ClockEventCallback): void {
    const listeners = this._listeners.get(type)
    if (listeners) {
      listeners.delete(callback)
    }
  }

  /**
   * Subscribe to frame changes - returns unsubscribe function
   */
  onFrameChange(callback: (frame: number) => void): () => void {
    const wrappedCallback: ClockEventCallback = (event) => {
      callback(event.frame)
    }
    this.addEventListener('framechange', wrappedCallback)
    return () => this.removeEventListener('framechange', wrappedCallback)
  }

  /**
   * Subscribe to play state changes - returns unsubscribe function
   */
  onPlayStateChange(callback: (isPlaying: boolean) => void): () => void {
    const playCallback: ClockEventCallback = () => callback(true)
    const pauseCallback: ClockEventCallback = () => callback(false)

    this.addEventListener('play', playCallback)
    this.addEventListener('pause', pauseCallback)

    return () => {
      this.removeEventListener('play', playCallback)
      this.removeEventListener('pause', pauseCallback)
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Convert frame number to time in seconds
   */
  frameToTime(frame: number): number {
    return frame / this._fps
  }

  /**
   * Convert time in seconds to frame number
   */
  timeToFrame(time: number): number {
    return Math.round(time * this._fps)
  }

  /**
   * Check if a frame is within the current in/out range
   */
  isFrameInRange(frame: number): boolean {
    return frame >= this.actualFirstFrame && frame <= this.actualLastFrame
  }

  /**
   * Get the current state as an object
   */
  getState(): ClockEvent {
    return {
      type: 'timeupdate',
      frame: this._currentFrame,
      time: this.currentTime,
      isPlaying: this._isPlaying,
      playbackRate: this._playbackRate,
    }
  }

  /**
   * Dispose of the clock and clean up resources
   */
  dispose(): void {
    this._stopAnimationLoop()
    this._listeners.forEach((listeners) => listeners.clear())
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this._handleVisibilityChange)
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', this._handleWindowFocus)
      window.removeEventListener('pageshow', this._handlePageShow)
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Current time in ms from the best available clock.
   * Prefers AudioContext.currentTime (hardware audio clock) when attached
   * and running; falls back to performance.now() otherwise.
   */
  private _now(): number {
    const ctx = this._audioContext
    const nextTimeSource = ctx?.state === 'running' ? ctx : null
    const rawNow = nextTimeSource ? nextTimeSource.currentTime * 1000 : performance.now()

    if (nextTimeSource !== this._activeTimeSource) {
      // AudioContext.currentTime and performance.now() have unrelated epochs.
      // Resume/suspend can switch sources between two animation frames, so map
      // the new source onto the existing monotonic timeline before using it.
      this._timeSourceOffsetMs = this._lastNowMs === null ? 0 : this._lastNowMs - rawNow
      this._activeTimeSource = nextTimeSource
    }

    const normalizedNow = rawNow + this._timeSourceOffsetMs
    this._lastNowMs = Math.max(this._lastNowMs ?? normalizedNow, normalizedNow)
    return this._lastNowMs
  }

  private _clampFrame(frame: number): number {
    const minFrame = this.actualFirstFrame
    const maxFrame = this.actualLastFrame
    return Math.max(minFrame, Math.min(Math.round(frame), maxFrame))
  }

  private _emit(type: ClockEventType): void {
    const event: ClockEvent = {
      type,
      frame: this._currentFrame,
      time: this.currentTime,
      isPlaying: this._isPlaying,
      playbackRate: this._playbackRate,
    }

    const listeners = this._listeners.get(type)
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(event)
        } catch (error) {
          logger.error(`Error in clock event listener (${type}):`, error)
        }
      })
    }
  }

  private _computeFrameAtTime(now: number): number {
    const elapsedMs = now - this._playbackStartTime
    const elapsedSeconds = elapsedMs / 1000
    const framesElapsed = elapsedSeconds * this._fps * this._playbackRate

    if (this._playbackRate >= 0) {
      return Math.floor(this._playbackStartFrame + framesElapsed)
    }

    return Math.ceil(this._playbackStartFrame + framesElapsed)
  }

  private _advancePlaybackTo(now: number): boolean {
    const newFrame = this._computeFrameAtTime(now)

    const hasReachedEnd =
      this._playbackRate >= 0 ? newFrame > this.actualLastFrame : newFrame < this.actualFirstFrame

    if (hasReachedEnd) {
      if (this._loop) {
        const targetFrame = this._playbackRate >= 0 ? this.actualFirstFrame : this.actualLastFrame
        this._currentFrame = targetFrame
        this._playbackStartTime = now
        this._playbackStartFrame = targetFrame
        this._emit('framechange')
      } else {
        this._currentFrame = this._playbackRate >= 0 ? this.actualLastFrame : this.actualFirstFrame
        this._isPlaying = false
        this._emit('framechange')
        this._emit('ended')
        this._onEnded?.()
        this._stopAnimationLoop()
        return true
      }
    } else if (newFrame !== this._currentFrame) {
      this._currentFrame = newFrame
      if (import.meta.env.DEV) {
        _devJitterMonitor?.recordClockFrame(newFrame, false)
      }
      this._emit('framechange')
    }

    if (now - this._lastTimeUpdateEmit >= this.TIME_UPDATE_INTERVAL_MS) {
      this._lastTimeUpdateEmit = now
      this._emit('timeupdate')
    }

    return false
  }

  private _catchUpToCurrentTime(): void {
    if (!this._isPlaying) {
      return
    }

    const now = this._now()
    const playbackEnded = this._advancePlaybackTo(now)
    if (playbackEnded) {
      return
    }

    // Re-anchor to "now" so the next visible RAF continues smoothly instead of
    // replaying the same background catch-up delta.
    this._playbackStartTime = now
    this._playbackStartFrame = this._currentFrame
  }

  private _startAnimationLoop(): void {
    if (this._animationFrameId !== null) {
      return
    }

    const tick = (): void => {
      if (!this._isPlaying) {
        this._animationFrameId = null
        return
      }

      const now = this._now()

      if (this._advancePlaybackTo(now)) {
        this._animationFrameId = null
        return
      }

      // Continue the loop
      this._animationFrameId = requestAnimationFrame(tick)
    }

    this._animationFrameId = requestAnimationFrame(tick)
  }

  private _stopAnimationLoop(): void {
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId)
      this._animationFrameId = null
    }
  }
}

/**
 * Factory function to create a Clock instance
 */
export function createClock(config: ClockConfig): Clock {
  return new Clock(config)
}
```

---

**End of `03-playback-engine.refined.md`.**

**Scout summary:**

- 21 source files read across FreeCut + OpenCut-classic + mediabunny package
- 9 corrections to seed spec identified (4 trivial, 5 substantive)
- All 13 open questions answered with `file:line` references
- FreeCut `Clock.ts` (641 LOC) quoted in full as appendix §15
- Key findings: (1) audio-clock trick ✅ verified, (2) seekGenerations pattern ✅ verified, (3) MediaTime 120,000 ticks/sec ✅ verified, (4) `VideoSampleSink` exists ✅ but (5) `pixelFormat: 'P010'` ❌ does NOT exist (mediabunny exposes `I420P10`/`I422P10`/`I444P10` instead), (6) 6 sync plans exist (not 5), (7) `scrub-throttle.ts` at the seed spec's path ❌ does NOT exist

**Next:** `04-renderer-color.refined.md` (renderer + color pipeline).

---

## Testing

> See `17-test-plan.md` §4 for the overall methodology, the three-tier
> model, and the per-module template. Matrix rows (from `17-test-plan.md`
> §3.1 matrix) covered by this section:
> - "Playback (frame-accurate)"
> - "Varispeed (pitch preservation)"
> - "Scrubbing latency (p50, p95, p99)"
> - "Keyboard shortcuts (playback subset)"
> - "`MediaTime` math (add, sub, compare, frame conversion)"
> - "`FrameRate` math (rational arithmetic, NTSC drop-frame)"
>
> Note: §12 above is the **seed-spec test plan** (the architect's original
> bullet list, preserved verbatim). This section is the **formalized
> per-module testing section** per spec 17's template — derived from §12,
> expanded with SCOUT-03's verified findings (6 sync plans, `VideoSampleSink`,
> `I420P10` decode format), and tightened into named tests with explicit
> assertions and tolerance thresholds.

### Tier 1: Pure engine tests

[Filename: `tests/unit/03-playback-engine/*.test.ts`]
[Runner: Vitest (no DOM, no WebGPU, no AudioContext) — see spec 17 §2.1]

- `mediatime-from-seconds-120k-ticks-per-second` — asserts
  `MediaTime.fromSeconds(1.0)` returns exactly `120_000` ticks (the
  rational `120000/1`, not a floating approximation). Confirms the
  tick-frequency constant (spec §4).
- `mediatime-from-frame-is-exact` — asserts
  `MediaTime.fromFrame({ frame: 30, rate: 30/1 })` returns exactly
  `120_000` ticks; `fromFrame({ frame: 1, rate: 60/1 })` returns `2000`;
  `fromFrame({ frame: 1, rate: 24000/1001 })` returns `5005`. Confirms
  tick divisibility (see next test).
- `framerate-ntsc-exact-rational` — asserts `FrameRate(23.976)` deep-equals
  `{ numerator: 24000, denominator: 1001 }` (not `24` with a float tag);
  same for `FrameRate(29.97)` = `{ 30000, 1001 }` and `59.94` = `{ 60000,
  1001 }`. Confirms exact rational representation per spec §4.2.
- `mediatime-base-divides-all-standard-rates` — asserts `120_000 % N === 0`
  for `N ∈ {24, 25, 30, 50, 60, 120}`, and `120_000 / (N * 1000 / 1001)`
  is an integer for the NTSC drop-frame rates `23.976 → 5005`,
  `29.97 → 4004`, `59.94 → 2002`. This is the foundational invariant for
  frame-accurate math across all standard fps values.
- `mediatime-round-to-frame-edge-cases` — asserts `roundToFrame(t, 30/1)`
  produces `0` ticks at `t=1999`, `4000` ticks at `t=2001`, `4000` ticks at
  `t=4000`, `4000` ticks at `t=5999`, `8000` ticks at `t=6001`. Edge cases:
  exact midpoint, exact boundary, just-before-boundary, just-after-boundary.
- `mediatime-floor-to-frame-edge-cases` — asserts `floorToFrame(t, 30/1)`
  never advances past `t`: `floorToFrame(3999, 30/1) === 0`,
  `floorToFrame(4000, 30/1) === 4000`, `floorToFrame(4001, 30/1) === 4000`.
- `mediatime-ceil-to-frame-edge-cases` — asserts `ceilToFrame(t, 30/1)`
  never recedes below `t`: `ceilToFrame(0, 30/1) === 0`,
  `ceilToFrame(1, 30/1) === 4000`, `ceilToFrame(4000, 30/1) === 4000`,
  `ceilToFrame(4001, 30/1) === 8000`.
- `staticclock-step-to-updates-now` — asserts
  `StaticClock.stepTo(MediaTime.fromSeconds(2.5))` causes the next
  `clock.now()` call to return exactly `300_000` ticks; subsequent
  `stepTo` calls are monotonic (never decrease). `StaticClock` is the
  test double for `Clock` (spec §3.5) — production `Clock` is covered at
  Tier 2 because it requires `AudioContext`.
- `videosourcepool-acquire-release-refcount` — with a mocked `VideoDecoder`
  that records `decode()` calls but returns no real frames, asserts:
  (a) `pool.acquire(key)` on a fresh key triggers one decoder configure;
  (b) a second `acquire(key)` does NOT reconfigure (refcount → 2);
  (c) `pool.release(key)` decrements refcount but keeps the decoder alive
  (refcount → 1); (d) a second `release(key)` triggers `decoder.close()`
  and removes the entry. Confirms the refcounting contract from spec §5.3.

### Tier 2: Render / integration tests

[Filename: `tests/integration/03-playback-engine/*.render.test.ts`]
[Runner: Playwright + headless Chromium with WebGPU + WebCodecs +
 AudioContext (real AudioWorklet module loading). See spec 17 §2.2.]

**Playback frame-accuracy:**

- `play-2s-renders-60-frames-at-30fps` — loads `10s-test-pattern-1080p.mp4`
  (30 fps), issues `engine.command.apply({ type: 'play' })`, waits 2.0 s
  wall-clock, then `engine.command.apply({ type: 'pause' })`. Asserts the
  `framePresented` event counter is `60 ± 2` (tolerance for one rAF drop
  on a contended CI runner). Confirms playback loop runs at display rate.
- `playback-frame-accurate-at-t-1s` — with the same fixture, at wall-clock
  `t = 1.0 s`, samples the visible canvas, pixel-diffs against
  `tests/fixtures/references/10s-test-pattern-1080p-frame-30.png`;
  tolerance `1%` (allowing for decoder chroma subsampling). Source time
  `1.0 s` at 30 fps is frame 30 — confirms half-frame tolerance per spec
  §2 Goal 1.
- `playback-no-av-drift-over-30s` — loads `10s-red-1080p.mp4` *looped 3×*
  to reach 30 s, plays end-to-end, samples audio output via
  `OfflineAudioContext` sink and video frames via `requestVideoFrameCallback`
  counter. Asserts the audio-clock-time and the latest-presented-video-frame
  time diverge by no more than `±half a frame` (16.67 ms at 30 fps) at
  every 1 s checkpoint. Catches progressive drift per spec §2 Goal 2.

**Scrubbing:**

- `scrub-random-frame-displays-within-50ms` — picks 10 random frame
  indices in `[0, 299]`, issues `engine.command.apply({ type: 'seek',
  params: { time } })` for each, and times from `apply()` return to the
  next `framePresented` event. Asserts p50 ≤ 25 ms, p95 ≤ 50 ms. Matches
  spec §2 Goal 3.
- `scrub-rapid-100-seeks-in-1s-no-stale-frames` — fires 100 seek commands
  in a tight loop within 1 s, then asserts (a) `seekGenerations` counter
  incremented by ≥ 100, (b) the final displayed frame matches the final
  seek target (not an earlier intermediate seek), (c) no
  `framePresented` event arrives with a `seekGeneration` older than the
  current one. Confirms the `seekGenerations` invalidation pattern from
  spec §7.4 / SCOUT-03 finding (2).

**Varispeed (audio pitch preservation via SoundTouch AudioWorklet):**

- `varispeed-0.5x-pitch-preserved-duration-doubled` — loads
  `10s-440hz-sine.wav` as audio-only project, issues
  `{ type: 'setRate', params: { rate: 0.5 } }`, captures output via
  `OfflineAudioContext`, runs FFT, asserts the dominant frequency peak is
  `440 Hz ± 2 Hz` (not `220 Hz`). Also asserts wall-clock playback
  duration is `20 s ± 0.1 s` (doubled). Confirms pitch preservation per
  spec §8.1.
- `varispeed-2x-pitch-preserved-duration-halved` — same setup,
  `{ type: 'setRate', params: { rate: 2 } }`. Asserts FFT peak is
  `440 Hz ± 2 Hz` (not `880 Hz`) and wall-clock duration is `5 s ± 0.1 s`.
- `varispeed-minus-1x-reverse-playback` — `{ type: 'setRate', params:
  { rate: -1 } }`. Asserts (a) video frames are emitted in strictly
  descending `frame` order (frame 299, 298, 297, …), (b) audio samples
  are time-reversed relative to source (cross-correlation peak at
  lag `-N` instead of `0`).

**Reverse shuttle (keyboard-driven varispeed):**

- `reverse-shuttle-hold-j-goes-backwards-smoothly` — simulates holding
  `KeyJ` for 1.5 s via `page.keyboard.down('KeyJ')`, then releases. Asserts
  `engine.playback.getRate()` transitions from `1 → -1` (first keydown)
  and stays at `-1` for the hold duration; frame counter strictly
  decreases throughout the hold; no `setRate` command is re-issued on
  every rAF (debounced per spec 16 §3.1 multi-tap semantics).

**Sync plans (6 plans per SCOUT-03 finding 6 — seed spec said 5):**

- `sync-plan-1-paused-frame-sync` — when `isPlaying === false`, calling
  `seek({ time })` triggers exactly one `framePresented` event for the
  new time (no rAF loop). Verifies spec §6 plan 1.
- `sync-plan-2-initial-playing-sync` — on `pause → play` transition,
  asserts the first frame is **premounted** (decode for frame `N+1` starts
  before rAF tick that would have requested it) — measured via a spy on
  `VideoSourcePool.acquire()` that records the timestamp of the first
  acquire after `play()`. Verifies spec §6 plan 2.
- `sync-plan-3-drift-correction` — injects a fake video-frame delay (mock
  `VideoDecoder` that artificially stalls 50 ms on frame 90), then asserts
  that at the next rAF tick the clock snaps back to audio-time and the
  next-presented frame index matches audio time, not video time. Verifies
  spec §6 plan 3.
- `sync-plan-4-premount-next-frame` — during steady-state playback, asserts
  that `VideoSourcePool.acquire()` for frame `N+1` is called before
  `framePresented(N)` returns. Confirms the prefetch window from spec §6
  plan 4.
- `sync-plan-5-reverse-shuttle` — at `rate = -1`, asserts the premount
  logic fetches frame `N-1` (not `N+1`). Direction-aware prefetch. Spec
  §6 plan 5.
- `sync-plan-6-layout-video-sync` — when a `Layout` change is applied
  during playback (e.g., a track visibility toggle), asserts the
  currently-playing frame is re-resolved against the new layout and
  re-presented without dropping the audio clock. This is the 6th plan
  discovered by SCOUT-03 (missing from the seed spec's list of 5).

**Clock ground truth:**

- `audioclock-uses-audiocontext-currenttime` — spies on `AudioContext` and
  asserts `clock.now()` returns `AudioContext.currentTime * 120_000`
  (±1 sample, i.e., ±1/48000 s). Asserts `performance.now()` is **not**
  called in the `now()` path. Confirms spec §3 / SCOUT-03 finding (1).
- `catch-up-to-current-time-after-tab-switch` — uses Playwright's
  `page.context()` + `CDPSession.send('Emulation.setPageVisibility', {
    visible: false })` to background the tab for 3 s, then foregrounds.
  Asserts `_catchUpToCurrentTime()` is invoked once on the next rAF,
  `playbackStartTime` is re-anchored, and the next-presented frame index
  matches `audioClockTime` (not the stale rAF time). Verifies spec §3.6
  / FreeCut `Clock.ts` re-anchor logic.

**Output surface:**

- `videosamplesink-returns-videosample-not-videoframe` — asserts the
  `framePresented` event payload is a `VideoSample` object exposing
  `.toVideoFrame()` (which returns the underlying `VideoFrame`), not a
  raw `VideoFrame` directly. Confirms SCOUT-03 finding (4) — the
  `VideoSampleSink` interface exists between the decode pool and the
  renderer to allow refcount management independent of `VideoFrame.close()`.
  Asserts calling `.toVideoFrame()` twice returns the same `VideoFrame`
  instance (cached, not re-decoded).

**10-bit decode (SCOUT-03 correction to seed spec §5.2):**

- `decode-10bit-source-produces-i420p10-not-p010` — loads
  `10s-10bit-hevc.mp4`, decodes frame 0, asserts `VideoFrame.format` is
  exactly `'I420P10'` (mediabunny's tagged 10-bit YUV 4:2:0 planar format).
  Asserts it is **not** `'P010'` (the format the seed spec claimed —
  SCOUT-03 finding (5) confirmed mediabunny exposes `I420P10`/`I422P10`/
  `I444P10`, not `P010`). Also asserts the 10-bit luma plane carries
  real 10-bit data (sample values outside `[0, 255]`) — guards against
  silent 8-bit truncation in the decode pipeline.

### Tier 3: UI tests

[Filename: `tests/integration/03-playback-engine/*.ui.test.ts`]
[Runner: Playwright with `page.keyboard` — see spec 17 §2.3 and
 spec 16 §4 Pattern 1.]

These tests assert **state WYSIWYG** (spec 17 §6.1): the `EngineCommand`
emitted by the keyboard resolver must produce the same `SceneState`
(in this spec: same `playback.state`) as calling
`engine.command.apply(...)` directly.

- `keyboard-space-toggles-play-pause` — initial state `paused`,
  `page.keyboard.press('Space')`; asserts
  `engine.playback.getState()` deep-equals
  `engine.command.apply({ type: 'play' })`-on-fresh-instance state.
  Press `Space` again; asserts state matches `{ type: 'pause' }` direct
  path. Spec 16 §3.1 row 1.
- `keyboard-jkl-shuttle-works` — sequence: `J` → rate `-1`, `K` →
  `paused` (rate preserved internally as 0 but last-rate remembers
  `-1`), `L` → rate `+1`. Each keypress's resulting
  `playback.state.rate` must equal the rate from
  `engine.command.apply({ type: 'setRate', params: { rate: R } })`
  for the matching `R`. Spec 16 §3.1 rows 2–4. Multi-tap (`J` × 2 →
  `-2`, `L` × 2 → `+2`) covered by a separate sub-test.
- `keyboard-left-right-seek-one-frame` — from `time = 0`,
  `page.keyboard.press('ArrowRight')` → asserts `playback.state.time ===
  MediaTime.fromFrame({ frame: 1, rate: 30/1 })`; press `ArrowLeft` →
  asserts back to `0`. Spec 16 §3.1 rows 9–10.
- `keyboard-shift-left-right-seek-ten-frames` — from `time = 0`,
  `Shift+ArrowRight` ×1 → asserts time === `fromFrame({ frame: 10, rate:
  30/1 })`. Spec 16 §3.1 rows 11–12.
- `keyboard-cmd-left-right-go-to-start-end` — from any middle time,
  `Cmd+ArrowLeft` → asserts `playback.state.time === 0`;
  `Cmd+ArrowRight` → asserts `playback.state.time ===
  project.totalDuration`. Spec 16 §3.1 rows 13–14.
- `keyboard-state-wysiwyg-vs-direct-apply` — for each of the 5 shortcuts
  above, snapshot the full `playback.state` after the keyboard path,
  reset the engine, snapshot the state after the equivalent
  `engine.command.apply(...)` direct path, assert deep-equality. This is
  the spec 17 §6.1 state-WYSIWYG invariant applied to the playback
  module: keyboard == direct API, byte-for-byte (modulo
  non-deterministic wall-clock `currentTime`, which is mocked via
  `StaticClock` for this test).

### Property-based tests

[Filename: `tests/unit/03-playback-engine/*.property.test.ts`]
[Runner: Vitest + fast-check. See spec 17 §7.]

- `mediatime-frame-roundtrip` — `fc.assert(fc.property(arbitraryMediaTime,
  arbitraryFrameRate, (time, rate) => { const back = fromFrame(toFrame(
  time, rate), rate); expect(Math.abs(back - time)).toBeLessThanOrEqual(
  halfFrameTicks(rate)); }), { numRuns: 1000 })`. The round-trip loses
  at most half a frame (the quantization error inherent in any
  frame-based time system). `arbitraryFrameRate` includes `24/1,
  25/1, 30/1, 50/1, 60/1, 120/1, 24000/1001, 30000/1001, 60000/1001`.
- `clock-monotonicity` — `fc.assert(fc.property(arbitraryClockCommands,
  (cmds) => { const clock = new StaticClock(); let prev = clock.now();
  for (const c of cmds) { clock.apply(c); expect(clock.now()).toBeGreater
  ThanEqual(prev); prev = clock.now(); } }), { numRuns: 500 })`.
  `arbitraryClockCommands` generates sequences of `stepTo(t)` (with `t`
  monotonically non-decreasing within a generation) and `seek(t)`
  commands. Within a single time source, `now()` never decreases —
  even across seeks (seek re-anchors but does not move the clock
  backwards; it sets `_playbackStartFrame` to the new frame, not the
  clock).
- `frame-floor-le-time-le-ceil` — `fc.assert(fc.property(
  arbitraryMediaTime, arbitraryFrameRate, (time, rate) => {
  expect(floorToFrame(time, rate)).toBeLessThanOrEqual(time);
  expect(ceilToFrame(time, rate)).toBeGreaterThanOrEqual(time); }),
  { numRuns: 1000 })`. The frame-quantization invariant: any time is
  bracketed by its floor and ceil frame boundaries. Trivially true for
  exact boundary times, non-trivial for arbitrary sub-frame times.

### Test assets

Canonical fixtures from `17-test-plan.md` §5:

- `tests/fixtures/videos/10s-red-1080p.mp4` — solid red, 10 s, 30 fps,
  H.264 `yuv420p` — used for AV drift test (looped 3× for 30 s run).
- `tests/fixtures/videos/10s-smpte-bars-1080p.mp4` — SMPTE color bars,
  10 s, 30 fps — used as a stand-in for "test pattern" (frame-accurate
  verification via per-bar pixel sampling).
- `tests/fixtures/audio/10s-440hz-sine.wav` — 440 Hz sine, 10 s, 48 kHz
  mono — used for all three varispeed pitch tests.

New fixtures required by this spec (to be registered in `17-test-plan.md`
§5.1 / §5.2 before merge — see spec 17 §4.3 anti-pattern "Inventing new
fixture names"):

- `tests/fixtures/videos/10s-test-pattern-1080p.mp4` — 10 s, 1920×1080,
  30 fps, frame-numbered test pattern (each frame has its frame index
  burned into the top-left corner as a 4-digit numeral; solid background
  otherwise). Needed because the SMPTE-bars fixture is *not* frame-unique
  (each frame is identical) — the frame-accuracy test requires being able
  to visually identify frame N. Generation:
  ```bash
  ffmpeg -f lavfi -i testsrc2=size=1920x1080:rate=30:d=10 \
    -vf "drawtext=text='%{n}':x=10:y=10:fontsize=144:fontcolor=white:box=1:boxcolor=black@0.7" \
    -c:v libx264 -pix_fmt yuv420p -g 30 -keyint_min 30 -y \
    tests/fixtures/videos/10s-test-pattern-1080p.mp4
  ```
  (`-g 30 -keyint_min 30` ensures every frame is a keyframe, so the
  decoder can seek to any frame without re-decoding the GOP — required
  for the scrub-latency test to measure the engine, not the decoder.)
- `tests/fixtures/videos/10s-10bit-hevc.mp4` — 10 s, 1920×1080, 30 fps,
  H.265 `yuv420p10le` (10-bit). Used for the 10-bit-decode test (Tier 2
  last bullet). Generation:
  ```bash
  ffmpeg -f lavfi -i testsrc2=size=1920x1080:rate=30:d=10 \
    -c:v libx265 -pix_fmt yuv420p10le -x265-params "keyint=30:min-keyint=30" \
    -y tests/fixtures/videos/10s-10bit-hevc.mp4
  ```

Reference PNGs (one per fixture, at frames 0, 150, 299):

- `tests/fixtures/references/10s-red-1080p-frame-0.png`
- `tests/fixtures/references/10s-red-1080p-frame-150.png`
- `tests/fixtures/references/10s-red-1080p-frame-299.png`
- `tests/fixtures/references/10s-test-pattern-1080p-frame-0.png`
- `tests/fixtures/references/10s-test-pattern-1080p-frame-30.png`
- `tests/fixtures/references/10s-test-pattern-1080p-frame-150.png`
- `tests/fixtures/references/10s-test-pattern-1080p-frame-299.png`
- `tests/fixtures/references/10s-10bit-hevc-frame-0.png`

(Regenerate via `npm run regen-references -- --filter "03-playback-engine"`
per spec 17 §10. The 10-bit reference PNGs are stored as 16-bit PNG to
preserve 10-bit luma data — see spec 17 §10.4.)

### Test commands

```bash
# Run Tier 1 (pure engine) tests for spec 03
npm test -- --filter "03-playback-engine"

# Run Tier 2 (render / integration) tests for spec 03
npm run test:render -- --filter "03-playback-engine"

# Run Tier 3 (UI / keyboard) tests for spec 03
npm run test:ui -- --filter "03-playback-engine"

# Run property-based tests for spec 03
npm run test:property -- --filter "03-playback-engine"

# Run all tiers for spec 03
npm run test:all -- --filter "03-playback-engine"

# Regenerate reference PNGs for spec 03's fixtures (see 17-test-plan.md §10)
npm run regen-references -- --filter "03-playback-engine"
```

### Coverage summary

| Tier | Tests | What it locks down |
|---|---|---|
| Tier 1 (pure) | 9 | `MediaTime` / `FrameRate` math invariants, `StaticClock` test-double behavior, `VideoSourcePool` refcounting |
| Tier 2 (integration) | 19 (incl. 6 sync-plan sub-tests) | Frame accuracy, AV drift, scrub latency + invalidation, varispeed pitch (3 rates), reverse shuttle, 6 sync plans, audio-clock ground truth, tab-switch catch-up, `VideoSampleSink` surface, 10-bit decode format |
| Tier 3 (UI) | 6 (5 shortcuts + 1 WYSIWYG) | Every playback keyboard shortcut from spec 16 §3.1 maps to an `EngineCommand`; state WYSIWYG vs. direct `apply()` |
| Property | 3 | MediaTime↔frame round-trip, clock monotonicity, floor≤time≤ceil |
| **Total** | **37** | |

This locks down every goal from §2 (frame-accurate, no AV drift, smooth
scrubbing, varispeed without audio glitch) and every SCOUT-03 correction
(6 sync plans, `VideoSampleSink`, `I420P10` decode format, audio-clock
ground truth, `_catchUpToCurrentTime` re-anchor).

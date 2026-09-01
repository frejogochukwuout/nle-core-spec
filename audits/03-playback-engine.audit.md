# Audit Report: 03-playback-engine.refined.md
**Auditor:** general-purpose
**Spec under audit:** 03-playback-engine.refined.md (2,360 LOC)
**Scout:** SCOUT-03
**Date:** 2026-08-22

## Summary
- Total claims spot-checked: 19 (18 required + 1 incidental)
- Verified accurate: 16
- Verified inaccurate: 1 (mediabunny license stated as MIT; actual is MPL-2.0)
- Partially accurate (minor wording/range imprecision, no functional impact): 2
- Could not verify: 0

## Verdict: ✅ PASS (with one minor correction required)

The refined spec is accurate on every substantive architectural claim. The only factual error is the misreported license (MPL-2.0 vs. claimed MIT) in §13.C; this does not affect any implementation decision but should be corrected before downstream consumers rely on it. All other claims — file paths, line ranges, code quotes, API surfaces, and behavioural descriptions — verified against `/tmp/freecut`, `/tmp/opencut-classic`, and `/tmp/freecut/node_modules/mediabunny`.

---

## Spot-check results

### Check 1 — "Clock.ts uses AudioContext.currentTime as ground truth"
**Claim:** `Clock.ts:491-507` `_now()` prefers `ctx.currentTime` when `ctx.state==='running'`.
**Source:** `/tmp/freecut/src/runtime/player/clock/Clock.ts:491-507`
**Actual:**
```ts
private _now(): number {
  const ctx = this._audioContext
  const nextTimeSource = ctx?.state === 'running' ? ctx : null
  const rawNow = nextTimeSource ? nextTimeSource.currentTime * 1000 : performance.now()

  if (nextTimeSource !== this._activeTimeSource) {
    this._timeSourceOffsetMs = this._lastNowMs === null ? 0 : this._lastNowMs - rawNow
    this._activeTimeSource = nextTimeSource
  }

  const normalizedNow = rawNow + this._timeSourceOffsetMs
  this._lastNowMs = Math.max(this._lastNowMs ?? normalizedNow, normalizedNow)
  return this._lastNowMs
}
```
**Verdict:** ✅ ACCURATE — exact byte-for-byte match with spec §3.2 quote. `nextTimeSource = ctx?.state === 'running' ? ctx : null` correctly prefers AudioContext.currentTime.

### Check 2 — "6 sync plans exist (not 5)"
**Claim:** `video-sync-plan.ts` exports 6 functions starting with `plan`: `planPremountedVideoSync`, `planLayoutVideoSync`, `planPlayingVideoInitialSync`, `planPlayingVideoDriftCorrection`, `planVideoFrameCallbackCorrection`, `planPausedVideoFrameSync`.
**Source:** `/tmp/freecut/src/runtime/composition-runtime/utils/video-sync-plan.ts`
**Actual (via `^export function plan` grep):**
```
83:  export function planPremountedVideoSync
113: export function planLayoutVideoSync
163: export function planPlayingVideoInitialSync
184: export function planPlayingVideoDriftCorrection
213: export function planPausedVideoFrameSync
260: export function planVideoFrameCallbackCorrection
```
**Verdict:** ✅ ACCURATE — all 6 plans exist at the exact line numbers claimed. Seed spec's "5 plans" is correctly flagged as wrong in §14.F.

### Check 3 — "Monotonic offset is single field, not Map"
**Claim:** `Clock.ts:80-83` declares `_activeTimeSource`, `_timeSourceOffsetMs`, `_lastNowMs` triplet (plus `_audioContext`).
**Source:** `/tmp/freecut/src/runtime/player/clock/Clock.ts:80-83`
**Actual:**
```ts
private _audioContext: AudioContext | null = null
private _activeTimeSource: AudioContext | null | undefined
private _timeSourceOffsetMs = 0
private _lastNowMs: number | null = null
```
**Verdict:** ✅ ACCURATE — exactly as spec §11.1 + §14.C describe. No `Map<…>`. Single-offset mechanism with monotonic guard. Seed spec's "monotonic offset map" wording correctly flagged in §14.C.

### Check 4 — "_catchUpToCurrentTime triggered by visibility/focus/pageshow"
**Claim:** Event listeners at `Clock.ts:95-105`; catch-up method at `Clock.ts:586-601`.
**Source:** `/tmp/freecut/src/runtime/player/clock/Clock.ts:95-105` and `:586-601`
**Actual (95-105):**
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
**Actual (586-601):** `_catchUpToCurrentTime()` method body matches spec verbatim, including the re-anchor comment "Re-anchor to 'now' so the next visible RAF continues smoothly…".
**Registration:** Constructor at lines 128-134 registers `visibilitychange` / `focus` / `pageshow`. Spec §11.1 says "registered in the constructor (line 128-134)" — verified.
**Verdict:** ✅ ACCURATE.

### Check 5 — "VideoSampleSink exists at media-sink.ts:1658"
**Claim:** `VideoSampleSink` class at `node_modules/mediabunny/src/media-sink.ts:1658`.
**Source:** `/tmp/freecut/node_modules/mediabunny/src/media-sink.ts:1658`
**Actual:**
```ts
export class VideoSampleSink extends BaseMediaSampleSink<VideoSample> {
```
**Verdict:** ✅ ACCURATE — class declaration is on exactly line 1658.

### Check 6 — "VideoSampleSink returns VideoSample wrapper, not raw VideoFrame"
**Claim:** `getSample()` returns a `VideoSample` wrapper; the raw `VideoFrame` must be obtained via `.toVideoFrame()`.
**Source:** `media-sink.ts:1658` (class generic param) + `:1717` (`getSample` signature) + `sample.ts:998` (`toVideoFrame`)
**Actual:**
- `BaseMediaSampleSink<VideoSample>` (line 1658) — sink yields `VideoSample`, not `VideoFrame`.
- `async getSample(timestamp: number, options = {})` (line 1717) — returns from `mediaSamplesAtTimestamps([timestamp])` iterator.
- `toVideoFrame(): VideoFrame` at `sample.ts:998` — confirms `VideoSample` is a wrapper with explicit conversion to raw `VideoFrame`.
**Verdict:** ✅ ACCURATE — spec §14.J correctly captures the wrapper/not-raw-VideoFrame distinction.

### Check 7 — "pixelFormat: 'P010' DOES NOT EXIST in mediabunny"
**Claim (a):** `VideoSinkDecoderOptions` at `media-sink.ts:1622-1633` has only `hardwareAcceleration` + `optimizeForLatency`.
**Claim (b):** `VIDEO_SAMPLE_PIXEL_FORMATS` at `sample.ts:160-195` does NOT contain `P010`.
**Claim (c):** `I420P10`, `I420P12`, `I422P10`, `I422P12`, `I444P10`, `I444P12` ARE in the list.
**Source:** `/tmp/freecut/node_modules/mediabunny/src/media-sink.ts:1622-1633` and `/tmp/freecut/node_modules/mediabunny/src/sample.ts:160-195`
**Actual (1622-1633):**
```ts
export type VideoSinkDecoderOptions = {
    hardwareAcceleration?: 'no-preference' | 'prefer-hardware' | 'prefer-software';
    optimizeForLatency?: boolean;
};
```
**Actual (160-195, pixel formats present):** `'I420'`, `'I420P10'`, `'I420P12'`, `'I420A'`, `'I420AP10'`, `'I420AP12'`, `'I422'`, `'I422P10'`, `'I422P12'`, `'I422A'`, `'I422AP10'`, `'I422AP12'`, `'I444'`, `'I444P10'`, `'I444P12'`, `'I444A'`, `'I444AP10'`, `'I444AP12'`, `'NV12'`, `'RGBA'`, `'RGBX'`, `'BGRA'`, `'BGRX'`. **No `'P010'` anywhere.**
**Verdict:** ✅ ACCURATE — all three sub-claims verified. This is the most important correction in the spec and it's correctly justified.

### Check 8 — "VideoFrame transferable via .toVideoFrame() or .clone()"
**Claim:** `VideoSample.toVideoFrame()` at `sample.ts:998`; `VideoSample.clone()` preserves VideoFrame backing at `sample.ts:663-695`.
**Source:** `/tmp/freecut/node_modules/mediabunny/src/sample.ts`
**Actual:**
- `toVideoFrame(): VideoFrame` at line 998 — verified (line 998 in source).
- `clone()` method starts at line 663. The `isVideoFrame(this._data)` branch (which calls `this._data.clone()` — i.e. `VideoFrame.clone()`) is at lines 677-683.
- The full `clone()` method actually extends to **line 719** (closing brace), not line 695 as spec cites.
**Verdict:** ⚠️ PARTIALLY ACCURATE — `toVideoFrame()` line citation correct; `clone()` cited range (663-695) covers the most important branches (VideoFrame branch at 677-683) but the method actually extends to line 719. Functionally correct claim, minor range imprecision. **Severity: trivial.**

### Check 9 — "mediabunny works in Worker"
**Claim (a):** `package.json` `browser` field strips node modules — verified at `package.json:35-39`.
**Claim (b):** `CanvasSink` falls back to `OffscreenCanvas` at `media-sink.ts:1960-1968`.
**Claim (c, in §13.C table):** mediabunny is "MIT license".
**Source:** `/tmp/freecut/node_modules/mediabunny/package.json:35-39`, `:64`; `/tmp/freecut/node_modules/mediabunny/src/media-sink.ts:1960-1968`
**Actual (package.json browser field, lines 35-39):**
```json
"browser": {
  "./dist/modules/src/node.js": false,
  "./src/node.ts": false,
  "node:fs/promises": false
}
```
**Actual (license field, line 64):** `"license": "MPL-2.0"`
**Actual (OffscreenCanvas fallback, 1960-1968):**
```ts
if (!canvas) {
    if (typeof document !== 'undefined') {
        canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
    } else {
        canvas = new OffscreenCanvas(width, height);
    }
    ...
}
```
**Verdict:** ⚠️ PARTIALLY ACCURATE — Worker-compatibility claims verified; **license claim is wrong** (mediabunny is MPL-2.0, not MIT). The MPL-2.0 license is a weak copyleft and has implications for distribution (file-level copyleft; modifications to mediabunny source files must be shared back if distributed). This is materially different from MIT and should be flagged in master spec license compliance section. **Severity: medium** (does not affect playback architecture; affects compliance).

### Check 10 — "OpenCut MediaTime 120,000 ticks/sec at media_time.rs:10"
**Claim:** `TICKS_PER_SECOND: i64 = 120_000` at `rust/crates/time/src/media_time.rs:10`.
**Source:** `/tmp/opencut-classic/rust/crates/time/src/media_time.rs:10`
**Actual:**
```rust
#[export]
pub const TICKS_PER_SECOND: i64 = 120_000;
```
**Verdict:** ✅ ACCURATE — exact match at line 10.

### Check 11 — "120,000 divides evenly by all standard rates"
**Claim:** `frame_rate.rs:102-113` assertions for 23.976, 29.97, 59.94 (among others).
**Source:** `/tmp/opencut-classic/rust/crates/time/src/frame_rate.rs:102-113`
**Actual:**
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
**Math check:** 120000 × 1001 / 24000 = 5005 ✓ ; 120000 × 1001 / 30000 = 4004 ✓ ; 120000 × 1001 / 60000 = 2002 ✓.
**Verdict:** ✅ ACCURATE.

### Check 12 — "seekGenerations pattern at video-cache/service.ts:24, 40-54"
**Claim:** `Map<string, number>` per-mediaId; stale seeks return `currentFrame` (no throw).
**Source:** `/tmp/opencut-classic/apps/web/src/services/video-cache/service.ts:24, 40-54`
**Actual (line 24):**
```ts
private seekGenerations = new Map<string, number>();
```
**Actual (lines 40-54):**
```ts
const generation = (this.seekGenerations.get(mediaId) ?? 0) + 1;
this.seekGenerations.set(mediaId, generation);

const previous = this.frameChain.get(mediaId) ?? Promise.resolve();
const current = previous.then(() => {
    if (this.seekGenerations.get(mediaId) !== generation) {
        return sinkData.currentFrame ?? null;  // ← returns last good frame, no throw
    }
    return this.resolveFrame({ sinkData, time });
});
this.frameChain.set(mediaId, current.catch(() => {}));
return current;
```
**Verdict:** ✅ ACCURATE — matches spec §14.H quote verbatim. Seed spec's `throw new Error('Stale seek')` sketch correctly flagged as wrong.

### Check 13 — "VideoSourcePool.ts manages HTMLVideoElement, not mediabunny decoders"
**Claim:** `VideoSourcePool.ts` (682 LOC) manages `HTMLVideoElement` instances.
**Source:** `/tmp/freecut/src/runtime/player/video/VideoSourcePool.ts:1-70`
**Actual:**
- File header (lines 6-9): "VideoSourcePool.ts - Manages video elements by source URL … multiple clips from the same source file share the same video element(s)."
- `private primary: HTMLVideoElement | null = null` (line 43)
- `private overflow: HTMLVideoElement[] = []` (line 44)
- `MAX_OVERFLOW_ELEMENTS = 3` (line 58), `LOAD_TIMEOUT_MS = 15_000` (line 59)
**Verdict:** ✅ ACCURATE — spec §14.I correct: pool concept transfers, HTMLVideoElement-specific implementation does not.

### Check 14 — "scrub-throttle.ts is at src/shared/utils/ and src/features/timeline/utils/ (NOT src/features/preview/utils/)"
**Claim:** Two paths exist; preview path does NOT exist.
**Source:** filesystem check
**Actual:**
- `/tmp/freecut/src/shared/utils/scrub-throttle.ts` — exists (3,419 bytes)
- `/tmp/freecut/src/features/timeline/utils/scrub-throttle.ts` — exists (97 bytes)
- `/tmp/freecut/src/features/preview/utils/scrub-throttle.ts` — does NOT exist
**Verdict:** ✅ ACCURATE — spec §14.E correct.

### Check 15 — "OpenCut media_time_to_frame rounds to nearest, not floors"
**Claim:** `media_time_to_frame` calls `to_frame_round` (round half up), not `to_frame_floor`.
**Source:** `/tmp/opencut-classic/rust/crates/time/src/media_time.rs:48-57, 199-203`
**Actual:**
```rust
// Line 48-57
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

// Line 199-203
#[export]
pub fn media_time_to_frame(
    MediaTimeToFrameOptions { time, rate }: MediaTimeToFrameOptions,
) -> Option<i64> {
    time.to_frame_round(rate)
}
```
**Verdict:** ✅ ACCURATE — `to_frame_round` is "round half up" (when `remainder * 2 >= ticks_per_frame`), and `media_time_to_frame` calls it. Spec §14.G correctly identifies this as diverging from the seed spec's `Math.floor` sketch.

### Check 16 — "Scrubbing 3-tier cache (GPUTexture / VideoFrame / ImageBitmap) with directional eviction hints"
**Claim:** 3 tiers exist with directional eviction hints.
**Source:** `/tmp/freecut/src/features/preview/utils/scrubbing-cache.ts`
**Actual:**
- File header (lines 1-12) explicitly describes 3 tiers (Tier 1 VRAM GPUTexture, Tier 2 per-video last-frame, Tier 3 deep ImageBitmap buffer).
- Tier 1: `interface GpuCacheEntry { texture: GPUTexture; view: GPUTextureView; blitBindGroup?: GPUBindGroup }` (line 24-28).
- Tier 2: `type Tier2VideoFrame = ImageBitmap | VideoFrame` (line 174) — **union of both types**, not just VideoFrame.
- Tier 3: `private cache = new Map<number, ImageBitmap>()` (line 270) — ImageBitmap-only.
- Directional eviction hints: `interface EvictionHint { currentFrame: number; direction: -1 | 0 | 1 }` (lines 31-34); used by `setEvictionHint()` and `pickEvictionVictim()`.
**Verdict:** ⚠️ PARTIALLY ACCURATE — 3 tiers and directional eviction hints confirmed. **Tier 2 is a union `ImageBitmap | VideoFrame`, not "VideoFrame" as the spec shorthand implies.** This is a minor inaccuracy: spec §13.A describes the file as "3-tier cache (GPUTexture / VideoFrame / ImageBitmap)" — the middle tier is actually a union of the two image types. Functionally the spec is correct that VideoFrame is supported; it's incomplete that ImageBitmap is also supported at the same tier. **Severity: trivial.**

### Check 17 — Two random "Corrections to Seed Spec" entries

#### 17a — §14.A "Clock.ts is 641 LOC, not 642"
**Source:** `wc -l /tmp/freecut/src/runtime/player/clock/Clock.ts` reports `641`. `awk 'END {print NR}'` confirms 641 lines.
**Verdict:** ✅ ACCURATE.

#### 17b — §14.C "Monotonic offset map is actually a single-offset mechanism"
**Source:** Already verified in Check 3 above — three single-value fields (`_activeTimeSource`, `_timeSourceOffsetMs`, `_lastNowMs`) at lines 81-83, no `Map`.
**Verdict:** ✅ ACCURATE.

### Check 18 — "The Clock.ts Full Quote" appendix
**Claim:** §15 contains the complete 641-line source of `/tmp/freecut/src/runtime/player/clock/Clock.ts`, quoted verbatim.
**Method:** Spot-checked 3 random methods by side-by-side comparison.

#### Method 1: `_now()` (original lines 491-507; appendix lines 2195-2211)
Original (lines 491-507):
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
Appendix (lines 2195-2211): byte-for-byte identical (including comments and whitespace).
**Verdict:** ✅ Match.

#### Method 2: `_advancePlaybackTo(now)` (original lines 548-584; appendix lines 2252-2288)
Original (lines 548-584): the method body as quoted in spec §11.1 matches the appendix lines 2252-2288 byte-for-byte, including the `import.meta.env.DEV` jitter monitor call (`_devJitterMonitor?.recordClockFrame(newFrame, false)`) and the `timeupdate` throttle (`TIME_UPDATE_INTERVAL_MS`).
**Verdict:** ✅ Match.

#### Method 3: `seekToFrame(frame)` (original lines 328-344; appendix lines 2032-2048)
Original (lines 328-344):
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
Appendix (lines 2032-2048): byte-for-byte identical.
**Verdict:** ✅ Match.

**Appendix line-count check:** Appendix quotes 641 lines of code (spec lines 1705-2345 inclusive), matching `wc -l` of the source file (641).
**Overall verdict:** ✅ ACCURATE — appendix is a faithful verbatim reproduction.

---

## Issues found

| # | Severity | Issue | Location | Recommended fix |
|---|---|---|---|---|
| 1 | **Medium** | mediabunny license misreported as MIT; actual is MPL-2.0 (Mozilla Public License v2.0, weak copyleft). MPL-2.0 has file-level copyleft implications: modifications to mediabunny source files must be redistributed under MPL-2.0 if the modified library is distributed. | `03-playback-engine.refined.md:1438` (§13.C table) | Change "MIT license" → "MPL-2.0 license". Add a note to master spec §6 (or appropriate section) covering license compliance: mediabunny modifications require source disclosure; downstream consumers of our repo should be informed. |
| 2 | Trivial | `clone()` method cited range "663-695" actually extends to line 719. Cited range covers the most critical branch (`isVideoFrame` at 677-683) but misses the trailing 4 branches. | `03-playback-engine.refined.md:364` (§5.4) and `:1440` (§13.C) | Change "sample.ts:663-695" → "sample.ts:663-719". |
| 3 | Trivial | Scrubbing Tier 2 cache type described as "VideoFrame" in the §13.A summary line, but actual type is `Tier2VideoFrame = ImageBitmap \| VideoFrame` (a union). | `03-playback-engine.refined.md:1415` (§13.A table) | Clarify Tier 2 as "ImageBitmap \| VideoFrame (per-video last-frame)" in the table summary. Body of spec §7 (which describes Tier 2 as "per-video last-frame cache") is correct; only the §13.A summary shorthand is misleading. |

No other issues found. All file paths, line numbers, code quotes, API surface claims, and behavioural descriptions are accurate.

---

## Recommendation

**Verdict: ✅ PASS** (with one trivial-to-medium correction required).

The refined spec is the most rigorous and well-evidenced spec in this audit set so far. Every substantive architectural claim — the audio-clock trick, the 6 sync plans, the seekGenerations pattern, the 120,000-tick MediaTime, the absence of `pixelFormat: 'P010'`, the VideoSample wrapper distinction, the `to_frame_round` rounding behavior, the VideoSourcePool HTMLVideoElement management, the scrub-throttle path correction — is verified against source code with byte-level precision. The §15 appendix's full Clock.ts source quote is a verbatim reproduction (spot-checked 3 random methods + line-count match).

**Action items before downstream consumers:**

1. **(Required)** Fix Issue #1: correct mediabunny license from "MIT" to "MPL-2.0" in §13.C, and surface the MPL-2.0 weak-copyleft implication in master spec §6 (license-compliance section). This is important because:
   - The master spec currently lists mediabunny as a hard dependency (§3 Decision 4).
   - MPL-2.0 file-level copyleft means if we ever need to modify mediabunny source files (e.g., to add `pixelFormat: 'P010'` support per §14.D's option #2), those modifications become MPL-2.0-licensed and must be published.
   - This is a softer constraint than GPL (file-level not project-level), but materially different from MIT and worth flagging in the legal/compliance review.

2. **(Optional, trivial)** Fix Issues #2 and #3 (line range and Tier 2 type wording) for cleanliness. No functional impact.

3. **(No action)** All 18 required spot-checks pass; the spec is ready to feed into the implementation phase P0 (playback spike) and into stream 04 (renderer-color) downstream consumption of the decode pipeline contract defined in §5.

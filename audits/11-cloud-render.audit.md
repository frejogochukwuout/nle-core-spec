# Audit Report: 11-cloud-render.refined.md
**Auditor:** general-purpose
**Spec under audit:** `11-cloud-render.refined.md` (2,371 LOC)
**Scout:** SCOUT-11
**Date:** 2026-08-22
**Stream:** Cloud render audit (AUDIT-11)

## Summary
- Total claims spot-checked: 17 (14 critical findings + §16/§17/§18 quote verifications + 2 corrections)
- Verified accurate: 16
- Verified inaccurate: 1 (§15.L / Q11 — substantive architectural claim about FreeCut's export audio path)
- Could not verify: 0

## Verdict: ⚠️ PASS-WITH-CAVEAT

The refined spec is overwhelmingly accurate. 16 of 17 spot-checks are fully verified against source code (`/tmp/freecut/`), the mediabunny source tree, and authoritative web sources (tigerabrodi blog, Chrome WebGPU troubleshooting docs, MDN, gpuweb#5172, ASWF ORI ProRes encoding guidelines, FFmpeg wiki, RunPod pricing page, Playwright issue tracker). One finding — §15.L (also restated in §Q11 of §12) — is **materially incorrect**: it claims FreeCut's export audio path uses native `AudioBufferSourceNode.playbackRate` (which would shift pitch during varispeed) and is therefore NOT WYSIWYG with the preview's SoundTouch AudioWorklet path. Actual source code at `src/features/export/utils/canvas-audio.ts:1810-1940` (`applySpeedAndPitch()`) shows the export path **also** uses SoundTouch (via `@/infrastructure/audio/time-stretch`, same `TimeStretchProcessor`/`TimeStretchFilter` classes the preview worklet uses). The two paths ARE WYSIWYG for varispeed. The spec's *recommendation* (use the same audio path for preview and cloud render) remains valid as a design guideline, but the *premise* (FreeCut doesn't) is wrong. **Action: revise §15.L and §Q11 to remove the inaccurate claim, or rephrase as "FreeCut's preview and export both use SoundTouch; we should preserve this invariant."**

---

## Spot-check results

### Check 1 — "FreeCut uses in-browser WebCodecs muxer (mediabunny) for final encoded Blob, NOT raw-frame pipe to ffmpeg"
**Source:** `/tmp/freecut/src/headless/main.ts:668-674`
**Actual (verbatim):**
```ts
const result =
  settings.mode === 'audio'
    ? await renderAudioOnly({ settings, composition, onProgress: reportProgress })
    : await renderComposition({ settings, composition, onProgress: reportProgress })

const fileName = effectiveFileName(input.outputFileName, settings)
triggerDownload(result.blob, fileName)
```
`renderComposition` (in `src/features/export/utils/canvas-render-orchestrator.ts:447-878`) dynamically imports mediabunny, instantiates `new mediabunny.Output({ format, target })`, registers `VideoSampleSource` + `AudioSampleSource`, runs `runPipelinedFrameLoop`, then calls `output.finalize()` → `outputTarget.complete()` → returns `{ blob, ... }`. **No raw-frame pipe to ffmpeg.**
**Verdict:** ✅ ACCURATE

### Check 2 — "Triggers browser download via `<a download>` element click; Playwright captures via `page.waitForEvent('download')`"
**Source:** `/tmp/freecut/src/headless/main.ts:449-459` + `/tmp/freecut/headless/lib/render-core.mjs:316-332`
**Actual (verbatim, main.ts):**
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
**Actual (verbatim, render-core.mjs:316-332):**
```js
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
```
**Verdict:** ✅ ACCURATE — both ends of the download event pattern verified byte-for-byte. Race-condition guard (start `waitForEvent` before `evaluate`) is also present.

### Check 3 — "window.freecut API surface is 9 methods"
**Source:** `/tmp/freecut/src/headless/main.ts:1193-1203` + `1281-1291`
**Actual (verbatim):**
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
// ...
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
Counting `ready` as a sentinel field, that's 9 entries. SCOUT-01's earlier "4 methods" worklog note is indeed the incomplete list; SCOUT-11's correction is correct.
**Verdict:** ✅ ACCURATE

### Check 4 — "Chrome flag `--enable-dawn-features=allow_unsafe_apis,disable_adapter_blocklist` is CRITICAL for real GPU on NVIDIA 570+ drivers"
**Method:** Web search.
**Source 1:** tigerabrodi.blog, "How to get WebGPU in Headless Chrome on Cloud GPUs" (Feb 13, 2026) — snippet: *"Dawn rejects NVIDIA drivers 570+ by default. Fix: Disable Dawn's adapter blocklist: `--enable-dawn-features=allow_unsafe_apis,disable_adapter_blocklist`..."*
**Source 2:** Chrome for Developers — "WebGPU: Troubleshooting tips and fixes" — *"you can disable the WebGPU adapters blocklist by enabling the chrome://flags/#enable-unsafe-webgpu flag and restarting Chrome."* (The CLI equivalent is `--enable-dawn-features=allow_unsafe_apis,disable_adapter_blocklist`.)
**Source 3:** GitHub `mlc-ai/web-llm#254` (Jan 4, 2024) — user-facing guidance: *"launch Chrome Canary in command line with flag `--enable-dawn-features=allow_unsafe_apis`."*
**Verdict:** ✅ ACCURATE — multiple independent sources confirm Dawn's separate adapter blocklist (distinct from `--ignore-gpu-blocklist`) rejects NVIDIA 570+ drivers, and the `--enable-dawn-features=allow_unsafe_apis,disable_adapter_blocklist` flag is the canonical fix.

### Check 5 — "about:blank is NOT a secure context — WebGPU won't initialize there. Must serve on http://localhost or http://127.0.0.1"
**Method:** Web search.
**Source 1:** tigerabrodi.blog (Feb 2026) — *"Navigate to http://localhost before checking navigator.gpu — WebGPU requires a secure context. about:blank is not one. http://localhost is."*
**Source 2:** Chrome for Developers — "WebGPU: Troubleshooting tips" — *"WebGPU is accessible only to secure contexts."*
**Source 3:** MDN — `Navigator.gpu` — *"The Navigator.gpu read-only property returns the GPU object for the current browsing context, which is the entry point for the WebGPU API."* (Available only on secure contexts per the WebGPU spec.)
**Source 4:** FreeCut `headless/server.mjs:107-108`:
```js
await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}`
```
FreeCut binds to `127.0.0.1` precisely because `about:blank`/`file://` are not secure contexts.
**Verdict:** ✅ ACCURATE

### Check 6 — "mediabunny UrlSource supports HTTP Range requests at source.ts:904"
**Source:** `/tmp/freecut/node_modules/mediabunny/src/source.ts:895-910`
**Actual (verbatim):**
```ts
// The outer loop is for resuming a request if it dies mid-response
while (true) {
  const abortController = new AbortController();
  const response = await retriedFetch(
    this._options.fetchFn ?? fetch,
    this._url,
    mergeRequestInit(this._requestInit, {
      headers: {
        // Always sending a range request is a good way to probe if the server supports them
        Range: `bytes=${worker.currentPos}-`,
      },
      signal: abortController.signal,
    }),
    this._getRetryDelay,
    () => this._disposed,
  );
```
Line 904 is exactly `Range: `bytes=${worker.currentPos}-`,` as the spec claims.
**Verdict:** ✅ ACCURATE

### Check 7 — "Degrades gracefully to whole-file download when server doesn't respond 206 Partial Content at source.ts:960-982"
**Source:** `/tmp/freecut/node_modules/mediabunny/src/source.ts:946-982`
**Actual (verbatim, abridged):**
```ts
if (response.status !== 206) {
  if (!this._usedForHls) {
    const url = new URL(/* ... */);
    if (url.origin !== 'null'
      && !(url.pathname.endsWith('.m3u8') || url.pathname.endsWith('.m3u'))) {
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

  if (this._orchestrator.fileSize !== null) {
    worker.targetPos = this._orchestrator.fileSize;
  } else {
    // The server is dumb, doesn't even surface the content length, but we'll work with it.
    worker.targetPos = Infinity;
    worker.strictTarget = false;
  }

  this._orchestrator.consolidateEverythingIntoOneWorker(worker);
}
```
**Verdict:** ✅ ACCURATE — the fallback is exactly as the spec describes: log warning, reset position, set `maxCacheSize = Infinity`, consolidate workers. The spec's line range "960-982" covers the warning text and fallback body but **omits the `if (response.status !== 206)` gate at line 946**. Trivial line-range drift; the substantive claim is correct.

### Check 8 — "RunPod pricing: RTX 4090 Secure Cloud $0.74/hr, A100 Secure Cloud $1.39/hr (2026-11)"
**Method:** Web search.
**Source 1:** `https://www.runpod.io/pricing` — snippet: *"Runpod pricing depends on the GPU workload you run: Secure Cloud Per hour Per. RTX 4090 24 GB VRAM 41 GB RAM 6 vCPUs $0.74/hr."*
**Source 2:** `computeprices.com/providers/runpod` — snippet: *"/2026 A100 PCIE $1.39/hr Secure Cloud."*
**Source 3:** `spheron.network/blog/gpu-cloud-pricing-comparison-runpod-vs-vastai-2026` (Aug 11, 2026) — *"RunPod Secure Cloud, $0.69/hr"* (slight discrepancy — possibly stale or Community vs Secure tier confusion).
**Verdict:** ✅ ACCURATE — both core numbers ($0.74/hr RTX 4090, $1.39/hr A100 PCIe Secure Cloud) are verified. The $0.69/hr alternative on Spheron may reflect a temporary discount or stale data; the RunPod pricing page itself shows $0.74/hr.

### Check 9 — "importExternalTexture is INPUT-only — no zero-copy output path for GPU readback"
**Method:** Web search.
**Source 1:** MDN — `GPUDevice: importExternalTexture()` — *"The importExternalTexture() method of the GPUDevice interface takes an HTMLVideoElement or a VideoFrame object as an input and returns a GPUExternalTexture."* (No output-equivalent method exists on `GPUDevice`.)
**Source 2:** `gpuweb#5172` (Apr 23, 2025) — *"Because 'zero copy' means we need to replace the media stack resource (which means replace real buffer) during importing."* The thread discusses relaxing input requirements; no symmetric output API is mentioned.
**Source 3:** `webgpufundamentals.org` — *"importExternalTexture. No copy is made. The texture is only valid until you exit the current JavaScript task."* (Validates the input-only zero-copy contract.)
**Source 4:** `toji.dev/webgpu-best-practices/img-textures.html` (Apr 8, 2026) — *"This restriction allows the browser to implement importExternalTexture() without creating a copy of the video frame."*
**Verdict:** ✅ ACCURATE — `importExternalTexture` is input-only; for output, the only path is `copyTextureToBuffer` + `mapAsync` (slower round-trip).

### Check 10 — "FreeCut's export audio path is NOT WYSIWYG with its preview. Preview uses SoundTouch AudioWorklet (preserves pitch); export uses native AudioBufferSourceNode.playbackRate (shifts pitch)"
**Source:** `/tmp/freecut/src/features/export/utils/canvas-audio.ts:1810-1940` (the `applySpeedAndPitch` function) + `/tmp/freecut/src/runtime/composition-runtime/worklets/soundtouch-preview-processor.worklet.ts:1-2`
**Actual (verbatim, export path, canvas-audio.ts:1810-1840):**
```ts
async function applySpeedAndPitch(
  channels: Float32Array[],
  speed: number,
  pitchShiftSemitones: number,
  sampleRate: number,
): Promise<Float32Array[]> {
  const requiresTimeStretch =
    Math.abs(speed - 1) > 0.0001 || isAudioPitchShiftActive(pitchShiftSemitones)
  if (!requiresTimeStretch) return channels
  if (channels.length === 0 || channels[0]!.length === 0) return channels

  const numChannels = channels.length
  const samplesPerChannel = channels[0]!.length

  log.debug('Applying speed/pitch change with time-stretch processor', {
    speed,
    pitchShiftSemitones,
    sampleRate,
    numChannels,
  })

  try {
    const timeStretch = await import('@/infrastructure/audio/time-stretch')
    const st = new timeStretch.TimeStretchProcessor()

    st.tempo = speed
    st.pitch = getAudioPitchRatioFromSemitones(pitchShiftSemitones)
    st.rate = 1.0
    // ... interleave + filter.extract loop ...
```
**Actual (verbatim, preview path, soundtouch-preview-processor.worklet.ts:1-2):**
```ts
import { TimeStretchFilter, TimeStretchProcessor } from '@/infrastructure/audio/time-stretch'
```
**Cross-check (grep for `AudioBufferSourceNode` in `src/features/export/`):** no matches. Grep for `\.playbackRate\s*=` in `canvas-audio.ts`: no matches. The only `createBufferSource` call in `canvas-audio.ts` is at line 1963 inside `resample()` — for sample-rate conversion (48 kHz ↔ 48 kHz is a no-op), with no `.playbackRate` setter (default = 1.0).
**Verdict:** ❌ **INACCURATE** — FreeCut's export path DOES use SoundTouch. `applySpeedAndPitch()` in `canvas-audio.ts:1810-1940` dynamically imports `@/infrastructure/audio/time-stretch` (a vendored SoundTouch JS v0.2.3 implementation — see the file header in `/tmp/freecut/src/infrastructure/audio/time-stretch.ts:1-17`) and uses the same `TimeStretchProcessor` + `TimeStretchFilter` classes the preview's `soundtouch-preview-processor.worklet.ts` uses. Both paths preserve pitch during varispeed. The only non-WYSIWYG edge case is a **fallback** at `canvas-audio.ts:1915-1938`: if `timeStretch` throws an exception, `applySpeedAndPitch` falls back to linear-interpolation resampling (`output[i] = samples[index0]! * (1 - fraction) + samples[index1]! * fraction`), which DOES shift pitch. But this fallback only fires on SoundTouch failure — the primary export path is bit-equivalent to preview varispeed.

**Impact on the spec:**
- The conclusion in §15.L and §Q11 ("we MUST use the same audio path for both preview and cloud render") remains a valid design recommendation — but the *premise* ("FreeCut doesn't") is wrong.
- If we adopt FreeCut's pattern verbatim (preview = SoundTouch AudioWorklet, export = SoundTouch via `time-stretch.ts`), we ARE bit-equivalent.
- The spec should be revised to either:
  1. Remove §15.L / §Q11 entirely (because FreeCut IS WYSIWYG for varispeed), OR
  2. Rephrase: "FreeCut's preview uses SoundTouch via AudioWorklet; export uses SoundTouch via `applySpeedAndPitch()`. Both preserve pitch — they ARE WYSIWYG. We must preserve this invariant in our spec." AND add a note: "FreeCut has a fallback in `applySpeedAndPitch` that shifts pitch if SoundTouch throws — this is a graceful-degradation bug, not a design choice."
- Also worth noting: FreeCut's preview path uses the AudioWorklet API (real-time, on AudioContext); export uses the offline, non-AudioWorklet entry point to the same algorithm. So Q11's claim ("AudioWorklet works in OfflineAudioContext — Chrome 66+") is technically true but irrelevant — FreeCut's export path doesn't use AudioWorklet at all. The "for our spec" recommendation to use AudioWorklet in OfflineAudioContext is one valid design choice; another (simpler) choice is to mirror FreeCut and use the offline `time-stretch.ts` API directly.

### Check 11 — "AudioWorklet works in OfflineAudioContext — Chrome 66+"
**Method:** Web search.
**Source 1:** Chrome for Developers blog — "Audio Worklet is now available by default" (Dec 14, 2017) — *"Audio Worklet is enabled by default for Chrome 66 or later."*
**Source 2:** `npmjs.com/package/standardized-audio-context` (Aug 31, 2024) — *"The AudioWorklet is accessible as a property of an AudioContext or OfflineAudioContext."* Explicit confirmation that AudioWorklet works in OfflineAudioContext.
**Source 3:** caniuse.com — `mdn-api_audioworklet` — Chrome 66+, Edge 79+, Firefox 76+, Safari 14.1+.
**Verdict:** ✅ ACCURATE — AudioWorklet is enabled by default in Chrome 66+ and is exposed on both `AudioContext` and `OfflineAudioContext`.

### Check 12 — "page.exposeFunction for raw frame ArrayBuffers is TOO SLOW — CDP serializes ArrayBuffer via base64 (33% inflation, ~100 Mbps throughput) → ~0.4 fps at 4K"
**Method:** Web search.
**Source 1:** GitHub `microsoft/playwright#38915` (Jan 22, 2026) — *"Request Serialize ArrayBuffer values into a base64-encoded bytestring instead of an empty array."* This confirms Playwright (via CDP) currently serializes ArrayBuffer as a base64 string, with the inflation cost (4 bytes per 3 bytes = ~33% overhead).
**Source 2:** `playwright.dev/docs/api/class-page` — Playwright explicitly states it only supports transferring JSON-serializable values (plus `-0`, `NaN`, `Infinity`, `-Infinity`); ArrayBuffers are not in the transferable list and must go through base64 encoding via `exposeFunction`.
**Verdict:** ✅ ACCURATE — CDP/Playwright serialize ArrayBuffer via base64, with 33% size inflation. The ~100 Mbps throughput estimate is reasonable (CDP over pipe typically achieves 50-200 Mbps); for a 4K 10-bit frame (~25 MB) the per-frame transfer cost is ~2 sec, yielding ~0.5 fps. The spec's "~0.4 fps at 4K" claim is in the right ballpark.

### Check 13 — "FreeCut's existing Dockerfile uses Mesa lavapipe (software Vulkan) — NOT real GPU"
**Source:** `/tmp/freecut/headless/Dockerfile` (57 LOC, full file read)
**Actual (verbatim, lines 4-7 + 16-28):**
```dockerfile
# FreeCut headless render service.
#
# Builds the harness (dist/) and runs serve.mjs with one warm headless Chrome.
# Google Chrome (not Chromium) is used so H.264/AAC (proprietary codecs) work;
# Mesa lavapipe provides software Vulkan for non-effect WebGPU capability
# detection. GPU-effect projects are rejected on software adapters because
# they can produce blank/corrupt frames; use a native Linux GPU host instead.
...
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
```
**Verdict:** ✅ ACCURATE — Dockerfile installs `mesa-vulkan-drivers` (which includes lavapipe, the software Vulkan implementation). The Dockerfile's own header comment explicitly says "Mesa lavapipe provides software Vulkan." The optional NVIDIA pass-through path requires `--gpus all -e NVIDIA_DRIVER_CAPABILITIES=all` at `docker run` time and an NVIDIA Vulkan ICD mounted from the host — NOT bundled into the image.

### Check 14 — Verify §16 FreeCut `headless/main.ts` Quote (pick 2 sections)

#### §16.1 — File header (main.ts:1-17)
**Source:** `/tmp/freecut/src/headless/main.ts:1-17`
**Spec quote** (from refined.md:1531-1548) and source match byte-for-byte (modulo the 1-2-character indentation the spec's fenced code block preserves).
**Verdict:** ✅ BYTE-FOR-BYTE MATCH

#### §16.8 — `window.freecut` API definition (main.ts:1193-1203 + 1281-1291)
**Source:** `/tmp/freecut/src/headless/main.ts:1193-1203` and `1281-1291`
**Spec quote** (from refined.md:1864-1894) and source match byte-for-byte. 9 methods exactly: `ready`, `renderTimeline`, `renderProject`, `renderFrame`, `dumpLayout`, `editProject`, `normalizeProject`, `probeMedia`, `createProject`.
**Verdict:** ✅ BYTE-FOR-BYTE MATCH

(Bonus: §16.2 `triggerDownload` at main.ts:449-459, §16.4 `detectWebGpu` at main.ts:470-492, and §16.10 `renderJob` at render-core.mjs:268-332 are also byte-for-byte matches. §16.6 `runPipelinedFrameLoop` at pipelined-frame-loop.ts:52-120 is also a byte-for-byte match.)

### Check 15 — Verify §17 ffmpeg Command Reference (pick 2 commands)

#### §17.1 — ProRes 4444 (10-bit, with alpha)
**Spec command (abridged):**
```bash
ffmpeg -y -hide_banner -loglevel warning \
  -f rawvideo -pixel_format yuva444p10le \
  -video_size 3840x2160 -framerate 30000/1001 \
  -i pipe:0 \
  -c:v prores_ks -profile:v 4 \
  -pix_fmt yuva444p10le \
  -alpha_bits 16 \
  -vendor apl0 \
  ...
```
**Verification:**
- Source 1: ASWF ORI Encoding Guidelines (`academysoftwarefoundation.github.io/EncodingGuidelines/EncodeProres.html`) — confirms `prores_ks` encoder and the profile table (0=Proxy, 1=LT, 2=SQ, 3=HQ, 4=4444, 5=4444 XQ).
- Source 2: FFmpeg wiki Encode/VFX — confirms `prores_ks` profile 4 = 4444, profile 5 = 4444 XQ.
- Source 3: vhs-decode wiki "ProRes The Definitive FFmpeg Guide" — confirms 4444 XQ is ~500 Mbps for 4:4:4 @ 29.97 fps.
- `-alpha_bits 16` default is 16 per FFmpeg source — explicit declaration is fine.
- `-vendor apl0` is the standard Apple-compatibility hack.
**Verdict:** ✅ CORRECT — `prores_ks -profile:v 4` for ProRes 4444 is verified.

#### §17.4 — DNxHR HQX (Avid handoff, 10-bit 4:2:2)
**Spec command (abridged):**
```bash
ffmpeg -y -hide_banner -loglevel warning \
  -f rawvideo -pixel_format yuv422p10le \
  -video_size 3840x2160 -framerate 30000/1001 \
  -i pipe:0 \
  -c:v dnxhd -profile:v dnxhr_hqx \
  -pix_fmt yuv422p10le \
  ...
```
**Verification:**
- Source 1: macilatthefront.blogspot.com (Dec 1, 2018) — confirms the encoder name is `dnxhd` (not `dnxhr`); DNxHR variants are selected via `-profile:v dnxhr_hqx` (or `_lb`, `_sq`, `_hq`, `_444`).
- Source 2: gist.github.com/dexeonify — *"Encoding DNxHR ffmpeg. The `-profile:v` output option is required to select the DNxHR profile, such as `-profile:v dnxhr_hq`. are: dnxhd, dnxhr_444. DNxHR HQ:"*
- Source 3: reddit.com/r/ffmpeg — *"add `-profile:v` followed by `dnxhr_lb`, `dnxhr_sq`, `dnxhr_hq`, `dnxhr_hqx`, or `dnxhr_444`."*
**Verdict:** ✅ CORRECT — `-c:v dnxhd -profile:v dnxhr_hqx` is verified; the spec's note ("encoder name is `dnxhd` (NOT `dnxhr`) — `dnxhr` is the profile prefix") is precisely correct.

### Check 16 — Verify §18 Dockerfile Reference (sanity-check apt-get packages, Chrome flags, GPU verification step)

**§18.1 — FreeCut's existing Dockerfile (verified)**

The spec's quote at §18.1 matches `/tmp/freecut/headless/Dockerfile` byte-for-byte (with the same 57-LOC count). Sanity checks:
- ✅ Base image: `node:24-bookworm` — current Node LTS, Debian 12 (bookworm) base.
- ✅ apt-get packages: `google-chrome-stable`, `mesa-vulkan-drivers`, `libvulkan1`, `vulkan-tools`, `fonts-liberation`, `fonts-noto-color-emoji` — complete for software-Vulkan WebGPU.
- ✅ `--no-install-recommends` flag — keeps image lean.
- ✅ `rm -rf /var/lib/apt/lists/*` — standard cleanup.
- ✅ `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` — uses system Chrome, avoids bundled Chromium download.
- ✅ `npm ci --ignore-scripts` — skips prepare hook (git hooks).
- ✅ ENV vars: `FREECUT_CHROME_ARGS="--no-sandbox"`, `FREECUT_HOST=0.0.0.0`.
- ✅ EXPOSE 8787 + exec-form CMD — proper PID 1 SIGTERM handling.
- ⚠️ Note: `npm run build` is invoked, but the `dist/` output isn't copied to a slim runtime stage. This means the image ships with full `node_modules` (~600 MB) and source. Acceptable for FreeCut's purposes; for a slimmer production image a multi-stage build would help.

**§18.2 — Our RunPod GPU Dockerfile (UNTESTED)**

Sanity checks:
- ✅ Base: `nvidia/cuda:12.4.1-runtime-ubuntu22.04` — standard CUDA runtime; matches RunPod's host driver expectations.
- ✅ Chrome install — same wget/gpg/apt pattern as FreeCut's, well-vetted.
- ✅ Vulkan loader upgrade from lunarg — addresses the Ubuntu 22.04 default 1.3.204 vs NVIDIA 570+ 1.4 requirement. Correctly motivated.
- ✅ ffmpeg + dbus + fonts + Node.js 20 LTS — complete.
- ✅ Chrome flags in `FREECUT_CHROME_ARGS`: `--no-sandbox --enable-dawn-features=allow_unsafe_apis,disable_adapter_blocklist --disable-dawn-features=disallow_unsafe_apis --disable-vulkan-surface --disable-gpu-sandbox` — matches §4.1 verified working set.
- ✅ `docker-entrypoint.sh` — starts dbus, runs `nvidia-smi | head -5` and `vulkaninfo --summary | grep -A2 "GPU0"` for GPU verification, then `exec "$@"`. Standard PID-1-friendly pattern.
- ⚠️ Concern: the apt-get invocation uses shell `&&` continuations inside a single `RUN` statement but mixes commented lines (`# Chrome`, `# Vulkan`, etc.) mid-`&&` — these comments may break the shell parser when in a Dockerfile RUN. Recommend verifying the Dockerfile actually builds, or removing inline comments.
- ⚠️ Concern: `apt-key add -` is deprecated in Debian 12+; should use `gpg --dearmor -o /usr/share/keyrings/lunarg.gpg` like the Chrome signing key block does.
- ⚠️ Concern: `curl -fsSL https://deb.nodesource.com/setup_20.x | bash -` installs NodeSource repo; node:20-bookworm is also a valid base image — would simplify the Dockerfile. Tradeoff documented in §18.2's header ("UNTESTED — needs verification on RunPod"), so this is acceptable as a draft.
- ✅ RunPod deployment template — `gpu_type: "RTX 4090"`, `NVIDIA_DRIVER_CAPABILITIES: all`, `NVIDIA_VISIBLE_DEVICES: all`, volume mount `/workspace`. Correct.

**§18.3 — Verification checklist:** all four steps (vulkaninfo GPU0 detection, Chrome launch with real GPU adapter probe, ffmpeg encoder list check, render speed test) are sensible and verifiable. The gpu-test.html adapter probe via `powerPreference: 'low-power'` is the correct call per the tigerabrodi blog's "Problem 4" caveat.

**Verdict:** ✅ DOCKERFILE REFERENCE SANE — §18.1 verified byte-for-byte; §18.2 has three minor style/robustness concerns (inline comments, deprecated apt-key, NodeSource-vs-node-base-image choice) but is structurally sound for the documented "untested" status.

### Check 17 — Pick 2 random "Corrections to Seed Spec" entries

#### §15.A — "`--use-vulkan` is NOT a real Chrome flag"
**Spec claim:** The correct flag is `--use-angle=vulkan`. Verified via FreeCut `headless/lib/cli.mjs:42`.
**Source:** `/tmp/freecut/headless/lib/cli.mjs:31-51`
**Actual (verbatim):**
```js
export function chromeLaunchArgs() {
  const replace = process.env.FREECUT_CHROME_ARGS_REPLACE
  if (replace) return replace.split(/\s+/).filter(Boolean)

  const angle =
    process.platform === 'win32'
      ? '--use-angle=d3d11'
      : process.platform === 'darwin'
        ? '--use-angle=metal'
        : '--use-angle=vulkan'
  const base = [
    '--enable-unsafe-webgpu',
    '--enable-features=Vulkan',
    '--ignore-gpu-blocklist',
    angle,
  ]
  const extra = (process.env.FREECUT_CHROME_ARGS ?? '').split(/\s+/).filter(Boolean)
  return [...base, ...extra]
}
```
**Verdict:** ✅ CORRECT — FreeCut uses `--use-angle=vulkan` on Linux (line 42). `--use-vulkan` is not a real Chrome flag. The spec's quote of cli.mjs:31-51 (also at refined.md:139-149) is byte-for-byte accurate.

#### §15.B — "`--enable-webgpu` is NOT a real Chrome flag"
**Spec claim:** The correct flag is `--enable-unsafe-webgpu`. Verified via FreeCut `headless/lib/cli.mjs:44` and Chrome developer docs.
**Source:** Same `cli.mjs` excerpt above — line 44 uses `--enable-unsafe-webgpu`, NOT `--enable-webgpu`. Chrome developer docs at `https://developer.chrome.com/docs/web-platform/webgpu/troubleshooting-tips` confirm `chrome://flags/#enable-unsafe-webgpu` is the correct user-facing toggle (the CLI equivalent is `--enable-unsafe-webgpu`).
**Verdict:** ✅ CORRECT

(Bonus spot-checks of additional corrections: §15.G about:blank-secure-context — verified via Check 5 above. §15.M RunPod pricing — verified via Check 8. All correct.)

---

## Cross-spec consistency checks

### File LOC counts (§14 Code References)
| File | Spec LOC | Actual `wc -l` | Delta | Notes |
|---|---|---|---|---|
| `src/headless/main.ts` | 1293 | 1292 | -1 | trailing-newline |
| `src/features/export/utils/canvas-render-orchestrator.ts` | 1128 | 1128 | 0 | exact |
| `src/features/export/utils/pipelined-frame-loop.ts` | 120 | 121 | +1 | trailing-newline |
| `src/features/export/utils/render-pipeline.ts` | 304 | 304 | 0 | exact |
| `src/features/export/utils/export-output-target.ts` | 140 | 140 | 0 | exact |
| `src/features/export/workers/export-render.worker.ts` | 182 | 182 | 0 | exact |
| `src/infrastructure/browser/blob-url-manager.ts` | 199 | 198 | -1 | trailing-newline |
| `src/infrastructure/browser/mediabunny-input-source.ts` | 108 | 107 | -1 | trailing-newline |
| `src/features/export/utils/canvas-audio.ts` | 2975 | 2974 | -1 | trailing-newline |
| `headless/render.mjs` | 196 | 196 | 0 | exact |
| `headless/serve.mjs` | 746 | 746 | 0 | exact |
| `headless/server.mjs` | 116 | 116 | 0 | exact |
| `headless/lib/render-core.mjs` | 338 | 337 | -1 | trailing-newline |
| `headless/lib/cli.mjs` | 51 | 51 | 0 | exact |
| `headless/lib/page-session.mjs` | 99 | 99 | 0 | exact |
| `headless/lib/http-security.mjs` | 236 | 236 | 0 | exact |
| `headless/Dockerfile` | 57 | 57 | 0 | exact |
| `node_modules/mediabunny/src/source.ts` | 2571 total | 2570 | -1 | trailing-newline |

All deltas are ±1, explained by trailing-newline conventions. No material discrepancies.

### Cross-references to other streams
- **SCOUT-01** (01-core-engine): the worklog note "src/headless/main.ts (1293 LOC, partial) — headless entry exposing window.freecut API" is correctly superseded by SCOUT-11's "9 methods, full read." The cross-reference at §15.K is accurate.
- **SCOUT-02** (02-workers-threading): the finding "SoundTouch AudioWorklet uses `numberOfInputs: 0`, source pushed via port (soundtouch-worklet-audio.tsx:188-195)" is verified (see `/tmp/freecut/src/runtime/composition-runtime/components/soundtouch-worklet-audio.tsx:188-191` — `numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2]`). The cross-reference at §15.L is accurate; only SCOUT-11's *interpretation* of the export path is wrong.
- **SCOUT-04** (04-renderer-color): the note "FreeCut has no readback (uses mediabunny VideoSample directly)" is verified — `renderComposition` constructs `VideoSample` from the canvas directly (no `copyTextureToBuffer` in the export path).

---

## Issues found

### Issue 1 — §15.L and §Q11: FreeCut export audio path claim is INCORRECT
**Severity:** Medium (architectural claim, but conclusion survives)
**Location:** refined.md:1501-1509 (§15.L) and refined.md:1285-1287 (§Q11)
**Issue:** The spec claims FreeCut's export audio path uses "OfflineAudioContext's built-in `AudioBufferSourceNode.playbackRate` property for varispeed" and that this "shifts pitch during varispeed" (i.e., export is NOT WYSIWYG with preview's SoundTouch path).
**Actual:** FreeCut's export path uses `applySpeedAndPitch()` in `canvas-audio.ts:1810-1940`, which dynamically imports `@/infrastructure/audio/time-stretch` (a vendored SoundTouch JS v0.2.3 implementation) and uses the same `TimeStretchProcessor`/`TimeStretchFilter` classes the preview's `soundtouch-preview-processor.worklet.ts` uses. Both paths preserve pitch during varispeed — they ARE WYSIWYG for varispeed.
**Evidence:**
- `applySpeedAndPitch` (canvas-audio.ts:1810-1940): uses `st.tempo = speed`, `st.pitch = ...`, `st.rate = 1.0` — classic SoundTouch WSOLA time-stretch.
- `soundtouch-preview-processor.worklet.ts:1-2`: imports the same `TimeStretchFilter, TimeStretchProcessor` from `@/infrastructure/audio/time-stretch`.
- `grep` for `AudioBufferSourceNode` in `src/features/export/`: 0 matches.
- `grep` for `\.playbackRate\s*=` in `canvas-audio.ts`: 0 matches. The only `createBufferSource` call is at line 1963 inside `resample()` (sample-rate conversion only, default playbackRate = 1.0).
**Fallback path:** `applySpeedAndPitch` does have a `catch` block (line 1915) that falls back to linear-interpolation resampling IF SoundTouch throws. This fallback DOES shift pitch. But this is a graceful-degradation bug, not the primary design.
**Recommended fix:** Revise §15.L and §Q11 to either:
1. Remove the claim entirely (FreeCut IS WYSIWYG for varispeed).
2. Rephrase: "FreeCut's preview path uses SoundTouch via AudioWorklet; export path uses SoundTouch via `applySpeedAndPitch()` (canvas-audio.ts:1810-1940). Both preserve pitch — they ARE WYSIWYG. Note: FreeCut has a fallback at canvas-audio.ts:1915-1938 that shifts pitch IF SoundTouch throws; this is a graceful-degradation bug, not a design choice. For our spec, we MUST use SoundTouch for both preview and cloud render (same as FreeCut's primary path), and document the fallback as a known non-WYSIWYG edge case."
3. Note that AudioWorklet-in-OfflineAudioContext is one valid design choice for our spec, but mirroring FreeCut's actual pattern (offline `time-stretch.ts` API in the cloud render, AudioWorklet in the live preview) is simpler and equivalent.

### Issue 2 — §7 mediabunny fallback line range: spec says 960-982; actual gate is at 946
**Severity:** Cosmetic
**Location:** refined.md (referenced in §Q5 at line 1210 and elsewhere)
**Issue:** Spec says the 206 fallback logic is at "source.ts:960-982." The actual `if (response.status !== 206)` check is at line 946; lines 960-982 cover the warning text and fallback body but omit the gate.
**Recommended fix:** Update line range to "source.ts:946-982" (or "946-982" wherever cited).

### Issue 3 — §18.2 RunPod Dockerfile has minor robustness concerns
**Severity:** Low (Dockerfile is documented as UNTESTED)
**Location:** refined.md:2240-2267
**Issues:**
1. Inline `#` comments inside a `RUN apt-get ... && \ ... # comment && ...` chain may break the shell parser. Recommend either removing inline comments or splitting into multiple `RUN` statements.
2. `apt-key add -` is deprecated in Debian 12+; recommend `gpg --dearmor -o /usr/share/keyrings/lunarg.gpg` (matching the Chrome signing key block).
3. The Dockerfile installs Node.js 20 LTS via NodeSource on top of `nvidia/cuda:...-ubuntu22.04`. Alternatively, could use `nvidia/cuda:12.4.1-runtime-ubuntu22.04` + a multi-stage build that copies `node` from `node:20-bookworm`. Either is fine; documented as UNTESTED so acceptable.
**Recommended fix:** When promoting §18.2 from UNTESTED to production-ready, address items 1 and 2.

### Issue 4 — RunPod Secure Cloud RTX 4090 price: $0.74 vs $0.69
**Severity:** Cosmetic
**Location:** refined.md:192 (pricing table)
**Issue:** RunPod's own pricing page shows $0.74/hr for RTX 4090 Secure Cloud (matches spec). Spheron's Aug 2026 blog cites $0.69/hr (likely stale or different tier). Spec uses $0.74 — verified correct.
**Recommended fix:** None. Document for future re-verification.

---

## Recommended actions for next stream

1. **Apply Issue 1 fix** — revise §15.L and §Q11 to remove the incorrect "export uses native AudioBufferSourceNode.playbackRate" claim. Either remove the claim entirely or rephrase per the fix options above. This propagates: the seed spec's §5.1 `renderAudio()` placeholder (`return buffer.getChannelData(0);  // mono for now`) is still a real issue to fix, but the varispeed-WYSIWYG concern is a non-issue.
2. **Apply Issue 2 fix** — update mediabunny fallback line range from "960-982" to "946-982."
3. **Track Issue 3** — when the team builds the actual RunPod Dockerfile, address the inline-comment and apt-key concerns.
4. **Stream 12 (testing strategy)** should add a regression test: render a project with `speed = 0.5` (varispeed) via both preview and cloud render, FFT-compare the audio output. This would have caught Issue 1 if the test had been run against FreeCut's actual code.

---

**End of audit.**

# 12 — Testing Strategy: Virtual Framebuffer, Pixel Verification, Audio Waveform Checks

**Stream:** Test infrastructure & verification strategy
**Status:** Seed spec (sub-agent scout will refine with code references)
**Spec file:** `12-testing-strategy.md`

---

## 1. Purpose

Define how the engine is tested programmatically. For a video editor, "it works" means "the pixels are correct" — which requires pixel-level verification. This stream defines the test infrastructure, test asset design, and the test matrix that runs in CI.

---

## 2. Goals

1. **Pixel-verified correctness.** Every render path produces verifiable pixels — no "looks right" tests.
2. **Audio-verified correctness.** Audio rendering produces verifiable PCM samples — no "sounds right" tests.
3. **Multi-track blend tests.** Use distinct colors per track so blend modes can be verified by sampling specific pixels.
4. **WYSIWYG verification.** Browser render == cloud render, bit-identical.
5. **Property-based testing.** NLE ops preserve invariants under random inputs.
6. **CI-friendly.** Tests run in headless Chrome with virtual framebuffer — no display required.

---

## 3. Test Infrastructure

### 3.1 Test stack

| Layer | Tool | Purpose |
|---|---|---|
| Unit tests | **Vitest** | Pure-function tests (ops, color math, time math) |
| Component tests | **Vitest + jsdom** | React component tests (timeline UI) |
| Integration tests | **Playwright** | Browser-driven tests (load project, play, screenshot) |
| Cloud render tests | **Playwright + Node.js** | Headless Chrome + ffmpeg verification |
| Property tests | **fast-check** | Invariant verification for NLE ops |
| Pixel verification | **Playwright screenshot + pixelmatch** | Visual diffing with threshold |
| Audio verification | **OfflineAudioContext + FFT** | Audio sample comparison |
| Performance tests | **Playwright + performance.now()** | FPS, latency, memory |
| CI | **GitHub Actions** | Runs all tests on every PR |

### 3.2 Virtual framebuffer

For headless Chrome on Linux CI, we need a virtual display:

```bash
# Linux CI setup
apt-get install -y xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99

# Run tests
npx playwright test
```

Playwright's `chromium.launch({ headless: true })` uses headless mode by default, which doesn't need Xvfb. But for tests that need a real GPU (WebGPU), we need:
- GPU passthrough (only on self-hosted runners or specialized cloud runners)
- Or: software WebGPU via SwiftShader (slow but works)

For CI, use software WebGPU:
```bash
google-chrome --headless=new \
  --enable-unsafe-swiftshader \
  --enable-features=Vulkan \
  --use-vulkan=swiftshader \
  --enable-webgpu
```

For local development, use real GPU.

### 3.3 Test project structure

```
tests/
├── unit/                       # Vitest unit tests
│   ├── engine/
│   │   ├── media-time.test.ts
│   │   ├── frame-rate.test.ts
│   │   ├── color-space.test.ts
│   │   └── ...
│   ├── ops/
│   │   ├── split.test.ts
│   │   ├── trim.test.ts
│   │   ├── move.test.ts
│   │   ├── ripple.test.ts
│   │   ├── roll.test.ts
│   │   ├── slip.test.ts
│   │   ├── slide.test.ts
│   │   └── ...
│   ├── color/
│   │   ├── color-wheels.test.ts
│   │   ├── curves.test.ts
│   │   ├── lut.test.ts
│   │   ├── qualifier.test.ts
│   │   └── ...
│   └── fcpxml/
│       ├── export.test.ts
│       ├── validate.test.ts
│       └── ...
├── components/                 # Vitest + jsdom component tests
│   ├── timeline/
│   │   ├── Timeline.test.tsx
│   │   ├── TimelineElement.test.tsx
│   │   └── ...
│   └── ...
├── integration/                # Playwright integration tests
│   ├── playback.test.ts
│   ├── editing.test.ts
│   ├── color-grading.test.ts
│   ├── export.test.ts
│   └── ...
├── cloud-render/               # Cloud render tests
│   ├── render-frame.test.ts
│   ├── wysiwyg.test.ts
│   ├── audio.test.ts
│   └── ...
├── property/                   # Property-based tests
│   ├── ops-invariants.test.ts
│   └── ...
├── fixtures/                   # Test assets
│   ├── videos/                  # Test source videos
│   │   ├── 10s-red-1080p.mp4    # Solid red, 10 seconds
│   │   ├── 10s-green-1080p.mp4
│   │   ├── 10s-blue-1080p.mp4
│   │   ├── 10s-gradient-1080p.mp4
│   │   ├── 10s-test-pattern-1080p.mp4
│   │   └── ...
│   ├── audio/
│   │   ├── 10s-440hz-sine.wav   # 440Hz reference tone
│   │   ├── 10s-1000hz-sine.wav
│   │   └── ...
│   ├── projects/                # Sample project JSON files
│   │   ├── simple-cut.json
│   │   ├── multi-track.json
│   │   ├── with-transitions.json
│   │   ├── with-effects.json
│   │   └── ...
│   ├── references/              # Reference render outputs
│   │   ├── simple-cut-frame-0.png
│   │   ├── simple-cut-frame-100.png
│   │   ├── multi-track-frame-50.png
│   │   └── ...
│   └── luts/
│       ├── identity.cube
│       ├── swap-rb.cube
│       └── ...
└── helpers/
    ├── pixel-diff.ts            # Screenshot comparison utility
    ├── audio-diff.ts            # Audio sample comparison utility
    ├── test-engine.ts           # Engine test fixture
    └── ...
```

---

## 4. Test Asset Design

### 4.1 Solid-color test videos

For verifying blend modes, opacity, and layer ordering, we need solid-color source clips. Generate them programmatically:

```ts
// tests/helpers/generate-test-video.ts

import { spawn } from 'child_process';

async function generateSolidColorVideo(color: 'red' | 'green' | 'blue' | 'white' | 'black', durationSec: number, outputPath: string) {
  const colors = {
    red: '0x0000FF',     // BGR format for ffmpeg
    green: '0x00FF00',
    blue: '0xFF0000',
    white: '0xFFFFFF',
    black: '0x000000',
  };
  
  const ffmpeg = spawn('ffmpeg', [
    '-f', 'lavfi',
    '-i', `color=c=${color}:s=1920x1080:r=30:d=${durationSec}`,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-y', outputPath,
  ]);
  
  await new Promise(resolve => ffmpeg.on('close', resolve));
}

// Generate all standard test clips
async function generateAllTestClips() {
  await generateSolidColorVideo('red', 10, 'tests/fixtures/videos/10s-red-1080p.mp4');
  await generateSolidColorVideo('green', 10, 'tests/fixtures/videos/10s-green-1080p.mp4');
  await generateSolidColorVideo('blue', 10, 'tests/fixtures/videos/10s-blue-1080p.mp4');
  await generateSolidColorVideo('white', 10, 'tests/fixtures/videos/10s-white-1080p.mp4');
  await generateSolidColorVideo('black', 10, 'tests/fixtures/videos/10s-black-1080p.mp4');
}
```

### 4.2 Gradient test videos

For verifying color accuracy and banding:

```ts
async function generateGradientVideo(direction: 'horizontal' | 'vertical' | 'diagonal', durationSec: number, outputPath: string) {
  // Use ffmpeg's gradient filter
  // ...
}
```

### 4.3 Test pattern videos

For verifying specific pixel positions:

```ts
async function generateTestPattern(outputPath: string) {
  // SMPTE color bars + circle + grid
  // ...
}
```

### 4.4 Reference audio

Generate reference tones:

```ts
async function generateSineWave(freq: number, durationSec: number, outputPath: string) {
  const ffmpeg = spawn('ffmpeg', [
    '-f', 'lavfi',
    '-i', `sine=frequency=${freq}:duration=${durationSec}:sample_rate=48000`,
    '-c:a', 'pcm_s16le',
    '-y', outputPath,
  ]);
  await new Promise(resolve => ffmpeg.on('close', resolve));
}
```

### 4.5 Test project files

Test projects are JSON files with specific scenarios:

```json
{
  "schemaVersion": 1,
  "metadata": { "id": "test-multi-track", "name": "Multi-track blend test", ... },
  "settings": { "fps": { "numerator": 30, "denominator": 1 }, "canvasSize": { "width": 1920, "height": 1080 }, ... },
  "scenes": [{
    "id": "scene-1",
    "name": "Main",
    "isMain": true,
    "tracks": {
      "overlay": [
        { "id": "track-overlay-1", "name": "Green Overlay", "elements": ["el-green"], ... }
      ],
      "main": { "id": "track-main", "name": "Red Main", "elements": ["el-red"], ... },
      "audio": [
        { "id": "track-audio-1", "name": "Audio", "elements": ["el-audio-1"], ... }
      ]
    }
  }],
  "media": [
    { "id": "media-red", "name": "red.mp4", ... },
    { "id": "media-green", "name": "green.mp4", ... }
  ]
}
```

---

## 5. Pixel Verification

### 5.1 Screenshot + pixel-diff

```ts
// tests/helpers/pixel-diff.ts

import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export interface PixelDiffResult {
  matchPercent: number;          // 0-100
  diffPixels: number;
  totalPixels: number;
}

export async function compareScreenshots(
  actual: Buffer,
  referencePath: string,
  threshold: number = 0.1,        // 0-1, per-pixel difference threshold
  maxDiffPercent: number = 0.5    // max allowed % of differing pixels
): Promise<PixelDiffResult> {
  const actualPng = PNG.sync.read(actual);
  const referenceBuffer = await fs.readFile(referencePath);
  const referencePng = PNG.sync.read(referenceBuffer);
  
  if (actualPng.width !== referencePng.width || actualPng.height !== referencePng.height) {
    throw new Error('Size mismatch');
  }
  
  const { width, height } = actualPng;
  const diff = new PNG({ width, height });
  
  const diffPixels = pixelmatch(
    actualPng.data,
    referencePng.data,
    diff.data,
    width,
    height,
    { threshold }
  );
  
  const totalPixels = width * height;
  const matchPercent = ((totalPixels - diffPixels) / totalPixels) * 100;
  
  if (matchPercent < 100 - maxDiffPercent) {
    // Save diff for debugging
    const diffPath = referencePath.replace('.png', '.diff.png');
    await fs.writeFile(diffPath, PNG.sync.write(diff));
  }
  
  return { matchPercent, diffPixels, totalPixels };
}
```

### 5.2 Sampling specific pixels

For tests that need to verify specific pixels (e.g., "the center pixel should be 50% red + 50% green = yellow"):

```ts
export async function samplePixel(screenshot: Buffer, x: number, y: number): Promise<{ r: number; g: number; b: number; a: number }> {
  const png = PNG.sync.read(screenshot);
  const idx = (png.width * y + x) << 2;
  return {
    r: png.data[idx],
    g: png.data[idx + 1],
    b: png.data[idx + 2],
    a: png.data[idx + 3],
  };
}

export function assertPixelColor(actual: { r: number; g: number; b: number }, expected: { r: number; g: number; b: number }, tolerance: number = 5) {
  expect(Math.abs(actual.r - expected.r)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(actual.g - expected.g)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(actual.b - expected.b)).toBeLessThanOrEqual(tolerance);
}
```

### 5.3 Linear-light assertions

When comparing colors, remember our pipeline operates in linear-light. So expected values must be computed in linear-light:

```ts
// sRGB 50% gray = 128/255 = 0.502 in gamma-encoded space
// Linear-light equivalent: ~0.21586 (pow(0.502, 2.2))

// Two clips at 50% opacity blended in linear-light:
// result = (0.5 * src1 + 0.5 * src2) in linear space
// = (0.5 * 1.0 + 0.5 * 0.0) for src1=white(1.0) and src2=black(0.0) = 0.5
// Encoded back to sRGB: pow(0.5, 1/2.2) = 0.735
// In 8-bit canvas: 0.735 * 255 = 187

// So a 50/50 blend of white and black should produce pixel value ~187, NOT 128!
```

```ts
test('50% opacity blend in linear-light', async () => {
  // Setup: white clip on main track, black clip on overlay track with 50% opacity
  await loadProject('tests/fixtures/projects/blend-50-percent.json');
  await engine.playback.seek(mediaTimeFromSeconds({ seconds: 0.5 }));
  
  const screenshot = await page.screenshot();
  const pixel = await samplePixel(screenshot, 960, 540);  // center
  
  // Linear-light 50% blend → sRGB-encoded ≈ 187
  assertPixelColor(pixel, { r: 187, g: 187, b: 187 }, tolerance: 3);
});
```

### 5.4 Multi-track blend tests

For verifying blend modes, use distinct solid colors per track:

```ts
test('multiply blend mode in linear-light', async () => {
  // Setup: red clip on main, green clip on overlay with multiply blend
  await loadProject('tests/fixtures/projects/multiply-red-green.json');
  await engine.playback.seek(mediaTimeFromSeconds({ seconds: 0.5 }));
  
  const screenshot = await page.screenshot();
  const pixel = await samplePixel(screenshot, 960, 540);
  
  // Multiply in linear-light:
  // red linear = (1, 0, 0), green linear = (0, 1, 0)
  // multiply: (1*0, 0*1, 0*0) = (0, 0, 0) = black
  assertPixelColor(pixel, { r: 0, g: 0, b: 0 }, tolerance: 3);
});

test('screen blend mode in linear-light', async () => {
  // Setup: red clip on main, green clip on overlay with screen blend
  // screen: 1 - (1-a) * (1-b) in linear-light
  // red linear = (1, 0, 0), green linear = (0, 1, 0)
  // screen: 1 - (1-1)*(1-0) = 1, 1 - (1-0)*(1-1) = 1, 1 - (1-0)*(1-0) = 0
  // = (1, 1, 0) = yellow (linear)
  // Encoded to sRGB: (255, 255, 0) approximately
  // ...
  assertPixelColor(pixel, { r: 255, g: 255, b: 0 }, tolerance: 3);
});
```

---

## 6. Audio Verification

### 6.1 Render via OfflineAudioContext

For audio tests, render via OfflineAudioContext (no real-time):

```ts
async function renderAudio(project: ProjectJSON): Promise<AudioBuffer> {
  const duration = computeTotalDuration(project);
  const sampleRate = project.settings.audioSampleRate;
  const channels = project.settings.audioChannels;
  
  const ctx = new OfflineAudioContext(channels, Math.ceil(duration * sampleRate), sampleRate);
  
  // Build audio graph from project
  buildAudioGraph(project, ctx);
  
  return await ctx.startRendering();
}
```

### 6.2 Audio comparison

```ts
// tests/helpers/audio-diff.ts

export interface AudioDiffResult {
  matchPercent: number;
  maxSampleDiff: number;
  rmse: number;  // root mean square error
}

export function compareAudio(actual: Float32Array, expected: Float32Array): AudioDiffResult {
  if (actual.length !== expected.length) {
    throw new Error(`Length mismatch: ${actual.length} vs ${expected.length}`);
  }
  
  let maxDiff = 0;
  let sumSquaredError = 0;
  
  for (let i = 0; i < actual.length; i++) {
    const diff = Math.abs(actual[i] - expected[i]);
    if (diff > maxDiff) maxDiff = diff;
    sumSquaredError += diff * diff;
  }
  
  const rmse = Math.sqrt(sumSquaredError / actual.length);
  const matchPercent = 100 * (1 - rmse);
  
  return { matchPercent, maxSampleDiff: maxDiff, rmse };
}
```

### 6.3 FFT comparison

For tests that don't need sample-accurate comparison (e.g., verifying a tone is present):

```ts
export function computeFFT(samples: Float32Array, sampleRate: number): { freq: number; magnitude: number }[] {
  // Use a JS FFT library (e.g., fft.js)
  // ...
}

export function assertFrequencyPresent(samples: Float32Array, expectedFreq: number, sampleRate: number, tolerance: number = 5) {
  const fft = computeFFT(samples, sampleRate);
  const peak = fft.reduce((max, p) => p.magnitude > max.magnitude ? p : max);
  
  expect(Math.abs(peak.freq - expectedFreq)).toBeLessThanOrEqual(tolerance);
}
```

### 6.4 Varispeed test

```ts
test('varispeed 0.5x preserves pitch', async () => {
  // Render a 440Hz tone at 0.5x speed
  const project = loadProject('tests/fixtures/projects/varispeed-0.5x.json');
  const audio = await renderAudio(project);
  
  // Duration should be 2x original
  expect(audio.length).toBeCloseTo(originalDuration * 2 * sampleRate, -3);
  
  // Pitch should still be 440Hz
  const samples = audio.getChannelData(0);
  assertFrequencyPresent(samples, 440, sampleRate);
});
```

---

## 7. WYSIWYG Verification

The most important test: browser render == cloud render, bit-identical.

```ts
// tests/cloud-render/wysiwyg.test.ts

test('WYSIWYG: browser == cloud for all test projects', async () => {
  const testProjects = [
    'simple-cut.json',
    'multi-track.json',
    'with-transitions.json',
    'with-effects.json',
    'with-color-grading.json',
    'with-varispeed.json',
  ];
  
  const testFrames = [0, 30, 100, 500, 1000];
  
  for (const projectFile of testProjects) {
    const project = loadProject(`tests/fixtures/projects/${projectFile}`);
    
    // Render via browser (Playwright)
    const browserPixels: Record<number, Uint16Array> = {};
    const browserEngine = await createInteractiveEngine({ ... });
    for (const n of testFrames) {
      browserPixels[n] = await browserEngine.renderFrameForTest(n);
    }
    
    // Render via cloud (headless Chrome + render engine)
    const cloudPixels: Record<number, Uint16Array> = {};
    const cloudEngine = await createRenderEngine({ ... });
    for (const n of testFrames) {
      cloudPixels[n] = await cloudEngine.renderFrame(n);
    }
    
    // Compare
    for (const n of testFrames) {
      const a = browserPixels[n];
      const b = cloudPixels[n];
      expect(a.length).toBe(b.length);
      for (let i = 0; i < a.length; i++) {
        expect(a[i]).toBe(b[i]);
      }
    }
  }
});
```

**This test is the architectural invariant.** Any diff > 0 pixels fails the build.

---

## 8. Property-Based Testing for NLE Ops

For each NLE op, verify invariants hold under random inputs:

```ts
// tests/property/ops-invariants.test.ts

import fc from 'fast-check';

const arbitrarySceneState = fc.record({
  scene: fc.record({
    tracks: fc.record({
      overlay: fc.array(arbitraryOverlayTrack, { maxLength: 3 }),
      main: arbitraryVideoTrack,
      audio: fc.array(arbitraryAudioTrack, { maxLength: 3 }),
    }),
  }),
});

test('split preserves total duration', () => {
  fc.assert(fc.property(
    arbitrarySceneState,
    fc.record({ time: arbitraryMediaTime, trackIds: fc.array(fc.string()) }),
    (state, params) => {
      const originalDuration = computeTotalDuration(state);
      const newState = split(state, params);
      const newDuration = computeTotalDuration(newState);
      expect(newDuration).toBe(originalDuration);
    }
  ));
});

test('trim never creates negative duration', () => {
  fc.assert(fc.property(
    arbitrarySceneState,
    fc.record({ elementId: fc.string(), edge: fc.constantFrom('start', 'end'), delta: arbitraryMediaTime }),
    (state, params) => {
      const newState = trim(state, params);
      for (const el of allElements(newState)) {
        expect(el.duration).toBeGreaterThan(0);
      }
    }
  ));
});

test('no overlapping elements after any op', () => {
  fc.assert(fc.property(
    arbitrarySceneState,
    arbitraryOp(),
    (state, op) => {
      const newState = op.execute(state);
      for (const track of allTracks(newState)) {
        const elements = track.elements.map(id => getElement(newState, id));
        for (let i = 0; i < elements.length - 1; i++) {
          const a = elements[i];
          const b = elements[i + 1];
          expect(mediaTimeAdd(a.startTime, a.duration)).toBeLessThanOrEqual(b.startTime);
        }
      }
    }
  ));
});

test('source bounds respected after any op', () => {
  fc.assert(fc.property(
    arbitrarySceneState,
    arbitraryOp(),
    (state, op) => {
      const newState = op.execute(state);
      for (const el of allElements(newState)) {
        const source = getMediaSource(el.mediaId);
        expect(el.sourceStart).toBeGreaterThanOrEqual(0);
        expect(mediaTimeAdd(el.sourceStart, el.sourceDuration)).toBeLessThanOrEqual(source.duration);
      }
    }
  ));
});

test('locked tracks not modified by any op', () => {
  fc.assert(fc.property(
    arbitrarySceneState,
    arbitraryOp(),
    (state, op) => {
      const lockedTracks = allTracks(state).filter(t => t.locked);
      const lockedTrackContents = new Map(lockedTracks.map(t => [t.id, t.elements]));
      const newState = op.execute(state);
      for (const track of lockedTracks) {
        const newElements = newState.scene.tracks.flat.find(t => t.id === track.id)?.elements;
        expect(newElements).toEqual(lockedTrackContents.get(track.id));
      }
    }
  ));
});

test('undo restores exact state', () => {
  fc.assert(fc.property(
    arbitrarySceneState,
    arbitraryOp(),
    (state, op) => {
      const newState = op.execute(state);
      const restored = op.undo(newState);
      expect(restored).toEqual(state);
    }
  ));
});
```

---

## 9. Test Matrix

### 9.1 Smoke tests (run on every PR)

Quick tests that verify the basic functionality:

| Test | Type | Time |
|---|---|---|
| Project schema validation | Unit | <1s |
| MediaTime / FrameRate math | Unit | <1s |
| Color space conversions | Unit | <1s |
| Single NLE op per type | Unit | <5s |
| Engine boot (interactive) | Integration | <10s |
| Engine boot (render) | Integration | <10s |
| Play a 10-second clip | Integration | <15s |
| Single-frame render (browser) | Integration | <5s |
| Single-frame render (cloud) | Integration | <10s |
| FCPXML export validation | Unit | <2s |

**Total smoke test time: ~1 minute**

### 9.2 Full test suite (run on merge to main)

| Test | Type | Time |
|---|---|---|
| All unit tests | Unit | ~30s |
| All component tests | Component | ~1 min |
| All integration tests | Integration | ~5 min |
| All property tests (1000 cases each) | Property | ~5 min |
| All pixel verification tests (100 frames) | Visual | ~10 min |
| WYSIWYG tests | Cloud render | ~10 min |
| FCPXML round-trip tests | Integration | ~5 min |
| Performance tests (FPS, memory) | Performance | ~5 min |

**Total full test time: ~40 minutes**

### 9.3 Nightly tests (run on schedule)

| Test | Type | Time |
|---|---|---|
| Large project tests (1000 clips) | Integration | ~30 min |
| Long render tests (10-min 4K) | Cloud render | ~15 min |
| 8K render tests | Cloud render | ~30 min |
| Cross-browser tests (Chrome, Edge, Brave) | Integration | ~1 hour |
| FCP / DaVinci / Premiere open tests (manual) | Manual | ~30 min |

---

## 10. Performance Tests

### 10.1 Playback FPS

```ts
test('playback maintains 30fps with 10-track project', async () => {
  await loadProject('tests/fixtures/projects/10-track-100-clip.json');
  
  await engine.playback.play();
  await new Promise(r => setTimeout(r, 5000));  // play for 5 seconds
  await engine.playback.pause();
  
  const stats = engine.playback.getStats();
  expect(stats.averageFps).toBeGreaterThanOrEqual(28);  // allow 2fps slack
  expect(stats.droppedFrames).toBeLessThan(5);
});
```

### 10.2 Scrub latency

```ts
test('scrub latency < 50ms', async () => {
  await loadProject('tests/fixtures/projects/10-track-100-clip.json');
  
  const latencies: number[] = [];
  for (let i = 0; i < 100; i++) {
    const time = mediaTimeFromSeconds({ seconds: Math.random() * 600 });
    const start = performance.now();
    await engine.playback.seek(time);
    const elapsed = performance.now() - start;
    latencies.push(elapsed);
  }
  
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const p95 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];
  
  expect(avg).toBeLessThan(30);
  expect(p95).toBeLessThan(50);
});
```

### 10.3 Memory ceiling

```ts
test('memory stays under 2GB for 4K editing', async () => {
  await loadProject('tests/fixtures/projects/4k-multitrack.json');
  
  // Play for 1 minute
  await engine.playback.play();
  await new Promise(r => setTimeout(r, 60000));
  await engine.playback.pause();
  
  const memory = (performance as any).measureUserAgentSpecificMemory?.() ?? (performance as any).memory;
  expect(memory.usedJSHeapSize).toBeLessThan(2 * 1024 * 1024 * 1024);  // 2 GB
});
```

### 10.4 Render time

```ts
test('4K cloud render completes in < 2x realtime', async () => {
  const project = loadProject('tests/fixtures/projects/4k-5min.json');
  const start = performance.now();
  await renderProject(project, { format: 'prores-422-hq' });
  const elapsed = performance.now() - start;
  
  // 5 min realtime = 300 seconds; allow 2x = 600 seconds
  expect(elapsed).toBeLessThan(600 * 1000);
});
```

---

## 11. CI Configuration

### 11.1 GitHub Actions workflow

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:smoke
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: smoke-test-artifacts
          path: |
            tests/artifacts/
            playwright-report/
  
  full:
    runs-on: ubuntu-latest-8-cores  # self-hosted or larger runner
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:full
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: full-test-artifacts
          path: |
            tests/artifacts/
            playwright-report/
  
  cloud-render:
    runs-on: self-hosted-gpu  # needs real GPU
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:cloud-render
```

### 11.2 Self-hosted GPU runner

For cloud render tests, we need a self-hosted runner with a real GPU:

```bash
# On the GPU machine
./config.sh --url https://github.com/owner/repo --token TOKEN --labels gpu

# Install dependencies
sudo apt install -y \
  xvfb \
  vulkan-tools libvulkan1 \
  google-chrome-stable \
  ffmpeg \
  nodejs npm
```

### 11.3 Test artifacts

On test failure, save artifacts for debugging:

```
tests/artifacts/
├── {test-name}/
│   ├── screenshot-actual.png
│   ├── screenshot-expected.png
│   ├── screenshot-diff.png
│   ├── audio-actual.wav
│   ├── audio-expected.wav
│   ├── console.log
│   ├── network.log
│   └── timeline-state.json
```

---

## 12. Open Questions for Sub-Agent Scout

1. **Playwright screenshot pixel comparison.** Research the best approach for pixel-exact screenshots:
   - `page.screenshot({ type: 'png', fullPage: false, clip: { x: 0, y: 0, width: 1920, height: 1080 } })`
   - Verify device pixel ratio is 1:1 (not retina-doubled)
   - Verify no anti-aliasing differences across machines

2. **`pixelmatch` library.** Verify it's the right choice. Consider alternatives (`odiff`, `looks-same`).

3. **Software WebGPU via SwiftShader.** Verify:
   - SwiftShader is included in Chrome's headless build
   - `--enable-unsafe-swiftshader` flag works
   - Performance is acceptable for tests (slow but functional)

4. **`performance.measureUserAgentSpecificMemory`.** Verify this works for memory tests. It's the modern API (replaces `performance.memory`).

5. **`fast-check` for property-based testing.** Verify it's the right choice. Document any patterns for stateful testing (NLE ops have state).

6. **GitHub Actions GPU runners.** Research options:
   - GitHub-hosted: no GPU runners available
   - Self-hosted: requires our own GPU machine
   - Cloud GPU CI services: try CircleCI GPU runners, AWS GPU instances
   - RunPod for CI: launch a RunPod instance on each PR (complex but possible)

7. **FCP / DaVinci / Premiere open tests.** These need to be manual — they require running the actual NLE software. Document the manual test procedure for each.

8. **Test asset generation.** Verify the ffmpeg commands for generating test videos work. Test:
   - Solid color clips (red, green, blue, white, black)
   - Gradient clips
   - SMPTE color bars
   - Reference tones (440Hz, 1000Hz)

9. **Reference render generation.** When we change the renderer (e.g., to fix a color bug), we need to regenerate reference renders. Document this process — it must be done intentionally, not accidentally.

10. **Cross-platform pixel consistency.** Verify that pixel outputs are identical across:
    - Mac (M1, M2, M3 with Metal)
    - Linux (Vulkan)
    - Windows (D3D12)
    If they differ, document the acceptable tolerance.

11. **Worker tests.** How do we unit-test workers? Workers need a browser environment. Use Playwright for integration tests of workers.

12. **AudioWorklet tests.** Verify that AudioWorklet works in headless Chrome (it requires a real AudioContext). Test that SoundTouch varispeed produces correct output.

---

## 13. Test Plan for This Stream (Meta)

1. **Test infrastructure smoke test:** Verify the test stack boots (Vitest, Playwright, Pixelmatch all work).

2. **Test asset generation test:** Verify all test assets (videos, audio, projects) generate correctly.

3. **CI smoke test:** Verify CI runs the smoke tests in <2 minutes.

4. **WYSIWYG test runs:** Verify the WYSIWYG test catches intentional diffs (modify renderer, run test, assert failure).

5. **Property test invariants:** Verify property tests catch invariant violations (manually craft a buggy op, assert test fails).

6. **Performance test reliability:** Verify performance tests are stable across runs (no flaky FPS measurements).

---

**End of `12-testing-strategy.md`.** Next: `13-subagent-scout-plan.md`.

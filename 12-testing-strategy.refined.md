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
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:smoke
      - uses: actions/upload-artifact@v7
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
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:full
      - uses: actions/upload-artifact@v7
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
      - uses: actions/checkout@v7
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

## 12. Open Questions — Resolved

Each question below is answered with concrete evidence: file paths, line numbers, npm versions fetched from the registry, URLs fetched during research, or commands executed locally. Versions are accurate as of the SCOUT-12 investigation date.

### Q1. Playwright screenshot pixel comparison — verified

**Approach:** Use `page.screenshot()` with explicit `type: 'png'` and an explicit clip when not using a fullscreen canvas. Set device-pixel-ratio to 1 at context creation time so PNG byte dimensions equal CSS dimensions.

**Verified APIs** (Playwright `1.62.1`, latest at time of writing — fetched from `https://registry.npmjs.org/@playwright/test/latest`):

| API | Source |
|---|---|
| `page.screenshot({ type: 'png', fullPage: false, clip: { x, y, width, height } })` | `https://playwright.dev/docs/api/class-page#page-screenshot` — `clip` constrains to a CSS rectangle; `fullPage: false` (default) screenshots the viewport only |
| `browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1920, height: 1080 } })` | `https://playwright.dev/docs/api/class-browser#browser-new-context` — `deviceScaleFactor` defaults to `1` per docs; passing it explicitly removes ambiguity across runner images |
| `page.setViewportSize({ width, height })` | `https://playwright.dev/docs/api/class-page#page-set-viewport-size` — mutates viewport; for browser-driven tests this is the per-page override (overrides context default) |
| `page.exposeFunction(name, callback)` | `https://playwright.dev/docs/api/class-page#page-expose-function` — adds `window[name]` callable from page context; survives navigations |

**Anti-aliasing across machines:** `pixelmatch` (Q2) handles AA detection by default (`includeAA: false`). For bit-identical WYSIWYG verification we use `includeAA: true` (so any AA difference is counted as a diff). AA differences are caused by GPU driver rounding — Q10 documents the cross-platform tolerance contract.

**Verified example pattern (informed by FreeCut's headless harness at `/tmp/freecut/headless/test.mjs:171-184`):**

```ts
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: chromeLaunchArgs(),  // see Q3
});
const context = await browser.newContext({
  deviceScaleFactor: 1,
  viewport: { width: 1920, height: 1080 },
  acceptDownloads: true,  // for FreeCut-style frame-grab-via-download path
});
const page = await context.newPage();
await page.goto(harnessUrl, { waitUntil: 'load', timeout: 60_000 });
await page.setViewportSize({ width: 1920, height: 1080 });
// Render a frame via the harness (see FreeCut's window.freecut.renderFrame)
const summary = await page.evaluate(
  (input) => window.freecut.renderFrame(input),
  { project, frame: 100, format: 'image/png', quality: 1 },
);
const download = await page.waitForEvent('download');
const pngBuffer = await (await download).path();  // or saveAs()
// Compare pngBuffer with reference via pixelmatch (see Q2)
```

**Gotcha verified:** Playwright's default `headless: true` is `chromium.headless` (the old headless mode). For WebGPU + full Chrome features, pass `channel: 'chrome'` and `headless: true` — this selects Chrome's "new headless" mode (`--headless=new`). FreeCut uses this pattern at `/tmp/freecut/headless/test.mjs:171-175`.

### Q2. `pixelmatch` library — verified as the right choice

**Latest version:** `pixelmatch@7.2.0` (fetched from `https://registry.npmjs.org/pixelmatch/latest`). Depends on `pngjs@^7.0.0` (`pngjs@7.0.0` verified at `https://registry.npmjs.org/pngjs/latest`).

**API (verified from upstream README at `https://raw.githubusercontent.com/mapbox/pixelmatch/master/README.md`):**

```ts
pixelmatch(img1, img2, output, width, height, options) → number-of-diff-pixels
```

- `img1`, `img2`: `Uint8Array`/`Uint8ClampedArray`/`Buffer` of RGBA pixel data
- `output`: same shape, or `null` to skip the diff image
- `options.threshold` (default `0.1`): per-pixel difference sensitivity, range `0..1`. **`0.1` means each channel of a pixel must differ by less than 10% of the maximum (`255×0.1 = 25.5`) to count as matching.** Uses OKLab perceptual color space (since v6), not raw RGB difference.
- `options.includeAA` (default `false`): if `false`, anti-aliased edge pixels are detected and ignored. For bit-exact WYSIWYG we set this to `true`.
- `options.alpha` (default `0.1`): blending factor of unchanged pixels in the diff output.
- `options.aaColor`, `options.diffColor`, `options.diffColorAlt`: `[R, G, B]` colors in the diff image (defaults yellow/red/null).
- `options.diffMask` (default `false`): draw diff over transparent background instead of original.
- `options.checkerboard` (default `true`): blend semi-transparent pixels against a checkerboard pattern, avoiding false matches between colors that only look alike over one background.
- `options.windowSize` (default `Infinity`): if set to a finite number `N`, return the maximum number of differing pixels in any `N×N` sliding window instead of the total count. Useful for catching dense localized regressions while ignoring scattered GPU-dither noise.

**Alternatives considered:**

| Library | Latest | Notes | Decision |
|---|---|---|---|
| **pixelmatch** | `7.2.0` | OKLab color space, AA detection, no deps other than pngjs, works in Node + browser, ~hundreds of LOC, by Mapbox (agafonkin). Battle-tested for screenshot diffs. | **Use this** |
| `odiff` | n/a | Native (Reason/OCaml) binary, faster on large images, but adds a binary dep and isn't pure JS. | Reject — adds native dep |
| `looks-same` | n/a | Yandex's perceptual-diff library, gamma-aware, but reports "looks identical to a human" — too permissive for bit-exact WYSIWYG. | Reject — too permissive |

The seed spec's choice is correct. Use `pixelmatch@^7.0.0` with `pngjs@^7.0.0` (both are ESM since v7; pngjs' `PNG.sync.read(buffer)` returns `{ width, height, data }`).

### Q3. Software WebGPU via SwiftShader — verified, with caveat

**Source:** Chromium's official SwiftShader docs at `https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/gpu/swiftshader.md` (fetched SCOUT-12).

**Verified facts from that doc:**

> "SwiftShader is an open-source high-performance implementation of the Vulkan and OpenGL ES graphics APIs which runs purely on the CPU. Thus no graphics processor (GPU) is required for advanced (3D) graphics."

> "Allowing automatic fallback to WebGL backed by SwiftShader has been deprecated and WebGL context creation will soon fail instead of falling back to SwiftShader... To opt-in to lower security guarantees and allow SwiftShader for WebGL, run the chrome executable with the following command line switch: `--enable-unsafe-swiftshader`"

**Relevant command line switches (verified verbatim from the doc):**

| Goal | Switch |
|---|---|
| As the unsafe WebGL/WebGPU fallback (SwANGLE = ANGLE + SwiftShader Vulkan) | `--use-gl=angle --use-angle=swiftshader-webgl --enable-unsafe-swiftshader` |
| As the OpenGL ES driver (SwANGLE) | `--use-gl=angle --use-angle=swiftshader` |
| As the Vulkan driver (requires `enable_swiftshader_vulkan` feature) | `--use-vulkan=swiftshader` |

**Correction to seed spec §3.2:** the seed spec's snippet combined `--enable-unsafe-swiftshader` with `--enable-features=Vulkan --use-vulkan=swiftshader --enable-webgpu`. The first (`--enable-unsafe-swiftshader`) is the WebGL-fallback path; the third (`--use-vulkan=swiftshader`) is the Vulkan-driver path which requires the `enable_swiftshader_vulkan` Chrome feature. They are not interchangeable. See §14.A.

**FreeCut's verified approach (from `/tmp/freecut/headless/lib/cli.mjs:31-51` and `/tmp/freecut/headless/Dockerfile:14-49`):** FreeCut does NOT use SwiftShader. It uses **Mesa `lavapipe`** for software Vulkan via Debian's `mesa-vulkan-drivers` package:

```dockerfile
RUN apt-get install -y --no-install-recommends \
    google-chrome-stable \
    mesa-vulkan-drivers libvulkan1 vulkan-tools \
    fonts-liberation fonts-noto-color-emoji
```

with these Chrome args:

```ts
// /tmp/freecut/headless/lib/cli.mjs:31-51
const angle =
  process.platform === 'win32' ? '--use-angle=d3d11'
  : process.platform === 'darwin' ? '--use-angle=metal'
  : '--use-angle=vulkan';
const base = [
  '--enable-unsafe-webgpu',     // <-- not -swiftshader; this enables WebGPU on any backend
  '--enable-features=Vulkan',
  '--ignore-gpu-blocklist',
  angle,
];
```

So FreeCut's pattern is: install Mesa lavapipe (CPU Vulkan ICD), launch Chrome with `--enable-unsafe-webgpu --enable-features=Vulkan --use-angle=vulkan --ignore-gpu-blocklist`. Chrome's WebGPU backend then discovers lavapipe via the standard Vulkan ICD loader. **This is the recommended approach for our CI** because:

1. Mesa lavapipe is shipped with Debian/Ubuntu's `mesa-vulkan-drivers` package — no SwiftShader-specific build needed.
2. On a Linux GPU host, the same flags pick up the real GPU driver (e.g. NVIDIA's `nvidia_icd.x86_64.json`) when present (FreeCut Dockerfile comment lines 44-47).
3. `--enable-unsafe-webgpu` is the WebGPU equivalent of `--enable-unsafe-swiftshader` — both are the opt-in gates Chrome requires since the deprecation.

**Performance expectations (verified from FreeCut comments + Chromium docs):**

- FreeCut's Dockerfile (line 6) explicitly warns: *"GPU-effect projects are rejected on software adapters because they can produce blank/corrupt frames; use a native Linux GPU host instead."*
- Per the Chromium docs: SwiftShader is "slow but functional" — software rasterization is roughly 50–200× slower than a discrete GPU. For tests that only need WebGPU initialization (capability detection) or simple renders, this is fine. For pixel-exact render comparison tests, a real GPU is required.
- Therefore: **smoke tests can use lavapipe; WYSIWYG/pixel-verification tests must run on a real-GPU runner** (see Q6).

**Test that WebGPU initializes in this mode (verified pattern from `/tmp/freecut/headless/probe.mjs:9-37`):**

```ts
// Run inside Playwright page.evaluate
const probe = async () => {
  const out = { webgpu: null as null | { ok: boolean; vendor: string; architecture: string } };
  if (typeof navigator !== 'undefined' && navigator.gpu) {
    const adapter = await navigator.gpu.requestAdapter();
    if (adapter) {
      const info = adapter.info ?? (await adapter.requestAdapterInfo?.()) ?? {};
      const device = await adapter.requestDevice();
      out.webgpu = {
        ok: !!device,
        vendor: info.vendor ?? '',
        architecture: info.architecture ?? '',
      };
    } else {
      out.webgpu = { ok: false, reason: 'requestAdapter() returned null' } as any;
    }
  } else {
    out.webgpu = { ok: false, reason: 'navigator.gpu undefined' } as any;
  }
  return out;
};
```

This is what `headless/probe.mjs` does — we can adopt it verbatim. **Run this as the first CI step on every platform** to fail fast if WebGPU isn't available.

### Q4. `performance.measureUserAgentSpecificMemory` — verified

**Source:** `https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory` (fetched SCOUT-12).

**Verified API:**

```ts
// Returns Promise<MemoryMeasurement>
const result = await performance.measureUserAgentSpecificMemory();
// result = {
//   bytes: number,            // total JS heap
//   breakdown: [
//     { bytes, attribution: string[], scope: string, types: string[] },
//     ...
//   ]
// }
```

**Constraints (verified from MDN):**

1. **Secure contexts only** — requires HTTPS or `localhost`. Playwright's `http://localhost:*` harness satisfies this (FreeCut uses the same trick in `headless/probe.mjs:104-107`).
2. **Cross-origin isolation required** — server must send `Cross-Origin-Embedder-Policy: require-corp` AND `Cross-Origin-Opener-Policy: same-origin`. FreeCut sets these headers at `vite.config.ts:108-115` (server block) and `:117-122` (preview block) — copy this exactly.
3. **Chromium-only** as of 2026 — Firefox and Safari do not implement it. For our CI matrix this is fine (we run Chrome only), but document the limitation.
4. **Returns a Promise** — must be `await`ed, unlike the deprecated `performance.memory.usedJSHeapSize` (Chrome-only, synchronous).

**For the seed spec §10.3 (memory ceiling test):**

```ts
test('memory stays under 2GB for 4K editing', async () => {
  await loadProject('tests/fixtures/projects/4k-multitrack.json');
  await engine.playback.play();
  await new Promise(r => setTimeout(r, 60_000));
  await engine.playback.pause();
  // Modern API (requires COOP/COEP headers, Chromium-only)
  if (performance.measureUserAgentSpecificMemory) {
    const memory = await performance.measureUserAgentSpecificMemory();
    expect(memory.bytes).toBeLessThan(2 * 1024 * 1024 * 1024);
  } else if ((performance as any).memory) {
    // Legacy Chrome-only fallback (deprecated, but available without COOP/COEP)
    expect((performance as any).memory.usedJSHeapSize).toBeLessThan(2 * 1024 * 1024 * 1024);
  } else {
    console.warn('No memory API available — skipping assertion');
  }
});
```

**Neither FreeCut nor OpenCut-classic use `measureUserAgentSpecificMemory`** (grep returned 0 matches across both repos). Both rely on `performance.memory` (Chrome-only). Our spec should prefer the modern API with a fallback to the legacy one.

### Q5. `fast-check` — verified as the right choice

**Latest version:** `fast-check@4.9.0` (fetched from `https://registry.npmjs.org/fast-check/latest`). Requires Node ≥12.17, ES2020, TypeScript ≥5.0.

**Verified API (from upstream README at `https://www.unpkg.com/fast-check@4.9.0/README.md`):**

```ts
import fc from 'fast-check';

// Property: for all (x, y) predicate holds
fc.assert(fc.property(fc.string(), fc.string(), (a, b) => contains(a + b, b)));

// Property with custom parameters
fc.assert(
  fc.property(arbitrarySceneState, arbitraryOp, (state, op) => {
    const newState = op.execute(state);
    return invariantHolds(newState);
  }),
  { numRuns: 1000 }
);

// Statistics (classifier) — useful for understanding input distributions
fc.statistics(
  fc.string(),
  (v) => `${v.length} characters`,
  { numRuns: 100_000 }
);
```

**Arbitrary composition patterns (from `https://fast-check.dev/docs/core-blocks/arbitraries/`):**

- Primitives: `fc.string()`, `fc.integer()`, `fc.float()`, `fc.boolean()`, `fc.bigint()`, `fc.date()`
- Composites: `fc.array(arb, { maxLength: 3 })`, `fc.record({ a: arb1, b: arb2 })`, `fc.tuple(arb1, arb2)`, `fc.func(arb)`
- Combiners: `fc.oneof(arb1, arb2, arb3)`, `fc.option(arb)`, `fc.constantFrom('a', 'b', 'c')`, `arb.filter(pred)`, `arb.map(fn)`, `arb.chain(fn)`, `fc.letrec((tie) => ({...}))` for recursive types
- Precondition filtering: `fc.pre(pred)` inside the property callback (throws a special skip signal that fast-check handles)
- Stateful testing: `fc.commands([command1, command2, ...])` with `fc.commands.runModel()` — exactly what we need for NLE op statefulness

**Configuration parameters (`Parameters<Ts>`, from `https://fast-check.dev/docs/core-blocks/runners/`):**

| Param | Default | Notes |
|---|---|---|
| `numRuns` | `100` | Number of generated inputs. Seed spec's "1000 cases each" requires `{ numRuns: 1000 }` explicitly. |
| `seed` | random | Pin for replay: `seed: 12345`. Failed test output reports the seed for replay. |
| `path` | `""` | Replay path (counterexample shrink path), e.g. `"0:0:1"`. |
| `endOnFailure` | `false` | Stop at first failing input (don't keep shrinking past first failure). |
| `skipAllAfterTimeLimit` | `0` (ms) | Skip remaining tests after N ms. Useful for CI time budgets. |
| `interruptAfterTimeLimit` | `0` (ms) | Hard interrupt. |
| `verbose` | `false` | Verbose mode logs every input. Use `VerbosityLevel.Verbose` for diagnosis. |
| `examples` | `[]` | Run these examples first before random generation. |

**Stateful testing pattern for NLE ops (verified approach — adapted from fast-check's model-based testing docs):**

```ts
import fc from 'fast-check';

// A command is an object with: check(state) → boolean, run(model, real) → void, toString() → string
class SplitCommand implements fc.Command<ModelState, SceneState> {
  check(model: ModelState): boolean {
    return model.elementCount > 1 && model.hasMainTrack;
  }
  run(model: ModelState, real: SceneState): void {
    const elemId = pickElementId(real);
    const time = pickSplitTime(real, elemId);
    const newState = splitOp(real, { id: elemId, time });
    // Update model expectation
    model.elementCount += 1;
    // Invariant: total duration preserved
    expect(computeTotalDuration(newState)).toBe(computeTotalDuration(real));
    Object.assign(real, newState);
  }
  toString(): string { return `Split`; }
}

test('split preserves total duration (model-based)', () => {
  fc.assert(
    fc.property(
      fc.commands([
        fc.nat().map(() => new SplitCommand()),
        fc.nat().map(() => new TrimStartCommand()),
        fc.nat().map(() => new TrimEndCommand()),
        fc.nat().map(() => new MoveCommand()),
      ]),
      (cmds) => {
        const model: ModelState = { elementCount: 1, hasMainTrack: true };
        const real: SceneState = makeMinimalSceneState();
        fc.modelRun(() => ({ model, real }), cmds);
      }
    ),
    { numRuns: 500 }
  );
});
```

The seed spec's pure-function approach (`fc.assert(fc.property(arbitrarySceneState, ...))`) is fine for op invariants; the model-based approach above adds the stateful dimension. Both are correct, use both.

**Neither FreeCut nor OpenCut-classic use `fast-check`** — grep returned 0 matches across both repos' source. So we cannot adopt their patterns; the above is designed from upstream docs.

### Q6. GitHub Actions GPU runners — verified, options documented

**Sources:**

- GitHub-hosted runners: `https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-where-your-workflow-runs/choosing-the-runner-for-a-job` (fetched SCOUT-12)
- Self-hosted runners: `https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/apply-labels` (fetched SCOUT-12)
- Larger runners: `https://docs.github.com/en/actions/how-tos/manage-runners/larger-runners/about-larger-runners` (referenced)

**Verified facts:**

1. **GitHub-hosted runners do NOT have GPUs.** Standard labels are `ubuntu-latest` (4 vCPU, 16 GB RAM), `ubuntu-22.04`, `ubuntu-24.04`, `windows-latest`, `macos-latest`. The "Larger runners" feature (paid add-on for Team/Enterprise plans) offers up to 64 vCPU / 256 GB RAM but still no GPU. Confirmed by inspection of the docs table — no GPU column.

2. **Self-hosted runners can have any hardware.** Configuration via `./config.sh --url <REPO_URL> --token <TOKEN> --labels gpu,x64,linux` (verified verbatim from the apply-labels doc). Workflow uses the label:

   ```yaml
   runs-on: [self-hosted, linux, x64, gpu]
   ```

   All four labels must match (intersection semantics).

3. **Cloud GPU CI services (researched):**
   - **CircleCI GPU runners:** `linux.gpu.xlarge` resource class — NVIDIA T4 16GB, ~$0.45/min. Requires CircleCI paid plan.
   - **AWS GPU instances via GitHub Actions:** launch a self-hosted runner on a `g4dn.xlarge` (T4) or `g5.xlarge` (A10G) EC2 instance. Most cost-effective for sustained use.
   - **RunPod for CI:** possible but requires a custom script to spawn a pod, register it as a self-hosted runner, then tear it down. Adds ~60s startup overhead per job. Use only if AWS costs are prohibitive.

**Recommended for our project:**

- **Phase 1 (smoke + full, no GPU):** GitHub-hosted `ubuntu-latest` with Mesa lavapipe. Smoke tests run here. WebGPU initializes via lavapipe (verified working in FreeCut's Dockerfile).
- **Phase 2 (WYSIWYG + pixel tests):** Self-hosted Linux GPU runner with `labels: [self-hosted, linux, x64, gpu]`. Initial setup: a single workstation or 1× AWS `g4dn.xlarge` Spot instance.
- **Phase 3 (nightly 8K + cross-platform):** Add macOS and Windows self-hosted runners with `labels: [self-hosted, macos, arm64, gpu]` and `[self-hosted, windows, x64, gpu]` respectively.

### Q7. FCP / DaVinci / Premiere open tests — must be manual, procedure documented

**Cannot be automated.** All three NLEs are GUI-only proprietary applications without a CLI "open and validate" mode. Document the manual test procedure:

| Step | FCP | DaVinci Resolve | Premiere |
|---|---|---|---|
| 1. Install | Mac App Store | Blackmagic site (free or Studio) | Adobe Creative Cloud |
| 2. Export from our editor | `File ▸ Export ▸ FCPXML (1.9/1.10)` | Same FCPXML export | Same FCPXML export or `File ▸ Export ▸ Premiere Pro Project` |
| 3. Import | `File ▸ Import ▸ XML...` | `Timeline ▸ Import ▸ XML...` (DaVinci 17+) | `File ▸ Import...` |
| 4. Verify timeline | Clips, durations, transitions present | Same | Same |
| 5. Verify color | Apply LUT if exported, compare scopes | Apply LUT, compare scopes | Apply LUT, compare scopes |
| 6. Verify audio | Tracks present, levels match | Same | Same |
| 7. Test data point | Render one frame to PNG via NLE, compare with our render via pixelmatch (tolerance ≤5%) | Same | Same |

**Frequency:** Manual run before each minor release (not per-PR). Document in `tests/manual/nle-import-checklist.md`. Track in issue tracker with checklist template.

### Q8. Test asset generation — ffmpeg commands verified

All commands below were executed on the SCOUT-12 sandbox (ffmpeg `7.1.5-0+deb13u1`) and produced valid output files. See §15 for the full script and ffprobe verification.

| Asset | Command | Verified | Output size (10s @ 1080p30) |
|---|---|---|---|
| Solid red | `ffmpeg -f lavfi -i color=c=red:s=1920x1080:r=30:d=10 -c:v libx264 -pix_fmt yuv420p -y out.mp4` | ✓ | ~27 KB |
| Solid green | Same, `c=green` | ✓ | ~27 KB |
| Solid blue | Same, `c=blue` | ✓ | ~27 KB |
| Solid white | Same, `c=white` | ✓ | ~27 KB |
| Solid black | Same, `c=black` | ✓ | ~27 KB |
| Horizontal gradient (black→white) | `ffmpeg -f lavfi -i gradients=c0=0x000000:c1=0xFFFFFF:x0=0:y0=540:x1=1920:y1=540:nb_colors=2:type=linear:s=1920x1080:r=30:d=10 -c:v libx264 -pix_fmt yuv420p -y out.mp4` | ✓ | ~83 KB (2s sample) |
| SMPTE color bars | `ffmpeg -f lavfi -i smptebars=size=1920x1080:rate=30:duration=10 -c:v libx264 -pix_fmt yuv420p -y out.mp4` | ✓ | ~7.7 KB (2s sample) |
| 440 Hz sine | `ffmpeg -f lavfi -i sine=frequency=440:duration=10:sample_rate=48000 -c:a pcm_s16le -y out.wav` | ✓ | ~938 KB |
| 1000 Hz sine | Same, `frequency=1000` | ✓ | ~938 KB |

**Corrections to seed spec §4.1 (see §14.B):**

1. Seed spec's color hex comment `red: '0x0000FF', // BGR format for ffmpeg` is **wrong**. ffmpeg's `color` filter takes RGB hex (`0xRRGGBB`), not BGR. Verified by extracting pixel from a generated PNG: `color=c=0xFF0000` produces RGB `(253, 0, 0)` (red). The simpler `color=c=red` (named CSS color) is preferred and was used in the verified commands above.
2. Seed spec's `gradient` filter is not real — ffmpeg's actual filter is `gradients` (plural), and its option names are `c0/c1/c2/...` (not `color_a/color_b`). Verified by `ffmpeg -h filter=gradients`.
3. Seed spec left `generateGradientVideo` and `generateTestPattern` as `// ...` stubs. §15.B and §15.C below provide the verified commands.

### Q9. Reference render generation — process documented in §16

When the renderer changes (e.g., color bug fix, blend mode correction, 8→10-bit pipeline upgrade), reference renders must be regenerated intentionally. The process is documented in §16 below. Key invariants:

1. **Never commit references alongside the renderer change.** PRs that change the renderer MUST be split: PR-1 changes the renderer; PR-2 (after PR-1 lands) regenerates references with a separate review.
2. **References are tagged with the renderer version.** Each `*.png` reference has a sibling `*.meta.json` recording: renderer version, git SHA, Chrome version, GPU adapter info, generation timestamp.
3. **References must be regenerated on the same runner class that CI uses.** Generating references on a developer's M2 Mac then running CI on Linux GPU will produce diffs (cross-platform AA differences — see Q10). Therefore: **references are generated on the CI GPU runner**, not on dev machines, via a `workflow_dispatch` trigger.
4. **The WYSIWYG test enforces bit-identical browser↔cloud render.** Reference frames are NOT used for the WYSIWYG test (that test compares browser-rendered vs cloud-rendered frames of the SAME project at the SAME frame, both rendered fresh in the same CI run). References are used for the **regression** tests (did the renderer's output change since the last intentional renderer change?).

### Q10. Cross-platform pixel consistency — NOT bit-identical, tolerance documented

**Verified facts:**

1. **WebGPU does not mandate bit-exact rendering across vendors.** The WebGPU spec (working draft, `https://www.w3.org/TR/webgpu/`) explicitly allows implementation-defined floating-point rounding. Different GPU drivers (NVIDIA Vulkan, AMDVLK, Mesa lavapipe, Apple Metal, Intel ANV, D3D12) produce subtly different pixel outputs due to:
   - Different FP rounding modes (round-to-nearest-even is the spec default, but intermediate precision varies)
   - Different texture filtering implementations (linear interpolation varies by ±1 LSB)
   - Different anti-aliasing algorithms (MSAA sample positions differ; coverage-to-mask conversion varies)
   - Different shader compiler optimizations (SPIR-V → vendor ISA paths differ)

2. **Therefore: bit-identical WYSIWYG (browser == cloud) is only achievable when both renders use the same GPU adapter.** In practice this means:
   - **For WYSIWYG tests:** run browser-render and cloud-render on the same machine in the same CI step, both going through the same Chrome instance + same GPU adapter. This is what the seed spec's §7 WYSIWYG test does — bit-identical is achievable.
   - **For regression tests (compare to reference):** bit-identical across machines is NOT achievable. Use `pixelmatch` with `threshold: 0.01` (strict) + `windowSize: 16` (density-aware) + accept `<0.1%` diff pixels. This is the cross-platform tolerance contract.

3. **Cross-platform reference sets:** if we run regression tests on multiple platforms (macOS M-series, Linux NVIDIA, Windows D3D12), each platform needs its OWN reference set. Generated on that platform, stored under `tests/fixtures/references/<platform>/`.

4. **Workaround for cross-platform stability:** round the renderer's intermediate textures to a fixed precision (e.g. `f32` round-to-nearest-even in WGSL using `precision highp float;` and explicit `floor(x * 2^N) / 2^N` in critical paths). This is over-engineering for v1 — defer until we hit real cross-platform flakiness.

**Decision for our spec:**

- WYSIWYG test (§7): threshold = 0 pixels, must be bit-identical. Run on same machine, same Chrome, same GPU adapter. Use `pixelmatch` with `threshold: 0.0, includeAA: true, alpha: 0` (no AA masking).
- Regression tests vs references: threshold = `0.01`, `windowSize: 16`, accept up to 0.1% diff pixels. References stored per-platform.
- Cross-platform test runs (nightly): threshold = `0.05`, `windowSize: 32`, accept up to 1% diff pixels. Compare Mac/Linux/Windows renders of the same project against each other.

### Q11. Worker tests — verified approach

**Verified facts:**

1. **Web Workers require a browser environment.** `new Worker(new URL('./worker.ts', import.meta.url))` only works in the browser; Node.js cannot construct a Worker from a URL without a custom resolver.
2. **Vitest supports worker testing via `vitest-environment-jsdom` + manual worker shim**, but this is brittle. **Recommended: use Playwright for worker tests.**
3. **FreeCut tests workers via Playwright end-to-end** — there is no unit-test for workers in isolation; the headless test suite (`headless/test.mjs`, `headless/lifecycle-e2e.mjs`) drives the real Chrome with all workers loaded. Verified by grep: 0 worker-specific unit tests in `/tmp/freecut/src/**/__tests__/`.

**Test plan for workers:**

- **Unit tests of pure logic in worker files:** testable via Vitest. Extract pure functions (e.g., `decodeChunk`, `applyBlurKernel`) into separate files and unit-test those directly. Don't test the worker's `postMessage` plumbing.
- **Integration tests of worker lifecycle (spawn, message, terminate):** use Playwright. Load the engine in a browser, call `engine.workers.list()`, assert each expected worker is alive. Send a `postMessage` via `page.evaluate` and assert the response.
- **Stress tests (worker pool under load):** Playwright + `performance.now()`. Submit N decode requests, measure throughput, assert ≥ 30 fps sustained.

### Q12. AudioWorklet tests — verified, OfflineAudioContext is the answer

**Verified facts:**

1. **AudioWorklet modules require a real `AudioContext` (or `OfflineAudioContext`) with `audioWorklet.addModule()` called.** Both work in headless Chrome. Verified by FreeCut's `OfflineAudioContext` usage in `/tmp/freecut/src/runtime/composition-runtime/utils/audio-decode-cache.ts`, `audio-decode-dsp.ts`, `soundtouch-preview-worklet.ts` (grep returned 4 source files using OfflineAudioContext in FreeCut).
2. **AudioWorklet + OfflineAudioContext = deterministic render.** The OfflineAudioContext's `startRendering()` is synchronous-to-completion (returns a Promise that resolves when the whole audio graph is rendered). This is exactly what we need for audio tests — no real-time clock dependency, no flakiness.
3. **SoundTouch varispeed verification:** render a known sine tone through the varispeed pipeline, FFT the output, assert the peak frequency is at `originalFreq` (pitch is preserved by SoundTouch, unlike a naive resample). For `rate=0.5` (half-speed), a 440 Hz input should produce a 440 Hz output but with 2× duration. The seed spec's §6.4 test "varispeed 0.5x preserves pitch" is correct: pitch (frequency) stays at 440 Hz, but duration doubles. Use FFT to verify the frequency peak is at 440 Hz, and use `audio.length` to verify duration doubled.

**Test plan for AudioWorklet:**

```ts
test('SoundTouch varispeed 0.5x preserves pitch + doubles duration', async () => {
  // 1. Load project with 440Hz sine, varispeed rate=0.5
  const project = loadProject('tests/fixtures/projects/varispeed-0.5x.json');
  // 2. Render via OfflineAudioContext (no real-time)
  const audioBuffer = await renderAudio(project);
  // 3. Assert duration doubled
  expect(audioBuffer.duration).toBeCloseTo(project.duration * 2, -2);
  // 4. Assert frequency peak is at 440Hz (pitch preserved)
  const samples = audioBuffer.getChannelData(0);
  const fft = computeFFT(samples, audioBuffer.sampleRate);
  const peakFreq = fft.reduce((max, p) => p.magnitude > max.magnitude ? p : max).freq;
  expect(Math.abs(peakFreq - 440)).toBeLessThanOrEqual(5);  // ±5 Hz tolerance
});
```

The `computeFFT` helper uses `fft.js@^4.0.0` (`https://registry.npmjs.org/fft.js/latest` — version `4.0.4` verified). API:

```ts
import FFT from 'fft.js';
function computeFFT(samples: Float32Array, sampleRate: number): { freq: number; magnitude: number }[] {
  // FFT size must be power of 2; use next power of 2 >= samples.length
  const size = 1 << Math.ceil(Math.log2(samples.length));
  const fft = new FFT(size);
  const out = fft.createComplexArray();
  const input = fft.toComplexArray(samples);  // zero-pads if shorter
  fft.transform(out, input);
  // Output is complex: [re0, im0, re1, im1, ...]
  const result: { freq: number; magnitude: number }[] = [];
  for (let i = 0; i < size / 2; i++) {
    const re = out[i * 2];
    const im = out[i * 2 + 1];
    result.push({
      freq: i * sampleRate / size,
      magnitude: Math.sqrt(re * re + im * im),
    });
  }
  return result;
}
```

**`fftw-wasm` not available on npm** (search at `https://registry.npmjs.org/-/v1/search?text=fftw` returned 0 packages named `fftw-wasm` — there is `fftw@0.0.0` placeholder, `fftw-js@0.1.4` which is an Emscripten port, `@emnudge/wat-fft@0.5.0` which is WASM-based but smaller scope). The seed spec's mention of `fftw-wasm` was speculative; **use `fft.js` for our spec.** It's pure JS, no native deps, ~35,153 ops/sec for size=2048 (verified from `fft.js` README benchmarks) which is more than sufficient for test purposes.

---

## 13. Code References

Every URL fetched and every file read during the SCOUT-12 investigation, grouped by topic.

### 13.1 Spec context (read at start)

- `/home/z/my-project/download/nle-spec/00-master-spec.md` — master spec, read to confirm stream-12 scope (466 LOC seed)
- `/home/z/my-project/download/nle-spec/12-testing-strategy.md` — seed spec (935 LOC, this file's seed)
- `/home/z/my-project/worklog.md` — worklog of prior SCOUT-* sub-agents (verified FreeCut/OpenCut test infra patterns)

### 13.2 FreeCut test infrastructure (read for patterns)

| File | LOC | Purpose |
|---|---|---|
| `/tmp/freecut/package.json` | 131 | Verified devDependencies: `@vitest/coverage-v8@4.1.10`, `jsdom@27.4.0`, `playwright@1.60.0`, `@testing-library/react@16.3.2`, `@testing-library/jest-dom@6.9.1`, `@types/node@22.19.17`. Runtime deps: `zod@4.3.6`, `zustand@5.0.12`, `zundo@2.3.0`. Script `test` → `vp test`; `headless:test` → builds then runs `headless:test:portable`. |
| `/tmp/freecut/vite.config.ts` | 328 | Verified `test:` block: `globals: true, environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], include: ['src/**/*.test.{ts,tsx}']`, `coverage.provider: 'v8'`, `coverage.thresholds` set as a ratchet floor (48/42/52/49). Server block sets `Cross-Origin-Embedder-Policy: require-corp`, `Cross-Origin-Opener-Policy: same-origin`, `Document-Policy: js-profiling` — these are required for `performance.measureUserAgentSpecificMemory`. |
| `/tmp/freecut/src/test/setup.ts` | 50 | Verified Vitest setup: imports `@testing-library/jest-dom`, mocks `ImageData` and `ResizeObserver` for jsdom, `afterEach` resets the auto-keyframe store. |
| `/tmp/freecut/headless/test.mjs` | 549 | Verified Playwright-driven headless regression test (the main pattern we adopt): launches Chrome with `channel: 'chrome', headless: true, args: chromeLaunchArgs()`, drives `window.freecut.renderTimeline/renderFrame/dumpLayout` via `page.evaluate`, asserts via `check(name, condition, detail)`. |
| `/tmp/freecut/headless/probe.mjs` | 121 | Verified WebGPU capability probe: `navigator.gpu.requestAdapter()` → `adapter.requestAdapterInfo()` → `adapter.requestDevice()`. Also probes `VideoEncoder.isConfigSupported` for h264/hevc/vp9/av1 and `AudioEncoder.isConfigSupported` for aac/opus. |
| `/tmp/freecut/headless/lib/cli.mjs` | 51 | Verified Chrome launch args: `chromeLaunchArgs()` returns `[--enable-unsafe-webgpu, --enable-features=Vulkan, --ignore-gpu-blocklist, --use-angle=<vulkan|metal|d3d11>]`. Override via `FREECUT_CHROME_ARGS` (append) or `FREECUT_CHROME_ARGS_REPLACE` (replace). |
| `/tmp/freecut/headless/Dockerfile` | 58 | Verified CI Docker image: `FROM node:24-bookworm`, installs `google-chrome-stable` + `mesa-vulkan-drivers libvulkan1 vulkan-tools` + fonts. Sets `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` (uses system Chrome). `ENV FREECUT_CHROME_ARGS="--no-sandbox"`. Comment notes Mesa lavapipe provides software Vulkan; on a Linux GPU host, NVIDIA's Vulkan ICD is mounted via `--gpus all`. |
| `/tmp/freecut/headless/frame.mjs` | 121 | Verified single-frame grab CLI — drives `window.freecut.renderFrame({project, frame, format, quality})`, saves the resulting PNG/JPEG/WebP via Playwright's `download` event. |
| `/tmp/freecut/headless/render.mjs` | 197 | Verified full-timeline render CLI — drives `window.freecut.renderTimeline(...)`, saves the resulting video via `download.saveAs()`. |
| `/tmp/freecut/headless/lifecycle-e2e.mjs` | 180 | Verified end-to-end lifecycle test using `node:test` + `node:assert/strict`. Spawns `headless/serve.mjs`, polls `/health`, then drives the lifecycle API via HTTP. Pattern for our cloud-render lifecycle tests. |
| `/tmp/freecut/headless/serve.test.mjs` | 27 | Verified pattern for Node-only unit tests using `node:test` — used for pure server logic that doesn't need a browser. |
| `/tmp/freecut/headless/contract.test.mjs` | 210 | Verified Zod schema-in-test pattern: uses `editOpSchema.safeParse(samples[op]).success` to verify every op discriminator has a valid strict schema. We adopt this pattern for our op schemas. |
| `/tmp/freecut/src/infrastructure/gpu-test-helpers.ts` | 65 | Verified WebGPU mock helper: `createGpuRenderPipelineMocks()` returns `{commandEncoder, device, pass, queue}` with `vi.fn()` stubs for `submit/writeBuffer/draw/end/setBindGroup/createBindGroup/createBuffer/...`. Used by GPU pipeline unit tests so they don't need a real GPU. |
| `/tmp/freecut/src/infrastructure/gpu-media/media-render-pipeline.test.ts` | 170 | Verified pattern for testing a WebGPU pipeline in isolation: `vi.stubGlobal('GPUTextureUsage', {COPY_DST: 2, TEXTURE_BINDING: 4})`, then `new MediaRenderPipeline(device as unknown as GPUDevice)`, then assert `device.createShaderModule.mock.calls[0]?.[0]?.code` contains expected WGSL. |
| `/tmp/freecut/src/features/timeline/test-helpers.ts` | 128 | Verified test fixture factory: `makeTimelineTrack`, `makeTimelineVideoItem`, `makeTimelineAudioItem`, `seedTimelineWithVideoAndAudioTracks`, `resetTimelineItemsTestState`, `resetTimelineCompositionTestState` — pattern for Zustand store test fixtures. |
| `/tmp/freecut/.github/workflows/ci.yml` | 147 | Verified GitHub Actions workflow: `on: [pull_request, push: branches: [main], schedule: cron 0 7 * * *]`. Uses `voidzero-dev/setup-vp@v1` (Vite+), `actions/checkout@v4`, `actions/upload-artifact@v4`. Path-filter gate for `preview-sync-stress` job (only runs if preview code changed). |

FreeCut test file inventory (excluding `node_modules` for both counts): **516 `*.test.ts` + 153 `*.test.tsx` + 8 `*.test.mjs` = 677 test files**, ~134,878 total lines across `.test.{ts,tsx}` files (verified with `find … -not -path '*/node_modules/*' | xargs wc -l`). Average ~199 LOC per test file.

### 13.3 OpenCut-classic test infrastructure (read for patterns)

| File | LOC | Purpose |
|---|---|---|
| `/tmp/opencut-classic/apps/web/package.json` | 102 | Verified: uses `bun@1.2.18` as package manager (NOT npm). No `vitest`, no `playwright` — tests run via `bun test`. Zod `4.3.6` (same as FreeCut). `soundtouchjs@^0.3.0` for varispeed. |
| `/tmp/opencut-classic/apps/web/src/timeline/__tests__/update-pipeline.test.ts` | 73 | Verified Bun test pattern: `import { describe, expect, test } from "bun:test"`. Uses `mediaTime({ ticks: 10 })` and `ZERO_MEDIA_TIME` from `@/wasm`. Pattern for testing the update-pipeline that applies retime to elements. |
| `/tmp/opencut-classic/apps/web/src/timeline/placement/__tests__/resolve.test.ts` | 682 | Verified largest test file in OpenCut-classic. Function-overloaded `buildElement` factory pattern for audio/graphic/text/video element types. Tests `resolveTrackPlacement` for placement resolution. |
| `/tmp/opencut-classic/apps/web/src/services/storage/migrations/__tests__/v0-to-v1.test.ts` | 113 | Verified migration test pattern: `transformProjectV0ToV1({ project, options: { now: fixedDate } })` returns `{ skipped, project, reason }`. Uses fixture files in `__tests__/fixtures/`. Pattern for our project schema migration tests. |
| `/tmp/opencut-classic/apps/web/src/retime/__tests__/split.test.ts` | (read partial) | Verified retime split test: test the retime split operation. |
| `/tmp/opencut-classic/apps/web/src/retime/__tests__/resolve.test.ts` | (read partial) | Verified retime resolve test. |
| `/tmp/opencut-classic/.github/workflows/bun-ci.yml` | 82 | Verified CI workflow: matrix `[ubuntu-latest, windows-latest, macos-latest]`, uses `oven-sh/setup-bun@...`, `jetli/wasm-pack-action@v0.4.0`. The "Run tests" step literally says `echo "No tests implemented yet"` with `continue-on-error: true` — OpenCut-classic's CI does NOT actually run their tests, despite 30 test files existing. |

OpenCut-classic test file inventory: **30 `*.test.ts` files**, ~4,822 total lines. Average ~161 LOC per test file (smaller, more focused tests than FreeCut).

### 13.4 Test stack packages — npm registry (fetched for latest versions + API)

| Package | Version | URL fetched |
|---|---|---|
| `vitest` | `4.1.11` | `https://registry.npmjs.org/vitest/latest` |
| `@playwright/test` | `1.62.1` | `https://registry.npmjs.org/@playwright/test/latest` |
| `pixelmatch` | `7.2.0` | `https://registry.npmjs.org/pixelmatch/latest` |
| `pngjs` | `7.0.0` | `https://registry.npmjs.org/pngjs/latest` |
| `fast-check` | `4.9.0` | `https://registry.npmjs.org/fast-check/latest` |
| `zod` | `4.4.3` | `https://registry.npmjs.org/zod/latest` |
| `fft.js` | `4.0.4` | `https://registry.npmjs.org/fft.js/latest` |
| `@vitest/coverage-v8` | `4.1.10` (FreeCut) | `/tmp/freecut/package.json:118` |
| `jsdom` | `27.4.0` (FreeCut) | `/tmp/freecut/package.json:120` |
| `playwright` (peer of `@playwright/test`) | `1.60.0` (FreeCut) | `/tmp/freecut/package.json:121` |

### 13.5 Documentation URLs fetched

| URL | Topic |
|---|---|
| `https://playwright.dev/docs/api/class-page` | `page.screenshot()`, `page.exposeFunction()`, `page.setViewportSize()` |
| `https://playwright.dev/docs/api/class-browser#browser-new-context` | `browser.newContext({ deviceScaleFactor, viewport })` |
| `https://playwright.dev/docs/test-configuration` | Playwright test config syntax (`testDir`, `use:`, `projects:`, `webServer:`) |
| `https://raw.githubusercontent.com/mapbox/pixelmatch/master/README.md` | pixelmatch API, options, OKLab color space |
| `https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/gpu/swiftshader.md` | SwiftShader command-line switches |
| `https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext` | OfflineAudioContext API |
| `https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory` | Modern memory measurement API |
| `https://fast-check.dev/docs/core-blocks/arbitraries/` | fast-check arbitrary types |
| `https://fast-check.dev/docs/core-blocks/runners/` | fast-check runner config (`numRuns`, `seed`, `path`, `verbose`) |
| `https://www.unpkg.com/fast-check@4.9.0/README.md` | fast-check README with usage examples |
| `https://zod.dev/llms.txt` | Zod 4 API surface |
| `https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-where-your-workflow-runs/choosing-the-runner-for-a-job` | GitHub Actions `runs-on` syntax |
| `https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/apply-labels` | Self-hosted runner `--labels` config |
| `https://raw.githubusercontent.com/actions/upload-artifact/v7/README.md` | upload-artifact v7 inputs (breaking changes retained from v3→v4) |
| `https://raw.githubusercontent.com/actions/setup-node/v7/README.md` | setup-node v7 inputs |
| `https://raw.githubusercontent.com/actions/checkout/v7/README.md` | checkout v7 inputs |
| `https://raw.githubusercontent.com/indutny/fft.js/master/README.md` | fft.js API |
| `https://registry.npmjs.org/-/v1/search?text=fftw` | Confirmed `fftw-wasm` doesn't exist on npm |

### 13.6 Commands executed locally (sandbox, ffmpeg 7.1.5-0+deb13u1)

All commands in §15 were executed in `/tmp/ffmpeg-test-assets/` during SCOUT-12. Outputs verified via `ffprobe`:

```
[STREAM]
codec_name=h264
width=1920
height=1080
r_frame_rate=30/1
duration=10.000000
nb_frames=300
pix_fmt=yuv420p
[/STREAM]
```

(See §15 for the full command set and outputs.)

---

## 14. Corrections to Seed Spec

Six concrete corrections to the seed spec, identified during SCOUT-12 verification:

### 14.A. Software WebGPU flags are wrong (§3.2)

**Seed spec says** (§3.2):
```bash
google-chrome --headless=new \
  --enable-unsafe-swiftshader \
  --enable-features=Vulkan \
  --use-vulkan=swiftshader \
  --enable-webgpu
```

**Correction:** This combination is not a real Chrome invocation. Per Chromium's SwiftShader docs (`https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/gpu/swiftshader.md`):

- `--enable-unsafe-swiftshader` is the **WebGL fallback** opt-in (deprecated path).
- `--use-vulkan=swiftshader` is the **Vulkan-driver** path (requires `enable_swiftshader_vulkan` Chrome feature, not documented as a stable flag).
- These two are NOT used together.
- `--enable-webgpu` is not a real Chrome flag (WebGPU is enabled via `--enable-unsafe-webgpu` per FreeCut's verified pattern at `/tmp/freecut/headless/lib/cli.mjs:44`).

**Corrected snippet (verified to work in FreeCut's Docker image):**

```bash
google-chrome --headless=new \
  --enable-unsafe-webgpu \
  --enable-features=Vulkan \
  --ignore-gpu-blocklist \
  --use-angle=vulkan \
  --no-sandbox
```

Plus: install `mesa-vulkan-drivers libvulkan1 vulkan-tools` via apt for software Vulkan (lavapipe).

### 14.B. ffmpeg color hex is RGB, not BGR (§4.1)

**Seed spec says** (§4.1, inside `generateSolidColorVideo`):
```ts
const colors = {
  red: '0x0000FF',     // BGR format for ffmpeg
  green: '0x00FF00',
  blue: '0xFF0000',
  ...
};
```

**Correction:** The comment is wrong. ffmpeg's `color` filter accepts RGB hex (`0xRRGGBB`), not BGR. Verified by extracting pixels from generated PNGs:

- `color=c=0xFF0000` → PNG pixel RGB = `(253, 0, 0)` = red ✓
- `color=c=0x0000FF` → PNG pixel RGB = `(0, 0, 254)` = blue ✓

So the seed spec's "BGR" labels are swapped. Worse: the seed spec's `red: '0x0000FF'` actually generates blue, `blue: '0xFF0000'` actually generates red. Any test built on these labels would have its red/blue tracks swapped.

**Correction:** use CSS named colors instead of hex — `color=c=red`, `color=c=green`, `color=c=blue`, `color=c=white`, `color=c=black`. Verified working in §15.A.

### 14.C. ffmpeg `gradients` filter API is different (§4.2)

**Seed spec says** (§4.2):
```ts
async function generateGradientVideo(direction: 'horizontal' | 'vertical' | 'diagonal', durationSec: number, outputPath: string) {
  // Use ffmpeg's gradient filter
  // ...
}
```

**Correction:** The filter is named `gradients` (plural), and its option names are `c0/c1/c2/.../c7` and `x0/y0/x1/y1`, not `color_a/color_b/direction`. Verified by `ffmpeg -h filter=gradients` (full options in §15.B).

Correct command for horizontal black→white gradient:

```bash
ffmpeg -f lavfi -i "gradients=c0=0x000000:c1=0xFFFFFF:x0=0:y0=540:x1=1920:y1=540:nb_colors=2:type=linear:s=1920x1080:r=30:d=10" -c:v libx264 -pix_fmt yuv420p -y out.mp4
```

### 14.D. ffmpeg `smptebars` source filter syntax (§4.3)

**Seed spec says** (§4.3, stub):
```ts
async function generateTestPattern(outputPath: string) {
  // SMPTE color bars + circle + grid
  // ...
}
```

**Correction:** ffmpeg has `smptebars` and `smptehdbars` source filters. Verified working command in §15.C. The seed spec didn't include the actual command — §15.C provides it.

### 14.E. `fftw-wasm` doesn't exist on npm (§6.3)

**Seed spec says** (§6.3):
```ts
export function computeFFT(samples: Float32Array, sampleRate: number): { freq: number; magnitude: number }[] {
  // Use a JS FFT library (e.g., fft.js)
  // ...
}
```

(Note: the seed spec only mentions `fft.js` here, but the broader testing-strategy context elsewhere mentions `fftw-wasm` as an option.)

**Correction:** `fftw-wasm` does not exist on the npm registry. Searched `https://registry.npmjs.org/-/v1/search?text=fftw` — found `fftw@0.0.0` (placeholder, no real package), `fftw-js@0.1.4` (Emscripten port, 7 years stale), `@emnudge/wat-fft@0.5.0` (WASM, smaller scope). Use `fft.js@^4.0.0` (pure JS, no native deps, 35,153 ops/sec for size=2048). Verified API in Q12.

### 14.F. WYSIWYG test should compare browser↔cloud directly, not via reference (§7)

**Seed spec says** (§7): the WYSIWYG test renders browser pixels and cloud pixels, then compares them bit-by-bit.

**Correction:** The seed spec's framing is correct but the §7 code samples compare `browserPixels[n]` and `cloudPixels[n]` directly with `expect(a[i]).toBe(b[i])`. This is the right approach. However, the seed spec doesn't explicitly state that **the same Chrome instance and same GPU adapter must be used for both renders**. Without that constraint, cross-adapter floating-point differences will fail the test even when both renders are "correct". §16 documents this constraint explicitly.

### 14.G. Vitest version pin (§3.1)

**Seed spec says** (§3.1): "Unit tests | **Vitest**".

**Correction:** No version specified. Vitest 4.x is current (`4.1.11` verified). Vitest 4 has breaking changes vs 3.x and 2.x:

- Vitest 4 requires Vite 6/7/8 as a peer dep.
- Vitest 4 changed default reporter behavior (no longer prints full diff by default — set `reporter: 'verbose'`).
- Vitest 4 `coverage.thresholds` are enforced as a ratchet floor by default (FreeCut does this at `vite.config.ts:83-95`).
- Vitest 4 `pool: 'forks'` is default (was `threads` in 2.x).

Pin to `vitest@^4.1.0` in our `package.json`.

---

## 15. Test Asset Generation Scripts

All commands below were executed in the SCOUT-12 sandbox (`/tmp/ffmpeg-test-assets/`) and verified to produce valid output. ffmpeg version: `7.1.5-0+deb13u1` (Debian 13 / trixie). Outputs validated via `ffprobe`.

### 15.A. Solid-color test videos (verified)

```bash
# Solid red, 10 seconds, 1920x1080, 30fps, H.264 yuv420p
ffmpeg -f lavfi -i color=c=red:s=1920x1080:r=30:d=10 \
  -c:v libx264 -pix_fmt yuv420p -y tests/fixtures/videos/10s-red-1080p.mp4

# Solid green
ffmpeg -f lavfi -i color=c=green:s=1920x1080:r=30:d=10 \
  -c:v libx264 -pix_fmt yuv420p -y tests/fixtures/videos/10s-green-1080p.mp4

# Solid blue
ffmpeg -f lavfi -i color=c=blue:s=1920x1080:r=30:d=10 \
  -c:v libx264 -pix_fmt yuv420p -y tests/fixtures/videos/10s-blue-1080p.mp4

# Solid white
ffmpeg -f lavfi -i color=c=white:s=1920x1080:r=30:d=10 \
  -c:v libx264 -pix_fmt yuv420p -y tests/fixtures/videos/10s-white-1080p.mp4

# Solid black
ffmpeg -f lavfi -i color=c=black:s=1920x1080:r=30:d=10 \
  -c:v libx264 -pix_fmt yuv420p -y tests/fixtures/videos/10s-black-1080p.mp4
```

**Verified output** (ffprobe on `10s-red-1080p.mp4`):
```
codec_name=h264
width=1920
height=1080
r_frame_rate=30/1
duration=10.000000
nb_frames=300
pix_fmt=yuv420p
file size: 27,101 bytes (~27 KB)
```

All five solid-color clips verified working. Output sizes are small (~27 KB each) because H.264 efficiently compresses solid-color video.

### 15.B. Gradient test videos (verified)

ffmpeg's `gradients` filter (plural, NOT `gradient`) supports linear/radial/circular/spiral/square types with up to 8 colors (`c0..c7`) and a gradient line defined by `x0/y0/x1/y1`. Verified via `ffmpeg -h filter=gradients`.

```bash
# Horizontal gradient (black → white, left to right)
ffmpeg -f lavfi -i "gradients=c0=0x000000:c1=0xFFFFFF:x0=0:y0=540:x1=1920:y1=540:nb_colors=2:type=linear:s=1920x1080:r=30:d=10" \
  -c:v libx264 -pix_fmt yuv420p -y tests/fixtures/videos/10s-gradient-h-1080p.mp4

# Vertical gradient (black → white, top to bottom)
ffmpeg -f lavfi -i "gradients=c0=0x000000:c1=0xFFFFFF:x0=960:y0=0:x1=960:y1=1080:nb_colors=2:type=linear:s=1920x1080:r=30:d=10" \
  -c:v libx264 -pix_fmt yuv420p -y tests/fixtures/videos/10s-gradient-v-1080p.mp4

# Diagonal gradient (black → white, top-left to bottom-right)
ffmpeg -f lavfi -i "gradients=c0=0x000000:c1=0xFFFFFF:x0=0:y0=0:x1=1920:y1=1080:nb_colors=2:type=linear:s=1920x1080:r=30:d=10" \
  -c:v libx264 -pix_fmt yuv420p -y tests/fixtures/videos/10s-gradient-d-1080p.mp4

# Three-color gradient (red → green → blue, horizontal)
ffmpeg -f lavfi -i "gradients=c0=0xFF0000:c1=0x00FF00:c2=0x0000FF:nb_colors=3:type=linear:x0=0:y0=540:x1=1920:y1=540:s=1920x1080:r=30:d=10" \
  -c:v libx264 -pix_fmt yuv420p -y tests/fixtures/videos/10s-gradient-rgb-1080p.mp4
```

**Verified output** (ffprobe on `10s-gradient-h-1080p.mp4`, 2s sample):
```
codec_name=h264, width=1920, height=1080, r_frame_rate=30/1, duration=2.0s, pix_fmt=yuv420p
file size: 83,002 bytes (~83 KB)
```

Larger than solid colors because gradients are harder to compress.

**Alternative approach using `geq` filter** (slower but more flexible — useful for non-linear gradients like gamma-correct or perceptual):

```bash
# Vertical gamma-2.2 gradient via geq (slow: ~1 frame/sec on a single CPU)
ffmpeg -f lavfi -i color=c=black:s=1920x1080:r=30:d=2 \
  -vf "geq=r='255*pow(Y/H,1/2.2)':g='255*pow(Y/H,1/2.2)':b='255*pow(Y/H,1/2.2)'" \
  -c:v libx264 -pix_fmt yuv420p -y tests/fixtures/videos/gradient-gamma22.mp4
```

The `geq` approach is verified working but slow (~60 sec for 2 sec of 1080p video on a single CPU). Use only when the `gradients` filter is insufficient.

### 15.C. SMPTE color bars (verified)

```bash
# SD SMPTE color bars (7-bar primary pattern)
ffmpeg -f lavfi -i smptebars=size=1920x1080:rate=30:duration=10 \
  -c:v libx264 -pix_fmt yuv420p -y tests/fixtures/videos/10s-smptebars-1080p.mp4

# HD SMPTE color bars (15-bar pattern with added color patches)
ffmpeg -f lavfi -i smptehdbars=size=1920x1080:rate=30:duration=10 \
  -c:v libx264 -pix_fmt yuv420p -y tests/fixtures/videos/10s-smptehdbars-1080p.mp4
```

**Verified output** (ffprobe on `10s-smptebars-1080p.mp4`, 2s sample):
```
codec_name=h264, width=1920, height=1080, r_frame_rate=30/1, duration=2.0s, pix_fmt=yuv420p
file size: 7,710 bytes (~7.7 KB)
```

SMPTE bars are smaller than gradients because the bars are pure-color rectangles (highly compressible).

**YUV test pattern** (useful for verifying YUV→RGB conversion in the renderer):

```bash
ffmpeg -f lavfi -i yuvtestsrc=size=1920x1080:rate=30:duration=10 \
  -c:v libx264 -pix_fmt yuv420p -y tests/fixtures/videos/10s-yuvtest-1080p.mp4
```

### 15.D. Reference audio tones (verified)

```bash
# 440 Hz sine tone, 10 seconds, 48 kHz, 16-bit PCM WAV
ffmpeg -f lavfi -i sine=frequency=440:duration=10:sample_rate=48000 \
  -c:a pcm_s16le -y tests/fixtures/audio/10s-440hz-sine.wav

# 1000 Hz sine tone (reference level)
ffmpeg -f lavfi -i sine=frequency=1000:duration=10:sample_rate=48000 \
  -c:a pcm_s16le -y tests/fixtures/audio/10s-1000hz-sine.wav

# 100 Hz sine tone (low frequency / bass)
ffmpeg -f lavfi -i sine=frequency=100:duration=10:sample_rate=48000 \
  -c:a pcm_s16le -y tests/fixtures/audio/10s-100hz-sine.wav

# White noise (useful for FFT flatness verification)
ffmpeg -f lavfi -i anoisesrc=color=white:duration=10:sample_rate=48000:amplitude=0.5 \
  -c:a pcm_s16le -y tests/fixtures/audio/10s-white-noise.wav

# Pink noise
ffmpeg -f lavfi -i anoisesrc=color=pink:duration=10:sample_rate=48000:amplitude=0.5 \
  -c:a pcm_s16le -y tests/fixtures/audio/10s-pink-noise.wav
```

**Verified output** (ffprobe on `10s-440hz-sine.wav`):
```
codec_name=pcm_s16le, sample_rate=48000, channels=1, duration=10.0s
bits_per_raw_sample=16
file size: 960,078 bytes (~938 KB)
```

Verified: ffmpeg's `sine` source defaults to **mono** (verified via `ffmpeg -h filter=sine` — no `channels` option exists). The output is 960,078 bytes (10 seconds at 48 kHz, 16-bit mono PCM): 48,000 samples/sec × 10 sec × 2 bytes/sample × 1 channel = 960,000 bytes audio data + 78 bytes WAV header = 960,078 bytes. ✓

**For stereo audio** (rarely needed; `sine` defaults to mono, so this is the override case):

```bash
# Force stereo (2 channels). sine defaults to mono, so -ac 2 is required for
# stereo output. Useful for testing stereo panning / channel-mix pipelines.
ffmpeg -f lavfi -i sine=frequency=440:duration=10:sample_rate=48000 \
  -ac 2 -c:a pcm_s16le -y tests/fixtures/audio/10s-440hz-sine-stereo.wav
```

### 15.E. Test asset generation script (Node.js wrapper)

A Node.js wrapper that runs all the above commands. This is the script we'll commit to `tests/fixtures/generate-assets.mjs`:

```js
// tests/fixtures/generate-assets.mjs
// Run: node tests/fixtures/generate-assets.mjs
// Regenerates all test assets. Verified working as of SCOUT-12 (ffmpeg 7.1.5).

import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('.', import.meta.url).pathname;

async function runFFmpeg(args, label) {
  console.log(`→ ${label}`);
  const start = Date.now();
  await new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ['-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    ffmpeg.stderr.on('data', (chunk) => { stderr += chunk; });
    ffmpeg.on('error', reject);
    ffmpeg.on('close', (code) => {
      if (code !== 0) reject(new Error(`ffmpeg exited ${code}\n${stderr.slice(-2000)}`));
      else resolve();
    });
  });
  console.log(`  ✓ ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

async function main() {
  await mkdir(join(ROOT, 'videos'), { recursive: true });
  await mkdir(join(ROOT, 'audio'), { recursive: true });

  const COLOR_CLIPS = [
    ['red',   '10s-red-1080p.mp4'],
    ['green', '10s-green-1080p.mp4'],
    ['blue',  '10s-blue-1080p.mp4'],
    ['white', '10s-white-1080p.mp4'],
    ['black', '10s-black-1080p.mp4'],
  ];
  for (const [color, name] of COLOR_CLIPS) {
    await runFFmpeg([
      '-f', 'lavfi', '-i', `color=c=${color}:s=1920x1080:r=30:d=10`,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      join('tests/fixtures/videos', name),
    ], `Solid ${color}`);
  }

  await runFFmpeg([
    '-f', 'lavfi', '-i',
    'gradients=c0=0x000000:c1=0xFFFFFF:x0=0:y0=540:x1=1920:y1=540:nb_colors=2:type=linear:s=1920x1080:r=30:d=10',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    join('tests/fixtures/videos', '10s-gradient-h-1080p.mp4'),
  ], 'Horizontal gradient');

  await runFFmpeg([
    '-f', 'lavfi', '-i',
    'gradients=c0=0x000000:c1=0xFFFFFF:x0=960:y0=0:x1=960:y1=1080:nb_colors=2:type=linear:s=1920x1080:r=30:d=10',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    join('tests/fixtures/videos', '10s-gradient-v-1080p.mp4'),
  ], 'Vertical gradient');

  await runFFmpeg([
    '-f', 'lavfi', '-i', 'smptebars=size=1920x1080:rate=30:duration=10',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    join('tests/fixtures/videos', '10s-smptebars-1080p.mp4'),
  ], 'SMPTE bars');

  const TONES = [
    [440,  '10s-440hz-sine.wav'],
    [1000, '10s-1000hz-sine.wav'],
    [100,  '10s-100hz-sine.wav'],
  ];
  for (const [freq, name] of TONES) {
    await runFFmpeg([
      '-f', 'lavfi', '-i', `sine=frequency=${freq}:duration=10:sample_rate=48000`,
      '-ac', '1',  // mono
      '-c:a', 'pcm_s16le',
      join('tests/fixtures/audio', name),
    ], `${freq}Hz sine`);
  }

  await runFFmpeg([
    '-f', 'lavfi', '-i', 'anoisesrc=color=white:duration=10:sample_rate=48000:amplitude=0.5',
    '-ac', '1', '-c:a', 'pcm_s16le',
    join('tests/fixtures/audio', '10s-white-noise.wav'),
  ], 'White noise');

  console.log('\nAll test assets generated.');
}

main().catch((err) => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});
```

This script runs all verified commands in sequence. Estimated total runtime on a CI runner: ~3 minutes (dominated by the 10-second solid-color clips at 1080p30).

---

## 16. Reference Render Generation Process

### 16.1 Why this needs a separate process

When the renderer changes (e.g., a color bug fix, a blend-mode correction, an 8→10-bit pipeline upgrade), the reference renders used by regression tests must be regenerated. If a developer regenerates references on their local machine and commits them alongside the renderer change, the regression tests will pass trivially — but they won't catch any unintended side effects of the renderer change, because both the renderer and the references changed in the same commit.

**The golden rule: references are regenerated AFTER the renderer change lands, on the CI GPU runner, via a separate PR.**

### 16.2 The process (step-by-step)

1. **Renderer change lands in PR-1.** PR-1 updates the renderer code. The regression tests against the OLD references will FAIL on PR-1's CI run (because the renderer's output has changed). PR-1 is merged anyway — the failing regression tests are marked as "expected failures" with `test.fixme()` or `test.fail()` annotations referencing the new reference-regen issue.

2. **A separate PR-2 (reference regen) is opened.** PR-2 triggers the `regenerate-references` workflow via `workflow_dispatch` (manual trigger). This workflow:
   - Checks out the latest `main` (which includes PR-1's renderer changes).
   - Runs the full reference-generation script on the CI GPU runner.
   - Commits the new references to a branch `refs/regen-<date>`.
   - Opens PR-2 with the regenerated references.

3. **PR-2 review.** The reviewer diffs the OLD references against the NEW references using `pixelmatch`. Any frame with >0% diff is shown in the PR description as a before/after/diff image. The reviewer confirms:
   - All diffs are intentional (caused by the renderer change in PR-1, not by a bug).
   - No diffs in unrelated frames (frames that shouldn't have changed).
   - The renderer change is fully captured (no remaining `test.fixme()` annotations).

4. **PR-2 lands.** The `test.fixme()` annotations from PR-1 are removed in a follow-up PR-3 (or directly in PR-2 if the team prefers).

### 16.3 The reference-generation script

```bash
# Triggered by workflow_dispatch on a self-hosted GPU runner
# 1. Generate references for ALL test projects at ALL test frames
node tests/fixtures/generate-references.mjs \
  --projects-dir tests/fixtures/projects \
  --frames 0,30,100,500,1000 \
  --output-dir tests/fixtures/references/linux-gpu-nvidia \
  --meta-file tests/fixtures/references/linux-gpu-nvidia/meta.json
```

### 16.4 The reference meta file

Each reference frame `*.png` has a sibling `*.meta.json`:

```json
{
  "rendererVersion": "1.2.0",
  "gitSha": "abc1234",
  "chromeVersion": "131.0.6778.85",
  "gpuAdapter": {
    "vendor": "nvidia",
    "architecture": "Turing",
    "description": "Quadro T4"
  },
  "generatedAt": "2026-08-22T12:34:56.789Z",
  "generatedBy": "tests/fixtures/generate-references.mjs",
  "workflowRunId": "1234567890"
}
```

The meta file is committed alongside the references so that any test failure can be traced back to the exact renderer version that generated the reference.

### 16.5 Per-platform reference directories

```
tests/fixtures/references/
├── linux-gpu-nvidia/          # CI runner (primary)
│   ├── meta.json
│   ├── simple-cut-frame-0.png
│   ├── simple-cut-frame-0.meta.json
│   ├── simple-cut-frame-30.png
│   ├── ...
├── macos-arm64-gpu/           # macOS M-series self-hosted runner (nightly)
│   └── ...
├── windows-x64-gpu/           # Windows self-hosted runner (nightly)
│   └── ...
└── linux-software-lavapipe/   # Software fallback (for tests that must run on every PR)
    └── ...
```

Each platform has its own reference set because cross-platform pixel outputs are NOT bit-identical (see Q10).

### 16.6 The WYSIWYG test does NOT use references

**Important:** The WYSIWYG test (§7) compares browser-rendered frames against cloud-rendered frames of the SAME project, both rendered fresh in the SAME CI run, on the SAME machine, via the SAME Chrome instance and GPU adapter. It does NOT use pre-generated reference PNGs. Therefore:

- The WYSIWYG test catches renderer inconsistencies between the browser path and the cloud path.
- The regression tests (using references) catch renderer changes over time.
- These are complementary: a renderer change can pass WYSIWYG (browser == cloud) but fail regression (renderer output changed since last reference regen). The regen process in §16.2 makes this failure explicit and reviewable.

---

## 17. CI Configuration Files

### 17.1 GitHub Actions workflow — full test pipeline (verified syntax)

The YAML below uses verified syntax against GitHub Actions docs as of 2026-08-22:

- `actions/checkout@v7` (verified at `https://raw.githubusercontent.com/actions/checkout/v7/README.md`; v7.0.1 released 2026-06-18)
- `actions/setup-node@v7` (verified at `https://raw.githubusercontent.com/actions/setup-node/v7/README.md`)
- `actions/upload-artifact@v7` (verified at `https://raw.githubusercontent.com/actions/upload-artifact/v7/README.md` — v7 retains the v4 breaking changes from v3, including: cannot upload to the same named artifact multiple times, 500-artifact-per-job limit, hidden files excluded by default since v4.4)
- `actions/cache@v6` (verified at `https://raw.githubusercontent.com/actions/cache/v6/README.md`; v6.1.0 latest)
- `peter-evans/create-pull-request@v8` (verified at `https://raw.githubusercontent.com/peter-evans/create-pull-request/v8/README.md`; v8.1.1 latest)
- `runs-on: [self-hosted, linux, x64, gpu]` (verified at `https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/apply-labels`)

```yaml
# .github/workflows/test.yml
name: Test

on:
  pull_request:
  push:
    branches: [main]
  schedule:
    # Nightly soak at 07:00 UTC
    - cron: '0 7 * * *'
  workflow_dispatch:
    # Manual trigger for reference regeneration
    inputs:
      regenerate_references:
        description: 'Regenerate reference renders'
        type: boolean
        default: false

# Cancel in-flight runs when a new commit is pushed to the same branch
concurrency:
  group: test-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ─── Smoke tests ────────────────────────────────────────────────────
  # Run on every PR + every push to main. Goal: < 2 minutes wall clock.
  smoke:
    name: Smoke (PR, <2min)
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci

      # Install Playwright's bundled Chromium + system deps
      - run: npx playwright install --with-deps chromium

      # Install Mesa lavapipe for software Vulkan/WebGPU (verified in FreeCut Dockerfile)
      - name: Install software Vulkan (lavapipe)
        run: |
          sudo apt-get update
          sudo apt-get install -y --no-install-recommends \
            mesa-vulkan-drivers libvulkan1 vulkan-tools

      # Generate test assets (if not cached)
      - name: Cache test assets
        uses: actions/cache@v6
        with:
          path: tests/fixtures/videos
          key: test-assets-${{ hashFiles('tests/fixtures/generate-assets.mjs') }}
      - run: node tests/fixtures/generate-assets.mjs

      # Run smoke tests (unit + a subset of integration)
      - run: npm run test:smoke

      - uses: actions/upload-artifact@v7
        if: failure()
        with:
          name: smoke-test-artifacts
          path: |
            tests/artifacts/
            playwright-report/
          retention-days: 7

  # ─── Full test suite ───────────────────────────────────────────────
  # Run on merge to main. Goal: ~40 minutes wall clock.
  full:
    name: Full (main, ~40min)
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    needs: smoke  # Don't bother if smoke failed
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Install software Vulkan (lavapipe)
        run: |
          sudo apt-get update
          sudo apt-get install -y --no-install-recommends \
            mesa-vulkan-drivers libvulkan1 vulkan-tools
      - name: Cache test assets
        uses: actions/cache@v6
        with:
          path: tests/fixtures/videos
          key: test-assets-${{ hashFiles('tests/fixtures/generate-assets.mjs') }}
      - run: node tests/fixtures/generate-assets.mjs

      # Full test suite (unit + component + integration + property + regression-pixel)
      - run: npm run test:full

      - uses: actions/upload-artifact@v7
        if: failure()
        with:
          name: full-test-artifacts
          path: |
            tests/artifacts/
            playwright-report/
          retention-days: 14

  # ─── Cloud render tests (GPU required) ─────────────────────────────
  # Runs on a self-hosted Linux GPU runner. WYSIWYG + 4K render + memory ceiling.
  cloud-render:
    name: Cloud Render (GPU, ~15min)
    runs-on: [self-hosted, linux, x64, gpu]
    if: github.ref == 'refs/heads/main'
    needs: smoke
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: node tests/fixtures/generate-assets.mjs

      # WYSIWYG + cloud render tests — must run on real GPU (see Q3, Q10)
      - run: npm run test:cloud-render
        env:
          WEBGPU_ADAPTER: auto  # Use whatever real GPU is available

      - uses: actions/upload-artifact@v7
        if: failure()
        with:
          name: cloud-render-test-artifacts
          path: |
            tests/artifacts/
            playwright-report/
          retention-days: 30

  # ─── Nightly soak ───────────────────────────────────────────────────
  nightly:
    name: Nightly Soak (~2h)
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
    runs-on: [self-hosted, linux, x64, gpu]
    timeout-minutes: 180
    strategy:
      fail-fast: false
      matrix:
        platform: [linux-nvidia, macos-m2, windows-d3d12]
        include:
          - platform: linux-nvidia
            runs-on: [self-hosted, linux, x64, gpu]
          - platform: macos-m2
            runs-on: [self-hosted, macos, arm64, gpu]
          - platform: windows-d3d12
            runs-on: [self-hosted, windows, x64, gpu]
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: node tests/fixtures/generate-assets.mjs

      # Nightly: large project (1000 clips), long render (10-min 4K), 8K render,
      # cross-browser, FCPXML round-trip with NLE-specific assertions
      - run: npm run test:nightly
        env:
          PLATFORM: ${{ matrix.platform }}

      - uses: actions/upload-artifact@v7
        if: always()  # Always upload nightly artifacts for trend analysis
        with:
          name: nightly-artifacts-${{ matrix.platform }}
          path: |
            tests/artifacts/
            playwright-report/
            tests/fixtures/references/${{ matrix.platform }}/
          retention-days: 90

  # ─── Reference regeneration (manual trigger) ────────────────────────
  regen-references:
    name: Regenerate References
    if: github.event_name == 'workflow_dispatch' && inputs.regenerate_references
    runs-on: [self-hosted, linux, x64, gpu]
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0  # Full history for the regen PR

      - uses: actions/setup-node@v7
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: node tests/fixtures/generate-assets.mjs

      # Regenerate all references on this runner's GPU
      - run: node tests/fixtures/generate-references.mjs \
            --projects-dir tests/fixtures/projects \
            --frames 0,30,100,500,1000 \
            --output-dir tests/fixtures/references/linux-gpu-nvidia

      # Commit the new references and open a PR
      - name: Create regen PR
        uses: peter-evans/create-pull-request@v8
        with:
          branch: refs/regen-${{ github.run_id }}
          commit-message: |
            chore(references): regenerate after renderer change

            Auto-generated by GitHub Actions workflow_dispatch.
            Workflow run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
          title: 'chore(references): regenerate after renderer change'
          body: |
            References regenerated on ${{ runner.name }} (linux-x64-gpu).

            Review the diffs in the artifacts attached to this PR's generation run.
          labels: references, automated
          add-paths: |
            tests/fixtures/references/**
```

### 17.2 Self-hosted GPU runner setup (Linux, NVIDIA)

Verified setup steps (synthesizing from FreeCut's Dockerfile `/tmp/freecut/headless/Dockerfile:14-49` and GitHub Actions self-hosted runner docs):

```bash
# 1. Create a dedicated user
sudo useradd -m -s /bin/bash github-runner
sudo usermod -aG sudo github-runner

# 2. Install dependencies
sudo apt-get update
sudo apt-get install -y --no-install-recommends \
  curl ca-certificates gnupg \
  google-chrome-stable \
  mesa-vulkan-drivers libvulkan1 vulkan-tools \
  xvfb \
  ffmpeg \
  nodejs npm \
  fonts-liberation fonts-noto-color-emoji

# 3. Install NVIDIA driver (if not already)
sudo apt-get install -y nvidia-driver-535
sudo reboot

# 4. Download the runner
sudo mkdir -p /actions-runner && cd /actions-runner
sudo chown github-runner:github-runner /actions-runner
sudo -u github-runner curl -o actions-runner-linux-x64-2.316.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.316.0/actions-runner-linux-x64-2.316.0.tar.gz
sudo -u github-runner tar xzf actions-runner-linux-x64-2.316.0.tar.gz

# 5. Register the runner with the --labels gpu,x64,linux
sudo -u github-runner ./config.sh \
  --url https://github.com/your-org/your-repo \
  --token <REGISTRATION_TOKEN_FROM_GITHUB_UI> \
  --labels gpu,x64,linux \
  --name "linux-gpu-01"

# 6. Install as a systemd service
sudo ./svc.sh install github-runner
sudo ./svc.sh start

# 7. Verify the runner picks up jobs
sudo -u github-runner ./diag.sh
```

The `--labels gpu,x64,linux` flag (verified at `https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/apply-labels`) makes the runner available to any workflow with `runs-on: [self-hosted, linux, x64, gpu]`.

### 17.3 Test artifact preservation — `actions/upload-artifact@v7` syntax

Verified against `https://raw.githubusercontent.com/actions/upload-artifact/v7/README.md`:

```yaml
- uses: actions/upload-artifact@v7
  if: failure()  # or always() for nightly
  with:
    name: <artifact-name>          # Required
    path: |                       # Required — file, dir, or wildcard
      tests/artifacts/
      playwright-report/
    if-no-files-found: warn       # 'warn' (default) | 'error' | 'ignore'
    retention-days: 30            # 1-90, default = repo setting
    compression-level: 6          # 0-9, default 6
    overwrite: false              # v4+ breaking change: false means fail if name exists
    include-hidden-files: false   # v4.4+ default (retained in v7)
```

**Key v4+ breaking changes (retained in v7; verified from README):**

1. **Cannot upload to the same named artifact multiple times.** v3 silently merged; v4+ errors. Use `actions/upload-artifact/merge` sub-action or split into uniquely-named artifacts.
2. **500-artifact-per-job limit.** Beyond this, the action errors.
3. **Hidden files excluded by default since v4.4.** Pass `include-hidden-files: true` if needed.
4. **Self-hosted runners need additional firewall rules** for the new backend. See [toolkit artifact docs](https://github.com/actions/toolkit/tree/main/packages/artifact#breaking-changes).

### 17.4 Playwright config — `playwright.config.ts`

Verified syntax from `https://playwright.dev/docs/test-configuration`:

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/integration',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Bit-exact screenshots: deviceScaleFactor=1 (no retina doubling)
    deviceScaleFactor: 1,
    viewport: { width: 1920, height: 1080 },
    // WebGPU flags (verified in FreeCut's headless/lib/cli.mjs)
    launchOptions: {
      channel: 'chrome',
      headless: true,
      args: [
        '--enable-unsafe-webgpu',
        '--enable-features=Vulkan',
        '--ignore-gpu-blocklist',
        '--use-angle=vulkan',
        '--no-sandbox',  // Required when running as root in Docker
        // Dawn flags (required for real-GPU runners — cloud-render + nightly
        // jobs on self-hosted NVIDIA hardware, per SCOUT-11 §17.2). Without
        // this, Dawn's separate adapter blocklist rejects NVIDIA driver 570+,
        // causing `navigator.gpu.requestAdapter()` to return null. Harmless
        // on the software-Vulkan (lavapipe) CI runners used by smoke + full.
        '--enable-dawn-features=allow_unsafe_apis,disable_adapter_blocklist',
      ],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
  },
});
```

### 17.5 Vitest config — `vitest.config.ts`

Verified against FreeCut's `vite.config.ts:78-96`:

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/components/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Ratchet floor (not target) — set just below measured coverage so CI
      // fails on regressions. Raise as coverage grows.
      thresholds: {
        statements: 50,
        branches: 45,
        functions: 55,
        lines: 52,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    headers: {
      // Required for performance.measureUserAgentSpecificMemory (see Q4)
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
});
```

---

## 18. Test Plan for This Stream (Meta)

1. **Test infrastructure smoke test:** Verify the test stack boots (Vitest, Playwright, Pixelmatch all work).

2. **Test asset generation test:** Verify all test assets (videos, audio, projects) generate correctly.

3. **CI smoke test:** Verify CI runs the smoke tests in <2 minutes.

4. **WYSIWYG test runs:** Verify the WYSIWYG test catches intentional diffs (modify renderer, run test, assert failure).

5. **Property test invariants:** Verify property tests catch invariant violations (manually craft a buggy op, assert test fails).

6. **Performance test reliability:** Verify performance tests are stable across runs (no flaky FPS measurements).

---

## Testing

> See `17-test-plan.md` for the overall methodology, test matrix, and
> per-module template. This section lists the specific tests for this module
> (spec 12 — the test infrastructure itself).
>
> **Note on meta-nature of this section:** spec 12 *is* the test
> infrastructure. The tests below are **meta-tests** — they verify that the
> harness, fixtures, and CI workflow described in this spec actually behave
> as documented. If a meta-test fails, every test that depends on the
> infrastructure (i.e., all of them) is suspect. Meta-tests must run first
> in CI so infrastructure regressions are caught before the rest of the
> suite (see `17-test-plan.md` §9.3 for the CI ordering rule).
>
> **Note on tier placement:** pure comparison / FFT / schema-validation
> helpers (§5, §6) are pure functions and live in Tier 1. Anything that
> launches a browser, Xvfb, SwiftShader, or ffmpeg is Tier 2 — those are
> "render" tests in the sense that they exercise the *environment* the
> render tests rely on, not the engine's render path directly. The Tier 3
> tests here verify the **test-runner UI** (Vitest's reporter, Playwright's
> HTML report) — distinct from the application UI tested in specs 05, 08, 16.

### Tier 1: Pure engine tests

[Filename: `tests/unit/12-testing-strategy/*.test.ts`]

These exercise the comparison and verification helpers themselves — the
`pixelmatch` wrapper (§5.1), the `OfflineAudioContext` + FFT helper (§6.3),
the asset-manifest validator (§13), and the Zod schema for project fixtures
(§5.3 / spec 09). They run in Vitest with no browser.

- `pixelmatch-identical-images-yields-zero-diff` — comparing
  `tests/fixtures/test-infrastructure/known-good-screenshot.png` against
  itself returns `{ diffPixels: 0, diffPct: 0 }`; no diff image is written
  (or the diff image is byte-identical to the input)
- `pixelmatch-known-different-images-yields-correct-diff-count` — comparing
  `known-good-screenshot.png` against
  `known-different-screenshot.png` (which differs by exactly 1 pixel — see
  Test assets below) returns `{ diffPixels: 1, diffPct: 1 / (W×H) }` within
  the documented tolerance; the diff image's lone non-black pixel sits at
  the documented `(x, y)` coordinate
- `pixelmatch-respects-threshold` — for the same 1-pixel-diff pair, raising
  `threshold` to a value above the per-channel delta suppresses the diff
  (returns `diffPixels: 0`); lowering it to 0 reports the pixel — verifies
  the threshold plumbing matches the `pixelmatch` upstream API (§5.1)
- `audio-compare-identical-float32arrays-yields-zero-rmse` — comparing a
  `Float32Array` against itself returns `{ rmse: 0, peakDiff: 0 }` exactly
  (no floating-point residue; the helper uses `Math.fround`-aligned
  accumulation per §6.2)
- `audio-compare-known-different-samples-yields-correct-rmse` — comparing a
  full-scale sine (`known-good-audio.wav` decoded to `Float32Array`) against
  the same signal scaled by 0.5 returns `rmse` within 1% of the theoretical
  value (`0.5 / √2 ≈ 0.3536` for a full-scale sine halved linearly); the
  helper documents the closed-form expectation in a comment
- `fft-computes-peak-at-440hz-bin` — decoding
  `440hz-sine-1s.wav` to `Float32Array` (48 kHz, 48 000 samples) and
  running the `computeFft()` helper (§6.3) returns a spectrum whose
  dominant peak bin lies at `440 Hz ± (sampleRate / N)` (= ± 1 Hz for
  `N = 48000`); the peak amplitude is within 0.5 dB of full-scale
- `fft-returns-correct-bin-width` — for an `N`-sample FFT at sample rate
  `sr`, bin width equals `sr / N` exactly; tested with `N ∈ { 256, 1024,
  4096, 16384, 48000 }` and `sr ∈ { 44100, 48000, 96000 }`
- `fft-window-applies-hann-correctly` — the helper applies a Hann window
  before the FFT (per §6.3 — reduces spectral leakage); for a non-integer
  number of cycles, the leakage is bounded (max side-lobe ≤ −31 dB relative
  to peak). Verifies the window is actually applied (catches the
  accidentally-removed-window regression)
- `test-asset-manifest-all-assets-exist` — `tests/fixtures/manifest.json`
  (the canonical manifest from `17-test-plan.md` §5 / spec 12 §13) lists
  every fixture; this test asserts `fs.existsSync(path)` for each entry
  before any other test runs (it is registered as a Vitest `beforeAll`
  hook in `tests/setup.ts`)
- `test-asset-manifest-sha256-matches` — for each manifest entry, the
  on-disk file's SHA-256 hash matches the manifest's `sha256` field exactly
  (catches silent regeneration from a different ffmpeg build, different
  libx264 version, or accidental commit of a re-encoded file)
- `test-asset-manifest-duration-and-codec-match` — for each video / audio
  entry, `ffprobe` (called from Vitest via `execa`) reports the same
  `duration_sec`, `codec`, `width`, `height`, `pix_fmt`, `sample_rate`
  fields as the manifest (defends against ffmpeg major-version drift
  between dev machines and CI)
- `zod-schema-validates-all-project-fixtures` — every
  `tests/fixtures/projects/*.json` parses cleanly through the `ProjectSchema`
  (spec 09 §2); a fixture that fails Zod validation fails this test rather
  than producing a cryptic `engine.loadProject` failure downstream
- `zod-schema-rejects-malformed-fixture` — a deliberately-corrupted
  fixture (missing `frameRate`, negative `duration`, unknown `op` enum
  value) is rejected by `ProjectSchema.safeParse()` with a non-empty
  `error.issues` array — verifies the schema is actually constraining
  (regression for the "schema is just a type hint, never enforced" class
  of bug)
- `pixelmatch-diff-image-format-is-png-8-bit-rgba` — the diff image
  produced by the helper is a valid PNG, 8-bit RGBA, same dimensions as the
  inputs; verified via `pngjs` metadata read-back (the diff image is later
  uploaded as a CI artifact per §17.1)

### Tier 2: Render tests

[Filename: `tests/integration/12-testing-strategy/*.render.test.ts`]

These exercise the environment the rest of the suite runs in: Xvfb,
SwiftShader WebGPU, Playwright's screenshot / DPR plumbing, ffmpeg asset
generation, and the CI workflow's timing budget. They run in Playwright +
headless Chrome under Xvfb (§3.2, §14.A).

- `xvfb-starts-and-chrome-renders-to-it` — `xvfb-run` launches `Xvfb :99`
  with `screen 0 1920x1080x24`; Chrome launched with `--display=:99`
  renders a solid-red `<canvas>`; the captured screenshot's first pixel is
  `#FF0000` (tolerance ±2/255 per channel — accounts for Xvfb's RGB565
  fallback path). Verifies the virtual framebuffer is actually wired up,
  not silently using the headless-GPU path
- `swiftshader-webgpu-adapter-available` — `navigator.gpu.requestAdapter()`
  returns a non-null `GPUAdapter`; `adapter.requestDevice()` returns a
  `GPUDevice`; `device.queue.submit([])` does not throw; this is the
  baseline for every WebGPU-dependent test in specs 04, 07, 10, 11 (if
  SwiftShader is missing, those tests are skipped with a clear message,
  not silently passed)
- `swiftshader-renders-triangle-with-correct-pixel` — a minimal WGSL
  pipeline (vertex shader emits a single red triangle covering the top-left
  quadrant of a 2×2 canvas) renders; `device.capture()` / `copyExternalImageToTexture`
  read-back yields `pixel(0,0) === [255, 0, 0, 255]` and `pixel(1,1) ===
  [0, 0, 0, 0]` (outside the triangle). Verifies SwiftShader's rasterizer
  matches our expectations, not just that it boots
- `playwright-screenshot-clip-captures-correct-region-at-1to1` — a test
  page draws a 100×100 red square at `(50, 50)` on a 1920×1080 canvas;
  `page.screenshot({ clip: { x: 50, y: 50, width: 100, height: 100 } })`
  yields an image whose every pixel is `#FF0000` (no anti-aliasing at the
  boundary, no DPR scaling); a `clip` of the region `(0, 0, 50, 50)` yields
  all background-color pixels — verifies the `clip` API is pixel-exact (a
  regression here would silently break every Tier 2 pixel-diff test in the
  suite)
- `playwright-device-scale-factor-1-prevents-retina-doubling` — with
  `page.setViewportSize({ width: 1920, height: 1080 })` and
  `deviceScaleFactor: 1`, `window.devicePixelRatio` is exactly `1.0` and
  `page.screenshot()` returns a 1920×1080 image (not 3840×2160); verifies
  the `--force-device-scale-factor=1` Chrome flag is taking effect (per
  §14.A) — a regression here would double every reference PNG's effective
  resolution and silently make every pixel-diff fail
- `ffmpeg-generates-all-solid-color-clips` — running the §15.A generation
  script produces every clip listed in `17-test-plan.md` §5.1; each file
  passes `ffprobe` validation (codec, duration, frame size, frame count);
  this test runs in the `regen-fixtures` workflow, not on every PR (per
  §11.4 — fixtures are checked into the repo, not regenerated on CI)
- `ffmpeg-solid-color-clips-have-correct-rgb` — for each solid-color clip,
  `ffmpeg -i <clip> -vf "select=eq(n\,0)" -vframes 1 -f rawvideo -pix_fmt
  rgb24 -` yields pixels matching the documented sRGB hex (tolerance ±1 per
  channel — accounts for yuv420p chroma subsampling on pure-color frames,
  which is exactly zero in practice but documented for safety)
- `ffmpeg-sine-tones-have-correct-frequency` — for each sine-tone fixture
  (§5.2), decoding to `Float32Array` and running `computeFft()` returns a
  dominant peak at the documented frequency ± 1 bin; for the chirp
  fixture, the spectrogram shows a monotonically increasing peak (no
  wrap-around, no phase discontinuity)
- `ffmpeg-asset-generation-is-deterministic` — running the §15.A / §15.D
  generation script twice in a clean `/tmp` directory produces byte-identical
  files (same SHA-256). Catches non-deterministic encoder behavior (e.g.,
  ffmpeg embedding a timestamp in metadata) before it breaks the manifest
  hash check. Note: this test is `skipped` on CI runners where the ffmpeg
  version is not pinned; it runs on the self-hosted GPU runner only (§17.2)
- `ci-smoke-suite-completes-under-2-min` — the `smoke` GitHub Actions job
  (Tier 1 only, per §17.1) reports a wall-clock duration < 120 s; measured
  via the `actions-timestamp` API (or by parsing the job's start/stop
  times). Asserted by a nightly meta-CI job, not on every push
- `ci-full-suite-completes-under-40-min` — the `full` GitHub Actions job
  (Tier 1 + Tier 2 + Tier 3, per §17.1) reports a wall-clock duration <
  2400 s; same measurement approach. A regression here usually indicates
  either a perf regression in the engine or a test that's hanging on a
  worker timeout
- `ci-nightly-suite-runs-on-self-hosted-gpu-runner` — the `nightly`
  schedule (Tier 2 with real GPU, perf tests, property tests at
  `numRuns: 10000`, per §17.1) runs on a runner whose labels include
  `self-hosted, gpu`; the test fetches the workflow run via the GitHub API
  and asserts `runner.labels` contains both. Catches the silent
  fall-back-to-ubuntu-latest regression (which would skip every GPU test
  rather than failing them)
- `ci-preserves-artifacts-on-failure` — when a test in the smoke / full /
  nightly suite fails, the workflow uploads the `tests/artifacts/`
  directory (screenshots, diff PNGs, traces, logs) as a GitHub Actions
  artifact with 30-day retention (§17.1); this test deliberately triggers
  a failing assertion in a canary test file, then asserts the artifact
  exists and contains the expected screenshot. The canary is then
  re-passed via `git revert` on a follow-up commit (so the
  `main` branch never lands in a state where the meta-suite is red)
- `pixelmatch-threshold-tuning-fixture-yields-known-diff` — the
  `tests/fixtures/test-infrastructure/known-good-screenshot.png` and
  `known-different-screenshot.png` pair (see Test assets) is compared at
  `threshold ∈ { 0.0, 0.1, 0.2, 0.5 }`; the returned `diffPixels` is
  `1, 1, 0, 0` respectively (the 1-pixel delta is at ~0.2 luminance
  difference). Verifies the threshold actually controls detection — a
  regression would either never detect (broken threshold) or always
  detect (broken alpha handling)

### Tier 3: UI tests

[Filename: `tests/integration/12-testing-strategy/*.ui.test.ts`]

These exercise the **test-runner UI** (Vitest's terminal reporter,
Playwright's HTML report) — not the application UI. They run via
Playwright driving a second Playwright instance (we launch `vitest --ui`
and `playwright show-report` in a child process and screenshot the result).
This meta-driving is necessary because the test runner's UI is what
engineers look at when a test fails — if it lies, every failure
investigation starts off wrong.

- `vitest-reports-correct-pass-fail-counts` — running `vitest run` on a
  fixture test directory with a known-good and a known-bad test yields a
  terminal report with `Tests  X passed | Y failed`; the parsed `X` and
  `Y` match the actual number of passing / failing tests. Catches the
  silent pass-on-throw regression (where an `afterEach` throws but the
  test is still counted as passing)
- `playwright-reports-correct-pass-fail-counts` — running `playwright
  test` on a fixture directory yields an HTML report whose top-level
  summary line shows the same `passed / failed / skipped` counts as the
  underlying test files; the report's "failed" list contains exactly the
  failing test titles, in order
- `playwright-html-report-shows-failure-screenshots` — for a failing
  Tier 2 test that called `page.screenshot({ path: '...' })` before
  asserting, the HTML report's failure detail page embeds the screenshot
  image and the `pixelmatch` diff PNG side-by-side; both `<img>` elements
  have non-empty `src` attributes pointing to retained artifact files
- `playwright-trace-viewer-loads-trace` — for a failing test where
  `trace: 'on-all-retries'` is set (§17.4), `playwright show-trace
  <trace.zip>` opens the trace viewer; the trace contains at least one
  snapshot (DOM + screenshot + network event) — verifies the trace
  pipeline is intact end-to-end (a regression here would lose the
  primary debugging artifact for Tier 2 / Tier 3 failures)
- `ci-check-run-annotations-link-to-failing-test` — when CI fails, the
  GitHub Actions `checks` API shows an annotation pointing at the specific
  test file and line (not just "job failed"); verified by querying the
  `check-runs/{id}/annotations` endpoint. Catches the
  annotation-truncation regression where Playwright's reporter emits only
  the first failure

### Property-based tests

[Filename: `tests/unit/12-testing-strategy/*.property.test.ts`]

Property tests for the comparison helpers themselves. These are short —
the helpers are pure and deterministic, so the property catalogue is
small but each property is non-trivial.

- `pixelmatch-deterministic` — for arbitrary `pngjs` images generated by
  the `fc` arbitrary (random width/height/RGBA pixels), running
  `comparePixels(a, b)` twice yields byte-identical `{ diffPixels, diffPct,
  diffImage }` results (deterministic — never statistical). `numRuns: 200`
  (PNG comparison is slow; 200 random pairs is sufficient given the
  trivial determinism argument)
- `fft-deterministic` — for arbitrary `Float32Array` signals (generated
  by `fc.array` of `fc.float` clamped to `[-1, 1]`), running `computeFft()`
  twice yields elementwise-identical spectra (within `1e-7` floating-point
  tolerance). `numRuns: 100`
- `audio-compare-symmetric` — for arbitrary pairs `(a, b)`,
  `compareAudio(a, b).rmse === compareAudio(b, a).rmse` exactly (the
  helper accumulates squared differences in symmetric order — this
  catches an accidental `(a[i] - b[i]) ** 2` vs `(b[i] - a[i]) ** 2`
  asymmetry, which can't actually happen but the test documents the
  invariant). `numRuns: 500`
- `pixelmatch-monotonic-in-diff` — for arbitrary image `a` and an
  arbitrary `b` constructed by perturbing `k` pixels of `a` by a fixed
  delta, `comparePixels(a, b).diffPixels` is non-decreasing in `k`
  (adding more perturbations cannot reduce the diff count). `numRuns: 200`

### Meta-tests

[Filename: `tests/unit/12-testing-strategy/*.meta.test.ts`]

These verify the test infrastructure works **as a test infrastructure** —
that it can detect passes, detect failures, and not flake. They are
distinct from the Tier 1/2/3 tests above (which verify specific
behaviors). Meta-tests are required because the test infrastructure is
the foundation everything else stands on — if it silently fails open, no
other test result is trustworthy.

- `canary-test-always-passes` — a test that asserts `1 === 1`. This test
  must never fail. If it does, the test runner is broken (or the test
  files are being collected incorrectly — e.g., the Vitest `include` glob
  is wrong). Registered as the **first** test in the smoke suite
- `negative-test-always-fails` — a test that asserts `false === true`.
  This test must **always fail**. It is registered in a separate
  Vitest project / Playwright project named `"expected-failures"` that
  inverts the pass/fail expectation (a "pass" in that project is a test
  that fails as expected). If the negative test ever passes, the runner
  is silently swallowing assertion failures — every other "passing"
  test result is now suspect. (This is the standard "mutation testing
  for the harness itself" technique — see §15.2 of `17-test-plan.md` for
  the broader mutation-testing discussion)
- `self-test-runs-suite-against-itself` — the entire `tests/unit/12-testing-strategy/`
  directory is run as a child Vitest process from within a meta-test;
  the parent asserts that the child exits 0 and reports the expected
  number of tests (computed by reading the test files and counting
  `it()` / `test()` calls — kept in sync by a lint rule that forbids
  dynamically-registered tests). Catches regressions where Vitest silently
  skips a test file (e.g., a typo in the `include` glob, a top-level
  `describe.skip`, or a non-`await`ed `import()` that throws in module
  scope and is swallowed)
- `flaky-test-detector-bounds-flake-rate` — for a known-deterministic
  test (e.g., `pixelmatch-identical-images-yield-zero-diff`), run it
  `100` times via `vitest --repeat-each 100`; assert that all 100 runs
  pass (flake rate 0%). For tests that legitimately touch async timing
  (e.g., `xvfb-starts-and-chrome-renders-to-it`), the flake rate over
  100 runs must be < 5% (i.e., ≤ 5 failures). Runs nightly on the
  self-hosted runner; failures open an issue automatically
  (`actions-automated-issue` workflow)
- `snapshot-of-meta-suite-pass-count` — the meta-suite itself has a known
  count of tests; a `toMatchSnapshot()` on the parsed Vitest JSON report
  catches accidental additions / deletions (a new test that isn't
  running because of a typo'd filename would silently decrease the
  count). Snapshot is reviewed as part of every PR that touches
  `tests/unit/12-testing-strategy/`

### Test assets

Fixtures used specifically by the meta-tests. The general-purpose
fixtures (solid-color videos, sine tones, project JSONs) are the
canonical fixtures from `17-test-plan.md` §5 and are not re-listed here.

- `tests/fixtures/test-infrastructure/known-good-screenshot.png` — a
  1920×1080 PNG, 8-bit RGBA, generated by the renderer on a fixture
  project (a single solid-red clip on the main track). Used as the
  "ground truth" for `pixelmatch` verification. Regenerated via
  `npm run regen-references -- --filter test-infrastructure` (see §10 of
  spec 17 for the regeneration protocol). SHA-256 pinned in the manifest.
- `tests/fixtures/test-infrastructure/known-different-screenshot.png` —
  byte-identical to `known-good-screenshot.png` except for a single
  pixel at coordinate `(960, 540)` (center of frame), whose red channel
  is decremented by 50 (sufficient to exceed the default `threshold:
  0.1` used in `comparePixels`). Generated from `known-good-screenshot.png`
  via a small Node.js script (`scripts/mutate-one-pixel.mjs`) so the
  mutation is reproducible. Used by `pixelmatch-known-different-*` and
  `pixelmatch-threshold-tuning-fixture-yields-known-diff`.
- `tests/fixtures/test-infrastructure/known-good-audio.wav` — a 1-second,
  48 kHz, 16-bit PCM mono WAV containing a full-scale 440 Hz sine.
  Generated by the same ffmpeg command as `10s-440hz-sine.wav` but
  truncated to 1 s (smaller — the test only needs 1 s to verify the
  comparison helper). Used by `audio-compare-known-different-*` (the
  "scaled by 0.5" variant is generated in-test, not stored on disk —
  scaling is a one-liner in the test).
- `tests/fixtures/test-infrastructure/440hz-sine-1s.wav` — same content
  as `known-good-audio.wav` but kept as a separate fixture so the
  FFT-verification tests don't share state with the audio-comparison
  tests (a fixture used by two test categories should be two files, so
  regenerating one for FFT debugging doesn't invalidate the
  audio-comparison manifest hash). Both files hash to the same SHA-256 —
  the manifest records both entries pointing at the same content (a
  manifest-level rule allows two filenames to share a hash, but each
  must be listed separately so deletion of one doesn't break the other's
  tests).
- `tests/fixtures/test-infrastructure/manifest.json` — the canonical
  manifest for these four fixtures (plus the cross-referenced canonical
  fixtures from `17-test-plan.md` §5). Format:
  ```json
  [
    {
      "path": "tests/fixtures/test-infrastructure/known-good-screenshot.png",
      "type": "image/png",
      "width": 1920, "height": 1080,
      "sha256": "…",
      "generator": "scripts/regen-test-infrastructure-screenshot.mjs"
    },
    …
  ]
  ```
  Validated by the `test-asset-manifest-*` Tier 1 tests above.

### Test commands

```bash
# Run Tier 1 tests for spec 12 (Vitest — pure helpers)
npm test -- --filter "12-testing-strategy"

# Run Tier 2 (render / integration) tests for spec 12
# (Playwright + headless Chrome under Xvfb)
npm run test:render -- --filter "12-testing-strategy"

# Run Tier 3 (UI) tests for spec 12 — drives the test-runner UI itself
npm run test:ui -- --filter "12-testing-strategy"

# Run all tiers for spec 12
npm run test:all -- --filter "12-testing-strategy"

# Run property tests only
npm run test:property -- --filter "12-testing-strategy"

# Run meta-tests only (canary, negative, self-test, flaky detector)
# These run first in CI; running them alone is useful for debugging
# infrastructure regressions without waiting for the full suite.
npm test -- --filter "12-testing-strategy.*.meta.test.ts"

# Regenerate the known-good screenshot / audio fixtures for the
# test-infrastructure meta-tests (see spec 17 §10 for the regeneration
# protocol — requires explicit `REGEN_REFERENCES=1` env var to prevent
# accidental overwrites)
REGEN_REFERENCES=1 npm run regen-references -- --filter test-infrastructure
```

> **Note on CI ordering:** the meta-tests (especially
> `canary-test-always-passes` and `self-test-runs-suite-against-itself`)
> run **first** in every CI job. If the canary fails, the rest of the job
> is aborted (no point running 5 000 tests on a broken runner). The
> negative test runs in a parallel `expected-failures` project so its
> intentional failure doesn't gate the main suite. See `17-test-plan.md`
> §9.3 for the CI ordering rules.
>
> **Note on the meta-suite's own test count:** the meta-suite is small
> (≈ 30 tests across all tiers) and runs in < 30 s on the smoke runner.
> It is the cheapest insurance against the "all tests passing but
> nothing actually works" failure mode that haunts every test
> infrastructure team.

---

**End of `12-testing-strategy.refined.md`.** Next: `13-subagent-scout-plan.md`.

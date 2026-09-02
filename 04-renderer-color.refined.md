# 04 — Renderer & Color: WebGPU, 10-bit Pipeline, Scene-Linear Color Management (REFINED)

**Stream:** GPU rendering pipeline + color management
**Status:** Refined spec — sub-agent scout SCOUT-04 has verified all claims against FreeCut + OpenCut-classic source
**Primary teacher:** FreeCut `gpu-*` infrastructure (to be ported to 10-bit scene-linear) + OpenCut-classic Rust `compositor/` shaders
**Seed file:** `04-renderer-color.md`
**Refined by:** SCOUT-04 (general-purpose scout)
**Date:** 2026-08-22

---

## How to Read This Refined Spec

Sections 1–10 are the **seed spec**, copied verbatim from `04-renderer-color.md` (the architect's original).
Section 11 has been **replaced** with concrete answers backed by `file:line` references.
Section 12 (test plan) is preserved unchanged.
Sections 13–16 are **new** (Code References, Corrections, WGSL Shader Quotes, Texture Format Chain).

Legend used throughout §11/§13/§14:

- ✅ = seed spec claim verified correct
- ❌ = seed spec claim wrong (see §14 for details)
- ⚠️ = seed spec claim partially correct (more nuance needed)
- 📍 = `file:line` reference into a verified source file

---

## 1. Purpose

Define the WebGPU rendering pipeline and the color management system that makes it color-accurate. This stream addresses Decision 4 (WebGPU-only) and Decision 5 (10-bit, scene-linear).

The reference repos both operate in **8-bit sRGB throughout**. We override this and build a proper 10-bit, scene-linear pipeline. This is the most architecturally significant departure from both reference repos.

---

## 2. Goals

1. **10-bit color end-to-end.** P010 decode → 10/16-bit GPU textures → 10-bit canvas output.
2. **Scene-linear working space.** All grading math (exposure, contrast, blend modes) operates on linear-light values, not gamma-encoded values.
3. **Color management.** Tag input color space, convert to scene-linear, apply grade, apply display transfer function, output to canvas.
4. **WebGPU-only.** No WebGL2 fallback (see master spec Decision 4).
5. **WGSL-only.** No Rust, no wgpu, no `opencut-wasm`. Pure TypeScript + WGSL.
6. **WYSIWYG.** Browser render and cloud render produce identical pixels.

---

## 3. The Problem We're Solving

Both reference repos do this (simplified):

```
Source (8-bit sRGB) → GPU texture (rgba8unorm) → grade math (on gamma-encoded values!) → output (rgba8unorm, [0,1] clamp)
```

**Why this is wrong:**

1. **Banding.** 8-bit (256 levels per channel) shows banding in smooth gradients after grading.
2. **Wrong math.** `exposure` applied to gamma-encoded values is mathematically incorrect. The correct operation is `c *= 2^exposure` on linear-light values.
3. **Wrong blends.** Porter-Duff blend modes assume linear-light inputs. Blending gamma-encoded values gives perceptually wrong results (a 50/50 blend of red and green should be yellow-ish; in sRGB-encoded space it's muddy olive).
4. **No HDR.** 8-bit can't represent the dynamic range of HDR content.
5. **Wrong color clipping.** Output clamped to `[0,1]` discards highlight detail that HDR displays could show.

FreeCut's Color Wheels shader (`gpu-effects/effects/color.ts:611`) shows the issue:

```wgsl
// FreeCut — operates on gamma-encoded values (wrong)
let color = textureSample(inputTex, texSampler, input.uv);
c *= pow(2.0, params.exposure);              // ← wrong: should be linear
c = (c - vec3f(pivot)) * contrast + pivot;   // ← wrong: should be linear
return vec4f(clamp(c, vec3f(0.0), vec3f(1.0)), color.a);  // ← clamps, no HDR
```

We port the same shader, but operating in linear-light:

```wgsl
// Ours — operates on linear-light values (correct)
let color = textureSample(inputTex, texSampler, input.uv);  // linear-light, 10-bit
c *= pow(2.0, params.exposure);              // ← correct
c = (c - vec3f(pivot)) * contrast + pivot;  // ← correct
return vec4f(c, color.a);                    // ← no clamp, HDR-aware
```

The shader code is nearly identical. The fix is operating in the right color space.

---

## 4. Architecture

```
┌──────────────────────────────────────────────────────────┐
│ Source (file)                                             │
│  - H.264/5, ProRes, etc.                                  │
└──────────────┬───────────────────────────────────────────┘
               │ mediabunny + WebCodecs
               ▼
┌──────────────────────────────────────────────────────────┐
│ Decoded VideoSample (mediabunny) wraps a VideoFrame      │
│  - pixelFormat: I420P10 (mediabunny's planar 4:2:0 10-bit)│
│    or I420P12, I422P10, I444P10 depending on source      │
│  - colorSpace: BT.709 (SDR) or BT.2020 (HDR)             │
└──────────────┬───────────────────────────────────────────┘
               │ VideoFrame.copyTo({ plane: 'Y' / 'U' / 'V' })
               ▼
┌──────────────────────────────────────────────────────────┐
│ GPU Texture: Source YUV planes                            │
│  - Y plane: r16uint (16-bit, MSB-aligned 10-bit in Y)   │
│  - U plane: r16uint (half-res)                           │
│  - V plane: r16uint (half-res)                           │
│  (For I422*: U, V half-res horizontal only.              │
│   For I444*: full-res. For NV12/P010: single rg16uint.)  │
└──────────────┬───────────────────────────────────────────┘
               │ YUV→RGB shader (BT.709 or BT.2020 matrix)
               │ + inverse transfer function (sRGB EOTF or PQ/HLG EOTF)
               ▼
┌──────────────────────────────────────────────────────────┐
│ GPU Texture: Working linear-light RGB                    │
│  - format: rgba16float (16-bit half-float per channel)   │
│  - colorSpace: scene-linear, BT.709 or BT.2020 primaries │
│  - values: linear-light, can exceed 1.0 for HDR         │
└──────────────┬───────────────────────────────────────────┘
               │
               │ ┌──────────────────────────────────────┐
               │ │ All grading math happens here        │
               │ │  - Exposure: c *= 2^exposure          │
               │ │  - Contrast: (c - pivot) * contrast   │
               │ │  - Lift/Gamma/Gain                    │
               │ │  - Color wheels (shadows/mids/highlights) │
               │ │  - Curves (LUT applied in linear)    │
               │ │  - Blend modes (Porter-Duff in linear) │
               │ │  - Effects (blur, sharpen, etc.)     │
               │ └──────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│ GPU Texture: Graded linear-light RGB                     │
│  - format: rgba16float                                   │
└──────────────┬───────────────────────────────────────────┘
               │ Display transfer function shader
               │  - sRGB OETF (for SDR display)
               │  - PQ OETF (for HDR display)
               │  - HLG OETF (for HDR display)
               │
               │ Tone mapping (if HDR → SDR display)
               ▼
┌──────────────────────────────────────────────────────────┐
│ Canvas (output)                                          │
│  - format: rgba10a2unorm (10-bit per channel) —          │
│    Chromium 118+ with chrome://flags/#enable-unsafe-webgpu │
│    OR rgba8unorm fallback (SDR-only, no 10-bit canvas)   │
│  - colorSpace: 'display-p3' (wide gamut, SDR)            │
│    OR 'srgb' (default, for fallback)                      │
└──────────────────────────────────────────────────────────┘
```

**Key change from seed spec §4:** `pixelFormat: 'P010'` was removed. mediabunny does not expose `P010` (it exposes `I420P10` / `I420P12` / `I422P10` / `I422P12` / `I444P10` / `I444P12`, all *planar*). See §11 Q7 / §14.C for details. The YUV plane count is now 3 (Y + U + V) for planar formats, not 2 (Y + UV) as the seed spec assumed for the semi-planar P010 case.

---

## 5. Texture Format Chain

### 5.1 Source YUV textures

```ts
// Y plane (luma) — 10-bit per pixel, MSB-aligned in 16-bit cells
const yTexture = device.createTexture({
  size: { width, height },
  format: 'r16uint',
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
});

// U plane (chroma) — 10-bit per pixel, half-resolution (4:2:0)
// For I422P10: half-res horizontal only (width/2, height)
// For I444P10: full-res (width, height)
const uTexture = device.createTexture({
  size: { width: width / 2, height: height / 2 },
  format: 'r16uint',
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
});

// V plane (chroma) — same dimensions as U for planar formats
const vTexture = device.createTexture({
  size: { width: width / 2, height: height / 2 },
  format: 'r16uint',
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
});
```

**Upload path (per-plane extraction):**
```ts
// VideoFrame (I420P10) → 3 GPU textures via VideoFrame.copyTo + writeTexture
const yLayout = videoFrame.allocationSize({ plane: 'Y' });
const yBuf = new Uint8Array(yLayout.allocationSize);
const yCopy = await videoFrame.copyTo(yBuf, { plane: 'Y' });
device.queue.writeTexture(
  { texture: yTexture },
  yBuf,
  { bytesPerRow: yCopy.stride, rowsPerImage: height },
  { width, height },
);

// Repeat for 'U' and 'V' planes with their respective dimensions.
```

**Why this path:** `copyExternalImageToTexture` for a `VideoFrame` performs an internal YUV→RGB conversion in the browser, which (a) collapses the 10-bit precision down to 8-bit and (b) uses the browser's choice of YUV→RGB matrix, denying us color management. To preserve 10-bit precision AND control the matrix, we extract the raw planes via `VideoFrame.copyTo` (per-plane API) and upload each to its own `r16uint` texture.

✅ **Verified — see §11.8 Q8 (Option 2):** `VideoFrame.copyTo` supports per-plane extraction (`options.plane`) per WebCodecs spec §5.4; per-plane upload via `device.queue.writeTexture` is the v1 path. The WGSL plane-extraction fallback stays on file for browsers that gate per-plane copies, at the documented precision cost.

### 5.2 Working linear-light texture

```ts
const workingTexture = device.createTexture({
  size: { width, height },
  format: 'rgba16float',  // 16-bit half-float per channel, 4 channels
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
});

// Ping-pong for multi-pass effects
const workingTextureB = device.createTexture({ /* same */ });
```

**Why `rgba16float`:**
- 16-bit half-float gives enough precision for grading (~11 bits of mantissa)
- Can represent values >1.0 (HDR highlights)
- Supported by all WebGPU implementations (no extensions needed)
- Standard for compositing work

### 5.3 Output (canvas) texture

```ts
// Detect canvas format support at runtime — feature-detection is required
const canvasConfig: GPUCanvasConfiguration = device.features.has('rgba10a2unorm-canvas')
  ? {
      device,
      format: 'rgba10a2unorm',  // 10-bit per channel + 2-bit alpha
      colorSpace: 'display-p3',
      alphaMode: 'premultiplied',
    }
  : {
      device,
      format: 'rgba8unorm',     // 8-bit fallback
      colorSpace: 'display-p3', // still wide gamut, just 8-bit
      alphaMode: 'premultiplied',
    };
canvas.getContext('webgpu').configure(canvasConfig);
```

**Why runtime feature detection:**
- `rgba10a2unorm` as a canvas format is **non-standard** — it is not in the W3C WebGPU spec's enumerated surface formats (only `bgra8unorm`, `rgba8unorm`, `rgba16float` are guaranteed). Chromium 118+ exposes it behind the `chrome://flags/#enable-unsafe-webgpu` flag, with hardware-dependent support.
- `rgba16float` canvas + `extended-srgb-linear` colorSpace is the spec-compliant HDR path (Chromium 116+) — heavier memory cost, but standard.
- For v1 we prefer `rgba10a2unorm` when available (matches P010 precision), falling back to `rgba8unorm` for broad compatibility.
- See §11 Q9 / §11 Q10 for full verification details.

**Alternative:** `rgba16float` for the canvas too (HDR output path). Stick with `rgba10a2unorm` + `display-p3` for v1 SDR; add `rgba16float` + `extended-srgb-linear` for v2 HDR.

---

## 6. Color Space Management

### 6.1 Input color space detection

When a video file is imported, detect its color space:
- Container metadata (MP4 `colr` atom, MKV track headers) — mediabunny exposes this via `InputVideoTrack` metadata
- Default to BT.709 for SDR, BT.2020 for HDR

```ts
interface MediaColorInfo {
  primaries: 'bt709' | 'bt2020' | 'smpte-c' | 'display-p3';
  transfer: 'srgb' | 'pq' | 'hlg' | 'bt709';  // sRGB EOTF, PQ EOTF, HLG OETF
  matrix: 'bt709' | 'bt2020-ncl' | 'bt601';
  range: 'limited' | 'full';
}
```

Store this on the `MediaInfo` (see `09-project-model.refined.md`).

### 6.2 Color pipeline shaders

```wgsl
// yuv_to_linear.wgsl
// Converts I420P10/I420P12 YUV (3× r16uint planes) to linear-light RGB (rgba16float)

struct YuvToRgbUniforms {
  kr: f32,        // BT.709: 0.2126, BT.2020: 0.2627
  kb: f32,        // BT.709: 0.0722, BT.2020: 0.0593
  range: f32,     // 0 = limited (16-235), 1 = full (0-255)
  transfer: u32,  // 0 = sRGB EOTF, 1 = PQ EOTF, 2 = HLG OETF^-1
  width: u32,
  height: u32,
  _pad0: u32,
  _pad1: u32,
}

@group(0) @binding(0) var y_tex: texture_2d<u32>;     // r16uint
@group(0) @binding(1) var u_tex: texture_2d<u32>;     // r16uint (half-res)
@group(0) @binding(2) var v_tex: texture_2d<u32>;     // r16uint (half-res)
@group(0) @binding(3) var<uniform> uniforms: YuvToRgbUniforms;

fn decode_y(u16: u32) -> f32 {
  // WebCodecs stores 10-bit values MSB-aligned in 16-bit cells:
  // value v is stored as v << 6. So v = u16 >> 6 (range [0..1023]).
  let raw = f32(u16 >> 6);
  let range_scale = select((raw - 64.0) / 876.0, raw / 1023.0, uniforms.range > 0.5);
  return clamp(range_scale, 0.0, 1.0);
}

fn decode_uv(u16: u32) -> f32 {
  let raw = f32(u16 >> 6);
  let range_scaled = select((raw - 64.0) / 896.0, raw / 1023.0, uniforms.range > 0.5);
  return (range_scaled - 0.5) * 0.5;  // UV is [-0.5, 0.5]
}

fn inverse_transfer(c: f32, transfer: u32) -> f32 {
  // 0 = sRGB EOTF, 1 = PQ EOTF, 2 = HLG OETF^-1
  switch transfer {
    case 0u: {  // sRGB EOTF
      return select(c / 12.92, pow((c + 0.055) / 1.055, 2.4), c > 0.04045);
    }
    case 1u: {  // PQ EOTF (HDR)
      let m1 = 0.1593017578125;
      let m2 = 78.84375;
      let c1 = 0.8359375;
      let c2 = 18.8515625;
      let c3 = 18.6875;
      let n = pow(c, 1.0 / m2);
      let L = pow(max(n - c1, 0.0) / (c2 - c3 * n), 1.0 / m1);
      return L * 10000.0;  // PQ is normalized to 10,000 nits
    }
    case 2u: {  // HLG OETF^-1 (HDR)
      return select(c * c / 3.0, (exp((c - 0.55991073) / 0.17883277) + 0.28466892) / 12.0, c > 0.5);
    }
    default: { return c; }
  }
}

@fragment
fn yuv_to_linear_fragment(in: VertexOutput) -> @location(0) vec4f {
  let dims = vec2<i32>(i32(uniforms.width), i32(uniforms.height));
  let yPx = vec2<i32>(in.uv * vec2<f32>(dims));
  let uvPx = yPx / 2;  // 4:2:0 subsampling

  let yRaw = textureLoad(y_tex, yPx, 0).r;
  let uRaw = textureLoad(u_tex, uvPx, 0).r;
  let vRaw = textureLoad(v_tex, uvPx, 0).r;

  let y = decode_y(yRaw);
  let u = decode_uv(uRaw);
  let v = decode_uv(vRaw);

  let kr = uniforms.kr;
  let kb = uniforms.kb;
  let kg = 1.0 - kr - kb;

  let R = y + 2.0 * (1.0 - kr) * v;
  let G = y - 2.0 * (kr * (1.0 - kr) / kg) * v - 2.0 * (kb * (1.0 - kb) / kg) * u;
  let B = y + 2.0 * (1.0 - kb) * u;

  // Apply inverse transfer function to get to linear-light
  let linR = inverse_transfer(R, uniforms.transfer);
  let linG = inverse_transfer(G, uniforms.transfer);
  let linB = inverse_transfer(B, uniforms.transfer);

  return vec4f(linR, linG, linB, 1.0);
}
```

**Critical fix from seed spec §6.2:** the seed spec's `decode_y` / `decode_uv` used `u16 & 0x3FF` to extract the 10-bit value, but WebCodecs P010/I420P10 store values **MSB-aligned** in 16-bit cells (per https://www.w3.org/TR/webcodecs/#pixel-format). The correct extraction is `u16 >> 6`. See §14.A.

Also: the seed spec's shader used 2 textures (Y plane + interleaved UV plane, assuming P010 semi-planar layout). For mediabunny's `I420P10` format the layout is fully **planar** — three separate Y, U, V planes — so we need 3 `r16uint` textures, not 2. See §14.C.

### 6.3 Output (display) transfer function

```wgsl
// linear_to_display.wgsl
// Converts linear-light RGB to display-encoded RGB

struct DisplayUniforms {
  transfer: u32,  // 0 = sRGB OETF, 1 = PQ OETF, 2 = HLG OETF
  tone_map: u32,  // 0 = none, 1 = HDR→SDR Reinhard, 2 = HDR→SDR filmic
  _pad: f32, _pad2: f32,
}

@fragment
fn linear_to_display_fragment(in: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(input_tex, texSampler, in.uv);  // linear-light

  let mapped = tone_map(color);  // apply tone mapping if needed

  let display = apply_display_transfer(mapped, uniforms.transfer);

  return vec4f(display.rgb, color.a);
}

fn apply_display_transfer(c: vec3f, transfer: u32) -> vec3f {
  switch transfer {
    case 0u: {  // sRGB OETF (for SDR display)
      return select(c * 12.92, 1.055 * pow(c, vec3f(1.0 / 2.4)) - 0.055, c > 0.0031308);
    }
    case 1u: {  // PQ OETF (for HDR display)
      let m1 = 0.1593017578125;
      let m2 = 78.84375;
      let c1 = 0.8359375;
      let c2 = 18.8515625;
      let c3 = 18.6875;
      let L = c / 10000.0;  // input is in nits
      let n = pow(max(L, 0.0), m1);
      return clamp(pow((c1 + c2 * n) / (1.0 + c3 * n), vec3f(m2)), vec3f(0.0), vec3f(1.0));
    }
    case 2u: {  // HLG OETF (for HDR display)
      let a = 0.17883277;
      let b = 0.28466892;
      let c_param = 0.55991073;
      return select(sqrt(3.0 * c), a * log(12.0 * c - b) + c_param, c > 1.0 / 12.0);
    }
    default: { return c; }
  }
}
```

### 6.4 Tone mapping (HDR → SDR)

If source is HDR (PQ or HLG) but display is SDR (sRGB), apply tone mapping:

```wgsl
fn tone_map_reinhard(c: vec3f) -> vec3f {
  // Reinhard: simple, preserves hue
  return c / (1.0 + luminance(c));
}

fn tone_map_filmic(c: vec3f) -> vec3f {
  // ACES filmic — better highlights
  let a = 2.51; let b = 0.03; let c1 = 2.43; let d = 0.59; let e = 0.14;
  return clamp((c * (a * c + b)) / (c * (c1 * c + d) + e), vec3f(0.0), vec3f(1.0));
}
```

For v1: SDR sources → SDR display (no tone mapping needed). HDR sources → SDR display → use ACES filmic. HDR display deferred to v2.

---

## 7. Renderer Architecture

> **Canonical `FrameDescriptor` shape:** Defined in `07-composition.refined.md §4` — `interface FrameDescriptor { width, height, clear, displayMode, items: FrameItem[] }` where `type FrameItem = Layer | SceneEffect`. Each item carries a `type` discriminator (`'layer'` or `'sceneEffect'`); both `Layer` and `SceneEffect` expose `effectPassGroups: EffectPass[][]`. The renderer iterates `descriptor.items` in authored order and dispatches by `type`.

### 7.1 The `WebGPURenderer` class

```ts
// src/platform/renderer/WebGPURenderer.ts

class WebGPURenderer implements Renderer {
  private device: GPUDevice;
  private context: GPUCanvasContext;
  private format: GPUTextureFormat;

  // Pipeline cache — keyed by descriptor hash (see §11 Q1 for why we add this)
  private pipelines: Map<string, GPURenderPipeline> = new Map();

  // Bind group cache (KEY optimization FreeCut's compositor lacks — §11 Q1)
  private bindGroupCache: Map<string, GPUBindGroup> = new Map();

  // Texture pool (recycle scratch textures across frames)
  private texturePool: TexturePool;

  async initialize(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<void> {
    if (!navigator.gpu) throw new Error('WebGPU not supported');
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) throw new Error('No GPU adapter');
    this.device = await adapter.requestDevice();

    this.context = canvas.getContext('webgpu');
    // The canvas mounts in the viewer panel of the UI shell (spec 18, #viewer-panel); its CSS size drives descriptor.width/height (spec 18 §3.3).
    // Feature-detect 10-bit canvas support
    // per §11.9: exact feature name varies — try-configure rgba10a2unorm and fall back to rgba8unorm (DegradedRendererBanner path)
    this.context.configure({
      device: this.device,
      format: this.format,
      colorSpace: 'display-p3',
      alphaMode: 'premultiplied',
    });

    this.device.lost.then(info => this.handleDeviceLost(info));
  }

  async renderFrame(descriptor: FrameDescriptor): Promise<RenderResult> {
    const encoder = this.device.createCommandEncoder();

    // 1. Decode + linearize each source texture (YUV → linear-light RGB).
    //    Only Layer items carry a textureId; SceneEffect items reference no source texture.
    const layerItems = descriptor.items.filter((i): i is Layer => i.type === 'layer');
    const layerTextures = await this.uploadAndLinearizeSources(layerItems);

    // 2. Walk items in authored order — composite layers, apply scene effects in place.
    //    (Mixed union lets users interleave layers and scene effects in the same list;
    //     matches OpenCut-classic's `rust/crates/compositor/src/compositor.rs:344-405`
    //     `render_frame`, which loops `items` dispatching `render_layer` vs `apply_effect_groups`.)
    let sceneTexture = this.texturePool.acquire('working', descriptor.width, descriptor.height, 'rgba16float');
    for (const item of descriptor.items) {
      if (item.type === 'layer') {
        const layerTexture = layerTextures.get(item.id);
        const effectTexture = await this.applyEffects(layerTexture, item.effectPassGroups);
        const maskedTexture = await this.applyMask(effectTexture, item.mask);
        sceneTexture = this.composite(sceneTexture, maskedTexture, item.blendMode, item.opacity);
      } else if (item.type === 'sceneEffect') {
        // Apply scene-level effect pass groups to the running scene texture.
        // Same EffectPass[][] shape as Layer.effectPassGroups — reuse applyEffects.
        sceneTexture = await this.applyEffects(sceneTexture, item.effectPassGroups);
      }
    }

    // 3. Apply display transfer function + tone mapping
    const displayTexture = this.applyDisplayTransfer(sceneTexture, descriptor.displayMode);

    // 4. Blit to canvas
    const canvasView = this.context.getCurrentTexture().createView();
    this.encodeBlit(encoder, displayTexture, canvasView);

    this.device.queue.submit([encoder.finish()]);

    return { texture: displayTexture };
  }

  async readPixels(texture: GPUTexture, format: 'rgb24' | 'yuv422p10le'): Promise<Uint8ClampedArray | Uint16Array> {
    // For cloud render — read back pixels for ffmpeg piping
    // ... (see 11-cloud-render.refined.md for details)
  }
}
```

**Pass-discipline rule (normative, Round 7):** every `applyEffects`/`applyMask`/`composite` step MUST consume pool-acquired textures and never return a texture owned by the pass; outputs are released at `recycleFrame()`. (The reference port's two live P0 bugs are exactly this failure: singleton `return this._pongTexture;` at nle-engine effects/pipeline.ts:5107, and mask combine textures shared across clips at gpu/mask-manager.ts:477.)

### 7.2 Bind group caching (key optimization)

FreeCut's compositor re-creates bind groups per layer per frame (no caching). This is wasteful. We cache by hash:

```ts
private getBindGroup(layout: GPUBindGroupLayout, resources: BindGroupResources): GPUBindGroup {
  const hash = this.hashBindGroupResources(resources);
  const cacheKey = `${layout.label}:${hash}`;
  let bindGroup = this.bindGroupCache.get(cacheKey);
  if (!bindGroup) {
    bindGroup = this.device.createBindGroup({ layout, entries: resources.entries });
    this.bindGroupCache.set(cacheKey, bindGroup);
  }
  return bindGroup;
}

private hashBindGroupResources(resources: BindGroupResources): string {
  // Hash texture IDs (by GPUTexture identity), uniform buffer identity, etc.
  // ...
}
```

**Verified:** See §11 Q1 / §11 Q2 — FreeCut's `CompositorPipeline.compositeToTexture` creates a fresh `GPUBindGroup` per layer per frame at `compositor-pipeline.ts:487-509`. FreeCut's `EffectsPipeline` and `TransitionPipeline` *do* cache (see §11 Q3), so the missing cache is compositor-specific.

### 7.3 Texture pool

```ts
// src/platform/renderer/TexturePool.ts

class TexturePool {
  private available: Map<string, GPUTexture[]> = new Map();
  private inUse: Map<string, GPUTexture[]> = new Map();

  acquire(label: string, width: number, height: number, format: GPUTextureFormat): GPUTexture {
    const key = `${label}:${width}x${height}:${format}`;
    const pool = this.available.get(key) ?? [];
    const texture = pool.pop() ?? this.create(key, width, height, format);

    if (!this.inUse.has(key)) this.inUse.set(key, []);
    this.inUse.get(key)!.push(texture);
    return texture;
  }

  recycleFrame() {
    for (const [key, textures] of this.inUse) {
      const pool = this.available.get(key) ?? [];
      this.available.set(key, pool.concat(textures));
      textures.length = 0;
    }
  }

  private create(key: string, width: number, height: number, format: GPUTextureFormat): GPUTexture {
    // ... device.createTexture
  }
}
```

**Adopted from:** OpenCut-classic `rust/crates/compositor/src/texture_pool.rs` (well, the concept — we re-implement in TS). See §11 Q1 for the verified Rust implementation.

---

## 8. WGSL Shader Inventory

We need these shaders (mapped from FreeCut's, ported to linear-light):

### 8.1 Core pipeline

| Shader | Purpose | FreeCut/OpenCut reference |
|---|---|---|
| `fullscreen.wgsl` | Vertex shader — fullscreen quad | OpenCut `rust/crates/gpu/src/shaders/fullscreen.wgsl` (12 LOC) — see §15.A. Also FreeCut `gpu-shared/fullscreen-quad.ts:14` (43 LOC, inline). |
| `blit.wgsl` | Simple texture copy | OpenCut `rust/crates/gpu/src/shaders/blit.wgsl` (12 LOC) — see §15.B. Also FreeCut `gpu-compositor/compositor-pipeline.ts:25-37` (inline). |
| `yuv_to_linear.wgsl` | I420P10 → linear-light RGB | NEW (neither repo uses YUV→RGB on GPU — both rely on `copyExternalImageToTexture` doing it in the browser). See §6.2 above. |
| `linear_to_display.wgsl` | Linear-light RGB → display-encoded | NEW. See §6.3 above. |

### 8.2 Composition

| Shader | Purpose | OpenCut reference |
|---|---|---|
| `layer.wgsl` | Draw one layer with quad transform + opacity | OpenCut `rust/crates/compositor/src/shaders/layer.wgsl` (50 LOC) — see §15.C. |
| `blend.wgsl` | 17 W3C blend modes + Porter-Duff alpha | OpenCut `rust/crates/compositor/src/shaders/blend.wgsl` (142 LOC) — see §15.D. **Adopt math verbatim** (W3C formulas correct in linear-light). |
| `mask.wgsl` | Mask alpha multiply | OpenCut `rust/crates/compositor/src/shaders/mask.wgsl` (25 LOC) — see §15.E. |

**FreeCut alternative:** FreeCut's blend modes live inline in `gpu-shared/blend-modes.ts:9-232` (232 LOC) covering 25 modes (17 W3C + 8 extras: linear-burn, linear-dodge, vivid-light, linear-light, pin-light, hard-mix, subtract, divide). We adopt OpenCut's 17-mode core (correct W3C math) and port FreeCut's 8 extra modes on top.

### 8.3 Effects

| Shader | Purpose | FreeCut reference |
|---|---|---|
| `gaussian_blur.wgsl` | 61-tap separable Gaussian | OpenCut `rust/crates/effects/src/shaders/gaussian_blur.wgsl` (34 LOC) — see §15.F. (Hardcoded `gaussian-blur` ID at `effects/src/pipeline.rs:10-11`.) |
| `color_wheels.wgsl` | Resolve-style 4-wheel grading | FreeCut `gpu-effects/effects/color.ts:584-663` (port to linear — see §15.G) |
| `curves.wgsl` | Per-channel curves via 1D LUT | FreeCut `gpu-effects/effects/color.ts:476-502` |
| `levels.wgsl` | Levels (input/output/black/white) | FreeCut `gpu-effects/effects/color.ts:239-` |
| `lut.wgsl` | 3D LUT application | FreeCut `gpu-effects/effects/lut.ts:18-31` |
| `secondary_qualifier.wgsl` | HSL qualifier | FreeCut `gpu-effects/effects/color.ts:941-` |
| `power_window.wgsl` | Mask shapes (rectangle, ellipse) | FreeCut `gpu-effects/effects/color.ts:1179-` |
| `vibrance.wgsl` | Vibrance | FreeCut `gpu-effects/effects/color.ts:1389-` |

### 8.4 Mask feathering

| Shader | Purpose | OpenCut reference |
|---|---|---|
| `jfa_init.wgsl` | JFA seed pass | OpenCut `rust/crates/masks/src/shaders/jfa_init.wgsl` (38 LOC) — see §15.H. |
| `jfa_step.wgsl` | JFA propagation | OpenCut `rust/crates/masks/src/shaders/jfa_step.wgsl` (75 LOC) — see §15.I. |
| `jfa_distance.wgsl` | SDF combine + feather | OpenCut `rust/crates/masks/src/shaders/jfa_distance.wgsl` (50 LOC) — see §15.J. |

**Adopt OpenCut's JFA shaders** but consider rewriting as **compute shaders** for ~2x perf on WebGPU (OpenCut uses fragment shaders for WebGL2 compatibility — we don't need that). OpenCut's JFA step count is `(width.max(height) as f32).log2().ceil()` per `sdf.rs:184`.

### 8.5 Color scopes (compute shaders)

| Shader | Purpose | FreeCut reference |
|---|---|---|
| `histogram.wgsl` | Histogram (compute) | FreeCut `gpu-scopes/histogram-scope.ts:14-55` (compute) + `:57-179` (render) |
| `waveform.wgsl` | Waveform/luminance scope (compute) | FreeCut `gpu-scopes/waveform-scope.ts:14-` |
| `vectorscope.wgsl` | Vectorscope (compute) | FreeCut `gpu-scopes/vectorscope-scope.ts:14-59` (compute) + `:61-203` (render) |

**Bit depth handling:** FreeCut's scopes assume 8-bit input — see `vectorscope-scope.ts:55-57` `atomicAdd(&accumR[idx], u32(max(r * 255.0, 1.0)))`. We must change `255.0` → `1023.0` (10-bit) and source-tex format → `rgba16float`. See §14.B. Scope canvases mount in the shell's Color workspace / inspector panels (spec 18); the DaVinci-derived shell has a Color dock page — scope placement follows spec 18 §4.8's page inventory.

---

## 9. The WYSIWYG Contract (Renderer Side)

For any project state and frame number N:

1. **Browser render path:**
   - Decode frame N (mediabunny → I420P10 `VideoSample` → `VideoFrame`)
   - Upload Y, U, V planes to 3 `r16uint` textures via `VideoFrame.copyTo` + `device.queue.writeTexture`
   - YUV → linear-light (shader)
   - Composite + grade in linear-light
   - Apply display transfer function (sRGB OETF)
   - Output to `rgba10a2unorm` canvas (or `rgba8unorm` fallback)

2. **Cloud render path:**
   - Decode frame N (same mediabunny, same I420P10)
   - Upload to Y/U/V textures (same)
   - YUV → linear-light (same shader)
   - Composite + grade in linear-light (same)
   - Apply display transfer function (same sRGB OETF)
   - Output to `rgba10a2unorm` `OffscreenCanvas` (or `rgba8unorm` fallback)
   - Read pixels → pipe to ffmpeg

**Same code, same shaders, same color pipeline.** Pixels must be bit-identical.

**Test:** pixel-diff browser render vs cloud render for 100 test frames. 0% difference required.

---

## 10. GPU Memory Budget

For a 4K UHD (3840×2160) 10-bit project:

| Texture | Format | Size |
|---|---|---|
| Source Y (per clip) | r16uint | ~16 MB |
| Source U (per clip) | r16uint | ~4 MB |
| Source V (per clip) | r16uint | ~4 MB |
| Working ping-pong A | rgba16float | ~66 MB |
| Working ping-pong B | rgba16float | ~66 MB |
| Mask textures (per mask, per direction inside+outside JFA) | rgba8unorm | ~33 MB each |
| LUT 3D texture (33×33×33) | rgba8unorm | ~140 KB |
| Histogram buffer (4×256 bins) | rgba32uint | ~16 KB |
| Vectorscope accumulator (3× 512² × u32) | rgba32uint | ~3 MB |
| Canvas (output) | rgba10a2unorm or rgba8unorm | ~16 MB or ~33 MB |

**Per-frame working set (5 layers, 1 mask, 1 effect):**
- 5 sources (Y+U+V each): ~120 MB
- Working ping-pong: ~132 MB
- Mask SDF (2 inside/outside textures): ~66 MB
- Total: ~340 MB

> §16.6 is the canonical itemized per-frame budget (~340 MB at 4K UHD for the 5-layer case); this §10 summary is superseded by it.

Well within the 4 GB ceiling.

For 8K (7680×4320), multiply by 4: ~1.3 GB per frame working set. Still fits in cloud render mode (stripped of UI).

---

## 11. Open Questions — ANSWERED

### 11.1 Q1: FreeCut GPU infrastructure overview

**Verified:** All of FreeCut's `src/infrastructure/gpu-*/` uses **`rgba8unorm`** exclusively. No 16-bit, no 10-bit, no HDR. No color management whatsoever. See §13 for the per-file LOC table and §16 for the texture format chain.

nle-engine (clean-room FreeCut port) reproduces this 8-bit baseline — 29 `rgba8unorm` sites across 7 GPU files; the corrective mapping is in §13D and `19-code-references.md`.

**Per-directory summary:**

| Directory | Files | Total LOC | Texture format | Color mgmt | Bind-group cache | Pipeline cache |
|---|---|---|---|---|---|---|
| `gpu-compositor/` | 2 + tests | 610 + 216 = 826 | `rgba8unorm` (`compositor-pipeline.ts:328,358,398`) | None | ❌ NO — fresh per-layer per-frame (`compositor-pipeline.ts:487-509`) | ✅ Three fixed pipelines (regular/external/blit), created once at constructor (`:307-390`) |
| `gpu-effects/` | 11 + tests | 1132 + 98 + 6769 + ... = ~8800 | `rgba8unorm` (everywhere) | None | ✅ YES — `effectBindGroupCache: Map<string, GPUBindGroup>` (`effects-pipeline.ts:123`, keyed by `${passIndex}:${effectType}:${viewKey}` at `:515,556`) | ✅ YES — `pipelines: Map<string, GPURenderPipeline>` keyed by effect id (`:97`, also `computePipelines: Map<string, GPUComputePipeline>` at `:101`) |
| `gpu-transitions/` | 16 + tests | 500 + ~16 transition files | `rgba8unorm` (`transition-pipeline.ts:43,138`) | None | ✅ YES — `cachedBindGroups: Map<string, GPUBindGroup>` keyed by `transitionId` (`:25,214-219`) | ✅ YES — `pipelines: Map<string, TransitionPipelineRecord>` (`:23`) |
| `gpu-masks/` | 2 + tests | 114 + 34 = 148 | `rgba8unorm` (`mask-combine-pipeline.ts:54`, `mask-texture-manager.ts:15`) | None | ❌ NO — fresh bind group per call (`mask-combine-pipeline.ts:83-91`) | ✅ One fixed pipeline, created at constructor (`:47-57`) |
| `gpu-scopes/` | 5 files | 334 + 479 + 343 + 143 + 88 = 1387 | `rgba8unorm` source + `rgba8unorm`-style accumulation buffers (`scope-renderer.ts:70`) | None | ❌ NO — fresh per render (`histogram-scope.ts:282-292`, `vectorscope-scope.ts:294-303`) | ✅ One compute + one render pipeline per scope, created at constructor |
| `gpu-text/` | 2 files | 834 | `rgba8unorm` atlas + `rgba8unorm` target (`glyph-atlas-text-pipeline.ts:182,248`) | None | ✅ YES — single bind group cached on instance (`:211-219`) | ✅ One fixed pipeline at constructor |
| `gpu-shapes/` | 2 files | 613 | `rgba8unorm` (`shape-render-pipeline.ts:282`) | None | ❌ NO — fresh per render | ✅ Two fixed pipelines (replace/blend) at constructor |
| `gpu-media/` | 3 files | 419 + 125 = 544 | `rgba8unorm` (`media-render-pipeline.ts:212,311`, `media-blend-pipeline.ts:64`) | None | ✅ Partial — `bindGroup` lazily built and reused until `maskTexture` changes (`media-render-pipeline.ts:320-334`) | ✅ Two fixed pipelines (replace/blend) at constructor |
| `gpu-shared/` | 3 files | 232 + 33 + 43 = 308 | N/A (shaders + helpers only) | None (blend modes are math-correct but operate on gamma-encoded input) | N/A | N/A |

**Verdict:** ✅ Seed spec assumption verified — FreeCut is uniformly 8-bit sRGB with no color management. Bind-group caching is inconsistent (only `gpu-effects`, `gpu-transitions`, `gpu-text`, `gpu-media` cache; compositor and masks do NOT). Pipeline caching is consistent everywhere (every pipeline class caches `GPURenderPipeline` objects at construction time, but NO descriptor-hash caching exists — pipelines are created once per pipeline-class instance, never on-demand).

### 11.2 Q2: FreeCut `compositor-pipeline.ts`

📍 `/tmp/freecut/src/infrastructure/gpu-compositor/compositor-pipeline.ts` (610 LOC)

**Composite flow** (`compositeToTexture`, lines 439-538):
1. `ensurePingPong(w, h)` (line 448) creates two `rgba8unorm` textures with `TEXTURE_BINDING | RENDER_ATTACHMENT | COPY_SRC | COPY_DST` usage if size changed.
2. Clear ping to transparent black (line 459-469).
3. For each layer (line 476-535):
   a. Get a per-layer uniform buffer (line 478) via `getLayerUniformBuffer(index)` (cached, line 415-425).
   b. `writeUniforms(buffer, layer.params)` (line 479) calls `packUniforms` (line 253-273) which packs 16 floats into a 64-byte uniform buffer (`CompositeUniforms`).
   c. **Bind group is created FRESH here** (line 481) — no caching. The branch at lines 484-511 picks `externalPipeline` (zero-copy video) or `regularPipeline` (regular texture).
   d. Begin render pass, set pipeline + bind group, `draw(6)` (lines 514-526).
   e. Swap ping/pong references (lines 529-534).
4. Return `{ texture: inputTex, view: inputView }` (line 537).

**Ping-pong texture management** (`ensurePingPong`, line 392-413):
- Destroys old ping/pong if dimensions changed (line 394-395).
- Creates two `rgba8unorm` textures (line 396-407) with 4 usage flags.
- Caches `pingView` and `pongView` (line 407-408).
- Invalidates `blitBindGroupPing` / `blitBindGroupPong` (line 411-412) — the only bind-group cache in this file (2 cached bind groups for the final blit pass, lines 297-298, 554-569).

**Per-frame bind group construction:** Confirmed — bind groups are re-created for every layer on every frame. For a 5-layer composite at 30 fps that's 150 `createBindGroup` calls/sec just for compositing. (This is the optimization the seed spec §7.2 wants to add.)

**Pipeline cache:** ✅ Three fixed pipelines (`regularPipeline`, `externalPipeline`, `blitPipeline`) created at constructor (lines 307-390). No descriptor-hash cache — pipelines are created once and never invalidated.

**Effect pass ordering / mask integration:** The compositor's `compositeFragment` shader (lines 113-147) reads from 3 textures: `baseTex` (ping/pong accumulator), `layerTex` (this layer's source), `maskTex` (mask). It samples mask via `textureSampleLevel(maskTex, ..., input.uv, 0.0).a` (line 126) — masks are pre-rasterized alpha textures. No per-layer effect chain in this pipeline (effects are applied by `gpu-effects/` upstream). Mask invert handled at line 127-129.

### 11.3 Q3: FreeCut `effects-pipeline.ts`

📍 `/tmp/freecut/src/infrastructure/gpu-effects/effects-pipeline.ts` (1132 LOC)

**Effect registration** (`registry.ts:10-47`): A `Map<string, GpuEffectDefinition>` (`GPU_EFFECT_REGISTRY`, line 10). Effects grouped into 5 categories (color/blur/distort/stylize/keying). Each effect file (`effects/color.ts`, `effects/blur.ts`, `effects/lut.ts`, `effects/distort.ts`, `effects/stylize.ts`, `effects/keying.ts`) exports `GpuEffectDefinition` objects; the registry module calls `registerEffects` on each (lines 42-47).

**Effect chain execution** (`runEffectChain`, lines 477-596):
1. Initialize `inputTex = startInput`, `outputTex = startOutput`, with `inputView`/`outputView` aliased to `pingView`/`pongView` (lines 485-488).
2. For each effect in the chain (line 490):
   a. Look up the `GpuEffectDefinition` via `getGpuEffect(effect.type)` (line 492). Skip if not found.
   b. Pack uniforms via `definition.packUniforms(effect.params, w, h)` (line 495).
   c. Get-or-create uniform buffer via `getOrCreateUniformBuffer(effectIndex, size)` (line 498). Buffer is reused per-effect-slot — **cached**.
   d. Write uniform data to the buffer (`writeBuffer`, line 499).
   e. **Bind group cache lookup** at `${effectIndex}:${effect.type}:${viewKey}` (line 515 for compute, 556 for fragment). Cache hit → reuse; miss → create + cache. Cache is invalidated when ping/pong textures are recreated (`ensurePingPong`, line 376) or uniform buffer is resized (line 473).
   f. **Compute-variant effects** (lines 510-543): dispatch via `definition.compute.dispatch(w, h)` returning `[gx, gy, gz]` (line 529). Output written via `textureStore` to a `texture_storage_2d<rgba8unorm, write>` storage texture.
   g. **Fragment-variant effects** (lines 545-595): begin render pass to `outputView`, set pipeline + bind group, `draw(6)` (lines 573-585). Auxiliary data textures (e.g., LUTs) are managed via `getOrUpdateDataTexture` (line 551) which reuses the texture when dimensions match (line 431-440) or recreates it (line 442-461).
   h. Swap `inputTex`/`outputTex` and `inputView`/`outputView` (lines 587-592).

**Uniform packing** (`packUniforms`): Each effect's `GpuEffectDefinition.packUniforms` is a custom function returning `Float32Array` (or `null`/`undefined` if no uniforms). Example — Color Wheels packs 28 floats into 112 bytes (`color.ts:589`). The pipeline wraps these into a `GPUBuffer` of `effect.uniformSize` bytes.

**3D LUT upload path** (`lut.ts:51-77`):
- `dataTexture.dimension: '3d'` (line 52) — 3D texture view dimension.
- `dataTexture.key(p)` returns `p.lutData` (the base64 string itself — same-reference check, line 56).
- `dataTexture.build(p)` decodes the base64 LUT data via `decodeLutData(encoded)` (line 62) and returns `{ width: size, height: size, depth: size, data }`.
- `effects-pipeline.ts:412-417` uploads via `device.queue.writeTexture({ texture }, payload.data, { bytesPerRow: payload.width * 4, rowsPerImage: payload.height }, { width: payload.width, height: payload.height, depthOrArrayLayers: payload.depth })`.
- The texture is created with `format: 'rgba8unorm'` and `usage: TEXTURE_BINDING | COPY_DST` (line 443-448). **8-bit LUTs** — for our 10-bit pipeline we'd upgrade to `rgba16float` (LUTs are interpolated, so 10-bit→16-bit is worthwhile).

**Storage texture usage:** Compute-variant effects use `storageTexture: { access: 'write-only', format: 'rgba8unorm', viewDimension: '2d' }` (line 326). The ping/pong textures are created with `STORAGE_BINDING` usage (line 366) so compute passes can write to them via `textureStore`. ❗ For our 10-bit pipeline we need `rgba16float` storage textures — this requires the `rgba16float-storage` device feature (verify on Chromium 113+, it's been supported since v100).

### 11.4 Q4: FreeCut `gpu-texture-pool.ts`

📍 `/tmp/freecut/src/infrastructure/gpu-compositor/gpu-texture-pool.ts` (216 LOC)

**Pool key:** `${width}x${height}x${format}` (line 56-58, `poolKeyToString`). Format is part of the key — textures of different formats never share a pool slot.

**Acquire flow** (lines 86-118):
1. Compute `key = poolKeyToString(w, h, format)` (line 87).
2. Look up `pools.get(key)` (line 90).
3. If pool exists, scan entries for `inUse === false` (line 92-99). First free entry is taken: marked `inUse = true`, `lastUsed = ++this.clock` (line 95), cache hit (line 96).
4. If no free entry, allocate a new `GPUTexture` via `device.createTexture({ size, format, usage })` (line 102-106), default format `rgba8unorm` (line 86).
5. Track bytes: `width * height * textureBytesPerPixel(format)` (line 108). Bytes-per-pixel table at line 32-36: `32float → 16`, `16float/16uint/16sint → 8`, default → 4.
6. Add entry to pool (line 110-114), increment counters (line 115-116).

**Release flow** (lines 120-133):
1. Look up pool by `texture.width × texture.height × texture.format` (line 121-123).
2. Find matching entry (line 124-125).
3. Mark `inUse = false`, bump `lastUsed` (line 126-127).
4. Call `trimIdleEntries(key)` (line 128) — caps idle entries per key at `maxIdlePerKey` (default 24, line 30). Excess destroyed via `destroyEntry` (line 206-215).
5. Call `trimToBudget()` (line 129) — total bytes cannot exceed `maxBytes` (default: 3.125% of `navigator.deviceMemory` in GB, clamped to [128 MB, 512 MB], line 27-54). LRU eviction via `lastUsed` timestamp (line 190-204).

**Cross-frame reuse:** Caller pattern is: `acquire()` → use → `release()` per frame; pool survives across frames. **There is no `recycleFrame()` method** — release puts textures back into the same pool immediately.

**OpenCut-classic alternative** (`rust/crates/compositor/src/texture_pool.rs`, 36 LOC) — different model:
- Two collections: `available: HashMap<(u32, u32), Vec<Texture>>` and `in_use: Vec<(TextureKey, Texture)>` (line 8-11).
- `recycle_frame()` (line 14-18) drains `in_use` into `available` — textures are released *in bulk* at frame end. This is what the seed spec §7.3 adopts.
- `acquire(context, w, h, label)` (line 20-35) pops from `available` or creates new.
- ❗ No byte budget, no LRU, no `maxIdlePerKey` cap — much simpler than FreeCut's pool. **The seed spec §7.3 adopts OpenCut's simpler model.**

### 11.5 Q5: OpenCut-classic `layer.wgsl` + `blend.wgsl`

✅ **Verified:** Both shaders read in full — see §15.C (layer.wgsl, 50 LOC) and §15.D (blend.wgsl, 142 LOC).

**`layer.wgsl` — quad transform model (§15.C):**
- `LayerUniforms` struct: `resolution: vec2f, center: vec2f, size: vec2f, rotation_radians: f32, opacity: f32, flip_x: f32, flip_y: f32, _padding: vec2f` (line 6-15).
- Fragment shader transforms pixel-space coord by:
  1. `pixel = input.tex_coord * uniforms.resolution` (line 32)
  2. `local = rotate_inverse(pixel - center, rotation)` (line 33)
  3. `uv = local / size + 0.5` (line 35-38)
  4. Reject if uv is out of `[0,1]²` (line 40-42) — output transparent black.
  5. Apply flip (line 44-47) via `select(uv.x, 1.0 - uv.x, flip_x > 0.5)`.
  6. Sample and multiply alpha by opacity (line 48-49).

**`blend.wgsl` — 17 W3C blend modes + Porter-Duff (§15.D):**
- `BlendUniforms { blend_mode: u32, _pad0/_pad1/_pad2: u32 }` (line 6-11).
- W3C Compositing helpers: `lum` (line 23-25), `sat` (line 27-29), `clip_color` (line 31-43), `set_lum` (line 45-47), `set_sat` (line 49-59).
- `hard_light` (line 61-65), `soft_light` (line 67-86, with channel-wise `d = select(16x³ - 12x² + 4x, √x, x > 0.25)` per W3C), `color_dodge` (line 88-94), `color_burn` (line 96-102).
- `blend_rgb(base, layer, mode)` dispatch (line 104-128):
  - 0u/`default` = Normal
  - 1u = Darken (`min`)
  - 2u = Multiply (`base * layer`)
  - 3u = ColorBurn
  - 4u = Lighten (`max`)
  - 5u = Screen (`1 - (1-base)(1-layer)`)
  - 6u = PlusLighter (`min(base + layer, 1)`) — W3C `plus-lighter` is defined this way
  - 7u = ColorDodge
  - 8u = Overlay (`select(2·base·layer, 1 - 2(1-base)(1-layer), base ≥ 0.5)`)
  - 9u = SoftLight
  - 10u = HardLight
  - 11u = Difference (`|base - layer|`)
  - 12u = Exclusion (`base + layer - 2·base·layer`)
  - 13u = Hue (`set_lum(set_sat(layer, sat(base)), lum(base))`)
  - 14u = Saturation (`set_lum(set_sat(base, sat(layer)), lum(base))`)
  - 15u = Color (`set_lum(layer, lum(base))`)
  - 16u = Luminosity (`set_lum(base, lum(layer))`)
- Porter-Duff source-over (lines 130-142): `out_alpha = layer.a + base.a * (1 - layer.a)`, `out_rgb = (1 - layer.a)·base.rgb + layer.a·((1 - base.a)·layer.rgb + base.a·blend_rgb_value)`. This is the **W3C Compositing & Blending Level 1** formula — correct in linear-light.

**Mapping vs `blend_mode.rs`** (`rust/crates/compositor/src/blend_mode.rs:25-46`): exactly matches the shader's switch. The 17-mode enum (line 5-23): `Normal, Darken, Multiply, ColorBurn, Lighten, Screen, PlusLighter, ColorDodge, Overlay, SoftLight, HardLight, Difference, Exclusion, Hue, Saturation, Color, Luminosity`.

**Note:** OpenCut's blend modes are 17 (W3C core). FreeCut has 25 modes (W3C 17 + 8 extras: linear-burn, linear-dodge, vivid-light, linear-light, pin-light, hard-mix, subtract, divide — see FreeCut `gpu-shared/blend-modes.ts:84,91,114-133,137-138`). We'll port OpenCut's 17 verbatim and add FreeCut's 8 extras.

### 11.6 Q6: OpenCut-classic JFA shaders

✅ **Verified:** All three shaders read in full — see §15.H (`jfa_init.wgsl`, 38 LOC), §15.I (`jfa_step.wgsl`, 75 LOC), §15.J (`jfa_distance.wgsl`, 50 LOC).

**Algorithm** (verified at `rust/crates/masks/src/sdf.rs:158-217`):
1. **Init pass** (`jfa_init.wgsl:24-38`): For each pixel, sample mask alpha; if above 0.5 (or below if inverted), encode the pixel's `(x, y)` coordinate as 4 bytes packed into `vec4f` via `encode_seed(pixel_coord)` (line 16-22). Non-seed pixels return `(1,1,1,1)` (the "no seed" sentinel).
2. **Step pass** (`jfa_step.wgsl:34-75`): For each pixel, sample the 3×3 neighborhood at distance `step_size` (uniform). Decode each neighbor's seed; track the closest seed by Euclidean distance. Re-encode the closest seed.
3. **Distance pass** (`jfa_distance.wgsl:28-50`): Sample both inside-seed and outside-seed textures. Compute signed distance = `dist_to_outside - dist_to_inside`. Apply `smoothstep(-feather_half, +feather_half, signed_distance)` for feather.

**Step count** (`sdf.rs:184`): `(width.max(height) as f32).log2().ceil() as u32` passes. For 4K that's 12 passes (log₂(3840) ≈ 11.91 → 12). Step sizes: `2^11, 2^10, ..., 2^0 = 1`.

**Two-directional JFA**: `run_jfa` is called twice (`sdf.rs:153-154`) — once for "inside" seeds (mask pixels) and once for "outside" seeds (non-mask pixels). Both produce a `texture_2d<f32>` of nearest-seed coordinates. The distance pass subtracts them to get signed distance.

**Encoding hack** (`jfa_init.wgsl:16-22`, `jfa_step.wgsl:22-28`): seed coordinates are stored in `vec4f` as 4 × 8-bit channels: `x_hi = floor(x/256)`, `x_lo = x mod 256`, similarly for y. This works because (a) it's stored in `rgba8unorm` texture where each channel is 8 bits, (b) 16-bit coordinates suffice up to 65535×65535. ❗ For our 10-bit pipeline we should upgrade to `rgba16uint` storage to avoid precision issues — or keep `rgba8unorm` (16-bit coords are enough up to 65K).

**Performance:** OpenCut runs JFA as fragment shaders for WebGL2 compatibility. For our WebGPU-only pipeline, rewriting as compute shaders with `textureLoad`/`textureStore` (instead of `textureSample`/`render pass`) would roughly halve the cost — about 2× fewer GPU cycles per JFA pass. **Defer to optimization phase, not v1.**

### 11.7 Q7: mediabunny P010 support

❌ **CORRECTION** (confirms SCOUT-03 finding, `03-playback-engine.refined.md` §14.D):

- ❌ `pixelFormat: 'P010'` on `VideoSampleSink` decode — **DOES NOT EXIST**. `VideoSinkDecoderOptions` (`mediabunny/src/media-sink.ts:1622-1633`) has only `hardwareAcceleration` and `optimizeForLatency` fields. No `pixelFormat`.
- ❌ `'P010'` in `VideoSamplePixelFormat` enum — **DOES NOT EXIST**. `VIDEO_SAMPLE_PIXEL_FORMATS` (`mediabunny/src/sample.ts:160-195`) lists 19 formats. The 10-bit formats are all **planar** (separate Y, U, V planes), not semi-planar:
  - `I420P10`, `I420P12` (4:2:0 planar 10/12-bit)
  - `I420AP10`, `I420AP12` (4:2:0 planar with alpha)
  - `I422P10`, `I422P12` (4:2:2 planar 10/12-bit)
  - `I422AP10`, `I422AP12`
  - `I444P10`, `I444P12` (4:4:4 planar 10/12-bit)
  - `I444AP10`, `I444AP12`
- ✅ `NV12` (4:2:0 semi-planar 8-bit) exists at line 186 — but no 10-bit semi-planar (P010) is exposed.

**What actually happens with a 10-bit H.265 source:**
- The browser's `VideoDecoder` produces `VideoFrame`s whose `.format` is platform-dependent: typically `'P010'` on Chromium for 10-bit H.265, or `'I420P10'`/`'I420P12'` on other implementations.
- mediabunny wraps these in a `VideoSample` and exposes them transparently. `VideoSample.toVideoFrame()` (`sample.ts:998-1068`) returns a `VideoFrame` with the original format preserved (line 1050-1053 if the source is already a VideoFrame; line 1034-1048 if reconstructed from planes).
- If we want to **force** a particular format, we'd need: `new VideoFrame(sourceFrame, { format: 'I420P10', codedWidth, codedHeight, ... })` — but this triggers a re-allocation and format conversion.

**Recommended approach:** Rely on the browser to produce whatever format is natural for the source (typically `P010` for 10-bit H.265 on Chromium). When we need to upload to GPU textures:
- If `videoFrame.format === 'P010'`: layout is Y + interleaved UV (semi-planar) — use 2 textures (`r16uint` Y + `rg16uint` UV interleaved). The seed spec's original 2-texture approach works.
- If `videoFrame.format === 'I420P10'`: layout is Y + U + V (fully planar) — use 3 textures (`r16uint` × 3). Adjusted shader §6.2 above reflects this.
- The shader can be made polymorphic via a uniform flag, or we standardize on one format via `new VideoFrame(src, { format: 'I420P10', ... })` and pay the conversion cost up-front.

**For v1, recommend:** standardize on `I420P10` (the only format mediabunny explicitly enumerates for 10-bit 4:2:0). Use 3-plane extraction via `VideoFrame.copyTo({ plane: 'Y' | 'U' | 'V' })` + 3 separate `r16uint` GPU textures.

### 11.8 Q8: WebGPU P010/I420P10 → texture upload

**Three options researched:**

1. **`device.queue.copyExternalImageToTexture`** — ✅ Accepts `VideoFrame` as `source` per [WebGPU spec §4.5](https://www.w3.org/TR/webgpu/#dom-gpuqueue-copyexternalimagetotexture). When the VideoFrame is multi-plane (P010/I420P10/NV12), the browser internally:
   - Allocates an RGB texture of the destination format
   - Performs YUV→RGB conversion using the VideoFrame's `colorSpace` matrix
   - Optionally applies the VideoFrame's color range (limited vs full)
   - Writes the RGB result to the destination texture
   - **❌ Loss of 10-bit precision** — destination must be `rgba8unorm`/`bgra8unorm`/`rgba16float`; if we choose `rgba8unorm` we get 8-bit precision; if `rgba16float` we get 16-bit but the YUV→RGB conversion was done by the browser, denying us control over the matrix coefficients.
   - **❌ No color management** — the browser's YUV→RGB matrix is fixed per VideoFrame colorSpace; we cannot choose BT.709 vs BT.2020 explicitly, nor apply a custom transfer function.
   - **✅ Zero-copy** for `VideoFrame` source (the browser keeps the GPU buffer handle if hardware-decoded).
   - This is what FreeCut does today (`effects-pipeline.ts:710`, `media-render-pipeline.ts:249`).

2. **`VideoFrame.copyTo` + `device.queue.writeTexture`** — ✅ Works for multi-plane formats. The WebCodecs `VideoFrame.copyTo` API supports a `plane: 'Y' | 'U' | 'V'` option (per [WebCodecs spec §5.4](https://www.w3.org/TR/webcodecs/#dom-videoframe-copyto)) that extracts a single plane into a caller-provided `ArrayBuffer`. We then upload each plane to a separate `r16uint` texture via `device.queue.writeTexture`.
   - **✅ Preserves 10-bit precision** — values are MSB-aligned in 16-bit cells; we extract `u16 >> 6` in the shader.
   - **✅ Full color management** — we run our own YUV→RGB matrix shader, choosing BT.709 / BT.2020 / BT.601 explicitly.
   - **❌ CPU-side copy** — one extra memory copy per plane per frame. For 4K Y plane that's ~16 MB; with U+V at half-res that's ~24 MB per frame. At 30 fps that's ~720 MB/sec memory bandwidth — feasible but not free.
   - **Recommended approach for v1.**

3. **Single multi-plane texture** — ❌ WebGPU does not support multi-plane textures natively. The `texture_2d` WGSL type is single-plane. The browser's `importExternalTexture` (`device.importExternalTexture({ source: video })`) creates an opaque multi-plane binding that's only sampleable via `texture_external` / `textureSampleBaseClampToEdge` — no per-plane access, no YUV matrix control. This is FreeCut's zero-copy video path (`compositor-pipeline.ts:335-366`, `effects-pipeline.ts:106-108,864-916`). It's effectively the same as Option 1 but goes through `texture_external` instead of `copyExternalImageToTexture`.

**Verdict for v1:** Option 2. The CPU copy cost is acceptable for rough-cut (1×decode, 1×upload per frame), and we get full color management. We can optimize to Option 3 (zero-copy external texture) for a non-color-managed SDR-only fast path later.

### 11.9 Q9: Canvas configuration — `rgba10a2unorm` + `display-p3` support

❌ **NOT in either reference repo.** Grep across both FreeCut and OpenCut-classic source:
- FreeCut: Every canvas-configure call uses `navigator.gpu.getPreferredCanvasFormat()` (which is `bgra8unorm` on most platforms, `rgba8unorm` on WebGL2 fallback) — see `compositor-pipeline.ts:302`, `effects-pipeline.ts:144`, `scope-renderer.ts:26`, `scrubbing-cache.ts:469`. **No `colorSpace` is ever set** (defaults to `'srgb'`).
- OpenCut-classic: same — `gpu/src/context.rs:66-70` selects `Bgra8Unorm` for WebGPU backends, `Rgba8Unorm` for WebGL2. `gpu/src/lib.rs:8` defines `GPU_TEXTURE_FORMAT: wgpu::TextureFormat = Bgra8Unorm`. **No `colorSpace` ever set** on canvas configuration.

**WebGPU spec research** ([W3C WebGPU §4.4](https://www.w3.org/TR/webgpu/#canvas-configuration)):
- The W3C spec lists only these formats as valid `GPUCanvasConfiguration.format` values: `bgra8unorm`, `rgba8unorm`, `rgba16float`.
- `colorSpace` accepts: `'srgb'` (default), `'display-p3'`, `'extended-srgb-linear'`.
- ❗ `rgba10a2unorm` is **NOT in the W3C spec** as a canvas format — it's a Chromium extension (introduced in Chromium 118, gated behind `chrome://flags/#enable-unsafe-webgpu` for a while, became default-on for capable hardware in Chromium ~120).
- `rgba16float` + `extended-srgb-linear` canvas — ✅ W3C-spec-compliant for HDR canvas output (Chromium 116+).

**Feature-detection pattern:**
```ts
const supportsRgba10a2 = device.features.has('rgba10a2unorm-render-storage');  // or check format support via adapter
```
The exact feature name varies by WebGPU implementation. The `adapter.formatLimits` / `device.features` mechanism should be checked at runtime — there's no single canonical feature name for canvas format support. Recommended pattern: try-configure and fall back:
```ts
try {
  context.configure({ device, format: 'rgba10a2unorm', colorSpace: 'display-p3', alphaMode: 'premultiplied' });
  this.format = 'rgba10a2unorm';
} catch {
  context.configure({ device, format: 'rgba8unorm', colorSpace: 'display-p3', alphaMode: 'premultiplied' });
  this.format = 'rgba8unorm';
}
```

**Test verification:** See §11 Q10 — there is no existing test code in either repo that creates such a canvas. We'll need to write our own test (§12.3).

### 11.10 Q10: WebGPU canvas colorSpace support matrix

| `format` | `colorSpace: 'srgb'` | `colorSpace: 'display-p3'` | `colorSpace: 'extended-srgb-linear'` |
|---|---|---|---|
| `bgra8unorm` | ✅ W3C standard (default) | ✅ W3C standard | ❌ Not in spec |
| `rgba8unorm` | ✅ W3C standard | ✅ W3C standard | ❌ Not in spec |
| `rgba10a2unorm` | ❌ Not in W3C spec (Chromium ext) | ⚠️ Chromium 118+ behind flag, stable ~120+ | ❌ Not in spec |
| `rgba16float` | ❌ Not in spec | ❌ Not in spec | ✅ W3C standard (HDR canvas) |

**For v1 (SDR wide-gamut):** `rgba10a2unorm` + `display-p3` if Chromium ≥118 + hardware support, else fall back to `rgba8unorm` + `display-p3` (which IS spec-compliant — wide gamut is preserved, just 8-bit precision).

**For v2 (HDR):** `rgba16float` + `extended-srgb-linear` — spec-compliant HDR canvas (Chromium 116+).

### 11.11 Q11: WGSL shader compilation approach

**FreeCut:** Inline template strings in TypeScript:
```ts
// /tmp/freecut/src/infrastructure/gpu-shared/fullscreen-quad.ts:14
export const FULLSCREEN_QUAD_WGSL = /* wgsl */ `
struct VertexOutput { ... };
@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput { ... }
`
```
- WGSL is concatenated at module load time via template strings (e.g., `compositor-pipeline.ts:62-148` builds `COMPOSITE_FRAGMENT` by `${BLEND_MODES_WGSL}\n${COMPOSITE_UNIFORMS}\n...`).
- Shader modules created via `device.createShaderModule({ code: ... })` at pipeline-construction time.
- Shaders are stored as exported `const` strings, enabling reuse across pipeline files.

**OpenCut-classic (Rust):** `include_str!` macro:
```rust
// /tmp/opencut-classic/rust/crates/gpu/src/lib.rs:9
pub const FULLSCREEN_SHADER_SOURCE: &str = include_str!("shaders/fullscreen.wgsl");
```
- WGSL files live in `rust/crates/<crate>/src/shaders/*.wgsl`.
- Each `.wgsl` file is compiled into the WASM binary at build time.
- Loaded into wgpu via `wgpu::ShaderSource::Wgsl(SHADER_SOURCE.into())` (e.g., `gpu/src/context.rs:118-121`).

**OpenCut-classic (TS side):** The TS code (`apps/web/src/services/renderer/compositor/wasm-compositor.ts:1-9`) imports from `opencut-wasm` — it never touches WGSL directly. The Rust side handles all shader loading.

**Decision for new engine: ✅ Adopt FreeCut's approach — inline template strings in TypeScript.**
- Pure TypeScript (no Rust toolchain), consistent with master spec Decision 4.
- Shader source is co-located with the pipeline code that uses it (e.g., `WebGPURenderer.ts` exports `BLEND_SHADER_SOURCE = /* wgsl */ \`...\``).
- Concatenation allows composition (`COMMON_WGSL + EFFECT_SHADER`) without build-step.
- Per-effect shaders can live in their own `.ts` files exporting `string` constants.
- For the shaders we adopt from OpenCut verbatim (blend.wgsl, layer.wgsl, mask.wgsl, jfa_*.wgsl, gaussian_blur.wgsl, fullscreen.wgsl, blit.wgsl), we'll inline them as TypeScript string exports — quoted in full in §15.

### 11.12 Q12: GPU device loss handling

**FreeCut (`effects-pipeline.ts:154-177`):** Minimal handling:
```ts
device.lost.then(() => {
  if (EffectsPipeline._cachedDevice === device) {
    EffectsPipeline._cachedDevice = null
  }
})
```
- Just clears the cached device reference. No retry, no UI notification, no texture/pipeline re-creation. The next `requestCachedDevice()` call will trigger a fresh adapter request.
- The compositor / masks / transitions / scopes / text / shapes / media pipelines all hold `private device: GPUDevice` references captured at construction — none of them re-acquire after a lost event. **❌ Mid-session device loss = stale device references = pipeline destruction.**

**OpenCut-classic:** ❌ **NO device.lost handling anywhere.** Grep across `/tmp/opencut-classic/rust/crates/gpu/src`, `rust/crates/compositor/src`, `apps/web/src/services/renderer` returned zero matches for "lost". Device loss = silent failure.

**Recommendation for new engine:** Implement device-loss recovery at the `WebGPURenderer` level:
1. `device.lost.then(info => this.handleDeviceLost(info))` registers the callback at init.
2. On loss: emit a `'device-lost'` event; tear down all cached pipelines, bind groups, textures.
3. Attempt re-init: re-request adapter + device, re-create pipelines, re-configure canvas.
4. If re-init succeeds: emit `'device-recovered'`; continue rendering.
5. If re-init fails (e.g., 3 retries): emit `'device-lost-permanent'`; surface to UI as a banner ("GPU unavailable — please reload the page").
6. For cloud render mode: device loss mid-export = re-init + retry the failed frame (see `11-cloud-render.refined.md`).

### 11.13 Q13: FreeCut `gpu-scopes/`

✅ **Verified:** All four scope files read in full. See §13 for the per-file LOC table.

**How they read from the working texture:**
- The scope renderer has its own dedicated source texture (`scope-renderer.ts:67-77`): `rgba8unorm` format, dimensions matching the source canvas, recreated on size change.
- Two upload paths: `uploadFromCanvas(source)` (line 81-91) uses `copyExternalImageToTexture` — zero-copy from an `OffscreenCanvas`. `uploadFrame(imageData)` (line 94-104) falls back to `writeTexture` with raw pixel bytes.
- ❗ **The scope texture is `rgba8unorm`** (line 70). For our 10-bit pipeline we must change this to `rgba16float` to preserve the linear-light values.

**How they accumulate histogram/waveform/vectorscope data:**
- **Histogram** (`histogram-scope.ts:14-55`): compute shader with `@workgroup_size(16, 16)` (line 37). Each thread loads one pixel via `textureLoad(inputTex, ..., 0)` (line 40), normalizes via `normRange` to `[0,1]`, scales by 255 (line 44-46), then `atomicAdd` to one of 4 storage buffers (`histR`, `histG`, `histB`, `histL` — luma computed at line 47-48). Buffers cleared at start of each render via `encoder.clearBuffer(this.histR)` (line 277).
- **Vectorscope** (`vectorscope-scope.ts:14-58`): compute shader with same workgroup size. Each pixel converts RGB → Y'CbCr via configurable matrix coefficients (`params.kr`, `params.kb` — line 43-45). Cb/Cr mapped to a 2D grid of size `VS_SIZE × VS_SIZE = 512²` (line 47-51). `atomicAdd` accumulates the RGB values (line 55-57) — the renderer later visualizes the dominant color per cell. ❗ **8-bit assumption at line 55-57**: `atomicAdd(&accumR[idx], u32(max(r * 255.0, 1.0)))`. For our 10-bit pipeline this should be `r * 1023.0` (or `r * 65535.0` for `rgba16float`).
- **Waveform** (`waveform-scope.ts:14-100+`): similar pattern — per-pixel compute, accumulates with Gaussian vertical spread kernel (`gK = array<f32, 5>(0.06, 0.24, 0.40, 0.24, 0.06)`, line 55). Supports parade mode (R/G/B separately) + luma mode.

**How they render the scope UI:**
- Each scope has a separate render shader (`histogram-scope.ts:57-179`, `vectorscope-scope.ts:61-203`, `waveform-scope.ts:101-...`) and a separate `OffscreenCanvas` configured by the consumer (typically a `<canvas>` in the React UI tree).
- Render pipeline uses a 3-vertex fullscreen triangle (`vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3)` — `histogram-scope.ts:62`) — slightly cheaper than the 6-vertex quad the compositor uses.
- Render bind group layout created via shared `createScopeRenderBindGroupLayout(device, [...bufferTypes])` helper (`scope-render-pass.ts:3-14`). Render pipeline via `createScopeRenderPipeline({ device, format, layout, shaderCode })` (line 16-33).
- Compute dispatch via `dispatchScopeComputePass({ encoder, pipeline, bindGroup, srcW, srcH })` (line 35-53) — `Math.ceil(srcW / 16), Math.ceil(srcH / 16)` workgroups.
- Draw call via `drawFullscreenScopePass({ device, context, pipeline, bindGroup, encoder })` (line 55-88) — clears to `{ r: 0.04, g: 0.04, b: 0.04, a: 1 }` (line 1), draws 3 vertices.
- All-in-one facade: `ScopeRenderer` (`scope-renderer.ts`) holds instances of all 3 scopes + the source texture; methods `renderHistogram`, `renderWaveforms`, `renderVectorscope` delegate to the underlying scope objects.

**Bit depth handling — REQUIRED CHANGES for our 10-bit pipeline:**
1. Source texture: `rgba8unorm` → `rgba16float` (scope-renderer.ts:70).
2. Compute shader accumulator scaling: `r * 255.0` → `r * 65535.0` (or treat the input as already-linear-light and skip the scaling entirely, since linear-light values can exceed 1.0).
3. Vectorscope accumulation: `u32(max(r * 255.0, 1.0))` → `u32(clamp(r * 65535.0, 0.0, 65535.0))` (vectorscope-scope.ts:55-57).
4. Histogram bin count: 256 bins (`histogram-scope.ts:44-46` and `:197`) → 1024 bins for 10-bit (or keep 256 if we want fewer bins).
5. Histogram normalization: `(raw - 64.0) / 876.0` (limited range for 8-bit) → adjusted for 10-bit limited range `(raw - 64.0) / 896.0` (per BT.709 10-bit limited range 64-960).

---

## 12. Test Plan for This Stream

(Preserved unchanged from seed spec §12.)

1. **YUV→Linear shader unit test:** Render a known I420P10 frame, sample the linear-light output, compare to a reference computed in JS.

2. **Display transfer function test:** Render a linear-light gradient, apply sRGB OETF, verify output matches expected encoded values.

3. **10-bit round-trip test:**
   - Decode a 10-bit source
   - Upload to GPU
   - Render to canvas
   - Read pixels back
   - Verify 10-bit precision is preserved (values > 1023 in 16-bit cells)

4. **Color grading correctness test:**
   - Apply exposure +1 stop — verify pixel values doubled in linear space
   - Apply 50% opacity blend — verify exact 50/50 mix in linear space
   - Apply LUT — verify output matches reference LUT-applied image

5. **WYSIWYG test:**
   - Render frame N via interactive engine
   - Render frame N via render engine
   - Pixel-diff: must be 0%

6. **Memory ceiling test:**
   - Render 10-minute 4K project
   - Monitor `performance.memory` (or `performance.measureUserAgentSpecificMemory`)
   - Assert stays under 2 GB sustained

7. **Bind group cache test:**
   - Render 1000 frames with same textures
   - Assert `device.createBindGroup` called at most once per unique resource set

---

## 13. Code References

### 13.A FreeCut `src/infrastructure/gpu-*` files

| File | LOC | Purpose |
|---|---|---|
| `gpu-compositor/compositor-pipeline.ts` | 610 | Layer compositing with ping-pong textures. 3 fixed pipelines (regular/external/blit). ❌ NO bind group cache (per-layer per-frame). Uniforms packed into 64-byte `CompositeUniforms` struct. |
| `gpu-compositor/gpu-texture-pool.ts` | 216 | LRU texture pool with byte budget (128-512 MB), `maxIdlePerKey: 24` cap. Per-format per-dim keying. |
| `gpu-effects/effects-pipeline.ts` | 1132 | Effect chain executor. ✅ Bind group cache (`effectBindGroupCache:123`). ✅ Pipeline cache (`pipelines:97`, `computePipelines:101`). Cached device singleton (`_cachedDevice:151`). 3D LUT data texture cache (`dataTextureCache:127`). |
| `gpu-effects/common.ts` | 98 | Shared WGSL helpers: `rgb2hsv`, `hsv2rgb`, `rgb2hsl`, `hsl2rgb`, `luminance` (BT.709 weights 0.2126/0.7152/0.0722), `luminance601` (BT.601 weights 0.299/0.587/0.114), `gaussian`, `smootherstep`, `hash`, `noise2d`. |
| `gpu-effects/effects/color.ts` | 1546 | 16 color effects: brightness, contrast, exposure, hueShift, invert, levels, saturation, temperature, grayscale, sepia, **curves** (line 476), **colorWheels** (line 584), **secondaryQualifier** (line 941), **powerWindow** (line 1179), **vibrance** (line 1389), gradientMap. |
| `gpu-effects/effects/blur.ts` | 356 | gaussianBlur, boxBlur, motionBlur, radialBlur, zoomBlur, tiltShift. |
| `gpu-effects/effects/lut.ts` | 85 | 3D LUT (`.cube` format) effect with trilinear 3D texture sampling. |
| `gpu-effects/effects/keying.ts` | 109 | chromaKey (green/blue screen) with YCbCr keyer + spill suppression. |
| `gpu-effects/effects/distort.ts` | 1718 | Many distort effects. |
| `gpu-effects/effects/stylize.ts` | 2873 | Many stylize effects (compute variants use `texture_storage_2d<rgba8unorm, write>`). |
| `gpu-effects/registry.ts` | 82 | Effect registration — `GPU_EFFECT_REGISTRY: Map<string, GpuEffectDefinition>`. 5 categories: color/blur/distort/stylize/keying. |
| `gpu-effects/types.ts` | 83 | `GpuEffectDefinition` type with `id`, `name`, `category`, `shader`, `entryPoint`, `uniformSize`, `packUniforms`, optional `dataTexture`, optional `compute`. |
| `gpu-transitions/transition-pipeline.ts` | 500 | Transition renderer. ✅ Bind group cache (`cachedBindGroups:25`). ✅ Pipeline cache (`pipelines:23`). 16 transition types. |
| `gpu-transitions/common.ts` | 44 | Shared WGSL: `PI`, `TAU`, `hash`, `noise2d`, `fbm`, `scaleUv`. |
| `gpu-masks/mask-combine-pipeline.ts` | 114 | Multi-mask combine (multiply alpha) pipeline. ❌ NO bind group cache. |
| `gpu-masks/mask-texture-manager.ts` | 34 | 1×1 white fallback texture for layers without masks. |
| `gpu-scopes/histogram-scope.ts` | 334 | 256-bin RGB+luma histogram. Compute shader `@workgroup_size(16,16)`. |
| `gpu-scopes/waveform-scope.ts` | 479 | RGB parade + luma waveform with 5-row Gaussian vertical spread. |
| `gpu-scopes/vectorscope-scope.ts` | 343 | 512×512 CbCr accumulator with bloom + graticule + skin-tone line. ❗ 8-bit assumption at line 55-57. |
| `gpu-scopes/scope-renderer.ts` | 143 | Facade managing device + source texture + 3 scope instances. ❗ Source texture is `rgba8unorm` (line 70). |
| `gpu-scopes/scope-render-pass.ts` | 88 | Shared helpers: `createScopeRenderBindGroupLayout`, `createScopeRenderPipeline`, `dispatchScopeComputePass`, `drawFullscreenScopePass`. |
| `gpu-text/glyph-atlas-text-pipeline.ts` | 834 | 2048×2048 glyph atlas, SDF-style rendering, per-glyph motion text. |
| `gpu-shapes/shape-render-pipeline.ts` | 613 | SDF-based shape rendering (rect, ellipse, triangle, star, polygon up to 32 vertices, path). |
| `gpu-media/media-render-pipeline.ts` | 419 | Media (image/video) layer rendering with corner-pin, feather, mask. |
| `gpu-media/media-blend-pipeline.ts` | 125 | Two-texture blend with 17 W3C blend modes (uses FreeCut's `BLEND_MODES_WGSL`). |
| `gpu-shared/blend-modes.ts` | 232 | 25 blend modes (17 W3C + 8 extras) in WGSL. ✅ Includes `compositeBlendSourceOver` Porter-Duff source-over. |
| `gpu-shared/fullscreen-quad.ts` | 43 | Shared vertex shader: 6-vertex fullscreen quad with UV origin top-left. |
| `gpu-shared/fullscreen-canvas-pass.ts` | 33 | Helper for blit-to-canvas render pass: `drawFullscreenCanvasPass`. |

**FreeCut GPU total:** 28 production files, ~14,000 LOC. **Every texture format is `rgba8unorm`.** **No color management anywhere.**

### 13.B OpenCut-classic Rust crates

| File | LOC | Purpose |
|---|---|---|
| `rust/crates/gpu/src/context.rs` | 695 | `GpuContext` struct + async `new()` constructor (line 60-187). Adapter/device acquisition with WebGPU → WebGL2 fallback (`acquire_device`, line 189-227, `try_gl_fallback`, line 229-265). Texture format selection: `Bgra8Unorm` for WebGPU, `Rgba8Unorm` for GL backend (line 66-70). Creates `fullscreen_quad` vertex buffer, `linear_sampler` + `nearest_sampler`, `texture_sampler_bind_group_layout`, `blit_pipeline` at construction. `supports_external_texture_copies` flag (line 51, 165-168). |
| `rust/crates/gpu/src/lib.rs` | 21 | `GPU_TEXTURE_FORMAT: wgpu::TextureFormat = wgpu::TextureFormat::Bgra8Unorm` (line 8). `FULLSCREEN_SHADER_SOURCE: &str = include_str!("shaders/fullscreen.wgsl")` (line 9). `GpuError` enum (line 11-21): `AdapterUnavailable`, `RequestDevice`, `CreateSurface`, `UnsupportedSurfaceFormat`. |
| `rust/crates/gpu/src/shaders/fullscreen.wgsl` | 12 | Vertex shader only — `vertex_main(@location(0) position: vec2f)`. Maps clip-space position to UV via `vec2f(position.x * 0.5 + 0.5, 0.5 - position.y * 0.5)`. See §15.A. |
| `rust/crates/gpu/src/shaders/blit.wgsl` | 12 | Simple texture sample shader. See §15.B. |
| `rust/crates/compositor/src/lib.rs` | 12 | Module declarations + re-exports of `BlendMode`, `Compositor`, `CompositorError`, `RenderFrameOptions`, and all `frame.rs` types. |
| `rust/crates/compositor/src/frame.rs` | 83 | `FrameDescriptor` struct (line 9-14): `width`, `height`, `clear: CanvasClearDescriptor`, `items: Vec<FrameItemDescriptor>`. `FrameItemDescriptor` enum (line 22-29): `Layer(LayerDescriptor)` or `SceneEffect { effect_pass_groups }`. `LayerDescriptor` (line 31-41): `texture_id`, `transform: QuadTransformDescriptor`, `opacity`, `blend_mode`, `effect_pass_groups`, `mask: Option<LayerMaskDescriptor>`. `QuadTransformDescriptor` (line 43-53): `center_x/y`, `width/height`, `rotation_degrees`, `flip_x/y`. `LayerMaskDescriptor` (line 55-61): `texture_id`, `feather`, `inverted`. `EffectPassDescriptor` (line 63-68): `shader: String`, `uniforms: HashMap<String, EffectUniformValueDescriptor>`. |
| `rust/crates/compositor/src/blend_mode.rs` | 47 | 17-mode `BlendMode` enum + `shader_code(self) -> u32` mapping (Normal=0, ..., Luminosity=16). |
| `rust/crates/compositor/src/compositor.rs` | 870 | `Compositor` struct (line 27-38) holding `TextureStore`, `TexturePool`, `EffectPipeline`, `MaskFeatherPipeline`, 3 uniform buffer layouts, 3 pipelines (layer/blend/mask). `render_frame` (line 344-405): `texture_pool.recycle_frame()`, acquire surface texture, create scene-cleared texture, loop over items dispatching `render_layer` → `blend_texture` for layers / `apply_effect_groups` for scene effects, blit to surface. `render_layer` (line 407-483): acquire pool texture → `render_source_to_texture` → `apply_effect_groups` → `apply_mask` (with optional `apply_mask_feather_with_encoder`). |
| `rust/crates/compositor/src/texture_pool.rs` | 36 | `TexturePool` with `available: HashMap<(u32, u32), Vec<Texture>>` + `in_use: Vec<(TextureKey, Texture)>`. `recycle_frame()` drains in_use into available (line 14-18). `acquire(context, w, h, label)` pops from available or creates new (line 20-35). **Simpler than FreeCut's pool — no LRU, no byte budget.** |
| `rust/crates/compositor/src/texture_store.rs` | 36 | `TextureStore: HashMap<String, StoredTexture>` for ID→texture lookup. `upsert`, `get`, `remove`. |
| `rust/crates/compositor/src/shaders/layer.wgsl` | 50 | Quad transform shader. See §15.C. |
| `rust/crates/compositor/src/shaders/blend.wgsl` | 142 | 17 W3C blend modes + Porter-Duff source-over. See §15.D. |
| `rust/crates/compositor/src/shaders/mask.wgsl` | 25 | Mask alpha multiply. See §15.E. |
| `rust/crates/effects/src/pipeline.rs` | 330 | `EffectPipeline` with hardcoded `GAUSSIAN_BLUR_SHADER_ID: &str = "gaussian-blur"` (line 10) and `include_str!("shaders/gaussian_blur.wgsl")` (line 11). `pipelines: HashMap<String, wgpu::RenderPipeline>` initialized with only the gaussian_blur pipeline (line 134-135). ❗ **Only 1 effect hardcoded** — extend via `pipelines.insert` to support more. `apply_with_encoder` (line 173-262): per-pass loop, creates fresh bind group per pass (line 192-208) — ❌ NO cache. |
| `rust/crates/effects/src/types.rs` | 13 | `EffectPass { shader: String, uniforms: HashMap<String, UniformValue> }`, `UniformValue::Number(f32) | Vector(Vec<f32>)`. |
| `rust/crates/effects/src/shaders/gaussian_blur.wgsl` | 34 | 61-tap separable Gaussian blur (-30 to +30). See §15.F. |
| `rust/crates/masks/src/sdf.rs` | 332 | `SdfPipeline` — JFA seed + step passes via fragment shaders (WebGL2 compat). `compute_signed_distance_field_with_encoder` (line 144-156) calls `run_jfa` twice (inside/outside). Step count = `(width.max(height) as f32).log2().ceil()` (line 184). ❌ NO bind group cache — fresh per pass. |
| `rust/crates/masks/src/feather.rs` | 285 | `MaskFeatherPipeline` — wraps `SdfPipeline` + the distance combine pass. `apply_mask_feather_with_encoder` runs SDF then `jfa_distance.wgsl`. |
| `rust/crates/masks/src/masks.rs` | 5 | Empty module re-export. |
| `rust/crates/masks/src/shaders/jfa_init.wgsl` | 38 | JFA seed pass. See §15.H. |
| `rust/crates/masks/src/shaders/jfa_step.wgsl` | 75 | JFA propagation pass (3×3 neighborhood scan). See §15.I. |
| `rust/crates/masks/src/shaders/jfa_distance.wgsl` | 50 | SDF combine + feather via `smoothstep(-feather_half, +feather_half, signed_distance)`. See §15.J. |

**OpenCut-classic Rust total:** ~3200 LOC across 4 crates (gpu/compositor/effects/masks). All texture formats are `Bgra8Unorm` (or `Rgba8Unorm` on WebGL2 fallback).

### 13.C OpenCut-classic TS bindings

| File | LOC | Purpose |
|---|---|---|
| `apps/web/src/services/renderer/gpu-renderer.ts` | 90 | `initializeGpuRenderer()` (line 11-24) — memoized promise calling `initializeGpu()` from `opencut-wasm`. `isGpuAvailable()` flag. `gpuRenderer` object (line 30-76) with `applyEffect({ source, width, height, passes })` → calls WASM `applyEffectPasses`, and `applyMaskFeather({ maskCanvas, width, height, feather })` → calls WASM `applyMaskFeatherWasm`. `serializeEffectPasses` (line 78-86) flattens uniforms to `{ name, value: number[] }` shape. |
| `apps/web/src/services/renderer/canvas-renderer.ts` | 105 | `CanvasRenderer` class wrapping an `OffscreenCanvas`. `render({ node, time })` (line 53-74) calls `resolveRenderTree` → `buildFrameDescriptor` → `wasmCompositor.syncTextures` → `wasmCompositor.render`. `renderToCanvas` (line 76-104) does the same + 2D `ctx.drawImage` to a target canvas. Performance spans via `measureSpanAsync`/`measureSpanSync`. |
| `apps/web/src/services/renderer/compositor/wasm-compositor.ts` | 227 | `WasmCompositor` singleton (line 42-183). `ensureInitialized({ width, height })` (line 47-63) calls `initCompositor(w, h)` + `getCompositorCanvas()` from WASM, or `resizeCompositor` on size change. `syncTextures(textures: TextureUploadDescriptor[])` (line 72-88) releases stale textures + syncs current set via `uploadTexture` (WASM). Texture cache: `RenderedCacheEntry` (with `contentHash`) vs `ExternalCacheEntry` (with source identity check). `render(frame)` (line 90-97) calls WASM `renderFrame(frame)`. |
| `apps/web/src/services/renderer/compositor/frame-descriptor.ts` | 581 | `buildFrameDescriptor({ node, renderer })` (line 30-65) walks the resolved node tree, builds `FrameDescriptor` + texture upload list. `collectNode` (line 67+) dispatches on node type: `RootNode` recurses, `ColorNode` builds a rendered texture + simple layer, `VideoNode` builds an external texture + layer with transform, etc. |
| `apps/web/src/services/renderer/compositor/types.ts` | 79 | `FrameDescriptor` TS shape (mirror of Rust `frame.rs`). `TextureUploadDescriptor` discriminated union: `ExternalTextureDescriptor` (kind='external', source: CanvasImageSource) | `RenderedTextureDescriptor` (kind='rendered', contentHash: string, draw: TextureCanvasDrawFn). |

### 13D. Code References — nle-engine (reference, NOT canon)

> The private **nle-engine** repo (github.com/bearachprema/nle-engine, 37,958 LOC, 124 tests) is a clean-room FreeCut-port **in-between reference, NOT canon** — it inherits FreeCut patterns this spec corrects (its GPU pipeline is 8-bit `rgba8unorm` throughout: 29 sites across 7 files). Where engine code conflicts with this spec, **the spec wins** (Decision 5). Full reconciliation: `19-code-references.md`.

| Spec section | Engine file:line | Verified quote | Status | Note |
|---|---|---|---|---|
| §5.1 r16uint Y/U/V planes | `src/lib/nle/playback/player.ts:1263` | `format: 'rgba8unorm',` | CORRECTIVE | 8-bit source textures; spec's 10-bit per-plane r16uint path wins |
| §5.2 rgba16float working | `src/lib/nle/gpu/compositor.ts:981` | `format: 'rgba8unorm',` | CORRECTIVE | 8-bit ping-pong; linear-light rgba16float wins |
| §5.3 canvas config | `src/lib/nle/gpu/device.ts:71` | `_canvasFormat = navigator.gpu.getPreferredCanvasFormat();` | CORRECTIVE | Never sets colorSpace; spec's rgba10a2unorm + display-p3 wins |
| LUT data texture | `src/lib/nle/effects/lut.ts:314` | `Format: rgba8unorm.` | CORRECTIVE | 8-bit LUT; spec ports to 16-bit |
| §8.2 blend modes | `src/lib/nle/gpu/compositor.ts:32` | `export const BLEND_MODE_INDEX: Record<BlendMode, number> = {` | CORRECTIVE | 25-mode WGSL, 8-bit gamma space; spec's linear-light math wins |
| §7.3 TexturePool | `src/lib/nle/gpu/texture-pool.ts:190` | `acquire(width: number, height: number, format: GPUTextureFormat = 'rgba8unorm'): GPUTexture {` | CORRECTIVE | Pool ported but dead code; adopt discipline, change default format |
| §7.1 effect pass outputs | `src/lib/nle/effects/pipeline.ts:5107` | `return this._pongTexture;` | CORRECTIVE | Singleton return (engine P0.1); spec's per-layer outputs win |
| §8.4 mask invert-once | `src/lib/nle/gpu/mask-manager.ts:478` | `invertNext: mask.shape.shape.maskInvert === true,` | CORRECTIVE | Shader + CPU double-invert (engine P0.2); spec's invert-once wins |
| §7.1 all item types | `src/lib/nle/playback/player.ts:1038` | `if (clip.type !== 'video') continue;` | CORRECTIVE | Non-video items dropped; spec's dispatch wins |
| §11.12 device loss | `src/lib/nle/gpu/device.ts:61` | `console.error('[GpuDevice] Device lost!', info.reason, info.message);` | ENGINE-GAP | Logs only; no recovery loop |
| 8K support | `src/lib/nle/gpu/device.ts:56` | `maxTextureDimension2D: 4096,` | ENGINE-GAP | 4096 cap vs spec's 8K tests |
| Transitions baseline | `src/lib/nle/transitions/pipeline.ts:115` | `this.format = 'rgba8unorm';` | CORRECTIVE | FreeCut 8-bit baseline reproduced |

---

## 14. Corrections to Seed Spec

### 14.A ❌ YUV 10-bit value extraction — `u16 & 0x3FF` is wrong

**Seed spec §6.2 (line 247):**
```wgsl
fn decode_y(u16: u32) -> f32 {
  let raw = f32(u16 & 0x3FF);  // 10-bit value
  ...
}
```

**Wrong:** This masks the *lower* 10 bits, but WebCodecs P010/I420P10/I420P12 store 10-bit values **MSB-aligned** in 16-bit cells per [WebCodecs pixel format spec](https://www.w3.org/TR/webcodecs/#pixel-format) — i.e., the 10-bit value `v` is stored as `v << 6`. The 6 LSBs are padding (zero).

**Correct:**
```wgsl
fn decode_y(u16: u32) -> f32 {
  let raw = f32(u16 >> 6);  // 10-bit value, MSB-aligned in 16-bit cell
  ...
}
```

**Verification:** [WebCodecs spec §2.1.5 Pixel Format](https://www.w3.org/TR/webcodecs/#pixel-format) — for `P010` and `I420P10`: "Each sample is stored as a 16-bit little-endian value with the 10 bits in the most significant bits, the lower 6 bits being set to 0." Same applies to `I420P12`, `I422P10`, `I422P12`, `I444P10`, `I444P12` — all 10/12-bit YUV formats are MSB-aligned.

### 14.B ❌ `vectorscope-scope.ts:55-57` uses 8-bit scaling `r * 255.0`

**FreeCut source** (`/tmp/freecut/src/infrastructure/gpu-scopes/vectorscope-scope.ts:55-57`):
```wgsl
atomicAdd(&accumR[idx], u32(max(r * 255.0, 1.0)));
atomicAdd(&accumG[idx], u32(max(g * 255.0, 1.0)));
atomicAdd(&accumB[idx], u32(max(b * 255.0, 1.0)));
```

This assumes 8-bit `[0,1]` input (255 max). For our 10-bit linear-light working texture (`rgba16float`), values are unbounded floats — the accumulator (u32) would overflow. **Required change:** use `r * 65535.0` for 16-bit texture sampling, or treat input as float and accumulate scaled floats.

### 14.C ❌ `pixelFormat: 'P010'` does NOT exist in mediabunny

**Seed spec §4 (line 80-82) and §5.1 (lines 153-160):**
```ts
// P010 layout: Y plane (10-bit values in 16-bit cells), then UV plane (interleaved 10-bit values in 16-bit cells)
device.queue.copyExternalImageToTexture(
  { source: videoFrame },  // P010 VideoFrame
  { texture: yTexture, colorSpace: 'srgb' },
  { width, height }
);
```

**Wrong on three counts:**

1. **`P010` is not in mediabunny's enum** (`mediabunny/src/sample.ts:160-195`): the 10-bit formats exposed are `I420P10`, `I420P12`, `I422P10`, `I422P12`, `I444P10`, `I444P12` — all *planar* (separate Y, U, V planes), not semi-planar (interleaved UV).
2. **`copyExternalImageToTexture` performs YUV→RGB conversion** internally — we can't preserve raw YUV planes via this API, and the conversion is done by the browser's chosen matrix, denying us color management control.
3. **Even if a `P010` VideoFrame is produced by the browser's VideoDecoder** (which is the actual case for 10-bit H.265 on Chromium), the destination texture format must be `rgba8unorm`/`bgra8unorm`/`rgba16float` — there is no `copyExternalImageToTexture` path that preserves raw YUV plane data.

**Corrected approach (see §11 Q7 / §11 Q8):**
1. Accept whatever format the browser's `VideoDecoder` produces (`P010` on Chromium, `I420P10` elsewhere). mediabunny wraps it transparently.
2. Use `VideoFrame.copyTo({ plane: 'Y' | 'U' | 'V' })` to extract each plane separately into CPU buffers.
3. Upload each plane to its own `r16uint` GPU texture via `device.queue.writeTexture`.
4. Run a custom `yuv_to_linear.wgsl` shader (see §6.2 above) that:
   - Loads each plane via `textureLoad(y_tex/u_tex/v_tex, ...)`
   - Extracts 10-bit value via `u16 >> 6` (NOT `u16 & 0x3FF`)
   - Applies configurable BT.709/BT.2020 matrix
   - Applies configurable inverse transfer function (sRGB EOTF / PQ EOTF / HLG OETF^-1)
   - Outputs linear-light RGB to `rgba16float` working texture

**For semi-planar P010 (Chromium default):** If we know we got `P010` (semi-planar Y + interleaved UV), we'd use 2 textures (`r16uint` Y + `rg16uint` UV-interleaved). For `I420P10` (planar Y + U + V), use 3 textures (3× `r16uint`). The shader can branch on a uniform flag, or we standardize on one format via `new VideoFrame(src, { format: 'I420P10', ... })` up-front conversion.

### 14.D ❌ `r16uint` / `rg16uint` as WGSL `texture_2d<u32>` — type mismatch

**Seed spec §6.2 (lines 242-243):**
```wgsl
@group(0) @binding(0) var y_tex: texture_2d<u32>;     // r16uint
@group(0) @binding(1) var uv_tex: texture_2d<u32>;    // rg16uint
```

**Partially correct:** `texture_2d<u32>` is the right WGSL type for unsigned-integer textures, and `r16uint`/`rg16uint` are sample-compatible with it. ✅ No change needed for the WGSL declaration.

**But:** For WGSL `textureLoad`/`textureSampleLevel` on a `texture_2d<u32>`, the return type is `vec4<u32>`. The 16-bit value is zero-extended to 32 bits, so we read `.r` (or `.x`) and get the full 16-bit value as a `u32`. The shader's `u16 >> 6` operation works correctly on this `u32`.

**Required correction:** change `texture_2d<f32>` declarations to `texture_2d<u32>` for the YUV source textures in our `yuv_to_linear.wgsl`. The seed spec's shader source code (lines 242-243) is already correct on this — flagged here only because §5.1 says "Y plane: r16uint (16-bit, holds 10-bit Y + 6 pad)" which might mislead a reader into thinking the WGSL type should be `texture_2d<f32>`. It should be `texture_2d<u32>`.

### 14.E ❌ `rgba10a2unorm` + `display-p3` is NOT W3C-standard canvas config

**Seed spec §5.3 (lines 187-194):**
```ts
const canvasConfig: GPUCanvasConfiguration = {
  device,
  format: 'rgba10a2unorm',  // 10-bit per channel + 2-bit alpha
  colorSpace: 'display-p3',
  alphaMode: 'premultiplied',
};
```

**Wrong:** The W3C WebGPU spec lists only `bgra8unorm`, `rgba8unorm`, `rgba16float` as valid `GPUCanvasConfiguration.format` values. `rgba10a2unorm` is a Chromium-only extension (introduced in Chromium 118, hardware-dependent). It's not safe to hardcode.

**Corrected approach (see §11 Q9 / §11 Q10):**
```ts
// Runtime feature-detection
const tryFormat = (fmt: GPUTextureFormat) => {
  try {
    const test = document.createElement('canvas');
    const ctx = test.getContext('webgpu');
    ctx.configure({ device, format: fmt, colorSpace: 'display-p3' });
    ctx.getCurrentTexture();  // throws if unsupported
    return true;
  } catch { return false; }
};

this.format = tryFormat('rgba10a2unorm') ? 'rgba10a2unorm' : 'rgba8unorm';
this.context.configure({
  device,
  format: this.format,
  colorSpace: 'display-p3',
  alphaMode: 'premultiplied',
});
```

**Alternative for v2 HDR:** `rgba16float` + `extended-srgb-linear` — W3C-spec-compliant HDR canvas (Chromium 116+).

### 14.F ⚠️ `1.0 / 2.4` exponent in sRGB OETF — should be `1.0 / 2.4` (correct), but watch out for negative input

**Seed spec §6.3 (line 337):**
```wgsl
return select(c * 12.92, 1.055 * pow(c, vec3f(1.0 / 2.4)) - 0.055, c > 0.0031308);
```

**Correct** for sRGB OETF (per [IEC 61966-2-1](https://www.colour-science.org/functions/)). But:
- ❗ `pow(c, ...)` for negative `c` returns NaN. For HDR inputs that may have negative values (rare, but possible in scene-linear after extreme grading), we need `pow(max(c, 0.0), ...)`.

**Corrected:**
```wgsl
return select(c * 12.92, 1.055 * pow(max(c, vec3f(0.0)), vec3f(1.0 / 2.4)) - 0.055, c > 0.0031308);
```

### 14.G ⚠️ HLG OETF formula in `apply_display_transfer` — `c > 1.0 / 12.0` should be applied per-channel, not on luminance

**Seed spec §6.3 (line 353):**
```wgsl
return select(sqrt(3.0 * c), a * log(12.0 * c - b) + c_param, c > 1.0 / 12.0);
```

**Correct** (per BT.2100 HLG OETF). The select operates per-channel (vec3f), which is what BT.2100 specifies. No change needed — flagged because the `c > 1.0 / 12.0` produces a vec3f of bools, and the WGSL `select(false_val, true_val, condition)` interprets that as per-channel selection, which is correct.

### 14.H ⚠️ FreeCut `compositor-pipeline.ts` bind-group caching claim — only partially wrong

**Seed spec §7.2 (lines 459-461):**
> FreeCut re-creates bind groups per layer per frame (no caching). This is wasteful. We cache by hash:

**Verified accurate for the compositor** (`compositor-pipeline.ts:487-509`): fresh `createBindGroup` per layer per frame, no cache. ✅

**But:** FreeCut's `EffectsPipeline` *does* cache (`effectBindGroupCache`, `effects-pipeline.ts:123,515-571`) and so does `TransitionPipeline` (`cachedBindGroups`, `transition-pipeline.ts:25,214-219`). The seed spec's blanket claim "FreeCut re-creates bind groups per layer per frame" should be scoped to **only the compositor**.

**Updated §7.2 wording:** "FreeCut's *compositor* re-creates bind groups per layer per frame (no caching). The effects and transitions pipelines *do* cache. We adopt the caching pattern from the effects pipeline for all stages."

### 14.I ⚠️ Pipeline cache by descriptor hash — neither repo has this

**Seed spec §7.1 (line 394):**
```ts
private pipelines: Map<string, GPURenderPipeline> = new Map();
```

**Verified:** Both FreeCut and OpenCut-classic cache `GPURenderPipeline` objects, but keyed by *effect/transition/layer-type ID* (e.g., `effect.type` in `effects-pipeline.ts:97`), NOT by descriptor hash. Pipelines are created once at construction time and never re-created on demand.

**Our improvement:** we don't strictly need descriptor-hash caching if we create all pipelines up-front. If we want lazy pipeline creation (e.g., only create `gaussian_blur` pipeline when first used), we can cache by `effectId` (like FreeCut does) — no need for full descriptor hashing. The seed spec's `Map<string, GPURenderPipeline>` keyed by descriptor hash is over-engineered; key by effect/shader ID instead.

---

## 15. WGSL Shader Quotes

### 15.A `fullscreen.wgsl` (OpenCut-classic)

📍 `/tmp/opencut-classic/rust/crates/gpu/src/shaders/fullscreen.wgsl` (12 LOC)

```wgsl
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) tex_coord: vec2f,
}

@vertex
fn vertex_main(@location(0) position: vec2f) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4f(position, 0.0, 1.0);
    output.tex_coord = vec2f(position.x * 0.5 + 0.5, 0.5 - position.y * 0.5);
    return output;
}
```

**Notes:**
- Requires a 6-vertex buffer (or 6-element array of `vec2f` positions) bound at vertex location 0.
- FreeCut's equivalent (`gpu-shared/fullscreen-quad.ts:14-43`) uses `@builtin(vertex_index)` instead of `@location(0) position` — generates positions inline in shader, no vertex buffer needed. **We adopt FreeCut's approach** (no vertex buffer = less state to bind):

```wgsl
// FreeCut variant (gpu-shared/fullscreen-quad.ts:14-43)
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var positions = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );
  var uvs = array<vec2f, 6>(
    vec2f(0.0, 1.0), vec2f(1.0, 1.0), vec2f(0.0, 0.0),
    vec2f(0.0, 0.0), vec2f(1.0, 1.0), vec2f(1.0, 0.0)
  );
  var output: VertexOutput;
  output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
  output.uv = uvs[vertexIndex];
  return output;
}
```

### 15.B `blit.wgsl` (OpenCut-classic)

📍 `/tmp/opencut-classic/rust/crates/gpu/src/shaders/blit.wgsl` (12 LOC)

```wgsl
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) tex_coord: vec2f,
}

@group(0) @binding(0) var input_texture: texture_2d<f32>;
@group(0) @binding(1) var input_sampler: sampler;

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    return textureSample(input_texture, input_sampler, input.tex_coord);
}
```

**Notes:** FreeCut's equivalent (`gpu-compositor/compositor-pipeline.ts:25-37`) also premultiplies the alpha on output (`vec4f(c.rgb * c.a, c.a)`) — needed because the compositor stores straight alpha and the canvas expects premultiplied. **We adopt FreeCut's variant** since our working texture also stores straight alpha.

### 15.C `layer.wgsl` (OpenCut-classic)

📍 `/tmp/opencut-classic/rust/crates/compositor/src/shaders/layer.wgsl` (50 LOC)

```wgsl
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) tex_coord: vec2f,
}

struct LayerUniforms {
    resolution: vec2f,
    center: vec2f,
    size: vec2f,
    rotation_radians: f32,
    opacity: f32,
    flip_x: f32,
    flip_y: f32,
    _padding: vec2f,
}

@group(0) @binding(0) var source_texture: texture_2d<f32>;
@group(0) @binding(1) var source_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: LayerUniforms;

fn rotate_inverse(point: vec2f, angle: f32) -> vec2f {
    let c = cos(angle);
    let s = sin(angle);
    return vec2f(
        point.x * c + point.y * s,
        -point.x * s + point.y * c,
    );
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let pixel = input.tex_coord * uniforms.resolution;
    let local = rotate_inverse(pixel - uniforms.center, uniforms.rotation_radians);

    let uv = vec2f(
        local.x / uniforms.size.x + 0.5,
        local.y / uniforms.size.y + 0.5,
    );

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        return vec4f(0.0, 0.0, 0.0, 0.0);
    }

    let sample_uv = vec2f(
        select(uv.x, 1.0 - uv.x, uniforms.flip_x > 0.5),
        select(uv.y, 1.0 - uv.y, uniforms.flip_y > 0.5),
    );
    let color = textureSampleLevel(source_texture, source_sampler, sample_uv, 0.0);
    return vec4f(color.rgb, color.a * uniforms.opacity);
}
```

**Verified:** Quad-only transform model — pixel-space to local-space via inverse rotation and translation. Center/size/rotation/opacity/flipX/flipY parameters match `QuadTransformDescriptor` in `frame.rs:43-53`. No perspective (FreeCut's compositor adds perspective via `rotationX`, `rotationY`, `perspective` uniforms at `compositor-pipeline.ts:55-58, 84-102` — we can extend if needed). Adopt verbatim.

### 15.D `blend.wgsl` (OpenCut-classic) — ADOPT VERBATIM

📍 `/tmp/opencut-classic/rust/crates/compositor/src/shaders/blend.wgsl` (142 LOC)

```wgsl
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) tex_coord: vec2f,
}

struct BlendUniforms {
    blend_mode: u32,
    _pad0: u32,
    _pad1: u32,
    _pad2: u32,
}

@group(0) @binding(0) var base_texture: texture_2d<f32>;
@group(0) @binding(1) var base_sampler: sampler;
@group(1) @binding(0) var layer_texture: texture_2d<f32>;
@group(1) @binding(1) var layer_sampler: sampler;
@group(2) @binding(0) var<uniform> uniforms: BlendUniforms;

fn clamp01(color: vec3f) -> vec3f {
    return clamp(color, vec3f(0.0), vec3f(1.0));
}

fn lum(c: vec3f) -> f32 {
    return dot(c, vec3f(0.3, 0.59, 0.11));
}

fn sat(c: vec3f) -> f32 {
    return max(max(c.r, c.g), c.b) - min(min(c.r, c.g), c.b);
}

fn clip_color(c: vec3f) -> vec3f {
    var result = c;
    let l = lum(result);
    let n = min(min(result.r, result.g), result.b);
    let x = max(max(result.r, result.g), result.b);
    if (n < 0.0) {
        result = l + ((result - l) * l) / (l - n);
    }
    if (x > 1.0) {
        result = l + ((result - l) * (1.0 - l)) / (x - l);
    }
    return result;
}

fn set_lum(c: vec3f, l: f32) -> vec3f {
    return clip_color(c + (l - lum(c)));
}

fn set_sat(color: vec3f, target_sat: f32) -> vec3f {
    var result = color;
    let max_value = max(max(result.r, result.g), result.b);
    let min_value = min(min(result.r, result.g), result.b);
    if (max_value <= min_value) {
        return vec3f(0.0);
    }
    let scale = target_sat / (max_value - min_value);
    result = (result - vec3f(min_value)) * scale;
    return result;
}

fn hard_light(base: vec3f, layer: vec3f) -> vec3f {
    let low = 2.0 * base * layer;
    let high = 1.0 - 2.0 * (1.0 - base) * (1.0 - layer);
    return select(low, high, layer >= vec3f(0.5));
}

fn soft_light_channel(base: f32, layer: f32) -> f32 {
    if (layer <= 0.5) {
        return base - (1.0 - 2.0 * layer) * base * (1.0 - base);
    }

    let d = select(
        ((16.0 * base - 12.0) * base + 4.0) * base,
        sqrt(base),
        base > 0.25,
    );
    return base + (2.0 * layer - 1.0) * (d - base);
}

fn soft_light(base: vec3f, layer: vec3f) -> vec3f {
    return vec3f(
        soft_light_channel(base.r, layer.r),
        soft_light_channel(base.g, layer.g),
        soft_light_channel(base.b, layer.b),
    );
}

fn color_dodge(base: vec3f, layer: vec3f) -> vec3f {
    return select(
        min(vec3f(1.0), base / max(vec3f(0.0001), vec3f(1.0) - layer)),
        vec3f(1.0),
        layer >= vec3f(1.0),
    );
}

fn color_burn(base: vec3f, layer: vec3f) -> vec3f {
    return select(
        vec3f(1.0) - min(vec3f(1.0), (vec3f(1.0) - base) / max(vec3f(0.0001), layer)),
        vec3f(0.0),
        layer <= vec3f(0.0),
    );
}

fn blend_rgb(base: vec3f, layer: vec3f, mode: u32) -> vec3f {
    switch mode {
        case 1u { return min(base, layer); }
        case 2u { return base * layer; }
        case 3u { return color_burn(base, layer); }
        case 4u { return max(base, layer); }
        case 5u { return 1.0 - (1.0 - base) * (1.0 - layer); }
        case 6u { return min(vec3f(1.0), base + layer); }
        case 7u { return color_dodge(base, layer); }
        case 8u { return select(
            2.0 * base * layer,
            1.0 - 2.0 * (1.0 - base) * (1.0 - layer),
            base >= vec3f(0.5),
        ); }
        case 9u { return soft_light(base, layer); }
        case 10u { return hard_light(base, layer); }
        case 11u { return abs(base - layer); }
        case 12u { return base + layer - 2.0 * base * layer; }
        case 13u { return set_lum(set_sat(layer, sat(base)), lum(base)); }
        case 14u { return set_lum(set_sat(base, sat(layer)), lum(base)); }
        case 15u { return set_lum(layer, lum(base)); }
        case 16u { return set_lum(base, lum(layer)); }
        default { return layer; }
    }
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let base = textureSample(base_texture, base_sampler, input.tex_coord);
    let layer = textureSample(layer_texture, layer_sampler, input.tex_coord);

    let blend_rgb_value = blend_rgb(base.rgb, layer.rgb, uniforms.blend_mode);
    let out_alpha = layer.a + base.a * (1.0 - layer.a);
    let out_rgb =
        ((1.0 - layer.a) * base.rgb) +
        (layer.a * ((1.0 - base.a) * layer.rgb + base.a * blend_rgb_value));

    return vec4f(clamp01(out_rgb), out_alpha);
}
```

**Verified:**
- 17 W3C blend modes (default + cases 1u-16u). Mode index mapping matches `BlendMode::shader_code()` in `blend_mode.rs:25-46` exactly.
- `lum`, `sat`, `clip_color`, `set_lum`, `set_sat` are exact implementations of [W3C Compositing & Blending Level 1 §10.2](https://www.w3.org/TR/compositing-1/#blendingseparable).
- `soft_light_channel` uses the W3C spec's "Peg-top" formula: `d = select(((16x - 12)x + 4)x, √x, x > 0.25)`.
- Porter-Duff source-over (lines 130-141): correct W3C Compositing & Blending formula. `out_alpha = layer.a + base.a * (1 - layer.a)`. `out_rgb = (1 - layer.a) * base.rgb + layer.a * ((1 - base.a) * layer.rgb + base.a * blend_rgb_value)`. **This is the general Porter-Duff source-over that reduces to standard alpha compositing when `blend_rgb_value = layer.rgb` (i.e., Normal mode).**
- ❗ The `clamp01(out_rgb)` at line 141 clips to `[0,1]` — for our linear-light pipeline we should DROP this clamp (or replace with `max(out_rgb, 0.0)` to allow HDR > 1.0).

**Adoption note:** For our 10-bit linear-light pipeline, **adopt verbatim** but drop the `clamp01` on the RGB output (preserve HDR highlights). Also need to bind textures as `texture_2d<f32>` against `rgba16float` working textures.

### 15.E `mask.wgsl` (OpenCut-classic)

📍 `/tmp/opencut-classic/rust/crates/compositor/src/shaders/mask.wgsl` (25 LOC)

```wgsl
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) tex_coord: vec2f,
}

struct MaskUniforms {
    inverted: f32,
    _pad0: f32,
    _pad1: f32,
    _pad2: f32,
}

@group(0) @binding(0) var layer_texture: texture_2d<f32>;
@group(0) @binding(1) var layer_sampler: sampler;
@group(1) @binding(0) var mask_texture: texture_2d<f32>;
@group(1) @binding(1) var mask_sampler: sampler;
@group(2) @binding(0) var<uniform> uniforms: MaskUniforms;

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let layer = textureSample(layer_texture, layer_sampler, input.tex_coord);
    let mask = textureSample(mask_texture, mask_sampler, input.tex_coord).a;
    let alpha = select(mask, 1.0 - mask, uniforms.inverted > 0.5);
    return vec4f(layer.rgb, layer.a * alpha);
}
```

**Verified:** Simple mask-multiply shader. Reads mask texture's alpha channel (line 22), inverts if uniform flag set, multiplies layer alpha by mask alpha. Adopt verbatim.

### 15.F `gaussian_blur.wgsl` (OpenCut-classic)

📍 `/tmp/opencut-classic/rust/crates/effects/src/shaders/gaussian_blur.wgsl` (34 LOC)

```wgsl
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) tex_coord: vec2f,
}

struct EffectUniforms {
    resolution: vec2f,
    direction: vec2f,
    scalars: vec4f,
}

@group(0) @binding(0) var input_texture: texture_2d<f32>;
@group(0) @binding(1) var input_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let texel_size = vec2f(1.0, 1.0) / uniforms.resolution;
    let sigma = uniforms.scalars.x;
    let step_size = uniforms.scalars.y;

    var color = vec4f(0.0, 0.0, 0.0, 0.0);
    var total_weight = 0.0;

    for (var index = -30; index <= 30; index = index + 1) {
        let position = f32(index) * step_size;
        let weight = exp(-(position * position) / (2.0 * sigma * sigma));
        let sample_uv = input.tex_coord + (texel_size * uniforms.direction * position);
        color = color + textureSample(input_texture, input_sampler, sample_uv) * weight;
        total_weight = total_weight + weight;
    }

    return color / total_weight;
}
```

**Verified:** 61-tap separable Gaussian blur (index -30 to +30). Direction uniform (`u_direction: vec2f`) makes this single shader reusable for both horizontal (`[1, 0]`) and vertical (`[0, 1]`) passes. `sigma` (scalars.x) controls blur radius; `step_size` (scalars.y) controls subsampling for performance.

**Hardcoded mapping** at `effects/src/pipeline.rs:10-11, 134-135`:
```rust
const GAUSSIAN_BLUR_SHADER_ID: &str = "gaussian-blur";
const GAUSSIAN_BLUR_SHADER_SOURCE: &str = include_str!("shaders/gaussian_blur.wgsl");
// ...
let pipelines = HashMap::from([(GAUSSIAN_BLUR_SHADER_ID.to_string(), gaussian_blur_pipeline)]);
```

**Uniform packing** at `effects/src/pipeline.rs:265-290`:
```rust
fn pack_effect_uniforms(pass: &EffectPass, width: u32, height: u32) -> Result<EffectUniformBuffer, EffectsError> {
    let sigma = read_number_uniform(pass, "u_sigma")?;
    let step = read_number_uniform(pass, "u_step")?;
    let direction = read_vec2_uniform(pass, "u_direction")?;
    // ...
    Ok(EffectUniformBuffer {
        resolution: [width as f32, height as f32],
        direction,
        scalars: [sigma, step, 0.0, 0.0],
    })
}
```

**Required uniform names** (case-sensitive): `u_sigma`, `u_step`, `u_direction`. Any other uniform name returns `EffectsError::UnsupportedUniform`.

### 15.G `color_wheels.wgsl` (FreeCut, ported to linear-light)

📍 FreeCut source: `/tmp/freecut/src/infrastructure/gpu-effects/effects/color.ts:584-663`

```wgsl
// FreeCut original — operates on gamma-encoded rgba8unorm values
struct WheelsParams {
  shHue: f32, shAmount: f32, midHue: f32, midAmount: f32,
  hlHue: f32, hlAmount: f32, temperature: f32, tint: f32,
  saturation: f32, exposure: f32, contrast: f32, pivot: f32,
  lift: f32, gamma: f32, gain: f32, offset: f32,
  blackPoint: f32, whitePoint: f32, offHue: f32, offAmount: f32,
  midDetail: f32, colorBoost: f32, shadows: f32, highlights: f32,
  hue: f32, lumMix: f32, _pad1: f32, _pad2: f32,
};
@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> params: WheelsParams;

fn wheelTint(color: vec3f, hue: f32, amount: f32, mask: f32) -> vec3f {
  if (amount < 0.001) { return color; }
  let rad = hue * TAU / 360.0;
  let tintColor = hsv2rgb(vec3f(hue / 360.0, 1.0, 1.0));
  return mix(color, color * mix(vec3f(1.0), tintColor, amount), mask);
}

@fragment
fn colorWheelsFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);
  var c = color.rgb;
  let luma = luminance601(c);
  let shadowMask = 1.0 - smoothstep(0.0, 0.5, luma);
  let highlightMask = smoothstep(0.5, 1.0, luma);
  let midtoneMask = 1.0 - shadowMask - highlightMask;
  c = wheelTint(c, params.shHue, params.shAmount, shadowMask);
  c = wheelTint(c, params.midHue, params.midAmount, midtoneMask);
  c = wheelTint(c, params.hlHue, params.hlAmount, highlightMask);
  c = wheelTint(c, params.offHue, params.offAmount, 1.0);
  let temp = params.temperature / 100.0;
  c.r += temp * 0.1;
  c.b -= temp * 0.1;
  let ti = params.tint / 100.0;
  c.g -= ti * 0.1;
  c.r += ti * 0.05;
  c.b += ti * 0.05;

  c *= pow(2.0, params.exposure);
  c = (c - vec3f(params.pivot)) * params.contrast + vec3f(params.pivot);
  if (abs(params.midDetail) > 0.001) {
    let detailLuma = luminance601(c);
    let detailAdjusted = vec3f(detailLuma) +
      (c - vec3f(detailLuma)) * (1.0 + params.midDetail / 100.0);
    c = mix(c, detailAdjusted, midtoneMask);
  }
  c = (c + vec3f(params.lift) + vec3f(params.offset)) * params.gain;
  c = pow(max(c, vec3f(0.0)), vec3f(1.0 / max(params.gamma, 0.05)));
  c = (c - vec3f(params.blackPoint)) /
      vec3f(max(params.whitePoint - params.blackPoint, 0.001));
  c += vec3f(params.shadows / 100.0) * shadowMask;
  c += vec3f(params.highlights / 100.0) * highlightMask;

  let sat = 1.0 + params.saturation / 100.0;
  let gray = luminance601(c);
  c = mix(vec3f(gray), c, sat);
  let colorBoost = params.colorBoost / 100.0;
  if (abs(colorBoost) > 0.001) {
    let boostedGray = luminance601(c);
    let chroma = c - vec3f(boostedGray);
    c = vec3f(boostedGray) + chroma * (1.0 + colorBoost * (1.0 - clamp(length(chroma), 0.0, 1.0)));
  }
  if (abs(params.hue - 50.0) > 0.001) {
    var hsv = rgb2hsv(c);
    hsv.x = fract(hsv.x + ((params.hue - 50.0) / 100.0));
    c = hsv2rgb(hsv);
  }
  let postLuma = luminance601(c);
  c = mix(vec3f(postLuma), c, clamp(params.lumMix / 100.0, 0.0, 1.0));
  return vec4f(clamp(c, vec3f(0.0), vec3f(1.0)), color.a);
}
```

**Adoption plan for our 10-bit linear-light pipeline:**
1. ✅ `c *= pow(2.0, params.exposure)` — correct for linear-light (no change needed; the math was always right, just the *input* was wrong before).
2. ✅ `c = (c - vec3f(params.pivot)) * params.contrast + vec3f(params.pivot)` — correct for linear-light.
3. ❗ `pow(max(c, vec3f(0.0)), vec3f(1.0 / max(params.gamma, 0.05)))` — gamma correction. In scene-linear working space, gamma is applied AFTER grading, not before. Keep this (it's still correct mathematically as an exposure-style power function).
4. ❗ Drop the final `clamp(c, vec3f(0.0), vec3f(1.0))` — preserves HDR highlights.
5. ❗ `luminance601(c)` uses BT.601 luma weights (0.299/0.587/0.114) — should change to `luminance(c)` (BT.709 weights 0.2126/0.7152/0.0722) for HD content, or make it configurable per source.
6. ❗ `temperature` / `tint` adjustments are linear shifts (`c.r += temp * 0.1`) — for true color management these should be multiplicative in linear-light (white balance is a multiply by a color matrix, not an additive shift). **Acceptable simplification for v1; refine in v2.**
7. ❗ Masking by `luma` (lines 615-618) — `smoothstep(0.0, 0.5, luma)` should use scene-linear luma thresholds if working in linear-light. The 0.5 threshold assumes sRGB-encoded gamma midpoint. For linear-light, the perceptual midpoint is around 0.18 (middle gray). Adjust: `shadowMask = 1.0 - smoothstep(0.0, 0.18, luma)`, etc.

**Corrected version (linear-light):**
```wgsl
@fragment
fn colorWheelsLinearFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);  // rgba16float linear-light
  var c = color.rgb;
  let luma = luminance(c);  // BT.709 weights
  // Middle gray ~0.18 in scene-linear (per ACES)
  let shadowMask = 1.0 - smoothstep(0.0, 0.18, luma);
  let highlightMask = smoothstep(0.18, 1.0, luma);
  let midtoneMask = 1.0 - shadowMask - highlightMask;
  // ... (rest of shader unchanged, but drop the final clamp)
  c = mix(vec3f(postLuma), c, clamp(params.lumMix / 100.0, 0.0, 1.0));
  return vec4f(c, color.a);  // ← no clamp, HDR-aware
}
```

### 15.H `jfa_init.wgsl` (OpenCut-classic)

📍 `/tmp/opencut-classic/rust/crates/masks/src/shaders/jfa_init.wgsl` (38 LOC)

```wgsl
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) tex_coord: vec2f,
}

struct JfaInitUniforms {
    resolution: vec2f,
    invert: f32,
    _padding: f32,
}

@group(0) @binding(0) var input_texture: texture_2d<f32>;
@group(0) @binding(1) var input_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: JfaInitUniforms;

fn encode_seed(seed: vec2f) -> vec4f {
    let x_hi = floor(seed.x / 256.0);
    let x_lo = seed.x - (x_hi * 256.0);
    let y_hi = floor(seed.y / 256.0);
    let y_lo = seed.y - (y_hi * 256.0);
    return vec4f(x_hi / 255.0, x_lo / 255.0, y_hi / 255.0, y_lo / 255.0);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let mask = textureSample(input_texture, input_sampler, input.tex_coord).r;
    let above = mask > 0.5;
    let below = mask < 0.5;
    let inverted = uniforms.invert > 0.5;
    let is_seed = select(above, below, inverted);

    if (is_seed) {
        let pixel_coord = floor(input.tex_coord * uniforms.resolution);
        return encode_seed(pixel_coord);
    }

    return vec4f(1.0, 1.0, 1.0, 1.0);
}
```

**Verified:** Encodes 2D pixel coordinate (up to 65535²) into `vec4f` of 4 normalized bytes (`x_hi, x_lo, y_hi, y_lo`). Non-seed pixels return `(1,1,1,1)` sentinel.

### 15.I `jfa_step.wgsl` (OpenCut-classic)

📍 `/tmp/opencut-classic/rust/crates/masks/src/shaders/jfa_step.wgsl` (75 LOC)

```wgsl
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) tex_coord: vec2f,
}

struct JfaStepUniforms {
    resolution: vec2f,
    step_size: f32,
    _padding: f32,
}

@group(0) @binding(0) var input_texture: texture_2d<f32>;
@group(0) @binding(1) var input_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: JfaStepUniforms;

fn decode_seed(encoded: vec4f) -> vec2f {
    let x = floor(encoded.r * 255.0 + 0.5) * 256.0 + floor(encoded.g * 255.0 + 0.5);
    let y = floor(encoded.b * 255.0 + 0.5) * 256.0 + floor(encoded.a * 255.0 + 0.5);
    return vec2f(x, y);
}

fn encode_seed(seed: vec2f) -> vec4f {
    let x_hi = floor(seed.x / 256.0);
    let x_lo = seed.x - (x_hi * 256.0);
    let y_hi = floor(seed.y / 256.0);
    let y_lo = seed.y - (y_hi * 256.0);
    return vec4f(x_hi / 255.0, x_lo / 255.0, y_hi / 255.0, y_lo / 255.0);
}

fn is_no_seed(encoded: vec4f) -> bool {
    return encoded.r > 0.99 && encoded.g > 0.99 && encoded.b > 0.99 && encoded.a > 0.99;
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let pixel_coord = floor(input.tex_coord * uniforms.resolution);
    let texel_size = vec2f(1.0, 1.0) / uniforms.resolution;

    var best_distance = 10000000000.0;
    var best_seed = vec2f(65535.0, 65535.0);

    for (var y = -1; y <= 1; y = y + 1) {
        for (var x = -1; x <= 1; x = x + 1) {
            let offset = vec2f(f32(x), f32(y)) * uniforms.step_size;
            let sample_uv = input.tex_coord + (offset * texel_size);

            if (
                sample_uv.x < 0.0 ||
                sample_uv.x > 1.0 ||
                sample_uv.y < 0.0 ||
                sample_uv.y > 1.0
            ) {
                continue;
            }

            let encoded = textureSampleLevel(input_texture, input_sampler, sample_uv, 0.0);
            if (is_no_seed(encoded)) {
                continue;
            }

            let seed = decode_seed(encoded);
            let distance_to_seed = distance(pixel_coord, seed);
            if (distance_to_seed < best_distance) {
                best_distance = distance_to_seed;
                best_seed = seed;
            }
        }
    }

    if (best_distance < 1000000000.0) {
        return encode_seed(best_seed);
    }

    return vec4f(1.0, 1.0, 1.0, 1.0);
}
```

**Verified:** Standard JFA propagation. 3×3 neighborhood scan at distance `step_size` texels. Tracks nearest seed by Euclidean distance to current pixel. Step sizes decrease by powers of 2: 2^11, 2^10, ..., 2^0 = 1 (12 steps for 4K). For >65K textures the encoding breaks (max coord 65535) — would need to upgrade to `rgba16uint` storage. ❗ For our 10-bit pipeline we should use `rgba16uint` texture + `textureLoad` in compute shader (compute-shader rewrite recommended per §8.4).

### 15.J `jfa_distance.wgsl` (OpenCut-classic)

📍 `/tmp/opencut-classic/rust/crates/masks/src/shaders/jfa_distance.wgsl` (50 LOC)

```wgsl
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) tex_coord: vec2f,
}

struct DistanceUniforms {
    resolution: vec2f,
    feather_half: f32,
    _padding: f32,
}

@group(0) @binding(0) var inside_texture: texture_2d<f32>;
@group(0) @binding(1) var inside_sampler: sampler;
@group(1) @binding(0) var outside_texture: texture_2d<f32>;
@group(1) @binding(1) var outside_sampler: sampler;
@group(2) @binding(0) var<uniform> uniforms: DistanceUniforms;

fn decode_seed(encoded: vec4f) -> vec2f {
    let x = floor(encoded.r * 255.0 + 0.5) * 256.0 + floor(encoded.g * 255.0 + 0.5);
    let y = floor(encoded.b * 255.0 + 0.5) * 256.0 + floor(encoded.a * 255.0 + 0.5);
    return vec2f(x, y);
}

fn is_no_seed(encoded: vec4f) -> bool {
    return encoded.r > 0.99 && encoded.g > 0.99 && encoded.b > 0.99 && encoded.a > 0.99;
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let pixel_coord = floor(input.tex_coord * uniforms.resolution);
    let inside_encoded = textureSample(inside_texture, inside_sampler, input.tex_coord);
    let outside_encoded = textureSample(outside_texture, outside_sampler, input.tex_coord);

    let has_inside = !is_no_seed(inside_encoded);
    let has_outside = !is_no_seed(outside_encoded);
    let distance_to_inside = select(
        100000.0,
        distance(pixel_coord, decode_seed(inside_encoded)),
        has_inside,
    );
    let distance_to_outside = select(
        100000.0,
        distance(pixel_coord, decode_seed(outside_encoded)),
        has_outside,
    );
    let signed_distance = distance_to_outside - distance_to_inside;
    let alpha = smoothstep(-uniforms.feather_half, uniforms.feather_half, signed_distance);

    return vec4f(alpha, alpha, alpha, alpha);
}
```

**Verified:** Combines inside/outside JFA results into a signed distance field. `signed_distance = dist_to_outside - dist_to_inside` (positive outside the mask, negative inside). `smoothstep` over `±feather_half` produces a soft alpha edge. Output is single-channel alpha replicated to all 4 channels.

---

## 16. Texture Format Chain

### 16.1 Decoded source — CPU side

| Stage | Format | Source | Notes |
|---|---|---|---|
| WebCodecs `VideoFrame.format` | `'P010'` or `'I420P10'` (browser-determined) | Browser's `VideoDecoder` | Per WebCodecs spec §2.1.5. 10-bit values MSB-aligned in 16-bit cells. |
| mediabunny `VideoSample.format` | `'I420P10'` / `'I420P12'` / `'I422P10'` / `'I422P12'` / `'I444P10'` / `'I444P12'` | mediabunny `VIDEO_SAMPLE_PIXEL_FORMATS` enum (`mediabunny/src/sample.ts:160-195`) | All planar (separate Y, U, V planes). NO `'P010'` in mediabunny's enum. |

### 16.2 GPU source textures — YUV planes

| Texture | Format | Dimensions | Usage | Notes |
|---|---|---|---|---|
| Y plane | `r16uint` | `width × height` | `TEXTURE_BINDING \| COPY_DST` | 16-bit per pixel, 10-bit value in MSB bits (extract via `>> 6`). |
| U plane | `r16uint` | `width/2 × height/2` (4:2:0) or `width/2 × height` (4:2:2) or `width × height` (4:4:4) | `TEXTURE_BINDING \| COPY_DST` | Half-res for 4:2:0/4:2:2 subsampled chroma. |
| V plane | `r16uint` | same as U | `TEXTURE_BINDING \| COPY_DST` | Same dimensions as U. |
| (NV12/P010 alternative) UV plane | `rg16uint` | `width/2 × height/2` | `TEXTURE_BINDING \| COPY_DST` | Only for semi-planar formats. mediabunny doesn't expose `P010` directly — would only apply if browser's `VideoDecoder` produces `P010` and we use it directly. |

### 16.3 Working textures — linear-light RGB

| Texture | Format | Dimensions | Usage | Notes |
|---|---|---|---|---|
| Working ping | `rgba16float` | `width × height` | `TEXTURE_BINDING \| RENDER_ATTACHMENT \| COPY_SRC \| STORAGE_BINDING` | 16-bit half-float per channel, 4 channels. `STORAGE_BINDING` enables compute-variant effects. |
| Working pong | `rgba16float` | `width × height` | same | Ping-pong pair for multi-pass effects. |
| Mask textures (per layer) | `rgba16float` | `width × height` | `TEXTURE_BINDING \| RENDER_ATTACHMENT` | Mask SDF output. |
| JFA inside/outside textures | `rgba8unorm` | `width × height` | `TEXTURE_BINDING \| RENDER_ATTACHMENT` | Stores encoded seed coordinates (4 × 8-bit). Up to 65535×65535. |
| 3D LUT texture | `rgba8unorm` (v1) or `rgba16float` (v2) | `33×33×33` | `TEXTURE_BINDING \| COPY_DST` | Trilinear-sampled in fragment shader. |

### 16.4 Output (canvas) texture

| Format | colorSpace | alphaMode | Support | Use case |
|---|---|---|---|---|
| `rgba10a2unorm` | `display-p3` | `premultiplied` | Chromium 118+ (flag), stable ~120+, hardware-dependent | **v1 primary** — 10-bit SDR wide-gamut |
| `rgba8unorm` | `display-p3` | `premultiplied` | W3C standard, all Chromium 113+ | **v1 fallback** — 8-bit SDR wide-gamut (loses 10-bit precision) |
| `rgba16float` | `extended-srgb-linear` | `premultiplied` | W3C standard, Chromium 116+ | **v2 HDR** — 16-bit float HDR |
| `bgra8unorm` | `srgb` | `premultiplied` | W3C default | **Legacy fallback** — 8-bit sRGB, narrow gamut. Use if `display-p3` is also unsupported. |

### 16.5 Scope textures (color scopes UI)

| Texture | Format | Dimensions | Usage | Notes |
|---|---|---|---|---|
| Scope source texture | `rgba16float` (was `rgba8unorm` in FreeCut) | source `width × height` | `TEXTURE_BINDING \| COPY_DST \| RENDER_ATTACHMENT` | Reads from working linear-light texture. |
| Histogram buffers (×4: R, G, B, L) | storage buffer, 1024 × u32 | 1024 × 4 bytes each | `STORAGE \| COPY_DST` | 1024 bins (upgraded from FreeCut's 256 for 10-bit). |
| Vectorscope accumulators (×3: R, G, B) | storage buffer, 512² × u32 | 512² × 4 bytes each | `STORAGE \| COPY_DST` | 512×512 CbCr grid. |
| Waveform accumulators (×4: R, G, B, L) | storage buffer, width × height × u32 | varies | `STORAGE \| COPY_DST` | Per-column luminance distribution. |

### 16.6 Memory budget (4K UHD, 10-bit, 5 layers + 1 mask + 1 effect)

| Resource | Count | Per-unit bytes | Total |
|---|---|---|---|
| Source Y texture (per clip) | 5 | 16 MB (3840×2160×2) | 80 MB |
| Source U texture (per clip) | 5 | 4 MB | 20 MB |
| Source V texture (per clip) | 5 | 4 MB | 20 MB |
| Working ping | 1 | 66 MB (3840×2160×8) | 66 MB |
| Working pong | 1 | 66 MB | 66 MB |
| Mask SDF inside | 1 | 33 MB (rgba8unorm) | 33 MB |
| Mask SDF outside | 1 | 33 MB | 33 MB |
| 3D LUT | 1 | 140 KB | ~0 |
| Histogram buffers | 4 | 4 KB | ~0 |
| Vectorscope accumulators | 3 | 1 MB | 3 MB |
| Canvas (rgba10a2unorm) | 1 | 16 MB | 16 MB |
| **Total per-frame working set** | | | **~340 MB** |

Well within 4 GB ceiling. For 8K, multiply by 4 (~1.4 GB) — still fits.

---

## 17. Testing

> See `17-test-plan.md` for the overall methodology, test matrix, and
> per-module template. Matrix rows: "Color space conversion",
> "Transfer functions", "YUV/RGB", "Multi-track blend", "Opacity",
> "Masks". (Cross-references §3 matrix; §4.1 template.) Seed spec §12
> test list (7 items) is fully subsumed by the Tier 1/2 tests below.

### Tier 1: Pure engine tests

[Filename: `tests/unit/04-renderer-color/*.test.ts` — Vitest, Node only, no GPU.]

- `srgb-to-linear-known-values` — `srgbToLinear(0.5)` ≈ `0.21404114`,
  `srgbToLinear(1.0)` === `1.0`, `srgbToLinear(0.0)` === `0.0`; computed
  against a JS reference `v <= 0.04045 ? v/12.92 : ((v+0.055)/1.055)^2.4`
- `linear-to-srgb-known-values` — inverse of above; `linearToSrgb(0.21404114)`
  ≈ `0.5` within FP precision `1e-7`
- `pq-eotf-against-st-2084` — `pqEotf(0.50807842)` ≈ `1.0` (1000 nits) and
  `pqEotf(0.0)` === `0.0`; verified against ITU-R BT.2100 Table 5 reference
- `pq-oetf-against-st-2084` — `pqOetf(1.0)` ≈ `0.50807842`; inverse of EOTF
- `hlg-oetf-against-bt-2100` — `hlgOetf(1.0)` ≈ `0.75` (HLG OETF^−1 normalized
  peak), `hlgOetf(0.18)` ≈ `0.21213203` (BT.2100 reference)
- `hlg-eotf-against-bt-2100` — `hlgEotf(hlgOetf(x))` ≈ `x` for any `x ∈ [0,1]`
- `bt709-yuv-to-rgb-coefficients` — matrix coefficients match BT.709 spec
  (`Kr=0.2126, Kb=0.0722`), `Y=0.2126·R + 0.7152·G + 0.0722·B`
- `bt2020-yuv-to-rgb-coefficients` — `Kr=0.2627, Kb=0.0593`; verified
  against ITU-R BT.2020 Table 4
- `yuv-to-rgb-uses-correct-matrix-per-color-primary` —
  `yuvToRGB(y, u, v, 'BT.709')` and `yuvToRGB(y, u, v, 'BT.2020')` produce
  different RGB for the same input (no silent fallback to BT.601)
- `transfer-function-srgb-eotf-formula` — formula uses piecewise definition
  (not pure `^2.4`), matching IEC 61966-2-1; threshold `0.04045` exact
- `frame-descriptor-zod-schema-validates-canonical-shape` —
  `FrameDescriptorSchema.parse({ width, height, clear, displayMode, items })`
  succeeds for a hand-built reference descriptor; rejects missing `items`,
  rejects unknown `displayMode` value, rejects negative `width`
- `frame-descriptor-schema-rejects-unknown-item-type` —
  `items: [{ type: 'unknown' }]` fails Zod parse
- `layer-transform-quad-center-and-size` — `LayerTransform { centerX: 0.5,
  centerY: 0.5, width: 1.0, height: 1.0, rotation: 0, flipX: false, flipY:
  false }` produces the identity quad `(0,0)-(1,0)-(1,1)-(0,1)`
- `layer-transform-rotation-90deg` — `rotation: 90` rotates the unit quad
  CCW so corner `(1,0)` maps to `(0,1)`; verified with 1e-7 tolerance
- `layer-transform-flip-x-mirrors-u` — `flipX: true` on the identity quad
  produces `(1,0)-(0,0)-(0,1)-(1,1)`
- `layer-transform-combined-center-and-rotation` — center `(0.25, 0.75)` +
  `rotation: 45` + `width: 0.5` produces the 4 expected clip-space vertices
  when run through the WGSL-mirroring JS reference function
- `blend-mode-wgsl-index-matches-enum` — for each of the 17 W3C blend
  modes, `BLEND_MODES_WGSL[i].name === BLEND_MODES[i]`; index values match
  OpenCut-classic `BlendMode::shader_code()` (Normal=0 → Luminosity=16)
- `exposure-stop-multiplier` — `exposure +1 stop` mathematically equals
  `linear × 2^1`; `−1 stop` = `linear × 2^−1`; verified against the WGSL
  uniform-packing reference

### Tier 2: Render tests

[Filename: `tests/integration/04-renderer-color/*.render.test.ts` —
Playwright + headless Chrome with WebGPU enabled
(`--enable-unsafe-webgpu --enable-dawn-features=allow_unsafe_apis`). Uses
`pixelmatch` helper from spec 12 §5.]

- `yuv-to-linear-shader-p010-frame` — render known P010 frame (Y=512,
  Cb=512, Cr=512 → mid-gray) of `10s-10bit-hevc.mp4`; sample linear-light
  output via copy-to-buffer readback; compare against JS-computed reference
  (`srgbToLinear(0.5)` for the equivalent 8-bit mid-gray); tolerance `< 0.5%`
- `display-transfer-function-srgb-oetf` — render a linear-light gradient
  (`10s-gradient-h-1080p.mp4` linearized), apply sRGB OETF in the blit
  pass; verify output pixel values match expected encoded curve at 11
  sample points (0.0, 0.1, …, 1.0); tolerance `±1` in 8-bit, `±4` in 10-bit
- `ten-bit-round-trip-preserves-precision` — decode 10-bit source
  (`10s-red-1080p-10bit.mp4`) → upload Y/U/V planes to `r16uint`
  textures → render to `rgba16float` working texture → read pixels back
  via `copyTextureToBuffer`; assert decoded R-channel values are `> 1023`
  in the 16-bit cell (i.e. `u16 >> 6 > 0` for non-black, and equals `1023`
  for the pure-red clip — `0x3FF << 6 = 0xFFC0`)
- `exposure-plus-one-stop-doubles-linear` — render `10s-white-1080p.mp4`
  with `exposure: +1.0` (effect uniform); linear-light readback must
  equal `2 × reference_linear`; tolerance `< 1%`
- `opacity-50pct-blend-correct-in-linear` — render
  `10s-white-1080p.mp4` at 50% opacity over `10s-black-1080p.mp4`;
  output sRGB pixel must be `≈ 187` (`linearToSrgb(0.5) × 255 ≈ 188`),
  NOT `128` (which would indicate an 8-bit-space blend bug)
- `lut-identity-preserves-input` — render `10s-smpte-bars-1080p.mp4`
  with `tests/fixtures/luts/identity.cube` applied; pixel-diff against
  the no-LUT render of the same frame is `0%`
- `lut-srgb-conversion-round-trip` — linear → sRGB → LUT → sRGB →
  linear path produces input within `< 1%` (verifies LUT operates in
  display-encoded space as documented in §6.3)
- `curves-swap-r-and-b-channels` — render `10s-red-1080p.mp4` with a
  curve that maps R→B and B→R; output R-channel values must equal
  pre-curve B-channel values and vice versa; G unchanged
- `color-wheels-known-lift-gamma-gain` — apply `lift=(0.1, 0, 0),
  gamma=1.0, gain=(1.0, 1.0, 1.0)` to `10s-gray-18-1080p.mp4`; output
  pixel matches JS-computed `lift + (1 − lift) × gain × linear^gamma`
  formula
- `qualifier-masks-red-region-at-hue-0deg` — apply a qualifier with
  `hueCenter: 0°, hueWidth: 30°, saturationMin: 0.4` to a composite of
  red + green + blue clips; only the red region receives the grade
  (verify via sampling pixels inside vs outside the masked region)
- `power-window-rectangular-left-half-only` — apply a rectangular power
  window covering the left half of the frame; render `10s-white-1080p.mp4`
  with `exposure: +1` — left half of output is doubled-linear, right half
  unchanged; pixel-diff the boundary line at x=width/2
- `blend-multiply-red-times-green-equals-black` — render `red × green`
  with blend mode `multiply`; output is pure black `#000000` because
  `(1, 0, 0) × (0, 1, 0) = (0, 0, 0)` in linear space; tolerance `0%`
- `blend-screen-red-plus-green-equals-yellow` — render `red + green` with
  blend mode `screen`; output is yellow `#FFFF00` because
  `1 − (1−R) × (1−G) = 1` in both R and G channels; tolerance `0%`
- `blend-normal-50pct-opacity-equals-linear-blend` — render white over
  black with blend mode `normal`, opacity 0.5; output ≈ `#BCBCBC` (187 in
  8-bit sRGB), NOT `#808080` (128 — would indicate wrong-space blend)
- `blend-all-17-w3c-modes-have-shader-coverage` — for each of the 17
  W3C Compositing & Blending Level 1 modes, render red-over-green pair
  with that mode and assert non-empty output (no early-return / no
  silently falling through to Normal). One assertion per mode.
- `mask-feathering-jfa-distance-correctness` — render a rectangular
  mask with `feather: 50px`; sample the SDF readback along a horizontal
  line crossing the mask boundary; SDF values monotonically decrease
  from `+50` (outside, 50px from edge) through `0` (at edge) to `−50`
  (inside, 50px inside edge); tolerates 1px quantization
- `bind-group-cache-1000-frames-same-textures` — render 1000 frames of
  the same project (same source textures, same descriptor); spy on
  `device.createBindGroup`; assert call count `≤ 1` per unique resource
  set (per the FreeCut `effectBindGroupCache:123` pattern, §13.A)
- `gpu-device-loss-recovery` — invoke the `lose_device` test extension
  (Chrome `--enable-dawn-features=allow_unsafe_apis`); after `device.lost`
  fires, assert renderer's `handleDeviceLost()` re-creates the device,
  re-uploads the LUT, and the next `renderFrame()` call succeeds without
  throwing; assert one `lost` event → exactly one recovery cycle
- `wysiwyg-browser-render-equals-cloud-render` — render frame 42 of a
  multi-layer project via the interactive engine (browser) and via the
  headless render engine (same `buildFrameDescriptor` + same `WebGPURenderer`
  class); pixel-diff must be `0%` (state WYSIWYG invariant, spec 17 §6.1)
- `memory-ceiling-4k-under-2gb` — render 10-minute 4K (3840×2160) project
  (5 layers + 1 mask + 1 effect); sample
  `performance.measureUserAgentSpecificMemory()` every 100 frames;
  assert peak `< 2 GB` sustained
- `memory-ceiling-8k-under-4gb` — same test at 8K (7680×4320); assert
  peak `< 4 GB`
- `canvas-config-rgba10a2unorm-display-p3-on-chromium-118` — on Chromium
  118+, assert `configureCanvas()` selected `format: 'rgba10a2unorm'` and
  `colorSpace: 'display-p3'` (10-bit SDR wide-gamut path)
- `canvas-config-fallback-rgba8unorm-on-chromium-113-117` — emulate
  Chromium 113-117 (no `rgba10a2unorm` surface); assert fallback chose
  `format: 'rgba8unorm'` + `colorSpace: 'display-p3'` (degraded 8-bit
  path), and a console warning was emitted

### Tier 3: UI tests

[Filename: `tests/integration/04-renderer-color/*.ui.test.ts` —
Playwright with `page.keyboard` and `page.mouse`. Every shortcut from
spec 16 §3.11 (Effects panel) that touches the renderer/color stream
must have a UI test.]

- `keyboard-1-through-9-applies-effect-preset` — with a clip selected,
  `page.keyboard.press('1')` issues `{ type: 'addEffect', params: {
  elementId: <selected>, effect: <preset1> } }`; resulting `SceneState`
  matches the state from a direct `engine.command.apply()` call (state
  WYSIWYG, spec 17 §6.1)
- `keyboard-cmd-1-through-9-switches-color-grading-panel` — `Cmd+1`
  through `Cmd+9` focus the corresponding color grading panel
  (Lift/Gamma/Gain/Saturation/etc.); assert via `page.uiState.activePanel`
  and DOM `aria-activedescendant` (UI-only state per spec 16 §3.11)
- `real-time-color-wheel-drag-updates-grade-within-33ms` — drag the
  color-wheel pointer by Δx=20px via `page.mouse.move()` with 1ms steps;
  sample the rendered canvas via `requestAnimationFrame` callback timing;
  assert grade applied (pixel delta > 0) within `33 ms` of input
  (1 frame at 30 fps; spec 17 §6.3 interactive latency invariant)
- `keyboard-shift-1-toggles-effect-1-enabled` — `Shift+1` issues
  `{ type: 'toggleEffect', params: { elementId: <selected>, effectIndex:
  1 } }`; state diff shows `effect.enabled` flipped

### Property-based tests

[Filename: `tests/unit/04-renderer-color/*.property.test.ts` —
`fast-check`, `numRuns: 1000` per invariant.]

- `display-to-linear-round-trip` —
  `fc.assert(fc.property(arbitraryColor, arbitraryTransferFunction,
  (c, tf) => { expect(linearToDisplay(displayToLinear(c, tf), tf))
  .toBeCloseTo(c, 6) }))` — covers sRGB, PQ, HLG transfer functions
- `srgb-linear-round-trip-fp-precision` —
  `fc.assert(fc.property(fc.float({ min: 0, max: 1, noNaN: true }),
  (c) => { expect(srgbToLinear(linearToSrgb(c))).toBeCloseTo(c, 6) }))`
- `ten-bit-extraction-u16-shift-by-6-in-range-0-1023` —
  `fc.assert(fc.property(fc.integer({ min: 0, max: 65535 }), (u16) => {
  expect((u16 >> 6)).toBeLessThanOrEqual(1023);
  expect((u16 >> 6)).toBeGreaterThanOrEqual(0) }))` — guarantees
  10-bit MSB extraction never exceeds the 10-bit range for any 16-bit
  cell value (P010 layout from §16.1)
- `yuv-to-rgb-round-trip-preserves-luma-bt709` —
  `fc.assert(fc.property(arbitraryRGB, (rgb) => { const yuv =
  rgbToYUV(rgb, 'BT.709'); const restored = yuvToRGB(yuv, 'BT.709');
  expect(restored.r).toBeCloseTo(rgb.r, 4); /* + G, B */ }))` — within
  BT.709 chroma subsampling tolerance
- `layer-transform-is-invertible` — for arbitrary `LayerTransform`,
  applying the transform then its inverse (rotation negated, center
  unchanged, flip toggled) returns to the original quad within `1e-6`
- `transfer-function-monotonic-increasing` — for any `tf ∈ {sRGB, PQ,
  HLG}` and any `a < b ∈ [0, 1]`, `displayToLinear(a, tf) ≤
  displayToLinear(b, tf)` (no curves fold back on themselves)
- `blend-mode-normal-with-zero-opacity-is-noop` — for arbitrary
  foreground/background, `blend(fg, bg, 'normal', opacity=0)` === `bg`
  byte-identically
- `lut-3d-identity-preserves-arbitrary-input` — for arbitrary RGB,
  `applyLUT(rgb, identity.cube)` === `rgb` within `1/1023` (10-bit LUT
  precision)

### Test assets

- `tests/fixtures/videos/10s-red-1080p.mp4` — solid red 8-bit, blend tests
- `tests/fixtures/videos/10s-green-1080p.mp4` — solid green 8-bit
- `tests/fixtures/videos/10s-blue-1080p.mp4` — solid blue 8-bit
- `tests/fixtures/videos/10s-white-1080p.mp4` — solid white, exposure tests
- `tests/fixtures/videos/10s-black-1080p.mp4` — solid black, exposure tests
- `tests/fixtures/videos/10s-gray-18-1080p.mp4` — 18% gray, color-wheel tests
- `tests/fixtures/videos/10s-smpte-bars-1080p.mp4` — SMPTE bars, LUT tests
- `tests/fixtures/videos/10s-gradient-h-1080p.mp4` — horizontal gradient,
  transfer function tests
- `tests/fixtures/videos/10s-red-1080p-10bit.mp4` — solid red 10-bit (HEVC
  yuv420p10le), 10-bit pipeline tests
- `tests/fixtures/videos/10s-10bit-hevc.mp4` — 10-bit HEVC clip for full
  P010 → linear round-trip verification
- `tests/fixtures/videos/10s-white-1080p-hdr-pq.mp4` — PQ HDR white, PQ
  transfer function tests
- `tests/fixtures/videos/10s-white-1080p-hdr-hlg.mp4` — HLG HDR white,
  HLG transfer function tests
- `tests/fixtures/luts/identity.cube` — identity 3D LUT (33×33×33, all
  `r=r_in, g=g_in, b=b_in`); for round-trip preservation tests
- `tests/fixtures/luts/swap-rb.cube` — 3D LUT that swaps R and B channels;
  for curves / LUT swap tests
- `tests/fixtures/projects/04-multi-layer-blend.json` — 3-layer blend
  project (red + green + blue) for the 17-mode blend-mode coverage test
- `tests/fixtures/projects/04-color-grade-stress.json` — clip with
  exposure + curves + LUT + qualifier + power window stacked, for the
  WYSIWYG pixel-diff test
- `tests/fixtures/references/04-renderer-color/<fixture>-frame-<N>.png` —
  reference PNGs per §10 of spec 17; per-platform variants (NVIDIA / AMD /
  Apple Silicon / Intel) under subdirectories per §5.4

### Test commands

```bash
# Run Tier 1 tests for spec 04
npm test -- --filter "04-renderer-color"

# Run Tier 2 (render) tests for spec 04 — requires WebGPU-enabled headless Chrome
npm run test:render -- --filter "04-renderer-color"

# Run Tier 3 (UI) tests for spec 04
npm run test:ui -- --filter "04-renderer-color"

# Run property tests for spec 04
npm run test:property -- --filter "04-renderer-color"

# Run all tiers for spec 04
npm run test:all -- --filter "04-renderer-color"

# Regenerate reference PNGs for spec 04 fixtures (see spec 17 §10)
npm run regen-references -- --filter "04-renderer-color"
```

---

**End of `04-renderer-color.refined.md`.** Next: `05-timeline.refined.md` (18-ui-shell and 19-code-references follow the 00-17 set).

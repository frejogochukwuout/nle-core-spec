# 04 — Renderer & Color: WebGPU, 10-bit Pipeline, Scene-Linear Color Management

**Stream:** GPU rendering pipeline + color management
**Status:** Seed spec (sub-agent scout will refine with code references)
**Primary teacher:** FreeCut `gpu-*` infrastructure (ported to 10-bit scene-linear)
**Spec file:** `04-renderer-color.md`

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
│ Decoded VideoFrame                                       │
│  - pixelFormat: P010 (10-bit YUV 4:2:0 planar)           │
│  - colorSpace: BT.709 (SDR) or BT.2020 (HDR)             │
└──────────────┬───────────────────────────────────────────┘
               │ uploadTexture (copyExternalImageToTexture)
               ▼
┌──────────────────────────────────────────────────────────┐
│ GPU Texture: Source YUV planes                            │
│  - Y plane: r16uint (16-bit, holds 10-bit Y + 6 pad)    │
│  - UV plane: rg16uint (16-bit interleaved, 10-bit each)  │
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
│  - format: rgba10a2unorm (10-bit per channel)            │
│  - colorSpace: 'display-p3' (wide gamut) or 'extended-srgb' (HDR) │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Texture Format Chain

### 5.1 Source YUV textures

```ts
// Y plane (luma) — 10-bit per pixel
const yTexture = device.createTexture({
  size: { width, height },
  format: 'r16uint',  // 16-bit, holds 10-bit Y in low bits, 6 padding
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
});

// UV plane (chroma) — 10-bit interleaved, half resolution (4:2:0)
const uvTexture = device.createTexture({
  size: { width: width / 2, height: height / 2 },
  format: 'rg16uint',  // 16-bit per channel, holds 10-bit U + 10-bit V
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
});
```

**Upload path:**
```ts
// VideoFrame (P010) → GPU textures
// P010 layout: Y plane (10-bit values in 16-bit cells), then UV plane (interleaved 10-bit values in 16-bit cells)
device.queue.copyExternalImageToTexture(
  { source: videoFrame },  // P010 VideoFrame
  { texture: yTexture, colorSpace: 'srgb' },  // or specify color space explicitly
  { width, height }
);
```

**Sub-agent scout task:** Verify that `copyExternalImageToTexture` correctly handles P010 `VideoFrame` → `r16uint` / `rg16uint` textures. May need to use `device.queue.writeTexture` with raw bytes instead. Check WebGPU spec / Chromium implementation.

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
const canvasConfig: GPUCanvasConfiguration = {
  device,
  format: 'rgba10a2unorm',  // 10-bit per channel + 2-bit alpha
  colorSpace: 'display-p3',  // wide gamut (SDR)
  // For HDR: colorSpace: 'extended-srgb'
  alphaMode: 'premultiplied',
};
canvas.getContext('webgpu').configure(canvasConfig);
```

**Why `rgba10a2unorm`:**
- 10-bit per channel matches P010 source precision
- Standard format, well-supported on Chromium 113+
- `display-p3` color space gives wide gamut (covers most consumer displays)

**Alternative:** `rgba16float` for the canvas too (if we want HDR output). But:
- `rgba16float` canvas requires `extended-srgb` color space
- Less widely supported
- May not be supported on all HDR displays
- Stick with `rgba10a2unorm` + `display-p3` for v1; add HDR canvas later

---

## 6. Color Space Management

### 6.1 Input color space detection

When a video file is imported, detect its color space:
- Container metadata (MP4 `colr` atom, MKV track headers) — mediabunny may expose this
- Default to BT.709 for SDR, BT.2020 for HDR

```ts
interface MediaColorInfo {
  primaries: 'bt709' | 'bt2020' | 'smpte-c' | 'display-p3';
  transfer: 'srgb' | 'pq' | 'hlg' | 'bt709';  // sRGB EOTF, PQ EOTF, HLG OETF
  matrix: 'bt709' | 'bt2020-ncl' | 'bt601';
  range: 'limited' | 'full';
}
```

Store this on the `MediaInfo` (see `09-project-model.md`).

### 6.2 Color pipeline shaders

```wgsl
// yuv_to_linear.wgsl
// Converts P010 YUV (r16uint + rg16uint) to linear-light RGB (rgba16float)

struct YuvToRgbUniforms {
  kr: f32,        // BT.709: 0.2126, BT.2020: 0.2627
  kb: f32,        // BT.709: 0.0722, BT.2020: 0.0593
  range: f32,     // 0 = limited (16-235), 1 = full (0-255)
  _pad: f32,
}

@group(0) @binding(0) var y_tex: texture_2d<u32>;     // r16uint
@group(0) @binding(1) var uv_tex: texture_2d<u32>;    // rg16uint
@group(0) @binding(2) var<uniform> uniforms: YuvToRgbUniforms;

fn decode_y(u16: u32) -> f32 {
  let raw = f32(u16 & 0x3FF);  // 10-bit value
  let range_scale = select((raw - 64.0) / 876.0, raw / 1023.0, uniforms.range > 0.5);
  return clamp(range_scale, 0.0, 1.0);
}

fn decode_uv(u16: u32) -> f32 {
  let raw = f32(u16 & 0x3FF);  // 10-bit value
  let range_scaled = select((raw - 64.0) / 896.0, raw / 1023.0, uniforms.range > 0.5);
  return (range_scaled - 0.5) * 0.5;  // UV is [-0.5, 0.5]
}

fn inverse_transfer(c: f32, transfer: u32) -> f32 {
  // 0 = sRGB EOTF, 1 = PQ EOTF, 2 = HLG OETF
  switch transfer {
    case 0: {  // sRGB EOTF
      return select(c / 12.92, pow((c + 0.055) / 1.055, 2.4), c > 0.04045);
    }
    case 1: {  // PQ EOTF (HDR)
      let m1 = 0.1593017578125;
      let m2 = 78.84375;
      let c1 = 0.8359375;
      let c2 = 18.8515625;
      let c3 = 18.6875;
      let n = pow(c, 1.0 / m2);
      let L = pow(max(n - c1, 0.0) / (c2 - c3 * n), 1.0 / m1);
      return L * 10000.0;  // PQ is normalized to 10,000 nits
    }
    case 2: {  // HLG OETF (HDR)
      // OETF^-1 — HLG is a hybrid log-gamma
      return select(c * c / 3.0, (exp((c - 0.55991073) / 0.17883277) + 0.28466892) / 12.0, c > 0.5);
    }
    default: { return c; }
  }
}

@fragment
fn yuv_to_linear_fragment(in: VertexOutput) -> @location(0) vec4f {
  let y = decode_y(textureLoad(y_tex, vec2<i32>(in.tex_coord * vec2<f32>(uniforms.width, uniforms.height)), 0).r);
  let uv = textureLoad(uv_tex, vec2<i32>(in.tex_coord * vec2<f32>(uniforms.width / 2.0, uniforms.height / 2.0)), 0).rg;
  let u = decode_uv(uv.r);
  let v = decode_uv(uv.g);
  
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

**Sub-agent scout task:** This is critical shader code. Verify the YUV→RGB matrix coefficients for BT.709 and BT.2020. Verify the sRGB EOTF, PQ EOTF, and HLG OETF formulas. Reference:
- ITU-R BT.709 (sRGB transfer is essentially BT.709 with slight modification)
- ITU-R BT.2020
- ITU-R BT.2100 (HDR PQ and HLG)

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
  let color = textureSample(input_tex, texSampler, in.tex_coord);  // linear-light
  
  let mapped = tone_map(color);  // apply tone mapping if needed
  
  let display = apply_display_transfer(mapped, uniforms.transfer);
  
  return vec4f(display.rgb, color.a);
}

fn apply_display_transfer(c: vec3f, transfer: u32) -> vec3f {
  switch transfer {
    case 0: {  // sRGB OETF (for SDR display)
      return select(c * 12.92, 1.055 * pow(c, vec3f(1.0 / 2.4)) - 0.055, c > 0.0031308);
    }
    case 1: {  // PQ OETF (for HDR display)
      let m1 = 0.1593017578125;
      let m2 = 78.84375;
      let c1 = 0.8359375;
      let c2 = 18.8515625;
      let c3 = 18.6875;
      let L = c / 10000.0;  // input is in nits
      let n = pow(max(L, 0.0), m1);
      return clamp(pow((c1 + c2 * n) / (1.0 + c3 * n), vec3f(m2)), vec3f(0.0), vec3f(1.0));
    }
    case 2: {  // HLG OETF (for HDR display)
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

### 7.1 The `WebGPURenderer` class

```ts
// src/platform/renderer/WebGPURenderer.ts

class WebGPURenderer implements Renderer {
  private device: GPUDevice;
  private context: GPUCanvasContext;
  private format: GPUTextureFormat;
  
  // Pipeline cache
  private pipelines: Map<string, GPURenderPipeline> = new Map();
  
  // Bind group cache (KEY optimization FreeCut doesn't have)
  private bindGroupCache: Map<string, GPUBindGroup> = new Map();
  
  // Texture pool (recycle scratch textures across frames)
  private texturePool: TexturePool;
  
  async initialize(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<void> {
    if (!navigator.gpu) throw new Error('WebGPU not supported');
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) throw new Error('No GPU adapter');
    this.device = await adapter.requestDevice();
    
    this.context = canvas.getContext('webgpu');
    this.format = 'rgba10a2unorm';  // 10-bit output
    this.context.configure({
      device: this.device,
      format: this.format,
      colorSpace: 'display-p3',  // wide gamut
      alphaMode: 'premultiplied',
    });
    
    this.device.lost.then(info => this.handleDeviceLost(info));
  }
  
  async renderFrame(descriptor: FrameDescriptor): Promise<RenderResult> {
    const encoder = this.device.createCommandEncoder();
    
    // 1. Decode + linearize each source texture (YUV → linear-light RGB)
    const layerTextures = await this.uploadAndLinearizeSources(descriptor.layers);
    
    // 2. Composite layers in linear-light space
    let sceneTexture = this.texturePool.acquire('working', descriptor.width, descriptor.height, 'rgba16float');
    for (const layer of descriptor.layers) {
      const layerTexture = layerTextures.get(layer.id);
      const effectTexture = await this.applyEffects(layerTexture, layer.effects);
      const maskedTexture = await this.applyMask(effectTexture, layer.mask);
      sceneTexture = this.composite(sceneTexture, maskedTexture, layer.blendMode, layer.opacity);
    }
    
    // 3. Apply scene-level effects
    for (const effect of descriptor.sceneEffects) {
      sceneTexture = this.applyEffect(sceneTexture, effect);
    }
    
    // 4. Apply display transfer function + tone mapping
    const displayTexture = this.applyDisplayTransfer(sceneTexture, descriptor.displayMode);
    
    // 5. Blit to canvas
    const canvasView = this.context.getCurrentTexture().createView();
    this.encodeBlit(encoder, displayTexture, canvasView);
    
    this.device.queue.submit([encoder.finish()]);
    
    return { texture: displayTexture };
  }
  
  async readPixels(texture: GPUTexture, format: 'rgb24' | 'yuv422p10le'): Promise<Uint8ClampedArray | Uint16Array> {
    // For cloud render — read back pixels for ffmpeg piping
    // ... (see 11-cloud-render.md for details)
  }
}
```

### 7.2 Bind group caching (key optimization)

FreeCut re-creates bind groups per layer per frame (no caching). This is wasteful. We cache by hash:

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
  // Hash texture IDs, uniform values, etc.
  // ...
}
```

**Sub-agent scout task:** Verify FreeCut's actual bind group creation pattern. Read `gpu-effects/effects-pipeline.ts`, `gpu-compositor/compositor-pipeline.ts` for the bind group construction. Quantify the per-frame overhead (rough estimate).

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

**Adopted from:** FreeCut `rust/crates/compositor/src/texture_pool.rs` (well, the concept — we re-implement in TS). Sub-agent to verify the OpenCut-classic Rust implementation.

---

## 8. WGSL Shader Inventory

We need these shaders (mapped from FreeCut's, ported to linear-light):

### 8.1 Core pipeline

| Shader | Purpose | FreeCut reference |
|---|---|---|
| `fullscreen.wgsl` | Vertex shader — fullscreen quad | `rust/crates/gpu/src/shaders/fullscreen.wgsl` |
| `blit.wgsl` | Simple texture copy | `rust/crates/gpu/src/shaders/blit.wgsl` |
| `yuv_to_linear.wgsl` | P010 → linear-light RGB | NEW (FreeCut uses `<video>` + `importExternalTexture`) |
| `linear_to_display.wgsl` | Linear-light RGB → display-encoded | NEW |

### 8.2 Composition

| Shader | Purpose | FreeCut/OpenCut reference |
|---|---|---|
| `layer.wgsl` | Draw one layer with transform + opacity | OpenCut `rust/crates/compositor/src/shaders/layer.wgsl` |
| `blend.wgsl` | 17 W3C blend modes + Porter-Duff alpha | OpenCut `rust/crates/compositor/src/shaders/blend.wgsl` — **copy almost verbatim** (the math is correct in linear-light) |
| `mask.wgsl` | Mask alpha multiply | OpenCut `rust/crates/compositor/src/shaders/mask.wgsl` |

### 8.3 Effects

| Shader | Purpose | FreeCut reference |
|---|---|---|
| `gaussian_blur.wgsl` | 61-tap separable Gaussian | OpenCut `rust/crates/effects/src/shaders/gaussian_blur.wgsl` |
| `color_wheels.wgsl` | Resolve-style 4-wheel grading | FreeCut `gpu-effects/effects/color.ts:611` (port to linear) |
| `curves.wgsl` | Per-channel curves via 1D LUT | FreeCut `gpu-effects/effects/color.ts:1460` |
| `levels.wgsl` | Levels (input/output/black/white) | FreeCut |
| `lut.wgsl` | 3D LUT application | FreeCut `gpu-effects/effects/lut.ts:18` |
| `secondary_qualifier.wgsl` | HSL qualifier | FreeCut `gpu-effects/effects/color.ts:942` |
| `power_window.wgsl` | Mask shapes (rectangle, ellipse, polygon) | FreeCut `gpu-effects/effects/color.ts:1180` |
| `vibrance.wgsl` | Vibrance | FreeCut `gpu-effects/effects/color.ts:1390` |

### 8.4 Mask feathering

| Shader | Purpose | OpenCut reference |
|---|---|---|
| `jfa_init.wgsl` | JFA seed pass | OpenCut `rust/crates/masks/src/shaders/jfa_init.wgsl` |
| `jfa_step.wgsl` | JFA propagation | OpenCut `rust/crates/masks/src/shaders/jfa_step.wgsl` |
| `jfa_distance.wgsl` | SDF combine + feather | OpenCut `rust/crates/masks/src/shaders/jfa_distance.wgsl` |

**Adopt OpenCut's JFA shaders** but consider rewriting as **compute shaders** for ~2x perf on WebGPU (OpenCut uses fragment shaders for WebGL2 compatibility — we don't need that).

### 8.5 Color scopes (compute shaders)

| Shader | Purpose | FreeCut reference |
|---|---|---|
| `histogram.wgsl` | Histogram (compute) | FreeCut `gpu-scopes/histogram-scope.ts` (port to 16-bit input) |
| `waveform.wgsl` | Waveform/luminance scope (compute) | FreeCut `gpu-scopes/waveform-scope.ts` |
| `vectorscope.wgsl` | Vectorscope (compute) | FreeCut `gpu-scopes/vectorscope-scope.ts` |

---

## 9. The WYSIWYG Contract (Renderer Side)

For any project state and frame number N:

1. **Browser render path:**
   - Decode frame N (mediabunny → P010 `VideoFrame`)
   - Upload to Y/UV textures
   - YUV → linear-light (shader)
   - Composite + grade in linear-light
   - Apply display transfer function (sRGB OETF)
   - Output to `rgba10a2unorm` canvas

2. **Cloud render path:**
   - Decode frame N (same mediabunny, same P010)
   - Upload to Y/UV textures (same)
   - YUV → linear-light (same shader)
   - Composite + grade in linear-light (same)
   - Apply display transfer function (same sRGB OETF)
   - Output to `rgba10a2unorm` `OffscreenCanvas`
   - Read pixels → pipe to ffmpeg

**Same code, same shaders, same color pipeline.** Pixels must be bit-identical.

**Test:** pixel-diff browser render vs cloud render for 100 test frames. 0% difference required.

---

## 10. GPU Memory Budget

For a 4K UHD (3840×2160) 10-bit project:

| Texture | Format | Size |
|---|---|---|
| Source Y (per clip) | r16uint | ~16 MB |
| Source UV (per clip) | rg16uint | ~8 MB |
| Working ping-pong A | rgba16float | ~66 MB |
| Working ping-pong B | rgba16float | ~66 MB |
| Mask textures (per mask) | rgba16float | ~66 MB |
| LUT 3D texture (33×33×33) | rgba16float | ~280 KB |
| Histogram buffer | rgba32uint | ~16 KB |
| Canvas (output) | rgba10a2unorm | ~16 MB |

**Per-frame working set (5 layers, 1 mask, 1 effect):**
- 5 sources: ~120 MB
- Working: ~132 MB
- Mask: ~66 MB
- Total: ~320 MB

Well within the 4 GB ceiling.

For 8K (7680×4320), multiply by 4: ~1.3 GB per frame working set. Still fits in cloud render mode (stripped of UI).

---

## 11. Open Questions for Sub-Agent Scout

1. **FreeCut GPU infrastructure.** Read all of FreeCut's `src/infrastructure/gpu-*/` directories. List every file. For each, summarize:
   - Purpose
   - Texture formats used
   - Whether it has color-management awareness
   - Bind group caching strategy (or lack thereof)
   - Pipeline cache (does it cache `GPURenderPipeline` by descriptor hash?)

2. **FreeCut `compositor-pipeline.ts`.** Read in full. Document:
   - How it composites multiple layers
   - Ping-pong texture management
   - Effect pass ordering
   - Mask integration

3. **FreeCut `effects-pipeline.ts`.** Read in full. Document:
   - Effect registration
   - Effect chain execution
   - Uniform packing
   - 3D LUT upload path

4. **FreeCut `gpu-texture-pool.ts`.** Read in full. Document:
   - Pool eviction policy
   - Cross-frame reuse pattern
   - Size-class management

5. **OpenCut-classic `layer.wgsl` + `blend.wgsl`.** Read both in full. The blend mode math is correct (Porter-Duff in linear-light) — adopt almost verbatim.

6. **OpenCut-classic JFA shaders** (`jfa_init.wgsl`, `jfa_step.wgsl`, `jfa_distance.wgsl`). Read all three in full. The algorithm is correct — adopt, but consider rewriting as compute shaders.

7. **mediabunny P010 support.** Verify the mediabunny API for:
   - Requesting `pixelFormat: 'P010'` on decode
   - Whether `VideoFrame` objects expose the P010 data correctly
   - Whether `copyExternalImageToTexture` handles P010 → `r16uint`/`rg16uint`

8. **WebGPU P010 → texture upload.** Research the correct way to upload a P010 `VideoFrame` to GPU textures. The most efficient path may be:
   - `device.queue.copyExternalImageToTexture` directly (if supported for P010)
   - Or: extract planes via `VideoFrame.allocationSize` + `VideoFrame.copyTo` → `device.queue.writeTexture` (more code, more control)
   Reference: Chromium WebGPU implementation status for P010.

9. **Canvas configuration.** Verify that `rgba10a2unorm` + `colorSpace: 'display-p3'` is supported on Chromium 113+. Test:
   - Create a canvas with this config
   - Render a known pattern (e.g., pure red)
   - Read pixels back, verify they're in Display P3 gamut

10. **WebGPU canvas colorSpace support.** Check the W3C spec / Chromium implementation for which `colorSpace` values are supported with which `format` values. Specifically:
    - `rgba10a2unorm` + `display-p3` — supported?
    - `rgba16float` + `extended-srgb` — supported? (for HDR output)

11. **WGSL shader compilation.** How does FreeCut compile/include WGSL? `include_str!` in Rust (OpenCut)? Inline strings (FreeCut)? `import` statements (WGSL modules)? Decide our approach.

12. **GPU device loss handling.** How does FreeCut handle `GPUDevice.lost`? Read the relevant code. Document the recovery flow (if any) or error UI.

13. **FreeCut `gpu-scopes/`.** Read all three scope files in full. Document:
    - How they read from the working texture
    - How they accumulate histogram/waveform/vectorscope data
    - How they render the scope UI (separate canvas? overlay?)
    - Bit depth handling (we need 16-bit input, FreeCut uses 8-bit)

---

## 12. Test Plan for This Stream

1. **YUV→Linear shader unit test:** Render a known P010 frame, sample the linear-light output, compare to a reference computed in JS.

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

**End of `04-renderer-color.md`.** Next: `05-timeline.md`.

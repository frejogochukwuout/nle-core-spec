# 08 — Color Grading: Wheels, Curves, LUT, Qualifier, Power Window, Scopes

**Stream:** Color grading effects & UI
**Status:** Seed spec (sub-agent scout will refine with code references)
**Primary teacher:** FreeCut `gpu-effects/effects/color.ts` (ported to scene-linear, 16-bit)
**Spec file:** `08-color-grading.md`

---

## 1. Purpose

Define the color grading toolset: the effects, their parameters, their UI, and the scopes that visualize the result. This is what makes the editor useful for "as good as it can be" rough-cut color work before handing off to a flagship NLE.

---

## 2. Goals

1. **Resolve-style toolset.** Wheels, curves, levels, qualifier, power window, LUT, vibrance.
2. **Scene-linear math.** All grading operates on linear-light values (see `04-renderer-color.md`).
3. **10-bit precision.** LUT data, curve LUTs, and all intermediate textures are 16-bit (or higher).
4. **Real-time feedback.** Adjustments appear within 1 frame (~33ms).
5. **Scope accuracy.** Scopes operate on the same 10-bit data as the grade.

---

## 3. Effect Inventory

We adopt FreeCut's full grading toolset. Listed with their FreeCut file references:

| Effect | Purpose | FreeCut reference |
|---|---|---|
| **Color Wheels** | Resolve-style 4-wheel grading (shadows/mids/highlights/offset) | `gpu-effects/effects/color.ts:584-663` |
| **Curves** | Per-channel (RGB) + luma curve | `gpu-effects/effects/color.ts:1460, 1536` + `shared/utils/gpu-curves.ts:315` |
| **Levels** | Input/output black/white point, gamma | `gpu-effects/effects/color.ts` |
| **LUT** | 3D LUT application (`.cube` format) | `gpu-effects/effects/lut.ts:18` + `lut/cube-lut.ts` |
| **Secondary Qualifier** | HSL keyer (hue/sat/lum selection) | `gpu-effects/effects/color.ts:942` |
| **Power Window** | Mask shapes (rectangle, ellipse, polygon) | `gpu-effects/effects/color.ts:1180` |
| **Vibrance** | Selective saturation boost | `gpu-effects/effects/color.ts:1390` |
| **Gradient Map** | Map luminance to gradient | `gpu-effects/effects/color.ts:1481` |
| **Temperature** | Warm/cool color shift | `gpu-effects/effects/color.ts` |
| **Tint** | Magenta/green shift | `gpu-effects/effects/color.ts` |
| **Hue Shift** | Rotate hue | `gpu-effects/effects/color.ts` |
| **Saturation** | Global saturation | `gpu-effects/effects/color.ts` |
| **Exposure** | Linear exposure (stops) | `gpu-effects/effects/color.ts` |
| **Contrast** | Contrast with pivot | `gpu-effects/effects/color.ts` |
| **Brightness** | Linear brightness | `gpu-effects/effects/color.ts` |
| **Invert** | Invert colors | `gpu-effects/effects/color.ts` |
| **Grayscale** | Desaturate | `gpu-effects/effects/color.ts` |
| **Sepia** | Sepia tone | `gpu-effects/effects/color.ts` |
| **Chroma Key** | Green screen keyer | `gpu-effects/effects/keying.ts` |

---

## 4. Color Wheels (The Centerpiece)

### 4.1 The Resolve-style 4-wheel model

```
                 ┌─────────────┐
                 │   Lift      │  (shadows)
                 │   ◯ ← wheel  │
                 │             │
                 └─────────────┘
                       ↓
                 ┌─────────────┐
                 │   Gamma     │  (mids)
                 │   ◯ ← wheel  │
                 │             │
                 └─────────────┘
                       ↓
                 ┌─────────────┐
                 │   Gain      │  (highlights)
                 │   ◯ ← wheel  │
                 │             │
                 └─────────────┘
                       ↓
                 ┌─────────────┐
                 │   Offset    │  (overall)
                 │   ◯ ← wheel  │
                 │             │
                 └─────────────┘

Plus per-wheel:
  - Temperature (warm/cool)
  - Tint (magenta/green)
  - Saturation
  - Exposure (stops, linear)
  - Contrast (with pivot)
  - Hue
  - Color Boost
  - Mid Detail
  - Shadows / Highlights
  - Lum Mix (luma vs RGB weighting)
```

### 4.2 The shader (ported from FreeCut to scene-linear)

FreeCut's `color.ts:611` (the original, 8-bit sRGB):

```wgsl
// FreeCut's version (operates on gamma-encoded values — WRONG)
let color = textureSample(inputTex, texSampler, input.uv);
var c = color.rgb;
let luma = luminance601(c);  // ← Rec.601 luma (incorrect; should be linear)
let shadowMask = 1.0 - smoothstep(0.0, 0.5, luma);
// ... (similar for mids, highlights)
c *= pow(2.0, params.exposure);  // ← mathematically wrong for sRGB-encoded input
c = (c - vec3f(pivot)) * contrast + vec3f(pivot);
c = (c + lift + offset) * gain;
c = pow(c, vec3f(1.0 / gamma));
return vec4f(clamp(c, vec3f(0.0), vec3f(1.0)), color.a);  // ← clamps to [0,1], no HDR
```

Our ported version (operates on linear-light, 16-bit):

```wgsl
// Our version (operates on linear-light values — CORRECT)
struct ColorWheelsUniforms {
  lift_shadows_r: f32, lift_shadows_g: f32, lift_shadows_b: f32, _pad0: f32,
  gamma_mids_r: f32, gamma_mids_g: f32, gamma_mids_b: f32, _pad1: f32,
  gain_highlights_r: f32, gain_highlights_g: f32, gain_highlights_b: f32, _pad2: f32,
  offset_r: f32, offset_g: f32, offset_b: f32, _pad3: f32,
  exposure: f32,
  contrast: f32,
  pivot: f32,
  saturation: f32,
  hue: f32,
  temperature: f32,
  tint: f32,
  color_boost: f32,
  mid_detail: f32,
  shadows: f32,
  highlights: f32,
  lum_mix: f32,
  _pad4: f32, _pad5: f32, _pad6: f32,
};

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> params: ColorWheelsUniforms;

fn luminance_linear(c: vec3f) -> f32 {
  // For linear-light BT.709: 0.2126, 0.7152, 0.0722
  return dot(c, vec3f(0.2126, 0.7152, 0.0722));
}

fn rotate_hue(c: vec3f, hue: f32) -> vec3f {
  // Convert to HSV, rotate hue, convert back
  // ... (standard hue rotation in linear space)
}

@fragment
fn color_wheels_fragment(in: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, in.uv);  // linear-light, 16-bit
  var c = color.rgb;
  
  // Compute luminance (linear-light, BT.709)
  let luma = luminance_linear(c);
  
  // Compute masks for shadows / mids / highlights
  let shadowMask = 1.0 - smoothstep(0.0, 0.18, luma);  // 0.18 = mid-gray in linear
  let highlightMask = smoothstep(0.18, 1.0, luma);
  let midMask = 1.0 - shadowMask - highlightMask;
  
  // Apply lift (shadows) — additive in linear space
  let lift = vec3f(params.lift_shadows_r, params.lift_shadows_g, params.lift_shadows_b);
  c += lift * shadowMask;
  
  // Apply gamma (mids) — power function in linear space
  let gamma = vec3f(params.gamma_mids_r, params.gamma_mids_g, params.gamma_mids_b);
  c = pow(max(c, vec3f(0.0)), 1.0 / max(gamma, vec3f(0.001))) * midMask + c * (1.0 - midMask);
  
  // Apply gain (highlights) — multiplicative in linear space
  let gain = vec3f(params.gain_highlights_r, params.gain_highlights_g, params.gain_highlights_b);
  c *= 1.0 + (gain - 1.0) * highlightMask;
  
  // Apply offset (overall) — additive in linear space
  let offset = vec3f(params.offset_r, params.offset_g, params.offset_b);
  c += offset;
  
  // Apply exposure (linear multiplication, no clamp)
  c *= pow(2.0, params.exposure);
  
  // Apply contrast with pivot (linear space)
  c = (c - vec3f(params.pivot)) * params.contrast + vec3f(params.pivot);
  
  // Apply temperature (warm/cool)
  c.r += params.temperature * 0.05;
  c.b -= params.temperature * 0.05;
  
  // Apply tint (magenta/green)
  c.r += params.tint * 0.05;
  c.g -= params.tint * 0.05;
  c.b += params.tint * 0.05;
  
  // Apply saturation
  let l = luminance_linear(c);
  c = mix(vec3f(l), c, params.saturation);
  
  // Apply hue rotation
  c = rotate_hue(c, params.hue);
  
  // No clamp! Preserve HDR values.
  return vec4f(c, color.a);
}
```

**Key changes from FreeCut:**
1. `luminance_linear` uses BT.709 weights (FreeCut uses Rec.601)
2. No `clamp(c, vec3f(0.0), vec3f(1.0))` on output — preserves HDR values
3. Mask thresholds adjusted for linear space (0.18 instead of 0.5 for mid-gray)
4. Same math structure, just operating on the right color space

**Sub-agent scout task:** Read `src/infrastructure/gpu-effects/effects/color.ts:584-663` in full. Verify the exact parameter list and uniform layout. Port to scene-linear as sketched above.

### 4.3 UI

```tsx
<ColorWheelsPanel>
  <ColorWheel label="Lift"        // shadows
    value={effect.params.lift}
    onChange={(rgb) => updateParam('lift', rgb)}
    masterSlider={effect.params.shadows}
    onMasterChange={(v) => updateParam('shadows', v)}
  />
  <ColorWheel label="Gamma"       // mids
    value={effect.params.gamma}
    onChange={...}
    masterSlider={effect.params.mids}
    onMasterChange={...}
  />
  <ColorWheel label="Gain"        // highlights
    value={effect.params.gain}
    onChange={...}
    masterSlider={effect.params.highlights}
    onMasterChange={...}
  />
  <ColorWheel label="Offset"      // overall
    value={effect.params.offset}
    onChange={...}
  />
  
  <Slider label="Temperature" min={-100} max={100} value={...} onChange={...} />
  <Slider label="Tint" min={-100} max={100} value={...} onChange={...} />
  <Slider label="Exposure" min={-4} max={4} step={0.01} value={...} onChange={...} />  {/* in stops */}
  <Slider label="Contrast" min={0} max={2} step={0.01} value={...} onChange={...} />
  <Slider label="Pivot" min={0} max={1} step={0.01} value={...} onChange={...} />  {/* linear */}
  <Slider label="Saturation" min={0} max={2} step={0.01} value={...} onChange={...} />
  <Slider label="Hue" min={0} max={360} step={1} value={...} onChange={...} />  {/* degrees */}
  <Slider label="Color Boost" min={0} max={2} step={0.01} value={...} onChange={...} />
  <Slider label="Mid Detail" min={-100} max={100} value={...} onChange={...} />
  <Slider label="Shadows" min={-100} max={100} value={...} onChange={...} />
  <Slider label="Highlights" min={-100} max={100} value={...} onChange={...} />
  <Slider label="Lum Mix" min={0} max={100} value={...} onChange={...} />
</ColorWheelsPanel>
```

**FreeCut UI reference:** `src/features/effects/components/panels/gpu-color-wheels-panel.tsx`. Sub-agent to read.

---

## 5. Curves

### 5.1 The curve model

```ts
interface CurvesEffect {
  type: 'curves';
  params: {
    master: Curve;     // luma curve
    red: Curve;        // per-channel
    green: Curve;
    blue: Curve;
    intensity: number;  // 0 to 1
  };
}

interface Curve {
  points: { x: number; y: number }[];  // x, y in [0, 1]
  // Sorted by x, starts at (0, ?), ends at (1, ?)
  // Interpolation: cubic spline
}
```

### 5.2 Curve → 1D LUT baking

To apply a curve efficiently in the shader, bake it into a 1D LUT texture:

```ts
function bakeCurveLUT(curve: Curve, size: number = 1024): Uint16Array {
  // 16-bit LUT for 10-bit precision
  const lut = new Uint16Array(size);
  for (let i = 0; i < size; i++) {
    const x = i / (size - 1);
    const y = interpolateCubicSpline(curve.points, x);
    lut[i] = Math.round(y * 65535);  // 16-bit
  }
  return lut;
}

// Four curves (master + RGB) → one 4-channel 1024x1 LUT
function bakeCurvesLUT(curves: CurvesEffect['params']): Uint16Array {
  const lut = new Uint16Array(1024 * 4);  // 4 channels
  for (let i = 0; i < 1024; i++) {
    const x = i / 1023;
    lut[i * 4 + 0] = Math.round(interpolateCubicSpline(curves.red.points, x) * 65535);
    lut[i * 4 + 1] = Math.round(interpolateCubicSpline(curves.green.points, x) * 65535);
    lut[i * 4 + 2] = Math.round(interpolateCubicSpline(curves.blue.points, x) * 65535);
    lut[i * 4 + 3] = Math.round(interpolateCubicSpline(curves.master.points, x) * 65535);
  }
  return lut;
}
```

### 5.3 The shader

```wgsl
@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> params: CurvesUniforms;
@group(0) @binding(3) var lutTex: texture_1d<f32>;  // 1024x1 RGBA, 16-bit float

@fragment
fn curves_fragment(in: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, in.uv);  // linear-light
  var c = color.rgb;
  
  // Apply per-channel curves
  c.r = textureSample(lutTex, texSampler, c.r).r;
  c.g = textureSample(lutTex, texSampler, c.g).g;
  c.b = textureSample(lutTex, texSampler, c.b).b;
  
  // Apply master curve
  let luma = luminance_linear(c);
  let masterLuma = textureSample(lutTex, texSampler, luma).a;
  let lumaScale = masterLuma / max(luma, 0.001);
  c *= lumaScale;
  
  // Intensity blend (between original and graded)
  c = mix(color.rgb, c, params.intensity);
  
  return vec4f(c, color.a);
}
```

**FreeCut reference:** `src/shared/utils/gpu-curves.ts:315` and `src/infrastructure/gpu-effects/effects/color.ts:1460, 1536`. Sub-agent to read.

### 5.4 UI

```tsx
<CurvesPanel>
  <CurveEditor
    curve={effect.params.master}
    onChange={(c) => updateParam('master', c)}
    label="Master"
    color="white"
  />
  <CurveEditor
    curve={effect.params.red}
    onChange={(c) => updateParam('red', c)}
    label="Red"
    color="red"
  />
  {/* green, blue ... */}
  <Slider label="Intensity" min={0} max={1} value={...} onChange={...} />
</CurvesPanel>
```

The `CurveEditor` component shows a square plot with the curve, draggable control points, and a histogram of the source luma (optional).

---

## 6. Levels

### 6.1 The model

```ts
interface LevelsEffect {
  type: 'levels';
  params: {
    inputBlack: number;    // 0 to 1 (linear)
    inputWhite: number;    // 0 to 1 (linear)
    inputGamma: number;     // 0.1 to 10
    outputBlack: number;    // 0 to 1
    outputWhite: number;    // 0 to 1
  };
}
```

### 6.2 The shader

```wgsl
@fragment
fn levels_fragment(in: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, in.uv);
  var c = color.rgb;
  
  // Input levels: stretch [inputBlack, inputWhite] to [0, 1]
  c = (c - vec3f(params.input_black)) / max(vec3f(params.input_white - params.input_black), vec3f(0.001));
  
  // Gamma
  c = pow(max(c, vec3f(0.0)), vec3f(1.0 / params.input_gamma));
  
  // Output levels: compress [0, 1] to [outputBlack, outputWhite]
  c = c * (params.output_white - params.output_black) + vec3f(params.output_black);
  
  return vec4f(c, color.a);
}
```

---

## 7. LUT (3D Look-Up Table)

### 7.1 The model

```ts
interface LutEffect {
  type: 'lut';
  params: {
    lutId: string;           // reference to loaded LUT
    intensity: number;        // 0 to 1
    // Optionally: encode the LUT was authored for (sRGB? linear? log?)
    sourceEncoding: 'srgb' | 'linear' | 'log';
  };
}
```

### 7.2 `.cube` parser

Adopted from FreeCut's `cube-lut.ts`, but stored as 16-bit:

```ts
interface ParsedCubeLut {
  title: string | null;
  size: number;             // typically 17, 25, 33, 64
  // 16-bit per channel for 10-bit precision
  // Stored as rgba16float 3D texture
  data: Uint16Array;        // size * size * size * 4 channels * 2 bytes
  // Red axis varies fastest (standard .cube ordering)
}

function parseCubeLUT(text: string): ParsedCubeLut {
  // Adopt FreeCut's parser (cube-lut.ts), but convert to 16-bit
  // ...
}
```

### 7.3 GPU upload

```ts
const lutTexture = device.createTexture({
  size: { width: size, height: size, depthOrArrayLayers: size },
  dimension: '3d',
  format: 'rgba16float',  // 16-bit, NOT rgba8unorm
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
});

device.queue.writeTexture(
  { texture: lutTexture },
  lutData,  // Uint16Array
  { bytesPerRow: size * 4 * 2, rowsPerImage: size },  // 4 channels × 2 bytes
  { width: size, height: size, depthOrArrayLayers: size }
);
```

### 7.4 The shader

```wgsl
@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> params: LutUniforms;
@group(0) @binding(3) var lutTex: texture_3d<f32>;

@fragment
fn lut_fragment(in: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, in.uv);  // linear-light
  
  // Convert linear → sRGB-encoded for LUT lookup (most LUTs are authored in sRGB space)
  let encoded = linear_to_srgb(color.rgb);
  
  // LUT lookup
  let size = max(params.size, 2.0);
  let coords = (clamp(encoded, vec3f(0.0), vec3f(1.0)) * (size - 1.0) + vec3f(0.5)) / size;
  let graded = textureSample(lutTex, texSampler, coords).rgb;
  
  // Convert back to linear
  let gradedLinear = srgb_to_linear(graded);
  
  // Intensity blend
  let result = mix(color.rgb, gradedLinear, params.intensity);
  
  return vec4f(result, color.a);
}
```

**Critical:** Most LUTs are authored in sRGB-encoded space. We need to convert linear → sRGB before lookup, then convert back. FreeCut skips this — that's a bug. We fix it.

**FreeCut reference:** `src/infrastructure/gpu-effects/effects/lut.ts:18-31` (shader) and `src/infrastructure/gpu-effects/lut/cube-lut.ts` (parser). Sub-agent to read both.

---

## 8. Secondary Qualifier (HSL Keyer)

### 8.1 The model

```ts
interface QualifierEffect {
  type: 'secondary-qualifier';
  params: {
    hueRange: { center: number; width: number };     // 0-360 degrees, width in degrees
    satRange: { min: number; max: number };          // 0-1
    lumRange: { min: number; max: number };           // 0-1 (linear)
    feather: number;                                  // 0-1
    invert: boolean;
  };
}
```

### 8.2 The shader

```wgsl
@fragment
fn qualifier_fragment(in: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, in.uv);  // linear-light
  
  // Convert to HSL
  let hsl = rgb_to_hsl(color.rgb);
  
  // Hue check (circular)
  let hueDelta = abs(hsl.x * 360.0 - params.hue_center);
  let hueDist = min(hueDelta, 360.0 - hueDelta);
  let hueMatch = 1.0 - smoothstep(params.hue_width * 0.5, params.hue_width * 0.5 + params.feather * 30.0, hueDist);
  
  // Saturation check
  let satMatch = 1.0 - smoothstep(params.sat_max - params.feather * 0.2, params.sat_max, hsl.y)
                   + smoothstep(params.sat_min, params.sat_min + params.feather * 0.2, hsl.y);
  
  // Luminance check (in linear space)
  let lumMatch = ... ; // similar
  
  // Combine
  let mask = hueMatch * satMatch * lumMatch;
  let finalMask = params.invert ? 1.0 - mask : mask;
  
  // Output: keep color, set alpha to mask
  return vec4f(color.rgb, color.a * finalMask);
}
```

**FreeCut reference:** `src/infrastructure/gpu-effects/effects/color.ts:942`. Sub-agent to read.

### 8.3 UI

```tsx
<QualifierPanel>
  <HuePicker
    value={effect.params.hueRange}
    onChange={(v) => updateParam('hueRange', v)}
  />
  <SatLumPicker
    satRange={effect.params.satRange}
    lumRange={effect.params.lumRange}
    onChange={(sat, lum) => { updateParam('satRange', sat); updateParam('lumRange', lum); }}
  />
  <Slider label="Feather" min={0} max={1} value={...} onChange={...} />
  <Toggle label="Invert" value={effect.params.invert} onChange={...} />
</QualifierPanel>
```

The HuePicker shows a hue wheel with a draggable selection arc. The SatLumPicker shows a saturation/luminance grid (like Resolve's qualifier panel) with a draggable selection rectangle.

---

## 9. Power Window (Mask Shapes)

### 9.1 The model

```ts
interface PowerWindowEffect {
  type: 'power-window';
  params: {
    shape: 'rectangle' | 'ellipse' | 'polygon';
    // Rectangle:
    rect?: { x: number; y: number; width: number; height: number };  // normalized 0-1
    // Ellipse:
    ellipse?: { centerX: number; centerY: number; radiusX: number; radiusY: number };
    // Polygon:
    polygon?: { points: { x: number; y: number }[] };
    feather: number;     // pixels
    invert: boolean;
    rotation: number;    // degrees
    // Tracking (optional):
    keyframes?: KeyframeTrack[];  // animate position over time
  };
}
```

### 9.2 Mask texture generation

Generate a mask texture for the shape:

```ts
function generateMaskTexture(shape: PowerWindowShape, width: number, height: number): GPUTexture {
  const maskData = new Uint16Array(width * height);  // 16-bit single channel
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const v = y / height;
      const inside = isInsideShape(shape, u, v);
      maskData[y * width + x] = inside ? 65535 : 0;
    }
  }
  
  // Upload to GPU as r16uint texture
  // ...
}
```

Then apply JFA feathering (see `04-renderer-color.md` §8.4) to produce the feathered mask.

### 9.3 Integration with grading

Power windows are typically combined with a qualifier or color wheels to grade a region:

```ts
interface GradingNode {
  powerWindow: PowerWindowEffect;
  qualifier?: QualifierEffect;
  colorWheels: ColorWheelsEffect;
  // The grade applies only where (powerWindow AND qualifier) is true
}
```

The renderer:
1. Compute mask (power window + qualifier combined)
2. Apply grade to source frame
3. Blend graded source with original source using the mask

**FreeCut reference:** `src/infrastructure/gpu-effects/effects/color.ts:1180`. Sub-agent to read.

---

## 10. Other Effects

### 10.1 Vibrance

Selective saturation — boosts low-saturation colors more than high-saturation colors:

```wgsl
@fragment
fn vibrance_fragment(in: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, in.uv);
  var c = color.rgb;
  let luma = luminance_linear(c);
  let max_c = max(c.r, max(c.g, c.b));
  let min_c = min(c.r, min(c.g, c.b));
  let sat = (max_c - min_c) / max(max_c, 0.001);
  // Boost less-saturated colors more
  let boost = params.vibrance * (1.0 - sat);
  c = mix(vec3f(luma), c, 1.0 + boost);
  return vec4f(c, color.a);
}
```

### 10.2 Temperature & Tint

```wgsl
// Temperature: shift toward warm (R+B+) or cool (R-B+)
c.r += params.temperature * 0.05;
c.b -= params.temperature * 0.05;

// Tint: shift toward magenta (R+B+G-) or green (R-B-G+)
c.r += params.tint * 0.05;
c.g -= params.tint * 0.05;
c.b += params.tint * 0.05;
```

### 10.3 Exposure (linear stops)

```wgsl
c *= pow(2.0, params.exposure);  // 1 stop = 2x in linear
```

### 10.4 Contrast with pivot

```wgsl
c = (c - vec3f(params.pivot)) * params.contrast + vec3f(params.pivot);
```

### 10.5 Hue rotation

```wgsl
// Convert to HSV, rotate hue, convert back
let hsv = rgb_to_hsv(c);
hsv.x = mod(hsv.x + params.hue / 360.0, 1.0);
c = hsv_to_rgb(hsv);
```

---

## 11. Scopes

### 11.1 Scopes overview

| Scope | Purpose | FreeCut reference |
|---|---|---|
| **Histogram** | Distribution of R/G/B/luma values | `gpu-scopes/histogram-scope.ts` |
| **Waveform** | Luma values across the frame (horizontal axis = x position) | `gpu-scopes/waveform-scope.ts` |
| **Vectorscope** | Chroma values plotted in polar coordinates | `gpu-scopes/vectorscope-scope.ts` |
| **RGB Parade** | Three waveforms side-by-side (R, G, B) | (not in FreeCut — implement) |
| **Zebra** | Overlay showing clipped highlights / crushed shadows | (not in FreeCut — implement) |

### 11.2 Implementation (port to 16-bit input)

FreeCut's scopes read from an 8-bit `rgba8unorm` texture. We override to read from `rgba16float`:

```ts
// src/platform/renderer/scopes/ScopeRenderer.ts

class ScopeRenderer {
  private histogramPipeline: GPUComputePipeline;
  private waveformPipeline: GPUComputePipeline;
  private vectorscopePipeline: GPUComputePipeline;
  
  // Histogram: 256 bins per channel (or 1024 for 10-bit precision)
  async computeHistogram(sourceTexture: GPUTexture): Promise<HistogramData> {
    // Dispatch compute shader that reads sourceTexture (rgba16float) and
    // atomically increments bin counters
    // ...
  }
  
  // Waveform: column-by-column luma values
  async computeWaveform(sourceTexture: GPUTexture): Promise<WaveformData> {
    // Compute shader: for each column x, compute luminance for each row y,
    // write to a 2D buffer where intensity = luminance frequency at that (x, y)
    // ...
  }
  
  // Vectorscope: chroma in polar coordinates
  async computeVectorscope(sourceTexture: GPUTexture): Promise<VectorscopeData> {
    // Compute shader: for each pixel, compute (Cb, Cr) and increment bin in 2D buffer
    // ...
  }
}
```

### 11.3 Vectorscope skin tone line

Standard vectorscope shows a "skin tone line" at the IRE axis (around 123° on the vectorscope, where typical human skin tones fall). Drawn as an overlay on the vectorscope display.

### 11.4 Scope UI

```tsx
<ScopesPanel>
  <HistogramScope data={histogramData} />
  <WaveformScope data={waveformData} />
  <VectorscopeScope data={vectorscopeData} />
  <RgbParadeScope data={rgbParadeData} />
  <ScopeControls
    sourceSelect="pre-grade" | "post-grade"
    bitDepth="8-bit" | "10-bit"
  />
</ScopesPanel>
```

Each scope renders to its own small canvas. Updates happen at ~10 fps (not every frame) to avoid GPU overhead.

### 11.5 Bit depth handling

FreeCut's `vectorscope-scope.ts:55` does `u32(max(r * 255.0, 1.0))` — assumes 8-bit input. We change to:

```wgsl
// For rgba16float input (linear-light, values may exceed 1.0)
// Convert to 10-bit YUV for vectorscope display
let y = luminance_linear(color.rgb);
let cb = -0.168736 * color.r - 0.331264 * color.g + 0.5 * color.b;
let cr = 0.5 * color.r - 0.418688 * color.g - 0.081312 * color.b;
// Scale to 10-bit (0-1023) for display
let y_bin = clamp(u32(y * 1023.0), 0u, 1023u);
let cb_bin = clamp(u32((cb + 0.5) * 1023.0), 0u, 1023u);
let cr_bin = clamp(u32((cr + 0.5) * 1023.0), 0u, 1023u);
```

**FreeCut reference:** All three scope files in `src/infrastructure/gpu-scopes/`. Sub-agent to read in full and document the compute shader pattern, then port to 16-bit input.

---

## 12. Real-time Feedback

Color grading requires immediate feedback — drag a slider, see the result within 1 frame (~33ms).

### 12.1 Strategy

1. **Don't re-render the whole frame on every slider change.** Only re-run the color grading pass (not decode, not YUV→linear).
2. **Cache the linear-light working texture.** Slider changes only invalidate the grading pass, not the upstream.
3. **Throttle slider events.** Coalesce rapid slider events into a single grade update per frame.

### 12.2 Implementation

```ts
class ColorGradingPipeline {
  private linearCache: Map<string, GPUTexture> = new Map();  // mediaId → linear-light texture
  private gradeDirty: boolean = true;
  
  setParam(effectId: string, paramName: string, value: number) {
    // Update param
    this.gradeDirty = true;
  }
  
  renderFrame(time: MediaTime): void {
    // 1. Get or cache linear-light source texture
    const sourceKey = `media:${mediaId}:${frame}`;
    let linearTexture = this.linearCache.get(sourceKey);
    if (!linearTexture) {
      linearTexture = this.decodeAndLinearize(mediaId, frame);
      this.linearCache.set(sourceKey, linearTexture);
    }
    
    // 2. If grade is dirty, re-run grade pass
    if (this.gradeDirty) {
      this.gradeTexture = this.applyGrade(linearTexture);
      this.gradeDirty = false;
    }
    
    // 3. Blit to canvas
    this.blitToCanvas(this.gradeTexture);
  }
}
```

---

## 13. Open Questions for Sub-Agent Scout

1. **FreeCut `gpu-effects/effects/color.ts`.** Read in full (~1500 LOC). Document:
   - Each effect's exact parameter list
   - Each effect's shader implementation
   - The uniform layout for each
   - The `color_wheelsFragment` shader (line 611 area) — quote in full
   - The `secondaryQualifierFragment` shader (line 942 area) — quote in full
   - The `powerWindowFragment` shader (line 1180 area) — quote in full
   - The `vibranceFragment` shader (line 1390 area) — quote in full

2. **FreeCut `gpu-effects/effects/lut.ts` + `lut/cube-lut.ts`.** Read both. Document the LUT shader and parser. Verify the LUT data is 8-bit and the shader operates on gamma-encoded values (we fix this — see §7.4).

3. **FreeCut `gpu-effects/effects/keying.ts`.** Read in full. Document the chroma key shader.

4. **FreeCut `shared/utils/gpu-curves.ts`.** Read in full. Document the curve baking algorithm and the 256×1 LUT generation. We change to 1024×1 16-bit LUT.

5. **FreeCut `gpu-scopes/`.** Read all three scope files (`histogram-scope.ts`, `waveform-scope.ts`, `vectorscope-scope.ts`) and `scope-renderer.ts`. Document:
   - The compute shader pattern
   - The source texture format (rgba8unorm — we change to rgba16float)
   - The bin accumulation logic
   - The 8-bit assumption in `vectorscope-scope.ts:55` (we change to 10-bit)

6. **FreeCut effects UI panels.** Read:
   - `src/features/effects/components/panels/gpu-color-wheels-panel.tsx`
   - `src/features/effects/components/panels/gpu-curves-panel.tsx`
   - `src/features/effects/components/panels/gpu-lut-panel.tsx`
   - Any qualifier / power window / vibrance panels
   
   Document the UI structure and parameter binding.

7. **FreeCut `gpu-effects/effects-pipeline.ts`.** Read in full. Document:
   - Effect registration mechanism
   - Effect chain execution order
   - Ping-pong texture management
   - 3D LUT upload path (line 443-449 area)
   - Bind group construction

8. **FreeCut `gpu-effects/common.ts`.** Read in full. Document the WGSL helper functions (`luminance`, `luminance601`, etc.). We'll add `luminance_linear`, `linear_to_srgb`, `srgb_to_linear`, `linear_to_pq`, `pq_to_linear`, `linear_to_hlg`, `hlg_to_linear`.

9. **Resolve/FCP reference.** If we want Resolve-style UX, study Resolve's color page layout (4-wheel + curve + qualifier + power window tabs). This is a UI reference, not code.

---

## 14. Test Plan for This Stream

1. **Color Wheels unit test:** Apply known lift/gamma/gain values to a reference frame. Assert pixel values match expected (computed in JS using the same linear-light math).

2. **Exposure test:** Apply exposure +1 stop. Assert all linear-light values doubled.

3. **LUT round-trip test:** Apply an identity LUT. Assert output matches input.

4. **LUT sRGB conversion test:** Apply a known LUT (e.g., a LUT that doubles sRGB-encoded values). Verify our linear → sRGB → LUT → sRGB → linear path produces correct results.

5. **Curve test:** Apply a curve that swaps R and B channels. Assert output R = input B, output B = input R.

6. **Qualifier test:** Create a clip with red, green, and blue regions. Apply qualifier with hue center = 0° (red). Assert only red region is masked.

7. **Power Window test:** Apply a rectangular power window covering left half of frame. Assert only left half is graded.

8. **Scope accuracy test:** Render a known frame (e.g., gradient from black to white). Assert histogram shows correct distribution. Assert waveform shows the gradient. Assert vectorscope shows the chroma values.

9. **Real-time feedback test:** Drag a color wheel pointer. Assert grade updates within 33ms (1 frame at 30fps).

10. **10-bit precision test:** Load a 10-bit source with subtle gradient. Apply grade. Assert no banding (compare to 8-bit version — should have visible difference).

11. **HDR preservation test:** Load an HDR source (PQ). Apply grade that pushes highlights above 1.0. Assert output preserves values >1.0 (no clamping to SDR range).

---

**End of `08-color-grading.md`.** Next: `09-project-model.md`.

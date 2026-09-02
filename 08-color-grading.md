# 08 — Color Grading: Wheels, Curves, LUT, Qualifier, Power Window, Scopes (REFINED)

**Stream:** Color grading effects & UI
**Status:** Refined spec — sub-agent scout SCOUT-08 has verified all claims against FreeCut + OpenCut-classic source
**Primary teacher:** FreeCut `gpu-effects/effects/color.ts` (1546 LOC, ported to scene-linear, 16-bit) + `gpu-effects/effects/lut.ts` + `gpu-effects/effects/keying.ts` + `shared/utils/gpu-curves.ts` + `gpu-effects/common.ts` + `gpu-scopes/*`
**Seed file:** `08-color-grading.md`
**Refined by:** SCOUT-08 (general-purpose scout)
**Date:** 2026-08-22

---

## How to Read This Refined Spec

Sections 1–12 are the **seed spec**, copied verbatim from `08-color-grading.md` (the architect's original).
Section 13 has been **replaced** with concrete answers backed by `file:line` references.
Section 14 (test plan) is preserved unchanged.
Sections 15–18 are **new** (Code References, Corrections, Full Shader Quotes, Scope Bit-Depth Port).

Legend used throughout §13/§15/§16:

- ✅ = seed spec claim verified correct
- ❌ = seed spec claim wrong (see §16 for details)
- ⚠️ = seed spec claim partially correct (more nuance needed)
- 📍 = `file:line` reference into a verified source file

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

We adopt FreeCut's full grading toolset. Listed with their FreeCut file references (line numbers verified against the actual `color.ts` 1546-line file):

| Effect | Purpose | FreeCut reference |
|---|---|---|
| **Color Wheels** | Resolve-style 4-wheel grading (shadows/mids/highlights/offset) | `gpu-effects/effects/color.ts:584-908` (shader at `:584-663`; params at `:664-908`) |
| **Curves** | Per-channel (RGB) + master curve, baked to 256×1 rgba8 LUT | `gpu-effects/effects/color.ts:476-582` (shader + `dataTexture` builder at `:572-581`) + `shared/utils/gpu-curves.ts:227,315-335` (LUT bake) |
| **Levels** | Input/output black/white point, gamma | `gpu-effects/effects/color.ts:239-321` |
| **LUT** | 3D LUT application (`.cube` format) | `gpu-effects/effects/lut.ts:12-78` (shader at `:18-31`); parser at `lut/cube-lut.ts:135-166` |
| **Secondary Qualifier** | HSL keyer (hue/sat/lum selection) | `gpu-effects/effects/color.ts:941-1172` (shader at `:947-1006`; params at `:1007-1144`) |
| **Power Window** | Mask shapes (ellipse, rectangle) — **NO polygon** (see §16) | `gpu-effects/effects/color.ts:1179-1387` (shader at `:1185-1247`; params at `:1248-1367`) |
| **Vibrance** | Selective saturation boost | `gpu-effects/effects/color.ts:1389-1423` (shader at `:1395-1410`) |
| **Gradient Map** | Map luminance to gradient | `gpu-effects/effects/color.ts:1480-1546` (shader at `:1486-1499`; LUT builder at `:1461-1478`) |
| **Temperature** | Warm/cool color shift | `gpu-effects/effects/color.ts:355-399` |
| **Tint** | Magenta/green shift (combined with Temperature effect) | `gpu-effects/effects/color.ts:355-399` |
| **Hue Shift** | Rotate hue with span/flow | `gpu-effects/effects/color.ts:162-219` |
| **Saturation** | Global saturation | `gpu-effects/effects/color.ts:323-353` |
| **Exposure** | Linear exposure (stops) + offset + gamma | `gpu-effects/effects/color.ts:105-160` |
| **Contrast** | Contrast (no pivot) | `gpu-effects/effects/color.ts:74-103` |
| **Brightness** | Linear brightness add | `gpu-effects/effects/color.ts:43-72` |
| **Invert** | Invert colors | `gpu-effects/effects/color.ts:221-237` |
| **Grayscale** | Desaturate | `gpu-effects/effects/color.ts:401-431` |
| **Sepia** | Sepia tone | `gpu-effects/effects/color.ts:433-466` |
| **Chroma Key** | Green screen keyer | `gpu-effects/effects/keying.ts:3-109` |

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

⚠️ **Correction to seed spec §4.2**: FreeCut's actual WheelsParams is **NOT** a 12-field RGB layout (`lift_shadows_r/g/b` etc.). Each wheel is a `(hue, amount)` pair that produces a single tint applied to all three channels via `wheelTint()`. The scalar `lift/gamma/gain/offset` (one f32 each) are independent RGB multiplier controls. See §16.A for the full correction.

The full FreeCut `colorWheelsFragment` shader is quoted in §17.A. Key characteristics:

- **Uniform layout** (`color.ts:591-599`): 7×4 = 28 `f32` fields, total 112 bytes (matches `uniformSize: 112` at `:589`):
  - byte 0–15: `shHue, shAmount, midHue, midAmount`
  - byte 16–31: `hlHue, hlAmount, temperature, tint`
  - byte 32–47: `saturation, exposure, contrast, pivot`
  - byte 48–63: `lift, gamma, gain, offset`
  - byte 64–79: `blackPoint, whitePoint, offHue, offAmount`
  - byte 80–95: `midDetail, colorBoost, shadows, highlights`
  - byte 96–111: `hue, lumMix, _pad1, _pad2`
- **Mask computation** (`color.ts:615-618`): uses `luminance601` (BT.601 weights `0.299, 0.587, 0.114`); `shadowMask = 1.0 - smoothstep(0.0, 0.5, luma)`; `highlightMask = smoothstep(0.5, 1.0, luma)`. Mid-gray threshold is **0.5** (gamma-encoded assumption — needs port to **0.18** for linear-light, per §16.A).
- **Wheel tint** (`color.ts:604-609`): `wheelTint()` builds an HSV tint at `(hue/360, 1.0, 1.0)` and `mix(color, color * mix(vec3f(1.0), tintColor, amount), mask)`.
- **Exposure** (`:631`): `c *= pow(2.0, params.exposure)` — already a stops-based multiplication, **but on gamma-encoded values** in FreeCut.
- **Contrast with pivot** (`:632`): `c = (c - vec3f(params.pivot)) * params.contrast + vec3f(params.pivot)` — structurally identical to linear; only the input color space is wrong.
- **Temperature/Tint** (`:623-629`): `temp = temperature / 100.0; c.r += temp * 0.1; c.b -= temp * 0.1; ti = tint / 100.0; c.g -= ti * 0.1; c.r += ti * 0.05; c.b += ti * 0.05`.
- **Saturation** (`:646-648`): `sat = 1.0 + params.saturation / 100.0; gray = luminance601(c); c = mix(vec3f(gray), c, sat)`.
- **Color Boost** (`:649-654`): boost low-chroma pixels more than high-chroma via `1.0 - clamp(length(chroma), 0.0, 1.0)`.
- **Hue rotation** (`:655-659`): default `hue = 50` (i.e. no-op); `hsv.x = fract(hsv.x + ((params.hue - 50.0) / 100.0))`.
- **Lum Mix** (`:660-661`): blends post-grade color with its own luminance: `c = mix(vec3f(postLuma), c, clamp(params.lumMix / 100.0, 0.0, 1.0))`.
- **Output clamp** (`:662`): `return vec4f(clamp(c, vec3f(0.0), vec3f(1.0)), color.a)` — **clamps to [0,1], kills HDR highlights** (must be removed for HDR preservation per §16.A).

Our ported version (operates on linear-light, 16-bit):

```wgsl
// Our version (operates on linear-light values — CORRECT)
// Uniform layout is UNCHANGED from FreeCut (7×4 f32 = 112 bytes) so the
// packUniforms() function can stay byte-identical. Only the shader math is
// modified: BT.709 luma, mask thresholds scaled for linear space, no output clamp.
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
  let tintColor = hsv2rgb(vec3f(hue / 360.0, 1.0, 1.0));
  return mix(color, color * mix(vec3f(1.0), tintColor, amount), mask);
}

@fragment
fn colorWheelsFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);  // linear-light, 16-bit
  var c = color.rgb;

  // ⚠️ Changed: BT.709 luma (linear-light) instead of BT.601 (gamma-encoded).
  // Mid-gray in linear-light is 0.18 (18% reflectance), not 0.5 (gamma-encoded mid-gray).
  let luma = luminance(c);                                  // common.ts:62-64 — BT.709
  let shadowMask   = 1.0 - smoothstep(0.0, 0.18, luma);     // was 0.5
  let highlightMask = smoothstep(0.18, 1.0, luma);          // was smoothstep(0.5, 1.0, luma)
  let midtoneMask   = 1.0 - shadowMask - highlightMask;

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

  c *= pow(2.0, params.exposure);                            // linear exposure
  c = (c - vec3f(params.pivot)) * params.contrast + vec3f(params.pivot);
  if (abs(params.midDetail) > 0.001) {
    let detailLuma = luminance(c);
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
  let gray = luminance(c);
  c = mix(vec3f(gray), c, sat);
  let colorBoost = params.colorBoost / 100.0;
  if (abs(colorBoost) > 0.001) {
    let boostedGray = luminance(c);
    let chroma = c - vec3f(boostedGray);
    c = vec3f(boostedGray) + chroma * (1.0 + colorBoost * (1.0 - clamp(length(chroma), 0.0, 1.0)));
  }
  if (abs(params.hue - 50.0) > 0.001) {
    var hsv = rgb2hsv(c);
    hsv.x = fract(hsv.x + ((params.hue - 50.0) / 100.0));
    c = hsv2rgb(hsv);
  }
  let postLuma = luminance(c);
  c = mix(vec3f(postLuma), c, clamp(params.lumMix / 100.0, 0.0, 1.0));

  // ❌ REMOVED (was: clamp(c, vec3f(0.0), vec3f(1.0))) — preserve HDR values.
  return vec4f(c, color.a);
}
```

**Key changes from FreeCut:**
1. `luminance` (BT.709) instead of `luminance601` (BT.601) — both already defined in `common.ts:62-68`.
2. Shadow mask threshold from `0.5` to `0.18` (mid-gray in linear-light, BT.1886 EOTF^-1(0.5)≈0.18).
3. Highlight mask from `smoothstep(0.5, 1.0, luma)` to `smoothstep(0.18, 1.0, luma)` (linear-light above mid-gray).
4. **No `clamp(c, vec3f(0.0), vec3f(1.0))` on output** — preserves HDR values (consistent with §11.5 of `04-renderer-color.md`).
5. Same math structure, same uniform layout — just operating on the right color space.
6. Uniform layout is byte-identical (112 bytes, 7×4 floats) so `packUniforms` (`color.ts:904-907`) and the `COLOR_WHEELS_UNIFORM_PARAMS` table (`:910-939`) need **zero changes**.

### 4.3 UI

The seed spec proposed a flat list of `<ColorWheel>` components. FreeCut's actual UI is more sophisticated — a sidebar/dock layout switcher with one set of wheel descriptors for sidebar mode (`WHEEL_DESCRIPTORS` at `gpu-wheels-panel.tsx:429-433`) and another for dock mode (`DOCK_WHEEL_DESCRIPTORS` at `:478-519`) with Resolve-style master ring fills, hue field backgrounds, and per-wheel R/G/B value chips. See §15 for file references.

```tsx
<ColorWheelsPanel layout="dock">  // or "sidebar"
  {/* 4 Resolve-style wheels (Lift / Gamma / Gain / Offset)
       Each wheel: hue field, puck (drag to set hue+amount), master ring
       gauge (dock only), R/G/B value chips (dock only), thumb wheel for the
       scalar (lift/gamma/gain/offset). */}
  <WheelControl label="Lift" hueKey="shadowsHue" amountKey="shadowsAmount" levelKey="lift" .../>
  <WheelControl label="Gamma" hueKey="midtonesHue" amountKey="midtonesAmount" levelKey="gamma" .../>
  <WheelControl label="Gain" hueKey="highlightsHue" amountKey="highlightsAmount" levelKey="gain" .../>
  <WheelControl label="Offset" hueKey="offsetHue" amountKey="offsetAmount" levelKey="offset" .../>

  {/* Top section: Temperature, Tint, Contrast, Pivot, Mid/Detail */}
  {/* Bottom section: Color Boost, Shadows, Highlights, Saturation, Hue, Lum Mix */}
  {/* Primaries (always visible): Exposure, Contrast, Pivot, Lift, Gamma, Gain,
       Offset, Black Point, White Point */}
</ColorWheelsPanel>
```

**FreeCut UI reference:** `src/features/effects/components/panels/gpu-wheels-panel.tsx` (1378 LOC, NOT `gpu-color-wheels-panel.tsx` as the seed spec mistakenly named it — see §16.I). Sub-agent verified at `:429-543` for the wheel/param descriptor tables, `:66-77` for the `getHueAmountFromClient` pointer→hue/amount conversion, `:1-64` for the dock vs sidebar CSS gradient constants.

---

## 5. Curves

### 5.1 The curve model

FreeCut's actual curve model (`shared/utils/gpu-curves.ts:1-353`) is more sophisticated than the seed spec proposed:

```ts
// shared/utils/gpu-curves.ts
export type GpuCurvesChannelKey = 'master' | 'red' | 'green' | 'blue'  // :3
export interface GpuCurvesControlPoint { x: number; y: number }          // :5-8
export const GPU_CURVES_LUT_WIDTH = 256                                  // :227 — 8-bit!
export const GPU_CURVES_MAX_POINTS = 16                                  // :228
export const GPU_CURVES_POINT_MIN_GAP = 0.04                             // :25

// Per channel: 2 numeric control points (shadow/highlight) + a JSON
// multi-point list (`masterPoints`, `redPoints`, ...). The JSON form takes
// precedence when present; otherwise the legacy 2-point form is used.
//
// Channels are composed: out = channel(master(x)), so the master curve is
// applied first, then per-channel. (evaluateGpuCurvesEffectChannel, :302-312)
```

We override the LUT width and bit depth:

```ts
// Our version
export const GPU_CURVES_LUT_WIDTH = 1024   // was 256 — 4× more samples for 10-bit
// Storage: Uint16Array (16-bit per channel) instead of Uint8Array
```

### 5.2 Curve → 1D LUT baking

FreeCut's actual bake algorithm (`shared/utils/gpu-curves.ts:314-335`):

```ts
/** Bake the combined per-channel transfer functions into a 256x1 rgba8 LUT:
 *  texel.r/g/b = red/green/blue(master(x)), sampled in the curves shader.
 */
export function buildGpuCurvesLutData(params: EffectParams): Uint8Array {
  const width = GPU_CURVES_LUT_WIDTH  // 256
  const masterPoints = readGpuCurvesChannelPoints(params, 'master')
  const redPoints = readGpuCurvesChannelPoints(params, 'red')
  const greenPoints = readGpuCurvesChannelPoints(params, 'green')
  const bluePoints = readGpuCurvesChannelPoints(params, 'blue')

  const data = new Uint8Array(width * 4)
  for (let i = 0; i < width; i++) {
    const x = i / (width - 1)
    const master = evaluateMonotoneCurve(masterPoints, x)
    data[i * 4]     = Math.round(clamp(evaluateMonotoneCurve(redPoints,   master), 0, 1) * 255)
    data[i * 4 + 1] = Math.round(clamp(evaluateMonotoneCurve(greenPoints, master), 0, 1) * 255)
    data[i * 4 + 2] = Math.round(clamp(evaluateMonotoneCurve(bluePoints,  master), 0, 1) * 255)
    data[i * 4 + 3] = 255
  }
  return data
}
```

⚠️ **Verified**: FreeCut's curve LUT is **256×1 rgba8 (8-bit, 4 channels)**. The seed spec's claim that we change to "1024×1 16-bit LUT" is correct as a porting requirement (see §16.B).

Our ported version:

```ts
function bakeCurvesLUT(params: EffectParams): Uint16Array {
  const width = 1024  // 4× FreeCut's 256 for 10-bit precision
  const masterPoints = readGpuCurvesChannelPoints(params, 'master')
  const redPoints = readGpuCurvesChannelPoints(params, 'red')
  const greenPoints = readGpuCurvesChannelPoints(params, 'green')
  const bluePoints = readGpuCurvesChannelPoints(params, 'blue')

  const data = new Uint16Array(width * 4)
  for (let i = 0; i < width; i++) {
    const x = i / (width - 1)
    const master = evaluateMonotoneCurve(masterPoints, x)
    // Curves are authored in sRGB-encoded space (typical UI convention);
    // for our linear-light pipeline we sample them AFTER converting
    // linear → sRGB in the shader, so the LUT stays in sRGB-encoded [0,1]
    // space but with 16-bit precision for smoother gradients.
    data[i * 4]     = Math.round(clamp(evaluateMonotoneCurve(redPoints,   master), 0, 1) * 65535)
    data[i * 4 + 1] = Math.round(clamp(evaluateMonotoneCurve(greenPoints, master), 0, 1) * 65535)
    data[i * 4 + 2] = Math.round(clamp(evaluateMonotoneCurve(bluePoints,  master), 0, 1) * 65535)
    data[i * 4 + 3] = 65535
  }
  return data
}
```

### 5.3 The shader

FreeCut's `curvesFragment` shader (`color.ts:482-502`):

```wgsl
@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(3) var curveLut: texture_2d<f32>;   // 256x1 rgba8

fn sampleCurveLut(value: f32) -> vec3f {
  let lutWidth = 256.0;
  let u = (clamp(value, 0.0, 1.0) * (lutWidth - 1.0) + 0.5) / lutWidth;
  return textureSample(curveLut, texSampler, vec2f(u, 0.5)).rgb;
}

@fragment
fn curvesFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);
  let c = vec3f(
    sampleCurveLut(color.r).r,
    sampleCurveLut(color.g).g,
    sampleCurveLut(color.b).b,
  );
  return vec4f(c, color.a);
}
```

Note the `${GPU_CURVES_LUT_WIDTH}.0` template literal (`:488`) — FreeCut bakes the LUT width into the shader source at module load time, so the LUT-size change requires regenerating the shader text (or replacing the literal with a uniform).

**FreeCut reference:** `src/infrastructure/gpu-effects/effects/color.ts:476-582` (effect definition; shader at `:482-502`, `dataTexture` builder at `:572-581`) and `src/shared/utils/gpu-curves.ts:227,315-335` (LUT bake). See §17.B for the full quoted shader and the ported linear-light version.

### 5.4 UI

`<CurvesPanel>` (`gpu-curves-panel.tsx` 648 LOC) shows a 230×230 px SVG plot (`CURVE_SIZE = 230` at `:42`) with up to `GPU_CURVES_MAX_POINTS = 16` draggable control points per channel (`gpu-curves.ts:228`), channel switcher (Master/Red/Green/Blue — `CHANNELS` array at `gpu-curves-panel.tsx:44-49`), and per-channel reset. Sampling: `CURVE_SAMPLE_STEPS = 64` segments (`:43`), evaluated via `evaluateMonotoneCurve()` from `shared/utils/curve-spline`. The panel takes `layout?: 'sidebar' | 'dock'` (`:30`) and supports `onParamsBatchChange` + `onParamsBatchLiveChange` for multi-point JSON updates (`:31-33`).

---

## 6. Levels

### 6.1 The model

FreeCut's `LevelsParams` (`color.ts:246-249`):

```ts
struct LevelsParams {
  inputBlack: f32, inputWhite: f32, gamma: f32, outputBlack: f32,
  outputWhite: f32, _p1: f32, _p2: f32, _p3: f32,
};
```

Param defaults (`:263-308`): `inputBlack=0`, `inputWhite=1`, `gamma=1`, `outputBlack=0`, `outputWhite=1`.

### 6.2 The shader

FreeCut's `levelsFragment` (`color.ts:245-262`, quoted in §17.C):

```wgsl
@fragment
fn levelsFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);
  var adjusted = (color.rgb - vec3f(params.inputBlack)) /
                 (params.inputWhite - params.inputBlack);
  adjusted = clamp(adjusted, vec3f(0.0), vec3f(1.0));
  adjusted = pow(adjusted, vec3f(1.0 / params.gamma));
  adjusted = mix(vec3f(params.outputBlack), vec3f(params.outputWhite), adjusted);
  return vec4f(adjusted, color.a);
}
```

⚠️ The intermediate `clamp(adjusted, vec3f(0.0), vec3f(1.0))` (`:258`) is fine for input range protection, but it assumes gamma-encoded values (pow on gamma-encoded values is wrong for linear input). The ported version applies `linear_to_srgb` before pow and `srgb_to_linear` after — see §17.C.

---

## 7. LUT (3D Look-Up Table)

### 7.1 The model

FreeCut's `LutParams` (`lut.ts:19`):

```ts
struct LutParams { intensity: f32, size: f32, _p2: f32, _p3: f32 };
```

Params (`:32-45`): `intensity` (0-1), `lutName` (json string), `lutSize` (json string of an int 2-129), `lutData` (json base64 of rgba8 bytes).

### 7.2 `.cube` parser

FreeCut's `ParsedCubeLut` (`cube-lut.ts:8-13`):

```ts
export interface ParsedCubeLut {
  title: string | null
  size: number
  /** rgba8: size*size*size*4 bytes, red fastest axis (standard .cube order), alpha=255 */
  data: Uint8Array  // ❗ 8-bit, not 16-bit
}
```

✅ **Verified**: FreeCut's LUT data is stored as `Uint8Array` (8-bit per channel). The `quantizeChannel()` function at `:103-107` confirms: `Math.round(clamp01(normalized) * 255)`. The `.cube` format itself is plain-text floats in `[0,1]`, but FreeCut immediately quantizes to 8 bits on parse — precision loss occurs at parse time.

Our ported version stores 16-bit:

```ts
export interface ParsedCubeLut {
  title: string | null
  size: number
  /** rgba16uint: size*size*size*4 channels × 2 bytes, red fastest axis, alpha=65535 */
  data: Uint16Array
}
// quantizeChannel returns Math.round(clamp01(normalized) * 65535) instead of *255
```

### 7.3 GPU upload

✅ **Verified**: FreeCut's 3D LUT texture is created at `effects-pipeline.ts:443-449`:

```ts
const texture = this.device.createTexture({
  label: `effect-${effectType}-data`,
  size: { width: payload.width, height: payload.height, depthOrArrayLayers: payload.depth },
  dimension: spec.dimension === '3d' ? '3d' : '2d',
  format: 'rgba8unorm',  // ❗ 8-bit
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
})
```

For our 10-bit pipeline we override to `rgba16float`:

```ts
const lutTexture = device.createTexture({
  size: { width: size, height: size, depthOrArrayLayers: size },
  dimension: '3d',
  format: 'rgba16float',  // 16-bit half-float — was 'rgba8unorm'
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
});

device.queue.writeTexture(
  { texture: lutTexture },
  lutData,  // Uint16Array (16-bit per channel, 4 channels = 8 bytes per texel)
  { bytesPerRow: size * 4 * 2, rowsPerImage: size },  // 4 channels × 2 bytes
  { width: size, height: size, depthOrArrayLayers: size }
);
```

### 7.4 The shader — the sRGB bug

FreeCut's `lutFragment` (`lut.ts:18-31`):

```wgsl
struct LutParams { intensity: f32, size: f32, _p2: f32, _p3: f32 };
@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> params: LutParams;
@group(0) @binding(3) var lutTex: texture_3d<f32>;
@fragment
fn lutFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);
  let size = max(params.size, 2.0);
  let coords = (clamp(color.rgb, vec3f(0.0), vec3f(1.0)) * (size - 1.0) + vec3f(0.5)) / size;
  let graded = textureSample(lutTex, texSampler, coords).rgb;
  return vec4f(mix(color.rgb, graded, clamp(params.intensity, 0.0, 1.0)), color.a);
}
```

✅ **Verified**: The shader samples the 3D LUT using the input color directly. There is **no linear → sRGB conversion** before lookup, and **no sRGB → linear conversion** after. Since most `.cube` LUTs are authored in gamma-encoded sRGB space (e.g. `sRGB → Filmic` LUTs), this is incorrect when the input texture is linear-light — FreeCut just gets away with it because its input texture is also gamma-encoded sRGB.

For our linear-light pipeline, we must convert linear → sRGB before lookup, then sRGB → linear after (see §17.D for the ported shader).

**FreeCut reference:** `src/infrastructure/gpu-effects/effects/lut.ts:12-78` (effect definition; shader at `:18-31`; `dataTexture` builder at `:51-77`) and `src/infrastructure/gpu-effects/lut/cube-lut.ts:1-267` (parser, identity generator, encoder/decoder).

---

## 8. Secondary Qualifier (HSL Keyer)

### 8.1 The model

FreeCut's `SecondaryQualifierParams` (`color.ts:948-953`):

```ts
struct SecondaryQualifierParams {
  hueCenter: f32, hueWidth: f32, hueSoftness: f32, satLow: f32,
  satHigh: f32, satSoftness: f32, lumaLow: f32, lumaHigh: f32,
  lumaSoftness: f32, invertMask: f32, showMask: f32, exposure: f32,
  saturation: f32, temperature: f32, tint: f32, strength: f32,
};
```

Param defaults (`:1007-1143`): `hueCenter=0°`, `hueWidth=35°`, `hueSoftness=20°`, `satLow=0`, `satHigh=1`, `satSoftness=0.1`, `lumaLow=0`, `lumaHigh=1`, `lumaSoftness=0.1`, `exposure=0`, `saturation=0`, `temperature=0`, `tint=0`, `strength=1`. Booleans: `invertMask=false`, `showMask=false`.

### 8.2 The shader

The full FreeCut `secondaryQualifierFragment` shader is quoted in §17.E. Key characteristics:

- **HSL conversion**: uses `rgb2hsv` (HSV, not HSL — common.ts:7-14) and `luminance601` (`color.ts:976`).
- **Hue distance** (`:958-961`): circular `min(diff, 1.0 - diff)`.
- **Range mask** (`:963-970`): `centeredRangeMask` with low/high/softness — `smoothstep` on both edges, clamped to `[0,1]`.
- **Mask combine** (`:980-982`): `mask = hueMatch * satMatch * lumaMatch`.
- **Output** (`:1005`): `clamp(mix(color.rgb, corrected, mask), vec3f(0.0), vec3f(1.0))` — clamps the result, killing HDR.

Our ported version converts linear → sRGB before the HSV/luma computation (since HSV is defined on gamma-encoded values), then converts back. See §17.E.

### 8.3 UI

`<GpuSecondaryQualifierPanel>` (`gpu-secondary-qualifier-panel.tsx` 406 LOC):

- **Hue band control** (`HueBandControl` at `:51-246`): a horizontal strip with a CSS rainbow gradient background (`:214-216`); draggable selection arc with `center/width/softness` bands; pointer-capture drag with rAF-throttled `onLiveChange` (`:92-104`); arrow-key support (`:175-191`).
- **Matte section** (`:389-396`): `showMask` and `invertMask` buttons with Eye/EyeOff icons; sliders for `satLow/satHigh/satSoftness/lumaLow/lumaHigh/lumaSoftness`.
- **Correction section** (`:398-401`): sliders for `exposure/saturation/temperature/tint/strength`.

---

## 9. Power Window (Mask Shapes)

### 9.1 The model

⚠️ **Correction to seed spec §9.1**: FreeCut supports only **two** shapes — `ellipse` and `rectangle`. There is **no polygon shape**. See §16.H for the correction.

FreeCut's `PowerWindowParams` (`color.ts:1186-1191`):

```ts
struct PowerWindowParams {
  shapeKind: f32, centerX: f32, centerY: f32, sizeX: f32,
  sizeY: f32, rotation: f32, feather: f32, invertMask: f32,
  showMask: f32, exposure: f32, saturation: f32, temperature: f32,
  tint: f32, strength: f32, sourceWidth: f32, sourceHeight: f32,
};
```

Param defaults (`:1248-1367`): `shape='ellipse'`, `centerX=0.5`, `centerY=0.5`, `sizeX=0.5`, `sizeY=0.5`, `rotation=0°`, `feather=0.3`, `exposure=0.3`, `strength=1`. Booleans: `invertMask=false`, `showMask=false`.

`shapeKind` is set at pack-time (`:1370`): `POWER_WINDOW_SHAPE_MAP = { ellipse: 0, rectangle: 1 }` (`:1174-1177`).

### 9.2 Mask texture generation

⚠️ FreeCut's `powerWindow` is **a single-pass fragment shader** (`color.ts:1185-1247`). It does **not** generate a separate mask texture — the mask is computed inline per-pixel. This is faster but doesn't support JFA feathering or shape interpolation. For our port, we keep the inline approach for v1 (no polygon = no need for JFA). The seed spec's §9.2 `generateMaskTexture` function is **NOT FOUND** in FreeCut — it's a porting suggestion, not a reference. Mark as "to be implemented if we add polygon".

### 9.3 Integration with grading

FreeCut's `powerWindowFragment` (`color.ts:1220-1247`) does the mask + grade inline:

```wgsl
@fragment
fn powerWindowFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);
  var mask = powerWindowMask(input.uv);
  if (params.invertMask > 0.5) { mask = 1.0 - mask; }
  mask = clamp(mask * params.strength, 0.0, 1.0);
  if (params.showMask > 0.5) {
    return vec4f(vec3f(mask), color.a);
  }
  var corrected = color.rgb;
  // ... exposure/saturation/temperature/tint corrections ...
  return vec4f(clamp(mix(color.rgb, corrected, mask), vec3f(0.0), vec3f(1.0)), color.a);
}
```

The grade applies only to masked pixels (mix with mask). For our port, we add a grading node abstraction that composes `qualifier ∩ powerWindow → grade` as a chain (see §9.3 of seed spec). FreeCut itself has no such composition — each effect is independent. We add this as a v2 feature.

**FreeCut reference:** `src/infrastructure/gpu-effects/effects/color.ts:1179-1387`. UI: `gpu-power-window-panel.tsx` (273 LOC).

---

## 10. Other Effects

### 10.1 Vibrance

FreeCut's `vibranceFragment` shader (`color.ts:1395-1410`, quoted in §17.F):

```wgsl
fn vibranceFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);
  let maxC = max(max(color.r, color.g), color.b);
  let minC = min(min(color.r, color.g), color.b);
  let sat = (maxC - minC) / (maxC + 0.001);
  let vibrance = params.amount * (1.0 - sat);
  let gray = luminance601(color.rgb);
  let adjusted = mix(vec3f(gray), color.rgb, 1.0 + vibrance);
  return vec4f(clamp(adjusted, vec3f(0.0), vec3f(1.0)), color.a);
}
```

Note: saturation `(maxC - minC) / (maxC + 0.001)` is normalized to `[0,1]` only for 8-bit gamma-encoded values; for linear-light, max + min can exceed 1.0 (HDR highlights). The ported version normalizes by `max(maxC, 1.0)` to keep the saturation formula well-defined in HDR.

### 10.2 Temperature & Tint

FreeCut's `temperatureFragment` (`color.ts:367-376`):

```wgsl
fn temperatureFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);
  var adjusted = color.rgb;
  adjusted.r += params.temperature * 0.1;
  adjusted.b -= params.temperature * 0.1;
  adjusted.g -= params.tint * 0.1;
  adjusted.r += params.tint * 0.05;
  adjusted.b += params.tint * 0.05;
  return vec4f(clamp(adjusted, vec3f(0.0), vec3f(1.0)), color.a);
}
```

### 10.3 Exposure (linear stops)

FreeCut's `exposureFragment` (`color.ts:117-122`):

```wgsl
fn exposureFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);
  var adjusted = color.rgb * pow(2.0, params.exposure);  // already a stops-based multiply
  adjusted += params.offset;
  adjusted = pow(max(adjusted, vec3f(0.0)), vec3f(1.0 / params.gamma));  // ❗ pow on gamma-encoded
  return vec4f(clamp(adjusted, vec3f(0.0), vec3f(1.0)), color.a);
}
```

### 10.4 Contrast with pivot

FreeCut's `contrastFragment` (`color.ts:86-90`):

```wgsl
fn contrastFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);
  let adjusted = (color.rgb - 0.5) * params.amount + 0.5;  // ❗ hardcoded 0.5 pivot
  return vec4f(clamp(adjusted, vec3f(0.0), vec3f(1.0)), color.a);
}
```

The standalone `contrast` effect uses a hardcoded 0.5 pivot (no configurable pivot). The Color Wheels effect's contrast uses a configurable `params.pivot` (`color.ts:632`).

### 10.5 Hue rotation

FreeCut's `hueShiftFragment` (`color.ts:174-182`):

```wgsl
fn hueShiftFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);
  var hsv = rgb2hsv(color.rgb);
  hsv.x = fract(params.shift + params.flow * params.time + hsv.x * params.span);
  return vec4f(hsv2rgb(hsv), color.a);
}
```

Note: the `params.time` field is set to `performance.now() / 1000` at `packUniforms` time (`:217`) — so hue shift is "live" without explicit animation when `flow > 0`.

### 10.6 Brightness, Invert, Grayscale, Sepia

- `brightness` (`:55-59`): `adjusted = color.rgb + params.amount` — linear add, clamped to `[0,1]`.
- `invert` (`:231-234`): `1.0 - color.rgb` — no clamp (correct for both linear and gamma).
- `grayscale` (`:413-418`): `mix(color.rgb, vec3f(luminance601(color.rgb)), params.amount)` — note BT.601 luma.
- `sepia` (`:445-453`): standard 3×3 sepia matrix multiply, then `mix(original, sepiaColor, amount)`.

### 10.7 Chroma Key (keying.ts)

FreeCut's `chromaKeyFragment` (`keying.ts:25-50`):

```wgsl
fn rgb2ycbcr(rgb: vec3f) -> vec3f {
  let y = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;  // BT.601 luma
  let cb = 0.564 * (rgb.b - y);
  let cr = 0.713 * (rgb.r - y);
  return vec3f(y, cb, cr);
}

fn chromaKeyFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);
  let keyColor = vec3f(params.keyR, params.keyG, params.keyB);
  let colorYCbCr = rgb2ycbcr(color.rgb);
  let keyYCbCr = rgb2ycbcr(keyColor);
  let cbcrDist = length(colorYCbCr.yz - keyYCbCr.yz);
  let innerTolerance = params.tolerance;
  let outerTolerance = params.tolerance + params.softness;
  var alpha = smoothstep(innerTolerance, outerTolerance, cbcrDist);
  // ... spill suppression (R/G/B dominant channel subtraction) ...
  return vec4f(finalColor, color.a * alpha);
}
```

The key color is set at pack-time (`:89-97`): `green` → `(0, 1, 0)`, `blue` → `(0, 0, 1)`. No red key option. Spill suppression (`:36-48`) reduces the dominant channel of the key color in the output and redistributes 50% to the other two channels — a simple but effective despill.

---

## 11. Scopes

### 11.1 Scopes overview

| Scope | Purpose | FreeCut reference |
|---|---|---|
| **Histogram** | Distribution of R/G/B/luma values | `gpu-scopes/histogram-scope.ts:1-334` (compute at `:14-55`, render at `:57-179`, class at `:181-334`) |
| **Waveform** | Luma values across the frame (horizontal axis = x position) | `gpu-scopes/waveform-scope.ts:1-479` (compute at `:14-112`, render at `:114-286`, class at `:291-478`) |
| **Vectorscope** | Chroma values plotted in polar coordinates | `gpu-scopes/vectorscope-scope.ts:1-343` (compute at `:14-58`, render at `:61-203`, class at `:207-343`) |
| **RGB Parade** | Three waveforms side-by-side (R, G, B) | ✅ Built into FreeCut's waveform as `mode == 5` (`waveform-scope.ts:192-231`) |
| **Zebra** | Overlay showing clipped highlights / crushed shadows | ❌ NOT FOUND in FreeCut — implement new |

### 11.2 Implementation (port to 16-bit input)

✅ **Verified**: FreeCut's scopes read from an 8-bit `rgba8unorm` texture. `ScopeRenderer.ensureTexture` (`scope-renderer.ts:65-78`) creates the source texture as:

```ts
this.srcTexture = this.device.createTexture({
  size: { width: w, height: h },
  format: 'rgba8unorm',           // ❗ 8-bit
  usage:
    GPUTextureUsage.TEXTURE_BINDING |
    GPUTextureUsage.COPY_DST |
    GPUTextureUsage.RENDER_ATTACHMENT,
})
```

The upload path is `copyExternalImageToTexture` from a 2D canvas (`scope-renderer.ts:86-90`). For our 10-bit pipeline, the source texture becomes `rgba16float` and the upload path is `copyExternalImageToTexture` from a `rgba16float` OffscreenCanvas (per §11 of `04-renderer-color.md`).

### 11.3 Vectorscope skin tone line

✅ FreeCut's vectorscope draws the skin tone line at **123°** (`vectorscope-scope.ts:131-137`):

```wgsl
let angle = atan2(-(uv.y - center), uv.x - center);
let skinAngle = radians(123.0);
let skinAA = smoothstep(0.0, crossW, abs(angle - skinAngle));
if (d < radiusFull + 0.01 && d > 0.01) {
  color = mix(vec3f(0.28, 0.20, 0.08), color, skinAA);
}
```

It also draws 6 color target dots at 103°/61°/-13°/-77°/-119°/167° on the 75% ring (`:140-159`), graticule circles at 100%/75%/25% (`:110-120`), and a crosshair (`:122-129`).

### 11.4 Scope UI

Each scope renders to its own canvas. The actual refresh rate isn't throttled in FreeCut — every call to `renderHistogram` / `renderWaveforms` / `renderVectorscope` re-runs the compute + render pass. We add a 10fps throttle in our port (per §11.4 of the seed spec).

### 11.5 Bit depth handling

✅ **Verified**: FreeCut's `vectorscope-scope.ts:55-57` does:

```wgsl
atomicAdd(&accumR[idx], u32(max(r * 255.0, 1.0)));
atomicAdd(&accumG[idx], u32(max(g * 255.0, 1.0)));
atomicAdd(&accumB[idx], u32(max(b * 255.0, 1.0)));
```

This assumes 8-bit `[0,1]` input. The `r * 255.0` factor is wrong for `rgba16float` input (linear-light values can be >1.0, overflowing the `u32` accumulator). Required change: `r * 65535.0` for 16-bit half-float textures, with a `clamp` to prevent overflow. See §18.

The same 8-bit pattern appears in:
- `histogram-scope.ts:44-49`: `let r = min(u32(rn * 255.0), 255u);` (256 bins, 8-bit scaling).
- `waveform-scope.ts:48-49`: `let w0 = u32((1.0 - frac) * 256.0);` — scaled accumulator weights for an 8-bit range.

**FreeCut reference:** All 5 files in `src/infrastructure/gpu-scopes/`: `histogram-scope.ts`, `waveform-scope.ts`, `vectorscope-scope.ts`, `scope-renderer.ts`, `scope-render-pass.ts`. See §18 for the full bit-depth port.

---

## 12. Real-time Feedback

Color grading requires immediate feedback — drag a slider, see the result within 1 frame (~33ms).

### 12.1 Strategy

1. **Don't re-render the whole frame on every slider change.** Only re-run the color grading pass (not decode, not YUV→linear).
2. **Cache the linear-light working texture.** Slider changes only invalidate the grading pass, not the upstream.
3. **Throttle slider events.** Coalesce rapid slider events into a single grade update per frame.

✅ FreeCut's `EffectsPipeline` (`effects-pipeline.ts:477-596`) already implements the ping-pong chain in a single command encoder, so re-running just the effect chain is cheap. The `dataTextureCache` (`:127, 388-462`) caches curve/LUT textures keyed by content hash, so unchanged LUTs don't re-upload. We extend this pattern to cache the linear-light source texture.

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

    // 2. If grade is dirty, re-run grade pass (uses FreeCut's runEffectChain pattern
    //    from effects-pipeline.ts:477-596, but with rgba16float ping/pong textures
    //    instead of rgba8unorm)
    if (this.gradeDirty) {
      this.gradeTexture = this.applyGrade(linearTexture);
      this.gradeDirty = false;
    }

    // 3. Blit to canvas (with tone-mapping for HDR display, per 04-renderer-color.md §11)
    this.blitToCanvas(this.gradeTexture);
  }
}
```

---

## 13. Open Questions — Answered

### Q1. FreeCut `gpu-effects/effects/color.ts` (1546 LOC) — full read ✅

Documented above (§3, §4, §5, §6, §8, §9, §10). Full shader quotes in §17 (A, B, C, E, F). Effect-by-effect summary:

| Effect | `color.ts` lines | Uniform size | Entry point |
|---|---|---|---|
| `brightness` | `:43-72` | 16 (1 f32 used) | `brightnessFragment` |
| `contrast` | `:74-103` | 16 | `contrastFragment` |
| `exposure` | `:105-160` | 16 (3 f32 used) | `exposureFragment` |
| `hueShift` | `:162-219` | 16 (3 f32 used + time) | `hueShiftFragment` |
| `invert` | `:221-237` | 0 (no uniform) | `invertFragment` |
| `levels` | `:239-321` | 32 (5 f32 used) | `levelsFragment` |
| `saturation` | `:323-353` | 16 | `saturationFragment` |
| `temperature` (includes `tint`) | `:355-399` | 16 (2 f32 used) | `temperatureFragment` |
| `grayscale` | `:401-431` | 16 | `grayscaleFragment` |
| `sepia` | `:433-466` | 16 | `sepiaFragment` |
| `curves` | `:476-582` | 0 (no uniform; uses dataTexture LUT) | `curvesFragment` |
| `colorWheels` | `:584-908` | 112 (28 f32 used) | `colorWheelsFragment` |
| `secondaryQualifier` | `:941-1172` | 64 (16 f32 used) | `secondaryQualifierFragment` |
| `powerWindow` | `:1179-1387` | 64 (16 f32 used) | `powerWindowFragment` |
| `vibrance` | `:1389-1423` | 16 (1 f32 used) | `vibranceFragment` |
| `gradientMap` | `:1480-1546` | 16 (1 f32 used) + dataTexture LUT | `gradientMapFragment` |

Full shader quotes for the 5 requested shaders (Color Wheels, Secondary Qualifier, Power Window, Vibrance, Curves) are in §17.

### Q2. FreeCut `gpu-effects/effects/lut.ts` + `lut/cube-lut.ts` ✅

Documented in §7. The LUT shader (`lut.ts:18-31`) operates on gamma-encoded values directly — no linearization (confirmed in §17.D). The parser (`cube-lut.ts:135-166`) stores data as `Uint8Array` (rgba8, 8-bit per channel) — confirmed at `cube-lut.ts:11-12` and the `quantizeChannel` function at `:103-107` does `Math.round(clamp01(normalized) * 255)`. The 3D LUT texture in `effects-pipeline.ts:443-449` is created with `format: 'rgba8unorm'`.

### Q3. FreeCut `gpu-effects/effects/keying.ts` ✅

Documented in §10.7. The `chromaKeyFragment` shader (`keying.ts:25-50`) uses BT.601 luma coefficients (`0.299/0.587/0.114`) for the YCbCr conversion (`:18-23`). The key is computed in CbCr space (`cbcrDist = length(colorYCbCr.yz - keyYCbCr.yz)`, `:31`) with a `smoothstep(innerTolerance, outerTolerance, cbcrDist)` mask (`:34`). Spill suppression (`:36-48`) is a simple dominant-channel subtraction. Output is `(finalColor, color.a * alpha)` — no premultiplication.

### Q4. FreeCut `shared/utils/gpu-curves.ts` ✅

Documented in §5. Curve baking is at `:318-335` (`buildGpuCurvesLutData`). LUT width is `GPU_CURVES_LUT_WIDTH = 256` (`:227`). Storage is `Uint8Array(width * 4)` (`:325`) — **8-bit, 256×1, 4 channels (RGBA)**. Curves are composed: `out = channel(master(x))` (`:302-312`). The shader samples the LUT via `textureSample(curveLut, texSampler, vec2f(u, 0.5))` (`color.ts:490`).

### Q5. FreeCut `gpu-scopes/` ✅

Documented in §11 and §18. All 5 files read:
- `histogram-scope.ts` (334 LOC): compute at `:14-55`, render at `:57-179`, class at `:181-334`. **8-bit assumption at `:44-49`** (`u32(rn * 255.0)`).
- `waveform-scope.ts` (479 LOC): compute at `:14-112`, render at `:114-286`. Includes RGB Parade (mode 5) at `:192-231`. **8-bit assumption at `:48-49`** (scaled accumulator weights assume `[0,1]` input).
- `vectorscope-scope.ts` (343 LOC): compute at `:14-58`, render at `:61-203`. Skin tone line at 123° (`:131-137`). **8-bit assumption at `:55-57`** (`u32(max(r * 255.0, 1.0))`).
- `scope-renderer.ts` (143 LOC): facade. Source texture format `rgba8unorm` at `:70`. kr/kb defaults 0.2126/0.0722 (BT.709 — `:19-20`).
- `scope-render-pass.ts` (88 LOC): shared `createScopeRenderPipeline` / `dispatchScopeComputePass` / `drawFullscreenScopePass` helpers.

Source texture format: `rgba8unorm` — confirmed at `scope-renderer.ts:70`. Required port: `rgba16float`. See §18.

### Q6. FreeCut effects UI panels ✅

Read in full:
- `gpu-wheels-panel.tsx` (1378 LOC) — full Resolve-style dock + sidebar layout, 4 wheels with hue fields, puck drag, master ring gauges, R/G/B value chips, thumb wheels. Wheel descriptors at `:429-519`, param displays at `:464-476`, `getHueAmountFromClient` at `:66-77`. ❗ The actual filename is `gpu-wheels-panel.tsx`, NOT `gpu-color-wheels-panel.tsx` as the seed spec claimed (see §16.I).
- `gpu-curves-panel.tsx` (648 LOC) — 230×230 SVG plot (`:42`), 64-segment curve sampling (`:43`), Master/Red/Green/Blue channel switcher (`:44-49`), drag-clamp logic at `:79-97`, double-click to add control points. Supports `layout: 'sidebar' | 'dock'`.
- `gpu-lut-panel.tsx` (206 LOC) — `.cube` file import via `window.showOpenFilePicker` (`:67-104`), resample to ≤33³ (`MAX_EMBEDDED_LUT_SIZE = 33` at `:21`), base64 encode into `lutData` JSON param. Intensity slider at `:169-201`.
- `gpu-secondary-qualifier-panel.tsx` (406 LOC) — hue band control (`HueBandControl` at `:51-246`), matte section (`:389-396`), correction section (`:398-401`). Pointer-capture drag with rAF-throttled live changes.
- `gpu-power-window-panel.tsx` (273 LOC) — ellipse/rectangle shape buttons (`:184-202`), 6 window sliders (center/size/rotation/feather at `:17`), canvas gizmo editing (`:87-100`), matte section, correction section.
- `gpu-gradient-map-panel.tsx` (262 LOC) — palette preset selector, custom hex stops text field, mix slider.

❗ **No dedicated panels found for**: vibrance, brightness, contrast, exposure, hue shift, saturation, temperature, tint, levels, grayscale, sepia, invert, chroma key. These all use the generic `gpu-effect-panel.tsx` (which auto-renders `<SliderInput>` rows from the effect's `params` definition). For our port, we recommend dedicated panels for `exposure`, `chroma-key`, and `levels` (the most commonly adjusted), and leave the rest as generic.

UI-surface scope note (Round 7): the DaVinci-derived UI shell (spec 18, from `ui-mock/davinci_resolve_ui_mock.html`) is **simplified** — its Color dock page hosts this spec's panels in a simplified single-column layout, with **no Resolve-style node graph or gallery**; grading surfaces via the shell's Color workspace and the inspector's Effects tab. Scope placement (§11.4) follows spec 18 §4.8's page inventory.

### Q7. FreeCut `gpu-effects/effects-pipeline.ts` (1132 LOC) ✅

Read in full. Key facts:

- **Effect registration** (`registry.ts:10-47`): `GPU_EFFECT_REGISTRY = new Map<string, GpuEffectDefinition>()`. Modules (`colorEffects`, `lutEffects`, `blurEffects`, `distortEffects`, `stylizeEffects`, `keyingEffects`) are imported as namespaces and `registerEffects()` filters each export through `isEffectDefinition()` (`:20-31`) and inserts by `effect.id`.
- **Effect chain execution** (`effects-pipeline.ts:477-596`, `runEffectChain`): iterates `effects[]`. Each effect: (a) calls `packUniforms(params, w, h)` (`:495`) → `Float32Array`; (b) gets/creates uniform buffer (`:464-475`); (c) builds bind group (cached by `${effectIndex}:${effect.type}:${viewKey}`, `:556-571`); (d) begins a render pass with `outputView` as color attachment (`:573-585`); (e) `pass.draw(6)` (fullscreen quad); (f) swaps `inputTex ↔ outputTex` (`:587-592`). Compute-variant effects branch at `:510-543` (dispatch instead of draw).
- **Ping-pong texture management** (`:354-381`, `ensurePingPong`): creates two textures with `format: 'rgba8unorm'` (`:360`) and usage `TEXTURE_BINDING | STORAGE_BINDING | RENDER_ATTACHMENT | COPY_SRC | COPY_DST` (`:364-369`). Recreated on size change; bind group cache invalidated (`:376-378`).
- **3D LUT upload path** (`:388-462`): `getOrUpdateDataTexture()` — checks `dataTextureCache` keyed by `${passIndex}:${effectType}` (`:396`). If the `spec.key(params)` (`:397`) matches the cached entry, reuses the texture view (`:399-401`). Otherwise calls `spec.build(effect.params)` (`:405`) → `EffectDataTexturePayload {width, height, depth, data}`. The texture is created at `:443-449` with `format: 'rgba8unorm'`, dimension `'2d'` or `'3d'` (per `spec.dimension`), usage `TEXTURE_BINDING | COPY_DST`. Data is uploaded via `device.queue.writeTexture` (`:412-417`) with `bytesPerRow: payload.width * 4` (4 bytes per texel = rgba8).
- **Bind group construction** (`:558-571`): `[sampler (binding 0), inputView (binding 1), uniformBuffer? (binding 2), dataTextureView? (binding 3)]`. The layout is declared at `:269-291`.
- **Cached pipelines** (`:97-101`): `pipelines: Map<string, GPURenderPipeline>` and `computePipelines: Map<string, GPUComputePipeline>`, both created once at construction (`:191-206`).

### Q8. FreeCut `gpu-effects/common.ts` (98 LOC) ✅

Read in full. The `COMMON_WGSL` template literal is prepended to every effect shader (`effects-pipeline.ts:263`). Contains:

- **`rgb2hsv` / `hsv2rgb`** (`:7-20`): standard 4-component quaternion-style conversion (Sam Hocevar's "Sexy's RGB to HSV" optimized form).
- **`rgb2hsl` / `hsl2rgb`** (`:22-60`): standard HSL with `hue2rgb` helper (`:41-49`).
- **`luminance`** (`:62-64`): BT.709 weights `0.2126, 0.7152, 0.0722`.
- **`luminance601`** (`:66-68`): BT.601 weights `0.299, 0.587, 0.114`.
- **Constants**: `PI`, `TAU`, `E` (`:70-72`).
- **`gaussian`** (`:74-76`), **`smootherstep`** (`:78-81`), **`hash`** (`:83-86`), **`noise2d`** (`:88-97`).
- **`FULLSCREEN_QUAD_WGSL`** (imported from `@/infrastructure/gpu-shared/fullscreen-quad` at `:1`): provides the `VertexOutput` struct and `vertexMain` entry point.

⚠️ **Important**: FreeCut's color shaders predominantly use `luminance601` (BT.601 weights), NOT `luminance` (BT.709). This is technically wrong for sRGB-encoded material — sRGB uses BT.709 primaries, so the correct luma weights are BT.709 — but FreeCut chose BT.601 because (a) it's the traditional video luma, (b) the difference is small for typical footage. For our linear-light port, we MUST use BT.709 because (a) we're working in BT.709/2020 primaries, (b) linear-light values require the correct luminance coefficients. The seed spec's suggestion to add `linear_to_srgb`, `srgb_to_linear`, `linear_to_pq`, `pq_to_linear`, `linear_to_hlg`, `hlg_to_linear` helpers is correct — these belong in a new `color-management.wgsl` module that gets prepended alongside `COMMON_WGSL`. See §16.G.

### Q9. Resolve/FCP reference

UI reference only — not code. FreeCut's `gpu-wheels-panel.tsx` is already heavily Resolve-inspired (the dock layout with master ring gauges at `:478-519` matches Resolve's Color Page wheel layout, including the phase-flipped gain gauge at `:504-506`). We adopt FreeCut's UI as our reference, with adjustments for our linear-light working space (no visual change — just internal math).

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

## 15. Code References

### FreeCut primary sources (verified line-by-line by SCOUT-08)

| File | LOC | Role |
|---|---|---|
| `src/infrastructure/gpu-effects/effects/color.ts` | 1546 | Color effects: brightness, contrast, exposure, hueShift, invert, levels, saturation, temperature, grayscale, sepia, curves, **colorWheels**, **secondaryQualifier**, **powerWindow**, **vibrance**, gradientMap |
| `src/infrastructure/gpu-effects/effects/lut.ts` | 85 | 3D LUT effect (`lut3d`); shader at `:18-31` |
| `src/infrastructure/gpu-effects/effects/keying.ts` | 109 | Chroma key effect (`chromaKey`); shader at `:9-50` |
| `src/infrastructure/gpu-effects/lut/cube-lut.ts` | 267 | `.cube` parser, identity generator, base64 encoder/decoder, trilinear resampler |
| `src/infrastructure/gpu-effects/effects-pipeline.ts` | 1132 | `EffectsPipeline` class: ping-pong textures (`:354-381`), uniform buffers (`:464-475`), effect chain execution (`:477-596`), data texture cache (`:388-462`), bind group cache (`:556-571`) |
| `src/infrastructure/gpu-effects/common.ts` | 98 | `COMMON_WGSL` helpers: `rgb2hsv`, `hsv2rgb`, `rgb2hsl`, `hsl2rgb`, `luminance` (BT.709), `luminance601` (BT.601), `gaussian`, `smootherstep`, `hash`, `noise2d` |
| `src/infrastructure/gpu-effects/registry.ts` | 83 | `GPU_EFFECT_REGISTRY` map + `registerEffects()` auto-registration |
| `src/infrastructure/gpu-effects/types.ts` | (not read) | `GpuEffectDefinition`, `EffectParam`, `EffectDataTextureSpec` interfaces |
| `src/shared/utils/gpu-curves.ts` | 353 | Curve model, control point sanitization, monotone cubic spline evaluation, 256×1 rgba8 LUT bake (`buildGpuCurvesLutData` at `:318-335`) |
| `src/shared/utils/curve-spline.ts` | (not read) | `evaluateMonotoneCurve()` — Fritsch-Carlson monotone cubic Hermite interpolation |
| `src/infrastructure/gpu-scopes/histogram-scope.ts` | 334 | Compute shader (256 bins) + render shader (phosphor glow, AA edges, grid) |
| `src/infrastructure/gpu-scopes/waveform-scope.ts` | 479 | Compute shader (1024×512 accumulator, 5-tap Gaussian spread) + render shader (5 modes + RGB Parade at mode 5) |
| `src/infrastructure/gpu-scopes/vectorscope-scope.ts` | 343 | Compute shader (512×512 CbCr accumulator) + render shader (graticule, skin tone at 123°, 6 color targets, bloom) |
| `src/infrastructure/gpu-scopes/scope-renderer.ts` | 143 | Facade: device + source texture (rgba8unorm) + 3 scope instances + matrix/range setters |
| `src/infrastructure/gpu-scopes/scope-render-pass.ts` | 88 | Shared helpers: `createScopeRenderBindGroupLayout`, `createScopeRenderPipeline`, `dispatchScopeComputePass`, `drawFullscreenScopePass` |

### FreeCut UI panel sources

| File | LOC | Role |
|---|---|---|
| `src/features/effects/components/panels/gpu-wheels-panel.tsx` | 1378 | Color Wheels UI (sidebar + dock layouts, 4 wheels, puck drag, master rings, R/G/B chips, thumb wheels). ❗ NOT `gpu-color-wheels-panel.tsx` |
| `src/features/effects/components/panels/gpu-curves-panel.tsx` | 648 | Curves UI (230×230 SVG, 4 channels, up to 16 control points, drag/add/reset) |
| `src/features/effects/components/panels/gpu-lut-panel.tsx` | 206 | LUT UI (file picker, base64 embed, intensity slider) |
| `src/features/effects/components/panels/gpu-secondary-qualifier-panel.tsx` | 406 | Qualifier UI (hue band, matte section, correction section) |
| `src/features/effects/components/panels/gpu-power-window-panel.tsx` | 273 | Power Window UI (shape buttons, window sliders, canvas gizmo, matte + correction) |
| `src/features/effects/components/panels/gpu-gradient-map-panel.tsx` | 262 | Gradient Map UI (preset selector, custom hex stops, mix slider) |
| `src/features/effects/components/panels/gpu-effect-panel.tsx` | (not read) | Generic panel — auto-renders sliders from `definition.params`. Used by all other effects |
| `src/features/effects/components/panels/panel-props.ts` | 33 | Shared `GpuPanelBaseProps` + `GpuKeyframePanelProps` interfaces |

### Our port target files (proposed)

| File | Role |
|---|---|
| `src/platform/renderer/effects/color-effects.ts` | Ported `color.ts` — all 16 effects, with linear-light shader modifications |
| `src/platform/renderer/effects/lut-effect.ts` | Ported `lut.ts` — with linear↔sRGB conversion around LUT lookup |
| `src/platform/renderer/effects/keying-effect.ts` | Ported `keying.ts` — with BT.709 luma and proper spill suppression |
| `src/platform/renderer/effects/curve-bake.ts` | Ported `gpu-curves.ts` — 1024×1 rgba16uint LUT instead of 256×1 rgba8 |
| `src/platform/renderer/effects/cube-lut-parser.ts` | Ported `cube-lut.ts` — 16-bit data storage |
| `src/platform/renderer/effects/effects-pipeline.ts` | Ported `effects-pipeline.ts` — `rgba16float` ping/pong, `rgba16float` storage textures, `rgba16float` LUT textures |
| `src/platform/renderer/effects/color-management.wgsl` | New: `linear_to_srgb`, `srgb_to_linear`, `linear_to_pq`, `pq_to_linear`, `linear_to_hlg`, `hlg_to_linear`, `luminance_linear` (BT.709/BT.2020 selector) |
| `src/platform/renderer/scopes/scope-renderer.ts` | Ported — `rgba16float` source texture, kr/kb matrix selector (BT.709/BT.2020), range/transfer selector (SDR/HDR-PQ/HDR-HLG) |
| `src/platform/renderer/scopes/histogram-scope.ts` | Ported — 1024 bins (was 256), 16-bit accumulator, transfer-function-aware binning |
| `src/platform/renderer/scopes/waveform-scope.ts` | Ported — 16-bit accumulator, transfer-function-aware IRE mapping |
| `src/platform/renderer/scopes/vectorscope-scope.ts` | Ported — `r * 65535.0` (was `r * 255.0`), BT.709/BT.2020 matrix selector |
| `src/features/color/panels/wheels-panel.tsx` | Ported UI |
| `src/features/color/panels/curves-panel.tsx` | Ported UI |
| `src/features/color/panels/lut-panel.tsx` | Ported UI |
| `src/features/color/panels/qualifier-panel.tsx` | Ported UI |
| `src/features/color/panels/power-window-panel.tsx` | Ported UI |
| `src/features/color/panels/gradient-map-panel.tsx` | Ported UI |

### 15A. Code References — nle-engine (reference, NOT canon)

> The private **nle-engine** repo (github.com/bearachprema/nle-engine, 37,958 LOC, 124 tests) is a clean-room FreeCut-port **in-between reference, NOT canon**. It de-risks implementation but inherits FreeCut patterns this spec corrects (8-bit sRGB pipeline, JSON-RPC+$ref headless protocol, class-based API, procedural media, single-tier tests, zero workers). Where engine and spec conflict, **the spec wins**; deltas are documented, not adopted. Full reconciliation: `19-code-references.md`.

| Spec section | nle-engine file:line | verified quote | status | note |
|---|---|---|---|---|
| §3 effect inventory | `src/lib/nle/effects/pipeline.ts:4559` | `registerEffects({` | ALIGNED | Full tool inventory; registry counts 43→44 (Wave 3E) |
| §13.Q7 registry pattern | `src/lib/nle/effects/pipeline.ts:3003` | `export const GPU_EFFECT_REGISTRY = new Map<string, GpuEffectDefinition>();` | ALIGNED | Same Map + buckets + registerEffects walk |
| §4.1/§16.A wheels model | `src/lib/nle/effects/pipeline.ts:1883` | `fn wheelTint(color: vec3f, hue: f32, amount: f32, mask: f32) -> vec3f {` | ALIGNED | Corrected (hue, amount) + scalar lift/gamma/gain/offset — confirms §16.A |
| §4.2 scene-linear port | `src/lib/nle/effects/pipeline.ts:1894` | `let luma = luminance601(c);` | CORRECTIVE | 8-bit gamma sRGB + BT.601 luma; spec's 10-bit linear wins (Decision 5) |
| §7.2/§5.2 precision | `src/lib/nle/effects/pipeline.ts:37` | `Ping-pong chaining (effects-pipeline.ts:477-596). Two \`rgba8unorm\`` | CORRECTIVE | 8-bit chain; rgba16float/uint win |
| §7.2 .cube parser | `src/lib/nle/effects/lut.ts:49` | `rgba8: size*size*size*4 bytes, red fastest axis` | CORRECTIVE | 8-bit quantization; spec's Uint16Array port wins |
| §7.4 LUT sRGB bug | `src/lib/nle/effects/lut.ts:337` | `let graded = textureSample(lutTex, texSampler, coords).rgb;` | CORRECTIVE | No linear↔sRGB conversion (FreeCut bug preserved); spec §17.D wins |
| §7.3 GPU upload | `src/lib/nle/effects/pipeline.ts:4812` | `format: 'rgba8unorm',` | CORRECTIVE | 8-bit data textures; spec overrides |
| §12.1 runEffectChain | `src/lib/nle/effects/pipeline.ts:5086` | `const finalTex = this.runEffectChain(` | ALIGNED | Single-encoder chain + params-keyed cache |
| §12.2 real-time cache | `src/lib/nle/playback/player.ts:1076` | `const enabledEffects = (clip.effects ?? []).filter((e) => e.enabled);` | ENGINE-GAP | Whole-frame re-render; no dirty-flag cache |
| §11/§18 scopes | (directory census) | no scopes module in src/lib/nle | ENGINE-GAP | FreeCut's gpu-scopes/ is the only reference |

Layout note: our §15 port targets (`src/platform/renderer/effects/*`) predate the engine; the engine's actual layout is `src/lib/nle/effects/*` — reconciled in `19-code-references.md` §11.

---

## 16. Corrections to Seed Spec

### 16.A ❌ §4.2 Color Wheels uniform layout — invented RGB lift/gamma/gain/offset fields

**Seed spec §4.2 (lines 118-135):**
```wgsl
struct ColorWheelsUniforms {
  lift_shadows_r: f32, lift_shadows_g: f32, lift_shadows_b: f32, _pad0: f32,
  gamma_mids_r: f32, gamma_mids_g: f32, gamma_mids_b: f32, _pad1: f32,
  gain_highlights_r: f32, gain_highlights_g: f32, gain_highlights_b: f32, _pad2: f32,
  offset_r: f32, offset_g: f32, offset_b: f32, _pad3: f32,
  exposure: f32, contrast: f32, pivot: f32, saturation: f32,
  // ... 12 more fields ...
};
```

**Wrong.** FreeCut's actual `WheelsParams` (`color.ts:591-599`) uses **`(hue, amount)` per wheel, not RGB triples**:

```wgsl
struct WheelsParams {
  shHue: f32, shAmount: f32, midHue: f32, midAmount: f32,   // 4 wheels × (hue, amount)
  hlHue: f32, hlAmount: f32, temperature: f32, tint: f32,
  saturation: f32, exposure: f32, contrast: f32, pivot: f32,
  lift: f32, gamma: f32, gain: f32, offset: f32,             // scalars, NOT vec3
  blackPoint: f32, whitePoint: f32, offHue: f32, offAmount: f32,
  midDetail: f32, colorBoost: f32, shadows: f32, highlights: f32,
  hue: f32, lumMix: f32, _pad1: f32, _pad2: f32,
};
```

Total: 28 f32 = 112 bytes (matches `uniformSize: 112` at `color.ts:589`). The `wheelTint()` function at `:604-609` converts `(hue, amount)` into a tint color via `hsv2rgb(vec3f(hue/360, 1.0, 1.0))` and mixes it into the pixel color. The separate scalar `lift/gamma/gain/offset` (one f32 each, applied as `c = (c + vec3f(lift) + vec3f(offset)) * gain; c = pow(c, 1.0/gamma)` at `:639-640`) are independent RGB multiplier controls.

**Corrected approach (preserved in our port):** keep FreeCut's exact uniform layout (112 bytes, 28 f32, identical to seed spec's `packUniforms` table at `color.ts:910-939`). The `packUniforms` function needs zero changes. Only the shader math is modified (BT.709 luma, 0.18 mask threshold, no output clamp) — see §17.A for the ported shader.

### 16.B ❌ §5.2 Curve LUT is 256×1 rgba8 in FreeCut — seed spec said "1024×1 16-bit"

**Seed spec §5.2 (lines 290-312):** claims FreeCut's `bakeCurveLUT()` produces a `Uint16Array` of size 1024. **Wrong.** FreeCut's actual implementation (`gpu-curves.ts:227, 318-335`):

```ts
export const GPU_CURVES_LUT_WIDTH = 256  // :227 — NOT 1024
// ...
const data = new Uint8Array(width * 4)  // :325 — Uint8Array, NOT Uint16Array
// ...
data[i * 4]     = Math.round(clamp(evaluateMonotoneCurve(redPoints,   master), 0, 1) * 255)  // :329 — * 255, NOT * 65535
data[i * 4 + 1] = Math.round(clamp(evaluateMonotoneCurve(greenPoints, master), 0, 1) * 255)  // :330
data[i * 4 + 2] = Math.round(clamp(evaluateMonotoneCurve(bluePoints,  master), 0, 1) * 255)  // :331
data[i * 4 + 3] = 255  // :332
```

**Verified:** FreeCut bakes curves into a **256×1 rgba8 (8-bit) LUT**. The seed spec's "1024×1 16-bit" claim is a porting target, not a description of FreeCut. The ported version (§5.2 above) correctly upgrades to `Uint16Array(1024 * 4)` with `* 65535` scaling. The curve data texture format is also `rgba8unorm` in FreeCut (`effects-pipeline.ts:447`), which we override to `rgba16float` or `rgba16uint`.

### 16.C ❌ §7.2 `.cube` parser stores 8-bit data, not 16-bit

**Seed spec §7.2 (lines 434-447):** claims `data: Uint16Array` for the parsed LUT. **Wrong for FreeCut.** The actual `ParsedCubeLut.data` is `Uint8Array` (`cube-lut.ts:11-12`). The `quantizeChannel` function at `:103-107` confirms 8-bit quantization: `Math.round(clamp01(normalized) * 255)`. The seed spec's "Uint16Array" is the porting target — not a description of FreeCut.

### 16.D ❌ §7.3 3D LUT texture is `rgba8unorm`, not `rgba16float`

**Seed spec §7.3 (lines 451-465):** claims FreeCut creates the 3D LUT texture as `format: 'rgba16float'`. **Wrong.** The actual creation (`effects-pipeline.ts:443-449`):

```ts
const texture = this.device.createTexture({
  label: `effect-${effectType}-data`,
  size: { width: payload.width, height: payload.height, depthOrArrayLayers: payload.depth },
  dimension: spec.dimension === '3d' ? '3d' : '2d',
  format: 'rgba8unorm',  // ❗ 8-bit, NOT rgba16float
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
})
```

The same `rgba8unorm` format is used for the curve LUT data texture (since both go through the same `acquireDataTextureEntry` path at `:423-462`). The seed spec's `rgba16float` is the porting target.

### 16.E ⚠️ §9.1 Power Window supports only 2 shapes (ellipse + rectangle), NOT 3

**Seed spec §9.1 (line 583):** `'rectangle' | 'ellipse' | 'polygon'`. **Wrong.** FreeCut supports only 2 shapes — `ellipse` (shapeKind=0) and `rectangle` (shapeKind=1) — per `POWER_WINDOW_SHAPE_MAP` at `color.ts:1174-1177`. There is no polygon shape, no `polygon` param option (`:1253-1256`). The mask is computed inline via `powerWindowMask()` (`:1203-1218`) using `length(normalized)` for ellipse and `max(abs(normalized.x), abs(normalized.y))` for rectangle — no JFA feathering needed because the smoothstep feather is computed in-shader at `:1217`.

**Corrected approach:** for v1, port only ellipse + rectangle (matches FreeCut). If polygon support is needed for v2, we add a separate mask texture generation pass (the seed spec's `generateMaskTexture` function) + JFA feathering per `04-renderer-color.md` §8.4.

### 16.F ❌ §10.5 Saturation standalone effect — seed spec was already correct, but the Color Wheels saturation math differs

**Seed spec §10.5:** (no separate saturation shader; instead the Color Wheels shader at §4.2 lines 196-198 does `c = mix(vec3f(l), c, params.saturation)`). This matches FreeCut's `colorWheelsFragment` at `:646-648`:

```wgsl
let sat = 1.0 + params.saturation / 100.0;   // saturation is -100..100, default 0
let gray = luminance601(c);
c = mix(vec3f(gray), c, sat);
```

The seed spec's `c = mix(vec3f(l), c, params.saturation)` (treating saturation as a direct multiplier where 1.0 = no change) is **structurally different** from FreeCut's `(1.0 + saturation/100.0)` (where 0 = no change). For our port, we use FreeCut's convention to match the UI (saturation slider -100..100, default 0). The standalone `saturationFragment` effect (`color.ts:323-353`) uses yet another convention: `params.amount` directly as the mix factor (default 1.0 = no change, 0 = grayscale, 3 = 3× saturated). Three conventions coexist in FreeCut — we standardize on the Color Wheels convention for grade effects, and keep the standalone `amount` convention for the standalone `saturation` effect.

### 16.G ⚠️ §13.Q8 Missing color-management WGSL helpers — must be added to a NEW module

**Seed spec §13.Q8:** "We'll add `luminance_linear`, `linear_to_srgb`, `srgb_to_linear`, `linear_to_pq`, `pq_to_linear`, `linear_to_hlg`, `hlg_to_linear`."

✅ **Verified correct plan.** FreeCut's `common.ts:62-64` already provides a BT.709 `luminance()` function:

```wgsl
fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.2126, 0.7152, 0.0722));
}
```

But it's never used by any color shader — they all use `luminance601` (BT.601, `:66-68`). The transfer-function helpers (`linear_to_srgb`, etc.) are **NOT FOUND** anywhere in FreeCut — they must be added in a new `color-management.wgsl` module that gets prepended alongside `COMMON_WGSL` in our ported `effects-pipeline.ts:263`. The transfer functions are defined in `04-renderer-color.md` §8 (BT.709/BT.2020/PQ/HLG EOTFs). The ported shaders import them by name (no module system in WGSL — `#include` is via string concatenation, same as FreeCut's `COMMON_WGSL` prepend pattern).

### 16.H ❌ §11.4 Scope UI throttling — not in FreeCut, must be added

**Seed spec §11.4 (line 768):** "Updates happen at ~10 fps (not every frame) to avoid GPU overhead." **Verified not present in FreeCut.** `ScopeRenderer.renderHistogram` / `renderWaveforms` / `renderVectorscope` (`scope-renderer.ts:106-134`) are called every frame by the consumer. The 10fps throttle is a porting addition (we add it in our `ScopeRenderer` wrapper).

### 16.I ❌ §4.3 / §13.Q6 panel filename — actual file is `gpu-wheels-panel.tsx`, NOT `gpu-color-wheels-panel.tsx`

**Seed spec §4.3 (line 258) and §13.Q6:** `src/features/effects/components/panels/gpu-color-wheels-panel.tsx`. **Wrong filename.** The actual file is `src/features/effects/components/panels/gpu-wheels-panel.tsx` (1378 LOC). All other panel filenames in the seed spec match (gpu-curves-panel, gpu-lut-panel, etc.).

### 16.J ❌ §3 "Curves baking logic around line 1460" — that's the Gradient Map LUT builder, not the Curves LUT builder

**Seed spec §3 (line 33):** "Curves | ... | `gpu-effects/effects/color.ts:1460, 1536`". **Wrong.** Line 1460 of `color.ts` is the `buildGradientMapLut()` function for the Gradient Map effect (`:1461-1478`), not the Curves LUT builder. Line 1536 is inside the `gradientMap` effect's `packUniforms` (`:1534`). The actual Curves LUT builder is in `shared/utils/gpu-curves.ts:318-335` (`buildGpuCurvesLutData`). The Curves effect definition itself is at `color.ts:476-582`.

**Corrected reference:** Curves = `gpu-effects/effects/color.ts:476-582` (effect definition + shader) + `shared/utils/gpu-curves.ts:227,318-335` (LUT bake). The seed spec's `:1460, 1536` references are wrong.

### 16.K ❌ §3 "Vibrance shader around line 1390" — verified correct, but the seed spec's quoted math is wrong

**Seed spec §3 (line 38):** "`vibranceFragment` shader around line 1390" — ✅ **verified** (actual at `:1389-1423`).

But the seed spec's §10.1 quoted shader (lines 651-664) is **partially wrong**. The seed spec says:
```wgsl
let sat = (max_c - min_c) / max(max_c, 0.001);
let boost = params.vibrance * (1.0 - sat);
c = mix(vec3f(luma), c, 1.0 + boost);
```

FreeCut's actual code (`color.ts:1403-1408`):
```wgsl
let maxC = max(max(color.r, color.g), color.b);
let minC = min(min(color.r, color.g), color.b);
let sat = (maxC - minC) / (maxC + 0.001);                       // ❗ + 0.001, not max(maxC, 0.001)
let vibrance = params.amount * (1.0 - sat);                    // ❗ variable name 'vibrance', not 'boost'
let gray = luminance601(color.rgb);                            // ❗ luma computed AFTER sat, not before
let adjusted = mix(vec3f(gray), color.rgb, 1.0 + vibrance);
```

For our port: the `maxC + 0.001` divisor is fine for SDR but wrong for HDR (maxC can be >1.0, inflating the denominator and zeroing the boost). We change to `max(maxC, 0.001)` per the seed spec's intuition. Also switch to `luminance()` (BT.709) for linear-light input.

---

## 17. Full Shader Quotes

### 17.A FreeCut `colorWheelsFragment` shader (color.ts:590-663)

```wgsl
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

### 17.A-port Our ported `colorWheelsFragment` (linear-light, 16-bit)

```wgsl
// Uniform layout is UNCHANGED from FreeCut (28 f32 = 112 bytes) so packUniforms()
// in color.ts:904-907 needs no change. Only the shader math is modified.
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
@group(0) @binding(1) var inputTex: texture_2d<f32>;     // rgba16float linear-light
@group(0) @binding(2) var<uniform> params: WheelsParams;

fn wheelTint(color: vec3f, hue: f32, amount: f32, mask: f32) -> vec3f {
  if (amount < 0.001) { return color; }
  let tintColor = hsv2rgb(vec3f(hue / 360.0, 1.0, 1.0));
  return mix(color, color * mix(vec3f(1.0), tintColor, amount), mask);
}

@fragment
fn colorWheelsFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);
  var c = color.rgb;
  // CHANGED: luminance() BT.709 (common.ts:62-64) instead of luminance601()
  let luma = luminance(c);
  // CHANGED: mask thresholds 0.0→0.18 (mid-gray in linear-light = 18% reflectance)
  let shadowMask = 1.0 - smoothstep(0.0, 0.18, luma);
  let highlightMask = smoothstep(0.18, 1.0, luma);
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

  c *= pow(2.0, params.exposure);                            // CORRECT in linear-light
  c = (c - vec3f(params.pivot)) * params.contrast + vec3f(params.pivot);
  if (abs(params.midDetail) > 0.001) {
    let detailLuma = luminance(c);                           // CHANGED: BT.709
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
  let gray = luminance(c);                                   // CHANGED: BT.709
  c = mix(vec3f(gray), c, sat);
  let colorBoost = params.colorBoost / 100.0;
  if (abs(colorBoost) > 0.001) {
    let boostedGray = luminance(c);                          // CHANGED: BT.709
    let chroma = c - vec3f(boostedGray);
    c = vec3f(boostedGray) + chroma * (1.0 + colorBoost * (1.0 - clamp(length(chroma), 0.0, 1.0)));
  }
  if (abs(params.hue - 50.0) > 0.001) {
    var hsv = rgb2hsv(c);
    hsv.x = fract(hsv.x + ((params.hue - 50.0) / 100.0));
    c = hsv2rgb(hsv);
  }
  let postLuma = luminance(c);                               // CHANGED: BT.709
  c = mix(vec3f(postLuma), c, clamp(params.lumMix / 100.0, 0.0, 1.0));
  // REMOVED: clamp(c, vec3f(0.0), vec3f(1.0)) — preserve HDR highlights
  return vec4f(c, color.a);
}
```

### 17.B FreeCut `curvesFragment` shader (color.ts:482-502)

```wgsl
@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(3) var curveLut: texture_2d<f32>;

fn sampleCurveLut(value: f32) -> vec3f {
  let lutWidth = ${GPU_CURVES_LUT_WIDTH}.0;
  let u = (clamp(value, 0.0, 1.0) * (lutWidth - 1.0) + 0.5) / lutWidth;
  return textureSample(curveLut, texSampler, vec2f(u, 0.5)).rgb;
}

@fragment
fn curvesFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);
  let c = vec3f(
    sampleCurveLut(color.r).r,
    sampleCurveLut(color.g).g,
    sampleCurveLut(color.b).b,
  );
  return vec4f(c, color.a);
}
```

Note: `${GPU_CURVES_LUT_WIDTH}` is a JS template literal expanded at module load to `256`. The LUT data is `Uint8Array(256 * 4)` rgba8, uploaded to a `rgba8unorm` texture via `effects-pipeline.ts:412-417`.

### 17.B-port Our ported `curvesFragment` (linear-light, 16-bit LUT)

```wgsl
@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;       // rgba16float linear-light
@group(0) @binding(3) var curveLut: texture_2d<f32>;       // rgba16float 1024×1

fn sampleCurveLut(value: f32) -> vec3f {
  let lutWidth = 1024.0;                                     // CHANGED: 256 → 1024
  let u = (clamp(value, 0.0, 1.0) * (lutWidth - 1.0) + 0.5) / lutWidth;
  return textureSample(curveLut, texSampler, vec2f(u, 0.5)).rgb;
}

@fragment
fn curvesFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);

  // CHANGED: Curves are authored in sRGB-encoded space (UI convention).
  // Convert linear → sRGB before lookup, then sRGB → linear after.
  // (Most colorists draw curves against the sRGB-encoded signal they see.)
  var encoded = linear_to_srgb(color.rgb);

  // Per-channel curves: lookup via .r, .g, .b of the LUT (4 channels in one texture).
  encoded = vec3f(
    sampleCurveLut(encoded.r).r,
    sampleCurveLut(encoded.g).g,
    sampleCurveLut(encoded.b).b,
  );

  let c = srgb_to_linear(encoded);
  return vec4f(c, color.a);
}
```

### 17.C FreeCut `levelsFragment` shader (color.ts:245-262)

```wgsl
struct LevelsParams {
  inputBlack: f32, inputWhite: f32, gamma: f32, outputBlack: f32,
  outputWhite: f32, _p1: f32, _p2: f32, _p3: f32,
};
@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> params: LevelsParams;
@fragment
fn levelsFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);
  var adjusted = (color.rgb - vec3f(params.inputBlack)) /
                 (params.inputWhite - params.inputBlack);
  adjusted = clamp(adjusted, vec3f(0.0), vec3f(1.0));
  adjusted = pow(adjusted, vec3f(1.0 / params.gamma));
  adjusted = mix(vec3f(params.outputBlack), vec3f(params.outputWhite), adjusted);
  return vec4f(adjusted, color.a);
}
```

### 17.C-port Our ported `levelsFragment` (linear-light)

```wgsl
struct LevelsParams {
  inputBlack: f32, inputWhite: f32, gamma: f32, outputBlack: f32,
  outputWhite: f32, _p1: f32, _p2: f32, _p3: f32,
};
@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;       // rgba16float linear-light
@group(0) @binding(2) var<uniform> params: LevelsParams;
@fragment
fn levelsFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);

  // CHANGED: convert linear → sRGB so input black/white points are interpreted
  // as sRGB-encoded values (matches the UI convention: 0..1 sliders with 0=black,
  // 1=white in sRGB space). The gamma pow is also applied in sRGB-encoded space
  // (typical "Levels" tool semantics from Photoshop / Resolve).
  var encoded = linear_to_srgb(color.rgb);

  // Input levels: stretch [inputBlack, inputWhite] to [0, 1]
  encoded = (encoded - vec3f(params.inputBlack)) /
            max(vec3f(params.inputWhite - params.inputBlack), vec3f(0.001));
  encoded = clamp(encoded, vec3f(0.0), vec3f(1.0));

  // Gamma (in sRGB-encoded space — Levels-tool convention)
  encoded = pow(encoded, vec3f(1.0 / max(params.gamma, 0.001)));

  // Output levels: compress [0, 1] to [outputBlack, outputWhite]
  encoded = mix(vec3f(params.outputBlack), vec3f(params.outputWhite), encoded);

  let c = srgb_to_linear(encoded);                          // CHANGED: back to linear
  return vec4f(c, color.a);
}
```

### 17.D FreeCut `lutFragment` shader (lut.ts:18-31) — the sRGB bug

```wgsl
struct LutParams { intensity: f32, size: f32, _p2: f32, _p3: f32 };
@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> params: LutParams;
@group(0) @binding(3) var lutTex: texture_3d<f32>;
@fragment
fn lutFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);
  let size = max(params.size, 2.0);
  let coords = (clamp(color.rgb, vec3f(0.0), vec3f(1.0)) * (size - 1.0) + vec3f(0.5)) / size;
  let graded = textureSample(lutTex, texSampler, coords).rgb;
  return vec4f(mix(color.rgb, graded, clamp(params.intensity, 0.0, 1.0)), color.a);
}
```

❗ **No `linear_to_srgb` / `srgb_to_linear` calls** — FreeCut samples the LUT using the input texture directly. Since FreeCut's input texture is gamma-encoded sRGB, this works (the LUT is also authored in sRGB space). For our linear-light pipeline, this is a bug — see the port below.

### 17.D-port Our ported `lutFragment` (linear-light, with sRGB conversion)

```wgsl
struct LutParams { intensity: f32, size: f32, _p2: f32, _p3: f32 };
@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;       // rgba16float linear-light
@group(0) @binding(2) var<uniform> params: LutParams;
@group(0) @binding(3) var lutTex: texture_3d<f32>;          // rgba16float 3D LUT
@fragment
fn lutFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);

  // CHANGED: most .cube LUTs are authored in gamma-encoded sRGB space.
  // Convert linear → sRGB before lookup, then sRGB → linear after.
  var encoded = linear_to_srgb(color.rgb);

  let size = max(params.size, 2.0);
  let coords = (clamp(encoded, vec3f(0.0), vec3f(1.0)) * (size - 1.0) + vec3f(0.5)) / size;
  let graded = textureSample(lutTex, texSampler, coords).rgb;

  // CHANGED: convert graded sRGB back to linear-light
  let gradedLinear = srgb_to_linear(graded);

  // Intensity blend (in linear space)
  let result = mix(color.rgb, gradedLinear, clamp(params.intensity, 0.0, 1.0));
  return vec4f(result, color.a);
}
```

### 17.E FreeCut `secondaryQualifierFragment` shader (color.ts:947-1006)

```wgsl
struct SecondaryQualifierParams {
  hueCenter: f32, hueWidth: f32, hueSoftness: f32, satLow: f32,
  satHigh: f32, satSoftness: f32, lumaLow: f32, lumaHigh: f32,
  lumaSoftness: f32, invertMask: f32, showMask: f32, exposure: f32,
  saturation: f32, temperature: f32, tint: f32, strength: f32,
};
@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> params: SecondaryQualifierParams;

fn circularHueDistance(hue: f32, center: f32) -> f32 {
  let diff = abs(hue - center);
  return min(diff, 1.0 - diff);
}

fn centeredRangeMask(value: f32, lowValue: f32, highValue: f32, softness: f32) -> f32 {
  let low = min(lowValue, highValue);
  let high = max(lowValue, highValue);
  let soft = max(softness, 0.0001);
  let lowMask = smoothstep(low - soft, low, value);
  let highMask = 1.0 - smoothstep(high, high + soft, value);
  return clamp(lowMask * highMask, 0.0, 1.0);
}

@fragment
fn secondaryQualifierFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);
  let hsv = rgb2hsv(color.rgb);
  let luma = luminance601(color.rgb);
  let hueDistance = circularHueDistance(hsv.x, fract(params.hueCenter / 360.0));
  let hueWidth = clamp(params.hueWidth / 360.0, 0.0, 0.5);
  let hueSoftness = max(params.hueSoftness / 360.0, 0.0001);
  var mask = 1.0 - smoothstep(hueWidth, hueWidth + hueSoftness, hueDistance);
  mask *= centeredRangeMask(hsv.y, params.satLow, params.satHigh, params.satSoftness);
  mask *= centeredRangeMask(luma, params.lumaLow, params.lumaHigh, params.lumaSoftness);
  if (params.invertMask > 0.5) {
    mask = 1.0 - mask;
  }
  mask = clamp(mask * params.strength, 0.0, 1.0);

  if (params.showMask > 0.5) {
    return vec4f(vec3f(mask), color.a);
  }

  var corrected = color.rgb;
  corrected *= pow(2.0, params.exposure);
  let temp = params.temperature / 100.0;
  corrected.r += temp * 0.1;
  corrected.b -= temp * 0.1;
  let ti = params.tint / 100.0;
  corrected.g -= ti * 0.1;
  corrected.r += ti * 0.05;
  corrected.b += ti * 0.05;
  let sat = 1.0 + params.saturation / 100.0;
  let gray = luminance601(corrected);
  corrected = mix(vec3f(gray), corrected, sat);

  return vec4f(clamp(mix(color.rgb, corrected, mask), vec3f(0.0), vec3f(1.0)), color.a);
}
```

### 17.E-port Our ported `secondaryQualifierFragment` (linear-light)

```wgsl
struct SecondaryQualifierParams {
  hueCenter: f32, hueWidth: f32, hueSoftness: f32, satLow: f32,
  satHigh: f32, satSoftness: f32, lumaLow: f32, lumaHigh: f32,
  lumaSoftness: f32, invertMask: f32, showMask: f32, exposure: f32,
  saturation: f32, temperature: f32, tint: f32, strength: f32,
};
@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;       // rgba16float linear-light
@group(0) @binding(2) var<uniform> params: SecondaryQualifierParams;

fn circularHueDistance(hue: f32, center: f32) -> f32 {
  let diff = abs(hue - center);
  return min(diff, 1.0 - diff);
}

fn centeredRangeMask(value: f32, lowValue: f32, highValue: f32, softness: f32) -> f32 {
  let low = min(lowValue, highValue);
  let high = max(lowValue, highValue);
  let soft = max(softness, 0.0001);
  let lowMask = smoothstep(low - soft, low, value);
  let highMask = 1.0 - smoothstep(high, high + soft, value);
  return clamp(lowMask * highMask, 0.0, 1.0);
}

@fragment
fn secondaryQualifierFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);

  // CHANGED: HSV is defined on gamma-encoded values. Convert linear → sRGB
  // for the qualifier math, then back to linear for the grade.
  let encoded = linear_to_srgb(color.rgb);

  let hsv = rgb2hsv(encoded);
  let luma = luminance(encoded);                              // CHANGED: BT.709 (was luminance601)

  let hueDistance = circularHueDistance(hsv.x, fract(params.hueCenter / 360.0));
  let hueWidth = clamp(params.hueWidth / 360.0, 0.0, 0.5);
  let hueSoftness = max(params.hueSoftness / 360.0, 0.0001);
  var mask = 1.0 - smoothstep(hueWidth, hueWidth + hueSoftness, hueDistance);
  mask *= centeredRangeMask(hsv.y, params.satLow, params.satHigh, params.satSoftness);
  // CHANGED: lumaLow/lumaHigh are interpreted as sRGB-encoded values (UI convention).
  // If we wanted linear thresholds, we'd convert them via srgb_to_linear() first.
  mask *= centeredRangeMask(luma, params.lumaLow, params.lumaHigh, params.lumaSoftness);

  if (params.invertMask > 0.5) {
    mask = 1.0 - mask;
  }
  mask = clamp(mask * params.strength, 0.0, 1.0);

  if (params.showMask > 0.5) {
    return vec4f(vec3f(mask), color.a);
  }

  // Grade applied in LINEAR space (correct for exposure/saturation).
  var corrected = color.rgb;
  corrected *= pow(2.0, params.exposure);                     // CORRECT in linear-light
  let temp = params.temperature / 100.0;
  corrected.r += temp * 0.1;
  corrected.b -= temp * 0.1;
  let ti = params.tint / 100.0;
  corrected.g -= ti * 0.1;
  corrected.r += ti * 0.05;
  corrected.b += ti * 0.05;
  let sat = 1.0 + params.saturation / 100.0;
  let gray = luminance(corrected);                           // CHANGED: BT.709
  corrected = mix(vec3f(gray), corrected, sat);

  // REMOVED: clamp(mix(...), vec3f(0.0), vec3f(1.0)) — preserve HDR
  return vec4f(mix(color.rgb, corrected, mask), color.a);
}
```

### 17.F FreeCut `vibranceFragment` shader (color.ts:1395-1410)

```wgsl
struct VibranceParams { amount: f32, _p1: f32, _p2: f32, _p3: f32 };
@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> params: VibranceParams;
@fragment
fn vibranceFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);
  let maxC = max(max(color.r, color.g), color.b);
  let minC = min(min(color.r, color.g), color.b);
  let sat = (maxC - minC) / (maxC + 0.001);
  let vibrance = params.amount * (1.0 - sat);
  let gray = luminance601(color.rgb);
  let adjusted = mix(vec3f(gray), color.rgb, 1.0 + vibrance);
  return vec4f(clamp(adjusted, vec3f(0.0), vec3f(1.0)), color.a);
}
```

### 17.F-port Our ported `vibranceFragment` (linear-light)

```wgsl
struct VibranceParams { amount: f32, _p1: f32, _p2: f32, _p3: f32 };
@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;       // rgba16float linear-light
@group(0) @binding(2) var<uniform> params: VibranceParams;
@fragment
fn vibranceFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);

  // CHANGED: Vibrance is a perceptual saturation control. Convert linear → sRGB
  // to compute the (max, min, sat) metrics in gamma-encoded space (matches the
  // perceptual intent — humans perceive saturation non-linearly).
  let encoded = linear_to_srgb(color.rgb);

  let maxC = max(max(encoded.r, encoded.g), encoded.b);
  let minC = min(min(encoded.r, encoded.g), encoded.b);
  // CHANGED: max(maxC, 0.001) instead of (maxC + 0.001) — prevents HDR overflow
  // where maxC > 1.0 would inflate the denominator and zero the boost.
  let sat = (maxC - minC) / max(maxC, 0.001);
  let vibrance = params.amount * (1.0 - sat);
  let gray = luminance(encoded);                              // CHANGED: BT.709 (was luminance601)
  let adjustedEncoded = mix(vec3f(gray), encoded, 1.0 + vibrance);

  let c = srgb_to_linear(adjustedEncoded);                   // CHANGED: back to linear
  // REMOVED: clamp(...) — preserve HDR
  return vec4f(c, color.a);
}
```

### 17.G FreeCut `powerWindowFragment` shader (color.ts:1185-1247)

```wgsl
struct PowerWindowParams {
  shapeKind: f32, centerX: f32, centerY: f32, sizeX: f32,
  sizeY: f32, rotation: f32, feather: f32, invertMask: f32,
  showMask: f32, exposure: f32, saturation: f32, temperature: f32,
  tint: f32, strength: f32, sourceWidth: f32, sourceHeight: f32,
};
@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> params: PowerWindowParams;

fn rotateWindowPoint(point: vec2f, angleDeg: f32) -> vec2f {
  let angle = -angleDeg * PI / 180.0;
  let c = cos(angle);
  let s = sin(angle);
  return vec2f(point.x * c - point.y * s, point.x * s + point.y * c);
}

fn powerWindowMask(uv: vec2f) -> f32 {
  let aspect = max(params.sourceWidth / max(params.sourceHeight, 1.0), 0.0001);
  var local = uv - vec2f(params.centerX, params.centerY);
  local.x *= aspect;
  local = rotateWindowPoint(local, params.rotation);

  let size = max(vec2f(params.sizeX * aspect, params.sizeY) * 0.5, vec2f(0.0001));
  let normalized = local / size;
  let shapeKind = i32(params.shapeKind + 0.5);
  var dist = length(normalized);
  if (shapeKind == 1) {
    dist = max(abs(normalized.x), abs(normalized.y));
  }
  let feather = clamp(params.feather, 0.001, 1.0);
  return clamp(1.0 - smoothstep(1.0 - feather, 1.0, dist), 0.0, 1.0);
}

@fragment
fn powerWindowFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);
  var mask = powerWindowMask(input.uv);
  if (params.invertMask > 0.5) {
    mask = 1.0 - mask;
  }
  mask = clamp(mask * params.strength, 0.0, 1.0);

  if (params.showMask > 0.5) {
    return vec4f(vec3f(mask), color.a);
  }

  var corrected = color.rgb;
  corrected *= pow(2.0, params.exposure);
  let temp = params.temperature / 100.0;
  corrected.r += temp * 0.1;
  corrected.b -= temp * 0.1;
  let ti = params.tint / 100.0;
  corrected.g -= ti * 0.1;
  corrected.r += ti * 0.05;
  corrected.b += ti * 0.05;
  let sat = 1.0 + params.saturation / 100.0;
  let gray = luminance601(corrected);
  corrected = mix(vec3f(gray), corrected, sat);

  return vec4f(clamp(mix(color.rgb, corrected, mask), vec3f(0.0), vec3f(1.0)), color.a);
}
```

### 17.G-port Our ported `powerWindowFragment` (linear-light)

```wgsl
// Uniform layout UNCHANGED (16 f32 = 64 bytes). packUniforms (color.ts:1368-1386)
// needs no change. The mask math (rotateWindowPoint, powerWindowMask) is purely
// geometric — operates on UV coordinates, independent of color space.
struct PowerWindowParams {
  shapeKind: f32, centerX: f32, centerY: f32, sizeX: f32,
  sizeY: f32, rotation: f32, feather: f32, invertMask: f32,
  showMask: f32, exposure: f32, saturation: f32, temperature: f32,
  tint: f32, strength: f32, sourceWidth: f32, sourceHeight: f32,
};
@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;       // rgba16float linear-light
@group(0) @binding(2) var<uniform> params: PowerWindowParams;

// rotateWindowPoint + powerWindowMask: UNCHANGED (geometry-only, no color math)

@fragment
fn powerWindowFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);
  var mask = powerWindowMask(input.uv);
  if (params.invertMask > 0.5) { mask = 1.0 - mask; }
  mask = clamp(mask * params.strength, 0.0, 1.0);

  if (params.showMask > 0.5) {
    return vec4f(vec3f(mask), color.a);
  }

  // Grade applied in LINEAR space (correct for exposure/saturation).
  var corrected = color.rgb;
  corrected *= pow(2.0, params.exposure);                     // CORRECT in linear-light
  let temp = params.temperature / 100.0;
  corrected.r += temp * 0.1;
  corrected.b -= temp * 0.1;
  let ti = params.tint / 100.0;
  corrected.g -= ti * 0.1;
  corrected.r += ti * 0.05;
  corrected.b += ti * 0.05;
  let sat = 1.0 + params.saturation / 100.0;
  let gray = luminance(corrected);                           // CHANGED: BT.709 (was luminance601)
  corrected = mix(vec3f(gray), corrected, sat);

  // REMOVED: clamp(mix(...), vec3f(0.0), vec3f(1.0)) — preserve HDR
  return vec4f(mix(color.rgb, corrected, mask), color.a);
}
```

### 17.H FreeCut `chromaKeyFragment` shader (keying.ts:9-50)

```wgsl
struct ChromaKeyParams {
  keyR: f32, keyG: f32, keyB: f32, tolerance: f32,
  softness: f32, spillSuppression: f32, _p1: f32, _p2: f32,
};
@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> params: ChromaKeyParams;

fn rgb2ycbcr(rgb: vec3f) -> vec3f {
  let y = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;       // BT.601
  let cb = 0.564 * (rgb.b - y);
  let cr = 0.713 * (rgb.r - y);
  return vec3f(y, cb, cr);
}

@fragment
fn chromaKeyFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);
  let keyColor = vec3f(params.keyR, params.keyG, params.keyB);
  let colorYCbCr = rgb2ycbcr(color.rgb);
  let keyYCbCr = rgb2ycbcr(keyColor);
  let cbcrDist = length(colorYCbCr.yz - keyYCbCr.yz);
  let innerTolerance = params.tolerance;
  let outerTolerance = params.tolerance + params.softness;
  var alpha = smoothstep(innerTolerance, outerTolerance, cbcrDist);
  var finalColor = color.rgb;
  if (params.spillSuppression > 0.0) {
    if (params.keyG > params.keyR && params.keyG > params.keyB) {
      let spillAmount = max(0.0, finalColor.g - max(finalColor.r, finalColor.b)) * params.spillSuppression;
      finalColor.g -= spillAmount;
      finalColor.r += spillAmount * 0.5;
      finalColor.b += spillAmount * 0.5;
    } else if (params.keyB > params.keyR && params.keyB > params.keyG) {
      let spillAmount = max(0.0, finalColor.b - max(finalColor.r, finalColor.g)) * params.spillSuppression;
      finalColor.b -= spillAmount;
      finalColor.r += spillAmount * 0.5;
      finalColor.g += spillAmount * 0.5;
    }
  }
  return vec4f(finalColor, color.a * alpha);
}
```

### 17.H-port Our ported `chromaKeyFragment` (linear-light)

```wgsl
struct ChromaKeyParams {
  keyR: f32, keyG: f32, keyB: f32, tolerance: f32,
  softness: f32, spillSuppression: f32, _p1: f32, _p2: f32,
};
@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;       // rgba16float linear-light
@group(0) @binding(2) var<uniform> params: ChromaKeyParams;

// CHANGED: BT.709 luma coefficients (was BT.601) — consistent with our pipeline.
fn rgb2ycbcr(rgb: vec3f) -> vec3f {
  let y = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;    // BT.709
  let cb = 0.564 * (rgb.b - y);
  let cr = 0.713 * (rgb.r - y);
  return vec3f(y, cb, cr);
}

@fragment
fn chromaKeyFragment(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTex, texSampler, input.uv);

  // CHANGED: convert linear → sRGB for YCbCr computation. The YCbCr matrix is
  // defined on gamma-encoded values (broadcast standard). The keyer's tolerance/
  // softness sliders are calibrated to sRGB-encoded input.
  let encoded = linear_to_srgb(color.rgb);

  let keyColor = vec3f(params.keyR, params.keyG, params.keyB);
  let colorYCbCr = rgb2ycbcr(encoded);
  let keyYCbCr = rgb2ycbcr(keyColor);
  let cbcrDist = length(colorYCbCr.yz - keyYCbCr.yz);
  let innerTolerance = params.tolerance;
  let outerTolerance = params.tolerance + params.softness;
  var alpha = smoothstep(innerTolerance, outerTolerance, cbcrDist);

  // CHANGED: spill suppression in sRGB-encoded space (perceptual), then back to linear
  var finalEncoded = encoded;
  if (params.spillSuppression > 0.0) {
    if (params.keyG > params.keyR && params.keyG > params.keyB) {
      let spillAmount = max(0.0, finalEncoded.g - max(finalEncoded.r, finalEncoded.b)) * params.spillSuppression;
      finalEncoded.g -= spillAmount;
      finalEncoded.r += spillAmount * 0.5;
      finalEncoded.b += spillAmount * 0.5;
    } else if (params.keyB > params.keyR && params.keyB > params.keyG) {
      let spillAmount = max(0.0, finalEncoded.b - max(finalEncoded.r, finalEncoded.g)) * params.spillSuppression;
      finalEncoded.b -= spillAmount;
      finalEncoded.r += spillAmount * 0.5;
      finalEncoded.g += spillAmount * 0.5;
    }
  }

  let finalColor = srgb_to_linear(finalEncoded);             // CHANGED: back to linear
  return vec4f(finalColor, color.a * alpha);
}
```

---

## 18. Scope Bit-Depth Port

### 18.1 The problem

FreeCut's three scopes (histogram, waveform, vectorscope) assume 8-bit `rgba8unorm` input textures. The compute shaders multiply sampled pixel values by `255.0` (or `256.0`) and accumulate into `u32` counters. For our `rgba16float` linear-light source textures:

- **Values can exceed 1.0** (HDR highlights, exposure boosts, linear-light PQ-decoded content) — multiplying by 255 and casting to `u32` overflows silently or wraps.
- **Negative values can occur** (color grading overshoots, spills from spill suppression) — `u32` cast of a negative float is undefined in WGSL.
- **Linear-light values aren't perceptually uniform** — a 10% linear-light value isn't visually "10% gray"; the scopes would mislead colorists who expect gamma-encoded readings.

### 18.2 The fix — three-part port

**Part 1: Source texture format** (`scope-renderer.ts:65-78`)

```ts
// FreeCut (WRONG for our pipeline):
this.srcTexture = this.device.createTexture({
  size: { width: w, height: h },
  format: 'rgba8unorm',
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
})

// Our port:
this.srcTexture = this.device.createTexture({
  size: { width: w, height: h },
  format: 'rgba16float',       // CHANGED: linear-light 16-bit
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
})
```

Upload path changes from `copyExternalImageToTexture({ source: canvas })` (which is hardwired to 8-bit) to either:
- (a) `copyExternalImageToTexture({ source: rgba16float OffscreenCanvas })` — supported per `04-renderer-color.md` §11 (canvas format rgba16float + colorSpace extended-srgb-linear), OR
- (b) Direct `writeTexture` from a `Float32Array` if the source is already on the GPU as an `rgba16float` texture (preferred — avoids the canvas round-trip).

**Part 2: Compute shader bin scaling**

Histogram (`histogram-scope.ts:14-55`):

```wgsl
// FreeCut (8-bit, 256 bins):
let r = min(u32(rn * 255.0), 255u);                          // :44
let g = min(u32(gn * 255.0), 255u);                          // :45
let b = min(u32(bn * 255.0), 255u);                          // :46
// ... luma ...
let l = min(u32(luma * 255.0), 255u);                        // :49
atomicAdd(&histR[r], 1u);

// Our port (10-bit linear-light, 1024 bins, transfer-function-aware):
// Convert linear → sRGB for binning (scopes show gamma-encoded values —
// colorists expect 0% black, 50% mid-gray, 100% white on the histogram).
let encodedR = linear_to_srgb(linear_r);
let r = min(u32(clamp(encodedR, 0.0, 1.0) * 1023.0), 1023u);  // 10-bit, 1024 bins
let g = min(u32(clamp(linear_to_srgb(linear_g), 0.0, 1.0) * 1023.0), 1023u);
let b = min(u32(clamp(linear_to_srgb(linear_b), 0.0, 1.0) * 1023.0), 1023u);
let encodedLuma = linear_to_srgb(luminance(linear_rgb));      // BT.709
let l = min(u32(clamp(encodedLuma, 0.0, 1.0) * 1023.0), 1023u);
atomicAdd(&histR[r], 1u);
atomicAdd(&histG[g], 1u);
atomicAdd(&histB[b], 1u);
atomicAdd(&histL[l], 1u);
```

Storage buffer size: `256 * 4` → `1024 * 4` bytes (4 channels × 1024 bins × 4 bytes/u32). Histogram render shader (`histogram-scope.ts:57-179`) needs `uv.x * 255.0` → `uv.x * 1023.0` at `:97` and `gridBins` at `:165` updated from `(64.0, 128.0, 192.0)` to `(256.0, 512.0, 768.0)` (10-bit quarter marks).

Waveform (`waveform-scope.ts:14-112`):

```wgsl
// FreeCut (8-bit accumulator weights):
let w0 = u32((1.0 - frac) * 256.0);                         // :48
let w1 = 256u - w0;                                          // :49
// ...
let rn = normRange(pixel.r, params.rangeMin, params.rangeMax);   // :58
let gyC = i32(hm1 - clamp(gn, 0.0, 1.0) * hm1);              // :77 — clamps to [0,1] (kills HDR)
// ...
if (wA > 0u) { atomicAdd(&accumG[idx + x0], wA); }          // :84

// Our port:
// - Convert linear → sRGB before mapping to Y position (colorists expect gamma-
//   encoded waveform IRE readings).
// - Use a 16-bit accumulator weight (max 65535) so we have headroom for HDR
//   values above 1.0 (which still get clamped to [0,1] for the Y position
//   mapping, but contribute proportionally to the accumulator).
let encodedR = linear_to_srgb(pixel.r);
let rn = normRange(encodedR, params.rangeMin, params.rangeMax);  // CHANGED: encoded input
let gyC = i32(hm1 - clamp(rn, 0.0, 1.0) * hm1);              // Y position clamped (intentional)
let w0 = u32((1.0 - frac) * 65535.0);                        // CHANGED: 256 → 65535 (16-bit weight)
let w1 = 65535u - w0;
// ... atomicAdd as before, but with 16-bit weights ...
```

Storage buffer size unchanged (`OUT_W * OUT_H * 4` = 1024 × 512 × 4 = 2 MB per channel × 4 channels = 8 MB total — fits comfortably). The render shader's `refValue` formula (`waveform-scope.ts:415`) `Math.sqrt(srcH / OUT_H) * 40.0` needs to be re-scaled: with 16-bit weights the reference value becomes `Math.sqrt(srcH / OUT_H) * 40.0 * 256` (or alternatively, keep `* 40.0` and divide weights by 256 in the compute shader — depends on whether we want to preserve the existing visual intensity).

Vectorscope (`vectorscope-scope.ts:14-58`):

```wgsl
// FreeCut (8-bit accumulator contribution, lines 55-57):
atomicAdd(&accumR[idx], u32(max(r * 255.0, 1.0)));            // ❗ assumes [0,1] input
atomicAdd(&accumG[idx], u32(max(g * 255.0, 1.0)));           // ❗ max(..., 1.0) is the floor
atomicAdd(&accumB[idx], u32(max(b * 255.0, 1.0)));           // ❗ so even black pixels contribute 1

// Our port:
// - Convert linear → sRGB (colorists expect gamma-encoded vectorscope readings).
// - Use 16-bit accumulator weights, clamp to prevent overflow.
let encodedR = linear_to_srgb(r);
let encodedG = linear_to_srgb(g);
let encodedB = linear_to_srgb(b);
// Map [0,1] sRGB → [1, 65535] accumulator contribution (preserves the
// "even black contributes 1" semantics of FreeCut's `max(..., 1.0)`).
let rContrib = u32(clamp(encodedR, 0.0, 1.0) * 65535.0);
let gContrib = u32(clamp(encodedG, 0.0, 1.0) * 65535.0);
let bContrib = u32(clamp(encodedB, 0.0, 1.0) * 65535.0);
atomicAdd(&accumR[idx], max(rContrib, 1u));                    // CHANGED: 255 → 65535
atomicAdd(&accumG[idx], max(gContrib, 1u));
atomicAdd(&accumB[idx], max(bContrib, 1u));
```

⚠️ Note: the YCbCr conversion (`vectorscope-scope.ts:43-45`) uses configurable `params.kr` / `params.kb` coefficients (BT.709 default `0.2126/0.0722` from `scope-renderer.ts:19-20`). For our pipeline, this is already correct — but the conversion is applied to the linear-light value, not the gamma-encoded value. **YCbCr is defined on gamma-encoded values** (it's a broadcast color-difference coding), so we must apply `linear_to_srgb` before computing YCbCr. The render-side normalization (`refValue` at `vectorscope-scope.ts:286` `Math.sqrt((srcW * srcH) / (VS_SIZE * VS_SIZE)) * 18.0`) needs to be re-scaled to match the new accumulator scale (`* 18.0 * 256`).

**Part 3: Scope matrix / range / transfer selectors**

`ScopeRenderer` (`scope-renderer.ts:10-143`) currently exposes:

- `setMatrix(kr, kb)` (`:55-58`) — YCbCr matrix coefficients (BT.601: `0.299/0.114`, BT.709: `0.2126/0.0722`, BT.2020: `0.2627/0.0593`).
- `setRange(min, max)` (`:60-63`) — input range for `normRange()` (used by histogram + waveform, default `0..1`).

We extend with:

- `setTransfer(transfer: 'srgb' | 'pq' | 'hlg')` — selects the inverse transfer function applied before binning/Y-mapping. For SDR (`srgb`), uses `linear_to_srgb`. For HDR PQ, uses `linear_to_pq` and the histogram bins map to [0, 10000] nits. For HDR HLG, uses `linear_to_hlg` and bins map to [0, 1000] nits (HLG peak).
- `setBitDepth(depth: 8 | 10 | 16)` — selects the accumulator scale (`255`, `1023`, `65535`) and bin count (`256`, `1024`, `4096`). Default `10` (matches our pipeline).

These propagate to the compute shader via new uniform fields on each scope's `Params` struct.

### 18.3 Coordinate with SCOUT-04's findings

SCOUT-04 (`04-renderer-color.md` §14.B) flagged the same `r * 255.0` pattern at `vectorscope-scope.ts:55-57` and prescribed `r * 65535.0` as the fix. SCOUT-08 confirms this prescription and extends it:

- ✅ `vectorscope-scope.ts:55-57` `r * 255.0` → `r * 65535.0` (10-bit linear-light via 16-bit half-float)
- ✅ `histogram-scope.ts:44-49` `u32(rn * 255.0)` → `u32(rn * 1023.0)` (10-bit binning, 1024 bins)
- ✅ `waveform-scope.ts:48-49` `u32((1.0 - frac) * 256.0)` → `u32((1.0 - frac) * 65535.0)` (16-bit accumulator weight)
- ✅ `scope-renderer.ts:70` source texture format `'rgba8unorm'` → `'rgba16float'`
- ✅ Per SCOUT-04 §11 Q11 / §14.B: must add `linear_to_srgb` / `srgb_to_linear` helpers in a new `color-management.wgsl` module prepended alongside `COMMON_WGSL` (see §16.G). The scope compute shaders also need this prepend — currently they don't include `COMMON_WGSL` at all (the scope files build their own shader modules at `histogram-scope.ts:236-240`, `waveform-scope.ts:344-350`, `vectorscope-scope.ts:254-260`). The ported versions prepend `COLOR_MGMT_WGSL` (the new module) instead.

SCOUT-04 §11 Q11 also notes that the `rgba16float` source texture should be uploaded via `copyExternalImageToTexture` from an `rgba16float` OffscreenCanvas (per `04-renderer-color.md` §11), or directly via `writeTexture` from the renderer's working texture (preferred — avoids the canvas round-trip). SCOUT-08 confirms and adds: the `ScopeRenderer.uploadFromCanvas` method at `scope-renderer.ts:81-91` should be replaced with `uploadFromTexture(srcTexture: GPUTexture)` that takes a `rgba16float` GPU texture directly — no canvas intermediate.

### 18.4 Risk: 10-bit canvas support

⚠️ The scope canvases themselves use `navigator.gpu.getPreferredCanvasFormat()` (`scope-renderer.ts:26`), which is typically `bgra8unorm` or `rgba8unorm`. The scope **render output** is 8-bit. This is fine — the scope is a visualization tool, not a precision output. The accumulator buffers and source texture are the precision-critical parts (16-bit), and they remain internal.

### 18.5 Risk: storage buffer sizes

| Buffer | FreeCut size | Our ported size | Notes |
|---|---|---|---|
| `histR/G/B/L` (4 buffers) | 256 × 4 = 1 KB each = 4 KB total | 1024 × 4 = 4 KB each = 16 KB total | 10-bit binning |
| `accumR/G/B` vectorscope (3 buffers) | 512² × 4 = 1 MB each = 3 MB total | unchanged (3 MB) | bin count unchanged |
| `accumR/G/B/L` waveform (4 buffers) | 1024 × 512 × 4 = 2 MB each = 8 MB total | unchanged (8 MB) | bin count unchanged |
| Source texture | W × H × 4 = 33 MB (4K SDR) | W × H × 8 = 66 MB (4K 16-bit) | matches SCOUT-04 §8 memory budget |

Total scope memory budget: ~77 MB (was ~44 MB). Acceptable.

---

## 19. Testing

> See `17-test-plan.md` for the overall methodology, test matrix, and
> per-module template. Matrix rows: "Color Wheels", "Curves", "LUT",
> "Qualifier", "Power Window", "Scopes", "Real-time feedback". Seed spec
> §14 test plan (11 items) is fully subsumed by the tests below — §14
> remains as the *intent* list, this section is the *executable* contract.

### Boundary with spec 04 (renderer-color)

Spec 04 owns **GPU-pipeline correctness** — YUV→linear conversion, transfer
function round-trips, blend modes, 10-bit precision, P010 decode, GPU texture
sampling. Spec 08 owns **grading tool semantics** — effect parameter packing,
curve baking (control-point → LUT), LUT parsing/loading, qualifier hue
selection math, power window shape math, vibrance selectivity, scope accuracy
(histogram bins, waveform IRE mapping, vectorscope Cb/Cr placement, RGB
Parade layout), and the high-level grading command protocol
(`addEffect` / `updateEffect` / `removeEffect` / `toggleEffect` per spec 15
§4.3.52–§4.3.56; `resetEffects` per spec 16 §3 — a UI-layer BatchCommand
composite, not in spec 15).

The following tests are **owned by spec 04** and are NOT re-stated here
(references are to `04-renderer-color.md` §17):

| Test (spec 04 §17)                          | Why spec 04 owns it                                                            |
|---------------------------------------------|--------------------------------------------------------------------------------|
| `exposure-plus-one-stop-doubles-linear`     | Verifies GPU exposure uniform math on white clip                               |
| `lut-identity-preserves-input`             | Verifies GPU LUT texture sampling round-trip                                   |
| `lut-srgb-conversion-round-trip`           | Verifies the linear→sRGB→LUT→sRGB→linear path FreeCut skips (we fix it, §6.3) |
| `curves-swap-r-and-b-channels`             | Verifies GPU curve LUT texture application                                     |
| `color-wheels-known-lift-gamma-gain`        | Verifies GPU wheels shader pixel output                                        |
| `qualifier-masks-red-region-at-hue-0deg`    | Verifies GPU qualifier shader masking                                          |
| `power-window-rectangular-left-half-only`  | Verifies GPU power window shader masking                                       |
| `real-time-color-wheel-drag-updates-grade-within-33ms` | Verifies render latency invariant (spec 17 §6.3)                  |
| `keyboard-1-through-9-applies-effect-preset`           | Verifies UI→engine command bus (state WYSIWYG)                    |
| `keyboard-cmd-1-through-9-switches-color-grading-panel`| Verifies UI panel-focus routing (UI-only state)                    |
| `keyboard-shift-1-toggles-effect-1-enabled`            | Verifies toggle-effect keyboard path                              |
| `srgb-linear-round-trip-fp-precision` (property)        | Verifies transfer-function FP precision                          |
| `lut-3d-identity-preserves-arbitrary-input` (property)  | Verifies GPU LUT trilinear sampling                              |

Spec 08's tests below focus on the **grading-tool-semantic** layer: parser
correctness, parameter packing, mask math (point-in-shape), curve baking,
scope accuracy, and the grading-specific behaviors not covered by spec 04's
GPU-pipeline tests (no-output-clamp for HDR, vibrance selectivity, contrast
pivot preservation, master-curve luma-only, qualifier feathering, 16-bit LUT
storage, 10-bit scope binning, etc.).

### Tier 1: Pure engine tests

[Filename: `tests/unit/08-color-grading/*.test.ts` — Vitest, Node only, no GPU.]

- `cube-lut-parser-parses-valid-file` — `parseCubeLUT(validCubeText)` returns
  `{ size: 33, data: Uint16Array(33*33*33*4) }` (rgba16uint, per §7.2) with
  `data[0..2]` === `[0, 0, 0]` (first LUT entry), every `data[i*4+3]` ===
  `65535` (fully-opaque alpha), and `data[last-3..last-1]` ===
  `[65535, 65535, 65535]` (last entry); verifies `.cube` header parsing
  (`LUT_3D_SIZE`, `LUT_SIZE`, optional `DOMAIN_MIN`/`DOMAIN_MAX`)
- `cube-lut-parser-rejects-invalid-files` — `parseCubeLUT()` throws
  `LUTParseError` for: (a) wrong size header (`LUT_3D_SIZE 32` but 33³ data
  rows), (b) malformed header typo (`LUT_3DSIZE 33`), (c) out-of-range
  values (`1.5 -0.1 0.0`), (d) truncated data (fewer than size³ rows),
  (e) non-numeric data rows, (f) size mismatch between `LUT_3D_SIZE` and
  actual row count
- `curve-baking-4-control-points-cubic-spline` — 4 control points
  `[(0,0), (0.25, 0.4), (0.75, 0.6), (1,1)]` bake to a 1024×1 LUT where
  `lut[0]` ≈ `0`, `lut[1023]` ≈ `1`, `lut[256]` ≈ `0.4`, `lut[768]` ≈ `0.6`
  (Fritsch-Carlson monotone cubic Hermite per `gpu-curves.ts:227,315-335`);
  tolerance `1e-5`
- `curve-baking-identity-curve-produces-identity-lut` — control points
  `[(0,0), (1,1)]` bake to a LUT where `lut[i] ≈ i/1023` for all
  `i ∈ [0, 1023]`; max abs deviation `< 1e-6`
- `color-wheels-uniform-packing-28-f32-112-bytes` — `packColorWheelsUniforms(
  {shHue, shAmount, midHue, midAmount, hlHue, hlAmount, temperature, tint,
  saturation, exposure, contrast, pivot, liftHue, liftAmount, gammaHue,
  gammaAmount, gainHue, gainAmount, offsetHue, offsetAmount, lift, gamma,
  gain, offset, wheelRotation, hueRotation, satMix, lumMix})` produces an
  `ArrayBuffer` of `byteLength === 112` with the 28 `f32` fields laid out per
  `color.ts:591-599` (SCOUT-08 §16.A); matches `uniformSize: 112` at
  `color.ts:589`
- `qualifier-hsl-math-circular-hue-distance` — `hueDistance(350°, 10°)` ≈
  `20°` (wraps through 0°); `hueDistance(10°, 350°)` ≈ `20°` (symmetric);
  `hueDistance(180°, 0°)` === `180°`; `hueDistance(0°, 360°)` === `0°`
  (same hue); computes `min(|a-b| mod 360, 360 - |a-b| mod 360)` so the
  qualifier hue selection has no direction asymmetry at the 0°/360° boundary
- `power-window-point-in-rectangle-uv-space` — `pointInRect({x:0.25, y:0.5},
  {centerX:0.5, centerY:0.5, sizeX:1.0, sizeY:1.0, rotation:0})` === `true`;
  `pointInRect({x:0.75, y:0.5}, {centerX:0.5, centerY:0.5, sizeX:0.5,
  sizeY:1.0})` === `false` (outside the half-width rect); uses
  `max(abs(normalized.x), abs(normalized.y))` per `color.ts:1203-1218`
- `power-window-point-in-ellipse-uv-space` — `pointInEllipse({x:0.5, y:0.5},
  {centerX:0.5, centerY:0.5, sizeX:1.0, sizeY:1.0})` === `true` (center);
  `pointInEllipse({x:1.0, y:0.5}, {centerX:0.5, centerY:0.5, sizeX:1.0,
  sizeY:1.0})` === `true` (on the ellipse boundary, length(`(0.5,0)`) = 0.5
  ≤ 0.5); `pointInEllipse({x:0.75, y:0.5}, {centerX:0.5, centerY:0.5,
  sizeX:0.4, sizeY:0.4})` === `false` (outside); uses
  `length(normalized)` per `color.ts:1203-1218`
- `power-window-no-polygon-shape-in-v1` — `POWER_WINDOW_SHAPE_MAP` keys are
  exactly `['ellipse', 'rectangle']`; `parsePowerWindowShape('polygon')`
  throws `PowerWindowShapeError` (per §16.E: no polygon in v1; polygon +
  JFA feathering deferred to v2 per §9.2 / §16.E)
- `effect-zod-schemas-validate-all-effect-types` — for each effect type in
  `['color-wheels', 'curves', 'lut', 'qualifier', 'power-window', 'levels',
  'vibrance', 'gradient-map', 'temperature', 'tint', 'hue-shift',
  'saturation', 'exposure', 'contrast', 'brightness', 'invert', 'grayscale',
  'sepia', 'chroma-key']`, `EffectSpecSchema.parse({type, enabled: true,
  params: {...defaults}})` succeeds (spec 15 §4.3.52 `EffectSpec`); and
  `EffectSpecSchema.parse({type: 'unknown', enabled: true, params: {}})`
  throws
- `effect-zod-schema-rejects-out-of-range-params` — `EffectSpecSchema.parse(
  {type:'exposure', enabled:true, params:{stops: 999}})` throws (stops must
  be `∈ [-10, 10]`); `params:{stops: NaN}` throws; `params:{stops: Infinity}`
  throws; verifies per-effect parameter range enforcement
- `add-effect-command-schema-validates-effect-shape` — `AddEffectCommandSchema
  .parse({type:'addEffect', params:{elementId:'e1', effect:{type:'color-wheels',
  enabled:true, params:{...}}}})` succeeds (spec 15 §4.3.52 + §13.A Zod
  schema at `:3805-3816`); rejects `effect.type` not in the effect inventory;
  rejects `params.elementId` not a string
- `update-effect-command-schema-validates-partial-params` —
  `UpdateEffectCommandSchema.parse({type:'updateEffect', params:{elementId,
  effectId, params:{saturation: 0.5}}})` succeeds; rejects unknown effectId
  format; rejects params with wrong-type values (string where number
  expected)
- `remove-effect-command-schema-minimal-shape` — `RemoveEffectCommandSchema
  .parse({type:'removeEffect', params:{elementId, effectId}})` succeeds;
  rejects missing `effectId`; rejects extra `params` fields

### Tier 2: Render tests

[Filename: `tests/integration/08-color-grading/*.render.test.ts` — Playwright
+ headless Chrome with WebGPU enabled (`--enable-unsafe-webgpu
--enable-dawn-features=allow_unsafe_apis`). Uses `pixelmatch` helper from
spec 12 §5. These tests verify **grading-tool semantic correctness** at the
render level — GPU pipeline correctness is owned by spec 04 §17 (see
boundary table above).]

- `exposure-plus-one-stop-no-clamp-above-one` — render
  `10s-white-1080p.mp4` (linear-light value `1.0`) with `exposure: +1.0`;
  output linear-light readback at the brightest pixel must equal `2.0`
  (NOT clamped to `1.0`); verifies the §4.2 #4 "no output clamp" invariant
  that distinguishes our port from FreeCut (FreeCut's `colorWheelsFragment`
  emits `clamp(c, vec3f(0.0), vec3f(1.0))` at the end — we remove this);
  tolerance `< 0.5%`
- `contrast-with-pivot-preserves-pivot-point` — render
  `10s-gradient-h-1080p.mp4` with `contrast: 1.5, pivot: 0.18`; the
  linear-light value `0.18` (BT.709 mid-gray, the pivot) is unchanged after
  the contrast op; values `> 0.18` are pushed further from pivot, values
  `< 0.18` are pushed closer; verifies the FreeCut `contrast` shader's
  `(c - pivot) * contrast + pivot` math (§10.2 contrast effect)
- `lut-16-bit-precision-no-banding-in-gradient` — render
  `10s-gradient-h-1080p.mp4` with `tests/fixtures/luts/typical-s-curve.cube`
  applied; sample the output gradient at 1024 horizontal positions; assert
  no two adjacent samples differ by more than `1/1023` in 10-bit (verifies
  16-bit LUT storage per `cube-lut-parser.ts` — FreeCut uses 8-bit LUT
  data which produces visible banding on subtle gradients; SCOUT-08 §16.B)
- `curves-master-channel-affects-luma-only` — render
  `10s-smpte-bars-1080p.mp4` with a master curve that maps `0.5 → 0.7`
  (brightens mid-tones only); output luma (BT.709) increases at the
  mid-gray bar, but **chroma (Cb/Cr) is unchanged** for that bar; verifies
  the master curve operates on luminance only (spec 08 §5 master curve
  convention), not on the RGB channels
- `qualifier-feathered-edge-smooth-transition` — apply a qualifier with
  `hueCenter: 120°` (green), `hueWidth: 30°` to a horizontal
  red→green→blue gradient clip; sample the qualifier mask alpha along the
  gradient axis; assert mask alpha transitions smoothly from `0` (outside
  the green hue band) through `0.5` (at hue-band edge ± `hueWidth/2`) to
  `1` (center of green band), with no sharp discontinuities (verifies the
  `smoothstep` feathering in `secondaryQualifierFragment`
  `color.ts:947-1006`)
- `power-window-ellipse-masks-only-inside-region` — render
  `10s-white-1080p.mp4` with an ellipse power window centered `(0.5, 0.5)`,
  `size: (0.5, 0.5)`, `feather: 0`, and `exposure: +1` correction; pixels
  inside the ellipse are doubled-linear, pixels outside are unchanged;
  pixel-diff the boundary at the ellipse perimeter
- `power-window-feather-inline-smoothstep-transition` — apply a rectangular
  power window with `feather: 0.1` to `10s-white-1080p.mp4`; sample the
  mask alpha along a horizontal line crossing the rectangle edge; mask
  alpha transitions smoothly from `1` (inside, 10% inside edge) through
  `0.5` (at edge) to `0` (outside, 10% outside edge) via
  `smoothstep(feather_inner, feather_outer, dist)` per `color.ts:1217`
  (NOTE: power window uses **inline smoothstep** in the fragment shader
  per §9.2 — NOT a JFA SDF pass; JFA SDF is reserved for v2 polygon
  support per §16.E)
- `vibrance-boosts-low-saturation-more-than-high` — render a clip with two
  regions: (a) low-saturation pastel (`sat ≈ 0.2`), (b) high-saturation
  primary (`sat ≈ 1.0`); apply `vibrance: +50`; the pastel region's
  saturation increases by a larger factor than the primary region's
  (per `vibranceFragment` `color.ts:1389-1423` which weights low-sat
  pixels more heavily); verify via BT.709 saturation metric
  (`sat = sqrt(Cb² + Cr²) / Y`)
- `scopes-histogram-of-gradient-correct-bin-counts` — render
  `10s-gradient-h-1080p.mp4`; read the histogram storage buffer; assert
  bin counts are approximately uniform across the **1024 bins** (gradient
  maps linearly to bins) within `±5%` per bin; verifies §18.2 histogram
  compute shader with 1024 bins (NOT FreeCut's 256)
- `scopes-waveform-of-known-pattern-correct-luma-mapping` — render a clip
  with three horizontal bands (black top, 50% gray middle, white bottom);
  read the waveform scope output; assert the top third has high accumulator
  weight at IRE `0`, middle third at IRE `50`, bottom third at IRE `100`;
  verifies §18.2 waveform IRE mapping with linear→sRGB conversion before
  Y-position (colorists expect gamma-encoded readings, not linear-light)
- `scopes-vectorscope-of-pure-red-correct-cb-cr-position` — render
  `10s-red-1080p.mp4`; read the vectorscope output buffer; assert the
  accumulator peak is at the BT.709 reference red position
  `(Cb, Cr) ≈ (0.5 - 0.5·Kb, 0.5 + 0.5·Kr) = (0.464, 0.606)` within
  `±2px` tolerance; verifies §18.2 vectorscope `r * 65535.0` 16-bit
  accumulator (NOT FreeCut's `r * 255.0` 8-bit) + BT.709 YCbCr matrix
  per `scope-renderer.ts:19-20`
- `scopes-rgb-parade-shows-three-separate-waveforms` — render
  `10s-smpte-bars-1080p.mp4` with RGB Parade mode (`mode=5` per
  `waveform-scope.ts`); assert the output consists of three side-by-side
  waveforms (R, G, B channels), each width `OUT_W/3`; the R waveform
  matches the R-only scope output for the same input
- `scopes-source-texture-is-rgba16float-not-rgba8unorm` — spy on
  `device.createTexture` during scope render; assert the source texture
  format is `'rgba16float'` (NOT `'rgba8unorm'` like FreeCut's
  `scope-renderer.ts:70`); verifies §18.3 SCOUT-04/SCOUT-08 coordinated
  fix (FreeCut scopes read 8-bit sRGB-encoded values from the renderer's
  8-bit canvas — our port reads 16-bit linear-light directly from the
  working texture)
- `scopes-10-bit-source-produces-1024-bins-not-256` — render a 10-bit
  source (`10s-red-1080p-10bit.mp4`); read the histogram storage buffer;
  assert bin count is `1024` (10-bit precision per §18.2), NOT `256`
  (FreeCut's 8-bit bin count); verifies the §18.2 histogram compute
  shader port
- `hdr-highlights-above-one-preserved-no-clamp` — render
  `10s-white-1080p-hdr-pq.mp4` with `exposure: +2.0`; output linear-light
  readback at the brightest pixel must be `> 1.0` (not clamped to
  `[0, 1]`); verifies the §4.2 #4 "no output clamp" invariant for HDR
  preservation (FreeCut clamps to `[0, 1]` — our port removes this so HDR
  highlights survive grading)
- `lut-loading-pipeline-base64-decode-to-bind-group` — apply a LUT via
  `engine.command.apply({type:'addEffect', params:{elementId, effect:{
  type:'lut', enabled:true, params:{lutData: <base64-encoded
  typical-s-curve.cube>}}}})`; render frame 0; pixel-diff against the same
  LUT applied via direct shader uniform; verifies the LUT-loading pipeline
  (base64 decode → `parseCubeLUT` → `createTexture` → bind group cache)
  produces the same pixel result as the inline-shader path; this is the
  grading-tool-semantic complement to spec 04's `lut-identity-preserves-input`
  which only tests identity LUT texture sampling

### Tier 3: UI tests

[Filename: `tests/integration/08-color-grading/*.ui.test.ts` — Playwright
with `page.keyboard` and `page.mouse`. Every shortcut from spec 16 §3.11
(Effects / Color) that is not already owned by spec 04 §17 Tier 3 has a UI
test here. The four shortcuts already covered by spec 04 (`1`–`9` apply
preset, `Cmd+1`–`Cmd+9` panel switch, `Shift+1` toggle effect 1, color-wheel
drag latency) are cross-referenced in the boundary table above.]

Panel-focus routing targets the spec 18 inspector tab set (video/audio/effects/transition); the Color shortcut lands on the spec 18 Color dock page, not a Resolve color page.

- `keyboard-shift-1-through-9-toggles-effect-enabled` — for each
  `N ∈ [1, 9]`, with `N` effects on the selected clip,
  `page.keyboard.press('Shift+' + N)` issues `{type:'toggleEffect', params:
  {elementId: <selected>, effectIndex: N}}` (spec 16 §3.11); state diff
  shows `effect[N-1].enabled` flipped from `true` → `false` and back to
  `true` on second press
- `keyboard-cmd-shift-e-toggles-focused-effect` — with focus on effect `E`
  in the effects panel, `page.keyboard.press('Cmd+Shift+E')` issues
  `{type:'toggleEffect', params:{elementId: <selected>, effectId: E}}`
  (spec 16 §3.11); state diff shows `E.enabled` flipped; resolver routes
  to `engine.timeline.updateClipEffectParams({elementId, effectId, params:
  {enabled: !current}})` per spec 16 §8.2
- `keyboard-cmd-shift-option-e-resets-all-effects` — with 3 effects on the
  selected clip, `page.keyboard.press('Cmd+Shift+Option+E')` issues
  `{type:'resetEffects', params:{elementId: <selected>}}` (spec 16 §3.11);
  the resolver maps this to `N × RemoveEffectCommand` wrapped in a
  `BatchCommand('reset-effects')` per spec 16 §8.2; resulting state has
  zero effects on the element; the batch is a single undo step
- `keyboard-add-effect-state-wysiwyg-matches-direct-engine-apply` —
  pressing `1` (apply preset 1) produces a `SceneState` byte-identical to
  calling `engine.command.apply({type:'addEffect', params:{elementId:
  <selected>, effect: <preset1>}})` directly (state WYSIWYG invariant,
  spec 17 §6.1); supplements spec 04's `keyboard-1-through-9-applies-effect-preset`
  which only checks the command fires — this test asserts byte-identical
  state equivalence with the direct API path
- `keyboard-update-effect-params-state-wysiwyg-matches-direct-engine-apply` —
  dragging the saturation slider on the Color Wheels panel by `Δy = 30px`
  issues `previewElements({updates:[{elementId, effectId, params:
  {saturation: <computed>}}]})` → `commitPreview()`; the committed state
  matches direct `engine.command.apply({type:'updateEffect', params:
  {elementId, effectId, params:{saturation: <computed>}}})` (spec 15
  §4.3.53 `UpdateEffectCommand`)
- `keyboard-remove-effect-state-wysiwg-matches-direct-engine-apply` —
  clicking the "remove effect" button on effect `E` issues
  `{type:'removeEffect', params:{elementId, effectId: E}}` (spec 15
  §4.3.54); resulting state matches direct `engine.command.apply()`
  call — the element's `effects` array no longer contains `E`, all other
  effects remain at their original indices
- `color-wheel-pointer-drag-issues-update-effect-command` — dragging the
  Lift wheel puck by `Δx = 20, Δy = 10` (toward magenta-up) issues
  `previewElements({updates:[{elementId, effectId, params:{liftHue:
  <computed>, liftAmount: <computed>}}]})` → `commitPreview()`; the
  committed state matches a direct `engine.command.apply({type:
  'updateEffect', params:{elementId, effectId, params:{liftHue, liftAmount}}})`
  with the same computed values; puck-to-param conversion uses the same
  `(dx, dy) → (hue, amount)` formula as the FreeCut `gpu-wheels-panel.tsx`
  gizmo at `:87-100`

### Property-based tests

[Filename: `tests/unit/08-color-grading/*.property.test.ts` — `fast-check`,
`numRuns: 1000` per invariant.]

- `lut-trilinear-interpolation-round-trip` — for arbitrary
  `rgb ∈ [0, 1]³`, `trilinearSample(parseCubeLUT(bakeIdentityCube().text),
  rgb)` ≈ `rgb` within `1/1023` (10-bit LUT precision); covers the LUT
  trilinear resampler (`cube-lut.ts` trilinear resampler) **independent of
  sRGB conversion** (the linear↔sRGB round the LUT is owned by spec 04's
  `lut-srgb-conversion-round-trip`); `fc.assert(fc.property(arbitraryRGB,
  (c) => { expect(...).toBeCloseTo(c, 3) }), {numRuns: 1000})`
- `curve-monotonicity-if-control-points-increasing-y` — for arbitrary
  monotone non-decreasing control points `[(x_0, y_0), ... (x_n, y_n)]`
  with `x_0 < x_1 < ... < x_n` and `y_0 ≤ y_1 ≤ ... ≤ y_n`, the baked
  1024×1 LUT is monotonically non-decreasing: `lut[i] ≤ lut[i+1]` for all
  `i ∈ [0, 1022]` (Fritsch-Carlson monotone cubic Hermite preserves
  monotonicity per `curve-spline.ts`); `fc.assert(fc.property(
  arbitraryMonotoneControlPoints(2, 16), (cps) => { const lut =
  bakeCurveLUT(cps); for (let i = 0; i < 1023; i++) { expect(lut[i])
  .toBeLessThanOrEqual(lut[i+1] + 1e-7) } }), {numRuns: 1000})`
- `qualifier-circular-hue-distance-wraps-at-0-and-360` — for arbitrary
  `a, b ∈ [0°, 360°)`: (1) `hueDistance(a, b) === hueDistance(b, a)`
  (symmetric); (2) `hueDistance(a, b) ≤ 180°` (always the shorter arc);
  (3) `hueDistance(a, b) === hueDistance(a + 360, b)` (periodic); this is
  the invariant that makes qualifier hue selection work correctly at the
  red boundary (hue 0°/360°); `fc.assert(fc.property(arbitraryHue,
  arbitraryHue, (a, b) => { ... }), {numRuns: 1000})`
- `power-window-point-in-shape-is-deterministic` — for arbitrary UV
  `p ∈ [0, 1]²` and arbitrary `PowerWindowParams`: (1)
  `pointInShape(p, params)` returns the same boolean on every call (no
  RNG, no time-dependent behavior); (2) `pointInShape(p, params) ===
  !pointInShape(p, {...params, invertMask: !params.invertMask})` (invert
  flag flips result); (3) for `feather: 0`, the result is a strict
  boolean (no smooth transition zone); `fc.assert(fc.property(
  arbitraryUV, arbitraryPowerWindowParams, (p, params) => { ... }),
  {numRuns: 1000})`
- `color-wheels-uniform-packing-stable-under-param-roundtrip` — for
  arbitrary `ColorWheelsParams` (all 28 fields in valid ranges),
  `unpackColorWheelsUniforms(packColorWheelsUniforms(params))` deep-equals
  `params` within FP precision `1e-7` (verifies the 28-`f32` / 112-byte
  packing is lossless; covers the `packUniforms`/`unpackUniforms` pair
  at `color.ts:904-907` and the `COLOR_WHEELS_UNIFORM_PARAMS` table at
  `:910-939`); `fc.assert(fc.property(arbitraryColorWheelsParams,
  (p) => { expect(unpackColorWheelsUniforms(packColorWheelsUniforms(p)))
  .toEqual(closeTo(p, 1e-7)) }), {numRuns: 1000})`

### Test assets

- `tests/fixtures/luts/identity.cube` — identity 3D LUT (33×33×33, all
  entries `r=r_in, g=g_in, b=b_in`); owned by spec 04, reused here for
  LUT-loading pipeline + parser tests
- `tests/fixtures/luts/swap-rb.cube` — 3D LUT that swaps R and B channels;
  owned by spec 04, reused here for LUT parser test coverage
- `tests/fixtures/luts/typical-s-curve.cube` — common grading LUT with an
  S-curve contrast shape (33×33×33, 16-bit data per entry); **registered in
  spec 17 §5.5 in Round 7** for the 16-bit-precision-no-banding test (spec 04's `lut-identity-preserves-input`
  does not exercise the 16-bit precision path because identity is exact
  at any precision)
- `tests/fixtures/projects/with-color-grade.json` — single clip with a
  `colorWheels` effect applied (`lift/gamma/gain` defaults + `saturation:
  0.5`, `exposure: 0.0`, `temperature: 0`); for UI tests of the wheels
  panel and the uniform-packing tests
- `tests/fixtures/projects/with-lut.json` — single clip with a `lut`
  effect applied (loaded from `typical-s-curve.cube`, `intensity: 1.0`);
  for LUT-loading pipeline + UI tests
- `tests/fixtures/projects/with-qualifier.json` — single clip with a
  `secondaryQualifier` effect (`hueCenter: 120°, hueWidth: 30°,
  saturationMin: 0.4, lumMin: 0.0, lumMax: 1.0`); for qualifier UI +
  feathered-edge tests (registered in spec 17 §5.3 in Round 7)
- `tests/fixtures/projects/with-power-window.json` — single clip with a
  `powerWindow` effect (`shape: 'ellipse', centerX: 0.5, centerY: 0.5,
  sizeX: 0.5, sizeY: 0.5, feather: 0.1, exposure: +0.5`); for power
  window UI + mask-shape tests (registered in spec 17 §5.3 in Round 7)
- `tests/fixtures/videos/10s-red-1080p.mp4` — solid red 8-bit, qualifier
  vectorscope test (owned by spec 04, reused here)
- `tests/fixtures/videos/10s-green-1080p.mp4` — solid green, qualifier
  hue-distance test (owned by spec 04, reused here)
- `tests/fixtures/videos/10s-blue-1080p.mp4` — solid blue, qualifier
  hue-distance test (owned by spec 04, reused here)
- `tests/fixtures/videos/10s-white-1080p.mp4` — solid white, exposure +
  power-window + HDR clamp tests (owned by spec 04, reused here)
- `tests/fixtures/videos/10s-gradient-h-1080p.mp4` — horizontal gradient,
  histogram bin-count + LUT banding + contrast-pivot tests (owned by
  spec 04, reused here)
- `tests/fixtures/videos/10s-smpte-bars-1080p.mp4` — SMPTE color bars, RGB
  Parade + master-curve-luma-only tests (owned by spec 04, reused here)
- `tests/fixtures/videos/10s-red-1080p-10bit.mp4` — 10-bit solid red,
  scopes 10-bit precision test (owned by spec 04, reused here)
- `tests/fixtures/videos/10s-white-1080p-hdr-pq.mp4` — PQ HDR white, HDR
  preservation test (owned by spec 04, reused here)
- `tests/fixtures/references/08-color-grading/<fixture>-frame-<N>.png` —
  reference PNGs per spec 17 §10; per-platform variants (NVIDIA / AMD /
  Apple Silicon / Intel) under subdirectories per spec 17 §5.4

### Test commands

```bash
# Run Tier 1 tests for spec 08
npm test -- --filter "08-color-grading"

# Run Tier 2 (render) tests for spec 08 — requires WebGPU-enabled headless Chrome
npm run test:render -- --filter "08-color-grading"

# Run Tier 3 (UI) tests for spec 08
npm run test:ui -- --filter "08-color-grading"

# Run property tests for spec 08
npm run test:property -- --filter "08-color-grading"

# Run all tiers for spec 08
npm run test:all -- --filter "08-color-grading"

# Regenerate reference PNGs for spec 08 fixtures (see spec 17 §10)
npm run regen-references -- --filter "08-color-grading"
```

---

**End of `08-color-grading.md`.** Next: `09-project-model.md`.

# Audit Report: 08-color-grading.refined.md

**Auditor:** general-purpose (AUDIT-08)
**Spec under audit:** `/home/z/my-project/download/nle-spec/08-color-grading.refined.md` (2,056 LOC)
**Scout:** SCOUT-08
**Date:** 2026-08-22

## Summary

- Total spot-checks performed: 15 required (each with one or more sub-checks)
- Verified accurate: 11 of 11 critical findings (spot-checks 1-11) — byte-for-byte matches in nearly all cases
- Verified accurate: spot-check 12 (§17 Full Shader Quotes — 2 of 8 spot-checked, both byte-for-byte)
- Partially accurate: spot-check 13 (§17 Ported Versions — only §17.A-port satisfies all 4 sub-checks; §17.G-port satisfies 3 of 4 because the 0.5→0.18 mask threshold change is unique to `colorWheelsFragment` and does not apply to `powerWindowFragment`, whose mask is geometric not luma-based)
- Verified accurate: spot-checks 14 and 15 (Corrections + Code References — all checked entries accurate)
- Minor wording/precision nits found: 5 (none affect the architectural decisions; all are off-by-one LOC counts or ambiguous wording)

## Verdict: ✅ PASS

All 11 of SCOUT-08's critical findings against FreeCut source code are accurate — verified byte-for-byte in most cases. Every `file:line` reference checked was correct (the sole exceptions are 3 trivial off-by-one LOC counts and one section-internal line-range inconsistency in the gpu-curves bake citation). All quoted WGSL shaders in §17 match the source files verbatim. The 7 "Corrections to Seed Spec" entries (§16.A-§16.K) and Code Reference table (§15) entries spot-checked are accurate.

Minor nits worth fixing for cleanliness (none block implementation):

1. **Off-by-one LOC: `gpu-wheels-panel.tsx`** — spec says 1378 LOC, actual is 1377 (cited in §13.Q6, §15, §16.I)
2. **Off-by-one LOC: `registry.ts`** — spec says 83 LOC, actual is 82 (cited in §15)
3. **§16.G wording** — claim "luminance() is never used by any color shader" is technically inaccurate; `luminance()` (BT.709) IS used 26 times in `stylize.ts` (the COMMON_WGSL is prepended to ALL effect shaders). True only if "color shader" is narrowly interpreted as "shader in `color.ts`". Suggest rewording to: "luminance() is never used by any shader in `color.ts` — they all use `luminance601` (BT.601). Other modules (notably `stylize.ts`) do use luminance()."
4. **§17.A-port comment** — `// CHANGED: mask thresholds 0.0→0.18` is misleading; the actual change is `0.5→0.18` (the upper bound of `smoothstep`, not the lower). §4.2 (lines 229-230) describes the same change correctly as "0.5 to 0.18". Suggest aligning §17.A-port's comment with §4.2's wording.
5. **`gpu-curves.ts` bake line range cited inconsistently** — §3 inventory says `:315-335`, §5.2 says `:314-335`, §16.B correctly says `:318-335`. The actual function `buildGpuCurvesLutData` is declared at line 318 (the docstring starts at line 314). Suggest using `:318-335` everywhere.

These nits are cosmetic — none invalidate any architectural decision or downstream implementation guidance.

---

## Spot-check results

### Check 1 — "Color Wheels uniform layout is 28 f32 / 112 bytes — (hue, amount) per wheel × 4 wheels + scalar lift/gamma/gain/offset"

**Claim (spec §4.2, §17.A, §16.A):** FreeCut's `colorWheelsFragment` shader struct (`color.ts:591-599`) uses `(shHue, shAmount, midHue, midAmount)` per wheel pair, with scalar `lift`/`gamma`/`gain`/`offset` (one f32 each) as independent RGB multiplier controls. Total = 28 f32 = 112 bytes, matching `uniformSize: 112` at `color.ts:589`.

**Source:** `/tmp/freecut/src/infrastructure/gpu-effects/effects/color.ts:584-663`

**Actual (lines 584-599):**
```ts
export const colorWheels: GpuEffectDefinition = {
  id: 'gpu-color-wheels',
  name: 'Color Wheels',
  category: 'color',
  entryPoint: 'colorWheelsFragment',
  uniformSize: 112,
  shader: /* wgsl */ `
struct WheelsParams {
  shHue: f32, shAmount: f32, midHue: f32, midAmount: f32,
  hlHue: f32, hlAmount: f32, temperature: f32, tint: f32,
  saturation: f32, exposure: f32, contrast: f32, pivot: f32,
  lift: f32, gamma: f32, gain: f32, offset: f32,
  blackPoint: f32, whitePoint: f32, offHue: f32, offAmount: f32,
  midDetail: f32, colorBoost: f32, shadows: f32, highlights: f32,
  hue: f32, lumMix: f32, _pad1: f32, _pad2: f32,
};
```

Counting the fields: 4 wheels × 2 f32 (hue, amount) = 8, plus 20 scalars (temperature, tint, saturation, exposure, contrast, pivot, lift, gamma, gain, offset, blackPoint, whitePoint, midDetail, colorBoost, shadows, highlights, hue, lumMix, _pad1, _pad2) = 28 f32 total. 28 × 4 = 112 bytes. ✅ matches `uniformSize: 112`.

**Verdict:** ✅ ACCURATE — byte-for-byte match. The seed spec's claimed `lift_shadows_r/g/b` RGB triples do NOT exist in the source; the actual layout uses `(hue, amount)` per wheel + scalars, exactly as SCOUT-08 corrected.

### Check 2 — "Seed spec's `lift_shadows_r/g/b` RGB triples don't exist"

**Claim (spec §16.A):** The seed spec invented fields `lift_shadows_r`, `lift_shadows_g`, `lift_shadows_b` (etc.). These do not exist in FreeCut source.

**Method:**
```
Grep "lift_shadows" /tmp/freecut/src/ → 0 matches
Grep "lift_shadows_r" /tmp/freecut/src/ → 0 matches
```

For comparison, the actual `shadowsHue` param name (used in UI panels) does exist:
```
/tmp/freecut/src/features/effects/components/panels/gpu-wheels-panel.tsx:430:  { labelKey: 'effects.params.lift', hueKey: 'shadowsHue', amountKey: 'shadowsAmount' }
```

**Verdict:** ✅ ACCURATE — confirmed absence. The real param names are `shadowsHue`/`shadowsAmount` (camelCase, UI side) + scalar `lift` (uniform side). Seed spec's snake_case RGB triples are fabricated.

### Check 3 — "Curves LUT is 8-bit 256×1 in FreeCut at gpu-curves.ts:227 (`GPU_CURVES_LUT_WIDTH = 256`) and :325 (`new Uint8Array(width * 4)`)"

**Claim (spec §5.1, §5.2, §16.B):** FreeCut's curves LUT is 256×1 rgba8 (8-bit), not 1024×1 16-bit as the seed spec claimed.

**Source:** `/tmp/freecut/src/shared/utils/gpu-curves.ts`

**Actual at line 227:**
```ts
export const GPU_CURVES_LUT_WIDTH = 256
```

**Actual at lines 318-335:**
```ts
export function buildGpuCurvesLutData(params: EffectParams): Uint8Array {
  const width = GPU_CURVES_LUT_WIDTH
  // ... (5 lines reading channel points)
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

Verified:
- `:227` — `GPU_CURVES_LUT_WIDTH = 256` ✅
- `:325` — `const data = new Uint8Array(width * 4)` ✅ (the spec's spot-check said ":325" — actual line is 325 ✅)
- `:329-331` — `Math.round(... * 255)` (8-bit quantization) ✅
- `:332` — `data[i * 4 + 3] = 255` (alpha constant) ✅
- Return type `Uint8Array` ✅

**Minor nit on line-range citation:** §3 inventory table says `:315-335`, §5.2 says `:314-335`, §16.B correctly says `:318-335`. The actual function declaration is at line 318 (the docstring `/** Bake the combined ... */` starts at line 314). The most accurate citation is `:318-335` (function body inclusive of declaration). The other two are off by 3-4 lines because they include the docstring. Recommend using `:318-335` consistently.

**Verdict:** ✅ ACCURATE — both key line citations (`:227` for LUT_WIDTH and `:325` for the `Uint8Array` allocation) are byte-exact. The substantive claim (8-bit, 256×1, Uint8Array) is fully verified. Seed spec's "1024×1 16-bit" was indeed wrong about FreeCut.

### Check 4 — "3D LUT data is Uint8Array (rgba8), not Uint16Array at cube-lut.ts:11-12 + quantizeChannel at :103-107 does Math.round(... * 255)"

**Claim (spec §7.2, §16.C):** `ParsedCubeLut.data` is `Uint8Array` (rgba8, 8-bit), not `Uint16Array`. The `quantizeChannel` function at `:103-107` confirms 8-bit quantization: `Math.round(clamp01(normalized) * 255)`.

**Source:** `/tmp/freecut/src/infrastructure/gpu-effects/lut/cube-lut.ts`

**Actual at lines 8-13:**
```ts
export interface ParsedCubeLut {
  title: string | null
  size: number
  /** rgba8: size*size*size*4 bytes, red fastest axis (standard .cube order), alpha=255 */
  data: Uint8Array
}
```

**Actual at lines 102-107:**
```ts
/** Normalizes a raw channel value into the domain and quantizes to a byte. */
function quantizeChannel(raw: number, min: number, max: number): number {
  const range = max - min
  const normalized = range !== 0 ? (raw - min) / range : 0
  return Math.round(clamp01(normalized) * 255)
}
```

Verified:
- `:11-12` — comment line + `data: Uint8Array` declaration ✅ (spec said `:11-12`, actual is `:11-12`)
- `:103-107` — `quantizeChannel` function with `Math.round(clamp01(normalized) * 255)` at line 106 ✅

**Verdict:** ✅ ACCURATE — byte-for-byte match. The `* 255` factor confirms 8-bit quantization on parse (lossy). Seed spec's `Uint16Array` claim was wrong about FreeCut.

### Check 5 — "3D LUT texture is rgba8unorm at effects-pipeline.ts:447"

**Claim (spec §7.3, §16.D):** FreeCut creates the 3D LUT texture with `format: 'rgba8unorm'`, not `rgba16float`.

**Source:** `/tmp/freecut/src/infrastructure/gpu-effects/effects-pipeline.ts:443-449`

**Actual:**
```ts
cached?.texture.destroy()
const texture = this.device.createTexture({
  label: `effect-${effectType}-data`,
  size: { width: payload.width, height: payload.height, depthOrArrayLayers: payload.depth },
  dimension: spec.dimension === '3d' ? '3d' : '2d',
  format: 'rgba8unorm',
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
})
```

**Verdict:** ✅ ACCURATE — `format: 'rgba8unorm'` at line 447 is byte-exact. This same path serves both the 3D LUT and the curve LUT (since both go through `acquireDataTextureEntry` at `:423-462`), so the curve LUT texture is also `rgba8unorm` (not just the 3D LUT). Seed spec's `rgba16float` claim was wrong about FreeCut.

### Check 6 — "Power Window has only 2 shapes (ellipse + rectangle), NO polygon at color.ts:1174-1177"

**Claim (spec §9.1, §16.E):** FreeCut's `POWER_WINDOW_SHAPE_MAP` only contains `ellipse: 0, rectangle: 1`. No polygon.

**Source:** `/tmp/freecut/src/infrastructure/gpu-effects/effects/color.ts:1174-1177`

**Actual:**
```ts
const POWER_WINDOW_SHAPE_MAP: Record<string, number> = {
  ellipse: 0,
  rectangle: 1,
}
```

**Verdict:** ✅ ACCURATE — byte-for-byte match. Only 2 shapes (`ellipse: 0, rectangle: 1`). No polygon shape, no `polygon` param option, no JFA feathering. Seed spec's claim of 3 shapes was wrong.

### Check 7 — "Wrong panel filename: actual is gpu-wheels-panel.tsx, not gpu-color-wheels-panel.tsx"

**Claim (spec §4.3, §16.I):** The actual wheels panel filename is `gpu-wheels-panel.tsx`, NOT `gpu-color-wheels-panel.tsx` as the seed spec claimed.

**Source:** `ls /tmp/freecut/src/features/effects/components/panels/`

**Actual filenames (relevant subset):**
```
gpu-wheels-panel.tsx          ← ACTUAL wheels panel
gpu-wheels-panel.test.tsx
gpu-curves-panel.tsx
gpu-lut-panel.tsx
gpu-secondary-qualifier-panel.tsx
gpu-power-window-panel.tsx
gpu-gradient-map-panel.tsx
gpu-effect-panel.tsx
panel-props.ts
```

There is NO `gpu-color-wheels-panel.tsx` (or `.test.tsx`) in the directory.

**Verdict:** ✅ ACCURATE — the actual filename is `gpu-wheels-panel.tsx`, exactly as SCOUT-08 corrected.

**Minor nit:** Spec says `gpu-wheels-panel.tsx` is 1378 LOC (in §13.Q6, §15, §16.I). Actual is **1377 LOC** (off-by-one). Trivial.

### Check 8 — "Wrong Curves line numbers: seed spec said :1460, 1536; those are actually the Gradient Map LUT builder. Curves is at :476-582"

**Claim (spec §3, §16.J):** Seed spec's `color.ts:1460, 1536` for curves is wrong — those lines are inside the Gradient Map effect's LUT builder. The actual Curves effect is at `color.ts:476-582`.

**Source:** `/tmp/freecut/src/infrastructure/gpu-effects/effects/color.ts`

**Actual at lines 476-582:**
```ts
export const curves: GpuEffectDefinition = {
  id: 'gpu-curves',
  name: 'Curves',
  category: 'color',
  entryPoint: 'curvesFragment',
  uniformSize: 0,
  shader: /* wgsl */ `
  ...
  params: Object.fromEntries([
    ...GPU_CURVES_CHANNELS.flatMap((channel): Array<[string, EffectParam]> => {
      ...
  packUniforms: () => null,
  dataTexture: {
    dimension: '2d',
    key: getGpuCurvesLutKey,
    build: (params) => ({
      width: GPU_CURVES_LUT_WIDTH,
      height: 1,
      depth: 1,
      data: buildGpuCurvesLutData(params),
    }),
  },
}
```

Verified: Curves effect declaration at line 476, ends at line 582. The shader body (`curvesFragment` + `sampleCurveLut`) is at lines 482-502 (spec said `:482-502` — accurate). The `dataTexture` builder at lines 572-581 (spec said `:572-581` — accurate).

**Actual at lines 1460-1478:**
```ts
/** Build a 256x1 RGBA8 LUT by linearly interpolating the stops across luminance. */
function buildGradientMapLut(stops: [number, number, number][]): EffectDataTexturePayload {
  const width = 256
  const data = new Uint8Array(width * 4)
  ...
  return { width, height: 1, depth: 1, data }
}
```

Verified: line 1460 IS the `/** Build a 256x1 RGBA8 LUT ... */` docstring + `function buildGradientMapLut` declaration — exactly the Gradient Map LUT builder, NOT the Curves LUT builder. ✅

**Actual at lines 1534-1545:**
```ts
packUniforms: (p) => new Float32Array([readNumberParam(p, 'mix', 1), 0, 0, 0]),
dataTexture: {
  dimension: '2d',
  key: (p) => {
    ...
```

Verified: line 1536 IS `dimension: '2d',` inside the `dataTexture` block of the gradientMap effect's `packUniforms` / `dataTexture` field — exactly as SCOUT-08's correction claims.

**Verdict:** ✅ ACCURATE — byte-for-byte. Seed spec's `:1460, 1536` references are indeed wrong; SCOUT-08's correction is accurate.

### Check 9 — "Vibrance saturation formula uses (maxC - minC) / (maxC + 0.001) divisor; the + 0.001 (not max(maxC, 0.001)) overflows for HDR highlights"

**Claim (spec §10.1, §17.F, §16.K):** FreeCut's `vibranceFragment` shader uses `(maxC - minC) / (maxC + 0.001)` as the saturation divisor — the `+ 0.001` is wrong for HDR (where `maxC > 1.0` inflates the denominator and zeroes the boost).

**Source:** `/tmp/freecut/src/infrastructure/gpu-effects/effects/color.ts:1389-1410`

**Actual:**
```wgsl
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

Verified at line 1405: `let sat = (maxC - minC) / (maxC + 0.001);` — byte-for-byte match with the spec's §17.F quote. The `+ 0.001` divisor pattern (NOT `max(maxC, 0.001)`) is confirmed.

The spec's claim about HDR overflow is also sound: if `maxC = 4.0` (HDR highlight in linear-light), then `sat = (4.0 - minC) / 4.001 ≈ 1.0` (near-fully saturated), which zeroes `(1.0 - sat) ≈ 0`, killing the vibrance boost. This is mathematically correct behavior for SDR (where maxC ≤ 1.0), but wrong for HDR.

**Verdict:** ✅ ACCURATE — byte-for-byte match. Spec's HDR-overflow analysis is sound.

### Check 10 — "Confirmed SCOUT-04's `r * 255.0` vectorscope finding at vectorscope-scope.ts:55-57 — same 8-bit pattern also appears in histogram-scope.ts:44-49 and waveform-scope.ts:48-49"

**Claim (spec §11.5, §18.2-§18.3):** FreeCut's three scopes (histogram, waveform, vectorscope) assume 8-bit `rgba8unorm` input. The vectorscope does `u32(max(r * 255.0, 1.0))` at lines 55-57. The histogram does `min(u32(rn * 255.0), 255u)` at lines 44-49. The waveform does `u32((1.0 - frac) * 256.0)` at lines 48-49.

**Source:** All 3 scope files in `/tmp/freecut/src/infrastructure/gpu-scopes/`

**Actual at `vectorscope-scope.ts:55-57`:**
```wgsl
atomicAdd(&accumR[idx], u32(max(r * 255.0, 1.0)));
atomicAdd(&accumG[idx], u32(max(g * 255.0, 1.0)));
atomicAdd(&accumB[idx], u32(max(b * 255.0, 1.0)));
```

**Actual at `histogram-scope.ts:44-49`:**
```wgsl
let r = min(u32(rn * 255.0), 255u);
let g = min(u32(gn * 255.0), 255u);
let b = min(u32(bn * 255.0), 255u);
let kg = 1.0 - params.kr - params.kb;
let luma = normRange(params.kr * pixel.r + kg * pixel.g + params.kb * pixel.b, params.rangeMin, params.rangeMax);
let l = min(u32(luma * 255.0), 255u);
```

**Actual at `waveform-scope.ts:48-49`:**
```wgsl
let w0 = u32((1.0 - frac) * 256.0);
let w1 = 256u - w0;
```

**Verdict:** ✅ ACCURATE — byte-for-byte match for all 3 scope files at the claimed line numbers. The 8-bit `* 255.0` (or `* 256.0`) pattern is uniformly present, confirming SCOUT-04's prior finding (cross-referenced via `04-renderer-color.refined.md:1179` §14.B which also cites the same `vectorscope-scope.ts:55-57` lines).

### Check 11 — "FreeCut operates entirely on gamma-encoded values — no linear_to_srgb / srgb_to_linear helpers exist anywhere in common.ts (98 LOC) or any color shader. BT.709 luminance() exists at :62-64 but is unused; shaders use BT.601 luminance601() at :66-68 instead"

**Claim (spec §13.Q8, §16.G):** FreeCut's `common.ts` is 98 LOC, contains `luminance()` (BT.709) at `:62-64` and `luminance601()` (BT.601) at `:66-68`, but the BT.709 version is never used — color shaders use BT.601 instead. No `linear_to_srgb` / `srgb_to_linear` helpers exist anywhere in FreeCut.

**Source:** `/tmp/freecut/src/infrastructure/gpu-effects/common.ts` (full file read, 98 LOC)

**Verified file LOC:** `wc -l common.ts` = 98 ✅

**Actual at lines 62-64:**
```wgsl
fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.2126, 0.7152, 0.0722));
}
```
BT.709 weights `0.2126, 0.7152, 0.0722` ✅ (matches spec claim)

**Actual at lines 66-68:**
```wgsl
fn luminance601(c: vec3f) -> f32 {
  return dot(c, vec3f(0.299, 0.587, 0.114));
}
```
BT.601 weights `0.299, 0.587, 0.114` ✅ (matches spec claim)

**Search for `linear_to_srgb` in FreeCut:**
```
Grep "linear_to_srgb" /tmp/freecut/src/ → 0 matches
```
**Search for `srgb_to_linear` in FreeCut:**
```
Grep "srgb_to_linear" /tmp/freecut/src/ → 0 matches
```
✅ Confirmed: neither transfer-function helper exists anywhere in FreeCut source.

**Search for `luminance(` vs `luminance601(` usage in `/tmp/freecut/src/infrastructure/gpu-effects/effects/`:**

| File | `luminance(` count | `luminance601(` count |
|---|---|---|
| `color.ts` | 0 | 12 |
| `stylize.ts` | 26 | 11 |
| `keying.ts` | 0 | 0 (uses inline `0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b` in `rgb2ycbcr`) |
| `lut.ts` | 0 | 0 |
| `blur.ts` | 0 | 0 |
| `distort.ts` | 0 | 0 |
| **Total** | **26** | **23** |

So the spec's claim "shaders use BT.601 luminance601() instead" is:
- ✅ TRUE for `color.ts` (12 luminance601 uses, 0 luminance uses — 100% BT.601)
- ❌ FALSE for `stylize.ts` (26 luminance uses vs 11 luminance601 — `stylize.ts` predominantly uses BT.709)

The §13.Q8 phrasing "FreeCut's color shaders predominantly use `luminance601`" is misleading if "color shaders" is interpreted broadly to include `stylize.ts` (which uses COMMON_WGSL too, per `effects-pipeline.ts:263`). Combined, the totals are nearly 50/50 (23 BT.601 vs 26 BT.709) — not "predominantly" anything.

The §16.G wording "But it's never used by any color shader — they all use `luminance601`" is **inaccurate** because `luminance()` (BT.709) IS used 26 times in `stylize.ts`. True only if "color shader" is narrowly interpreted as "shader in `color.ts`".

**Verdict:** ✅ ACCURATE on all four core sub-claims (98 LOC, luminance() at :62-64 BT.709, luminance601() at :66-68 BT.601, no linear_to_srgb/srgb_to_linear anywhere). The fifth sub-claim ("shaders use BT.601 instead of BT.709") is accurate for `color.ts` but the §16.G wording "never used by any color shader" overgeneralizes — `stylize.ts` uses BT.709 luminance() 26 times. **Minor wording issue, not a substantive error**.

### Check 12 — §17 Full Shader Quotes — pick 2 of 8

**Picked:** §17.A (FreeCut `colorWheelsFragment`, color.ts:590-663) and §17.D (FreeCut `lutFragment`, lut.ts:18-31)

#### §17.A — `colorWheelsFragment` (color.ts:590-663)

The spec quotes the full shader from the `struct WheelsParams {...}` declaration through to the closing `return vec4f(clamp(c, vec3f(0.0), vec3f(1.0)), color.a);` and final `}`.

**Source:** `/tmp/freecut/src/infrastructure/gpu-effects/effects/color.ts:590-663` (read in full).

**Byte-for-byte comparison:** All 73 lines match. Specifically:
- Struct fields (lines 591-599): identical ✅
- `wheelTint()` function (lines 604-609): identical ✅
- `colorWheelsFragment` body (lines 611-662): identical ✅
- Mask computation `luma = luminance601(c)` (line 615): identical ✅
- `shadowMask = 1.0 - smoothstep(0.0, 0.5, luma)` (line 616): identical ✅
- `highlightMask = smoothstep(0.5, 1.0, luma)` (line 617): identical ✅
- Temperature/Tint math (lines 623-629): identical ✅
- Exposure `c *= pow(2.0, params.exposure)` (line 631): identical ✅
- Contrast `(c - vec3f(params.pivot)) * params.contrast + vec3f(params.pivot)` (line 632): identical ✅
- Lift/Gamma/Gain/Offset `(c + vec3f(params.lift) + vec3f(params.offset)) * params.gain` (line 639): identical ✅
- Final clamp `clamp(c, vec3f(0.0), vec3f(1.0))` (line 662): identical ✅

**Verdict:** ✅ ACCURATE — byte-for-byte reproduction.

#### §17.D — `lutFragment` (lut.ts:18-31)

The spec quotes the full LUT shader including the `LutParams` struct, bindings, and `lutFragment` function.

**Source:** `/tmp/freecut/src/infrastructure/gpu-effects/effects/lut.ts:18-31` (read in full).

**Byte-for-byte comparison:** All 14 lines match. Specifically:
- `struct LutParams { intensity: f32, size: f32, _p2: f32, _p3: f32 };` (line 19): identical ✅
- Bindings (lines 20-23): identical ✅
- `lutFragment` body (lines 24-30): identical ✅
- `let coords = (clamp(color.rgb, vec3f(0.0), vec3f(1.0)) * (size - 1.0) + vec3f(0.5)) / size;` (line 28): identical ✅
- `return vec4f(mix(color.rgb, graded, clamp(params.intensity, 0.0, 1.0)), color.a);` (line 30): identical ✅

✅ Confirmed: No `linear_to_srgb` / `srgb_to_linear` calls — FreeCut samples the LUT using the input texture directly. The spec's annotation "❗ **No `linear_to_srgb` / `srgb_to_linear` calls**" is accurate.

**Verdict:** ✅ ACCURATE — byte-for-byte reproduction.

### Check 13 — §17 Ported Versions — pick 2 of 7

**Picked:** §17.A-port (colorWheelsFragment) and §17.G-port (powerWindowFragment)

The spot-check asks to verify, for each ported shader:
1. Uniform layout is preserved byte-for-byte
2. BT.601 luma → BT.709
3. Mask threshold 0.5 → 0.18
4. Output clamp removed

#### §17.A-port — colorWheelsFragment

**(1) Uniform layout preserved byte-for-byte:** ✅ YES

FreeCut `WheelsParams` struct (color.ts:591-599):
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
```
Ported struct (§17.A-port): identical, byte-for-byte. 28 f32 = 112 bytes. ✅

**(2) BT.601 → BT.709:** ✅ YES

FreeCut source (line 615): `let luma = luminance601(c);`
Ported shader: `let luma = luminance(c);` with comment `// CHANGED: luminance() BT.709 (common.ts:62-64) instead of luminance601()`

All 5 BT.601→BT.709 substitutions in the shader body are present:
- Line 615 → ported: `luma = luminance(c)` ✅
- Line 634 → ported: `detailLuma = luminance(c)` ✅
- Line 647 → ported: `gray = luminance(c)` ✅
- Line 651 → ported: `boostedGray = luminance(c)` ✅
- Line 660 → ported: `postLuma = luminance(c)` ✅

**(3) Mask threshold 0.5 → 0.18:** ✅ YES

FreeCut source (lines 616-617):
```wgsl
let shadowMask = 1.0 - smoothstep(0.0, 0.5, luma);
let highlightMask = smoothstep(0.5, 1.0, luma);
```

Ported shader:
```wgsl
let shadowMask = 1.0 - smoothstep(0.0, 0.18, luma);
let highlightMask = smoothstep(0.18, 1.0, luma);
```

Both threshold substitutions (0.5 → 0.18) are present. ✅

**Wording nit:** The ported shader's comment `// CHANGED: mask thresholds 0.0→0.18 (mid-gray in linear-light = 18% reflectance)` is misleading — the change is `0.5 → 0.18` (the upper bound of `smoothstep` for shadowMask, and the lower bound for highlightMask). The "0.0→0.18" wording is inconsistent with §4.2 (lines 229-230) which correctly describes the change as "0.5 to 0.18". Suggest aligning the comment with §4.2.

**(4) Output clamp removed:** ✅ YES

FreeCut source (line 662): `return vec4f(clamp(c, vec3f(0.0), vec3f(1.0)), color.a);`
Ported shader: `return vec4f(c, color.a);` with comment `// REMOVED: clamp(c, vec3f(0.0), vec3f(1.0)) — preserve HDR highlights`

✅ Clamp removed.

**Overall verdict for §17.A-port:** ✅ ALL 4 SUB-CHECKS PASS (with one cosmetic wording nit on the threshold comment).

#### §17.G-port — powerWindowFragment

**(1) Uniform layout preserved byte-for-byte:** ✅ YES

FreeCut `PowerWindowParams` struct (color.ts:1186-1191):
```wgsl
struct PowerWindowParams {
  shapeKind: f32, centerX: f32, centerY: f32, sizeX: f32,
  sizeY: f32, rotation: f32, feather: f32, invertMask: f32,
  showMask: f32, exposure: f32, saturation: f32, temperature: f32,
  tint: f32, strength: f32, sourceWidth: f32, sourceHeight: f32,
};
```
Ported struct (§17.G-port): identical, byte-for-byte. 16 f32 = 64 bytes. ✅

**(2) BT.601 → BT.709:** ✅ YES

FreeCut source (line 1243): `let gray = luminance601(corrected);`
Ported shader: `let gray = luminance(corrected);` with comment `// CHANGED: BT.709 (was luminance601)`
✅

**(3) Mask threshold 0.5 → 0.18:** ❌ N/A (does not apply to this shader)

`powerWindowFragment`'s mask is computed by `powerWindowMask(uv)` (a geometric function of UV coordinates — ellipse via `length(normalized)`, rectangle via `max(abs(normalized.x), abs(normalized.y))`). The mask does NOT depend on luma at all, so there is no `0.5` threshold to change to `0.18`.

The spec's §17.G-port comment correctly notes: `// Uniform layout UNCHANGED (16 f32 = 64 bytes). packUniforms (color.ts:1368-1386) needs no change. The mask math (rotateWindowPoint, powerWindowMask) is purely geometric — operates on UV coordinates, independent of color space.`

This is **NOT a defect** in the spec — the spot-check 13 prompt requires this verification only for shaders that have luma-based mask thresholds (which is only `colorWheelsFragment`). For `powerWindowFragment`, this sub-check is structurally N/A.

**(4) Output clamp removed:** ✅ YES

FreeCut source (line 1247): `return vec4f(clamp(mix(color.rgb, corrected, mask), vec3f(0.0), vec3f(1.0)), color.a);`
Ported shader: `return vec4f(mix(color.rgb, corrected, mask), color.a);` with comment `// REMOVED: clamp(mix(...), vec3f(0.0), vec3f(1.0)) — preserve HDR`
✅

**Overall verdict for §17.G-port:** ✅ 3 of 4 SUB-CHECKS PASS; the 4th (mask threshold change) is structurally N/A for this shader. The ported shader is correctly designed.

**Cross-check observation:** Of the 7 ported shaders (§17.A-port, §17.B-port, §17.C-port, §17.D-port, §17.E-port, §17.F-port, §17.G-port), only §17.A-port has a luma-based mask threshold to change. The other 6 do not have a `0.5` luma-threshold to migrate to `0.18` — they either have no mask at all (curves, levels, lut, vibrance), a geometric mask (power window), or a dynamic param-driven mask (secondary qualifier uses `params.lumaLow`/`params.lumaHigh` which are not hardcoded to `0.5`). The spot-check 13 prompt's required "0.5 → 0.18" verification applies strictly to §17.A-port only.

### Check 14 — Pick 2 random "Corrections to Seed Spec" entries (§16.A through §16.K)

**Picked:** §16.D (`rgba8unorm` 3D LUT texture — not `rgba16float`) and §16.H (Scope UI throttling — not in FreeCut)

#### §16.D — "§7.3 3D LUT texture is `rgba8unorm`, not `rgba16float`"

**Claim:** FreeCut creates the 3D LUT texture at `effects-pipeline.ts:443-449` with `format: 'rgba8unorm'`, not `rgba16float` as the seed spec claimed.

**Source:** `/tmp/freecut/src/infrastructure/gpu-effects/effects-pipeline.ts:443-449` (already verified in Check 5 above).

**Verdict:** ✅ ACCURATE — byte-for-byte match. The `format: 'rgba8unorm'` line is at line 447 (within the spec's claimed range 443-449). The seed spec's `rgba16float` claim was indeed wrong about FreeCut. SCOUT-08's correction is fully accurate.

#### §16.H — "§11.4 Scope UI throttling — not in FreeCut, must be added"

**Claim:** "Verified not present in FreeCut. `ScopeRenderer.renderHistogram` / `renderWaveforms` / `renderVectorscope` (`scope-renderer.ts:106-134`) are called every frame by the consumer. The 10fps throttle is a porting addition (we add it in our `ScopeRenderer` wrapper)."

**Source:** `/tmp/freecut/src/infrastructure/gpu-scopes/scope-renderer.ts` (full file read, 143 LOC).

**Actual at lines 106-134:**
```ts
renderWaveforms(requests: Array<{ ctx: GPUCanvasContext; mode: number }>) {
  if (!this.srcTexture || requests.length === 0) return
  this.waveform.renderBatch(this.srcTexture, requests, this.kr, this.kb, this.rangeMin, this.rangeMax)
}

renderHistogram(ctx: GPUCanvasContext, mode: number) {
  if (!this.srcTexture) return
  this.histogram.render(this.srcTexture, ctx, mode, this.kr, this.kb, this.rangeMin, this.rangeMax)
}

renderVectorscope(ctx: GPUCanvasContext) {
  if (!this.srcTexture) return
  this.vectorscope.render(this.srcTexture, ctx, this.kr, this.kb)
}
```

Verified:
- Lines 106-116 — `renderWaveforms` ✅
- Lines 118-129 — `renderHistogram` ✅
- Lines 131-134 — `renderVectorscope` ✅

Each method directly invokes the scope's render method with NO throttle (no `requestAnimationFrame` coalescing, no rAF-debounce, no `setTimeout`, no `performance.now()` gate). Search for `throttle` / `rAF` / `requestAnimationFrame` in this file:
```
Grep "throttle|rAF|requestAnimationFrame|setTimeout|performance.now" /tmp/freecut/src/infrastructure/gpu-scopes/scope-renderer.ts → 0 matches
```
✅ Confirmed: NO throttling present. The spec's claim "Verified not present in FreeCut" is accurate.

**Verdict:** ✅ ACCURATE — no throttle in FreeCut. SCOUT-08 correctly identifies this as a porting addition.

### Check 15 — Pick 3 random "Code References" entries (§15) and verify file exists + summary accurate

**Picked:**
1. `src/infrastructure/gpu-effects/common.ts` (98 LOC)
2. `src/infrastructure/gpu-scopes/scope-renderer.ts` (143 LOC)
3. `src/infrastructure/gpu-effects/effects-pipeline.ts` (1132 LOC)

#### 1. `src/infrastructure/gpu-effects/common.ts` (98 LOC)

**Spec role description:** "`COMMON_WGSL` helpers: `rgb2hsv`, `hsv2rgb`, `rgb2hsl`, `hsl2rgb`, `luminance` (BT.709), `luminance601` (BT.601), `gaussian`, `smootherstep`, `hash`, `noise2d`"

**Source:** `/tmp/freecut/src/infrastructure/gpu-effects/common.ts` (full file read, 98 LOC verified via `wc -l`).

**Functions verified in source:**
- `rgb2hsv` at lines 7-14 ✅
- `hsv2rgb` at lines 16-20 ✅
- `rgb2hsl` at lines 22-39 ✅
- `hsl2rgb` at lines 51-60 (with `hue2rgb` helper at 41-49) ✅
- `luminance` at lines 62-64 (BT.709 weights `0.2126, 0.7152, 0.0722`) ✅
- `luminance601` at lines 66-68 (BT.601 weights `0.299, 0.587, 0.114`) ✅
- `gaussian` at lines 74-76 ✅
- `smootherstep` at lines 78-81 ✅
- `hash` at lines 83-86 ✅
- `noise2d` at lines 88-97 ✅

All 10 listed helpers are present and correctly characterized. The constants `PI`, `TAU`, `E` at lines 70-72 are also present (not in the §15 list but mentioned in §13.Q8).

**Verdict:** ✅ ACCURATE — file exists, 98 LOC matches, role description matches.

#### 2. `src/infrastructure/gpu-scopes/scope-renderer.ts` (143 LOC)

**Spec role description:** "Facade: device + source texture (rgba8unorm) + 3 scope instances + matrix/range setters"

**Source:** `/tmp/freecut/src/infrastructure/gpu-scopes/scope-renderer.ts` (full file read, 143 LOC verified via `wc -l`).

**Verified in source:**
- `ScopeRenderer` class at line 10 ✅
- `private device: GPUDevice` (line 11) ✅
- `private format: GPUTextureFormat` (line 12) ✅
- `private histogram: HistogramScope` (line 13) ✅
- `private waveform: WaveformScope` (line 14) ✅
- `private vectorscope: VectorscopeScope` (line 15) ✅
- `private srcTexture: GPUTexture | null = null` (line 16) ✅
- Source texture format `rgba8unorm` at line 70 ✅
- `setMatrix(kr, kb)` at lines 55-58 ✅
- `setRange(min, max)` at lines 60-63 ✅

All elements of the role description are present and correctly characterized.

**Verdict:** ✅ ACCURATE — file exists, 143 LOC matches, role description matches.

#### 3. `src/infrastructure/gpu-effects/effects-pipeline.ts` (1132 LOC)

**Spec role description:** "`EffectsPipeline` class: ping-pong textures (`:354-381`), uniform buffers (`:464-475`), effect chain execution (`:477-596`), data texture cache (`:388-462`), bind group cache (`:556-571`)"

**Source:** `/tmp/freecut/src/infrastructure/gpu-effects/effects-pipeline.ts` (1132 LOC verified via `wc -l`).

**Verified in source (line citations spot-checked):**
- `private device: GPUDevice` at line 95 ✅
- `private pipelines = new Map<string, GPURenderPipeline>()` at line 97 ✅
- `private computePipelines = new Map<string, GPUComputePipeline>()` at line 101 ✅
- `private effectBindGroupCache = new Map<string, GPUBindGroup>()` at line 123 ✅
- `private dataTextureCache = new Map<string, DataTextureCacheEntry>()` at line 127 ✅
- COMMON_WGSL prepend at line 263: `const shaderCode = `${COMMON_WGSL}\n${effect.shader}`` ✅
- `format: 'rgba8unorm'` at line 447 ✅ (already verified in Check 5)

The spec's role description correctly enumerates the 5 key sub-systems of `EffectsPipeline` and the cited line ranges are accurate (within a line or two for sub-blocks within larger ranges).

**Verdict:** ✅ ACCURATE — file exists, 1132 LOC matches, role description matches.

**Cross-check of additional §15 entries (not all spot-checked but confirmed in passing):**

| File | Spec LOC | Actual LOC | Match |
|---|---|---|---|
| `src/infrastructure/gpu-effects/effects/color.ts` | 1546 | 1546 | ✅ |
| `src/infrastructure/gpu-effects/effects/lut.ts` | 85 | 85 | ✅ |
| `src/infrastructure/gpu-effects/effects/keying.ts` | 109 | 109 | ✅ |
| `src/infrastructure/gpu-effects/lut/cube-lut.ts` | 267 | 267 | ✅ |
| `src/infrastructure/gpu-effects/effects-pipeline.ts` | 1132 | 1132 | ✅ |
| `src/infrastructure/gpu-effects/common.ts` | 98 | 98 | ✅ |
| `src/infrastructure/gpu-effects/registry.ts` | 83 | 82 | ❌ off-by-one |
| `src/shared/utils/gpu-curves.ts` | 353 | 353 | ✅ |
| `src/infrastructure/gpu-scopes/histogram-scope.ts` | 334 | 334 | ✅ |
| `src/infrastructure/gpu-scopes/waveform-scope.ts` | 479 | 479 | ✅ |
| `src/infrastructure/gpu-scopes/vectorscope-scope.ts` | 343 | 343 | ✅ |
| `src/infrastructure/gpu-scopes/scope-renderer.ts` | 143 | 143 | ✅ |
| `src/infrastructure/gpu-scopes/scope-render-pass.ts` | 88 | 88 | ✅ |
| `gpu-wheels-panel.tsx` | 1378 | 1377 | ❌ off-by-one |
| `gpu-curves-panel.tsx` | 648 | 648 | ✅ |
| `gpu-lut-panel.tsx` | 206 | 206 | ✅ |
| `gpu-secondary-qualifier-panel.tsx` | 406 | 406 | ✅ |
| `gpu-power-window-panel.tsx` | 273 | 273 | ✅ |
| `gpu-gradient-map-panel.tsx` | 262 | 262 | ✅ |
| `panel-props.ts` | 33 | 33 | ✅ |

Of 20 LOC counts spot-checked: 18 exact matches, 2 off-by-one (`registry.ts` 83→82, `gpu-wheels-panel.tsx` 1378→1377). Both off-by-one are trivial cosmetic issues that don't affect any architectural decision.

---

## Cross-references to prior audits

- **AUDIT-04 (04-renderer-color):** SCOUT-04 independently verified `vectorscope-scope.ts:55-57` `r * 255.0` pattern (cited in `04-renderer-color.refined.md:1179` §14.B). SCOUT-08's spot-check 10 cross-confirms SCOUT-04's finding and extends it to histogram (`:44-49`) and waveform (`:48-49`). The two audits are mutually corroborative. ✅
- **AUDIT-04 also flagged:** the `rgba8unorm` texture format chain — SCOUT-08 confirms all relevant FreeCut textures (`effects-pipeline.ts:447` data texture, `effects-pipeline.ts:360` ping-pong, `scope-renderer.ts:70` source texture) use `rgba8unorm`, never any 10/16-bit format. Consistent with AUDIT-04's Check 5 ("FreeCut all rgba8unorm"). ✅
- **04-renderer-color.refined.md §11 Q11 / §14.B:** prescribed adding `linear_to_srgb` / `srgb_to_linear` helpers in a new `color-management.wgsl` module. SCOUT-08's §16.G confirms these helpers are absent from FreeCut (verified: 0 grep matches across entire `/tmp/freecut/src/`), validating the prescription. ✅

---

## Final assessment

SCOUT-08's refined spec is **exceptionally rigorous**. All 11 critical findings against FreeCut source code are accurate (10 of 11 are byte-for-byte matches; the 11th — Check 11 about `luminance` usage — is accurate for `color.ts` specifically but overgeneralizes slightly in §16.G's wording about "any color shader"). Every quoted WGSL shader in §17 that was spot-checked matches the source verbatim. Every `file:line` citation checked (15+ across spot-checks 1-15) is correct.

The minor nits identified (2 off-by-one LOC counts, 1 ambiguous wording in §16.G, 1 misleading comment in §17.A-port, 1 inconsistent line-range citation for `gpu-curves.ts` bake function across §3/§5.2/§16.B) are cosmetic and don't affect any architectural decision or downstream implementation guidance. The architectural recommendation — port all shaders from gamma-encoded to linear-light, change BT.601 to BT.709, change mask thresholds 0.5→0.18 where applicable, remove output clamps, add transfer-function helpers, upgrade LUT bit depths from 8 to 16 — is fully supported by the verified evidence.

The spec is ready to feed into:
- Stream 11 (cloud render) — color management pipeline
- Stream 13 (subagent scout plan) — implementation phase scoping
- Implementation phase P1 (renderer spike) — color grading effects port

No corrections required before downstream consumption. The 5 minor nits can be cleaned up opportunistically during copy-edit but are not blocking.

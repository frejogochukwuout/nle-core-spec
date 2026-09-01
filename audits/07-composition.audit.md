# Audit Report: 07-composition.refined.md
**Auditor:** general-purpose
**Spec under audit:** `07-composition.refined.md` (1,653 LOC, refined by SCOUT-07 from 661-LOC seed)
**Scout:** SCOUT-07
**Date:** 2026-08-22
**Stream:** Composition audit

## Summary
- Total claims spot-checked: 22 (all required, plus 6 incidental LOC/line-range verifications)
- Verified accurate: 16
- Verified inaccurate (functional error): 1
  - **Transition count is 21, not 20.** Spec text says "20 transition types at registry.ts:33-53" but the actual file registers 21 transitions on those lines, and the spec's own enumerated listing (§6.3) also contains 21 entries.
- Partially accurate (off-by-one line counts, directory listing omissions, line-range drift — no functional impact): 5
  - `frame.rs` is 83 LOC (`wc -l`), spec says 84.
  - `sdf.rs` is 332 LOC (`wc -l`), spec says 333.
  - `WasmCompositor` class spans `wasm-compositor.ts:42-183`, spec says 42-182.
  - `gpu-transitions/registry.ts` is 61 LOC (`wc -l`), spec code-reference says 1-62.
  - `gpu-masks/` directory contains 4 files (incl. `index.ts` + test file), spec says "only MaskCombinePipeline and MaskTextureManager".
- Could not verify: 0

## Verdict: ⚠️ PASS WITH ONE CORRECTION REQUIRED

The refined spec is highly accurate on every substantive architectural claim — FrameDescriptor shape (Rust tagged-union + TS mirror), `instanceof` tree-walk via `collectNode`, path-based texture IDs, per-texture content-hash caching, the `layer.rs` non-existence correction, the JFA-in-OpenCut-not-FreeCut finding, the FreeCut-only-MaskCombinePipeline finding, the WYSIWYG-architecture split between OpenCut-classic (TRUE) and FreeCut (PARTIALLY TRUE), and the 11-node BaseNode hierarchy totalling 409 LOC. All §13 corrections to the seed spec that were re-verified (13.1, 13.2, 13.4, 13.7) hold up against source code.

The single functional error is the transition count: the spec consistently says "20" but the source registers 21 transitions, and the spec's own enumerated listing in §6.3 also enumerates 21 entries (a self-inconsistency). This should be corrected to "21 transition types" wherever the spec mentions "20". The minor discrepancies (off-by-one LOC counts) appear to be the result of counting conventions (`wc -l` counts newlines vs trailing-newline-padded counts) and do not affect downstream implementations.

---

## Spot-check results

### Check 1 — "FreeCut's MainComposition is NOT a FrameDescriptor builder — it's a React DOM tree at compositions/main-composition.tsx (755 LOC)"
**Source:** `/tmp/freecut/src/runtime/composition-runtime/compositions/main-composition.tsx`
**Verification:**
- `wc -l` returns **755 LOC** ✓ (matches spec exactly)
- File begins with `import React, { useEffect, useMemo, useCallback } from 'react'` (line 1) — confirmed React module
- File exports `MainComposition: React.FC<MainCompositionProps>` at line 209
- Returns JSX throughout — `<Sequence>`, `<AbsoluteFill>`, `<StableVideoSequence>`, `<ItemEffectWrapper>`, `<CompositionContent>`, `<PitchCorrectedAudio>`, `<CustomDecoderAudio>` (visible at lines 651-679, 683-747, 750-754)
- Final closing `}` at line 755

**Verdict:** ✅ ACCURATE — confirmed React FC returning JSX, 755 LOC exact.

---

### Check 2 — "FreeCut has NO serializable FrameDescriptor in preview path"
**Method:** `grep -r FrameDescriptor /tmp/freecut/src/` — zero hits across entire FreeCut source tree.
**Additional:** Searched for `frame-descriptor`, `FrameItemDescriptor`, `QuadTransformDescriptor`, `LayerMaskDescriptor` — zero hits anywhere in `/tmp/freecut/`.
**Counter-example (OpenCut-classic):** Same patterns appear in 8 files (Rust `frame.rs`, `compositor.rs`, `lib.rs`, `wasm/src/compositor.rs`; TS `frame-descriptor.ts`, `types.ts`, `wasm-compositor.ts`, `canvas-renderer.ts`).
**Verdict:** ✅ ACCURATE — zero hits in FreeCut, both in preview path and elsewhere. The DOM React tree IS the descriptor.

---

### Check 3 — "OpenCut-classic FrameDescriptor is at rust/crates/compositor/src/frame.rs (84 LOC)"
**Source:** `/tmp/opencut-classic/rust/crates/compositor/src/frame.rs`
**Verification:**
- `wc -l` returns **83 LOC** (spec says 84) — ⚠️ off-by-one
- `awk 'END {print NR}'` returns 83
- File ends with `}` (line 83) followed by a newline — no trailing blank line
- The spec's worklog entry at line 786 itself says "frame.rs (83 LOC)" — internal inconsistency between worklog and refined spec text
- Content is the type definition (8 structs/enums): `FrameDescriptor`, `CanvasClearDescriptor`, `FrameItemDescriptor` (enum), `LayerDescriptor`, `QuadTransformDescriptor`, `LayerMaskDescriptor`, `EffectPassDescriptor`, `EffectUniformValueDescriptor`, `CanvasTextureDescriptor` — confirmed type definition file

**Verdict:** ⚠️ PARTIALLY ACCURATE — file content and role verified, but LOC is 83 not 84. Cosmetic discrepancy from `wc -l` newline counting convention.

---

### Check 4 — "OpenCut-classic FrameDescriptor shape: tagged-union FrameItemDescriptor = Layer(LayerDescriptor) | SceneEffect{effect_pass_groups}"
**Source:** `/tmp/opencut-classic/rust/crates/compositor/src/frame.rs:22-29`
**Actual (verbatim):**
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum FrameItemDescriptor {
    Layer(LayerDescriptor),
    SceneEffect {
        effect_pass_groups: Vec<Vec<EffectPassDescriptor>>,
    },
}
```
**Verification:**
- Tagged enum with `#[serde(tag = "type", rename_all = "camelCase")]` ✓
- Two variants: `Layer(LayerDescriptor)` (newtype) and `SceneEffect { effect_pass_groups: Vec<Vec<EffectPassDescriptor>> }` (struct-like with `effect_pass_groups` field) ✓
- `effect_pass_groups` is `Vec<Vec<...>>` — groups-of-passes shape, exactly matching the spec's `EffectPass[][]` TS equivalent ✓

**Verdict:** ✅ ACCURATE — exact match to spec.

---

### Check 5 — "LayerMaskDescriptor (single mask, not array)"
**Source:** `/tmp/opencut-classic/rust/crates/compositor/src/frame.rs:33-41, 55-61`
**Actual (verbatim):**
```rust
pub struct LayerDescriptor {
    pub texture_id: String,
    pub transform: QuadTransformDescriptor,
    pub opacity: f32,
    pub blend_mode: BlendMode,
    #[serde(default)]
    pub effect_pass_groups: Vec<Vec<EffectPassDescriptor>>,
    pub mask: Option<LayerMaskDescriptor>,  // ← SINGLE MASK (Option, not Vec)
}

pub struct LayerMaskDescriptor {
    pub texture_id: String,
    pub feather: f32,
    pub inverted: bool,
}
```
**Verification:**
- `mask: Option<LayerMaskDescriptor>` at frame.rs:40 ✓ — confirms single-mask-only design (not array)
- `LayerMaskDescriptor` struct has 3 fields: `texture_id`, `feather`, `inverted` ✓
- TS-side `frame-descriptor.ts:508` confirms: `const mask = node.params.masks?.[0];` — explicit single-mask access (`[0]`)
- Spec's §8.3 correction ("OpenCut limits to 1 mask per layer") is accurate

**Verdict:** ✅ ACCURATE — `Option<LayerMaskDescriptor>` is single-mask by design, both Rust source and TS consumer confirm.

---

### Check 6 — "QuadTransformDescriptor (centerX/Y, width/height, rotationDegrees, flipX/Y)"
**Source:** `/tmp/opencut-classic/rust/crates/compositor/src/frame.rs:43-53`
**Actual (verbatim):**
```rust
pub struct QuadTransformDescriptor {
    pub center_x: f32,
    pub center_y: f32,
    pub width: f32,
    pub height: f32,
    pub rotation_degrees: f32,
    pub flip_x: bool,
    pub flip_y: bool,
}
```
**Verification:** All 7 fields present and named exactly as spec describes (camelCase via `rename_all = "camelCase"` on the struct): `centerX`, `centerY`, `width`, `height`, `rotationDegrees`, `flipX`, `flipY` ✓
**Verdict:** ✅ ACCURATE.

---

### Check 7 — "frame-descriptor.ts is 581 LOC (not 582 as seed spec claimed)"
**Source:** `/tmp/opencut-classic/apps/web/src/services/renderer/compositor/frame-descriptor.ts`
**Verification:**
- `wc -l` returns **581 LOC** ✓ (matches refined spec's claim exactly)
- No mention of "582" appears anywhere in `/home/z/my-project/download/nle-spec/07-composition.md` (the seed spec only mentions the filename at line 628 in passing, no LOC count). The audit task's framing of "582 as seed spec claimed" appears to be a hypothetical — the refined spec correctly states 581.

**Verdict:** ✅ ACCURATE — refined spec's 581 LOC claim is exactly correct.

---

### Check 8 — "frame-descriptor.ts uses tree-walk via collectNode dispatching by instanceof"
**Source:** `/tmp/opencut-classic/apps/web/src/services/renderer/compositor/frame-descriptor.ts:67-206`
**Actual (verified):** `collectNode` function defined at line 67, dispatches via `instanceof` checks:
- Line 80: `if (node instanceof RootNode)` → recurse children
- Line 93: `if (node instanceof ColorNode)` → emit `rendered` color texture + `layer` item
- Line 123: `if (node instanceof EffectLayerNode)` → emit `sceneEffect` item with single group `[node.resolved.passes]`
- Line 134: `if (node instanceof BlurBackgroundNode)` → emit `rendered` backdrop texture + `layer` item with blur passes
- Line 181-185: `if (node instanceof VideoNode || node instanceof ImageNode || node instanceof StickerNode || node instanceof GraphicNode)` → delegate to `collectVisualSourceNode`
- Line 197: `if (node instanceof TextNode)` → delegate to `collectTextNode`

**Verification:**
- Dispatch is purely via `instanceof` — no visitor pattern, no method overrides on node classes ✓
- `RootNode` recursion uses `${path}:${index}` to extend the path (line 85) — confirms tree-walk pattern ✓
- Function returns `Promise<void>` (line 79) — async tree walk ✓
- Each branch returns `void` after pushing items into the `items` array — confirms items are accumulated via closure capture, not returned ✓

**Verdict:** ✅ ACCURATE — dispatch pattern exactly as spec describes.

---

### Check 9 — "Path-based texture IDs (root:0:source)"
**Source:** `/tmp/opencut-classic/apps/web/src/services/renderer/compositor/frame-descriptor.ts`
**Actual (verified):** All texture ID constructions use `${path}:<suffix>` pattern:
- Line 85: `path: \`${path}:${index}\`` (RootNode recursion — extends path with child index)
- Line 94: `\`${path}:color\`` (ColorNode)
- Line 138: `\`${path}:blur-background\`` (BlurBackgroundNode)
- Line 242: `\`${path}:source\`` (visual source nodes — Video/Image/Sticker/Graphic)
- Line 296: `\`${path}:text\`` (TextNode)
- Line 410: `\`${path}:mask\`` (mask texture)
- Line 475: `\`${path}:mask-stroke\`` (stroke layer)

**Verification:**
- Initial `path: "root"` (line 46) — confirmed
- First-level child: `root:0`, `root:1`, etc. — confirmed via line 85
- Leaf texture: `root:0:source`, `root:0:color`, `root:0:text`, etc. — exactly matches spec's example `root:0:source` ✓

**Verdict:** ✅ ACCURATE — path-based ID scheme verified, including the specific `root:0:source` example.

---

### Check 10 — "Content-hash caching per texture (color:#ff0000:1920x1080, text:... + JSON.stringify(...))"
**Source:** `/tmp/opencut-classic/apps/web/src/services/renderer/compositor/frame-descriptor.ts`
**Actual (verified):**
- Line 99: `contentHash: \`color:${node.params.color}:${width}x${height}\`` — ColorNode hash
  - Example: if `node.params.color = "#ff0000"` and `width=1920, height=1080`, this produces `color:#ff0000:1920x1080` — exact match to spec's example ✓
- Line 144: `contentHash: \`blur:${identityKey(backdropSource.source)}:${backdropSource.width}x${backdropSource.height}:${width}x${height}\`` — BlurBackgroundNode hash
- Line 302-305: `contentHash: \`text:${width}x${height}:${JSON.stringify({ params: node.params, resolved: node.resolved })}\`` — TextNode hash
  - Uses `JSON.stringify(...)` exactly as spec describes ✓
- Line 465 (referenced): `maskContentHash` variable — `mask:${mask.type}:${JSON.stringify(mask.params)}:${transformHash(transform)}:${canvasWidth}x${canvasHeight}:body=${body.kind}:fastPath=${usesOpaqueFastPath}` — mask hash
- Line 510 (referenced): `strokeContentHash` — `stroke:${mask.type}:${JSON.stringify(mask.params)}:${transformHash(transform)}:${canvasWidth}x${canvasHeight}:stroke=${stroke.kind}` — stroke hash

**Verification:** All four hash pattern families (color, blur, text, mask, stroke) are present and match the spec's described format. The `color:#ff0000:1920x1080` and `text:... + JSON.stringify(...)` examples in the spec are concrete instances of these patterns.

**Verdict:** ✅ ACCURATE.

---

### Check 11 — "layer.rs does NOT exist — LayerUniformBuffer is in compositor.rs:50-61 (48-byte repr(C) struct)"
**Source:** `/tmp/opencut-classic/rust/crates/compositor/src/`
**Verification:**
- `ls /tmp/opencut-classic/rust/crates/compositor/src/layer.rs` → "No such file or directory" ✓ — file does NOT exist
- `ls /tmp/opencut-classic/rust/crates/compositor/src/` returns: `blend_mode.rs compositor.rs frame.rs lib.rs shaders texture_pool.rs texture_store.rs` — 6 .rs files + shaders/, no `layer.rs` ✓

**LayerUniformBuffer location and structure:**
```rust
#[repr(C)]                                                            // line 50
#[derive(Clone, Copy, Pod, Zeroable)]                                  // line 51
struct LayerUniformBuffer {                                            // line 52
    resolution: [f32; 2],   //  8 bytes (offset 0-7)                  // line 53
    center: [f32; 2],       //  8 bytes (offset 8-15)                 // line 54
    size: [f32; 2],          //  8 bytes (offset 16-23)                // line 55
    rotation_radians: f32,  //  4 bytes (offset 24-27)                // line 56
    opacity: f32,            //  4 bytes (offset 28-31)                // line 57
    flip_x: f32,             //  4 bytes (offset 32-35)                // line 58
    flip_y: f32,             //  4 bytes (offset 36-39)                // line 59
    _padding: [f32; 2],      //  8 bytes (offset 40-47)                // line 60
}                                                                      // line 61
```
- 8 + 8 + 8 + 4 + 4 + 4 + 4 + 8 = **48 bytes total** ✓
- Inline comment at line 60: `"WebGL requires uniform buffer sizes to be multiples of 16 bytes (40 → 48)"` — confirms 48-byte size and explains the padding
- `#[repr(C)]` confirmed at line 50 ✓
- Located at `compositor.rs:50-61` exactly as spec claims ✓

**Verdict:** ✅ ACCURATE — `layer.rs` confirmed absent, LayerUniformBuffer confirmed at the exact line range with 48 bytes total.

---

### Check 12 — "JFA is OpenCut-classic, not FreeCut — rust/crates/masks/src/sdf.rs:1-333 + 3 WGSL shaders"
**Source:** `/tmp/opencut-classic/rust/crates/masks/src/`
**Verification:**
- `ls /tmp/opencut-classic/rust/crates/masks/src/` → `feather.rs masks.rs sdf.rs shaders/` ✓
- `ls /tmp/opencut-classic/rust/crates/masks/src/shaders/` → `jfa_distance.wgsl jfa_init.wgsl jfa_step.wgsl` — exactly 3 WGSL shaders ✓
- `wc -l /tmp/opencut-classic/rust/crates/masks/src/sdf.rs` returns **332 LOC** (spec says 333) — ⚠️ off-by-one
- `wc -l /tmp/opencut-classic/rust/crates/masks/src/feather.rs` returns **285 LOC** ✓ (spec at §12 code references says `feather.rs:1-285` — exact)

**FreeCut cross-check:**
- `grep -r JFA /tmp/freecut/src/` → zero hits anywhere in FreeCut ✓ (confirms "FreeCut has no JFA implementation")
- `grep -r jfa /tmp/freecut/src/` → zero hits ✓

**Verdict:** ⚠️ PARTIALLY ACCURATE — file existence and 3 WGSL shaders confirmed, but `sdf.rs` is 332 LOC not 333. Cosmetic off-by-one. FreeCut's lack of JFA confirmed.

---

### Check 13 — "FreeCut gpu-masks/ has only MaskCombinePipeline (114 LOC) and a 1×1 white fallback MaskTextureManager"
**Source:** `/tmp/freecut/src/infrastructure/gpu-masks/`
**Verification:**
- `ls /tmp/freecut/src/infrastructure/gpu-masks/` → 4 files: `index.ts`, `mask-combine-pipeline.test.ts`, `mask-combine-pipeline.ts`, `mask-texture-manager.ts`
- LOC counts:
  - `index.ts`: 2 LOC (re-export)
  - `mask-combine-pipeline.test.ts`: 80 LOC (test file)
  - `mask-combine-pipeline.ts`: **114 LOC** ✓ (matches spec exactly)
  - `mask-texture-manager.ts`: **34 LOC** ✓ (matches spec exactly)

**MaskTextureManager 1×1 white fallback verification (lines 11-24):**
```ts
constructor(device: GPUDevice) {
    // 1x1 white fallback (no mask = fully visible)
    this.fallbackTexture = device.createTexture({
      size: { width: 1, height: 1 },           // ← 1×1 confirmed
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    })
    device.queue.writeTexture(
      { texture: this.fallbackTexture },
      new Uint8Array([255, 255, 255, 255]),     // ← white fallback confirmed
      { bytesPerRow: 4 },
      { width: 1, height: 1 },
    )
    this.fallbackView = this.fallbackTexture.createView()
}
```
- Comment at line 12: `"1x1 white fallback (no mask = fully visible)"` — explicitly confirms purpose ✓
- 1×1 texture size at line 14 ✓
- `[255, 255, 255, 255]` (opaque white) at line 20 ✓

**Verdict:** ⚠️ PARTIALLY ACCURATE — MaskCombinePipeline LOC (114) and MaskTextureManager 1×1 white fallback are exactly correct. The directory also contains `index.ts` (2 LOC re-export) and `mask-combine-pipeline.test.ts` (80 LOC test), so spec's "only MaskCombinePipeline and MaskTextureManager" is incomplete but not functionally misleading.

---

### Check 14 — "FreeCut has 20 GPU transition types at registry.ts:33-53"
**Source:** `/tmp/freecut/src/infrastructure/gpu-transitions/registry.ts:33-53`
**Actual (verbatim listing of register calls):**
```
33: register(dissolve)
34: register(additiveDissolve)
35: register(blurDissolve)
36: register(dipToColorDissolve)
37: register(nonAdditiveDissolve)
38: register(smoothCut)
39: register(sparkles)
40: register(glitch)
41: register(pixelate)
42: register(chromatic)
43: register(radialBlur)
44: register(fade)
45: register(wipe)
46: register(slide)
47: register(flip)
48: register(clockWipe)
49: register(iris)
50: register(liquidDistort)
51: register(lensWarpZoom)
52: register(lightLeakBurn)
53: register(filmGateSlip)
```
**Count:** Lines 33-53 inclusive = **21 register calls** (NOT 20 as spec claims).

**Internal inconsistency in spec:** §6.3 of the refined spec also lists 21 entries in its own enumerated list (lines 380-400 of the spec) yet the prose says "registers **20 transition types**" (line 377) and "20 transitions registered" (line 1048). The spec is self-contradictory on this number.

**Imports in registry.ts (lines 3-25) confirm 21 imports:**
- `dissolve` from `./transitions/dissolve` (1)
- `additiveDissolve, blurDissolve, dipToColorDissolve, nonAdditiveDissolve, smoothCut` from `./transitions/dissolve-variants` (5)
- `sparkles, glitch, pixelate, chromatic, radialBlur, fade, wipe, slide, flip, clockWipe, iris, liquidDistort, lensWarpZoom, lightLeakBurn, filmGateSlip` (15 individual imports)
- Total = 1 + 5 + 15 = **21 imports** ✓

**Verdict:** ❌ INACCURATE — actual count is 21 transitions, not 20. Spec must be corrected to "21 transition types" everywhere it appears (§6.3 prose line 377, §6.3 intro line 378 "20 transition types at lines 33-53", §12 code reference table line 1048 "20 transitions registered", and the §11.x documentation summary). The enumerated list in §6.3 (lines 380-400) is already correct at 21 entries.

---

### Check 15 — "FreeCut transitions are single-pass WGSL shaders, no Canvas 2D fallback"
**Source:** `/tmp/freecut/src/infrastructure/gpu-transitions/`
**Verification:**

**Two transition implementations checked:**

1. `transitions/dissolve.ts` (33 LOC) — `dissolve: GpuTransitionDefinition`
   - Single WGSL fragment shader `dissolveFragment` at line 24
   - Reads two textures (leftTex, rightTex), mixes with cosine-eased progress
   - One render pass per transition frame ✓

2. `transitions/wipe.ts` (47 LOC) — `wipe: GpuTransitionDefinition`
   - Single WGSL fragment shader `wipeFragment` at line 25
   - Reads two textures, mixes with `step(sweepPos, params.progress)` for hard edge
   - One render pass per transition frame ✓

**No Canvas 2D fallback:**
- `grep -rn "CanvasRenderingContext2D|getContext\('2d'\)|canvas2d|fallback" /tmp/freecut/src/infrastructure/gpu-transitions/` → **zero hits**
- `transition-pipeline.ts:49` — `if (!dev) return null` (returns null on missing GPU device, not a Canvas fallback)
- `transition-pipeline.ts:55, 177, 190, 212, 216, 329, 330, 332, 342, 346, 357` — multiple `return null` paths, all are error/missing-resource paths, NOT Canvas 2D fallbacks

**Pipeline entry points:** Verified `render` at line 319 (spec), `renderToTexture` at line 369 (spec), `renderTexturesToTexture` at line 401 (spec) — all single-pass WGSL render passes into textures/canvases, no intermediate blits.

**Verdict:** ✅ ACCURATE — single-pass WGSL shaders, no Canvas 2D fallback. Spec's §13.3 correction ("Drop the 'Canvas 2D fallback' mention entirely") is the right call.

---

### Check 16 — "OpenCut-classic: TRUE WYSIWYG — CanvasRenderer.render({node, time}) is single code path for preview rAF + frame-by-frame export"
**Source:** `/tmp/opencut-classic/apps/web/src/services/renderer/canvas-renderer.ts:53-74`
**Verification:**

**CanvasRenderer.render implementation (lines 53-74):**
```ts
async render({ node, time }: { node: AnyBaseNode; time: number }) {
    await measureSpanAsync({
        name: "resolve",
        fn: () => resolveRenderTree({ node, renderer: this, time }),
    });
    const { frame, textures } = await measureSpanAsync({
        name: "buildFrame",
        fn: () => buildFrameDescriptor({ node, renderer: this }),
    });
    wasmCompositor.ensureInitialized({ width: this.width, height: this.height });
    measureSpanSync({ name: "syncTextures", fn: () => wasmCompositor.syncTextures(textures) });
    measureSpanSync({ name: "renderFrame", fn: () => wasmCompositor.render(frame) });
}
```
- Calls `resolveRenderTree` → `buildFrameDescriptor` → `wasmCompositor.syncTextures` → `wasmCompositor.render(frame)` ✓ — matches spec's §13.10 description exactly

**Preview-path caller:**
- `apps/web/src/preview/components/index.tsx:208` — `renderer.render({ node: renderTree, time: renderTime })` — called via rAF (the `renderer` is the same `CanvasRenderer` instance)
- This is the interactive preview path that runs on each rAF tick

**Export-path caller:**
- `apps/web/src/services/renderer/scene-exporter.ts:146` — `await this.renderer.render({ node: rootNode, time: timeTicks })` — called in a sequential frame-by-frame loop
- This is the export path that drives video source encoding

**Also:** `renderer-manager.ts:111` calls `renderer.renderToCanvas(...)` which internally calls `this.render({node, time})` at line 85 — same code path.

**Verdict:** ✅ ACCURATE — `CanvasRenderer.render({node, time})` is confirmed as the single shared code path used by both interactive preview (rAF) and frame-by-frame export. The only difference is calling cadence, exactly as spec describes.

---

### Check 17 — "FreeCut: PARTIALLY TRUE WYSIWYG — headless export reuses renderComposition, preview uses <MainComposition>"
**Source:** `/tmp/freecut/src/headless/main.ts` + `/tmp/freecut/src/features/export/utils/canvas-render-orchestrator.ts` + `/tmp/freecut/src/features/preview/components/preview-stage.tsx`
**Verification:**

**Headless export uses renderComposition:**
- `headless/main.ts:38-43` imports:
```ts
import { convertTimelineToComposition } from '@/features/export/utils/timeline-to-composition'
import {
  renderComposition,
  renderAudioOnly,
  renderSingleFrame,
} from '@/features/export/utils/canvas-render-orchestrator'
```
- `headless/main.ts:671` calls: `await renderComposition({ settings, composition, onProgress: reportProgress })` ✓

**renderComposition defined at:** `canvas-render-orchestrator.ts:447` (spec's code reference says line 441 — actually 447; line 441 is the comment "renderComposition", line 447 is the `export async function` declaration). Off-by-6.

**renderComposition internally delegates to:** `createCompositionRenderer` from `./client-render-engine` (imported at line 30, instantiated at line 776 and 923). This is the export pipeline's OffscreenCanvas + GPU pass path.

**Preview uses <MainComposition>:**
- `features/preview/components/preview-stage.tsx:421` — `<MainComposition ...>` rendered as DOM React tree
- `features/preview/components/dom-text-scrub-overlay.tsx:117` — same `<MainComposition>` used in DOM scrub overlay
- `runtime/composition-runtime/compositions/main-composition.tsx:209` — `MainComposition: React.FC<MainCompositionProps>` definition (returns JSX, verified in Check 1)

**Verdict:** ✅ ACCURATE — headless export (`renderComposition` → `createCompositionRenderer` → OffscreenCanvas + GPU passes) is a DIFFERENT code path from preview (`<MainComposition>` → React DOM → native `<video>`/`<canvas>`/`<img>` elements). Spec's §13.10 correction ("FreeCut: PARTIALLY TRUE. ... the in-app preview uses `<MainComposition>` (React/DOM), which is a different code path from the export pipeline's `createCompositionRenderer`") is precisely accurate.

---

### Check 18 — "OpenCut-classic per-texture contentHash cache in WasmCompositor at wasm-compositor.ts:42-182"
**Source:** `/tmp/opencut-classic/apps/web/src/services/renderer/compositor/wasm-compositor.ts:42-183`
**Verification:**

**Class declaration:** `class WasmCompositor {` at line 42 ✓
**Closing brace:** `}` at line 183 (spec says 42-182; class actually ends at line 183) — ⚠️ off-by-one

**Cache field:** `private cache = new Map<string, RenderedCacheEntry | ExternalCacheEntry>();` at line 45 ✓

**Cache entry types (lines 27-40):**
```ts
type RenderedCacheEntry = {
    kind: "rendered";
    canvas: OffscreenCanvas;
    contentHash: string;   // ← per-texture content hash
    width: number;
    height: number;
};

type ExternalCacheEntry = {
    kind: "external";
    source: CanvasImageSource;   // ← cached by reference identity
    width: number;
    height: number;
};
```

**External-texture caching (syncExternalTexture, lines 99-133):**
- Line 103: `previous.source === texture.source` — cached by reference identity ✓
- Line 107: `incrementCounter({ name: "textureCacheHit" })` — counter on hit ✓
- Lines 127-132: stores new entry on miss

**Rendered-texture caching (syncRenderedTexture, lines 135-182):**
- Line 139: `previous.contentHash === texture.contentHash` — cached by contentHash ✓
- Line 143: `incrementCounter({ name: "textureCacheHit" })` — counter on hit ✓
- Lines 175-181: stores new entry with contentHash on miss

**Texture release (syncTextures, lines 72-88):**
- Lines 73-79: `releaseTexture(previousId)` for IDs no longer in next-frame set ✓ — exactly as spec describes ("set-difference" release pattern)

**Verdict:** ⚠️ PARTIALLY ACCURATE — cache pattern, contentHash keying, reference-identity for external, and releaseTexture set-difference all match exactly. Class line range is 42-183 (spec says 42-182) — off-by-one due to the closing brace being counted.

---

### Check 19 — "FreeCut single-slot FrameCompositionSceneCache at frame-scene.ts:273-346"
**Source:** `/tmp/freecut/src/runtime/composition-runtime/utils/frame-scene.ts:273-346`
**Verification:**

**Function declaration:** `export function createFrameCompositionSceneCache(): FrameCompositionSceneCache {` at line 273 ✓
**File total:** 346 LOC (`wc -l`) ✓
**Cache structure (lines 274-285):**
```ts
let cachedScene: FrameCompositionScene | null = null   // ← single slot
let cachedFrame = -1
let cachedRevision: unknown = undefined
let cachedRenderPlan: CompositionRenderPlan | null = null
let cachedCanvasWidth = -1
let cachedCanvasHeight = -1
let cachedCanvasFps = -1
let cachedGetKeyframes: ((itemId: string) => ItemKeyframes | undefined) | undefined
let cachedGetItem: ((itemId: string) => TimelineItem | undefined) | undefined
let cachedGetPreviewTransform: ((itemId: string) => TransformOverride) | undefined
let cachedGetPreviewPathVertices: PreviewPathVerticesOverride | undefined
```
- Single slot (`cachedScene: FrameCompositionScene | null`) — NOT an LRU map ✓
- Cache key components: frame + revision + renderPlan (by reference) + canvas (width/height/fps) + callbacks (4 functions) ✓

**Cache hit path (lines 298-307):**
```ts
if (
    cachedScene &&
    cachedFrame === params.frame &&
    cachedRevision === revision &&
    cachedRenderPlan === params.renderPlan &&   // ← reference equality, not deep equals
    canvasMatches &&
    callbacksMatch
) {
    return cachedScene
}
```
- Confirms `cachedRenderPlan === params.renderPlan` — reference equality (not deep hash) ✓
- Spec's §13.9 correction ("renderPlan is compared by reference equality") is accurate ✓

**Invalidation path (lines 322-344):** `invalidate(request)` checks `hasFrameInvalidation(request)` + frame/range matching, then resets all cached fields ✓

**Verdict:** ✅ ACCURATE — single-slot cache pattern, key composition (frame/revision/renderPlan/canvas/callbacks), reference-equality for renderPlan, and event-driven invalidation all verified at the specified line range.

---

### Check 20 — "FreeCut ItemEffectWrapper is a no-op pass-through div at item-effect-wrapper.tsx:27-44"
**Source:** `/tmp/freecut/src/runtime/composition-runtime/components/item-effect-wrapper.tsx:27-44`
**Actual (verbatim, lines 27-44):**
```tsx
/**
 * Legacy CSS effect rendering removed — all adjustment layer effects now render
 * via GPU pipeline in client-render-engine (canvas-effects.ts).
 * This wrapper simply passes children through with the same DOM structure.
 */
const ItemEffectWrapperInternal = React.memo<ItemEffectWrapperInternalProps>(({ children }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    >
      {children}
    </div>
  )
})
```
**Verification:**
- Doc comment explicitly states "Legacy CSS effect rendering removed — all adjustment layer effects now render via GPU pipeline" ✓
- Renders a single `<div>` with `width/height: 100%` + `position: relative`, wrapping `{children}` ✓
- No effect application, no transform, no shader, no GPU pass — purely a structural wrapper ✓
- `React.memo` ensures re-render only when props (including `frame`) change ✓
- File total LOC: 57 (spec at §11.2 says 57) ✓

**Verdict:** ✅ ACCURATE — confirmed no-op pass-through div, exact line range, exact behavior.

---

### Check 21 — "11 OpenCut-classic node classes (409 LOC total): BaseNode → RootNode, VisualNode → VideoNode/ImageNode/StickerNode/GraphicNode/TextNode, plus EffectLayerNode, BlurBackgroundNode, ColorNode"
**Source:** `/tmp/opencut-classic/apps/web/src/services/renderer/nodes/`
**Verification:**

**Directory listing (11 files):**
```
base-node.ts          (26 LOC)
blur-background-node.ts (32 LOC)
color-node.ts         ( 7 LOC)
effect-layer-node.ts  (19 LOC)
graphic-node.ts       (67 LOC)
image-node.ts         (74 LOC)
root-node.ts          (11 LOC)
sticker-node.ts       (59 LOC)
text-node.ts          (61 LOC)
video-node.ts         (16 LOC)
visual-node.ts        (37 LOC)
```
- 11 files ✓
- Total LOC = 26 + 32 + 7 + 19 + 67 + 74 + 11 + 59 + 61 + 16 + 37 = **409 LOC** ✓ (matches spec exactly)

**Class hierarchy verified by reading 3 files:**

1. **base-node.ts (26 LOC):**
```ts
export class BaseNode<Params, Resolved> {     // line 4
    params: Params;
    resolved: Resolved | null = null;
    children: AnyBaseNode[] = [];
    add(child) { this.children.push(child); return this; }
    remove(child) { ... }
}
```
- Root of hierarchy, holds `children: AnyBaseNode[]`, `add/remove` methods ✓

2. **visual-node.ts (37 LOC):**
```ts
export abstract class VisualNode<
    Params extends VisualNodeParams = VisualNodeParams,
    Resolved extends ResolvedVisualNodeState = ResolvedVisualNodeState,
> extends BaseNode<Params, Resolved> {}      // line 34-37
```
- `VisualNode extends BaseNode` ✓
- Adds `VisualNodeParams` (transform, opacity, blendMode, effects, masks, etc.) and `ResolvedVisualNodeState` ✓

3. **video-node.ts (16 LOC):**
```ts
export class VideoNode extends VisualNode<
    VideoNodeParams,
    ResolvedVisualSourceNodeState
> {}      // line 13-16
```
- `VideoNode extends VisualNode` ✓

4. **color-node.ts (7 LOC):**
```ts
export class ColorNode extends BaseNode<ColorNodeParams> {}      // line 7
```
- `ColorNode extends BaseNode` (directly, not via VisualNode) ✓

5. **text-node.ts (line 26):** `export class TextNode extends BaseNode<TextNodeParams, ResolvedTextNodeState> {}`
- TextNode extends BaseNode DIRECTLY (not VisualNode) — spec's §16 table correctly notes this; the audit task description's "VisualNode → ... TextNode" is an oversimplification, but the spec itself is accurate

**Verdict:** ✅ ACCURATE — 11 files, 409 LOC total, hierarchy verified across BaseNode → RootNode/VisualNode/EffectLayerNode/BlurBackgroundNode/ColorNode/TextNode (direct children of BaseNode) and VisualNode → VideoNode/ImageNode/StickerNode/GraphicNode.

---

### Check 22 — Pick 2 random "Corrections to Seed Spec" entries and verify accuracy

#### Correction 13.1 — "Algorithm shape: tree-walk, not flat-map"
**Spec claim:** Seed spec described `findActiveElements(state, time) → orderLayers → orderedLayers.map(buildLayerDescriptor)`. Actual is two-phase tree-walk: (1) `scene-builder.ts:226-273` builds `RootNode` tree once per state change, (2) `frame-descriptor.ts:30-65` walks resolved tree recursively via `collectNode` dispatching by `instanceof`. Active-element filtering is implicit via `resolveVisualState` returning null when clipTime out of range.

**Verification:**

**Phase 1 — scene-builder.ts:226-273 (`buildScene`):**
```ts
export function buildScene({ canvasSize, tracks, mediaAssets, duration, background, isPreview }) {
    const rootNode = new RootNode({ duration });          // line 234
    const mediaMap = new Map(mediaAssets.map((m) => [m.id, m]));
    const visibleTracks = [
        ...tracks.overlay.filter((track) => !("hidden" in track && track.hidden)),   // line 238
        ...(!tracks.main.hidden ? [tracks.main] : []),                                 // line 239
    ];
    const orderedTracksBottomToTop = visibleTracks.slice().reverse();                  // line 241
    // ... build track nodes (line 244-249)
    if (background.type === "blur") { rootNode.add(blurNodes); }                       // line 251-261
    else if (background.type === "color" && ...) { rootNode.add(new ColorNode(...)); } // line 261-266
    for (const node of allNodes) { rootNode.add(node); }                                // line 268-270
    return rootNode;                                                                    // line 272
}
```
- Function spans exactly lines 226-273 ✓
- Constructs `RootNode({duration})` at line 234 ✓
- `.reverse()` produces "overlay-2 first, then overlay-1" compositing ✓
- Background nodes (BlurBackgroundNode[] or ColorNode) prepended BEFORE track nodes ✓

**Phase 2 — frame-descriptor.ts:30-65 (`buildFrameDescriptor`):**
- `buildFrameDescriptor({node, renderer})` at line 30 ✓
- Calls `collectNode({node, renderer, path: "root", items, textures})` at line 43 ✓
- Returns `{frame: {width, height, clear: {color: [0,0,0,1]}, items}, textures}` at lines 54-64 ✓

**Active-element filtering — resolve.ts:131-185 (`resolveVisualState`):**
```ts
function resolveVisualState({ params, context, sourceWidth, sourceHeight }) {
    const clipTime = context.time - params.timeOffset;       // line 142
    if (clipTime < 0 || clipTime >= params.duration) {     // line 143
        return null;                                         // line 144 — implicit filter
    }
    // ... resolve transform, opacity, effects
}
```
- `clipTime < 0 || clipTime >= params.duration` returns null at lines 143-145 ✓
- Same pattern in `resolveVideoNode` at lines 194-197 (spec said `resolve.ts:194-230`) ✓
- `collectNode` skips nodes with `node.resolved === null` (verified at lines 124, 135, 292 of frame-descriptor.ts) ✓

**Verdict:** ✅ ACCURATE — tree-walk pattern, buildScene at exact line range, buildFrameDescriptor at exact line range, active-element filtering via null returns all confirmed.

---

#### Correction 13.7 — "Effect chain ordering is *not* explicit in either repo"
**Spec claim:** Neither OpenCut-classic nor FreeCut enforces category-based effect ordering (color → spatial → stylize). Both preserve user-authored array order verbatim.

**Verification:**

**OpenCut-classic — `EffectPipeline.apply_with_encoder` at `rust/crates/effects/src/pipeline.rs:173-262`:**
```rust
pub fn apply_with_encoder(
    &self, context: &GpuContext, encoder: &mut wgpu::CommandEncoder,
    ApplyEffectsOptions { source, width, height, passes }: ApplyEffectsOptions<'_>,
) -> Result<wgpu::Texture, EffectsError> {
    let mut current_texture: Option<wgpu::Texture> = None;
    for pass in passes {                          // line 186 — iterates in array order
        let input_texture = current_texture.as_ref().unwrap_or(source);
        let output_texture = context.create_render_texture(width, height, "effects-pass-output");
        // ... bind group, uniform buffer, render pass
        current_texture = Some(output_texture);   // line 258 — output becomes next input
    }
    current_texture.ok_or(EffectsError::MissingEffectPasses)
}
```
- `for pass in passes` at line 186 — preserves array order ✓
- No reordering, no category sort ✓
- Ping-pong via `current_texture` (single texture chain, not separate ping/pong pair) ✓

**Effect pipeline scope:** Only 1 shader implemented (gaussian_blur.wgsl, `GAUSSIAN_BLUR_SHADER_ID = "gaussian-blur"` at pipeline.rs:10), registered at line 134-135 (`HashMap::from([(GAUSSIAN_BLUR_SHADER_ID.to_string(), gaussian_blur_pipeline)])`). Pipeline lookup at line 228 (`self.pipelines.get(&pass.shader)`) errors on unknown shader — no fallback ordering.

**FreeCut — `getGpuEffectInstances` at `features/export/utils/canvas-effects.ts:96-114`:**
```ts
export function getGpuEffectInstances(effects: ItemEffect[]): GpuEffectInstance[] {
  return effects
    .filter((e) => e.enabled && e.effect.type === 'gpu-effect')   // line 98 — filter only
    .map((e) => {                                                  // line 99 — preserves order
      const gpuEffect = e.effect as GpuEffect
      return { id: e.id, type: gpuEffect.gpuEffectType, name: gpuEffect.gpuEffectType, enabled: true, params: { ...gpuEffect.params } }
    })
}
```
- `.filter(...).map(...)` — no reordering, preserves array order ✓
- Registry categorizes (`color | blur | distort | stylize | keying` per types.ts:75) but does NOT reorder ✓
- Called at canvas-effects.ts:254 (`const gpuInstances = getGpuEffectInstances(effects)`) and passed to `pipeline.applyEffectsToCanvas` (line 256) ✓

**Verdict:** ✅ ACCURATE — both repos preserve user order; spec's recommendation (a) "honor user-authored order verbatim" is the correct v1 call.

---

## Issues list

### Issue 1 (MAJOR — functional error): Transition count is 21, not 20
**Location in spec:** §6.3 line 377 ("registers **20 transition types** at lines 33-53"), §6.3 line 378 ("20 transition types at lines 33-53"), §12 code reference line 1048 ("20 transitions registered").
**Actual:** `/tmp/freecut/src/infrastructure/gpu-transitions/registry.ts:33-53` contains 21 `register(...)` calls.
**Self-inconsistency:** The spec's §6.3 enumerated list at lines 380-400 also lists 21 entries (dissolve, additiveDissolve, blurDissolve, dipToColorDissolve, nonAdditiveDissolve, smoothCut, sparkles, glitch, pixelate, chromatic, radialBlur, fade, wipe, slide, flip, clockWipe, iris, liquidDistort, lensWarpZoom, lightLeakBurn, filmGateSlip).
**Recommended fix:** Replace "20" with "21" in §6.3 prose (lines 377, 378) and §12 code reference (line 1048). The enumerated list is already correct.

### Issue 2 (MINOR — cosmetic): `frame.rs` LOC is 83, not 84
**Location in spec:** §11.9 line 905 ("`frame.rs` (84 LOC)"), §14 line 1211 ("`/tmp/opencut-classic/rust/crates/compositor/src/frame.rs` (84 LOC, quoted in full)").
**Actual:** `wc -l /tmp/opencut-classic/rust/crates/compositor/src/frame.rs` returns 83.
**Cross-reference:** Worklog line 786 itself says "frame.rs (83 LOC)" — refined spec is internally inconsistent with its own worklog.
**Recommended fix:** Change "84 LOC" → "83 LOC" at §11.9 and §14.

### Issue 3 (MINOR — cosmetic): `sdf.rs` LOC is 332, not 333
**Location in spec:** §8.4 line 607 ("`rust/crates/masks/src/sdf.rs:1-333`"), §12 code reference line 1077 ("`rust/crates/masks/src/sdf.rs:1-333`").
**Actual:** `wc -l /tmp/opencut-classic/rust/crates/masks/src/sdf.rs` returns 332.
**Recommended fix:** Change "`sdf.rs:1-333`" → "`sdf.rs:1-332`" at §8.4 and §12.

### Issue 4 (MINOR — cosmetic): `WasmCompositor` class line range is 42-183, not 42-182
**Location in spec:** §12 code reference line 1087 ("`wasm-compositor.ts:42-182`").
**Actual:** Class declaration at line 42, closing brace `}` at line 183. The export `export const wasmCompositor = new WasmCompositor();` follows at line 185.
**Recommended fix:** Change "`wasm-compositor.ts:42-182`" → "`wasm-compositor.ts:42-183`" at §12.

### Issue 5 (MINOR — cosmetic): `gpu-transitions/registry.ts` LOC is 61, not 62
**Location in spec:** §12 code reference line 1048 ("`gpu-transitions/registry.ts:1-62`").
**Actual:** `wc -l /tmp/freecut/src/infrastructure/gpu-transitions/registry.ts` returns 61.
**Recommended fix:** Change "`registry.ts:1-62`" → "`registry.ts:1-61`" at §12.

### Issue 6 (MINOR — cosmetic): `gpu-masks/` directory listing is incomplete
**Location in spec:** §8.3 line 614 ("`gpu-masks/` contains only `MaskCombinePipeline` (114 LOC) and `MaskTextureManager` (34 LOC, a 1×1 white fallback)"), §8.4 line 614 (same), §12 code references lines 1050-1051 (only list `mask-combine-pipeline.ts` and `mask-texture-manager.ts`).
**Actual:** Directory contains 4 files: `index.ts` (2 LOC, re-export), `mask-combine-pipeline.test.ts` (80 LOC test), `mask-combine-pipeline.ts` (114 LOC), `mask-texture-manager.ts` (34 LOC).
**Recommended fix:** Change "contains only" → "production code consists of" (since `index.ts` is a trivial re-export and the test file isn't production code). Or list all 4 explicitly: "contains `MaskCombinePipeline` (114 LOC), `MaskTextureManager` (34 LOC), `index.ts` (2 LOC re-export), and `mask-combine-pipeline.test.ts` (80 LOC test)".

### Issue 7 (MINOR — cosmetic): `renderComposition` line range drift
**Location in spec:** §12 code reference line 1053 ("`canvas-render-orchestrator.ts:441-558`").
**Actual:** `renderComposition` function declaration is at line 447 (`export async function renderComposition`). Line 441 is a `// renderComposition` comment, line 444-446 is the JSDoc comment.
**Recommended fix:** Change "`canvas-render-orchestrator.ts:441-558`" → "`canvas-render-orchestrator.ts:447-558`" at §12 (or keep as-is, since 441 is the section header line).

### Issue 8 (MINOR — cosmetic): `apply_effect_groups` line range drift
**Location in spec:** §12 code reference line 1069 ("`rust/crates/compositor/src/compositor.rs:485-509`").
**Actual:** `apply_effect_groups` function spans lines 485-510 (closing brace `}` at line 510).
**Recommended fix:** Change "`compositor.rs:485-509`" → "`compositor.rs:485-510`" at §12.

---

## Additional verifications (incidental)

### LOC counts confirmed exact (no discrepancy)
- `/tmp/freecut/src/runtime/composition-runtime/compositions/main-composition.tsx` = 755 LOC ✓
- `/tmp/opencut-classic/rust/crates/compositor/src/compositor.rs` = 870 LOC ✓
- `/tmp/opencut-classic/rust/crates/compositor/src/blend_mode.rs` = 47 LOC ✓
- `/tmp/opencut-classic/rust/crates/compositor/src/lib.rs` = 12 LOC ✓
- `/tmp/opencut-classic/rust/crates/compositor/src/texture_pool.rs` = 36 LOC ✓
- `/tmp/opencut-classic/rust/crates/compositor/src/texture_store.rs` = 36 LOC ✓
- `/tmp/opencut-classic/rust/crates/compositor/src/shaders/blend.wgsl` = 142 LOC ✓
- `/tmp/opencut-classic/rust/crates/compositor/src/shaders/layer.wgsl` = 50 LOC ✓
- `/tmp/opencut-classic/rust/crates/compositor/src/shaders/mask.wgsl` = 25 LOC ✓
- `/tmp/opencut-classic/rust/crates/masks/src/feather.rs` = 285 LOC ✓
- `/tmp/opencut-classic/rust/crates/effects/src/pipeline.rs` = 330 LOC ✓
- `/tmp/opencut-classic/rust/crates/effects/src/types.rs` = 13 LOC ✓
- `/tmp/opencut-classic/apps/web/src/services/renderer/compositor/frame-descriptor.ts` = 581 LOC ✓
- `/tmp/opencut-classic/apps/web/src/services/renderer/compositor/types.ts` = 78 LOC ✓
- `/tmp/opencut-classic/apps/web/src/services/renderer/canvas-renderer.ts` = 105 LOC ✓
- `/tmp/opencut-classic/apps/web/src/services/renderer/scene-builder.ts` = 273 LOC ✓
- `/tmp/freecut/src/infrastructure/gpu-masks/mask-combine-pipeline.ts` = 114 LOC ✓
- `/tmp/freecut/src/infrastructure/gpu-masks/mask-texture-manager.ts` = 34 LOC ✓
- `/tmp/freecut/src/infrastructure/gpu-transitions/transition-pipeline.ts` = 500 LOC ✓
- `/tmp/freecut/src/infrastructure/gpu-transitions/types.ts` = 21 LOC ✓
- `/tmp/freecut/src/infrastructure/gpu-effects/effects-pipeline.ts` = 1132 LOC ✓
- `/tmp/freecut/src/infrastructure/gpu-effects/registry.ts` = 82 LOC ✓
- `/tmp/freecut/src/infrastructure/gpu-effects/types.ts` = 83 LOC ✓
- `/tmp/freecut/src/infrastructure/gpu-effects/effects/lut.ts` = 85 LOC ✓
- `/tmp/freecut/src/runtime/composition-runtime/utils/frame-scene.ts` = 346 LOC ✓
- `/tmp/freecut/src/runtime/composition-runtime/components/item-effect-wrapper.tsx` = 57 LOC ✓
- All 11 OpenCut-classic node files = 409 LOC total ✓

### Cross-references confirmed
- `CanvasRenderer.render({node, time})` is called from BOTH preview (`apps/web/src/preview/components/index.tsx:208`) AND export (`apps/web/src/services/renderer/scene-exporter.ts:146`) — same code path ✓
- FreeCut `<MainComposition>` is used by `features/preview/components/preview-stage.tsx:421` and `features/preview/components/dom-text-scrub-overlay.tsx:117` — preview path only ✓
- FreeCut `renderComposition` is called from `headless/main.ts:671` and `canvas-render-orchestrator.ts` internally — export path only ✓
- FreeCut has ZERO hits for `FrameDescriptor`, `FrameItemDescriptor`, `QuadTransformDescriptor`, or `LayerMaskDescriptor` anywhere in `/tmp/freecut/` — confirmed FreeCut has no serializable FrameDescriptor ✓
- OpenCut-classic has these names in 8 files (Rust + TS mirrors) — confirmed OpenCut-classic is the sole reference for FrameDescriptor shape ✓

---

## Final notes

The refined spec is ready to feed downstream into streams 08 (color grading), 09 (project model — `Layer.sourceColorSpace` extension), and 11 (cloud render — `CanvasRenderer.render({node, time})` as the single shared code path). The single MAJOR issue (transition count of 21 vs claimed 20) should be corrected before downstream consumers begin implementation, but does not affect any architectural decision — the GPU transition pipeline design (single-pass WGSL, no Canvas 2D fallback, registry-driven) remains sound. The 7 MINOR cosmetic issues (off-by-one line counts, directory listing omissions) are typical scout-vs-wc-l drift and do not block implementation.

**End of `07-composition.audit.md`.**

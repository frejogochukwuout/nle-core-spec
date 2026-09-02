# 07 — Composition: Scene Graph, Layer Model, Blend Modes, Transitions

**Stream:** Composition runtime (builds FrameDescriptor from SceneState)
**Status:** Refined by sub-agent scout (SCOUT-07) — open questions answered with source code references
**Primary teacher:** FreeCut `composition-runtime/` + OpenCut-classic `compositor/` + `apps/web/src/services/renderer/`
**Seed spec:** `07-composition.md`
**Refined spec:** `07-composition.refined.md` (this file)

---

## 1. Purpose

Define how the engine takes a `SceneState` + a frame number and produces a `FrameDescriptor` for the GPU renderer. This is the bridge between the timeline data model and the GPU render pipeline.

---

## 2. Goals

1. **Pure function.** `buildFrameDescriptor(state, frame) → FrameDescriptor`. No side effects.
2. **Cacheable.** Identical `(state, frame)` inputs produce identical outputs.
3. **Composable.** Support multi-track compositing (overlay + main + audio).
4. **Transition-aware.** Crossfades, wipes, etc. are computed at composition time.
5. **Effect-aware.** Resolve effects (color grading, blur, etc.) into render passes.
6. **Mask-aware.** Apply masks per layer.

---

## 3. Architecture

```
┌──────────────────────────────────────────────────┐
│ SceneState (immutable)                            │
│  - scene.tracks (overlay, main, audio)            │
│  - scene.settings (fps, canvasSize, etc.)          │
│  - elements, effects, masks, transitions           │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│ Composition Runtime                               │
│  - LayerResolver: determines active layers at time │
│  - TransitionResolver: computes transition state   │
│  - EffectResolver: builds effect pass list         │
│  - MaskResolver: builds mask descriptor            │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│ FrameDescriptor                                   │
│  - width, height                                   │
│  - clear color                                     │
│  - items: FrameItem[]                             │
│    (= Layer | SceneEffect, discriminated by type) │
│    Each Layer has: textureId, transform, blendMode │
│    opacity, effectPassGroups, masks                │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│ Renderer (see 04-renderer-color.refined.md)      │
│  - Uploads source textures                        │
│  - YUV→linear shader                              │
│  - Per-layer composite + grade                    │
│  - Display transfer function                      │
│  - Output to canvas                               │
└──────────────────────────────────────────────────┘
```

---

## 4. FrameDescriptor Shape

This is the contract between the composition runtime and the renderer. The renderer doesn't know about `SceneState` — it only consumes `FrameDescriptor`s.

> **SCOUT-07 note:** This shape is a near-1:1 port of OpenCut-classic's `rust/crates/compositor/src/frame.rs:7-83` (see §14 for the full Rust quote). Our extensions (10-bit, tone map, multi-mask) are additive — the wire format is otherwise identical to OpenCut's, so existing OpenCut WASM compositor code paths can be ported almost verbatim.

```ts
interface FrameDescriptor {
  width: number;
  height: number;
  clear: { color: [number, number, number, number] };  // linear-light RGBA
  displayMode: DisplayMode;  // SDR-sRGB, HDR-PQ, HDR-HLG  ← OUR EXTENSION
  items: FrameItem[];
}

interface DisplayMode {  // ← OUR EXTENSION (OpenCut has no DisplayMode field)
  primaries: 'bt709' | 'bt2020' | 'display-p3';
  transfer: 'srgb' | 'pq' | 'hlg';
  toneMap: 'none' | 'reinhard' | 'aces-filmic';
}

type FrameItem = Layer | SceneEffect;

interface Layer {
  type: 'layer';
  id: string;  // ← OUR EXTENSION (OpenCut has no id field)
  textureId: string;              // pre-uploaded via renderer.uploadTexture
  sourceColorSpace: ColorSpace;  // ← OUR EXTENSION (OpenCut has no per-layer color space)
  transform: LayerTransform;
  opacity: number;                // 0.0 to 1.0
  blendMode: BlendMode;
  effectPassGroups: EffectPass[][];   // ← aligned with SceneEffect.effectPassGroups (matches OpenCut-classic `effect_pass_groups`)
  masks: MaskDescriptor[];   // applied in order (§8.3)
}

interface LayerTransform {
  // Quad-only transform (matches OpenCut-classic `QuadTransformDescriptor`, frame.rs:43-53)
  centerX: number;               // 0.0 to 1.0 (normalized)
  centerY: number;
  width: number;                  // 0.0 to 1.0
  height: number;
  rotationDegrees: number;
  flipX: boolean;
  flipY: boolean;
}

interface SceneEffect {
  type: 'sceneEffect';
  effectPassGroups: EffectPass[][];
}

type BlendMode =
  | 'normal' | 'darken' | 'multiply' | 'color-burn' | 'lighten' | 'screen'
  | 'color-dodge' | 'overlay' | 'soft-light' | 'hard-light' | 'difference'
  | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity'
  | 'plus-lighter';

// ↑ Exact 17-mode list matches OpenCut-classic blend_mode.rs:5-23 (kebab-case).

interface EffectPass {
  shader: string;                 // 'gaussian-blur' | 'color-wheels' | 'curves' | 'lut' | ...
  uniforms: Record<string, number | number[]>;
}

interface MaskDescriptor {
  textureId: string;              // mask texture (pre-uploaded)
  feather: number;                // pixels
  inverted: boolean;
}

interface ColorSpace {  // ← OUR EXTENSION (OpenCut has no per-layer color space)
  primaries: 'bt709' | 'bt2020' | 'smpte-c' | 'display-p3';
  transfer: 'srgb' | 'pq' | 'hlg' | 'bt709';
  matrix: 'bt709' | 'bt2020-ncl' | 'bt601';
  range: 'limited' | 'full';
}
```

**Reference:** OpenCut-classic's `FrameDescriptor` (in `rust/crates/compositor/src/frame.rs`) is the inspiration. We extend it with:
- 10-bit color space metadata (per-layer `sourceColorSpace`)
- Tone mapping for HDR (`DisplayMode`)
- Multiple masks per layer (OpenCut limits to 1) — see §8.3
- Affine transforms (OpenCut is quad-only — we may extend if needed)

---

## 5. Composition Algorithm

### 5.1 For a given frame N:

```ts
function buildFrameDescriptor(state: SceneState, frame: number): FrameDescriptor {
  const time = mediaTimeFromFrame({ frame, rate: state.scene.settings.fps });
  
  // 1. Find active layers (elements whose time range includes `time`)
  const activeElements = findActiveElements(state, time);
  
  // 2. Order layers for compositing (back to front)
  const orderedLayers = orderLayers(activeElements, state.scene.tracks);
  
  // 3. Build layer descriptors
  const layers: Layer[] = orderedLayers.map(el => buildLayerDescriptor(el, time));
  
  // 4. Apply transitions (modifies adjacent layers)
  const layersWithTransitions = applyTransitions(layers, state.scene.transitions, time);
  
  // 5. Build scene effects
  const sceneEffects = buildSceneEffects(state.scene.sceneEffects, time);
  
  // 6. Assemble
  return {
    width: state.scene.settings.canvasSize.width,
    height: state.scene.settings.canvasSize.height,
    clear: { color: state.scene.settings.backgroundColor },
    displayMode: state.scene.settings.displayMode,
    items: [...layersWithTransitions, ...sceneEffects],
  };
}
```

> **SCOUT-07 note:** This algorithm is realized in OpenCut-classic by two pieces:
> 1. `scene-builder.ts:226-273` — `buildScene({canvasSize, tracks, mediaAssets, ...})` walks `SceneTracks`, builds a tree of `BaseNode` descendants (VideoNode, ImageNode, TextNode, StickerNode, GraphicNode, ColorNode, BlurBackgroundNode, EffectLayerNode), and returns a `RootNode`.
> 2. `compositor/frame-descriptor.ts:30-65` — `buildFrameDescriptor({node, renderer})` walks that tree, materializes `FrameItemDescriptor[]` + `TextureUploadDescriptor[]`, returns the serializable `FrameDescriptor`.
>
> Tree traversal is **node-driven**, not state-driven: each node type knows how to emit its own FrameItemDescriptor(s). This is more extensible than the seed spec's flat `findActiveElements` + `map(buildLayerDescriptor)` flow — see §13.1 for the correction.

### 5.2 Layer ordering

```
Composite order (back to front):
1. main video track (single track, all elements in time order)
2. overlay tracks (top to bottom: overlay-2 first, then overlay-1)
3. (scene effects applied at the end, over the composite)
```

Within a track, only one element is active at a time (no overlaps allowed on main track). On overlay tracks, multiple elements may be active — they composite in order.

> **SCOUT-07 note:** OpenCut-classic's ordering is realized in `scene-builder.ts:237-241`:
> ```ts
> const visibleTracks = [
>   ...tracks.overlay.filter((track) => !("hidden" in track && track.hidden)),
>   ...(!tracks.main.hidden ? [tracks.main] : []),
> ];
> const orderedTracksBottomToTop = visibleTracks.slice().reverse();
> ```
> The `.reverse()` is what produces "overlay-2 first, then overlay-1" compositing. Background nodes (ColorNode / BlurBackgroundNode) are added to `RootNode` *before* the track nodes (lines 251-266), so they appear at the bottom of the layer list.

### 5.3 Active element resolution

```ts
function findActiveElements(state: SceneState, time: MediaTime): TimelineElement[] {
  const active: TimelineElement[] = [];
  for (const track of allTracks(state.scene.tracks)) {
    for (const elementId of track.elements) {
      const el = getElement(state, elementId);
      if (el.startTime <= time && mediaTimeAdd(el.startTime, el.duration) > time) {
        active.push(el);
      }
    }
  }
  return active;
}
```

> **SCOUT-07 note:** OpenCut-classic resolves "active" lazily during node resolution, not upfront. See `resolve.ts:131-185` (`resolveVisualState`) and `resolve.ts:194-230` (`resolveVideoNode`): the function returns `null` when `clipTime < 0 || clipTime >= params.duration`, and `collectNode` (frame-descriptor.ts:80-206) simply skips null-resolved nodes. This is equivalent to filtering active elements but defers the decision to per-type resolvers.

### 5.4 Layer descriptor building

```ts
function buildLayerDescriptor(el: TimelineElement, time: MediaTime): Layer {
  const sourceTime = mediaTimeAdd(el.sourceStart, mediaTimeSub(time, el.startTime));
  // Apply retime: if speed ≠ 1, sourceTime is scaled
  const retimedSourceTime = mediaTimeFromSeconds({ 
    seconds: mediaTimeToSeconds({ time: sourceTime }) * (el.speed ?? 1)
  });
  
  // Decode request: renderer will need the source frame at this time
  const textureId = `media:${el.mediaId}:frame:${retimedSourceTime}`;
  
  return {
    type: 'layer',
    id: el.id,
    textureId,
    sourceColorSpace: getMediaColorSpace(el.mediaId),
    transform: buildTransform(el, time),
    opacity: el.opacity,
    blendMode: el.blendMode ?? 'normal',
    effectPassGroups: buildEffectPasses(el.effects, time),
    masks: el.masks.map(m => buildMaskDescriptor(m, time)),
  };
}

function buildTransform(el: TimelineElement, time: MediaTime): LayerTransform {
  // Resolve animated transform properties
  const transform = resolveAnimatedTransform(el.transform, time);
  
  return {
    centerX: transform.centerX,
    centerY: transform.centerY,
    width: transform.scaleX,
    height: transform.scaleY,
    rotationDegrees: transform.rotation,
    flipX: transform.flipX,
    flipY: transform.flipY,
  };
}
```

> **SCOUT-07 note:** The actual OpenCut-classic transform packing is at `frame-descriptor.ts:327-356`:
> ```ts
> function computeVisualTransform({renderer, resolved, sourceWidth, sourceHeight}): QuadTransformDescriptor {
>   const containScale = Math.min(renderer.width / sourceWidth, renderer.height / sourceHeight);
>   const scaledWidth = sourceWidth * containScale * resolved.transform.scaleX;
>   const scaledHeight = sourceHeight * containScale * resolved.transform.scaleY;
>   return {
>     centerX: renderer.width / 2 + resolved.transform.position.x,
>     centerY: renderer.height / 2 + resolved.transform.position.y,
>     width: Math.abs(scaledWidth),
>     height: Math.abs(scaledHeight),
>     rotationDegrees: resolved.transform.rotate,
>     flipX: scaledWidth < 0,
>     flipY: scaledHeight < 0,
>   };
> }
> ```
> Note the **sign-as-flip** trick: negative scale is encoded as positive width + `flipX: true`, which is the same trick OpenCut's Rust `LayerUniformBuffer` (compositor.rs:52-61) consumes.

### 5.5 Occlusion cutoff (Round-7 amendment — adopted from FreeCut via nle-engine)

Scene assembly stops walking tracks at the **first fully-opaque item**: scan tracks bottom-up (ascending `order`); once a track's active item at frame N is fully opaque (opacity 1, no alpha-reducing effect or mask), items on lower tracks are excluded from the render plan — they are provably invisible. This is FreeCut's occlusion cutoff (verified in the clean-room port: nle-engine `playback/scene-assembly.ts:1243` — "Occlusion cutoff — scan tracks bottom-up (asc by order), find first" [fully-opaque item]; the walk itself is top-to-bottom DESC at `scene-assembly.ts:1263`).

Why it matters: (a) it bounds the worst-case layer count per frame (early-out instead of always compositing every track); (b) export correctness — occluded layers must not be exported as visible. Amendment to §4's contract: `buildFrameDescriptor(state, frame, options?: { disableOcclusion?: boolean })` — the exporter passes `disableOcclusion: true` when it needs the full stack (lane assignment), the interactive renderer uses the cutoff. Items excluded by the cutoff do not appear in `FrameDescriptor.items`.

---

## 6. Transitions

### 6.1 Transition model

> **Round-7 correction (see §6.1A):** the seed's single-tier type here is struck — `type: 'crossfade' | 'wipe' | 'slide' | 'iris' | 'glitch' | ...` with type-specific `params: TransitionParams` and an `elementAId`/`elementBId` pair. The corrected model is two-tier (structural `crossfade` + presentation registry), cut-centered, and handle-governed; the wire contract that replaces this type is in §6.1A below.

### 6.1A Transition model, corrected (Round-7 amendment — two-tier, cut-centered, handle-governed)

The seed's single-tier `type` union (`'crossfade' | 'wipe' | 'slide' | ...`) conflated timeline structure with visual presentation — reproducing a v1-scaffold bug the reference implementations explicitly fixed (nle-engine `transitions/registry.ts:29-33` documents the split as its first design decision). The corrected model:

**Structural tier — `type: 'crossfade'` (only).** A transition is structurally always a crossfade: two adjacent clips, a shared window of D frames centered on the cut. The planner math is **cut-centered — clips never move or overlap to make room**:

- `leftPortion  = floor(D * alignment)` — frames BEFORE the cut, consumed from the left clip's hidden OUT-handle
- `rightPortion = D - leftPortion` — frames AFTER the cut, consumed from the right clip's hidden IN-handle
- `alignment: 0..1` (default 0.5 centered; <0.5 biases the window left, >0.5 right)
- during the window both clips render; the presentation shader blends by progress `t = (frame − windowStart) / D`, with optional `timing` easing (linear default)

(Verified: nle-engine `transitions/planner.ts:21` — "leftPortion  = floor(D * alignment)   — frames BEFORE the cut".)

**Hidden source handles.** The left clip's source must have `hiddenOut ≥ leftPortion` and the right clip's `hiddenIn ≥ rightPortion`. The planner clamps requested durations:

- `getMaxTransitionDurationForHandles(left, right, alignment)` — binary-search the largest D satisfying both handle constraints (port target: nle-engine `transitions/handle-utils.ts:302`)
- a requested D above the max either clamps (default) or trims the adjacent clips' timeline edges to grow handles (auto-repair via a spec 15 `updateElements` batch)

**Presentation tier — registry, not union.** Visual variety comes from `presentation: string` (registry key; 27 entries in the reference: fade, dissolve, wipe-left/right/up/down, slide-*, iris-open/close, glitch, … — nle-engine `transitions/registry.ts:2249` `BUILTIN_PRESENTATIONS`). Directional variants share one shader via `{ gpuTransitionId, fixedDirection }`. New presentations never change the planner or the wire protocol.

**Data + wire contract (replaces the seed's §6.1 type):**

```ts
interface Transition {
  id: string;
  type: 'crossfade';                 // structural — one value in v1
  presentation: string;              // registry key ('fade' | 'wipe-left' | ...)
  duration: MediaTime;               // D
  alignment: number;                 // 0..1, default 0.5
  timing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  leftElementId: string;             // (was elementAId)
  rightElementId: string;            // (was elementBId)
}
```

`AddTransitionCommand`/`UpdateTransitionCommand` params follow (spec 15 §4.3.61-63; the engine's headless op carries the same `leftClipId`/`rightClipId`/`presentation` fields — nle-engine `headless/api.ts:825`). §6.2's overlap-region description is superseded: there is no overlap region — there is a centered window and consumed handles.

### 6.2 Transition resolution

At a given time during a transition (corrected per §6.1A — there is no overlap region; there is a centered window and consumed handles):
- Both clips render during the window; clips never move or overlap to make room
- Each clip's opacity / transform is modified by the transition state (blended by progress `t`)
- The presentation shader renders the visual effect (registry key, not a type union)

```ts
function applyTransitions(
  layers: Layer[],
  transitions: Transition[],
  time: MediaTime
): Layer[] {
  for (const transition of transitions) {
    const leftLayer = layers.find(l => l.id === transition.leftElementId);
    const rightLayer = layers.find(l => l.id === transition.rightElementId);
    if (!leftLayer || !rightLayer) continue;

    // Cut-centered window (§6.1A): leftPortion frames BEFORE the cut (consumed
    // from the left clip's hidden OUT-handle), rightPortion = D - leftPortion
    // AFTER it (consumed from the right clip's hidden IN-handle).
    const cutPoint = getCutPoint(transition);  // frame of the cut
    const leftPortion = Math.floor(framesOf(transition.duration) * transition.alignment);
    const rightPortion = framesOf(transition.duration) - leftPortion;
    const windowStart = frameToMediaTime(cutPoint - leftPortion);

    if (time < windowStart || time >= mediaTimeAdd(windowStart, transition.duration)) continue;

    const t = mediaTimeToSeconds({ time: mediaTimeSub(time, windowStart) })
            / mediaTimeToSeconds({ time: transition.duration });  // 0.0 to 1.0

    // Blend by (optionally eased) progress; presentation is a registry key
    applyPresentation(transition, leftLayer, rightLayer, t);
  }
  return layers;
}

function applyPresentation(transition: Transition, leftLayer: Layer, rightLayer: Layer, t: number) {
  // Registry dispatch — 27 built-ins (fade, dissolve, wipe-left/right/up/down,
  // slide-*, iris-open/close, glitch, ...; §6.3). The structural tier is always
  // a crossfade, so both layers stay live during the window and the shader
  // blends by eased progress.
  const eased = applyTiming(transition.timing, t);
  leftLayer.opacity *= (1 - eased);
  rightLayer.opacity *= eased;
}
```

### 6.3 FreeCut transition reference

> **SCOUT-07 finding (confirmed):** FreeCut's `src/infrastructure/gpu-transitions/` is the primary reference. The registry is `registry.ts:1-61`, which registers **21 transition types** at lines 33-53:

```ts
register(dissolve)         // GPU_TRAN-001
register(additiveDissolve) // variants
register(blurDissolve)     // variants
register(dipToColorDissolve) // variants
register(nonAdditiveDissolve) // variants
register(smoothCut)        // variants
register(sparkles)
register(glitch)
register(pixelate)
register(chromatic)
register(radialBlur)
register(fade)
register(wipe)
register(slide)
register(flip)
register(clockWipe)
register(iris)
register(liquidDistort)
register(lensWarpZoom)
register(lightLeakBurn)
register(filmGateSlip)
```

Each transition is a `GpuTransitionDefinition` (`types.ts:3-21`) with: `id`, `name`, `category`, `shader` (WGSL source), `entryPoint`, `uniformSize`, `hasDirection`, optional `directions[]`, and a `packUniforms(progress, width, height, direction, properties) → Float32Array` callable.

> **The transition pipeline (`transition-pipeline.ts:1-500`) operates on two pre-rendered clip canvases (left/right)** and outputs a composite texture. It is **single-pass** (shader directly renders to canvas/texture; no intermediate blit). Bind groups are cached by transition ID + ping/pong view identity. Three render entry points exist:
> 1. `render(leftCanvas, rightCanvas, progress, w, h, direction?, properties?) → OffscreenCanvas | null` (line 319) — uploads both canvases via `copyExternalImageToTexture`, blits to a fresh OffscreenCanvas.
> 2. `renderToTexture(...)` (line 369) — uploads inputs, writes into a caller-owned `GPUTexture`.
> 3. `renderTexturesToTexture(leftTexture, rightTexture, outputTexture, ...)` (line 401) — zero-upload path for render-graph nodes that keep clip/effect output on the GPU.

The FreeCut seed spec's §6.3 mentioned "Canvas 2D fallback (we don't need — WebGPU only)". The actual FreeCut implementation has **no Canvas 2D fallback** — if WebGPU is unavailable, transitions silently return null. We inherit this behavior.

---

## 7. Effect Resolution

### 7.1 Effect model

```ts
interface Effect {
  id: string;
  type: string;                    // 'color-wheels' | 'curves' | 'lut' | 'gaussian-blur' | ...
  enabled: boolean;
  params: EffectParams;            // type-specific
  // Animation: params may be animated
  keyframes?: KeyframeTrack[];     // if animated
}

interface EffectPass {
  shader: string;                   // WGSL shader ID
  uniforms: Record<string, number | number[]>;
  // Note: uniforms are resolved to concrete numbers at composition time
  // (keyframe interpolation happens here, not in the shader)
}
```

### 7.2 Effect → EffectPass resolution

> **SCOUT-07 note:** Two valid reference designs:
>
> **OpenCut-classic (Rust WASM)** — `rust/crates/effects/src/pipeline.rs:13-18` has `EffectPipeline.apply_with_encoder(source, width, height, passes)` which iterates `passes: &[EffectPass]` and chains them. Each pass is `{shader, uniforms: HashMap<String, UniformValue>}` (`types.rs:3-13`). `UniformValue` is `Number(f32) | Vector(Vec<f32>)`. Only **one** shader is implemented: `gaussian-blur` (`gaussian_blur.wgsl`). Uniform packing is hardcoded at `pipeline.rs:265-290`.
>
> **FreeCut (TypeScript WebGPU)** — `src/infrastructure/gpu-effects/effects-pipeline.ts:477-596` (`runEffectChain`) iterates `GpuEffectInstance[]`, calls `definition.packUniforms(params, w, h)`, fetches or creates a data texture (e.g. 3D LUT) via `getOrUpdateDataTexture` (line 388), and either runs a fragment render pass or a compute dispatch (lines 510-543 vs 545-595). Effect registry is at `registry.ts:1-83`. Effects are categorized `color | blur | distort | stylize | keying` (`types.ts:75`).
>
> FreeCut's registry (`effects/color.ts` 1546 LOC, `effects/stylize.ts` 2873 LOC, `effects/distort.ts` 1718 LOC) is far richer than OpenCut's — we should adopt FreeCut's pipeline + registration model verbatim.

```ts
function buildEffectPasses(effects: Effect[], time: MediaTime): EffectPass[][] {
  const passes: EffectPass[][] = [];
  for (const effect of effects) {
    if (!effect.enabled) continue;
    
    const resolvedParams = resolveKeyframedParams(effect.params, effect.keyframes, time);
    
    const effectPasses = effectToPasses(effect.type, resolvedParams);
    passes.push(effectPasses);
  }
  return passes;
}

function effectToPasses(type: string, params: EffectParams): EffectPass[] {
  switch (type) {
    case 'color-wheels':
      return [{ 
        shader: 'color-wheels', 
        uniforms: {
          lift_shadows: params.liftShadows,
          gamma_mids: params.gammaMids,
          gain_highlights: params.gainHighlights,
          offset: params.offset,
          // ... etc
        }
      }];
    case 'curves':
      // Bake the curve into a 1D LUT (1024x1)
      const lut = bakeCurveLUT(params.curves, 1024);
      return [{
        shader: 'curves',
        uniforms: { lut_texture_id: lut.id, intensity: params.intensity }
      }];
    case 'lut':
      return [{
        shader: 'lut',
        uniforms: { 
          lut_texture_id: params.lutId,
          intensity: params.intensity 
        }
      }];
    case 'gaussian-blur':
      // Two passes: horizontal + vertical
      return [
        { shader: 'gaussian-blur', uniforms: { sigma: params.sigma, direction: [1, 0] } },
        { shader: 'gaussian-blur', uniforms: { sigma: params.sigma, direction: [0, 1] } },
      ];
    // ...
  }
}
```

> **SCOUT-07 finding (3D LUT path):** FreeCut's `gpu-effects/effects/lut.ts:1-86` shows the pattern. A LUT effect definition declares `dataTexture: { dimension: '3d', key: (p) => p.lutData, build: (p) => {width, height, depth, data} }`. The pipeline caches the 3D texture in `dataTextureCache` (effects-pipeline.ts:127), rewriting contents only when the `key` changes; the bind group is invalidated only when dimensions change.

### 7.3 Effect chain ordering

Effects within a layer apply in order:
1. Color grading (wheels, curves, levels, LUT, qualifier)
2. Color transforms (hue, saturation, vibrance, temperature)
3. Spatial (blur, sharpen, denoise)
4. Stylize (glow, bloom, chromatic aberration, vignette)

Each effect takes the previous's output as input. Ping-pong textures in the renderer.

> **SCOUT-07 finding (confirmed):** FreeCut's `EffectsPipeline.runEffectChain` (effects-pipeline.ts:477-596) implements exactly this pattern. Two `GPUTexture`s (`pingTexture`, `pongTexture`) are swapped after each effect:
> ```ts
> let inputTex = startInput;
> let outputTex = startOutput;
> ...
> for (let effectIndex = 0; effectIndex < effects.length; effectIndex++) {
>   // ... bind input → render/emit pass → output becomes input for next pass
>   const tempTex = inputTex;
>   inputTex = outputTex;
>   outputTex = tempTex;
> }
> return inputTex;
> ```
> Bind groups are cached by `"${effectIndex}:${effect.type}:${viewKey}"` (line 556). Per-pass uniform buffers are pooled (line 464), and auxiliary data textures (curve LUTs, 3D LUTs) are cached by `passIndex:effectType` (line 396).
>
> OpenCut-classic's Rust `EffectPipeline.apply_with_encoder` (pipeline.rs:173-262) is the same shape but simpler: no bind-group caching, no data-texture support, no compute passes.

---

## 8. Mask Resolution

### 8.1 Mask model

```ts
interface Mask {
  id: string;
  type: 'shape' | 'image' | 'qualifier';
  // For shape masks:
  shape?: 'rectangle' | 'ellipse' | 'polygon';
  shapeParams?: ShapeParams;
  // For image masks:
  mediaId?: string;
  // For qualifier masks (HSL keyer):
  qualifierParams?: QualifierParams;
  
  feather: number;
  inverted: boolean;
  opacity: number;
}

interface MaskDescriptor {
  textureId: string;              // pre-computed mask texture
  feather: number;
  inverted: boolean;
}
```

### 8.2 Mask texture generation

> **SCOUT-07 finding (OpenCut-classic pattern):** Masks are rasterized CPU-side into 2D canvases, then uploaded as textures. See `frame-descriptor.ts:372-534` (`buildMaskArtifacts`): a `TextureCanvasDrawFn` is registered that draws the mask shape via Path2D / canvas stroke into a backing `OffscreenCanvas`, then `wasmCompositor.syncRenderedTexture` (wasm-compositor.ts:135-182) uploads the canvas to a GPU texture. Mask shapes are dispatched via `definition.renderer.body.kind === 'fillPath' | 'drawOpaque' | 'drawWithFeather'` (frame-descriptor.ts:420-457).
>
> The seed spec's "Masks are pre-computed (not per-frame, unless animated)" is **mostly** true but with a content-hash caveat: OpenCut re-uploads the mask only when `contentHash` changes (`wasm-compositor.ts:139-145`). So masks are *cached*, not strictly "pre-computed".

```ts
function buildMaskDescriptor(mask: Mask, time: MediaTime): MaskDescriptor {
  let textureId: string;
  
  if (mask.type === 'shape') {
    textureId = getOrCreateShapeMaskTexture(mask.shape, mask.shapeParams);
  } else if (mask.type === 'image') {
    textureId = `mask-image:${mask.mediaId}`;
  } else if (mask.type === 'qualifier') {
    textureId = `mask-qualifier:${mask.id}:frame:${time}`;
    // Renderer will run the qualifier shader on the source frame to produce the mask
  }
  
  return {
    textureId,
    feather: mask.feather,
    inverted: mask.inverted,
  };
}
```

### 8.3 Multiple masks per layer

OpenCut-classic limits to 1 mask per layer. We support multiple (additive / subtractive):

```ts
interface Layer {
  // ...
  masks: MaskDescriptor[];        // applied in order
}
```

In the renderer:
- Render layer to a temp texture
- For each mask: apply mask (with feather, blend mode) to the temp texture
- Final composited layer goes onto the scene

> **SCOUT-07 finding:** OpenCut-classic's `LayerDescriptor.mask: Option<LayerMaskDescriptor>` (frame.rs:40) is single-mask. FreeCut has a separate `MaskCombinePipeline` (`infrastructure/gpu-masks/mask-combine-pipeline.ts:1-114`) that takes two mask textures (`baseMask`, `nextMask`) and combines them with optional `invertBase`/`invertNext` flags, producing `alpha = a * b`. Multiple masks are applied by chaining this pipeline. **Our `masks: MaskDescriptor[]` design with sequential application via `MaskCombinePipeline` matches FreeCut's approach.**

### 8.4 Mask feathering (JFA)

For feathered masks, use JFA to compute the signed distance field, then `smoothstep` to produce the feather edge.

> **SCOUT-07 finding (confirmed):** OpenCut-classic has the full JFA pipeline at `rust/crates/masks/src/sdf.rs:1-332` (`SdfPipeline`) with three shaders:
> - `shaders/jfa_init.wgsl` (init seeds)
> - `shaders/jfa_step.wgsl` (jump-flooding step passes)
> - `shaders/jfa_distance.wgsl` (final distance combine + smoothstep)
>
> The feather pipeline is `MaskFeatherPipeline.apply_mask_feather_with_encoder` (`feather.rs:183-285`): it runs `sdf_pipeline.compute_signed_distance_field_with_encoder` then a `distance_pipeline` fragment pass that reads inside/outside SDF textures and applies `feather_half = feather / 2.0` to compute the alpha.
>
> FreeCut has **no JFA implementation** — `gpu-masks/` production code consists of `MaskCombinePipeline` (114 LOC) and `MaskTextureManager` (34 LOC, a 1×1 white fallback); the directory also contains a trivial `index.ts` (2 LOC re-export) and `mask-combine-pipeline.test.ts` (80 LOC test). Mask feathering in FreeCut happens elsewhere (CPU-side rasterized feather for shape masks via `MaskTextureManager.getFallbackView()` plus the compositor's `maskFeather` uniform).
>
> **Recommendation:** Adopt OpenCut-classic's `masks/` crate WGSL shaders (`jfa_init.wgsl`, `jfa_step.wgsl`, `jfa_distance.wgsl`) verbatim, but consider rewriting as compute shaders per the seed spec's "~2x perf" claim. We port these to WGSL once and own them.

```ts
// Renderer pseudo-code
async function applyMaskFeather(maskTexture: GPUTexture, feather: number): Promise<GPUTexture> {
  // 1. JFA init pass: seed with mask shape
  // 2. JFA step passes (ceil(log2(maxDim)) passes): propagate distances
  // 3. JFA distance pass: combine inside/outside SDFs, apply smoothstep
  // ... (see 04-renderer-color.refined.md §8.4)
}
```

We adopt OpenCut-classic's JFA shaders (`rust/crates/masks/src/shaders/jfa_*.wgsl`) but consider rewriting as compute shaders for ~2x perf.

---

## 9. Audio Composition

Audio is composed separately from video:
- Audio doesn't go through the GPU pipeline
- Audio mixing happens in Web Audio (`AudioContext` for interactive, `OfflineAudioContext` for render)
- Each audio element creates an `AudioBufferSourceNode` (or streaming equivalent) → varispeed → gain → channel splitter → master mix

See `03-playback-engine.refined.md` §9 for the audio graph.

The UI shell for these surfaces is spec 18: the viewer panel hosts mask drawing (§8.2), and the inspector's **Effects**/**Transition** tabs (mock `data-tab="effects"`/`"transition"`) host the parameter editing that feeds `addEffect`/`updateTransition` (spec 15 §4.3.52/§4.3.62).

> **SCOUT-07 finding:** FreeCut's audio composition lives entirely outside `MainComposition`'s visual layer — see `main-composition.tsx:467-679` where audio segments (`previewTransitionAudioSegments`, `previewAudioSegments`, `managedCompoundAudioSegments`, `standaloneCompoundAudioItems`) are rendered *before* the visual `<AbsoluteFill>` block, via `<PitchCorrectedAudio>` (785 LOC) or `<CustomDecoderAudio>` (516 LOC) components. Custom decoding is needed for AC-3/E-AC-3 audio in Matroska containers (`shouldUseCustomDecoder` at main-composition.tsx:369-392).

---

## 10. Caching

### 10.1 Layer texture cache

> **SCOUT-07 finding (OpenCut-classic implements a subset):** OpenCut-classic's `wasm-compositor.ts:42-183` (`WasmCompositor` class) maintains a `cache = new Map<string, RenderedCacheEntry | ExternalCacheEntry>`:
> - **External textures** (decoded video frames, images) cached by *reference identity* of the source object (`previous.source === texture.source` check at line 103). Hits recorded via `incrementCounter({name: "textureCacheHit"})`.
> - **Rendered textures** (color fills, text, mask shapes, blur backdrops) cached by `contentHash` (line 139). When the hash matches, the upload is skipped and the backing `OffscreenCanvas` is *not even cleared* (comment at line 23-29). Texture IDs no longer referenced are released via `releaseTexture(previousId)` at line 76.
>
> **FreeCut implements a different cache:** `gpu-compositor/gpu-texture-pool.ts:60-216` (`GpuTexturePool`) — a dimension+format-keyed pool of `GPUTexture` objects with `acquire/release` semantics, byte budget (default 384 MB, scaled by `navigator.deviceMemory`), and `trimToBudget` LRU eviction. This is *texture pooling*, not content caching. FreeCut also has a `ScrubbingCache` (referenced at `client-render-engine.ts:755-788`) that caches *entire rendered frames* for scrub-back — Tier 1 GPU texture / Tier 3 RAM ImageBitmap.

When the renderer uploads a source frame to a GPU texture, cache it:

```ts
class LayerTextureCache {
  private cache: Map<string, { texture: GPUTexture, refCount: number }> = new Map();
  
  acquire(mediaId: string, frame: number): GPUTexture {
    const key = `${mediaId}:${frame}`;
    const existing = this.cache.get(key);
    if (existing) {
      existing.refCount++;
      return existing.texture;
    }
    // Decode + upload + cache
    // ...
  }
  
  release(key: string) {
    const existing = this.cache.get(key);
    if (!existing) return;
    existing.refCount--;
    if (existing.refCount <= 0) {
      existing.texture.destroy();
      this.cache.delete(key);
    }
  }
}
```

**Our design is novel.** Neither repo implements reference-counted layer texture caching exactly as designed. OpenCut's `WasmCompositor` cache is closest (id-keyed, no refcounting — textures are released via `syncTextures` set-difference). FreeCut's `GpuTexturePool` is dimension-only pooling, not content-keyed. **We adopt both patterns:** OpenCut-style content-keyed upload cache + FreeCut-style GPU texture pool for the underlying `GPUTexture` objects.

### 10.2 FrameDescriptor cache

> **SCOUT-07 finding (FreeCut implements this):** FreeCut's `runtime/composition-runtime/utils/frame-scene.ts:267-346` (`createFrameCompositionSceneCache`) is a single-slot cache keyed on `(frame, revision, renderPlan, canvas, callbacks)`. Cache hits return the same `FrameCompositionScene` object reference. Invalidation is event-driven via `FrameInvalidationRequest` (lines 322-345) — when a frame/range matches the invalidation request, the cache is cleared.
>
> OpenCut-classic has **no equivalent** — `buildFrameDescriptor` is called fresh on every render in `canvas-renderer.ts:53-74`, with the result passed straight to `wasmCompositor.render(frame)`. OpenCut's caching layer is *only* on the texture-upload side (see §10.1).

For interactive playback, cache the last N `FrameDescriptor`s to avoid recomputing during scrub-back:

```ts
class FrameDescriptorCache {
  private cache: LRUCache<string, FrameDescriptor>;
  
  get(state: SceneState, frame: number): FrameDescriptor | null {
    const key = `${stateHash(state)}:${frame}`;
    return this.cache.get(key);
  }
  
  set(state: SceneState, frame: number, descriptor: FrameDescriptor) {
    const key = `${stateHash(state)}:${frame}`;
    this.cache.set(key, descriptor);
  }
}
```

`stateHash` is a hash of the SceneState — if state changes (e.g., user trims a clip), the cache is invalidated.

**Our LRU `FrameDescriptorCache` is novel** — FreeCut's `createFrameCompositionSceneCache` is single-slot (only last frame), and OpenCut-classic has none at all. The LRU pattern is a greenfield addition.

---

## 11. Open Questions for Sub-Agent Scout — ANSWERED by SCOUT-07

### 11.1 FreeCut `composition-runtime/` directory — ✅ DOCUMENTED

The directory exists at `/tmp/freecut/src/runtime/composition-runtime/`. Layout (high level):

```
composition-runtime/
├── compositions/
│   └── main-composition.tsx               (755 LOC) ← entry point
├── components/                             (~30 files)
│   ├── item.tsx                            (13 LOC, trivial wrapper)
│   ├── item-content.tsx                    (661 LOC, type-dispatch)
│   ├── composition-content.tsx             (637 LOC, sub-comp nesting)
│   ├── video-content.tsx                   (1299 LOC, native <video> + pool)
│   ├── pitch-corrected-audio.tsx           (785 LOC, pitch-preserving audio)
│   ├── custom-decoder-audio.tsx            (516 LOC, AC-3/Vorbis/etc.)
│   ├── text-content.tsx                    (229 LOC, DOM text WYSIWYG)
│   ├── shape-content.tsx                   (410 LOC, SVG/canvas shapes)
│   ├── item-effect-wrapper.tsx             (57 LOC, NO-OP — effects moved to GPU)
│   ├── item-visual-wrapper.tsx
│   ├── stable-video-sequence.tsx
│   ├── subtitle-segment-content.tsx
│   ├── gif-player/, lottie-player/
│   ├── media-offline-placeholder.tsx
│   ├── debug-overlay.tsx
│   └── hooks/                              (per-item visual state, freeze frame, etc.)
├── contexts/                               (keyframes, composition-space, live transforms)
├── utils/
│   ├── scene-assembly.ts                    (596 LOC — resolveCompositionRenderPlan)
│   ├── frame-scene.ts                      (346 LOC — per-frame mask + transition state)
│   ├── transition-scene.ts                 (186 LOC — ActiveTransition + progress)
│   ├── transform-resolver.ts               (154 LOC — fit-to-canvas defaults)
│   ├── mask-info.ts                        (70 LOC — MaskInfo construction)
│   ├── clip-mask-raster.ts                 (181 LOC — rasterize SVG mask)
│   ├── video-scene.ts, video-timing.ts     (sync plans)
│   ├── audio-scene.ts                      (806 LOC — audio segments + crossfades)
│   └── shape-path.ts, text-layout.ts, ...
├── deps/                                   (14 contract files — see §11.4)
├── hooks/                                  (use-transition-participant-sync, use-player-compat)
└── worklets/soundtouch-preview-processor.worklet.ts
```

The **entry point** is `compositions/main-composition.tsx` exporting `<MainComposition>` (lines 209-755), a React functional component that takes `CompositionInputProps` (tracks, transitions, keyframes, backgroundColor, width, height, etc.).

### 11.2 FreeCut `main-composition.tsx` — ✅ DOCUMENTED IN FULL

**File:** `/tmp/freecut/src/runtime/composition-runtime/compositions/main-composition.tsx` (755 LOC)

**Walks SceneState via `resolveCompositionRenderPlan`** (line 251-254):
```ts
const renderPlan = useMemo(
  () => resolveCompositionRenderPlan({ tracks, transitions }),
  [tracks, transitions],
)
```
`renderPlan` (`scene-assembly.ts:90-102`) is a structured projection of the SceneState:
- `trackRenderState` — visible tracks, max order, ordering maps
- `videoItems`, `audioItems`, `stableDomTracks` — partitioned by render substrate
- `visibleShapeMasks`, `visibleAdjustmentLayers`, `visibleTextFontFamilies`
- `transitionClipItems`, `transitionClipMap`, `transitionWindows`

**No explicit FrameDescriptor.** FreeCut does **NOT** build a serializable `FrameDescriptor`. The `<MainComposition>` React tree **is** the descriptor — it renders DOM `<video>`, `<canvas>`, `<img>`, `<svg>`, `<AbsoluteFill>` elements directly via React. The GPU pipeline is invoked from a *separate* code path (the export/headless pipeline at `features/export/utils/canvas-render-orchestrator.ts` + `client-render-engine.ts`), not from `<MainComposition>`.

**Transitions** are handled at two layers:
1. **Composition level** (`main-composition.tsx:282-349`): builds `videoAudioSegments` and `previewTransitionAudioSegments` via `buildTransitionVideoAudioSegments` to ensure audio is decoupled from visual transitions.
2. **Frame level** (`utils/transition-scene.ts:77-114`): `resolveTransitionFrameState` walks `transitionWindows` and returns `ActiveTransition[]` with computed `progress` (line 95), `leftPortion`, `rightPortion`, `cutPoint`. Transitions are not applied to the DOM tree directly — they're consumed by the export pipeline's GPU `TransitionPipeline.render(leftCanvas, rightCanvas, progress, ...)` (`gpu-transitions/transition-pipeline.ts:319-360`).

**Effects** are applied through `<ItemEffectWrapper>` (`components/item-effect-wrapper.tsx:1-57`), but as of the current code that wrapper is **a no-op**:
```ts
// item-effect-wrapper.tsx:28-44
const ItemEffectWrapperInternal = React.memo<ItemEffectWrapperInternalProps>(({ children }) => {
  return <div style={{...}}>{children}</div>  // ← passes through
})
```
The comment at line 27-31 is explicit: *"Legacy CSS effect rendering removed — all adjustment layer effects now render via GPU pipeline in client-render-engine (canvas-effects.ts)."* The actual effect rendering happens in `applyAllEffects` (`canvas-effects.ts:236-281`) which calls `pipeline.applyEffectsToCanvas(...)` (FreeCut's `EffectsPipeline`, see §11.5 below).

**Masks** are handled via `<ActiveMasksProvider>` (`main-composition.tsx:80-156`) — a React context that re-resolves `resolveActiveShapeMasksAtFrame` on every clock frame (via `useClockFrameSelector`). The masks are passed down to `<MaskedItem>` → `<Item>` → `<ItemContent>` → `<ItemVisualWrapper>` where they're applied via SVG `<mask>` elements (DOM rendering). For GPU rendering, masks are rasterized CPU-side by `clip-mask-raster.ts` (181 LOC) and uploaded as textures.

### 11.3 FreeCut per-type content components — ✅ DOCUMENTED

**`video-content.tsx`** (1299 LOC) — React component using **native HTML5 `<video>` + `VideoSourcePool`** (pooled video elements, shared across split clips from same source). Uses `requestVideoFrameCallback` (line 74-77) for per-frame sync. Falls back to live turbores decode for ProRes/undecodable codecs (`shouldUseLiveDecodeForMedia`, line 56-69). Audio is handled separately via `PitchCorrectedAudio`/`CustomDecoderAudio`.

**`audio-playback-props.ts`** (40 LOC) — Pure type module. Exports `AudioPlaybackProps` interface consumed by both `<PitchCorrectedAudio>` and `<CustomDecoderAudio>`.

**`pitch-corrected-audio.tsx`** (785 LOC) — Pitch-preserving audio playback using SoundTouch AudioWorklet (`soundtouch-preview-worklet.ts`). Handles varispeed playback, reverse shuttle, EQ stages, fades (in/out, crossfade), and clip-level volume.

**`custom-decoder-audio.tsx`** (516 LOC) — Decodes audio through `mediabunny` for codecs the browser can't natively handle (AC-3/E-AC-3, Vorbis, PCM). Routes through `audio-decode-worker.ts` + `audio-decode-cache.ts`.

**`text-content.tsx`** (229 LOC) — DOM-native text rendering via styled `<div>` + `<span>` blocks. Uses `resolveAnimatedTextItem` for keyframe animation. Inline vs stacked span layout (line 157-228). The shared `resolveTextStyle`/`resolveSpanStyles` resolvers are used by **all** render paths (DOM preview, canvas renderer, GPU pipeline) for WYSIWYG parity (line 26-32 comment).

**`shape-content.tsx`** (410 LOC) — SVG shape rendering via `Rect`, `Circle`, `Triangle`, `Ellipse`, `Star`, `Polygon`, `Heart`, `ShapePath` primitives. Supports linear gradients, stroke with taper, path trimming, path closure. Reads live gizmo preview overrides via `useItemGizmoPreview`.

**`item-content.tsx`** (661 LOC) — Type-dispatch dispatcher (lines 220-657). Cases: `controller` (null), `video`, `audio` (with compound composition recursion), `image` (animated GIF/WebP via `GifPlayer`), `lottie`, `text`, `shape`, `composition` (recursive via `renderCompositionContent`), `adjustment` (no-op), `subtitle`.

### 11.4 FreeCut `composition-runtime/deps/` — ✅ DOCUMENTED

14 files, 112 LOC total. Already documented in `01-core-engine.refined.md` §10.4. Summary:

| File | LOC | Purpose |
|---|---|---|
| `player-contract.ts` | 22 | Adapter exports: `AbsoluteFill`, `Sequence`, `useClock`, `useClockFrameSelector`, `useVideoSourcePool`, etc. (re-exported from `@/runtime/player/...`) |
| `player.ts` | 5 | Re-export shim |
| `timeline-contract.ts` | 6 | `timelineToSourceFrames`, `mapSourceWindowOverlap`, `sourceToTimelineFrames`, `isValidSeekPosition`, `isWithinSourceBounds`, `getSafeTrimBefore`, `DEFAULT_SPEED` |
| `timeline.ts` | 5 | Re-export shim |
| `stores-contract.ts` | 15 | `useTimelineStore`, `useGizmoStore`, `useDebugStore`, `useMediaLibraryStore`, `useCompositionsStore`, `usePlaybackStore` adapter exports |
| `stores.ts` | 5 | Re-export shim |
| `keyframes-contract.ts` | 18 | `resolveAnimatedTransform`, `hasKeyframeAnimation`, `resolveAnimatedTextItem`, `applyMotionAnimationLayers`, `applyMotionModifiers`, `LinkedPropertyEvaluationContext` |
| `keyframes.ts` | 5 | Re-export shim |
| `media-library-contract.ts` | 6 | `resolveProxyUrl` |
| `media-library.ts` | 4 | Re-export shim |
| `media-library-opfs-contract.ts` | 5 | OPFS file handle accessors |
| `media-library-opfs.ts` | 5 | Re-export shim |
| `media-library-store-contract.ts` | 6 | `useMediaLibraryStore` selector |
| `media-library-store.ts` | 5 | Re-export shim |

The pattern is consistent: a `*-contract.ts` file declares the surface (re-exporting from outside `composition-runtime/`), and a same-name file without `-contract` is a trivial shim. This lets the composition-runtime be tested against mock contracts.

### 11.5 FreeCut `gpu-compositor/compositor-pipeline.ts` — ✅ DOCUMENTED IN FULL

**File:** `/tmp/freecut/src/infrastructure/gpu-compositor/compositor-pipeline.ts` (610 LOC)

**Layer compositing** via `CompositorPipeline.compositeToTexture(layers, w, h, commandEncoder)` (line 439-538):
- Ping-pong textures: `pingTexture` / `pongTexture` (rgba8unorm, line 397-408). Swapped after each layer (line 528-534).
- Clear pass first (lines 459-469) — clears `pingView` to transparent black.
- For each layer:
  - Get/create per-layer uniform buffer (line 415-425, indexed by `layerIndex`).
  - Pack `CompositeLayerParams` into a 64-byte uniform buffer (16 floats, line 253-273): opacity, blendMode (u32 stored as float bits), posX, posY, scaleX, scaleY, rotationZ, sourceAspect, outputAspect, time, hasMask, maskInvert, rotationX, rotationY, perspective, maskFeather.
  - Pick `regularPipeline` (texture_2d layer) vs `externalPipeline` (texture_external layer, zero-copy video via `importExternalTexture`) based on whether `layer.externalTexture` is present (line 484-509).
  - One draw call per layer: `pass.draw(6)` (fullscreen quad, line 525).

**Three pipelines** (line 307-389):
1. `regularPipeline` — for `GPUTextureView` layers (images, pre-rendered canvases). Output format `rgba8unorm`.
2. `externalPipeline` — for `GPUExternalTexture` layers (zero-copy video). Same output format.
3. `blitPipeline` — copies final composite to canvas, converting straight → premultiplied alpha (line 32-36).

**Bind group construction (NOT cached in FreeCut):** `device.createBindGroup` is called *per layer per frame* (lines 487-509). The seed spec correctly notes "we'll cache, FreeCut doesn't" — our rebuild should add a bind-group cache keyed on `(layerIndex, viewKey)`.

**Texture pool integration:** FreeCut's `CompositorPipeline` uses its own `pingTexture`/`pongTexture` (not the shared `GpuTexturePool`). The shared pool (`gpu-texture-pool.ts`) is used elsewhere (effects pipeline, masks). Our rebuild should consolidate.

**Blit to canvas** (`compositeToCanvas`, line 540-579): Caches `blitBindGroupPing` / `blitBindGroupPong` lazily (lines 554-569). Uses `drawFullscreenCanvasPass` to present to the canvas context.

### 11.6 FreeCut `gpu-effects/effects-pipeline.ts` — ✅ DOCUMENTED IN FULL

**File:** `/tmp/freecut/src/infrastructure/gpu-effects/effects-pipeline.ts` (1132 LOC)

**Effect chain execution** (`runEffectChain`, line 477-596):
- Iterates `GpuEffectInstance[]`.
- Per effect: calls `definition.packUniforms(params, w, h)` → `getOrCreateUniformBuffer(effectIndex, byteLength)` (pooled, line 464-475).
- Each effect's `EffectPass` is either a fragment render pass (default) or a compute dispatch (if `definition.compute` is set, line 510-543).
- Bind groups cached by `"${effectIndex}:${effect.type}:${viewKey}"` (line 556), invalidated on texture size change.
- Ping-pong textures swap after each effect (line 587-592).

**Effect uniform packing:** Each `GpuEffectDefinition` declares `uniformSize` (must be multiple of 16) and `packUniforms: (params, w, h) → Float32Array | null` (`types.ts:65-69`). The pipeline writes the packed bytes via `device.queue.writeBuffer(uniformBuffer, 0, uniformData.buffer)` (line 499).

**3D LUT upload path:** `EffectDataTextureSpec` (`types.ts:31-37`) declares `dimension: '2d' | '3d'`, `key(params): string`, and `build(params): EffectDataTexturePayload` (rgba8 texels). The pipeline caches data textures in `dataTextureCache = new Map<string, DataTextureCacheEntry>()` (line 127). Cache key: `${passIndex}:${effect.type}` (line 396). The texture is recreated only when dimensions change; contents are rewritten in place when only the data key changes (`acquireDataTextureEntry`, line 422-462).

**Storage texture usage:** Compute-variant effects write to `texture_storage_2d<rgba8unorm, write>` (binding 1, line 326). `pingTexture` / `pongTexture` are created with `STORAGE_BINDING` usage (line 366) to support this. Effect output is the opposite ping/pong texture, so no read-after-write hazard within a pass.

**Five render entry points** (lines 673-1086):
1. `applyEffectsToCanvas(source, effects) → OffscreenCanvas` (line 673) — non-batch, single output canvas.
2. `applyEffectsToTexture(source, effects, outputTexture)` (line 764) — caller-owned output, GPU-native.
3. `applyTextureEffectsToTexture(sourceTexture, ...)` (line 810) — input is already a GPUTexture.
4. `applyEffectsToVideo(video, effects, destRect, w, h)` (line 870) — zero-copy video via `importExternalTexture`, returns OffscreenCanvas.
5. `applyEffectsToVideoTexture(video, effects, destRect, w, h, outputTexture)` (line 1008) — zero-copy video, caller-owned output.

**Pooled output mode** (`beginBatch`/`endBatch`, line 616-627): Per-item output canvases are pre-allocated in `outputPool` (line 138). Each `applyEffectsToCanvas` call gets its own output, submits immediately, and the GPU pipelines work across items. First `drawImage` stalls for all preceding GPU work.

### 11.7 FreeCut `gpu-transitions/transition-pipeline.ts` — ✅ DOCUMENTED IN FULL

See §6.3 above. 21 transition types registered. Single-pass render. Three entry points (`render`, `renderToTexture`, `renderTexturesToTexture`). Bind groups cached by transition ID + ping/pong view identity (line 25-26 `cachedBindGroups = new Map<string, GPUBindGroup>()`).

### 11.8 FreeCut `gpu-masks/` — ✅ DOCUMENTED

**Directory contents** (`/tmp/freecut/src/infrastructure/gpu-masks/`):
- `mask-combine-pipeline.ts` (114 LOC) — `MaskCombinePipeline.combine(baseMask, nextMask, outputTexture, options)` — multiplies two mask textures, optional inversion of each.
- `mask-texture-manager.ts` (34 LOC) — `MaskTextureManager.getFallbackView()` — a 1×1 white texture for "no mask = fully visible".
- `index.ts` (2 LOC) — re-exports.
- `mask-combine-pipeline.test.ts` (80 LOC) — unit tests for `MaskCombinePipeline`.

**Mask texture management:** FreeCut does **not** have a full GPU mask rasterization pipeline. Shape masks are rasterized CPU-side (`utils/clip-mask-raster.ts`, 181 LOC) and uploaded via `MaskTextureManager`. Mask combining for multiple masks uses `MaskCombinePipeline`'s `alpha = a * b` multiply.

**JFA feathering:** FreeCut does **not** implement JFA. Mask feather is applied *inside* the compositor shader via the `maskFeather` uniform (`compositor-pipeline.ts:58`, accessed in `transformUV`/`compositeFragment` at lines 113-147). The actual feather math appears to be deferred to a separate mask-texture preparation step that is not in the `gpu-masks/` directory.

**We adopt OpenCut-classic's JFA instead** (see §8.4).

### 11.9 OpenCut-classic `rust/crates/compositor/src/` — ✅ DOCUMENTED IN FULL

**No `layer.rs` file exists.** The seed spec's reference to `layer.rs` was a guess. The actual layout is:
- `lib.rs` (12 LOC) — module declarations + re-exports.
- `frame.rs` (83 LOC) — `FrameDescriptor`, `FrameItemDescriptor`, `LayerDescriptor`, `QuadTransformDescriptor`, `LayerMaskDescriptor`, `EffectPassDescriptor`, `EffectUniformValueDescriptor`, `CanvasClearDescriptor`, `CanvasTextureDescriptor`. See §14 for the full quote.
- `compositor.rs` (870 LOC) — `Compositor` struct, `LayerUniformBuffer` (line 50-61), `BlendUniformBuffer` (line 63-68), `MaskUniformBuffer` (line 70-75). Main render loop `render_frame` (line 344-405) and `render_frame_to_texture` (line 293-342).
- `blend_mode.rs` (47 LOC) — `BlendMode` enum with 17 variants and `shader_code()` → u32.
- `texture_pool.rs` (36 LOC) — `TexturePool` with `recycle_frame` / `acquire` (dimension-keyed, no LRU).
- `texture_store.rs` (36 LOC) — `TextureStore` (id → texture HashMap).
- `shaders/layer.wgsl` (50 LOC), `shaders/blend.wgsl` (142 LOC), `shaders/mask.wgsl` (25 LOC).

**Main render loop** (`render_frame`, compositor.rs:344-405):
1. `texture_pool.recycle_frame()` — return all in-use textures to the available pool.
2. Acquire surface texture.
3. Create cleared scene texture (`create_cleared_texture`, line 511-547) — ping-pong root.
4. For each `FrameItemDescriptor`:
   - `Layer(layer)` → `render_layer` (line 407-483): get source texture from `TextureStore`, render with `layer_pipeline` + `LayerUniformBuffer`, apply effect groups (line 433-442), apply mask if present (line 444-480).
   - `SceneEffect { effect_pass_groups }` → `apply_effect_groups` (line 485-510): iterate groups, call `effects.apply_with_encoder`.
   - After each layer: `blend_texture` (line 743-838) — `blend_pipeline` + `BlendUniformBuffer`.
5. Blit final scene texture to surface view (line 396-401).
6. Submit + present.

**LayerUniformBuffer** (compositor.rs:50-61):
```rust
#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
struct LayerUniformBuffer {
    resolution: [f32; 2],
    center: [f32; 2],
    size: [f32; 2],
    rotation_radians: f32,
    opacity: f32,
    flip_x: f32,
    flip_y: f32,
    _padding: [f32; 2], // WebGL requires uniform buffer sizes to be multiples of 16 bytes (40 → 48)
}
```
48 bytes (with padding). Consumed by `shaders/layer.wgsl:6-15`.

### 11.10 OpenCut-classic `apps/web/src/services/renderer/` — ✅ DOCUMENTED IN FULL

| File | LOC | Purpose |
|---|---|---|
| `gpu-renderer.ts` | 90 | Thin TS adapter around `opencut-wasm`: `applyEffectPasses`, `applyMaskFeather`. Lazy `initializeGpu()` |
| `canvas-renderer.ts` | 105 | `CanvasRenderer.render({node, time})` — orchestrates: `resolveRenderTree(node)` → `buildFrameDescriptor(node, renderer)` → `wasmCompositor.syncTextures(textures)` → `wasmCompositor.render(frame)`. See §15 for full flow |
| `scene-builder.ts` | 273 | `buildScene({canvasSize, tracks, mediaAssets, ...}) → RootNode`. Walks SceneTracks and constructs render node tree. See §11.11 below |
| `compositor/wasm-compositor.ts` | 227 | `WasmCompositor` singleton (id-keyed texture upload cache). Calls `opencut-wasm` `initCompositor` / `uploadTexture` / `renderFrame` / `releaseTexture` |
| `compositor/frame-descriptor.ts` | 581 | `buildFrameDescriptor({node, renderer})` — walks render node tree, materializes `FrameItemDescriptor[]` + `TextureUploadDescriptor[]`. **See §15 for walkthrough** |
| `compositor/types.ts` | 78 | TS mirror of Rust `frame.rs` types |
| `resolve.ts` | 479 | `resolveRenderTree({node, renderer, time})` — per-node-type resolvers. Resolves transforms, opacities, effect passes, measured text, mask shapes |
| `canvas-utils.ts` | 17 | `createCanvasSurface({width, height})` factory |
| `scene-exporter.ts` | 171 | Exporter (codec/container negotiation, output target) |
| `mask-feather.ts` | 20 | Thin TS adapter calling `applyMaskFeatherWasm` |
| `effect-preview.ts` | 151 | Effect thumbnail/preview renderer |

### 11.11 OpenCut-classic `apps/web/src/services/renderer/nodes/` — ✅ DOCUMENTED IN FULL

**11 node files, 409 LOC total.** See §16 for the full inventory table.

Pattern: a `BaseNode<Params, Resolved>` class (`base-node.ts:4-26`) with `params`, `resolved: Resolved | null`, and `children: AnyBaseNode[]`. `VisualNode` (`visual-node.ts:34-37`) extends with transform/opacity/effects/masks. Concrete nodes extend `VisualNode` or `BaseNode` directly. Resolution happens in `resolve.ts:71-97` via `instanceof` dispatch — each resolver returns `null` when the node is inactive at the current time (the active-element filter is implicit).

**Build flow** (`scene-builder.ts:226-273`):
1. Construct `RootNode({duration})`.
2. Build `mediaMap = new Map(mediaAssets.map((m) => [m.id, m]))`.
3. Filter visible tracks: `overlay.filter(!hidden) + (!main.hidden ? [main] : [])`.
4. `.reverse()` for bottom-to-top order (overlay-2 first, then overlay-1, then main).
5. For each track, walk elements:
   - `element.type === 'effect'` → `EffectLayerNode`
   - `element.type === 'video' && mediaAsset.type === 'video'` → `VideoNode`
   - `element.type === 'image' && mediaAsset.type === 'image'` → `ImageNode`
   - `element.type === 'text'` → `TextNode`
   - `element.type === 'sticker'` → `StickerNode`
   - `element.type === 'graphic'` → `GraphicNode`
6. If `background.type === 'blur'`, build `BlurBackgroundNode[]` from main track and prepend to root.
7. If `background.type === 'color' && color !== 'transparent'`, prepend `ColorNode`.
8. Append all track nodes to root.

**Traversal flow** (`resolve.ts:71-97` + `frame-descriptor.ts:67-206`):
- `resolveRenderTree` recurses depth-first, calling type-specific resolvers via `instanceof` dispatch.
- After resolving a node, `await Promise.all(node.children.map(resolveNode))` recurses children.
- `buildFrameDescriptor` then walks the resolved tree, calling `collectNode` recursively. Per node type:
  - `RootNode` → iterate children.
  - `ColorNode` → emit `layer` FrameItem with a `rendered` texture that fills canvas.
  - `EffectLayerNode` → emit `sceneEffect` FrameItem.
  - `BlurBackgroundNode` → emit `layer` FrameItem with backdrop draw + blur passes.
  - `VideoNode | ImageNode | StickerNode | GraphicNode` → `collectVisualSourceNode` — emit `layer` with external texture + computed transform + mask artifacts + optional stroke layer.
  - `TextNode` → `collectTextNode` — emit `layer` with rendered text texture.

### 11.12 FreeCut transitions — ✅ DOCUMENTED (see §6.3 above)

21 transition types in the registry. No Canvas 2D fallback. All transitions are single-pass WGSL shaders.

---

## 12. Test Plan for This Stream

1. **FrameDescriptor purity test:** Same `(state, frame)` → identical `FrameDescriptor` (deep equal).

2. **Layer ordering test:** Build a scene with 5 layers (main + 2 overlays + 2 audio). Assert video layers composite in correct order (main first, then overlays bottom-up).

3. **Active element test:** At time T, only elements whose `[startTime, startTime+duration)` includes T are in the descriptor.

4. **Transition test:** Create a 1-second crossfade between two clips. Assert:
   - At t=0: only clip A active, opacity 1.0
   - At t=0.5: both clips active, opacity 0.5 each
   - At t=1.0: only clip B active, opacity 1.0

5. **Effect ordering test:** Apply blur + color wheels + LUT to a layer. Assert the EffectPass order is `[color-wheels, lut, gaussian-blur-h, gaussian-blur-v]` (color first, then spatial).

6. **Mask test:** Apply a rectangular mask with 10px feather. Assert mask texture is generated with correct SDF.

7. **Multi-track blend test:** Two video tracks, track A = red fill, track B = green fill at 50% opacity. Composite at frame 0. Assert center pixel is `rgb(127, 127, 0)` (50/50 blend in linear-light).

8. **Cache test:** Build descriptor for frame 100. Build again for frame 100 with same state. Assert same object reference (cache hit).

9. **State-change invalidation:** Build descriptor for frame 100. Modify state (trim a clip). Build again. Assert cache miss (different state hash).

---

## 12.A Code References (SCOUT-07)

### FreeCut (`/tmp/freecut/src/`)

| Concern | File:lines | Notes |
|---|---|---|
| Composition entry point | `runtime/composition-runtime/compositions/main-composition.tsx:209-755` | `<MainComposition>` React FC; takes `CompositionInputProps` |
| Render plan projection | `runtime/composition-runtime/utils/scene-assembly.ts:159-188` | `resolveCompositionRenderPlan({tracks, transitions}) → CompositionRenderPlan` |
| Track render state | `runtime/composition-runtime/utils/scene-assembly.ts:126-157` | `resolveTrackRenderState(tracks)` — visibleTracks, maxOrder, ordering maps |
| Per-frame mask resolution | `runtime/composition-runtime/utils/frame-scene.ts:164-208` | `resolveActiveShapeMasksAtFrame` + caching at `:267-346` |
| Per-frame transition state | `runtime/composition-runtime/utils/transition-scene.ts:77-114` | `resolveTransitionFrameState` → `ActiveTransition[]` with `progress` |
| Frame scene cache | `runtime/composition-runtime/utils/frame-scene.ts:273-346` | `createFrameCompositionSceneCache` — single-slot cache keyed on (frame, renderPlan, canvas, callbacks) |
| Transform resolution | `runtime/composition-runtime/utils/transform-resolver.ts:42-79` | `resolveTransform` (fit-to-canvas default) |
| Per-type dispatcher | `runtime/composition-runtime/components/item-content.tsx:158-661` | `ItemContent` switch by `item.type` |
| Video content | `runtime/composition-runtime/components/video-content.tsx:1128-1299` | `<VideoContent>` — native `<video>` + `VideoSourcePool` |
| Audio content (pitch) | `runtime/composition-runtime/components/pitch-corrected-audio.tsx:1-785` | `<PitchCorrectedAudio>` — SoundTouch AudioWorklet |
| Audio content (custom) | `runtime/composition-runtime/components/custom-decoder-audio.tsx:1-516` | `<CustomDecoderAudio>` — mediabunny |
| Text content | `runtime/composition-runtime/components/text-content.tsx:34-229` | `<TextContent>` — DOM text + WYSIWYG parity resolvers |
| Shape content | `runtime/composition-runtime/components/shape-content.tsx:37-410` | `<ShapeContent>` — SVG primitives |
| Composition (sub-comp) | `runtime/composition-runtime/components/composition-content.tsx:183-637` | `<CompositionContent>` — sub-comp nesting via `VideoConfigProvider` |
| Item effect wrapper (NO-OP) | `runtime/composition-runtime/components/item-effect-wrapper.tsx:27-44` | Pass-through; effects moved to GPU pipeline |
| GPU compositor pipeline | `infrastructure/gpu-compositor/compositor-pipeline.ts:1-610` | `CompositorPipeline` — 3 pipelines (regular/external/blit), ping-pong, per-layer uniforms |
| GPU texture pool | `infrastructure/gpu-compositor/gpu-texture-pool.ts:60-216` | `GpuTexturePool` — dimension+format-keyed, byte budget, LRU trim |
| GPU effects pipeline | `infrastructure/gpu-effects/effects-pipeline.ts:1-1132` | `EffectsPipeline` — 5 render entry points, batch/pool mode, data texture cache |
| GPU effect registry | `infrastructure/gpu-effects/registry.ts:1-82` | `GPU_EFFECT_REGISTRY` Map; categories: color/blur/distort/stylize/keying |
| GPU effect types | `infrastructure/gpu-effects/types.ts:1-83` | `GpuEffectDefinition`, `GpuEffectInstance`, `EffectDataTextureSpec`, `GpuEffectComputeSpec` |
| 3D LUT effect | `infrastructure/gpu-effects/effects/lut.ts:1-85` | `lut3d` — `texture_3d<f32>` at binding 3, trilinear sample |
| GPU transition pipeline | `infrastructure/gpu-transitions/transition-pipeline.ts:1-500` | `TransitionPipeline` — single-pass render, 3 entry points |
| GPU transition registry | `infrastructure/gpu-transitions/registry.ts:1-61` | 21 transitions registered |
| GPU transition types | `infrastructure/gpu-transitions/types.ts:1-21` | `GpuTransitionDefinition` |
| GPU mask combine | `infrastructure/gpu-masks/mask-combine-pipeline.ts:1-114` | `MaskCombinePipeline.combine(base, next, output, options)` |
| GPU mask texture manager | `infrastructure/gpu-masks/mask-texture-manager.ts:1-34` | `MaskTextureManager.getFallbackView()` — 1×1 white |
| Headless render harness | `headless/main.ts:39-43, 668-671` | Imports `renderComposition` from `features/export/utils/canvas-render-orchestrator`; same code path as in-app export |
| Export orchestrator | `features/export/utils/canvas-render-orchestrator.ts:447-558` | `renderComposition` — main video export (declaration at line 447) |
| Client render engine | `features/export/utils/client-render-engine.ts:660-720, 1981-2080` | `createCompositionRenderer` + `renderFrame(frame)` |
| Canvas effects helper | `features/export/utils/canvas-effects.ts:236-281` | `applyAllEffects` — calls `pipeline.applyEffectsToCanvas` |

### OpenCut-classic (`/tmp/opencut-classic/`)

| Concern | File:lines | Notes |
|---|---|---|
| FrameDescriptor (Rust) | `rust/crates/compositor/src/frame.rs:1-83` | **See §14 for full quote** |
| Compositor main loop | `rust/crates/compositor/src/compositor.rs:293-405` | `render_frame_to_texture` + `render_frame` |
| LayerUniformBuffer | `rust/crates/compositor/src/compositor.rs:50-61` | 48 bytes, repr(C), Pod |
| BlendUniformBuffer | `rust/crates/compositor/src/compositor.rs:63-68` | 16 bytes (u32 blend_mode + 3 u32 padding) |
| MaskUniformBuffer | `rust/crates/compositor/src/compositor.rs:70-75` | 16 bytes (inverted + 3 padding) |
| Layer render pass | `rust/crates/compositor/src/compositor.rs:564-643` | `render_source_to_texture` |
| Mask application | `rust/crates/compositor/src/compositor.rs:645-741` | `apply_mask` |
| Blend pass | `rust/crates/compositor/src/compositor.rs:743-838` | `blend_texture` |
| Effect groups | `rust/crates/compositor/src/compositor.rs:485-510` | `apply_effect_groups` |
| BlendMode enum | `rust/crates/compositor/src/blend_mode.rs:1-47` | 17 variants, kebab-case serde, `shader_code()` → u32 |
| TexturePool | `rust/crates/compositor/src/texture_pool.rs:1-36` | Dimension-keyed, `recycle_frame` on each render |
| TextureStore | `rust/crates/compositor/src/texture_store.rs:1-36` | Id → texture HashMap |
| Layer shader | `rust/crates/compositor/src/shaders/layer.wgsl:1-50` | Quad transform + flip + opacity |
| Blend shader | `rust/crates/compositor/src/shaders/blend.wgsl:1-142` | 17 blend modes via switch on u32 |
| Mask shader | `rust/crates/compositor/src/shaders/mask.wgsl:1-25` | Layer × mask alpha, optional inversion |
| Mask feather (JFA) | `rust/crates/masks/src/feather.rs:1-285` | `MaskFeatherPipeline` — uses `SdfPipeline` + `jfa_distance.wgsl` |
| SDF pipeline (JFA init+step) | `rust/crates/masks/src/sdf.rs:1-332` | `SdfPipeline.compute_signed_distance_field_with_encoder` |
| JFA init shader | `rust/crates/masks/src/shaders/jfa_init.wgsl` | Seeds inside/outside |
| JFA step shader | `rust/crates/masks/src/shaders/jfa_step.wgsl` | Jump-flooding propagation |
| JFA distance shader | `rust/crates/masks/src/shaders/jfa_distance.wgsl` | Final SDF combine + smoothstep |
| EffectPipeline (Rust) | `rust/crates/effects/src/pipeline.rs:1-330` | `apply_with_encoder` — single `gaussian-blur` shader, no data textures |
| EffectPass (Rust) | `rust/crates/effects/src/types.rs:1-13` | `{shader, uniforms: HashMap<String, UniformValue>}` |
| GPU renderer adapter (TS) | `apps/web/src/services/renderer/gpu-renderer.ts:1-90` | Wraps `opencut-wasm`: `applyEffectPasses`, `applyMaskFeather` |
| Canvas renderer (TS) | `apps/web/src/services/renderer/canvas-renderer.ts:1-105` | `CanvasRenderer.render({node, time})` — orchestrates resolve → build → sync → render |
| Scene builder (TS) | `apps/web/src/services/renderer/scene-builder.ts:226-273` | `buildScene` — walks `SceneTracks` → `RootNode` |
| Frame descriptor builder (TS) | `apps/web/src/services/renderer/compositor/frame-descriptor.ts:30-65` | `buildFrameDescriptor({node, renderer})` — tree walk |
| Wasm compositor adapter | `apps/web/src/services/renderer/compositor/wasm-compositor.ts:42-183` | `WasmCompositor` — texture upload cache (id + contentHash keyed) |
| Compositor types (TS) | `apps/web/src/services/renderer/compositor/types.ts:1-78` | TS mirror of Rust `frame.rs` |
| Render tree resolver | `apps/web/src/services/renderer/resolve.ts:53-97` | `resolveRenderTree` — per-type resolvers via `instanceof` dispatch |
| Visual state resolver | `apps/web/src/services/renderer/resolve.ts:131-185` | `resolveVisualState` — clipTime range check, transform/opacity/effects resolve |
| Render nodes — base | `apps/web/src/services/renderer/nodes/base-node.ts:1-26` | `BaseNode<Params, Resolved>` |
| Render nodes — visual | `apps/web/src/services/renderer/nodes/visual-node.ts:1-37` | `VisualNode` abstract — adds transform/opacity/effects/masks |
| Render nodes — root | `apps/web/src/services/renderer/nodes/root-node.ts:1-11` | `RootNode({duration})` |
| Render nodes — video | `apps/web/src/services/renderer/nodes/video-node.ts:1-16` | `VideoNode extends VisualNode` |
| Render nodes — image | `apps/web/src/services/renderer/nodes/image-node.ts:1-74` | `ImageNode` + `loadImageSource` (URL→OffscreenCanvas, max-size clamp) |
| Render nodes — text | `apps/web/src/services/renderer/nodes/text-node.ts:1-61` | `TextNode` + `renderTextToContext` |
| Render nodes — graphic | `apps/web/src/services/renderer/nodes/graphic-node.ts:1-67` | `GraphicNode` with per-instance source canvas cache (JSON-keyed) |
| Render nodes — sticker | `apps/web/src/services/renderer/nodes/sticker-node.ts:1-59` | `StickerNode` + `loadStickerSource` |
| Render nodes — effect layer | `apps/web/src/services/renderer/nodes/effect-layer-node.ts:1-19` | `EffectLayerNode` — scene-wide effect pass |
| Render nodes — blur bg | `apps/web/src/services/renderer/nodes/blur-background-node.ts:1-32` | `BlurBackgroundNode` — backdrop source + blur passes |
| Render nodes — color | `apps/web/src/services/renderer/nodes/color-node.ts:1-7` | `ColorNode({color})` |

### 12.A.1 Code References — nle-engine (reference, NOT canon)

> The private **nle-engine** repo (github.com/bearachprema/nle-engine, 37,958 LOC, 124 tests) is a clean-room FreeCut-port **in-between reference, NOT canon**. It de-risks implementation but inherits FreeCut patterns this spec corrects (8-bit sRGB pipeline, JSON-RPC+$ref headless protocol, class-based API, procedural media, single-tier tests, zero workers). Where engine and spec conflict, **the spec wins**; deltas are documented, not adopted. Full reconciliation: `19-code-references.md`.

| Spec section | nle-engine file:line | verified quote | status | note |
|---|---|---|---|---|
| §5.1 static plan + per-frame split | `src/lib/nle/playback/scene-assembly.ts:16` | `1. CompositionRenderPlan — STATIC per timeline snapshot.` | ALIGNED | Exactly §11.1's FreeCut finding |
| §5.5 occlusion cutoff | `src/lib/nle/playback/scene-assembly.ts:1243` | `Occlusion cutoff — scan tracks bottom-up (asc by order), find first` | ALIGNED | Engine ahead of pre-amendment spec; adopted §5.5 |
| §5.2 layer ordering | `src/lib/nle/playback/scene-assembly.ts:1263` | `Build render tasks — top to bottom (desc by order).` | ALIGNED | DESC walk + player reversal |
| §4 FrameDescriptor purity | `src/lib/nle/playback/player.ts:949` | `private _buildLayers(frame: number, _offscreen: boolean): {` | ENGINE-GAP | Imperative layer build; no serializable descriptor — SPEC-ONLY |
| §12.2 type-agnostic items | `src/lib/nle/playback/player.ts:1038` | `if (clip.type !== 'video') continue;` | CORRECTIVE | Non-video clips dropped; spec wins |
| §6.1A structural/presentation split | `src/lib/nle/core/types.ts:260` | `export type TransitionType = 'crossfade';` | ALIGNED | Split matches the Round-7 amendment |
| §6.1A presentation registry | `src/lib/nle/transitions/registry.ts:2249` | `const BUILTIN_PRESENTATIONS: TransitionPresentationDefinition[] = [` | ALIGNED | 27 presentations ≥ spec §6.3's list |
| §6.1A cut-centered planner | `src/lib/nle/transitions/planner.ts:21` | `leftPortion  = floor(D * alignment)   — frames BEFORE the cut` | ALIGNED | Amendment B adopts this math |
| §6.1A handle clamping | `src/lib/nle/transitions/handle-utils.ts:302` | `export function getMaxTransitionDurationForHandles(` | ALIGNED | Amendment B adopts |
| §6.3 transition pipeline | `src/lib/nle/transitions/pipeline.ts:89` | `export class TransitionPipeline {` | ALIGNED | Single-pass + bind-group caching |
| §7.3 effect chain | `src/lib/nle/effects/pipeline.ts:5041` | `const tempTex = inputTex;` | ALIGNED | Identical ping-pong swap loop |
| §7.3 texture ownership | `src/lib/nle/effects/pipeline.ts:5107` | `return this._pongTexture;` | CORRECTIVE | Singleton return (engine P0.1); spec's per-layer outputs win |
| §8.3 multi-mask chaining | `src/lib/nle/gpu/mask-manager.ts:477` | `this._combinePipeline.combine(inputTexture, maskTexture, outputTexture, {` | ALIGNED | Sequential chaining matches |
| §8.3 mask texture ownership | `src/lib/nle/gpu/mask-manager.ts:468` | `const maskTexture = this._textureManager.getMaskTexture(mask, canvasW, canvasH);` | CORRECTIVE | Shared persistent textures (engine P0.2); spec wins |
| §4 BlendMode contract | `src/lib/nle/gpu/compositor.ts:32` | `export const BLEND_MODE_INDEX: Record<BlendMode, number> = {` | CORRECTIVE | 25 FreeCut modes, no `plus-lighter`; map `plus-lighter ≡ linear-dodge` when porting |
| §10.1 texture pool | `src/lib/nle/gpu/texture-pool.ts:5` | `Textures are keyed by \`{width}x{height}x{format}\` and recycled via` | ALIGNED | Ported but dead code; this spec's cache design is the consumer |
| §5.4 transform resolution | `src/lib/nle/playback/transform-resolver.ts:59` | `1. resolveTransform             — base fit-to-canvas + explicit override` | ALIGNED | 5-step pipeline ported (corner-pin unwired — engine P1.8) |

---

## 13. Corrections to Seed Spec

### 13.1 Algorithm shape: tree-walk, not flat-map (§5.1, §5.3, §5.4)

**Seed spec claimed:** Flat `findActiveElements(state, time)` → `orderLayers(...)` → `orderedLayers.map(buildLayerDescriptor)` flow.

**Actual (OpenCut-classic):** Two-phase tree-walk:
1. `scene-builder.ts:226-273` builds a `RootNode` tree *once* (per state change), where each track element becomes a typed node.
2. `frame-descriptor.ts:30-65` `buildFrameDescriptor({node, renderer})` walks the resolved tree, *recursively* calling `collectNode` which dispatches by `instanceof` to per-type collectors (`collectVisualSourceNode`, `collectTextNode`).

Active-element filtering is **implicit**: `resolveVisualState` (`resolve.ts:131-185`) returns `null` when `clipTime < 0 || clipTime >= params.duration`, and `collectNode` skips null-resolved nodes.

**Correction:** Our rebuild should adopt the tree-walk pattern, not the flat-map. It's more extensible (each node type owns its descriptor emission) and matches both OpenCut's pattern and FreeCut's `<MainComposition>` recursive `<CompositionContent>` nesting (which is the React equivalent of the same idea).

### 13.2 FreeCut does NOT produce a serializable FrameDescriptor (§1, §3, §11.2)

**Seed spec claimed:** FreeCut's `main-composition.tsx` "walks the SceneState" and "builds the FrameDescriptor equivalent".

**Actual:** `<MainComposition>` renders directly to the DOM via React (`<video>`, `<canvas>`, `<img>`, `<svg>`, `<AbsoluteFill>`). There is **no serializable `FrameDescriptor` type in FreeCut's preview path**. The DOM React tree *is* the descriptor.

The serializable `FrameDescriptor` exists **only in OpenCut-classic** (`rust/crates/compositor/src/frame.rs` + `apps/web/src/services/renderer/compositor/types.ts`). FreeCut's GPU pipeline (`gpu-compositor/`, `gpu-effects/`, `gpu-transitions/`, `gpu-masks/`) consumes `CompositeLayer` / `GpuEffectInstance` / etc. directly — there's no intermediate FrameDescriptor serialization.

**Correction:** Our rebuild follows OpenCut's `FrameDescriptor` design (serializable, JSON-compatible, the seed spec's intuition is correct). FreeCut is *not* a FrameDescriptor reference — it's a render-engine reference (pipelines, effect registry, transition registry, texture pools). For the descriptor *shape*, look at OpenCut-classic. For the *pipeline implementations* (compositor, effects, transitions, masks), look at FreeCut.

### 13.3 FreeCut has NO Canvas 2D fallback for transitions (§6.3)

**Seed spec claimed:** "Canvas 2D fallback (we don't need — WebGPU only)" as a FreeCut feature.

**Actual:** FreeCut's `gpu-transitions/transition-pipeline.ts` has **no Canvas 2D fallback**. If WebGPU is unavailable or a transition fails to compile, `TransitionPipeline.render` returns `null`. The caller (export pipeline) handles the null case (typically by skipping the transition or falling back to a hard cut).

**Correction:** Drop the "Canvas 2D fallback" mention entirely. We inherit FreeCut's behavior: WebGPU is required; absent transitions are skipped, not faked.

### 13.4 `layer.rs` does not exist (§11.9 of seed spec's open questions)

**Seed spec claimed:** OpenCut-classic has a `layer.rs` file containing `LayerUniformBuffer`.

**Actual:** There is no `layer.rs`. `LayerUniformBuffer` is defined in `rust/crates/compositor/src/compositor.rs:50-61` as a `#[repr(C)] struct` inside `compositor.rs`. The compositor crate's modules are: `blend_mode`, `compositor`, `frame`, `texture_pool`, `texture_store` (`lib.rs:1-5`).

**Correction:** Update all references from "layer.rs" to "compositor.rs §LayerUniformBuffer (lines 50-61)".

### 13.5 Mask JFA: OpenCut-classic, not FreeCut (§8.4)

**Seed spec claimed:** "We adopt OpenCut-classic's JFA shaders (`rust/crates/masks/src/shaders/jfa_*.wgsl`) but consider rewriting as compute shaders for ~2x perf."

**Actual:** This is correct as stated. OpenCut-classic has the full JFA pipeline (`masks/src/sdf.rs:1-332` + 3 WGSL shaders). FreeCut has *no* JFA — its `gpu-masks/` production code consists of `MaskCombinePipeline` (114 LOC) and `MaskTextureManager` (34 LOC, 1×1 white fallback); the directory also contains a trivial `index.ts` re-export and a test file.

**Correction:** No correction needed; confirm the design. The seed spec's recommendation to port OpenCut's JFA shaders is the correct call.

### 13.6 FreeCut's `ItemEffectWrapper` is a no-op (§11.2 finding)

**Seed spec implied:** `<ItemEffectWrapper>` applies adjustment layer effects per-item.

**Actual (`components/item-effect-wrapper.tsx:27-44`):**
```tsx
// Legacy CSS effect rendering removed — all adjustment layer effects now render
// via GPU pipeline in client-render-engine (canvas-effects.ts).
// This wrapper simply passes children through with the same DOM structure.
const ItemEffectWrapperInternal = React.memo<ItemEffectWrapperInternalProps>(({ children }) => {
  return <div style={{ width: '100%', height: '100%', position: 'relative' }}>{children}</div>
})
```

**Correction:** Our rebuild should not have an `ItemEffectWrapper` equivalent — effects are always resolved into `EffectPass[][]` on the descriptor side (per OpenCut's pattern), not applied at the React tree level. The `<ItemEffectWrapper>` indirection was a transitional artifact in FreeCut's migration from CSS effects to GPU effects; we should not reproduce it.

### 13.7 Effect chain ordering is *not* explicit in either repo (§7.3)

**Seed spec claimed:** "1. Color grading (wheels, curves, levels, LUT, qualifier), 2. Color transforms (hue, saturation, vibrance, temperature), 3. Spatial (blur, sharpen, denoise), 4. Stylize (glow, bloom, chromatic aberration, vignette)."

**Actual:** Neither repo enforces this order at the engine level:
- **OpenCut-classic** preserves user-authored order verbatim — `EffectPipeline.apply_with_encoder` (pipeline.rs:173-262) iterates `passes: &[EffectPass]` in array order, no reordering.
- **FreeCut** uses `getGpuEffectInstances(effects)` (`canvas-effects.ts:96-114`) which preserves the user's effect array order. The registry categorizes effects (`color | blur | distort | stylize | keying`) but doesn't reorder.

**Correction:** Either (a) honor user-authored order verbatim (both repos' behavior — simpler, fewer surprises), or (b) enforce category-based reordering at the FrameDescriptor builder. Recommend (a) for v1; users can reorder effects in the UI.

### 13.8 OpenCut-classic's `BlendMode` is `kebab-case` serde, not `camelCase` (§4)

**Seed spec claimed:** `'normal' | 'darken' | 'multiply' | 'color-burn' | ...` (kebab-case).

**Actual (`rust/crates/compositor/src/blend_mode.rs:3-4`):** `#[serde(rename_all = "kebab-case")]` — confirmed kebab-case. The TS mirror (`compositor/types.ts`) uses `BlendMode` as a string literal union — when serialized to JSON, the kebab-case strings pass through verbatim.

**Correction:** No correction needed; seed spec is correct. Note that OpenCut's `BlendMode` enum has 17 variants (including `PlusLighter` at `blend_mode.rs:12`), matching the seed spec's list exactly.

### 13.9 OpenCut-classic caches by `contentHash`, not by state hash (§10.2)

**Seed spec claimed:** `FrameDescriptorCache` keyed on `stateHash(state):frame`.

**Actual:** OpenCut-classic has no `FrameDescriptorCache`. FreeCut has a `FrameCompositionSceneCache` (`frame-scene.ts:273-346`) keyed on `(frame, revision, renderPlan, canvas, callbacks)` — *revision* is an opaque token (not a hash of the entire state), and *renderPlan* is compared by reference equality. Texture-level caching in `WasmCompositor` uses per-texture `contentHash` strings (e.g. `"color:#ff0000:1920x1080"`, `"text:..." + JSON.stringify(...)`).

**Correction:** Our `FrameDescriptorCache` should adopt FreeCut's pattern: cache by `(state-revision-token, frame, render-plan-reference)`. Computing a full `stateHash` on every frame is wasteful when the state hasn't changed — better to track revision explicitly via an immutable state wrapper. (Recommendation: a `SceneState` class with a monotonic `revision: number` field, bumped on every state mutation.) For texture-level caching, follow OpenCut's `contentHash` pattern per-texture-type.

### 13.10 WYSIWYG verification: confirmed for OpenCut-classic, partially for FreeCut (§11 of master spec)

**Seed spec claimed:** "Both FreeCut (headless mode) and OpenCut-classic use the same composition code for both interactive and export."

**Actual:**
- **OpenCut-classic: TRUE.** `CanvasRenderer.render({node, time})` (`canvas-renderer.ts:53-74`) is the same code path used for both preview rAF and frame-by-frame export. It calls `resolveRenderTree` → `buildFrameDescriptor` → `wasmCompositor.syncTextures` → `wasmCompositor.render(frame)`. The only difference is the calling cadence (rAF vs sequential).
- **FreeCut: PARTIALLY TRUE.** FreeCut's headless export at `headless/main.ts:39-43, 668-671` imports `renderComposition` from `features/export/utils/canvas-render-orchestrator` — the same function the in-app export uses. **However**, the in-app **preview** uses `<MainComposition>` (React/DOM), which is a *different code path* from the export pipeline's `createCompositionRenderer` (in `client-render-engine.ts`). They share `scene-assembly.ts`, `frame-scene.ts`, `transition-scene.ts`, `transform-resolver.ts`, etc., but the rendering substrate differs:
  - Preview: DOM React tree → native `<video>`/`<canvas>`/`<img>` elements.
  - Export: `OffscreenCanvas` 2D + `EffectsPipeline`/`TransitionPipeline` GPU passes.

**Correction:** The WYSIWYG contract for OpenCut-classic is fully satisfied (same code, same pixels). For FreeCut, WYSIWYG is *approximate* — the shared scene-assembly logic guarantees the same layer ordering, transforms, masks, and transition windows, but the pixel-level rendering goes through different shaders/code paths. We should aim for OpenCut-classic's "one code path" model: our `CanvasRenderer.render({node, time})` should be the only render entry point, used for both interactive rAF and cloud render. This is the SCOUT-01 finding's recommendation carried into the composition stream.

### 13.11 Correction: multi-track blend expected pixel value (§12.7)

**Seed spec §12.7 expected pixel:** `rgb(127, 127, 0)`.

**Correct expected pixel:** `rgb(187, 187, 0)` (sRGB) = `(0.5, 0.5, 0)`
(linear-light), per the scene-linear blend math:

```
overlay_alpha = 0.5  (green overlay at 50% opacity)
overlay_color_linear = (0, 1, 0)  (sRGB green → linear)
main_color_linear     = (1, 0, 0)  (sRGB red → linear)
result_linear = overlay_color_linear × overlay_alpha + main_color_linear × (1 - overlay_alpha)
             = (0, 1, 0) × 0.5 + (1, 0, 0) × 0.5
             = (0.5, 0.5, 0)
result_sRGB = (1.055 × 0.5^(1/2.4) − 0.055, ...) ≈ (0.7438, 0.7438, 0)
            ≈ rgb(187, 187, 0)
```

**Why the seed spec was wrong:** the seed spec author conflated "50% blend"
with "50% sRGB value". In scene-linear pipelines (which spec 04 §3 mandates),
blends happen in linear-light space, where 0.5 maps to ≈187 in 8-bit sRGB
output, not 127. The 127 value would be correct *only* if blending happened
in sRGB space, which the architecture explicitly rejects (spec 04 §3:
"all blending happens in scene-linear space; converting to sRGB before
blending produces incorrect gamma-stacking artifacts").

**Action item:** the seed spec §12.7 line "Assert center pixel is
`rgb(127, 127, 0)`" should be updated to "Assert center pixel is
`rgb(187, 187, 0)` (50/50 linear-light blend — `(0.5, 0.5, 0)` linear ≈
sRGB `rgb(187, 187, 0)`)".

---

## 14. OpenCut-classic FrameDescriptor Full Quote

**File:** `/tmp/opencut-classic/rust/crates/compositor/src/frame.rs` (83 LOC, quoted in full)

```rust
use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::BlendMode;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FrameDescriptor {
    pub width: u32,
    pub height: u32,
    pub clear: CanvasClearDescriptor,
    pub items: Vec<FrameItemDescriptor>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasClearDescriptor {
    pub color: [f32; 4],
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum FrameItemDescriptor {
    Layer(LayerDescriptor),
    SceneEffect {
        effect_pass_groups: Vec<Vec<EffectPassDescriptor>>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LayerDescriptor {
    pub texture_id: String,
    pub transform: QuadTransformDescriptor,
    pub opacity: f32,
    pub blend_mode: BlendMode,
    #[serde(default)]
    pub effect_pass_groups: Vec<Vec<EffectPassDescriptor>>,
    pub mask: Option<LayerMaskDescriptor>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuadTransformDescriptor {
    pub center_x: f32,
    pub center_y: f32,
    pub width: f32,
    pub height: f32,
    pub rotation_degrees: f32,
    pub flip_x: bool,
    pub flip_y: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LayerMaskDescriptor {
    pub texture_id: String,
    pub feather: f32,
    pub inverted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EffectPassDescriptor {
    pub shader: String,
    pub uniforms: HashMap<String, EffectUniformValueDescriptor>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum EffectUniformValueDescriptor {
    Number(f32),
    Vector(Vec<f32>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasTextureDescriptor {
    pub id: String,
    pub width: u32,
    pub height: u32,
}
```

**TypeScript mirror** (`/tmp/opencut-classic/apps/web/src/services/renderer/compositor/types.ts:1-78`) is a near-1:1 port — the only differences are TS syntax (no `Option`, no `Vec`, no `HashMap` — replaced with `| null`, `[]`, and `Record<...>`).

**Comparison to seed spec §4:**

| Seed spec field | OpenCut-classic | Status |
|---|---|---|
| `width`, `height`, `clear.color`, `items[]` | Same | ✅ Identical |
| `displayMode` (primaries/transfer/toneMap) | **Absent** | 🆕 Our extension (HDR) |
| `Layer.id` | **Absent** | 🆕 Our extension (for caching) |
| `Layer.sourceColorSpace` | **Absent** | 🆕 Our extension (per-layer color) |
| `Layer.textureId` | `texture_id` | ✅ Identical (camelCase) |
| `Layer.transform` | `QuadTransformDescriptor` | ✅ Identical (centerX/Y, width/height, rotationDegrees, flipX/Y) |
| `Layer.opacity`, `Layer.blendMode` | Same | ✅ Identical |
| `Layer.effectPassGroups` (`EffectPass[][]`) | `effect_pass_groups: Vec<Vec<EffectPassDescriptor>>` | ✅ Identical (groups-of-passes shape; renamed from `Layer.effects` to match `SceneEffect.effectPassGroups` — REVISE-07-04) |
| `Layer.masks` (`MaskDescriptor[]`, applied in order — §8.3) | `Option<LayerMaskDescriptor>` (single) | ✅ Base identical (seed's `mask` was 1:1 with OpenCut); our array extends |
| `LayerMaskDescriptor` (textureId/feather/inverted) | Same | ✅ Identical |
| `EffectPass` (shader + uniforms map) | `EffectPassDescriptor` (shader + HashMap<String, EffectUniformValue>) | ✅ Identical; values are `Number | Vector<f32>` |

**Notable design points:**
1. `FrameItemDescriptor` is a tagged enum (`#[serde(tag = "type", rename_all = "camelCase")]`) — wire format has `type: "layer"` or `type: "sceneEffect"`. This matches our `type Layer | SceneEffect` union.
2. `EffectPassDescriptor.uniforms` is a `HashMap<String, EffectUniformValueDescriptor>` — variable per shader. `EffectUniformValueDescriptor` is `Number(f32) | Vector(Vec<f32>)`. This is more flexible than the seed spec's `Record<string, number | number[]>` (which is the TS equivalent), but at the wire level they serialize to the same JSON.
3. `effect_pass_groups: Vec<Vec<EffectPassDescriptor>>` is **groups of passes**, not a flat list. The seed spec mirrors this with `EffectPass[][]`. The compositor iterates groups outer-to-inner, applying effects in each group sequentially (see `compositor.rs:485-510` `apply_effect_groups`).

---

## 15. OpenCut-classic `frame-descriptor.ts` Walkthrough

**File:** `/tmp/opencut-classic/apps/web/src/services/renderer/compositor/frame-descriptor.ts` (581 LOC)

### 15.1 Public entry point (lines 30-65)

```ts
export async function buildFrameDescriptor({
  node,
  renderer,
}: {
  node: AnyBaseNode;
  renderer: CanvasRenderer;
}): Promise<{
  frame: FrameDescriptor;
  textures: TextureUploadDescriptor[];
}> {
  const items: FrameItemDescriptor[] = [];
  const textures = new Map<string, TextureUploadDescriptor>();

  await collectNode({
    node,
    renderer,
    path: "root",
    items,
    textures,
  });

  incrementCounter({ name: "frameItems", by: items.length });
  incrementCounter({ name: "frameTextures", by: textures.size });

  return {
    frame: {
      width: renderer.width,
      height: renderer.height,
      clear: {
        color: [0, 0, 0, 1],
      },
      items,
    },
    textures: [...textures.values()],
  };
}
```

**Key design points:**
- Returns **both** the `FrameDescriptor` and a side-channel `TextureUploadDescriptor[]` list. The descriptor carries texture IDs; the upload list carries the actual source canvases / draw functions. This separation lets the descriptor be JSON-serializable while the upload payloads (which may contain `CanvasImageSource` references) travel separately.
- `clear.color` is hardcoded to opaque black `[0, 0, 0, 1]`. The seed spec's `clear.color` from `state.scene.settings.backgroundColor` is a more general design.
- Path-based texture IDs: `"root:0:source"`, `"root:1:text"`, etc. The `path` argument encodes the tree position so two sibling nodes get unique IDs even if they have the same content.

### 15.2 Tree walk dispatcher (lines 67-206)

```ts
async function collectNode({ node, renderer, path, items, textures }): Promise<void> {
  if (node instanceof RootNode) {
    for (let index = 0; index < node.children.length; index++) {
      await collectNode({
        node: node.children[index],
        renderer,
        path: `${path}:${index}`,
        items,
        textures,
      });
    }
    return;
  }

  if (node instanceof ColorNode) {
    const textureId = `${path}:color`;
    // ... register a "rendered" texture that fills canvas with color or gradient
    textures.set(textureId, { kind: "rendered", id: textureId, contentHash: `color:${node.params.color}:${width}x${height}`, ... });
    items.push({ type: "layer", textureId, transform: fullCanvasTransform(renderer), opacity: 1, blendMode: "normal", effectPassGroups: [], mask: null });
    return;
  }

  if (node instanceof EffectLayerNode) {
    if (!node.resolved || node.resolved.passes.length === 0) return;
    items.push({ type: "sceneEffect", effectPassGroups: [node.resolved.passes] });
    return;
  }

  if (node instanceof BlurBackgroundNode) {
    if (!node.resolved) return;
    // ... emit layer with backdrop draw + blur passes
    return;
  }

  if (node instanceof VideoNode || node instanceof ImageNode || node instanceof StickerNode || node instanceof GraphicNode) {
    await collectVisualSourceNode({ node, renderer, path, items, textures });
    return;
  }

  if (node instanceof TextNode) {
    collectTextNode({ node, renderer, path, items, textures });
  }
}
```

**Key design points:**
- `instanceof` dispatch — no visitor pattern, no method overrides on the node classes themselves. The collector is the only place that knows how to emit a `FrameItemDescriptor` for each node type. This keeps the node classes pure data.
- Active-element filtering: each `node.resolved` field is set by `resolveRenderTree` (`resolve.ts:71-97`) *before* `buildFrameDescriptor` is called. If `resolved === null`, the node is skipped — equivalent to "not active at this time".

### 15.3 Visual source node collection (lines 208-277)

```ts
async function collectVisualSourceNode({ node, renderer, path, items, textures }) {
  if (!node.resolved) return;

  const source = node instanceof GraphicNode
    ? node.getSource({ resolvedParams: node.resolved.resolvedParams })
    : node.resolved.source;
  if (!source) return;

  const sourceWidth = node instanceof GraphicNode
    ? DEFAULT_GRAPHIC_SOURCE_SIZE
    : (node.resolved as ResolvedVisualSourceNodeState).sourceWidth;
  const sourceHeight = /* ... same pattern ... */;

  const textureId = `${path}:source`;
  textures.set(textureId, {
    kind: "external",
    id: textureId,
    source,                              // ← CanvasImageSource reference
    width: sourceWidth,
    height: sourceHeight,
  });

  const transform = computeVisualTransform({ renderer, resolved: node.resolved, sourceWidth, sourceHeight });
  const { mask, strokeLayer } = buildMaskArtifacts({ node, renderer, path, transform, textures });

  items.push({
    type: "layer",
    textureId,
    transform,
    opacity: node.resolved.opacity,
    blendMode: node.params.blendMode ?? "normal",
    effectPassGroups: node.resolved.effectPasses,
    mask,
  });
  if (strokeLayer) items.push(strokeLayer);
}
```

**Key design points:**
- External textures (video frames, decoded images) carry `kind: "external"` and a `source: CanvasImageSource` reference. They are cached by *reference identity* in `WasmCompositor.syncExternalTexture` (`wasm-compositor.ts:99-133`).
- Mask artifacts (mask texture + optional stroke layer) are emitted as **separate** `TextureUploadDescriptor` entries with their own `contentHash` strings. The stroke layer is itself a `FrameItemDescriptor` of type `layer` (a separate layer in the items list).
- `node.resolved.effectPasses` is already a `EffectPass[][]` (groups of passes), passed through as `effectPassGroups` — no transformation.

### 15.4 Transform computation (lines 327-356)

```ts
function computeVisualTransform({ renderer, resolved, sourceWidth, sourceHeight }): QuadTransformDescriptor {
  const containScale = Math.min(
    renderer.width / sourceWidth,
    renderer.height / sourceHeight,
  );
  const scaledWidth = sourceWidth * containScale * resolved.transform.scaleX;
  const scaledHeight = sourceHeight * containScale * resolved.transform.scaleY;
  const absWidth = Math.abs(scaledWidth);
  const absHeight = Math.abs(scaledHeight);

  return {
    centerX: renderer.width / 2 + resolved.transform.position.x,
    centerY: renderer.height / 2 + resolved.transform.position.y,
    width: absWidth,
    height: absHeight,
    rotationDegrees: resolved.transform.rotate,
    flipX: scaledWidth < 0,    // ← sign-as-flip: negative scale → positive width + flipX
    flipY: scaledHeight < 0,
  };
}
```

**Key design points:**
- "Contain" scaling: source is fit inside the canvas, preserving aspect ratio. This is the FreeCut `resolveTransform` default (`transform-resolver.ts:42-79`) too.
- `flipX` / `flipY` are derived from sign of `scaledWidth` / `scaledHeight`. A negative `scaleX` becomes a positive `width` with `flipX: true`. This matches the Rust `LayerUniformBuffer` consumption (compositor.rs:602-604: `flip_x: if layer.transform.flip_x { 1.0 } else { 0.0 }`) and the WGSL `layer.wgsl:44-47` shader logic (`select(uv.x, 1.0 - uv.x, uniforms.flip_x > 0.5)`).

### 15.5 Mask artifact construction (lines 372-534)

```ts
function buildMaskArtifacts({ node, renderer, path, transform, textures }): {
  mask: LayerMaskDescriptor | null;
  strokeLayer: FrameItemDescriptor | null;
} {
  const mask = node.params.masks?.[0];     // ← single mask only!
  if (!mask) return { mask: null, strokeLayer: null };

  const definition = getMaskDefinition(mask.type);
  if (definition.isActive?.(mask.params) === false) return { mask: null, strokeLayer: null };

  const { body } = definition.renderer;
  const usesOpaqueFastPath = body.kind === "drawWithFeather"
    && mask.params.feather === 0
    && Boolean(body.opaqueFastPath);
  // drawWithFeather renderers encode feathering analytically in their canvas output.
  // The descriptor feather is zeroed so the GPU compositor copies the mask as-is
  // and does not run a second JFA feather pass on top of an already-soft texture.
  const feather = body.kind === "drawWithFeather" ? 0 : mask.params.feather;

  const maskTextureId = `${path}:mask`;
  const maskContentHash = `mask:${mask.type}:${JSON.stringify(mask.params)}:${transformHash(transform)}:${canvasWidth}x${canvasHeight}:body=${body.kind}:fastPath=${usesOpaqueFastPath}`;

  const drawMask: TextureCanvasDrawFn = (ctx) => {
    // Create element-mask canvas at the transform's local dimensions.
    const { canvas: elementMaskCanvas, context: elementMaskCtx } = createCanvasSurface({
      width: Math.round(transform.width),
      height: Math.round(transform.height),
    });
    switch (body.kind) {
      case "fillPath": /* ... Path2D + fill */ break;
      case "drawOpaque": /* ... */ break;
      case "drawWithFeather": /* ... */ break;
    }
    drawTransformedCanvas({ ctx, source: elementMaskCanvas, transform });
  };
  textures.set(maskTextureId, { kind: "rendered", id: maskTextureId, contentHash: maskContentHash, width: canvasWidth, height: canvasHeight, draw: drawMask });

  // ... optional stroke layer ...

  return {
    mask: { textureId: maskTextureId, feather, inverted: mask.params.inverted },
    strokeLayer,
  };
}
```

**Key design points:**
- **Single-mask only:** `node.params.masks?.[0]` (line 388). OpenCut-classic's `LayerDescriptor.mask: Option<LayerMaskDescriptor>` in Rust confirms this. Our `masks: MaskDescriptor[]` extension requires the renderer to chain `MaskCombinePipeline.combine(base, next, output, ...)` calls — see §8.3.
- **CPU-side rasterization:** masks are rasterized via `TextureCanvasDrawFn` callbacks executed on the JS side (Path2D + `ctx.fill()` / `ctx.stroke()`). The output is uploaded to GPU textures via `wasmCompositor.syncRenderedTexture` (`wasm-compositor.ts:135-182`).
- **`contentHash` for caching:** the mask texture is re-rasterized only when `maskContentHash` changes. The hash encodes mask type, params JSON, transform hash, canvas dimensions, body kind, and fast-path flag. This is the seed spec's `stateHash(state)` idea applied at the per-texture granularity.
- **`drawWithFeather` short-circuits JFA:** when the mask's `feather === 0` and an opaque fast-path exists, the feather is set to 0 in the descriptor (line 408), so the GPU compositor copies the mask as-is. When feather > 0, the descriptor carries the feather value, and the GPU compositor runs `MaskFeatherPipeline.apply_mask_feather_with_encoder` (Rust `feather.rs:183-285`).

### 15.6 Content hash strategy (lines 99, 144, 302-305, 412, 476)

```ts
// Color fill:
contentHash: `color:${node.params.color}:${width}x${height}`

// Blur background:
contentHash: `blur:${identityKey(backdropSource.source)}:${backdropSource.width}x${backdropSource.height}:${width}x${height}`

// Text:
contentHash: `text:${width}x${height}:${JSON.stringify({ params: node.params, resolved: node.resolved })}`

// Mask:
contentHash: `mask:${mask.type}:${JSON.stringify(mask.params)}:${transformHash(transform)}:${canvasWidth}x${canvasHeight}:body=${body.kind}:fastPath=${usesOpaqueFastPath}`

// Stroke:
contentHash: `stroke:${mask.type}:${JSON.stringify(mask.params)}:${transformHash(transform)}:${canvasWidth}x${canvasHeight}:stroke=${stroke.kind}`
```

Plus a `WeakMap<object, number>` identity-key helper for `CanvasImageSource` references (lines 567-581) — keeps hash string length bounded.

---

## 16. Render Node Tree Inventory

OpenCut-classic's render node tree is at `/tmp/opencut-classic/apps/web/src/services/renderer/nodes/` (11 files, 409 LOC total).

| Node class | File | LOC | Parent class | Params shape | Resolved state | Role in FrameDescriptor |
|---|---|---|---|---|---|---|
| `BaseNode<Params, Resolved>` | `base-node.ts:4-26` | 26 | — | `object \| undefined` | `Resolved \| null` | Abstract root; `children: AnyBaseNode[]`, `add(child)`, `remove(child)` |
| `RootNode` | `root-node.ts:7-11` | 11 | `BaseNode<RootNodeParams>` | `{duration}` | none | Tree root; iterated by `collectNode` |
| `VisualNode<Params, Resolved>` | `visual-node.ts:34-37` | 37 | `BaseNode<VisualNodeParams, Resolved>` | `{duration, timeOffset, trimStart, trimEnd, retime?, transform, animations?, opacity, blendMode?, effects?, masks?}` | `ResolvedVisualNodeState {localTime, transform, opacity, effectPasses}` | Abstract base for visual nodes |
| `VideoNode` | `video-node.ts:13-16` | 16 | `VisualNode<VideoNodeParams, ResolvedVisualSourceNodeState>` | `+ url, file, mediaId` | `+ source: CanvasImageSource, sourceWidth, sourceHeight` | → `layer` FrameItem with `external` texture from `videoCache.getFrameAt` |
| `ImageNode` | `image-node.ts:71-74` | 74 | `VisualNode<ImageNodeParams, ResolvedVisualSourceNodeState>` | `+ url, maxSourceSize?` | same | → `layer` FrameItem; `loadImageSource` caches by URL+maxSize in module-level `Map` |
| `StickerNode` | `sticker-node.ts:56-59` | 59 | `VisualNode<StickerNodeParams, ResolvedVisualSourceNodeState>` | `+ stickerId, intrinsicWidth?, intrinsicHeight?` | same | → `layer` FrameItem; `loadStickerSource` caches by stickerId |
| `GraphicNode` | `graphic-node.ts:23-67` | 67 | `VisualNode<GraphicNodeParams, ResolvedGraphicNodeState>` | `+ definitionId, params: ParamValues` | `+ resolvedParams` | → `layer` FrameItem; `getSource()` renders graphic via `definition.render({ctx, params, w, h})` with per-instance `cachedKey` + `cachedSource` |
| `TextNode` | `text-node.ts:26` | 61 | `BaseNode<TextNodeParams, ResolvedTextNodeState>` | `TextElement + {transform, opacity, blendMode?, canvasCenter, canvasHeight, textBaseline?}` | `{transform, opacity, textColor, backgroundColor, effectPasses, measuredText}` | → `layer` FrameItem with `rendered` texture; `renderTextToContext` draws via `drawMeasuredTextLayout` |
| `EffectLayerNode` | `effect-layer-node.ts:16-19` | 19 | `BaseNode<EffectLayerNodeParams, ResolvedEffectLayerNodeState>` | `{effectType, effectParams, timeOffset, duration}` | `{passes: EffectPass[]}` | → `sceneEffect` FrameItem with single group `[passes]` |
| `BlurBackgroundNode` | `blur-background-node.ts:29-32` | 32 | `BaseNode<BlurBackgroundNodeParams, ResolvedBlurBackgroundNodeState>` | `{mediaId, url, file, mediaType, duration, timeOffset, trimStart, trimEnd, retime?, blurIntensity}` | `{backdropSource, passes}` | → `layer` FrameItem; backdrop drawn cover-scaled + gaussian-blur passes |
| `ColorNode` | `color-node.ts:7` | 7 | `BaseNode<ColorNodeParams>` | `{color: string}` | none | → `layer` FrameItem with `rendered` texture (fillStyle or CSS gradient) |

**Total: 11 node files, 409 LOC.**

### 16.1 Build flow (scene-builder.ts:226-273)

1. Construct `RootNode({duration})`.
2. `mediaMap = new Map(mediaAssets.map((m) => [m.id, m]))`.
3. `visibleTracks = [...overlay.filter(!hidden), ...(!main.hidden ? [main] : [])]`.
4. `orderedTracksBottomToTop = visibleTracks.slice().reverse()` — overlay-2 first, then overlay-1, then main.
5. For each track → `getVisibleSortedElements({track})` (filter `hidden`, sort by `startTime` then `id`).
6. For each element, dispatch by `element.type` to construct the appropriate node (see §11.11 above).
7. If `background.type === 'blur'`, build `BlurBackgroundNode[]` from main track and prepend to root.
8. If `background.type === 'color' && color !== 'transparent'`, prepend `ColorNode`.
9. Append all track nodes to root via `rootNode.add(node)`.

### 16.2 Resolve flow (resolve.ts:53-97)

`resolveRenderTree({node, renderer, time})` recurses depth-first:
1. `resolveNode({node, context})` dispatches by `instanceof`:
   - `VideoNode` → `resolveVideoNode` (async; fetches frame from `videoCache.getFrameAt`)
   - `ImageNode` → `resolveImageNode` (async; `loadImageSource`)
   - `StickerNode` → `resolveStickerNode` (async; `loadStickerSource`)
   - `GraphicNode` → `resolveGraphicNode` (sync; `resolveGraphicElementParamsAtTime`)
   - `TextNode` → `resolveTextNode` (sync; `measureTextElement`)
   - `BlurBackgroundNode` → `resolveBlurBackgroundNode` (async; fetches backdrop frame)
   - `EffectLayerNode` → `resolveEffectLayerNode` (sync; `resolveEffectPasses`)
2. `await Promise.all(node.children.map(resolveNode))` — recurse children in parallel.
3. Each resolver returns `null` when `clipTime < 0 || clipTime >= params.duration` — the node is inactive at this time.

### 16.3 Collect flow (frame-descriptor.ts:67-206)

`collectNode({node, renderer, path, items, textures})` recurses:
1. `RootNode` → iterate `children`, recurse with `path = "${path}:${index}"`.
2. `ColorNode` → emit `rendered` texture (color/gradient fill) + `layer` FrameItem.
3. `EffectLayerNode` → emit `sceneEffect` FrameItem with single group `[node.resolved.passes]`.
4. `BlurBackgroundNode` → emit `rendered` backdrop texture + `layer` FrameItem with blur passes.
5. `VideoNode | ImageNode | StickerNode | GraphicNode` → `collectVisualSourceNode`:
   - Emit `external` texture (CanvasImageSource reference).
   - Compute `QuadTransformDescriptor` via `computeVisualTransform`.
   - Build mask artifacts (`buildMaskArtifacts`) — emit `rendered` mask texture + optional stroke layer.
   - Push `layer` FrameItem with transform, opacity, blendMode, effectPassGroups, mask.
6. `TextNode` → `collectTextNode` — emit `rendered` text texture + `layer` FrameItem.

### 16.4 Comparison to FreeCut's `<MainComposition>` tree

FreeCut's preview composition tree (React) is structurally analogous:
- `<MainComposition>` ≈ `RootNode`
- `<Sequence>` ≈ tree container with `from` + `durationInFrames`
- `<Item>` → `<ItemContent>` ≈ type-dispatch collector (lines 220-657 of `item-content.tsx`)
- `<VideoContent>` / `<ImageContent>` (via `<img>`) / `<TextContent>` / `<ShapeContent>` / `<LottiePlayer>` / `<GifPlayer>` ≈ per-type leaf nodes
- `<CompositionContent>` ≈ recursive `RootNode` for sub-comps
- `<ItemEffectWrapper>` ≈ (currently a no-op) effect-pass node

The shape is the same; the substrate differs (React/DOM vs `BaseNode`/canvas). For our rebuild, we adopt OpenCut-classic's `BaseNode` pattern because it's serializable and testable without React.

---

## 17. Testing

> See `17-test-plan.md` §4 for the per-module template, §3 for the test
> matrix, and §5 for canonical test-asset naming. Matrix rows for this
> stream: "`buildFrameDescriptor(state, t)` is pure" (§7 of spec 17,
> Tier 1 ✅ + Property ✅), "Multi-track blend (source-over, normal,
> screen, multiply, ...)", "Opacity (per-element, per-track)",
> "Transitions (crossfade, dip-to-color, push, wipe)" (Tier 2 ✅ +
> Tier 3 ✅), "Masks (shape, alpha, luma) with JFA feathering"
> (Tier 2 ✅), and the cross-cutting "State WYSIWYG (keyboard
> shortcut == direct API)" (Tier 3 ✅) + "Cloud render WYSIWYG
> (browser == cloud pixel diff)" (Tier 2 ✅) rows. Color-wheels /
> color-curves / LUT / qualifier matrix rows are primarily owned by
> spec 08, but the *EffectPass ordering contract* (§7.3 — color first,
> then spatial) is verified here because it is the composition
> runtime's responsibility to emit the ordered `EffectPass[][]`.
> EngineCommand types referenced below are defined in
> `15-wire-protocol.md` §4.3.52 (`addEffect`), §4.3.53
> (`updateEffect`), §4.3.57 (`addMask`), §4.3.58 (`updateMask`),
> §4.3.61 (`addTransition`), §4.3.62 (`updateTransition`).
> Keyboard shortcuts referenced are defined in `16-keyboard-shortcuts.md`
> §3.11 (`1`–`9` apply effect preset, `Shift+1`–`Shift+9` toggle effect
> on/off, `Cmd+Shift+E` toggle focused effect in effects panel,
> `Cmd+Shift+Option+E` reset all effects). No keyboard shortcut is
> registered in spec 16 §3 for `addTransition` / `addMask` — those Tier
> 3 paths go via direct `engine.command.apply()` (Pattern 2 in spec 16
> §4) since they are authoring actions performed via the mouse/trackpad
> on the timeline, not via the keyboard.
>
> The brief test plan in §12 above remains as the *intent* list
> (architect's 9-bullet sketch); this `## Testing` section is the
> *executable* contract — reviewers compare it line-by-line against the
> actual test files. Each test name is a single sentence; each bullet
> lists the invariant, the assertion, and the file/line cross-reference
> where the behavior is defined in this spec.

### Tier 1: Pure engine tests

[Filename: `tests/unit/07-composition/*.test.ts`]

Tier 1 for this stream verifies `buildFrameDescriptor(state, frame)` and its
constituent helpers (`findActiveElements`, `orderLayers`, `buildLayerDescriptor`,
`applyTransitions`, `buildEffectPasses`, `buildMaskDescriptor`) as **pure
Vitest functions** — no browser, no WebGPU, no Playwright. The composition
runtime is the single most purity-sensitive module in the engine: per spec
§2.1 ("Pure function. `buildFrameDescriptor(state, frame) → FrameDescriptor`.
No side effects.") and the spec 17 §7 invariant catalogue (row "07
Composition — `buildFrameDescriptor(state, t)` is pure"), every test below
exists to lock down that contract.

**`buildFrameDescriptor` purity:**

- `buildframedescriptor-is-pure-deep-equal-on-repeated-call` — call
  `buildFrameDescriptor(state, frame=150)` twice with the *same* `state`
  reference and the *same* `frame` argument; assert the two returned
  `FrameDescriptor` objects are deep-equal (`expect(obj1).toEqual(obj2)`)
  and that the second call's `WeakMap`-internal texture cache was hit (no
  re-upload; spy on `renderer.uploadTexture` if injected). Locks down spec
  §2.1, §10.2 (FrameDescriptor cache), spec 17 §7 row "07 Composition"
- `buildframedescriptor-no-side-effects-on-state` — call
  `buildFrameDescriptor(state, frame)` 1000 times across frames 0..999;
  assert `state` is byte-identical before vs after the loop (deep-equal via
  `JSON.stringify` round-trip; this catches accidental in-place mutation of
  `state.scene.tracks` / `state.scene.transitions` / `state.scene.effects`)
- `buildframedescriptor-deterministic-with-cloned-state` — deep-clone
  `state` via `structuredClone(state)`; call
  `buildFrameDescriptor(originalState, 150)` and
  `buildFrameDescriptor(clonedState, 150)`; assert the two descriptors are
  deep-equal — proves purity holds across *value-equal* inputs, not just
  *reference-equal* inputs (the cache key is `stateHash(state) + frame`,
  per §10.2)

**Layer ordering (spec §5.2):**

- `layer-ordering-main-first-then-overlays-bottom-to-top` — construct a
  `SceneState` with 1 main track (1 element) + 2 overlay tracks
  (`overlay-1`, `overlay-2`, each with 1 element) + 2 audio tracks;
  call `buildFrameDescriptor(state, frame=0)`; assert `descriptor.items`
  contains 3 `Layer` items in order: `[main, overlay-2, overlay-1]`
  (matches §5.2 "Composite order (back to front): main video track first,
  then overlay tracks top to bottom: overlay-2 first, then overlay-1" and
  the OpenCut-classic `.reverse()` at `scene-builder.ts:237-241`); audio
  elements must NOT appear in `items` (audio composition is separate, per
  §9)
- `layer-ordering-within-overlay-track-preserves-time-order` — overlay
  track with 3 non-overlapping elements `[A(0-1s), B(1-2s), C(2-3s)]`;
  at frame=0 only `A` is active (assert `items.length === 1` and
  `items[0].id === 'A'`); at frame=45 (1.5s @ 30fps) only `B` is active
- `layer-ordering-background-nodes-prepend-before-main` — when
  `scene.settings.background.type === 'color'` with
  `color !== 'transparent'`, a background `ColorNode` is prepended to
  `RootNode` before the main track nodes (§16.1 step 8); assert
  `descriptor.items[0]` is the background color layer and
  `descriptor.items[1]` is the main track element

**Active element resolution (spec §5.3):**

- `active-element-resolution-half-open-interval` — element with
  `startTime = 0, duration = 2s` (60 frames @ 30fps); at frame=0
  (`time = startTime`) the element IS active (assert
  `descriptor.items.find(i => i.id === el.id)` is defined); at frame=60
  (`time = startTime + duration`) the element is NOT active (the
  interval is `[startTime, startTime+duration)` — half-open, per §5.3
  `el.startTime <= time && mediaTimeAdd(el.startTime, el.duration) > time`)
- `active-element-resolution-gap-between-elements` — main track with two
  elements `[A(0-1s), B(1-2s)]` (no overlap, gap=0); at frame=30 (1.0s)
  `A` is inactive and `B` is active (assert `items.length === 1` and
  `items[0].id === 'B'`); at frame=29 (1.0s minus 1 frame) `A` is active
  (transition region if a transition straddles frame=30, see §6)
- `active-element-resolution-hidden-track-skipped` — overlay track with
  `hidden: true`; assert none of its elements appear in `descriptor.items`
  regardless of frame (matches OpenCut-classic `scene-builder.ts:237-241`
  filter `!track.hidden`)

**Transform resolution (spec §5.4):**

- `transform-resolution-static-transform-passes-through` — element with
  `transform = { scaleX: 0.5, scaleY: 0.5, position: {x: 100, y: 50},
  rotation: 30, flipX: false, flipY: false }` and no keyframes; assert
  `descriptor.items[0].transform` has `centerX = canvas.width/2 + 100,
  centerY = canvas.height/2 + 50, width = sourceWidth × 0.5 × containScale,
  height = sourceHeight × 0.5 × containScale, rotationDegrees = 30,
  flipX = false, flipY = false` (matches `computeVisualTransform` at
  `frame-descriptor.ts:327-356` per §5.4 SCOUT-07 note)
- `transform-resolution-negative-scale-encodes-as-flip` — element with
  `transform.scaleX = -0.5`; assert `transform.width > 0` (absolute value
  taken) AND `transform.flipX === true` (the sign-as-flip trick,
  `computeVisualTransform` line 296 of this spec)
- `transform-resolution-animated-transform-resolves-at-frame-N` — element
  with `transform.keyframes = [{ time: 0, value: {scaleX: 1.0} },
  { time: 60, value: {scaleX: 2.0} }]`, linear interpolation; at
  frame=30 assert `transform.width === sourceWidth × 1.5 × containScale`
  (linear interpolation halfway between keyframes); at frame=60 assert
  `transform.width === sourceWidth × 2.0 × containScale`

**Effect pass resolution (spec §7.2, §7.3):**

- `effectpass-resolution-color-wheels-emits-single-pass` — element with
  one `color-wheels` effect; assert
  `descriptor.items[0].effectPassGroups` is `[[{shader: 'color-wheels',
  uniforms: {lift_shadows, gamma_mids, gain_highlights, offset, ...}}]]`
  (one group, one pass, matches §7.2 `effectToPasses` case
  `'color-wheels'`)
- `effectpass-resolution-gaussian-blur-emits-two-passes-h-then-v` —
  element with one `gaussian-blur` effect, `params.sigma = 5`; assert
  `effectPassGroups[0]` is `[{shader: 'gaussian-blur', uniforms: {sigma:5,
  direction: [1, 0]}}, {shader: 'gaussian-blur', uniforms: {sigma:5,
  direction: [0, 1]}}]` (two passes: horizontal then vertical, matches §7.2
  case `'gaussian-blur'`)
- `effectpass-resolution-disabled-effect-skipped` — element with two
  effects `[color-wheels (enabled=true), gaussian-blur (enabled=false)]`;
  assert `effectPassGroups` has length 1 (only the color-wheels group
  present) — matches §7.2 `if (!effect.enabled) continue`
- `effectpass-resolution-chain-ordering-color-then-spatial` — element
  with effects added in this order: `[gaussian-blur, color-wheels, lut]`;
  assert the composition runtime re-orders the groups to
  `[[color-wheels], [lut], [gaussian-blur-h, gaussian-blur-v]]` (color
  grading first, then color transforms, then spatial — matches §7.3
  ordering rule "1. Color grading (wheels, curves, levels, LUT,
  qualifier); 2. Color transforms; 3. Spatial (blur, sharpen, denoise);
  4. Stylize")
- `effectpass-resolution-keyframed-param-resolves-at-time` — element with
  one `color-wheels` effect whose `params.exposure` is animated via
  `effect.keyframes = [{ time: 0, value: 0.0 }, { time: 60, value: 1.0 }]`;
  at frame=30 assert `effectPassGroups[0][0].uniforms.exposure === 0.5`
  (linear interpolation — §7.2 `resolveKeyframedParams`)

**Mask descriptor building (spec §8.2):**

- `maskdescriptor-building-shape-mask-texture-id` — layer with one shape
  mask `{type: 'shape', shape: 'rectangle', shapeParams: {x, y, w, h},
  feather: 0, inverted: false}`; assert `descriptor.items[0].mask.textureId`
  starts with `"mask:shape:rectangle:"` (matches §8.2
  `getOrCreateShapeMaskTexture` contract); assert `feather === 0`,
  `inverted === false`
- `maskdescriptor-building-image-mask-texture-id` — layer with one image
  mask `{type: 'image', mediaId: 'mask-asset-1', feather: 0, inverted:
  false}`; assert `mask.textureId === 'mask-image:mask-asset-1'` (matches
  §8.2)
- `maskdescriptor-building-qualifier-mask-includes-frame-in-id` — layer
  with one qualifier mask `{type: 'qualifier', id: 'q1', feather: 0,
  inverted: false}`; at frame=150 assert
  `mask.textureId === 'mask-qualifier:q1:frame:<mediaTime>'` where
  `<mediaTime>` is `mediaTimeFromFrame({frame: 150, fps: state.fps})`
  (qualifier masks are per-frame because they depend on the source pixels,
  §8.2)
- `maskdescriptor-building-multiple-masks-applied-in-order` — layer with
  two masks `[shape-rect, shape-ellipse]` (per §8.3 "we support multiple
  masks — applied in order"); assert `descriptor.items[0].masks` is an
  array of length 2 with `[mask-rect, mask-ellipse]` in that order; this
  requires the Layer interface to expose `masks: MaskDescriptor[]` (the
  spec's extension beyond OpenCut-classic's single-mask `mask:
  MaskDescriptor | null`, per §8.3)

**Transition state resolution (spec §6.2):**

- `transition-state-resolution-crossfade-opacity-multipliers` —
  transition `{type: 'crossfade', presentation: 'fade', duration: 1s,
  leftElementId: 'red', rightElementId: 'green'}`; at
  `time = windowStart + 0.0s` (t=0) assert
  `layerA.opacity === 1.0 × 1.0 = 1.0` and `layerB.opacity === 1.0 × 0 =
  0.0` (only A visible); at t=0.5 assert `layerA.opacity === 0.5` and
  `layerB.opacity === 0.5` (50/50); at t=1.0 assert `layerA.opacity === 0`
  and `layerB.opacity === 1.0` (only B visible). Matches §6.2
  `applyPresentation` crossfade blend
- `transition-state-resolution-crossfade-uses-plus-lighter-blend` —
  for a clean linear-dissolve crossfade in scene-linear space (the
  architecturally-correct behavior per spec 04's scene-linear pipeline),
  the crossfade sets both layers' `blendMode` to `'plus-lighter'` for the
  duration of the transition window. At t=0.5 assert
  `layerA.blendMode === 'plus-lighter'` and `layerB.blendMode ===
  'plus-lighter'`. (The naive `'normal'` source-over blend at 50/50
  opacity produces `(0.25, 0.5, 0)` linear — see §6.2 — which is NOT
  the WYSIWYG-correct crossfade; `plus-lighter` produces `(0.5, 0.5, 0)`
  which is.)
- `transition-state-resolution-outside-window-no-op` — at
  `time < windowStart` or `time >= windowStart + transition.duration`,
  assert `layerA.opacity` and `layerB.opacity` are unchanged from their
  pre-transition values and `layerA.blendMode`/`layerB.blendMode` are
  whatever the element's own `blendMode` field declares (matches §6.2
  `if (time < windowStart || time >= mediaTimeAdd(windowStart,
  transition.duration)) continue`)
- `transition-state-resolution-wipe-presentation-dispatched-from-registry` —
  transition `{type: 'crossfade', presentation: 'wipe-left', duration: 1s}`;
  assert the presentation key resolves in the 27-entry registry (§6.1A)
  without touching the planner or the wire protocol, and that the wipe
  edge is rendered by the presentation shader — NOT by a `layerB.mask`
  (supersedes the seed's single-tier wipe-as-mask behavior, §6.1A)
- `transition-state-resolution-slide-presentation-dispatched-from-registry` —
  transition `{type: 'crossfade', presentation: 'slide-left', duration:
  1s}`; assert the structural clips never move (`layerA.transform` /
  `layerB.transform` are unmodified — the slide displacement is a
  presentation-shader effect, §6.1A; the visual offset is verified in the
  Tier 2 render tests)

**FrameDescriptor Zod schema validation (spec §4):**

- `framedescriptor-schema-valid-descriptor-parses` — construct a
  minimally valid `FrameDescriptor` by hand (1 layer, no effects, no
  mask); assert `FrameDescriptorSchema.parse(descriptor)` returns the
  same object (no fields stripped); `items[0]` is parsed as the `Layer`
  variant of the discriminated union (`type: 'layer'`)
- `framedescriptor-schema-invalid-displaymode-rejected` —
  `displayMode.transfer = 'gamma-2.2'` (not in the allowed set
  `'srgb' | 'pq' | 'hlg'`); assert Zod throws with
  `issue.code = 'invalid_enum_value'` and
  `issue.path = ['displayMode', 'transfer']`
- `framedescriptor-schema-invalid-blendmode-rejected` — layer with
  `blendMode: 'softlight'` (not kebab-case; must be `'soft-light'`); assert
  Zod throws (matches §4 BlendMode list of 17 kebab-case variants)
- `framedescriptor-schema-sceneeffect-discriminator-resolves` — item
  with `type: 'sceneEffect'` parses to the `SceneEffect` variant (which
  has `effectPassGroups` but no `id` / `textureId` / `transform` —
  matches §4 SceneEffect interface)
- `framedescriptor-schema-colorspace-required-on-layer` —
  `sourceColorSpace` is required on every `Layer` (per §4 "OUR
  EXTENSION — OpenCut has no per-layer color space"); omitting it
  throws `issue.code = 'invalid_type'`,
  `issue.path = ['items', 0, 'sourceColorSpace']`
- `framedescriptor-schema-maskdescriptor-fields-validated` —
  `mask.textureId` must be a string, `mask.feather` must be a non-negative
  number, `mask.inverted` must be a boolean; assert each invalid variant
  throws with the right `issue.path` and `issue.code`

### Tier 2: Render tests

[Filename: `tests/integration/07-composition/*.render.test.ts`]

Tier 2 for this stream runs in a real Chromium 113+ browser via Playwright
with WebGPU enabled. Each test calls `engine.renderFrame(frame)` (or
equivalent) and either pixel-diffs against a reference PNG (regenerated per
spec 17 §10) or samples specific pixels and asserts exact sRGB values.

All pixel assertions use **scene-linear arithmetic** (per spec 04): solid
sRGB colors are converted to linear via the sRGB EOTF before blending, and
the expected sRGB output is the linear result converted back via the
inverse EOTF. The arithmetic is given inline for each blend test so the
expected value is auditable.

**Transition tests (spec §6):**

- `transition-crossfade-at-t0-only-red-visible` — project
  `with-transitions.json` (3 clips with crossfades), examine the first
  transition between clip-1 (solid red) and clip-2 (solid green); render
  the frame at the transition start (t=0); assert center pixel is
  `rgb(255, 0, 0)` (only red visible, opacity 1.0, blendMode
  `'plus-lighter'` with layerB.opacity = 0 produces no green contribution)
- `transition-crossfade-at-t0-5-is-187-187-0` — render the frame at
  t=0.5 (mid-transition); assert center pixel is `rgb(187, 187, 0)`
  within tolerance 1% (the linear-dissolve result: `red_linear × 0.5 +
  green_linear × 0.5 = (0.5, 0.5, 0)` linear, converted back to sRGB ≈
  `(187, 187, 0)`. Achieved via `blendMode: 'plus-lighter'` set on both
  layers for the transition window — see §6.2 `applyPresentation`.)
- `transition-crossfade-at-t1-only-green-visible` — render the frame at
  t=1.0 (transition end); assert center pixel is `rgb(0, 255, 0)` (only
  green visible, opacity 1.0)
- `transition-wipe-creates-hard-edge-at-t0-5` — wipe presentation
  (`presentation: 'wipe-left'`) with feather 0; render frame at t=0.5;
  assert left half of frame is clip-A (red) and right half is clip-B
  (green), with a 1-pixel transition at the midpoint (no feather);
  pixel-diff against `with-transitions-wipe-frame-30.png` reference at
  tolerance 0.5%
- `transition-wipe-feather-creates-smooth-edge` — wipe presentation
  (`presentation: 'wipe-left'`) with feather 20 pixels; render frame at
  t=0.5; sample 5 pixels across the
  wipe edge (at x = mid-10, mid-5, mid, mid+5, mid+10); assert opacity
  ramps smoothly from 1.0 to 0.0 across the feather region (JFA SDF +
  smoothstep per §8.4 — applied inside the wipe presentation's shader,
  not to a layer mask)
- `transition-outside-window-renders-as-normal-cut` — frame 5 seconds
  before the transition starts; assert pixels match the untransitioned
  clip-A reference (transition is a no-op outside its window — §6.2 early
  return)

**Effect ordering tests (spec §7.3):**

- `effect-ordering-blur-plus-colorwheels-plus-lut-resolves-to-color-then-spatial` —
  project `with-effects.json` (clip with `[gaussian-blur, color-wheels,
  lut]` effects added in that order); capture the `FrameDescriptor` via
  `engine.command.apply({type: 'snapshot'})` + descriptor accessor; assert
  `items[0].effectPassGroups` is
  `[[color-wheels-pass], [lut-pass], [gaussian-blur-h-pass,
  gaussian-blur-v-pass]]` (color first, then spatial — §7.3 ordering rule,
  even though the effects were added blur-first to the timeline)
- `effect-ordering-color-then-spatial-pixel-diff` — render frame 0 of the
  `with-effects.json` project; pixel-diff against a reference rendered
  with the *manually re-ordered* effect chain `[color-wheels, lut,
  gaussian-blur]` — the two renders must match within tolerance 0.5%
  (proves the composition runtime's re-ordering produces the same pixels
  as a hand-ordered chain)

**Mask tests (spec §8):**

- `mask-rectangular-only-masked-region-graded` — project `with-masks.json`
  (clip with a rectangular shape mask covering the left half of the frame
  + a `color-wheels` effect that shifts red→blue); render frame 0; assert
  left-half pixels are blue (color-wheels applied through the mask) and
  right-half pixels are red (no mask coverage → no grading); pixel-diff
  against `with-masks-frame-0.png` at tolerance 0.5%
- `mask-feathering-jfa-sdf-smooth-edge` — rectangular mask with
  `feather: 20px`; render frame 0; sample 5 pixels perpendicular to the
  mask edge (at offsets -20, -10, 0, +10, +20 from the edge); assert the
  color-wheels effect contribution ramps smoothly from 0% to 100% across
  the 40-pixel feather region (JFA-computed SDF + `smoothstep`, per §8.4)
- `mask-inverted-renders-complement-region` — same mask but with
  `inverted: true`; render frame 0; assert right-half pixels are blue
  (graded) and left-half pixels are red (ungraded) — the complement of
  the non-inverted test
- `mask-multiple-2-masks-both-applied-in-order` — layer with two masks:
  `[mask-rect-left-half, mask-rect-bottom-half]` (intersection = bottom-left
  quadrant); render frame 0; assert only the bottom-left quadrant is
  graded (intersection semantics — §8.3 "applied in order" with default
  `MaskCombinePipeline` multiply alpha); other 3 quadrants are ungraded
- `mask-image-mask-renders-from-asset` — layer with an image mask using
  `mediaId: 'mask-alpha-1'` (an imported PNG with a soft alpha edge);
  render frame 0; pixel-diff against `with-image-mask-frame-0.png` at
  tolerance 1.0% (image mask path is less pixel-exact due to PNG
  resampling)
- `mask-qualifier-keyer-green-screen` — layer with a qualifier mask
  `{type: 'qualifier', qualifierParams: {hue: 120°, hueTolerance: 30°}}`
  applied over a green-screen source clip; render frame 0; assert the
  green regions are ungraded (qualifier-masked out) and non-green regions
  are graded (qualifier passes through)

**Layer ordering + multi-track blend tests (spec §5.2, spec 17 §5.1):**

- `layer-ordering-5-layers-composite-correct-order` — project with 5
  layers: main red + overlay-1 blue (50% opacity, top-right quadrant) +
  overlay-2 green (50% opacity, top-left quadrant) + 2 audio tracks;
  render frame 0; assert audio tracks contribute zero pixels (no visual
  presence); assert the visible composite shows red as the base with
  blue and green quadrants overlaid in the correct spatial regions
- `multi-track-blend-red-main-green-overlay-50-percent-center-187-187-0` —
  project `multi-track-blend.json` (red main track at 100% opacity +
  green overlay track at 50% opacity, both filling the frame); render
  frame 0; assert center pixel is `rgb(187, 187, 0)` within tolerance 1%
  (linear-light source-over: `green_linear × 0.5 + red_linear × (1 - 0.5)
  = (0.5, 0.5, 0)` linear ≈ `(187, 187, 0)` sRGB. This is the
  architecturally-correct scene-linear blend, NOT the naive sRGB-space
  `rgb(127, 127, 0)` that the seed spec §12.7 erroneously specified — see
  §13.11 correction below.)
- `multi-track-blend-screen-mode-produces-lighter-result` — same setup
  but `overlay.blendMode = 'screen'`, opacity 100%; render frame 0;
  assert center pixel is `rgb(255, 255, 0)` (screen blend formula
  `1 - (1-a)(1-b)` applied per channel in linear-light: red =
  `1 - (1-1)(1-0) = 1`, green = `1 - (1-0)(1-1) = 1`, blue =
  `1 - (1-0)(1-0) = 0` → linear `(1, 1, 0)` → sRGB `rgb(255, 255, 0)`).
  Tolerance 0.5%
- `multi-track-blend-multiply-mode-produces-darker-result` — same setup
  but `overlay.blendMode = 'multiply'`, opacity 100%; render frame 0;
  assert center pixel is `rgb(0, 0, 0)` (multiply in linear: red × green
  = (1)(0) = 0; green × red = (0)(1) = 0; blue = 0; result = `(0, 0, 0)`)
- `layer-opacity-zero-fully-transparent` — overlay at opacity = 0; render
  frame 0; assert center pixel matches the main track's reference exactly
  (overlay contributes nothing)
- `layer-opacity-25-percent-quarter-blend` — overlay at opacity = 0.25;
  render frame 0; assert center pixel is `rgb(255 × 0.75 + 0 × 0.25, 0 ×
  0.75 + 255 × 0.25, 0)` sRGB-converted = `(0.75, 0.25, 0)` linear ≈
  `rgb(224, 137, 0)` sRGB. Tolerance 1%

**Cache tests (spec §10.2):**

- `cache-hit-same-state-frame-returns-same-reference` — call
  `engine.renderFrame(100)` twice in succession (no state mutation between);
  assert the second call's `FrameDescriptor` is the *same object
  reference* (`expect(fd1).toBe(fd2)` — referential equality, not deep
  equality — proves the FrameDescriptorCache (§10.2) returned the cached
  entry, not a fresh build). Matches §10.2 `createFrameCompositionSceneCache`
  single-slot cache contract
- `cache-miss-different-frame-rebuilds` — call `engine.renderFrame(100)`,
  then `engine.renderFrame(101)`; assert the two descriptors are NOT the
  same object reference (`expect(fd1).not.toBe(fd2)`) — different frame
  number means different cache key
- `cache-miss-after-state-change-trim` — call `engine.renderFrame(100)`;
  apply a trim op (`engine.command.apply({type: 'trim', params:
  {elementId: 'main-1', edge: 'end', delta: -1000, ripple: false}})`);
  call `engine.renderFrame(100)` again; assert the third descriptor is
  NOT the same object reference as the first (stateHash changed —
  §10.2 invalidates on state change via `FrameInvalidationRequest`)
- `cache-miss-after-addEffect` — call `engine.renderFrame(100)`; apply
  `addEffect` (`engine.command.apply({type: 'addEffect', params:
  {elementId: 'main-1', effect: {type: 'color-wheels', enabled: true,
  params: {...}}}})`); call `engine.renderFrame(100)`; assert the new
  descriptor is a fresh object (cache miss — effect list changed)
- `cache-hit-after-undo-restores-state` — call `engine.renderFrame(100)`;
  apply `addEffect`; `engine.command.apply({type: 'undo'})`; call
  `engine.renderFrame(100)`; assert the third descriptor is the *same
  object reference* as the first (stateHash rolled back to the original
  value, cache hit on the pre-`addEffect` key)

**Cloud render WYSIWYG (spec 17 §6.2 — browser == cloud pixel diff):**

- `cloud-render-wysiwyg-multi-track-blend-frame-0` — render frame 0 of
  `multi-track-blend.json` in the browser via `engine.renderFrame(0)`;
  render the same frame via the headless cloud render path
  (`createRenderEngine(state).renderFrame(0)`, per spec 01 §3.6 two-entry-
  point design); assert both pixel buffers are byte-identical
  (`expect(browserPixels).toEqual(cloudPixels)`). This is the
  architectural invariant from `00-master-spec.md` Decision 6 ("one engine,
  two entry points") — the composition runtime MUST produce identical
  output regardless of entry point, since `buildFrameDescriptor` is pure
- `cloud-render-wysiwyg-transition-frame-15` — same as above but for
  `with-transitions.json` frame 15 (mid-transition between clip-1 and
  clip-2); assert byte-identical pixels between browser and cloud paths

### Tier 3: UI tests

[Filename: `tests/integration/07-composition/*.ui.test.ts`]

Tier 3 for this stream verifies the keyboard shortcut → EngineCommand →
manager-method → state-mutation path (spec 16 Pattern 1: real keyboard via
Playwright `page.keyboard.press()`) and asserts the resulting `SceneState`
matches the direct `engine.command.apply()` path (spec 17 §6.1 state
WYSIWYG invariant).

- `keyboard-add-effect-preset-1-via-number-key` — load
  `single-clip-red.json` (1 main-clip element), select it via
  `engine.selection.setSelectedElements(['main-1'])`; press `1` (apply
  effect preset 1, per spec 16 §3.11 — `1`–`9` issue `{type: 'addEffect',
  params: {elementId: <selected>, effect: <presetN>}}`); assert the
  resulting `SceneState` matches a direct
  `engine.command.apply({type: 'addEffect', params: {elementId: 'main-1',
  effect: PRESET_1}})` call (state WYSIWYG, spec 17 §6.1). The matching
  preset definition lives in `src/engine/presets/effect-presets.ts`
  (shared between the keyboard handler's `EffectPresetResolver` and the
  test fixture).
- `keyboard-toggle-effect-on-off-via-shift-number` — with one effect
  applied to `main-1` from the previous test, press `Shift+1` (toggle
  effect 1 on/off, per spec 16 §3.11); assert the effect's `enabled`
  field flips from `true` to `false`; press `Shift+1` again; assert it
  flips back to `true`. Resulting state matches a direct
  `engine.command.apply({type: 'toggleEffect', params: {elementId:
  'main-1', effectIndex: 0}})` call
- `keyboard-toggle-focused-effect-via-cmd-shift-e` — focus the effects
  panel (`Cmd+3` switches to Effects workspace per spec 16 §3.8, then
  `Tab` cycles focus per §3.11); press `Cmd+Shift+E` (enable/disable
  currently-focused effect); assert the focused effect's `enabled` flips.
  Resulting state matches direct `engine.command.apply({type:
  'toggleEffect', params: {elementId: 'main-1', effectId: <focused>}})`
- `keyboard-add-effect-equals-direct-apply-state-wysiwsg` — meta-test:
  run the keyboard path for each of `1`–`9` (9 effect presets) and the
  direct-apply path for the same 9 presets; for each preset, snapshot
  `engine.serialize()` after the keyboard path and after the direct path
  (resetting state between); assert the two snapshots are deep-equal.
  This is the spec 17 §6.1 state WYSIWYG invariant specialized to spec 07
  — the keyboard handler must not introduce any UI-only state drift
- `add-transition-via-direct-engine-command-no-keyboard-shortcut` —
  spec 16 §3 registers NO keyboard shortcut for `addTransition`
  (transitions are authored via mouse drag between clip edges on the
  timeline, not via keyboard). Verify the direct-apply path:
  `engine.command.apply({type: 'addTransition', params: {transition:
  {type: 'crossfade', presentation: 'fade', duration: 1_000_000,
  leftElementId: 'main-1', rightElementId: 'main-2'}}}})` adds a
  transition between the
  two adjacent clips; assert the resulting `SceneState.scene.transitions`
  array contains the new transition and `buildFrameDescriptor(state, 30)`
  (mid-transition) emits both layers with the crossfade opacity
  multipliers applied (cross-reference to the Tier 1 test
  `transition-state-resolution-crossfade-opacity-multipliers`)
- `add-mask-via-direct-engine-command-no-keyboard-shortcut` — same as
  above for `addMask` (no keyboard shortcut per spec 16 §3 — masks are
  authored via the mask-drawing tool in the viewer); verify
  `engine.command.apply({type: 'addMask', params: {elementId: 'main-1',
  mask: {type: 'shape', shape: 'rectangle', shapeParams: {...}, feather:
  10, inverted: false, enabled: true, opacity: 1.0}}})` adds the mask;
  assert `buildFrameDescriptor(state, 0)` emits a Layer with `masks` array
  of length 1 containing the new mask descriptor (cross-reference to the
  Tier 1 test `maskdescriptor-building-shape-mask-texture-id`)
- `add-effect-via-mouse-on-effects-panel-state-wysiwsg` — load
  `single-clip-red.json`; click the "Add Effect" button in the effects
  panel (`page.click('[data-testid="add-effect-button"]')`); select
  "Color Wheels" from the dropdown; assert the resulting state matches
  a direct `engine.command.apply({type: 'addEffect', params:
  {elementId: 'main-1', effect: {type: 'color-wheels', enabled: true,
  params: DEFAULT_COLOR_WHEELS_PARAMS}}})` call. (Mouse path — spec 16
  Pattern 4 — used because some authoring flows have no keyboard
  equivalent.)

### Property-based tests

[Filename: `tests/unit/07-composition/*.property.test.ts`]

Property-based tests use `fast-check` (`fc.assert(fc.property(...))`) to
verify invariants over 1000 randomly-generated `SceneState`s. The state
arbitrary is `arbitrarySceneState` (defined in `tests/helpers/arbitraries/
scene-state.ts`, shared with spec 06's property tests). Each test below
includes the exact `fc.assert` call shape.

- `buildframedescriptor-purity-1000-random-states` —
  `fc.assert(fc.property(arbitrarySceneState, fc.integer({min: 0, max:
  10000}), (state, frame) => { const fd1 = buildFrameDescriptor(state,
  frame); const fd2 = buildFrameDescriptor(structuredClone(state), frame);
  expect(fd1).toEqual(fd2); }), { numRuns: 1000 })` — for any state and
  any frame, building the descriptor from the original state and from a
  deep-cloned (value-equal) state produces deep-equal descriptors. Locks
  down spec §2.1 purity invariant + spec 17 §7 row "07 Composition —
  `buildFrameDescriptor(state, t)` is pure"
- `active-element-resolution-half-open-interval-1000-random-states` —
  `fc.assert(fc.property(arbitrarySceneState, fc.integer({min: 0, max:
  10000}), (state, frame) => { const fd = buildFrameDescriptor(state,
  frame); const time = mediaTimeFromFrame({frame, rate: state.scene.settings.fps});
  for (const item of fd.items) { if (item.type !== 'layer') continue; const
  el = getElementById(state, item.id); expect(el.startTime).toBeLessThanOrEqual(time);
  expect(mediaTimeAdd(el.startTime, el.duration)).toBeGreaterThan(time); }
  }), { numRuns: 1000 })` — every Layer in the descriptor corresponds to
  an element whose `[startTime, startTime+duration)` half-open interval
  contains the queried time. Locks down spec §5.3 invariant
- `layer-ordering-main-before-overlay-1000-random-states` —
  `fc.assert(fc.property(arbitrarySceneState, fc.integer({min: 0, max:
  10000}), (state, frame) => { const fd = buildFrameDescriptor(state,
  frame); const layerIds = fd.items.filter(i => i.type === 'layer').map(i
  => i.id); const mainIds = new Set(state.scene.tracks.main.elements);
  const firstOverlayIdx = layerIds.findIndex(id => !mainIds.has(id));
  if (firstOverlayIdx !== -1) { for (let i = firstOverlayIdx; i <
  layerIds.length; i++) { expect(mainIds.has(layerIds[i])).toBe(false); }
  } }), { numRuns: 1000 })` — every main-track Layer appears before every
  overlay-track Layer in the `items` array (spec §5.2 ordering rule). If
  the descriptor has any overlay layers, none of the layers after the
  first overlay should be main-track layers
- `transition-opacity-multipliers-sum-le-1-1000-random-states` —
  `fc.assert(fc.property(arbitrarySceneStateWithTransition, fc.integer(),
  (state, frame) => { const fd = buildFrameDescriptor(state, frame); const
  tr = state.scene.transitions[0]; const a = fd.items.find(i => i.id ===
  tr.leftElementId); const b = fd.items.find(i => i.id ===
  tr.rightElementId); if
  (a && b) { expect(a.opacity + b.opacity).toBeLessThanOrEqual(1.0 +
  1e-6); } }), { numRuns: 1000 })` — for any state with one transition,
  if both transition endpoints are active at the queried frame, the sum
  of their opacity multipliers is ≤ 1.0 (crossfade formula `1-t + t = 1`,
  and outside the window the formula doesn't apply so this constraint is
  trivially satisfied). Catches regression where the crossfade formula
  could produce opacities > 1.0 due to floating-point error accumulation
- `cache-state-hash-stable-across-1000-runs` —
  `fc.assert(fc.property(arbitrarySceneState, (state) => { const h1 =
  stateHash(state); const h2 = stateHash(structuredClone(state));
  expect(h1).toBe(h2); }), { numRuns: 1000 })` — the stateHash function
  used as the cache key (§10.2) is stable: deep-equal states produce
  identical hashes. (Without this property, the cache would miss
  constantly, defeating the purpose.) Uses `JSON.stringify` with sorted
  keys as the canonical hash input
- `effect-chain-reordering-idempotent-1000-random-states` —
  `fc.assert(fc.property(arbitraryEffectArray, (effects) => { const
  sorted1 = reorderEffectPassGroups(effects); const sorted2 =
  reorderEffectPassGroups(sorted1); expect(sorted1).toEqual(sorted2); }),
  { numRuns: 1000 })` — the effect chain reordering pass (§7.3 — color
  first, then color transforms, then spatial, then stylize) is idempotent:
  applying it twice produces the same output as applying it once. Catches
  regressions where the reorder could shuffle equal-priority effects on
  each pass

### Test assets

Test assets reference canonical fixtures from `17-test-plan.md` §5 (no new
fixture names invented — all are listed in spec 17 §5.1 / §5.3 tables).

**Video fixtures (spec 17 §5.1 — solid-color clips):**

- `tests/fixtures/videos/10s-red-1080p.mp4` — solid red, 10s, for blend tests
- `tests/fixtures/videos/10s-green-1080p.mp4` — solid green, 10s, for blend tests
- `tests/fixtures/videos/10s-blue-1080p.mp4` — solid blue, 10s, for blend tests
- `tests/fixtures/videos/10s-white-1080p.mp4` — solid white, for opacity tests
- `tests/fixtures/videos/10s-black-1080p.mp4` — solid black, for opacity tests
- `tests/fixtures/videos/10s-gray-50-1080p.mp4` — mid-gray, for transform / scale tests
- `tests/fixtures/videos/10s-gradient-h-1080p.mp4` — horizontal gradient, for mask feather edge tests

**Project fixtures (spec 17 §5.3 — pre-built JSON projects):**

- `tests/fixtures/projects/multi-track-blend.json` — red main + green overlay @ 50% opacity (registered in spec 17 §5.3; used for Tier 1 layer ordering + Tier 2 multi-track blend + cloud-render WYSIWYG tests)
- `tests/fixtures/projects/with-transitions.json` — 3 clips with crossfades between them (registered in spec 17 §5.3; used for all Tier 1 transition-state + Tier 2 crossfade/wipe/slide tests)
- `tests/fixtures/projects/with-effects.json` — clip with blur + color wheels + LUT applied (registered in spec 17 §5.3 in Round 7 — see spec 17 §5.3's with-effects.json row; used for Tier 1 effectpass-resolution-chain-ordering + Tier 2 effect-ordering tests)
- `tests/fixtures/projects/with-masks.json` — clip with rectangular mask + 10px feather (registered in spec 17 §5.3 in Round 7 — `with-masks.json` extends `with-mask.json` with multiple masks per layer for §8.3 tests)
- `tests/fixtures/projects/single-clip-red.json` — single main-track element with red fill (used for Tier 3 keyboard add-effect tests; minimal project for fast test runs)
- `tests/fixtures/projects/green-screen.json` — clip with green-screen background for qualifier mask tests (registered in spec 17 §5.3 in Round 7)

**Reference PNGs (spec 17 §5.4 — regenerated per §10):**

- `tests/fixtures/references/{linux-nvidia,macos-m2,windows-d3d12}/multi-track-blend-frame-0.png` — expected output for `multi-track-blend.json` frame 0 (center pixel `rgb(187, 187, 0)`)
- `tests/fixtures/references/{platform}/with-transitions-frame-0.png` — t=0 of the first crossfade (only red visible)
- `tests/fixtures/references/{platform}/with-transitions-frame-15.png` — t=0.5 of the first crossfade (`rgb(187, 187, 0)` center)
- `tests/fixtures/references/{platform}/with-transitions-frame-30.png` — t=1.0 of the first crossfade (only green visible)
- `tests/fixtures/references/{platform}/with-transitions-wipe-frame-30.png` — wipe transition at t=0.5 (hard edge, no feather)
- `tests/fixtures/references/{platform}/with-effects-frame-0.png` — effect chain `[blur, color-wheels, lut]` re-ordered to `[color-wheels, lut, blur-h, blur-v]`
- `tests/fixtures/references/{platform}/with-masks-frame-0.png` — rectangular mask + feather, color-wheels graded only inside mask
- `tests/fixtures/references/{platform}/with-image-mask-frame-0.png` — image mask with soft alpha edge

**Mask / LUT assets:**

- `tests/fixtures/masks/mask-alpha-1.png` — 1920×1080 PNG with soft alpha edge (radial gradient) for image-mask tests
- `tests/fixtures/luts/identity.cube` — 33×33×33 identity LUT (no-op) for LUT-effect ordering tests (registered in spec 17 §5.5)
- `tests/fixtures/luts/red-to-blue.cube` — 17×17×17 LUT mapping red→blue for visible LUT-application tests

**Arbitrary generators (helpers):**

- `tests/helpers/arbitraries/scene-state.ts` — `arbitrarySceneState` (reused from spec 06); `arbitrarySceneStateWithTransition` (extends with 1 transition between two adjacent main-track elements); `arbitraryEffectArray` (array of 0–10 effects from the spec 08 effect type registry)

### Test commands

```bash
# Run Tier 1 (pure engine) tests for spec 07
npm test -- --filter "07-composition"

# Run Tier 2 (render / pixel-diff) tests for spec 07
npm run test:render -- --filter "07-composition"

# Run Tier 3 (UI / keyboard) tests for spec 07
npm run test:ui -- --filter "07-composition"

# Run all tiers for spec 07
npm run test:all -- --filter "07-composition"

# Run property-based tests only (1000 runs each)
npm run test:property -- --filter "07-composition"

# Regenerate reference PNGs for this module's fixtures (see spec 17 §10)
npm run regen-references -- --filter "07-composition"
```

### Coverage summary

| Tier | Test count | What it locks down |
|---|---|---|
| Tier 1 (pure Vitest) | 32 | `buildFrameDescriptor` purity (3: deep-equal / no-side-effects / cloned-state-determinism), layer ordering (3: main-first / overlay-time-order / background-prepend), active-element resolution (3: half-open interval / gap / hidden-skip), transform resolution (3: static / negative-scale-as-flip / animated-keyframe), effect pass resolution (5: color-wheels-single / gaussian-blur-h+v / disabled-skip / chain-reorder-color-then-spatial / keyframed-param), mask descriptor building (4: shape / image / qualifier / multiple), transition state resolution (5: crossfade opacity multipliers / `plus-lighter` blend for clean linear-dissolve / outside-window-noop / wipe-presentation / slide-presentation), FrameDescriptor Zod schema validation (6: valid / invalid-displaymode / invalid-blendmode / sceneeffect-discriminator / colorspace-required / maskdescriptor-fields) |
| Tier 2 (Playwright + WebGPU) | 27 | Transition crossfade at t=0 / 0.5 / 1.0 (center pixel `rgb(255,0,0)` / `rgb(187,187,0)` / `rgb(0,255,0)`); wipe hard-edge + feathered-edge; transition-outside-window; effect ordering (chain reorder + pixel-diff); mask (rectangular / feathered-jfa-sdf / inverted / multiple / image / qualifier); 5-layer composite; multi-track blend (red+green@50% → `rgb(187,187,0)` sRGB-linear); screen/multiply blend modes; opacity 0% / 25% / 100%; cache hit / miss-different-frame / miss-after-trim / miss-after-addEffect / hit-after-undo; cloud-render WYSIWYG (browser == cloud byte-identical for multi-track-blend + transition-frame-15) |
| Tier 3 (Playwright keyboard) | 7 | `1` apply effect preset, `Shift+1` toggle effect, `Cmd+Shift+E` toggle focused effect, state-WYSIWYG meta-test across 9 presets, `addTransition` via direct EngineCommand (no keyboard shortcut registered), `addMask` via direct EngineCommand (no keyboard shortcut), `addEffect` via mouse on effects panel |
| Property (fast-check, 1000 runs each) | 6 | Purity (deep-clone → deep-equal descriptor); active-element half-open interval invariant; layer ordering (main before overlay); transition opacity multiplier sum ≤ 1.0; stateHash stability; effect chain reordering idempotence |
| **Total** | **72** | Every goal from spec §2 (pure, cacheable, composable, transition-aware, effect-aware, mask-aware) verified; every SCOUT-07 correction preserved (tree-walk algorithm §13.1, multi-mask support §8.3, OpenCut-classic `.reverse()` ordering §5.2, sign-as-flip transform trick §5.4); spec 17 §3 matrix rows for spec 07 fully covered; new §13.11 correction added to catalog (multi-track blend expected pixel `rgb(187,187,0)` not `rgb(127,127,0)`) |

---

**End of `07-composition.refined.md`.** Next: `08-color-grading.refined.md`.

# 07 — Composition: Scene Graph, Layer Model, Blend Modes, Transitions

**Stream:** Composition runtime (builds FrameDescriptor from SceneState)
**Status:** Seed spec (sub-agent scout will refine with code references)
**Primary teacher:** FreeCut `composition-runtime/` + OpenCut-classic `compositor/`
**Spec file:** `07-composition.md`

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
│  - items: Layer[] | SceneEffect[]                 │
│    Each Layer has: textureId, transform, blendMode │
│    opacity, effects, mask, transition              │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│ Renderer (see 04-renderer-color.md)               │
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

```ts
interface FrameDescriptor {
  width: number;
  height: number;
  clear: { color: [number, number, number, number] };  // linear-light RGBA
  displayMode: DisplayMode;  // SDR-sRGB, HDR-PQ, HDR-HLG
  items: FrameItem[];
}

interface DisplayMode {
  primaries: 'bt709' | 'bt2020' | 'display-p3';
  transfer: 'srgb' | 'pq' | 'hlg';
  toneMap: 'none' | 'reinhard' | 'aces-filmic';
}

type FrameItem = Layer | SceneEffect;

interface Layer {
  type: 'layer';
  id: string;
  textureId: string;              // pre-uploaded via renderer.uploadTexture
  sourceColorSpace: ColorSpace;  // for YUV→linear shader selection
  transform: LayerTransform;
  opacity: number;                // 0.0 to 1.0
  blendMode: BlendMode;
  effects: EffectPass[][];
  mask: MaskDescriptor | null;
}

interface LayerTransform {
  // Quad-only transform (matches OpenCut-classic)
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

interface EffectPass {
  shader: string;                 // 'gaussian-blur' | 'color-wheels' | 'curves' | 'lut' | ...
  uniforms: Record<string, number | number[]>;
}

interface MaskDescriptor {
  textureId: string;              // mask texture (pre-uploaded)
  feather: number;                // pixels
  inverted: boolean;
}

interface ColorSpace {
  primaries: 'bt709' | 'bt2020' | 'smpte-c' | 'display-p3';
  transfer: 'srgb' | 'pq' | 'hlg' | 'bt709';
  matrix: 'bt709' | 'bt2020-ncl' | 'bt601';
  range: 'limited' | 'full';
}
```

**Reference:** OpenCut-classic's `FrameDescriptor` (in `rust/crates/compositor/src/frame.rs`) is the inspiration. We extend it with:
- 10-bit color space metadata
- Tone mapping for HDR
- Multiple masks per layer (OpenCut limits to 1)
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

### 5.2 Layer ordering

```
Composite order (back to front):
1. main video track (single track, all elements in time order)
2. overlay tracks (top to bottom: overlay-2 first, then overlay-1)
3. (scene effects applied at the end, over the composite)
```

Within a track, only one element is active at a time (no overlaps allowed on main track). On overlay tracks, multiple elements may be active — they composite in order.

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
    effects: buildEffectPasses(el.effects, time),
    mask: el.masks[0] ? buildMaskDescriptor(el.masks[0], time) : null,
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

---

## 6. Transitions

### 6.1 Transition model

```ts
interface Transition {
  id: string;
  type: 'crossfade' | 'wipe' | 'slide' | 'iris' | 'glitch' | ...;
  duration: MediaTime;
  params: TransitionParams;
  
  // Applied between element A and element B
  elementAId: string;
  elementBId: string;
}

interface TransitionParams {
  // Type-specific params
  // e.g., wipe: direction, feather
  // e.g., slide: direction, distance
}
```

### 6.2 Transition resolution

At a given time during a transition:
- Both elements are active (overlap region)
- Each element's opacity / transform is modified by the transition state
- The transition itself may render an effect (e.g., wipe mask)

```ts
function applyTransitions(
  layers: Layer[],
  transitions: Transition[],
  time: MediaTime
): Layer[] {
  for (const transition of transitions) {
    const layerA = layers.find(l => l.id === transition.elementAId);
    const layerB = layers.find(l => l.id === transition.elementBId);
    if (!layerA || !layerB) continue;
    
    const transitionStart = getElement(layerB.id).startTime;
    const transitionEnd = mediaTimeAdd(transitionStart, transition.duration);
    
    if (time < transitionStart || time >= transitionEnd) continue;
    
    const t = mediaTimeToSeconds({ time: mediaTimeSub(time, transitionStart) }) 
            / mediaTimeToSeconds({ time: transition.duration });  // 0.0 to 1.0
    
    // Apply transition state to both layers
    applyTransitionState(transition, layerA, layerB, t);
  }
  return layers;
}

function applyTransitionState(transition: Transition, layerA: Layer, layerB: Layer, t: number) {
  switch (transition.type) {
    case 'crossfade':
      layerA.opacity *= (1 - t);
      layerB.opacity *= t;
      break;
    case 'wipe':
      // Add a mask to layerB that wipes from one side to the other
      const wipeMask = createWipeMask(transition.params.direction, t, transition.params.feather);
      layerB.mask = wipeMask;
      break;
    case 'slide':
      // Move layerB from off-screen to its position
      const slideOffset = (1 - t) * transition.params.distance;
      layerB.transform = applySlideOffset(layerB.transform, slideOffset, transition.params.direction);
      break;
    // ...
  }
}
```

### 6.3 FreeCut transition reference

FreeCut has `src/infrastructure/gpu-transitions/` with many transition types. Sub-agent to read:
- `transition-pipeline.ts` — main transition orchestrator
- Individual transition implementations (fade, wipe, slide, iris, glitch)
- Canvas 2D fallback (we don't need — WebGPU only)

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

### 7.3 Effect chain ordering

Effects within a layer apply in order:
1. Color grading (wheels, curves, levels, LUT, qualifier)
2. Color transforms (hue, saturation, vibrance, temperature)
3. Spatial (blur, sharpen, denoise)
4. Stylize (glow, bloom, chromatic aberration, vignette)

Each effect takes the previous's output as input. Ping-pong textures in the renderer.

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

Masks are pre-computed (not per-frame, unless animated):
- Shape masks: rasterize to a mask texture once
- Image masks: use the source alpha channel
- Qualifier masks: run the HSL keyer on the source frame to produce a mask texture

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

### 8.4 Mask feathering (JFA)

For feathered masks, use JFA to compute the signed distance field, then `smoothstep` to produce the feather edge:

```ts
// Renderer pseudo-code
async function applyMaskFeather(maskTexture: GPUTexture, feather: number): Promise<GPUTexture> {
  // 1. JFA init pass: seed with mask shape
  // 2. JFA step passes (ceil(log2(maxDim)) passes): propagate distances
  // 3. JFA distance pass: combine inside/outside SDFs, apply smoothstep
  // ... (see 04-renderer-color.md §8.4)
}
```

We adopt OpenCut-classic's JFA shaders (`rust/crates/masks/src/shaders/jfa_*.wgsl`) but consider rewriting as compute shaders for ~2x perf.

---

## 9. Audio Composition

Audio is composed separately from video:
- Audio doesn't go through the GPU pipeline
- Audio mixing happens in Web Audio (`AudioContext` for interactive, `OfflineAudioContext` for render)
- Each audio element creates an `AudioBufferSourceNode` (or streaming equivalent) → varispeed → gain → channel splitter → master mix

See `03-playback-engine.md` §9 for the audio graph.

---

## 10. Caching

### 10.1 Layer texture cache

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

### 10.2 FrameDescriptor cache

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

---

## 11. Open Questions for Sub-Agent Scout

1. **FreeCut `composition-runtime/` directory.** Read the full directory structure. List every file. For each, summarize purpose.

2. **FreeCut `composition-runtime/components/main-composition.tsx`** (or equivalent). Read in full. Document:
   - How it walks the SceneState
   - How it builds the FrameDescriptor equivalent (FreeCut may not have an explicit FrameDescriptor — it may render directly)
   - How it handles transitions
   - How it handles effects
   - How it handles masks

3. **FreeCut `composition-runtime/components/video-content.tsx`, `audio-content.tsx`, `text-content.tsx`, `shape-content.tsx`, etc.** Read each. Document the per-type composition logic.

4. **FreeCut `composition-runtime/deps/`.** Read each contract file. Document the contract surface (already partially documented in `01-core-engine.md`).

5. **FreeCut `infrastructure/gpu-compositor/compositor-pipeline.ts`.** Read in full. Document:
   - How layers are composited
   - Ping-pong texture management
   - Bind group construction (we'll cache, FreeCut doesn't)
   - Texture pool integration

6. **FreeCut `infrastructure/gpu-effects/effects-pipeline.ts`.** Read in full. Document:
   - Effect chain execution
   - Effect uniform packing
   - 3D LUT upload path
   - Storage texture usage

7. **FreeCut `infrastructure/gpu-transitions/transition-pipeline.ts`.** Read in full. Document:
   - Transition types implemented
   - How transitions modify the layer list
   - Per-transition shader selection

8. **FreeCut `infrastructure/gpu-masks/`.** Read all files. Document:
   - Mask texture management
   - How masks are applied to layers
   - Feather via JFA

9. **OpenCut-classic `rust/crates/compositor/src/`.** Read `frame.rs` (FrameDescriptor), `compositor.rs` (main render loop), `layer.rs` (LayerUniformBuffer). Document the data model.

10. **OpenCut-classic `apps/web/src/services/renderer/`.** Read `gpu-renderer.ts`, `canvas-renderer.ts`, `scene-builder.ts`, `compositor/wasm-compositor.ts`, `compositor/frame-descriptor.ts`. Document how TS builds the FrameDescriptor from SceneState.

11. **OpenCut-classic `apps/web/src/services/renderer/nodes/`.** List and read each node file (`image-node.ts`, `graphic-node.ts`, `text-node.ts`, `effect-node.ts`, etc.). Document the render node tree — this is OpenCut's equivalent of our composition runtime.

12. **FreeCut transitions.** List all transition types implemented in FreeCut's `gpu-transitions/`. For each, note the params and any 2D fallback.

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

**End of `07-composition.md`.** Next: `08-color-grading.md`.

# Integration Re-Audit — Verification of Fixes

**Auditor:** general-purpose (INTEGRATION-REAUDIT)
**Date:** 2026-08-22
**Original review:** `INTEGRATION-REVIEW.md` (7 issues + 5 master updates)
**Revisions audited:** `REVISE-07-04`, `REVISE-MASTER-09`, `REVISE-01-05-11-02` (worklog entries 1919, 1974, 1992)

## Summary

- Integration issues verified: 7 / 7
- All resolved: ✅ 7 / 7
- Master spec updates verified: 5 / 5
- All applied: ✅ 5 / 5

## Verdict: ✅ ALL FIXES APPLIED

All 7 cross-stream integration issues from `INTEGRATION-REVIEW.md` are correctly resolved in the refined specs, and all 5 master spec updates are correctly applied. No new inconsistencies introduced. The refined specs are ready for final sign-off and implementation hand-off.

A few small notes below — none are blockers; they are explanatory comments that mention the OLD API name in the context of "this replaces what the seed spec said". The actual interface definitions, method calls, and field names all use the corrected API.

---

## Per-issue verification

### Issue 1 (CRITICAL): FrameDescriptor shape — specs 04 ↔ 07
**Status:** ✅ FIXED

**Evidence (spec 04 — `04-renderer-color.refined.md`):**
- Line 442: explicitly delegates to spec 07's canonical definition — *"Canonical `FrameDescriptor` shape: Defined in `07-composition.refined.md §4` — `interface FrameDescriptor { width, height, clear, displayMode, items: FrameItem[] }` where `type FrameItem = Layer | SceneEffect`. Each item carries a `type` discriminator (`'layer'` or `'sceneEffect'`); both `Layer` and `SceneEffect` expose `effectPassGroups: EffectPass[][]`. The renderer iterates `descriptor.items` in authored order and dispatches by `type`."*
- Line 484: `async renderFrame(descriptor: FrameDescriptor): Promise<RenderResult>`
- Line 489: `const layerItems = descriptor.items.filter((i): i is Layer => i.type === 'layer');` — uses `descriptor.items`, NOT `descriptor.layers`
- Line 497: `for (const item of descriptor.items) {` — iterates the mixed union
- Grep for `descriptor.layers`, `descriptor.sceneEffects`, `layers: Layer[]`, `sceneEffects: SceneEffect[]`, `layer.effects` → **0 occurrences**

**Evidence (spec 07 — `07-composition.refined.md`):**
- Lines 77-84: canonical `interface FrameDescriptor { width, height, clear, displayMode, items: FrameItem[] }`
- Line 92: `type FrameItem = Layer | SceneEffect` (mixed union with `type` discriminator)
- Line 102: `Layer.effectPassGroups: EffectPass[][]` — aligned with `SceneEffect.effectPassGroups`
- Line 119: `SceneEffect.effectPassGroups: EffectPass[][]` — already correct
- Lines 130-133: canonical `interface EffectPass { shader: string; uniforms: Record<string, number | number[]> }`
- Spec 07's only remaining `Layer.effects` reference (line 1314) is a single line in a §14.2 OpenCut-comparison table that **documents the rename**: *"renamed from `Layer.effects` to match `SceneEffect.effectPassGroups` — REVISE-07-04"*. This is explanatory, not a definition.

**Cross-spec consistency:** Both specs now reference the SAME `FrameDescriptor` interface. Spec 04's `renderFrame()` correctly consumes spec 07's `buildFrameDescriptor()` output. EffectPass shape identical across both.

---

### Issue 2 (CRITICAL): FCPXML colorSpace format in spec 09
**Status:** ✅ FIXED

**Evidence (spec 09 — `09-project-model.refined.md` §8.13, lines 1660-1791):**
- Line 1666: explicitly states the old `formatColorAttrs(colorInfo)` (bare names like `"Rec. 709"` on `<asset>`) is **wrong**, and replaces it with two functions:
  - `formatColorSpaceTriplet(displayMode)` — emits `colorSpace` on `<format>` (lines 1679-1707)
  - `formatColorSpaceOverride(colorInfo, displayMode)` — emits `colorSpaceOverride` on `<asset>` only when asset differs from format (lines 1714-1726)
- Line 1675-1678: comment block stating *"colorSpace lives on `<format>`, NOT on `<asset>` or `<sequence>`."*
- Line 1758: example output — `<format ... colorSpace="1-1-1 (Rec. 709)"/>` — **triplet format on `<format>`** ✅
- Line 1763: example output — `<asset ... colorSpaceOverride="9-16-9 (Rec. 2020 PQ)">` — **`colorSpaceOverride` on `<asset>`** ✅
- Line 1784: Display P3 row — *"NOT in v1.10 DTD — fall back to `"1-1-1 (Rec. 709)"` with a runtime warning (per SCOUT-10)"*
- Lines 1698, 1702-1703: code comment + `console.warn('[FCPXML] Display P3 not in v1.10 DTD — falling back to Rec. 709...')` runtime warning ✅

**Evidence (spec 09 §11 Correction #3, lines 1950-1968):**
- Rewritten — line 1956: *"`<asset>` has NO `colorSpace` attribute. The FCPXML 1.10 DTD (lines 60-104) puts `colorSpace CDATA #IMPLIED` on `<format>` (line 70), and `colorSpaceOverride CDATA #IMPLIED` on `<asset>` (line 99)..."*
- Line 1958: *"`<sequence>` has NO `colorSpace` attribute either"* — explicitly rejects the old "sequence-level colorSpace" framing
- Line 1960: *"Values are triplets, not bare names. The `colorSpace` / `colorSpaceOverride` attribute value is `"<cp>-<tc>-<mc> (<name>)"` per ISO/IEC 23001-8..."*
- Line 1968: explicitly notes alignment with spec 10 §13 Correction #4 + #7 (SCOUT-10-RETRY); old "sequence-level colorSpace" framing removed.

**Evidence (spec 09 conclusion summary #10, line 2451):**
- Updated to reflect the corrected emission pattern and Display P3 fallback.

**Cross-spec consistency:** Spec 09's §8.13 pattern now matches spec 10's §13 Correction #4 + Correction #7.

---

### Issue 3 (MAJOR): Spec 01 §3 sketches internal consistency
**Status:** ✅ FIXED

**Evidence (spec 01 — `01-core-engine.refined.md` §3, lines 29-530):**
- §3.1 architecture diagram (line 46): manager roster shows `ScenesManager (plural)` — NOT `SceneManager`. (`ExportManager` removed from §3.1 roster per §14.1 12-manager layout.)
- §3.2 EditorCore class sketch (lines 80-150): `public readonly scenes: ScenesManager` (line 85), `this.scenes = new ScenesManager(this)` (line 100) — class instantiated as `ScenesManager`
- §3.3 TimelineManager interface (lines 150-200): uses `splitElements`, `updateElementTrim` (via `updateElements`), `moveElements`, `deleteElements`, `duplicateElements`, `insertElement` (via MediaManager helper), `toggleTrackMute/Solo/Lock/Visibility`, `previewElements`/`commitPreview`/`discardPreview` coalescing pattern
- §3.3 CommandManager interface (lines 203-221): `execute`, `push`, `undo`, `redo`, `canUndo`, `canRedo`, `isRippleEnabled`, `subscribe` — NO `beginTransaction`/`endTransaction`/`getHistory` in the interface definition
- §3.3 ScenesManager interface (lines 244-260+): `getActiveScene`, `getActiveSceneOrNull`, `getScenes`, `createScene({name, isMain})`, `switchToScene`, `renameScene`, bookmark ops — all `async`
- §3.4 Initialization order (lines 332-345): 19-step order matching `apps/web/src/core/index.ts:32-69`; includes `ScenesManager created (plural — holds back-reference to EditorCore)`
- §3.6 createRenderEngine: uses `engine.scenes.getActiveScene().settings.fps` (not `.getActive().settings.fps`)
- §3.7 rules: `splitElements()` and bidirectional EditorCore back-reference per §14.16

**Token-level search of §3 (lines 29-530):**
- `SceneManager` → **0 occurrences** (only `ScenesManager` appears)
- `beginTransaction`/`endTransaction` → 1 occurrence each, both inside a single comment at line 206 that explicitly states *"OpenCut-classic has NO `beginTransaction`/`endTransaction` — multi-command transactions are grouped by constructing a `BatchCommand(commands)`"*. This is explanatory documentation of the replacement, NOT an interface definition.
- `coalesceKey` → 1 occurrence at line 192 inside a comment: *"Live preview / coalescing pattern (replaces seed spec's `coalesceKey` — see §4.3 below and §14.6)"*. Again explanatory, NOT a field on `Command`.

**Notes:** The OLD API names appear ONLY in §3 explanatory comments that document what was replaced. The actual interface sketches (`TimelineManager`, `CommandManager`, `ScenesManager`) and the EditorCore class definition all use the corrected API surface. This matches the REVISE-01-05-11-02 worklog entry: *"spec 01 §3 contains no `SceneManager` interface or `new SceneManager()`, no `beginTransaction`/`endTransaction` on CommandManager, no `coalesceKey` on Command."* — verified.

---

### Issue 4 (MAJOR): Spec 05 uses old timeline method names
**Status:** ✅ FIXED

**Evidence (spec 05 — `05-timeline.refined.md`):**
- Grep for `engine.timeline.move(`, `engine.timeline.trim(`, `engine.timeline.split(`, `engine.timeline.insert(`, `engine.timeline.delete(` → **0 occurrences**
- Corrected method calls in place:
  - Line 366: `engine.timeline.moveElements({` ✅
  - Line 430: `engine.timeline.updateElementTrim({` ✅
  - Line 457: `engine.timeline.splitElements({ elements: elementsAtTime, splitTime: time })` ✅
  - Line 527: `engine.timeline.insertElement({ element, placement: { trackId: targetTrack.id } })` ✅

All method names aligned with actual OpenCut-classic `timeline-manager.ts`.

---

### Issue 5 (MAJOR): Spec 11 uses old scenes method names
**Status:** ✅ FIXED

**Evidence (spec 11 — `11-cloud-render.refined.md`):**
- Grep for `engine.scenes.getActive(`, `engine.scenes.getActiveState(`, `engine.scenes.getActiveId(` → **0 occurrences**
- Corrected method calls in place:
  - Line 284: `const fps = engine.scenes.getActiveScene().settings.fps;` ✅
  - Line 301: `const activeScene = engine.scenes.getActiveScene();` ✅
  - Line 316: `engine.scenes.getActiveScene().settings.audioChannels,` ✅
  - Line 324: `const audioGraph = buildAudioGraph(engine.scenes.getActiveScene(), offlineCtx);` ✅

All method names aligned with actual OpenCut-classic `scenes-manager.ts`.

---

### Issue 6 (MINOR): Spec 02 DecodeResponse.format enum
**Status:** ✅ FIXED

**Evidence (spec 02 — `02-workers-threading.refined.md`):**
- Lines 301-303: `type DecodeResponse = | { type: 'frame'; ...; format: VideoSamplePixelFormat } | { type: 'error'; ... }` — `format` field now uses mediabunny's `VideoSamplePixelFormat` enum (NOT the old `'p010' | 'nv12'` union).
- Lines 305-314: explanatory NOTE block listing actual mediabunny formats: *"mediabunny's `VideoSamplePixelFormat` enum lists 19 supported formats — `I420P10`, `I420P12`, `I422P10`, `I422P12`, `I444P10`, `I444P12`, `I420`, `I422`, `I444`, `NV12`, `BGRA`, `RGBA`, and others. NOTABLY `P010` (semi-planar 10-bit) is NOT in the enum — the closest equivalent is `I420P10` (planar 10-bit)."*
- Grep for `'p010'` / `"p010"` literals → **0 occurrences**

---

### Issue 7 (MINOR): Spec 11 internal wording inconsistency (entry points)
**Status:** ✅ FIXED

**Evidence (spec 11 — `11-cloud-render.refined.md` §11.2-§11.3, lines 800-849):**
- §11.2 (line 809): *"Our design — two entry points, one `EditorCore` (matches spec 01 §3.6):"*
- §11.2 (line 811): *"**Browser preview path** uses `createInteractiveEngine(opts)` — wires `AudioClock` (real-time) + `<canvas>` + `AudioContext`..."*
- §11.2 (line 812): *"**Cloud render path** uses `createRenderEngine(opts)` — wires `StaticClock` (on-demand) + `OffscreenCanvas` + `OfflineAudioContext`..."*
- §11.2 (line 814): *"Both paths share the same `EditorCore`, same managers, same `WebGPURenderer.renderFrame()` call, same shaders, same color pipeline."*
- §11.3 (line 821): *"The browser preview MUST route through `createInteractiveEngine()`... The cloud render path MUST route through `createRenderEngine()`... Both paths share the same `WebGPURenderer.renderFrame()` code path internally — any divergence breaks the contract."*
- §11.3 WYSIWYG test (line 833): `const browserEngine = await createInteractiveEngine({ ... });`
- §11.3 WYSIWYG test (line 840): `const cloudEngine = await createRenderEngine({ ... });`

The previous wording inconsistency (between lines 806 and 825 of the pre-revision spec) has been resolved. The two-path design is now stated consistently in both §11.2 (the architecture statement) and §11.3 (the verification test), matching spec 01 §3.6's canonical two-entry-point design. Wording is standardized: browser preview = `createInteractiveEngine`, cloud render = `createRenderEngine`.

---

## Master spec updates (5 items)

### Master Update 1 (CRITICAL): mediabunny P010 claim removed
**Status:** ✅ APPLIED

**Evidence (`00-master-spec.md`):**
- Line 157 (§2 Decision 5): *"mediabunny WebCodecs decoder (10-bit formats like `I420P10` are emitted by the browser's `VideoDecoder` based on source codec; we configure the decoder with `hardwareAcceleration: 'prefer-hardware'` and accept whatever 10-bit format the browser produces — **mediabunny does NOT expose a `pixelFormat: 'P010'` option**; the `VideoSinkDecoderOptions` only has `hardwareAcceleration` + `optimizeForLatency`)"*
- Line 309 (§4 Tech Stack table): *"10-bit decode via the browser's `VideoDecoder` (formats like `I420P10`/`I422P10`/`I444P10` are emitted based on source codec... — mediabunny does NOT expose a `pixelFormat: 'P010'` option)"*
- Line 433 (§11 Open Question #3): *"mediabunny API surface — `VideoSinkDecoderOptions` exposes only `hardwareAcceleration` and `optimizeForLatency` — **there is NO `pixelFormat: 'P010'` option** (verified by SCOUT-03 + SCOUT-04)"*

**Note:** The literal string `pixelFormat: 'P010'` still appears 4 times in the master spec — but every occurrence is in the context of an explicit negation ("does NOT expose", "there is NO", "is NOT in the enum"). This is the correct/expected form per the task description (*"Should be 0 occurrences (or only in glossary noting it doesn't exist)"*).

---

### Master Update 2 (MINOR): Chromium 118+ requirement noted
**Status:** ✅ APPLIED

**Evidence (`00-master-spec.md` §5 Browser Matrix, lines 321-338):**
- Line 325: *"Chrome 113-117 (Chromium) — ⚠️ Degraded — WebGPU + WebCodecs + OPFS + AudioWorklet work, but **`rgba10a2unorm` canvas is unavailable** (added in Chromium 118, stable ~120+). Falls back to `rgba8unorm` canvas (8-bit output) — `DegradedRendererBanner` shown."*
- Line 326: *"Chrome 118+ (Chromium) — ✅ Yes — WebGPU + WebCodecs + OPFS + AudioWorklet + `rgba10a2unorm` canvas (full 10-bit end-to-end)"*
- Line 335: *"**Chromium 113+** — basic WebGPU + WebCodecs + OPFS + AudioWorklet (degraded renderer)."*
- Line 336: *"**Chromium 118+** — `rgba10a2unorm` canvas format (10-bit output). Stable in ~120+."*
- Line 338: *"Ship a `DegradedRendererBanner` (borrow OpenCut-classic's pattern) for users on Chromium 113-117 ('Your Chrome doesn't yet support 10-bit canvas output — falling back to 8-bit display. Update to Chrome 120+ for full 10-bit.'). For users on Chromium <113 or non-Chromium, ship the 'use Chrome desktop' banner."*
- Line 310 (§4 Tech Stack GPU row): *"Chromium 113+ basic; Chromium 118+ for 10-bit canvas (`rgba10a2unorm`) — see §5"*

All three required elements present: Chromium 113+ basic, Chromium 118+ for `rgba10a2unorm`, `DegradedRendererBanner` for 113-117 users.

---

### Master Update 3 (MINOR): Worker count clarification
**Status:** ✅ APPLIED

**Evidence (`00-master-spec.md` §2 Decision 1, line 92):**
- *"FreeCut has 21 Web Worker entry points + 1 AudioWorklet processor; OpenCut-classic has 1 worker (transcription only) + 0 AudioWorklets. **We adopt 10 of FreeCut's 21 workers** (not all 21 — see spec 02 `02-workers-threading.md` for the pruned inventory: decode, waveform, filmstrip, export, opfs, thumbnail, fingerprint, audio-meter, transcription, analysis). OpenCut-classic's transcription-only worker is replaced by FreeCut's more complete pattern."*

Explicitly notes "we adopt 10 of FreeCut's 21 workers" + pointer to spec 02 pruned inventory + full enumeration of the 10.

---

### Master Update 4 (OPTIONAL): DTD glossary entry
**Status:** ✅ APPLIED

**Evidence (`00-master-spec.md` §12 Glossary, line 454):**
- *"**FCPXML** — Final Cut Pro XML. Uses **DTD (Document Type Definition)** for validation, **NOT XSD** (XML Schema Definition). The official `FCPXMLv1_10.dtd` is **785 LOC**. DTD enforces element/attribute structure + enums for some attributes but treats most values as `CDATA` (untyped strings); Zod schema must layer on type/range/regex checks the DTD cannot express (see spec 10 §11 Correction #6)."*

All three required elements present: DTD-not-XSD, 785 LOC, CDATA limitations note + pointer to spec 10.

---

### Master Update 5 (OPTIONAL): P010 glossary entry
**Status:** ✅ APPLIED

**Evidence (`00-master-spec.md` §12 Glossary, line 463):**
- *"**P010** — 10-bit YUV 4:2:0 planar pixel format (the conceptual standard for HDR / pro video decode). **Note:** mediabunny does NOT expose a `pixelFormat: 'P010'` option — the `VideoSinkDecoderOptions` only has `hardwareAcceleration` + `optimizeForLatency`. 10-bit decode produces `I420P10` or similar planar formats (`I420P10`/`I420P12`/`I422P10`/`I422P12`/`I444P10`/`I444P12`) based on the source codec. Values are **MSB-aligned in 16-bit cells** — extract the 10-bit value via `u16 >> 6`, **not** `u16 & 0x3FF` (which would read the LSB-aligned low 10 bits and give wrong values)."*

All three required elements present: (a) mediabunny doesn't expose `pixelFormat: 'P010'`, (b) lists actual formats, (c) warns about MSB-alignment (`u16 >> 6`, not `u16 & 0x3FF`).

---

## Cross-cutting checks (no new inconsistencies introduced)

| Check | Result |
|---|---|
| Spec 04 ↔ spec 07 FrameDescriptor shape | ✅ Identical — both reference spec 07 §4 canonical definition |
| Spec 09 ↔ spec 10 FCPXML colorSpace pattern | ✅ Aligned — both use `formatColorSpaceTriplet` + `colorSpaceOverride` post-SCOUT-10-RETRY |
| Spec 01 §3 ↔ spec 05 timeline method names | ✅ Consistent — both use `moveElements`/`updateElementTrim`/`splitElements`/`insertElement`/`deleteElements` |
| Spec 01 §3 ↔ spec 11 scenes method names | ✅ Consistent — both use `getActiveScene`/`getActiveSceneOrNull`/`switchToScene` |
| Spec 01 §3 ↔ spec 11 entry points | ✅ Consistent — both use `createInteractiveEngine` (browser) + `createRenderEngine` (cloud), matching spec 01 §3.6 |
| Master spec ↔ spec 02 mediabunny formats | ✅ Consistent — both list `I420P10`/`I420P12`/`I422P10`/`I422P12`/`I444P10`/`I444P12` and note `P010` is NOT in the enum |
| Master spec ↔ spec 09 Display P3 fallback | ✅ Consistent — both note Display P3 falls back to `"1-1-1 (Rec. 709)"` with runtime warning (FCPXML 1.10 DTD limitation; true Display P3 requires 1.11+) |

No new inconsistencies found. No fixes introduced regressions.

---

## Final Recommendation

**READY FOR FINAL SIGN-OFF.**

All 7 integration issues and all 5 master spec updates are correctly applied. The 12 refined specs are now internally consistent and cross-stream-aligned. The refined spec set is ready to hand off to implementation.

Recommended next actions (post-sign-off, non-blocking):
1. **Optional cleanup (cosmetic):** The explanatory comments in spec 01 §3 that mention `coalesceKey` (line 192) and `beginTransaction`/`endTransaction` (line 206) by name could be reworded to refer to them indirectly (e.g., "the seed spec's transaction-pattern" instead of "`beginTransaction`") if a stricter "no old-API tokens in §3" stance is desired. Current state is acceptable — the comments are clearly documenting the replacement, not re-introducing the old API.
2. **Implementation hand-off:** The refined specs are ready to drive Phase 1 implementation (per master spec §10). No further spec-level work is required before coding begins.
3. **Regression test:** Re-run the integration-review checks (grep across all `*.refined.md` files) as part of CI to catch any future drift if the specs are edited during implementation.

# SCOUT-R8-B — nle-engine Delta Report (Round 8 re-baseline evidence)

**Scout:** SCOUT-R8-B · **Mode:** research-only · **Date:** 2026-09-02 (post-wave)
**Scope:** engine commits `8754533..8ac91d9` (Waves 4A/4B/4C.1/4C.2-3/4D-A + wrap-up) vs the Round-7 baseline recorded in spec 19 §3.1/§9.
**Method:** every citation below was opened in the current tree (`nle-engine @ 8ac91d9`, clean worktree). Engine self-reported numbers (144/144 tests) are tagged REPORTED — I did not re-run the Playwright suite.

---

## 1. Wave-landing digest

### 1.1 What the meta docs say

- **`.agents/HANDOFF.md`** (rewritten at wrap-up): 144/144 tests, 21/21 milestones, ~40,700 LOC, 43 GPU effects (see §6 drift note), 27 transitions, 6 item types. Session did Waves 4A→4D-A; all 3 known bugs closed + 6 latent bugs fixed. Suggested next: 4D-B text GPU rendering (~1,575 LOC per `gaps/audit/A2-text-stack-port-plan.md`), resolve **D3 fonts** first, then 5A audio-scene, 5B export M1 (decide **D2 mediabunny**).
- **`gaps/audit/MASTER.md` §0** (progress tracker): 15 wave items ✅ with commits — 4A.1–4A.9 + 4A.T (m20, `eaf63c0`), 4B (`6124b86`), 4C.1 (`41258ff`), 4C.2/4C.3 (`0b7c384`), 4D-A (`65a4cd8`). Remaining TODO: **4D-B/4D-C/4D-D** (text render/animated/motion, ~3,600 LOC combined), **5A** (audio-scene segmentation P0.7 + EQ threading P1.4), **5B** (export M1 P1.10), **6A–6C** (real media→decode→reverse-conform), **7** (P2 backlog). §0 now says "Decisions resolved: D1 (engine-native v2 shape — persistence module). Open: D2, D3, D4, D5."
- **`worklog.md`** (tail, entries `Wave4A-core` → `Wave4-session-wrapup`, lines 3293–3425): matches MASTER §0, adds detail the tracker lacks — 4B deliberately deferred freecut interop mapper (~200 LOC), media manifest, A/V load repair, `restore()` hardening (P1.12 "one-liner follow-up"); session totals 7 commits, ~2,900 LOC, 9 bugs, 3 milestones, 20 tests.
- **`.agents/DECISIONS.md`**: still exactly **13 decisions** (Decision 13 dated 2026-09-02, defensive effect-shape guards — already known to Round 7). **No new decisions.** The D1 "resolution" lives in MASTER §0, not DECISIONS.md — see §2.5 below, because it is the one that collides with spec 19 §7.

### 1.2 Planned vs landed (MASTER §7 plan vs §0 tracker)

| Wave | MASTER §7 plan | Landed | Delta |
|---|---|---|---|
| 4A | pool discipline, TransformParentBinding, snapshotsEqual, player events, 26 P0 tests | ✅ all + 6 bonus bug fixes | Only 10 m20 tests, not G's 26 (G charter still ~90 items open) |
| 4B | persistence ~350 LOC, wire editProject, **D1 decision**, `updateClip` public API (P1.6), `restore()` hardening (P1.12) | ✅ persistence (1,159 LOC) + real `editProject` | **P1.6 and P1.12 NOT landed**; D1 resolved engine-native (see §2) |
| 4C | per-type render branches, composition recursion + M19 pixel, adjustment, image | ✅ all (m19.2 pixel-verified; m21 7 tests) | as planned |
| 4D | Phase A–D (~3,900 LOC) | ✅ Phase A only (~530 LOC: types + CRUD + headless + persistence) | 4D-B/C/D remain |
| 5A/5B/6/7 | — | ⬜ untouched | — |

**Counts:** tests 124→**144** (REPORTED; runner not re-run by scout), milestones 19→**21** (m20 = 4A regressions ×10, m21 = 4C/4D features ×10), LOC 37,958→**40,739** across 31 files (`wc -l` over `src/lib/nle/**.ts`).

---

## 2. Persistence deep-dive vs spec 09 (Wave 4B) — the headline finding

Module: `src/lib/nle/persistence/index.ts` (1,174 physical lines; engine calls it 1,159 LOC). Public surface: `serializeTimeline` (:162), `hydrateTimeline` (:312), `migrateProject` (:352), `normalizeProjectData` (:411), `NLE_SCHEMA_VERSION = 2` (:69), `ProjectWarning {code, message}` (:82), plus barrel export via `src/lib/nle/index.ts`.

### 2.1 Does it implement spec 09's ProjectJSON? **No — it serializes the engine-native "v2" shape.**

The header says so outright: *"serializeTimeline reads a live Timeline and emits an engine-native Project (Decision D1: inline fps/width/height, clips array — NOT freecut's metadata + timeline.items wire shape; interop mapping is a future optional module)"* (`persistence/index.ts:5-9`), and *"freecut's wire format (currently v15) is a DIFFERENT version namespace — interop with it is out of scope"* (:65-67).

What it actually serializes (`serializeTimeline`, :172-181 → `Project`):

```ts
const project: Project = {
  id, name, description, createdAt, updatedAt,
  schemaVersion: NLE_SCHEMA_VERSION, thumbnailId,
  timeline: cleaned,   // TimelineData
};
```

`Project` (`core/types.ts:1451-1467`) = `{id, name, description?, createdAt: number, updatedAt: number, schemaVersion?, thumbnailId?, timeline: TimelineData}`. `TimelineData` (`core/types.ts:1319-1370`) = `{fps: number, width, height, backgroundColor: [r,g,b,a] (0..1 array), masterBusDb?, tracks: Track[], clips: Clip[], transitions: Transition[], markers?, inPoint?, outPoint?, keyframes?, compositions?}`. Clips are **inline objects carrying `trackId`**, `from`/`durationInFrames` in frames, `source: {sourceId, sourceStart, sourceEnd, sourceDuration, sourceFps}`.

Spec 09 §3.1's ProjectJSON is structurally different: `{schemaVersion: 1, metadata: {id UUID, name, createdAt: ISO 8601, duration…}, settings: {fps: FrameRate rational, canvasSize, backgroundColor: {r,g,b,a} linear, displayMode, audioSampleRate, audioChannels}, scenes: [{tracks: {overlay[], main, audio}, bookmarks}], currentSceneId, media: MediaRecord[], markers, uiState?}`, with `TrackJSON.elements: string[]` ID references and elements carrying `startTime`/`duration` as MediaTime, `transitionIn/transitionOut` per element.

**Field-name-level divergence table:**

| Spec 09 §3.1 | Engine v2 (persistence/index.ts) | Note |
|---|---|---|
| `metadata.{id,name,createdAt(ISO),updatedAt(ISO),duration}` | flat `id/name/createdAt(epoch ms)/updatedAt(epoch ms)` (`:419-423`) | time representation + nesting differ |
| `settings.{fps(FrameRate), canvasSize, backgroundColor{r,g,b,a}, displayMode, audioSampleRate, audioChannels}` | `timeline.{fps(number), width, height, backgroundColor:[r,g,b,a]}` (`:446-452`) | no rational fps, no displayMode/audio fields, array vs object color |
| `scenes[]` + `currentSceneId` + `tracks.{overlay,main,audio}` | single `timeline.tracks[]` (kind: video\|audio, sorted by `order`) (`:459-466`) | no scene tier at all |
| `TrackJSON.elements: string[]` | `timeline.clips[]` each with `trackId` | inverse reference direction |
| `ElementJSON.startTime/duration (MediaTime)` | `clip.from/durationInFrames` (frames) (`:731-749`) | units differ |
| `transitionIn/transitionOut` on elements | first-class `timeline.transitions[]` `{id,leftClipId,rightClipId,trackId,durationInFrames,alignment,timing,presentation}` | spec 07 §6.1-style structural record (engine side) |
| `media: MediaRecord[]` + `MediaStorageRef{type:'opfs'\|'remote', path}` | **absent — no media plane** | D5 untouched |
| `markers` at project level, `Bookmark` per scene | `timeline.markers[]` `{id, frame, color}` (`:520-526`, `:879-907`) | placement + time units differ |
| `schemaVersion: z.literal(N)` (spec 09 §11 Correction #10) | `schemaVersion` stamped `2`, **read** by `migrateProject` (:358-359) | literal-vs-read resolves spec 09's write-only complaint, but in the engine namespace |
| Zod `ProjectSchema.parse` after migrate (§3.3/§5.1) | **defensive never-throw validation + warnings** (`hydrateTimeline` :312-331; garbage → `PROJECT_INVALID_SHAPE` + empty timeline) | deliberate semantic divergence — spec 09 §5.2 rule 3 "never silently fail" vs engine's degrade-gracefully |

### 2.2 Migration, normalization, warnings

- **Version chain:** `migrateProject` (:352-387) — v2 pass-through; v1 → **additive-only** (default `backgroundColor [0,0,0,1]`, `compositions []` at :373-384); missing/unknown version → treated as v1 + `SCHEMA_VERSION_MISSING`/`SCHEMA_VERSION_UNKNOWN` warning (:361-371). No `Migration[]` registry loop yet, but the shape is "deliberately ready" for one (:345-348). Spec 09 §5.2's backup rule (`.bak` copy) and §11 Correction #11's `MAX_SCHEMA_VERSION` ceiling are **absent**; unknown-version handling is graceful-degrade, not fail.
- **Normalize pipeline** (`normalizeProjectData` :411 → `normalizeTimelineData` :437-585): fps clamp [1,120] (`:446`), width/height clamp [1,16384] (`:447-448`), RGBA clamp (`:450-452`), `masterBusDb` [-60,12] (`:454`), track defaults + re-sort by order (`:459-465`, `normalizeTrackRecord` :640-686), clip clamps (from ≥0 round, duration ≥1, speed [0.1,16] via engine constants, opacity [0,1], rotation mod 360, volume, SourceRef stub for source-bearing types only — `normalizeClipRecord` :701-824, stub skip for adjustment/text at :804-821), transition duration/alignment/spring→linear + drop dangling/cross-track + trackId repair (`:484-515`), overlap repair (`repairOverlappingClips` :985-1033, faithful port of freecut normalize.ts:203-262, transition-linked pairs exempt via `buildTransitionPairs` :962-969), marker round+drop (`:879-907`), orphan-keyframe prune (`:279-293`), in/out sanitize vs content extent (`sanitizeInOutPoints` :918-951), **recursive sub-composition normalization** (`normalizeCompositionRecord` :1045-1174), deep-clone output (:584).
- **Warnings surface:** ~27 stable codes (`CLIP_TRACK_MISSING`, `TRANSITION_CLIP_MISSING`, `CLIP_DURATION_CLAMPED`, `KEYFRAME_ORPHAN_PRUNED`, `PROJECT_INVALID_SHAPE`, `SCHEMA_VERSION_MISSING/UNKNOWN`, `FPS_CLAMPED`, `DIMENSION_CLAMPED`, `TRACK_INVALID_DROPPED`, `CLIP_INVALID_DROPPED`, `SPEED_CLAMPED`, `TRANSFORM_CLAMPED`, `TRANSITION_DURATION_CLAMPED`, `TRANSITION_CROSS_TRACK`, `TRANSITION_TRACK_REPAIRED`, `TRACK_OVERLAP_REPAIRED`, `IN_OUT_SANITIZED`, …). This is a freecut-`ProjectWarning`-shaped channel (migrations/types.ts:41-48 semantics, cited at :78-80), **not** spec 09's Zod error surface.
- **`editProject` is real now** (`headless/api.ts:1070-1130`): when the adapter exposes the new optional `TimelineActionsAdapter.timeline` member (:713-728), it serializes the post-edit timeline with the input's identity (`:1104-1119`); proxy adapters fall back to migrate+normalize deep copy (`:1121-1129`). `NleEditResult` gained `warnings?` (worklog; `:1118`). `normalizeProjectForHeadless` now delegates to migrate+normalize with the same throw messages (`:2319-2330`) — the old 3-field stub is gone. `createProjectForHeadless` stamps v2 (`:2283`).

### 2.3 Convergence vs divergence verdict (spec 19 §7 D1/D5)

- **D1 — DIVERGED.** Spec 19 §7's answer: *"Neither — spec 15's ProjectJSON (spec 09 §3 …). The engine's recommended 'native v2 + ~200-LOC FreeCut interop mapper' becomes 'spec-09 shape + interop mapper for FreeCut wire I/O only.'"* The engine did exactly the thing the spec answer argued against: MASTER §0 records *"Decisions resolved: D1 (engine-native v2 shape)"*, and the module implements it (`persistence/index.ts:5-9,65-67`). The result: the engine's persisted output is now a **third competing project shape** alongside freecut's wire format (lifecycle zod schemas in `api.ts:1648+` untouched, per worklog "Lifecycle zod schemas (freecut wire format) untouched per scope") and spec 09's ProjectJSON — P1.13's "two conflicting canonical shapes" is now three.
- **What DID converge with spec 09 §5 / ledger #22:** migrate-then-normalize ordering, schemaVersion being *read*, sanitize/prune/re-sort/overlap-repair-with-warnings on load, never aliasing caller data (deepClone :130-139, :584), recursive composition normalization, round-trip idempotence claims (Timeline constructor normalize is "idempotent with ours", :305-307). These semantics are portable to a spec-09-shaped serializer.
- **D5 — NOT IMPLEMENTED (still open).** No `Storage`/`MediaStore` interface, no OPFS anywhere in `src/lib/nle` (grep: zero `navigator.storage`/OPFS references). MASTER §0 still lists D5 open; the module is a pure (de)serialization layer with no storage plane — which is arguably the right seam, but the spec-09-contract convergence Round 7 asked for ("Wave 4B should target spec 09's schema/migration/normalization contracts directly", spec 19 §8 persistence row) did not happen at the schema level.
- **Spec 09 §10.3 rows that change** (old → new): `api.ts:1069` fake editProject → **retired** (real at :1070-1130); `api.ts:2265` 3-field stub → **retired** (`normalizeProjectForHeadless` :2319 now delegates); `types.ts:1180 Project` → moved to `types.ts:1451`; `timeline.ts:1746 snapshotsEqual` → moved to `:1772` **and fixed** (keyframes/compositions/backgroundColor now compared); `api.ts:2578 serializeProject hook` → now `:2639`, still the full-override seam; `restore()` weak-load row → normalize module exists but `restore()` still not routed through it (worklog 4B: "one-liner follow-up").

---

## 3. Render-loop verification (Wave 4C)

**The Round-7 counter-example `playback/player.ts:1038 if (clip.type !== 'video') continue;` is RETIRED.** The loop was restructured into a generalized builder:

- `_buildLayers` (player.ts:1037-1047) is now a thin wrapper: *"the root pass delegates to _buildLayersForData so the EXACT same machinery (transforms, effects, masks, keyframes, two-pass transition tasks, nested compositions) renders sub-compositions"* (:1043-1046).
- `_buildLayersForData(data, frame, depth)` (:1071) walks `frameScene.renderTasks` in **two passes** (:1170-1206 pass 1 = transitions first, collecting `renderedTransitionClipIds`; :1208-1213 pass 2 = item order preserved) — this is the 4A task-order fix.
- Per-type branches inside the item loop:
  - **CompositionItem** (:1221-1235): `_renderCompositionItem` (:1501) — resolves the `SubComposition` by `compositionId` (:1545-1556), maps the local frame via `getSourceFrameAtTimelineFrame` (:1560, freecut composition-content.tsx:308-317 math), builds a **synthetic TimelineData view with transparent background** (:1565-1577), **recurses `_buildLayersForData(view, subFrame, depth+1)`** (:1579), composites the nested layers **offscreen** into a fresh texture at the sub-comp's dims via `compositeOffscreen` (:1584-1603, queue-ordering rationale at :1470-1474), folds nested intermediates into the OUTER destroy/pool lists (:1608-1609), applies wrapper effects through the pooled `applyToTexture` (:1611-1624), and pushes **ONE LegacyCompositeLayer** with wrapper transform/fades/masks. Depth guard `MAX_COMPOSITION_RENDER_DEPTH` = 4, warn-once (:1534-1542). Documented limits (:1487-1497): sub-comp audio unrendered (Wave 5A), transitions with composition endpoints degrade (`_renderTransitionTask` returns null for non-video endpoints, player.ts:1746), nested keyframes unsupported (SubComposition has no keyframes field).
  - **AdjustmentItem** (:1239 `if (clip.type === 'adjustment') continue;`): renders no pixels; its effects are collected by the real `collectVisibleAdjustmentLayers` (scene-assembly.ts:798-825, was a `[]` stub) and **prepended to each affected item's chain** via `getAdjustmentLayerEffects` (scene-assembly.ts:319-334 — scoping: item BELOW the adjustment on our inverted track-order axis, active at frame) and `combineEffects` (scene-assembly.ts:340-349 — adjustment-first, then own effects, freecut canvas-effects.ts:207-216). Applied in the player at :1313-1339 through the Wave-4A pooled `applyToTexture`.
  - **ImageItem** (:1240-1303): renders like video with `sourceFrame = 0` still (:1260-1261), a **per-source cached still texture** with deferral-safe replacement (:1282-1294, `registry.renderImageFrame`), full transform/effects/masks/fades path. `VisualTrackItem` union widened to `VideoClip | CompositionItem | ImageClip` (scene-assembly.ts:224; collector :840-879 with the type filter at :866).
  - The remaining skip is now `if (clip.type !== 'video' && clip.type !== 'image') continue;` (:1242) — which excludes only **audio** (renders via the audio-scene path) and **text** (deliberate until 4D-B; TextItem class doc, types.ts:912-916).

**Milestone evidence (page.tsx):**
- **m19.2** (`page.tsx:5295-5367`): sub-comp with red[0,30)/blue[30,60) inner clips wrapped in a CompositionItem; asserts **center-pixel f0=rgb(255,0,0) and f45=rgb(0,0,255)** via `renderFrameOffscreen` readback plus wrapper state checks — a genuine pixel-truth test of the recursive composite ("Pre-4C the wrapper rendered NOTHING", :5298-5301).
- **m20** (10 tests, `page.tsx:5472-5949`): 20.1 two-effected-clips texture ownership, 20.2 mixed source dims, 20.3 single inverted mask, 20.4 multi-mask invert-once, 20.5 cross-clip mask bleed, 20.6 TransformParentBinding, 20.7 keyframe undo, 20.8 orphan prune, 20.9 ended/ratechange/statechange, 20.10 persistence round-trip + real editProject (asserts split result visible in returned project, identity preserved, `:5936-5941`).
- **m21** (10 tests, `page.tsx:5990-6367`): 21.1–21.4 adjustment scoping/window/direction/compounding (pixel-asserted, e.g. 21.1 expects ~(128,0,0) dark red), 21.5–21.7 image stills/transform/effect-chain, 21.8–21.10 text Phase A (see §4).

All 21.1-21.4 and 21.5-21.7 use pixel readback (message strings show expected RGBA tuples).

---

## 4. TextItem status (Wave 4D-A)

**Landed (state-level only):**
- `TextItem` type: `core/types.ts:936-951` — `extends Omit<BaseClip,'source'>, TextStyleFields` with flat freecut style fields (`TextStyleFields` = inline + visual, :907; spans/shadow/stroke ported from freecut types/text.ts, :826-904). Joins `Clip` union at :995; `isSourceBearingClip` excludes text (:998-1001 region). Inert optional `source` for union closure (:949-950).
- `Timeline.addTextClip(trackId, from, duration, text, partial?)`: `timeline.ts:2341-2371` — video-track guard (:2350-2352), freecut `buildTextItem` friendly defaults color `#ffffff` / fontSize 80 (:2362-2363).
- Headless `addText` op no longer throws: dispatch `case 'addText'` at `api.ts:800-803` calls `actions.addTextItem(op)`; the 19-op union at :402-430; test-adapter implementation in `page.tsx:6210-6256` (21.9) including `$ref`-chained `updateItem(color)` and **real editProject round-trip containing the text clip**.
- Persistence allowlist fix: `normalizeClipRecord` type allowlist = full Clip union (video/audio/composition/image/adjustment/text) at `persistence/index.ts:720-729` — *"Image/adjustment (4C) and text (4D) were previously dropped here as 'unknown'"*; SourceRef stub skipped for source-optional types (:804-821). This was a **latent bug**: pre-4D-A persistence would have silently dropped image/adjustment clips on hydrate.

**Evidence:** 21.8 (fields/defaults/round-trip byte-identical, `page.tsx:6206-6215`), 21.9 (headless addText + $ref + real round-trip, :6324), 21.10 (render with text clip: no crash, **pure red — text paints nothing until Phase B**, :6360).

**Remains:** Phase B GPU rendering (glyph atlas ~1,575 LOC per `gaps/audit/A2-text-stack-port-plan.md`, `HANDOFF.md:51-53`), Phase C `resolveAnimatedTextItem` (~240), Phase D motion/presets/fonts (~1,800); text keyframes; FCPXML title export is **entirely absent** (grep `fcpxml` over `src/`: 0 hits) so spec 10 §4 remains untouched.

**Relation to D3 (spec 19 §7):** D3 is still unresolved on the engine side (MASTER §0 open list) and still the blocker before 4D-B (HANDOFF "Resolve D3 (fonts) first: bundled 2 weights + caller registry is the recommendation"). Spec 19 §7's D3 answer ("not spec'd — engine-local; flag text-stack spec coverage as a seal-round question") and §12 item 3 (absorb A2 plan as a spec section vs keep engine-led) are **still open decisions** for the coordinator — the engine's A2 plan is now partially validated by Phase A landing cleanly.

---

## 5. Wave-4A fix verification (ledger rows #8/#12)

### P0.1 — singleton texture returns (was `effects/pipeline.ts:5107 return this._pongTexture`) — **FIXED**
`EffectPipeline.applyToTexture(src, w, h, effects, output)` at `pipeline.ts:5076-5127`: caller-owned output texture; the chain runs on internal ping-pong as intermediates only, and the final result is copied into `outputTexture` **inside the same command buffer** (:5116-5125) — atomic submit. Contract documented at :5067-5074 (returns false when skipped; both textures remain caller-owned). Legacy `apply()` (:5144-5169) now allocates a **one-shot caller-owned output** and delegates: *"NEVER the pipeline's internal ping-pong (the pre-4A version returned the singleton _pongTexture…)"* (:5132-5137). The old `:5107` line now sits inside `applyToTexture` (`runEffectChain` call at :5107) — the counter-example is gone. **Verified by:** m20 20.1 (two effected clips in same frame, `page.tsx:5517-5520`: expects bottom ~(128,0,0) and top ~(0,0,128) — impossible with the singleton), 20.2 (mixed source dims). Player wiring: pool acquire/release at `player.ts:1324-1339` with release-after-GPU-work discipline (:1040-1041, :1064-1069).

### P0.2 — mask invert double-apply (was `mask-manager.ts:478`/`:640`) — **FIXED**
`MaskManager.getMaskResult(masks, w, h)` at `mask-manager.ts:474-559`: returns `{view, invert, texture?}`. Single-mask path: raw rasterized texture + invert flag → the **compositor's `maskInvert` uniform** applies it exactly once (:483-490). Multi-mask path: all-white-seeded combine chain where *"Each mask's invert is applied exactly ONCE via invertNext (the raw rasterized textures carry no invert — Wave 4A removed the CPU bake)"* (:499-505, `invertNext` at :527); `invertBase` deliberately never set in this chain (all-white seed ≠ freecut's m1-seeded chain, :501-505). Per-call output texture acquired from the pool and copied out (:542-558) — kills the cross-clip bleed. The old CPU bake at :478/:640 no longer exists (those lines are now the `getMaskResult` return-type doc and a comment describing the removed behavior, :739). **Verified by:** m20 20.3 (single inverted mask — "V2 visible outside shape only"), 20.4 (multi-mask invert-once), 20.5 (two multi-masked clips in one frame — no bleed). Player wiring: `player.ts:1395-1400` + pool release via `pooledTextures`.

### P0.6 — keyframe-blind undo equality (was `timeline.ts:1746`) — **FIXED**
`snapshotsEqual` moved to `timeline.ts:1772-1795` and now compares `keyframes` and `compositions` via JSON-deep (`jsonDeepEqual` :1798-1803) plus `backgroundColor` (:1786-1793 — comment: *"Wave 4A (P0.6) — keyframes, compositions, and backgroundColor were MISSING from this equality, so keyframe-only edits… never created undo entries (Audit E2-5)"*). Orphan keyframe pruning centralized in `_commit` (worklog 4A; cited at persistence/index.ts:275-277). **Verified by:** m20 20.7 (keyframe-only edit creates undo entry, undo/redo round-trip, `page.tsx:5794-5797`) and 20.8 (orphan prune on removal, :5818-5820). Caveat for the ledger: freecut's 17-field comparison also covers `busAudioEq`, which our model doesn't have (types.ts:1369 omission note) — the spec 06 §7/15 §14.1 full-field bar is met **modulo fields that don't exist in the engine model**.

Bonus confirmations from the worklog, spot-verified in source: composite y-sign `posY = +ty` (player.ts:1380-1386 region, "scale is the DEST size…"; the HANDOFF architecture facts, `HANDOFF.md:47`), two-pass transition ordering (player.ts:1170-1177), source-dims upload (player.ts:1268-1274).

---

## 6. Citation-drift table (Round-7 citations → current tree @ 8ac91d9)

| Round-7 citation | Current status | Evidence |
|---|---|---|
| timeline.ts `split` :2275 | **moved → :2461** (`splitClip(`) | grep |
| timeline.ts `rippleDelete` :3359 | **moved → :3547** | grep |
| timeline.ts `removeItems` :3527 | **moved → :3715** | grep |
| timeline.ts `slip` :3858 | **moved → :4045** | grep |
| timeline.ts `slideItem` :3944 | **moved → :4133** | grep |
| timeline.ts `performInsertEdit` :4379 | **moved → :4574** | grep |
| timeline.ts `freezeFrameAtPosition` :6185 | **moved → :6520** | grep |
| timeline.ts `joinItems` :6329 | **moved → :6664** | grep (timeline.ts now 6,794 LOC, was 6,436) |
| pipeline.ts `GPU_EFFECT_REGISTRY` :3003 | **unchanged** (:3003) | read |
| pipeline.ts `registerEffects` :4559 | **moved → :4561** (call site; comment "Wave 3E…43→44" still at :4558; function def at :3043) | read |
| transitions registry.ts :2249 | **unchanged** — :2249 = `const BUILTIN_PRESENTATIONS` (27 ids counted in :2249-3147; registered at :3147) | read |
| planner.ts :21 / :27 | **unchanged** — :21 = `leftPortion = floor(D * alignment)`; :27 = `ALIGNMENT SEMANTICS` heading | read |
| handle-utils.ts :302 | **unchanged** — binary-search doc at :302 | read |
| core/clock.ts :550 / :612 / :661 | **unchanged** — :550 `nextTimeSource.currentTime * 1000`; :612 frame floor; :661 throttled `timeupdate` emit | read |
| video-sync.ts :180 / :224 / :925 | **unchanged (±1)** — comments at :180/:224; `LARGE_DRIFT_SECONDS` :181, `COALESCED_SEEK_EPSILON_SECONDS` :225, `planVideoFrameCallbackCorrection` :926 | read |
| gpu/compositor.ts :32 / :981 | **unchanged** — :32 `BLEND_MODE_INDEX` (25 blends); :981 `format: 'rgba8unorm'` (8-bit evidence stands) | read |
| headless/api.ts :747 (19-op JSON-RPC) | **moved → :780** ("applyOp: the 19-case JSON-RPC dispatch"); :747 now export-settings lines | read |
| headless/api.ts :542 ($ref) | **unchanged** — $ref resolver doc block (:540-548) | read |
| headless/api.ts :474 | **unchanged** — `REFERENCE_ID_FIELDS` allowlist doc (:472-480) | read |
| headless/api.ts :1069 (fake editProject) | **RETIRED** — real `editProject` at :1070-1130 (serialize post-edit timeline :1104-1119) | read |
| playback/player.ts :1038 (`if (clip.type !== 'video') continue;`) | **RETIRED** — :1037 now `_buildLayers` signature; skip narrowed to audio/text at :1242; per-type branches :1221/:1239/:1282 | read |
| media/virtual-video.ts :5 | **unchanged** — :5 "NO disk I/O, NO network fetch, NO `<video>` element" | read |
| media/metadata.ts :81 | **unchanged** — :81 mediabunny *comment* mention; real imports still **zero** (the 2 grep hits are comment text) | read/grep |
| (ledger #8) pipeline.ts :5107 `return this._pongTexture` | **RETIRED** — now `runEffectChain` call inside `applyToTexture` :5107; see §5 | read |
| (ledger #8) mask-manager.ts :478 / :640 | **RETIRED** — now `getMaskResult` doc/type lines; CPU invert bake removed | read |
| (spec 09 §10.3) timeline.ts :1746 snapshotsEqual | **moved → :1772 and fixed** (keyframe-aware) | read |
| (spec 09 §10.3) types.ts :1180 `Project` | **moved → :1451** | read |

**Count-drift watch list (spec 19 §9 items 4-5):**
- Tests: HANDOFF/worklog claim **144/144, 21/21 milestones** (REPORTED — not re-run by scout). Runner `scripts/run-nle-tests.mjs` contains no hardcoded 144 (checks milestones via DOM `[data-test="milestone"]`), so the count is organic.
- Effects: HANDOFF still says "**43** GPU effects" (`HANDOFF.md:13`) while the registry actually registers **44** (43 identifiers `pipeline.ts:4560-4603`… precisely: 44 identifiers incl. `lut3d` at :4603; the "43→44" comment at :4558 is correct, the HANDOFF prose is stale). **Drift persists.**
- LOC: 40,739 / 31 files (was 37,958 / 30).
- Workers: still **zero** (`new Worker(` grep = 0). FCPXML: still **zero** surface. React timeline/shell: still none (page.tsx is a 6,483-LOC test runner).

---

## 7. Updated ROI verdicts (spec 19 §8 re-baseline)

| Subsystem | Round-7 verdict | R8 verdict | Evidence for the change |
|---|---|---|---|
| NLE op algorithms | Refactor (graft) | **unchanged** | All 8 op families verified present (moved lines, §6); 144 tests REPORTED green |
| Transition planner/handles/27 presentations | Refactor (graft) | **unchanged** | registry.ts:2249 27 presentations; planner/handles citations intact |
| Clock + 6 sync plans | Refactor (graft) | **unchanged** | clock.ts/video-sync.ts citations intact (§6) |
| Audio mixer/EQ/worklet | Refactor (graft) | **unchanged** | Untouched this round (Wave 5A pending; P0.7 split-click, P1.4 EQ threading still open) |
| GPU effect shaders | Port the math, rebuild the pipeline | **unchanged** | Still 8-bit: `applyToTexture` outputs `rgba8unorm` (pipeline.ts:5156), compositor :981; C1 delta stands |
| Compositor | Rebuild discipline, keep structure | **SOFTENED → "rebuild formats, keep structure + now-proven discipline"** | Pool discipline LANDED and pixel-verified (m20.1/20.2/20.5); `compositeOffscreen` now exercised by real nested composites (m19.2). What remains is purely the 10-bit/scene-linear rebuild (ledger #6/#8's *format* half) |
| Headless API / command surface | Rebuild (adapter bridge) | **unchanged** (evidence refreshed) | Still 19-op JSON-RPC + `$ref` (api.ts:780 dispatch, :540-548 resolver, :472-480 allowlist); C2/C3 deltas stand |
| Undo/redo | Refactor | **unchanged, evidence upgraded** | P0.6 fixed (timeline.ts:1772-1803) + orphan prune centralized + m20 20.7/20.8; but wrap-by-default (P1.5/P1.14) still open, `busAudioEq` field absent |
| Media pipeline | Rebuild fresh | **unchanged** | Zero mediabunny imports; virtual-video.ts:5 procedural; Wave 6A pending |
| Persistence | **Build fresh — Wave 4B should target spec 09 contracts directly** | **CHANGED → "Re-shape via adapter; keep semantics"** — the module exists (1,174 LOC) with real round-trip, migrate gate, warnings channel, freecut-parity normalization; but the wire shape is engine-native v2 (D1 resolved AGAINST the spec-19 §7 answer), no Zod, no storage plane (D5 open), no MediaRecord/media manifest. The migrate/normalize/warnings semantics are spec-09-§5-compatible and portable; the JSON shape is not. A spec-09-shaped serializer can now be written as an adapter over `serializeTimeline`/`hydrateTimeline` rather than from scratch | persistence/index.ts:5-9, :65-67, :162-183, :352-387, :411-585; api.ts:1070-1130; MASTER §0 D1 note |
| FCPXML export | Build fresh | **unchanged** | Zero `fcpxml` hits in src/ |
| Timeline UI | Build fresh | **unchanged** | page.tsx still test-runner only (6,483 LOC) |
| UI shell | Build fresh | **unchanged** | — |
| Workers | Build fresh | **unchanged** | `new Worker(` = 0 |
| Test infrastructure | Re-tier | **unchanged, count updated** | Still single-tier Playwright; 124→144 REPORTED; pixel-truth assertions now proven at scale (m19.2, m20.1-20.5, m21.1-21.7) which lowers T1-extraction risk |
| Text stack | Engine-led (A2 plan) | **unchanged, Phase A banked** | State-level CRUD + persistence + headless op landed (types.ts:936, timeline.ts:2341, api.ts:800, persistence :720-729); rendering deferred to 4D-B; D3 unresolved; spec-coverage decision (§12 item 3) still pending |

**Net for spec 19 §6 corrective table:** C1 (8-bit) — stands; C2/C3 ($ref/class surface) — stand; C4 (single-tier) — stands (m20/m21 deepen it); C5 (procedural media) — stands; C6 (workers) — stands. No corrective row flips this round. **Spec 19 §9 watch list:** items 1-3 resolve as "landed" (with the D1-direction caveat on item 2); item 4 (test count) 124→144; item 5 (effects count) drift persists (43 claimed vs 44 actual); items 6-7 unchanged.

---

## 8. Recommendations for the coordinator

1. **D1 collision is the Round-8 decision.** The engine resolved D1 engine-native in direct contradiction of spec 19 §7's answer. Options: (a) hold the spec line — spec 09 ProjectJSON stays canon, the engine's v2 shape gets reclassified as an internal intermediate + a spec-09 adapter module becomes the convergence task (the module's clean serialize/hydrate seams at persistence/index.ts:162/:312 make this a bounded, ~medium adapter, not a rebuild); or (b) amend spec 09 to bless the engine shape — not recommended without a fight, since the engine shape lacks scenes/media/displayMode/ISO times and now creates a *third* wire shape (freecut lifecycle zod schemas in api.ts:1648+ are untouched). Recommend (a) and record it as a Round-8 amendment in spec 19 §7 + spec 09 §10.3.
2. **Update spec 19 §3.1 table** (state-as-of column): persistence row (None → module exists, engine-native v2), render-loop row (skip retired; per-type branches), known-bugs row (all 3 closed), LOC/tests rows, and re-point the 8 moved timeline.ts citations + api.ts:747→:780.
3. **Ledger #8/#12 rows** in spec 19 §5 can flip from "the live bug" to "fixed-and-regression-tested reference" — but keep the counter-example text per §6's rule ("keep them as documented counter-examples even after the engine fixes them", spec 19 §6 note). Retired citations: player.ts:1038, api.ts:1069, pipeline.ts:5107, mask-manager.ts:478/:640, timeline.ts:1746.
4. **D5 stays open** — when the coordinator or next engine wave touches storage, spec 09 §4.1's `OPFSStorage implements Storage` + host-provided MediaStore is the contract; the persistence module's storage-agnostic design makes it attachable.
5. **Text-stack spec coverage (§12 item 3)** — Phase A's clean landing (byte-identical round-trip, inert-source pattern shared with AdjustmentItem) strengthens the "absorb A2 plan as a spec section" option; recommend deciding before 4D-B starts so the glyph-atlas uniform layouts land once, spec-aligned.
6. **Spec 09 §10.3 stale rows** to refresh: api.ts:1069 (retired), api.ts:2265 (retired — normalizeProjectForHeadless now at :2319 delegates), types.ts:1180→:1451, timeline.ts:1746→:1772 (fixed), MASTER.md line numbers for the P0 register have shifted (§0 tracker is the new live anchor).
7. Minor: tell the engine its HANDOFF says "43 GPU effects" while the registry holds 44 (pipeline.ts:4560-4603) — the Round-7 count-drift watch (§9 item 5) is confirmed still live.
8. UNVERIFIED items (explicit): 144/144 test pass rate and "ran twice deterministically" (REPORTED by engine worklog/HANDOFF; suite not re-run by this scout); "0 tsc errors" claims; freecut-side line citations quoted by the engine (e.g. freecut normalize.ts:203-262, composition-content.tsx:308-317) were not re-opened against `/home/z/my-project/freecut/` this round — they are engine-asserted.

---

*End of SCOUT-R8-B report. No files outside `nle-core-spec/audits/SCOUT-R8-B-engine-delta.md` were modified.*

# Integration Review — Cross-Stream Consistency

**Reviewer:** general-purpose (INTEGRATION)
**Date:** 2026-08-22
**Specs reviewed:** 12 refined specs + master spec + 12 audit reports
**Method:** Per-check verification with `grep` across all `*.refined.md` files, cross-referenced against the master spec (`00-master-spec.md`) and audit reports in `audits/`.

## Summary

- Cross-stream checks performed: 11
- Inconsistencies found: 7 (2 CRITICAL, 3 MAJOR, 2 MINOR)
- Master spec updates needed: 5
- Audit verdicts reviewed: 12 (10 PASS / PASS-WITH-CAVEAT, 1 NEEDS-REVISION-then-PASS, 1 NOT-AUDITED)

## Verdict: ⚠️ MINOR FIXES NEEDED

The 12 refined specs are individually well-audited and architecturally sound. However, two CRITICAL cross-stream contract breaks (FrameDescriptor shape, FCPXML colorSpace format) and three MAJOR API drift issues (engine.scenes.* and engine.timeline.* method names) need to be reconciled before implementation can proceed. None of these are unsolvable; all are mechanical fixes. The architectural decisions in the master spec remain valid.

---

## Per-check results

### Check 1: Type system consistency

**Status:** ✅ CONSISTENT

**MediaTime (120,000 ticks/sec, branded `number`):**
- ✅ Spec 03 (`03-playback-engine.refined.md:158-203`) defines `TICKS_PER_SECOND = 120_000`, verified against OpenCut-classic `rust/crates/time/src/media_time.rs:10`. Includes the LCM proof that 120,000 divides evenly by every standard frame rate (including drop-frame 24000/1001, 30000/1001, 60000/1001).
- ✅ Spec 05 (`05-timeline.refined.md:714, 810, 1031`) uses `TICKS_PER_SECOND` consistently (playhead math `fps.denominator / fps.numerator * TICKS_PER_SECOND`; snapping threshold `10px / pps × TICKS_PER_SECOND`).
- ✅ Spec 06 (`06-nle-ops.refined.md:693`) uses `Math.round((TICKS_PER_SECOND * fps.denominator) / fps.numerator)` — same formula.
- ✅ Spec 09 (`09-project-model.refined.md:278, 1597`) defines `MediaTimeSchema = z.number().int().nonnegative().brand<'MediaTime'>()` and confirms it serializes as a plain number.
- ✅ Spec 10 (`10-fcpxml-export.refined.md:601-604`) converts MediaTime to FCPXML rational time using `TICKS_PER_SECOND * fps.denominator / fps.numerator` — same arithmetic.
- ✅ Spec 11 (`11-cloud-render.refined.md:294, 314`) uses `mediaTimeFromFrame` / `mediaTimeToSeconds` consistently.
- ✅ Spec 12 (`12-testing-strategy.refined.md:670`) lists `MediaTime / FrameRate math` as a unit test target.

**FrameRate (rational `{numerator, denominator}`):**
- ✅ Spec 03 (`03-playback-engine.refined.md:207-217`) quotes the Rust source verbatim:
  ```rust
  pub struct FrameRate {
      pub numerator: u32,
      pub denominator: u32,
  }
  ```
  plus 10 standard constants (23.976 = `24000/1001`, 29.97 = `30000/1001`, etc.).
- ✅ Specs 05, 06, 09, 10 all use the same `{numerator, denominator}` shape. Spec 09 (`09-project-model.refined.md:1608-1616`) even defines a Zod union accepting both `{numerator, denominator}` and bare `number` (for forward-compatible migration).
- ✅ The `ticksPerFrame = TICKS_PER_SECOND * rate.denominator / rate.numerator` formula is byte-for-byte identical across specs 03, 06, 10.

**SceneTracks (`{overlay: OverlayTrack[]; main: VideoTrack; audio: AudioTrack[]}`):**
- ✅ Spec 09 (`09-project-model.refined.md:876-880`) defines the canonical shape.
- ✅ Spec 05 (`05-timeline.refined.md:823`) confirms the singleton main pattern.
- ✅ Spec 06 (`06-nle-ops.refined.md:340-343`) uses the exact same shape in `SceneState`.
- ✅ Spec 07 (`07-composition.refined.md:191`) walks `SceneTracks` via `buildScene`.
- ✅ Spec 12 (`12-testing-strategy.refined.md:563-567`) property-based test fixture uses the same shape.

**Findings:** No inconsistencies. The type-design teacher (OpenCut-classic) was adopted uniformly.

---

### Check 2: EditorCore API consistency

**Status:** ❌ MAJOR INCONSISTENCIES (3 issues)

The `EditorCore` API is described inconsistently between spec 01's preserved seed-spec text and spec 01's §14 corrections, and downstream specs 05/11 still use the OLD seed-spec method names.

**Issue 2.1 — Spec 01 internally inconsistent (MAJOR):**
Spec 01's §3 (`01-core-engine.refined.md:75-251`) preserves the seed-spec text VERBATIM, including:
- `public readonly scenes: SceneManager;` (singular) at line 81
- `this.scenes = new SceneManager(this.command);` at line 90
- `interface SceneManager { getActive(); getActiveId(); setActive(); createScene(name); deleteScene(id); listScenes(); }` at lines 181-190
- `interface TimelineManager { split(); trim(); move(); ripple(); roll(); slip(); slide(); delete(); }` at lines 121-138
- `interface CommandManager { execute(command); undo(); redo(); beginTransaction(label); endTransaction(); getHistory(); }` at lines 144-155
- `coalesceKey?: string` on Command at line 444

Meanwhile spec 01's §14 corrections (`01-core-engine.refined.md:1806-1962`) explicitly contradict this:
- "Class name is `ScenesManager` (plural)" at line 914
- "Drop `setActive`/`createScene(name)`/`deleteScene(id)`/`listScenes` from the API. Add `switchToScene`, `getActiveScene()`, `getActiveSceneOrNull()`, `getScenes()`" at line 1832
- "Real names: `splitElements`, `updateElementTrim`, `moveElements`, `deleteElements`" at line 1838
- "No `beginTransaction`/`endTransaction` — instead `BatchCommand` wraps an array. No `Command.id`. No `Command.label`. No `Command.coalesceKey`" at line 1846

The REVISE-01 / REAUDIT-01 cycle (per worklog) updated the §14 corrections but did NOT replace the §3 interface sketches. Implementers reading §3 will build the wrong API.

**Issue 2.2 — Spec 05 uses OLD TimelineManager method names (MAJOR):**
Spec 05 (`05-timeline.refined.md`) calls these on `engine.timeline`:
- Line 364: `engine.timeline.move({ elementIds, delta })` — should be `moveElements({moves, createTracks})`
- Line 420: `engine.timeline.trim({ elementId, delta, edge })` — should be `updateElementTrim({elementId, trimStart, trimEnd, ...})`
- Line 440: `engine.timeline.split({ time, trackIds })` — should be `splitElements({elements, splitTime, retainSide})`
- Line 504: `engine.timeline.insert({ mediaId, trackId, time })` — not in spec 01's corrected API list
- Lines 584-587: `engine.timeline.toggleMute/toggleSolo/toggleLock/toggleVisibility` — these match OpenCut-classic's actual methods (per spec 01 line 755), so they're correct.

**Issue 2.3 — Spec 11 uses OLD SceneManager method names (MAJOR):**
Spec 11 (`11-cloud-render.refined.md`) calls these on `engine.scenes`:
- Line 284: `engine.scenes.getActive().settings.fps` — should be `getActiveScene().settings.fps`
- Line 298: `engine.scenes.getActiveState()` — should be `getActiveScene()` (the spec 01 §3 sketch had `getActiveState()` but the §14 correction explicitly drops it; `getActiveScene()` returns the live `TScene`, and a "frozen snapshot" is the consumer's responsibility)
- Line 313: `engine.scenes.getActive().settings.audioChannels` — same as line 284
- Line 321: `buildAudioGraph(engine.scenes.getActiveState(), offlineCtx)` — same as line 298

Compare with spec 06 (consistent with the §14 corrections): `editor.scenes.getActiveScene()` and `editor.scenes.getActiveSceneOrNull()` are used 11 times across `06-nle-ops.refined.md` (lines 224, 263, 288, 315, 316, 475, 768, 910, 921, 1348, 1409, 1842). Spec 05 line 699 also correctly uses `getActiveSceneOrNull()`.

**Recommended fix:** Replace spec 01's §3 interface sketches with the corrected versions (or add a clear "**⚠️ SUPERSEDED — see §14.4/§14.5/§14.6 for the actual API**" banner at the top of each interface). Then update spec 05 lines 364/420/440/504 and spec 11 lines 284/298/313/321 to use the corrected method names.

---

### Check 3: FrameDescriptor contract

**Status:** ❌ CRITICAL INCONSISTENCY

This is the most consequential cross-stream break — the contract between composition (spec 07 builds it) and renderer (spec 04 consumes it) does not match.

**Spec 07 produces (`07-composition.refined.md:77-83`):**
```ts
interface FrameDescriptor {
  width: number;
  height: number;
  clear: { color: [number, number, number, number] };
  displayMode: DisplayMode;
  items: FrameItem[];          // ← mixed union
}
type FrameItem = Layer | SceneEffect;
```

**Spec 04 consumes (`04-renderer-color.refined.md:482-511`):**
```ts
async renderFrame(descriptor: FrameDescriptor): Promise<RenderResult> {
  // ...
  const layerTextures = await this.uploadAndLinearizeSources(descriptor.layers);     // ← expects .layers
  let sceneTexture = this.texturePool.acquire(...);
  for (const layer of descriptor.layers) {                                              // ← expects .layers
    // ...
  }
  for (const effect of descriptor.sceneEffects) {                                       // ← expects .sceneEffects
    sceneTexture = this.applyEffect(sceneTexture, effect);
  }
  const displayTexture = this.applyDisplayTransfer(sceneTexture, descriptor.displayMode);
  // ...
}
```

**Mismatch:** Spec 04 expects `descriptor.layers: Layer[]` and `descriptor.sceneEffects: SceneEffect[]` (two separate typed arrays). Spec 07 produces `descriptor.items: FrameItem[]` (one mixed union). The renderer would not compile against the composition output.

**Issue 3.1 — Field name inconsistency within spec 07 (MAJOR):**
Spec 07 (`07-composition.refined.md:93-119`) defines:
- `Layer.effects: EffectPass[][]` (line 101) — note: `effects` (renamed from OpenCut's `effect_pass_groups`)
- `SceneEffect.effectPassGroups: EffectPass[][]` (line 118) — note: `effectPassGroups` (preserves OpenCut's name verbatim)

Same concept, two different field names in the same interface. This is a likely copy/paste error during SCOUT-07's drafting.

OpenCut-classic's actual `LayerDescriptor` (verified per spec 07 §14 quote at lines 1223-1331 and SCOUT-07 worklog line 786) uses `effect_pass_groups` for BOTH `Layer` and `SceneEffect`. Spec 07's `Layer.effects` is an unmarked rename.

Spec 04 (`04-renderer-color.refined.md:492`) reads `layer.effects` — so spec 04 matches spec 07's `Layer.effects` field name (not spec 07's `SceneEffect.effectPassGroups`). The inconsistency is purely within spec 07.

**Issue 3.2 — SceneEffect absent from spec 04 (MAJOR):**
Spec 04's `renderFrame()` iterates `descriptor.sceneEffects` (line 498), implying `sceneEffects` is a top-level field on FrameDescriptor. But spec 07 puts SceneEffect items inside `items[]`, not as a separate `sceneEffects` field. So spec 04's renderer would have nothing to iterate.

**Recommended fix:** Pick one shape and apply it consistently. Recommend adopting spec 07's `items: FrameItem[]` (matches OpenCut-classic's actual `FrameDescriptor` shape) and updating spec 04's `renderFrame()` to iterate `descriptor.items` with a `FrameItem.type` discriminator:
```ts
for (const item of descriptor.items) {
  if (item.type === 'layer') { /* composite layer */ }
  else if (item.type === 'sceneEffect') { /* apply scene effect */ }
}
```
Also rename spec 07's `SceneEffect.effectPassGroups` → `SceneEffect.effects` for consistency with `Layer.effects`.

---

### Check 4: Worker inventory consistency

**Status:** ⚠️ MINOR INCONSISTENCY (1 issue)

**Issue 4.1 — Spec 02's `DecodeResponse` uses non-existent mediabunny format (MAJOR→MINOR depending on usage):**
Spec 02 (`02-workers-threading.refined.md:301-303`) defines:
```ts
type DecodeResponse =
  | { type: 'frame'; mediaId: string; time: MediaTime; frame: VideoFrame; format: 'p010' | 'nv12' }
  | { type: 'error'; mediaId: string; error: string };
```

The `'p010'` value is INCONSISTENT with:
- Spec 03 (`03-playback-engine.refined.md:298-302`): "❌ `P010` is NOT in the list. It would be the 10-bit semi-planar counterpart to NV12, but mediabunny's `VideoSamplePixelFormat` enum does not expose it. The closest equivalent is `I420P10`."
- Spec 04 (`04-renderer-color.refined.md:1190-1209`): "`pixelFormat: 'P010'` does NOT exist in mediabunny. ... All 10-bit formats are `I420P10`/`I420P12`/`I422P10`/`I422P12`/`I444P10`/`I444P12` — all planar, not semi-planar."
- AUDIT-03 (worklog line 401): verified Check 7 confirmed mediabunny's `VIDEO_SAMPLE_PIXEL_FORMATS` (sample.ts:160-195) lists 19 formats — no P010.

The browser's underlying `VideoDecoder` may still produce a `VideoFrame` with `.format === 'P010'` on Chromium for 10-bit H.265 (per spec 04 line 877), so `'p010'` is not entirely fictional — but mediabunny does not expose it as a requestable format option. Spec 02's `DecodeResponse.format` should be updated to `'i420p10' | 'i420p12' | 'i422p10' | 'i422p12' | 'i444p10' | 'i444p12' | 'i420' | 'nv12'` to match the actual mediabunny enum.

**Cross-references that DO match:**
- ✅ Spec 03 (`03-playback-engine.refined.md:307-336`) documents the corrected `decode.worker.ts` implementation using `VideoSampleSink` (not `CanvasSink`) and `.toVideoFrame()` for transfer — matches spec 02 §8.1.
- ✅ Spec 09 (`09-project-model.refined.md:434, 727, 1543`) references `opfs.worker.ts` per spec 02 §8.6, including the `FileSystemSyncAccessHandle` worker-only API requirement.
- ✅ Spec 11 (`11-cloud-render.refined.md:245, 268, 276, 1349`) imports `ManagedWorkerPool` and uses it correctly; references spec 02's AudioWorklet findings (lines 1507-1510). Does NOT claim to use workers that don't exist.
- ✅ Master spec §3 architecture diagram lists the same 6 worker types (decode, waveform, filmstrip, export, opfs, + AudioWorklet) — consistent with spec 02's 10+1 inventory (the diagram is illustrative, not exhaustive).

**Recommended fix:** Update spec 02 line 302's `format: 'p010' | 'nv12'` to either:
- `format: VideoSamplePixelFormat` (importing mediabunny's enum), OR
- `format: 'i420p10' | 'i420p12' | 'i422p10' | 'i422p12' | 'i444p10' | 'i444p12' | 'i420' | 'nv12'`

---

### Check 5: WYSIWYG contract

**Status:** ⚠️ MINOR INCONSISTENCY (1 issue)

**Master spec §7** defines the WYSIWYG invariant: "For any given frame N, the pixels produced by `createInteractiveEngine().renderFrame(N)` MUST be bit-identical to the pixels produced by `createRenderEngine().renderFrame(N)` for the same project state."

**Spec 01** (`01-core-engine.refined.md:333-413`) defines two entry points:
- `createInteractiveEngine(opts)` — uses `AudioClock`, `<canvas>` output
- `createRenderEngine(opts)` — uses `StaticClock`, `OffscreenCanvas` output
- Both call `EditorCore.getInstance(deps)` with the same managers. ✅

**Spec 11 — internally inconsistent (MINOR):**
- Line 806: "`createRenderEngine()` is called by BOTH the browser preview path and the cloud render path. The browser preview layer wraps the same engine with a requestAnimationFrame loop and a Canvas; the cloud render path calls `engine.renderFrame(n)` in a loop. Both paths go through the same `WebGPURenderer.renderFrame()` call."
- Line 813: "The browser preview MUST route through `createRenderEngine.renderFrame()` (or `createRenderEngine.renderLiveFrame()` for rAF-bound playback)."
- Line 825: `const browserEngine = await createInteractiveEngine({ ... });` ← uses `createInteractiveEngine`, not `createRenderEngine`
- Line 832: `const cloudEngine = await createRenderEngine({ ... });`

Lines 806/813 contradict lines 825/832 (and contradict spec 01). Spec 01's design — two distinct entry points sharing the same EditorCore — is correct. Spec 11's line 806/813 wording is the bug.

**Spec 03** (`03-playback-engine.refined.md:40`) confirms: "Cloud-render parity. `createRenderEngine().renderFrame(N)` produces the same pixels as the browser at frame N." ✅
- Clock differs (`AudioClock` vs `StaticClock`) but frame computation uses the same `mediaTimeFromFrame`/`mediaTimeToFrame` math. ✅

**Spec 04** (`04-renderer-color.refined.md:482, 640-663`) — `renderFrame(descriptor: FrameDescriptor)` works for both, same shader pipeline. ✅

**Spec 07** (`07-composition.refined.md:19, 161, 998`) — `buildFrameDescriptor(state, frame)` is pure function. ✅

**Spec 08** — color grading shaders are the same in both modes (same `WebGPURenderer.renderFrame()` code path). ✅ Implicitly consistent.

**Spec 11** (`11-cloud-render.refined.md:263-332`) — uses `createRenderEngine()` and produces same pixels via `engine.renderFrame(n)`. ✅ (modulo Issue 5.1)

**Spec 12** (`12-testing-strategy.refined.md:506-545`) — WYSIWYG test renders browser pixels via `createInteractiveEngine` and cloud pixels via `createRenderEngine`, then compares bit-by-bit. ✅

**Recommended fix:** Update spec 11 lines 806 and 813 to clarify that browser preview uses `createInteractiveEngine` and cloud render uses `createRenderEngine`, both backed by the same `EditorCore` (matching spec 01's design).

---

### Check 6: Color pipeline consistency

**Status:** ✅ MOSTLY CONSISTENT (with one minor carry-over from Check 4)

**Spec 04 findings (verified by AUDIT-04):**
- ✅ `pixelFormat: 'P010'` does NOT exist in mediabunny — use `I420P10` instead. Documented in §11 Q7 / §14.C.
- ✅ 10-bit YUV values are MSB-aligned in 16-bit cells: extract via `u16 >> 6`, NOT `u16 & 0x3FF`. Documented in §14.A.
- ✅ `rgba10a2unorm` canvas is Chromium-only (not W3C spec), introduced in Chromium 118+. Documented in §14.E + §11.9 Q9.
- ✅ Working texture is `rgba16float` (scene-linear). Documented in §6.3.
- ✅ Canvas colorSpace is `display-p3` (wide gamut SDR) with `rgba10a2unorm` primary + `rgba8unorm` fallback.

**Spec 03** (`03-playback-engine.refined.md:307-336`) — uses `VideoSampleSink` (not `CanvasSink`) and calls `.toVideoFrame()` to transfer raw `VideoFrame` objects. The actual pixel format is whatever the browser's `VideoDecoder` produces (typically `'P010'` on Chromium for 10-bit H.265, but mediabunny wraps it transparently). The renderer (spec 04) handles both `P010` and `I420P10` layout cases per §11 Q7-Q8. ✅ Consistent.

**Spec 08** (`08-color-grading.refined.md`) — uses `rgba16float` working texture (`08-color-grading.refined.md:480`), updates LUTs from `rgba8unorm` → `rgba16float` (`08-color-grading.refined.md:1077, 1082`), updates scope source texture from `rgba8unorm` → `rgba16float` (`08-color-grading.refined.md:2034`). All consistent with spec 04. ✅

**Spec 11** (`11-cloud-render.refined.md:249, 263-332`) — cloud render uses `OffscreenCanvas` (line 249) and inherits the renderer from spec 04 (`WebGPURenderer`). Spec 11 does NOT independently specify a canvas format — it delegates to spec 04's renderer, which feature-detects `rgba10a2unorm` at runtime. ✅ Consistent (delegation, not duplication).

**Issue 6.1 — Spec 02 DecodeResponse uses `'p010'` format string (MINOR carry-over from Check 4):**
See Issue 4.1. Not a renderer/color issue per se, but the worker → main thread contract for decoded frames still uses a format string that doesn't match mediabunny's enum.

**Recommended fix:** Same as Check 4 fix — update spec 02 line 302 to use mediabunny's actual `VideoSamplePixelFormat` enum values.

---

### Check 7: Command pattern consistency

**Status:** ⚠️ MAJOR INCONSISTENCY (1 issue, carries over from Check 2)

**SCOUT-01 confirmed** (`01-core-engine.refined.md:1368-1467`): OpenCut-classic's actual Command pattern is:
- `abstract class Command { abstract execute(): CommandResult | undefined; undo(): void; redo(): CommandResult | undefined }`
- NO `id`, NO `label`, NO `coalesceKey`, NO state arg
- `BatchCommand` for transactions (`batch-command.ts:1-39`)
- `TracksSnapshotCommand` for coalescing (`tracks-snapshot.ts:1-29`)
- `previewElements({updates})` → `commitPreview()` → `command.push({command})` pattern at the manager layer

**Spec 01 §14 corrections** (`01-core-engine.refined.md:1808-1848`): correctly documents all of the above. ✅

**Spec 01 §3 preserved seed-spec text** (`01-core-engine.refined.md:142-156, 437-447`): still shows the OLD seed spec pattern:
- `interface CommandManager { execute(command); undo(); redo(); canUndo(); canRedo(); getHistory(); beginTransaction(label); endTransaction(); }`
- `interface Command { id: CommandId; label: string; execute(state): SceneState; undo(state): SceneState; coalesceKey?: string; }`

This is internally inconsistent within spec 01 (see Issue 2.1). The §3 text was NOT updated by REVISE-01.

**Spec 06** (`06-nle-ops.refined.md:14-16, 76-330`): correctly uses the new pattern — `BatchCommand`, `TracksSnapshotCommand`, no `id`/`label`/`coalesceKey`, parameterless `execute()`, `previewElements`/`commitPreview` for drag coalescing. ✅

**Spec 09** (project model): does NOT define its own Command pattern — it inherits the engine's. The persistence layer doesn't have undo/redo (only save/load/rename/delete with `withProjectLock`). ✅ Consistent (no conflict).

**Recommended fix:** Spec 01's §3 interface sketches (lines 119-156, 437-447) must be replaced with the corrected API, OR clearly marked as "⚠️ SUPERSEDED — see §14 for actual API".

---

### Check 8: Persistence layer consistency

**Status:** ✅ CONSISTENT

**Spec 01** (`01-core-engine.refined.md:273-281`) defines the `Storage` interface:
```ts
export interface Storage {
  loadProject(id): Promise<ProjectJSON | null>;
  saveProject(id, data): Promise<void>;
  listProjects(): Promise<ProjectMetadata[]>;
  deleteProject(id): Promise<void>;
  loadMedia(mediaId): Promise<Blob | null>;
  saveMedia(mediaId, blob): Promise<void>;
  deleteMedia(mediaId): Promise<void>;
}
```

**Spec 09** (`09-project-model.refined.md:334`) defines `class OPFSStorage implements Storage` — implements spec 01's interface. ✅
- Uses `withProjectLock(projectId, fn)` pattern (`09-project-model.refined.md:625, 1980, 2128, 2256`) — serializes save/rename/delete per project. ✅
- Avoids OpenCut-classic's kimdogyeom bugs #870 (lost-save race), #871 (poison-cache migration promise), #873 (rename/delete race). Documented in §13 with verbatim GitHub issue quotes. ✅

**Spec 02** (`02-workers-threading.refined.md:688-767`) documents `opfs.worker.ts` interface:
- `OPFSWorkerMessage`: `'save' | 'get' | 'delete' | 'list' | 'processUpload' | 'saveUpload'`
- Uses `FileSystemSyncAccessHandle` (worker-only API) for synchronous file I/O ✅
- MessageChannel pattern for per-request reply routing + progress streaming ✅

**Spec 09** (`09-project-model.refined.md:434, 727, 1543`) references `opfs.worker.ts` per spec 02 §8.6. ✅

**Spec 11** (`11-cloud-render.refined.md:246, 250, 577`) imports `RemoteStorage` and uses `storage: Storage` interface for the cloud render path. Spec 09's `MediaStorageRef` (`09-project-model.refined.md:226-230`) defines `type: 'opfs' | 'remote'` — so both OPFS and Remote storage are first-class. ✅

**Recommended fix:** None.

---

### Check 9: FCPXML export consistency

**Status:** ❌ CRITICAL INCONSISTENCY

SCOUT-10-RETRY (per worklog lines 1714-1813) found major corrections:
1. FCPXML is DTD-based, not XSD
2. `colorSpace` lives on `<format>`, not `<asset>` (per-asset override uses `colorSpaceOverride`)
3. `colorSpace` value is a triplet (`"1-1-1 (Rec. 709)"`), not a bare name
4. `<asset-clip>` has NO `timeScale` attribute (use child `<timeMap>`)
5. `<asset-clip>` has NO `volume` attribute (use child `<adjust-volume>`)
6. `<transition>` contains `<filter-video>`/`<filter-audio>` children, not `<effect>` directly
7. `<title>` requires a `ref` to an `<effect>` Motion template
8. `<sequence>` has NO `colorSpace` attribute (sequence colorSpace comes from referenced `<format>`)

**Spec 10** (`10-fcpxml-export.refined.md:55-138`) — all 8 corrections are reflected. ✅
- Line 62: `<format ... colorSpace="1-1-1 (Rec. 709)"/>` ✅
- Line 64: `<!-- Asset definitions: ... (note: no colorSpace attribute here) -->` ✅
- Line 128: `<asset colorSpaceOverride="1-1-1 (Rec. 709)">` (per-asset override) ✅
- Line 129: `<format colorSpace="1-1-1 (Rec. 709)">` (sequence colorSpace) ✅
- Line 119: `<transition>` with `<filter-video ref="..."/>` children ✅
- Line 120-121: `<asset-clip>` with child `<timeMap>` ✅
- Line 123: Child `<adjust-volume amount="-6dB"/>` ✅
- Line 125: Child `<adjust-blend amount="0.5" mode="normal"/>` (NOT `<adjust-opacity>`) ✅

**Issue 9.1 — Spec 09 §8.13 `formatColorAttrs()` uses OLD format (CRITICAL):**
Spec 09 (`09-project-model.refined.md:1669-1690`) still has the seed-spec implementation:
```ts
private formatColorAttrs(colorInfo: MediaColorInfo): string {
  let colorSpace: string;
  if (colorInfo.primaries === 'bt709') {
    colorSpace = 'Rec. 709';
  } else if (colorInfo.primaries === 'bt2020') {
    if (colorInfo.transfer === 'pq') colorSpace = 'Rec. 2020 PQ';
    else if (colorInfo.transfer === 'hlg') colorSpace = 'Rec. 2020 HLG';
    else colorSpace = 'Rec. 2020';
  } else if (colorInfo.primaries === 'display-p3') {
    colorSpace = 'Display P3';
  } else {
    colorSpace = 'Rec. 709';
  }
  return `colorSpace="${colorSpace}" `;
}
```

Three violations of spec 10's corrections:
1. **Wrong attribute name on `<asset>`**: returns `colorSpace="..."` (per spec 10, `<asset>` uses `colorSpaceOverride`, not `colorSpace`)
2. **Wrong value format**: returns bare names like `"Rec. 709"`, `"Rec. 2020 PQ"`, `"Display P3"` (per spec 10, format must be triplet like `"1-1-1 (Rec. 709)"`)
3. **Wrong placement**: this code attaches to `<asset>` (per spec 10, `colorSpace` belongs on `<format>`, with `<asset>` only carrying per-asset overrides via `colorSpaceOverride`)

The triplet mapping per spec 10's DTD (FCPXMLv1_10.dtd lines 70-73) is:
- `"1-1-1 (Rec. 709)"` for BT.709 SDR
- `"6-1-6 (Rec. 601 NTSC)"`
- `"5-1-6 (Rec. 601 PAL)"`
- `"9-1-9 (Rec. 2020)"` for BT.2020 SDR
- `"9-16-9 (Rec. 2020 PQ)"` for HDR PQ
- `"9-18-9 (Rec. 2020 HLG)"` for HDR HLG
- Display P3 is NOT in FCPXML 1.10's well-known triplets (added in v1.11+)

**Issue 9.2 — Spec 09 Correction #3 is also wrong (MAJOR):**
Spec 09 (`09-project-model.refined.md:1879`) says:
> 1. Use `MediaColorInfo` per `<asset>` (already in the seed).

This contradicts spec 10's correction: per `<asset>` uses `colorSpaceOverride` (NOT `colorSpace`). The bare-name `"Rec. 709"` format also contradicts spec 10. Spec 09's Correction #3 was authored before SCOUT-10-RETRY ran and needs to be updated.

**Issue 9.3 — Spec 04 DisplayMode doesn't map to FCPXML triplet (MINOR):**
Spec 04's `MediaColorInfo` (`04-renderer-color.refined.md:266-272`) and spec 09's `DisplayMode` (`09-project-model.refined.md:81-85`) define `primaries: 'bt709' | 'bt2020' | 'display-p3'` and `transfer: 'srgb' | 'pq' | 'hlg'`. These values DO cover the FCPXML triplet components, but neither spec includes the explicit mapping function. The mapping lives in spec 09's `formatColorAttrs()` (which is wrong per Issue 9.1).

**Recommended fix:**
1. Update spec 09 §8.13 `formatColorAttrs()` to:
   - Return `colorSpaceOverride="<triplet> (<name>)"` for `<asset>` per-asset overrides
   - Return `colorSpace="<triplet> (<name>)"` for `<format>` (sequence-level)
   - Map `bt709/srgb` → `"1-1-1 (Rec. 709)"`, `bt2020/pq` → `"9-16-9 (Rec. 2020 PQ)"`, etc.
   - For `display-p3`: emit `"1-1-1 (Rec. 709)"` with a runtime warning (Display P3 not in v1.10 DTD)
2. Update spec 09 Correction #3 to clarify the `colorSpace` on `<asset>` vs `<format>` distinction.
3. Consider moving the `formatColorAttrs()` implementation to spec 10 (since that's where the FCPXML schema authority lives) and have spec 09 reference it.

---

### Check 10: Browser compatibility claims

**Status:** ⚠️ MINOR INCONSISTENCY (1 issue — see Check 11 for master spec fix)

**Master spec §5** says "Chrome 113+ (Chromium) ✅ Yes — WebGPU + WebCodecs + OPFS + AudioWorklet".

**Spec 04** (`04-renderer-color.refined.md:248, 921, 947, 1247`) verifies:
- `rgba10a2unorm` canvas is **NOT in the W3C spec** — it's a Chromium-only extension.
- Introduced in **Chromium 118+**, gated behind `chrome://flags/#enable-unsafe-webgpu` initially, became default-on for capable hardware in **Chromium ~120+**.
- Hardware-dependent — not all Chromium 118+ installations support it.

So the actual browser matrix for 10-bit canvas is **Chromium 118+ (or ~120+ for stable)**, NOT 113+. Spec 04 correctly documents this with a runtime feature-detection fallback to `rgba8unorm`. ✅ within spec 04.

**Spec 11** (`11-cloud-render.refined.md:108-136`) — documents Chrome flags for real GPU WebGPU in headless Linux containers:
- `--no-sandbox`, `--headless=new`, `--enable-unsafe-webgpu`, `--enable-features=Vulkan`, `--use-angle=vulkan`, `--disable-vulkan-surface`, `--ignore-gpu-blocklist`, `--disable-gpu-sandbox`
- ⭐ KEY: `--enable-dawn-features=allow_unsafe_apis,disable_adapter_blocklist` (disables Dawn's separate adapter blocklist that rejects NVIDIA drivers 570+)
- `--disable-dawn-features=disallow_unsafe_apis`

Verified working on RunPod A40 (driver 570), Colab T4 (driver 580), Modal T4 (driver 580). ✅

**Spec 11 line 125** — `about:blank` in the seed-spec Chrome command example. Spec 11 line 1162 explicitly corrects: "Secure context (`http://localhost` or `https://`, NOT `about:blank` or `file://`)". The diagram at line 125 is the seed-spec illustration (clearly marked as such at line 100: "the diagram above is the *seed* architecture"). The actual cloud render harness serves on `http://localhost:PORT` per spec 11 line 100. ⚠️ Confusing but technically not wrong — the diagram is explicitly marked as seed.

**Spec 12** (`12-testing-strategy.refined.md`) — uses Mesa lavapipe (software Vulkan) for CI per worklog (lines 1397-1470). ✅ Consistent with spec 11's Dockerfile approach (`11-cloud-render.refined.md` §18.1 — FreeCut's existing Dockerfile uses Mesa lavapipe).

**Issue 10.1 — Master spec §5 browser matrix doesn't note the Chromium 118+ requirement for `rgba10a2unorm` (MINOR):**
Master spec line 325 says "Chrome 113+ (Chromium) ✅ Yes" but doesn't distinguish:
- WebGPU itself: Chromium 113+ ✅
- 10-bit `rgba10a2unorm` canvas: Chromium 118+ (or ~120+ stable), hardware-dependent ⚠️

This isn't a contradiction — Chrome 113+ gets WebGPU and 8-bit color; Chrome 118+ gets 10-bit canvas (with fallback to 8-bit). But the master spec should note this distinction.

**Recommended fix:** Update master spec §5 browser matrix to add a note: "10-bit canvas (`rgba10a2unorm`) requires Chromium 118+; falls back to 8-bit `rgba8unorm` on earlier versions or unsupported hardware (see `04-renderer-color.md` §11.9)."

---

### Check 11: Master spec updates needed

**Status:** 5 updates needed

Cross-referencing the 7 specific shifts mentioned in the task:

| # | Shift | Master spec status | Recommended action |
|---|---|---|---|
| 1 | mediabunny license is MPL-2.0 (not MIT) | ✅ UPDATED at `00-master-spec.md:309` | None — already done by REVISE-03. |
| 2 | 10-bit YUV MSB-aligned extraction (`>> 6` not `& 0x3FF`) | ❌ NOT IN MASTER SPEC | Acceptable — this is a renderer detail, not an architectural decision. Lives in spec 04 §14.A. |
| 3 | mediabunny doesn't support `pixelFormat: 'P010'` | ❌ NOT UPDATED — `00-master-spec.md:157` says "mediabunny configured to request `pixelFormat: 'P010'` on decode" and line 309 says "Request `pixelFormat: 'P010'` for 10-bit" | **CRITICAL UPDATE NEEDED**: Change to "mediabunny does not support `pixelFormat: 'P010'`; rely on browser's VideoDecoder producing `P010` for 10-bit H.265 on Chromium, or request `I420P10` for planar 10-bit YUV (see `04-renderer-color.md` §14.C)." |
| 4 | Chrome flags for real GPU WebGPU | ❌ NOT IN MASTER SPEC | Acceptable — cloud render detail. Lives in spec 11 §4.1. |
| 5 | FreeCut has 21 workers (not 21 in master spec's worker inventory?) | ⚠️ MASTER SPEC IS CORRECT BUT AMBIGUOUS — `00-master-spec.md:92` says "FreeCut has 21 Web Worker entry points + 1 AudioWorklet processor" — this is technically accurate (FreeCut has ~20-21 entry points if you count all AI/analysis workers). Spec 02 adopts 10+1 (pruned). | Consider adding a clarifying note: "We adopt 10 of FreeCut's 21 workers (pruning AI/analysis workers we don't need) — see `02-workers-threading.md` §3." |
| 6 | FCPXML is DTD not XSD | ❌ NOT IN MASTER SPEC | Acceptable — FCPXML export detail. Lives in spec 10 §11 + §13.F. |
| 7 | colorSpace triplet format | ❌ NOT IN MASTER SPEC | Acceptable — FCPXML export detail. Lives in spec 10 §3.1, §11. |
| 8 | `rgba10a2unorm` requires Chromium 118+ | ❌ NOT IN MASTER SPEC | **MINOR UPDATE NEEDED**: See Check 10 Issue 10.1. Add note to §5 browser matrix. |

**Summary of master spec updates needed:**
1. **CRITICAL**: Update line 157 + line 309 — remove "request `pixelFormat: 'P010'`" (mediabunny doesn't expose it; spec 04 §14.C confirms).
2. **MINOR**: Update §5 browser matrix — note Chromium 118+ requirement for `rgba10a2unorm` canvas.
3. **MINOR**: Update line 92 — clarify "we adopt 10 of FreeCut's 21 workers (pruning AI/analysis workers)."
4. **OPTIONAL**: Consider noting FCPXML is DTD-based (line 449 glossary entry for "FCPXML" could mention DTD vs XSD).
5. **OPTIONAL**: Consider noting colorSpace triplet format (line 454 "P010" glossary entry could cross-reference).

---

## Cross-stream fixes needed

### CRITICAL (would break implementation)

1. **FrameDescriptor shape mismatch** (Check 3, Issue 3.1/3.2)
   - **Spec 07** (`07-composition.refined.md:77-83`): produces `items: FrameItem[]` (mixed union)
   - **Spec 04** (`04-renderer-color.refined.md:486-500`): consumes `layers: Layer[]` + `sceneEffects: SceneEffect[]` (separate fields)
   - **Fix**: Adopt spec 07's `items[]` shape (matches OpenCut-classic's actual `FrameDescriptor`); update spec 04's `renderFrame()` to iterate `descriptor.items` with `item.type` discriminator. Also rename spec 07's `SceneEffect.effectPassGroups` → `SceneEffect.effects` for consistency with `Layer.effects`.

2. **FCPXML colorSpace format wrong in spec 09** (Check 9, Issue 9.1/9.2)
   - **Spec 09** (`09-project-model.refined.md:1669-1690`): `formatColorAttrs()` returns bare names like `"Rec. 709"` and attaches to `<asset>` as `colorSpace=`
   - **Spec 10** (`10-fcpxml-export.refined.md:128-129`): requires triplet format `"1-1-1 (Rec. 709)"`, on `<format>` (not `<asset>`), with `<asset>` using `colorSpaceOverride` for per-asset overrides
   - **Fix**: Rewrite spec 09 §8.13 `formatColorAttrs()` to emit triplets via `colorSpaceOverride` for `<asset>` and `colorSpace` for `<format>`. Update spec 09 Correction #3 wording.

### MAJOR (would cause confusion but not break implementation)

3. **EditorCore API drift in spec 05** (Check 2, Issue 2.2)
   - **Spec 05** (`05-timeline.refined.md:364, 420, 440, 504`): uses OLD method names `move/trim/split/insert`
   - **Spec 01 §14 corrections**: actual methods are `moveElements/updateElementTrim/splitElements`
   - **Fix**: Update spec 05 lines 364/420/440/504 to use the corrected method names.

4. **EditorCore API drift in spec 11** (Check 2, Issue 2.3)
   - **Spec 11** (`11-cloud-render.refined.md:284, 298, 313, 321`): uses OLD method names `getActive()/getActiveState()`
   - **Spec 01 §14 corrections**: actual methods are `getActiveScene()/getActiveSceneOrNull()`
   - **Fix**: Update spec 11 lines 284/298/313/321 to use the corrected method names.

5. **Spec 01 internally inconsistent** (Check 2, Issue 2.1 + Check 7)
   - **Spec 01 §3** (`01-core-engine.refined.md:75-251, 437-447`): preserves seed-spec text with OLD API (`SceneManager`, `getActive`, `setActive`, `beginTransaction`, `coalesceKey`, etc.)
   - **Spec 01 §14 corrections** (`01-core-engine.refined.md:1806-1962`): explicitly corrects to `ScenesManager`, `getActiveScene`, `BatchCommand`, etc.
   - **Fix**: Either (a) replace spec 01 §3 interface sketches with the corrected API, OR (b) add a clear "⚠️ SUPERSEDED — see §14" banner at the top of each old interface sketch.

### MINOR (cosmetic)

6. **Spec 02 DecodeResponse uses non-existent mediabunny format** (Check 4, Issue 4.1 + Check 6, Issue 6.1)
   - **Spec 02** (`02-workers-threading.refined.md:302`): `format: 'p010' | 'nv12'`
   - **Spec 03/04**: mediabunny doesn't expose `P010`; uses `I420P10` etc.
   - **Fix**: Update spec 02 line 302 to use mediabunny's actual `VideoSamplePixelFormat` enum values.

7. **Spec 11 internally inconsistent on entry point** (Check 5, Issue 5.1)
   - **Spec 11** (`11-cloud-render.refined.md:806, 813`): claims `createRenderEngine()` is used by BOTH browser AND cloud paths
   - **Spec 11** (`11-cloud-render.refined.md:825, 832`): uses `createInteractiveEngine()` for browser, `createRenderEngine()` for cloud (matches spec 01)
   - **Fix**: Update spec 11 lines 806/813 to reflect that browser preview uses `createInteractiveEngine()` and cloud render uses `createRenderEngine()`, both backed by the same `EditorCore`.

---

## Master spec updates needed

1. **CRITICAL**: `00-master-spec.md:157, 309` — remove "mediabunny configured to request `pixelFormat: 'P010'`" (mediabunny does not expose this option; see spec 04 §14.C). Replace with: "mediabunny's `VideoSampleSink` produces whatever format the browser's `VideoDecoder` chooses (typically `P010` for 10-bit H.265 on Chromium, or `I420P10` on other implementations); the renderer handles both layouts (see `04-renderer-color.md` §11 Q7-Q8)."

2. **MINOR**: `00-master-spec.md:325` (§5 browser matrix) — add note: "10-bit canvas (`rgba10a2unorm`) requires Chromium 118+; falls back to 8-bit `rgba8unorm` on earlier versions or unsupported hardware (see `04-renderer-color.md` §11.9)."

3. **MINOR**: `00-master-spec.md:92` — clarify: "FreeCut has ~21 Web Worker entry points (including AI/analysis workers we will not adopt) + 1 AudioWorklet processor. We adopt 10 of these workers + the AudioWorklet (see `02-workers-threading.md` §3)."

4. **OPTIONAL**: `00-master-spec.md:449` (glossary, FCPXML entry) — could add: "FCPXML is shipped as a DTD (not XSD); see `10-fcpxml-export.md` §13.F for the DTD reference and §14 for browser-side Zod validation strategy."

5. **OPTIONAL**: `00-master-spec.md:454` (glossary, P010 entry) — could add: "mediabunny does not expose `P010` as a requestable pixel format option; see `04-renderer-color.md` §14.C. Use `I420P10` (planar) or accept whatever format the browser's `VideoDecoder` produces."

---

## Recommendation

**Verdict:** ⚠️ MINOR FIXES NEEDED — ready for integration audit after 5 mechanical fixes.

**Priority order:**

1. **BLOCKER** (must fix before implementation can start):
   - Fix #1 (FrameDescriptor shape mismatch between specs 04 and 07)
   - Fix #2 (FCPXML colorSpace format in spec 09)
   - Fix #3 (EditorCore API in spec 01 §3 — supersede seed-spec text)
   - Master spec update #1 (remove `pixelFormat: 'P010'` claims)

2. **HIGH** (should fix before downstream consumers begin work):
   - Fix #4 (EditorCore API in spec 05 — update method names)
   - Fix #5 (EditorCore API in spec 11 — update method names)
   - Fix #6 (mediabunny format enum in spec 02)

3. **LOW** (cosmetic, can be deferred):
   - Fix #7 (spec 11 entry-point wording)
   - Master spec updates #2, #3, #4, #5

**Overall assessment:**

The 12 refined specs are individually well-audited and architecturally sound. The 12 audit reports collectively verified ~150 spot-checks against actual FreeCut and OpenCut-classic source code, with 5 PASS verdicts, 5 PASS-WITH-CAVEAT/PASS-WITH-REVISIONS, and 1 NEEDS-REVISION-then-PASS (spec 01). Spec 10 (FCPXML) was not audited — recommend running an audit pass before implementation phase P5.

The 7 cross-stream inconsistencies identified here are all **mechanical naming/shape mismatches**, not architectural disagreements. The 8 master spec decisions remain valid. None of the inconsistencies affect the WYSIWYG invariant (modulo the FrameDescriptor shape mismatch, which would prevent WYSIWYG from being implemented at all until fixed).

After applying the 4 BLOCKER fixes, the spec set should be ready for implementation phase P0 (playback spike). The 3 HIGH fixes should be applied before P3 (composition & transitions) and P5 (FCPXML export). The 4 LOW fixes can be applied opportunistically.

**Recommended next actions:**

1. Author a single "REVISE-CROSS" patch that applies all 4 BLOCKER fixes in one pass.
2. Re-audit spec 10 (FCPXML) — it's the only spec without an audit report.
3. After BLOCKER fixes land, the spec set can proceed to the implementation phases in `14-implementation-phases.md`.

---

**End of integration review.**

# 19 — Code References & Engine Reconciliation: Canon Hierarchy, Reference Map, Insight Ledger

**Stream:** Cross-cutting (reference architecture)
**Spec file:** `19-code-references.md`
**Status:** v2.0 (Round 8 — three-repo architecture: opencut-timeline landed, engine Waves 4A-4D re-baselined, cloudcut UX-spec integrated)
**Date:** 2026-09-02
**Consumers:** Implementation team, nle-engine workstream, opencut-timeline workstream, all stream specs (they carry per-spec code-reference sections that this doc governs)

---

## 0. TL;DR

This spec answers one question for everyone who touches the project after Round 8: **which code is authoritative, which code is a reference, and what must never be lost when we link to reference code instead of inlining it.** The spec set (00-18) is canon. Two private reference repos now flank it: **nle-engine** (clean-room FreeCut port — de-risks the engine side; inherits FreeCut patterns the spec corrects: 8-bit sRGB, JSON-RPC+$ref, class-API surface, single-tier tests, procedural media, zero workers, engine-native persistence shape) and **opencut-timeline** (clean-room OpenCut-classic port — de-risks the timeline side; built with spec awareness; carries prefixed command names on a refuted premise). A third source, the **cloudcut UX-spec** (app-layer UX from the prior iteration), is integrated with an ours-wins contradiction policy. The Round-8 seam resolution (§2.4): **one state model (SceneTracks), one wire protocol (spec 15), two algorithm homes, one render seam.** The rule throughout: **where reference code and the spec conflict, the spec wins; the delta is the documentation.** §5's insight-preservation ledger (33 rows) is the enforcement mechanism for the "never drop a hard-won insight" requirement.

---

## 1. Purpose

Six refinement rounds produced a spec set grounded in two public teacher repos. Since then, two private workstreams began producing *executable* code from the same lineage: nle-engine (2026-08-22 → active) and timeline-distill (starting). Code moves faster than prose and carries more detail than any spec can hold — but it also silently encodes the exact legacy patterns the spec set was designed to correct. Without an explicit hierarchy, every future contributor faces the same ambiguity that this round inherited: "the engine does X, the spec says Y — which wins?" This document makes that decision once, records the history that produced the ambiguity, maps every spec to its reference code with status tags, and maintains the ledger of implementation insights that must survive any future re-linking, re-forking, or re-distilling of the reference repos.

## 2. Canon Hierarchy & Workstream History

### 2.1 The hierarchy

| Tier | Artifact | Role | Authority |
|---|---|---|---|
| 1 — **Canon** | This spec set (`00`-`18`) | The design of record: 11 architectural decisions (9 seed + Decision 10 R7 + Decision 11 R8), contracts, test methodology | **Wins every conflict** |
| 2 — **In-between reference** | `bearachprema/nle-engine` (private) | Clean-room FreeCut-port engine; proves feasibility, de-risks implementation, operationalizes specs with concrete code | Reference only; corrective deltas in §6 |
| 3 — **In-between reference** | `bearachprema/opencut-timeline` (private) | OpenCut-classic distilled as a **timeline/multi-track engine core** (types, placement, snapping, ripple, ops, controllers, view math, headless API) — the timeline-side counterpart to nle-engine | Reference only; corrective deltas in §6 |
| 4 — **Teachers (public, read-only)** | `walterlow/freecut` (~250k LOC, MIT), `opencut-app/opencut-classic` (archived MIT) | Original sources of the architecture; cited with file:line throughout specs 01-12 | Historical authority; superseded as code, canonical as insight origin |
| 5 — **Visual reference** | `ui-mock/davinci_resolve_ui_mock.html` (this repo) | Layout/identity reference for the UI shell (spec 18) | Visual only; not code |

### 2.2 The history (why the engine is not spec-conformant)

The spec set and nle-engine began as parallel workstreams, both dated 2026-08-22. Cross-pollination between them was **real but shallow**: an early snapshot of the spec set was handed to the engine workstream mid-build with an instruction to apply any gaps; some did apply, but by then a large portion of the engine code was already written, and the engine workstream was consumed by its own complexity — delta analysis against original FreeCut (its Wave 1 read every relevant FreeCut source file; its own 7-track audit A-G re-verified claims against `/home/z/my-project/freecut/`). Consequences:

1. The engine's 13 architectural decisions (`.agents/DECISIONS.md`) were written **without** reference to our 9 decisions. Where they overlap (clock, registry patterns, structural/presentation split) they converge independently — strong signal. Where they diverge (wire protocol, color depth, API surface, testing, media, workers) they diverge **toward FreeCut**, because FreeCut was the engine's only teacher.
2. Whatever spec knowledge landed in the engine is partial and cannot be treated as canon-conformance. The engine is "closer to FreeCut, cleaned up" — which is exactly its value: it drags the implementation risk of the whole system down while leaving the *corrective* work (the part these specs exist for) explicit and well-scoped.
3. Direction of travel, therefore: **the engine converges toward the spec, never the reverse.** Round 7 starts that convergence with §7 (answers to the engine's own open decisions D1-D5) and the corrective mapping (§6). The engine's active gap-closure waves (see §9) are tracked so the seal round can re-baseline.

### 2.3 What "spec wins" means in practice

- A reference-citation that contradicts a spec contract is tagged **CORRECTIVE** in the per-spec code-reference sections and the delta is documented — never silently adopted.
- The engine's *verified bug findings* (its gaps/audit register) are evidence **for** spec discipline, not against spec content: e.g. its P0.1 texture-singleton bug is the live proof of spec 04 §7's pool-discipline rule.
- New insights discovered in reference code (e.g. FreeCut's occlusion cutoff, found in the engine's scene-assembly and missing from spec 07 §5.2) flow **up into the spec** via amendment — Round 7 did this for spec 07 §6.1 (cut-centered transitions) and §5.2 (occlusion) — and only then become canon.

### 2.4 The Round-8 seam resolution — one state model, one wire protocol, two algorithm homes, one render seam

opencut-timeline landed 2026-09-02 (@d3b2163, 136/136 tests) as a **timeline/multi-track engine core**, not the UI-only distill §3.2 originally recommended — it ports the full type system (core+types+snapping+placement+ripple ≈ 2,475 LOC), a 986-LOC `TimelineCore` engine, and a spec-15-shaped headless API. Its overlap with nle-engine (6,794-LOC `Timeline`, 102 methods, own snapshot undo, own headless surface) is resolved by this binding architecture (fed by SCOUT-R8-A §8.7; ratified as master Decision 11):

1. **One state model.** `SceneTracks {overlay[], main (singleton), audio[]}` (opencut-timeline `types/index.ts:95-99`) is the **runtime SceneState of record** — the executable form of Decision 2 / spec 06 §4.7 / spec 09's track sections. nle-engine's flat `TimelineData {fps, tracks[], clips[], transitions, markers, keyframes, compositions}` (`core/types.ts:1319-1370`) is the **persistence/composition-facing shape** (spec 07's scene assembly consumes flat; spec 09 serializes flat). Do NOT merge the models — the seam is an explicit `SceneTracks ↔ flat` **adapter** (implementation home: `src/scene/scene-adapter.ts`, spec 14 P1).
2. **One wire protocol.** Spec 15's bare `EngineCommand` (78 types) is the only protocol. Convergence work: opencut-timeline **renames its 18 prefixed types to canon** (`timeline.insert`→`insert`, `track.add`→`addTrack`, `track.remove`→`deleteTrack`, …) and aligns param shapes (SCOUT-R8-A §3.2 is the worklist; `PlannedElementMove`/`PlannedTrackCreation` already match spec 15 §4.3.3 field-for-field); nle-engine retires JSON-RPC+`$ref` per C2. No repo may invent a second protocol. — Note: the premise behind opencut-timeline's DECISIONS #9 ("00-master shows `{type:'timeline.split'}`") is **refuted**: 00-master:234 and :562 both show bare names; what its authors saw is spec 15 §4.2's *manager-method* column (`engine.timeline.splitElements(...)`), namespaced because it names methods, not command types. File as a correction to that repo, not as a canon conflict.
3. **Two algorithm homes.** opencut-timeline is the reference for **placement / zero-anchor / ripple-diff / split-snap-once / group-move / interaction controllers** (spec 05 §14.4-14.6, spec 06 §5.1-5.4, §5.9-5.10); nle-engine is the reference for **roll / slip / slide / rateStretch / retime / insert-edit-3-point / sync-lock** (spec 06 §5.5-5.8, §5.11-5.14, §6 — OpenCut never had these; FreeCut did). Both must express ops as pure functions over SceneTracks per spec 06 §4.6 before grafting.
4. **One render seam.** `setTracks()/renderFrame(t)` (opencut-timeline `render/placeholder-compositor.ts:116`) is the compositor contract; nle-engine's WebGPU compositor plugs in behind it (after its C1 8-bit corrective work). Every UI/test pixel assertion flows through this seam.
5. **One undo family.** Both repos are snapshot-based (spec 15 §6.2 strategy 2). opencut-timeline's transaction machinery (eviction-suspended batches, depth-anchored rollback, redo-stack clear, undo/redo-rejected-inside-batch) is absorbed into spec 15 §7 by Round-8 amendment; nle-engine's now-keyframe-aware `snapshotsEqual` (P0.6 fixed) is the live reference for ledger #12.

**Undo-layer note:** the cloudcut UX-spec's time-windowed EDL-snapshot undo (ux-spec 20 §2.1) is REJECTED as canon-incompatible — see the Round-8 rejection register (SCOUT-R8-C §6) and spec 18 §8.

## 3. Reference Repo Map

### 3.1 nle-engine — `github.com/bearachprema/nle-engine` (private)

**What it is:** a minimal NLE engine built from scratch with FreeCut as architectural reference (its Decision 1), ~38k LOC of pure TypeScript engine under `src/lib/nle/` (no React in the core — its Decision 9; the surrounding Next.js app is a test harness), plus the deepest FreeCut delta-analysis in existence (its `gaps/` directory: 30 wave-gap files + a 12-file audit of its own).

**Verified state (2026-09-02, post Waves 4A/4B/4C.1-3/4D-A — re-baselined by SCOUT-R8-B; line numbers moved where noted):**

| Surface | State | Evidence (file:line) |
|---|---|---|
| LOC / files | ~41k / 31 under `src/lib/nle/` (persistence module added) | module census (HANDOFF) |
| Tests | 144/144 REPORTED, 21/21 milestones, single-tier Playwright + Xvfb + SwiftShader; pixel-truth regression milestones m19.2/m20/m21 now proven at scale | `scripts/run-nle-tests.mjs`; `.agents/DECISIONS.md` #12 |
| NLE ops | 102 public `Timeline` methods; ~20 op families matching spec 06 §5 (line drift: split :2461, rippleDelete :3547/:3573, removeItems :3715, slip :4045, slideItem :4133, performInsertEdit :4574, freezeFrame (moved), joinItems (moved) — SCOUT-R8-B §6 table is the current census) | `timeline/timeline.ts` (6,794 LOC) |
| GPU effects | 43-44 registry entries — **count drift persists** (HANDOFF says 43; `pipeline.ts:4560-4603` holds 44) | `effects/pipeline.ts` |
| Transitions | 27 presentations, cut-centered planner, handle clamping (unchanged) | `transitions/registry.ts:2249`, `planner.ts:21/:27`, `handle-utils.ts:302` |
| Clock / video sync | Faithful FreeCut port (unchanged) | `core/clock.ts` (:550, :612, :661), `playback/video-sync.ts` (:180, :224, :925) |
| Compositor | Ping-pong pipeline, 25 blend modes — **still 8-bit `rgba8unorm`** (C1 stands); BUT pool discipline LANDED and pixel-verified (m20.1/20.2/20.5) | `gpu/compositor.ts` (:32, :981) |
| Audio | 6-band EQ + RBJ biquads + granular pitch-shift AudioWorklet (Wave 5A pending) | `audio/mixer.ts`, `soundtouch-processor.worklet.ts:47` |
| LUT | 3D `.cube` parser — 8-bit quantized, no linear↔sRGB conversion (inherited FreeCut bug stands) | `effects/lut.ts` (:314, :337) |
| Headless API | 19-op JSON-RPC + `$ref` (unchanged — dispatch now :780, resolver :540-548, allowlist :472-480) | `headless/api.ts` |
| Persistence | **Wave 4B LANDED (1,174 LOC): serialize/hydrate/migrate/normalize + ~27-code warnings channel + real `editProject` round-trip — but serializes the engine-native "v2" shape (D1 resolved AGAINST the spec answer; see C8 + §7 D1 escalation)**. No Zod, no scenes/media, no storage plane (D5 open) | `persistence/index.ts` (:5-9, :65-67, :162-183, :352-387, :411-585), `api.ts:1070-1130` |
| Render loop | **Wave 4C LANDED: per-type branches — CompositionItem (recursive `_buildLayersForData` + offscreen nested composite, m19.2 pixel-verified), AdjustmentItem + ImageItem end-to-end (m21, 7 pixel tests). The `player.ts:1038` non-video-skip counter-example is RETIRED** | `playback/player.ts`, `playback/scene-assembly.ts`, SCOUT-R8-B §3 |
| Known bugs (its own register) | **P0.1 texture-singleton (FIXED — `applyToTexture` :5076/:5156), P0.2 mask double-invert (FIXED — `getMaskResult` :474, invert-once), P0.6 keyframe-blind undo equality (FIXED — `snapshotsEqual` :1772-1803, keyframe-aware)** | `gaps/audit/MASTER.md` |
| Text stack | **Wave 4D-A LANDED: TextItem state-level CRUD + headless `addText` + persistence clip-allowlist** — rendering deferred to 4D-B; D3 spec-coverage question still open | `core/types.ts:936`, `timeline.ts:2341`, `api.ts:800`, `persistence:720-729` |
| UI | No React timeline, no shell — `src/app/page.tsx` is a 6,483-LOC test runner only | repo census |
| Workers | **Zero** Web Workers (unchanged) | grep-verified |
| Media | Procedural `VirtualVideo`/`VirtualAudio` only; zero mediabunny imports (Wave 6A pending) | `media/virtual-video.ts:5` |

**Its roadmap of record:** `gaps/audit/MASTER.md` — consolidated P0 (8) / P1 (14) / P2 / P3 registers, dependency graph, wave plan 4A (correctness: texture pool, undo equality, player events, 26 P0 tests) → 4B (persistence module) → 4C (render the unrendered item types) → 4D (text stack, ~3,900 LOC phased port) → 5A/5B (audio scene, export M1) → 6 (real media: mediabunny M1 → decode layer → reverse-conform) → 7 (P2 backlog).

### 3.2 opencut-timeline — `github.com/bearachprema/opencut-timeline` (private, LANDED Round 8)

**What it is:** the timeline-side counterpart to nle-engine — OpenCut-classic distilled as a **timeline/multi-track engine core** (@`d3b2163`, 34 files / 11,375 LOC under `src/lib/timeline/`, 136/136 tests across 16 milestones, three review rounds). Unlike the "UI-only, leave the types out" shape §3.2 originally recommended, it deliberately ports the full type system + ops engine + headless API (the user's own framing: "more like timeline / multi-track engine core"). It was built **with spec awareness** — its README cites Decision-2 type adoptions and the spec-15 wire protocol — and its `TimelineCore` method surface **already matches spec 15 §4.2's manager-method column 1:1** (`splitElements`, `moveElements`, `trimElements`, `deleteElements`, `insertElement`, `duplicateElements`, `updateElements`, `toggleTrackMute`, `addTrack`, `removeTrack`, …). Its W4 (React components) is pending: no DOM component tree yet — M15 is a test renderer, not the spec 05 §4 component tree.

**Verified state (SCOUT-R8-A, 12/12 citation checks passed):**

| Module (LOC) | Contents | Spec value |
|---|---|---|
| `core/` (395) | `MediaTime` 120k branded ticks (:21), rational `FrameRate` (:9), deterministic id counter (:10) | Decision-2/3 type layer executable; `resetIdCounterForTests` (:15) is the test-replay pattern |
| `types/` (299) | `SceneTracks {overlay[], main singleton, audio[]}` (:95-99), 5 TrackTypes (:43), 7-way element union (:155), drag/drop models (:240-271) | **The runtime state model of record** (§2.4.1); spec 06 §4.7 executable |
| `snapping/` (151) | zoom-aware threshold `(10px/pps)*TICKS` (:48), closest-wins (:73), lazy sources, keyframe-source seam (:44) | Spec 05 §14.6 reference, exact |
| `placement/` (807) | 5-strategy union (:43-54), reject-not-shift overlap, **magnetic main-track zero-anchor** (`enforceMainTrackStart` :167) | Spec 05 §14.5 + spec 06 §5.9; zero-anchor semantics = ledger #26 |
| `ripple/` (395) | diff-based ripple (vacated−joined interval arithmetic, `computeRippleAdjustments` :121) | Spec 06 §5.4's adopted algorithm, executable |
| `ops/` (2,434) | group-resize (snap-once trim), group-move (`PlannedElementMove` :69 — **exact spec 15 §4.3.3 match**), split (retainSide), retime math | Spec 06 §5.1-5.3 algorithm layer |
| `ops/timeline-core.ts` (986) | `TimelineCore` class: ops + preview/commit (:795/:814) + `UndoStack` w/ transactions (:112-207) + events + logical playhead | The engine.timeline manager surface; spec 06 §4.6 preview/commit reference |
| `view/` (501) | 50 px/s base, exponential zoom (MIN 0.1/MAX 100), DPR-snapped pixels, ruler interval tables, layout constants | Spec 05 §5/§14.3 view math; ledger #28 |
| `controllers/` (1,781) | framework-free state machines: resize, playhead scrub, element drag (`TIMELINE_DRAG_THRESHOLD_PX = 5` :51), zoom, drop-target | **Spec 05 §14.4's controller architecture, verified 1:1** |
| `media/` (158) | virtual solid-color video + pure-tone audio + Goertzel detection (:107) | Engine-compatible test media (spec 17 §5 pattern) |
| `render/` (323) | `PlaceholderCompositor` Canvas2D, `setTracks` (:116)/`renderFrame(t)`, waveform peaks + drawn-column measurement | **The render seam (§2.4.4)**; M12/M13 = tri-invariant pixel/audio legs |
| `headless/` (404) | 18-type command union (:38-87), `CommandResult {ok, code…}` (:89-102), atomic `applyBatch` (:346), out-of-band readouts | Spec-15 skeleton, wrong names (C7) + 5 coarse codes vs §6.3's ~24 |
| `testing/` (3,369) | M1-M16: 78+38+20 tests; custom in-page harness (NOT Vitest); M11 = state-WYSIWYG via synthetic events; M14 = command-path == direct-path | Spec 17 re-tier source (M1-M10 are Vitest-ready pure TS) |

**Its decisions:** 10 in `.agents/DECISIONS.md` — pure-TS Rust-port time system (D1, citing our Decision 3), TimelineCore composition, snapshot undo, determinism ids, the Canvas2D placeholder compositor as seam, virtual media following the nle-engine pattern, NOOP-vs-NOT_FOUND split, framework-free event types, and the **false-premise prefixed command names** (D9 — see §2.4.2 and C7).

**Division of labor (binding, §2.4.3):** opencut-timeline = placement/zero-anchor/ripple-diff/split-snap-once/group-move/controllers; nle-engine = roll/slip/slide/rateStretch/retime/insert-edit-3-point/sync-lock. Its own gaps doc charts W4 (components) and W5/W6 (the 60 absent spec-15 commands) — the command-name rename pass (C7 convergence) is the prerequisite for both.

### 3.3 cloudcut UX-spec + cloudcut-nle — `github.com/frejogochukwuout/cloudcut-nle` branch `ux-spec` (integrated Round 8)

**What it is:** the prior cloudcut iteration's UX knowledge, distilled into a mature app-layer UX spec set (`docs/ux-spec/`, 28 files / 7,933 LOC, v1.3.5, three review rounds, 0 MAJOR remaining) — the user's "fullest" source on app shell and application/project-level logic. Integrated per the canon rule: **where it contradicts the spec set, the spec set wins** (25 contradictions logged in SCOUT-R8-C §3 with resolutions; the rejection register lives in SCOUT-R8-C §6 and spec 18 §8). Its adoptions landed in spec 18 v1.1 (context menus, per-panel states, a11y floor, error/toast presentation, visual language, pointer grammar, perf budgets, media-pool depth, drag/ruler feedback, save-status chip, inspector field contracts, viewer affordances, Deliver-page UX) and in 00-master's new non-functional requirements section. The cloudcut-nle repo itself (main branch) serves as the **UX/app-scope reference codebase** (tier-5-style: messier, lower quality, but the working as-built for app-shell/project flows — cite for UX patterns, never for engine patterns; engine reference stays nle-engine).

### 3.4 Teachers (public)

FreeCut and OpenCut-classic remain the citable, public sources of record. Every claim in specs 01-12 carries their file:line citations, verified by the 16 audit reports in `audits/`. They stay in tier 4 even as tiers 2-3 grow, because they are the only *public* evidence chain — valuable for anyone outside the private repos.

## 4. Link vs Inline Policy (recommendation)

The spec set's options were: link reference code and slim the prose, or keep inlining distilled versions. Round 7 adopts **link + distilled-insight callout** as the default, with three mandatory-inline cases:

1. **Default — LINK + callout**: a per-spec "Code References — nle-engine (reference, NOT canon)" table (inserted in every stream spec this round) maps spec section → `file:line` → one-line verified quote → status tag → note. The link carries the detail; the note carries the delta.
2. **Inline whenever the insight is a FreeCut-iteration lesson not visible in reference code** — e.g. why `<video>` decode was rejected (spec 03 §5.1), the CDP ArrayBuffer serialization cost (spec 11), the kimdogyeom persistence bugs (spec 09 §13). These exist only as prose; linking would orphan them.
3. **Inline every correction of a FreeCut pattern** — the "why we diverge" text (Decision 5's color-space reasoning, spec 15 §14.11's output-command design). The correction is the spec's own content; the reference repo's code can never carry it.
4. **Inline when contract precision requires code-level shape** — Zod schemas, type unions, method signatures (spec 15 §4/§11, spec 09 §3). Consumers implement against these directly.

**The enforcement mechanism is §5's ledger**: every crown-jewel insight is enumerated with its spec home; any future pass that rewrites or slims a spec must relocate each ledger row, not delete it. A link that replaces an inlined insight must point at where the insight now lives — the ledger row is the tripwire.

## 5. Insight-Preservation Ledger (never drop these)

Years of FreeCut iterations plus six rounds of distillation produced specific, hard-won implementation insights. Each row below is load-bearing: it either corrects a real bug pattern, encodes a non-obvious API reality, or pins a numeric constant somebody bled for. The "visible in" column shows where reference code *also* demonstrates it — that column is a convenience, never a substitute for the spec text.

| # | Insight | Spec home | Visible in (reference) | Class |
|---|---|---|---|---|
| 1 | `AudioContext.currentTime` is the only trustworthy clock; `performance.now()` drifts vs audio; monotonic `Math.max` guard; 100ms `timeupdate` throttle; re-anchor on seek/rate/visibility | 03 §3.2-3.4 | nle-engine `core/clock.ts` (:550, :565, :612, :661) — near-verbatim | Corrects drift |
| 2 | Six sync plans with exact thresholds: 0.2s large drift, 0.15 rate cap, ±5%/±15% rVFC bands, -0.2s/+80ms behind debounce, +0.5s far-ahead, 1ms coalesced-seek epsilon; hard seeks only on target discontinuity | 03 §6 | engine `video-sync.ts` (:180-224) | Constants |
| 3 | Sync plans drive *decode rate*, not `<video>.playbackRate` — WebCodecs frame timestamps are the actuator (mediabunny `VideoSampleSink`) | 03 §5.1, §6.5 | engine ports plans but targets DOM elements (CORRECTIVE) | Corrects FreeCut |
| 4 | mediabunny exposes NO `pixelFormat` option (`VideoSinkDecoderOptions` = hardwareAcceleration + optimizeForLatency only); 10-bit arrives as `I420P10`-family from the browser's VideoDecoder | 03 §5.2/§14.D, 04 §14.C, 00 glossary | — (API reality) | API reality |
| 5 | 10-bit YUV values are MSB-aligned in 16-bit cells — extract via `u16 >> 6`, never `& 0x3FF` | 00 §12 glossary, 04 §5.1 | — | Corrects bit-packing |
| 6 | Scene-linear is the only correct compositing space; FreeCut applies exposure on sRGB-encoded values (`c *= pow(2.0, exposure)` at color.ts:611) — the canonical "what not to do" | 00 D5, 04, 08 | engine reproduces the 8-bit sRGB baseline (29 `rgba8unorm` sites) | Corrects FreeCut |
| 7 | LUT sampling needs linear↔sRGB conversion around the lookup; FreeCut (and the engine port) sample raw — banding + wrong colors | 08 §7.4 | engine `lut.ts:337` (bug preserved) | Corrects FreeCut |
| 8 | Ping-pong textures must be pool-acquired per consumer; returning a pass-owned singleton corrupts the second effected/masked clip in the same frame | 04 §7, 07 §7.3/§8.3 | engine P0.1/P0.2 (pipeline.ts:5107, mask-manager.ts:478) — the live bug | Discipline |
| 9 | Render loop must composite ALL item types; `if (clip.type !== 'video') continue` silently renders blank output for comps/images/adjustments | 04 §7.1, 07 §12.2 | engine player.ts:1038 (its #1 structural bottleneck) | Discipline |
| 10 | Transitions: structural type (cut-centered adjacency, clips don't move) split from presentation (shader); hidden source handles + alignment math + binary-search max duration | 07 §6 (Round-7 amendment) | engine planner.ts:27, handle-utils.ts:302, registry.ts:2249 | Adopted from FreeCut |
| 11 | Scene assembly walks DESC (occlusion cutoff at first fully-opaque top item); compositor paints array order; player reverses — the reversal lives in the player, not assembly | 07 §5 (Round-7 amendment) | engine scene-assembly.ts:1243/1263 | Adopted |
| 12 | Undo snapshot equality must cover the FULL field set (17 fields incl. keyframes, compositions, backgroundColor) — keyframe-only edits silently stop being undoable | 06 §7, 15 §14.1 | engine P0.6 (timeline.ts:1746) | Discipline |
| 13 | Batch commands must roll back on partial failure (atomic all-or-nothing) — aborting mid-batch and keeping prior ops corrupts state | 15 §7.1 | engine api.ts:985 (keeps pre-failure state) | Discipline |
| 14 | Commands are pure JSON; input I/O happens pre-command (probe/persist before `importMedia`); output artifacts ride `CommandResult.data` (§14.11 output exception); `$ref`-style intra-batch pointers make commands non-replayable — pass IDs by value | 15 §2/§5.4/§14.2/§14.11 | engine api.ts:542 (uses `$ref` — CORRECTIVE) | Corrects FreeCut |
| 15 | Deterministic replay needs `idSeed` on ID-generating commands (split/insert/duplicate/…) | 15 §14.6 | — | Testability |
| 16 | Three-tier testing + UI-interaction-tax rules; engine-only single-tier suites miss error paths (engine: ~9% error-path coverage, 1 throw assertion in 124 tests) | 17 §2/§13, 12 | engine gaps/audit/G | Methodology |
| 17 | WYSIWYG tri-invariant (state/pixel/audio) is CI-blocking, not aspirational | 00 §7/§13, 17 §6 | — | Methodology |
| 18 | AudioWorklet varispeed topology: 0-input worklet, push via port, so it runs inside `OfflineAudioContext` (audio WYSIWYG); granular pitch shift is the simplified fallback when full WSOLA isn't ported | 02 §7.2, 03 §8.2 | engine worklet is 1-in/1-out (`:47`) — CORRECTIVE | Corrects topology |
| 19 | FCPXML 1.10 is DTD-validated (not XSD); most attributes are CDATA — Zod must layer type/range checks; `colorSpace` needs the triplet format + Display P3 requires 1.11+ fallback to `1-1-1 (Rec. 709)` | 10 §3/§11/§13 | — (format reality) | API reality |
| 20 | mediabunny is MPL-2.0 (weak file-level copyleft) — safe via npm, modifications must be shared | 00 §4 stack row | — | License |
| 21 | Worker pool discipline: lazy creation + idle reuse + main-thread fallback for export; FreeCut's 21 workers prune to 10 (the survivors are the load-bearing set) | 02 §3 | engine: 0 workers (counter-example) | Adopted from FreeCut |
| 22 | `snapshotsEqual` + orphan cleanup: every removal op must prune orphaned keyframes; weak `restore()` paths need sanitize/prune/re-sort/overlap-repair with warnings | 06 §7, 09 §5 | engine P1.11/P1.12 | Discipline |
| 23 | CPU-side FFT verification (fft.js, not fftw-wasm which doesn't exist on npm); distinct-frequency tones + solid-color clips make pixel/audio assertions exact | 12 §14, 17 §5 | — | Testability |
| 24 | GPU readback (not rendering) is the cloud-render bottleneck: ~80fps 4K / ~20fps 8K; pipeline 3 frames in flight | 11 §15 | — | Constants |
| 25 | `Xvfb` is mandatory for headless Chrome WebGPU even with `--headless=new` (requestAdapter returns null otherwise); SwiftShader flags `--use-vulkan=swiftshader` + `--enable-unsafe-swiftshader` work in-container (engine-validated); lavapipe is the FreeCut-pattern canon choice | 12 §3.2/§14.A | engine run-nle-tests.mjs:8-35, DECISIONS #12 | Infra reality |
| 26 | **Magnetic main-track zero-anchor**: empty main → element lands at ZERO; requested start ≤ earliest element → clamp to ZERO; sole main element cannot group-move off 0 (`moveElements` on raw track data is the escape hatch) | 05 §8.3/§14.5 (R8), 06 §5.9 | opencut-timeline placement/index.ts:167-197; M5 fixtures | Adopted from OpenCut |
| 27 | **Insert startTime-override**: first element lands exactly at requested `startTime`, later elements keep relative offsets, then zero-anchor may shift the whole batch; the element's own `startTime` field is ignored on insert | 06 §5.9 (R8) | opencut-timeline SKILL gotcha #2; api.ts:169-172 returns actual landed time | Adopted |
| 28 | **View-math constants**: 50 px/s base zoom, zoom-multiplier [0.1, 100] with dynamic zoom-to-fit minimum, DPR-snapped pixel math, drag threshold 5px strict-`>`, ruler interval tables [2,3,5,10,15]/[1,2,3,5,10,15] + 120px/18px min spacings, playhead line 2px | 05 §5.2/§14.3 (R8) | opencut-timeline scale.ts:6-8, pixel-utils.ts:9/:63-85, element-interaction-controller.ts:51, ruler-utils.ts:21-43 | Constants |
| 29 | **Coordinate-space contract**: `clientX/Y` are viewport-space; `elementRectLeft` must be `getBoundingClientRect().left` (not content-space) — mixing the two is the classic drag-drift bug | 05 §8.3 (R8) | opencut-timeline SKILL gotcha #3, DECISIONS #8 | Discipline |
| 30 | **NOOP is not NOT_FOUND**: a trim clamped to a no-op (at source bounds) returns `ok:false` with a NOOP-class code, distinct from element-not-found; tests assert the distinction | 15 §6.3 (R8), 06 §5.2 | opencut-timeline api.ts:198-208, M16 | Testability |
| 31 | **Atomic-batch transaction semantics beyond all-or-nothing**: eviction suspended during transactions, depth-anchored rollback (no history drain), redo-stack cleared after rollback, undo/redo rejected inside batches, intra-batch overlap guard for insert batches | 15 §7 (R8) | opencut-timeline DECISIONS #10 addendum, applyBatch :346-381; 3 review rounds | Discipline |
| 32 | **Fake-commit bug class**: an op that returns the original object (not a new reference) defeats snapshot-diff undo — split/join/persistence ops must return structurally-new state | 06 §5.x constraints (R8), 09 §5 | opencut-timeline worklog Task 4; engine's editProject bug (retired) | Discipline |
| 33 | **Command-path == direct-path determinism test**: the WYSIWYG replay invariant is testable as `f(command path) === f(direct manager path)` without any UI — M14 pattern; plus `resetIdCounterForTests` for id determinism (align to spec 15's `idSeed` at the wire boundary) | 17 (R8), 15 §14.6 | opencut-timeline milestones M14; core/id.ts:15 | Testability |

## 6. Corrective Mapping — FreeCut patterns the engine inherited and the spec corrects

These are the systemic deltas (verified in reference source this round). C1-C6 are the FreeCut patterns the engine inherited; C7-C8 are Round-8 additions (opencut-timeline's protocol naming; the engine's persistence shape). Each row: what the reference does (with citation) → what the spec mandates → the convergence work.

| # | Engine (inherited FreeCut pattern) | Spec mandate | Convergence |
|---|---|---|---|
| C1 | 8-bit sRGB `rgba8unorm` end-to-end (29 sites across compositor/effects/masks/transitions/player/lut) | Decision 5: 10-bit pipeline, scene-linear working space, `r16uint` plane uploads, `rgba16float` compositing, `rgba10a2unorm`+display-p3 canvas | Re-texture every pass (formats + shader math); the effect *algorithms* port, the color space is rebuilt |
| C2 | Headless protocol = 19-op JSON-RPC + `$ref` field pointers (`api.ts:747/:542`) | Spec 15: 78-type `EngineCommand` discriminated union, Zod-canonical, single `engine.command.apply()` dispatcher, replayable by value | Build the command layer as a **dispatcher adapter over the existing 102-method class surface** (the methods are the algorithm layer); retire `$ref` (pass IDs by value) |
| C3 | Class-based `Timeline` manager API is the primary mutation surface | Decision 9: every mutation flows through `apply()`; managers become the implementation layer commands dispatch to | Same adapter as C2 — spec 15 §4.2's mapping table is the contract |
| C4 | Single-tier Playwright suite (124 tests in-app, DOM-scraped results, ~9% error-path) | Spec 17 three-tier (Vitest T1 / render T2 / UI T3) + property-based + WYSIWYG invariants | Re-tier per the engine's own G-charter (it independently recommends extracting ~60 CPU tests to Vitest — converging) |
| C5 | Procedural `VirtualVideo`/`VirtualAudio` media; zero mediabunny imports | Spec 03: mediabunny + WebCodecs decode path, 10-bit, in decode worker | Build spec 03's path fresh (engine's own Wave 6A converges; `MediaRegistry` is the seam it was designed for) |
| C6 | Zero Web Workers (all decode/audio/waveform on main thread) | Spec 02: 10-worker pool + `ManagedWorker` (lazy create, idle reuse, export fallback) | Build spec 02 fresh; engine main-thread code becomes the worker *bodies* |
| C7 | **opencut-timeline prefixed command names** — all 18 headless types are `timeline.*`/`track.*`-prefixed on the false premise that 00-master shows `{type:'timeline.split'}` (refuted: 00-master:234/:562 are bare; the namespaced surface its authors saw is spec 15 §4.2's manager-method column) | Spec 15: bare command types, 78-member union | Mechanical rename pass (18 types) + param-shape alignment per SCOUT-R8-A §3.2; `PlannedElementMove`/`PlannedTrackCreation` need zero work. Also: 5 coarse result codes vs §6.3's ~24; no `stateChange` payload; 60 of 78 commands absent (W5/W6) |
| C8 | **Engine persistence serializes the engine-native "v2" shape** (flat `id/name/createdAt` + `timeline{fps, clips, RGBA-array backgroundColor}`, `schemaVersion: 2`; MASTER §0 records D1 resolved "engine-native v2") — directly contradicting §7's D1 answer; now THREE competing project shapes in the engine (v2, FreeCut wire, headless-normalized) | Spec 09 §3: `ProjectJSON` (`metadata`/`settings`/`scenes`/`schemaVersion`, Zod-validated) | Hold the spec line (Round-8 decision): v2 reclassified as internal intermediate; a spec-09-shaped serializer written as an adapter over `serializeTimeline`/`hydrateTimeline` (bounded — clean seams at persistence/index.ts:162/:312). The migrate/normalize/warnings semantics ARE spec-09-§5-compatible and portable; only the JSON shape is not |

Plus two engine-local patterns worth naming because they are the spec's strongest validation: the render-loop item-type skip (P0.3-class, ledger #9) and the singleton-texture returns (ledger #8) are precisely the failure modes the spec's discipline rules exist to prevent — keep them as documented counter-examples even after the engine fixes them.

## 7. Answers to the Engine's Open Decisions (D1-D5)

The engine's master gap charter (§8) lists 5 blocking decisions. The spec set already answers four of them; this section is the Round-7 cross-pollination the workstreams never had.

| ID | Engine's question (MASTER §8) | Spec answer | Notes |
|---|---|---|---|
| D1 | Canonical project wire shape: engine-native (inline fps, `clips`) vs FreeCut's (metadata, `timeline.items`) | **Neither — spec 15's `ProjectJSON`** (spec 09 §3: `metadata`/`settings`/`scenes`/`schemaVersion`, Zod-validated). **R8 escalation: the engine's Wave 4B resolved D1 as "engine-native v2" — AGAINST this answer** (C8). Convergence path (Round-8 decision, Scout-B §8.1 option a): hold the spec line; the engine's v2 shape is an internal intermediate; a spec-09 serializer adapter over its clean serialize/hydrate seams is the bounded convergence task. Do NOT bless the v2 shape — it lacks scenes/media/displayMode/ISO times and would create a third wire shape | Also resolved by spec 09 C1-C3 fixes (schemaVersion literal, migrate-then-parse) |
| D2 | mediabunny as first runtime dependency vs zero-dep WebCodecs hand-roll | **mediabunny** (master spec §4 stack; spec 03 §5.2 API surface verified). Lazy-import is fine; keep the procedural path dep-free for tests (engine's own recommendation aligns) | Matches the engine's recommendation; MPL-2.0 ledger #20 |
| D3 | Font assets for text stack: bundled vs CDN vs caller-provided | **Not spec'd — engine-local.** Spec coverage of text = FCPXML title export (spec 10 §4) only. Recommendation: bundled 2 weights + caller registry (engine's own lean), and flag text-stack *spec coverage* as a seal-round question (the engine's A2 port plan is de facto the reference) | Spec gap acknowledged |
| D4 | Lottie renderer adapter vs skip | **Skip for v1** (out of scope — master §1; no spec consumes lottie). Injectable adapter default-off is acceptable if already built; do not let it grow scope | — |
| D5 | Storage: engine-internal OPFS port vs host-provided `MediaStore` interface | **Interface in the engine, host provides impl — OPFS as the reference implementation** (spec 09 §4.1: `OPFSStorage implements Storage`; Goal 3 swappable). The engine's Wave 4B persistence module should target spec 09's schema/migration/normalization contracts directly | Spec 09 §5 is the port target |

## 8. Engine Subsystem ROI — refactor vs rebuild

Per-subsystem decision table (the "selective grafting hybrid"). "Verdict" is the Round-7 recommendation; the seal round re-baselines after the engine's waves land (§9).

| Subsystem | Engine state (verified) | Spec target | Verdict | Rationale |
|---|---|---|---|---|
| NLE op algorithms (split/trim/ripple/roll/slip/slide/insert/range-…) | ~20 families, 102 methods, tests green | 06 §5 + 15 command layer | **Refactor (graft)** | Math is ALIGNED and test-covered; wrap in command layer + `SceneTracks` model adaptation |
| Transition planner + handles + 27 presentations | Complete, cut-centered, handle clamping | 07 §6 (amended) | **Refactor (graft)** | Round-7 spec amendment already adopted the engine's model — they now match by construction |
| Clock + 6 sync plans + constants | Near-verbatim FreeCut port | 03 §3/§6 | **Refactor (graft)** | Strongest ALIGNED pair in the repo; swap the actuator (DOM→decode) + MediaTime at boundaries |
| Audio mixer / EQ / pitch worklet | 2,426 + 239 LOC, working | 03 §9, 02 §7 | **Refactor (graft)** | Keep algorithms; fix worklet topology (0-input + port-push) for OfflineAudioContext parity |
| GPU effect shaders (43-44) | Algorithms match FreeCut; 8-bit | 08 §4/§15 | **Port the math, rebuild the pipeline** | WGSL functions survive; textures/formats/conversion wrap rebuilt per Decision 5 |
| Compositor (ping-pong, 25 blends) | 8-bit formats remain; BUT pool discipline LANDED and pixel-verified (m20.1/20.2/20.5); nested composites exercised (m19.2) | 04 §5/§7 | **Rebuild formats, keep structure + now-proven discipline** (R8 softening) | Only the 10-bit/scene-linear rebuild remains (ledger #6/#8's format half); the discipline half is landed and regression-tested |
| Headless API / command surface | 19-op JSON-RPC + `$ref` | 15 §4 (78 types) | **Rebuild (adapter bridge)** | The dispatcher is new code over the method surface; `$ref` retired |
| Undo/redo | Snapshot machinery, zero callers, keyframe-blind equality | 15 §14.1, 06 §7 | **Refactor** | Extend equality (17 fields), wire callers via commands — engine P0.6 already chartered |
| Media pipeline | Procedural only | 03 §5, 02 §8 | **Rebuild fresh** | `MediaRegistry` seam was designed for this; engine Wave 6A converges independently |
| Persistence | **Wave 4B LANDED (1,174 LOC)**: real round-trip, migrate gate, ~27-code warnings, freecut-parity normalization — but engine-native v2 shape (C8), no Zod, no storage plane (D5 open) | 09 §4-§5 | **Re-shape via adapter; keep semantics** (R8 change from "build fresh") | The migrate/normalize/warnings semantics are spec-09-§5-compatible and portable; the JSON shape is not. A spec-09-shaped serializer can be written as an adapter over `serializeTimeline`/`hydrateTimeline` rather than from scratch |
| FCPXML export | Zero surface (grep-verified) | 10 (entire) | **Build fresh** | Pure JSON→XML, no GPU/media dependency — can land ahead of engine waves |
| Timeline UI | None in engine; opencut-timeline W4 pending (M15 = test renderer) | 05 + 18 | **Build fresh** (opencut-timeline controllers + view math = the reference; W4 components when they land) | Engine contributes nothing UI-side; opencut-timeline contributes controllers/view/placement/snapping executable + W4 components later |
| UI shell | None | 18 | **Build fresh** | Mockup + OpenCut conventions only |
| Workers | Zero | 02 (10 workers) | **Build fresh** | Engine main-thread bodies become worker internals |
| Test infrastructure | Single-tier, 144 REPORTED green; pixel-truth regression milestones proven at scale | 17 three-tier | **Re-tier** (risk lowered) | Extract T1 (engine's own charter agrees), add T2/T3 per spec 17; opencut-timeline's M1-M10 are also Vitest-ready T1 content |
| Text stack | Throws (advertised op) | 10 (export) only | **Engine-led** (A2 plan) | Spec coverage gap — seal-round decision (§12) |

## 9. Reference Status & Watch List (as of 2026-09-02, post Round-8 re-baseline)

**nle-engine** completed Waves 4A/4B/4C.1-3/4D-A (@8ac91d9, 144/144 REPORTED): P0.1/P0.2/P0.6 fixed, persistence module landed (C8 divergence), all item types render, TextItem state-level CRUD banked. Remaining waves: 4D-B (text rendering), 5A/5B (audio scene, export M1), 6 (real media: mediabunny), 7 (P2 backlog). **opencut-timeline** (@d3b2163, 136/136 verified-exact) has W4 (React components) and W5/W6 (60 absent spec-15 commands) pending, plus the C7 rename pass.

Watch list (re-verify at seal):

1. ~~Wave 4A~~ **LANDED** — P0.1/P0.2/P0.6 all fixed and regression-tested (SCOUT-R8-B §5); ledger #8/#12 rows now cite fixed-and-tested references; the counter-example TEXT stays per §6's rule.
2. ~~Wave 4B~~ **LANDED with divergence** — persistence module exists but serializes engine-native v2 (C8, D1 escalated in §7); convergence = spec-09 serializer adapter over `serializeTimeline`/`hydrateTimeline`.
3. ~~Wave 4C~~ **LANDED** — per-type render branches, pixel-verified (m19.2/m21); ledger #9's counter-example retired (text preserved as historical).
4. ~~Test count drift~~ **partially resolved** — now 144 claimed; SCOUT-R8-B did not re-run the suite (REPORTED). Continue watching; spec 17's meta-suite guard stands.
5. **Effects count drift persists** — HANDOFF still says 43; registry holds 44 (`pipeline.ts:4560-4603`). Tell the engine.
6. **D2 (mediabunny)** — still unadopted (Wave 6 chartered); watch for convergence with spec 03 §5.2.
7. ~~timeline-distill repo~~ **LANDED as opencut-timeline** — §3.2 rewritten live; spec 05/16/18 code-refs upgraded; W4 components will upgrade 05 §4/18 §4.7 further.
8. **NEW — opencut-timeline C7 rename pass** — the 18-type rename + param alignment is the prerequisite for its W5/W6 command growth; watch for it landing.
9. **NEW — engine 4D-B text rendering** — when it lands, revisit D3 (text-stack spec coverage, §12 item 3).
10. **NEW — three competing project shapes in the engine** (v2 persistence, FreeCut wire schemas, headless-normalized) — the C8 adapter task collapses them to spec 09's one.

## 10. Usage Rules for Implementers

1. **Spec wins.** Any engine/distill code that contradicts a spec contract is a bug in the reference (or a CORRECTIVE delta to document), never a reason to amend the spec silently. Amendments flow through the spec's own process (like Round 7's spec 07 §6.1 amendment — evidence up, decision documented, canon updated).
2. **Cite, don't copy, the corrective list.** Anything in §6 (C1-C8) may be read as executable pseudocode but must not be pasted as architecture: the 8-bit formats, the `$ref` protocol, the class-API-as-surface, the single-tier harness, procedural media, main-thread-everything, the prefixed command names, and the engine-native persistence shape are the eight patterns to undo.
3. **Engine methods are the algorithm layer.** The command layer (spec 15 §4.2 mapping) dispatches to them; nobody calls `timeline.splitClip(...)` from UI/cloud/test code directly.
4. **Graft verdicts come with tests.** Any subsystem adopted per §8 keeps its tests only if they re-tier cleanly (spec 17); otherwise the spec's per-module Testing section governs.
5. **Every new citation must be verified.** New code-reference rows added in future rounds carry file:line + a one-line quoted snippet that was actually opened (the anti-fabrication rule that kept this round's 53/54 citation check clean; see `audits/ROUND-7-AUDITS.md`).

## 11. Relationship to Other Specs (where the reference sections live)

Round 8 adds a second column: **ot** = opencut-timeline code-references (added this round where marked; specs 05/06/16 gain them via the R8 revision pass). Engine code-refs carry Round-7 line numbers unless re-baselined — SCOUT-R8-B §6's drift table is the translator where lines moved.

| Spec | nle-engine code-refs | opencut-timeline code-refs (R8) | Highlights |
|---|---|---|---|
| 01 core engine | §13A | — | Singleton/dispatcher deltas, EventEmitter + id (ALIGNED), undo zero-callers |
| 02 workers | §13B | — | Zero-worker counter-example, worklet topology correction |
| 03 playback | §13E | — | clock.ts + video-sync.ts — the strongest ALIGNED pair |
| 04 renderer/color | §13D | render seam (§2.4.4 of this spec) | 8-bit totality; pool discipline now landed (R8) |
| 05 timeline | §16.4 | §16.5 (new R8) | Controllers/view/placement/snapping executable reference + zero-anchor semantics |
| 06 NLE ops | §10.4 | §10.5 (new R8) | Division of labor: opencut = placement/ripple/split/group-move; engine = roll/slip/slide/rateStretch/sync-lock |
| 07 composition | §12A | — | Planner/handles/occlusion (adopted); render-loop fix landed (R8) |
| 08 color grading | §15A | — | Registry pattern (ALIGNED), 8-bit/LUT conversion (corrective), scopes absent |
| 09 project model | §10.3 | — | Persistence LANDED but shape-divergent (C8/D1); D5 open |
| 10 FCPXML | §12.8 | — | Zero-surface verification + field-presence map |
| 11 cloud render | §14R | — | Xvfb infra (ALIGNED), cloud pipeline SPEC-ONLY |
| 12 testing strategy | §13.7 | M1-M16 mapping (R8) | Single-tier reality + G-charter convergence; ot's M1-M10 = Vitest-ready T1 |
| 15 wire protocol | §13.14 | §13.15 (new R8) | C2 (engine JSON-RPC) + C7 (ot prefixed names) — the two protocol corrections |
| 16 keyboard | appendix | — | No keyboard layer in either repo — SPEC-ONLY |
| 17 test plan | §18.5 | §18.6 (new R8) | Re-tier evidence both repos; M11/M12/M13/M14 patterns |
| 18 UI shell | §13 | — (W4 pending) | No shell code; mockup + ux-spec adoptions (v1.1) |
| 00 / 13 / 14 | Decision 10 + 11 + phases + process | — | This spec's hierarchy + seam feed the master's Decisions 10/11 and spec 14's two-repo phases |

## 12. Seal-Round Checklist (open items this round deliberately left)

1. ~~Re-baseline §9's watch list after the engine's waves land~~ — **DONE in Round 8** (§9 re-baselined post 4A/4B/4C/4D-A; §6/§8 verdicts updated).
2. ~~timeline-distill exists? → wire §3.2~~ — **DONE in Round 8** (opencut-timeline wired live; §3.2 rewritten; spec 05/06/15/16/17 code-refs added). Remaining: upgrade spec 05 §4 / 18 §4.7 when its W4 components land.
3. Text-stack spec coverage decision (D3): Phase A landed state-side (4D-A); rendering deferred to 4D-B — the absorb-vs-engine-led decision should land before 4D-B starts so glyph-atlas layouts are spec-aligned (SCOUT-R8-B §8.5).
4. Source-preview question (spec 18 §15.1) — affects the wire protocol if a source-playback surface is added. The ux-spec's fallback `<video>` source-preview mode (ux-spec 05 §4.2) is the cheap interim if we ever ship one (SCOUT-R8-C §3 C21).
5. Full decision reconciliation (13 engine + 10 opencut-timeline + 11 spec): §7 answered engine D1-D5 (D1 escalated in R8); the remaining engine decisions + all 10 opencut-timeline decisions need "no spec conflict" sign-off lines — C7 (its D9) and its D1/D2 (our Decisions 3/2 — aligned by construction) already covered.
6. Final citation sweep of all per-spec code-ref tables (rule §10.5) + regenerate audit totals — engine line-numbers moved this round (SCOUT-R8-B §6 is the translator); re-verify at seal.
7. **NEW (R8)** — opencut-timeline C7 rename pass + its W5/W6 command growth: when landed, update §3.2's headless row and spec 15 §13.15.
8. **NEW (R8)** — cloudcut UX-spec maintenance: the ux-spec branch is now an input-of-record; if it keeps evolving, re-run the applicability matrix deltas (SCOUT-R8-C is the baseline).

---

**End of `19-code-references.md`.** Round 7 established the canon hierarchy; Round 8 made it three-repo: the seam resolution (§2.4) is the binding architecture. Specs 00/13/14 and the README carry the pointers.
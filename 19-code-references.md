# 19 — Code References & Engine Reconciliation: Canon Hierarchy, Reference Map, Insight Ledger

**Stream:** Cross-cutting (reference architecture)
**Status:** v1.0 (Round 7 — new stream)
**Date:** 2026-09-02
**Spec file:** `19-code-references.md`
**Consumers:** Implementation team, nle-engine workstream, timeline-distill workstream (forthcoming), all stream specs (they carry per-spec code-reference sections that this doc governs)

---

## 0. TL;DR

This spec answers one question for everyone who touches the project after Round 7: **which code is authoritative, which code is a reference, and what must never be lost when we link to reference code instead of inlining it.** The spec set (00-18) is canon. The private `nle-engine` repo is an in-between reference — a clean-room FreeCut port that de-risks the engine side and operationalizes these specs with concrete code, but which inherits FreeCut patterns the spec set explicitly corrects (8-bit sRGB, JSON-RPC+$ref, class-API mutation surface, single-tier tests, procedural media, zero workers). A forthcoming timeline-distill repo will do the same for the timeline UI (OpenCut-classic minus NLE core). The rule throughout: **where reference code and the spec conflict, the spec wins; the delta is the documentation.** §5's insight-preservation ledger is the enforcement mechanism for the "never drop a hard-won insight" requirement.

---

## 1. Purpose

Six refinement rounds produced a spec set grounded in two public teacher repos. Since then, two private workstreams began producing *executable* code from the same lineage: nle-engine (2026-08-22 → active) and timeline-distill (starting). Code moves faster than prose and carries more detail than any spec can hold — but it also silently encodes the exact legacy patterns the spec set was designed to correct. Without an explicit hierarchy, every future contributor faces the same ambiguity that this round inherited: "the engine does X, the spec says Y — which wins?" This document makes that decision once, records the history that produced the ambiguity, maps every spec to its reference code with status tags, and maintains the ledger of implementation insights that must survive any future re-linking, re-forking, or re-distilling of the reference repos.

## 2. Canon Hierarchy & Workstream History

### 2.1 The hierarchy

| Tier | Artifact | Role | Authority |
|---|---|---|---|
| 1 — **Canon** | This spec set (`00`-`18`) | The design of record: 9+1 architectural decisions, contracts, test methodology | **Wins every conflict** |
| 2 — **In-between reference** | `bearachprema/nle-engine` (private) | Clean-room FreeCut-port engine; proves feasibility, de-risks implementation, operationalizes specs with concrete code | Reference only; corrective deltas in §6 |
| 3 — **Forthcoming reference** | timeline-distill repo (TBA) | OpenCut-classic timeline (components/controllers/placement/snapping) distilled minus the NLE core; the UI-region counterpart to nle-engine | Reference only |
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

## 3. Reference Repo Map

### 3.1 nle-engine — `github.com/bearachprema/nle-engine` (private)

**What it is:** a minimal NLE engine built from scratch with FreeCut as architectural reference (its Decision 1), ~38k LOC of pure TypeScript engine under `src/lib/nle/` (no React in the core — its Decision 9; the surrounding Next.js app is a test harness), plus the deepest FreeCut delta-analysis in existence (its `gaps/` directory: 30 wave-gap files + a 12-file audit of its own).

**Verified state (2026-09-02):** (line numbers verified against the Round-7 clone; `planner.ts:21` is the cut-centered math quote, `:27` the alignment-semantics heading)

| Surface | State | Evidence (file:line) |
|---|---|---|
| LOC / files | 37,958 / 30 under `src/lib/nle/` | module census (HANDOFF) |
| Tests | 124/124 pass, 19/19 milestones, single-tier Playwright + Xvfb + SwiftShader | `scripts/run-nle-tests.mjs`; `.agents/DECISIONS.md` #12 |
| NLE ops | 102 public `Timeline` methods; ~20 op families matching spec 06 §5 | `timeline/timeline.ts` (6,436 LOC; split :2275, rippleDelete :3359, removeItems :3527, slip :3858, slideItem :3944, performInsertEdit :4379, freezeFrameAtPosition :6185, joinItems :6329) |
| GPU effects | 43-44 registry entries (43 per HANDOFF; pipeline.ts:4558 says Wave 3E brought 43→44) | `effects/pipeline.ts` (`GPU_EFFECT_REGISTRY` :3003, `registerEffects` :4559) |
| Transitions | 27 presentations, cut-centered planner, handle clamping | `transitions/registry.ts:2249`, `planner.ts:27`, `handle-utils.ts:302` |
| Clock | Faithful FreeCut port (AudioContext ground truth, monotonic guard, throttled timeupdate) | `core/clock.ts` (:550, :612, :661) |
| Video sync | All 6 FreeCut sync plans + constants, ported as pure functions | `playback/video-sync.ts` (:180, :224, :925) |
| Compositor | Ping-pong pipeline, 25 blend modes — **8-bit `rgba8unorm` throughout (29 sites/7 files)** | `gpu/compositor.ts` (:32, :981) |
| Audio | 6-band EQ + RBJ biquads + granular pitch-shift AudioWorklet | `audio/mixer.ts` (2,426), `soundtouch-processor.worklet.ts:47` |
| LUT | 3D `.cube` parser — 8-bit quantized, no linear↔sRGB conversion (inherited FreeCut bug) | `effects/lut.ts` (:314, :337) |
| Headless API | 19-op JSON-RPC + `$ref` (FreeCut's `edit.ts` pattern) | `headless/api.ts` (:747, :542, :474) |
| Persistence | **None** — no serialize/hydrate; `editProject` returns input unchanged; `schemaVersion` written, never read | `api.ts:1069` ("Wave 2 will replace with the rebuilt project"), gaps/audit/E2 |
| Render loop | **Drops every non-video clip** — CompositionItem/AdjustmentItem/ImageItem render zero pixels | `playback/player.ts:1038` (`if (clip.type !== 'video') continue;`) |
| Known bugs (its own register) | Effect texture singleton reuse (P0.1, `pipeline.ts:5107` returns `_pongTexture`); mask invert double-apply (P0.2, `mask-manager.ts:478` + :640); keyframe-blind undo equality (P0.6, `timeline.ts:1746`) | `gaps/audit/MASTER.md` |
| UI | **No React timeline, no shell** — `src/app/page.tsx` is a 5,417-LOC test runner only | repo census |
| Workers | **Zero** Web Workers | grep-verified (no `new Worker(` in src) |
| Media | Procedural `VirtualVideo`/`VirtualAudio` only; zero mediabunny imports (all 5 mentions are comments) | `media/virtual-video.ts:5`, `media/metadata.ts:81` |

**Its roadmap of record:** `gaps/audit/MASTER.md` — consolidated P0 (8) / P1 (14) / P2 / P3 registers, dependency graph, wave plan 4A (correctness: texture pool, undo equality, player events, 26 P0 tests) → 4B (persistence module) → 4C (render the unrendered item types) → 4D (text stack, ~3,900 LOC phased port) → 5A/5B (audio scene, export M1) → 6 (real media: mediabunny M1 → decode layer → reverse-conform) → 7 (P2 backlog).

### 3.2 timeline-distill — forthcoming

**What it will be:** the UI-region counterpart to nle-engine — OpenCut-classic's timeline (7 controllers ~2,863 LOC, `TiledMediaContent` CSS filmstrip tiling, 5-strategy `PlacementStrategy`, DOM component tree, snap/razor utilities, keyboard registry) distilled into a standalone repo **minus the NLE core**, so that spec 05 + spec 18 gain the same kind of concrete code reference the engine gives specs 01-12. Status at Round 7: effort starting; no repo URL yet. Until it exists, spec 05's existing OpenCut-classic file:line citations (§16) remain the reference; when it lands, §11's mapping table gains its column.

**Recommended shape (for that workstream):** mirror the engine repo's conventions — `.agents/DECISIONS.md` + `gaps/` audit trail + append-only worklog + sub-agent distillation waves; keep the DOM timeline **exactly** as OpenCut-classic built it (it is the teacher, not FreeCut — do not "clean up" interaction logic the way nle-engine cleaned FreeCut's engine); scope strictly to what spec 05 §16 + spec 18 §4.7 consume (components, controllers, placement, snapping, virtualization, filmstrip/waveform tiles); leave `MediaTime`/`FrameRate`/`SceneTracks` types out (they live in the engine layer per spec 09/01) — the distill is UI-only.

### 3.3 Teachers (public)

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

## 6. Corrective Mapping — FreeCut patterns the engine inherited and the spec corrects

These are the six systemic deltas (verified in engine source this round). Each row: what the engine does (with citation) → what the spec mandates → the convergence work.

| # | Engine (inherited FreeCut pattern) | Spec mandate | Convergence |
|---|---|---|---|
| C1 | 8-bit sRGB `rgba8unorm` end-to-end (29 sites across compositor/effects/masks/transitions/player/lut) | Decision 5: 10-bit pipeline, scene-linear working space, `r16uint` plane uploads, `rgba16float` compositing, `rgba10a2unorm`+display-p3 canvas | Re-texture every pass (formats + shader math); the effect *algorithms* port, the color space is rebuilt |
| C2 | Headless protocol = 19-op JSON-RPC + `$ref` field pointers (`api.ts:747/:542`) | Spec 15: 78-type `EngineCommand` discriminated union, Zod-canonical, single `engine.command.apply()` dispatcher, replayable by value | Build the command layer as a **dispatcher adapter over the existing 102-method class surface** (the methods are the algorithm layer); retire `$ref` (pass IDs by value) |
| C3 | Class-based `Timeline` manager API is the primary mutation surface | Decision 9: every mutation flows through `apply()`; managers become the implementation layer commands dispatch to | Same adapter as C2 — spec 15 §4.2's mapping table is the contract |
| C4 | Single-tier Playwright suite (124 tests in-app, DOM-scraped results, ~9% error-path) | Spec 17 three-tier (Vitest T1 / render T2 / UI T3) + property-based + WYSIWYG invariants | Re-tier per the engine's own G-charter (it independently recommends extracting ~60 CPU tests to Vitest — converging) |
| C5 | Procedural `VirtualVideo`/`VirtualAudio` media; zero mediabunny imports | Spec 03: mediabunny + WebCodecs decode path, 10-bit, in decode worker | Build spec 03's path fresh (engine's own Wave 6A converges; `MediaRegistry` is the seam it was designed for) |
| C6 | Zero Web Workers (all decode/audio/waveform on main thread) | Spec 02: 10-worker pool + `ManagedWorker` (lazy create, idle reuse, export fallback) | Build spec 02 fresh; engine main-thread code becomes the worker *bodies* |

Plus two engine-local patterns worth naming because they are the spec's strongest validation: the render-loop item-type skip (P0.3-class, ledger #9) and the singleton-texture returns (ledger #8) are precisely the failure modes the spec's discipline rules exist to prevent — keep them as documented counter-examples even after the engine fixes them.

## 7. Answers to the Engine's Open Decisions (D1-D5)

The engine's master gap charter (§8) lists 5 blocking decisions. The spec set already answers four of them; this section is the Round-7 cross-pollination the workstreams never had.

| ID | Engine's question (MASTER §8) | Spec answer | Notes |
|---|---|---|---|
| D1 | Canonical project wire shape: engine-native (inline fps, `clips`) vs FreeCut's (metadata, `timeline.items`) | **Neither — spec 15's `ProjectJSON`** (spec 09 §3: `metadata`/`settings`/`scenes`/`schemaVersion`, Zod-validated). The engine's recommended "native v2 + ~200-LOC FreeCut interop mapper" becomes "spec-09 shape + interop mapper for FreeCut wire I/O only." Two competing shapes inside one engine module (E2 finding) must collapse to one. | Also resolved by spec 09 C1-C3 fixes (schemaVersion literal, migrate-then-parse) |
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
| Compositor (ping-pong, 25 blends) | 8-bit, singleton-texture bugs | 04 §5/§7 | **Rebuild discipline, keep structure** | Structure is sound; ownership rules + 10-bit formats are the corrective core (ledger #6/#8) |
| Headless API / command surface | 19-op JSON-RPC + `$ref` | 15 §4 (78 types) | **Rebuild (adapter bridge)** | The dispatcher is new code over the method surface; `$ref` retired |
| Undo/redo | Snapshot machinery, zero callers, keyframe-blind equality | 15 §14.1, 06 §7 | **Refactor** | Extend equality (17 fields), wire callers via commands — engine P0.6 already chartered |
| Media pipeline | Procedural only | 03 §5, 02 §8 | **Rebuild fresh** | `MediaRegistry` seam was designed for this; engine Wave 6A converges independently |
| Persistence | None (fake round-trip) | 09 §4-§5 | **Build fresh** | Engine Wave 4B (~350 LOC) should target spec 09 contracts directly |
| FCPXML export | Zero surface (grep-verified) | 10 (entire) | **Build fresh** | Pure JSON→XML, no GPU/media dependency — can land ahead of engine waves |
| Timeline UI | None | 05 + 18 | **Build fresh** (timeline-distill = the reference) | Engine contributes the data model (timeline.ts), zero UI code |
| UI shell | None | 18 | **Build fresh** | Mockup + OpenCut conventions only |
| Workers | Zero | 02 (10 workers) | **Build fresh** | Engine main-thread bodies become worker internals |
| Test infrastructure | Single-tier, 124 green | 17 three-tier | **Re-tier** | Extract T1 (engine's own charter agrees), add T2/T3 suites per spec 17 |
| Text stack | Throws (advertised op) | 10 (export) only | **Engine-led** (A2 plan) | Spec coverage gap — seal-round decision (§12) |

## 9. Engine Status & Watch List (as of 2026-09-02)

The engine is **actively closing gaps** — its last three commits (2026-09-01) added the 7-track deep audit, the master gap charter, and the updated handoff. Round 7 deliberately defers final judgment: this section records what the seal round must re-baseline.

Watch list (re-verify at seal):

1. **Wave 4A** lands (texture-pool discipline fixes P0.1/P0.2; `snapshotsEqual` 17-field; player events; 26 P0 tests) → updates ledger rows #8/#12 and §6 C-table notes.
2. **Wave 4B** persistence module → check convergence with spec 09 §5 (migrations, normalize+warnings) and D1 resolution direction.
3. **Wave 4C** per-type render branches → ledger #9's counter-example retires; spec 07 §12.2's all-types contract gains a green reference.
4. **Test count drift**: runner says 124; G's census says 121 `addResult` sites / 128 runtime results — watch which number the next handoff claims (spec 17's meta-suite guard exists for exactly this).
5. **Effects count drift**: HANDOFF 43 vs pipeline.ts:4558's "44 after Wave 3E" — same watch.
6. **D2 (mediabunny) resolution** — if adopted, the engine begins converging with spec 03 §5.2's verified API surface.
7. **timeline-distill repo** appears → add §3.2's mapping column; spec 05/18 code-ref sections upgrade from "forthcoming" to live links.

## 10. Usage Rules for Implementers

1. **Spec wins.** Any engine/distill code that contradicts a spec contract is a bug in the reference (or a CORRECTIVE delta to document), never a reason to amend the spec silently. Amendments flow through the spec's own process (like Round 7's spec 07 §6.1 amendment — evidence up, decision documented, canon updated).
2. **Cite, don't copy, the corrective list.** Anything in §6 (C1-C6) may be read as executable pseudocode but must not be pasted as architecture: the 8-bit formats, the `$ref` protocol, the class-API-as-surface, the single-tier harness, procedural media, and main-thread-everything are the six patterns to undo.
3. **Engine methods are the algorithm layer.** The command layer (spec 15 §4.2 mapping) dispatches to them; nobody calls `timeline.splitClip(...)` from UI/cloud/test code directly.
4. **Graft verdicts come with tests.** Any subsystem adopted per §8 keeps its tests only if they re-tier cleanly (spec 17); otherwise the spec's per-module Testing section governs.
5. **Every new citation must be verified.** New code-reference rows added in future rounds carry file:line + a one-line quoted snippet that was actually opened (the anti-fabrication rule that kept this round's 53/54 citation check clean; see `audits/ROUND-7-AUDITS.md`).

## 11. Relationship to Other Specs (where the reference sections live)

| Spec | Carries nle-engine code-refs at | Highlights |
|---|---|---|
| 01 core engine | §13A (new) | Singleton/dispatcher deltas, EventEmitter + id (ALIGNED), undo zero-callers |
| 02 workers | §13B (new) | Zero-worker counter-example, worklet topology correction |
| 03 playback | §13E (new) | clock.ts + video-sync.ts — the strongest ALIGNED pair |
| 04 renderer/color | §13D (new) | 8-bit totality, texture-pool dead code, device limits (4096 cap vs 8K) |
| 05 timeline | §16.4 (new) | No-React-timeline absence map + timeline-distill forthcoming |
| 06 NLE ops | §10.4 (new) | The 102-method op-coverage table (~20 families ALIGNED) |
| 07 composition | §12A table (new) | Planner/handles/occlusion (adopted), render-loop + texture bugs (corrective) |
| 08 color grading | §15A table (new) | Registry pattern (ALIGNED), 8-bit/LUT conversion (corrective), scopes absent |
| 09 project model | §10.3 (new) | Persistence absence register, D1/D5 answers |
| 10 FCPXML | §12.8 (new) | Zero-surface verification + field-presence map |
| 11 cloud render | §14R (new) | Xvfb infra (ALIGNED), cloud pipeline SPEC-ONLY |
| 12 testing strategy | §13.7 (new) | Single-tier reality + G-charter convergence |
| 15 wire protocol | §13.14 (new) | JSON-RPC vs EngineCommand — the C2 centerpiece |
| 16 keyboard | appendix (new) | No keyboard layer — SPEC-ONLY |
| 17 test plan | §18.5 (new) | Re-tier evidence |
| 18 UI shell | §13 | No shell code; mockup + timeline-distill |
| 00 / 13 / 14 | Decision 10 + phases + process | This spec's hierarchy feeds the master's Decision 10 and spec 14's engine-aware phases |

## 12. Seal-Round Checklist (open items this round deliberately left)

1. Re-baseline §9's watch list after the engine's waves land; update §6/§8 verdicts.
2. timeline-distill exists? → wire §3.2, upgrade spec 05/18 references, decide whether its controllers need a spec 05 amendment pass.
3. Text-stack spec coverage decision (D3): absorb the engine's A2 plan as a new spec section, or keep engine-led with spec 10 export-side only.
4. Source-preview question (spec 18 §15.1) — affects the wire protocol if a source-playback surface is added.
5. Full 22-decision reconciliation table (13 engine + 9+1 spec) — §7 answered D1-D5; the remaining 8 engine decisions are engine-local and need only a "no spec conflict" sign-off line each.
6. Final citation sweep of all per-spec code-ref tables (rule §10.5) + regenerate the ROUND-7 audit totals.

---

**End of `19-code-references.md`.** This closes the Round-7 additions; specs 00/13/14 and the README carry the pointers.
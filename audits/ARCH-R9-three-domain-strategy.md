# ARCH-R9 — The Three-Domain Strategy: timeline de-duplication, audio-core adoption, and the code-first spec reset

**Round:** 9 (pre-seal architectural re-examination, user-mandated)
**Inputs re-baselined this round:** nle-engine `8ac91d9 → 624a76b` (Waves 4D-B→5C, 202/202, 25/25 milestones, ~47k LOC); opencut-timeline `d3b2163 → 4e39b67` (W5 + review rounds 5-6 + M29-M31, **297/297, "FINAL as a distilled opencut timeline"**, own SEAMS.md); **web-daw-core `bc68ee0` (NEW INPUT: 737/737, M1.5 nle-bridge landed, three-layer track model, full-triangle de-risk)**.
**User questions answered:** (1) is opencut-timeline worth its overlap cost given nle-engine ships a tested timeline; (2) is web-daw-core adoption worth the two-core risk; (3) what is the practical implementation path — and what should the spec set therefore BE.
**Status:** Directional decision record. The three repos are still finalizing; the seal round re-verifies each watch item (§7) before locking.

---

## 1. The evidence base (measured this round)

### 1.1 What each repo actually is (LOC, fresh `wc -l`)

| Domain | nle-engine (`src/lib/nle`, 46.9k total) | opencut-timeline (24.5k total) | web-daw-core (76 verbatim + bridge) |
|---|---|---|---|
| Edit state + ops | timeline/ **8,425** (flat `TimelineData`, freecut port) + core/ 3,388 | engine core **~8,700** (SceneTracks, opencut distill: ops 3,236 + placement 810 + ripple 395 + view 508 + animations 890 + snapping 165 + bookmarks 174 + selection 204 + core 423 + types 302 + headless 705 + render 328 + media 160) | — (S-layer only: `StructuralAudioSource` 11-field interface) |
| Interaction + UI | **none** (48 shadcn components, zero timeline UI; `page.tsx` is a test harness) | controllers **2,996** (framework-free state machines) + React **3,773** | — (app-side in web-daw) |
| Render / playback / export | playback/ 8,223 + gpu/ 4,067 + transitions/ 4,970 + effects/ 5,668 + text/ 2,129 + media/ 1,096 + export/ 1,336 | placeholder compositor 328 (verification seam BY DESIGN — SEAMS.md §3) | offline render + bounce parity (verbatim upstream) |
| Audio | audio/ 3,433 (AudioMixer 2,426 scalar mix + SoundTouch worklet) + export/audio-mix.ts 275 (Wave-5B offline mix) | virtual-audio 160 (test fixture) | **channel strips + 20+ DSP + PDC + WAM + aux/sidechain + null-test harness (737/737)** |
| Persistence | persistence/ 1,225 (freecut shape) | toJSON/fromJSON on SceneTracks | UPSTREAM.lock.json provenance + sync tool |
| Headless / wire | headless/ 2,912 (**JSON-RPC + $ref** — spec-15 C2 target) | headless/ 705 (18 prefixed commands, spec-15 C7 rename target) | — |
| Test asset | **202 tests + 25 milestones** (browser, pixel parity, real A/V decode-verified export) | **297 tests + 30 milestones** (unit→WYSIWYG→real-mouse→fuzz→review-regression; + wave-C coverage suites) | **737 tests** (real-DSP null-test gates ≥60 dB, analytic oracles, triangle C1/H8-H12) |

### 1.2 The overlap the user flagged — precisely located

opencut-timeline does not "contain nle-engine equivalents" arbitrarily; it contains, by SEAMS.md's own classification:

- **Verification scaffolding** (virtual-media, placeholder-compositor, waveform): designed-for-replacement seams. NOT overlap — they are the contract the real engine plugs into. Zero retirement cost; that was the design.
- **Editing-domain proper** (ops, undo, persistence `toJSON/fromJSON`, headless command layer): this IS the real overlap with nle-engine's timeline/ + persistence/ + headless/. Round 8's Decision 11 resolved it with **two algorithm homes + a bidirectional `SceneTracks ↔ flat` adapter** — which is exactly the "unnecessary risk and complication and dev cost" the user is now challenging: the adapter, the C2 JSON-RPC retirement, the C8 persistence re-shaping, the dual undo families, and the dual headless surfaces are all **bridge code, not product code**.

### 1.3 The decisive facts for the timeline question

1. **nle-engine has no editing UI and no interaction layer.** Its `src/components` is the shadcn library; its page is a test harness. Every user-facing editing gesture (drag/trim/scrub/marquee/DnD/box-select) exists only in opencut-timeline (controllers + React, real-mouse-verified). Retiring opencut-timeline means writing ~6.8k LOC of new interaction code with no test bed — the **maximum new-code-risk path**, directly contradicting the round's own principle.
2. **spec 05's normative state model is already SceneTracks** (Decision 2, executable by opencut-timeline `types/index.ts`). Retiring opencut-timeline rewrites spec 05/06/15's editing half back to the freecut flat shape — a spec reset of the two largest streams.
3. **The audio triangle does not depend on opencut-timeline's survival.** `web-daw-core`'s opencut flattener is type-only (zero runtime dep); `scene-to-segments.ts` accepts "opencut-timeline SceneTracks, nle-engine's own model, **or any structural superset**" via `StructuralAudioSource`. The merge laws (split-merge, transition windows, varispeed) are nle-engine's Wave-5A semantics, already distilled into the bridge.
4. **What nle-engine's timeline is FOR** is render scheduling: its 7 derived indexes (clipsByTrackId, linked-groups, transition overlap, maxClipEnd, media deps) feed player/GPU/export, which are 202/202-tested and production-shaped. As a SECOND editing-semantics home it is the expensive duplicate; as the render-scheduling projection of ONE editing truth it is exactly right.

### 1.4 The decisive facts for the audio question

1. **Capability, not quality**: freecut's `AudioMixer` is a scalar mix — no reverb, no sends, no sidechain, no live EQ, no PDC, no mixdown export. web-daw-core has all of them, null-test-hardened (≥60 dB offline/realtime parity). This is a has-vs-has-not gap, which is the bar "significantly better" was asking for.
2. **Separateness is structural, not conceptual**: the three-layer model (S structure / G signal / E engine) shares ONLY `trackId` between layers. Timeline↔audio is a single 11-field flat interface (`StructuralAudioSource`). The user's intuition ("audio is easier to separate than timeline, which is very integral") is now an enforced, test-pinned architecture fact (H8-H12).
3. **The two-core risk is already de-risked**: the triangle test feeds opencut's REAL types and its own `splitElementsOnTracks` op through the bridge into a real offline render. The bridge implements nle-engine's Wave-5A laws, so no semantics are invented — they are ported from the engine side, which keeps them.
4. **The duplicate here is on the ENGINE side, and it is scheduled to die**: `AudioMixer` (2,426 LOC) + pre-baked EQ + 22,050 Hz preview bins retire at the M1.5 parity gate (web-daw-core PLAN standing rule 3: "never merge a change that weakens the de-risk gates; freecut behavior remains the fallback until then"). Wave-5B's `export/audio-mix.ts` (275 LOC) is transitional: A/V mux needed an audio path before M1.5; at M1.5 the offline mixdown routes through the bridge (`SceneMixer`) and audio-mix.ts is deleted or reduced to a thin mux adapter. **Spec must say this explicitly** so the transitional file does not calcify into a third mixer.

---

## 2. RULING 1 — Timeline: from "two algorithm homes" to ONE editing core + a render projection (Decision 12)

**Decision 11 (Round 8) is superseded in part.** The replacement is a domain decomposition, not a core duplication:

```
EDITING DOMAIN (one core)            RUNTIME DOMAIN (one core)         AUDIO DOMAIN (one core)
opencut-timeline                     nle-engine                        web-daw-core
  SceneTracks state of record    →     flat TimelineData = derived      StructuralAudioSource (S)
  ops + undo + persistence             render-scheduling projection     MixerTrackSettings (G)
  controllers + React UI               player / GPU / transitions       ChannelStrip graph (E)
  headless editing command family  ←   export / media / fonts           offline render + null gates
  (spec-15 editing subset, C7)         (spec-15 runtime subset, C2)
```

**The five seam clauses, amended:**

1. **One state model — now single-truth.** SceneTracks is the editing state of record **including persistence** (its `toJSON/fromJSON`; the app shell owns when/where it is stored, per OT SEAMS.md §6). nle-engine's flat `TimelineData` is re-specified as a **one-way derived projection** (render scheduling). R8's bidirectional `SceneTracks ↔ flat` adapter and its round-trip property tests are REPLACED by a one-way projector with an idempotence property: `project(scene)` is deterministic and `project(scene)` after any editing op depends only on the resulting scene — the engine state is a cache, never an editing input. **Editing never reads back from engine state.** This cuts the adapter's hardest test surface (round-trip fidelity in the presence of engine-only constructs: transitions, linked groups, sync-lock) in half.
2. **One wire protocol — unchanged in goal, narrowed in per-repo scope.** spec 15's bare 78-type union remains the only protocol. **C7** (opencut rename + param alignment) unchanged. **C2 is SCOPED DOWN**: nle-engine's convergence duty is now only the **runtime command subset** (render/export/media/scenes), NOT the editing subset — editing commands are OT's to implement (renamed) and the engine-side op families' port plan (clause 3) carries the rest. The JSON-RPC+$ref retirement stays.
3. **One algorithm home — was "two".** opencut-timeline's ops layer is the normative editing-algorithm home. nle-engine's op families (roll/slip/slide/rateStretch/retime/freezeFrame/insert-edit-3-point/rangeRemoval/sync-lock) are **port-scheduled into OT's ops layer** per spec 06 §5.5-5.14's existing method-by-method map — the same port discipline used throughout (freecut→engine, opencut→OT, web-daw→core): the port's acceptance gate is OT's 297-test suite plus the ported engine tests. Until the port lands, those ops remain available through the engine's internal surface for its own testing, but the EDITING wire never routes through them. Transitions/linked-groups/sync-lock data live in the projection layer and in spec 06/07's shapes — the port defines their SceneTracks representation (this is spec work, not improvisation).
4. **One render seam — unchanged, strengthened.** `setTracks()/renderFrame(t)` (OT placeholder-compositor contract) is the compositor seam; the engine's WebGPU compositor implements it. The projector feeds `setTracks`.
5. **One undo family — OT's.** Snapshot undo with OT's transaction discipline (spec 15 §7.1A). nle-engine's `UndoStack` retires with the op port (it serves the engine's internal state until then).

**What this costs (honest ledger):**

- The op-family port is real work (weeks, not days) — but it is **porting tested code into a tested harness**, the exact activity this workstream has done successfully three times, with a defined acceptance gate. It is NOT new-code risk in the user's sense; nothing is invented.
- The engine loses its "second editing home" status — a repo-position change, not a code deletion. Its editing methods remain until the port (fallback, same pattern as AudioMixer).
- Transitions/linked-groups/sync-lock need SceneTracks shapes (spec 06/07). The engine has working semantics; the spec's job is to write the shapes down.

**What this buys:**

- The user's cost objection is answered structurally: no bidirectional adapter, no C8 persistence re-shaping of the engine's store (persistence follows SceneTracks), no dual undo, no dual editing-wire. Every bridge artifact R8 chartered shrinks or disappears.
- The 297-test editing asset and the 202-test runtime asset both survive intact; the UI/controllers ship as-is.
- spec 05/06/15 keep their normative shapes (no rewrite-back).

**Why not retire OT entirely (the user's frame, answered head-on):** because the thing that would remain — nle-engine — has no editing surface at all, and the interaction layer is the one place where "write it fresh" cannot inherit tests or semantics from anywhere. Retiring OT maximizes new-code risk at exactly the point the round is trying to minimize it. And OT is not merely "a cleaner codebase": it is the executable form of spec 05/15's editing half plus the only interaction+UI asset in the workstream. The justification is functional (placement/zero-anchor/snapping-sources/controllers/marquee/bookmarks) AND architectural (SceneTracks = spec 05; headless = spec 15 editing subset) — which meets the user's "significantly better to justify" bar for the editing domain specifically, while conceding it does NOT meet that bar as a second op-semantics home (hence clause 3).

---

## 3. RULING 2 — Audio: adopt web-daw-core as the audio-domain core (Decision 13)

**Adopted.** The user's "might be worth the risk" is upgraded to "worth it, with the risk already fenced" on the evidence of §1.4:

- **Normative audio core:** web-daw-core (its `src/lib/daw` verbatim closure + `src/lib/nle` bridge). The engine's audio path converges onto it per its own M1.5 plan (submodule `vendor/web-daw-core`, player routing, export Stage-2 offline render).
- **The three-layer contract is spec-level law** (new **spec 20-audio-core.md**): S = `StructuralAudioSource` (any timeline host), G = `MixerTrackSettings`/`MixerSceneSettings`, E = ChannelStrip graph. Timeline TrackType must NOT grow signal fields (track-model.md §2's options A/B/C verdict is adopted: sidecar keyed by trackId; `midi` track section deferred to opencut W7 WHEN MIDI *editing* lands).
- **Convergence with teeth:** M1.5's parity gates (offline-vs-realtime ≥60 dB null; m23 ported expectations) are the acceptance; **AudioMixer (2,426 LOC), pre-baked EQ, 22,050 Hz preview bins, and export/audio-mix.ts's own mixdown retire at the gate** — audio-mix.ts survives only as the mux-side adapter if anything. Fallback discipline mirrors Ruling 1: freecut audio stays until the gate passes.
- **Spec 03/01 boundary:** playback-clock, streaming, varispeed-behavior stay in 03 (the clock law is engine-side and untouched); mixing graph, DSP surface, signal model, offline render, WAM hosting move to spec 20 with cross-references. 03 §9's "audio pipeline" sections re-point.
- **Why this two-core risk differs from the timeline one the user rejected:** the timeline duplicate was two SAME-LEVEL editing semantics needing a bidirectional bridge; the audio split is a layered contract (S/G/E share one key) with the NLE semantics already living on the core side (Wave-5A laws distilled into the bridge) and the legacy mixer scheduled for deletion at a measured gate. Nothing bidirectional exists to maintain.

**M2/M3 outlook (recorded, not committed):** live EQ/reverb UI (mixer surface), sidechain ducking presets, PDC scene helpers, tempo-map bridge, stem re-entry. Spec 20 carries these as the M2/M3 roadmap rows with their test implications, so the seal round sees the full audio surface, not just M1.5.

---

## 4. RULING 3 — Implementation strategy: the spec set re-typed as CONTRACT + GAP + ACCEPTANCE over a three-repo code baseline

**The user's dichotomy ("no new code → gap docs only" vs "spec drives full implementation") is resolved by observing what the workstream actually became:** three production-grade codebases, each distilled from a proven OSS ancestor under test gates. The spec set's job is no longer to describe how to build an engine from nothing — that would discard ~55k LOC of tested code and invite maximum trial-and-error, the exact thing the OSS-derivation strategy exists to avoid. But the workstream is not "no new code" either: the UI shell, the op-family port, the M1.5 wiring, and the command-family completion are real implementation work that needs normative shape.

**So the spec set is re-typed (Decision 14):**

1. **CONTRACT layer (normative, code converges to it):** type shapes (`SceneTracks`, `EngineCommand` 78-type union, `StructuralAudioSource`/`MixerTrackSettings`), wire protocol semantics, domain boundaries and seam laws (projector, render seam, S/G/E), invariants, error/undo/batch semantics, NFR floors. Where code and contract conflict: contract wins, delta documented (unchanged rule).
2. **GAP layer (worklist):** the corrective register (C1-C8, now re-scoped: C2 narrowed, C8 re-typed as projection-not-persistence, new C9 audio-mix transitionality), the missing-command table (60 of 78, with the port plan for the engine-op families), the per-repo P1/P2 backlogs, and the UI-shell build (spec 18 stays fully prescriptive — it is the one genuinely new surface, with cloudcut-nle as UX/app reference).
3. **ACCEPTANCE layer (proof):** spec 17 §13A's facet matrix extended to all three domains; the three repo suites re-tiered onto the three-tier methodology (engine 202 → T1/T2; OT 297 → T1/T2/T3; web-daw-core 737 → T1/T2 with null-test gates as the audio T1); new work lands with its tier assignments from day one.

**Per-repo implementation posture (the practical answer to "how do we approach implementation"):**

| Repo | Posture | New code allowed | Tests |
|---|---|---|---|
| nle-engine | **inherit + converge** (runtime core) | runtime command subset, M1.5 wiring, P1.8 corner-pin, text-motion D-phase; NO new editing-semantics surface | inherit 202; port expectations forward |
| opencut-timeline | **inherit + absorb ports** (editing core) | C7 rename, engine op-family ports, W7 MIDI shapes when MIDI editing is real; P3 polish only on request | inherit 297; ported engine tests become OT milestones |
| web-daw-core | **inherit + sync** (audio core) | bridge growth (sidechain/PDC/automation scene helpers); zero hand-edits to copy files (file-class law) | inherit 737; upstream drops gated by the same suite |
| App shell / UI (new) | **build to spec 18** (the only greenfield surface) | full shell, timeline-UI wiring via OT's `TimelineView` + controllers | new T3 real-mouse suite; cloudcut-nle suites as reference |

**The one-line version for HANDOFF/PLAN:** *inherit all three repos as the code baseline; the spec set is their contract, their gap list, and their acceptance harness; the only greenfield code is the shell.*

---

## 5. RULING 4 — Document governance (the two spec-hygiene rulings)

1. **Single-file canon (fixes `.refined.md` fragmentation):** the `.refined.md` content IS the spec. Action this round: **rename all 12 `NN-*.refined.md` → `NN-*.md`** (overwriting the seed originals; git history preserves them). Rule going forward: **one file per spec, edits happen in place, the status header carries the revision ledger.** No versioned suffixes, no parallel variants. Future sessions read exactly `NN-name.md`. (Seeds remain recoverable at their pre-rename commits; an `audits/` note records the rename map.)
2. **Code-reference vs inline-code rule (fixes the redundancy the user flagged):**
   - **Default: cite the code** (`repo file:symbol`, line numbers as secondary aid, refreshed by grep at every revision — the existing fresh-grep discipline). The code is always present, always current; inline copies of it can only rot.
   - **Inline code is permitted in exactly three cases:** (a) **protocol payloads and data shapes** (JSON command examples, type definitions that ARE the contract — these are spec content, not code citations); (b) **prescriptive/pseudo-code for algorithms that differ from every existing implementation** (the "should be" form); (c) **corrective shapes** — the spec's corrected version of something a repo does differently (labeled as the correction, with the repo's current shape cited next to it).
   - **Forbidden:** inline duplication of code that exists in a reference repo. Where found, replace with a citation.
   - **Enforcement:** the mechanical battery gains a check class for this rule (sampled: inline TS blocks in 01/05/06 must classify as (a)/(b)/(c) or carry a correction label). Full retro-classification of the ~180 existing inline blocks is a seal-round checklist item, not this round's (this round lands the rule + the 05 spot-fixes).

---

## 6. Spec impact map (what this round changes)

| File | Change |
|---|---|
| `00-master-spec.md` | Decision 12 (three-domain, single editing core, one-way projection, op-port); Decision 13 (audio adoption); Decision 14 (contract/gap/acceptance re-typing); governance section (single-file canon + code-ref rule); repo table + web-daw-core; canon statement re-worded |
| `20-audio-core.md` | **NEW** — audio-domain spec: three-layer model, S/G/E contracts, M1.5 convergence + retirement gates, M2/M3 roadmap, facet rows for §13A, code-ref table for web-daw-core |
| `14-implementation-phases.md` | §2.1 rewritten: three-repo baseline, code-first posture table, projector replaces bidirectional adapter, op-port phase, C2 scope-down, audio M1.5 phase; phase table reference columns updated |
| `05/06/15.refined.md → .md` | rename + Decision-12 amendments (projection law; algorithm-home merge roadmap; C2 narrowing note in 15 §13.15; audio-mix.ts transitionality note) |
| `19-code-references.md` | web-daw-core section (canon-table entry, ROI row); Decision-11 seam section updated to Decision-12 projection; watch list re-baseline |
| `17-test-plan.md` | §13A facet rows for the audio domain + three-suite re-tier table |
| `README.md` | canon statement, single-file note, reading order incl. 20 |

## 7. Watch items for the seal round (this round's deferred verifications)

1. **M1.5 wire-up lands** (submodule + player routing + export offline render): verify the parity gate runs and `AudioMixer` retirement is EXECUTED, not just planned; verify audio-mix.ts is reduced to mux-adapter or deleted.
2. **OT C7 rename pass**: verify the 18 prefixed types are renamed to spec-15 bare names and the §13.15 delta table rows flip to ALIGNED.
3. **Op-family port kickoff**: at least one family (recommend `roll` — smallest, well-specified in 06 §5.5) ported into OT ops with its engine tests carried over, to prove the port pipeline.
4. **web-daw upstream drift**: run `bun run sync -- --check` (web-daw is the only LIVING ancestor; the lock file + gates make drift loud).
5. **The `.refined.md` rename** completes with zero dangling references (battery check).
6. **Spec-05 inline-block classification** sample-audited per §5.2.
7. **SEAMS.md/track-model.md cross-consistency**: OT's SEAMS and web-daw-core's track-model are now normative-adjacent documents; the seal round verifies spec 05/20's seam statements match them exactly (no silent drift between repo docs and canon).

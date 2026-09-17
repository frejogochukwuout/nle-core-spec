# Final Sign-Off: Testability Refinement

> **[2026-09-14 — the R27 re-stamp note.]** This signoff certifies the **R7 refinement process** (2026-08-22) — the scout→audit→revise cycles it describes completed, and its verdicts stand **as of that date**. It is **not the corpus's current seal**: the spec set has since grown to 21 numbered specs + `REFERENCE-REGISTER.md` + `IMPLEMENTATION-PLAN.md` (Decisions D8-D41; the fleet rounds R8-R27 at `audits/`), and the operative acceptance contract is the plan's **K-tier ladder** (K1 LANDED — the module nets green at the R27 pins: engine 748 / OT 632 / WDC 777 / nle-ui 690 / app 252; K2-K4 + w1-r6 pending), enforced by the per-round battery (`scripts/battery_r2N.py`). The R27 final-tightness fleet's per-spec P1 fix-lists (`audits/fleet-r27/spec-*.md`) were pre-implementation corrections this signoff could not see; the W6 amendment wave (~159 amendments) landed them 2026-09-13/14. The mock-surface OPEN decisions live in the register's table. **The re-stamp (the corpus-final seal) lands after the four conditions: (1) the R27 amendment wave W6 — LANDED 2026-09-14; (2) battery_r27 green; (3) the register's OPEN decisions ruled; (4) K4's crawl exit.** Until then: implementation-ready **in architecture**, not yet sealed.
>
> **Two stale-number riders (the R7-era figures below):** the "73 EngineCommand types" and "~180 keyboard bindings" counts are R7-era — the live wire census is **31 verbs = 28 routed + 3 exceptions** (D-ARCH-6 @ `970948a`), and the keyboard family is 16 §0's live census (the 10-mode matrix is D30's growth). **15 §4.1A/§13.15 + 16 §0 are the current count authorities.**
>
> **[2026-09-16 — the R28 re-rider note.]** The four re-stamp conditions' R28 state: **(1)** the R27 wave was followed by the R28 seal round's corpus folds — the W4 law fold (D42-D50 + R15-R21, 14 law-side files @ `980920b`) AND the T3 test-law fold (the 12/17 amendments + the model-fold prereq sweep + the plan's test-track carve, S-spec(6)) — **LANDED** (the prereq sites — 09 §3.1/§3.1A's marker interface + captions family; 15 §4.3.49-51's params; 10 §8.1's blocker; 18 §4.4/§4.8 — landed in the SAME T3 commit `9ad78fa`; the earlier "the W6 delta-sweep's charge" wording was stale at birth, re-keyed to the LANDED state); **(2)** battery_r28 — pending (W5/W6; the fork carries the R28 check classes incl. the step-0 facet-completeness class); **(3)** the register's OPEN design decisions — **MET: 0 open design rows** (D42-D50 + R15-R21 ruled, adversarially ratified 0-REJECT at W3 — ARCH-R28 §4.1 — and corpus-folded at W4; D48/D49/D50 closed rows 5-8; the implementation halves keep their phase tags — the FX-page nle-ui absorption at r5/K3, the clip-marker bundle at r5-entry, the captions OT rows at r1); **(4)** K4's crawl exit — pending. The pin world re-keyed: K1 at the R28 pins, **re-keyed R29 (the same-day parallel execution fleet move — the D-ARCH-6 s17 consumer landing): engine 749/749 @ `e3f55bd` (chore-only re-pin — the vendored OT `6e2b91a`→`55c81c0` + the vendored WDC→`83b8850`; the engine's own code UNCHANGED at code anchor `74bef08`) / OT 632 @ `3e18722` (code pin `970948a` — the trailing seal18 W1+W2 reviews/docs only) / WDC 777 @ `94f6460` (docs-only over code anchor `ec8fd5c` — the ENG-2 S-series docs wrap) / nle-ui 691 @ `6754979` (AW1-2 + AW1-4 + ENG-1) — R30: 701 @ `5779295` / app 256 @ `876f2b8` (the 8-suite roof, wire-coverage 9→13; the app's ported wire-coverage gate GREEN against the live 31-verb registry) — R30: 377 @ `8f12cf9` (the 12-file roof)** / variants register-declared 1,939/68 (the declared pair 1,950/126) / mini 495/12 (sibling-maintained). **The stale-number riders re-keyed a second time:** "73 EngineCommand types" → the live census **31 = 28 routed + 3 exceptions** (M49C via the live registry read), with the ruled r1 projection **78 → 79 → 80** (15:5023/:5025 — the replace/insertBatch members); "~180 keyboard bindings" → **the 182-row canonical registry** (16 Appendix A, re-keyed R28-D50; 15 §13.5's 181 is the known-stale citation the W6 sweep rides); **new third rider:** the error registry is **25 codes, two-tier** (15 §6.3 — 24 + `RATE_OUT_OF_DOMAIN`, class-tagged, with the benign-echo family and the 9 lockPreCheck riders). **The full re-stamp (after battery_r28 green + the W6 prereq sweep + K4) gains the clause the R27 form lacked — test-law completeness:** every facet the corpus declares — D42-D50 included — carries a row in 17 §3.1/§13A.7, machine-checked by battery_r28's facet class; the battery is green with the R28 check classes — **the design law and the test law moved in the same round; the corpus is implementation-ready in architecture AND in verification law.** Until then: implementation-ready in architecture; the test law closes at W6.

**Date:** 2026-08-22
**Process:** Multi-round scout → audit → revise → integration review
**Status:** ✅ COMPLETE

---

## What Was Done

The user requested a comprehensive testability refinement focused on:
1. **Data-driven engine architecture** — engine fully controllable via JSON (static project + runtime ops)
2. **Comprehensive keyboard shortcuts** — avoid UI interaction tax (clicks/drags are slow/flaky in browser automation)
3. **Per-spec testing facets** — each of 12 specs gets a Testing section
4. **Overall test plan** — methodology + per-module template

This was executed as a multi-round sub-agent process with audit + revision at every round.

---

## Process Executed

### Round 1: Architectural Foundations (4 parallel scouts + 4 auditors + 3 revisions)

**Scouts:**
- **TEST-01**: Updated `00-master-spec.md` with Decision 9 (Data-Driven Engine Architecture) + §13 Testability Strategy + §7 WYSIWYG extension (state + audio) + stream map update + glossary
- **TEST-02**: Created `15-wire-protocol.md` (4,769 LOC) — 73 EngineCommand types in discriminated union, Zod schemas, HTTP wire protocol, EngineEvent stream, protocol versioning, test harness usage
- **TEST-03**: Created `16-keyboard-shortcuts.md` (2,334 LOC) — ~180 keyboard bindings across 13 categories, every shortcut maps to EngineCommand, 4 test patterns with speed benchmarks, conflict resolution
- **TEST-04**: Created `17-test-plan.md` (2,556 LOC) — three-tier methodology (engine/render/UI), 35-row test matrix, per-module template, test asset design, 3 WYSIWYG invariants, property-based testing, CI integration

**Audits:**
- AUDIT-TEST-01: ✅ PASS (2 trivial issues)
- AUDIT-TEST-02: ⚠️ NEEDS REVISION (1 HIGH: command count 60→73; 1 MEDIUM: idSeed missing)
- AUDIT-TEST-03: ⚠️ NEEDS REVISION (8 HIGH: stale spec 15 refs, EngineCommand divergence, UIManager doesn't exist, duplicate keys)
- AUDIT-TEST-04: ✅ PASS-WITH-MINOR-ISSUES (11 minor ≤1-line edits)

**Revisions:**
- REVISE-TEST-02: Fixed command count 60→73, added idSeed to InsertCommand/DuplicateCommand
- REVISE-TEST-03: Fixed 8 HIGH + 3 MEDIUM issues (aligned with spec 15, removed engine.ui.*, fixed method names, resolved duplicate keys, completed resolver switch)
- REVISE-TEST-01-04: Fixed all minor issues in master spec + test plan

### Round 2: Per-Spec Testing Facets (12 parallel scouts in 3 batches)

Each scout added a "## Testing" section to one of the 12 refined specs, following the template from spec 17 §4.

**Batch 1 (4 parallel):**
- FACET-01: `01-core-engine.refined.md` — 22 tests (EditorCore singleton, manager init, command dispatch, BatchCommand, undo/redo, Zod validation, 73 EngineCommand variants)
- FACET-02: `02-workers-threading.refined.md` — 45 tests (ManagedWorker lifecycle, pool, HeavyWorkerQueue, all 10 workers, AudioWorklet pitch preservation, crash recovery, transferable verification)
- FACET-03: `03-playback-engine.refined.md` — 37 tests (MediaTime math, 120K tick divisibility, 6 sync plans, AudioContext clock, seekGenerations, varispeed FFT, I420P10 not P010)
- FACET-09: `09-project-model.refined.md` — 54 tests (schema validation, withProjectLock, autosave, atomic write, 3 kimdogyeom regression tests #870/#871/#873)

**Batch 2 (4 parallel):**
- FACET-04: `04-renderer-color.refined.md` — 47 tests (color space conversions, 10-bit round-trip, YUV→linear shader, 17 blend modes, JFA mask, bind group cache, WYSIWYG pixel-diff, memory ceiling)
- FACET-05: `05-timeline.refined.md` — 53 tests (placement algorithm, snap, virtualization, 26 keyboard shortcuts, state WYSIWYG for every shortcut)
- FACET-06: `06-nle-ops.refined.md` — 166 tests (per-op contract × 14 ops, algorithm-specific, constraint, coalescing, 8 property-based invariants × 1000 runs)
- FACET-07: `07-composition.refined.md` — 72 tests (FrameDescriptor purity, transition state at 0%/50%/100%, effect ordering, mask, cache, WYSIWYG)

**Batch 3 (4 parallel):**
- FACET-08: `08-color-grading.refined.md` — 37 tests (LUT parser, curve baking, color wheels, qualifier, power window, scopes 16-bit, real-time feedback, HDR preservation)
- FACET-10: `10-fcpxml-export.refined.md` — 37 tests (FCPXML structure, DTD validation, colorSpace triplets, round-trip, manual FCP/DaVinci/Premiere)
- FACET-11: `11-cloud-render.refined.md` — 39 tests (StaticClock, ffmpeg CLI, WYSIWYG pixel-diff, audio WYSIWYG, GPU readback pipelining, 4K/8K render, crash recovery)
- FACET-12: `12-testing-strategy.refined.md` — 42 tests (pixelmatch, audio comparison, FFT, CI timing, meta-tests, canary/negative tests, flaky detector)

### Final Integration Review

**TEST-INTEGRATION** reviewed all 16 specs (12 refined + 4 new) for cross-stream consistency.

**Result: ✅ READY FOR FINAL SIGN-OFF**

10 cross-stream checks performed:
1. ✅ All 12 specs have Testing sections (12/12)
2. ✅ Testing sections follow spec 17 §4 template (4/4 spot-checked)
3. ✅ EngineCommand types consistent (with 1 acknowledged gap: exportFCPXML)
4. ✅ Keyboard shortcuts consistent with spec 16
5. ✅ Three-tier methodology consistent across all specs
6. ✅ WYSIWYG tests present (State in 01/03/05/06, Pixel in 04/07/11, Audio in 02/11)
7. ✅ Test assets consistent with spec 17 §5
8. ✅ Master spec Decision 9 reflected in specs 01, 15, 17
9. ✅ Cross-references work (spec 00 → 15/16/17; 15 → 01/09; 16 → 15; 17 → 12/15/16)
10. ✅ No duplication between spec 04 (GPU pipeline) and spec 08 (grading semantics)

6 issues found (1 MAJOR acknowledged/gated, 5 MINOR cosmetic) — all non-blocking.

---

## Final Deliverables

### Spec set at `/home/z/my-project/download/nle-spec/`

**34 spec files, ~52,601 total lines:**

| Category | Files | Lines |
|---|---|---|
| Seed specs (preserved) | 14 (00-14) | ~11,100 |
| Refined specs (with Testing sections) | 12 (01-12 .refined.md) | ~33,500 |
| New architectural specs | 3 (15, 16, 17) | ~9,700 |
| Master spec (updated) | 1 (00) | ~620 |
| Integration reports | 4 | ~1,500 |

### Audit reports at `audits/`

16 audit reports documenting every claim verification.

### Worklog at `worklog.md`

~2,800+ lines documenting every scout, auditor, and revision agent's work.

---

## Key Architectural Outcomes

### 1. Data-Driven Engine (Decision 9)

The engine is now a pure JSON-in, JSON-out state machine:

```
Inputs (all JSON):
  - Static: ProjectJSON (the project file)
  - Runtime: EngineCommand[] (sequence of operations)

Outputs (all JSON or binary):
  - State: SceneState (current timeline state)
  - Rendered: FrameDescriptor + pixels + audio PCM

Three identical consumers:
  - Browser UI (translates clicks/drags → EngineCommand)
  - Cloud render (takes JSON over wire, renders frames)
  - Test harness (constructs EngineCommand directly, no UI)
```

### 2. 73 EngineCommand Types (spec 15)

Every engine operation is a JSON-serializable discriminated union member:
- Timeline ops (split, trim, move, ripple, roll, slip, slide, delete, insert, duplicate, rate-stretch, retime, freeze-frame, range-removal)
- Track ops (mute, solo, lock, visibility, add, delete, reorder)
- Playback ops (play, pause, seek, setRate, setLoop)
- Project/media/scene/tool/marker/effect/mask/transition/keyframe/clipboard/undo-redo ops
- Snapshot command (for testing)

Each command:
- Zod-validated (schema is source of truth, TS types inferred)
- 1:1 mapped to an EditorCore manager method
- Returns `CommandResult` with state change + undo info
- Supports `idSeed` for deterministic replay
- Batchable via `CommandBatch` (atomic transactions)

### 3. ~180 Keyboard Shortcuts (spec 16)

Every common NLE action is achievable via keyboard:
- Playback (Space, J/K/L, arrows, I/O)
- Tools (V/B/H/Z/A/R)
- Selection (Tab, Cmd+A, Up/Down, Shift+)
- Editing (Cmd+B, Delete, Backspace, Cmd+D, [, ], ,, .)
- Track ops (M, S, Cmd+L)
- View/zoom (+/-, Cmd+0)
- Project (Cmd+S/O/N/W/E)
- Undo (Cmd+Z, Cmd+Shift+Z)
- Effects (1-9, Cmd+1-9)

4 test patterns documented:
- Pattern 1: Real keyboard via Playwright (~60ms/step)
- Pattern 2: Direct `engine.command.apply()` (~5ms/step — **12× faster**)
- Pattern 3: Hybrid
- Pattern 4: Mouse only (for mouse-mechanics tests)

### 4. Three-Tier Testing Methodology (spec 17)

| Tier | Environment | Speed | Coverage | Count |
|---|---|---|---|---|
| Tier 1: Pure engine | Vitest, no browser | <30s | NLE ops, color math, time math, project model, command pattern | ~600 tests |
| Tier 2: Render | Playwright + headless Chrome | ~10min | Renderer, color pipeline, composition, effects, scopes | ~200 tests |
| Tier 3: UI | Playwright + keyboard | ~5min | UI translation layer, keyboard shortcuts | ~100 tests |
| Property-based | fast-check | <30s | Invariants (1000 runs each) | ~80 tests |
| WYSIWYG | Cross-render | ~10min | State/Pixel/Audio consistency | ~30 tests |
| Performance | Self-hosted GPU | ~15min | FPS, memory, render time | ~15 tests |
| Manual | Human + FCP/DaVinci/Premiere | ~30min | FCPXML round-trip | ~12 tests |

### 5. Three WYSIWYG Invariants

1. **State WYSIWYG**: For any `EngineCommand[]`, keyboard path == direct API path → identical `SceneState`
2. **Pixel WYSIWYG**: For any project + frame N, browser render == cloud render → 0% pixel diff
3. **Audio WYSIWYG**: For any project, `AudioContext` (real-time) == `OfflineAudioContext` (offline) → bit-identical PCM

### 6. 12 Per-Spec Testing Facets

Each of the 12 refined specs now has a "## Testing" section with:
- Tier 1 / Tier 2 / Tier 3 tests specific to that module
- Property-based tests for invariants
- Test assets needed
- Test commands (npm filter scripts)

Total: **~700+ specific tests** defined across all 12 specs.

---

## What This Enables

### For Implementation
- Tests can be written directly from the per-spec Testing sections (each test is a bullet with a name)
- EngineCommand is the single API surface for all state changes — no need to reverse-engineer UI interactions
- Keyboard shortcuts enable fast Playwright tests without mouse drag/click flakiness

### For CI
- Tier 1 runs on every PR (<30s)
- Tier 2 runs on PRs touching render code (~10min)
- Tier 3 runs on PRs touching UI code (~5min)
- WYSIWYG tests run on main pushes (~10min)
- Performance tests run nightly (~15min)
- Manual tests run before each release

### For Cloud Render
- Same engine code runs in headless Chrome — WYSIWYG guaranteed by construction
- HTTP wire protocol accepts JSON over the wire — no separate API surface
- ffmpeg at edges only (transcode in, encode out) — no compositing in ffmpeg

### For Future Automation
- AI agents can speak EngineCommand directly
- MCP servers map 1:1 to EngineCommand types
- Scripting is just "construct EngineCommand sequence, apply, read result"

---

## Remaining Caveats

1. **`exportFCPXML` not in spec 15's 73 types** — explicitly acknowledged and gated in spec 10. Needs to be added to spec 15 before P5 implementation. (MAJOR but non-blocking — documented)
2. **6 MINOR cosmetic issues** — numbered headings in specs 04/08, audio filename mismatch in spec 06, spec 15 §13.5 oversimplification, spec 03 missing explicit audio WYSIWYG test. All ≤1-line fixes.
3. **2 CANNOT-VERIFY items from prior round** — `u16 >> 6` for 10-bit YUV, `rgba10a2unorm` Chromium status. Lock via web fetch before P4 implementation.

---

## Verdict

✅ **TESTABILITY REFINEMENT COMPLETE.**

The spec set now includes:
- A data-driven engine architecture (Decision 9) where the engine is fully controllable via JSON
- A wire protocol (spec 15) with 73 EngineCommand types that unify browser, cloud, and test consumers
- Comprehensive keyboard shortcuts (spec 16) enabling fast, reliable test automation
- A three-tier test plan (spec 17) with methodology, matrix, and per-module template
- 12 per-spec Testing sections with ~700+ specific tests

The integration review confirms cross-stream consistency with only 1 acknowledged MAJOR gap (exportFCPXML command) and 5 MINOR cosmetic issues — all non-blocking.

**The spec set is ready for implementation with testability baked in from the ground up.**

---

**End of Testability Sign-Off.**

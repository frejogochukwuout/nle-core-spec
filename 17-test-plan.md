# 17 — Overall Test Plan: Methodology, Test Matrix, Per-Module Template

**Stream:** Test methodology (umbrella)
**Status:** v1.1 (Round 8 — §13A added: facet coverage matrix, NFR verification recipes, a11y spot suite, absorbed-semantics fixtures, wire-protocol conformance suite, seam property tests, UI-shell v1.1 facet tests; §2.5 gains the error-path-census + NFR-recipe rules). Supersedes the methodology portions of `12-testing-strategy.md`
**Spec file:** `17-test-plan.md`
**Owner:** Test architecture (this stream)
**Consumers:** Every per-spec author (01–12), CI engineering, QA lead, implementation team

---

## 0. How to Read This Document

This is the **umbrella test plan** for the entire browser-based NLE project. It is
the *single source of truth* for:

1. The testing methodology (the **three-tier** model: engine, render, UI)
2. The test matrix (which features are tested at which tier)
3. The **per-module testing template** that every per-spec author must follow
   when writing the `## Testing` section of their spec
4. CI integration strategy (which tiers run when, on what runners)
5. Test asset design (what fixtures we generate, how, and why)
6. Reference regeneration process (how we update golden PNGs safely)
7. The three **WYSIWYG invariants** (state, pixel, audio) that bind the whole
   architecture together — these are the architectural invariants from
   Decision 6 of `00-master-spec.md` ("one engine, two entry points")
8. Property-based testing strategy (what invariants are checked, how)
9. Performance test methodology (thresholds, methodology, scheduling)
10. Manual test matrix (tests requiring human verification)

This spec **does not duplicate** the test *infrastructure* documentation in
`12-testing-strategy.md`. The split is documented in §1.4 below. Where
this spec needs infrastructure details, it cross-references spec 12.

This spec is *informed by* Decision 9 (data-driven engine architecture), which
has been added by the TEST-01 stream (see `00-master-spec.md` §2 Decision 9).
The three-tier methodology and per-module template work identically whether
commands are dispatched via a switch-statement or via a data-driven registry:
the **shape of the test** (construct `EngineCommand[]`, apply via
`engine.command.apply()`, assert on `SceneState`) is the same in both models.
With Decision 9 adopted, Tier 1 tests are *much* easier to author because
`EngineCommand` is a tagged-union of pure data — no method dispatch, no late
binding, no side effects until applied.

The `EngineCommand` / `CommandResult` / `EngineEvent` JSON types used throughout
this spec are defined canonically in `15-wire-protocol.md` (wire protocol).
Where this spec shows `engine.command.apply({ type: '...', params: { ... } })`,
the type and params shape comes from spec 15 §4 (`EngineCommand` union +
params) and the return shape comes from spec 15 §6 (`CommandResult`).

---

## 1. Purpose

### 1.1 What this spec defines

- The **overall testing methodology** for the project — three tiers plus
  cross-cutting test types (WYSIWYG, property, performance, manual)
- The **test matrix** — every feature × every tier, in a single table so it's
  visible at a glance what's covered, what's not, and why
- The **per-module testing template** — the literal markdown skeleton that
  every per-spec `## Testing` section must follow
- **CI integration** — which tiers run on PR, which run on `main`, which run
  nightly, on what runner hardware
- **Test asset design** — the canonical list of test clips (solid colors,
  gradients, SMPTE bars), reference tones (sines, noise), and test projects
  that every module's tests draw from
- **Reference regeneration** — the process for safely updating golden PNG
  references when the renderer intentionally changes
- **WYSIWYG verification** — the three invariants (state, pixel, audio) that
  make the "one engine, two entry points" architecture trustworthy
- **Property-based testing strategy** — what invariants every NLE op must
  preserve, with `fast-check` examples
- **Performance test methodology** — thresholds, methodology, scheduling
- **Manual test matrix** — what requires human verification (FCPXML round-trip
  in FCP/DaVinci/Premiere, color on calibrated display, etc.)

### 1.2 What this spec does NOT define

- Test runner config (`vitest.config.ts`, `playwright.config.ts`) — see
  `12-testing-strategy.md` §17.4 and §17.5
- Chrome launch args for WebGPU (`--enable-unsafe-webgpu`, lavapipe setup) —
  see `12-testing-strategy.md` §3.2, §14.A
- Self-hosted GPU runner install steps — see
  `12-testing-strategy.md` §17.2
- `pixelmatch` / `pngjs` API details — see
  `12-testing-strategy.md` §5
- ffmpeg asset generation command details — see
  `12-testing-strategy.md` §15
- npm package version pinning — see `12-testing-strategy.md` §14
- The specific test cases for each module — those live in each per-spec's
  `## Testing` section (see §4 below for the template)

### 1.3 Why we have an umbrella spec at all

Before this spec, testing was scattered:

- `00-master-spec.md` §9 has a 6-bullet summary that points at spec 12
- `12-testing-strategy.md` is a 2,363-line document that interleaves
  *methodology* (what to test, why) with *infrastructure* (how to configure
  Playwright, what npm versions, what ffmpeg commands)
- Every per-spec (01–11) has its own `## Testing` section, written ad-hoc,
  with no shared structure

This causes three problems:

1. **Inconsistent per-module testing sections.** Each spec author invents
   their own structure. Some have only Tier 1 tests. Some have only smoke
   tests. Some have property tests but no UI tests. Reviewers can't compare
   coverage across modules.
2. **No single test matrix.** To answer "is X tested?" requires reading
   every spec. The matrix in §3 below makes this a single table lookup.
3. **Methodology and infrastructure are tangled in spec 12.** When someone
   wants to *understand the testing philosophy* (three tiers, WYSIWYG
   invariants, property-based strategy), they have to skim past 2,300 lines
   of npm version tables and CI YAML. When someone wants to *configure the
   test runner*, they have to skim past the philosophical sections.

The fix: spec 17 is the *methodology umbrella*; spec 12 remains the
*infrastructure reference*. Both stay in the spec set; their responsibilities
are cleanly split (see §1.4).

### 1.4 Relationship to `12-testing-strategy.md`

**Decision:** spec 17 (this file) is the umbrella methodology. Spec 12 stays
focused on test *infrastructure*. Specifically:

| Concern | Lives in |
|---|---|
| Three-tier methodology definition | **17 §2** |
| Test matrix (feature × tier) | **17 §3** |
| Per-module testing template | **17 §4** |
| Test asset design (canonical fixture list) | **17 §5** |
| WYSIWYG invariants (state, pixel, audio) | **17 §6** |
| Property-based testing strategy | **17 §7** |
| Performance test methodology + thresholds | **17 §8** |
| CI workflow structure (jobs, runners, scheduling) | **17 §9** |
| Reference regeneration process | **17 §10** |
| Test asset generation commands (ffmpeg recipes) | 12 §15 |
| Manual test matrix | **17 §12** |
| Test failure triage | **17 §13** |
| Test runner config (`vitest.config.ts`, `playwright.config.ts`) | 12 §17.4, §17.5 |
| Virtual framebuffer / WebGPU flags | 12 §3.2, §14.A |
| Self-hosted GPU runner setup | 12 §17.2 |
| `pixelmatch` / `pngjs` / `looks-same` API | 12 §5 |
| Audio verification (`OfflineAudioContext`, FFT) | 12 §6 |
| GitHub Actions YAML (concrete workflow file) | 12 §17.1 (current); cross-referenced from **17 §9** |
| npm package version pinning | 12 §14 |
| Open questions (resolved — FFmpeg, Playwright, pixelmatch) | 12 §12 |
| Open questions (forward-looking — flaky pixels, device loss, OPFS quota) | **17 §15** |

**Action items implied by this split:**

- **No edits to spec 12 are required** for this split to take effect. Spec 12
  keeps all its current content. Its `## 9. Test Matrix` (currently a smoke /
  full / nightly table) is *subsumed* by this spec's §3 matrix; the spec 12
  version can be deleted in a future cleanup pass but is not blocking.
- Spec 12's `## 7. WYSIWYG Verification` (the code example for browser ==
  cloud pixel diff) is *the canonical implementation* of this spec's §6.2
  invariant. We do not duplicate the code here.
- Spec 12's `## 8. Property-Based Testing for NLE Ops` is *the canonical
  implementation* of this spec's §7 strategy. Spec 12 stays; this spec
  provides the higher-level invariant catalogue and the per-module template
  that says which invariants apply to which module.
- Spec 12's `## 11. CI Configuration` is *the canonical YAML*. This spec's §9
  provides the *structure* (which jobs, what scheduling, what runner labels)
  and cross-references 12 §17.1 for the verbatim YAML.
- Per-spec authors (01–11) reading spec 12 to understand "how do I write a
  test" now read spec 17 §4 first (template + matrix), then drill into 12
  for the runner / pixelmatch specifics.

### 1.5 Relationship to per-spec `## Testing` sections

Every per-spec from 01 through 12 has (or will have) a `## Testing` section.
That section must follow the template in §4 of this spec. The per-spec
section is **short** (~50–150 lines): it lists the specific test names,
fixtures, and commands for *that module*. The *methodology* (why we test this
way, what the tiers mean, how WYSIWYG works) lives in this spec, not in the
per-spec.

Per-spec `## Testing` sections should:

- **Reference this spec by number** (e.g., "See `17-test-plan.md` §2 for the
  three-tier methodology")
- **Use the §4 template verbatim** (same headings, same order)
- **List specific test names**, not philosophical justification
- **List specific fixtures** by filename (the canonical fixture names live
  in §5 below)
- **List specific commands** (e.g., `npm test -- --filter 06-nle-ops`)
- **Cross-reference the matrix row(s)** in §3 that apply to this module

### 1.6 Audience

This spec is written for three audiences:

1. **Per-spec authors** — read §4 (template) and §3 (matrix) to know what
   your module's `## Testing` section must contain
2. **Implementers** — read §2 (methodology) and §6 (WYSIWYG) to know what
   the test suite will verify about your code, so you can design for
   testability
3. **QA / CI engineers** — read §9 (CI), §10 (regen), §12 (manual), §13
   (triage) to know how the test suite is run and how failures are handled

---

## 2. Three-Tier Testing Methodology

### 2.1 The three tiers

The project uses a **three-tier** testing model. Each tier trades off speed
against fidelity. The tiers are layered: a feature tested at Tier 1 does not
need to be re-tested at Tier 2 unless Tier 2 has additional concerns (e.g.,
the rendered pixel output).

#### Tier 1: Pure engine tests

- **Runner:** Vitest (Node.js, no browser)
- **What it tests:** pure TS functions and the command-pattern engine
- **How:** construct an `EngineCommand[]`, apply via
  `engine.command.apply(cmd)`, assert on the resulting `SceneState`
- **Speed:** ~1000+ tests run in <30 seconds (single core, no parallelism
  required)
- **Determinism:** 100% — no GPU, no audio device, no clock, no network
- **Coverage:** NLE ops (split, trim, ripple, roll, slip, slide, delete,
  insert, rate-stretch, retime, freeze-frame, range-removal), color math
  (color space conversions, transfer functions, matrix math), time math
  (`MediaTime` add/sub/compare, `FrameRate` rational arithmetic), project
  model (save/load, schema migration), command pattern (undo/redo,
  coalescing, batch), OPFS persistence layer (mocked `FileSystemSyncAccessHandle`)
- **What it deliberately excludes:** anything that needs a GPU (rendering,
  shaders, blend modes), anything that needs an audio device (real-time
  playback), anything that needs a DOM (UI translation, keyboard shortcuts)
- **Why this tier exists:** it's the *fastest* tier, and it's the tier that
  tests the *pure* logic of the engine — the parts that should be 100%
  deterministic and never depend on browser/GPU/driver version. If a Tier 1
  test fails, it's a real bug, not a flaky GPU rounding issue
- **File location:** `tests/unit/**/*.test.ts` (Vitest globs `tests/unit/`
  by default; see `vitest.config.ts` in spec 12 §17.5)

#### Tier 2: Render tests

- **Runner:** Playwright + headless Chrome (with WebGPU enabled)
- **What it tests:** the renderer, color pipeline, composition, effects,
  scopes, and the pixel-accurate output of the engine
- **How:** load a test project via Playwright, seek to a specific frame
  number, take a screenshot via `page.screenshot()`, compare to a reference
  PNG via `pixelmatch`
- **Speed:** ~100 tests, ~10 minutes (most of the time is WebGPU
  initialization + shader compile + GPU readback)
- **Determinism:** 99%+ — GPU FP rounding is driver-dependent (see §15.1
  below). For WYSIWYG tests this is acceptable because we use the *same*
  GPU for both browser and cloud renders; for cross-GPU tests we use a
  tolerance threshold
- **Coverage:** renderer output (frame-accurate render at specific frame
  numbers), color pipeline (linear-light blending, transfer functions),
  composition (multi-track blend modes, opacity, masks, transitions),
  effects (color wheels, curves, LUT, qualifier), scopes (histogram,
  waveform, vectorscope), varispeed (pitch preservation via SoundTouch),
  cloud render WYSIWYG (browser == cloud pixel diff)
- **What it deliberately excludes:** NLE op correctness (that's Tier 1),
  UI translation (that's Tier 3), audio rendering (that's its own
  cross-cutting type, see §6.3)
- **Why this tier exists:** the renderer is the part of the engine that
  *produces pixels*, and pixels are what the user sees. A unit test that
  asserts `state.tracks.main.elements.length === 2` does not verify that
  those two elements *render correctly*. Tier 2 verifies the rendering
- **File location:** `tests/integration/**/*.test.ts` (Playwright globs
  `tests/integration/`)

#### Tier 3: UI tests

- **Runner:** Playwright (with keyboard input via `page.keyboard.press()`)
- **What it tests:** the UI translation layer — keyboard shortcuts, mouse
  interactions, drag-drop, the React component tree that converts user
  input into `EngineCommand`s
- **How:** issue a keyboard shortcut (e.g., `Cmd+B` for split), wait for
  the engine state to settle, then assert that the resulting `SceneState`
  is bit-identical to the state produced by directly calling
  `engine.command.apply({ type: 'split', params: { ... } })` with the
  equivalent params
- **Speed:** ~50 tests, ~5 minutes
- **Determinism:** 95%+ — UI tests can be flaky due to focus / animation /
  React render timing. Mitigations: `page.waitForFunction()` with engine
  state predicate, explicit `await page.keyboard.press()` (no debounce
  race), retry on Playwright timeout (see §13)
- **Coverage:** keyboard shortcuts (every binding in the keyboard shortcut
  table), mouse interactions (drag, trim handle drag, marquee select),
  drag-and-drop (clip to timeline, media library to timeline), component
  state (timeline virtualization, toolbar mode switching, inspector panel),
  and UI-shell panel contracts from 18-ui-shell.md (transport buttons, tool
  buttons, track-header toggles, inspector tabs — each asserting the
  `EngineCommand` the panel dispatches via
  `window.__engine.command.apply()`, state-WYSIWYG style)
- **What it deliberately excludes:** pixel output (that's Tier 2 — Tier 3
  asserts on `SceneState`, not on screenshots), op correctness (Tier 1)
- **Why this tier exists:** the engine is *correct in isolation*, but the
  UI translation layer is a separate concern. If `Cmd+B` is wired to call
  `engine.timeline.splitElements({ ... })` with the wrong params, the
  engine will produce wrong state and the user will see a wrong result —
  but Tier 1 (engine) and Tier 2 (render) tests won't catch this, because
  they construct commands directly. Tier 3 catches the UI wiring bug
- **File location:** `tests/integration/ui/**/*.test.ts`

### 2.2 Cross-cutting test types

In addition to the three tiers, four cross-cutting test types apply across
multiple tiers:

#### WYSIWYG tests

- **What:** the three architectural invariants (state, pixel, audio) that
  bind the engine together — see §6 for the full definition
- **Where:** state WYSIWYG is a Tier 3 test; pixel WYSIWYG is a Tier 2
  test; audio WYSIWYG is a cross-cutting test (uses both `AudioContext`
  and `OfflineAudioContext`)
- **Why cross-cutting:** WYSIWYG verification isn't *about* a single
  feature — it's about the *contract* that all features must respect.
  Every feature added to the engine must not break WYSIWYG. Therefore
  WYSIWYG tests run on every PR (not just nightly)

#### Property-based tests

- **What:** invariant verification under random inputs via `fast-check`
- **Where:** Tier 1 (pure functions only — property tests of ops, time
  math, color math). Not Tier 2/3 (too slow to run 1000 random cases
  through a browser)
- **Why:** unit tests check specific cases; property tests check *all
  cases* (within `numRuns` budget). See §7 for the full strategy

#### Performance tests

- **What:** FPS, scrub latency, memory ceiling, render time
- **Where:** Tier 2 (Playwright) for FPS/latency/memory; nightly for
  cloud render time
- **Why:** performance is a *correctness* requirement for a video
  editor — a 10fps editor is unusable, regardless of whether the pixels
  are correct. See §8 for the full methodology

#### Manual tests

- **What:** FCPXML round-trip in FCP/DaVinci/Premiere, color on
  calibrated display, audio on studio monitors, HDR output
- **Where:** outside CI — requires a human + licensed software + real
  hardware
- **Why:** some things cannot be automated (perceptual color accuracy,
  third-party NLE compatibility). See §12 for the full matrix

### 2.3 Tier coverage map

```
                    Tier 1     Tier 2     Tier 3     Property  Perf     Manual
                    (engine)   (render)   (UI)       (Tier 1)  (Tier2)  (human)
                    ─────────  ─────────  ─────────  ─────────  ──────  ──────
Pure math (time,    ████████   ─          ─          ████████   ─        ─
  color, frame)
NLE ops (split,     ████████   ─          ████████   ████████   ─        ─
  trim, ripple...)
Composition         ─          ████████   ─          ─          ─        ─
  (blend, masks)
Color effects       ─          ████████   ─          ─          ─        ─
  (wheels, LUT)
Scopes              ─          ████████   ─          ─          ─        ─
Playback (frame-    ─          ████████   ████████   ─          ████████  ─
  accurate)
Varispeed (pitch    ─          ████████   ─          ─          ─        ─
  preservation)
Keyboard shortcuts  ─          ─          ████████   ─          ─        ─
Project save/load   ████████   ─          ─          ─          ─        ─
OPFS persistence    ████████   ─          ─          ─          ─        ─
FCPXML export       ████████   ─          ─          ─          ─        ████████
WYSIWYG (state)     ─          ─          ████████   ─          ─        ─
WYSIWYG (pixel)     ─          ████████   ─          ─          ─        ─
WYSIWYG (audio)     ─          ████████   ─          ─          ─        ─
Memory ceiling      ─          ─          ─          ─          ████████  ─
```

### 2.4 Tier trade-offs

| Property | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Speed (per test) | <10ms | 1–10s | 100ms–1s |
| Total suite time | ~30s | ~10min | ~5min |
| Determinism | 100% | 99%+ | 95%+ |
| Catches engine bugs | ✅ | ✅ (via render output) | ✅ (via state) |
| Catches renderer bugs | ❌ | ✅ | ❌ |
| Catches UI wiring bugs | ❌ | ❌ | ✅ |
| Catches color pipeline bugs | ❌ | ✅ | ❌ |
| Catches timing/race bugs | ❌ | partial | ✅ |
| Requires GPU | ❌ | ✅ | partial (UI shell only) |
| Requires browser | ❌ | ✅ | ✅ |
| Requires audio device | ❌ | ❌ | ❌ (uses `OfflineAudioContext`) |
| CI runner | `ubuntu-latest` | `ubuntu-latest` (lavapipe) or self-hosted GPU | `ubuntu-latest` |
| Cost per PR | trivial | moderate | low |

The general principle: **push tests down to the lowest tier that can
verify the behavior**. If a behavior can be tested at Tier 1, don't
write a Tier 2 test for it. If a behavior must be tested at Tier 2, don't
write a Tier 3 test for it unless the UI wiring itself is the bug surface.

### 2.5 When to add a new test

A new feature should add tests at every tier where the matrix (§3) says
the feature is tested. Concretely:

1. **Before** writing the feature: add the matrix row (or extend the
   existing row) to §3 of this spec. The matrix is the contract.
2. While implementing: add Tier 1 tests for the engine logic. These must
   pass before the feature is considered "implemented."
3. After Tier 1 passes: add Tier 2 tests for the render output, using
   fixtures from §5. These verify the renderer pipeline.
4. After Tier 2 passes: add Tier 3 tests for the UI translation, using
   the keyboard shortcut table from spec 16 (`16-keyboard-shortcuts.md`).
5. If the feature touches an NLE op: add property-based tests per §7.
6. If the feature has a performance implication: add a perf test per §8.
7. If the feature has a manual verification aspect (FCPXML export, HDR
   display): add a row to §12.
8. **Error-path census (Round 8)**: every `CommandError` code the feature
   can emit — including `NOOP` (spec 15 §6.3) — must have at least one
   test that *triggers* it (asserting the code, not just `ok: false`).
   A code that can be emitted but never triggered in the suite is a
   coverage hole, not a nicety.
9. **Non-functional facets (Round 8)**: every NFR row in 00-master §6A
   gains a verification recipe in §13A.1 — budgets are contract, and a
   budget without a measurement hook is aspiration.

A feature is **not done** until all matrix cells for its row are green
(or explicitly marked "—" with a justification in the per-spec `## Testing`
section).

### 2.6 Tier numbering convention in test file names

Test files use a naming convention that makes the tier visible at a glance:

```
tests/unit/06-nle-ops/split.test.ts                  # Tier 1
tests/unit/06-nle-ops/split.property.test.ts         # Tier 1 (property)
tests/integration/06-nle-ops/split.render.test.ts    # Tier 2
tests/integration/06-nle-ops/split.ui.test.ts        # Tier 3
tests/performance/06-nle-ops/ripple.perf.test.ts     # Performance
tests/cloud-render/wysiwyg.test.ts                   # WYSIWYG
```

The first path segment (`unit`, `integration`, `performance`,
`cloud-render`) determines which Vitest/Playwright project picks it up
(see spec 12 §17.4 and §17.5 for the runner config). The second segment
(`06-nle-ops`) is the spec number — this makes `npm test -- --filter 06-nle-ops`
work across all tiers (see §4 "Test commands" below).

---

## 3. Test Matrix

### 3.1 The matrix

The matrix is the single table that answers "is feature X tested?" It is
the contract between this spec and every per-spec's `## Testing` section.

Legend:

- ✅ — tested at this tier
- — — not applicable at this tier (with justification)
- ⚠️ — partial coverage (see notes below the table)

| Feature | Tier 1 (engine) | Tier 2 (render) | Tier 3 (UI) | Property | Perf | Manual |
|---|---|---|---|---|---|---|
| `MediaTime` math (add, sub, compare, frame conversion) | ✅ | — | — | ✅ | — | — |
| `FrameRate` math (rational arithmetic, NTSC drop-frame) | ✅ | — | — | ✅ | — | — |
| Color space conversion (sRGB ↔ linear ↔ P3 ↔ Rec.2020) | ✅ | ✅ | — | — | — | — |
| Transfer functions (sRGB EOTF, PQ, HLG) | ✅ | ✅ | — | — | — | — |
| YUV ↔ RGB matrix math (BT.601, BT.709, BT.2020) | ✅ | — | — | — | — | — |
| Split op (single + multi-track) | ✅ | — | ✅ | ✅ | — | — |
| Trim op (head/tail, with ripple variants) | ✅ | — | ✅ | ✅ | — | — |
| Ripple delete / insert | ✅ | — | ✅ | ✅ | — | — |
| Roll edit | ✅ | — | ✅ | ✅ | — | — |
| Slip edit | ✅ | — | ✅ | ✅ | — | — |
| Slide edit | ✅ | — | ✅ | ✅ | — | — |
| Delete (with/without ripple) | ✅ | — | ✅ | ✅ | — | — |
| Insert (with/without ripple) | ✅ | — | ✅ | ✅ | — | — |
| Rate stretch | ✅ | — | ✅ | ✅ | — | — |
| Retime (variable speed) | ✅ | — | ✅ | ✅ | — | — |
| Freeze frame | ✅ | — | ✅ | ✅ | — | — |
| Range removal | ✅ | — | ✅ | ✅ | — | — |
| Multi-track blend (source-over, normal, screen, multiply, ...) | — | ✅ | — | — | — | — |
| Opacity (per-element, per-track) | — | ✅ | — | — | — | — |
| Transitions (crossfade, dip-to-color, push, wipe) | — | ✅ | ✅ | — | — | — |
| Masks (shape, alpha, luma) with JFA feathering | — | ✅ | — | — | — | — |
| Color wheels (lift, gamma, gain) | — | ✅ | — | — | — | — |
| Color curves (RGB, luma) | — | ✅ | — | — | — | — |
| LUT application (1D, 3D, .cube format) | — | ✅ | — | — | — | — |
| Qualifier (HSL, luma key) | — | ✅ | — | — | — | — |
| Scopes (histogram, waveform, vectorscope, parade) | — | ✅ | — | — | — | — |
| Playback frame accuracy (30/24/23.976 fps) | — | ✅ | ✅ | — | ✅ | — |
| Varispeed (0.5x, 2x, with SoundTouch pitch preservation) | — | ✅ | — | — | — | — |
| Scrubbing latency (p50, p95, p99) | — | — | ✅ | — | ✅ | — |
| Keyboard shortcuts (every binding in the table) | — | — | ✅ | — | — | — |
| Mouse interactions (drag, trim handle, marquee) | — | — | ✅ | — | — | — |
| Drag-and-drop (media library → timeline) | — | — | ✅ | — | — | — |
| UI shell panels (spec 18: transport, tools, inspector, track headers, deliver) | — | — | ✅ | — | — | — |
| Undo / redo (single, batch, coalesced) | ✅ | — | ✅ | ✅ | — | — |
| Project save / load (JSON round-trip) | ✅ | — | — | — | — | — |
| Project schema migration (v1 → v2) | ✅ | — | — | — | — | — |
| OPFS persistence (media cache, project autosave) | ✅ | — | — | — | — | — |
| FCPXML export (1.10 schema, multi-track, color metadata) | ✅ | — | — | — | — | ✅ |
| FCPXML import (round-trip from FCP/DaVinci/Premiere) | — | — | — | — | — | ✅ |
| Cloud render WYSIWYG (browser == cloud pixel diff) | — | ✅ | — | — | — | — |
| State WYSIWYG (keyboard shortcut == direct API) | — | — | ✅ | — | — | — |
| Audio WYSIWYG (real-time == offline PCM) | — | ✅ | — | — | — | — |
| Memory ceiling (4K editing <2GB) | — | — | — | — | ✅ | — |
| Render time (4K 5-min <2x realtime, 8K 1-min <30min) | — | — | — | — | ✅ | — |
| Memory ceiling (8K cloud render fits 4GB) | — | — | — | — | ✅ | — |
| Worker lifecycle (spawn, terminate, error recovery) | ✅ | — | — | — | — | — |
| WebGPU device loss recovery | ⚠️ | ⚠️ | — | — | — | — |
| AudioWorklet message protocol | ✅ | — | — | — | — | — |

### 3.2 Notes on partial coverage (⚠️)

- **WebGPU device loss recovery** — Tier 1: the engine's `DeviceLostHandler`
  can be unit-tested by mocking `device.lost.then()` and asserting the
  handler reinitializes the pipeline. Tier 2: actually triggering device
  loss in a Playwright test is hard (requires `device.destroy()` access
  which is gated behind `lose_device` extension); mitigation: a manual test
  script that uses the `lose_device` WebGPU extension mid-test (see §15.3)

### 3.3 How to read the matrix

For a given feature, the matrix tells you:

- **Which tiers** your per-spec `## Testing` section must include
- **Which cross-cutting types** apply (property, perf, manual)
- **What to skip** (the `—` cells, with the implicit justification "this
  behavior is not visible at this tier")

Example: for "Split op", the matrix says:

- Tier 1 ✅ → per-spec 06 must have a unit test for `engine.timeline.splitElements()`
- Tier 2 — → no render test (split doesn't change pixels, just element count)
- Tier 3 ✅ → per-spec 06 must have a Playwright test for `Cmd+B` keyboard shortcut
- Property ✅ → per-spec 06 must have a `fast-check` test for "split preserves total duration" and "no overlapping elements after split"
- Perf — → not a perf-sensitive op (no separate perf test)
- Manual — → not a manual verification aspect

### 3.4 How to extend the matrix

When adding a new feature:

1. Add a row to the table above
2. Fill in the cells (✅ or —)
3. Add a per-spec `## Testing` section entry following the §4 template
4. The CI workflow (§9) does not need to change — the tier directories
   auto-discover new test files

When removing a feature: delete the row, delete the per-spec entry, ensure
no test files reference the removed feature (CI will fail loudly if they do).

---

## 4. Per-Module Testing Template

Every per-spec (01 through 12) has a `## Testing` section. This section
must follow the template below verbatim. The template is short on purpose:
the *methodology* lives in this spec; the per-spec section lists the
*specific* tests for that module.

### 4.1 The template

```markdown
## Testing

> See `17-test-plan.md` for the overall methodology, test matrix, and
> per-module template. This section lists the specific tests for this module.

### Tier 1: Pure engine tests

[Filename: `tests/unit/<spec-number>-<spec-name>/<feature>.test.ts`]

- `<test-name>` — asserts `<invariant>` under `<conditions>`
- `<test-name>` — asserts `<invariant>` under `<conditions>`
- ...

[Each test name should be a single sentence: "split at frame 0 produces
two elements", "ripple delete shifts downstream elements left by deleted
duration", etc. The bullet list is the contract — reviewers compare it
to the actual test file to verify coverage.]

### Tier 2: Render tests

[Filename: `tests/integration/<spec-number>-<spec-name>/<feature>.render.test.ts`]

- `<test-name>` — renders frame `<N>` of `<fixture>`, pixel-diffs against
  `tests/fixtures/references/<fixture>-frame-<N>.png`; tolerance `<X%>`
- ...

[Use solid-color test clips from §5.1 for blend verification. Use
frequency-tone audio clips from §5.2 for audio verification. Reference
PNGs are regenerated per §10.]

### Tier 3: UI tests

[Filename: `tests/integration/<spec-number>-<spec-name>/<feature>.ui.test.ts`]

- `<test-name>` — issues `<keyboard shortcut>` via `page.keyboard.press()`,
  asserts resulting `SceneState` matches direct `engine.command.apply()`
  path (state WYSIWYG, see §6.1)
- ...

[Every keyboard shortcut in the shortcut table (see `16-keyboard-shortcuts.md`)
for this module must have a UI test. Mouse interactions (drag, trim handle,
marquee) use `page.mouse.move()` / `page.mouse.down()` / `page.mouse.up()`.]

### Property-based tests

[Filename: `tests/unit/<spec-number>-<spec-name>/<feature>.property.test.ts`]

- `<invariant name>` — `fc.assert(fc.property(arbitraryState, arbitraryParams,
  (s, p) => { ... }), { numRuns: 1000 })`
- ...

[Invariants for NLE ops: "preserves total duration", "no overlapping
elements after op", "source bounds respected", "locked tracks not
modified", "undo restores exact state". See §7 for the full catalogue.]

### Test assets

[List the specific fixtures this module's tests use. Reference the
canonical fixture names from §5 of this spec — don't invent new ones.]

- `tests/fixtures/videos/10s-red-1080p.mp4` — solid red, 10s, for blend tests
- `tests/fixtures/projects/<fixture>.json` — pre-built project for this test
- `tests/fixtures/references/<fixture>-frame-<N>.png` — reference PNG
- `tests/fixtures/luts/<lut>.cube` — test LUT (if applicable)

### Test commands

# Run Tier 1 tests for this module
npm test -- --filter "<spec-number>-<spec-name>"

# Run Tier 2 (render) tests for this module
npm run test:render -- --filter "<spec-number>-<spec-name>"

# Run Tier 3 (UI) tests for this module
npm run test:ui -- --filter "<spec-number>-<spec-name>"

# Run all tiers for this module
npm run test:all -- --filter "<spec-number>-<spec-name>"

# Run property tests only
npm run test:property -- --filter "<spec-number>-<spec-name>"

# Regenerate reference PNGs for this module's fixtures (see §10)
npm run regen-references -- --filter "<spec-number>-<spec-name>"
```

### 4.2 Worked example: spec 06 (NLE ops)

```markdown
## Testing

> See `17-test-plan.md` for the overall methodology, test matrix, and
> per-module template. Matrix row: "Split op", "Trim op", "Ripple
> delete/insert", "Roll/Slip/Slide", "Rate stretch", "Retime",
> "Freeze frame", "Range removal".

### Tier 1: Pure engine tests

[Filename: `tests/unit/06-nle-ops/*.test.ts`]

- `split-single-track-at-frame-0` — split at `MediaTime(0)` produces two
  elements; first has original duration, second has duration 0
- `split-multi-track-all-tracks` — `trackIds: null` splits all tracks at
  the given time; total element count increases by N (one per track)
- `trim-head-by-1s` — `updateElementTrim({ trimStart: 1s })` shifts
  `sourceStart` by +1s, decreases `duration` by 1s, shifts `startTime` by 0
- `trim-tail-by-1s` — `updateElementTrim({ trimEnd: 1s })` decreases
  `duration` by 1s, `startTime` and `sourceStart` unchanged
- `trim-bounded-by-source-duration` — trim cannot push `sourceStart < 0`
  or `sourceStart + sourceDuration > source.duration`
- `ripple-delete-shifts-downstream-left` — ripple delete of element with
  duration D shifts every downstream element's `startTime` by -D
- `roll-edit-preserves-total-duration` — rolling two adjacent elements
  preserves the sum of their durations
- `slip-edit-preserves-timeline-position` — slip changes `sourceStart` but
  not `startTime` or `duration`
- `slide-edit-preserves-element-duration` — slide moves an element
  without changing its `sourceStart` or `duration`
- `rate-stretch-2x-halves-duration` — rate stretch at 2x speed halves
  `duration`, doubles effective playback rate, leaves `sourceStart` unchanged
- `freeze-frame-creates-static-element` — freeze frame at time T creates
  a new element of type `'freeze'` with `sourceStart` = the frozen frame
- `range-removal-creates-gap` — removing a range from the middle of a
  clip creates two clips with a gap (or ripple-closes if ripple enabled)
- `undo-restores-exact-state` — after any op, `commandManager.undo()`
  returns `SceneState` deep-equal to the pre-op state
- `redo-reapplies-after-undo` — after `undo()`, `redo()` reapplies the
  op and returns to the post-op state
- `batch-command-coalesces-multiple-trims` — multiple trims in a
  `BatchCommand` are a single undo step
- `preview-then-commit-is-atomic` — `previewElements({ updates })` followed
  by `commitPreview()` produces a single `TracksSnapshotCommand` on the
  undo stack

### Tier 2: Render tests

[Filename: `tests/integration/06-nle-ops/*.render.test.ts`]

NLE ops do not change the rendered pixels (they restructure the timeline,
not the per-frame output). Tier 2 tests for spec 06 are limited to:

- `split-then-render-first-half` — after split, render frame N (before split
  point); pixels match the unsplit reference for that frame
- `split-then-render-second-half` — after split, render frame N (after split
  point); pixels match the unsplit reference
- `trim-then-render-trimmed-region` — trim removes frames 0-30; rendering
  frame 0 of the trimmed element produces the same pixels as frame 30 of
  the untrimmed source

[These are sanity checks — they verify that the renderer correctly
re-resolves the frame descriptor after a structural op. The op's
correctness is verified at Tier 1; the render correctness is verified
by the broader renderer tests in spec 04.]

### Tier 3: UI tests

[Filename: `tests/integration/06-nle-ops/*.ui.test.ts`]

- `keyboard-split-cmd-b` — `Cmd+B` issues `splitElements({ splitTime:
  currentTime })`; resulting state matches direct API call
- `keyboard-delete-backspace` — `Backspace` issues `deleteElements({ ids:
  selection })` with ripple=false; `Shift+Backspace` issues ripple delete
- `keyboard-trim-left-bracket` — `[` trims the head of the selected
  element to the playhead position
- `keyboard-trim-right-bracket` — `]` trims the tail of the selected
  element to the playhead position
- `keyboard-ripple-delete-shift-delete` — `Shift+Delete` issues
  `deleteElements({ ids: selection, ripple: true })`
- `mouse-trim-handle-drag` — dragging the left trim handle by Δpx issues
  `updateElementTrim({ elementId, trimStart: deltaFrames })` via
  `previewElements` → `commitPreview`
- `mouse-marquee-select` — marquee drag selects all elements intersecting
  the rectangle; selection state matches direct API call

### Property-based tests

[Filename: `tests/unit/06-nle-ops/*.property.test.ts`]

- `split-preserves-total-duration` — for arbitrary scene state + arbitrary
  split time, total duration is unchanged after split
- `trim-never-creates-negative-duration` — for arbitrary trim delta, no
  element ends up with `duration ≤ 0`
- `no-overlapping-elements-after-any-op` — for arbitrary scene + arbitrary
  op (split, trim, ripple, roll, slip, slide, delete, insert), no two
  adjacent elements on the same track overlap
- `source-bounds-respected-after-any-op` — for arbitrary op, no element
  ends up with `sourceStart < 0` or `sourceStart + sourceDuration > source.duration`
- `locked-tracks-not-modified-by-any-op` — for arbitrary op, locked tracks'
  elements are byte-identical before and after
- `undo-restores-exact-state` — for arbitrary op, `undo()` restores the
  pre-op state byte-identically
- `idempotent-split-at-element-boundary` — splitting at an existing
  element boundary is a no-op (state unchanged)
- `ripple-cancel-on-zero-duration-delete` — deleting a zero-duration
  element is a no-op ripple

### Test assets

- `tests/fixtures/projects/simple-cut.json` — 3 clips on main track
- `tests/fixtures/projects/multi-track-blend.json` — 2-track blend project
- `tests/fixtures/projects/10-track-100-clip.json` — stress test for
  property tests with large state
- `tests/fixtures/videos/10s-red-1080p.mp4` — solid red, 10s
- `tests/fixtures/videos/10s-green-1080p.mp4` — solid green, 10s
- `tests/fixtures/videos/10s-blue-1080p.mp4` — solid blue, 10s

### Test commands

# Run Tier 1 tests for spec 06
npm test -- --filter "06-nle-ops"

# Run Tier 2 (render) tests for spec 06
npm run test:render -- --filter "06-nle-ops"

# Run Tier 3 (UI) tests for spec 06
npm run test:ui -- --filter "06-nle-ops"

# Run property tests for spec 06
npm run test:property -- --filter "06-nle-ops"

# Run all tiers for spec 06
npm run test:all -- --filter "06-nle-ops"
```

### 4.3 Anti-patterns to avoid

- ❌ **Mixing tiers in one test file** — `split.test.ts` containing both
  Vitest assertions *and* Playwright browser launches. Split into
  `split.test.ts` (Tier 1) and `split.ui.test.ts` (Tier 3). The runner
  config picks files by directory.
- ❌ **Inventing new fixture names** — `red-clip.mp4` instead of
  `10s-red-1080p.mp4`. Use the canonical names from §5 so the asset
  generation script (§11) produces them once and all tests share them.
- ❌ **Writing philosophical justifications in the per-spec section** —
  the per-spec section is a *test list*, not a methodology doc. Methodology
  lives in this spec.
- ❌ **Duplicating the matrix** — don't repeat the matrix in the per-spec;
  reference it ("Matrix row: Split op").
- ❌ **Skipping tiers silently** — if the matrix says Tier 2 ✅ for your
  feature, the per-spec section *must* have a Tier 2 subsection. If you
  believe Tier 2 doesn't apply, propose a matrix change in this spec
  (with justification) before writing the per-spec.

---

## 5. Test Asset Design

This section lists the *canonical* test fixtures. Every per-spec's
`## Test assets` subsection references these names — do not invent new
ones. If you need a fixture that's not listed here, add it to this
section (with a justification) before using it in a per-spec.

### 5.1 Solid-color video clips

Used for: blend mode verification, opacity verification, layer ordering,
exposure/brightness tests, color pipeline verification (sRGB ↔ linear
conversion correctness).

All clips are 1920×1080, 30 fps, 10 seconds, H.264, `yuv420p` (8-bit) for
the basic set; a parallel 10-bit set (H.265, `yuv420p10le`) exists for
HDR / 10-bit pipeline tests.

| Asset | Color (sRGB hex) | Color (linear) | Purpose |
|---|---|---|---|
| `10s-red-1080p.mp4` | #FF0000 | (1, 0, 0) | Blend tests (red channel) |
| `10s-green-1080p.mp4` | #00FF00 | (0, 1, 0) | Blend tests (green channel) |
| `10s-blue-1080p.mp4` | #0000FF | (0, 0, 1) | Blend tests (blue channel) |
| `10s-white-1080p.mp4` | #FFFFFF | (1, 1, 1) | Exposure / brightness tests |
| `10s-black-1080p.mp4` | #000000 | (0, 0, 0) | Exposure / brightness tests |
| `10s-gray-50-1080p.mp4` | #808080 | (0.21586, 0.21586, 0.21586) | Mid-gray tests (sRGB EOTF verification) |
| `10s-gray-18-1080p.mp4` | #464646 | (0.018, 0.018, 0.018) | 18% gray (photographic mid-tone) |
| `10s-gradient-h-1080p.mp4` | horizontal black→white | linear gradient | Banding detection, color ramp |
| `10s-gradient-v-1080p.mp4` | vertical black→white | linear gradient | Banding detection, color ramp |
| `10s-gradient-d-1080p.mp4` | diagonal black→white | linear gradient | Banding detection |
| `10s-smpte-bars-1080p.mp4` | SMPTE color bars | per-bar | Reference pattern, color bars |
| `10s-red-1080p-10bit.mp4` | #FF0000 (10-bit) | (1, 0, 0) | 10-bit pipeline verification |
| `10s-white-1080p-hdr-pq.mp4` | #FFFFFF (PQ) | (1, 1, 1) at 1000 nits | HDR PQ pipeline verification |
| `10s-white-1080p-hdr-hlg.mp4` | #FFFFFF (HLG) | (1, 1, 1) at 1000 nits | HDR HLG pipeline verification |

**Generation** (verified in spec 12 §15.A):

```bash
ffmpeg -f lavfi -i color=c=red:s=1920x1080:r=30:d=10 \
  -c:v libx264 -pix_fmt yuv420p -y 10s-red-1080p.mp4

# 10-bit variant
ffmpeg -f lavfi -i color=c=red:s=1920x1080:r=30:d=10 \
  -c:v libx265 -pix_fmt yuv420p10le -y 10s-red-1080p-10bit.mp4

# SMPTE bars (uses ffmpeg's smptebars source filter — see spec 12 §14.D)
ffmpeg -f lavfi -i smptebars=size=1920x1080:rate=30:d=10 \
  -c:v libx264 -pix_fmt yuv420p -y 10s-smpte-bars-1080p.mp4
```

**Why solid colors:** blend modes can be verified by sampling specific
pixels. E.g., red blended 50% over green with `source-over` should
produce a pixel with linear-light values `(0.5, 0.5, 0)` ≈ sRGB
`(187, 187, 0)` (yellow). See spec 12 §5.3 for the linear-light
arithmetic.

### 5.2 Frequency-tone audio clips

Used for: audio mix verification, varispeed (pitch preservation)
verification, audio scope (waveform/spectrogram) verification.

All clips are 48 kHz, 16-bit PCM, mono, 10 seconds.

| Asset | Frequency | Duration | Purpose |
|---|---|---|---|
| `10s-440hz-sine.wav` | 440 Hz (A4) | 10s | Standard reference tone (musical A) |
| `10s-1000hz-sine.wav` | 1000 Hz | 10s | Common test frequency (most speakers peak here) |
| `10s-100hz-sine.wav` | 100 Hz | 10s | Low frequency (subwoofer / bass test) |
| `10s-10000hz-sine.wav` | 10000 Hz | 10s | High frequency (tweeter / aliasing test) |
| `10s-white-noise.wav` | white noise | 10s | Full spectrum (FFT flatness test) |
| `10s-pink-noise.wav` | pink noise | 10s | Perceptually flat (mix reference) |
| `10s-chirp-20-20k.wav` | 20 Hz → 20 kHz sweep | 10s | Frequency response sweep |
| `10s-stereo-440-left.wav` | 440 Hz left only | 10s | Stereo pan verification (left) |
| `10s-stereo-440-right.wav` | 440 Hz right only | 10s | Stereo pan verification (right) |

**Generation** (verified in spec 12 §15.D):

```bash
ffmpeg -f lavfi -i sine=frequency=440:duration=10:sample_rate=48000 \
  -c:a pcm_s16le -y 10s-440hz-sine.wav

# Pink noise
ffmpeg -f lavfi -i anoisesrc=color=pink:duration=10:sample_rate=48000 \
  -c:a pcm_s16le -y 10s-pink-noise.wav

# Stereo chirp (sweep)
ffmpeg -f lavfi -i aevalsrc="sin(2*PI*(20+(20000-10)*t/10)*t):d=10:s=48000" \
  -c:a pcm_s16le -y 10s-chirp-20-20k.wav
```

**Why frequencies:** pitch preservation under varispeed can be verified
by FFT — a 440 Hz tone played at 0.5× speed must still peak at 440 Hz
(if pitch is preserved) or at 220 Hz (if pitch is not preserved). See
spec 12 §6.3 for the FFT verification helper.

### 5.3 Test project JSON files

Pre-built project files for common test scenarios. These are JSON files
conforming to the project model schema (spec 09 §3).

| Project | Description | Tracks | Clips | Used for |
|---|---|---|---|---|
| `simple-cut.json` | 3 clips on main track, no effects | 1 | 3 | Basic editing tests (split, trim, ripple) |
| `multi-track-blend.json` | Red main + green overlay @ 50% opacity | 2 | 2 | Blend mode tests |
| `with-transitions.json` | 3 clips with crossfades between them | 1 | 3 | Transition tests |
| `with-color-grade.json` | 1 clip + color wheels effect | 1 | 1 | Color grading tests |
| `with-lut.json` | 1 clip + identity LUT applied | 1 | 1 | LUT application tests |
| `with-varispeed.json` | 1 clip at 0.5× speed (pitch preserved) | 1 | 1 | Varispeed tests |
| `with-varispeed-2x.json` | 1 clip at 2× speed (pitch preserved) | 1 | 1 | Varispeed tests |
| `with-mask.json` | 1 main clip + 1 overlay with shape mask | 2 | 2 | Mask + JFA feathering tests |
| `audio-mix.json` | 3 audio tracks (440Hz, 1000Hz, 100Hz) at -6dB each | 3 (audio) | 3 | Audio mix tests |
| `audio-pan.json` | 1 stereo clip panned hard left, then hard right | 1 (audio) | 1 | Stereo pan tests |
| `10-track-100-clip.json` | Stress test: 10 tracks, 100 clips total | 10 | 100 | Performance tests, property tests with large state |
| `multi-track.json` | 5 tracks (1 main + 2 video overlays + 2 audio), 10 clips, no effects | 5 | 10 | Multi-select, sync-lock, range-removal tests (spec 06) |
| `all-ops.json` | Every op family represented (≥1 element per family: split/trim/move/duplicate/rate-stretch/retime/freeze-frame/range-removal/mute-solo-lock) | 3 | 12 | Property-based no-overlap / source-bounds / locked-tracks suites seeded from a realistic state (spec 06) |
| `with-effects.json` | 3 clips on main track with 2 stacked GPU effects (blur + color-wheels) | 1 | 3 | Tier 1 effectpass-resolution-chain-ordering + Tier 2 effect-ordering tests (spec 07) |
| `with-masks.json` | 2 clips, each with 2 masks (rect + ellipse, one inverted) | 1 | 2 | Multi-mask chaining + invert-once semantics (spec 07 §8.3) |
| `with-qualifier.json` | 1 clip with HSL qualifier targeting a known color region | 1 | 1 | Qualifier keying tests (spec 08) |
| `with-power-window.json` | 1 clip with ellipse power window + JFA feather | 1 | 1 | Window region grading (spec 08) |
| `green-screen.json` | 1 green-screen background clip for qualifier-mask keying (spec 07 §12.7) | 1 | 1 | Qualifier mask keyer tests (spec 07 Testing) |
| `single-clip.json` | 1 clip on main track, 10 s | 1 | 1 | Keyboard recipes (spec 16 §9.2) |
| `three-clips.json` | 3 clips in timeline order on main track (selection-navigation recipes) | 1 | 3 | Tab/Shift+Tab selection traversal (spec 16 §9) |
| `varispeed.json` | 2 clips: one at 0.5× and one at 2× | 1 | 2 | Audio-WYSIWYG realtime-vs-offline render (spec 11 Testing) |
| `4k-5min.json` | 4K UHD 5-minute project, 3 tracks, 15 clips | 3 | 15 | 4K render performance |
| `8k-1min.json` | 8K UHD 1-minute project, 3 tracks, 5 clips | 3 | 5 | 8K render tests |
| `ntsc-23976.json` | 23.976 fps NTSC project, 2 hours | 1 | 1 | NTSC drop-frame timing tests |
| `pal-25.json` | 25 fps PAL project, 1 hour | 1 | 1 | PAL timing tests |
| `hdr-pq.json` | HDR project with PQ transfer function, 1000 nits | 1 | 1 | HDR pipeline tests |
| `hdr-hlg.json` | HDR project with HLG transfer function | 1 | 1 | HDR pipeline tests |

> **Per-stream fixture namespacing (Round-7 rule):** streams may register
> additional fixtures under a namespaced directory
> `tests/fixtures/projects/<NN>/` (e.g. spec 09's `09/v1-minimal.json`) for
> stream-local schema/migration fixtures that are never rendered; such
> fixtures still register a row here. Registered in Round 7 under this rule
> (spec 09): `09/v1-minimal.json` (v1 schema, minimal), `09/v1-large.json`
> (v1 schema, 100+ clips), `09/v0-legacy.json` (pre-v1 shape needing
> migration), `09/dirty-state.json` (overlaps + orphans + out-of-range
> values for normalize/repair tests), `09/ntsc-29.97.json` (drop-frame rate).

**Generation:** projects are hand-authored JSON, not generated. They
live in `tests/fixtures/projects/`. The schema is defined in spec 09 §3.

### 5.4 Reference render outputs

For each test project that has a Tier 2 render test, store reference PNG
frames at specific frame numbers:

```
tests/fixtures/references/
├── linux-nvidia/                     # generated on NVIDIA GPU runner
│   ├── simple-cut-frame-0.png
│   ├── simple-cut-frame-100.png
│   ├── simple-cut-frame-500.png
│   ├── multi-track-blend-frame-50.png
│   ├── with-transitions-frame-30.png
│   ├── ...
├── macos-m2/                         # generated on Mac M2 runner
│   └── ... (same filenames)
└── windows-d3d12/                    # generated on Windows D3D12 runner
    └── ... (same filenames)
```

**Why per-platform references:** GPU FP rounding differs across drivers
(see §15.1). Storing per-platform references lets the WYSIWYG test pass
on each platform against its own golden, while still catching real
regressions within a platform.

**Frame selection:** frames 0, 30 (1 second in), 100 (3.33s), 500
(16.67s), and 1000 (33.33s) cover: first frame, mid-clip, transition
points, end of project. Per-spec sections may add more frames for
specific tests (e.g., "frame 29 = last frame before transition",
"frame 31 = first frame after transition").

**Regeneration:** see §10 below for the safe regeneration process.

### 5.5 Test LUTs

For LUT application tests:

| Asset | Format | Description |
|---|---|---|
| `identity.cube` | 3D LUT, 33×33×33, .cube format | Identity transform (output == input) |
| `swap-rb.cube` | 3D LUT, 33×33×33 | Swaps red and blue channels |
| `invert.cube` | 3D LUT, 33×33×33 | Inverts all channels (1 - input) |
| `gamma-2.2.cube` | 1D LUT | Applies gamma 2.2 (legacy gamma, intentionally wrong for linear pipeline — used to verify the LUT is applied *after* linearization, not before) |
| `s-log3-to-rec709.cube` | 3D LUT, 33×33×33 | Sony S-Log3 to Rec.709 conversion (real-world LUT) |
| `large-65.cube` | 3D LUT, 65×65×65 | Large LUT for memory/perf tests |
| `typical-s-curve.cube` | 33×33×33 .cube, monotonically increasing S-curve | 16-bit-precision-no-banding test (spec 08) |

**Generation:** LUTs are hand-authored `.cube` files. The format is
defined by Adobe's spec (see spec 08 §6 for the parser).

### 5.6 Test fonts and overlays

For title/text overlay tests (if implemented):

| Asset | Description |
|---|---|
| `Inter-Regular.ttf` | Standard sans-serif font for title tests |
| `RobotoMono-Regular.ttf` | Monospace font for timecode displays |
| `overlay-1080p.png` | Pre-rendered PNG overlay (logo, lower-third) |

### 5.7 Test fixture storage strategy

Fixtures live in `tests/fixtures/` and are *not* checked into git (they're
too large — the 14 video clips alone are ~150 MB). Instead:

- A `tests/fixtures/manifest.json` file lists every fixture with its SHA-256
  hash, expected byte size, and download URL (S3 bucket or similar)
- The `npm run generate-test-assets` command (see §11) either downloads
  from the bucket or regenerates locally via ffmpeg
- CI runs `npm run generate-test-assets` as the first step of every test
  job (after `npm ci`)
- The manifest is checked into git; the fixtures themselves are not

Reference PNGs (`tests/fixtures/references/`) *are* checked into git
because they're small (~2 MB each, ~50 MB total) and need to be reviewed
in PRs (see §10).

---

## 6. WYSIWYG Verification

WYSIWYG ("What You See Is What You Get") is the architectural invariant
from Decision 6 of `00-master-spec.md`: "one engine, two entry points"
means the browser preview and the cloud render must produce identical
output. This is the *most important* test category in the project —
if WYSIWYG fails, users cannot trust the preview, and the product is
broken regardless of any other correctness.

WYSIWYG has three independent invariants: **state**, **pixel**, and
**audio**.

### 6.1 State WYSIWYG (Tier 3)

**Invariant:** For any `EngineCommand[]` sequence, applying the sequence
via the **direct API** (`engine.command.apply(cmd)`) must produce a
`SceneState` byte-identical to applying the same sequence via the **UI
path** (a keyboard shortcut or mouse interaction that produces the same
`EngineCommand`).

**Why:** the UI translation layer (React components, keyboard handler,
mouse handler) is a separate concern from the engine. If the UI wires
`Cmd+B` to call `splitElements({ splitTime: wrongValue })`, the engine
will produce wrong state. State WYSIWYG catches this by comparing the UI
path's output to the direct API's output.

**Test:**

```ts
test('state WYSIWYG: Cmd+B (split) == direct API call', async () => {
  // Path 1: direct API
  const engine1 = await createInteractiveEngine({
    project: loadProject('tests/fixtures/projects/simple-cut.json'),
    canvas: createTestCanvas(),
    audioContext: new AudioContext(),
  });
  await engine1.playback.seek(mediaTimeFromSeconds({ seconds: 5 }));
  await engine1.command.apply({
    type: 'split',
    params: { splitTime: mediaTimeFromSeconds({ seconds: 5 }), trackIds: null },
  });
  const state1 = engine1.scenes.getActiveScene().getState();

  // Path 2: keyboard shortcut
  const engine2 = await createInteractiveEngine({
    project: loadProject('tests/fixtures/projects/simple-cut.json'),
    canvas: createTestCanvas(),
    audioContext: new AudioContext(),
  });
  await engine2.playback.seek(mediaTimeFromSeconds({ seconds: 5 }));
  await page.keyboard.press('Meta+b');  // Cmd+B on macOS, Ctrl+B elsewhere
  await page.waitForFunction(() => window.__engine.scenes.getActiveScene().getState().version > 0);
  const state2 = await page.evaluate(() => window.__engine.scenes.getActiveScene().getState());

  // Bit-identical state
  expect(state1).toEqual(state2);
});
```

**Coverage:** every keyboard shortcut in the shortcut table (spec 16
§3, the 180-binding inventory) gets a state WYSIWYG test. Every mouse
interaction (drag, trim handle, marquee) gets one too. This is the bulk
of Tier 3 tests.

**Failure mode:** if state1 ≠ state2, the UI is producing a different
command than the direct API. The test failure artifact (see §13)
includes both states for diffing.

### 6.2 Pixel WYSIWYG (Tier 2)

**Invariant:** For any project + frame N, rendering via the **browser
interactive engine** (`createInteractiveEngine()`) must produce pixels
byte-identical to rendering via the **cloud render engine**
(`createRenderEngine()`).

**Why:** Decision 6 in `00-master-spec.md` says the engine has two entry
points that share the same code. If they drift — different shader
compile options, different texture formats, different color pipeline —
the user's preview will not match their final export. Pixel WYSIWYG is
the test that *proves* the two entry points share the same code path.

**Test:** see `12-testing-strategy.md` §7 for the canonical
implementation. The test loops over every test project (§5.3) and every
test frame (§5.4), renders via both engines, and asserts 0% pixel diff.

**Tolerance:** 0% for same-GPU comparisons (both engines on the same
NVIDIA runner). For cross-GPU comparisons (browser on Mac M2, cloud on
NVIDIA), use a per-platform reference set (§5.4) and 0% diff within
platform. Cross-platform diffs are a *known* drift source (GPU FP
rounding) and are tracked in §15.1.

**Failure mode:** if pixels differ, either (a) the two entry points
have drifted (renderer bug, not a test bug — file a P0 issue), or (b)
the renderer is non-deterministic (rarer; usually caused by uninitialized
memory in shaders). Triage per §13.

### 6.3 Audio WYSIWYG (cross-cutting)

**Invariant:** For any project, rendering audio via the **real-time
path** (`AudioContext`, used in browser interactive mode) must produce
PCM samples byte-identical to rendering via the **offline path**
(`OfflineAudioContext`, used in cloud render mode).

**Why:** audio rendering has two paths in the browser — `AudioContext`
for real-time playback (driven by the audio device clock) and
`OfflineAudioContext` for faster-than-real-time rendering (used in
cloud export). If they drift, the user's preview audio won't match
their exported audio. This is the audio equivalent of pixel WYSIWYG.

**Test:**

```ts
test('audio WYSIWYG: real-time == offline', async () => {
  const project = loadProject('tests/fixtures/projects/audio-mix.json');

  // Path 1: real-time AudioContext
  const realtimePcm = await renderAudioRealtime(project, {
    sampleRate: 48000,
    channels: 2,
    durationSec: computeTotalDuration(project),
  });

  // Path 2: OfflineAudioContext (faster-than-real-time)
  const offlinePcm = await renderAudioOffline(project, {
    sampleRate: 48000,
    channels: 2,
    durationSec: computeTotalDuration(project),
  });

  // Bit-identical PCM
  expect(realtimePcm.length).toBe(offlinePcm.length);
  for (let i = 0; i < realtimePcm.length; i++) {
    expect(realtimePcm[i]).toBe(offlinePcm[i]);
  }
});
```

**Tolerance:** 0 (bit-identical). If the two paths produce different
samples, either (a) the audio graph is constructed differently in the
two paths (bug — the audio graph builder must be shared code), or (b)
the audio worklet (SoundTouch varispeed) has different state in the two
paths (bug — worklet state must be deterministic from project state,
not from real-time clock).

**Failure mode:** if PCM differs, the audio export is broken. This is
a P0 bug — the user's preview will sound different from their exported
file.

### 6.4 When WYSIWYG tests run

State and audio WYSIWYG run on every PR; pixel WYSIWYG runs on every push
to `main` (self-hosted GPU is expensive — see §9.3) because they're
architectural invariants — a WYSIWYG break means the engine contract is
broken and no other test result matters.

- State WYSIWYG: Tier 3 job, `ubuntu-latest` runner, ~1 minute (every PR)
- Pixel WYSIWYG: Tier 2 job, self-hosted GPU runner, ~5 minutes (push to `main` only — see §9.2/§9.3)
- Audio WYSIWYG: cross-cutting job (see §2.2), `ubuntu-latest` runner (no GPU needed for
  `OfflineAudioContext`), ~1 minute (every PR)

### 6.5 What WYSIWYG does NOT verify

WYSIWYG verifies the *engine contract* (browser == cloud), not the
*correctness* of any individual feature. A feature can be implemented
wrong in *both* paths identically, and WYSIWYG will pass. Feature
correctness is verified by Tier 1 + Tier 2 tests against reference
outputs.

WYSIWYG is the **last line of defense** — it catches the failure mode
where the engine contract breaks. The first line of defense is per-spec
testing (Tier 1 + Tier 2) verifying that each feature produces correct
output *on its own*.

---

## 7. Property-Based Testing Strategy

### 7.1 Why property-based testing

Unit tests check *specific* inputs and outputs. They're good at catching
regressions in known cases, but bad at catching edge cases the test
author didn't think of. Property-based testing (via `fast-check`)
generates *random* inputs and verifies *invariants* — properties that
must hold for *all* inputs, not just the ones the test author thought of.

For NLE ops, property-based testing is essential because the state space
is huge (any combination of N tracks, M elements, any durations, any
positions) and manual case enumeration is impractical.

### 7.2 The invariant catalogue

Every NLE op must preserve the following invariants. These are the
*contract* of an NLE op — if any of them is violated, the op is buggy.

| # | Invariant | Applies to ops |
|---|---|---|
| 1 | **Preserves total duration** | Split, trim (non-ripple), roll, slip, slide, freeze-frame |
| 2 | **No overlapping elements after op** | All ops that modify element positions |
| 3 | **Source bounds respected** (`sourceStart ≥ 0`, `sourceStart + sourceDuration ≤ source.duration`) | Trim, slip, slide, rate-stretch, retime |
| 4 | **Locked tracks not modified** | All ops (locked tracks' elements are byte-identical before/after) |
| 5 | **Undo restores exact state** | All ops (undo returns to byte-identical pre-op state) |
| 6 | **Element IDs preserved** (existing elements keep their IDs after op) | All ops except delete |
| 7 | **Element IDs unique after op** (no two elements share an ID) | All ops including insert (insert must generate a fresh ID) |
| 8 | **No zero-duration elements** (every element has `duration > 0`) | All ops (trim cannot reduce duration to 0; split must produce two non-zero elements) |
| 9 | **Track type invariant** (video elements only on video tracks, audio only on audio) | Insert, move (cross-track move must respect track type) |
| 10 | **Ordering preserved** (adjacent elements on a track remain in the same relative order, modulo the op's intent) | Split, trim, roll, slip, slide, rate-stretch, retime, freeze-frame |
| 11 | **Ripple invariant** (ripple delete of an element with duration D shifts downstream elements' `startTime` by exactly -D) | Ripple delete, ripple insert |
| 12 | **Idempotency at boundaries** (split at existing boundary is a no-op; trim by 0 is a no-op) | Split, trim |
| 13 | **Coalescing invariant** (`previewElements({ updates })` followed by `commitPreview()` produces exactly one `TracksSnapshotCommand` on the undo stack, regardless of the number of updates) | Trim (mouse drag), move (mouse drag), all preview-based ops |

### 7.3 Arbitrary generators

To run property tests, we need generators for arbitrary `SceneState`,
arbitrary op params, and arbitrary ops:

```ts
// tests/helpers/arbitraries.ts

import fc from 'fast-check';
import { MediaTime, FrameRate } from '@/engine/types';

// Primitives
export const arbitraryMediaTime = fc.integer({
  min: 0,
  max: 100_000_000_000,  // 1M seconds at 120K ticks/sec
}).map((ticks) => ({ ticks }) as MediaTime);

export const arbitraryFrameRate = fc.oneof(
  fc.constant({ numerator: 30, denominator: 1 }),
  fc.constant({ numerator: 25, denominator: 1 }),
  fc.constant({ numerator: 24000, denominator: 1001 }),  // 23.976
  fc.constant({ numerator: 30000, denominator: 1001 }),  // 29.97
  fc.constant({ numerator: 60, denominator: 1 }),
);

export const arbitraryNonZeroMediaTime = fc.integer({
  min: 1,
  max: 100_000_000_000,
}).map((ticks) => ({ ticks }) as MediaTime);

// Tracks
export const arbitraryVideoElement = (mediaPool: Media[]) =>
  fc.record({
    id: fc.uuid(),
    mediaId: fc.constantFrom(...mediaPool.map((m) => m.id)),
    startTime: arbitraryMediaTime,
    duration: arbitraryNonZeroMediaTime,
    sourceStart: arbitraryMediaTime,
    sourceDuration: arbitraryNonZeroMediaTime,
    type: fc.constant('video') as fc.Arbitrary<'video'>,
  }).filter((el) =>
    el.sourceStart.ticks + el.sourceDuration.ticks <= mediaPool.find((m) => m.id === el.mediaId)!.duration.ticks
  );

export const arbitraryVideoTrack = (mediaPool: Media[]) =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1 }),
    locked: fc.boolean(),
    elements: fc.array(arbitraryVideoElement(mediaPool), { maxLength: 10 }),
  }).map((track) => sortElementsByStartTime(track));

// Scene state
export const arbitrarySceneState = (mediaPool: Media[]) =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1 }),
    isMain: fc.constant(true),
    settings: fc.record({
      fps: arbitraryFrameRate,
      canvasSize: fc.constant({ width: 1920, height: 1080 }),
      audioSampleRate: fc.constant(48000),
      audioChannels: fc.constant(2),
    }),
    tracks: fc.record({
      overlay: fc.array(arbitraryVideoTrack(mediaPool), { maxLength: 3 }),
      main: arbitraryVideoTrack(mediaPool),
      audio: fc.array(arbitraryVideoTrack(mediaPool), { maxLength: 3 }),
    }),
  });

// Op params
export const arbitrarySplitParams = (state: SceneState) =>
  fc.record({
    splitTime: arbitraryMediaTime,
    trackIds: fc.array(fc.uuid()).nullable(),
  });

export const arbitraryTrimParams = (state: SceneState) =>
  fc.record({
    elementId: fc.constantFrom(...allElementIds(state)),
    trimStart: fc.integer({ min: -100_000_000, max: 100_000_000 }),
    trimEnd: fc.integer({ min: -100_000_000, max: 100_000_000 }),
  });

// Meta: arbitrary op
export const arbitraryOp = (state: SceneState) =>
  fc.oneof(
    fc.record({ type: fc.constant('split'), params: arbitrarySplitParams(state) }),
    fc.record({ type: fc.constant('trim'), params: arbitraryTrimParams(state) }),
    fc.record({ type: fc.constant('rippleDelete'), params: arbitraryRippleDeleteParams(state) }),
    // ... etc for every op
  );
```

### 7.4 Property test pattern

Every property test follows the same pattern:

```ts
test('split preserves total duration', () => {
  fc.assert(
    fc.property(
      arbitrarySceneState(mediaPool),
      arbitrarySplitParams,  // Note: this is a function — depends on state
      (state, paramsFactory) => {
        const params = paramsFactory(state);
        const originalDuration = computeTotalDuration(state);
        const newState = splitOp(state, params);
        const newDuration = computeTotalDuration(newState);
        expect(newDuration).toBe(originalDuration);
      }
    ),
    { numRuns: 1000 }
  );
});

test('no overlapping elements after split', () => {
  fc.assert(
    fc.property(
      arbitrarySceneState(mediaPool),
      arbitrarySplitParams,
      (state, paramsFactory) => {
        const params = paramsFactory(state);
        const newState = splitOp(state, params);
        for (const track of allTracks(newState)) {
          for (let i = 0; i < track.elements.length - 1; i++) {
            const a = getElement(newState, track.elements[i]);
            const b = getElement(newState, track.elements[i + 1]);
            expect(mediaTimeAdd(a.startTime, a.duration)).toBeLessThanOrEqual(b.startTime);
          }
        }
      }
    ),
    { numRuns: 1000 }
  );
});

test('undo restores exact state', () => {
  fc.assert(
    fc.property(
      arbitrarySceneState(mediaPool),
      arbitraryOp,
      (state, opFactory) => {
        const op = opFactory(state);
        const engine = createTestEngine(state);
        engine.command.apply(op);
        engine.command.undo();
        const restored = engine.scenes.getActiveScene().getState();
        expect(restored).toEqual(state);  // byte-identical
      }
    ),
    { numRuns: 1000 }
  );
});
```

### 7.5 numRuns budget

- `numRuns: 1000` for fast invariants (preserves duration, no overlaps,
  source bounds) — completes in <5 seconds per property
- `numRuns: 100` for slow invariants that involve engine instantiation
  (undo restores state — each run creates a fresh engine) — completes
  in <30 seconds per property
- `numRuns: 5000` for high-value invariants on PRs to `main` (configured
  via `npm run test:property:thorough` — not on every PR)

### 7.6 Shrinking

`fast-check` automatically *shrinks* failing cases to the minimal
reproducing input. A failing property test produces output like:

```
Property failed after 47 tests
{ seed: -1234567890, path: "47:0:0:1", endOnFailure: true }
Counterexample: [{ startTime: { ticks: 0 }, duration: { ticks: 1 }, ... }]
Shrunk 12 times
Best counterexample: [{ startTime: { ticks: 0 }, duration: { ticks: 1 } }]
```

The test failure artifact (§13) saves the seed so the failing case can
be reproduced deterministically: `fc.assert(..., { seed: -1234567890 })`.

### 7.7 Property tests for non-NLE-op modules

Property testing is not limited to NLE ops. Other modules have
invariants too:

| Module | Invariant | Property test |
|---|---|---|
| 01 Core engine | `command.apply(undo(command.apply(state))) == state` | Undo is involutive |
| 03 Playback | `seek(t1); seek(t2); state.currentTime == t2` | Seek is idempotent |
| 03 Playback | `seek(t); state.currentTime == t` (within 1 frame) | Seek is accurate |
| 04 Renderer | `renderFrame(N) == renderFrame(N)` (no hidden state) | Renderer is pure |
| 04 Renderer | `renderFrame(buildFrameDescriptor(state, N))` produces pixels independent of prior renders | No texture leak |
| 06 NLE ops | (see §7.2 above) | Multiple |
| 07 Composition | `buildFrameDescriptor(state, t)` is pure (same state + t → same descriptor) | Composition is pure |
| 08 Color | `applyLUT(applyLUT(state, lut1), lut2) == applyLUT(state, composeLUTs(lut1, lut2))` (within tolerance) | LUT composition |
| 09 Project model | `parse(serialize(state)) == state` (round-trip) | Save/load is lossless |
| 10 FCPXML | `importFCPXML(exportFCPXML(state)) ≈ state` (semantic equivalence, not byte-identical due to FCPXML limitations) | FCPXML round-trip |

### 7.8 Property test files location

```
tests/unit/06-nle-ops/split.property.test.ts
tests/unit/06-nle-ops/trim.property.test.ts
tests/unit/06-nle-ops/ripple.property.test.ts
tests/unit/01-core-engine/undo.property.test.ts
tests/unit/04-renderer/purity.property.test.ts
tests/unit/09-project-model/round-trip.property.test.ts
...
```

The `*.property.test.ts` suffix makes them filterable: `npm run test:property`
runs only property tests; `npm test` runs unit + property together.

---

## 8. Performance Test Methodology

### 8.1 Why performance tests are correctness tests

For a video editor, performance is a *correctness* requirement. A 10fps
editor is unusable, regardless of whether the pixels are correct. A 500ms
scrub latency makes the editor feel broken even if every scrub produces
the right frame. Performance tests are *correctness tests with numeric
thresholds*.

### 8.2 Performance test inventory

| Test | What it measures | Threshold | Tier | Schedule |
|---|---|---|---|---|
| Playback FPS | Average FPS over 30-second playback | ≥28 fps (2-frame slack at 30fps target) | Tier 2 (Playwright) | PR + nightly |
| Dropped frames | Frames dropped during 30-second playback | <5 dropped | Tier 2 | PR + nightly |
| Scrub latency p50 | Median seek latency over 100 random seeks | <30ms | Tier 3 (UI) | PR + nightly |
| Scrub latency p95 | 95th percentile seek latency | <50ms | Tier 3 | PR + nightly |
| Scrub latency p99 | 99th percentile seek latency | <100ms | Tier 3 | Nightly only |
| Memory (4K editing) | `usedJSHeapSize` after 1-minute playback | <2GB | Tier 2 (Playwright) | Nightly |
| Memory (cloud render 8K) | `usedJSHeapSize` after 1-minute 8K render | <4GB | Cloud render | Nightly |
| 4K render time | Wall time for 5-minute 4K ProRes render | <10 minutes (2x realtime) | Cloud render | Nightly |
| 8K render time | Wall time for 1-minute 8K ProRes render | <30 minutes | Cloud render | Nightly |
| Engine boot time | Time from `createInteractiveEngine()` to first frame | <2 seconds | Tier 2 | PR |
| Project load time | Time from `loadProject()` to project fully loaded | <1 second for 100-clip project | Tier 1 (with mocked storage) | PR |
| FCPXML export time | Wall time for 100-clip project export | <2 seconds | Tier 1 | PR |

### 8.3 Performance test implementation patterns

#### 8.3.1 Playback FPS

```ts
test('playback maintains 30fps with 10-track project', async () => {
  await loadProject('tests/fixtures/projects/10-track-100-clip.json');
  await engine.playback.play();
  await new Promise((r) => setTimeout(r, 5000));  // play for 5 seconds
  await engine.playback.pause();

  const stats = engine.playback.getStats();
  expect(stats.averageFps).toBeGreaterThanOrEqual(28);  // 2-frame slack
  expect(stats.droppedFrames).toBeLessThan(5);
});
```

#### 8.3.2 Scrub latency

```ts
test('scrub latency p95 < 50ms', async () => {
  await loadProject('tests/fixtures/projects/10-track-100-clip.json');

  const latencies: number[] = [];
  for (let i = 0; i < 100; i++) {
    const time = mediaTimeFromSeconds({ seconds: Math.random() * 600 });
    const start = performance.now();
    await engine.playback.seek(time);
    await engine.playback.waitForSeekSettled();  // wait for decode + render
    const elapsed = performance.now() - start;
    latencies.push(elapsed);
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.50)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];

  expect(p50).toBeLessThan(30);
  expect(p95).toBeLessThan(50);
  // p99 threshold only enforced on nightly (see §8.2)
  if (process.env.PERF_TIER === 'nightly') {
    expect(p99).toBeLessThan(100);
  }
});
```

#### 8.3.3 Memory ceiling

```ts
test('memory stays under 2GB for 4K editing', async () => {
  await loadProject('tests/fixtures/projects/4k-multitrack.json');

  // Force GC if available (Chrome only, requires --js-flags='--expose-gc')
  if (typeof global.gc === 'function') {
    global.gc();
  }

  const before = await measureMemory();
  await engine.playback.play();
  await new Promise((r) => setTimeout(r, 60_000));  // play for 1 minute
  await engine.playback.pause();
  if (typeof global.gc === 'function') {
    global.gc();
  }
  const after = await measureMemory();

  expect(after.usedJSHeapSize).toBeLessThan(2 * 1024 * 1024 * 1024);  // 2 GB
  expect(after.usedJSHeapSize - before.usedJSHeapSize).toBeLessThan(
    500 * 1024 * 1024  // delta < 500MB (no leak)
  );
});

async function measureMemory() {
  // Prefer the new API; fall back to the deprecated one
  if (typeof (performance as any).measureUserAgentSpecificMemory === 'function') {
    // Requires COOP/COEP headers — see spec 12 §17.5 vitest.config.ts
    return (performance as any).measureUserAgentSpecificMemory();
  }
  if ((performance as any).memory) {
    return (performance as any).memory;
  }
  throw new Error('No memory measurement API available');
}
```

#### 8.3.4 Render time

```ts
test('4K cloud render completes in < 2x realtime', async () => {
  const project = loadProject('tests/fixtures/projects/4k-5min.json');
  const start = performance.now();
  await renderProject(project, { format: 'prores-422-hq' });
  const elapsed = performance.now() - start;

  // 5 min realtime = 300 seconds; allow 2x = 600 seconds
  expect(elapsed).toBeLessThan(600 * 1000);
});
```

### 8.4 Performance test scheduling

- **PR-scope perf tests** (run on every PR): engine boot, project load,
  FCPXML export, playback FPS (5-second sample, not 30-second). These
  catch gross regressions. ~2 minutes total.
- **Nightly perf tests** (run on schedule): full 30-second playback FPS,
  100-seek scrub latency (including p99), 1-minute memory ceiling, 4K +
  8K render time. ~30 minutes total. Run on the self-hosted GPU runner
  (real GPU, not lavapipe) so numbers are representative of user
  experience.
- **Performance regression dashboard**: nightly results are uploaded as
  JSON artifacts and tracked over time. A 10% regression in any metric
  triggers a notification (not a test failure — perf can drift with
  browser updates; we track trends, not absolute thresholds, for
  alerting).

### 8.5 Performance test reliability

Performance tests are inherently flaky (system load, GC pauses, browser
updates). Mitigations:

1. **Warmup**: discard the first 1 second of playback (let the JIT settle,
   let textures upload)
2. **Multiple samples**: run the test 3 times, take the median
3. **Generous thresholds**: 28fps target (not 30fps) for playback; 50ms
   threshold (not 33ms) for scrub — leaves slack for CI runner variance
4. **No parallelism**: performance tests run with `workers: 1` in
   Playwright (see spec 12 §17.4)
5. **No retries on nightly**: a flaky perf test on nightly is *signal*
   (something regressed or system is overloaded), not noise to suppress.
   PR-scope perf tests *do* retry (2 retries) to avoid blocking PRs on
   flaky runs
6. **GC exposure**: nightly runs use `--js-flags='--expose-gc'` so the
   test can call `global.gc()` and get deterministic heap measurements

### 8.6 What performance tests do NOT verify

- **Perceived smoothness** — a 30fps playback with a 200ms stutter every
  5 seconds will pass the FPS test but feel broken. Manual testing (§12)
  covers perceived smoothness.
- **Audio glitching** — audio dropouts are not captured by FPS tests.
  Audio WYSIWYG (§6.3) verifies *correctness*; perceived audio
  smoothness is manual testing.
- **Cold start** — engine boot time is measured, but the *perceived* cold
  start (loading the app, fetching fonts, initializing WebGPU) is harder
  to automate. Lighthouse or similar could be added later.

---

## 9. CI Integration

### 9.1 CI strategy

CI runs the three tiers + cross-cutting tests in separate jobs. Each job
runs on the cheapest runner that can execute it:

- **Tier 1** (engine unit tests): `ubuntu-latest`, no GPU needed, ~30s
- **Tier 2** (render tests): `ubuntu-latest` with software WebGPU
  (lavapipe) for PR-scope tests; self-hosted GPU runner for nightly
- **Tier 3** (UI tests): `ubuntu-latest`, no GPU needed (just DOM), ~5min
- **WYSIWYG pixel**: self-hosted GPU runner (real GPU required), ~5min
- **WYSIWYG audio**: `ubuntu-latest` (no GPU needed for
  `OfflineAudioContext`), ~1min
- **Performance**: self-hosted GPU runner, nightly only, ~30min
- **Cloud render 8K**: self-hosted GPU runner, nightly only, ~30min

### 9.2 CI job graph

```
on: push / pull_request
    │
    ├── job: tier1-engine          (~30s, ubuntu-latest, no GPU)
    │     └── npm run test:tier1
    │
    ├── job: tier2-render          (~10min, ubuntu-latest, lavapipe)
    │     └── npm run test:tier2
    │
    ├── job: tier3-ui               (~5min, ubuntu-latest, no GPU)
    │     └── npm run test:tier3
    │
    └── job: wysiwyg-audio          (~1min, ubuntu-latest, no GPU)
          └── npm run test:wysiwyg-audio

on: push to main (in addition to above)
    │
    └── job: wysiwyg-pixel          (~5min, self-hosted-gpu)
          └── npm run test:wysiwyg-pixel

on: schedule (nightly)
    │
    ├── job: performance            (~30min, self-hosted-gpu)
    │     └── npm run test:performance
    │
    ├── job: cloud-render-4k        (~10min, self-hosted-gpu)
    │     └── npm run test:render-4k
    │
    └── job: cloud-render-8k        (~30min, self-hosted-gpu)
          └── npm run test:render-8k

on: workflow_dispatch (manual)
    │
    └── job: regen-references       (~30min, self-hosted-gpu)
          └── npm run regen-references (see §10)
```

### 9.3 GitHub Actions workflow structure

The concrete YAML lives in `12-testing-strategy.md` §17.1 (the
canonical source for the workflow file). This spec defines the *structure*
of that workflow — which jobs, what scheduling, what runner labels, what
artifacts to upload on failure.

Key structural decisions (verified against the canonical YAML in spec 12
§17.1):

1. **Three jobs always run on PR**: `tier1-engine`, `tier2-render`,
   `tier3-ui`. Required checks.
2. **WYSIWYG pixel job** runs only on `main` (self-hosted GPU is
   expensive; don't burn it on every PR). Required check on `main`.
3. **WYSIWYG audio job** runs on every PR (cheap, no GPU). Required
   check.
4. **Nightly job** runs on schedule (`0 7 * * *` UTC, matching the canonical
   YAML in spec 12 §17.1) on self-hosted GPU. Uploads artifacts with
   `retention-days: 90` for trend analysis.
5. **Reference regeneration** is `workflow_dispatch` (manual trigger
   only). Never automated — regeneration is a deliberate decision (see
   §10).
6. **Artifact upload on failure** uses `actions/upload-artifact@v7`
   with `if: failure()` for PR/main jobs and `if: always()` for nightly
   (we want nightly artifacts even on success for trend analysis).

### 9.4 Runner labels

- `ubuntu-latest` — GitHub-hosted, no GPU, used for Tier 1, Tier 2
  (lavapipe), Tier 3, WYSIWYG audio
- `[self-hosted, linux, x64, gpu]` — self-hosted NVIDIA GPU runner,
  used for WYSIWYG pixel, performance, cloud render, reference regen
- `[self-hosted, macos, arm64, gpu]` — self-hosted Mac M2 (for
  cross-platform nightly)
- `[self-hosted, windows, x64, gpu]` — self-hosted Windows D3D12 (for
  cross-platform nightly)

Self-hosted runner setup is documented in spec 12 §17.2.

### 9.5 Test command npm scripts

The `package.json` must define these scripts (verified against the
canonical `playwright.config.ts` in spec 12 §17.4):

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:tier1": "vitest run --dir tests/unit",
    "test:tier2": "playwright test --project=chromium tests/integration --grep '\\.render\\.'",
    "test:tier3": "playwright test --project=chromium tests/integration --grep '\\.ui\\.'",
    "test:render": "npm run test:tier2",
    "test:ui": "npm run test:tier3",
    "test:property": "vitest run --dir tests/unit --grep '\\.property\\.'",
    "test:property:thorough": "NUM_RUNS=5000 vitest run --dir tests/unit --grep '\\.property\\.'",
    "test:wysiwyg": "npm run test:wysiwyg-pixel && npm run test:wysiwyg-audio",
    "test:wysiwyg-pixel": "playwright test tests/cloud-render/wysiwyg-pixel.test.ts",
    "test:wysiwyg-audio": "playwright test tests/cloud-render/wysiwyg-audio.test.ts",
    "test:performance": "playwright test tests/performance --workers=1",
    "test:render-4k": "playwright test tests/cloud-render/render-4k.test.ts",
    "test:render-8k": "playwright test tests/cloud-render/render-8k.test.ts",
    "test:nightly": "npm run test:performance && npm run test:render-4k && npm run test:render-8k",
    "test:smoke": "vitest run --dir tests/unit/smoke && playwright test --project=chromium tests/integration/smoke",
    "test:all": "npm run test:tier1 && npm run test:tier2 && npm run test:tier3 && npm run test:property",
    "regen-references": "node tests/fixtures/generate-references.mjs",
    "generate-test-assets": "node tests/fixtures/generate-assets.mjs"
  }
}
```

### 9.6 CI time budget

| Job | Time | Frequency | Runner cost |
|---|---|---|---|
| tier1-engine | ~30s | every PR | free (GitHub-hosted) |
| tier2-render (lavapipe) | ~10min | every PR | free |
| tier3-ui | ~5min | every PR | free |
| wysiwyg-audio | ~1min | every PR | free |
| **Total per PR** | **~16min** | | free |
| wysiwyg-pixel | ~5min | every push to main | self-hosted GPU |
| nightly-performance | ~30min | nightly | self-hosted GPU |
| nightly-render-4k | ~10min | nightly | self-hosted GPU |
| nightly-render-8k | ~30min | nightly | self-hosted GPU |
| **Total nightly** | **~75min** | | self-hosted GPU |

The 16-minute PR budget is acceptable for a project of this complexity.
Tier 2 (render) is the bottleneck; if it grows past 15 minutes, split
it into parallel shards (`playwright test --shard=1/4` etc.).

---

## 10. Reference Regeneration

### 10.1 When references must be regenerated

Reference PNGs (§5.4) must be regenerated when the renderer
*intentionally* changes. Examples:

- Color pipeline change (e.g., fixing a transfer function bug)
- Shader update (e.g., changing blend mode math)
- Composition algorithm change (e.g., fixing layer ordering)
- Canvas format change (e.g., `rgba10a2unorm` → `rgba16float`)
- New effect added that affects existing renders (rare — usually adds
  new fixtures, not changes existing ones)

References must NOT be regenerated when:

- A test fails due to a real bug (regenerate after the bug is fixed, not
  before)
- A GPU driver updates (this is the cross-platform tolerance contract,
  see §15.1)
- A browser updates (same)

### 10.2 The regeneration process

Regeneration is a **manual trigger** (`workflow_dispatch`), not
automated. The process:

1. **Engineer decides regeneration is needed** (e.g., after merging a
   color pipeline fix that intentionally changes render output)
2. **Engineer triggers** the `regen-references` workflow via the GitHub
   Actions UI (or `gh workflow run regen-references.yml`)
3. **Workflow runs** on the self-hosted GPU runner:
   - Checks out the repo
   - Runs `npm ci` + `npx playwright install`
   - Runs `node tests/fixtures/generate-assets.mjs` (ensures test clips
     exist)
   - Runs `node tests/fixtures/generate-references.mjs` — renders every
     test project at every test frame, saves new PNGs to
     `tests/fixtures/references/<platform>/`
   - Commits the new references to a branch (`refs/regen-<run_id>`)
   - Opens a PR via `peter-evans/create-pull-request@v8`
4. **Reviewer opens the PR**, sees the diff (PNG diffs are visual; the
   reviewer can use GitHub's image diff view or download the artifacts
   and diff locally with `pixelmatch`)
5. **Reviewer verifies** the new renders look correct (this is a
   *human* judgment — the new pixels should be *intentionally different*
   from the old ones, in the way the engineer expected)
6. **Reviewer merges the PR**; the new references are now canonical
7. **CI re-runs** Tier 2 tests on the next PR; they pass against the new
   references

### 10.3 The regeneration script

```js
// tests/fixtures/generate-references.mjs

import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PROJECTS = [
  'simple-cut',
  'multi-track-blend',
  'with-transitions',
  'with-color-grade',
  'with-lut',
  'with-varispeed',
  'with-varispeed-2x',
  'with-mask',
  'audio-mix',
  '4k-5min',
  '8k-1min',
];

const FRAMES = [0, 30, 100, 500, 1000];

const platform = process.env.PLATFORM || 'linux-nvidia';
const outputDir = `tests/fixtures/references/${platform}`;

async function main() {
  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: [
      '--enable-unsafe-webgpu',
      '--enable-features=Vulkan',
      '--ignore-gpu-blocklist',
      '--use-angle=vulkan',
      '--enable-dawn-features=allow_unsafe_apis,disable_adapter_blocklist',
    ],
  });

  const page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: { width: 1920, height: 1080 },
  });

  await page.goto('http://localhost:5173/test-harness');
  await page.waitForFunction(() => window.__engineReady);

  for (const project of PROJECTS) {
    await page.evaluate((p) => window.loadProject(`/tests/fixtures/projects/${p}.json`), project);
    await page.waitForFunction(() => window.__projectLoaded);

    for (const frame of FRAMES) {
      await page.evaluate((f) => window.seekToFrame(f), frame);
      await page.waitForFunction(() => !window.__seeking);

      const png = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: 1920, height: 1080 },
      });

      const filename = `${project}-frame-${frame}.png`;
      await writeFile(join(outputDir, filename), png);
      console.log(`Wrote ${filename}`);
    }
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### 10.4 Regeneration safety rails

- **Never auto-merge** the regen PR. A human must verify the visual diff
  before merging.
- **The regen PR includes a diff report** (auto-generated) listing every
  changed PNG with its old vs new SHA-256 and the pixel diff percent
  (via `pixelmatch`). This makes it easy to spot unexpected changes
  (e.g., a change that was supposed to affect only `simple-cut` but
  actually affected all projects).
- **Regen runs on the same GPU model** that the nightly tests run on.
  If the nightly matrix includes `linux-nvidia`, `macos-m2`, and
  `windows-d3d12`, regeneration must be run on all three (separately,
  via three `workflow_dispatch` runs with `PLATFORM=<platform>` env).
- **The regen script is idempotent**: running it twice with no renderer
  change produces byte-identical PNGs (modulo GPU FP non-determinism,
  which is rare but possible; mitigated by `--enable-dawn-features=...`
  disabling unsafe optimizations).

### 10.5 What happens if regeneration is skipped

If a renderer change is merged without regenerating references:

1. The next Tier 2 CI run on `main` fails (pixel diff exceeds tolerance)
2. The failure includes the actual vs expected PNGs in the artifact
3. The engineer who merged the change must either:
   - Revert the change (if unintentional)
   - Trigger regeneration (if intentional)
4. Until the failure is resolved, all PRs into `main` are blocked (Tier
   2 is a required check on `main`)

This is intentional: it forces engineers to think about reference
regeneration as part of any renderer change, rather than as an
afterthought.

---

## 11. Test Asset Generation

### 11.1 The asset generation pipeline

Test assets (§5) are generated by `node tests/fixtures/generate-assets.mjs`,
invoked as `npm run generate-test-assets`. The script:

1. Checks each asset against `tests/fixtures/manifest.json` (SHA-256 hash)
2. If the asset exists locally and the hash matches, skips it
3. If the asset is missing or the hash doesn't match, either:
   - Downloads from the asset bucket (if `ASSET_BUCKET_URL` env is set)
   - Or regenerates via ffmpeg (if ffmpeg is available and the asset is
     ffmpeg-generatable)
4. Verifies the final asset hash matches the manifest
5. Exits non-zero on any failure

### 11.2 What the script generates

The script generates (in order):

1. **5 solid-color 1080p30 H.264 clips** (red, green, blue, white, black)
2. **2 mid-gray clips** (50% gray, 18% gray)
3. **3 gradient variants** (horizontal, vertical, diagonal)
4. **SMPTE bars** (HD 1080p + SD 480p)
5. **5 10-bit variants** (red, green, blue, white, black at 10-bit)
6. **2 HDR clips** (PQ white, HLG white)
7. **6 sine tones** (440Hz, 1000Hz, 100Hz, 10000Hz, white noise, pink noise)
8. **1 chirp** (20Hz → 20kHz sweep)
9. **2 stereo pan test clips** (left-only, right-only)
10. **6 LUTs** (identity, swap-rb, invert, gamma-2.2, s-log3-to-rec709, large-65)
11. **2 fonts** (Inter, RobotoMono)
12. **1 overlay PNG** (1080p)
13. **All test project JSON files** (16 projects, hand-authored — these
    *are* checked into git, not generated by this script, but the script
    validates them against the schema)

### 11.3 The manifest

`tests/fixtures/manifest.json` lists every asset with:

```json
{
  "version": 1,
  "assets": [
    {
      "name": "10s-red-1080p.mp4",
      "path": "tests/fixtures/videos/10s-red-1080p.mp4",
      "sha256": "abc123...",
      "size": 27101,
      "generator": "ffmpeg -f lavfi -i color=c=red:s=1920x1080:r=30:d=10 -c:v libx264 -pix_fmt yuv420p -y tests/fixtures/videos/10s-red-1080p.mp4",
      "bucketUrl": "https://assets.example.com/test-fixtures/v1/10s-red-1080p.mp4"
    }
  ]
}
```

The manifest is the *single source of truth* for what assets should exist.
CI fails if any asset's hash doesn't match the manifest (catches
corruption, partial downloads, accidental regeneration with wrong
params).

### 11.4 Versioning the manifest

When a test asset intentionally changes (e.g., we switch from
`yuv420p` to `yuv420p10le` for a clip), the manifest version is
bumped (`"version": 1` → `"version": 2`), and the old asset's hash is
moved to a `"deprecated"` list. CI removes deprecated assets on the
next run to avoid stale fixtures.

### 11.5 ffmpeg verification

All ffmpeg commands in the generator script are verified working in
spec 12 §15 (the audit-verified command set). The audit found two
bugs in the original commands (see `12-testing-strategy.audit.md`):
hex color format was RGB not BGR (§14.B), and `sine` source defaults
to mono not stereo (§15.D). Both are fixed in the current generator
script.

---

## 12. Manual Test Matrix

Some tests cannot be automated because they require human perception,
licensed third-party software, or calibrated hardware. These tests are
run manually on a defined schedule.

| # | Test | Tool | Frequency | Owner | Pass criteria |
|---|---|---|---|---|---|
| M1 | FCPXML export opens in Final Cut Pro | FCP 11+ | Before each release | QA | Project loads with no errors; timeline structure matches source; clips play in sync |
| M2 | FCPXML export opens in DaVinci Resolve | DaVinci Resolve 19+ | Before each release | QA | Project loads; timeline structure matches; color metadata respected |
| M3 | FCPXML export opens in Premiere Pro | Premiere Pro 2024+ | Before each release | QA | Project loads; timeline structure matches |
| M4 | FCPXML round-trip (export from FCP → import to our editor) | FCP 11+ | Before each release | QA | Imported project matches original within tolerance (FCPXML lossy — see spec 10 §11) |
| M5 | Color accuracy on calibrated display | Calibrated monitor (e.g., X-Rite i1Display calibrated) | Monthly | Colorist | 18% gray renders at correct luminance; SMPTE bars match reference; skin tones look natural |
| M6 | Audio accuracy on studio monitors | Studio monitors (e.g., Genelec) in treated room | Monthly | Audio engineer | 440Hz tone is in tune; pink noise sounds flat; stereo pan is correct |
| M7 | HDR display output (PQ) | HDR-capable display (e.g., LG OLED, Sony X300) | When HDR features change | Colorist | Highlights reach 1000 nits; shadows are clean; no banding in gradients |
| M8 | HDR display output (HLG) | HDR-capable display | When HDR features change | Colorist | Same as M7 but for HLG path |
| M9 | Perceived playback smoothness | Human reviewer on a 60Hz+ display | Before each release | QA | No visible stutters during 1-minute playback; scrubbing feels responsive |
| M10 | Cross-browser smoke test | Chrome, Edge, Brave, Firefox, Safari (where supported) | Before each release | QA | App boots; user can load a project; playback works; basic editing works |
| M11 | Keyboard shortcut conflicts | Human reviewer on macOS + Windows + Linux | When shortcuts change | QA | No conflicts with OS-level shortcuts (e.g., Cmd+H on macOS hides window — our shortcut must not collide) |
| M12 | Accessibility audit | Screen reader (VoiceOver, NVDA) + keyboard-only nav | Before each release | QA | Timeline is navigable via keyboard; ARIA labels are correct; focus management is correct |

### 12.1 Manual test ownership

Every manual test has an **Owner** (a role, not a person — the role
persists across team changes). The owner is responsible for:

- Running the test on the defined schedule
- Filing issues for any failures
- Updating the pass criteria as the product evolves
- Documenting the procedure (in `/tests/manual/<test-id>.md`)

### 12.2 Manual test reporting

Manual test results are tracked in a spreadsheet (or project management
tool) with columns: Test ID, Run date, Runner, Result (pass/fail), Notes,
Issue link. A run is "release-blocking" if any of M1–M4, M9, M10 fail
(FCPXML round-trip + perceived smoothness + cross-browser).

### 12.3 Why these can't be automated

- **M1–M4 (FCPXML round-trip)**: FCP/DaVinci/Premiere are licensed
  desktop apps with no headless mode. They could be automated via
  AppleScript / COM / xdotobot, but the maintenance burden exceeds the
  value (these tests run before releases, not on every PR).
- **M5–M8 (color/audio/HDR accuracy)**: perceptual quality cannot be
  measured by pixel diff alone. A pixel can be "correct" by the math
  but "wrong" by perception (e.g., a slightly-too-saturated red looks
  wrong even if it's within tolerance).
- **M9 (perceived smoothness)**: FPS tests catch gross regressions, but
  subtle stutters (e.g., a 50ms pause every 5 seconds) feel broken even
  if FPS is 30 average. Human perception catches this.
- **M10 (cross-browser)**: we don't have CI runners for every browser
  (especially Safari, which requires macOS). Cross-browser is manual
  for now; could be automated via BrowserStack later if needed.
- **M11 (keyboard conflicts)**: OS-level shortcut handling is hard to
  automate (Playwright runs in a sandbox without OS-level shortcuts).
- **M12 (accessibility)**: screen reader output is not machine-readable
  in a way that's easy to assert on. Manual audit is the standard.

---

## 13. Test Failure Triage

### 13.1 The triage process

When a test fails:

1. **Save artifacts immediately** — the CI workflow uploads:
   - Actual screenshot (`tests/artifacts/<test>/screenshot-actual.png`)
   - Expected screenshot (`tests/artifacts/<test>/screenshot-expected.png`)
   - Pixel diff (`tests/artifacts/<test>/screenshot-diff.png`, only on failure)
   - Console log (`tests/artifacts/<test>/console.log`)
   - Network log (`tests/artifacts/<test>/network.log`)
   - Timeline state (`tests/artifacts/<test>/timeline-state.json`)
   - Playwright trace (`tests/artifacts/<test>/trace.zip`, on retry)
2. **Categorize the failure**:
   - **Regression** — the renderer or engine changed intentionally; the
     test is correct, the reference is stale
   - **Flaky** — the test passes on retry; the failure was timing-related
     (GPU init race, animation frame timing)
   - **Real bug** — the test is correct, the code is wrong; file an
     issue
   - **Test bug** — the test itself is wrong (wrong assertion, wrong
     fixture); fix the test
3. **Take action based on category** (see §13.2–13.5)

### 13.2 Regression: regenerate references

If the failure is a regression (renderer changed intentionally):

1. Trigger reference regeneration per §10
2. Review the PR (does the new render look correct?)
3. Merge the regen PR
4. Re-run the failing test job — it should pass against the new references
5. Add a note to the original PR explaining why references were regenerated

### 13.3 Flaky: increase determinism

If the failure is flaky (passes on retry):

1. **Identify the race** — look at the trace (Playwright traces are
   excellent for this; see `trace: 'on-first-retry'` in spec 12 §17.4)
2. **Add a wait** — usually the test is racing the engine:
   - ❌ `await new Promise((r) => setTimeout(r, 100));` — fragile, slow
   - ✅ `await page.waitForFunction(() => window.__engineReady);` —
     deterministic, fast
3. **Add a retry** — Playwright's `retries: 2` (already configured in
   spec 12 §17.4) handles most flakiness. Only add explicit `test.retry()`
   for known-flaky cases (e.g., GPU init on cold start)
4. **Rewrite for determinism** — if the race is structural (the test
   depends on timing), rewrite the test to not depend on timing. E.g.,
   instead of "play for 5 seconds and check FPS", use "render 150 frames
   synchronously and check total time"
5. **Mark as known-flaky** — if the test is fundamentally flaky (e.g.,
   cross-GPU pixel diff), add `test.fixme()` with a comment pointing to
   the open issue, so it doesn't block PRs but still runs for visibility

### 13.4 Real bug: file issue and fix

If the failure is a real bug:

1. File a GitHub issue with:
   - Test name and failure message
   - Link to the failing CI run
   - Artifact bundle (auto-attached by CI)
   - Minimal reproduction (if you can extract one)
2. Assign priority:
   - **P0**: WYSIWYG break, broken core feature, broken build
   - **P1**: broken secondary feature, performance regression >20%
   - **P2**: minor feature, perf regression <20%
3. Fix the bug
4. Add a regression test (a new test that would have caught the bug)
5. Verify the original failing test now passes

### 13.5 Test bug: fix the test

If the test itself is wrong (wrong assertion, wrong fixture, testing
the wrong thing):

1. Fix the test
2. Add a comment explaining what was wrong (so future readers don't
   reintroduce the same mistake)
3. Verify the fix doesn't mask a real bug (run the test against the
   buggy version if possible — it should fail there too, otherwise
   the test was never catching what it claimed)

### 13.6 Triage decision tree

```
Test failed.
│
├── Does it pass on retry (retries: 2)?
│   ├── YES → Flaky
│   │   ├── Identify race → fix
│   │   └── If structural → test.fixme() with issue link
│   └── NO → Continue
│
├── Was the renderer or engine intentionally changed recently?
│   ├── YES → Regression
│   │   ├── Trigger reference regen (§10)
│   │   └── Review and merge regen PR
│   └── NO → Continue
│
├── Does the test assertion match the documented behavior?
│   ├── NO → Test bug
│   │   ├── Fix the test
│   │   └── Verify the fix doesn't mask a real bug
│   └── YES → Real bug
│       ├── File issue (P0/P1/P2)
│       ├── Fix the bug
│       └── Add regression test
```

### 13.7 Artifact retention

- PR-scope artifacts: `retention-days: 30` (default for actions/upload-artifact)
- Nightly artifacts: `retention-days: 90` (for trend analysis)
- Regen PR artifacts: `retention-days: 90` (so reviewers can compare
  across multiple regen runs)

---

## 13A. Round-8 Testability Additions — Facet Coverage & NFR Recipes (v1.1)

> This section is the Round-8 answer to the umbrella requirement: **every spec facet — functional and non-functional — has a tier assignment, a programmatic verification method, and a pass criterion.** The §3.1 matrix covers the feature-level view (Rounds 1-6); this section covers the Round-7/8 facet additions (wire protocol, seam, absorbed timeline semantics, UI shell v1.1) and the NFR verification recipes (00-master §6A). Together: §3.1 + §13A.7 + each per-spec `## Testing` section = the complete coverage contract. **A facet with no row anywhere is a spec bug** — the per-spec author checklist (§14.4) enforces this at authoring time.

### 13A.1 NFR verification recipes (00-master §6A's test hooks)

Each NFR budget → a concrete, CI-runnable measurement. NFR tests run in the nightly job (§9.3) + the shell-mount smoke subset per-PR; budgets are pass/fail, not advisory.

| NFR (00 §6A) | Recipe | Tier / job | Pass criterion |
|---|---|---|---|
| First contentful paint < 1 s (empty project) | Playwright: `page.goto('/empty')` → collect `PerformanceObserver` `paint` entries (`first-contentful-paint`) | T3 smoke, per-PR | median of 5 runs < 1,000 ms on the CI runner class (documented baseline; local numbers are diagnostic) |
| Time-to-interactive < 3 s | Same page; `performance.now()` at the first successfully dispatched no-op command after `window.__engineReady` | T3 smoke, per-PR | median of 5 < 3,000 ms |
| Timeline interaction 60 fps @ 1080p, 50 clips, drag in progress | Scripted drag (spec 16 Pattern 4 mechanics): dispatch synthetic mousemove at 60 Hz for 3 s; sample `requestAnimationFrame` delta histogram | T2 frame-sampling, nightly | p95 frame delta < 20 ms AND zero frames > 100 ms (dropped-frame census, not average FPS) |
| Viewer render latency (scrub) < 2 frames | `seek` → await presented-frame callback; measure ticks between dispatch and presentation | T2, nightly | median < 2 × frame duration at project fps |
| Keyboard dispatch < 16 ms | T3: keydown → `apply()` resolution timing via the command-middleware hook | T3, per-PR (smoke subset) | p95 < 16 ms on the runner class |
| Memory ceiling < 4 GB @ 50-clip project | `page.evaluate(() => performance.memory.usedJSHeapSize())` sampled after load + 60 s of scripted scrubbing (Chromium-only API; gate on availability) | T2, nightly | usedJSHeapSize < 4 GB (Decision 6's renderer-process budget is the hard ceiling) |
| Accessibility floor (WCAG 2.2 AA) | §13A.2 | T3, per-PR (axe) + per-release (manual) | zero axe violations on `critical`/`serious` + spot assertions pass |
| Error-path discipline | §13A.4 error-path census (T1) | T1, per-PR | every `CommandError` code in spec 15 §6.3's registry has ≥ 1 triggering test; a coverage script (codelist × grep of test IDs) enforces it |
| Persistence robustness | Fixture battery: for each of spec 09 §11's fixtures (corrupted / old-version / sanitized), `loadProject` → assert `{ok:true}` + warnings array (never throws) | T1, per-PR | all fixtures hydrate with expected warning sets |

**Reliability rules:** NFR tests follow §8.5's discipline (median-of-N, documented runner class, no timing-fragile single runs). A budget regression is triaged as a **real bug** (§13.4), not flakiness, unless the run-to-run variance itself exceeds 20% (then the measurement is the bug).

### 13A.2 Accessibility spot suite (T3 — spec 18 §11's floor)

- **Automated (per-PR)**: `@axe-core/playwright` against the shell with (a) empty project, (b) sample project loaded (§13A.6's fixture), (c) mid-drag state (frozen overlays). Fail on any `critical`/`serious` violation. Contrast checks sample the §18 §9 token pairs (computed styles vs their backgrounds), not just DOM roles.
- **Spot assertions (per-PR, plain Playwright — no SR required)**: F6 cycles the six regions and Shift+F6 reverses (focus-trace assertion); inspector/scene tablists pair `aria-controls`/`role=tabpanel`; media-pool grid moves focus via arrow keys with `aria-activedescendant`; every §18 §4.9 menu opens via Shift+F10 and restores focus on Escape; slider controls expose `aria-valuetext` in TC format; the viewer canvas `aria-label` updates at ≤ 1 Hz during playback (sampled 2 s); `prefers-reduced-motion: reduce` emulation zeroes computed transition durations; state rows per panel are reachable and announced.
- **Manual (per release)**: NVDA + VoiceOver smoke pass over the §18 §11 checklist (checklist lives in the release runbook; failures file issues, not waivers).

### 13A.3 Absorbed timeline-semantics fixtures (T1 — opencut-timeline M5/M16 distilled)

Vitest fixtures pinning the Round-8 absorbed semantics (spec 05 §8.3 contract notes, §9, §14.5A; spec 06 §5.2A):

| Fixture | Asserts | Source evidence |
|---|---|---|
| Zero-anchor: empty main | first element lands at exactly ZERO (requested start ignored) | spec 05 §14.5A rule 1; OT M5 |
| Zero-anchor: earlier-than-earliest | requested start < earliest element → clamped to ZERO; timeline never gains a leading gap | rule 2 |
| Zero-anchor: sole-element group-move | clamped at 0; raw `move` escapes | rule 3 |
| Insert startTime-override | first element at requested start, others keep relative offsets, element's own `startTime` field ignored; `CommandResult.data` carries the ACTUAL landed start | rule 4 |
| Drag threshold boundary | pointer delta of exactly 5 px does NOT start a drag (strict `>`); 6 px does | spec 05 §8.3 note 2; OT M16 |
| Snap threshold screen-space | threshold ticks = `(10 px / pps) × 120,000`; closest-wins with earlier-time tie-break; dragged element's own edges excluded | spec 05 §9; OT M4 |
| Coordinate-space | `elementRectLeft` injected from `getBoundingClientRect().left`; viewport-space pointer math never mixes with scroll-space | spec 05 §8.3 note 1 |
| Mixed A/V drag group | rejected atomically (no partial move) | note 3 |
| Trim NOOP vs rejection | clamped-to-zero delta → `ok:false` + `NOOP` code (not TRIM_BEYOND_SOURCE, not silent success) | spec 06 §5.2A |

### 13A.4 Wire-protocol conformance suite (T1/T2 — spec 15's programmatic gate)

1. **Schema sweep (T1)**: for each of the 78 union members — a valid example round-trips through the spec 15 §11 Zod schemas; a deliberately-invalid variant fails with the expected issue path. The 78 examples are generated from spec 15 §5's example table (single source, no test-local forks).
2. **Error-path census (T1)**: every code in §6.3's registry (including `NOOP`, the Round-8 addition) is triggered by at least one test; the census script fails if a registered code has zero triggering tests (§2.5 rule 8).
3. **Transaction semantics (T1)**: `CommandBatch` atomicity — mid-batch failure rolls back to the pre-batch snapshot exactly; eviction is suspended during the batch; undo/redo are rejected inside a batch; a rolled-back batch clears the redo stack (spec 15 §7.1A, absorbed from opencut-timeline's three-round-verified behavior).
4. **Intra-batch overlap guard (T1)**: an insert batch whose members overlap each other fails with `OVERLAP_REJECTED` even though each member alone would pass (spec 06 §5.9's Round-8 constraint).
5. **Determinism replay (T1)**: same `(ProjectJSON, EngineCommand[])` → byte-identical `SceneState` across two runs with `idSeed` fixed (spec 15 §1.1 / §10.4); the engine's deterministic-id counter is reset between runs (the OT `resetIdCounterForTests` pattern is the approved mechanism).
6. **State-change envelope (T2)**: every mutating command's success result carries a `stateChange` payload consistent with the post-state snapshot (the delta IS the spec's multi-consumer sync mechanism — asserted, not assumed).

### 13A.5 Seam adapter property tests (T1 — spec 14 P1's mandatory deliverable)

Properties (fast-check, 1,000 runs each in the nightly, 100 in PR-scope):

- `fromFlat(toFlat(tracks))` ≡ `tracks` (modulo stable ids) — section membership, order, and the singleton-main invariant preserved
- `toFlat(fromFlat(data))` ≡ `data` (modulo stable ids) — flat ordering preserved
- **Taxonomy warning path**: 5-kind TrackType input maps to the 3-kind wire taxonomy with `text/graphic/effect → overlay` + a warning recorded (never data loss, never a crash)
- **Never-loss invariant**: total element count is preserved through every round-trip (the cheap oracle that catches silent drops — the engine's pre-4D-A persistence silently dropped image/adjustment clips; this property is the regression test for that class)

### 13A.6 UI shell v1.1 facet tests (T3 — spec 18 v1.1)

- **State rows**: per panel, drive to empty/loading/error/noresult states (fixture-driven) and assert `shell-<panel>-state-<s>` presence + CTA wiring (the CTA click emits the mapped command).
- **Context menus**: each of the five menus opens via right-click AND Shift+F10; every item emits its mapped command (or UI-store mutation); focus restores on Escape.
- **Save chip**: simulate spec 09 §6.1's autosave events (dirty → flushing → flushed → failed) and assert the chip's four presentations + retry emits `saveProject`.
- **Toast conventions**: success auto-dismisses in ~4 s (assert removal), error persists; max-3 stacking; `role` correctness per class.
- **Cursor grammar**: one spot-check per §18 §5A class via computed style on synthetic hover.
- **Perf smoke**: the §13A.1 per-PR subset (first paint, TTI, keyboard dispatch).
- **Sample project**: loads via one command path (`loadProject` with the committed fixture); doubles as the T3 fixture for most rows above (§5.3's committed-asset rule).

### 13A.7 Round-8 facet coverage matrix

Every facet added or materially amended in Rounds 7-8, with its verification. (Legend and tier columns as §3.1; "F/NF" = functional / non-functional.)

| Facet | Source spec | F/NF | Tier | Programmatic verification | Pass criterion |
|---|---|---|---|---|---|
| 78-command union (schema validity) | 15 §4 | F | T1 | §13A.4.1 schema sweep | 78/78 round-trip; invalid variants fail |
| Error-path registry (incl. NOOP) | 15 §6.3 | F | T1 | §13A.4.2 census | zero untriggered codes |
| Batch transactions (atomic/rollback/redo-clear) | 15 §7.1A | F | T1 | §13A.4.3 | all four semantics asserted |
| Intra-batch overlap guard | 06 §5.9 | F | T1 | §13A.4.4 | overlapping batch rejected |
| Determinism replay | 15 §1.1 | F | T1 | §13A.4.5 | byte-identical states |
| stateChange envelope | 15 §6 | F | T2 | §13A.4.6 | payload ≡ post-snapshot delta |
| Export commands (FCPXML/master/frame) | 15 §4.3.74-76 | F | T1/T3 | artifact in `CommandResult.data` + Deliver-page button test (spec 18 §12) | round-trip file + button-emits-command |
| RenameProject/DeleteProject | 15 §4.3.77/78 | F | T1 | schema sweep + manager round-trip | project list state consistent |
| TransitionSpec 2-layer model | 07 §6.1A, 15 §11 | F | T1 | Zod schema + TS interface conformance | both layers validate independently |
| SceneTracks ↔ flat seam | 14 P1, 00 D11 | F | T1 | §13A.5 property tests | both identity laws + never-loss |
| Zero-anchor semantics (4 rules) | 05 §14.5A | F | T1 | §13A.3 fixtures | all four rules pinned |
| Drag threshold / coordinate-space / mixed-group | 05 §8.3 | F | T1/T3 | §13A.3 + boundary test at 5 px | strict-`>` boundary holds |
| Snap threshold (screen-space, closest-wins) | 05 §9 | F | T1 | §13A.3 fixture | formula + tie-break pinned |
| Trim shape per layer (wire single / UI group) | 06 §5.2A | F | T1/T3 | wire: schema; UI: controller emits batch-of-N trims as one undo step | layer mapping asserted both sides |
| Ripple decomposition (convenience → delete{ripple}) | 06 §5.4 | F | T1 | convenience op emits exactly the wire decomposition | one wire shape only |
| Sync-lock propagation | 06 §6 | F | T1 | engine-reference port tests (property: locked tracks' deltas preserved) | invariant holds across ripple ops |
| UI shell panels + gestures | 18 §4/§5 | F | T3 | §18 §12 suite (~60 tests) | contract rows green |
| Context menus (5) | 18 §4.9 | F | T3 | §13A.6 | both open routes + command mapping |
| Per-panel state rows | 18 §4.2 table | F | T3 | §13A.6 | all rows render + CTA wired |
| Error & toast presentation | 18 §6.4 | F | T3 | §13A.6 | class → presentation asserted |
| Save-status chip | 18 §6.3 | F | T3 | §13A.6 | event-paired |
| Cursor grammar (16 classes) | 18 §5A | F | T3 | §13A.6 spot rows | spot checks green |
| Fallback source-preview | 18 §4.3 | F | T3 | double-click pool asset → `<video>` swap + program canvas restore | no timeline state touched (zero commands) |
| Sample project | 18 §4.10 | F | T1/T3 | loads via `loadProject`; shared fixture | one fixture, tests never fork it |
| Keyboard bindings (~180) | 16 §3 | F | T3 | per-binding Pattern-1/2 tests (existing §3.1 row) | parity + schema equality |
| Ins/out-as-setLoop-halves | 16 §3.4 note | F | T3 | mark-in/out/clear emit `setLoop` halves; clear-out clears `end` | the reference-bug regression case |
| NFR: first paint / TTI / dispatch / fps / latency / memory | 00 §6A | NF | T2/T3 | §13A.1 recipes | budgets met on runner class |
| NFR: a11y floor | 00 §6A, 18 §11 | NF | T3 | §13A.2 | zero critical/serious + spot assertions |
| NFR: error-path discipline | 00 §6A | NF | T1 | §13A.4.2 | census green |
| NFR: persistence robustness | 00 §6A, 09 §11 | NF | T1 | §13A.1 fixture battery | hydrate-with-warnings, never crash |
| Reference-repo re-tiering (engine 144, OT 136) | 19 §12 | NF (process) | — | both suites re-tier into T1/T2 per §2.1; count discipline (declared == scraped) | zero count drift |

**Coverage-gap check (the enforcement rule):** a spec facet introduced by any future round must land in this matrix (or §3.1) in the same PR that introduces it — the §14.4 author checklist gains this as step 0. The 00-master §6A NFR table and this matrix cross-reference each other bidirectionally; neither may gain a row without the other.

---

## 14. Relationship to Per-Spec Testing Sections

### 14.1 The contract

Every per-spec from 01 through 12 must have a `## Testing` section
following the template in §4. The section is the per-spec's
*implementation* of the testing methodology defined in this spec.

The per-spec section is **short** (~50–150 lines). It does not re-explain
the methodology; it references this spec and lists the specific tests
for that module.

### 14.2 Spec-by-spec mapping

Process specs 13-17 (scout plan, phases, wire protocol, keyboard, test
plan) carry their own test content inline (e.g. this spec's §18) and are
exempt from the §4 template.

| Spec | Module | Matrix rows (from §3) | Per-spec `## Testing` location |
|---|---|---|---|
| 01 | Core engine | Undo/redo, Project save/load, Worker lifecycle | `01-core-engine.md` `## Testing` (≈2108) |
| 02 | Workers & threading | Worker lifecycle, OPFS persistence | `02-workers-threading.md` `## Testing` (≈2493) |
| 03 | Playback engine | Playback frame accuracy, Scrub latency, Varispeed | `03-playback-engine.md` `## Testing` (≈2371) |
| 04 | Renderer & color | Color space conversion, Transfer functions, YUV/RGB, Multi-track blend, Opacity, Masks | `04-renderer-color.md` `## 17. Testing` (≈2084) |
| 05 | Timeline | Keyboard shortcuts, Mouse interactions, Drag-and-drop | `05-timeline.md` `## Testing` (≈1428) |
| 06 | NLE ops | Split, Trim, Ripple, Roll, Slip, Slide, Delete, Insert, Rate stretch, Retime, Freeze frame, Range removal | `06-nle-ops.md` `## Testing` (≈2908) |
| 07 | Composition | Multi-track blend, Transitions, Masks | `07-composition.md` `## Testing` (≈1655) |
| 08 | Color grading | Color wheels, Curves, LUT, Qualifier, Scopes | `08-color-grading.md` `## 19. Testing` (≈2056) |
| 09 | Project model | Project save/load, Project schema migration, OPFS persistence | `09-project-model.md` `## Testing` (≈2465) |
| 10 | FCPXML export | FCPXML export, FCPXML import (manual) | `10-fcpxml-export.md` `## Testing` (≈1863) |
| 11 | Cloud render | Cloud render WYSIWYG, Memory ceiling (8K), Render time (4K, 8K) | `11-cloud-render.md` `## Testing` (≈2385) |
| 12 | Testing infrastructure | (this spec references 12; 12 references this spec) | `12-testing-strategy.md` `## Testing` (≈2362) |
| 18 | UI shell | UI shell panels (row above) | `18-ui-shell.md` §12 (Tier 3 shell suite) |

### 14.3 Cross-references

- This spec's §3 matrix → per-spec `## Testing` section says "Matrix row: X"
- This spec's §4 template → per-spec `## Testing` section uses the template
- This spec's §5 fixtures → per-spec `## Test assets` subsection lists
  the specific fixtures by canonical name
- This spec's §7 invariants → per-spec `## Property-based tests` subsection
  lists the specific invariants from §7.2
- This spec's §10 regen process → per-spec `## Test commands` subsection
  includes the regen command for that module's fixtures
- Spec 12's `## 5. Pixel Verification` (pixelmatch helper) → per-spec
  Tier 2 tests use the helper
- Spec 12's `## 6. Audio Verification` (OfflineAudioContext helper) →
  per-spec Tier 2 tests use the helper
- Spec 12's `## 7. WYSIWYG Verification` (canonical implementation) →
  this spec's §6 (invariant definition) references it
- Spec 12's `## 17.1` (canonical CI YAML) → this spec's §9 (CI structure)
  references it

### 14.4 Per-spec author checklist

When writing the `## Testing` section for a per-spec:

- [ ] **Step 0 (Round 8): every facet your spec introduces — functional or non-functional — has a row in §3.1 or §13A.7 (or you add one in the same PR). A facet with no row anywhere is a spec bug.**
- [ ] Read this spec (17) §2 (methodology) and §3 (matrix)
- [ ] Identify the matrix row(s) that apply to your module
- [ ] Copy the §4.1 template into your spec
- [ ] Fill in each tier subsection with specific test names (not
  philosophical justification)
- [ ] List the specific fixtures your tests use (canonical names from §5)
- [ ] List the specific commands (npm scripts from §9.5)
- [ ] For property tests, list the invariants from §7.2 that apply
- [ ] Cross-reference the matrix row(s) at the top of the section
- [ ] If you need a fixture that's not in §5, add it to §5 first (with
  justification) before using it
- [ ] If you believe a tier doesn't apply to your module, propose a
  matrix change in §3 (with justification) before writing the per-spec
- [ ] If your module emits `CommandError` codes: every code has a
  triggering test (§2.5 rule 8)

---

## 15. Open Questions

These are unresolved questions about the testing methodology. They're
tracked here (not in spec 12's open questions, which are about
infrastructure) because they affect the methodology, not the tooling.

### 15.1 Flaky pixel-diff tests across GPUs

**Problem:** GPU FP rounding differs across drivers (NVIDIA vs AMD vs
Apple Silicon vs Intel). A pixel-diff test that passes on the NVIDIA
runner may fail on the Mac M2 runner by a few pixels per frame, even
though the renderer is correct.

**Current mitigation:** per-platform reference sets (§5.4). Each platform
has its own golden PNGs; tests compare against the platform's own
golden, not a single global golden.

**Open question:** is `pixelmatch`'s default `threshold: 0.1` (per-pixel
difference threshold) sufficient for cross-platform tolerance, or do we
need a higher threshold for cross-platform tests? Need empirical data
from the first few nightly runs to decide.

### 15.2 `looks-same` vs `pixelmatch`

**Problem:** `pixelmatch` does a per-pixel comparison with a fixed
threshold. `looks-same` (Yandex's library) does perceptual comparison
(ignores anti-aliasing differences, takes gamma into account). Which is
better for our use case?

**Current choice:** `pixelmatch` (simpler, faster, well-tested in spec
12 §5).

**Open question:** for the WYSIWYG test (which expects 0% diff), either
works. For the per-spec Tier 2 tests (which may have intentional
tolerance for shader FP variance), `looks-same` might be more
appropriate. Need to evaluate once we have real Tier 2 tests running.

### 15.3 Testing WebGPU device loss recovery

**Problem:** `device.lost` can fire at any time (GPU driver crash, OOM,
thermal throttling). The engine must recover (re-create the device,
re-upload textures, resume rendering). Testing this requires actually
triggering device loss, which is gated behind the `lose_device` WebGPU
extension (only available in test builds).

**Current mitigation:** Tier 1 unit tests mock `device.lost.then()` and
assert the handler reinitializes. Tier 2 can't easily trigger real
device loss; manual test script (§12 M9) covers perceived stability.

**Open question:** can we enable `lose_device` in a special CI build
that runs once per release to verify recovery? Needs investigation of
Chrome's `--enable-dawn-features=allow_unsafe_apis` flag (which we
already use for the adapter blocklist bypass).

### 15.4 Testing OPFS quota exceeded

**Problem:** when OPFS (Origin Private File System) runs out of quota,
write operations fail. The engine must handle this gracefully (notify
the user, free cache, retry). Testing requires actually filling OPFS
to quota, which is hard in CI (would need to write ~2GB of data first).

**Current mitigation:** Tier 1 unit tests mock the
`FileSystemSyncAccessHandle` to throw `QuotaExceededError` and assert
the engine's error handling.

**Open question:** should we have an integration test that actually
fills OPFS to quota? Probably not on every PR (too slow), but maybe
on nightly. Needs investigation of how to deterministically trigger
quota exceeded in headless Chrome.

### 15.5 Testing ffmpeg subprocess crash in cloud render

**Problem:** in cloud render mode, the engine spawns ffmpeg as a
subprocess (for input transcoding and output encoding). If ffmpeg
crashes (segfault, OOM), the engine must detect it, clean up, and
retry or report the error. Testing requires actually crashing ffmpeg,
which is hard.

**Current mitigation:** Tier 1 unit tests mock the `child_process`
module to simulate ffmpeg exit codes (non-zero) and signals (SIGSEGV).

**Open question:** should we have a real ffmpeg crash test? Could ship
a custom ffmpeg build with an intentional bug (e.g., crash on a
specific input) for testing. Probably overkill; mock-based unit tests
are likely sufficient.

### 15.6 Testing the test harness itself

**Problem:** the test harness (`tests/integration/test-harness.html`)
that loads projects and exposes `window.__engine` is itself code. If
it's broken, all Tier 2/3 tests fail in confusing ways. How do we test
the harness?

**Current mitigation:** a smoke test (`tests/integration/smoke/harness-boots.test.ts`)
that just loads the harness and asserts `window.__engineReady` becomes
true within 5 seconds. If this fails, all other Tier 2/3 tests are
skipped (not failed) with a clear "harness broken" message.

**Open question:** should the harness have its own property tests
(e.g., "for any project JSON conforming to the schema, the harness can
load it without throwing")? Probably yes, but low priority.

### 15.7 Property test performance

**Problem:** property tests with `numRuns: 1000` for slow invariants
(undo restores state — each run creates a fresh engine) take ~30
seconds each. With ~20 property tests, that's 10 minutes — significant
chunk of the 30-second Tier 1 budget.

**Current mitigation:** slow property tests use `numRuns: 100` (§7.5);
fast property tests use `numRuns: 1000`. Thorough mode
(`test:property:thorough`) uses `numRuns: 5000` on nightly only.

**Open question:** can we make property tests faster by reusing engine
instances? Risk: state leak between runs. Probably not worth the
complexity; 10 minutes for property tests is acceptable.

### 15.8 Cross-engine determinism in property tests

**Problem:** property tests assume the engine is deterministic — same
input → same output. If the engine has any non-determinism (Date.now,
Math.random, async race), property tests will fail intermittently.

**Current mitigation:** the engine is designed to be deterministic
(no Date.now in ops, no Math.random in renderer, all async paths
are awaited). Property tests would catch any determinism break.

**Open question:** is the determinism guarantee strong enough? Need to
audit the engine for any hidden non-determinism (e.g., Map iteration
order, which is insertion-order in JS but easy to break accidentally).

### 15.9 Test fixture licensing

**Problem:** some test fixtures (fonts, LUTs) may have licenses that
restrict redistribution. We need to verify every fixture is
redistributable before checking it into the asset bucket.

**Current mitigation:** fixtures are either (a) generated by ffmpeg
(public domain output), (b) hand-authored (our copyright), or (c)
sourced from open-license libraries (Inter, RobotoMono are SIL Open
Font License; LUTs are generated by us).

**Open question:** do we need a `LICENSES.md` file in
`tests/fixtures/` documenting the license of every asset? Probably
yes, especially if the asset bucket is public.

### 15.10 Performance test drift across browser versions

**Problem:** Chrome updates can change performance characteristics
(V8 optimizations, WebGPU driver updates). A perf test that passes on
Chrome 120 may fail on Chrome 121 for reasons unrelated to our code.

**Current mitigation:** perf tests use generous thresholds (28fps not
30fps; 50ms not 33ms). Nightly results are tracked for trend analysis
(§8.4), not just threshold pass/fail.

**Open question:** should we pin Chrome version in CI? Trade-off:
pinning gives stable results but misses real perf regressions that
only show up in new Chrome versions. Current choice: don't pin; use
generous thresholds; investigate any >10% drift.

---

## 16. Implementation Checklist

This section is the implementation team's TODO list for setting up the
testing infrastructure described in this spec. It's the bridge between
the spec and the actual code.

### 16.1 Phase 0: Test infrastructure spike (P0 prereq)

- [ ] `vitest.config.ts` created (spec 12 §17.5)
- [ ] `playwright.config.ts` created (spec 12 §17.4)
- [ ] `tests/fixtures/manifest.json` created (§11.3 above)
- [ ] `tests/fixtures/generate-assets.mjs` created and verified (§11)
- [ ] `tests/integration/test-harness.html` created (loads project,
      exposes `window.__engine`)
- [ ] `tests/helpers/arbitraries.ts` created (§7.3)
- [ ] `tests/helpers/pixel-diff.ts` created (spec 12 §5.1)
- [ ] `tests/helpers/audio-diff.ts` created (spec 12 §6.2)
- [ ] `tests/helpers/test-engine.ts` created (factory for
      `createInteractiveEngine` with mocked storage/audio)
- [ ] CI workflow `.github/workflows/test.yml` created (spec 12 §17.1)
  - [ ] `tier1-engine` job
  - [ ] `tier2-render` job (lavapipe)
  - [ ] `tier3-ui` job
  - [ ] `wysiwyg-audio` job
- [ ] Self-hosted GPU runner set up (spec 12 §17.2)
- [ ] Smoke test: `npm run test:smoke` runs in <2 minutes

### 16.2 Phase 1: Per-spec testing sections (parallel with P1–P5)

For each spec 01 through 12:

- [ ] Read this spec's §4 template
- [ ] Identify matrix rows (§3) that apply to the spec
- [ ] Write the `## Testing` section following the template
- [ ] Add the test files to `tests/unit/<spec-number>-<spec-name>/`,
      `tests/integration/<spec-number>-<spec-name>/`
- [ ] Add fixtures to `tests/fixtures/manifest.json` if new ones are needed
- [ ] Verify `npm test -- --filter <spec-number>-<spec-name>` runs and
      passes

### 16.3 Phase 2: WYSIWYG verification (P5 prereq)

- [ ] `tests/cloud-render/wysiwyg-pixel.test.ts` created (§6.2)
- [ ] `tests/cloud-render/wysiwyg-audio.test.ts` created (§6.3)
- [ ] `tests/integration/wysiwyg-state.test.ts` created (§6.1)
- [ ] All three pass on the self-hosted GPU runner

### 16.4 Phase 3: Performance tests (P5 prereq)

- [ ] `tests/performance/playback-fps.test.ts` created (§8.3.1)
- [ ] `tests/performance/scrub-latency.test.ts` created (§8.3.2)
- [ ] `tests/performance/memory-ceiling.test.ts` created (§8.3.3)
- [ ] `tests/performance/render-4k.test.ts` created (§8.3.4)
- [ ] `tests/performance/render-8k.test.ts` created
- [ ] Nightly workflow runs all perf tests and uploads trend JSON

### 16.5 Phase 4: Reference regeneration (P5 prereq)

- [ ] `tests/fixtures/generate-references.mjs` created (§10.3)
- [ ] `regen-references` workflow_dispatch job created
- [ ] Initial reference set generated for all 3 platforms (linux-nvidia,
      macos-m2, windows-d3d12)
- [ ] PR template includes "References regenerated?" checkbox for any
      renderer change

### 16.6 Phase 5: Manual test matrix (P5 prereq)

- [ ] `tests/manual/M1-fcp-open.md` created (procedure for M1)
- [ ] `tests/manual/M2-davinci-open.md` created
- [ ] `tests/manual/M3-premiere-open.md` created
- [ ] `tests/manual/M4-fcp-round-trip.md` created (procedure for M4 — FCPXML
      round-trip from FCP back into our editor; tolerance check per spec 10 §11)
- [ ] `tests/manual/M5-color-accuracy.md` created
- [ ] `tests/manual/M6-audio-accuracy.md` created
- [ ] `tests/manual/M7-hdr-pq.md` created
- [ ] `tests/manual/M8-hdr-hlg.md` created (procedure for M8 — HDR HLG display
      output; mirrors M7 but exercises the HLG transfer path)
- [ ] `tests/manual/M9-playback-smoothness.md` created
- [ ] `tests/manual/M10-cross-browser.md` created (procedure for M10 — cross-browser
      smoke test across Chrome / Edge / Brave / Firefox / Safari)
- [ ] `tests/manual/M11-keyboard-conflicts.md` created (procedure for M11 — OS-level
      keyboard shortcut conflicts on macOS / Windows / Linux)
- [ ] `tests/manual/M12-accessibility.md` created (procedure for M12 — screen reader
      (VoiceOver / NVDA) + keyboard-only nav + ARIA / focus management audit)
- [ ] Manual test tracking spreadsheet created (or PM tool integration)
- [ ] Release checklist includes "all release-blocking manual tests pass"

---

## 17. Glossary

- **Tier 1** — pure engine tests (Vitest, no browser). See §2.1.
- **Tier 2** — render tests (Playwright + headless Chrome). See §2.1.
- **Tier 3** — UI tests (Playwright with keyboard/mouse input). See §2.1.
- **WYSIWYG** — What You See Is What You Get. Three invariants: state
  (UI == API), pixel (browser == cloud), audio (real-time == offline).
  See §6.
- **Property-based test** — a test that verifies an invariant holds for
  random inputs (via `fast-check`). See §7.
- **Reference (PNG)** — a "golden" render output stored in
  `tests/fixtures/references/`, compared against test renders via
  `pixelmatch`. See §5.4, §10.
- **Reference regeneration** — the process of updating golden PNGs when
  the renderer intentionally changes. See §10.
- **Triage** — the process of categorizing a test failure as regression,
  flaky, real bug, or test bug, and taking the appropriate action. See
  §13.
- **Matrix** — the table in §3 mapping every feature to every test tier.
- **Arbitrary** (noun) — a `fast-check` generator for random values of
  a type (e.g., `arbitrarySceneState`). See §7.3.
- **Invariant** — a property that must hold for all inputs (e.g., "split
  preserves total duration"). See §7.2.
- **Shrinking** — `fast-check`'s automatic minimization of a failing
  case to the smallest reproducing input. See §7.6.
- **Lavapipe** — Mesa's software Vulkan implementation, used in CI for
  WebGPU on runners without a real GPU. See spec 12 §3.2.
- **OPFS** — Origin Private File System, browser storage for large
  files. See spec 09 §4.1 (OPFS).
- **Test harness** — the HTML page (`tests/integration/test-harness.html`)
  that loads a project and exposes the engine to Playwright. See §15.6.

---

## 18. Test Plan for This Stream (Meta)

This section documents how this spec itself was tested for correctness.

### 18.1 Methodology review

- [x] Three-tier methodology is consistent with master spec §9 (6-bullet
      summary) — verified against `00-master-spec.md` lines 396–407
- [x] WYSIWYG invariants are consistent with Decision 6 (one engine,
      two entry points) — verified against `00-master-spec.md` lines 165–184
- [x] Property-based invariants are consistent with spec 06 (NLE ops)
      and spec 12 §8 — cross-referenced
- [x] Performance thresholds are consistent with spec 12 §10 —
      cross-referenced

### 18.2 Infrastructure cross-reference

- [x] CI workflow structure (§9) matches spec 12 §17.1 (canonical YAML)
- [x] Test asset generation (§11) matches spec 12 §15 (ffmpeg commands)
- [x] Pixelmatch / `looks-same` discussion (§15.2) references spec 12 §5
- [x] Audio verification (§6.3) references spec 12 §6
- [x] Self-hosted runner setup (§9.4) references spec 12 §17.2

### 18.3 Per-spec template validation

- [x] Template (§4.1) covers all tiers from the matrix (§3)
- [x] Template includes property tests, fixtures, commands
- [x] Worked example (§4.2) is a realistic spec 06 `## Testing` section
- [x] Anti-patterns (§4.3) are concrete and actionable

### 18.4 Open questions review

- [x] All 10 open questions (§15) are tracked and have current mitigations
- [x] No open question blocks implementation of any tier
- [x] Each open question has a path to resolution (empirical data,
      investigation, or explicit decision)

### 18.5 Code References — nle-engine (reference, NOT canon)

nle-engine (github.com/bearachprema/nle-engine, 37,958 LOC, 124 tests) is a clean-room
FreeCut-port **in-between reference, NOT canon**. Its test reality is single-tier (one
Playwright-driven in-app harness) — the pattern this spec's three-tier methodology corrects;
its own audit independently recommends the same split. Where engine and spec conflict,
**the spec wins**. Full reconciliation: `19-code-references.md`.

| Spec 17 section | nle-engine file:line | Verified quote | Status | Note |
|---|---|---|---|---|
| §2.1 Tier 1 (Vitest) | `scripts/run-nle-tests.mjs:90` | `browser = await chromium.launch({` | CORRECTIVE | All 124 tests run in one browser page; no Node tier |
| §2.1 Tier 1 | `gaps/audit/G-test-coverage.md:255` | `Two-tier runner: extract all CPU-only tests` | CORRECTIVE (converging) | Engine's own audit recommends the same tier split |
| §2.1 Tier 2/3 harness | `scripts/run-nle-tests.mjs:27` | `const CHROME_FLAGS = [` | ALIGNED | Xvfb + software-Vulkan launch pattern proven in-container |
| §9 CI strategy | `.agents/DECISIONS.md:218` | `Tests run via Playwright with Chrome under Xvfb + SwiftShader` | ALIGNED | Engine Decision 12 matches spec 12's software-GPU CI |
| §2.2 error-path coverage | `gaps/audit/G-test-coverage.md:26` | `Total error/boundary ≈ 12/128 (9%).` | CORRECTIVE | 1 throw assertion in 124 tests; 113-item charter queued |
| §4.2 worked-example realism | `src/app/page.tsx:2418` | `addTextItem: () => { throw new Error('addText not supported in minimal scaffold'); },` | CORRECTIVE | Advertised op that throws — exactly what contract tests catch |
| §6.2 Pixel WYSIWYG | `gaps/audit/MASTER.md:28` | `Composition rendering \| renders zero pixels \| player.ts:1038` | ENGINE-GAP | Render loop drops non-video clips — evidence for Tier 2's necessity |
| §7 property-based | `gaps/audit/E2-persistence-serialization.md:192` | `round-trip property test — JSON.parse(JSON.stringify(serialize(t)))` | ALIGNED (planned) | Engine roadmap adopts the same invariant philosophy |
| §13 triage | `gaps/audit/G-test-coverage.md:248` | `A thrown error inside any test block escapes` | CORRECTIVE | No per-test isolation — §13.1's rails are the fix |
| §16.1 checklist | `scripts/run-nle-tests.mjs:152` | `await page.click('button:has-text("Run All Milestones")');` | CORRECTIVE | DOM-scrape harness vs `window.__engine` predicate harness |

---

**End of `17-test-plan.md`.** Next: per-spec `## Testing` sections (01
through 12) follow the template in §4. Cross-references to spec 12
(testing infrastructure) and `00-master-spec.md` (architectural decisions)
throughout. Cross-references to spec 18 (UI shell panel tests, Tier 3) and
spec 19 (engine-delta evidence for the methodology) are live as of Round 7.

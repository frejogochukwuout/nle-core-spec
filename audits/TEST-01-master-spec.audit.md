# Audit Report: TEST-01 Master Spec Testability Update
**Auditor:** general-purpose
**Spec:** `00-master-spec.md` (after TEST-01, 620 LOC)
**Date:** 2026-08-22
**Stream:** AUDIT-TEST-01

---

## Summary

- Spot-checks performed: 9 (per task spec)
- Sub-claims verified: 33
- Verified accurate: 32
- Issues found: 1 (low severity — classification alignment) + 1 (trivial cosmetic)

## Verdict: ✅ PASS (with one low-severity alignment note)

The TEST-01 update to `00-master-spec.md` is structurally sound, internally consistent, and faithfully implements every required spot-check item. Decision 9, §13 Testability Strategy, the §8 stream-map rows, the §4 tech-stack row, the §7.1/§7.2 WYSIWYG extensions, and the five §12 glossary entries are all present and correctly cross-referenced to specs 15/16/17. Decisions 1–8 and §1–§6 are intact and unmodified. One minor classification inconsistency between spec 00 §13.6 and spec 17 §2.2 (audio WYSIWYG: "Tier 2" vs "cross-cutting") is documented below; it is not blocking.

---

## Spot-check results

### 1. Decision 9 exists — ✅ PASS

**Claim:** A new "Decision 9: Data-Driven Engine Architecture" section was added to §2, covering three layers, three consumers, and "why this matters".

**Evidence (lines 222–272 of `00-master-spec.md`):**

> ### Decision 9: Data-Driven Engine Architecture
>
> **Decision:** The engine is a pure JSON-in, JSON-out state machine. Three layers are all JSON-serializable:
> 1. **Static project state** (`ProjectJSON`) — the saved project file (clips, tracks, elements, effects, etc.)
> 2. **Runtime operations** (`EngineCommand[]`) — a sequence of ops applied to engine state, each a JSON-serializable object like `{ type: 'timeline.split', params: { time, trackIds } }`
> 3. **Render output** (`FrameDescriptor` + pixels + audio PCM) — what the renderer produces
>
> Three consumers use **identical JSON interfaces** against the same engine:
> - **Browser UI** — translates user interactions (clicks, drags, keyboard) into `EngineCommand` objects, sends to engine, renders result
> - **Cloud render** — accepts `ProjectJSON` + `EngineCommand[]` over HTTP, applies them, renders frames, pipes to ffmpeg
> - **Test harness** — constructs `EngineCommand` objects directly (no UI), applies them, verifies state + pixels + audio

The section includes a four-bullet "Why this matters" list:

1. **Testability without UI tax** — browser automation is slow and flaky; constructing `EngineCommand` directly is fast and deterministic.
2. **WYSIWYG for state, not just pixels** — browser UI path and direct API path produce identical `SceneState`; this is a testable invariant.
3. **Unifies browser + cloud** — cloud render is just "hosted engine that takes JSON over wire". No separate API surface.
4. **Future automation** — AI agents, scripting, MCP servers all speak the same `EngineCommand` protocol.

The section closes with an ASCII state-machine diagram, an implication-for-UI paragraph, an implication-for-testing paragraph, a "Relationship to existing decisions" subsection (cross-references Decision 6/7/8), and a "New specs that elaborate this decision" subsection pointing at specs 15/16/17.

**Verdict:** ✅ All four sub-claims (three layers, three consumers, why-this-matters, cross-references) verified.

---

### 2. §13 Testability Strategy exists — ✅ PASS

**Claim:** A new §13 was added covering three testing tiers, UI interaction tax avoidance, multi-track blend test assets (solid colors), audio waveform verification (frequency tones), NLE op property-based verification, and three WYSIWYG invariants.

**Evidence (lines 543–619 of `00-master-spec.md`):**

§13 contains seven subsections covering every required item:

| § | Subsection | Required coverage | Verified |
|---|---|---|---|
| 13.1 | Three testing tiers | Tier 1 (pure engine, Vitest), Tier 2 (render, Playwright + Chrome), Tier 3 (UI, Playwright keyboard) — with speed/flakiness/coverage matrix | ✅ |
| 13.2 | Avoiding UI interaction tax | Direct `EngineCommand` API > keyboard shortcuts via Playwright > Playwright clicks/drags (only for testing UI translation layer itself) | ✅ |
| 13.3 | Multi-track blend verification | Solid-color palette: Track 1 = pure red (255,0,0), Track 2 = pure green (0,255,0), Track 3 = pure blue (0,0,255), Track 4 = pure white (255,255,255) — each row annotated with intended purpose | ✅ |
| 13.4 | Audio waveform verification | Distinct pure-tone palette: 440 Hz (A4), 1000 Hz, 100 Hz — with FFT bin check + cross-talk threshold (-60 dB) | ✅ |
| 13.5 | NLE op verification (property-based) | Property-based tests (random `SceneState`, apply op, assert invariants — no overlaps, no negative durations, source bounds respected, locked tracks rejected, slip preserves duration, undo/redo round-trip) + algorithm-specific hand-crafted cases | ✅ |
| 13.6 | Three WYSIWYG invariants | State WYSIWYG (Tier 3), Pixel WYSIWYG (Tier 2), Audio WYSIWYG — all CI-blocking | ✅ (with minor alignment note — see Issues) |
| 13.7 | Test asset design | Single source of truth under `tests/assets/`, committed not generated, versioned alongside engine, referenced by stable hash | ✅ |

**Verdict:** ✅ All six required coverage items verified.

---

### 3. §8 Stream Map updated — ✅ PASS

**Claim:** Three new rows added: stream 13 → `15-wire-protocol.md`, stream 14 → `16-keyboard-shortcuts.md`, stream 15 → `17-test-plan.md`.

**Evidence (lines 457–459 of `00-master-spec.md`):**

| # | Stream | Spec file | Primary teacher | Key decisions |
|---|---|---|---|---|
| 13 | Wire protocol | `15-wire-protocol.md` | OpenCut-classic `EditorCore` method shapes + Zod schemas | Decision 9 |
| 14 | Keyboard shortcuts | `16-keyboard-shortcuts.md` | FreeCut + OpenCut-classic shortcut maps; every shortcut → `EngineCommand` | Decision 9 |
| 15 | Test plan | `17-test-plan.md` | Three-tier testing methodology (Tier 1 engine / Tier 2 render / Tier 3 UI) | Decision 9 |

All three new rows are present, the spec files are correctly numbered (15/16/17), and each row references Decision 9 in the "Key decisions" column.

**Verdict:** ✅ Verified.

---

### 4. §4 Tech Stack updated — ✅ PASS

**Claim:** A row for "Engine wire protocol" was added to §4 Technology Stack.

**Evidence (line 360 of `00-master-spec.md`):**

| Concern | Choice | Notes |
|---|---|---|
| Engine wire protocol | **JSON (Zod-validated)** | `ProjectJSON` for static project state, `EngineCommand[]` for runtime ops, `CommandResult` for outputs — see `15-wire-protocol.md`. Drives the browser UI, cloud render, and test harness from one identical protocol (Decision 9). |

The row is inserted logically (between Validation and Video decode), names the JSON + Zod choice, cross-references spec 15, and explicitly cites Decision 9.

**Verdict:** ✅ Verified.

---

### 5. §7 WYSIWYG Contract extended — ✅ PASS

**Claim:** §7 now covers state WYSIWYG and audio WYSIWYG in addition to the original pixel WYSIWYG.

**Evidence:**

- **§7 (pixel WYSIWYG, original)** — line 412: "For any given frame N, the pixels produced by `createInteractiveEngine().renderFrame(N)` MUST be bit-identical to the pixels produced by `createRenderEngine().renderFrame(N)` for the same project state."
- **§7.1 State WYSIWYG (NEW)** — lines 425–431: "for any sequence of `EngineCommand[]` applied to a starting `ProjectJSON`, the resulting `SceneState` produced by the **browser UI path** (commands synthesized from user interactions) MUST be bit-identical to the resulting `SceneState` produced by the **direct API path** (commands constructed by tests or cloud callers)."
- **§7.2 Audio WYSIWYG (NEW)** — lines 433–435: "For any project, the audio PCM produced by `AudioContext` (browser real-time path) MUST be bit-identical to the PCM produced by `OfflineAudioContext` (cloud render path) for the same frame range. Same DSP graph, same processing order, same sample rate."

All three invariants are CI-blocking (per §13.6) and each ties back to a Decision 9 architectural claim.

**Verdict:** ✅ Verified.

---

### 6. §12 Glossary updated — ✅ PASS

**Claim:** New entries for `ProjectJSON`, `EngineCommand`, `CommandResult`, `SceneState`, "UI translation layer" were added.

**Evidence (lines 535–540 of `00-master-spec.md`):**

- **`ProjectJSON`** (line 535) — "The static, on-disk representation of a project (clips, tracks, elements, effects, scenes, settings). Loaded via `engine.project.loadFromJSON(project)`. Zod-validated. See `15-wire-protocol.md`."
- **`EngineCommand`** (line 536) — "A JSON-serializable operation applied to engine state at runtime: `{ type: string; params: Record<string, unknown> }`... Applied via `engine.command.apply(command): CommandResult`. The wire protocol that unifies browser UI, cloud render, and test harness (Decision 9). See `15-wire-protocol.md`."
- **`CommandResult`** (line 537) — "The JSON-serializable return value of `engine.command.apply()` — describes what changed (affected track IDs, before/after snapshots for undo, error if rejected)."
- **`SceneState`** (line 538) — "The JSON-serializable snapshot of the engine's current timeline state... Produced by `engine.scenes.getActiveScene().serialize()` or similar. Tests assert against this directly (Tier 1 — see §13)."
- **UI translation layer** (line 539) — "The thin UI module that converts user interactions (mouse clicks, drags, keyboard shortcuts) into `EngineCommand` objects. Holds no engine state. Tested via Playwright (Tier 3 — see §13)."

Each entry cross-references spec 15 and/or Decision 9 and/or §13 as appropriate. Existing glossary entries (`MediaTime`, `FrameRate`, `SceneTracks`, `WYSIWYG`, `P010`, etc.) are unchanged.

**Verdict:** ✅ All five new entries verified.

---

### 7. Cross-references work — ✅ PASS

**Claim:** Decision 9 references specs 15/16/17; §13 references spec 17 for detailed methodology; stream map entries reference Decision 9.

**Evidence:**

| From | To | Where | Verified |
|---|---|---|---|
| Decision 9 (§2) | spec 15 | line 269: "`15-wire-protocol.md` — full JSON schema for `ProjectJSON` + `EngineCommand[]` + `CommandResult`" | ✅ |
| Decision 9 (§2) | spec 16 | line 270: "`16-keyboard-shortcuts.md` — every keyboard shortcut maps to a deterministic `EngineCommand`" | ✅ |
| Decision 9 (§2) | spec 17 | line 271: "`17-test-plan.md` — three-tier test methodology built on this principle" | ✅ |
| §13 header | spec 17 | line 545: "See `17-test-plan.md` for the per-module test plan." | ✅ |
| §9 footer | §13 + spec 17 | line 474: "For the refined three-tier methodology (pure engine tests, render tests, UI tests) built on the data-driven engine principle (Decision 9), see §13 and `17-test-plan.md`." | ✅ |
| §13.2 | spec 16 | line 562: "for actions that have shortcuts (see `16-keyboard-shortcuts.md`)" | ✅ |
| §13.3 | spec 17 | line 576: "Document the full test-asset palette... in `17-test-plan.md`." | ✅ |
| §13.7 | spec 17 | line 616: "The asset palette is documented in `17-test-plan.md` and referenced by Tier 2 / Tier 3 tests by stable hash." | ✅ |
| §8 stream map row 13 | Decision 9 | line 457: "Decision 9" in Key decisions column | ✅ |
| §8 stream map row 14 | Decision 9 | line 458: "Decision 9" in Key decisions column | ✅ |
| §8 stream map row 15 | Decision 9 | line 459: "Decision 9" in Key decisions column | ✅ |
| §4 tech stack row | spec 15 + Decision 9 | line 360: "...see `15-wire-protocol.md`... (Decision 9)" | ✅ |
| §12 glossary `ProjectJSON` | spec 15 | line 535 | ✅ |
| §12 glossary `EngineCommand` | spec 15 + Decision 9 | line 536 | ✅ |
| §12 glossary `SceneState` | §13 Tier 1 | line 538 | ✅ |
| §12 glossary "UI translation layer" | §13 Tier 3 | line 539 | ✅ |
| §7.1 | Decision 9 | line 425: "### 7.1 State WYSIWYG (extends Decision 9)" | ✅ |

**Bidirectional verification:** Spec 15 back-references master spec (line 17 of `15-wire-protocol.md`: "Adoption decision (informs spec 00 §2 Decision 9 if added by TEST-01)"). Spec 17 explicitly cites Decision 6 + §13 alignment. Spec 16 §0.2 cites spec 15 as the formal contract.

**Verdict:** ✅ All cross-references resolve; no broken pointers.

---

### 8. No prior content broken — ✅ PASS

**Claim:** Decisions 1–8 unchanged; §1–§6 (Product Vision, Decisions, Architecture, Tech Stack, Browser Matrix, Constraints) intact.

**Evidence:**

- **§1 Product Vision** — lines 49–80: "What we are building", "Why this scope", "What 'done' looks like for v1", "What 'done' explicitly does NOT include" — all intact, content unchanged from original spec.
- **Decision 1** (lines 84–99) — FreeCut as primary system-level teacher. Intact.
- **Decision 2** (lines 101–112) — OpenCut-classic as primary type-design teacher. Intact.
- **Decision 3** (lines 114–123) — Pure TypeScript. Intact.
- **Decision 4** (lines 125–135) — WebGPU-only. Intact.
- **Decision 5** (lines 137–152) — 10-bit color end-to-end. Intact.
- **Decision 6** (lines 154–173) — One engine, two entry points. Intact.
- **Decision 7** (lines 175–202) — No native desktop, no Rust core. Intact, including the five architectural-discipline items.
- **Decision 8** (lines 204–217) — Cloud render via headless Chrome + ffmpeg. Intact.
- **§3 High-Level Architecture** — lines 274–340: ASCII system diagram unchanged.
- **§4 Technology Stack** — all original rows present; new "Engine wire protocol" row inserted without removing or modifying existing rows.
- **§5 Browser Matrix** — unchanged (Chromium 113+/118+ matrix, Firefox/Safari/iOS stances, `DegradedRendererBanner` policy).
- **§6 Constraint Acknowledgments** — all 8 constraints unchanged.

Decision 9 was inserted cleanly between Decision 8 (which ends at line 217) and §3 (which begins at line 220 with `## 3. High-Level Architecture`). §13 was inserted cleanly after §12 Glossary and before the "End of master spec" footer (line 619).

**Verdict:** ✅ All prior content verified intact; no regressions.

---

### 9. Internal consistency — ✅ PASS (with one low-severity note)

**Claim:** The three new specs are referenced consistently; Decision 9 aligns with Decisions 6/7/8; §13 three tiers align with spec 17 three tiers.

**Evidence:**

**9a. Consistent spec references** — All three new specs (15/16/17) are referenced consistently as `15-wire-protocol.md`, `16-keyboard-shortcuts.md`, `17-test-plan.md` (no spelling or numbering drift). Spec 15's actual file title is "JSON Wire Protocol: `EngineCommand`, `CommandResult`, `EngineEvent`" — the master spec's reference name ("Wire protocol") matches the file name and topic. Spec 16's title is "Keyboard Shortcuts: Comprehensive Interaction Spec" — master spec reference ("Keyboard shortcuts") matches. Spec 17's title is "Overall Test Plan: Methodology, Test Matrix, Per-Module Template" — master spec reference ("Test plan") matches. ✅

**9b. Decision 9 alignment with Decisions 6/7/8** — Decision 9 explicitly contains a "Relationship to existing decisions" subsection (lines 263–267):

> - Builds on Decision 6 (one engine, two entry points) — adds a third consumer (test harness) that uses the same JSON protocol
> - Extends Decision 7's discipline item #1 ("Separate engine from UI") with a concrete wire protocol
> - Extends Decision 8 (cloud render via headless Chrome) — cloud render accepts `ProjectJSON` + `EngineCommand[]` over HTTP rather than driving the engine through Playwright clicks

This relationship is coherent:
- Decision 6 establishes "two entry points" (interactive + render); Decision 9 adds a third consumer (test harness) using the same JSON protocol as those two — does not contradict Decision 6.
- Decision 7's discipline item #1 calls for engine/UI separation; Decision 9 makes that separation concrete with a wire protocol — extends, does not contradict.
- Decision 8 says cloud render uses headless Chrome + ffmpeg; Decision 9 says cloud render accepts JSON over HTTP rather than driving via Playwright — clarifies the API surface, does not contradict Decision 8's "same engine bundle" premise.

✅

**9c. §13 three tiers align with spec 17 three tiers** — Side-by-side comparison:

| Tier | Spec 00 §13.1 | Spec 17 §2.1 | Aligned? |
|---|---|---|---|
| Tier 1 | Pure engine tests (Vitest, no browser, `EngineCommand` → `apply()` → assert on `SceneState`) | Pure engine tests (Vitest, Node.js, no browser, `EngineCommand[]` → `apply()` → assert on `SceneState`) | ✅ |
| Tier 2 | Render tests (Playwright + headless Chrome, render specific frames, pixel-diff vs reference PNG) | Render tests (Playwright + headless Chrome with WebGPU, screenshot via `page.screenshot()`, compare to reference PNG via `pixelmatch`) | ✅ |
| Tier 3 | UI tests (Playwright with keyboard shortcut dispatch, capture emitted `EngineCommand`, compare to expected shape) | UI tests (Playwright keyboard input via `page.keyboard.press()`, verify `SceneState` matches direct-API apply) | ✅ |

Runner, methodology, file location, and what each tier deliberately excludes all align between spec 00 §13.1 and spec 17 §2.1.

**Minor alignment note (low severity):** Spec 00 §13.6 item #3 classifies Audio WYSIWYG as "Tested in Tier 2 by rendering both paths, extracting PCM, and sample-by-sample comparison". Spec 17 §2.2 classifies Audio WYSIWYG as a "cross-cutting test (uses both `AudioContext` and `OfflineAudioContext`)" — not strictly Tier 2. Both specs agree the test is CI-blocking and exercises both audio contexts; the only divergence is whether it is labeled "Tier 2" or "cross-cutting". This is a documentation alignment issue, not an architectural or testability defect. **Recommendation:** When TEST-01 follow-up or spec 17 next revises, harmonize the label. Suggested fix: change spec 00 §13.6 item #3 to read "Tested as a cross-cutting test (see spec 17 §2.2) by rendering both paths, extracting PCM, and sample-by-sample comparison."

**Verdict:** ✅ All three consistency sub-claims verified. One minor label-alignment note flagged.

---

## Issues found

| # | Severity | Location | Issue | Recommended fix |
|---|---|---|---|---|
| 1 | **Low** | spec 00 §13.6 item #3 vs spec 17 §2.2 | Audio WYSIWYG classification divergence: spec 00 calls it "Tier 2"; spec 17 calls it "cross-cutting". | Harmonize the label. Recommended: change spec 00 §13.6 #3 to read "Tested as a cross-cutting test (see spec 17 §2.2) by rendering both paths…" — preserves the test methodology while aligning the tier label. |
| 2 | **Trivial / cosmetic** | spec 00 §3 ASCII diagram, line 281 | Stray Unicode replacement character (`�`) between the Preview UI and Library UI boxes in the ASCII architecture diagram. Does not affect readability of the surrounding text but is a character-encoding artifact. | Replace the `�` with a space (or remove the box-drawing character that produced it). |

Neither issue blocks downstream consumption of the master spec. Decision 9, §13, §8 stream map, §4 tech-stack row, §7.1/§7.2 WYSIWYG extensions, §12 glossary additions, and cross-references are all production-ready.

---

## Recommendation

**Accept TEST-01 as PASS.** The update successfully establishes Decision 9 as the architectural keystone for the data-driven engine, extends the WYSIWYG contract from pixel-only to state+pixel+audio, introduces the three-tier testability methodology, and stitches the three new downstream specs (15/16/17) into the master spec's decision graph and stream map. No regressions to existing decisions or sections.

**Follow-up actions (non-blocking):**
1. (Low) Align the Audio WYSIWYG tier label between spec 00 §13.6 and spec 17 §2.2.
2. (Trivial) Repair the Unicode replacement character in the §3 ASCII diagram (line 281).

**Downstream readiness:** Specs 15 (TEST-02), 16 (TEST-03), and 17 (TEST-04) are already authored and their back-references to the master spec resolve cleanly. The master spec is now the single architectural anchor for the data-driven engine philosophy across the spec set.

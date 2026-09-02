# Testability Integration Review

> **Round-7 resolution note (2026-09-02):** All six issues found by this review are now RESOLVED — Issue #1 (MAJOR, `exportFCPXML` command gap) via the spec 15 Round-7 amendment (§4.3.74-76 Export category + §14.11 output-exception design; spec 10's T3.2 un-gated); Issue #2 (audio fixture name) and Issue #3 (unregistered fixtures) via the Round-7 registration pass (spec 17 §5.3/§5.5 now carries all 15 new rows incl. a namespacing convention); Issues #4-#6 (cosmetic) fixed in place (spec 15 §13.5/§13.6 refresh, spec 04 `wysiwyg` test name, spec 03 audio coverage acknowledged). A NEW instance of the Issue-#1 class was found and fixed in the same round (spec 09's `renameProject`/`deleteProject` — now spec 15 §4.3.77-78). This document is preserved as the Round-6 historical record; see `INTEGRATION-REVIEW-R7.md` for the current state.

**Reviewer:** general-purpose (TEST-INTEGRATION)
**Date:** 2026-08-22
**Scope:** Final integration review for the testability refinement (data-driven engine architecture + wire protocol + keyboard shortcuts + overall test plan + 12 per-spec testing facets)

---

## Summary

| Metric | Value |
|---|---|
| Cross-stream checks performed | 10 |
| Inconsistencies found | 6 (1 MAJOR acknowledged, 5 MINOR) |
| Specs with Testing sections | 12 / 12 ✅ |
| Per-spec Testing sections following spec 17 §4 template | 12 / 12 ✅ |
| WYSIWYG invariants covered | 3 / 3 ✅ (state, pixel, audio) |
| Verdict | ✅ READY FOR FINAL SIGN-OFF (with non-blocking follow-ups) |

The testing layer is internally consistent and cross-referenced correctly. The one MAJOR issue (`exportFCPXML` EngineCommand gap) is **explicitly acknowledged** in spec 10 (lines 2023-2031) and spec 16 (§0.2 + §3.9 attribution), with the affected state-WYSIWYG test gated behind the command addition — so it does not silently break CI. All MINOR issues are cosmetic or low-impact and can be addressed post-sign-off.

---

## Per-check results

### Check 1 — All 12 specs have Testing sections ✅

Verified via `grep -nE "^##+\s*[0-9]*\.?\s*Testing"` across all 12 refined specs:

| Spec | Heading | Line |
|---|---|---|
| `01-core-engine.refined.md` | `## Testing` | 2108 |
| `02-workers-threading.refined.md` | `## Testing` | 2493 |
| `03-playback-engine.refined.md` | `## Testing` | 2371 |
| `04-renderer-color.refined.md` | `## 17. Testing` | 2084 |
| `05-timeline.refined.md` | `## Testing` | 1428 |
| `06-nle-ops.refined.md` | `## Testing` | 2908 |
| `07-composition.refined.md` | `## Testing` | 1655 |
| `08-color-grading.refined.md` | `## 19. Testing` | 2056 |
| `09-project-model.refined.md` | `## Testing` | 2465 |
| `10-fcpxml-export.refined.md` | `## Testing` | 1863 |
| `11-cloud-render.refined.md` | `## Testing` | 2385 |
| `12-testing-strategy.refined.md` | `## Testing` | 2362 |

**All 12 specs have Testing sections.** Specs 04 and 08 use numbered headings (`## 17. Testing`, `## 19. Testing`) to preserve their pre-existing numbered-section structure (their seed specs already had `## 12. Test Plan` / `## 14. Test Plan`); the other 10 use plain `## Testing` per spec 17 §4's template. **Cosmetic divergence only** — content is identical in shape. See Issue #5 below.

---

### Check 2 — Testing sections follow spec 17 §4 template ✅

Spot-checked 4 specs (01, 04, 06, 10). Spec 17 §4.1 mandates six sub-sections: Tier 1 / Tier 2 / Tier 3 / Property-based / Test assets / Test commands.

| Spec | Tier 1 | Tier 2 | Tier 3 | Property | Assets | Commands |
|---|---|---|---|---|---|---|
| 01-core-engine | ✅ L2115 | ✅ L2132 | ✅ L2142 | ✅ L2153 | ✅ L2161 | ✅ L2172 |
| 04-renderer-color | ✅ L2092 | ✅ L2139 | ✅ L2233 | ✅ L2258 | ✅ L2294 | ✅ L2326 |
| 06-nle-ops | ✅ L2925 | ✅ L3150 | ✅ L3190 | ✅ L3252 | ✅ L3290 | ✅ L3336 |
| 10-fcpxml-export | ✅ L1878 | ✅ L1992 | ✅ L2019 | ✅ L2124 | ✅ L2156 | ✅ L2201 |

All 4 spot-checked specs include all 6 template elements. Spot-checks also confirmed each Testing section opens with the mandated block-quote cross-reference to `17-test-plan.md`.

---

### Check 3 — EngineCommand types consistent ✅ (with 1 acknowledged gap)

Verified against spec 15 §4.1 (73-type discriminated union, lines 161-249) + §4.3 (type discriminator strings).

| Spec | Required reference | Verified |
|---|---|---|
| 01-core-engine | `engine.command.apply()` + various command types | ✅ L2122 explicitly enumerates "73 EngineCommand variants in spec 15 §4.1"; tests use `{ type: 'split' }`, `{ type: 'undo' }`, `{ type: 'redo' }` — all in spec 15 §4.1 |
| 05-timeline | split / trim / move commands | ✅ L1554-1602 uses `{ type: 'split' }`, `{ type: 'delete' }`, `{ type: 'duplicate' }`, `{ type: 'insert' }`, `{ type: 'move' }`, `{ type: 'trim' }` — all match spec 15 §5.1.1-§5.1.13 discriminators |
| 06-nle-ops | all NLE op commands | ✅ L3204-3245 covers `split`, `delete`, `ripple`, `roll`, `slip`, `slide`, `move`, `trim`, `rateStretch`, `retime`, `freezeFrame`, `rangeRemoval` — all 14 NLE op types from spec 15 §4.1 |
| 09-project-model | project load / save commands | ✅ L2618-2938 uses `{ type: 'saveProject' }`, `{ type: 'createProject' }`, `{ type: 'closeProject' }`, `{ type: 'loadProject' }` — match spec 15 §4.3.30-33 |
| 10-fcpxml-export | `exportFCPXML` | ⚠️ See Issue #1 — `exportFCPXML` is **NOT** in spec 15's 73-type union. Spec 10 acknowledges this gap (lines 2023-2031) and gates the state-WYSIWYG test T3.2 behind the command addition. Spec 16 §0.2 + §3.9 attribution also document `exportFCPXML` as a spec-16 UI-layer extension outside spec 15's scope. |

---

### Check 4 — Keyboard shortcuts consistent ✅

Verified against spec 16's binding tables (§3.1 playback, §3.3 timeline, §3.4-3.7 ops, §3.11 effects/color).

| Spec | Required shortcuts | Verified |
|---|---|---|
| 03-playback | Space, J/K/L, arrows | ✅ L2581 `Space`, L2587 `J`/`K`/`L`, L2594-2604 `ArrowRight`/`ArrowLeft`/`Shift+ArrowRight`/`Cmd+ArrowLeft`/`Cmd+ArrowRight` — all match spec 16 §3.1 rows 1-14 |
| 05-timeline | Cmd+B, Delete, Backspace, etc. | ✅ L1554 `Cmd+B` split, L1557 `Delete` delete, L1560 `Backspace` ripple delete, L1563 `Cmd+D` duplicate, L1567 `Cmd+C`/`Cmd+V`, L1571 `Cmd+X`, L1593 `,`/`.` nudge, L1598 `[`/`]` trim — all match spec 16 §3.3 |
| 06-nle-ops | all op shortcuts | ✅ L3204 `Cmd+B` split, L3207 `Cmd+Shift+B` split-all, L3209 `Q` split-and-remove-left, L3211 `W` split-and-remove-right, L3213 `Delete` delete, L3214 `Backspace` ripple delete, L3216 `Shift+Delete` alt ripple-delete, L3219 `[`/`]` trim, L3223 `Option+[`/`Option+]` ripple trim, L3225 `,`/`.` nudge — all match spec 16 §3.4-§3.7 |
| 08-color-grading | 1-9 for presets | ✅ L2323 references pressing `1` for apply preset 1; cross-references spec 04's `keyboard-1-through-9-applies-effect-preset` test (spec 04 L2240); spec 16 §3.11 row 1 (`1`-`9` → `addEffect`) |

---

### Check 5 — Three-tier methodology consistent ✅

Verified all 12 per-spec Testing sections use the same three-tier classification.

| Tier | Definition (spec 17 §2.1) | Verified across specs |
|---|---|---|
| Tier 1 | Pure engine — Vitest, Node only, no browser | ✅ Every spec's Tier 1 cites `[Filename: tests/unit/NN-.../*.test.ts]` with "Vitest, Node only" annotation |
| Tier 2 | Render — Playwright + headless Chrome | ✅ Every spec's Tier 2 cites `[Filename: tests/integration/NN-.../*.render.test.ts]` with Playwright/headless Chrome annotation |
| Tier 3 | UI — Playwright + keyboard | ✅ Every spec's Tier 3 cites `[Filename: tests/integration/NN-.../*.ui.test.ts]` with `page.keyboard.press()` recipe |

Tier ordering is consistent (1 → 2 → 3) in all 12 specs. The "Tier 1 is PRIMARY path" guidance from spec 17 §2.3 (Tier coverage map) is reflected where appropriate: spec 06 L2916 ("Tier 1 is the PRIMARY testing path for NLE ops"), spec 05 L1436 ("Primary testing path: Tier 3 (keyboard-driven)").

---

### Check 6 — WYSIWYG tests present ✅ (with 1 soft gap)

Verified the three WYSIWYG invariants (spec 17 §6.1-§6.3) are tested in the expected specs.

| Invariant | Definition | Expected in | Verified |
|---|---|---|---|
| **State WYSIWYG** (keyboard == direct API → identical state) | spec 17 §6.1 | 01, 03, 05, 06 | ✅ **01** L2139 `interactive-vs-render-engine-produce-identical-state`, L2146 "state WYSIWYG", L2151 `state-wysiwyg-keyboard-split-equals-direct-apply`; **03** L2605 `keyboard-state-wysiwyg-vs-direct-apply`, L2610 "keyboard == direct API, byte-for-byte"; **05** L1548 "Every test below asserts state WYSIWYG", L1629 `keyboard-state-wysiwyg-for-every-shortcut`; **06** L3201 "state WYSIWYG, see 17-test-plan.md §6.1", L3246 `state-wysiwyg-every-shortcut` |
| **Pixel WYSIWYG** (browser == cloud → 0% diff) | spec 17 §6.2 | 04, 07, 11 | ✅ **04** L671 "0% difference required", L2215 `wysiwg-browser-render-equals-cloud-render` (note: minor typo `wysiwg` → `wysiwyg`, cosmetic only); **07** L2079 "Cloud render WYSIWYG (spec 17 §6.2 — browser == cloud pixel diff)", L2081 `cloud-render-wysiwyg-multi-track-blend-frame-0`, L2090 `cloud-render-wysiwyg-transition-frame-15`; **11** L799 "P_browser === P_cloud (bit-identical)", L814 "TRUE WYSIWYG", L821 strict contract |
| **Audio WYSIWYG** (real-time == offline → bit-identical PCM) | spec 17 §6.3 | 02, 03, 11 | ✅ **02** L2540 `audioworklet-varispeed-preserves-pitch-offline` (cross-references spec 17 §6.4, asserts offline PCM's FFT peak matches real-time peak within ±1 Hz — partial coverage, not bit-identical); **11** L2426 `audio-wysiwyg-realtime-vs-offline-bit-identical-pcm` (canonical bit-identical PCM test); **03** uses `OfflineAudioContext` (L2459, L2483) for varispeed pitch tests but does NOT have a direct bit-identical PCM test (only FFT peak match). See Issue #6. |

**Soft gap:** spec 03 doesn't have an explicit `audio-wysiwyg-realtime-vs-offline-bit-identical-pcm` test, but the invariant is adequately covered by specs 02 and 11. See Issue #6.

---

### Check 7 — Test assets consistent ✅ (with 2 minor naming mismatches)

Verified against spec 17 §5.1 (solid-color video), §5.2 (frequency-tone audio), §5.3 (test project JSON).

| Asset class | Canonical name (spec 17 §5.x) | Used consistently? |
|---|---|---|
| Solid-color clips | `10s-red-1080p.mp4`, `10s-green-1080p.mp4`, `10s-blue-1080p.mp4`, `10s-white-1080p.mp4`, `10s-black-1080p.mp4`, `10s-gray-18-1080p.mp4`, `10s-gradient-h-1080p.mp4`, `10s-smpte-bars-1080p.mp4`, `10s-red-1080p-10bit.mp4`, `10s-white-1080p-hdr-pq.mp4`, `10s-white-1080p-hdr-hlg.mp4` | ✅ All 12 specs reference these canonical names |
| Audio tones | `10s-440hz-sine.wav`, `10s-1000hz-sine.wav`, `10s-100hz-sine.wav`, `10s-10000hz-sine.wav` | ⚠️ Spec 06 uses **`440hz-tone-10s.wav`** (L3176, L3321) instead of canonical `10s-440hz-sine.wav`. Specs 02, 03, 12 all use canonical name. See Issue #2. |
| Test projects | `simple-cut.json`, `multi-track-blend.json`, `with-transitions.json`, `with-color-grade.json`, `with-lut.json`, `with-varispeed.json`, `10-track-100-clip.json`, etc. | ⚠️ Spec 06 introduces **`multi-track.json`** (L3297, "5 tracks, 10 clips") and **`all-ops.json`** (L3300) — neither registered in spec 17 §5.3. Spec 17 §4.3 anti-pattern explicitly forbids "Inventing new fixture names". See Issue #3. |

---

### Check 8 — Master spec Decision 9 reflected ✅

| Required reflection | Verified |
|---|---|
| Spec 01 mentions `engine.command.apply()` as canonical entry point | ✅ Spec 01 L2122 `engine.command.apply(cmd)` is the dispatch entry; L2127 enumerates "for each of the 73 `EngineCommand` variants in spec 15 §4.1"; L2139, L2151 use `engine.command.apply()` in test assertions |
| Spec 15 defines the EngineCommand union | ✅ Spec 15 §4.1 L161-249 — 73 types organized in 15 categories; §4.2 maps each to a manager method; §4.3 defines each type's `params` schema |
| Spec 17 uses EngineCommand in Tier 1 tests | ✅ Spec 17 L38-39 "the shape of the test (construct `EngineCommand[]`, apply via `engine.command.apply()`, assert on `SceneState`)"; L218-219 "How: construct an `EngineCommand[]`, apply via `engine.command.apply(cmd)`, assert on the resulting `SceneState`"; L274 "input into `EngineCommand`s"; L278 `engine.command.apply({ type: 'split', params: { ... } })` |

Master spec Decision 9 (§2 L222-272) and §13 Testability Strategy (L543-616) are reflected in all three downstream specs.

---

### Check 9 — Cross-references work ✅

| Cross-reference | Verified |
|---|---|
| Spec 00 references specs 15, 16, 17 | ✅ Master spec L269-271 (Decision 9 elaboration: "New specs that elaborate this decision"); L457-459 (stream map rows 13-15, all tagged Decision 9); L360 (tech stack "Engine wire protocol" row → `15-wire-protocol.md`); L474 (§9 testing summary → §13 + `17-test-plan.md`); L535-536 (glossary `ProjectJSON` / `EngineCommand` → `15-wire-protocol.md`) |
| Spec 15 references spec 01 (EditorCore.command.apply) | ✅ Spec 15 L6 (predecessor: `01-core-engine.refined.md`); L17 ("manager method signatures in spec 01 §3.3 are inferred from (and constrained by) the schema here"); L43 (architecture diagram: "EditorCore (managers + engine core) ← spec 01"); L113, L265, L294, L300, L383 (manager method cross-references to spec 01 §3.3) |
| Spec 15 references spec 09 (ProjectJSON) | ✅ Spec 15 L6 (predecessor: `09-project-model.refined.md`); L13, L25, L38 ("Layer 1 — Static Project State (ProjectJSON) ← spec 09"); L109 ("Defined in: `09-project-model.refined.md` §3.1"); L113, L115 (Layer 1 ↔ Layer 2 consumption pattern) |
| Spec 16 references spec 15 (EngineCommand types) | ✅ Spec 16 L8 (forward reference: "spec 15 §4 (canonical union) + §4.2 (canonical manager-method mapping)"); L35-39 (§0.2 Alignment with spec 15: 33 overlapping command types + 18 UI-layer extensions); L86 (glossary: "Canonical type is defined in spec 15 §4.1") |
| Spec 17 references spec 12 (infrastructure) | ✅ Spec 17 L31-32, L80, L82, L84, L86, L88-89, L98-167 (extensive spec 12 cross-references for runner config, fixtures, CI, helpers) |
| Spec 17 references spec 15 (EngineCommand) | ✅ Spec 17 L45-48 ("EngineCommand / CommandResult / EngineEvent JSON types used throughout this spec are defined canonically in `15-wire-protocol.md`") |
| Spec 17 references spec 16 (keyboard) | ✅ Spec 17 L407, L592, L1057 (cross-references to `16-keyboard-shortcuts.md`) |
| Per-spec Testing sections reference specs 15, 16, 17 | ✅ All 12 specs have at least one cross-reference to at least one of specs 15/16/17 (counts: 01→15×4,16×3,17×3; 02→15×1,17×5; 03→16×3,17×15; 04→16×2,17×6; 05→15×7,16×2,17×4; 06→15×1,16×3,17×8; 07→15×1,16×10,17×23; 08→15×5,16×6,17×6; 09→15×3,16×1,17×3; 10→15×2,17×8; 11→15×2,17×4; 12→17×10) |

---

### Check 10 — No duplication between spec 04 and spec 08 ✅

| Required coverage | Verified |
|---|---|
| Spec 04 Testing covers GPU pipeline (YUV→linear, blend modes, 10-bit precision) | ✅ Spec 04 §17 Tier 1: `srgb-to-linear-known-values`, `bt709-yuv-to-rgb-coefficients`, `bt2020-yuv-to-rgb-coefficients`, `transfer-function-srgb-eotf-formula`, `blend-mode-wgsl-index-matches-enum`, `ten-bit-round-trip-preserves-precision`, `pq-eotf-against-st-2084`, `hlg-oetf-against-bt-2100`; Tier 2: `yuv-to-linear-shader-p010-frame`, `ten-bit-round-trip-preserves-precision`, `opacity-50pct-blend-correct-in-linear`, `blend-multiply-red-times-green-equals-black`, `blend-screen-red-plus-green-equals-yellow`, `blend-all-17-w3c-modes-have-shader-coverage` |
| Spec 08 Testing covers grading tool semantics (color wheels params, LUT loading, qualifier) | ✅ Spec 08 §19 Tier 1: `cube-lut-parser-parses-valid-file`, `curve-baking-4-control-points-cubic-spline`, `color-wheels-uniform-packing-28-f32-112-bytes`, `qualifier-hsl-math-circular-hue-distance`, `power-window-point-in-rectangle-uv-space`, `power-window-point-in-ellipse-uv-space`; Tier 2: LUT banding / vibrance selectivity / contrast pivot preservation / master-curve luma-only / 16-bit LUT storage / 10-bit scope binning |
| No significant overlap | ✅ Spec 08 §19 has explicit "Boundary with spec 04 (renderer-color)" sub-section (L2064-2100) listing 13 tests owned by spec 04 with justifications: `exposure-plus-one-stop-doubles-linear`, `lut-identity-preserves-input`, `lut-srgb-conversion-round-trip`, `curves-swap-r-and-b-channels`, `color-wheels-known-lift-gamma-gain`, `qualifier-masks-red-region-at-hue-0deg`, `power-window-rectangular-left-half-only`, `real-time-color-wheel-drag-updates-grade-within-33ms`, `keyboard-1-through-9-applies-effect-preset`, `keyboard-cmd-1-through-9-switches-color-grading-panel`, `keyboard-shift-1-toggles-effect-1-enabled`, `srgb-linear-round-trip-fp-precision`, `lut-3d-identity-preserves-arbitrary-input`. Spec 08 explicitly does NOT re-state these — they are cross-referenced. |

The FACET-08 directive to avoid duplicating spec 04's GPU pipeline tests is **fully satisfied**.

---

## Issues found

### Issue #1 — MAJOR (acknowledged, gated): `exportFCPXML` not in spec 15's 73-type union

**Severity:** MAJOR — but explicitly acknowledged in spec 10 and spec 16; affected test gated.

**Evidence:**
- Spec 15 §4.1 (lines 161-249): the 73-type discriminated union ends with `SnapshotCommand;` (line 249). No `exportFCPXML`, `exportMaster`, or `exportFrame` types are defined.
- Spec 10 §Testing Tier 3 (lines 2023-2031): *"Note on `exportFCPXML` EngineCommand: the Tier 3 tests below reference `engine.command.apply({ type: 'exportFCPXML', params: { ... } })`. At the time of this spec's refinement, spec 15 §4.1 lists 73 EngineCommand types and `exportFCPXML` is **not** among them — it's a *proposed* addition tracked as a follow-up to FACET-10. Until that command is added, the UI tests assert against the function-based export path (`engine.export.exportFCPXML(project, opts)`) and the state-WYSIWYG test (T3.2 below) is gated behind the command addition."*
- Spec 10 §Testing Tier 3 test T3.2 (lines 2039-2045): `keyboard-cmd-e-matches-direct-engine-command` — would call `engine.command.apply({ type: 'exportFCPXML', params: { bundleMedia: false } })` directly, but is gated.
- Spec 16 §3.9 (line 301): `Cmd+E` → `{ type: 'exportFCPXML', params: { format: 'fcpxml-1.11' } }` listed in the "EngineCommand" column.
- Spec 16 §0.2 (line 37): *"Spec 16 additionally defines 18 UI-layer extensions — commands that fall outside spec 15's wire-protocol scope because they affect UI state (panel focus, workspace switch, timeline viewport zoom, snap toggle, ripple toggle) or are composite helpers (splitAndRemove, findPlayhead, join, toggleAVLink) or are out-of-scope for spec 15's wire protocol (export operations — exportFCPXML, exportMaster, exportFrame)."*
- Spec 16 §3.9 attribution (line 307): *"Spec 15 does not define export commands at all (out of wire-protocol scope, see spec 15 §13.7); these are spec-16 extensions."*

**Impact:** Spec 10's state-WYSIWYG test for `Cmd+E` (T3.2) cannot run as written until either (a) spec 15 §4.1 is amended to add `exportFCPXML` and related export commands to the union, or (b) spec 10's Tier 3 test is rewritten to compare the keyboard path against `engine.export.exportFCPXML()` (the function-based path) instead of `engine.command.apply({ type: 'exportFCPXML' })`. Spec 10's Tier 3 test T3.1 (`keyboard-cmd-e-triggers-fcpxml-export`) still works — it tests that the keyboard shortcut produces a download file that passes Zod schema validation.

**Recommended fix (post-sign-off, non-blocking):**
- Option A: amend spec 15 §4.1 to add `ExportFCPXMLCommand`, `ExportMasterCommand`, `ExportFrameCommand` to the union (74 → 76 types), define their `params` schemas in §4.3, and update spec 10's Tier 3 test T3.2 to remove the gating note.
- Option B (preferred): keep spec 15 focused on state-mutating commands and leave export as function-based; rewrite spec 10's Tier 3 test T3.2 to compare keyboard path against `engine.export.exportFCPXML()` directly (function-based baseline, not via `engine.command.apply()`). Update spec 16 §3.9's "EngineCommand" column header to "EngineCommand (or function call)" for the export rows to clarify the distinction.

---

### Issue #2 — MINOR: Audio fixture name mismatch in spec 06

**Severity:** MINOR — cosmetic naming inconsistency; no functional impact.

**Evidence:**
- Spec 17 §5.2 (line 862) defines the canonical name: `10s-440hz-sine.wav` ("440 Hz (A4), 10s, Standard reference tone").
- Spec 02 (L2527, L2528, L2539, L2576) uses `10s-440hz-sine.wav` ✅
- Spec 03 (L2482, L2653) uses `10s-440hz-sine.wav` ✅
- Spec 12 (L129, L130, L1692, L1696, L1700, L1711, L1726, L1800) uses `10s-440hz-sine.wav` ✅
- **Spec 06 (L3176, L3321) uses `440hz-tone-10s.wav`** ❌ — different word order (`440hz-tone-10s` vs `10s-440hz-sine`).

**Impact:** Test runner would fail to find the file at runtime because the filename doesn't match the canonical fixture path. Easy fix.

**Recommended fix:** rename spec 06's two references from `440hz-tone-10s.wav` to `10s-440hz-sine.wav`.

---

### Issue #3 — MINOR: Unregistered project fixtures in spec 06

**Severity:** MINOR — process violation of spec 17 §4.3 anti-pattern "Inventing new fixture names".

**Evidence:**
- Spec 17 §5.3 (lines 897-916) registers 16 canonical project fixtures: `simple-cut.json`, `multi-track-blend.json`, `with-transitions.json`, `with-color-grade.json`, `with-lut.json`, `with-varispeed.json`, `with-varispeed-2x.json`, `with-mask.json`, `audio-mix.json`, `audio-pan.json`, `10-track-100-clip.json`, `4k-5min.json`, `8k-1min.json`, `ntsc-23976.json`, `pal-25.json`, `hdr-pq.json`, `hdr-hlg.json`.
- Spec 06 references `simple-cut.json` ✅ and `10-track-100-clip.json` ✅ (both registered).
- **Spec 06 references `multi-track.json` (L3297, "5 tracks, 10 clips")** ❌ — not in spec 17 §5.3. Note that `multi-track-blend.json` (a different fixture: "2 tracks, red+green overlay") IS registered, but spec 06 needs a different fixture for multi-select/sync-lock testing.
- **Spec 06 references `all-ops.json` (L3300, "every op type represented")** ❌ — not in spec 17 §5.3.

**Impact:** Tests would fail to load these fixtures until they're added to `tests/fixtures/projects/`. The fixture-generation script in spec 12 §15.A wouldn't produce them.

**Recommended fix:** Propose `multi-track.json` and `all-ops.json` for inclusion in spec 17 §5.3 (add rows to the project fixture table) — or rename spec 06 to use existing canonical fixtures (e.g., refactor tests to use `multi-track-blend.json` + `10-track-100-clip.json` for the multi-select and stress cases).

---

### Issue #4 — MINOR: Spec 15 §13.5 oversimplification re: spec 16

**Severity:** MINOR — documentation drift, no functional impact.

**Evidence:**
- Spec 15 §13.5 (line 4460): *"Every keyboard shortcut maps to an `EngineCommand`."* — oversimplified.
- Spec 16 §0.2 (line 37) acknowledges 18 UI-layer extensions that do NOT go through `engine.command.apply()` (panel focus, workspace switch, timeline viewport zoom, snap toggle, ripple toggle, export operations, composite helpers).
- Spec 16 §3.9 attribution (line 307): *"Spec 15 does not define export commands at all (out of wire-protocol scope); these are spec-16 extensions."*

**Impact:** A reader who only consults spec 15 §13.5 would expect every shortcut to dispatch via `engine.command.apply()`. The actual behavior (18 shortcuts bypass apply) is documented in spec 16 but not in spec 15's cross-reference section.

**Recommended fix:** update spec 15 §13.5 to read: *"Most keyboard shortcuts map to an `EngineCommand` and dispatch via `engine.command.apply()`. Spec 16 additionally defines 18 UI-layer extensions (panel focus, workspace switch, snap/ripple toggles, export operations, composite helpers) that do NOT go through `engine.command.apply()` — these are routed to the UI store directly. See spec 16 §0.2 for the boundary."*

---

### Issue #5 — MINOR: Heading style inconsistency in specs 04 and 08

**Severity:** MINOR — cosmetic only; content is identical in shape.

**Evidence:**
- Spec 17 §4.1 template specifies: `## Testing` (plain heading, no number).
- Specs 01, 02, 03, 05, 06, 07, 09, 10, 11, 12 use `## Testing` (plain) ✅
- **Spec 04 uses `## 17. Testing`** (numbered, line 2084) ❌
- **Spec 08 uses `## 19. Testing`** (numbered, line 2056) ❌

**Impact:** None functional. Specs 04 and 08 preserved their pre-existing numbered-section structure (their seed specs had `## 12. Test Plan` / `## 14. Test Plan` already numbered; the Testing facet was added as a continuation of that numbering). A reviewer scanning for `## Testing` headings would miss specs 04 and 08 unless they use a more permissive regex.

**Recommended fix (optional):** either (a) renumber spec 04 §17 to `## Testing` and bump §18+ down by one, or (b) leave as-is — the divergence is documented here and doesn't affect content.

---

### Issue #6 — MINOR: Spec 03 missing explicit audio WYSIWYG bit-identical PCM test

**Severity:** MINOR — invariant adequately covered by specs 02 and 11; spec 03 only has pitch-preservation FFT tests.

**Evidence:**
- Spec 17 §6.3 (lines 1093-1144) defines the audio WYSIWYG invariant: *"For any project, rendering audio via the real-time path (`AudioContext`) must produce PCM samples byte-identical to rendering via the offline path (`OfflineAudioContext`)."*
- **Spec 11 L2426** has the canonical test: `audio-wysiwyg-realtime-vs-offline-bit-identical-pcm` (renders `varispeed.json` via both paths; Float32Array outputs compared sample-by-sample). ✅
- **Spec 02 L2540** has partial coverage: `audioworklet-varispeed-preserves-pitch-offline` (renders via `OfflineAudioContext`; cross-references spec 17 §6.4; asserts offline PCM's FFT peak matches real-time peak at 440 Hz ± 1 Hz). This verifies pitch preservation, not bit-identical PCM. ✅ (partial)
- **Spec 03** uses `OfflineAudioContext` (L2459 for AV drift test; L2483 for varispeed pitch test) but does NOT have a direct real-time-vs-offline bit-identical PCM comparison. ⚠️

**Impact:** Low. The canonical bit-identical PCM test exists in spec 11. Spec 03's varispeed pitch tests implicitly exercise both paths but don't assert bit-equality. If the audio graph diverges between real-time and offline paths in a way that preserves pitch but changes samples (e.g., different dithering, different block sizes), spec 03's tests would not catch it — but spec 11's test would.

**Recommended fix (optional):** add a Tier 2 test to spec 03: `varispeed-realtime-vs-offline-bit-identical-pcm` — render the varispeed test fixture via both `AudioContext` and `OfflineAudioContext`, assert bit-identical `Float32Array` outputs. This duplicates spec 11's coverage at the playback-module layer (defense in depth) but is not strictly necessary.

---

## Recommendation

### ✅ READY FOR FINAL SIGN-OFF (with non-blocking follow-ups)

The testing layer is **internally consistent and cross-referenced correctly**. All 10 cross-stream checks pass, with 6 issues found:

- **1 MAJOR** (Issue #1, `exportFCPXML`) — **acknowledged and gated**. Spec 10 explicitly states the state-WYSIWYG test T3.2 is "gated behind the command addition" until spec 15 is amended or spec 10 is rewritten. This is not a silent CI breaker — the gating is documented in the spec itself.
- **5 MINOR** (Issues #2-#6) — cosmetic or low-impact. None affect the correctness of the test plan; they're naming/registration/documentation cleanups.

The 12 per-spec Testing sections all follow the spec 17 §4 template (Tier 1 / Tier 2 / Tier 3 / Property-based / Test assets / Test commands). All three WYSIWYG invariants (state, pixel, audio) are tested in the expected specs. The boundary between spec 04 (GPU pipeline) and spec 08 (grading tool semantics) is explicitly documented with a 13-test ownership table.

### Recommended next actions (post-sign-off, non-blocking)

1. **Issue #1** — amend spec 15 to add `ExportFCPXMLCommand` (and optionally `ExportMasterCommand`, `ExportFrameCommand`) to the EngineCommand union, OR rewrite spec 10 Tier 3 test T3.2 to compare against `engine.export.exportFCPXML()` directly. Either way, remove the gating note in spec 10 lines 2023-2031.
2. **Issue #2** — rename spec 06's `440hz-tone-10s.wav` references to `10s-440hz-sine.wav` (2-line edit).
3. **Issue #3** — propose `multi-track.json` and `all-ops.json` for inclusion in spec 17 §5.3's canonical project fixture table.
4. **Issue #4** — update spec 15 §13.5 to acknowledge spec-16 UI-layer extensions.
5. **Issue #5** — (optional cosmetic) renumber spec 04 §17 / spec 08 §19 to plain `## Testing` for template conformance.
6. **Issue #6** — (optional defense-in-depth) add a bit-identical PCM audio WYSIWYG test to spec 03.

### Recommended CI regression check

Add a periodic CI job (weekly) that runs the 10 cross-stream checks in this review against the spec files (grep-based assertions) to catch future drift if the specs are edited during implementation. Suggested script: `tests/integration/spec-consistency.spec.ts` — runs grep checks for Issues #2-#5 (Issues #1, #6 require human judgement).

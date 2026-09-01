# Audit Report: 17-test-plan.md

**Auditor:** general-purpose
**Spec under audit:** `17-test-plan.md` (2,555 LOC)
**Authoring task:** TEST-04 (worklog lines 2126–2173)
**Date:** 2026-08-22
**Stream:** Audit overall test plan (AUDIT-TEST-04)

## Summary

- Total spot-checks performed: 17 (all required by task description) + 6 supplementary cross-reference verifications
- Verified accurate: 14 substantive spot-checks fully pass
- Verified with minor issues: 3 spot-checks pass on substance but contain a defect
- Verified inaccurate: 0
- Cross-reference errors found: 3 (spec 12 §13 should be §12; spec 16 missing; §3.2 → §15.3 dangling)
- Internal inconsistencies found: 3 (§6.4 vs §9.2/§9.3 WYSIWYG cadence; §9.3 vs spec 12 §17.1 cron time; §6.3 vs §6.4 "cross-cutting" vs "Tier 2")
- Stale content found: 1 (§0 "Decision 9 may or may not be added" — already added by TEST-01)
- Worklog-vs-actual count discrepancies: 3 (matrix 35→47; concern table 16→21; checklist 9→10 — all directionally more comprehensive)

## Verdict: ✅ PASS-WITH-MINOR-ISSUES

`17-test-plan.md` is an **overwhelmingly accurate and comprehensive** umbrella test plan. All 17 required spot-check items are present and substantively correct. The methodology (§2), matrix (§3), per-module template (§4), asset design (§5), WYSIWYG invariants (§6), property-based strategy (§7), performance methodology (§8), CI integration (§9), reference regeneration (§10), asset generation (§11), manual matrix (§12), triage process (§13), per-spec relationship (§14), open questions (§15), and implementation checklist (§16) are all defined with concrete code, tables, and thresholds.

The spec is in fact **more comprehensive than the worklog and audit task anticipated**:
- Matrix has **47 feature rows** (audit expected ~35; worklog claims 35)
- §1.4 concern-mapping table has **21 rows** (worklog claims 16)
- §14.4 author checklist has **10 items** (worklog claims 9)
- §9 CI job graph has **9 distinct jobs** across 4 scheduling tiers (audit expected 4)
- §9.4 has **4 runner labels** (audit expected 2)

These over-counts are not defects — they indicate the spec exceeds its stated scope, which is a positive.

**8 minor issues** were identified, none of which block implementation or invalidate the methodology. They are: (1) stale forward-looking phrasing in §0 about Decision 9; (2) missing cross-reference to spec 16; (3) cross-ref error §1.4 says "12 §13" should be "12 §12"; (4) dangling §3.2→§15.3 reference and technically incorrect Chrome flag claim; (5) §6.4 overclaims "all 3 WYSIWYG run on every PR" — pixel runs on main only; (6) §9.3 cron time "0 0 * * *" disagrees with spec 12 §17.1 "0 7 * * *"; (7) §16.6 Phase 5 checklist omits 5 of 12 manual tests; (8) §6.1 State WYSIWYG doesn't cross-reference Decision 9 (which master spec §7.1 explicitly says it extends).

Recommended fix priority: P3 (cosmetic / forward-reference hygiene). No re-audit required after fixes.

---

## Spot-check results

### Check 1 — Three-tier methodology (§2) ✅ PASS

**Claim:** §2 documents three tiers (Pure engine / Render / UI) with speed/flakiness/coverage columns.

**Verification:**
- §2.1 defines all three tiers with concrete runner/speed/determinism/coverage/file-location bullets:
  - Tier 1: Vitest (Node, no browser); ~1000+ tests/<30s; 100% deterministic; coverage = NLE ops, color math, time math, project model, command pattern, OPFS
  - Tier 2: Playwright + headless Chrome (WebGPU); ~100 tests/~10min; 99%+ deterministic; coverage = renderer output, color pipeline, composition, effects, scopes, varispeed, cloud render WYSIWYG
  - Tier 3: Playwright with `page.keyboard.press()`; ~50 tests/~5min; 95%+ deterministic; coverage = keyboard shortcuts, mouse, drag-drop, component state
- §2.4 trade-offs table has columns: Speed (per test), Total suite time, Determinism (≈ flakiness), Catches [engine/renderer/UI/color/timing] bugs (≈ coverage), Requires GPU/browser/audio, CI runner, Cost per PR.
- §2.2 also defines 4 cross-cutting test types (WYSIWYG, property, performance, manual) and §2.3 provides an ASCII coverage map across all 6 dimensions.

**Verdict:** ✅ ACCURATE. Substance is conveyed. Column names differ slightly from the audit's "speed/flakiness/coverage" phrasing — "Determinism" stands in for flakiness, and "Catches [type] bugs" rows serve as coverage indicators. This is a more informative breakdown than the audit's literal phrasing.

---

### Check 2 — Test matrix (§3) ✅ PASS (count: 47 rows, exceeds expected ~35)

**Claim:** §3 has a feature × tier table with ~35 rows; coverage is comprehensive.

**Verification:**
Counted feature rows in §3.1 by extracting every `| ` line between `### 3.1` and `### 3.2` headers, excluding header and separator:

- Math/color (rows 1–5): MediaTime, FrameRate, Color space conversion, Transfer functions, YUV/RGB matrix
- NLE ops (rows 6–17): Split, Trim, Ripple, Roll, Slip, Slide, Delete, Insert, Rate stretch, Retime, Freeze frame, Range removal
- Composition/effects (rows 18–26): Multi-track blend, Opacity, Transitions, Masks, Color wheels, Curves, LUT, Qualifier, Scopes
- Playback/scrub (rows 27–29): Playback frame accuracy, Varispeed, Scrubbing latency
- UI interactions (rows 30–32): Keyboard shortcuts, Mouse interactions, Drag-and-drop
- Undo/persistence (rows 33–36): Undo/redo, Project save/load, Schema migration, OPFS persistence
- FCPXML (rows 37–38): FCPXML export, FCPXML import
- WYSIWYG (rows 39–41): Cloud render pixel, State, Audio
- Performance (rows 42–44): Memory ceiling 4K, Render time, Memory ceiling 8K
- Engine infra (rows 45–47): Worker lifecycle, WebGPU device loss recovery (⚠️ partial), AudioWorklet message protocol

**Total: 47 feature rows** (vs. audit's expected "~35" and worklog's claim of "35-row").

**Verdict:** ✅ ACCURATE & COMPREHENSIVE — 47 rows > 35. The matrix exceeds the audit's expectation. Coverage is genuinely comprehensive: every architectural surface (math, ops, render, UI, persistence, export, WYSIWYG, performance, infra) is mapped to every applicable tier.

**Discrepancy with worklog:** Worklog line 2139 claims "35-row test matrix"; actual count is 47. This is a worklog undercount — the spec is more comprehensive than the worklog records. Not a defect in the spec.

---

### Check 3 — Per-module template (§4) ✅ PASS

**Claim:** §4 provides a markdown template with Tier 1/2/3 tests, property-based tests, test assets, test commands.

**Verification:**
§4.1 template includes all 6 required subsections (verified verbatim at lines 547–631):
- `### Tier 1: Pure engine tests` (lines 552–563) ✓
- `### Tier 2: Render tests` (lines 565–575) ✓
- `### Tier 3: UI tests` (lines 577–588) ✓
- `### Property-based tests` (lines 590–600) ✓
- `### Test assets` (lines 602–610) ✓
- `### Test commands` (lines 612–631) ✓

§4.2 provides a worked example for spec 06 (NLE ops) with ~16 Tier 1 tests, 3 Tier 2 tests, 7 Tier 3 tests, 8 property tests, 6 fixtures, 5 npm commands. §4.3 lists 5 anti-patterns (mixing tiers, inventing fixture names, philosophical justifications, duplicating matrix, silent tier skipping).

**Verdict:** ✅ ACCURATE — all 6 required template subsections present.

---

### Check 4 — Test asset design (§5) ✅ PASS

**Claim:** §5 documents solid-color video clips (incl. red, green, blue, white, black, gray, gradients, SMPTE bars), frequency tone audio clips (440Hz, 1000Hz, 100Hz, white/pink noise), test project JSON files (simple-cut, multi-track-blend, with-transitions, etc.), reference render outputs.

**Verification:**
- §5.1 (lines 799–825) — 14 solid-color clips: red, green, blue, white, black, gray-50, gray-18, gradient-h, gradient-v, gradient-d, SMPTE bars, plus 10-bit/HDR variants (red-10bit, white-hdr-pq, white-hdr-hlg). All have sRGB hex + linear values + purpose. ✓
- §5.2 (lines 855–883) — 9 audio clips: 440Hz, 1000Hz, 100Hz, 10000Hz, white noise, pink noise, chirp (20Hz→20kHz), stereo-left-440, stereo-right-440. All have frequency/duration/purpose. ✓
- §5.3 (lines 885–912) — 17 test project JSON files: simple-cut, multi-track-blend, with-transitions, with-color-grade, with-lut, with-varispeed, with-varispeed-2x, with-mask, audio-mix, audio-pan, 10-track-100-clip, 4k-5min, 8k-1min, ntsc-23976, pal-25, hdr-pq, hdr-hlg. ✓
- §5.4 (lines 914–945) — per-platform reference PNG storage (linux-nvidia/macos-m2/windows-d3d12), with frame selection rationale (frames 0, 30, 100, 500, 1000). ✓
- §5.5–§5.7 also cover test LUTs (6 LUTs), fonts/overlays, and storage strategy (manifest.json + SHA-256; references ARE in git for PR review).

**Verdict:** ✅ ACCURATE — all 4 required asset categories documented, plus LUTs/fonts/storage.

---

### Check 5 — Three WYSIWYG invariants (§6) ✅ PASS

**Claim:** §6 documents State WYSIWYG (Tier 3), Pixel WYSIWYG (Tier 2), Audio WYSIWYG (cross-cutting), each with code examples.

**Verification:**
- §6.1 State WYSIWYG (lines 1004–1057): invariant = "for any EngineCommand[] sequence, applying via direct API must produce SceneState byte-identical to applying via UI path". Includes full TypeScript test code (lines 1021–1048) using `engine1.command.apply({type:'split', params:{...}})` (direct API) vs `page.keyboard.press('Meta+b')` (UI path), then `expect(state1).toEqual(state2)`. ✓
- §6.2 Pixel WYSIWYG (lines 1059–1085): invariant = "browser interactive engine must produce pixels byte-identical to cloud render engine". Tolerance = 0% for same-GPU; per-platform references for cross-GPU. References spec 12 §7 for canonical implementation. ✓
- §6.3 Audio WYSIWYG (lines 1087–1137): invariant = "real-time AudioContext must produce PCM byte-identical to OfflineAudioContext". Includes full TypeScript test code (lines 1102–1125) with `renderAudioRealtime()` vs `renderAudioOffline()` and per-sample `expect(realtimePcm[i]).toBe(offlinePcm[i])`. ✓
- §6.4 (lines 1139–1148) documents schedule. §6.5 documents what WYSIWYG does NOT verify (engine contract, not feature correctness).

**Verdict:** ✅ ACCURATE — all 3 invariants present with concrete code.

---

### Check 6 — Property-based testing (§7) ✅ PASS

**Claim:** §7 documents invariant catalogue (no overlaps, no negative durations, source bounds, locked tracks, undo involutive), fast-check arbitrary generators, numRuns budget, shrinking strategy.

**Verification:**
- §7.2 invariant catalogue (lines 1184–1198): **13 invariants** confirmed by row count. Includes:
  - #2 "No overlapping elements after op" (audit's "no overlaps") ✓
  - #8 "No zero-duration elements" (audit's "no negative durations" — `duration > 0` excludes negatives) ✓
  - #3 "Source bounds respected" ✓
  - #4 "Locked tracks not modified" ✓
  - #5 "Undo restores exact state" (audit's "undo involutive") ✓
  - Plus: preserves total duration, element IDs preserved/unique, track type invariant, ordering preserved, ripple invariant, idempotency at boundaries, coalescing invariant.
- §7.3 (lines 1200–1293): full `fast-check` arbitrary generators for `MediaTime`, `FrameRate`, `arbitraryVideoElement`, `arbitraryVideoTrack`, `arbitrarySceneState`, `arbitrarySplitParams`, `arbitraryTrimParams`, `arbitraryOp`. ✓
- §7.5 (lines 1357–1365): numRuns budget = 1000 (fast) / 100 (slow, engine-instantiation) / 5000 (thorough, nightly). ✓
- §7.6 (lines 1367–1381): shrinking explanation with example `seed/path/counterexample` output and `fc.assert(..., { seed: -1234567890 })` for reproducibility. ✓
- §7.7 (lines 1383–1399): property tests for non-NLE-op modules (undo involutive, seek idempotent, renderer pure, LUT composition, project round-trip). ✓

**Verdict:** ✅ ACCURATE — all 4 required sub-items present.

---

### Check 7 — Performance methodology (§8) ✅ PASS

**Claim:** §8 documents playback FPS (≥28fps), scrub latency (<50ms p95), memory ceiling (<2GB for 4K), render time (<2x realtime for 4K), 8K render test.

**Verification:**
§8.2 inventory table (lines 1432–1443) contains **12 performance tests** with thresholds:
- Playback FPS: ≥28fps (2-frame slack) ✓
- Dropped frames: <5 dropped ✓
- Scrub latency p50: <30ms ✓
- Scrub latency p95: <50ms ✓ (audit-required)
- Scrub latency p99: <100ms (nightly only) ✓
- Memory (4K editing): <2GB ✓ (audit-required)
- Memory (cloud render 8K): <4GB ✓
- 4K render time: <10min (2x realtime for 5-min content) ✓ (audit-required)
- 8K render time: <30min ✓ (audit-required)
- Engine boot: <2s ✓
- Project load: <1s for 100-clip ✓
- FCPXML export: <2s ✓

§8.3 provides full implementation patterns (TypeScript code) for FPS / scrub latency / memory ceiling / render time. §8.4 splits PR-scope vs nightly scheduling. §8.5 documents 6 reliability mitigations (warmup, multiple samples, generous thresholds, no parallelism, no retries on nightly, GC exposure). §8.6 documents what perf tests do NOT verify (perceived smoothness, audio glitching, cold start).

**Verdict:** ✅ ACCURATE — all 5 audit-required thresholds present, plus 7 additional perf tests.

---

### Check 8 — CI integration (§9) ✅ PASS

**Claim:** §9 documents GitHub Actions workflow, 4 job types, runner types, timing budgets.

**Verification:**
- §9.1 strategy (lines 1596–1610): defines 7 distinct job→runner mappings (tier1 ubuntu-latest, tier2 ubuntu-latest+lavapipe OR self-hosted GPU, tier3 ubuntu-latest, wysiwyg-pixel self-hosted GPU, wysiwyg-audio ubuntu-latest, performance self-hosted GPU nightly, cloud-render-4k/8k self-hosted GPU nightly).
- §9.2 ASCII job graph (lines 1613–1648): **9 distinct jobs** across 4 scheduling tiers:
  - PR-on (4): tier1-engine, tier2-render, tier3-ui, wysiwyg-audio
  - main-on (1): wysiwyg-pixel
  - nightly (3): performance, cloud-render-4k, cloud-render-8k
  - manual (1): regen-references
- §9.3 workflow structure (lines 1650–1673): 6 structural decisions, references spec 12 §17.1 for canonical YAML.
- §9.4 runner labels (lines 1675–1686): **4 runner types** — `ubuntu-latest`, `[self-hosted, linux, x64, gpu]`, `[self-hosted, macos, arm64, gpu]`, `[self-hosted, windows, x64, gpu]`.
- §9.5 npm scripts (lines 1688–1718): 14 scripts (test, test:watch, test:tier1, test:tier2, test:tier3, test:render, test:ui, test:property, test:property:thorough, test:wysiwyg, test:wysiwyg-pixel, test:wysiwyg-audio, test:performance, test:render-4k, test:render-8k, test:nightly, test:smoke, test:all, regen-references, generate-test-assets).
- §9.6 time budget table (lines 1722–1733): ~16min per PR, ~75min nightly.

**Verdict:** ✅ ACCURATE — spec exceeds audit's "4 job types / 2 runner types" expectation (9 jobs / 4 runners). Substance matches all required items.

---

### Check 9 — Reference regeneration (§10) ✅ PASS

**Claim:** §10 documents `npm run regen-references`, PR-based review process, never-auto-merge safety rail.

**Verification:**
- `npm run regen-references` defined in §9.5 (line 1714) as `"node tests/fixtures/generate-references.mjs"`. Invoked in §9.2 manual job (line 1647) and §4.1 template test commands (line 630). ✓
- §10.2 (lines 1763–1790): **7-step regen process** — engineer triggers `workflow_dispatch`; runs on self-hosted GPU; checks out + npm ci + playwright install + generate-assets + generate-references; commits to `refs/regen-<run_id>` branch; opens PR via `peter-evans/create-pull-request@v8`; reviewer opens PR, sees diff (PNG visual diff via GitHub image diff view); reviewer verifies visual correctness; reviewer merges; CI re-runs Tier 2 against new references. ✓
- §10.4 (lines 1871–1887): **4 safety rails** — (1) "Never auto-merge the regen PR" (first bullet), (2) auto-generated diff report with SHA-256 + pixel diff %, (3) regen on same GPU model as nightly (must run on all 3 platforms separately), (4) idempotent script.
- §10.5 (lines 1889–1903): if regen skipped, Tier 2 fails on main, blocks all PRs until resolved.

**Verdict:** ✅ ACCURATE — all 3 required items present.

---

### Check 10 — Test asset generation (§11) ✅ PASS

**Claim:** §11 documents `npm run generate-test-assets`, ffmpeg commands, manifest with SHA-256.

**Verification:**
- `npm run generate-test-assets` defined in §9.5 (line 1715) as `"node tests/fixtures/generate-assets.mjs"`. Described in §11.1 (lines 1909–1922) as a 5-step pipeline: check manifest hash → skip if match → else download from bucket OR regenerate via ffmpeg → verify hash → exit non-zero on failure. ✓
- ffmpeg commands: §11.5 (lines 1976–1983) verifies all ffmpeg commands against spec 12 §15 (audit-verified set); notes 2 bugs found and fixed in spec 12 (hex RGB not BGR, sine WAV mono vs stereo). Manifest example in §11.3 (lines 1947–1961) includes the ffmpeg command for `10s-red-1080p.mp4` inline: `ffmpeg -f lavfi -i color=c=red:s=1920x1080:r=30:d=10 -c:v libx264 -pix_fmt yuv420p -y tests/fixtures/videos/10s-red-1080p.mp4`. ✓
- §11.3 manifest format (lines 1945–1966): single source of truth JSON with `version`, `name`, `path`, `sha256`, `size`, `generator` (ffmpeg command), `bucketUrl` per asset. CI fails on hash mismatch. ✓
- §11.2 lists 13 categories of generated assets (5 solid-color + 2 gray + 3 gradient + SMPTE + 5 10-bit + 2 HDR + 6 tones + chirp + 2 stereo + 6 LUTs + 2 fonts + 1 overlay + 16 project JSONs validated).

**Verdict:** ✅ ACCURATE — all 3 required items present, with explicit verification chain to spec 12 §15 audit.

---

### Check 11 — Manual test matrix (§12) ✅ PASS

**Claim:** §12 documents FCPXML round-trip in FCP/DaVinci/Premiere, calibrated color/audio checks, HDR display tests, accessibility tests.

**Verification:**
12 manual tests confirmed (lines 1993–2006):
- **M1–M4 (FCPXML round-trip)**: M1 FCP opens export, M2 DaVinci opens export, M3 Premiere opens export, M4 round-trip FCP→our editor. ✓
- **M5–M6 (calibrated color/audio)**: M5 color accuracy on calibrated display (X-Rite i1Display), M6 audio accuracy on studio monitors (Genelec). ✓
- **M7–M8 (HDR display)**: M7 HDR PQ output, M8 HDR HLG output. ✓
- **M12 (accessibility)**: VoiceOver/NVDA + keyboard-only nav; ARIA labels, focus management. ✓
- Plus M9 perceived smoothness, M10 cross-browser smoke, M11 keyboard shortcut conflicts.

§12.1 ownership-by-role (Colorist / Audio engineer / QA — persists across team changes). §12.2 release-blocking classification (M1–M4, M9, M10 block releases). §12.3 rationale for each can't-be-automated.

**Verdict:** ✅ ACCURATE — all 4 required categories documented, plus 3 extras.

---

### Check 12 — Test failure triage (§13) ✅ PASS

**Claim:** §13 documents 4-category process (regression/flaky/real bug/test bug), decision tree, artifact preservation.

**Verification:**
- §13.1 (lines 2050–2071): 6-artifact save process — screenshot-actual, screenshot-expected, screenshot-diff, console.log, network.log, timeline-state.json, trace.zip (on retry). ✓
- §13.2 Regression path → trigger reference regen per §10. ✓
- §13.3 Flaky path → identify race via Playwright trace; add deterministic `page.waitForFunction`; add explicit `test.retry()` for known-flaky; rewrite for determinism; mark `test.fixme()` with issue link. ✓
- §13.4 Real bug path → file GitHub issue with P0/P1/P2 priority; fix bug; add regression test; verify original test now passes. ✓
- §13.5 Test bug path → fix test; add explanatory comment; verify fix doesn't mask a real bug (run against buggy version, should also fail there). ✓
- §13.6 (lines 2133–2158): **ASCII triage decision tree** with 3 decision nodes (pass on retry? / intentionally changed? / assertion matches doc?) yielding 4 outcomes (Flaky/Regression/Test bug/Real bug). ✓
- §13.7 (lines 2160–2165): artifact retention — PR-scope 30 days, nightly 90 days, regen PR 90 days.

**Verdict:** ✅ ACCURATE — all 3 required items present.

---

### Check 13 — Relationship to per-spec Testing sections (§14) ✅ PASS

**Claim:** §14 documents how per-spec sections relate, author checklist, 12-row spec-by-spec mapping.

**Verification:**
- §14.1 (lines 2171–2179): contract — every per-spec 01–12 must have `## Testing` section following §4 template, ~50–150 lines, references this spec by number.
- §14.2 (lines 2183–2196): **12-row spec-by-spec mapping** confirmed (specs 01–12, each with Module + Matrix rows + Per-spec Testing location). ✓
- §14.3 (lines 2198–2215): 7 cross-reference mappings (matrix→per-spec, template→per-spec, fixtures→per-spec, invariants→per-spec, regen→per-spec, spec 12 helpers→per-spec).
- §14.4 (lines 2217–2233): **10-item author checklist** (read §2+§3, identify matrix rows, copy §4.1 template, fill in test names, list fixtures, list commands, list property invariants, cross-reference matrix rows, add new fixtures to §5 first, propose matrix change if tier doesn't apply). ✓

**Verdict:** ✅ ACCURATE — all 3 required items present.

**Discrepancy with worklog:** Worklog line 2150 claims "9-item per-spec author checklist"; actual count is 10 items. Minor worklog undercount.

---

### Check 14 — Relationship to spec 12 (§1.4) ✅ PASS

**Claim:** §1.4 documents split approach (methodology umbrella vs infrastructure reference); worklog says "split approach" — verify this is documented.

**Verification:**
- §1.4 (lines 116–163): explicitly titled "Relationship to `12-testing-strategy.refined.md`", opens with: "**Decision:** spec 17 (this file) is the umbrella methodology. Spec 12 stays focused on test *infrastructure*." ✓
- Concern-mapping table (lines 121–143): **21 concern rows** mapping each concern to either 17 §X or 12 §X. Concerns cleanly partitioned:
  - Spec 17 owns: methodology definition (§2), matrix (§3), template (§4), asset design (§5), WYSIWYG invariants (§6), property strategy (§7), perf methodology (§8), CI workflow structure (§9), reference regen process (§10), manual matrix (§12), triage (§13), forward-looking open questions (§15).
  - Spec 12 owns: ffmpeg recipes (§15), runner config (§17.4, §17.5), WebGPU flags (§3.2, §14.A), self-hosted runner setup (§17.2), pixelmatch/pngjs API (§5), audio verification (§6), GitHub Actions YAML (§17.1), npm version pinning (§14), resolved open questions (§12 — see Issue 3 below).
- Action items (lines 145–163): explicit notes that no edits to spec 12 are required for split to take effect; per-spec authors now read 17 §4 first then drill into 12 for runner/pixelmatch specifics.

**Verdict:** ✅ ACCURATE — split approach is explicitly documented with concrete concern-by-concern table.

**Discrepancy with worklog:** Worklog line 2137 claims "16-row concern-mapping table"; actual count is 21 rows. Minor worklog undercount.

---

### Check 15 — Cross-references ✅ PASS-WITH-MINOR-ISSUES

**Claim:** Spec 17 references spec 12 (infrastructure), spec 15 (EngineCommand), spec 16 (keyboard shortcuts), master spec Decision 9.

**Verification:**

**Spec 12 references — ✅ EXTENSIVE.** Confirmed 19 cross-references via `grep "spec 12 §"`:
- §17.5 (vitest.config.ts): lines 231, 426, 1521, 2408, 2409
- §17.4 (playwright.config.ts): lines 426, 1572, 1691, 2088, 2094, 2409
- §17.2 (self-hosted runner): lines 1686, 2424
- §17.1 (canonical CI YAML): lines 2419
- §15 (ffmpeg recipes): lines 826, 866, 1979
- §14.D (smptebars syntax): line 836
- §5 (pixelmatch): lines 844 (5.3), 2415 (5.1)
- §6 (audio verification): lines 884 (6.3), 2416 (6.2)

**Spec 15 references — ⚠️ PARTIAL (uses API but doesn't cite spec).**
Spec 17 uses `engine.command.apply({type: 'split', params: {...}})` consistently (lines 38, 212, 272, 582, 1007, 1346) — this is the spec 15 `EngineCommand` API. However, **no direct citation** of spec 15 by file name or "spec 15" anywhere. §0 (lines 34, 39) discusses "data-driven engine" / "tagged-union of pure data" without citing spec 15 as the canonical type definition. The closest is line 38's `engine.command.apply()` — but this is the API, not a citation.

**Spec 16 references — ❌ MISSING.**
Zero matches for `16-keyboard-shortcuts` or `spec 16` in spec 17. Spec 17 references "spec 05" for the keyboard shortcut table instead (lines 401, 586, 1051). But spec 16 §11 explicitly states "Spec 05 (timeline): §19 keyboard table (union — superseded by this spec's prescriptive map)" — i.e., the keyboard shortcut table has moved from spec 05 to spec 16. Spec 17's reference to spec 05 is **stale**; should be spec 16.

**Master spec Decision 9 — ⚠️ PARTIAL / STALE.**
Spec 17 §0 (lines 34, 39) references Decision 9 but phrases it as forward-looking: "may or may not be added by the TEST-01 stream". Decision 9 has **already been added** by TEST-01 (master spec line 222, worklog TEST-01 entry lines 2071–2088). The phrasing is stale.
Additionally, §6.1 State WYSIWYG (lines 1004–1057) implements what master spec §7.1 calls "State WYSIWYG (extends Decision 9)" but spec 17 §6.1 only references Decision 6, not Decision 9. Missing cross-reference.

**Master spec Decision 6 — ✅ EXTENSIVE.** Multiple references at lines 25, 995, 1066, 2521.

**Verdict:** ⚠️ PASS-WITH-MINOR-ISSUES — spec 12 ✓ extensive, spec 15 partial (API used but not cited), spec 16 missing entirely (stale ref to spec 05), Decision 9 partial/stale, Decision 6 ✓ extensive.

**Issues identified:**
- **Issue 2 (MINOR):** Spec 17 references "spec 05 §X" for the keyboard shortcut table at lines 401, 586, 1051; should be spec 16. Spec 05 §19 has been superseded by spec 16 per spec 16 §11.
- **Issue 6 (MINOR):** Spec 17 §0 lines 34, 39 phrase Decision 9 as "may or may not be added by the TEST-01 stream"; Decision 9 was added by TEST-01 (master spec §2 Decision 9 confirmed at line 222). Phrasing is stale.
- **Issue 7 (MINOR):** Spec 17 §6.1 implements State WYSIWYG but only references Decision 6, not Decision 9. Master spec §7.1 explicitly calls this "State WYSIWYG (extends Decision 9)". Missing cross-reference.
- **Issue 8 (MINOR):** Spec 17 uses `engine.command.apply()` and `EngineCommand` extensively but does not cite spec 15 (`15-wire-protocol.md`) as the canonical type definition. Should add a one-line citation in §0 or §6.1.

---

### Check 16 — Open questions (§15) ✅ PASS

**Claim:** §15 documents open questions.

**Verification:**
§15 contains **10 open questions** (§15.1 through §15.10, confirmed by `grep "^### 15."`):
1. §15.1 Flaky pixel-diff tests across GPUs (mitigation: per-platform references)
2. §15.2 `looks-same` vs `pixelmatch` (current: pixelmatch)
3. §15.3 Testing WebGPU device loss recovery (mitigation: Tier 1 mock)
4. §15.4 Testing OPFS quota exceeded (mitigation: Tier 1 mock)
5. §15.5 Testing ffmpeg subprocess crash (mitigation: Tier 1 mock child_process)
6. §15.6 Testing the test harness itself (mitigation: smoke test)
7. §15.7 Property test performance (mitigation: numRuns 1000/100/5000 budget)
8. §15.8 Cross-engine determinism in property tests (mitigation: engine designed deterministic)
9. §15.9 Test fixture licensing (mitigation: ffmpeg-generated / hand-authored / SIL OFL fonts)
10. §15.10 Performance test drift across browser versions (mitigation: generous thresholds + trend tracking)

Each follows the same structure: **Problem** / **Current mitigation** / **Open question**. None blocks implementation; each has a resolution path.

§18.4 (lines 2543–2548) self-review confirms all 10 questions are tracked with mitigations and resolution paths.

**Verdict:** ✅ ACCURATE — 10 open questions, all forward-looking (vs spec 12's resolved questions which belong to spec 12 per the §1.4 split).

---

### Check 17 — Implementation checklist (§16) ✅ PASS-WITH-MINOR-ISSUES

**Claim:** §16 has a phased implementation checklist.

**Verification:**
§16 contains **6 phases** (§16.1 through §16.6, confirmed by `grep "^### 16."`):
- §16.1 Phase 0: Test infrastructure spike (P0 prereq) — 12 checklist items (vitest/playwright config, manifest, generate-assets, test-harness.html, arbitraries.ts, pixel-diff.ts, audio-diff.ts, test-engine.ts, CI workflow with 4 jobs, self-hosted GPU runner, smoke test <2min)
- §16.2 Phase 1: Per-spec testing sections (parallel with P1–P5) — 6 items per spec × 12 specs
- §16.3 Phase 2: WYSIWYG verification (P5 prereq) — 4 items
- §16.4 Phase 3: Performance tests (P5 prereq) — 6 items
- §16.5 Phase 4: Reference regeneration (P5 prereq) — 4 items
- §16.6 Phase 5: Manual test matrix (P5 prereq) — 8 items

**Verdict:** ✅ ACCURATE — 6 phases with ~40 checklist items total.

**Issue 9 (MINOR):** §16.6 Phase 5 manual test checklist creates procedure files for only **7 of 12 manual tests** (M1, M2, M3, M5, M6, M7, M9). Missing: M4 (FCPXML round-trip from FCP), M8 (HDR HLG), M10 (cross-browser smoke), M11 (keyboard shortcut conflicts), M12 (accessibility audit). 5 of 12 manual tests have no implementation checklist entry.

---

## Supplementary cross-reference verifications

### Supplementary Check A — §1.4 split-approach table accuracy ⚠️ MINOR ISSUE

**Claim:** §1.4 table maps "Open questions (resolved — FFmpeg, Playwright, pixelmatch) | 12 §13".

**Verification:**
Spec 12's resolved open questions (Q1–Q12, all marked "verified") are in **spec 12 §12** (lines 877–1296), not §13. Spec 12 §13 is "Code References" (line 1355).

**Verdict:** ⚠️ CROSS-REFERENCE ERROR — §1.4 line 142 says "12 §13" should say "12 §12".

**Issue 3 (MINOR):** Cross-reference error in §1.4 table.

---

### Supplementary Check B — §3.2 partial coverage note ⚠️ MINOR ISSUE

**Claim:** §3.2 (line 502) says "mitigation: a manual test script that calls `chrome --disable-gpu-compositing` mid-test (see §15.3)".

**Verification:**
§15.3 (lines 2274–2289) discusses the `lose_device` WebGPU extension, not `--disable-gpu-compositing`. There is no mention of `--disable-gpu-compositing` anywhere in §15.3. Additionally, `--disable-gpu-compositing` does not trigger WebGPU device loss — it disables GPU compositing, which is a different (and not particularly useful for device-loss testing) Chrome flag. The actual method to trigger device loss in a test is the `lose_device` WebGPU extension (correctly identified in §15.3).

**Verdict:** ⚠️ DANGLING CROSS-REFERENCE + TECHNICAL INACCURACY.

**Issue 4 (MINOR):** §3.2 partial coverage note has a dangling §15.3 reference (the cited mitigation is not documented in §15.3) and an inaccurate technical claim about `--disable-gpu-compositing` triggering device loss.

---

### Supplementary Check C — §6.4 vs §9.2/§9.3 WYSIWYG cadence ⚠️ MINOR ISSUE

**Claim:** §6.4 says "All three WYSIWYG invariants run on every PR (not just nightly)".

**Verification:**
- §6.4 (line 1141): "All three WYSIWYG invariants run on every PR (not just nightly) because they're architectural invariants"
- §6.4 (lines 1145–1148): "Pixel WYSIWYG: Tier 2 job, self-hosted GPU runner, ~5 minutes"
- §9.2 ASCII job graph (lines 1628–1631): WYSIWYG pixel job is under "on: push to main (in addition to above)", NOT under "on: push / pull_request"
- §9.3 (lines 1662–1663): "**WYSIWYG pixel job** runs only on `main` (self-hosted GPU is expensive; don't burn it on every PR). Required check on `main`."

**Contradiction:** §6.4 says pixel WYSIWYG runs on every PR. §9.2 and §9.3 say pixel WYSIWYG runs only on push to main (not every PR).

**Verdict:** ⚠️ INTERNAL INCONSISTENCY.

**Issue 5 (MINOR):** §6.4 overclaims the PR cadence for pixel WYSIWYG. State WYSIWYG (Tier 3, ubuntu-latest, ~1min) and audio WYSIWYG (Tier 2, ubuntu-latest, ~1min) do run on every PR; pixel WYSIWYG (Tier 2, self-hosted GPU, ~5min) runs only on push to main per §9.2/§9.3. §6.4 should be corrected to: "State and audio WYSIWYG run on every PR; pixel WYSIWYG runs on every push to main (self-hosted GPU is expensive)."

---

### Supplementary Check D — §9.3 nightly cron vs spec 12 §17.1 ⚠️ MINOR ISSUE

**Claim:** §9.3 (line 1666) says "Nightly job runs on schedule (`0 0 * * *` UTC)".

**Verification:**
- Spec 17 §9.3 line 1666: "nightly job runs on schedule (`0 0 * * *` UTC)"
- Spec 12 §17.1 line 1944 (the canonical YAML): `cron: '0 7 * * *'` (i.e., 07:00 UTC, not midnight UTC)

**Verdict:** ⚠️ INCONSISTENCY between spec 17 and its cited canonical source.

**Issue 10 (MINOR):** §9.3 cites "0 0 * * *" (midnight UTC) for the nightly cron, but spec 12 §17.1 (the canonical YAML spec 17 explicitly cross-references at line 1652) says "0 7 * * *" (07:00 UTC). The two specs disagree on the nightly cron time. Either spec 17 should match spec 12, or this should be explicitly flagged as a known divergence.

---

### Supplementary Check E — §6.3 audio WYSIWYG classification consistency ⚠️ MINOR ISSUE

**Claim:** Audio WYSIWYG is described as both "cross-cutting" (§2.2, §6.3) and "Tier 2 job" (§6.4).

**Verification:**
- §2.2 line 304: "audio WYSIWYG is a cross-cutting test (uses both `AudioContext` and `OfflineAudioContext`)"
- §6.3 line 1087: "Audio WYSIWYG (cross-cutting)"
- §6.4 line 1147: "Audio WYSIWYG: Tier 2 job, `ubuntu-latest` runner (no GPU needed for `OfflineAudioContext`), ~1 minute"

The two characterizations aren't strictly contradictory — "cross-cutting" describes the *test nature* (spans real-time and offline audio paths), while "Tier 2 job" describes the *CI job classification* (Playwright-based). But the conflation is potentially confusing.

**Verdict:** ⚠️ TERMINOLOGICAL INCONSISTENCY (very minor).

**Issue 11 (MINOR):** §6.3 audio WYSIWYG is described as "cross-cutting" in §2.2 and §6.3 but as "Tier 2 job" in §6.4. The two labels aren't contradictory (one is test-nature, the other is CI-job-classification) but the inconsistent terminology may confuse readers.

---

### Supplementary Check F — §17 Glossary and §18 Meta test plan ✅ PASS

**Verification:**
- §17 Glossary (lines 2479–2509): 14 terms (Tier 1/2/3, WYSIWYG, property test, reference, regen, triage, matrix, arbitrary, invariant, shrinking, lavapipe, OPFS, test harness).
- §18 Meta test plan (lines 2513–2548): 4-subsection self-review:
  - §18.1 Methodology review against master spec §9 + Decision 6
  - §18.2 Infrastructure cross-reference to spec 12 §17.1, §15, §5, §6, §17.2
  - §18.3 Per-spec template validation (§4.1 covers all tiers, includes property tests/fixtures/commands, §4.2 worked example is realistic, §4.3 anti-patterns are actionable)
  - §18.4 Open questions review (all 10 tracked, no blockers, each has resolution path)

**Verdict:** ✅ ACCURATE — meta-review section provides appropriate self-audit.

---

## Issues summary

| # | Severity | Section | Issue |
|---|---|---|---|
| 1 | MINOR | §0 (lines 34, 39) | Decision 9 phrased as "may or may not be added by the TEST-01 stream" — Decision 9 was already added by TEST-01 (master spec §2 line 222). Stale forward-looking phrasing. |
| 2 | MINOR | §2.5 (line 401), §4.1 (line 586), §6.1 (line 1051) | References to "spec 05" for keyboard shortcut table are stale — spec 16 (`16-keyboard-shortcuts.md`) is the dedicated keyboard spec; spec 05 §19 has been superseded per spec 16 §11. |
| 3 | MINOR | §1.4 table (line 142) | Cross-reference says "Open questions (resolved) \| 12 §13" but spec 12's resolved questions (Q1–Q12) are in §12, not §13 (§13 is "Code References"). |
| 4 | MINOR | §3.2 (line 502) | Dangling §15.3 cross-reference: cited mitigation (`chrome --disable-gpu-compositing` mid-test) is not documented in §15.3 (which discusses the `lose_device` WebGPU extension). Additionally, `--disable-gpu-compositing` does not actually trigger device loss — the cited Chrome flag is technically incorrect for this purpose. |
| 5 | MINOR | §6.4 (line 1141) vs §9.2/§9.3 | Internal inconsistency: §6.4 says "All three WYSIWYG invariants run on every PR"; §9.2 job graph and §9.3 say pixel WYSIWYG runs only on push to main (not every PR). §6.4 overclaims pixel WYSIWYG's PR cadence. |
| 6 | MINOR | §6.1 (lines 1004–1057) | Implements what master spec §7.1 calls "State WYSIWYG (extends Decision 9)" but only references Decision 6, not Decision 9. Missing cross-reference to Decision 9 (data-driven engine architecture). |
| 7 | MINOR | §0, §2.1, §6.1 | Uses `engine.command.apply()` and `EngineCommand` extensively but never cites spec 15 (`15-wire-protocol.md`) as the canonical type definition. Should add a one-line citation. |
| 8 | MINOR | §16.6 (lines 2467–2473) | Phase 5 manual test checklist creates procedure files for only 7 of 12 manual tests (M1, M2, M3, M5, M6, M7, M9). Missing: M4 (FCPXML round-trip), M8 (HDR HLG), M10 (cross-browser), M11 (keyboard conflicts), M12 (accessibility). |
| 9 | MINOR | §9.3 (line 1666) vs spec 12 §17.1 (line 1944) | Cron time inconsistency: §9.3 says "0 0 * * *" (midnight UTC); spec 12 §17.1 (which §9.3 cross-references for canonical YAML) says "0 7 * * *" (07:00 UTC). |
| 10 | MINOR | §6.3 (lines 1087) vs §6.4 (line 1147) | Audio WYSIWYG classified as "cross-cutting" in §2.2/§6.3 but "Tier 2 job" in §6.4. Not strictly contradictory but inconsistent terminology. |
| 11 | INFO | Worklog lines 2137, 2139, 2150 | Worklog undercounts vs spec actual: concern table 16→21 rows, matrix 35→47 rows, author checklist 9→10 items. Spec is more comprehensive than worklog records. |

## Recommended fixes (priority order)

### P3 — Cosmetic / forward-reference hygiene (no re-audit required)

1. **Fix §1.4 table line 142:** Change `12 §13` to `12 §12` (resolved open questions live in spec 12 §12).
2. **Fix §0 lines 34, 39:** Update Decision 9 phrasing from "may or may not be added by the TEST-01 stream" to "has been added by the TEST-01 stream (see `00-master-spec.md` §2 Decision 9)".
3. **Fix §2.5 line 401, §4.1 line 586, §6.1 line 1051:** Replace "spec 05" / "spec 05 §X" references for keyboard shortcut table with "spec 16 (`16-keyboard-shortcuts.md`)" — spec 16 is the dedicated keyboard spec; spec 05 §19 has been superseded.
4. **Fix §3.2 line 502:** Either (a) replace `chrome --disable-gpu-compositing` with the actual `lose_device` WebGPU extension approach (consistent with §15.3), or (b) remove the dangling `--disable-gpu-compositing` mitigation and the `see §15.3` cross-reference, leaving only the Tier 1 mock-based mitigation.
5. **Fix §6.4 line 1141:** Change "All three WYSIWYG invariants run on every PR" to "State and audio WYSIWYG run on every PR; pixel WYSIWYG runs on every push to `main` (self-hosted GPU is expensive — see §9.3)".
6. **Fix §6.1 (add cross-ref):** Add "This invariant extends Decision 9 (data-driven engine architecture) — see `00-master-spec.md` §7.1" near the top of §6.1.
7. **Add spec 15 citation:** In §0 or §6.1, add a one-line citation: "`EngineCommand` type is defined canonically in `15-wire-protocol.md` §3.2."
8. **Fix §16.6 Phase 5 checklist:** Add missing 5 manual test procedure files (M4, M8, M10, M11, M12) to the Phase 5 checklist.
9. **Fix §9.3 cron time:** Change `0 0 * * *` to `0 7 * * *` to match spec 12 §17.1's canonical YAML.
10. **Reconcile §6.3/§6.4 audio WYSIWYG terminology:** Either (a) consistently label it "cross-cutting Tier 2" in both §6.3 and §6.4, or (b) add a one-line note in §6.4 clarifying that "Tier 2 job" refers to CI classification while "cross-cutting" (per §2.2) refers to test nature.

### P4 — Worklog reconciliation (optional)

11. Update worklog lines 2137, 2139, 2150 to reflect actual counts: concern table 21 rows, matrix 47 rows, author checklist 10 items.

---

## Next actions

1. **No blockers** — implementation can proceed against this spec as-is.
2. Apply the 10 P3 fixes in a single follow-up edit pass (~30 minutes of editing). No architectural changes required.
3. After fixes, no re-audit required — the spec was substantially correct; fixes are cosmetic / forward-reference hygiene.
4. Per-spec authors (specs 01–12) can begin writing their `## Testing` sections following the §4.1 template immediately; the matrix in §3 (47 rows) provides the contract.
5. Implementation team can begin Phase 0 (§16.1) infrastructure spike in parallel — none of the identified issues block Phase 0 work.

---

**End of audit.**

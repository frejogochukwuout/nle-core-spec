# Fleet R24 — file audit: `08-color-grading.md` (R24-3i)

**Agent:** spec-file auditor (fresh context), one file owned: `08-color-grading.md`. **Date:** 2026-09-08.
**Pin world (R24):** engine `5036387` (458) · OT `ded43c4` (536; code `c15a629`) · WDC `85b81b0` (759) · nle-ui `fc4cc35` (674) · app `c885ece` (174); variants 1,521+ in-repo (00-master's convention — the sibling stream's round-wrap declares the exact figure).
**Method:** read-only; no git mutations; no test runs (counts per the R24 module cards + static re-counts); every code claim verified by reading the live trees (nle-ui, nle-test-app, nle-engine, ui-mock/shell-variants).

---

## 1. BASE re-verify (code-level, live)

| Claim | Verification | Verdict |
|---|---|---|
| nle-ui W2.5 (`7280372`): `SceneGrade {contrast,saturation,brightness,hue}` CSS-filter domain, 1/1/1/0 neutral | `useUiStore.ts:42-51` (contract-complete comment: brightness/hue exist so the record is the FULL final-pass contract); `color: Record<sceneId, SceneGrade>` :126; `setGrade` :199/:603-604 merges into `NEUTRAL_GRADE`-seeded record (:268-271), new record ref per write; view-state (no history, not in SceneJSON) | **VERIFIED-STRONG** |
| ColorPage LIVE sliders (−100..100 ⇄ 0..2) | `ColorPage.tsx`: Contrast :110 + Saturation :114 → `setGrade`; `sliderOf/gradeOf` :24-25; Pivot :113 + Qualifier hue :169 honest-LOCAL (marked, no store write); first-touch toast :81; LUT select :150-158 + wheels `role="img"` stay honest-mock ("lands with the render round, spec 08") | **VERIFIED-STRONG** |
| App W2.5 (`41f5bc9`): the grade as ProgramCanvas's FINAL PASS | `ProgramCanvas.tsx`: `buildGradeFilterString` :91-94 (canonical 4-component chain, all present when non-neutral, `''` when neutral = direct paint); compose-then-filter :201-222 (scratch canvas → ONE filtered drawImage); the non-linearity law quoted :26-28; `data-grade` pin surface :237 | **VERIFIED-STRONG** |
| persistenceService carries the sidecar both ways | `persistenceService.ts`: identity key gains `s.color` (:5-14); snapshot's optional `color` (:51-53, pre-W2.5 hydrates neutral); loadSnapshotFile REPLACES never merges; 3 pinned suites (`persistenceService.test.ts:266-317`) | **VERIFIED-STRONG** |
| Engine DECLINE (`8a0b7fe`) | The design law quoted from the engine module card + mirrored in ProgramCanvas's header; effects CSS-filter subset is spec 04's BASE row (kept as cross-ref, not duplicated); the D29.5c row added here as the twin | **VERIFIED (card + code)** |
| Engine `5036387` 458/458; instruments still zero | Grep live: only `effects/pipeline.ts:12` (param-metadata comment) + `headless/api.ts:1509/:1515` (wire strings) — zero progress, the advertised-on-wire trap unchanged; 44-effect registry re-counted (43 + `gpu-lut` @ lut.ts:321); `rgba8unorm` = 46 sites/10 files — IDENTICAL count to R23 (the 440→458 growth touched none) | **VERIFIED-STRONG** |
| §15A line refs | Every R23 re-based ref re-checked live and UNMOVED (wheelTint :1919, registerEffects :4595, luminance601 :1930, rgba8 dt :4850, runEffectChain :5179, GPU_EFFECT_REGISTRY :3039, enabledEffects :1656) — W2.5 touched only `bridge/composition-frame.ts` + bridge-seams | **VERIFIED-STRONG** |
| Variants mock @ 1521+ | The R23 fleet's 1,542 figure is superseded: the mock's own R23 review-sweep + wrap-fix rounds (`6ec61df` 1,594 / `de3fd47` 1,597, the last variants-code commits) landed after the 2026-09-07 reading; only ops/serving commits since. Color lib re-counted: **exactly 167** (31/56/28/20/26/6). W-B surfaces all present live (ScopesDock/ColorNodeGraph/StillsPanel/timelineCompact/gradedFrameBus/useScopeSource); surface tests drifted +1 each: ColorPage 33 / ScopesDock 20 / GradedViewerCanvas 15 (StillsPanel 14, ColorInspector 10, mockGrades 18 unchanged). C50 pointer re-verified (`TIMELINE_GRADE_KEY`, color-layout.md §3.6) | **FIXED → 1,521+ live** (rows re-read correctly; the mock stays a REFERENCE) |
| Z2 grade→export | Zero `grade`/`color` terms in `deliverService.ts` (live grep) — the consumer-side open item stands (D30 W-E) | **VERIFIED** |

## 2. FIXED (minimal-diff spec edits)

1. **Pins re-based everywhere** — status line, §0 BASE header + rows, the Round-7 note (R24 bracket), §15A (R24 note appended; R23 records preserved as dated history).
2. **The grade-sidecar landing promoted to BASE** — new §0 row: the nle-ui sidecar + setGrade + LIVE sliders + honest-local/honest-mock ledger (LUT/wheels = the GPU fidelity path, queue item L, coordinated with spec 04's D29.5d widening); the app's final pass + the persistence both ways.
3. **The D29.5c DECLINE decision row ADDED** (GAP row 3, a DECISION row, not a gap) — the consumer-side final pass is THE LAW; Z2 stands consumer-side (app's D30 W-E); twin of spec 04's row.
4. **Phase tags stripped to the D24 set** — GAP header's "dual-tagged" clause dropped; both rows' "(was W-color)" parentheticals removed; the window closure recorded in the status line.
5. **The r3 binding row fenced** — the W2.5 final pass is NOT the r3 row (consumer preview v1 vs the engine's linear-light pipeline), matching spec 04's twin row; substance otherwise unchanged.
6. **Register row** — ARCH-R24 D29.5 added.

## 3. REMAINS-OPEN

1. **r3 grade-math binding + parity** (unchanged) — the 8→10-bit + LUT corrections; nothing landed engine-side.
2. **S-engine instruments** (unchanged, zero progress @ `5036387`) — ∥ crawl, consumed at r3; the wire trap open.
3. **Z2 grade→export** (consumer-side, app's D30 W-E).
4. **C50 timeline-grade ruling** (pointer, unchanged).
5. Battery's central post-fleet re-baseline (the variants figure).

## VERDICT

**VERIFIED-STRONG with the round's delta promoted.** The spec's math core (§4.2-exact gradeMath, the 167-test color lib, the FreeCut verification trail, §15A) re-verified exactly; the round's real delta — the W2.5 grade-sidecar landing on both sides of the seam (`7280372`/`41f5bc9`) — is now BASE with the DECLINE (D29.5c) recorded as the law's twin row; every pin, count, and line-ref re-based; no normative damage (§1-§19 untouched outside the posture surfaces).

*R24-3i — read-only; single spec file edited + this report. Live verifications: file reads + greps of the four trees; static test re-counts; no git mutations, no suites run.*

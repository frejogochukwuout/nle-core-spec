# Fleet R23 — file audit: `08-color-grading.md` (R23-fleet-08)

**Agent:** spec-file auditor (fresh context), one file owned: `08-color-grading.md`.
**Date:** 2026-09-07 (the fleet's pin set). **Inputs:** ARCH-R23 (D23/D24/D25), `IMPLEMENTATION-PLAN.md` (§2 r3's row), the wave-1 re-audit of `04-renderer-color.md` §0, the live repos (variants @ the fleet HEAD; engine `b8c6f88` 440/440; app `70e99f0` 117/117; nle-ui `85dcf57` 648; OT `222532c` 489; WDC `494f6ff` 759).
**Method:** no git mutations, no test runs (counts trusted, features verified by reading code: per-file strict test counts, component reads, registry/wire greps, line-ref spot checks).

---

## 1. BASE re-verify (every pin/count/feature claim)

| Claim (R22 state) | Live verification | Verdict |
|---|---|---|
| variants "1,334 tests" | Superseded: the W-A FX + W-B color waves, W-C/D/E (`ba46cf3`, 1,521/1,521), and W-F + WB-REV/WD P3 fix (`acb2cf9`, **1,542/1,542** + tsc clean, the last variants-code commit) — the spec-repo fleet commits since don't touch the mock. 00-master's 1,470 is its own R23-pin-era figure, pre-W-C/D/E. | **FIXED → 1,542** (with the 00-master/battery reconciliation note, mirroring 04's wording) |
| W4a color libs "167 dedicated tests" | Re-counted strict per file: colorSpace 31 + gradeMath 56 + qualifierMath 28 + scopesMath 20 + gradedImage 26 + index 6 = **exactly 167**. The library set now names all six files. | **VERIFIED-STRONG** (count exact; file list widened) |
| gradeMath = the EXACT §4.2 14-step op order | `gradeMath.ts` header: "THE ENGINE SEAM … the 14-step order below are verbatim (spec 08 §4.2 / §17.A-port)"; `applyGrade`/`applyGradeInPlace`, zone masks `smoothstep(0, 0.18, …)`, the 28-f32 uniform packing. | **VERIFIED-STRONG** |
| GradedViewerCanvas decode→grade→encode ≤960×540, rAF-coalesced | Confirmed in source (§12.1 decodedCache + `scheduleCoalesced`); PLUS the W4c/W-B seam: it publishes the graded display buffer on `gradedFrameBus` (BUFFER half; `useScopeSource` STORE half). | **VERIFIED-STRONG** (seam documented in §0) |
| engine "f68ab8c 356/356" | Superseded: `b8c6f88` **440/440, tsc 0** (N2b keyframed volume `37cdd28` + RR1-A fade-clamp inside the 440; `798104e` toSorted consumer-compat, `eed9459` OT re-pin — context, not color-relevant). | **FIXED → b8c6f88 440/440** |
| engine "44-effect registry + WebGPU compositor" | Verified: 44 `id: 'gpu-*'` registrations (43 in `effects/pipeline.ts` + `gpu-lut` in `effects/lut.ts`); `gpu/compositor.ts` present. | **VERIFIED-STRONG** |
| The instruments "zero engine code" | Re-verified @ `b8c6f88`: the ONLY mentions are the FreeCut wire-schema strings `gpu-power-window`/`gpu-secondary-qualifier` in `headless/api.ts`'s `GPU_EFFECT_TYPES` (lines 1509/1515) — the wire ADVERTISES both, the 44-id registry implements NEITHER (the advertised-on-wire ≠ implemented trap); `effects/` = `pipeline.ts` + `lut.ts` only; no scopes module; the P2 backlog still lists "scopes (waveform/vectorscope)". | **VERIFIED-STRONG** (now documented in §0 + §15A) |
| Engine color ops FreeCut-baseline 8-bit | Re-verified: `rgba8unorm` = **46 sites / 10 files** (pipeline 8, compositor 7, player 7, mask-manager 8, glyph 3, texture-pool 4, text-cache 4, transitions 3, lut 1, row-alignment 1); `wheelTint`/`luminance601`/ping-pong chain all present (content holds; line numbers drifted — see §3). | **VERIFIED-STRONG** |
| LUT loading state | The engine's Wave-3E `gpu-lut` is a faithful 8-bit FreeCut-baseline port (`lut.ts`: `.cube` parser, base64 rgba8 transport, 3D texture, intensity) — parser EXISTS, the spec's 16-bit + linearization corrections (§16.B/§16.C/§17.D) remain r3 work. | **FIXED** (the LUT-loading nuance now explicit in the r3 row) |
| App-side color surface | Verified: `nle-test-app` @ `70e99f0` carries NO color surface (GluedShell/ProgramCanvas/audio/timeline family only). | **VERIFIED-STRONG** (documented in §0) |
| nle-ui color chrome | NEW BASE note: `nle-ui` @ `85dcf57` carries ColorPage as static-mock chrome only (spec 18 §4.8 single-column stack, role="img" wheels, display-state params, honest "render round (spec 08)" toasts; the Q6 Round-7 scope note still true for the package). | **ADDED** (charge e) |
| The W-B color wave (per the task brief) | Verified live: ScopesDock.tsx (4 scope TABS — Luma WFM/RGB Parade/Vector/Histogram — console row, ONE full-size, `SCOPE_THROTTLE_MS = 100`, the W4c simultaneity law REVERSED per D-B1 + the deviation ledger), ColorNodeGraph.tsx (nodes-in-viewer, D-B2, stale-frame honesty ruling 14), StillsPanel.tsx (Gallery: still cards, derived node-count chip, clip-level caption, Save Still → `colorStills`, C59 + .drx boundaries), `timelineCompact: 'auto'|'on'|'off'` (D-B3) + `resolveTimelineCompact`; surface tests ColorPage 32 / ScopesDock 19 / StillsPanel 14 / ColorInspector 10 / GradedViewerCanvas 14 / mockGrades 18. | **ADDED to BASE** (as mock references with honest view-state markers) |
| Timeline-grade pointer (GAP row 3) | `docs/r20/color-layout.md` §3.6 exists and states `[clipGrade] → [timelineGrade]` sequential; mock implements it (`TIMELINE_GRADE_KEY`, bus mode 'program'). | **VERIFIED-STRONG** (kept as pointer) |

## 2. GAP re-check (landed? still gaps? new?)

- **The grade-math binding (W-color) → re-tagged r3 (dual-tag "was W-color").** NOT landed — correct: zero engine-side spec-08 math (the engine's color ops remain the FreeCut 8-bit/gamma baseline; the mock's W4 math is the parity reference, unbound). Acceptance sharpened: parity pins on SHARED fixtures, max delta ≤ 1 LSB-equivalent, the parity corpus named, and the binding's substance enumerated (rgba8unorm chain → 10/16-bit; the LUT data path Uint16Array/rgba16uint + §17.D linearization — the "LUT loading" gap is the correction, not the parser).
- **The instruments row → stays S-engine ∥ crawl (4-6 wk), consumed + pinned at r3 (was "consumed at W-color").** NOT landed (zero engine code re-verified — the wire trap). NEW acceptance clause added: the ScopesDock mock-plot vs engine-data distinction (the mock's scopes plot the MOCK's gradedFrameBus buffer; at r3 they must plot ENGINE data — the mock is the reference PLOTTING implementation, not the data source); NEW: close the wire trap (implement the advertised `gpu-secondary-qualifier`/`gpu-power-window` ids or pull them from `GPU_EFFECT_TYPES`).
- **The 8-bit→10-bit correction** — folded explicitly into the r3 binding row (was only implied via "§15A" in BASE).
- **The parity corpus** — named in the r3 row (shared fixtures + both sides' pins). The N1 projector parity corpus is spec 04's row (correctly NOT duplicated here; 04's row cross-references this file's math-side row).
- **The timeline-grade sequential law** — still a REGISTERED pointer (mock-verified live; C50 follow-up). No change needed.
- **No C4/R-* rows exist in 08's register** (C4→K4, R-*→r5/r6 are other files' rows) — the D24 register row cites the plan so the mapping resolves.

## 3. Retired spec-14 §4 rows (posture law)

The color-domain rows — the W-color binding (§3.2) + the instruments consumption (§4) — **both exist in §0 GAP** (rows 1-2), now explicitly tagged "(re-homed from the retired spec-14 §3.2/§4)". A Register row (IMPLEMENTATION-PLAN §2 r3 + §3 workstreams + the stub) was ADDED. No row found only in spec 14. **COMPLIANT.**

## 4. Phase re-tag (D24)

- W-color → **r3** (dual-tagged "was W-color") — header, GAP row 1, row 2's consumption point, and the ACCEPTANCE line ("the r3 grade-math parity pins").
- S-engine instruments → S-engine ∥ crawl (unchanged) + consumed at **r3**.
- No C4/R-* tags existed in this file; nothing else to re-tag.

## 5. §15A engine line-ref drift (content holds)

Spot-verified @ `b8c6f88`: `wheelTint` :1883→:1919, `registerEffects({` :4559→:4595, `luminance601` :1894→:1930, `rgba8unorm` data-texture :4812→:4850, `runEffectChain` call :5086→:5179, `GPU_EFFECT_REGISTRY` :3003→:3039, player `enabledEffects` :1076→:1656. A dated **R23 re-verify note** was appended to §15A's preamble (historical SCOUT-08 table preserved; the "37,958 LOC, 124 tests" figure marked as the 2026-08-22-era record). The Q6 Round-7 UI-scope note got a one-line R23 bracket (spec-18 package page still simplified; the mock's node graph/Gallery are design references, not a spec-18 scope change).

## REMAINS-OPEN (the forward work, unchanged in substance)

1. **r3 grade-math binding + parity** (app+engine) — the mock W4 math ↔ engine real pixels, ≤ 1 LSB-equivalent, the 8→10-bit + LUT corrections. Nothing landed.
2. **S-engine instruments** (scopes/qualifier/power-window) — still zero engine code; the advertised-on-wire trap open; consumed at r3.
3. **C50** (the timeline-grade vs clip-grade spec-side ruling) — still a registered pointer.
4. Battery's central post-fleet re-baseline: the variants count (1,542 live vs 00-master's 1,470 pin-era figure) — flagged in §0 for the battery, not fixed per-file (the plan's law: the battery re-baselines once, centrally).

## VERDICT

**VERIFIED-STRONG with 6 fixed/added rows.** The spec's core (the spec-08-exact math, §13-§19 contract, the 167-test color lib, the FreeCut verification trail) verified exactly against the live repos; every stale pin (variants 1,334→1,542; engine f68ab8c/356→b8c6f88/440) fixed; the W-B wave's surfaces promoted to BASE as honest mock references; both retired spec-14 color rows confirmed re-homed + dual-tagged per D24 (W-color→r3, instruments consumed at r3); the mock-plot vs engine-data distinction and the wire trap made explicit; the two forward items (the r3 binding, the S-engine instruments) correctly remain open.

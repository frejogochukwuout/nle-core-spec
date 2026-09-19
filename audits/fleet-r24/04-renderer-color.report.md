# Fleet R24 — spec 04 audit report (renderer/color pipeline)

**File audited:** `nle-core-spec/04-renderer-color.md` (the ONLY file edited)
**Agent:** R24-fleet-04 (Task R24-3e, SPEC-FILE AUDITOR)
**Live repos verified (2026-09-08, read-only — no git commands, no test runs; counts per the R24 module cards):** nle-engine `5036387` (458/458, tsc 0; submodules OT `c15a629` + WDC `494f6ff`) · opencut-timeline `ded43c4` (536/536; code pin `c15a629`) · nle-test-app `c885ece` (174/174) · nle-ui `fc4cc35` (674/674 live-run) · variants `e89cd65` (1,521; unchanged — no R24 variants pin)
**Evidence packs:** fleet-r24 module cards (engine/app/ui) + `ARCH-R24-timeline-strategy-and-topology.md` (v2, D29.5c/d) + the R23 precedent `fleet-r23/04-renderer-color.report.md`.

---

## VERIFIED-STRONG (claims re-verified against the live trees, code-level)

1. **The W2.5 D29 landing (the round's high-delta item)** — verified in code at `5036387`: `bridge/composition-frame.ts` — `CompositionElementParams.effects` (:119), `CompositionElementEffect` = `{name, params}` (:124 — the consumer-local id/enabled fields dropped; the :117 doc states enabled is the consumer's domain, filtered BEFORE the seam), `CompositionDrawOp.filter` (:161), `buildElementFilterString` (:223 — Gaussian Blur → `blur(radius px)`, radius default 4, non-finite→4, **negative clamped ≥ 0 per the R8-REV #5 `4b2dfd1`** — invalid CSS would no-op the whole ctx.filter; every other name = the honest skip at :229; join with spaces; identity `''`). The header's EFFECTS law (:73-89) states the honest-subset rationale verbatim (the 44-effect registry renders them at fidelity; a fake Canvas2D approximation would preview what the render never ships; Safari < 18 graceful no-op). **Now BASE.**
2. **The app-side consumer rows** — verified in `nle-test-app/src/ProgramCanvas.tsx` @ `c885ece`: `el.effects` filtered `enabled`-only (:72-76) then id-dropped into the seam; `buildGradeFilterString` (:91-94 — contrast/saturate/brightness/hue-rotate, all four present when non-neutral, **`''` when neutral = the direct paint path**); the final pass composes on a scratch canvas then ONE filtered drawImage (:201-217, compose-then-filter); `data-filters` / `data-grade` jsdom pin surface (:236-237).
3. **The nle-ui W2.5 grade sidecar** — verified @ `fc4cc35`: `ColorPage.tsx` LIVE Contrast/Saturation sliders → `setGrade` (:62, :110, :114), Pivot + Qualifier hue honest-local (:68-74), LUT select + wheels stay honest-mock with the "lands with the render round (spec 08)" toast (:149-158); `SceneGrade` CSS-filter domain via `useUiStore`.
4. **The color instruments — STILL zero engine code** — re-verified @ `5036387`: only the wire strings `gpu-power-window` (:1509) / `gpu-secondary-qualifier` (:1515) in `headless/api.ts`'s GPU_EFFECT_TYPES + the param-metadata comment `effects/pipeline.ts:12`; P2 backlog still lists "scopes (waveform/vectorscope)". **The S-engine 4-6 wk ∥ crawl row stands unchanged.**
5. **The 8-bit baseline + 44-effect registry** — re-counted live: **46 `rgba8unorm` sites across 10 files** (32 in the 7 gpu/-family files — the count is IDENTICAL to R23's: the engine grew 440→458 tests, the 8-bit baseline did not move); registry = 43 `id: 'gpu-*'` in `effects/pipeline.ts` + `gpu-lut` at `effects/lut.ts:321` = 44. §13D's 12 rows' file:line refs spot-verified EXACT (device.ts:59/:67/:79, compositor.ts:33/:1257/:1790, pipeline.ts:5204, mask-manager.ts:724, lut.ts:314, texture-pool.ts:190, transitions/pipeline.ts:116, player.ts:1575) — the W2.5 round touched only `bridge/composition-frame.ts` + `bridge-seams.test.ts`.
6. **The OT placeholder compositor** — present in the tree (`src/lib/timeline/render/placeholder-compositor.ts`); the app's lock-copy is byte-exact `c15a629` minus `testing/` (live-verified per the app card).
7. **The N1 family + W1 meter bridge + K2 seeds** — all re-verified at the new pin (bridge-seams now 113 tests).

## FIXED (spec edits, minimal-diff)

1. **Pins re-based everywhere** — status line, §0 BASE header + all four live rows, §7.1 pass-discipline note, §11.1 Q1, §13D header + the P0.1 row: engine `5036387` 458/458 · OT `ded43c4`/code `c15a629` 536/536 · app `c885ece` 174/174 · **NEW nle-ui row `fc4cc35` 674/674** · variants `e89cd65` (unchanged). Engine vendors re-pinned OT `c15a629` + WDC `494f6ff`.
2. **The W2.5 D29 landing promoted to BASE** — the engine row now carries the effects sidecar (enabled-only/id-dropped, consumer-domain law) + `buildElementFilterString`'s honest CSS-filter subset (the renderer-side preview v1); the app row carries the ProgramCanvas consumer rows (el.effects + the SCENE GRADE FINAL PASS, compose-then-filter, neutral = direct paint); the nle-ui row carries the grade sidecar seam + ColorPage LIVE sliders + the honest-mock ledger (LUT/wheels mock = the GPU fidelity path).
3. **The D29.5c DECLINE decision row ADDED (required)** — the engine seam declines the scene-grade promotion BY DESIGN (the `8a0b7fe` law quoted: per-element grade filters ≠ composited grade); the consumer-side final pass is THE LAW; the app's Z2 grade→export fix stands as the consumer-side open item (D30 W-E) — not re-filed engine-side; cross-ref to spec 08's twin row.
4. **The D29.5d CSS-filter widening OPEN gap ADDED** — only Gaussian-Blur landed; Vignette/Glow/LUT-preview v1 (Canvas2D-reachable) open — owner S-engine, acceptance = faithful approximation or honest skip, never a fake preview.
5. **Phase tags re-based to the D24 set** — the "(was W-color)" / "(was R-engine-p2)" parentheticals dropped from rows 1/2/4 + the GAP header's "dual-tagged" clause removed (the window closed this fleet, per ARCH-R24 execution item 2d).
6. **§13D + §11.1 re-pins** — 458/458, 54,791 LOC, 46-site count re-held; R24 re-verify note appended (every row's file:line unchanged; W2.5 is BASE, not a §13D corrective).

## REMAINS-OPEN

1. **The color instruments** (S-engine, ∥ crawl, 4-6 wk; consumed at r3) — zero engine code at `5036387`; the wire-schema trap (advertised-on-the-wire ≠ implemented) is documented in the row.
2. **The grade-math binding + parity** (r3) — the W4 mock math still mock-side only; the W2.5 final pass is explicitly fenced off as NOT this row (consumer preview v1 vs the engine's linear-light pipeline).
3. **The CSS-filter widening** (D29.5d, S-engine) — Vignette/Glow/LUT-preview v1.
4. **The app's Z2 grade→export** (consumer-side, the app's D30 W-E queue) — zero `grade`/`color` terms in deliverService.ts (per the app card).
5. **The projector parity corpus** (S-engine ∥ crawl) + **CPU transition renderers** (r6) — unchanged.
6. **§13D's ENGINE-GAP rows** (device-loss recovery loop; 4096 cap vs 8K) + the whole 10-bit scene-linear corrective path — unchanged character at the new pin.

## NOTES

- The DECLINE row is a DECISION row (not a gap) — the register now carries it explicitly labeled, per D29.5c's "spec 04/08 carry the decline as a decision, not a gap".
- No normative damage: §1-§16's SCOUT-04 teacher analysis and §17's test plan untouched; the normative pass-discipline rule stands with its R23 fix note re-held at the new pin.
- The variants row is untouched (no R24 variants pin in the round's pin world; ARCH-R24 records "variants 1521+").
- Live verifications: file reads + greps of the engine/app/ui trees; counts trusted per the module cards (nle-ui 674 was live-run by its auditor; engine 458 static-census-matched). No git commands, no suites run, only `04-renderer-color.md` + this report written.

## VERDICT

**The spec's renderer/color thesis held again — the engine is still the 8-bit FreeCut-baseline port (46 sites, identical count) with zero color instruments — but the round's real delta was the W2.5 D29 landing, which arrived on BOTH sides of the seam exactly as the module cards record: the engine's honest CSS-filter subset (`8a0b7fe`+`4b2dfd1`) and the app/nle-ui consumer rows (`41f5bc9`/`7280372`) that consume it. All of it is now BASE; the grade DECLINE is law (D29.5c); the widening is the round's one new open gap (D29.5d, S-engine); every pin, count, and line-ref is re-based and re-verified live.**

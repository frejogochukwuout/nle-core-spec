# Fleet R24 — Spec 10 (FCPXML export) audit report

**Agent:** R24-3k · **File owned:** `10-fcpxml-export.md` · **Date:** 2026-09-08
**Pins audited against (live):** engine `5036387` (458/458 static census) · OT HEAD `ded43c4` (536/536; code pin `c15a629`, src diff empty) · WDC `85b81b0` (759/759) · nle-ui `fc4cc35` (674/674) · app `c885ece` (174/174). R23 precedent pins: `b8c6f88`/`222532c`/`85dcf57`/`70e99f0`.
**Evidence packs:** fleet-r24 module cards (nle-test-app, nle-engine) + ARCH-R24 v2 + the R23 report.

## CHARGE 1 — pins re-based (DONE)

Status line, §0 BASE header, BASE pin line, seam row, OT row, app row, §12.8 engine note — all re-based to the R24 pin world; the R23 pins survive only as named lineage (the BASE line + the two historical R23 annotation blocks kept verbatim). Counts re-based: engine 440→458, OT 489→536, nle-ui 648→674, app 117→174, + WDC `85b81b0` (759) added to the BASE pin line (the R23 line omitted WDC).

## CHARGE 2 — the export-seam split re-verified + the R8 delta promoted (DONE — every claim live-verified)

- **The split re-verified at the pins:** FORMAT half = zero-anywhere — `rg -il fcpxml` over engine src+tests → 0, OT src → 0, WDC src → 0; app = deliverService's defensive row + its 2 seam tests only; nle-ui = the DeliverPage/test/story + shortcutMap/useShortcuts toast rails. No writer, no parser, no fixture corpus anywhere.
- **The R8 W2.4 delta promoted to BASE (commit `278b95b`, read live):** `deliverService.ts` — `renderCompositionCore` via the deep import `@/lib/nle/export/orchestrator` ✓; **mediabunny@1.50.8 EXACT** (app package.json:23 — the vendored engine has no node_modules) ✓; avc/aac/mp4 with the orchestrator's `canEncodeVideo` fallback ✓; the file-name ext follows `result.effectiveSettings.container` — a vp9 fallback never ships .mp4 ✓; 'frame' = the same painter at the CURRENT playhead (`useUi.getState().playhead`) → `canvas.toBlob('image/png')` ✓; audio = a FRESH `SceneMixer.renderOffline` over the app's REAL segment pipeline (flatten→foldSidecars→transition windows→segments; never the live mixer) ✓; abort = the engine's `DOMException AbortError` shape propagated ✓; **17 pins** verified as 15 (deliverService.test.ts) + 2 (GluedShell D29 W2.4 describe) — matches the commit's "Pins ×17. 158".
- **fcpxml STAYS page-mock in BOTH worlds (verified):** nle-ui `DeliverPage.tsx:250-259` — with `exportRequest` present the fcpxml CTA pushes the "FCPXML writer is a spec-10 future — not wired yet" info toast, never the contract (no job row, no encode); absent = `queueMock()`. The app's deliverService throws defensively ("not implemented (spec-10 future)") — pinned at deliverService.test.ts:346. App.tsx:56 wires `exportRequest={deliverService.exportRequest}`.

## CHARGE 3 — the grade→export gap (Z2) registered (DONE — row ADDED to §0 GAP)

Verified PENDING: zero grade/color terms in deliverService.ts + its test (grep clean) at `c885ece`. New §0 GAP row: owner S-app, D30 W-E ("what you grade is what you get" — the consumer-side final pass, the same law ProgramCanvas's monitor uses; pin per design-r9-d30.md:148-151), with the **D29.5c DECLINE note** (the engine seam declines promotion by design — `8a0b7fe`: hue-rotate/saturate are non-linear under per-element alpha compositing; the app host composes first, filter-draws once — the same law spec 04/08 carry as a decision, not a gap). Cross-noted as orthogonal to the format half (FCPXML 1.10 doesn't carry grade state — §3.4/§8 stand).

## CHARGE 4 — phase tags stripped + r5 re-checked (DONE)

- Dual tags stripped (the D24 window closes): Status line + §0 r5 row dropped "was R-fcpxml, the D24 re-tag"; the K4 row dropped "was C4, the D24 re-tag". Posture law intact — the D24 set only (r5/K4 remain).
- r5 rows re-checked: the plan's §2 r5 row (line 66) unchanged — FCPXML greenfield, phase-entry artifact, corpus-validation exit; ladder position unchanged. The K4 row RE-STATED to the landed/residual split: the CTA half LANDED (R8 W2.4), the residual = the K4 e2e leg (import→cut→play→export) — the app still has ZERO e2e (grep `law-net|lawnet|e2e` → 0 hits, verified).

## CHARGE 5 — honest staleness (STATED)

The FCPXML FORMAT half is untouched since R23 — said so in §0 BASE ("honest staleness: untouched since R23") and in the new §12.8 R24 note (engine export subsystem unchanged: 5 files / 1,785 LOC; only the bridge's W2.5 effects sidecar + blur clamp landed since `b8c6f88`; MediaMetadata colorSpace ENGINE-GAP still open at HEAD — verified no colorSpace in `metadata.ts`). Minimal edits only: §0 re-base + one added GAP row + two R24 annotation blocks appended after the kept-verbatim R23 blocks; the DTD/mapping/validation contract text (§1–§15) untouched.

## REMAINS-OPEN (registered, no action)

1. The parser+fixture-corpus choice — still undecided by design (the r5 phase-entry artifact).
2. Engine `MediaMetadata` colorSpace — re-verified open at `5036387`.
3. The engine-export remainder (Stage 3 worker/OPFS + Stage 5 smart-copy) — S-engine's queue, orthogonal.
4. M1–M4 manual flagship-NLE tests — unchanged, gating at the phase's deliver gate.
5. The Tier-2 download-event test — no live surface anywhere; lands with r5 (noted in the Tier-2 R24 block).

## NOTES

- No git commands; no test runs (counts trusted per the module cards' static-census authority; features verified by reading live code at the pins); §0 triad preserved; historical sections (§0A, §12.8 Round-7 rows, the R23 annotations, §13 corrections) kept verbatim.
- The app's export path consumes the CORE deep-import (`renderCompositionCore`), not the headless `renderTimeline`/`renderProject` — the K4 row and app row now say so exactly; no normative text changed meaning.
- File: 2314 → 2345 lines (+Z2 row, +two R24 notes, ±re-base rewrites).

**Verdict: VERIFIED-STRONG with the R8 delta promoted — the export seam's MEDIA half is now BASE at BOTH layers (engine-side decode-verified since R23; app-side deliverService/mediabunny@1.50.8 at R8 W2.4), fcpxml stays page-mock in both worlds, the format half remains the untouched r5 greenfield, the K4 row re-states to the e2e residual, and Z2 is registered with the D29.5c decline law.**

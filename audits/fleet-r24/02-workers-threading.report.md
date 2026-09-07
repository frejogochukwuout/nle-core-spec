# fleet-r24 audit report — 02-workers-threading.md

**Agent:** R24-3c (spec-file auditor, fresh context). **Date:** 2026-09-08.
**File audited:** `nle-core-spec/02-workers-threading.md` (the workers/threading model spec).
**Pins verified against (the R24 pin world):** engine `5036387` (458/458 — module-card static census + commit evidence) · OT HEAD `ded43c4` (536, code pin `c15a629`) · WDC `85b81b0` (759/759 — live-run by the module card) · nle-ui `fc4cc35` (674) · app `c885ece` (174 — static census). Engine vendor pins: OT `c15a629`, WDC `494f6ff` (gitlink-verified by the module card; one docs-only commit behind WDC HEAD). All five repo HEADs independently confirmed by reading `.git/refs/heads/main` (file reads — **zero git commands run**, per this round's rules).
**Context read first:** ARCH-R24-timeline-strategy-and-topology.md (v2, D26–D29), the five fleet-r24 module cards, the R23 precedent `audits/fleet-r23/02-workers-threading.report.md`, and the spec file in full (2,649 lines).

---

## RE-VERIFIED (charge 1 — the R23 zero-Worker truth STILL HOLDS at the R24 pins)

1. **The WEB-WORKER half is still genuinely absent — grep-verified live at every relevant repo:**
   - **Engine** (`5036387`): zero `new Worker(` and zero `ManagedWorker` in `src/` (the only "worker" strings are the same comment mentions R23 found: `mixer.ts:21/:33/:619`, `video-sync.ts:1186`, `export/orchestrator.ts:10` ("main-thread (no worker offload — Stage 3)"), `export/index.ts:13`). Exactly ONE worklet survives: the `nle-pitch-shifter` (`src/lib/nle/audio/soundtouch-processor.worklet.ts` — `registerProcessor` :182, Blob-URL `addModule` :209; consumed by `realtime-bridge.ts:584/:676`).
   - **WDC** (`85b81b0`): zero `new Worker(` in `src/`. The worklet surface is UNCHANGED: `public/worklets/` = exactly the 3 files (`dsp-effects-worklet.js`, `biquad-processor.js`, `capture-worklet.js`); `VARI_SPEED_WORKLET_SOURCE` + `loadVarispeedWorklet` (`varispeed.ts:154/:507`, `registerProcessor('daw-varispeed')` :497); `DSP_WORKLET_URL_CANDIDATES` + the in-flight addModule episode/bounded-retry laws (`effects.ts:156/:225/:270`). The delta since `494f6ff` is one docs-only commit — zero code change, 759 held.
   - **OT** (`ded43c4`): zero worker/worklet code (grep `new Worker\(|ManagedWorker|AudioWorklet|addModule|registerProcessor` = 0 hits) — W11's wire-dispatch round touched the wire surface only, as charged.
   - **nle-ui** (`fc4cc35`): zero worker/worklet code (same grep = 0 hits).
   - **App** (`c885ece`): **no `public/` directory exists at all** (stronger than R23's "no `worklets/` dir") — the K3 worklet-asset GAP row's premise stands; `INSERT_MAP` still maps inserts (`audioService.ts:71`).
2. **The AUDIO-THREAD half is unchanged in every load-bearing surface:** the adapter's `retimeChannels`/`RETIME_RATE_MIN/MAX` import (`segment-strip-adapter.ts:87`) + the 96 MB LRU cap (`:470`); the W2/W1 pin families still live (`nle-bridge.test.ts` W2a :758, W2d :832, W2k :899, W1n :2461); H16 + N2b in `player.ts` (`:3276-3294`, `:3316/:3346`); the engine's mediabunny import surface still exactly the export module boundary (`orchestrator.ts:232/:822`, `settings.ts:302/:332`) — the R23 §13B cites all re-read exact.
3. **Why nothing moved:** the R24 deltas are out-of-domain for this file — the engine's +18 pins are W2.5/R8-REV composition-frame rounds (visual-side; the W2.5/`buildElementFilterString` surface lives in spec 04/08 rows, not here), the two fleet re-pins are submodule-only, WDC's seal round is docs-only, the app's R8/R9 waves add audio-thread *consumption* (sidechain ducking, deliver offline mixdown) but zero worker code.

## FIXED (charges 2 + 4 — the pin/mechanical re-base; 18 edit operations, zero structural rewrites)

1. **Status header**: "Round 23 — the audit-fleet re-baseline @ the 2026-09-07 pins" → "Round 24 — the audit-fleet re-verification @ the 2026-09-08 pins (a LOW-DELTA round for this domain … the R23 truth re-verified intact)"; "r6/r4-class" → "r6/r4/K3/r2-class" (matches the actual 5-row register).
2. **§0 heading/pin line**: "the R23 posture" → R24; "BASE (accepted, pinned 2026-09-07)" → "(accepted; re-pinned to the R24 pins, 2026-09-08 — zero material worker/threading delta since R23; every row re-verified)".
3. **§0 BASE engine**: `b8c6f88` 440/440 → `5036387` 458/458; vendors `a4e971d`/`f446512` → `c15a629`/`494f6ff` (+ the "one docs-only commit behind WDC HEAD `85b81b0`" note); "grep-verified at this pin" sharpened to "re-verified by grep … comment mentions only, in `mixer.ts`/`export/index.ts`/`video-sync.ts`"; added the one-clause honest-delta note (the +18 pins are the W2.5/R8-REV visual rounds — this row's surfaces re-read unchanged).
4. **§0 BASE WDC**: `494f6ff` → `85b81b0` (759/759); appended the docs-only-delta re-verification clause (3 worklet files + law files unchanged).
5. **§0 BASE app**: `70e99f0` 117/117 → `c885ece` 174/174; appended the R8/R9 audio-thread consumption note (W2.1 `collectSidechainWires` ducking; W2.4 deliver export's main-thread offline mixdown, whose offline path SKIPS worklet-backed inserts — `deliverService.ts` "no worklet-backed insert effects in the offline path" — the K3 row's offline-side cost surface). The R23 four-fold enumeration kept verbatim (not renumbered — minimal-diff).
6. **§0 GAP header**: appended "the R23 dual-tag transition closed at R24 — D24 tags only".
7. **Phase tags finalized (the window-closing edit)**: the four transitional parentheticals removed — "r6 (was R-engine-p2…)" → "r6"; "r4 (was W-n5…)" → "r4"; "K3 (was C3)" → "K3"; "r2 (was W-audio-class)" → "r2". The register is now D24-vocabulary-only.
8. **GAP row micro-edits**: worklet-asset row — appended "re-verified at `c885ece`: the app's `public/` directory does not exist at all"; async pre-retime row — "NEW at the R23 pins" → "registered at the R23 pins; re-verified OPEN at R24 in both owning queues — the engine's G2 + WDC's HANDOFF #3, design round FIRST".
9. **ACCEPTANCE & TEST PLAN**: R23 battery → R24 battery; counts 440/759/117 → 458 @ `5036387`, 759 @ `85b81b0`, 174 @ `c885ece`; the per-suite pin counts (458)/(759)/(174).
10. **§3 zero-worker note**: "re-verified at `b8c6f88`, 2026-09-07" → "re-verified at `b8c6f88` (R23) and again at `5036387` (R24, 2026-09-08 — still zero sites)".
11. **§7.1/§7.2 fleet-reality notes**: each gained a short "**R24 re-verification: unchanged**" stamp (§7.1: WDC docs-only delta, engine audio files untouched by W2.5/R8-REV, r2 open in both queues; §7.2: the worklet census is still exactly the two Blob-URL processors + WDC's three served assets; no repo added worker/worklet code — grep-verified engine/WDC/OT/nle-ui).
12. **§13B**: preamble → 458/458 @ `5036387`, vendors OT `c15a629` + WDC `494f6ff`, counts re-verified at the R24 pins; §3 row → "(grep src, re-verified @ `b8c6f88` and `5036387`)"; Q12 row → "(2 mentions, zero imports — re-verified R23 and R24 @ `5036387`)" (the orchestrator/settings/metadata cites re-read exact — no cite fixes needed this round).

## GAP ROWS RE-CHECKED (charge 3 — all 5 rows stand; zero landings, zero new rows)

1. **Worker-pool surfacing (r6, engine, non-blocking)** — still open; the P2 backlog (ShapeItem/Lottie/Subtitle/Controller, CPU transition renderers) is untouched at `5036387`.
2. **§8.1 decode worker (r4, user-gated)** — still open; N5 remains DEPRIORITIZED per the D6 directive (engine PLAN.md:48 per the module card).
3. **Worklet asset serving (K3, app-owned)** — still open; WDC's 3 bundles unchanged; the app serves nothing (no `public/` at all). NEW verified color: the app's offline deliver path explicitly skips worklet-backed inserts — the K3 acceptance pin ("real DSP, not passthrough") now has an offline-side twin question worth folding into the browser-venue pin when it is authored (recorded in the app BASE row, not a new GAP row).
4. **Export-render worker offload (r6, engine)** — still open; the export path is main-thread by Stage-3 design, Stage 3 still sequenced in `gaps/audit/C-export-encode.md`. The app's R8 W2.4 deliver export now consumes this main-thread path end-to-end — the row's cost is now user-visible in the DeliverPage; the row's owner/phase/acceptance stand unchanged.
5. **The async pre-retime queue (r2, engine + WDC design contract)** — still open in BOTH owning queues: the engine's HANDOFF G2 ("design round FIRST", 5 seam risks in S3-B) and WDC's HANDOFF #3; the fix specced in `docs/design-w2-varispeed.md` §4.
6. **JKL audio half (the S-wdc queue item)** — CLOSED per the WDC card (S4/W3, pre-R23-pin landings already recorded in this file's app BASE row — no 02 delta). The residue **R4 (⇧K dead key in the engine world)** is a P3 keyboard-mapping document item — spec 16's domain, no worker/threading content; NO 02 row created (noted here so the round's queue sweep is complete).

## HONEST STALENESS (charge 5 — the round's ruling)

**NOTHING material changed for this domain since the R23 pins.** The R23 fleet's honest split (audio-thread half landed fleet-wide; web-worker half at zero in the engine by design, D5 procedural media) is re-verified intact at `5036387`/`85b81b0`/`ded43c4`/`fc4cc35`/`c885ece`. The edits above are pins, counts, phase-tag finalization, and re-verification stamps — no BASE rewrites, no new GAP rows, no normative changes. No historical/teacher sections (§1–§14 corpus, FreeCut/OpenCut-classic scout material) were touched.

## REMAINS-OPEN (the §0 GAP register at the R24 pins — the same 5 rows)

1. Worker-pool surfacing for the P2 engine features — **r6** (engine, non-blocking).
2. The §8.1 decode worker — rides **r4** (PENDING the user's D6 re-affirmation).
3. Worklet asset serving (3 WDC bundles at the root-base path + the real-DSP browser pin) — **K3** (app).
4. Export-render worker offload (the ~520-LOC Stage-3 port) — **r6** (engine).
5. The async pre-retime queue (jank pin; legacy-fallback-while-pending) — **r2** (engine adapter, WDC design contract).

**Out-of-domain notes (verified, not this spec's rows):** WDC's K3-audio-half waveform-seam contract (spec 20 §0's hard-prerequisite row) still has NO presence in WDC's own queue (module card §6.4 — the sharpest spec↔repo mismatch this fleet; promotion action lives in ARCH D29.4). WDC's "4 (sic, 5 named) deferred upstream test ports" are test-port work on scene-mixer, not worker surfaces. The engine's W2.5 effects sidecar + R8-REV clamp belong to specs 04/08/01 (per the module card's staleness list) — deliberately NOT pulled into this file.

## NOTES (method + judgment calls)

- **Zero git commands** (this round's rule, stricter than R23's read-only-git allowance): pins verified via the module cards' gitlink evidence + direct `.git/refs/heads/main` file reads (all five HEADs match the pin world exactly) + code greps for every load-bearing claim.
- **Phase-tag window closure**: the R23 report kept "(was R-engine-p2)"-style dual tags as transitional because sibling artifacts still cited the C/W/R vocabulary; per the ARCH-R24 fleet charge ("the dual-vocabulary window closes at this fleet's end — the D24 set only") the transitional forms are now removed. If any sibling artifact still cites the old vocabulary, it is their round's edit, not this file's.
- **The one additive judgment call**: the app BASE row gained a short R8/R9 consumption note (sidechain ducking + deliver offline mixdown). It is not churn — both surfaces are real audio-thread consumptions of this spec's landed half, and the deliver-service worklet-skip is directly load-bearing for the K3 row's acceptance shape. Kept as an appended clause; the R23 four-fold enumeration is untouched.
- **Battery follow-up (battery_r24, for S-spec):** the posture checks should assert the new §0 pin set (458/458 @ `5036387`, 759/759 @ `85b81b0`, 174/174 @ `c885ece`; vendors OT `c15a629` / WDC `494f6ff`) and the D24-only phase vocabulary in the GAP register (r6/r4/K3/r2 — no transitional tags).

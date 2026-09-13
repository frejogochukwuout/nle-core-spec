# R24 fleet audit — `03-playback-engine.md` (the playback engine spec: clock/transport/JKL/varispeed/scrub)

**Agent:** R24-3d (fresh context, general-purpose). **File owned:** `03-playback-engine.md`. **Date:** 2026-09-08.
**Pin world audited (HEADs read as plain `.git/refs` file reads; NO git commands, NO test runs):** engine `5036387` (458) · OT `ded43c4` (code tip `c15a629`; 536) · WDC `85b81b0` (759) · nle-ui `fc4cc35` (674) · app `c885ece` (174). Evidence: the five `fleet-r24/module-*.report.md` cards + ARCH-R24 (v2) + the R23 precedent + `nle-test-app/docs/design-r9-d30.md` (R5).

## LIVE VERIFICATION (this agent, read-only)

- **HEADs**: engine `.git/refs/heads/main` = `5036387c…`, OT = `ded43c43…`, WDC = `85b81b0c…`, app = `c885ece6…`, nle-ui = `fc4cc35e…` — the R24 pin world exact.
- **Engine census (static `it/test` count): 458 exactly** — 13 files (bridge-seams 113, nle-bridge 96, planner 52, timeline-math 42, transform-resolver 40, load-validation 32, video-sync 31, undo-serialize 15, persistence 13, render-abort 9, timeline-edit-ops 4, realtime-midi 8, api-surface 3). Matches the card's claim.
- **Playback core SOURCE-STABLE at `5036387`**: `clock.ts` 764 / `player.ts` 3,656 / `video-sync.ts` 1,234 LOC — byte-identical to the R23 register values; every §13E line cite re-verified (clock :576/:591/:638/:687; video-sync :926/:181/:225/:1041; player :280; scene-assembly :868-877/:1894); `StaticClock` still absent (SPEC-ONLY stands). The only src/ deltas since `b8c6f88` are composition-frame.ts + bridge-seams.test.ts (W2.5/R8-REV — the +18 of the 440→458 delta; spec 04's territory).
- **OT S1 core laws still live** at `timeline-core.ts` (`setPlaybackRate` :598, `setLoopRegion` :622, `advancePlayhead` :670 — src unchanged since `c15a629`).
- **The M28R JKL ladder verified in code**: `use-timeline-actions.ts:55-62` (doc law) + `:178-197` (impl: `Math.min(Math.abs(rate)*2, 4)` cap, opposite/from-paused → ∓1, K = pause-only, setPlaybackRate dispatched BEFORE play) + the real-mouse pins `scripts/m28-actions-real-mouse.mjs:271-338` ("W11 — DECISIONS #25": K-from-paused pause-only, l→+1/l l→+2/l l l l→+4 cap, rate persists through pause, Space resumes at +4, j→−1/j j→−2).
- **The app's D30 R5 adoption PENDING** (as the cards claim): the port still carries the tap-accel ladder (`use-timeline-actions.ts:176-212`, `use-keybindings.ts:37-45/173-181`); no `data-transport`, no wire symbols in src/.
- **W3 (JKL audio half) rows re-verified at `c885ece`**: `lastScheduledTr` (:451/:537/:606/:646), `varispeedRate: segRate * tr` (:586), maintainPitch (:477/:590), the routed `setPlaybackRate` (engineService.ts:119-129: rate 0 = pause; mirror carries playing/playRate) + the W3 pin `GluedShell.test.tsx:507-520`. The six-law row still reads correctly.
- **WDC at `85b81b0`**: `retimeChannels` + `RETIME_RATE_MIN/MAX` = 1/32/32 (`varispeed.ts:36-44`) — W2 consumed, not re-done; the async pre-retime still queued (design-w2 §4 :223/:319 = WDC HANDOFF #3 = the engine's G2, design round first).

## EDITS APPLIED (minimal-diff; §1-§12 + §15 normative content untouched)

1. **Status header** → R24 framing: the 2026-09-08 pin set, the round's landings (W11-c/M28R, the re-pins, the S4 seal, the app 117→174 with D30 in flight), the JKL BASE/GAP re-base, the D24-only phase-tag window note.
2. **§0 header + BASE preamble** → R24 posture, pinned 2026-09-08.
3. **Engine row** → `5036387`/458 (census + venue note); vendors re-based (OT `c15a629` with the W11 wire surface at the test seam, zero engine mediation; WDC `494f6ff`, docs-only behind `85b81b0`); **New since R23**: the W2.5/R8-REV +17/+1 pins + the playback-core source-stability statement.
4. **OT row** → `ded43c4` (code `c15a629`) 536/536 live-run (386+150, 59 entries); kept the full S1 law text (verified); added the W11 complete-UI round — the wire seam (24 routed + 6 exceptions, M49C) with **the transport verbs routed (play/pause/seek/setLoopRegion/setPlaybackRate)** and **W11-c: the stateless rate-based JKL ladder** with the full law (rate ∈ {0,±1,±2,±4}; same-direction doubling capped ±4; opposite/from-paused reset ∓1; K pause-ONLY; Space resumes at persisted rate; setPlaybackRate BEFORE play) + file:line cites + M49T + the op-parity audit.
5. **WDC row** → `85b81b0`/759 (one docs-only commit since R23); W2 marked consumed-not-re-done (re-verified); added the **S4 seal: the JKL audio half CLOSED** (design v1.1 app-side) with **R4 ⇧K the only residue** (P3 doc item), and the **async pre-retime STILL QUEUED** (engine-owned G2 design round first).
6. **App row** → `c885ece`/174 (family census); W3 six laws kept (verified); the port's tap-accel keymap marked **superseded IN FLIGHT by D30 R5** (M28R adoption, S1 pin comment rewrite with surviving assertions, ⇧L/⇧J port-local keeps, new K-pause-only/Space-inherits-rate pins); EngineMount loop laws annotated with D30 R4 (two-way echo-guarded bridge).
7. **Consumer-pin note** → rewritten: **ZERO lag** (app→engine `5036387` @ `45c00d1`, behavior-delta gate PASS; OT lock-copy `c15a629` byte-exact; nle-ui `fc4cc35`; WDC `85b81b0`); the R23 one-commit debt PAID.
8. **GAP register**: K3 row's "∥ the D25 bridge" → ∥ the D26 census discipline (D30 W-C in flight, ARCH-R24 re-state); **NEW row** — the app's JKL/transport-mirror convergence (D30 W-C/W-D/W-E/W-F in flight: the M28R adoption, the wire port + attachWire + coverage carry, the loop two-way bridge, the Z4 guard + R6 yield-set), tagged **K3** (the coverage-gate instrument per D29.1(b)); K3-audio row gains the D29.4 promotion note (the waveform contract still absent from WDC's queue); **the K1 re-pin row CLOSED** (debt paid; the pin-lockset law survives as K1-continuous).
9. **ACCEPTANCE & TEST PLAN** → battery_r24.
10. **Body pin cites** (§3.4 :152, §5.1 :631, §13E :1524/:1526/:1528/:1535) → `5036387`, each with the source-stability note; §13E re-baseline framing (R22/R23 pins kept as history).

## REMAINS-OPEN (gaps verified still-open at the R24 pins)

- The K3 corpus / w1 viewer-frame rows / w2 staircase rows / r2 reverse-audio / r4-r6 decode+scrub-tier rows — all unchanged-open (the app has no LAW-NET re-expression, no e2e, no viewer state rows, no staircase suite; scrub cache still single-tier; N5 still deprioritized per D6).
- The D30 transport adoption (the new GAP row) — pending W-C/W-D/W-E/W-F.
- The waveform seam contract — still WDC-queue-absent (D29.4 promotion action not yet executed).
- **Phase tags: all D24-set** (w2, K3, w1, K3, r2, r4/r6, K1-continuous, + the new K3) — no retired-vocabulary tags remain; the dual-vocabulary window closes at this fleet's end as stated in the status line.

## NOTES

- The "window closes" charge was satisfied by verification, not mass re-tagging: the R23 re-tag onto D24 was already complete and correct; only the D25→D26 ordering-law phrase needed the re-base.
- Count discipline: 458/536/759/674/174 are the module cards' verified figures (OT 536 run live by R24-1a; WDC 759 + nle-ui 674 run live by their auditors; engine 458 static-census-matched, re-counted by this agent; app 174 static-census per R24-1e). No new counts were invented.
- One intentional non-change: §13E's SoundTouch row keeps `de09c93` as the W2 landing SHA (correct in WDC's own history frame; the vendor-pin chain now carried in §0).

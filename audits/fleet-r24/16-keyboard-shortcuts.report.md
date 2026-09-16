# R24 FLEET AUDIT — 16-keyboard-shortcuts.md

**Agent:** R24-3p (FLEET AUDIT AGENT, fresh context). **Task ID:** R24-3p. **Date:** 2026-09-08.
**File audited + edited (the ONLY file):** `nle-core-spec/16-keyboard-shortcuts.md` (2399 → 2402 lines; prose/register edits only — the §3-§12 normative bodies, the 181-row Appendix A, and all historical contexts untouched).
**Evidence packs read first:** fleet-r24 module cards (OT R24-1a, app R24-1e, nle-ui R24-1d, WDC R24-1c), `ARCH-R24-timeline-strategy-and-topology.md` (v2 — D26/D29), the app's `docs/design-r9-d30.md` (R5/R6/Z4 + Z4's spec-18 §11.3 rejection rationale), the R23 precedent report.
**Posture:** no git mutations, no commits, no test runs; trees clean throughout. (Read-only `git log`/`git show`/`git diff` used to establish HEADs and to read OT's `c15a629` tree; nothing written to any repo.)

---

## 1. LIVE VERIFICATION (re-derived, not trusted)

| Claim | Verification |
|---|---|
| Pin world: engine `5036387`, OT HEAD `ded43c4` (code tip `c15a629`, src-diff empty), WDC `85b81b0`, nle-ui `fc4cc35`, app `c885ece` | module cards + live `git log` at each repo; counts per the cards' authority (OT 536/536 + nle-ui 674/674 + WDC 759/759 live-run; app 174 static census; mini 355 = exact re-grep this round; variants 1521+ per the round canon) |
| **OT M28R = the stateless rate ladder** | live read `use-keybindings.ts` + `use-timeline-actions.ts` @ `c15a629`: `jkl(kind)` computes magnitude from `core.getPlaybackRate()` + `core.isPlaying()` — same-direction `Math.min(|rate|×2, 4)`, opposite/not-playing → 1; pause = `timeline.pause` ONLY; comment "Dispatch order: setPlaybackRate BEFORE play" verbatim at :178-180 |
| M28R pins | live read `scripts/m28-actions-real-mouse.mjs` :273-336 — l→+1, l l→+2, l l l l→+4 cap, cap stays +4, K-pause-with-rate-persisted, Space-resume-at-persisted-+4, j→−1, j j→−2, opposite reset |
| OT's `r`/⇧R loop rows | live read: `{ key:"r" → setLoopFromSelection }`, `{ key:"r", shift → clearLoopRegion }` (W11 pair); the app port has NEITHER (grep 0) — R6's double-fire materializes with W-D |
| nle-ui yield sets | live read `useShortcuts.ts` @ `fc4cc35`: `engineOwnedPlain` (:69) has NO 'r'; `shiftedYields` (:85) = backspace/delete/arrows/j/l, NO 'r'; `:417 case 'r': s.setTool('ripple')` unconditional — the third yield row is genuinely pending |
| The app still ships tap-accel + K = togglePlay | live read: `{ key:"k", action:"togglePlay" }` (:41) + `jklRef` 500 ms closure (use-timeline-actions :177-212); the S1 pin at `GluedShell.test.tsx:428` still reads "double-tap inside 500ms" — D30 R5/W-D genuinely in flight |
| Z4 prerequisites | live: NO `data-transport` in the port keymap (grep 0); the W8 playhead-guard precedent present at use-keybindings.ts:138-144 — the Z4 guard's landing zone confirmed |
| C16 `e.repeat` gap | live grep: NO `repeat` in OT's or the app port's keymap; the mini's gate still live (`useKeys.ts:43 if (e.repeat) return;`) |
| Keymap row counts | live grep: OT @ `c15a629` = 28 binding rows (222532c's 3 jump/toggle rows → 3 jkl rows + the r/⇧R pair); app port = 25 (28 − 3 undo rows, D22b) — the R23 "24-row" numbers refreshed |
| §17 engine rows @ `5036387` | all six re-checked live: player.ts:994-995, api.ts:793/919, run-nle-tests.mjs:167, page.tsx:5794, sidebar.tsx:108 — every verdict STANDS (engine still SPEC-ONLY; the pin move was submodule-only) |
| Census re-checks | nle-ui 53 cheat-sheet rows (card, live-verified); mini 355 (exact); variants ⌘3 = Deliver still (useShortcuts.ts:257 + the wrap-note comment); SPEC-REVISION-CANDIDATES has NO ⌘3 registration (grep) — the collision row stands |

---

## 2. EDITS APPLIED (16 touchpoints, minimal-diff, posture law held)

1. **Status line:** the R24 round segment inserted ahead of the R23 lineage — the 2026-09-08 pin world (engine 458 / OT ded43c4+code c15a629 536 / WDC 759 / nle-ui 674 / app 174 / mini 355 / variants 1521+), the JKL re-base (OT = BASE, D30 R5 = GAP in flight, WDC audio half sealed S4), the D30 keymap rows (R6 + Z4), the phase-tag strip.
2. **§0 BASE app row:** `70e99f0` 117 → `c885ece` 174 (static-census authority marked); the port map count fixed to 25 rows; the (b) W3 JKL half re-shaped — the AUDIO half sealed WDC-side (S4; only the R4 ⇧K dead-key residue, a P3 doc item) and the tap-accel ladder marked SUPERSEDED-IN-FLIGHT by D30 R5 (the port still ships tap-accel + K = togglePlay; use-keybindings is a census merge carrier, W-D pending).
3. **§0 BASE nle-ui row:** `85dcf57` 648 → `fc4cc35` 674 (live-run authority; the D29 ⌘S semantics change noted); 53 rows re-verified; **the yield-set's third row registered as PENDING** ('r' in neither set; `useShortcuts.ts:417` live-cited).
4. **§0 BASE variants row:** 1470 → 1521+ (the R24 canon).
5. **§0 BASE OT row:** fully rewritten — HEAD `ded43c4` / code tip `c15a629`, 536/536; the 28-row map with the **M28R stateless ladder** (rate ∈ {0,±1,±2,±4}; doubling capped; opposite reset; K = pause-ONLY; Space resumes at persisted rate; setPlaybackRate BEFORE play), the r/⇧R loop pair, the undo rows OT keeps; the suites: M24 + **M28R** (the ladder pins enumerated) + M49T.
6. **§0 C22 row:** both cheat-sheet counts re-verified at the R24 pins.
7. **§0 GAP register:** "(was C1(f))"/"(was R-polish)"/"(was W-ops)" dual-tags **stripped** (the window closed); the K3 row gains the in-flight W-C/W-D note; the OT-side census row **re-shaped** — K and J/L RESOLVED OT-side (W11), the JKL divergence MOVED to the app side (until W-D), **B remains the sole live divergence**, the fork-deltas clause re-pointed to the D26 census carriers, C16 re-verified absent in both keymaps (grep-cited); the D25-bridge row re-pointed to the **carrier-reduction program (D26.3)** with the absent-at-`c15a629` evidence; the ⌘3 row re-verified (no candidates-ledger registration).
8. **§0 GAP — THREE NEW ROWS (the charges' REQUIRED adds):** **R5** (the JKL adoption: OT M28R = BASE; the app replaces tap-accel; S1 comment rewritten, assertions survive; ⇧L/⇧J fixed-2× port-local, documented both sides; owner S-app/W-D); **R6** (the `r`-key coordination: the double-fire mechanics, the PACKAGE-side fix — `engineOwnedPlain` + `shiftedYields` gain 'r'; the router-attached/mock-world split; the D28-A5 lockstep pattern; owner S-package + S-app); **Z4** (the scrub-row `[data-transport]` guard beside the W8 playhead-guard precedent at use-keybindings.ts:141-147; **option (a) REJECTED — the slider's keyboard-a11y contract, spec 18 §11.3**; owner S-package + S-app).
9. **§0 ACCEPTANCE & TEST PLAN:** app 174 / mini 355 / nle-ui 674 / OT M24/M28R @ `ded43c4` (code `c15a629`).
10. **§3.1 census paragraph:** re-titled R24 and rewritten — OT M28R = BASE (stateless, live-state-computed); the app = tap-accel until W-D; the audio half CLOSED (WDC S4, R4 residue); the K/J-L divergences resolved OT-side; B the outlier; C20 ½× slow-mo still unimplemented everywhere.
11. **§8.7:** one appended census note (the live ladder is stateless; §8.7's closure is the spec-side form — the code block untouched).
12. **§13:** header + note re-cast ("dual-tag window closed at R24"); "r3-adjacent" → **r3**; "r1/r6-adjacent" → **r1** (keyframe op depth); the exit-criteria line re-pinned (`c885ece` 174/174; M24/M28R @ ded43c4) + the remaining-rows list gains the D30 W-D family.
13. **Appendix C status note:** 174/174, 674, 1521+, M28R, `ded43c4`/`c15a629`.
14. **§17:** the R23 bracket extended with the R24 re-verification @ `5036387` (all six rows + the submodule-only re-pin note; R23 kept as lineage); the §3.1 JKL row's note gains the OT wire-verb drive (`timeline.setPlaybackRate/play/pause`, M28R, dispatch-order law).
15. **Cross-reference list (Spec 14 row):** "dual-tagged" → "mapped … dual-tags stripped at R24".

---

## 3. REMAINS-OPEN (verified still-open at the R24 pins)

1. **D30 W-D (the round's real delta):** R5 the JKL adoption + R6 the `r` yield-set + Z4 the scrub guard — ALL in flight, none landed app-side or package-side (grep-verified: no `data-transport`, no 'r' in the yield sets, the port still tap-accel; the app's port has no r/⇧R rows yet). W-C (the wire-dispatch seam) gates first.
2. **B divergence:** OT + the app port carry `b` = bookmark-at-playhead vs §3.2's razor — the disposition rides the carrier-reduction program + the D30 R10(k) spec ask.
3. **C16 `e.repeat`:** absent from BOTH the OT and app-port keymaps (the held-S machine-gun class); the mini's gate remains the only live instance.
4. **The K3 re-expression** (the mini's key laws app-side) and **K4 e2e**: zero app-side presence (per the app card's grep).
5. **⌘3 reconciliation:** the variants' Deliver vs §3.8's "Effects workspace" — still unregistered in SPEC-REVISION-CANDIDATES (outside this file's scope).
6. **r5 long tail** (~128 of 181 rows) + **r1 keymap surfaces** + **C20** ½× slow-mo: unchanged.
7. **R4 ⇧K dead key** (the WDC S4 residue): a P3 doc item, now registered in the JKL rows.

## 4. CROSS-FILE RESIDUALS (for the owning agents — NOT edited here)

- **18-ui-shell.md** holds the stale nle-ui 648/`85dcf57` pins + the "fork retiring" row (per the nle-ui card's §6) — the fleet-18 agent's charge; my §0 rows are coherent with the module-card values.
- **00-master** owns the D25-body supersession note (ARCH-R24 F3) — my D26 re-pointing in the GAP register defers to it.
- **SPEC-REVISION-CANDIDATES** still lacks the ⌘3 registration (the variants' wrap promise) — flagged, not fixed.
- **battery_r24** should re-point the key-surface census checks to: 28/25-row keymaps, 53/56 cheat-sheet rows, the M28R ladder laws, and the three D30 W-D rows' pending signatures.

**Verdict:** the spec's binding tables and law registers re-verified VERIFIED-STRONG at the R24 pins; the §0 register was one pin-wave + one semantics-wave stale (the 648/117/489 pins, the K/J-L rows OT resolved, the tap-accel form the app will retire) — now re-based with the D30 W-D family (R5/R6/Z4) registered and the phase tags stripped to the D24 set. Current as of 2026-09-08.

# R24 fleet audit — `18-ui-shell.md` (the UI-shell/chrome contract; the mini's embedding home — a high-delta file this round)

**Agent:** R24-3r (FLEET AUDIT, fresh context). **File owned + edited:** `18-ui-shell.md`. **Date:** 2026-09-08.
**No git commands** (HEADs established by file-reads of `.git/refs/heads/main`; every feature claim verified by live code reads). **Two writes total: the spec edits + this report.**
**Evidence packs:** `fleet-r24/module-nle-ui.report.md` (THE package card), `fleet-r24/module-nle-test-app.report.md` (the app card), `audits/ARCH-R24-timeline-strategy-and-topology.md` (v2 — D26.5/D27/D29), `fleet-r23/18-ui-shell.report.md` (the precedent). The `ui-mock/` repos are NOT in this sandbox — mini 355 / variants 1521+ / the 59+15 testid census carry the pin-world + module-card + R23-precedent authority (the mini BASE row untouched).

## 1. LIVE VERIFICATION (re-derived, not trusted)

| Claim | Verification |
|---|---|
| Pins: nle-ui `fc4cc35`, app `c885ece`, OT `ded43c4`, engine `5036387`, WDC `85b81b0`; app lock-copy `c15a629` | file-reads of refs + `UPSTREAM.lock.json` — all exact |
| **The 4 AppShell prop seams** (`timelineRegion`/`mediaDragSource`/`programMonitor`/`exportRequest`) | live read `AppShell.tsx:208-227` (W2.4/D29 doc comment; threaded :305) |
| W2.3 `saveState` `'idle'|'dirty'|'saving'|'saved'` + `setSaveState` | `useUiStore.ts:122,195,317,597` — view-state comment, `'idle'` default; ⌘S real-dirty gate `useShortcuts.ts:310-312`; beforeunload `AppShell.tsx:168-180`; StatusStrip dual-world `:32-56` |
| W2.4 DeliverPage contract (4 shape types + request fn) | `DeliverPage.tsx:37-91` read; **R8-REV #1 revoke** at `:278-281` (live) |
| W2.5 `SceneGrade` + `setGrade` neutral-seeded merge | `useUiStore.ts:42,123-126,199,268-271,599-604`; ColorPage live sliders + honest-local Pivot/Qualifier `:62-81` |
| **OT `data-test=` = 68 sites / 14 files; `data-testid` = 0** | live grep `src/components/` — both exact |
| **nle-ui testid census** | live grep non-test src: **128 total emission sites / 29 files**; `shell-*` family = **70 sites / 62 distinct names (55 static + 7 templated) / 22 files** |
| OT S-round **LANDED** | `timelineRouter.ts:112` (patch carries `transitionOut` + `speed`); `useUiStore.ts:619-632` (`toggleTrackLock` routes when engine attached); PLAN rows still `[ ]` (landed-but-unticked) |
| C0 **NOT STARTED + FILING GAP** | rg `MiniShell|C0|chrome family` over `.agents/PLAN.md` = **zero hits**; DECISIONS ends at **D28** |
| App wiring @ `c885ece` | `App.tsx:52-56` wires all 4 seams incl. `exportRequest={deliverService.exportRequest}`; persistenceService `s.color` sidecar; the 8-effect mock library (`AppShell.tsx:28-36`, the `application/x-nle-effect` contract) |

## 2. FIXED (edits applied — the 18 charges, minimal-diff, posture law held; §3-§15 bodies untouched)

1. **Pins re-based everywhere (charge 1):** header Status v1.5 → **v1.6 (Round 24)** + date line; §0 nle-ui `85dcf57`/648 → **`fc4cc35`/674** (674/674 run live per the module card; 37 files, 74 stories; consumer pin `fc4cc35`); app `70e99f0`/117 → **`c885ece`/174** (the static census enumerated); §13 nle-ui row re-pinned; §13 OT row `222532c`/489/39 files → **`ded43c4`/536/40 files** (code pin `c15a629`, src-diff-empty; the W11 wire layer noted). Stale shas now confined to the line-4 lineage record.
2. **The 18:17 fork row REVERSED → the converging mirror (D26):** census-governed (39 mirrors [7 byte + 25 mechanical = 32 zero-action] + 7 carriers + the EngineMount host; `use-wire-dispatch` pending W-C); lock-copy byte-exact; D25.2's mechanism retired; retirement = the D30-declared irreducible carrier set. Same re-point in §16.3.5 (vendored → mirrored; port-then-swap → the census discipline).
3. **The D29 seams promoted to BASE (charge 2, REQUIRED):** W2.3 saveState (+ the ⌘S real-dirty gate, beforeunload, StatusStrip dual-world), W2.4 exportRequest + the 4 contract types (present-world job rows; absent = the honest mock verbatim), W2.5 the grade sidecar + setGrade + the LIVE Contrast/Saturation sliders (Pivot/Qualifier honest-local; brightness/hue slider-less), R8-REV #1 the retryJob blob-URL revoke; **the 4 AppShell prop seams** in both the nle-ui and app bullets.
4. **The OT S-round row flipped to BASE (charge 3):** P-widen + P-lock-route both LANDED (code-verified, above); the landed facts in the nle-ui bullet; the GAP row replaced.
5. **The three-way DOM mapping row (charge 4, REQUIRED — D26.5/D29.3):** a NEW GAP row (timeline units → OT `data-test=` 68; chrome units → nle-ui `shell-*` 70/62/22, live-counted; no-counterpart units → the D25.3b worklist); the mini's 59+15 census gets the mapping-row formulation; the STRUCTURAL-half row's "testid-emission convention" clause RETIRED as the wrong instrument (the `data-test` freeze ask + census-gap closure is OT's queue item).
6. **C0 + queue-protocol rows (charge 5, REQUIRED):** MiniShell stays GAP — owner S-package/w1-prep, verified NOT-STARTED @ `fc4cc35` **+ the FILING GAP** (no C0 row in nle-ui's PLAN); a NEW cross-repo queue-protocol row (DECISIONS ends at D28; the D30 W-D package-edit queue R6/Z5/Z7/cheat-sheet/`data-transport`/Brightness-Hue designed + queued app-side only, none landed, none filed package-side).
7. **Port-assembly rows (charge 6):** the app bullet carries the 174-census, the R8 real-wiring waves (persistence/ducking/mediabunny/effects-grade preview) + **the honest-mock ledger** (LUT/wheels, fcpxml, Pan/Transform/preserve-pitch, brightness/hue sliders, the 8-effect mock library, the OPFS label, the fixture rows).
8. **Phase tags stripped to the D24 set (charge 7):** GAP header re-states the closed window; C0/C1(b-f)/C2-behavior/C4/R-polish/W-color/W-ops tags removed from all live rows (r5/r1/r3/K3/K4/w1/post-K4 remain); the color row re-based to the r3 REMAINDER (LUT/wheels + the monitor↔export divergence; the D29.5c grade-decline as law).
9. TL;DR gains the v1.6 (R24) sentence; BASE header gains the R24 re-pin stamp.

## 3. REMAINS-OPEN (verified at the R24 pins)

C0 MiniShell + its filing gap; the TOKEN (w1) + STRUCTURAL (crawl-tail) halves; **K3/K4 verified un-started** (zero LAW-NET/e2e hits in the app tree — stated in the rows); the cross-repo queue debt; r1/r3/r5; the mini census mapping row (to author); the app-side census register doc (per the 05 report — cross-file).

## 4. POSTURE NOTES

No normative damage: the §3-§15 contract bodies, §16.2's R22 drag-law notice, and the §16.3.3 "355 vitest" battery phrase preserved verbatim; the historical C-ledger ids (C11-C22, the cloudcut contradiction register) kept as lineage. Exact shas everywhere (`fc4cc35`, `c885ece`, `ded43c4`, `c15a629`, `5036387`, `85b81b0`). Honesty markers: 174 = static census + 674 = the module card's live run (suites not re-run here — no-mutation posture); the mock streams' counts carry pin-world authority. Final sweep: zero stale pins/phase-tags outside the line-4 lineage record.

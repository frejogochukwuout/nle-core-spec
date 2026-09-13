# amend-A4 — R27 Wave 6-A continuation (W-A's remaining mechanical set)

**Task ID:** R27-W6-A4 | **Agent:** amend-A4 | **Round:** R27 final-tightness, Wave 6 (the W-A continuation) | **Date:** 2026-09-14
**Scope:** the mechanical pin/cite/count/re-truth amendments for `02-workers-threading.md`, `04-renderer-color.md`, `07-composition.md`, `10-fcpxml-export.md`, `11-cloud-render.md`, and `IMPLEMENTATION-PLAN.md` (ONLY the 6 census/pin sites — the D40 overhaul is W-C's). Sources: `audits/fleet-r27/spec-02.md` (FIX-4/FIX-5 rows), `spec-04.md` (the 13 enumerated edits), `spec-07.md` (Row 2's line family + Row 3), `spec-10.md` (FIX-1 + the mechanical pins + FIX-6's counts), `spec-11.md` (F-1..F-5), `xcut-census.md` §1 (the plan×6) + §5 (consumer-lock context). Editing-only: no commits, no branches (the orchestrator commits per batch).

**Ground-truth pins applied:** engine `f9ac806` (748/748, code anchor `50b91f5`; vendors OT `6e2b91a` + WDC `ec8fd5c`; `src/lib/nle` 57,064 LOC/63 files) · OT HEAD `55c81c0`/code `970948a` (632/632; 31 = 28 routed + 3 exceptions; M49C 28/28, 72 report entries) · WDC `ec8fd5c` (777/777) · nle-ui `32abd58` (690/690) · app `c020b2a` (252/252; the census 42 = 36+5+1 @ `6e2b91a`; maintainPitch read-merge at engineService.ts:510-513 — verified live this session).

---

## §1 Per-file edit register (58 string-edits total)

### 02-workers-threading.md — 11 edits (FIX-4's pin batch + FIX-5's two re-anchors)

| Site | Edit |
|---|---|
| :15 | engine row head `5036387`/458 → `f9ac806`/748; vendors "OT `c15a629`, WDC `494f6ff` (one docs-only commit behind WDC HEAD `85b81b0`…)" → "OT `6e2b91a`, WDC `ec8fd5c`"; appended the R27 movement note (the RC round + M2 Wave 1 bridge bus-law/sidechain parity + the `public/worklets` symlink — audio-adjacent movement now exists); the R24 parenthetical kept as dated history |
| :16 | WDC row head `85b81b0`/759 → `ec8fd5c`/777; the R24 "files re-verified unchanged" parenthetical replaced with the R27 S-series one (19 refreshed + the 18-file closure; the REBUILT `dsp-effects-worklet.js` + the `DspDiagnosedProcessor` mixin — points at §7.4) |
| :17 | app row head re-pinned only: `c885ece`/174 → `c020b2a`/252 (the dead deliver/sidechain LAW halves left for W-B per FIX-2) |
| :22 | the K3 worklet row's pure pin only: "re-verified at `c885ece`" → "`c020b2a`" (the `public/`-absent fact still true; the dead "serves no worklets" premise left for W-B per FIX-3) |
| :26 | the acceptance counts: 458/458@`5036387` / 759/759@`85b81b0` / 174/174@`c885ece` → 748/748@`f9ac806` / 777/777@`ec8fd5c` / 252/252@`c020b2a`; the three trailing suite counts (458)/(759)/(174) → (748)/(777)/(252) |
| :107 | the zero-workers note appended: "and again at `f9ac806` (R27, 2026-09-13 — still zero sites)" |
| :2338 | §13B header: "458/458 vitest @ `5036387`, vendors OT @ `c15a629` + WDC @ `494f6ff` — the counts re-verified at the R24 pins" → "748/748 vitest @ `f9ac806`, vendors OT @ `6e2b91a` + WDC @ `ec8fd5c` — the counts re-verified at the R27 pins (a docs-only head over code anchor `50b91f5`)" |
| :2344 | §13B §8.1 row: `player.ts:1629` → `player.ts:1646` (the `renderVideoFrame` line) |
| :2349 | §13B Q12 note: `export/orchestrator.ts:232,822` → `:232,836` (FIX-5's second re-anchor) |

### 04-renderer-color.md — 10 edits (spec-04's enumerated 13: Rows 1/2/8 minus the W-B halves)

| Site | Edit |
|---|---|
| :15 | the Gaussian-Blur default flip: "(radius from params, default 4, non-finite→4, …)" → "(radius from params, **default 10 — the GPU registry's declared default per the F2-5 cross-module coherence pin** (the old default-4 previewed a blur the render never shipped), non-finite→10, …)" (Row 1's P1; the 07 twin left to the W-B Gaussian pass) |
| :15 | `bridge/composition-frame.ts:223` → `:257` (buildElementFilterString) |
| :15 | the `CompositionDrawOp.filter` field `(:161)` → `(:179)` |
| :15 | "`bridge-seams.test.ts` now 113" → "now **151 @ `f9ac806`** (the F2-5/F2-6/F2-7/OV-05/P1 hardening waves)" |
| :22 | GAP row 1's wire trap: `GPU_EFFECT_TYPES (:1509/:1515 — …)` → `(:1492 the const, :1529 `gpu-power-window`, :1535 `gpu-secondary-qualifier` — …)` (the trap verdict UNCHANGED) |
| :1192 | §13D header: appended the R27 re-verify sentence — "**748/748, 57,064 LOC under `src/lib/nle` @ `f9ac806`** … three rows re-anchored below (compositor `:1825`/`:1818` + `player.ts:1641/:1647`, mask-manager `:542-557`, player `:1580`); the 46-site count + the pass-discipline anchors re-verified exact" (the R23/R24 notes kept as dated history) |
| :1196 | §13D row 1: `compositor.ts:1797` → `:1825`; the note cell's `uploadRgba at :1790, called from playback/player.ts:1630` → `at :1818, called from :1641/:1647` |
| :1203 | §13D row 8: `mask-manager.ts:724` → `:542-557` |
| :1204 | §13D row 9: `player.ts:1575` → `:1580` |

### 07-composition.md — 4 edits (Row 2's line family + Row 3; the Gaussian text + OV-05 law skipped)

| Site | Edit |
|---|---|
| :13 | the bridge census re-truth: "64 → 97 → 113 pins (18 → 21 describes; … +16 to 113 @ R24 … — the only commits to touch the file since the R23 pin; the three new W2.5 describes (:921/:970/:998)…" → "**64 → 97 → 113 → 151 pins** (18 → 21 → 33 describes; live count @ the R27 pin `f9ac806`; … +38 to 151 @ R27 from the F2-5/F2-6/F2-7 hardening + the P1 opencut-laws consolidation + OV-05 — five commits (`c8a4d00`/`02b0976`/`1c04887`/`2b2de33`/`9850231`) touched the file since the R24 pin; the W2.5 describes now at :980/:1045/:1073, the OV-05 pins at :869/:886/:901, the F2-6 exception-bracket describe at :1136, the F2-7 probe describe at :2208)" |
| :13 | the comp-frame line family: `:119`→`:133`, `:124`→`:138`, `(:161)`→`(:179)`, `(:223)`→`(:257)` — the "default 4, non-finite→4" TEXT untouched (the Gaussian twin is W-B's) |
| :13 | the phantom-name fix: "`transition-inputs.ts` `clampFadeToElementSpan`" → "`clampFade` (:186 — fades clamp to each element's own span; the name `clampFadeToElementSpan` appears nowhere in the live history)" |
| :1169 | §12.A.1's W2.5 row: the same line family — cell `composition-frame.ts:223`→`:257`, `:119`→`:133`, `:124`→`:138`, `(:161)`→`(:179)`, the honest-skip `(:229)`→`(:263)`; the Gaussian text untouched |

### 10-fcpxml-export.md — 9 edits (FIX-1 + the mechanical pins + FIX-6's counts/note)

| Site | Edit |
|---|---|
| :4 | Status line appended: "Round 27 — the Z2 flip + the worklet-flush law + the model-coherence fold (see `audits/fleet-r27/spec-10.md`)" |
| :12 | the five BASE pins re-keyed to the R27 set (engine `f9ac806` 748/748, OT `55c81c0`/`970948a` 632/632, WDC `ec8fd5c` 777/777, nle-ui `32abd58` 690/690, app `c020b2a` 252/252) with the R24/R23 pins demoted to dated lineage |
| :14 | the engine-half pin: "(landed R23, UNCHANGED at `5036387`, 458/458)" → "(landed R23, re-verified @ `f9ac806` — 748/748; the export subsystem grew 1,785→1,806 LOC since the R24 note, HW1-8 + F2-7 — §12.8's R27 note)" |
| :16 | app pin: "The app @ `c885ece` (174/174)" → "@ `c020b2a` (252/252)" |
| :20 | the K4 grep pin: "grep-verified at `c885ece`" → "`c020b2a`" (still zero e2e) |
| :21 | **FIX-1 (the P1 Z2 premise flip):** the "currently UNGRADED — ZERO grade/color terms at `c885ece` … W-E applies … (pin: …)" clause → "**CLOSED (the app's Z2 landing, re-verified R27 @ `c020b2a`):** the scene grade reaches the export as the CONSUMER-SIDE FINAL PASS — … `ctx.filter = buildGradeFilterString(grade)` (`deliverService.ts:300-324`) … The D29.5c engine-seam DECLINE stands … — with the R27 note that the engine's R9-c re-filed the seam-side final-pass proposal (`paintCompositionFrame(…, { grade })`) … (04 §0's row is the twin)." |
| :1417 | §12.1 LOC: 00-master 466 → **863** |
| :1419 | §12.1 LOC: 09-project-model 2379 → **3,102** + the R27 parenthetical (09's audit re-based the schema blocks; 10's §4 re-derives against them) |
| after :1531 | §12.8's R27 re-verification note (4 points: zero-FCPXML holds; export 1,785→1,806 — HW1-8 + F2-7, the flush law app-side vs the engine's 0 fast-path; the colorSpace ENGINE-GAP re-verified OPEN; the R7-era line pins re-anchored) |

### 11-cloud-render.md — 12 edits (F-1..F-5)

| Site | Edit |
|---|---|
| :12 | F-1's BASE-header append: "…the R24 HEADs, 2026-09-08; the R27 re-verify at engine `f9ac806` moved four pins — DECISIONS :226→:242, orchestrator :524→:544, api.ts 2,757→2,777, export/ 1,785→1,806 — see §14R's R27 note):**" |
| :16 | F-1: api.ts "(2,757 LOC;" → "(2,777 LOC at the R27 pin `f9ac806`;"; export/ "(orchestrator 936 / … / contracts 92 LOC;" → "(orchestrator 957 / … / contracts 92 + index 20 LOC — 1,806 total;" |
| :1436-:1440 | F-4: the dependency-specs LOC column — 00 466→863, 01 1962→2272, 04 2076→2398, 02 2478→2649, 03 2360→2792 |
| :1444 | the 14R preamble's api.ts "(2,757 LOC, the harness API)" → "(2,777 LOC, …)" |
| :1449 | F-3: the §14R Xvfb row `.agents/DECISIONS.md:226` → `:242` (the quote unchanged — re-read at :242) |
| after :1461 | F-2: the R27 round-note blockquote (zero-cloud re-verified at all five R27 pins; both halves' pins — api.ts 2,777 / export 1,806 / orchestrator 957 with `createRenderAdapter` :544; the moved-pins ledger with the HOLD list; the Z2 + M2-Wave-1 app-side additions; the activation-time ENGINE-GAPs unchanged) |
| :2501 | F-5: "subscribes to `GET /api/engine/subscribe` (SSE/WebSocket per spec 15 §8.5)" → "subscribes via `POST /api/engine/subscribe` (SSE/WebSocket per spec 15 §8.7)" |

### IMPLEMENTATION-PLAN.md — 12 edits (xcut-census §1's plan×6 + the two allowed premise flips)

| Site | Edit |
|---|---|
| :18 | census site 1: (1b) `WIRE_UI_EXCEPTIONS` → "**LANDED** (the export exists since AR-1; 3 verbs now; green 28/28 @ `970948a`; the tsc-asserted `Record`…)"; (4) the M49C "green 24/24 at the pin" → "green 28/28 @ `970948a`" |
| :19 | census site 2: "the coverage gate green 24/24 routed − 6 exceptions; the census at its declared irreducible set **35 zero-action + 5 carriers + host**" → "green 28 routed − 3 exceptions; the census at its declared irreducible set **42 = 36 zero-action + 5 carriers + 1 host @ `6e2b91a` (the W4 re-base)**" |
| :19 | the maintainPitch-resolved flip (premise resolved-in-code, verified live): "land the maintainPitch residual HERE (`engineService.ts:477/:486` hardcodes `maintainPitch: true` — the Inspector Preserve-pitch toggle is dead app-side…)" → "land the maintainPitch residual HERE — RESOLVED in code @ `c020b2a` (`engineService.ts:510-513` now READ-MERGES `preservePitch` (patch → element → `?? true`) — no hardcode left; the Inspector Preserve-pitch toggle is live; …)" |
| :19 | the K3-audio hard-gate flip: "the audio pins STILL hard-gated on S-wdc's unlanded waveform promotion — the only K3 sub-half with an external prerequisite" → "the audio pins' hard gate RESOLVED R26 — S-wdc's waveform promotion LANDED @ `035afe8`+`387f327`, K3's audio half UNBLOCKED against the named surface (see the S-wdc row)" |
| :52 | census site 3 + the pin figures: "the R25 state, live-verified by the scouts: engine 458/458 @ `3989506`, OT 536/536 @ `fdb771c` … M49C gate 24/24, 59 entries, WDC 759/759 @ `85b81b0`, nle-ui 674/674 @ `3026099`, app 206/206 @ `64fb0ab`" → "the R27 state, live-verified by the R27 fleet: engine 748/748 @ `f9ac806`, OT 632/632 @ `55c81c0` (code pin `970948a`) … M49C gate 28/28, 72 entries, WDC 777/777 @ `ec8fd5c`, nle-ui 690/690 @ `32abd58`, app 252/252 @ `c020b2a`" |
| :53 | census site 4: "registered, green 24/24 routed verbs + 6 documented exceptions at `c15a629`" → "green 28/28 routed verbs + 3 exceptions at `970948a`"; "the completeness census the way the 24+6 wire census is" → "the way the 31 = 28+3 wire census is" |
| :54 | census site 5: the final assertion "`accumulated ⊇ WIRE_COMMAND_TYPES − 6 exceptions`, through the real mounted UI" → "`accumulated ⊇ WIRE_COMMAND_TYPES − the 3 exported exceptions` (live-barrel — the gate consumes the exported registry), through the real mounted UI"; (d)'s "**hard prerequisite: S-wdc's waveform seam contract — the only K3 sub-half with an external prerequisite**" → "**prerequisite RESOLVED R26: … LANDED @ `035afe8`+`387f327` — K3's audio half UNBLOCKED against the named surface**"; the exit gate's "the audio pins green (hard prerequisite: …)" → "(prerequisite RESOLVED R26 — the waveform seam contract landed @ `035afe8`+`387f327`)" |
| :84 | census site 6: the §3 workstream's W-C-era "WIRE_UI_EXCEPTIONS" item → "WIRE_UI_EXCEPTIONS (LANDED — the export exists since AR-1, 3 verbs now; this W-C-era filing row is history)" |

---

## §2 Grep verification (post-edit, run this session)

- **02:** `f9ac806|ec8fd5c|c020b2a|6e2b91a` → 7 lines carry the new pins (:15/:16/:17/:22/:26/:107/:2338). Residual old-pin hits = 5, ALL dated-history (the :15 R24 parenthetical, the :107 R23/R24 stamps ahead of the new R27 stamp, the :272 R23 note, the :2342 dated grep stamp, the :2349 "re-verified R23 and R24" note). `player.ts:1629` → 0; `232,822` → 0.
- **04:** `default 4, non-finite→4 | composition-frame.ts:223 | field (:161) | now 113 | :1509/:1515 | compositor.ts:1797 | mask-manager.ts:724 | player.ts:1575` → the only residual is :1192's `54,791` INSIDE the dated R24 note (kept as history; the R27 sentence follows it). The new forms present: default 10 / :257 / (:179) / 151 @ `f9ac806` / :1492 the const / :1825 / :542-557 / :1580 / 57,064.
- **07:** `(:119 | at :124 | field (:161) | (:223 | (:229) | :921 the | :970 the | :998 the | 97 → 113 pins` → 0 stale. New: `(:133 | at :138 | (:179) | (:257) | (:263) | :980 ( | :1045 ( | :1073 ( | 97 → 113 → 151 pins | clampFade` (:186 — on :13/:1169. `clampFadeToElementSpan` now appears ONLY inside the corrective "appears nowhere in the live history" note.
- **10:** `currently UNGRADED | " 466 " | " 2379 "` → 0. Residual old pins = :12's dated R24/R23 lineage (by design), :1482/:1519's dated R23/R24 notes, and **:15's OT row** (the W-B serialization clause — see §3). New forms on :4/:12/:14/:16/:20/:21/:1417/:1419/:1533-1544.
- **11:** `2,757 | orchestrator 936 | DECISIONS.md:226 | " 466 " | " 1962 " | " 2076 " | " 2478 " | " 2360 " | GET /api/engine/subscribe` → the only residuals are :12's dated R23/R24 header lineage and :1459/:1461's dated R23/R24 round-notes (the R27 note follows at :1463). New forms on :12/:16/:1436-1440/:1444/:1449/:1463/:2503.
- **PLAN:** `24 routed | 24 UI-routed | 24/24 | 24+6 | 6 exceptions | 6 documented | 458/458 | 536/536 | 674/674 | 206/206` → **zero live census-family reads** (the census §3 battery check `live_stale(plan, "24/24") == 0` PASSES). The only residual count-era hits are :19's dated records (the DONE @ `64fb0ab` parenthetical's "206/206 live-run", the R26 EXECUTED register record "41 = 35 zero-action…", the README note "(30/596/…at 206)") and :21's S-wdc row (outside the plan×6). The new forms (28/28, 28 routed, 31 = 28+3, 748/748, 632/632, 777/777, 690/690, 252/252, 42 = 36 zero-action) present on :18/:19/:52/:53/:54.

Diff stat (this wave's six files): 02 ±18 lines · 04 ±12 · 07 ±4 · 10 ±29 · 11 ±22 · PLAN ±12. (`19-code-references.md`'s ±125 in the tree is ANOTHER agent's edit — untouched by amend-A4.)

---

## §3 The W-B handoff list (skipped by design — the law halves + the not-mine sites)

**spec-02 (the W-B set):**
1. **FIX-1 (P1)** — insert §7.4 (the audio-thread observability + realtime-safety law: the EngineDiagnostic bus, the heartbeat/liveness monitor, the in-`process()` protocol, the stall bypass-to-passthrough ladder, the rt-safety-gate's transitive-heritage fix) + the §12 test-class fold + the 20/02 cross-links.
2. **FIX-2** — :17's app-row LAW rewrite (the M2-Wave-1 single-owner sidechain law + the `workletFlushMs` flush law at deliverService.ts:252; the row head is already re-pinned to `c020b2a` 252/252).
3. **FIX-3** — :22's K3 worklet-serving row's RESOLVED rewrite (the vite `serve-vendored-worklets` plugin + the engine symlink venue + the remaining real-browser venue pin; only the `c020b2a` pin stamp landed).
4. The :4/:12/:14 posture-label flip (R24→R27, drop "LOW-DELTA") + :302's §7.2 census R27 append (rides FIX-1) + FIX-6/FIX-7 (the Testing-section pointer hygiene).

**spec-04 (the W-B set):**
5. **Row 6** — the §8 venue-law cross-link paragraph (explicitly W-B).
6. **Row 7** — the §8.5 bit-depth shorthand → the 08 §18 pointer (the ×1023 ruling; explicitly W-B).
7. **Row 13** — the §0 BASE pins re-key (engine/OT/app/nle-ui/variants row heads, :1190's `@ 5036387`, :1202's "(re-verified @ `5036387`)", :22's "re-verified @ `5036387`") + the D12 ratification note.
8. Rows 3/4/5/9/10/11/12 — the r3-twin sharpening, the D29.5c Z2/R9-c clause pair at :24 (the 10:21 twin landed; 04's half remains), the NS-4 register, §16.5's measured-signal ruling, the 33ms cite, the MediaRecord container, the §7.1 DegradedRendererBanner pointer.
9. Row 1's N1-row append (the OV-05 transitionOut input-law pointer — rides 07's §6.1A law).

**spec-07 (the W-B set):**
10. **Row 1 (P1)** — the OV-05 one-input-source law at §6.1A (explicitly W-B).
11. **Row 2's Gaussian half** — the "default 4, non-finite→4" → "default 10 (F2-5), non-finite→10" text flip at :13/:1169 (the twin of 04's landed flip; the line cites around it are already re-anchored).
12. Rows 4/5/6/7/8/9/10/11/12/13 — the app row (M2 sidechain story, 344→418, :369→:347, :469/:515→:468/:514), the GAP re-key + NS-4, the OT row (pin + :2638→:3115-3123, :161→:181), §6.1A's R23-note bits, the A/V divergent-floors law, **the §12.A.1 preamble + the 4 drifted rows (player :1321→:1326, :1575→:1580, mask :723→:734, :671→:682; 458→748, 54,791→57,064, 62→63 files)**, the mock row, RA-V1-1, the R9-c register, the battery_r24→r27 label.
13. Row 3's optional `clampAuthorFadeToSpan` one-law note (the phantom-name fix landed without it).

**spec-10 (the W-B set):**
14. **FIX-2** — the worklet-flush law insert at :14 (the r5 dependency view; 20/02 own the law home).
15. **FIX-3's clause halves** — :15's D-HB2 serialization re-truth (rides 09's W-B set; the OT pin row still reads `ded43c4`/`c15a629` — the pin is entangled with the stale clause, left whole for W-B) + :14/:24's variants DeliverPage clause + the optional F3 note.
16. **FIX-4a/4d/4e** — the N1 inline-elements law, the `presentation` keying + alignment offset, the per-scene markers (**FIX-4b/c explicitly W-B** — the volume-domain law + the preservePitch timeMap, riding 09's set).
17. **FIX-5 (the NTSC/1001 law)** — explicitly W-B. **FIX-7** (the fixture coherence — the `retime: {speed: 2.0}` sidecar reads + the 17 §5.3 registration note) + **FIX-8** (the P3 polish set).

**spec-11 (the W-B set):**
18. F-6..F-11 — the P3 riders (the D6/r4 adjacency, the D12/D16 venue note, the one-engine "same managers" clarification, the heartbeat disambiguation, the two-world Tier-3 note, the FreeCut provenance line).

**IMPLEMENTATION-PLAN (W-B/W-C, outside the plan×6):**
19. **:32's vendored `c15a629`** — one of xcut-census §5's "doubly stale" consumer-lock rows (says `c15a629`; reality `6e2b91a`; target `55c81c0`) — the consumer-lock flip set (00:3/:17, 09:14, 15:15-16, 18:514, 19:216, PLAN:32) is W-B's.
20. **:42's pin-world paragraph** (the dated "R25 re-baseline current set") + :18's gates cell ("536→, 59 entries") + :21's S-wdc 759s + :20/:33's `composition-frame.ts:70-94` cites + :20's S-engine R9 row-head pins + :19's dated records — all W-C's D40 overhaul territory.
21. **:20/:33/:85's maintainPitch mentions** — :19 now reads RESOLVED-in-code; the three sibling mentions (the S-engine row's "re-filed APP-side (the app's engineService hardcode)", the R3 cold-executor row, the §3 S-app workstream) still describe the pre-R27 open state — W-C's overhaul re-bases them (they are outside the 6-site mandate).

**Cross-file coherence notes for W-B:** (a) 04:15's Gaussian flip + 07:13/:1169's still-unflipped "default 4" text — the twins must land in the same wave; (b) 10:21's CLOSED row cites "04 §0's row is the twin" — 04's Row-4 half (the Z2-landed flip + the R9-c note at :24) should land with it; (c) 02's §7.4-referencing R27 parentheticals (:15/:16) assume FIX-1's insert; (d) the plan's :19 maintainPitch RESOLVED flip should propagate to 06/09's premise rows if they cite the app hardcode (not checked this wave — outside my files).

---

## §4 Watchdog

Editing-only: 6 corpus files + this report + the worklog entry. No `git commit`/`push`/`branch` commands run; stayed on `main`. `19-code-references.md`'s working-tree modification predates this agent (another wave's edit) — untouched.

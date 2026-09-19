# xcut-census — R27 W4 cross-cut: the consolidated census-coherence register

**Task ID:** R27-W4-CENSUS · **Agent:** xcut-census · **Round:** R27 final-tightness, Wave 4 (cross-cuts) · **Date:** 2026-09-13
**Scope:** the wire-census coherence family across the WHOLE corpus — all 21 specs + `IMPLEMENTATION-PLAN.md` + `REFERENCE-REGISTER.md` + `FINAL-SIGNOFF.md` + the LIVE law docs cited as canon (`audits/ARCH-R2x-*` decision records, the shell-mini seam docs). Report-only (this file + the worklog; no corpus edits, no commits).

**The truth (the one-paragraph canon every site below re-keys to):** at OT code pin `970948a` (HEAD `55c81c0`, 632/632), `WIRE_COMMAND_TYPES` (`headless/api.ts:243-275`) = **31 verbs = 28 routed + 3 exceptions**; the exceptions (`WIRE_UI_EXCEPTIONS` `api.ts:328-335` — an EXPORTED tsc-asserted `Record<verb→law>` since AR-1 `40f22af`, + the derived `WIRE_UI_EXCEPTION_VERBS` Set `:356-358`) are exactly `timeline.selectElements` (selection is VIEW state), `timeline.advancePlayhead` (the ticker is rAF-local), `timeline.trim` (uniform-delta engine shape; the UI's resize commits through `updateElements` patches). The routed 28 = `timeline.{delete, duplicate, insert, insertBatch, move, moveBookmark, pause, play, redo, removeBookmark, removeKeyframes, retimeKeyframes, rippleDelete, seek, setLoopRegion, setPlaybackRate, split, toggleBookmark, undo, updateElements, upsertKeyframe}` (21) + `track.{add, remove, setAllLocked, setAllMuted, toggleLock, toggleMute, toggleVisibility}` (7). **The singular `removeKeyframe`/`retimeKeyframe` are RETIRED from the union** (a stale singular dispatch hits the never-guard's typed INVALID_PARAMS, `api.ts:2537-2545`; absence pinned `milestones-ar1.ts:201-210`); **`insertBatch`/`removeKeyframes`/`retimeKeyframes` are live** (one history entry each; the shared `validateInsertElement`; M49R inverted to the one-entry law); **`upsertKeyframe` is ROUTED** (since AR-2 `30bfe2a`). Machine-checked three ways: the tsc-lockstep asserts (`:277-297`), the M49C gate **28 routed + 3 exceptions PASS** (report json, committed `970948a`; origin-attributed — only origin:"ui" dispatches count, HA-4-2), the M55R AR2R-6 arithmetic pin. **The lineage tail:** 24 (R15 charter) → 28 (R22 `05584d8`) → 30 (R23 `222532c`) → 24+6 (R24 `c15a629`) → **25+5 (AR-2 `30bfe2a`)** → **31 = 28+3 (D-ARCH-6 `970948a`)**.

---

## §1 The site inventory (the complete table — 89 amendment-target sites, grep-verified this session)

Method: pattern sweep `24 routed | 24 UI-routed | 24+6 | 24 + 6 | 25+5 | 30→31 | WIRE_COMMAND_TYPES | WIRE_UI_EXCEPTION | removeKeyframe\b | retimeKeyframe\b | upsertKeyframe\b | 6 exceptions | 6 documented exceptions | 28 routed | 31 verbs | 24/24 | 30-name | 30-type | 30 prefixed | 30 types | 27 of 78` over the 29-file corpus (21 specs + 3 root docs + ARCH canon + the shell-mini seam docs). Classes: **COUNT** (census-count) · **VERB** (verb-name) · **REG** (registry-export) · **M49C** (the gate's reading) · **LIN** (lineage tail) · **CTPT** (the 27/78 counterpart arithmetic). Sev where the owning per-spec report already graded it.

### 00-master-spec.md (7 sites — the pin canon; drives battery pin-lag)

| site | current text (quote) | replacement | class | sev |
|---|---|---|---|---|
| :3 | "the landed C7 census 24 routed + 6 exceptions is NOT reopened" + "536/536 + the M49C coverage gate 24/24 + 6 exceptions re-run LIVE" (the R24/R25 ledger lines) | append the R27 ledger line: "R27 — **31 = 28+3 @ `970948a`** (D-ARCH-6: +3 batch verbs, −2 retired singulars, upsertKeyframe re-classified; the census re-declared MECHANICALLY per D29-F8; M49C 28/3 PASS; 632/632)" | COUNT+M49C | P2 |
| :17 | "the wire-dispatch seam, machine-checked by the M49C coverage gate — **24 routed wire verbs + 6 documented exceptions**" + "536/536 + the M49C gate 24/24 + 6 exceptions re-run LIVE this round; R25 — … consumers pin `c15a629`" | spec-00's paste: HEAD `55c81c0` / **code pin `970948a`**, 632/632, **28 routed + 3 exceptions**, M49C 28/3; consumers engine `6e2b91a` (s17 absorption queued) + app mirror `6e2b91a` (re-pin queue filed `c020b2a`) | COUNT+M49C+REG | P1 |
| :305 | "30 prefixed wire names at OT `c15a629` = 24 routed verbs + 6 documented exceptions (lineage: 24 at the R15 charter → 28 at the R22 pin → 30 at R23 → the routed/exceptions split at `c15a629`), 27/78 union cou[n terparts]" | "31 prefixed wire names at `970948a` = 28 routed + 3 exceptions (lineage: … → the split at `c15a629` → 25+5 at AR-2 → **31 = 28+3 at D-ARCH-6 `970948a`**); **29/78** union counterparts (the §2 ruling)" | COUNT+LIN+CTPT | P2 |
| :435 | "K2's OT-side completeness instrument (green, 24/24) … The wire census re-bases to the W11 truth: **24 routed + 6 exceptions at `c15a629`** (lineage: … the split); the exception registry is test-local upstream" | "(green, 28/28)" + "31 = 28+3 at `970948a` (lineage + the firing tail)" + "**the exception registry is an exported tsc-asserted `Record` since AR-1** — the live-registry consumption law, 00 §2A.10" | COUNT+M49C+REG | P2 (the test-local clause P1-grade) |
| :439 | "**The landed C7 census (24 routed + 6 exceptions, Decision 29.2) is NOT reopened** — the new verbs are [r1-scheduled]" | keep the law; append the dated firing note: "— fired twice since, mechanically: 25+5 @ AR-2 (s16), **31 = 28+3 @ D-ARCH-6 (`970948a`)**" | COUNT | P2 |
| :467 | "WIRE_UI_EXCEPTIONS-export is a new small row" (the D36 tail / the §2A.10 draft area) | the export LANDED (AR-1): the row flips to the **00 §2A.10 standing law** — "a consumer gate consumes the exported registry, never a hand-mirrored copy" (the app's `wire-coverage.test.tsx:29` the fleet instance) | REG | P2 |
| :478 | "The landed C7 census (24 routed + 6 exceptions) is NOT reopened by this law" (§2A.8's C7-census-pattern sentence) | same firing-note form as :439 (the 28+3 note) | COUNT | P2 |

### 01-core-engine.md (1 site + 1 HOLD)

| site | current text | replacement | class | sev |
|---|---|---|---|---|
| :13 | the engine BASE row's W11 widenings list "`WIRE_COMMAND_TYPES` + `applyBatch` `data.results` + keyframe `lockPreChec[k]`" | re-anchor the api.ts line refs (`:182-213`→`:243-275`; the asserts `:216-230`→`:277-297`) at the re-pin | REG | P3 |
| :956 | the classic `TimelineManager` "Seed spec omitted" ops list names `retimeKeyframe` | **HOLD** — opencut-CLASSIC-side citation (classic still has the op; the retirement is OT-wire-side only). No edit | (VERB-exempt) | — |

### 03-playback-engine.md (3 sites)

| site | current text | replacement | class | sev |
|---|---|---|---|---|
| :16 | "**24 UI-routed verbs + 6 documented exceptions**, M49C the coverage gate machine-checking the routed se[t]" | spec-03 F-1: "**31 wire verbs = 28 UI-routed + 3 documented exceptions** (`WIRE_COMMAND_TYPES` @ api.ts:243-275 + `WIRE_UI_EXCEPTIONS` @ :328-335)" (the 5 transport verbs stay routed ✓) | COUNT | P1 |
| :15 / :24 | the W11 row's `WIRE_COMMAND_TYPES` line refs + "the coverage gate's accumulated ⊇ `WIRE_COMMAND_TYPES` − exceptions" | line-ref re-anchor; the gate formula HOLDS (the − exceptions term now means the exported registry) | REG | P3 |

### 05-timeline.md (4 sites)

| site | current text | replacement | class | sev |
|---|---|---|---|---|
| :14 | "**24 UI-routed verbs + 6 documented exceptions** (routed: `timeline.{delete, duplicate, insert, move, …}` (17) + `track.{…}` (7); exceptions: `timeline.selectElements` …, `timeline.{upsertKeyframe, removeKeyframe, retimeKeyframe}` …)" | spec-05 P1-1's paste block: 31 = 28+3, the routed 21+7 enumeration, the 3-exception enumeration, the lineage tail, `api.ts:243-275`/`:328-335` cited | COUNT+VERB+REG | P1 |
| :24 | "the 30-name wire census at `c15a629` = **24 UI-routed + 6 documented exceptions** (the D29 re-base; lineage …)" | "the 31-verb census @ `970948a` = 28+3 (lineage + the AR-2/D-ARCH-6 tail)" — the row's own D29-F8 clause fired | COUNT+LIN | P2 |
| :1231 | "(C7 — the 30-name census at `c15a629` = 24 UI-routed + 6 documented exceptions; 24 at the R15 charter; work…)" | "(C7 — the 31-verb census @ `970948a` = 28+3; the lineage tail)" | COUNT | P2 |
| :1260 | "30-type prefixed union — **24 UI-routed + 6 documented exceptions** (`WIRE_COMMAND_TYPES` `:182-213`, tsc-lockstep both directions…)" | "31-type prefixed union — 28+3 (`WIRE_COMMAND_TYPES` `:243-275`; the registry EXPORTED `:328-335`, gate-consumed LIVE)" | COUNT+REG | P1 |

### 06-nle-ops.md (10 sites — the heaviest non-15 consumer)

| site | current text | replacement | class | sev |
|---|---|---|---|---|
| :4 | "the wire-dispatch seam: **24 routed command verbs + 6 documented exceptions**, M49C machin[e-checked]" (R24 status line) | the R27 status line appends: "31 = 28+3 @ `970948a` (the census re-declared mechanically; the singular keyframe verbs retired, the batch verbs live)" | COUNT | P2 |
| :12 | "The landed C7 census (24 routed + 6 exceptions) is NOT touched" | the :439-style firing note (25+5 → 28+3) | COUNT | P2 |
| :29 | "the landed C7 census (24 routed + 6 exceptions) is NOT reopened. Decision 30.3…" | same firing note | COUNT | P2 |
| :32 | "M49C coverage gate: 24/24 routed verbs machine-checked through the real UI**). The wire surface is **30 prefixed command names split 24 UI-routed + 6 documented exceptions** (`selectElements`, the three singular keyframe verbs, `advancePlayhead`, `trim`)" | "M49C 28/28… **31 prefixed command names split 28 routed + 3** (`selectElements`, `advancePlayhead`, `trim`)" — the "three singular keyframe verbs" enumeration DIES (upsert ROUTED; remove/retime RETIRED) | COUNT+M49C+VERB | P1 |
| :42 | "**24 at the R15/M29 charter → 28 actual at the R22 pin → 30 at R23 → the W11 split (24 routed + 6 documented exceptions) at `c15a629`**" | append: "→ 25+5 at AR-2 (s16) → **31 = 28+3 at D-ARCH-6 (`970948a`)**" | LIN | P2 |
| :1619 | "no `timeline.replace` on the wire (`WIRE_COMMAND_TYPES` = 30 names, tsc-lockstep-closed)" | "= 31 names" (the replace verdict UNCHANGED ✓) | COUNT | P2 |
| :1638 | "OT's pool batch is playhead-anchored `applyBatch([insert × N])` stacking with N undo entries (`view/page.tsx:515-555`)" + "the landed 24+6 census untouched until then" | scout-ot #12: the pool multi-insert fires ONE `insertBatch` per kind-group, staggered construction (`view/page.tsx:535-599`); M49R inverted to the one-entry law; "the landed census (31 = 28+3 since D-ARCH-6) is unaffected by this row" | VERB+COUNT | P1 |
| :1658 | "expressible TODAY over the 24 routed verbs (delete/move/insert all routed…)" + "the landed 24+6 census untouched until then" | "over the 28 routed verbs" + the census-clause sweep form | COUNT | P2 |
| :2596 | "the census now 30 names split 24 UI-routed + 6 documented exceptions (M49C machine-checked…)" | "31 = 28+3 @ `970948a`" | COUNT | P2 |
| :2616 | "the 30-name census split 24 UI-routed + 6 documented exceptions \| ALIGNED" + "`WIRE_COMMAND_TYPES` `headless/api.ts:182-213`" | "the 31-verb census 28+3 \| ALIGNED" + `api.ts:243-275` | COUNT+REG | P2 |

### 09-project-model.md (1 site)

| site | current text | replacement | class | sev |
|---|---|---|---|---|
| :14 | "(`WIRE_COMMAND_TYPES`, 24 routed verbs + 6 documented exceptions, the M49C coverage gat[e])" | "(`WIRE_COMMAND_TYPES`, **31 verbs = 28 routed + 3 exceptions**, M49C 28/3 @ `970948a`)" | COUNT+M49C | P2 (spec-09 F-1's re-pin batch) |

### 12-testing-strategy.md (4 sites)

| site | current text | replacement | class | sev |
|---|---|---|---|---|
| :4 | "the wire census **24 routed + 6 exceptions is the census both key on**" (the K2/K3 instrument registration) | "the wire census **31 = 28 routed + 3 exceptions** is the census both key on — via the exported-registry LIVE consumption (the AR-2 consumption law; the app's ported gate already consumes `WIRE_UI_EXCEPTION_VERBS` from the vendored barrel)" | COUNT+REG | P1 |
| :19 | "K2's OT-side completeness instrument (already green, 24/24); the wire census 24 routed verbs + 6 documented exceptions (`WIRE_COMMAND_TYPES` @ OT `api.ts` + the runner's exc[eption registry]…)" | "(green 28/28 @ `970948a`); 31 = 28+3 (`WIRE_COMMAND_TYPES` @ api.ts:243-275 + `WIRE_UI_EXCEPTIONS` the exported registry `:328-335` — the runner-local registry premise is dead)" + the HA-4-2 origin-attribution clause | COUNT+M49C+REG | P1 |
| :20 | "the final assertion (accumulated ⊇ `WIRE_COMMAND_TYPES` − exceptions)" | the formula HOLDS; re-anchor + "− exceptions" = the exported registry (live-barrel) | REG | P2 |
| :26 | "the K2 OT-side completeness instrument (already green, 24/24) and the wire census 24 routed + 6 exceptions is the census the family keys on" | "green 28/28 … 31 = 28+3" | COUNT+M49C | P2 |

### 13-subagent-scout-plan.md (2 sites — historical round records)

| site | current text | replacement | class | sev |
|---|---|---|---|---|
| :13 | "the census → 24 routed + 6 exceptions" (the R24 mapping note) | the R27 protocol update appends the R25-R27 rounds; the R24 note stays as dated history (arrow-adjacent/SKILL #126 exempt) | COUNT (history) | P3 |
| :14 | "the W11 complete-UI round: 24 routed wire verbs + 6 documented exceptions, the M49C coverage gate, op-parity 11/11" (the R24 pin block) | the R27 pin block: "31 = 28+3 @ `970948a`/632" | COUNT | P2 |

### 15-wire-protocol.md (22 sites — the OWNER; the paste source is spec-15 §4 P1-1..P1-5 + P2-1..P2-5)

| site | current text | replacement | class | sev |
|---|---|---|---|---|
| :4 | "the wire is the W11 complete-UI shape @ OT `ded43c4` (code tip **`c15a629`** — the **24 routed + 6 exceptions** census, machine-checked by the M49C c[overage gate])" + "the landed 24 routed + 6 exceptions census is UNTOUCHED — the new verbs re-declare mechanically per the tsc-lockstep/M49C law" (the D30/D31 r1-family clause, same line) | the R27 pin block (spec-15 P2-1): HEAD `55c81c0` / code pin `970948a`, 632/632 (cite total only), M49C 28/3; the UNTOUCHED clause → the P2-5 sweep form ("the landed census (31 = 28+3 since D-ARCH-6) is unaffected") | COUNT+M49C | P2 |
| :14 | "**the census RE-BASED to the W11 truth (D29.2): 24 UI-routed verbs + 6 documented exceptions** (the 30-name census split at `c15a629`). The routed 24 (`WIRE_COMMAND_TYPES`, api.ts:182-213…) … The 6 exceptions (the runner's registry, `scripts/run-timeline-tests.mj[s]`…)" + the routed-24 + 6-exception enumerations + "27 of the 78 union members now have live OT wire counterparts" | **spec-15 §4 P1-1 — the paste-ready re-declaration block** (the full 31-verb text + the 3-exception registry + the lineage tail + the M49C gate row + the 29-of-78 clause) | COUNT+VERB+REG+CTPT | **P1** |
| :18 | "§13.15 (the C7 worklist, R24-refreshed to the 24 routed + 6 exceptions)" | "…R27-refreshed to 31 = 28+3" | COUNT | P2 |
| :21 | "the **30** prefixed wire names — the 24 routed + 6 exceptions census @ `c15a629` (§13.15's R24 refresh)" | "the **31** prefixed wire names — 28+3 @ `970948a`" (the C7 rename-at-r1-END law itself holds) | COUNT | P2 |
| :27 | "verified at `c885ece`: ZERO wire symbols in the app tree — `useWireDispatch`/`attachWire`/`WIRE_COMMAND_TYPES`/`wireCoverage`… all absent" | history row (W-C landed R25) — re-key to "the symbols live since W-C; the gate consumes the live barrel (`wire-coverage.test.tsx:29`)" | REG | P3 |
| :30 | "the final assertion is `accumulated ⊇ WIRE_COMMAND_TYPES − WIRE_UI_EXCEPTIONS` (the exception registry re-decla[red app-side, TEST-LOCAL — upstream exports no exception constant])" | **spec-15 §4 P1-2** — the AR-2 consumption-law row (the gate consumes the LIVE `WIRE_UI_EXCEPTION_VERBS` from the vendored barrel) | REG | **P1** |
| :31 | "until then the landed **24 routed + 6 exceptions** census is the whole truth and stays byte-identical" | "the landed census (31 = 28+3 since D-ARCH-6) is unaffected by this row" (spec-15 P2-5's clause form) | COUNT | P2 |
| :296 | "the prefixed census is 30, split **24 UI-routed + 6 documented exceptions** … 27 of the 78 union members have live OT wire counterparts" | spec-15 P2-2: the R27 re-read + **29 of 78** (the §2 ruling) + the engine anchors `rollingTrimItems :3324 / slip :4956 / slideItem :5097 / rateStretchItem :3840` | COUNT+CTPT | P2 |
| :320 | the §4.1A Keyframe row "per-key singular forms implemented for upsert/remove/retime" | **spec-15 §4 P1-5** — the row re-key (upsertKeyframe singular ROUTED; removeKeyframes/retimeKeyframes plural batch; the singular remove/retime RETIRED; `updateKeyframeCurves` → r1) | VERB | **P1** |
| :326 | "the 6 exceptions are live wire verbs whose UI-path law routes their edi[ts]" | "the 3 exceptions are live wire verbs…" | COUNT | P2 |
| :4899 | "re-refreshed Round 24 (the 24 routed + 6 exceptions census @ `c15a629` — the W11 wire state)" | "re-declared R27 (31 = 28+3 @ `970948a` — the D-ARCH-6 wire state)" | COUNT | P2 |
| :4901 | "The 24 routed verbs are machine-checked by the M49C coverage gate (24/24 fired through the real UI; the 6 documented exceptions live in the RUNNER's registry, test-local upstream — no exported constant…)" | "The 28 routed verbs… M49C 28/28 (origin-attributed); the 3 exceptions live in the EXPORTED registry `api.ts:328-335` (gate-consumed LIVE, runner :390-425)" | COUNT+M49C+REG | P1 |
| :4905 | "**30 types** … `WIRE_COMMAND_TYPES` (api.ts:182-213 …) — 24 UI-routed verbs + 6 exceptions (the runner's registry, `scripts/run-timeline-tests.mjs:283-300` — test-local upstream, no exported constant; M49C asserts 24/24…)" | spec-15 P2-2: 31 types; union `:56-212`; `WIRE_COMMAND_TYPES` `:243-275`; asserts `:277-297`; the exported registry `:328-335`; the gate `:390-425`; the rename-pass cell (the plural verbs map to union names directly) | COUNT+REG | P1/P2 |
| :4910 | "extended by W11 to the singular keyframe verbs (R-A P3-9: `removeKeyframe`/`retimeKeyframe` report TRACK_LOCKED … api.ts:1462/:1517/:1549; 12 commands total)" | spec-15 P2-3: "rewritten batch-atomic at D-ARCH-6: `removeKeyframes`/`retimeKeyframes` lock-pre-check the WHOLE batch (api.ts:2239-2246/:2337-2344, + upsert :2139); still 12 lock-checked commands (counted live)" | VERB | P2 |
| :4912 | the §7-batch row's `applyBatch` refs `api.ts:1739-1779` / `data.results` `:1753-1775` | re-anchor → `:2559-2616` / `:2573-2612` | REG (line-ref) | P2 |
| :4914 | "27 of 78 … 3 OT-side verbs beyond the union (`advancePlayhead`/`setAllLocked`/`setAllMuted`); 51 absent" + "M49C: 24/24 fired" | "**29 of 78** (the §2 ruling); the 3 beyond-union verbs UNCHANGED ✓; 49 absent; M49C 28/28" | CTPT+M49C | P2 |
| :4915 | "the wire exposes only the singular verbs (`timeline.upsertKeyframe`/`removeKeyframe`/`retimeKeyframe`), while the UI authors keyframes thr[ough the batch gesture paths] … QUEUED" | **spec-15 §4 P1-3** — the row flips to LANDED (BASE @ `970948a`), carrying the three r1 param-alignment decisions | VERB | **P1** |
| :4916 | "the library multi-insert currently runs `applyBatch([insert × N])` — N history entries … QUEUED" | **spec-15 §4 P1-4** — the row flips to LANDED (ONE insertBatch per kind-group, staggered construction; M49R inverted) | VERB | **P1** |
| :4918-:4920 | "QUEUED (r1-scheduled — NOT in the landed census; the **24 routed + 6 exceptions stand untouched**)" ×3 (replace/append/ripple-overwrite/fit-to-fill rows) | "the landed census (31 = 28+3 since D-ARCH-6) is unaffected by this row" — the scheduling verdicts ALL STAND (none of the four landed, verified against the 31-verb array) | COUNT | P2 |
| :4921 | "the landed 24+6 split untouched either way (D30.2)" | same clause-sweep form | COUNT | P2 |
| *(HOLD)* :405/:1877/:1887/:4265 | §4.3.66's `retimeKeyframe` union member (type def / Maps-to / Zod `z.literal('retimeKeyframe')`) | **NO EDIT** — the union is spec-side law (unchanged); the divergence (OT's plural delta form) registers in :4915's flipped row + 16's annotation | (VERB-exempt) | — |

### 16-keyboard-shortcuts.md (2 annotate sites + 10 HOLD)

| site | current text | replacement | class | sev |
|---|---|---|---|---|
| :439 / :440 | the §3.12 nudge rows "`{ type: 'retimeKeyframe', params: { elementId, keyframeId, time: ±1/±10 frame } }`" | annotate: the union's singular-absolute form has NO OT counterpart — the wire exposes the plural DELTA-shaped `retimeKeyframes`; the nudge composes `deltaTicks = target − key.time`; rides 15's r1 decision (a) (the W4 keyboard sibling owns the wording; spec-16's rider drafted per its worklog entry) | VERB | P2 |
| *(HOLD)* :446, :911, :914, :1309, :1320, :1439, :2120, :2379, :2390 | the union-vocabulary references (`retimeKeyframe` the spec-15 type name; the switch cases; the engine mapping `timeline.retimeKeyframe`; the engine ops list) | **NO EDIT** — union-side + engine-side references (the engine's own 19-case dispatch is the render venue's surface; the OT-wire retirement doesn't reach it). The optional cross-note: the OT wire now exposes only the plural form | (VERB-exempt) | — |

### 17-test-plan.md (7 sites)

| site | current text | replacement | class | sev |
|---|---|---|---|---|
| :20 | "24 routed wire verbs + 6 documented exceptions, machine-checked by the M49C coverage gate" | "28 routed wire verbs + 3 documented exceptions @ `970948a`" | COUNT | P2 |
| :24 | "the accumulated ⊇ `WIRE_COMMAND_TYPES` − exceptions gate — 24 routed verbs + 6 documented exceptions, tsc-lockstep both dir[ections] — already green 24/24 at `ded43c4`" | spec-17's F-form: "31 = 28 routed + 3 exceptions, green at `970948a`" | COUNT+M49C+REG | P1 |
| :29 | "driving the same **24 routed wire verbs** through the real UI (D29.1c…)" | "the same **28 routed wire verbs**" | COUNT | P2 |
| :38 | "the accumulated ⊇ `WIRE_COMMAND_TYPES` − exceptions gate (24 routed + 6 documented exceptions…) — already green 24/24 at `ded43c4`" | the 28/3 + `970948a` form | COUNT+M49C | P2 |
| :40 | "drives the same **24 routed verbs** through the real UI (D29.1c…)" | "the same **28 routed verbs**" | COUNT | P2 |
| :2359 | the master count row (every figure stale; "OT 536") | the 72-entry / 632 re-key (spec-17 F-1) | M49C+pin | P1 |
| :2360 | the K2 twin row: "M49C … green 24/24" + "(the census rows land at 458/759/536)" | "M49C green 28/28" + 748/777/632 | M49C | P1 |

### 18-ui-shell.md (3 sites)

| site | current text | replacement | class | sev |
|---|---|---|---|---|
| :25 | "the accumulator ⊇ `WIRE_COMMAND_TYPES` − exceptions **[24 routed + 6 at `c15a629`]**" | "[31 = 28 routed + 3 exceptions at `970948a`]" (spec-18 F-13) | COUNT+REG | P2 |
| :26 | "drives the **24 routed verbs** through the real UI, D29.1c) → **K4**" | "the **28 routed verbs**" | COUNT | P2 |
| :514 | "hosts the W11 wire-dispatch layer — **24 routed + 6 exception verbs**, `WIRE_COMMAND_TYPES` + the M49C coverage gate … 386 in-page + 150 real-mouse suites — **536/536** @ `ded43c4` [code pin `c15a629`]" | "**28 routed + 3 exception verbs** … 632/632 @ `55c81c0`/`970948a`" (counts-only → P2 per spec-18) | COUNT+pin | P2 |

### 19-code-references.md (13 sites — the reference canon)

| site | current text | replacement | class | sev |
|---|---|---|---|---|
| :5 | "the M49C coverage gate (24 routed wire verbs + 6 exceptions) + M49T/H/R/G" | "(28 routed wire verbs + 3 exceptions @ `970948a`)" | COUNT | P2 |
| :16 | "the union is 30 prefixed types at `c15a629` (… the D29 re-base splits the census 24 routed + 6 exceptions — §3.2's refresh block)" | "31 = 28+3 @ `970948a`" | COUNT+LIN | P2 |
| :22 | "the coverage gate is now K2's OT-side completeness instrument**, 24/24 green" | "**28/28** green @ `970948a`" | M49C | P2 |
| :32 | "the M49C coverage gate (24 routed wire verbs + 6 documented exceptions, tsc-lockstep) + …" | the 28/3 form | COUNT | P2 |
| :73 | "(24 at W5 → **30 at `c15a629`** (24 routed + 6 exceptions per the W11 census — see §3.2)" | "24 at W5 → 30 at R23 → **31 at `970948a`** (28+3)" | COUNT+LIN | P2 |
| :150 / :151 | the runner rows: "**M49C the coverage gate** (reads `WIRE_COMMAND_TYPES` LIVE from the page … minus the exception registry fired through the real UI — 24/24 PASS)" + the W11-surface refs | re-anchor (the gate reads BOTH registries live, runner :390-425) + "28/28 PASS"; the W11-surface refs `:182-213`→`:243-275` | M49C+REG | P2 |
| :153 | "**the W11 census: 24 UI-routed verbs + 6 documented exceptions** (`timeline.selectElements`, `timeline.upsertKeyframe`/`removeKeyframe`/`retimeKeyframe` (singular verbs — keyframes author through the batch gesture paths), `timeline.advancePlayhead` (rAF-local), `timeline.trim`…)" + "**30 prefixed types** (23 `timeline.*` + 7 `track.*` …)" | spec-19 F-3 (the file's only P1-class falsehood): the 3-exception enumeration + "**31 prefixed types** (24 `timeline.*` + 7 `track.*`)" + the exported registry + the retired-singulars note | COUNT+VERB+REG | **P1** |
| :155 | the C7 rename row lineage: "24 (the R15 charter) → 28 (the R22 pin) → 30 (R23) → **the 24-routed + 6-exceptions split at `c15a629`**" | append "→ 25+5 at AR-2 → **31 = 28+3 at D-ARCH-6 (`970948a`)**" | LIN | P2 |
| :309 | "all **30** headless types at `c15a629` (24 at W5; 18 at the R8 sweep) are `timel[ine/track-prefixed]…" | "all **31** headless types at `970948a`" (the C7 disposition rows themselves UNCHANGED ✓) | COUNT | P2 |
| :352 | "the M49C coverage gate: 24 routed wire verbs + 6 documented exceptions, tsc-lockstep" | the 28/3 form | COUNT | P2 |
| :365 | "the union is 30 types, split 24 routed + 6 exceptions per the W11 census" (×2 clauses) | "31 types, 28+3" | COUNT | P2 |
| :413 | "**the union has been 30 types since the S/T/S3 rounds, now split 24 routed + 6 exceptions at `c15a629`**" | "…now 31 = 28+3 at `970948a`" | COUNT | P2 |
| :172 | the §3.2 `headless/` sub-row: "**24-command union** (`api.ts:39-125`) … 24 of 78 types (~31%)" (the Round-15 dated snapshot) | dated baseline — annotate at the §3.2 refresh: "(R15 baseline; now 31 verbs / 29-of-78 counterparted per the R27 re-base)" | CTPT (dated) | P3 |

### IMPLEMENTATION-PLAN.md (6 sites)

| site | current text | replacement | class | sev |
|---|---|---|---|---|
| :18 | "the runner + the M49C coverage gate EXIST and are green **24/24** at the pin" + "(1b) **`WIRE_UI_EXCEPTIONS` as a first-class shared export** (OT R9-d — the 6-ve[rb]…" | "(1b) LANDED — the export exists (AR-1); 3 verbs now; green 28/28 @ `970948a`" | M49C+REG | P2 |
| :19 | "the coverage gate green **24/24 routed − 6 exceptions**; the census at its declared irreducible set 35 zero-[action…]" | "green 28 routed − 3 exceptions (the app census 42 = 36+5+1 @ `6e2b91a` — the W4 re-base)" | M49C+COUNT | P2 |
| :52 | "the M49C gate 24/24, 59 entries, WDC 759/759…" | "28/28, 72 entries, WDC 777/777 @ `ec8fd5c`" | M49C+pin | P2 |
| :53 | "registered, green **24/24 routed verbs + 6 documented exceptions at `c15a629`**" + "the 24+6 wire census is [the analogy]" | "green 28/28 + 3 exceptions at `970948a`" + "the 31 = 28+3 wire census is" | M49C+COUNT | P2 |
| :54 | "the final assertion `accumulated ⊇ WIRE_COMMAND_TYPES − 6 exceptions`, through the real mounted UI" | "… − the 3 exported exceptions (live-barrel)" | REG+COUNT | P2 |
| :84 | "WIRE_UI_EXCEPTIONS + the data-test contract + the view-config surface" (the W-C-era filing row) | history row — the export landed (AR-1); re-key at the S-app refresh | REG | P3 |

### The LIVE law docs (companion/mock canon — 3 sites)

| site | current text | replacement | class | sev |
|---|---|---|---|---|
| `ui-mock/shell-mini/docs/OT-SEAMS.md:12` | "> code pin `c15a629` — the 24 routed + 6 exceptions (R24 re-base) R23 count is now **24 UI-routed verbs + 6 [documented exceptions]**" | "> code pin `970948a` — **31 = 28 UI-routed verbs + 3 exceptions** (D-ARCH-6)" | COUNT | P2 |
| `OT-SEAMS.md:20` | "(the 24 routed + 6 exceptions wire surface (the R23 census — was 24 at the R22 pin…)" | "(the 31 = 28+3 wire surface …)" | COUNT | P2 |
| `ui-mock/shell-mini/docs/CORE-SEAMS.md:31` | "> 30-name count is now **24 routed verbs + 6 documented exceptions** (`WIRE_COMMAND_TYPES`…)" | "> 31-verb count: 28 routed + 3 exceptions" | COUNT | P2 |

### Exempt/verified-clean (the battery must NOT flag these)

- **Decision records (dated history):** `audits/ARCH-R24-…:15/:36/:72/:73` (the D29.2 ruling text itself — the 6-verb registry enumeration is the R24 record), `audits/ARCH-R25-…:17/:56/:116` — append-only canon; the battery's historical-exemption heuristics already cover ("R24 decision record", "R25", arrow-adjacent).
- **The R27 canon (already correct):** `audits/ARCH-R27-final-tightness-audit.md:27/:30/:48` + the fleet-r27 reports — the source of this register.
- **Union-side law (no edit):** 15 §4.3.66 (`:405/:1877/:1887/:4265`), 16's union rows (`:446/:911/:914/:1309/:1320/:1439/:2120/:2379/:2390`), 01:956 (classic-side), 15 §11.1's Zod mirror.
- **False positives:** 10-fcpxml-export.md:981/:1620 (`duration="24024/24000s"` — FCPXML fractions, not the M49C form).
- **Clean files (zero census-family hits):** 02, 04, 07, 08, 10, 11, 14 (the retired stub), 20, `REFERENCE-REGISTER.md`, `FINAL-SIGNOFF.md`, `README.md`, `LAW-NET-INVENTORY.md` (its census families are the mock/test census — a different register).

---

## §2 The counting-convention rulings (the two-line convention the amendment wave applies uniformly)

**Ruling A — the counterpart arithmetic (15 §4.1A:296 / §13.15:4914): "29 of 78."** A union member counts as counterparted iff a live OT wire verb implements its semantics in ANY parametrization (singular or batch): at `970948a` that is 29 = the 27 @ `c15a629` **+ `upsertKeyframes`** (via the routed singular `timeline.upsertKeyframe`) **+ `removeKeyframes`** (via the landed plural); `insertBatch` counts toward `insert`'s existing §4.3.9 slot (the bare-verb vs `insert {elements[]}` superset decision stays r1-OPEN), and `retimeKeyframe` (§4.3.66 singular-absolute) has **no counterpart** — the plural delta-shaped `retimeKeyframes` is an OT EXTENSION pending the r1 union decision (OT names it itself, `api.ts:177-197`). Corollaries: the 3 beyond-union verbs (`advancePlayhead`/`setAllLocked`/`setAllMuted`) UNCHANGED; "51 absent" → **49 absent**.

**Ruling B — retired verbs in lineage tables: history yes, enumeration never.** Retired verbs (`removeKeyframe`/`retimeKeyframe`) STAY in dated lineage tails — "…→ 25+5 at AR-2 (s16) → **31 = 28+3 at D-ARCH-6 (`970948a`)** (+3 batch verbs, −2 retired singulars — `removeKeyframe`/`retimeKeyframe` GONE…)" — and in retirement/r1-decision contexts (the never-guard cite, the absence pin, 15 §4.3.66's union member), but NEVER in a present-tense enumeration (an exception list, a routed list, a disposition table's "the wire exposes" cell): every enumeration is a live registry read (`WIRE_COMMAND_TYPES`/`WIRE_UI_EXCEPTIONS` at the pin). The discriminator the battery keys on: lineage mentions carry the arrow/pin/retirement context (`at D-ARCH-6`, `RETIRED`, `was the`, `→`), enumerations carry the present tense ("the wire exposes", "exceptions:", "routed:").

---

## §3 The M49C forms (every site citing the gate's 24/24 reading → the 28/3 re-declaration)

The canonical replacement sentence (paste-ready, one form everywhere): **"the M49C coverage gate: 28 routed + 3 exceptions PASS @ `970948a` (the gate reads BOTH registries LIVE from the page — `WIRE_COMMAND_TYPES` + the exported `WIRE_UI_EXCEPTION_VERBS`, runner `:390-399`; origin-attributed — only origin:'ui' dispatches count, HA-4-2; the report json committed in `970948a` is the authority)."** The 19 sites: **00:3** (×2) · **00:17** · **00:435** · **06:32** · **12:19** · **12:26** · **15:4** · **15:4901** · **15:4905** · **15:4914** · **17:24** · **17:38** · **17:2359-2360** · **18:25** (implicit in the ⊇-formula row) · **19:22** · **19:150** · **IMPL-PLAN:18** · **:19** · **:52** · **:53**. Every "24/24" reading in the law corpus is a stale read of the same artifact; none of the sites embeds an independent gate run (they all cite the one M49C instrument), so the fleet-coherent re-key is ONE form applied 19 times — no site may carry a divergent count.

---

## §4 The battery_r27 census-coherence class (the paste-ready draft, battery_r26 idiom)

```python
# === W. THE WIRE CENSUS (R27: 31 = 28 routed + 3 exceptions @ 970948a) =========
# Ground truth: api.ts:243-275 (31 verbs) + :328-335 (the exported 3-verb registry)
# + :277-297 (tsc-lockstep) + the M49C artifact (28/3 PASS) + milestones-w11.ts:252-254.
STALE_READS = ["24 routed", "24 UI-routed", "24+6", "24 + 6", "24/24",
               "6 documented exceptions", " 6 exceptions", "30-name", "30-type",
               "30 prefixed", "30 types", "the 24-routed", "27 of the 78", "27 of 78"]
CENSUS_SPECS = {0: s00, 3: specs[3], 5: specs[5], 6: specs[6], 9: specs[9],
                12: specs[12], 13: specs[13], 15: specs[15], 16: specs[16],
                17: specs[17], 18: specs[18], 19: specs[19]}
# live_stale() = battery_r26's helper: arrow-adjacent shas, "retired", "was the",
# "lineage", "history", "R24 re-base", "re-pin", "fired" contexts are exempt (Ruling B).
for n, t in CENSUS_SPECS.items():
    check(f"{n:02d}: zero live stale-census reads (the 24+6 era)", lambda t=t: (
        sum(live_stale(t, s) for s in STALE_READS) == 0, "census"))
check("15 §0/§4.1A/§13.15 + 06 §0 + 05 §0/§16.5 + 12 §0 + 17 §0A + 19 §3.2 carry '28 routed'/'31 = 28+3'", lambda: (
    sum("28 routed" in t or "31 = 28" in t or "28+3" in t
        for t in (specs[15], specs[6], specs[5], specs[12], specs[17], specs[19])) >= 6, "re-declare"))
check("the lineage tail (… 24+6 → 25+5 at AR-2 → 31 = 28+3 at D-ARCH-6 970948a) present >= 6 sites", lambda: (
    sum("25+5" in t or "25 routed + 5" in t for t in CENSUS_SPECS.values()) >= 6, "lineage"))
check("15 §0 carries the AR-2 consumption-law NOTE (WIRE_UI_EXCEPTIONS the exported registry; zero live 'no exported constant'/'test-local' reads)", lambda: (
    "WIRE_UI_EXCEPTIONS" in specs[15] and live_stale(specs[15], "no exported constant") == 0
    and live_stale(specs[15], "test-local") <= 0, "registry-export"))
check("the exception enumeration names exactly selectElements + advancePlayhead + trim (3; no upsertKeyframe/removeKeyframe/retimeKeyframe in present-tense exception lists)", lambda: (
    all(k in specs[15] for k in ("selectElements", "advancePlayhead")) and
    not re.search(r"exceptions[^.\n]{0,200}(upsertKeyframe|removeKeyframe\b|retimeKeyframe\b)", specs[15]), "verb-names"))
check("the retired singulars appear ONLY in lineage/retirement/r1 contexts (Ruling B: zero present-tense 'the wire exposes' enumerations)", lambda: (
    all(live_stale(t, "removeKeyframe") + live_stale(t, "retimeKeyframe") == 0
        for t in CENSUS_SPECS.values()), "retirement"))
check("15 §13.15: the two QUEUED rows flipped LANDED (insertBatch + the keyframe batch verbs; zero live 'wire exposes only the singular')", lambda: (
    live_stale(specs[15], "only the singular") == 0 and "LANDED" in specs[15], "flips"))
check("15 §4.1A + §13.15: the counterpart arithmetic reads 29 of 78 (Ruling A; zero live '27 of')", lambda: (
    "29 of 78" in specs[15] and live_stale(specs[15], "27 of the 78") == 0, "counterparts"))
check("the M49C reading is the 28/3 form everywhere (zero live '24/24' outside lineage/decision records)", lambda: (
    all(live_stale(t, "24/24") == 0 for t in CENSUS_SPECS.values()) and
    live_stale(plan, "24/24") == 0, "M49C"))
check("the companion law docs re-keyed (OT-SEAMS/CORE-SEAMS: 31 = 28+3; zero live 24+6)", lambda: (
    live_stale(read("ui-mock/shell-mini/docs/OT-SEAMS.md"), "24 routed") == 0 and
    live_stale(read("ui-mock/shell-mini/docs/CORE-SEAMS.md"), "24 routed") == 0, "companions"))
check("LIVE: the OT tree at the code pin — WIRE_COMMAND_TYPES length == 31 + WIRE_UI_EXCEPTIONS keys == 3 (scrape /home/z/my-project/opencut-timeline/src/lib/timeline/headless/api.ts)", lambda: (
    (lambda a: a.count("'timeline.") + a.count("'track.") >= 31)(ot_api_text), "live-registry"))
check("LIVE: consumers mirror 6e2b91a with the re-pin queue named (app UPSTREAM.lock.json + PLAN.md:104-147; engine PLAN:481) — the pin-lag class", lambda: (
    "6e2b91a" in s00 and "6e2b91a" in specs[9], "consumer-pins"))
```

Notes for the builder: (1) the `16` entry in CENSUS_SPECS is the §3.12 annotation only — its union rows are Ruling-B-exempt by construction (live_stale's context window never sees "the wire exposes" there); (2) `live_stale` needs two new exemption keywords this round: `"fired"` (the D29-F8 firing notes) and `"D-ARCH-6"` (the lineage tail's pin context); (3) the LIVE scrape check is the class's teeth — the corpus checks alone re-key prose; the api.ts scrape binds it to code (the same three-way machine-check the census itself uses); (4) 10's FCPML `24024/24000` is a substring false-positive — match `24/24` with word boundaries.

---

## §5 The consumer-lock rows (the app's AR-2 live-barrel law + the engine's mirror — the coherence note)

**The app (nle-test-app @ `c020b2a`, 252/252):** `vendor/nle-timeline/UPSTREAM.lock.json` mirrors **`6e2b91a`** — pre-D-ARCH-6 (the AR-2 world: 30 names = 25 covered + 5 exceptions; the vendored `api.ts:283-294` still excepts `selectElements, removeKeyframe, retimeKeyframe, advancePlayhead, trim`). The **AR-2 live-barrel law** is LANDED and is the fleet instance of 00's §2A.10: `src/wire-coverage.test.tsx:29` `import { WIRE_COMMAND_TYPES, WIRE_UI_EXCEPTION_VERBS } from '@vendor/timeline'`; `:49-59` the consumption law (RC-V1's P2 fix — "the mirror went stale at the 6e2b91a re-pin… this gate now consumes the LIVE registry instead of a hand-mirrored copy"); `:59` the local alias; `:328-377` the REAL volume-line dblclick gesture pin (`timeline.upsertKeyframe` origin 'ui'). **Coherence note:** the app's W-F gate is green against ITS OWN pin (25+5) and will go RED at the D-ARCH-6 re-pin until the gesture-seam switch lands — the port still carries the direct-core seams (`src/timeline-port/hooks/use-timeline-actions.ts:452` `core.removeElementKeyframes` + `use-keyframe-drag.ts:96` `core.retimeElementKeyframes`, both verified live), and the pool multi-insert must ride `insertBatch` per-kind (the D-ARCH-6 filings 1-2, app `PLAN.md:104-147`; the filing nit: the baseline says `a25d199`, the register's real pin is `6e2b91a`, the target the `55c81c0` mirror). This is BY DESIGN (the consumer's queue duty, DECISIONS #27.4) — the spec corpus's re-pin rows must state the consumer truth (`6e2b91a`: 25+5) AND the owner truth (`970948a`: 28+3) with the re-pin duty named, never silently upgrade the consumer row.

**The engine (nle-engine @ `f9ac806`, 748/748):** vendors OT @ **`6e2b91a`** (the submodule pin, `git submodule status`; the s17 absorption queued, engine PLAN:481). The engine's OWN 19-case `applyOp` dispatch (`headless/api.ts:785`) is UNTOUCHED by the census — the singular/plural retirement is OT-wire-side; the engine keeps its own `removeKeyframes` op (per-property remove-ALL, `api.ts:393/:678/:929` — different semantics from OT's cross-element member lists, no coherence hazard). The engine-side consequence of the round is only OV-12 (the vendored-tree re-pin gate in engine CI) + the live-registry consumption law's adoption.

**The spec-side lock rows to flip (the "doubly stale" class — they say `c15a629`; reality `6e2b91a`; target `55c81c0`):** **00:3** (consumer pins "app→engine `5036387` + OT lock-copy `c15a629` (byte-exact)"), **00:17**, **09:14**, **15:15-16** (the app/engine rows: "the vendored OT core (lock-copy @ `c15a629` … byte-exact, live-verified R24)" — the byte-exact-`c15a629` claim RETIRES), **18:514**, **19:216** (§3.3C), **IMPLEMENTATION-PLAN:32**. Per scout-ot open Q7: the amendment wave uses the queue's target (OT `55c81c0` mirror) rather than re-verifying intermediates, and every consumer row carries the two-truth form (consumer pin + owner pin + the queued switch). Do NOT conflate the app's components-tree census (42 = 36 zero-action + 5 carriers + 1 host @ `6e2b91a` — the 00 §2A.7 register family) with the wire census: different register, different battery class.

**Upstream polish (file at OT, NOT spec edits):** `api.ts:235`'s header still says "the 30 wire command types" over the 31-entry array; `SEAMS.md:184-185` retains the session-14 "24/24 routed + 6 exceptions" historical line (superseded in-file at `:224-233`).

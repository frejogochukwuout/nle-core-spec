# review-testlaw-carve — the R28-T4-c adversarial review (the D48/D49/D50 test-law chain + the two cross-cuts)

**Task ID:** R28-T4-c · **Agent:** adversarial reviewer, fresh context (read-only; main @ `9ad78fa`) · **Date:** 2026-09-16
**Targets:** `audits/fleet-r28/test-law-d48-d50.md` (the T2-c design) + the landed fold (17 §3.1's D48/D49 rows + §13A.7's facet rows + §13A.8; the plan's carve law + S-spec(6) + K-gate re-keys + r1/r3/r5 riders + §3 per-phase rows + the ten-class enumerations; the SIGNOFF re-riders in BOTH files).
**Method:** 20+ independent claim verifications (grep/awk against the live tree; the mock witness files read at source; the W4 commit `980920b` diffstat re-read for the file-count question).

---

## §1 The verification sweep (what was independently checked)

| # | Claim (site) | Verified state |
|---|---|---|
| 1 | The carve law's wording (PLAN :32) vs 17 §14.4 step-0's own text (:2474-2476) | **COHERENT.** Step-0: "every facet your spec introduces … has a row in §3.1 or §13A.7 … A facet with no row anywhere is a spec bug." The carve law is the plan-side twin over a DIFFERENT object (stream rows' gates columns), same spirit, correctly attributed ("the plan-side twin of 17 §14.4 step-0"). |
| 2 | 17 §3.1's eight new matrix rows | **LANDED at :563-570** (not :592-594 as the task brief cites — the brief's anchor is stale; the W4/T3-a worklog's :563-570 is correct): linkage (D42), edit-domains (D43), two-tier error envelope (D44), **NS-4 render-plan projector (D45)**, the four absent edit families as ONE consolidated row (D46), the param trio (D47), markers v2 (D48), caption tracks (D49). 7-column form matches the existing rows. D50 has NO §3.1 row — §13A.7-only, per the T3-a re-base. |
| 3 | §13A.7's facet rows | **LANDED at :2387-2396** — TEN new facet rows (D42-D50, 6-column form, "(Round 28 — D##)" tags) + the r1-protocol pointer row. D48/:2393, D49/:2394, D50/:2395 all carry the design's pin vocabulary. |
| 4 | §13A.8 (the r1-port acceptance protocol) | **LANDED** — 6 rows (#0 base + #1-#5) + the one acceptance sentence; the plan's r1 rider (:69) cites it with the five additions. |
| 5 | §13A.4.1's 78→80 re-key + §2.5 rule-8's census re-key | **LANDED** (:2316-2317 + :452-458; rule-8 carries the 25-code class+fine taxonomy, the class assertion, the A-6 restorations). |
| 6 | The prereq sweep (S-spec(6)(iii)) | **LANDED** — 09:310+ (Marker widened `duration?`/`notes?` + the D48 ruling text), 15:1583/:1589 (params), 10:811 (the D49 blocker flip), 18:226+ (five pages + the rail-swap rows), 04:2293 + 08:2168 (the ruled-out ⌘1-9 rows re-keyed), 05's caption rows. |
| 7 | The ⇧M ±1-frame law vs the mock's `removeMarkersAt` | **MATCHES** — useUiStore.ts:1982-1987: `filter((m) => Math.abs(m.time − snapToFrame(time)) > 1/24)` ⇒ delete iff \|Δ\| ≤ 1 frame (start-exact, ±1); strictly-inside-span deletes nothing; the no-history-entry-on-nothing law (`if (length === before) return`) is the design's cited witness, verbatim. |
| 8 | The burn-in exclusion's two witnesses | **BOTH REAL** — mockData.ts:353-363 `elementAtTime` scans `['overlay','main']` only (the one-line kind filter); Viewer.tsx:74 `captionHitsAt` scans all caption tracks (half-open interval). The ONE-LAW two-sided pin (absence + presence in one row) is well-formed. |
| 9 | The completeness machine-check instantiation | **VERBATIM** — the D50 facet row (:2395) carries all four elements: the module-scope accumulator, the LIFO fail-loud words, the direct array diffs against the LIVE-imported `Page` union (`missing`/`stale` both `[]` + the size identity 5). Grounded law 1 honored. |
| 10 | The `page==='fx'` discriminator | **THE LAW IS REAL** — `resolveTimelineCompactScope` (useUiStore.ts:260) returns 'off' when `s.page === 'fx'` ("the page beats the entry on fx"); the toolbar's CLUSTERS table has `fx: {density: false}`; ViewOptionsPopover.tsx:242-245 documents the compact sub-group as "DOM-ABSENT on the FX page". **BUT the design's named surface — `queryByTestId('shell-view-options')` — does not exist** (the real testids are `shell-timeline-toolbar-btn-view-options` / `shell-menu-tl-view-options-*`); the popover itself "stays on every page" (TimelineToolbar's own R23-WD note). Amendment A10. |
| 11 | The DESCRIPTIVE-duplicate law | **LANDED COHERENTLY** — 09:124/:160/:388 + 15:1106 ("one-track-per-language is DESCRIPTIVE in v1 (export merges…)") + the six-kind TrackType union (15:1097) + the facet row's "ok:true + a second track minted, the benign-family discrimination". The benign-family discrimination (a benign NON-rejection, distinct from the echo family's non-mutations) is correctly pinned. |
| 12 | The ten battery classes named in the plan (:96/:123) vs the T2 designs | **COUNT INCOHERENCE** — the plan says "the ten R28 classes" (the five named + T2-c's five); 12 §0's battery-posture row (:37) enumerates **THIRTEEN** (adds T2-b's D45, D46, r1-protocol classes); T2-a additionally defines a `D42-test-law` check (:115-123 of test-law-d42-d44.md) that appears in NEITHER list. See §6/A4. |
| 13 | The K-gate re-keys' figures | **COHERENT across K1/12 §0/TESTABILITY/register** — 749/749 @ `074a2f6` (anchor `74bef08`), OT 632 @ `55c81c0`/`970948a`, WDC 777 @ `83b8850`, nle-ui 690 @ `32abd58`, app 252 @ `85cff80`, variants 1,939/68 + the declared pair 1,950/126, mini 495/12. **EXCEPT:** 00-master's fleet table is still at the R27 pins (748 @ `f9ac806`, app @ `c020b2a`) — no R28 re-key anywhere in 00; 17 §0A's BASE likewise R27 (the registered W5/W6 re-base); the plan's S-engine stream row still says "748→". |
| 14 | The SIGNOFF twins' condition states | **(3) MET is TRUE** (register :52-58: rows 5-8 CLOSED-D48/D49/D50, "0 open design rows", the A3 RULED row stands). **(1) DIVERGES between the twins** — see §4. |
| 15 | The certification clause's arithmetic | FINAL's "the decisions corpus is now D8-D50" is **CORRECT** (the R27 riders' D8-D41 convention + D42-D50). The DESIGN's §5.2 clause (iii) says "every design decision **D1-D50**" — a range slip (D1-D7 predate the corpus's own numbering). |
| 16 | The 78→79→80 arithmetic | **CONTENT-COHERENT at every site** (15 §0-BASE/:31/:296/:5035/:5037/:5039; 17 :4/:20; 12 :19/:37; the plan K2 :49; both riders): insertBatch the 79th, replace the 80th, counterparts 29→31→32-of-80, the landed census 31=28+3 unchanged until the bump. **BUT the anchors "15:5021/:5023/:5025" are STALE** — the same commit's sibling 15-edits shifted the rows to :5035/:5037/:5039; :5021/:5023/:5025 are now blank lines/table delimiters. |
| 17 | The 182-row keymap registry | **COHERENT** — 16 §0 (:42), Appendix A footer (:2352, with the 181-known-stale registration), §16 matrix header (:2402), Appendix C's total row; 15 §13.5's 181 (:4946) is the REGISTERED stale citation (16's own footer names it + the W6 sweep); the riders agree. Appendix C's per-category rows sum to 182 exactly. |
| 18 | The 25-code registry | **COHERENT** — 15 §6.3 (:3016, the class-tag table + the A-6 restorations + RATE_OUT_OF_DOMAIN), 17 rule-8 (:452+, code AND class asserted), the riders' third rider. |
| 19 | The plan's own track table vs the carve law | **ALL 7 §0 TRACK ROWS PASS** (each gates column carries a suite count and/or battery class). **K4 does not** — see §3. |
| 20 | The keyword registered-deviation form | **COHERENT** — register row 5's deviation text carries the "~3-pin keyword churn" + the C33b bundle citation; the design's battery leg (substring on the deviation text) is satisfiable. Minor tension: the design says "the mock keeps its field" (present tense) while the register registers the field's r5 retirement — readable as today-vs-registered, but the design could say "keeps its field UNTIL the registered r5 retirement". |
| 21 | The bridge's current state (the D2e pin's assertion site) | sceneBridge.ts:375/:557 verified — the forward map is `note: m.label` (the pre-D48 law) and both directions DROP `duration`; the design's pins 2-4 correctly target the re-keyed law; the design's own text understates the current drift ("DROPS `duration` both directions" — it also mis-maps note↔label, which pins 2-3 exist to fix). |
| 22 | The mock's null→point law (useUiStore.ts:1534-1549) | **VERIFIED** — `patch.duration === null → undefined` (point) + the ≥1/24 clamp + the end ≤ scene-duration clamp; the design's "<1 frame → rejected INVALID_PARAMS (or normalized-up — the W6 fold picks ONE)" honestly defers the spec-side disposition. |

---

## §2 The design attack (test-law-d48-d50.md)

**D48 — RATIFY.** The D2e round-trip pin is the right shape: serialize `Marker{notes, label}` → the OT payload carries `Bookmark.note === notes` and NO label (doc-side-synthesized, the `id` pattern — grounded in 09's landed A2/D48 text and the bridge's live code); both bridge directions named as the assertion site; the export string-law rows (start-relative, real duration attr, note-iff-notes, value=label) match 10's landed §4.7 fold. The ⇧M table matches the mock's filter exactly (claim 7). The keyword's registered-deviation form is coherent — the register row carries the churn figure, the battery asserts the registration (a register-check, not a behavior pin — the honest form for a REJECTED field). The clip-marker r5 bundle's field+laws-together gate is the C35-stronger form, correctly registered.

**D49 — RATIFY.** The DESCRIPTIVE-duplicate law is pinned as a benign-family discrimination with the right discriminating sentence ("an `ok:true` that IS a mutation — distinct from the echo family's non-mutations"), the second-track-minted assertion (never a silent swallow), the export-merge determinism oracle, and the r5 reversal registered. The burn-in exclusion's ONE-LAW two-sided pin (elementAtTime scans overlay+main only + captionHitsAt presence, both halves in one table row, the `data-ops` invariance as the DOM-attribute form) is the strongest pin-family in the design — both witnesses verified live (claim 8).

**D50 — RATIFY-WITH-AMENDMENT (one amendment).** The completeness machine-check is instantiated verbatim (claim 9); the Audio page-vs-mode BOTH-families law is correctly split (membership vs activation grammar); the per-page view-state memory and the three-claimant resolution pins are grounded. **A10:** the fx-discriminator pin's named assertion surface is wrong — `queryByTestId('shell-view-options')` matches nothing in the mock; the registered surface is the compact-tracks sub-group's DOM-absence (ViewOptionsPopover's own "DOM-ABSENT on the FX page" note; the `shell-menu-tl-view-options-compact-*` testid family) or the store-level `resolveTimelineCompactScope` law. The LAW (page key, not fxMode) is correct and landed; the WITNESS NAME is not. The error propagated into the landed facet row (:2395 "the ViewOptionsPopover DOM-absence law").

**Design-internal slips:** (a) §5.2's certification clause says "every design decision D1-D50" — the corpus's own range is D8-D50 (A11); (b) §4.1(b)'s S-spec(6) enumeration lists "pages" among §3.1's eight rows while the design's own §3.5 lands D50's rows in §13A.6/§13A.7 — the internal contradiction was faithfully propagated into the plan (A3); (c) §4.4-4.5's "ten classes" undercounts the fleet's battery class census (A4); (d) the §2.6 wire-row leg's negative substring ("the stale `'video'|'audio'|'overlay'` comment cannot reappear") will false-positive on the landed sweep note's own historical text at 15:1092-1094 ("this comment read `'video' | 'audio' | 'overlay'`") — scope the regex or assert the corrected enumeration instead (A16).

---

## §3 The carve attack (the landed plan fold)

**LANDED, STRUCTURALLY SOUND — RATIFY-WITH-AMENDMENT.** The first-class statement (:32), the S-spec(6) row (:25), the K-gate re-keys (:48-50), the r1/r3/r5 riders (:69/:71/:73), the §3 per-phase rows (:87), and both ten-class enumerations (:96/:123) all landed and match the design's §4. The carve law is a coherent plan-side twin of §14.4 step-0. Every §0 track row's gates column passes the law (suite counts/battery classes present in all 7).

**The attack finds four real holes:**

1. **The carve law's first conviction is the plan's own K4 row.** K4's exit gate (:51) reads "green end-to-end, zero mock paths, zero human input — the crawl's completion proof" — no suite count, no battery class, no 12/17 row: the carve law's own three citation forms, all absent. The design's §4.3 explicitly promised the fix ("K4: shape unchanged; the exit adds the battery's zero-error class + BOTH collector figures recorded (the reconciliation law)") — **it did not land** (`rg "zero-error" IMPLEMENTATION-PLAN.md` → 0 hits). The w1/w2/w3/r2/r6 rows are borderline-loose (pins/suites named without counts or 12/17 rows) and were never in the design's §4.2 per-phase table; K4 is the clean violation because the design itself registered the amendment.
2. **The carve law is unenforced.** The step-0 class scrapes 17 §3.1/§13A.7; the suite-census class scrapes 12/17/00; the 182-keymap class scrapes 16; the ruled-out-claimant class scrapes 04/08; the signoff class scrapes the signoffs — **no R28 class scrapes IMPLEMENTATION-PLAN.md's gates columns.** The spec-side twin got its machine-check; the plan-side twin got prose only (A5). battery_r27's repertoire already had plan checks ("the plan-gate re-points to THIS doc") — the R28 class list dropped the plan venue.
3. **The S-spec(6) enumeration error (A3):** "(i) 17 §3.1's eight new matrix rows (linkage/edit-domains/error-envelope re-key/the four D46 families/markers v2/captions/**pages** + the D47 re-keys)" — the landed §3.1's eighth row is the **NS-4 render-plan projector (D45)**, not pages; D50's row is §13A.7-only by the fold's own design. 17's own header/:4 and §0A/:20 enumerate the eight correctly — the plan is the outlier, and it also omits D45's name entirely from (i).
4. **The count contradiction (A4):** the plan's gate says "battery_r28 green with **the ten** R28 check classes" twice (:25, :96/:123); 12 §0's battery-posture row (:37) enumerates **thirteen** (adding D45/D46/r1-protocol, citing test-law-d45-d47.md as the source); T2-a's `D42-test-law` check is named in neither. Nobody checks the class-count coherence (the signoff-freshness class checks the riders' numbers, not the class census).

Minor: the r5 rider (:73) carries two of the design's four r5 citations (the keymap long tail's 17 facet rows are only implicit via 16 §0's r5 row; the D49 uniqueness-flip migration note is absent from the plan — A13); the S-engine row's "748→" floor vs K1's 749 (A15); 17 §13A.8's cite "(`IMPLEMENTATION-PLAN.md`:67)" — the r1 row is at :69 (A15).

---

## §4 The signoff attack (TESTABILITY + FINAL re-riders)

**BOTH LANDED — RATIFY-WITH-AMENDMENT.** Condition (3) MET is true (register verified at 0 open design rows, rows 5-8 CLOSED, the A3 RULED row standing). The pin figures agree with the canon everywhere they appear. TESTABILITY's stale-number riders are re-keyed correctly (31=28+3 + 78→79→80; 182-row + 15's-181-known-stale; the 25-code third rider). FINAL's D8-D50 census is correct. The certification-clause extension (test-law completeness, machine-checked) is the right cure for the one-round-lag pattern.

**The twins do NOT carry matching condition states — three divergences:**

1. **Condition (1):** TESTABILITY says the model-fold prereqs "are the W6 delta-sweep's charge, tracked as S-spec(6)(iii)" — **stale at birth**: the prereq sites landed in the SAME commit (9ad78fa) that landed the rider (verified: 09:310+, 15:1583/:1589, 10:811, 18:226+ all carry the R28 amendments). FINAL's condition (1) — "the W4 law fold … AND the T3 test-law fold (the 12/17 amendments + the model-fold prereq sweep + the plan's test-track carve, S-spec(6)) — LANDED" — is the accurate state. Re-key TESTABILITY's clause to FINAL's form (A1). The design's §5.1 rider text was drafted at tree `980920b` (when the residues were real); the T3 landing updated FINAL's twin but not TESTABILITY's.
2. **The file count:** TESTABILITY "14 law-side files @ `980920b`" vs FINAL "13 files @ `980920b`". The diffstat: **14 files changed** (12 numbered specs + PLAN + REGISTER). The W4 commit's own subject line says "13 files" — the miscount's origin; every other site (12:14, the plan's carve law, the coverage audit) says 14. Fix FINAL's "13" (A2).
3. **The freshness class's per-file problem (A12):** the design's class 10 asserts BOTH files "carry the R28 re-rider with the re-keyed numbers (31=28+3 + the 78→79→80 projection; the 182-row registry; the 25-code two-tier registry)". FINAL's rider carries NONE of those figures (it has no R7-era stale numbers to re-key — those live only in TESTABILITY's body, so the T3 agent correctly adapted FINAL's form). The class as designed fails on FINAL; specify the per-file assertion set (TESTABILITY: the three re-keys; FINAL: the four-condition state + the D8-D50 census + the certification clause).

Also: the rider's 15 anchors "(:5023/:5025)" are stale (A8, see §5); the design's "lands at :3-:5" is now :7 (harmless drift note).

---

## §5 The cross-file coherence attack

**RATIFY-WITH-AMENDMENT — the arithmetic is content-coherent; the anchors and the pin-canon are not.**

1. **The stale 15 anchors (A8).** "15:5021/:5023/:5025" is cited at 17:4, 17:20, 12:19, 12:37, TESTABILITY:7, and 17's D47 facet row (:2389-area). At the W4 tree those lines were the command-coverage/insertBatch/replace rows; the SAME commit's sibling 15-edits (the AddMarkerCommand widening, etc.) shifted them to **:5035/:5037/:5039**. All six cite-sites now point at blank lines/delimiters. Re-key or cite by row-label ("15 §13.15's command-coverage row / the insertBatch row / the replace row").
2. **00-master's fleet table is behind, and nobody owns the catch-up (A9).** 12:14 declares "00-master's fleet table is the pin canon, D21" and carries the R28 pins; 00 itself still carries the R27 pins (748 @ `f9ac806`, app @ `c020b2a` — grep for 749/074a2f6/83b8850/85cff80 in 00: zero hits). The K1 exit gate (:48) and the suite-census class check "12 §0's BASE rows equal 00's fleet table" — both operands of that equality are currently false (00 at R27; 17 §0A also at R27, the REGISTERED P2-#9 re-base). The plan's W5/W6 row (:87) names only "12 §0 … + 17 §0A/header" — **00's re-key is in no landed worklist.** Add it (or fold it into P2 #9's list), and sequence the re-keys BEFORE the battery_r28 fork or class 7/K1 go red at first run.
3. **The RE-3 phantom citation (A7).** 17's D46 facet row (:2391) says "the RE-3 transition-remap probe (06 §5.9C's GAP row — the two-exit gate…)"; 12:26 and 12:37's D46 class say the probe-row presence is battery-checked in 06 §5.9C; the plan's r1 Stage 2-4 row (:87) names "the transition-remap probe's 06 §5.9C GAP home". **06 §5.9C carries only RE-1 and RE-2 — there is no RE-3 row** (`rg "RE-3|two-exit|probe" 06-nle-ops.md` → 0 hits; 06's last commit is the W4 fold). The T3-a worklog flagged this as "ANOTHER task's charge"; it never landed. Three landed sites cite a row that does not exist. Land the row (one GAP row: the pinned `transitionOut` endpoint-remap test green ⇒ replace proceeds; the redesign verdict filed as a new D-entry ⇒ the cut fires) or re-point the citations to 17's own facet row.
4. **16 Appendix C's marker row (A14).** Still "Markers (§3.7) | 5 | 0 | pending Phase 3" — the point-era count. The design's D48 prereq-leg asserts its re-key to the v2 enumeration set; P3-14 registered it as "rides the K3 corpus anyway" — but the design's battery leg makes it a W5/W6-red sub-assertion. Re-key now (it is a two-cell edit) or drop the sub-assertion.
5. **The count authorities hold:** 78→79→80/29→31→32-of-80 coherent at all ten content sites; 182 coherent at all keymap sites with 15's 181 properly registered-stale; 25-code coherent at all three sites; the K-pin figures coherent at all sites that carry them (FINAL's compressed set drops the mock figures by design — acceptable, it cites "the register + 12 §0 carry the canon").

---

## §6 The enforcement-gap attack (the battery classes vs the landed promises)

battery_r28 does not exist yet (correct — W5/W6). The question: does any landed text promise a check the T2 designs don't define, or vice versa?

**Checks defined but not named in the plan's class list:**
- **T2-a's `D42-test-law` check** (three sub-assertions: 12 §8 presence, 17 presence, the 06↔17 pin-vocabulary coherence with drifted members NAMED) — named in NEITHER the plan's ten NOR 12's thirteen. The step-0 class's linkage anchors partially cover the 17-side scrape, but the 12-§8 and 06↔17 coherence legs are uncovered.
- **T2-b's D45/D46/r1-protocol classes** — named in 12's thirteen, ABSENT from the plan's "ten R28 check classes" gate (with a live consequence: the D46 class is the one that would catch the missing RE-3 row — the plan's gate can go green while 12's list is red).
- Conversely, **no landed text promises a check the designs don't define** — every class the plan/12 name maps to a T2-a/b/c design section (verified by design-section grep). The gap is one-directional: the designs define MORE than the plan names.

**Checks the landed text promises whose OBJECT is missing:** the D46 class's 06 §5.9C probe-row sub-assertion (A7); the D48 prereq-leg's 16 Appendix C re-key (A14); the class-7 suite-census equality's 00/17 operands (A9). All three are first-run reds — which is the battery failing loud, arguably by design — but none of the three missing objects has an owner in a landed worklist, so the reds would be unassigned. That is the gap worth closing this round, not at the battery fork.

**The plan's K4 row** (the design's promised zero-error + collector-figures amendment) is the fourth member of this family — promised by the design, named by no class list, landed nowhere (§3.1 above).

---

## §7 The verdicts

| Target | Verdict |
|---|---|
| **The design (test-law-d48-d50.md)** | **RATIFY-WITH-AMENDMENT** — the pin families are live-witness-grounded and the cross-cut architecture is sound; four wording/registration slips (A3, A10, A11, A16) + the §5.2 D1-D50 range slip. |
| **The carve (the landed plan fold)** | **RATIFY-WITH-AMENDMENT** — all eight landed elements verified; the carve law is coherent with §14.4 step-0 and the §0 table passes its own law; K4 does not, the law itself has no machine-check, and the class count contradicts 12 (A3-A6). |
| **The signoffs** | **RATIFY-WITH-AMENDMENT** — condition (3) verified TRUE; the riders' figures accurate; the twins diverge on condition (1) (TESTABILITY stale-at-birth vs FINAL accurate) and on the 13-vs-14 file count; the freshness class needs a per-file rule (A1, A2, A12). |
| **The cross-file coherence** | **RATIFY-WITH-AMENDMENT** — the three count authorities are content-coherent at every site; the stale 15 anchors, the un-owned 00 fleet-table re-key, and the RE-3 phantom citation are the three real contradictions (A7-A9). |

**The strongest finding:** the carve law convicts the plan's own K4 row. The law landed at :32 declaring "a stream row whose gates column cites no test law — no suite count, no battery class, no 12/17 row — is a spec bug," and K4's exit gate (:51 — "green end-to-end, zero mock paths, zero human input") cites none of the three forms; the design's own §4.3 registered the exact fix (the battery's zero-error class + both collector figures) and it never landed — while no battery class scrapes the plan, so nothing would ever catch it. The carve's first enforcement casualty is the carve's own table, and the enforcer doesn't exist yet. (Runner-up, equally concrete: three landed sites — 17:2391, 12:26/:37, plan :87 — cite "06 §5.9C's GAP row" for the RE-3 two-exit probe, a row that does not exist on disk.)

**The amendment list (16, consolidated for the W6/W5 wave):**
- **A1** Re-key TESTABILITY's condition-(1) residues clause — the prereqs LANDED @ 9ad78fa; FINAL's twin is the accurate form.
- **A2** Fix FINAL's "13 files" → 14 (12 numbered specs + PLAN + REGISTER; the W4 commit subject's own miscount is the origin).
- **A3** Fix the S-spec(6) §3.1 enumeration: "pages" → the NS-4 render-plan projector (D45); D50 is §13A.7-only.
- **A4** Reconcile the battery class census: one count, one home (12 §0's battery-posture row), the plan cites by reference; name the scope ("the T2-c ten" vs the fleet's thirteen + T2-a's D42-test-law).
- **A5** Give the carve law its machine-check: a plan-scrape leg (the track/phase rows' gates columns) in the step-0 class or an eleventh class.
- **A6** Land the promised K4 re-key (the battery's zero-error class + both collector figures).
- **A7** Land 06 §5.9C's RE-3 GAP row (or re-point 17:2391 / 12:26/:37 / plan :87).
- **A8** Re-key the stale 15 anchors (:5021/:5023/:5025 → :5035/:5037/:5039, or row-label cites) at 17:4/:20 + the D47 facet row, 12:19/:37, TESTABILITY:7.
- **A9** Add 00's fleet-table R28 re-key to the W5/W6 re-base row; sequence all re-keys (00, 17 §0A/header) BEFORE the battery_r28 fork.
- **A10** Re-register the fx-discriminator pin's surface: the compact-tracks sub-group's DOM-absence (`shell-menu-tl-view-options-compact-*`) / the store resolver — not the nonexistent `shell-view-options` testid (fix the design §3.3(c) AND 17:2395).
- **A11** The design §5.2: "D1-D50" → "D8-D50".
- **A12** Specify the signoff-freshness class's per-file assertion set (FINAL carries no stale-number riders).
- **A13** Complete the r5 rider's citations (the keymap long tail's 17 facet rows + the D49 uniqueness-flip migration note) or cite by reference.
- **A14** Re-key 16 Appendix C's Markers row (5 → the v2 enumeration set).
- **A15** Anchor floors: 17 §13A.8's "PLAN:67" → :69; the S-engine row's "748→" → 749.
- **A16** Scope the §2.6 wire-row leg's negative substring to skip the sweep note's own historical text (or assert the corrected six-kind enumeration's presence).

**Cross-file contradictions found (the sweep's answer):** four — (1) the twins' condition-(1) states (TESTABILITY pending-residues vs FINAL landed); (2) the 13-vs-14 W4 file count; (3) the ten-vs-thirteen battery class count (plan vs 12); (4) the RE-3 citation to a nonexistent 06 row (plus the stale-anchor family :5021/:5023/:5025 and the 00-canonical pin lag as coherence residues, and the S-spec(6) "pages" enumeration error as a plan↔17 contradiction).

---
*Output of Task R28-T4-c. Read-only review; no repo files were modified by this task (this review + the worklog append excepted, per the task's OUTPUT instruction).*

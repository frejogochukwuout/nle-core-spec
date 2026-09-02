# Integration Review R8 — Cross-Stream Consistency (Round 8 Final Gate)

**Reviewer:** Main agent (INTEGRATION-R8, in-session)
**Date:** 2026-09-02
**Specs reviewed:** 00-master v4.0 · 05/06 (Round-8 amendments) · 09 (citation re-baseline) · 12 (note) · 14 (two-repo strategy) · 15 (NOOP + §7.1A + §13.15) · 17 v1.1 (§13A) · 18 v1.1 (UX integration) · 19 v2.0 (three-repo architecture) · README
**Method:** Mechanical battery (`scripts/battery_r8.py`, 48 checks) + integration spot-checks (`scripts/integration_spot_r8.py`, 29 opencut-timeline citation resolves + 20 wiring checks) + manual reading of every Round-8 amendment against its scout-report source (SCOUT-R8-A/B/C). Reference clones verified live: nle-engine @ `8ac91d9`, opencut-timeline @ `d3b2163`.

## Summary

- Checks performed: 11 gates (detailed below)
- Issues found: 9 (0 BLOCKING, 0 MAJOR, 9 MINOR) — **all fixed in-session before push**
- Citation spot-checks: opencut-timeline 29/29 resolve (±5-line tolerance) against the local clone; nle-engine re-baseline rows verified by fresh grep (splitClip:2461, trimHead:2709, rollingTrimItems:2998, slip:4045, slideItem:4133, rateStretch:3153/:5835, freezeFrame:6520, joinItems:6664, snapshotsEqual:1772-keyframe-aware)
- Master spec state: coherent (Decision 11 + §6A NFRs + v4.0 header all correct)

## Verdict: ✅ PASS — push cleared (all findings fixed pre-push)

---

## Per-check results

### Check 1: Command-count & wire-protocol coherence

**Status:** ✅ PASS (after fix)

Spec 15 §4.2 union table = 78 data rows (Round-7 count holds; export + project commands included). The Round-8 amendments (NOOP error code in §6.3, §7.1A transaction semantics, §13.15 opencut-timeline code-refs) all present and cross-referenced. `elementAId` count 0 in spec 15; `engine.project.exportFCPXML` absent from canon outside spec 15; spec 16 resolver canonical-shape battery still green. The one drift found: spec 05 §8.3's drag example used the pre-Round-7 `params: { moves: [...] }` shape — **fixed in-session** (now `elementIds + delta + targetTrackId: null` with the movePlan variant documented).

### Check 2: Decision-11 seam coherence (the new architecture)

**Status:** ✅ PASS

The seam contract (one state model / one wire protocol / two algorithm homes / one render seam / one undo family) is consistently stated in 00-master §2 Decision 11, spec 19 §2.4, spec 14 §2.1+P1, spec 05 §16.5, spec 06 §10.5, spec 15 §13.15. All five seam consumers reference "Decision 11" by name. P1's mandatory seam-adapter deliverable (identity laws + taxonomy warning + never-loss invariant) is in spec 14 §4.3 and spec 17 §13A.5 with matching property lists.

### Check 3: opencut-timeline citation integrity

**Status:** ✅ PASS — 29/29 resolve

Every file:line citation in specs 05 §16.5 / 06 §10.5 / 19 §3.2 was re-opened in the local clone (`d3b2163`): types:95-99, scale:6-8, pixel-utils:9 (2px — recorded as a flagged divergence vs OC's 3px, OC's read wins per the spec's own rule), ruler-utils:21-43, element-interaction-controller:51 (5px strict->), placement:167-197 (zero-anchor), ripple:121, group-move:69 (PlannedElementMove), timeline-core:209/620/652/795, placeholder-compositor:116, headless api:38-102.

### Check 4: nle-engine re-baseline integrity (Waves 4A-4D)

**Status:** ✅ PASS (after fix)

Spec 06 §10.4 re-baselined with 26 fresh-grepped line numbers; six stale Round-7 lines purged. Spec 09 §10.3's four stale rows refreshed: types.ts:1180→:1451, api.ts:2265→:2319 (normalizeProjectForHeadless), api.ts:1069→:2818 (real editProject — status flipped CORRECTIVE→RESOLVED with the counter-example retention note), timeline.ts:1746→:1772 (P0.6 fixed — RESOLVED). The D1-escalation (engine resolved against the spec answer; C8 adapter is the convergence task) is consistently recorded in specs 09/19/00. The battery's stale-line checks now assert absence.

### Check 5: spec 18 v1.1 internal consistency

**Status:** ✅ PASS (after fix)

All seven new sections (§4.9 context menus, §4.10 sample project, §5A pointer/cursor grammar, §6.3 save chip, §6.4 error & notification UX, §9 deepening, §11 a11y floor) exist at their anchors and are cross-referenced from §12's test plan (the §6.3/§4.10 references were added in this review). State-row testids (§10), the §8.14 rejection register, and the §15.2 Q2 resolution are wired. The contradiction policy is traceable: C1-C25 live in SCOUT-R8-C §3; spec 18 cites the register; rejection reasons carry contradiction numbers (C8/C11/C14/C15/C18/C21).

### Check 6: UX-source contradiction policy (ours-wins traceability)

**Status:** ✅ PASS

Every adopted item cites its ux-spec source; every rejected item is registered (§8.14 + SCOUT-R8-C §6's rejection register). The 25 contradictions are resolved ours-wins with two documented adoptions-from-their-side within our grammar (Shift+drag axis-constrain, F6 cycling) — both are additive, not contradictory. No ux-spec-first phrasing survives as normative text.

### Check 7: Testability matrix completeness (the hard requirement)

**Status:** ✅ PASS

Spec 17 §13A.7's matrix has 31 rows covering every Round-7/8 facet (F/NF tagged); §3.1 covers the Rounds-1-6 features; the two tables + per-spec Testing sections form the coverage contract with the "no row anywhere = spec bug" enforcement rule (§14.4 step 0). 00-master §6A ↔ 17 §13A.1 cross-reference each other bidirectionally. NFR rows carry concrete recipes (median-of-N, runner class, pass criteria). Error-path census (incl. NOOP) is enforceable.

### Check 8: Cross-spec reference resolution

**Status:** ✅ PASS

All 16 new anchor references verified: spec 05 §14.5A/§16.5, spec 06 §5.2A/§10.5, spec 18 §4.9/§4.10/§5A/§6.3/§6.4, spec 17 §13A(.1/.7), spec 14 §2.1, spec 00 D11/§6A, spec 15 §7.1A/§13.15. Stale-reference sweep: zero unqualified "timeline-distill"/"forthcoming" mentions survive in canon (the three in spec 19 are struck-through historical resolutions; README's inventory now lists opencut-timeline + cloudcut-nle). The 00-master "§5.6" and "spec 17 §13" miscites were corrected to §13A/§13A.1.

### Check 9: Table & fence integrity

**Status:** ✅ PASS

All edited files: even code-fence counts; table pipe-count integrity with code-span neutralization (the four initial hits were false positives from pipes inside inline code — verified manually). No mid-table note insertions (the Round-7 lesson): all Round-8 insertions are between sections or after tables.

### Check 10: README / master / phases alignment

**Status:** ✅ PASS (after fix)

All three entry documents describe the same Round-8 state: three-repo architecture, Decision-11 seam, v4.0 header, two-repo build strategy, P1 seam deliverable, seal-round checklist (9 items in spec 19 §12 — the C8/C2 engine-adapter item was added in this review). Round-7's "Implementation-ready" status line upgraded to "Round 8 complete" with the correct remaining-seal-scope description.

### Check 11: Scout-report fidelity (recommendations → amendments trace)

**Status:** ✅ PASS

Scout A: §8.1.2 (NOOP, transactions, intra-batch guard, surfaced actual start) → specs 15 §6.3/§7.1A + 06 §5.2A/§5.9 ✅; §8.2 (zero-anchor, thresholds, zoom rewording, live code-refs, 2px/3px resolution) → spec 05 ✅; §8.3 (trim layering, ripple note, engine references) → spec 06 ✅; §8.6/§8.7 (spec 19 rewrite, seam) → v2.0 ✅; §8.8's keep-list all absorbed. Scout B: §8.1 (D1 hold-the-line) → C8 + spec 09 refresh ✅; §8.2/§8.6 (citation re-baseline) ✅; §8.3-8.6 (ledger flips with counter-example retention) ✅; the "43 vs 44 effects" drift is recorded in spec 19 §9's watch list. Scout C: the 15-item integration plan → spec 18 v1.1 items 1-13 land (state rows, context menus, a11y, error UX, visual language, pointer grammar, perf budgets, media pool, inspector, viewer, deliver, sample project); #9 drag/ruler feedback lands as spec 18 cross-refs + spec 05 §9 (ownership split respected); #14/#15 (fixture sharing, scope governance) land in spec 17 §13A.6 + the §8.14 register format.

---

## Issues found & fixed in-session (all MINOR)

| # | Issue | Fix |
|---|---|---|
| 1 | spec 05 §8.3 drag example used pre-R7 `moves:` shape (same-class drift the Round-7 fix missed) | Rewritten to canonical `elementIds+delta+targetTrackId` + movePlan variant documented |
| 2 | 6 stale "timeline-distill / forthcoming" references (05 §1, 14 tail, 19 §1, README ×3) | All updated to opencut-timeline landed; README inventory + status refreshed |
| 3 | spec 09 §10.3 four stale engine citations (pre-Wave-4B state) | Re-baselined with fresh-grepped lines; two statuses flipped RESOLVED with retention notes |
| 4 | 00-master NFR preamble cited "spec 17 §5.6" (nonexistent) and "§13" (wrong section) | Corrected to §13A / §13A.1 |
| 5 | spec 18 §12 referenced "spec 17 §13.2" for UI-interaction-tax (points at triage) | Corrected to §2.5 |
| 6 | spec 18 §12 missing §6.3/§4.10 internal references | Added |
| 7 | spec 19 §12 seal checklist lacked the C8/C2 engine-adapter item | Added as item 8 (now 9 items) |
| 8 | spec 17 §13A insertion initially consumed the §14 header | Restored immediately |
| 9 | README decision-10 line still Round-7 scoped ("two repos", timeline-distill) | Updated to Rounds 7-8 three-repo + Decision 11 summary |

## Final battery state (at push time)

`scripts/battery_r8.py`: **0 failures** (48 checks — union 78, canonical shapes, anchor existence, citation freshness, stale-line purges, table/fence integrity, spec 19 sanity, NOOP registration).
`scripts/integration_spot_r8.py`: **0 failures** (29/29 OT citations resolve + 20 wiring checks).

---

*Round 8 verdict: the spec set is three-repo coherent, seam-bound (Decision 11), UX-complete per the ours-wins policy, and testability-complete (facet matrix + NFR recipes + enforcement rules). The seal round's scope is spec 19 §12's nine items.*

# R27-W5 review-amend — THE ADVERSARIAL REVIEW OF THE CONSOLIDATED AMENDMENT PLAN

**Task ID:** R27-W5-AMEND · **Agent:** review-amend · **Round:** R27 final-tightness, Wave 5 (adversarial review of xcut-amend.md) · **Date:** 2026-09-14
**Artifact under review:** `audits/fleet-r27/xcut-amend.md` (§1 the register, §2 the 13 clusters, §3 the 4 waves, §4 the 13 rulings, §5 the forecast), cross-checked against ALL 21 fleet inputs (the 8 named-heavy: spec-00/06/08/15/18/19, scout-ot, scout-wdc — every fix-item row-mapped; plus the other 13 spec reports + the 5 W4 siblings read for the cluster/battery/forecast cross-checks).
**Method:** report-only; no corpus edits, no commits; stayed on main. Every finding below was verified against the owning report's fix-list text and (where it mattered) the live spec corpus.

## VERDICT: **GO-WITH-FIXES** — the register itself is complete (zero P1s dropped from any report's fix-list) and the ruling set is sound, but the plan is NOT executable as-is: the wave section has 4 structural defects (a verify gate that cannot pass, three double/missing row assignments, ~20 unrowed P2/P3 rows + 2 unrowed P1 rows, the twins split across waves), three cluster-named landing sites have NO register row, and W-D omits 4 check classes its own W4 siblings proposed. All fixes are text-local to xcut-amend.md (§7) — none re-open a report or a ruling.

---

## §1 The completeness sweep (task 1) — **PASS with 3 structural exceptions**

Every P1 from the six heaviest reports + both scouts has a row. Verified row-by-row:

| Report | P1s in fix-list | Register rows | Verdict |
|---|---|---|---|
| spec-00 | P1-1..P1-6 | 00-1..00-6 | ✅ all six |
| spec-06 | F-2, F-3, F-4, F-5 (F-1 P1-graded P2) | 06-2..06-5 (+06-1) | ✅ |
| spec-08 | F1..F8 (P1) | 08-1..08-8 | ✅ |
| spec-15 | P1-1..P1-5 | 15-1..15-5 | ✅ |
| spec-18 | F-1..F-7 (P1) + the §1 ledger row | 18-1..18-7 | ✅ |
| spec-19 | F-1..F-7 (P1) | 19-1..19-6 | ✅ |
| scout-ot §3 | #2, #6, #7, #12, #14, #15 (P1) | 15-2, 15-3, 15-4, 06-3, 09-2, 05-1 | ✅ all six |
| scout-wdc §3 | the "(shims)" FALSE label; the missing diagnostics rows | 20-5, 20-4 | ✅ both |

The other 13 reports (spec-01..05, 07, 09..12-13, 16, 17, 20) were also fully row-mapped (F-1..F-14 → 01-1..01-5, 02-1..02-6, 03-1..03-7, 04-1..04-5, 05-1..05-8, 07-1..07-6, 09-1..09-6, 10-1..10-6, 11-1..11-4, 12-1..12-6 + 13-1..13-3, 16-1..16-5, 17-1..17-6, 20-1..20-8) — **zero P1 dropped**. mock-trim N-7's three closes, mock-insert R1/R3/R4, mock-color §5, mock-variants §3, mock-verdicts §3.1/§3.2/§4, mock-leverage §4/§5 all route (05-4/06-1/05-8, 06-3/§5.5, 08-5, R-1..R-4, R8/R7, P-3/§5.7).

**The three exceptions — landing sites the CLUSTERS name but §1 has no row for (a W6 executor cannot apply them):**
1. **The 09-side GradeRecord row** (cluster-f: "the 09-side GradeRecord row (08 F4's cross-spec note)"; 08-4's ⚠). spec-08 F4 says "the C50 ruling's timeline-grade field + the GradeRecord homes are 09-side rows" — but spec-09's fix-list (§4 A-F) has NO GradeRecord item and §1.09 has no row. **→ add 09-7** (fix text in §7).
2. **The 17 §5 fixture registrations** (02-6/03-7/10-6's ⚠ route the fixture pointers to "17 §5"; W-B's cluster-c list cites "12's mirror" the same way). No 17 row carries §5.1/§5.2/§5.3 registration work; spec-17's own F1..F14 don't include it (the registrations are cross-spec edits INTO 17 from 02/03/10/16). **→ add 17-7** (fix text in §7).
3. **Cluster-c's "12 §9 test-plan mirror" + cluster-d's "12's test-class-5 rows"** — spec-12-13's fix-list contains neither (grep-verified). Either add 12-7/12-8 or strike the phrases; **recommend strike** (the 17-6 F8 mirror + 10-3's clause carry D-HB2; 17-6's F7 facet row + 20-4 carry diagnostics) — see §7.

Also noted (not a row gap): the corpus's 21st spec (14-implementation-phases.md) is a RETIRED redirect tombstone — correctly excluded from the fleet; the header's "24 target files (21 specs + plan + register + battery)" counts 23 live targets (20 live specs + 3). P3 wording nit.

## §2 The conflict resolution (task 2) — 4 of the 7 resolved by §4; 3 flag-only (+2 more found) — resolutions proposed

The ⚠ set resolves as follows:

**RESOLVED by the plan (verified):** (1) mini/variants moving counts → R8 (record-not-chase; register-declared figure + in-flight marker; WRAP-only re-key). (2) The volume "0..1" wording → cluster-a's law text ("persisted LINEAR gain (1 = unity…); the linear span of the domain is [0.001, 10]" — ONE form, the correction, not "stays 0..1"). (3) The law-vs-machinery disposition → R12 (LAW; 02 §7.4 + cluster-d). (4) The 29-of-78 counterpart arithmetic → R4(i). Also resolved: poster-dim (R7, strip-only), NS-4's home (R6), VLM sequencing (R5 rider), curve order (R1), A3-vs-16.A (R3).

**FLAG-ONLY — resolved here (concrete text):**
1. **05-4, the ToolMode enum (two drafted options, "recommend the re-point")** → **Ratify the re-point.** 05 §8.1 :344's literal `type ToolMode` union becomes a pointer: *"type ToolMode = (18 §4.5's tool union — the nine-tool cluster is the owner; this alias exists only for §8A's gesture keying, not as a second enum home)"* — delete the literal union; the T/Y/U key rows re-cite 16 §3.2. Grounds: three enum homes already exist (16 §3.2 / 15 §4.3.45 / 18 §4.5, mock-trim F-22's PARTIAL verdict); extending 05's literal forks a fourth — the one-law class the round is closing (cf. cluster-a's ONE HOME; the FX-tool divergence 16-F4/18-F11 is the cautionary precedent).
2. **00-6, the 2A.10 home (standing law vs 15 §R8 fold)** → **Ratify the standing-law home.** 2A.10 lands in 00 §2A (spec-00 P1-6's drafted block verbatim — already rowed W-C); 15 §0:30's R8 clause + 19-8's row carry one-line pointers. Grounds: the law is consumer-agnostic (any consumer of any exported constant); a 15-only fold re-scopes it to the wire; B-1's "2A.10 live-registry class" + 19-8 already assume this form.
3. **02-6/03-7/10-6, the fixture routing ("the 17 §5 edit must land in the same wave")** → **Register-in-17** (not per-file re-points): add row **17-7** (§7 below) and row 02-6 + 03-7's fixture half + 10-6's fixture half into W-B as one commit with it.
4. **06-7, the AW1-2 lattice fold ("fold before drafting")** → **No re-draft needed:** AW1-2 moved the Inspector GAIN ceiling (+4→+20 dB — the volume domain); 06-7's lattice is the RETIME-rate domain, untouched by AW1-2's values (F-7's table carries no +4 anywhere; the [0.1,4] subset re-verified by spec-06's live reads). Apply F-7 as drafted with one wording rider at the analogy site: *"(the volume-law lattice's authoring ⊂ model pattern — post-AW1-2, [−60,+20])"*.
5. **08-4's ⚠ (the 09-side GradeRecord row "must land in the same set")** — flag is correct but UNACTIONABLE without the missing row → fix via 09-7 (§7).
6. **16-4's ⚠ (pairs with 18 F-11, "same wave")** — the pairing instruction exists but 16-4 has no wave home → row it into W-B's cluster-f commit (§4 below).

**Cross-ref bugs found while auditing the ⚠s (P3):** 05-8's ⚠ cites "§4-R5" for the counting convention — the ruling is **R4** (fix the cite). §2-f's ruling-free list names F3/F4/F5/F8 but W-B's sequencing says F3/F4/F5/F8/**F9** — F9 is ruling-free (post-grade wording from 08 F9b, which rides F9's own text); harmonize §2-f to include F9.

## §3 The one-author clusters (task 3) — complete except the two named gaps

- **(a) volume-dB:** sites complete (09 B2 + 20 §4.1 + 18 §4.4 + 10 §4.4 + the AW1-2 notes 00-4/12-3/17-1). **Neither 16 nor 12 cites the volume domain** — grep-verified: 16 has zero volume cites; 12's only "−60" hits are the ≤ −60 dBFS offline-parity thresholds (a different unit, untouched); 06-7's "volume-law lattice" is an analogy rider resolved in §2.4 above; 09's migration-table `[-60,+20]` rows (09:1942/:2233) are already-correct repo truth. No missing site.
- **(b) preservePitch:** complete (09 + 06 §5.12 + 03 §8.5 + 10 + 18 + the §5.11→§5.12 split). The consumer-side RESOLVED flips (01-5's F-6, 00-8's D36.2, 03-3's bridge append) cite the landed code, not the law sentence — safe outside the cluster.
- **(c) D-HB2:** master (09 §3.3A) + 17-6's F8 ✓ + 10-3's clause ✓; **"12 §9's mirror line" has no row and no owning report text → strike it** (§7).
- **(d) diagnostics:** 02 §7.4 + 20-4 + 11-4's F-9 + 17-6's F7 + 03's F-10 ✓ — but **"12's test-class-5 rows" has no row and no spec-12-13 text → strike** (the 17-6 F7 facet row + 12-4's battery-posture row carry it; §7).
- **(e) census:** correctly routed to xcut-census wholesale ✓ (the routing works; the WAVE split is the problem — §4 below).
- **(f) color:** 08 F1-F12 + 04's two rows + 18's two + 16-4 + 17's facet rows ✓ — but **the 09-side GradeRecord row has no register row → add 09-7** (§7). **17's E1/E2 pin file: REGISTERED ✓** — 17-1's drafted block enumerates `timeline-linked-source-edit 13` in the 25-file list (spec-17 report:119) and 17-5's K2 row carries the matrix registration; cluster-j's closure is coherent with it.
- **(g)-(m):** g (D12, 7 mirrors — 00-9 + 01-2 + 04-4's Row 13 + 07-5 + 11-4's F-7 + 20-8's FIX-7b + 19-8) ✓ complete; h (M2 W1: 20-3 + 02-2/02-3 + 07-4 + 03-7's F-9 + 10-2 + 11-4's F-8) ✓ complete as a set but **wave-orphaned** (§4); i (line-pin map) ✓; j ✓ (but see B-6 in §5); k ✓; **l (the twins) is SPLIT across waves** — 04-1 (W-B) vs 07-2 (W-A pin half) for Gaussian; 04-2's Row-4 half (unassigned) vs 10-1 (W-B) for Z2 → violates "one commit each" (§4); m ✓ WRAP-timed.

## §4 The wave sequencing safety (task 4) — **NO, W-A cannot land as rowed** (4 defects + the ordering)

1. **W-A's own verify gate fails as rowed.** The gate demands "zero '24 routed + 6' / '458/458' outside history-marked text" — but the census-family sites owned by **06-5** (§10.5 :2594/:2616 "30 names split 24 UI-routed + 6 documented exceptions") and **12-5** (K2 GAP :26's "M49C… 24/24" + "(458/759/536)") are rowed W-B, and **15-3/15-4** (the two QUEUED→LANDED flips) are rowed W-B cluster-e — while 15-1 pastes the 31=28+3 block in W-A. Mid-wave the corpus contradicts itself INSIDE 06 and INSIDE 15 (§0's re-declared census vs §13.15's "the wire exposes only the singular verbs … QUEUED"). **Fix:** move the census-TEXT halves into W-A — 06-5's :2594/:2616 re-keys, 12-5's count/M49C re-keys, 15-3, 15-4 — so W-A lands the COMPLETE census-coherent set in one pass (exactly cluster-e's "do not hand-edit variants" doctrine; all four are paste-ready mechanicals from xcut-census §1). W-B keeps the law halves (06-5's three new rows + the batch-atomic re-key + the eight method pins; 12-5's mode-matrix registration; 12-3's instrument law).
2. **Double assignments:** **10-3** is in W-A (whole row) AND W-B cluster-c ("10-3's clause" — the D-HB2 serialization clause names a law whose 09 §3.3A home doesn't exist until W-B). Fix: W-A applies 10-3's re-pin half only; the :15 clause lands in W-B's cluster-c. **00-7/00-8/00-9** are listed in BOTH W-A ("00-7..00-10") and W-C ("00-7 (v12.0), the D-notes 00-8/00-9"). Fix: W-C owns 00-6..00-9 (the standing law + the v12.0 header + the D-notes, landing with the D-index ratification); W-A keeps 00-1..00-5 + 00-10.
3. **Unrowed register rows.** P1: **01-3** (the §6 module-map overlay) and **03-3's law half** (the three dead-clause flips + five missing landed surfaces) have no wave home. P2/P3 (~20): 01-5, 02-6, 03-7's non-cluster halves, 05-4/05-5/05-6, 06-6..06-10, 07-3..07-6's law halves, 09-6, 10-2/10-5, 11-3, 11-4's F-8, 16-4/16-5, 17-6's F6/F9/F12/F14, 19-9, 20-8. Fix: add the catch-all sentence + row the two P1s into W-B. Also: **"03-11" is a dangling reference** (no such row; §1.03 ends at 03-7 — read as a typo for 03-7's §13E pin half; correct it).
4. **The twins split (cluster-l broken):** 04-1 (W-B cluster-free) + 07-2's Gaussian half (W-A) — the Gaussian default would say 4 in one spec and 10 in the other mid-wave; likewise 04-2's Z2 half (unassigned) vs 10-1 (W-B). Fix: one W-B commit each (04-1+07-2's Gaussian half; 04-2's Row-4 half+10-1), leaving only pure pin re-anchors in W-A.
5. **Battery-red risk:** none — the battery runs at W-D only, after W-B; the 6 known pin-lag fails retire there. The exposure is the W-A verify grep + fresh-reader coherence, both fixed by (1).

**Proposed intra-wave ordering.** W-A: (i) 19 §2's line-pin map across all consumers → (ii) the fleet re-pins + the 748/632/777/690/252 triple (00/12/17/19) → (iii) the COMPLETE census family (xcut-census's 89-site table + 15-3/15-4 + 06-5/12-5's census halves) → (iv) the lineage tails + WRAP-gated in-flight markers (R-1's count half) → verify (now passes). W-B: clusters a→e, then g (D12) + h (M2 W1) + l (the twins), then the cluster-free P1s + 01-3/03-3, then 08's ruling-free set (F3/F4/F5/F8/F9), then the ruling-dependent rows after R1/R3, then the fixture commit (17-7 + 02-6/03-7/10-6 halves), with the P2/P3 catch-all riding each file's commits.

## §5 The battery_r27 inputs (task 5) — W-D captures 4 of the 8 proposed classes; 4 missing

Covered: the census-coherence class (B-1/B-2, xcut-census §4's paste-ready draft), the registry-export/2A.10 law, the line-pin re-base map (B-3, 19 §2 + the 12 ledger rows), the 739-trap guard, the (11,13) exemption + r6 drift-canary (B-4), the origin-attribution + OT-total + app-arithmetic classes.

**Missing (each proposed by a W4 sibling; add as B-5..B-8):**
- **B-5 — the register-class** (xcut-register §4's paste-ready pseudo-code: the WRAP-gated mini/variants suite-pin pair replacing r26's hard-equality trap, the per-row FAMILY_PINS scrape, the ONE-method law, the 21-family census, the C-ledger + OPEN-table checks). The W6 executor cannot build this class from "B-1..B4" as rowed.
- **B-6 — the matrix↔GAP-row↔§10.4 consistency class** (the E2 half-flip sweep — xcut-matrix §4.4(a) + spec-06 §4.1 + cluster-j's own "the battery should adopt"; currently only a W-B verify step, not a battery class).
- **B-7 — the D30/mode-matrix zero-orphan-rows class** (xcut-matrix §2/§4.4: every 06 §0 matrix row LANDED or carrying a live r1-scheduled registration — the K2 gate 12-5/17-5 register as law; the battery should enforce it).
- **B-8 — the estimates-absence + D38-presence classes** (xcut-plan §5's adoption path: "battery_r27 gains the estimates-absence + D38-presence check classes" — the plan-overhaul's machine checks; W-D is their only home).

## §6 The ≤P3 goal (task 6) — forecast honest except ONE silent drop

Every implementation-side residue named by the fleet routes to §5's ten items (verified: ChannelEditor max={4}, the C16 e.repeat gate, the dead tool radio, the 24fps slip, the Rate max={400} pair, layout.tsx scaffold → §5.1; the gesture-seam switches + the D-ARCH-6 chain → §5.2; E1-a..d/E2-a/E3/R9-c/NS/S4 → §5.3; the WDC docs wrap → §5.4; RE-2/RO-3/FF-3/G14/the sibling waves → §5.5; the K3/K4 tails → §5.6; the r1 program → §5.7; the design-round set → §5.8; the fixture corpus → §5.9; the ledger re-verify → §5.10). **The silent drop: the SIGNOFF re-stamp** — xcut-register §3's paste-ready banners for FINAL-SIGNOFF.md + TESTABILITY-SIGNOFF.md (both R7-era, ~20 rounds stale, "overclaim by omission"; xcut-register's own framing: "the corpus's only finality claims left"). It is spec-corpus work (not code-side, not sibling-side, not design-round), absent from §1's targets AND §5's forecast. **→ add forecast item 11** (§7). Minor honesty adds: the OT-side P3 pair (api.ts:235's "30 wire command types" header over the 31-entry array + SEAMS.md:184-185's historical 24+6 line — spec-15 P3-4 files them upstream-only) should route under §5.2's OT queue; the "24 target files" → 23 live (14 is a tombstone).

## §7 THE FIX LIST (all edits land in xcut-amend.md itself; concrete text)

1. **§1.09 append row:** `| 09-7 | NEW §3.x/§7 row — the C50 timeline-GradeRecord | The timeline-side grade record per 08 F4's homes clause (clip grades = the per-element effect records, 15 §4.3.52-56; the timeline GradeRecord this row homes; the D29.5c boundary) | spec-08 F4 + spec-08 §3.2 | P1 | ⚠ cluster-f (one author with 08-4) |`
2. **§1.17 append row:** `| 17-7 | §5.1/§5.2/§5.3 — the fixture registrations | 02's 10s-test-pattern re-point + the §6.4 capture-harness note + 03's two JKL/matrix fixtures + 10's eight 10/* fixtures + the shared-name disambiguation + 16's three-clips rider — one registration pass, 17 §5 the registry home | spec-02 F-6/F-7 + spec-03 F-13 + spec-10 FIX-7 + spec-16 F-3's rider | P2 | ⚠ lands as one W-B commit with 02-6/03-7(fixture half)/10-6(fixture half) |`
3. **§2-c / §2-d:** strike "12 §9's test-plan mirror line" and "12's test-class-5 rows" (no owning text; 17-6's F8/F7 + 10-3 + 12-4 carry them).
4. **§3 W-A rows:** replace "03-11" → "03-7 (the §13E pin half)"; replace "00-7..00-10" → "00-10"; add "06-5's census half (:2594/:2616), 12-5's count half, 15-3, 15-4"; qualify "10-3" → "10-3's re-pin half (the :15 D-HB2 clause moves to W-B cluster-c)"; qualify "07-2's pin half" → "07-2's pin re-anchors only (the Gaussian twin's law half moves to W-B cluster-l)".
5. **§3 W-A verify:** unchanged text now passes once (4) lands; optionally extend the grep to the 24/24 family ("'24/24' outside history-marked text").
6. **§3 W-B rows:** add 01-3, 03-3's law half, 04-2's Row-4 half (Z2 twin with 10-1), 16-4 (with 18-8), 17-7 + the fixture halves; add the catch-all: *"All remaining P2/P3 rows ride their file's wave commits (W-A if pin/count-flavored, W-B if law-flavored), in the same commit as their file's cluster."*
7. **§3 W-C rows:** change "00-7 (v12.0), the D-notes 00-8/00-9" to own them exclusively (W-A drops them per fix 4).
8. **§3 W-D rows:** append `B-5 the register-class (xcut-register §4 verbatim); B-6 the matrix↔GAP↔§10.4 consistency sweep; B-7 the D30 zero-orphan-rows registration class; B-8 the estimates-absence + D38-presence classes (xcut-plan §5)`.
9. **§1 row fixes:** 05-8's ⚠ "§4-R5" → "§4-R4"; 05-4's ⚠ append "RESOLVED W5: the re-point (see review-amend §2.1)"; 00-6's ⚠ append "RESOLVED W5: the standing-law home (W-C applies as rowed)"; 06-7's ⚠ append "RESOLVED W5: AW1-2 moved the GAIN ceiling, not the retime lattice — apply F-7 as drafted + the [−60,+20] analogy rider".
10. **§2-f:** add F9 to the ruling-free list (harmonize with W-B's sequencing).
11. **§5 append item 11:** *"The signoff re-stamp (xcut-register §3's banners): FINAL-SIGNOFF + TESTABILITY-SIGNOFF convert from overclaims to dated history at round-close — after W6 + battery_r27 green + the R1-R13 rulings + the K4 successor gate re-lands the seal."* Plus: route the OT-side P3 pair under item 2; "24 target files" → "23 live targets (14 retired)".

## Report-only compliance

No spec/repo file modified outside this report + the worklog entry; no commits, no branches; stayed on main. The W6 amendment wave executes from the owning reports' fix-lists routed through xcut-amend.md WITH §7's fixes applied to it first.

# R28-T4-a — the adversarial review of the D42/D43/D44 test-law chain

**Task ID:** R28-T4-a · **Agent:** adversarial reviewer (fresh context, read-only on main @ `9ad78fa`) · **Date:** 2026-09-16
**Targets:** (1) the design `audits/fleet-r28/test-law-d42-d44.md` (@ the T2 commit `173f976`'s content, landed unchanged); (2) the landed fold — 17-test-plan v1.6 (§0A/:20, §2.5 rule-8/:452-470, §3.1's three rows/:563-565, §13A.1/:2287, §13A.4.1/.4.2/:2316-2317, §13A.7's three facet rows/:2387-2389) + 12-testing-strategy (§8/:713-727, the header/:4 + §0 re-keys/:11-:27).
**Method:** every load-bearing cite re-read live in the corpus AND in the five sibling repos (`nle-engine @ 074a2f6`, `opencut-timeline @ 55c81c0`, `nle-test-app`, `nle-ui`); the three battery checks RUN mechanically against the live text (python regex, the results quoted below); git history consulted for anchor drift (`980920b~1`, `173f976`, `9ad78fa` diffs).

---

## §1 The verification sweep (the claim table)

| # | Claim (source) | Verdict |
|---|---|---|
| 1 | 06:411 = rider 12's uniform predicate ("locked ⇒ skip now; sync-lock ⇒ skip when §6 owns the track — never per-op improvisation") | **VERIFIED** (live, exact, :411) |
| 2 | 06:440 = E1-c's GAP row (the constructible 3-member closure; the mixed-split fixture acceptance) | **VERIFIED** |
| 3 | 06:1603 = OW-4 (prune/CASCADE; companion cascades WHOLE; zero dead pointers) | **VERIFIED** |
| 4 | 06:1671 = D43.10's live three-way intersection (`[MIN_RETIME_RATE, MAX_RETIME_RATE] ∩ NATIVE_VENUE_SPEED ∩ WSOLA_RATE ⇒ [0.1, 5]`; AUTHORING_SPEED NOT an input; refusal-never-clamp) | **VERIFIED** |
| 5 | 15:962-971 = the `linkedTo` patch key (rider 8: string; null CLEARS) | **VERIFIED** |
| 6 | 15's registry = exactly 25 codes; class-tag table = 25 codes, one class each, R==T as sets; the A-6 restorations (TRIM_BEYOND_SOURCE→INVALID_PARAMS/`source`, JOB_QUEUE_FULL→CONFLICT, PROJECT_DIRTY→CONFLICT); `RATE_OUT_OF_DOMAIN` in INVALID_PARAMS; the never-silent law names the three echo members | **VERIFIED** (mechanically: R==T==25, zero dupes — parse of the doc-block + the table) |
| 7 | The constraint union contains `'domain'` | **VERIFIED** — but the design's cite "15:2911" is **DRIFTED**: the union is at **:3005** today (:2991 at the design's own commit; :2911 was the PRE-W4 anchor inherited verbatim from ARCH-R28 §4.1 A-6 — the W4 fold's own insertions drifted it) |
| 8 | The never-silent law at "15:3014" | **DRIFTED** — accurate at the T2 commit `173f976`; the T3 landing's 15-side insertions (the AddMarkerCommand rows) moved it to **:3028** |
| 9 | Pattern library P3/P4 witnesses (`timeline-locked-track.test.ts:185-199`/`:194-198`; 38 rows; 49 runner tests) | **VERIFIED** (live; 38 `name:'` rows counted) |
| 10 | P5 witnesses (`bridge-seams.test.ts:2286-2297` GRID, `:2317-2331` ticks, `:2359-2415` volume-dB; the GRID literal `[-3, 0, 0.001, 0.01, 0.02, 1/32, 0.5, 1, 3.2, 5, 5.0001, 10, NaN]` + the ±Inf hostile case) | **VERIFIED** (live, byte-level) |
| 11 | P19 witnesses (`render-abort.test.ts:8-11` DOMException/AbortError fail-fast; `persistence.test.ts:14-18` the four warning codes) | **VERIFIED** (live; persistence at `tests/vitest/engine/persistence.test.ts:17`) |
| 12 | P6 (`video-sync.test.ts:50-59` nine literal thresholds), P8 (`timeline-relink-fixes.test.ts:5-12` H2-A-1), P9 (`timeline-mode-clamps.test.ts:54-60` the shared battery), P20 (`bridge-seams.test.ts:2333-2345` the flattener wiring proof), the gates-must-fail discrimination (`m2-wave1-mixer-surface.test.ts:28-31`) | **VERIFIED** (live) |
| 13 | OT-side witnesses: `harness.ts:29-59` (assertEqual: Object.is NaN===NaN/−0≠0 + key-sorted deep stringify — "the round-6 F-16 footguns") | **VERIFIED** (live, exact) |
| 14 | `milestones-darch6.ts:508-513` (zero-delta `retimeKeyframes` → benign `ok:true` + `changed:false` + NO history entry) | **VERIFIED** (live — the landed echo form) |
| 15 | `api.ts:536-554` (lockPreCheck: TRACK_LOCKED BEFORE the op and before the stale-ref NOT_FOUND — "locked is distinguishable from missing") | **VERIFIED** (live, exact) |
| 16 | The fuzz net's M25 shape (`milestones-fuzz.ts`: mulberry32, seeds 1..4, `resetIdCounterForTests`; the op set already carries insert/move×2/trim/split/delete/duplicate/**updateElements**) | **VERIFIED** (live — the design's "updateElements{linkedTo} patches ride an existing case" premise holds; `insert` present ⇒ the prune/CASCADE class is fuzz-reachable) |
| 17 | "The vendored OT mirror does not yet carry the field" (the fence's timing law) | **VERIFIED — stronger than claimed**: OT HEAD `55c81c0`'s `BaseTimelineElement` (types/index.ts:179-191) carries NO `linkedTo` (the field is r1-scheduled); the app's `sceneBridge` sidecar DOES exist today (`elementMeta['el-2']?.linkedTo`, sceneBridge.test.ts:87/:148 + the HW2-APP-1 prune family) — the retirement pins have a real subject |
| 18 | bridge-seams = 151 its | **VERIFIED** (live count = 151) |
| 19 | The 78→79→80 / 29→31→32-of-80 projection ("per spec 15 §0-BASE/:5021/:5023/:5025") | **VERIFIED in content** (15:14 §0-BASE carries the full re-derivation; §13.15's rows at :5035/:5037/:5039) — the ":5021/:5023/:5025" cites are **loose** (they point at the §13.15 preamble/blank lines; the actual rows are +10..14 lines below) |
| 20 | 09:343/:345 = B1's D42 note | **DRIFTED** — now **09:378** (the T3 fold's own 09-insertions; the landed 17 facet row cites "09 §3.1A B1" without line numbers — drift-proof, good) |
| 21 | 05:25 re-keyed "~24-code → the LANDED 25-code two-tier envelope" (the design's §D44.1-site-5 mandate; T1-d §2-row-72's prescription) | **FABRICATED-AS-LANDED — the re-key did NOT land**: `git show 9ad78fa -- 05-timeline.md` = 6 insertions, all D49-caption rows; :25 still reads "acceptance: the ~24-code envelope". Not re-filed to any W6/delta-sweep charge (the register and 12:27's GAP row are silent on it). Sibling stale cells at 06:43 and 15:22 carry the same "~24-code" figure |
| 22 | The landed rows' schemas: §3.1 7-col, §13A.7 6-col, §13A.8 5-col, §13A.1 4-col | **VERIFIED** (awk pipe-counts) |
| 23 | 17:2387's acceptance vocabulary ≈ 06:440/:1603's cells | **VERIFIED near-verbatim** ("the untouched third member's ORIGINAL link survives verbatim + the split halves re-pair by side (fresh pointers)" — both files) |
| 24 | The plan's S-engine(4)/(6) row carries the rider-9 count set 13+13+20+12+table+11 | **VERIFIED** (IMPLEMENTATION-PLAN.md:22, item (6)) |

**Fabrications: none.** Every substantive law claim in the design and the fold checks out against the live corpus and the live repos. The defects found are anchor drift, check-regex shape, and ONE missed landing site — not invention.

---

## §2 Attacking the DESIGNS (test-law-d42-d44.md)

### D42 — the ~95-pin sufficiency question

**Sufficient?** Yes, with two honest scoping notes the design under-states:
- **I6-I8 do NOT cover the E1-c constructible case** — and the design never claims they do, but it also never says so. I6/I7 are *pointer-hygiene* invariants (symmetry, no dead pointers, round-trip); E1-c's law is a *value-shape* law (the untouched third member keeps its ORIGINAL link; the halves re-pair by side). A split that SEVERS instead of relinking passes I6/I7 clean. The coverage exists — curated pin #41 (the CHAIN-3 fixture) — and the design's honest limit #1 registers the curated-table trap for *future* verbs. **Amendment:** one sentence in §D42.4-D or §5 stating "I6-I8 are hygiene invariants; the fan-out SHAPE laws (E1-c, OW-4, relink-both-halves) live ONLY in the curated tables — the fuzz net does not substitute for them."
- **The one-way-pointer reading:** §D42.4-A1 pins the mutual-only derivation (correct per 06:409's "symmetric over the link relation"); honest limit #2 then says "both pins listed" — but only the mutual-only pin IS listed. Internal inconsistency; the corpus's law is mutual-only, so the limit's sentence is the wrong half. **Amendment:** reword §5.2.

**Missing?** Nothing load-bearing. The drift fence timing (fail-safe skip until the OV-12 re-pin, §D42.1-3) is coherent — and verified stronger than claimed: OT HEAD itself lacks the field. The app-retirement pins are the right shape: the sidecar exists today (sceneBridge `elementMeta`), the "retire the mechanism, never the law" parity guard (D-(iii)) is the correct form, and the migration window is registered (limit #5). The fuzz generator's premise verified: `updateElements` is already one of the 10 op cases, so the link mutations ride an existing dispatch; `insert` is present, so split-then-insert (the OW-4 class) is fuzz-reachable.

**Over-designed?** No substantive duplication. The per-verb tables' hostile-dangling rows overlap the battery's hostile-zoo sweep in *fixture* but not in *assertion* (commit semantics vs derivation semantics). Pin 50 (the count reconciliation row) is bookkeeping, but rider 9 (F4) mandates it and the plan's S-engine(6) row carries the figure set to reconcile (verified).

### D43 — the live-intersection property, the ⊂ pin, the trap scan

- **Does the live-intersection property catch a WDC narrowing?** *Indirectly, and the design should say so.* The property recomputes `[0.1,5]` from the module's own imported inputs — if WDC (the real audio engine) narrows, OT's `WSOLA_RATE` **literal** does not move (no cross-repo read exists at OT test time), so the property still passes. The catch chain is the **absorption boundary**: WDC's own suite fails → the absorption edits OT's `WSOLA_RATE` literal → the module recomputes → the test's hand-derived `[0.1,5]` literal FAILS → the new figure forces the three-site spec re-key (06:1671 + 06:2709 + 17:2388) that check-2 then catches. What the property catches *directly*: the [0.1,4] input-substitution trap and any static-text hardcoding. The design's §D43.2/§D43.4-P1 are correct in substance; 06:1671's own "if WDC ever narrows, the computed intersection refuses correctly" phrasing invites the misreading. **Amendment:** an honest-limits sentence (§5) — "the narrowing is caught at the absorption boundary (the hand-derived literal fails on the conscious edit), never as a live cross-repo read."
- **Is the ⊂ pin coherent with the twin's failure mode?** Yes — A-5's law (pin failure ⇒ align nle-ui to the one-home, NEVER edit the module) is stated at §D43.4-C49 and §D43.6 and mirrored in the landed 17:2388. One unstated consequence: ⊂ catches nle-ui **over-minting** (a domain the one-home doesn't sanction) but NOT nle-ui **lagging** (missing a newly added one-home domain — ⊂ still holds, pin 48's shared-domain equality doesn't fire). Feature lag is arguably not a law violation, but the design should own the direction choice. **Amendment:** one sentence in §5.
- **Is the [0.1,4]-trap scan the right form?** Yes — the live_stale-style scan with the AUTHORING_SPEED context guard is exactly right, and it passes today (all five corpus occurrences of `[0.1, ?4]` are in AUTHORING naming context: 17:2388, 12:726, 06:1671, 06:2709 ×2). No amendment.
- **The check-3 phase error:** §D43.5 slots "the battery check-2 widening + the ⊂ live check" at **W5/W6** — but its subjects (`core/edit-domains.ts`, nle-ui's `editDomains.ts`) do not exist until **r1 Stage 0** (verified absent in both repos). As designed, check-3 executed at W5/W6 errors or reds on a missing file. The landed 17:2388 facet row *quietly fixed this* by tying the widening to the r1 Stage-0 gate in its pass criterion; the design's own phase table contradicts its landing. **Amendment:** re-slot §D43.6 check-3 to the r1 Stage-0 exit (or add the registered-skip/pre-landing form D42's fence has — the fail-safe-skip asymmetry between the two areas is itself the tell).

### D44 — the census table, the echo family, the self-healing property

- **Live registry vs mirrored copy?** The design is emphatic and correct: §D44.3's P-OT-3 instantiation ("the table DERIVES from the live registry... generated from the exported code→class registry") + the honest limit #4 (the runner-side half deferred to the port; the spec-text battery now) + the §D44.6 LIVE-counterpart registration. The spec-text half I ran mechanically today: **R == T == 25, one class each, zero dupes, the A-6 restorations present, 'domain' in the union** — the parse-and-set-equality form works on the live text.
- **Echo members pinned exactly?** Yes — all three members appear in all four homes (15:3028's never-silent law; 17 §2.5's re-key; 17 :2389's facet row; 12 §8's retime-echo context), with the landed OT form verified at `milestones-darch6.ts:508-513`. The A-8 reclassification (the same-position move is ECHO, not NOOP) is carried consistently — 15's NOOP registry entry itself carries the reclassification note.
- **Self-healing on a NEW code without a class?** Yes, for the spec text: set-equality R==T names the drifted member (a registry bullet without a class row fails; a class row without a registry bullet fails stale). The runner-side twin (the exported map ≡ the spec table) is registered at §D44.6's end — the same projection form as the 78→79→80 arithmetic. Coherent.
- **The "9 riders" enumeration is internally ambiguous in the design** (§D44's preamble lumps ripple-trim-on-existing-gate + the 3 widened-placement verbs + the 8 dedicated + the 2 inherited under a "9" heading, while §D44.4-C counts 8+1). The landed 17 rows picked the coherent reading (8 dedicated + the widened placement-target = 9 NEW gates; the 2 composites carried separately as "+ the 2 applyBatch-inherited riders"; ripple-trim's existing-gate ride stated only at 06:43). No landed defect; the design's preamble could disambiguate. Minor.

---

## §3 Attacking the LANDED fold (17 v1.6 + 12)

**Coherence with 06's GAP-row cells (the cross-file vocabulary law):** HOLDS. 17:2387 mirrors 06:440/:1603 near-verbatim on the shared members (E1-c's "ORIGINAL link survives verbatim... re-pair by side (fresh pointers)"; OW-4's "cascades WHOLE + zero dead pointers"), and adds the members whose homes are 06:431 (relink-both-halves), 06:1697 (duplicate-severs), 15:962-971 (null-clears) — each correctly *cited* in the row. The phase tags agree (r1/Stage-0 family at all three sites).

**Are I6-I8 mathematically well-formed?** Yes, with one precision defect:
- I6 — well-formed; the "cycle-free" term is correctly glossed as derivation-termination on the hostile zoo (matching the design's battery #4 "Terminates (cycle-free)").
- I7 — **the null carve-out is missing**: "every `linkedTo` on every live element points at a live id" — but `null` is the legal CLEARED state (15:962-971: "null CLEARS the pairwise link"). A literal check implementation flags null as a dead pointer. The design's I7 (:93) has the same wording — the defect is inherited, not introduced. **Amendment: "every NON-NULL `linkedTo`... (null = cleared, legal)".**
- I8 — well-formed (the P10 algebra, `linkedTo` fields included, byte-stable round-trip).

**Staleness introduced:**
1. **05:25 — the missed site** (the strongest finding; see §4/§5-L1). The design's §D44.1-site-5 said "05:25's GAP row re-keyed... The census re-key lands NOW"; T1-d §2-row-72 prescribed the exact replacement text; the landing touched 05 for D49 only. 06:43 and 15:22 carry the sibling stale cells ("the ~24-code table" / "the ~24-code envelope").
2. 12:27's model-fold prereq anchors are pre-fold: "09:286-:335 marker interface" (the Marker interface is now :310, the A2 ruling :370) and "15:1566-:1600 params" (the marker wire rows run to :1632). Loose region cites, not wrong claims.
3. 17's BASE (:22) stays at the R27 pin set (engine 748 @ `f9ac806`, app 252 @ `c020b2a`) while 12:4/:14 carries the R28 set (749 @ `074a2f6`, app 252 @ `85cff80`, WDC @ `83b8850`). This is the REGISTERED W5/W6 re-base window (the T3-a worklog's note (d); battery_r28's suite-census coherence class sequences after the re-key) — not silent staleness, but the review records it so the W5 agent's charge is unambiguous.
4. The 17:4/17:2316 cite "spec 15 §0-BASE/:5021/:5023/:5025" points at §13.15's preamble; the projection rows live at :5035/:5037/:5039.

**Table schemas:** clean — §3.1's rows 7 columns, §13A.7's rows 6, §13A.8's rows 5, §13A.1's row 4 (awk-verified). No violations.

**The "same-round" claim itself:** verified true where it counts — every D42/D43/D44 facet now has its matrix/facet/invariant row, the §14.4 step-0 sweep would pass for these three areas, and the 12 §8 block is the section's first growth since the seed six (accurate). The one exception is 05:25, which is a stale *acceptance cell*, not a missing facet row — step-0 does not catch it; the designed D44 check-3 DOES.

---

## §4 The battery-class attack — the checks RUN against the live text

| Check | Sub-assertion | Result today | Whose fault |
|---|---|---|---|
| **D42-test-law** | 1a closure-shape regex `symmetric.*cycle-free\|closure.*symmetric` | **PASS** | — |
| | 1b dead-pointer regex `no dead .?linkedTo\|dead-pointer` | **PASS** (via "dead-pointer sweep" in I7) | — |
| | 1c round-trip regex `linkedTo.*(undo\|serialize\|round-trip)` | **FAIL** — no line (and no non-DOTALL span match) has `linkedTo` BEFORE `undo/serialize`; the landed I8 leads with "Undo/serialize preserves the field (I8)" | **the CHECK's** (order-sensitive regex; the doc's row is natural as written) |
| | 2 §3.1 row + facet row cites | **PASS** (T1/T3/Property ✅ cells; 06 §5.0/§5.9B cited) | — |
| | 3 vocabulary in BOTH 17's facet row AND 06's GAP cells (:440/:1603) | **FAIL on 3 of 5 members** — `relink-both-halves` (home 06:431), `duplicate-sever` (home 06:1697), `null-clears` (home 15:962-971) are absent from the GAP-row acceptance cells | **the CHECK's** (over-narrow scope; the corpus carries all five at the facet row's own cited sites) |
| | 3 phase tags + the four adjectives echoed in 12 §8 | **PASS** | — |
| **D43-test-law** | 1 five tokens in the §13A.7 row | **FAIL on the FIRST token** — the regex `edit-domains\|editDomains` is case-sensitive; the row reads "**E**dit-domains one-home lattice" | **the CHECK's** (case sensitivity; the other five tokens PASS) |
| | 2 cross-file [0.1,5] coherence + exclusion sentence + trap scan | **PASS** (all three sites carry the arithmetic + input names; all five `[0.1,4]` occurrences in AUTHORING context) | — |
| | 3 LIVE import-edge + parsed-literal ⊂ | **NO SUBJECT** — `core/edit-domains.ts` and nle-ui's `editDomains.ts` do not exist (verified absent); the check has no pre-landing disposition | **the CHECK's** (missing the registered-skip window / wrong phase slot) |
| **D44-A6-class-tag-census** | 1 25-code parse + set-equality + A-6 + 'domain' | **PASS** (mechanically: R==T==25, zero dupes, restorations present) | — |
| | 2 17's two-tier re-key tokens (class/fine/25/NOOP/benign-echo; §13A.4.2; §13A.1) | **PASS** | — |
| | 3 coherence sweep: 05:25 no longer stale; 15's never-silent names the three echo members; the 9 riders in 17 | **FAIL on 05:25** — the cell still reads "the ~24-code envelope"; the echo-member matching and the riders both PASS | **the DOC's** (the landing missed the design-mandated + audit-prescribed re-key) |

**Five would-fail-today items: four are the CHECKS' shape (regex order/case, over-narrow scope, missing pre-landing window), one is the DOC's (05:25).** The pattern is consistent and benign in direction: the designed checks are *stricter than the live text*, and the one doc-side failure is exactly the class of miss the check was designed to catch — the check design works; its regexes need hardening before battery_r28 encodes them.

---

## §5 Verdicts and the amendment lists

### Verdict — the DESIGN (`test-law-d42-d44.md`): **RATIFY-WITH-AMENDMENT**

The law-site and pattern-library citations verify live at the repos (zero fabrications); the anti-tautology/live-read/census-trap laws are baked into every count and table; the honest-limits section is genuinely honest; the pin families map 1:1 onto what landed. The defects are check-regex shape, one phase error, and anchor hygiene — all cheap.

**Amendments (audits/fleet-r28/test-law-d42-d44.md):**
1. **:119 (§D42.6 check 1c)** — before: `linkedTo.*(undo|serialize|round-trip)` → after: `(linkedTo.*(undo|serialize|round-trip))|((undo|serialize|round-trip).*linkedTo)` (row-local, both orders; or specify DOTALL over the bounded I8 row).
2. **:121 (§D42.6 check 3)** — before: "appears in BOTH 17's facet row and 06's GAP-row acceptance cells (06:440/:1603)" → after: "...and the facet row's CITED pin sites {06:440, 06:1603, 06:431 (relink-both-halves), 06:1697 (sever), 15:962-:971 (null-clears)}" (the GAP cells carry only the E1-c/OW-4 members).
3. **:93 (§D42.4-D, I7)** — before: "every `linkedTo` on every live element points at a live id" → after: "every **non-null** `linkedTo` ... (null = the cleared state, legal per 15:962-971)".
4. **:201 + :193 (§D43.6 check 3 / §D43.5 phase row)** — re-slot the LIVE import-edge + ⊂ check to the **r1 Stage-0 exit**, or add the registered-skip pre-landing form (the D42 fence's fail-safe-skip shape): "pre-r1 ⇒ REGISTERED-PENDING (the module absent), never a red battery".
5. **:207 (§D44 preamble)** — before: "`'domain'` joins 15:2911's union" → after: "...joins the constraint union (15:3005 at the current fold; :2911 was the pre-W4 anchor — ARCH-R28 §4.1 A-6's own cite drifted with the W4 insertions; re-cite ARCH:190 alongside)".
6. **:207/:215** — re-cite the envelope and never-silent anchors to the post-T3 positions (:3016/:3028) or commit-pin them.
7. **:295-302 (§5)** — add two honest limits: (a) the WDC-narrowing catch-chain (caught at the absorption boundary — the hand-derived literal fails on the conscious input edit — never as a live cross-repo read); (b) the ⊂ direction catches nle-ui over-minting, not feature lag (the one-home may gain a member nle-ui hasn't absorbed — ⊂ still holds).
8. **:293 (§4.7)** — before: "consolidate into ONE 17 §13A.7 clause" → after: "...into 17 §13A.8 (the r1-port acceptance protocol) + the §13A.7 pointer row" (align to the T2-b genus ruling the landing followed).
9. **:298 (§5.2)** — before: "the pin set pins whichever reading lands (both pins listed)" → after: "the mutual-only pin is listed (06:409's 'symmetric' is the corpus's law); the one-way-as-link alternative is rejected, not pinned".
10. (minor) **:199 (§D42.6 check 1)** — specify case-insensitive/normalized matching for ALL token regexes (D43's `edit-domains|editDomains` misses "Edit-domains"); and **:31** — "the family grows 451→+1 entry" conflates the 451-test count with the 49-entry census (say "the 49-entry family gains a file; the 451-test count grows with it").

### Verdict — the LANDED FOLD (17 v1.6 + 12): **RATIFY-WITH-AMENDMENT**

Every site the task enumerates landed with the designed vocabulary and clean schemas; the 25-code census content mechanically verifies against 15's registry and class-tag table; the I6-I8 block is the section's first growth since the seed six and is well-formed modulo the inherited null carve-out; the cross-file [0.1,5] and acceptance-cell coherences hold; no contradictions introduced elsewhere. The one real miss is the 05:25 re-key — a single stale acceptance cell that the designed battery check catches, proving the check's worth at the cost of the fold's "census re-key lands NOW" claim.

**Amendments (the corpus):**
1. **05-timeline.md:25** — before: "acceptance: the ~24-code envelope" → after: "acceptance: the **LANDED 25-code two-tier envelope** (15 §6.3's class-tag table — R28/D44); the r1 refinement is the OT follow" (the design's §D44.1-site-5 mandate + T1-d §2-row-72's exact prescription).
2. **06-nle-ops.md:43 + 15-wire-protocol.md:22** — the same stale-figure family in the sibling GAP-register acceptance cells ("the ~24-code table" / "the ~24-code envelope"): re-key to the 25-code two-tier shape, or explicitly register them as historical lineage — and add the scope ruling to the D44 check-3 live_stale scan (as written it flags all three sites; only 05:25 was mandated).
3. **12-testing-strategy.md:718 (I7)** — before: "every `linkedTo` on every live element points at a live id" → after: "every **non-null** `linkedTo` ... (null = cleared, legal)".
4. **12-testing-strategy.md:27** — re-cite the model-fold prereq anchors post-fold: "09:286-:335" → "09:310-:370"; "15:1566-:1600" → "15:1566-:1632".
5. (registered, no edit now) **17:22** — the R27-pin BASE vs 12's R28-pin BASE is the known W5/W6 re-base window; battery_r28's suite-census coherence class must run AFTER 17's re-key (else it reds on 748-vs-749 / c020b2a-vs-85cff80).

**Amendment count: 15 total — 10 design + 5 landed (one of the landed five is a sequencing registration, not an edit).**

---

## §6 What was NOT found (the negative results)

- No fabricated cites: every file:line claim in the design's ruled-law preambles and verification log resolves to the claimed content in the live corpus or the live repos.
- No mirrored-copy violations: the D44 census is spec-text-live now + runner-live at the port, exactly as the honest limits register.
- No over-design in D42's pin families; no missing coverage hole beyond the scoping notes in §2.
- No table-schema violations; no contradiction between the landed 17/12 rows and 06/15's law sites; the trap scan ([0.1,4]) is clean corpus-wide.
- The "one round behind" conviction the fold closes is real and now closed *for the facet-row law* — the residue is the stale acceptance cell (05:25) and the check-regex hardening, both W5/W6-cheap.

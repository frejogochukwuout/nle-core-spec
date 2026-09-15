# ARCH-R28 — THE SEAL ROUND (every remaining design decision CLOSED; the plan sealed multi-track)

**Round:** R28 (2026-09-15). **Status:** v1 charter — the fleet runs below; the rulings section fills at the fold.
**Namespace:** spec-law decisions continue D1-D41 (ARCH-R22..R27) as **D42+** here.

---

## 0. The ask (verbatim-tightened — the user's R28 directive)

1. **"You are finalizing the spec and any architectural design and/or implementation plan, NOT actual implementation."** The spec lane (S-spec) never executes module-repo work; it rules, files, verifies, re-pins. All execution stays filed in the D40 plan's tracks.
2. **"All the implementation plan should have clear track (with you continuing as the spec / architecture / meta lane — that's fine)."** The plan gains the explicit lane statement; the executor tracks' work orders stay complete and cold-executable.
3. **Close the leftover gap:** the R27 wrap's "next session starts the D40 execution — its head is the app's D-ARCH-6 re-pin + gesture-seam switch" framing is RETIRED — that is executor-track work (S-app's filed work order), not the spec lane's. The gap this round closes is that NOTHING design-side may remain that the executors would have to return to the meta lane for.
4. **Close the user-gate gap — SELF-RESOLVED:** "I have no idea and I don't think you can get any answer from ME, but rather you should figure out what is the right process to get to the right answer and the criteria for those, and just go and solve that yourself." The Stage-0 scope gate, the design-round set, and every registered user-gate are resolved THIS ROUND via the standing process (research packs → criteria → rulings → adversarial review → amendments), each landing as a ruled D-entry with the reversal conditions registered (a user override later is a cheap amendment, never a blocker).
5. **"Seal the whole spec + implementation plan (multi-track) so we can execute."** Exit: battery_r28 green; zero OPEN design decisions in the register; the plan's every phase entry is gated only on execution milestones (K/w/r gates), never on a pending design decision; the meta lane's standing runtime duties enumerated (battery per round, folds, register maintenance, re-pins, the K2 registration at entry).
6. **Budget:** 50+ sub-agent dispatches, multi-pass, tight-scope, iterate until only ≤P3 remains.

## 1. What changed since the R27 pins (the delta this round absorbs)

| Repo | R27 pin | Now (2026-09-15) | The movement |
|---|---|---|---|
| nle-engine | `f9ac806` (748) | `074a2f6` | Docs/wave debris + **CR-F1/F4 CODE** (the sidechain reconnect made UNCONDITIONAL — connect is idempotent; the strip-rebuild sever door closed + physical-connectivity pins) + the OV-12 gate's vendored-root inference fix + the GitLab mirror-rescue merge (`2640a81`). Scout verifies the count truth at the new pin. |
| opencut-timeline | HEAD `55c81c0` (code pin `970948a`, 632) | `55c81c0` — UNMOVED | No movement. |
| web-daw-core | `ec8fd5c` (777) | `83b8850` | HANDOFF + worklog only (the S-series-sync state — docs). |
| nle-ui | `32abd58` (690) | `32abd58` — UNMOVED | No movement. |
| nle-test-app | `c020b2a` (252) | `85cff80` | Docs + the GitLab-only RC-V1 P2 mirror-rescue (`f90d614` — the AR-2 fencing + the gesture pin, already in the corpus) + CR-F2/F3/F5 app folds (dev-server hardening, venue scope, shim law). Scout verifies counts. |
| variants (in-repo mock) | register-declared 1,762/64 + REGISTER-PENDING | **WRAPPED @ `0c7bf01`** (their R25 WRAP, 2026-09-13) | 19/19 reviewer threads resolved; exit gates PASS (0 P1, 0 P2; console 28/28 clean); **1,950/1,950 tests; 126 stories**. **The register re-key is DUE (§2A.11 — WRAP-only): retire REGISTER-PENDING, re-key the declared figures + the live scrape.** |
| mini (in-repo mock) | 495/12 (in-flight, sibling-maintained) | 495 — no movement | Unchanged. |

**battery_r27 at the current tree: 145/149 — the 4 fails are pure pin-lag (engine/WDC/app HEADs + the app's submodule set).** The re-pin is this round's mechanical work (W-A).

## 2. The decision inventory (EVERY open design decision, each closed this round)

### Group A — the Stage-0 mechanism set (D41's open questions → ruled)

| # | Decision | The question | Spec owners | Research pack |
|---|---|---|---|---|
| A1 | **The OT-side linkage model** (the collision map's "biggest hole") + the E1-a..d/E2-a companion-semantics clarifications | Where does the A/V link live during OT ops: an opencut-side linkage field/registry, OR dispatch-level pairwise + a bridge-side relink policy (D32.5's pairwise-at-rest/groups-at-runtime)? Riders: the E1-a companion-track-downstream scope, E1-b locked-track companion mutation, E1-c N-group orphaning on ≥2-splits, E1-d originId legacy companions, E2-a mixed-fate N-groups (cascade wins) — each gets its spec-silent edge RULED. | 06 §5.0 + 09 §B1 | research-linkage (2 agents) |
| A2 | **The constants-module lattice** | The r1-port constants module: D11's four retime domains ([0.01,5] OT / [0.1,4] nle-ui / [0.1,16] engine-venue / [1/32,32] WDC DSP) + the volume-dB [−60,+20] one-home (OT `core/audio-params.ts`) — the module's shape, home, and the import law the ports obey. | 00 (D11) + 15 §13.15 riders + 06 | research-constants |
| A3 | **The E3 error contract + the N3 guard survey** | The wire envelope for the source-edit ops (INVALID_PARAMS-class, never silent no-op — 06 §5.9B) + spec 15 §6.3's refinement + the N3 `lockPreCheck` extension survey over the 36 ops. | 06 §5.9B + 15 §6.3 | research-errors |
| A4 | **NS-4's home** (the SceneTracks→GPU render path) | The bridge adapter vs venue-native decision, folded per D41; reconciles with the r3 color venue table (08 §17.B — fragment passes on the rgba16float working texture). | 04 + 08 §17.B | research-ns4 |

### Group B — the r1-entry absent-family scope gate (SELF-RESOLVED)

The four absent families: append (cheapest) / fit-to-fill / ripple-overwrite / replace (the one greenfield). Decision material: `audits/fleet-r27/mock-leverage.md` §4/§5. The ruling must state: inclusion set, the cost/dependency model behind it, the deferral lever's exercise criteria (when a mid-flight trim becomes the right call), and the reversal protocol (a family cut at r1-entry review costs zero rework — each is stage-contained).

### Group C — the r1 param-alignment trio (R11's pre-filings, ruled now)

1. Singular-absolute vs plural-delta (the wire's verb param shapes).
2. Per-element vs flat lists.
3. `insertBatch`'s bare-verb vs the union's `insert{elements[]}` superset.

### Group D — the design-round set (the register's OPEN table, closed)

| # | Decision | The question | Owners |
|---|---|---|---|
| D1 | **Marker v2 vs 09-A2** | The flat per-scene marker vs range/notes/keyword + clip markers — adopt the range/clip family, or flip to registered rejection + an honest-limited inspector. | 09 (lead) + 05/16/18 |
| D2 | **Captions C34** | The track-kind (with chips) vs element-type model decision. | 09 + 05 |
| D3 | **The 3-vs-5 page shape + FX grammar** (ONE joint decision) | Amend 18 to five pages (audio-focus pinned as a mode), or the 3-page stands with both extra pages registered deviations; the FX-page grammar (fifth page vs FX-as-a-mode per the mock's one-flag law) + the FxBrowser row grammar + the fx-selection domain + ruling 22 land with it; the 16 ⌘3 reconciliation resolves in the same edit. | 18 + 16 (+07 cross-ref) |

### Group E — the small defaults + residuals

| # | Item | Disposition path |
|---|---|---|
| E1 | **D6's r4 re-affirmation** (real media decode, deprioritized) | Default-affirm: r4 stands, gated at its phase entry; the no-dependency statement (w2's media layer needs NO real decode — virtual media first); the user's reversal is a one-line plan edit. |
| E2 | **The C7 rename timing** | Already ruled (r1 END, mechanical) — re-register as settled, nothing to decide. |
| E3 | **D28.2 the productization gate** | Settled by definition (r1-entry OR the first outside consumer, whichever precedes); the seal-snapshot OPTION is described, NOT exercised (it opens at the gate, an execution milestone). |
| E4 | **The R9-c disposition** | The engine's re-filed `paintCompositionFrame(ctx, ops, media, { grade })` seam-side proposal (preserves the D29.5c compose-then-filter ORDER, moves the venue consumer→seam): RATIFY as D29.5c's registered evolution or REJECT — 04's twin row carries the ruling. |
| E5 | **The A3-wheels r3 residue** | CLOSED by D39 (the mapping IS the ruling; only the parity fixtures' consumption rides r3 — execution, not design). Register the closure. |

### Group F — the plan/lane seal

1. The explicit **meta-lane statement** (§0 of the plan): S-spec IS the spec/architecture/meta lane — its standing runtime duties during execution enumerated (battery per round; the register maintenance + WRAP re-keys; the amendment folds; the re-pins; the K2 registration at K2 entry; the retirement triggers' bookkeeping); the executor tracks own their repos; **the spec lane NEVER executes module work — it files, verifies, re-pins.**
2. Every "user-gated" mention converts to "ruled (default) + reversal-registered" — with the dispositions of Groups A-E cited.
3. The design-round set marked DONE (pointers to the landed spec sections).
4. The r1-entry gate restated: the ONLY r1-entry conditions are execution milestones (the K-gates) — zero design decisions outstanding.

### Group G — round maintenance

1. The pin re-base: engine `074a2f6` / WDC `83b8850` / app `85cff80` (+ the submodule set) — the battery's LIVE checks re-pointed; the CR-F1/F4 sidechain law absorbed into the corpus where cited.
2. The variants' WRAP register re-key (§2A.11): declared figures + the live scrape recorded, REGISTER-PENDING retired.
3. battery_r28: extends r27 with the new rulings' checks (D42+'s presence + the coherence classes for each landed amendment set).
4. The wrap: PLAN/HANDOFF/SKILL + push + the /home/sync bundle + the GitLab mirror.

## 3. The fleet grid (the multi-pass design — 55+ dispatches)

| Wave | Agents | Focus | Reports → |
|---|---|---|---|
| **W0 baseline + scouts** | 4 | engine/WDC/app deltas at the new pins (suite-count truth + the CR-F1/F4 seam law) + the variants WRAP register re-key verification | `audits/fleet-r28/scout-{engine,wdc,app,register}.md` |
| **W1 research packs** | 9-10 | linkage ×2 / constants / errors+guards / ns4 / scope-gate cost model / param trio / marker / captions / page+FX | `audits/fleet-r28/research-*.md` |
| **W2 ruling drafts** | 1 (orchestrator) | I draft each ruling from the packs (criteria → options → recommendation → riders) | ARCH-R28 §4 |
| **W3 adversarial review** | 4-6 | fresh-context attacks on every ruling (the R27 pattern: 0-REJECT bar or revise) | `audits/fleet-r28/review-*.md` |
| **W4 amendments** | 8-10 | the spec edits (Groups A-F land across 00/03/04/05/06/07/08/09/15/16/18/19 + the register + the plan + the signoffs) | the corpus |
| **W5 battery_r28** | 1-2 | the battery fork + calibration | `scripts/battery_r28.py` |
| **W6 delta sweep + cross-cuts** | 8-12 | per-spec coherence on the amendment delta + the cross-cuts (mode-matrix, census, register, E2-consistency, the plan's cold-executor re-test) | `audits/fleet-r28/{spec-*,xcut-*}.md` |
| **W7 final integration review** | 2-3 | the seal verdict (every ask met; zero OPEN; the cold-executor bar) | `audits/fleet-r28/integration-*.md` |
| **W8 wrap** | 1 (orchestrator) | PLAN/HANDOFF/SKILL + push + bundle + mirror | the wrap commits |

**Laws carried:** agents edit ONLY their report file, run NO git commands (the orchestrator commits per batch); tight-scope only (SKILL #147); recovery commits verify claims (#146); fetch-before-push, never force push; the battery runs after every round.

## 4. The rulings (D42+ — filled at the fold)

*(pending the fleet)*

## 5. The defect/finding register (the round's outcome)

*(pending the fleet)*

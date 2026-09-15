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

## 4. The rulings (D42-D50 + the ruling-rows — drafted at W2 from the ten research packs; adversarially reviewed at W3; the corpus amendments land at W4)

### D42 — the linkage model: the OT-side pairwise field + the runtime closure (the biggest hole, CLOSED)

**The ruling:** the linkage model lives IN opencut-timeline as the spec-decided pairwise field — **`linkedTo?: string` on OT's `BaseTimelineElement`** (09 §3.1A B1's persistence form; D32.5's "pairwise at rest"), with the **runtime group derived per op by a pure closure helper in `ops/`** (the app's av-link law ported: symmetric, live-id-only, order-stable, cycle-free, **locked-partner-skip**), and the groups→pairs mapping at the port per 00-master:330 (the engine's `linkedGroupId` stays venue-internal). **The app's dispatch-level expansion and the `linkedTo` sidecar RETIRE into the field.** Basis: the port program requires it (the carried E1/E2/F6 pins assert link values through undo/redo/serialization — impossible without a field in the SSOT); the law's coherence (the state-WYSIWYG law covers linked fixtures; the fan-out lives inside the M49C machine's sight); undo/serialization are free (OT's snapshot undo + fromJSON carry the field; relink-both-halves is split's `...element` spread by construction).

**The riders (each lands in 06 §5.0/§5.9B + the port's design notes):**
1. **E1-a CLOSED-AT-HEAD:** the engine ALREADY ripples companion-track downstream (timeline.ts:5817-5868, pinned timeline-edit-ops.test.ts:239-240) — the filed residue was a stale register. 06 §5.0's "downstream" amends to the **track-family reading** ("downstream shifts on EVERY pair track", 06:421); the OT port implements the same. Pin at the port.
2. **E1-b CLOSED-AT-HEAD:** locked companions are excluded by the engine's N3 closure filter at all 26 sites (incl. removeItems :4525-4533, pinned :299-305). The OT closure's **locked-partner-skip** becomes the law; the link desync is the documented choice. Pin: a locked companion does not move while the anchor edits.
3. **E1-c (pairwise re-shape):** under pairwise-at-rest the orphan case re-shapes — untouched third members keep their ORIGINAL pairwise links while the split halves take FRESH links by side. File the pairwise clarification row (06 §5.0, r1) + pin (the F6 per-group law's pairwise twin).
4. **E1-d N/A-by-construction:** OT has no originId inference path; the closure reads only the explicit field. One sentence in the port's design note.
5. **E2-a (defined over the runtime group):** if any member of a derived group is fully removed, the group's pairwise links die with it (**the prune law**); survivors of other pairs keep theirs. File the 06 §5.9B r1 clarification row + pin.
6. **The R14 divergence RETIRES at the port:** relink-both-halves (D32.4) supersedes the mock's `delete right.linkedTo` (useUiStore.ts:859) and the bridge's by-structure sever (sceneBridge.ts:515-518); the OT field's split law is relink-BOTH-halves from day one.
7. **The sever family ports with the field:** duplicate severs the copy (F4 — OT's duplicateElements must delete the field); replace severs by `syncLinked:false` (D31.4); delete/ripple prunes dead pointers.
8. **The wire additions self-declare:** `linkedTo` (string|null-clears) joins `ElementPatch` + `ALLOWED_PATCH_KEYS`; the insert payload carries it; D29-F8's mechanical census re-declaration handles the surface (no spec-15 amendment beyond the patch-key row).
9. **The count reconciliation:** the carried-corpus row's "timeline-linked-source-edit 26" (the plan's S-engine(4)) vs the on-disk 13 (+11 in timeline-relink-fixes = 24 across the two files) — reconcile the figure at the port's acceptance row.
10. **The Duplicate divergence REGISTERED:** the engine re-pairs copies on a fresh shared group (duplicateItems :4615-4621) vs the spec's F4 sever law (06:1695) — **the port carries the SPEC** (sever); the engine stays frozen (venue-internal, registered divergence).
11. **The selection/view gates stay:** 05 §12.3 (pair-selection) + 18 §4.5 N4 (the link-OFF view gate, renamed `syncLinked` at next touch per D32.3) consume the field; they do not move into OT's ops.

**The first implementation step (filed for S-ot):** land the field + the closure + the four base-verb laws as ONE additive OT change (the types/index.ts:179 field; `ops/linked.ts`; the deleteElements/rippleDeleteElements/splitElements/duplicateElements/moveElements consumers; the ElementPatch key; the ported pins re-keyed to the pairwise field).

### D43 — the constants module: `edit-domains.ts` (the one-home extended)

**The ruling:** ONE file — **`opencut-timeline/src/lib/timeline/core/edit-domains.ts`**, a runtime-pure leaf beside `core/audio-params.ts` (the D-ARCH-2/OV-01 precedent). The shape: **per-domain namespaces that RE-EXPORT the two existing one-home leaves verbatim** (volume-dB from `core/audio-params`; retime from `ops/retime` — no moves; OV-01's bridge binding is load-bearing), then add only DERIVED lattice facts: `NATIVE_VENUE_SPEED` [0.1,16], the `WSOLA_RATE` twin [1/32,32] (bridge-seams-fenced), `AUTHORING_SPEED` [0.1,4], the dead-zone predicate, `minDurationTicks(fps)`, and **`FIT_TO_FILL_RATE` computed as the live three-domain intersection → [0.1,5]** (refusal, never clamp). **The import law:** OT's ops ports import the module; the engine bridge keeps leaf-only deep-imports (the native model's C1 clamp derives from the leaf); nle-ui mints a local `editDomains.ts` pinned ⊂ by the battery; WDC stays independent. **Migration:** OT first (Stage 0, zero behavior change), the engine folds its C1/C4 clamps, nle-ui lands its local file, the ports consume from Stage 1.

**The conflicts the ruling resolves (6 real + 2 stale doc-laws):** the engine's alive [−60,+12] clamp at `timeline-math.ts:410`; nle-ui's split Gain rails; the fit-to-fill ×3 domains; the unpinned `keyGainLinearNative` twin; the min-duration literal family; the unnamed authoring literals. **The strongest design constraint:** the zero-runtime leaf law (S3A-P3-1) — the shared binding, not a synced copy, is the whole point.

### D44 — the error envelope: the two-tier taxonomy (E3 + N3 CLOSED)

**The ruling:** a **two-tier taxonomy** on OT's existing flat `CommandResult {ok, code?, error?, data?}`:
- **The class layer** (the closed enum, the abort-logic + chip key): `INVALID_PARAMS / NOT_FOUND / CONFLICT / NOOP / TRACK_LOCKED / INTERNAL_ERROR` (+ `NOT_IMPLEMENTED` at the app bus).
- **The fine layer** (spec-15 §6.3's ~24-code registry): each code tagged with its class + constraint type. **One new fine code: `RATE_OUT_OF_DOMAIN`** (fit-to-fill's never-clamp refusal).

**E3 needs NO new code:** the transition-blocked abort emits `SPLIT_INSIDE_TRANSITION` (already in the registry, 15:2884), class `INVALID_PARAMS`, `constraint:{type:'transition'}` — satisfying 06 §5.9B:1593. **The mechanism:** the wire dispatch arm post-classifies a typed op-refusal (the OT-native pre-check/post-classify pattern — never-throw preserved, zero new seams); the spec's discriminated union is re-declared the consumer-side view, not a second wire. **The never-silent law lands with two sanctioned exceptions** (the NOOP zero-clamp; the A9 idempotent `ok:true`+`changed:false`). **The N3 survey result: 9 lockPreCheck additions** (the new layout verbs roll/slip/slide/rateStretch/retime/freezeFrame/rangeRemoval/replace + one placement-target widening; the 2 element toggles are cosmetic-exempt per engine timeline.ts:2526-2542). **The enforcement:** the wire dispatch arm (runtime) + the never-guard/tsc-lockstep (compile) + 17 §2.5's rule-8 error-path census (audit).

### D45 — the NS-4 render path: the bridge adapter (+ R9-c RATIFIED as D29.5c's evolution)

**The ruling (NS-4):** the **bridge adapter** (D12's own clause-1 form) — a pure bridge-side **render-plan projector**, the visual twin of `scene-to-segments` (spec 07's `buildFrameDescriptor` law — "the renderer doesn't know about SceneState"), minting the venue IR (`project(scene) → TimelineData`, deterministic + idempotent) and feeding the venue's existing `setTimeline`/scene-assembly surface. **The venue stack (scene-assembly → Player → GPU compositor → export) stays engine-internal, frozen, and SceneTracks-blind**, implementing the OT `setTracks()/renderFrame(t)` seam over its projected IR (D12 clause 4). Canvas2D stays the consumer-preview tier + parity oracle. **Venue-native is REJECTED** — it re-implements the bridge's twin-pinned visual laws inside the venue, the exact dual-home D12 clause 3 killed. **The rgba8unorm→rgba16float upgrade lives in the venue** (all 46 sites/10 files engine-internal; the adapter passes descriptors, never texture formats — **zero junction surface**). Arguments: preview and export already share one render path (`_buildLayers` → `renderFrameOffscreen`, player.ts:1297-1322) — the adapter preserves 04 §9's bit-identical WYSIWYG law; the symmetry with the audio venue (SceneTracks→segments→WDC strips — one junction discipline; NS-5's edit-classification seam serves both venues at one point).

**The R9-c disposition (folded):** the engine's re-filed `paintCompositionFrame(ctx, ops, media, { grade })` seam-side proposal is **RATIFIED as D29.5c's registered evolution** — it preserves the compose-then-filter ORDER (the math law), moves only the venue consumer→seam, and gives the app's Z2 landing (deliverService.ts:300-324) and the venue ONE law home; it lands engine-side at its r3-consumption point (with the color venue work). Spec 04's twin row flips from "the decline stands" to "ratified-as-evolution, r3-consumable."

### D46 — the r1-entry absent-family scope gate: INCLUDE ALL FOUR (the deferral lever + the reversal protocol registered)

**Decision (the inclusion set):** all four absent families enter r1's scope — **append** (06 §5.9D, the 6th `PlacementStrategy` riding the LANDED `insertBatch` carrier), **fit-to-fill** (§5.9F, the insert+`updateElements{retime}` composite; audio half DONE — WDC W2), **ripple-overwrite** (§5.9E, the delete→move→insert composite over three routed verbs, one `applyBatch`), and **replace** (§5.9C, the one D31A dedicated op — `performReplaceEdit` + `timeline.replace`, the 79th union member). Basis: the three composites ride LANDED verbs under spec'd laws with named pin sets; replace's greenfield risk is isolated LAST (Stage 4) and reversibly deferred. The registered scale: D36.6's +1.5-3 wk solo (00:467) — the only corpus cost anchor, now gate-framed per D40.1.

**The mid-flight deferral lever (the registered trim, in order):** (1) **replace** — cut at Stage-4 entry if Stage 0's D42/D44 rulings are not folded by the r1-entry fleet round +1, OR the Stage-2 exit gate (the carried insert/overwrite pins green in OT) is not green at the Stage-4 entry review, OR the transition-remap probe fails in OT's element-owned `transitionOut` model (a redesign, not a port). (2) **ripple-overwrite** — cut at Stage-3 completion if the D42 E1-a ruling forces a re-derivation of the delta law's downstream set, or the Stage-3 slot overruns after append + fit-to-fill. (3) **fit-to-fill** — cut if the D43 constants ruling fails to register the [0.1,5] domain or the wave-1 rateStretch port slips its gate. (4) **append** — cut only under a total r1 overrun; it rides any wave and lands at r2 at near-zero cost. **Exercise form:** a cut fires ONLY on a stage exit gate that cannot go green — never a calendar. A cut is a REGISTERED DEFERRAL, not an orphan: the family's §5.9X GAP row re-points to its new phase keeping owner + acceptance (the D30.3 zero-orphan form).

**The reversal protocol:** each family is stage-contained and nothing in the r1-r6 plan depends on any of them. A cut at r1-entry review = ~7 mechanical re-tags (06 §0 + §5.9X, 15 §13.15, 16 §3.4A/F-block, the plan's Stage line + user-gate text, the battery's r1-SCHEDULED count, the K2 registration note), zero code rework; mid-r1 adds only sunk pin-authoring; post-r1 adds the K2 row re-point. Re-opening conditions: r5-entry; the D28.2 outside-consumer trigger; a user override (a one-line plan amendment).

### D47 — the param-alignment trio (R11's pre-filings, RULED)

1. **Singular-absolute vs plural-delta — the gesture-native per-family law:** drag-session families (trim/roll/slip/slide + `retimeKeyframes`) commit a **verb-level shared delta**; placement/authoring families (insert/insertBatch/replace/retime/updateElements/move) commit **per-element absolutes**. The §4.3.66 singular-absolute `retimeKeyframe` retires for the plural delta form. Precedent: D-ARCH-6 D6-2's multiplicity-mirroring rejection ("the singular retime is ABSOLUTE-time while the drag gesture is DELTA-shaped… two code paths for one gesture semantics").
2. **Per-element vs flat lists — the flat self-addressing law:** cross-element flat member lists of self-addressing objects; shared gesture scalars hoist to verb level (never N copies, never parallel arrays); the union's per-element `{elementId, keyframeIds[]}` grouping retires. Precedent: OT's landed shape ("cross-element by design; marquee selections span elements", api.ts:163-166; `retimeKeyframes{keyframes[], deltaTicks}`, api.ts:187-196).
3. **`insertBatch` bare-verb vs the superset — BOTH, by family:** dedicated verbs for the atomic op families (roll/ripple-trim/slip/slide/replace/insert-edit); `insertBatch`-composites for the placement-family modes (append/ripple-overwrite/fit-to-fill); the union gains the bare `insertBatch` (78→79→80); `insert` stays singular, neither deprecated nor aliased. Precedent: the census machinery — verbs self-declare via tsc-lockstep + M49C while param widenings are gate-invisible (D29-F8).

### D48 — the marker model: the OT-aligned subset (the register's OPEN row 5, CLOSED)

**The ruling:** `Marker {id, time, label?, color?, duration?, notes?}` per scene — **one family, point/range by `duration`** (absent = point; `end = time + duration`, ≥1 frame, ≤ scene duration). **`duration` (range markers) + `notes` join 09-A2's family; `keyword` is REJECTED** (registered — no OT home, no consumer); **clip markers are RE-QUEUED to r5-entry** as one field+re-offset-laws bundle (the C35 precedent; the field alone corrupts offsets on split). Decisive evidence: OT's own `Bookmark {time, note?, color?, duration?}` + `getBookmarksActiveAtTime` already carry the range semantic — the flat spec Marker is narrower than its own SSOT, and the app bridge silently drops OT's `duration` (the fleet-r23 09-report flagged this exact widening). Zero OT change, zero new wire verbs (`Partial<Marker>` rides `updateMarker`); markers stay absent from r1's ten-mode leverage map (the plan already phase-tags marker v2 at r5-entry). **Amendment sites (9):** 09 §3.1/§3.1A/§3.3 (+ the stale zod cleanup), 05 §11.1 (the band + range law), 16 §3.7 (the ⌥M pointer), 18 §4.4+§4.9, 15 §4.3.49-51 note, + the register (row 5's split-flip / the OPEN row / C33→ADOPTED-subset).

### D49 — the captions model: track-kind, the per-language hybrid (the register's OPEN row 6, CLOSED)

**The ruling:** `SceneTracksJSON` gains a fourth family **`captions: CaptionTrackJSON[]`** (0..n, one per language, BCP-47 tag) carrying `type:'text'` elements with a **`text` body field** (C34's "track kind + body field" — both halves). OpenCut-classic's `SubtitleSegmentItem` element path is REJECTED v1. Why track-kind: every consumer surface requires a track — export granularity is file-per-language (SRT/ASS/VTT; FCPXML `<caption>`), the inspector/style/language are track-scoped, the burn-in pass excludes captions from `elementAtTime` as a one-line kind filter, and the TextNode render path comes free (captions ARE text elements). The Resolve reference drew dedicated per-language Sub tracks with chips; the mock implements exactly that (10 live pins). Sub-rulings: **the lane position is TOP** (reference + z-mirror; the mock's bottom fixture re-normalizes — the one churn item); the mode matrix needs zero new rows (text's membership decides — shape ops apply, source-window ops don't); **D32: no A/V pairs v1; sync-lock participates**. **Amendment sites (11 across 5 files):** 09×2 (§3.1 schema + §3.1A ruling), 05×3 (§7.3 chips, §12.1 order, §12.2 heights), 18×2 (§4.4 inspector, §4.7 track-head), 10×1 (§8 blocker flip), the register ×3 (row 6's flip + the pin re-key 9→10, the OPEN row, C34→ADOPTED).

### D50 — the page shape + FX grammar: FIVE PAGES, two pinned as modes (the register's OPEN rows 7-8, CLOSED)

**The ruling:** 18 §4.8 amends from three to **Edit / Color / Audio / FX / Deliver** — matching the accepted BASE (nle-ui's 4-page union), the design-of-record mock, and the corpus's own Resolve reference (page-per-workflow; the clone's 7-tab dock simplified: Media/Cut dropped, Fusion→FX, Fairlight→Audio-focus). **Audio = a focus mode** (⌘4 toggle, re-click/Esc exits; ChannelEditor + Sound Library + the MixerDock as its surface — register row 20's home; 20-M2 keeps r2 ownership). **FX = the fifth page per the one-flag law** (⌘5; `fxMode`, two doors one engine; the FULL-Timeline density exemption). The option (b) rejection: three-pages-plus-deviations would re-litigate the audio-only mixer ruling, leave K3 tests off-spec, and deadlock the D26.4 retirement on unflippable rows 7/8. **Riders (landing in the same edit):** the FxBrowser grammar (the 27-presentation source = 07 §6.3, fades→`setFade`), the fx-selection domain, ruling 22, the per-page view-state memory, and 16's ⌘3→Deliver + the ⌘5 row. **Amendment sites (20):** 14 spec-corpus (9×18, 4×16, 1×07) + 3 register + 1 plan + 1 battery + the 00 D-entry.

### The ruling-rows (not D-level)

- **R15 — the small defaults (the user-gate set CONVERTED to ruled-with-default):** (a) **D6's r4 re-affirmation: default-affirmed** — r4 stands as gated-at-phase-entry (w2's media layer needs NO real decode; virtual media first); the user's reversal is a one-line plan edit. (b) **The C7 rename: settled** (r1 END, mechanical — already ruled; nothing to decide). (c) **D28.2 the productization gate: settled-by-definition** (r1-entry OR the first outside consumer, whichever precedes; the seal-snapshot OPTION is described, NOT exercised — it opens at the gate, an execution milestone).
- **R16 — the register re-key (the variants' WRAP, §2A.11):** the headline **1,939 it-blocks / 68 test files** (the battery's line-start method) with the declared pair (1,950 runner-count / 126 stories) recorded alongside; REGISTER-PENDING retires; the 5 drifted row-level test-pin counts re-derive. Mini unchanged (495/12).
- **R17 — the pin re-base:** engine `074a2f6` (code anchor `74bef08`, 749/749, 25 files) · WDC `83b8850` (docs-only, 777/777 unchanged, lock `f5011b3` unchanged) · app `85cff80` (252/252 unchanged; census 42 = 36+5+1; the vendor set engine `74bef08` / nle-ui `83ff8a8` / WDC `ec8fd5c` / OT mirror `6e2b91a`).
- **R18 — the CR-F1/F4 sidechain law absorb:** spec-20 §5 law 10 gains the unconditional-connect clause (connect is idempotent — the strip-rebuild sever door closed); the "5 pins" cite → 6.
- **R19 — the E1-a/E1-b closed-at-head amendments:** filed under D42's riders 1-2 (06 §5.0's two stale-register rows amend to the HEAD behavior).
- **R20 — the A3-wheels residue closure:** D39's model question was already closed by the ruling itself; the r3 parity-fixtures consumption is execution. The register's row text already reflects this — no amendment needed beyond the OPEN-table retirement noted at D50/R16.
- **R21 — the D40-plan lane seal (the Group F fold):** the meta-lane statement lands in the plan §0; every "user-gated" mention converts to "ruled (default) + reversal-registered" citing D42-D50 + R15; the design-round set marked DONE with pointers; the r1-entry gate restated (the only conditions = execution milestones).

## 5. The defect/finding register (the round's outcome)

*(pending the W3 review + the W4 amendments)*

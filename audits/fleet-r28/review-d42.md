# review-d42.md — adversarial review of ruling D42 (the linkage model)

**Task:** R28-W3-1 (the W3 fleet, fresh-context attack). **Target:** ARCH-R28-seal-round.md §4, D42 — the OT-side pairwise field + the runtime closure.
**Method:** independent re-verification of every load-bearing claim at the live pins (engine `074a2f6`, app `85cff80`, nle-ui `32abd58`, OT HEAD `55c81c0` — the research's `970948a` is 4 docs-only commits back; `git diff --stat` confirms zero `src/` drift, so all OT line cites remain valid), then attack on the decision, the riders, and the count reconciliation. Read-only; no state-modifying git.
**Evidence base re-read:** research-linkage-ot.md, research-linkage-engine.md, research-errors.md (patch/envelope sites), 06 §5.0 (:405-445), 09 §3.1A (:150-160, :338-344), 00-master D41(a)/D12 (:326-334).

---

## 1. Verification table (claim × spot-check)

| # | D42 / research claim | Independent spot-check | Result |
|---|---|---|---|
| 1 | OT `BaseTimelineElement` :179-191, **no linkage field**; zero `linked*` in `src/lib/timeline/` | Read types/index.ts:179-191 — `id…transitionOut` exactly as cited; union :231-238; grep `linked\|linkage\|linkedGroupId` → **0 matches** | ✅ VERIFIED |
| 2 | The app's sidecar: `ElementMeta.linkedTo` :80, extract :138, re-merge :168-174, the by-structure sever comment :515-518 | Read sceneBridge.ts — sidecar-owned declaration :19; the liveIds one-loop + "(c) split keeps parity by structure… the right's minted id has no sidecar" sits verbatim at :515-518 | ✅ VERIFIED |
| 3 | The dispatch expansion: `links` map rebuilt per dispatch, `linked()` wrapper | Read engineService.ts:244-266 — the O(scenes×tracks×elements) scan at :251-263, `expandAVLinkIds` at :265-266, `linked(...)` consumed at split :305/trim/move/slip/delete/duplicate | ✅ VERIFIED |
| 4 | av-link's **locked-partner-skip** :141-153 | Read av-link.ts:105-203 — the S3A-P2-1 comment :143-152, `if (locked.has(p)) continue;` :153; undirected `partnersOf` :126-134; offset-preserving `expandAVLinkMoves` :172-203 | ✅ VERIFIED |
| 5 | **E1-a closed-at-head**: Phase 2b at timeline.ts:5817-5868 | Read — the "companion-track gap treatment" block starts exactly :5817 (comment header) and ends :5868 (next section :5870); locked + sync-locked companion tracks excluded (:5834 area), gap-split of unlinked straddlers, `splitPairs.push` | ✅ VERIFIED |
| 6 | E1-a pin: timeline-edit-ops.test.ts:239-240 | Read — "// The downstream unlinked audio clip shifted to [130,230)" + `expect(audioSpans.some(…)).toBe(true)` sit exactly at :239-240 (video twin :237-238, no-overlap postcondition :216) | ✅ VERIFIED |
| 7 | **E1-b closed-at-head**: removeItems locked filter :4525-4533 | Read — the closure `.filter` with `isTrackLockedForEdit` at :4525-4532 (explicit targets pass unfiltered; op-gate at the public head :4507-4510) | ✅ VERIFIED |
| 8 | E1-b pin: timeline-locked-track.test.ts:299-305 | Read — the `it('removeItems on the unlocked member: the locked companion survives…')` block at :298-305 | ✅ VERIFIED |
| 9 | "at all 26 closure sites" (rider 2) | `rg isTrackLockedForEdit timeline.ts` → **24 call sites** (+1 definition :2055) | ⚠️ APPROX — 24, not 26 (nit; removeItems verified directly) |
| 10 | 06:421 carries "downstream shifts on EVERY pair track" | `rg` → the phrase lives at **06:420 (the ripple-trim row)**; the INSERT row at :421 reads only "the right half + companions + downstream shift by the inserted duration — the left half NEVER moves" | ❌ MISQUOTE — finding F1 |
| 11 | duplicateItems :4615-4621 **re-pairs copies** (F4 divergence) | Read — `linkedGroupId: original.linkedGroupId ? (linkedGroupMap.get(…) ?? set(makeId('linked')))` :4613-4621: copies of one original group share a FRESH group | ✅ VERIFIED |
| 12 | OT `duplicateElements` must delete the field (spread would carry it) | Read timeline-core.ts:1318-1350 — `{...element, id: generateId("el")}` :1336-1338; no field deletion exists today (nothing to delete yet) | ✅ VERIFIED |
| 13 | split.ts:183-202 spread = relink-both-halves **by construction**; insert rides opaque (api.ts:644; :906-926; fromJSON "unknown extra fields ride opaque" :2460-2462) | Read split.ts:183-202 (right half = `{...element, id: secondElementId, …}`), api.ts:644, timeline-core.ts:906-926, :2455-2466 | ✅ VERIFIED (with the ≥2-splits caveat — see F3 context) |
| 14 | Wire: `ElementPatch` timeline-core.ts:131-154 + `ALLOWED_PATCH_KEYS` api.ts:1744-1754; the `transitionOut\|null` clear precedent | Read both — exact; unknown patch key → `INVALID_PARAMS` :1758-1764 | ✅ VERIFIED |
| 15 | 09 §3.1A B1 pairwise (`:155-158`, `:341`), `linkGroupId` REJECTED; 00-master:330 D12 clause 3 (linked-groups take SceneTracks shapes per specs 06/07; ops-layer one-home) | Read 09:152-158 + :341 (D32.5 amendment note) + 00:326-334 | ✅ VERIFIED |
| 16 | Rider 9 counts: 13 + 11 = 24 vs "26" | `rg -c '^\s*it\('` → linked-source-edit **13**, relink-fixes **11** (also: edit-ops **13**, mode-clamps 20, locked-track 12 static + 39-row table loop :185-188) | ✅ COUNTS VERIFIED; the decomposition story is contested — finding F4 |
| 17 | nle-ui R14 `delete right.linkedTo` :859; pin useUiStore.test.ts:1106-1112; bridge sever pin sceneBridge.test.ts:702-703 | Read all three | ✅ VERIFIED |

**Net: 15 of 17 exactly verified; one approximation (the 24-vs-26 site count); one misquote (F1).** The evidence base is honest — no claim was found fabricated or drifted beyond the pins.

---

## 2. Attack findings

### F1 — Rider 1 misattributes the "every pair track" text (severity: MEDIUM, fixable at W4)

**Evidence:** the phrase "downstream shifts on EVERY pair track" is in the **ripple-trim row (06:420)**; the **insert row (06:421)** — the row the rider amends — carries only "the right half + companions + downstream shift by the inserted duration." Rider 1's parenthetical `("downstream shifts on EVERY pair track", 06:421)` reads as if the insert row already carries the track-family reading; it does not. research-linkage-engine's own E1-a section says the insert row "still reads ambiguously" — the correct statement of record.

**Why it matters:** W4's amendment editor works off the rider text; a cite that points at text that isn't there risks either amending the wrong row (ripple-trim already says it) or skipping the insert row's edit on the false belief it's already conformant.

**The fix:** restate rider 1 as: amend **06:421's insert row** to the track-family reading (research-linkage-engine's E1-a wording: "downstream (on the target track AND on every companion track hosting a shifted companion — the companion-track gap treatment; sync-locked tracks take §6's inserted-gap propagation; locked tracks stay put)"), **citing 06:420 (ripple-trim) as the in-table precedent**, and re-mark 06:439's E1 register residue CLOSED-AT-HEAD (closed by `a1448ad`).

### F2 — The D32.2 sync-lock rung has no enforcement home in the ruling; the engine pack's P-A/P-B findings are dropped (severity: MEDIUM-HIGH)

**Evidence:** D32.2 (06:411) states lock > sync-lock > link. D42's ruling text ports the closure as "symmetric, live-id-only, order-stable, cycle-free, **locked-partner-skip**" — the sync-lock rung appears nowhere in the ruling or its 11 riders. OT has no sync-lock field today (Stage-4 port), but the seal round's own charter (§0.3: "NOTHING design-side may remain that the executors would have to return to the meta lane for") makes the precedence's OT enforcement a NOW design question. The evidence base supplied it and the ruling dropped it:

- **P-A (live-probed, research-linkage-engine §1.3/P-A):** the engine's *effective* insert precedence is **lock > link > sync-lock** for straddling companions — D32.2's strict ordering holds only for ripple-delete's shift (:4394-4397); effect-equivalent for positions, divergent for the straddle treatment (split vs whole). The pack's disposition: keep it (the split treatment is the sync-preserving one) **and** amend 06 §5.0's third column to say "linked companions take the link treatment; §6 owns the companion track's REMAINING clips (never double-applied)."
- **P-B (new, unfiled):** `closeGapAtPosition` :7499-7521 — the comment claims sync-locked companions are left to §6 but the link-follow filters only locked; a linked+sync-locked downstream companion gets link-moved then interval-mangled (the pack's 20-frame static trace). File as engine P3 pre-r1 (frozen venue, no engine change).
- The pack's port prescription: **"the PORT enforces D32.2 via one uniform closure predicate: skip companions whose track is locked OR sync-locked-non-edited when §6 will own them."**

Neither P-A's third-column amendment nor the uniform-predicate design appears in D42 or anywhere else in the seal-round doc (grep-verified: P-A/P-B occur only in research-linkage-engine.md).

**The fix (amendment):** add **rider 12** — the closure predicate is D32.2's ONE enforcement point in the OT model: locked ⇒ skip (lands with the field, rider 2); sync-lock ⇒ skip when §6 will own the track (slots at the Stage-4 sync-lock port, using the uniform predicate above, never per-op improvisation). File P-A's third-column sentence into 06 §5.0's insert row at W4; register P-B as the engine P3 (pre-r1; the port's uniform predicate is its closure by construction).

### F3 — Rider 5's "prune law" is ambiguous on the companion's fate in mixed-fate runtime groups (severity: MEDIUM)

**Evidence:** the engine pack's rationale that pairwise makes N-groups "structurally unreachable at the OT seam" is true **at rest** but **false at runtime**: D32.4's own representation (06:431 — "both halves carrying the link"; 09:341) plus the undirected closure (av-link.ts:126-134 reads `links[id]` AND every `links[k]===id`) yields a **3-member runtime group** after ONE split of one side — {V-left, V-right, A} — and the spec *mandates* that shape. Consequences:

- **E1-c (rider 3) survives the attack:** the orphan case IS constructible at the port (split V, then a later op splits V-left + A but not V-right), and the rider's re-shape ("untouched third members keep their ORIGINAL pairwise links while the split halves take FRESH links by side") is a coherent law — the ruling's text is right even though the engine pack's "port N/A-by-construction / nothing to port" rationale is wrong (the ruling did not carry that rationale, so no defect lands — but the W4 register row should not repeat it).
- **E2-a (rider 5) does not:** in the same 3-group, an overwrite that fully covers V-left and trims V-right is a **mixed-fate runtime group** — exactly the case the rider governs. The rider says "the group's pairwise links die with it (the prune law)" — but *links die* is ambiguous between (a) the **companion cascades** (the engine's ruled law: "cascade wins… removal is the stronger fate", engine pack E2-a; 06:422's nearest law "removed → the companion cascades") and (b) the companion merely **loses its pointer and survives**. A port author can implement (b) and pass the rider as written.

**The fix (amendment):** sharpen rider 5's 06 §5.9B clarification row to carry the tie-break into the pairwise model: "a runtime group with both a fully-removed and a trimmed member resolves **CASCADE** for companions (removal is the stronger fate); the prune law then clears every dead pointer on survivors" — and pin the mixed-fate runtime-group case (it is constructible: split, then overwrite). Also fix the ruling's own over-broad "relink-both-halves is split's `...element` spread **by construction**": the spread carries the *field* to both halves by construction; the ≥2-splits re-pair (fresh right-side pointers, research §1.5 item 3) requires op code — the first-step's consumer list has it, so only the ruling sentence needs the qualifier.

### F4 — Rider 9's count reconciliation: right action, contested story, too narrow (severity: LOW)

**Evidence:** the on-disk counts verify (13 + 11 = 24). But the two packs give **contradictory decompositions** of the "26": research-linkage-engine §4.4 says it is "an aggregate slip (13 linked-source-edit + 13 timeline-edit-ops = 26)"; research-linkage-ot §3 says "13+11=24 across the two files." The plan row (IMPLEMENTATION-PLAN.md:22, S-engine(4)) lists the files with **separate counts** — "timeline-edit-ops **25** + timeline-linked-source-edit **26** + timeline-mode-clamps 20 + timeline-locked-track **14** + timeline-relink-fixes" — so the aggregate-slip theory is weak, and the row's *siblings* are equally stale (on-disk: edit-ops **13**, locked-track **12 static** + a 39-row table loop, mode-clamps 20 ✓).

**The fix:** widen rider 9 to reconcile the **whole count set** at the port's acceptance row (edit-ops 25→13, linked-source-edit 26→13, locked-track 14→12+table, +relink-fixes 11), not just the 26 figure; record the decomposition as unknown (do not assert either pack's story).

### F5 — Small figure nits (severity: LOW)

- "all 26 sites" → 24 `isTrackLockedForEdit` call sites (grep). Not load-bearing (removeItems and the pins verified directly).
- 06:409 cites `av-link.ts:141-151`; the block runs :141-153 (the skip at :153). Off-by-2, same block.
- The research pins OT at `970948a`; HEAD is `55c81c0` (docs-only, verified) — the ruling should cite the live HEAD or note the pin for W4's battery.

### F6 — The wire lock-classification of a `linkedTo` patch is implicit (severity: LOW)

**Evidence:** the updateElements arm applies a blanket `lockPreCheck` on all patch targets (api.ts:1890-1898) — so a `linkedTo` patch on a locked-track element is `TRACK_LOCKED` automatically. That is a defensible law (locked tracks untouched, even links — arguably *stricter* and more coherent than the engine's cosmetic carve-out at timeline.ts:2526-2542), but rider 8's "no spec-15 amendment beyond the patch-key row" silently inherits it.

**The fix:** one sentence in the port's design note (or the 15 patch-key row): "a `linkedTo` patch on a locked-track element is TRACK_LOCKED (the blanket patch gate); links are not a cosmetic exception" — so the W6 cross-cuts and the D44 N3 survey don't flag it as an unintended lock-surface widening.

---

## 3. The decision attack (pairwise field vs the alternatives)

- **vs a group registry / group-id field:** REJECTED correctly — 09:157-158 + D32.5 rejected the *persisted* group form; D12 clause 3 (00-master:330) assigns linked-groups their SceneTracks shape "per specs 06/07," and the specs have decided pairwise. An OT-side group field would be a fresh divergence from the spec-decided shape — the only spec-legal field form is `linkedTo`. No conflict with D32.5: the ruling is its OT-side consummation, not a re-opening.
- **vs dispatch-level (the status quo sidecar):** verified structurally inadequate — (a) the carried pins assert link values through undo/redo/serialization, impossible without a field in the undoable scene (snapshot `UndoEntry {before, after: TScene}` :177-181 — a sidecar can't ride it; an undone relink cannot reproduce from engine truth); (b) the fan-out is invisible to the M49C census and to the headless/UI WYSIWYG law (api.ts:20-22) — the link law has no wire-existence, so 15's `syncLinked` gate (:497/:630/:661/:698) is unimplementable at OT; (c) the r1 composites (insert/overwrite) become multi-verb `applyBatch` at dispatch level — per-command entries, violating 06 §5.0's "one history entry" (:409); (d) the failure-mode register the app already owns (dead-pointer prune at the mirror, the by-structure sever, the one-notify lag, two dispatch paths) is exactly the carrier-fork divergence the D26 program exists to eliminate. Option 2's only win is zero OT surface — the wrong HOME bought at the smallest surface.
- **Fan-out-table N-group needs:** walked all ten rows (06:413-427) — every row is pair-shaped at rest; no row needs >2 groups at rest. Runtime >2 arises only via D32.4's split law, which the closure derives correctly (F3's finding is about the *residue riders' rationale*, not the field's adequacy).
- **D32.4 coherence:** relink-both-halves is representable (both halves `linkedTo` = partner; partner's single pointer resolves to the left half's id); rider 6's R14 retirement is safe — the mock's sever is pinned (useUiStore.test.ts:1106-1112; sceneBridge.test.ts:702-703) but the mock/variants stay reference-census until D26 (rider 6 says exactly this); grep of both app repos finds **no other sidecar consumers** beyond sceneBridge / engineService / useUiStore+mockData+Clip / the five test files — the retirement set is closed and known.
- **Migration honesty:** the bridge's per-dispatch O(doc) links scan (engineService:251-263) and the mirror's prune seam die with the sidecar — subtractive, as claimed.

**The decision survives the attack.** It is the only spec-legal shape, the only one the port program can consume, and the only one that gives the law a machine-checked enforcement home.

## 4. The riders attack (beyond F1-F6)

- Riders 2/3/4/6/7/10/11 verified coherent (see the table; the E1-b two-law shape — gate throws for explicit targets, filter silently excludes derived companions — matches 06:409's preamble and the pinned engine behavior).
- Rider 8's wire mechanics check out (ElementPatch + ALLOWED_PATCH_KEYS + the transitionOut null-clear precedent; insert rides opaque today — api.ts:644, :906-926, fromJSON :2460-2462) with F6's one-sentence gap.
- Rider 10's duplicate divergence disposition (port carries the spec's F4 sever; engine frozen venue-internal) is correctly registered — verified the engine really does re-pair (:4615-4621) and OT's spread really would need the deletion (:1336-1338).

## 5. VERDICT

# RATIFY-WITH-AMENDMENT

The ruling is sound as law: the right shape, the right home, the right migration, an honest evidence base (15/17 claims verified exactly, none fabricated). The defects are in the riders' edges, one of which (F2) violates the round's own zero-design-residue charter. The amendments (all landable at W4 in the same edit window):

1. **(F1)** Fix rider 1's citation: the track-family text is at **06:420 (ripple-trim)**; the amendment target is **06:421's insert row** (add the track-family sentence there) + re-mark 06:439's E1 residue CLOSED-AT-HEAD.
2. **(F2)** Add **rider 12**: the closure predicate is D32.2's ONE enforcement point — locked ⇒ skip now; sync-lock ⇒ skip when §6 owns the track (uniform predicate at the Stage-4 port); file P-A's insert-row third-column sentence; register P-B as the engine P3.
3. **(F3)** Sharpen rider 5's E2-a clarification: mixed-fate runtime groups resolve **CASCADE** for companions (removal is the stronger fate), prune clears survivors' dead pointers; pin the constructible case. Qualify the ruling's "by construction" split sentence (the ≥2-splits re-pair is op code).
4. **(F4)** Widen rider 9 to reconcile the plan row's whole stale count set (25→13, 26→13, 14→12+table, +11), decomposition recorded as unknown.
5. **(F5/F6, notes)** re-derive the "26 sites" figure (24 on-disk); state the linkedTo-patch-on-locked-track = TRACK_LOCKED law in the port's design note; cite OT at HEAD `55c81c0` (research pin `970948a` is docs-only behind).

**Strongest finding:** F2 — D32.2's precedence has no enforcement home in the ruling that declares itself the linkage model's closure, and the two findings that supplied the answer (P-A's probed lock > link > sync-lock insert reading; P-B's closeGap mangling) were dropped between the research pack and the ruling — exactly the "executor returns to the meta lane" residue the seal round exists to prevent.

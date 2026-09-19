# research-linkage-ot.md — Where does the A/V linkage model live during OT operations? (R28-W1-a)

**Task:** R28-W1-a (the R28 seal round's Stage-0 evidence pack; feeds ruling **D42**).
**Question (00-master D41(a), :489):** *"the actually-open question is where the link lives during OT ops: an opencut-side linkage field/registry in OT's own model, OR dispatch-level pairwise (the app's sidecar) + the relink policy ported into the app's bridge — everything in modes 5/6/7/9 + the companion fan-out hangs on it (OT has NO linkage field today; `av-link.ts:39-43` is the engine's, the app dispatches pairwise)."*
**Method:** read-only reads of opencut-timeline @ pin `970948a`, nle-test-app @ `c020b2a`/`85cff80`, nle-engine @ `074a2f6` (code anchor `74bef08`), nle-ui @ `32abd58`, and the spec corpus @ the R27 pins. Every claim carries file:line or spec-section citation.

---

## 0. Verdict summary

**Recommendation: Option 1 — an opencut-side linkage FIELD, specifically `linkedTo?: string` on `BaseTimelineElement` (the 09 §3.1A B1 pairwise persistence form), with the runtime group (the engine's `linkedGroupId` class) derived at op time by a pure closure helper in OT's ops layer. NOT a group registry, NOT a group-id field, NOT dispatch-level.** The full argument is §4; the mandatory riders (the E1-a..d/E2-a dispositions, the R14 divergence retirement, the count reconciliation) are §5.

---

## 1. OT's current model — the precise map

### 1.1 The element type (no linkage)

`opencut-timeline/src/lib/timeline/types/index.ts`:
- `BaseTimelineElement` **:179-191** — `id, name, duration, startTime, trimStart, trimEnd, sourceDuration?, animations?, params?, transitionOut?`. **No linkage field.** Grep-verified: zero matches for `linked|linkage|LinkedGroup|linkedGroupId` anywhere in `src/lib/timeline/`.
- The 7-way element union `TimelineElement` **:231-238**; creation types via distributive Omit **:312**.
- `SceneTracks` **:116-120** (overlay/main-singleton/audio — Decision 2's shape); `TScene` **:37-45**.
- Track lock exists (S2): `locked?: boolean` on every track variant **:67/:75/:83/:91/:99** — the D32.2 precedence's FIRST rung is represented in OT; the second (sync-lock) is not (§4g).

### 1.2 The ops layer

`src/lib/timeline/ops/` (6 files, 7,723 LOC total with api.ts):
| File | LOC | Role |
|---|---|---|
| `timeline-core.ts` | 3,360 | the TimelineCore class: ops + preview/commit + undo + playhead + serialization |
| `group-move.ts` | 814 | planned multi-element moves |
| `group-resize.ts` | 448 | the group trim discipline (`buildResizeMembers`, `computeGroupResize`) |
| `split.ts` | 222 | pure split (`splitElementsOnTracks`) |
| `retime.ts` | 72 | rate derive/clamp |
| `element-utils.ts` | 164 | shared find/scene helpers |

Public op surface (all in `timeline-core.ts`): `insertElements` :887, `moveElements` :1088, `splitElements` :1221, `deleteElements` :1252, `rippleDeleteElements` :1282, `duplicateElements` :1318, `updateElements` :1384, plus track toggles :2080-2247 and keyframe ops :1653-1987.

### 1.3 withUndo / history machinery

- `withUndo` **timeline-core.ts:826-848** / `withUndo2` :851-872 / `withUndoScene` :1487 — commit-before-notify (R3A-2), one entry per committed mutation.
- `UndoStack` **:183-313** — **SNAPSHOT-based**: `UndoEntry {label, before: TScene, after: TScene}` :177-181. Consequence (§4f): any new element field rides undo/redo for free — no per-field undo bookkeeping can ever desync.
- Transaction discipline: `beginTransaction`/`endTransaction`/`clearFuture` **:233-269** (F1B-7); `applyBatch` **headless/api.ts:2559-2616** (depth-anchored rollback, per-command `data.results`).
- Lock gates: `rejectsLockedRefs` **:522** guards split :1231, delete :1256, rippleDelete :1286, duplicate :1322, updateElements :1389 — batch-atomic (one locked ref rejects the whole op).

### 1.4 What the wire sees after an op

- The wire is the `HeadlessTimelineApi` (headless/api.ts, 2,643 LOC): `TimelineCommand` union :56-…, **`WIRE_COMMAND_TYPES` = 31 verbs (28 routed + 3 exceptions)** :243-275 + tsc-lockstep asserts :277-297; `WIRE_UI_EXCEPTIONS` :328-335; the recorder (`wireLog`/`wireCoverage`/`wireUiCoverage` :416-434, HA-4-2 origin attribution :375-385) is the M49C census's evidence source.
- The patch seam: `ElementPatch` **timeline-core.ts:131-154** (startTime/duration/trims/name/hidden/retime/params/transitionOut|null) and the wire's **`ALLOWED_PATCH_KEYS` api.ts:1744-1754** — an unknown patch key is `INVALID_PARAMS` (:1758-1764). A linkage field that must be authorable through the patch surface joins BOTH lists.
- Serialization: `toJSON` **timeline-core.ts:2438-2440** (deep clone), `fromJSON` :2468-2537 with `validateSceneForLoad` — **"unknown extra fields ride opaque"** (:2460-2462) and insert's raw spread passes unknown element keys through (`{...raw}` api.ts:644; `insertElements` spread timeline-core.ts:906-926). An additive optional field round-trips today with zero changes; shape-validation is the hardening to add.

### 1.5 Where a `linkedTo`-class field would land (the concrete touch list for Option 1)

1. **types/index.ts:179-191** — `linkedTo?: string` on `BaseTimelineElement` (one line; the union + creation types inherit it structurally).
2. **NEW `ops/linked.ts`** — the pure closure helper: `expandLinkedIds(tracks, ids)` + `expandLinkedMoves` (the port of nle-engine `bridge/av-link.ts:109-203` — symmetric, live-id-only, order-stable, cycle-free, locked-partner-skip :141-153) + the runtime group derivation (pairwise→group, D32.5).
3. **ops consumers**: `deleteElements`/`rippleDeleteElements` (companion cascade + survivor-pointer prune), `splitElements` + `split.ts:183-202` (the halves' `...element` spread already carries the field to both halves = relink-both-halves by construction; needs the partner's side of the re-pair for the ≥2-splits case), `duplicateElements` :1337-1348 (**must delete the field on the copy** — the F4 sever), `moveElements` (offset-preserving derivation), the trim path (group-resize/`buildResizeMembers` session membership).
4. **ElementPatch + ALLOWED_PATCH_KEYS** — `linkedTo?: string | null` (null-clears, the transitionOut precedent timeline-core.ts:147-152) — the authoring path for 16 §3.4's `toggleAVLink` in wire form.
5. **Insert validation** (api.ts:640-719 neighborhood) — optional shape check: string-or-absent.
6. **Spec 15** — the patch-key row + the insert-payload note; the census self-re-declares mechanically (D29-F8; proven 3×: 24+6 → 25+5 → 28+3, 00-master:500).
7. **Spec 09 §3.1A B1** — already the model home (`ElementJSON.linkedTo`, 09:155-158 + :341); no shape change needed, only the "runtime home = the OT element field" sentence.
8. **The app's bridge** — RETIREMENT, not addition: the `linkedTo` sidecar member (sceneBridge.ts:80/:138/:168-174) collapses into the field; the engineService `linked()` wrapper (:251-266) retires.

---

## 2. The app's bridge reality (the status quo, mapped)

### 2.1 The sidecar's shape and the dispatch expansion

- The app's bridge field law (D2e, sceneBridge.ts:7-31): structure engine-owned; **`linkedTo` is SIDECAR-owned** (:19) — carried in `ElementMeta` (:68-81, member :80), extracted :138, re-merged on the way back :168-174.
- The expansion happens at DISPATCH in the router: engineService.ts:244-266 — on every `dispatch(cmd)`, the `links: AVLinkMap` map is rebuilt by scanning the whole mirrored doc (`el.linkedTo` :257), then `linked(ids) = expandAVLinkIds(core.getScene().tracks, links, ids)` expands ids for split :305, trim :312, trimToPlayhead :329, move (via `expandAVLinkMoves` :385-400), slip :410, delete :422, duplicate :430.
- The expansion algorithm itself lives in the ENGINE repo: `nle-engine/src/lib/nle/bridge/av-link.ts` — the seam law :10-24 ("link propagation is an ID-CLOSURE EXPANSION the consumer's dispatch applies BEFORE the engine op — the linked partner rides the SAME op (same history entry, one ⌘Z)"), the four laws :26-37 (symmetry/live-id/order/no-cycles), the locked-partner skip :141-153, the offset-preserving move derivation :172-203. Its documented boundary :39-43: *"what happens to a link AFTER a split (which half inherits it) is the consumer's sidecar merge policy — the link map is rebuilt from the mirrored doc each edit there."*

### 2.2 What breaks today (the desync classes)

1. **The relink-both-halves law (D32.4) is implemented NOWHERE.** The engine-path split severs by structure — sceneBridge.ts:515-518: *"split keeps parity by structure — the left half keeps the original id → keeps a RESOLVING sidecar, the right's minted id has no sidecar"*; the mock store's R14 law does it explicitly (`delete right.linkedTo`, nle-ui useUiStore.ts:855-859; pinned useUiStore.test.ts:1106-1112). Both are the registered D32.4 divergence (06:431).
2. **The link is invisible on the wire.** A remote/headless consumer sending `timeline.split {elements:[v]}` gets no companion fan-out — the expansion is a private app layer above the wire. The state-WYSIWYG law (api.ts:20-22: "the same command sequence applied here (headless) and via the React UI (mouse/keyboard) must produce an identical SceneTracks") holds today only because the UI's command list is pre-expanded (targets = the pair-selection); the LINK LAW itself has no wire-existence, so spec-15's `syncLinked` gate (15:497/:630/:661/:698) is unimplementable at OT until the field exists.
3. **Dead pointers are pruned only at the mirror** (HW2-APP-1, audit-HW2 FW-B): sceneBridge.ts:168-174 + :505-522 — the one-loop `liveIds` membership check is "the sidecar's only hygiene seam (the engine has no link field; no engine writer can clean a dead pointer)". Pinned sceneBridge.test.ts:656-703, GluedShell.test.tsx:361-387.
4. **Two dispatch paths, two link semantics.** The port tree's keys/gestures dispatch through the wire (`use-wire-dispatch.ts:80-88`; the port's `s` key use-keybindings.ts:61 → `timeline.split` with selection-derived targets); the store's routed commands go through the router (engineService `linked()`; e.g. the mock's splitElement routes `r.dispatch({type:'split',…})` nle-ui useUiStore.ts:838). The pair rides path 1 only via SELECTION propagation (05 §12.3, the store's `pairOf` useUiStore.ts:596-605 — gated by the link toggle, 18 §4.5 N4), not via the linkage law; path 2 fans out via the sidecar map. Any consumer that doesn't replicate both policies diverges.
5. **Two undo domains per linked gesture.** Mirror writes never mint engine history (engineService.ts:14-15: "Mirror writes NEVER go through withHistory — engine undo covers timeline ops; store undo covers the sidecar/view/mixer domain"); the mock path's split lives in the STORE's `withHistory` (useUiStore.ts:839-863) while the router path's split lives in the engine's `withUndo`. The ⌘Z facade (engine-first, engineService.ts:16-19) plus the notify-driven mirror re-derivation re-syncs the two — but only at notify granularity ("the store mirror is one notify behind at most during dispatch", engineService.ts:285-287).

### 2.3 What formalizing Option 2 would require

- A spec home for the relink policy OUTSIDE the editing engine (the app's bridge): 06 §5.0's law would be executed by a consumer, while D12 clause 3 (00-master:330) makes OT's ops layer the ONE algorithm home and says "Transitions/**linked-groups**/sync-lock take SceneTracks shapes per specs 06/07 — spec work, not repo improvisation."
- The r1 source-edit ports (insert-edit/overwrite — Stage 2, "the E1/E2-tested algorithms + the 26-test pin file carried", xcut-plan:183) would have to take an `AVLinkMap` PARAMETER at every call site and emit relink patches as op RESULTS for the app to apply to its sidecar — because the ops are pure functions over SceneTracks (timeline-core.ts:23-24) and the sidecar isn't in SceneTracks.
- The undo/redo failure: engine undo restores SceneTracks snapshots that never contained the link; the relink state would live only in the app's doc, re-derived per notify — an undone+redone linked op cannot reproduce its re-pair from engine truth alone.
- The failure-mode register the policy must own: right-half sever (today's behavior, the D32.4 divergence), dead-pointer pruning (2.2.3), locked-partner desync (the documented choice, av-link.ts:147-153), the one-notify mirror lag, and the wire-invisibility of it all.

---

## 3. The interaction laws each option must satisfy (the spec citations)

| Law | Source | Statement |
|---|---|---|
| The fan-out law | **06 §5.0 :407-409** | the companion RIDES THE SAME OP: one command, one history entry, one ⌘Z; propagation is an id-closure BEFORE the op — symmetric, live-id-only, order-stable, cycle-free |
| The ten-mode fan-out table | **D32.1, 06 :413-427** | per-mode companion semantics: insert splits the pair at the same frame + each half re-pairs; overwrite = fate-based (removed→cascade, trimmed→trim-to-match); replace SEVERS (`syncLinked:false`); append = the linked-append law (same startTime, atomic refusal); fit-to-fill = same rate, ONE commit; duplicate severs; ripple-overwrite = cascade + both-tracks delta + incoming unlinked |
| Base verbs | 06 :429 | split (the relink bookkeeping), trim (tightest-δ), delete/range-removal (the linked expansion), move (offset-preserving), rate-stretch (same stretch) |
| Precedence | **D32.2, 06 :411** | **lock > sync-lock (track-level, §6) > link (clip-level)**; sync-locked companions are excluded from link expansion and take §6's propagation (06 :2000-:2048) |
| Canonical name | D32.3, 06 :409 | `syncLinked` (the spec-15 wire name, 15:497/630/661/698) — one name at every layer at next touch |
| Split relink | **D32.4, 06 :431** | relink-BOTH-halves is the law (engine `relinkSplitSegments` timeline.ts:773-795); representable in 09's pairwise `linkedTo` as both halves carrying the link; FreeCut's single-side sever is REFERENCE-CENSUS; the nle-ui R14 right-half-sever is a registered divergence |
| Model shape | **D32.5, 06 :433 + 09 §3.1A B1 :341** | pairwise `linkedTo` at rest (the persisted form; the group alternative REJECTED), groups at runtime (the engine's `linkedGroupId` expansion); the r1 port maps groups→pairs explicitly (00-master:330) |
| The E1/E2 fix lineage | engine PLAN :200-250 + the pin file | the D32.6 fix contract: Phase-1b companion splits, the `from < insertFrame` exclusion (left half NEVER moves, D31.2), the ≥2-splits per-group by-side re-pair with FRESH ids, `linked:false` severance, R1-B4 companion aborts, the fate-based overwrite law (cascade vs carve) |
| The E1-a..d/E2-a residues | engine PLAN :221-231/:248-250 | see §5 riders |
| The carried pin corpus | `tests/vitest/engine/timeline-linked-source-edit.test.ts` (421 LOC, **13 `it` blocks** — 6 E1 + 7 E2, grep-verified) + `timeline-relink-fixes.test.ts` (**11** — the F6 per-group relink hardening) | **count flag:** the R27 plan row (IMPL-PLAN S-engine(4), xcut-plan:69/:140) cites "timeline-linked-source-edit 26" — the on-disk file carries 13; 13+11=24 across the two linked files. The 26 figure needs reconciliation at the port (either the row bundles a planned extension or miscounts); this report cites the on-disk truth. |
| Selection home | 05 §12.3 :753-755 | "selecting one selects both" |
| View-gate home | 18 §4.5 N4 :207 | the link-OFF toggle suspends selection propagation + companion fan-out, VIEW-level; never edits doc-level links |
| One undo family | D12 clause 5 (00-master:332) + 15 §7.1A :3006-3018 | OT's snapshot undo + transaction discipline is THE undo family; the engine's UndoStack retires with the op ports |

---

## 4. The two options against the seven criteria

**(a) One-history-entry-per-linked-op.** Option 1: the op expands the closure internally and mutates inside ONE `withUndo` — one entry by construction (the av-link seam law verbatim, av-link.ts:12-14; the E1 pin's postcondition 4, pin file :110-119). Option 2: the base verbs ALSO achieve one entry (the dispatch passes the pre-expanded list into one op call — today's mechanism). The divergence is the r1 composite families: insert-edit/overwrite must split+shift+relink atomically; at dispatch level they become multi-verb `applyBatch` composites (the D31.6 pattern), which mint per-command entries under the transaction discipline (api.ts:2559-2616) — atomic, but NOT one-entry (the "one undo" phrasing in D31.6 leans on the batch's rollback discipline, and 06 §5.0's law says "one history entry", 06:409). As pure OT ops (Option 1) the composites are single-`withUndo` functions over SceneTracks — the port program's own declared shape ("pure functions over SceneTracks wrapped in withUndo", task context; D12 clause 3). **Advantage: Option 1.**

**(b) The M49C census/coverage machinery.** Option 1's surface additions (the `linkedTo` patch key; the insert-payload field) land inside the machine-checked wire: `WIRE_COMMAND_TYPES` tsc-lockstep + the M49C gate self-re-declare mechanically per D29-F8 (proven 3×, 00-master:500; OT api.ts:243-297 + :328-352). No new VERB is strictly required for the fan-out itself (the linkage is data, not a command); the authoring verb (toggleAVLink, 16 §3.4 :63 lists it as a UI-layer extension today) becomes the patch key. Option 2 adds nothing OT-side — which means the census **sees nothing**: the fan-out lives in an app dispatch wrapper the M49C machine cannot observe, and the headless/UI WYSIWYG law (api.ts:20-22) is structurally unable to cover linked fixtures (a headless `timeline.split` on one half cannot reproduce the app's fan-out). **Advantage: Option 1.**

**(c) The D12 freeze.** Neither option touches the engine's frozen venue-internal methods. The OT↔engine contract is SceneTracks JSON as the shared shape (D12 clauses 1-3, 00-master:328-330): every consumer of the shape treats unknown element fields opaquely (OT fromJSON :2460-2462; the engine's bridge/flattener read only their keys; av-link.ts imports types only, :45-50). D12 clause 3 explicitly assigns linked-groups their SceneTracks shape "per specs 06/07 — spec work" — and the specs HAVE decided: pairwise `linkedTo` (09 §3.1A B1, D32.5). An OT-side optional `linkedTo` IS the spec-decided shape; a group-id field would NOT be (the persisted group alternative was rejected, 09:157-158). **Advantage: Option 1 (and it's the only spec-legal shape of it).**

**(d) The carried tests.** The E1/E2/F6 pin corpus asserts `linkedGroupId` values (pin file :137-148, :226-227, :348-359), one-undo restoration (:112-119), fresh-id re-pairs (:146-147), and `linked:false` severance (:150-167). Ported into OT, every one of those assertions must read the OT representation. With no OT field there is nothing to read — the port would assert op RETURN VALUES only, and the re-pair would not survive undo/redo/serialization (the snapshot never held it). Stage 2's contract is explicit: "the E1/E2-tested algorithms + the 26-test pin file carried" (xcut-plan:183). **The port program REQUIRES the linkage present in OT. Advantage: Option 1, decisively.**

**(e) The gesture path.** OT's controllers dispatch ops with target sets computed BEFORE the op: the resize session's members are built at mouse-down from the selection (`buildResizeMembers`, resize-controller.ts:161-169; commit at :325 → `commitElements` → the wire's `timeline.updateElements` patch seam, app use-timeline-resize.ts:78-87); the actions layer pre-filters locked refs (use-timeline-actions.ts:127-131) and dispatches `timeline.split` with selection/playhead-derived targets (:289-304); "Gestures NEVER route here (the preview pipeline is core-local by architecture)" (use-wire-dispatch.ts:19-21). Today the app's linked trim works because SELECTION carries the pair (the store's `pairOf`, 05 §12.3) into the gesture's member set — a consumer-side policy OT cannot replicate (OT's own selection is link-blind). Under Option 1, OT's session builders can expand by the field directly (or defer to the selection union law — an explicit sub-decision to file at the port). Under Option 2, every gesture-bearing consumer must inject the expansion at its own layer — the exact carrier/fork divergence the D26 census program exists to eliminate (the registered-divergence rows multiply per consumer). **Advantage: Option 1.**

**(f) Serialization/undo/redo correctness.** Option 1: snapshot undo carries the field for free (UndoEntry before/after TScene, timeline-core.ts:177-181); `toJSON`/`fromJSON` ride it (opaque unknowns :2460-2462; the round-trip law :2464-2466 holds — the validator never rejects anything our scenes contain, and the field is optional-string); split's `...element` spread (split.ts:183-202) gives relink-both-halves BY CONSTRUCTION (both halves carry `linkedTo`; the partner keeps its pointer at the original/left id — the exact representation D32.4 names, 06:431); duplicate needs one deletion (the F4 sever, at :1337-1348); delete needs the survivor-pointer prune (the HW2-APP-1 law moves INTO the op). Option 2: the link state lives outside the undoable scene — engine undo cannot restore it, the mirror re-derives it per notify, and an undone relink silently reverts or strands (the two-undo-domain problem, §2.2.5). **Advantage: Option 1, structurally.**

**(g) The sync-lock interaction (D32.2).** OT has the lock rung (`rejectsLockedRefs` :522 — the closure must skip locked partners exactly as av-link.ts:141-153 does, making the "link desync is the documented choice" the OT law too) but NO sync-lock field today (collision-map row 6: "sync-lock does not exist in OT", engine audit-AW1 §3 :203). Option 1 gives the precedence ONE enforcement point: inside the closure helper, where lock is already checkable and sync-lock will slot when its Stage-4 port lands (xcut-plan:183). Option 2 would scatter the precedence across consumer dispatch policies (the app's wrapper would need to replicate §6's exclusion on top of the lock skip). **Advantage: Option 1.**

**Option 2's honest win:** zero OT surface. The sidecar already works for the app's base verbs, the engine's av-link seam is tested (engineSeam.test.ts:124-134), and nothing forces migration. But it buys the smallest surface at the cost of the wrong HOME: the law's every enforcement point (WYSIWYG, wire, undo, gestures, carried tests) lands outside the machine-checked editing core, and D41(a)'s own framing — "everything in modes 5/6/7/9 + the companion fan-out hangs on it" — makes the port program the dominant stakeholder.

---

## 5. Recommendation, riders, first step

### 5.1 The ruling (recommended text for D42)

**The linkage model lives IN opencut-timeline, as the spec-decided pairwise field: `linkedTo?: string` on the OT element type (09 §3.1A B1's persistence form; D32.5's "pairwise at rest"), with the runtime group derived per op by a pure closure helper in `ops/` (the av-link law ported; the engine's `linkedGroupId` stays venue-internal and maps groups→pairs at the port per 00-master:330). The app's dispatch-level expansion and the `linkedTo` sidecar RETIRE into the field.** Weighting applied: the port program's needs (decisive — §4d) > the law's coherence (WYSIWYG + one-home + undo, §4a/b/f) > migration cost (small and subtractive — the app deletes a wrapper and a sidecar member) > minimal-surface bias (Option 2's only win).

### 5.2 Mandatory riders any ruling must carry

1. **E1-a (companion-track downstream non-ripple):** the OT port implements the FAN-OUT TABLE's reading — "downstream shifts on EVERY pair track" (06:421) — NOT the engine's target-track-only residue. New pin at the port; 06 §5.0's insert row gains the explicit "every pair track" sentence it already carries.
2. **E1-b (locked companion):** the closure SKIPS companions on locked tracks (the av-link.ts:141-153 law becomes OT's own; the link desync is the documented choice — cite it in 06 §5.0's preamble as OT-enforced, closing the engine residue by construction at the port). Pin: a locked companion does not move while the anchor edits.
3. **E1-c (N-group orphaning on ≥2-splits relink):** under pairwise-at-rest the group is runtime-derived, so the orphan case re-shapes: untouched third members keep their ORIGINAL pairwise links while the split halves take FRESH links by side. FILE the pairwise clarification row (06 §5.0, r1) + pin it (the F6 per-group law's pairwise twin — engine PLAN :227-229, relink-fixes.test.ts:5-20).
4. **E1-d (originId legacy companions):** N/A at the port — OT has no originId inference path; the closure reads only the explicit field. Close as N/A-by-construction with one sentence in the port's design note.
5. **E2-a (mixed-fate N-groups, cascade wins):** define over the RUNTIME group: if any member of a derived group is fully removed, the group's pairwise links die with it (the prune law); survivors of other pairs keep theirs. File the 06 §5.9B r1 clarification row + pin (engine PLAN :248-250).
6. **The R14 divergence RETIRES at the port:** relink-both-halves (D32.4) supersedes the mock's `delete right.linkedTo` (useUiStore.ts:859) and the bridge's by-structure sever (sceneBridge.ts:515-518); the mock/variants stay reference-census until their D26 reconciliation row, but the OT field's split law is relink-BOTH-halves from day one.
7. **The sever family ports with the field:** duplicate severs the copy (F4; OT duplicateElements must delete the field); replace severs by `syncLinked:false` (D31.4); delete/ripple prunes dead pointers (HW2-APP-1 moves into the op).
8. **The wire additions self-declare:** `linkedTo` (string|null-clears) joins `ElementPatch` + `ALLOWED_PATCH_KEYS`; the insert payload carries it; D29-F8's mechanical census re-declaration handles the surface (no spec-15 amendment beyond the patch-key row).
9. **The count reconciliation:** the carried-corpus row's "timeline-linked-source-edit 26" (xcut-plan:69/:140, IMPL-PLAN S-engine(4)) vs the on-disk 13 (+11 in timeline-relink-fixes) — reconcile the figure at the port's acceptance row so the carried-test gate counts the real files.
10. **The selection/view gates stay where they are:** 05 §12.3 (pair-selection) and 18 §4.5 N4 (the link-OFF view gate, renamed `syncLinked` at next touch per D32.3) consume the field; they do not move into OT's ops.

### 5.3 The concrete first implementation step

**Land the field + the closure + the four base-verb laws as ONE additive OT change:** (1) `linkedTo?: string` on `BaseTimelineElement` (types/index.ts:179); (2) `ops/linked.ts` porting av-link's closure (symmetric, live-id-only, order-stable, cycle-free, locked-partner-skip) + the pairwise→runtime-group derivation; (3) consumers: `deleteElements`/`rippleDeleteElements` (cascade + prune), `splitElements` (relink-both-halves via the existing spread + the partner re-pair), `duplicateElements` (sever), `moveElements` (offset-preserving); (4) the `ElementPatch`/`ALLOWED_PATCH_KEYS` `linkedTo` key with null-clear; (5) the ported pins: the 13-test E1/E2 file's base-verb subset + the locked-skip + the prune + the duplicate-sever, re-keyed to the pairwise field. Spec-side: 06 §5.0 gains one sentence (the field's runtime home = the OT element type; the sidecar retires) and the §5.2 riders' rows. Everything else (the r1 composites' companion laws, the `syncLinked` verb params) builds on this base at Stages 2-4 unchanged.

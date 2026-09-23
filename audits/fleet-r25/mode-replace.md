# R25 Mode Audit — REPLACE EDIT (fleet-r25, mode #4 of the confirmed gap family)

**Auditor scope:** ONE mode — Replace (DaVinci edit-mode family, mock `ui-mock/timeline_edit_modes (2).html` view-replace). Verify the absence is real and total, then build the spec-first design analysis for adding it as a new op family in spec 06.
**Method:** read-only, no commits, no repo modifications. All greps run live in-sandbox. Live pins: nle-engine `3989506` (brief's `removeItems :3527` is stale at this pin — live line **:3757**, re-verified), opencut-timeline `fdb771c` (WIRE_COMMAND_TYPES read live = 30 names), nle-core-spec `3684166`, nle-ui `3026099`, nle-test-app `64fb0ab`.

---

## Mode card (verified)

Source: `nle-core-spec/ui-mock/timeline_edit_modes (2).html` (744 LOC), tab-nav of **6 modes** (`:403-408`): Insert / Overwrite / **Replace** / Append at End / Ripple Overwrite / Fit to Fill. `switchMode()` (`:732`) only toggles `.active` classes — each view is a static CSS "final state" teaching diagram. The corpus's own second reading of this file is `ui-mock/shell-variants/docs/r20/insert-modes.md` (§1.2 verbatim quotes, §1.3 grammar table) — cross-verified below.

**Name / tab:** "Replace" / "Replace Edit" (`:527`, `:405`).

**Verbatim description (`:530-535`):**

> "Replaces a single clip on the timeline with one of the exact same length. The 'out' point of the clip you are editing into the timeline will be changed so it fits perfectly, making it the same duration as the one it replaces."

**Visual grammar (verified against the CSS, `:285-309`):**

- **Ghost exactly overlays the target clip's span:** `.view-replace .clip-ghost { left: 155px; width: 105px; }` (`:305`) — identical geometry to the target slot (turtle clip, natural width 105 per `:193`; sits at 155–260 in the pre-state). The R20 doc pins this as the mode's defining fact: "**replace** incoming clip adopts the replaced clip's WIDTH (105px) — **exact-length swap**" (insert-modes.md:135).
- **DOWN-ARROW at the target:** `.view-replace .down-arrow { left: 202.5px; }` (`:308`) — points into the 155–260 slot (true center would be 199.5, as fitfill's arrow correctly uses; a 3px mock imprecision). **RIGHT-ARROW hidden:** `.view-replace .right-arrow { display: none; }` (`:309`). insert-modes.md:125 pins the family law: the right arrow is "shown ONLY for insert … and ripple — i.e. only when downstream clips move." Replace hides it ⇒ **downstream does NOT move**.
- **The out-auto-adjust visual:** the floating source chip (sunset, natural width 175, `:210`) is drawn at `width: 105px` (`:286`) — the source is shrunk to the target's exact duration — and carries a mid-span split treatment (dual-pane `::after`, right half at `brightness(0.85)` + a 1px `border-left` divider, `:296-304`; the R20 doc reuses this divider as its split-tick grammar source, insert-modes.md:256-257). CSS comment: "Show split effect on sunset popover in Replace mode" (`:287`).
- **Header icon (`:512-526`):** two clips (outgoing gray, incoming white) with curling up/down arrows — ported verbatim as `ReplaceModeIcon` (`shell-variants/src/components/timeline/editModeIcons.tsx:83`).

**Semantic law (card):** target = ONE clip (mock text: "a single clip"); incoming source's OUT point is auto-adjusted so `duration(new) == duration(target)` EXACTLY; the replaced span is vacated and refilled with zero net time change; downstream stays put. **The corpus's own contrast sentence** (ripple view, `:627-632`) separates the two modes by exactly this invariant: "Ripple overwrite replaces a shot of ONE length with a shot of a DIFFERENT length… push everything down… no gaps" — replace is the same-length twin.

**Refinements / artifacts (do not change the law):**
- **Target selection is UNSPECIFIED in the mock text** — the playhead sits at the target's start edge (155, same as every view). The brief's "clip under the playhead" is a reasonable visual read, but the corpus's canonical resolution already exists: **16's N15 law** (`:254`): all *selected* elements when ≥1 selected; with no selection, the clip under the playhead on the focused track (fallback: main track). The shell-variants tip corroborates the selection-first half ("needs a clip selection", SourceEditBar.tsx:66). **Adopt N15.**
- Mock artifact: the timeline-row clip after the ghost is relabeled "Sunset.mov" in this one view (`:548`; "Turtle.mov" in every other view) — the incoming source's name bleeding onto the target slot's occupant (the static diagram mixes pre/post state). No keyboard hint anywhere in the file (no F9–F12).

---

## Absence verification

Targeted greps for `replace` (case-insensitive) + `performReplace|replaceClip|replaceElement|replaceEdit|timeline.replace` across all six named specs and all repo src trees. Raw hits and their classification:

| Surface | Raw hits | True NLE-replace hits | False-positive classes |
|---|---|---|---|
| **05-timeline.md** | 4 (`:640`, `:1214`, `:1266`, `:1721`) | **0** | prose "replaces" (snap-threshold supersedure; correction language; "additive, not replacement") |
| **06-nle-ops.md** | 2 (`:455-456`) | **0** | `leftReplacementId` — split-op transition remap code quoted from timeline.ts; internal variable naming |
| **15-wire-protocol.md** | 10 | **0** | `selectElements` selection-mode enum `'replace'\|'add'\|'subtract'\|'toggle'` (`:1483-1526`, `:4054-4075`); prose (`:4885`) |
| **16-keyboard-shortcuts.md** | ~25 | **0** | selection-mode contexts (`:199-205`, `:539-558`), `String.replace` in test-scan code (`:1628-1632`), prose (`:15`, `:29`, `:2298`) |
| **18-ui-shell.md** | 3 | **0** | selection-mode (`:253`); "Rationale / replacement" table header (`:370`); focus-ring prose (`:438`) |
| **00-master-spec.md** | 5 | **0** | prose "replaced/replaces/replaceable" |
| **nle-engine** (src/lib/nle, incl. timeline.ts + headless/api.ts) | many | **0** | `String.replace`/JSON-pointer unescape (`api.ts:500`); split/join internal remap variables (`timeline.ts:641-643`, `:7414-7422`); doc comments ("Wave 2B replaces the previous…"); keyframe `replaceScalarPropertiesWithVectorProperty` (a migration helper, `keyframe-store.ts:513`) |
| **opencut-timeline** (src + .agents) | ~50 | **0 ops** (two adjacent artifacts — see below) | upsert-replaces-keyframe semantics; params wholesale-replace law; `String.replace`/`replaceAll`; HTML escaping |
| **nle-test-app** | ~40 | **0** | String.replace, wholesale-patch prose, selection-replace semantics; the ported timeline copies OT's replace-target *comments* (`timeline-port/TimelineView.tsx:1531/:1551/:1598-1600`) |
| **nle-ui** | ~40 | **0** | String.replace, `selectElement replaces by default`, wholesale-patch prose, vendor noise |
| **ui-mock/shell-mini** (src) | ~15 | **0** | comments/prose only |
| **davinci_resolve_ui_mock.html** (18's base) | 0 | **0** | — |
| **ui-mock/shell-variants** | many | **replace EXISTS here — with divergent semantics** (see below) | — |

**Wire census (live, OT `fdb771c`):** `WIRE_COMMAND_TYPES` (`src/lib/timeline/headless/api.ts:182-213`) = exactly 30 names (24 routed + 6 exceptions) — **no `timeline.replace`**; the tsc-lockstep guard (`:216-230`) proves the union is closed. The engine's headless `EditOperationName` (19 freecut-parity names, `headless/api.ts:378-397`) has no replace, and the engine's `performInsertEdit`/`performOverwriteEdit` are not exposed there either. **Spec 15's §4.1A union (78 members; Timeline family = 17, `:299-303`) has NO `replace` member** — unlike roll/slip/slide (union members, engine algorithms exist, r1 wave 1), replace is absent from *both* the union and every implementation.

**OT's OP-COVERAGE.md: no replace row AT ALL.** §1 "NLE edits — FULL parity" (`:12-23`) lists 11 verbs (insert, move, trim, split×3, delete, ripple-delete, duplicate, retime-math, snapping); §5 "Deliberate omissions" (`:62-71`) cuts clipboard / audio-separation / effects / masks / media-asset / graph-editor — **replace appears in neither table**; the verdict (`:82-86`) claims "11/11 classic verbs ported" over a census that never counted it. This is a *silent census omission*, not a documented scope cut. The actual disposition chain lives in DECISIONS.md:

> "**Context menus**: … the in-scope items only (split/duplicate/delete/mute/hidden/expand-keyframes/collapse; track menu: mute/hide/delete non-main). **Source-audio, freeze, replace, paste, reveal → not ported (engine-absent or classic-disabled; see UI-AUDIT dispositions).**" — opencut-timeline `.agents/DECISIONS.md:543-548`

**OT's two adjacent artifacts (a parked gesture, not an op):**
1. **Drag-to-replace is a deliberate no-op:** SEAL SD-5 — `computeDropTarget` resolves a REPLACE target for compatible element hits, but "the drop itself no-ops on it, **matching classic's not-implemented replace**" (`drag-drop-controller.ts:228-232`); `executeAssetDrop` bails on `target.targetElement`, mirroring classic's own "Replace media source — not yet implemented: return" (`:354-359`, citing classic `drag-drop-controller.ts:435-438`). So classic itself never shipped replace — the mode is **out-of-parity-frame**, not a parity scope cut.
2. **The hover affordance is wired:** the replace-target dim (classic `opacity-50`) renders during library drags — `TimelineView.tsx:1297-1303` (drag-line hidden for REPLACE targets), `:1364-1373` (U-8 fix, `targetElementId` chain), REVIEW-TRACKER `U-8` FIXED (`e88a911`). The gesture reaches the commit point and parks.

**The one extant implementation — shell-variants — contradicts the mode card.** `src/lib/insertPlan.ts:44` unions the 7 Resolve edit functions incl. `replace`; the branch (`:311-340`) is **selection-driven, places the source at the target's start with the SOURCE'S OWN duration** (`dur = sourceDurOf(m, ctx)`), and "downstream neighbors the longer replacement now covers are trimmed/removed too" (`:327-329`; pinned by `insertPlan.test.ts:222-241`, `useUiStore.test.ts:2030-2033`). That is remove+overwrite — **not** the exact-length/out-auto-adjust law. Yet its own button tip promises the mock's law: "Replaces a single selected clip with **one of the exact same length**" (`SourceEditBar.tsx:66`), and the R20 reference doc pins "**exact-length swap**" (insert-modes.md:135). The OT seam-map row says the same and names the spec gap:

> "`replace` | — | **NO-SEAM**. Composable: `timeline.delete` + `timeline.insert` (explicit, at the old clip's startTime) + trim/`timeline.updateElements` to exact duration. Spec 06 §5.9-family has no replace row; nle-engine has no `replaceEdit` in the §10.4 coverage table either" — `insert-modes.md:291`

**Verdict on absence: REAL and total on every production surface** (engine op: 0; OT op/wire/UI-commit: 0 with a parked no-op; app/nle-ui/shell-mini: 0; specs 05/06/15/16/18/00: 0; wire union: not even a member). The only replace that exists is mock-world (shell-variants) and it implements the wrong law. A third mock renders the affordance (nle_edit_workflow.html:203-209, edit-overlay menu with Replace), so the UI surface is triply referenced while the semantics are singly specified (the mode card).

---

## Spec-first design analysis

### (a) Operation contract (the new §5.x family for spec 06)

**Name:** `replaceElements` (engine/OT; wire `timeline.replace` → bare `replace` at the C7 r1-END fold). One target per invocation.

**Inputs:**
- `target: string` (element id) — resolved UI-side by the **N15 law** (16:254): primary selection first; else the clip under the playhead on the focused track (fallback: main track); single clip only (multi-select replace = per-element fan-out, one command each, batched per 15 §7).
- `source: { sourceId, sourceStart, sourceEnd }` — the marked in/out on the source media (from the source viewer / pool drag payload; 18 §4.3's mark-in/out halves).
- `options: { linked?: boolean }` — default **false** (see (c)).

**The out-auto-adjust law:** the incoming source's OUT point is *derived*, never honored: given `targetDur = target.durationInFrames`,
```
sourceEnd' = sourceStart + timelineToSourceFrames(targetDur, speed=1, timelineFps, sourceFps)
```
(engine `core/timeline-math.ts:151`, exported and already the shared law of trim/slip/split). The IN point is untouched; the OUT moves so the placed window's duration is exactly `targetDur`.

**The exact-length invariant (the op's postcondition):** `newClip.from == target.from ∧ newClip.durationInFrames == targetDur ∧ ∀ downstream c: (c.from, c.durationInFrames) unchanged ∧ transitions∪clips\{target} ids unchanged`. The mock's ripple-contrast sentence is the negative-space statement of this law; the ghost-same-width grammar is its visual. No gaps, no overlaps, no ripple math — the replacement occupies precisely the vacated span.

**Refusals (honest, before any mutation):** no resolvable target (info toast, mock's own form: "select a clip on a compatible track first"); target's track locked (`TRACK_LOCKED`, the W11 12-command pre-check family); source window unfillable (open question, below); incompatible source kind vs track kind (placement compatibility table, 06 §5.9).

### (b) Algorithm sketch — composing existing primitives vs a dedicated op

The engine already owns the whole neighborhood (all verified live at `3989506`):
- `removeItems(clipIds, {linked})` — `timeline.ts:3757` (public) / `_removeItemsImpl :3764-3780`: linked-expansion (default **true**), clips filtered, **transitions touching any removed id cascade-DROPPED** (`:3775-3777`).
- Source-edit (3-point) family — port of freecut `source-edit-actions.ts`: `performInsertEdit :4702` (split-straddler + push downstream), `performOverwriteEdit :4860` (remove/split overlappers, insert at `overwriteAtFrame`, **no shift**, one `_commit`), helpers `_splitClipPure :4551`, `_buildSourceEditClip :5061`.
- `execute()` with reentrancy guard — `:6041-6053`: nested executes run under the OUTER snapshot (one undo entry); top-level executes each push one entry.
- `_commit` — `:7445-7462`: **prunes orphaned keyframes on every commit** (Wave 4A P0.6).
- Transition id-remap precedents: `remapTransitionsAfterSplit :630-649`; `joinItems`' `replacementByRemovedId :7411-7427` (remaps endpoints off removed clips onto the survivor, drops self-transitions).

**Composition A — `removeItems` + `performInsertEdit`: WRONG.** Insert splits the straddler and pushes downstream — violates the no-move invariant outright.

**Composition B — `removeItems(target, {linked:false})` + `performOverwriteEdit(track, source, target.from, sourceStart, sourceEnd')`:** semantically near-correct (the overwrite region exactly equals the vacated span ⇒ no splits, no trims, no shifts; R1-B4's refuse stance covers locked tracks). **What breaks:**
1. **Undo atomicity (wire level):** two public ops = two `execute()` = two history entries. Undo after step 1 lands an intermediate state (span vacated, nothing placed). The reentrancy guard only merges *nested* calls — a composite *method* gets atomicity for free, two separate commands do not. (The known-family precedent: OT's multi-insert currently costs N entries and the batch verb is the queued fix — 15 §13.15's D29-F8 endorsement.)
2. **Transitions at the target's edges are severed, not re-targeted:** `removeItems` drops any transition whose endpoint is the target (`:3775-3777`) and `performOverwriteEdit` likewise filters transitions referencing removed clips (`:5038-5042`). A cut with a 12-frame dissolve on its right edge becomes a hard cut — while `joinItems` and split already demonstrate the better law (remap the endpoint id to the new clip). This is the single clearest reason replace deserves to be an op, not a batch.
3. **Linked default-true:** the naive `removeItems(target)` silently deletes the A/V companion — exactly the behavior the mode card forbids (see (c)).
4. Keyframes on the target: **no break either way** — `_commit`'s prune sweep removes them automatically; the new clip starts keyframe-clean (correct semantics — animation dies with the outgoing clip).

**Composition C — app-level composite (the shell-variants shape):** what exists today; keeps 2+ history entries and the wrong duration law (above), and 15's insert-overwrite composite lineage shows composites drift from the mock grammar unless the spec pins the law.

**Recommendation — a dedicated engine op `performReplaceEdit`** (spec 06 §5.x; NOT a freecut port — freecut's source-edit file implements insert+overwrite only, per the port comment at `timeline.ts:4513-4515`; this is a corpus-designed op in the freecut style, exactly how the R20 doc framed it):
```
performReplaceEdit(trackId, targetClipId, sourceId, sourceStart, {linked:false})
  → execute('performReplaceEdit', () => {
      validate target (exists, unlocked); targetDur = target.durationInFrames
      sourceEnd' = sourceStart + timelineToSourceFrames(targetDur, …)
      fill check: timelineToSourceFrames-inverse — available = getAvailableSourceFrames(sourceDuration, sourceStart)
        (timeline-math.ts:190); available < targetDur → refuse (open question)
      newClip = _buildSourceEditClip(makeId('clip'), track, sourceId, target.from, targetDur, sourceStart, sourceEnd', fps)
      clips = clips.filter(≠target) + [newClip]                    // no splits — span is exact
      transitions = remap {leftClipId|rightClipId: target → newClip.id}  // joinItems' :7411-7427 pattern
                    (drop self-transitions; none expected — newClip is a stranger to its neighbors' edges only via the remap)
      _commit({…, clips, transitions})                              // keyframe prune rides _commit
    })
```
One `execute` = one undo entry; no linked expansion; transitions preserved by remap (with a documented edge-case: if a transition's *other* endpoint was also the target — impossible, self-transition — drop). Port-scheduled into OT per Decision 12.3 alongside its §10.4 siblings. The mock's `insertPlan.ts` replace branch then becomes the *UI planner* over the same law (ghost.dur = targetDur), fixing the C6 divergence below.

### (c) Linked-companion law (A/V pair)

The mock replaces "a **single** clip"; DaVinci's replace on a linked A/V pair swaps the clip under the pointer and leaves the companion (the link referenced the *old* clip's identity). The trap is the engine default: `removeItems`/`performOverwriteEdit` expand `{linked:true}` and would delete the audio half.

**Recommendation — write it as a law:** `replace` is **single-element by default**: no linked expansion (`linked:false`), the companion keeps position and duration, and the new clip carries **no `linkedGroupId`** — the pair is **severed** by the swap (link re-establishable via `Cmd+Option+L`, 16 §3.4:248, whose row should cross-reference the sever). Rationale: (1) the exact-length invariant is per-track — auto-expanding would demand a second source window and a second length law nobody specified; (2) both the mock ("a single clip") and classic's no-op assume one clip; (3) pair-replace is a genuinely different op (two sources, two tracks) — if ever needed, an explicit `{linked:true}` opt-in / `replacePair`, never a default. State the sever in §5.x's edge-case list so link users aren't surprised.

### (d) Wire verb shape (r1-scheduled; the landed 24+6 census untouched)

Respect 15's C7 law to the letter — this audit modifies no census, adds no verb; it schedules the row:
- **Landing shape (prefixed, now):** `timeline.replace` — `{ type: 'timeline.replace', params: { target: ElementRef, source: { sourceId | element payload, sourceStart, sourceEnd? }, linked?: false } }`; result `data: { insertedClipId, removedClipId, durationInFrames, sourceEnd }` (echo the adjusted OUT — the A9-style honest echo; also the UI's toast source). Errors: `NOT_FOUND` (no target), `TRACK_LOCKED`, `CONFLICT`/`INVALID_PARAMS` (unfillable source window — whichever the §6.3 refinement assigns), `NOOP` never (a replace that changes nothing still minted a new id).
- **C7 fold (r1 END):** bare `replace`, per the 30-name rename pass (§13.15).
- **Census mechanics (the re-declare law, 15 §13.15/D29 F8):** on landing, the tsc-lockstep asserts fail typecheck until the verb is listed in `WIRE_COMMAND_TYPES`, then the M49C coverage gate fails until it is routed or exception-registered — the 24+6 split re-declares **mechanically, no spec amendment**. The landed census stays exactly as-is until then.
- **Union posture:** `replace` is NOT among the 78 §4.1A members — this is a **new union member (78 → 79, union-version bump)**, needing a §4.1A row (home: OT), a §4.3 command section, and a §4.2 manager-method row — the same treatment the family's other modes get in their r1 rows. The R20 C45 row already files the family ask: "06 §5.9 (add an 'edit functions' subsection enumerating the family as composites), 15 §13.15" (insert-modes.md:306).
- **Routing:** one-shot from the SourceEditBar button, F11, and (K3+) the drop-on-clip gesture. Undoable ✅ (§4.2 column).

### (e) Keyboard row (16: DaVinci F11 — free)

**16's F-key block (verified):** the ONLY claimed F-keys are `F1` (contextual help, `:411`), `F2` (focus track under playhead, `:578`), and F6 (shell page, per the yield-set note `:17`). §3.4 "Editing Ops" (`:218-248`, 27 rows) contains **zero F-key rows** — the entire DaVinci source-edit F-family (F9 insert / F10 overwrite / F11 replace / F12 append) is **unclaimed**; no spec-internal conflict exists. (Corroborated by the sibling audit mode-ripple-overwrite.md:64,281-283; corpus citation for the family: insert-modes.md:164-170 + writedirect.co.)

**External hazards — the corpus itself files them:** "F-keys are browser-hostage — **F11 fullscreen**" (insert-modes.md:191); macOS fn-defaults (Mission Control/Show Desktop) swallow F9–F12 without the "standard function keys" setting; bare F11 must `preventDefault` on keydown. `Shift+F10` (the ripple-overwrite family member) is the adjacent browser context-menu hazard — different key, no collision.

**Recommendation:** land **`F11` = Replace** as the DaVinci-parity primary **in the same amendment as the family's F9/F10/F12 rows** (landing F11 alone orphans the family's internal consistency — the decision is family-shaped). One §3.4 row: context "when a clip is selected or under the playhead (N15)", command `{ type: 'replace', params: {…} }`, Notes column carries the two external caveats + required `preventDefault`; a documented modifier fallback for F-key-hostile hosts (e.g. `Cmd+Option+F` — unclaimed; `Option+R` is TAKEN by ripple-mode view flag 18 §4.5/R15-A6, `Cmd+R` by rename-track). Cheat-sheet §7.3 auto-renders; §6.1 gains a row only if a second claimant ever appears (none today). SourceEditBar's own Premiere-grammar `,`/`.` note (insert/overwrite, :191) stays complementary, not conflicting.

### (f) UI affordance (18: replace-mode source-edit surface; ghost overlay grammar)

18 has **no replace surface** (grep 0; its base mock renders none — davinci_resolve_ui_mock.html). But the corpus has already designed it three times over; the spec-first move is to *ratify* the R20 C46/C48 rows into 18 §4.3:

- **Trigger surface:** the **SourceEditBar** — the 7 one-shot edit-function buttons in the SOURCE-preview transport row (`SourceEditBar.tsx`, "the single-viewer adaptation of Resolve's under-source edit overlay"; reviewer rulings #63/#64 pinned the placement; C46 files it as "18 §4.3 v1.2 (source-preview chrome contract)"). ONE-SHOT actions, not a mode radiogroup (no NLE keeps a persistent insert mode). Acts on `sourceMediaId`, never `mediaSelection` (the R19 wrong-asset law). The viewer stays in source mode after commit (repeated edits are the point). This rides 18 §4.3's existing v1.1 fallback source-preview (mark-in/out = the I/O `setLoop` halves — no dedicated in/out model, N12) with the dual-viewer deferral (§8.5) untouched.
- **Ghost overlay grammar (the mock's law, already pinned in two places):** ghost = dashed 2px slot at the **target's exact span** (same width — insert-modes.md:135; `geometry.ghost` in insertPlan), **down arrow only** (`geometry.arrows = { down: true, right: false }`, insertPlan.ts:335 — the no-move signal), overwrite-span shading over the covered region (the overwrite family's shared treatment), and an out-trim chip on the ghost (the mock's source-chip resize + split divider, analogous to fitfill's speed badge — novel but in-grammar).
- **Hover-placement preview (C48):** ≥150ms dwell arms a preview computed by the SAME pure planner as the commit (`planInsertMedia`/`applyInsertPlan` — preview==commit by construction); ok:false previews arm too, swapping the tip to the honest refusal and painting NO geometry; keyboard focus parity; fade+slide motion honored under prefers-reduced-motion. **Replace-specific preview contract: the ghost's width IS the target's width and the displaced list is EMPTY** — that assertion is the mode's visual invariant, and today the mock violates it (the divergence pin, below).
- **K3+ gesture carrier:** OT's parked drop-on-clip plumbing (replace-target resolution + opacity-50 dim, U-8-wired; the SD-5 no-op) becomes the drag gesture — drop-on-clip commits `timeline.replace` with the drop's source payload; the dim already communicates the target.

---

## Gap rows (posture law)

| ID | gap | owner | phase | acceptance |
|---|---|---|---|---|
| G-R1 | **Spec 06: replace family absent** — no §3 inventory row, no §5.x section (contract, out-auto-adjust law, exact-length invariant, no-move invariant, linked sever, refusal table), no "edit functions" subsection (the C45 ask, insert-modes.md:306). Opencut-classic never implemented it; freecut has no `performReplaceEdit` — a corpus-designed op, mock-cited. | S-spec | R25 authoring → r1 landing | §3 row + §5.x section + §10.4 coverage-table row exist; the exact-length + no-move invariants stated as postconditions; edge cases (transitions remap, keyframe death, linked sever, unfillable source) enumerated; mock + insert-modes.md cited |
| G-R2 | **Engine: `performReplaceEdit` absent** — the source-edit family (insert `:4702` / overwrite `:4860`) has no replace sibling; brief's `removeItems:3527` pin stale (live `:3757`). | S-engine | r1 (with G-R1) | op lands (algorithm §b): one `execute` entry; transition endpoint REMAP (joinItems pattern) not cascade-drop; `linked:false` default; `_commit` keyframe-prune verified; refusal paths tested; Tier-1 pins: exact-length, no-move, undo atomicity, transition survival, companion untouched |
| G-R3 | **OT op-port + wire verb `timeline.replace` absent; census silence** — WIRE_COMMAND_TYPES = 30, no replace (live `fdb771c`); OP-COVERAGE.md has NO replace row (silent census omission — the 11/11 claim never counted it); the documented cut is DECISIONS.md:546-548 ("engine-absent or classic-disabled"). | S-ot | r1 (port per Decision 12.3) | OT op + `timeline.replace` verb listed in WIRE_COMMAND_TYPES (tsc-lockstep green) + M49C gate routed (24+6 census re-declares mechanically per the C7 law — landed census untouched until then); one-history-entry law pinned; OP-COVERAGE §1 gains the row (or §5 gains the scope cut if deferred) |
| G-R4 | **Spec 16: no F11 row; whole F9–F12 family unclaimed** (§3.4 `:218-248` zero F-keys; F1/F2/F6 the only claims). F11 external hazards corpus-filed (insert-modes.md:191 "F-keys are browser-hostage — F11 fullscreen"; macOS fn-defaults). | S-spec + S-ot | R25 authoring / r1 landing (family-shaped amendment) | §3.4 `F11` row (N15 context, `{type:'replace'}` command, Notes: preventDefault + macOS caveat + fallback chord); lands WITH the F9/F10/F12 family rows in one amendment; cheat-sheet row; §6.1 unchanged (no claimant) |
| G-R5 | **Spec 18: no replace affordance** — no SourceEditBar / edit-function surface in 18 §4.3; C46/C48 (source-transport chrome + hover-preview contract) are mock-registered, unratified. Ghost grammar (exact-span overlay, down-only arrow) unpinned spec-side. | S-spec + S-app | R25 authoring (ratify C46/C48) / K3 (shell surface) | 18 §4.3 v1.2 carries the one-shot edit-function bar contract (source-preview transport row, one-shot not radiogroup, acts on sourceMediaId) + preview-geometry law (ghost width == target width, arrows down/right=false, refusal paints nothing); SourceEditBar remains the reference implementation |
| G-R6 | **Mock divergence: shell-variants replace implements the wrong law** — insertPlan.ts:311-340 places the source at its OWN duration and trims downstream ("downstream covered too", pinned insertPlan.test.ts:222-241), contradicting its own tip ("one of the exact same length", SourceEditBar.tsx:66), its own reference doc ("exact-length swap", insert-modes.md:135), and the mode card. | S-app (mock owner) | r1-adjacent (with G-R3's consumer) | `plan.ghost.dur == target.duration` + displaced == ∅ pinned; downstream-neighbor trims removed from the replace branch (ripple-overwrite owns that behavior); tip stays truthful; preview==commit test green |
| G-R7 | **OT drop-on-clip replace is a parked no-op** — SD-5 deliberately mirrors classic's "not implemented" (`drag-drop-controller.ts:354-359`) while the hover dim is fully wired (U-8). | S-ot | K3/r1 (after G-R3) | drop-on-clip (compatible kind, unlocked track) commits `timeline.replace`; the no-op guard and its classic-mirroring comment removed; replace-target dim becomes the pre-commit affordance |
| G-R8 | **OPEN DESIGN QUESTION: source can't fill the span** — marked in + targetDur exceeds available source tail (`getAvailableSourceFrames < targetDur`, timeline-math.ts:190). Mock is silent; shell-variants' fitToFill refusal ("refusing rather than silently mis-fitting") is the corpus's stance. Options: (a) honest refusal; (b) auto-extend IN earlier (out fixed — inverts the mock's out-law); (c) place shorter + ripple (violates no-move). **Recommendation: (a) refuse** — preserves both invariants and the honest-refusal lineage; revisit (b) only with live-Resolve verification. | S-spec | R25 decision (blocks G-R1 wording) | the refusal law written into §5.x's table with the error code named; a `CONFLICT`-vs-`INVALID_PARAMS` disposition row queued for 15 §6.3's r1 refinement |

---

## Verdict

**The absence is REAL and total on every production surface, and it is a *design* absence, not a port debt.** Zero true hits across all six specs (every raw match is a selection-mode enum, a `String.replace`, or prose); zero engine ops (the source-edit family ports freecut's insert+overwrite only, and freecut itself has no replace); zero OT ops/wire/UI-commits (WIRE_COMMAND_TYPES = 30 names live; the union's 78 members don't even contain `replace` — unlike roll/slip/slide, which exist engine-side and await only the port); zero app/nle-ui/shell-mini surface; OP-COVERAGE.md contains **no replace row at all** — a silent census omission, with the real disposition chain being DECISIONS.md:546-548 ("engine-absent or classic-disabled") + classic's own deliberately-disabled drag-replace no-op, which OT faithfully mirrors. The one replace that exists anywhere — shell-variants' `insertPlan` — implements *remove+overwrite-at-own-length* while its own button tip, its own R20 reference doc, and the mode card all promise the exact-length swap: the corpus specified the law three times and implemented it zero times. The mode is nonetheless the best-specified gap in the fleet: the mock pins the semantics (exact-length, out-auto-adjust, no-move), the R20 doc pins the grammar (ghost = target's width, down-arrow-only) and the composable-seam analysis, and the engine already exports every primitive the op needs (`timelineToSourceFrames`, `_buildSourceEditClip`, the join-remap transition pattern, `_commit`'s keyframe prune, `execute`'s atomicity). The recommended shape is a dedicated one-commit `performReplaceEdit` with transition *remap* (not cascade-drop) and `linked:false` default (companion severed, not deleted), ported into OT per Decision 12.3, riding the C7 re-declare law mechanically at r1 with the 24+6 census untouched until then; F11 is free in 16 and should land with the whole F9–F12 family in one amendment (the F-key hazards are corpus-filed); the 18 affordance is a ratification of the already-built SourceEditBar + C48 preview contract, whose replace-specific acceptance is one assertion: **ghost width == target width, displaced == ∅**. One open question (unfillable source) needs a written refusal law — recommendation: refuse. Register: 8 gap rows, owners assigned, r1-shaped.

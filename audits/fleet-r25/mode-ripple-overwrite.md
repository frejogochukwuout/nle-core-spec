# MODE AUDIT — RIPPLE OVERWRITE (fleet R25, DaVinci edit-mode family)

Auditor: ripple-overwrite mode subagent. Date: R25 fleet round. Corpus read-only; no commits; no repo
modifications (this file is the only artifact).

Pins used (the R24/R25 fleet baselines): OT @ `ded43c4` (code tip `c15a629`), nle-engine @ `5036387`,
nle-ui @ `fc4cc35`, nle-test-app @ `c885ece`, mock = `ui-mock/timeline_edit_modes (2).html` +
`ui-mock/shell-variants` (R20 wave).

---

## 1. MODE CARD (verified against the mock — refined)

Source: `ui-mock/timeline_edit_modes (2).html`, tab `ripple` (:407), panel `view-ripple` (:612-662),
CSS `:320-332`, description verbatim (:627-632):

> "Ripple overwrite replaces a shot of one length with a shot of a different length. Longer clips replace
> the clip in the timeline and push everything down to make room, while shorter clips pull things in so
> there are no gaps."

Geometry decode (base clip widths: `.clip.turtle` 105px :191-193 — the TARGET; `.clip.sunset`/`.clip-ghost`
175px :208-218/:221-229 — the SOURCE):

| Element | Position | Reading |
|---|---|---|
| desert (upstream) | −5 (unchanged) | upstream untouched |
| turtle (target) | 155 | the clip being replaced |
| clip-ghost | 155, width **175 ≠ 105**, z-8 | ghost AT the target's start, **the SOURCE's width — the asymmetric-length tell** (replace's ghost is re-widthed EQUAL, :286/:305; overwrite's ghost overhangs with downstream unmoved, :279-281) |
| surf (downstream) | 260 → **335** | pushed right by delta (+70, + the mock's 5px display-gap convention) |
| down-arrow | 234.5 | clip enters the track (family grammar) |
| right-arrow | (306, 187), `display:block` | **push direction — shown ONLY for insert (:249-252) and ripple (:327-332)** of all six modes: "only when downstream clips move" (r20 insert-modes.md §1.3 pin) |

**Mode card (audited canonical form):**

- **Inputs:** a TARGET clip (or a marked span / multi-clip selection — see §4 edge cases) on one track, and
  a SOURCE with marked In/Out (the source's marked duration STANDS — no out-adjustment; that is REPLACE's
  law, not this one's).
- **Law:** the target span [t.start, t.start+oldDur) is fully vacated; the source lands at `t.start` with
  its own duration `newDur`; **delta = newDur − oldDur** is applied to every downstream element
  (`startTime ≥ t.end`, plus transition-neighbor special-casing per the engine's ripple machinery):
  delta > 0 → PUSH right (make room); delta < 0 → PULL left (close the gap — the pull law: **no gap is left
  at the OUT boundary**: `downstream.start + delta == source.end` by construction, since
  `downstream.start = t.end = t.start + oldDur` and `source.end = t.start + newDur`).
- Upstream untouched; total timeline length changes by delta; ONE atomic undo; keyframes/grading on the
  target die with it; the source arrives clean.
- **Visual grammar:** dashed ghost at the target's start with the SOURCE's width (width ≠ target width is
  the semantic tell), down-arrow at the ghost, right-arrow at the downstream zone iff delta ≠ 0 (inverted —
  left-pointing — for the pull; the reference mock depicts ONLY the push case; the pull rendering is a
  stated inference, not mock-pinned).
- **Not this mode (the discrimination set):** ripple-DELETE (no source, closes a gap only); plain
  OVERWRITE (downstream unmoved, covered content dies, total preserved); REPLACE (equal-length swap, source
  OUT adjusted to fit); ripple-TRIM (duration change of a resident clip, no source).

---

## 2. ABSENCE VERIFICATION

`grep -i 'ripple[-_ ]?overwrite|overwrite[-_ ]?ripple|rippleOverwrite'` across the corpus:

| Surface | Hit count | Evidence |
|---|---|---|
| **06-nle-ops.md** | **0** | ripple appears 188× (family: §5.4 ripple machinery, §5.8 ripple-delete :1421, §5.9 ripple-insert :1509, §11.3 "ripple is a flag" :2490, §12 the diff quote :2544-2967) — no ripple-overwrite row, no replace row, no edit-functions subsection. §10.4's table (:2408) maps "§5.9 Insert / Overwrite" to engine `performInsertEdit :4702` / `performOverwriteEdit :4860` — the overwrite coverage is a code pointer, not a spec'd op. |
| **15-wire-protocol.md** | **0** | `ripple` params exist on Delete (:715-719), Insert (:749-752, wire-need only), RateStretch (:836-837), Retime (:865-866), FreezeFrame (:897-899), RangeRemoval (:925-926), Trim (:490), plus the `RippleCommand` meta (:580-607) — **no Replace/Overwrite command exists in the 78-member union**; "replace" appears only as selection-mode enums (:1486-:4075). |
| **16-keyboard-shortcuts.md** | **0** | no ripple-overwrite row; **no F9/F10/F11/F12 rows at all** (the only claimed F-keys are F1 contextual help :411 and F2 focus-track :578) — the whole DaVinci source-edit key family is unclaimed. |
| **18-ui-shell.md** | **0** | ripple = tool `R` (:198) + mode `⌥R` (:204) + clip-menu ripple-delete `⇧⌫` (:222); no source-edit-mode cluster, no ghost grammar. |
| **00-master-spec.md** | **0** | ripple only as op-family naming + the ripple-diff adoption (:126). |
| **05-timeline.md** | **0** | ripple = tool/mode/rippleDelete/`⌥[`/`⌥]` rows; the "Overwrite edit (source→timeline) = `.` FreeCut only" row (:1497) is a cross-app parity note for PLAIN overwrite. |
| **opencut-timeline (OT)** | **0** | `src/lib/timeline/ripple/index.ts` verified where 06 §12 says (:16 `rippleShiftElements` / :40 `applyRippleAdjustments` / :121 `computeRippleAdjustments`, 396 LOC); consumed at exactly ONE site — `ops/timeline-core.ts:1264-1268` inside `rippleDeleteElements` (:1242). Wire: `timeline.rippleDelete` (api.ts:72/:195/:1012-1027); `timeline.insert` (api.ts:43-50) has NO ripple param and is **reject-not-shift** placement; `timeline.move` (api.ts:52-54) takes absolute `newStartTime` per element. No path shifts downstream by an arbitrary delta. |
| **nle-engine** | **0** | `performOverwriteEdit :4860` (read in full :4855-5051) — **no ripple variant, no downstream shift** (coverage/split/remove algorithm only; linked-companion removal :4998-5017; transition drop :5038-5042; ONE `_commit`). `performInsertEdit :4702` pushes by the FULL source duration (:4776-4802) — insert law, not delta law. `rippleTrimItem :2839` HAS the signed downstream-shift machinery (push AND pull, :2891-2951) + both sync-lock propagations (`_propagateRemovedInterval` :3475, `_propagateInsertedGap` :3534) — but all private/coupled. headless/api.ts: no edit verbs at all. |
| **nle-test-app** | **0** | only `timeline.rippleDelete` routing (engineService.ts:409, use-timeline-actions.ts:151, wire-coverage.test.tsx:131-155). |
| **nle-ui** | **0** | zero grep matches (production shell has no source-edit bar, no mode grammar). |
| **ui-mock/shell-mini** | **0** | zero. |
| **ui-mock/shell-variants** | **≠0 — the one implementation, and it diverges (see below)** | `insertPlan.ts :44/:191/:469-484` (planner), `useUiStore.ts insertMediaAt` (one undo entry), `editModeIcons.tsx :108-110` (verbatim reference icon), `SourceEditBar.tsx :68` (button), tests insertPlan.test.ts :177-220 + useUiStore.test.ts :2048-2058; design doc `docs/r20/insert-modes.md :65-73/:109-111/:290/:299/:306` (C45). |
| **fleet-r25 scouts** | 4× "ABSENT" | scout-app :95/:98/:125, scout-nle-ui :43, scout-ot :51/:54, scout-engine :46/:50/:74. |

**False-positive / near-miss classification (why the neighbors are NOT this mode):**

1. **ripple-delete** (OT verb + engine `rippleDelete :3574`/`rippleDeleteItems :3606`): no source, pull-only,
   gap-closing. Adjacent, not the mode.
2. **plain overwrite** (engine `performOverwriteEdit :4860`; OT has NO overwrite verb at all — 15 §13.15 lists
   it absent): downstream unmoved; covered content dies; total length preserved. The mock's overwrite view
   (:279-281) pins the no-shift grammar.
3. **`InsertCommand.ripple` / "Ripple insert"** (15 §4.3.9 :749-752; 06 §5.9 :1509): push by the FULL inserted
   duration — a different law than ripple-overwrite's delta-shift (see §3.4). Also phantom: unsupported by
   the quoted §12 diff and unimplemented in OT (grep: no `isRippleEnabled` in OT).
4. **`RippleCommand` meta** (15 §4.3.4): wraps an inner command with the diff — pull-only (see §3.2).
5. **`rippleTrimItem`** (engine :2839): trims a RESIDENT clip's edge and shifts by the duration delta — the
   closest delta-law machinery in the corpus, but no source replacement; the reusable shift primitive it
   contains is not exposed.
6. **rateStretch/retime `ripple` params** (15 §4.3.11/:836, §4.3.12/:865): the delta law verbatim ("ripple
   downstream elements if newDuration differs from current") — but for a duration change of a resident
   element, not a replacement.
7. **shell-variants `rippleOverwrite`**: the only true-name hit — classified below (§2.1).
8. **Lexical**: engine headless `gpu-ripple-glass` (:1512) — a GPU effect name, nothing to do with ripple.

**2.1 The mock divergence (the audit's honesty finding).** `insertPlan.ts`'s rippleOverwrite is a
**span-form, push-only approximation**, not the mode card's clip-form:

- Span-form: the replace span = `[drop, drop+newDur)` (the incoming's own duration), and
  `planOverwriteSpans` (:192-255) splits/trims/removes whatever the span covers (FreeCut/engine overwrite
  algorithm), returning displaced CONTENT seconds; then `delta = dur − displaced` shifts later content
  (:472-484, clamped `Math.max(time+dur, …)`).
- Because displaced ≤ dur **by construction** (content inside the span cannot exceed the span),
  **delta ≥ 0 always — the pull is unreachable**. A shorter source simply head-trims the target and leaves
  a remnant (plain-overwrite behavior), violating "the target clip is fully replaced" and "shorter clips
  pull things in so there are no gaps" (the reference mock's own headline).
- The tests pin only delta-0 (:177-199, :2048-2058 — the :2048 title "closes the gap when the displaced span
  exceeds the insert" asserts delta **0** in the body; stale title) and the push case (:201-220, a
  pre-existing-gap fixture where B pushes 14 → 24.8 preserving its 12s gap). No pull test exists, no
  full-replacement test exists.

**Absence verdict:** CONFIRMED — zero hits on every SPEC surface and every PRODUCTION surface; the single
corpus implementation is a mock-real composite in `ui-mock/shell-variants` whose semantics diverge from the
mode card (span-form, push-only). The DaVinci semantics — clip-form full replacement + signed delta shift —
exist NOWHERE in the corpus.

---

## 3. COMPOSITION ANALYSIS (the core value)

Question: is ripple-overwrite = a composition of spec'd primitives, and does "overwrite + the ripple flag
ON" (06 §11.3 "Ripple is a flag, not a command") reproduce DaVinci?

### 3.1 Worked example (canonical single target)

Track: A=[100,205] (target, 105), B=[205,360], C=[360,515]. Source S, `newDur` = 175 (push) / 75 (pull).

- PUSH desired: S=[100,275], B=[275,430], C=[430,585].
- PULL desired: S=[100,175], B=[175,330], C=[330,485].

### 3.2 The classic ripple/diff trace (06 §12 = OT `ripple/index.ts`, verified identical)

The diff computes per track: **vacated** = spans of before-elements that vanished (not moved across tracks)
+ right-trim tails of shrunk survivors; **joined** = spans of new after-elements (exempt from shift);
**freed = vacated − joined** (interval subtraction); each freed interval emits
`{afterTime: interval.end, shiftAmount: interval.end − interval.start}` and `rippleShiftElements`
**subtracts** shiftAmount from every `startTime ≥ afterTime` — LEFT shifts only, and `buildAdjustments`
skips `shiftAmount ≤ 0`. There is no "infringement" concept: a joined interval extending BEYOND a vacated
interval generates no adjustment.

- **PULL trace** (delete A, insert S=[100,175] — a legal intermediate state: gap [175,205], no overlaps):
  vacated=[100,205], joined=[100,175], **freed=[175,205]** → adjustment {afterTime:205, shiftAmount:30}
  → B=[175,330], C=[330,485]. **This is exactly DaVinci's pull — no gap, total −30.** The joined-interval
  subtraction is the pull-in mechanism, and it is already PINNED by OT's own M6 test
  "joined interval subtracts from vacated interval" (milestones-core.ts:699-714: vacated [0,2), joined
  [0,1) → freed [1,2) → shift 1s). **The diff produces the pull-in for a shorter replacement — YES.**
- **PUSH trace** (delete A, insert S=[100,275]): the intermediate state is ILLEGAL on any spec'd insert
  (S overlaps B; placement is **REJECTED, NOT SHIFTED** — 05 :853, the OT placement law) — the composite
  cannot even be issued. Hypothetically (overlap-exempt insert): vacated=[100,205], joined=[100,275],
  **freed = ∅** (joined ⊇ vacated) → no adjustment → B, C never move → S permanently overlaps B.
  **The diff produces NO push — structurally.** `rippleShiftElements` itself is sign-capable
  (`startTime − shiftAmount` with negative shiftAmount = right shift) but the diff never feeds it a
  negative amount, and nothing in the corpus calls it with one.

**Answer to the §11.3 question:** ripple-overwrite = overwrite + ripple-flag is ** HALF-true in our model**.
The flag/diff is a gap-CLOSER (pull) and has no room-OPENER (push). The flag family's other members are
similarly one-sided: `delete{ripple}` = pull by removed; `insert{ripple}` = push by inserted (full duration);
`trim/rateStretch/retime{ripple}` = shift by duration delta. Ripple-overwrite's law is the TRIM family's
delta law applied to a REPLACEMENT — which no current flag carrier expresses.

### 3.3 The honest composition: BatchCommand([delete, move, insert])

Expressible TODAY over spec'd + live primitives (OT's 24 routed verbs, one `applyBatch` = one history
entry — 15 §7, 06 §4.3):

```
applyBatch("Ripple overwrite <source> → <target>", [
  { type: 'delete',  params: { elements: [target (+ linked companions)], ripple: false } },
  { type: 'move',    params: { moves: downstream.map(e => ({ ...ref(e), newStartTime: e.startTime + delta })) } },
  { type: 'insert',  params: { element: sourceSpec, startTimeTicks: target.start, strategy: 'explicit', trackId } },
])
```

- **Order law:** delete → move → insert. Each intermediate state is overlap-free (the move clears the
  landing zone for the push; the pull's insert-into-open-gap is also clean), so the §5.9 Round-8
  intra-batch overlap guard PASSES. Insert must be LAST for the push case (reject-not-shift placement).
- **delta law:** `delta = newDur − spanDur` where spanDur = the replaced span (single target: oldDur).
  The no-gap invariant `downstream.start + delta == source.end` holds by arithmetic (§1).
- **Wire reality check:** `timeline.move` takes ABSOLUTE `newStartTime` per element (PlannedElementMove,
  group-move.ts:75-80) — the client computes the delta and the downstream set; there is no
  `shiftDownstream(trackId, afterTime, delta)` verb. The r20 doc's proposed composite
  "rippleOverwrite → rippleDelete + insert" (insert-modes.md :290/:299) is **broken in both directions in
  the OT world**: `rippleDelete` closes the gap FIRST (pull-left immediately), so the subsequent insert at
  `target.start` collides with the pulled-in downstream (CONFLICT) for ANY source length; and a longer
  source was already impossible (reject-not-shift). The honest composite is **delete + move + insert**
  (3 verbs), or a dedicated verb (§4.3). This is a refinement of C45's mapping.

### 3.4 Preservation analysis of the composition

| Concern | Composition behavior | Correct per mode card? |
|---|---|---|
| Transitions at target's edges | The target's `transitionOut` dies with it (delete). The IN-side transition (upstream→target) also dies in the engine's model (transitions reference `leftClipId`/`rightClipId`; dropping one endpoint drops the transition — engine :5038-5042); in OT's S3 element-owned model the upstream's `transitionOut` survives as data but the boundary it described is gone. **Recommended family law: BOTH edge transitions die; the source lands clean; the moved downstream forms a hard cut at the OUT side** (the OUT boundary moved — its transition cannot survive geometrically; matches the engine's drop law and the conservative reading). DaVinci note: ripple overwrite does not transfer the old transitions to the new edges. |
| Linked companions | Join the delete set (the engine's `performOverwriteEdit` already does exactly this, :4998-5017) + the companion track's downstream joins the move set at the same delta; sync-locked tracks get interval/gap propagation — BOTH halves exist engine-side (`_propagateRemovedIntervalToSyncLockedTracks` :3475, `_propagateInsertedGapToSyncLockedTracks` :3534; FreeCut's sync-lock-ripple.ts:389-469 has both per 06 §6). | ✓ |
| Keyframes on the target | Die with the element (delete removes the element + its keyframes). | ✓ correct — full replacement |
| Keyframes/markers on shifted downstream | `move`/patch changes only `startTime` — relative offsets preserved. | ✓ |
| Undo atomicity | ONE history entry: `applyBatch` (OT), `BatchCommand` (06 §4.3 / 15 §7), ONE `_commit` (engine), one store history entry (mock). | ✓ |
| No-gap invariant on pull | delta = newDur − oldDur exactly ⇒ `B.start + delta = S.end` — no residue; pre-existing gaps elsewhere are preserved verbatim (shifted along — the law scopes to the OUT boundary of the edit). The mock's `Math.max(time+dur, …)` clamp guards the degenerate multi-span forms. | ✓ |
| Zero-anchor / negative starts | The OT diff's `rippleShiftElements` has NO floor; the engine's shift does (`Math.max(0, from+delta)` :2947). A pull at track start must floor at 0 (or refuse). State it in the contract. | needs a law |

**Composition verdict:** ripple-overwrite IS composable from spec'd primitives — but NOT as the flag
composition (§3.2 shows the push half is structurally absent), and NOT as the r20 doc's rippleDelete+insert
(overlap-rejected). The 3-verb delete+move+insert composite is expressible today, is atomic, and preserves
every invariant the mode card demands. The engine ALREADY contains the full algorithm as private machinery
(`rippleTrimItem`'s signed deltas map :2925-2950, the transition-neighbor inclusion :2930-2933, both sync-lock
propagations) and the overwrite half as a public method (`performOverwriteEdit`) — a
`performRippleOverwriteEdit` is a small, well-precedented composition of two existing engine paths.

### 3.5 Spec-side phantom rows found during the trace (correct in the family pass)

- 06 §5.9 :1509 ("Ripple insert: … the diff-based ripple will … shift everything to its right by
  `element.duration` to make room") — **unsupported by the quoted §12 algorithm** (a pure insert vacates
  nothing → freed = ∅ → no adjustment) and unimplemented in OT (no `isRippleEnabled`; the ripple lib is
  consumed only by rippleDelete). The ripple-insert push is real in the ENGINE (`performInsertEdit` phase 2)
  but not in the classic diff the spec adopts.
- 06 test battery :3120 `ripple-insert-makes-room` — same phantom (diff cannot produce it).
- 06 test battery :3175 `insert-overwrite-vs-ripple` — references `placement: 'overwrite' | 'ripple'`
  values that exist in NO placement union (5 strategies: explicit/firstAvailable/preferIndex/aboveSource/
  alwaysNew — 06 §5.9 :1486-1495; OT wire exposes 2). The row names a seam that was never spec'd.

---

## 4. SPEC-FIRST DESIGN ANALYSIS

### 4.1 Family contract (the ripple-overwrite rows for 06 §5.9's edit-functions subsection)

**Inputs:** `target: ElementRef[]` (one clip; or a multi-clip selection / an In-Out range — see edge cases)
+ `source: ElementSpec` with marked `trimStart/trimEnd` (marked In/Out; the source duration
`newDur = trimEnd − trimStart` STANDS — no out-adjustment).

**Laws:**

1. **Replacement law:** every clip fully inside the target span is removed; straddlers at span edges are
   SPLIT at the span boundary (the F1-style trajectory guard) and only the inside piece is removed; the
   source lands at `span.start` with duration `newDur`.
2. **Delta law:** `delta = newDur − spanDur`; every element with `startTime ≥ span.end` on the target
   track (plus transition-right-neighbors of removed clips, per the engine's rippleTrimItem precedent) shifts
   by delta; floor at 0 (refuse if a floor would be hit — the honest refusal). Linked companions of removed
   clips are removed with them; sync-locked tracks propagate (removed-interval on pull, inserted-gap on push
   — both spec'd in 06 §6).
3. **Pull law (no gaps):** on delta < 0 the OUT boundary closes exactly — `firstDownstream.start + delta ==
   source.end`; no gap is introduced by the edit. Pre-existing gaps are preserved as absolute lengths.
4. **Atomicity:** ONE undo entry (BatchCommand/applyBatch); the trajectory delete→move→insert passes the
   intra-batch overlap guard.
5. **Edge cases:**
   - `newDur` ≤ 0 (empty mark) → honest refusal `INVALID_PARAMS` (the wire's insert guard already rejects
     non-positive durations). No minimum-duration special case beyond the existing > 0 law (the source's
     own duration stands; a 1-frame source is legal and pulls hard).
   - **Multi-target span** (DaVinci's behavior): a multi-clip selection replaces the WHOLE span
     [first.start, last.end] with the ONE source; `spanDur = last.end − first.start`; delta and the shift
     law unchanged; straddlers (only possible in range-form) split at span boundaries. Selection-form
     (whole clips) needs no splits.
   - `delta == 0`: degenerates to a same-length replacement (the mock pins "delta 0 → no shift" —
     insertPlan.test.ts :177) — distinct from REPLACE (which adjusts the source OUT to force equality).
   - Locked target track / no unlocked compatible lane → refusal (TRACK_LOCKED / the no-unlocked-lane law,
     mock P1).
   - Target at track head with pull → the zero-anchor floor (above).

### 4.2 The wire-verb question (respect the census law)

- **At crawl (K3, available TODAY):** batch-composition-only — the 3-verb composite over the 24 routed
  verbs (`delete`, `move`, `insert` all routed; `applyBatch` atomic). No spec change needed beyond
  documenting the composite (06 §5.9 + the app-side composer). This satisfies the D24 compose-at-crawl law
  (the mini's cutHead/cutTail precedent).
- **At r1 (the verb decision):** per the census law (15 §4.1A/§13.15, D29 F8): any new verb re-declares
  mechanically (tsc-lockstep + the M49C coverage gate) as an r1-adjacent C7-worklist row. Options:
  (a) a dedicated `timeline.rippleOverwrite` verb; (b) **extend `InsertCommand` with a replace/overwrite
  placement carrying `target: ElementRef` + the ripple flag whose law is DELTA-shift** — recommended: the
  C7 fold at r1 END already owes InsertCommand the full PlacementStrategy + `ripple` + `idSeed` alignment
  (15 §13.15 row §4.3.9), the whole source-edit family (overwrite/replace/append/rippleOverwrite/fitToFill)
  shares this one seam, and 06's own phantom test row (`insert-overwrite-vs-ripple`, :3175) already dreamed
  the placement split. **Critical law-split to state in the row:** `insert{ripple}` = push by the FULL
  inserted duration; `ripple-overwrite{ripple}` = shift by delta — one boolean cannot mean both; the
  replace-placement's ripple param must be documented with the delta law (the rateStretch/retime wording at
  15 :836/:865 is the right template).
- The engine's `performInsertEdit`/`performOverwriteEdit` family is **port-scheduled INTO OT at r1** (06
  §10.4, Decision 12.3 — "insert-edit-3-point" named in the port list) — the ripple-overwrite method rides
  that same wave as `performRippleOverwriteEdit` (or the generalized signed-shift op the family needs).

### 4.3 The keyboard row (16)

DaVinci binds ripple overwrite to **Shift+F10** (the corpus itself cites it: insert-modes.md :169-170,
writedirect.co source; the family: F9 insert / F10 overwrite / F11 replace / F12 append). **Spec 16's
status: the entire F9-F12 block is unclaimed** (grep zero; only F1 help :411 and F2 focus-track :578 are
taken) — the family can land intact with zero conflicts. Posture: the row lands WITH the verb (r1), not
before; at crawl the affordance is the SourceEditBar button (no key). **Web-shell hazard to note in the
row:** Shift+F10 fires the browser CONTEXT MENU event on Windows/Linux — the binding must
`preventDefault()` on keydown + contextmenu, or the web shell adopts a chord (e.g. the family convention
`⇧`+mode-key once one exists). The variants mock already binds the family's plain rows `,`/`.` (source-mode
insert/overwrite, R20-W2 C46) — a `⇧.`-style sibling is the mock-native alternative.

### 4.4 The UI affordance (18 §4.3 + the C46/C48 grammar)

The mock grammar is fully pinned and already adopted mock-side:

- **Ghost:** dashed outline AT the target's start with the SOURCE's width (`border: 2px dashed #646464`,
  .clip-ghost :221-229) — width ≠ target width is THE tell (vs replace's equal-width ghost, vs overwrite's
  overhang). Pull case: ghost narrower than target + the right-arrow INVERTED (left-pointing) — stated
  inference (the reference depicts only the push case).
- **Arrows:** down-arrow at ghost center-x (family grammar); right-arrow (the verbatim 28×16 path, fill
  `var(--accent)`) at the downstream zone — the r20 grammar law: shown ONLY when downstream clips move
  (insert + ripple) — for ripple-overwrite: iff delta ≠ 0.
- **Chrome:** the SourceEditBar one-shot button (SourceEditBar.tsx :68 — tip "Replaces a shot of a
  different length — pushes down or pulls in so there are no gaps") + the verbatim 44px reference icon
  (editModeIcons.tsx :108-110) + the hover-preview plan (insertPlan ghost/displaced/overwriteSpans — C48;
  preview == commit, the honesty pin). nle-ui (production) has none of this; adoption posture = the C46/C48
  rows' wave.

---

## 5. GAP ROWS (posture law)

| # | Row | Owner / phase | Acceptance |
|---|---|---|---|
| G-RO-1 | **06 §5.9 "edit functions" subsection** (C45's recommendation made concrete): enumerate the source-edit family as composites with per-mode laws; add the ripple-overwrite rows (§4.1 above: replacement/delta/pull laws, multi-span, atomicity); CORRECT the phantom rows (§5.9 :1509 ripple-insert overstated; :3120/:3175 reference non-existent placement values / unsupported push). | S-ot spec round (this fleet) | the subsection exists; phantom rows fixed; the composite table maps each mode to its verb-batch |
| G-RO-2 | **15 §13.15 row**: ripple-overwrite — batch-composition legal NOW (delete+move+insert over the 24 routed verbs, applyBatch atomic — NOT the r20 doc's rippleDelete+insert, which is overlap-rejected both directions); verb decision r1-adjacent (C7 worklist grows per D29 F8): InsertCommand replace-placement with the DELTA-law ripple param (the law-split vs insert{ripple}'s full-duration push stated in the row), or a dedicated verb. | S-ot, r1 | the §13.15 row flips ALIGNED when the verb lands; tsc-lockstep + M49C re-declare mechanically |
| G-RO-3 | **16 row `Shift+F10`** (+ the F9-F12 family block posture): free today; lands with the verb; the browser contextmenu hazard (preventDefault) stated in the row. | S-ot, r1 (with G-RO-2) | the binding row + cheat-sheet entry + the conflict table cites the preventDefault law |
| G-RO-4 | **18 §4.3**: the source-edit-mode cluster affordance rows (C46/C48 + this mode's ghost/arrow grammar: source-width ghost at target start, right-arrow iff delta ≠ 0, inverted on pull). | S-ot spec round / nle-ui adoption wave | the ghost/arrow grammar lands in 18's preview-geometry contract |
| G-RO-5 | **Mock alignment**: `insertPlan.ts`'s rippleOverwrite is span-form/push-only (delta = dur − displaced ≥ 0 by construction; pull unreachable; head-trim remnants violate full-replacement) — align the planner to the clip-form mode card (target-span form, signed delta) or document the divergence as an explicit mock simplification; fix the stale test title (useUiStore.test.ts :2048 asserts delta 0). | S-mock (shell-variants), crawl | a pull-case test exists and passes (shorter source → full replacement + left shift + no gap) |
| G-RO-6 | **Engine exposure**: the signed downstream-shift machinery (rippleTrimItem :2925-2950 + both sync-lock propagations :3475/:3534) is private; the r1 insert-edit-3-point port (Decision 12.3) should land `rippleOverwrite` (or the generalized shift op) as a pure OT-side function — the engine's composite precedent (`performOverwriteEdit` + the shift) is the algorithm source. | S-engine/S-ot, r1 | ported op + carried engine tests green in OT; 06 §10.5 row flips |

---

## 6. VERDICT

**CONFIRMED GAP** — the fourth of the four corpus-wide mode gaps, with one honesty refinement: the absence
holds on every spec surface (06/15/16/18/05/00: zero ripple+overwrite rows; no Replace/Overwrite command in
the 78-member union; F9-F12 fully unclaimed) and every production surface (OT ops+wire: the ripple lib is
consumed by rippleDelete ONLY, insert is reject-not-shift with no ripple param, no arbitrary-delta shift
path; engine: `performOverwriteEdit` has no ripple variant and its shift machinery is private; nle-ui and
nle-test-app: zero). The single true-name hit is `ui-mock/shell-variants`' mock-real composite, which
**diverges from the mode card** (span-form, push-only, pull unreachable) — so the DaVinci semantics are
absent even there.

**Composability:** HALF-native. The pull half is *exactly* the classic ripple/diff (vacated − joined = the
tail gap; proven by trace and pinned by OT's own M6 joined-interval test); the push half is **structurally
absent** from the diff (left-only shifts, no infringement concept, and reject-not-shift placement blocks the
intermediate state), so "overwrite + the §11.3 ripple flag" does NOT yield DaVinci semantics. The honest
composition is **delete + move + insert** (3 routed verbs, one history entry, guard-passing trajectory),
available TODAY at crawl; the r1 verb decision (InsertCommand replace-placement with the delta-law ripple
flag, recommended) rides the already-scheduled insert-edit-3-point port. Every piece of machinery the mode
needs exists somewhere in the corpus — the engine holds the signed shift and both sync-lock propagations,
OT holds the pure interval lib, the mock holds the grammar — the mode is a composition contract, not a
research problem.

Recommended next actions, in order: (1) G-RO-1 (the 06 §5.9 family contract — this fleet's spec round);
(2) G-RO-5 (align the mock to the mode card, adding the pull test — the cheapest executable proof of the
composite); (3) G-RO-2/3/4 as the r1 wave's rows; (4) G-RO-6 with the Decision-12.3 port.

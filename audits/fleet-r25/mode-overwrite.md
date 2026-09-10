# Mode audit — OVERWRITE EDIT — Fleet R25 (DaVinci edit-mode fleet)

Auditor: OVERWRITE EDIT mode auditor (read-only; all repos left untouched). Date: 2026-09-09.
Repos under audit: nle-engine @ `3989506` (timeline.ts untouched since the R24 pin `5036387` — every cite below re-read live at this audit), opencut-timeline @ `fdb771c` (code pin `c15a629` unchanged), nle-test-app, nle-ui, ui-mock/shell-mini + shell-variants, specs 00/05/06/07/15/16/18.

---

## 1. Mode card (verified, then refined)

Source mock: `ui-mock/timeline_edit_modes (2).html` `#view-overwrite`.

| Field | Value | Evidence |
|---|---|---|
| Name | Overwrite (tab "Overwrite Edit") | html:404, :472 |
| Copy | "The overwrite edit is one of the most common types of edits. When you perform an overwrite, it will place a new clip on the timeline at the location of the playhead, writing over whatever clip or clips were there before." | html:475-480 |
| Placement span | [playhead, playhead + source duration) — ghost 175px wide at the playhead x=155 → [155, 330) | html:278-279 (`.view-overwrite .clip-ghost { left: 155px; z-index: 8 }`), base ghost w=175 :221-229 |
| Coverage geometry | Turtle [155,260) fully covered; Surf [260,415) partially covered (left 70px under ghost, 85px remnant extends past ghost end); Desert [-5,155) untouched (half-open interval) | html:280-281 (turtle 155, surf 260), base widths :191-205 |
| Visual grammar | GHOST overlaying the covered span (z-8, above the z-5 record clips, below the z-10 source clip) + DOWN-ARROW centered on the ghost (234.5+8 = 242.5 = ghost center) — **NO push arrow** (`.view-overwrite .right-arrow { display: none }`) | html:279, :282-283, :502-504 |
| Contrast with insert | Insert: same ghost at playhead but followers PUSHED (turtle 155→335, surf 260→445) + right-arrow shown at the ghost end (330); Overwrite: followers NOT moved, no right-arrow | html:264-275 vs :277-283 |
| Header icon | Two overlapping rectangles (back gray, front white) + a down arrow — "writing over" glyph | html:467-471 |
| After-state | **NOT drawn.** The mock renders only the pre-commit overlay: turtle is still visible *underneath* the ghost; surf is never visually trimmed. The removal/trim law is text ("writing over") + DaVinci convention, not a drawn state | html:491-495 (all four clips still rendered) |

**Refinements to the extraction card (two):**

1. *"overwrite ignores clip boundaries (unlike insert which respects them via split+push)"* is imprecise. **Insert also splits mid-clip** — at the playhead, once (its own description: "If the playhead is in the middle of a clip, it will split the clip", html:427-430). The real contrast: **insert splits ONCE at the playhead and PUSHES everything at/after it right by the source duration; overwrite splits at BOTH span edges and REMOVES the covered middle (fully-covered clips wholesale) — nothing downstream moves.** Cover-not-push, not boundary-respect.
2. *"fully-covered clips are REMOVED, partially-covered clips TRIMMED (left/right remnants survive)"* is a correct reading of the intended semantics (and matches both implementations below) but must be flagged as **inferred, not drawn** — the static mock never renders the post-commit state.

---

## 2. Spec sweep (every row governing overwrite)

| file:line | Quote / content | Verdict |
|---|---|---|
| `06-nle-ops.md:1430` | `### 5.9 Insert` — the section TITLE. The §5.9 body (1430-1509) covers OpenCut insert, the 5-strategy `PlacementStrategy` union, placement resolution, edge cases, ripple insert. **There is no overwrite half in the §5.9 prose.** The op table calls it "Insert / Overwrite" but only Insert is specified | **GAP — the overwrite half of §5.9 has no algorithm section anywhere in the spec** |
| `06-nle-ops.md:2408` | `\| §5.9 Insert / Overwrite \| :4702 / :4860 \| performInsertEdit( / performOverwriteEdit( \| ALIGNED \|` — the 10.4 engine op-coverage row | STALE-SCOPED: "ALIGNED" certifies the engine method *exists*; no § to align against (see row above) |
| `06-nle-ops.md:2391` | §10.4 preamble: "the engine's FreeCut-side op families (roll/slip/slide/rateStretch/retime/**insert-edit-3-point**/sync-lock) are port-scheduled INTO opencut-timeline's ops layer as pure functions over SceneTracks at r1" (Decision 12.3) | **The only canonical-home statement**: OT is the single normative algorithm home; the engine's 3-point overwrite is its internal fallback until the r1 port |
| `06-nle-ops.md:3110` | test row `move-overlap-on-target-rejected` — "moving onto an occupied slot on the target track → `OVERLAP_DETECTED` rejected **(unless overwrite placement)**" | **PHANTOM**: names an "overwrite placement" that exists in NO `PlacementStrategy` union (05:5 variants, 15:5 variants, OT code:5, OT wire:2). The 05 §14.5 law is the *opposite* — see next row |
| `06-nle-ops.md:3175-3176` | test row `insert-overwrite-vs-ripple` — "`placement: 'overwrite'` vs `'ripple'` produces different post-states for the same insert" | PHANTOM (same) — and no statement of *what* either post-state is |
| `05-timeline.md:853` | §14.5: "**Overlap resolution policy: REJECTED, NOT SHIFTED.** When `canPlaceTimeSpansOnTrack` returns false, the placement falls through to either a different existing track or a new track. The existing elements are never moved to make room." | **This is the insert half's law and the direct NEGATION of overwrite placement** (which clears/overlaps the span instead of refusing). 05 §14.5/§14.5A contain **no overwrite placement strategy row** — the 5-variant union (:845) is explicit/firstAvailable/preferIndex/aboveSource/alwaysNew |
| `05-timeline.md:1497` | keyboard borrow table: "Overwrite edit (source → timeline) \| — \| `.` (`period`) \| `.` \| FreeCut only." (insert `,` is :1496) | The only row in 00-18 that names the overwrite *edit* as an action — flagged FreeCut-only, unbound in the OpenCut/spec keymap |
| `15-wire-protocol.md` | **ZERO matches for "overwrite"** (grep, whole file) | The wire protocol has no overwrite verb of any kind. Nearest surface: `InsertCommand` `ripple: boolean` ("If true, ripple the timeline to make room", :748-752) + `PasteCommand` — see 16 rows below |
| `15-wire-protocol.md:4901` | §13.15 row: InsertCommand "wire needs full `PlacementStrategy` + `ripple` + `idSeed`" (CONVERGENT verdict) | The ripple param is a declared wire-need; **what `ripple:false` does on overlap is never defined** (reject? overwrite?) — OT's live answer is CONFLICT/reject (:719) |
| `16-keyboard-shortcuts.md:242` | `\| Cmd+Shift+V \| Paste at playhead (overwrite mode) \| { type: 'paste', params: { atTime: <currentTime>, ripple: false } } \|` | Paste-overwrite is the only overwrite-flavored wire semantics in 16 — riding the paste composite, not an edit-mode verb |
| `16-keyboard-shortcuts.md:858` | paste command comment: "insert/overwrite is resolver-level (sets ripple/placement)"; :1220/:1406 "ripple: true = insert, false = overwrite" | The insert/overwrite distinction is asserted **only in resolver comments**, never as a normative definition of what ripple:false *does* |
| `16-keyboard-shortcuts.md:232-235` | `\`,\` Slip left 1 frame…\` — the `,`/`.` keys' normative §3.4 binding is the CLIP SLIP ladder (tool-disambiguated vs nudge, :250, conflict row :591) | The R20-W2 source-mode `,`/`.` = insert/overwrite binding exists ONLY as a §0 round-note (:18: "the source-mode `,`/`.` insert/overwrite rows, R20-W2 C46") — **no §3 table row, no conflict-table row vs the slip ladder** |
| `18-ui-shell.md` | **ZERO matches** for overwrite / insert mode / source edit (grep) | The source-edit-bar / edit-mode family has no 18 contract; the R20 C46 row targets "18 §4.3 v1.2" as a spec-QUEUE anchor (docs/r20/insert-modes.md:307), i.e. not yet landed |
| `00-master-spec.md` | **ZERO matches** (grep) | No master-level row |
| `07-composition.md:367` | "params keys are overwrite-only and the null-clear law does NOT extend to them (`types/index.ts:166-168`)" | **Naming collision, not this mode**: OT's `ElementParams` open-map law (patch merge is overwrite-only per key) — patch semantics for the element `params` record. scout-app.md:92 already disambiguates ("updateElements patches being overwrite-only per-field is patch semantics, not an edit mode"). Keep grep queries scoped or this poisons the census |

**Key questions answered:**

- **(a) Partial-coverage law (fully-covered removed, straddlers trimmed, remnants survive): stated NOWHERE in the specs.** It exists as engine code + doc-comment + tests (§3 below), as the R20-W2 mock implementation + tests, and obliquely as the two 06 test-row names. No spec prose states the four overlap cases, the no-shift law, or the splice-remnant pattern. **GAP.**
- **(b) Overwrite-PLACE vs 3-point overwrite: the spec never distinguishes them because it never defines either.** There is no 'overwrite' placement strategy in any union (the opposite — reject-not-shift — is 05 §14.5's law); the engine's 3-point form (sourceStart/sourceEnd + overwriteAtFrame, the "Point 1/2/3" math at timeline.ts:4521-4527) is the only executable overwrite and is class-only, unwired. The two 06 test rows cite a `placement: 'overwrite'` that matches neither.
- **(c) Canonical: Decision 12.3 (06:2391).** OT's ops layer is the single normative algorithm home; the engine's insert-edit-3-point family is port-scheduled INTO OT at r1 (acceptance: OT's suite + the ported engine tests); until then the engine remains "its internal fallback." The R20 design row (docs/r20/insert-modes.md:287) operationalizes this: overwrite is a **NO-SEAM composite** (`timeline.split` at span edges + `timeline.delete` + `timeline.insert`), executable reference = engine `performOverwriteEdit`, port-scheduled per 12.3.

---

## 3. Code sweep

### 3.1 nle-engine — `performOverwriteEdit` (the audit's core; timeline.ts, read in full)

`timeline.ts:4860-4874` — public wrapper; `:4876-5051` — `_performOverwriteEditImpl`. Signature (3-point): `(trackId, sourceId, overwriteAtFrame, sourceStart, sourceEnd, {linked=true})` → `{insertedClipId, removedClipIds, splitClipIds}`. Port of freecut `source-edit-actions.ts:296-376` (citation of record; freecut not in this corpus).

**THE COVERED-CLIP LAW (verbatim behavior), timeline.ts:4918-4996** — a re-scanning while-loop over clips on the target track overlapping `[overwriteStart, overwriteEnd)` (half-open, :4922-4923):

| overlap case | code behavior | lines |
|---|---|---|
| Fully contained (`clipStart ≥ regionStart && clipEnd ≤ regionEnd`) | **REMOVED entirely** — `removedClipIds.push; clips = clips.filter(c => c.id !== overlapping.id)` | :4931-4934 |
| Straddles both sides (`clipStart < regionStart && clipEnd > regionEnd`) | **split at regionStart, then the right half split at regionEnd, then the MIDDLE segment removed** — "Surviving left + right pieces stay on the timeline" | :4935-4964 |
| Straddles only start (left remnant survives) | split at regionStart, **right half removed** | :4965-4979 |
| Straddles only end (right remnant survives) | split at regionEnd, **left half removed** | :4980-4995 |
| Multiple covered clips | the loop **re-scans until no overlapping clip remains** ("each split can expose new candidates") — chains of covered clips all processed | :4905-4918 |

- **No downstream movement**: nothing shifts, anywhere. Timeline duration "preserved or shortened" (doc :4833-4835). ✓ mock.
- **Transitions INSIDE the span**: a split that lands inside a transition's consumed portion returns `null` from `_splitClipPure` (:4567-4571) → `overwriteBlocked = true` → **the whole edit ABORTS — no insert, no commit** (R1-B4, :4909-4915 + :5019-5022). The return is a **silent empty result** (`{insertedClipId: '', removedClipIds: [], splitClipIds: []}`) — no error code, no exception. After a successful edit, transitions referencing removed clips are dropped defensively (:5038-5042).
- **Linked companions** (:4998-5017): with `linked: true` (the default), companions of **REMOVED** clips (via `findLinkedClips` — `linkedGroupId` match or legacy originId+sourceId+position, :1460-1483) are also removed. **Asymmetry: companions of surviving TRIMMED remnants are NOT trimmed** — a partially-covered linked pair goes V-trimmed/A-full → A/V desync by design-comment omission ("mirrors freecut's applyTransitionRepairs cascade loosely").
- **Undo atomicity**: one `_commit` (:5044) wrapped in `execute()` (:4869, the P1.14 undo sweep) — split(s) + removal(s) + insert is ONE undo entry. The R1-B4 abort path pushes NO history entry (pinned: `expect(tl.canUndo()).toBe(historyBefore)`, tests/vitest/engine/timeline-edit-ops.test.ts:96).
- **3-point math** (:4521-4527): duration = `sourceEnd - sourceStart`, `Math.max(1, …)`, assumes sourceFps === timelineFps; the new clip is built by `_buildSourceEditClip` (:5061-5110, track-kind-typed, identity transform defaults).
- **Test pins**: engine vitest `tests/vitest/engine/timeline-edit-ops.test.ts:80-97` (R1-B4 abort only — "returns EMPTY and commits NOTHING"); the **positive covered-clip math is pinned browser-side only** — milestone 7.7, `src/app/page.tsx:2533-2560`: clip [0,60), overwrite [20,30) → expects `(0,20)+(20,10)+(30,30)` ("split into left+right, middle replaced"). (4 vitest tests total in that file; 458/458 suite green per the R25 scout.)
- **Wire: NOT exposed.** `headless/api.ts:378-397` — the 19-op `EditOperationName` union has no overwrite (nor insert-edit); the `TimelineActionsAdapter` (:592-694) has no binding. Class-only, UNWIRED (scout-engine verdict f: "EXISTS (class-only, UNWIRED)" — confirmed).

### 3.2 opencut-timeline — ABSENT, with the reject-not-shift law as the standing negation

- `src/lib/timeline/placement/index.ts:1-18` header: "Overlap policy: **REJECTED, NOT SHIFTED** — existing elements are never moved to make room; the placement falls through to another track or a new track." Five strategies (:43-54) — no 'overwrite' variant.
- Wire `timeline.insert` (headless/api.ts:558-720): strategy accepts only `firstAvailable | explicit` (:581-590); core insert failure → `{ok:false, code:'CONFLICT', error:'placement failed'}` (:719). **An overlapping insert is REFUSED, never cleared.**
- Whole-src grep for "overwrite": 4 hits, **none an edit mode** — `types/index.ts:142/:166` (the ElementParams params-map open-map law), `ops/timeline-core.ts:145` (same law's cross-ref), `:821` (an undoStack comment). Confirms scout-ot row 6 (ABSENT).
- `moveElements` validates overlap (CONFLICT family) — no clobber path; no mode UI; `rippleDelete` exists but there is no ripple-overwrite verb either (scout-ot row 9).

**So: the OT overwrite "placement strategy" the task asked me to find does not exist — the question "reject / clear / trim?" answers REJECT at the placement layer.** The span-cleared semantics live only in the engine (and the R20 mock, below), both outside OT.

### 3.3 ui-mock/shell-variants — the R20-W2 round: the ONLY full, tested, mock-faithful overwrite anywhere

- `src/lib/insertPlan.ts:44` — `InsertMediaMode` = 'insert' | 'overwrite' | 'append' | 'placeOnTop' | 'rippleOverwrite' | 'replace' | 'fitToFill'. Pure planner `planInsertMedia` + commit half `applyInsertPlan` (plan/apply split so preview == commit).
- **The trim engine, `planOverwriteSpans` (:192-255)** — the recording twin of the old store-private `applyOverwriteSpans`, header: "fully-covered → removed, head/tail straddles → trimmed, middle straddle → split with the R19-REV P2 split law: right half … keeps transitionOut + severs linkedTo; left half loses transitionOut":
  - fully covered → `removeElement` op (:203-207);
  - covered-from-left → **head-trim**: `startTime = time+dur`, `duration -= cut`, `sourceStart += cut`, clip-markers filter+shift (:208-220);
  - covered-from-right → **tail-trim**: `duration = time − eStart`, markers filtered (:221-231);
  - middle straddle → **split**: right half minted as a NEW element (severed `linkedTo`, sourceStart re-based, markers shifted, keeps transitionOut), left half trimmed + `transitionOut` dropped (:232-252).
- **Overwrite branch (:469-471)**: `geometry.overwriteSpans = coveredSpans(...)` (pre-mutation shading — "the honest regions the placement replaces; empty gap stays unshaded", :257-267) + `planOverwriteSpans`. **No displacement** — `geometry.arrows = { down: true, right: displaced.length > 0 }` (:498) → right arrow OFF for pure overwrite ✓ mock grammar. Time = drop-time ?? playhead (:412-419); duration honors the source viewer's in/out range (`sourceDurOf` :141-146) — **3-point flavored, like the engine**.
- Commit: `useUiStore.ts:1295-1308` (`insertMediaAt` → plan) + `:1321-1331` (`applyInsertPlan` — the patch executes under **ONE `withHistory` entry**, toasts preserved). Undo atomicity ✓ engine parity.
- Keys: `useShortcuts.ts:402-416` — source-mode `,`/`.` fire insert/overwrite (`s.insertMediaAt(s.sourceMediaId, key === ',' ? 'insert' : 'overwrite')`), gated to `viewerMode === 'source'`, context-disjoint from the slip ladder (registered in the deviation register).
- UI: `SourceEditBar.tsx:63` — the Overwrite button ("Places a new clip at the playhead, writing over whatever clips were there") in the 7-mode under-source bar (no radiogroup — C46: "no NLE has a persistent mode"); `editModeIcons.tsx:69-71` — the reference's two-overlapping-rects icon; `Timeline.tsx:1333` Alt-drop = overwrite; `:1586-1593` overwrite-span shading layer.
- **Tests pinning the law**: `insertPlan.test.ts:122-133` ("overwrite: fully-covered clip removed, straddler head-trimmed, spans shaded pre-mutation"; "overwrite trims, never moves: no displaced, right arrow off"), `:538-561` (spans == removed/trimmed spans, survivors disjoint); `useUiStore.test.ts:2006` ("overwrite removes fully-covered clips and trims straddlers"); `Timeline.test.tsx:386-393` ("Alt-drop = overwrite (contract §7): the covered span is REPLACED in place — destructive, not ripple-pushed"). 1521+ tests in the variants track (R24 canon).
- Design ledger: `docs/r20/insert-modes.md:287` — overwrite = **NO-SEAM composite** (split+delete+insert), engine `performOverwriteEdit` the executable reference, port-scheduled per Decision 12.3; `:297` the eventual wire mapping ("overwrite → split+delete+insert"); `:306-307` the C45/C46 spec-queue rows (06 §5.9 edit-functions subsection; 15 §13.15 InsertCommand ripple; 18 §4.3 source-preview chrome).
- shell-mini: **no overwrite surface** (only an unrelated vendor merge.ts comment).

### 3.4 nle-test-app & nle-ui — Wave-1 verdicts verified

- **nle-test-app**: absent as a mode — app `src/` has no overwrite verb (only two unrelated audioService.ts comments at :466/:514 about descriptor fades "overwriting" author fades). The **vendored engine copy** (`vendor/nle-engine`) carries `performOverwriteEdit` + the R1-B4 vitest pins verbatim; `vendor/nle-timeline` (OT copy) carries only the params-map law. Absent-as-mode ✓, engine code present-by-vendor.
- **nle-ui**: **zero** grep matches across src/ ✓ (scout-nle-ui row f: "No overwrite verb (no store action / router command / menu row); pool placement never commits").

---

## 4. Semantic deltas vs the mock

1. **Pre-commit overlay vs after-state.** The mock draws only the ghost overlay (turtle still visible *under* it; surf never trimmed). Both implementations commit the removal/trim. The extraction's law is the correct intended reading, but the mock itself is silent on the after-state — the spec-06 gap (G1) means the *only* normative-looking statement of the after-state is the mock's one sentence of prose.
2. **3-point vs whole-clip.** The mock shows the whole source clip landing at the playhead. Engine and shell-variants both honor source in/out marks (engine: explicit sourceStart/sourceEnd params; shell: `ctx.sourceRange` via `sourceDurOf`). Mock = the degenerate whole-clip case. Aligned, mock-simpler.
3. **Transitions inside the span.** Mock: silent (no transition glyph at all). Engine: **whole-edit abort** if any required split lands in a transition's consumed window — silently, returning an empty result (no error code, no toast). Shell-variants: no transition-window refusal concept at all — it splits per the R19-REV P2 law (left half loses `transitionOut`, right half keeps it); a fully-covered element's `transitionOut` disappears with it. **Three different behaviors; none specified.**
4. **Linked A/V companions.** Mock: single video track, no companions. Engine: companions of fully-REMOVED clips are removed by default (`linked: true`) — but companions of trimmed survivors are NOT trimmed (desync). Shell-variants: split right-halves sever `linkedTo`; no removal cascade at all. Divergent laws, unspecified.
5. **Multiple covered clips.** Mock's "whatever clip or clips" (plural) ✓ both: engine re-scans in a loop; shell filters the overlapping set once (mutations are disjoint, one pass suffices). Aligned.
6. **Push-arrow grammar.** Mock: right-arrow `display:none`; insert tab: shown + followers moved. Shell: `arrows.right = displaced.length > 0` — exactly the mock's contrast, and its tests pin it. Engine: no UI. Aligned.
7. **Ripple overwrite is a SEPARATE mode** (mock tab 5: replace-with-different-length + push/pull; shell: same, delta = dur − displaced shift; engine: ABSENT). Not part of this card — but the fleet should not let the mock's 6-tab family blur the boundary: overwrite = cover, zero movement.
8. **The 30s cap and 4s fallback** in the mock's `sourceDurOf` (`Math.min(len, tail, 30)`, `m.duration ?? 4`) are mock-world conveniences with no spec basis — fine for a mock, must not ride the port.

---

## 5. Gap rows (posture law: owner / phase / acceptance)

| # | Gap | Owner | Phase | Acceptance |
|---|---|---|---|---|
| G1 | **The partial-coverage law is stated nowhere.** Fully-covered → removed; straddle-both → split×2 + middle removed; head/tail straddle → trimmed remnant survives; multiple covered clips processed; **NO downstream movement**; splice-remnant patterns legal output. §5.9 has no overwrite prose (06:1430 title says Insert only) | spec **06** (add §5.9B "Overwrite" / the C45 "edit functions" subsection) | **r1** (with the Decision-12.3 port) | 06 §5.9B states the four overlap cases + no-shift + remnant survival normatively, citing engine timeline.ts:4876-5051 and insertPlan.ts:192-255 as the two executable witnesses; spec-17 gains `insert-overwrite-*` rows (fully-covered-removed / straddler-head-trim / straddler-tail-trim / middle-split / no-displacement / transition-blocked-abort) |
| G2 | **`placement: 'overwrite'` is a phantom.** 06:3110 + :3175 name an overwrite placement strategy; NO PlacementStrategy union has it (05 §14.5: 5 variants + the REJECT-NOT-SHIFT law — the negation; 15 §4.3.9: 5 variants; OT: 5 code / 2 wire). Nothing says whether overwrite is a placement strategy, a composite, or the 3-point verb | spec **06 + 05** (joint row; the R20 ledger already proposes the answer: composite = split+delete+insert, insert-modes.md:287/:297) | **r1** | Either (a) the unions gain an `overwrite` strategy with span-clear semantics defined against §14.5's reject-not-shift law, or (b) the two 06 test rows are re-keyed to the composite decomposition — one sentence in 05 §14.5 stating "overwrite is NOT a placement strategy; it is the split+delete+insert composite (06 §5.9B)" closes it |
| G3 | **No wire surface at any layer.** Engine 19-op JSON-RPC (INTERNAL per Decision 16): no overwrite. OT 24 routed verbs: none. Spec-15 78-union: none — `InsertCommand.ripple` is insert-side and `ripple:false`'s overlap behavior is undefined (OT answers CONFLICT/reject, api.ts:719); the only ripple:false≈overwrite claim lives in 16's resolver comments (:858/:1220/:1406). The source-mode `,`/`.` rows are a 16 §0 round-note only — the normative `,`/`.` rows are the slip ladder (:232-235, conflict :591) with no source-mode column | spec **15** (§13.15 C7 worklist decision row) + **16** (§3 row + conflict-table row) | **r1 / K3** | A one-row decision: overwrite stays a composite over existing verbs (split+delete+insert; paste `ripple:false` documented as the paste-family instance) or gains a first-class verb; 16 §3 gains the source-mode `,`/`.` insert/overwrite rows with the context-disjoint conflict note vs §3.4 slip (the C46 row, landed) |
| G4 | **Engine-side defects block the port.** (a) silent abort — transition-blocked split returns an empty result, no error code (R1-B4's refusal stance is right; the silence isn't wire-able); (b) linked-companion asymmetry — removed clips cascade to companions, trimmed survivors don't (A/V desync); (c) class-only, unwired, 19-op surface predates it; (d) the positive covered-clip math is pinned browser-milestone-only (page.tsx 7.7) — 4 vitest tests are all abort-path | **OT** (the Decision-12.3 port target), engine as source | **r1** | The ported pure op over SceneTracks implements the G1 law; engine tests ported + a vitest family for the four overlap cases; the abort classified into the CONFLICT/INVALID_PARAMS error family on whatever seam consumes it; the companion law (trim-with or remove-with or ignore) stated in 06 §5.9B and implemented identically in both homes |
| G5 | **The canonical UI tree has no edit-mode family; the only full UI is a mock repo.** OT `components/timeline/` (the canonical React tree per 05 §0/D25) has no source-edit bar, no ghost/overwrite-span preview, no `,`/`.` binding; the R20-W2 shell-variants mock has all of it, tested — but it is not canonical and 18 has zero rows (grep) | spec **18** (§4.3 source-preview chrome contract — the C46 anchor), consumers at the D30 W-C/W-D waves | **r1** (18 rows) → carrier absorption after | 18 §4.3 gains the 7-mode source-edit-bar contract (no radiogroup; Insert/Overwrite the primary pair; honest refusals) + the preview grammar rows: ghost at the span, down-arrow, overwrite-span shading, **no push arrow for overwrite** (the mock's exact grammar, html:277-283; insertPlan.ts:498); the app's absorption tracked against the wire-dispatch seam |

**Hazard row (not a gap):** the string "overwrite-only" (OT ElementParams open-map law, `types/index.ts:166-168`, `timeline-core.ts:145`; pinned in `07-composition.md:367`) is patch semantics for the element `params` record — **not this mode**. Two R25 scouts already tripped near it; any future grep census must scope the query to edit-mode surfaces.

---

## 6. Verdict

The overwrite edit is the fleet's sharpest spec-vs-code inversion: **the semantics are fully real and precisely engineered in exactly two places — the engine's `_performOverwriteEditImpl` (timeline.ts:4876-5051: the four-case covered-clip law, re-scanning loop, no-shift, one-commit atomic undo, R1-B4 transition abort pinned by vitest, positive math pinned by browser milestone 7.7) and the R20-W2 shell-variants mock (insertPlan.ts:192-255 + applyInsertPlan under one history entry + the mock-exact ghost/no-push-arrow grammar with `insertPlan.test.ts`/`useUiStore.test.ts`/`Timeline.test.tsx` pins)** — while **the spec corpus contains not one normative sentence about what overwrite does to covered clips**: §5.9 is titled Insert, 05 §14.5 pins the *opposite* (reject-not-shift) placement law, 15 has zero wire rows, 18 and 00 are silent, and 16's only overwrite-flavored semantics are paste-composite comments. Worse, the two 06 test rows that do mention overwrite cite a `placement: 'overwrite'` strategy that exists in no union anywhere — a phantom the R20 ledger has already resolved (composite: split+delete+insert; engine reference; Decision-12.3 port) but the specs have not adopted. The mode card itself survives verification with two refinements (insert also splits — the true contrast is cover-not-push; the remove/trim law is inferred from convention and implementations, not drawn in the mock) and one caveat (the mock renders only the pre-commit overlay). Posture: close G1 (the §5.9B prose) first — it is the single edit that turns two well-tested implementations into an aligned pair; G2/G3 are one-row decisions riding it; G4/G5 are the r1 port and absorption, already scheduled by Decision 12.3 and the D30 waves.

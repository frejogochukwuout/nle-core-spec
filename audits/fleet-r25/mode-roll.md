# Mode audit — ROLL TRIM (fleet R25)

Auditor: ROLL TRIM mode auditor (one mode, verified deeply). Method: direct reads of the mock, all six specs, and all six code homes; every claim carries file:line evidence re-verified live at the repo HEADs below. No repo was modified; this file is the only write.

Repo pins at audit time: nle-engine `3989506` (docs-only over the R24 `5036387`; timeline.ts unchanged), opencut-timeline `fdb771c` (src byte-identical to `c15a629`), nle-ui `3026099`, nle-test-app `64fb0ab`, ui-mock/shell-variants `3684166`, ui-mock/shell-mini (unpinned mock), nle-core-spec (this repo).

---

## Mode card (verified)

Source of truth: `ui-mock/trim_edit_modes.html` §view-roll (lines 436–492). The user's extraction is **accurate**; refinements below.

- **Semantics** (`:448-453`, verbatim): "A roll trim works on both the left and right sides of an edit at the same time. While one side is shortened, the other side is extended by the same number of frames so the overall length of your timeline remains the same." → both-sides-simultaneous, equal-and-opposite deltas, total-duration invariant. **FULLY-STATED in the mock.**
- **Handle/clamp constraints: IMPLIED-ONLY in the mock.** The mock never mentions source handles, media bounds, or clamping; "extended by the same number of frames" presumes available media. (Confirmed: no other text in the roll view.)
- **Visual grammar** (all verified in markup + CSS):
  - Dual **green trim edges on both facing edges** of the adjacent pair: `green-edge right` on the left clip Bird.mov (`:469`) + `green-edge left` on the right clip Sunset.mov (`:474`). Edge = 21px/18px gradient `#55a814→#8ce22e→#a4ef3c` + 9px glow `rgba(150,230,50,.5)` (`.green-edge` CSS `:226-245`). The same green-edge class is reused for ripple's single active edge — green is the mock's generic trim-edge token, not roll-specific.
  - **Roll cursor** (`:478-483`): white two-bracket cursor with arrowheads pointing OUTWARD both ways, centered on the junction — the "edit point moves both directions" glyph.
  - **Two-way horizontal white arrow UNDER the edit point** (`:486-490`, top:294px — below the clip band), arrowheads on both ends — the drag-affordance marker.
  - **Both clips are UNDIMMED** (`:463`, `:471` — no `.dim` class): unlike ripple (neighbor dimmed) and slip/slide (operated clip red-bordered, neighbors dimmed), roll shows **two equal participants, no single owner**. This is a semantic detail worth pinning: the affordance is on the JUNCTION, not on a clip.
  - Header glyph (`:439-444`): two brackets + two outward arrows. Roll is the **default active tab** (`:427`).

---

## Spec sweep

Verdicts: FULLY-STATED = the DaVinci semantics (both-sides simultaneous, length-preserving, handle-clamped) are explicit; PARTIAL = some facet explicit, others implied; IMPLIED = governing but not spelled out.

**06-nle-ops.md — the anchor spec.**

| file:line | Quoted row | Verdict |
|---|---|---|
| 06:984 | §5.5 Description: "Trim two adjacent clips together — extend one's end, retract the other's start, total timeline duration preserved." | **FULLY-STATED** |
| 06:995–1056 | §5.5 full FreeCut `rollingTrimItems` quote: central clamp via `clampRollingTrimDeltaToPreserveEditState` (binary search, transitions+keyframes), `keepTightestDelta` **across the linked counterpart pair too** (`:1014-1022`), shrink-first-then-extend order (`:1025-1037`), counterpart fan-out with `skipAdjacentClamp` (`:1039-1050`), `applyTransitionRepairs` (`:1052`), one `'ROLLING_EDIT'` snapshot. | **FULLY-STATED** (the richest row in the corpus) |
| 06:1140–1145 | Constraints: adjacency "Not strictly checked — caller must guarantee"; "Cannot extend left element beyond its source end… right element beyond its source start… retract either to ≤0 duration"; "Transition & keyframe preservation (binary search)". | **FULLY-STATED** (handle-clamped explicit) |
| 06:1147 | "Multi-select: Single pair (leftId, rightId) + optional linked counterpart pair." | FULLY-STATED |
| 06:1149 | Command: FreeCut `'ROLLING_EDIT'`; OpenCut ❌ NOT IMPLEMENTED — "port as a new op (use `BatchCommand` wrapping two `OpCommand`s… or a single `TracksSnapshotCommand`)." | FULLY-STATED (gap + port shape) |
| 06:79 | §4 op table: "**Roll** | Trim adjacent clips together | …trim-actions.ts:471-565 (rollingTrimItems)… | ❌ NOT IMPLEMENTED — port from FreeCut" | PARTIAL (one-liner; length-preservation/clamps implied) |
| 06:2124 | §7 mapping: "Roll | trim left end + trim right start | `BatchCommand([trimLeft, trimRight])` OR single `TracksSnapshotCommand`" | PARTIAL (decomposition stated; duration invariant implied; §7's "one undo step per user intent" at :2130 completes it) |
| 06:2209–2216 | §9 Q5: "shrink first, then extend… the roll preview store carries `neighborDelta`… overlay is a 2-up `EditTwoUpPanels` showing OUT and IN." | FULLY-STATED |
| 06:2978 | §13 per-op table: "shrink-then-extend; both clips source-bounded | Pair + linked counterpart pair | FreeCut `'ROLLING_EDIT'` snapshot | n/a (preserves total duration)" | **FULLY-STATED** |
| 06:3134–3142 | §12 invariant tests: `roll-preserves-total-duration`, `roll-shrink-then-extend`, `roll-source-bounded-both-clips` (reject `SOURCE_BOUNDS_VIOLATION`). | FULLY-STATED (testable laws) |
| 06:354 | §4.6: "For drag-coalesced ops (move/trim/rate-stretch/slip/slide/roll), use the `previewElements({updates})` → `commitPreview()` pattern… no per-frame command pushes." | IMPLIED (roll named; coalescing semantics) |
| 06:612 | §5.2: "Constraint preservation: `utils/trim-edit-constraints.ts:126-213` (`clampRollingTrimDeltaToPreserveEditState`…)" | IMPLIED |
| 06:2187 | §9 Q1: the roll/ripple clamps "use **binary search**… to find the largest delta that doesn't break transitions or evict keyframes." | PARTIAL (mechanism stated; roll-specific effect via §5.5) |
| 06:2400 | §10.4 engine table: "§5.5 Roll | :2984 | `rollingTrimItems(` | ALIGNED" | Stated — **verified true** (read live, see code sweep) |
| 06:2436 | §10.5 OT table: "§5.5 Roll / §5.6 Slip / §5.7 Slide | — | (absent — OpenCut never had them; still absent at `c15a629`, R24-verified) | OT-GAP | nle-engine is the executable reference" | Stated — **re-verified true at `fdb771c`** |
| 06:21 | §0 r1 row: wave-1 ports (slip/slide/roll/rateStretch), "still OT-absent at `c15a629` (grep-verified — no roll/… code in `src/lib/timeline/{ops,headless}`)" | Stated gap (r1 posture) |

**05-timeline.md — interaction hooks + visual grammar.**

| file:line | Quoted row | Verdict |
|---|---|---|
| 05:949 | §14.10: "trim-handles.tsx (267 LOC)… Edge color scheme is mode-aware: `TRIM_COLORS` (white), `RIPPLE_COLORS` (amber), **`ROLL_COLORS` (amber, different glow)**, `FREE_COLORS` (green when actively trimming with headroom), `CONSTRAINED_COLORS` (red when hitting a bound) (`:18-35`, `:58-68`)." | FULLY-STATED grammar — **but AMBER ≠ the mock's green** (see deltas) |
| 05:952 | §14.10: "tool-operation-overlay.tsx (61 LOC) — overlay box during trim/ripple/roll/slip/slide/stretch. Position-only." | PARTIAL (a bounds box exists; no dual-edge/arrow grammar) |
| 05:964 | §14.11 hook table: `use-timeline-trim.ts` commit path = "…`rollingTrimItems`… (5 commit variants based on mode)". | FULLY-STATED (mode-aware commit) |
| 05:970 | "clamps via `clampTrimAmount` + `clampToAdjacentItems` + transition-aware guards (`clampRipple…`, `clampRollingTrimDeltaToPreserveEditState`)… commits via one of 5 actions based on `isRollingEdit`/… flags." | FULLY-STATED |
| 05:1238 | §16.5A op-port table: "rollingTrim | `:2984` | 1 (A2) | OT ops" | Stated (r1 port contract) |
| 05:1370 | §17 census: "`clip-cursor.ts` (75 LOC) — resolves the CSS cursor class for the current tool+edge+intent (trim/roll/slip/slide/etc.)." | PARTIAL (cursor is a CSS class, not the mock's bracket icon) |
| 05:1374 | §17 census: "`edge-halos.tsx` (76 LOC) — `EdgeHalos` — soft glow on the active edge during trim/roll/slip/slide." | PARTIAL (single active edge, not dual facing edges) |
| 05:1390 | §17 census: "trim-handles.tsx (267 LOC) — left/right trim edges with mode-aware colors (trim/ripple/roll) + join hover indicators." | PARTIAL (points at :949's palette) |
| 05:1407 | §17 census: "use-timeline-item-pointer-handlers.ts (392 LOC) — Master pointer-handler dispatcher: decides from `activeTool` + pointer position which gesture to start (trim, roll, slip, slide, stretch, razor, transition)." | PARTIAL (gesture routing named; no roll detail) |
| 05:21 | §0: "Op-family variants slip/slide/roll/rateStretch… (**r1**; tests carried from nle-engine timeline.ts…)." | Stated |

**16-keyboard-shortcuts.md.**

| file:line | Quoted row | Verdict |
|---|---|---|
| 16:179 | §3.2: "`T` | Trim tool (rollover edit between adjacent clips) | `{ type: 'selectTool', params: { tool: 'roll' } }` | Always | T" | **FULLY-STATED** (tool binding + the adjacency phrasing) |
| 16:832–833 | union: `selectTool` enum `'select' | 'razor' | 'ripple' | 'slip' | 'slide' | 'roll' | …` — "spec 15 §4.3.45 enum (spec 18 §4.5 mirrors it; `T` maps to roll)" | FULLY-STATED |
| 16:2382 | §10 gap table: "No tool/selection model on the engine's wire surface (`selectTool`… no counterpart)" — `src/lib/nle/headless/api.ts` cited | Stated engine gap (verified) |
| 16:961 | "Spec-15-only types NOT bound to a keyboard shortcut (e.g., `insert`, `roll`, …)" | Stated (roll op has no key; the T key selects the tool only) |
| 16:26 | §0: "r1 — keymap surfaces for the new op families (slip/slide/roll/rateStretch wave 1)… Acceptance: keymap rows + nle-ui sync." | Stated (r1 posture) |
| 16:2141 | cheat-sheet row `kbd-tool-trim | T | Trim tool | tools | Always` | Stated |

**18-ui-shell.md.**

| file:line | Quoted row | Verdict |
|---|---|---|
| 18:198 | §4.5: "Tool cluster (radio group; honors spec 15 §4.3.45's tool enum — **nine tools**): Select (V), Razor/Blade (B), Roll (T), Ripple (R), Slip (Y), Slide (U), Rate-stretch, Hand (H), Zoom (Z)… All dispatch `selectTool`." | FULLY-STATED (inventory) |
| 18:258 | §4.5 gesture table: "Roll both handles / T-tool drag | dual overlay | `roll` | spec 06 §5.5" | **FULLY-STATED** gesture→wire mapping; "dual overlay" is the corpus's ONLY visual-grammar nod to the mock's dual-edge display |
| 18:307 | §5A cursor table: "Roll tool on cut point | `ew-resize` (dual overlay indicates both)" | PARTIAL (cursor = `ew-resize`, not the mock's bracket cursor; "dual overlay indicates both" implies the paired-edge display) |
| 18:380 | removal ledger: mock's `dyntrim` dropped — "Spec 15 tool enum has roll/ripple covering the rough-cut need" | Stated (history) |

**15-wire-protocol.md.**

| file:line | Quoted row | Verdict |
|---|---|---|
| 15:609–642 | §4.3.5 `RollCommand`: `leftElementId`/`rightElementId`/signed `delta` ("Positive = edit point moves right (left extends, right retracts)"), `syncLinked` (default true, "also apply the roll to linked counterpart pair"). Constraints: "must be adjacent (`rightElement.startTime === leftElement.startTime + leftElement.duration`); Source bounds on both elements; Min duration 1 frame on both; Transitions & keyframes preserved (binary search clamp)." Maps to `updateElements` batch, "following FreeCut's 'shrink first, then extend' rule". "Undoable: ✅ (the `BatchCommand` is one undoable unit)." | **FULLY-STATED** — the wire-side contract is complete |
| 15:192 | `RollCommand` member of the 78-type union | Stated |
| 15:301 | routing: "`roll`, `slip`, `slide`, `rateStretch` | OT (op-port) | NOT in OT (engine algorithms at timeline.ts:2984/…) → **r1 wave 1**" | Stated gap |
| 15:341 | engine-home row: roll → "`engine.timeline.updateElements({updates})` (BatchCommand internally — left-trim + right-trim) | ✅" | Stated |
| 15:2312–2323 | §5.1.4 wire example: `{"type":"roll","params":{"leftElementId":"clip-1","rightElementId":"clip-2","delta":166666}}` | Stated |
| 15:3637–3638 / 4370 | `RollCommandSchema` (zod) + registry member | Stated |
| 15:4789 | 1:1 mapping "Roll → RollCommand" | Stated |
| 15:4906 | coverage: "51 absent (roll/slip/slide/rateStretch/…)" — ENGINE-GAP, "op-family port is r1 wave 1/2" | Stated gap |

**00-master-spec.md:** :36 (index row), :79 (user story "perform standard NLE operations: cut/split/trim/ripple/roll/…"), :306/:330 (Decision 12 lineage: engine's roll families port-scheduled into OT — "the engine's implementations remain its internal fallback until each port lands"), :811 (Tier-1 test edge case "**roll past adjacent clip edge**" — the clamp boundary case named). All PARTIAL/stated posture rows.

---

## Code sweep

**nle-engine @ `3989506` — EXISTS (class method, algorithm-complete, UNWIRED).**
- `src/lib/nle/timeline/timeline.ts:2984` `rollingTrimItems(leftClipId, rightClipId, editPointDelta, {linked?})` → `:2998` `_rollingTrimItemsImpl`. Semantics read live (`:2965-3069`):
  - **Trims BOTH sides symmetrically** — cut-point model identical to the mock: `editPointDelta > 0` → right clip's start shrinks, left clip's end extends (order preserved: shrink first, `:3043-3052`), via `trimHead`/`trimTail` with `skipAdjacentClamp: true`. `B.sourceStart` advances through `trimHead` — DaVinci-correct content shift.
  - **Clamps to source bounds + min duration on both clips** — `clampTrimAmount` (timeline.ts:303, source-extent + speed + reversed + always-reversible-to-full-source + min-1-frame) under `keepTightestDelta` across the pair (`:3013-3018`). **No transition/keyframe binary-search clamp** (FreeCut's `clampRollingTrimDeltaToPreserveEditState` NOT ported) and **no `applyTransitionRepairs`**.
  - **Linked audio fan-out: YES but weaker than FreeCut** — resolves ONE counterpart per side via `linkedGroupId` (`:3024-3041`) and applies the raw clamped delta; the inner `trimHead/_trimTailImpl` re-clamps to the counterpart's own bounds. There is **no central `keepTightestDelta` across the counterpart pair** (spec 06:1014-1022) → if the counterpart has less source headroom than the primary, the companion-track junction moves by a smaller delta than the video junction (A/V junction desync).
  - **Undo atomicity: YES** — wrapped in `this.execute(...)` (`:2993`); the P1.14 reentrancy guard folds the sub-trims into ONE snapshot; no-op rolls push no entry (comment at `:2652`). Pinned by `scripts/probe-p114-undo.ts:213-233` ("rollingTrimItems [nested: trims fold into 1 step]").
  - **No adjacency precondition check** (caller guarantees — mirrors FreeCut; unlike 15 §4.3.5's constraint list and unlike the variants' strict check).
- **Wire: ABSENT.** `headless/api.ts` dispatch has exactly 19 cases (`:793-991`: addText…setTransform — includes `trimStart`/`trimEnd` but no roll; grep `roll` in api.ts/adapter = "rollback" comments only). Matches spec 16:2382 and 15:4906.
- **Vitest: zero roll tests.** `tests/vitest/engine/` — no `rollingTrim` match anywhere; `timeline-edit-ops.test.ts` pins only the R1-B4 transition-blocked insert/overwrite laws. The roll math is pinned runner-side only (the P1.14 probe). **The r1 acceptance "tests carried from nle-engine" is near-empty for roll: one undo-atomicity probe, none of 06 §12's three roll laws.**

**opencut-timeline @ `fdb771c` (byte-identical to `c15a629`) — ABSENT at every layer.**
- `src/lib/timeline/ops/` = {element-utils, group-move, group-resize, retime, split, timeline-core}.ts — no roll file; strict grep `roll|rolling` in `src/lib/` = zero real matches (only "Controller" false positives). Trim is single-edge (`ops/timeline-core.ts:1146 trimElements` per the R25 scout) or group-resize — never the adjacent-clip joint move.
- `src/components/timeline/` (the canonical D25 UI tree): strict grep `roll` = **zero matches** — no roll gesture, no dual-edge overlay, no roll cursor, no two-way arrow.
- `headless/api.ts:182-213` `WIRE_COMMAND_TYPES` = 30 names (24 routed + 6 exceptions) — **no `timeline.roll`**.
- **No tool-mode concept at all** (no `activeTool`/`ToolMode`/`selectTool` anywhere in OT src) — the tool radio is a shell-side concern.
- Matches 06:2436/06:21/15:301 exactly. OT-GAP confirmed.

**nle-test-app @ `64fb0ab` — ABSENT.**
- Strict grep `roll|rolling` across `src/` = zero matches; `src/timeline-port/` mirrors OT's tree (no tool concept, no roll). The app's roll surface = whatever OT ships, which is nothing. Matches scout-app's "Roll: NO".

**nle-ui @ `3026099` — PARTIAL: the roll TOOL RADIO exists and is INERT view-state (Wave-1 claim verified).**
- EXISTS: `src/components/timeline/TimelineToolbar.tsx:34` `{ id: 'roll', tip: 'Roll (T)', icon: <RollIcon /> }` (RollIcon `:19-23`, two opposing chevrons); `src/hooks/useShortcuts.ts:414` `case 't': s.setTool('roll')`; `src/state/useUiStore.ts:16` `ToolId` includes `'roll'`; `src/lib/shortcutMap.ts:52` cheat-sheet row `tool-roll`; key pins in `useShortcuts.test.tsx:185` + `shortcutMap.test.ts:53`.
- INERT: `setTool` (`useUiStore.ts:372`) only writes the store; **zero non-test consumers of `activeTool`** (grep) — no roll gesture, no overlay, no op dispatch. Selecting the roll tool changes the radio highlight and nothing else.

**ui-mock/shell-mini — ABSENT (explicitly out of scope).**
- `docs/DESIGN-mvp.md:91`: OUT list includes "ripple/slide/slip/roll". Only "edge trim handles" (:65) exist. Docs-only mentions otherwise.

**ui-mock/shell-variants @ `3684166` — EXISTS, FULLY LIVE (the fleet's best-kept secret).**
- Gesture: `src/components/timeline/Clip.tsx` — drag modes `roll-l`/`roll-r` (`:151-152`); routing `if (tool === 'roll' || (tool === 'select' && alt))` → `roll-${edge}`, **inert when no adjacent neighbor** (`:583-589`, `:1381`); live preview geometry shares the left-edge math (`:466`); bounds via pure `rollDeltaBounds`.
- Law: `src/lib/trimLaws.ts:192-224` `rollDeltaBounds(a, b)` — both clips' 1-frame minimums + A's source tail + B's source head + **rate≠1 B-tail compensation** (R15-F1 P3). Handle-clamped exactly per the mode card.
- Store: `src/state/useUiStore.ts:1893-1913` `rollTrim(aId, bId, delta)` — **strict adjacency check** (`a.end === b.start` within 1e-6, `:1901`; gap → silent no-op), same-track + lock checks (`:1899`), clamped, then ONE atomic mutation under `withHistory`: `a.duration += d; b.startTime += d; b.duration -= d; b.sourceStart += d` (B shows different content — DaVinci-correct). **ONE history entry; total duration preserved by construction.**
- Tests: `Clip.test.tsx:445-458` (⌥-drag: junction moves, A grows, B shrinks + sourceStart shifts, glued junction, ONE entry), `:460-471` (1-frame min bound, roll-tool route), `:473-481` (gap → inert, zero writes); `useUiStore.test.ts:1728-1757` (rollTrim semantics + non-adjacent rejection), `:1641-1650` (rate-0.5 B-tail bound).
- Visual grammar: 8px hit strips ±4px OUTSIDE clip edges with `w-resize`/`e-resize` cursors (`Clip.tsx:1376/:1393`) + a 6px **selection-accent** gradient affordance on hover (`:1416-1427`) — NOT the mock's dual green edges / bracket cursor / two-way arrow.

---

## Semantic deltas

1. **Edge color grammar — three-way conflict.** The mock pins **green** facing edges for roll (`green-edge` `:469/:474`); the spec's FreeCut reference pins **`ROLL_COLORS` (amber, different glow)** (05:949) with green reserved for "FREE (actively trimming with headroom)"; the only live implementation (variants) ships a **mode-agnostic selection-accent** gradient. 18:258/18:307 say only "dual overlay"/"`ew-resize`". Nobody decides which grammar is ours.
2. **The two-way arrow and roll cursor are mock-only.** No spec row and no component define the bidirectional arrow under the edit point or the bracket cursor glyph. 05:1370 pins a *CSS class* cursor (FreeCut `clip-cursor.ts`); 18:307 pins `ew-resize`. FreeCut's `RollingEditOverlay` (06:1089-1119) is a 2-up PREVIEW panel (OUT/IN frames), a different surface from the mock's timeline-band arrow. The mock's signature affordances are currently unpinnable by citation.
3. **Both-clips-active (no owner) grammar unpinned.** The mock shows both clips undimmed — the affordance lives on the junction. No spec row states roll's selection/participant model (06:1147's "Single pair + counterpart" is the closest, at the op level).
4. **Transition/keyframe preservation: spec'd but not ported.** 06:1145 + 15:642 require the binary-search clamp + 06:1052 `applyTransitionRepairs`; the engine's `rollingTrimItems` has neither (only `clampTrimAmount`). The engine is therefore *weaker than the spec row that calls it ALIGNED* (06:2400 — the alignment verdict predates this nuance).
5. **Counterpart clamp asymmetry in the engine.** FreeCut centrally clamps across the linked counterpart pair (`keepTightest`, 06:1014-1022); the engine applies the primary-pair clamped delta to counterparts and lets each sub-trim re-clamp — unequal counterpart headroom desyncs the A/V junctions.
6. **Adjacency strictness diverges three ways.** Mock/DaVinci: gesture only exists at a junction. 06:1141: "Not strictly checked — caller must guarantee" (engine follows). 15:639: adjacency is a stated constraint (checked at the wire — by whom unsaid). Variants: strict silent no-op. The strictness level is unspecified at the contract level.
7. **Keybinding surface gap (minor, deliberate).** 16:961: `roll` is a spec-15 type not bound to any key — the T key selects the tool; there is no frame-level roll nudge (the `,`/`.` rows are slip/nudge-only, 16:232-233). The mock implies pointer-only roll. Registered, not accidental.
8. **Aligned (no delta):** delta sign convention (engine doc `:2970-2974` = 15:620-623), equal-and-opposite deltas + total-duration invariant (engine construction + variants test `:445-458` + 06:3136 law), B's source-window advance (all three homes agree), one-undo-step atomicity (engine `execute()` + FreeCut snapshot + variants `withHistory`), preview-then-commit drag law (06:354 = 18:281 = variants pending→drag threshold).

---

## Gap rows (posture law)

| ID | gap | owner | phase | acceptance |
|---|---|---|---|---|
| ROLL-1 | Roll visual grammar unpinned: mock = dual green facing edges + bracket cursor + two-way arrow; 05:949 = amber; variants = selection-accent; 18 = "dual overlay" + `ew-resize` only | S-spec (05 §14.10/§17 + 18 §5A rows amended; one decision) | r1 | A spec row fixes roll's edge color, cursor, and arrow semantics; the r1 OT component implements them with a computed-style/pixel test (cursor + dual-edge presence on both facing edges of the junction pair) |
| ROLL-2 | Engine counterpart clamp asymmetry: no central `keepTightestDelta` across the linked pair (06:1014-1022 not ported) → A/V junction desync when counterpart headroom is tighter | S-engine (until the r1 port supersedes; the port home then owns it) | r1 | Test: linked pair where the audio counterpart has less source headroom than the video pair → both junctions move by the SAME tightest delta (assert audio junction == video junction after roll) |
| ROLL-3 | Transition/keyframe preservation missing from the engine's roll (no binary-search clamp, no transition repair) though 06:1145 + 15:642 require it; 06:2400's "ALIGNED" verdict overstates | S-ot (r1 port home per D12.3) + S-spec (sharpen the 06:2400 verdict) | r1 | Roll across a transition-bearing/keyframe-bearing edit point clamps to the largest safe delta; `roll-source-bounded-both-clips` + a transition-variant test green at the r1 pin |
| ROLL-4 | Adjacency strictness unspecified: caller-guarantee (06:1141) vs wire constraint (15:639) vs strict no-op (variants) | S-spec (one ruling) + S-ot (impl) | r1 | RollCommand on a non-adjacent pair returns a typed error (or documented no-op) per the ruling; a wire test pins the chosen behavior at the r1 pin |
| ROLL-5 | r1 acceptance "tests carried from nle-engine" is near-empty for roll: 0 vitest, 1 runner-side undo probe; 06 §12's three roll laws exist nowhere as executable tests | S-ot (with S-engine seed) | r1 | `roll-preserves-total-duration`, `roll-shrink-then-extend`, `roll-source-bounded-both-clips` exist as named green tests in OT's suite at the r1 pin (536+ carried count) |
| ROLL-6 | `timeline.roll` wire verb absent on both homes (OT WIRE_COMMAND_TYPES 30 names — no roll; engine 19 JSON-RPC cases — no roll) | S-ot | r1 | `timeline.roll` routed through `WIRE_COMMAND_TYPES` tsc-lockstep + a real-UI M49C coverage-gate row (24+1 routed verbs machine-checked); spec 15 §13.15 row flips ALIGNED |
| ROLL-7 | Tool→gesture seam dead-ends: nle-ui's T/roll radio is inert view-state and OT's canonical tree has NO tool-mode concept — when the roll op lands there is no tool that can reach it | S-app (K3 selectTool controller layer per 15:310) + S-ot (r1 gesture) | K3 (r1 for the gesture half) | With the roll tool active, edge-drag on a junction performs a roll through `useWireDispatch` (the M49C pattern) end-to-end in the app; the existing cheat-sheet row (`tool-roll`) becomes honest |

Already-registered (no new row needed, verified true at HEAD): OT-absence at every layer (06:21/06:2436/15:301/15:4906); engine wire absence (16:2382); r1 wave-1 port scheduling (05:21/05:1238/06:21/16:26/00:330).

---

## One-paragraph verdict

**SPEC-COVERED-CODE-PENDING, with two spec-side visual-grammar holes and one implementation nuance.** The DaVinci roll semantics — both sides simultaneous, equal-and-opposite, total-duration-preserving, handle-clamped, single undo step — are FULLY-STATED at the anchor (06 §5.5, quoting the FreeCut algorithm verbatim), at the wire (15 §4.3.5 RollCommand with adjacency/source/min-duration/transition constraints), at the keys (16 §3.2 `T`→roll), at the shell (18 §4.5 nine-tool radio + the "Roll both handles / T-tool drag → roll" gesture row), and as testable laws (06 §12's three roll invariants + 00:811's "roll past adjacent clip edge" edge case). Code: the algorithm EXISTS exactly once as a method — the engine's `rollingTrimItems` (timeline.ts:2984, symmetric cut-point semantics, source-bound clamped, one undo snapshot, linked fan-out) — plus a fully live, law-tested implementation in the ui-mock shell-variants (`rollTrim` + `rollDeltaBounds` + roll tool/⌥-drag gestures, the fleet's only working roll UX and the natural r1 reference alongside the engine port). The canonical pipeline (OT ops/wire/UI, the app) has NOTHING — no op, no `timeline.roll` verb, no gesture, no tool concept; nle-ui's T/roll radio is honest inert scaffolding. Deltas worth posture rows: the mock's green dual-edge + arrow + bracket-cursor grammar conflicts with the spec's FreeCut amber palette and is pinned nowhere (ROLL-1); the engine is missing the transition/keyframe clamp and the central counterpart clamp the spec quotes (ROLL-2/3); the r1 "carried tests" acceptance for roll is one undo probe, not the three §12 laws (ROLL-5). Roll is the best-specified of the wave-1 trim modes and the least-implemented in the canonical chain — exactly the r1 wave-1 posture the specs register; nothing in the corpus contradicts the r1 plan, and the variants mock proves the semantics are already de-risked.

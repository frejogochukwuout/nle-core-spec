# Mode audit — SLIDE TRIM (DaVinci edit-mode fleet, Fleet R25)

**Auditor:** R25 mode-audit · SLIDE (one mode, verified deeply) · **Date:** 2026-09-09
**Mode source of record:** `ui-mock/trim_edit_modes.html` `#view-slide` (:624-689) — read line-level, geometry recomputed.
**Corpus read (read-only, no commits, no repo modifications):** specs 00/05/06/15/16/18; code: `nle-engine` (timeline.ts @ HEAD `3989506`, 7,502 LOC; headless/api.ts), `opencut-timeline` (@ `fdb771c`, 5 past the R24 pin `c15a629`), `nle-test-app`, `nle-ui`, `nle-core-spec/ui-mock/shell-mini` + `shell-variants`, `cloudcut-nle` (the freecut extraction). R25 scout cards (scout-engine/-ot/-nle-ui/-app) cross-checked.
**Posture:** Wave-1 claims re-verified — **the "absent" repos now EXIST as live trees** (opencut-timeline, nle-test-app, nle-ui, all materialized 2026-09-06..09); the Wave-1 *slide-absence* findings still hold inside them (details in §4).

---

## 1. Mode card (verified against the mock, with refinements)

**Extraction (verbatim, trim_edit_modes.html:636-641):** "Sliding changes a clip's position on the timeline without changing its length. The clips on the left and right get shorter or longer as you slide the clip in the middle. You can think of a slide like a roll between 3 clips."

**Verdict: card CONFIRMED with 4 refinements + 1 geometry caveat.**

| Card claim | Mock evidence (file:line) | Verdict |
|---|---|---|
| Neighbors get **shorter or longer** (TRIM, not shift) | text :638-639; shrink boxes sit ON the neighbors at the shared edit points (:668-669); CSS `.clip.dim` :213-221 | ✅ VERIFIED — neighbors trim |
| 3-clip roll equivalence | text :639-640 ("a roll between 3 clips") | ✅ explicit in the mode source |
| Neighbors **dimmed** | `.clip.bird.dim` :651, `.clip.surf.dim` :658; border `#4a5a6e`, title `#4c5b6f/#9db0c0`, image overlay `rgba(8,10,16,.42)` (:213-221) | ✅ |
| Each neighbor carries a **white-box shrink outline** | `.white-box` 4px `#fbfdff`, radius 9-10, z-8, pointer-events:none (CSS :269-276; inline :668-669) | ✅ |
| **Direction arrows inside the boxes** | left arrow :680-683 (points LEFT, x∈[330,398] inside box [283,430]); right arrow :684-687 (points RIGHT, x∈[620,688] inside box [588,729]) | ✅ both point OUTWARD (away from the middle clip) |
| Active middle clip gets a **red border** | `.sunset.red-border` :662 + CSS :224 (3px `#e2403c`, radius 9), z-10 | ✅ |
| Slide cursor sits **LOW over the clip's title bar** (vs slip's over the body) | slide cursor svg at `left:469, top:185` 76×68 → y-center **219** (clip 92-264, center 178; title bar 232-264 — cursor overlaps it) vs slip cursor `top:129` 74×74 → y-center 166 ≈ body center (:604-609) | ✅ VERIFIED — 41px lower; encodes 05:972's slip-vs-slide pointer-position detection |
| Source window unchanged | NO source-window indicators on the active clip in slide view (no ghost box, no preview-frame, no glow-l/glow-r — contrast slip :590-600) | ✅ consistent with the simple DaVinci model (but see Δ1) |

**Refinements:**
- **R1 — box geometry.** Active clip drawn at [430,588] (inline `left:430;width:158`, :662). LEFT box [283,430] (147px) **abuts the active clip's left edge**; RIGHT box [588,729] (141px) **abuts its right edge**. Boxes are 76px tall = 44% of the 172px clip, **lower-anchored** (top:191, covering lower image area + full title bar). Semantics: each box = the Δ region at the SHARED edit point, extending INTO the neighbor — i.e. the neighbor's trim preview at the edge facing the slid clip. Ruler calibration: 124px=01:00:02:00, 510px=01:00:04:00 → 193px/s; boxes ≈0.76s/0.73s — illustrative, not frame-aligned.
- **R2 — static-composite caveat (needs a spec ruling, → G6).** The two boxes imply OPPOSITE slide directions simultaneously: the left box encodes a slide-LEFT shrink (bird loses [283,428]); the right box encodes a slide-RIGHT shrink (surf loses [594,729]); widths differ (147 vs 141). For any real single Δ, ONE neighbor shrinks and the OTHER grows by the same Δ — the mock superimposes both outward "shrink" previews (didactic figure, replicated from the DaVinci manual). The implementable reading: a box on BOTH sides whenever Δ≠0 — the shrinking side's box = the lost region, the growing side's = the gained region — with the arrows in the direction of the slide; the manual's twin outward arrows cannot both be true at once.
- **R3 — glyph distinction.** Slide cursor = arrow ∥ bracket ∥ bracket ∥ arrow (arrows OUTSIDE, roll-shaped, :672-677); slip cursor = bracket ∥ arrow ∥ arrow ∥ bracket (arrows INSIDE, :604-609). Same white bracket family as roll (:478-483); slide's is smaller (76×68 vs roll 88×80) and bottom-anchored.
- **R4 — shared class, two meanings.** `.white-box` (CSS comment :268: "source-duration ghost / neighbor shrink boxes") — slip's box = the FULL source-duration outline ([278,718]×131, :590); slide's = small per-neighbor trim previews. The class is shared, the semantics are not.

---

## 2. Spec sweep (every row governing slide; quote file:line → verdict)

### 2a. Key question (a): does the spec state the 3-clip roll equivalence explicitly (neighbors trim, active clip preserves source window)?

**YES for the trim/preserve-span half; NO (and internally contradicted) for the source-window half.**

| file:line | quote (abridged) | verdict |
|---|---|---|
| 06-nle-ops.md:1277 | "Move a clip + shift its neighbors to make room. The clip's source content doesn't change (well, it can shift for split-chain continuity — see `computeSlideContinuitySourceDelta`), but its timeline position does, and adjacent clips trim to accommodate." | ✅ neighbors trim; ⚠️ the parenthetical already concedes the source-window exception (Δ1) |
| 06:1294-1296 | "Order: shrink first, then extend (same as rolling edit): `slideDelta > 0`: right neighbor shrinks start, left neighbor extends end. `slideDelta < 0`: left neighbor shrinks end, right neighbor extends start." | ✅ the 3-clip roll semantics, per-direction |
| 06:2125 | "Slide \| move slid clip + trim left neighbor + trim right neighbor \| `BatchCommand([trimLeft, trimRight, move])` OR single `TracksSnapshotCommand`" | ✅ explicit |
| 06:2980 | invariant row: "neighbors source-bounded; no overlap; keyframes preserved \| Anchor + linked counterpart + neighbors \| FreeCut `'SLIDE_EDIT'` snapshot \| n/a (preserves total duration)" | ✅ span preserved |
| 06:3158-3160 | test row: "element `startTime` shifts by δ; left neighbor trims end by `+δ`; right neighbor trims start by `−δ`; **slid element's `sourceStart`/`duration` unchanged**" | ❌ **contradicts** 06:1293/1298 + 15:689-695 (sourceStart CAN shift by the continuity delta) — spec bug (→ G4) |
| 06:3161-3163 | test row: "`slide-no-chain-is-noop` — when left+right neighbors don't form a split-contiguous chain with the slid element → no-op" | ❌ mis-worded — the chain gates only the *continuity source delta* (slide-utils returns 0), not the slide; the engine slides anyway (timeline.ts:4336 proceeds) — spec bug (→ G4) |
| 06:81 | op inventory: "Slide \| Move clip + shift neighbors \| trim-actions.ts:651-878 (slideItem)… \| ❌ NOT IMPLEMENTED — port from FreeCut" | ✅ (OpenCut-classic never had it) |
| 15-wire-protocol.md:675-704 | `SlideCommand` §4.3.7: `{elementId, delta, preserveContinuity?, syncLinked?}`; "Left and right neighbors are trimmed to accommodate"; maps to `updateElements` BatchCommand (left-trim + move + right-trim); undoable ✅ | ✅ wire contract exists (spec-only — see §4) |
| 15:689-695 | "If `true`, also **shift the source window of the slid element** by the equivalent source-space delta to maintain playback continuity… **Default `true`**." | ✅ the continuity law is the wire default (confirms 06, refutes 06:3160) |
| 15:301 | routing: "`roll`, `slip`, `slide`, `rateStretch` \| OT (op-port) \| NOT in OT (engine algorithms at timeline.ts:2984/4143/**4246**/3155) → **r1 wave 1**" | ✅ posture row |
| 15:4906 | "27 of 78 … 51 absent (roll/slip/**slide**/rateStretch/…)" | ✅ wire-coverage census |
| 00-master-spec.md:36/79/306/330/801 | slide in the op-family lists; D12.3 port-scheduling | ✅ |
| 00:805 | global invariant: "No negative durations after trim/slip/**slide**" | ✅ |

### 2b. Key question (b): transition-preservation + keyframe-preservation clamping in 05's rows?

**YES in spec; NO in the engine (documented non-port).**

| file:line | quote | verdict |
|---|---|---|
| 05-timeline.md:972 | "`use-timeline-slip-slide` — detects slip vs slide from initial pointer position relative to clip body; clamps with `computeClampedSlipDelta` (slip) or **`clampSlideDeltaToPreserveTransitions` + `clampSlideDeltaToPreserveKeyframes`** (slide); commits via `slipItem`/`slideItem` actions." | ✅ BOTH clamps named; also the only slip-vs-slide *detection* row in the corpus (mock's cursor posture is its visual encoding) |
| 05:966 | hook commit-path row: "`SlipSlideState` … commits via `slipItem`/`slideItem` actions" | ✅ |
| 05:1164 | FC file map: `use-timeline-slip-slide.ts` 1291 LOC, "transition-aware clamping :36-38" | ✅ |
| 05:21 | GAP register: "Op-family variants slip/**slide**/roll/rateStretch… (**r1**; tests carried from nle-engine timeline.ts — acceptance: carried engine tests green)" | ✅ posture |
| 05:1237 | op-port table: "slide \| `:4246` \| 1 (A2) \| OT ops" | ✅ |
| 06:1291-1292 | algorithm steps 3-4: "Clamp to preserve transitions (twice, once per participant). Clamp to preserve keyframes (once, across both participants)." | ✅ |
| 06:1354-1355 | constraints: "Transitions on neighbors preserved…; Keyframes on slid clip + neighbors preserved" | ✅ |
| 06:3011 | invariant-preservation row cites `slide-keyframe-constraints.ts:clampSlideDeltaToPreserveKeyframes` | ✅ |
| 06:3164-3165 | test row `slide-preserves-keyframes` | ✅ (spec-side; engine test ABSENT — §4) |
| 06:2226-2233 | Q7: slide-utils is 42 LOC (continuity only); the algorithm lives in trim-actions.ts:651-878; preview store min/max delta; 4-up overlay | ✅ |

### 2c. Key question (c): any visual-grammar rows (neighbor dimming + shrink outlines + red border)?

**NONE.** Zero rows in 05/06/15/16/18 describe the slide affordance's visuals. The closest rows: 18:198 (tool radio: "Slip (Y), Slide (U)" — inventory only, no gesture/affordance contract), 16:181 (`U` → `selectTool {tool:'slide'}`), 06:1344-1349 (the 4-up viewer overlay: left neighbor's new OUT / right neighbor's new IN / baselines / "GAP" placeholder — a *viewer* readout, not the timeline's dimmed-neighbor + shrink-box grammar). The trim_edit_modes.html mock is not registered anywhere as slide's design reference (18 §0 registers shell-variants as the full-shell design reference — and shell-variants has no slide visual grammar, §4). **→ G5.**

### 2d. Remaining governing rows (keyboard, posture)

| file:line | quote | verdict |
|---|---|---|
| 16-keyboard-shortcuts.md:181 | "`U` \| Slide tool \| `{type:'selectTool', params:{tool:'slide'}}` \| Always \| U" | ✅ the tool key |
| 16:26 | GAP: "**r1 — keymap surfaces for the new op families** (slip/**slide**/roll/rateStretch wave 1…). Acceptance: keymap rows + nle-ui sync" | ✅ posture |
| 16:232-235, 286-289, 2173-2176 | slip-by-frame rows (`,`/`.` ±1/±10 frames when slip tool active; Option+ variants) | ✅ slip has them |
| 16:250 / 591 | "Slip vs. nudge… disambiguated by the active tool: slip tool active → slip, **any other tool → nudge**" | ⚠️ **no slide-by-frame rows exist** — with the SLIDE tool armed, `,`/`.` emit a plain `move` (nudge), which breaks the 3-clip span invariant rather than sliding 1 frame (→ G2) |
| 16:833 / 15:1468 / 15:4046 | tool enum includes `'slide'` | ✅ |
| 16:2143 | cheatsheet `kbd-tool-slide \| U` | ✅ |
| 18-ui-shell.md:198 | tool cluster radio: "…Slip (Y), Slide (U)…" | ✅ inventory row |
| 05:1484-1485 | comparative table: "Slide tool \| — \| `u` \| `u` \| FreeCut only (gated by `SLIP_SLIDE_TOOLS_ENABLED`)" | ✅ quoting-row (the flag appears nowhere else in the corpus — FreeCut-side fact); mild tension with 16:181's "Always" (16 §3.2 owns the keymap; 05's table is a source comparison) |
| 06:1160 / 2364 / 2378-2381 / 2436 / 2451 | FreeCut file map + OT-GAP row ("still absent at `c15a629`, R24-verified") + algorithm-home law | ✅ |
| 06:1357 | "Multi-select: Slide operates on one slid clip + optional linked counterpart (treated as parallel slide group with its own neighbors)" | ✅ (engine matches, §4) |

---

## 3. Code sweep — engine deep-read (the one real implementation)

**`nle-engine/src/lib/nle/timeline/timeline.ts` @ HEAD `3989506`** (timeline.ts unchanged since the R24 pin `5036387` per the R24/R25 cards; line numbers hold).

**Does it TRIM the neighbors or shift them? → TRIM.** `slideItem(clipId, slideDelta, leftNeighborId, rightNeighborId, {linked})` (:4246-4259, one `execute()` snapshot = one undo step, :4253-4258) → `_slideItemImpl` (:4261-4451):

1. Gates: `slideDelta===0` → return (:4268); unknown id (:4274); **`isSourceBearingClip`** — adjustment layers silently rejected (:4275-4278, Wave 4C).
2. Neighbors are CALLER-SUPPLIED ids (:4279-4284) — no self-discovery (an API-shape fact the OT port must solve; → G7).
3. Linked counterpart: `getSynchronizedLinkedItems` + its OWN neighbors by strict adjacency on the counterpart's track (:4287-4308).
4. Clamp: `_clampSlideParticipantDelta` (:4311-4328, applied to anchor AND counterpart, tightest wins) = `clampTrimAmount` source bounds on both neighbors (:4477, :4486) + `clampToAdjacentItems` occlusion (:4480-4483, :4489-4492, slid clip + neighbors excluded) + other-clips-on-track (:4496-4506) + floor at `from≥0` (:4471). **Line :4329: "(Wave 2 P1: clampSlideDeltaToPreserveTransitions + keyframes go here.)" — NOT PORTED** (documented :4234-4241: "transitions overlapping the slid window may need manual repair… the missing clamp only matters for slide-with-keyframes-at-extremes edge cases (documented delta, P2 backlog)"). **→ G3.**
5. `computeSlideContinuitySourceDelta` (:4336-4342; the export at :946-969).
6. Neighbor trims, **shrink first then extend**, exactly 06 §5.7 step 6: `slideDelta>0` → `trimHead(rightNeighbor, +δ)` then `trimTail(leftNeighbor, +δ)` (:4345-4358); `slideDelta<0` → `trimTail(left)` then `trimHead(right)` (:4359-4373) — all `{linked:false, skipAdjacentClamp:true}` (the reentrancy guard folds them into the ONE slide snapshot, :2653). `trimHead` = in-edge (positive trims in, advances sourceStart — :2621-2640); `trimTail` = out-edge. **The neighbors' source windows move exactly like a per-edge trim: the right neighbor's `sourceStart` advances with its head-trim; the left neighbor's tail-extension plays more source with fixed `sourceStart`.**
7. Move: `_updateClip(clipId, {from: max(0, from+δ)})` (:4376) — startTime shifts, duration untouched.
8. Continuity: if δ_source ≠ 0 → `sourceStart`/`sourceEnd` BOTH shifted on the slid clip (:4377-4392; media with explicit sourceEnd only).
9. Counterpart replay with the ACTUAL post-clamp delta (:4394-4450).

**`computeSlideContinuitySourceDelta` (:946-969) — what it does:** returns 0 unless left+right neighbors exist, both pairs `canJoinItems` (same originId split-chain + source-continuity, :900-928), slid clip is media; then `timelineToSourceFrames(δ, speed, timelineFps, sourceFps)` clamped by `computeClampedSlipDelta` (:885-898 — sourceEnd undefined → 0, so "no explicit source bounds → no continuity shift" holds transitively). **It matches 06 §5.7's quoted algorithm and Q7 exactly** (06:1304-1324 ≡ timeline.ts:946-969; the 06 version's inline `sourceEnd===undefined` early-return is achieved via computeClampedSlipDelta:891 in the engine). So YES — the FreeCut algorithm and the DaVinci "roll between 3 clips" semantics coincide on the neighbor-trim/move/span-preservation core; the ONE deliberate extension is the split-chain source-window shift (Δ1).

**Wire:** `headless/api.ts` — the 19-op verb set (:382-396) has **no slide** (nor slip/roll). `slideItem` is a Timeline-class method only; reachable by the runner page + browser milestones, not by a headless driver (matches 15:301 and scout-engine's "0/10 modes have a wire verb").

**Tests:** `timeline-edit-ops.test.ts` has ZERO slide rows. Coverage = the undo-nesting probe `scripts/probe-p114-undo.ts:302-320` ("NESTED CASE E: slideItem → trimHead/trimTail + _updateClip… exactly ONE undo entry") + the frozen API-surface export `tests/vitest/engine/api-surface.frozen.ts:177` (`computeSlideContinuitySourceDelta`). 06 §13's three slide invariant rows (3158-3165) exist NOWHERE as tests. **→ folded into G3/G4 acceptance.**

## 4. Code sweep — the other repos (Wave-1 re-verification)

| Repo (pin/HEAD) | slide presence | evidence |
|---|---|---|
| **opencut-timeline** @ `fdb771c` (5 past the R24 pin `c15a629`) | **ABSENT** | `src/lib/timeline/{ops,headless}`: zero slide matches (grep). The 12 whole-src "slide" file hits are ALL "slider" substrings (zoom slider family). No tool-enum `'slide'`, no `selectTool`. Matches 06:2436 ("still absent at c15a629, R24-verified") — re-verified at the newer HEAD. |
| **nle-test-app** | **ABSENT** (as op) | all "slide" hits = "slider" (zoom UI, mixer faders, GluedShell tests). The timeline-port mirrors OT's verb set — no slide. Matches scout-app row d. |
| **nle-ui** | **Tool scaffolding only — INERT** | `ToolId` union includes `'slide'` (`state/useUiStore.ts:16`); radio row with icon (`components/timeline/TimelineToolbar.tsx:37`, `role=radio`, `data-testid=shell-timeline-toolbar-tool-slide`); `U` key (`hooks/useShortcuts.ts:416`, `lib/shortcutMap.ts:54`). **But `Clip.tsx` branches only on `blade` (:114) and gates drag to `select` (:522, :534) — with the slide tool armed, body drag is dead; no store action, no neighbor trim.** Wave-1's "slide TOOL RADIO inert" claim: VERIFIED (it is view-state only). |
| **shell-variants** (nle-core-spec/ui-mock) | **GESTURE + LAW implemented; visual grammar absent; one law divergence** | `lib/trimLaws.ts:270-284` `slideStartBounds` (lo = prev.startTime+MIN_DUR; hi = next.end−MIN_DUR−el.duration — **neighbor source bounds NOT in the delta clamp**); `state/useUiStore.ts:1970-2015` `slideMove` (ONE history entry; neighbors' facing edges follow, each clamped by its own MIN_DUR + source extent — **"a capped edge opens a GAP instead"**); `components/timeline/Clip.tsx:137/:148/:612` (slide-tool body drag → mode `'slide'`), :461-465 (optimistic box preview, live-bounded by the same pure laws), :541 (bounds law). **No neighbor dimming, no shrink boxes, no red border, no dedicated cursor; neighbors jump on commit only.** Tests: `useUiStore.test.ts:1824-1840` (slide right: left neighbor extends, right trims head, glued no overlap; bounds clamp). |
| **shell-mini** | **ABSENT (declared)** | `docs/DESIGN-mvp.md:91` lists "ripple/slide/slip/roll" among the out-of-scope family. |
| **cloudcut-nle** (freecut extraction) | **Source NOT carried** | `src/freecut/shared/timeline/` = defaults/item-clamps/annotations/transitions only; NO `trim-actions.ts`, `slide-utils.ts`, `slide-edit-overlay.tsx`. The "slide" hits are TRANSITION renderers (`transitions/renderers/slide.ts`) — a different concept. FreeCut's slide algorithm lives only as the 06 §5.7 quotation + the engine port. |

---

## 5. Semantic deltas vs the mock

- **Δ1 — source window is NOT unconditionally preserved (engine + 06 + 15 vs the mock/DaVinci-simple).** The mock (and the classic DaVinci card) say slide never changes what the clip shows; the engine (:4377-4392), 06 §5.7 steps 5/8 (:1293, :1298), and 15 §4.3.7 (`preserveContinuity` **default true**, :689-695) shift the slid clip's source window by the source-space delta whenever the 3 clips form a split-contiguous chain — playback continuity over the slide. The mode card's "source window unchanged" needs the split-chain exception, and the mock should show it (the classic UI shows a continuity indicator; the mock shows nothing).
- **Δ2 — transition preservation (mock implies, engine lacks).** The card's "transitions at the shared edit points move/trim accordingly" is FreeCut law (06:1291, 05:972) but an explicit engine non-port (timeline.ts:4234-4238 "may need manual repair"; the Wave-2 P1 stub at :4329). Only spec-side today.
- **Δ3 — keyframe preservation (mock silent, spec yes, engine no).** Same posture: `clampSlideDeltaToPreserveKeyframes` is spec law (06:1292, :3164) and an engine P2 backlog item.
- **Δ4 — gap-opening (shell-variants vs engine/06/mock).** The variants' `slideMove` clamps the slide delta only to the neighbors' 1-frame minima and lets a source-capped neighbor edge OPEN A GAP (useUiStore.ts:1988-1996 comment + code) — the engine and 06 §5.7 clamp the delta itself against neighbor source bounds (:4477-4493), so the total span is ALWAYS preserved ("n/a (preserves total duration)", 06:2980) and slide never opens gaps. The variants' law turns slide into move-with-partial-trim — a real divergence needing the r1 port to rule (the engine/DaVinci law should win; the variants' docstring even advertises the gap).
- **Δ5 — the mock's static composite (R2 above).** Both shrink boxes + both outward arrows cannot be live in one frame; widths differ (147/141). An interactive implementation must pick one reading (→ G6).
- **Δ6 — keyboard reachability.** The mock implies mouse-gesture-only; the corpus agrees for slide (no slide-by-frame rows, 16 §3.4/§3.6), but the SLIP sibling has `,`/`.` rows — the asymmetry + the nudge fallback under the slide tool (a plain `move` breaking the span invariant) is a latent trap (→ G2).
- **Δ7 — neighbors/counterpart scope.** Mock shows a single 3-clip track; engine additionally handles the linked A/V companion with ITS OWN neighbors (:4401-4450; 06:1357; 15 `syncLinked` default true). Visual grammar for the companion slide is unspecified everywhere.
- **Δ8 — element-kind gate.** Engine rejects non-source-bearing clips (adjustment layers) as a silent no-op (:4278); 15 §4.3.7 states no kind restriction.

---

## 6. Gap rows (posture law: owner / phase / acceptance)

| # | Gap | Owner | Phase | Acceptance |
|---|---|---|---|---|
| **G1** | **Slide op port (r1 wave 1)** — the standing row: OT ops layer has zero slide (re-verified at `fdb771c`); engine's `slideItem` remains internal fallback; wire 0/78 for slide. | S-ot (opencut-timeline ops) | **r1** (05:21, 06:21, 15:301) | Slide as pure functions over SceneTracks in OT `src/lib/timeline/ops` + the carried engine tests green (incl. new rows per G3/G4) + pin bump + 15 §4.1A row flips + 15 §13.15 rows ALIGNED. |
| **G2** | **Slide-by-frame keyboard surface + the nudge disambiguation hole** — 16 has slip `,`/`.` rows but NO slide rows; slide tool armed → `,`/`.` = plain `move` (span-breaking nudge). | spec-16 (this round's editorial) + S-package (the r1 keymap row, 16:26) | **r1** | Either `,`/`.` with slide tool active emit `{type:'slide', delta:±1/±10 frames}` (mirror of §3.4's slip rows), or an explicit conflict-table row (§6) declaring slide-tool+nudge = move with rationale. Cheatsheet `kbd-slide-*` rows + nle-ui shortcutMap sync. |
| **G3** | **Engine slide clamps unported** — `clampSlideDeltaToPreserveTransitions` + `clampSlideDeltaToPreserveKeyframes` (06 §5.7 steps 3-4, 05:972) are documented non-ports (timeline.ts:4234-4241, stub :4329); zero vitest slide rows (undo probe + frozen export only). | S-engine (nle-engine) — or re-homed to G1's port acceptance per D12.3 | engine's Wave-2 P1 / rides **r1** | Both clamps ported (engine or OT port) + vitest rows: `slide-preserves-keyframes`, `slide-preserves-transitions`, `slide-moves-element-and-trims-neighbors` (06:3158-3165 realized as tests). |
| **G4** | **Spec bug: 06 §13 slide rows contradict §5.7/15** — (a) :3160 "sourceStart/duration unchanged" vs the continuity shift (:1293/:1298, 15:689-695 default true); (b) :3161 `slide-no-chain-is-noop` mis-names the behavior (no chain gates only the source delta, not the slide). | spec-06 editorial | this spec round (crawl-class doc fix) | Rows re-worded: `slide-continuity-zero-for-non-chain` + "sourceStart shifts by the continuity delta when the split chain holds"; Q7 :2230 aligned. |
| **G5** | **Slide visual grammar unregistered** — neighbor dimming + white shrink-outline trim previews at the shared edit points + active-clip red border + low slide cursor (+05:972's pointer-position slip/slide detection) appear in NO spec row; 18:198 is inventory-only; the trim_edit_modes mock is not registered as slide's design reference; shell-variants has the gesture but none of the affordance. | spec-18 (visual grammar owner) + S-package (r1 UI) | **r1** (rides G1's UI) | 18 gains the slide affordance rows (dim law, per-neighbor trim-preview box geometry per R1, border, cursor posture + tool detection); shell-variants/nle-ui implementation + tests (radio no longer inert). |
| **G6** | **Mock's composite box reading needs a ruling** — R2/Δ5: both boxes + twin outward arrows are a static composite; one Δ cannot shrink both neighbors. | spec-18 (design ruling, with G5) | **r1** | One canonical reading written into the G5 row (recommended: a box on both sides whenever Δ≠0 — shrink region on the ceding side, grow region on the gaining side; arrows in the slide direction) + shell-variants preview implements it. |
| **G7** | **SlideCommand port details unresolved** — 15 §4.3.7 maps slide → `updateElements` batch, but the engine's `slideItem` needs explicit neighbor IDs (port must discover same-track strict adjacency), the source-bearing kind gate (:4278) is unstated in 15, `syncLinked`/`preserveContinuity` defaults must be pinned, and the Δ1 semantics (continuity default ON) vs the DaVinci-simple card must be reconciled. | S-ot + spec-15 | **r1** | The OT op signature + carried tests pin neighbor discovery, the kind gate, syncLinked, preserveContinuity; 15 §4.3.7 gains the kind-restriction sentence; the mode card's "source window unchanged" gains the split-chain exception. |

---

## 7. Verdict

Slide is the corpus's best-specified "unimplemented" mode: the DaVinci semantics — active clip shifts startTime with duration and (by default) source window intact, left neighbor roll-trims its out-edge, right neighbor roll-trims its in-edge, total span preserved, clamped by neighbor source handles — are stated explicitly and consistently across 06 §5.7 (including the shrink-first order and the FreeCut algorithm's 9 steps), 15 §4.3.7 (a fully-specified, undoable, default-continuity wire command), 06 §7's composition row, and 06 §10's invariant table, with 05:972 carrying the gesture-side law (pointer-position slip/slide detection + the two preservation clamps) and 16/18 carrying the `U` tool key and radio. The one real implementation — the engine's `slideItem` at timeline.ts:4246 — is a faithful port of that algorithm (neighbor TRIMS via trimHead/trimTail, shrink-then-extend, span-preserving source-bound clamps, linked companion with its own neighbors, one undo snapshot), and `computeSlideContinuitySourceDelta` matches 06's Q7 quotation line-for-line; but it is class-only and unwired (0 wire verbs), untested in vitest (probe + frozen-export only), and missing the two preservation clamps it itself documents as non-ports. No other repo implements slide at any layer: OT and the app are grep-clean (the "slide" hits are all "slider"), nle-ui ships an inert tool radio, shell-mini declares it out of scope, and the FreeCut originals are not carried in any local tree — shell-variants alone implements the gesture and the bounds law, but with a gap-opening divergence (Δ4) and none of the mock's visual grammar. The mode's residual risk is concentrated in three places: (1) the spec's own test rows contradict its algorithm (06:3160/3161 — source-window "unchanged" vs the continuity shift; "no-chain-is-noop" vs a live slide), which would poison the r1 carried-test acceptance if ported as written; (2) the visual grammar exists only in the unregistered trim_edit_modes.html, whose static composite (twin outward shrink boxes) needs a single canonical reading before any UI wave; and (3) the keyboard surface has a latent trap — the slide tool armed turns `,`/`.` into a span-breaking plain nudge. All three are cheap doc-level fixes this round; the heavy lift remains the standing r1 wave-1 port (G1), which this audit confirms is still open at OT HEAD `fdb771c`.

— end of report —

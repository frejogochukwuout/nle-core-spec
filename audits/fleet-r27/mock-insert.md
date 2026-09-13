# mock-insert — R27 W2 EXTREME-depth audit: `ui-mock/timeline_edit_modes (2).html` (the six-mode insert-family reference)

**Round:** R27 final-tightness, Wave 2 (the user's call-out #1b). **Agent:** mock-insert. **Date:** 2026-09-13.
**Pins (ARCH-R27 §2 + W1 scouts):** spec corpus @ `cdc4e94` · engine `f9ac806` (748/748; timeline.ts 8,998 LOC) · OT HEAD `55c81c0` / code pin `970948a` (632/632; wire census **31 = 28 routed + 3 exceptions**) · app `c020b2a` (252/252) · variants (in-repo, the R24-variants rebuild: 64 files / 1,734 it-blocks) · mini 357 sealed.
**Method:** the HTML read line-by-line in full (743 lines — every CSS rule, every SVG path, every comment); every behavior then audited against 06 §5.0/§5.9-§5.9F + §0 (D30/D31/D32), 15 §4.3.9 + §13.15, 16 §3.2/§3.4A-B/§6.1, 18 §4.3/§9 + 05 §8A; then cross-checked live in engine/OT/app/variants code at the R27 pins. Every claim carries file:line.

---

## §1 The HTML's complete behavior extraction

### 1.0 Document anatomy — the CSS is the spec

The file is a **six-card tabbed teaching replica of DaVinci Resolve's edit-mode family**. Structure: tab bar `:402-409` (Insert Edit / Overwrite Edit / Replace Edit / Append at End / Ripple Overwrite / Fit to Fill — `switchMode('insert'|'overwrite'|'replace'|'append'|'ripple'|'fitfill')`), six `.view-panel` cards, and **one 10-line JS tab switcher `:731-741` that only toggles classes**. All behavior is encoded in the per-view CSS override blocks (`:260-395`) — the mode semantics are literally stylesheets. Each card = header icon + `<h1>` + a 4-5 line description paragraph + one timeline diagram.

**The fixed stage (shared by all six cards):**
- Timeline canvas 600×270 (`:100-108`); ruler ticks every 9.5px/95px (`:111-124`); grid lines at −35 / **155** / 345 / 535 (`:434-437`); timecodes **01:00:02:00 @ 155px** and 01:00:04:00 @ 345px (`:439-440`) ⇒ 95px ≡ 2s.
- **Playhead is FIXED at 155px in every card** (`.playhead-line { left: 155px }` `:232-241`) — the anchor of four of the six modes.
- **Source row** (top:60px): the active source clip **Sunset.mov, 175px wide**, 2px `#6ba4d8` border, z-10, elevated shadow (`.clip.sunset` `:208-218` = grammar **B6**). All inactive clips dimmed `rgba(0,0,0,.25)` over the image (`:162-168`).
- **Timeline row** (top:140px): the canonical BEFORE state, reconstructable from the overwrite card (where nothing moves): **Desert.mp4 160px @ −5 (ends exactly at the playhead, 155)** · **Turtle.mov 105px @ 155-260** · **Surf.mov 155px @ 260-415**.
- Shared overlay glyphs: **down-arrow** 16×28 white drop-shadowed (`:453-455`), **right-arrow** 28×16 (`:457-459`), **ghost** 175×110, 2px dashed `#646464`, radius 4 (`:221-229` = **B1**).

The cards render adjacent clips with a 5px gutter motif (e.g. insert's ghost 155-330 → turtle 335); this is a legibility motif, not semantics — the un-pushed states (overwrite/append) are flush.

### 1.1 INSERT (`:414-461`; CSS `:264-275`)

> **"Inserts a clip into the timeline at the location of the playhead and pushes everything else down to make room for it. If the playhead is in the middle of a clip, it will split the clip and place the new clip in the middle."** (`:426-431`)

| Element | Geometry | Encoded law |
|---|---|---|
| sunset (source, top row) | left 155 | source drops **at the playhead** |
| ghost | **155, z-4** (a placement SLOT below clips) | lands exactly at the playhead, source's own duration (175) |
| turtle | **155 → 335** (Δ+175 = the source duration + 5px gutter) | **every downstream clip shifts right by the source duration** |
| surf | **260 → 445** | same intrinsic push |
| desert | −5 (unchanged) | **upstream never moves** |
| down-arrow | 234.5 (ghost-centered: 155+175/2 − 8) | drop-at-playhead |
| **right-arrow** | **330, top 149 — SHOWN** (`:270-275`) | **the push token: rendered only when downstream moves** |

Three laws taught: (1) playhead-anchored splice; (2) intrinsic downstream push by the inserted duration; (3) **the mid-clip split law — split the straddler, place the source between the halves** (taught in TEXT only; the diagram shows the clean boundary case, desert|turtle exactly at the playhead). "Down" = downstream (later in time), Resolve-speak.

### 1.2 OVERWRITE (`:464-506`; CSS `:277-283`)

> **"The overwrite edit is one of the most common types of edits. When you perform an overwrite, it will place a new clip on the timeline at the location of the playhead, writing over whatever clip or clips were there before."** (`:475-480`)

| Element | Geometry | Encoded law |
|---|---|---|
| ghost | **155, z-8 — ABOVE the clips** (clips are z-5, `:153`) | the ghost **covers** what it overwrites (vs z-4 slot in insert) |
| turtle | **155 (unchanged — under the ghost, 155-260 ⊂ 155-330)** | a fully-covered clip stays in place until removed; nothing shifts |
| surf | **260 (unchanged; its head 260-330 is covered, tail 330-415 visible)** | partial coverage = trim, no displacement |
| right-arrow | **`display:none`** (`:283`) | **zero downstream movement** |
| down-arrow | 234.5 | drop-at-playhead |

Laws: playhead-anchored placement; **cover, not push**; whatever clip(s) intersect [playhead, playhead+duration) are written over (the "clip or clips" plural = the multi-covered scan); timeline duration preserved or shortened.

### 1.3 REPLACE (`:509-561`; CSS `:285-309`)

> **"Replaces a single clip on the timeline with one of the exact same length. The 'out' point of the clip you are editing into the timeline will be changed so it fits perfectly, making it the same duration as the one it replaces."** (`:530-535`)

| Element | Geometry | Encoded law |
|---|---|---|
| sunset (source) | **155, width 105 — RESIZED from 175 to the target's width** (`.view-replace .clip.sunset { left:155px; width:105px }` `:286`) | **the exact-length tell (B7): the source is fit TO the target** |
| sunset image | **dual-pane CSS** (`:288-304`): left half original, right half dimmed `brightness(0.85)` + a 1px divider at 50% | **the out-point auto-adjust made visible** — the right portion of the source is what gets cut to fit |
| ghost | **155, width 105, z-4** (`:305`) | the slot = the target's exact span |
| turtle / surf | **260 / 365** (see the ⚠ below) | — |
| right-arrow | **`display:none`** (`:309`) | **no downstream movement** (06:1609's token law) |

⚠ **Reference-quality defect (new finding, P3):** the card's diagram geometry contradicts its own text. For an exact-length swap the after-state must be `[sunset 105 @ 155-260][surf @ 260-415]` with turtle gone and **nothing moved**. As rendered, a fourth clip (`.clip.turtle`, **mislabeled "Sunset.mov"** at `:548`) sits at 260-365 and surf is pushed to 365-520 — a **+105 downstream shift matching an INSERT, not a replace**, growing the timeline by the target's own duration. The text (and the ghost/B7 tell) is the law; the clip row is a card-authoring error (the placed clip should occupy the ghost's slot at 155, surf unmoved at 260; and/or the stray turtle div should be deleted). No corpus text inherits the bad geometry — 06 §5.9C:1607 pins the correct postcondition — but the mock is the pinned B7 reference and should be honest.

### 1.4 APPEND AT END (`:564-609`; CSS `:311-318`)

> **"Append at end places the source clip after the last edit on your timeline, regardless of where the playhead is located. You can also use it to add multiple clips from the media pool to your timeline all at once!"** (`:578-583`)

| Element | Geometry | Encoded law |
|---|---|---|
| sunset (source) | **430, width 105** (`:315`) | lands at the **track tail**: desert −5-155, turtle 160-265, surf 270-425 ⇒ tail = 425 (+5 gutter) = 430 |
| ghost | 430, z-4 (`:316`) | the append point |
| down-arrow | 474.5 (ghost-centered) | — |
| **playhead** | still at 155 — **the drop is 275px away from it** | **the playhead is IGNORED** (the mode's identity sentence) |
| right-arrow | `display:none` (`:318`) | **never a push** — nothing is downstream of the tail |

Two laws: (1) placement at the last edit's end regardless of playhead; (2) **multi-clip append** from the pool, all at once (text-only). (The 105px source width here vs 175 elsewhere is a fit-to-container artifact — a 175px source at 430 would end at 605 > the 600px canvas; it teaches nothing about trimming, which append does not do.)

### 1.5 RIPPLE OVERWRITE (`:612-662`; CSS `:320-332`)

> **"Ripple overwrite replaces a shot of one length with a shot of a different length. Longer clips replace the clip in the timeline and push everything down to make room, while shorter clips pull things in so there are no gaps."** (`:627-632`)

| Element | Geometry | Encoded law |
|---|---|---|
| sunset (source) | **155, width 175 — NOT resized** (`.view-ripple .clip.sunset { left:155px }` `:324`, base width stands) | **the different-length tell (B7)**: the source keeps its own duration — the anti-replace |
| ghost | **155, z-8** (`:325`) | cover-style over the target |
| turtle (target) | **155 — stays in place UNDER the covering ghost** (z-5 < z-8; 155-260 ⊂ 155-330) | the target is fully covered/removed in place |
| surf | **260 → 335** (Δ+70 = 175 − 105, + 5px gutter) | **the delta law: downstream shifts by newDur − oldDur** |
| right-arrow | **SHOWN, 306/top 187** (`:327-332`) | push token (only the PUSH case is drawn; the pull is text-only) |
| down-arrow | 234.5 | drop-at-playhead |

Laws: replace one shot with a different-length shot; **push if longer, pull if shorter (pull leaves no gaps)** — the signed-delta law; playhead-anchored.

### 1.6 FIT TO FILL (`:665-727`; CSS `:334-395`)

> **"Fit to fill takes the portion of the clip that you have marked and adds a speed change to speed it up or slow it down. The speed change is automatically calculated so it fits into the space you have selected on the timeline."** (`:681-686`)

| Element | Geometry | Encoded law |
|---|---|---|
| sunset (source, top row) | **155, width 175, carrying a "1x" badge** (`:710-716`) | the **marked portion** (the full 175px source) at identity speed — the source's in/out |
| **fit-slot** (replaces the ghost — no `.clip-ghost` in this card) | **155, width 105 = the selected timeline span** (`.fit-slot` `:343-353`): 2px dashed `#646464`, a **dimmed source frame** (`brightness(.45)` `:354-361`), a 26px slot-title bar (`.slot-title` `:362-375`) | **the 4-point shape**: marked source range → selected timeline span; the slot keeps the span's duration EXACTLY |
| **speed badge** | **"1.7x"** on the slot (`:700-706`; chip styles `:378-395` = **B5**) | **the rate law: 175 / 105 = 1.667 → "1.7x"** — speed = markedDuration / targetDuration; one decimal, lowercase x; the 1x-vs-1.7x **contrast is the affordance** |
| turtle | **ABSENT — no turtle div, no CSS rule** | the fully-contained covered clip is removed (overwrite-style placement into the span) |
| surf | 270 (Δ+10 = rendering gutter, not semantics) | no downstream movement |
| right-arrow | `display:none` (`:339`) | no push |

Laws: retimed placement into the selected span; **speed auto-computed = marked range ÷ target span**; the slot's duration is the span exactly; placement is overwrite-style (covered clip removed); no downstream movement.

### 1.7 The cross-card grammar (the tokens the corpus already registers)

Ghost **z-4 slot** (insert/replace/append) vs **z-8 cover** (overwrite/ripple) — z-order IS mode semantics (`:266/:279/:305/:316/:325`); down-arrow **ghost-centered in every card** (234.5/234.5/210.5≈/474.5/234.5/199.5+8=207.5 — measured, never playhead-anchored); right-arrow **only where downstream moves** (insert `:270-275`, ripple `:327-332`; `display:none` in the other four `:283/:309/:318/:339`); the dual-pane replace out-trim (`:288-304`); the inactive-dim + active-source treatment (`:162-168`/`:207-218`); the badge chip (`:378-395`). All of this is verbatim-registered at **05 §8A:623-627** (structural) + **18 §9:420-423** (theme tokens B1/B4/B5/B2/B3/B6) + the R25 extraction `audits/fleet-r25/xcut-visual-grammar.md:29-35` (B1-B7).

### 1.8 What the HTML does NOT teach (the honest negative census)

The cards are **happy-path, single-track, single-source diagrams**. NOT present anywhere in the 743 lines: **empty track** (append's "empty ⇒ 0" case), **locked track**, **audio/video linked pairs**, **transitions**, **multi-clip sources landing sequentially**, **refusal/error states** (no rate domain, no unfillable source), **track-kind routing** (one generic row of clips; the source row floats above). The task's expected edge-case list is corpus territory, not mock territory: 06 owns them (§2 rows below). The mock's ONLY numbers-vs-semantics teaching beyond the six descriptions is the badge arithmetic (1.7x) and the pixel deltas (push = source duration; ripple Δ = new − old; replace = 0).

---

## §2 The coverage audit — every HTML-taught behavior vs its spec home + code reality

Verdicts at sub-spec depth. "Code reality" at the R27 pins. **No P1s: nothing the HTML teaches contradicts landed law** (§4); the P2/P3s are divergences between landed law and the reference/mock implementations, plus reference-card quality defects.

| # | HTML behavior (line) | Spec home (§/line + quote) | Verdict | Code reality (file:line @ pin) | Sev |
|---|---|---|---|---|---|
| 1 | The six-mode family, one-shot (not persistent) `:402-409` | 16:196 "The source-edit modes … are **NOT tools**: they are one-shot **source-mode operations**"; 18:175 "7 one-shot edit functions … no radiogroup, no `aria-pressed`, no persistent mode" | **COVERED** | variants `SourceEditBar.tsx:66-76` (7 modes = the reference six + placeOnTop per `nle_edit_workflow §3.4`, noted at :37-38); the tab switcher itself is a mock-only didactic | — |
| 2 | Insert: place at playhead `:426-427` | 06 §5.9 :1488 "**Insert-edit** — the DaVinci source-mode splice: split-at-playhead + intrinsic downstream push"; 16:267 (`,` row) | **COVERED** | engine `timeline.ts:5630` `performInsertEdit` (was :4702 at the R25 pin — spec line# stale); UNWIRED off the 19-op INTERNAL surface (`headless/api.ts:2045-2065` — absent from `EDIT_OPERATION_NAMES`); OT: no insert-edit (placement only, `timeline-core.ts:887`) | P3 (06:22 line# + "E1 open" cell stale — see §4.7) |
| 3 | Insert: "pushes everything else down to make room" `:427-428` | 06:1488 "the splice's push is INTRINSIC, never flag-routed"; 15:749-759 the P11 re-key ("the flag NEVER produces an insert-edit push") | **COVERED** | engine `_performInsertEditImpl :5647` (Phase 2 shift); OT's `insert` verb = placement-only (reject-not-shift, `timeline-core.ts:887` + `:2726` "REJECTED, NOT SHIFTED") | — |
| 4 | Insert: the mid-clip split law — "it will split the clip and place the new clip in the middle" `:428-430` | 06:1490 (D31.2): "splits that clip at the playhead, places the source between the halves, shifts the right half and everything after by the source duration; **the left half NEVER moves**" | **COVERED** (the HTML's "in the middle" = between the halves; consistent) | engine: E1 FIXED R26 — the linked path splits straddling companions at the insert frame (`timeline.ts:5730-5773`, the ≥2-splits relink pass :5679-5684); pinned `tests/vitest/engine/timeline-linked-source-edit.test.ts:78-267` (4-postcondition :79, relink :122, `linked:false` :150, unlinked :169, exclusion clause :186, companion-abort :233) | — |
| 5 | Insert: ghost at playhead z-4 (a slot) `:265-266` | 05 §8A:624 "z-4 normally, z-8 when overlaying covered clips" | **COVERED** | variants `insertPlan.ts:306-309` ghostOf → `insert-preview-ghost` (Timeline.tsx:1535); preview==commit pinned (`insertPlan.test.ts:514-576`) | — |
| 6 | Insert: right-arrow = push token `:270-275` | 05 §8A:623 "push-right ⇔ the plan displaces downstream"; 06:1490 | **COVERED** | variants `insertPlan.ts:498` `arrows = { down: true, right: displaced.length > 0 }` (test-pinned) | — |
| 7 | Overwrite: "writing over whatever clip or clips were there before" `:475-480` | 06:1573 "place a new clip at the playhead … writing over whatever clip or clips were there before — cover, not push"; the 4-case covered-clip table 06:1577-1583 | **COVERED** (HTML draws 2 of the 4 cases: fully-contained turtle, head-straddle surf) | engine `_performOverwriteEditImpl :6023` (four-case scan :6112-6244, re-run-until-clean law); variants `insertPlan.ts:469-471` (`coveredSpans` + `planOverwriteSpans`); pinned in E2 suite `timeline-linked-source-edit.test.ts:269+` | — |
| 8 | Overwrite: zero downstream movement (right-arrow `display:none` `:283`) | 06:1585 "**Zero downstream movement** — nothing shifts, anywhere; the timeline duration is preserved or shortened"; 06:1609 (the token law, replace's row) | **COVERED** | variants :498 (right:false for overwrite — pinned); engine: no shift in the overwrite path | — |
| 9 | Overwrite: ghost z-8 covers the victims `:279` | 05 §8A:624 (the z-8 cover clause) | **COVERED** | variants ghost z-order per mode (Timeline.tsx render layer) | — |
| 10 | Replace: "exact same length" `:530-532` | 06:1604/1607 (D31.4): "the postcondition set: `newClip.from == target.from ∧ newClip.duration == targetDur ∧ every downstream element unchanged`" | **COVERED** (spec) / **code ABSENT** | engine: NO `performReplaceEdit` (grep-verified; the 3-point family ports insert+overwrite only); OT: drop-on-clip replace is the deliberate SD-5 no-op (`drag-drop-controller.ts:354-359` per 06:1619); variants implement the WRONG law (RE-2): remove+overwrite at the source's OWN duration + downstream trims (`insertPlan.ts:311-340`) — its own tip (SourceEditBar.tsx:72 "one of the exact same length") and 06:1607 both contradicted | **P2** (RE-2, known-open — re-verified at R27) |
| 11 | Replace: "The 'out' point … will be changed so it fits perfectly" `:532-534` (the 4th point auto-derived — 3-point arithmetic) | 06:1608 "the source's OUT is DERIVED, never honored — `sourceEnd' = sourceStart + timelineToSourceFrames(targetDur, …)`; the IN point is untouched" | **COVERED** (spec) | engine `timeline-math.ts:151` `timelineToSourceFrames` (the shared law — no replace op consumes it); 15:4918 the r1 verb row carries `sourceEnd` in the result echo | — |
| 12 | Replace: the dual-pane out-trim visual `:288-304` | — (no home: 05 §8A registers the ghost-width tell B7, NOT the dual-pane source-preview token) | **PARTIAL** (semantic covered by row 11; the visual sub-token unregistered) | nowhere implemented (variants ghost carries no dual-pane) | **P3** (fold into 05 §8A or register as a SourceRangeBar affordance — 18:176) |
| 13 | Replace: right-arrow hidden `:309` | 06:1609 "the right-arrow grammar token is hidden for this mode" | **COVERED** | variants replace branch `:335` `arrows = { down: true, right: false }` | — |
| 14 | Replace: **the card's own diagram** (turtle@260 "Sunset.mov" `:548`, surf@365 — a +105 downstream shift; §1.3 above) | 06:1607 "every downstream element unchanged" | **CONTRADICTS ITS OWN TEXT** (the mock card, not the corpus) | — | **P3** (reference-mock quality; fix the card or annotate; §4.7) |
| 15 | Append: "after the last edit … regardless of where the playhead is located" `:578-580` | 06 §5.9D :1624/1629 "**The playhead is IGNORED** — the op reads neither `currentTime` nor any pointer-derived time"; per-track tail :1627 "`t₀ = max(0, max over target-track elements of (startTime + duration))`; empty track ⇒ 0" | **COVERED** (spec) / **code ABSENT** (OT/app) | variants `insertPlan.ts:413-414` (the per-track tail reduce — one of 06's two cited in-corpus witnesses); mini `useMini.ts:1055` + `geometry.ts:50`; OT: no `{type:'append'}` strategy — wire exposes only `firstAvailable \| explicit` (`api.ts:1297-1307`); app: no append surface | P2→r1 (AP-1/AP-2, known-open) |
| 16 | Append: "add multiple clips from the media pool … all at once" `:581-582` | 06:1628 "the pool's canonical display order filtered by the selection, sequentially accumulated — `t_{i+1} = t_i + dur_i` … ONE history entry" | **COVERED** (spec) / **PARTIAL** (code) | OT's library multi-insert landed D-ARCH-6 (`view/page.tsx:535-603`) but is **playhead-anchored staggered `firstAvailable`**, NOT tail-append: the one-entry-per-kind law ✓ (insertBatch `api.ts:1262-1370`), the append point ✗ (06:1638's AP-1 cell is now doubly stale — scout-ot's P1) | P2→r1 (AP-1) |
| 17 | Append: right-arrow forbidden `:318` | 06:1630 "**Never a push:** … the ripple parameter is inapplicable (fixed false BY LAW, not by default)" | **COVERED** | variants append branch (no displaced set) | — |
| 18 | Ripple: "replaces a shot of one length with a shot of a different length" `:628-629`; ghost keeps the source's own width (175, `:324-325`) | 06 §5.9E :1643/:1646 "the source lands at `t.start` with **its own duration** (NO out-adjustment — that is §5.9C's law)" | **COVERED** (spec) / code: the variants' ghost width ✓ but the branch is span-form (row 20) | engine: private signed-shift machinery `rippleTrimItem :3132` (+ sync-lock propagations) — no public surface; no op | P2→r1 (RO-1/RO-2) |
| 19 | Ripple: "push everything down … shorter clips pull things in so there are no gaps" `:629-632` + surf's Δ+70 (`:323`) | 06:1646-1647 "**delta = newDur − oldDur** shifts every downstream element … push if positive, PULL if negative. … the pull leaves no gap: `firstDownstream.start + delta == source.end` by construction" | **COVERED** (the HTML's text is nearly verbatim 06:1643; only the push is drawn — the pull is text-only, consistent with 05 §8A:623's stated-inference + D33.4 inversion ruling) | variants: **push-only** — `delta = dur − covered ≥ 0` by construction (`insertPlan.ts:472-484`); a shorter source head-trims the target = plain-overwrite behavior (RO-3, known-open; re-verified) | **P2** (RO-3, crawl — re-verified) |
| 20 | Ripple: the covered target stays in place under the covering ghost `:322/:325` | 06:1646 "the target span is fully vacated" (via §5.9B's covered-clip law) | **COVERED** | engine `_performOverwriteEditImpl` (the removal semantics); the card's z-8-over-z-5 rendering matches | — |
| 21 | Fit-to-fill: "the portion of the clip that you have marked" + "the space you have selected on the timeline" `:682-685` (the 4-point shape) | 06:1662 §5.9F title "the 4-point retime fill"; :1667 "the source window = the FULL marked range (`sourceStart = markedIn`)"; 18:176 (SourceRangeBar: "the marks feed the 3-point edit ops as caller-supplied params") | **COVERED** | variants `insertPlan.ts:348-350` (`srcDur = ctx.sourceRange ? end − start : duration` — the marked range, R22 #84/#85); `SourceRangeBar.tsx` + 8 pins | — |
| 22 | Fit-to-fill: "speed change … automatically calculated so it fits" — **1.7x = 175/105** (`:700-706`) | 06:1667 "**speed = markedDuration / targetDuration** — a LONGER marked range into a SHORTER span speeds UP"; :1671 "The badge: one decimal, lowercase x — '1.7x' (the reference mock's form; the full precision lives in the element's rate field)" | **COVERED** (spec) | variants: the rate ✓ (`:354`), the badge ✗ — `Timeline.tsx:1702` renders `g.speed.toFixed(2)}×` ("1.67×") vs the law's "1.7x" (known G14, still open at R27); engine `calculateSpeed` `timeline-math.ts:133` + `rateStretchItem :3840` (the fixed-span derive :4076-4110); OT `retime.ts:51` `getTimelineDurationForSourceSpan` (the inverse, :51-62) | **P3** (badge precision — known-open) |
| 23 | Fit-to-fill: the slot = the span EXACTLY (105) + covered turtle removed (no turtle div) | 06:1667 "The result's timeline duration = `targetDuration` EXACTLY (frame-snapped)"; :1669 "Placement: overwrite-style into the selected span — covered clips split/trim per §5.9B's law; NO downstream movement" | **COVERED** | variants `:369-375` (`startTime: snapToFrame(loop.start)`, `duration: snapToFrame(span)`, overwrite spans planned, `arrows right:false`) | — |
| 24 | Fit-to-fill: the acceptance domain + refusal | 06:1668 "**The acceptance domain is [0.1, 5]** … Out-of-domain REFUSES with `INVALID_PARAMS` — **never clamps** (a clamped fit silently violates exact-fill)" | **COVERED** (spec) / **the reference impl DIVERGES**: variants clamps at **[0.01, 5]** (`insertPlan.ts:354` with `trimLaws.ts:32-33` `RATE_MIN=0.01`) and refuses only outside THAT — the 0.01-0.1 band is accepted by the mock and refused by the law | **P2** (new filing — see §4.8; the FF-1/FF-2 rows cover the OT landing + the §11.7 cross-note, NOT the mock's own domain) |
| 25 | The 1x badge on the source (`:710-716`) — the contrast affordance | 05 §8A:626 "rendered on the fit-slot AND on the source pool clip — the '1.7x' vs '1x' contrast IS the affordance" | **COVERED** | variants: the slot badge ✓, the source-identity badge ✗ (not rendered) | P3 (cosmetic; rides the G14 fix) |
| 26 | Down-arrow ghost-centered (all six cards — measured :269/:282/:308/:317/:326/:338) | 05 §8A:623 "down-arrow ⇔ every source-edit mode, GHOST-CENTERED (never playhead-anchored)" | **COVERED** | variants `Timeline.tsx:1654-1662` | — |
| 27 | The badge chip / ghost outline / arrow / source-active token VALUES (`:221-229`, `:378-395`, `:207-218`, `:251-258`) | 18 §9:420-423 (`--ghost-outline #646464 dashed B1/B4`; `--badge-chip-*` B5; `--overlay-arrow` B2/B3; `--source-active-border #6ba4d8` B6) — verbatim | **COVERED** | landing surface = OT's CSS-variable mechanism at r1 (18:425, D33.5) | — |
| 28 | The 3-point/4-point arithmetic family-wide | 06:1588 ("the 3-point shape: duration = `sourceEnd − sourceStart` … placed at the overwrite frame"); :1608 (out-auto-adjust); :1662-1667 (the 4-point) | **COVERED** | engine `_buildSourceEditClip :6341` (the 3-point shape, `max(1,…)`) | — |
| 29 | Edge cases: empty track / locked / linked A/V / transitions — **NOT IN THE HTML** (§1.8) | 06:1627 (empty ⇒ 0); :1639/:407-411 (TRACK_LOCKED; "a companion on a LOCKED track never enters the closure"); :413-426 (the D32 fan-out table — insert :421, overwrite :422, replace :423, append :424, ripple :425, fitfill :426); :1586 (R1-B4 transition abort); :1631 (linked-append atomic refusal) | **COVERED corpus-side** (the HTML's silence is benign — the corpus is the edge-case home) | engine: the R1-B4 abort paths live (:5726/:5772/:5855/:6181 — **still the silent empty return**, OW-3's "not wire-able" filing stands); insert/overwrite/append TRACK_LOCKED gates ✓ (`timeline.ts:5660`; OT `api.ts:1290-1296`) | — |
| 30 | Keys/buttons surface (implied: the modes are user-invocable one-shots) | 16 §3.4A: `,` :267 / `.` :268 / `⇧⌥.` :269 / `E` :270 + F9-F12 alternates :278-281 + replace/fit-to-fill button-first :285 ("Fit-to-fill has no key by design — DaVinci's own posture"); §6.1 row 2 :635 + rows 19/20 :652-653 | **COVERED** (all (r1-scheduled) verb shapes; the `,`/`.` rows ratified via the variants' C46) | variants `shortcutMap.ts:58-63` (the source-mode rows); `SourceEditBar.tsx` (roving tabindex); dormant in every shipped shell (18 §8.5 defers dual viewers to v2) | — |
| 31 | The wire surface for the family | 15 §4.3.9 :739-791 (InsertCommand — placement-only, the P11 re-key :749-759) + §13.15's four r1-scheduled verb rows :4918 (replace) / :4919 (append) / :4920 (ripple-overwrite) / :4921 (fit-to-fill) + the insertBatch endorsement :4916 | **COVERED as schedule** — but :4916 is now **stale**: insertBatch LANDED (OT `55c81c0`/code `970948a`, `api.ts:1262`) | OT: `timeline.insertBatch` one-entry law + refs echo + F1A-3 + intra-batch CONFLICT whole-batch (`api.ts:1262-1370`); census 31 = 28 routed + 3 exceptions (`api.ts:243-275`, `:328-335`); app: NO consumer yet (grep-verified — the pool multi-insert rides the filed re-pin, scout-app:83) | P1→filed by scout-ot (15:4915/4916 QUEUED→LANDED; 06:1638's pool-batch cell) |

**Summary:** of the 31 behaviors the HTML teaches, **27 COVERED** at sub-spec depth (every one with a §/line home), **0 GAPs in the corpus**, **4 open implementation divergences** (RE-2 replace's wrong law, RO-3 ripple's unreachable pull, FF-domain [0.01,5] vs [0.1,5], the badge precision) + **2 reference-quality defects in the HTML itself** (the replace card's geometry; §1.3) + the wire/matrix doc-drift batch the W1/W4 agents own.

---

## §3 The no-man's-land register — what has NO implementation anywhere (verified at the R27 pins) and the build-it-ourselves contracts

Cross-checked live against the D30 matrix (06 §0 :22-27) — **the matrix's verdicts still hold at R27**, with three freshness exceptions noted in §4.7. The user's "no man's land on advanced timeline edit features" is exactly these four absent families plus the two unwired landed algorithms; the leverage base ("fully leverage what's existing") is the engine's 3-point family + OT's routed verbs + the variants' tested planner.

| Mode | Engine (f9ac806) | OT (55c81c0/970948a) | App (c020b2a) | Reference (variants/mini) | The implementable contract (preconditions → semantics → acceptance pins) |
|---|---|---|---|---|---|
| **Insert-edit** | **LANDED, UNWIRED** — `performInsertEdit :5630` (+ E1 fixed & pinned) but absent from the 19-op INTERNAL surface (`headless/api.ts:2045-2065`) | placement-insert only (`timeline-core.ts:887`, reject-not-shift; `insertBatch` = the batch placement, one entry) | pool-DnD placement + split (`use-timeline-drag-drop.ts:89-133` — `timeline.insert` explicit-strategy; `insertElementOnNewTrack` core-direct) | `insertPlan.ts:424-468` (split+push, pushedRight guard, arrows) | r1 port (D12.3): split-at-playhead → push right half + downstream by sourceDur → left half pinned; ONE undo; R1-B4 abort as `INVALID_PARAMS` (E3's fix — the silent `:5726/:6181` returns are not wire-able). Pins: the E1 suite carried + the four postconditions (06:438). |
| **Overwrite-edit** | **LANDED, UNWIRED** — `performOverwriteEdit :6007` (E2 fixed & pinned :6023) | ABSENT (the phantom `placement:'overwrite'` rows retired R25, P2/P6) | ABSENT | `insertPlan.ts:469-471` + R20-W2 (the only full impl per 06:23) | r1 port (OW-1): the 4 overlap cases + zero-shift + remnant survival + one-entry undo; the four-case vitest family; the abort classified `INVALID_PARAMS` (OW-3). |
| **Replace** | **ABSENT** (no `performReplaceEdit`) | ABSENT (drop-on-clip = the deliberate SD-5 no-op) | ABSENT | variants WRONG LAW (RE-2) — the only impl contradicts the spec 3× | **Dedicated op** (D31A — transition-remap + sever need atomicity): preconditions = a single resolvable target (N15: selection → playhead-clip on focused track → main; 06:1613) + a fillable source (`getAvailableSourceFrames ≥ targetDur`, `timeline-math.ts:190`); semantics = vacate + refill at `target.from`, `duration = targetDur`, out DERIVED (:1608), transitions REMAP (joinItems pattern `timeline.ts:7411-7427`), companion SEVERED (`linked:false`); refusal = `INVALID_PARAMS` unfillable / `NOT_FOUND` no target / `TRACK_LOCKED` (15:4918's envelope). Pins: exact-length, no-move, undo atomicity, transition survival, companion untouched (06:1619). |
| **Append at end** | ABSENT | **ABSENT as a mode** — no `{type:'append'}` strategy (`api.ts:1297-1307`: firstAvailable \| explicit only); the multi-insert that DID land is playhead-anchored (`view/page.tsx:535-603`) | ABSENT (no multi-insert consumer — grep-verified; the design is filed, scout-app:83) | variants `:413-414` + mini `useMini.ts:1055`/`geometry.ts:50` (real per-track tails) | **Composite** (D31A): the 6th `PlacementStrategy {type:'append', trackId?}` + `insertBatch{placement:'append'}` (the vehicle LANDED at D-ARCH-6 — AP-1's one-entry half is satisfied, the append-point half is not); server-side resolution: per-track `t₀ = max(0, Σ ends)`, sequential accumulation inside the apply, playhead never read; linked-append: same startTime both tracks, atomic refusal on audio conflict (06:1631). Pins (AP-2): append-at-track-end, playhead-ignored, multi-append order + one-entry, linked sync + atomic refusal, empty-track→0. |
| **Ripple overwrite** | primitives only — `rippleTrimItem :3132` + both sync-lock propagations, PRIVATE (RO-2) | ABSENT | ABSENT | variants push-only (RO-3) | **Composite** (D31A): `delete → move → insert` in ONE `applyBatch` (all three verbs ROUTED today — the composite is available at crawl/K3 per 06:1651; RO-1): delta = new − old, push/pull symmetric, pull gap-free, zero-floor, transitions drop, incoming unlinked. The verb decision (15:4920): a replace-placement carrying the DELTA-law ripple flag — "one boolean cannot mean both" (:1652). Pins: a shorter source → full replacement + left shift + no gap (the missing pull test, RO-3's acceptance). |
| **Fit to fill** | math only — `calculateSpeed :133`, `rateStretchItem :3840` (the fixed-span derive :4076-4110) | math only — `retime.ts:51` (the inverse); no verb computes rate from a duration | ABSENT | variants tested planner branch (:342-381) — the only implementation of the mode anywhere | **Composite** (D31A): `insert + updateElements{retime}` in one `applyBatch` (both verbs ROUTED — 06:1672); the 4-point contract: speed = marked/target, duration = snap(target) EXACTLY, window = full marked range, domain [0.1,5] + `INVALID_PARAMS` refusal never clamp (06:1668), pair = same rate both streams ONE commit (audio via WDC's sealed varispeed — no new audio work). Pins (FF-1): the 37 per-mode pins re-expressed OT-side + the A/V pair sync + the refusal law. |

**The leverage verdict for the user's directive** ("implement these ourselves but fully leverage what's existing"): the engine's `performInsertEdit`/`performOverwriteEdit` (now E1/E2-fixed and mutation-pinned) + `rippleTrimItem`'s shift machinery + `calculateSpeed`/`rateStretchItem` + OT's routed `insert/move/delete/updateElements/applyBatch/insertBatch` + the variants' preview==commit planner are together ~80% of the algorithmic surface for all six modes; what is genuinely greenfield is (a) the replace op's remap/sever atomicity, (b) the append placement resolution, and (c) the wiring (wire verbs + UI) — exactly the r1 wave Decision 12.3/D30.2 already schedules.

---

## §4 The D31/D32 contradiction check + recommendations

**The verdict: ZERO P1s. The HTML contradicts nothing in the landed D31/D32 law.** Point-by-point:

1. **The mid-clip split law (D31.2)** — HTML:428-430 "it will split the clip and place the new clip in the middle" vs 06:1490. ✅ Consistent ("in the middle" = between the halves; the card doesn't draw the split case, so no geometry to contradict). The engine now implements it in BOTH paths (E1 fixed; `timeline.ts:5730-5773` + the pinned suite).
2. **The left-half-never-moves clause** — not drawn by any card (all insert-card clips start at/after the playhead). ✅ No contradiction; the corpus carries it (06:1490) and the E1 exclusion-clause pin enforces it (`timeline-linked-source-edit.test.ts:186`).
3. **The companion fan-out rows (D32)** — the HTML teaches NOTHING about A/V pairs (§1.8). ✅ No contradiction possible; the fan-out table (06:421-426) is the sole authority and is mock-free.
4. **The delta law's push/pull (D31.6)** — HTML:629-632 is nearly verbatim 06:1643. The card draws only the push (right-arrow + Δ+70); the pull is text-only — already registered as the stated inference with the D33.4 arrow-inversion ruling (05 §8A:623). ✅ Consistent.
5. **The fit-to-fill domain (D31.7)** — the HTML is silent on rate limits; its 1.7x sits inside [0.1,5]. ✅ No contradiction in the reference. ⚠ The VARIANTS' acceptance domain diverges (§2 row 24).
6. **Replace's out-auto-adjust (D31.4)** — HTML:532-534 vs 06:1608. ✅ Verbatim-consistent (the dual-pane visual is the same law drawn).
7. **The two documented inconsistencies that DO exist** (both sub-P1, both filed above): (a) **the replace card's own geometry** contradicts its own text + 06:1607 (§1.3, §2 row 14 — P3 reference-quality); (b) the landed-law vs reference-impl divergences (RE-2/RO-3/G14 + the new FF-domain row) — mock-side, none spec-side.
8. **NEW FINDING (P2) — the variants' fit-to-fill domain:** `insertPlan.ts:354` clamps `srcDur/span` at `[RATE_MIN=0.01, RATE_MAX=5]` (`trimLaws.ts:32-33`) and refuses only outside that — but the landed law pins the fit-to-fill acceptance domain at **[0.1, 5]** (06:1668: "the 0.01-0.1 band is fit-to-fill-invalid because it is engine-freecut-clamp-unsafe"). A marked-range/target-span ratio of, say, 0.05 is ACCEPTED by the mock (toast "rate-clamped laws, spec 06 §5.8") and REFUSED by the spec. The FF-1/FF-2 gap rows cover the OT-side landing and the §11.7 cross-reference but not this mock-side alignment. **File as the FF-3 row** (owner S-app, with RE-2's r1-adjacent wave; acceptance: the fitToFill branch uses a fit-specific floor 0.1 — the generic retime paths keep 0.01 — + a 0.05-ratio refusal test; also fix the branch's stale "spec 06 §5.8" toast citation → §5.9F).

### Recommendations (for the W2b fold / W4 cross-cuts)

- **R1 (mock-alignment batch, one S-app crawl item):** RE-2 (replace's wrong law), RO-3 (ripple's unreachable pull), the FF-3 domain row, the G14 badge precision (`Timeline.tsx:1702` → one decimal, lowercase x), the missing source-side "1x" badge, and the **stale composite-map header** `insertPlan.ts:22-27` ("insert = insert{ripple:true}", "rippleOverwrite = rippleDelete+insert" — both now explicitly non-law per 15:749-759 P11 and 06:1651, which calls the rippleDelete+insert mapping "broken in both directions"; 06:1672 cites only the :26 fitToFill row, which is correct). One wave, six fixes, the planner's own tests carried.
- **R2 (06 §0 D30 matrix refresh — W4 xcut-matrix):** the insert row's cell still reads "`performInsertEdit` :4702 (splice+push; **the E1 linked defect open**)" (:22) while §5.0's E1 row in the SAME FILE says FIXED (R26, :438) — an internal contradiction; the line numbers moved (:4702→:5630, :4860→:6007 — the whole §5.9-family engine citation set re-pins per scout-engine); the OT column gains insertBatch; the app column's pool-batch note (06:1638) is stale per scout-ot.
- **R3 (15 §13.15):** the :4916 insertBatch row flips QUEUED→LANDED (scout-ot's P1) — and with it, AP-1's "rides insertBatch's endorsed slot" phrasing becomes "rides the landed insertBatch" with only the append-strategy half still open.
- **R4 (the reference HTML itself, optional one-commit fix):** correct the replace card (delete the stray `.clip.turtle` div at `:548`, restore surf to 260, keep ghost+sunset at 155 w105) and annotate the ripple pull (the D33.4 left-arrow) — keeps the pinned B1-B7 reference honest for the r1 carrier work. Register the dual-pane replace token (§2 row 12) in 05 §8A while there.
- **R5:** no spec-text changes are REQUIRED by this audit — the corpus (06 §5.9-§5.9F + §5.0, 15 §13.15, 16 §3.4A, 18 §4.3/§9, 05 §8A) already covers every behavior the HTML teaches, at the sub-spec depth demanded. The work is all in the r1 ports, the mock alignments, and the doc-drift refreshes above.

*Evidence chain: the HTML (743 lines, read in full) · 06-nle-ops.md:407-438, 1484-1679, 14-29 · 15-wire-protocol.md:739-791, 4899-4921 · 16-keyboard-shortcuts.md:192-196, 259-285, 635-653 · 18-ui-shell.md:33, 175-176, 412-425 · 05-timeline.md:599-632 · engine timeline.ts @ f9ac806 (:3132/:3324/:3840/:4956/:5097/:5479/:5630/:5647/:6007/:6023/:6341/:8235/:8652; timeline-math.ts:51-208; headless/api.ts:2045-2065; tests/vitest/engine/timeline-linked-source-edit.test.ts:78-371) · OT timeline-core.ts:887-946/:2726 + api.ts:243-357/:1262-1370 + view/page.tsx:535-603 + ops/retime.ts:12-62 @ 55c81c0 · app use-timeline-drag-drop.ts:36-133 @ c020b2a · variants insertPlan.ts:22-27/:44/:306-505, trimLaws.ts:32-33, SourceEditBar.tsx:13/:37-38/:66-76, Timeline.tsx:1675-1702, useUiStore.ts:1360-1387, useInsertPreview.ts:20-40, shortcutMap.ts:58-63 · audits/fleet-r25/{xcut-visual-grammar, mode-*}.md · audits/fleet-r27/{scout-engine, scout-ot, scout-app}.md.*

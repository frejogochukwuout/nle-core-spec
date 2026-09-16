# Mode audit — SLIP TRIM (Fleet R25, DaVinci edit-mode series)

**Auditor:** R25 mode fleet, slip-trim focus (one mode, verified deeply) · **Date:** 2026-09-09
**Mode source of record:** `ui-mock/trim_edit_modes.html` `#view-slip` (:554-621) + its CSS (:212-297)
**Corpus:** specs 00/05/06/15/16/18 · code: nle-engine (timeline.ts, headless/api.ts, app/page.tsx), opencut-timeline (src), nle-test-app (engineService + timeline-port), nle-ui (store/shortcuts/router), ui-mock/shell-mini, ui-mock/shell-variants
**Read-only audit — no repos modified, no commits.**

---

## 1. Mode card (verified + refined against the mock)

**Caption (verbatim, trim_edit_modes.html:566-570):**
> Slipping changes the portion of a clip that you see in the timeline by moving its "in" and "out" points. The white outline shows the full source clip duration, so you can fine tune it without affecting the surrounding edit.

**Semantics:** the clip's timeline slot is FROZEN (position + duration unchanged); `sourceStart`/`sourceEnd` shift by the same δ; legal δ clamps to the source bounds `[0, sourceDuration − clipDuration]`. Never neighbor-bound — "without affecting the surrounding edit" is the mode's defining invariant.

**Visual-grammar inventory (mock-exact; the audit's core value):**

| # | Element | Mock implementation (class / instance geometry / line) |
|---|---|---|
| 1 | **White source-duration outline** | `.white-box` — 4px solid `#fbfdff`, radius 10, z-8, pointer-events:none (:268-276). Instance `left:278 top:97 440×131` (:590), wrapped around the active clip's fixed slot (432→590). 440px ≈ 2.8× the 158px slot: head region 154px (~18f), tail 128px (~15f) at the ruler's ~8.2px/frame. Covers the thumbnail band only, not the title bar. |
| 2 | **Bright in-point preview frame** | `.preview-frame` — overflow:hidden, z-9 (:278-283). Instance `282/101 148×123` (:592-594), inside the outline's HEAD region, sized ≈ the clip window (148 vs 158px) — reads as "the slipped window parked at its new in-point" (a full leftward slip illustrated). NOT dimmed — bright. **Refinement vs the task card:** the dimming belongs to the *neighbor*, not the preview; and the mock paints the preview with the *neighbor's* scene art (`#sc-bird`, same symbol as Bird.mov) — an authoring artifact; semantically this frame should depict the slipped clip's own source at the new in-point. |
| 3 | **Active-clip treatment** | `.red-border` — 3px solid `#e2403c`, radius 9, z-10 (:223-224) — on Sunset.mov, narrowed to 158px, thumbnail stretched (`thumb-stretch`, `preserveAspectRatio="none"`). Plus **soft green glows** `.glow-l`/`.glow-r`: 15px wide, `blur(3px)`, green gradient `rgba(124,216,38,.7)→rgba(166,242,74,.95)`, spanning only the thumbnail height (`calc(100% − 32px)` — the title bar is excluded; its label is `title-pad`-padded 26px to clear the glow) (:247-264, :596-601). Note: distinct from roll/ripple's crisp `.green-edge` (18-21px, unblurred, box-shadow) — slip's grammar is the SOFT BLURRED variant, on BOTH in and out edges. |
| 4 | **Neighbor dim** | Left neighbor Bird.mov `.dim`: 42% black overlay over the image, muted border `#4a5a6e`, muted title (:212-221, :581-587). The slipped clip itself is NOT dimmed. |
| 5 | **In/out direction arrows** | Two `.arrow-svg`, z-11, INSIDE the outline: head-region arrow (320,153) **points LEFT**, tail-region arrow (619,153) **points RIGHT** (:612-619) — they **DIVERGE**. Refinement: a slip moves in+out co-directionally, so diverging arrows cannot be "the slip direction"; they read as **headroom/tailroom range indicators** (how far the window can slip each way) or as in/out edge markers. Semantic unpinned — flagged (G-SLIP-1). |
| 6 | **Slip cursor** | Bracket-pair + two diverging arrows (left AND right inside one cursor), 74×74 white, drop-shadow, over the clip's thumbnail center (474,129), z-12 (:603-609) — the DaVinci slip-tool cursor. The tab header icon is the same glyph (:557-562). |
| 7 | **Context dressing** | Ruler timecodes `01:00:02:00`/`01:00:04:00` at 136/522, grid lines at 124/510 — shared with the roll/ripple/slide views (a 2-second window, ~193px/s). |

---

## 2. Spec sweep — every row governing slip

**KEY QUESTION: does ANY spec row define the slip OVERLAY VISUAL GRAMMAR (white full-source outline, in-point preview frame, red border, soft glows, arrows)?**
**Answer: NO.** The normative specs pin semantics only. The closest rows are 05's *FreeCut code-reference* rows (posture: reference, not contract):

- 05:1384-1385 — `tool-operation-overlay.tsx` (61 LOC, "bounds-box overlay rendered during trim/ripple/roll/slip/slide/stretch") and `tool-operation-overlay-utils.ts` (553 LOC, "Pure math for `getTrimOperationBoundsVisual`, `getSlipOperationBoundsVisual`, etc."). What is pinned: a **generic bounds box** exists during slip, geometry computed by a named pure util. Not pinned: what the box shows (source duration vs neighbors), style, z-order, preview frame, colors, arrows.
- 05:1374 — `edge-halos.tsx` (76 LOC) "soft glow on the active edge during trim/roll/slip/slide". A soft glow is *mentioned* — edge, color, size, both-edges-vs-active-edge all unspecified, and this is a reference row for FreeCut's tree, not a normative grammar.
- 06:1159/1262 — `slip-edit-overlay.tsx:23-87`: "4-up overlay with two large center panels (new IN/OUT after slip) and two small corner thumbnails (current IN/OUT baseline). Uses a 'virtual item' with shifted source bounds so `getSourceFrameInfo` seeks the correct slipped source time." This is the **viewer-side** (program monitor) grammar — a *different* DaVinci surface than the timeline-side white outline, and again a FreeCut reference quote, not a normative grammar.

The mock's timeline grammar (rows 1-6 of the mode card) is pinned **nowhere** in any spec (00/05/06/15/16/18 verified by full-file `slip` sweep + targeted `outline|halo|glow|preview` sweeps on 05).

### 05-timeline.md

| Row (file:line) | Quote/claim | Verdict |
|---|---|---|
| 05:21 (§0) | "Op-family variants slip/slide/roll/rateStretch + wave-2 … (**r1**; tests carried from nle-engine timeline.ts …)" | Port-scheduling row — no behavior. |
| 05:952 (§14.10) | "`tool-operation-overlay.tsx` (61 LOC) — overlay box during trim/ripple/roll/slip/slide/stretch. Position-only — the geometry math lives in `tool-operation-overlay-utils.ts`" | REFERENCE; the only timeline-side slip-overlay mention. |
| 05:957/966/972 (§14.11) | `use-timeline-slip-slide.ts` (1291 LOC): `SlipSlideState` :50-60; snap `useSnapCalculator`; linked `getMatchingSynchronizedLinkedCounterpart`; commit `slipItem`/`slideItem`; "clamps with `computeClampedSlipDelta` (slip) …; commits via `slipItem`" | REFERENCE — gesture hook shape. |
| 05:1141/1164 (§16.x) | `TimelineItem` wires 7 hooks incl. slip-slide; `use-timeline-slip-slide.ts` "transition-aware clamping :36-38" | REFERENCE. |
| 05:1236 (§16.5A) | Op-port table: "slip \| `:4143` \| 1 (A2) \| OT ops + invariant system + carried tests" | The r1 wave-1 destination — the convergence point. |
| 05:1366-1407 (§16.5B) | FC tree rows: `clip-cursor.ts` (cursor per tool), `edge-halos.tsx` :1374, `tool-operation-overlay.tsx` :1384, overlay-utils :1385, `use-active-global-cursor` :1392, `use-timeline-item-bounds` :1405 (displayed bounds under slip), pointer-dispatcher :1407 | REFERENCE (see key-question answer). |
| 05:1484 (§19 key table) | "Slip tool \| — \| `y` \| `y` \| FreeCut only (gated by `SLIP_SLIDE_TOOLS_ENABLED`)" | ALIGNED with 16:180/18:198. |

### 06-nle-ops.md (the algorithm home)

| Row | Quote/claim | Verdict |
|---|---|---|
| 06:80 (§4 op table) | "**Slip** \| Shift source in/out within fixed timeline position \| trim-actions.ts:576-639 (slipItem); slip-edit-preview-store; slip-edit-overlay; slip-utils (computeClampedSlipDelta) \| ❌ NOT IMPLEMENTED — port from FreeCut" | The OpenCut-side gap row. |
| 06:1151-1273 (§5.6) | Full FreeCut algorithm: type guard `video`/`audio`/`composition`; requires explicit `sourceEnd`; clamp loop over `synchronizedItems` (tightest); applies same clamped δ to anchor + companions; `applyTransitionRepairs`; `computeClampedSlipDelta` law `sourceStart+δ≥0`, `sourceEnd+δ≤sourceDuration` (undefined sourceDuration → forward slip unconstrained), `sourceEnd===undefined → 0`; preview store `slipDelta` in **source frames**; viewer overlay (4-up, above); "Transition compatibility preserved via `clampSlipDeltaToPreserveTransitions`"; multi-select = anchor + linked companions same clamped δ; command `execute('SLIP_EDIT')` | THE canonical algorithm. Note `clampSlipDeltaToPreserveTransitions` — FreeCut-only (see §4 delta 8). |
| 06:2218-2224 (§9 Q6) | "Slip propagates to linked companions with the same clamped delta"; no-op without source bounds | Confirms §5.6. |
| 06:2406 (§10.4) | "§5.6 Slip \| `:4143` \| `slip(clipId: string, deltaFrames: number, options: { linked?: boolean } = {}): void {` \| ALIGNED" | Engine row — verified against the source (exact signature). |
| 06:2436 | §5.5/5.6/5.7 "(absent — OpenCut never had them; still absent at `c15a629`, R24-verified) \| OT-GAP" | Confirmed this round by grep (src: zero matches). |
| 06:2979 (§13) | "Slip \| trim-actions.ts 576-639 \| sourceStart+δ≥0, sourceEnd+δ≤sourceDuration \| Yes (synced linked) \| 'SLIP_EDIT' snapshot \| n/a (timeline unchanged)" | Summary row, consistent. |
| 06:3145-3154 (§12) | Invariants `slip-shifts-source-only`; `slip-beyond-source-start-rejected`; `slip-beyond-source-end-rejected`; `slip-no-explicit-source-bounds-is-noop` | **Wording drift:** "rejected" — every implementation *clamps* (or refuses the whole nudge). See G-SLIP-3. |
| 06:3340-3341 | Test `keyboard-slip-comma-period` — `,`/`.` (slip tool active) slip ±1 frame via `{type:'slip'}`; "verifies the §6 disambiguation rule (same key, different op by tool-mode)" | Pinned nowhere in code (see §3). |
| 06:3411/354 | Slip among the drag-coalesced ops — `previewElements({updates})` → `commitPreview()`, no per-frame command pushes | Unimplemented (no drag slip in any repo except shell-variants' store-local gesture). |

### 15-wire-protocol.md

| Row | Quote/claim | Verdict |
|---|---|---|
| 15:193 | `SlipCommand` in the 78-member union | Shape row. |
| 15:301 (§4.1A) | "`roll`, `slip`, `slide`, `rateStretch` \| OT (op-port) \| NOT in OT (engine algorithms at timeline.ts:2984/4143/…) → **r1 wave 1**" | Routing disposition. |
| 15:342 (§4.2 map) | "`slip` \| `engine.timeline.updateElements({updates})` (source-only patch) \| ✅" | **Key routing law:** the wire slip is a source-only `updateElements` patch — NOT the engine's native `Timeline.slip()`. |
| 15:644-673 (§4.3.6) | `SlipCommand`: `elementId`; `delta: MediaTime` ticks ("Positive = shift source right… `startTime` and `duration` DO NOT change"); `syncLinked?: boolean` default true; constraints `trimStart+δ≥0`, `trimEnd+δ≥0 (≡ sourceEnd+δ≤sourceDuration)`; "must be `video`/`audio`/`image`"; no-op without explicit source bounds | **CONTRADICTION:** `image` included, `composition` omitted — 06 §5.6 and the engine say the opposite (G-SLIP-2). Constraint phrasing mixes field conventions (G-SLIP-4). |
| 15:1468/4046 | Tool enum includes `'slip'` (selectTool) | Consistent with 16:833/18:198. |
| 15:2325-2335 (§5.1.5) | Slip example `"delta": 120000000` for 1 s | **Known-bad illustrative number** — the spec's own notes (:2269-2479) flag the §5.1 tick rates as non-canonical; canonical `MediaTime` = **120,000 ticks/sec** (spec 03). 1 s = 120,000 ticks. |
| 15:3647-3654 | `SlipCommandSchema` (zod: `elementId` uuid, `delta` int ticks, `syncLinked` default true) | Shape consistent with §4.3.6 (same image-vs-composition error inherited). |
| 15:4906 | Command coverage: 27/78 live; slip among the **51 absent** — "ENGINE-GAP … the op-family port is r1 wave 1/2" | Confirmed: no OT wire verb. |

### 16-keyboard-shortcuts.md

| Row | Quote/claim | Verdict |
|---|---|---|
| 16:180 | "`Y` \| Slip tool \| `{type:'selectTool', params:{tool:'slip'}}` \| Always" | Pinned (nle-ui ✓ `y`; app toolbar ✓). |
| 16:232-235 | `,`/`.` slip ±1 frame `delta: -4000/4000`; `Shift+,`/`Shift+.` ±10 frames `delta: -40000/40000` — "When clip selected, **slip tool active**" | **4000 ticks = 1 frame @ 30fps** (120K ticks/sec ÷ 30). Not microseconds, not raw frames — MediaTime ticks at the 30fps canonical default. 16:291 says so explicitly: "1 frame at 24 fps = 5000 ticks … the table uses `4000` because … 30 fps assumed for the default. The resolver computes the actual delta from `engine.playback.getFrameRate()`". |
| 16:250 | Slip-vs-nudge disambiguation: "slip tool active → slip, any other tool → nudge" | **Not implemented anywhere** (§4 delta 7). |
| 16:286-289 | `Option+,`/`Option+.`/`Option+Shift+,`/`Option+Shift+.` — always-slip alt rows | Absent in code. |
| 16:591 (§6 row 2) | Conflict resolution: "Tool-mode determines op" | Absent in code. |
| 16:1078-1083 (§8 adapter) | `case 'slip': engine.timeline.updateElements({updates: computeSlipDeltas(command.params, engine), pushHistory: true})` | The adapter routes via **updateElements**, not the engine's `slip()` — consistent with 15:342; `computeSlipDeltas` is named but never spec'd (G-SLIP-4). |
| 16:2039/2311 | "`slip` \| `timeline.updateElements` (with sourceStart patch) \| Yes" | Consistent. |
| 16:2142/2173-2176/2209-2212 | Keymap IDs `kbd-tool-slip` (Y), `kbd-slip-{left,right}-{1,10}` (`, . ⇧, ⇧.`), `kbd-slip-alt-*`, `kbd-nudge-*` | ID table; alt + nudge IDs unimplemented. |
| 16:365 | Keyboard nudge does NOT coalesce (Option-hold = 400 ms coalescing window) | Unimplemented (no nudge on `,`/`.` at all). |

### 18-ui-shell.md / 00-master-spec.md

- 18:198 — tool cluster radio: "Slip (Y)" among the nine tools; dispatches `selectTool`. Pinned (nle-ui ✓, app port ✓).
- 18:297 — "**Rejected**: … Alt+drag-slip (contradiction C11 … slip stays tool/keydown-driven)". The mock's slip-by-cursor-drag grammar therefore has NO sanctioned pointer path in 18 — it is tool-driven (the slip tool + drag) per 18's own wording, which the mode figure implies but no spec row spells out.
- 18:385 — §8.14 rejection register (same C11 entry).
- 00:36/79 — spec-06 scope + user story (slip among the ten standard ops).
- 00:306/330 — the (superseded/one) algorithm-home clauses: engine's slip **port-scheduled into OT** at r1; until then the engine version is internal fallback and "the EDITING wire never routes through it".
- 00:677/801-808 — property-based invariants: "No negative durations after trim/slip/slide"; "Source bounds respected (`sourceIn`/`sourceOut` …)" — a third field vocabulary; "Total timeline duration preserved under slip".

---

## 3. Code sweep

### nle-engine — `Timeline.slip` (the executable reference, class-only)

- **timeline.ts:4143-4148** — `slip(clipId: string, deltaFrames: number, options: { linked?: boolean } = {}): void`, wrapped in `this.execute('slip(…)')` (undo sweep P1.14). Signature matches 06:2406 exactly. **VERIFIED ALIGNED.**
- **timeline.ts:4150-4205 `_slipImpl`** — the law:
  - `δ=0` → return; clip not found → **throw**; `!isMediaItem(clip)` → silent return. `isMediaItem` = `video|audio|composition` (core/timeline-math.ts:280-282) — **image EXCLUDED** ("stills carry no source-range semantics").
  - **Delta space: TIMELINE frames** → converted via `timelineToSourceFrames(δ, speed, timelineFps, effectiveSourceFps)` (:4170-4177; timeline-math.ts:151) — speed- and source-fps-aware. FreeCut's `slipItem` takes SOURCE frames directly; this is an engine refinement.
  - **Companions:** `getSynchronizedLinkedItems` (timeline.ts:751-767) — only linked clips sharing the anchor's EXACT `from`/`durationInFrames`/`sourceStart`/`sourceEnd`/`speed` slip together; a linked clip with a different window does NOT slip (desync-safe by exclusion). Filtered `isSourceBearingClip` (:4165-4167). **So yes — linked audio slips with video, when the pair is window-synchronized.**
  - **Clamp law:** tightest constraint across ALL companions via `computeClampedSlipDelta` (timeline.ts:885-898 = `sourceStart+δ≥0`; `sourceEnd+δ≤sourceDuration`; `sourceEnd undefined → 0`), then the SAME clamped source δ applied to anchor + companions (`sourceStart`/`sourceEnd` both +δ, :4193-4204). Clamped δ = 0 → **silent no-op** ("v1 threw, which crashed drag handlers" — :4136-4138).
  - **Transitions: NONE.** No `clampSlipDeltaToPreserveTransitions`, no repair pass — the engine model carries `Transition[]` (timeline.ts:701) but slip ignores them. **Deviation from 06 §5.6's constraint row** (G-SLIP-8).
- **headless/api.ts — slip is NOT on the wire.** The 19-case `applyOp` dispatch (:792-1001: addText, addItem, updateItem, moveItem, removeItems, split, trimStart, trimEnd, addTransition, updateTransition, removeTransition, addTrack, addClip, addKeyframe, removeKeyframes, setTransformParent, addEffect, removeEffect, setTransform) has no slip case; grep-slip over api.ts = zero. Slip is reachable only as a raw `updateItem`/`updateElements` source patch — consistent with 15:342, and with the R25 scout card's "EXISTS (class-only, UNWIRED)".
- **Tests:** browser runner only — `src/app/page.tsx:1105-1123` (M4 4.4 "Slip shifts source range": 30fps, source [5..25]/dur 60, `slip(id, 10)` → `sourceStart 15`, `from 0`) and `:5148-5177` (M17 17.6 "Slip beyond source bounds → clamped, no throw": source [10..40]/dur 50, slip +1000 `{linked:false}` → clamped, no throw). **No vitest unit calls `.slip(`** — the only vitest mention is the frozen export `computeClampedSlipDelta` (tests/vitest/engine/api-surface.frozen.ts:171). "Carried tests" (05:1236) currently = 2 browser rows (G-SLIP-9).

### opencut-timeline — ABSENT (Wave-1 confirmed)

- `grep slip src/` → **zero matches**. Mentions live only in review/gap docs: `reviews/docs-review.md:54,137` (the missing-verb list), `reviews/round2-verification.md:62`, `gaps/wave2-engine-gaps.md:26`. Matches 06:21/2436 (OT-GAP) and 15:301/4906 (r1 wave-1 routing).
- Context: the app's **vendored copy** (`nle-test-app/vendor/nle-timeline`, alias `@vendor/timeline`, vite.config.ts:33) is what the app actually slips through; `TICKS_PER_SECOND = 120_000` (core/media-time.ts:23) — the canonical tick rate.

### nle-test-app — slip wired engine-true via `,`/`.` (keyboard only)

Wiring chain (the only slip path in the app):
`nle-ui useShortcuts ,/.` → `useUiStore.slipNudge` → router `dispatch({type:'slip', elementIds, deltaSec})` → **`src/engineService.ts:388-404`** (`case 'slip'`):

```
const d = secToTicks(cmd.deltaSec);                       // :393
for (const f of resolve(linked(cmd.elementIds))) {        // :395  A/V-link expansion
  const ts = f.el.trimStart ?? 0, te = f.el.trimEnd ?? 0;
  if (ts + d < 0 || te - d < 0) continue;                 // :398  head/tail guard → SKIP
  if (ts + d === ts) continue;                            // :399  no history pollution
  updates.push({ patch: { trimStart: ts + d, trimEnd: te - d } }); // :400
}
return core.updateElements({ updates });                  // :403  ONE batch = ONE history entry
```

- **Verified engine-true at the COMMAND seam** (R7/D28 laws, engineService.ts:208-220: one command = one engine history entry; no mock fallback; advisory lock): the commit lands in the **vendored opencut-timeline `TimelineCore.updateElements`** — the engine owns structure + undo.
- **But it does NOT call nle-engine's `Timeline.slip` (:4143).** The law is reimplemented app-side over the `updateElements` patch, with drifts (G-SLIP-6):
  1. **Per-element SKIP vs group-tightest clamp** — a linked pair whose members have different bounds slips only the legal member → A/V desync (engine/FreeCut tighten the group δ).
  2. **No rate/speed awareness** — raw tick δ straight into `trimStart`/`trimEnd`.
  3. **No transition clamp.**
  4. **No frame-grid snapping** — `snapTicks` exists (:226-227) but the slip case bypasses it; a 24fps-derived 5000-tick δ lands off-frame on a ≠24fps project.
- **Field convention:** OT's trim-amount model — slip = `trimStart+δ` / `trimEnd−δ` (opposite signs; window slides) vs FreeCut/engine `sourceStart+δ`/`sourceEnd+δ` (same sign). Equivalent semantics, opposite-sign tail field — a port trap (G-SLIP-4).
- **App-side pin ABSENCE (confirmed):** zero `slip` matches in `src/**.test.*` — `wire-coverage.test.tsx` asserts other verbs; `GluedShell.test.tsx`'s D28 describe covers the command surface generically. No test pins the slip verb, the patch shape, or the one-batch law (G-SLIP-7).
- No pointer/drag slip in the app's timeline-port (grep: no slip in `src/timeline-port/**`).

### nle-ui — partial: keyboard slip only; tool state INERT; mock fallback unbounded

- **`src/hooks/useShortcuts.ts:431-433`** — `,`/`.` → `s.slipNudge(s.selection, e.shiftKey ? -10 : -1)` whenever `selection.length > 0`. **No slip-tool gate, no nudge op on `,`/`.`** — 16 §3.4/§3.6/§6 row 2 unimplemented. `y` → `setTool('slip')` (:415) ✓.
- **`src/state/useUiStore.ts:870-888 slipNudge`** — with a router: `dispatch({ type:'slip', elementIds, deltaSec: frames/24 })` — **hardcoded 24fps**, not the runtime/project fps (16:291's resolver law). Without a router (mock mode): `e.sourceStart + frames/24`, guarded **`next >= 0` only** — **no tail bound** (the mock model has no `sourceEnd`/`sourceDuration`). So the mock path is a MOCK (store-local mutation), not an engine op; the tail-bound fix exists only in shell-variants (R15 T4).
- **`src/state/timelineRouter.ts:91-93`** — the seam's command shape `{ type:'slip'; elementIds: string[]; deltaSec: number }` — NOT spec-15's `SlipCommand` (single `elementId`, tick `delta`, `syncLinked`). Plural ids + seconds; the adapter burden is invisible at this seam.
- **The slip tool is INERT in the timeline UI:** `TimelineToolbar.tsx:36` renders the Slip (Y) radio button; `Clip.tsx` pointer handlers special-case only `blade` (Clip.tsx:114, 177, 188 — cursor `grabbing|move|crosshair`, no slip cursor, no slip drag mode). Selecting the slip tool changes nothing on the canvas.
- **Tests that DO pin:** `useShortcuts.test.tsx:267` (`,/. slip the selection ∓1 frame`), `:547` (⇧, 10 frames); `useUiStore.test.tsx:668-684` (source window shifts, placement fixed; far-negative refused), `:966-970` (locked tracks inert); `timelineRouterDispatch.test.ts:67-70` (dispatches `{type:'slip', elementIds, deltaSec: frames/24}`); `shortcutMap.ts:53/74` (tool-slip Y; clips-slip `, . ⇧×10`).

### ui-mock shells

- **shell-mini:** slip explicitly OUT — `docs/DESIGN-mvp.md:91` ("OUT … ripple/slide/slip/roll"). Zero slip code.
- **shell-variants (R15 T4):** the richest slip in the fleet —
  - `lib/trimLaws.ts:256-268` **`slipTargetBounds`** — legal `sourceStart` window `[0, extent − duration·rate]` (**rate-aware** upper bound; `null` = no source window → slip inert).
  - `state/useUiStore.ts:1951-1969` **`slipDrag`** (gesture seam): CLAMPS to the bounds — "the commit lands where the preview pointed". `:2161-2181` **`slipNudge`** (keyboard law): out-of-bounds = the WHOLE nudge REFUSES (the R15 T4 fix — the old law "only refused negatives, letting the keyboard slip run past the media tail").
  - `components/timeline/Clip.tsx:610-613` — slip tool routes the body drag to mode `'slip'`; `:647-657` — **grab-the-content**: drag right shows EARLIER material (`frames = round(−dt·24)`, sourceStart decreases), frame-snap-once, bounds clamp keeps the preview honest; `:742-753` commit `slipDrag(group, round(−drag.cur·24))`; `:464-465` slip keeps the box FIXED; `:475-476` `slipOffsetPx`; **`:1235-1244` — the content (filmstrip/waveform/label) TRANSLATES under the fixed clip box** (`translateX(slipOffsetPx)`), "content slides under the clip (spec-06 §5.6)"; `:486-487` the floating readout shows the NEW source-window start.
  - `hooks/useShortcuts.ts:402-418` — `,/.` = source-mode insert/overwrite when the viewer is in source mode (context-disjoint, registered deviation, README.md:248-253), else `slipNudge` (no tool gate).
  - Tests: `Clip.test.tsx:510-531` (position fixed, content translates, sourceStart bounded; far-past-head clamps to 0), `useUiStore.test.ts:1801-1820` (slipDrag clamps vs slipNudge refuses).
  - **Visual grammar: content-translate-under-fixed-box + readout — a THIRD grammar**, not the DaVinci white-outline grammar (no outline, no in-point preview frame, no red border/dual-glow distinction for slip).

---

## 4. Semantic deltas vs the mock (and across the fleet)

1. **Clamping — source-bound everywhere (correct per the mode card: never neighbor-bound).** FreeCut `computeClampedSlipDelta`; engine same + timeline→source conversion; shell-variants `[0, extent−duration·rate]`; app `trimStart+δ≥0 ∧ trimEnd−δ≥0`. **Delta:** nle-ui's mock path has NO tail bound (negative-only guard) — the one place "slip past the media tail" is still possible.
2. **Clamp vs reject:** 06:3149/3151 name the invariants "…-rejected"; every implementation clamps (silent no-op in the engine; whole-nudge refusal in shell-variants' keyboard law). Rejection language matches no code.
3. **Element types:** 15 §4.3.6 (`video`/`audio`/**`image`**) vs 06 §5.6 + engine `isMediaItem` (`video`/`audio`/**`composition`**, image inert). 15 is the outlier — a live spec-internal contradiction.
4. **Delta space — five conventions:** engine `slip(deltaFrames)` = TIMELINE frames (speed/fps-converted); FreeCut `slipItem(slipDelta)` = SOURCE frames; 15 `SlipCommand.delta` = MediaTime ticks "applied to the source window" (space ambiguous — the `updateElements` route is a source patch, but `computeSlipDeltas` is unspecified); nle-ui router `deltaSec` seconds; app ticks. The r1 port must pin the conversion once.
5. **Field conventions — three vocabularies:** `sourceStart`/`sourceEnd` (+δ/+δ — FreeCut/engine), `trimStart`/`trimEnd` (+δ/−δ — OT trim-amount model; the sign flip on the tail field is the port trap), and 00:806's `sourceIn`/`sourceOut`. 15 §4.3.6's own constraint line ("trimEnd + delta >= 0") is coherent only under the window-bounds reading and misleads under OT's.
6. **Companion fan-out:** engine/FreeCut = tightest constraint across synchronized companions, same clamped δ to all (linked audio slips WITH video — when windows match exactly; non-matching linked companions are excluded, not desynced). App = per-element skip (partial-pair slip possible = A/V desync). Mocks = per-element independent bounds. The "Y/N" on "linked audio slips with video": engine YES-with-exact-window-match; app YES-but-independently-guarded (desync possible).
7. **Keyboard slip-by-frame:** 16's `delta: ±4000/±40000` = **MediaTime ticks at 120,000 ticks/sec** (1 frame @ the 30fps canonical default; 16:291: the resolver recomputes at runtime fps — 5000/frame @24, 2000/frame @60 — and "tests must use `<runtime>` deltas"). nle-ui converts at a **hardcoded 24fps** (`frames/24`), ignoring project fps. Also: 16 gates `,/.` slip on the slip tool (nudge otherwise, with Option+ always-slip alts and Option-hold coalescing); nle-ui/shell-variants/app fire slip on `,/.` whenever a selection exists — no tool gate, no clip-nudge, no alts, no coalescing. shell-variants adds source-mode `,/.` insert/overwrite (context-disjoint, registered deviation C46).
8. **Transitions:** FreeCut clamps slip to preserve transitions and repairs after (06 §5.6); the engine port drops both; OT has no slip at all yet. Transition-adjacent slip behavior is unpinned for the port target.
9. **Visual grammar:** NO implementation ships the mock's grammar. 05 pins (reference-only) a generic bounds-box + soft edge halos; 06 pins the viewer-side 4-up overlay; shell-variants ships content-translate-under-fixed-box; nle-ui/app ship nothing visual (inert tool, keyboard-only). The white outline / in-point preview / red border / soft dual glows / diverging arrows exist only in `trim_edit_modes.html`.
10. **The engine-native `Timeline.slip` has zero consumers** — only the engine's own browser runner calls it. The wire law (15:342) routes slip as a source-only `updateElements` patch; the app implements that law inline. The r1 A2 port (05:1236) is the single convergence point for all of the above.
11. **Mock-figure nuances the mode card should carry:** the preview frame is bright and shows the neighbor's art (authoring artifact); the arrows diverge (headroom/tailroom reading, not co-directional slip); the glows are the blurred variant (distinct from roll/ripple's crisp green edges) and skip the title bar.

---

## 5. Gap rows (posture law: owner / phase / acceptance)

| ID | Gap | Owner | Phase | Acceptance |
|---|---|---|---|---|
| **G-SLIP-1** | The timeline-side slip overlay VISUAL GRAMMAR is unpinned: white full-source-duration outline, bright in-point preview frame, red active border, soft dual in/out glows, direction arrows (incl. the divergent-arrow semantic). No normative row in 05/06/15/16/18 defines it; 05's reference rows stop at a generic bounds-box (`getSlipOperationBoundsVisual`) + `EdgeHalos`; 06 pins the viewer-side 4-up instead. | spec 05 (timeline-visual home) + 18 (shell grammar) | r1 wave-1, UI half (rides the op port) | A normative 05 §"trim-mode overlay family" table (shared by roll/ripple/slip/slide) enumerating each element, its geometry source (white box = `[0, sourceDuration]` mapped at pxPerSec around the FIXED slot), style tokens, z-order, and the arrow law (pin: headroom/tailroom range indicators vs slip direction); `trim_edit_modes.html` view-slip named as the reference figure; OT's implementation cited per row once it lands. |
| **G-SLIP-2** | Element-type contradiction: 15 §4.3.6 `video/audio/image` vs 06 §5.6 + engine `isMediaItem` `video/audio/composition` (image inert — stills carry no source range). | spec 15 | next 15 revision (the chartered r1-END C7 rename pass) | §4.3.6 (+ SlipCommandSchema doc comment :3647) corrected to `video`/`audio`/`composition`; one-line note that image elements slip as no-ops. |
| **G-SLIP-3** | Clamp-vs-reject law: 06 §12 slip invariant names say "rejected"; all implementations clamp (engine: silent no-op; shell-variants keyboard: refuse-the-whole-nudge). | spec 06 | r1 A2 (ships with the invariant system) | §12 rows re-worded to "clamped to the tightest legal δ; clamped-δ=0 is a silent no-op (engine :4136 — v1 threw and crashed drag handlers)"; a decision row for the keyboard variant (clamp vs whole-nudge refusal — shell-variants' R15-T4 choice is the working precedent). |
| **G-SLIP-4** | Delta-space + field-convention law unpinned: timeline-frames vs source-frames vs ticks; `sourceStart/sourceEnd` (+δ/+δ) vs `trimStart/trimEnd` (+δ/−δ) vs `sourceIn/sourceOut` (00:806); 16:1078's `computeSlipDeltas` named but unspecified; 15 §5.1.5's example tick value is known-bad (120,000,000 for 1 s). | spec 15 (§4.3.6) + spec 16 (§8 adapter) | r1 END (C7/C8 param alignment) | §4.3.6 constraints restated in ONE convention with the trim-amount↔window-bounds mapping (incl. the tail-field sign flip) given inline; 16 §8's `computeSlipDeltas` spec'd (or the route re-pointed to the ported OT slip op); §5.1.5 example fixed to 120,000 ticks/1 s. |
| **G-SLIP-5** | `,/.` slip key law: 16's tool-gated slip/nudge disambiguation + Option+ always-slip alts + runtime-fps resolver + coalescing — none implemented; nle-ui fires always-slip at a hardcoded 24 fps. | nle-ui (S-package r1 keymap queue) + spec 16 owner | r1 keymap sync | `useShortcuts` `,/.` either gates on `activeTool` (slip→slip, else clip-nudge) or the deviation is REGISTERED per the deviation law; `deltaSec` computed from the runtime fps (frames/fps, not frames/24); Option+ slip alts land or 16 drops the rows. |
| **G-SLIP-6** | App-seam companion law: `engineService.ts` slip skips out-of-bounds companions instead of tightening the group δ → linked A/V can slip partially (desync). | nle-test-app | next app round (R-queue) | The `slip` case computes the tightest legal δ across the linked group (mirror engine `_slipImpl` :4179-4188) and applies it to all members; a GluedShell test pins pair-slip (same δ both members) + the desync-prevention case. |
| **G-SLIP-7** | App-side pin absence: no nle-test-app test covers slip (wire-coverage and GluedShell both silent on the verb). | nle-test-app | next app round (the D30 W-F/K3 routed-verb instrument) | wireLog gains a `'slip'` assertion; a D28 dispatch test pins the `trimStart`/`trimEnd` patch shape and one-batch-one-history-entry. |
| **G-SLIP-8** | Transition-adjacent slip: FreeCut's `clampSlipDeltaToPreserveTransitions` + `applyTransitionRepairs` (06 §5.6) were dropped in the engine port; OT (the r1 destination) has no transitions on this path. | spec 06 → r1 A2 port | r1 A2 | The OT slip op carries the transition-preservation clamp, OR 06 documents its absence as a model-level difference with an explicit row (transitions live at a different seam in the OT model). |
| **G-SLIP-9** | "Carried tests" for the r1 slip port are thin: the engine's entire slip test surface = 2 browser rows (4.4 shifts source; 17.6 clamps, no throw) + 1 frozen export; zero vitest units call `.slip(`. | opencut-timeline (r1 A2) | r1 A2 | The port ships a vitest family covering: source-only shift invariant, both bound clamps, no-explicit-bounds no-op, synchronized-companion fan-out + tightest clamp, non-synchronized companion exclusion, silent-no-op-on-zero, linked:false single-clip path — the 06 §12 invariant list made executable. |

---

## 6. Verdict

Slip is the fleet's best-specified edit mode at the **algorithm** layer and its worst-specified at the **visual** layer. The semantics — fixed timeline slot, source-window shift, source-bound clamp (never neighbor-bound), linked-companion fan-out — are pinned three-deep (06 §5.6's verbatim FreeCut algorithm, 15 §4.3.6's wire shape, 16's keyboard rows + 00's invariants), and the engine's `Timeline.slip` (:4143, verified byte-level against 06:2406) is a faithful, undo-wrapped, speed/fps-aware refinement with sane failure law (clamped-0 = silent no-op). But it is **unwired** (absent from the 19-op headless wire, per 15:342's own routing law that slip = a source-only `updateElements` patch) and has **zero consumers** — the nle-test-app reimplements the law inline over vendored-OT `updateElements` with three real drifts (per-element skip vs group-tightest clamp, no rate awareness, no transition clamp), nle-ui's mock path still lacks the tail bound, opencut-timeline has no slip at all (r1 wave-1), and the `,/.` keyboard law diverges on both gating (16: tool-gated; code: always-slip) and frame rate (16: 30fps-default ticks with a runtime-fps resolver; code: hardcoded 24fps). Above all, the mode's actual product — the rich DaVinci grammar this audit extracted from the mock: the white full-source-duration outline, the bright in-point preview frame, the red active border with soft dual green glows, the divergent headroom/tailroom arrows — is pinned **nowhere**; 05's reference rows stop at a generic bounds-box and an edge-halo mention, 06 pins the viewer-side 4-up instead, and shell-variants ships a third grammar (content-translating-under-a-fixed-box) that is also unpinned. The r1 wave-1 A2 port is the single convergence point for algorithm, wire, and (via G-SLIP-1) grammar; until it lands with the gap rows above, "slip" means four different things in four repos, and the mock remains the only complete statement of the mode.

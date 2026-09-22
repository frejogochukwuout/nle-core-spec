# W1-d — shell-mini Edit Inventory: insertion styles + trim/clip-editing styles (R35)

**Task ID:** W1-d · **Agent:** W1-d shell-mini edit-inventory auditor · **Round:** 35
**Question (the PO's wave directive):** "shell-mini is extensively tested, we just need to add a few more timeline insertion style + trim / clip editing style… let that shell be fully wired with final production grade code."
**Audit target:** `/home/z/r35/nle-test-app` — the glued engine-wired shell (nle-ui `AppShell` + app-owned `EngineMount`/`timeline-port` + the vendored opencut-timeline engine `@vendor/timeline`, the lock-copy of `/home/z/r35/opencut-timeline` @ `c15a629`). Read-only; no code touched.
**Design-lineage cross-ref:** `ui-mock/shell-mini` (the store-only mock, 495 tests incl. the W3 trim-tool modes) is the fleet's *style vocabulary* source — cited where its styles have (or lack) an engine-world twin.

## §0 The three dispatch paths (read this first)

Every edit in the glued app crosses exactly one of three seams; "surfaced" means different things on each:

| Path | Surface | Wire log | Validation |
|---|---|---|---|
| **WIRE** (`useWireDispatch` → `TimelineCommand`, `origin:"ui"`) | port gestures + port keymap + port toolbar/context menu | visible (coverage-counted) | full wire validation + error codes (`headless/api.ts`) |
| **ROUTER** (`engineService.dispatch(TimelineEditCommand)` → core ops direct) | shell keymap rows the port does not own (⌘B, `[`/`]`, `⌥[`/`⌥]`, `,`/`.`, ⌘M, markers, Inspector `patch`) | **INVISIBLE** | impl-side only |
| **CORE-DIRECT** (documented exceptions) | `insertElementOnNewTrack` (new-track drop), the undo/redo facade (`engineService.ts:191-215`), volume-line commit | **INVISIBLE** | engine op guards |

Wire census: **31 verbs = 28 routed + 3 exceptions** (`WIRE_COMMAND_TYPES`, `vendor/nle-timeline/headless/api.ts:268-300`; exceptions `:353-360` = `timeline.selectElements`, `timeline.advancePlayhead`, `timeline.trim`). The app invokes **all 28** routed verbs (grep §4).

## §1 Current insertion behavior

**1a. Pool-card drag-drop (the only positional insertion).**
Pool card `dragStart` begins on the shared engine drag source (`timelineDragSource`, `src/timeline-port/EngineMount.tsx:51`, `vendor/nle-ui/src/components/shell/MediaPool.tsx:453-467`). `dragover` → `DragDropController` (`vendor/nle-timeline/controllers/drag-drop-controller.ts:222-277`) → `computeDropTarget` (`controllers/drop-target.ts:116-281`): pointer x → frame-rounded `xPosition`; track resolution is **`preferIndex`** with hover above/below; `dropEffect` is always `"copy"`.

- Drop resolves an **existing track** → ONE **`timeline.insert`** `{element, startTimeTicks: drop x, strategy:"explicit", trackId}` through the wire (`src/timeline-port/hooks/use-timeline-drag-drop.ts:89-129`); the mint becomes the selection + is journaled for undo-restore.
- Drop resolves a **new track** (hovered gap / out-of-bounds / occupied preferred track) → **`core.insertElementOnNewTrack`** — core-direct, a documented no-wire-verb exception (`use-timeline-drag-drop.ts:130-139`, comment :36-39).
- **Collision policy = REJECTED-NOT-SHIFTED** (`vendor/nle-timeline/placement/index.ts:8-12`): an occupied preferred track falls through to a **new track** (`src/wire-coverage.test.tsx:797-814` pins: no `timeline.insert` ever fires); a stale-occupied explicit target rejects at the wire `{ok:false, code:"CONFLICT", error:"placement failed"}` (api.ts `:1260` arm; `wire-coverage.test.tsx:753-795`). **No overwrite, no ripple-shift, no same-track gap hunt** (the mock mini's `insertMediaAt` gap-hunt is a *registered mock affordance* — `ui-mock/shell-mini/docs/OT-SEAMS.md` row 5).
- **Drop ON an element** (media→media, `targetElement` resolved) → **deliberate NO-OP** ("Replace media source — not yet implemented", classic parity) — `drag-drop-controller.ts:368-373`.
- Builder defaults (SD-8: `sourceDuration`, `isSourceAudioEnabled`, `hidden`, `sourceType`) — `drag-drop-controller.ts:382-405`.

**1b. "Insert at Playhead" (the pool's context-menu row — the only non-drag insertion).**
`App.tsx:55` wires `mediaInsertAtPlayhead` → `mediaInsertBridge` (`EngineMount.tsx:60-65`); the live handler (`EngineMount.tsx:192-255`) commits **ONE `timeline.insertBatch` per element KIND** (audio vs visual), a **staggered contiguous block from the playhead** (`elements[i].startTime = playhead + Σ durations[<i]`), `strategy:"firstAvailable"` (first track where the spans fit, else ONE minted track for the block); the minted refs echo-select the group. The menu follows the pool's multi-selection (`MediaPool.tsx:387-412`).

**1c. What does NOT exist.** No **ripple-insert** (shift followers right), no **overwrite** (bisection), no **replace**, no **fit-to-fill**, no **append-to-tail** affordance, no **3-point/source insert** (nle-ui has no SourceEditBar/SourceRangeBar — spec 18 §4.3 D35.4 is registered but unbuilt; the mock mini's source mode has `insertFromSource('insert'|'overwrite')` in `ui-mock/shell-mini/src/hooks/useKeys.ts:98-118` — **mock-only**), and **no keyboard key inserts media** in either keymap. Default semantics: drop = "place at pointer if free, else new track"; menu = "firstAvailable at playhead" (classic opencut).

## §2 Current trim/edit behavior

**2a. Edge-drag trim (the only pointer trim).** Resize handles `[data-test="resize-handle-{left,right}"]` → `ResizeController` session (`src/timeline-port/hooks/use-timeline-resize.ts:61-119`; `vendor/nle-timeline/controllers/resize-controller.ts:122-186`): left-button only, locked-track guard, **group trim** for multi-selections (`buildResizeMembers`), snap to element edges/playhead/keyframes (**Shift DISABLES snap — it is not a ripple modifier**, `resize-controller.ts:216-221`), live preview via `core.previewElements`, commit through the **`timeline.updateElements` patch seam** (`use-timeline-resize.ts:78-87` — the design-v2 ruling; the `timeline.trim` wire verb is deliberately unrouted by the UI). Bounds **CLAMP, never reject** (`computeGroupResize` neighbor/source/1-frame floor); a clamped-to-nothing commit suppresses the wire verb entirely (`src/trim-gesture.test.tsx` header laws; `resize-controller.ts:321-326`). **No ripple trim, no rolling edit** via the gesture.

**2b. Split family.** `S` = **`timeline.split` at the PLAYHEAD**; targets = selection (locked filtered) else every unlocked element under the playhead (`use-timeline-actions.ts:201-226, 367-407`); the new right fragments become the selection (classic patch). `Q`/`W` = split-and-**remove** left/right (`retainSide` opposite, `use-timeline-actions.ts:409-464`); the ripple MODE adds classic's seek-to-first-right-fragment clause (:453-461). `⌘B` (SHELL keymap, **router-path, wire-invisible**) = split the clip under the playhead on the main track — `vendor/nle-ui/src/hooks/useShortcuts.ts:275-283` → `useUiStore.splitElement:836` → `engineService` `case 'split'` `:317-322`; A/V-link propagation rides it (`GluedShell.test.tsx:861-895`). **No split at click point** (no razor tool in the engine world — the shell's `B` blade tool is mock-only and yields to the port's *bookmark* binding in the routed world).

**2c. Delete family.** `Backspace`/`Delete` → **`timeline.delete`** (plain, leaves gap) — `use-timeline-actions.ts:470-525`. `⇧Backspace`/`⇧Delete` → **`timeline.rippleDelete`** (diff-based follower close; engine `rippleDeleteElements`, `vendor/nle-timeline/ops/timeline-core.ts:1395-1423`) — `use-timeline-actions.ts:527-537`. A **ripple MODE toggle** (port toolbar, `TimelineView.tsx:379`) reroutes the plain delete and the splitSide seek clause (`TimelineToolbar.tsx:192-221, 319-329`). Every multi-delete ≥5 (all surfaces) routes through the §6.4 confirm gate (`use-timeline-actions.ts:152-199` + `EngineMount.confirmDelete`).

**2d. Duplicate.** `⌘D`/toolbar/context menu → **`timeline.duplicate`** — engine semantics: copies land on a **NEW track (alwaysNew, highest) at the SAME startTime**, named `"<name> (copy)"` (`timeline-core.ts:1425-1466`). *Structurally different* from the conventional adjacent same-track append.

**2e. Move (drag).** 5px threshold → live preview → release commits **ONE `timeline.move`** `{moves[], createTracks?}` (`use-element-interaction.ts:120-150`); overlap reject = `CONFLICT`, selection survives (`wire-coverage.test.tsx:712-751`); the router-path `'move'` (shell/Inspector) is within-track only (`engineService.ts:394-414`).

**2f. Trim-to-playhead + ripple trim (SHELL keymap, router-path, wire-invisible).** `[`/`]` = trim start/end to playhead (**non-ripple**, leaves gap); `⌥[`/`⌥]` = **ripple** variant — followers shift left, riding the SAME `updateElements` batch (one history entry) — `useShortcuts.ts:411-423` → `useUiStore.trimToPlayhead:989-1003` → `engineService` `case 'trimToPlayhead'` `:335-392`. Targets: selection else main-track clips under the playhead. Pinned in `GluedShell.test.tsx:391-408` (edge-r, ripple-l) and `GluedShell.test.tsx:2636+` (the real `[`/`⌥[` key wiring).

**2g. Slip (SHELL keymap, router-path, wire-invisible).** `,`/`.` = slip ∓1/±1 frame (`⇧` ×10): `trimStart±δ / trimEnd∓δ` in ONE `updateElements` batch — `useShortcuts.ts:469-470` → `useUiStore.slipNudge:970-988` → `engineService` `case 'slip'` `:416-432` (consumer chain pinned `engineService.test.ts:726-755`). **No pointer slip; no slide anywhere.**

**2h. Adjacent edit surfaces.** Keyframes: `timeline.upsertKeyframe` (volume-line double-click), `timeline.retimeKeyframes` (indicator drag), `timeline.removeKeyframes` (Backspace on keyframe selection) — all wire-visible (`use-keyframe-authoring.ts:182-190`, `use-keyframe-drag.ts:118`, `use-timeline-actions.ts:490-500`). Undo/redo: shell `⌘Z`/`⇧⌘Z`/`⌘Y` via the router facade (core-direct, wire-invisible, `engineService.ts:191-215`); the port toolbar's undo/redo buttons DO route `timeline.undo`/`timeline.redo` wire-visibly.

## §3 The keyboard edit map (glued/engine world)

Two keymaps, one owner per key (D22b; D51/D52 mid-drag yields — `use-keybindings.ts:249-265`, `useShortcuts.ts:95-118`).

**Port keymap (document CAPTURE, `use-keybindings.ts:36-82`) — engine verbs, wire-visible:**

| Key | Action | Verb / path |
|---|---|---|
| `S` | split at playhead | `timeline.split` |
| `Q` / `W` | split + remove left / right | `timeline.split` (retainSide) |
| `Backspace`/`Delete` | delete (gap) | `timeline.delete` |
| `⇧Backspace`/`⇧Delete` | ripple delete | `timeline.rippleDelete` |
| `⌘D` | duplicate | `timeline.duplicate` |
| `⌘A` | select all | local selection |
| `N` | toggle snapping | view state |
| `B` | bookmark at playhead | `timeline.toggleBookmark` |
| `R` / `⇧R` | loop from selection / clear | `timeline.setLoopRegion` |
| `Esc` | cancel gesture → deselect | cancel registry → selection |
| (transport) `Space` `J`/`K`/`L` `⇧J`/`⇧L` `←`/`→` `⇧←`/`⇧→` `Home`/`Enter` `End` | play/pause, JKL, frame-step, jumps, start/end | `play`/`pause`/`setPlaybackRate`/`seek` |

**Shell keymap (window bubble, `useShortcuts.ts`) — edit rows that STILL FIRE in the engine world (router-path, wire-invisible):** `⌘B` (split under playhead), `[`/`]` (trim-to-playhead), `⌥[`/`⌥]` (ripple trim-to-playhead), `,`/`.`/`⇧,`/`⇧.` (slip nudge), `M`/`⇧M`/`⌥⇧M` (markers → engine bookmarks via `addMarker`/`removeMarkers`), `⌘M`/`⌘⇧M` (mute), `⌘Z`/`⇧⌘Z`/`⌘Y` (undo/redo facade), `I`/`O` + `⌥X`/`⌘⇧I`/`⌘⇧O` (in/out → loop region, store domain).

**Registered inert/no-op rows in the engine world:** `Tab`/`⇧Tab` (neighbor-clip select — yielded, no port row exists; `useShortcuts.ts:73-79`), `V`/`T`/`Y`/`U`/`B`/`R` tool radio (mock-world tools; the port has no tool concept — `T`=roll, `Y`=slip, `U`=slide change nothing in the engine world), `⌘A`⇧ variant (store select-all — yielded).

**Absent from BOTH keymaps:** any insertion key, any nudge-trim key (±1-frame edge), rolling/slide/extend keys (the mini mock's `V/T/Y/U/X` trim-tool radio is miniPlus-gated mock-only, `ui-mock/shell-mini/src/hooks/useKeys.ts:62-92`).

## §4 The unsurfaced-verb table (wire census 31 = 28+3 vs app invocation)

**All 28 routed verbs are invoked by app source (non-test `src/`):** `insert` (use-timeline-drag-drop.ts:102), `insertBatch` (EngineMount.tsx:239), `move` (use-element-interaction.ts:140), `split` (use-timeline-actions.ts:377,420), `delete` (:180), `rippleDelete` (:178), `duplicate` (:548), `updateElements` (use-timeline-resize.ts:81; TimelineView.tsx:867,880), `seek` (multiple), `play`/`pause` (:233-235), `setPlaybackRate` (:261,296; TimelineView.tsx:1409), `setLoopRegion` (:283,289), `undo`/`redo` (:604,614 — port toolbar path), `toggleBookmark` (:623), `removeBookmark` (TimelineView.tsx:1015), `moveBookmark` (use-bookmark-drag.ts:313), `upsertKeyframe` (use-keyframe-authoring.ts:184), `removeKeyframes` (use-timeline-actions.ts:491), `retimeKeyframes` (use-keyframe-drag.ts:118), `track.add`/`remove`/`toggleMute`/`toggleVisibility`/`toggleLock`/`setAllLocked`/`setAllMuted` (TimelineView.tsx:932-983,1457,1475,1541-1583). **The 3 exceptions are unrouted by design** (registry, api.ts:353-360). **So the gap is NOT at the verb level — it is at the STYLE level.** The style-level unsurfaced inventory:

| Available at engine/library layer | Surfaced? | Where it would live |
|---|---|---|
| **`timeline.trim`** (uniform-delta, `left|right`, batch) | ❌ never dispatched by UI (exception-registered; trim rides the `updateElements` patch seam) | ripple-trim / nudge-trim composites — either revive this verb or stay on the patch seam |
| **Placement strategies `preferIndex` / `aboveSource` / `alwaysNew`** (`placement/index.ts:43-54`) | ⚠️ core-internal only — the wire verb exposes just `firstAvailable`/`explicit` (api.ts:62,85); `preferIndex` is used inside `computeDropTarget`, `alwaysNew` inside duplicate | an insertion-style param on `timeline.insert`/`insertBatch` |
| **Ripple module** (`applyRippleAdjustments` / `computeRippleAdjustments`, `vendor/nle-timeline/ripple/index.ts`) | ⚠️ used by `rippleDelete` only | ripple-INSERT and ripple-TRIM composites (shift followers right/left) |
| **`core.splitElements` with arbitrary `splitTimeTicks` + `retainSide`** | ⚠️ playhead-only affordances; split-at-click (razor) has no surface | a blade/razor click tool or context-menu "split here" |
| **`timeline.move` with `createTracks[]`** (cross-track planned moves) | ⚠️ gesture-reachable via drag; no keyboard "nudge/move clip" binding | keyboard move-nudge; slide composites (move the *neighbors*) |
| **Router-path composites** `trimToPlayhead` (ripple+plain), `slip`, `split`-under-playhead, `duplicate-at`, `addMarker`/`removeMarkers`, `addTrack`, `patch` (engineService.ts:316-560) | ⚠️ keyboard-only + **wire-invisible** — not on the port toolbar/context menu, not coverage-counted | port toolbar/context-menu rows; or re-route through the wire per the D30/R9 wire-dispatch discipline |
| **`core.insertElementOnNewTrack`** | ⚠️ drop-only; documented exception | append/3-point composites could reuse it |
| Mock-mini styles with NO engine twin: `insertFromSource('insert'/'overwrite')` (source-mode 3-point), trim-tool radio V/T/Y/U/X (roll/slip/slide/transition) | ❌ mock store only (`ui-mock/shell-mini/src/hooks/useKeys.ts`) | the "fully wired" wave's design source |

## §5 The e2e coverage map

- **`src/e2e-crawl.test.tsx` (the K4 crawl, 12 tests):** **12 distinct wire-visible verbs** driven origin-`"ui"` through the real UI — `insert` (LEG 1 pool DnD), `split`/`rippleDelete`/`updateElements` (LEG 2 cut: `s` key + toolbar ripple-delete + resize-handle trim), `move` (LEG 2b drag), `play`/`pause` (LEG 3), `setPlaybackRate` (LEG 6 JKL), `seek` (LEG 7), `toggleBookmark`/`removeBookmark` (LEG 7), `setLoopRegion` (LEG 8) — plus **wire-invisible** undo/redo through the shell facade (LEG 5) and the export legs (4/4b). The capstone = exactly six verbs in one mount. (Confirmed by `docs/review-k4-exit-verdict.md`: "11 distinct wire-visible verbs + LEG 2b's move = 12".)
- **`src/wire-coverage.test.tsx` (R8, the completeness instrument):** drives **ALL 28 routed verbs** through real UI events and gates `missing = WIRE_COMMAND_TYPES − ACCUMULATED − WIRE_UI_EXCEPTIONS = []`, `stale = []`, size identity `31 − 3` (:578-590). Also pins the edit *behaviors*: `insert`/`move` CONFLICT + TRACK_LOCKED rejects, the REJECTED-NOT-SHIFTED new-track drop, gesture laws (5px threshold, no-op suppression, buttonless cancel, additive-drag anchor).
- **`src/GluedShell.test.tsx`:** the router-path families — ⌘B split (+A/V link on/off), `trimToPlayhead` edge-r + ripple-l, routed delete/duplicate selection side-effects, markers→engine bookmarks, speed/retime patch laws; `GluedShell.test.tsx:2636+` the `[`/`⌥[` key wiring (K3 row 10).
- **`src/trim-gesture.test.tsx`:** the full resize-handle chain (clamps, commit suppression). **`src/engineService.test.ts`:** pure router-command families incl. `trimToPlayhead` describe (:437+) and `slip` (:726-755). **`src/doc-committing-sessions.test.tsx` + `src/mid-drag-yield.test.tsx`:** the D51/D52 mid-drag yield laws over the edit keys. **`src/history-laws.test.ts`:** engine history invariants.
- **NOT covered anywhere as a user-visible behavior:** pointer ripple-trim, rolling edit, slide, pointer slip, split-at-click, any insertion style beyond place-at-position/insertBatch (the wire-coverage insertBatch tests cover only the *menu* path's staggered-block form).

## §6 The gap list vs the conventional NLE set

**PRESENT (with caveats):** place-at-position insert (drop, explicit) ✓ · firstAvailable batch insert-at-playhead ✓ · plain delete ✓ · **ripple-delete ✓** (key + toolbar + mode) · split at playhead ✓ (S/Q/W + ⌘B) · edge trim ✓ (clamped, snap, group) · **trim-to-playhead + RIPPLE trim-to-playhead ✓ but keyboard-only + wire-invisible** ([/] ⌥[/⌥]) · **slip ✓ but keyboard-only + wire-invisible** (,/. ) · duplicate ✓ (new-track-same-start — *structurally different*) · move-drag ✓ · undo/redo ✓.

**MISSING — the honest gap list (what + where it would live):**

1. **Ripple INSERT** (shift followers right to make room) — composite of `timeline.insert`/`insertBatch` + the engine's ripple module (`ripple/index.ts`); affordance: a drop modifier or an "Insert" pool-menu variant → would live at the wire (new composite verb or strategy param) + `EngineMount`/drop-controller.
2. **Overwrite INSERT** (bisection of the overlapped span) — no engine op exists (the no-overlap invariant rejects instead); would need a wire composite (split/delete span + insert, one history entry) + a drop modifier.
3. **REPLACE (drop media ON a clip)** — currently a deliberate no-op (`drag-drop-controller.ts:368-373`); would live at that `targetElement` branch + a replace composite.
4. **Fit-to-fill** (fit source in/out to a timeline gap) — composes trim + insert; needs the source-mode surface (spec 18 §4.3 SourceEditBar, unbuilt in nle-ui).
5. **Append-at-tail insertion** — trivial stagger of `insertBatch` at the track tail; affordance: a pool-menu row / `E`-style key + `EngineMount` bridge.
6. **3-point / source insert-overwrite** — the mock mini has it (`insertFromSource`, useKeys.ts:98-118); engine-world needs the SourceEditBar + overwrite composite.
7. **Ripple TRIM via edge-drag** (modifier or mode) — `ResizeController` commit is overwrite-style only; the ripple math exists in `engineService` trimToPlayhead:375-389 + the ripple module; would live as a ripple variant of `commitElements` (patch-seam batch) or a trim-mode in the port.
8. **Rolling edit** (move the cut point, both sides, total duration invariant) — no verb/op; would compose two patches in ONE `updateElements` batch; affordance: a tool or edge-modifier.
9. **Slide** (move clip, neighbors absorb) — no op; composes `timeline.move` batches; affordance: tool (mini's `U`) or drag modifier.
10. **Slip via POINTER** — the slip op is router-path keyboard-only; would live as a trim-tool surface mapping to the `'slip'` command or a wire-native retime-style verb.
11. **Extend-to-playhead as a first-class affordance** — exists only on `[`/`]`/`⌥[`/`⌥]` (wire-invisible); no toolbar/context-menu row; porting it to the port's surfaces would make it wire-visible.
12. **Split at click point (razor/blade)** — engine supports arbitrary `splitTimeTicks`; no click affordance (the shell's blade tool is mock-only) — a click tool or context-menu "split at cursor".
13. **Keyboard nudge-trim** (±1 frame on an edge) — no binding; would live in the port keymap routing `timeline.trim` (currently exception-registered) or the patch seam.
14. **Keyboard INSERT** — no key inserts media; the `insertBatch` bridge exists (`mediaInsertBridge`); a key + pool-menu parity row.
15. **Neighbor-clip select (`Tab`)** — registered no-op in the engine world; would live as a port keymap row over the engine scene.
16. **Ripple MODE should reach the trim gesture** — the toolbar's ripple toggle currently affects only delete + splitSide's seek clause, not the edge-drag trim.

**STRUCTURALLY DIFFERENT (not gaps — decisions the wave must respect):**
- **Two dispatch paths:** five edit styles (split-under-playhead, trim-to-playhead ±ripple, slip, markers-as-bookmarks) are shell-keymap-only and wire-invisible; the D30/R9 wire-dispatch discipline ("every timeline UI verb dispatches through the wire", SKILL.md #8) argues new styles land wire-first.
- **Duplicate = new-track same-start** (classic opencut law, `timeline-core.ts:1425-1466`) vs the conventional adjacent same-track copy.
- **REJECTED-NOT-SHIFTED placement** is the engine's invariant — overwrite/ripple-insert styles must be *composites*, not placement changes.
- **No tool palette in the engine world** — V/T/Y/U/B/R tools are mock-world chrome; the port's keymap owns the engine keys (B = bookmark, R = loop).
- **The no-overlap invariant is wire-level**; `previewElements` legitimately tolerates transient overlap mid-gesture (api.ts note `:3089-3094`) — ripple/rolling composites must produce overlap-free end states.

**Sources:** app `src/App.tsx`, `src/timeline-port/**` (EngineMount, hooks, TimelineView/Toolbar/ContextMenu), `src/engineService.ts`, `src/e2e-crawl.test.tsx`, `src/wire-coverage.test.tsx`, `src/GluedShell.test.tsx`; vendored `vendor/nle-timeline/{headless/api.ts, placement/, controllers/, ops/, ripple/}`, `vendor/nle-ui/src/{hooks/useShortcuts.ts, lib/shortcutMap.ts, state/useUiStore.ts, components/shell/{MediaPool,Inspector}.tsx}`; OT clone `opencut-timeline/src/lib/timeline/headless/api.ts` (31-verb census); `docs/review-k4-exit-verdict.md`, `.agents/SKILL.md`; mock lineage `nle-core-spec/ui-mock/shell-mini/src/hooks/useKeys.ts` + `docs/OT-SEAMS.md`; spec 18 §16.

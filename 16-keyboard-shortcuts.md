# 16 — Keyboard Shortcuts: Comprehensive Interaction Spec

**Stream:** Keyboard interaction layer (UI → engine command bus)
**Status:** v1.1 (Round 15 amendment pass — A1/A6/N8/N11/N12/N15 resolutions + C2-extension registration per `.agents/SPEC-REVISION-CANDIDATES.md`, ARCH-R15 §4; original v1.0 authored under task TEST-03)
**Primary teacher:** FCP/Premiere/DaVinci Resolve muscle-memory conventions + FreeCut `config/hotkeys.ts` + OpenCut-classic `OC-Actions/definitions.ts`
**Consumers:** UI keyboard handler (`src/ui/keyboard/`), test harness (`tests/e2e/keyboard.spec.ts`), cheat-sheet modal (`src/ui/cheat-sheet/`)
**Predecessor:** `05-timeline.md` §19 (unified shortcut table — ~50 actions)
**Forward reference:** `15-wire-protocol.md` (TEST-02, shipped) — defines the canonical `EngineCommand` discriminated union that this spec consumes. Spec 16's §3 binding tables and §8.3 resolver are aligned to spec 15 §4 (canonical union) + §4.2 (canonical manager-method mapping). Spec-16-only UI-layer extensions are explicitly marked below (§0.2).

---

## 0. What This Spec Adds (TL;DR)

| Area | Before (spec 05 §19) | After (this spec) |
|---|---|---|
| Shortcut count | ~50 actions (union of 2 repos) | **181 bindings** (180 at v1.0 + `Option+R` from the R15/A6 amendment) across 13 categories (~110 unique actions after parameterizing presets/panels/workspaces/alt-bindings), every common NLE action covered |
| Mapping target | "FCP/Premiere equivalent" column | **`EngineCommand` discriminator** + manager-method cross-ref (§12) |
| Conflict handling | 5 conflicts noted, resolutions inline | **Full conflict table** (§6) covering 18 disambiguation cases (12 original + 6 audit-flagged direct conflicts resolved in §6.1 #13–#18) |
| Test integration | "Keyboard test: Press each shortcut, assert correct command fires" | **4 named patterns** + Playwright recipes (§4, §9) + test enumeration appendix (§A) |
| Input-field handling | (unaddressed) | **`isTextInput()` guard** — single-key shortcuts suppressed, `Cmd+` shortcuts still active (§8.5) |
| Non-US keyboards | (unaddressed) | **`event.code`-based lookup** as primary, `event.key` as fallback (§8.4) |
| Customization | "v2" stub | **`ShortcutMap` interface + `localStorage` persistence** contract (§7, §8.6) |

### 0.1 Why a dedicated spec

`05-timeline.md` §19 documented the *union* of shortcuts across FreeCut and OpenCut-classic as a discovery exercise. That table answers "what do the reference repos do?" This spec answers the different question: **"what is the complete, consistent, test-enumerable keyboard contract for OUR NLE?"** Concretely:

1. §19 is descriptive (catalogs 2 existing apps); this spec is **prescriptive** (defines 1 canonical map).
2. §19 left 5 conflicts unresolved at the recommendation level; this spec resolves **18 conflicts** (§6) — 12 original plus 6 audit-flagged direct conflicts resolved in §6.1 #13–#18 — with explicit precedence rules and `Cmd+`/`Option+`/4-key-chord fallbacks.
3. §19 did not bind shortcuts to the engine command bus; this spec maps every shortcut to a **serializable `EngineCommand`** (§3, §12) so tests can replay via `page.evaluate({ type, params })` without touching the DOM.
4. §19 had no implementation guidance; this spec defines the handler architecture (§8), the resolver that converts `EngineCommand` → `Command` instance / manager call (§8.3), and the cheat-sheet data model (§7.3).

### 0.2 Alignment with spec 15 (`15-wire-protocol.md`)

The `EngineCommand` type used throughout this spec is the **serializable command descriptor** that the keyboard handler emits and that tests inject via `page.evaluate`. Spec 15 (`15-wire-protocol.md`, shipped under TEST-02, amended Round 7) is the **canonical definition** of this type — its §4.1 defines a 78-type discriminated union (73 at TEST-02 + 5 Round-7 additions: 3 export commands and 2 project commands) covering Timeline, Track, Playback, Project, Scene, Media, Tool, Marker, Effect, Mask, Transition, Keyframe, Clipboard, Undo/Redo, Snapshot, and Export categories. Spec 15 §4.2 maps every command type 1:1 to a manager method on `EditorCore`.

This spec (16) consumes spec 15's union without modification. The 33 command types in §3 of this spec that overlap with spec 15 (e.g., `split`, `trim`, `play`, `paste`, `undo`, `toggleBookmark`, `addTrack`, `deleteTrack`, `upsertKeyframes`, `removeKeyframes`) use spec 15's canonical names verbatim. Spec 16 additionally defines **UI-layer extensions** (the rows tagged `(UI)` in §12) — commands that affect UI state (panel focus, workspace switch, timeline viewport zoom, snap toggle, ripple toggle) or are composite helpers (`splitAndRemove`, `findPlayhead`, `join`, `toggleAVLink`). These UI-layer extensions are tagged `UI` in §12 and are NOT pushed through `engine.command.apply()`; they are routed to the UI store (Zustand) directly. The export commands (`exportFCPXML`, `exportMaster`, `exportFrame`) are **NO LONGER spec-16 extensions**: spec 15 §4.3.74-76 (Round-7 amendment) defines them canonically, and they ARE pushed through `engine.command.apply()` — export is spec 15's sanctioned OUTPUT exception (§14.11), non-undoable and non-mutating, with the artifact or job handle returned in `CommandResult.data`. Spec 18 (UI shell) is the primary consumer of the remaining UI extensions.

**Normative priority:** where this spec and spec 15 both define a command name, **spec 15 wins**. The keyboard handler's `EngineCommandResolver` (§8.3) is a thin adapter that (a) computes `<runtime>` params (currentTime, selectedIds, focusedTrackId) from engine + UI state, (b) forwards spec-15 command types through `engine.command.apply(EngineCommand)`, and (c) routes spec-16 UI extensions to the UI store. Spec 15 §4.4 defines `apply()`; this spec does not redefine it.

> **Round-7 note on §8.3's illustrative bodies:** the resolver code below was written against spec 01's class-instance API (`engine.command.execute({ command: new XCommand(...) })`) during the §15.2 migration window; several bodies still show it. Production code uses `engine.command.apply({ type, params })` — the JSON path — exclusively (spec 15 §15.2); the illustrative bodies are to be read as "construct the params, then apply". New bindings must be written in `apply()` form. (Flagged for textual migration at the seal round.)

---

## 1. Purpose

Comprehensive keyboard shortcuts serve two purposes:

1. **User productivity.** Keyboard is faster than mouse for experienced users. A trained editor can rough-cut a 10-minute sequence in 2–3 minutes using only JKL + I/O + B + ,/. ; the same cut via mouse takes 8–12 minutes.

2. **Testability.** Browser automation via `page.keyboard.press()` is faster and more reliable than `page.mouse.click()` + `page.mouse.move()` for drags:
   - **Speed:** a keypress is ~5 ms end-to-end; a drag sequence (mousedown → 20× mousemove → mouseup) is 200–800 ms and requires `waitForTimeout` between moves to let the UI settle.
   - **Reliability:** drag targets depend on exact pixel coordinates, which drift with viewport size, DPR, scroll position, and font rendering. Key targets depend only on focus, which is deterministic.
   - **Parallelism:** Playwright can run keyboard-based tests with zero `waitForTimeout` calls; mouse-based tests need ~30 % of their runtime in waits.

**Goal:** *every common NLE action is achievable via keyboard alone.* This allows tests to bypass the UI-interaction tax entirely for ops that don't specifically test mouse mechanics (drag-marquee, trim-handle drag, razor-click precision).

**Non-goal:** replacing all mouse interactions. Drag-precision tests, trim-handle drag tests, and marquee-selection tests still use mouse — those are the things being tested. But for *setup* and *verification* steps around those tests, keyboard is preferred.

---

## 2. Design Principles

1. **Match industry conventions.** FCP / Premiere / DaVinci Resolve shortcuts where possible. Users transfer their muscle memory; deviation must be justified. Where FCP and Premiere disagree, prefer FCP (the project's handoff target is FCPXML — see spec 10).

2. **Single-key shortcuts for common ops.** `Space` for play, `B` for razor, `V` for select, `J`/`K`/`L` for shuttle. No `Cmd+` required for hotkeys that fire 10+ times per minute. Rationale: `Cmd` requires a chord; on macOS the chord also conflicts with system shortcuts (`Cmd+W` closes the tab, etc.).

3. **`Cmd+key` for file/meta ops.** `Cmd+S` for save, `Cmd+Z` for undo, `Cmd+C`/`Cmd+V`/`Cmd+X` for clipboard. These match OS-wide conventions and rarely fire in rapid succession.

4. **Modifier keys for variants.** `Shift+arrow` for 10-frame nudge vs `arrow` for 1-frame. `Shift+J`/`Shift+L` for 2× shuttle vs `J`/`L` for 1×. `Cmd+Shift+B` for split-all-tracks vs `Cmd+B` for split-focused. The pattern: **Shift = "more"** (10× frames, 2× speed, all tracks), **Cmd = "global"** (file, project, all-tracks).

5. **Context-sensitive.** `Delete` and `Backspace` both delete the selected clip (no ripple — aliases); `Shift+Delete` (⇧⌫) is the ONLY ripple-delete chord (Round 15 amendment, A1 — resolves the 16 §3.4 vs 18 §4.9 conflict; the mock implements 18's form). `B` selects razor tool when not in razor mode, but in razor mode `B` + click splits at the click point. Resolution rules are explicit (§6) — no implicit "last tool wins" behavior.

6. **Discoverable.** Tooltips show shortcuts (`Space — Play/Pause`). `?` opens the cheat-sheet modal (§7.3) listing every shortcut grouped by category, searchable. The cheat sheet is auto-generated from the same `ShortcutMap` the handler uses — there is no second source of truth.

7. **Customizable (v2).** Users can remap any shortcut; the default map is sensible. The `ShortcutMap` interface (§8.6) is designed so a v2 settings panel can write a user override to `localStorage` and the handler picks it up on next focus. **v1 ships only the default map**; the customization UI is deferred.

8. **Testable.** Every shortcut resolves to exactly one `EngineCommand` (or a `batch` of them). Tests assert on the `EngineCommand` (via `engine.command.apply()` spy or via observing state change), not on the key event itself. This decouples test correctness from keyboard-layout quirks.

---

## 3. Keyboard Shortcut Inventory

Organized by category. For each shortcut:

- **Key** — the key combination, in `KeyboardEvent.key` notation (e.g., `Space`, `Cmd+Z`, `Shift+Left`). See §8.4 for `event.code` fallback on non-US layouts.
- **Action** — what it does, in user-facing language.
- **EngineCommand** — the serializable descriptor emitted to the command bus. **Canonical type is defined in spec 15 §4.1** (`15-wire-protocol.md`, shipped). Spec 16's §8.3 reproduces the overlapping types for cross-reference convenience only; spec 15 is normative. Where the command's `params` depend on runtime state (e.g., current playhead time), the value is shown as `<runtime>` and the resolver computes it from `engine.playback.getCurrentTime()` etc.
- **Context** — when the binding is active (`Always`, `When clip selected`, `When razor tool active`, `When track focused`, `When effects panel focused`, etc.).
- **FCP equiv** — the FCP keybinding for the same action, for muscle-memory transfer. `(none)` = FCP has no equivalent (uses menu/toolbar). `⚠ differs` = FCP uses a different key (documented in §6 conflict table).

### Conventions used in tables

- `Cmd` = `Meta` on macOS, `Ctrl` on Windows/Linux. The handler normalizes both to `Cmd` via `event.metaKey || event.ctrlKey` (matching FreeCut `react-hotkeys-hook` convention and OpenCut-classic `actions/keybinding.ts:5-6`).
- `Option` = `Alt` on Windows/Linux. Same normalization.
- `<currentFrame>` = `engine.playback.getCurrentFrame()`.
- `<currentTime>` = `engine.playback.getCurrentTime()` (a `MediaTime` integer in ticks — 120 000 ticks/sec, see spec 03 §3.1).
- `<duration>` = `engine.timeline.getTotalDuration()`.
- `<selected>` = `engine.selection.getSelectedElements()` → `Array<{ trackId, elementId }>`.
- `<focusedTrack>` = the track with keyboard focus (separate from selection — see §5.4).
- `<above>` / `<below>` / `<next>` / `<prev>` = spatial neighbors of the currently-focused clip, computed by the resolver from the timeline layout.

### 3.1 Playback

| Key | Action | EngineCommand | Context | FCP equiv |
|---|---|---|---|---|
| `Space` | Play / pause toggle | `play` if not playing, else `pause` | Always | Space |
| `J` | Reverse playback at 1× (shuttle) | `{ type: 'setRate', params: { rate: -1 } }` | Always | J |
| `K` | Pause (JKL shuttle stop) | `{ type: 'pause' }` | Always | K |
| `L` | Forward playback at 1× (shuttle) | `{ type: 'setRate', params: { rate: 1 } }` | Always | L |
| `Shift+J` | Reverse playback at 2× | `{ type: 'setRate', params: { rate: -2 } }` | Always | Shift+J |
| `Shift+L` | Forward playback at 2× | `{ type: 'setRate', params: { rate: 2 } }` | Always | Shift+L |
| `J` (pressed 2×) | Reverse at 2× (JKL multi-tap) | `{ type: 'setRate', params: { rate: -2 } }` | Always | J (multi-tap) |
| `L` (pressed 2×) | Forward at 2× (JKL multi-tap) | `{ type: 'setRate', params: { rate: 2 } }` | Always | L (multi-tap) |
| `J` (pressed 3×) | Reverse at 4× | `{ type: 'setRate', params: { rate: -4 } }` | Always | J (multi-tap) |
| `L` (pressed 3×) | Forward at 4× | `{ type: 'setRate', params: { rate: 4 } }` | Always | L (multi-tap) |
| `K` then `J` | Reverse at ½× (slow-mo) | `{ type: 'setRate', params: { rate: -0.5 } }` | Always | K+J |
| `K` then `L` | Forward at ½× (slow-mo) | `{ type: 'setRate', params: { rate: 0.5 } }` | Always | K+L |
| `Left` | Previous frame (1-frame step) | `{ type: 'seek', params: { time: <currentFrame - 1> } }` | Always | Left |
| `Right` | Next frame (1-frame step) | `{ type: 'seek', params: { time: <currentFrame + 1> } }` | Always | Right |
| `Shift+Left` | 10 frames back | `{ type: 'seek', params: { time: <currentFrame - 10> } }` | Always | Shift+Left |
| `Shift+Right` | 10 frames forward | `{ type: 'seek', params: { time: <currentFrame + 10> } }` | Always | Shift+Right |
| `Cmd+Left` | Go to start (time 0) | `{ type: 'seek', params: { time: 0 } }` | Always | Home |
| `Cmd+Right` | Go to end | `{ type: 'seek', params: { time: <duration> } }` | Always | End |
| `Home` | Go to start (alt) | `{ type: 'seek', params: { time: 0 } }` | Always | Home |
| `End` | Go to end (alt) | `{ type: 'seek', params: { time: <duration> } }` | Always | End |
| `PageUp` | Previous edit (jump to previous clip start) | `{ type: 'seek', params: { time: <prevEditPoint> } }` | Always | ⚠ differs (Up) |
| `PageDown` | Next edit (jump to next clip start) | `{ type: 'seek', params: { time: <nextEditPoint> } }` | Always | ⚠ differs (Down) |
| `Cmd+Shift+Left` | Jump to previous marker | `{ type: 'seekToMarker', params: { direction: -1 } }` | Always | Cmd+Up |
| `Cmd+Shift+Right` | Jump to next marker | `{ type: 'seekToMarker', params: { direction: 1 } }` | Always | Cmd+Down |
| `I` | Set in point at playhead | `{ type: 'setLoop', params: { start: <currentTime> } }` | Always | I |
| `O` | Set out point at playhead | `{ type: 'setLoop', params: { end: <currentTime> } }` | Always | O |
| `Shift+I` | Set in point at preview (gray playhead) | `{ type: 'setLoop', params: { start: <previewTime> } }` | When preview open | Shift+I |
| `Shift+O` | Set out point at preview | `{ type: 'setLoop', params: { end: <previewTime> } }` | When preview open | Shift+O |
| `Cmd+Shift+I` | Clear in point | `{ type: 'setLoop', params: { start: null } }` | Always | Option+I |
| `Cmd+Shift+O` | Clear out point | `{ type: 'setLoop', params: { end: null } }` | Always | Option+O |
| `Option+X` | Clear in + out (both) | `{ type: 'setLoop', params: { start: null, end: null } }` | Always | Option+X |
| `Cmd+Shift+G` | Loop playback toggle | `{ type: 'toggleLoopPlayback' }` | Always | Cmd+L ⚠ conflict |

**In/out points are `setLoop` halves** — spec 15 has no dedicated in/out-point commands; the mark-in/mark-out surface is expressed at the wire level as `setLoop`'s `start`/`end` (spec 15 §4.3.29), which is why `I`/`O` and their clear variants emit the rows above. Spec 03 §3.4's in/out-point behavior is the playback-side consumer of this window. **(Round 15 amendment, N12 — this is the canonical in/out model: 05 §11.2 is RETIRED by this resolution (R15).)** 05 §11.2's dedicated `InOutPoints` interface and its `G`-to-clear binding do not carry: clearing is `Cmd+Shift+I` / `Cmd+Shift+O` / `Option+X` (rows above), `G` is unbound in this spec (`Cmd+Shift+G` is loop-playback toggle, §3.1), and 18 §4.3/§4.9 already consume the halves form. The 05-side retirement edit lands in the parallel R15 05 pass.

**JKL multi-tap semantics:** `J` and `L` are stateful — each consecutive press within 500 ms of the previous increments speed by 1× (capped at 4×). Pressing `K` or `Space` resets the counter. The resolver tracks tap-count in a closure; the emitted `EngineCommand` always carries the absolute target rate, not a delta, so tests can assert directly on rate.

### 3.2 Tools

| Key | Action | EngineCommand | Context | FCP equiv |
|---|---|---|---|---|
| `V` | Select tool | `{ type: 'selectTool', params: { tool: 'select' } }` | Always | A |
| `B` | Razor (blade) tool | `{ type: 'selectTool', params: { tool: 'razor' } }` | Always | B |
| `H` | Hand tool (pan timeline) | `{ type: 'selectTool', params: { tool: 'hand' } }` | Always | H |
| `Z` | Zoom tool (click to zoom in, Alt-click to zoom out) | `{ type: 'selectTool', params: { tool: 'zoom' } }` | Always | Z |
| `T` | Trim tool (rollover edit between adjacent clips) | `{ type: 'selectTool', params: { tool: 'roll' } }` | Always | T |
| `Y` | Slip tool | `{ type: 'selectTool', params: { tool: 'slip' } }` | Always | Y |
| `U` | Slide tool | `{ type: 'selectTool', params: { tool: 'slide' } }` | Always | U |
| `R` | Ripple tool (selects the ripple editing tool) | `{ type: 'selectTool', params: { tool: 'ripple' } }` | Always | (none) |
| `Option+R` | Ripple mode toggle (global editing pref — affects all delete/insert/trim ops) | `{ type: 'toggleRipple' }` (UI) | Always | (none) |
| `N` | Snap toggle (global, affects all drag/trim/move ops) | `{ type: 'toggleSnap' }` | Always | N |
| `Escape` (when tool active) | Return to select tool | `{ type: 'selectTool', params: { tool: 'select' } }` | When non-select tool active | Esc |

**Note on §19 reconciliation:** spec 05 §19 recommended `C` for razor (FreeCut convention) and `S` for split. This spec adopts `B` for razor (FCP convention — `B` for "blade") and `Cmd+B` for split-at-playhead. Rationale: FCPXML is our handoff target (spec 10), so FCP muscle memory takes precedence over FreeCut's where they conflict. See §11 for the full reconciliation table.

**`toggleSnap` greenfield (audit Issue #14):** snap is a UI-layer concern (timeline viewport snapping during drag/trim/move). Spec 01's `TimelineManager` interface does not have a `toggleSnap` method. This spec therefore routes `toggleSnap` to `uiStore.timeline.toggleSnap()` (Zustand) — see §8.3 resolver + §12 cross-reference. The flag is 📝 NEW greenfield on the UI store; spec 01 may absorb it in a future revision. `toggleRipple` is NOT greenfield — `engine.command.isRippleEnabled` IS on EditorCore (spec 01 §3.1 line 215).

**R-key resolution (Round 15 amendment, A6):** `R` selects the ripple **TOOL** (`selectTool {tool:'ripple'}`, matching spec 18 §4.5's tool inventory — spec 15 §4.3.45's enum member); ripple **MODE** — the global editing pref that makes delete/insert/trim ops ripple — is NOT a tool: it rides `Option+R` above (or a transport-cluster toggle in 18 §4.5) and persists as `TimelineViewState.rippleMode` (spec 09 §3.1 — a view-level UI pref, both homes stated: ⌥R is the binding, `rippleMode` is the stored state). This collapses the three prior claimants: 16 §3.2's old `R` = mode toggle, 18 §4.5's ripple tool, and spec 15 §13.5's registry example mapping `R` → `selectTool razor` (that example row is corrected by this resolution — razor is `B` per §3.2; the 15-side text fix rides the R15 spec pass). The mock's binding (`R` → `setTool('ripple')`) implements this form.

### 3.3 Selection

| Key | Action | EngineCommand | Context | FCP equiv |
|---|---|---|---|---|
| `Tab` | Select next clip (timeline order) | `{ type: 'selectElements', params: { elements: [<next>], mode: 'replace' } }` | Timeline region focused (N11) | Tab |
| `Shift+Tab` | Select previous clip | `{ type: 'selectElements', params: { elements: [<prev>], mode: 'replace' } }` | Timeline region focused (N11) | Shift+Tab |
| `Cmd+A` | Select all clips on focused track | `{ type: 'selectElements', params: { elements: <allOnTrack>, mode: 'replace' } }` | When track focused | Cmd+A |
| `Cmd+Shift+A` | Select all clips in timeline | `{ type: 'selectElements', params: { elements: <all>, mode: 'replace' } }` | Always | Cmd+Shift+A |
| `Escape` | Deselect all | `{ type: 'selectElements', params: { elements: [], mode: 'replace' } }` | Always (when no tool override) | Esc |
| `Up` | Move focus to clip on track above (replace selection) | `{ type: 'selectElements', params: { elements: [<above>], mode: 'replace' } }` | When clip selected | Up |
| `Down` | Move focus to clip on track below (replace selection) | `{ type: 'selectElements', params: { elements: [<below>], mode: 'replace' } }` | When clip selected | Down |
| `Shift+Up` | Add clip on track above to selection | `{ type: 'selectElements', params: { elements: [<above>], mode: 'add' } }` | When clip selected | Shift+Up |
| `Shift+Down` | Add clip on track below to selection | `{ type: 'selectElements', params: { elements: [<below>], mode: 'add' } }` | When clip selected | Shift+Down |
| `Cmd+Up` | Move track focus up (no selection change) | `{ type: 'selectTrack', params: { trackId: <trackAbove>, mode: 'focus' } }` | Always | (none) |
| `Cmd+Down` | Move track focus down | `{ type: 'selectTrack', params: { trackId: <trackBelow>, mode: 'focus' } }` | Always | (none) |
| `Cmd+Shift+Up` | Move selected clips up one track | `{ type: 'move', params: { elementIds: <selection>, delta: 0, targetTrackId: <trackAbove> } }` | When clip selected | (none) |
| `Cmd+Shift+Down` | Move selected clips down one track | `{ type: 'move', params: { elementIds: <selection>, delta: 0, targetTrackId: <trackBelowOrCreate> } }` | When clip selected | (none) |
| `F` | Find playhead in timeline (select + scroll to clip under playhead) | `{ type: 'findPlayhead' }` | Always | Shift+Z |

**Spatial-neighbor resolution:** `<above>`, `<below>`, `<next>`, `<prev>` are computed by the resolver (not by the shortcut handler) by querying `engine.timeline.getElementsInTrack({ trackId })` and finding the element whose `[startTime, startTime+duration)` interval overlaps `<currentTime>`. If multiple clips overlap the playhead on the target track, the nearest clip *edge* wins. The resolution rules are part of the `EngineCommandResolver` contract (§8.3), not the keyboard handler — so tests can exercise them directly.

**(Round 15 registration, C2 extension):** `Shift+Up`/`Shift+Down` (add clip above/below), `Cmd+Shift+Up`/`Cmd+Shift+Down` (move clips between tracks), and `F` (find-playhead) are **implemented-pending** in the mock (`useShortcuts.ts`'s ArrowUp/Down branch covers single-level track focus only) — the §3.3 rows above STAND as spec; the deviation is registered in the C-ledger (SPEC-REVISION-CANDIDATES §E.3), not amended.

### 3.4 Editing Ops

| Key | Action | EngineCommand | Context | FCP equiv |
|---|---|---|---|---|
| `B` (razor mode) + click | Split at click point | `{ type: 'split', params: { time: <clickTime>, trackIds: [<clickedTrack>] } }` | Razor tool active | B (click) |
| `Cmd+B` | Split at playhead (focused track only) | `{ type: 'split', params: { time: <currentTime>, trackIds: null } }` | Always | Cmd+B |
| `Cmd+Shift+B` | Split all tracks at playhead | `{ type: 'split', params: { time: <currentTime>, trackIds: <all> } }` | Always | Cmd+Shift+B |
| `S` | Split at playhead (alt, single-key) | `{ type: 'split', params: { time: <currentTime>, trackIds: null } }` | Always (alt binding) | S |
| `Q` | Split + delete left half (ripple-close left) | `{ type: 'splitAndRemove', params: { time: <currentTime>, side: 'left', ripple: true } }` | When clip under playhead | Q |
| `W` | Split + delete right half (ripple-close right) | `{ type: 'splitAndRemove', params: { time: <currentTime>, side: 'right', ripple: true } }` | When clip under playhead | W |
| `[` | Trim clip start to playhead | `{ type: 'trim', params: { elementId: <selected>, edge: 'start', delta: <trimDelta>, ripple: false } }` | When clip selected or under playhead (N15) | [ |
| `]` | Trim clip end to playhead | `{ type: 'trim', params: { elementId: <selected>, edge: 'end', delta: <trimDelta>, ripple: false } }` | When clip selected or under playhead (N15) | ] |
| `Option+[` | Ripple-trim clip start to playhead | `{ type: 'trim', params: { elementId: <selected>, edge: 'start', delta: <trimDelta>, ripple: true } }` | When clip selected or under playhead (N15) | Option+[ |
| `Option+]` | Ripple-trim clip end to playhead | `{ type: 'trim', params: { elementId: <selected>, edge: 'end', delta: <trimDelta>, ripple: true } }` | When clip selected or under playhead (N15) | Option+] |
| `,` | Slip left 1 frame (source-window shift) | `{ type: 'slip', params: { elementId: <primarySelection>, delta: -4000 } }` | When clip selected, slip tool active | , |
| `.` | Slip right 1 frame | `{ type: 'slip', params: { elementId: <primarySelection>, delta: 4000 } }` | When clip selected, slip tool active | . |
| `Shift+,` | Slip left 10 frames | `{ type: 'slip', params: { elementId: <primarySelection>, delta: -40000 } }` | When clip selected | Shift+, |
| `Shift+.` | Slip right 10 frames | `{ type: 'slip', params: { elementId: <primarySelection>, delta: 40000 } }` | When clip selected | Shift+. |
| `Delete` | Delete selected (no ripple, leaves gap) | `{ type: 'delete', params: { elements: <selection>, ripple: false } }` | When clip selected | Delete |
| `Backspace` | Delete selection (alias of `Delete`, no ripple) | `{ type: 'delete', params: { elements: <selection>, ripple: false } }` | When clip selected | Delete |
| `Shift+Delete` | Ripple delete (closes gap) — the only ripple-delete chord | `{ type: 'delete', params: { elements: <selection>, ripple: true } }` | When clip selected | Shift+Delete |
| `Cmd+X` | Cut (copy + ripple delete) | `{ type: 'cut', params: { elements: <selected> } }` | When clip selected | Cmd+X |
| `Cmd+C` | Copy (to clipboard) | `{ type: 'copy', params: { elements: <selected> } }` | When clip selected | Cmd+C |
| `Cmd+V` | Paste at playhead (insert mode) | `{ type: 'paste', params: { atTime: <currentTime>, ripple: true } }` | Always | Cmd+V |
| `Cmd+Shift+V` | Paste at playhead (overwrite mode) | `{ type: 'paste', params: { atTime: <currentTime>, ripple: false } }` | Always | Cmd+Shift+V |
| `Cmd+Option+V` | Paste attributes (effects only, not clip content) | `{ type: 'pasteAttributes', params: { targetIds: <selected> } }` | When clip selected | Cmd+Option+V |
| `Cmd+D` | Duplicate (in place, offset by clip duration) | `{ type: 'duplicate', params: { elements: <selection>, placement: 'alwaysNew', timeOffset: <clipDuration> } }` | When clip selected | Cmd+D |
| `Cmd+Shift+D` | Duplicate + ripple (insert into timeline, shifting downstream) | `{ type: 'batch', label: 'Duplicate + ripple', commands: [...] }` | When clip selected | (none) |
| `Shift+F` | Freeze frame at playhead (insert 2-sec still) | `{ type: 'freezeFrame', params: { time: <currentTime>, duration: 2000000 } }` | When clip under playhead | (none) |
| `Cmd+Shift+J` | Join selected (merge adjacent clips into one) | `{ type: 'join', params: { elementIds: <selected> } }` | When ≥2 adjacent clips selected | (none) |
| `Cmd+Option+L` | Toggle A/V link on selected | `{ type: 'toggleAVLink', params: { elementIds: <selected> } }` | When clip selected | Cmd+Option+L |

**Slip vs. nudge:** Slip and nudge are both "delta on a clip" but operate on different fields. Slip shifts the *source* window (`sourceStart` / `sourceEnd`) while keeping timeline position fixed. Nudge shifts *timeline position* (`startTime`) while keeping the source window fixed. Both use `,` / `.` as keys — disambiguated by the active tool: **slip tool active → slip**, **any other tool → nudge**. See §6 conflict table.

**Delete-chord resolution (Round 15 amendment, A1):** `Delete`/`Backspace` are aliases for plain delete (no ripple); `Shift+Delete` (⇧⌫) is the ONLY ripple-delete chord; the `Cmd+Delete` alt row is dropped (18 §4.9's clip-menu row — Ripple delete `⇧⌫` — already matched this form). This resolves the 16 §3.4 vs 18 §4.9 conflict (the mock implements 18's form: `useShortcuts.ts`'s Delete/Backspace branch; cheat-sheet row `clips-ripple-delete` = `⇧Delete`).

**Trim-to-playhead targeting (Round 15 amendment, N15):** `[` / `]` (and their `Option+` ripple variants) target **all selected elements** when ≥1 is selected; with **no selection**, the clip under the playhead on the **focused track** (fallback: main track); **ACTIVE scene only** — no cross-scene fan-out. Multi-select fan-out issues one `trim` per element, batched per spec 15 §7. The mock's R13 P1 fix is the reference contract.

### 3.5 Track Ops

| Key | Action | EngineCommand | Context | FCP equiv |
|---|---|---|---|---|
| `Cmd+M` | Mute toggle (focused track) | `{ type: 'toggleTrackMute', params: { trackId: <focusedTrack> } }` | When track focused | Cmd+M |
| `Cmd+Shift+M` | Mute all tracks | `{ type: 'batch', label: 'Mute all', commands: <allTracks>.map(t => ({ type: 'toggleTrackMute', params: { trackId: t.id } })) }` | Always | (none) |
| `Cmd+Shift+Option+M` | Unmute all tracks | `{ type: 'batch', label: 'Unmute all', commands: ... }` | Always | (none) |
| `Cmd+Option+S` | Solo toggle (focused track) | `{ type: 'toggleTrackSolo', params: { trackId: <focusedTrack> } }` | When track focused | ⚠ differs |
| `Cmd+Shift+Option+S` | Clear all solos | `{ type: 'batch', label: 'Clear solo', commands: ... }` | Always | (none) |
| `Cmd+L` | Lock toggle (focused track) | `{ type: 'toggleTrackLock', params: { trackId: <focusedTrack> } }` | When track focused | Cmd+L |
| `Cmd+Shift+L` | Lock all tracks | `{ type: 'batch', label: 'Lock all', commands: ... }` | Always | (none) |
| `Cmd+Shift+Option+L` | Unlock all tracks | `{ type: 'batch', label: 'Unlock all', commands: ... }` | Always | (none) |
| `V` (when track header focused) | Toggle track visibility (focused track) | `{ type: 'toggleTrackVisibility', params: { trackId: <focusedTrack> } }` | When track header focused | Cmd+Shift+V |
| `Cmd+Shift+N` | New video track (append at bottom) | `{ type: 'addTrack', params: { type: 'video', index: null, name: 'Video ' + <nextN> } }` | Always | (none) |
| `Option+Cmd+Shift+N` | New audio track | `{ type: 'addTrack', params: { type: 'audio', index: null, name: 'Audio ' + <nextN> } }` | Always | (none) |
| `Cmd+Backspace` | Remove focused track (with confirmation if non-empty) | `{ type: 'deleteTrack', params: { trackId: <focusedTrack> } }` | When track focused | (none) |
| `Cmd+R` (track focused) | Rename focused track (opens inline input) | `{ type: 'beginRenameTrack', params: { trackId: <focusedTrack> } }` | When track focused | (none) |

**Conflict notes (resolved — see §6.1 #4, #6, #13–#18):** `Cmd+S` is **always save** (system-wide convention). Solo on focused track is `Cmd+Option+S` (matches §6.1 #4). `Cmd+Shift+V` is **always paste-overwrite** (FCP convention, §3.4). Visibility toggle is `V` when a track header has focus (context-disjoint from select-tool `V` via §6.2 step 6). `Cmd+Option+L` is **always A/V link toggle** (clip-context priority); Unlock-all-tracks reassigned to `Cmd+Shift+Option+L`. `Cmd+Option+M` is **always delete all markers** (per §3.7); Unmute-all-tracks reassigned to `Cmd+Shift+Option+M`. `Cmd+Shift+S` is **always Save-as** (FCP convention); Clear-all-solos reassigned to `Cmd+Shift+Option+S`. `Cmd+Shift+M` is **always Mute-all-tracks** (Always); Cycle-marker-color reassigned to `Option+Shift+M`. `Cmd+Option+E` is **always Export-frame** (Always); Reset-all-effects reassigned to `Cmd+Shift+Option+E`.

### 3.6 Nudge / Move (in select mode)

| Key | Action | EngineCommand | Context |
|---|---|---|---|
| `,` (in select mode) | Nudge left 1 frame | `{ type: 'move', params: { elementIds: <selection>, delta: -4000 } }` | When clip selected, select tool active |
| `.` (in select mode) | Nudge right 1 frame | `{ type: 'move', params: { elementIds: <selection>, delta: 4000 } }` | When clip selected, select tool active |
| `Shift+,` | Nudge left 10 frames | `{ type: 'move', params: { elementIds: <selection>, delta: -40000 } }` | When clip selected |
| `Shift+.` | Nudge right 10 frames | `{ type: 'move', params: { elementIds: <selection>, delta: 40000 } }` | When clip selected |
| `Cmd+Shift+,` | Nudge to previous clip edge (snap to nearest left edge) | `{ type: 'move', params: { elementIds: <selection>, delta: <snapDelta('prevEdge')> } }` | When clip selected |
| `Cmd+Shift+.` | Nudge to next clip edge | `{ type: 'move', params: { elementIds: <selection>, delta: <snapDelta('nextEdge')> } }` | When clip selected |
| `Option+,` | Slip left 1 frame (alt — see §6) | `{ type: 'slip', params: { elementId: <primarySelection>, delta: -4000 } }` | When clip selected |
| `Option+.` | Slip right 1 frame | `{ type: 'slip', params: { elementId: <primarySelection>, delta: 4000 } }` | When clip selected |
| `Option+Shift+,` | Slip left 10 frames | `{ type: 'slip', params: { elementId: <primarySelection>, delta: -40000 } }` | When clip selected |
| `Option+Shift+.` | Slip right 10 frames | `{ type: 'slip', params: { elementId: <primarySelection>, delta: 40000 } }` | When clip selected |

**Frame-to-ticks conversion:** 1 frame at 24 fps = `120000 / 24 = 5000` ticks. 10 frames = `50000` ticks. The table above uses `4000` because MediaTime is `120000 ticks/sec` but the canonical frame at 30 fps is `4000 ticks` (i.e., 30 fps assumed for the default). The resolver computes the actual delta from `engine.playback.getFrameRate()` so JKL/nudge on a 24 fps project steps by `5000`, on a 60 fps project by `2000`. **Tests must use `<runtime>` deltas** — the `EngineCommand` carries the absolute ticks, not a frame count. See §9.4.

### 3.7 Markers

| Key | Action | EngineCommand | Context | FCP equiv |
|---|---|---|---|---|
| `M` | Add marker at playhead (always adds — see the N8 note below) | `{ type: 'addMarker', params: { time: <currentTime> } }` | Always | M |
| `Shift+M` | Delete marker at playhead | `{ type: 'deleteMarker', params: { time: <currentTime> } }` | When marker at playhead | Shift+M |
| `Option+M` | Edit marker (open dialog, focus name field) | (UI only — opens marker dialog via uiStore; EngineCommand `updateMarker` fires on save) | When marker at playhead | (none) |
| `Cmd+Option+M` | Delete all markers | `{ type: 'batch', label: 'Delete all markers', commands: ... }` | Always | (none) |
| `Option+Shift+M` | Add marker at playhead with cycled color (next in the 8-color palette) | `{ type: 'addMarker', params: { time: <currentTime>, color: <nextColor> } }` | Always | (none) |
| `Up` (in marker nav mode) | Jump to previous marker | `{ type: 'seekToMarker', params: { direction: -1 } }` | Always | Cmd+Up |
| `Down` (in marker nav mode) | Jump to next marker | `{ type: 'seekToMarker', params: { direction: 1 } }` | Always | Cmd+Down |

**Marker color palette:** 8 colors — red, orange, yellow, green, blue, purple, pink, gray. Cycle order matches FCP. Color is stored on the marker (`Marker.color: string` — the A2 amendment's unified type; the old `Bookmark.color` shape is absorbed).

**M-key behavior (Round 15 amendment, N8 — DECIDED):** the mock's proven behavior is adopted: `M` **always adds** a marker at the playhead — there is no toggle/edit-at-playhead semantics (the v1.0 row's "or edit existing if one is at playhead" was undefined behavior: one gesture, one meaning, and the always-add form is pinned by the mock's tests). Editing an existing marker is `Option+M`'s dialog; deleting is `Shift+M` — the three verbs stay three keys. `Option+Shift+M` likewise **always adds** (with the next palette color) rather than cycling an existing marker's color. Command verbs on the two amended rows are aligned to spec 15 §4.3.49's shipped `addMarker` (spec 15 wins per §0.2); the remaining bookmark verbs (`toggleBookmark`/`removeBookmark`/`updateBookmark`) retire into the marker family via the A2 unification (09-side R15 pass). **A2-rename execution note (single owner — dated 2026-09-06, R15 fix wave; shared verbatim by 09 §3.1A):** the §3.7 binding rows above now speak the unified marker family's verbs (`deleteMarker`, `updateMarker`, `Marker.color`); the union's Bookmark block (spec 15 §4.3.39-42) retires at the next union-version bump per §4.1A's Bookmark row. ONE owner for the remaining fold: **spec 15 §13.15's C7 worklist** (the OT-side rename pass at A2).

### 3.8 View / Zoom

| Key | Action | EngineCommand | Context | FCP equiv |
|---|---|---|---|---|
| `+` / `=` | Zoom in (×1.5) | `{ type: 'zoom', params: { factor: 1.5 } }` | Always | Cmd++ |
| `-` | Zoom out (×0.667) | `{ type: 'zoom', params: { factor: 0.667 } }` | Always | Cmd+- |
| `Cmd+0` | Reset zoom to default (50 px/sec) | `{ type: 'zoom', params: { pixelsPerSecond: 50 } }` | Always | Cmd+0 |
| `Cmd++` | Zoom to fit timeline | `{ type: 'zoomToFit' }` | Always | Cmd+\ |
| `Cmd+\` | Zoom to fit (alt) | `{ type: 'zoomToFit' }` | Always | Cmd+\ |
| `Shift+\` | Zoom to 100% (1 frame = N px based on fps) | `{ type: 'zoom', params: { pixelsPerFrame: 10 } }` | Always | Shift+\ |
| `Cmd+Option+0` | Zoom to selection (fit selected clips in view) | `{ type: 'zoomToSelection' }` | When clip selected | (none) |
| `Cmd+Shift+F` | Toggle fullscreen preview (UI only) | (no EngineCommand — UI state) | Always | Cmd+Shift+F ⚠ conflict |
| `Cmd+1` | Switch to Edit workspace | (no EngineCommand — UI state) | Always | Cmd+1 |
| `Cmd+2` | Switch to Color workspace | (UI state) | Always | Cmd+2 |
| `Cmd+3` | Switch to Effects workspace | (UI state) | Always | Cmd+3 |
| `Cmd+4` | Switch to Audio workspace | (UI state) | Always | Cmd+4 |
| `Option+1` | Toggle Inspector panel | (UI state) | Always | (none) |
| `Option+2` | Toggle Effects panel | (UI state) | Always | (none) |
| `Option+3` | Toggle Media library panel | (UI state) | Always | (none) |
| `Option+4` | Toggle Markers panel | (UI state) | Always | (none) |
| `Cmd+'` | Toggle timeline ruler units (frames / timecode / seconds) | (UI state) | Always | (none) |
| `Cmd+;` | Toggle grid overlay in preview | (UI state) | Always | (none) |

**Fullscreen-preview conflict:** FCP uses `Cmd+Ctrl+F` for fullscreen; the binding `Cmd+Shift+F` here matches FreeCut's "open Scene Browser". Resolution: `Cmd+Shift+F` = **fullscreen preview** (more common in browser context where there is no separate Scene Browser window). Scene Browser opens via `Cmd+Option+B`.

### 3.9 Project / File

| Key | Action | EngineCommand | Context | FCP equiv |
|---|---|---|---|---|
| `Cmd+S` | Save project (debounced autosave immediate-flush) | `{ type: 'saveProject' }` | Always | Cmd+S |
| `Cmd+Shift+S` | Save as (open Save As dialog) | (UI only — opens dialog; EngineCommand fires on dialog confirm) | Always | Cmd+Shift+S |
| `Option+S` | Save a copy (does not change active project) | (UI only — opens Save-A-Copy dialog; EngineCommand fires on confirm) | Always | (none) |
| `Cmd+O` | Open project (open file picker) | (UI only) | Always | Cmd+O |
| `Cmd+N` | New project (open New Project dialog) | (UI only) | Always | Cmd+N |
| `Cmd+W` | Close project (confirm if unsaved) | `{ type: 'closeProject' }` | Always | Cmd+W |
| `Cmd+Shift+W` | Close all projects | `{ type: 'batch', label: 'Close all', commands: ... }` | Always | (none) |
| `Cmd+E` | Export FCPXML (saves .fcpxml file) | `{ type: 'exportFCPXML', params: { format: 'fcpxml-1.10', bundleMedia: false } }` | Always | Cmd+E |
| `Cmd+Shift+E` | Export master (cloud render — see spec 11; returns `data.renderJob`) | `{ type: 'exportMaster', params: { format: 'prores-4444', destination: 'cloud' } }` | Always | Cmd+Shift+E |
| `Cmd+Option+E` | Export current frame (PNG snapshot) | `{ type: 'exportFrame', params: { format: 'png', time: <currentTime> } }` | Always | (none) |
| `Cmd+P` | Print project summary (opens print dialog — UI only) | (UI only) | Always | (none) |
| `Cmd+Shift+R` | Reveal project file in OS file browser | (UI only) | Always | (none) |

**Export attribution (Round-7 update):** `exportFCPXML`, `exportMaster`, and `exportFrame` are spec-15-canonical command types (spec 15 §4.3.74-76, added by the Round-7 amendment — see spec 15 §13.11 and §14.11). They dispatch through `engine.command.apply()` like every other command: `apply({type:'exportFCPXML'})` → `engine.export.exportFCPXML({format, bundleMedia})` (ExportManager, spec 01 §14.11 — FCPXML is project-level metadata serialization, spec 10 §5 is the serializer); `apply({type:'exportMaster'})` → `engine.renderer.exportProject({format, destination, range})` (RendererManager — a render op, enqueues on spec 11's queue, returns a job handle); `apply({type:'exportFrame'})` → `engine.renderer.saveSnapshot({format, time})`. All three are non-undoable output commands — the artifact rides `CommandResult.data`, and state is not mutated (spec 15 §14.11). Spec 10's Tier-3 WYSIWYG test T3.2 (`Cmd+E` == direct `apply`) is un-gated by this change.

### 3.10 Undo / Redo

| Key | Action | EngineCommand | Context | FCP equiv |
|---|---|---|---|---|
| `Cmd+Z` | Undo | `{ type: 'undo' }` | Always | Cmd+Z |
| `Cmd+Shift+Z` | Redo | `{ type: 'redo' }` | Always | Cmd+Shift+Z |
| `Cmd+Y` | Redo (Windows convention — also works on macOS) | `{ type: 'redo' }` | Always | (Windows: Cmd+Y) |
| `Cmd+Option+Z` | Step backward in history (open history panel + step) | (UI: opens history panel, then ArrowUp/Down steps) | Always | (none) |
| `Cmd+Shift+Option+Z` | Step forward in history | (UI: history panel forward) | Always | (none) |

**Coalescing note:** per `06-nle-ops.md` §4.4, drag-ops coalesce at the manager layer via `previewElements()` → `commitPreview()` — a single drag is one undo step, not 50. Keyboard nudge (`,` / `.`) does NOT coalesce by default: each press is a discrete `move` command and a discrete undo step. **Hold `Option` while nudging** to coalesce: the first press begins a coalesced group, subsequent presses within 400 ms merge into the same undo step, releasing for 400 ms commits. This matches the `previewElements`/`commitPreview` pattern but with a keyboard-driven commit timer.

### 3.11 Effects / Color

| Key | Action | EngineCommand | Context | FCP equiv |
|---|---|---|---|---|
| `1`–`9` | Apply effect preset N to selected clip | `{ type: 'addEffect', params: { elementId: <selected>, effect: <presetN> } }` | When clip selected | (none) |
| `Shift+1`–`Shift+9` | Toggle effect N on/off (without removing) | `{ type: 'toggleEffect', params: { elementId: <selected>, effectIndex: <N> } }` | When clip selected | (none) |
| `Cmd+1`–`Cmd+9` | Switch color grading panel (Lift/Gamma/Gain/Saturation/etc.) | (UI only — panel focus) | Always | (none) |
| `Tab` (in effects panel) | Cycle focus through effects on selected clip | (UI only — panel navigation) | Effects panel focused | Tab |
| `Cmd+Shift+E` (in effects panel) | Enable/disable currently-focused effect | `{ type: 'toggleEffect', params: { elementId: <selected>, effectId: <focused> } }` | Effects panel focused | (none) |
| `Cmd+Shift+Option+E` | Reset all effects on selected clip to defaults | `{ type: 'resetEffects', params: { elementId: <selected> } }` | When clip selected | (none) |
| `Cmd+K` | Apply color correction (open Color page on selected clip) | (UI only — switches workspace + focuses clip) | When clip selected | (none) |
| `R` (in color page) | Reset color grade on selected clip | `{ type: 'resetColorGrade', params: { elementId: <selected> } }` | When clip selected, color page active | (none) |
| `Shift+R` | Match color from previous clip (color match) | `{ type: 'matchColor', params: { targetId: <selected>, sourceId: <prevClip> } }` | When clip selected | (none) |

### 3.12 Keyframes (when keyframe panel focused)

| Key | Action | EngineCommand | Context | FCP equiv |
|---|---|---|---|---|
| `K` (in keyframe panel) | Add keyframe at playhead for focused property | `{ type: 'upsertKeyframes', params: { elementId: <selected>, property: <focusedProp>, keyframes: [{ time: <currentTime>, value: <currentPropValue> }] } }` | Keyframe panel focused | K |
| `Shift+K` | Delete keyframe at playhead for focused property | `{ type: 'removeKeyframes', params: { elementId: <selected>, property: <focusedProp>, keyframeIds: [<kfAtPlayhead>] } }` | Keyframe panel focused | Shift+K |
| `Option+K` | Toggle keyframe navigation mode (snap to keyframes) | `{ type: 'toggleKeyframeNav' }` | Keyframe panel focused | (none) |
| `Cmd+Shift+K` | Clear all keyframes on focused property | `{ type: 'removeKeyframes', params: { elementId: <selected>, property: <focusedProp>, keyframeIds: <allKfsOnProp> } }` | Keyframe panel focused | (none) |
| `[` (in keyframe panel) | Jump to previous keyframe (focused property) | `{ type: 'seekToKeyframe', params: { direction: -1, property: <focusedProp> } }` | Keyframe panel focused | Option+[ |
| `]` (in keyframe panel) | Jump to next keyframe | `{ type: 'seekToKeyframe', params: { direction: 1, property: <focusedProp> } }` | Keyframe panel focused | Option+] |
| `Option+[` | Jump to previous keyframe (any property) | `{ type: 'seekToKeyframe', params: { direction: -1, property: null } }` | Keyframe panel focused | (none) |
| `Option+]` | Jump to next keyframe (any property) | `{ type: 'seekToKeyframe', params: { direction: 1, property: null } }` | Keyframe panel focused | (none) |
| `Up`/`Down` (in keyframe panel) | Nudge keyframe value ±1 (small step) | `{ type: 'nudgeKeyframe', params: { keyframeId: <focused>, valueDelta: <step> } }` | Keyframe panel focused, keyframe selected | Up/Down |
| `Shift+Up`/`Shift+Down` (in keyframe panel) | Nudge keyframe value ±10 (large step) | `{ type: 'nudgeKeyframe', params: { keyframeId: <focused>, valueDelta: <step*10> } }` | Keyframe panel focused, keyframe selected | Shift+Up/Down |
| `Left`/`Right` (in keyframe panel) | Nudge keyframe time ±1 frame | `{ type: 'retimeKeyframe', params: { elementId: <selected>, keyframeId: <focused>, time: <currentTime ± 1frame> } }` | Keyframe panel focused, keyframe selected | Left/Right |
| `Shift+Left`/`Shift+Right` (in keyframe panel) | Nudge keyframe time ±10 frames | `{ type: 'retimeKeyframe', params: { elementId: <selected>, keyframeId: <focused>, time: <currentTime ± 10frames> } }` | Keyframe panel focused, keyframe selected | Shift+Left/Right |
| `1` (in keyframe panel) | Switch to graph view | (UI only) | Keyframe panel focused | 1 |
| `2` (in keyframe panel) | Switch to dopesheet view | (UI only) | Keyframe panel focused | 2 |
| `3` (in keyframe panel) | Switch to split view | (UI only) | Keyframe panel focused | 3 |
| `F` (in keyframe panel) | Fit keyframe panel to selection | (UI only) | Keyframe panel focused | F |

**Spec 15 alignment:** keyframe command type names are aligned to spec 15 §4.1: `upsertKeyframes` (was spec-16-only `addKeyframe`), `removeKeyframes` (was `deleteKeyframe` / `clearKeyframes`), `retimeKeyframe` (was `moveKeyframe`). The spec-16 `nudgeKeyframe` and `seekToKeyframe` UI-layer extensions remain as composites (they wrap `upsertKeyframes` and `seek` respectively — see §8.3 resolver).

### 3.13 Help / Cheat Sheet

| Key | Action | EngineCommand | Context |
|---|---|---|---|
| `?` (Shift+/) | Open keyboard cheat sheet modal | (UI only — opens modal) | Always |
| `Cmd+?` | Open keyboard cheat sheet (alt) | (UI only) | Always |
| `Cmd+Shift+?` | Open settings → keyboard shortcuts (v2 remap UI) | (UI only) | Always |
| `F1` | Open contextual help (help for currently-focused UI element) | (UI only) | Always |
| `Escape` (when modal open) | Close modal / cancel dialog | (UI only) | Always |

**Cheat-sheet data source:** the modal reads from the same `ShortcutMap` the handler uses (§8.6). There is no second source of truth — if a shortcut is remapped (v2), the cheat sheet updates automatically.

---

## 4. Test-Friendly Interaction Patterns

Tests should prefer keyboard over mouse for setup and verification steps. Four patterns are supported, in increasing order of "realism" (and decreasing order of speed):

### Pattern 1 — Keyboard shortcut via Playwright (real UX path, medium speed)

Use this when the test verifies that the *keyboard shortcut wiring* is correct (e.g., "pressing `Cmd+B` triggers a split"). This is the only pattern that exercises the keyboard handler.

```ts
// Pattern 1: real keyboard path — exercises the full UI→handler→engine chain
test('Cmd+B splits at playhead', async ({ page }) => {
  await loadTestProject(page, 'simple-cut.json');
  await page.keyboard.press('Cmd+Right');      // Go to end
  await page.waitForTimeout(50);                // let playhead settle
  await page.keyboard.press('Cmd+B');            // Split

  const state = await getEngineState(page);
  const clips = state.scenes[0].tracks.main.elements;
  expect(clips).toHaveLength(2);                 // was 1, now 2
});
```

**Speed:** ~10 ms per keypress + ~50 ms settle. Total ~60 ms per assertion step.

### Pattern 2 — Direct `EngineCommand` (fast path, no UI)

Use this when the test verifies *engine behavior*, not keyboard wiring (e.g., "a split at time T produces 2 clips with correct durations"). This bypasses the keyboard handler and the DOM entirely.

```ts
// Pattern 2: direct command injection — fastest, no UI tax
test('split at time T produces 2 clips', async ({ page }) => {
  await loadTestProject(page, 'simple-cut.json');
  await page.evaluate(async (cmd) => {
    const engine = (window as any).engine;
    await engine.command.apply(cmd);            // spec 15 §4.4 contract
  }, {
    type: 'split',
    params: { time: 5_000_000, trackIds: null },
  });

  const state = await getEngineState(page);
  const clips = state.scenes[0].tracks.main.elements;
  expect(clips).toHaveLength(2);
  expect(clips[0].duration).toBe(5_000_000);
  expect(clips[1].startTime).toBe(5_000_000);
});
```

**Speed:** ~2 ms per command (no settle needed). Total ~5 ms per assertion step. **12× faster than Pattern 1.**

**Caveat:** `engine.command.apply(EngineCommand)` is the spec 15 §4.4 contract (shipped under TEST-02). The resolver lives in `src/ui/keyboard/engine-command-resolver.ts` (§8.3) and is exposed on `window.engine.command.apply` by the dev harness (which delegates to spec 15's `applyCommand()` dispatcher). Production code uses it via `import { applyEngineCommand } from '@/ui/keyboard/engine-command-resolver'`.

### Pattern 3 — Hybrid: keyboard to select, direct API to verify

Use this when the test exercises a *real keyboard interaction* but verifies via *direct state inspection* (avoiding flaky DOM assertions on selection state).

```ts
// Pattern 3: hybrid — keyboard for interaction, direct API for verification
test('Tab selects next clip', async ({ page }) => {
  await loadTestProject(page, 'three-clips.json');
  await page.keyboard.press('V');                 // Select tool
  await page.keyboard.press('Tab');              // Select first clip

  const selected = await page.evaluate(() =>
    (window as any).engine.selection.getSelectedElements()
  );
  expect(selected).toEqual([{ trackId: 'main', elementId: 'clip-1' }]);

  await page.keyboard.press('Tab');              // Select second clip
  const selected2 = await page.evaluate(() =>
    (window as any).engine.selection.getSelectedElements()
  );
  expect(selected2).toEqual([{ trackId: 'main', elementId: 'clip-2' }]);
});
```

**Speed:** ~10 ms per keypress + ~2 ms per state query. Total ~12 ms per step.

### Pattern 4 — Mouse only when testing mouse mechanics

Use mouse only when the *mouse interaction itself* is what's being tested: drag-marquee, trim-handle drag, razor-click precision, drop-target hover. For everything else (setup, state changes, verification), use Patterns 1–3.

```ts
// Pattern 4: mouse — only when testing mouse mechanics
test('trim handle drag respects snap', async ({ page }) => {
  await loadTestProject(page, 'snap-test.json');
  const handle = page.locator('[data-testid="trim-handle-right"]');
  const box = await handle.boundingBox();
  await page.mouse.move(box.x + 5, box.y + 5);
  await page.mouse.down();
  await page.mouse.move(box.x + 50, box.y + 5, { steps: 10 });   // drag right
  await page.mouse.up();

  const state = await getEngineState(page);    // verify via direct API
  expect(state.scenes[0].tracks.main.elements[0].duration).toBe(7_500_000);
});
```

**Speed:** ~200–800 ms per drag (20 mousemove events with `waitForTimeout` between moves). ~10× slower than Pattern 2 (direct EngineCommand). Use only when the mouse mechanic itself is the SUT.

### When to use which pattern

| Test goal | Pattern | Rationale |
|---|---|---|
| Verify keyboard wiring (does `Cmd+B` trigger split?) | 1 | The shortcut itself is the SUT |
| Verify engine op behavior (does split at T produce 2 clips?) | 2 | Engine is the SUT, keyboard is incidental |
| Verify selection model (does Tab advance selection?) | 3 | Selection is the SUT; keyboard is the trigger |
| Verify drag/trim/razor precision | 4 | Mouse mechanics are the SUT |
| Setup for a downstream assertion | 2 or 3 | Fastest, no SUT coupling |
| Cross-browser compat (Safari, Firefox) | 1 | Catches `event.key` vs `event.code` issues |

---

## 5. Keyboard Interaction for Multi-Select

Multi-select via keyboard avoids the drag-marquee (which requires precise coordinates):

### 5.1 Strategies (in order of preference)

1. **`Cmd+A` — select all on focused track.** Fastest for "select everything on this track". Requires track focus (set via `Cmd+Up`/`Cmd+Down` or by clicking the track header).
2. **`Cmd+Shift+A` — select all in timeline.** Fastest for "select everything everywhere". Use sparingly — affects all tracks including locked ones (which are skipped silently).
3. **`Shift+Tab` walking.** For selecting a *contiguous range* of N clips: press `Tab` to select the first, then `Shift+Tab` N-1 times. Wait — `Shift+Tab` *decrements*, so to select clips 1-5: press `Tab` (selects clip 1), then `Shift+Tab` does NOT add (it replaces and moves backward). **Correction:** for contiguous add, use `Shift+Tab` *only* if the implementation treats Shift as "add mode" — see §5.2.
4. **Direct `EngineCommand` for specific multi-selections.** When the test needs exactly clips `[1, 3, 5]` selected (non-contiguous), bypass keyboard entirely:

```ts
await page.evaluate(async (cmd) => {
  const engine = (window as any).engine;
  await engine.command.apply(cmd);
}, {
  type: 'selectElements',
  params: { elements: ['clip-1', 'clip-3', 'clip-5'], mode: 'replace' },
});
```

### 5.2 Shift semantics for `Tab` / `Shift+Tab`

- **`Tab`** = replace selection, advance to next clip.
- **`Shift+Tab`** = replace selection, retreat to previous clip.
- **`Cmd+Tab`** = add next clip to selection (extend forward). ⚠ Note: `Cmd+Tab` is intercepted by the OS on macOS for app switching. Resolution: **`Option+Tab`** = add next clip to selection (extend forward). **`Option+Shift+Tab`** = add previous clip to selection (extend backward).
- **`Cmd+A`** = replace with all-on-track.
- **`Cmd+Shift+A`** = replace with all-in-timeline.

### 5.3 Track-focus vs. selection

Track focus and selection are **orthogonal**:

- **Track focus** determines which track receives `Cmd+A`, mute/solo/lock ops, and `Tab` navigation. There is exactly one focused track at a time — **initialized to the TOPMOST track on scene load/switch** (Round 15 amendment, N11: the mock initialized focus to null and invented per-key fallbacks; the explicit init rule removes them — every fallback site reads the initialized focus instead).
- **Selection** is the set of selected clips, which can span multiple tracks. `Tab` walks the focused track's clips in time order; `Up`/`Down` move the selection to the clip on the adjacent track *at the same time*.

This separation lets a test do "select all on track 2, then nudge up to track 1" via: `Cmd+Down` (focus track 2) → `Cmd+A` (select all on track 2) → `Cmd+Shift+Up` (move selected up to track 1).

### 5.4 Setting track focus via keyboard

| Key | Action |
|---|---|
| `Cmd+Up` | Move track focus up one track |
| `Cmd+Down` | Move track focus down one track |
| `Cmd+Shift+Up` | Move track focus to top track |
| `Cmd+Shift+Down` | Move track focus to bottom track |
| `Cmd+1`–`Cmd+9` (timeline focused) | Focus track N directly |
| `F2` | Focus the track under the playhead |

---

## 6. Conflicts and Disambiguation

Some keys have multiple meanings depending on context. **Every conflict is resolved explicitly — there are no implicit "whichever handler is on top wins" behaviors.** The resolution rules below are normative: the keyboard handler checks context *in the documented order* and emits exactly one `EngineCommand` (or none, if no rule matches).

### 6.1 Conflict resolution table

| # | Key | Meaning A (context A) | Meaning B (context B) | Resolution | Notes |
|---|---|---|---|---|---|
| 1 | `L` | Forward playback (always) | Lock track (when track focused) | **`L` = playback (always).** Track lock is `Cmd+L`. | §3.1 vs §3.5 |
| 2 | `,` / `.` | Slip (when slip tool active) | Nudge (when select tool active) | **Tool-mode determines op.** Slip tool → slip; any other tool → nudge. Alt: `Option+,`/`Option+.` always slips. | §3.4 vs §3.6 |
| 3 | `M` | Add marker (always) | Mute track (when track focused) | **`M` = marker (always).** Mute is `Cmd+M`. | §3.7 vs §3.5 |
| 4 | `S` | Solo track (when track focused) | Save project (always) | **`Cmd+S` = save (always).** Solo is `Cmd+Option+S`. | §3.5 vs §3.9 |
| 5 | `B` | Razor tool (when not in razor mode) | Split at click (when in razor mode) | **Tool-mode determines op.** Not razor → select razor tool; razor + click → split at click. `Cmd+B` always splits at playhead regardless of tool. | §3.2 vs §3.4 |
| 6 | `Cmd+Shift+V` | Paste overwrite (always) | Toggle visibility (when track header focused) | **`Cmd+Shift+V` = paste overwrite (always).** Track visibility is `V` when a track header has focus (context-disjoint from select-tool `V` via §6.2 step 6 — track-header focus XOR not-focused). Paste attributes is `Cmd+Option+V` (no conflict). | §3.4 vs §3.5 |
| 7 | `K` | Pause (JKL shuttle) | Add keyframe (when keyframe panel focused) | **Panel focus determines op.** Keyframe panel focused → add keyframe; otherwise → pause. | §3.1 vs §3.12 |
| 8 | `Shift+Left` / `Shift+Right` | Jump 5 sec (OpenCut-classic) | Nudge 10 frames (FreeCut) | **`Shift+Left`/`Shift+Right` = 10-frame nudge** (more useful day-to-day). 5-sec jump removed; use `PageUp`/`PageDown` for edit-point navigation. | §3.1 (this spec) vs §19 (OpenCut-classic) |
| 9 | `Cmd+Shift+F` | Toggle fullscreen preview | Open Scene Browser (FreeCut) | **`Cmd+Shift+F` = fullscreen preview** (browser context). Scene Browser is `Cmd+Option+B`. | §3.8 |
| 10 | `Cmd+L` | Lock focused track (this spec) | Loop playback toggle (some editors) | **`Cmd+L` = lock track.** Loop playback is `Cmd+Shift+G` (avoids Cmd+L entirely). | §3.5 |
| 11 | `Cmd+1`–`Cmd+9` | Switch workspace (§3.8) | Apply effect preset (§3.11, no Cmd) | **Workspace = `Cmd+1`–`Cmd+9`.** Effect presets = `1`–`9` (no modifier). No conflict — different modifiers. | §3.8 vs §3.11 |
| 12 | `Tab` | Select next clip (timeline region focused) | Cycle focus in effects panel (effects panel focused) | **Panel focus determines op.** Effects panel focused → cycle effects; timeline region focused → select next clip. (Round 15 amendment, N11 — §3.3's context column now reads "Timeline region focused", reconciling its old "Always" with this row.) | §3.3 vs §3.11 |
| 13 | `Cmd+Option+L` | Toggle A/V link (when clip selected) | Unlock all tracks (always) | **`Cmd+Option+L` = A/V link toggle (clip-context priority).** Unlock-all-tracks reassigned to `Cmd+Shift+Option+L` (4-key chord). | §3.4 vs §3.5 (audit Issue #8 fix) |
| 14 | `Cmd+Option+E` | Export current frame (always) | Reset all effects (when clip selected) | **`Cmd+Option+E` = export frame (Always-active primary).** Reset-all-effects reassigned to `Cmd+Shift+Option+E`. | §3.9 vs §3.11 (audit Issue #8 fix) |
| 15 | `Cmd+Option+M` | Delete all markers (always) | Unmute all tracks (always) | **`Cmd+Option+M` = delete all markers.** Unmute-all-tracks reassigned to `Cmd+Shift+Option+M`. | §3.7 vs §3.5 (audit Issue #8 fix) |
| 16 | `Cmd+Option+S` | Solo focused track (when track focused) | Save a copy (always) | **`Cmd+Option+S` = solo focused track** (per §6.1 #4 resolution). Save-a-copy reassigned to `Option+S` (alternate save variant — matches §6.3 Option-key convention). | §3.5 vs §3.9 (audit Issue #8 fix) |
| 17 | `Cmd+Shift+M` | Mute all tracks (always) | Cycle marker color (when marker at playhead) | **`Cmd+Shift+M` = mute all tracks (Always).** Cycle-marker-color reassigned to `Option+Shift+M`. | §3.5 vs §3.7 (audit Issue #8 fix) |
| 18 | `Cmd+Shift+S` | Save as (always) | Clear all solos (always) | **`Cmd+Shift+S` = save as (FCP convention, primary).** Clear-all-solos reassigned to `Cmd+Shift+Option+S` (4-key chord — "clear all" pattern per §6.3). | §3.9 vs §3.5 (audit Issue #8 fix) |

### 6.2 Context-resolution order

When a key could match multiple rules, the handler evaluates contexts in this order (first match wins):

1. **Modal open** → only `Escape`, `Enter`, `Tab` (focus trap) are active. All other keys suppressed.
2. **Text input focused** → only `Cmd+` shortcuts are active (see §8.5). Single-key shortcuts suppressed.
3. **Panel-specific context** (keyframe panel focused, effects panel focused, color page active) → panel-specific bindings take precedence over timeline bindings.
4. **Tool-specific context** (razor tool active, slip tool active) → tool-specific bindings take precedence over select-mode bindings.
5. **Selection context** (clip selected vs. none) → selection-required bindings active only when ≥1 clip selected.
6. **Track focus context** (track focused vs. none) → track-focus bindings active only when a track has keyboard focus.
7. **Always** → catch-all bindings (playback, navigation, file ops).

### 6.3 Conflict-avoidance principle

When adding a new shortcut, the following modifier precedence is observed (avoids creating new conflicts):

1. **Single key** — preferred for hotkeys (playback, tools).
2. **Shift+key** — preferred for "more" variants (10× frames, 2× speed).
3. **Option+key** — preferred for "alternate op on same target" (slip vs. nudge, preview-in vs. timeline-in).
4. **Cmd+key** — reserved for file/meta/global ops (save, undo, all-tracks).
5. **Cmd+Shift+key** — reserved for "all" or "destructive" variants (split all tracks, ripple delete).
6. **Cmd+Option+key** — reserved for "reset" or "clear all" ops.

New shortcuts MUST be checked against this table before addition; the cheat sheet (§7.3) auto-renders conflicts as a warning.

---

## 7. Accessibility

### 7.1 ARIA labels

Every keyboard shortcut has a corresponding ARIA label on the UI element it triggers (where one exists):

- Toolbar buttons: `aria-label="Razor tool (B)"`.
- Menu items: `aria-keyshortcuts="Cmd+S"` on the Save menu item.
- Timeline clips: `aria-label="Clip 1, Video, 5 seconds. Press Tab to select next, Delete to remove."`.

Shortcuts that have no UI element (e.g., `J`/`K`/`L` shuttle) are exposed via a hidden `aria-live="polite"` region that announces the current playback state when shuttle keys are pressed.

### 7.2 Screen reader announcements

When a shortcut fires, the handler emits a `KeyboardShortcutFired` event that the screen-reader helper listens to and announces:

```
"Split at playhead, frame 1250"
"Selected clip 2 of 5"
"Razor tool active"
```

Announcements are concise (≤6 words) and include the resulting state, not the keypress.

### 7.3 Cheat-sheet modal

`?` opens a modal listing every shortcut grouped by category (§3's 13 categories). Features:

- **Searchable** — typing filters by key, action, or category.
- **Conflict warnings** — shortcuts that are "shadowed" in some context (e.g., `K` in keyframe panel) show a small `⚠ context-dependent` badge.
- **Per-shortcut test ID** — each row has `data-testid="shortcut-<action-id>"` so tests can assert cheat-sheet completeness.
- **Export** — `Cmd+E` in the modal exports the map as JSON (for sharing custom maps in v2).
- **ARIA** — the modal is a focus trap; `Tab` cycles within; `Escape` closes.

The modal reads from `ShortcutMap.getDescriptors()` (§8.6) — same source of truth as the handler.

### 7.4 Customization (v2)

The `ShortcutMap` interface (§8.6) supports per-user overrides:

- Stored in `localStorage` under `nle.shortcuts.userMap`.
- Merges over the default map on handler init.
- A v2 settings panel (`Cmd+Shift+?`) provides a remap UI with conflict detection.
- v1 ships with **no remap UI** but the `ShortcutMap` interface is stable so v2 can add it without breaking tests.

---

## 8. Implementation

### 8.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (document)                                          │
│     │                                                        │
│     │ keydown event                                          │
│     ▼                                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ KeyboardHandler  (src/ui/keyboard/handler.ts)        │   │
│  │  - listens on document                                │   │
│  │  - normalizes event → ShortcutKey string              │   │
│  │  - looks up ShortcutMap → ShortcutDescriptor          │   │
│  │  - checks context predicates                         │   │
│  │  - emits EngineCommand via EngineCommandResolver      │   │
│  │  - calls preventDefault() on match                    │   │
│  └──────────────────────────────────────────────────────┘   │
│     │                                                        │
│     │ EngineCommand                                          │
│     ▼                                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ EngineCommandResolver  (src/ui/keyboard/resolver.ts)  │   │
│  │  - resolves <runtime> params (currentTime, selected)   │   │
│  │  - resolves <spatial> neighbors (above, next, etc.)   │   │
│  │  - calls engine.timeline.X / engine.playback.X /       │   │
│ │    engine.command.X                                      │   │
│  │  - wraps multi-step ops in BatchCommand                │   │
│  │  - returns CommandResult (or throws on invalid context) │   │
│  └──────────────────────────────────────────────────────┘   │
│     │                                                        │
│     ▼                                                        │
│  EditorCore (engine singleton)                              │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 KeyboardHandler (handler.ts)

```ts
// src/ui/keyboard/handler.ts
import type { EditorCore } from '@/core/editor';
import type { UIStore } from '@/ui/store';
import { ShortcutMap, type ShortcutKey, type ShortcutDescriptor } from './shortcut-map';
import { resolveEngineCommand, type ResolverContext } from './resolver';
import { isTextInput, isModalOpen } from './context';

export class KeyboardHandler {
  private readonly engine: EditorCore;
  private readonly uiStore: UIStore;        // UI state (panel focus, viewport, snap, etc.) — see §0.2
  private readonly map: ShortcutMap;
  private readonly disposeFns: Array<() => void> = [];
  private readonly ctx: ResolverContext;

  constructor(engine: EditorCore, uiStore: UIStore, map: ShortcutMap = ShortcutMap.default()) {
    this.engine = engine;
    this.uiStore = uiStore;
    this.map = map;
    this.ctx = { engine, uiStore };
  }

  attach(target: Document | HTMLElement = document): void {
    const onKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);
    target.addEventListener('keydown', onKeyDown, { capture: true });
    this.disposeFns.push(() => target.removeEventListener('keydown', onKeyDown, { capture: true } as any));
  }

  dispose(): void {
    this.disposeFns.forEach((fn) => fn());
    this.disposeFns.length = 0;
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Context gate 1: modal focus trap
    if (isModalOpen() && !this.isModalAllowedKey(e)) return;

    // Context gate 2: text input suppression (single-key only)
    const inTextInput = isTextInput(e.target as HTMLElement);
    const key = this.keyFromEvent(e);                              // e.g. "Cmd+B" or "Space"

    const descriptor = this.map.lookup(key);
    if (!descriptor) return;
    if (inTextInput && !descriptor.allowInTextInput) return;

    // Context gate 3: context predicate (uses engine + uiStore — see §6.2 step 3)
    if (!descriptor.contextPredicate(this.ctx)) return;

    // Emit EngineCommand, resolve, apply
    e.preventDefault();
    const command = descriptor.buildCommand(this.ctx);
    resolveEngineCommand(command, this.ctx);                       // routes to engine or uiStore per §8.3
  }

  private keyFromEvent(e: KeyboardEvent): ShortcutKey {
    const parts: string[] = [];
    if (e.metaKey || e.ctrlKey) parts.push('Cmd');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Option');
    // Prefer event.code for layout independence (§8.4), fallback to event.key
    const key = e.code === '' ? e.key : this.codeToKey(e.code);
    parts.push(key);
    return parts.join('+') as ShortcutKey;
  }

  private isModalAllowedKey(e: KeyboardEvent): boolean {
    return ['Escape', 'Enter', 'Tab'].includes(e.key);
  }

  private codeToKey(code: string): string {
    // Map physical key codes to logical key names
    // e.g., 'KeyB' → 'B', 'ArrowLeft' → 'Left', 'Space' → 'Space'
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Arrow')) return code.slice(5);
    if (code === 'Minus') return '-';
    if (code === 'Equal') return '=';
    if (code === 'BracketLeft') return '[';
    if (code === 'BracketRight') return ']';
    if (code === 'Comma') return ',';
    if (code === 'Period') return '.';
    if (code === 'Backslash') return '\\';
    if (code === 'Slash') return '/';
    return code;
  }
}
```

### 8.3 EngineCommandResolver (resolver.ts)

The resolver is the **serialization boundary** between the UI (keyboard, mouse, programmatic) and the engine. It converts a serializable `EngineCommand` into either:

1. A direct manager method call (for queries / non-undoable ops like `play`, `seek`), OR
2. A `Command` instance pushed through `CommandManager.execute({ command })` (for undoable ops).

```ts
// src/ui/keyboard/engine-command.ts
// Aligned to spec 15 (`15-wire-protocol.md`) §4.1 canonical EngineCommand union.
// Spec 16 reproduces spec-15-overlapping types for cross-reference convenience;
// spec 15 is normative. UI-layer extensions (marked `UI` below) are spec-16-only
// and are NOT part of spec 15's wire protocol — they route to the UI store
// (Zustand) instead of engine.command.apply(). See §0.2.

export type EngineCommand =
  // ── Spec-15-canonical types (verbatim from `15-wire-protocol.md` §4.1) ──
  // Playback
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'seek'; params: { time: number } }                      // MediaTime in ticks
  | { type: 'setRate'; params: { rate: number } }
  | { type: 'setLoop'; params: { start: number | null; end: number | null } }   // spec 15 §4.3.29 — start/end (was in/out)
  // Tool / selection
  | { type: 'selectTool'; params: { tool: 'select' | 'razor' | 'ripple' | 'slip' | 'slide' | 'roll' | 'rate-stretch' | 'hand' | 'zoom' } }   // spec 15 §4.3.45 enum (spec 18 §4.5 mirrors it; `T` maps to roll)
  | { type: 'selectElements'; params: { elements: ElementRef[]; mode?: 'replace' | 'add' | 'subtract' | 'toggle' } }   // spec 15 §4.3.46 — elements/mode
  | { type: 'selectTrack'; params: { trackId: string; mode: 'focus' } }
  // Timeline ops
  | { type: 'split'; params: { time: number; trackIds: string[] | null } }
  | { type: 'trim'; params: { elementId: string; edge: 'start' | 'end'; delta: number; ripple: boolean } }   // spec 15 §4.3.2 — delta; resolver converts edge+delta → absolute trimStart/trimEnd (reads current state)
  | { type: 'slip'; params: { elementId: string; delta: number } }   // spec 15 §4.3.x — single element; multi-select emits N commands or a batch
  | { type: 'move'; params: { elementIds: string[]; delta: number; targetTrackId: string | null; movePlan?: PlannedElementMove[]; createTracks?: PlannedTrackCreation[]; snap?: boolean } }   // spec 15 §4.3.3 — simple form (elementIds+delta+targetTrackId) or explicit movePlan
  | { type: 'delete'; params: { elements: ElementRef[]; ripple: boolean } }   // spec 15 §4.3.9 — elements
  | { type: 'duplicate'; params: { elements: ElementRef[]; placement?: 'auto' | 'end' | 'adjacent'; timeOffset?: number; idSeed?: string } }   // spec 15 §4.3.10
  | { type: 'freezeFrame'; params: { time: number; duration: number } }
  // Track ops
  | { type: 'toggleTrackMute'; params: { trackId: string } }
  | { type: 'toggleTrackSolo'; params: { trackId: string } }
  | { type: 'toggleTrackLock'; params: { trackId: string } }
  | { type: 'toggleTrackVisibility'; params: { trackId: string } }
  | { type: 'addTrack'; params: { type: 'video' | 'audio'; index: number | null; name: string } }
  | { type: 'deleteTrack'; params: { trackId: string } }             // spec 15 name (was `removeTrack`)
  // Scene / bookmark
  | { type: 'toggleBookmark'; params: { time: number } }
  | { type: 'removeBookmark'; params: { time: number } }
  | { type: 'updateBookmark'; params: { time: number; updates: Partial<Bookmark> } }
  // Clipboard
  | { type: 'copy'; params: { elements: ElementRef[] } }   // spec 15 §4.3.68
  | { type: 'cut'; params: { elements: ElementRef[] } }   // spec 15 §4.3.69 — copy + delete (BatchCommand)
  | { type: 'paste'; params: { atTime: number; targetTrackId?: string; ripple?: boolean } }   // spec 15 §4.3.70 — atTime; insert/overwrite is resolver-level (sets ripple/placement)
  // Undo / redo
  | { type: 'undo' }
  | { type: 'redo' }
  // Effect
  | { type: 'addEffect'; params: { elementId: ElementRef; effect: EffectPreset } }
  | { type: 'toggleEffect'; params: { elementId: ElementRef; effectIndex?: number; effectId?: string } }
  // Keyframe (spec 15 names: `upsertKeyframes`, `removeKeyframes`, `retimeKeyframe`)
  | { type: 'upsertKeyframes'; params: { elementId: ElementRef; property: string; keyframes: Keyframe[] } }   // was `addKeyframe`
  | { type: 'removeKeyframes'; params: { elementId: ElementRef; property: string; keyframeIds: string[] } }   // was `deleteKeyframe`/`clearKeyframes`
  | { type: 'retimeKeyframe'; params: { elementId: ElementRef; keyframeId: string; time: number } }            // was `moveKeyframe`

  // ── Spec-16 UI-layer extensions (NOT in spec 15; route to UI store) ──
  // These commands affect UI state (panel focus, viewport, snap, ripple flag) or
  // are composite helpers not modeled by spec 15's wire protocol.
  | { type: 'toggleSnap' }                                            // UI — see note in §12; 📝 NEW greenfield
  | { type: 'toggleRipple' }                                         // UI — flips `engine.command.isRippleEnabled`
  | { type: 'findPlayhead' }                                         // UI — composite select+scroll
  | { type: 'splitAndRemove'; params: { time: number; side: 'left' | 'right'; ripple: boolean } }   // UI — BatchCommand helper
  | { type: 'pasteAttributes'; params: { targetIds: ElementRef[] } }  // UI — attribute-only paste
  | { type: 'join'; params: { elementIds: ElementRef[] } }            // UI — BatchCommand helper
  | { type: 'toggleAVLink'; params: { elementIds: ElementRef[] } }   // UI — property toggle (composite)
  | { type: 'beginRenameTrack'; params: { trackId: string } }         // UI — opens inline input
  | { type: 'seekToMarker'; params: { direction: 1 | -1 } }          // UI — resolver finds nearest marker, then emits `seek`
  | { type: 'toggleLoopPlayback' }                                   // UI — flips UI store flag, then emits `setLoop`
  | { type: 'zoom'; params: { factor?: number; pixelsPerSecond?: number; pixelsPerFrame?: number } }     // UI
  | { type: 'zoomToFit' }                                            // UI
  | { type: 'zoomToSelection' }                                     // UI
  | { type: 'resetEffects'; params: { elementId: ElementRef } }       // UI — composite (maps to N×`removeEffect`)
  | { type: 'resetColorGrade'; params: { elementId: ElementRef } }    // UI — composite
  | { type: 'matchColor'; params: { targetId: ElementRef; sourceId: ElementRef } }  // UI — composite
  | { type: 'seekToKeyframe'; params: { direction: 1 | -1; property: string | null } }   // UI — resolver finds kf, then emits `seek`
  | { type: 'nudgeKeyframe'; params: { keyframeId: string; valueDelta: number } }   // UI — composite (maps to `updateKeyframeCurves`)
  | { type: 'toggleKeyframeNav' }                                    // UI — flips UI store flag

  // ── Export ops (spec 15 §4.3.74-76 — canonical since the Round-7 amendment) ──
  // Output commands: non-undoable, non-mutating; artifact/job handle in CommandResult.data.
  | { type: 'exportFCPXML'; params: { format?: 'fcpxml-1.10' | 'fcpxml-1.11'; bundleMedia?: boolean } }
  | { type: 'exportMaster'; params: { format?: string; destination?: 'cloud' | 'local'; range?: { start: number; end: number } | null } }
  | { type: 'exportFrame'; params: { format?: 'png' | 'jpg'; time?: number } }

  // ── Project (spec 15) ──
  | { type: 'saveProject' }
  | { type: 'closeProject' }

  // ── Batch (spec 15 §7 transaction) ──
  | { type: 'batch'; label: string; commands: EngineCommand[] };

export type ElementRef = { trackId: string; elementId: string };

// NOTE: This union is a *subset reproducing* spec 15 §4.1 for the keyboard
// handler's local compilation. Spec 15's full union (78 types including
// `insert`, `ripple`, `roll`, `slide`, `rangeRemoval`, `updateElements`,
// `toggleElementVisibility`, `toggleElementMuted`, `reorderTrack`,
// `createProject`, `loadProject`, `updateProjectSettings`, `createScene`,
// `deleteScene`, `renameScene`, `switchScene`, `moveBookmark`,
// `importMedia`, `deleteMedia`, `marqueeSelect`, `addMarker`, `deleteMarker`,
// `updateMarker`, `updateEffect`, `removeEffect`, `reorderEffect`,
// `addMask`, `updateMask`, `removeMask`, `toggleMask`,
// `addTransition`, `updateTransition`, `removeTransition`,
// `updateKeyframeCurves`, `cut`, `snapshot`) is in `15-wire-protocol.md` §4.1.
// Commands not bound to a keyboard shortcut in this spec are omitted from the
// local reproduction; they remain available via `engine.command.apply()`.
```

```ts
// src/ui/keyboard/resolver.ts
import type { EditorCore } from '@/core/editor';
import type { EngineCommand, ElementRef } from './engine-command';
import type { UIStore } from '@/ui/store';                 // Zustand store for UI state
import { BatchCommand } from '@/commands/batch-command';
import { SplitElementsCommand } from '@/commands/timeline/element/split-elements';
import { DeleteElementsCommand } from '@/commands/timeline/element/delete-elements';
import { MoveElementsCommand } from '@/commands/timeline/element/move-elements';
import { DuplicateElementsCommand } from '@/commands/timeline/element/duplicate-elements';
import { InsertElementCommand } from '@/commands/timeline/element/insert-element';
import { ToggleTrackMuteCommand } from '@/commands/timeline/track/toggle-track-mute';
import { ToggleTrackSoloCommand } from '@/commands/timeline/track/toggle-track-solo';
import { ToggleTrackLockCommand } from '@/commands/timeline/track/toggle-track-lock';
import { ToggleTrackVisibilityCommand } from '@/commands/timeline/track/toggle-track-visibility';
import { AddTrackCommand } from '@/commands/timeline/track/add-track';
import { RemoveTrackCommand } from '@/commands/timeline/track/remove-track';  // implements `deleteTrack`
import { ToggleBookmarkCommand } from '@/commands/scenes/toggle-bookmark';
import { RemoveBookmarkCommand } from '@/commands/scenes/remove-bookmark';
import { UpdateBookmarkCommand } from '@/commands/scenes/update-bookmark';
import { UpsertKeyframesCommand } from '@/commands/timeline/keyframe/upsert-keyframes';
import { RemoveKeyframesCommand } from '@/commands/timeline/keyframe/remove-keyframes';
import { RetimeKeyframeCommand } from '@/commands/timeline/keyframe/retime-keyframe';
import { AddEffectCommand } from '@/commands/timeline/effect/add-effect';
import { UpdateElementsCommand } from '@/commands/timeline/element/update-elements';
import { CopyClipboardEntry } from '@/clipboard/commands/copy-clipboard-entry';
import { PasteClipboardCommand } from '@/clipboard/commands/paste-clipboard';

/**
 * The resolver routes an EngineCommand to either:
 *   (a) `engine.command.apply(cmd)` — for spec-15-canonical types (undoable engine state),
 *   (b) `engine.<manager>.<method>(...)` directly — for non-undoable engine state (play, seek, etc.),
 *   (c) `uiStore.<setter>(...)` — for spec-16 UI-layer extensions (panel focus, viewport, snap, etc.).
 *
 * Spec 15 (`15-wire-protocol.md` §4.4) defines `apply()`. The keyboard handler's
 * `engine.command.apply(cmd)` is a thin shim that delegates to spec 15's dispatcher.
 *
 * The resolver is exhaustive over the spec-16 EngineCommand union (§8.3 above).
 * Spec-15-only types NOT bound to a keyboard shortcut (e.g., `insert`, `roll`,
 * `slide`, `marqueeSelect`, `addMask`, `addTransition`, `snapshot`, `cut`) are
 * intentionally omitted from this switch — they are available via
 * `engine.command.apply()` directly.
 */

export interface ResolverContext {
  engine: EditorCore;
  uiStore: UIStore;        // Zustand store — see §0.2 (UI state lives in store, NOT on EditorCore)
}

export function resolveEngineCommand(
  command: EngineCommand,
  ctx: ResolverContext,
): void | Promise<void> {
  const { engine, uiStore } = ctx;
  switch (command.type) {
    // ── Playback (direct manager calls, non-undoable) ──────────────
    case 'play': engine.playback.play(); return;
    case 'pause': engine.playback.pause(); return;
    case 'seek': engine.playback.seek(command.params.time); return;
    case 'setRate': engine.playback.setRate(command.params.rate); return;
    case 'setLoop': engine.playback.setLoop(command.params.start, command.params.end); return;   // spec 15 §4.3.29

    // ── Tool / selection ─────────────────────────────────────────────
    // Per spec 15 §4.2: `selectTool` → `engine.selection.setActiveTool({tool})`.
    // UI state (active tool flag for toolbar highlight) is mirrored to uiStore via subscribe.
    case 'selectTool':
      engine.selection.setActiveTool({ tool: command.params.tool });
      uiStore.setActiveTool(command.params.tool);
      return;

    // ── Spec-16 UI-layer extensions (routed to uiStore, not engine) ──
    case 'toggleSnap':
      // 📝 NEW greenfield — see §12. Snap is a UI-layer flag (timeline viewport
      // snapping on/off). Lives in uiStore; not part of spec 01's TimelineManager.
      uiStore.timeline.toggleSnap();
      return;
    case 'toggleRipple':
      // engine.command.isRippleEnabled IS on EditorCore (spec 01 §3.1 line 215).
      engine.command.isRippleEnabled = !engine.command.isRippleEnabled;
      return;
    case 'findPlayhead':
      // UI-layer composite: select clip under playhead + scroll timeline viewport.
      uiStore.timeline.findPlayhead(engine);
      return;
    case 'toggleLoopPlayback':
      uiStore.playback.toggleLoopPlayback(engine);
      return;
    case 'beginRenameTrack':
      uiStore.tracks.beginRenameTrack(command.params.trackId);
      return;
    case 'toggleKeyframeNav':
      uiStore.keyframes.toggleKeyframeNav();
      return;

    // ── Zoom / viewport (UI-layer; routed to uiStore) ───────────────
    case 'zoom': uiStore.timelineViewport.zoom(command.params); return;
    case 'zoomToFit': uiStore.timelineViewport.zoomToFit(); return;
    case 'zoomToSelection':
      uiStore.timelineViewport.zoomToElements(engine.selection.getSelectedElements());
      return;

    // ── Markers (composite / UI-bridge) ─────────────────────────────
    case 'seekToMarker': {
      // Resolver finds nearest marker, then delegates to `seek`.
      const t = engine.scenes.findNearestBookmark({
        from: engine.playback.getCurrentTime(),
        direction: command.params.direction,
      });
      engine.playback.seek(t);
      return;
    }
    case 'seekToKeyframe': {
      // Resolver finds nearest keyframe on focused property (or any), then delegates.
      const t = engine.timeline.findNearestKeyframe({
        from: engine.playback.getCurrentTime(),
        direction: command.params.direction,
        property: command.params.property,
      });
      engine.playback.seek(t);
      return;
    }

    // ── Element ops (undoable via Command instances) ────────────────
    case 'split': {
      const elements = command.params.trackIds
        ? engine.timeline.getElementsInTracks({ trackIds: command.params.trackIds })
            .filter((e) => overlap(e, command.params.time))
        : engine.selection.getSelectedElements();
      const cmd = new SplitElementsCommand({ elements, splitTime: command.params.time });
      engine.command.execute({ command: cmd });
      return;
    }

    case 'splitAndRemove': {
      // Composite: split + delete one half. Implemented as BatchCommand.
      const splitCmd = new SplitElementsCommand({
        elements: engine.selection.getSelectedElements(),
        splitTime: command.params.time,
      });
      const deleteCmd = new DeleteElementsCommand({
        elements: pickHalfAfterSplit(splitCmd, command.params.side),
        ripple: command.params.ripple,
      });
      engine.command.execute({ command: new BatchCommand([splitCmd, deleteCmd], command.params.side + '-half removal') });
      return;
    }

    case 'trim': {
      engine.timeline.updateElementTrim({
        elementId: command.params.elementId,
        ...computeTrimPatch(command.params, engine),   // edge+delta → absolute trimStart/trimEnd/startTime/duration (spec 15 §4.3.2)
      });
      return;
    }

    case 'slip': {
      engine.timeline.updateElements({
        updates: computeSlipDeltas(command.params, engine),
        pushHistory: true,
      });
      return;
    }

    case 'move': {
      const cmd = new MoveElementsCommand({
        moves: command.params.movePlan
          ?? planSimpleMoves(command.params, engine),   // elementIds+delta+targetTrackId → one PlannedElementMove per element (spec 15 §4.3.3)
        createTracks: command.params.createTracks,      // PlannedTrackCreation[] | undefined
      });
      engine.command.execute({ command: cmd });
      return;
    }

    case 'delete': {
      const elements = command.params.elements;
      if (command.params.ripple) {
        const cmd = buildRippleDeleteCommand({ elements, engine });
        engine.command.execute({ command: cmd });
      } else {
        engine.command.execute({ command: new DeleteElementsCommand({ elements, ripple: false }) });
      }
      return;
    }

    case 'duplicate': {
      const cmd = new DuplicateElementsCommand({
        elements: command.params.elements,             // ElementRef[] (spec 15 §4.3.10)
        placement: command.params.placement, timeOffset: command.params.timeOffset,
      });
      engine.command.execute({ command: cmd });
      return;
    }

    case 'freezeFrame': {
      // Composite: split + insert still frame. Implemented as BatchCommand.
      const splitCmd = new SplitElementsCommand({
        elements: engine.selection.getSelectedElements(),
        splitTime: command.params.time,
      });
      const insertCmd = new InsertElementCommand({
        element: buildFreezeFrameElement(command.params),
        placement: 'after-split',
      });
      engine.command.execute({ command: new BatchCommand([splitCmd, insertCmd], 'freeze-frame insert') });
      return;
    }

    case 'join': {
      // Composite: merge adjacent clips into one. Implemented as BatchCommand
      // (delete-right + extend-left).
      const cmds = buildJoinCommands(command.params, engine);
      engine.command.execute({ command: new BatchCommand(cmds, 'join') });
      return;
    }

    case 'toggleAVLink': {
      engine.timeline.updateElements({
        updates: command.params.elementIds.map(({ elementId, trackId }) => ({
          elementId, trackId, patch: { linked: !engine.timeline.getElement({ trackId, elementId }).linked },
        })),
        pushHistory: true,
      });
      return;
    }

    // ── Track ops ───────────────────────────────────────────────────
    case 'toggleTrackMute':
      engine.command.execute({ command: new ToggleTrackMuteCommand({ trackId: command.params.trackId }) });
      return;
    case 'toggleTrackSolo':
      engine.command.execute({ command: new ToggleTrackSoloCommand({ trackId: command.params.trackId }) });
      return;
    case 'toggleTrackLock':
      engine.command.execute({ command: new ToggleTrackLockCommand({ trackId: command.params.trackId }) });
      return;
    case 'toggleTrackVisibility':
      engine.command.execute({ command: new ToggleTrackVisibilityCommand({ trackId: command.params.trackId }) });
      return;
    case 'addTrack':
      engine.command.execute({ command: new AddTrackCommand({
        type: command.params.type, index: command.params.index ?? undefined, name: command.params.name,
      }) });
      return;
    case 'deleteTrack':                                    // spec 15 name (was `removeTrack`)
      engine.command.execute({ command: new RemoveTrackCommand({ trackId: command.params.trackId }) });
      return;

    // ── Undo/redo ───────────────────────────────────────────────────
    case 'undo': engine.command.undo(); return;
    case 'redo': engine.command.redo(); return;

    // ── Scene / bookmark ────────────────────────────────────────────
    case 'toggleBookmark':
      engine.command.execute({ command: new ToggleBookmarkCommand({ time: command.params.time }) });
      return;
    case 'removeBookmark':
      engine.command.execute({ command: new RemoveBookmarkCommand({ time: command.params.time }) });
      return;
    case 'updateBookmark':
      engine.command.execute({ command: new UpdateBookmarkCommand({
        time: command.params.time, updates: command.params.updates,
      }) });
      return;

    // ── Project / file ──────────────────────────────────────────────
    case 'saveProject':
      engine.project.saveCurrentProject(); return;
    case 'closeProject':
      engine.project.closeProject(); return;               // spec 01 §14.2: `closeProject()` (was `closeCurrentProject()`)
    case 'exportFCPXML':
    case 'exportMaster':
    case 'exportFrame':
      // Output commands go through the canonical dispatcher so the keyboard
      // path and the direct-apply path are the same code (spec 10 T3.2 WYSIWYG).
      // The resolver does NOT read CommandResult.data — the shell listens for
      // exportArtifactReady / renderComplete events (spec 15 §9.1) and triggers
      // the browser download from the artifact (spec 18 §4.8 Deliver page).
      engine.command.apply(command);
      return;

    // ── Clipboard (aligned to spec 15 §4.2 method names) ─────────────
    case 'copy':
      // spec 15 §4.3.68 wire `elements` → engine `elementIds` (plain IDs).
      engine.clipboard.copyClipboardEntry({ elementIds: command.params.elements.map((e) => e.elementId) });
      return;
    case 'cut': {
      // spec 15 §4.3.69: copy + delete (BatchCommand internally).
      // Implemented via engine.clipboard.buildCutCommand (which returns a BatchCommand).
      const cmd = engine.clipboard.buildCutCommand({ elementIds: command.params.elements.map((e) => e.elementId) });
      engine.command.execute({ command: cmd });
      return;
    }
    case 'paste': {
      // spec 15 §4.2: `engine.clipboard.buildPasteClipboardCommand({atTime, targetTrackId})` → BatchCommand.
      const cmd = engine.clipboard.buildPasteClipboardCommand({
        atTime: command.params.atTime,                                          // spec 15 §4.3.70
        targetTrackId: command.params.targetTrackId ?? uiStore.timeline.focusedTrackId,
        ripple: command.params.ripple,                                          // true = insert, false = overwrite
      });
      engine.command.execute({ command: cmd });
      return;
    }
    case 'pasteAttributes': {
      // spec-16-only: attribute-only paste (composite). Reuses clipboard helpers.
      const cmd = engine.clipboard.buildPasteAttributesCommand({ targetIds: command.params.targetIds });
      engine.command.execute({ command: cmd });
      return;
    }

    // ── Effects ──────────────────────────────────────────────────────
    case 'addEffect':
      engine.command.execute({ command: new AddEffectCommand({
        elementId: command.params.elementId, effect: command.params.effect,
      }) });
      return;
    case 'toggleEffect':
      engine.timeline.updateClipEffectParams({
        elementId: command.params.elementId,
        effectId: command.params.effectId,
        effectIndex: command.params.effectIndex,
        params: { enabled: !getEffectEnabled(engine, command.params) },
      });
      return;
    case 'resetEffects': {
      // Composite: remove every effect on the element.
      const effIds = engine.timeline.getElementEffects(command.params.elementId).map(e => e.id);
      const cmds = effIds.map(id => new RemoveEffectCommand({ elementId: command.params.elementId, effectId: id }));
      engine.command.execute({ command: new BatchCommand(cmds, 'reset-effects') });
      return;
    }
    case 'resetColorGrade':
      engine.timeline.updateElements({
        updates: [{ elementId: command.params.elementId, trackId: command.params.elementId.trackId, patch: { colorGrade: DEFAULT_COLOR_GRADE } }],
        pushHistory: true,
      });
      return;
    case 'matchColor':
      engine.color.matchColor({ targetId: command.params.targetId, sourceId: command.params.sourceId });
      return;

    // ── Keyframes (spec 15 names: `upsertKeyframes`, `removeKeyframes`, `retimeKeyframe`) ─
    case 'upsertKeyframes':                                // was `addKeyframe`
      engine.command.execute({ command: new UpsertKeyframesCommand({
        elementId: command.params.elementId, keyframes: command.params.keyframes,
      }) });
      return;
    case 'removeKeyframes':                                // was `deleteKeyframe` / `clearKeyframes`
      engine.command.execute({ command: new RemoveKeyframesCommand({
        elementId: command.params.elementId, keyframeIds: command.params.keyframeIds,
      }) });
      return;
    case 'retimeKeyframe':                                 // was `moveKeyframe`
      engine.command.execute({ command: new RetimeKeyframeCommand({
        elementId: command.params.elementId, keyframeId: command.params.keyframeId, time: command.params.time,
      }) });
      return;
    case 'nudgeKeyframe': {
      // Composite: read current keyframe, compute new value, upsert.
      const kf = engine.timeline.getKeyframe(command.params.keyframeId);
      const updated = { ...kf, value: kf.value + command.params.valueDelta };
      engine.command.execute({ command: new UpsertKeyframesCommand({
        elementId: kf.elementId, keyframes: [updated],
      }) });
      return;
    }

    // ── Selection ───────────────────────────────────────────────────
    case 'selectElements':
      // spec 15 §4.3.46 — wire and engine share the {elements, mode} shape.
      engine.selection.setSelectedElements({
        elements: command.params.elements,
        mode: command.params.mode,
      });
      return;
    case 'selectTrack':
      // spec 15 §4.2: `engine.selection.setSelectedTrack({trackId})`.
      engine.selection.setSelectedTrack({ trackId: command.params.trackId });
      uiStore.timeline.setFocusedTrackId(command.params.trackId);
      return;

    // ── Batch (transaction — spec 15 §7) ────────────────────────────
    case 'batch': {
      // Recursively resolve each sub-command to a Command instance, then wrap in BatchCommand.
      // `resolveToCommandInstance` is the *non-executing* variant of `resolveEngineCommand`;
      // it returns the constructed Command (for undoable ops) or null (for non-undoable ops,
      // which are applied immediately via direct manager calls inside the helper).
      const resolved = command.commands.map((c) => resolveToCommandInstance(c, ctx));
      const cmds = resolved.filter((c): c is Command => c !== null);
      if (cmds.length === 0) return;       // batch of non-undoable ops — already applied
      engine.command.execute({ command: new BatchCommand(cmds, command.label) });
      return;
    }

    default: {
      const _exhaustive: never = command;
      throw new Error(`Unknown EngineCommand type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

/**
 * Resolve a sub-command to a Command instance WITHOUT executing it. Used by `batch`
 * to collect undoable sub-commands into a BatchCommand for atomic execution.
 *
 * - For undoable ops: returns the constructed Command instance.
 * - For non-undoable ops (play, seek, selectTool, etc.): applies the side effect
 *   immediately (via direct manager call / uiStore setter) and returns `null`,
 *   signaling "no Command to wrap".
 *
 * This signature fixes audit Issue #9 (undefined `resolveToCommandInstance`)
 * and Issue #22 (return-type mismatch). The split between `resolveEngineCommand`
 * (executes + returns void) and `resolveToCommandInstance` (returns Command,
 * does not execute) matches spec 15 §4.4's `apply()` vs `buildCommand()` split.
 */
function resolveToCommandInstance(
  command: EngineCommand,
  ctx: ResolverContext,
): Command | null {
  const { engine, uiStore } = ctx;
  switch (command.type) {
    // Undoable ops — return Command instance without executing.
    case 'split': {
      const elements = command.params.trackIds
        ? engine.timeline.getElementsInTracks({ trackIds: command.params.trackIds })
            .filter((e) => overlap(e, command.params.time))
        : engine.selection.getSelectedElements();
      return new SplitElementsCommand({ elements, splitTime: command.params.time });
    }
    case 'delete':
      return new DeleteElementsCommand({
        elements: command.params.elements, ripple: command.params.ripple,
      });
    case 'move':
      return new MoveElementsCommand({
        moves: command.params.movePlan ?? planSimpleMoves(command.params, engine),   // spec 15 §4.3.3
        createTracks: command.params.createTracks,
      });
    case 'duplicate':
      return new DuplicateElementsCommand({
        elements: command.params.elements,             // ElementRef[] (spec 15 §4.3.10)
        placement: command.params.placement, timeOffset: command.params.timeOffset,
      });
    case 'toggleTrackMute':
      return new ToggleTrackMuteCommand({ trackId: command.params.trackId });
    case 'toggleTrackSolo':
      return new ToggleTrackSoloCommand({ trackId: command.params.trackId });
    case 'toggleTrackLock':
      return new ToggleTrackLockCommand({ trackId: command.params.trackId });
    case 'toggleTrackVisibility':
      return new ToggleTrackVisibilityCommand({ trackId: command.params.trackId });
    case 'addTrack':
      return new AddTrackCommand({
        type: command.params.type, index: command.params.index ?? undefined, name: command.params.name,
      });
    case 'deleteTrack':
      return new RemoveTrackCommand({ trackId: command.params.trackId });
    case 'toggleBookmark':
      return new ToggleBookmarkCommand({ time: command.params.time });
    case 'removeBookmark':
      return new RemoveBookmarkCommand({ time: command.params.time });
    case 'updateBookmark':
      return new UpdateBookmarkCommand({ time: command.params.time, updates: command.params.updates });
    case 'upsertKeyframes':
      return new UpsertKeyframesCommand({
        elementId: command.params.elementId, keyframes: command.params.keyframes,
      });
    case 'removeKeyframes':
      return new RemoveKeyframesCommand({
        elementId: command.params.elementId, keyframeIds: command.params.keyframeIds,
      });
    case 'retimeKeyframe':
      return new RetimeKeyframeCommand({
        elementId: command.params.elementId, keyframeId: command.params.keyframeId, time: command.params.time,
      });
    case 'addEffect':
      return new AddEffectCommand({
        elementId: command.params.elementId, effect: command.params.effect,
      });
    case 'paste': {
      // spec 15 §4.2: `buildPasteClipboardCommand` returns a BatchCommand.
      return engine.clipboard.buildPasteClipboardCommand({
        atTime: command.params.atTime,                                          // spec 15 §4.3.70
        targetTrackId: command.params.targetTrackId ?? uiStore.timeline.focusedTrackId,
        ripple: command.params.ripple,                                          // true = insert, false = overwrite
      });
    }
    case 'cut':
      // spec 15 §4.2: `buildCutCommand` returns a BatchCommand (copy + delete).
      return engine.clipboard.buildCutCommand({ elementIds: command.params.elements.map((e) => e.elementId) });
    case 'pasteAttributes':
      // spec-16-only: attribute-only paste (composite).
      return engine.clipboard.buildPasteAttributesCommand({ targetIds: command.params.targetIds });
    case 'copy':
      // `copy` is non-undoable (just sets clipboard state) — apply immediately, return null.
      engine.clipboard.copyClipboardEntry({ elementIds: command.params.elements.map((e) => e.elementId) });
      return null;

    // Non-undoable ops — apply immediately, return null (no Command to wrap).
    case 'play': engine.playback.play(); return null;
    case 'pause': engine.playback.pause(); return null;
    case 'seek': engine.playback.seek(command.params.time); return null;
    case 'setRate': engine.playback.setRate(command.params.rate); return null;
    case 'setLoop': engine.playback.setLoop(command.params.start, command.params.end); return null;   // spec 15 §4.3.29
    case 'selectTool':
      engine.selection.setActiveTool({ tool: command.params.tool });
      uiStore.setActiveTool(command.params.tool);
      return null;
    case 'selectElements':
      engine.selection.setSelectedElements({ elements: command.params.elements, mode: command.params.mode });
      return null;
    case 'selectTrack':
      engine.selection.setSelectedTrack({ trackId: command.params.trackId });
      uiStore.timeline.setFocusedTrackId(command.params.trackId);
      return null;
    case 'undo': engine.command.undo(); return null;
    case 'redo': engine.command.redo(); return null;
    case 'saveProject': engine.project.saveCurrentProject(); return null;
    case 'closeProject': engine.project.closeProject(); return null;

    default:
      // For all other spec-16 UI extensions / composites inside a batch,
      // fall back to executing via resolveEngineCommand (which handles them).
      resolveEngineCommand(command, ctx);
      return null;
  }
}
```

The resolver is **pure** (no side effects beyond calling engine methods + uiStore setters), so tests can call it directly:

```ts
import { resolveEngineCommand } from '@/ui/keyboard/resolver';

test('resolver splits at given time', () => {
  const engine = createTestEngine({ project: 'simple-cut.json' });
  const uiStore = createTestUIStore();      // Zustand test fixture
  resolveEngineCommand(
    { type: 'split', params: { time: 5_000_000, trackIds: null } },
    { engine, uiStore },
  );
  expect(engine.timeline.getTrackById({ trackId: 'main' }).elements).toHaveLength(2);
});
```

### 8.4 Non-US keyboard layout handling

The handler prefers `event.code` (physical key position) over `event.key` (logical character) for layout independence:

- On a QWERTY layout, pressing the physical `KeyZ` key produces `event.key === 'z'` and `event.code === 'KeyZ'`. Both work for `Cmd+Z` (undo).
- On an AZERTY layout, the same physical `KeyZ` key produces `event.key === 'w'` but `event.code === 'KeyZ'`. Using `event.code`, `Cmd+Z` (undo) still works as expected.
- On a Dvorak layout, physical `KeyZ` produces `event.key === ';'` but `event.code === 'KeyZ'`. Same fix.

**Exceptions (use `event.key`):**

- Symbol keys (`?`, `/`, `\`, `[`, `]`, `,`, `.`, `+`, `-`, `=`) — these are layout-dependent on physical position, but the *character* is what users think of. Use `event.key` and document the QWERTY assumption.
- Letter keys in text-input mode — irrelevant (single-key shortcuts suppressed).

The `keyFromEvent` function (§8.2) uses `event.code` for letter/arrow keys and `event.key` for symbols. Tests should use Playwright's `page.keyboard.press('KeyZ')` notation OR the character form — Playwright normalizes both.

### 8.5 Text-input handling

When a text input (`<input>`, `<textarea>`, `[contenteditable]`) has focus:

- **Single-key shortcuts are suppressed** — typing `B` into a clip name field should not select the razor tool.
- **`Cmd+` shortcuts remain active** — `Cmd+S` (save), `Cmd+Z` (undo), `Cmd+C`/`Cmd+V`/`Cmd+X` (clipboard) still work, because they don't conflict with normal typing (browsers reserve `Cmd+` for app shortcuts).
- **`Escape` remains active** — to blur the input and return focus to the timeline.

The `isTextInput(target)` helper:

```ts
export function isTextInput(target: HTMLElement | null): boolean {
  if (!target) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input') {
    const type = (target as HTMLInputElement).type.toLowerCase();
    return !['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'file'].includes(type);
  }
  if (tag === 'textarea') return true;
  if (target.isContentEditable) return true;
  return false;
}
```

### 8.6 ShortcutMap

The `ShortcutMap` is a `Map<ShortcutKey, ShortcutDescriptor[]>` (note: array of descriptors per key — see Issue #8 resolution below) with these features:

- **Default map** — the v1 default, defined in §3.
- **User overrides** (v2) — merged over default from `localStorage`.
- **Context predicates** — each descriptor carries a `contextPredicate(ctx)` that returns `true` if the shortcut is active in the current context (selected clip exists, tool active, panel focused, etc.). Predicates receive the full `ResolverContext` (engine + uiStore) so they can evaluate UI-layer context (keyframe panel focused, color page active, etc.).
- **Allow-in-text-input flag** — `Cmd+` shortcuts set this to `true`; single-key shortcuts set to `false`.
- **Multi-descriptor-per-key support** — when two shortcuts share a key (e.g., `K` = pause / add-keyframe, `R` = ripple-tool / reset-color-grade), the `register()` call appends a second descriptor. At lookup time, the handler iterates the descriptor array and picks the first whose `contextPredicate(ctx)` returns `true`. Direct conflicts (two descriptors both `Always` active) are flagged as errors at register time.

> **Audit fix (Issue #8):** The original spec 16 used `Map<ShortcutKey, ShortcutDescriptor>` and threw on any duplicate registration. That invariant was incompatible with the Appendix A bindings that legitimately share a key across disjoint contexts (e.g., `K` = pause when keyframe panel NOT focused vs. `K` = add-keyframe when keyframe panel focused). The refactor to `Map<ShortcutKey, ShortcutDescriptor[]>` resolves this without losing the dev-time invariant: `register()` still throws for true conflicts (two descriptors both `Always`), but allows context-disjoint duplicates.

```ts
// src/ui/keyboard/shortcut-map.ts
import type { EditorCore } from '@/core/editor';
import type { UIStore } from '@/ui/store';
import type { EngineCommand } from './engine-command';
import type { ResolverContext } from './resolver';

export type ShortcutKey = string;    // e.g. "Cmd+B", "Space", "Shift+Left"

export interface ShortcutDescriptor {
  /** The key combination, normalized. */
  key: ShortcutKey;
  /** User-facing action label (for cheat sheet + tooltip + ARIA). */
  action: string;
  /** Category (for cheat-sheet grouping). */
  category: ShortcutCategory;
  /** Factory that builds the EngineCommand (may read engine + uiStore state for runtime params). */
  buildCommand: (ctx: ResolverContext) => EngineCommand;
  /** Returns true if the shortcut is active in the current context. */
  contextPredicate: (ctx: ResolverContext) => boolean;
  /** If false (default), shortcut is suppressed when a text input has focus. */
  allowInTextInput?: boolean;
  /** FCP equivalent for cheat-sheet "muscle memory" column. */
  fcpEquiv?: string;
  /** Conflict notes for cheat-sheet warnings. */
  conflicts?: string[];
}

export type ShortcutCategory =
  | 'playback' | 'tools' | 'selection' | 'editing'
  | 'track' | 'nudge' | 'markers' | 'view'
  | 'project' | 'undo' | 'effects' | 'keyframes' | 'help';

export class ShortcutMap {
  // Map-of-arrays: each key may have multiple descriptors with disjoint context predicates.
  // The first descriptor whose contextPredicate(ctx) returns true wins (per §6.2 order).
  private readonly map = new Map<ShortcutKey, ShortcutDescriptor[]>();

  static default(): ShortcutMap {
    const m = new ShortcutMap();
    m.register({
      key: 'Space',
      action: 'Play / Pause',
      category: 'playback',
      buildCommand: (ctx) => ctx.engine.playback.isPlaying() ? { type: 'pause' } : { type: 'play' },
      contextPredicate: () => true,
      fcpEquiv: 'Space',
    });
    m.register({
      key: 'Cmd+B',
      action: 'Split at playhead',
      category: 'editing',
      buildCommand: (ctx) => ({
        type: 'split',
        params: { time: ctx.engine.playback.getCurrentTime(), trackIds: null },
      }),
      contextPredicate: () => true,
      allowInTextInput: true,
      fcpEquiv: 'Cmd+B',
    });
    m.register({
      key: 'Cmd+Z',
      action: 'Undo',
      category: 'undo',
      buildCommand: () => ({ type: 'undo' }),
      contextPredicate: () => true,
      allowInTextInput: true,
      fcpEquiv: 'Cmd+Z',
    });
    // Context-disjoint duplicate example: `K` is pause (always, JKL context) AND
    // add-keyframe (when keyframe panel focused). Both registrations succeed because
    // their context predicates are disjoint (keyframe-panel-focus XOR not-focused).
    m.register({
      key: 'K',
      action: 'Pause (JKL shuttle stop)',
      category: 'playback',
      buildCommand: () => ({ type: 'pause' }),
      contextPredicate: (ctx) => !ctx.uiStore.keyframes.isPanelFocused(),
      fcpEquiv: 'K',
    });
    m.register({
      key: 'K',
      action: 'Add keyframe at playhead (keyframe panel)',
      category: 'keyframes',
      buildCommand: (ctx) => ({
        type: 'upsertKeyframes',
        params: {
          elementId: ctx.engine.selection.getSelectedElements()[0],
          property: ctx.uiStore.keyframes.focusedProperty,
          keyframes: [{ time: ctx.engine.playback.getCurrentTime(), value: ctx.engine.timeline.getPropertyValue(/* ... */) }],
        },
      }),
      contextPredicate: (ctx) => ctx.uiStore.keyframes.isPanelFocused(),
      fcpEquiv: 'K',
    });
    // ... ~178 more entries mirroring §3 (181 total — see Appendix A)
    return m;
  }

  /**
   * Register a new descriptor. If a descriptor with the same key already exists,
   * the new one is appended to the array (allowed when context predicates are
   * disjoint). If the new descriptor's contextPredicate is `() => true` (Always)
   * AND an existing Always descriptor is already registered for the same key,
   * this throws — that is a true direct conflict, not a context-disjoint one.
   */
  register(d: ShortcutDescriptor): void {
    const existing = this.map.get(d.key) ?? [];
    const isAlways = d.contextPredicate.toString().replace(/\s/g, '').includes('=>true') ||
                     d.contextPredicate.toString().replace(/\s/g, '') === '()=>true';
    if (isAlways && existing.some(e =>
      e.contextPredicate.toString().replace(/\s/g, '') === '()=>true' ||
      e.contextPredicate.toString().replace(/\s/g, '').includes('=>true'))) {
      throw new Error(
        `Direct shortcut conflict: "${d.key}" is already registered as Always-active ` +
        `(existing: "${existing[0].action}"). Cannot also register "${d.action}" as Always. ` +
        `Resolve by reassigning one binding to a different key (see §6.1).`
      );
    }
    existing.push(d);
    this.map.set(d.key, existing);
  }

  /**
   * Lookup the descriptor active in the current context. Iterates the array in
   * registration order and returns the first whose contextPredicate(ctx) returns true.
   * Returns undefined if no descriptor matches (key was pressed but no context applies).
   */
  lookup(key: ShortcutKey): ShortcutDescriptor | undefined {
    const list = this.map.get(key);
    if (!list) return undefined;
    return list[0];     // note: caller invokes contextPredicate via the handler (which has ctx)
  }

  /** Returns all descriptors matching the given context, for cheat-sheet rendering + test enumeration. */
  lookupActive(ctx: ResolverContext, key: ShortcutKey): ShortcutDescriptor | undefined {
    const list = this.map.get(key);
    if (!list) return undefined;
    return list.find(d => d.contextPredicate(ctx));
  }

  /** Returns all descriptors, for cheat-sheet rendering and test enumeration. */
  getDescriptors(): ShortcutDescriptor[] {
    return Array.from(this.map.values()).flat();
  }

  /** Merge user overrides (v2). */
  mergeOverrides(userMap: Partial<Record<ShortcutKey, ShortcutKey>>): void {
    // For each (oldKey, newKey) in userMap, re-register the descriptors under newKey.
    for (const [oldKey, newKey] of Object.entries(userMap)) {
      const list = this.map.get(oldKey as ShortcutKey);
      if (!list || list.length === 0) continue;
      this.map.delete(oldKey as ShortcutKey);
      const remapped = list.map(d => ({ ...d, key: newKey as ShortcutKey }));
      // Re-register each under the new key (preserving context predicates).
      const target = this.map.get(newKey as ShortcutKey) ?? [];
      this.map.set(newKey as ShortcutKey, [...target, ...remapped]);
    }
  }
}
```

The `Duplicate shortcut` throw on `register()` (now only for **direct** Always-vs-Always conflicts) remains a **dev-time invariant** — if two `Always`-active descriptors claim the same key, the second `register()` call crashes the handler init. Context-disjoint duplicates (e.g., `K` for JKL pause vs. `K` for keyframe add, disambiguated by keyframe-panel focus) are allowed. The 6 direct conflicts flagged by the audit (Issue #8) have been resolved in §6.1 #13–#18 and reflected in Appendix A.

### 8.7 Multi-tap state (JKL)

JKL multi-tap requires per-key press-count state. The handler tracks this in a closure:

```ts
// Inside KeyboardHandler
private jklState = { lastKey: '' as 'J' | 'L' | '', lastTapAt: 0, tapCount: 0 };

private handleJKL(key: 'J' | 'L'): EngineCommand | null {
  const now = performance.now();
  if (this.jklState.lastKey === key && now - this.jklState.lastTapAt < 500) {
    this.jklState.tapCount = Math.min(this.jklState.tapCount + 1, 3);
  } else {
    this.jklState.tapCount = 1;
  }
  this.jklState.lastKey = key;
  this.jklState.lastTapAt = now;
  const rate = (key === 'J' ? -1 : 1) * this.jklState.tapCount;
  return { type: 'setRate', params: { rate } };
}
```

`Space`, `K`, and any non-JKL key resets `jklState`. This state lives in the handler, not in the engine — tests that want to assert multi-tap behavior must press keys in sequence with realistic timing (Playwright's `page.keyboard.press()` runs in the same event loop, so the 500 ms window is real).

---

## 9. Test Verification

### 9.1 Coverage goal

**Every shortcut in §3 has at least one test** in `tests/e2e/keyboard.spec.ts`. Coverage is verified by a meta-test that reads `ShortcutMap.default().getDescriptors()` and asserts each has a corresponding `test()` block.

```ts
// tests/e2e/keyboard-coverage.spec.ts
import { ShortcutMap } from '@/ui/keyboard/shortcut-map';

test('every shortcut has a test', () => {
  const descriptors = ShortcutMap.default().getDescriptors();
  const testedKeys = readTestNamesFromKeyboardSpec();  // parses keyboard.spec.ts for test names
  for (const d of descriptors) {
    expect(testedKeys).toContain(d.action);
  }
});
```

### 9.2 Test recipes

#### Split at playhead

```ts
test('Cmd+B splits at playhead', async ({ page }) => {
  await loadTestProject(page, 'single-clip.json');   // 1 clip, 10 s (spec 17 §5.3 — registered Round 7)
  await page.keyboard.press('Cmd+Right');            // Go to end (10s = 1_200_000 ticks)
  await page.waitForTimeout(50);
  await page.keyboard.press('Cmd+B');                // Split

  const state = await getEngineState(page);
  const clips = state.scenes[0].tracks.main.elements;
  expect(clips).toHaveLength(2);
  expect(clips[0].duration + clips[1].duration).toBe(1_200_000);
});
```

#### Razor tool + click split

```ts
test('Razor click splits at click point', async ({ page }) => {
  await loadTestProject(page, 'simple-cut.json');
  await page.keyboard.press('B');                    // Razor tool

  const clip = page.locator('[data-testid="clip-main-1"]');
  const box = await clip.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  const state = await getEngineState(page);
  expect(state.scenes[0].tracks.main.elements).toHaveLength(2);
});
```

#### JKL shuttle

```ts
test('JKL shuttle sets rate correctly', async ({ page }) => {
  await loadTestProject(page, 'simple-cut.json');

  await page.keyboard.press('L');                    // 1× forward
  await expectPlaybackState(page, { isPlaying: true, rate: 1 });

  await page.keyboard.press('L');                    // 2× forward (multi-tap)
  await expectPlaybackState(page, { rate: 2 });

  await page.keyboard.press('K');                    // Pause
  await expectPlaybackState(page, { isPlaying: false });

  await page.keyboard.press('J');                    // 1× reverse
  await expectPlaybackState(page, { isPlaying: true, rate: -1 });
});
```

#### Nudge + undo coalescing

```ts
test('Option-held nudge coalesces into one undo step', async ({ page }) => {
  await loadTestProject(page, 'simple-cut.json');
  await page.keyboard.press('Tab');                  // Select first clip

  // Hold Option, press , 5 times within 400ms each
  await page.keyboard.down('Option');
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press(',');
    await page.waitForTimeout(50);
  }
  await page.keyboard.up('Option');
  await page.waitForTimeout(500);                     // Coalesce window expires

  const before = await getEngineState(page);
  expect(before.scenes[0].tracks.main.elements[0].startTime).toBe(-20000);  // -5 frames

  await page.keyboard.press('Cmd+Z');                 // Undo — single step
  const after = await getEngineState(page);
  expect(after.scenes[0].tracks.main.elements[0].startTime).toBe(0);       // Back to start
});
```

#### Multi-track split-all

```ts
test('Cmd+Shift+B splits all tracks', async ({ page }) => {
  await loadTestProject(page, 'multi-track.json');   // 5 tracks, 10 clips (spec 17 §5.3)
  await page.keyboard.press('Cmd+Right');             // Go to end
  await page.waitForTimeout(50);
  await page.keyboard.press('Cmd+Shift+B');

  const state = await getEngineState(page);
  for (const track of state.scenes[0].tracks.all) {
    expect(track.elements).toHaveLength(2);
  }
});
```

#### Selection walking

```ts
test('Tab walks clips in time order', async ({ page }) => {
  await loadTestProject(page, 'three-clips.json');   // clips at t=0, t=5s, t=10s
  await page.keyboard.press('V');                     // Select tool
  await page.keyboard.press('Tab');

  let selected = await getSelectedElements(page);
  expect(selected).toEqual([{ trackId: 'main', elementId: 'clip-1' }]);

  await page.keyboard.press('Tab');
  selected = await getSelectedElements(page);
  expect(selected).toEqual([{ trackId: 'main', elementId: 'clip-2' }]);

  await page.keyboard.press('Shift+Tab');             // back to clip-1
  selected = await getSelectedElements(page);
  expect(selected).toEqual([{ trackId: 'main', elementId: 'clip-1' }]);
});
```

#### Track-focus + mute

```ts
test('Cmd+M mutes the focused track', async ({ page }) => {
  await loadTestProject(page, 'multi-track.json');
  await page.keyboard.press('Cmd+Down');              // Focus next track
  await page.keyboard.press('Cmd+M');                // Mute

  const state = await getEngineState(page);
  const focusedTrackId = await getFocusedTrackId(page);
  expect(state.scenes[0].tracks.byId[focusedTrackId].muted).toBe(true);
});
```

#### Direct EngineCommand (Pattern 2)

```ts
test('split via direct EngineCommand', async ({ page }) => {
  await loadTestProject(page, 'simple-cut.json');
  await page.evaluate(async (cmd) => {
    const engine = (window as any).engine;
    await engine.command.apply(cmd);
  }, { type: 'split', params: { time: 5_000_000, trackIds: null } });

  const state = await getEngineState(page);
  expect(state.scenes[0].tracks.main.elements).toHaveLength(2);
});
```

### 9.3 Test helper functions

```ts
// tests/helpers/engine-state.ts
export async function getEngineState(page: Page): Promise<SerializedEngineState> {
  return page.evaluate(() => (window as any).engine.serialize());
}

export async function getSelectedElements(page: Page): Promise<ElementRef[]> {
  return page.evaluate(() => (window as any).engine.selection.getSelectedElements());
}

export async function getFocusedTrackId(page: Page): Promise<string> {
  // UI state (focused track) lives in the Zustand uiStore, NOT on EditorCore.
  // Spec 01's EditorCore has 12 managers and NO `ui` field (see §0.2).
  return page.evaluate(() => (window as any).uiStore.timeline.focusedTrackId);
}

export async function expectPlaybackState(page: Page, expected: { isPlaying?: boolean; rate?: number; time?: number }) {
  const actual = await page.evaluate(() => {
    const p = (window as any).engine.playback;
    return { isPlaying: p.isPlaying(), rate: p.getRate(), time: p.getCurrentTime() };
  });
  if (expected.isPlaying !== undefined) expect(actual.isPlaying).toBe(expected.isPlaying);
  if (expected.rate !== undefined) expect(actual.rate).toBe(expected.rate);
  if (expected.time !== undefined) expect(actual.time).toBe(expected.time);
}
```

### 9.4 Frame-rate-aware assertions

Tests that assert on time deltas must use the project's frame rate, not hardcoded ticks. Helper:

```ts
export function frameTicks(n: number, fps: { numerator: number; denominator: number }): number {
  return Math.round((120000 * n * fps.denominator) / fps.numerator);
}

// Usage:
const oneFrame = frameTicks(1, project.fps);      // 5000 at 24fps, 4000 at 30fps, 2000 at 60fps
```

Tests should never hardcode `4000` for "1 frame" — always compute from fps.

### 9.5 Keyboard-handler unit tests

In addition to e2e tests, the handler has unit tests that exercise the lookup + context-predicate logic in isolation (no Playwright, no browser):

```ts
// src/ui/keyboard/handler.test.ts
describe('KeyboardHandler', () => {
  it('emits play when Space pressed and not playing', () => {
    const engine = createMockEngine({ isPlaying: false });
    const applied: EngineCommand[] = [];
    engine.command.apply = (c: EngineCommand) => { applied.push(c); };

    const handler = new KeyboardHandler(engine);
    handler.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));

    expect(applied).toEqual([{ type: 'play' }]);
  });

  it('suppresses Space when text input focused', () => {
    const engine = createMockEngine({ isPlaying: false });
    const applied: EngineCommand[] = [];
    engine.command.apply = (c: EngineCommand) => { applied.push(c); };

    const handler = new KeyboardHandler(engine);
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    handler.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));

    expect(applied).toEqual([]);     // suppressed
  });

  it('emits split at currentTime for Cmd+B', () => {
    const engine = createMockEngine({ currentTime: 5_000_000 });
    const applied: EngineCommand[] = [];
    engine.command.apply = (c: EngineCommand) => { applied.push(c); };

    const handler = new KeyboardHandler(engine);
    handler.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'KeyB', metaKey: true,
    }));

    expect(applied).toEqual([{
      type: 'split',
      params: { time: 5_000_000, trackIds: null },
    }]);
  });
});
```

---

## 10. Open Questions

1. **Text-input handling granularity.** Currently: single-key suppressed, `Cmd+` active. Should `Shift+letter` (which types uppercase) also be suppressed? Current decision: **yes** (any modifier other than `Cmd` suppresses single-key shortcuts when in text input). Open: should `Tab` in a text input move focus (browser default) or select next clip (NLE default)? Current: **browser default** (Tab moves focus); NLE Tab only active when timeline has focus.

2. **Customization (v2).** Should shortcuts be customizable per-user, per-project, or per-workspace? Current decision: **per-user** (stored in `localStorage`, shared across projects). Open: how to handle conflicts in user-remapped bindings (e.g., user remaps `Cmd+B` to "bold" — what happens to split?). Current proposal: conflict detection at remap time, with explicit override confirmation.

3. **Non-US keyboards.** §8.4 documents the `event.code`-primary approach. Open: should the cheat sheet show *physical* keys (e.g., "KeyZ") or *logical* keys (e.g., "Z" on QWERTY, "W" on AZERTY)? Current decision: **logical** (show what the user types on their layout), with a footnote "shortcut uses physical key position — works on all layouts".

4. **MIDI controllers (v3).** Should we support MIDI controllers for playback shuttle (e.g., jog wheel → `setRate`)? Current decision: **v3**, out of scope for v1/v2. The `EngineCommand` type already supports `setRate` with arbitrary rates, so a MIDI handler could emit the same commands — no engine changes needed, just a new input device handler.

5. **Gamepad support (v3).** Similar to MIDI — gamepad could map to JKL + arrow keys. Out of scope for v1/v2; `EngineCommand` abstraction makes this a pure input-handler addition.

6. **Voice control (v3, aspirational).** Web Speech API could map spoken commands ("split here", "next clip") to `EngineCommand`s. The `EngineCommand` layer makes this a pure input-handler addition. Out of scope; documented for future.

7. **Gesture support (v3).** Touch gestures (pinch-to-zoom, swipe-to-scroll) on trackpads. Currently `Cmd+wheel` zooms and `wheel` scrolls horizontally; pinch is mapped to `Cmd+wheel` by the OS on macOS. Should we expose explicit gesture handlers? Current decision: **no**, rely on OS mapping. Re-evaluate if iPad/touch support is added.

8. **Conflict reporting in production.** When a new build adds a shortcut that conflicts with an existing one, should the handler log a warning in dev mode? Current decision: **yes** — `ShortcutMap.register()` throws on duplicate keys in dev (§8.6), which fails CI if a conflict is introduced. In production builds, the throw is downgraded to a `console.warn` and the second registration is ignored (first wins).

---

## 11. Relationship to Spec 05 §19

Spec 05 §19 documented the *union* of FreeCut + OpenCut-classic shortcuts as a discovery exercise. This spec is *prescriptive* — it defines our canonical map. The table below shows where this spec **departs** from §19's recommendations and why.

| §19 recommendation | This spec | Rationale |
|---|---|---|
| `s` = split at playhead (move snap to `n`) | `Cmd+B` = split; `S` = alt binding; `N` = snap | FCP uses `Cmd+B` for blade-split — better muscle-memory match for FCPXML handoff target |
| `c` = razor tool | `B` = razor tool | FCP uses `B` for blade — matches FCP convention; `C` freed for future use |
| `n` = snap toggle | `N` = snap toggle | ✅ agreed |
| `shift+arrows` = nudge 1px (FreeCut) | `Shift+Left/Right` = 10-frame nudge | Frames > pixels — pixel nudging is a UI concept, frame nudging is a media concept; frame-based is more useful and testable |
| `k` = pause (JKL) / add keyframe (keyframe panel) | Same — context-determined | ✅ agreed (§6 conflict #7) |
| `m` = marker | Same | ✅ agreed |
| `i` / `o` = mark in/out | Same | ✅ agreed |
| `mod+z` / `mod+shift+z` = undo/redo | `Cmd+Z` / `Cmd+Shift+Z` | ✅ agreed (`Cmd` normalized per §3 conventions) |
| `mod+=` / `mod+-` = zoom in/out | `+`/`=` / `-` (no Cmd) | Single-key zoom is faster for common zoom; `Cmd++`/`Cmd+-` retained as alt bindings for FCP muscle memory |
| `\` = zoom to fit | `Cmd+\` | Avoid single-key `\` (layout-dependent, easy to mistype) |
| `ctrl+a` = select all (OpenCut-classic) | `Cmd+A` = select all on track | FCP convention: `Cmd+A` selects all on *focused* track; `Cmd+Shift+A` selects all in timeline |
| `escape` = cancel / deselect | `Escape` = deselect (no tool override); also returns to select tool if a tool is active | §3.2 + §3.3 |
| `q` / `w` = split + remove left/right | Same | ✅ agreed |
| `alt+c` (FreeCut) = split at cursor | `B` (razor) + click = split at click | Razor tool + click is more discoverable than a chord |
| (none) | `Cmd+Shift+B` = split all tracks | New — addresses test need for "split everything at playhead" |

**Net change:** this spec defines **181 bindings** across 13 categories (180 at v1.0 + `Option+R` from the R15/A6 amendment; ~110 unique actions after parameterizing presets/panels/workspaces/alt-bindings — see Appendix A footer for the collapsing rule) vs §19's ~50, with explicit conflict resolution for all 12 disambiguation cases (§6) plus 6 audit-flagged direct conflicts resolved in §6.1 #13–#18. §19's union table remains useful as a *reference* for "what do FCP/Premiere/FreeCut/OpenCut-classic do" — this spec is the *normative* definition for our NLE.

---

## 12. Manager-Method Cross-Reference

Each `EngineCommand` type maps to one or more manager methods on `EditorCore` **or** to setters on the UI store (`uiStore`, Zustand). This table is the normative mapping — the resolver (§8.3) implements exactly this. Spec-15-canonical types map to manager methods per spec 15 §4.2; spec-16 UI-layer extensions map to uiStore setters (NOT `engine.*` — spec 01's EditorCore has no `ui` field, see §0.2).

| EngineCommand type | Manager method / UI-store setter | Manager / Store | Undoable? | Notes |
|---|---|---|---|---|
| `play` | `playback.play()` | PlaybackManager | No | Direct call (spec 15 §4.2) |
| `pause` | `playback.pause()` | PlaybackManager | No | Direct call (spec 15 §4.2) |
| `seek` | `playback.seek(time)` | PlaybackManager | No | Direct call (spec 15 §4.2) |
| `setRate` | `playback.setRate(rate)` | PlaybackManager | No | Direct call (spec 15 §4.2 — greenfield) |
| `setLoop` | `playback.setLoop(start, end)` | PlaybackManager | No | Direct call (spec 15 §4.2 — greenfield) |
| `seekToMarker` (UI) | resolver finds nearest bookmark, then `playback.seek(t)` | PlaybackManager | No | Composite (spec-16 UI) |
| `toggleLoopPlayback` (UI) | `uiStore.playback.toggleLoopPlayback(engine)` | UIStore | No | UI state |
| `selectTool` | `selection.setActiveTool({tool})` + `uiStore.setActiveTool(tool)` | SelectionManager (spec 15 §4.2 — greenfield) + UIStore | No | Engine + UI mirror |
| `toggleSnap` (UI) | `uiStore.timeline.toggleSnap()` | UIStore | No | 📝 NEW greenfield — snap is UI-layer (timeline viewport snapping) |
| `toggleRipple` | `command.isRippleEnabled = !isRippleEnabled` | CommandManager | No | Global flag on EditorCore (spec 01 §3.1) |
| `selectElements` | `selection.setSelectedElements({elementIds, mode})` | SelectionManager (spec 15 §4.2 — greenfield) | No | Selection state |
| `selectTrack` | `selection.setSelectedTrack({trackId})` + `uiStore.timeline.setFocusedTrackId(trackId)` | SelectionManager + UIStore | No | Engine + UI mirror |
| `findPlayhead` (UI) | `uiStore.timeline.findPlayhead(engine)` | UIStore | No | Composite (select + scroll) |
| `split` | `timeline.splitElements({elements, splitTime, retainSide})` | TimelineManager | Yes | `SplitElementsCommand` (spec 15 §4.2) |
| `splitAndRemove` (UI) | `BatchCommand([SplitElementsCommand, DeleteElementsCommand])` | TimelineManager | Yes | Composite |
| `trim` | `timeline.updateElementTrim({elementId, trimStart, trimEnd, ...})` | TimelineManager | Yes | `UpdateElementsCommand` (spec 15 §4.2) |
| `slip` | `timeline.updateElements({updates: <slipDeltas>})` | TimelineManager | Yes | Slip = source-window shift (spec 15 §4.2) |
| `move` | `timeline.moveElements({moves, createTracks})` | TimelineManager | Yes | `MoveElementsCommand` (spec 15 §4.2) |
| `delete` | `timeline.deleteElements({elements})` (+ ripple if flag) | TimelineManager | Yes | `DeleteElementsCommand` + ripple (spec 15 §4.2) |
| `copy` | `clipboard.copyClipboardEntry({elementIds})` | ClipboardManager | No | spec 15 §4.2 canonical name (was `clipboard.copy`) |
| `cut` | `clipboard.buildCutCommand({elementIds})` → BatchCommand (copy + delete) | ClipboardManager | Yes | spec 15 §4.2 (the delete is undoable) |
| `paste` | `clipboard.buildPasteClipboardCommand({atTime, targetTrackId, mode})` → BatchCommand | ClipboardManager | Yes | spec 15 §4.2 canonical name (was `clipboard.paste`) |
| `pasteAttributes` (UI) | `clipboard.buildPasteAttributesCommand({targetIds})` | ClipboardManager | Yes | spec-16-only composite |
| `duplicate` | `timeline.duplicateElements({elements, offset})` | TimelineManager | Yes | `DuplicateElementsCommand` (spec 15 §4.2) |
| `freezeFrame` (UI) | `BatchCommand([SplitElementsCommand, InsertElementCommand])` | TimelineManager | Yes | Composite |
| `join` (UI) | `BatchCommand([DeleteElementsCommand, UpdateElementsCommand(merge)])` | TimelineManager | Yes | Composite |
| `toggleAVLink` (UI) | `timeline.updateElements({updates: {linked: !linked}})` | TimelineManager | Yes | Property toggle (composite) |
| `toggleTrackMute` | `timeline.toggleTrackMute({trackId})` | TimelineManager | Yes | `ToggleTrackMuteCommand` (spec 15 §4.2) |
| `toggleTrackSolo` | `timeline.toggleTrackSolo({trackId})` | TimelineManager | Yes | Greenfield (spec 15 §4.2) |
| `toggleTrackLock` | `timeline.toggleTrackLock({trackId})` | TimelineManager | Yes | Greenfield (spec 15 §4.2) |
| `toggleTrackVisibility` | `timeline.toggleTrackVisibility({trackId})` | TimelineManager | Yes | `ToggleTrackVisibilityCommand` (spec 15 §4.2) |
| `addTrack` | `timeline.addTrack({type, index, name})` | TimelineManager | Yes | `AddTrackCommand` (spec 15 §4.2) |
| `deleteTrack` | `timeline.removeTrack({trackId})` | TimelineManager | Yes | `RemoveTrackCommand` — **spec 15 type name** (was spec-16 `removeTrack`) |
| `beginRenameTrack` (UI) | `uiStore.tracks.beginRenameTrack(trackId)` | UIStore | No | UI state (inline input) |
| `toggleBookmark` | `scenes.toggleBookmark({time})` | ScenesManager | Yes | `ToggleBookmarkCommand` (spec 15 §4.2) |
| `removeBookmark` | `scenes.removeBookmark({time})` | ScenesManager | Yes | `RemoveBookmarkCommand` (spec 15 §4.2) |
| `updateBookmark` | `scenes.updateBookmark({time, updates})` | ScenesManager | Yes | `UpdateBookmarkCommand` (spec 15 §4.2) |
| `zoom` (UI) | `uiStore.timelineViewport.zoom(params)` | UIStore | No | UI state (viewport) |
| `zoomToFit` (UI) | `uiStore.timelineViewport.zoomToFit()` | UIStore | No | UI state |
| `zoomToSelection` (UI) | `uiStore.timelineViewport.zoomToElements(selected)` | UIStore | No | UI state |
| `undo` | `command.undo()` | CommandManager | n/a | History pop (spec 15 §4.2) |
| `redo` | `command.redo()` | CommandManager | n/a | History push (spec 15 §4.2) |
| `addEffect` | `timeline.addClipEffect({elementId, effect})` | TimelineManager | Yes | `AddEffectCommand` (spec 15 §4.2 — greenfield) |
| `toggleEffect` | `timeline.updateClipEffectParams({...enabled})` | TimelineManager | Yes | Property toggle (spec 15 §4.2) |
| `resetEffects` (UI) | `BatchCommand(N× RemoveEffectCommand)` | TimelineManager | Yes | Composite (spec-16 wraps spec-15 `removeEffect`) |
| `resetColorGrade` (UI) | `timeline.updateElements({updates: {colorGrade: default}})` | TimelineManager | Yes | Property reset |
| `matchColor` (UI) | `color.matchColor({target, source})` | ColorManager | Yes | Composite |
| `upsertKeyframes` | `timeline.upsertKeyframes({elementId, keyframes})` | TimelineManager | Yes | `UpsertKeyframesCommand` — **spec 15 type name** (was spec-16 `addKeyframe`) |
| `removeKeyframes` | `timeline.removeKeyframes({elementId, keyframeIds})` | TimelineManager | Yes | `RemoveKeyframesCommand` — **spec 15 type name** (was spec-16 `deleteKeyframe` / `clearKeyframes`) |
| `retimeKeyframe` | `timeline.retimeKeyframe({elementId, keyframeId, time})` | TimelineManager | Yes | `RetimeKeyframeCommand` — **spec 15 type name** (was spec-16 `moveKeyframe`) |
| `seekToKeyframe` (UI) | resolver finds nearest kf, then `playback.seek(t)` | PlaybackManager | No | Composite |
| `nudgeKeyframe` (UI) | reads kf, then `upsertKeyframes` with shifted value | TimelineManager | Yes | Composite (wraps spec-15 `upsertKeyframes`) |
| `toggleKeyframeNav` (UI) | `uiStore.keyframes.toggleKeyframeNav()` | UIStore | No | UI state |
| `saveProject` | `project.saveCurrentProject()` | ProjectManager | No | I/O (spec 15 §4.2) |
| `closeProject` | `project.closeProject()` | ProjectManager | No | I/O — **spec 01 §14.2 method name** (was spec-16 `closeCurrentProject()`) |
| `exportFCPXML` | via `engine.command.apply({type:'exportFCPXML'})` → `engine.export.exportFCPXML({format, bundleMedia})` | ExportManager | No | Spec 15 §4.3.74 (Round-7) — output command, artifact in `CommandResult.data` |
| `exportMaster` | via `engine.command.apply({type:'exportMaster'})` → `engine.renderer.exportProject({format, destination, range})` | RendererManager | No | Spec 15 §4.3.75 — job handle `data.renderJob`, spec 11 queue |
| `exportFrame` | via `engine.command.apply({type:'exportFrame'})` → `engine.renderer.saveSnapshot({format, time})` | RendererManager | No | Spec 15 §4.3.76 — artifact handle `data.frameArtifact` |
| `batch` | (recursive resolution → `BatchCommand`) | CommandManager | Yes | Composite (spec 15 §7 transaction) |

**Spec 01 + spec 15 cross-check:** method names verified against `01-core-engine.md` §3.1–§3.7 + §14.5–§14.12, and `15-wire-protocol.md` §4.2. Greenfield methods (`toggleTrackSolo`, `toggleTrackLock`, `setActiveTool`, `setRate`, `setLoop`, `exportFCPXML`) confirmed as additions per spec 01 §14 and spec 15 §4.2. The `(UI)` tag marks spec-16 UI-layer extensions routed to `uiStore` (Zustand) instead of `engine.*` — see §0.2 for the rationale (UI state is a separate layer from EditorCore).

---

## 13. Implementation Phasing

This spec is implemented across the phases defined in `14-implementation-phases.md`:

| Phase | What's built | Shortcuts included |
|---|---|---|
| Phase 2 (timeline MVP) | Playback + basic edit | §3.1 (playback), §3.2 (tools: V, B), §3.3 (Tab/Esc), §3.4 (Cmd+B, Delete, Backspace), §3.10 (undo/redo) |
| Phase 3 (full ops) | All NLE ops | §3.4 (full), §3.6 (nudge), §3.5 (track ops) |
| Phase 4 (effects + color) | Effects pipeline | §3.11 (effects) |
| Phase 5 (keyframes) | Keyframe panel | §3.12 (keyframes) |
| Phase 6 (polish) | Cheat sheet, ARIA | §3.13 (help), §7 (accessibility) |
| v2 (customization) | Remap UI | §7.4, §8.6 `mergeOverrides` |

Phase 2's exit criteria (per `14-implementation-phases.md` line 308: "Keyboard shortcuts work") is satisfied when all Phase-2 shortcuts in the table above pass their tests (§9).

---

## 14. Appendix A — Flat Shortcut Registry (for Test Enumeration)

The following flat list is auto-generated from `ShortcutMap.default().getDescriptors()` and is the canonical test-enumeration reference. Each row's `testId` is the `data-testid` used in tests.

> Format: `testId | key | action | category | context`

> **Scope note (audit Issue #15):** Multi-tap JKL combos (`J`×2, `J`×3, `L`×2, `L`×3, `K` then `J`, `K` then `L`) are documented in §3.1 lines 115–120 and tested via the base `J`/`L`/`K` testIds with timed multi-press sequences in tests (see §9.2 JKL shuttle recipe). They are NOT enumerated as separate testIds here, to avoid duplicating the `J`/`L`/`K` base registration. Alt bindings (`Home`/`End` as alternatives to `Cmd+Left`/`Cmd+Right`; `Shift+I`/`Shift+O` for preview-in/out when preview is open) are likewise documented in §3.1 but omitted from this registry's primary enumeration — they share the EngineCommand of their primary binding and are tested via the primary testId.

> **Conflict resolution note (audit Issue #8):** The 6 direct key conflicts flagged by the audit (`Cmd+Option+L`, `Cmd+Option+E`, `Cmd+Option+M`, `Cmd+Option+S`, `Cmd+Shift+M`, `Cmd+Shift+S`) have been resolved by reassigning the secondary binding to a 4-key chord or alternate modifier. See §6.1 #13–#18 for the resolution rationale.

```
kbd-play-pause              | Space              | Play / Pause                       | playback  | Always
kbd-shuttle-reverse         | J                  | Reverse playback 1×                | playback  | Always
kbd-shuttle-pause           | K                  | Pause (JKL)                        | playback  | Always
kbd-shuttle-forward         | L                  | Forward playback 1×                | playback  | Always
kbd-shuttle-reverse-2x      | Shift+J            | Reverse 2×                         | playback  | Always
kbd-shuttle-forward-2x      | Shift+L            | Forward 2×                         | playback  | Always
kbd-frame-step-back         | Left               | Previous frame                     | playback  | Always
kbd-frame-step-fwd          | Right              | Next frame                         | playback  | Always
kbd-frame-jump-back         | Shift+Left         | 10 frames back                     | playback  | Always
kbd-frame-jump-fwd          | Shift+Right        | 10 frames forward                  | playback  | Always
kbd-goto-start              | Cmd+Left           | Go to start                        | playback  | Always
kbd-goto-end                | Cmd+Right          | Go to end                          | playback  | Always
kbd-prev-edit               | PageUp             | Previous edit point                | playback  | Always
kbd-next-edit               | PageDown           | Next edit point                    | playback  | Always
kbd-prev-marker             | Cmd+Shift+Left     | Jump to previous marker            | playback  | Always
kbd-next-marker             | Cmd+Shift+Right    | Jump to next marker                | playback  | Always
kbd-mark-in                 | I                  | Set in point                       | playback  | Always
kbd-mark-out                 | O                  | Set out point                      | playback  | Always
kbd-clear-in                | Cmd+Shift+I        | Clear in point                     | playback  | Always
kbd-clear-out               | Cmd+Shift+O        | Clear out point                    | playback  | Always
kbd-clear-in-out            | Option+X           | Clear in + out                     | playback  | Always
kbd-loop-toggle             | Cmd+Shift+G        | Toggle loop playback               | playback  | Always
kbd-tool-select             | V                  | Select tool                        | tools     | Always
kbd-tool-razor              | B                  | Razor tool                         | tools     | Always
kbd-tool-hand               | H                  | Hand tool                         | tools     | Always
kbd-tool-zoom               | Z                  | Zoom tool                          | tools     | Always
kbd-tool-trim               | T                  | Trim tool                          | tools     | Always
kbd-tool-slip               | Y                  | Slip tool                          | tools     | Always
kbd-tool-slide              | U                  | Slide tool                         | tools     | Always
kbd-tool-ripple             | R                  | Ripple tool                        | tools     | Always
kbd-toggle-ripple-mode      | Option+R           | Ripple mode toggle (UI pref)       | tools     | Always
kbd-toggle-snap             | N                  | Snap toggle                        | tools     | Always
kbd-tool-escape             | Escape             | Return to select tool              | tools     | When non-select tool active
kbd-select-next             | Tab                | Select next clip                   | selection | Timeline region focused
kbd-select-prev             | Shift+Tab          | Select previous clip               | selection | Timeline region focused
kbd-select-add-next         | Option+Tab         | Add next clip to selection         | selection | Always
kbd-select-add-prev         | Option+Shift+Tab   | Add previous clip to selection     | selection | Always
kbd-select-all-track        | Cmd+A              | Select all on focused track       | selection | When track focused
kbd-select-all-timeline     | Cmd+Shift+A        | Select all in timeline             | selection | Always
kbd-deselect                | Escape             | Deselect all                       | selection | Always (no tool override)
kbd-select-above            | Up                 | Select clip on track above         | selection | When clip selected
kbd-select-below            | Down               | Select clip on track below         | selection | When clip selected
kbd-add-above               | Shift+Up           | Add clip above to selection        | selection | When clip selected
kbd-add-below               | Shift+Down         | Add clip below to selection        | selection | When clip selected
kbd-focus-track-up          | Cmd+Up             | Move track focus up                | selection | Always
kbd-focus-track-down        | Cmd+Down           | Move track focus down              | selection | Always
kbd-move-up-track           | Cmd+Shift+Up       | Move selected clips up one track   | selection | When clip selected
kbd-move-down-track         | Cmd+Shift+Down     | Move selected clips down one track | selection | When clip selected
kbd-find-playhead           | F                  | Find playhead in timeline          | selection | Always
kbd-split-at-playhead        | Cmd+B              | Split at playhead (focused track)  | editing   | Always
kbd-split-all               | Cmd+Shift+B        | Split all tracks at playhead       | editing   | Always
kbd-split-alt               | S                  | Split at playhead (alt binding)     | editing   | Always
kbd-split-remove-left       | Q                  | Split + delete left half           | editing   | When clip under playhead
kbd-split-remove-right      | W                  | Split + delete right half          | editing   | When clip under playhead
kbd-trim-start-to-playhead  | [                  | Trim clip start to playhead        | editing   | When clip selected or under playhead
kbd-trim-end-to-playhead    | ]                  | Trim clip end to playhead          | editing   | When clip selected or under playhead
kbd-ripple-trim-start       | Option+[          | Ripple-trim clip start             | editing   | When clip selected or under playhead
kbd-ripple-trim-end         | Option+]          | Ripple-trim clip end               | editing   | When clip selected or under playhead
kbd-slip-left-1             | ,                  | Slip left 1 frame                  | editing   | When clip selected, slip tool
kbd-slip-right-1            | .                  | Slip right 1 frame                 | editing   | When clip selected, slip tool
kbd-slip-left-10            | Shift+,            | Slip left 10 frames                | editing   | When clip selected
kbd-slip-right-10           | Shift+.            | Slip right 10 frames               | editing   | When clip selected
kbd-delete                  | Delete             | Delete (no ripple)                 | editing   | When clip selected
kbd-delete-alias            | Backspace          | Delete selection (alias of Delete) | editing   | When clip selected
kbd-ripple-delete           | Shift+Delete       | Ripple delete                      | editing   | When clip selected
kbd-cut                     | Cmd+X              | Cut (copy + ripple delete)         | editing   | When clip selected
kbd-copy                    | Cmd+C              | Copy                                | editing   | When clip selected
kbd-paste-insert            | Cmd+V              | Paste at playhead (insert)         | editing   | Always
kbd-paste-overwrite        | Cmd+Shift+V        | Paste at playhead (overwrite)      | editing   | Always
kbd-paste-attributes        | Cmd+Option+V      | Paste attributes                   | editing   | When clip selected
kbd-duplicate               | Cmd+D              | Duplicate                          | editing   | When clip selected
kbd-duplicate-ripple        | Cmd+Shift+D        | Duplicate + ripple                 | editing   | When clip selected
kbd-freeze-frame            | Shift+F            | Freeze frame at playhead           | editing   | When clip under playhead
kbd-join                    | Cmd+Shift+J        | Join selected                      | editing   | When ≥2 adjacent clips selected
kbd-toggle-av-link          | Cmd+Option+L      | Toggle A/V link                    | editing   | When clip selected
kbd-mute-track              | Cmd+M              | Mute focused track                 | track     | When track focused
kbd-mute-all                | Cmd+Shift+M        | Mute all tracks                    | track     | Always
kbd-unmute-all              | Cmd+Shift+Option+M | Unmute all tracks                  | track     | Always
kbd-solo-track              | Cmd+Option+S      | Solo focused track                 | track     | When track focused
kbd-solo-clear              | Cmd+Shift+Option+S | Clear all solos                    | track     | Always
kbd-lock-track              | Cmd+L              | Lock focused track                 | track     | When track focused
kbd-lock-all                | Cmd+Shift+L        | Lock all tracks                     | track     | Always
kbd-unlock-all              | Cmd+Shift+Option+L | Unlock all tracks                  | track     | Always
kbd-toggle-visibility       | V                  | Toggle track visibility            | track     | When track header focused
kbd-new-video-track         | Cmd+Shift+N        | New video track                    | track     | Always
kbd-new-audio-track         | Option+Cmd+Shift+N | New audio track                    | track     | Always
kbd-delete-track            | Cmd+Backspace      | Delete focused track               | track     | When track focused
kbd-rename-track            | Cmd+R              | Rename focused track               | track     | When track focused
kbd-nudge-left-1            | ,                  | Nudge left 1 frame (select mode)   | nudge     | When clip selected, select tool
kbd-nudge-right-1           | .                  | Nudge right 1 frame                | nudge     | When clip selected, select tool
kbd-nudge-left-10           | Shift+,            | Nudge left 10 frames               | nudge     | When clip selected
kbd-nudge-right-10          | Shift+.            | Nudge right 10 frames              | nudge     | When clip selected
kbd-nudge-prev-edge         | Cmd+Shift+,        | Nudge to previous clip edge        | nudge     | When clip selected
kbd-nudge-next-edge         | Cmd+Shift+.        | Nudge to next clip edge            | nudge     | When clip selected
kbd-slip-alt-left-1         | Option+,          | Slip left 1 frame (alt)            | nudge     | When clip selected
kbd-slip-alt-right-1        | Option+.          | Slip right 1 frame (alt)           | nudge     | When clip selected
kbd-slip-alt-left-10        | Option+Shift+,    | Slip left 10 frames (alt)          | nudge     | When clip selected
kbd-slip-alt-right-10       | Option+Shift+.    | Slip right 10 frames (alt)         | nudge     | When clip selected
kbd-marker-add              | M                  | Add marker at playhead             | markers   | Always
kbd-marker-delete           | Shift+M            | Delete marker at playhead         | markers   | When marker at playhead
kbd-marker-edit             | Option+M          | Edit marker (open dialog)          | markers   | When marker at playhead
kbd-marker-delete-all       | Cmd+Option+M      | Delete all markers                 | markers   | Always
kbd-marker-color            | Option+Shift+M     | Cycle marker color                 | markers   | When marker at playhead
kbd-zoom-in                 | + / =              | Zoom in                            | view      | Always
kbd-zoom-out                | -                  | Zoom out                           | view      | Always
kbd-zoom-reset              | Cmd+0              | Reset zoom                         | view      | Always
kbd-zoom-fit                | Cmd++              | Zoom to fit                        | view      | Always
kbd-zoom-fit-alt            | Cmd+\              | Zoom to fit (alt)                  | view      | Always
kbd-zoom-100                | Shift+\            | Zoom to 100%                       | view      | Always
kbd-zoom-selection          | Cmd+Option+0      | Zoom to selection                  | view      | When clip selected
kbd-fullscreen              | Cmd+Shift+F        | Toggle fullscreen preview          | view      | Always
kbd-workspace-edit          | Cmd+1              | Edit workspace                     | view      | Always
kbd-workspace-color         | Cmd+2              | Color workspace                    | view      | Always
kbd-workspace-effects       | Cmd+3              | Effects workspace                  | view      | Always
kbd-workspace-audio         | Cmd+4              | Audio workspace                    | view      | Always
kbd-toggle-inspector        | Option+1          | Toggle Inspector panel             | view      | Always
kbd-toggle-effects-panel    | Option+2          | Toggle Effects panel               | view      | Always
kbd-toggle-media            | Option+3          | Toggle Media library panel         | view      | Always
kbd-toggle-markers-panel    | Option+4          | Toggle Markers panel               | view      | Always
kbd-toggle-ruler-units      | Cmd+'              | Toggle timeline ruler units        | view      | Always
kbd-toggle-grid             | Cmd+;              | Toggle grid overlay                | view      | Always
kbd-save                    | Cmd+S              | Save project                       | project   | Always
kbd-save-as                 | Cmd+Shift+S        | Save as (dialog)                   | project   | Always
kbd-save-copy               | Option+S          | Save a copy                        | project   | Always
kbd-open                    | Cmd+O              | Open project (dialog)              | project   | Always
kbd-new-project             | Cmd+N              | New project (dialog)               | project   | Always
kbd-close-project           | Cmd+W              | Close project                      | project   | Always
kbd-close-all               | Cmd+Shift+W        | Close all projects                 | project   | Always
kbd-export-fcpxml           | Cmd+E              | Export FCPXML                      | project   | Always
kbd-export-master           | Cmd+Shift+E        | Export master (cloud render)       | project   | Always
kbd-export-frame            | Cmd+Option+E      | Export current frame (PNG)         | project   | Always
kbd-undo                    | Cmd+Z              | Undo                               | undo      | Always
kbd-redo                    | Cmd+Shift+Z        | Redo                               | undo      | Always
kbd-redo-windows            | Cmd+Y              | Redo (Windows convention)          | undo      | Always
kbd-effect-preset-1         | 1                  | Apply effect preset 1              | effects   | When clip selected
kbd-effect-preset-2         | 2                  | Apply effect preset 2              | effects   | When clip selected
kbd-effect-preset-3         | 3                  | Apply effect preset 3              | effects   | When clip selected
kbd-effect-preset-4         | 4                  | Apply effect preset 4              | effects   | When clip selected
kbd-effect-preset-5         | 5                  | Apply effect preset 5              | effects   | When clip selected
kbd-effect-preset-6         | 6                  | Apply effect preset 6              | effects   | When clip selected
kbd-effect-preset-7         | 7                  | Apply effect preset 7              | effects   | When clip selected
kbd-effect-preset-8         | 8                  | Apply effect preset 8              | effects   | When clip selected
kbd-effect-preset-9         | 9                  | Apply effect preset 9              | effects   | When clip selected
kbd-effect-toggle-1         | Shift+1            | Toggle effect 1 on/off             | effects   | When clip selected
kbd-effect-toggle-2         | Shift+2            | Toggle effect 2 on/off             | effects   | When clip selected
kbd-effect-toggle-3         | Shift+3            | Toggle effect 3 on/off             | effects   | When clip selected
kbd-effect-toggle-4         | Shift+4            | Toggle effect 4 on/off             | effects   | When clip selected
kbd-effect-toggle-5         | Shift+5            | Toggle effect 5 on/off             | effects   | When clip selected
kbd-effect-toggle-6         | Shift+6            | Toggle effect 6 on/off             | effects   | When clip selected
kbd-effect-toggle-7         | Shift+7            | Toggle effect 7 on/off             | effects   | When clip selected
kbd-effect-toggle-8         | Shift+8            | Toggle effect 8 on/off             | effects   | When clip selected
kbd-effect-toggle-9         | Shift+9            | Toggle effect 9 on/off             | effects   | When clip selected
kbd-reset-effects           | Cmd+Shift+Option+E | Reset all effects on selected      | effects   | When clip selected
kbd-color-page              | Cmd+K              | Open Color page on selected        | effects   | When clip selected
kbd-reset-color             | R                  | Reset color grade                  | effects   | When clip selected, color page active
kbd-match-color             | Shift+R            | Match color from previous clip     | effects   | When clip selected
kbd-keyframe-add            | K                  | Add keyframe (keyframe panel)      | keyframes | Keyframe panel focused
kbd-keyframe-delete         | Shift+K            | Delete keyframe at playhead        | keyframes | Keyframe panel focused
kbd-keyframe-nav-toggle     | Option+K          | Toggle keyframe navigation         | keyframes | Keyframe panel focused
kbd-keyframe-clear          | Cmd+Shift+K        | Clear keyframes on focused prop    | keyframes | Keyframe panel focused
kbd-keyframe-prev-focused   | [                  | Jump to previous keyframe (focused) | keyframes | Keyframe panel focused
kbd-keyframe-next-focused   | ]                  | Jump to next keyframe (focused)    | keyframes | Keyframe panel focused
kbd-keyframe-prev-any       | Option+[          | Jump to previous keyframe (any)    | keyframes | Keyframe panel focused
kbd-keyframe-next-any       | Option+]          | Jump to next keyframe (any)        | keyframes | Keyframe panel focused
kbd-keyframe-value-up       | Up                 | Nudge keyframe value +1            | keyframes | Keyframe selected
kbd-keyframe-value-down     | Down               | Nudge keyframe value -1            | keyframes | Keyframe selected
kbd-keyframe-value-up-10    | Shift+Up           | Nudge keyframe value +10           | keyframes | Keyframe selected
kbd-keyframe-value-down-10  | Shift+Down         | Nudge keyframe value -10           | keyframes | Keyframe selected
kbd-keyframe-time-left      | Left               | Nudge keyframe time -1 frame       | keyframes | Keyframe selected
kbd-keyframe-time-right     | Right              | Nudge keyframe time +1 frame       | keyframes | Keyframe selected
kbd-keyframe-time-left-10   | Shift+Left         | Nudge keyframe time -10 frames     | keyframes | Keyframe selected
kbd-keyframe-time-right-10  | Shift+Right        | Nudge keyframe time +10 frames     | keyframes | Keyframe selected
kbd-keyframe-graph-view     | 1                  | Switch to graph view               | keyframes | Keyframe panel focused
kbd-keyframe-dopesheet-view | 2                  | Switch to dopesheet view           | keyframes | Keyframe panel focused
kbd-keyframe-split-view     | 3                  | Switch to split view               | keyframes | Keyframe panel focused
kbd-keyframe-fit            | F                  | Fit keyframe panel to selection     | keyframes | Keyframe panel focused
kbd-cheat-sheet             | ?                  | Open cheat sheet modal             | help      | Always
kbd-cheat-sheet-alt         | Cmd+?              | Open cheat sheet (alt)             | help      | Always
kbd-shortcut-settings       | Cmd+Shift+?        | Open shortcut settings (v2)        | help      | Always
kbd-context-help            | F1                 | Contextual help                     | help      | Always
kbd-close-modal             | Escape             | Close modal / cancel                | help      | When modal open
```

**Total bindings: 181 rows** (180 at v1.0 + `Option+R` from the R15/A6 amendment; the A1 delete-family re-row is count-neutral — Backspace-alias + `Shift+Delete`-ripple replace Backspace-ripple + `Cmd+Delete`-ripple-alt, the latter dropped). Each row maps 1:1 to a test in `tests/e2e/keyboard.spec.ts`. Unique actions: **~110** (after parameterizing: effect presets 1–9 counted as 1 unique action, effect toggles 1–9 as 1, panel toggles as 1, workspace switches as 1, alt bindings merged with primaries — collapsing rule: 181 → ~150 → ~120 → ~110). This 181 / ~110 split is the canonical binding count referenced in §0 TL;DR, §16 test matrix, and §11 net-change summary (spec 15 §13.5's citation now reads **181 bindings** — the R15 15-side sync landed; its old "180 bindings" text predates the R15 pass).

---

## 15. Appendix B — EngineCommand → Command Class Mapping (Reference)

For implementers. Each `EngineCommand` type maps to a `Command` subclass (or direct manager call / UI-store setter). This appendix is the implementation checklist — every row must have a corresponding file. **Spec-15-canonical type names** are used (per §0.2 normative alignment); spec-16 UI-layer extensions are tagged `(UI)`.

| EngineCommand type | Command class / manager method / UI-store setter | File (planned) |
|---|---|---|
| `split` | `SplitElementsCommand` | `src/commands/timeline/element/split-elements.ts` (port from OpenCut-classic) |
| `splitAndRemove` (UI) | `BatchCommand([SplitElementsCommand, DeleteElementsCommand])` | composite |
| `trim` | `UpdateElementsCommand` (with trim patch) | `src/commands/timeline/element/update-elements.ts` |
| `slip` | `UpdateElementsCommand` (with sourceStart patch) | same |
| `move` | `MoveElementsCommand` | `src/commands/timeline/element/move-elements.ts` |
| `delete` (ripple=false) | `DeleteElementsCommand` | `src/commands/timeline/element/delete-elements.ts` |
| `delete` (ripple=true) | `BatchCommand([DeleteElementsCommand, RippleShiftCommand])` | composite |
| `duplicate` | `DuplicateElementsCommand` | `src/commands/timeline/element/duplicate-elements.ts` |
| `copy` | `engine.clipboard.copyClipboardEntry({elementIds})` (direct, spec 15 §4.2) | `src/clipboard/commands/copy-clipboard-entry.ts` |
| `paste` | `PasteClipboardCommand` (via `engine.clipboard.buildPasteClipboardCommand`) | `src/clipboard/commands/paste-clipboard.ts` |
| `pasteAttributes` (UI) | `PasteAttributesCommand` (via `engine.clipboard.buildPasteAttributesCommand`) | `src/clipboard/commands/paste-attributes.ts` |
| `toggleTrackMute` | `ToggleTrackMuteCommand` | `src/commands/timeline/track/toggle-track-mute.ts` |
| `toggleTrackSolo` | `ToggleTrackSoloCommand` (greenfield) | `src/commands/timeline/track/toggle-track-solo.ts` |
| `toggleTrackLock` | `ToggleTrackLockCommand` (greenfield) | `src/commands/timeline/track/toggle-track-lock.ts` |
| `toggleTrackVisibility` | `ToggleTrackVisibilityCommand` | `src/commands/timeline/track/toggle-track-visibility.ts` |
| `addTrack` | `AddTrackCommand` | `src/commands/timeline/track/add-track.ts` |
| `deleteTrack` | `RemoveTrackCommand` (spec 15 type name — was `removeTrack`) | `src/commands/timeline/track/remove-track.ts` |
| `toggleBookmark` | `ToggleBookmarkCommand` | `src/commands/scenes/toggle-bookmark.ts` |
| `removeBookmark` | `RemoveBookmarkCommand` | `src/commands/scenes/remove-bookmark.ts` |
| `updateBookmark` | `UpdateBookmarkCommand` | `src/commands/scenes/update-bookmark.ts` |
| `addEffect` | `AddEffectCommand` (spec 15 §4.2 — greenfield) | `src/commands/timeline/effect/add-effect.ts` |
| `upsertKeyframes` | `UpsertKeyframesCommand` (spec 15 type name — was `addKeyframe`) | `src/commands/timeline/keyframe/upsert-keyframes.ts` |
| `removeKeyframes` | `RemoveKeyframesCommand` (spec 15 type name — was `deleteKeyframe`/`clearKeyframes`) | `src/commands/timeline/keyframe/remove-keyframes.ts` |
| `retimeKeyframe` | `RetimeKeyframeCommand` (spec 15 type name — was `moveKeyframe`) | `src/commands/timeline/keyframe/retime-keyframe.ts` |
| `freezeFrame` (UI) | `BatchCommand([SplitElementsCommand, InsertElementCommand])` | composite |
| `join` (UI) | `BatchCommand([DeleteElementsCommand, UpdateElementsCommand(merge)])` | composite |
| `undo` | `command.undo()` | direct (spec 15 §4.2) |
| `redo` | `command.redo()` | direct (spec 15 §4.2) |
| `batch` | `BatchCommand(commands)` | `src/commands/batch-command.ts` (spec 15 §7) |
| `exportFCPXML` | `engine.command.apply({type:'exportFCPXML'})` → `ExportFCPXMLCommand` (spec 15 §4.3.74; impl `engine.export.exportFCPXML`) | `src/commands/export/export-fcpxml.ts` |
| `exportMaster` | `engine.command.apply({type:'exportMaster'})` → `ExportMasterCommand` (spec 15 §4.3.75) | `src/commands/export/export-master.ts` |
| `exportFrame` | `engine.command.apply({type:'exportFrame'})` → `ExportFrameCommand` (spec 15 §4.3.76) | `src/commands/export/export-frame.ts` |
| (all playback / UI-store ops) | direct manager calls / `uiStore.*` setters | (no Command class) |

**Greenfield files** (marked "greenfield" above) are new — they do not exist in OpenCut-classic and must be authored as part of this spec's implementation. See `14-implementation-phases.md` Phase 3 for scheduling. Spec-15-canonical type renames (`deleteTrack`, `upsertKeyframes`, `removeKeyframes`, `retimeKeyframe`, `copyClipboardEntry`, `buildPasteClipboardCommand`, `closeProject`) reflect alignment with `15-wire-protocol.md` §4 — files keep their existing OpenCut-classic file paths (e.g., `remove-track.ts`) but the EngineCommand discriminator uses the spec-15 name.

---

## 16. Appendix C — Test Matrix

Coverage matrix for `tests/e2e/keyboard.spec.ts`. Each row = one test. Status column tracks implementation. **Counts aligned to Appendix A's 181-row canonical registry** (see Appendix A footer for the collapsing rule that derives ~110 unique actions).

| Category | Tests planned | Tests written | Status |
|---|---|---|---|
| Playback (§3.1) | 22 | 0 | pending Phase 2 |
| Tools (§3.2) | 11 | 0 | pending Phase 2 |
| Selection (§3.3) | 16 | 0 | pending Phase 2 |
| Editing (§3.4) | 26 | 0 | pending Phase 2–3 |
| Track ops (§3.5) | 13 | 0 | pending Phase 3 |
| Nudge (§3.6) | 10 | 0 | pending Phase 3 |
| Markers (§3.7) | 5 | 0 | pending Phase 3 |
| View / zoom (§3.8) | 18 | 0 | pending Phase 2 |
| Project / file (§3.9) | 10 | 0 | pending Phase 2 |
| Undo / redo (§3.10) | 3 | 0 | pending Phase 2 |
| Effects (§3.11) | 22 | 0 | pending Phase 4 |
| Keyframes (§3.12) | 20 | 0 | pending Phase 5 |
| Help (§3.13) | 5 | 0 | pending Phase 6 |
| **Total** | **181** | **0** | — |

(The 181 count is the canonical Appendix A row count — see §0 TL;DR. Tests cover all 181 rows, with effect presets (1–9) and effect toggles (1–9) parameterized into 2 unique-action test groups (9 + 9 = 18 rows → 2 parameterized tests). Adjusted unique-action test count: ~110. Multi-tap JKL combos (`J`×2, `J`×3, `L`×2, `L`×3, `K`+`J`, `K`+`L`) are tested via the base `J`/`L`/`K` testIds with timed multi-press sequences — see §9.2 JKL shuttle recipe and Appendix A scope note.)

---

## 17. Code References — nle-engine (reference, NOT canon)

nle-engine has NO keyboard layer — it is engine + headless API only (its own Decision 9: "No React dependency in engine core"). Everything in this spec is SPEC-ONLY relative to the engine; the rows below document what the engine does provide that an implementer will attach a keyboard handler to. Where engine and spec conflict, **the spec wins**. Full reconciliation: `19-code-references.md`.

| Spec 16 section | nle-engine file:line | Verified quote | Status | Note |
|---|---|---|---|---|
| §3 entire inventory | `src/app/page.tsx` (grep) | only match: `compositionKeyframe pass=${pass}` | SPEC-ONLY | No `keydown`/`keyup` handler anywhere in the engine (incl. the test page); FreeCut's `config/hotkeys.ts` (this spec's primary teacher) was not ported |
| §8 handler architecture | `scripts/run-nle-tests.mjs:122` | `await page.waitForSelector('button:has-text("Run All Milestones")'` | SPEC-ONLY | The only UI input the engine's harness exercises is one button click; `page.keyboard` is never used |
| §3.1 JKL / setRate | `playback/player.ts:652` | `this._clock.playbackRate = rate;` | ALIGNED (underneath) | The rate machinery a JKL resolver would drive exists in Player; only the key→command layer is missing |
| §3.2 tool keys → selectTool | `headless/api.ts:767` | `case 'addText': {` | ENGINE-GAP | No tool/selection model on the engine's wire surface (`selectTool`, `selectElements`, `marqueeSelect` have no counterpart) |
| §3.12 keyframes | `headless/api.ts:893` | `const r = actions.addKeyframe({` | ALIGNED | `addKeyframe {itemId, property, frame, value, easing}` is wire-drivable today |
| §9 test recipes | `gaps/audit/G-test-coverage.md:248` | `A thrown error inside any test block escapes` | CORRECTIVE | No per-test isolation in the engine harness — §9's assert-on-command patterns are the upgrade |

---

**End of `16-keyboard-shortcuts.md`.**

**Cross-references:**
- Spec 00 (master): tech stack, browser matrix, decisions
- Spec 01 (core engine): manager method names (§3, §14)
- Spec 03 (playback): MediaTime ticks, FrameRate, AudioContext clock
- Spec 05 (timeline): §19 keyboard table (union — superseded by this spec's prescriptive map; see §11)
- Spec 06 (NLE ops): op inventory (§3), command pattern (§4), per-op algorithms (§5)
- Spec 10 (FCPXML export): handoff target — drives FCP-convention choice (§2.1, §11)
- Spec 11 (cloud render): `exportMaster` destination
- Spec 12 (testing strategy): test patterns, property-based testing
- Spec 14 (implementation phases): phasing (§13)
- Spec 15 (`15-wire-protocol.md`, TEST-02 shipped, Round-7 amended): canonical `EngineCommand` discriminated union (78 types, §4.1) + command→manager-method mapping (§4.2) + `apply()` dispatcher (§4.4) + export commands (§4.3.74-76) and `renameProject`/`deleteProject` (§4.3.77-78). Spec 16's §8.3 reproduces the spec-15-overlapping types for local compilation; spec 15 is normative.
- Spec 18 (UI shell): panel/tool controls that emit this spec's shortcuts and UI-layer commands (§0.2); the cheat-sheet modal (§7.3) lives in the shell's help surface (spec 18 §4.8).
- Spec 19 (code references): the keyboard layer is SPEC-ONLY vs nle-engine (no keyboard code exists there) — see spec 19 §11's map.

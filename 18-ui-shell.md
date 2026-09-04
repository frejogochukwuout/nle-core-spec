# 18 — UI Shell: Application Layout, Panels & Interaction Contracts (DaVinci-derived, simplified)

**Stream:** UI shell / application chrome
**Status:** v1.2 (Round 15 amendment pass — A1/A5/B2/B4/N2/N3/N4/N5/N6/N7/N9/N10/N12-class resolutions + testid census + annotakit-for-app charter, per `.agents/SPEC-REVISION-CANDIDATES.md` + ARCH-R15 §4; v1.1 Round 8 — cloudcut UX-spec integration: per-panel state rows, context menus §4.9, pointer/cursor grammar §5A, error & notification UX §6.4, visual-language deepening §9, a11y floor §11, UX-scope code references §13; ours-wins policy applied to all 25 contradictions, SCOUT-R8-C §3)
**Date:** 2026-09-02 (v1.0 Round 7)
**Spec file:** `18-ui-shell.md`
**Consumers:** Implementation team (UI layer), spec 05 (timeline internals), spec 16 (keyboard bindings), spec 15 (command dispatch), spec 17 (Tier 3 UI tests)
**UX source material:** cloudcut-nle `ux-spec` branch v1.3.5 (28 files — the prior iteration's app-layer UX spec; integrated Round 8 per the ours-wins contradiction policy; the cloudcut-nle main branch is the UX/app-scope reference codebase, §13)

---

## 0. TL;DR

This spec defines the application shell — the layout regions, panel inventory, and interaction contracts of the editor UI. It is derived from the DaVinci Resolve layout clone committed at `ui-mock/davinci_resolve_ui_mock.html`, **deliberately simplified** to match our much smaller scope: the menu bar is removed, the inspector is reduced from 6 tabs to 4, and the 7-page dock collapses to 3 pages (Edit / Color / Deliver). Every panel is a thin `EngineCommand` generator over the spec 15 wire protocol — no panel calls a manager method directly, and no panel holds engine state. The timeline area's internals (component hierarchy, virtualization, drag state machines) are owned by spec 05; this spec owns everything that *surrounds* them. **v1.1** integrates the cloudcut UX-spec's applicable material (per-panel state rows, the five context menus, the pointer/cursor grammar, error & notification UX, visual-language depth, the a11y floor, perf budgets) under the ours-wins contradiction policy — every rejection is registered, not silently dropped.

---

## 1. Purpose

The spec set was engine-first for six refinement rounds: 12 stream specs + a wire protocol + a keyboard map + a test plan, with the UI surface represented only by spec 05 (timeline) and the interaction stubs inside spec 16. That left the largest visible surface of the product — the application chrome — unspecified. Two panels could both be "spec-05 compliant" while producing wildly different apps. This spec closes that gap: it fixes the layout regions, the panel inventory, the per-panel contents and behaviors, the gesture→command contracts, the state-binding rules, and the testability hooks, so that the shell can be built once and every other UI-bearing spec (05, 08, 10, 11, 16) can plug into named homes instead of inventing them.

The shell is also the round-7 answer to an under-emphasized aspect of the project. The engine workstream (nle-engine) has proven the engine side is buildable; the shell spec makes the UI side equally concrete, and the mockup gives it a coherent visual identity that professionals will recognize on first contact — a rough-cut editor that *looks and feels* like a desktop NLE, running in a browser tab.

## 2. Derivation & Simplification Principles

### 2.1 The reference mockup

`ui-mock/davinci_resolve_ui_mock.html` (64 KB, 1,455 lines) is an exact-layout clone of DaVinci Resolve's Edit page, committed to this repo as the visual reference. Its structure:

```
#app                          (flex column, max-width 2048, ~1232px tall reference)
├── #menubar                  (30px — REMOVED in our shell, see §8)
├── #toolbar2                 (34px secondary toolbar: panel toggles + project title)
├── #mainbody                 (460px reference height, flex row)
│   ├── [MediaPoolPanel]      (ours: left, toggleable — mock exposes only the toggle button)
│   ├── #viewer-panel         (flex 1: viewer-toolbar, #video-frame, scrub-row, transport-row)
│   └── #inspector-panel      (420px fixed in mock; 340px in ours, simplified)
├── #timeline-toolbar         (34px: tools, snapping, link, lock, markers, zoom, master volume)
├── #timeline-tabs            (26px, JS-populated — maps to our scene tabs)
├── #timeline-area            (flex 1)
│   ├── #track-headers        (160px fixed: big TC readout + per-track headers)
│   └── #timeline-scroll → #timeline-content   (ruler + track lanes + playhead; spec 05)
├── #hscrollbar-row           (14px custom scrollbar — ours: native, deferred)
└── #app-dock                 (42px: brand + page dock + right cluster)
```

The mockup's JS (`buildRuler`, `buildV1Track`, `buildAudioHeaders`, `buildAudioLanes`, `buildTabs`, `wireRSM`, `wireToolbar`, `wireTools`, `wireMagnet`, `wireInspectorTabs`, `wireTransport`, `wireSliders`, `applyZoom`, `wirePageDock`, `wirePlayhead`, `wireHScrollSync`, `wireClock`) demonstrates the intended behaviors in miniature. It is a **visual/layout reference, not a code reference** — nothing in it is meant to be copied into the implementation.

### 2.2 Simplification principles

The mockup clones a professional finishing system; our product is a rough-cut editor with FCPXML handoff (master spec §1). Simplifications follow three rules:

1. **Remove chrome whose only job is discovery of features we don't have** (menu bar, Fusion/Fairlight pages, metadata/index/sound-library panels). Feature access moves to toolbar buttons, keyboard shortcuts (spec 16), and context menus.
2. **Reduce panels whose parameter surface exceeds our data model** (inspector: 6 tabs → 4; only model-backed parameters get controls — spec 09's project model is the ceiling).
3. **Keep everything that carries muscle memory** (transport cluster, tool cluster, track-header S/M/lock, snapping magnet, timeline tabs, dark pro theme). Professionals should be able to sit down and cut.

Every removal is recorded in §8 (Chrome Removal Ledger) with its rationale, so future rounds can revisit deliberately instead of re-deriving from the mockup.

## 3. Layout Architecture

### 3.1 Regions

The shell is a single fixed-docked layout with resizable splitters (no workspace customization, no panel tear-out, no saved layouts in v1):

```
┌──────────────────────────────────────────────────────────────────────┐
│ toolbar2 (34px): panel toggles · project title · viewer/inspector     │
├───────────────┬────────────────────────────────────┬─────────────────┤
│ MediaPool     │ Viewer (flex)                      │ Inspector       │
│ (280px,       │  viewer-toolbar (28px)             │ (340px,         │
│  toggleable)  │  video-frame (WebGPU canvas)       │  toggleable)    │
│               │  scrub-row (12px)                  │  4 tabs         │
│               │  transport-row (32px)              │                 │
├───────────────┴────────────────────────────────────┴─────────────────┤
│ timeline-toolbar (34px): tools · snap · link · lock · markers · zoom │
├──────────────────────────────────────────────────────────────────────┤
│ timeline-tabs (26px): scene tabs + "+"                                │
├──────────────┬───────────────────────────────────────────────────────┤
│ track-headers│ timeline-scroll → timeline-content (spec 05)           │
│ (160px)      │  ruler · track lanes · playhead                        │
├──────────────┴───────────────────────────────────────────────────────┤
│ hscroll / status strip (native scrollbars; 12px status strip)        │
├──────────────────────────────────────────────────────────────────────┤
│ app-dock (42px): brand · page dock (Edit/Color/Deliver) · right      │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 Sizing rules

| Rule | Value | Notes |
|---|---|---|
| Minimum window | 1280 × 800 | Below this, show a "window too small" overlay rather than degrade |
| Reference window | 1920 × 1080 | Mockup reference proportions scale from its 2048 × 1232 |
| MediaPool default width | 280px (min 200px) | Toggleable; hidden state remembered in UI prefs only |
| Inspector default width | 340px (min 280px) | Mock uses 420px; we narrow it to fit 4 simplified tabs |
| Track-headers width | 160px fixed | Matches mock; spec 05 §10 note — OpenCut's 112px is the teacher value, 160px is shell-canonical |
| Main body default height | 40% of viewport (min 320px) | Horizontal splitter between main body and timeline area |
| Splitter hit target | 6px visual, 12px interactive | Pointer-friendly; double-click resets to default |

Splitters are the only layout-mutation surface: one horizontal (main body ↔ timeline area) and two vertical (media pool ↔ viewer, viewer ↔ inspector). Panel visibility toggles come from `toolbar2`; their state lives in the UI store (Zustand — spec 00 §4 stack row "State (UI)"), never in engine state.

### 3.3 The viewer canvas mount

The WebGPU canvas mounts inside `#video-frame`'s `.frame-inner` (letterboxed). Its CSS size drives the render descriptor's output dimensions (spec 04 §7.1 `initialize(canvas…)`); device pixel ratio is respected (canvas backing store = CSS size × DPR, clamped to 2× for 4K-safety). The viewer-toolbar's zoom select offers **Fit / 1.5× / 2× / 4×** — magnification multiples of the fit width (Round 15 amendment, C7, replacing the unanchored Fit/50%/100%/200% ladder: the old "percent" semantics had no pixel anchor — the R13 honesty fix documented that the prior mock's "100%" was in fact 2× fit, the exposure this ladder corrects). `Fit` letterbox-fills (1× fit); 1.5×/2×/4× multiply the fit width and overflow-scroll when larger than the frame; zoom changes re-letterbox without changing render resolution except when a multiple overflows the frame (which re-renders at the backing-store size — spec 04 §16.2 cache rules still apply).

## 4. Panel Inventory

Each panel entry below lists: contents, behaviors, engine bindings, and simplifications vs the mock. **Command names reference spec 15 §4's canonical `EngineCommand` union** (78 types after the Round-7 amendment); where a control is a spec-16 UI-layer extension (`(UI)` in spec 16 §12), it routes to the UI store instead of `apply()` — that split is normative and tested (spec 17 §6.1).

### 4.1 toolbar2 — secondary toolbar (`shell-toolbar`)

Left cluster: `Media Pool` toggle (`btn-mediapool`), `Effects` toggle (`btn-effects`) — both panel-visibility toggles routed to the UI store (the Effects panel's contents/contract are §4.11 — Round 15 amendment, N9). The mock's `Index` and `Sound Library` buttons are dropped (§8). Center: project title (read-only; double-click opens project metadata in the Deliver page's project section). Right cluster: `Inspector` toggle (`btn-inspector`, default on), fullscreen-viewer toggle (mock's first icon button). The mock's `Mixer` and `Metadata` buttons are dropped (§8).

### 4.2 MediaPoolPanel (`shell-mediapool`)

The only panel the mockup doesn't draw (it exposes just the toggle) — DaVinci's Edit page slides it over the viewer; we dock it left for stability (rough-cut workflows live in the pool). Contents:

- **Import affordance**: toolbar button + drag-and-drop target + `Cmd+I` (spec 16 §3.1). Import runs the spec 15 §5.4 pre-extraction sequence (`engine.media.probe()` → `persistBlob()` → `generateThumbnail()` → `importMedia` command) — the panel drives the helpers, then issues the pure command.
- **Clip grid/list**: one card per `MediaAsset` (spec 09 §7): thumbnail, name, duration (TC format, spec 03 §4), type badge (V/A), resolution, fps badge when ≠ project fps. List/grid toggle is a UI-store pref. **Sort modes** (v1.1): name / duration / import date / type — ascending + descending, sort state persisted with the view pref; footer shows live counts (`N clips · M:SS total`) — counted from the snapshot, never cached (the reference repo's static footer is our warning case).
- **Search**: text filter over name, 200 ms debounce, clear button; the empty-search result state is a distinct state row (below).
- **Selection & drag**: single-select (click), multi-select (shift/cmd-click). Drag a clip onto a track lane → `insertElement` with `PlacementStrategy` resolved by drop position (spec 06 §5.9 / spec 05 §8.9). **Drag feedback (v1.1)**: drag ghost = thumbnail + name; the cursor flips to `copy` over a valid lane and `not-allowed` over an incompatible lane (audio asset over video track — the placement compatibility table, spec 06 §5.9); the hovered target track highlights its lane background.
- **Double-click**: selects and scrolls the timeline to the first element using that asset (reveal); source-preview playback is deferred (§8.5). (One gesture, one meaning — R15/B4: reveal is the double-click's ONLY meaning; the source-preview triggers live in §4.3.)
- **Context menu**: Reveal in timeline, Rename (`renameMediaAsset` if spec 15 defines it; else asset metadata edit via `updateElements`-class command — final call at seal round), Remove (`removeMediaAsset`), Properties (opens inspector's read-only file info section).
- **Missing-asset error state (v1.1)**: assets whose backing file fails the OPFS existence check render a warning badge + red clip stripe downstream; the relink flow is v2 (no wire command exists — §8.14). Badge text: "Media offline".
- **Metadata display**: bounded to spec 09's `MediaRecord` fields (name, type, duration, resolution, fps, size, importedAt) — no bins, no smart bins (schema change, v2 rejection §8.14). (Round 15 amendment, N3: `importedAt` is ISO 8601 and is ADDED to 09 §3.1's `MediaRecord` by the parallel R15 09-side amendment — this field list anticipated it; `size` stays numeric bytes and the SHELL formats it into display strings ("1.8 GB") for cards and Properties — formatted sizes are never persisted; the import-date sort mode consumes `importedAt`.)
- **A11y**: `listbox`/`option` semantics with `aria-activedescendant` for the focused card; arrow-key navigation moves focus (not selection — Enter/Space selects); the count footer is a `aria-live="polite"` region announcing result-set changes from search/sort.

**State rows (v1.1 — every panel has them; happy-path content above applies only to the ready state):**

| Panel | Empty | Loading | Error / no-result |
|---|---|---|---|
| Media pool | CTA: "Import media" button + drag-drop target + `Cmd+I` hint + "open sample project" (see §4.10) | skeleton pulse rows (grid layout preserved, §9 motion tokens) | search: "No clips match ‘<query>’" + clear-search action; OPFS failure: retry toast + banner |
| Viewer | "No media — import or drop a file" + CTA (mirror of pool CTA; drag-drop target works over the canvas) | first-frame spinner (≤ 2 s, then degraded-renderer banner per spec 00 §5) | decode failure: toast + clip stripe; asset-missing: "Media offline" overlay |
| Timeline (empty scene) | "Drop clips here, or press `Cmd+I`" centered in the lane area | (n/a — snapshot-driven) | (n/a) |
| Inspector | "Nothing to inspect" (mock default) | (n/a) | — |
| Deliver (no clips) | "Timeline is empty — nothing to export" | job-progress rows | failed job row + Retry (§6.4) |

Every state row is testable: `data-testid="shell-<panel>-state-<state>"` (§10). The viewer's family is enumerated in full (Round 15 amendment — testid census): `shell-viewer-state-empty` / `shell-viewer-state-loading` / `shell-viewer-state-error` — `shell-viewer-state-empty` joins the census explicitly (the mock shipped loading/error rows but rendered the empty row without its testid; ARCH-R15 §2.6 registers the mock patch, and Tier-3 empty-state assertions target this id).

### 4.3 ViewerPanel (`shell-viewer`)

- **viewer-toolbar** (28px): zoom select (§3.3), current TC chip (`#viewer-tc-current`, mono font), project fps chip, safe-area toggle (UI pref; overlays are DOM, not GPU — spec 04 §16.5 note).
- **In-canvas overlays (v1.1, DOM over canvas)**: top-left = active clip name + its TC in/out; top-right = resolution + fps chips. Hidden while a tool-drag is active on the timeline (no motion while tracking, §9); toggleable via viewer-toolbar.
- **video-frame**: the WebGPU canvas (spec 04). Letterboxed; degraded-renderer banner (spec 00 §5) renders as a DOM strip under the canvas, not inside it.
- **scrub-row**: playhead scrubber. Input: pointer down + move (throttled to rAF) → `seek` commands (coalesced per spec 05 §8.2's preview-commit pattern); release commits final `seek`. **Richness (v1.1)**: the scrubber renders the in/out + loop range as a shaded band (from `setLoop` state — no dedicated in/out model, spec 16 §3.1 note), clip-boundary ticks (thin marks at element edges from the snapshot), click-to-seek anywhere in the row, and a hover TC tooltip. Distinct icons for jump-start vs step-back (a common reference-repo conflation). **Inverted-window handling (Round 15 amendment, N5):** an inverted window (start > end) renders the band EMPTY and playback ignores it (no loop, no hang) — the scrubber itself cannot create one (dragging a half past the other moves the far half, the mock's R14 inversion law), and if corrupt state ever produces one it is displayed-and-skipped, never fatal; cross-ref 15 §4.3.29's R15 invariant (end > start validated / halves swapped).
- **transport-row** (32px): center cluster = step-back, play/pause (`btn-play` → `play`/`pause`), step-fwd, jump-start, jump-end; right cluster = loop (`btn-loop` → `setLoop`), mark-in `I`, mark-out `O` (→ `setLoop` start/end halves — no dedicated in/out-point commands, spec 16 §3.1 note (citation corrected R15, N12 — the note lives in §3.1, not §3.4; 05 §11.2's dedicated in/out model is retired by that resolution); spec 03 §3.4 is the playback-side consumer), add-marker `M` (→ `addMarker` + color from a compact palette). Keyboard parity is total (spec 16 §3.4-3.7) — the buttons exist for discoverability, the shortcuts for speed; both must dispatch identical commands (state-WYSIWYG test, spec 17 §6.1).
- **Fallback source-preview (v1.1, deferred-dual-viewer stand-in)**: triggered from the CLIP MENU's **"Open in viewer"** item (§4.9) or the inspector source-card's play button — it plays the raw asset via a plain `<video>` element swapped over the canvas — media-asset playback, no timeline state involved. (Round 15 amendment, B4: double-click on a pool card is §4.2's reveal and NOTHING else — one gesture, one meaning; the v1.1 text's "double-clicking a media-pool asset … can play the raw asset" claimed the same gesture a second time and is withdrawn.) This is the cheap interim for §8.5's deferred dual viewer: it gives editors source-matching without modeling a second program monitor. Not a spec 15 command surface — a UI-layer affordance reading only `MediaRecord` metadata; exiting restores the program canvas on the next frame.

### 4.4 InspectorPanel (`shell-inspector`)

Mock has 6 tabs (video/audio/effects/transition/image/file); we ship **4**:

| Tab | Visible when | Contents (all model-backed, spec 09 ceiling) |
|---|---|---|
| **Video** | video/comp element selected | Transform: position X/Y, scale %, rotation°, opacity %, flip H/V (→ transform-resolver fields, spec 07 §5.4); Speed: rate % + preserve-pitch toggle (→ retime family, spec 06 §5.11) |
| **Audio** | audio-bearing element selected | Volume %, pan (−100..100), fade-in/fade-out seconds (→ spec 03 §9 / spec 09 §3.1 audio fields) |
| **Effects** | any element selected | Effect list (add/remove/reorder/toggle + param editors) → `addEffect`/`updateEffect`/`removeEffect`/`reorderEffect`/`toggleEffect` (spec 15 §4.3.52-56) |
| **Transition** | transition selected (or boundary focus) | Presentation picker (27 registry entries, spec 07 §6.3), duration, alignment (→ `updateTransition`, spec 15 §4.3.62) |

Inspector edits are **commit-on-release** (slider drag) / **commit-on-enter** (numeric field) with live preview via the same preview-commit coalescing as timeline drags (spec 06 §4.6). Multi-selection shows the common-parameter subset with "mixed" indicators. Nothing selected → "Nothing to inspect" (mock's default text). The mock's `image` and `file` tabs are dropped (§8.6-8.7). (Round 15 amendment, B2: the audio tab's field set is Volume % + pan −100..100 + fades — reading 09 §3.1's `volume` (linear 0..1, presented as %) and `pan` (−100..100, ADDED to ElementJSON by the parallel R15 09-side amendment, cross-ref); "Gain dB" is withdrawn — no dB field exists in 09 and dB conversion is display-side only. `preservePitch` joins the same 09 amendment; its editor stays on the Video tab's Speed row — a retime concern — while the field backs both.)

**Field contracts (v1.1):**

- **Timecode parsing**: every time-based numeric field (In/Out/duration/fade) accepts `HH:MM:SS:FF` timecode, `SS.s` seconds, and bare frame counts (suffixed `f`), parsed against project fps — one shared parser, never per-field. Invalid input: red 1px border + message under the field, focus retained, nothing dispatched.
- **Uniform commit semantics**: NumberFields live-preview on keystroke with a 50 ms debounce (same coalescing class as sliders — one `updateElements` per settle, not per keystroke); commit-on-enter and commit-on-blur both settle pending input. This closes the slider/field asymmetry the v1.0 text left open.
- **Reset per group**: each labeled parameter group (Transform, Speed, Fades) carries a reset affordance restoring spec 09 defaults — one `updateElements` with the default patch (a real command, undoable, not a local re-render).
- **Quick-seek buttons**: the source-asset card's In/Out rows carry `→ In` / `→ Out` / `→ Mid` buttons — pure `seek` commands, no state change.
- **Source-asset card** (top of Video/Audio tabs when a single element is selected): thumbnail, asset name, resolution, fps, duration — read-only `MediaRecord` projection (no EDL-JSON fallback view; missing metadata renders as `—`).
- **Tab visibility**: tabs whose "visible when" predicate is false are HIDDEN (not disabled) — the 4-tab topology is already the pruned set; hidden-not-disabled keeps focus order short (the visible-but-disabled pattern stays available for seal-round reconsideration via §8).

### 4.5 timeline-toolbar (`shell-timeline-toolbar`)

Tool cluster (radio group; honors spec 15 §4.3.45's tool enum — **nine tools** — exactly; Round 15 amendment, N2: the v1.1 text listed seven while claiming exact parity, and the mock likewise ships seven (C23)): Select (V), Razor/Blade (B), Roll (T), Ripple (R), Slip (Y), Slide (U), Rate-stretch, Hand (H), Zoom (Z) — spec 16 §3.2 bindings in parens where a key exists (rate-stretch is toolbar-only, no §3.2 key; v1.1's A/,',/S letters were the DaVinci mockup's — corrected to 16 §3.2's V/Y/U). Hand and zoom are keyboard-only (H/Z), toolbar-excluded per the removal ledger (§8.15). All dispatch `selectTool`; the mock's `dyntrim` is dropped (§8.9). Toggle cluster: Snapping magnet (`btn-magnet`, N — **UI-store**, spec 16 §0.2), Link A/V (`btn-linklock` — UI-store), Lock all tracks (`btn-track-lock` → per-track `toggleTrackLock` fan-out, undoable as a batch, spec 15 §7). Marker cluster: add-marker button + color presets. Zoom cluster: zoom-to-fit, zoom-to-selection, slider (UI-store viewport state, spec 05 §5). Master audio: mute + volume slider (→ master bus gain, spec 03 §9's audio graph). The mock's sync-bin/auto-sync buttons are dropped (§8.10).

**Toggle-cluster contracts (Round 15 amendments):**

- **N4 — Link A/V gate (`btn-linklock`):** link-OFF suspends BOTH linked-selection propagation (05 §12.3: selecting one of a linked pair selects only the clicked element) AND sync-lock move-following (06 §6: a linked partner no longer follows moves). The flag is VIEW-level (this UI-store toggle); the links themselves are DOC-level (`ElementJSON.linkedTo`, added to 09 §3.1 by the parallel R15 09-side amendment) — turning the toggle off never edits or deletes doc-level links, it only gates their behavioral consequences for this view.
- **N6 — Lock-all (`btn-track-lock`):** set-all semantics — a click sets EVERY track to the clicked target from any mixed state; the pressed state is DERIVED (`every(track.locked)`, so mixed states read un-pressed); the fan-out stays one undoable batch (spec 15 §7). After undo/redo the shell RE-DERIVES view flags (this pressed state and every other §6.2 view flag) from the restored snapshot — view state follows doc state through history restores (closes the R13 mock bug where undo left the flag stale).
- **Ripple mode is NOT a toolbar concern (A6, R15):** ripple the *tool* sits in the tool cluster above (`R`); ripple *mode* — the global editing pref — is a view-level flag bound to `Option+R` (spec 16 §3.2) and persisted as `TimelineViewState.rippleMode` (spec 09 §3.1); it gets no toolbar toggle unless a seal round adds one.

### 4.6 timeline-tabs (`shell-timeline-tabs`) — scene tabs

The mock's timeline tabs map to our **scenes** (spec 09 §6: multi-scene projects): one tab per scene (active = `getActiveScene`), `+` → `createScene`, close → `deleteScene` (confirm). Tab labels carry modified/dirty dot (project-save state, spec 09 §6 autosave). Playback and editing always target the active scene; `switchToScene` is the only cross-scene mutation.

### 4.7 timeline-area (`shell-timeline`) & track-headers (`shell-track-headers`)

The region's internals belong to spec 05 (component hierarchy §4, zoom/scroll §5, virtualization §6, clip rendering §7, interactions §8, track headers §10). The shell fixes: the 160px header column (big TC readout in `#track-headers` mirrors the viewer TC; per-track M/S/lock buttons on ALL track kinds, plus visibility (V) on NON-AUDIO kinds only → `toggleTrackMute`/`toggleTrackSolo`/`toggleTrackLock`/`toggleTrackVisibility` commands (Round 15 amendment, A5: M/S/L render on every track kind — solo on video/text/overlay = monitor-solo semantics, 18's shape wins over 05 §10's "no S on video"; V renders only where 05 §10 permits it, non-audio — correcting this spec's unqualified v1.1 list in BOTH directions; the mock ships exactly this shape); the mock's per-track waveform/clip-view toggle is a UI pref), and the scroll container's native scrollbars (the mock's custom 14px `#hscrollbar-row` is deferred, §8.11). The playhead line + head render per spec 05 §11.

### 4.8 app-dock (`shell-dock`)

Left: brand mark + app name. Center: page dock — **three pages, not seven**: `Edit` (default; the whole shell above), `Color` (grading workspace: spec 08's panels — wheels, curves, LUT, qualifier, power window, scopes — in a simplified single-column layout; enters a color-focus mode that swaps the inspector for the grading panel stack while the timeline stays live), `Deliver` (export: FCPXML via `exportFCPXML` command (spec 15 §4.3.74), optional cloud master via `exportMaster` (§4.3.75), render settings, progress list). Right cluster: keyboard cheat-sheet (spec 16 §7.3's modal, opened via `?`), settings (deferred, §8.12). Dropped pages: Media, Cut, Fusion, Fairlight (§8.2-8.4).

### 4.9 Context Menus (v1.1 — enumeration; resolves §15.2 Q2)

Five context menus, each item command-backed (the §5 rule: no menu item without a spec 15 type or explicit `(UI)` tag). All open on right-click and on **Shift+F10** with focus in the surface (keyboard route is normative, §11). Menu chrome: DOM popup, 220px, 28px items, shortcut labels right-aligned, separators between groups, Escape/outside-click closes, focus returns to opener. `data-testid="shell-menu-<name>"` + items `shell-menu-<name>-<item>`.

**Clip menu** (right-click a selected element; multi-select = whole selection): Cut `⌘X` · Copy `⌘C` · Paste at playhead `⌘V` — `cut`/`copy`/`paste` (spec 15 §4.3.68-70) ⫽ Duplicate `⌘D` — `duplicate` ⫽ Split at playhead `⌘B` — `split` ⫽ Delete `⌫` — `delete` ⫽ Ripple delete `⇧⌫` — `delete {ripple:true}` (spec 16 §3.4 defaults: Delete leaves gap — flag this in the cheat sheet, reference C8; A1 resolved R15: 16 §3.4 now matches this row — `Delete`/`Backspace` plain-delete aliases, `⇧Delete` the only ripple chord) ⫽ ⫽ Remove Effects — batched `removeEffect` ⫽ Add Transition… — opens inspector Transition tab ⫽ Rename — inline edit → `updateElements {name}` ⫽ Reveal in Media Pool — (UI) navigation ⫽ Open in viewer — (UI) the v1 source-preview trigger (§4.3, R15/B4; double-click on a pool card stays §4.2's reveal).

**Track-header menu** (right-click a track): Add Track Above/Below — `addTrack {index}` ⫽ Delete Track — `deleteTrack` (with-clips confirmation, §6.4) ⫽ Rename Track — inline → `updateElements`-class (track name) ⫽ ⫽ Mute `M`-click · Solo · Lock — `toggleTrackMute/Solo/Lock` ⫽ Height: Compact/Normal/Tall — (UI) pref.

**Ruler menu** (right-click the ruler): Add Marker — `addMarker` ⫽ Go to Marker › (submenu, first 5 + More) — `seek` ⫽ Clear Markers in View — batched `deleteMarker` ⫽ ⫽ Mark In `I` / Mark Out `O` — `setLoop` halves ⫽ Clear In/Out — `setLoop {start:null, end:null}` (note the halves semantics — "clear out" clears `end`, not `start`; the reference-repo bug is the test case). (Round 15 amendment, N10: plain click/drag on the ruler SEEKs (05 §8.6 — the §5 gesture row) — markers are added via `M` (spec 16 §3.7), §4.5's marker button + color palette, and THIS menu; 05 §11.1's "Click on ruler to add marker" clause is retired by this resolution (R15 — the 05-side edit lands in the parallel pass). Right-click / Shift+F10 is the ruler's only menu route.)

**Media-pool menu** (clip card): Insert at Playhead `,`-equivalent button — `insertElement {strategy:'explicit'}` ⫽ Reveal in Timeline — (UI) navigation ⫽ Rename / Remove / Properties — as §4.2.

**Timeline-empty menu** (right-click empty lane area): Paste `⌘V` — `paste {atTime}` ⫽ Add Track — `addTrack` ⫽ Import Media — `⌘I` flow.

Cross-track-type drags already fail at placement (spec 06 §5.9) — the menus add no duplicate affordances for them.

### 4.10 Sample project (v1.1)

A built-in 30-second demo project (3 video clips + 1 text + 1 audio + one crossfade) ships as a `ProjectJSON` fixture (spec 09) + committed media manifests, loadable from the media-pool empty state and the cheat-sheet modal's footer. It doubles as the Tier-2/3 test fixture (spec 17 §5.3's committed-asset rule + §13A.6 — the same file the tests load, never a fork), and it is the onboarding path: "the empty state teaches" (source principle 7). No tour, no settings modal, no help menu (§8.12 stands).

### 4.11 EffectsPanel (`shell-effects`) (v1.2 — Round 15 amendment, N9)

The effects library rail — 220px, toggleable, docked in the main-body row between the media pool (and its splitter) and the viewer; §3.1's diagram shows the left stack collapsed (the rail rides between pool and viewer when toggled on). The §4.1 `btn-effects` toggle is the mouse route; the keyboard route is `Option+2` (spec 16 §3.8 — ⌘1–⌘4 stay page switches; the ⌥-form avoids that collision). Contents and contract:

- **Registry list**: one row per registry entry, grouped by category — video effects from spec 08 §3's effect-type inventory, transitions from spec 07 §6.3's 27-entry presentation registry (the mock ships an 8-row Blur/Stylize/Transition subset as the review-surface shape). Rows: `data-testid="shell-effects-row-<slug>"`; the panel root is `shell-effects` (§10).
- **Drag-to-clip contract (the real apply path)**: drag a row onto a timeline clip — effect rows issue `addEffect` on the dropped clip (spec 15 §4.3.52); transition rows issue `updateTransition` on the clip's boundary (spec 15 §4.3.62). The drag payload is a fixed MIME contract: type `application/x-nle-effect`, JSON body `{ name, cat }` (the mock's pinned shape). Drag feedback follows §4.2's lane grammar (`copy` cursor + ghost); incompatible drops reject per spec 06 §5.9. One drop = one undoable command — the drop IS the commit (no preview-commit).
- **Click fallback**: a row click is an honest `info` toast (§6.4, N7's class) pointing at the drag path + the inspector's Effects tab (where param editing lives) — keyboard-operable, never a silent no-op (the mock's R14 fix).
- **F6 region status (conditional)**: the rail joins §11.5's F6 cycle only while visible (between media pool and viewer); hidden = not a focus stop — conditional membership keeps the cycle stable for SR users.

## 5. Interaction Contracts (gesture → `EngineCommand`)

Every mutation the shell can perform is expressed here. This table is normative: Tier 3 tests (§12) assert exactly these mappings via `window.__engine.command.apply()` capture (spec 17 §6.1's state-WYSIWYG pattern).

| Gesture / control | Preview | Commit (spec 15 type) | Notes |
|---|---|---|---|
| Click clip / element | hover + selection ring | `selectElements { elements, mode: 'replace' }` | spec 05 §8.2 |
| Shift/Cmd-click | accumulate | `selectElements { mode: 'add' \| 'toggle' }` | |
| Marquee drag (empty lane) | rubber band | `marqueeSelect` | spec 05 §8.7 |
| Drag element body | live move (DOM transform) | `move` (coalesced, spec 06 §4.6) | spec 05 §8.3; snap guides per spec 05 §9 |
| Drag trim handle (L/R) | live resize | `trim { edge, delta }` | spec 05 §8.4; overlays per spec 06 §8 |
| Roll both handles / T-tool drag | dual overlay | `roll` | spec 06 §5.5 |
| Blade tool click on clip | cut line cursor | `split { time }` | spec 06 §5.1; spec 05 §8.5 |
| Drag from media pool → lane | ghost | `insertElement` | placement resolved by drop (spec 06 §5.9; spec 05 §8.8) |
| Alt-drag element | duplicate ghost | `duplicate` then `move` (batched, spec 15 §7) | |
| Inspector slider (transform/opacity/…) | live GPU re-render | `updateElements { updates }` (coalesced) | commit-on-release, §4.4 |
| Inspector effect param edit | live | `updateEffect` | |
| Inspector transition edit | live | `updateTransition` | |
| Transport play/pause | — | `play` / `pause` | |
| Scrub bar / viewer drag | seek preview | `seek` (throttled + final commit) | spec 05 §8.6 |
| Ruler click / drag | playhead preview | `seek` (throttled + final commit) | spec 05 §8.6; plain click/drag on the ruler SEEKs — no marker-on-click (Round 15 amendment, N10: markers via `M`, §4.5's button/palette, §4.9's ruler menu; 05 §11.1's click-to-add retired R15) |
| Step ±1 frame | — | `seek` ±1 frame | spec 16 §3.5 parity |
| Loop toggle | — | `setLoop { start, end }` | |
| Mark in / out (I / O) | region shading | `setLoop` start/end halves (spec 16 §3.1 note — citation corrected R15/N12; 05 §11.2's dedicated model retired by that resolution) | spec 03 §3.4 |
| Add marker (M) | pin | `addMarker` | color from palette |
| Track header M / S / lock / eye | immediate | `toggleTrackMute` / `toggleTrackSolo` / `toggleTrackLock` / `toggleTrackVisibility` | M/S/L all kinds, eye non-audio only (§4.7, R15/A5) |
| Tool buttons (V/B/T/R/Y/U/…) | cursor change | `selectTool` | spec 15 tool enum (nine tools — letters corrected to 16 §3.2's, R15/N2) |
| Scene tab select / + / close | — | `switchToScene` / `createScene` / `deleteScene` | §4.6 |
| Undo / redo (toolbar + Z / Y) | — | `undo` / `redo` | |
| Deliver: Export FCPXML | progress toast | `exportFCPXML { format, bundleMedia }` | artifact via `CommandResult.data` (spec 15 §14.11) |
| Deliver: Export master | job row | `exportMaster { format, destination, range }` | progress via `renderProgress` events |
| Deliver: Export frame | — | `exportFrame { format, time }` | |
| Snap magnet, link toggle, zoom, panel toggles, tab focus | local only | **(UI)** — UI store, spec 16 §0.2 | never `apply()` |

**Live-drag semantics (normative).** During drags the shell renders optimistic preview state locally (DOM transforms only — never mutates engine state), then commits one command (or one coalesced batch) on release. Escape during drag cancels the preview and issues nothing. This is spec 05 §8 / spec 06 §4.6's pattern, promoted to a shell-wide rule: **the engine never sees intermediate drag states.**

### 5A. Pointer & Cursor Grammar (v1.1)

**Wheel semantics** (per surface):

| Surface | Wheel | Shift+Wheel | Ctrl/Cmd+Wheel | Alt+Wheel |
|---|---|---|---|---|
| Timeline lanes | horizontal scroll | horizontal scroll (faster ×10) | **zoom toward cursor** (anchored at pointer time-position, spec 05 §5.2) | vertical track scroll |
| Ruler / scrub-row | horizontal scroll | zoom toward playhead | zoom toward playhead | — |
| Viewer canvas | — (fixed fit) | — | zoom select cycles (UI) | — |

Ctrl/Cmd+wheel zoom-to-cursor is normative (the #1 absent affordance in v1.0); `preventDefault` is mandatory so the browser page-zoom never fires. The zoom itself is a (UI) viewport operation — no engine command (spec 05 §5).

**Double-click resets**: sliders, knobs, and NumberFields reset to their spec 09 default on double-click — implemented as the same reset command as the inspector's per-group reset (undoable `updateElements`, never a local-only re-render).

**Shift+drag axis-constrain**: horizontal-only for clip drags (time axis), vertical-only for track-header height resize. Adopted (compatible with our grammar, unspecified in v1.0). **Rejected**: Ctrl+drag-duplicate and Alt+drag-slip (contradiction C11 — our Alt-drag-duplicate stands, slip stays tool/keydown-driven).

**Cursor vocabulary** (all 16 rows directly testable via computed style or `data-cursor`):

| Context | Cursor |
|---|---|
| Default / select tool active | `default` / `pointer` over interactive |
| Clip body (select tool) | `move` |
| Clip left/right edge (hit zone) | `ew-resize` |
| Trim handle hover | `ew-resize` |
| Roll tool on cut point | `ew-resize` (dual overlay indicates both) |
| Blade tool over clip | `crosshair` + cut-line preview |
| Hand tool drag | `grab` → `grabbing` |
| Marquee in progress | `crosshair` |
| Playhead drag | `col-resize` |
| Zoom tool | `zoom-in` (Alt: `zoom-out`) |
| Drag from media pool, over valid lane | `copy` + ghost |
| Drag from media pool, over incompatible lane | `not-allowed` |
| Move to wrong track type (rejected preview) | `not-allowed` |
| Locked clip interaction | `not-allowed` (clip is `pointer-events: none` — cursor set on the track lane under it) |
| Disabled control (all surfaces) | `not-allowed` + 40% opacity (§9) |
| Text field / inline rename | `text` |

Cross-track-type move prevention is the placement layer's job (spec 06 §5.9); the cursor is the presentation of that rejection, not a second enforcement.

## 6. State Binding & Sync

1. **The shell holds zero engine state.** All engine-derived data (tracks, elements, selections, playhead, scene list, media) comes from `SceneState` snapshots + the `EngineEvent` stream (spec 15 §9). Panels subscribe through a thin selector layer that computes view models (e.g., clip layout = `timeToPx` × snapshot, spec 05 §5.3).
2. **The UI store (Zustand) holds only view state**: panel visibility, tool (mirrored), snap on/off, link on/off, zoom/scroll, inspector tab, theme. This is exactly spec 16 §0.2's UI-layer-extension surface — the same store, the same setters, so shortcuts and shell buttons drive one state.
3. **Event → re-render mapping**: `stateChanged` → full snapshot refresh (rAF-batched); `timeupdate`/`playbackState` → transport + playhead only (no snapshot refetch); `renderProgress`/`exportArtifactReady` → Deliver page + toasts; `autosaveState` events (spec 09 §6.1's autosave lifecycle — dirty/flushing/flushed/failed) → the status-strip save chip (§6.3). `commandApplied` events keep multi-consumer sync (cloud mirroring) free.
4. **WYSIWYG obligations** (spec 17 §6.1, CI-blocking): every §5 row must produce a structurally-identical `EngineCommand` whether driven by mouse, keyboard, or programmatic test — the shell's buttons are shortcuts with icons.

### 6.3 Save-status chip (v1.1)

The 12px status strip (§3.1) is now owned: left segment = autosave state driven by spec 09 §6.1's events — `Saving…` (flush in progress) · `Saved 12s ago` (idle, timestamp) · `Save failed — retrying` (error state + click-to-retry = `saveProject`). This is a LOCAL-OPFS indicator only — the cloud-PUT autosave it was adapted from is rejected (contradiction C18); nothing about the chip implies network. Scene-tab dirty dots (§4.6) stay as the per-scene signal. Test: `shell-status-save` testid + event-paired assertions in spec 17 §13A.

### 6.4 Error & Notification UX (v1.1)

**Toast conventions**: success = 4 s auto-dismiss; warning = 6 s; error = persists until dismissed (max 3 stacked, oldest collapses to an icon row); **info = 4 s, `role="status"` (Round 15 amendment, N7 — the class this section's own rows already needed: "Nothing to undo" below, import/deliver notices; the mock's `info`/`persist` split is the proven shape)**. Toasts live in a fixed region `role="status"` (success/warning/info) / `role="alert"` (error); the notification region never steals focus. `data-testid="shell-toast-<n>"`.

**Error-class → presentation table** (typed over spec 15 §6.3's `CommandError.code`; presentation only — the engine never renders):

| Error class (representative codes) | Presentation |
|---|---|
| Command rejected — validation (`SCHEMA_INVALID`, `INVALID_PARAMS`-class) | toast (error) + offending field red-border if an inspector field sourced it; nothing else mutates |
| Command rejected — state conflict (`OVERLAP_REJECTED`, `MAIN_TRACK_CONSTRAINT`, `TRACK_NOT_EMPTY`, `LOCKED_*`) | invalid-op feedback: message naming the blocker ("Cannot move — blocked by locked clip") + `not-allowed` cursor on the source control; no toast spam (one per gesture, not per rejected preview) |
| Rejected no-op (`NOOP`) | silent UI-internal handling — the gesture simply produced no state change; no toast (surfacing it is noise) |
| Not-found (`ELEMENT_NOT_FOUND` — stale refs after external mutation) | auto-refresh snapshot + retry once + toast if still failing |
| Undo boundary (`NOTHING_TO_UNDO`/`NOTHING_TO_REDO`) | brief "Nothing to undo" `info` toast (4 s — the N7 kind, R15; not an error class visually) |
| Render/export job failure (spec 11 job states) | Deliver-page row turns failed-state + **Retry** button (re-issues the export command); toast (error) |
| Asset missing (`MEDIA_MISSING`-class) | pool badge + clip red stripe (§4.2) + toast once per asset |
| Storage failure (OPFS errors, spec 09 §11) | save-chip error state (§6.3) + toast (error, persist) with retry |

**Destructive-action confirmations** (modal, focus-trapped, `⌘.` cancels): `deleteScene` with clips (existing), `deleteTrack` with clips (new), multi-delete ≥ 5 elements ("Delete 12 clips?"), `removeMediaAsset` when elements still reference the asset (count them). Everything else commits directly — undo is the safety net.

**Global failure boundary**: one React error boundary around the shell tree rendering "Something went wrong — reload / copy diagnostics" (diagnostics = engine health snapshot + last commands, capped). This is the last-resort presentation; per-command errors never reach it (they are typed results, not exceptions — spec 15 §6).

**beforeunload**: registered only when autosave state is `dirty` ("unsaved changes" browser prompt); when the flush completes it deregisters. Pairs with spec 09 §6.3's unload-flush, which stays authoritative for data; the prompt is the UX layer.

## 7. Rendering Strategy per Panel

| Surface | Tech | Spec |
|---|---|---|
| Viewer video | WebGPU canvas (10-bit pipeline) | 04 §7, §5.3 |
| Timeline lanes, clips, ruler, playhead, headers | DOM/CSS (virtualized) | 05 §4-§7 |
| Filmstrip thumbnails / waveforms | worker-generated ImageBitmap/OffscreenCanvas assets | 02 §8.4 (filmstrip) / §8.3 (waveform) |
| Inspector / panels / dialogs / toasts | DOM (React 19 + Radix/shadcn-style components, spec 00 §4) | this spec |
| Color workspace scopes | worker-fed canvas panels (~10fps updates) | 08 §11, 02 audio/video meter worker notes |

The shell is a React 19 tree; the engine import is a pure TS module (spec 01 §6 boundary) — components import only the command constructor helpers + selector layer, never engine internals.

## 8. Chrome Removal Ledger (mock → ours, with rationale)

| # | DaVinci/mock feature | Decision | Rationale / replacement |
|---|---|---|---|
| 8.1 | Top menu bar (`#menubar`) | **Removed** (user directive) | All actions reachable via toolbar buttons + spec 16 shortcuts + context menus; removes ~30 menu items × i18n × a11y burden for features we don't have |
| 8.2 | Media / Cut pages | Removed | Media pool is an Edit-page panel (§4.2); Cut page's dual-timeline is a finishing workflow — rough cut happens in Edit |
| 8.3 | Fusion page | Removed | Compositing beyond our effect set is out of scope (master spec §1) |
| 8.4 | Fairlight page | Removed | Audio post (bus routing, mixer) is downstream-NLE territory; audio params live in inspector Audio tab |
| 8.5 | Dual viewers (source + program) | Deferred to v2 | Single program viewer; source preview requires media-asset playback the command layer doesn't model yet (noted as seal-round question §15.2) |
| 8.6 | Inspector `image` tab | Removed | Only model-backed params ship (§4.4); image-specific grading merges into Effects tab |
| 8.7 | Inspector `file` tab | Removed | File metadata shows in media pool cards + context-menu Properties (read-only) |
| 8.8 | Mixer / Metadata panels (toolbar2 right) | Removed | Out of scope (8.4); project metadata is a Deliver-page section |
| 8.9 | Dynamic trim tool (`dyntrim`) | Removed | Spec 15 tool enum has roll/ripple covering the rough-cut need; re-add only if asymmetry data demands it |
| 8.10 | Sync bin / auto-sync buttons | Removed | A/V sync is handled by link groups + sync-lock (spec 06 §6), not editor-side bin sync |
| 8.11 | Custom 14px h-scrollbar | Deferred | Native scrollbars first; custom scroller is polish, not contract |
| 8.12 | Workspace save/custom layouts | Removed | Fixed dock + splitters (§3.2); workspace persistence is a v2+ feature at the earliest |
| 8.13 | Audio meters panel | Deferred | Master mute/volume in timeline-toolbar now; meters need the meter worker tap (spec 02) — v2 |
| 8.14 | Bins / smart bins in media pool; relink flow; Ctrl+drag-duplicate; Alt+drag-slip; MP4/EDL/JSON/MP3 export formats; LUFS/EQ/dynamics; light theme; first-run tour | **Rejected (v1.1 register — from the UX source, ours-wins)** | Schema changes (bins), missing wire commands (relink/EDL/…), contradiction C11/C14/C15, scope rejections per 00 §1; each entry lives in SCOUT-R8-C §6's rejection register — future PRs cite it instead of re-litigating |
| 8.15 | Hand / zoom tools as toolbar buttons (§4.5) | **Toolbar-excluded (keyboard-only)** (R15/N2) | The §4.5 tool cluster carries the seven editing tools; Hand/Zoom remain spec 16 §3.2 keyboard bindings (H/Z) and honored spec 15 §4.3.45 enum members shell-wide — re-add as buttons only if pointer-space panning demands it |

## 9. Theming & Design Tokens

Dark pro theme, single theme in v1 (light theme is a non-goal). Tokens (CSS custom properties, Tailwind 4 theme layer):

| Token | Value (mock-derived) | Use |
|---|---|---|
| `--bg-app` | `#171719` | dock |
| `--bg-shell` | `#1c1c1e` | toolbar2, panels, timeline toolbar |
| `--bg-panel-raised` | `#202022` | track headers, raised sections |
| `--bg-timeline` | `#1a1a1c` | timeline lanes |
| `--border-hairline` | `#0a0a0a` | all 1px separators (mock's universal border) |
| `--accent-selection` | `#e8b34b` (mock playhead gold) | selection, active tab, playhead |
| `--accent-focus` | `#7b5cff` | keyboard focus ring, primary buttons (mock inspector gradient start) |
| `--text-primary` / `--text-muted` | `#e6e6e6` / `#9a9a9e` | |
| `--tc-mono` | 12px tabular mono (JetBrains Mono / system mono fallback) | ALL timecode chips, ruler labels, big TC readout |

Spacing on an 8px grid (4px half-steps inside dense bars); control heights: 24px icon buttons (26px in mock, tightened), 28px viewer toolbar, 34px main toolbars. All icons inline SVG 14-16px, 1.6-1.7 stroke (mock's icon language).

**v1.1 deepening (from the UX source, contrast-verified):**

- **Type scale (6 steps)**: 11px dense labels (min), 12px body/TC, 13px panel headers, 14px dialog body, 16px dialog titles, 20px empty-state headings. Line-height 1.4 body / 1.2 dense. The 11px floor is normative (a11y §11 item 12).
- **Contrast rules (WCAG 2.2 AA-verified, token pairs)**: `--text-primary` on `--bg-shell` ≥ 7:1; `--text-muted` on `--bg-panel` ≥ 4.5:1 (body floor); any `--tx-`-muted-quaternary token is **forbidden as body text** (decorative hints only — the source's rule, kept because it is the single most-violated dark-theme rule). Focus ring `--accent-focus` vs any bg ≥ 3:1. Selection gold on timeline bg ≥ 3:1 (non-text).
- **Icon conventions**: 14px in 24px buttons / 16px in 34px bars; 1.6 stroke; every icon decorative → `aria-hidden` + adjacent text or `aria-label` on the button (never icon-only without a label).
- **Motion tokens + anti-motion rules**: `--motion-fast` 100ms (fades), `--motion-base` 200ms (panels/menus), `--motion-slow` 400ms (page swaps). **No motion while tracking** (drag/scrub in progress = overlays freeze, no transitions); **playhead never animates** (position is per-frame state, not a tween); loading skeleton pulse at 1 Hz; `prefers-reduced-motion: reduce` zeroes all three tokens + kills the pulse globally (§11).
- **Tooltip latency**: 500 ms hover delay, 100 ms fade, 4 s auto-dismiss; suppressed entirely while any pointer button is down (tooltips during drag are noise). Delay/opacity via CSS only — no JS timers per element.
- **Disabled state language**: 40% opacity + `not-allowed` cursor + no focus stop. One rule for every control class.
- **State visualization** (hover/selected/dragging/error/disabled per control class): buttons — bg +1 step on hover; clips — 1px `--accent-selection` outline selected, 50% original-opacity ghost + separate drag ghost while dragging; lanes — bg +1 on drag-over; inputs — red 1px border on error (never just color — pair with message text).
- **Color strips (semantic, token-driven)**: track-type strip 2px on track headers (video/audio/overlay from one hue ramp); clip color-label strip 3px on the left edge (label palette from `updateElements`-backed field, rendering here); fade triangles + effect badges (F/T/S/♪) on clips per spec 05 §7.3's structure — tokens live here, geometry there.
- **Panel anatomy**: optional 28px footer row for counts/filters (media pool uses it, §4.2); header row = title + controls, never wraps.
- **i18n posture**: all UI strings extracted to a locale module from day 1 (English-only v1); format-only strings (TC, durations) go through spec 03 §4's formatter, never inline concatenation. The timecode-format picker is v2. RTL deferred — layout is `dir=ltr`-assumed; extraction is the cheap-now insurance.

## 10. `data-testid` Conventions (spec 17 Tier 3 contract)

- Panel roots: `shell-<panel>` → `shell-toolbar`, `shell-mediapool`, `shell-effects` (§4.11, R15/N9), `shell-viewer`, `shell-inspector`, `shell-timeline-toolbar`, `shell-timeline-tabs`, `shell-track-headers`, `shell-timeline`, `shell-dock`, `shell-color`, `shell-deliver`.
- Controls: `shell-<panel>-<control>` → `shell-viewer-btn-play`, `shell-viewer-scrub`, `shell-timeline-toolbar-btn-snap`, `shell-timeline-toolbar-tool-blade`, `shell-inspector-tab-video`, `shell-track-3-btn-mute`, `shell-scene-tab-2`, `shell-deliver-btn-export-fcpxml`.
- Elements inside the timeline follow **spec 05's** existing conventions (05 §8.x) — this spec adds only the shell frame around them.
- Panel state rows (v1.1): `shell-<panel>-state-<empty|loading|error|noresult>` (§4.2 table); context menus + items: `shell-menu-<name>[-<item>]` (§4.9); toasts: `shell-toast-<n>` (§6.4); save chip: `shell-status-save` (§6.3).
- Mock ids (`btn-play`, `btn-magnet`, …) are documented aliases in §4 for traceability; tests target `data-testid`, never raw ids.

## 11. Accessibility (v1.1 — the WCAG 2.2 AA floor)

1. **Keyboard completeness**: every §5 contract has a spec 16 binding or is reachable via Tab/Enter; the toolbar is a `toolbar` role with roving tabindex; tool radio group uses arrow-key navigation.
2. **Focus management**: panel toggles move focus into the revealed panel; dialog close restores focus to opener; timeline drag interactions are pointer-only by nature but every commit has a keyboard route (trim via numeric inspector fields, move via frame-step + nudge commands per spec 16).
3. **Roles**: `application` landmark on the shell; `tablist`/`tab` for inspector tabs and scene tabs; `slider` for scrub/zoom/volume (with `aria-valuetext` in TC format); `grid` semantics inside the timeline are spec 05 §11's concern.
4. **Announcements**: live regions per §6.4's toast roles; media-pool count footer (§4.2) is `aria-live="polite"`.
5. **F6 panel-focus cycling (+ Shift+F6 reverse)** — normative: F6 cycles focus among the major regions (toolbar → media pool → [effects rail, §4.11, while visible] → viewer → inspector → timeline → dock; the conditional effects stop is the R15/N9 amendment), 2px visible focus outline on the region container when it holds focus. This is the keyboard navigator for an `application` landmark that has no Tab-order of its own.
6. **tablist ↔ tabpanel pairing**: every `tab` sets `aria-controls` to its panel id; panels carry `role="tabpanel"` + `aria-labelledby` back-reference (inspector tabs, scene tabs).
7. **Grid/listbox arrow navigation + `aria-activedescendant`**: media pool (§4.2), marker submenus (§4.9); focus moves without selection; Enter/Space activates.
8. **Canvas accessibility**: the viewer canvas gets an `aria-label` updated at ≤ 1 Hz ("Playing — 00:00:12:04, Clip2") and a throttle-limited TC live region mirrors it for screen readers; the timeline's DOM surfaces (ruler as `role="slider"`) are spec 05 §11's.
9. **Global reduced motion**: `@media (prefers-reduced-motion: reduce)` zeroes all motion tokens + disables skeleton pulse + disables toast slides (§9); playback frame rate is NOT affected (content, not chrome).
10. **Visible focus rings**: 2px `--accent-focus` outline, 2px offset, on every interactive element including sliders, scrub handles, and menu items — never outline:none without replacement.
11. **Decorative SVGs**: `aria-hidden="true"` + `tabindex=-1`; icons never carry meaning alone (§9 icon conventions).
12. **Minimum label size**: 11px type floor (§9 type scale); anything smaller is a violation, not a style choice.
13. **Skip link**: first focusable element = "Skip to timeline" (bypasses toolbar clusters for keyboard users).
14. **Shift+F10 context menus**: every §4.9 menu opens from keyboard focus in the surface, not just right-click (menu items navigate by arrow keys, Escape closes and restores focus).
15. **Selection live region**: timeline selection changes announce count ("3 clips selected") at most once per settled gesture, `aria-live="polite"`.
16. **Screen-reader test pass**: a Tier-3 spot suite (spec 17 §13A) runs NVDA/VoiceOver smoke assertions (label presence, role correctness, live-region wiring) — automated axe-core + one manual pass per release.

Contrast floors are §9's table; the 4.5:1 body-text and 3:1 non-text minimums are the acceptance bars for the token set.

## 12. Testing (per spec 17 §4 template)

**Performance budget (v1.1 preamble — the budgets are 00-master §6A's; the test hooks are here):** first paint < 1 s and TTI < 3 s on an empty project are asserted by the Tier-3 shell-mount smoke (PerformanceObserver `paint` timings + `performance.now()` at first command dispatch); 60 fps with 50 clips during drag is a Tier-2 frame-time sample (spec 17 §13A.1); the perf-UX implementation list (React.memo on TrackHeader/clip cards, memoized derived selectors, 200 ms search debounce, code-split heavy modals, skeleton states) is advisory technique, not contract — the budgets are the contract.

**Tier 1 (Vitest, no browser)** — none shell-specific: the shell's logic (selector layer, command-constructor helpers, coalescing wrappers) is pure and testable headless; those tests live beside the components.

**Tier 2 (Playwright + headless Chrome)** — the shell's own rendering is DOM (asserted via Tier 3); the viewer canvas pixels are spec 04/07's Tier 2 scope. One addition: a shell-mount smoke test (all §4 panels render with an empty project; no console errors).

**Tier 3 (Playwright, keyboard-first)** — the core shell suite (~60 tests):
- **Contract completeness**: for each §5 row — drive the control (mouse or keyboard), capture the emitted `EngineCommand` from `window.__engine.command.apply`, assert structural equality with the spec 15 §11 Zod schema + expected params (state-WYSIWYG, spec 17 §6.1).
- **Keyboard parity**: for every transport/tool/header control with a spec 16 binding, button-click and shortcut must emit identical commands (§6.4).
- **Preview-commit discipline**: drag a clip, assert no `stateChanged` events during drag, exactly one commit command on release, cancel path emits nothing (§5).
- **Panel toggle routing**: snap/link/zoom toggles change UI store state and never emit commands (spec 16 §0.2 split).
- **Inspector tabs**: per-tab field edits emit the right `update*` command with coalescing (one command per slider release).
- **Deliver page**: `exportFCPXML` button emits the §4.3.74 command and the artifact lands in `CommandResult.data`.
- **A11y floor**: roving tabindex, tablist arrow keys, slider `aria-valuetext` spot checks, **F6 cycling, `aria-activedescendant` grid navigation, Shift+F10 menus, state-row presence per panel, save-chip event pairing (§6.3)** (the spec 17 §13A.2 a11y spot suite; axe-core pass in CI).
- **Context menus**: every §4.9 menu opens via both right-click and Shift+F10; every item emits its mapped command (or (UI) store mutation).
- **Cursor grammar**: the §5A cursor table asserts via computed style on synthetic hover (a spot-check row per class, not all 16 in CI).
- **Sample project (§4.10)**: loads via `loadProject` with the committed fixture; empty-state CTA + cheat-sheet footer both reach it — same fixture as spec 17 §13A.6, never forked.
Mouse-drag tests are reserved for the translation layer itself (hit-testing, thresholds) — everything else asserts through commands, per the UI-interaction-tax rules (spec 17 §2.5 / SKILL.md).

**Review loop — annotakit-for-app charter (Round 15 amendment, N-note):** the mock's n (annotakit) review loop — C/R pin-comment threads on the review surface, digest/export, optional GitHub-issue mirror — is chartered for the APP build (ARCH-R15 §4 impact map + §2.6 punch list; SCOUT-R15-D §8): a **config change** (review-surface wiring + `ANNOTAKIT_GH_TOKEN`), **NOT a port** — the app re-uses the same review infrastructure the 14 mock review rounds rehearsed (the mock is ported at A3 and retires as a repo after A7; the review loop outlives it). Tier-3 tests stay Playwright — the review loop is human-in-the-loop UX review infrastructure, not a test tier.

```bash
# Run Tier 3 shell tests only
npx playwright test tests/ui/shell --project=chromium
# The full three-tier run per module (this module: Tier 3 + shared Tier 1 helpers)
npx playwright test tests/ui/shell && npx vitest run tests/unit/shell-selectors
```

## 13. Code References

| Reference | Path | What it provides |
|---|---|---|
| **UI mockup (visual/layout reference)** | `ui-mock/davinci_resolve_ui_mock.html` (this repo) | Region structure, reference dimensions, panel inventory, icon language, theme values, behavior demos (§2.1) — reference only, not copyable code |
| **cloudcut-nle (UX/app-scope reference — Round 8)** | `github.com/frejogochukwuout/cloudcut-nle` main branch, `src/components/nle/` + `src/hooks/` + `src/lib/` | The UX-surface reference set: `use-timeline-drag.ts` (281 LOC drag machine — the best single file), `nle-constants.ts` (snap constants), `shortcut-registry.ts` (525 LOC priority+condition architecture), `MediaPool.tsx` (grid/list/sort/a11y), `TrackHeader.tsx` (affordances minus recording), `Viewer.tsx` (chrome only), `InspectorPanel.tsx` (selective — field grids/quick-seek good, store-mutation bad), `ExportDialog.tsx` (modal+progress). **Avoid**: stores/bridge (`nle-store.tsx`), mixer/color mock panels, vendored `src/freecut/` — the anti-patterns our Decision 9/10 exist to correct |
| **cloudcut UX-spec (source material)** | `docs/ux-spec/` on branch `ux-spec` (v1.3.5, 28 files) | The v1.1 amendments' source (state rows, context menus, a11y floor, error UX, visual language, perf budgets — SCOUT-R8-C §2 matrix); integrated ours-wins, contradiction register C1-C25 recorded in the scout report |
| OpenCut-classic shell patterns | `apps/web/src/app/` + `components/ui/*` | Panel wiring conventions, shadcn-style primitives, DegradedRendererBanner placement (spec 00 §5) |
| OpenCut-classic timeline (in-shell region) | spec 05 §16 inventory | The timeline-area internals this shell frames |
| FreeCut per-element op UI | spec 05 §18 inventory | Trim/stretch/fade handle components consumed by §5's contracts |
| **nle-engine** | — | **No shell code exists** (engine has no React UI beyond its test harness page) — the shell is greenfield |
| **opencut-timeline** | `src/lib/timeline/controllers/` + `view/` | The interaction-controller + view-math reference for the timeline region's drag/zoom/ruler behavior behind §4.7 (spec 05 §16.5) — components pending its W4 |

> Reconciliation policy: `19-code-references.md` (canon hierarchy; cloudcut-nle = UX/app-scope tier-3 reference like nle-engine is for the engine side).

## 14. Relationship to Other Specs

- **spec 00** — master decisions; this spec instantiates Decision 9's "UI is an `EngineCommand` generator + view renderer" (§6) and the React-19 UI-shell row of the stack.
- **spec 05** — owns everything inside the timeline area; this spec fixes the frame, the 160px header column, and the tool-enum parity.
- **spec 15** — the entire §5 table is a consumer of the 78-type union; the export commands (§4.3.74-76) surface on the Deliver page.
- **spec 16** — shortcuts and shell buttons are two views of one contract; §0.2's UI-extension split is normative here (§6.2).
- **spec 17** — §12's Tier 3 suite; `data-testid` conventions (§10).
- **spec 08** — the Color page hosts its panels (simplified single-column).
- **spec 10 / 11** — the Deliver page hosts FCPXML + cloud-master export UX.
- **spec 09** — the inspector's parameter surface is capped by the project model; `ProjectUIState` persistence (spec 09 §3.1) stores shell prefs (panel visibility, zoom) opaquely and never gates WYSIWYG.
- **spec 19** — canon hierarchy + reference-repo map for this stream (§13).

## 15. Open Questions (for the seal round)

1. **Source preview** (mockup dual-viewer): does v1 need media-asset playback before timeline insert (mark in/out on source)? The v1.1 fallback source-preview mode (§4.3) is the interim — a command-surfaced source monitor remains the v2 question (§8.5).
2. ~~**Context-menu depth**~~ **RESOLVED (v1.1)**: §4.9 enumerates all five menus, every item command-backed; remaining question is only the Rename-media command's final wire shape (spec 15 seal call).
3. **Color page layout**: single-column simplified stack vs Resolve's node-graph-lite; spec 08 §15's port targets decide the floor, this spec decides the arrangement.
4. **Custom h-scrollbar / audio meters / metadata panel**: all deferred (§8.11/8.13/8.8) — confirm the deferral list at seal.
5. **Touch/tablet**: out of scope for v1 (master spec §5 matrix); pointer events chosen so a later pass is possible without contract changes.

---

**End of `18-ui-shell.md`.** Next: `19-code-references.md`.

# 18 — UI Shell: Application Layout, Panels & Interaction Contracts (DaVinci-derived, simplified)

**Stream:** UI shell / application chrome
**Status:** v1.0 (Round 7 — new stream; derived from `ui-mock/davinci_resolve_ui_mock.html`)
**Date:** 2026-09-02
**Spec file:** `18-ui-shell.md`
**Consumers:** Implementation team (UI layer), spec 05 (timeline internals), spec 16 (keyboard bindings), spec 15 (command dispatch), spec 17 (Tier 3 UI tests)

---

## 0. TL;DR

This spec defines the application shell — the layout regions, panel inventory, and interaction contracts of the editor UI. It is derived from the DaVinci Resolve layout clone committed at `ui-mock/davinci_resolve_ui_mock.html`, **deliberately simplified** to match our much smaller scope: the menu bar is removed, the inspector is reduced from 6 tabs to 4, and the 7-page dock collapses to 3 pages (Edit / Color / Deliver). Every panel is a thin `EngineCommand` generator over the spec 15 wire protocol — no panel calls a manager method directly, and no panel holds engine state. The timeline area's internals (component hierarchy, virtualization, drag state machines) are owned by spec 05; this spec owns everything that *surrounds* them.

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

The WebGPU canvas mounts inside `#video-frame`'s `.frame-inner` (letterboxed). Its CSS size drives the render descriptor's output dimensions (spec 04 §7.1 `initialize(canvas…)`); device pixel ratio is respected (canvas backing store = CSS size × DPR, clamped to 2× for 4K-safety). The viewer-toolbar's zoom select offers Fit / 50% / 100% / 200%; zoom changes re-letterbox without changing render resolution except at explicit 100%/200% (which re-render at the backing-store size — spec 04 §16.2 cache rules still apply).

## 4. Panel Inventory

Each panel entry below lists: contents, behaviors, engine bindings, and simplifications vs the mock. **Command names reference spec 15 §4's canonical `EngineCommand` union** (78 types after the Round-7 amendment); where a control is a spec-16 UI-layer extension (`(UI)` in spec 16 §12), it routes to the UI store instead of `apply()` — that split is normative and tested (spec 17 §6.1).

### 4.1 toolbar2 — secondary toolbar (`shell-toolbar`)

Left cluster: `Media Pool` toggle (`btn-mediapool`), `Effects` toggle (`btn-effects`) — both panel-visibility toggles routed to the UI store. The mock's `Index` and `Sound Library` buttons are dropped (§8). Center: project title (read-only; double-click opens project metadata in the Deliver page's project section). Right cluster: `Inspector` toggle (`btn-inspector`, default on), fullscreen-viewer toggle (mock's first icon button). The mock's `Mixer` and `Metadata` buttons are dropped (§8).

### 4.2 MediaPoolPanel (`shell-mediapool`)

The only panel the mockup doesn't draw (it exposes just the toggle) — DaVinci's Edit page slides it over the viewer; we dock it left for stability (rough-cut workflows live in the pool). Contents:

- **Import affordance**: toolbar button + drag-and-drop target + `Cmd+I` (spec 16 §3.1). Import runs the spec 15 §5.4 pre-extraction sequence (`engine.media.probe()` → `persistBlob()` → `generateThumbnail()` → `importMedia` command) — the panel drives the helpers, then issues the pure command.
- **Clip grid/list**: one card per `MediaAsset` (spec 09 §7): thumbnail, name, duration (TC format, spec 03 §4), type badge (V/A), resolution, fps badge when ≠ project fps. List/grid toggle is a UI-store pref.
- **Selection & drag**: single-select (click), multi-select (shift/cmd-click). Drag a clip onto a track lane → `insertElement` with `PlacementStrategy` resolved by drop position (spec 06 §5.9 / spec 05 §8.9). Drag ghost = thumbnail + name.
- **Double-click**: selects and scrolls the timeline to the first element using that asset (reveal); source-preview playback is deferred (§8.5).
- **Context menu**: Reveal in timeline, Rename (`renameMediaAsset` if spec 15 defines it; else asset metadata edit via `updateElements`-class command — final call at seal round), Remove (`removeMediaAsset`), Properties (opens inspector's read-only file info section).

### 4.3 ViewerPanel (`shell-viewer`)

- **viewer-toolbar** (28px): zoom select (§3.3), current TC chip (`#viewer-tc-current`, mono font), project fps chip, safe-area toggle (UI pref; overlays are DOM, not GPU — spec 04 §16.5 note).
- **video-frame**: the WebGPU canvas (spec 04). Letterboxed; degraded-renderer banner (spec 00 §5) renders as a DOM strip under the canvas, not inside it.
- **scrub-row**: playhead scrubber. Input: pointer down + move (throttled to rAF) → `seek` commands (coalesced per spec 05 §8.2's preview-commit pattern); release commits final `seek`. Keyboard: ←/→ nudge one frame (spec 16 §3.5).
- **transport-row** (32px): center cluster = step-back, play/pause (`btn-play` → `play`/`pause`), step-fwd, jump-start, jump-end; right cluster = loop (`btn-loop` → `setLoop`), mark-in `I`, mark-out `O` (→ `setLoop` start/end halves — no dedicated in/out-point commands, spec 16 §3.4 note; spec 03 §3.4 is the playback-side consumer), add-marker `M` (→ `addMarker` + color from a compact palette). Keyboard parity is total (spec 16 §3.4-3.7) — the buttons exist for discoverability, the shortcuts for speed; both must dispatch identical commands (state-WYSIWYG test, spec 17 §6.1).

### 4.4 InspectorPanel (`shell-inspector`)

Mock has 6 tabs (video/audio/effects/transition/image/file); we ship **4**:

| Tab | Visible when | Contents (all model-backed, spec 09 ceiling) |
|---|---|---|
| **Video** | video/comp element selected | Transform: position X/Y, scale %, rotation°, opacity %, flip H/V (→ transform-resolver fields, spec 07 §5.4); Speed: rate % + preserve-pitch toggle (→ retime family, spec 06 §5.11) |
| **Audio** | audio-bearing element selected | Gain dB, pan, fade-in/fade-out seconds (→ spec 03 §9 / spec 09 audio fields) |
| **Effects** | any element selected | Effect list (add/remove/reorder/toggle + param editors) → `addEffect`/`updateEffect`/`removeEffect`/`reorderEffect`/`toggleEffect` (spec 15 §4.3.52-56) |
| **Transition** | transition selected (or boundary focus) | Presentation picker (27 registry entries, spec 07 §6.3), duration, alignment (→ `updateTransition`, spec 15 §4.3.62) |

Inspector edits are **commit-on-release** (slider drag) / **commit-on-enter** (numeric field) with live preview via the same preview-commit coalescing as timeline drags (spec 06 §4.6). Multi-selection shows the common-parameter subset with "mixed" indicators. Nothing selected → "Nothing to inspect" (mock's default text). The mock's `image` and `file` tabs are dropped (§8.6-8.7).

### 4.5 timeline-toolbar (`shell-timeline-toolbar`)

Tool cluster (radio group; mirrors spec 15's tool enum exactly — spec 16 §3.2 bindings in parens): Select (A), Blade (B), Roll (T), Ripple (R), Slip (,'), Slide (S), Rate-stretch (→ `selectTool` command; the mock's `dyntrim` is dropped, §8.9). Toggle cluster: Snapping magnet (`btn-magnet`, N — **UI-store**, spec 16 §0.2), Link A/V (`btn-linklock` — UI-store), Lock all tracks (`btn-track-lock` → per-track `toggleTrackLock` fan-out, undoable as a batch, spec 15 §7). Marker cluster: add-marker button + color presets. Zoom cluster: zoom-to-fit, zoom-to-selection, slider (UI-store viewport state, spec 05 §5). Master audio: mute + volume slider (→ master bus gain, spec 03 §9's audio graph). The mock's sync-bin/auto-sync buttons are dropped (§8.10).

### 4.6 timeline-tabs (`shell-timeline-tabs`) — scene tabs

The mock's timeline tabs map to our **scenes** (spec 09 §6: multi-scene projects): one tab per scene (active = `getActiveScene`), `+` → `createScene`, close → `deleteScene` (confirm). Tab labels carry modified/dirty dot (project-save state, spec 09 §6 autosave). Playback and editing always target the active scene; `switchToScene` is the only cross-scene mutation.

### 4.7 timeline-area (`shell-timeline`) & track-headers (`shell-track-headers`)

The region's internals belong to spec 05 (component hierarchy §4, zoom/scroll §5, virtualization §6, clip rendering §7, interactions §8, track headers §10). The shell fixes: the 160px header column (big TC readout in `#track-headers` mirrors the viewer TC; per-track M/S/lock/visibility buttons → `toggleTrackMute`/`toggleTrackSolo`/`toggleTrackLock`/`toggleTrackVisibility` commands; the mock's per-track waveform/clip-view toggle is a UI pref), and the scroll container's native scrollbars (the mock's custom 14px `#hscrollbar-row` is deferred, §8.11). The playhead line + head render per spec 05 §11.

### 4.8 app-dock (`shell-dock`)

Left: brand mark + app name. Center: page dock — **three pages, not seven**: `Edit` (default; the whole shell above), `Color` (grading workspace: spec 08's panels — wheels, curves, LUT, qualifier, power window, scopes — in a simplified single-column layout; enters a color-focus mode that swaps the inspector for the grading panel stack while the timeline stays live), `Deliver` (export: FCPXML via `exportFCPXML` command (spec 15 §4.3.74), optional cloud master via `exportMaster` (§4.3.75), render settings, progress list). Right cluster: keyboard cheat-sheet (spec 16 §7.3's modal, opened via `?`), settings (deferred, §8.12). Dropped pages: Media, Cut, Fusion, Fairlight (§8.2-8.4).

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
| Step ±1 frame | — | `seek` ±1 frame | spec 16 §3.5 parity |
| Loop toggle | — | `setLoop { start, end }` | |
| Mark in / out (I / O) | region shading | `setLoop` start/end (spec 16 §3.4 note) | spec 03 §3.4 |
| Add marker (M) | pin | `addMarker` | color from palette |
| Track header M / S / lock / eye | immediate | `toggleTrackMute` / `toggleTrackSolo` / `toggleTrackLock` / `toggleTrackVisibility` | |
| Tool buttons (A/B/T/R/S/…) | cursor change | `selectTool` | spec 15 tool enum |
| Scene tab select / + / close | — | `switchToScene` / `createScene` / `deleteScene` | §4.6 |
| Undo / redo (toolbar + Z / Y) | — | `undo` / `redo` | |
| Deliver: Export FCPXML | progress toast | `exportFCPXML { format, bundleMedia }` | artifact via `CommandResult.data` (spec 15 §14.11) |
| Deliver: Export master | job row | `exportMaster { format, destination, range }` | progress via `renderProgress` events |
| Deliver: Export frame | — | `exportFrame { format, time }` | |
| Snap magnet, link toggle, zoom, panel toggles, tab focus | local only | **(UI)** — UI store, spec 16 §0.2 | never `apply()` |

**Live-drag semantics (normative).** During drags the shell renders optimistic preview state locally (DOM transforms only — never mutates engine state), then commits one command (or one coalesced batch) on release. Escape during drag cancels the preview and issues nothing. This is spec 05 §8 / spec 06 §4.6's pattern, promoted to a shell-wide rule: **the engine never sees intermediate drag states.**

## 6. State Binding & Sync

1. **The shell holds zero engine state.** All engine-derived data (tracks, elements, selections, playhead, scene list, media) comes from `SceneState` snapshots + the `EngineEvent` stream (spec 15 §9). Panels subscribe through a thin selector layer that computes view models (e.g., clip layout = `timeToPx` × snapshot, spec 05 §5.3).
2. **The UI store (Zustand) holds only view state**: panel visibility, tool (mirrored), snap on/off, link on/off, zoom/scroll, inspector tab, theme. This is exactly spec 16 §0.2's UI-layer-extension surface — the same store, the same setters, so shortcuts and shell buttons drive one state.
3. **Event → re-render mapping**: `stateChanged` → full snapshot refresh (rAF-batched); `timeupdate`/`playbackState` → transport + playhead only (no snapshot refetch); `renderProgress`/`exportArtifactReady` → Deliver page + toasts. `commandApplied` events keep multi-consumer sync (cloud mirroring) free.
4. **WYSIWYG obligations** (spec 17 §6.1, CI-blocking): every §5 row must produce a structurally-identical `EngineCommand` whether driven by mouse, keyboard, or programmatic test — the shell's buttons are shortcuts with icons.

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

## 10. `data-testid` Conventions (spec 17 Tier 3 contract)

- Panel roots: `shell-<panel>` → `shell-toolbar`, `shell-mediapool`, `shell-viewer`, `shell-inspector`, `shell-timeline-toolbar`, `shell-timeline-tabs`, `shell-track-headers`, `shell-timeline`, `shell-dock`, `shell-color`, `shell-deliver`.
- Controls: `shell-<panel>-<control>` → `shell-viewer-btn-play`, `shell-viewer-scrub`, `shell-timeline-toolbar-btn-snap`, `shell-timeline-toolbar-tool-blade`, `shell-inspector-tab-video`, `shell-track-3-btn-mute`, `shell-scene-tab-2`, `shell-deliver-btn-export-fcpxml`.
- Elements inside the timeline follow **spec 05's** existing conventions (05 §8.x) — this spec adds only the shell frame around them.
- Mock ids (`btn-play`, `btn-magnet`, …) are documented aliases in §4 for traceability; tests target `data-testid`, never raw ids.

## 11. Accessibility

1. **Keyboard completeness**: every §5 contract has a spec 16 binding or is reachable via Tab/Enter; the toolbar is a `toolbar` role with roving tabindex; tool radio group uses arrow-key navigation.
2. **Focus management**: panel toggles move focus into the revealed panel; dialog close restores focus to opener; timeline drag interactions are pointer-only by nature but every commit has a keyboard route (trim via numeric inspector fields, move via frame-step + nudge commands per spec 16).
3. **Roles**: `application` landmark on the shell; `tablist`/`tab` for inspector tabs and scene tabs; `slider` for scrub/zoom/volume (with `aria-valuetext` in TC format); `grid` semantics inside the timeline are spec 05 §11's concern.
4. **Announcements**: minimal live region for command errors (`CommandResult.error.code` + human message), render-job progress, and autosave state.

## 12. Testing (per spec 17 §4 template)

**Tier 1 (Vitest, no browser)** — none shell-specific: the shell's logic (selector layer, command-constructor helpers, coalescing wrappers) is pure and testable headless; those tests live beside the components.

**Tier 2 (Playwright + headless Chrome)** — the shell's own rendering is DOM (asserted via Tier 3); the viewer canvas pixels are spec 04/07's Tier 2 scope. One addition: a shell-mount smoke test (all §4 panels render with an empty project; no console errors).

**Tier 3 (Playwright, keyboard-first)** — the core shell suite (~60 tests):
- **Contract completeness**: for each §5 row — drive the control (mouse or keyboard), capture the emitted `EngineCommand` from `window.__engine.command.apply`, assert structural equality with the spec 15 §11 Zod schema + expected params (state-WYSIWYG, spec 17 §6.1).
- **Keyboard parity**: for every transport/tool/header control with a spec 16 binding, button-click and shortcut must emit identical commands (§6.4).
- **Preview-commit discipline**: drag a clip, assert no `stateChanged` events during drag, exactly one commit command on release, cancel path emits nothing (§5).
- **Panel toggle routing**: snap/link/zoom toggles change UI store state and never emit commands (spec 16 §0.2 split).
- **Inspector tabs**: per-tab field edits emit the right `update*` command with coalescing (one command per slider release).
- **Deliver page**: `exportFCPXML` button emits the §4.3.74 command and the artifact lands in `CommandResult.data`.
- **A11y floor**: roving tabindex, tablist arrow keys, slider `aria-valuetext` spot checks.
Mouse-drag tests are reserved for the translation layer itself (hit-testing, thresholds) — everything else asserts through commands, per the UI-interaction-tax rules (spec 17 §13.2 / SKILL.md).

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
| OpenCut-classic shell patterns | `apps/web/src/app/` + `components/ui/*` | Panel wiring conventions, shadcn-style primitives, DegradedRendererBanner placement (spec 00 §5) |
| OpenCut-classic timeline (in-shell region) | spec 05 §16 inventory | The timeline-area internals this shell frames |
| FreeCut per-element op UI | spec 05 §18 inventory | Trim/stretch/fade handle components consumed by §5's contracts |
| **nle-engine** | — | **No shell code exists** (engine has no React UI beyond its test harness page) — the shell is greenfield; see `19-code-references.md` for the engine's absence map and the forthcoming timeline-distill reference for the timeline region |

> The forthcoming **timeline-distill** repo (OpenCut-classic timeline, minus NLE core) is the code reference for the timeline-area region (§4.7); this spec's other panels have no code reference beyond the mockup and the OpenCut-classic conventions above. Reconciliation policy: `19-code-references.md`.

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

1. **Source preview** (mockup dual-viewer): does v1 need media-asset playback before timeline insert (mark in/out on source)? Requires a source-playback surface in the command layer or a UI-local player — decide at seal round (§8.5).
2. **Context-menu depth**: full context menus on clips/tracks/pool items are implied but not enumerated — enumerate at implementation time, keep every item command-backed.
3. **Color page layout**: single-column simplified stack vs Resolve's node-graph-lite; spec 08 §15's port targets decide the floor, this spec decides the arrangement.
4. **Custom h-scrollbar / audio meters / metadata panel**: all deferred (§8.11/8.13/8.8) — confirm the deferral list at seal.
5. **Touch/tablet**: out of scope for v1 (master spec §5 matrix); pointer events chosen so a later pass is possible without contract changes.

---

**End of `18-ui-shell.md`.** Next: `19-code-references.md`.

# SCOUT R15-D — the ui-mock (`ui-mock/shell-variants`) as a de-risk asset

Task: R15-S4 (scout, read-only). Scope: evolve-in-place vs greenfield facts + final-app assembly plan input.
Repo: `nle-core-spec` @ `d42693e` (HEAD, == PR #1 head, clean tree). Mock: `ui-mock/shell-variants`.
Everything below verified against code at HEAD; **test suite and typecheck were actually executed** in this scout (`npm ci` → `npx tsc --noEmit` → `npx vitest run`).

---

## 1. Inventory (exact, verified at HEAD)

**Counts**

| Item | Value | Evidence |
|---|---|---|
| Component implementation files (non-test) | **27** (+ `App.tsx`, `main.tsx`) | shell 12, timeline 6, mixer 5, pages 2, debug 2 — `src/components/**` |
| Test files | **34** (not 33 — README is stale) | `npx vitest run`: `Test Files 34 passed (34)` |
| Tests | **596, all green** (verified live: `Tests 596 passed (596)`, 218.9s) | `vitest run` output |
| `tsc --noEmit` | **clean** (exit 0) | run in this scout |
| Stories | **71** across 10 story files (+`decorators.tsx`) | `rg 'export const' src/stories/*.stories.tsx` = 71; README:82 |
| Context menus | 5/5 of spec 18 §4.9 | `Clip.tsx:438` ('clip'), `Ruler.tsx:188` ('ruler'), `TrackHeader.test.tsx:106` ('track'), `MediaPool.tsx:63` ('mediapool'), `Timeline.tsx:251` ('timeline-empty') |
| Shortcuts ledger rows | **54** | `shortcutMap.ts:19-86` (`rg -c 'action:'` = 54) |
| Unique `data-testid` base names | **98** (64 `shell-*` incl. template bases + 54 rendered `shortcut-*` rows + leaf ids) | grep incl. template literals |

**LOC by area**

| Area | Impl LOC | incl. tests |
|---|---|---|
| `src/components` | 7,171 (27 files; largest: Inspector 1,021, MediaPool 707, Clip 563, Timeline 442, Viewer 424) | 11,522 |
| `src/state` | 942 (`useUiStore.ts` 836, `mockMixer.ts` 87, `variantHooks.ts` 19) | 2,136 |
| `src/hooks` | 387 (`useShortcuts.ts`) | 917 |
| `src/lib` | 609 (`mockData` 268, `variants` 108, `timecode` 75, `waveform` 52, `shortcutMap` 86) | 1,220 |
| `src/stories` | — | 1,649 |
| `src/test` infra | — | 144 |
| **src total** | **~8,900 impl** | **17,630** |
| vendor `storybook-annotakit` | 14 src files (manager/preview/server/shared) + `preset.js`, `tsup.config.ts` | — |

Largest test files: `useUiStore.test.ts` 117, `useShortcuts.test.tsx` 50, `AppShell.test.tsx` 31, `mockData.test.ts` 27. **`ContextMenu.tsx` (212 LOC) has NO dedicated test file** (covered via MediaPool/TrackHeader/Timeline/Clip tests) — the only untested component module.

**Stack (`package.json:21-46`)**: deps = `react@^19.2.8`, `react-dom@^19.2.8`, `zustand@^5.0.15`, `clsx`, `lucide-react@^1.39`. devDeps = `storybook@^10.6` + `@storybook/react-vite`/`addon-a11y`/`addon-docs` 10.6, `storybook-annotakit` (file: vendor), `tailwindcss@^4.3.3` + `@tailwindcss/vite`, `vite@^8.2.2`, `vitest@^5.0.0`, `typescript@^7.0.2`, `@testing-library/react@^16` + `jest-dom@^7` + `user-event@^14`, `jsdom@^30`. Exactly the 00-master §4 stack row (README:8-10). Scripts: `typecheck`, `test`, `test:watch`, `test:ui`, `storybook`, `build-storybook`, `vendor:build` (pre-hooks rebuild the vendored addon, `package.json:12-14`).

`vitest.config.ts:14-22`: jsdom, `src/**/*.{test,spec}.{ts,tsx}`, file-level isolation, `pool: 'forks'`, 15s timeout; `setup.ts` polyfills ResizeObserver/IntersectionObserver/matchMedia/scrollIntoView/rAF/pointer-capture and enforces per-test store re-hydration (README:39-50). No CI workflow — the suite is the per-round local gate (README:50).

---

## 2. The store contract (`src/state/useUiStore.ts`, 836 LOC)

**One Zustand store = view state + mock doc slice.** Header comment is explicit: "spec 18 §6.2: view state only … + the mock document slice … In the real shell the doc comes from SceneState snapshots + EngineEvents" (`useUiStore.ts:1-8`).

**Domains covered** (state fields `useUiStore.ts:48-97`):

- **Page/scene**: `page` (4 pages incl. mock-only 'audio'), `activeSceneId`, scenes CRUD (`createScene:289`, `deleteScene:306`).
- **Tools**: `tool: ToolId` — 7 tools `select|blade|roll|ripple|slip|slide|stretch` (`useUiStore.ts:15`).
- **Transport/JKL**: `playhead`, `playing`, `playRate` (0/±1/±2/±4, `:57`), `loopEnabled`, `loop {start,end}`; JKL multi-tap accel lives in the hook (`useShortcuts.ts:48-67`).
- **Selection**: clip `selection: string[]` with A/V linked-pair propagation gated by `link` (`selectElement:374-393`), track-scope select (`:394`), neighbor walk (`:402`), media-pool `mediaSelection` + `mediaDrag` ghost (`:79-80`), `focusedTrackId` + `moveFocusedTrack` (`:81,:438`).
- **Panels/geometry**: `panels {mediaPool, effects, inspector}`, `mediaW/inspectorW/mainBodyH` with §3.2 clamps (`:422-424`), `trackHeightPref` (global, B3/C25, `:97`).
- **Viewer prefs**: `viewerOverlays`, `viewerSafeGuides` (`:61-62`).
- **Media pool**: `mediaView`, `search`, `sortBy/sortDir` (`:67-70`).
- **Mixer (G-slice sidecar)**: `mixer: MockMixerScene`, `mixerState` (collapsed/bridge/full), `audioLaneBoost`, `stripFocus`, `stripFlash` (`:87-92`); setMixerTrack/setAuxBus/setDucking (`:503-517`).
- **Toasts**: `toasts` + push/dismiss with max-3 **drop** (registered deviation from §6.4 icon-row, `useUiStore.ts:448-452`).
- **Save simulation**: `saveAttempt`, `simulateSaveFail`, `retrySave`, `saveNow` (`:455-457`) — drives the StatusStrip chip's §6.3 states.
- **Undo/redo**: `past/future` (`:85-86`).
- **Master audio**: `masterMuted`, `masterVolume` (`:72-73`).
- Snap/link/lockAll view flags (`:52-54`); inspector tab (`:71`); cheatOpen (`:77`).

**Undo implementation — snapshot, 50-deep**: `withHistory` deep-clones the scenes slice before each doc mutation (`clone` clones nested effects/params/transitionOut — `useUiStore.ts:28-38`), pushes `{scenes, activeSceneId, lockAll, selection}` onto `past`, clears `future`; no-op mutations return `undefined` → **no history entry** (`:201-211`, the R13 no-pollution contract). `HISTORY = 50` (`:200`). `undo/redo` swap snapshots and restore `lockAll`/`selection` alongside the doc (`:519-542`). This is a *full-document snapshot* undo — a mock-only strategy; the real shell's undo is the engine's op-log (`undo`/`redo` EngineCommands, spec 15 §4.3, spec 18 §5 table) and the UI only mirrors command success.

**Doc mutations that would become EngineCommands** (the real-shell build list): `moveElement`, `trimElement`, `splitElement`, `deleteElements(ripple)`, `duplicateElements`, `slipNudge`, `trimToPlayhead`, `setElementField`, `setTransition`, `setEffectParam`, `addEffectToElement`, `removeEffect`, `toggleEffect`, `addTrack`, `addMarker`, `removeMarkersAt`, `toggleTrackCmd`, `createScene`, `deleteScene`, `loadSampleProject` (`useUiStore.ts:544-819`). All carry the locked-track-inert law (`:545-548`) and `MIN_DUR = 0.25` unified (`:189`).

**Mock-only vs transferable** (for D16 assembly):
- **Transferable near-verbatim**: every *view-state* field and setter above (spec 18 §6.2's own list — panel visibility, tool mirror, snap/link, zoom, inspector tab, search/sort, trackHeightPref, toasts, JKL rates), plus the geometry clamps and the a11y-hardened action shapes (pair-selection, marker palette, mute-all convergence `:328-339`).
- **Discard/re-home**: the doc slice (→ `SceneState` snapshots + `EngineEvent` stream), snapshot undo (→ engine op-log), `mixer` sidecar (→ project data via audio commands, `mockMixer.ts:1-7` says exactly this), `playRate` transport (→ engine playback), save-sim (→ spec 09 §6.1 autosave events), `masterVolume` (→ master bus gain). Mock-only honesty flags are all in-code commented, not hidden.

`mockMixer.ts` (87 LOC): `MixerTrackSettings {fader dB, pan, 2 inserts, auxA/auxB, auxPreFader, outputBus 0|1|2}` + `AuxBusSettings` pair {a1,a2} + `DuckingSettings` + `roles` map (`mockMixer.ts:11-39`) — mirrors spec 20 §4.2's shape with the registered simplifications N14/C26.

---

## 3. Mock data model vs spec 09 §3.1 — delta census

`mockData.ts` header claims field-name parity ("field names follow spec 09 §3.1", `mockData.ts:1-4`). The registered deltas are N1/A2/B1/B2/N3/C29 (`.agents/SPEC-REVISION-CANDIDATES.md:172-178, 33-41, 81-93, 187-191, 292`). Full census, mock shape → spec shape:

**Known/registered** (each with file:line):
1. **N1 elements inlined**: `TrackJSON.elements: ElementJSON[]` (`mockData.ts:79`) vs 09 `TrackJSON.elements: string[]` + no record container (`09-project-model.md:109`). The 05-direction wins in the mock.
2. **A2 markers per-scene**: `SceneJSON.markers` (`mockData.ts:94`, seeded `:186-191`) vs 09's project-level `markers` + per-scene `bookmarks` (`09-project-model.md:55-56, 92, 233-244`).
3. **B1 linkedTo**: `ElementJSON.linkedTo?` (`mockData.ts:66`) — absent from 09; invented for 05 §12.3.
4. **B2 pan/preservePitch**: absent from both mock ElementJSON and 09 (inspector keeps gain-dB/pan component-local, `SPEC-REVISION-CANDIDATES.md:88-92, 160-161`).
5. **N3 importedAt/size-as-display-string**: `MediaRecord.size: '1.8 GB'`, `importedAt: '2026-08-28'` (`mockData.ts:14,19`) vs 09 `size: number` (bytes), no `importedAt` (`09-project-model.md:208`).
6. **C29 flat tracks, no isMain**: `SceneJSON.tracks: TrackJSON[]` with `kind: 'overlay'|'main'|'audio'` (`mockData.ts:8, 69-80`) vs 09's `SceneTracksJSON {overlay[], main: ONE, audio[]}` + `isMain` (`09-project-model.md:91-99`).

**NEW deltas found this scout (not in the N/C registers):**
7. **Times are float seconds, not MediaTime frames**: every field is `number` seconds (`mockData.ts:54-55`) with `snapToFrame` at hardcoded `FPS = 24` (`timecode.ts:3, 32-34`); 09 §3.2 types `MediaTime` as a branded frame-count number and `FrameRate` as `{numerator,denominator}` (`09-project-model.md:282-293`). The mock even carries a 30fps asset (`m-05`, `mockData.ts:120`) while all TC math is 24fps — the fps-mismatch display rule (spec 18 §4.2 "fps badge when ≠ project fps") is only partially exercised. **Recommend registering this** (serialization-class, P2: the real shell must convert at the store boundary).
8. **ProjectJSON header fields absent**: no `schemaVersion`, `currentSceneId`, `metadata.id/createdAt/updatedAt/duration`; `metadata` is `{name, status}` (`mockData.ts:106`) vs 09's full ProjectMetadata (`09-project-model.md:46-69`); settings lack `canvasSize` object/`backgroundColor`/`displayMode` (`mockData.ts:107` vs `09-project-model.md:71-78`). Mock adds project-level `loop` (`mockData.ts:110`) — a view-state leak into the project record (real home: setLoop command state).
9. **ElementJSON missing spec fields wholesale**: no `transform` (TransformJSON), no `masks`, no `transitionIn` (mock has `transitionOut?` only, `mockData.ts:65`), no per-element `muted`/`visible`/`color`; `speed`, `opacity`, `volume`, `audioFadeIn/Out`, `sourceStart/sourceDuration` are optional in the mock (`mockData.ts:56-63`) vs required in 09 (`09-project-model.md:127-142`). No `shape`/`adjustment` element types (`mockData.ts:7` vs `09-project-model.md:120`). **No keyframes anywhere** (mock has no KeyframeTrackJSON — spec 16 §3.12 surface entirely absent).
10. **EffectJSON shape drift**: mock `{id, name, enabled, params?: Record<string,number>}` (`mockData.ts:42-47`) vs 09 `{id, type, enabled, params: Record<string, number|number[]|string|boolean>, keyframes?}` (`09-project-model.md:172-178`) — `name` vs `type`, params poorer, optional.
11. **TransitionJSON drift**: mock hangs `{type, presentation, duration, alignment}` on the *element* (`mockData.ts:35-40, 65`); 09 types transitions as standalone records with `id`, `timing`, `leftElementId`/`rightElementId` (`09-project-model.md:193-202`), and presentation as registry keys vs the mock's 27 display-name strings (the display-name half IS registered in C29).
12. **MediaRecord missing `colorInfo` + `storage`** (registered in C29) **and `thumbnail` is a path string vs 09's `thumbnailId` + `MediaStorageRef`** (`mockData.ts:20` vs `09-project-model.md:213-231`); mock adds `offline?` (`:21`) — spec 18 §4.2 needs it, 09 doesn't have it (unregistered field-invention, same class as N3).
13. **TrackJSON adds `badge` + `waveform`** (`mockData.ts:73,78`) and drops `volume` (that's registered A3 — track gain double home).

None of these are silent: `mockData.ts:1-4` declares the intent, and C29 registers "shape deltas beyond N1/N3" — but items 7-12 above are *beyond C29's enumerated list*, worth folding into the seal-round amendment for 09 §3.1 (the N7-class census is already the plan; just widen it).

---

## 4. Component inventory vs spec 18 regions

**Present (region → component, file:line)**:

| Spec 18 region | Mock component | Status |
|---|---|---|
| §3.1 toolbar2 | `Toolbar2.tsx` (118 LOC, `shell-toolbar`, role=toolbar + roving tabindex `:15-47`) | ✅ + mock-extra fullscreen toast stub (`:105-115`) |
| §4.2 MediaPool | `MediaPool.tsx` (707 LOC — search/sort/grid-list/drag-to-lane/multi-select/offline/state rows/context menu) | ✅ richest panel |
| §4.3 Viewer | `Viewer.tsx` (424 LOC — TC chips, overlays, safe guides, scrub richness, transport, state rows `:201-220`) | ✅ chrome-complete; canvas is a CSS/`<img>` stand-in (`Viewer.tsx:6`) — **no WebGPU, no `<video>` source preview** |
| §4.4 Inspector | `Inspector.tsx` (1,021 LOC — 4 tabs with hidden-when-inapplicable `:746-751`, `shell-inspector-tab-*` `:815`, TC parser fields, commit semantics, mixed-value chip) | ✅ model-wired for the mock's fields |
| §4.5 timeline-toolbar | `TimelineToolbar.tsx` (336 LOC — tool radiogroup, snap, link, lock-all, markers+color, zoom cluster, master mute/vol) | ✅ |
| §4.6 timeline-tabs | `SceneTabs.tsx` (112 LOC, dirty dots, aria-controls) | ✅ |
| §4.7 timeline + headers | `Timeline.tsx` (442) + `Clip.tsx` (563) + `Ruler.tsx` (321) + `TrackHeader.tsx` (197) + `TimelineToolbar` | ✅ DOM lanes, drag/trim/blade/marquee/snap, wheel grammar partial (C10, `Timeline.tsx:5-6, 172-200`) |
| §4.8 app-dock | `AppDock.tsx` (89 LOC) — **4 pages not 3**: Edit/Color/Deliver + mock-invented **Audio** (⌘4, DESIGN-audio-mode.md; README:147-151 registers the ⌘3 drift) | ✅+delta |
| §4.9 context menus ×5 | `ContextMenu.tsx` (212 LOC primitive) + all five call sites (§1) | ✅ incl. Shift+F10 + focus restore |
| §6.3 status strip | `StatusStrip.tsx` (103 LOC, `shell-status-save`, Saving→Saved→failed/retry) | ✅ (mock save cycle) |
| §6.4 toasts/dialogs/boundary | `ToastRegion.tsx` (71), `ConfirmDialog.tsx` (127, ConfirmProvider), `ErrorBoundary.tsx` (84, copy-diagnostics) + beforeunload (`AppShell.tsx:174-187`) | ✅ |
| Color page | `ColorPage.tsx` (163) | ⚠️ static grading stack — display state + toasts (`ColorPage.tsx:59,134`) |
| Deliver page | `DeliverPage.tsx` (230) | ⚠️ mock queue, presets wired to local state; export buttons = toasts (`:64,209,218`) |
| Effects panel | `EffectsPanel` in `AppShell.tsx:50-94` (220px rail, `shell-effects`, drag-to-clip DnD contract `:43-48`) | ⚠️ **mock-invented — spec 18 §4 has NO effects-panel entry** (N9, `SPEC-REVISION-CANDIDATES.md:227-232`) |
| Mixer dock / audio | `MixerDock.tsx` (168), `ChannelStrip.tsx` (232), `MixerPrimitives.tsx` (183: Fader/PanKnob/StripMeter), `ChannelEditor.tsx` (217), `SoundLibrary.tsx` (196) | ⚠️ **mock-invented surface** (DESIGN-audio-mode.md, spec 20 §12.2 "mock answer") — NOT in spec 18's v1 inventory (Fairlight removed §8.4) |
| Cheat sheet | `CheatSheet.tsx` (169, renders SHORTCUT_MAP verbatim + sample-project footer `:2-13`) | ✅ spec 16 §7.3 |
| Debug/variants | `VariantProvider.tsx` + `DebugOverlay.tsx` (261) | mock-only tooling (see §7) |
| Window-too-small | `App.tsx` TooSmall overlay | ✅ §3.2 |

**Missing entirely (real-shell build list)**: settings page/panel (deferred §8.12 — AppDock button is aria-disabled + tip, `AppDock.tsx:80-84`); fullscreen viewer (toast stub §8.5, `Toolbar2.tsx:112`); source viewer/dual viewer (toast stub, `Clip.tsx:232`); keyframe panel (spec 16 §3.12 — nothing); audio meters panel (§8.13 deferred; mock's StripMeters live only in the mixer dock); i18n locale module (C12); light theme is a *variant study* not a product surface (§8.14 rejection held). The WebGPU canvas, worker filmstrip/waveform assets (mock: static JPGs `public/media/` + seeded `waveform.ts`), and the entire engine event wiring are engine-boundary work, absent by design (README:152).

---

## 5. Interaction coverage

**Keymap**: the ledger is `shortcutMap.ts` (the cheat sheet renders it verbatim and asserts completeness via `shortcut-${action}` testids, `shortcutMap.ts:1-5`): **54 rows** ≈ **70+ distinct chords** (rows like '⌘1 / ⌘2 / ⌘3' and '← / → (⇧ ×10)' pack multiple bindings). Spec 16 §3.1–§3.13 inventories **178 binding rows** (32+10+14+27+13+10+7+18+12+5+9+16+5 by section count). So the mock implements **~30% of the full spec-16 inventory** — but of the *edit-shell core* (§3.1–§3.11 minus the keyframe panel's 16 rows, minus the explicitly-scoped-out long tail) it is the large majority: C22 self-registers "42→~60 bindings implemented; remainder deliberately scoped out (S/Q/W long tail, ⌘L family, ⌥M dialogs, ⌥1-4, F1…)" (`SPEC-REVISION-CANDIDATES.md:285`). Every implemented row is behavioral in `useShortcuts.ts:28-387` (single window listener, §8.5 text-guard, JKL 500ms accel `:14,:48-67`, ⌥-combos via `e.code` for Mac layouts `:314-345`, multi-delete ≥5 routes through the confirm dialog `:139-153`).

**Pointer grammar (spec 18 §5A)**: implemented — clip move-drag with 10px snap tolerance, 12px trim handles, blade split, marquee rubber-band in content coords with Esc cancel (`Timeline.tsx:56-121`), media drag-to-lane ghost + lane highlight, Alt-drag-duplicate, dbl-click resets (splitters `AppShell.tsx:108`; faders `mockMixer.ts` dbl-click), Shift-axis-constrain adopted where meaningful, cursor vocabulary via Tailwind classes. **Partially implemented**: wheel grammar — ⌘/Ctrl+wheel zoom-to-cursor and ⇧+wheel fast pan ARE native-listener real (`Timeline.tsx:172-200`), but plain wheel = native vertical scroll where spec 18 §5A wants horizontal, and Alt+wheel track-scroll is absent (C10, `SPEC-REVISION-CANDIDATES.md:273`). The 16-row cursor table is style-implemented but not systematically asserted (no `data-cursor` contract).

**§5 interaction-contract table**: the *gestures* all exist; the *commands* don't — every row in the mock resolves to a store mutation, never an `EngineCommand` capture. The WYSIWYG/preview-commit split (optimistic DOM, one coalesced commit on release, Esc emits nothing — spec 18 §5 "live-drag semantics") is implemented **in spirit** (store no-op contracts, one-history-entry-per-gesture laws like duplicate-at `useUiStore.ts:645-666`) but not in the spec's architecture (no command stream, no coalescer).

**Documented NOT-implemented set (C-series)**: C1-C9 (R13, `SPEC-REVISION-CANDIDATES.md:119-127`) + C10-C28 (R14, `:273-291`) + C29 (`:292`). Highlights: C19 clipboard family unimplemented (menu rows honest-disabled), C20 K-then-J/L ½× slow-mo, C21 no marker submenu primitive, C23 tool set = 18's 7 (no hand/zoom), C25 global height pref, C28 zoom ladder 8–240 px/s vs 05's 5–5,000. Plus §E.4's "fixed-not-registered" list (`:294-308`) — 35+ items R14 closed with tests, useful as the real-shell's regression-checklist seed.

---

## 6. The testids

Grep census: **64 unique `shell-*` base patterns** (incl. template bases like `shell-menu-`, `shell-scene-tab-`, `shell-track-<badge>-btn-`, `shell-effects-row-`), **54 rendered `shortcut-*` rows**, ~30 leaf ids (timeline-marquee, mixer-*, cheatsheet-*, probe-*…), **98 unique base names, 87 literal `data-testid` attributes**.

**vs spec 18 §10's inventory** (`18-ui-shell.md:377-383`): all **11 enumerated panel roots present** — `shell-toolbar, shell-mediapool, shell-viewer, shell-inspector, shell-timeline-toolbar, shell-timeline-tabs, shell-track-headers, shell-timeline, shell-dock, shell-color, shell-deliver` ✓. Controls pattern `shell-<panel>-<control>` ✓ (e.g. `shell-viewer-btn-play` `Viewer.tsx`, `shell-timeline-toolbar-btn-snap`, `shell-inspector-tab-video`, `shell-track-<badge>-btn-mute` `TrackHeader.tsx:93`, `shell-deliver-btn-export-fcpxml`). State rows `shell-<panel>-state-<empty|loading|error|noresult>` ✓ for mediapool (empty/loading/noresult), viewer (loading/error), timeline (empty), inspector (empty), deliver (empty) — **gap: no `shell-viewer-state-empty` testid** (the "No media — import or drop a file" row renders testid-less, `Viewer.tsx:218-220`). Menus `shell-menu-<name>[-<item>]` ✓ all five names. Toasts `shell-toast-<n>` ✓. Save chip `shell-status-save` ✓. Bonus beyond spec: `shell-effects`, `shell-soundlibrary`, `shell-channel-editor`, `shell-cheatsheet`, `shell-failure-boundary`, `shell-confirm*`, `shell-ruler-bracket-in/out`, `shortcut-*` — these pin mock-invented surfaces, so if the seal round drops/admits them (N9, audio-page), the testid set needs a matching decision.

Assessment: **the contract is ~95% honored and ahead of the spec** (the spec doesn't enumerate per-control ids; the mock self-imposed them and tests against them). The real shell's Tier-3 suite can target the same surface from day one; the two follow-ups are the viewer-empty testid and the N9/audio-surface naming decision.

---

## 7. What's PROVEN vs what remains mock

**Proven (wired to the mock store, tested)**: the entire edit-surface grammar of §2 — selection/pair-select, move/trim/split/ripple-delete/duplicate/slip/trim-to-playhead with the locked-track + MIN_DUR + no-op-history laws, markers (add/delete/color-cycle/nav), JKL shuttle, in/out + loop ordering law, zoom ladder + fit, panel toggles/geometry, splitters (keyboard ladder), scene CRUD + confirm, media pool search/sort/select/drag + reveal, inspector 4-tab field edits (21 store-write call sites in `Inspector.tsx`), effect add/remove/toggle/param via rail drag-to-clip, context menus ×5, cheat sheet, toasts/status-chip/boundary/beforeunload, mixer faders/pan/aux/ducking toggles, variant system. This is the review-hardened layer: 14 rounds, 596 tests, zero known majors.

**Honest stub surfaces (the real-shell build list)** — every one *declares* itself via toast/aria-disabled, none silently no-ops (the R14 zero-no-op sweep, README:153-161):
- Toolbar2 fullscreen → §8.5 toast (`Toolbar2.tsx:112`).
- ⌘I import → "file picker is mock — drop on Media Pool" (`useShortcuts.ts:308`, `MediaPool.tsx:494`, `SoundLibrary.tsx:103`, `Timeline.tsx:48`); drop-import is real-but-fake (adds mock records + toast, `MediaPool.tsx:438`).
- ⌘E export → Deliver page + "FCPXML lands with spec 10" toast (`useShortcuts.ts:258`); Deliver queue jobs/reveal/retry are mock toasts (`DeliverPage.tsx:64,209,218`).
- Color page params/LUT → "static display state / render round" toasts (`ColorPage.tsx:59,134`).
- Inspector History button → "panel not built — ⌘Z works" (`Inspector.tsx:770`); "More actions" toast (`:780`).
- Clip menu "Open in viewer" → §4.3 fallback not built, cites B4 conflict (`Clip.tsx:232`); clipboard menu rows honest-disabled (C19).
- Media-pool Remove → mock hard-block/soft-remove toasts, no `removeMediaAsset` (`MediaPool.tsx:380-385`); Copy → "no clipboard" toast (`:370`); Reveal cross-scene → scoped-toast (`:334`).
- AppDock Home/Settings → aria-disabled + tips (`AppDock.tsx:67-84`).
- Playback = rAF loop over `playhead` (`AppShell.tsx:217-242`); viewer = `<img>` stand-in; waveforms = seeded deterministic (`lib/waveform.ts`); save chip = simulated lifecycle; undo = snapshots. **No `EngineCommand`/`SceneState` string anywhere in src** (grep hits are comments only, e.g. `useUiStore.ts:3`).

**DebugOverlay** (`debug/DebugOverlay.tsx:261`): the variant explorer (presets A/B/C + 5 independent dimensions, localStorage + URL-hash share links with awaited-copy fail state `:47-80`) **plus two §6.4 test drivers**: toast-kind buttons and the Simulate-save-failure drill that arms StatusStrip's error path (`:1-6, 54-56`) — a cheap, transferable pattern for driving error paths in the real shell's tests.

---

## 8. Storybook + annotakit as review infrastructure

**What exists**: `.storybook/main.ts` (react-vite framework, addons `['storybook-annotakit', '@storybook/addon-a11y', '@storybook/addon-docs']`, `staticDirs: ['../public']`, `core.allowedHosts: true` for the platform-edge review URL) + `.storybook/preview.tsx` (withStoreReset decorator). 71 stories in 10 files with per-story store re-hydration (README:98-106). The addon is **vendored source** at `vendor/storybook-annotakit` (14 TS files: manager panel, preview pin-layer + fiber walk, server routes/store/digest/ghsync; tsup build → `dist/`, gitignored so fresh clones must `npm run vendor:build` — README:63-73). Reviewer flow: **C** pin comment on element (React-fiber-aware: component name, props, file:line), **R** region pin, threads in the bottom dock, digest/export REST on the dev server (`/annotakit/api/*`), optional GitHub-issue mirror via `ANNOTAKIT_GH_TOKEN` (each thread = one issue, reply→comment, resolve→close; self-healing duplicate-echo sentinel per R14 W1). SQLite persistence (`node:sqlite` + JSON fallback). Needs `storybook dev` (static build shows "dev only" note).

**Reusability as the real-shell review surface — high, with caveats**:
- The **workflow** (pin → thread → GH mirror → fix → resolve) and the **addon itself are app-agnostic** — pointing it at the real app's Storybook is a config change, not a port. This is the strongest single asset: a proven, already-exercised review loop (90 review entries across PR #1 were consumed this way) that survives the mock→real transition untouched.
- `decorators.tsx` (store snapshot/reset) ports after swapping the store for the engine-backed one — the *pattern* (fresh state per story) is the durable part.
- Stories themselves are ~70% reusable as *visual regression* anchors: region/chrome/primitives stories port with import swaps; stories asserting mock doc behavior (blocks-clip-style, variant A/B/C) are mock-study artifacts. The A/B/C variant layer is explicitly a *direction study* (README:108-124) — the real shell ships one theme; the variant infra is dev tooling, not product.
- The supervised `:3000` public review server (`scripts/sb-supervisor.mjs` in the platform workspace, README:75-80) is process state, not in this repo — HANDOFF has the restoration recipe (per R14 wrap-up commit `d42693e`).

---

## 9. PR #1 state (GitHub API, live)

- **Title**: "ui-mock R13: full NLE shell mockup — Storybook 10 review surface + vitest test suite (461 tests) + review fixes" — **title/body are stale at the R13 creation state** (461 tests); the branch itself has since advanced to R14 (head SHA `d42693e` == local HEAD, 40 commits, last issue comment documents the R14 596-test state).
- **State**: OPEN, not merged; base `ui-baseline` ← head `main`; mergeable_state **clean**.
- **Files changed**: **146** (+35,087 / −32); commits 40.
- **Comments**: 16 issue comments + **74 review comments** (inline) + 5 reviews (CodeRabbit [bot], Codex [bot], and 3 maintainer waves — wave 0 maintainer pass, wave 1 three-way specialist, wave 2 final verdict).
- **Last 2 review comments** (both by maintainer `frejogochukwuout`, 2026-09-04T13:56): (1) **[P3]** `.agents/HANDOFF.md` — "REST+WS on the dev server" is false; the addon has no WebSocket, notification rides Storybook's channel + same-origin polling; (2) **[P3]** `Variants.stories.tsx` — dead `StoryObj<{presetId}>` args generic advertising a knob that does nothing. Both P3-class documentation/type hygiene.
- **Issue #2** ("Spec-revision candidates from the ui-mock review (seal-round input)"): OPEN, **1 comment**.

The R14 maintainer comment (last issue comment, 2026-09-04T21:10) records the final audit state: 90 entries ≈ 75 unique findings, 5 claimed-but-not-landed fixes caught and closed, "596/596 tests (was 511), tsc clean, dist rebuilt + bundle-verified."

---

## 10. Honest completion estimate

**0% of engine wiring exists** (no timeline model, no playback, no decode, no commands — by design, README:152). The question is the **UI layer only** (everything above the D12 seam). Breakdown of what the mock de-risks of the final app's UI-layer work:

| UI workstream | Est. share of UI-layer effort | De-risked | Reasoning |
|---|---|---|---|
| Layout / chrome / theming / dialogs / state rows | ~30% | **~85%** | §3 geometry, §8 removals, §9 tokens, §6.3/§6.4 UX all implemented and review-hardened; remainder = i18n (C12), type-scale/tooltip/aria gaps (C11, C14-C18), settings & fullscreen surfaces |
| Interaction grammar (pointer + keymap) | ~35% | **~55-60%** | Grammar *design* is proven (incl. the law-laden store: MIN_DUR, no-op history, link gating, loop ordering — each a pitfall already paid for); but 100% must be re-plumbed to EngineCommand emission + preview-commit coalescing + WYSIWYG capture; keymap is 54/~178 rows with the remainder scoped out (C22); keyframes + clipboard families are net-new |
| State design | ~15% | **~60%** | View-state slice transfers near-verbatim (§6.2's own field list ≈ the mock's non-doc fields); doc slice, snapshot-undo, mixer sidecar, save-sim all discarded; selector layer + event-stream mapping is net-new |
| Review & test infrastructure | ~20% | **~75-80%** | Annotakit + Storybook + harness (setup/store-reset/renderShell) ~fully reusable; ~half of 596 tests port after the store swap (store/doc tests are mock-specific); the Tier-3 command-capture suite (spec 18 §12, ~60 tests) is untouched new work |

**Point estimate: ≈ 55% of the final app's UI-layer risk is de-risked (range 45-65%)** — where "de-risked" means decisions made + pitfalls already paid + scaffolding reusable, **not** code-that-ships. Two structural caveats for the D15/D16 ruling:

1. **What survives as code**: the chrome layer (Toolbar2/dock/status/toasts/dialogs/cheat sheet/context-menu primitive), the view-state store slice, the testid contract, the review infra. **What does not**: the timeline region — per D12 (R9 ruling), opencut-timeline is the editing-domain UI home, so the mock's `Timeline/Clip/Ruler` (1,326 LOC) is a *design reference and law register*, not the shipping implementation; its behavioral laws transfer as tests/spec text, not code. Same likely for the mixer surfaces (spec 20's G-layer + engine's one-engine audio answer supersede the mock sidecar).
2. **The mock's real, compounding asset is the negative space**: 29 C-registrations + 15 N-findings + 6 A-conflicts + 4 B-gaps + the E.4 fixed-list = the spec set's UI ambiguities surfaced *before* the real build, with a review process (annotakit→PR→fix waves) already rehearsed end-to-end. That converts seal-round spec work directly into implementation-path certainty.

---

## Corrections to prior beliefs

1. **"596 tests all green" — CONFIRMED, but the README is stale**: live run = 34 files / 596 tests / 0 fail; `tsc --noEmit` clean. However `README.md:31,40,202` still says "33 files / 510 tests" — and commit `e4d65a0`'s message claims "README status section updated to R14/596-test state." The claims-vs-code re-audit class (SKILL 39-41) has one live instance in the mock itself: the README update was claimed but only partially landed. (The 34th file vs 33 is part of the same drift.)
2. **"71 stories" — CONFIRMED** (71 story exports across 10 files; README table:82-96 accurate).
3. **"PR #1 only P3s remain" — CONFIRMED with two precisions**: PR is OPEN/unmerged (base `ui-baseline`), head == local HEAD `d42693e` (so PR *contains* R14 despite its stale R13 title/body "461 tests"); the last inline review comments are 2 P3s (HANDOFF.md WS claim; dead story args generic); mergeable_state clean. R14's own comment says 90 entries ≈75 unique findings all closed.
4. **"Mock does not amend specs" — CONFIRMED**: Decision-14 posture held everywhere (`.agents/SPEC-REVISION-CANDIDATES.md:3-7`; deviations are registered as proposed amendments, in-code comments only).
5. **New facts the priors missed** (net-new this scout): (a) testid contract is 64 `shell-*` patterns + 54 `shortcut-*`, honoring all 11 spec-18 panel roots, with `shell-viewer-state-empty` as the only state-row gap; (b) **float-seconds vs MediaTime frames is an UNREGISTERED 09 §3.1 delta** (with 24fps hardcoded in `timecode.ts:3` despite a 30fps asset in the fixture) — recommend adding to the seal census; (c) 6 further unregistered schema deltas (§3 items 8-12); (d) `ContextMenu.tsx` is the only untested component module; (e) keymap coverage is 54 ledger rows ≈ 70 chords vs spec 16's 178-row inventory (~30% total, majority of the edit-shell core per C22's scoping).

---

*Scout R15-S4 — read-only; no repo files modified (this report + worklog append excepted). Test run artifacts: `npm ci` (282 pkgs), `tsc --noEmit` exit 0, `vitest run` 34/34 files, 596/596 tests.*

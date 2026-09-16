# test-scout-app-ui-mocks — the R28 T1-c test-practice census (app · ui · mocks)

**Task ID:** R28-T1-c · **Agent:** test-practice census scout · **Date:** 2026-09-16
**Trees read (read-only, main):** `nle-test-app` @ `85cff80` · `nle-ui` @ `32abd58` (app's vendor pin: `83ff8a8`) · `ui-mock/shell-variants` @ `980920b` (the R25 WRAP lineage `0c7bf01` under it) · `ui-mock/shell-mini` @ working tree.
**Mission:** extract the DEMONSTRATED TEST PRACTICE for the UI/app tier — how gesture-heavy, render-heavy NLE surfaces get programmatic verification — and feed the spec-side test-law design (T2). Every pattern carries a canonical file:line cite. Nothing here was run (no `node_modules` in the app checkout; the sibling-maintained mock trees are live-current); all counts are static line-start censuses, cross-checked against the repos' own gate lines.

---

## §1 The app census + the 8-suite roof (nle-test-app @ 85cff80)

### 1.1 The test census — 252 it-blocks / 8 suite files (static line-start count, reconciles with the repo's own gate lines at `worklog.md:696/:713`)

| Suite file | it-blocks | describes | The domain it owns |
|---|---|---|---|
| `src/GluedShell.test.tsx` | **104** | 25 | THE glue-law suite — the real composition (AppShell + EngineMount + ProgramCanvas) end to end |
| `src/audioService.test.tsx` | **42** | 8 | the audio host — strips/buses/meters/transport on the shimmed AudioContext |
| `src/sceneBridge.test.ts` | **41** | 11 | SceneJSON ⇄ TScene (the id-preservation law) |
| `src/deliverService.test.ts` | **20** | 8 | the export orchestrator (mediabunny master/frame, blob-URL mint/revoke) |
| `src/persistenceService.test.ts` | **20** | 9 | autosave + the Load/boot validated-snapshot door |
| `src/wire-coverage.test.tsx` | **9** | 1 | THE R9 COVERAGE GATE — every routed wire verb through the real mounted UI |
| `src/waveformPeaks.test.ts` | **9** | 1 | the peaks pipeline |
| `src/engineSeam.test.ts` | **7** | 3 | the engine-seam pins — pure pipeline tests, no React, no AudioContext |
| **TOTAL** | **252** | 66 | 252/252 is the repo's own gate line (`worklog.md:696`) |

The 8-suite roof is the *K3 tier* of the fleet grid (the consumer-side half of the validation architecture, README:1-12): the app consumes `nle-ui` via the private-source protocol (git submodule pinned at an exact SHA + `file:` link + `.npmrc install-links=false` → symlinked live TS source through the **closed exports map** `nle-ui`, `nle-ui/styles.css`, `nle-ui/testing`) and glues it to the vendored engines. "If this app can't compose the package's public surface with the engines, the boundary is broken" (`package.json:6`).

### 1.2 The port census — 42 = 36 + 5 + 1 (the app's OTHER census, `docs/port-census.md:29-31`)

42 port files = **36 zero-action mirrors** (6 byte-exact + 30 mechanical-exact after the ONE sanctioned import-specifier rewrite `@vendor/timeline` ↔ `@/lib/timeline`) + **5 documented carriers** (each with a mandatory divergence rationale, `:39-47`) + **1 app-host** (EngineMount). Machine-checked by `scripts/census-check.mjs` (register-equality BOTH directions — tree drifting from register OR register lying about tree both fail the build, `census-check.mjs:11-17`), with teeth: `scripts/census-mutation-gate.mjs` doctors a sandboxed copy in each of **6 drift classes** (M1 add / M2 remove / M3 diverge / M4 carrier-without-rationale / M5 fudged summary / M6 stale pin.sha) and asserts the checker FAILS each one (`census-mutation-gate.mjs:9-25`) — "a checker that cannot fail is not a gate."

### 1.3 The harness contract (identical across app and package — `src/test/setup.ts`)

- The jsdom polyfill set: ResizeObserver, IntersectionObserver, matchMedia, scrollIntoView, pointer capture, **rAF = 16 ms setTimeout** (`setup.ts:22-79`).
- The **audioContextShim** (`setup.ts:86-89`, `src/test/audioContextShim.ts`): jsdom has no AudioContext — the shim records `paramWrites` so "a fader write lands on the REAL gain node" is assertable (`audioService.test.tsx:151-158`: `gainWrites.some(w => Math.abs(w.value − 0.1) < 1e-6)`).
- The containment contract per test (`setup.ts:91-112`): `cleanup()` + `resetTimelineRouter()` + `audioService.disposeAll()` + `resetUiStore()` + localStorage keys + `location.hash` + the doc `data-*` variant attrs — module-level singletons never leak between tests.

---

## §2 The app patterns — the completeness machine-check in FULL detail

### 2.1 THE COMPLETENESS MACHINE-CHECK (`src/wire-coverage.test.tsx`, 9 it-blocks) — the flagship pattern

The user directive it answers: *"fully test every timeline ops … zero no-op."* The mechanism, part by part:

**(a) The module-scope accumulator** (`wire-coverage.test.tsx:34-47`):
```ts
const ACCUMULATED = new Set<string>();
afterEach(() => {
  const api = engineService.wireHandle();
  if (api) for (const t of api.wireCoverage) ACCUMULATED.add(t);
  document.querySelectorAll('body > [data-appshell-host]').forEach((el) => el.remove());
});
```
The load-bearing **LIFO law** is frozen in words at `:34-40`: vitest runs afterEach hooks LIFO — THIS file's hook (registered after the setup file's) runs BEFORE setup's `cleanup()` unmounts the tree, so the wire handle is still live here. If the ordering ever flipped, the union reads null and the gate fails LOUD (MISSING) — **fail-safe, never silently green**. The accumulation law (`:18-22`): each test's render mints a FRESH wire (fresh core); the EngineMount carry only spans scene switches within one mount.

**(b) The driving tests** (8 of the 9) — every routed wire verb driven through the REAL mounted UI, never a direct harness dispatch:
- toolbar buttons: `[data-test="toolbar-play"]`, `toolbar-undo/redo`, `rate-seg-2x` (`:107-128, :159-168`);
- keymap keys: `keyDown('k')` (JKL pause), `Home` (seek), `s` (split), `⌘D` (duplicate), `Backspace`/`⇧Backspace` (delete/rippleDelete), `b` (bookmark), `r` (loop) (`:98-99, :113-156, :174-207`);
- context menus: `context-item-mute`, `context-item-remove-bookmark`, `context-item-add-track`, `context-item-delete-track` (`:189-275`);
- label buttons: `label-mute-tr-main`, `label-visibility-*`, `label-lock-*`, `labels-lock-all`, `labels-mute-all` (`:235-254`);
- **gesture sims**: the element-drag commit (mousedown → mouseMove past the 5 px threshold → mouseUp → `timeline.move`, `:282-290`); the bookmark drag (`:182-185`); the pool DnD commit (`fireEvent.dragStart` on a `shell-mediapool-card` → synthetic `dragenter/dragover/drop` on the tracks scroller → `timeline.insert`, `:296-325`); the volume-line **double-click** authoring gesture → `timeline.upsertKeyframe` with `origin: 'ui'` (`:328-377`).

**(c) The jsdom workarounds** (reusable laws, cited in comments):
- `dragEvent()` helper (`:83-87`): jsdom lacks the DragEvent constructor — RTL's drag helpers fall back to plain Event and LOSE the mouse coords; a MouseEvent typed as the drag event + a `dataTransfer` property carries both.
- rect stubbing (`:297, :348`): jsdom's zero scroller rect NaN-logs the drop-line math; a stubbed `getBoundingClientRect` feeds geometry only — "the position math is content-space, unaffected."

**(d) Engine-truth assertions, not just wire-log assertions.** Every gesture asserts the ENGINE really changed state: `startTime` before/after (`:286-290`), bookmark `time` moved (`:186-187`), `el6.params.muted === true` (`:226-227`), element count after insert (`:320-324`), `getBookmarks()[0]`, `getLoopRegion()`, `getPlaybackRate() === 2` (`:121`). The wire log (`wireLogTypes()`, `:100-101`) proves ROUTING; the engine reads prove EFFECT — both, every time.

**(e) THE GATE** — the last test, by declaration order (`:379-392`):
```ts
it('THE GATE: every WIRE_COMMAND_TYPES entry minus the live exception registry was driven through the real UI', () => {
  const missing = WIRE_COMMAND_TYPES.filter(t => !ACCUMULATED.has(t) && !WIRE_UI_EXCEPTIONS.has(t));
  const stale = [...WIRE_UI_EXCEPTIONS].filter(t => !(WIRE_COMMAND_TYPES as readonly string[]).includes(t));
  expect(missing).toEqual([]);   // direct array diffs — the failure output NAMES every missing verb
  expect(stale).toEqual([]);     // …and every stale exception
  expect(ACCUMULATED.size).toBe(WIRE_COMMAND_TYPES.length - WIRE_UI_EXCEPTIONS.size);
});
```
Live counts at the current pin: **30 wire command types − 5 exceptions = 25 routed verbs** (counted at `vendor/nle-timeline/headless/api.ts:197-228` + `:283-296`; the barrel's own comment: "M49C now counts 25 routed / 5 exceptions", `api.ts:266-271`). Declaration-order dependence is the design: earlier tests accumulate, the gate closes.

**(f) The LIVE exception registry** (`:49-59`): `WIRE_UI_EXCEPTIONS: ReadonlySet<string> = WIRE_UI_EXCEPTION_VERBS` — imported LIVE from the vendored barrel, never a hand-mirrored copy. The RC-V1 P2 incident (`:49-58` comment): the hand-mirrored 6-verb copy went stale at the `6e2b91a` re-pin (upstream removed `timeline.upsertKeyframe` when its UI coverage landed, 6→5) while this test still excepted it — "leaving the authoring seam UNFENCED app-side: deleting the dispatch pass would stay green." The registry itself is tsc-asserted BOTH directions in the barrel (`api.ts:230-246` types-vs-union; `api.ts:298-313` every exception is a real verb) — drift is a COMPILATION error, not a gate-time discovery.

**(g) Origin attribution** (`:355-359`): the upsert pin asserts `entry.origin === 'ui'` — "a REAL UI affordance, not a harness dispatch — the honest-gate law." Plus the full command-shape contract (`propertyPath: 'volume'`, `elementId`, value in `[−60, +20]`, `timeTicks ≥ 0`, `:360-376`) — the gesture's parameter law is pinned, not just its routing.

### 2.2 The DOM-attribute rendering assertion (the data-ops pattern)

jsdom's `getContext('2d')` returns null — the raster is a documented no-op. The rendering law is therefore asserted through **DOM attributes the component itself declares**:

`src/ProgramCanvas.tsx:228-241` — the program-monitor canvas carries:
```
data-testid="program-canvas"  data-ops={ops.length}  data-playhead={playhead}
data-scene={activeSceneId}  data-engine-version={engineVersion}
data-filters={filters}  data-grade={gradeFilter}
```
`data-filters` is the ops' resolved filter strings joined with `|` (`ProgramCanvas.tsx:185-188`: "jsdom: the raster is a no-op; the ops' filter strings ARE the preview contract"). The tests then assert the *rendering law* through them (`GluedShell.test.tsx:940-1110`):
- composition follows the playhead: ops 1 → 2 (the text-overlay window opens) → 0 (past everything) (`:950-958`);
- the ops come from the ENGINE scene — a split changes the composition, with the D-T5 hard-cut phantom-regression pin (`:960-982`);
- effects preview: `data-filters` `''` → `'blur(12px)'` → disabled-effect filtered out BEFORE the seam (`:1042-1072`);
- the grade final pass: neutral `''` → the canonical 4-component chain → cleared (`:1079-1098`);
- the honest-floor law: v1 previews render NOTHING for a case and the attribute says `''` ("honest", `:1060`).

### 2.3 The zero-no-op end-to-end pin (audio host)

`audioService.test.tsx:151-158` — a store fader write must appear as a REAL `setTargetAtTime` on the shim's recorded `paramWrites` (`gain ≈ 0.1` for −20 dB; `−∞` → true `0` at `:161-168`; solo silences the OTHER strip at `:170+`). The shim's `paramWrites` array is the assertion surface for "every mixer control lands on a real node."

### 2.4 The audit-driven dead-zone sweep

`GluedShell.test.tsx:2028+` ("D30 W-F Z6 — the app-flow dead-zone sweep (audit 9-A2 P-series)"): every row of a flow audit becomes an it-block that drives the REAL affordance (scene tab-add click → fresh EMPTY engine scene + mirror; scene delete-confirm; etc.) and asserts engine truth + store mirror. Pattern: **audit table → per-row UI-driven pin**, with the honest bridge-law notes inline ("the bridge may drop EMPTY tracks — its documented law", `:2050-2052`).

### 2.5 The viewport-artifact honesty law

`GluedShell.test.tsx:53-60`: the RENDERED element count is a viewport artifact of virtualization, "never the contract" — the full census lives in the engine mirror. And the wire-coverage rippleDelete test zooms FIRST so the target element enters the boot viewport ("the virtualization law (W2.2's precedent)", `wire-coverage.test.tsx:149-151`).

### 2.6 The pure-pipeline suite (no React)

`engineSeam.test.ts:1-13`: "Pure pipeline tests (no React, no AudioContext): the store's doc fields flow through sceneBridge into the engine's flattener/seam modules and come out as REAL audio parameters" — volume domain dB law (`:53-64`), transition windows, av-link closure. The layering: pure-pipeline suites pin the math; the mounted suites pin the composition.

---

## §3 nle-ui's patterns (the package tier @ 32abd58, the app pins 83ff8a8)

### 3.1 The census — 690 it-blocks / 37 test files

Largest: `state/useUiStore.test.ts` **130**, `hooks/useShortcuts.test.tsx` **53**, `components/shell/AppShell.test.tsx` **39**, `lib/mockData.test.ts` 27, `timeline/Clip.test.tsx` 24, `timeline/Timeline.test.tsx` 24, `lib/timecode.test.ts` 24, `shell/Inspector.test.tsx` 28, `state/meterRegistry.test.tsx` 17, `state/timelineRouterDispatch.test.ts` 17 … (37 files total; 690 = the repo's own gate line at HEAD, commit `32abd58`: "vitest 690/690, boundary PASS"). The package is the **engine-free mock-law tier**: zustand store is the SSOT; "674 mock-law tests" per the app README (now grown to 690).

### 3.2 The testing subpath (the closed exports map's third door)

`nle-ui/testing` exports the harness: `renderShell`, `store`, `pressKey`, `getTimelineRouter`, `resetUiStore`, `resetTimelineRouter`, `__resetMeterSim` (consumed by the app's setup, `nle-test-app/src/test/setup.ts:13`). `src/test/helpers.tsx:16-21` — `renderShell` renders with the app's real provider stack (VariantProvider → ConfirmProvider) and **boots the store via patch before first paint** ("mirrors the stories' StoreBoot layout-effect contract"). The `UiPatch` type trick (`helpers.tsx:12`): `Partial<ReturnType<typeof useUi.getState>>` — UiState is not exported, so the patch type is derived.

### 3.3 The shell-* testid grammar

A stable, enumerated `data-testid="shell-*"` namespace (~55 distinct ids at the surface: `shell-timeline`, `shell-toolbar`, `shell-toolbar-btn-{mediapool,inspector,effects}`, `shell-viewer{,-tc,-transport,-scrub,-scrub-playhead,-safe-guides,-btn-play,-state-loading,-state-error}`, `shell-mediapool{,-card,-state-empty,-state-loading,-state-noresult}`, `shell-inspector{,-state-empty}`, `shell-color`, `shell-deliver{,-job,-job-warnings,-preset-master,-state-empty}`, `shell-cheatsheet`, `shell-dock`, `shell-status{,-save,-storage}`, `shell-timeline-toolbar{-btn-zoom-fit,-btn-zoom-selection,-btn-snap,-btn-view-options,-btn-marker-color}`, `shell-scene-tab-*`, `shell-failure-boundary`, `shell-effects`, `shell-soundlibrary{,-item,-state-noresult}`, `shell-ruler-bracket-in/out`, `shell-track-headers` …). The grammar is what makes the APP tier's coverage gate writable without touching package internals — the app asserts on the same ids through the public surface.

### 3.4 The keymap-sync gates (the twin contract)

Two files, one contract (`lib/shortcutMap.test.ts:1-5`): "the cheat sheet renders these rows verbatim and hooks/useShortcuts.ts is the behavioral twin: the completeness contract is that every implemented binding has exactly one row."
- **The doc-map integrity gate** (`shortcutMap.test.ts:10-41`): unique kebab-case action ids; every row uses a declared group; every row has keys + desc; every group used (Scenes documented-empty exemption).
- **The family coverage gate** (`:43-75`): the transport / tool / clip-edit / marker / pages-audio-focus-escape families are each enumerated as fixed expectation lists — a binding added to the hook without a doc row fails the family list.
- **The behavioral twin** (`hooks/useShortcuts.test.tsx:29-32`): fires REAL `KeyboardEvent`s at `window` (`press()`) and asserts store reactions — the JKL tap-accel state machine with **manually mocked `performance.now`** for deterministic 500 ms windows (`:62-83`: 1× → 2× → 4× capped; window resets after 500 ms; direction change restarts; K clears the ref), the Esc ladder, the text-input guard (§8.5).

### 3.5 The gesture sims (package tier)

`timeline/Clip.test.tsx:150` — `fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391 })` with the comment "391 = 8.5 s × 46": **the pixel-time arithmetic is part of the test's contract** (px ÷ pxPerSec = seconds). Keyboard activation per the ARIA button pattern (spec 18 §11) sits beside the pointer path (`Clip.test.tsx:250+`).

### 3.6 The setup twin

`src/test/setup.ts` mirrors the app's stub set + containment verbatim ("Mirrors the Storybook withStoreReset contract"), including the router reset — the same harness contract at both tiers means glue tests in the app render the SAME world the package tests rendered.

---

## §4 The mocks' patterns (shell-variants 1,939/68 + shell-mini 495/12)

### 4.1 The censuses and the reconciliation

- **shell-variants:** 1,939 it-blocks / 68 test files (static line-start, the battery's own method — matches the REGISTER pin verbatim). Largest: `useUiStore.test.ts` **261**, `timeline/Timeline.test.tsx` **128**, `timeline/Clip.test.tsx` **103**, `shell/AppShell.test.tsx` **78**, `useShortcuts.test.tsx` **73**, `shell/Inspector.test.tsx` **63**, `color/gradeMath.test.ts` **57**, `ColorPage.test.tsx` **50**, `mixer/ChannelStrip.test.tsx` **50**.
- **shell-mini:** 495 / 12 (`useMini.test.ts` **139**, `timeline/Timeline.test.tsx` **122**, `App.test.tsx` 60, `lib/geometry.test.ts` 47 …).
- **The runner-vs-line-start reconciliation** (the R25 WRAP's declared 1,950 vs the scraped 1,939): 1,939 line-start `it(` + **7** from `it.each(REPLAY_CASES)` at `src/lib/insertPlan.test.ts:458` (7 cases; `it.each(` is invisible to the line-start method) + **4** extra loop iterations of the `AA5_SITES`-registered `it` at `src/styles/appLayers.test.ts:131-132` (5 sites, 1 line-start) = **1,950 exactly** (documented in `audits/fleet-r28/scout-register.md` §4). Declared ≠ scraped by collector unit, not by substance.
- **126 stories** = 11 `src/stories/*.stories.tsx` files; 123 `StoryObj` exports + 3 `PresetStory` exports (the alias is why a bare count reads 123).

### 4.2 The interaction battery (per-surface it-blocks + gesture sims)

The grammar of a mock interaction test (`timeline/Timeline.test.tsx:774-856`, the 2D cross-track drag battery):
1. `boot({})` — the store-patch boot helper (the ColorInspector grammar: `useUi.setState` with the page/selection/grade-target pre-state, `pages/color/WheelsPanel.test.tsx:36-46`).
2. **Pixel-time math as the deterministic contract**: `clientX: 391` = 8.5 s × 46 px/s; "299 px = exactly 6.5 s → 15.0 s preview (frame-exact: 15 × 24)" (`:778-781`). shell-mini's header states the law outright: "jsdom layout note: getBoundingClientRect returns zeros → the content origin is x=0, so clientX maps DIRECTLY to time via pps (deterministic: default zoom 48pps)" (`shell-mini/src/timeline/Timeline.test.tsx:8-11`).
3. The gesture sequence: `pointerDown → pointerMove (cross the 5 px threshold) → pointerUp` — shell-mini's `drag()` helper codifies it (`shell-mini/src/timeline/Timeline.test.tsx:23-28`).
4. **Mid-gesture preview assertions**: the ghost's `data-track-id`, `style.left` (`'690px'` = the resolved snapped preview time), `data-conflict="overlap"` (red edge), `data-frozen="true"` (incompatible target → snapped back to last-valid), the lane-highlight presence/absence, `cursor: not-allowed` (`:783-849`).
5. **Post-commit truth assertions**: `el2().trackId` changed, `startTime ≈ 15`, the source lane emptied, the ghost cleared.
6. **History-entry counting**: `expect(store().past).toHaveLength(1)` — ONE entry for the whole drag (`:794`); the rejected release adds NOTHING (`:834`).
7. **Toast honesty**: the rejected drop files `title: 'Drop rejected'`, `detail` citing the spec law ("clips would overlap (spec-05 §8.3)", `:853-855`).

The battery's coverage classes (from the describe census of `Timeline.test.tsx`): 2D cross-track drag resolution, clip virtualization (200 px window; selected/dragging never skipped), edge auto-scroll (rAF, 100 px threshold, 15 px/frame max), snap sources + closest-wins, the snap indicator (2 px accent/40%, gesture-held only), trim-mode affordances, mid-drag unmount + destructive-key gesture gate, head-drag scrub domain, the Alt+drag repro "through the REAL drag seam," placeOnTop minted-track ghost at the INSERT line, the FX engine gates, seam-zone click laws, transition-box interactive ONLY in fxMode, the context-menu router.

### 4.3 The a11y probes

- `getByRole` with accessible names as the primary locator grammar (`Timeline.test.tsx:148`: `getByRole('button', { name: 'Add audio track' })`; separators: `getAllByRole('separator', { name: 'Resize panel' })` in `AppShell.test.tsx:149-152`).
- **The honest-disabled law (AA9)**: "a lane div is not a control — no fake disabled": the frozen lane carries `data-frozen` but NOT `aria-disabled` (`Timeline.test.tsx:484-492`); menu items that are disabled DO carry `aria-disabled="true"` (`:545`).
- The slider contract: `role=slider`, frame-unit `aria-valuenow`, focusable, click-selects (`Timeline.test.tsx:1868`); the WheelsPanel F2 pins: every top-control row renders a REAL `role=slider` with an accessible name — "the decorative aria-hidden bar is dead" (`WheelsPanel.test.tsx:60-70`).
- `aria-label` as the semantic carrier: the transition box `'Crossfade transition, 0.75 seconds'` (`Timeline.test.tsx:312`); the seam zone "Add Cross Dissolve" (`:1621`); decorative badges `aria-hidden="true"` with "the a11y route is the bar's status line" (`:1433`).
- `aria-pressed` for toggles (the mini-plus gate chip, `shell-mini/src/timeline/Timeline.test.tsx:45-53`).

### 4.4 The state-machine pins

The JKL tap-accel family (inherited from nle-ui, extended): mocked `performance.now`, 500 ms window, cap, direction-restart, K-clears. Beyond it, the mock battery pins: the **Esc ladder** (rung order; SS5: Esc exits the source viewer as the FIRST rung), the **save retry machine** (`useUiStore.test.ts:446+`), the **e.repeat gate** (SS2: "held keys never machine-gun discrete writers", `useShortcuts.test.tsx:596+`), **gesture-active destructive-key swallow** (R15-F1: Backspace mid-drag is inert, `:557+`), the tool-armed dispatch (SS7: `,/.` dispatches by the ARMED tool), the per-page view-state memory, undo history mechanics, the zoom key family.

### 4.5 The patch-replay equivalence (REPLAY_CASES)

`insertPlan.test.ts:443-486`: for all 7 insert modes, the plan built with REAL ids and the plan built with PREVIEW-fake ids, both applied to the identical pre-state snapshot, must be **equal once minted identities are scrubbed** — `scrub(sceneA, realSeen)).toEqual(scrub(sceneB, fakeSeen))` plus geometry and patch — "the patch is id-independent, so the preview IS the commit." Plus the C48 id-discipline pin: a preview plan NEVER advances the store's real id counter (`:488+`). This is the mock's answer to "preview == commit by construction" — a law the jsdom battery can prove exactly because the model is pure data.

### 4.6 The source-text law pins (AA5_SITES)

`appLayers.test.ts:113-142`: five sites that carried informative text on the decorative-only `text-tfaint` token are pinned AT SOURCE LEVEL — the test reads the component file, finds the unique anchor text, and asserts the NEAREST `className` before the anchor contains `text-tmuted` and not `text-tfaint`. The header explains why: "jsdom runs css:false, so the class strings in source are the render truth; the token law is a source law."

### 4.7 The fixture re-normalization (mockData.test.ts)

The mock's fixture is itself a test contract (`mockData.test.ts:1-80`): exactly the two sample scenes in order; settings match spec 09 §3.1 (24 fps/1080p/48 kHz stereo); scene-1 dirty / scene-2 clean (the save-machine fixture); **id uniqueness across scenes/tracks/elements/markers/media**; **frame-clean discipline** (every startTime/duration/marker time on the 24 fps grid via `snapToFrame`); the spec 18 §4.10 sample shape (5 tracks: overlay/main/audio/audio-locked/caption; the 5 caption elements with exact bodies). The whole battery's pixel-time math and lookup semantics rest on these invariants — the fixture is re-normalized by its own suite before any interaction test trusts it.

### 4.8 THE VLM NET (capture → review → gate) — in full

**Step 1 — `scripts/vlm-capture.mjs`** (304 lines): walks the LIVE Storybook dev server's `/index.json`, visits every story (`?path=/story/<id>`), and screenshots the story canvas to `r23-analysis/shots/<group>/<story>.png`, maintaining an **append-style, kill-safe manifest** (upsert per story, atomic tmp+rename, `vlm-capture.mjs:109-115`) so a killed run leaves a consistent file.
- **The iframe width law** (`:30-40, :125-184`, the hard-won lesson): the story renders inside `#storybook-preview-iframe`, whose width can lock at a stale 1920 px in SB 10.6 — so before every shot the script FORCES the whole chain to the exact target viewport (outer iframe attrs + inline `!important` styles + `position:fixed` at (0,0) over the manager chrome; the iframe body's SB-default 16 px padding zeroed; `#storybook-root` exact WxH), **verifies the geometry stuck, and re-forces up to 3 times**.
- **The 1280×800 floor**: every layout claim is budgeted there; the screenshot is an ELEMENT shot of the iframe itself — the PNG is exactly floor pixels, no SB chrome noise. "Clipping you see at this size is a real floor finding, not an artifact" (`vlm-rubric.md:69-75`). Overflow deliberately NOT hidden — scrollbars are signal.
- Playwright resolved through the global symlink chain (no repo deps, `:80-93`).

**Step 2 — `scripts/vlm-review.mjs`** (270 lines): reads the manifest, feeds each PNG to the vision LLM (`z-ai-web-dev-sdk`, `zai.chat.completions.createVision`, thinking disabled, base64 PNG, backend node only — `vlm-rubric.md:85-87`) with the **per-story rubric** (`vlm-review.mjs:87-99`):
> "Spot issues: (1) text clipped/overflowing its container, (2) overlapping elements, (3) controls that look dead/unwired (placeholder-looking), (4) misaligned rows/columns, (5) illegible contrast, (6) elements that read as broken visualization (empty canvases, zero-size boxes, stray scrollbars…). Reply ONLY with a JSON array: [{severity:'P1'|'P2'|'P3', element, description}] — empty array [] if clean. Be strict but do not invent issues."

- **Severity calibration** (`vlm-rubric.md:76-84`): P1 = visibly broken/blocker; P2 = rough but functional; P3 = polish; `[]` is a valid, common answer.
- **Defensive parsing** (`vlm-review.mjs:126-147`): code fences stripped, first balanced `[...]` extracted, severities coerced, garbage dropped — a chatty VLM reply still yields structured findings.
- **Retry law** (`:149-166`): 2 retries with backoff, then the story gets `findings: [{error}]}` — the batch NEVER crashes; ERR is its own column, "not component bugs."
- **Review order = layer order primitive → panel → shell** (`:40, :219-220`) — the taxonomy from `layerOf()` (`vlm-capture.mjs:100-107`).
- Kill-safe upserts after EVERY story (`:254`).

**Step 3 — `scripts/vlm-run.sh`**: the one-shot capture → review → summary table (forwards flags; the summary re-derives the P1/P2/P3/ERR tally from the findings file).

**The gate half (the R25 exit-gate method):**
- **The console-clean mount**: `scripts/console-sweep.cjs` boots each target story through the same playwright path, collects `pageerror` + `console.error` per story (networkidle + 1600 ms settle), writes `r23-analysis/console-sweep.json` — the R25 B5 record: **console 28/28 mount-clean**.
- **The views probes**: after the fix waves, the fix-class story views were re-shot and re-reviewed — **0 P1 / 0 P2 across all 10 fix-class probes** (the audit-tracker record, quoted at `scout-register.md:41`).
- **The interaction battery zero-error**: the vitest battery as the third exit leg.
- **The thread-resolution instrument**: `scripts/r25-resolve-threads.mjs` PATCHes the annotakit review-thread API with per-thread fix evidence (19/19 resolved; each note names the fix + the law).
- The artifacts on disk: `r23-analysis/manifest.json` (124 stories — the pre-refresh sweep; the WRAP declares 126 by source count) and `vlm-findings.json` / `vlm-r25/findings.json` (the baseline corpus: **P1=32, P2=42, P3=100, ERR=42** — the corpus the F1-F4 fix waves burned down to the exit gate).
- `r23-analysis/review-findings.md` — the consolidated fix list with ORCHESTRATOR DESIGN RULINGS: the review findings become the fix round's binding input, including the jsdom-impossible admissions ("elementFromPoint-style assertion is jsdom-impossible — pin instead that the box's style.pointerEvents is 'none' when !fxMode", `review-findings.md:24-28`).

---

## §5 The applicability map — the R28-ruled areas → the demonstrated patterns

| R28-ruled area | The demonstrated pattern that already verifies this class | Where it lives | The T2 test-law shape it argues for |
|---|---|---|---|
| **D50 five pages + page-key tests (⌘1-⌘5)** | (a) The keymap twin contract: doc-map integrity gate + family coverage lists + the behavioral twin firing real KeyboardEvents (`nle-ui/src/lib/shortcutMap.test.ts:10-96` + `useShortcuts.test.tsx`); (b) the per-page view-state memory pinned at the store level (`pageTimelineView: Record<Page, PageTimelineView>`, seeded per page — mock `useUiStore.ts:748, :1249-1252`); (c) the dock tab assertions (5 tabs; the Audio tab is a TOGGLE — re-click exits focus, `AppDock.tsx:57-60`); (d) the app tier driving keys through the REAL mounted shell (`wire-coverage.test.tsx:114-118`). | three tiers | **A page-completeness accumulator**: every page key + every dock tab driven through the real mounted UI, unioned, then gated against the declared page set — the D50 "five pages, two pinned as modes" law expressed as a closed set with a live registry (the Audio-page-as-mode duality needs BOTH assertion families: page-keyed store laws AND activation-grammar laws — D50-F2's verified coherence). |
| **D48 marker v2 (duration + notes; label synthesized)** | The mock already pins the range law (`updateMarker`: `≥1/24` frame grid, end ≤ sceneDuration, `null`→point, the SS3 identity-after-normalization guard — `useUiStore.ts:1534-1549`); MarkerInspector.test 10 its; the Ruler bracket pins; the reference HTML's dialog shape (`ui-mock/timeline-marker-transcript-withDialog.html:88-130`). | mock + reference | **Range-normalization pins at the model layer + the bridge-drift gate at the app layer**: the sceneBridge currently DROPS `duration` both directions (`sceneBridge.ts:375-379, :557-560`) — only the app tier can close that; the test law should name the bridge as the assertion site (forward AND backward mapping, the notes→label synthesis is exactly the round-trip hole review-d48 F1 filed). |
| **D49 captions (track-kind hybrid, per-language)** | CaptionInspector.test 10 its; the **elementAtTime exclusion law** (`mockData.ts:353-363` — captions never ops: scans `['overlay','main']` only); the Viewer burn-in chips + `captionHitsAt` (`Viewer.tsx:71-76, :547-571`); the fixture pins (5 text elements, frame-clean @24, `language:'en'`, badge CC — `mockData.test.ts:63-80`). | mock | **The exclusion law as a first-class pin**: captions' whole rendering contract is "participates in burn-in, NEVER in the composition ops" — pin both halves. The per-language uniqueness (DESCRIPTIVE v1, one-track-per-language, r5 enforcement) maps to the fixture-invariant pattern (id-uniqueness style). |
| **The FX grammar (fxMode one-flag, the fifth page)** | The battery's fxMode gates: "fxMode renders the zones; absence otherwise" (`Timeline.test.tsx:1546+`); seam-zone click laws (apply-default / select-existing, `:1631+`); the transition box interactive ONLY in fxMode (`:1867+`, the pointerEvents source pin from review-findings); the fxMode context-menu router (`:1997+`); FxBrowser/FxInspector suites; the one-flag law itself pinned in the store ("written ONLY by setTool and setPage", `useUiStore.ts:563-567`). | mock | **Mode-gating as a two-sided pin**: every fx surface asserts BOTH the presence-when-active AND the absence-when-inactive (the "absence otherwise" half is the dormancy fence — the RA-V2-2/3 class the app tier fences with the AR-2 pin). |
| **The gesture-seam surfaces (the R28 grammar areas)** | The app's gesture-commit sims with engine-truth assertions (§2.1d); the dragEvent/rect-stub jsdom laws (§2.1c); the mock's 2D cross-track battery with ghost-preview + history-count + toast-honesty (§4.2); the REPLAY preview==commit equivalence (§4.5); the wireLog origin-attribution law (`origin: 'ui'`). | app + mock | **Three-leg law per gesture**: (1) the preview state (ghost/filter string/DOM attr), (2) the commit (engine truth or store truth + exactly-one history entry), (3) the routing (wireLog type + origin 'ui'). The REPLAY equivalence is the model-layer fourth leg where the surface is pure data. |

### The 3 strongest applicability recommendations

1. **Spec-side completeness machine-checks on the closed-set + live-registry pattern** (the wire-coverage architecture, §2.1): every spec-declared closed surface (the page set D50, the wire union's 78-member census, the exception registries) should be consumed by its test law as a LIVE import from the one home (never a mirrored copy — the RC-V1 P2 stale-mirror incident is the canonical failure), accumulated through the real mounted surface, and closed with direct array diffs (`missing`/`stale` both empty + the size identity) so the failure output NAMES the drifted member. The tsc-lockstep both-direction asserts (`api.ts:230-246`) make registry drift a compilation error — adopt that for every spec-side exception table.
2. **The DOM-attribute rendering contract as the jsdom-verifiable form of every rendering law** (the data-ops pattern, §2.2): where the spec states a rendering/preview law (filters, grade final-pass, composition counts, caption burn-in), the test law should mandate an attribute- or string-level contract surface (`data-*`, joined filter strings, aria-labels) because raster and layout are absent in jsdom — the mock tier's ghost `style.left` = resolved preview time is the same pattern. "The ops' filter strings ARE the preview contract" is a directly portable test-law sentence.
3. **The two-tier visual verification net with exit gates** (§4.8): the VLM story net (capture at the registered floor with the iframe-width law → rubric review with defensive parsing + retries → P1/P2/P3 findings) + the console-clean mount sweep + the interaction battery zero-error, with **fresh post-fix probes required to read 0-P1-0-P2 before WRAP** — the R25 exit-gate shape. Reserve it for layout/legibility/visual-integrity claims (the class the jsdom battery cannot see), and record BOTH collector figures (runner vs line-start) at every WRAP — the 1,950/1,939 reconciliation law.

---

## §6 Honest limits — what the mocks CAN'T prove (the class only the real app tier can)

1. **No engine, no truth anchor.** The mocks' store is the SSOT by construction — every assertion is self-referential against the mock's own model. Cross-model drift (the mock's JKL law vs the port's JKL law; the mock's trim math vs the engine's) is INVISIBLE at the mock tier; only the app tier asserts engine reads after gestures (`getElement(...).startTime` — §2.1d). The mock battery proves the mock's internal coherence, never the product's.
2. **The jsdom absences are structural, not stubbed away.** No layout (`getBoundingClientRect` = zeros — the batteries hand-feed rect stubs, which makes the pixel math work but means real wrap/overflow/layout regressions pass silently; the VLM net is the only partial answer). No raster (canvas 2d null — data-ops is a proxy contract, not pixels). No DragEvent (the MouseEvent+dataTransfer shim loses drag semantics beyond coords). No AudioContext (the shim's paramWrites prove the write, never the DSP; "real audio" is untestable at this tier). No real rAF (the 16 ms setTimeout stub + fake timers + mocked performance.now — timing laws are approximations of the law, pinned against the mock clock, not wall behavior).
3. **The VLM net's own limits.** Static shots only — no interaction, no state, no motion; heuristic strictness with an explicit "do not invent issues" calibration and an ERR column (42 error entries in the 124-story baseline corpus — call flakiness is real, findings need adjudication before they become fix rounds); even its census needed reconciliation law (the 124-on-disk vs 126-declared story gap — collector differences must be recorded, not silently trusted).
4. **The app-tier-only classes** (the K3 roof's monopoly): boundary composition through the closed exports map + live-source symlink (the package boundary is BREAKABLE only here); the pin-bump-as-validation-record (vendor SHA = "validated-against"); the port-census byte-exactness machinery and its mutation gate; the wire routing + `origin: 'ui'` attribution; the zero-no-op end-to-end (store write → real gain node); the cross-package drift that a re-pin exposes (the AR-2 fencing incident — a gesture can go dormant at ANY layer and only the app-tier gate fails).
5. **Declaration-order and LIFO dependence is load-bearing but fragile-by-design.** The completeness machine-check's power comes from the accumulator + the last-test gate + the afterEach union running before cleanup — the law is frozen in words at the top of the file BECAUSE the mechanism is invisible when it works. A spec-side test-law that copies the pattern must copy the words (the fail-loud note) or the first refactor silently neuters the gate.

---

*Output of Task R28-T1-c. Companion files: `scout-register.md` (the suite-count pin method + WRAP re-key), `scout-app.md` (the app module card), `scout-engine.md`/`scout-wdc.md` (the engine/WDC cards). The T2 spec-side test-law design should treat §2.1, §2.2 and §4.8 as its three load-bearing precedents.*

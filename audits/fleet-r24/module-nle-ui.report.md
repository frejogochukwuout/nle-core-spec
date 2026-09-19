# Module Card — nle-ui (the PACKAGE — the shell UI surface) — Fleet R24, Task R24-1d

- **Auditor:** research-only sub-agent (R24-1d). No repo files edited; no mutating git commands; this file is the sole write.
- **Sandbox note:** `node_modules/` was absent; installed via `npm ci` from the committed lockfile (node_modules is `.gitignore`d; `git status --porcelain` = 0 changes before/after) so vitest/tsc/boundary could RUN LIVE. Storybook build not re-run (cost; CI evidence cited).

---

## 1. VERIFIED STATE

| Item | Value | Authority |
|---|---|---|
| HEAD | `fc4cc35ec85333617e6f22f4acedce804bb83aaf` — "R8 wrap: worklog + HANDOFF refreshed…" — `main` == `origin/main`, working tree clean | live git |
| Tests | **674/674 PASSED — RUN LIVE** (`npx vitest run`: 37 files, 137.8s, 0 failures) | **local execution at fc4cc35** (commit claim 674/674 @ 1360d78 → verified exact) |
| Typecheck | `tsc --noEmit` → exit 0 | local execution |
| Boundary (zero-engine-imports law) | `node scripts/check-boundary.mjs` → `boundary check: OK (package src is engine-free — no vendor/engine imports)` | local execution |
| Boundary law mechanics | regex walk over every `src/**` .ts/.tsx/.mjs/.js/.css forbidding `vendor/`, `opencut-timeline`, `nle-engine`, `web-daw-core` imports (`scripts/check-boundary.mjs:19-31`); engines bind only in the consuming app via the timelineRouter/meter seams; runs in CI on every push (`.github/workflows/ci.yml`: typecheck + vitest + boundary; second job: build-storybook + the R4 CSS-gate outcome check) | live read |
| Stories | **74** — grep census: 76 named CSF exports across 10 story files minus the 2 `decorators.tsx` exports (`withStoreReset`, `withVariantProvider`) = 74 stories | static grep (build-storybook NOT re-run; CI storybook+CSS gate green per HANDOFF/1360d78) |
| Consumer pin | app repo (`nle-test-app`, now at `c885ece`) pins `vendor/nle-ui` @ **fc4cc35** (`file:./vendor/nle-ui`, git submodule status) — zero lag | live read |

Test-count authority is **stronger than commit evidence**: full suite executed in this audit.

---

## 2. THE LANDING LIST since 85dcf57 (8 commits, R23 baseline 648 tests)

**Pre-wave seal/docs (2):**
- `4d40a57` docs: seal-round worklog entry (F1/F5/F3/F7 — speed patch-split, JKL router routing, clip-gain slider true dB, Inspector real Gain).
- `778e913` merge origin/main.

**D29 seam waves (3 + 1 merge) — the R8 "full-wiring" package half:**
- `9b0a36c` **W2.3 — saveState autosave lifecycle seam** (+11 pins, 648→659): store `saveState 'idle'|'dirty'|'saving'|'saved'` + `setSaveState` (view state, no history entry; no savedSnapshotKey twin — the app's service owns dirty computation); the three `past.length` proxies swap when a service drives the field: ⌘S real-dirty gate ('saving' counts as unsaved), beforeunload arms on dirty/saving, StatusStrip dual-world machine. Mock-world 600ms theater + simulateSaveFail drill survive verbatim in the 'idle' default. (+ `db2a37b` merge.)
- `3f78df4` **W2.4 — DeliverPage exportRequest seam** (+7 pins, 659→666): optional engine-free `exportRequest` contract prop threaded through AppShell; present = job rows driven by the promise (queued→running(progress+stage)→done/cancelled/failed, warnings badge, Reveal opens blob URL, Cancel aborts ref-held AbortController, AbortError = distinct cancelled state, Retry re-runs same settings); absent = honest mock verbatim; fcpxml stays mock in BOTH worlds. Barrel: TYPE-ONLY exports (5 shapes).
- `7280372` **W2.5 — per-scene color grade sidecar + ColorPage LIVE sliders** (+8 pins, 666→674): `color: Record<sceneId, SceneGrade>` ({contrast,saturation,brightness,hue} CSS-filter domain, 1/1/1/0 neutral) + `setGrade` (MERGES into neutral-seeded record; new record ref every write; G-slice view-state law — no history entry, never in SceneJSON); ColorPage Contrast/Saturation sliders store-driven (−100..100 ⇄ 0..2), per-scene swap on scene switch; Pivot + Qualifier hue honest-local; LUT/wheels stay mock.

**R8-REV (1):**
- `1360d78` **R8-REV #1 (P3)**: retryJob revokes the previous run's blob URL before clearing it (orphaned encoded Blob, tens of MB per 1080p master, per retry). 674/674.

**R8 wrap (1):**
- `fc4cc35` docs: worklog/HANDOFF/PLAN R8 section + SKILL R8 laws (load-effect deps class, vitest console-buffering illusion, merge-preserve trap, dispatch-gap audit law, sub-agent timeout protocol, React input-event pattern, StrictMode lastBuilt).

---

## 3. THE SEAM SURFACE NOW (the engine-free contracts the app drives)

**A. AppShell prop seams** (`src/components/shell/AppShell.tsx:208-227`) — 4 optional props, each absent = honest mock world:
1. `timelineRegion?: ReactNode` (R3/D22 slot; default MockTimelineRegion).
2. `mediaDragSource?` (D22d pool-drag workaround; structural type).
3. `programMonitor?: ProgramMonitorRender` (R7/N1 viewer frame seam; `ProgramMonitorInfo {elementId, mediaId, playheadSec}` :229-239).
4. `exportRequest?: DeliverExportRequest` (W2.4/D29, threaded to DeliverPage :305).

**B. D29 store view-state sidecars:**
- **saveState + setSaveState** (`src/state/useUiStore.ts:21-28,122,195,597`): default `'idle'` IS the world discriminator; the package never writes non-idle.
  - **⌘S real-dirty gate** (`src/hooks/useShortcuts.ts:299-315`): `realDirty = saveState==='dirty'||'saving'` (a write in flight can be re-flushed); mock-world fallback `idle && (past.length>0 || saveAttempt>0)`; else the honest "Nothing to save" toast.
  - **beforeunload guard** (`AppShell.tsx:179-195`): arms on dirty/saving (service world) or `past.length>0` (idle); scene.dirty tab dots deliberately not counted.
  - **StatusStrip dual-world** (`StatusStrip.tsx:5-15,37,92`): service world maps store truth 1:1 — new "Unsaved changes" chip (:100-105), Saved stamp on the real saving→saved transition (:76-79); idle keeps the 600ms theater + simulateSaveFail/retrySave drill verbatim (:47-72).
- **color grade sidecar + setGrade** (`useUiStore.ts:30-47,123-126,199,268-271,599-604`): `SceneGrade {contrast,saturation,brightness,hue}` CSS-filter domain (1/1/1/0 neutral); setGrade merges a Partial into a NEUTRAL-seeded record (a partial must never persist a partial record — the DEFAULT_MIXER_TRACK discipline), new record ref per write (the app's persistence identity-key rides it); view-state (no history, not in SceneJSON — the engine mirror never touches it; app persistence carries the snapshot). ColorPage: Contrast + Saturation LIVE, store-driven (`ColorPage.tsx:22-25,110,114`; slider −100..100 ⇄ grade 0..2), follow scene switches; Pivot + Qualifier-hue honest-LOCAL (marked, no store write :113,169); brightness/hue contract-complete but slider-less v1 (honest-subset rule); first-touch toast states exactly what's live (:81).

**C. DeliverPage exportRequest contract** (`src/components/pages/DeliverPage.tsx:37-91`) — the 4 shape types:
- `DeliverSettings {preset:'fcpxml'|'master'|'frame'; range:'inout'|'full'; resolution:'1080'|'2160'; bundleMedia:boolean}` (:42-47)
- `NleRenderProgressLike {stage?,ratio?,totalFrames?,frame?}` (:52-57)
- `DeliverEffectiveSettings {mode,codec,audioCodec,container,quality,resolution{w,h},fps,videoBitrate?,audioBitrate?}` (:61-71)
- `DeliverExportResult {blobUrl,fileName,warnings[],effectiveSettings?,fileSize,durationSec}` (:75-82)
- `DeliverExportRequest(settings,{onProgress,signal}) → Promise<DeliverExportResult>` (:88-91); abort = DOMException AbortError → 'cancelled'.
Runtime behavior: progress→running (:172-183); done→real fileName/size/warnings + Reveal opens the blob URL (:185-201, :298-304); Cancel aborts only (:267-269); failed message rides the row (:202-213); Retry re-runs the SAME settings in place and **revokes the previous blob URL first** (:273-294, R8-REV#1 at :278-281); fixture rows never gain Cancel; fcpxml mock in both worlds (:252-260, spec-10 future toast, no row).

**D. timelineRouter seam (D28 + T-round)** (`src/state/timelineRouter.ts`): `setTimelineRouter/getTimelineRouter`; `TimelineRouter` interface — `dispatch(cmd: TimelineEditCommand): boolean` (single-writer; boolean = final, never a mock-fallback trigger :70-73); `patch` member carries name/hidden/volume/**speed**/**transitionOut** (S3-F1/T-round D-T1, :102-112); `toggleTrackMute/Visibility/**Lock**` + `setAllTracksMuted/Locked` (:42-59). `toggleTrackCmd('locked')` routes to the engine when attached (T-round D-T2, `useUiStore.ts:619-632` — the engine field is SSOT; store-side lock writes mirror-clobbered).

**E. meterRegistry (D24a)**: `useMeter/setMeterSnapshot/setMockMeterSimEnabled/resetMeterRegistry/clearMeterKey` (the app swaps the producer; mock sim disabled app-side).

**F. the store + mock document model**: `useUi` (the app's mirror/glue reads-writes it) + `project/media/sceneDuration` + 13 JSON types (sceneBridge converts ⇄ TScene).

**Barrel discipline:** W2.4/W2.5 exports are TYPE-ONLY (runtime surface untouched) — `src/index.ts:20-29` (5 deliver types), `:33-36` (SceneGrade). Exports map pins exactly `.` / `./styles.css` / `./testing` (deep imports die at resolution; boundary script guards the filesystem escape).

### (a) Honest-mock ledger (still mock, marked honest)
- **ColorPage**: LUT select (display state; preview "lands with the render round, spec 08") + 4 wheels (static `role="img"`); Pivot/Qualifier local; brightness/hue slider-less.
- **fcpxml preset** — mock in BOTH worlds (spec-10 future; toast, no row).
- **DeliverPage fixture rows** j-0..j-3 (static; Retry/Reveal = honest toasts).
- **StatusStrip idle theater** (600ms save cycle, simulateSaveFail drill) + the hardcoded `OPFS · local` storage label (:135 — the Z7 truth row queued).
- **Inspector Pan** — mock-local, marked not-persisted (F7); **EffectsPanel** — compact 8-effect mock library (click = honest toast; drag → store-domain addEffectToElement).
- **MockTimelineRegion** (package-default mock clock/lanes), **mockMixer sim** (app disables), **mock media records** (real decode is app-side U12, by design), **⌘S mock-world saveNow** theater.
- **Load/Save-As FILE affordance** (W2.3 remainder — service API complete + pinned; affordance pending).
- CheatSheet: honest implemented-set ledger (53 rows), router-aware engine badges.

### (b) C0 MiniShell state — NOT STARTED (queued, and not even filed package-side)
No MiniShell or chrome-family component exists in `src/` (census below: only the full AppShell family). The spec's S-package first action — C0 MiniShell, `IMPLEMENTATION-PLAN.md:22` ("the w1-prep chrome family: Topbar/Inspector frame/MediaPool frame/Splitter+R18j laws/Toast role=alert/Viewer frame + tokens/qc- CSS; slots-compatible; zero engine imports") and `18-ui-shell.md:20` ("Verified still-open @ 85dcf57 — no MiniShell component exists in the package yet") — remains queued. **nle-ui's own PLAN.md has NO C0/MiniShell row** (filing gap — the spec expects the queue "filed in nle-ui's PLAN queue"); `.agents/SHELL-MINI.md` records the R7 verdict: CONTINUE THE FULL SHELL, the mini is a harvest source (8 candidates + 9-law ledger).

### (c) Storybook state
74 stories across 10 CSF files (grep-verified; build-storybook + CSS gate in CI; HANDOFF claims 74 + CSS gate green at 1360d78). The VLM visual net lives in the variants repo, not here.

### (d) Queue vs landed
- **OT S-round queue** (filed in nle-ui PLAN.md:204-223, both `[ ]` unchecked): **P-widen (patch.transitionOut) — LANDED** (`timelineRouter.ts:112`, "T-round (D-T1, review R1-A F-1)"; spec `19-code-references.md:212` confirms "the OT S-round follow-ups landed with the T-round wave B"); **P-lock-route — LANDED** (`toggleTrackLock` interface `timelineRouter.ts:48`; routing `useUiStore.ts:626-630`). Both PLAN rows are stale (landed-but-unticked).
- **App D30 W-D package edits** (designed in `nle-test-app/docs/design-r9-d30.md:183-186, 246-250`): R6 yield-set 'r' key (`useShortcuts.ts:417` still unconditionally `setTool('ripple')`), Z5 Inspector video-tab A/V link toggle (no link toggle exists in Inspector today — store view state per design :164-171), Z7 StatusStrip truth rows + storage prop, cheat-sheet dual-world truth rows, Viewer scrub-row `data-transport` attr (no `data-transport` anywhere in src), (e) ColorPage Brightness/Hue sliders. **ALL QUEUED — none landed; none filed in nle-ui's own PLAN** (filed app-side only). The promised "DECISIONS D30 entry (nle-ui .agents/DECISIONS.md)" (design-r9-d30.md:258) does not exist.
- **Doc gap:** nle-ui `.agents/DECISIONS.md` ends at **D28** — neither D29 (lives as `nle-test-app/docs/design-r8-d29.md`) nor D30 was filed package-side, despite HANDOFF's "D22–D29" pointer.

---

## 4. THE QUEUE (the package's own next-step list, in order)

From PLAN R8 unchecked (`.agents/PLAN.md:245-249`) + HANDOFF next-session scope (`.agents/HANDOFF.md:64-84`):
1. **PR snapshots + disposition comments on the R8 wave** (coderabbit poll on both PR #1s; fold main-landing docs commits into the next round's snapshot).
2. **W2.3's Load/Save-As file affordance** (S; the service API is complete + pinned).
3. **Upstream-back the bf9be13 hardening hunks to opencut-timeline.**
4. **Frozen-grammar re-pin batch F1–F4** (maintainer's call, ONE batch: F1 marquee 4→5px, F2 MIN_DUR engine-check, F3 rides T1).
5. **W3 remainder** (D15 fader drag split, D16 track-header audio row + undoable renameTrack + EditableLabel, D17 canvas waveform) + **the LUT/wheels GPU fidelity path** (L).
6. **T1 view-math port** (R6-b, L-effort — "the single highest-value upstream item left": pixel.ts + zoomController + rulerTiers; re-pin zoom domain 8–240→5–5000).
Carried: W2b semantics rows + the Deferred list (EngineAdapter interface, spec-15 wire transport, lane virtualization, real media decode/peaks, Playwright real-mouse round, a11y ratchet SB gate); engine-repo seam-queue follow-ups; SHELL-MINI's 8 harvest candidates.
External (needs filing + landing + re-pin): the D30 W-D package edits above.

---

## 5. CENSUS FACTS

- **94 tracked files** under `src/` (git ls-files).
- **28 non-test component .tsx** — shell 12 (AppShell, Toolbar2, MediaPool, Viewer, Inspector, StatusStrip, AppDock, CheatSheet, ErrorBoundary, ConfirmDialog, ToastRegion, ContextMenu), timeline 7 (Timeline, Ruler, Clip, TrackHeader, SceneTabs, TimelineToolbar, MockTimelineRegion), mixer 5 (ChannelStrip, ChannelEditor, MixerPrimitives, MixerDock, SoundLibrary), pages 2 (ColorPage, DeliverPage), debug 2 (VariantProvider, DebugOverlay) — + 26 component test files.
- **37 test suites / 674 tests** (vitest ran 37 files; the 40 "test"-path files minus the 3 infra files setup.ts/helpers.tsx/public.ts).
- **10 story files, 74 stories**; `shortcutMap.ts` = **53 cheat-sheet rows** (the spec-16 "53 rows" claim is still accurate).
- **State**: useUiStore.ts (1,116 lines), timelineRouter.ts, meterRegistry.ts, mockMixer.ts, variantHooks.ts. **Lib**: timecode, waveform, shortcutMap, mockData, edgeScroll, variants.
- **Exports surface** (src/index.ts + exports map): runtime — AppShell (+ AppShellProps/ProgramMonitorInfo/ProgramMonitorRender), CheatSheet, ErrorBoundary, useConfirm/ConfirmFn, VariantProvider, DebugOverlay, useUi, setTimelineRouter/getTimelineRouter (+ TimelineRouter/TimelineEditCommand), 6 meterRegistry entries, project/media/sceneDuration/TRANSITION_PRESENTATIONS + 11 types; TYPE-ONLY — DeliverExportRequest, DeliverSettings, DeliverExportResult, DeliverEffectiveSettings, NleRenderProgressLike, SceneGrade. Map: `.`→src/index.ts, `./styles.css`→src/styles/app.css, `./testing`→src/test/public.ts.
- **Consumer usage** (nle-test-app, non-test): AppShell, ErrorBoundary, DebugOverlay, CheatSheet, VariantProvider, useUi, setTimelineRouter (+ router/edit-command types), project/media/sceneDuration, useConfirm, SceneJSON + the W2.4 deliver types + SceneGrade + the meterRegistry API.
- Zero engine dependencies (peer: react, zustand, lucide-react; engines bind app-side).

---

## 6. SPEC-FACING STALENESS (read-only; 18-ui-shell.md + 16-keyboard-shortcuts.md §0)

1. **`18-ui-shell.md:15` (+ status `:4`)** — §0 BASE pins "nle-ui `85dcf57`; **648 tests**; consumer pin `85dcf57`" — **STALE**: fc4cc35 / 674 / app pin fc4cc35; the three D29 seams (saveState lifecycle, exportRequest, color grade) are unrecorded anywhere in the spec.
2. **`18-ui-shell.md:25`** — "The OT S-round queue … P-widen … P-lock-route … **Verified still-open @ `85dcf57`**" — **CONTRADICTED**: both landed in the package (`timelineRouter.ts:112` patch.transitionOut; `useUiStore.ts:626-630` locked routes via `toggleTrackLock`); spec 19-code-references.md:212 already records them landed — 18 §0 was never updated.
3. **`18-ui-shell.md:17`** — "AppShell + slots (`timelineRegion`/`programMonitor`/`mediaDragSource`)" — **MISSED/SUPERSEDED**: the W2.4 fourth slot `exportRequest` (AppShell.tsx:226) is absent from the slot inventory.
4. **`18-ui-shell.md:28`** — "The color page's REAL engine binding — the mock's W4 math bound to the engine pipeline (**W-color → r3**)" — **PARTIALLY SUPERSEDED**: W2.5 landed the per-scene grade sidecar with LIVE Contrast/Saturation driving the app's ProgramCanvas final pass (v1); only LUT/wheels/GPU-fidelity remain future. The row reads as wholly-future.
5. **`18-ui-shell.md:20`** — MiniShell "Verified still-open @ `85dcf57`" — the FACT still holds at fc4cc35 (no MiniShell component; C0 unfiled in nle-ui PLAN) but the verification pin is stale; the row needs re-pinning, and the nle-ui PLAN filing gap means the spec's expectation ("filed in nle-ui's PLAN queue") is unmet for C0.
6. **`16-keyboard-shortcuts.md:17` + `:30` (+ status `:4`)** — "nle-ui @ `85dcf57` — **648/648**" / "BASE acceptance = … **nle-ui 648**" — **STALE**: 674 @ fc4cc35; the D29 ⌘S semantics changed too (real-dirty gate; 'saving' re-flush; service-world honest Nothing-to-save). The "53 cheat-sheet rows" claim (:17, :20) remains ACCURATE (verified 53). **MISSED**: the D30 R6 'r'-key yield-set divergence (engine world: the port owns 'r'; nle-ui `useShortcuts.ts:417` unconditionally maps r→ripple tool) is registered only app-side (design-r9-d30.md:97-103), not in spec 16 §0.

---

### Bottom line
The R8/D29 round landed exactly as claimed (674/674 verified by live run; tsc 0; boundary OK): the package now exposes **four optional prop seams** (timelineRegion, mediaDragSource, programMonitor, exportRequest) + **two view-state sidecar seams** (saveState, color/setGrade) + the D28 dispatch router — every seam with the absent-present world discipline pinned and Storybook honest. Remaining debt is documentation-shaped (DECISIONS ends at D28; PLAN's OT-queue rows landed-but-unticked; C0 MiniShell + the D30 W-D edits designed-but-unfiled) plus the long-queued W3 remainder, T1 view-math port, and the LUT/wheels GPU path.

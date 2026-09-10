# MODULE CARD — opencut-timeline (OT) — Fleet R24 audit (R24-1a)

**Repo:** `/home/z/my-project/opencut-timeline` (github.com/bearachprema/opencut-timeline, mirrored to GitLab). **Auditor mode:** research-only; tree left clean. **Date:** 2026-09-07 (post session-15).

---

## 1. VERIFIED STATE

- **HEAD:** `ded43c431bcc1ae4114956250e90220a6a7cb224` (`ded43c4`, `main`), working tree clean, both remotes current per `.agents/HANDOFF.md:19-21`.
- **Code tip:** `c15a629` (worklog session-14 close-out) is the last code-relevant commit — **verified**: `git diff --stat c15a629..ded43c4 -- src/` is EMPTY. `ded43c4`, `b02d3c8`, `d40c1f5` are docs + runner-artifact commits.
- **Tests — RUN LIVE THIS AUDIT (not report-json authority):** dev server started via `bun run dev` on :3001 (Playwright `chromium_headless_shell-1243` installed this session; the pre-existing `bunx next dev` path 500s with a React `useInsertionEffect` null error — `bun run dev` works). `node scripts/run-timeline-tests.mjs` → **536/536 passed, 0 failed, 59 milestone entries** (report: `download/timeline-test-report.json`; exit consulted by the zero-test guard). Split from the fresh report: **386 in-page tests / 41 entries (incl. M49C) + 150 real-mouse tests / 18 entries** (M17 + 14 `*R` suites + M49T/H/R/G). All 24 wire verbs + coverage gate PASS (`[runner] coverage gate: PASS — fired 24 distinct command types across the UI phases; 6 documented exceptions; no gaps`).
  - *Hygiene note:* `npx playwright install` pinned devDependency versions in `package.json` + created `package-lock.json` (both reverted/deleted); the three regenerated `download/*` artifacts were `git checkout`-restored. Tree clean after audit.
- **tsc:** `bunx tsc --noEmit` → exit 0 (clean).

## 2. THE LANDING LIST (38 commits, `git log 222532c..ded43c4`)

Range topology note: `222532c` sits on the "verified reconstruction" line (S3/M46 state); the range ALSO contains the parallel session-12/13 line (merge-base with 222532c = `05584d8`), reconciled by merge `04919d1`.

**T-round + W10F hardening campaign (sessions 12-13, parallel line):**
- `0fa3925` T-round wave A: D-T3 `setTracksLocked` (lock-all, batch-atomic) + D-T7 move same-position TRUE-NOOP + `track.setAllLocked` wire echo + M44 (15 pins)
- `ff1a3a8` W10F round-1 fix wave + M45 (13 pins): applyBatch redo preservation, wire update-overlap, homogeneous inserts, button gates, seam-vanish cancels, buttons-mask family, StrictMode generation-token
- `e7e3548` M45 pin sharpening (element middle-button pin drags past threshold)
- `9d3c4c7` M46 (4 pins): applyBatch redo-outcome matrix + absent-field NOOP predicate (T-round line; folds post-merge)
- `6479341` worklog: session-13 recovery entry
- `c5b5b24` W10F round-3 fix wave + M47 (12 pins): marquee expanded-lane row math (P1), commit-before-notify, pair-scoped wire resolution, createTracks validation, non-array guards, stale-pair NOT_FOUND, playhead button family, marquee mask, element fps-null drop-clear, seek selection ordering
- `00eb5a1` M47 pin sharpening (twin-duration fallback geometry; control half)
- `3225106` R3-C pin-quality fixes (6)
- `c4ed3bd` Round-4 closure: the two P3 residuals (doubled `timeline.timeline.*` prefixes; cancelRef → useCommittedRef)
- `40344dd` DECISIONS #24 (button-family law, commit-before-notify, pair-scoped validation, wire-owned invariants, rendered-stack marquee geometry, dying-reviewer mutant law)
- `73a2c3a` SKILL gotchas 49-52; `8699bd6` HANDOFF W10F complete (503/503); `84947f7` worklog rounds 3-4; `27ea07f` closing verification 503/503 @ 84947f7

**Post-baseline merges + the W11 complete-UI round (session 14):**
- `b47ca87` runner artifacts refresh (M48 proof cycle); `6bb01d3` port `setTracksMuted` + `track.setAllMuted` from the parallel stream (F1C-1-normalized predicate) + M48 (5 pins); `04919d1` merge origin/main (reconciliation); `e49524e` worklog session-14 open
- `a73933c` W11 design v1; `f5658ed` W11 design v2 (3-reviewer amendments folded — `reviews/w11-design.md`)
- `56dcd8f` **W11-a engine widenings**: HeadlessTimelineApi attach (SA-5 fps/instance validation) + dispatch recorder (ring 500 + coverage Set) + WIRE_COMMAND_TYPES (tsc-lockstep) + applyBatch data.results + keyframe-verb TRACK_LOCKED + M49 (6 pins, mutant-proven 6/6 per `a08058d`)
- `2acd8b6` **W11-b dispatch migration**: useWireDispatch + command-verb migration (actions hook, context menus, label buttons, bookmark seek) + wire-error chip + stable `__VIEW_TEST__`
- `b64ed5a` **W11-c transport**: JKL ladder, rate control, loop region + overlays + M49T (5 pins incl. wrap laws)
- `56f8634` **W11-d track heads**: label-lock + lock-all/mute-all in the frozen 38px spacer + track.add + M49H (5 pins)
- `fa0c478` **W11-e residual affordances**: bookmark remove, library batch insert, save/load swap protocol + M49R (4 pins)
- `c9b11e6` **W11-f gesture commits**: move/patch/bookmark/insert cross the wire + TRACK_LOCKED drivers + M49G (7 pins)
- `ca91223` **W11-g coverage gate** (M49C); `94458bc` W11-g runner hardening (failed setup fails the suite)
- `820199d` DECISIONS #25; `3bf4aed` SEAMS W11 seam map; `0b3569f` SKILL gotchas 53-60; `3d9b24a` PLAN close; `f4a1930` HANDOFF close; `c15a629` worklog close (**last code commit**)

**Session-15 serving round + op-parity audit:**
- `d40c1f5` session-15: full-coverage re-verification post-restore (536/536 through the dev server, artifacts refreshed)
- `b02d3c8` session-15: the standing user-facing topology — `/home/z/opencut-timeline` → **:3001** (engine server, runner + real-mouse target, `bun run dev`), second clone `/home/z/opencut-timeline-app` → **:3000** (user-facing; platform gateway `FC_CUSTOM_LISTEN_PORT=81` caddy routes `preview-<bot-id>.space-z.ai` → container :81 → localhost:3000 by default; 385/385 in-browser verified). ⚠️ `package.json` `dev` is hardcoded `-p 3001`; the :3000 instance MUST be launched via `scripts/container-helpers/daemonize.py -- bunx next dev -p 3000` (HANDOFF:54-58).
- `ded43c4` **op-surface parity audit** (`.agents/OP-COVERAGE.md`) vs opencut-classic @ cf5e79e: **11/11 NLE edit verbs** ported (insert, move, trim, split×3, delete, ripple-delete, duplicate, retime-math, snapping) each with engine op + wire verb + UI affordance + pins; omissions all documented scope cuts (clipboard = app-shell, audio-separation = WASM, effects/masks = compositor domain, graph editor = W8-f stretch); **extensions beyond classic**: track lock + lock-all/mute-all, loop region, playback rate/JKL, ripple-delete first-class, save/load, wire error surface.

## 3. THE SEAM SURFACE NOW

**Wire-dispatch seam (DECISIONS #25, SEAMS:169-192):** `useWireDispatch({core, fps})` → `HeadlessTimelineApi(fps, {core, onApply})` — ONE engine (attach), recorder ON the api, error classification at the hook. Command verbs (toolbar, keyboard, menus, transport, label buttons, bookmark seek) + gesture commits (move / updateElements-patch / moveBookmark / insert, inside their wrappers) cross the wire; reads and view-state never route.

**The 30-name wire census → 24 routed + 6 exceptions** (`WIRE_COMMAND_TYPES`, `src/lib/timeline/headless/api.ts:182-213`; exception registry `scripts/run-timeline-tests.mjs:283-300`):
- **24 UI-routed verbs:** `timeline.{delete, duplicate, insert, move, moveBookmark, pause, play, redo, removeBookmark, rippleDelete, seek, setLoopRegion, setPlaybackRate, split, toggleBookmark, undo, updateElements}` (17) + `track.{add, remove, setAllLocked, setAllMuted, toggleLock, toggleMute, toggleVisibility}` (7).
- **6 documented exceptions:** `timeline.selectElements` (selection is VIEW state, remote-consumer verb), `timeline.upsertKeyframe` / `timeline.removeKeyframe` / `timeline.retimeKeyframe` (singular verbs — UI authors keyframes through the batch gesture paths, one-history-entry law), `timeline.advancePlayhead` (ticker is rAF-local), `timeline.trim` (uniform-delta verb; UI resize commits as updateElements patches).
- **What M49C actually asserts** (runner :301-336): reads WIRE_COMMAND_TYPES LIVE from the page (`window.__VIEW_TEST__.wireCommandTypes` — no driftable copy); accumulates the wire coverage Set node-side across phases (`mergeWireCoverage` before every freshPage; the Load swap carries the set); asserts every verb minus the registry fired through the real UI AND that no exception is stale. Drift is tsc-enforced at the constant (both-direction lockstep, api.ts:216-230).
- **W11 engine widenings (all verified in code):** `HeadlessTimelineApiOptions {core, onApply}` (api.ts:241-258; SA-5 fps/instance validation), recorder — `wireLog` bounded ring (cap 500, api.ts:260, 324-329) + `wireLogDropped` + unbounded `wireCoverage` Set + `wireReset`/`wireLogReset` (api.ts:305-318), `applyBatch` success `data.results` (per-command results), `lockPreCheck` on the singular keyframe verbs → TRACK_LOCKED (api.ts:340, 849, 904).

**PORT-LOCAL / view-surface sub-audit (at `c15a629` = HEAD code):**
- (a) **data-testid: ZERO** in `src/components/` (0 matches; 68 `data-test=` short-form sites — OT's own frozen convention, e.g. `data-test="wire-error"` in `use-wire-dispatch.ts`).
- (b) **PORT-LOCAL injectable props — NONE upstreamed.** `TimelineViewProps` (`TimelineView.tsx:177-201`): `core, fps, snappingEnabled, initialZoom, isShiftHeld, dragSource, mediaAssets, mediaLookup, wire (W11), onSaveScene, onLoadScene (W11)`. Absent: `initialSelectedIds`/`onSelectionChange`/`selectionIds` (selection is view-internal; zero matches at component-prop level), `zoom`/`onZoomChange` (zoom lives in `use-timeline-zoom`, no out-callback), `confirmDelete` (zero matches), `timeline-scroll` anchor id (zero; OT uses `data-test="timeline-tracks-scroll"`). `cancelRegistry` exists as an optional prop on `TimelineElementView` (:74) and `TimelineTrack` (:44) — but `TimelineView` CREATES its own registry (TimelineView.tsx:715-719), so it is NOT injectable from the shell. `EMPTY_CONTEXT_ITEMS`: not upstreamed (zero matches). `onViewStateChange`: exists only as an internal `useTimelineZoom` option (use-timeline-zoom.ts:70; `TimelineViewState = {zoomLevel, scrollLeft, playheadTime}`) — NOT on TimelineViewProps.
- (c) **View-config surface: NOT present.** No zoom-ladder config (zoom is a continuous clamped value; the hook takes only `minZoom`); `rippleMode` is internal `useState` (TimelineView.tsx:237) threaded to the toolbar — no shell exposure.
- (d) **Theme surface: fixed dark only.** `theme.ts` = classic 1:1 constants port (TIMELINE_ELEMENT_BG, waveform colors, DEFAULT_TIMELINE_BOOKMARK_COLOR; 3 component consumers: TimelineElementView `thumbStyle`, AudioVolumeLine dB helpers, TimelineAudioWaveform colors). `src/app/globals.css` has fixed `:root` vars (--bg/--panel/--text/--muted/--accent...). No theme-injection or light/mini-mode surface — the D25 "token half" is not started.

## 4. THE QUEUE (OT's own next-step list — HANDOFF:85-99, PLAN:417-420)

1. **Spec-queue candidates** (DECISIONS #25 ruling 2): batch keyframe wire verbs + `timeline.insertBatch` (library multi-insert currently N history entries via `applyBatch([insert × N])`) — file to nle-core-spec when the queue is next visited.
2. **Consumer re-landing**: session-12's lost consumer waves (nle-ui Wave B / nle-engine Wave C / nle-test-app Wave D) still un-re-landed; check parallel-stream state first (active Sep 7); the engine-side surface they need (attach + recorder + data.results) is ready.
3. **P3 polish backlog** (standing): a11y depth, ~212 fixed sleeps → state polling, test-artifact hygiene, CI workflow, dead CSS.
4. **W8-f graph editor popover** (stretch goal, standing).
Session-start ritual: 536/536 + tsc clean + both servers (:3001 engine, :3000 user-facing) + `git pull` both remotes + PR #3 poll (merged at 47979cc).

## 5. CENSUS FACTS (verified at HEAD)

- `src/components/timeline`: **40** .ts/.tsx files (20 top-level + 20 in `hooks/`) — matches the 40-file claim.
- `src/lib/timeline`: **73** .ts files, **31,643 LOC** (27 milestone files under `testing/`).
- Components tree total: **8,604 LOC** (`src/components/**/*.ts(x)`). Key files: TimelineView.tsx 1,516L, TimelineElementView.tsx 883L, use-wire-dispatch.ts 90L.
- **Milestones: 59 entries** (M1–M49 + M49C) = 41 in-page entries (386 tests) + 18 real-mouse entries (150 tests). Real-mouse suites: M17, M19R, M21R, M22R, M23R, M24R, M25R, M28R, M30R, M34R, M37R, M40R, M41R, M43R, **M49T (5) / M49H (5) / M49R (4) / M49G (7)** = 21 W11 pins + M49C gate.
- `src/app`: 4 files (globals.css, layout.tsx, page.tsx 306L, view/page.tsx 610L).

## 6. SPEC-FACING STALENESS (05-timeline.md + 15-wire-protocol.md §0 only — NOT edited)

1. **05:14 (echoed :30, :4):** BASE row "OT @ `222532c` — 489/489 (359 in-page + 130 real-mouse across 51 milestone suites…)" — **superseded**: OT @ `ded43c4` (code tip `c15a629`), **536/536** (386 in-page + 150 real-mouse, 59 entries), run live this audit. The row also misses everything W11 (wire-dispatch routing, M49T/H/R/G/C, JKL divergence, op-parity audit).
2. **05:15:** view-tree row "39 files / ~7,700 LOC (TimelineView 1,221L … the 19-hook family)" — **stale**: 40 files / 8,604 LOC; TimelineView **1,516L**; hooks family now **20** (`use-wire-dispatch.ts` added W11-b); the tree now hosts the wire-dispatch UI layer (a structural fact the D25 single-tree law row doesn't know).
3. **05:16:** fork row "diverged from OT's 1,221L by PORT-LOCAL injectable props only" + "≥2 upstream waves behind (pre-F1)" — **both halves stale**: divergence is no longer props-only (OT added `wire`/`onSaveScene`/`onLoadScene` props + W11 routing the fork lacks), and the fork is now ≥4 waves behind (F1, W10F, M48, W11). Verified: NONE of the PORT-LOCAL props upstreamed at HEAD.
4. **05:28 (a)+(b):** D25-bridge checklist — still accurate that PORT-LOCAL props are NOT upstreamed and OT emits ZERO `data-testid`; but the row should note OT's 68 frozen `data-test=` short-form sites (the testid convention must supersede/alias them) and that `cancelRegistry` is internal-only at the TimelineView level.
5. **15:14:** BASE row pin "OT @ `222532c` … exactly 30 `applyInner` case arms" — the **30-name census still holds at HEAD** (WIRE_COMMAND_TYPES = 30, verified), but the pin/489-count is stale and the row misses the W11 wire state: 24 verbs UI-routed (M49C machine-checked), recorder/coverage Set, `applyBatch data.results`, keyframe lockPreCheck, and the UI's error-chip surface (NOOP-benign classification).
6. **15:22:** error-code coarseness row — annotation **understates** OT coverage: `TRACK_LOCKED` now also fires on the singular keyframe verbs and the UI classifies NOOP benign (DECISIONS #25 ruling 6); the ~24-code fine-grained envelope itself remains open (accurate as a gap).

*(05:25 view-config row and 05:27 `onViewStateChange` row remain accurate as OPEN gaps — verified absent at HEAD. 05:27's r1 phase tag unchanged.)*

---

**Bottom line:** OT at `ded43c4` is 536/536 (live-verified) + tsc clean, with the W11 wire-dispatch seam machine-checked (24/24 routed verbs, 6 exceptions, M49C) and classic op-parity self-audited at 11/11. The R23 spec baseline (222532c/489) and its view-tree/fork-divergence rows are now materially stale; the D25-bridge worklist (PORT-LOCAL props, testid convention, view-config surface, theme token half) is entirely still-open at OT's side.

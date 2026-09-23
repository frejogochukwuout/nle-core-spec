# SCOUT R15-B — opencut-timeline deep audit (HEAD 0412e41)

Task ID: R15-S2 · Agent: scout (read-only) · Date: 2026-09-05
Method: every claim below verified against the working tree at `0412e41` (git clean, main, 82 commits); the full test suite was EXECUTED in-session (`node scripts/run-timeline-tests.mjs` on a fresh `bun install` + `next dev -p 3001`); commit messages were cross-checked but never trusted alone. Feeds decisions: (a) evolve-in-place vs greenfield, (b) final NLE app assembly (OT = designated EDITING/UI domain).

---

## 1. Current inventory (exact)

**Git**: `main` @ `0412e41`, clean tree, 82 commits total. Baseline `4e39b67` (297/297, session 4) is 53 commits back; `0412e41` = `4e39b67` + W5 domains + W6/W7 seal + W8 UI round + W8-e polish + W9 full-repo review (verified: `git rev-list --count 4e39b67..0412e41` = 53).

**LOC by area** (`wc -l`, HEAD):

| Area | Path | LOC |
|---|---|---|
| Engine (pure lib) | `src/lib/timeline/**` minus controllers minus testing | **9,651** |
| Controllers | `src/lib/timeline/controllers/**` (11 files) | **3,190** |
| View (React) | `src/components/timeline/**` (15 .tsx + 21 .ts/hooks) | **7,413** |
| App shell (fixtures) | `src/app/**` (`/` runner + `/view`) | 1,988 |
| In-page test harness | `src/lib/timeline/testing/**` (20 files) | 12,357 |
| Real-mouse scripts | `scripts/*.mjs` (14 runner phases + capture) | 6,450 |

**Tests — EXECUTED today, not trusted from docs**: `423/423 passed, 0 failed (218,706 ms)`; split verified from the report JSON: **303 in-page tests across 32 suites (M1–M41) + 120 real-mouse tests across 13 phases (M17, M19R, M21R–M25R, M28R, M30R, M34R, M37R, M40R, M41R) = 45 milestone entries** (`scripts/run-timeline-tests.mjs:206` prints the total; `download/timeline-test-report.json` was regenerated and `git restore`d).

**tsc**: `npx tsc --noEmit` → exit 0, zero errors.

**package.json** (`package.json:1-25`): `name: opencut-timeline`, `private: true`. Scripts: `dev` (next dev -p 3001), `build`, `start`, `typecheck` (tsc --noEmit), `test` (node scripts/run-timeline-tests.mjs). Dependencies: **next 16.1.1, react ^19, react-dom ^19** — nothing else. DevDeps: @types/node/react/react-dom, **playwright ^1.62.1**, typescript ^5. **No zustand, no state lib, no UI kit, no `exports`/`main` field** — this is a private Next.js app, not a library package; consumers vendor the source (nle-engine does exactly this: `nle-engine/tsconfig.json:36-40` maps `opencut-timeline` → `vendor/opencut-timeline/src/lib/timeline/index.ts`). `bun.lock` present; `bun install` (33 packages, ~4 s) is the setup path.

---

## 2. The UI surface as-landed (W8) — `src/components/timeline/`

**Public barrel** (`src/components/timeline/index.ts:7-32`): `TimelineView`, `TimelineTrack`, `TimelineElementView`, `TimelineRuler`, `TimelineTick`, `TimelinePlayhead`, `TimelineContextMenu` (+ `ContextMenuItemSpec` type), `useKeyframeBoxSelect`, `useElementSelection` (+ `ElementSelectionApi`), `useCommittedRef`, and the layout constants (`TIMELINE_TRACK_HEIGHTS_PX`, `KEYFRAME_LANE_HEIGHT_PX`, …).

**`/view` is the miniature editor shell** (`src/app/view/page.tsx:1-20`, DECISIONS #18 ruling 9): dark app background + panel grid — `LibraryPanel` (left, DnD drag-source over 3 virtual assets, `view/page.tsx:228-297`), `PreviewPanel` (center, PlaceholderCompositor 384×216 + timecode, `view/page.tsx:300-346`), and the timeline panel that IS the deliverable (`view/page.tsx:393-401`). It mounts `<TimelineView>` over a deterministic scene and exposes `window.__VIEW_TEST__` {core, ids, keyframeIds, dragSource, registry, fps, layout} (`view/page.tsx:356-373`) for the Playwright real-mouse suite.

**Classic-UI features landed (each verified in source):**

- **Theming tokens** — per-type element bg hexes (text `#5DBAA0`, audio `#8F5DBA`, graphic `#BA5D7A`, effect `#5d93ba`; visual types transparent — thumbs are the visual), waveform/`burn`/bookmark colors: `src/components/timeline/theme.ts:6-20`.
- **Per-type clip content renderers** — `video|image|sticker`: tiled media thumbs + gradient `MediaElementHeader` (`TimelineElementView.tsx:145-179`); `text`: content string (`:180-191`); `graphic`: shapes glyph (`:192-200`); `effect`: wand glyph (`:201-209`); `audio`: waveform + volume line (`:210+`); MediaLookup seam `TimelineElementView.tsx:62`.
- **Waveform** — 1 px bars every 2 px, bottom-anchored, viewport-virtualized canvas, DPR-scaled, classic dB curve `(db+40)/40)^1.5`, orange burn cap: `src/components/timeline/TimelineAudioWaveform.tsx:1-16`.
- **Volume line** — perceptual dB↔position mapping (x²-in-linear-gain), absolute-jump drag, 0.1 dB snap, preview→commit, portal tooltip, suppressed when volume keyframes exist: `src/components/timeline/AudioVolumeLine.tsx:1-14`; curve math `theme.ts:64-93`; volume/mute semantics `audio-state.ts:1-12`.
- **Snap indicator** — 2 px translucent line at snapped time (z 40), scroll-corrected: `src/components/timeline/TimelineSnapIndicator.tsx:1-11`; live snap-point state wired from resize/drag/bookmark seams (`TimelineView.tsx:152-160`).
- **Toolbar** — classic top bar: play/pause, split, split-left/right, duplicate, delete, undo, redo, bookmark (active), snapping (magnet), **ripple-mode toggle** (view-level mode routing delete→`rippleDelete`), log-mapped zoom slider + zoom buttons; all M24 `data-test` hooks preserved: `src/components/timeline/TimelineToolbar.tsx:1-25`.
- **Track labels** — labels column with type icon + mute/visibility toggles behind classic gates (`canTrackHaveAudio`/`canTrackBeHidden`), selected-track highlight: `TimelineView.tsx:745-817`.
- **Context menus** — controlled, portal-free, Radix-style styling + collision clamping/flip, Escape/outside-click/wheel/window-blur close: `src/components/timeline/TimelineContextMenu.tsx:1-15`; element + track menus with mute/hide/delete ops since W8-d.
- **Keyframe lanes** — expanded per-property rows (classic PROPERTY_GROUPS ordering + labels, 20 px lanes): `src/components/timeline/expanded-layout.ts:1-10`; expand/collapse + lane box-select + keyframe diamonds drag-to-retime in `TimelineElementView.tsx` + `hooks/use-keyframe-box-select.ts`.
- **Drag line** — horizontal insertion indicator at drop-target track Y; TWO mounted (library DnD + element drag): `src/components/timeline/TimelineDragLine.tsx:1-14`.
- **Edge auto-scroll** — rAF loop, proximity-speed ramps, wired for element drags, bookmark drags, playhead scrubs (marquee deliberately excluded, classic parity): `src/components/timeline/hooks/use-edge-auto-scroll.ts:1-13`.
- **Zoom regimes** — classic TWO-REGIME playhead-anchored layout (anchor above slider 0.15, untouched below) + rAF-coalesced wheel (±30 cap, rate-independent): `hooks/use-timeline-zoom.ts:8-17`, DECISIONS #17 (`DECISIONS.md:448`), M36.
- Also landed: virtualized ruler ticks (`TimelineRuler.tsx:1-10`), declarative + imperative playhead (`TimelinePlayhead.tsx:1-10`), bookmarks row with seek + drag-to-move (`TimelineBookmarksRow.tsx:1-13`), marquee selection box + ratchet merge, element drag-time preview transforms, selection ring, selected-only resize handles, drop-target/hidden dim (opacity-50), selection journal for undo/redo selection restore (`hooks/selection-journal.ts:1-14`), classic action semantics (Q/W split-side, keyframe-first delete, escape ladder) (`hooks/use-timeline-actions.ts:1-18`).

Not attempted (documented): graph-editor popover (W8-f stretch, `PLAN.md:180-181`), bookmark popover (app-shell chrome, `HANDOFF.md:46-51`).

---

## 3. Host integration seams (.agents/SEAMS.md)

Layer map: `SEAMS.md:8-36` (APP SHELL → UI LAYER → CONTROLLERS → ENGINE → RENDER SEAMS). The six seam contracts:

1. **Engine ↔ UI** (`SEAMS.md:41-48`): the seam is **the whole public method surface of `TimelineCore` + `core.subscribe()` + `getTracks()`** (preview-layered). The UI never mutates SceneTracks; raw `moveElements`/`updateElements` are documented escape hatches for tests/trusted integrators.
2. **Engine ↔ wire protocol** (`SEAMS.md:50-57`): `headless/api.ts` — JSON `EngineCommand` in, `CommandResult` out, never throws; validation + classic defaults live at the JSON boundary.
3. **Engine ↔ renderer** (`SEAMS.md:59-63`): `render/placeholder-compositor.ts` contract `setTracks()/renderFrame(t)` — the real WebGPU compositor plugs in behind the same contract; pixel tests (M12) then run unchanged.
4. **Engine ↔ audio** (`SEAMS.md:65-70`): `media/virtual-media.ts` + `render/waveform.ts` — the real audio core supplies PCM peaks through the `computeWaveformPeaks` input shape (asset → element → peaks window).
5. **Controllers ↔ React** (`SEAMS.md:72-77`): controllers constructed ONCE; hooks rebuild a config object every render, committed via `useCommittedRef`; controllers read `configRef.current` LIVE (SKILL #17); handlers bound in the constructor (SKILL #18).
6. **UI ↔ app shell** (`SEAMS.md:79-92`): `TimelineView` props + what the shell OWNS.

**`TimelineViewProps` verbatim** (`src/components/timeline/TimelineView.tsx:115-127`):

```ts
export interface TimelineViewProps {
  core: TimelineCore;                 // REQUIRED — the engine instance (SSOT)
  fps: FrameRate;                     // REQUIRED
  snappingEnabled?: boolean;          // default true (W9 U-4: classic default ON)
  initialZoom?: number;
  isShiftHeld?: () => boolean;        // default: live modifier listener
  dragSource?: TimelineDragSource;    // library DnD (optional)
  mediaAssets?: MediaAssetLike[];     // library DnD (optional)
  mediaLookup?: MediaLookup;          // (mediaId) => VirtualMediaAsset | undefined — clip visuals
}
```
(`MediaLookup` = `(mediaId: string) => VirtualMediaAsset | undefined`, `TimelineElementView.tsx:62`.)

**The host app must supply**: (a) a constructed `TimelineCore` (+ project round-trip via `toJSON`/`fromJSON`, `ops/timeline-core.ts:1769/:1773`); (b) a media registry/lookup for clip visuals; (c) a `TimelineDragSource` + asset list if it wants library DnD; (d) the bookmark popover (the one remaining UI-chrome residual); (e) view-state persistence — **the F6 seam (`onViewStateChange`, `hooks/use-timeline-zoom.ts:70`, `TimelineViewState {zoomLevel, scrollLeft, playheadTime}` `:50-54`) exists at the HOOK level but is NOT plumbed through `TimelineViewProps`** — a host cannot receive view-state changes from the public component today (integration gap to close at assembly; SEAMS.md:84-85 describes it as an app-shell-owned seam).

**Data-test hooks** (the regression-harness contract): 58 static `data-test` attributes + 6 dynamic families — `library-item-{assetId}` (`view/page.tsx:254`), `resize-handle-{left|right}` (`TimelineElementView.tsx:548`), `label-mute-{trackId}`/`label-visibility-{trackId}` (`TimelineView.tsx:782/:798`), `context-item-{key}` (`TimelineContextMenu.tsx:128`), `milestone-{id}` (runner page). **The attribute is `data-test`, NOT `data-testid`** — the final app's harness must target the same attribute or the view components must dual-emit.

**Test-handle contract the /view fixture provides** (and the app must replicate to reuse the real-mouse suite): `window.__VIEW_TEST__` {core, ids, keyframeIds, dragSource, registry, fps, layout{trackHeights, trackGap, rulerHeight, topPadding, labelsColumnWidth, pixelsPerSecondAtZoom1}} (`view/page.tsx:356-373`); the runner page exposes `window.__TIMELINE_TEST_REPORT__` + `[data-test="suite-complete"][data-value="true"]` (`run-timeline-tests.mjs:70-77`).

---

## 4. The headless API + C7 rename status

File: `src/lib/timeline/headless/api.ts` (948 LOC, `HeadlessTimelineApi` exported from the engine barrel `src/lib/timeline/index.ts:344`).

**The ACTUAL command surface — 24 commands, verbatim** (`TimelineCommand` union, `api.ts:39-125`):

```
timeline.insert, timeline.move, timeline.trim, timeline.split,
timeline.delete, timeline.rippleDelete, timeline.duplicate,
timeline.updateElements, timeline.seek, timeline.play, timeline.pause,
timeline.selectElements, timeline.toggleBookmark, timeline.removeBookmark,
timeline.moveBookmark, timeline.upsertKeyframe, timeline.removeKeyframe,
timeline.retimeKeyframe, track.toggleMute, track.toggleVisibility,
track.add, track.remove, timeline.undo, timeline.redo
```

Envelope: `CommandResult {ok, code?: INVALID_PARAMS|NOT_FOUND|CONFLICT|NOOP|INTERNAL_ERROR, error?, data?}` (`api.ts:127-140`); `apply()` never throws (`:154-165`); `applyBatch` atomic with 5 transaction invariants (`:886-923`); out-of-band readouts `getTracks/getScene/getSelection/getPlayhead` (`:925-937`). All 24 commands are pinned by the M29 command parade (`testing/milestones-review6.ts`, 21 tests).

**C7 rename status: NOT STARTED — and deliberately so.**
- `api.ts:4-8` (module header): command names use the `timeline.*`/`track.*` prefixed 00-master Decision-9 form, "NOT spec 15 §4.2's bare command types — see DECISIONS.md #9".
- DECISIONS #9 (`DECISIONS.md:125-148`): prefixed names chosen because the two spec documents disagree; "Documented deviation from spec 15, to be resolved downstream (file a spec issue: nle-core-spec internal conflict)."
- HANDOFF disposition #3 (`HANDOFF.md:52-55`): "Command-name form … an nle-core-spec INTERNAL CONFLICT to be filed downstream, not a code gap."

**Corollary finding (decision-relevant): spec 15 §13.15's rename worklist is itself stale.** §13.15 (`15-wire-protocol.md:4825`) says "`headless/api.ts:38-87` — 18 types" and its rename list enumerates only the 16-ish core ops. The union has been **24 since W5** (verified: `git show 4e39b67:…/api.ts` → 24 types; the 18-era citation traces to `d3d2163`, session 1). The C7 worklist is missing `timeline.toggleBookmark/removeBookmark/moveBookmark/upsertKeyframe/removeKeyframe/retimeKeyframe` → **refresh the worklist to 24 before executing the rename.** Other §13.15 corrective items still open at HEAD: StateChange §6.1 absent (readouts serve instead), coarse error codes (5 vs spec's ~24), singular keyframe commands vs spec's plural batch forms, `insert` lacks `ripple`/`idSeed` params, `split` lacks `rightElementIdSeed`, `move` lacks the simple `{elementIds, delta}` form. (`applyBatch` is AHEAD of spec §7.1 — absorbed as §7.1A.)

---

## 5. Engine API vs the spec-15 union (78 types)

Spec 15 §4.1 (`15-wire-protocol.md:161-259`) defines **78 command types in 16 categories**. OT's headless surface covers **24 of 78 (~31%)**: 23 map 1:1 to distinct spec types + `timeline.rippleDelete` ≈ `RippleCommand` (documented convenience wrapper; spec keeps `delete{ripple:true}` canonical, §13.15 row §4.3.4).

**OT command families** (`api.ts:39-125`):
- **Edit**: insert / move / trim / split / delete / rippleDelete / duplicate / updateElements
- **Playback**: seek / play / pause
- **Selection**: selectElements
- **Bookmarks**: toggle / remove / move
- **Keyframes**: upsert / remove / retime (per-key, engine also has batch engine-ops)
- **Tracks**: toggleMute / toggleVisibility / add / remove
- **History**: undo / redo

**Absent (54 spec types)**: roll, slip, slide, rateStretch, retime, freezeFrame, rangeRemoval (trim-family variants); **toggleElementMuted/Visibility — engine ops EXIST (`timeline-core.ts:906/:950`) but are not on the headless wire**; toggleTrackSolo/Lock, reorderTrack; setRate, setLoop; project ops ×7 (create/load/save/close/updateSettings/rename/delete); scene ops ×4 + updateBookmark (OT's TScene is single-scene with bookmarks); importMedia/deleteMedia; selectTool/selectTrack/marqueeSelect (controller-layer in OT); markers ×3; effects ×5; masks ×4; transitions ×3; clipboard ×3; snapshot; export ×3 (FCPXML/master/frame).

**OT-invented beyond the spec**: on the wire — nothing except the prefix scheme itself and the `rippleDelete` wrapper. At the engine layer (beyond spec's manager surface): the **preview-overlay ops** `previewElements`/`discardPreview`/`isPreviewing`/`commitElements` (`timeline-core.ts:1650-1700`), `insertElementOnNewTrack` (`:1574`), batch `removeElementKeyframes` (`:1210`) / `retimeElementKeyframes` (`:1437`), history introspection (`historyDepth :1746`, `beginHistoryTransaction :1752`), and scene round-trip `toJSON`/`fromJSON` (`:1769/:1773`).

---

## 6. W9 review state

`reviews/` W9 set: **4 facet audits** (`w9-audit-{engine,controllers,ui,tests}.md` — side-by-side predicate-level comparison vs opencut-classic with empirical probes) + **3 peer rounds** (`w9-peer-{a,b,c}.md`, `w9-peer-round2.md`, `w9-peer-round3.md`) + **2 external rounds** (`w9-coderabbit-round1.md` = CodeRabbit PR #3, `w9-coderabbit-round2.md` = Codex full-codebase via user account). All feed `.agents/REVIEW-TRACKER.md` (270 rows/lines; HARD RULE: a finding only lands after empirical verification).

**Closure state** (`REVIEW-TRACKER.md:268-270`): "all non-P3 CodeRabbit findings closed; only 3 dispositioned P3 Trivials remain [CR-T3/T4 keyframe snap-point caching perf, CR-T11 keyboard volume adjustment a11y]. Suite 423/423 (303 in-page + 120 real-mouse), tsc clean." — **Confirmed by execution** (§1). The W9 status log (`REVIEW-TRACKER.md:226-229`) records "zero open P1/P2, residuals are dispositioned P3s."

**Deliberate divergences from classic (the DECISIONS #20 ledger, `DECISIONS.md:647-733`, 10 rulings)**: E7 engine-seek frame-snaps centrally; E10 `commitElements` re-runs enforce rules; U-14 ours-only `B` bookmark keybinding; U-17 playhead-focus arrow guard (fixes classic's double-step); RA-5 discrete-channel keyframe removal doesn't bake (leaf-channel scope, pinned); RB-4 selection journal covers element-kind only; RB-7 split-left ripple-seek clause ported but observationally inert; RB-8 depth-keyed journal vs 100-entry eviction deep edge (>100 ops/session, accepted); RC-3 scroller-null clear is hardening beyond classic; RC-4 keyframe-indicator strip sort order (lanes match classic exactly). **DECISIONS #21** (`DECISIONS.md:735-760`): bookmark move collision → reject occupied destination → engine NOOP (stricter than classic's duplicate-time tolerance; M19-pinned).

HANDOFF:76-79: "the port itself is TERMINAL with review consensus."

---

## 7. Real-mouse test infrastructure

- **Runner**: `scripts/run-timeline-tests.mjs` — **Playwright** (`playwright` devDep ^1.62.1), **plain headless Chromium** ("Canvas2D/DOM only — no WebGPU/Xvfb/SwiftShader, unlike the nle-engine sibling", `run-timeline-tests.mjs:18-20`), one browser + one 1280×900 page (`:61-63`), `--no-sandbox` flags (`:48-54`).
- **Phase 1** (`:66-97`): navigates `/` (in-page runner page `src/app/page.tsx`), waits for `[data-test="suite-complete"][data-value="true"]`, scrapes `window.__TIMELINE_TEST_REPORT__`.
- **Phases 2–14** (`:91-194`): 13 real-mouse suites against `/view` — `m17-real-mouse`, `m19-bookmarks`, `m21-keyframes`, `m22-seek`, `m23-dnd`, `m24-keyboard`, `m25-multitrack`, `m28-actions`, `m30-marquee`, `m34-edge-scroll`, `m37-ui-round`, `m40-w8d`, `m41r-w9` (each a standalone .mjs module imported at `:27-39`). Real `page.mouse`/keyboard drive the actual React components through the browser event pipeline; coordinates are computed from `__VIEW_TEST__.layout` metrics.
- **Prereq**: dev server on :3001 (`bun run dev`); `TIMELINE_TEST_URL` env overrides. Exit 0/1; JSON report + full-page screenshots to `download/`.
- **data-testid inventory (the app regression-harness substrate)**: **58 static `data-test` values + 6 dynamic families** (see §3). Highlights: `timeline`, `timeline-view`, `timeline-tracks-scroll`, `timeline-ruler[-scroll]`, `timeline-tick`, `timeline-track`, `track-label`/`track-header`, `timeline-element`, `element-media-thumb`, `timeline-playhead`, `playhead-handle`, `audio-volume-line`/`-hit`/`-tooltip`, `timeline-snap-indicator`, `timeline-drag-line`, `timeline-drop-indicator`, `timeline-toolbar` + 14 `toolbar-*` buttons, `timeline-context-menu` + `context-item-{key}`, `timeline-bookmarks-row`/`timeline-bookmark`, `timeline-keyframe-indicator[s]`, `expanded-keyframe-lanes`, `keyframe-lane`, `lane-keyframe`, `keyframe-selection-box`, `timeline-selection-box`, `zoom-slider`, `zoom-in/out-button`, `timeline-view-state`, `timeline-property-tree[row]`, `timeline-library`, `library-item-{id}`, `label-mute/visibility-{trackId}`, `resize-handle-{side}`. Total runtime hooks: ~58 + (2×tracks + 1×assets + 1×menu-items + 2×sides) per fixture.

---

## 8. What OT does NOT have (honest gap list)

Verified absences + dispositions (HANDOFF §"What is deliberately NOT in this repo" `HANDOFF.md:41-61`; SEAMS §outside `SEAMS.md:94-104`; gaps/):

1. **Media import/decode**: none — virtual media only (solid-color video, pure sine tones; `media/virtual-media.ts:1-13` declares the MediaRegistry "the seam where the real decoder plugs in later").
2. **Project persistence format**: only scene round-trip `TimelineCore.toJSON()/static fromJSON()` (`timeline-core.ts:1769/:1773`) — no project file, no media library persistence; app-shell policy (SEAMS §6).
3. **Undo beyond its own**: snapshot undo, 100-entry cap, own labels — no cross-system undo integration; the view-layer `SelectionJournal` compensates only for selection restore (`hooks/selection-journal.ts`).
4. **Audio evaluation (real)**: no decode, no mix, no playback. **What it DOES have** (refines the prior belief): keyframe channel *evaluation* `getChannelValueAtTime` incl. bezier (`animations/interpolation.ts:29`), waveform peak extraction `computeWaveformPeaks` (`render/waveform.ts:26`), and Goertzel tone detection on virtual PCM (`virtual-media.ts:109`) — verification-grade, not production audio.
5. **Render**: `PlaceholderCompositor` (Canvas2D solid colors) is explicitly a VERIFICATION seam (SEAMS §3) — no real compositor, no GPU path, no frame pipeline.
6. **Export**: none (no FCPXML/master/frame; those 3 spec-15 commands are absent).
7. **App shell**: only the two fixture pages (`/` runner, `/view` miniature shell); no menus, inspector/params stack (classic `params.*` lanes stored as plain paths — DECISIONS #13, inspector validates downstream), no project chrome.
8. **i18n**: none — hardcoded English.
9. **a11y**: partial — `aria-label`s on toolbar/label toggles (`TimelineView.tsx:787-805`) and library; menu keyboard item-navigation is on the VLM polish backlog; keyboard volume adjustment DISP (CR-T11); no screen-reader/focus audit.
10. **Remaining UI chrome**: bookmark popover (note/color editing — HANDOFF #2), graph-editor popover (W8-f stretch, unattempted), **view-state persistence not exposed via `TimelineViewProps`** (hook-level seam only, §3), real thumbnails (solid gradient stand-ins, DECISIONS #18 ruling 2).

---

## 9. Submodule pin compatibility (3420b5f → 0412e41)

**The pin**: nle-engine vendors OT at `3420b5f` (`nle-engine/.gitmodules:4-6`, `git submodule status` verified). **Correction to the prompt's framing: `3420b5f` is NOT pre-W8 — it is the W8-d review-round-2 endpoint ("W8-d review round 2 fixes: overlay keybinding gate (P1) + diamond hit region + menu clamping — 379/379 GREEN").** The pinned tree ALREADY contains the classic-parity UI (theming, waveform, volume line, snap indicator, toolbar, labels, context menus, expanded lanes). What the pin MISSES: W8-e polish (VLM round) + the entire W9 review round. (Also: the worklog R15-0's "53 commits stale" was measured from `4e39b67`; the true pin delta is **35 commits** — `git rev-list --count 3420b5f..0412e41` = 35, `git diff --stat` = **74 files, +11,413 / −684**.)

**Structural compatibility (for a source-vendoring consumer):**
- **No file deletions, no renames** (`git diff --diff-filter=D/R` empty).
- **Engine barrel `src/lib/timeline/index.ts` is byte-identical** (zero diff) — the vendored import surface (what nle-engine's tsconfig alias points at) is unchanged.
- New source files: only 3 — `src/components/timeline/hooks/selection-journal.ts`, `src/lib/timeline/testing/milestones-w9.ts`, `scripts/m41r-w9-real-mouse.mjs` (+ docs/reviews/screenshots/tracker).
- Engine diffs: `ops/timeline-core.ts` +385/−47, `headless/api.ts` +41, `bookmarks/utils.ts` +15.

**Behavioral (breaking-ish) changes a consumer would absorb upgrading 3420b5f → 0412e41** (all W9 semantics):
- `play()` restarts from zero at/after end + empty-timeline no-op (E1/E6, `c625f9a`).
- Playhead reconciles (clamp + pause) when the timeline shrinks (E4).
- **NEW public op** `removeElementKeyframes` batch (E5); keyframe-removal bakes value-at-playhead for scalar channels (E3).
- `insert`/`fromJSON` default missing trims — tolerant of trims-less JSON (E13).
- Retime patch clamps derived duration unconditionally (E8).
- Headless: `timeline.insert` now accepts graphic/effect (E9); `timeline.moveBookmark` params became REQUIRED (CR-T1); `timeline.play` echoes the true playing state (RA-4).
- `ANIMATION_PARAM_DEFAULTS.volume` 1→0 (RA-6, classic dB default).
- `moveBookmarkInArray` rejects destination collisions → engine NOOP (DECISIONS #21).
- View-layer flips: Q/W split-side un-inverted to classic semantics, delete routes keyframes-first, **snapping default ON** (U-4), Escape ladder, undo/redo restores selection (journal).
- nle-engine's actual usage is TYPE-ONLY (`src/lib/nle/bridge/scene-to-segments.ts:43` `import type {SceneTracks,…} from 'opencut-timeline'`) → structurally immune; the risk is only if it ever pins behavioral expectations.

**Verdict**: the upgrade is low-risk (no export renames, additive engine ops, doc-heavy diff) and high-value (W9 fixed real semantic divergences). Recommend bumping the pin.

---

## 10. Zustand/store contract

**There is no Zustand** — `package.json:13-24` has no state library; `rg zustand src/` returns nothing. Classic's Zustand store was REPLACED by the engine itself (DECISIONS #2 `DECISIONS.md:24-38`; SEAMS §1 `SEAMS.md:41-48`: "The UI replaces opencut's Zustand store with `core.subscribe()` + `getTracks()`").

**The store contract IS `TimelineCore`** (`ops/timeline-core.ts`, 2,213 LOC):
- `subscribe(listener): () => void` (`:294`) — notifies on every committed/preview change; `getTracks()` returns **preview-layered** tracks (`:312`, `applyPreviewToTracks :319`) so drag previews render without commits.
- `TimelineView` re-renders its whole tree from engine state: `useReducer` + `useEffect(() => core.subscribe(rerender), [core])` (`TimelineView.tsx:139-141`).
- The full public method surface (~50 methods, `timeline-core.ts:294-1773`): readouts (getScene/getTracks/getTotalDuration/getCurrentTime/…), ops (insertElements/moveElements/trimElements/splitElements/deleteElements/rippleDeleteElements/duplicateElements/updateElements/toggleElementsMuted/toggleElementsVisibility), bookmarks (6), keyframes (6), tracks (add/remove/toggleMute/toggleVisibility/insertElementOnNewTrack), preview overlay (4), history (10), persistence (toJSON/fromJSON).

**Can the host drive it externally?** Yes — that is the documented pattern: the host constructs/owns the `TimelineCore`, mutates through public ops (or `HeadlessTimelineApi`), and the view follows via subscribe. `/view` proves it: the page owns `core`, and the Playwright suites mutate `__VIEW_TEST__.core` while the same page's React tree re-renders (state-WYSIWYG invariant, M11). No event-bus, no store injection, no context — just the instance prop.

**SSOT with the engine repo's state — documented? NOT in OT.** OT's docs stop at the compositor + waveform contracts (SEAMS §3/§4) and HANDOFF:95-98 lists the "SceneTracks→TimelineData one-way projector per ARCH-R9 / Decision 12" as an OPTIONAL downstream item, i.e., **the projector pattern lives in the spec repo (D12 ruling), implemented in neither repo yet**. Today OT's TimelineCore is the single truth-holder for the editing domain; the app assembly must decide whether the engine repo's runtime state projects INTO a TimelineCore (one-way, per D12) or the app runs OT's core as the editing SSOT and pushes SceneTracks out. No code, prop, or doc in OT prescribes the wiring — that's D16 assembly-architecture work.

---

## Corrections to prior beliefs

1. **"C7 rename is THE prerequisite pending"** — Confirmed NOT started (all 24 command names still `timeline.*`/`track.*`-prefixed, `api.ts:39-125`; DECISIONS #9 + HANDOFF #3 deliberately defer it as an nle-core-spec internal conflict). **But the spec's own worklist is stale**: spec 15 §13.15 cites "18 types" and its rename list omits the 6 bookmark/keyframe commands that have existed since W5 — refresh §13.15 to 24 commands before executing C7. The rename itself remains mechanically small (single file + M29 parade updates).
2. **"OT is UI-complete for the timeline surface"** — True for interaction + visuals (everything in the prompt's list is landed and real-mouse-pinned), with four named residuals: bookmark popover, graph-editor popover (W8-f, unattempted), view-state persistence not exposed on `TimelineViewProps` (hook-level `onViewStateChange` only — an assembly-time gap), and keyboard volume adjustment (CR-T11 P3).
3. **"423/423"** — Verified empirically (executed the suite: 423/423, 0 failed, 218.7 s; 303 in-page/32 suites + 120 real-mouse/13 phases; tsc exit 0). The README's "420/420" (`README.md:89`) is one round stale; tracker is current.
4. **"No audio evaluation inside OT"** — Needs nuance: OT DOES evaluate animated param channels (`getChannelValueAtTime`, bezier), extract waveform peaks, and run Goertzel tone detection on virtual PCM — verification-grade audio math. What it lacks is real decode/mix/playback evaluation (correctly the audio core's job per SEAMS §4).
5. **(New) Pin framing**: engine's OT pin `3420b5f` is post-W8-d (379/379), NOT "pre-W8" — the classic-parity UI is already vendored; the upgrade delta is W9 semantics only (35 commits, zero export renames, additive ops).
6. **(New) README minor staleness**: "24 of the 73 specified commands" (`README.md:16`) — spec 15 is 78 since the Round-7 amendment; the 24/78 coverage figure is the current truth (~31%).

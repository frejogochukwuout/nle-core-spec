# SCOUT-R8-A — opencut-timeline repo audit (Round 8)

**Agent:** SCOUT-R8-A (research only — this report is the only file written)
**Subject:** `/home/z/my-project/opencut-timeline` — bearachprema/opencut-timeline @ `d3b2163` ("Session 1 wrap-up … 136/136"), clone verified via `git log`.
**Canon:** `/home/z/my-project/nle-core-spec` (00-master + 01–12 `.refined.md` + 14–19 `.md` = 19 files). Rule: spec wins over reference code; the delta is the documentation.
**Sibling reference:** `/home/z/my-project/nle-engine` @ `8ac91d9` ("Waves 4A/4B/4C/4D-A complete, 144/144").
**Read-only guarantee:** no file in either repo was modified. All citations below were opened before quoting; unverifiable claims are marked UNVERIFIED.

---

## 1. Meta-docs digest (decisions verbatim)

Repo self-description (README.md:3-16): "Minimal **timeline engine** distilled from OpenCut-classic … This is the timeline counterpart of the nle-engine project … the types are the spec's Decision-2 adoptions, the headless API follows the spec's wire protocol (15), and the placeholder compositor is the seam where the real renderer plugs in."

### DECISIONS.md — all 10 decisions, titles verbatim (`.agents/DECISIONS.md`)

1. **Decision 1: Pure-TS port of the Rust time system (no WASM)** (D1, :6-22) — `core/media-time.ts` + `core/frame-rate.ts` re-implement `rust/crates/time/src/*.rs` semantics; rationale cites "nle-core-spec 00-master Decision 3 locks the final engine to pure TypeScript".
2. **Decision 2: Composition into TimelineCore instead of porting EditorCore** (:24-38) — one framework-free `TimelineCore` class instead of OpenCut's EditorCore + managers + command store + Zustand.
3. **Decision 3: Snapshot undo instead of command-pattern undo** (:40-52) — `UndoStack` stores before/after `TScene` snapshots "(same as the nle-engine sibling)".
4. **Decision 4: Preview as a patch overlay, not a second store** (:54-67) — `previewElements(patches)` staged in a Map layered over committed state by `getTracks()`.
5. **Decision 5: Canvas2D placeholder compositor as the renderer seam** (:69-83) — "the nle-engine WebGPU compositor / final engine plugs in behind the same `setTracks()/renderFrame(t)` contract."
6. **Decision 6: Deterministic id generator (counter), not UUID** (:85-93) — monotonic counter + `resetIdCounterForTests()`.
7. **Decision 7: Headless API command names follow nle-core-spec 15** (:95-107) — implements "the timeline/track subset of the spec's wire protocol verbatim (`timeline.split`, `track.toggleMute`, …)".
8. **Decision 8: Controller event handlers take minimal event shapes** (:109-123) — `MouseEventLike`/`WheelEventLike` structural types; "this is what enables the M11 state-WYSIWYG tests to drive real document-level listeners without React."
9. **Decision 9: Prefixed command names (`timeline.*`/`track.*`), NOT spec-15 bare names** (:125-143) — **quoted in full in §3 below; contains a refuted premise (see §3.1).**
10. **Decision 10: Intra-batch overlap guard on insert (stricter than OpenCut)** (:145-168) + Round-3 addendum: `CommandResult` codes (INVALID_PARAMS / NOT_FOUND / CONFLICT / NOOP / INTERNAL_ERROR — "spec 15 §6.3 spirit"), ticks validated as finite integers, `applyBatch` as a true transaction (eviction suspended, depth-anchored rollback, redo cleared).

### "D9 prefixed names" — exact quote (README.md:32 + DECISIONS #9)

- README.md:32: "JSON `EngineCommand` API (00-master D9 prefixed names; see DECISIONS #9)".
- DECISIONS.md:128-132 (verbatim): "`headless/api.ts` command types use the prefixed form (`timeline.split`, `track.toggleMute`) matching the 00-master Decision-9 examples — NOT spec 15 §4.2's bare, unprefixed command types (`split`, `toggleTrackMute`)."
- DECISIONS.md:134-139 (verbatim rationale): "The two spec documents disagree with each other — 00-master §2 Decision 9 shows `{ type: 'timeline.split', params: … }`, while 15-wire-protocol §4.2 lists bare command types. Our prefixed form is the more namespaced/explicit of the two and matches the master spec's canonical example. Documented deviation from spec 15, to be resolved downstream (file a spec issue: nle-core-spec internal conflict)."

### Other meta docs

- **PLAN.md** — waves W1–W3 done (W1 core distillation, W2 engine + 15 milestones, W3 review/hardening); W4 real React components; W5 seek/drag-drop/keyframe controllers + bookmarks + marquee; W6 downstream integration ("Cross-check every exported symbol against nle-core-spec 05 + 15; produce a conformance table" — PLAN.md:61-63). Standing rule 4: "New ops must map to spec-15 command names or justify in DECISIONS.md" (PLAN.md:71).
- **HANDOFF.md** — 136/136 tests, PR #1 open for CodeRabbit (no comments yet), remaining P2/P3 (GroupResizeUpdate vs ElementPatch unification, headless param shapes deviating from "spec-15 literals", runner ignores pageerror, palette literals vs spec §13.3/§13.4).
- **SKILL.md** — 10 gotchas; architecture map with per-module opencut-classic provenance; "Downstream Bridge" section (:155-170) restating type/command/compositor alignment; container laws (watchdog, double-fork).
- **worklog.md** — 4 tasks: bootstrap (115 tests), review round 1 (133), round 2 (135), round 3 (136).
- **gaps/** — wave1-core-gaps.md (types/time/snapping/placement/ripple omissions, "Omitted: nothing — module is complete" for ripple :63) and wave2-engine-gaps.md (controllers 4-of-7 ported; 18 command types "vs spec-15's 73" :77 — now 78 after Round 7; missing command list :26-30).
- **reviews/** — 6 reports incl. round2/round3-verification; round3 verdict table verified the transaction-rollback fix chain (reviews/round3-verification.md).

---

## 2. Module inventory (src/lib/timeline/ — 34 files, 11,375 LOC; test cases 78+38+20 = 136)

| Module (LOC) | Key exports (file:line) | One-line description |
|---|---|---|
| `core/media-time.ts` (299) | `MediaTime` branded type (:21), `TICKS_PER_SECOND = 120_000` (:23), `mediaTimeFromSeconds` round-half-away-from-zero (:64), `mediaTimeToFrameRound/Floor` euclidean (:180/:195), `lastFrameMediaTime` (:266), `snapSeekMediaTime` (:279) | Pure-TS port of OpenCut Rust `media_time.rs`; integer ticks, gated constructors. |
| `core/frame-rate.ts` (75) | `FrameRate {numerator, denominator}` (:9), `FPS_23_976 = {24000, 1001}` (:14), `FRAME_RATES` presets (:25), `formatTimecode` (:59) | Rational frame rates (non-drop SMPTE). |
| `core/id.ts` (21) | `generateId(prefix)` monotonic counter (:10), `resetIdCounterForTests` (:15) | Deterministic ids (DECISION 6). |
| `types/index.ts` (299) | `ElementRef` (:21), `Bookmark` (:26), `TScene` (:33), `TrackType` 5 kinds (:43), 5 track interfaces (:50-79), `SceneTracks {overlay[], main singleton, audio[]}` (:95-99), `RetimeConfig` (:101), 7-way `TimelineElement` union (:155-162), `RETIMABLE/MASKABLE/VISUAL` type lists (:170-199), `DistributiveOmit`→`CreateTimelineElement` (:232-236), `ElementDragState/View` (:240/:254), `DropTarget` (:271), `ClipboardItem` (:295) | The Decision-2 type adoptions — spec 06 §4.7 / spec 09's SceneTracks shape, executable. |
| `snapping/index.ts` (151) | `SnapPointType` 6 kinds (:23), `getTimelineSnapThresholdInTicks` (:48, `(10px/pps)*TICKS`), `resolveTimelineSnap` closest-wins (:73), element-edge/playhead/bookmark sources (:105/:134/:142), `TimelineSnapPointSource` seam (:44) | Zoom-aware snapping, lazy sources; keyframe source replaced by open seam. |
| `placement/index.ts` (505) | `PlacementTimeSpan {startTime, duration}` (:33), `PlacementStrategy` 5 variants (:43-54), `PlacementResult` (:56), `ELEMENT_TRACK_MAP` (:73), `enforceMainTrackStart` (:167), `resolveTrackPlacement` (:381) | 5 strategies, reject-not-shift overlap, main-track zero-anchor. |
| `placement/apply.ts` (302) | `buildEmptyTrack` ×7 overloads (:39-74), `updateTrackInSceneTracks` (:117), `applyPlacement` (:159) | Mutation half of placement (track factory + section updates). |
| `ripple/index.ts` (395) | `rippleShiftElements` (:16), `applyRippleAdjustments` (:40), `computeRippleAdjustments` (:121) | Diff-based ripple (vacated−joined interval arithmetic) — spec 06 §5.4's "WE ADOPT THIS". |
| `ops/retime.ts` (72) | `MIN/MAX_RETIME_RATE` 0.01/5 (:12-13), `clampRetimeRate` (:15), source↔clip linear maps (:22/:32/:51/:64) | Pure retime math (no command surface yet). |
| `ops/group-resize.ts` (415) | `ResizeSide` (:41), `buildResizeMembers` (:54), `GroupResizeUpdate` (:126), `computeGroupResize` (:147) | Trim with snap-once discipline, neighbor/source bounds, min 1 frame. |
| `ops/group-move.ts` (773) | `PlannedTrackCreation` (:63), `PlannedElementMove` (:69), `buildMoveGroup` (:163), `resolveGroupMove` (:258), `snapGroupEdges` (:701), `getDisplayTracks` (:92) | Group move with track placement; mixed audio+video groups rejected. |
| `ops/split.ts` (178) | `SplitElementsParams` (:28, retainSide), `splitElementsOnTracks` (:39) | Pure split with snap-once source spans. |
| `ops/element-utils.ts` (123) | `getElementEndTime` (:18), `calculateTotalDuration` (:43), `createScene` (:107) | Scene/element helpers. |
| `ops/timeline-core.ts` (986) | `ElementPatch` (:79, patch limited to startTime/duration/trimStart/trimEnd/name), `MAX_UNDO_HISTORY = 100` (:102), `UndoStack` w/ transaction mode (:112, beginTransaction :146, suspended eviction :116), `TimelineCore` (:209): `insertElements` (:367), `moveElements` (:455), `trimElements` (:536), `splitElements` (:569), `deleteElements` (:594), `rippleDeleteElements` (:620), `duplicateElements` (:652), `updateElements` (:701), `toggleTrackMute/Visibility` (:744/:756), `addTrack/removeTrack` (:768/:780), `previewElements/commitElements` (:795/:814), `seek/play/pause` (:297/:314/:320), `toJSON` (:907) | The engine class: ops + preview/commit + snapshot undo + events + logical playhead. |
| `view/scale.ts` (8) | `BASE_TIMELINE_PIXELS_PER_SECOND = 50` (:6), `TIMELINE_ZOOM_MIN = 0.1` (:7), `TIMELINE_ZOOM_MAX = 100` (:8) | Scale constants. |
| `view/pixel-utils.ts` (95) | `timelineTimeToPixels` (:43), `timelinePixelsToTime` (:53), `snapPixelToDeviceGrid` (:63), `TIMELINE_INDICATOR_LINE_WIDTH_PX = 2` (:9) | Time↔pixel math with DPR snapping. |
| `view/zoom-utils.ts` (99) | `getTimelineZoomMin` zoom-to-fit (:20), `getTimelinePaddingPx` (:37), `sliderToZoom/zoomToSlider` exponential (:72/:88) | Zoom math. |
| `view/ruler-utils.ts` (240) | `LABEL_FRAME_INTERVALS = [2,3,5,10,15]` (:21), `TICK_FRAME_INTERVALS = [1,2,3,5,10,15]` (:26), `SECOND_MULTIPLIERS` (:31), `getRulerConfig` (:52), `MIN_LABEL_SPACING_PX = 120` (:38) | Ruler interval selection (CapCut pattern). |
| `view/layout.ts` (59) | `TIMELINE_TRACK_HEIGHTS_PX` (:10), `KEYFRAME_LANE_HEIGHT_PX = 20` (:18), ruler 22px (:24), labels column 112px (:23) | Layout constants. |
| `controllers/event-types.ts` (27) | `MouseEventLike` (:6), `WheelEventLike` (:19) | Framework-free event shapes (DECISION 8). |
| `controllers/resize-controller.ts` (302) | `ResizeController` (:82) | Trim-drag state machine; doc-level listeners; preview/commit. |
| `controllers/playhead-controller.ts` (312) | `PlayheadController` (:102) | Scrub state machine. |
| `controllers/element-interaction-controller.ts` (690) | `TIMELINE_DRAG_THRESHOLD_PX = 5` (:51), `ElementInteractionController` (:201) | Element drag state machine + drop-target + group-move commit. |
| `controllers/zoom-controller.ts` (157) | `ZoomController` (:42) | Ctrl-wheel exponential zoom, anchor scroll-keep. |
| `controllers/drop-target.ts` (290) | `computeDropTarget` (:109), `getDropLineY` (:272) | Vertical drop resolution (new-track vs existing). |
| `media/virtual-media.ts` (158) | `TEST_COLORS` (:39), `TEST_TONES_HZ` (:47), `MediaRegistry` (:53), `goertzelPower` (:107), `generateAudioSamples` (:135) | Virtual solid-color video / pure-tone audio + Goertzel detection. |
| `render/placeholder-compositor.ts` (175) | `CompositorFrameResult` (:36), `PlaceholderCompositor` (:85), `setTracks` (:116), id-hashed HSL colors for non-media elements (:45-62) | Canvas2D compositor seam (DECISION 5); overlays paint bottom-up. |
| `render/waveform.ts` (148) | `computeWaveformPeaks` (:26), `drawWaveform` (:90), `measureDrawnColumnHeight` (:118) | Peaks + drawn-pixel measurement. |
| `headless/api.ts` (404) | `TimelineCommand` 18-type union (:38-87), `CommandResult {ok, code, error, data}` (:89-102), `HeadlessTimelineApi` (:108), `apply` never-throws (:117), `applyBatch` atomic (:346), readouts getTracks/getScene/getSelection/getPlayhead (:385-403) | JSON EngineCommand API — §3 deep-dive. |
| `index.ts` (255) | public barrel | Mirrors opencut module boundaries for 1:1 tracing. |
| `testing/harness.ts` (90) | `assert/assertEqual/assertApprox/assertThrows`, `Milestone`, `test` | Custom in-page test framework (NOT Vitest). |
| `testing/milestones-core.ts` (1357) | M1–M9 (:141/:274/:304/:339/:416/:606/:695/:946/:1058), 78 tests | Time math → TimelineCore. |
| `testing/milestones-view.ts` (1233) | M10–M15 (:79/:181/:665/:788/:878/:1037), 38 tests | View math → DOM view. |
| `testing/milestones-hardening.ts` (682) | M16 (:64), 20 tests | Review hardening. |
| `scripts/run-timeline-tests.mjs` (103) | plain headless Chromium; waits `[data-test="suite-complete"]`, scrapes `window.__TIMELINE_TEST_REPORT__` (:52-58); no Xvfb/SwiftShader (:4-6) | Playwright runner. |

Runner page: `src/app/page.tsx` executes MILESTONES client-side; exposes `window.__TIMELINE_TEST_REPORT__` (:76) and `data-test="suite-complete"` (:95) — verified by grep.

---

## 3. Headless API vs spec 15 (the decisive comparison)

### 3.1 First: the name-conflict premise is FALSE against current canon

DECISIONS #9 claims "00-master §2 Decision 9 shows `{ type: 'timeline.split', params: … }`". **Refuted by reading the canon:**

- `00-master-spec.md:234`: "each a JSON-serializable object like `{ type: 'split', params: { time, trackIds } }`" — **bare**.
- `00-master-spec.md:562` (glossary): "`{ type: string; params: Record<string, unknown> }` (e.g., `{ type: 'split', params: { time, trackIds } }`)" — **bare**.
- `15-wire-protocol.md` §4.2 mapping table (:272-353): every type literal is bare (`split`, `trim`, `move`, `toggleTrackMute`, `addTrack`, `deleteTrack`, …); §5 example payloads bare (:2210, :2224, :2240).

There is **no internal conflict between 00-master and spec 15** — both use bare command types. The repo's prefixed `timeline.*`/`track.*` is a deviation from *both* documents. The plausible root cause: conflating spec 15 §4.2's **manager-method** column (`engine.timeline.splitElements(...)`, `engine.timeline.toggleTrackMute(...)`) — which is namespaced because it names *methods on the timeline manager* — with the command **type** discriminator. The spec issue they intended to file ("nle-core-spec internal conflict", DECISIONS.md:139) should be filed instead as a **correction to opencut-timeline DECISIONS #9** and a name-mapping requirement for convergence.

### 3.2 Command-by-command table (repo's 18 vs spec 15's 78)

Spec-15 side quoted from `15-wire-protocol.md` §4.2 (:272-353) and §4.3 definitions; repo side from `headless/api.ts:38-87`.

| # | Repo command (api.ts line) | Repo params | Spec-15 type (§ line) | Spec-15 params | Verdict |
|---|---|---|---|---|---|
| 1 | `timeline.insert` (:40) | `{element: CreateTimelineElement, startTimeTicks: number, strategy?: "firstAvailable"\|"explicit", trackId?}` | `insert` (§4.3.9 :679-716) | `{element: ElementSpec, placement: PlacementStrategy (5 variants), ripple: boolean, idSeed?}` | **Concept match; name + shape differ.** Repo flattens `placement` to a 2-value string + `trackId`; lacks `ripple`, `idSeed`; uses `startTimeTicks` and *ignores* the element's own `startTime` (SKILL gotcha #2). |
| 2 | `timeline.move` (:48) | `{moves: PlannedElementMove[], createTracks?: PlannedTrackCreation[]}` | `move` (§4.3.3 :457-503) | `{elementIds, delta, targetTrackId, movePlan?, createTracks?, snap?}` | **Concept match; repo implements only the movePlan form.** `PlannedElementMove` is an **exact field-for-field match** (see §7-VC5); spec's simple `{elementIds, delta}` form is absent. |
| 3 | `timeline.trim` (:52) | `{elements: ElementRef[], side: "left"\|"right", deltaTicks}` | `trim` (§4.3.2 :405-441) | `{elementId, edge: 'start'\|'end', delta, ripple, syncLinked?, skipAdjacentClamp?}` | **Concept match; addressing differs** (multi-element group + `side` vs single `elementId` + `edge`); repo lacks `ripple`/`syncLinked`/`skipAdjacentClamp`. |
| 4 | `timeline.split` (:60) | `{elements: ElementRef[], splitTimeTicks, retainSide?: "both"\|"left"\|"right"}` | `split` (§4.3.1 :363-392) | `{time, trackIds: string[]\|null, retainSide?, rightElementIdSeed?}` | **Concept match; addressing differs** (split *these elements* vs split *everything at time t on trackIds/all tracks*); `retainSide` semantics match; repo lacks idSeed (uses global counter instead). |
| 5 | `timeline.delete` (:68) | `{elements: ElementRef[]}` | `delete` (§4.3.8 :645-663) | `{elements: ElementRef[], ripple: boolean, cascadeDependents?}` | **Near match** (name prefixed); repo lacks `ripple` flag (separate `rippleDelete` instead) and `cascadeDependents` (no transitions/keyframes to cascade — animations omitted). |
| 6 | `timeline.rippleDelete` (:69) | `{elements: ElementRef[]}` | — (modeled as `delete{ripple:true}` or `RippleCommand` wrapper, §4.3.4 :517-544) | — | **Net-new convenience wrapper** (documented in DECISIONS #7/#9 as such; both granular and wrapped exposed). |
| 7 | `timeline.duplicate` (:70) | `{elements: ElementRef[]}` | `duplicate` (§4.3.10 :725-749) | `{elements, placement? (default alwaysNew/highest), timeOffset?, idSeed?}` | **Near match**; repo fixes OpenCut's new-track "(copy)" semantics, lacks `placement`/`timeOffset`/`idSeed` params. |
| 8 | `timeline.updateElements` (:71) | `{updates: ElementPatch[]}` where ElementPatch = `{trackId, elementId, patch: Partial<Pick<TimelineElement, "startTime"\|"duration"\|"trimStart"\|"trimEnd"\|"name">>}` (timeline-core.ts:79-83) | `updateElements` (§4.3.15 :883-901) | `{updates: Array<{trackId, elementId, patch: Partial<TimelineElement>}>, pushHistory?}` | **Structural match; repo's patch is narrower** (5 fields vs any field) and lacks `pushHistory` (preview/commit handled at core level instead). |
| 9 | `timeline.seek` (:72) | `{timeTicks}` | `seek` (§4.3.27 :1091-1097) | `{time: MediaTime}` | **Match by concept; param renamed** (`timeTicks` vs `time`). |
| 10 | `timeline.play` (:73) | `{}` | `play` (§4.3.25 :1065-1069) | no params | **Match** (modulo prefix). |
| 11 | `timeline.pause` (:74) | `{}` | `pause` (§4.3.26 :1076-1082) | no params | **Match** (modulo prefix). |
| 12 | `timeline.selectElements` (:75) | `{elements: ElementRef[]}` | `selectElements` (§4.3.46 :1417-1427) | `{elements: ElementRef[], mode?: 'replace'\|'add'\|'subtract'\|'toggle'}` | **Near match**; repo lacks selection modes; selection state lives on `HeadlessTimelineApi` (:110), not in SceneTracks. |
| 13 | `track.toggleMute` (:76) | `{trackId}` | `toggleTrackMute` (§4.3.18 :943-955) | `{trackId, value?}` | **Name differs** (`track.toggleMute` vs `toggleTrackMute`); repo lacks `value?` (pure toggle). |
| 14 | `track.toggleVisibility` (:77) | `{trackId}` | `toggleTrackVisibility` (§4.3.21 :989-1003) | `{trackId, value?}` | **Name differs**; repo lacks `value?`. |
| 15 | `track.add` (:78) | `{trackType: "video"\|"text"\|"audio"\|"graphic"\|"effect", index?}` | `addTrack` (§4.3.22 :1005-1023) | `{type: 'video'\|'audio'\|'overlay', index?, name?}` | **Name + taxonomy differ**: repo's 5 TrackTypes (OpenCut types/index.ts:43) vs spec's 3 (spec 15 says `'video' | 'audio' | 'overlay'`; spec 06 §4.7 folds text/graphic/effect into overlay). Repo lacks `name`. |
| 16 | `track.remove` (:85) | `{trackId}` | `deleteTrack` (§4.3.23 :1025-1043) | `{trackId, cascadeElements?}` | **Name differs** (`remove` vs `deleteTrack`); repo rejects main-track removal, lacks `cascadeElements` (its removeTrack fails if non-empty — spec 15's TRACK_NOT_EMPTY exists in §6.3 :2820). |
| 17 | `timeline.undo` (:86) | `{}` | `undo` (§4.3.71 :1891-1895) | no params | **Match** (modulo prefix). |
| 18 | `timeline.redo` (:87) | `{}` | `redo` (§4.3.72 :1902-1908) | no params | **Match** (modulo prefix). |

**Counts:** 18 repo commands = 17 spec-15 counterparts (all concept-matched, **zero literal name matches**) + 1 net-new wrapper (`timeline.rippleDelete`). Param shapes: 3 near-identical (play/pause/undo/redo family), 1 exact sub-type (PlannedElementMove/PlannedTrackCreation), the rest differ in addressing model, optional params, or naming.

### 3.3 Absent spec-15 commands (60 of 78)

Timeline ops: `ripple` (meta-wrapper), `roll`, `slip`, `slide`, `rateStretch`, `retime`, `freezeFrame`, `rangeRemoval`, `toggleElementVisibility`, `toggleElementMuted`. Track ops: `toggleTrackSolo`, `toggleTrackLock`, `reorderTrack`. Playback: `setRate`, `setLoop`. Project: `createProject`, `loadProject`, `saveProject`, `closeProject`, `updateProjectSettings`, `renameProject`, `deleteProject`. Scene: `createScene`, `deleteScene`, `renameScene`, `switchScene`, `toggleBookmark`, `removeBookmark`, `updateBookmark`, `moveBookmark`. Media: `importMedia`, `deleteMedia`. Tool: `selectTool`, `selectTrack`, `marqueeSelect`. Marker: `addMarker`, `deleteMarker`, `updateMarker`. Effect: `addEffect`, `updateEffect`, `removeEffect`, `reorderEffect`, `toggleEffect`. Mask: `addMask`, `updateMask`, `removeMask`, `toggleMask`. Transition: `addTransition`, `updateTransition`, `removeTransition`. Keyframe: `upsertKeyframes`, `removeKeyframes`, `retimeKeyframe`, `updateKeyframeCurves`. Clipboard: `copy`, `cut`, `paste`. Snapshot: `snapshot`. Export: `exportFCPXML`, `exportMaster`, `exportFrame`.

The repo's own gaps doc anticipates most of this: "spec-15 timeline/track commands we still lack: roll, slip, slide, rateStretch, retime, freezeFrame, rangeRemoval, toggleElementVisibility/Muted, toggleTrackSolo, toggleTrackLock, reorderTrack, upsertKeyframes … scene CRUD … bookmarks … clipboard … transitions — W5/W6" (gaps/wave2-engine-gaps.md:25-30). It does not mention `snapshot` — notable because the repo's readouts (`getTracks/getScene/…` as methods, api.ts:385-403) serve the same test-assertion purpose as spec 15's `snapshot` command (§4.3.73 :1914-1928), but out-of-band rather than in-protocol.

### 3.4 Result envelope

- Repo: `CommandResult {ok: boolean; code?: "INVALID_PARAMS"|"NOT_FOUND"|"CONFLICT"|"NOOP"|"INTERNAL_ERROR"; error?: string; data?: unknown}` (api.ts:89-102); never throws; INTERNAL_ERROR catch-all (:117-127).
- Spec 15 §6 (:2711-2731): `{ ok: true; stateChange: StateChange; undoInfo?; data? } | { ok: false; error: CommandError }` — **repo lacks `stateChange`/`newState` entirely** (tests read state via out-of-band readouts) and has 5 coarse codes vs spec §6.3's ~24 specific codes (`SCHEMA_INVALID`, `ELEMENT_NOT_FOUND`, `OVERLAP_REJECTED`, `TRIM_BEYOND_SOURCE`, `MAIN_TRACK_CONSTRAINT`, `NOTHING_TO_UNDO`, …, :2804-2827). The repo's `NOOP` code (trim clamped-to-no-op, api.ts:198-208) has **no spec-15 equivalent** and is a genuine addition.
- The repo's `applyBatch` (:346-381) implements spec 15 §7's CommandBatch atomicity **plus** behavior the spec doesn't yet require: eviction-suspended transactions, depth-anchored rollback, redo-stack clear, undo/redo rejected inside batches (§6.3 spirit, DECISIONS #10 addendum :161-168).

---

## 4. Overlap map vs nle-engine

Engine = clean-room FreeCut port (engine side); opencut-timeline = clean-room OpenCut-classic port (timeline side). Both now implement timeline ops + snapshot undo + a headless JSON surface. The user's framing is correct: **opencut-timeline is a timeline/multi-track engine core, not a UI repo** — it has no React components (W4 pending), but a full ops engine.

### 4.1 Timeline ops

| Op | opencut-timeline (TimelineCore) | nle-engine (Timeline, `src/lib/nle/timeline/timeline.ts`, 6,794 LOC) | Closer to spec 06 |
|---|---|---|---|
| split | `splitElements` (timeline-core.ts:569) | `splitClip` (:2461), `splitAllItemsAtFrame` (:2648) | **opencut** — spec 06 §5.1 + spec 15 §4.3.1 use OpenCut's `retainSide`/element addressing; engine is frame-based FreeCut shape. |
| trim | `trimElements` (:536, group, snap-once) | `trimHead`/`trimTail` (:2709/:2786), `rippleTrimItem` (:2867), `rollingTrimItems` (:2998) | Split: opencut matches OpenCut snap-once invariant (06 §5.2); engine covers roll + ripple-trim which **spec 06 §5.5 mandates and OpenCut lacks**. |
| move | `moveElements` (:455, group-move module) | `moveClip` (:3868), `moveItems` (:3947) | **opencut** for spec 15's movePlan shape (exact PlannedElementMove match); engine's frame-based moves need adapter. |
| ripple | `rippleDeleteElements` (:620) + ripple/ diff module (ripple/index.ts:121) | `rippleDelete(Items)` (:3547/:3573), `applySyncLockRipplePatch` (:3484), `closeGap(AllGaps)` (:5679/:5775), sync-lock.ts (636 LOC) | **opencut** for the diff algorithm (06 §5.4 "WE ADOPT THIS" = OpenCut ripple); **engine** for sync-lock propagation (spec 06 §6) which opencut lacks entirely. |
| roll/slip/slide | **absent** (OpenCut never had them) | `rollingTrimItems` (:2998), `slip` (:4045), `slideItem` (:4133) | **engine** — spec 06 §5.5-5.7 ports these from FreeCut; opencut must add them (or the seam documents them as engine-side). |
| rateStretch/retime | retime.ts pure math only; no command | `rateStretchItem` (:3153) | **engine** (06 §5.11/5.12). |
| insert | `insertElements` (:367, 5-strategy placement, zero-anchor) | `addVideoClip/addAudioClip/addImageClip/addAdjustmentClip/addTextClip` (:2122-2341), `performInsertEdit/performOverwriteEdit` (:4574/:4705) | **opencut** for spec 06 §5.9 / spec 15 §4.3.9's PlacementStrategy model; engine's insert/overwrite 3-point edits are net-new capability spec 06 doesn't yet cover (worth a spec 06 amendment candidate). |
| delete/duplicate | `deleteElements` (:594), `duplicateElements` (:652, new-track "(copy)") | `removeClip/removeItems` (:2377/:3715), `duplicateItems` (:3761) | tie — both adequate; opencut's duplicate semantics match OpenCut (06 §5.10). |
| track ops | addTrack/removeTrack/toggleMute/Visibility (:744-793) | addTrack/removeTrack (:2066/:2092) | **opencut** for spec 15's addTrack/deleteTrack/toggleTrackMute surface; engine has 2 track kinds vs SceneTracks' 3-section model. |

### 4.2 State model

- opencut: `SceneTracks {overlay: OverlayTrack[], main: VideoTrack (singleton), audio: AudioTrack[]}` (types/index.ts:95-99), tracks **own** their elements; 5 track kinds; 7-element union (:155). **This is spec 06 §4.7 / spec 09's adopted shape, verbatim.**
- engine: `TimelineData {fps, width, height, backgroundColor, tracks: Track[], clips: Clip[], transitions, markers, keyframes, compositions}` (core/types.ts:1319-1370) — **flat/normalized** (clips reference trackId), `TrackKind = 'video'|'audio'` (:1031). Closer to a serialization/ProjectJSON shape (spec 09 Layer 1) than to SceneTracks.
- **Verdict:** opencut-timeline is the canonical **runtime SceneState** reference (specs 05/06/09); the engine's flat model is the **composition/persistence-facing** shape. The seam is an explicit tracks↔flat adapter, not a rewrite. (nle-engine Wave 4B persistence, 1,174 LOC `persistence/index.ts`, already targets spec 09 serialization.)

### 4.3 Undo machinery

- opencut: `UndoStack` (timeline-core.ts:112-207) — before/after `TScene` snapshots, labels, transaction mode with suspended eviction (:146-159), `clearRedo`, 100-entry cap; headless `applyBatch` depth-anchored rollback verified by 3 review rounds.
- engine: same snapshot family — `beginUndo/commitUndo/cancelUndo/push` (:1874-1961), `undo/redo` (:5582/:5596), `snapshot/restore` (:5627/:5637); known keyframe-blind equality bug (P0.6, per spec 19 §3.1 row "Known bugs"; `timeline.ts:1746 snapshotsEqual`).
- Both implement spec 15 §6.2's strategy-2 (previous-state snapshot). **opencut's transaction/rollback discipline is ahead** and should be absorbed into spec 15 §7 (see §8).

### 4.4 Headless surfaces

- engine: 19-op JSON-RPC + `$ref` resolver (`headless/api.ts:402-421` EditOperationName union; zod per-op schemas :1610-1737; `$ref` allowlist on ID fields only, :24-34). Spec 19 §8 verdict: "Rebuild (adapter bridge) … `$ref` retired".
- opencut: `EngineCommand {type, params}` discriminated union + `CommandResult {ok, code…}` + `apply/applyBatch` — **structurally the spec 15 skeleton** (same command/result envelope, same "one dispatcher" idea), wrong names (§3.1) and coarse codes.
- **Verdict:** opencut-timeline's headless is the closer of the two to spec 15; it needs a rename pass + error-code taxonomy + (optionally) stateChange payload. Also note: opencut's `TimelineCore` method names (`splitElements`, `moveElements`, `trimElements`, `deleteElements`, `insertElement`, `duplicateElements`, `updateElements`, `toggleTrackMute`, `toggleTrackVisibility`, `addTrack`, `removeTrack`) **already match spec 15 §4.2's manager-method column 1:1** — the repo is accidentally the reference implementation of the spec's manager surface (the prefixed names likely came from *these* method paths, reinforcing §3.1's diagnosis).

### 4.5 Other seams

- **Compositor:** opencut's `setTracks()/renderFrame(t)` Canvas2D contract (placeholder-compositor.ts:116; DECISIONS #5) vs engine's WebGPU compositor (gpu/compositor.ts, 1,602 LOC, rgba8unorm — corrective per spec 19). DECISIONS #5 (:73-74) says the engine compositor plugs in behind the same contract. Keep as the seam.
- **Media:** both procedural (opencut media/virtual-media.ts explicitly follows "nle-engine pattern", SKILL.md:104). Spec 15 §5.4/`importMedia` handles real media upstream — neither repo does real media yet (engine Wave 6A chartered).
- **Persistence:** opencut has none (only `toJSON`, timeline-core.ts:907); engine has Wave 4B. Spec 09 governs.

---

## 5. Spec conformance sweep

### 5.1 Spec 05 (timeline)

**Aligned by construction:**
- `SceneTracks` singleton main = spec 05's data model via 06 §4.7 (types/index.ts:95-99; spec 06:342-346).
- Controller architecture matches spec 05 §14.4's six verified points 1:1: session discriminated unions, bound handlers, document-level listeners on start/remove, subscribe/notify, `configRef` injection, preview/commit callbacks (resize-controller.ts:82; element-interaction-controller.ts:201; playhead/zoom controllers; M11 tests drive doc-level listeners, milestones-view.ts:236).
- 5-strategy placement = spec 05 §14.5 / 06 §5.9 (placement/index.ts:43-54 vs spec 05:790-793 "PlacementStrategy (5-variant union)").
- Snapping: zoom-aware ticks threshold `(10px/pps)*TICKS_PER_SECOND` and closest-wins = spec 05 §14.6 exactly (snapping/index.ts:48-57 vs spec 05:836, :841).
- Default 50 px/s = spec 05 §5.2 "Default: 50 pixels per second" (scale.ts:6).
- DPR-snapped pixel math = spec 05 §14.3's `timelineTimeToSnappedPixels` citation (pixel-utils.ts:63-85).
- DOM ruler math = spec 05 §14.3/§17's DOM-ruler-first stance (ruler-utils.ts; virtualized ticks only in M15 test renderer per gaps/wave2:38-40).

**Deltas (both sides quoted):**
- Zoom limits: spec 05 §5.2:140-141 "Min: 1 pixel per second … Max: 100 pixels per frame" vs repo `TIMELINE_ZOOM_MIN = 0.1` (= 5 px/s) and `TIMELINE_ZOOM_MAX = 100` (= 5,000 px/s) (scale.ts:7-8); repo's min is dynamic zoom-to-fit (zoom-utils.ts:20-35). Spec's "max per frame" formulation is unimplementable as a zoom-multiplier — needs rewording.
- Playhead line width: spec 05:745 "a single 3px-wide line (`TIMELINE_INDICATOR_LINE_WIDTH_PX`)" vs repo `TIMELINE_INDICATOR_LINE_WIDTH_PX = 2` (pixel-utils.ts:9). Original OpenCut value UNVERIFIED (no `/home/z/repos` clone in this environment) — one of the two is wrong; flag for the coordinator.
- Component hierarchy (spec 05 §4, 14 components) — repo has **no React components** (W4 pending); M15 is a test renderer (milestones-view.ts:1037; gaps/wave2:38-40). No virtualization module in lib (spec 05 §6); no marquee (§8.7), no library drag-drop (§8.8), no keyboard (§8.9), no track headers (§10), no markers/in-out UI (§11), no linked selection (§12.3) — all W4/W5.

**Net-new (our specs lack it):**
- **Magnetic main-track zero-anchor**: empty main → ZERO; requested start ≤ earliest element → clamp to ZERO (placement/index.ts:167-197; SKILL gotcha #1, `.agents/SKILL.md:117-123`). Spec 05 §14.5 documents `main-track.ts` existence but not these clamp semantics; spec 06 §5.9/5.3 mention "main-track constraint" only as a move limit. This is load-bearing, tested behavior (M5) that implementers would otherwise rediscover painfully.
- **Insert startTime-override semantics**: first element lands exactly at requested `startTime`, later elements keep relative offsets, then zero-anchor may shift the whole batch; element's own `startTime` ignored (SKILL gotcha #2, :124-128).
- **Coordinate-space discipline**: `clientX/clientY` are viewport-space; `elementRectLeft` must be `getBoundingClientRect().left` (SKILL gotcha #3 :129-134; DECISIONS #8 trade-off). Spec 05 §8.3's drag math has no coordinate-space contract.
- **Drag threshold constant**: 5px strict-greater (element-interaction-controller.ts:51; M16 boundary test at exactly 5px — reviews/round3-verification.md verdict 5). Spec 05 §14.4 cites `movedPastDragThreshold` but pins no constant.
- Ruler interval tables `[2,3,5,10,15]` labels / `[1,2,3,5,10,15]` ticks + `MIN_LABEL_SPACING_PX = 120` / `MIN_TICK_SPACING_PX = 18` (ruler-utils.ts:21-43) — spec 05 §17's fallback discusses FreeCut's 12-band table, not OpenCut's.
- Mixed audio+video drag groups rejected entirely (SKILL gotcha #0 :113-115; M16 test) — spec 06 §4.3.3's MoveCommand constraints mention "Cross-section moves … rejected" (spec 15:514) so this is *conceptually* covered, but the repo adds the group-level rejection semantics.

### 5.2 Spec 06 (nle-ops §5)

**Aligned:** split retainSide (split.ts:28-37 ≡ 06 §5.1); snap-once trim invariant + min-1-frame (group-resize.ts, M7 title "bounds, frame snap-once, source invariant" ≡ 06 §5.2); diff-based ripple (ripple/index.ts ≡ 06 §5.4's adopted OpenCut algorithm); reject-not-shift placement + 5 strategies (≡ 06 §5.9); preview/commit drag coalescing "no per-frame command pushes" (06 §4.6:332 ≡ previewElements/commitElements, timeline-core.ts:795/:814); duplicate new-track semantics (≡ 06 §5.10).

**Deltas:**
- Missing ops the spec mandates: roll/slip/slide (06 §5.5-5.7), rateStretch/retime command surface (06 §5.11/5.12 — repo has pure retime math only), freezeFrame/rangeRemoval (06 §5.13/5.14), sync-lock (06 §6). All documented as W5/W6 in gaps/wave2-engine-gaps.md:25-30.
- Trim shape: repo group+`side:"left"|"right"` (timeline-core.ts:91-95) vs spec single-`elementId`+`edge:"start"|"end"`+`syncLinked` (spec 15 §4.3.2:410-420). Two legitimate shapes (UI path vs wire path) — the spec should say which is canonical at which layer.
- Ripple modeling: repo exposes a dedicated `rippleDelete` op; spec models ripple as `RippleCommand` meta-wrapper / delete+`ripple:true` (spec 15 §4.3.4). DECISIONS #7:107 acknowledges: "we expose both granular and wrapped".

**Net-new:** intra-batch overlap guard (DECISIONS #10 — spec 06/15 state atomicity but not batch-internal coherence validation); NOOP vs NOT_FOUND distinction for clamped no-op trims (api.ts:198-208); fake-commit bug class (split returning original object so withUndo sees no change — worklog.md:106-112, same class as nle-engine's editProject finding).

### 5.3 Spec 16 (keyboard)

**Zero keyboard layer in the repo** — controllers are mouse/wheel only; `page.tsx` is the test runner. Same verdict as nle-engine: **SPEC-ONLY** (spec 19 §11 table: "16 keyboard | appendix | No keyboard layer — SPEC-ONLY"). No deltas possible. One absorption note: OpenCut's PlayheadController had ArrowLeft/Right frame-nudge (spec 05:745, citing timeline-playhead.tsx:85-90) — the repo did not port it (W4/W5 item); spec 16 §3.1's frame-step bindings remain unimplemented in both references.

### 5.4 Spec 18 (UI shell)

No shell code — `src/app/page.tsx` is the milestone runner. Spec 18 §13's "No shell code; mockup + timeline-distill" status still holds. The repo's future W4 components are the consumption point for 18 §4.7's `#timeline-area`/`#track-headers`/`#timeline-scroll` regions; the M15 DOM renderer already validates the px math those regions need (left/width positions, selection, playhead, ruler ticks — README.md:55-56). Nothing to amend in 18 this round beyond the live-pointer upgrade when W4 lands.

---

## 6. Test methodology mapping (M1–M16 vs spec 17)

Spec 17 §2.1: **T1** Vitest/Node pure engine; **T2** Playwright+WebGPU render, pixelmatch vs reference PNGs; **T3** Playwright UI, state-WYSIWYG (same `SceneState` from gesture path and `engine.command.apply` path). Cross-cutting: WYSIWYG tri-invariant = state (T3) / pixel (T2) / audio (17 §6, :308-315). Spec 16 §4 defines Patterns 1-4 (keyboard real-UX / direct EngineCommand / hybrid / mouse-mechanics-only).

| Repo milestone | Content | Spec-17 tier mapping |
|---|---|---|
| M1 time math, M2 frame rates, M3 types, M4 snapping, M5 placement, M6 ripple | pure unit, Rust-derived expectations | **T1 content, wrong runner** — executed in Chrome via the page harness (harness.ts) instead of Vitest/Node. Trivially re-tierable (pure TS). |
| M7 trim, M8 split, M9 TimelineCore (preview/commit/undo) | engine ops unit | **T1 content** (same runner caveat). |
| M10 view math | px/zoom/ruler round-trips | **T1 content** (pure functions; no DOM assertions). |
| **M11** | synthetic mouse events through real controllers; `document.dispatchEvent` (milestones-view.ts:236, :244); asserts `JSON.stringify(normalizeTracks(mousePath)) == JSON.stringify(normalizeTracks(apiPath))` (:250-254) | **T3-equivalent** — this is the state-WYSIWYG invariant (00-master §7.1) executed *without* React and without `page.mouse`: closer to spec 16 **Pattern 4** (mouse mechanics) with **Pattern 3's** verification style. It is the Layer-1/2/3 interaction-testing bridge: controllers are driven as real state machines (doc-level listeners) but events are synthetic, so it sits between "pure T1" and "full T3". When W4 real components land, add true Pattern-1 tests (`page.mouse`) and keep M11 as the fast inner ring. |
| **M12** | `PlaceholderCompositor.renderFrame(t)` + `readCenterPixel()` with ±2 tolerance (milestones-view.ts:699-709) | **T2-equivalent in intent, lighter in apparatus** — direct pixel reads instead of pixelmatch-vs-reference-PNG; Canvas2D instead of WebGPU. The state→render chain (incl. z-order, visibility, gaps, trim effects, :765-782) is exactly spec 17 §2.1 Tier 2's purpose, minus full-frame reference comparison. |
| M13 | waveform peaks + drawn-column heights + Goertzel on deterministic PCM | **The audio leg of the tri-invariant** (spec 17 §6, cross-cutting) — Goertzel tone detection is a stronger signal-level assertion than PCM byte-compare; consider absorbing as an allowed audio-verification mode. |
| M14 | headless command round-trips + "STATE WYSIWYG: command path == direct TimelineCore path" (:959-1009) | **Spec 16 Pattern 2** (direct command path) + the determinism contract of spec 15 §1.1 (`same (ProjectJSON, EngineCommand[]) → same SceneState`). |
| M15 | DOM timeline view, hardcoded px expectations | **T3-adjacent** (DOM assertions, no user input). |
| M16 | z-order, batch validation, stale refs, atomic rollback, INTERNAL_ERROR, threshold boundaries | **Error-path/transaction tier** — no direct spec-17 analogue; this is the hardening discipline the engine's G-audit found missing (9% error-path coverage, spec 19 §3.1). Spec 17 §2.5 ("when to add a new test") could cite this class. |

**Structural delta:** single-tier in-browser runner (everything in Chrome; plain headless Chromium, no Xvfb/SwiftShader — scripts/run-timeline-tests.mjs:4-6) vs spec 17's three tiers with T1 mandated on Vitest. This is the same "single-tier" corrective pattern flagged for nle-engine (spec 19 §8 "Re-tier"). Mitigation is easy here: M1–M10 are pure TS (Vitest-ready); M11 needs jsdom or the event abstraction; M12/M13/M15 legitimately stay browser-side as T2. The repo's count discipline (78+38+20=136, matching README's 136/136 claim) is exact — no count drift.

---

## 7. Verified-citations log (anti-fabrication protocol)

12 claims from this report, each verified by opening the cited lines:

| # | Claim | Verification | Status |
|---|---|---|---|
| VC1 | README:32 says "JSON `EngineCommand` API (00-master D9 prefixed names; see DECISIONS #9)" | README.md:32 read | ✅ VERIFIED |
| VC2 | DECISIONS #9 quotes "00-master §2 Decision 9 shows `{ type: 'timeline.split', params: … }`" | .agents/DECISIONS.md:134-139 read | ✅ VERIFIED (the quote exists) |
| VC3 | 00-master actually shows BARE `{ type: 'split', params: { time, trackIds } }` | 00-master-spec.md:234 and :562 read | ✅ VERIFIED — **refutes VC2's premise; no 00-vs-15 conflict exists** |
| VC4 | Headless API exposes 18 command types (14 `timeline.*` incl. undo/redo + 4 `track.*`) | headless/api.ts:38-87 read; union enumerated | ✅ VERIFIED |
| VC5 | `PlannedElementMove` matches spec 15 §4.3.3 field-for-field | group-move.ts:69-74 `{sourceTrackId, targetTrackId, elementId, newStartTime}` ≡ spec 15:491-496 `{elementId, sourceTrackId, targetTrackId, newStartTime: MediaTime}` | ✅ VERIFIED |
| VC6 | Repo CommandResult has 5 coarse codes vs spec 15 §6.3's ~24 | api.ts:89-102 vs 15-wire-protocol.md:2796-2828, both read | ✅ VERIFIED |
| VC7 | nle-engine headless = 19 JSON-RPC ops + `$ref` | nle-engine/src/lib/nle/headless/api.ts:402-421 (EditOperationName union) + :24-34 ($ref rules) read | ✅ VERIFIED |
| VC8 | Engine state = flat `TimelineData{tracks[], clips[], …}`; opencut = `SceneTracks{overlay[], main, audio[]}` | nle-engine core/types.ts:1319-1370 vs opencut types/index.ts:95-99, both read | ✅ VERIFIED |
| VC9 | Engine Timeline has slip/slide/roll/rateStretch; opencut TimelineCore does not | timeline.ts method grep: slip:4045, slideItem:4133, rollingTrimItems:2998, rateStretchItem:3153; opencut timeline-core.ts:209-907 method list has none | ✅ VERIFIED |
| VC10 | Drag threshold = 5px, strict `>` | element-interaction-controller.ts:51 `TIMELINE_DRAG_THRESHOLD_PX = 5`; :169 `Math.abs(...) > TIMELINE_DRAG_THRESHOLD_PX` | ✅ VERIFIED |
| VC11 | M11/M12/M14 implement the WYSIWYG invariants | milestones-view.ts:183 (M11 title), :250-254 ("STATE WYSIWYG: mouse path == API path"), :699-709 (readCenterPixel ±2), :959-1009 ("command path == direct TimelineCore path") | ✅ VERIFIED |
| VC12 | 136 tests = 78 core + 38 view + 20 hardening | grep counts: milestones-core.ts 78 `test(`, milestones-view.ts 38, milestones-hardening.ts 20; runner scrapes `window.__TIMELINE_TEST_REPORT__` (run-timeline-tests.mjs:57-58; page.tsx:76) | ✅ VERIFIED |

**UNVERIFIED items:** (a) the original OpenCut-classic value of `TIMELINE_INDICATOR_LINE_WIDTH_PX` (no opencut clone at `/home/z/repos` in this environment) — repo says 2px (pixel-utils.ts:9), spec 05:745 says 3px; (b) whether CodeRabbit ever commented on PR #1 (network claim in HANDOFF.md:18-20, not checkable here).

---

## 8. Recommendations for the coordinator

### 8.1 Spec 15 (wire protocol) — the convergence work

1. **Do NOT adopt prefixed names.** Resolve the false-conflict issue: the correct action on opencut-timeline is a correction to its DECISIONS #9 (00-master:234 is bare; the prefixed surface they saw is the *manager-method* column `engine.timeline.splitElements`, spec 15 §4.2:274). Bare command types stand in canon. The repo then needs a **mechanical rename pass** (18 types) + param-shape alignment (see §3.2 table — the highest-value changes: `timeline.insert`→`insert` with `placement` object; `timeline.trim`→`trim` with `elementId/edge`; `timeline.split`→`split` with `time/trackIds`; `track.add`→`addTrack`; `track.remove`→`deleteTrack`; add `value?` to toggles). `PlannedElementMove`/`PlannedTrackCreation` need zero work.
2. **Absorb from the repo into spec 15:** (a) `NOOP` error code (or an explicit rule that clamped no-ops return `ok:false` with a NOOP-class code) — currently missing from §6.3; (b) atomic-batch semantics beyond "all-or-nothing": eviction-suspended transactions, depth-anchored rollback, redo-stack clear after rollback, undo/redo rejected inside batches (§7, from DECISIONS #10 addendum); (c) intra-batch overlap guard for insert batches (§7 or a §4.3.9 constraint); (d) document that insert results should surface the *actual* landed start time when the main-track zero-anchor clamps (repo returns `data.startTime` = actual, api.ts:169-172; spec already has MAIN_TRACK_CONSTRAINT :2815 for the sibling case); (e) consider making `snapshot` the in-protocol equivalent of the repo's out-of-band readouts so state assertion is protocol-uniform.
3. **TrackType taxonomy:** reconcile repo's 5 kinds (`video/text/audio/graphic/effect`, types/index.ts:43) vs spec 15 §4.3.22's 3 (`video/audio/overlay`, :1012). Spec 06 §4.7 folds text/graphic/effect into `overlay` — recommend spec 15 addTrack adopts the 5-kind OpenCut taxonomy OR the repo maps to 3 at the wire boundary; decide once, document in both.

### 8.2 Spec 05 (timeline)

1. **Absorb the magnetic main-track zero-anchor semantics** (empty-main→ZERO; start ≤ earliest → clamp; sole main element can't group-move off 0; `moveElements` as the raw escape hatch) into §8.3/§14.5 — this is the repo's most load-bearing undocumented behavior (placement/index.ts:167-197; SKILL gotcha #1). It is a *spec-amendment-grade* insight: three review rounds and the test fixtures all encode it.
2. Absorb: drag threshold 5px strict-`>`; coordinate-space contract (viewport vs content; `elementRectLeft` = `getBoundingClientRect().left`); insert startTime-override semantics; ruler interval tables + spacing constants (verify constants against OpenCut source before canonizing — see UNVERIFIED (a)).
3. Fix spec-side: §5.2 zoom limits are not implementable as written (min "1 px/s" vs repo's dynamic zoom-to-fit min; max "100 px/frame" vs a zoom-multiplier) — reword as zoom-multiplier + derived px bounds, citing repo scale.ts/zoom-utils.ts as the reference.
4. Resolve the 2px-vs-3px playhead line discrepancy (pixel-utils.ts:9 vs spec 05:745).
5. Upgrade §16 code refs from "forthcoming" to live opencut-timeline links (per spec 19 §12.2), noting W4 components pending (M15 is a test renderer, not the §4 component tree).

### 8.3 Spec 06 (nle-ops)

1. Decide the canonical trim shape per layer: wire = single-element + `edge` + `syncLinked` (spec 15 §4.3.2); UI/controller path = group + `side` (repo). Document the mapping; don't force one shape on both layers.
2. Ripple modeling: keep the `RippleCommand` meta-wrapper/delete+`ripple:true` composition as canonical, but add a note that implementations may expose a `rippleDelete` convenience (both repo surfaces tested — M14).
3. Roll/slip/slide/rateStretch/retime/sync-lock remain spec-mandated ops with **nle-engine as the executable reference** (opencut-timeline lacks them) — record that division of labor explicitly in spec 19 (see 8.6).
4. Absorb the intra-batch overlap guard + NOOP/NOT_FOUND split into the op-semantics constraints (06 §5.2/§5.9).

### 8.4 Spec 16 — nothing to absorb (no keyboard layer in either reference; both SPEC-ONLY). Note the un-ported PlayheadController arrow-key nudge as a W4/W5 port item so §3.1's frame-step bindings get a reference when components land.

### 8.5 Spec 18 — no changes this round; when the repo's W4 components land, wire §4.7/§13 to them and upgrade the spec 19 pointers.

### 8.6 Spec 19 — §3.2 must be rewritten (highest-priority doc change)

The "timeline-distill — forthcoming" section (:77-81) recommended: "leave `MediaTime`/`FrameRate`/`SceneTracks` types out (they live in the engine layer per spec 09/01) — the distill is UI-only." **The repo that landed contradicts this on purpose**: it ports the full type system (2,475 LOC of core+types+snapping+placement+ripple), a TimelineCore engine (986 LOC), and a spec-15-shaped headless API — the user's framing "more like timeline / multi-track engine core" is correct. Recommended rewrite: opencut-timeline = the **timeline/multi-track engine-core reference** (tier 3 in the §3 hierarchy, sibling to nle-engine); its type layer is the executable form of Decision 2 / spec 06 §4.7; its controller layer is the spec 05 §14.4 reference; W4 components (when they land) upgrade specs 05/18 to live links. Also update §9 watch-list item 7 ("timeline-distill repo appears → wire §3.2") and the §11 table rows for 05/06/15 with live file:line refs.

### 8.7 The overlap/seam resolution (single most important recommendation)

**One state model, one wire protocol, two algorithm homes, one render seam:**

- **State:** `SceneTracks` (opencut-timeline's, = spec 06 §4.7/09) is the runtime SceneState of record. nle-engine's flat `TimelineData` is the persistence/composition-facing model; the seam is an explicit `SceneTracks ↔ flat` adapter (spec 07 consumes flat; spec 09 serializes flat). Do not merge the models; specify the adapter.
- **Wire:** spec 15's bare `EngineCommand` is the only protocol. nle-engine retires JSON-RPC+$ref (already spec 19's verdict); opencut-timeline renames its 18 types and aligns param shapes (8.1.1). Its `TimelineCore` already implements the spec's `engine.timeline.*` manager-method surface 1:1 — it is the natural home of the timeline-manager half of spec 15 §4.2's dispatch table; the engine keeps composition/media/render-side commands.
- **Ops:** opencut-timeline is the reference for placement/zero-anchor/ripple-diff/split-snap-once/group-move + interaction controllers; nle-engine is the reference for roll/slip/slide/rateStretch/insert-overwrite-3-point/sync-lock. Both must express ops as pure functions over SceneTracks per spec 06 §4.6's `Op` shape before grafting.
- **Render:** keep `setTracks()/renderFrame(t)` as the compositor seam (DECISIONS #5); engine's WebGPU compositor plugs in behind it (after its 8-bit corrective work per spec 19).
- **Undo:** both snapshot-based (spec 15 §6.2 strategy 2); opencut's transaction machinery gets absorbed into spec 15 §7; engine's keyframe-blind equality (P0.6) is already chartered.

### 8.8 What must NOT be dropped (from opencut-timeline, regardless of convergence choices)

1. The **M11/M14 state-WYSIWYG test pattern** — spec 00 §7.1's invariant made executable and cheap (synthetic events through real controllers; command path == direct path). Keep as the fast inner interaction ring even after real `page.mouse` tests exist.
2. The **M12 pixel-verification chain** + M13 Goertzel audio leg — the tri-invariant implemented without GPU infrastructure.
3. The **magnetic zero-anchor semantics** + insert startTime-override + coordinate-space gotchas (the "hard-won" list — belongs in spec 05 prose per spec 19 §5's ledger).
4. The **intra-batch overlap guard, NOOP code, transaction rollback discipline** (→ spec 15 §6.3/§7).
5. The **three-round review cadence** finding distinct bug classes each round (port fidelity → regression → cap/edge; worklog.md Task 4 meta-lesson) — process insight worth a line in spec 14/17.
6. The **deterministic-id-for-replay discipline** — repo's counter (DECISION 6) vs spec 15's `idSeed` params (§4.3.1:386-390, Goal 2 :85): align the repo to `idSeed` at the wire boundary, but keep the counter as the internal default; spec 15 should mention the reset-for-tests pattern.

---

*End of SCOUT-R8-A report. One file written: this report. No other file in either repo was touched.*

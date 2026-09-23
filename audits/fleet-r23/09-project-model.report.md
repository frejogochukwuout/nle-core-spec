# R23 fleet audit — 09-project-model.md (ProjectJSON, scenes, media records, persistence)

**Agent:** R23-fleet-09 (SPEC-FILE AUDITOR, fresh context) · **Date:** 2026-09-07
**File owned:** `nle-core-spec/09-project-model.md` · **Edits:** §0 (header Status + the full FORWARD INVENTORY triad) — the §1-§14 scout corpus and the `## Testing` contract untouched (historical, per the round rules).
**Live repos read (no test runs, no git writes — counts trusted per pins, features verified by reading code):** app `70e99f0` (sceneBridge.ts 503L, sceneBridge.test.ts 25 tests, engineService.ts 580L, EngineMount.tsx, GluedShell store surfaces via nle-ui `85dcf57` useUiStore.ts 1055L + mockData.ts 274L; submodule pins: nle-ui `85dcf57`, OT mirror `a4e971d`, engine `4ef0147`) · OT `222532c` (types/index.ts 382L, ops/timeline-core.ts toJSON/fromJSON + setTracksMuted/setTracksLocked, testing/milestones-*; report json = 489) · engine `b8c6f88` (persistence.test.ts 252L P1-P4, load-validation.test.ts 745L V1-V7, N2b @ `37cdd28`) · in-repo seal artifacts (CORE-SEAMS.md §D, otProject.ts 128L + otProject.test.ts 12 tests, mockData.ts 126L).

---

## VERIFIED-STRONG (BASE claims that held under fresh reads)

1. **The R15 amendment set is consumed LIVE — every amendment now has executing code:**
   - **A2** (per-scene `Marker`, Bookmark absorbed): the app's sceneBridge maps `scene.markers` ⇄ OT `bookmarks` with the MARKER_HEX law (8 color names ⇄ token hexes, S4; the F13 default-color cycle pin @ app `40e05bf`). OT's Bookmark = `{time, note?, color?, duration?}` — the bridge is the A2 rename in executable form.
   - **A4** (mute S-authored/G-projected): OT track field + `setTracksMuted` (S3 seam round @ `a4e971d`, the setTracksLocked D-T3 twin, M46 pins; NOT lock-gated — presentation vs content family law) + the app's kind-aware mute-all convergence pin (nle-ui RR1-B-5 @ `85dcf57`).
   - **B1** (`linkedTo`): bridge sidecar + the engine-side `av-link` expansion family (`@/lib/nle/bridge/av-link` in engineService).
   - **B2** (linear persisted volume): `el.volume` (linear) ⇄ `params.volume` (dB) both directions in sceneBridge (D28-A2) — exactly the §3.1A "conversion at the UI boundary" law, one model shared by the port volume line + the inspector gain + the mixer strip.
   - **N1** (inline elements): nle-ui mockData + the bridge consume inline `ElementJSON[]` throughout.
2. **OT's doc-model surfaces at `222532c`** — SceneTracks `{overlay[], main singleton, audio[]}` (the spec's `SceneTracksJSON` mirror, 00-master D2), the 7-way element union (audio upload|library / video / image / text / sticker / graphic / effect), `toJSON()` (committed scene only, deep copy — previews never leak into saved state), `fromJSON` normalization set (strict-boolean `locked` [S2-F7 — a truthy string never locks], missing trims default 0 [W9 E13], animations normalized at ingestion [SC-5/SE-4], id counter seeded from element+track+**keyframe** ids [review-6 A3 — the upsert data-loss class]), element-level persistence fields `params` (volume dB + muted), `transitionOut` (S3, engine-SSOT), `retime` (W2), `animations` (W5). 489/489 confirmed from the runner's own report json.
3. **The app's sceneBridge is far richer than the spec previously recorded** — bidirectional (sceneToTScene + tSceneToScene), identity law (ids survive unchanged), source-window law (`trimStart + duration + trimEnd == sourceDuration`), field law D2e (structure engine-owned incl. track `locked`; speed/opacity/fades/effects/linkedTo/solo/waveform sidecar), marker⇄bookmark hex map, W2 speed⇄retime with the RR1-B-1 identity fix (rate projects even at 1; load maps speed 1 → no-retime), S3-C6 element-mute round-trip. 25 pinned tests incl. the "engine operates on bridged scene" wiring proof and the flattener varispeed pin.
4. **The engine's project-loading suites exist and are real** (previously absent from the spec entirely): `persistence.test.ts` (migrateProject version gates / hydrateTimeline never-throws / serializeTimeline defensive-clean / normalizeProjectData idempotence) + `load-validation.test.ts` (V1-V7 finders + `NLE_SCHEMA_VERSION` + `ProjectWarning`) — the A8 fast-venue migration answering RV1-TEST's zero-coverage list.
5. **The seal artifacts are as advertised**: CORE-SEAMS §D S18-S21 (the spec-09-shaped mock subset REGISTERED-DELTA; the fixture bridge a TESTED REFERENCE, not an import target), otProject.ts (toTicks/fromTicks nearest-tick, projectClip/projectClipBack tick-arithmetic invariant, 12-test floor), mockData.ts (seedDoc/multiTrackDoc/laneForMedia).
6. **The no-gap ruling (D12) holds live**: OT stays single-scene; the app holds ONE `TimelineCore` for the active scene (EngineMount), rebuilt on scene switch / docVersion.

## FIXED (stale BASE claims corrected in §0)

1. **OT pin/count**: `05584d8` — 459/459 (329 in-page + 130 real-mouse) → **`222532c` — 489/489 (359 in-page + 130 real-mouse)** (report json authority; S3's M46 +3 after the 486-era; the S-round/T-round/F1 hardening all landed). Also recorded: the app consumes the OT mirror @ `a4e971d` (UPSTREAM.lock, exact-upstream, testing/ stripped).
2. **App pin/count**: `e662759` — 83/83 → **`70e99f0` — 117/117** (W3 JKL audio half + RR1-B), + consumer pins (nle-ui `85dcf57` = package HEAD; engine `4ef0147`, 14+ behind `b8c6f88` — the S-engine consumer re-pin wave).
3. **The sceneBridge description** was one line ("the app's scene wiring … executing app-side") — now the full R23 state (bidirectional + the law set above).
4. **New BASE rows added**: the engine row (persistence + load-validation suites, N2b, the C8/§10.3 reference-not-canon posture kept) and the R23 seal-artifacts row (CORE-SEAMS §D + otProject + the mini mock subset).
5. **Acceptance/test-plan citation fixed**: "spec 17 §13A matrix rows 'Schema validation' / 'Project round-trip (JSON ↔ OPFS)' / 'Migration framework'" → the ACTUAL spec 17 §3 rows ("Project save / load (JSON round-trip)" / "Project schema migration (v1 → v2)" / "OPFS persistence (media cache, project autosave)") + §13A facets; battery posture extended to the engine suites.
6. **Header Status** carries the R23 round record (re-baseline + re-tags + the spec-14 §4 re-home), R22 text preserved as lineage.

## GAP register (re-checked — every row re-verified against live code)

| Row | R22 state | R23 finding | New tag |
|---|---|---|---|
| ProjectJSON persistence (§4-§6: OPFS atomic write, migrations, autosave, locks) | W-project | **REMAINS-OPEN** — no OPFS/IndexedDB/localStorage anywhere app-side; `saveNow` is the mock ⌘S toast drill (`saveAttempt` + `simulateSaveFail`); engineService's "persistence" = the in-memory scenes doc (mirror + sidecar merge) | **w3** |
| Multi-scene: `scenes[]` + scene wire ops | W-project (one combined row) | **PARTIALLY LIVE (mock-grade)** — nle-ui store: `scenes[]`, `createScene`/`deleteScene`/`switchScene`, `docVersion` rebuilds, 2-scene sample project; EngineMount: one core for the active scene, REBUILT on switch (undo resets per switch). Real w3: the lifetime policy | **w3** |
| Cross-scene-undo law + history budget (§3.1A) | W-project (folded into the combined row) | **REMAINS-OPEN, now a separate row** (the posture law: each retired spec-14 §4 row visible). The law is satisfied trivially today (rebuild resets; mock whole-doc undo snapshots carry `activeSceneId`); the budget-cap/eviction law for inactive cores is unbuilt | **w3** |
| Media layer (registry + probe + lookup; §7; the spec-15 §9.5 staircase cross-ref) | not in §0 (lived in spec 15 / W-media) | **ADDED** — the app consumes display-shaped mock records (`size: "1.8 GB"` string, `thumbnail` path, `offline`, `duration: number|null`, mock `Project.loop` — the N12/N5 non-persisted loop is mock-only) + EngineMount's deterministic VirtualMediaAsset table; real decode → r4 (N5, user-gated) | **w2** (N5 → r4) |
| The otProject fixture-bridge rows (the C1-entry track-shape decision + the stills synthetic-extent caveat) | not in §0 | **ADDED** — registered decisions from the R23 seal, not code: (a) the mini-window track-shape mapping (bound video → main / other video → overlay / audio → audio[], duration-sorted — the APP-side sceneBridge already decided its own mock-kind mapping; the mini's is the open one); (b) README deviation #13 stills caveat | **K3** (C1(d) per D24) |
| No-gap ruling (OT single-scene, D12) | stated | **HELD** — confirmed live | — |

**Spec-14 §4 posture-law check (charge c):** W-project's five rows (ProjectJSON persistence / multi-scene / scene wire ops / cross-scene-undo law / history budget) — ALL present in §0 now (persistence row; multi-scene+wire-ops row; cross-scene-undo+history row). Previously all five existed but folded into two rows; now split for row-level traceability. Plus the W-media overlap row (w2) and the C1(d) K3 rows. Nothing was found only in spec 14.

## REMAINS-OPEN (the w2/w3/K3 worklist, for the plan's owners)

1. **w3 — ProjectJSON persistence**: the whole §4-§6 layer (OPFS, atomic write, migrations, autosave, locks, the kimdogyeom hardening) — zero real code app-side today. Entry: S-app after w1 (plan §2/§3).
2. **w3 — multi-scene lifetime + history budget**: per-scene core reuse vs rebuild-on-switch; the inactive-core budget law; scene persistence riding per-scene `toJSON`/`fromJSON` once persistence exists.
3. **w2 — the media layer**: the real MediaRecord registry (N3 numeric shape, colorInfo, OPFS storage refs, probe), spec 15 §9.5's staircase; the mock-vs-spec registered deltas (display `size` string, mock `Project.loop`, mock `dirty` flag) to be reconciled at the w2/w3 seam.
4. **K3 — the fixture-bridge decisions**: the otProject copy + the C1-entry track-shape pin + the stills-extent ruling (CORE-SEAMS S6/S19 + the gap register's S6/S19 row).

## NOTES (verified details worth keeping in the record)

- **The app's EngineMount mirror** writes the bridged-back doc with `dirty: true` and re-derives `lockAll` on every scene write (T-round D-T3) — the store's scenes doc is the de-facto in-memory persistence format ("spec-09-ish" per its own comment); w3 formalizes it.
- **OT's Bookmark has a `duration?` field** (in/out duration) the spec's `Marker` does not carry — the bridge ignores it today; a marker-family widening decision will be needed when OT-side bookmark ranges surface (spec 16 §3.7 domain).
- **nle-ui's mock `TrackJSON`** carries `waveform?` (mock-level view pref, home = UI store per spec 18 §4.7) and `badge` — registered mock extras, not spec fields.
- **The engine's `Project` line citation** in §10.3 (`types.ts:1451`) drifted to 1486 at `b8c6f88` — left as-is (historical scout citation, "reference, NOT canon" posture, the re-cite convention the table already carries).
- **The mini's `otProject.test.ts` portability note**: 2 of its 12 tests consume mini seed fixtures — the C1 copy vendors or swaps them (recorded in the test file's own header; travels with the K3 row).
- The file's §1-§14 (scout corpus: OpenCut-classic/FreeCut quotes, 31-migration study, kimdogyeom hardening) and the `## Testing` executable contract are unchanged and remain the WHAT/acceptance core; all live-repo deltas live in §0 per the R22/R23 posture law.

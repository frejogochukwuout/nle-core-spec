# Integration Review R7 — Cross-Stream Consistency (Round 7 Final Gate)

**Reviewer:** general-purpose (INTEGRATION-R7, Task ID 4)
**Date:** 2026-09-02
**Specs reviewed:** 12 refined stream specs + 15/16/17 + new 18/19 + 00/14 + README + `audits/ROUND-7-AUDITS.md`
**Method:** Per-check verification with grep across all canon files (`*.refined.md`, `15/16/17`, `00`, `14`, `18`, `19`), cross-referenced against the master spec, the Round-7 audit record, and live source in `/home/z/my-project/nle-engine` (citation spot-checks opened at the cited lines). Record files (`TEST-INTEGRATION-REVIEW.md`, `audits/`, `*-SIGNOFF.md`) were treated as historical records per the review charter; old counts inside them are not flagged.

## Summary

- Cross-stream checks performed: 11
- Issues found: 10 (1 BLOCKING, 4 MAJOR, 5 MINOR)
- Master spec state: coherent (Decision 10, stream map, glossary, v3.0 all correct) — no master-spec update required beyond the issues below
- Citation spot-checks: 35/35 rows from the new code-ref tables verified against nle-engine source (one ±2 line offset)
- New Round-7 artifacts (specs 18/19, code-ref tables, fixture registrations, export-command amendment) are present and mostly well-wired; the round's own amendment is the source of the blocking issue

## Verdict: ❌ HOLD PUSH — 1 BLOCKING + 4 MAJOR issues must be fixed before commit+push

The Round-7 revision is structurally sound: both new specs exist and are well cross-wired (25+ inbound references resolve), all 16 per-spec code-ref tables exist at exactly the anchors spec 19 §11 claims, every engine citation spot-checked is real (35/35), the fixture registry math (15 registrations) checks out, and the master/README/phases were updated correctly. However, **the Round-7 transition amendment (spec 07 §6.1A) was not propagated to the wire protocol (spec 15) or the persistence model (spec 09)** — three canon specs now describe the same `Transition` entity with incompatible shapes, and spec 07 asserts a spec-15 state that is false today. Additionally, the spec 15 §4.1 union body itself is missing the two new project commands it claims to contain (76 members under a "Total: 78" headline), and spec 16's normative §3 binding table still emits ~43 commands with pre-Round-7 params that would fail spec 15's Zod validation. All five are mechanical, well-scoped fixes for the coordinator.

---

## Per-check results

### Check 1: Command-count coherence

**Status:** ⚠️ TWO COUNT DEFECTS (Issues #2, #5)

Current-count sweep (`78 types` / `78-type` / `55 undoable` / `23 non-undoable` / `16 categories`) is consistent across canon: `15-wire-protocol.md:256,350,4773,4969,5074-5075`; `16-keyboard-shortcuts.md:35,865,2348`; `18-ui-shell.md:107,302`; `19-code-references.md:137,169`; `00-master-spec.md:277,562`; `06-nle-ops.refined.md:2349`; `README.md:91`. Old counts survive only in records (`TEST-INTEGRATION-REVIEW.md`, `audits/`, `TESTABILITY-SIGNOFF.md`) and in properly qualified history ("73 at TEST-02 + 5 Round-7 additions" at 16:35; "73→78" at README:91). Spec 01's test enumerations were updated ("for each of the 78 `EngineCommand` variants", `01-core-engine.refined.md:2174,2210`). No stale "60 types" / "14/15 categories" / "42 undoable" / "18 non-undoable" survives as current canon text.

**Defect A (→ Issue #2):** the §4.1 union **code block** contains only **76 members** — `RenameProjectCommand` and `DeleteProjectCommand` are absent from the Project-ops section (`15-wire-protocol.md:190-194` lists `CreateProject/LoadProject/SaveProject/CloseProject/UpdateProjectSettings` only; the union ends at `ExportFrameCommand;`, line 249). They exist everywhere else: §4.2 mapping rows (`:304-305`), §4.3.77/§4.3.78 (`:2034`, `:2052`), §4.4 dispatcher cases (`renameProject`/`deleteProject`), and the §11 Zod array (`RenameProjectCommandSchema`, `DeleteProjectCommandSchema` at `:4356-4357`). The headline "Total: 78" (`:256`) and the Zod union (78 entries) therefore contradict the TS union body (76). An implementer writing `z.infer`-checked dispatch off §4.1 gets a compile-time mismatch.

**Defect B (→ Issue #5):** UI-layer extension counts disagree as current text:
- `16-keyboard-shortcuts.md:37` — "Spec 16 additionally defines **16 UI-layer extensions**"
- §12's table enumerates **19** rows tagged `(UI)` (seekToMarker, toggleLoopPlayback, toggleSnap, findPlayhead, splitAndRemove, pasteAttributes, freezeFrame, join, toggleAVLink, beginRenameTrack, zoom, zoomToFit, zoomToSelection, resetEffects, resetColorGrade, matchColor, seekToKeyframe, nudgeKeyframe, toggleKeyframeNav)
- §8.3's local-union UI block (`:826-844`) lists **19** entries — a *different* 19: it includes `toggleRipple` (`:830`) but places `freezeFrame` outside the block (`:799`); §12 tags `freezeFrame (UI)` (`:1998`) but not `toggleRipple` (`:1983`)
- `05-timeline.refined.md:1463` — stale old count as live text: "~50 keyboard shortcuts (§19, spec 16), most of which map to `EngineCommand` types (spec 15 §4); **18 UI-layer extensions** (snap/ripple toggles, viewport zoom, etc.) route to the UI store"

Record-status note: `TESTABILITY-SIGNOFF.md:225` still lists "exportFCPXML not in spec 15's 73 types… gated" as an open known-issue; Round 7 resolved it — an optional one-line "resolved in Round 7" annotation would keep the record honest (not required).

---

### Check 2: Export-command coherence across 15/16/10/18

**Status:** ⚠️ ONE LEFTOVER (Issue #4)

The mapping is consistent in every checked spot except one:

- **Spec 15 §4.2/§4.3.74-76** — `exportFCPXML` → `engine.export.exportFCPXML({format, bundleMedia})` (ExportManager, spec 01 §14.11) at `:346` and `:1946`; `exportMaster` → `engine.renderer.exportProject({format, destination, range})` at `:347`/`:1995`; `exportFrame` → `engine.renderer.saveSnapshot({format, time})` at `:348`/`:2026`; `format` default `'fcpxml-1.10'` with `'fcpxml-1.11'` documented as Display-P3-only (§4.3.74 params doc `:1925-1933`; Zod default `:4220`). §14.11 output-exception design exists (`:4922`); §8.10 export-over-the-wire exists (`:3209`); `CommandResultData` (`:2714`) + `data?` on the result (`:2706`) exist.
- **Spec 16** — §0.2 (`:37`), §3.9 bindings (`:303-308`, `Cmd+E` → `{ format: 'fcpxml-1.10', bundleMedia: false }`), and the §12 mapping row (`:2029`) are all canonical and consistent.
- **Spec 10** — the gate is gone: `10-fcpxml-export.refined.md:2046-2053` ("T3.2 below is **un-gated and runs as written**. The FACET-10 follow-up is closed."), T3.2 compares `Cmd+E` byte-for-byte against `engine.command.apply({type:'exportFCPXML', params:{bundleMedia:false}})` (`:2062-2072`); manual M1 drives `engine.export.exportFCPXML(project, {bundleMedia:true})` as the implementation path (`:2087`).
- **Spec 18** — §4.8 Deliver page dispatches `exportFCPXML` (§4.3.74) + `exportMaster` (§4.3.75) (`:157`); §5 rows carry the same params incl. `CommandResult.data` (§14.11) and `renderProgress` events (`:187-189`).
- **Spec 01** — §14.11 ExportManager greenfield home exists (`01-core-engine.refined.md:2080-2086`); §3.3 interface declares `exportFCPXML(): Promise<string>` "canonical home per §14.11 — ProjectManager copy removed Round 7" (`:349-352`).

**Leftover (→ Issue #4):** `16-keyboard-shortcuts.md:2287` (Appendix A — the implementation checklist):

> `| exportFCPXML | engine.project.exportFCPXML({format}) (direct — greenfield on ProjectManager) | src/project/export-fcpxml.ts |`

This is the pre-Round-7 mapping (ProjectManager, direct call) contradicting spec 15 §4.2/§4.3.74, spec 16's own §12 row (`:2029`) and §3.9 attribution (`:309`), and ROUND-7-AUDITS' "ExportManager made the single exportFCPXML home (ProjectManager copy removed)". Lines 2288-2289 (exportMaster/exportFrame "(direct)") name the correct managers but describe them as direct calls rather than `apply()` dispatch — same table, wording drift. No `format: 'fcpxml-1.11'`-as-default survives anywhere.

---

### Check 3: New-docs cross-reference integrity

**Status:** ⚠️ INBOUND CLEAN, SPEC 18 OUTBOUND ANCHORS DRIFT (Issue #6)

`18-ui-shell.md` and `19-code-references.md` exist; 25+ inbound references were spot-checked and **all resolve**: `15:4761`→18 §5 ✓; `08:907`→18 §4.8 ✓; `04:470`→18 §3.3 ✓; `04:645`→18 §4.8 ✓; `10:2023`→18 §8.1 ✓; `16:789`→18 §4.5 ✓; `16:1155/2349`→18 §4.8 ✓; `14:92`→18 §5 ✓; `14:176`→18 §4.7 ✓; `14:182`→18 §4.2/§4.4 ✓; `00:520`→18 §15 ✓; `00:3/17`→19 §12/§3.2 ✓; `00:286`→19 §6 ✓; `00:293`→19 §7/§9 ✓; `README:101`→19 §8/§12 ✓; `05:8/14/1136`→19 §3.2 ✓; `16:2350`→19 §11 ✓; `19:229`→18 §15.1 ✓; `15:4715/4755`→16 §3.9/§0.2 ✓; `15:4763`→19 (§13.13) ✓; `14:25`→19 §9/§8 ✓. Spot-checks required by the charter all pass: "spec 19 §3.2" ✓, "spec 18 §5" ✓, "spec 15 §14.11" ✓, "spec 15 §4.3.74" ✓ (heading at `15:1918`), "spec 17 §5.3" ✓ (`17:897`), "19-code-references.md §8" ✓ (ROI table).

Spec 18/19's own outbound references into specs ≤17 mostly resolve (verified: 15 §4.3.52-56/62, 14.11; 07 §5.4/§5.5/§6.1A/§6.3/§12.2; 06 §4.6/§5.1/§5.5/§5.9; 04 §7.1/§16.2/§16.5; 03 §3.4; 09 §3.1/§7/§13; 16 §0.2/§3.1/§3.9/§7.3/§12; 17 §4/§6.1/§13.2/§15.6; 03 §14.D; 04 §14.C; 12 §14; 02 §3; 06 §5.11; 05 §10). But **seven anchors into spec 05/02/03 are wrong** (Issue #6):

| Spec 18 location | Cites | Actual section |
|---|---|---|
| §4.2 (`:119`) | "spec 06 §5.9 / spec 05 **§8.9**" for drag-drop placement | 05 §8.9 is *Keyboard shortcuts*; drag-drop is **§8.8** (`05:521`) |
| §5 marquee row (`:167`) | "spec 05 **§8.5**" | §8.5 is *Razor (split)*; marquee is **§8.7** (`05:493`) |
| §5 trim-handle row (`:169`) | "spec 05 **§8.3**" | §8.3 is *Drag → move*; trim handles are **§8.4** (`05:394`) |
| §5 scrub row (`:178`) | "spec 05 **§8.2**" | §8.2 is *Click → select*; playhead drag is **§8.6** (`05:467`) |
| §4.3 (`:127`) | "spec 05 **§8.2**'s preview-commit pattern" | preview-commit lives in §8.3/§8.6, not §8.2 |
| §7 rendering table (`:207`) | "Filmstrip thumbnails / waveforms … 02 **§8.2/§8.3**" | 02 §8.2 is `audio-decode.worker.ts`; filmstrip is **§8.4** (`02:519`) |
| §4.5 (`:145`) | "Master audio … (→ **master bus gain, spec 03 §9.2**)" | 03 §9.2 is *Streaming audio chunks*; no master-bus-gain contract exists anywhere in spec 03 (grep-verified) — the concept is unanchored |

Also a label nit: `19-code-references.md` §11 row says "16 keyboard | **appendix** (new)" while the table actually lives in a numbered section (`## 17. Code References — nle-engine`, `16:2321`), not the appendix. Cosmetic.

---

### Check 4: Code-reference table presence + anchor coherence with spec 19 §11

**Status:** ✅ ALL 16 ANCHORS EXIST

Every anchor spec 19 §11 (and `audits/ROUND-7-AUDITS.md:26`) claims was verified present in its file:

| Spec | Anchor | Evidence (heading line) |
|---|---|---|
| 01 | §13A | `01-core-engine.refined.md:1971` |
| 02 | §13B | `02-workers-threading.refined.md:2314` |
| 03 | §13E | `03-playback-engine.refined.md:1499` |
| 04 | §13D | `04-renderer-color.refined.md:1166` |
| 05 | §16.4 | `05-timeline.refined.md:1134` |
| 06 | §10.4 | `06-nle-ops.refined.md:2347` |
| 07 | §12.A.1 | `07-composition.refined.md:1128` |
| 08 | §15A | `08-color-grading.refined.md:1013` |
| 09 | §10.3 | `09-project-model.refined.md:1912` |
| 10 | §12.8 | `10-fcpxml-export.refined.md:1461` |
| 11 | §14R | `11-cloud-render.refined.md:1427` |
| 12 | §13.7 | `12-testing-strategy.refined.md:1459` |
| 15 | §13.14 | `15-wire-protocol.md:4767` |
| 16 | §17 | `16-keyboard-shortcuts.md:2321` |
| 17 | §18.5 | `17-test-plan.md:2599` |
| 18 | §13 | `18-ui-shell.md:286` |

(19 §11 writes "07 §12A table" / "16 appendix" loosely; the precise anchors `§12.A.1` and `§17` both exist — wording nit only, recorded under Check 3.)

---

### Check 5: Type/API consistency (the classic drift checks)

**Status:** ❌ ONE CONTRACT BREAK + ONE SYSTEMIC DRIFT; the five named sub-checks otherwise pass

**(a) `SceneManager` vs `ScenesManager`** — ✅ Spec 01 is clean: all remaining singular occurrences are the corrections themselves (`01:811` "class name is `ScenesManager`, NOT `SceneManager`", `:1045`, `:1090-1091`, `:2022-2024` seed-vs-actual records). One benign hit: `09-project-model.refined.md:608` — `// Get current state from SceneManager` inside a **quoted OpenCut-classic `save-manager.ts` code block** (their comment, not our API surface).

**(b) `window.editor` vs `window.__engine`** — ✅ No `window.editor` survives in canon; only the fix records in `audits/ROUND-7-AUDITS.md:25,39,53`.

**(c) `engine.timeline.*` direct call sites in 05/16** — ⚠️ as documented. Spec 05 is clean (only comments mapping commands→methods at `:366,461` and `apply()` calls at `:464,533`). Spec 16's §8.3 illustrative bodies still call `engine.timeline.updateElementTrim/updateElements/updateClipEffectParams(...)` directly (`:992-1301`) — but the spec **self-flags exactly this** in §0.2's Round-7 note (`:41-44`: "the resolver code below was written against spec 01's class-instance API… read as 'construct the params, then apply'… Flagged for textual migration at the seal round"). Resolver queries (`engine.timeline.getTotalDuration()` `:98`, `getElementsInTrack` `:180`) are reads for `<runtime>` params — allowed. No *new* unacknowledged direct-call sites.

**(d) Transition field names — ❌ BLOCKING (Issue #1).** Spec 07's Round-7 amendment §6.1A (`07-composition.refined.md:312-355`) strikes the seed's single-tier type and declares:

> "**Data + wire contract (replaces the seed's §6.1 type):** `interface Transition { type: 'crossfade'; presentation: string; duration: MediaTime; alignment: number; timing?; leftElementId: string; rightElementId: string; }` … `AddTransitionCommand`/`UpdateTransitionCommand` params follow (spec 15 §4.3.61-63 …)"

But the specs it points at were never amended:
- `15-wire-protocol.md:1704-1710` (§4.3.61, live current text): `TransitionSpec { type: 'crossfade' | 'wipe' | 'slide' | 'iris' | 'glitch'; params: Record<…>; elementAId: string; elementBId: string; }` — the exact shape 07 §6.1 strikes (old 5-value union, no `presentation`/`alignment`/`timing`, `elementAId`/`elementBId`)
- Spec 15's Zod (`:4110-4111`: `elementAId: z.string().uuid(), elementBId: z.string().uuid()`) and example JSON (`:2593-2594`) — same old shape
- `09-project-model.refined.md:193-200` `TransitionJSON` — same old shape (persistence layer)
- `18-ui-shell.md:139` (§4.4 inspector Transition tab) assumes the **new** model: "Presentation picker (27 registry entries, spec 07 §6.3), duration, alignment (→ `updateTransition`, spec 15 §4.3.62)" — the command it cites carries none of those fields
- `14-implementation-phases.md` §2.1 compounds it: "the transition planner/handles/27 presentations (spec 07 §6.1A **now matches the engine's model by construction**)"

A wire/persistence implementation of spec 15 §4.3.61 + spec 09 `TransitionJSON` produces objects the spec 07 §6.1A runtime cannot resolve (field names and tiers both differ); conversely spec 07's claim "params follow (spec 15 §4.3.61-63)" is false as the files stand. This is the FrameDescriptor-class producer/consumer break, introduced by this round's own amendment.

**(e) Layer `masks: MaskDescriptor[]`** — ✅ `mask: MaskDescriptor | null` survives only in the seed `07-composition.md:99`; all canon uses the array (`07:103,614,1923`).

**Additional drift found under this check (→ Issue #3): spec 16 §3's binding table was not included in the Round-7 §8.3 alignment pass.** ROUND-7-AUDITS:54 claims "C2 local-union drift fixed (setLoop start/end, tool enum 9 values, selectElements elements/mode, trim delta, slip single-element, delete/duplicate/paste param renames — all aligned to spec 15 canon)" — true for §8.3 (`:787,794-798,814` carry the aligned shapes) but **false for the normative §3 tables** (spec 15 §13.5: "spec 16 §3 (180 bindings across 13 categories) is that table"), which still emit commands that fail spec 15's Zod:

| Family | Spec 16 §3 rows (current text) | Spec 15 canon | Rows |
|---|---|---|---|
| `setLoop` | `{ params: { in: … } }` / `{ out: … }` (`:131-137`) | `{ start: MediaTime \| null, end: MediaTime \| null }` (§4.3.29, `:1117-1131`) | 7 |
| `selectTool` | `{ tool: 'trim' }` (`:150`) | enum has no `'trim'`: `select\|razor\|ripple\|slip\|slide\|roll\|rate-stretch\|hand\|zoom` (§4.3.45) | 1 |
| `selectElements` | `{ ids: […] , mode }` (`:165-173`, example `:504`) | `{ elements: ElementRef[], mode? }` (§4.3.46) | 10 |
| `trim` | `{ elementId, edge, targetTime, ripple }` (`:192-195`) | `{ elementId, edge, delta, ripple, … }` (§4.3.2) | 4 |
| `move` (type name) | `{ type: 'moveElements', … }` (`:176-177`) | type is `'move'` (§4.3.3) | 2 |
| `move` (params) | `{ moves: …, createTracks: false }` (`:240-245`) | `{ elementIds, delta, targetTrackId, movePlan?, createTracks?: PlannedTrackCreation[], snap? }` | 6 |
| `slip` | `{ elementIds, delta }` (`:196-199, 246-249`) | `{ elementId (single), delta, syncLinked? }` (§4.3.6) | 8 |
| `delete` | `{ elementIds, ripple }` (`:200-202`) | `{ elements: ElementRef[], ripple, cascadeDependents? }` (§4.3.8) | 3 |
| `paste` | `{ time, mode: 'insert'\|'overwrite' }` (`:205-206`) | `{ atTime, targetTrackId?, ripple? }` (§4.3.70) | 2 |
| `duplicate` | `{ elementIds, offset: 'auto' }` (`:208`) | `{ elements, placement?, timeOffset?, idSeed? }` (§4.3.10) | 1 |

~43 rows across 10 families. This also falsifies spec 16 §0.2's own claim (`:37`) that the 33 overlapping §3 types "use spec 15's canonical names verbatim". Related wrinkle: the mark-in/out surface is incoherent — spec 16 maps `I`/`O` to `setLoop` with `in`/`out` params, spec 18 §5 (`:181`) says "in/out point commands (spec 03 §3.4)", and spec 15 has no in/out-point command at all (Playback category = play/pause/seek/setRate/setLoop); spec 03 §3.4 documents Clock-level `setInPoint`/`setOutPoint`, not wire commands.

---

### Check 6: Fixture registry coherence

**Status:** ⚠️ REGISTRATIONS VERIFIED; THREE GAPS (Issue #7)

The 15 Round-7 registrations are all present in spec 17: nine §5.3 rows (`multi-track.json` `:915`, `all-ops.json` `:916`, `with-effects.json` `:917`, `with-masks.json` `:918`, `with-qualifier.json` `:919`, `with-power-window.json` `:920`, `green-screen.json` `:921`, `single-clip.json` `:922`, `varispeed.json` `:923`), five namespaced `09/*` fixtures in the Round-7 namespacing note (`:933-937`), and `typical-s-curve.cube` in §5.5 (`:989`) — matching `audits/ROUND-7-AUDITS.md:55`'s arithmetic (14 + green-screen = 15). Consuming specs carry the round's annotations: `11:2459` ("registered in spec 17 §5.3 in Round 7"), `07:2342-2345`, `08:2443-2447`, `09:2976`, `16:1686`, `12:139`. No fixture remains marked "(NEW — proposed for registration)" (grep-verified, zero hits).

Gaps:
1. **`three-clips.json` is unregistered** — `16-keyboard-shortcuts.md:433` and `:1779` load it ("clips at t=0, t=5s, t=10s"); the registered 3-clip fixture is `simple-cut.json` (17 §5.3 row `:904`). Spec 17 §4.3's anti-pattern explicitly forbids inventing fixture names — the exact class Issue #3 of TEST-INTEGRATION-REVIEW closed for spec 06.
2. **Spec 16's `multi-track.json` recipe assumes a different project** — `16:1763` comments "3 tracks, each 1 clip" and its split-all test asserts every track ends with exactly 2 elements; the registered fixture is 5 tracks / 10 clips (`17:915`). The test as written fails against the registered fixture.
3. **Spec 10's eight namespaced `10/*` fixtures are unregistered under the Round-7 rule** — `10-fcpxml-export.refined.md:2191-2210` defines `10/empty.json`, `10/simple-cut.json`, `10/multi-track.json`, `10/with-transitions.json`, `10/with-retiming.json`, `10/with-text.json`, `10/with-markers.json`, `10/hdr-pq.json`; the Round-7 namespacing rule (17 §5.3 note) requires "such fixtures still register a row here" but only spec 09's five were registered. (Pre-existing FACET-10 assets; the rule was applied incompletely.)

Nano-nit (not an issue): `07:2342` describes `with-effects.json` as "blur + color wheels + LUT" while the registered row says "2 stacked GPU effects (blur + color-wheels)" — description drift only.

---

### Check 7: Stale-marker sweep

**Status:** ✅ CANON CLEAN except pre-existing seed-pointer conventions (Issues #9, #10)

- **"TBD"** — zero hits in canon files; only audit records (which document the TBD→resolved fixes: `ROUND-7-AUDITS.md:25,53`).
- **"Sub-agent scout task"** — zero hits in canon; only in seed files (`03/04/08/10/11-*.md`), which are historical. (ROUND-7-AUDITS:32 records spec 01's six markers were converted.)
- **"§X" / "504-XXX"** — zero hits in canon; `§X` appears only in audit prose.
- **`/home/z/my-project/download/nle-spec`** — canon mentions are annotated: `12:1360-1361` and `10:1400` ("path updated from the original /download/nle-spec/ clone location"); `13-subagent-scout-plan.md:3` carries the Round-7 historical-record note. Unannotated occurrences survive only in record files (`FINAL-SIGNOFF.md:84,104,108,286`; `TESTABILITY-SIGNOFF.md:88`) — out of canon scope, informational only.
- **Bare seed filenames where a `.refined` twin exists** — present as a long-standing convention: `00-master-spec.md:26-37` (companion table) and §8 stream map rows point at `01-core-engine.md` … `12-testing-strategy.md` (seeds, not `.refined.md`); `14-implementation-phases.md:498,635,718`; `09-project-model.refined.md:439` ("`02-workers-threading.md` §8.6" — the section exists only in the *refined* twin). All resolve to real files, but a fresh reader following the master spec lands on the unrefined seeds. Self-references in "Seed:" headers and 13's record are fine.
- **"(unchanged from seed spec"** — 8 hits in canon: `03-playback-engine.refined.md:133,237,275,724,754,898,1365` and `04-renderer-color.refined.md:1056` ("Preserved unchanged from seed spec §12"). These read as provenance annotations ("this design is unchanged"), not placeholders — judged benign, listed for the coordinator's call (they can be reworded to "verified against source" or left).

---

### Check 8: Markdown structural sanity

**Status:** ✅ PASS

Code-fence balance: `grep -c '^```'` is **even in all 19 canon files** (00, 01-12 .refined, 14, 15, 16, 17, 18, 19 — 04 included for safety even though it was not on the checklist). Duplicate top-level section numbers: none accidental. The single grep hit, `07-composition.refined.md` ("## 12." at `:1020` + "## 12.A" at `:1045`), is the established lettered-subsection convention (same family as 01 §13A, 02 §13B, 08 §15A, 11 §14R), not an edit-pass duplication. Spec 15's new §13.11-13.14 and §4.3.74-78 are unique.

---

### Check 9: Master-spec coherence

**Status:** ✅ PASS

- **Status header v3.0** — `00-master-spec.md:3` ("v3.0 … Round 7 adds the code-reference architecture (spec 19), the UI shell (spec 18), the export-command amendment (spec 15), and the nle-engine reconciliation").
- **Decision 10 present** — `:284-294` ("Code-Reference Architecture — the spec set is canon; reference implementations are de-risking references (Round 7)"), correctly cross-wired to spec 19 §5/§6/§7/§9. Decisions 1-10 all enumerated; spec 19 §2.1's "9+1 architectural decisions" is consistent.
- **Stream map** — rows 16 (UI shell, `18-ui-shell.md`, Decision 9) at `:482` and 17 (Code references, `19-code-references.md`, Decision 10) at `:483`; companion table gains 18/19/ui-mock rows (`:40-43`).
- **Glossary EngineCommand example** — `:562` uses `{ type: 'split', params: … }` (not `'timeline.split'`) and states "78 types as of Round 7 — the union includes the Export category, spec 15 §4.3.74-76" ✓.
- §12 open-questions note correctly routes new items to "spec 18 §15, spec 19 §12, and spec 15 §14" (`:520`).

---

### Check 10: Citation spot-check (anti-fabrication)

**Status:** ✅ 35/35 PASS

Rows opened in `/home/z/my-project/nle-engine` at the cited lines, quote verified:

- **01 §13A (10 rows):** `index.ts:7` ✓, `timeline.ts:1980` `export class Timeline {` ✓, `timeline.ts:5225` `execute<T>(label: string, fn: () => T): T {` ✓, `media/registry.ts:19` `resolveMediaUrl(mediaId): string` ✓, `gpu/compositor.ts:981` `format: 'rgba8unorm',` ✓, `playback/player.ts:1038` `if (clip.type !== 'video') continue;` ✓, `core/types.ts:749` `export type Clip = VideoClip | AudioClip | CompositionItem;` ✓, `core/event-emitter.ts:8` ✓, `core/id.ts:7` ✓, `headless/api.ts:99` `Apply a batch of JSON-RPC edit ops + $ref resolution` ✓
- **06 §10.4 (5 rows):** `timeline.ts:2275` `splitClip(` ✓, `:2460` `splitAllItemsAtFrame(frame: number, options: { linked?: boolean } = {}): number {` ✓, `:3858` `slip(clipId: string, deltaFrames: number, …)` ✓, `:6185` `freezeFrameAtPosition(` ✓, `:6329` `joinItems(clipIds: string[]): string | null {` ✓
- **07 §12.A.1 (8 rows):** `scene-assembly.ts:16` ✓, `:1243` `Occlusion cutoff — scan tracks bottom-up (asc by order), find first` ✓, `:1263` `Build render tasks — top to bottom (desc by order).` ✓, `core/types.ts:260` `export type TransitionType = 'crossfade';` ✓, `transitions/registry.ts:2249` `const BUILTIN_PRESENTATIONS: TransitionPresentationDefinition[] = [` ✓, `transitions/planner.ts:21` `leftPortion  = floor(D * alignment)   — frames BEFORE the cut` ✓, `transitions/handle-utils.ts:302` `getMaxTransitionDurationForHandles(` ✓, `effects/pipeline.ts:5107` `return this._pongTexture;` ✓
- **09 §10.3 (6 rows):** `core/types.ts:1180` `export interface Project {` ✓, `headless/api.ts:2265` `if (!p.id || !p.name || !p.timeline) {` ✓, `:1737` `schemaVersion: z.number().int().positive().optional(),` ✓, `:2578` `serializeProject?: () => Project;` ✓, `:1745` `fps: z.number().int().min(1).max(240),` ✓, `timeline.ts:1746` `function snapshotsEqual(a: TimelineData, b: TimelineData): boolean {` ✓, `:2775` Wave-1-stub comment ✓
- **15 §13.14 (6 rows):** `api.ts:747` `// ─── applyOp: the 19-case JSON-RPC dispatch ──…` ✓, `:804` `case 'split': {` ✓, `:825` `case 'addTransition': {` ✓, `:985` `function applyOpTracked(` ✓, `:542` `export function resolveOperationRefs(` ✓, `:1067` — quote `project: input.project, // Wave 2 will replace…` actually sits at **`:1069`** (±2, within tolerance; spec 09 cites the same quote at the exact `:1069`)
- **19 §3.1 (verified rows):** `planner.ts:27` `ALIGNMENT SEMANTICS (subtle — different from v1 scaffold)` ✓, `core/clock.ts:550/:612/:661` ✓, `playback/video-sync.ts:180` `LARGE_DRIFT_SECONDS = 0.2` ✓, `effects/lut.ts:337` ✓, `gpu/mask-manager.ts:478/:640` ✓, `effects/pipeline.ts:3003` `GPU_EFFECT_REGISTRY` ✓, `headless/api.ts:474` `REFERENCE_ID_FIELDS` ✓

No fabricated citations found. The 53/54-clean claim in ROUND-7-AUDITS is credible on this sample.

---

### Check 11: README/process coherence

**Status:** ⚠️ ONE STALE LINE (Issue #8)

- Spec-set table lists 18 and 19 (`README.md:31-32`) ✓; process history gains Round 7 (`:91`, with the "73→78" historical qualifier) ✓; the decisions list has all 10 incl. Decision 10 (`:63-72`) ✓; process docs mention `audits/ROUND-7-AUDITS.md` (exists) and `INTEGRATION-REVIEW-R7.md` (**this file** — now written) at `:55` ✓; status section points at 14 §2.1 + 19 §8/§12 ✓.
- **Stale:** `README.md:13` — the 00-master-spec row still says "Executive summary, **9 architectural decisions**, tech stack, WYSIWYG contract", contradicting the README's own 10-item list at `:63-72` and master §2's Decision 10.
- Nano-nit (informational, not an issue): `:54` says "audits/ — 16 audit reports" while the directory now holds 18 files (12 stream + 4 TEST + 1 reaudit + ROUND-7); `:55` calls ROUND-7-AUDITS out separately, which mostly covers it.

---

## Issues list

| # | Severity | Issue | Where |
|---|---|---|---|
| 1 | **BLOCKING** | Transition wire/persistence contract break: 07 §6.1A's Round-7 amendment (two-tier, cut-centered, `presentation`/`alignment`/`timing`, `leftElementId`/`rightElementId`, `type:'crossfade'` only — "the wire contract that replaces the seed's §6.1 type") not propagated: spec 15 §4.3.61 `TransitionSpec` + §11 Zod + example JSON and spec 09 `TransitionJSON` still carry the struck shape (5-value type union, `elementAId`/`elementBId`); spec 18 §4.4 and 14 §2.1 already assume the new model | `07:310,312-355`; `15:1704-1710, 4110-4111, 2593-2594`; `09:193-200`; `18:139`; `14` §2.1 |
| 2 | **MAJOR** | Spec 15 §4.1 union body has 76 members — `RenameProjectCommand`/`DeleteProjectCommand` missing from the TS union while present in §4.2/§4.3.77-78/§4.4/§11 Zod; headline "Total: 78" and `z.infer` disagree with the code block | `15:190-194, 249, 256, 2034, 2052, 4356-4357` |
| 3 | **MAJOR** | Spec 16 §3 binding tables emit pre-Round-7 command shapes that fail spec 15's Zod (~43 rows / 10 families: setLoop in/out, selectTool 'trim', selectElements ids, trim targetTime, moveElements type, move params, slip elementIds, delete elementIds, paste time/mode, duplicate offset); only §8.3 was aligned. Also leaves the I/O in/out-point surface undefined at the wire level (16 maps I/O to setLoop in/out; 18 §5 says "in/out point commands"; spec 15 has none) | `16:131-137, 150, 165-173, 176-177, 192-208, 240-249, 504`; cf. `15` §4.3.2/3/6/8/10/29/45/46/70 |
| 4 | **MAJOR** | Leftover pre-R7 export mapping in spec 16 Appendix A: `engine.project.exportFCPXML({format})` (direct, ProjectManager) contradicting the canonical `engine.export.exportFCPXML` (ExportManager) fixed everywhere else this round; exportMaster/exportFrame rows in the same table say "(direct)" instead of `apply()` dispatch | `16:2287-2289` vs `16:2029, 309`; `15:346, 1946` |
| 5 | **MAJOR** | UI-layer-extension count incoherence: 16 §0.2 says **16**; §12 enumerates **19** `(UI)` rows; §8.3's UI block lists a different **19** (toggleRipple in / freezeFrame out); 05:1463 still says **18** as current text | `16:37, 826-844, 1998, 2033`; `05:1463` |
| 6 | MINOR | Spec 18 outbound anchor errors: 05 §8.9→§8.8 (drag-drop), §8.5→§8.7 (marquee), §8.3→§8.4 (trim handles), §8.2→§8.6 (scrub), §8.2 preview-commit→§8.3/§8.6; 02 §8.2/§8.3→§8.4 (filmstrip); "master bus gain, spec 03 §9.2" unanchored (no such contract in 03) | `18:119, 127, 145, 167, 169, 178, 207` |
| 7 | MINOR | Fixture registry gaps: `three-clips.json` unregistered (16:433/1779); 16:1763's `multi-track.json` recipe ("3 tracks, each 1 clip") contradicts the registered 5-track/10-clip row; spec 10's eight namespaced `10/*` fixtures unregistered under the Round-7 rule | `16:433, 1763, 1779`; `10:2191-2210`; `17:915, 933-937` |
| 8 | MINOR | README:13 "9 architectural decisions" stale (now 10) | `README.md:13` vs `:63-72` |
| 9 | MINOR | Master/14/09 point at seed filenames rather than `.refined` twins (long-standing convention; files resolve but land readers on unrefined seeds; 09:439's §8.6 exists only in the refined twin) | `00:26-37, 471-483`; `14:498, 635, 718`; `09:439` |
| 10 | MINOR | "(unchanged from seed spec" provenance markers ×8 in canon (03 ×7, 04 ×1) — judged benign annotations, listed per sweep charter | `03:133, 237, 275, 724, 754, 898, 1365`; `04:1056` |

## Resolution table (recommended fixes — coordinator)

| # | Fix | Files / lines |
|---|---|---|
| 1 | Amend `TransitionSpec` (§4.3.61), its §11 Zod entry, and the §5 example JSON in spec 15 to the 07 §6.1A shape (`type:'crossfade'`, `presentation`, `duration`, `alignment`, `timing?`, `leftElementId`, `rightElementId`; `UpdateTransitionCommand.updates: Partial<…>` accordingly); amend spec 09 `TransitionJSON` identically (add a schema note if a migration row is wanted). Alternative (smaller): keep 15/09 as-is and add an explicit "wire migration deferred to seal round" note in 07 §6.1A replacing "params follow" — but the 4-way contradiction must be resolved one way or the other | `15:1704-1726, 2593-2594, 4105-4115`; `09:193-200`; `07:352-355` |
| 2 | Add `\| RenameProjectCommand` and `\| DeleteProjectCommand` to the §4.1 Project-ops block (after `CloseProjectCommand`), keeping the Export block last | `15:190-194` |
| 3 | Re-run the C2 alignment on spec 16's §3 tables (and the §5 example at :504): setLoop→`{start,end}`, selectTool→remove/replace `'trim'` (map T to `'roll'` per §3.2's own note that T maps to roll), selectElements→`{elements,mode}`, trim→`{elementId,edge,delta,ripple}`, moveElements→`move` with `movePlan`/`createTracks:PlannedTrackCreation[]`, slip→single `elementId`, delete→`{elements,ripple}`, paste→`{atTime,targetTrackId,ripple}`, duplicate→`{elements,placement,timeOffset}`. Decide the I/O-points surface (either document that in/out = `setLoop` halves, or add in/out-point commands to spec 15 — the latter is a count change, so prefer the former) | `16:131-137, 150, 165-173, 176-177, 192-208, 240-249, 504` |
| 4 | Replace the Appendix A export rows with the canonical mapping: `exportFCPXML` → `apply()` → `engine.export.exportFCPXML` (ExportManager, spec 01 §14.11), file `src/managers/export/export-fcpxml.ts` or similar; align exportMaster/exportFrame wording to `apply()` dispatch | `16:2287-2289` |
| 5 | Pick the true count (recommend: count §12's `(UI)` rows = 19, or drop the number and say "the `(UI)`-tagged rows in §12") and fix §0.2; update `05:1463` to match; reconcile §8.3's UI block with §12's tag set (freezeFrame/toggleRipple) | `16:37, 826-844`; `05:1463` |
| 6 | Correct the seven anchors in spec 18 (05 §8.8/§8.7/§8.4/§8.6; 02 §8.4/§8.3; 03 §9.x or spec 02 §7.2 for master bus — or add a one-line master-bus contract note to spec 03 §9) | `18:119, 127, 145, 167, 169, 178, 207` |
| 7 | Register `three-clips.json` or switch 16:433/1779 to `simple-cut.json`; fix 16:1763's recipe (use the registered 5-track fixture and adjust the assertion, or register a 16-local namespaced fixture); add spec 10's eight `10/*` rows to 17 §5.3's namespacing note | `16:433, 1763, 1779`; `10:2191-2210`; `17:933-937` |
| 8 | "9 architectural decisions" → "10 architectural decisions" | `README.md:13` |
| 9 | Optional polish: point the master spec's companion table + stream map and 14's cross-refs at the `.refined.md` twins (or add a one-line "`.refined.md` is canon; bare `.md` is the seed" note to §0) | `00:26-37, 471-483`; `14:498, 635, 718` |
| 10 | Coordinator's call: keep as provenance or reword to "verified" | `03:133…1365`; `04:1056` |

## Final verdict

**❌ HOLD PUSH.** One BLOCKING cross-spec contract break (Issue #1) plus four MAJOR issues (union-body count, §3 binding drift, Appendix A leftover, UI-extension count) must land before commit+push. None are architectural — every fix is mechanical and scoped above; the Round-7 architecture itself (canon hierarchy, code-ref tables, export commands, shell spec) is sound and unusually well-cited (35/35 spot-checks passed).

**Recommended next actions:**
1. Coordinator applies fixes for Issues #1-#5 (BLOCKING/MAJOR) — est. 30-60 min of surgical edits.
2. MINORs #6-#8 are worth fixing in the same pass (cheap); #9-#10 can be deferred to the seal round.
3. Re-run this review's grep battery after the fixes (checks 1, 2, 5 are fully re-verifiable mechanically: `\| RenameProjectCommand` presence in the §4.1 block; `elementAId` zero-hits in 15/09; `params: \{ ids` / `params: \{ in:` / `targetTime` zero-hits in 16; `engine.project.exportFCPXML` zero-hits repo-wide).
4. Update `audits/ROUND-7-AUDITS.md` with a one-line addendum recording this review's findings + the fixes (it currently claims "Round 7 complete… ready for the seal round" — true only after #1-#5).
5. Then commit+push per the SKILL.md GitHub protocol.

End of Round-7 Integration Review Report.

---

## Resolution addendum (coordinator, post-report)

**Date:** 2026-09-02 · **Verdict after fixes: ✅ PASS — push cleared.**

All 10 issues resolved via three scripted passes (`scripts/fix_integration_r7.py`, `fix_resolver_drift.py`, `fix_resolver_drift2.py`, `fix_io_points.py` outside the repo; 71+ surgical replacements total):

| # | Outcome |
|---|---|
| 1 | ✅ `TransitionSpec` (15 §4.3.61 + §11 Zod + §5 example) and `TransitionJSON` (09) now carry the 07 §6.1A two-tier shape verbatim; `UpdateTransitionCommand.updates: Partial<TransitionSpec>` inherits it. `elementAId`/`elementBId`: 0 hits in 15; 09/07 retain only "(was …)" provenance comments. |
| 2 | ✅ `RenameProjectCommand`/`DeleteProjectCommand` added to the §4.1 union — mechanically counted **78/78**. |
| 3 | ✅ §3 binding tables re-aligned (47 rows) **plus the follow-on drift the report under-counted**: the §8.3 resolver's dispatch union + both switch bodies also read pre-canonical params (`moves`/`createTracks:boolean`, `elementIds` on delete/duplicate/copy/cut/selectElements, `time`/`mode` on paste, `.in`/`.out` on setLoop, `elementId.elementId` on trim, `offset` on duplicate) — all now emit/translate spec-15 shapes (wire `elements: ElementRef[]` → engine `elementIds` translations marked). I/O rows: `out:` → `end:` (3 rows incl. a semantic fix — "Clear out point" was clearing `start` — and a stray double-backtick), and the preferred "former" resolution landed as the §3.4 note: **in/out points are `setLoop` halves** (no dedicated commands; 18's two mentions aligned). |
| 4 | ✅ Appendix A export rows now `apply()`-dispatched (`ExportFCPXMLCommand`/`ExportMasterCommand`/`ExportFrameCommand`, spec 15 §4.3.74-76). |
| 5 | ✅ Brittle counts removed: 16 §0.2 and 05:1463 now reference "the `(UI)`-tagged rows in §12" instead of hard numbers. |
| 6 | ✅ 18's seven wrong §anchors corrected (05 §8.2/8.7/8.4/8.6/8.3/8.8; 02 §8.4 filmstrip; master-bus ref reworded). |
| 7 | ✅ `three-clips.json` registered in 17 §5.3; 16:1763's recipe comment matches the registered 5-track/10-clip row; spec 10's eight `10/*` fixtures covered by the §5.3 namespacing note. |
| 8 | ✅ README:13 → "10 architectural decisions". |
| 9 | ◐ Master spec's companion + stream-map tables now point at `.refined` twins; 14/09 seed-filename pointers left per report (deferred to seal round). |
| 10 | ◐ Kept as provenance markers per report's "coordinator's call" (benign annotations). |

**Post-fix battery (all mechanically re-verified):** union 78/78 · `elementAId` 0 in 15 · `params: { ids` / `params: { in:` / `params: { out:` / `targetTime` / `command.params.moves` / `command.params.elementIds` (canonical-only) 0 in 16 · `engine.project.exportFCPXML` 0 in canon (review-report quotes excepted) · code fences even in all touched files · spec 05's 5 `targetTime` uses are UI-interaction intermediates (drop/snap), not wire params — correct as-is.

**Note on scope honesty:** the battery found the §8.3 resolver + copy/cut + I/O-row drift *beyond* the report's issue list — same defect class (C2), under-counted families. Recorded here so the seal round knows the resolver was fully re-aligned, not just §3.

End of Round-7 Integration Review Report.

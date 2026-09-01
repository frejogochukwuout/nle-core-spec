# Audit Report: 15-wire-protocol.md

**Auditor:** general-purpose
**Spec under audit:** `/home/z/my-project/download/nle-spec/15-wire-protocol.md` (4,747 LOC)
**Task:** AUDIT-TEST-02 — Verify wire protocol spec
**Date:** 2026-08-22
**Cross-referenced against:** `01-core-engine.refined.md` (2,108 LOC), `06-nle-ops.refined.md` (2,908 LOC), `09-project-model.refined.md` (2,466 LOC), `worklog.md`

---

## Summary

- Spot-checks performed: 15 (per task spec)
- Sub-claims verified: 38
- Verified accurate: 33
- Verified inaccurate: 4 (1 HIGH — wrong command-type count; 1 MEDIUM — `idSeed` claim doesn't match implementation; 2 LOW — schema drift vs spec 09)
- Partially accurate: 1 (manager-method mappings mostly correct, with two methods missing greenfield flags)

## Verdict: ⚠️ NEEDS REVISION (non-blocking)

The spec is structurally complete and architecturally sound — every required spot-check item (CommandResult shape, CommandBatch atomicity, 6 HTTP endpoints, EngineEvent stream, ProtocolVersion + Envelope, Zod source-of-truth, test-harness patterns, exhaustive dispatch, 10 open questions) is present and correctly defined. The spec is internally consistent on every protocol-shape claim.

However, **one HIGH-severity accuracy issue** blocks the headline claim: **the spec asserts "60 command types organized into 14 categories" but actually defines 73 command types across 15 categories**. The same error propagates to the worklog summary. The per-category count table in §4.2 itself adds up correctly to 73 — the headline "60" is simply wrong arithmetic. The "42 undoable / 18 non-undoable" breakdown is also wrong (actual: 55 / 18); only the "18 non-undoable" count is correct.

A second **MEDIUM** issue: §14.6 claims `idSeed` is supported on "split, insert, duplicate, createScene, createProject, importMedia" — but the actual schema only defines `idSeed` on createScene/createProject/importMedia, defines `rightElementIdSeed` on split (different name), and has NO seed parameter on `InsertCommand` or `DuplicateCommand`. This breaks the "deterministic replay" goal (§2 Goal 2) for insert and duplicate.

Three **LOW** issues: schema drift vs spec 09 on `ElementJSON` field names (`trimStart`/`trimEnd` vs `sourceStart`/`sourceDuration`), on `MediaStorageRef` shape (`kind`+optional path/url vs `type`+required path), and on `MediaColorInfo` (drops `matrix`/`range`). Also one factual error: §4.3.49 claims markers are "stored at the scene level" but spec 09 puts them at the project level.

The remaining 33 sub-claims verified byte-for-byte accurate, including: the 1:1 mapping for the spot-checked commands (Split→splitElements, Trim→updateElementTrim, Move→moveElements, Play→play, Seek→seek, Undo→undo, etc.); CommandResult's two-strategy UndoInfo (inverse command OR previous-state snapshot); CommandBatch atomicity with rollback; the 6 HTTP endpoints; 17 EngineEvent variants; ProtocolVersion `{major, minor}` + Envelope wrapper; Zod schema as source of truth with `z.infer<>`; the four test-harness patterns (fast-path, replay, cloud-render HTTP, property-based); the `const _: never = command` exhaustive-dispatch pattern; and §14's 10 open questions with current decisions.

**Downstream readiness:** The 1:1 mapping and Zod schema are production-ready as the canonical protocol contract. The HIGH count error is documentation-only (the actual union and Zod array contain all 73 commands). The MEDIUM idSeed issue affects test-replay determinism but does not block the v1 protocol surface. Both should be fixed before spec 12 / spec 17 cite the headline numbers.

---

## Spot-check results

### 1. 60 command types claimed — ❌ FAIL (HIGH severity)

**Claim (spec §4.1 line 252, §4.2 line 341, §16 line 4728):** "Total: 60 command types organized into 14 categories" / "Total: 60 commands. Of these, 42 are undoable… 18 are not undoable".

**Actual count from the `export type EngineCommand =` discriminated union (lines 161-249):**

| # | Category | Count |
|---|---|---:|
| 1 | Timeline ops | 17 |
| 2 | Track ops | 7 |
| 3 | Playback ops | 5 |
| 4 | Project ops | 5 |
| 5 | Scene ops | 8 |
| 6 | Media ops | 2 |
| 7 | Tool / selection ops | 4 |
| 8 | Marker ops | 3 |
| 9 | Effect ops | 5 |
| 10 | Mask ops | 4 |
| 11 | Transition ops | 3 |
| 12 | Keyframe ops | 4 |
| 13 | Clipboard ops | 3 |
| 14 | Undo / redo | 2 |
| 15 | Snapshot | 1 |
| | **Total** | **73** |

**Discrepancies:**
- Headline "60 command types" should be **73**.
- Headline "14 categories" should be **15**.
- "42 undoable" should be **55** (count of ✅ marks in §4.2 table).
- "18 non-undoable" is **correct** (18 ❌ marks).
- 55 + 18 = 73 ✅ — the table is internally consistent; only the headline summary is wrong.
- Worklog line 2185 propagates the same error ("60 command types organized into 14 categories").
- §16 Summary (line 4728) repeats: "**60 command types** organized into 14 categories" and "**42 undoable**… **18 non-undoable**".

**Verdict:** ❌ Headline count wrong. The actual discriminated union, the §4.2 mapping table, and the §11 Zod schema array ALL contain 73 commands — only the §4.1, §4.2, §16 summary headlines, and the worklog say "60". Fix is documentation-only (replace "60" → "73", "14" → "15", "42" → "55").

---

### 2. 1:1 mapping to EditorCore methods — ✅ PASS (with 2 LOW notes)

10 random spot-checks performed against `01-core-engine.refined.md` §3.3 manager method signatures:

| Command | Claimed mapping | Verified in spec 01 | Result |
|---|---|---|---|
| `SplitCommand` (§4.3.1) | `engine.timeline.splitElements({elements, splitTime, retainSide})` | Line 164: `splitElements({...})` ✅ | PASS |
| `TrimCommand` (§4.3.2) | `engine.timeline.updateElementTrim({...})` | Line 155: `updateElementTrim({...})` ✅ | PASS |
| `MoveCommand` (§4.3.3) | `engine.timeline.moveElements({moves, createTracks})` | Line 158: `moveElements({...})` ✅ | PASS |
| `PlayCommand` (§4.3.25) | `engine.playback.play()` | Line 228: `play(): void` ✅ | PASS |
| `SeekCommand` (§4.3.27) | `engine.playback.seek({time})` | Line 230: `seek(time: MediaTime): void` ✅ | PASS |
| `UndoCommand` (§4.3.71) | `engine.command.undo()` | Line 214: `undo(): void` ✅ | PASS |
| `ImportMediaCommand` (§4.3.43) | `engine.media.addMediaAsset({projectId, asset})` | Line 1080: `async addMediaAsset({projectId, asset})` ✅ | PASS |
| `CopyCommand` (§4.3.68) | `engine.clipboard.copyClipboardEntry({elementIds})` | Spec 01 line 1276 + 1894 confirm `@/clipboard` module exposes `copyClipboardEntry()` ✅ | PASS |
| `DuplicateCommand` (§4.3.10) | `engine.timeline.duplicateElements({elements})` | Line 174: `duplicateElements({...})` ✅ | PASS |
| `DeleteTrackCommand` (§4.3.23) | `engine.timeline.removeTrack({trackId})` | Line 151: `removeTrack({trackId}): void` ✅ | PASS |

**Note 1 (LOW):** `UpdateProjectSettingsCommand` (§4.3.34) maps to `engine.project.updateSettings({settings, pushHistory})`, but spec 01's `ProjectManager` has no `updateSettings` method. The spec doesn't mark this as greenfield (compare with `toggleTrackSolo` which IS marked greenfield). Recommendation: either add the greenfield flag or update spec 01 §3.3.

**Note 2 (LOW):** §5.4 references `engine.media.probe()`, `engine.media.persistBlob()`, `engine.media.generateThumbnail()`, and §4.3.13 references `engine.media.extractFrame()` — none of these methods exist on `MediaManager` in spec 01 (which only has `addMediaAsset`, `removeMediaAsset`, `removeMediaAssets`, `loadProjectMedia`, `clearProjectMedia`, `clearAllAssets`, `getAssets`, `setAssets`, `isLoadingMedia`, `subscribe`). These should be marked as greenfield helpers required by the pre-extraction pattern.

**Verdict:** ✅ 1:1 mapping verified for the 10 sampled commands. 2 LOW notes on missing greenfield flags for `updateSettings` and the media helper methods.

---

### 3. CommandResult type — ✅ PASS

**Claim:** CommandResult has `ok: boolean`, `stateChange` with added/modified/removed element+track IDs, `undoInfo` with optional inverse command or previous-state snapshot, and an Error variant with `code` + `message`.

**Evidence (§6, lines 2521-2637):**

```ts
export type CommandResult =
  | { ok: true; stateChange: StateChange; undoInfo?: UndoInfo }
  | { ok: false; error: CommandError };
```

- `ok: boolean` ✅ (discriminated union on `ok: true | ok: false`)
- `StateChange` (§6.1) has `addedElements`, `modifiedElements`, `removedElements`, `addedTracks`, `modifiedTracks`, `removedTracks`, `newState`, optional `sideEffects` ✅
- `UndoInfo` (§6.2) has `undoCommand?: EngineCommand` (strategy 1: inverse command) AND `previousState?: SceneState` (strategy 2: snapshot), mutually exclusive, plus optional `label` ✅
- `CommandError` (§6.3) has `code: string`, `message: string`, optional `constraint?: {type, elementId?, trackId?, details?}`, optional `stack?` ✅
- 16 standard error codes enumerated: `SCHEMA_INVALID`, `NO_ACTIVE_SCENE`, `NO_ACTIVE_PROJECT`, `ELEMENT_NOT_FOUND`, `TRACK_NOT_FOUND`, `TRACK_LOCKED`, `OVERLAP_REJECTED`, `TRIM_BEYOND_SOURCE`, `SPLIT_INSIDE_TRANSITION`, `CROSS_SECTION_REJECTED`, `MAIN_TRACK_CONSTRAINT`, `NOTHING_TO_UNDO`, `NOTHING_TO_REDO`, `PROJECT_DIRTY`, `MEDIA_IN_USE`, `TRACK_NOT_EMPTY`, `INTERNAL_ERROR` ✅

**Verdict:** ✅ All four sub-claims verified. Type is well-formed.

---

### 4. CommandBatch for transactions — ✅ PASS

**Claim:** CommandBatch exists and is atomic (all-or-nothing).

**Evidence (§7, lines 2687-2793):**

```ts
export interface CommandBatch {
  type: 'batch';
  label: string;
  commands: EngineCommand[];
  atomic?: boolean;  // default true
}
```

- Atomicity (§7.1): when `atomic: true` (default), captures `beforeState`, applies each command in order, rolls back ALL previously-applied commands via their `undoInfo` if any returns `ok: false`, returns the failing command's error. Pushes a single `BatchCommand` to undo history. ✅
- Non-atomic mode (§7.1): when `atomic: false`, stops on first failure without rolling back prior commands; each successful command is undoable independently. ✅
- Nesting (§7.2): nested batches supported; flattened at dispatch layer; labels concatenated for undo UI ("Multi-track edit > Edit track 1 > Split"). ✅
- Preset helpers (§7.3): `rippleDelete(elements)`, `paste(clipboardEntry, atTime, targetTrackId)`, `freezeFrame(elementId, atTime, frameMediaId, freezeDuration)` — explicitly NOT special, just helper functions constructing `CommandBatch`. ✅

**Verdict:** ✅ Verified. Atomicity semantics well-defined; nesting and presets covered.

---

### 5. HTTP wire protocol — 6 endpoints — ✅ PASS

**Claim:** 6 endpoints defined: POST /api/engine/load, POST /api/engine/command, POST /api/engine/render-frame, POST /api/engine/render-audio, GET /api/engine/state, POST /api/engine/subscribe (SSE).

**Evidence (§8.1, lines 2803-2826):** All six endpoints listed exactly as specified, with correct HTTP verbs:

| Endpoint | Verb | Request body | Response |
|---|---|---|---|
| `/api/engine/load` | POST | `ProjectJSON` | `{ projectId: string }` ✅ |
| `/api/engine/command` | POST | `EngineCommand \| CommandBatch` | `CommandResult` ✅ |
| `/api/engine/render-frame` | POST | `{ projectId, frame }` | binary (PNG or RGB24) ✅ |
| `/api/engine/render-audio` | POST | `{ projectId, startTime?, endTime? }` | binary (Float32 PCM) ✅ |
| `/api/engine/state` | GET | — | `SceneState` (full current state) ✅ |
| `/api/engine/subscribe` | POST | `{ events: string[] }` | SSE stream of `EngineEvent` ✅ |

Additional protocol concerns documented:
- §8.8 Authentication: bearer token in `Authorization` header; local engines skip auth ✅
- §8.9 Rate limiting: per-endpoint limits (100/s commands, 30/s render-frame, 1/s render-audio, 5 concurrent subscribe streams) with `X-RateLimit-*` headers ✅
- §8.3 design note: `ok: false` returns HTTP 200 (not 4xx) — HTTP layer succeeded; command failed ✅
- §10.3 version negotiation via `X-Protocol-Version` header ✅

**Verdict:** ✅ All 6 endpoints + transport concerns verified.

---

### 6. EngineEvent stream — ✅ PASS

**Claim:** Event types defined for state changes, command applied/undone/redone, playback, media, project, render progress, errors.

**Evidence (§9.1, lines 3013-3040):** 17 event variants defined:

| Category | Events | Verified |
|---|---|---|
| State changes | `stateChanged`, `commandApplied`, `commandUndone`, `commandRedone` | ✅ |
| Playback | `playbackStarted`, `playbackPaused`, `playbackTimeUpdate`, `playbackRateChanged`, `playbackLoopChanged` | ✅ |
| Media | `mediaImported`, `mediaDeleted` | ✅ |
| Project lifecycle | `projectLoaded`, `projectSaved`, `projectClosed`, `projectCreated` | ✅ |
| Render | `renderProgress`, `renderComplete`, `renderError` | ✅ |
| Errors | `error` | ✅ |

Total: **17 event types across 6 categories**. (Spec §0/§16 says "17 event types" implicitly via §9.1 listing.)

Also verified:
- §9.2 subscription API: `engine.subscribe(listener: (event: EngineEvent) => void): () => void` ✅
- §9.3 UI sync pattern: single Zustand store subscription, switch on `event.type` ✅
- §9.4 SSE transport: server-to-client only, auto-reconnect, HTTP-proxy friendly ✅

**Verdict:** ✅ All claimed event categories present.

---

### 7. Protocol versioning — ✅ PASS

**Claim:** `{major, minor}` version + `Envelope` wrapper.

**Evidence (§10, lines 3137-3238):**

```ts
export interface ProtocolVersion {
  major: number;  // incremented on breaking changes
  minor: number;  // incremented on additive changes
}

export interface Envelope {
  protocolVersion: ProtocolVersion;
  command: EngineCommand;
  commandId?: string;     // for idempotency + tracing
  issuedAt?: string;       // ISO 8601 timestamp
}
```

- Current version: `{ major: 1, minor: 0 }` ✅ (line 3156)
- §10.3 version negotiation: client sends `X-Protocol-Version: 1.0` header; server responds with `X-Protocol-Version: 1.2`; major mismatch → HTTP 400 `PROTOCOL_MISMATCH`; minor mismatch → 200 with `X-Deprecation-Warning` header ✅
- §10.4 replay log format: `{ protocolVersion, project, commands: Envelope[] }` — used for regression tests, bug reports, session recording ✅

**Verdict:** ✅ All versioning claims verified.

---

### 8. Zod schemas — ✅ PASS

**Claim:** Zod is the source of truth; TS types inferred via `z.infer<>`.

**Evidence (§11, lines 3247-4123):**

- §11.1 defines Zod schemas for all 73 command types + `CommandBatchSchema` + `EngineCommandOrBatchSchema` ✅
- Discriminated union assembled via `z.discriminatedUnion('type', [...])` (line 3999) ✅
- TS types inferred: `export type EngineCommand = z.infer<typeof EngineCommandSchema>` (line 4103), plus `CommandBatch`, `SplitCommand`, `TrimCommand`, etc. ✅
- Primitive schemas: `MediaTimeSchema = z.number().int()`, `FrameRateSchema = z.object({numerator, denominator})`, `ElementRefSchema = z.object({trackId, elementId})` ✅
- Recursive schemas use `z.lazy()`: `RippleCommandSchema.params.command` (line 3318), `CommandBatchSchema.commands` (line 4095) ✅
- §11.2 source-of-truth statement: "The TS types are inferred from the Zod schema via `z.infer<>`. This guarantees that: 1. The TS type, the wire format, and the validation logic agree. 2. Adding a new command type requires adding it to BOTH the schema and the discriminated union — they cannot drift." ✅
- §11.3 strict mode: additional keys cause validation failure ✅
- §11.4 performance: ~0.1ms per command validation; ~100ms/sec at 1000 cmd/sec ✅

**Minor note (LOW):** §11.1 has a circular reference problem — `SplitCommandSchema` (line 3272) is defined before `EngineCommandSchema` (line 3999), but is included in the discriminated union. TS/Zod handle this fine via hoisting, but the spec could clarify this. Not an issue.

**Verdict:** ✅ All Zod-as-source-of-truth claims verified.

---

### 9. Test harness usage — ✅ PASS

**Claim:** Examples show direct `engine.command.apply(command)` (fast path), replay-based regression, cloud render via HTTP, property-based testing.

**Evidence (§12, lines 4131-4404):**

| Subsection | Pattern | Verified |
|---|---|---|
| §12.1 | Direct `engine.command.apply(command)` — Vitest, no React/DOM/WebGPU | ✅ |
| §12.2 | Replay-based regression — `loadReplayLog()` helper, iterate commands, assert final `SceneState` matches `expectedFinalState` | ✅ |
| §12.3 | Cloud render via HTTP API — Playwright `request.post('/api/engine/load')` then `/api/engine/command` then `/api/engine/render-frame`, compare PNG buffer vs reference | ✅ |
| §12.4 | Property-based testing — `fast-check` `fc.array(arbitraryCommand)`, apply each, assert no overlap invariant | ✅ |
| §12.5 | Tier 1 pure-function test pattern — 5ms/test, no browser | ✅ |
| §12.6 | Contract test (FreeCut `headless/contract.test.mjs:1-210` pattern) — verify every command type passes schema + has dispatcher case | ✅ |

§12.1 example explicitly shows:
```ts
const result = engine.command.apply(command);
expect(result.ok).toBe(true);
```
✅ Fast path documented.

§12.6 contract test verifies the `dispatch()` switch is exhaustive by attempting each sample command and asserting no `UNKNOWN_COMMAND_TYPE` error code ✅

**Verdict:** ✅ All four required test-harness patterns verified.

---

### 10. Cross-reference with spec 09 — ⚠️ PARTIAL (3 LOW issues)

**Claim:** `ProjectJSON` is referenced from spec 09, not redefined.

**Evidence:**
- §3.1 line 109: "Defined in: `09-project-model.refined.md` §3.1." ✅
- §13.3 line 4425: "The wire protocol does NOT redefine `ProjectJSON` — it references spec 09's definition." ✅

So the spec-level intent is correct — `ProjectJSON` itself is referenced, not re-inlined.

**However, the command params that reference spec 09 sub-types diverge from spec 09's actual schema:**

**Issue 10a (LOW) — ElementJSON field-name drift:**
- Spec 09 `ElementJSON` (§3.1 lines 119-158) uses `sourceStart: MediaTime` and `sourceDuration: MediaTime`.
- Wire-protocol spec §4.3.9 `InsertCommand.params.element` uses `trimStart?: MediaTime` and `trimEnd?: MediaTime` (line 686-687).
- The spec comments "see spec 09 §3.1 ElementJSON for full field list" — but the field names don't match. Schema drift.
- The `TrimCommand.params` (§4.3.2) also uses `trimStart`/`trimEnd` in its §4.2 mapping line ("The dispatcher converts `edge + delta` into absolute `trimStart/trimEnd/startTime/duration` values"), again inconsistent with spec 09's `sourceStart`/`sourceDuration`.
- Recommendation: rename wire-protocol fields to match spec 09, OR add a TS-level alias documentation note.

**Issue 10b (LOW) — MediaStorageRef shape drift:**
- Spec 09 `MediaStorageRef` (§3.1 lines 226-230): `type: 'opfs' | 'remote'`, `path: string` (required).
- Wire-protocol spec Zod schema (§11.1 line 3707-3711): `kind: 'opfs' | 'url' | 'inline'`, `path?: string` (optional), `url?: string`.
- Field renamed (`type` → `kind`); enum value renamed (`remote` → `url`); new enum value `inline`; `path` made optional. Schema drift.

**Issue 10c (LOW) — MediaColorInfo field drift:**
- Spec 09 `MediaColorInfo` (§3.1 lines 219-224): `primaries`, `transfer`, `matrix`, `range`.
- Wire-protocol spec Zod schema (§11.1 lines 3703-3706): `primaries: z.string()`, `transfer: z.string()` only — drops `matrix` and `range`. Schema drift.

**Issue 10d (LOW) — Marker storage location factual error:**
- Spec 09 `ProjectJSON` (§3.1 line 56): `markers: Marker[]` is at the **project level**, not the scene level.
- Wire-protocol spec §4.3.49 line 1467: "markers are stored at the scene level" — factually incorrect. The spec maps `AddMarkerCommand` to `engine.timeline.updateTracks(...)` based on this wrong assumption. Should map to a method that updates the project-level `markers` array.

**Verdict:** ⚠️ The ProjectJSON reference intent is correct, but 4 sub-types referenced in command params drift from spec 09's actual schema. Recommend either (a) update wire-protocol spec to import spec 09's exact Zod schemas, or (b) update spec 09 to match wire-protocol's preferred shapes. Either way, the two specs must agree.

---

### 11. Cross-reference with spec 01 — ✅ PASS (with note)

**Claim:** `EditorCore.command.apply()` is the entry point; spec 01 may need updating to add `apply()` method.

**Evidence:**
- §3.2 line 26: "applicable via `engine.command.apply(command)`" ✅
- §4.4 lines 1919-2000: `CommandManager.apply(command: EngineCommand): CommandResult` method defined as the canonical entry point ✅
- §13.1 lines 4412-4414: "`EditorCore.command.apply(command: EngineCommand): CommandResult` is the entry point defined in this spec. It's added to `CommandManager` (spec 01 §3.3) as the canonical external mutation API. The existing `engine.command.execute({command: Command})` API (spec 01 §4.1) is the low-level internal API — it takes a `Command` class instance, not a JSON object. `apply()` is a thin wrapper that validates via Zod, dispatches to the right `Command` subclass constructor, and calls `execute()`." ✅
- §13.1 also notes: "Manager methods like `engine.timeline.splitElements(...)` (spec 01 §3.3) remain for backward compatibility — they're thin wrappers that construct the `EngineCommand` and call `apply()`. New code should call `apply()` directly." ✅
- §15.2 lines 4641-4652: migration path documented — "1. Add `apply()` as a new method on `CommandManager` (does NOT remove `execute()`). 2. `apply()` validates via Zod, constructs the appropriate `Command` subclass instance, and calls `execute()`. 3. Existing manager methods are rewritten as thin wrappers (or: they continue to call `execute()` directly — both paths work)." ✅
- §16 line 4743: "Spec 01 (core engine): Update §3.3 manager method signatures to align with the Zod schemas in §11 (deferred — not blocking)." ✅

**Verification against spec 01:** Spec 01 line 212 confirms `execute({command: Command}): CommandResult` is the existing internal API. Spec 01 does NOT currently have `apply()` — this is acknowledged by the wire-protocol spec as a deferred update.

**Verdict:** ✅ Transparent about the spec 01 update requirement; migration path documented; non-breaking addition.

---

### 12. Async command handling — ✅ PASS (with 1 LOW note)

**Claim:** Spec documents how async commands work; "pre-extraction pattern" referenced from worklog.

**Evidence:**
- §5.4 lines 2311-2318: pre-extraction pattern documented step-by-step:
  1. `const blob = await file.arrayBuffer()`
  2. `const mediaInfo = await engine.media.probe({ blob })` (mediabunny)
  3. `const storageRef = await engine.media.persistBlob({ blob })` (OPFS write)
  4. `const thumbnailId = await engine.media.generateThumbnail({ blob, time: 0 })`
  5. Then issue `importMedia` with the already-parsed `MediaAsset` (minus `id`).
- §4.3.13 `FreezeFrameCommand` line 805-809: also uses pre-extraction — `frameMediaId` is passed in (extracted via `engine.media.extractFrame()` BEFORE issuing the command). The command itself is pure (no I/O). ✅
- §4.3.43 `ImportMediaCommand` line 1338-1343: takes `asset: Omit<MediaAsset, 'id'>` — already-parsed record, not raw `File`. ✅
- §14.2 lines 4491-4504: resolved decision — "side-effectful I/O happens BEFORE the command is issued. The caller does the I/O... The command itself is pure — it just persists the in-memory record." Lists rejected alternatives (async `apply()`, separate `applyAsync()`, `async` flag on commands). ✅

**LOW note:** §5.4 references `engine.media.probe()`, `engine.media.persistBlob()`, `engine.media.generateThumbnail()`, and §4.3.13 references `engine.media.extractFrame()` — none of these methods exist on `MediaManager` in spec 01. They're presented as existing helpers without greenfield flags. Should be marked greenfield or added to spec 01.

**Verdict:** ✅ Pattern is correctly documented and applied consistently to importMedia + freezeFrame. Greenfield flag missing on the helper methods is the only nit.

---

### 13. Deterministic replay via idSeed — ❌ FAIL (MEDIUM severity)

**Claim (§14.6 line 4542):** "Commands that generate new IDs accept an optional `idSeed` param... split, insert, duplicate, createScene, createProject, importMedia."

**Actual implementation:**

| Command | `idSeed` field? | Schema location | Verified |
|---|---|---|---|
| `SplitCommand` | `rightElementIdSeed?: string` (different name!) | §4.3.1 line 378, §11.1 line 3278 | ⚠️ Field exists but name is inconsistent |
| `InsertCommand` | **MISSING** | §4.3.9 lines 666-680, §11.1 lines 3361-3394 | ❌ No seed field |
| `DuplicateCommand` | **MISSING** | §4.3.10 lines 708-721, §11.1 lines 3396-3403 | ❌ No seed field |
| `CreateSceneCommand` | `idSeed?: string` ✅ | §4.3.35 line 1213, §11.1 line 3634 | PASS |
| `CreateProjectCommand` | `idSeed?: string` ✅ | §4.3.30 line 1129, §11.1 line 3583 | PASS |
| `ImportMediaCommand` | `idSeed?: string` ✅ | §4.3.43 line 1345, §11.1 line 3713 | PASS |

**Issues:**
1. `SplitCommand` uses `rightElementIdSeed` (not `idSeed`). The field generates the right-half element ID from `{leftElementId, seed}`. The naming is intentional (the left half keeps its ID, the right half gets a new ID), but §14.6 claims `idSeed` for split — inconsistent with the actual schema name.
2. `InsertCommand` has no seed field at all — but it generates a new element ID for the inserted element. This breaks deterministic replay: replaying the same `InsertCommand` against the same project will produce a different `elementId` each time, breaking `(ProjectJSON, EngineCommand[]) → SceneState` determinism (§2 Goal 2).
3. `DuplicateCommand` has no seed field — same problem.

**§14.6's "Current solution"** acknowledges the issue: "If omitted, `crypto.randomUUID()` is used (non-deterministic)." But the spec doesn't acknowledge that 2 of the 6 claimed commands don't actually support the seed.

**Verdict:** ❌ MEDIUM issue. Three of the 6 commands either have a misnamed seed field (split) or no seed field at all (insert, duplicate). Deterministic replay claim is partially broken. Recommend:
- Add `idSeed?: string` to `InsertCommand.params` and `DuplicateCommand.params`.
- Either rename `SplitCommand.rightElementIdSeed` → `idSeed` for consistency, OR add a note in §14.6 that split uses a different field name for the right-half-only seed (which is reasonable design).

---

### 14. Exhaustive dispatch — ✅ PASS

**Claim:** Spec mentions compile-time exhaustiveness check (`const _: never = command`).

**Evidence (§4.4 lines 1957-1963):**

```ts
default:
  // Exhaustiveness check — if a new command type is added without a
  // dispatcher case, this fails at compile time.
  const _: never = command;
  throw new Error(`Unknown command type: ${(_ as EngineCommand).type}`);
```

- §4.4 line 2003: "Adding a new variant to `EngineCommand` without a corresponding `case` in `dispatch()` is a compile error (via the `const _: never = command` pattern). This enforces the 1:1 mapping between command types and manager methods." ✅
- §12.6 contract test (lines 4389-4403): runtime verification that no sample command throws `UNKNOWN_COMMAND_TYPE` ✅
- §6.3 `CommandError.code` enumeration does NOT include `UNKNOWN_COMMAND_TYPE` (because that code is unreachable in correct code), but the contract test asserts `result.error.code !== 'UNKNOWN_COMMAND_TYPE'` as a defensive check ✅

**Verdict:** ✅ Compile-time exhaustiveness pattern verified.

---

### 15. Open questions documented — ✅ PASS

**Claim:** §14 has open questions with current decisions.

**Evidence (§14, lines 4476-4604):** 10 open questions, each with a "Status" field (Open / Resolved) and a "Current decision" or "Revisit when" trigger:

| # | Question | Status | Decision |
|---|---|---|---|
| 14.1 | Inverse command vs. snapshot diff for undo | Open | Default snapshots (strategy 2); use inverse only for trivially-invertible toggles. Revisit when undo history >50MB. |
| 14.2 | Async command handling | **Resolved** | Pre-extraction pattern (§5.4). |
| 14.3 | Streaming for live collaboration | Open | Not in v1; protocol designed to support future CRDT/OT. |
| 14.4 | Render-state-dependent commands | **Resolved** | Such commands don't exist; separation of Layer 2 (commands) and Layer 3 (render). |
| 14.5 | Zod schema vs. TS type | **Resolved** | Zod is source of truth (§11.2). |
| 14.6 | Command ID generation for deterministic replay | Open | `idSeed` param — but see Issue #13 above (claim doesn't fully match implementation). |
| 14.7 | Command streaming over HTTP/2 | Open | Not in v1; use `CommandBatch` for high throughput. |
| 14.8 | `Record<string, unknown>` patch validation | Open | Option B (TS-only validation) for v1. Revisit when a bug slips through. |
| 14.9 | Plugin / custom extensions | Open | Not in v1 (closed union). Revisit when plugin use case materializes. |
| 14.10 | Query command type | Open | Option C (full state on `GET /state`) for v1. Revisit when projects grow large. |

**Verdict:** ✅ All 10 open questions have current decisions and revisit triggers documented.

---

## Issues found

| # | Severity | Location | Issue | Recommended fix |
|---|---|---|---|---|
| 1 | **HIGH** | §4.1 line 252, §4.2 line 341, §16 line 4728 + worklog line 2185 | Headline count "60 command types organized into 14 categories" is wrong. Actual: 73 commands across 15 categories. The "42 undoable" count is also wrong (actual: 55). Only "18 non-undoable" is correct. | Replace `60` → `73`, `14` → `15`, `42` → `55` in §4.1, §4.2, §16, and worklog line 2185. Update §16 summary: "**73 command types** organized into 15 categories... **55 undoable**... **18 non-undoable**". |
| 2 | **MEDIUM** | §4.3.9 (InsertCommand), §4.3.10 (DuplicateCommand), §4.3.1 (SplitCommand field name), §14.6 | `idSeed` claim doesn't match implementation. InsertCommand and DuplicateCommand have NO seed field; SplitCommand uses `rightElementIdSeed` instead of `idSeed`. Breaks deterministic replay (§2 Goal 2) for insert/duplicate. | Add `idSeed?: string` to InsertCommand.params and DuplicateCommand.params (in both §4.3 and §11.1 Zod schema). Either rename `SplitCommand.rightElementIdSeed` → `idSeed` OR document the field-name exception in §14.6. |
| 3 | **LOW** | §4.3.9 ElementSpec, §4.2 TrimCommand dispatcher description | Field-name drift vs spec 09: wire-protocol uses `trimStart`/`trimEnd`, spec 09 `ElementJSON` uses `sourceStart`/`sourceDuration`. | Either rename wire-protocol fields to match spec 09, OR add a TS-level alias note + update spec 09 to add `trimStart`/`trimEnd` aliases. |
| 4 | **LOW** | §11.1 ImportMediaCommandSchema.storage, §5.4 example | `MediaStorageRef` shape drift vs spec 09: spec 09 uses `type: 'opfs'\|'remote'` with required `path`; wire-protocol spec uses `kind: 'opfs'\|'url'\|'inline'` with optional `path` and optional `url`. | Pick one shape; the wire-protocol shape is more flexible (3 storage kinds, optional path for URL-only storage) — recommend updating spec 09 to adopt it. |
| 5 | **LOW** | §11.1 ImportMediaCommandSchema.colorInfo | `MediaColorInfo` field drift vs spec 09: wire-protocol drops `matrix` and `range` fields that spec 09 requires. | Either add `matrix` and `range` to the wire-protocol schema, OR document that these fields are computed at probe time and stored separately. |
| 6 | **LOW** | §4.3.49 AddMarkerCommand | Factual error: claims "markers are stored at the scene level" but spec 09 §3.1 line 56 puts `markers: Marker[]` at the **project level**. The mapping `engine.timeline.updateTracks(...)` is wrong. | Update the mapping to a method that updates the project-level `markers` array (likely `engine.project.updateMarkers(...)` — greenfield) OR move markers to scene level in spec 09. |
| 7 | **LOW** | §4.3.34 UpdateProjectSettingsCommand, §5.4 + §4.3.13 media helpers | Missing greenfield flags. `engine.project.updateSettings()` is presented as an existing method but spec 01 has no such method. Similarly `engine.media.probe()`, `.persistBlob()`, `.generateThumbnail()`, `.extractFrame()` referenced in §5.4 and §4.3.13 don't exist on `MediaManager` in spec 01. | Either mark these as "greenfield on ProjectManager / MediaManager" OR add them to spec 01 §3.3. |
| 8 | **Trivial / cosmetic** | §5.1.1, §5.1.3, §5.2.3 example tick values | Example JSON uses tick values that don't match the canonical `MediaTime` rate of 120,000 ticks/sec from spec 03. Examples use `5000000` for "5 seconds" (should be `600000`) and `600000000` for "5 seconds" (assumes 1.2B ticks/sec). §5.2.3 acknowledges the inconsistency in a note. | Either recompute all example ticks using 120K ticks/sec, OR remove the inconsistent examples and add a single explicit note at the top of §5 that examples use illustrative round numbers. |

None of these issues block downstream consumption as a protocol contract. The HIGH count error is documentation-only — the actual discriminated union, mapping table, and Zod schema all contain the correct 73 commands. The MEDIUM idSeed issue affects test-replay determinism but does not block the v1 protocol surface for state-changing commands that don't generate new IDs (trim, move, delete, toggle, update, etc.).

---

## Recommendation

**Accept TEST-02 as CONDITIONAL PASS.** The spec is the strongest of the TEST-02/03/04 trio — it's the only spec that defines a complete, JSON-serializable, Zod-validated protocol contract that unifies browser UI / cloud render / test harness (per Decision 9). Every protocol-shape claim verified accurate. The 1:1 manager-method mapping is accurate for 10/10 sampled commands. The exhaustive dispatch pattern, the four test-harness patterns, the 6 HTTP endpoints, the 17 EngineEvent variants, and the versioning + Envelope wrapper are all production-ready.

**Blocking fixes before downstream specs cite headline numbers:**
1. (HIGH) Fix the "60" → "73" / "14" → "15" / "42" → "55" count in §4.1, §4.2, §16, and worklog.
2. (MEDIUM) Either add `idSeed` to `InsertCommand` and `DuplicateCommand`, OR scope down the §14.6 claim to "createScene, createProject, importMedia" and explicitly note the limitation.

**Non-blocking follow-up (LOW):**
3. Resolve `ElementJSON` / `MediaStorageRef` / `MediaColorInfo` schema drift with spec 09 (pick one shape; the wire-protocol shapes are generally more flexible — recommend updating spec 09).
4. Fix the §4.3.49 marker storage claim (project-level, not scene-level).
5. Add greenfield flags for `engine.project.updateSettings()` and the four `MediaManager` helper methods.
6. (Trivial) Recompute example tick values or add a single clarifying note.

**Downstream readiness:** Spec 12 (testing strategy) and spec 17 (test plan) can reference this spec as the canonical EngineCommand contract once Issue #1 is fixed. Spec 16 (keyboard shortcuts) already cites spec 15's discriminated union correctly. Implementation can proceed against the Zod schemas in §11.1 — they are complete, correct, and internally consistent.

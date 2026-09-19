# R28-W1-d — The E3 error contract + the N3 guard survey: the wire error-envelope design for the r1 port program

**Task ID:** R28-W1-d · **Round:** R28 (ARCH-R28 Group A, row A3 — `audits/ARCH-R28-seal-round.md:39`) · **Status:** research pack (read-only; no repo code touched).

**Scope:** (1) the current error law extracted from spec 15 §6.3 + 06 §5.9B; (2) OT's actual wire error behavior over the 31-verb surface; (3) the N3 locked-track guard survey (engine 36-op census + OT's lockPreCheck coverage map); (4) the E3 fix shape; (5) the envelope design + the 15 §6.3 amendment shape + the battery check; (6) the recommendation. The E1-a..d/E2-a companion-semantics residues are R28-W1-b's scope — covered here ONLY at their error-surface dimension (§4.4).

**Pin world:** spec corpus @ R28 tree; OT @ HEAD `55c81c0` / code pin `970948a` (06-nle-ops.md:32); engine @ `074a2f6` / code anchor `74bef08` (ARCH-R28-seal-round.md:21; scout-engine.md).

---

## 1. The current law (spec extraction)

### 1.1 Spec 15 §6.3 — the envelope today

The spec's `CommandResult` is a **discriminated union** (15-wire-protocol.md:2789-2791):

```ts
export type CommandResult =
  | { ok: true; stateChange: StateChange; undoInfo?: UndoInfo; data?: CommandResultData }
  | { ok: false; error: CommandError };
```

`CommandError` (15:2870-2919) = `{ code: string; message: string; constraint?: {type: 'overlap'|'source'|'transition'|'lock'|'compatibility'; elementId?; trackId?; details?}; stack? }`. The `code` field is an **open string** with a "standard codes (extend as needed)" registry (15:2875-2899) of exactly **24 codes**: SCHEMA_INVALID, NO_ACTIVE_SCENE, NO_ACTIVE_PROJECT, ELEMENT_NOT_FOUND, TRACK_NOT_FOUND, **TRACK_LOCKED** (15:2881), OVERLAP_REJECTED, TRIM_BEYOND_SOURCE, **SPLIT_INSIDE_TRANSITION** (15:2884 — "split point is inside a transition overlap"), CROSS_SECTION_REJECTED, MAIN_TRACK_CONSTRAINT, NOTHING_TO_UNDO, NOTHING_TO_REDO, PROJECT_DIRTY, MEDIA_IN_USE, TRACK_NOT_EMPTY, EXPORT_UNSUPPORTED_FORMAT, JOB_QUEUE_FULL, TIME_OUT_OF_RANGE, PROJECT_NOT_FOUND, PROJECT_ACTIVE, **NOOP** (15:2897), **NOT_IMPLEMENTED** (15:2898, §4.1B:328-330), INTERNAL_ERROR (15:2899).

Three load-bearing observations:

1. **There is no code literally named `INVALID_PARAMS` in the spec-15 registry.** It exists as the *class-level* name in §4.1B's family enumeration — "distinct from `INVALID_PARAMS`/`NOT_FOUND`/`CONFLICT`/`NOOP`/`INTERNAL_ERROR`" (15:330) — i.e. the corpus already (implicitly) has a **two-tier grammar**: OT's 6 coarse codes behave as CLASSES; the spec's ~24 codes are the fine-grained registry. 06 §5.9B's "INVALID_PARAMS-class" wording rides exactly this tier distinction.
2. **`SPLIT_INSIDE_TRANSITION` already names the E3 case** (15:2884). The transition-window abort of the source-edit family needs NO new fine code — it needs the class mapping + the constraint (`{type:'transition'}`, 15:2911).
3. **The silent-empty prohibition is NOT yet stated as a law** in §6.3 — it lives as (a) the NOOP-vs-rejection rule at 06 §5.2A: "NOT `ok: true` with a silent no-op" (06-nle-ops.md:843); (b) §6.3's per-code comments ("The UI uses this to… decide whether to retry, abort, or ignore", 15:2872-2874); (c) 06 §5.9B's E3 sentence: the abort "REFUSES — at the r1 port it re-surfaces as an `INVALID_PARAMS`-class error (15 §6.3's envelope), never the engine's current silent empty return" (06-nle-ops.md:1593). §6.3 itself never says "never ok:true with an empty payload" — that sentence is the amendment's to add.

**Batch semantics:** a batch rolls back on the first `{ok:false}` and returns the failing command's error (15:2977-2981). The NOOP code is part of the registry and must be census-triggerable (17-test-plan.md:450-454, §2.5 rule 8; the §13A.4 enforcement: "every `CommandError` code in spec 15 §6.3's registry has ≥ 1 triggering test; a coverage script (codelist × grep of test IDs) enforces it", 17:2263, restated 17:2293).

### 1.2 06 §5.9B — the error-contract row

- The R1-B4 abort law: "a split that lands inside a transition's consumed window ABORTS the whole edit (R1-B4 — refuse, no partial commit, no history entry)" (06-nle-ops.md:1587); "the transition-window abort (R1-B4) and the companion clause are §5.9B's shared 3-point family laws" (06:1491).
- The E3 error contract: "**the transition-blocked abort REFUSES** — at the r1 port it re-surfaces as an `INVALID_PARAMS`-class error (15 §6.3's envelope), never the engine's current silent empty return (`{insertedClipId:'', …}`, no error code — not wire-able; mode-insert Δ7 / mode-overwrite G4)" (06:1593).
- GAP row OW-3 (E3): "the abort is silent: `_performOverwriteEditImpl` returns an empty result on a transition-blocked split (the refusal stance is right; the silence is not wire-able)" — owner S-engine + S-ot, "pre-r1 (the queue filing) / r1 (the port)", acceptance: "the refusal carries the error code at the port seam (INVALID_PARAMS-class); the abort path pinned (no commit, no history entry)" (06:1601).
- The mode-matrix P-list row: "E3 the silent abort open — rides r1" (06:23); §10.4's row: "the E3 silent abort is the open fix row" (06:2585).

### 1.3 The adjacent refusal laws the envelope must reconcile

| Law | Site | Stance |
|---|---|---|
| NOOP vs rejection (trim zero-clamp) | 06 §5.2A (06:843) | `ok:false` + `NOOP`, never `ok:true`-silent; BUT the idempotent set-all family returns `ok:true` + `changed:false` (never a failure code — `applyBatch` aborts on `!ok`; OT api.ts:2425-2432, :2358-2366) — the dual-stance is law, the F1B-18 residual ("NOOP-class successes reporting NOT_FOUND") rides the r1 refinement (06:43) |
| Locked tracks | 06 §2 goal 3 (06:84) "no mutation of locked tracks"; 06 §5.0: "A companion on a LOCKED track never enters the closure (the explicit target's op gate owns rejection)" (06:409); precedence `lock > sync-lock > link` (06:411) | the TARGET's lock rejects; the COMPANION's lock only excludes from the closure — never a rejection cause |
| Fit-to-fill domain | 06 §5.9F: "Out-of-domain REFUSES with `INVALID_PARAMS` — **never clamps** (a clamped fit silently violates exact-fill)" (06:1669); §13.15's row: "out-of-domain REFUSES `INVALID_PARAMS`, NEVER clamps" (15:4921) | refusal, not normalization |
| Volume NaN (the D38.2 rider) | 09 §3.1A B2: "Non-finite never poisons the fold: NaN → DEFAULT (0 dB) at the clamp (`audio-params.ts:39-43`)" (09-project-model.md:347); the clamp itself at opencut-timeline `core/audio-params.ts:38-43` | normalization, NOT an error — the envelope must not convert the fold into INVALID_PARAMS |
| Structural NaN | engine `updateClip`: "the hostile-patch gate — non-finite numerics THROW" (timeline.ts:2517-2525; the add-family twin :2038-2044) | throw → INVALID_PARAMS-class at the wire |
| Replace's refusals | 15 §13.15's replace row: errors `NOT_FOUND` / `TRACK_LOCKED` / `INVALID_PARAMS` (the unfillable-source refusal — 06 §5.9C:1613; "the CONFLICT-vs-INVALID_PARAMS disposition rides §6.3's r1 refinement row") / `NOOP` never (15:4918) | the per-verb declaration pattern, pre-figured |
| Append's audio-conflict | 06 §5.9D: "existing audio content at/after that point REFUSES the whole append atomically" (06:1632) | CONFLICT-class (overlap family) |

**Note (the D38 numbering):** the corpus cites the volume law as "D38.2" at 09 §3.1A B2 (:347) and as "D38.1" at 00-master-spec.md:473-475 — the sub-numbering is inconsistent between 00 and 06/09 (06:1917 calls preservePitch D38.1). No bearing on the envelope; flag for the W4 amendment pass.

### 1.4 The registered GAP (what r1 owes)

- 15 §0: "Error-envelope §6.3 refinement — **r1 FIRST** (the plan's r1 row: the refinement lands before the C7 rename; acceptance: the ~24-code table + OT follows)" (15-wire-protocol.md:22); the classification half "partially covered by the OT BASE" (TRACK_LOCKED live on 12 commands, NOOP benign, F1B-4's INVALID_PARAMS boundary, F1B-2's CONFLICT) — "the coarseness itself… remains the r1 refinement" (15:22).
- 06 §0: same row (06:43); 05 §0 mirrors it (05-timeline.md:25).
- The plan's r1 rows cite the envelope as a prerequisite (06:40 — the wave-1/2 op ports' exit gate is §13.15 rows flipping ALIGNED, which is the conformance table that carries the 6-codes row at 15:4910).

---

## 2. The OT wire's actual error behavior (the 31 verbs)

### 2.1 The emission shape

OT's `CommandResult` is a **flat interface, not a union** (api.ts:214-228):

```ts
export interface CommandResult {
  ok: boolean;
  code?: "INVALID_PARAMS" | "NOT_FOUND" | "CONFLICT" | "NOOP" | "TRACK_LOCKED" | "INTERNAL_ERROR";
  error?: string;   // human-readable reason when ok === false
  data?: unknown;   // op-specific payload (minted refs, echoes)
}
```

The machinery around it:

- **`apply()` is never-throw by contract** — "Pure JSON in, JSON out — never throws — INCLUDING consumer-side faults" (api.ts:556-565): the dispatcher wraps `applyInner` in try/catch; any escaping exception becomes `{ok:false, code:'INTERNAL_ERROR'}` (api.ts:565-577). A THROWING `onApply` observer is likewise contained (console.error + INTERNAL_ERROR classification, api.ts:516-532).
- **Every dispatch is recorded** — `recordApply` pushes `{command, result, seq, origin}` into the bounded `wireLog` ring (cap 500) + the unbounded `wireCoverage` set (api.ts:501-515) — the failure code lands in the audit trail.
- **`applyBatch` is atomic** — first `!ok` rolls back the batch's history entries (depth-anchored, eviction suspended), clears redo, and returns the failing result annotated "(batch rolled back)" (api.ts:2559-2616, the rollback at :2596-2608); `timeline.undo/redo` inside a batch are INVALID_PARAMS (api.ts:2561-2567); success returns `data.results` (the per-command results, api.ts:2576-2612).
- **The never-guard** — the exhaustive-switch `default` arm returns `{ok:false, code:'INVALID_PARAMS', error:'unhandled command…'}` (api.ts:2537-2545); a new verb that is not wired fails typecheck until listed in `WIRE_COMMAND_TYPES` (api.ts:243-297, tsc-lockstep both directions).
- **The code set is closed (6 literals)**: INVALID_PARAMS / NOT_FOUND / CONFLICT / NOOP / TRACK_LOCKED / INTERNAL_ERROR (api.ts:217-223) — the spec-15 §13.15 row records exactly this ("6 codes… PARTIAL… the other 3 coarse codes map to ~24 spec codes — the coarseness itself is the r1 FIRST refinement", 15:4910).

**So: is there an error channel?** Yes — a flat `code`+`error` pair on a returned object; nothing is thrown across the seam; no result-union narrowing; the spec's `stateChange`/`undoInfo` halves are absent (out-of-band readouts instead — 15:4911).

### 2.2 Verb-by-verb failure emissions (the survey table)

The 28 routed + 3 exceptions (api.ts:243-275, :328-335; census law at 15:4914 / 06:32):

| Verb | Failure emissions (file:line @ `970948a`) |
|---|---|
| `timeline.insert` | INVALID_PARAMS (strategy/element/start validation, api.ts:1191-1240); **TRACK_LOCKED** (inline locked-target, api.ts:1198-1208); CONFLICT ("placement failed", api.ts:1260) |
| `timeline.insertBatch` | INVALID_PARAMS (empty array :1276-1282; explicit-no-trackId :1283-1289; per-element law); **TRACK_LOCKED** (inline, api.ts:1290-1296); CONFLICT (intra-batch overlap, whole-batch — 15:4916) |
| `timeline.move` | INVALID_PARAMS (param validation); **TRACK_LOCKED** ×2 — source via `lockPreCheck` + locked destination targets, lock pre-check BEFORE overlap validation (the S2 ordering law, api.ts:1492-1517); CONFLICT (overlap / "move rejected", api.ts:1518-1525) |
| `timeline.trim` | INVALID_PARAMS (array guard, side enum, delta; api.ts:1529-1553); **TRACK_LOCKED** (api.ts:1554-1555); CONFLICT (the F1B-2 overlap simulation, api.ts:1569-1574); NOOP (the zero-clamp law, 06:843) |
| `timeline.split` | INVALID_PARAMS; **TRACK_LOCKED** (api.ts:1616); NOOP (split-at-edge) / NOT_FOUND (stale refs) — the round-4 contract (15:4907) |
| `timeline.delete` | INVALID_PARAMS (array guard :1664-1670); **TRACK_LOCKED** (api.ts:1671-1675); NOT_FOUND ("nothing deleted", api.ts:1676-1679) |
| `timeline.rippleDelete` | as delete (api.ts:1684-1699) |
| `timeline.duplicate` | INVALID_PARAMS (:1704-1710); **TRACK_LOCKED** (api.ts:1711-1715); NOT_FOUND (:1717-1722) |
| `timeline.updateElements` | INVALID_PARAMS (array + patch-shape validation); **TRACK_LOCKED** (api.ts:1890-1898); CONFLICT (F1B-2 reshaping-patch overlap, api.ts:1899-1903); NOT_FOUND (:1904-1907) |
| `timeline.upsertKeyframe` | INVALID_PARAMS (the SE-5 boundary guards, api.ts:2128-2171); **TRACK_LOCKED** (api.ts:2139-2142) |
| `timeline.removeKeyframes` | INVALID_PARAMS; **TRACK_LOCKED** (batch-atomic, api.ts:2239-2246); NOT_FOUND (the F16 named stale-ref, api.ts:2252-2263) |
| `timeline.retimeKeyframes` | INVALID_PARAMS; **TRACK_LOCKED** (api.ts:2337-2344); NOT_FOUND (:2350-2356, :2385-2389); the zero-delta case is `ok:true`+`changed:false` — NEVER NOOP (the benign-echo law, api.ts:2358-2366) |
| `timeline.seek` / `setPlaybackRate` / `setLoopRegion` | INVALID_PARAMS (finite/rate-nonzero/window laws, api.ts:1910-1944, the N5 invariant at 15:4917) |
| `timeline.play` / `pause` | ok:true (the E6 honest echo, api.ts:1921-1927) |
| `timeline.undo` / `redo` | NOOP ("nothing to undo/redo", api.ts:2529-2536) |
| `timeline.selectElements` (exception) | INVALID_PARAMS-family shape guards (the P2-1 pattern, cited 06:2620) |
| `timeline.advancePlayhead` (exception) | INVALID_PARAMS (tick validation) |
| `timeline.toggleBookmark` / `removeBookmark` / `moveBookmark` | INVALID_PARAMS / NOT_FOUND ("no bookmark at fromTime", api.ts:2391-2417) |
| `track.add` | INVALID_PARAMS (index, api.ts:2498-2505); CONFLICT ("track creation failed", api.ts:2510-2512) |
| `track.remove` | **TRACK_LOCKED** (inline, S2-F6 — "a locked track refuses its own removal", api.ts:2514-2523); CONFLICT ("main track?", api.ts:2524-2527) |
| `track.toggleMute` / `toggleVisibility` / `toggleLock` | NOT_FOUND ("track not found or not mutable/hideable", api.ts:2419-2423, :2462-2467, :2468-2473) — no lock gate (track-level state, not layout) |
| `track.setAllLocked` / `setAllMuted` | INVALID_PARAMS (boolean, api.ts:2434-2440, :2452-2458); else `ok:true` + `data:{changed, …}` — the A9 echo law: "NEVER a failure code" for the idempotent set (api.ts:2425-2432, :2444-2460) |

**The lockPreCheck seam** (the N3 wire home): `private lockPreCheck(commandName, elements): CommandResult | null` — emits `{ok:false, code:'TRACK_LOCKED', error:'<verb>: target elements sit on locked track(s): <ids> — unlock the track first'}` when ANY target ref sits on a locked track, run "BEFORE the op (and before the stale-ref NOT_FOUND path) so the code distinguishes 'locked' from 'missing'" (api.ts:536-554). **12 verbs carry it** (insert, insertBatch — as the inline target-track form; move, trim, split, delete, rippleDelete, duplicate, updateElements, upsertKeyframe, removeKeyframes, retimeKeyframes) + track.remove's inline check = **13 TRACK_LOCKED-capable verbs**; the spec's "12 commands" count (15:4910) is the same census.

---

## 3. The N3 survey

### 3.1 The engine side — the 36-op guard census (LANDED, hardening round F1c)

The engine's law pair (timeline.ts:2003-2057): **Law 1 (the op gate)** — `requireTrackUnlocked(trackId, opName)` THROWS `[Timeline] <op>: track <id> is locked` (timeline.ts:2022-2026; clip form `requireClipTrackUnlocked` :2048-2051; unknown ids fall through to the op's own existence validation); **Law 2 (the closure filter)** — `isTrackLockedForEdit(trackId)` excludes locked tracks' clips from companion closures (timeline.ts:2053-2057). The guard family landed at F1c (PLAN.md:351 — "N3 locked-track guards (36 ops) + N4 NaN guards (110 pins) — CLOSED (fa27a69+a9313a1)"; ROUND-CONTEXT.md:65). The count reconciles: **38 throw call-sites across 33 distinct op names** (census below) — the "36 ops" of the filings (audit-AW1.md:201, PLAN.md:351) = the 38 sites minus the 2 pre-existing 3-point guards (insert/overwrite — the test file header: "Before F1c only the 3-point ops (insert/overwrite)… enforced `track.locked`", timeline-locked-track.test.ts:6-8).

The call-site census (timeline.ts; every row is a `requireTrackUnlocked`/`requireClipTrackUnlocked` throw site):

| Op | Site(s) | | Op | Site(s) |
|---|---|---|---|---|
| addVideoClip | :2077 | | removeClip | :2442 |
| addAudioClip | :2164 | | updateClip (structural only) | :2526-2542 |
| addImageClip | :2246 | | splitClip | :2627 |
| addAdjustmentClip | :2320 | | trimHead | :2927 |
| addTextClip | :2391 | | trimTail | :3033 |
| insert edit | :5660 | | rippleTrimItem | :3140 |
| overwrite edit | :6036 | | rollingTrimItems | :3333-3334 (both targets) |
| closeGapAtPosition | :7466 | | rateStretchItem | :3849 |
| closeAllGapsOnTrack | :7576 | | rippleDelete | :4288 |
| rateStretchWithRipple | :7652 | | rippleDeleteItems | :4325 |
| addCompositionClip | :8113 | | removeItems | :4511 |
| removeRangesFromClip | :8241 | | duplicateItems | :4584 (destination) |
| removeSilenceFromItems | :8518 | | moveClip | :4724-4726 (source + destination) |
| removeFillerWordsFromItems | :8563 | | moveItems | :4831-4833 (source + destination) |
| removeTranscriptRangesFromItems | :8593 | | slip | :4959 |
| freezeFrameAtPosition | :8659 | | slideItem | :5108-5113 (clip + both neighbors) |
| joinItems | :8822 | | | |

Plus the closure-filter sites (Law 2): splitClip :2667, trimHead :2962, trimTail :3064, rippleTrimItem :3165, rollingTrimItems :3382-3383, rateStretchItem :3882, the companion fan-outs :3959-4027, rippleDeleteItems :4352, removeItems :4532, moveClip :4767/:4783, moveItems :4880, slip :4991, slide :5158, closeGap/closeAllGaps :7515/:7603 — the lock > link exclusion inside each op.

**updateClip's structural/cosmetic split** (the r1 param-law for the element toggles): a patch that changes LAYOUT (from / durationInFrames / trackId / speed / source window) rejects on a locked track; "Cosmetic patches (volume, label, transform, effects, fades, …) stay allowed — the 'locked tracks untouched' law is about layout edits" (timeline.ts:2526-2542).

**The test file truth** (`tests/vitest/engine/timeline-locked-track.test.ts`): 12 `it()` call-sites producing **49 executed tests** — 38 table-driven op-gate rows (the table at :85-183; each asserts the typed throw + `data` referentially unchanged + no undo entry, :186-199), + 3 standalone laws (addAudioClip kind-agnostic :202-217; cosmetic-allowed :219-229; no-over-guarding :231-238), + 8 closure-law tests (locked companions excluded, never rejected — :245-363). *(The task brief's "14 tests" is the naive `rg "it("` line count — 14 includes 2 substring false-positives from `performInsertEdit(`/`performOverwriteEdit(`; the executed count is 49.)*

### 3.2 The OT side — lockPreCheck coverage over the 31-verb surface

- **Covered (13):** insert (:1202), insertBatch (:1290), move (:1499-1516, source + destination), trim (:1554), split (:1616), delete (:1671), rippleDelete (:1691), duplicate (:1711), updateElements (:1897), upsertKeyframe (:2139), removeKeyframes (:2239), retimeKeyframes (:2337) — the 12-command lockPreCheck family (15:4910) — plus track.remove's inline S2-F6 check (:2517).
- **N/A by law (18):** the transport quartet (play/pause/seek + setPlaybackRate/setLoopRegion — no timeline mutation), undo/redo (history ops), the bookmark trio + the marker family (scene-level, not track-addressed), selectElements (VIEW state), advancePlayhead (ticker), track.add (a new track is born unlocked), toggleLock/setAllLocked (the lock setters themselves), toggleMute/toggleVisibility/setAllMuted (track-level state, not layout — the cosmetic allowance, engine timeline.ts:2528-2530).

**Engine-vs-OT verdict:** the engine is **36/36 landed (0 gap)**; OT covers every layout verb of its 31-verb surface that takes an element/track target (**13 verbs, 0 gap among existing layout verbs**). The gap is entirely FORWARD-LOOKING — the r1 port's new verbs.

### 3.3 The r1 N3 extension gap (the count)

The r1 port program's ~10 new wire verbs (the mode family) + the placement widening:

| New r1 surface | Lock gate needed? | Basis |
|---|---|---|
| `roll`, `slip`, `slide`, `rateStretch` (wave 1) | **YES — 4 verbs** | element-target layout ops (engine gates :3333/:4959/:5108/:3849 carry over) |
| `retime`, `freezeFrame`, `rangeRemoval` (wave 2) | **YES — 3 verbs** | same (engine :2536-2539 speed-window class / :8659 / :8241 family) |
| `replace` (new union member 79) | **YES — 1 verb** | declared in its own §13.15 row: errors include `TRACK_LOCKED` (15:4918) |
| `toggleElementMuted` / `toggleElementVisibility` (06:44) | **NO — cosmetic law** | the engine's updateClip split (timeline.ts:2526-2542) + the pinned cosmetic-allowance test (:219-229) |
| the source-edit placement family (InsertCommand's overwrite/replace-placement + append, 15:4918-4920) | **YES — 1 widening** | the current inline check fires only on explicit `trackId` (api.ts:1191-1208, :1290-1296); the placement family resolves the target from `target: ElementRef` — the resolved track must gate |
| rippleOverwrite / fitToFill composites | inherited | delete+move+insert / insert+updateElements — all constituent verbs already gated |

**The N3 coverage gap count: 8 new layout verbs + 1 placement-target widening = 9 gate additions** (plus 2 cosmetic exemptions by law). The extension pattern per verb is fixed by the existing seam: the `lockPreCheck(commandName, elements)` call as the arm's first step — before param-shape validation for target-refs and before the stale-ref NOT_FOUND path (the S2 ordering law, api.ts:537-541, :1492-1495), or the inline target-track form for track-resolved placements (the insert precedent, api.ts:1198-1208).

---

## 4. The E3 fix shape

### 4.1 The defect, precisely

Both engine source-edit ops abort a transition-window split by returning a **type-conformant empty result** — no error channel, no thrown error, `ok`-shaped silence:

- `performInsertEdit(trackId, sourceId, insertAtFrame, sourceStart, sourceEnd, options): {insertedClipId: string; shiftedClipIds: string[]}` (timeline.ts:5630-5637) — the impl throws for the cheap pre-conditions (track-not-found :5657, lock gate :5660, sourceRange ≤ 0 :5667-5669) but the three R1-B4 aborts return `{insertedClipId: '', shiftedClipIds: []}` verbatim: the target-straddler split blocked (:5723-5726), the Phase-1b companion split blocked (:5769-5772), the Phase-2b gap-split blocked (:5853-5855).
- `performOverwriteEdit(...): {insertedClipId: string; removedClipIds: string[]; splitClipIds: string[]}` (timeline.ts:6007-6014) — same: throws for pre-conditions (:6033-6045); the blocked-split flag returns `{insertedClipId:'', removedClipIds:[], splitClipIds:[]}` (:6179-6181, the R1-B4 comment :6082-6088) and the transition-blocked companion carve (:6267-6270).

The refusal STANCE is right (no commit, no history entry — verified by the pinned no-commit assertions in the linked-source-edit file); the SILENCE is the defect ("not wire-able", 06:1593). The engine filing: PLAN.md:251-255 ("E3 [P3, rides the r1 port] — the silent transition-blocked abort… Re-surface as the error contract at the r1 port (`INVALID_PARAMS`-class, never a silent no-op) per spec 06 §5.9B's error contract row"); the disposition register: PLAN.md:361; ROUND-CONTEXT.md:73.

### 4.2 The options

**(a) A result-union at the wire boundary** (the spec-15 `CommandResult` union, 15:2789-2791): maximally spec-faithful, but it is NOT what OT runs — OT's flat `{ok, code?, error?, data?}` (api.ts:214-228) is consumed by the recorder (api.ts:501-515), `applyBatch` (:2559-2616), the wire-error chip (`data-code`, 15:4910), and the whole 632-test suite. Migrating the shape is a large, risk-bearing churn that buys no new information — the flat shape already carries the union's content (ok discriminates; code+error are the error arm's payload). **Rejected as the port vehicle; the union stays the spec-side projection.**

**(b) A thrown typed error caught at the dispatch boundary:** the engine's own idiom (`requireTrackUnlocked` throws, timeline.ts:2024) — but at OT's wire, the catch-all flattens every throw to INTERNAL_ERROR (api.ts:567-575); keeping the classification would need a new `catch → classify` seam inside every arm, and it fights the never-throw dispatch contract ("never throws — INCLUDING consumer-side faults", api.ts:556-562). The S2 lockPreCheck precedent shows the fleet's wire preference is the **explicit pre-check**, not the caught throw. **Rejected as the wire mechanism** — but note the PORTED OPS themselves may keep the engine's throw idiom internally, provided the arm catches and classifies (see (c)'s mechanism note).

**(c) A refusal the wire arm classifies — the OT-native pattern.** This is what every existing verb already does: the op returns `null`/`false`/empty, and the ARM post-classifies with a typed code (insert: `ref ? {ok:true,data} : {ok:false,code:'CONFLICT'}` api.ts:1250-1260; delete: `ok ? … : NOT_FOUND` api.ts:1676-1679). For E3 specifically, the transition-window is discovered INSIDE the split algorithm (`_splitClipPure` returns null when blocked — timeline.ts:5702-5709, :6092+), so a wire-side pre-check would have to duplicate the transition math — forbidden by the one-writer conventions (the F4-1 byte-exactness law, api.ts:1560-1563). **Therefore: the ported source-edit op returns a typed refusal the arm maps — the preferred carrier is a discriminated result at the OP layer** (`{ok:true, insertedClipId, …} | {ok:false, code:'SPLIT_INSIDE_TRANSITION', constraint:{type:'transition', elementId}}`) — flattened by the arm into the wire `CommandResult` verbatim; the null-return is acceptable only where no reason payload is needed. **This is the recommendation** — see §5.

**What the existing machinery prefers (the criteria, wire coherence > OT machinery > port cost):** the wire coherence law is already ruled — "ONE wire: spec-15 wins (it has the consumer)" for the wire protocol (audit-AW1.md:204); OT's flat envelope + arm-classification IS the editing-subset implementation of that wire (15:4901 — "structurally the spec-15 skeleton… same `EngineCommand`/`CommandResult` envelope idea, same single-dispatcher design, atomic `applyBatch`, never-throws `apply()`"); and the port cost of (c) is one mapping per verb arm, zero new seams. The engine's INTERNAL JSON-RPC surface (`NleEditResult`/`NleEditResultEntry` — per-op `{ok, detail?, error?}` string logs, engine headless/api.ts:416-453) stays INTERNAL transport and is NOT the model (15:4923's binding statement).

### 4.3 The E1/E2 companion residues' error-surface dimension (the boundary with R28-W1-b)

The envelope design must NOT duplicate the companion-semantics rulings, but it owns their ERROR-SURFACE: (i) the companion carve-abort — "a transition-blocked companion carve aborts the whole edit (no partial commit)" (timeline.ts:6267-6270) — surfaces under the SAME E3 envelope (same code, same constraint, the companion's elementId in the constraint); (ii) the lock precedence — a companion on a locked track never causes rejection, only exclusion (06:409; timeline.ts:2053-2057) — the wire NEVER emits TRACK_LOCKED for a ref the caller did not explicitly target (OT's lockPreCheck takes only the explicit targets, api.ts:543-554 — already correct); (iii) E1-b's filed gap ("a companion on a LOCKED track is still mutated… removeItems has the same gap", engine PLAN.md:224-226; the 06 §5.0 E1 row's residue list, 06:439) is a MUTATION-leak, not an error-semantics gap — its fix changes no code in this envelope; the ruling for A1 disposes it.

---

## 5. The envelope design (the recommendation's shape)

### 5.1 The two-tier code taxonomy (the class layer + the fine layer)

Formalize what the corpus already implies (§1.1-observation 1):

- **The CLASS layer (the closed set, the wire's `code` enum today):** `INVALID_PARAMS` · `NOT_FOUND` · `CONFLICT` · `NOOP` · `TRACK_LOCKED` · `INTERNAL_ERROR` · (+ `NOT_IMPLEMENTED` at the app bus, 15:328-330). The class is what `applyBatch`'s abort logic and the UI's chip/retry classification key on.
- **The FINE layer (the open registry, spec-15 §6.3's ~24 codes):** each fine code DECLARES its class + its constraint type. The mapping (the amendment's table):

| Class | Fine codes (spec-15 §6.3 registry) |
|---|---|
| INVALID_PARAMS | SCHEMA_INVALID, **SPLIT_INSIDE_TRANSITION**, TIME_OUT_OF_RANGE, EXPORT_UNSUPPORTED_FORMAT, + new **RATE_OUT_OF_DOMAIN** |
| NOT_FOUND | ELEMENT_NOT_FOUND, TRACK_NOT_FOUND, NO_ACTIVE_SCENE, NO_ACTIVE_PROJECT, PROJECT_NOT_FOUND |
| CONFLICT | OVERLAP_REJECTED, TRACK_NOT_EMPTY, MEDIA_IN_USE, PROJECT_ACTIVE, MAIN_TRACK_CONSTRAINT, CROSS_SECTION_REJECTED |
| NOOP | NOOP, NOTHING_TO_UNDO, NOTHING_TO_REDO |
| TRACK_LOCKED | TRACK_LOCKED |
| INTERNAL_ERROR | INTERNAL_ERROR |
| NOT_IMPLEMENTED | NOT_IMPLEMENTED |

- **The emission law (the fallback rule):** a verb emits its FINE code when its §4.3 command section declares one, else its CLASS code — never worse than today's granularity; the 6 coarse codes remain permanently valid emissions. New r1 verbs declare fine codes from day one; existing verbs migrate opportunistically at their next §13.15-row touch (the C7 fold at r1 END touches all of them — the natural completion point). This honors "the ~24-code table + OT follows" (15:22) without a big-bang OT churn.
- **The constraint block stays the structured disambiguator** (15:2910-2915) and gains ONE type: `'domain'` — carrying the fit-to-fill refusal (`RATE_OUT_OF_DOMAIN`, constraint `{type:'domain'}`) per 06:1669's never-clamp law. The E3 emission: `{ok:false, code:'SPLIT_INSIDE_TRANSITION', error:'…', constraint:{type:'transition', elementId?}}` — class INVALID_PARAMS (the 06:1593 wording satisfied), fine code already in the registry (15:2884), no new E3 code minted.

### 5.2 The never-silent law + its enforcement point

**The law (the §6.3 amendment's new sentence):** a command that refuses to mutate MUST return `{ok:false, <code>}` — `ok:true` with an empty/identity payload (`insertedClipId:''`, zero-`changed` refs) is a contract violation for every LAYOUT verb. The two sanctioned exceptions, stated in the same sentence: the NOOP zero-clamp (class NOOP, 06:843) and the idempotent set-family's `ok:true` + `data:{changed:false}` echo (the A9 law, api.ts:2425-2432 — a completed idempotent set must not abort an `applyBatch`).

**The enforcement point is the wire dispatch arm (`applyInner`'s case arms) — one writer per verb:**
1. **Compile-time:** the exhaustive-switch never-guard (api.ts:2537-2545) + the `WIRE_COMMAND_TYPES` tsc-lockstep (api.ts:277-297) make an unwired verb un-compilable; the D29-F8 census law re-declares the routed/exceptions split mechanically when each r1 verb lands (15:4905, :4918-4921).
2. **Runtime:** each arm's post-classification of its op's refusal return (the (c) mechanism, §4.2) — the E3 class: the transition-blocked refusal NEVER reaches `ok:true`.
3. **Audit-time:** the error-path census — "every `CommandError` code… must have at least one test that *triggers* it (asserting the code, not just `ok: false`)" (17 §2.5 rule 8, 17:450-454), enforced by the codelist × test-ID coverage script (17:2263, :2293) — extended in battery_r28 by the presence checks (§5.5).

### 5.3 The lockPreCheck extension pattern per new verb

1. The arm's first step: `const lock = this.lockPreCheck('<verb>', elements)` (element-target verbs) — before the stale-ref NOT_FOUND path and before overlap validation (the S2 ordering law, api.ts:537-541/:1492-1495); return `lock` if non-null. Track-resolved placements (the source-edit family, replace) use the inline target-track form (the insert precedent, api.ts:1198-1208) — **widened to the resolved target track**, not just the explicit `trackId` param (§3.3's 9th gap).
2. The cosmetic exemption is LAW for `toggleElementMuted`/`toggleElementVisibility` (engine timeline.ts:2526-2542; the pinned allowance test :219-229) — the amendment states it so the r1 implementer does not over-guard (the no-over-guarding pin, :231-238).
3. Batch verbs pre-check the WHOLE batch (the D-ARCH-6 batch-atomic law, api.ts:2239-2246/:2337-2344) — `rangeRemoval` (multi-track) follows the whole-batch form over every touched track.
4. Acceptance per verb: a TRACK_LOCKED pin re-expressing the engine's 38-row op-gate pattern OT-side (throw→`{ok:false, code:'TRACK_LOCKED'}` + state-referentially-unchanged assertion, timeline-locked-track.test.ts:186-199).

### 5.4 The 15 §6.3 amendment's shape (r1 FIRST, before the C7 rename — 15:22)

One amendment set, six parts:
1. **The class/fine table** (§5.1) — the 24 codes tagged with class + constraint type; `code` stays `string` (open registry, "extend as needed" already law, 15:2875).
2. **The flat-shape reconciliation:** OT's flat `CommandResult {ok, code?, error?, data?}` is declared THE canonical wire serialization; the spec's discriminated union (15:2789-2791) is re-expressed as the consumer-side TypeScript narrowing of the same payload (both carry identical information; the union is a view, not a second wire).
3. **The never-silent sentence** (§5.2) + the two sanctioned exceptions.
4. **The NOOP dual-stance clarification** — the F1B-18/F4 residuals ruled once: state-dependent clamps → `ok:false`+NOOP; completed idempotent sets → `ok:true`+`changed:false` (api.ts:2358-2366, :2425-2432) — closing the registered residual class (06:43).
5. **The new-code additions:** `RATE_OUT_OF_DOMAIN` (class INVALID_PARAMS, constraint type `'domain'` — 06 §5.9F's never-clamp law) — the ONLY new fine code the r1 mode family needs (E3 reuses SPLIT_INSIDE_TRANSITION; the append audio-conflict reuses the OVERLAP_REJECTED/CONFLICT family; replace's unfillable-source rides INVALID_PARAMS per its §13.15 row, 15:4918).
6. **The per-verb declaration law:** every §4.3 command section (the ~10 new r1 verbs' sections included) lists its error codes with their classes — the census's input set (17:2263).

### 5.5 The battery check (battery_r28)

- **Presence:** 06 §5.9B:1593's error-contract sentence carries the fine code + class; 15 §6.3 contains the class-tag column, the never-silent sentence, the flat-shape reconciliation, and `RATE_OUT_OF_DOMAIN`; 15's §13.15 rows for the new verbs list TRACK_LOCKED where §3.3 requires it.
- **Coherence:** every fine code in the registry maps to exactly one class; every r1-verb §4.3 section's codes exist in the registry; the cosmetic-exemption verbs declare no lock gate.
- **The census law** (17 §2.5 rule 8): the fine-code registry × triggering-test count ≥ 1 — the r1 exit-gate form of the enforcement.

---

## 6. Recommendation

**Adopt the two-tier envelope: OT's flat `CommandResult` stays the wire shape; the class layer (the 6+NOT_IMPLEMENTED codes) stays the closed enum `applyBatch`/the chip key on; the fine layer (spec-15's ~24-code registry + `RATE_OUT_OF_DOMAIN`) migrates in per-verb as sections declare codes; E3's refusal emits `SPLIT_INSIDE_TRANSITION` (class INVALID_PARAMS) with `constraint:{type:'transition'}` — never a new code, never `ok:true`. The mechanism is the arm's post-classification of a typed op-refusal (option (c)); the lockPreCheck family extends to the 8 new layout verbs + the placement-target widening (9 additions; the 2 element toggles exempt by the cosmetic law); the enforcement point is the wire dispatch arm, backed compile-time by the never-guard/tsc-lockstep and audit-time by the 17 §2.5 rule-8 census, reified as battery_r28 presence/coherence checks.**

**Criteria trace:** *wire coherence* — spec-15 stays the one wire (audit-AW1.md:204), and the amendment makes the flat shape canonical rather than forking a second envelope; *OT's existing machinery* — zero new seams (the pre-check + post-classify pattern is what all 31 verbs already do; the recorder, batch atomicity, and chip are untouched); *port cost* — one mapping per new verb arm, no migration churn for the landed 632-test surface, the census script already specified (17:2263).

**Risks / riders for the W2 ruling:** (i) the two-sanctioned-exceptions sentence must land WITH the never-silent law or the A9 set-alls become spec-violations; (ii) the fine-code migration is per-verb-opportunistic — the ruling should state the r1-END C7 fold as the completion checkpoint so the census doesn't run against a half-migrated registry; (iii) the D38 sub-numbering inconsistency (00:473-475 vs 09:347) is a W4 cleanup; (iv) the stale "spec 00:838" citation in the engine's locked-track test header (timeline-locked-track.test.ts:3 — 00-master:838 is now the test-asset table) re-pins at the W-A re-base; (v) `SPLIT_INSIDE_TRANSITION`'s name says "split" but carries the whole R1-B4 family (insert/overwrite/replace/append refusals) — acceptable (the constraint's elementId disambiguates), but the ruling should say so once.

## Worklog entry
---
Task ID: R28-W1-d
Agent: sub-agent (research — error contracts)
Task: The E3 error contract + the N3 guard survey — the wire error-envelope design for the r1 port program (report: audits/fleet-r28/research-errors.md).

Work Log:
- Extracted the current law: 15 §6.3 (the union :2789-2791, CommandError :2870-2919, the 24-code registry, SPLIT_INSIDE_TRANSITION :2884, constraint :2910-2915); 06 §5.9B's E3 row (:1593/:1601); the NOOP law (06:843); the lock>link precedence (06:409-411); 17 §2.5 rule 8 + §13A.4 (the census enforcement).
- Surveyed OT's wire: the flat CommandResult (api.ts:214-228), never-throw apply (:556-577), atomic applyBatch (:2559-2616), the never-guard (:2537-2545), lockPreCheck (:536-554) + the 31-verb failure-emission table.
- N3 census: the engine's 38 throw-sites / 33 op names (timeline.ts:2077-8822) — 36-op filing reconciled (38 − 2 pre-existing 3-point guards); the 49-test pin file read in full; OT coverage 13 TRACK_LOCKED-capable verbs (12 lockPreCheck family + track.remove inline), 18 N/A by law.
- E3 verified at the source: the 5 empty-return sites (timeline.ts:5726/:5772/:5855/:6181/:6270) vs the thrown pre-conditions (:5657-5669/:6033-6045); the options analyzed ((a) union migration, (b) thrown-typed catch, (c) arm-classified refusal) — (c) recommended.
- Designed the envelope: the two-tier taxonomy (class = the 6+NOT_IMPLEMENTED closed set; fine = the ~24-code registry + RATE_OUT_OF_DOMAIN), the never-silent law + its two sanctioned exceptions, the 9-item N3 extension list, the §6.3 amendment (6 parts), the battery_r28 checks.

Stage Summary:
- Recommendation: two-tier envelope, flat shape canonical, E3 → SPLIT_INSIDE_TRANSITION (INVALID_PARAMS-class, constraint type 'transition'), arm-classified typed refusals; N3 gap = 8 new layout verbs + 1 placement-target widening (9 additions; 2 toggles cosmetic-exempt); enforcement = the wire dispatch arm + never-guard/tsc-lockstep (compile) + the 17 §2.5 r8 census (audit). One new fine code (RATE_OUT_OF_DOMAIN); zero envelope-shape migrations.

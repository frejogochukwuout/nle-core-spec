# R24 fleet audit — `15-wire-protocol.md` (the JSON wire protocol — `EngineCommand`/`CommandResult`/`EngineEvent`)

**Agent:** R24-3o (fresh context, general-purpose). **File owned + edited:** `15-wire-protocol.md`. **Date:** 2026-09-08. **No git commands** (all verification by direct file reads of the live repos).

**Repos audited against (all read live, every feature claim verified in source):** opencut-timeline `ded43c4` (code tip `c15a629`, 536/536 per the module card's live run) · nle-test-app `c885ece` (174/174 static census) · nle-engine `5036387` (458/458). Evidence packs: the R24 module cards (OT + app), ARCH-R24 v2 (D26/D29), the R23 precedent.

---

## VERIFIED-STRONG (live-checked before any edit)

- **The W11 census (D29.2's re-base target), verified at `c15a629`:** `WIRE_COMMAND_TYPES` = exactly 30 names (`api.ts:182-213`), tsc-lockstep asserts both directions (`:216-230`); the routed 24 (17 `timeline.*` + 7 `track.*`) + the 6 exceptions (`selectElements`, `upsertKeyframe`, `removeKeyframe`, `retimeKeyframe`, `advancePlayhead`, `trim`) match the charge's lists EXACTLY. The exception registry is in the RUNNER (`scripts/run-timeline-tests.mjs:283-300`), test-local upstream — **no exported constant** (grep-verified; DECISIONS #25 ruling 2 + the app's D30 R8 say the same).
- **The W11 engine widenings, all verified in source at `c15a629`:** attach options + SA-5 validation (`api.ts:241-258`/`:277-300`); recorder — `WIRE_LOG_RING_CAP = 500` (`:260`), `wireLogDropped`, unbounded `wireCoverage`, `wireReset`/`wireLogReset` (`:305-320`); `applyBatch` `data.results` with the R-A P1-3 comment (`:1753-1775`); keyframe lockPreCheck on `upsertKeyframe`/`removeKeyframe`/`retimeKeyframe` (`:1462`/`:1517`/`:1549`, the R-A P3-9 comments verbatim).
- **Error-code surface:** `CommandResult.code` union unchanged 6 codes at `:153-167`; TRACK_LOCKED now fires on **12 commands** (10 `lockPreCheck` sites + inline `insert` `:567-574` + `track.remove` `:1697-1703`) — the R23 row's "10" understates OT; NOOP-benign classification = DECISIONS #25 ruling 6 (read in `.agents/DECISIONS.md:1098-1106`).
- **F1B-7 law survives the W11 refactor:** `truncateRedo`/`markTransactionRolledBack` were renamed into `futureFloor`/`clearFuture()`/`endTransaction` (`timeline-core.ts:195-268`); semantics identical (pre-batch redo survives rollback); applyBatch call sites now `api.ts:1758-1777`.
- **Line-ref drift @ `c15a629`** (the R23 pin's refs were stale): `applyInner` `:556-1716` (default `:1717`); insert case `:558`; split `:929`; trim `:877`; rippleDelete `:1012`; setLoopRegion `:1273`; readouts `:1783-1805`; applyBatch `:1739-1779`; the insert landed-time echo `:709-718`. Type refs unchanged (`:41-151`, `:42-50`, `:55-62`, `:63-70`, `:52-54`, `ops/group-move.ts:75-80`).
- **The element-toggle "ops" were folded into the patch system:** `timeline-core.ts:1341/:1385` (the R23 refs) are now `ElementPatch` `muted`/`hidden` fields (`:126`/`:140`) applied via `updateElements` (`:1344`) — re-pinned, not contradicted (the wire-side gap row stands).
- **The engine @ `5036387`:** 19-case dispatch at `headless/api.ts:773-792+` (`applyOp` at `:785`) — re-verified live; the api-surface freeze is now **455 names** (grew from 453).
- **The app @ `c885ece`:** zero wire symbols in `src/` (`useWireDispatch`/`attachWire`/`wireHandle`/`WIRE_COMMAND_TYPES`/`wireCoverage`/`onSaveScene`/`onLoadScene` — grep 0 hits; `use-wire-dispatch.ts` absent from the port hooks); EngineMount.tsx + engineService.ts present; D30 R2/R3/R8/R10(j) + the wave plan read in `docs/design-r9-d30.md`.
- **OT's spec-queue candidates:** DECISIONS #25 ruling 2 + HANDOFF:94-96 + PLAN:417-420 — the batch-keyframe wire verbs + `timeline.insertBatch` — verbatim.

## FIXED (edits applied to `15-wire-protocol.md`; ~50 surgical replacements, minimal-diff)

1. **Charge 1 — the census re-based:** status header + §0 OT BASE row + §4.1A header/closing reading + §13.15 pin column & §4.1 row now carry **24 routed + 6 exceptions @ `c15a629`** (the routed/exception name lists, the tsc-lockstep law, the M49C gate mechanics, the runner registry location) + the lineage row (24 R15-charter → 28 @ R22 → 30 @ R23 → the split @ `c15a629`) + **the battery-relevant NOTE: the exception registry is TEST-LOCAL upstream (no exported constant) — a documented OT fact cited at the runner, not an engine symbol.**
2. **Charge 2 — W11 widenings promoted to BASE** (all citing `56dcd8f`/W11-a): attach (SA-5), the recorder (ring 500 + coverage Set + wireReset), WIRE_COMMAND_TYPES (tsc-lockstep both directions), `applyBatch data.results` (R-A P1-3), keyframe-verb TRACK_LOCKED (R-A P3-9) — each with live line refs; also folded into the §13.15 batch-semantics and error-codes rows.
3. **Charge 3 — the app's D30 wire-plan GAP rows (IN-FLIGHT, W-C..W-G):** three new §0 GAP sub-rows — **R2** (port verbs + gesture commits cross the wire; engineService NOT re-routed — the trusted-integrator design + the registered blind spot: shell-path verbs invisible to the gate/chip), **R3** (EngineMount mints the wire via the `wire` prop, the upstream /view pattern; `attachWire` re-registers per re-mint; the coverage carry from view/page.tsx:437-443), **R8** (the coverage-gate port = K3's instrument per D29.1; module-scope accumulator; `accumulated ⊇ WIRE_COMMAND_TYPES − WIRE_UI_EXCEPTIONS`) — with the verified-at-`c885ece` zero-wire-symbols fact + the app BASE row re-pinned (lock-copy byte-exact `c15a629`).
4. **Charge 4 — the C7 §13.15 rows:** the D29/F8 **ENDORSEMENT** registered in three places (§0 C7 GAP row + the §13.15 §4.1-row census-re-declare clause + **two NEW §13.15 rows**: the batch-keyframe wire verbs and `timeline.insertBatch`, both QUEUED r1-adjacent, DECISIONS #25 ruling 2 + D30 R10(j), with the "census RE-DECLARES mechanically per the tsc-lockstep law, no amendment" consequence). The 3 R23 C7-fold DECISION rows preserved.
5. **Charge 5 — error-code rows:** TRACK_LOCKED → 12 commands (R23 understated at 10); NOOP-benign (ruling 6, the `wire-error` chip surface); the ~24-code coarseness remains the r1 FIRST gap.
6. **Charge 6 — pins + phase tags:** all pins re-based (OT `ded43c4`/`c15a629` 536, app `c885ece` 174, engine `5036387` 458, freeze 455 names; §13.14's pin trail `f68ab8c→b8c6f88→5036387`); **all dual-vocabulary tags stripped to the D24 set** (§0 GAP rows, §4.1A phase column + header, §9.5, §13.15's convergence statement — every "(was A2/W-ops/W-media/A5/A7a/A6)" superseded tag removed; the R15-status and status-flip annotations kept as history).

## REMAINS-OPEN (gaps verified still-open)

- C7 rename (r1 END) — 30 prefixed names still on the wire; the 3 union-less verbs still await the C7-fold; the 2 endorsed candidates now grow the worklist.
- Error-envelope coarseness (r1 FIRST) — the ~24-code table still un-landed; classification half now fuller (12-command TRACK_LOCKED + NOOP-benign).
- Union façade (r1) — engine surface still the 19-op INTERNAL dispatch.
- Element-level toggle wire verbs (r1); event staircase (w2); routing-disposition SHA citations (r1); **the D30 wire plan W-C..W-G (app-side, zero wire symbols today)**.

## NOTES

- The briefing's R23 engine pin was typed `b8c6c88`; the live spec/report truth is **`b8c6f88`** — the spec's historical mentions were already correct and are preserved as history.
- The 6-name exception list matches OT's runner registry verbatim; the D30 design doc's broader "exception" phrasing (insertElementOnNewTrack/toJSON/fromJSON/preview pipeline) names NON-command API surface, not registry members — the spec keeps the registry's 6.
- Battery compliance simulated read-only: routing-disposition table present; §9.5/staircase present; §13.15+r1 present; R15 live-pin sweep 0 occurrences; §13.15 table = 13 data rows (11 + the 2 endorsed); the 78-member census arithmetic untouched.
- The §4.1A "Reading at R15" paragraph's "A2 work" phrasing kept deliberately (historical R15 reading, followed by the R24 reading).
- Cleanup: the three temporary patch scripts were deleted after use; the only durable writes are this report + the spec file.

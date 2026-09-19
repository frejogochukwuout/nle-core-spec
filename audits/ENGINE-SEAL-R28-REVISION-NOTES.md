# SEAL-ROUND REVISION-NOTES — the consolidated register for the spec lane

**What this is.** The single canonical revision-note register consolidated from the
seal-round audit fleet's 18 artifacts in `gaps/audit/seal-round/`: 11 slice conformance
reports (5 written at the spec R28 vintage, 6 written at R31), 5 delta re-verifications of
the R28-vintage reports against the R31 spec, 1 upstream M60 delta analysis (context
only), and the round-context briefing. It is addressed to the **nle-core-spec maintainers**
— every row is an executable spec edit. Engine-side work that fell out of the audits is
segregated in §5.

**Audit basis.**
- **Engine (the auditee):** code baseline `e3f55bd` (HEAD `e73d6e4`, audit-dir-only) —
  749/749 vitest across 25 files, tsc 0, layer fence 52, 9/9 CI-wired probes, the
  31-milestone browser suite; vendored OT `55c81c0` + WDC `83b8850` at audit time (the
  M60 re-pin wave — OT `39003d3` + WDC `94f6460` — landed per the round directive;
  `upstream-delta-m60.md` verified it moves **zero engine-consumed bytes**:
  `src/lib/timeline/` byte-identical across `55c81c0..39003d3`, the WDC bump docs-only).
- **Spec (the target of every row below):** `nle-core-spec` v12.0 at **R31 `95dd53c`**
  (post the R29–R31 waves: the DOM-structural tranche, D26.5, D51, the K4 e2e legs, D52,
  the R31 corpus re-key, the D45 fold).
- **Method:** batch-1 reports were written at the R28 vintage; each of their findings was
  **re-verified against the R31 files by the delta reports**, which are AUTHORITATIVE
  where a delta exists. Batch-2 reports are R31-native. Dedup rule applied: batch-1
  findings superseded by delta classifications — **STILL-OPEN and MUTATED rows survive
  here in their amended form; APPLIED halves drop to the appendix (§4); OBSOLETE rows drop
  entirely (none were classified OBSOLETE)**. Where two reports conflict, the delta
  (newer) wins.

**How to read it.**
- Severity: P0 = spec dangerously wrong (none filed) · **P1 = materially false/misleading
  claim or untested core functionality** · **P2 = stale/weak claim, test gap on a real
  path** · **P3 = cosmetic / pin-lag / line-cite drift**. Pin-lag is expected in both
  lane directions (P3 at most per the round rules, unless wrong at its own pin).
- Rows are ordered P1 → P2 → P3, then by primary spec file; rows are numbered
  `P1-n / P2-n / P3-n` for cross-reference. Every row: severity · spec file+section · the
  revision (actionable, apply as an edit) · the evidence cite (file:line, preserved
  verbatim from the source reports — engine cites are at `e3f55bd` unless another repo is
  named) · the filing report.
- Companion-row pairs that should execute together: **P2-1 ↔ P2-23** (the property tier,
  specs 01/02 vs 12), **P2-10 / P2-11 / P2-13 / P1-2** (the D45/NS-4/grade fold — one
  amendment wave over 04/07/08/PLAN/00/charter/19), **P2-14 ↔ P2-15 ↔ P2-17** (spec 06's
  line-anchor set), **P1-6 / P2-21 / P3-15** (the K4-e2e-landed re-key across 07/10/03).
- Delta-05's unfiled posture notes (no register row, absorb at the next re-key in the
  same sweep as P3-27): 05:14/:1111/:1239 still pin OT HEAD `3e18722`; 05:17's census
  declaration (42 = 36+5+1) superseded by the app's 43 = 32+9+2 re-declaration.

---

## 1. Summary — counts by severity × spec file (87 register rows)

| Spec file (primary target) | P1 | P2 | P3 | Rows |
|---|---|---|---|---|
| 01-core-engine | – | 1 | 5 | 6 |
| 02-workers-threading | – | – | 3 | 3 |
| 03-playback-engine | 1 | 3 | 7 | 11 |
| 04-renderer-color | 1 | – | 2 | 3 |
| 05-timeline | 1 | 4 | 5 | 10 |
| 06-nle-ops | – | 4 | 2 | 6 |
| 07-composition | 4 | 3 | 2 | 9 |
| 08-color-grading | – | 1 | 2 | 3 |
| 09-project-model | – | 3 | 3 | 6 |
| 10-fcpxml-export | – | 2 | 3 | 5 |
| 12-testing-strategy | – | 5 | 1 | 6 |
| 15-wire-protocol | – | 1 | 7 | 8 |
| 16-keyboard-shortcuts | – | 3 | 3 | 6 |
| 17-test-plan | 1 | – | 1 | 2 |
| Cross-file (IMPLEMENTATION-PLAN / 00-master / charter / spec-repo registers) | – | 1 | 2 | 3 |
| **Total** | **8** | **31** | **48** | **87** |

*Multi-file rows are counted once, under the first-named file; the full span is carried
in the row itself (e.g. P1-2 spans 04+08; P1-8 spans 17+12; P2-1 spans 01+02). Appendix
(§4) holds 7 additional resolved items; §5 holds 10 engine-side action items + 3
adjacent-lane flags.*

---

## 2. THE REGISTER — P1 (materially false claims / untested core functionality)

### P1-1 · Spec 03 §3.4 note (:152) + §0:15 — "each pinned in-suite" is FALSE for R1-B8/R2-5
**Revision:** Re-attribute R1-B8/R2-5 to `playback/player.ts:793-804` (not clock.ts —
clock.ts has zero scrub matches), delete "each pinned in-suite" for them, and register
the missing scrub-implies-pause pins (fake-timer vehicle: beginScrub-while-playing pauses
the clock, bumps `_transportGeneration`, emits `statechange({isPlaying:false})` before
`scrubchange`); beware the m25.4 "R2-5" name collision (the browser suite's R2-5 is the
timeline addKeyframe guards, `page.tsx:8503` — a different law).
**Evidence:** `src/lib/nle/playback/player.ts:793-804`; `core/clock.ts` (zero `scrub`
matches); `tests/vitest/engine/timeline-edit-ops.test.ts:120-148` (the B7-only pin; block
header :115 says "B7/B8" while containing no B8 pin); zero `beginScrub`/`scrubchange`
matches in nle-test-app/src (the R31 scrub-session family is OT-side and runs from
paused — it does not close this).
**Source:** delta-03 (F-1, register row 1).

### P1-2 · Spec 04:24 (§0 GAP row 3, D29.5c) + 08:24 (twin) + 08:4 (Status header) — the D29.5c twin rows carry false Z2 clauses and the un-flipped 04 twin
**Revision:** Flip the Z2 clause to LANDED (`deliverService.ts:308-338` — the export
grades via the same compose-then-filter final pass; the monitor↔export divergence is
closed); delete the false "zero `grade`/`color` terms in deliverService.ts, re-verified
live" clause (it contradicts the row's own D45 amendment cites) and "not re-filed
engine-side"; correct the amendment's history chain to: re-filed spec-side R25 into the
engine's PLAN (`.agents/PLAN.md:156-162`), dispositioned DECLINED-BY-LAW (ARCH-R24 F1,
`:186-189`), then RATIFIED as D29.5c's registered evolution by D45 (ARCH-R28 §4) — the
engine-PLAN disposition re-file pending; EXECUTE the ordered 04:24 flip to
"ratified-as-evolution, r3-consumable" (D45/ARCH-R28:139 ordered it; 04 is unchanged);
drop "the app's Z2 consumer fix" from 08:4's forward work (replace with the r3 seam
migration if a forward item is wanted).
**Evidence:** `nle-test-app/src/deliverService.ts:308-314` (Z2 comment + grade/
gradeFilter) and `:315-338` (`renderCtx.filter = gradeFilter` at :332);
`ProgramCanvas.tsx:201-215` + `buildGradeFilterString` `:91-94`;
`bridge/composition-frame.ts:483-487` (3-param painter, no grade param — matches the
decline; the `{grade}` seam is r3 per D45); engine `.agents/PLAN.md:156-162/:171-174/
:186-189`; `audits/ARCH-R28-seal-round.md:135/:139/:191`; `04:24` and `08:4` read
verbatim at R31.
**Source:** delta-04-08 (F-1, register row 1 — MUTATED; the D45 fold landed in the
RATIFY direction, overtaking the batch-1 DECLINED-BY-LAW proposal per its own E4
carve-out).

### P1-3 · Spec 05 §8 (new §8.10 or §8A-adjacent row) — the AR-2 keyframe-gesture family + the channel model have zero normative text
**Revision:** Land §8.10: double-click authoring on the volume line / expanded lane
(frame-snapped, duration-clamped, on-curve seed, dB-clamped, exact-tick = replace); the
drag commits ONE `timeline.retimeKeyframes` dispatch (one history entry); delete commits
`removeKeyframes` + the WYSIWYG bake (an emptied channel bakes the seen value into the
base param); name the channel model (`ElementAnimations` = propertyPath →
`ScalarChannel | DiscreteChannel`). [R27 P2-8 / xcut-amend 05-6, never applied]
**Evidence:** `use-keyframe-authoring.ts` (262L — the AR-2 dblclick seam);
`use-keyframe-drag.ts:105-123` (dispatch at :117, "ONE history entry — the W11-f
gesture-commit law"); `use-timeline-actions.ts:406-431` (`:407-413` the removeKeyframes
dispatch); `animations/types.ts:92-104` (`ScalarChannel` :92, `DiscreteChannel` :100);
`ops/timeline-core.ts:1862-1877` (the bake law) — all in `nle-test-app/vendor/nle-timeline`
@ `55c81c0`; zero "channel"/keyframe-gesture text in 05:341-636 (no §8.10 exists).
**Source:** delta-05 (F-1, register row 1).

### P1-4 · Spec 07:13 + 07:1169 — the Gaussian-Blur preview default is a live FALSE law (4 vs 10)
**Revision:** In both lines replace "default 4, non-finite→4" with "**default 10 — the
GPU registry's declared default per the F2-5 cross-module coherence pin**" (non-finite→10,
negative clamps ≥ 0 per R8-REV #5), citing `GAUSSIAN_BLUR_DEFAULT_RADIUS`
(`composition-frame.ts:210`) and the pin at `bridge-seams:985-1012`.
**Evidence:** `bridge/composition-frame.ts:210` (`const GAUSSIAN_BLUR_DEFAULT_RADIUS =
10;`) consumed at `:270`; `effects/pipeline.ts:901` (declared default; definition :864);
`tests/vitest/engine/bridge-seams.test.ts:985-1012` (the pin reads
`gaussianBlur.params.radius.default` live = 10; negative-clamp :1005-1008, non-finite
:1010-1012). Both spec lines verbatim at R31.
**Source:** delta-07 (F-1, register row 1).

### P1-5 · Spec 07 §6.1A (:367) — the sidecar/STARTING bits are falsified by OV-05 + F1, and the one-input-source law block is absent
**Revision:** Insert the OV-05 one-input-source law block (BASE = the engine field
`composition-frame.ts:334`; OVERRIDE = the consumer sidecar; hygiene =
`transition-inputs.ts:117-135`; pins `bridge-seams :869/:886/:901`) AND fix the two stale
bits: "starting at/before the cut" → "whose END is at/before the cut (F1 fix,
`transition-inputs.ts:235-246`)"; "derive it from the element-anchored sidecar" → "from
the ENGINE FIELD (audio: field only; visual: field BASE + sidecar OVERRIDE)".
**Evidence:** `bridge/transition-inputs.ts:117-119` (`transitionInputsFromScene` has NO
sidecar parameter), `:235-246` (END-based pairing); `bridge/composition-frame.ts:334`
(`transitionOut: params[el.id]?.transitionOut ?? elementTransitionOut(el)`) with
`elementTransitionOut` at `:301`; `rg "OV-05"` over 07 → only the :13 census mention.
**Source:** delta-07 (F-2, register row 2).

### P1-6 · Spec 07:22 (§0 GAP row 4, K4) — "no e2e exists app-side yet" is FALSE at R31
**Revision:** Replace "no e2e exists app-side yet — grep-verified @ `c885ece`" with
"**BEGUN @ R31** (the e2e-crawl suite, task R31-K4 — 11 legs at `f58147c`: import → cut →
drag → play → export → undo/redo → JKL → bookmarks → loop-region → multipage, zero mock
paths; deliverService's W2.4 painter IS the export leg's vehicle as this row registers;
the crawl's remaining completion legs are the forward work)".
**Evidence:** `nle-test-app/src/e2e-crawl.test.tsx:1-60` (suite header + venue laws), the
12 `it(` legs at `:317/:390/:515/:563/:614/:675/:698/:814/:919/:998/:1092/:1165`;
`12-testing-strategy.md:14` (R31 layer — "e2e-crawl 11"); `17-test-plan.md:22` (R31
re-pin).
**Source:** delta-07 (NF-1, register row 7).

### P1-7 · Spec 07:21 (§0 GAP row 3, K3) — "the law-net re-expression is still unstarted" is FALSE at R31
**Revision:** Re-key the approximation figure and strike "still unstarted": "the app's
21-file corpus @ `f58147c` is the current approximation — 418/418, the K3 corpus round's
four re-expression maps + the store/policy + geometry tranches + the DOM-structural
tranche LANDED R30/R31; the remaining halves per 17 §13A.6's facet rows are the forward
work" (the "174-test glue suite" figure is four generations stale).
**Evidence:** `12-testing-strategy.md:14` (R30 layer "K3 corpus round: the four
re-expression maps + the store/policy + geometry tranches + the C16 guards"; R31 layer
"ALL 13 RE-EXPRESS-PORT rows LANDED + D26.5 + D51"); the eight tranche test files in
`nle-test-app/src/` (dom-structural 8, scrub-session 4, clip-lifecycle 3, trim-gesture 3,
edge-autoscroll 2, zoom-anchor 2, dnd-fallback 3, mid-drag-yield 5); live census 22
files / 422 it-blocks @ `b5fe3b3`.
**Source:** delta-07 (NF-2, register row 8).

### P1-8 · Spec 17 §13A.1 (:2274-2290) + §8 (:1518-1691) + 12 §10 (:779-848) — the NFR/performance family has ZERO carriers and ZERO GAP rows
**Revision:** File a GAP row for the NFR/perf family (owner + phase — or an explicit user
ruling deferring it), and re-key §13A.1's Tier/job column with "venue NOT YET LANDED"
until a nightly workflow (or a per-PR smoke subset) exists anywhere: no perf-envelope
test exists in any repo (no FPS/scrub-latency/memory/render-time assertions; only
`durationMs` telemetry), and no repo's CI defines a nightly schedule (engine push+dispatch
only, app push+PR only) — by 17 §0A rule 2's own spirit the §13A.1 facet rows dangle
without an executable path.
**Evidence:** `17-test-plan.md:1520-1526` ("performance is a correctness requirement"),
`:1530-1543` (12 threshold rows with Schedule column), `:2274-2290` (tier/job
assignments), `:2276` (preamble); `12-testing-strategy.md:779-848` (code samples),
`:24-36` (GAP rows — no NFR row); engine `ci.yml:17-24`; app `ci.yml:3-7`;
`averageFps|droppedFrames|usedJSHeapSize|measureUserAgentSpecificMemory` greps → zero in
both repos; `src/app/page.tsx:587` (telemetry only, no envelope).
**Source:** spec-12-17 (F-1, register row 1).

---

## 3. THE REGISTER — P2 (stale/weak claims, test gaps on real paths)

### P2-1 · Spec 01 `## Testing` property tier (:31, :2229-2235) + 02 (:2614-2626) — zero engine-side analog
**Revision:** Register the property-tier disposition: an engine-side randomized undo soak
(fast-check against `Timeline.execute`/`undo()`, the 61 wrapped mutators) OR an explicit
"property tier = r1-content" note in §0's ACCEPTANCE row — neither disposition has landed
(no engine-side randomized/property soak exists; the deterministic probe-p114 sweep
remains the only undo soak). Execute together with P2-23 (the 12 §0 BASE bullet).
**Evidence:** `rg -i 'fast-check|fc.assert|numRuns|fuzz|randomiz|property'` over `tests/`
+ `scripts/` → zero matches; no `fast-check` dependency; 61 `this.execute(` wrapped
mutators in `src/lib/nle/timeline/timeline.ts`; `scripts/probe-p114-undo.ts`
(318-check deterministic sweep, `ci.yml:110`).
**Source:** delta-01-02 (F-4, register row 4).

### P2-2 · Spec 03 §0 GAP row 3 (:24) — the D30 row should retire to BASE (now internally contradicted)
**Revision:** Retire the D30 JKL/transport-mirror row to the BASE app row: the mirror
re-pin LANDED (`03:19` itself now records "the s17 re-pin LANDED @ `876f2b8`" — the
residue this GAP row declares outstanding is declared LANDED five rows up), the
acceptance gate is green at the current pin (the live-registry wire-coverage gate, 28
routed + 3 exceptions), and the W-E cite `EngineMount.tsx:238-294` is stale (→ P3-12).
**Evidence:** `03-playback-engine.md:24` vs `:19`; `nle-test-app/src/wire-coverage.test.tsx:29`
(live-registry imports), `:577-582` (THE GATE), 26 tests at the current pin;
`vendor/nle-timeline/headless/api.ts:243-275` + `:328-335` @ `39003d3` (the 31-verb /
28+3 registry).
**Source:** delta-03 (F-2, register row 2).

### P2-3 · Spec 03 §0:31 + §12/Testing — the clock law families have no engine-venue pin
**Revision:** Name the carrier (engine venue) for the §12 clock families + the 50 ms
scrub-latency goal — or file the GAP row (owner: engine; acceptance: the §12 bullets
re-expressed as vitest pins over `core/clock.ts` with the R2-4 fake-timer law, plus the
audio-clock spy pin); only the B7/R2-4 pin exists, and the new K4 LEG 3
(`e2e-crawl.test.tsx:563`) is a coarse app-venue clock pin, not the §12 families.
**Evidence:** `tests/vitest/engine/timeline-edit-ops.test.ts:120-148` (the only Clock
pin); `core/clock.ts:572-593` (the `_now()` epoch law), `:637-640` (floor/ceil split),
`:687` (100ms timeupdate throttle) — the untested law bodies; `03:31` and `03:1394-1435`
verbatim at R31.
**Source:** delta-03 (F-4, register row 4).

### P2-4 · Spec 03 §0:18 (app row census) — the R30 re-key left the per-suite census stale at its own recorded pin
**Revision:** Re-key the per-suite census together with the total at the next pin bump
(or drop the per-suite list and keep "total + file roof"): the eight listed suites sum to
252 vs the row's own "377/377, 12-file roof", and "wire-coverage 9" was already wrong at
`876f2b8` (≥12 since D-ARCH-6; 26 at the current pin) — at minimum fix wire-coverage to
the count at the row's own pin.
**Evidence:** `03-playback-engine.md:18`; static recount at `b5fe3b3`: 22 files / 422
tests — GluedShell 124, audioService 42, sceneBridge 41, timeline-geometry 38,
engineService 31, wire-coverage 26, persistenceService 20, deliverService 20, history-laws
15, e2e-crawl 12, waveformPeaks 9, dom-structural 8, engineSeam 7, mid-drag-yield 5,
scrub-session 4, keybindings-repeat 4, trim-gesture 3, doc-committing-sessions 3,
dnd-fallback 3, clip-lifecycle 3, zoom-anchor 2, edge-autoscroll 2.
**Source:** delta-03 (N-1, register row 10 — NEW at R30/R31).

### P2-5 · Spec 08:23 (§0 GAP row 2 acceptance) + 04:22 / 08:18 framing — the wire-trap clause reconciles 2 of 12 mismatches
**Revision:** Widen the acceptance: reconcile `GPU_EFFECT_TYPES` (54 advertised) with the
44-id registry in BOTH directions — 11 advertised-but-unimplemented ids (`gpu-ascii,
gpu-blocks, gpu-box-blur, gpu-dither, gpu-droste, gpu-pixel-sort-hq, gpu-power-window,
gpu-secondary-qualifier, gpu-threshold, gpu-trigger-wave, gpu-wave`) + `gpu-tint`
implemented-but-unadvertised (wire-rejected) — and mirror the 54/44 = 11+1 count in
04:22/08:18's framing (the two instruments remain the color-relevant subset).
**Evidence:** programmatic diff of `headless/api.ts` `GPU_EFFECT_TYPES` vs the `id:`
fields of `effects/pipeline.ts` + `effects/lut.ts` → wire 54 / registry 44; each phantom
id passes `z.enum(GPU_EFFECT_TYPES)` at `api.ts:1637/:1773` then silently degrades via
the warn-once-then-skip at `pipeline.ts:4699-4700`; `gpu-tint` at `pipeline.ts:716`.
Identical at `e3f55bd` — no R29-R31 change.
**Source:** delta-04-08 (F-2, register row 2).

### P2-6 · Spec 05 §8A (:609/:625/:626/:628) — interim-carrier line pins (fourth drift) + the ghost preview-visibility sub-laws
**Revision:** Convert the four interim-carrier citations to testid keys (current tree:
ghost `Timeline.tsx:1763`, speed badge `:1801`, arrows `:1885/:1899`, trim hit zones
`Clip.tsx:1642/:1662` — the **fourth** drift; testids cannot drift) and append the ghost
preview-visibility sub-laws (the straddler's SPLIT ghost, the rAF-after-paint
`scrollIntoView({inline:'nearest'})`, the 24px zoom floor, the refusal-scrolls-to-playhead).
[R27 P2-5/P2-6]
**Evidence:** shell-variants `Timeline.tsx:1763/:1801/:1885/:1899`, `Clip.tsx:1642/:1662`;
the preview-visibility block `Timeline.tsx:1237-1304` (`previewGhostRef` :1257,
`previewSplitGhostRef` :1259, scrollIntoView at :1299/:1304); `insertPlan.ts:97/:449/:498`
(still exact); zero `scrollIntoView` hits in 05.
**Source:** delta-05 (F-2, register row 2).

### P2-7 · Spec 05 §8.1 (:346) + §8.9 (:579-599) — the four-tool ToolMode enum + the missing T/Y/U rows
**Revision:** Re-point ToolMode to 18 §4.5's nine-tool radio (18:**210**; 15 §4.3.45; 16
§3.2's T/Y/U at **16:180-182**) — the four-tool listing is the pre-R15 seed shape — and
add the T/Y/U rows to §8.9's table; as written §8A keys itself to an enum that lacks its
own tools. [R27 P2-4]
**Evidence:** `05:346` (verbatim `type ToolMode = 'select' | 'razor' | 'hand' | 'zoom';`),
`:603` (the keying clause), `:579-599` (V/B/H/Z/R, no T/Y/U); `16:180-182`; `18:210`.
**Source:** delta-05 (F-3, register row 3).

### P2-8 · Spec 05 §7.2 (:277-310) — the per-track waveform visibility law is missing
**Revision:** Add the per-track waveform visibility law: the `track.waveform` /
`pageTimelineView.waveforms` view flag → flat gradient lane when false (never an empty
canvas); `setAllTrackWaveforms` = ONE `withHistory` write converging every audio track;
cross-ref 18 §4.7's ViewOptionsPopover row. [R27 P2-7]
**Evidence:** shell-variants `Clip.tsx:475-479` (the flag→render gate);
`state/useUiStore.ts:916/:973` (the batch convergence); zero normative "per-track" hits
in 05.
**Source:** delta-05 (F-4, register row 4).

### P2-9 · Spec 05 §0:16 (app row) — three vintages mixed in one row; the R31 layer missing
**Revision:** Re-key the app row coherently at the next flip: drop the stale R27
enumeration ("the 8-suite roof: … wire-coverage 9 …" — sums to 252) that contradicts the
row's own 377/377 headline, and adopt the layered record (252/9 R27 `c020b2a` → 256/13
R29 `876f2b8` → 377/26 12-file R30 `8f12cf9` → **418/418 21-file R31 `f58147c`** per
16:15; current app `b5fe3b3` 422/422, wire-coverage 26, census 43 = 32+9+2) — 05:16 is a
LIVE-stale hit that `rekey_r31.py`'s own STALE_PATTERNS flag but the sweep did not reach
(05 is not in the script's edit set).
**Evidence:** `05:16`; `scripts/rekey_r31.py` (STALE_PATTERNS include "377/377",
"8f12cf9", "12-file roof"); `16-keyboard-shortcuts.md:15`; `nle-test-app/docs/port-census.md`
(the R32-W3-a registry round).
**Source:** delta-05 (F-5, register row 5 — MUTATED: the re-pin flip landed, the
counts/roof re-key did not).

### P2-10 · Spec 07 §0 GAP row 1 (:19) — stale re-key + the NS-4 adjacency in its RULED form
**Revision:** Re-key "STILL OPEN @ `5036387` … G1/G2/N5/P3" to the current pins + the
live HANDOFF shape, and register the NS-4 adjacency in its ruled form: "**D45 (R28):
NS-4 = the bridge adapter — the render-plan projector `project(scene) → TimelineData`,
the visual twin of scene-to-segments, per 08:24 + 17 §13A.5/:2390; the corpus's target
contract is that projector**" (drop the old "may be reshaped by that ruling" hedge,
PLAN.md:475).
**Evidence:** `rg "S4|parity corpus"` over the engine `src` + `.agents/PLAN.md` → only
audit/gaps hits; engine `.agents/PLAN.md:463-485` (the NS queue, NS-4 at :475-477);
`.agents/HANDOFF.md:64-78` (#1 the r1-port design round, #2 D-ARCH-6 absorption — landed
R29, so the G1/G2/N5/P3 reading is two generations behind).
**Source:** delta-07 (F-3, register row 3).

### P2-11 · IMPLEMENTATION-PLAN r1 row (:69) + r3 row (:71) + charter A4 + 00-master D41 (:489) — NS-4 is not one story post-D45
**Revision:** Make NS-4's landing one story, now post-D45: the plan's r1 Stage-0 list
NAMES NS-4/D45 (align with the plan's own :22/:84/:103 and 17:2390's "T1 (r1-entry)");
04 AND 07 each gain their contract-row register (both still at ZERO NS-4 mentions, contra
D41(d)'s "04/07 carry only the contract rows"); charter A4's owner cite "08 §17.B" → the
D45-ruled adapter + the r3 venue-table artifact (08 §17.B is the FreeCut `curvesFragment`
shader quote, `08:1392`); the r3 row registers that D45 constrains the venue table;
19:21/:153 re-key "the registered design queue" → "RULED D45 (the bridge adapter)".
**Evidence:** `IMPLEMENTATION-PLAN.md:69/:71/:22/:84/:103`;
`audits/ARCH-R28-seal-round.md:40/:135/:137/:139`; `00-master-spec.md:489`; `rg "NS-4"`
over 04/07/08 → zero hits; `19-code-references.md:21/:153`.
**Source:** delta-07 (F-4, register row 4 — MUTATED: D45 ruled + 17's test law +
08:24's ratification landed, every concrete edit unapplied).

### P2-12 · Spec 07 §12.A.1 (:1161/:1162/:1171/:1172 + preamble :1154) + §6.1A (:367) + §0:15 — the drifted-cite pack
**Revision:** Re-anchor the drifted cites: player :1321→**:1326**, :1575→**:1580** (text
dispatch :1562, adjustment skip :1556); mask-manager :723→**:734**, :671→**:682**; OT
timeline-core :2638→**:3115**, split :161→**:147-149/:181-183**; app row:
buildAudioSegments :369→**:347**, deliverService 344→**426 LOC** + the Z2 export-grade
sentence (`:308-330`), app 174→**418/418 @ `f58147c`** (R31 canon; 422 live @ `b5fe3b3`);
re-base the "every row's file:line re-verified UNCHANGED" preamble + the D12
ratification note.
**Evidence:** live re-reads at `e3f55bd`: `player.ts:1326` (`_buildLayers`), `:1580`
(video/image gate), `:1562`, `:1556`; `mask-manager.ts:734` (combine call), `:682`
(`getMaskResult`); `bridge/scene-to-segments.ts:347` (`buildAudioSegments`);
`deliverService.ts` = 426 LOC (Z2 at :308-330, `buildGradeFilterString` consumed :314);
OT (code pin `970948a`) `ops/timeline-core.ts:3115` (null=DELETE), `ops/split.ts:147-149/
:181-183`.
**Source:** delta-07 (F-5, register row 5).

### P2-13 · Spec 07:13 (the grade sentence tail) — pre-D45 law in the seam's own home file
**Revision:** Append the D45 register to 07:13: the `{grade}` seam-side param is RATIFIED
as D29.5c's registered evolution (08:24), landing engine-side at r3 with
`buildGradeFilterString` as the seam's string law (the `buildElementFilterString`
precedent, `bridge/composition-frame.ts:257`); the compose-then-filter ORDER is the
permanent law; the consumer-side final pass is the interim tier (+ the Z2 export-grade
sentence, `deliverService.ts:308-330`); 04:24's twin flips in the same wave (P1-2).
**Evidence:** `08:24` (the R28 amendment, verbatim); `17:2390` (the NS-4/{grade} phase
row); `04:24` (the unflipped twin — "The consumer-side final pass is THE LAW");
`bridge/composition-frame.ts:483-487` (the 3-param painter); `deliverService.ts:308-330`
(the live Z2 landing).
**Source:** delta-07 (NF-3, register row 9 — NEW).

### P2-14 · Spec 06 §10.4 (table + header, :2567-2600) — the engine line-number table is stale at the current pin
**Revision:** Re-anchor the ~18 stale engine line rows to the 8,997-LOC positions
(splitClip :2620, splitAllItemsAtFrame :2840, trimHead :2920, trimTail :3026,
rippleTrimItem :3132, rollingTrimItems :3324, rateStretchItem :3840, rateStretchWithRipple
:7645, rippleDelete :4286 / rippleDeleteItems :4320, removeItems :4507, duplicateItems
:4575, moveClip :4715 / moveItems :4823, slip :4956, slideItem :5097,
removeRangesFromClip :8235, freezeFrameAtPosition :8652, joinItems :8817,
closeGapAtPosition :7463 / closeAllGapsOnTrack :7574, undo :7350 / snapshot :7395,
snapshotsEqual :1642, applySyncLockRipplePatch :4218, sync-lock.ts:579) and fix the
"re-verified R24 @ `5036387` — UNCHANGED / 7,502 LOC / ~108 public methods" header —
timeline.ts is 8,997 LOC at `e3f55bd` and the table was never re-anchored (only the
insert-edit :5630 / overwrite :6007 rows are current).
**Evidence:** `rg -n '<method>\(' src/lib/nle/timeline/timeline.ts` (the positions
above); `wc -l` → 8,997.
**Source:** spec-06 (F-1, register row 1).

### P2-15 · Spec 06 §0:34 — the "§10.4 line numbers re-anchored at `f9ac806`" claim is false as written
**Revision:** Land the P2-14 re-anchor or re-word §0:34 to "§0's ten-mode matrix is the
live anchor" and drop the false re-anchor claim; reconcile the sentence with whatever
lands.
**Evidence:** §10.4's header still carries the R24-era numbers; §0:34 asserts the
re-anchor that never executed.
**Source:** spec-06 (F-1/F-2, register row 2).

### P2-16 · Spec 06 §5.0 E1 row (:439) — E1-b is closed at HEAD, still listed live
**Revision:** Mark E1-b (the locked-companion closure gap) **CLOSED-AT-HEAD (N3/F1c,
`timeline-locked-track.test.ts` 12 tests)** in the same form as the E1-a closure note:
the lock > link closure law is implemented engine-wide and pinned; keep E1-c/E1-d live
(both verified real at HEAD).
**Evidence:** `rg 'requireClipTrackUnlocked|isTrackLockedForEdit' src/lib/nle/timeline/timeline.ts`
→ 33 hits across the op surface (removeItems gate :4511 + closure filter :4521-4532,
splitClip :2667, splitAllItemsAtFrame :2865, trimHead :2962, trimTail :3064, rippleTrimItem
:3165, rollingTrimItems :3374-3383, rateStretchItem :3882+:3959-4027, rippleDelete/
rippleDeleteItems :4344-4400, moveClip :4767, moveItems :4880, slip :4991, slideItem
:5158, _performInsertEditImpl :5756/:5800, _performOverwriteEditImpl :6259-6261,
closeGapAtPosition :7512); `timeline-locked-track.test.ts` (12 tests incl. the 39-row
op-gate table loop :186 and the removeItems pin :299); `timeline-edit-ops.test.ts:508`
("a companion on a LOCKED track never enters the closure").
**Source:** spec-06 (F-3, register row 3).

### P2-17 · Spec 06 §5.0/§5.1/§5.9/§5.9B/§5.9C/§5.9E/§5.9F/Testing — the R25-era inline engine line refs
**Revision:** One mechanical re-anchor pass to the `e3f55bd` (8,997-LOC) positions, no
semantic changes (every checked claim's substance holds):
getSynchronizedLinkedItems :751-767→**:856**; relinkSplitSegments :668-690→**:773-795**;
_performInsertEditImpl :4719→**:5647**; _splitClipPure :4742-4774→**:5479**; Phase-2 shift
:4776-4802→**:5784-5868**; _performOverwriteEditImpl :4876-5051→**:6023-6331**;
_buildSourceEditClip :5061-5116→**:6341**; joinItems remap :7411-7427→**:8896-8904**;
removeItems :3757→**:4507**; rateStretchItem :3202-3211→**:3840+**; rippleTrim shift
:2921-2950→**:3132/:3155+**; sync-lock :3475/:3534→**:4218 + sync-lock.ts:579**; RE-1
:4513-4515→(drop — the family claim stands on :5630/:6007); Testing :4336→**slideItem
:5097+**.
**Evidence:** per-row Read/rg excerpts (e.g. the E2 fate block :6183-6272; Phase 2b
:5817-5868; `rg 'replacementByRemovedId'` → :8896).
**Source:** spec-06 (F-2, register row 4).

### P2-18 · Spec 09 §10.3 — two rows cite DELETED code; nine more cites drifted
**Revision:** Retire/replace the two lifecycle-zod rows (the schemas were REMOVED —
`api.ts:1808-1809` documents the deletion; the version-literal corrective re-cites
`core/types.ts:1497` `schemaVersion?: number`; "two conflicting Project shapes" is
obsolete — ONE `Project` at `core/types.ts:1486`) and refresh the drifted cites:
`normalizeProjectForHeadless` :2179, `editProject` :1065 (the post-edit serialize at
:1112), `serializeProject?` :2499, Wave-1 probe stub :2732, `snapshotsEqual`
timeline.ts:1642 (jsonDeepEqual :1661-1668), persistence `:78/:91/:171/:321/:361/:424`,
MASTER.md:79, 1,174→**1,451 LOC**.
**Evidence:** `sed -n '1734,1748p' api.ts` (zod clip schemas, not schemaVersion/fps);
`rg -n "Removed: lifecycleTimelineSchema" api.ts` → :1808; each anchor verified by
Read/rg @ `e3f55bd`.
**Source:** spec-09 (F-1, register row 1).

### P2-19 · Spec 09 §3.1A B1 (the D42 note) — lacks the OPEN/Stage-0 status marker
**Revision:** Add one explicit status sentence to B1's D42 note: "**OPEN — Stage-0/A1
(ruled D42, lands at the r1 port): OT at every current pin (`55c81c0`/`31f2764`/`39003d3`)
carries NO linkage field; until the port the link rides the app's sceneBridge
`ElementMeta.linkedTo` sidecar + the engine bridge's `av-link.ts` closure (the five laws
above are its current, landed implementation).**"
**Evidence:** OT `src/lib/timeline/types/index.ts:179-191` (BaseTimelineElement — id/
name/duration/startTime/trimStart/trimEnd/sourceDuration?/animations?/params?/
transitionOut?; zero `linked*` in OT's whole src, verified at `39003d3` and per
`audits/fleet-r28/review-d42.md` row 1 at `55c81c0`); `nle-test-app/src/sceneBridge.ts:80`;
`nle-engine/src/lib/nle/bridge/av-link.ts:26-37/:143-153` (symmetric/live-id-only/
order-stable/cycle-free/locked-partner-skip); `IMPLEMENTATION-PLAN.md` §r1 Stage-0
("OT has NO linkage field").
**Source:** spec-09 (F-2, register row 2).

### P2-20 · Spec 09 §0 GAP row 1 (the w3 remainder) — the file-affordance remainder is discharged at the current app pin
**Revision:** At the next re-pin, strike "the toolbar affordance is NOT" and record the
landing (app R32 wave `b5fe3b3`: `EngineMount.tsx:29/:455-507` + `TimelineToolbar.tsx:263-273`);
the OPFS layer + persistence-format formalization remain the w3 remainder (zero
OPFS/IndexedDB app-side, verified).
**Evidence:** `rg "onSaveScene|onLoadScene" nle-test-app/src` → EngineMount/
TimelineToolbar/TimelineView; Read of `EngineMount.tsx:455-507` (Load goes through the
hostile-input-validated `loadSnapshotFile`); OPFS/IndexedDB grep over app src → no files.
**Source:** spec-09 (F-3, register row 3).

### P2-21 · Spec 10 §0 GAP row (K4, :20) — "the app still has ZERO e2e" is stale and internally contradicted
**Revision:** Rewrite the residual: "The e2e half LANDED at the app's R31 (`f58147c` —
the e2e-crawl suite, LEG 1–4: import→cut→play→export over the real UI + real
deliverService; grown at R32, `b5fe3b3` 422/422). The residual is the MASTER-export venue
leg only: the frame path runs with the one `canvas.toBlob` jsdom stub; `exportMaster`'s
mediabunny mux needs a real browser venue (OffscreenCanvas/WebCodecs) — pinned
browser-only in e2e-crawl LEG 4b + deliverService.test.ts."
**Evidence:** spec 10 line 16 (§0's own R31 note records the landing) vs line 20;
`nle-test-app/src/e2e-crawl.test.tsx:614-688` (LEG 4 the real DeliverPage + deliverService
export; LEG 4b the honest venue-gap pin — jsdom lacks OffscreenCanvas/WebCodecs,
`exportMaster` dies at `deliverService.ts:300`); 23 `it(` cases at `b5fe3b3`.
**Source:** spec-10 (F-1, register row 1).

### P2-22 · Spec 10 §0 BASE (:14) + §8.1 (:804-811) + §16 KNOWN_LOSSY_FIELDS plan — the engine's BGM-score export path is invisible
**Revision:** Add to §0's engine-half sentence "…and the v2 D-4 BGM-score export path
(`score` on the adapter's render verbs — instrument notes ride the same offline mixdown,
`orchestrator.ts:561`)", and add a §8.1 row: "❌ **BGM score / instrument-note clips**
(v2 D-4): no FCPXML 1.10 element — v1 lists `ScoredNoteClip` in `KNOWN_LOSSY_FIELDS`
(or renders the score to a baked audio asset at phase entry — the decision is an r5
phase-entry artifact, like N2b)."
**Evidence:** `orchestrator.ts:561` (`AudioMixdownScore` on renderComposition/
renderAudioOnly), `:578-579`, `:637-674`, `:804-809` (notes-only timeline = a real score
export), `:641-645` (ctx sizing max(timeline, scoreClipEndSec)); `audio-mixdown.ts:214-217/
:357-359`; `tests/vitest/nle-bridge.test.ts:2247-2337` (H18d — renderAudioMixdown with
score, mute fold); zero `bgm|scored|instrument|score clip` matches in spec 10.
**Source:** spec-10 (F-2, register row 2).

### P2-23 · Spec 12 §0 BASE (:12) vs §13.7 (:1544) — "property-based testing (§8)" listed as landed methodology
**Revision:** Re-key the BASE bullet: "property-based testing (§8) — LAW landed, EXECUTION
r1-scheduled (13A.8 #1; zero fast-check carriers at the current pins — §13.7's SPEC-ONLY
row stands)"; optionally register the pre-r1 opportunity (fast-check over the class API —
the undo-involutive/no-overlap/duration-preservation laws map to functionality that
exists TODAY). Execute together with P2-1 (the 01/02 disposition).
**Evidence:** `12-testing-strategy.md:12` vs `:1544` ("§8 property-based | — |
COULD-NOT-VERIFY (no fast-check) | SPEC-ONLY"); `fast-check` absent from engine
`package.json:86-102`; zero `fuzz|randomiz|fast-check|numRuns` matches in `tests/vitest/`
or `scripts/`; the D42/D46 families are honestly phase-registered (r1 Stage-0,
`17-test-plan.md:2407`).
**Source:** spec-12-17 (F-2, register row 2).

### P2-24 · Spec 12 §0 BASE (:12) vs §13.7 (:1543); 12 §15/§16; 17 §5/§10/§11 — "asset scripts (§15/§16)" overstates
**Revision:** Register the divergence explicitly ("virtual media + computed oracles is
the engine's Tier-2 canon until the real-file corpus (r4) and a real-GPU venue land;
§15/§16 execute there") and re-key the BASE bullet's "asset scripts" clause to those
phases — no ffmpeg/ffprobe, no `tests/fixtures/` tree, no manifest.json, no reference
PNGs, no `generate-assets.mjs`/`generate-references.mjs`, no regen workflow exists in any
repo.
**Evidence:** greps over the engine `src/`, `scripts/`, `tests/`, `package.json` → zero;
`12-testing-strategy.md:12` vs `:1543` ("§15 fixtures + manifest | COULD-NOT-VERIFY |
SPEC-ONLY"); the engine's venue is the deterministic `VirtualVideoSpec`
(`src/app/page.tsx:555-560/:609/:639`) with computed expected pixels.
**Source:** spec-12-17 (F-3, register row 3).

### P2-25 · Spec 12 §7 (:553-602) + §0 BASE (:12) — WYSIWYG reads as standing law with no two-venue carrier
**Revision:** Re-key §7's status: one engine; the export path is the cloud venue today;
the landed halves are m24 decode-parity, m29 sample-level mix parity, N2b offline parity;
the two-venue pixel gate + the realtime-vs-offline NULL rig ride the r2/r3 parity rows —
surface 17 §17A S4's honest net-new-rig note (`17:2790`) in §7 itself.
**Evidence:** `12-testing-strategy.md:12/:553-602` ("Any diff > 0 pixels fails the
build" — no cloud-render venue, no second engine); `17-test-plan.md:2790`;
`page.tsx:248/:273/:7986` (the landed parity pins).
**Source:** spec-12-17 (F-4, register row 4).

### P2-26 · Spec 12 `## Testing` meta-tests (:2745-2780) — the carriers are unmarked
**Revision:** Mark each meta-test row's execution status: canary → CARRIED
(`run-nle-tests.mjs:170-194`); count-snapshot → CARRIED (the T6 structural pins
`:41/:51/:337-364` + the battery's suite-census coherence class); mutation-teeth →
CARRIED app-side (`census-mutation-gate.mjs:1-26`); negative-test-always-fails /
self-run-suite / flake-detector → **SPEC-ONLY** — register the expected-failures project
against the engine's runner if the silent-green class is to be closed programmatically.
**Evidence:** `12-testing-strategy.md:2745-2780`; `run-nle-tests.mjs:170-194/:337-364`;
`census-mutation-gate.mjs:1-26`; no `--repeat-each` anywhere (mitigation: the suites are
deterministic by design).
**Source:** spec-12-17 (F-5, register row 5).

### P2-27 · Spec 12 §17.5 (:2411-2422) — coverage is unmeasured engine-side, ungated app-side
**Revision:** Either land a thresholds floor (both repos — the spec's own FreeCut
48/42/52/49 pattern) or annotate §17.5 as target-not-current so the ratchet is not
assumed to exist — a coverage regression cannot currently fail any build.
**Evidence:** engine `package.json:86-102` (no `@vitest/coverage-v8`); engine
`vitest.config.ts:19-26` (no coverage block — the 749-test net's coverage of `src/lib/nle`
(63 files / ~57,100 LOC) is unmeasured); `nle-test-app/vitest.config.ts:29` (instruments
`src/**`, no thresholds); `12-testing-strategy.md:2411-2422/:1438`.
**Source:** spec-12-17 (F-6, register row 6).

### P2-28 · Spec 15 §13.14, the §12.2 replay row (:5014) — the "Fake editProject round-trip" row is false at the current engine
**Revision:** Flip the row: the fix LANDED (Wave 4B/P0.4) — re-anchor to
`headless/api.ts:1100-1120`, quote the real-round-trip comment ("real round-trip —
serialize the adapter's post-edit state instead of echoing the caller's input project"),
status CORRECTIVE → **ALIGNED** (the one residual: the proxy-adapter fallback
`:1121-1130`, non-Timeline adapters only); the neighboring §7 batch-abort row remains
TRUE and needs no change.
**Evidence:** `rg 'project: input.project|Wave 2 will replace' src/lib/nle/headless/api.ts`
→ zero; `api.ts:1100-1108` (the Wave 4B comment), `:1110` (`const backing =
actions.timeline`), `:1112-1120` (`serializeTimeline(backing, …)`); `timeline-adapter.ts:45/
:87/:118`; `api.ts:1058-1062` (batch aborts on first failure — verified unchanged).
**Source:** spec-15 (F-1, register row 1).

### P2-29 · Spec 16 §3.1 (:147-148) + §6.1 #8 (:642) + Appendix A (:2176-2177) + §0 (:24) — the ⇧Arrow resolution is contradicted by both engine-world keymaps
**Revision:** Either re-base the ⇧Arrow rows (§3.1, §6.1 #8, Appendix A's
`kbd-frame-jump-*`) to the dual-world law (mock ±10-frame step / engine-world ±5 s jump —
the W11 M28R law, like the cheat sheet's `engine:` note) or register the ⇧Arrow
world-split in the K3 OT-side divergence census; amend §0:24's "B remains the sole live
divergence" (it under-counts live divergences by a full family); rider: the "±1 s" half
of §0's phrasing is unreachable on the ⇧ binding (the `jumpBy` shift branch is always
5 s — `JUMP_SECONDS = 1` is dead config for this row).
**Evidence:** app `use-keybindings.ts:50-51` (⇧→ jump-forward/jump-backward), `:84-85`
(`LONG_JUMP_SECONDS = 5`), `:278-283`; OT `use-keybindings.ts:44-45/:206-210` (same ±5 s
law); nle-ui `useShortcuts.ts:154-161` (the mock ±10 step) + `shortcutMap.ts:36-37` (the
honest dual annotation); spec 16 lines 96/147-148/642/2176-2177 vs 15/19/24.
**Source:** spec-16 (F-1, register row 1).

### P2-30 · Spec 16 §0:24 (the K3 OT-census row) — the C16 sentence is half-stale
**Revision:** Re-scope the C16 sentence to OT-only: "the gate is still absent from the OT
keymap; the app-port guard + the package twin landed R30 (`8f12cf9`), pinned by
keybindings-repeat.test.ts + useShortcuts.test.tsx" — as written it directs S-app work at
a landed item and understates the app-side coverage.
**Evidence:** app `use-keybindings.ts:230` (`if (event.repeat) return;` — ALL keys,
comment block :221-229); `src/keybindings-repeat.test.ts:78/:99/:111/:149` (the four
legs); nle-ui `useShortcuts.ts:52`; `rg 'event.repeat'` over OT's keymap → no matches
(247 lines, read in full).
**Source:** spec-16 (F-2, register row 2).

### P2-31 · Spec 16 §0:15 (the D51 paragraph's D52 residual) — D52 flipped from "candidate" to LANDED
**Revision:** At the next §0 re-pin, flip the D52 residual from "candidate" to LANDED
(nle-ui part 1 `1e0c30b` 743/743: the optional `TimelineRouter.isInteractionActive`
twin `timelineRouter.ts:87` + the `useShortcuts.ts` doc-row gates; the app R32-W3-a
`b5fe3b3` 422/422: the OR-composed getter + the doc-committing-sessions registry), and
fold the drifted line cites (→ P3-47).
**Evidence:** nle-ui `src/state/timelineRouter.ts:87` (`isInteractionActive?: () =>
boolean;`); `useShortcuts.ts:81-95` (the D52 block, computed at :95) + the silent yields
at `:245/:276/:290/:413/:419/:430/:459/:469-470/:473-474`; app `TimelineView.tsx:1072`;
`src/doc-committing-sessions.test.tsx` (the 22nd test file) + `docs/research-d52-two-keymap-yield.md`.
**Source:** spec-16 (F-3, register row 3).

---

## 3b. THE REGISTER — P3 (cosmetic / pin-lag / cite drift)

### P3-1 · Spec 01 §13A row 1 (01:2001) — the §13A quote cites a retired symbol
**Revision:** Update the `index.ts:7` quote → ``…Player, RealtimeAudioBridge…``; add the
supersession note "AudioMixer class retired 2026-09-04 (m30 one-engine); realtime audio =
RealtimeAudioBridge → WDC SegmentStripAdapter/ChannelStrips" (the row's substance — no
EditorCore root, concrete classes are the API — remains true).
**Evidence:** `src/lib/nle/index.ts:7` (RealtimeAudioBridge exported at `index.ts:45`);
`src/lib/nle/audio/mixer.ts:1-9` (the retirement note); `tests/vitest/engine/api-surface.frozen.ts`
(455 names, AudioMixer absent; the two D9-legal additives at :155/:224).
**Source:** delta-01-02 (F-1, register row 1).

### P3-2 · Spec 01 §0 BASE W2 clause (01:13) — the W2 pin count is stale
**Revision:** "10 pins W2a-j" → "11 pins W2a–W2k" (W2k = the out-of-domain
legacy-fallback pin, `nle-bridge.test.ts:899`; align with 02 §0's W2a–W2k — the two
specs disagree at the same engine pin).
**Evidence:** `tests/vitest/nle-bridge.test.ts` — W2a :758, W2b :781, W2c :798, W2d :832,
W2e :857, W2f :880, W2k :899, W2g :941, W2h :979, W2i :1038, W2j :1067.
**Source:** delta-01-02 (F-2, register row 2).

### P3-3 · Spec 01 §0 + §13A preamble; 02 §0 + §13B preamble — the re-pin residuals left by the R29 re-key
**Revision:** ① `01:13` live list: "m2-wave1-mixer-surface **9**" → **10** test blocks
(the +1 that makes 749 — the re-key moved the total but not the per-file list);
② `01:1997` "57,085 src/lib LOC / 63 files" is the `src/lib/nle`-scoped measure (exact
for that scope) under a "src/lib" label — either re-label to "src/lib/nle" or use the
full-tree 65 files / 57,103 LOC. (The 02-side residuals are P3-6/P3-7.)
**Evidence:** 10 `it(`/`test(` blocks in `m2-wave1-mixer-surface.test.ts` (re-counted);
`src/lib/nle` = 63 files / 57,085 LOC; full `src/lib` = 65 files / 57,103 LOC.
**Source:** delta-01-02 (F-3 residual, register row 3).

### P3-4 · Spec 02 §13B preamble (02:2350) — "single-tier tests" survived the R29 re-key of its own sentence
**Revision:** Drop "single-tier tests" from the inherited-patterns list (the engine is
multi-tier: 749 vitest / 25 files + 9 CI-wired probes at `ci.yml:110-136` + the
31-milestone Playwright/WebGPU browser suite + the OV-12 vendored-tree gate).
**Evidence:** the pins around the phrase were re-keyed at R29 (`e3f55bd`/749/55c81c0/
83b8850) while the pattern claim was not; spec 01's parallel preamble (`01:1997`) shows
the correct form ("The scout-era snapshot read … single-tier tests").
**Source:** delta-01-02 (F-5, register row 5).

### P3-5 · Spec 01 §0 OV-12 cite (01:13); 02 §0 app cites (02:17) — line-range re-bases
**Revision:** Re-base `ci.yml:216-253` → the job spans `ci.yml:216-316` (re-pin
detection ends ~:255; the `vendored-timeline-artifacts` upload at :312); app-side:
`deliverService.ts:252` → **:260** (the `workletFlushMs` line); the ":170-172"
insert-family cite → the comment block now spans **:162-177** (the CR-F2 note at
:170-176; the family enumeration at :162-166); the `vite.config.ts:28-69` block extends
past :69 (`closeBundle()` at :72, the missing-source warning at :82).
**Evidence:** `.github/workflows/ci.yml:216-316`; `nle-test-app/src/deliverService.ts:260/
:162-177`; `vite.config.ts:50/:55/:72/:82`; the app's `public/` directory remains absent
(the ZERO-byte-duplication claim holds).
**Source:** delta-01-02 (F-6, register row 6).

### P3-6 · Spec 02 §0 ACCEPTANCE row (02:26) — the trailing "today" counts were not reconciled with the row's own R30 bracket
**Revision:** Re-base the trailing sentence's counts (engine **748→749**; app **252→**
the R30/R31 bracket values — 377 at `8f12cf9`, 418 at `f58147c` per `01:14`) or re-scope
them to the battery's historical pins like the preceding clause ("748/748 @ `f9ac806` …
— the regression role").
**Evidence:** `02:26` vs `02:15` (the BASE row re-keyed to 749 at `e3f55bd`); `01:14`.
**Source:** delta-01-02 (N-1, register row 7 — NEW at R30/R31).

### P3-7 · Spec 02 §0 WDC BASE row (02:16) — missed the R29 re-key
**Revision:** Re-key the WDC BASE row `ec8fd5c` → `83b8850` (the S-series wave `480a216`
+ the R29 re-pin — the same file's `:15` and `:2350` and spec 01's `:13` already record
83b8850), or explicitly tag `ec8fd5c` as a battery-posture historical pin. (The row's
WDC-side law claims are not in question; only the pin is stale.)
**Evidence:** `02:16` vs `02:15/:2350`; `01:13` ("re-pinned 494f6ff→…→`ec8fd5c`→`83b8850`").
**Source:** delta-01-02 (N-2, register row 8 — NEW at R29).

### P3-8 · Spec 01 §0 app row R31 bracket (01:14) — the bracket declares pins it doesn't record; +9-file arithmetic doesn't close
**Revision:** Record the R31 vendor/nle-ui pins in the bracket (the row body's last
recorded pins are two re-keys behind: OT lock `55c81c0` / WDC `ec8fd5c` / nle-ui
`6754979` vs R31's `dc3644b`/M60) and account for the +5 tests beyond the +9-file list
(36 listed vs 418 − 377 = 41 — presumably additions to pre-existing files, unlisted).
**Evidence:** `01:14` + `01:27` (R31 nle-ui `dc3644b`); per-file it/test counts of the
app suite (runtime-expanded — the bracket's figures at `f58147c` could not be
conclusively re-verified from the current tree).
**Source:** delta-01-02 (N-3, register row 9 — NEW, app-side cross-note).

### P3-9 · Spec 03 §8.5 (:917) — the element-half cite drifted
**Revision:** Re-cite the element half: `scene-mixer.ts:386-389` (was :365 — now inside
`scheduleSegments`' doc comment; `realtime-bridge.ts:328` is still exact).
**Evidence:** `bridge/scene-mixer.ts:386` (`if (seg.varispeedRate !== 1)
opts.varispeedRate = seg.varispeedRate;`), `:387-389` (the maintainPitch thread);
`audio/realtime-bridge.ts:328`.
**Source:** delta-03 (F-5, register row 5).

### P3-10 · Spec 03 §8.5 (:917) — "composed domain stays in [1/32, 32] by construction" is false at the floor
**Revision:** Reword: the composed magnitude range is **[0.01, 20]** (element clamp
[0.01, 5] × ladder {1,2,4}); rates below 1/32 (the dead zone [0.01, 0.03125)) fall to
the adapter's domain-guard fallback (warn + pitch-affected legacy path) — the guard is
the actual mechanism at the floor, not a net.
**Evidence:** `bridge/opencut-laws.ts:101-120` (the [0.01, 5] one-home) and `:112-113`
("opencut's [0.01, 5] is NOT a subset of the WSOLA domain [1/32, 32] — the dead zone");
`bridge/segment-strip-adapter.ts:537-549` (the domain guard); consumed via
`clampOpencutRetimeRate` at `bridge/scene-to-segments.ts:326/:576/:610`.
**Source:** delta-03 (F-6, register row 6).

### P3-11 · Spec 03 §0:15 + §13E §7.2 row (:1547) — the scrub-cache wave attribution
**Revision:** "scrub cache + prewarm per Wave 3F; the awaitable prewarm promise
(`_scrubPrewarmPromise`/`awaitScrubPrewarm`) + event forwarding per Wave 4A" — Wave 3F
landed the LRU cache + prewarm + endScrub delay; Wave 4A's addition is the tracked
promise (`player.ts:829`).
**Evidence:** `player.ts:278` ("Wave 3F — Scrubbing cache" section), `:674` (invalidate),
`:787` (pre-renders nearby frames), `:289-291` (SCRUB_CACHE_MAX_SIZE 30 / END_DELAY_MS
1500 / PREWARM_RADIUS 3), `:829/:840-842`; `gaps/wave3f-soundtouch-scrub-adaptive.md`
(Status: Complete).
**Source:** delta-03 (F-7, register row 7).

### P3-12 · Spec 03 §0:18/:24 — the W-E loop-bridge cite drifted further
**Revision:** Re-cite the W-E loop bridge to `src/timeline-port/EngineMount.tsx:332-409`
(push **:332-355**, reverse **:388-409**) — the old `:238-294` is now the D-ARCH-6
`timeline.insertBatch` pool switch (:236-259), and batch-1's proposed `:332-395` is
already behind.
**Evidence:** `EngineMount.tsx:332` (the D30 R4 echo-key comment), `:338`
(`lastPushedLoopKeyRef`), `:354` (`core.setLoopRegion(region)`), `:388-409` (the reverse
bridge — tick-domain key compare :398, `patch.loop` :403); the file is 528 lines at
`b5fe3b3`.
**Source:** delta-03 (F-8, register row 8).

### P3-13 · Spec 03 §0 GAP register (optional) — the NS-1 pointer row
**Revision:** Add one §0 pointer row: "NS-1 transport/render-clock coupling — design
queue, owner engine, see IMPLEMENTATION-PLAN S-engine (5)" so a reader of 03 alone sees
that the dual-transport BASE rows are coupled by undocumented app-owned glue (03 has zero
NS-1 mentions; consistent with the R27 "plan's job" ruling).
**Evidence:** engine `.agents/PLAN.md:464`; `.agents/HANDOFF.md:77`;
`nle-test-app/src/audioService.ts:450` (`lastScheduledTr`), `:585` (the composed law).
**Source:** delta-03 (F-9, register row 9 — optional).

### P3-14 · Spec 03 §0:16/:19 — the post-R31 app-lane pin-lag rider
**Revision:** Absorb at the next re-key (expected lane-cadence lag, not a spec error):
mirror → `39003d3` (2026-09-19, the M60 wave), nle-ui → `1e0c30b` (743/743, D52 part 1),
app → `b5fe3b3` 422/422 (R32-W3-a); OT HEAD past `31f2764`. The 31-verb / 28+3 registry
claim survives the move (verified at the `39003d3` mirror).
**Evidence:** `vendor/nle-timeline/UPSTREAM.lock.json` + `vendor/nle-timeline-ui/UPSTREAM.lock.json`
(upstreamHead `39003d3`, mirroredAt 2026-09-19); `headless/api.ts:243-275/:328-335` @
`39003d3`.
**Source:** delta-03 (N-2, register row 11 — NEW).

### P3-15 · Spec 03 §0:23 (the K3 playback-behavior corpus row) — unrecorded landed progress
**Revision:** Add a one-line progress note on the K3 row at the next re-key (landed: the
scrub-session family — "R31 Wave A, per docs/k3-map-timeline.md rows 47/42/10" — + the
K3 edit-verb families `engineService.test.ts` 31 tests over k3-map rows 19/8/4/11/10/16/34
+ `timeline-geometry` 38 + `history-laws` 15; remaining: the rest of the LAW-NET Part B
set) and drop the stale "with D30's W-C in flight" phrasing (W-C `f681d34` landed long
since).
**Evidence:** `scrub-session.test.tsx:1-2` (the header); the engineService describe
titles; the static recount in delta-03 N-1; `03:23`.
**Source:** delta-03 (N-3, register row 12 — NEW).

### P3-16 · Spec 08:18 + :1066/:1068 (§15A notes) + §15A rows :1077/:1081; 04:1203 (+ 04:1192's R27 re-anchor note) — the line-pin re-base
**Revision:** Wire strings `:1509/:1515` → **:1529/:1535** (`'gpu-power-window',` /
`'gpu-secondary-qualifier',` — 04:22 carries the correct pins; reconcile the two specs);
player `enabledEffects` `:1076` → **:2109**; mask-manager `invertNext` `:542-557` →
**:735**; lut.ts `:49` → **:48**.
**Evidence:** Read-verified at `e3f55bd`: `headless/api.ts:1529/:1535`;
`player.ts:2109` (`const enabledEffects = (clip.effects ?? []).filter((e) => e.enabled);`);
`mask-manager.ts:735`; `lut.ts:48` (the `rgba8:` comment; :49 is the `data: Uint8Array`
line).
**Source:** delta-04-08 (F-3, register row 3).

### P3-17 · Spec 08:16 (§0 mock counts) + :15 (the battery figure) — re-key BEFORE the r3 fixtures are cut
**Revision:** Re-key the mock reference counts (they size the r3 parity oracle):
surfaces ColorPage **50** / ScopesDock 22 / StillsPanel 19 / ColorInspector **16** /
GradedViewerCanvas **16** / mockGrades **24**; color-lib **172** (colorSpace 31 /
gradeMath 57 / qualifierMath 32 / scopesMath 20 / gradedImage 26 / index 6); and 08:15's
"1,521+ tests live" → the register-declared pair (**1,939 it-blocks / 68 test files** +
**1,950 runner-count / 126 stories**, the R28 WRAP re-key per REFERENCE-REGISTER.md:14 —
the "1521+" canon was retired at R27; 04:19 already carries the re-key).
**Evidence:** live recount of `ui-mock/shell-variants` (identical to the batch-1 reads —
the mock's color family did not move R29-R31); `REFERENCE-REGISTER.md:14`; `04:19`.
**Source:** delta-04-08 (F-4 + NF-2, register row 4).

### P3-18 · IMPLEMENTATION-PLAN.md:25 (S-spec row) + 04:23 (r3-row quote) — pointer/quote nits
**Revision:** Re-point "the color venue table (08 §0/§17.B …)" → "08 §0 GAP row 5 (the
grading venue law, 08:26)" (08 §17.B at `:1392` is still the FreeCut `curvesFragment`
shader quote), and refresh 04:23's verbatim plan quote to the current r3-row text (now at
`plan:71` — the D40 form "the grade-math binding + parity; the S-engine instruments
consumed (scopes/qualifier/power-window)", without "W4").
**Evidence:** `08:1392` vs `08:26`; `IMPLEMENTATION-PLAN.md:71` vs `04:23`.
**Source:** delta-04-08 (F-5, register row 5).

### P3-19 · Spec 04:16 (§0 BASE OT row) — the R29 re-key row itself lagged again
**Revision:** At the next re-pin: OT HEAD `3e18722` → **`31f2764`** (code pin `970948a`
UNCHANGED, docs-only — the spec's own R31 world pins this) + the app-mirror pin
`c15a629` → the lock's current declared head (**`39003d3`** at the R32-W3 app; 55c81c0
at the R31 battery's expectation — "c15a629" was already two generations stale at R31).
The structural claims hold (byte-exact lock-copy minus `testing/`; 632/632 at the pins).
**Evidence:** `scripts/rekey_r31.py` docstring + `battery_r31.py:781-782/:793-794`; the
app's `vendor/nle-timeline/UPSTREAM.lock.json` (mirroredAt 2026-09-19).
**Source:** delta-04-08 (NF-1, register row 6 — NEW).

### P3-20 · Spec 04:15 (§0 BASE engine row) — the vendor-submodule pins are stale
**Revision:** Re-key the engine vendor-submodule pins (OT `c15a629` + WDC `494f6ff` →
the current `55c81c0` + `83b8850`, or straight to the M60 pins `39003d3` + `94f6460`
now that the engine re-pin has landed) — the R24-era pins are two moves behind; expected
vendor pin-lag, but the row is a §0 BASE engine claim and was uncovered by batch-1.
**Evidence:** `ROUND-CONTEXT.md:59-60`; `battery_r31.py:790-791`.
**Source:** delta-04-08 (NF-3, register row 7 — NEW).

### P3-21 · Spec 05 §16.4 (:1232, the §11.2 row) — validates a struck model
**Revision:** Re-annotate as VENUE-MODEL divergence: "N12 struck the dedicated
`InOutPoints` model; the live law = the setLoop halves / OT `timeline.setLoopRegion`;
the engine's freecut-ported pair (`timeline.ts:7850/:7885`) is the venue-model
divergence; spec wins at the wire boundary" — drop the unqualified "ALIGNED".
**Evidence:** `timeline.ts:7850` (`setInPoint`), `:7885` (`setOutPoint`); zero `setLoop`
in the 8,997-LOC file; `05:728` (the N12 strike).
**Source:** delta-05 (F-6, register row 6).

### P3-22 · Spec 05 §16.5 (:1246/:1256/:1259/:1261/:1265) + §16.5A clause 1 (:1274) + §0 (:27/:30) — the unrefreshed anchor tail + the stale zero-runtime-dep premise
**Revision:** Mechanical re-anchor (or convert to export-name anchors): snapping
`:26/:51/:81`, zoom-utils `:89/:105`, waveform `:68/:152/:180`, placement `:419`, split
`:32/:43`, scene-to-segments `:67`, rippleMode `:240`, cancelRegistry `:762-764` — AND
qualify §16.5A clause 1's "zero runtime dep on OT" per 19:150's amended law (TYPE-ONLY
×4 + the 2 VALUE leaf deep-imports in `opencut-laws.ts:60-61`, OV-01/OV-02 — the
unqualified premise is stale on two counts).
**Evidence:** the true values re-verified at the @`55c81c0` lock-copies (unchanged into
M60); `bridge/opencut-laws.ts:60-61` (deep-imports `opencut-timeline/core/audio-params` +
`ops/retime` as VALUES); `19:72/:150` (the corrected in-corpus text).
**Source:** delta-05 (F-7, register row 7 — scope EXPANDED).

### P3-23 · Spec 05 §16.5A append row (:1286); §0:18; §8A close-out (:631-635); §16.5A fit-to-fill (:1288) — the R27 P3 tail
**Revision:** (a) Flip the append row to "insertBatch LANDED" (drop "r1" — §0:14 itself
records "insertBatch … LANDED one-history-entry-each"); (b) re-key LAW-NET Part A to the
register's sealed **105 families / 339 tests**; (c) add the ripple-neighbor composite
one-liner (view-ripple `:531`'s didactic push+pull composite); (d) carry the [0.01, 5]
carrier divergence (`RATE_MIN = 0.01` at `trimLaws.ts:32`) like the badge row does.
[R27 P3-11..14]
**Evidence:** `05:1286` vs `05:14`; shell-mini `docs/LAW-NET-INVENTORY.md:89-90` (105/339)
and `:4` ("the mini's corpus is sealed"); `shell-variants/src/lib/trimLaws.ts:32`.
**Source:** delta-05 (F-8, register row 8 — MUTATED: the data-test census half landed,
see appendix; these three items + the LAW-NET re-key stand).

### P3-24 · Spec 05 §16.5A clause 2 (:1275) + cross-spec 19:32 — the bridge-halves citation + 19's stale TL;DR
**Revision:** (a) Add one clause citing the landed bridge halves as the projector's
consolidation base (D-T6 `transition-inputs.ts:88-117` — "the SSOT home since the opencut
S-round … ONE input source for the audio pipeline"; OV-05 `composition-frame.ts:39-48` —
base/override, "the second authoring home is closed"); (b) re-base 19:32's §0A TL;DR
(still "vendors OT @ `6e2b91a` … the D-ARCH-6/s17 absorption **queued**" + "748/748 @
`f9ac806`" + "252/252, `c020b2a`" — an internal contradiction with 19's own re-based
rows).
**Evidence:** `bridge/transition-inputs.ts:88-117` (type-only OT import :70);
`bridge/composition-frame.ts:39-48` (type-only import :113); `19:32` vs `19:5/:13/:17/
:367/:390`.
**Source:** delta-05 (F-9, register row 9 — MUTATED: the 19 re-base applied at five
sites, the TL;DR residual stands).

### P3-25 · Spec 05 §0:30 (the D26.5 mapping row) + shell-mini `docs/LAW-NET-INVENTORY.md` Part C — the mini census basis is stale
**Revision:** Either re-key Part C (and 05:30's citation) to the live census — **85
static app-emitted testids / 29 templated families** vs the declared 60-static
(59 app-emitted + `mini-clip-harness` story-only) / 15-templated — or scope it explicitly
("the pre-miniplus surfaces — the src-stage/fade/transition/fx families ride a later
census layer") so the K3 three-way map does not silently treat the mini side as
enumerated (the presence-gate stays green — all 59 declared ids exist).
**Evidence:** python diff of Part C's declared list vs `rg data-testid="mini-…"` over
`ui-mock/shell-mini/src` (excl. tests/stories): 85 unique static; 26 in-tree-not-declared
(the src-stage family `mini-btn-src-*`/`mini-src-*` 13, the fade handles 4, the transition
family, `mini-btn-miniplus`, `mini-fx-add`, `mini-tool-radio`, `mini-track-solo`);
templated families 29 vs 15.
**Source:** delta-05 (NF-1, register row 10 — NEW).

### P3-26 · Spec 07 :4/:13/:25 + §12.A.1 preamble (:1150/:1154) — the mechanical re-key
**Revision:** Header "the bridge pins 97→113" → **151** (still the live count at
`e3f55bd`); `07:13` "458/458 vitest" → **749/749 @ `e3f55bd`** (63 files, 25 test
files); `07:25` "battery_r24's posture checks" → **battery_r31**; the §12.A.1 preamble's
"458/458 … 54,791 LOC (62 files) … in-between reference, NOT canon" → re-base + the D12
venue-model ratification framing.
**Evidence:** `bridge-seams.test.ts` = 151 `it(` / 33 `describe(` / 2,584 LOC (counted);
`src/lib/nle` = 63 files; `scripts/battery_r31.py` exists (as do r29/r30).
**Source:** delta-07 (F-6, register row 6 — MUTATED: the mock-row WRAP re-key applied,
see appendix; these items stand).

### P3-27 · Spec 07:14 (the OT row's LIVE HEAD statement) — the R31 corpus re-key missed 07
**Revision:** Re-key `3e18722` → **`31f2764`**, appending "(the R31 re-key
`3e18722`→`31f2764` docs-only — the R31 queue filing; the code pin `970948a` unmoved)";
the same sweep wave should catch `00-master:17` and `12-testing:14` (also still at
`3e18722`), and `rekey_r31.py`'s row-aware filter should treat a row's LEADING pin
declaration as LIVE regardless of trailing history parentheticals (its exit-0 was a
false negative). Material impact nil (docs-only; every 07 OT LAW cite is unaffected).
**Evidence:** `scripts/rekey_r31.py:15/:61/:103` (the OT bump, STALE_PATTERNS, the
masking filters); `rg -l 31f2764` over the corpus → the carrier set is 03/06/09/16/17/18/
IMPLEMENTATION-PLAN/LAW-NET-INVENTORY — 07 (and 00, 12) absent.
**Source:** delta-07 (NF-4, register row 10 — NEW).

### P3-28 · Spec 06 §0:47 + §10.4 blurb (:2569) — the pin-lag refresh
**Revision:** Optional refresh beyond P2-14's mandatory header fix: engine 458→749/749,
25 test files, 8,997 LOC, ≈96 public methods (the "~108 at `5036387`" is
approximate-count drift); the "three absent families" verdict still holds at HEAD
(verified — no track-state mutators, no NLE snap code, no splitAndRemove).
**Evidence:** round-context pin canon; `rg -c` test counts; the method-name-line count
(≈96).
**Source:** spec-06 (F-6, register row 5).

### P3-29 · Spec 06 §5.9F (:1672) + §11.7 (:2710) — OT-side dependency note (verification-routing)
**Revision:** No spec edit unless the OT check fails: `core/edit-domains.ts` /
`FIT_TO_FILL_RATE` is unverifiable from the engine workspace (the vendored OT checkout is
empty) — route to the OT-side auditor to confirm it exists at OT `970948a`/HEAD
`31f2764`; the engine-side §5.9F claims all verify (`calculateSpeed`
timeline-math.ts:133; rateStretch manual `rateStretchItem` :3840; no fit-to-fill op).
**Evidence:** `rg 'FIT_TO_FILL_RATE'` over nle-engine/src + nle-test-app → no hits;
`vendor/opencut-timeline` empty in the workspace.
**Source:** spec-06 (F-7, register row 7).

### P3-30 · Spec 09 §0 engine row + ACCEPTANCE ¶ — counts and one misattribution
**Revision:** persistence.test.ts is **P1-P7** (not P1-P4; P5 non-finite drop-verbs :262,
P6 HW1-1 transform sub-fields :302, P7 HW1-3 sourceFps repair :423); move
"`NLE_SCHEMA_VERSION`, `ProjectWarning`" into the persistence.test.ts parenthetical
(pinned at :31-32/:77/:90/:105 — V1-V7 pin the `NleRenderWarning` finders,
`load-validation.test.ts:39-50`); ACCEPTANCE "17-pin suite" → **20**.
**Evidence:** `rg -n "describe\("` both suites; `rg -c "it\(|test\(" persistenceService.test.ts`
→ 20.
**Source:** spec-09 (F-4, register row 4).

### P3-31 · Spec 09 §0 pins + Status header — the re-pin bundle
**Revision:** Re-pin at the spec lane's next round: app `b5fe3b3` **422/422** (22 test
files); OT lock-copy `39003d3` (M60); nle-ui `1e0c30b` 743/743; retire the
OT-standalone "docs-only over `970948a`" claim once the engine re-pin is recorded (M60
moved code; the engine's own `55c81c0` vendor remained a valid checking pin — all
§3.3A/census claims verified there).
**Evidence:** the app's `UPSTREAM.lock.json`; OT `ops/timeline-core.ts:2443-2546` (the
fromJSON block lands byte-for-byte even at `39003d3`); `headless/api.ts:243-275/:317-324`
(the 31 = 28+3 census).
**Source:** spec-09 (F-5, register row 5).

### P3-32 · Spec 09 §0 persistenceService BASE row — add the F3 hardening
**Revision:** At the next re-pin, add the both-doors hostile-input validator to the BASE
description (one clause): `isValidSceneShape`/`isValidSnapshot` (`persistenceService.ts:98-157`)
validate the inner scene/track/element shape AND the W2.5 grade sidecar at BOTH doors
(the Load file path AND boot `hydrateFromStorage`); all other row claims verified exact.
**Evidence:** full read of `persistenceService.ts` (410 LOC, 20 tests; identity-keyed 2s
debounce :5-14/:84-85; ⌘S :24-26/:260-263; beforeunload :350-356; module-scope boot
`App.tsx:41`); `rg -c "it\("` → 20.
**Source:** spec-09 (F-6, register row 6).

### P3-33 · Spec 10 §0 (:14, :16, §16 :2139) — drifted app citations
**Revision:** Re-pin on the next §0 re-key: mediabunny `package.json:23` → **:28** (the
"1.50.8 EXACT" version claim still true), `App.tsx:56` → **:57** (substance unchanged).
**Evidence:** `nle-test-app/package.json:28` (`"mediabunny": "1.50.8"`); `src/App.tsx:57`
(the app's own e2e-crawl :616 cites App.tsx:57).
**Source:** spec-10 (F-3, register row 3).

### P3-34 · Spec 10 §0 (:14) + §12.8 (:1531) — the container surface includes MOV
**Revision:** Say "…MP4/WebM/MKV + audio-only, decode-verified incl. pixel parity
(surface: **mp4/mov/webm/mkv** + mp3/wav/aac-ADTS; MOV is surface-only — its decode-verify
rides C-export-encode Stage 4)" — the current list is accurate as a decode-verified
claim but incomplete as a surface description.
**Evidence:** `settings.ts:33` (`ClientVideoContainer = 'mp4' | 'mov' | 'webm' | 'mkv'`),
`:58-73` (codec maps + defaults incl. mov), `:345-348` (`MovOutputFormat` with an Mp4
fallback); `index.ts:10` ("MP4/WebM/MKV/MOV"); `headless/api.ts:1840`; zero mov test
rows; `gaps/audit/C-export-encode.md:105` (Stage 4).
**Source:** spec-10 (F-4, register row 4).

### P3-35 · Spec 10 §16 Tier-3 note (:2167-2175) — the exportFCPXML wrapper needs its greenfield tag
**Revision:** Append to the Tier-3 note: "(greenfield — nothing here exists yet: no
`engine.export.*`, no `exportFCPXML` verb in any fleet engine; the note describes the r5
dispatch design, cf. 15 §4.3's greenfield tag. T3.2 'runs as written' = the test is
executable as specified once r5 lands.)" — as written, "runs as written" invites a
reader to execute a test whose subject does not exist.
**Evidence:** `rg -i fcpxml nle-engine` → 0; `15-wire-protocol.md:413` ("greenfield —
ExportManager, spec 01 §14.11") and `:324` ("FCPXML is r5 greenfield").
**Source:** spec-10 (F-5, register row 5).

### P3-36 · Spec 12 §11.1 (:856-860); 17 §9.3 (:1760-1763) — the PR-gate model diverges from the engine's flow
**Revision:** A one-line note at the next CI re-key: "engine gates are push-to-main +
dispatch (`ci.yml:17-24`); the PR-required-check model applies to the app repo only" —
benign under the single-maintainer push flow, but if PRs are ever used they bypass every
engine gate.
**Evidence:** engine `ci.yml:17-24` (`on: push: [main]` + `workflow_dispatch`; no
pull_request); app `ci.yml:3-7` (push+PR); `12-testing-strategy.md:856-860`;
`17-test-plan.md:1760-1763`.
**Source:** spec-12-17 (F-7, register row 7).

### P3-37 · Spec 17 §13A.7 re-tier row (:2385); engine api-surface.test.ts:21 — stale count literals
**Revision:** Routine re-key: "3-job CI" → the 4-job reality (the OV-12
`vendored-timeline` gate, `ci.yml:216-316`); the api-surface test's title literal says
"453 names" while the frozen list census is **455** (the gate body asserts live ==
frozen, so only the title drifted).
**Evidence:** `ci.yml:216`; `api-surface.test.ts:21`; python census of
`tests/vitest/engine/api-surface.frozen.ts:10-467` → 455.
**Source:** spec-12-17 (F-8, register row 8).

### P3-38 · Spec 15 §13.15, the insertBatch row (:5037) — the F3 placement law is the one D-ARCH-6 law not carried
**Revision:** Add the placement clause: "placement is REJECTED-NOT-SHIFTED — the block
lands as-requested on the first fitting track of the first element's type, else ONE new
track is minted for the whole block; intra-batch overlap **or placement failure** →
CONFLICT, whole-batch atomic (`api.ts:1368`)" — the wire's own type comment (:77-80) and
the app consumer (EngineMount.tsx:188-190) already name it, and OT's type comment cites
§13.15 for this law family.
**Evidence:** OT mirror `headless/api.ts:77-80` (the insertBatch doc comment), `:1330`,
`:1368` ("batch rejected — intra-batch overlap or placement failure"); app
`EngineMount.tsx:188-190`; F1/F2/F4 all verified carried and code-true (OT `:72-76`/
`:2361-2370`; §13.15:5036/:5037; §6.3:3028).
**Source:** spec-15 (F-2, register row 2).

### P3-39 · Spec 15 §4.1A, the element-toggle row (:304) — `muted` is mis-keyed as a top-level field
**Revision:** Re-key the parenthetical: "`hidden` is the top-level `ElementPatch` field
(`timeline-core.ts:141`, W8-d); `muted` rides the `params.muted` open-map key
(:1397-1437, M40); both applied through `updateElements` (:1384)" — the r1 wire-pair
disposition is unchanged (the row's substance holds).
**Evidence:** OT mirror `ops/timeline-core.ts:134-155` (`hidden?: boolean` at :141; NO
top-level `muted`), `:1397-1398` ("Mute lives in `params.muted` (classic patch
location)"), `:1437` (`{ patch: { params: { muted: shouldMute } } }`), `:1384`
(`updateElements`; cited :1344 — ~40-line drift).
**Source:** spec-15 (F-3, register row 3).

### P3-40 · Spec 15 §13.15, the table header (:5024) — the "@ 970948a" pin over-covers un-refreshed pre-R27 cites
**Revision:** At the next refresh, re-anchor (or date-stamp per-row, the way §13.14's
preamble discloses R7-era drift): SplitCommand :929→**:1598**; InsertCommand :558→**:1189**;
rippleDelete :1012→**:1681**; setLoopRegion :1273→**:1950**; §6.3's 6-code union
:153-167→**:218-225**; MoveCommand wire :52-54→**:41-42** — the laws in all these rows
remain true.
**Evidence:** reads of the OT mirror `headless/api.ts` at the cited positions (the
insert type verified at :57-63; the 6-code list verbatim at :218-225); the D-ARCH-6-touched
rows all EXACT at current upstream (the union :56-212, `WIRE_COMMAND_TYPES` :243-275,
lockstep :277-297, `WIRE_UI_EXCEPTIONS` :328-335, `applyBatch` :2559-2616, etc.).
**Source:** spec-15 (F-4, register row 4).

### P3-41 · Spec 15 §0 BASE rows (:14-16) — the routine re-pin
**Revision:** Re-pin at the lane's next cadence: OT `3e18722`/632 → (post-M60
`39003d3`)/649; app `c020b2a`/252 → `b5fe3b3`/422; engine `f9ac806`/748/57,064 LOC →
`e3f55bd`/749/57,377 — no claim invalidated at current pins (the census + all R27
anchors verified exact at `39003d3`; timeline.ts 8,997 LOC and the 455-name frozen list
verified).
**Evidence:** the app's `UPSTREAM.lock.json`; `wc -l` (timeline.ts 8,997; engine src
57,377); `rg -c '^  "'` on api-surface.frozen.ts → 455; sed reads at timeline.ts:3324/
3840/4956/5097/7350/7395/:2620 (all exact).
**Source:** spec-15 (F-5, register row 5).

### P3-42 · Spec 15 §13.14 preamble (:4998) — the vendor-pin chain stops one re-pin behind §0
**Revision:** Append the R29 note to §13.14's preamble chain (mirror §0:16's
`6e2b91a`→`55c81c0` discharge — "the D-ARCH-6 absorption of `970948a` LANDED … the
engine's queued next DISCHARGED"); a reader of §13.14 alone is one re-pin behind.
**Evidence:** `15:16` (the R29-era engine row) vs `:4998` (the R27 note still says
"absorption queued"); engine `tsconfig.json:36-41` + `vitest.config.ts:51-58` (the
importability posture — no engine test currently imports the headless wire itself).
**Source:** spec-15 (F-6, register row 6).

### P3-43 · Spec 15 §9.5 (:3557) + adjacent registers — three cross-lane nits
**Revision:** (a) File the one-word OT doc-comment fix upstream via the spec's OT queue
(`WIRE_COMMAND_TYPES`' comment says "the **30** wire command types" over a 31-entry
array, `api.ts:234`); (b) re-anchor the D44 charter's "SPLIT_INSIDE_TRANSITION …
**15:2884**" cite → **15:2971** (the registry entry; :2884 is the `CommandResultData`
fcpxml variant); (c) optional tense softening in §9.5 ("will be owned by nle-test-app's
`src/events/` adapter at w2" — no `src/events/` exists in the app today; the engine-name
half of §9.5 verifies exact).
**Evidence:** OT mirror `headless/api.ts:228-243`; `audits/ARCH-R28-seal-round.md:133`;
`ls nle-test-app/src` (no `events/`); `player.ts:182-198`, `orchestrator.ts:115+`,
`ops/timeline-core.ts:357` (the engine/OT event halves — exact).
**Source:** spec-15 (F-7, register row 7).

### P3-44 · Spec 16 §0:15 (the 27-row composition parenthetical) — the port-local pair is misattributed
**Revision:** Fix the composition: "(OT's 28 minus the 3 undo rows plus the **⇧L/⇧J
fixed-2× pair** — r/⇧R is the upstream W11 pair (OT :48-49), un-withheld at K2)" — 28 − 3
+ ⇧L/⇧J = 27; as written the parenthetical double-counts r/⇧R and contradicts §0's R5 row
(:29, which correctly calls ⇧L/⇧J "PORT-LOCAL").
**Evidence:** static row counts — app `use-keybindings.ts:37-81` = 27 rows (⇧L/⇧J at
:46-47 → `shuttle(±1, 2)` at :295-300); OT `use-keybindings.ts:35-72` = 28 rows incl.
r/⇧R at :48-49 and the undo trio at :69-71; spec 16 :15 vs :19 vs :29.
**Source:** spec-16 (F-4, register row 4).

### P3-45 · Spec 15 §13.5 (:4946) — the W6 cross-file sweep: "181 bindings" → 182
**Revision:** The W6 sweep: 15:4946 "181 bindings" → "**182**" (the D50 `Cmd+5` re-key;
Appendix A programmatically re-counted 182 `kbd-` rows across exactly 13 categories —
playback 22, tools 11, selection 16, editing 26, track 13, nudge 10, markers 5, view 19,
project 10, undo 3, effects 22, keyframes 20, help 5); no 16-side change (16:2352 already
acknowledges the lag).
**Evidence:** `sed -n '2167,2351p' | rg -c 'kbd-'` → 182; the per-category counts; Read
of `15-wire-protocol.md:4946`.
**Source:** spec-16 (F-5, register row 5).

### P3-46 · nle-core-spec `.agents/SPEC-REVISION-CANDIDATES.md` (:470-471, C45/C46) — the asserted retirement never executed in the register
**Revision:** Execute the retirement the R25/D34 amendment asserts (spec 16 :32/:263):
annotate or strike the keyboard-facing halves of the source-edit cluster rows (C45 the
7-mode source edit-function family, C46 the Source-transport insertion-mode cluster /
SourceEditBar chrome contract — both still ACTIVE gap rows under the "§I … authoritative
copy for the seal round" header at :452-453); the 18 §4.3 chrome-contract halves may
legitimately stay until 18 absorbs them — cross-stamp the 16-side ratification note
either way.
**Evidence:** Read of `SPEC-REVISION-CANDIDATES.md:448-478`; spec 16 :32/:263.
**Source:** spec-16 (F-6, register row 6).

### P3-47 · Spec 16 §0:15/:17 — the line-pin batch re-pin
**Revision:** Batch re-pin at the next §0 round (the R27 precedent — §17's header
maintains a drift ledger): C16 guard `use-keybindings.ts:220` → **:230** (comment block
:221-229); the 'r' yield rows `useShortcuts.ts:69/:85` → **:98/:114** (the D52 block
:81-95 inserted above; 'r' verified in both `engineOwnedPlain` and `shiftedYields`); the
port-census carrier count 5 → **9** (`docs/port-census.md:31`); (OT pin-lag) rippleMode
`TimelineView.tsx:237` → **:240** at M60. Substance intact on all four.
**Evidence:** reads at the current lines (cited above); the verified-exact set at the
current pins (the Z4 cites, the JKL rows :38-47, the ladder
`use-timeline-actions.ts:223-238`, the GluedShell pins).
**Source:** spec-16 (F-7, register row 7).

### P3-48 · Spec 16 §0:26 (the r1 GAP row) + §3.4B (:298) — optional inventory note
**Revision:** Optional note in §0's r1 row: the engine's native r1 twins pre-exist the
wire surface (slip `timeline.ts:4956`, slideItem :5097 — one history entry via the
`execute()` reentrancy fold :5117-5122, neighbor trims by construction, the linked
default `options.linked ?? true` :5133; roll :3324, rateStretch :3840/:7645, freezeFrame
:8652, the range-removal composite :8196+) — the wave is keymap rows + wire routing, not
op authoring; the slide span-preserved/one-history-entry pin is the queued acceptance leg
(today: slide-G3 clamps `timeline-mode-clamps.test.ts:376`, the nan no-op
`timeline-nan-guard.test.ts:120`, the locked-track gate `timeline-locked-track.test.ts:93`).
**Evidence:** reads of `timeline.ts:4956-5144`, `:3324/:3840/:7645/:8652/:8196`; `rg
'slide|slip'` over tests/vitest (the three files; zero span-invariant pins).
**Source:** spec-16 (F-9, register row 8 — r1-scheduled content, recorded as inventory).

---

## 4. Appendix — resolved by the R29–R31 waves (dropped APPLIED rows)

Batch-1 findings (or their applied halves, for MUTATED classifications) that the
R28-WRAP/R29–R31 waves already executed — no action; listed so the flip-list history
stays auditable:

1. **[01/02]** The R28 re-pin set — engine `e3f55bd` **749/749 / 25 vitest files**, OT
   `55c81c0`, WDC `83b8850`, "D-ARCH-6 absorption **LANDED** (executed, PLAN:481)", the
   §13B preamble re-key (`02:2350`), and the "@ `970948a`" internal-coherence nit —
   applied by the R29 re-key at `01:13`, `02:15`, `02:2350`. *(delta-01-02 F-3; residuals
   → P3-3/P3-6/P3-7.)*
2. **[03]** §0:19's consumer-pin note — rewritten at R29 to the post-D-ARCH-6 reality
   (mirror re-pin LANDED @ `876f2b8`; engine vendors OT `55c81c0` + WDC `83b8850`; the
   app engine pin byte-current) + the 749/749 per-suite recount (all seven numbers
   re-verified exact). *(delta-03 F-3 — fully APPLIED.)*
3. **[04/08]** The missing R9-c ruling state — carried at 08:24 as the R28 amendment
   (D45, the R9-c fold, RATIFIED as D29.5c's registered evolution), with its own cites
   verified exact (`ProgramCanvas.tsx:201-215`, `deliverService.ts:315-338`,
   `composition-frame.ts:257`). *(delta-04-08 F-1's applied half; the false Z2 clauses
   and the un-flipped 04 twin survive as P1-2.)*
4. **[05]** §0:16's vendor re-pin flip — "the s17 re-pin LANDED @ `876f2b8`" + the census
   re-declaration (42 = 36 zero-action + 5 carriers + 1 host @ `55c81c0`); the dead
   "filed queue" framing is gone. *(delta-05 F-5's applied half; the counts/roof
   enumeration + the missing R31 layer survive as P2-9.)*
5. **[05]** The data-test census half of the R27 P3 tail — §0:30's D26.5 paragraph landed
   and verifies EXACT at the current OT pin (70 `data-test` tokens = 69 DOM sites + 1
   selector reference in `use-keybindings.ts:121`, 59 unique names, zero `data-testid`).
   *(delta-05 F-8's applied half; the other three items survive as P3-23.)*
6. **[05/19]** Spec 19's engine-OT pin claims — re-based at `19:5/:13/:17/:47/:150/:230/
   :367/:390` by the R29 re-base (the D-ARCH-6/s17 absorption LANDED). *(delta-05 F-9(b)'s
   applied part; the `19:32` TL;DR residual survives as P3-24(b).)*
7. **[07]** The mock-row WRAP re-key — `07:16` now carries **1,939 it-blocks / 68 test
   files** + the declared pair **1,950 runner-count / 126 stories** (the prior 1,521
   called a superseded point-in-time figure). *(delta-07 F-6's applied half; the
   header/458/battery_r24/NOT-canon items survive as P3-26.)*

*Context (not a spec fix, but the ground shift behind P2-10/P2-11/P2-13): the D45 ruling
itself landed in the window — NS-4 RULED as the bridge adapter (ARCH-R28 §4), its test
law landed in 17 (`17:566/:2333/:2390`), and 00-master's D41 row now records
"D42-D45 rule the mechanism trio + NS-4" (`00:489`).*

---

## 5. Engine-side action items (NOT spec revisions — nle-engine work)

Ordered roughly by leverage against the round's testing bar ("ensure extremely robust
and exhaustive test process that can programmatically validate correctness of every
functionality"):

1. **The property-tier gap — land an engine-side randomized undo soak.** Zero
   property/fuzz carriers exist anywhere (no `fast-check` dependency; zero matches in
   `tests/` + `scripts/`); the closest reality is deterministic-exhaustive (probe-p114's
   318-check sweep over every wrapped mutator — covers every OP but never randomizes
   STATE). The undo-is-involutive / no-overlap / duration-preservation laws map to
   functionality that exists TODAY (the 61 `this.execute(` wrapped mutators,
   `timeline.ts`) and could be property-soaked against the class API before r1 — cheap,
   engine-only. *Source: delta-01-02 F-4 (register row 4) + spec-12-17 F-2 — both
   recommend it; the spec lane's counterpart edits are P2-1/P2-23.*
2. **Coverage measurement — land a ratchet floor (both repos) or accept the annotation.**
   The engine has no coverage tooling at all (no `@vitest/coverage-v8`, no coverage
   block in `vitest.config.ts:19-26` — the 749-test net's coverage of `src/lib/nle`
   (63 files / ~57,100 LOC) is unmeasured); the app instruments
   (`vitest.config.ts:29`) but sets no thresholds, so a coverage regression cannot fail
   any build. *Source: spec-12-17 F-6 (register row P2-27).*
3. **The perf/NFR family — needs an owner + phase (or an explicit deferral ruling).**
   Zero perf-envelope tests in any repo (no FPS/scrub-latency/memory/render-time
   assertions — only `durationMs` telemetry); no nightly venue in any CI (engine
   push+dispatch only, app push+PR only); the family is carried by NO GAP register. If
   not deferred, the engine work is the envelope tests themselves + a nightly/per-PR
   venue. *Source: spec-12-17 F-1 (register row P1-8).*
4. **The expected-failures project (the silent-green class).** A runner that silently
   swallowed assertion failures would pass every current gate; the
   negative-test-always-fails / self-run-suite / flake-rate-detector meta-tests are
   SPEC-ONLY (the carried halves: the WebGPU canary, the count-snapshot T6 pins, the
   app's census-mutation-gate). *Source: spec-12-17 F-5 (register row P2-26).*
5. **The D45-A2 engine-PLAN disposition re-file.** `.agents/PLAN.md:186-189` still reads
   "R9-c — the scene-grade promotion → DECLINED-BY-LAW … do NOT file the seam promotion",
   superseded by D45's ratification (ARCH-R28 §4); the PLAN block's own header (:171-174)
   says "The engine session executes." One-block disposition re-file, no code work —
   `paintCompositionFrame` correctly carries no grade param at `composition-frame.ts:483-487`;
   the `{grade}` seam param is r3 work per D45. *Source: delta-04-08 (F-1 + "Engine-side
   action surfaced by the delta").*
6. **Engine PLAN:481 — the D-ARCH-6 row is still unstruck.** The engine's own
   `.agents/PLAN.md:481-485` row is still "in flight" while the spec now records the
   absorption "executed" at the `e3f55bd` re-pin — queue hygiene for the next engine
   session. *Source: delta-01-02 (F-3 residual cross-note).*
7. **Engine PLAN E1 register — two stale entries + one superseded tag.** E1-a
   ("companion-track downstream does NOT ripple" — closed via Phase 2b `a1448ad`, pinned
   `timeline-edit-ops.test.ts:239-240`) and E1-b ("removeItems has the same gap" —
   closed via N3/F1c, pinned `timeline-locked-track.test.ts:299`) are stale at HEAD;
   E2-a's "spec-silent" tag is superseded by the D42.5 ruling. *Source: spec-06 (F-3/F-5,
   register row 6 — informational engine-side).*
8. **Engine PLAN NS-4 row — the hedge is superseded.** `PLAN.md:475-477` still carries
   "may be reshaped by that ruling"; D45 has now RULED NS-4 as the bridge adapter (the
   render-plan projector `project(scene) → TimelineData`) — re-file the row in the ruled
   form so the r1-port design round starts from the ruling. *Source: delta-07 (F-3).*
9. **Engine HANDOFF next-steps — stale.** `HANDOFF.md:64-78` still lists #2 "D-ARCH-6
   absorption" (landed R29) and #1 without the D45-ruled NS-4 form; the spec's §0 GAP
   readings key off this list. *Source: delta-07 (F-3).*
10. **The M60 re-pin follow-ups.** The OT/WDC re-pin wave (OT `39003d3` + WDC `94f6460`)
    landed per the round directive — the upstream analysis verified it moves ZERO
    engine-consumed bytes (`src/lib/timeline/` byte-identical across
    `55c81c0..39003d3`; the WDC bump docs-only; twin re-pin in ONE commit per the
    `e3f55bd` precedent; OV-12 expects 649/649 incl. phase 24 — one known pre-existing
    M58R shift-click-range flake, re-run once before investigating). Remaining
    follow-ups from its absorption plan: the pin-world bookkeeping (round-context +
    vendor-pin mentions), and the queue intake — the 5 upstream-expected engine-side
    seams (transport coupling, real-media peaks, thumbnails, SceneTracks→GPU, reschedule
    classification — OT `PLAN.md:693-697`), the r1-port design rows (OT
    `reviews/arch-design-s18.md:36-133`, D-S18-1..4, incl. the linkage model built from
    the engine's `linkedGroupId`/originId indexes and the `bridge/av-link.ts` closure),
    and WDC's async pre-retime design round WITH the engine (WDC PLAN standing queue =
    the engine's own G2). *Source: upstream-delta-m60.md (the absorption plan + queue
    intake).*

**Adjacent-lane flags (routed, not engine work):** (a) the app's census prose header
still says "@ `55c81c0`" at `port-census.md:13-14` while the lock/register say
`39003d3` — flag to the app lane (*upstream-delta-m60 §"Fleet state check"*); (b) the
app-side cross-note of P3-8 (01:14's R31 bracket) belongs to the app-slice agent
(*delta-01-02 N-3*); (c) the OT-side `FIT_TO_FILL_RATE` verification route (P3-29)
belongs to the OT-side auditor (*spec-06 F-7*).

---

*Consolidated from the 18 seal-round artifacts by the aggregation agent. Every file:line
cite above is preserved verbatim from the cited source report; where sources conflicted,
the delta (newer) report's reading was adopted. No other file was modified.*

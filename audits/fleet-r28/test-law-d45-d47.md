# R28-T2-b — the test law for D45/D46/D47 + the r1-port acceptance protocol

**Task ID:** R28-T2-b · **Agent:** test-law DESIGN (sub-agent, spec-side) · **Date:** 2026-09-16
**Tree (read-only, main):** `nle-core-spec` @ **`4b88f8d`** (verified: `git rev-parse HEAD`; working tree clean on `*.md`). Design lands in **12/17** (the spec-side test law) — NOT test code. Every landed-law cite below was re-verified live at `4b88f8d`.

**Inputs consumed (in order):** `test-scout-engine.md` (T1-a — the 21-pattern library; load-bearing here: **P2 parity-twin** "the duck the user hears is the duck the user exports", **P13 pure-math build/paint split**, **P12 ctx-stub call-order**, **P11 content-verified real-DSP FFT**, **P16 port-disposition census**, P1/P4/P5/P7/P8/P17/P20) · `test-scout-ot-wdc.md` (T1-b — **P-OT-3 the M49C four-layer gate** (the completeness law for new verbs), **P-OT-4 history-depth arithmetic + NOOP honesty**, **P-WDC-3 the null-test convention (nullDepthDb ≥ 60 dB) + P-WDC-4 the oracle self-test**, **P-WDC-10 the WSOLA domain guards [1/32,32] + exact-duration-no-tolerance**, **P-WDC-1 the Node-venue offline law**, **the M58 insertBatch law set as THE template**) · `test-audit-coverage.md` (T1-d — §2's D45/D46/D47 verdict rows + §3.1's five unconsolidated r1-port additions + §3.2's battery classes + §5's ranked fixes) · `ARCH-R28-seal-round.md` §4 D45/D46/D47 + §4.1 addenda (binding) · the landed law sites: **08:24** (the NS-4 bridge adapter + the R9-c fold + `{grade}` one-home), **06 §5.9C/D/E/F** (:1618-:1687, the four families' GAP rows), **15:5021-:5028** (the counterpart re-derivation + insertBatch ripple + the 79th/80th arithmetic), **15:14** (§0-BASE's 29→31 derivation), **15:4335-:4378** (the flat zod schemas), **16 §3.12** (:426-:447, the flat-form keymap rows), 06:3305 (the one existing D46 test row).

**The design's one sentence:** every ruled law below is expressed as a *pin family with a named oracle, a named venue, a named acceptance, and a battery check* — the spec-side statement the executor instantiates and 17 §14.4-step-0 can sweep.

---

## §0 The instantiation map (which pattern, where, for what)

| Ruled area | The load-bearing patterns (from the T1 census) | The venue law |
|---|---|---|
| **D45 projector** | **P13** (the render-plan translation as a pinnable data core), **P2** (monitor ≡ export at the grade seam), **P12** (the compose-then-filter ORDER from a call log), **P16** (the wrapper-retirement census), **P5** (the venue-blindness drift fence — the engine's own layer-fence shape) | Fast venue (vitest, pure data) for the projector + the string law; r3 for the fragment-pass parity (the CPU oracle vs the venue) |
| **D45 migration** | **P16 disposition** (every retired app-site filed), the DOM-attribute rendering contract (T1-c) | App-side jsdom (`data-grade` observable) |
| **D46 four families** | **P-OT-4 history-depth arithmetic** (ONE entry / NOOP honesty / depth-anchored rollback), **P3 table-loop + P4 no-commit trio** (error envelope), **P8 regression-pin-per-named-bug** (the mock's push-only bug, the RE-2 wrong-law bug), **P1 hand-derived geometry** (the delta/span arithmetic), **P-OT-3 M49C four layers** (the completeness instantiation), **P-WDC-3/4/10** (fit-to-fill's audio half), **P-OT-5 STATE-WYSIWYG** (gesture ≡ wire) | OT in-page milestone suites + real-mouse phases; WDC's Node OfflineAudioContext for the audio half |
| **D47 param trio** | **P-OT-4** (the batch laws — M58 verbatim), **P-OT-3 Layer-0 tsc lockstep** (the union bump), the schema sweep (17 §13A.4.1), **P17 freeze census** (the counterpart count as a derived census, not a hand-copied number), the keymap dispatch-coherence law (the emitted command is spec-15-valid) | OT in-page + tsc + battery (Python, spec-side) |
| **Cross-cut r1 protocol** | **P16 port-disposition** (the executor's recipe — every carried pin re-keyed, every addition filed), the ordering law (Stage 0→4), battery classes | The plan's r1 row + 17's new §13A.8 + battery_r28 |

---

## §1 D45 — the NS-4 bridge adapter (the SceneTracks-blind projector)

**The ruled law (owner sites, live @ `4b88f8d`):** 08:24 (the R28 amendment — the R9-c fold; `buildGradeFilterString` engine-side as the pinnable string law; the app migration registered) + ARCH-R28 §4 D45/§4.1 A1-A4 (NS-1 clock-agnostic confinement, NS-5's array-identity invalidation boundary, NS-3's media-resolution seam, the honest-skip list) + research-ns4 §5 (the ruled sub-variant a2: `project(scene) → TimelineData`, feeding Player.setTimeline/scene-assembly; the venue stack implements OT's `setTracks()/renderFrame(t)` over the projected IR; 07:91 "the renderer doesn't know about SceneState").

### 1.1 (a) The projector's unit suite — the render-plan translation

**Test surface.** One engine-side suite (the bridge family's, sibling to `bridge-seams.test.ts`) over the pure function `project(scene) → TimelineData` + the venue-stack consumption seam. The suite is the §13A.5 property family **re-instantiated on the render-plan projector** (17's existing four properties cover the D12 flat-seam projector; this row extends them to the visual twin):

1. **Deterministic** — same scene in, byte-identical `TimelineData` out (no timestamp/id-counter/wall-clock leakage). Fixture: the shared scene census (below), serialized twice, byte-compare (SHA-256).
2. **Idempotent** — `project(project(scene)) ≡ project(scene)` is vacuous for a one-way projector (nothing travels back), so the operative form is **stable-under-reprojection**: projecting the same scene content twice yields byte-identical IRs (id-counter discipline: the minted ids are deterministic given the same input — the `idSeed` law).
3. **Never-loss** — total element count preserved through projection, per track-kind, **including the honest-skip classes** (the sticker/graphic exclusion list from research-ns4's open list — the pin asserts the DOCUMENTED exclusions and ONLY those: every skipped element is a member of the filed honest-skip set; anything else dropping is a failure that NAMES the dropped member — the T1-c direct-diff law).
4. **No-readback (venue-blindness)** — TWO independent assertions, per the task's law:
   - **Dependency census (static):** the venue stack's file set (scene-assembly + Player + gpu-compositor + export — the frozen engine-internal list) imports ZERO SceneTracks-typed modules. Implementation shape: the repo's existing layer-fence pattern (`lint-layering.mjs` vs a snapshot) extended with a **poisoned-edge class**: any edge from the venue file set into the `09-project-model`/SceneTracks surface fails the fence. This is the engine's own demonstrated shape (52-edge snapshot + same-commit rationale law) applied as the venue-blindness law — a NEW edge can only land with a spec amendment (D12 clause 3's dual-home kill is the rationale the fence enforces).
   - **P12 call-order probe (dynamic):** the projector is fed a recording Proxy over the scene; the projected `TimelineData` handed to `setTimeline` is asserted to carry **no live reference into the scene** (mutate the scene post-projection ⇒ the held IR is byte-stable — the isolation law; the venue's later reads never touch the proxy's access log beyond the projection call itself).
5. **The invalidation boundary (NS-5's trap warning as law):** the venue's plan cache keys on **array identity** (`scene-assembly.ts:17-24`). Pins: (i) same tracks-array reference ⇒ NO reprojection (the plan-cache hit — asserted by a projection call-counter: the second render frame with the same reference makes zero `project()` calls); (ii) a NEW array reference with EQUAL content ⇒ reprojection DOES fire (the honest cost — the trap is per-frame reprojection, not value-diffing; the pin proves the boundary is identity, never content, never frame-count). The trap warning's fail-loud sentence copies the spec's own words ("reprojection only on array identity, never per frame" — 08:24's rider text).
6. **NS-1 clock-agnostic confinement:** the projector reads no playback state — feed the same scene at three different playhead/clock states ⇒ byte-identical IR (the never-reads family, P7-shaped).
7. **The translation laws (the bridge's twin-pinned visual semantics, P1 hand-derived):** a small authored scene ⇒ the projected IR's per-track ordering, z-order/visibility, transition descriptors, and tick arithmetic are **hand-derived on paper** from the bridge's documented laws (the anti-tautology law stated in the suite header verbatim — the timeline-math.test.ts:32-33 sentence). This is the P13 build-side oracle: the render plan is data, so the fast venue pins it without pixels.

**Fixtures.** One shared scene census used by properties 1-7: empty scene · single video track · A/V pair · 5-kind TrackType mix (the taxonomy warning fixture) · a scene with transitions at both edges of a clip · a scene with a documented honest-skip member (sticker/graphic) · hostile members (NaN durationSec source, negative start — the P7 fold: each carried with its explicit disposition — drop-the-poisoned-span, neighbors intact).

**Oracle instantiation.** Hand-derived IR expectations (P1) + SHA-256 byte-stability + the call-counter/proxy instruments (P12-derived). No pixels, no GPU — the whole family runs in the fast venue.

### 1.2 (b) The parity-twin at the seam (monitor ≡ export — the GRADE path)

**Test surface.** The P2 one-law-both-venues family, instantiated at the compose-then-filter final pass:

1. **The construction pin (the F-2 law verbatim):** the monitor path (ProgramCanvas) and the export path (deliverService) both consume the SAME `paintCompositionFrame(ctx, ops, media, {grade})` helper — asserted by the m2-wave1 shape: a wiring spot-check (P20) that both venues' call sites route through the imported helper, with the suite's own words: "a future 'fix' that re-inlines one venue's final pass trips THIS test."
2. **The {grade} object law:** both venues pass the SAME grade OBJECT (the one-home — the consumer-preview tier's single law home at the seam per 08:24's A3 rewording); the string mapping lives at the seam, never at either venue. Asserted with a recording ctx fake (P12): the captured filter string is derived INSIDE the helper, and the `{grade}` param captured at the seam is the object for both callers.
3. **The ORDER pin (the math law):** the ctx-stub call log shows clear → N composite `drawImage` calls (the scratch compose) → **ONE** filtered `drawImage` onto the target — the filter is applied exactly once, to the composited frame, never per-element. The per-element-filter discrimination: a fixture where per-element filtering would differ from composited filtering (two overlapping elements, a non-neutral grade) — the op list + the single filtered draw prove compose-then-filter.
4. **The neutral law:** grade {1,1,1,0} ⇒ filter string `''` ⇒ the direct paint path (ZERO filter assignments in the call log) — the W2.5 no-op law carried to the seam.
5. **Monitor ≡ export content:** in the fast venue this is the param/plan-level equality above; the pixel-level equality (the true "duck" law) is the r3 fragment-pass parity (1.4) + the slow venue. The spec row states the split honestly (12 §5's mechanics homes consume it).

**Fixtures.** The same scene census as 1.1 + the grade census: neutral · contrast-only · mixed non-neutral · the neutral-vs-'' boundary (grade 1/1/1/0 vs absent — both must yield the direct path).

**Oracle instantiation.** P12 ctx-stub call-order (the recorded call log IS the oracle) + the P20 wiring spot-check. No pixels.

### 1.3 (c) `buildGradeFilterString`'s own pins (the honest CSS subset)

**Test surface.** One engine-side unit suite over the string law (the `buildElementFilterString` precedent, `bridge/composition-frame.ts:257` — canonical order, neutral `''`, identity passthrough):

1. **The canonical-order table (P3 table-loop, one row per grade shape):** {contrast:2} → `'contrast(2)'`; {contrast:2, saturation:0.5} → `'contrast(2) saturate(0.5)'` (the fixed component order); hue 90 → `'hue-rotate(90deg)'` (the unit law); every expected string **hand-derived**, never built by the module under test.
2. **Neutral law:** all-neutral ⇒ `''` (the empty string, not a chain of identity functions); each neutral component omitted individually (identity passthrough per component).
3. **The invalid-CSS no-op guard (P7 hostile fold, disposition pinned per field):** NaN / ±Inf / negative where CSS forbids (brightness < 0, saturation < 0, contrast ≤ 0's domain) ⇒ the poisoned component is DROPPED (the honest-subset disposition: the remaining valid components still apply; never a thrown error, never an invalid filter string reaching ctx). The disposition itself is the pin: which of drop-component/drop-all applies per field, stated in the table.
4. **The per-element save/restore bracket:** at the raster side, the filtered draw is bracketed — `ctx.filter = s; drawImage; ctx.filter = 'none'` — asserted from the P12 call log: the filter assignment never leaks into a subsequent unfiltered draw (the bracket's closing assertion).
5. **The honest CSS subset as a closed set (P17-shaped):** the filter-function vocabulary the seam may emit is frozen {`contrast`, `saturate`, `brightness`, `hue-rotate`} (grade path) + {`blur`} (the element-effects sidecar path, the R9-d honest subset — Gaussian Blur → `blur(px)`, the R8-REV radius clamp carried). The suite pins the closed set: a new function joining the string builder without a spec row fails the census (the emitted-set == the frozen set — derived from the builder's own output over the full input census, not a hand-copied list).

**Fixtures.** The grade census grid: interior values · both bounds · the neutral identity · the hostile family (NaN/±Inf/negative/zero) · the blur-radius family (0, clamp boundary, above-clamp — the existing bridge-seams clamp pin extended to the string site).

**Oracle instantiation.** P1 hand-derived string literals + P6 constant-literals (the canonical order + the unit forms as literals) + the P12 bracket log.

### 1.4 (d) The r3 fragment-pass parity (the venue's grade home)

**Test surface.** The venue's grade home stays 08's r3 fragment passes over the scene-linear `rgba16float` working texture (08:26 the grading venue law). The parity corpus — already ruled in the plan ("grade-math parity pins — the mock's W4 math vs the engine's output on the SAME shared fixtures, max delta ≤ 1 LSB-equivalent") — is specified as:

1. **The shared fixture family:** deterministic synthetic frames (the 12 §4 asset families: solid, gradient, the edge family) × the grade census (wheels' 14-step order, the curve-LUT hop, a 3D LUT, the qualifier, the power window — one fixture per §17.B pass) — one fixture set, both sides pinned on it, never forked (the §5.3 committed-asset rule).
2. **The comparison metric (the acceptance):** max per-channel delta in 10-bit code values ≤ **1 LSB-equivalent** (the 8-bit→10-bit correction is the binding's substance — the metric is pinned as a literal, P6); SHA-256 bit-exactness for same-input re-renders per side (determinism before parity).
3. **The oracle self-test precondition (P-WDC-4, adopted as law):** the comparison instrument itself is proven against closed forms BEFORE any parity claim (a known identity grade ⇒ delta exactly 0; a known ±1-code-value perturbation ⇒ the metric reads exactly 1) — "treat failures here as instrument failures, not test noise."
4. **The sequential-pass law ([clipGrade] → [timelineGrade], 08:25):** later passes see earlier output — the discrimination pin: a fixture where A∘B ≠ B∘A; the pin FAILS under a params-merge "optimization" (the merge collapses the order and produces the wrong output on the discriminating fixture). Plus the CPU oracle (the mock's `src/lib/color/`, the spec-08-exact math, 170 dedicated tests) remains the parity oracle — the mock is the reference, never the production venue.
5. **The venue-blindness carry-over:** the fragment passes read the working texture, never SceneTracks — the same 1.1 dependency-census class covers the grade-pass file set.

**Fixtures.** The shared fixture family above; the discriminating non-commutative pair hand-derived (two grades whose order visibly differs in ≥1 code value).

**Oracle instantiation.** The mock's CPU math as oracle + the closed-form instrument self-test + the ≤1-LSB literal.

### 1.5 (e) The app-side migration test (ProgramCanvas + deliverService → `{grade}`)

**Test surface.** The app-side migration registered at 08:24 (lands with the seam, r3):

1. **The call-form pin:** both venues pass the `{grade}` object through the seam (a recording fake at the seam captures the param shape — the object, not a pre-built string).
2. **The retirement census (P16 port-disposition, every retired site honestly filed):** the app's two wrapper pairs (`ProgramCanvas.tsx:201-215` monitor / `deliverService.ts:315-338` export, the Z2 cite whole `:299-338`) + the app-side string mapping (`ProgramCanvas.tsx:91-94`) retire — the disposition table files each site PORTED-to-the-seam (with the covering pin's cite) or DELETED-with-pin; the census asserts ZERO remaining app-side final-pass homes (a grep-level closed-set check pinned as a test — the string mapping exists at exactly ONE home, engine-side).
3. **The Z2 closure pin:** the monitor↔export grade divergence closes THROUGH the seam — the monitor grades and the export grades, one law (the 1.2 parity pin re-run post-migration; the pre-migration form — export ungraded — is the pin's documented pre-fix damage, P8).
4. **The DOM observable carries:** the jsdom pin surface stays `data-grade` (the W2.5 convention — the app-tier DOM-attribute/string rendering contract, T1-c's law): the rendered canvas carries the grade marker; the persistence round-trip (the sidecar both ways) is already BASE-pinned and re-keys to the seam without behavior change (the no-op migration check: pre/post-migration app snapshots identical).

**Fixtures.** The app's existing W2.5 grade fixtures (the sidecar round-trip set) + one non-neutral monitor/export pair.

**Oracle instantiation.** The recording seam fake + the disposition table + the DOM attribute.

### 1.6 D45 acceptance pins · phase+owner · battery check

**Acceptance pins (the named set 17's facet row carries):** the four projector properties + venue-blindness (two-assertion) + the identity-boundary pair + clock-agnostic + the translation table · the construction pin + the {grade} object law + the ORDER pin + the neutral law · the canonical-order table + the hostile guard + the bracket + the closed-set census · the ≤1-LSB parity family + the sequential discrimination + the instrument self-test · the call-form pin + the retirement census + the Z2 closure pin. **Pin-count estimate: ~55-65** (projector ~22 · parity twin ~6 · string law ~14 · r3 parity ~10 · migration ~6) + the two non-behavioral fences (the layer-fence poisoned-edge class; the api-surface freeze re-key for the projector's exports).

**Phase + owner:** the projector unit suite = **r1-entry** (NS-4 is THE r1-entry architecture decision — S-engine; the 17 row lands with battery_r28 as the facet row, S-spec). The R9-c seam + `buildGradeFilterString` + the app migration + the fragment-pass parity = **r3** (the color venue work — S-engine for the seam/string/parity, S-app for the migration, S-spec for the rows). The venue-blindness fence can land as soon as the adapter lands (r1).

**Battery check:** battery_r28 gains the **D45 class** — (i) the §13A.5-extension presence check (the render-plan projector's four properties + the two-assertion venue-blindness named in 17); (ii) the parity-oracle row presence (the ≤1-LSB acceptance + the shared-fixture law named in 12 §5/§6's mechanics homes); (iii) at the r1/r3 landings, the suite-count re-derivation at the landing pins (the runner-count law — never grep).

---

## §2 D46 — the four absent families (replace / append / fit-to-fill / ripple-overwrite — INCLUDE ALL FOUR)

**The ruled law (owner sites, live):** 06 §5.9C-F GAP rows (RE-1/RE-2 :1622-:1623, AP-1/AP-2 :1641-:1642, RO-1/RO-2/RO-3 :1661-:1663, FF-1/FF-2 :1681-:1682) + ARCH-R28 §4 D46/§4.1 B2-B5 + the plan's r1 row Stage ladder (Stage 1 trim → Stage 2 source-edit → Stage 3 composites (append → fit-to-fill → ripple-overwrite) → Stage 4 replace + wave-2). **The leverage map's parity verdicts:** the trim family is engine-complete (Stage 1); insert-edit/overwrite engine-complete (Stage 2); the three composites ride LANDED verbs (Stage 3); **replace is greenfield** (Stage 4 — the engine op is corpus-designed, not a port).

### 2.0 The per-family design template (the M58 law set — one shape, four instantiations)

Every family lands with the **P-OT-4 observable set** (history-depth arithmetic as the canonical edit-semantics observable):

- **ONE history entry** per committed op/composite (`assertEqual(core.historyDepth(), 1)` after the op on a fresh fixture; `historyDepth() === 0` before).
- **NOOP honesty:** a true no-op creates NO entry ("phantom history entry" is the named failure mode); a benign echo is `ok:true` + `changed:false` (the D44 A8 family — never a refusal code).
- **Side-effect-freedom trio (P4):** on every rejection — the end-state reference is THE SAME object (`expect(tl.data).toBe(before)`) + `canUndo()` unchanged + the wire result's code.
- **Error codes:** each family's ruled code set (below) triggered by ≥1 test each — the verb × condition × exact-code table (P3 table-loop, one `it()` per row).
- **The shared validator:** per-member validation through ONE writer (the insert family's `validateInsertElement` law — replace's params validate through the same element-field law).
- **Atomicity where composite:** depth-anchored rollback, redo preserved (F1B-7), undo/redo-in-batch rejected, `data.results` per-member echo (the minted refs).

### 2.1 Replace (§5.9C — Stage 4, the greenfield dedicated op)

**(a) OT-side port acceptance (the M58-style law set for `timeline.replace`):**
- **The law set:** ONE `execute` = ONE undo entry; the A9-style honest echo (`data: {insertedClipId, removedClipId, durationInFrames, sourceEnd}` — the UI toast's source, pinned field-for-field); errors `NOT_FOUND` (no target) / `TRACK_LOCKED` / `INVALID_PARAMS` (the unfillable-source refusal — a marked range shorter than the target with no source handles, 06:1615) — each with its trigger row + the no-commit trio; **`NOOP` never** (a same-source replace still minted a new id — the no-NOOP law pinned: a degenerate replace commits, one entry, changed ids).
- **The Tier-1 pin set (RE-1's own acceptance):** exact-length (the placed duration == the target's duration — the source window trimmed to fit EXACTLY; the discrimination: an own-duration placement fails — RE-2's named bug); no-move (nothing downstream moves — the anti-ripple pin, downstream starts byte-identical); undo atomicity (one undo restores the exact pre-state, serialized compare); transition survival (below); companion untouched (the companion keeps position + duration; the new clip carries no link — the sever law; the naive-composition trap — `removeItems`' default-true linked expansion would DELETE the companion — is the pin's documented pre-fix damage, P8); **the `linked:false` DEFAULT pin (its own row — 06 RE-1's acceptance names it as a law, D31.4/rider 7)**: a source WITH a companion still lands UNLINKED — the sever is the DEFAULT disposition, never an opt-in; the pin discriminates default-vs-option (an implementation that links-by-default when the flag is omitted, or that requires an explicit `linked:false` to sever, fails — the omitted-flag landing must equal the explicit `linked:false` landing, the engine signature's own `{linked:false}` form).

- **The transition endpoint REMAP (the joinItems pattern) not cascade-drop:** a target with transitions at both edges ⇒ after replace the transitions' endpoints REMAP to the new clip's edges (survive, re-addressed), never dropped. This is the pin the PROBE (2.5) gates on.
- **The keyframe-prune law:** the `_commit` keyframe-prune verified — the removed clip's keyframes pruned, zero `KEYFRAME_ORPHAN` warnings, no orphans in the serialized state.
**(b) The engine-side parity twin:** replace is greenfield — `performReplaceEdit(trackId, targetClipId, sourceId, sourceStart, {linked:false})` is a corpus-designed op in the freecut style (RE-1's owner line). The twin law: the engine op is the algorithm source + the offline reference; the OT port's Tier-1 pins run against BOTH on the shared fixtures (the D12 parity-twin role — the engine-authored state vs the OT state, ignoring minted ids, the P-OT-5 WYSIWYG idiom). The pin set is authored OT-side FIRST (the family's acceptance lives at the wire), the engine op lands as its oracle.
**(c) The transition-remap probe — designed below (2.5).**
**(e) M49C instantiation:** replace mints the **80th** union member ⇒ Layer 0 tsc lockstep fails typecheck until listed in `WIRE_COMMAND_TYPES` ⇒ the M49C gate goes RED until UI-routed (the SourceEditBar one-shot + F11 at r1 — the drop-on-clip gesture is K3+) or exception-registered with its one-line law. The census count pin re-keys mechanically (D29-F8). The exception candidate is registered ONLY if the button lands after the verb: the interim law names the K3+ gesture gate.
**(d) WDC-side:** none direct (replace is not a retime family) — the audio half rides the element's existing strip semantics; no new WDC law.

**Fixtures.** The E1-c-class fixture set: target with transitions both edges · target + A/V companion · unfillable source (short marked range, no handles) · locked target track · same-source degenerate · a downstream element at a coincident boundary (the no-move discrimination).

**Oracle instantiation.** P1 hand-derived geometry (exact lengths, echo fields) + P4 no-commit trio + the serialized-state compare (P10).

### 2.2 Append (§5.9D — Stage 3, riding the LANDED insertBatch carrier)

**(a) OT-side port acceptance (AP-2's M16-class pins):**
- **Append-at-track-end:** `t₀ = max(0, max(startTime + duration))` per-track (hand-derived on a fixture with interior gaps — the per-track NOT timeline-content-end law: an interior gap's tail still bounds t₀); **empty track ⇒ 0**.
- **Playhead-ignored:** a mid-timeline playhead ⇒ byte-identical landing (the op reads neither `currentTime` nor pointer time — the pin FEEDS a playhead and asserts invariance; the playhead does not move).
- **Multi-append order + one-entry:** `t_{i+1} = t_i + dur_i` — append points evolve INSIDE the op, never pre-computed as N × t₀. The discrimination fixture: three clips with distinct durations; the per-clip starts hand-derived; a pre-computed implementation would either collide (the intra-batch overlap guard rejects) or mis-place — the pin's numbers name it. ONE history entry for the whole multi-append.
- **The linked-append law:** a video source with audio lands the A/V pair at the SAME startTime = the video track's append point (NOT the audio track's own content end — the desync discrimination: a fixture where the tails diverge); existing audio content at/after that point ⇒ the WHOLE append refuses atomically (reject-not-shift — never a partial pair).
- **F1A-3 kind-split:** a mixed pool selection splits into per-kind batches (one per target lane); **TRACK_LOCKED** refusal; **never-a-push:** nothing is downstream by construction — the ripple parameter is inapplicable **BY LAW** (fixed false): the schema-level pin — the append strategy admits no ripple flag (zod-rejected or schema-absent; the right-arrow grammar token forbidden for this mode — the visual-grammar row).
- **The insertBatch batch laws ride free** (homogeneity, dedup, atomicity, ONE entry — 2.0's set).

**(b) The engine-side parity twin:** append rides `insertElements`' relative-offset batch (the primitive exists) — the twin: the engine's insert path vs OT's append resolution on the shared fixtures (the accumulated-offset law is insert's own; the engine's E1/E2 carried corpus is the acceptance base).
**(e) M49C instantiation:** NO census change — `insertBatch{placement:'append'}` counts toward insertBatch's slot (the carrier); the optional `timeline.append` wrapper follows the `rippleDelete` census convention (a routed wrapper re-declares mechanically IF minted — the pin set stays silent otherwise, the honest absence).
**(d) WDC-side:** none (append is not a retime family).

**Fixtures.** Track with interior gaps · empty track · mixed-kind pool · A/V pair with divergent tails · audio content already at the append point · locked track · playhead mid-timeline.

**Oracle instantiation.** P1 hand-derived accumulated starts + P4 + the depth arithmetic.

### 2.3 Ripple-overwrite (§5.9E — Stage 3, the delete→move→insert composite)

**(a) OT-side port acceptance (RO-1's ruled law set):**
- **The delta law (P1 hand-derived):** `delta = newDur − oldDur`; push if positive, **PULL if negative**; the source lands at `t.start` with its OWN duration; every downstream element on the target track (`startTime ≥ span.end` + transition-right-neighbors of removed clips) shifts by delta; upstream untouched; total length changes by delta; ONE atomic undo.
- **The pull discrimination (RO-3's required test — the named-bug pin, P8):** a SHORTER source ⇒ full replacement + LEFT shift + NO GAP (`firstDownstream.start + delta == source.end`, hand-derived). The mock's push-only bug (`delta = dur − displaced ≥ 0` by construction; a shorter source head-trims — plain-overwrite behavior) is the documented pre-fix damage; the pin's fixture reproduces the audit's probe. Pre-existing gaps elsewhere preserved verbatim (the law scopes to the edit's OUT boundary).
- **The order law:** delete → move → insert keeps every intermediate state overlap-free — the F1A-2 intra-batch guard passes **by trajectory**. The discrimination pin: the same three ops in a DIFFERENT order (insert-first) is overlap-rejected — the order is load-bearing and pinned as such.
- **The zero-floor law:** a pull that would cross the track head floors at 0 or REFUSES (the honest refusal — the code + the no-commit trio).
- **Transitions drop:** the target's transitions die with it; the incoming clip enters bare; the moved downstream forms a hard cut at the OUT side (the same law `performOverwriteEdit` applies).
- **The companion law:** the removed set's companions cascade; the move set applies to BOTH tracks' linked sets at the same delta; sync-locked tracks take §6's propagation (removed-interval on pull, inserted-gap on push); the incoming clip enters unlinked.
- **The law-split pin (RO-1's ruled sentence):** `insert{ripple}` = push by the FULL inserted duration; `ripple-overwrite{ripple}` = shift by delta — **one boolean cannot mean both**: the two-fixture side-by-side (same scene; the numbers differ by exactly `oldDur` — hand-derived; a merged-semantics implementation fails one of the two).

- **The downstream-set diff check (the E1-a condition restated as B2 — THE design point):** the shifted set is **COMPUTED as the diff, never hand-listed** — the pin asserts `shiftedSet == {elements on the target track with startTime ≥ span.end} ∪ {transition-right-neighbors of removed clips}` EXACTLY (a direct array diff that NAMES any wrongly-shifted or wrongly-skipped member — the T1-c law): an upstream element ending exactly at span.end must NOT move; a transition-right-neighbor must. This is the E1-a derivation risk turned into the pin's own oracle.
- **The batch laws** (2.0's set — the composite's ONE entry, rollback, redo-preserved).

**(b) The engine-side parity twin (RO-2):** the engine's signed-shift machinery is private (`rippleTrimItem` :2925-2950 + both sync-lock propagations :3475/:3534) — the composite lands as pure OT-side functions with **the carried engine tests** (the port acceptance: the engine's ripple/trim corpus green in OT after the port); the twin: the composite's delta arithmetic vs the engine's ripple machinery on shared fixtures (the engine = the offline reference that pins the port, D12).
**(e) M49C instantiation:** NO census change (its three constituent verbs are routed TODAY — the composite is available at crawl over `applyBatch`); the verb decision (the dedicated `timeline.rippleOverwrite` OR the replace-placement delta-law ripple param) — if minted, the census re-declares mechanically; the law-split row (above) is the pin that keeps the two semantics distinct whichever form lands.
**(d) WDC-side:** none direct (the composite's audio half rides the element retime defaults) — the shift arithmetic is timeline-side.

**Fixtures.** Longer-source push · shorter-source pull (the discrimination) · pre-existing interior gaps · zero-floor crossing · transitions both edges · companion + sync-lock tracks · upstream element ending AT span.end (the diff-check boundary) · the law-split pair.

**Oracle instantiation.** P1 hand-derived deltas + the computed-diff set oracle + P4 + depth arithmetic + the serialized undo round-trip (P10).

### 2.4 Fit-to-fill (§5.9F — Stage 3, the insert + `updateElements{retime}` composite)

**(a) OT-side port acceptance (FF-1's ruled pin set):**
- **The speed law (P1):** `speed = markedDuration / targetDuration` — a LONGER marked range into a SHORTER span speeds UP (speed > 1, hand-derived on a 2:1 fixture); the result's timeline duration == `snapToFrame(targetDuration)` **EXACTLY** (no tolerance — a clamped fit silently violates exact-fill); the source window == the FULL marked range (never re-trimmed; the rate change IS the edit — the pin asserts `sourceStart == markedIn` and the window length unchanged).
- **The acceptance domain [0.1, 5] (the LIVE three-way intersection, D43.10):** out-of-domain REFUSES `INVALID_PARAMS` — **never clamps**. The computed-intersection property: `FIT_TO_FILL_RATE == [MIN_RETIME_RATE, MAX_RETIME_RATE] ∩ NATIVE_VENUE_SPEED ∩ WSOLA_RATE ⇒ [0.1,5]`, AND **refuses correctly when WDC narrows** — the property that kills static text: mutate the WSOLA bound in a fixture ⇒ the computed intersection narrows ⇒ a formerly-accepted rate now refuses (the AUTHORING_SPEED [0.1,4] trap pinned as the negative: substituting nle-ui's rail yields a silently narrower domain — the mini mock's C3 bug must not promote). The domain-boundary rows: 0.1 and 5 accepted and exact; 0.05 / 5.5 refused; the 0.01-0.1 band refused for fit-to-fill (engine-clamp-unsafe) while the generic retime module keeps [0.01,5] — the domain-split pin (FF-2's cross-reference).
- **The refusal law:** out-of-domain → INVALID_PARAMS; unmarked source → the honest info refusal; each with the no-commit trio.
- **The mock's 37 per-mode pins re-expressed OT-side:** the mode-matrix row family for fit-to-fill (per-mode ghost/landing/displaced assertions — the OT-side expression of the variants' planner pins).
- **The A/V pair sync pin:** the linked companion gets the SAME computed rate and the SAME target duration — ONE commit, never two calls (the pair lands as ONE `applyBatch`; video consumes the rate in `timelineToSourceFrames`, audio in `varispeedRate = segRate × transportRate` — the one-law-both-streams pin); ±1-frame tail drift between the streams is quantization residue, not an error (the tolerance stated).
- **Placement:** overwrite-style into the span (covered clips split/trim per §5.9B); NO downstream movement; the selection is not cleared (the family law — pinned).
- **The badge law:** one decimal, lowercase x — "1.7x" (the display form, pinned at the UI row).

**(b) The engine-side parity twin:** the pure law exists engine-side (`calculateSpeed`, timeline-math.ts:133) + OT's inverse (`getTimelineDurationForSourceSpan`, retime.ts:51); the engine reference is the 3-point family overload (`performOverwriteEdit` with `targetDuration`). The twin: the composite's computed rate vs the engine's `calculateSpeed` on the same 4-point fixtures (round-trip: `speed → getTimelineDurationForSourceSpan → duration` recovers `targetDuration` exactly — the inverse-law pin).
**(e) M49C instantiation:** NO census change at r1 (both constituent verbs routed; the composite is available at crawl); a first-class verb is OPTIONAL at r2, NOT r1 — if minted, the census re-declares mechanically (the row stays honest-absent until then).
**(d) The WDC-side retime laws (the audio half — the ruled acceptance):**
- **The null-test on untouched lanes:** fit-to-fill retimes ONE lane; every OTHER lane renders `nullDepthDb ≥ 60 dB` vs the pre-op render (indistinguishable — the AES null-test convention, the W-F3 threshold family; the oracle self-test is the precondition — P-WDC-4 adopted verbatim); the retimed lane's `onsetDeltaMs` pinned (shifted content lands where the arithmetic says).
- **The exact-duration-no-tolerance law:** the retimed audio's output length == `round(frames / rate)` EXACTLY at the accepted rates (the F1 flush law — a no-flush regression drops ~90ms at rate 2; the internal sizing law `flushPadFrames ≥ inputChunkSize` pinned as the regression catcher).
- **The pitch oracle (goertzel):** 440/660 Hz survive the retime (bin > 0.4) while the chipmunk frequency (input × rate) stays < 0.05 — no pitch shift on any accepted fit.
- **The [1/32, 32] domain guards:** the empirically-fatal out-of-domain rates (1e-6 → spin; >1e5 → 350GB OOM) degrade to IDENTITY — never spin, never throw; the DOMAIN BOUNDS work exactly (rate 1/32 → ×32 length; rate 32 → ÷32).
- **The venue law:** all rendered through the Node `OfflineAudioContext` (the `web-audio-api` package — real DSP in CI, zero devices, P-WDC-1); per-test 30s timeouts (never global), serial workers (the ~1.8GB lesson).

**Fixtures.** The 4-point census: 2:1 speed-up · 1:2 slow-down (domain-refused if outside [0.1,5] — a 1:3 slow-down REFUSES, the honest law) · boundary rates 0.1/5 · just-outside 0.05/5.5 · unmarked source · A/V pair · a multi-lane scene (the null-test fixture: one lane retimed, N lanes untouched) · deterministic sines at 440/660 Hz.

**Oracle instantiation.** P1 hand-derived rates/durations + the goertzel/FFT content oracle + the null-depth metric family + the closed-form instrument self-test.

### 2.5 (c) THE TRANSITION-REMAP PROBE — the two-exit protocol (the missing spec home, designed)

**The ruled protocol (ARCH-R28 §4.1 D46-B2):** a time-boxed OT spike at Stage-4 entry; two exits — (A) a pinned `transitionOut` endpoint-remap test green ⇒ replace proceeds; (B) the redesign verdict filed as a new D-entry ⇒ the cut fires (the registered deferral lever).

**The design (where it lands + what the law says):**
1. **The spec home — a PROBE row in 06 §5.9C's GAP set (the new RE-3), mirrored by ONE 17 §13A.7 facet row.** The row's shape (Decision 30.2 posture form): | RE-3 | the transition-remap probe: replace's transition-survival semantics are UNPROVEN against OT's element-owned `transitionOut` model (the endpoint-remap/joinItems pattern is engine-side precedent, never OT-side) — the family's inclusion gate | S-ot | Stage-4 entry (time-boxed) | **the probe's outcome is FILED either way — the probe itself cannot silently fail**: (A) the pinned `transitionOut` endpoint-remap test GREEN in OT (the B-clip of a `transitionOut` is replaced; the transition's out endpoint remaps to the new clip's in-edge per the joinItems pattern — NOT cascade-drop) ⇒ RE-1 proceeds; (B) the redesign verdict filed as a NEW D-entry (element-owned `transitionOut` cannot express the remap; the model needs re-derivation) ⇒ the deferral lever fires — the §5.9C GAP row re-points to its new phase keeping owner + acceptance (the D30.3 zero-orphan form; the registered trim's exercise form: a cut fires ONLY on a stage exit gate that cannot go green — never a calendar) |
2. **The pinned test's content (the probe's instrument, specified now):** an OT in-page milestone test — fixture: element A with a `transitionOut` to element B; replace B with a source of different duration; assert: the transition SURVIVES with its endpoint remapped (the out-endpoint tracks the new clip's in-edge); the downstream shifts (or not) per the replace no-move law; ONE history entry. The test is authored BEFORE the spike (the probe is a test-first gate — the pinned test is the exit criterion, not an afterthought); a red test at the time-box's end IS exit (B).
3. **The 17 facet row's pass criterion:** "the probe row exists at 06 §5.9C with both exits stated; at Stage-4 exit, exactly one exit is evidenced (the green test's cite OR the filed D-entry's cite) — an unevidenced probe is a spec bug."
4. **The battery check:** battery_r28's D46 class includes the probe-row presence check (06 §5.9C carries RE-3 with the two-exit acceptance) + at Stage-4 exit the disposition check (one exit cited). The probe is the ONLY test in the corpus that gates a family's INCLUSION — the row must not live only in an audit doc (the T1-d verdict).

### 2.6 (e) The M49C completeness instantiation — the union widening, per verb

**The four-layer gate, instantiated for the D46 verbs (the tsc-lockstep → recorder → accumulator → gate sequence):**
- **Layer 0 (compile) — the gate-leg fires ONLY for a NEW OT verb (D29-F8's "when a new verb lands"):** **`replace` (80th)** joins the `TimelineCommand` union ⇒ `_WireTypesCoverUnion` / `_WireTypesHaveNoExtra` fail `bun run typecheck` until listed in `WIRE_COMMAND_TYPES`. **`insertBatch`'s bare form (79th) is the VACUOUS case** — already listed AND routed at the `970948a` code pin (D-ARCH-6, the routed-28 list at 15:14 + 15 §13.15's LANDED insertBatch row), so the spec-15 union's 79th-member fold is spec-side markdown and fires NO OT-side typecheck; its re-key rides the r1 param-alignment wave (T2-a's §13A.4.1 form), never this gate. `WIRE_UI_EXCEPTIONS` keys tsc-asserted (a typo'd or retired exception fails at the declaration site). Append/ripple-overwrite/fit-to-fill add NO members (composite/strategy widenings are gate-invisible — the D29-F8 census law's own words).
- **Layer 1 (runtime, origin-attributed):** the new verbs' gestures must dispatch through `useWireDispatch` (origin:'ui' — the conservative default is 'test', so a routing regression fails LOUDLY): replace's SourceEditBar one-shot + F11; the library multi-insert's ONE-insertBatch-per-kind-group (already landed — its origin stamps re-verified); the composites' constituent verbs are already routed.
- **Layer 2 (runner):** the node-side accumulator merge law — coverage-critical phases ORDERED before the gate (a new real-mouse phase for replace's gesture runs before phase 23; the carrier-test pattern fires all new verbs on ONE page — the M58R precedent).
- **Layer 3 (gate):** `missingCoverage` / `staleExceptions` over the LIVE-read registries; the census count pin re-keys mechanically (the M58-4 `assertEqual(WIRE_COMMAND_TYPES.length, N)` form — the D29-F8 re-declare: **31 → 32 as `replace` lands** (insertBatch is ALREADY in the routed-28 @ `970948a`, counted in today's 31 = 28+3 — only the spec-side 79th-member markdown re-keys at the r1 fold), the routed/exceptions split re-declaring with NO spec amendment; the in-page mirror pin + a stale dispatch of a retired form hitting the typed never-guard).
- **The union-version bump migration rides the SAME events (D47 §2-law-5's old-replay deprecation — see §3):** the grouped keyframe forms + the singular-absolute retire at the bump; the bump's migration test is part of the port acceptance (the cross-cut's element 5).

### 2.7 D46 acceptance pins · phase+owner · battery check

**Acceptance pins (per family, the named sets above). Pin-count estimate: ~120-140** — replace ~30 (Tier-1 ×5 + the remap + the prune + the echo + the error table + the no-NOOP) · append ~20 (the M16-class set + the kind-split + the never-a-push schema) · ripple-overwrite ~30 (the delta/pull/order/zero-floor/companion/diff-check/law-split set) · fit-to-fill ~35 OT-side (the 4-point census + the domain family + the pair pin + the 37 re-expressed) + **~15 WDC-side** (the null-test family + the exact-duration + the goertzel pair + the domain guards) · the M49C instantiation ~6-8 machinery pins (the lockstep asserts + the gate phases + the census re-declare) · the probe 1-3 (the pinned test + the disposition rows).

**Phase + owner:** **r1 Stages 2-4 — the span-vs-landing distinction stated once:** "Stages 2-4" is the family ROWS' registered SPAN (the plan's K2 row tags the four composite family rows "live scheduled rows at r1 Stage 2-4" because their CARRIERS land at Stage 2-3 — insertBatch's r1 fold, the param-alignment wave), while the four FAMILIES themselves land at Stages 3-4 as per-family milestones — the K2/scheduled-row law keys on the LANDING, never the span. Inside the window: Stage 2 (insert-edit/overwrite: the engine-complete twins; the carried corpus green in OT) → Stage 3 (append → fit-to-fill → ripple-overwrite, in the plan's order) → Stage 4 (replace + the probe at Stage-4 entry + wave-2). Owners: **S-ot** (the ports + the resolver pins + the probe), **S-engine** (the carried corpus + replace's corpus-designed op + the private-machinery exposure filing), **S-wdc** (the retime laws — W2 is LANDED, so this is the law-side mirror at 12 §6 + the NEW null-test-on-untouched-lanes family), **S-spec** (the 17 §3.1/§13A.7 rows + the 12 §8 invariants + the probe's RE-3 row + the mode-matrix twin). The 05 §8A grammar rows + the D32 fan-out rows ride each port (the plan's base protocol).

**Battery check:** battery_r28's **D46 class** — (i) the four §3.1 matrix rows + §13A.7 facet rows present, each citing its §5.9X GAP pin set; (ii) the RE-3 probe-row presence + the two-exit acceptance text; (iii) the mode-matrix re-derive (the four families' rows + the D30.3 zero-orphan-rows law — every row LANDED or live-scheduled at its registered phase); (iv) the M49C census lineage re-key (24→28→30→24+6→25+5→31=28+3→ the post-bump split as it lands); (v) the 12 §8 invariant-set presence check (the D46 families join the no-overlap/undo families — the append/ripple-overwrite invariants + fit-to-fill's exact-fill + refusal invariant).

---

## §3 D47 — the param trio (flat self-addressing + both verbs + insertBatch ripple)

**The ruled law (owner sites, live):** 15:5022-:5023 (the three rulings + the ruled spec-side shape + the ripple TOTAL-span law), 15:14 (§0-BASE's 29→31 counterpart re-derivation), 15:4335-:4378 (the flat zod schemas — `KeyframeRef`, `UpsertKeyframesCommandSchema` with `KeyframeRef & {spec}`, `RemoveKeyframesCommandSchema` flat, `RetimeKeyframesCommandSchema` plural-delta), 16 §3.12 (:440-:447, the flat-form keymap rows + the composite wrappers), 15:5025 (the 80th member), ARCH-R28 §4.1 D47's five amendments.

### 3.1 (a) The flat keyframe form's wire tests

**Test surface (the §13A.4.1 schema-sweep family, re-keyed to the flat forms):**
- **The round-trip sweep:** every flat form (`upsertKeyframes` with `KeyframeRef & {spec}` members · `removeKeyframes` with `KeyframeRef[]` · `retimeKeyframes` with `{keyframes: KeyframeRef[], delta}`) validates through the 15 §11 zod schemas — the examples generated from 15 §5's example table (the single-source law, no test-local forks).
- **The self-addressing law pinned as behavior:** each member carries the full 4-tuple `{trackId, elementId, propertyPath, keyframeId}` — a TWO-ELEMENT retime in ONE command (members from different elements) commits ONE entry and moves both (the cross-element-by-design law — "marquee selections span elements"); the discriminating pin: the per-element grouping CANNOT express it in one command (retired — below).
- **The mint law:** `keyframeId` optional in upsert members — omitted ⇒ a fresh id minted (deterministic under `idSeed`; the minted-refs echo returns them); present ⇒ the update path.
- **The hoisting law:** shared gesture scalars at verb level — `retimeKeyframes.delta` NEVER per-member; the no-parallel-arrays pin: a per-member delta array is schema-REJECTED (the zod issue path asserted — the "never N copies, never parallel arrays" law as a negative schema test).
- **The min(1) laws:** empty `keyframes[]` ⇒ INVALID_PARAMS (the M58-1 deliberate-divergence family — insertBatch's empty is INVALID_PARAMS too); the union value types round-trip (number / number[] / string / boolean).
- **The old-replay deprecation path (the grouped forms retire — §2-law-5's convention, the :4918 precedent):** post-bump, an OLD grouped-form replay (`{elementId, keyframeIds[]}` for remove; the singular-absolute `retimeKeyframe`) gets the **version-mismatch deprecation result** — a named, stable, non-crashing envelope (the replay identifies the old union version and returns the deprecation code + the migration pointer), NEVER a silent acceptance, NEVER an unhandled parse. The pin: one old-replay row per retired form, asserting the deprecation envelope's shape. The retired-form never-guard: a stale dispatch hits the typed INVALID_PARAMS (the api.ts:2537-2545 law — pinned already at OT, re-keyed to the spec statement).

**Fixtures.** The flat-member census: single-element single-member · two-element marquee · mixed propertyPaths in one command · the mint-vs-update pair · the hostile family (empty array · duplicate refs — the dedup law below · non-uuid ids · the old grouped forms).

**Oracle instantiation.** The zod schemas themselves (spec-15's own law as the validator) + the depth arithmetic + hand-derived member sets.

### 3.2 (b) The both-verbs law (insert stays singular; insertBatch the composite)

**Test surface:**
- **Insert stays singular (the ruling's own negative):** `timeline.insert` with a single element still commits ONE entry with its param shape UNCHANGED — neither deprecated nor aliased. The pin: the singular form's round-trip + depth + the census slot (insert's slot untouched by the bump — the count pin's own arithmetic depends on it). The 17-header fix (the "singular verbs RETIRED" overreach — T1-d's finding) lands with this row: only remove/retime's singulars retire.
- **The insertBatch batch laws (the M58 set, restated as the spec's acceptance):** **F1A-3 homogeneity** (mixed-kind INVALID_PARAMS — whole-batch); **wire-side dedup** (the same element/keyframe member twice in one batch ⇒ deduped, ONE application, one entry — never double-applied; the dedup is pinned with a fixture whose double-application would visibly differ); **whole-batch atomicity** (a member failure ⇒ depth-anchored rollback, NO partial state, redo PRESERVED — F1B-7); **ONE history entry** for the whole batch; **the shared per-member validator** (one writer for the element-field law — `validateInsertElement`); **the minted-refs echo** (`data.results` per member).
- **The ruled spec-side shape's conditional law:** `{elements: ElementSpec[], placement?: PlacementStrategy, anchor?: MediaTime, ripple?: boolean, idSeed?}` — **`anchor` REQUIRED for the five time-based strategies** (optional ONLY where the placement resolves it server-side — the append strategy's per-track last-element-end law). The schema-level pin: an anchor-less insertBatch with a time-based placement is INVALID_PARAMS; an anchor-less insertBatch with `placement:'append'` commits (the server-side resolution).

**Fixtures.** The batch census: homogeneous ×3 · mixed-kind · intra-batch overlap · duplicate members · empty · locked track · the anchor matrix (time-based × {anchor present, absent} · append × {absent}) · the one-element degenerate (3.3's equivalence).

**Oracle instantiation.** Depth arithmetic + the serialized-state rollback compare + the schema validators.

### 3.3 (c) The insertBatch ripple pin (the TOTAL-span push — D47/A-1's ruled law)

**Test surface.**
- **The TOTAL-span law:** a 3-element batch (durations d1≠d2≠d3, first at t₀, others at relative offsets) with `ripple:true` pushes every downstream element by **(d1+d2+d3) — the block's TOTAL span** — NOT d1 (the first-element-only trap), NOT max(d_i), NOT the last element's duration. The discrimination fixture makes all candidate magnitudes numerically distinct; every downstream start **hand-derived** from the formula (P1). The law's own words carry into the suite header: "the first-element anchor + the relative offsets compose, so the push magnitude mirrors insert's D31.6 law."
- **The mirror pin (insert's D31.6):** a single-element `insert{ripple}` pushes by that element's FULL duration — the existing law re-keyed as the batch's oracle: **the one-element degenerate equivalence** — `insertBatch([e], {ripple:true})` ≡ `insert(e, {ripple:true})` (same end-state serialized, same depth) — the equivalence pin that ties the two verbs' ripple semantics to ONE law.
- **The batch laws orthogonal (the ruling's own sentence):** ripple + a member failure ⇒ whole-batch rollback leaves **NO shift and NO phantom entry** (downstream starts byte-identical + `historyDepth() === 0` + the referential identity trio); ripple + the dedup law (a duplicate member contributes its span ONCE to the push — the dedup interacts with the total: 2×member ≠ 2×span).

**Fixtures.** The 3-element distinct-duration batch · the one-element degenerate · the failing-member-with-ripple batch · the duplicate-member batch · downstream elements at the boundary (the first downstream start == t₀ + total, hand-derived).

**Oracle instantiation.** P1 hand-derived arithmetic + depth + serialized compare.

### 3.4 (d) The counterpart count machine-check (29→31→80 — a battery CLASS, not a hand-copied number)

**Test surface (battery_r28-side, Python over the spec tree — the D35 register discipline applied to the counterpart arithmetic):**
- **The derivation re-derivation:** the class scrapes §0-BASE's stated convention (15:14) + §13.15's counterpart column, re-derives the arithmetic from the CONVENTION (not the figure): 29 + 1 (`retimeKeyframes`' replacement slot — the retired singular-absolute has NO counterpart; the ruled plural-delta IS OT's landed verb) + 1 (`insertBatch`'s own 79th-member slot minted at the r1 fold) = **31 of the post-bump 79-member union**; `replace` mints the 80th with NO counterpart until `timeline.replace` lands ⇒ **32 of 80** then (the census re-declares mechanically per D29-F8).
- **The reconciliation assert:** the spec's STATED figures (15:14's derivation sentence; 15:5021's "29 of 78 … RULED R28/D47: … 29 → 31"; 15:5023's "78→79→80"; 15:5025's "final count 80") must EQUAL the re-derived arithmetic — a drift without amendment = a battery failure (the named-failure law). The class also checks 17 §13A.4.1's sweep count is re-keyed to the same sequence (the T1-d P1 #4).
- **The count's own census discipline:** the count is a DERIVED census (like the api-surface freeze — derived from the live registries), never a hand-copied integer; the OT-side count pin (M58-4's `assertEqual(WIRE_COMMAND_TYPES.length, N)`) re-keys at each landing — the battery's spec-side class and the repo-side pin are the two halves of one law.
- **The post-bump projection is a PROJECTION, honestly labeled:** 31-of-79 and 32-of-80 are ruled FUTURE figures (the r1-fold projection) — the battery class asserts the spec labels them as projections with the landing condition ("until `timeline.replace` lands"), so a landed replace without the count re-key is ALSO a failure (the stale-projection check).

**Fixtures.** The spec tree itself (15:14/:5021-:5025/:5023 + 17:2292 + the OT census at the code pin) — the battery's input corpus.

**Oracle instantiation.** The convention-as-formula (the arithmetic re-derived from the stated rules; the anti-tautology law applied to a COUNT — the number is computed, never quoted).

### 3.5 (e) The 16-side keymap dispatch coherence (the flat forms in the keymap's execute cases)

**Test surface.**
- **The dispatch-coherence law (one law, both spec homes):** every 16 §3.12 execute body that constructs a keyframe-family command emits the FLAT form — the emitted `{type:'retimeKeyframes', params:{keyframes:[{trackId, elementId, propertyPath, keyframeId}], deltaTicks}}` **validates against the spec-15 zod schema** (the keymap's execute output IS spec-15-valid — the coherence oracle: drive the binding, capture the emitted command, schema-validate). The old singular `retimeKeyframe` form is schema-REJECTED (the negative coherence pin — a keymap row emitting a retired form fails the schema).
- **The ±1/±10 nudge rows (16:440-:441, already re-keyed R28-D47):** the emitted `deltaTicks` is **runtime-resolved** (±1 frame at the live fps — 5000 ticks at 24fps, 2000 at 60; the `<runtime>` deltas law at 16:335: "Tests must use `<runtime>` deltas — the EngineCommand carries the absolute ticks, not a frame count") — the pin drives the binding at two fps values and asserts the two distinct tick figures.
- **The composite wrappers:** `nudgeKeyframe` and `seekToKeyframe` remain UI-layer composites — the decomposition pin: a value-nudge emits a FLAT `upsertKeyframes` (the focused keyframe's ref + the new absolute value — value-delta composed to the absolute); a time-nudge emits the flat `retimeKeyframes` (the nudge IS the delta gesture's native commit — 16:440's own note; programmatic absolute-time callers compose `deltaTicks = target − key.time`, which the pin exercises as the caller-side composition law).
- **The Appendix-A enumeration coherence:** the keymap's keyframe rows + the cheat-sheet rows name the flat forms (the presence check rides the K3 corpus battery — 16's own registered remaining work).

**Fixtures.** The focused-keyframe context (keyframe panel focused + a selected keyframe) · two fps projects · the marquee selection spanning two elements (the multi-ref nudge — one command, both elements).

**Oracle instantiation.** The spec-15 zod schemas as the cross-spec coherence validator + hand-derived tick figures.

### 3.6 D47 acceptance pins · phase+owner · battery check

**Acceptance pins (the named set). Pin-count estimate: ~45-55** — flat forms ~15 (the sweep + the self-addressing behavior + the mint/hoist/min laws + the old-replay rows) · both-verbs ~12 (the singular-negative + the M58 batch set + the anchor matrix) · the ripple pin ~8 (the TOTAL-span + the degenerate equivalence + the orthogonal trio) · the counterpart machine-check 1 battery class + ~4 count pins (the OT-side M58-4 re-key family) · the keymap coherence ~10 (the schema-coherence family + the runtime-delta pair + the composites).

**Phase + owner:** the **re-keys land NOW with battery_r28** (17 §13A.4.1's 78→79→80 + the two new sweep examples generated from 15 §5; the 17-header singular-retirement fix; 12 §0's posture row) — **S-spec**. The **pins ride the r1 union-version bump** (the param-alignment wave — Stage 2-3 with insertBatch's fold): the flat-form wire tests + the batch/ripple pins land at the bump in OT + the spec-15 sweep; the keymap coherence rows ride the r1 keymap sync (the D30 R5 lockstep law — one commit: port keymap + shell yield-sets). The counterpart battery class lands with battery_r28 (it checks the spec-side arithmetic NOW, and the landed-state reconciliation as the verbs land).

**Battery check:** battery_r28's **D47 class** — (i) the counterpart arithmetic class (§3.4 above — the derivation + the reconciliation + the stale-projection check); (ii) the §13A.4.1 re-key presence (the 79/80 sequence + the two new sweep examples); (iii) the 17-header fix presence; (iv) the count-consistency class extension (the OT census at the code pin — 31 = 28+3 live, the post-bump split as it lands); (v) at the bump, the old-replay deprecation rows' presence in 15 §15.4's protocol-testing home.

---

## §4 THE CROSS-CUT — the r1 port acceptance protocol (ONE consolidated test law)

**The problem (T1-d §3.1):** the plan's r1 row (IMPLEMENTATION-PLAN.md:67) states the base protocol — "Every port: the carried engine tests green in OT + the census self-re-declaring (D29.2, proven thrice) + the 05 §8A grammar row + the D32 fan-out row + the battery's mode-matrix re-derive" — but R28 added **five protocol elements that exist nowhere as test law**; without consolidation the executors' work orders carry the Stage ladder but not the R28-widened gate content.

### 4.1 The consolidated protocol (the recipe the r1 executor follows at the port)

**The base protocol (unchanged, the plan's own words) + the five R28 additions, each with its pins, its order slot, and its battery check:**

| # | The addition | The pins that land | The order slot | The battery check |
|---|---|---|---|---|
| 0 | **The base** (the plan's r1 row): carried engine tests green in OT · the census self-re-declares (D29.2) · the 05 §8A grammar row · the D32 fan-out row · the mode-matrix re-derive | Per port, per Stage | Every stage | The mode-matrix re-derive + the census lineage |
| 1 | **D42 — the pairwise re-key:** the carried E1/E2/F6 pins re-keyed to assert link values (`linkedTo`) through undo/redo/serialization (09:345); rider 9's count reconciliation (the carried corpus = 13+13+20+12+table+11, decomposition recorded) | The re-keyed pin family runs green in OT with the pairwise field asserted at every undo/serialize boundary; the count reconciliation recorded in the port's design note | Stage 0 (the field + closure + four-verb laws are S-ot's filed first step) | The D42 class (T2-a's design — the closure invariants in 12 §8) |
| 2 | **D43 — the Stage-0 fence:** the zero-behavior-change re-export check (volume-dB + retime re-exported VERBATIM — byte-identical before/after the fold) + the battery's check-2 widening (the leaf-only import check extended to the C1 fold's core-file→OT-leaf edge: bridge/ + the folded timeline-math.ts site, still leaf-only) | The verbatim-re-export pins (a byte-compare over the module's exports) + the widened import fence | Stage 0 | The D43-A3 class (check-2 widened) |
| 3 | **D44 — the riders:** the 9 lockPreCheck riders each with a TRACK_LOCKED trigger (roll/slip/slide/rateStretch/retime/freezeFrame/rangeRemoval/replace + the widened placement-target) · the never-guard/tsc-lockstep compile checks · 17 §2.5's rule-8 error-path census re-keyed to the 25-code two-tier shape (each code × class + the benign-echo family as `ok:true`) | One rider row per verb (P3 table-loop); the compile checks fire at the verb landings; the census script re-keyed | The riders ride their verbs' stages (replace's rider at Stage 4); the census re-key lands with battery_r28 | The D44-A6 class-tag completeness class (25 codes × one class each, scraped from 15 §6.3's table) |
| 4 | **D46 — the probe + the downstream-set diff check:** the transition-remap probe at Stage-4 entry (two exits — §2.5 above); ripple-overwrite's downstream-set diff check (the E1-a condition as B2: the shifted set == the COMPUTED downstream set, direct diff naming the drifted member) | The probe's pinned test + the RE-3 disposition; the diff-check pin (2.3) | The probe at Stage-4 entry; the diff-check with RO's port (Stage 3) | The D46 class (the probe-row presence + the disposition + the mode-matrix rows) |
| 5 | **D47 — the bump migration:** the union-version bump's old-replay deprecation path (the grouped forms + the singular-absolute retire on the same bump — §2-law-5's convention) + the counterpart re-derivation 29→31→(32 of 80) | The old-replay deprecation rows (§3.1) + the count re-keys (§3.4) | The param-alignment wave (Stage 2-3, with insertBatch's fold) | The D47 class (the counterpart arithmetic + the stale-projection check) |

**The protocol's own acceptance law (the one sentence the executor's work order carries):** *a stage's exit gate is green only when: the carried engine tests are green in OT (re-keyed per #1 where the ruling widened them); the fences of #2 hold; every new verb is census-complete per #3's compile+gate checks; every composite's set-arithmetic is diff-checked per #4; and the bump's migration rows of #5 are green — in that order, with the battery classes as the round-level check.*

### 4.2 WHERE IT LANDS (the design decision)

**The ruling: a new 17 §13A.8 + one §13A.7 facet row pointing at it + the plan-r1 rider + 12 §0's posture row.** The reasoning:

1. **NOT a bare §13A.7 row.** §13A.7 is a facet MATRIX (rows keyed by spec facet: facet → source spec → tier → verification → pass criterion). The protocol is a RECIPE with an ordering law (five elements × stage slots × battery checks) — a matrix row cannot carry the ordering without bloating the table's shape. The §14.4-step-0 sweep needs a row to FIND, but the row should POINT, not contain.
2. **A new §13A.8 ("the r1-port acceptance protocol — the consolidated recipe")** fits 17's existing structure exactly (§13A.1-.7 are numbered subsections of the same character: named law families with their verification shapes — 13A.4 the wire conformance suite, 13A.5 the projector properties; the protocol is the cross-facet member of the same genus). Its content: the §4.1 table above (the base + the five additions, each with pins/order/battery) + the acceptance sentence. It cites the owning facets (D42-D47's rows in §13A.7/§3.1) rather than duplicating them.
3. **ONE §13A.7 facet row** ("the r1 port acceptance protocol — spec 15 §13.15 + 06 §0 + the plan's r1 row | F | T1 | §13A.8 | the five additions each evidenced at their stage exits") so the §14.4-step-0 sweep and 17's own enforcement rule (:2362) find it as a first-class facet — closing T1-d's "a facet with no row anywhere is a spec bug" verdict for the protocol itself.
4. **The plan-r1 rider (IMPLEMENTATION-PLAN.md:67, one clause):** "+ the R28-widened gate content per 17 §13A.8 (the five additions: the D42 pairwise re-key, the D43 Stage-0 fence, the D44 riders + census re-key, the D46 probe + downstream-set diff, the D47 bump migration)" — because the plan's r1 row is THE executor's work-order home; the rider must land there or the executors read the base protocol without the additions (the exact failure mode T1-d named).
5. **12 §0's GAP row + the battery-posture row** carry the battery classes (the round-level checks) — 12 is the battery's spec-side posture home (the T1-d fix #9/#10 pattern).

**The alternative rejected:** a new 17 §13B — wrong genus (13B would name a new ROUND's additions; the protocol is round-independent acceptance law for the r1 port specifically, and §13A is where every other cross-facet verification law lives; a 13B would orphan it from the §14.4 sweep's §13A.7 habit).

### 4.3 The cross-cut's own acceptance pins · phase+owner · battery check

**Acceptance pins:** the protocol itself is spec-side law (no new behavioral pins of its own — its pins are counted in the owning areas above; the ONLY protocol-native pins are the two fences of element #2: the verbatim-re-export byte-compare ~3 pins + the widened import fence 1 class, and the census-script re-key 1 class). **Pin-count estimate: ~5 protocol-native + the counted-per-area set.**
**Phase + owner:** lands **with battery_r28** (S-spec — the 17 §13A.8 + the §13A.7 row + the plan rider + the 12 §0 rows); consumed by **S-ot/S-engine at every r1 stage exit** (the recipe's checks are the executors' gates).
**Battery check:** battery_r28 gains the **r1-protocol class** — (i) §13A.8's presence + the five additions each named with its stage slot; (ii) the plan-r1 rider's presence (the plan's r1 row cites 17 §13A.8); (iii) the per-addition battery classes exist and are wired (D42/D43-A3/D44-A6/D46/D47 — the five from T1-d §3.2's list + the D47 arithmetic); (iv) at each r1 stage exit (post-r1 rounds), the disposition check: every stage exit that fired has its evidence cited (the carried-tests cite, the probe's exit, the bump's migration rows).

---

## §5 The 12/17 landing map (the concrete spec-side edits this design files)

**Anchor law for every executor (and the battery author):** the line anchors in this map were live at the design commit `4b88f8d`; the SAME-ROUND prereq sweep (T3-c's 15-side insertions, +14 lines at :1575-:1632) has since moved the 15-side cites — **RE-VERIFY EVERY ANCHOR LIVE BEFORE ENCODING** (the known post-sweep positions: 15 §13.15's counterpart/insertBatch/replace rows now at :5035/:5037/:5039 — this map's ":5021-:5028" cites land on the §13.15 preamble/table-top; the flat zod schemas now at :4349-:4392 — the map's ":4335-:4378" is +14 short). The same law covers the 06-side +1: the same-wave corpus fix lands 06 §5.9C's RE-3 GAP row at :1624 (the review's L1/A7 amendment), shifting every 06 anchor below :1624 by one (the §5.9C-F GAP rows :1622-:1687 → :1623-:1688; the F4 duplicate-sever law :1697 → :1698; the D43.10 intersection :1671 → :1672; the §11.7 cross-reference :2709 → :2710; the existing D46 test row :3305 → :3306) — this design's 06 cites carry the review-time (pre-RE-3) positions. A check encoded against a design-time anchor greps the wrong lines — this is the root cause the review registered as L2; the battery author re-verifies every anchor live before encoding any check.

**Spec 17 (the plan twin):**
1. **§3.1 matrix rows:** "NS-4 render-plan projector (D45)" · "Replace (§5.9C)" · "Append-at-end (§5.9D)" · "Ripple-overwrite (§5.9E)" · "Fit-to-fill (§5.9F)" · "Flat keyframe forms + insertBatch ripple (D47)" — each T1 ✅ / T3 where keyed / Property ✅, citing the owning §5.9X GAP pin set / 15's schemas.
2. **§13A.4.1 re-key:** "78 union members" → **78 → 79 → 80** (the ruled sequence; two new sweep examples — bare `insertBatch` + `replace` — generated from 15 §5's example table per the single-source law) + the header's singular-retirement fix (only remove/retime's singulars retire; insert stays).
3. **§13A.5 extension (the render-plan projector):** the four properties re-instantiated on `project(scene) → TimelineData` + the **two-assertion venue-blindness** (the dependency census + the call-order probe) + the identity-boundary pair + the NS-1 confinement + the translation table + the {grade} seam pins at r3 (the construction pin, the ORDER pin, the string law's closed set, the retirement census).
4. **New §13A.8 (the r1-port acceptance protocol)** + the one §13A.7 row pointing at it (§4.2).
5. **§13A.7 facet rows:** the D45/D46×4/D47 rows + the RE-3 probe row (the two-exit gate) + the protocol row.
6. **§2.5 rule-8's census re-key** (D44-shaped — T2-a's area, but the D46 error rows cite it: the 25-code two-tier shape).
7. **§14.2's mapping-table repair** (add the 15 §15.4 / 06 §Testing rows — rides the T1-d P2 list).

**Spec 12 (the strategy twin):**
1. **§0 GAP rows:** the D45/D46/D47 rows + the r1-protocol row (the acceptance gates + facet-row pointers, per §0A's own rule).
2. **§5 (pixel verification):** the r3 grade-parity mechanics row — the shared-fixture law + the ≤1-LSB-equivalent metric + the instrument self-test precondition (the P-WDC-4 law generalized to the visual family).
3. **§6 (audio verification):** the fit-to-fill retime family — the null-test convention (nullDepthDb ≥ 60 dB untouched-lane law) + the exact-duration-no-tolerance + the goertzel pitch oracle + the [1/32,32] domain guards + the Node-venue law (12 §6.4's varispeed row re-keyed to the D46 instantiation).
4. **§8 (property invariants):** the D46 families join the invariant set — append's never-interior-gap + one-entry; ripple-overwrite's downstream-diff + no-gap-on-pull + zero-floor; fit-to-fill's exact-fill + refusal invariant; the insertBatch TOTAL-span property (the push == the composed block span for ANY batch — a property-law statement, enumerated in the fast venue).
5. **§0's battery-posture row:** the R28 class list (D43-A3 · D44-A6 · D45 · D46 · D47 · the r1-protocol class · the D50-site-19 + R16 classes from T1-d §3.2).

**The per-spec `## Testing` mirrors (the owners' own rows):** 06 §Testing gains the four families' rows (the §5.9X GAP acceptance cells ARE the pin sets — the Testing rows mirror them; the one existing row `ripple-overwrite-composite-makes-room` @ :3305 re-keys to the full set) + the RE-3 probe row; 08 §19 gains the R9-c seam + migration rows; 15 §15.4 gains the flat-form/bump-migration rows; 16's Appendix-C enumeration rides the K3 corpus (the keymap-coherence rows).

---

## §6 Honest limits (what this design cannot promise)

1. **No pixels in the fast venue** (the engine scout's own limit): the D45 monitor≡export content parity is param/plan-level in vitest; the pixel truth is the r3 parity (the CPU oracle vs the venue) + the slow venue (browser CI — the sandbox cannot run it). The fragment-pass parity's ≤1-LSB metric compares the CPU oracle against the VENUE output — the venue render itself is r3's slow-venue job; the corpus states the split.
2. **The M49C Layer-1/2 instruments are runner-layer, not vitest-pinnable** — the origin attribution and the accumulator merge live in OT's runner + the page seam; the spec-side law can only NAME them + their consumption (the real-mouse phases' ordering law); the app-side K3 port (the W-F gate) is the app's own instrument, outside OT's census.
3. **The probe is a human-time-boxed spike** — the test law pins its OUTCOME-FILING discipline (the two exits, the disposition evidence), not the spike's success; exit (B) is a legitimate green (the deferral fires as registered).
4. **The counterpart class checks the SPEC TEXT's arithmetic** (the convention re-derived against the stated figures) — it cannot check OT's live census from the spec repo at battery time except through the declared code-pin figures; the live reconciliation is the OT-side count pin's job (the two-half law, §3.4).
5. **The r1 protocol's per-stage exit evidence is post-hoc at the battery level** — battery_r28 lands BEFORE r1's stages; the protocol class checks presence/ordering now and disposition-evidence only at later rounds (the staged honesty).
6. **The WDC null-test family inherits P-WDC-3's silent-reference footgun** — the ≥60dB untouched-lane pin must guard `refEnergy === 0` (a silent reference reads −∞ and must NOT read as a perfect match); the design carries the guard as part of the instrument self-test precondition.
7. **Dynamic registration undercounts static grep** (the census trap): every suite-count statement in the landing rows must carry the runner-count law (never grep) — the D46 families will use the table-loop form, so their counts are runner-counted by construction.

---

## Verification log (for the register)

- Tree: `nle-core-spec` @ `4b88f8d` (HEAD verified; `git status --porcelain` clean on `*.md`).
- Landed-law cites re-verified live at HEAD: 08:24 (the D45 amendment text) · 06:1618-:1687 (the four GAP sets) · 06:3305 (the existing row) · 15:14 (the 29→31 derivation) · 15:5021-:5028 (the counterpart + insertBatch + 79th/80th rows) · 15:4335-:4378 (the flat zod schemas) · 16:426-:447 (the flat keymap rows) · 17:2246-:2350 (the §13A structure + the 78-member row at :2292) · 12's §0/§5/§6/§8 section map · IMPLEMENTATION-PLAN.md:67 (the r1 base protocol row) · ARCH-R28 §4 D45/D46/D47 + §4.1.
- Inputs read in the tasked order: test-scout-engine.md (all 21 patterns + §4 applicability) · test-scout-ot-wdc.md (§1-§4 incl. the M49C four-layer mechanism + the M58 law set + the WDC conventions) · test-audit-coverage.md (§2 rows + §3 cross-cuts + §5 fixes) · ARCH-R28-seal-round.md §4 + §4.1.
- No test code written; no spec files edited (the design lands via the T3 fold executor in 12/17 per §5's map).

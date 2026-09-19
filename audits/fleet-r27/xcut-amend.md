# R27-W4 xcut-amend — THE CONSOLIDATED AMENDMENT PLAN (the fix-register, the one-author clusters, the waves, the rulings, the forecast)

**Task ID:** R27-W4-AMEND · **Agent:** xcut-amend · **Round:** R27 final-tightness, Wave 4 (the consolidated fix-register builder) · **Date:** 2026-09-14
**Inputs:** ALL 31 fleet reports (`audits/fleet-r27/{BRIEFING,scout-*,mock-*,spec-*}.md` — 5 scouts, 6 mock analyses, 20 per-spec audits) read in full; every fix-list merged and deduplicated below. Report-only: no corpus edits, no commits; stayed on main.
**Siblings:** the census set is consolidated by **xcut-census** (the wire-census/counterpart-arithmetic register) and the plan overhaul by **xcut-plan** (IMPLEMENTATION-PLAN + the D38 candidate) — both referenced, not duplicated, below.

**The headline:** ~**90 P1-class fix items** and ~**150 P2 items** across 24 target files (21 specs + plan + register + battery), collapsing into **13 deduplicated edit families** + **6 one-author law clusters** + **~20 mechanical re-pin clusters**. Conflicts needing an orchestrator ruling before apply: **7** (§1's ⚠ marks; §4 rules them). Nothing re-litigates settled D-law; every P1 is either freshness (a landed law the text predates) or a missing landed law — exactly the final-tightness posture the round was chartered for.

---

## §1 THE DEDUPLICATED FIX-REGISTER (keyed by target file; source = the owning report's fix-list, applied verbatim from there)

Priority: P1 = spec states something FALSE now or a landed law is missing entirely · P2 = stale citation/count/pointer/underspecified · P3 = polish. "F-n" cites the owning report's fix item — the exact old→new text lives THERE (this register is the router, not a copy). ⚠ = conflict / ruling required (→ §4).

### 1.00 — 00-master-spec.md (owner: spec-00; fed by all five scouts)

| Row | Site | Edit (old→new) | Source | Pri | Conflict |
|---|---|---|---|---|---|
| 00-1 | §0:16 engine row | Insert the R27 card: `f9ac806` **748/748** (NOT ARCH-R27's "(739)" — the gates lines at `c01a187`/`480a216` are the authority), code anchor `50b91f5`, timeline.ts 8,997-LOC warning, the RC law set (D12 ratification, OV-01/02/05/12, M2 W1), vendors OT `6e2b91a` (D-ARCH-6 absorption queued) + WDC `ec8fd5c` | spec-00 P1-1; scout-engine | P1 | — |
| 00-2 | §0:17 OT row | Insert the R27 card: HEAD `55c81c0` / code pin `970948a`, **632/632** (452+30+150 per the report json), **31 = 28 routed + 3 exceptions** with the full lineage tail, AR-1/AR-2/D-HB2 + the batch-verb law; canonical tree 41 files/9,176 LOC | spec-00 P1-2; scout-ot | P1 | — |
| 00-3 | §0:18 WDC row | Insert the R27 card: `ec8fd5c` **777/777** (the S-series: diagnostics/heartbeat, rebuilt worklet, rt-gate heritage fix, MIDI family, catalog split; waveform contract byte-verbatim; WDC's own HANDOFF stale) | spec-00 P1-3; scout-wdc | P1 | — |
| 00-4 | §0:19 nle-ui + app rows | `32abd58` **690/690** (R9-b preservePitch, FW-D, F4, AW1-2; consumed @ `83ff8a8`, absorb queued) + `c020b2a` **252/252** (census 42 = 36+5+1 @ `6e2b91a`; AR-2 consumption; M2 W1 app-side; maintainPitch RESOLVED) | spec-00 P1-4; scout-app/nle-ui | P1 | — |
| 00-5 | §0:19 mini/variants tail | mini **415 — R24-2 IN FLIGHT** (W0/W1/W2 landed 2026-09-13, W3+ pending; 145/132/382 census); variants register 1,762/64, live higher — re-key at WRAP only | spec-00 P1-5; mock-verdicts §3.2 | P1 | ⚠ count keeps moving (12/17/19 read 428/441 later — the mini sibling re-keys in flight; record-not-chase, cite the register's declared figure at apply time) |
| 00-6 | §2A (new 2A.10) | Insert the **live-registry consumption law** (AR-2): a consumer gate consumes the exported registry, never a hand-mirrored copy (the mirror-stale incident ×2; engine SKILL law 88 twin; app `wire-coverage.test.tsx:29/:49-59`) | spec-00 P1-6; scout-app OQ2 | P1 | ⚠ home ruling: 2A.10 standing law (recommended) vs 15 §R8 fold only |
| 00-7 | Status :3 + ledger :4 | v12.0 R27 entry + the missing `v11 Round 26 2026-09-10` date line | spec-00 P2-1 | P2 | — |
| 00-8 | D21/D29/D30/D31/D36.2/D36.4 notes | The dated note set: D21 R27 re-pin note; D29's three clauses (28/3, AR-1 supersession, D-ARCH-6 LANDED); D30 firing note; 2A.7/2A.8 re-declares (42@6e2b91a; 28+3); D31.1 `performInsertEdit` :4702→**:5630**; D36.2 maintainPitch RESOLVED (engineService.ts:481-513 + sceneBridge.ts:229-262); D36.4 both rows LANDED | spec-00 P2-2..P2-9 | P2 | — |
| 00-9 | D12 (:316-336) | The engine-side ratification note (both signatures; the convergence deliverables) | spec-00 P2-6; scout-engine | P2 | — |
| 00-10 | §3 :~556; D11 :305; D13 :342; :6; D32.6; §13.5 :838 | The live-reading figures (41 mirrors/9,176 LOC), the census lineage tail, the count-chain tail, the 7-repo Consumers line, the D32.6 FIXED tag, the E1-fix P3 cross-ref | spec-00 P2-10/P2-11/P3-2/P3-4/P3-1/P3-3 | P2/P3 | — |

### 1.01 — 01-core-engine.md (owner: spec-01)

| Row | Site | Edit | Source | Pri | Conflict |
|---|---|---|---|---|---|
| 01-1 | §0 BASE :13-14 + header :4 | The re-pin cluster: `f9ac806` 748/748, 25 test files (the enumeration or the summary form), fence 52, probes 9/9, OV-12 CI job, vendors OT `6e2b91a`/WDC `ec8fd5c`, app row → `c020b2a` 252 | spec-01 F-1/F-5/F-8 | P1 | — |
| 01-2 | §0 (before GAP) + §3 head | Insert the **D12 venue ratification note** (the drafted block: opencut is THE editing engine; this stack = the render/export venue model; one-directional junction; venue-internal freeze; E3 rides r1) + the §3 italic venue sentence | spec-01 F-2 | P1 | — |
| 01-3 | §6 module map | Append the engine-reality overlay: `bridge/` 12 files/4,645 LOC incl. **opencut-laws.ts 122** (the OV-01/02 one-home leaf); the fence edges | spec-01 F-3 | P1 | — |
| 01-4 | §0 :13/:21/:26/:27 line pins | The re-anchor: scene-to-segments :596/:623 (+:207-214/:273), composition-frame :223→**:257**, :70-71→**:80**, :93-94→**:106**, api.ts:1509/:1515→**:1529/:1535** | spec-01 F-4; 19 §2A | P2 | — |
| 01-5 | §0 :27 maintainPitch; F-7/F-9/F-10 | The RESOLVED flip (R9-b; the app threading pins); the R25-R27 landings paragraph; the E1/E2/E3 defect-register pointer; the union-façade GAP rider | spec-01 F-6/F-7/F-9/F-10 | P2/P3 | — |

### 1.02 — 02-workers-threading.md (owner: spec-02)

| Row | Site | Edit | Source | Pri | Conflict |
|---|---|---|---|---|---|
| 02-1 | NEW §7.4 (after :309) | Insert the **audio-thread observability + realtime-safety law** (the WDC S-series): the EngineDiagnostic bus (7 kinds, 64 ring, console-silent, WeakMap binding), the heartbeat monitor (armed-by-first-beat, isRunning-gated, 3s stall, grace), the in-`process()` protocol (256-quantum, NaN/silence scans, one preallocated message), the stall **bypass-to-passthrough ladder**, the rt-safety-gate **transitive-heritage** law — the drafting home for the cluster-d set (§2-d) | spec-02 FIX-1; scout-wdc | P1 | ⚠ disposition ruling (scout-wdc OQ2): law vs machinery — the draft assumes LAW |
| 02-2 | §0 :17 app row | Rewrite the deliver + sidechain clauses (rewireSidechains DELETED — single-owner law; workletFlushMs 250-when-present) + re-pin `c020b2a` 252 | spec-02 FIX-2 | P1 | — |
| 02-3 | §0 :22 K3 row | Rewrite the worklet-serving row (RESOLVED-in-a-different-shape: the vite plugin + the engine symlink; what remains K3 = the real-BROWSER venue pin) | spec-02 FIX-3 | P1 | — |
| 02-4 | §0 :15/:16/:26/:12/:107/:302/:2338 | The mechanical re-pin batch + the census re-verification sentence + the posture label R24→R27 | spec-02 FIX-4 | P2 | — |
| 02-5 | §13B :1629→**:1646**; §8.1 note :822→**:836** | Line re-anchors | spec-02 FIX-5 | P2 | — |
| 02-6 | Testing :2621/:2623/:2645/:2578 | The fixture-pointer set (10s-test-pattern OR re-point to 10s-red; single-clip.json; the §6.4 dangling capture-harness pointer; the OPFS facet mis-point) | spec-02 FIX-6/FIX-7 | P2/P3 | ⚠ register-in-17 vs re-point (the 17 §5 edit must land in the same wave) |

### 1.03 — 03-playback-engine.md (owner: spec-03)

| Row | Site | Edit | Source | Pri | Conflict |
|---|---|---|---|---|---|
| 03-1 | §0 :16 | The census re-declaration (31=28+3, the exported Record) + 632/632 + the getLoopRegion rider | spec-03 F-1 | P1 | — |
| 03-2 | §0 :17 | The WDC re-pin + the S-series block (the drafted text) | spec-03 F-2 | P1 | — |
| 03-3 | §0 :18/:19 | The app re-pin + the three dead-clause flips (M28R LANDED; W-E loop bridge LANDED; the five missing landed surfaces appended) + the consumer pins | spec-03 F-3/F-4 | P1 | — |
| 03-4 | §0 :24/:26 | The D30 GAP flip (K3 LANDED) + the waveform-prerequisite re-scope (MET at R25) | spec-03 F-5/F-6 | P1 | — |
| 03-5 | NEW §7.7 | Insert the **seek-gesture COMMIT seam** (HA-3-2: preview core-direct/flood law + exactly ONE `timeline.seek` on commit; the click-seek venue) | spec-03 F-7 | P1 | — |
| 03-6 | NEW §8.5 | Insert the **composed transport×element rate law + the pitch projection chain** (the cluster-b half: `varispeedRate = segRate × tr`, the six pinned laws, the [1/32,32] composed domain, the preservePitch chain) | spec-03 F-8 | P1 | — |
| 03-7 | §8.3 flush caveat; §9.2A stall law; §13E re-pin; §13.A provenance; Testing | The M2 flush note; the playback-continuity cross-ref (cluster-d); the §13E re-pin (player.ts 3,695); the /tmp provenance note; the JKL Tier-3 row re-truth + the fixture registrations | spec-03 F-9..F-13 + P3 batch | P2/P3 | ⚠ fixtures route to 17 §5 in the same wave |

### 1.04 — 04-renderer-color.md (owner: spec-04)

| Row | Site | Edit | Source | Pri | Conflict |
|---|---|---|---|---|---|
| 04-1 | §0 BASE :15 | The Gaussian-Blur default flip **4→10** (F2-5; `GAUSSIAN_BLUR_DEFAULT_RADIUS` :210; the coherence pin) + the same-frame refreshes (:223→**:257**, :161→**:179**, 113→**151**, the OV-05 N1 append) | spec-04 Row 1 | P1 | — |
| 04-2 | §0 GAP rows :22/:23/:24/:26 | The re-anchor family (GPU_EFFECT_TYPES :1492/:1529/:1535; the 8→10-bit substance append; the Z2 landed flip + the R9-c re-filing note; the NS-4/r1-port adjacency) | spec-04 Rows 2-5 | P2 | — |
| 04-3 | §8 intro + §8.5 :667 | Insert the **venue-law cross-link paragraph** (canonical table = 08; this is the renderer-side index) + replace the ×1023 shorthand with the 08 §18 pointer | spec-04 Rows 6-7 | P2 | ⚠ must land WITH 08 F5 (cluster-f) |
| 04-4 | §13D + §16.5 + §17 :2301 + Row 13 | The 3 stale cites + header (748/57,064/`f9ac806`); the POST-GRADE scope ruling (rides 08 F9b); the 33ms-cite fix (08 §2 owns it); the pin re-key | spec-04 Rows 8-10/13 | P2 | ⚠ 04:2106's wording depends on the 08 §11 ruling (cluster-f) |
| 04-5 | §6.1 :296; §7.1 :494 | `MediaInfo`→`MediaRecord.colorInfo`; the 00 §5 DegradedRendererBanner pointer | spec-04 Rows 11-12 | P3 | — |

### 1.05 — 05-timeline.md (owner: spec-05)

| Row | Site | Edit | Source | Pri | Conflict |
|---|---|---|---|---|---|
| 05-1 | §0 :14 + §16.5 :1260 | The census re-declaration (the enumeration names retired verbs — rewrite; delete the runner-local premise) | spec-05 P1-1 | P1 | — |
| 05-2 | §0 :15 | The tree census (41 files/9,176 LOC; use-keyframe-authoring 262L; the 22-file hook family) | spec-05 P1-2 | P1 | — |
| 05-3 | §0 :16-17 | The app census (42 = 36+5+1 @ `6e2b91a`; the D27-F17 doc EXISTS; retire the 7-carrier list) | spec-05 P1-3; scout-app | P1 | — |
| 05-4 | §8.1 :344 + §8.9 | The ToolMode enum fix (nine-tool reality or the re-point to 18 §4.5) + the T/Y/U key rows | spec-05 P2-4; mock-trim N-7a | P2 | ⚠ two drafted options — pick one (recommend the re-point) |
| 05-5 | §8A :607/:623/:624/:626 | Convert the interim-carrier citations to **testid keys** (drifted twice in two rounds) | spec-05 P2-5; mock-variants rec 5 | P2 | — |
| 05-6 | §8A ghost row; §7.2; §8.10-new | The split-ghost/scrollIntoView/zoom-floor/refusal-scroll sub-laws; the per-track waveform visibility law; the keyframe-gesture family row (AR-2) | spec-05 P2-6/P2-7/P2-8; scout-ot #16 | P2 | — |
| 05-7 | §16.4/§16.5/§16.5A | The engine pin refresh via **19 §2A's map** (the six anchors + the op-port family + the no-`retime`-method re-derivation) + the OT row refreshes | spec-05 P2-9/P2-10; 19 §2A/§2B | P2 | ⚠ the "retime :7163" pin cannot be sed-replaced — re-derive the family |
| 05-8 | §16.5A append row; §0 :30; §8A close-out; §16.5A fit-to-fill | The insertBatch LANDED record; the data-test census (69/59-unique basis); the ripple-composite one-liner; the [0.01,5] carrier divergence note | spec-05 P3-11..P3-14 | P3 | ⚠ data-test basis needs the counting-convention ruling (§4-R5) |

### 1.06 — 06-nle-ops.md (owner: spec-06; fed by scout-ot, mock-insert, mock-trim)

| Row | Site | Edit | Source | Pri | Conflict |
|---|---|---|---|---|---|
| 06-1 | §0 matrix :18-27 + BASE :34 + §10.4 :2563-2590 | The big mechanical re-anchor at `f9ac806` (the full F-1 map = 19 §2A) + counts 748/8,997 + the dated re-anchor note (the R24 "UNCHANGED" claim is FALSE) | spec-06 F-1; 19 §2A/§2D | P1-graded P2 | — |
| 06-2 | Matrix :22/:23 + OW-2 :1599 + §10.4 :2582/:2584 | The **E2 flip's three missing sites** + the E1 met notes (matrix cells ↔ GAP rows ↔ §10.4 verdicts must agree) | spec-06 F-2 | P1 | — |
| 06-3 | §5.9D :1638/:1632 | The **AP-1 insertBatch cell rewrite** (LANDED; kind-split + staggered construction; only the append strategy remains) | spec-06 F-3; scout-ot #12; mock-insert R3 | P1 | — |
| 06-4 | §5.12 (after the classic census) | Insert the **companion-field law (R9-b)** — the cluster-b 06-half (absent≡true ⇄ `retime.maintainPitch`; the bridge conversion; the identity laws; 18 §4.4 the UI home) | spec-06 F-4 | P1 | — |
| 06-5 | §10.5 :2594-2626 | The **D-ARCH-6 absorption**: the census ×2, the batch-atomic TRACK_LOCKED re-key (12 commands survive), THREE new rows (insert-batch/keyframe-batch/singular-retirement), the eight drifted method pins | spec-06 F-5 | P1 | — |
| 06-6 | §5.10 + §5.0 :428 | The **duplicate-severs law** (F4; the fan-out row + the base-verb sentence) | spec-06 F-6; scout-nle-ui | P2 | — |
| 06-7 | §11.7 :2700 | The **D11 four-domain lattice** table (+ the [0.1,4] nle-ui venue, stated nowhere) + the §5.9F cross-ref | spec-06 F-7; scout-engine | P2 | ⚠ AW1-2 simplified the lattice (authoring ceiling now +20) — fold before drafting |
| 06-8 | §5.9F FF-3 row | The fit-to-fill domain GAP row ([0.01,5] vs [0.1,5]; the toast re-point; the composite-map header) | spec-06 F-8; mock-insert §4.8 | P2 | — |
| 06-9 | §10 heading note | The /tmp provenance qualification (the 20:8 precedent) | spec-06 F-9 | P2 | — |
| 06-10 | F-10 fold-ins | The §5.11/§5.12 citation split (pick §5.12); the §5.2A/§5.9 pins; "16 public methods"→32 sites; the mute-all note | spec-06 F-10 | P3 | — |

### 1.07 — 07-composition.md (owner: spec-07)

| Row | Site | Edit | Source | Pri | Conflict |
|---|---|---|---|---|---|
| 07-1 | §6.1A (after :367) | Insert the **OV-05 one-input-source law** (the drafted block: BASE = engine field, OVERRIDE = consumer sidecar; the hygiene; the second-home closure; the ×3 pins) | spec-07 Row 1; scout-engine | P1 | — |
| 07-2 | §0 :13 + §12.A.1 :1169 | The Gaussian default twin + the same-frame refreshes (:257/:133/:138/:179/:263) | spec-07 Row 2 | P1 | — |
| 07-3 | §0 :13 census/RR1-A | 113→**151** describes; the five commits; `clampFadeToElementSpan` → **`clampFade`** (the phantom name) + the one-law note | spec-07 Row 3 | P2 | — |
| 07-4 | §0 :15 app row | 418 LOC; :347/:468/:514; the M2 single-owner sidechain story (rewireSidechains DELETED) | spec-07 Row 4 | P2 | — |
| 07-5 | §0 GAP row 1; §0 :14; §6.1A :367; §6.1A F2; §12.A.1 | The parity-corpus re-key + NS-4 register; the OT re-pin + :3115/:181-183; the three stale bits (END-pairing, ENGINE FIELD, the model-home cross-note); the A/V divergent-floors law; the preamble re-base + the 4 drifted rows + the D12 note | spec-07 Rows 5-9 | P2 | — |
| 07-6 | §5.4 + §12.A.1 §5.4 row; §0 engine row; :25 | **RA-V1-1 registration** (anchorX/anchorY — zero corpus mentions; the five-site hardening); the R9-c re-filing register; battery_r24→r27 | spec-07 Rows 10-13 | P2/P3 | — |

### 1.08 — 08-color-grading.md (owner: spec-08; fed by mock-color, mock-variants, mock-verdicts)

| Row | Site | Edit | Source | Pri | Conflict |
|---|---|---|---|---|---|
| 08-1 | NEW §4.3a | **Amendment A — the wheels gesture law** (R25-A3: relative/accumulating trackball, live preview, one undo/gesture, master dial + Ctrl/Cmd + Shift-absolute, dbl-click color-only reset) + the three companion edits (:956 Q9; §19's :2391-2399 test rewrite; 18 §5A:301's exception cross-ref) | spec-08 F1 | P1 | ⚠ F2's model ruling FIRST (§4-R3) |
| 08-2 | OPEN decision filing | **A3's editable YRGB vs §16.A's (hue,amount)+scalar** — file BEFORE F1's prose (options a/b/c; WIDEN-via-projection recommended) | spec-08 F2; mock-variants rec 3 | P1 | ⚠ the ruling (§4-R3) |
| 08-3 | NEW §20 | **Amendment B — the node-graph execution model** (ordered node lists; serial v1; N sequential fragment passes; identity-skip; keyframing OUT; C56 closure) | spec-08 F3 | P1 | — |
| 08-4 | NEW §21 | **Amendment C — the C50 ruling** (clip grades = per-element effect records; the timeline GradeRecord — a 09-side row; the sequential law normative; the D29.5c boundary) | spec-08 F4 | P1 | ⚠ the 09-side GradeRecord row must land in the same set (cluster-f) |
| 08-5 | §0 D-row | **Amendment D — the venue law** (the mock-color §5 paragraph verbatim; cross-linked 04 §8) | spec-08 F5; mock-color §5 | P1 | — |
| 08-6 | §5.1 :299-300 + :330-332 | **The D37 ruling proposal — the curve composition order** (adopt y∘ch; the three edits + the dual-curve test + the parity-fixture rider; do NOT cite "Resolve's order" unsourced) | spec-08 F6 | P1 | ⚠ needs the §4-R1 ratification before apply |
| 08-7 | §19 :2173-2180 | The packing-test field-list rewrite (§4.2's WheelsParams verbatim — the test cannot pass as written) | spec-08 F7 | P1 | — |
| 08-8 | §0 :16 | The W-B row re-truth (the three stale clauses → the W2 state + the R25-A2 TAB supersession registered forward) + the counts + the C59 pointer fix | spec-08 F8; mock-variants rows 1-2 | P1 | — |
| 08-9 | §11 riders | The three scope laws: playhead-frame trigger; **post-grade** measured signal (rules 04 §16.5); on-GPU render/readback-fallback | spec-08 F9 | P2 | — |
| 08-10 | §8/§9 riders; §5.4 + §19's two test fixes; F12 batch | The matte-finesse OUT-ruling + eyedropper seed law + BT.709 statement; the window venue/tracking OUT/defaults; the curves refresh + the luma-only test fix; the pin batch | spec-08 F10/F11/F12 | P2/P3 | — |

### 1.09 — 09-project-model.md (owner: spec-09; fed by scout-nle-ui, scout-ot, scout-app)

| Row | Site | Edit | Source | Pri | Conflict |
|---|---|---|---|---|---|
| 09-1 | §3.1 :173-175/:177-178 + §3.1A B2 :337 | **Cluster-a+ cluster-b's model home**: the volume-domain law (linear gain 1=unity; [−60,+20] dB authoring; ONE HOME opencut core/audio-params; absent≡0dB; NaN→DEFAULT) + the preservePitch ruling (absent≡true; the projection; the identity laws) — the full drafted B2 text | spec-09 §4-A; scout-engine/nle-ui/app | P1 | ⚠ the "0..1→linear-gain" wording (scout-nle-ui's "stays 0..1" vs the correction) — one author, cluster-a |
| 09-2 | NEW §3.3A + §0 :14 companion | **The D-HB2 scene-load boundary** (rejected-whole class list; the round-trip law; the raw-constructor escape hatch; `timeline-core.ts:2443-2537`) | spec-09 §4-B; scout-ot #14 | P1 | — |
| 09-3 | §0 :21 | The file-affordance GAP flip → CLOSED (R9 W-E `b40216e`) | spec-09 §4-C | P1 | — |
| 09-4 | §3.1 :193/:235-244/:151-199/:372; :335 B1; :967; §3.2 | The schema-block corrections: retire `transitionIn`; the S3 `TransitionJSON` re-shape; add `isSourceAudioEnabled`; delete the project-level Zod markers; the duplicate-severs twin (B1); the LibraryAudioElement scope note; the MediaTime ticks sentence | spec-09 §4-D | P1/P2 | — |
| 09-5 | §0 re-pin batch :14-:24 | The E-family mechanical re-pins + the D2e field-law list refresh (preservePitch/volume engine-owned) | spec-09 §4-E | P2 | — |
| 09-6 | §7/B2/F-family P3s | The `pan` strip-layer annotation; the registered-delta sentence; the SceneJSON timestamps note | spec-09 §4-F | P3 | — |

### 1.10 — 10-fcpxml-export.md (owner: spec-10)

| Row | Site | Edit | Source | Pri | Conflict |
|---|---|---|---|---|---|
| 10-1 | §0 :21 | The **Z2 GAP flip** → CLOSED (deliverService.ts:300-324; the R9-c re-filing note) | spec-10 FIX-1 | P1 | — |
| 10-2 | §0 :14 | The workletFlushMs venue-law insert (the r5 dependency) | spec-10 FIX-2 | P2 | — |
| 10-3 | :4/:12/:15/:14/:24/:20 | The re-pin batch + the D-HB2 serialization clause + the DeliverPage W4 extension + the F3 note | spec-10 FIX-3 | P2 | — |
| 10-4 | §4 :319-321/:407-410/:400-402/:490-503/:475-476/:586-592 | The model-coherence fold (N1 inline elements; the volume export law — **cluster-a's fourth consumer**; preservePitch → `preservesPitch` — cluster-b's export half; the S3 `presentation` keying + the alignment term; `scene.markers`) | spec-10 FIX-4 | P2 | ⚠ rides clusters a/b — same wave |
| 10-5 | §4.8 :603-646 | The NTSC/1001 family fix (one frame = `denominator/numerator` s; delete the wrong discriminator; §11.4 the oracle) | spec-10 FIX-5 | P2 | — |
| 10-6 | §12 refresh; §16 fixtures; FIX-8 polish | The R27 note + the re-anchored pins; the fixture disambiguation note; the P3 set (Goal 6 pitch; the text-element nesting; reverse in KNOWN_LOSSY; srcEnable annotation) | spec-10 FIX-6/FIX-7/FIX-8 | P2/P3 | ⚠ 17 §5.3 registration rides the same wave |

### 1.11 — 11-cloud-render.md (owner: spec-11 — ZERO P1s)

| Row | Site | Edit | Source | Pri | Conflict |
|---|---|---|---|---|---|
| 11-1 | §0 :16/:12; §14R | The four moved pins (DECISIONS :242; orchestrator :544; api 2,777; export/ 1,806) + the R27 round-note | spec-11 F-1/F-2/F-3 | P2 | — |
| 11-2 | §14 :1434-1440 | The dependency-LOC column (or the strike-to-brackets form) | spec-11 F-4 | P2 | — |
| 11-3 | Testing :2501 | The websocket row's method+section fix (POST / §8.7) | spec-11 F-5 | P2 | — |
| 11-4 | F-6..F-11 riders | The D6/r4 adjacency; the D12 venue note; the one-engine clarification; **the heartbeat disambiguation** (cluster-d); the two-world note; the provenance line | spec-11 F-6..F-11 | P3 | ⚠ F-9 must land with 02 §7.4 (cluster-d) |

### 1.12 — 12-testing-strategy.md (owner: spec-12-13)

| Row | Site | Edit | Source | Pri | Conflict |
|---|---|---|---|---|---|
| 12-1 | Status :4 | The R27 re-pin block (all seven repos + the census + the battery lineage + the instruments re-key) | spec-12-13 F-1 | P1 | — |
| 12-2 | §0 BASE :14 | The full fleet row re-write (25 test files; 632/72 entries; 8-suite roof; consumer pins; mini/variants in-flight framing) | spec-12-13 F-2 | P1 | ⚠ mini/variants figures: cite the register's declared figures, re-key at WRAP |
| 12-3 | K1 :18 / K2 :19 / K3 :20 | The growth sentences; the M49C origin-attribution + exported-registry rewrite; the W-F LANDED append (the AR-2 gesture pin — registered NOWHERE else) | spec-12-13 F-3/F-4/F-5 | P1 | — |
| 12-4 | ACCEPTANCE :36 | The battery-posture re-write (battery_r27 + the new check classes — feeds W-D) | spec-12-13 F-6 | P1 | — |
| 12-5 | K2 GAP :26 | The mode-matrix registration growth (D30.1/D30.3 zero-orphan-rows) | spec-12-13 F-7 | P1 | — |
| 12-6 | K3 audio :28 + §13.7 :1493 | The waveform prerequisite MET flip + the R27 annotation | spec-12-13 F-8 | P2 | — |

### 1.13 — 13-subagent-scout-plan.md (owner: spec-12-13)

| Row | Site | Edit | Source | Pri | Conflict |
|---|---|---|---|---|---|
| 13-1 | Status :4 | The R25/R26/R27 process-history entry (33 agents; execute+review NO fleet dir; the 55+-dispatch grid) | spec-12-13 F-9 | P1 | — |
| 13-2 | §0 :14 | The pin block re-key | spec-12-13 F-10 | P1 | — |
| 13-3 | §0 :12 + §2 :53 + GAP/ACCEPTANCE | The six standing process laws (briefing-hypothesis; count-authority; multi-pass; integration-round; cross-repo filing; live-scrape battery) + the modern grids + the battery lineage | spec-12-13 F-11/F-12/F-13 | P2 | — |

### 1.15 — 15-wire-protocol.md (owner: spec-15 — the census home)

| Row | Site | Edit | Source | Pri | Conflict |
|---|---|---|---|---|---|
| 15-1 | §0 :14 | **The 31-verb re-declaration** (the paste-ready block: routed 28 + exceptions 3 + the lineage tail + the M49C/origin-attribution law) — THE census set's source text | spec-15 P1-1/§3.1; xcut-census | P1 | ⚠ the 29-of-78 counterpart rider (cluster-e/§4-R4) |
| 15-2 | §0 :14 NOTE + :30 R8 + §13.15 :4901/:4905 | The **AR-2 consumption-law row** (the exported Record; the deleted runner copy; the app's live import) | spec-15 P1-2 | P1 | — |
| 15-3 | §13.15 :4915 | The **keyframe-batch QUEUED→LANDED flip** (+ the three r1 param-alignment decisions recorded) | spec-15 P1-3; scout-ot #6 | P1 | — |
| 15-4 | §13.15 :4916 | The **insertBatch QUEUED→LANDED flip** (the bare-verb-vs-superset decision stays OPEN) | spec-15 P1-4; scout-ot #7 | P1 | — |
| 15-5 | §4.1A :320 | The Keyframe row re-key (the retired singulars; the plural forms) | spec-15 P1-5 | P1 | — |
| 15-6 | P2-1..P2-5 + P3-1..4 | The pin re-base family; the §4.1A/§13.15 re-anchors (incl. `:2559/:2565`); the batch-atomic TRACK_LOCKED; the V-S16 §7.1A extension; the census-clause sweep (the four r1 rows' phasing verified INTACT); the P3 riders | spec-15 P2/P3 sets | P2 | — |

### 1.16 — 16-keyboard-shortcuts.md (owner: spec-16)

| Row | Site | Edit | Source | Pri | Conflict |
|---|---|---|---|---|---|
| 16-1 | §0 R5 :29 / R6 :30 / Z4 :31 + BASE :15/:17/:23 | The **D30 W-D trio flips to LANDED** (the drafted texts) + the three BASE-row re-keys | spec-16 F-1 | P1 | — |
| 16-2 | :4/:19/:34/:2141/:2148/:2398/:2423 | The pin/count family (27-row map; the two drifted engine pins :999-1000/:196) | spec-16 F-2/F-9 | P1(mech)/P2 | — |
| 16-3 | §3.4A :263 | The dormant-shells clause re-truth (the source viewer EXISTS since R25-W1) + the C46 5s-pseudo-duration rider | spec-16 F-3; mock-verdicts OQ2 | P1 | — |
| 16-4 | §3.2 :194; §3.5; §3.12 :446; §3.1 :170 | The FX-tool owner re-scope (18 §4.5 pending); the mute family (F4-7 + the set-all verbs); the D-ARCH-6 rider (NO keyboard row re-keys — the gesture seams are pointer-only); the source-viewer JKL context (V4) | spec-16 F-4..F-7 | P2 | ⚠ the F4/F-5/FX-tool rows pair with 18 F-11 — same wave |
| 16-5 | §0 :24; :16; F-11/F-12 | The K3/OT re-truth (the app divergence CLOSED; the C16 hazard re-pinned — the residue routes to the plan); the mini V/X rows; the 18→20 conflict-count fix | spec-16 F-8/F-10/F-11 | P2/P3 | — |

### 1.17 — 17-test-plan.md (owner: spec-17)

| Row | Site | Edit | Source | Pri | Conflict |
|---|---|---|---|---|---|
| 17-1 | :4/:20/:2359/:2730/:2794 | The fleet re-pin (one text, five paste sites — the drafted R27 block) | spec-17 F1 | P1 | — |
| 17-2 | Five sites (:4/:20/GAP24/K2 :38/:2360) | The M49C 28/3 re-key | spec-17 F2 | P1 | — |
| 17-3 | GAP rows 26/28 + K3 :39 | The K3 instrument flips (waveform LANDED; zero-no-op LANDED; the LIVE-registry law + the AR-2 gesture pin) | spec-17 F3 | P1 | — |
| 17-4 | §17A + §0A + §13A.7 | The **8-suite roof** re-write (252; 151/22 real-mouse) | spec-17 F4 | P1 | — |
| 17-5 | GAP 24 + §13A.7 | The **10-mode matrix registration** (D30.3 zero-orphan-rows) | spec-17 F5 | P1 | — |
| 17-6 | F6..F14 | The VLM coordination note; **the diagnostics facet row** (cluster-d); the D-HB2 mirror (cluster-c); §13A.5's citations; the battery row; K1/K4 counts; the re-key policy; §14.2's ≈ line numbers; the OV-12 registration | spec-17 F6..F14 | P2/P3 | ⚠ F6's VLM sequencing (amendments land before their VLM pass) |

### 1.18 — 18-ui-shell.md (owner: spec-18; fed by mock-variants/mock-verdicts)

| Row | Site | Edit | Source | Pri | Conflict |
|---|---|---|---|---|---|
| 18-1 | §4.8 :222 | The RangeBand coexistence + the mouse/keyboard drag split | spec-18 F-1; mock-variants row 1 | P1 | — |
| 18-2 | §4.3 :174/:175/:176 | The A1 source-viewer law (poster transport; stills 5s full transport + strip-dimming-never-image; the priority ladder) — the three-part amendment | spec-18 F-2; mock-verdicts V1/V6 | P1 | ⚠ the poster-dim conflict (§4-R7): the strip-only form is drafted |
| 18-3 | §4.11 :249 | The **A1 routing canon** (replace-never-stack, three doors, 1ms refusal, empty-lane no-op, dbl-click) | spec-18 F-3; mock-variants row 3 | P1 | — |
| 18-4 | §4.4 :189/:184 | **The B2 rewrite** (the Gain dB rail [−60,+20]; the D28-A2 law; the §5.12 re-point + the absent≡true append) — cluster-a's 18-half | spec-18 F-4; scout-engine #91-92 | P1 | ⚠ cluster-a (one author with 09 B2 + 20 §4.1 + 10 §4.4) |
| 18-5 | §8.8 + §4.8 | The mixer registered-divergence note + the three-way page-set re-scope (3-vs-4-vs-5) | spec-18 F-5 | P1 | — |
| 18-6 | §9 :407 | The playhead token fix (`--playhead` #fa1024; time ≠ state) | spec-18 F-6 | P1 | — |
| 18-7 | §0 :17 ledger clause | The preserve-pitch mock-local deletion (R9-b made it model-backed) | spec-18 §1 ledger row; scout-nle-ui | P1 | — |
| 18-8 | F-7..F-12 | The §9 house-map + CSS-layering + color-token pointer; §5's three tool rows (ripple/slip/slide); §5A's directional cursors + the wheels exception (cluster-f's 18-half); the refresh law; the FX tool (16's twin); the view-flag upgrade | spec-18 F-7..F-12 | P2 | ⚠ F-9b + F-11 must land with 08 F1 (cluster-f) |
| 18-9 | F-13/F-14 | The pin family; the §15 Q1/Q3 re-points | spec-18 F-13/F-14 | P2/P3 | — |

### 1.19 — 19-code-references.md (owner: spec-19 — THE register authority)

| Row | Site | Edit | Source | Pri | Conflict |
|---|---|---|---|---|---|
| 19-1 | Header + §0 + §0A + §2.1 + §9 | The fleet re-pin (F-1's full block; 22 `c15a629` hits; the R27 paragraph) | spec-19 F-1 | P1 | — |
| 19-2 | :21/:139/§12 item 8/C8 | The **projector re-type** → LANDED-AS-BRIDGE (D12; the parity corpus the open half; 00 D16's path becomes illustrative) | spec-19 F-2; scout-engine #97 | P1 | — |
| 19-3 | 11 sites (:5/:16/:26/:32/:73/:150/:153/:155/:309/:352/:365/:413) | The 31=28+3 family (the enumeration rewrites; the exported-registry premise) | spec-19 F-3 | P1 | — |
| 19-4 | :18/:216/§8 | The app census re-declare (42=36+5+1; `.agents/` landed; the D-ARCH-6 queue) | spec-19 F-4 | P1 | — |
| 19-5 | §3.1/§3.2/§3.3A-C | The four module cards' re-base (the engine card incl. the 748 lineage; the bridge family; the OT/WDC/nle-ui/app register rows — the WDC S-series block; the 3-copies-not-shims label) | spec-19 F-5/F-6 | P1 | — |
| 19-6 | §3.5/§3.6 + §0 mock rows | The mock cards (in-flight recons; 1,762 declared vs live) | spec-19 F-7 | P1 | ⚠ WRAP-only re-key (§4-R8) |
| 19-7 | §5/§6/C-ledger | The re-anchor set (the DRIFTED rows: #12/#30/#31/#27/#18/#1/#6/C1/C2 + the dated re-verify line) | spec-19 F-8 | P2 | — |
| 19-8 | §0/§9 new rows | The NS-1..NS-5 queue + the r1-port collision map + the D12 note + the 2A.10 pointer + the OV-12 gate + the ledger #34 cautionary row | spec-19 F-9 | P2 | ⚠ NS-4's home (§4-R6) |
| 19-9 | :150; §10 usage rules | The view-fixture "planned" tense; the symbol+file citation recommendation | spec-19 F-10/§5-U9 | P3 | — |

### 1.20 — 20-audio-core.md (owner: spec-20; fed by scout-engine, scout-wdc, scout-app)

| Row | Site | Edit | Source | Pri | Conflict |
|---|---|---|---|---|---|
| 20-1 | :21 | The **FIVE-test-ports flip** (G1 `3a28b6e`; the 106-it disposition table) | spec-20 FIX-1 | P1 | — |
| 20-2 | :26 | The **K3-audio-pins flip** (LANDED @ `44e8049`; the 9 pins; the VLM half remains) | spec-20 FIX-2 | P1 | — |
| 20-3 | :17/:20/:102/:114-125/:145-153/:184 | The **M2 Wave 1 cluster** (six coordinated edits: the app BASE row; the GAP row fold + Waves 2-3 re-split; `AuxBusSettings.muted` + the F-1 bus law; §5's laws 9-10 + the flush law; §7's re-scopes; §10's facet rows) | spec-20 FIX-3 | P1 | — |
| 20-4 | §11 file-map + §0 WDC row + §9 | **The diagnostics/heartbeat registration** (the audio-side rows + the 02↔20 two-way link) — cluster-d's 20-half | spec-20 FIX-4 | P1 | ⚠ same anchors as 02 §7.4 (cluster-d) |
| 20-5 | :209 | The instruments row split (7 shims + **3 verbatim copies** — the "(shims)" label is FALSE) | spec-20 FIX-5; scout-wdc | P1 | — |
| 20-6 | FIX-6 a-i | The mechanical batch (777/34 files/lock `f5011b3`; the survival note; the venue rewrites; 96→99 ×2; the manifest census; :8; §12.2) | spec-20 FIX-6 | P2 | — |
| 20-7 | §4.1 volumeDb row | **The domain-coherence row** (cluster-a's 20-half; the ONE HOME statement) | spec-20 FIX-8 | P2 | ⚠ cluster-a (one author with 09 B2) |
| 20-8 | FIX-7 a-e | The v-next-4 status; the D12 note; the MIDI W7/M3 registration; the 22-class fix; the N2b RC-V1 residuals | spec-20 FIX-7 | P3 | — |

### 1.P — IMPLEMENTATION-PLAN.md (owner: xcut-plan; seeded here)

| Row | Site | Edit | Source | Pri | Conflict |
|---|---|---|---|---|---|
| P-1 | S-app row | The **maintainPitch residual is DEAD TEXT** (landed; tick DONE with the commit evidence); re-base the census rows (42 = 36+5+1; 252) | scout-app §3; spec-00 X-9 | P1 | — |
| P-2 | S-app row (5) + :54 K3 (d) | The audio-pins hard-gate flip (the promotion LANDED + the pins LANDED; the VLM-only remainder) | spec-20 §4-6 | P1 | — |
| P-3 | S-engine row / r1 entry | Register the **NS-1..NS-5 design queue + the r1-port collision map** (nowhere in the corpus) + the Stage-0 mechanism decisions (linkage/constants/E3+N3) | scout-engine §3; 00 fact 14; mock-leverage §5 | P2 | ⚠ the D38 candidate (xcut-plan's call) |
| P-4 | S-wdc row | The queue re-write (the S-series absorbed; "zero upstream drift" FALSE; the missing docs-wrap item; the FIVE ports flip) | scout-wdc §3 | P2 | — |
| P-5 | :20/:33 R3-verify + :42 pin world | The re-pins + the K2 gate's mode-matrix growth confirmation | scout-app; spec-12-13 X-5 | P2 | — |

### 1.R — REFERENCE-REGISTER.md (owner: the xcut-register class; WRAP-timed)

| Row | Site | Edit | Source | Pri | Conflict |
|---|---|---|---|---|---|
| R-1 | Rows 2/3/4/7/16/17 + header :13 | The count re-keys + the three description rewrites (row 4's coexistence; row 16's W2 + the A2 supersession registered forward; row 3's stills clause death) | mock-variants §3 (11 edits); mock-verdicts §3.1 | P2 | ⚠ WRAP-only re-key for the sibling-moved counts (§4-R8) |
| R-2 | NEW rows | The mixer family row + the view-state/ViewOptionsPopover row | mock-variants §3.7/3.8 | P2 | — |
| R-3 | C-ledger + OPEN table | C40/C44/C57 folds; the A3-vs-16.A OPEN row; the C50 "spec-side ruling LANDED" note after 08 F4 | mock-variants §3.11; mock-verdicts §3.1 | P2/P3 | ⚠ after the §4-R3 ruling |
| R-4 | rows 1/14 + the compact-family notes | The sibling-wave movements recorded (the playhead-z + ruler-clamp register-row class) | spec-05 §4-7 | P3 | — |

### 1.B — battery_r27 (owner: the W-D wave; class list consolidated)

| Row | Class | Source | Pri |
|---|---|---|---|
| B-1 | The re-pin classes: all five modules + both consumer-pin sets + census 42@6e2b91a + the 28+3 census-firing class + the 2A.10 live-registry class + the **ARCH-R27 "(739)" trap** (748 is the truth) | spec-00 X-10; scout-engine OQ1; spec-05 §6 | P1 |
| B-2 | The count-consistency class re-keyed: "engine 748 + OT 632 across 00/17/19"; the OT total-only convention (the split changed shape); the origin-attribution clause | spec-17 F10; spec-12 F-6; spec-19 hooks | P1 |
| B-3 | The line-pin re-base map as ONE consolidated battery-able input (19 §2 — the 12 exact-pin ledger rows machine-checkable: "9 of 12 held, 3 drifted" this round) | spec-19 §4; spec-12 X-3 | P2 |
| B-4 | The exemption pair `(11, 13)` carries forward; the r6 drift-canary (11's verbatim plan quote) | spec-11 §4-8 | P2 |

---

## §2 THE ONE-AUTHOR RULES (the cross-spec coherence clusters — single amendment units, one landing each)

These MUST land as one authored set — byte-coherent statements, applied in one commit each, or the corpus forks the law across two files. The author-notes are the drafted text's home.

**(a) The volume-dB B2 set** — `09 §3.1A B2 (spec-09 §4-A) + 20 §4.1 volumeDb (FIX-8) + 18 §4.4 (F-4) + 10 §4.4 (FIX-4b) + the AW1-2 notes (00-4, 12-3, 17-1)`. Law: persisted LINEAR gain (1 = unity; the R15 "0..1" range reading corrected — the linear span of the domain is [0.001, 10]); authoring/display dB **[−60, +20]**; **ONE HOME: opencut's `core/audio-params.ts`** (`VOLUME_DB_MIN/-MAX/DEFAULT_VOLUME_DB/clampVolumeDb/volumeDbToLinear`, engine `opencut-laws.ts:54-79` deep-imports); absent≡0 dB≡unity; NaN→DEFAULT then read-as-absent. Author-note: spec-09's Edit 3 is the master text; 20's FIX-8, 18's F-4, 10's FIX-4b quote it. ⚠ the "0..1" wording: land ONE form (the linear-gain correction, not "stays 0..1").

**(b) The preservePitch set** — `09 §3.1/§3.1A B2 (Edits 1+3's preservePitch half) + 06 §5.12 (F-4) + 03 §8.5's pitch half (F-8) + 10's preservesPitch mapping (FIX-4c) + 18 §4.4's citation fix (F-4b) + the 06 §5.11→§5.12 split (F-10)`. Law: `el.preservePitch` is ElementJSON law, **absent≡true**; the engine's `retime.maintainPitch` is the runtime projection (absent≡false there — the bridge converts `el.preservePitch !== false`); the back-projection writes only explicit false; the dormant-false-at-rate-1 reload drop is the APP load-bridge identity law; a preservePitch-only patch keeps the rate (read-merge-write). Author-note: spec-09's Edit 1 + spec-06's F-4 are the co-homes ("one DECISIONS entry" — scout-nle-ui). Route the D-registration through §4-R2.

**(c) The D-HB2 set** — `09 §3.3A (spec-09 §4-B, the full boundary law) + 09 §0:14's companion pointer + 17 §7.7's round-trip mirror (F8) + 12 §9's test-plan mirror line + 10 FIX-3's serialization clause`. Law: `TimelineCore.fromJSON` is the scene-load boundary — typed rejected-whole errors before any normalization; the rejected class list; the round-trip law (toJSON always passes); the raw-constructor escape hatch; never normalizes retimes (feeds cluster-b's identity attribution). Author-note: spec-09 §4-B is the master; the mirrors are one-liners.

**(d) The diagnostics set** — `02 §7.4 (FIX-1 — the DRAFTING HOME, the five laws) + 20 §11 file-map rows + §9's two-way 02↔20 link (FIX-4) + 11's heartbeat disambiguation (F-9) + 17's facet row (F7) + 03 §9.2A's playback-continuity cross-ref (F-10) + 12's test-class-5 rows`. Law: the EngineDiagnostic bus + the heartbeat monitor + the in-`process()` protocol + the stall bypass-to-passthrough ladder + the rt-safety-gate transitive-heritage fix — all four file:line anchor sets must be IDENTICAL in every citing spec (`diagnostics.ts:1-376`, `dsp-effects-worklet.js:315-380`, `effects.ts:441-507`, `rt-safety-gate.ts:140-187`). Author-note: spec-02 FIX-1 is the master text; the 11 F-9 clause defuses the corpus's only other "heartbeat".

**(e) The census set** — owned by **xcut-census** (the sibling W4 report): the 31=28+3 re-declaration family (15 §3.1 = the paste source; ~30 sites across 00/05/06/12/15/17/18/19), the counterpart arithmetic (29-of-78 natural reading — ⚠ §4-R4), the origin-attribution law, the exported-registry facts, the lineage tail, and the AR-2/2A.10 consumption-law pairing. This register routes every census site to xcut-census's consolidated text; do not hand-edit variants.

**(f) The color set** — `08 F1-F6 (+F7-F12) + 04's venue cross-link (Row 6) + 04 §16.5's post-grade ruling (Row 9, wording from 08 F9b) + 18's exceptions (F-9b's wheels dbl-click + F-11's FX tool) + 16 F-1's modifier-grammar registration + 17's facet rows + the 09-side GradeRecord row (08 F4's cross-spec note) + mock-color §5's venue paragraph (the F5 text)`. Sequencing: **§4-R1 (curve order) and §4-R3 (A3-vs-16.A) rule FIRST** — F1/F6/F7 carry the ruling-dependent text; F3/F4/F5/F8 are ruling-free and can land in W-B. Author-note: spec-08's fix-list is the master; one author lands 08+04+18's color rows in one pass.

**(g) The D12 ratification note set** (added — smaller but same class): `00 P2-6 (the master note) + 01 F-2 + 04 Row 13 + 07 Row 9's preamble note + 11 F-7 + 20 FIX-7b + 19 F-9's pointer`. One dated note, seven mirrors.

**(h) The M2 Wave 1 set**: `20 FIX-3 (six edits, the master) + 02 FIX-2/FIX-3 + 07 Row 4 + 03 F-9 + 10 FIX-2 + 11 F-8`. The single-owner sidechain law + the flush law + the venue law, one story.

**(i) The line-pin re-base**: **19 §2 (2A/2B/2C/2D) is the single input** — 06 F-1, 05 P2-9, 04 Row 8, 07 Rows 2/3/9, 02 FIX-5, 03 F-11, 11 F-1..F-4, 15 P2-1/P2-2, 16 F-9, 17 F13, 01 F-4/F-8 all consume the same map. Apply once, verify by the B-3 battery class.

**(j) The E1/E2 flip closure** (06-2) + the matrix/GAP/§10.4 intra-file consistency rule — spec-06's "E2 half-flip class" is the one intra-file coherence check the battery should adopt.

**(k) The 8-suite roof + K-instrument re-key** (12-2/12-3/12-4, 17-3/17-4, 19-4, 09's Testing row) — the app census moves as one block.

**(l) The Gaussian default twin** (04-1 + 07-2) and **the Z2 twin** (04's Row 4 + 10-1) — one commit each.

**(m) The mock/coordination register set** (R-1..R-4) — WRAP-timed, mock-variants §3 + mock-verdicts §3.1 as the worklist; the six coordination rules (mock-verdicts §3.2) are the standing law.

---

## §3 THE AMENDMENT WAVES (sequenced for application; each wave ends with its verification step)

### W-A — the mechanical re-pins, census, counts (apply first; everything else cites it)
- **Files:** all 21 specs + IMPLEMENTATION-PLAN (pin block) + REFERENCE-REGISTER (counts).
- **Register rows:** 00-1..00-5, 00-7..00-10; 01-1, 01-4; 02-4/02-5; 03-1..03-4 (the pin halves), 03-11; 04 Row 13; 05-1..05-3, 05-7, 05-8; 06-1 (the F-1 map via 19 §2A); 07-2's pin half, 07-3..07-6's pin halves; 08-8's count half, F12a; 09-5; 10-3, 10-6's §12 half; 11-1/11-2; 12-1/12-2, 12-6; 13-2; 15-1 (paste xcut-census's consolidated block), 15-6; 16-2; 17-1/17-2, 17-6's F10/F11/F13; 18-9; 19-1/19-3/19-4/19-5/19-6/19-7; 20-6; P-1's census half, P-5; R-1's count half.
- **Method:** 19 §2's map is the ONLY line-pin input; 15 §3.1 (via xcut-census) is the ONLY census text; the 8-suite roof text from 12-2. Do NOT re-derive pins per-file (the reports already ⭐-verified them).
- **Verify:** grep-audit — zero remaining `c15a629|5036387|ded43c4|85b81b0|fc4cc35|c885ece|494f6ff|0a49286|3c91ffe|3026099` as LIVE pins (lineage rows exempt per the convention); zero "24 routed + 6" / "458/458" outside history-marked text; the count-consistency triple (748/632/777/690/252) identical across 00/17/19; the mini/variants rows carry the in-flight marker + the WRAP-re-key rule.

### W-B — the new-law drafts (the P1 clusters; the six task-named sets + the one-author set g-l)
- **Files:** 02, 03, 04, 06, 07, 08, 09, 10, 12, 13, 15, 16, 17, 18, 19, 20.
- **Register rows (cluster-ordered):** (a) 09-1 + 20-7 + 18-4 + 10-4b; (b) 09-1's pitch half + 06-4 + 03-6 + 10-4c; (c) 09-2 + 17-6's F8 + 12's mirror + 10-3's clause; (d) 02-1 + 20-4 + 11-4's F-9 + 17-6's F7 + 03's F-10; (e) xcut-census's flips (15-2..15-5, 12-3, 17-3); (f) 08-1..08-10 + 04-3/04-4's rulings + 18-8's cluster rows; then the cluster-free P1s: 02-2/02-3; 03-4/03-5/03-6; 04-1; 06-2/06-3/06-4/06-5; 07-1/07-2; 09-3/09-4; 10-1; 12-4/12-5; 13-1/13-3; 16-1/16-3; 17-4/17-5; 18-1/18-2/18-3/18-5/18-6/18-7; 19-2; 20-1/20-2/20-3/20-5.
- **Sequencing inside W-B:** clusters a-e first (they unblock cross-refs), then 08's ruling-free set (F3/F4/F5/F8/F9), then the ruling-dependent color rows after §4-R1/R3; the D12 note set (g) rides any commit.
- **Verify:** the intra-cluster byte-coherence check (the same law sentence greppable in every citing file — e.g. "absent ≡ TRUE" in 09/06/18; "ONE HOME" in 09/20/18/10; the four diagnostics anchors identical in 02/20/11/17); the E2-flip consistency rule (06's matrix cells ↔ GAP rows ↔ §10.4); a fresh-context read of each cluster's diff.

### W-C — the plan overhaul + the register + the D-index
- **Files:** IMPLEMENTATION-PLAN.md (xcut-plan's overhaul — P-1..P-5 + the D38 candidate), REFERENCE-REGISTER.md (R-1..R-4), 00-master's D-register (the D37+ filings per §4; the v12.0 header).
- **Register rows:** P-1..P-5; R-1..R-4; 00-6 (2A.10), 00-7 (v12.0), the D-notes 00-8/00-9; 19-8 (the NS queue registration).
- **Verify:** the plan↔spec coherence pass (every S-row's evidence cites the amended specs; the maintainPitch dead text gone; the K2 gate's mode-matrix row matches 12/17); the register's 35.2 rule (no drift without amendment); the D-index numbering ratified per §4.

### W-D — the battery + the final verification
- **Files:** `scripts/battery_r27.py` (+ the run + the fold).
- **Register rows:** B-1..B-4 (the class list): the re-pin/census/registry-export/count-consistency/origin-attribution/app-arithmetic classes; the 19 §2 map as a machine-checkable input; the (11,13) exemption; the 739-trap guard.
- **Verify:** battery_r27 green against the amended corpus (the 6 known pin-lag fails retired); the W5 adversarial review consumes THIS document's conflict list; the round-wrap declaration re-keys the mini/variants register rows (the WRAP-timed R rows) — the last applyable act.

---

## §4 THE RULING LIST (what R27 must RATIFY as D37+ — the round's decisions)

**R1 · D37 — the curve composition order.** Adopt **y∘ch** (channel first, luma/master last): 08:299-300's `channel(master(x))` + the bake at :330-332 flip to the mock's pinned order (gradedFrame.ts:83-108; gradedFrame.test.ts:84). Grounds: the parity corpus pins it; it composes with the sequential-pass family; FreeCut's order carries no counterweight — and Resolve's internal order is publicly undocumented (3 web probes; do NOT cite "Resolve's order" in spec text). Non-blocking open verification: a live dual-curve probe may re-open before r3 fixtures. Test ask: the §19 dual-curve test. [spec-08 F6]

**R2 · the preservePitch dual-representation ruling** — register as a **D-entry (D37/D38 slot per R1's outcome)**: ElementJSON field absent≡true; the engine `retime.maintainPitch` the runtime projection; the app threading landed (the R26 HANDOFF's ask, resolved). The companion: **the volume-dB [−60,+20] one-home law** (cluster-a) — 00 §4.5 spotted both as the D37+ candidates; register them together or as D37+D38. [spec-00 §4.5; scout-nle-ui §3; scout-engine]

**R3 · the A3-vs-16.A model question** — rule BEFORE any wheels prose lands: A3's "4 YRGB numeric fields, live, EDITABLE" vs §16.A's verified (hue,amount)+scalar 28-f32 uniform. Options: (a) narrow to read-only; (b) **WIDEN-via-projection (recommended** — Y writes the scalar; R/G/B solve (hue,amount) via `wheelDelta`, zero shader change); (c) true widening (breaking). Must land before the sibling's W3 wheels rewrite + before r3 fixtures. [spec-08 F2; mock-variants rec 3]

**R4 · the counting conventions** (xcut-census's charge, ratified here): (i) the **29-of-78** counterpart arithmetic (the natural reading: +upsertKeyframes via the routed singular, +removeKeyframes via the plural, insertBatch toward insert's slot; `retimeKeyframe`'s singular-absolute has NO counterpart) — state the convention inline so it flips in one place; (ii) the OT count cites the TOTAL only (the 452+30+150 vs 481+151 split ambiguity dies); (iii) the data-test census basis = unique names (59), stated once in 19 §10; (iv) the variants census records BOTH declared + scraped figures. [spec-15 §3.3; scout-ot OQ2; spec-19 U-10; mock-verdicts OQ-7]

**R5 · the plan-overhaul D38** (xcut-plan's proposal, if made): the r1 entry absorbs the collision map + the NS queue + the Stage-0 mechanism decisions (linkage model — "the biggest hole"; the constants module; E3+N3 envelopes). The K2/VLM sequencing rider: our amendments land before the sibling's VLM pass, else their net verifies dead law. [scout-engine §3/OQ4; spec-17 F6]

**R6 · NS-4's home** — a D-level ruling in 00 (it IS the r1 port's shape: "SceneTracks→render-plan adapter or a new compositor input contract") with 04/07 carrying only the contract rows — recommended over burying it in 04 §7. [scout-engine OQ4; spec-04 Row 5; spec-07 Row 5]

**R7 · the mock-verdicts open set** (fold or explicitly defer): the poster-dim conflict (adopt A1's **strip-only** form; ask the sibling's W1 to reconcile §3(c)); the C46 5s-pseudo-duration gate satisfaction (yes — the rider lands with 16-3/09); the 1280×800 floor (mock = registered divergence — stands); the Timeline-grade target model (register row 16 note now, 09 rows at the color round); the custom-JSON deliver preset (DECLINE-class unless the user asks). [mock-verdicts §4]

**R8 · the register-timing law** — ratify mock-verdicts §3.2's six coordination rules as standing law (the sibling's counts re-key at their round-WRAP only; per-wave movements recorded not chased; the REGISTER-PENDING marker; the VLM-expectations rule). Practical consequence for W-A: cite the mini at its register-declared figure + in-flight flag, never the live count. [mock-verdicts §3.2; spec-12-13 X-7]

**R9 · the pin conventions** — engine pin `f9ac806` (docs-only head; code anchor `50b91f5` named alongside), 748 not 739; OT code pin `970948a` @ HEAD `55c81c0`; the D-ARCH-6 consumer re-pin duties recorded as QUEUES (engine OT absorption; app mirror + nle-ui absorb) not as violations. [scout-engine OQ1/OQ2; scout-ot OQ1]

**R10 · the projector re-type** — LANDED-AS-BRIDGE (19 F-2): the D16 illustrative `projector/` path retires; the bridge family is the discharged duty; the parity corpus (S4) remains the open half. [spec-19 F-2]

**R11 · the D-ARCH-6 r1 param-alignment decisions** — pre-filed in 15's flipped rows (the round registers them, r1 rules them): singular-absolute vs plural-delta retime; per-element vs cross-element flat param grouping; bare `insertBatch` vs the `insert{elements[]}` superset. [scout-ot OQ3; spec-15 P1-3/P1-4]

**R12 · the diagnostics disposition** — LAW, not machinery: 02 §7.4 + the cluster-d set are the round's answer to scout-wdc OQ2; ratify so no future round re-litigates. The ChannelEditor [−60,+4] residual is NOT covered by the AW1-2 note — it routes to the plan (§5).

**R13 · the 22-effect count + the "17 DSP" figure** — adopt 20 FIX-7d's form (15 CPU + 3 DspDiagnosed + 4 worklet-family). [scout-wdc OQ3]

---

## §5 THE P-REMAINING FORECAST (what these amendments do NOT cover — the ≤P3 residue map after W-A..W-D)

**Post-amendment state:** every P1/P2 SPEC-TEXT item in §1 is closed by construction. What remains is implementation-side, sibling-side, or design-round material — routed to the plan's workstreams, NOT the spec text:

1. **The nle-ui internal residues** (file under S-app/S-package): the **ChannelEditor `max={4}` clip-gain residual** (19 U-1 — AW1-2 covered the Inspector only; the fleet [−60,+20] claim has a hole); the **C16 `e.repeat` gate** (16 U-4 — absent at OT/app/nle-ui; a held S machine-guns splits; the port file is a carrier so the fix is one W-C-era merge away); the **dead tool radio** (G7-ripple — Clip.tsx:524/:536 refuse all non-select drags); the **hardcoded-24fps slip nudge** (N-4); the Inspector Rate `max={400}` domain-drift pair (scout-nle-ui OQ5); the `layout.tsx` "Z.ai Code Scaffold" residue (three rounds old — 19 §12 item 12b).
2. **The app's D-ARCH-6 duty chain**: the OT mirror re-pin (`6e2b91a`→`55c91c0`) + the **gesture-seam switches** (`use-timeline-actions.ts:452` + `use-keyframe-drag.ts:96` still direct-core — the ported gate goes RED at the re-pin until they switch) + the nle-ui AW1-2 absorb (`83ff8a8`→`32abd58`). The engine's OT absorption (`6e2b91a`→`970948a`). All queued at their owners; the specs record them as queues (W-A).
3. **The engine's residue register**: E1-a..d + E2-a (r1 clarifications) + E3 (rides the r1 port); the R9-c seam-side grade proposal (pending ratification-as-evolution or rejection — the specs carry both movements, the DECISION is future); the NS-1..NS-5 execution; the S4 parity corpus; the projector's open half.
4. **WDC-side**: the S-series **docs wrap** (their HANDOFF/PLAN/SKILL are materially stale — their next session's item, filed via the plan's S-wdc row).
5. **The mock-side alignments** (S-app crawl, mock-insert R1's six-fix batch): RE-2 (replace's wrong law), RO-3 (ripple's unreachable pull), FF-3's mock floor (0.01 vs 0.1), the G14 badge precision, the source-side 1x badge, the stale composite-map header; the reference-HTML card fix (mock-insert R4); the sibling's own W3+ waves (wheels rewrite per A3; the A2 TAB strip) — REGISTER-PENDING until their WRAP.
6. **The K3/K4 tails**: the store/policy halves (unstarted at `c020b2a`); the real-BROWSER worklet venue pin (02's FIX-3 remainder); the VLM net (the plan's item 5); K4 e2e; the r2-r5 phases (async pre-retime in BOTH queues; the S4/Stage-3/Stage-5 ENGINE-GAPs).
7. **The r1 port itself** (the round's biggest remaining work — specced, not implemented): the ten-mode leverage map (mock-leverage §4: 6 algorithmically-complete + 4 composites + replace's greenfield), the Stage-0 mechanism decisions, the D33.5 grammar-carrier sequencing, the C7 rename. The specs are now the complete contract for it — that was the round's point.
8. **Design-round material registered but not ruled**: the 3-vs-4-vs-5 page-set; the node-graph keyframing param-over-time model (08 F3's OUT-ruling); the C56 closure path; the composite undo-unit facade (scout-nle-ui OQ4); the r6 cloud charter (zero P1s, four moved pins only); the D6 re-affirmation gate.
9. **The 17 §5 fixture registrations** (02's test-pattern + 03's two + 10's eight + 16's three-clips) — one r5/r1 corpus-creation wave; the specs record the debt (02-6, 03-13a, 10-6).
10. **Battery-successor hooks**: the "19 §5 ledger pins re-verify" class (9-of-12 held this round) — the standing early-warning for the next round's drift.

**The ≤P3 goal check:** after W-A..W-D, the spec corpus carries ZERO known P1/P2 items. The forecast list above is entirely (a) code-side work at the five repos + two mocks, (b) sibling-stream work keyed to their WRAPs, (c) future design rounds, or (d) the r1 implementation program — i.e., the corpus becomes the complete, tight contract the final-tightness round was chartered to produce.

---

*Report-only confirmed: no spec/repo file modified outside this report + the worklog; no commits, no branches; stayed on main. Every register row cites its owning report's fix-list as the apply source — the amendment wave (W6/ARCH-R27's dispatch) executes from THERE, this document routes it.*

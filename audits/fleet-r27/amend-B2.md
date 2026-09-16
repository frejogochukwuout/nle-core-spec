# R27-W6-B2 — amend-B2: the diagnostics / color / shell / D-index clusters (the edit record)

**Task ID:** R27-W6-B2 · **Agent:** amend-B2 (sub-agent, Wave 6 part 2 — the B-wave law clusters) · **Date:** 2026-09-14
**Files edited (exactly the five mandated):** `02-workers-threading.md` · `20-audio-core.md` · `08-color-grading.md` · `18-ui-shell.md` · `00-master-spec.md`. No commits, no branches, no pushes; stayed on main. The review's amendments (review-rulings.md) won wherever they exist; every law carries its D-number where one exists.

---

## §1 What landed, per file

### 02-workers-threading.md (3 edits — the diagnostics cluster's master home)
1. **NEW §7.4** (inserted after §7.3, before `## 8.`) — "Audio-thread observability & realtime-safety discipline (the WDC S-series law — LANDED at `ec8fd5c`)" — the five laws verbatim from spec-02 FIX-1 with the canonical anchor set (`diagnostics.ts:1-376`, `dsp-effects-worklet.js:315-380`, `effects.ts:441-507`, `rt-safety-gate.ts:140-187`): (1) the EngineDiagnostic bus (7 kinds, 64 ring, console-silent, WeakMap binding, node key stable across rebuilds); (2) the off-thread liveness monitor (armed-by-first-beat, isRunning-gated, 3s stall, 2-tick grace, self start/stop); (3) the in-`process()` protocol (256-quantum heartbeats, throttled NaN scan, advisory silence scan, ONE preallocated message, `// rt-safe:` annotations); (4) the stall bypass-to-passthrough ladder (stall>3s → bypass; NaN → permanent; recovery exempt from the state-restore budget; §10.4's AudioWorklet-side landing); (5) the rt-safety-gate with the transitive-heritage seed law (the vacuous-PASS fix, `rt-safety-gate.ts:140-187`). Status sentence + the cross-refs (20 §11, 17 §13A's protocol facet, §12 test class 5's three new pins). §7.3 also gained the offline-readiness-gate cross-note (the audit's §7.3 rider).
2. **:17 app row (FIX-2)** — the dead premise replaced: `rewireSidechains` DELETED → the single-owner law (the bridge's `materializeStrips` collects + connects on BOTH paths, `audioService.ts:319-322`); the deliver export's offline path FLUSHES worklet loads (`workletFlushMs: sceneHasWorkletBackedInserts() ? 250 : 0`, the family :170-172, the PASSTHROUGH race class).
3. **:22 K3 row (FIX-3)** — RESOLVED-in-a-different-shape: the app's vite `serve-vendored-worklets` plugin (zero byte duplication) + the engine's `public/worklets` symlink; both serve the first `DSP_WORKLET_URL_CANDIDATES` candidate; what remains K3 = the real-BROWSER venue pin only.

### 20-audio-core.md (11 edits — FIX-3's six + the diagnostics rows + the venue mirror)
- **3a** :17 — the app row's R8/R9 consumers re-shaped by M2 Wave 1 (single-owner sidechain + the flush law + the worklet venue fix).
- **3b** :20 — the M2 mixer-surface GAP row: the "engine's sidechain wiring does not exist yet" FALSE clause replaced with the Wave-1 landing (materializeStrips + identity-diff sever + both paths + 9 pins); the r2 tail re-split to Waves 2-3.
- **3c** §4.2 — the shape sentence extended (`index`/`name?`/`volume` 0..1/`muted?` additive-optional/`effects`) + the **F-1 bus return-gain law** paragraph after H11d (ONE LAW, THREE CONSUMERS; buses start silent).
- **3d** §5 — laws **9** (bus return gain, F-1) + **10** (sidechain single-owner parity, F-2, + the worklet-flush venue law: renderOffline default 50, the app 250-when-present) appended after law 8.
- **3e** §7 — :149's M2 paragraph re-written (the Wave-1 clause; :151's honesty note re-scoped to the ENGINE's DEFAULT `bridgeSceneSettings` vs the app's A4 G-slice; :153's remainder item (1) flipped LANDED-per-G1); the :151/:155 dated R24/R15 records kept as history per the append-only convention.
- **3f** §10 — the two facet rows (F-1 4 pins; F-2/§1a 5 pins + the flush-args pins).
- **FIX-4a** §11 — the two new file-map rows after the channel-strip row (the diagnostics row harmonized to the canonical anchor set incl. `diagnostics.ts:1-376`; the rt-safety-gate row with the transitive-heritage law).
- **FIX-4b** §0 WDC row — the S-series closure sentence appended (the diagnostics/heartbeat law → §11's rows; the threading-side statement is 02 §7.4).
- **FIX-4c** §9 — the 02 boundaries row upgraded to the two-way link (02 §7.4 ↔ 20 §11/§0/§6.1) — the corpus's only same-domain unlink closed.
- **FIX-6d rider (W-A's missed mechanical, landed for in-file coherence with 3d/02:22)** — :27's worklet-serving GAP row + §6.1's :133 parenthetical re-written to the twin-venue law (vendored-tree serving, the symlink + the vite plugin, the spessasynth-core.d.ts tsconfig pin-law); **6i rider** — §12.2's sidechain premise re-worded (the helper LANDED; the open question is the spec-18 mixer-panel UX + the W7 authoring surface).

### 08-color-grading.md (12 edits — the color law set, D37/D39 per the review)
1. **F8** §0:16 — the W-B row re-truth: the three stale clauses replaced (ScopesDock = the ~160px under-viewer pane; ColorNodeGraph = console-row slot [6], region [2] always viewer-led; the density toggles = the ViewOptionsPopover checkbox) + the **R25-A2 REGISTER-PENDING marker** (the TAB strip supersedes; the pane retires; playhead-frame scopes) + the counts re-keyed (43/22/19/10/15/21; lib/color 170 = 33/56/28/20/27/6) + the C59 pointer fixed (the MOCK's deviation ledger; the spec register ends at C58).
2. **F5** §0 — the **venue law** row (WebGPU fragment passes over the scene-linear rgba16float texture; CPU-baked LUTs; compute-shader scopes with linear_to_srgb; the eyedropper's 3×3 as the one mandatory readback; the mock = the parity oracle, WebGPU-only per Decision 4); the :25 sequential-law row flipped to RULED (→ §21).
3. **F1** — **NEW §4.3a** (the R25-A3 wheel input model, **ruled D39**): trackball accumulation, live preview (33ms), one undo entry, master via Ctrl/Cmd, Shift+drag absolute, color-only dbl-click reset; the readouts EDITABLE via **widen-via-projection** with the review's four riders — the projection-snap law (the 1-D curve in the 2-D luma-neutral plane; off-curve snaps, residual dropped), the round-trip law (luma-inclusive display vs luma-neutral solve), the 2-to-1 ambiguity convention (amount sign canonical, hue [0,360)), the offset ×1023 dual-unit law; the re-dated sequencing constraint (before the mock's next wheels touch + before r3 fixtures; the before-W3 form is spent).
4. F1 companion (i) — Q9 :956 gains the input-model supersession note (FreeCut stays the ANATOMY reference).
5. F1 companion (ii) — §19's `color-wheel-pointer-drag…` test rewritten to the relative model (accumulation + live preview + ONE commit; the FreeCut absolute-puck formula named as NOT the law).
6. **F6/D37** — §5.1's composition comment flipped to `master(channel(x))` = **y∘ch** + the full **D37 ruling paragraph** (the three grounds; never cite "Resolve's order"; **the engine's own master-first bake registered as the named r3 flip corrective** — `pipeline.ts:1483-1486`; the open live-probe verification); §5.2's our-port `bakeCurvesLUT` flipped to y∘ch with the D37 comment; §17.B-port gains the LUT-semantics note (the order lives in the bake, not the sample loop) + the P2 parity rider (the encoded-domain comparison, widen-or-budget).
7. **F7** — §19's packing-test field list replaced with the §4.2 WheelsParams verbatim (28 real fields incl. `blackPoint…_pad2`; the seed-spec names named wrong; the mock's packWheelsParams as the executable reference).
8. F6's test ask — §19 gains `curve-composition-order-y-after-channel` (the review's corrected negative arm: NOT `r(y(0.5)) = r(0.7)`) + `wheel-yrgb-round-trip-returns-same-hue-amount` (D39's round-trip + snap pins).
9. The review's F11-half reword — `curves-master-channel-affects-luma-only` re-worded (the master applies equally to all three channels; chroma preserved by construction; no third "luma-only master" semantics).
10. **F9** — NEW §11.6 (the three §11 riders): the playhead-frame trigger (R25-A2), the post-grade measured-signal ruling (rules 04 §16.5), the on-GPU render/readback-fallback venue.
11. **F3** — NEW §20 (the node-graph data + execution model; C56's closure; the explicit no-op law; keyframing OUT of v1; stills interop).
12. **F4** — NEW §21 (the C50 ruling: the GradeRecord homes, the sequential full-pass law, the D29.5c boundary, the persistence round-trip).

### 18-ui-shell.md (17 edits — F-1..F-12 + F-14; F-13's halves were already landed by W-A, verified)
- **F-1** §4.8 — the RangeBand coexistence (54px stack; the 22px ruler UNCONDITIONAL; the in/out bracket FLAGS) + the mouse-clamp/keyboard-R14 drag split.
- **F-2** §4.3 — (a) the `<video>` fallback superseded by the A1 poster transport; (b) the stills clause → the 5s pseudo-duration full-transport law (strip-dimming-never-image; play stops at out; J/K/L source-mode; the no-trim law survives); (c) the SourceRangeBar/SourceEditBar rows gained the responsive priority ladder (all 7 buttons at every usable width; scroll = last resort).
- **F-3** §4.11 — the A1 routing canon (replace-never-stack; one law, three doors; the 1ms `SEAM_EPSILON` refusal; empty-lane no-op; dbl-click apply; select-to-edit).
- **F-4** §4.4 — the B2 rewrite (the [−60,+20] Gain dB rail, the D28-A2 law, the un-withdrawal; 09 §3.1A B2's cross-ref honored; pan's C40 note) + the :184 §5.12 re-point + the absent≡true preservePitch append (R9-b/D38.2); the :185 Audio-tab row re-keyed to the Levels group.
- **F-5** §8.8 + §4.8 — the mixer REGISTERED DIVERGENCE note (the BASE's Audio page + the mock's FX page; MOCK-YIELDS-REGISTERED) + the three-way page-set re-scope (3 vs 4 vs 5, OPEN per D35.4).
- **F-6** §9 — the playhead token row split: `--accent-selection` = state only, never time; NEW `--playhead` `#fa1024` = time ≠ state.
- **F-7** §9 — the implemented house-map note (R25-W2) + the `@layer base` CSS-layering rule + the color-page-token pointer (08's half).
- **F-8** §5 — the three tool rows (ripple/slip/slide) + the reference note (verb names finalize at r1).
- **F-9** §5A — the directional cursor ladder (`w-resize`/`e-resize`; roll = the only bidirectional) + the A3/D39 wheels dbl-click exception.
- **F-10** §4.4 — the refresh law (never stale data; C44 rides the seam).
- **F-11** §4.5 — the FX tool (the seventh radio member; no plain key; the enum-grows-or-UI-extension divergence).
- **F-12** §4.7 — the waveform render gate + the setAllTrackWaveforms one-batch write + the ViewOptionsPopover chrome.
- **F-14** §15 — Q1 restated (the v2 command-surfaced source monitor); Q3 re-pointed at 08 §0's W-B row.

### 00-master-spec.md (7 insertions — the D-index + the standing laws)
- **D37** (the curve composition order y∘ch, with the engine-site corrective + the never-cite-Resolve hygiene), **D38.1/D38.2** (sub-numbered: the volume-dB one-home + the two-absent-defaults statement; the preservePitch dual representation), **D39** (widen-via-projection + the snap/round-trip/2-to-1/offset riders + the re-dated constraint), **D40** (a one-paragraph placeholder reserving the number for W-C's plan-overhaul registration — the ledger stays sequential), **D41** (the r1-entry Stage-0 mechanism set: the OT-side linkage field/registry question RE-FRAMED per the review — D32.5 cited as settled-not-reopened; the constants-module lattice; the E3/N3 envelopes; **NS-4's home folded in**) — each in the existing D-entry style with "Full evidence + rationale" closers.
- **§2A.10** — the AR-2 live-registry consumption law (spec-00 P1-6's drafted text, verbatim).
- **§2A.11** — the register-timing law (mock-verdicts §3.2's six coordination rules + the WRAP-only re-keys + the no-premature-LANDED rule + the declared-figure citation consequence).

---

## §2 Verification greps (run post-edit; all PASS)

| Check | Result |
|---|---|
| 02 contains "heartbeat" | **6** hits (§7.4's laws + the status/cross-refs) ✓ |
| 02 dead premises gone ("skips worklet-backed" / "silently passthrough" / "serves no worklets") | **0** hits ✓ |
| 20 contains "AuxBusSettings" | **2** hits (§4.2 shape + the F-1 law) ✓ |
| 20 dead premises gone ("does not exist yet" sidechain clause / "the offline path skips" / "copied to the app's public") | **0** live hits (the MIDI §12.3 row's "piano-roll spec does not exist yet" is true and untouched) ✓ |
| 08 contains "y∘" | **5** hits (§5.1 ×3, the bake, §17.B-port) + the D37 ruling ¶ ✓ |
| 08 §4.3a / §11.6 / §20 / §21 present | :280 / :837 / :2575 / :2587 ✓ |
| 08 packing test field list | the 28 §4.2 fields incl. `blackPoint…_pad2`; `liftHue, liftAmount` (the wrong seed names) **0** hits ✓ |
| 18's seven P1 fixes | RangeBand "BELOW the compact ruler's head row" 1 ✓ · poster transport ("letterboxed, object-contain" + "moving playhead + running TC") 1 ✓ · "5s pseudo-duration" 1 ✓ · "Responsive priority, not overflow" 1 ✓ · "Gain dB" 2 ✓ · "three-way" 5 ✓ · `--playhead` row 1 ✓ |
| 18 stale patterns gone ("in place of the compact ruler" / "is withdrawn — no dB" / "static band (no duration" / "playhead gold" / plain `<video>`) | **0** hits ✓ |
| 18 mini figure coherent | :16 carries the sibling's declared 495 wrap figure + the census lineage (the WRAP-re-keyed value; no bare live count) ✓ |
| 00 D37/D38/D39/D41 + 2A.10/2A.11 | :469/:473/:479/:487 + :502/:503 ✓ (D40 placeholder :483) |
| cluster-d anchor identity (02 ↔ 20) | `diagnostics.ts:1-376` + `dsp-effects-worklet.js:315-380` + `effects.ts:441-507` + `rt-safety-gate.ts:140-187` byte-identical in both files ✓ |
| The seven-repo pin triple sanity (748/632/777/690/252) | no pin edits made by this wave beyond the drafted rows; the W-A re-pin set stands ✓ |

## §3 Handoff (NOT in this mandate — for the orchestrator / sibling W-B agents)

1. **02's W-A leftovers** (amend-A4's handoff, still open): the :4 Status / :12 §0-heading posture label (R24→R27, drop "LOW-DELTA") and §7.2's :302 R27 census sentence (the two new serving venues + the rebuilt bundle). FIX-4's pin batch itself already landed (343ea7f).
2. **20's remaining rows:** FIX-5 (:209 instruments split — 7 shims + 3 verbatim copies), FIX-7 a-e (the v-next-4 status entry; the D12 ratification note; the MIDI W7/M3 registration; the 22-effect figure already re-keyed by W-A), **FIX-8 (the §4.1 volumeDb coherence row — cluster-a's 20-half: one author with 09 B2 + 10 FIX-4b)**.
3. **08's remaining P2/P3s:** F10 (the §8 matte-finesse OUT-ruling + the eyedropper seed law + the BT.709 statement; the §9 venue/UI-reference/tracking OUT-rulings + the exposure-default note), F11's §5.4 refresh (the R24-W2 curves reference rows), F12 (the §0/:15/:18/:19 pin re-base to `f9ac806`/`32abd58`/`c020b2a` — **untouched by W-A; 08's §0 engine row still carries the R24 pins**), the Status :4 v-next ledger entry.
4. **The cross-spec companions of this wave's laws** (each named in its cluster's cross-spec notes, owned by their own specs): 04 §16.5's post-grade rider + 04 §8's venue cross-link; 09's GradeRecord field (F4) + 09 B2 (D38.1); 10 FIX-2/FIX-4b (the flush law's export half + the volume/preservePitch export mappings); 11's F-9 heartbeat disambiguation; 17's §13A diagnostics facet + the mode-coverage mirrors; 16's FX-tool/modifier-grammar twins.
5. **00's W-C remainder:** the v12.0 status entry + the date-ledger line (spec-00 P2-1), the P2 dated-note set (00-8/00-9/00-10 — unlanded), and D40's full registration (this wave left the placeholder only).

*Editing-only: the five mandated files + this report + the worklog entry; no commits/branches/pushes; stayed on main.*

# ARCH-R27 — The Final-Tightness Audit (the full spec set + the plan, at the post-convergence pin world)

**Round:** R27 (2026-09-13). **Status:** v1 skeleton → the fleet runs below; the rulings section fills at the fold.
**Namespace:** spec-law decisions continue D1-D36 (ARCH-R22/23/24/25) as **D37+** here if rulings are needed.

---

## 0. The ask (verbatim-tightened — the user's R27 directive)

1. **"We are not yet ready to finalize the spec — push for an exhaustive and extremely deep review / audit of the current full spec set, to ensure it is absolutely tight and final."**
2. **(1) Major updates on the full UX mock (the ui spec) under `ui-mock/shell-variants`** — refresh them fully into the spec.
3. **(1b) `ui-mock/trim_edit_modes.html` + `ui-mock/timeline_edit_modes (2).html` — the advanced trim / timeline-insert modes, analyzed EXTREMELY deeply.** The user's framing: OpenCut's timeline is "incredibly limiting (can we say lame)" vs the Resolve target — "we are now a bit in no man's land on advanced timeline edit features… does freecut have more? I do not know. In any case we probably should just aim to implement these ourselves but need to fully leverage what's existing already to reduce chance of trials and errors."
4. **(2) The underlying core modules have further evolved** (nudging towards each other, closing seams, addressing gaps) — refresh into the spec.
5. **(3) The color grading stuff added in the UX mock (a direct copy from Resolve)** — "to what extent can we reproduce these in WebGPU I am not sure but we have to fully analyze these too."
6. **(4) Check for updates from the nle-ui/app repo that demonstrate better seam integration; the core modules may have evolved — things should be mostly considered sealed right now.**
7. **(5) Everything else: spec by spec, section by section, deeply review all underlying aspects; find any gaps or refinements needed to finalize.**
8. **(6) The implementation plan: REMOVE all time estimates; extremely clear sequencing and phasing; well-carved parallel workstreams to maximize velocity; extremely carefully analyzed to be fully operationalized and executable.**
9. **Budget: 50+ sub-agent rounds, multi-pass, tight focus per agent, iterate until ≤P3 remains.**

## 1. What changed since the R26 pins (the delta this round must absorb — the orchestrator's pre-fleet survey, 2026-09-13)

**ALL FIVE module repos moved past their R26 pins.** The convergence the user called "closing the seams" is real and large:

| Repo | R26 pin | Now | The movement (commit-range highlights) |
|---|---|---|---|
| nle-engine | `0a49286` (471) | `f9ac806` (739) | The **RC convergence round**: D12 the assembly ruling RATIFIED engine-side (opencut is THE editing engine; the engine's TimelineData stack is the render/export venue model; one-directional junction); **OV-01/OV-02** the volume-dB law + retime clamp collapse to the upstream ONE home (opencut-laws deep-imports the pure leaves); **OV-05** the visual seam reads the ENGINE field `el.transitionOut` (one input source); **OV-12** the vendored-timeline re-pin gate in engine CI; vendor re-pins (OT → 6e2b91a, WDC → ec8fd5c); **M2 Wave 1** the bridge's bus-law + sidechain-parity laws (the mixer-surface wave); the NS-1..NS-5 design queue (filed by OT's SA-1); the r1-port collision map |
| opencut-timeline | HEAD `fdb771c` (code pin `c15a629`) 536 | HEAD `55c81c0` **632/632** | **D-ARCH-6 the wire widenings**: `timeline.insertBatch` / `removeKeyframes` / `retimeKeyframes` landed (one history entry each; core-op mirrors; the shared validateInsertElement helper); the singular `removeKeyframe`/`retimeKeyframe` RETIRED from the union — **WIRE_COMMAND_TYPES 30→31, WIRE_UI_EXCEPTIONS 5→3 (28 routed + 3 exceptions)**; the three gesture-commit seams switched to wire dispatch origin ui; AR-1 the shared-law exports (core/audio-params one-home); AR-2 keyframe authoring + later the AR-2 reconciliation (upstream `upsertKeyframe` removed when UI coverage landed); HB-2/3/4 hardening; **D-HB2 fromJSON as the scene-load boundary**; V-S16 intra-batch overlap; DECISIONS #26 + #27 |
| web-daw-core | `387f327` (773) | `ec8fd5c` | The **S-series upstream wave**: 19 locked files refreshed + the 18-file closure extension (fork @ f5011b3, our eeb3b24 fix preserved) — diagnostics / stall-race / library-audio-proxy / sample-catalog-core / the wam instrument+state path / the instrument factory+registry+param-path / the pure-logic MIDI family / the rebuilt dsp-effects-worklet bundle / the rt-safety-gate transitive-heritage fix |
| nle-ui | `3026099` (674) | `32abd58` **690/690** | **R9-b the maintainPitch ruling — `el.preservePitch` joins the model** (the dead Preserve-pitch toggle is live — RESOLVES the R26-filed spec-09 model decision!); **AW1-2** the Inspector Gain ceiling raised +4 → +20 (the fleet-coherent [−60,+20] domain — opencut's core/audio-params is the one home); **FW-D** `setElementFieldAll` (one user verb = ONE undo unit); the F4 family (identity guards law-73 class, kind-aware toggleMuteAll, duplicateElements severs linkedTo, Z4 stopPropagation) |
| nle-test-app | `3c91ffe` (206) | `c020b2a` **252/252** | The RA + RC rounds: the fleet-freshness cascade re-pins; **AR-2 the wire-coverage gate consumes the LIVE `WIRE_UI_EXCEPTION_VERBS` from the vendored barrel** (the hand-mirrored copy went stale — the live-registry consumption law) + the REAL volume-line double-click gesture pin (timeline.upsertKeyframe origin 'ui'); **M2 Wave 1 app-side** (the bus fold REPLACEMENT, the single-owner sidechain law, the flush-args fix, the worklet VENUE fix); the port census register **42 files = 36 zero-action + 5 carriers + 1 host**; the D-ARCH-6 filings (the timeline re-pin + the port's gesture-seam switch + the pool multi-insert design riding insertBatch) |

**The shell-variants mock (the sibling stream) also moved massively:** the R24-variants FULL-AUDIT round landed W0-W5d (the recycle-reconstructed rebuild: the store prep, the shell chrome + mixer, the color view wave — the console-row node graph + the scopes pane + the YRGB curves rebuild, the FX/transitions DnD, the deliver range, the source/transport/viewer wave, the inspector/widgets/CSS P1 fix fleet, the mixer/scopes polish) — **census 64 test files / 1,734 it-blocks / 1,740 green / 124 stories** (supersedes the register's mid-flight 1,613/61 reading); plus **DESIGN-R25 §6 the research verdicts** (A1 source-transport: stills get FULL transport; A2 color-layout: scopes react to the playhead frame, the 3-chip target breadcrumb; A3 wheels: RELATIVE/ACCUMULATING trackball drags + live readouts, master = horizontal dial + Ctrl/Cmd-drag, dbl-click color-only reset — "our absolute+commit-on-release model is WRONG").

**battery_r26 at the new pins: 136/141 — the 5 fails are pure pin-lag** (the LIVE cross-repo checks; everything else green). The re-pin is this round's mechanical work.

## 2. The R27 pin world (the fleet's contract)

engine `f9ac806` (739/739) · OT HEAD `55c81c0` (632/632; **the code pin moves to `55c81c0`** — D-ARCH-6 landed code at `ec86ad3`/`970948a`; the scouts verify whether any later commit is docs-only to name the exact code pin) · WDC `ec8fd5c` · nle-ui `32abd58` (690/690) · app `c020b2a` (252/252; vendor: engine `f9ac806`, WDC `ec8fd5c`, OT mirror @ `6e2b91a`-era — the app-side re-pin queue (c020b2a's own filing) carries the OT `55c81c0` move) · mini 357 sealed · variants 64 files / 1,734 it-blocks / 1,740 green / 124 stories.

## 3. The fleet grid (the multi-pass design — 55+ dispatches)

| Wave | Agents | Focus | Reports → |
|---|---|---|---|
| **W1 module scouts** | 5 | engine-RC / ot-D-ARCH-6 / wdc-S-series / nle-ui-R9b / app-RA-RC — the diff-since-R26-pins seam analysis + the spec-impact map | `audits/fleet-r27/scout-{engine,ot,wdc,nle-ui,app}.md` |
| **W2 mock analysts** | 6 | trim-modes EXTREME / insert-modes EXTREME / variants-delta harvest / color-WebGPU feasibility / the leverage research (OT/OpenCut/freecut capability census for the ten modes) / DESIGN-R25 §6 verdicts absorption | `audits/fleet-r27/mock-{trim,insert,variants,color,leverage,verdicts}.md` |
| **W2b briefing fold** | 1 (orchestrator) | the W1+W2 facts folded into the per-spec fleet's briefing doc | `audits/fleet-r27/BRIEFING.md` |
| **W3 per-spec fleet** | 18 (00-20 minus none) | one per spec, sub-spec depth, at the R27 pins, seeded by the briefing | `audits/fleet-r27/spec-{00..20}.md` |
| **W4 cross-cuts + plan** | 5 | mode-matrix re-derive / keyboard+wire-census coherence (28+3!) / reference-register maintenance / FINAL-SIGNOFF+seal coherence / **IMPLEMENTATION-PLAN overhaul** | `audits/fleet-r27/xcut-{matrix,keyboard-wire,register,signoff,plan}.md` |
| **W5 adversarial review** | 3-4 | fresh-context reviews of the amendment set + the plan overhaul | `audits/fleet-r27/review-*.md` |
| **W6 amendments + verify** | 6-10 | the spec edits + the battery_r27 build + the verification agents + the integration review | the spec corpus + `battery_r27.py` |

## 4. The rulings (filled at the fold)

*(pending the fleet)*

## 5. The defect/finding register (filled at the fold)

*(pending the fleet)*

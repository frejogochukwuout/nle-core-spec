# R22 domain-spec §0 evidence pack (for the inversion wave)

## THE FLEET PINS (2026-09-07) — use these EXACTLY in BASE rows
- nle-engine @ `f68ab8c` — 356/356 vitest, tsc 0. Landed: N1-N4 bridge seam family (composition-frame → the app's real ProgramCanvas; flattener params volume/mute; cut-centered transition windows → real audio crossfades; av-link), W1 meter bridge. Vendors OT @ `3420b5f`, WDC @ `5570321`.
- opencut-timeline (OT) @ `05584d8` — 459/459 (329 in-page + 130 real-mouse across 14 phases), tsc 0. Landed: the S-round (S1 transport policy: playbackRate/loopRegion/anti-drift; S2 track lock; S3 transitionOut; S4 bookmark color/note + D-S5 typed ElementParams). The React view tree lives APP-side (nle-test-app `timeline-port/`); OT `view/` is utils-only.
- web-daw-core (WDC) @ `fe05d85` (consumed @ `5570321`) — 740/740, tsc 0. Landed: W1 canonical meter taps (push-mode, coreOwned) + the first upstream-direction push.
- nle-ui @ `dba8d52` (consumed by the app @ `752991d`) — 640 tests, engine-free, boundary-script-gated. Landed: AppShell slots (timelineRegion/programMonitor/mediaDragSource), the program-monitor seam (R7/N1), the OT S-round queue filed.
- nle-test-app (THE APP) @ `e662759` — 83/83, tsc 0. Landed: EngineMount (OT timeline wired), ProgramCanvas (real engine composition), real audio crossfades, av-link dispatch, the WDC audio host, the OT S-round consumer migration (Wave B).
- nle-core-spec (this repo): ui-mock/shell-mini 333 tests (post the R22 user directive: the full drag-machinery retirement — the verbatim R18k law: clamp + single-edge live-field magnet + last-preview seal); ui-mock/shell-variants 1,334 tests (real color math W4, real scopes data).

## THE PHASE TAGS (spec 14 v2.1 — cite these in GAP rows)
- C0 (nle-ui): MiniShell chrome family port.
- C1 (app+OT): qc- restyle of the app-owned port tree; testid mapping (~60 mini testids); window/binding embedding; seed-fixture bridge; OT-SEAMS dispositions; the editing keyboard surface + undo/redo exposure (MiniShell owns the editing keys).
- C2 (app): viewer/transport engine-bound; inspector real subjects; media-pool import flow; topbar export CTA.
- C3 (app): WDC meter taps + engine audio in the mini's waveform/mute laws.
- C4 (app+spec): the law-net corpus re-expressed as app-side tests (LAW-NET-INVENTORY.md is the acceptance list, pre-C1/pre-C4 deliverable); export wiring; annotakit for the app; the mini-parity demo (import virtual → cut → play → export).
- W-ops (OT): op-family ports (slip/slide/roll/rateStretch wave 1; retime/freezeFrame/rangeRemoval wave 2, tests carried from engine); C7 rename at END (24 prefixed wire names → bare, one-day app migration + keymap sync sub-gate); error-envelope refinement (spec 15 §6.3 amendment first); onViewStateChange additive prop; toggleElementMuted/Visibility wire additions.
- W-media (app): MediaRecord registry + probe + lookup; the FULL event staircase (spec 15 §9.5); telemetry; full-scope demo on virtual media.
- W-n5 (engine): real media decode (registry + decode → VirtualMediaAsset) — PENDING user re-affirmation of D6.
- W-audio (app+WDC+engine): mixer G-wiring full depth (inserts/sends/aux); SoundTouch offline pitch (M2); sidechain; PDC; automation shapes; N2b keyframed volume; offline parity pins ≤ −60 dBFS + the null rig.
- W-project (app): ProjectJSON persistence; multi-scene app slice; scene wire ops; cross-scene-undo law + history budget.
- W-color (app+engine): the mock's W4 grade math bound to the engine pipeline (grade-math parity pins; scopes plot engine data when the S-engine instruments land).
- S-engine (∥ crawl): the projector parity corpus (the N1 family's formal S4 suite); N2b design round; the color instruments (scopes + secondary qualifier + power window — zero engine code today, 4-6 wk).
- R-fcpxml (app): spec-10 greenfield; parser+fixture choice = phase-entry artifact.
- R-polish (app): keymap long tail (~54 of ~178 rows, C22 ledger); i18n (C12); tooltip dismiss (C11); type-scale (C14); strip badges (C15); spec 18 §11 audit.
- R-engine-p2 (engine, non-blocking): CPU transition renderers; ShapeItem/Lottie/Subtitle/Controller surfacing.
- R-cloud: unchartered non-goal until user re-scopes.

## THE TEMPLATE (insert as §0, right after the header block's first "---"; renumber NOTHING — existing sections keep their numbers; the §0 heading text below is exact)

## 0. FORWARD INVENTORY (R22 posture — what needs to be done; the BASE is accepted, not re-explained)

**BASE (accepted, pinned 2026-09-07):**
- [rows: what this spec's domain has SHIPPED — pin + suite + count + the one-line role. Cite, don't narrate.]

**GAP (the work — owner + phase per spec 14; acceptance in parentheses):**
- [rows: each missing item — the owning repo/stream + the phase tag + a TESTABLE acceptance clause.]

**ACCEPTANCE & TEST PLAN:** [the spec's own Testing section number if it has one + spec 17 §13A facet row pointers + the battery's posture checks. For BASE rows the acceptance is the cited suite at the cited pin (the regression role).]

## RULES
1. Do NOT touch the normative sections (the contract text stays — it IS the acceptance form).
2. Update the Status header line: append "v-next (Round 22 — the §0 forward inventory + the R22 re-baseline: <one line>)" at the FRONT of the existing status string (keep the prior ledger).
3. BASE rows: compress to reference rows; if the spec narrates completed history at length in §0-adjacent prose, leave the prose (don't rewrite bodies this round) — the §0 inventory is the new entry point.
4. GAP rows must be testable: an acceptance clause like "(acceptance: X suite green / Y parity pins / Z round-trip)" — never bare.
5. If the spec's domain has an in-repo gap register (e.g. 06's op-family register, 15 §13.15), the §0 GAP section POINTS to it rather than duplicating.
6. Keep each spec's §0 under ~40 lines.

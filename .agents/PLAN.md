# PLAN — Long-Horizon Task Tracker (nle-core-spec)

**Created:** 2026-09-02 (Round 8 wrap-up — user directive: push/backup every micro milestone; PLAN tracks the long horizon, HANDOFF tracks the next session only)
**Current round:** 9 COMPLETE (pushed @ `4bc8c4d`) — seal round remains
**Canon:** this repo, `main` — https://github.com/frejogochukwuout/nle-core-spec

---

## Round history (completed)

| Round | What landed | Tip commit |
|---|---|---|
| 1-6 | Seed → scout-refined (12 streams) → audited (19 audit docs) → integrated (TEST-INTEGRATION-REVIEW) → testability layer (15/16/17) | through `356f135` |
| 7 | Full audit-and-refinement pass: spec 18 (UI shell), spec 19 (code-references), export-command amendment (union 73→78), TransitionSpec 2-layer, INTEGRATION-REVIEW-R7 gate (1 BLOCKING + 4 MAJOR fixed), resolver drift battery | `82ca2c1` |
| 8 | Three-repo integration: opencut-timeline landed (Decision 11 seam; specs 05 §14.5A/§16.5, 06 §5.2A/§10.5, 15 §7.1A/§13.15, 19 v2.0); engine Waves 4A-4D re-baseline (D1 escalation → C8; specs 06 §10.4, 09 §10.3); cloudcut UX-spec integrated ours-wins (spec 18 v1.1: context menus, state rows, a11y floor, error UX, visual language, pointer grammar; 00-master §6A NFRs); testability facet matrix (spec 17 v1.1 §13A); INTEGRATION-REVIEW-R8 PASS | `f1a261c` |
| 9 | **Three-domain strategy (user challenge round):** ARCH-R9 ruling; Decision 12 (single editing core + one-way projector + op-port; supersedes D11's two-homes), Decision 13 (web-daw-core audio adoption, spec 20 NEW — S/G/E law, M1.5 gates, AudioMixer retire-at-gate), Decision 14 (spec re-typed CONTRACT+GAP+ACCEPTANCE, code-first posture); doc governance §2.5 (single-file canon — 12 .refined.md collapsed; code-ref vs inline rule); engines re-baselined (engine @624a76b 202/202, OT @4e39b67 297/297 FINAL); C8→projector re-type, NEW C9; spec 14 code-first rewrite (P-A audio phase, 8-13 wks); battery_r9 48 checks; INTEGRATION-REVIEW-R9 PASS | `4bc8c4d` |

---

## The next round: SEAL (spec 19 §12 + ARCH-R9 §7 are the authoritative checklists)

Priority order (R9-re-scoped):

1. **ARCH-R9 §7.1 — M1.5 wire-up verification** (highest priority): fetch the engine; verify `vendor/web-daw-core` submodule + player routing + export offline render landed; verify the parity gate RAN and the AudioMixer retirement is EXECUTED (2,426 LOC gone, pre-baked EQ gone, 22,050 Hz bins gone, audio-mix.ts reduced or deleted per C9). Fetch web-daw-core; verify bridge growth (sidechain/PDC helpers) if M2 started; run `bun run sync -- --check` (§7.4).
2. **ARCH-R9 §7.3 — op-family port kickoff**: verify at least `roll` ported into OT's ops layer with its engine tests carried over (the port-pipeline proof). If landed, update spec 06 §10.5 + spec 14 §2.1's port table; if not, it stays the top convergence charter.
3. **OT C7 rename** — 18 prefixed types → bare spec-15 union; flips spec 15 §13.15's worklist rows to ALIGNED. Still THE prerequisite for command-family growth.
4. **Full decision reconciliation** — 13+ engine / 15 OT / 14 spec decisions, each with a "no spec conflict" sign-off line; **web-daw-core's SKILL/track-model/UPSTREAMING get the same pass** (00 §2.5.3 normative-adjacency).
5. **Final citation sweep** — every per-spec code-ref table re-grepped (engine line numbers moved in 4D-B→5C); **includes the spec-05/01/06 inline-block classification audit** (§16.6 carries the falsifiable expectation).
6. **Seam-doc cross-consistency** (ARCH-R9 §7.7): spec 05/20's seam statements vs OT SEAMS.md / web-daw-core track-model.md, exact.
7. **spec 20's open questions** close: automation-curve shape, sidechain source-selection UX (needs a spec 18 mixer-panel section), audio-mix.ts end-state (C9 resolution).
8. **Source-preview question** (spec 18 §15.1) + cloudcut ux-spec maintenance — unchanged from R8.
9. **Seal verdicts** — regenerate audit totals; declare sealed (or open Round 10).

## After the seal: implementation (spec 14 §2.1 is the plan — code-first)

- **P0** ≈ satisfied by the engine baseline (202/202, real A/V export) → **P1** UI shell + **projector** (1-2 wks; timeline UI is WIRING OT's landed `TimelineView`) → **P-A** audio wiring (PARALLEL, 2-3 wks; M1.5 + retirement gate) → **P2** op-family port (1-2 wks of porting) → **P3** transitions (1-2 wks; SceneTracks shapes) → **P4** color (3-4 wks) → **P5** FCPXML (1-2 wks, greenfield) → **P6** cloud (optional)
- Total: **8-13 weeks single-dev / ~1.5-2 months with 2-3 devs** — dominant costs: the app shell (the one greenfield surface) + the op-family port
- Every phase's tests: spec 17 §3.1 + §13A facet matrices govern coverage (three repo suites re-tier: engine 202 → T1/T2, OT 297 → T1/T2/T3, web-daw-core 737 → T1/T2)

## Standing rules (every round)

- Push at every micro milestone (never lose work to infra failure)
- `git fetch` before push (user works in parallel)
- Mechanical battery after every fix round (`scripts/battery_r9.py` — 48 checks; recalibrate stale checks; exempt-window logic must look BEFORE AND AFTER each hit)
- A facet with no coverage-matrix row is a spec bug (spec 17 §14.4 step 0)
- Domain cores converge toward the spec's CONTRACTS, never the reverse (Decisions 10-12); the spec never duplicates what the code can be cited for (00 §2.5.2)

# PLAN — Long-Horizon Task Tracker (nle-core-spec)

**Created:** 2026-09-02 (Round 8 wrap-up — user directive: push/backup every micro milestone; PLAN tracks the long horizon, HANDOFF tracks the next session only)
**Current round:** 12 (UI/UX mockup) COMPLETE through `5550902` — seal round remains
**Canon:** this repo, `main` — https://github.com/frejogochukwuout/nle-core-spec

---

## UI/UX direction track (R10 `390fd48` → R11 `e0eaed2` → R12 `5550902`+ → R13 `b8d504f`+)

**R13 (2026-09-04) landed (test + PR + review-gate round):** the mock got its **test program** — Vitest 5 + RTL + jsdom, **33 files / 511 tests**, co-located `*.test.tsx`, per-test store-reset contract (`src/test/setup.ts`), provider-stack helpers; PR **#1** opened (base `ui-baseline` @ `ce16d33`, head `main`, 143 files ≤ 300) which pulled in **CodeRabbit + Codex + three maintainer review waves**; five fix rounds closed every P1/P2 (only P3s remain, deliberately): store bug-hunt (deep-clone undo, no-op history pollution, dead ⌥⇧M, setMixerTrack partial strips, lockAll/selection-in-undo, locked-track law, ripple trim + target constraint, id collisions, range-param stub), keyboard/a11y parity (Tab scoping, slider grammar on scrub rows, splitters/menu tabs/cards keyboard-operable, danger-dialog cancel-first, violet AA), §4.9 menu enumerations completed, §6.4 keyboard multi-delete confirm, annotakit hotkeys remapped off the shell's keys + vendor functional fixes with dist rebuilt. **Direction-2 output: `.agents/SPEC-REVISION-CANDIDATES.md` + GitHub issue #2 (17 entries: 6 spec-vs-spec conflicts, 4 missing canon answers, 9 mock registrations C1-C9, seal staleness flags).**

**R12 (2026-09-04) landed (user-feedback round):** mixer relocated to a RIGHT-SIDE DOCK beside the multi-track lanes (design doc v2.2 — 3 states preserved: 44px bridge rail / full strip row with fill-height faders); inspector seam direction fixed (was inverted+runaway) + Inspector/MediaPool fill their columns (w-full); playhead triangle re-centered on the bar centerline (was 2px off); **Storybook 10.6 + annotakit 0.4.0** (vendored, pin-comments with component/file:line digests, sqlite store, GitHub issue mirror ACTIVE) served at the platform preview URL via `storybook dev --port 3000` under a supervisor; **71 stories** (every shell region, chrome strip, timeline leaf, mixer surface, page, overlay, primitive); viewer overlays + safe-area guides became store-level UI prefs (real 90/80% guides); review gates: code review NO MAJORS + spec review 1 major (type floor) — all closed.

**R11 (2026-09-04) landed:** layout overhaul to spec-18 geometry; the five v1.1 surfaces (context menus §4.9, toasts §6.4, state rows, pointer/wheel grammar, sample project); media-pool drag-to-lane/multi-select; 40-key map w/ JKL + undo; **Audio focus mode** per peer-reviewed `ui-mock/shell-variants/docs/DESIGN-audio-mode.md` v2.1 (4th dock page ⌘4, 3-state mixer, channel editor = S/G seam, sidechain ducking = spec 20 §12.2 mock answer, escalation gesture); **Storybook 9** (29 stories). Review gates: code review → all majors fixed → re-check verdict **NO MAJORS REMAIN**.

`ui-mock/shell-variants/` — interactive TSX mockup of the spec-18 shell (React 19 + Vite per 00 §4) with a ctrl+` Variant Explorer: direction presets **A Resolve Classic** (spec-canonical), **B Modern Studio** (elevated dark, violet), **C Editorial Light** (tests the 18 §8.14 rejection). Three sub-agent review rounds (pro-editor / product-designer / a11y+spec) → R3 verdict: **NO MAJORS REMAIN — valid for user review**. Mock-level interactions live (drag/trim/split with snap, playhead, search, variants persist + share links).

**Next steps (in order):**
1. **USER REACTION remains the gate** — now with TWO surfaces: the PR (#1, CodeRabbit review + the candidates issue #2) and the live pins (public URL → annotakit → GH issue mirror). Tour the presets + Audio focus; answer DESIGN-audio-mode.md §11 q1-q9.
2. **PR #1 close-out** — remaining open items are P3-only (the maintainer's corpus lists them; batch as a polish round or fold into wiring); re-run CodeRabbit on the final commit; merge or keep open per the user's call.
3. **Seal round inherits THREE new inputs:** seal items 10-25 + `SPEC-REVISION-CANDIDATES.md` (17 entries — A1-A6 conflicts need pick-one amendments, B1-B4 missing canon answers, C1-C9 registrations) + the R13 test suite as the regression harness for any wiring.
4. P1 wiring (spec 14) inherits the token set + component structure + `shell-*` testids + the 511-test suite; the audio-focus surfaces become the spec-18 mixer-panel section the seal round must write.

**Seal additions from the mockup reviews (spec-side findings, not mock bugs):**
10. **18 §9 playhead provenance error** — table says `--accent-selection #e8b34b (mock playhead gold)` but the davinci mock's playhead is RED (#fa1024, `.playhead-line`); spec must decide the canonical playhead treatment (mock follows the actual mock: red time indicators, gold = state/selection).
11. **18 §4.5 tool-key conflict vs 16 §3.2** (A/','/S vs V/B/T/Y/U + N) — pick one, amend the other.
12. **`--accent-focus` has no AA text pair** in resolve/studio (≈3.9-4.0:1 both directions) though 18 §9 assigns primary buttons to it — needs an `--accent-focus-contrast`-class decision.
13. **18 §3.1 12px status strip vs §11.12 11px type floor** — internally in tension; mock used 12px.
14. **R11: workspace keymap mismatch** — spec 16 §3.8/App A binds ⌘3 = Effects workspace, no Deliver binding; spec 18 dock ships Edit/Color/Deliver. The mock binds ⌘4 (per 16) + ⌘1-3 (per 18 tooltips). Seal must reconcile.
15. **R11/R12: F6 region count** — 18 §11.5 enumerates six regions; the mixer DOCK is a seventh (mock registers it conditionally — visible states only, no invisible collapsed stop; amendment or fold-into-timeline decision).
16. **R11: meter deferral (18 §8.13) vs always-on master micro-meter + header micro-meters** — seal decides whether these count as "meters panel." **(R13 flag: STALE — header micro-meters do not exist in the code; re-scope to the master micro-meter or re-implement.)**
17. **R11: automation-curve UX home (20 §12.1)** — the mock ships a visible placeholder (Automation — M2 watermark); the seal round inherits the question.
18. **R11: the C15 re-litigation needs formalizing** — DESIGN-audio-mode.md §9 argues it (D13 postdates the ruling); the seal round should either ratify the mixer surface as the spec-18 mixer-panel section or reject with the ledger. **R12: the mixer is now a right-side DOCK (v2.2) — the ratification question now carries the dock placement.**
19. **R12: strip-family 10px type floor exception** — the console vocabulary (strips/rail/guides) runs 10px against §11.12's categorical 11px (R11 accepted 10px-in-strips informally; now needs formal ratification or a 11px pass).
20. **R12: toast max-3 overflow deviation** — mock DROPS the oldest; §6.4 says collapse-to-icon-row (labeled in story + store; decide at seal).
21. **R12: ⌘M master-fallback extension** — spec 16 §3.5 binds ⌘M to focused-track mute only; the mock falls back to master when nothing focused (tooltip now honest; register the extension).
22. **R12: 90%/80% safe-guide convention unregistered** — no spec text constrains the percentages; ratify the broadcast convention when §4.3 is sealed.
23. **R12: overlays-hidden approximation** — mock hides in-canvas overlays whenever tool ≠ select; §4.3 says tool-DRAG. Register.
24. **R12: mockMixer masterVolume placement** — spec 20 §4.2 puts scene master in the mixer slice; the mock keeps it in the UI store (docblock over-claims). Register with the G-layer conformance pass.
25. **R12: mixer testids not shell-namespaced** — adopt `shell-*` names when the spec-18 mixer-panel section is written (mixer-dock-*/mixer-strip-*/btn-mixer-state today).

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

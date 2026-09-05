# PLAN — Long-Horizon Task Tracker (nle-core-spec)

**Created:** 2026-09-02 (Round 8 wrap-up — user directive: push/backup every micro milestone; PLAN tracks the long horizon, HANDOFF tracks the next session only)
**Current round:** 16 IN PROGRESS → shell-mini MVP BOOTSTRAPPED (`96ea0db`, R16 A1-A4: design-audited + code-reviewed + 93 tests green) **and SERVING LIVE on port 3000** (R16 continuation session: origin PAT push DONE — GitHub reconciled via merge with the parallel R15-UI push, no force; Vite dev server daemonized via double-fork on :3000 behind Caddy :81 → the public preview URL IS the shell-mini app). **The horizon is now the A0-A7b assembly plan (spec 14 / ARCH-R15 §3.4), with the shell-mini track as the MVP-era UI surface.** R17+ = either (a) the user green-lights `nle-app` creation (week −1 pre-flight first — REVIEW-R15-EXEC §7's 12 items) or (b) further seal-polish rounds or (c) shell-mini iteration (v0.2: DnD + annotakit + keyboard-clip-focus).
**Canon:** this repo, `main` — https://github.com/frejogochukwuout/nle-core-spec (PAT shared in-session, kept in local `.git/config` + chat only — NEVER commit it; GitHub's secret scanner blocks token-bearing pushes). GitLab mirror remains the second remote (WAF 403s are probabilistic — retry).

---

## Round 16 (2026-09-05) — the shell-mini bootstrap round (IN PROGRESS → core landed)

**User ask:** bootstrap a minimal version of the spec-18 shell under `ui-mock/shell-mini/` — simplified from shell-variants, skinned with `ui-mock/RH-timeline-editor.html` (RunningHub quick-cut), similar setup incl. Storybook.

**Landed (A1-A4):**
- **W0 research:** `ui-mock/shell-mini/docs/RH-skin-extraction.md` — verbatim token set + quick-cut DOM anatomy extracted from the 7.2MB SingleFile DOM snapshot via headless-browser computed styles.
- **Design contract:** `ui-mock/shell-mini/docs/DESIGN-mvp.md` v2.1 FINAL — 11 decisions; adversarial design audit (5 majors / 14 minors) + implementation code review (2 P1 / 5 P2) both folded.
- **The app:** React 19 + Vite 8 + TS strict + Tailwind 4 + Zustand 5 + lucide (stack mirrors the sibling, minus annotakit); tokens.css = extraction §2 verbatim; timeline.css = qc- class-for-class quick-cut port; shell = floating glass panels over a #0d0d0d dot grid; geometry.ts = the pure interaction-law module; useMini.ts = doc/ui/history(50)/drag-session store with the interaction lock.
- **Quality gates:** 93 vitest tests / 4 files green; tsc strict clean; vite build + storybook static green; VLM-verified renders (skin fidelity + ruler/clip/playhead px alignment verified in real-browser rects).
- **Git:** origin PAT push DONE in the R16-continuation session (GitHub had the parallel R15-UI wrap on top of the old base — MERGED, no force); GitLab mirror (ansgareutychisO) kept current through every milestone: 38a5fc0 → 204eedd → 3a8931f → 908dd6f → bd734ae → d695fa4 → 96ea0db → be1f141(port-3000) → merge.
- **Runtime (new, this session):** shell-mini serves on **:3000** (vite base '/', strictPort) — the Z-container's Caddy :81 reverse-proxies localhost:3000, so the preview URL = the app. Dev server survives toolcall reaping via the committed double-fork launcher (`ui-mock/shell-mini/scripts/dev3000.py`); recycle resurrection via the PAT-free boot hook (`ui-mock/shell-mini/scripts/boot-restore.sh`, iso `/home/z/my-project/.zscripts/dev.sh`, restores from the newest /home/sync bundle). **GO-LIVE FIX:** the FC edge rewrites Host to ...fcapp.run and Vite's default allowedHosts 403'd every public request (localhost probes were a false pass) — `server.allowedHosts: ['.space-z.ai', '.fcapp.run']` added; public URL now verified end-to-end (title, a11y tree, playback TC advance).

**Remaining for the round (R16 close-out):**
- [x] design audit round, [x] implementation, [x] code review round + fixes, [x] README + DESIGN v2.1
- [x] final wrap: HANDOFF/SKILL/PLAN updates, /home/sync backup, worklog
- [x] origin PAT push + parallel-thread merge (R16-continuation session)
- [x] LIVE on port 3000 via the preview URL (R16-continuation session) — browser self-verified
- [ ] user reaction pass on the live mock (NOW TOURABLE at the preview URL + storybook :6007)

**shell-mini v0.2 candidates (next UI iteration):** drag-DnD media→timeline (top candidate, deferred with the drop-outline token), annotakit wiring (vendored dir + 3 config lines), keyboard clip-focus traversal, snap-guide indicator, 18px node-space gutter option for pixel-compare passes, waveform with amplitude variation.

---

## Round 15 (2026-09-05) — the assembly + path round (COMPLETE)

**The three rulings (peer-reviewed 2×, both signed off; full record `audits/ARCH-R15-assembly-and-path.md` v2.1):**
- **Decision 15 — EVOLVE-IN-PLACE:** the four repos ARE the product (user's ~70% estimate verified: the union covers ~65-70% of non-assembly/non-cloud scope; the adversarial steelman FOR greenfield recorded and beaten in REVIEW-R15-ARCH §4; reversal condition probed — no structural defect found). D10's "references" framing superseded.
- **Decision 16 — the `nle-app` assembly architecture:** fifth repo + three pinned submodules (lockset rule) + mock chrome PORTED; **projector is ENGINE-home** (`src/lib/nle/projector/`, additive; Timeline = parity oracle → permanent test substrate); commands DOWN one union (routing-disposition table = spec 15 §4.1A, 78/78 members; NOT_IMPLEMENTED typed) + telemetry UP one event staircase (spec 15 §9.5 register; playhead ownership = engine Clock truth, imperative mirror); multi-scene app-level (OT stays sealed single-scene); D12.2 amended (engine JSON-RPC = internal transport).
- **Decision 17 — four walls one roof:** module gates stay undiluted; the app adds S1-S5 (seam contracts / state WYSIWYG / wired shell with the /dev/view-fixture + ~200 ported chrome + §12 capture suite / render-audio parity incl. the net-new null rig / battery); port-then-swap law; CI fast-lane/nightly + HEAD-follow bump PRs.

**Execution plan (spec 14 REWRITTEN):** week −1 pre-flight (TS + HMR spike gates) + A0 scaffold (HMR round-trip exit gate) → A1 projector (engine, 4-5wk) → A2 bus+C7+op-port wave 1 (5-6wk) → A2.5 wave 2 (∥A3) → A3 shell + DEMO (5-6wk; demo ≈11-13wk solo / 7-8 two-dev) → A4-v1/v2 audio → A5 project+scenes → A6 FCPXML → A7a/b polish. **A7-complete ≈22-27wk solo / 13-16 two-dev (honest, fresh-senior calibrated).** Per-domain gap registers live in spec 14 §4 (every row cites a module pin).

**The amendment set (all landed, battery-checked):** A1-A6 + B1-B4 + N1-N15 processed into 09/05/16/18/20/15 (AM1/AM2 agents); 19/17 re-baselined to R15 SHAs with the roof-suite section (AM3); README R15; integration review R15 (0 BLOCKING/6 MAJOR/7 MINOR → all fixed in `6315cd6`, verdict CLEARED); **battery_r15.py 47/47 green**. The C-series + D remain the live deviation ledger (candidates file). Cross-spec contradiction fixes: 15's marker-note → per-scene, 181 bindings, R→ripple example.

**Scouts (the evidence base, all gates re-run in-sandbox):** SCOUT-R15-A (engine: 274/274+265/265+318; headless = JSON-RPC 19 ops; OT vendored TYPE-ONLY; P0 85%/P-A 80%/P3 85%/P4 70%/P5 0) — SCOUT-R15-B (OT: 423/423; W8 UI landed; C7 NOT STARTED deliberately; 24/78 wire coverage; pin=post-W8-d, bump recommended) — SCOUT-R15-C (WDC: 721/721 pure; one-audio-engine verified; mixer G-surface UNWIRED = M2; 12 host obligations) — SCOUT-R15-D (mock: 596/596; ≈55% UI-layer risk de-risked; net-new 09 deltas incl. float-seconds vs MediaTime; PR #1 down to 2 P3s).

**Parallel-session note:** the user's parallel session landed `ac784f7` (R15 W0: OT seam-contract research, web-daw-ui pattern reference, mockup 18-defect audit, two design docs v2 FINAL — timeline-parity + audio-overhaul) and `0403225` mid-round; both rebased cleanly (no file overlap). The design docs in `.agents/design/` are the MOCK-side next iterations — they complement (not conflict with) this round's canon work.

## UI/UX direction track (R10 `390fd48` → R11 `e0eaed2` → R12 `5550902`+ → R13 `b8d504f`+)

**R14 (2026-09-05) landed (comment-audit + zero-no-op + both-directions spec scan):** the full **90-comment PR corpus was re-inventoried and re-audited** (74 inline + 11 issue + 5 reviews; every finding verified against code — the audit caught 5 fixes claimed-but-not-landed in the R13 reply, all now fixed: gh.ts pagination origin guard, ghsync per-comment mirror sentinel (self-healing duplicate-echo), anchor walk-up tag re-verification, cross-story focus retry-until-ack, and the vendor `prestorybook` prebuild (CX6's P1 — `npm run storybook` now builds the addon itself)). **Zero-no-op sweep:** every interactive element re-audited; the dead cluster landed real wiring — zoom cluster + ⌘\ + ±/⌘0 (spec 16 §3.8), marker-color dropdown + ⌘⇧←/→ marker nav, ⌘⇧I/O, ⌘S/⌘E, ⌘⇧M, [ ] non-ripple trim, ⇧J/L, ⇧,/. ×10, tool-radiogroup arrows + Toolbar2 roving (§11.1), effects drag-to-clip, Color/Deliver form controls, Deliver §4.2 empty/failed rows, Viewer loading/error rows, mixer auxPreFader/auxB/aux-on toggles, SoundLibrary sort, bracket drag + slider grammar, Clip Enter/Space, two-way scroll sync, height menu rows, add-track above/below, DebugOverlay copy-failure + save-fail drill. **Store laws:** loop ordering (start ≤ end, the inverted-window hang is dead), link-toggle gating (N4's reference answer), split linkedTo law, MIN_DUR unification, duplicate-at single undo, multi-track viewer resolution, loadSample mixer rebuild, ⌘M any-kind focused track. **Suite: 511 → 596 tests, tsc clean.** **Both-directions spec audit:** candidates file grew to §E (15 net-new N-findings incl. 2 P1s — ElementJSON container home, Link A/V contract vacuum; strengthenings to A2/A5/A6/B1-B3; 19 new C-registrations C10-C28) + comment posted to GitHub issue #2.

**R13 (2026-09-04) landed (test + PR + review-gate round):** the mock got its **test program** — Vitest 5 + RTL + jsdom, **33 files / 511 tests**, co-located `*.test.tsx`, per-test store-reset contract (`src/test/setup.ts`), provider-stack helpers; PR **#1** opened (base `ui-baseline` @ `ce16d33`, head `main`, 143 files ≤ 300) which pulled in **CodeRabbit + Codex + three maintainer review waves**; five fix rounds closed every P1/P2 (only P3s remain, deliberately): store bug-hunt (deep-clone undo, no-op history pollution, dead ⌥⇧M, setMixerTrack partial strips, lockAll/selection-in-undo, locked-track law, ripple trim + target constraint, id collisions, range-param stub), keyboard/a11y parity (Tab scoping, slider grammar on scrub rows, splitters/menu tabs/cards keyboard-operable, danger-dialog cancel-first, violet AA), §4.9 menu enumerations completed, §6.4 keyboard multi-delete confirm, annotakit hotkeys remapped off the shell's keys + vendor functional fixes with dist rebuilt. **Direction-2 output: `.agents/SPEC-REVISION-CANDIDATES.md` + GitHub issue #2 (17 entries: 6 spec-vs-spec conflicts, 4 missing canon answers, 9 mock registrations C1-C9, seal staleness flags).**

**R12 (2026-09-04) landed (user-feedback round):** mixer relocated to a RIGHT-SIDE DOCK beside the multi-track lanes (design doc v2.2 — 3 states preserved: 44px bridge rail / full strip row with fill-height faders); inspector seam direction fixed (was inverted+runaway) + Inspector/MediaPool fill their columns (w-full); playhead triangle re-centered on the bar centerline (was 2px off); **Storybook 10.6 + annotakit 0.4.0** (vendored, pin-comments with component/file:line digests, sqlite store, GitHub issue mirror ACTIVE) served at the platform preview URL via `storybook dev --port 3000` under a supervisor; **71 stories** (every shell region, chrome strip, timeline leaf, mixer surface, page, overlay, primitive); viewer overlays + safe-area guides became store-level UI prefs (real 90/80% guides); review gates: code review NO MAJORS + spec review 1 major (type floor) — all closed.

**R11 (2026-09-04) landed:** layout overhaul to spec-18 geometry; the five v1.1 surfaces (context menus §4.9, toasts §6.4, state rows, pointer/wheel grammar, sample project); media-pool drag-to-lane/multi-select; 40-key map w/ JKL + undo; **Audio focus mode** per peer-reviewed `ui-mock/shell-variants/docs/DESIGN-audio-mode.md` v2.1 (4th dock page ⌘4, 3-state mixer, channel editor = S/G seam, sidechain ducking = spec 20 §12.2 mock answer, escalation gesture); **Storybook 9** (29 stories). Review gates: code review → all majors fixed → re-check verdict **NO MAJORS REMAIN**.

`ui-mock/shell-variants/` — interactive TSX mockup of the spec-18 shell (React 19 + Vite per 00 §4) with a ctrl+` Variant Explorer: direction presets **A Resolve Classic** (spec-canonical), **B Modern Studio** (elevated dark, violet), **C Editorial Light** (tests the 18 §8.14 rejection). Three sub-agent review rounds (pro-editor / product-designer / a11y+spec) → R3 verdict: **NO MAJORS REMAIN — valid for user review**. Mock-level interactions live (drag/trim/split with snap, playhead, search, variants persist + share links).

**Next steps (in order):**
1. **USER REACTION remains the gate** — now with TWO surfaces: the PR (#1, CodeRabbit review + the candidates issue #2) and the live pins (public URL → annotakit → GH issue mirror). Tour the presets + Audio focus; answer DESIGN-audio-mode.md §11 q1-q9.
2. **PR #1 close-out** — remaining open items are P3-only (the maintainer's corpus lists them; batch as a polish round or fold into wiring); re-run CodeRabbit on the final commit; merge or keep open per the user's call.
3. **Seal round inherits THREE new inputs:** seal items 10-25 + `SPEC-REVISION-CANDIDATES.md` (R14: A1-A6 conflicts + N1-N15 net-new findings incl. 2 P1s, B1-B4 + strengthenings, C1-C9 + C10-C28 registrations, D staleness flags — the file is now the complete spec-amendment worklist) + the 596-test suite as the regression harness for any wiring.
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

## R15-UI round (parallel to the R15 assembly round) — timeline parity + audio overhaul — COMPLETE

**User ask:** bridge the mockup's UI layer to the canonical timeline seam
(bearachprema/opencut-timeline — match exactly, not invent) + heavy audio/DAW
pass borrowing zmmac1/web-daw-ui (fix the broken knob/meter) + keep Storybook
in sync + iterative sub-agent design/code review.

**Landed (14 commits, 596→788 tests, tsc clean, 83-story build green):**
- Research: 3-agent extraction — opencut seam contract (43 points), DAW
  pattern reference, mockup defect audit (18) → `.agents/research-r15/`
- Design: `.agents/design/R15-{timeline-parity,audio-overhaul}.md` v2 FINAL
  after adversarial C1/C2 critique rounds (C1's zero-anchor inversion + C2's
  antiphase knob both caught pre-implementation)
- Timeline T1–T9: pixel/zoomController/rulerTiers/timelinePlacement/trimLaws/
  ripple libs; two-regime anchored zoom; CapCut ruler + virtualization; full
  gesture discipline; 2D cross-track drag (preferIndex, overlap rejection,
  zero-anchor, mixed-group reject); ripple interval-diff; all 5 tool
  gestures; snap upgrade + indicator; clip virtualization
- Audio A0–A5: token sheet, SVG knob (antiphase fixed), stereo meterEngine,
  dB-linear meters, fader scale, strip chrome, header micro-meters (v2.2
  §3.2 closed), Storybook deterministic levels
- Reviews: V1 (4 verified bugs) → F1 fixes → V2 SHIP → P3 closers
- Runtime: supervisor crash fixed (numeric-fd write), instrumentation.ts
  auto-boot chain (next-server → supervisor → :3000), static + runtime synced
- Registrations: SPEC-REVISION-CANDIDATES §G (spec-16 §3.8 ×1.7, spec-18 §5A
  two-regime + 18↔05 conflict, alignment record, deferral ledger)

**Standing for the next round:** CodeRabbit re-review of the 14-commit range
on PR #1; V2's 2 deferred P3s (duplicateAndMove raw-API edges, snap-ON
head-drag fallthrough); G.4 deferral ledger items are engine-team questions.

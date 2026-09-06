# ARCH-R22 — The Finality Audit: Spec Posture, App Topology, and the Crawl-Walk-Run Plan

**Written:** 2026-09-07 (Round 22, the spec-stream audit round)
**Trigger (user directive, verbatim intent):** (1) the spec + plan must be reviewed/audited to be *absolutely final*; (2) each spec must *mainly reflect what needs to be done* — the existing code is the accepted base, cited as reference, not re-explained; (3) the spec must be *complete and exhaustive* — even for existing code, the functional + non-functional acceptance must be stated so the spec is fully executable (with a test plan); (4) architecturally: decide whether a separate `nle-ui` is needed; define the way to reach the **shell-mini UI mock, FULLY working, on the core modules (a smaller subset — crawl/walk/run)**, then aim at the **full NLE (shell-variants-class, DaVinci Resolve + web-DAW functionality)**; (5) the plan must state the exact execution phases and what can be parallelized.
**Status:** DRAFT for adversarial review (2 rounds before landing). Review trail: §7.
**Evidence base:** fleet snapshot 2026-09-07 (`31d659d` spec / `f68ab8c` engine / `05584d8` OT / `fe05d85` WDC / `dba8d52` nle-ui / `e662759` nle-test-app); all durable docs read in full (6 repos' PLAN/HANDOFF/SKILL/DECISIONS); spec staleness matrix (all 21 specs cite R15-era pins — 3+ module rounds stale); OT-SEAMS.md; spec 18 §16; ARCH-R15 §3.4 (the A0-A7b plan this audits).

---

## 0. The audit verdict on the current state (what this round found)

The fleet is FIVE weeks of execution ahead of the spec set's operating picture. The A0-A7b plan (spec 14, R15) described an `nle-app` repo that did not exist and a mock track that was "design reference"; reality since delivered: (a) **nle-ui** — the productized shell-variants package (engine-free, 640+ tests, D23 two-repo topology, actively evolving, cross-repo queue protocol operating); (b) **nle-test-app** — the app layer (THE assembly: OT timeline wired via `EngineMount`, engine composition via `ProgramCanvas`/N1, real audio crossfades/N3, av-link/N4, WDC audio host + W1 meters, 80+ tests); (c) **engine N1-N4 closed** (composition frame seam, flattener params, transition windows, av-link bridge; vendor/WDC re-pinned); (d) **OT S-round** (transport policy, track lock, transitionOut, bookmarks — 459/459, real-mouse suite, consumer migrated); (e) **WDC W1** (canonical meter taps, upstream push landed). Meanwhile the spec set still pins R15 SHAs everywhere, re-narrates completed work as if pending, and carries its gap registers inside three specs only (06/14/15).

**The verdict:** the spec set is NOT final. It fails the user's three tests: (i) *posture* — specs spend most of their ink describing what exists (the 70%-done case the user described), not what's missing; (ii) *exhaustiveness* — 14 of 21 domain specs have no acceptance section; the test-plan layer (spec 17) is baselined to dead SHAs; (iii) *architecture currency* — spec 14's plan does not know the app layer exists, has no crawl milestone, and does not answer the nle-ui question. This round closes all three.

---

## 1. Ruling A — the app-layer topology: KEEP the two-repo package+app split; `nle-test-app` IS the nle-app (rename it)

**Decision A1 (keep, don't fold).** `nle-ui` stays the engine-free chrome/UI package; `nle-test-app` stays the separate consumer repo that glues package + engines. No fold into a monorepo.

**Decision A2 (the app is named).** `nle-test-app` is promoted, in all spec text, from "the test/validation app" to **THE APP** (`nle-app`). The mechanical GitHub rename (`nle-test-app` → `nle-app`) is RECOMMENDED to the user (redirects keep old URLs alive; remotes/submodules re-point in one commit) but is NOT blocking: the specs call it "the app repo (`nle-test-app` → `nle-app`)" from now on. The name "test-app" undersells a repo that is the assembly root.

**Evidence for A1 (why keep):**
1. **User provenance:** D23 was a *user correction* (R4: split the app layer into its own consumer repo). The topology being questioned is the one the user themselves installed; nothing since has failed.
2. **The boundary test is the point.** The consumer repo's stated reason to exist — "if this app can't compose the package's public surface with the engines, the boundary is broken" — is exactly spec 14's S2/S3 gate (state-WYSIWYG + wired shell), now running continuously instead of once per phase.
3. **The package discipline paid off twice:** nle-ui builds with ZERO engine import (engine-shaped seams, D20) — which is what made the both-worlds law possible (package Storybook = mock world, app = engine world, one flip apart) and what let the R7/N1 program-monitor seam land package-side, app-side, engine-side in one wave without entangling the engines in UI code.
4. **The cross-repo protocol is operating:** OT's S-round filed its follow-ups to nle-ui's main (`dba8d52`: patch.transitionOut widening + lock router route) — the queue pattern works; folding would dissolve it.
5. **The fold's honest cost:** merging the package into the app re-internalizes the public surface; the boundary that forced clean seams stops being enforced by anything; the package's standalone Storybook (the design-review world for BOTH shell grammars) would need rebuilding inside the app.

**Registered counterargument (the steelman, answered):** "two repos = pin churn + install landmines (the bun/npm file: symlink traps documented in both HANDOFFs)." Real, but the churn is bounded (one business-day pin-lockset law, already practiced) and the landmines are now documented laws in SKILL files. The alternative cost (boundary discipline loss) is unbounded. Fold is rejected.

**Decision A3 (the package grows a second chrome family).** `nle-ui` currently carries ONE shell family (the desktop-class `AppShell` = shell-variants grammar). The crawl needs the **MiniShell** — the shell-mini quick-cut grammar (compact chrome, RH tokens, qc- class anatomy) — as a SECOND engine-free chrome family in the same package. Both families share the package's slot discipline (`timelineRegion`, `programMonitor`, `mediaDragSource`), the token seam, and the state law. The package becomes "the chrome library of the NLE product: compact + desktop-class."

---

## 2. Ruling B — the crawl: the shell-mini UI, FULLY working, on a subset of the core modules

**The target (user's words, made testable):** an app build that renders the shell-mini UI grammar and behaves by the mini's law set, where EVERY surface is real: playback through the engine, timeline ops through OT, audio through WDC/engine. No mock stores, no improvised op logic, no static thumbnails. The *feature subset* is the mini's (that is the point — crawl before walk); the *module authenticity* is total.

**The crawl vehicle:** the app repo gains a **mini mode** — `MiniShell` (from nle-ui, Ruling A3) + the existing `EngineMount` (OT timeline) styled to the qc- grammar + the existing `ProgramCanvas` (engine N1) in the mini's viewer frame + the existing WDC audio host at mini scale. The mini mock itself STAYS in the spec repo as the design reference + law register + live review surface (annotakit), per the §4.4 retirement law — it retires only when the crawl app matches it.

**The crawl phases (C-series; exit gates are the acceptance):**

| Phase | Repo | Deliverable | Exit gate (essence) |
|---|---|---|---|
| **C0 grammar extraction** | nle-ui | `MiniShell` port: tokens/qc-CSS anatomy from `ui-mock/shell-mini` (the RH-skin extraction doc is the source), slot-compatible, engine-free | package tests green; MiniShell renders in package Storybook with mock timeline; zero engine imports (boundary script) |
| **C1 timeline crawl** | app + OT | OT `TimelineView` (the `EngineMount` port) styled to the qc- grammar via the token seam; the mini's window/binding model as the app-level embedding law (host-injected pair + lock — OT-SEAMS row 13); the OT-SEAMS gap rows dispositioned (see §2.1) | every mini timeline law either holds on OT or is a REGISTERED gap with an owner; side-by-side screenshots (mini mock vs crawl app) at the same seed doc pass VLM+DOM comparison |
| **C2 viewer/transport** | app | `ProgramCanvas` in the mini's viewer; the mini's scrub-bar/seek/walk-back laws bound to engine playhead ownership (the event staircase's playhead rows) | scrub/play/seek real (no mock clock); the 21-state row set (spec 18 §4.2) honest |
| **C3 audio crawl** | app | WDC meter taps + engine audio in the mini's waveform/mute laws (N2 volume/mute already flattened; W1 taps landed) | waveforms + mutes audible/pinned; the mini's mute law = engine law (one owner) |
| **C4 mini-parity gate** | app + spec | THE gate: the crawl app passes the mini's law net (re-expressed as app/OT tests: the drag clamp law, trim ghosts, ripple, zoom ladder, scrub, keyboard surface, a11y) + battery + demo | **DEMO at mini scope: import(virtual) → cut (drag/trim/split/ripple) → play → export; zero mock paths; side-by-side final** |

**§2.1 The OT-SEAMS dispositions (each row gets an owner + phase):** rows 1/2/4 (drag/magnet/move = clamp law on OT's session discipline) — OT controllers + app policy; row 5 (pool insert gap-fit: the mini hunts same-track gaps, OT `firstAvailable` doesn't) — app-layer placement policy over OT's placement queries (registered, NOT an OT change — host affordance); row 6 (trim ghost edges — view-layer affordance) — OT view additive or app port config; row 13 (the window/binding model) — app embedding law (host-injected), OT stays whole-project; rows 10/11/12 (scrub/selection/undo) — OT-native already. The drag-revert law (R18k clamp, user-P0'd) is the crawl's drag law; the tombstoned escape rows stay tombstoned (only a USER-REQUESTED retry re-opens them).

**Estimates (fresh-senior, honest):** C0 ≈ 1 wk; C1 ≈ 2-3 wk (the styling seam is proven, the gap rows are bounded); C2 ≈ 1 wk; C3 ≈ 1-1.5 wk; C4 ≈ 1 wk. **Crawl total ≈ 6-8 wk solo / 4-5 wk two-dev.**

---

## 3. Ruling C — walk and run (the full NLE: shell-variants-class, DaVinci + web-DAW depth)

**Walk (the desktop-class shell at full module depth).** The `AppShell` (already in nle-ui) grows module depth — this is the R15 A-series RE-BASELINED onto the live repos (the content survives; the vehicle changes):

- **W-ops (was A2/A2.5):** op-family ports (slip/slide/roll/rateStretch; retime/freezeFrame/rangeRemoval) — engine algorithms → OT, tests carried; C7 rename (the 24 prefixed wire names — OT S-round made this cheaper, the wire surface is now the S-round's shape); error-envelope refinement.
- **W-media (was A3 remainder):** the media layer (MediaRecord registry + probe + lookup), the event staircase (all rows, spec 15 §9.5 register), telemetry. The A3 demo (import → cut → play → export) already has its components landed — the walk generalizes them past mini scope.
- **W-audio (was A4 + M2):** mixer G-wiring full depth (inserts/sends/aux real), SoundTouch offline pitch (WDC M2), sidechain, PDC coordination, automation shapes (spec 20 §12); N2b keyframed volume (engine queue).
- **W-project (was A5):** ProjectJSON persistence, multi-scene app slice, cross-scene undo budget.
- **W-color:** the color page real through the engine (the variants' W4 grade math — already spec-08-exact in the mock — ports to/binds the engine's pipeline; A7b scopes/secondary-qualifier/power-window from the engine P2 backlog surface here).

**Run (the long tail that completes the product):** FCPXML export (was A6, greenfield, unchanged); cloud render (still unchartered — non-goal until re-scoped); engine P2 remainder (CPU transition fallbacks, ShapeItem/Lottie/Subtitle backlog); polish (was A7a: keymap long tail, i18n, a11y residuals, spec 18 §11 audit).

**The crawl→walk bridge is additive, not sequential-rework:** the crawl's MiniShell and the walk's AppShell are the same package's two families over the same slots; every engine/OT/WDC seam the crawl lands is a walk seam (the crawl is the walk's thin vertical slice). After C4, walk proceeds by DEPTH (pages/modules), not by re-assembly.

**Estimates (re-baselined on the live fleet):** walk ≈ 14-18 wk solo / 9-11 two-dev AFTER the crawl (the A-series' 22-27 wk estimate is superseded: A0 scaffold ≈ already exists; A1 projector ≈ superseded by the composition-frame seam N1 family + needs its formal parity corpus; A3 chrome ≈ half-done in the package); run ≈ 6-9 wk solo (FCPXML-dominated) / parallelizable.

---

## 4. Ruling D — the spec posture law (the have/need inversion)

Every spec restructures to the FORWARD contract. The law (applies to all 21 specs + 00-master):

1. **STATUS header re-typed.** Each spec's header gains the standard triad: **BASE** — what exists and is ACCEPTED (pinned: repo@SHA + suite + count; compressed to reference rows — no re-narration; the R9 code-first law governs: cite-the-code, don't inline it); **GAP** — the work that remains (the main body; each row: functional acceptance + non-functional acceptance + owner repo + phase tag from the crawl/walk/run plan); **ACCEPTANCE & TEST PLAN** — the executable layer (spec 17 facet row pointers + the battery + the suite names that already pin it — for BASE rows this is the regression role: "verified at pin X by suite Y").
2. **The contract text is not "re-explanation."** The laws (normative sections) STAY — they are the acceptance form for existing code (the user's test: "even for existing code it should still describe functionally and non-functionally the acceptance"). What compresses: round-history narrative, "what we did and why" prose, status-of-the-round sections, superseded-phase bodies. What grows: per-item acceptance rows + gap registers.
3. **One pin world.** All specs pin the 2026-09-07 fleet SHAs (this round re-baselines: engine `f68ab8c`, OT `05584d8` (mirror head `ea10c42` for the vendored `src/lib/timeline`), WDC `fe05d85` (consumer pin `5570321`), nle-ui `dba8d52`, app `e662759`). Spec 19's code-ref tables re-grep'd. Stale-SHA sweep is battery-enforced (stale-pins = FAIL).
4. **The gap registers unify.** Spec 14 §4 (per-domain), spec 06's op-family register, spec 15 §13.15, the OT-SEAMS deltas, the C-ledger (SPEC-REVISION-CANDIDATES §C), and the module repos' own queues fold into ONE forward inventory: each spec's §0 "What needs to be done" — cross-referenced, not duplicated (one row lives in ONE spec; others link).
5. **Exhaustiveness bar.** A row with no acceptance is a spec bug; a facet with no coverage-matrix row is a spec bug (17 §14.4 step 0 — now enforced by battery). NFRs (00 §6A table) bind every gap row that has a perf/a11y/correctness surface.

**What does NOT change:** the canon hierarchy (00 §2.5), the decision register's authority, spec 17's facet discipline, the battery mechanics. The inversion is a re-typing, not a re-scoping — no contract weakens.

---

## 5. Ruling E — the parallelization map

**Streams (each with its own gates + repos; the app is the integrator):**

| Stream | Repo(s) | Now → next | Runs parallel to |
|---|---|---|---|
| **S-engine** | nle-engine | N2b keyframed volume (design round queued); projector parity corpus (the A1 formalization — the N1 family's missing S4 suite); P2 backlog (scopes, secondary qualifier, power window) | everything (module-gated) |
| **S-ot** | opencut-timeline | the crawl's C1 gap rows (trim ghosts, zoom ladder config, ripple toggle semantics); W-ops family ports (slip/slide/roll/rateStretch with carried tests); C7 rename when the walk opens the wire | engine/WDC/app chrome |
| **S-wdc** | web-daw-core | M2 SoundTouch offline port (queued); sidechain/PDC/automation shapes | everything |
| **S-package** | nle-ui | C0 MiniShell; the OT S-round queue (patch.transitionOut widening, lock router route); W-ops keymap surfaces | OT (file-queue protocol) |
| **S-app** | nle-test-app | C1-C4 (the crawl build); W-media/W-project after C4 | package (pin bumps) |
| **S-spec** | nle-core-spec | THIS round (finality); then: the crawl's acceptance corpus (mini law-net re-expression), review-loop housekeeping | everything |

**The laws that make it safe (all already practiced, now normative):** pin-lockset bumps within one business day; `git fetch` before every push (the sibling-session races are real — three documented this week); module repos never break the app unnoticed (nightly HEAD-follow + lockset assertion); cross-repo work is FILED as queues (the `dba8d52` pattern), never done unilaterally in the consumer; the battery runs after every spec round; every stream keeps PLAN/HANDOFF/SKILL current at wrap.

**Critical path:** C0 → C1 → C2/C3 (∥) → C4 → walk's W-ops/W-media (the demo re-gate at full scope) → W-audio/W-project/W-color (∥ where two-dev) → run. Solo: the chain is serial; two-dev: S-ot (gap rows + op ports) rides parallel to S-package/S-app through the crawl, cutting the crawl to ~4-5 wk and the walk by ~4 wk.

---

## 6. What this round LANDS (the spec-set execution list)

1. `14-implementation-phases.md` — REWRITTEN as the crawl/walk/run plan (phases, gates, parallelization, re-baselined registers, the R15 A-series traceability table updated). [R22-5]
2. All 21 specs + 00-master — the §0 forward-inventory + STATUS triad re-type (Ruling D); spec 17 gains the acceptance-executability layer; spec 19 re-pinned to the 2026-09-07 SHAs; spec 18 §16 re-pointed (the MVP vehicle is now the crawl app, not the mock itself). [R22-6]
3. `00-master-spec.md` — the R22 decision rows (A/B/C/D/E) + the fleet table (7 repos incl. the app's promotion). [R22-6]
4. `battery_r22.py` — the finality battery: posture checks (every spec has BASE/GAP/ACCEPTANCE triad; no R15-era stale pins; gap rows carry acceptance+phase), plan checks (spec 14 carries C/W/R phases with owners + estimates + parallel map), architecture checks (the app repo is named; the crawl gate is testable), plus the R15 battery's surviving checks. [R22-7]
5. PLAN/HANDOFF/SKILL/worklog wrap + GitLab + /home/sync backup. [R22-8]

---

## 7. Review trail

- Round 1 (adversarial, architecture): pending — reviewer gets this doc + the evidence pack; charter: attack the rulings (fold-vs-keep, the crawl vehicle, the estimates, the posture law's exhaustiveness bar), verify the claims against the repos.
- Round 2 (adversarial, plan/executability): after the spec-14 rewrite — charter: attack the phase gates' testability, the parallelization's hidden dependencies, the battery's blind spots.
- Both verdicts + amendments folded before landing; GO required before the spec edits execute.

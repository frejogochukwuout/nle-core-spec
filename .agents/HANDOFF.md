# HANDOFF — Next Session Scope (nle-core-spec)

**Written:** 2026-09-05, end of the R15 ASSEMBLY round (pushed through `81bafc2`; gitlab backup = same)
**Scope of this file:** IMMEDIATE next session ONLY. Long horizon lives in `.agents/PLAN.md`. Process meta-lessons live in `.agents/SKILL.md`.

---

## What this session produced

R15 was the assembly + implementation-path round (user ask: honest evolve-vs-greenfield assessment, the assembly architecture, the execution plan, and a deep pass to push the spec toward final):

- **Decisions 15/16/17 landed in 00-master v6.0** (evolve-in-place; the `nle-app` assembly architecture — fifth repo + pinned-submodule lockset + ENGINE-home projector + two-staircase commands-down/events-up + app-level multi-scene; four-walls-one-roof verification). Each ruling went through: ARCH-R15 v1 → two parallel fresh-context peer reviews (adversarial architecture + practical execution) → v2 folding ALL 7+8 findings → BOTH re-reviews SIGNED OFF → v2.1. Full record: `audits/ARCH-R15-assembly-and-path.md` + `audits/REVIEW-R15-ARCH.md` + `audits/REVIEW-R15-EXEC.md`.
- **spec 14 REWRITTEN as the assembly plan** (week −1 pre-flight + A0-A7b phases with exit gates + per-domain gap registers citing module pins + P→A traceability; the honest calendar: A7 ≈22-27wk solo / 13-16 two-dev, DEMO (A3) ≈11-13/7-8; P0-P6 bodies retired to git history).
- **spec 15 gained the routing-disposition table (§4.1A, 78/78 members — every union member's home or typed NOT_IMPLEMENTED), §4.1B NOT_IMPLEMENTED code (registered in §6.3), §9.5 event-name mapping register, §10.1 versioning-at-bus; §13.15 refreshed to the 24-command reality** (+ N5 loop invariant, the C7 rename list complete).
- **The full candidate amendment set processed:** A1-A6 + B1-B4 + N1-N15 landed across 09/05/16/18/20 (with cross-spec fixes: 15's marker-note → per-scene, 181 bindings, R→ripple); **19/17 re-baselined to R15 SHAs** (engine 274+265+318 @f526e67, OT 423/423 @0412e41, WDC 721/721 pure @374711c, mock 596/596 @d42693e) + 17's new roof-suite section; README R15.
- **INTEGRATION-REVIEW-R15:** 0 BLOCKING/6 MAJOR/7 MINOR → ALL fixed (`6315cd6`); verdict CLEARED. **`scripts/battery_r15.py` — 47/47 green** (replaces battery_r9; the R9 checks retired with the canon they checked).
- **Four scouts, gates re-run in-sandbox:** SCOUT-R15-A/B/C/D in `audits/` (the current verified facts on all four repos — also the best onboarding pack for anyone joining).

## Next session's task: USER REACTION + ASSEMBLY KICKOFF DECISION

1. **The user's gate decision:** green-light `nle-app` creation (then **week −1 pre-flight** is the first work item — the 12-item list in REVIEW-R15-EXEC §7, with the TS one-compiler spike + Vite HMR spike as GATES; the dev-loop config to adopt verbatim is REVIEW-R15-EXEC §2.2) — or further seal-polish rounds. The parallel session's `.agents/design/` docs (R15 W0, `ac784f7`: timeline-parity + audio-overhaul design v2 FINALs) are the MOCK-side iteration track and remain live.
2. **Watch PR #1 + issue #2** (the mock's review surfaces; only 2 P3 inline comments remain; the C-ledger keeps registering).
3. **Known forward obligations recorded in-canon:** the per-row pin-SHA battery clauses land at A2; the union's Bookmark block retires at the next union-version bump; 10 §1665's FCPXML marker wording gets its A6-consistent pass; engine cosmetic folds (layout.tsx metadata, ~280→265) ride the next engine commit; OT submodule pin bump (3420b5f→0412e41, low-risk, carries W9 fixes — recommended by SCOUT-B §9).

## Repo state at handoff

| Repo | Commit | State |
|---|---|---|
| nle-core-spec (canon) | `81bafc2` | 21 specs (00 v6.0 with 17 decisions; 14 = assembly plan; 15 w/ routing table); battery_r15 47/47; ui-mock @`d42693e` (596/596) untouched this round |
| nle-engine | `f526e67` | sealed (274+265+318, ledger closed) — NOT touched this round |
| opencut-timeline | `0412e41` | sealed (423/423, W9 terminal) — NOT touched |
| web-daw-core | `374711c` | sealed (721/721, pure) — NOT touched |

**Parallel sessions are ACTIVE on this repo** (the user works in parallel: `ac784f7`, `0403225` landed mid-round, both rebased cleanly). ALWAYS `git fetch` before push; `git pull --rebase` on rejection; NEVER force push.

## Mechanics to reuse

- The battery: `python3 scripts/battery_r15.py` after every fix round (47 checks; recalibrate stale checks; the live-hit discipline exempts annotated supersessions — check BOTH directions' context).
- Peer-review pattern that worked: write the decision doc → 2 parallel fresh reviewers (different lenses) → fold ALL findings → resume both for re-check → sign-off gate → land. ~2 rounds, ~30-40 min, caught 1 CRITICAL + 10 MAJORs this round.
- Sub-agent fleet discipline: disjoint file ownership per agent (AM1: 16+18 / AM2: 09+05+20 / AM3: 19+17) — zero clobbering; the integration review AFTER is non-negotiable (it found 6 propagation Majors the agents' own QA missed).
- GitLab backup remote is configured: `git push gitlab main` (namespace `ansgareutychisO`; WAF retries probabilistically).
- The PAT for module-repo access: lives in the runtime .env / remote URLs only (NEVER in committed files — GitHub's secret scanner blocks pushes; recover from the session chat if lost).

## Standing cautions

- The spec set is CONTRACT + GAP + ACCEPTANCE (D14) — now with the assembly plan (D15-17). The mock does NOT amend specs — deviations live in SPEC-REVISION-CANDIDATES.md (C-series = the live ledger).
- Never edit web-daw-core's `copy`-class files (file-class law).
- Push at every micro milestone; `git fetch` before push; never force push.
- The PAT lives in runtime .env files / remote URLs — NEVER commit it.

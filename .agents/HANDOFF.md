# HANDOFF — Next Session Scope (nle-core-spec)

**Written:** 2026-09-02, end of Round 8 (pushed @ `f1a261c`)
**Scope of this file:** IMMEDIATE next session ONLY. Long horizon lives in `.agents/PLAN.md`. Process meta-lessons live in `.agents/SKILL.md`.

---

## Restore context first (10 min)

1. `/home/z/my-project/worklog.md` — tail (Round-8 record)
2. `19-code-references.md` §12 — the 9-item seal checklist (this round's scope)
3. `.agents/PLAN.md` — round history + standing rules
4. `audits/SCOUT-R8-{A,B,C}-*.md` — the three integration reports (A: opencut-timeline, B: engine delta, C: cloudcut ux-spec)
5. PAT + repo URLs: see worklog Round-8 bootstrap entry

## Repository states at handoff

| Repo | Commit | Notes |
|---|---|---|
| nle-core-spec (canon) | `f1a261c` | Round 8 complete: 19 specs + R8 review + PLAN/HANDOFF/SKILL |
| nle-engine | `8ac91d9` | Waves 4A/4B/4C/4D-A landed (144/144 reported); D1 resolved AGAINST spec (C8 adapter is the convergence task) |
| opencut-timeline | `d3b2163` | Landed: types/ops/controllers/headless (136/136); W4 components + W5/W6 commands pending |
| cloudcut-nle | `ux-spec` @ `9b9f68a` | Integrated ours-wins (spec 18 v1.1); watch for branch evolution |

All three reference repos are ACTIVELY DEVELOPED — `git fetch`/`git pull` every one before any analysis; re-baseline line-number citations with fresh greps (Round-8 lesson: every engine citation moved).

## Next session's task: the SEAL ROUND (or a Round-8 delta if repos advanced)

Default scope = spec 19 §12's checklist, in PLAN's priority order. First actions:

1. Fetch/pull all four repos; diff engine vs `8ac91d9` and opencut-timeline vs `d3b2163` — if either advanced, scout the delta FIRST (waves/CHANGELOG/gaps docs), then apply §12 items against the new state.
2. If nothing moved: start with the D3 text-stack decision (item 4 — time-boxed, blocks the engine's 4D-B) and the decision-reconciliation sign-off lines (item 5 — pure spec work, no repo dependency).
3. Item 6 (citation sweep) is mechanical: re-grep every code-ref table row against the clones; the Round-8 scripts (`/home/z/my-project/scripts/battery_r8.py`, `integration_spot_r8.py`) are the templates — recalibrate their stale checks first.

## Round-8 mechanics to reuse

- Scout dispatch: 3 parallel `general-purpose` agents, one per source repo, read-only, citation-verified reports into `audits/SCOUT-R9-*.md`
- The ours-wins integration pattern: applicability matrix (ADOPT/ADAPT/REJECT) + numbered contradiction register + rejection register (SCOUT-R8-C's format)
- Battery discipline: fix → full battery re-run → recalibrate checks whose wording went stale (e.g. count formulations, presence-checks that should flip to absence)

## Do NOT redo (Round-8 landed, reviewed, pushed)

- Decision 11 + the seam (specs 00/14/19/05/06/15 all aligned; INTEGRATION-REVIEW-R8 PASS)
- spec 18 v1.1 (UX integration) + 00-master §6A (NFRs) + spec 17 v1.1 §13A (facet matrix)
- spec 09/06 citation re-baselines; README Round-8 status
- Union 78 / NOOP / §7.1A transaction semantics (spec 15)

## Wrap-up obligations for whatever round you run

1. Push at every micro milestone.
2. Update this HANDOFF (replace with the next session's scope) + PLAN (round history row) + SKILL.md (new meta-lessons only).
3. Append the session record to `/home/z/my-project/worklog.md` (the shared log — never fork it).
4. Run the full battery + write the round's INTEGRATION-REVIEW before the final push.

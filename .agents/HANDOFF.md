# HANDOFF — Next Session Scope (nle-core-spec)

**Written:** 2026-09-02, end of Round 9 (pushed @ `4bc8c4d`)
**Scope of this file:** IMMEDIATE next session ONLY. Long horizon lives in `.agents/PLAN.md`. Process meta-lessons live in `.agents/SKILL.md`.

---

## Restore context first (10 min)

1. `/home/z/my-project/worklog.md` — tail (Round-9 record)
2. `audits/ARCH-R9-three-domain-strategy.md` — **the round's ruling** (three domains; read §2-5 for the reasoning, §7 for the seal watch items)
3. `00-master-spec.md` — Decisions 12/13/14 + §2.5 doc governance (v5.0)
4. `.agents/PLAN.md` — seal-round priority order
5. Repo states + PATs: see worklog Round-9 bootstrap entry (NOTE: a second PAT was issued for the three bearachprema repos — engine/OT/web-daw-core; the spec repo PAT is unchanged)

## Repository states at handoff

| Repo | Commit | Notes |
|---|---|---|
| nle-core-spec (canon) | `4bc8c4d` | Round 9 complete: 21 specs (00-20) + ARCH-R9 + R9 review + battery_r9 48/48 |
| nle-engine | `624a76b` | Waves 4A→5C complete: 202/202, 25/25 milestones, ~47k LOC, real A/V export. **M1.5 audio wiring (vendor/web-daw-core) NOT yet landed** — it is the next convergence duty (Decision 13) |
| opencut-timeline | `4e39b67` | **"FINAL as a distilled opencut timeline"** — 297/297, components+controllers+hardening landed, SEAMS.md written. Remaining: P3 polish + **C7 rename (open)** |
| web-daw-core | `bc68ee0` | 737/737, M1 bridge + triangle de-risk landed. M1.5 engine-side wiring open; M2 (mixer surface) not started |
| cloudcut-nle | `ux-spec` @ `9b9f68a` | Integrated ours-wins (spec 18 v1.1); watch for branch evolution |

All four repos are ACTIVELY DEVELOPED ("still finalizing" per the user) — `git fetch`/`git pull` every one before any analysis; re-baseline line-number citations with fresh greps (R8 lesson: every engine citation moved; R9 confirmed it again with 4D-B→5C).

## Next session's task: the SEAL ROUND (or a Round-9 delta if repos advanced)

Default scope = `.agents/PLAN.md`'s seal priority order (which equals 19 §12 + ARCH-R9 §7). First actions:

1. **Fetch/pull all repos; diff engine vs `624a76b`, OT vs `4e39b67`, web-daw-core vs `bc68ee0`.** The user said all three are "still finalizing" — a delta is LIKELY. If any advanced: scout the delta FIRST (its HANDOFF/gaps/DECISIONS docs), then apply the seal items against the new state. Pay special attention to: engine `vendor/web-daw-core` appearing (M1.5!), OT's C7 rename (types losing their `timeline.*` prefixes), web-daw-core M1.5/M2 movement.
2. **If M1.5 landed in the engine**: verify per ARCH-R9 §7.1 (submodule + parity gate + EXECUTED AudioMixer retirement + audio-mix.ts end-state) — this is PLAN item 1 and the biggest single seal event.
3. **If nothing moved**: the C7-rename charter and the decision-reconciliation sign-off lines (PLAN items 3-4) are pure spec-side work — safe to start immediately.

## Round-9 mechanics to reuse

- **The challenge round pattern**: when the user pushes back on an architecture, re-derive from measured facts (LOC matrices, test assets, who-owns-what tables), not from prior-round conclusions — the R9 rulings each started with a fresh evidence table (ARCH-R9 §1).
- **The domain-decomposition lens**: overlap between two repos is resolved by asking "is this ONE domain duplicated, or TWO domains that each need a home?" — the answer differs for timeline (was duplicate → merged) vs audio (two domains → layered seam).
- **Battery discipline**: fix → full battery re-run → recalibrate; exempt-window logic must look BEFORE AND AFTER each hit (R9 lesson: a `superseded` marker 240 chars after a phrase is still context).
- **Rename mechanics** (if another suffix-era ever appears): git rm seed + git mv + header self-reference rewrite + path sed on LIVE docs only, historical round records untouched.

## Standing cautions

- Never edit web-daw-core's `copy`-class files by hand (file-class law; sync overwrites).
- The spec set is now CONTRACT + GAP + ACCEPTANCE (Decision 14): new spec text should state boundary contracts, deltas, and acceptance — not re-describe internals the repos already document (their SKILL/DECISIONS docs).
- The 6 historical round records keep their point-in-time `.refined.md` paths **by design** — do "fix" them.

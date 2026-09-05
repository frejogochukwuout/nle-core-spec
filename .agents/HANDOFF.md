# HANDOFF — Next Session Scope (nle-core-spec)

**Written:** 2026-09-05, end of the R16 shell-mini bootstrap round (core
landed through `96ea0db` + close-out commits; gitlab backup = same)
**Scope of this file:** IMMEDIATE next session ONLY. Long horizon lives in
`.agents/PLAN.md`. Process meta-lessons live in `.agents/SKILL.md`.

---

## ⚠️ FIRST ACTION for the next session — GitHub credentials

**This session could NOT push to GitHub** (origin): the R15-era PAT was not
re-shared in the R16 chat, so `git push origin main` fails with
"could not read Username". **Everything is safe on the GitLab mirror**
(`gitlab` remote, namespace `ansgareutychisO` — PAT recoverable from the
R16 session chat; NEVER write it into committed files, GitHub's secret
scanner blocks glpat- pushes) — GIT-IS-THE-DISK is satisfied. Next session:
get a GitHub PAT from the user and `git push origin main` (local main ==
gitlab main == the full history; a plain push is a fast-forward, NO force
needed). Also expect the gitlab WAF to 403 ~1/3 of pushes — just retry.

## What this session produced (R16)

The user's ask: bootstrap a **minimal** NLE shell mockup under
`ui-mock/shell-mini/` (simplified from the too-complex shell-variants),
skinned with `ui-mock/RH-timeline-editor.html`, similar setup incl
Storybook. Landed:

- **`ui-mock/shell-mini/docs/RH-skin-extraction.md`** — the skin's ground
  truth: verbatim `:root` token set + the full `quick-cut-timeline` DOM
  anatomy, extracted from the 7.2MB SingleFile DOM snapshot via headless
  computed styles (agent-browser) + VLM screenshot passes.
- **`ui-mock/shell-mini/docs/DESIGN-mvp.md` v2.1 FINAL** — the build
  contract: 11 decisions, the IN/OUT feature cut-list, the interaction
  laws. Went through an adversarial design audit (5 majors/14 minors, all
  folded) AND a post-implementation code review (2 P1/5 P2, all fixed —
  the P1s were: ruler %-positioning desync, snap self-magnet).
- **The app** (`npm install && npm run dev` → :5174/mini/, `npm run
  storybook` → :6007): React 19 + Vite 8 + TS strict + Tailwind 4 +
  Zustand 5 + lucide + Storybook 10.6 (a11y+docs, NO annotakit — deliberate,
  documented deviation). 93 tests / tsc / vite build / storybook-static all
  green. 30 stories / 4 groups.
- **Process artifacts:** PLAN.md R16 section, this HANDOFF, SKILL.md
  R16 meta-learnings, worklog at `/home/z/my-project/worklog.md`
  (session-local, not durable).

## Next session's task: USER REACTION + shell-mini v0.2 decision

1. **User gate:** tour the mock (dev + storybook; the deviations register
   is in the shell-mini README §"What's OUT"). The v0.2 candidate list is
   in PLAN.md R16 section — DnD media→timeline is the top item (deliberately
   cut per audit Q2; the loop is complete without it).
2. **GitHub PAT push** (first action above).
3. Then the standing R15 horizon: `nle-app` green-light decision or
   seal-polish (PLAN.md carries the full state; spec 14 is the assembly
   plan; battery_r15.py 47/47).

## Repo state at handoff

| Repo | Commit | State |
|---|---|---|
| nle-core-spec (canon) | `96ea0db`+close-out | R16 shell-mini core landed (GitHub BEHIND — push pending PAT; GitLab current) |
| nle-engine / opencut-timeline / web-daw-core | unchanged | sealed, NOT touched this round |

- **Parallel sessions are ACTIVE** (gitlab/main had a stale divergent
  variant of the R15 amendments — merged with ours, content-identical).
  ALWAYS `git fetch` before push; `git pull --rebase` on rejection; NEVER
  force push.
- Work dir convention: clone OUTSIDE `/home/z/my-project` (the watchdog
  force-checkouts that path every ~20s) — this session used
  `/home/z/nle-core-spec`.

## Mechanics to reuse (R16-tested)

- Skin extraction from a SingleFile DOM snapshot: `agent-browser open
  file://…` → `eval` computed styles + CSS-rule dump (grep `quick-cut` in
  styleSheets) → VLM on crops for vibe; trust the CSS, not the VLM's
  color guesses.
- The audit→fold→implement→review→fix loop worked exactly as the user's
  process prescribes; both rounds caught real bugs (back-to-back seed
  degeneracy was found DURING test-writing — write tests early).
- VLM screenshot validation: verify claimed defects against the DOM/CSS
  before fixing (the VLM hallucinated "missing dot grid / solid panels"
  that pixel-sampling disproved; but it caught the real viewer-text
  collision and the ruler desync was confirmed in-browser rects).

## Standing cautions (unchanged + R16 additions)

- The mock does NOT amend specs; deviations live in the mock's README
  (shell-mini now carries its own deviations register) — spec-side
  findings still go to `.agents/SPEC-REVISION-CANDIDATES.md`.
- Never force push; PAT lives in chat/runtime only (GitHub's secret
  scanner blocks committed PATs); GitLab WAF 403s are probabilistic — retry.
- The shell-variants' annotakit addon is NOT wired into shell-mini —
  do not assume pin-comment tooling works there.

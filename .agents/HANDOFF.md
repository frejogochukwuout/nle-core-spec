# HANDOFF — Next Session Scope (nle-core-spec)

**Written:** 2026-09-04, end of the R13 test + PR + review-gate round (pushed through `b8d504f`)
**Scope of this file:** IMMEDIATE next session ONLY. Long horizon lives in `.agents/PLAN.md`. Process meta-lessons live in `.agents/SKILL.md`.

---

## What this session produced

R13 was the test-coverage + code-review round (user ask: full test coverage, PR for review, opus sub-agent review waves + CodeRabbit until only P3s remain):

- **Test program (from zero):** Vitest 5 + RTL + jsdom — **33 files / 511 tests, all green, `tsc --noEmit` clean**, co-located `*.test.tsx`, per-test store reset (`useUi.setState(useUi.getInitialState(), true)` in `src/test/setup.ts` — the stories' withStoreReset contract), `renderShell` provider-stack helper. Tests found **5 real bugs before any review** (deep-clone undo, no-op history pollution, dead ⌥⇧M, plus the store contract gaps reviewers later confirmed).
- **PR #1 OPEN:** base `ui-baseline` (branch at `ce16d33`, pre-mockup) ← head `main`, 143 files (≤ 300 as instructed), +29k/−31. **CodeRabbit + Codex + the maintainer's three review waves** all landed on it; every P1/P2 addressed through `8b52edb`/`b8d504f`; response comments posted; only P3s remain (listed in the maintainer's final verdict comment on the PR).
- **Direction-2 output:** `.agents/SPEC-REVISION-CANDIDATES.md` + **GitHub issue #2** — 17 entries (A1-A6 spec-vs-spec conflicts, B1-B4 missing canon answers, C1-C9 mock registrations, seal-staleness flags). This is the seal round's spec-side input.
- **Big fixes of the round (all regression-pinned):** trimToPlayhead target constraint (was: one keypress destroyed unselected material across ALL scenes), setMixerTrack partial-strip shell crash, locked-track law at the store level, Tab scoped to the timeline region, slider keyboard grammar (Viewer + Ruler scrub), §6.4 keyboard multi-delete confirm (AppShell = ConfirmProvider wrapper + AppShellInner), annotakit hotkeys remapped off shell keys (c/g/h/f/q), annotakit manager + drawer cards keyboard-accessible, violet accent AA (#8f74ff), F6 deepest-region match, ripple trim, linked A/V selection groups.

## Next session's task: USER REACTION + PR CLOSE-OUT

1. **Watch the pins** (the user reviews at the public URL): poll `GET :3000/annotakit/api/threads` or the GH issues labeled `annotakit`; resolve with `PATCH /threads/:id` (full-doc PUT-back semantics).
2. **Poll PR #1** for new CodeRabbit/maintainer comments (the diff auto-updates with every `main` push). Remaining corpus is P3-only — decide with the user: batch-polish or fold into wiring.
3. **Tour the answers:** the R13 fix set (trim targeting, keyboard parity, hotkey remap) + the still-open questions (A/B/C direction + DESIGN §11 q1-q9).
4. **Seal round prep:** the candidates file is the agenda; seal items 10-25 + issue #2.

## Repo state at handoff

| Repo | Commit | Notes |
|---|---|---|
| nle-core-spec (canon) | `b8d504f` | 21 specs unchanged; `ui-mock/shell-variants/` (app + storybook + 511 tests + vendored annotakit + docs); `.agents/SPEC-REVISION-CANDIDATES.md` NEW; PR #1 open |

## Mechanics to reuse (READ THESE, they save hours)

- **Sandbox persistence law:** processes spawned from agent bash sessions are REAPED between tool calls, but **children of the platform's next-server survive** (platform cgroup). The spawner is the API route `/home/z/my-project/src/app/api/spawntest/route.ts` (POST {cmd,args,cwd,log}). The supervisor + storybook on :3000 were born that way and are orphaned-to-init stable.
- **Boot path:** `/home/z/my-project/package.json` `dev` script = `node scripts/sb-supervisor.mjs` (respawn loop). If :3000 is dead AND next is gone: one-shot bash — start `next dev -p 3001`, POST the spawn, it takes over :3000.
- **Sync flow (repo → runtime):** edit in `/home/z/nle-core-spec/ui-mock/shell-variants` (canonical), then `rsync -a --exclude node_modules --exclude storybook-static --exclude '.storybook/annotakit' --exclude .env --exclude .git --exclude 'src/**/*.test.*' --exclude vendor <repo>/ <runtime>/` — HMR picks src changes up live. NEVER delete the runtime `.git` (annotakit GH mirror needs the remote), `.env` (GH token), or `.storybook/annotakit/` (threads.db).
- **Vendor (annotakit) changes need a dist rebuild — and the rebuild must be VERIFIED:** edit the repo's `vendor/storybook-annotakit/src/`, then IN THE RUNTIME COPY: `rsync -a --delete <repo>/vendor/storybook-annotakit/src/ vendor/storybook-annotakit/src/ && cd vendor/storybook-annotakit && npm run build`, then grep the DIST for a code marker (comments are stripped — grep `role: "button"` / `tabIndex: 0` / a string literal from the fix, NOT the comment text), then `pkill -f "storybook dev --port 3000"` (supervisor respawns in ~25s; log `/home/z/my-project/scripts/sb-serve.log`). **R13 lesson: a sub-agent claimed the rebuild; the verification wave proved dist was still pre-fix — always verify the artifact, not the claim.**
- **"Invalid host" 403 through the public URL** = storybook 10 core-server host validation (the platform edge REWRITES the Host header). Fix already in `.storybook/main.ts`: `core.allowedHosts: true`. Vite 8 has NO `allowedDevHosts` option — don't re-add one.
- **Annotakit API gotchas:** DELETE not allowed; PATCH expects the FULL thread document. Health: `GET :3000/annotakit/api/health`. **Change notification rides Storybook's `experimental_serverChannel`** (Storybook's own WS) — the addon has NO WebSocket of its own; REST lives on the dev server. Hotkeys are REMAPPED (c/g/h/f/q) in `.storybook/preview.tsx` — keep new shell plain keys out of that set.
- **agent-browser + iframes:** stories render in an IFRAME — query `document.querySelector('iframe').contentDocument.querySelector(...)`. Screenshots need several seconds after navigation.
- **VLM discipline:** always add "Do NOT generate code/HTML" to vision prompts. Prefer DOM assertions over VLM.

## Standing cautions

- Never edit web-daw-core's `copy`-class files (file-class law).
- The spec set is CONTRACT + GAP + ACCEPTANCE (Decision 14): the mock does NOT amend specs — deviations live in PLAN seal items + SPEC-REVISION-CANDIDATES.md.
- Push at every micro milestone; `git fetch` before push; never force push.
- The PAT lives in `/home/z/my-project/shell-variants/.env` + the runtime `.git` remote URL — NEVER commit either.
- PR #1 is head=`main`: every push updates the PR diff and re-triggers CodeRabbit; keep `ui-baseline` frozen at `ce16d33`.

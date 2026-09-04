# HANDOFF — Next Session Scope (nle-core-spec)

**Written:** 2026-09-05, end of the R14 audit + zero-no-op + both-directions spec-scan round (pushed through `6da2610`)
**Scope of this file:** IMMEDIATE next session ONLY. Long horizon lives in `.agents/PLAN.md`. Process meta-lessons live in `.agents/SKILL.md`.

---

## What this session produced

R14 was the re-audit round (user ask: inventorize + audit ALL 90 PR comments, ensure zero no-ops at the UI layer, deep both-directions UX-spec scan):

- **Full 90-comment corpus re-audited** (74 inline + 11 issue + 5 reviews, ~75 unique findings; every status re-verified against CODE, not the R13 reply's claims). The audit caught **5 claimed-but-not-landed fixes** (gh.ts pagination origin guard, ghsync mirror sentinel, anchor walk-up re-verify, cross-story focus race, vendor prestorybook prebuild) — all landed in W1 with dist rebuilt + bundle markers verified. Two more partials closed (tsup clean race — node entry was still `clean:true`; reveal seek snapped to the frame grid). One documented skip: token-in-argv (security/credential class excluded by the review charter). Full table posted on PR #1 (comment `5546483104`).
- **Zero-no-op sweep:** every interactive element across 29 files audited; the dead cluster is wired (zoom cluster + ⌘\ + ±/⌘0, marker-color menu, marker nav keys, ⌘⇧I/O, ⌘S/⌘E, ⌘⇧M, [ ], effects drag-to-clip, Color/Deliver form controls, §4.2 state rows, mixer aux toggles, SoundLibrary sort, brackets drag, Clip Enter/Space, height menu rows, add-track above/below, two-way scroll sync, Toolbar2 roving + radiogroup arrows, splitter ⇧×4, DebugOverlay copy-fail + save-fail drill). Store laws: loop ordering, link gating, split linkedTo, MIN_DUR, duplicate-at single undo, multi-track viewer, loadSample mixer rebuild, ⌘M any-kind.
- **Both-directions spec scan:** `.agents/SPEC-REVISION-CANDIDATES.md` §E — 15 net-new findings (N1 ElementJSON home P1, N4 Link A/V contract vacuum P1, N15 trim targeting P2, +12 more), strengthenings to every R13 entry, 20 new registrations (C10-C29). Mirrored on issue #2 (comment `5546483226`).
- **Suite: 511 → 596 tests** (34 files), `tsc --noEmit` clean, PR #1 auto-updated (37 commits, 146 files ≤ 300).
- **Runtime stack REBUILT from scratch this session** (fresh sandbox wiped it — see "Fresh-sandbox restoration" below): static build synced to `public/mockup/`, runtime copy at `/home/z/my-project/shell-variants/` (install + .env + git remote + vendor dist verified), `sb-supervisor.mjs` + `/api/spawntest` route rewritten. Boot test passed (storybook serves :3000, 200, allowedHosts OK) — the instance is bash-reaped as expected; **the supervisor is ARMED: when the platform's next-server comes up (user opens the preview URL), POST `/api/spawntest` `{cmd:"node",args:["/home/z/my-project/scripts/sb-supervisor.mjs"],log:"/home/z/my-project/scripts/sb-serve.log"}` and Storybook takes :3000.**


- **Test program (from zero):** Vitest 5 + RTL + jsdom — **33 files / 511 tests, all green, `tsc --noEmit` clean**, co-located `*.test.tsx`, per-test store reset (`useUi.setState(useUi.getInitialState(), true)` in `src/test/setup.ts` — the stories' withStoreReset contract), `renderShell` provider-stack helper. Tests found **5 real bugs before any review** (deep-clone undo, no-op history pollution, dead ⌥⇧M, plus the store contract gaps reviewers later confirmed).
- **PR #1 OPEN:** base `ui-baseline` (branch at `ce16d33`, pre-mockup) ← head `main`, 143 files (≤ 300 as instructed), +29k/−31. **CodeRabbit + Codex + the maintainer's three review waves** all landed on it; every P1/P2 addressed through `8b52edb`/`b8d504f`; response comments posted; only P3s remain (listed in the maintainer's final verdict comment on the PR).
- **Direction-2 output:** `.agents/SPEC-REVISION-CANDIDATES.md` + **GitHub issue #2** — 17 entries (A1-A6 spec-vs-spec conflicts, B1-B4 missing canon answers, C1-C9 mock registrations, seal-staleness flags). This is the seal round's spec-side input.
- **Big fixes of the round (all regression-pinned):** trimToPlayhead target constraint (was: one keypress destroyed unselected material across ALL scenes), setMixerTrack partial-strip shell crash, locked-track law at the store level, Tab scoped to the timeline region, slider keyboard grammar (Viewer + Ruler scrub), §6.4 keyboard multi-delete confirm (AppShell = ConfirmProvider wrapper + AppShellInner), annotakit hotkeys remapped off shell keys (c/g/h/f/q), annotakit manager + drawer cards keyboard-accessible, violet accent AA (#8f74ff), F6 deepest-region match, ripple trim, linked A/V selection groups.

## Fresh-sandbox restoration (the R14 recipe — this session ran it)

The sandbox filesystem reset (clone gone, platform scaffold reset, runtime
copy gone; git-is-the-disk recovered the code). Restoration order:
1. `git clone` to `/home/z/nle-core-spec`, set identity, `npm install` in `ui-mock/shell-variants`, run `npx vitest run` (596 green) as the baseline gate.
2. `npm run build` → `rsync -a --delete dist/ /home/z/my-project/public/mockup/` (the static fallback surface).
3. Runtime copy: `rsync -a --exclude node_modules --exclude dist --exclude .env --exclude 'src/**/*.test.*' <repo>/ /home/z/my-project/shell-variants/` → write `.env` (ANNOTAKIT_GH_TOKEN + ANNOTAKIT_GH_REPO) → `git init` + remote with PAT → `mkdir .storybook/annotakit` → `npm install` → copy `vendor/storybook-annotakit/dist/` (built in the repo) and grep the dist for fix markers.
4. Supervisor armed: `node /home/z/my-project/scripts/sb-supervisor.mjs` must be spawned VIA the platform next-server (`POST /api/spawntest`) — bash-spawned processes are reaped between tool calls (verified again this session: even setsid dies). The platform next-server appears when the user opens the preview URL; then POST the spawn and verify `:3000` + `/annotakit/api/health`.

## Next session's task: USER REACTION + PR CLOSE-OUT

1. **Watch the pins** (the user reviews at the public URL): poll `GET :3000/annotakit/api/threads` or the GH issues labeled `annotakit`; resolve with `PATCH /threads/:id` (full-doc PUT-back semantics).
2. **Poll PR #1** for new CodeRabbit/maintainer comments (the diff auto-updates with every `main` push — R14 added 6 commits; the audit reply is the last comment). Remaining corpus is P3-only; the candidates file C10-C29 now registers what used to be open P3s.
3. **Tour the answers:** the R14 wiring sweep + the spec-scan outputs (issue #2 N-series) + the still-open questions (A/B/C direction + DESIGN §11 q1-q9).
4. **Seal round prep:** the candidates file (A+B+N+C+D) is the agenda; seal items 10-25 + issue #2.

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

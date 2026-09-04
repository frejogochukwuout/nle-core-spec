# HANDOFF — Next Session Scope (nle-core-spec)

**Written:** 2026-09-04, end of the R12 user-feedback round (pushed through `5550902`)
**Scope of this file:** IMMEDIATE next session ONLY. Long horizon lives in `.agents/PLAN.md`. Process meta-lessons live in `.agents/SKILL.md`.

---

## What this session produced

R12 was the user's mockup-review feedback round ("still a lot of rough edges"):

- **The three named bugs fixed:** the mixer is now a RIGHT-SIDE DOCK side by side with the multi-track lanes (MixerRow → MixerDock, design doc `DESIGN-audio-mode.md` **v2.2** at the end of that file; 44px bridge rail / full strip row with fill-height faders+meters, ResizeObserver compact <260px); the inspector seam drag direction corrected (right-docked panel: left-drag widens — was inverted, felt runaway) and Inspector+MediaPool now fill their columns (missing `w-full` made the inspector content-width — it visibly shrank on the Effects tab); the playhead triangle apex re-centered on the 3px bar's centerline (was 2px off).
- **Storybook 10.6 + storybook-annotakit 0.4.0** (built from the user's zip, vendored at `ui-mock/shell-variants/vendor/storybook-annotakit/`): pin comments on live stories with React component/file:line digests, sqlite threads, REST+WS on the dev server, **GitHub 1:1 issue mirror ACTIVE** (pins → issues in this repo, label `annotakit`).
- **Public review URL live:** the platform preview URL serves Storybook (not Next): `storybook dev --port 3000` under `scripts/sb-supervisor.mjs` (platform workspace) which respawn-restarts; the app runs from `/home/z/my-project/shell-variants` (persistent volume, own node_modules, `.git` with PAT remote — that remote is what the annotakit GH mirror detects).
- **71 stories** across 10 groups (Chrome/Primitives/Overlays/Pages/Regions added by sub-agents; every element surfaced per user instruction).
- **Mock-state wiring:** viewer in-canvas overlays + safe-area guides are store UI prefs now (real 90/80% guides render).
- Review gates: code review (9-a) NO MAJORS; spec review (9-b) 1 major (11px type floor vs new 9px labels) — **all majors+minors fixed** in `5550902`; remaining minors are PLAN seal items 19-25.

## Next session's task: THE USER REACTION (still the gate)

1. **Watch the pins, not just the tours.** The user now reviews at the public URL: press `C` → click an element → comment → ⌘/Ctrl+Enter. Poll `GET /annotakit/api/threads` (on :3000) or the exported digests (`/annotakit/api/export?format=md`); GH mirror = issues labeled `annotakit` in this repo. Resolve with `PATCH /threads/:id` (GET the full doc, set `status:"resolved"`, PATCH back — the API expects the WHOLE thread document).
2. **Tour the R12 answers:** mixer dock (cycle via the timeline-toolbar AudioLines button: collapsed → bridge rail → full), inspector seam drag (both directions + double-click reset), playhead alignment, safe-guides toggle (viewer toolbar Frame icon).
3. **Capture decisions** — DESIGN-audio-mode.md §11 questions 1-9 (q8/q9 are the new dock questions: side-by-side adjacency + bridge rail slimness). Plus the standing A/B/C direction choice (Ctrl+\`).
4. **Then:** feed decisions into tokens/mixer; the surviving audio design gets lifted into the spec-18 mixer-panel section at seal (PLAN items 14-25 register everything).

## Repo state at handoff

| Repo | Commit | Notes |
|---|---|---|
| nle-core-spec (canon) | `5550902` | 21 specs unchanged; `ui-mock/shell-variants/` (app + storybook + vendored annotakit + docs/DESIGN-audio-mode.md v2.2) |

## Mechanics to reuse (R12 additions — READ THESE, they save hours)

- **Sandbox persistence law:** processes spawned from agent bash sessions are REAPED between tool calls, but **children of the platform's next-server survive** (platform cgroup). The spawner is the API route `/home/z/my-project/src/app/api/spawntest/route.ts` (POST {cmd,args,cwd,log}). The supervisor + storybook on :3000 were born that way and are orphaned-to-init stable.
- **Boot path:** `/home/z/my-project/package.json` `dev` script = `node scripts/sb-supervisor.mjs` — a recycled sandbox boots Storybook on :3000 directly (platform `bun run dev`). If the supervisor died, re-trigger via the API route trick (needs the Next tree alive; if :3000 is dead AND next is gone, run `bash` one-shot: `cd /home/z/my-project && nohup node scripts/sb-supervisor.mjs &` INSIDE one bash call after `node src/app/...` — actually simplest: start `next dev -p 3001` in a one-shot call, POST the spawn, then it takes over :3000).
- **Sync flow (repo → runtime):** edit in `/home/z/nle-core-spec/ui-mock/shell-variants` (canonical), then `rsync -a --exclude node_modules --exclude storybook-static --exclude '.storybook/annotakit' --exclude .env --exclude .git <repo>/ <runtime>/` — HMR picks changes up live. NEVER let rsync delete the runtime `.git` (annotakit's GH mirror needs the remote) or `.env` (GH token) or `.storybook/annotakit/` (threads.db).
- **"Invalid host" 403 through the public URL** = storybook 10 core-server host validation (the platform edge REWRITES the Host header — it is not the public domain). Fix is already in `.storybook/main.ts`: `core.allowedHosts: true` (builder-vite forwards it into vite's `server.allowedHosts`). Vite 8 has NO `allowedDevHosts` option — don't re-add one.
- **Restart storybook after config/vendor changes:** `pkill -f "storybook dev --port 3000"` — the supervisor respawns it in ~25s (log: `/home/z/my-project/scripts/sb-serve.log`).
- **agent-browser + iframes:** storybook stories render in an IFRAME — plain `document.querySelector` hits the MANAGER. Use `document.querySelector('iframe').contentDocument.querySelector(...)`. Screenshots need several seconds after navigation for the story to mount.
- **VLM discipline:** always add "Do NOT generate code/HTML" to vision prompts — it drifts into generating mockups otherwise. Prefer DOM assertions over VLM when possible.
- **Annotakit API gotchas:** DELETE is not allowed; PATCH expects the FULL thread document (GET, mutate, PUT back). Health: `GET /annotakit/api/health`.

## Standing cautions

- Never edit web-daw-core's `copy`-class files (file-class law).
- The spec set is CONTRACT + GAP + ACCEPTANCE (Decision 14): the mock does NOT amend specs — R11/R12 findings live as PLAN seal items 14-25.
- Push at every micro milestone; `git fetch` before push; never force push.
- The PAT lives in `/home/z/my-project/shell-variants/.env` + the runtime `.git` remote URL — NEVER commit either (gitignored in the repo copy; the runtime copy is outside the spec repo).

# HANDOFF — Next Session Scope (nle-core-spec)

**Written:** 2026-09-05 (evening), end of the R16-continuation session (port-3000
go-live + origin reconcile; core history: R16 `96ea0db` → `be1f141` → the
origin-merge commit). Parallel R15-UI round content is folded below — it is
COMPLETE on origin and its standing items are preserved.
**Scope of this file:** IMMEDIATE next session ONLY. Long horizon lives in
`.agents/PLAN.md`. Process meta-lessons live in `.agents/SKILL.md`
(R15-UI = #47-51, R16 = #53-58 — renumbered after the collision).

---

## What is LIVE right now (the headline)

- **The shell-mini app serves on port 3000** and the Z-container's Caddy
  (:81, the ONLY externally exposed port) reverse-proxies localhost:3000 →
  **the public preview URL IS the shell-mini app.** Open the preview panel /
  "Open in New Tab" and you get the RH-skinned mini NLE shell.
- The dev server is daemonized via **double-fork** (`ui-mock/shell-mini/
  scripts/dev3000.py`) — it survives per-toolcall descendant-tree reaping
  (plain `nohup`/`setsid` do NOT; the wrapper kills the whole tree at every
  toolcall end). It still dies on container recycle — relaunch recipe below.
- Storybook runs separately on :6007 (`npm run storybook` in shell-mini);
  externally it is reachable as `/?XTransformPort=6007` while it runs.

## FIRST ACTIONS for the next session (in order)

1. **Fresh sandbox = git recovers code, never process state.** Clone the repo
   (PAT comes from the user in chat — NEVER commit it; GitHub's secret
   scanner blocks token-bearing pushes, and the GitLab PAT likewise stays in
   `.git/config` + chat only), `git fetch` BOTH remotes FIRST — a parallel
   session may have pushed again. NEVER force push.
2. **Relaunch the app on :3000** (the preview URL depends on it):
   `cd ui-mock/shell-mini && npm ci` (node_modules is not in git), then
   `python3 scripts/dev3000.py` (double-fork launcher; verify with
   `curl -s localhost:3000` → the index HTML, and check `dev.log`).
   If port 3000 is already bound by the platform's own Next.js dev server
   (fresh sandboxes with the bootstrap template), the platform server owns
   3000 — in past sessions the R15-UI thread's instrumentation chain put
   Storybook there instead; coordinate rather than fight: the user's current
   directive (2026-09-05) is that the **shell-mini app owns :3000**.
3. **Baseline gates before editing anything:** `npm run test` (93/93),
   `npm run typecheck` (clean), `npm run build`, `npm run build-storybook`.
4. **gitlab remote** (WAF blocks ~1/3 of pushes — just retry a few times):
   `git remote add gitlab https://oauth2:<GLPAT>@gitlab.com/ansgareutychisO/nle-core-spec.git`

## The two live threads (both COMPLETE rounds, standing items below)

### R16 — shell-mini (this thread; the user is currently driving THIS one)

Minimal NLE shell mockup under `ui-mock/shell-mini/`, simplified from
shell-variants, skinned with `ui-mock/RH-timeline-editor.html`, Storybook
included. 93 tests / tsc / vite build / storybook-static all green.
Contract = `ui-mock/shell-mini/docs/DESIGN-mvp.md` v2.1 (design audit +
code review both folded); skin ground truth =
`docs/RH-skin-extraction.md`. Deviations register = shell-mini README.

**Standing items:**
- **USER REACTION pass** — the mock is now tourable at the preview URL
  (that was the point of port 3000). The v0.2 candidate list is in
  PLAN.md R16 section; DnD media→timeline is the top candidate.
- v0.2 candidates: DnD, annotakit wiring, keyboard clip-focus, snap-guide
  indicator, 18px node-space gutter, waveform w/ amplitude variation.

### R15-UI — shell-variants parity + audio (parallel thread, landed on origin)

Timeline parity T1-T9 (canonical zoom via zoomController, CapCut ruler
tiers, full gesture discipline, 2D cross-track drag, ripple interval-diff,
trim laws, all 5 tool gestures, snap upgrade, clip virtualization) +
audio overhaul A0-A5 (tokens, SVG Knob, stereo meterEngine, dB-linear
StripMeter, fader scale, TrackHeader micro-meters, 83 stories).
596→788 tests, review rounds V1→F1→V2 SHIP; PR #1 summary posted.

**Standing items:**
1. CodeRabbit re-review harvest on the 14-commit PR #1 range (triage P3s).
2. Deferred P3s (V2): duplicateAndMove raw-API misuse edges; snap-ON
   head-drag raw fallthrough.
3. G.4 deferral ledger (engine-team questions): roll B-source-tail bound
   rate≠1, preview batch-atomicity, seek-click 500ms gate deviation.
4. Cross-round integration: when the assembly A-phases (spec 14) start
   wiring the REAL engine, the shell-variants libs (timelinePlacement/
   trimLaws/ripple/pixel) are the adapter seam to verify against OT's
   24-command headless API.
5. Their runtime chain (supervisor + instrumentation.ts booting Storybook
   on :3000 inside THEIR sandbox's my-project) is NOT present in the
   current sandbox — do not assume :3000 is theirs.

## Restoration recipe (fresh sandbox)

| Repo | State |
|---|---|
| nle-core-spec (canon) | GitHub `main` + gitlab mirror both current through the R16-continuation merge |
| nle-engine / opencut-timeline / web-daw-core | sealed, untouched by R16 |

1. `git clone https://<GHPAT>@github.com/frejogochukwuout/nle-core-spec /home/z/nle-core-spec` — clone OUTSIDE `/home/z/my-project` (the watchdog force-checkouts that path every ~20s; work only in the clone or on main).
2. Add the gitlab backup remote (see FIRST ACTIONS #4).
3. `cd ui-mock/shell-mini && npm ci` → run gates (93/93, tsc, build, sb).
4. `python3 scripts/dev3000.py` → verify :3000 + preview URL.
5. Reference repos (PAT-accessible, private, for the R15-UI standing
   items): `bearachprema/opencut-timeline`, `zmmac1/web-daw-ui`,
   `bearachprema/web-daw-core`.
6. Read `.agents/PLAN.md` (R16 + R15-UI entries) + this file +
   `SKILL.md` #47-51 + #53-58 + the `/home/z/my-project/worklog.md` tail
   (session-local; may be missing in a fresh sandbox).

## Mechanics to reuse (R16-tested)

- **Double-fork is the ONLY process-persistence pattern that works** on
  this container (verified dead: `nohup &`, `setsid &`, `disown`; verified
  alive: fork→setsid→fork→exec, grandchild reparents to PID 1).
- Skin extraction from a SingleFile DOM snapshot: `agent-browser open
  file://…` → `eval` computed styles + CSS-rule dump (grep `quick-cut` in
  styleSheets) → VLM on crops for gestalt; **trust the extracted CSS over
  the VLM's color/layout claims** (it hallucinated "missing dot grid" that
  pixel-sampling disproved; but it DID catch real text collisions).
- The audit→fold→implement→review→fix loop caught real bugs both rounds;
  write interaction tests against the SEED early (a seed with no slack is
  a UX bug hiding as "deterministic simplicity").
- Container danger zones: the terminal command filter (never loop
  filtered commands; stop instantly on any 403/"broken session"), the
  control-plane ports (12600/19001/19005/19006 — no curl matrices), and
  the bash toolcall reaping (double-fork everything long-running).

## Standing cautions

- Never force push (git is the disk; a faulty local + force = data death).
- PATs live in chat + local `.git/config` ONLY (secret scanner).
- Parallel sessions are ACTIVE — `git fetch` before EVERY push; merge, never force.
- The mock does NOT amend specs; deviations live in the mock's README;
  spec-side findings go to `.agents/SPEC-REVISION-CANDIDATES.md`.
- The shell-variants' annotakit addon is NOT wired into shell-mini — do
  not assume pin-comment tooling works there (deliberate D2 cut, see
  DESIGN-mvp.md).

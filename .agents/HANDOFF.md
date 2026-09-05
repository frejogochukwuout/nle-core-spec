# HANDOFF — Next Session Scope (nle-core-spec)

**Written:** 2026-09-05 (late), end of the R18 session (user-corrected serving
layout: the full Storybook dev server owns :3000; R16 workaround stack
reverted; core history: R16 `96ea0db` → `be1f141` → the origin-merge commit →
R17 parallel-stream merge `3fb3360`). Parallel R15-UI round content is folded
below — it is COMPLETE on origin and its standing items are preserved.
**Scope of this file:** IMMEDIATE next session ONLY. Long horizon lives in
`.agents/PLAN.md`. Process meta-lessons live in `.agents/SKILL.md`
(R15-UI = #47-51, R16 = #53-58 — renumbered after the collision).

> **Per-env :3000 ownership (user directive, R17):** there are TWO parallel
> streams with SEPARATE sandboxes. The shell-mini stream's env serves
> shell-mini (as described below — that's THEIR env). The shell-variants
> stream's env (chat `4deec8a5`) serves **shell-variants' own Storybook 10.6
> dev on :3000** via `ui-mock/shell-variants/scripts/sb3000.py` (double-fork
> daemon, PPID=1) from the persistent runtime copy at
> `/home/z/my-project/shell-variants` — same Host law
> (`core.allowedHosts: true`), same restorer pattern
> (`scripts/boot-restore.sh`, iso `/home/z/my-project/.zscripts/dev.sh`),
> plus an `annotakit-store` git branch on origin for threads.db git-push
> durability. "Serve YOURS in this env" — do not cross-stream-serve.

---

## What is LIVE right now (the headline — R18 layout)

- **The public preview URL IS the full Storybook dev server (R18, user
  directive):** `https://preview-chat-<chat_id>.space-z.ai/` (the hostname
  embeds THIS chat's id from the gateway metadata) → edge → Caddy :81 →
  localhost:3000 → **`storybook dev -p 3000`** (`scripts/sb3000.py`,
  double-fork daemon, PPID=1, `core.allowedHosts: true`). Same-origin means
  everything works through the real edge: manager UI, story tree, story
  selection, iframe canvases, `/index.json` (30 stories), HMR,
  deep links (`/?path=/story/…`). Verified end-to-end post-switch (browser
  pass: story DOM renders, zero page errors) + a live kill→restore→
  public-200 cycle.
- **The app is the localhost dev surface on :3001** (`scripts/dev3000.py`;
  `vite.config.ts` port 3001) — for the agent dev loop only, NOT public.
- **R18 correction (what was REVERTED):** the R16 "storybook can't serve
  publicly, static-mount it instead" verdict was wrong; the workaround
  infrastructure was removed — `public/stories/` (8.4MB), the
  `previewRedirect` query-shim (+8 tests, 101→93), `scripts/sb6007.py`.
  SKILL.md Law 3 is now the corrected law; #61 and #64 record the lesson.
  Don't rebuild any of it.
- **The Host-header law still applies to any Vite surface** (the R16
  go-live bug): the FC edge rewrites the request Host to `...fcapp.run`;
  Caddy passes Host through untouched; Vite's default `server.allowedHosts`
  (localhost/IP only) 403s it. Fix = `allowedHosts: ['.space-z.ai',
  '.fcapp.run']` in vite.config.ts (committed, kept). Verification rule: a
  localhost curl is a FALSE PASS for public liveness — probe with
  `curl -H 'Host: preview-chat-<id>.fcapp.run' http://127.0.0.1:81/` or
  agent-browser on the real public URL. (SB 10.6 allows all hosts by
  default — the banner says so — but `core.allowedHosts: true` is committed
  as belt-and-braces.)
- **Persistence layers (all needed, all verified):**
  1. *Reaper escape:* both daemons double-forked (fork→setsid→fork→exec;
      grandchild reparents to PID 1; survives per-toolcall tree-kill;
      `nohup`/`setsid` alone die).
  2. *Recycle resurrection:* `/home/z/my-project/.zscripts/dev.sh`
     (harness boot hook, PAT-free — restores repo from the newest
     `/home/sync/nle-core-spec-*.bundle`, npm ci if needed, re-launches;
     idempotent; frees :3000 from half-dead tenants — inspecting their cwd
     first; MUST-SUCCEED on the storybook `/index.json` probe, best-effort
     app on :3001; canonical copy committed at
     `ui-mock/shell-mini/scripts/boot-restore.sh`). Tested live: kill →
     boot-restore → storybook restored → public 200. NOTE: dev.sh only
     auto-runs if the harness executes .zscripts/dev.sh at boot — otherwise
     the next agent session runs it as FIRST ACTION.
  3. *Durable state:* GitHub origin + gitlab mirror + /home/sync bundle+
     tarball refreshed at every wrap-up.

## FIRST ACTIONS for the next session (in order)

1. **Fresh sandbox = git recovers code, never process state.** Clone the repo
   (PAT comes from the user in chat — NEVER commit it; GitHub's secret
   scanner blocks token-bearing pushes, and the GitLab PAT likewise stays in
   `.git/config` + chat only), `git fetch` BOTH remotes FIRST — a parallel
   session may have pushed again. NEVER force push.
2. **Ensure the STORYBOOK is LIVE on :3000** (the preview URL depends on it):
   run `bash /home/z/my-project/.zscripts/dev.sh` (idempotent — installs,
   launches, frees the port if needed; PAT-free via the /home/sync bundle;
   gates on the /index.json asset-chain probe). If the sandbox is FRESH (no
   /home/z/my-project/.zscripts — harness didn't restore repo.tar): clone
   with the PAT from chat, `npm ci`, then `python3 scripts/sb3000.py` (and
   `python3 scripts/dev3000.py` for the localhost app on :3001). Verify
   PUBLIC liveness with the forged-Host probe (see the Host-header law
   above), not just localhost. If port 3000 is already bound by the
   platform's own Next.js dev server (fresh sandboxes with the bootstrap
   template) or a stale tenant, dev.sh inspects its cwd then frees it — the
   user directive (R18) is that the **shell-mini Storybook dev server owns
   :3000**.
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
- **USER REACTION pass** — the review surface is the full Storybook at the
  preview URL root (R18). The v0.2 candidate list is in
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

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
> plus the orphan `annotakit` branch on origin for threads.db git-push
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
- **Pin-comment review surface LIVE (R18b):** storybook-annotakit v0.5 is
  vendored at `vendor/storybook-annotakit/` (dist tracked — boots without
  building), FIRST in `.storybook/main.ts` addons. At the public URL the
  toolbar carries Pin (⌥C) / Region (⌥R) / Threads (⌥D) / Hide (⌥L), and
  reviewer pins are same-origin REST through the edge — verified live
  (thread created via the public URL's own API, visible in the manager UI,
  drawer badge, delete → tombstone → orphan-branch push → GH issue closed).
  Store: `.git/annotakit/threads.db` (branch-switch-proof) → orphan
  `annotakit` branch on GitHub — **SHARED with the sibling stream's env**
  (their `db=annotakit@shell-variants` commits appear in the branch log;
  the kit's logical merge reconciles both) — plus a 1:1 GitHub-issue mirror.
  Agent surface: `GET /annotakit/api/health` → agentSurfaces (rest +
  digests + github); `GET /annotakit/api/threads`, `/export?format=md`,
  POST/DELETE threads, POST `/sync`. Token: `.env` in shell-mini
  (gitignored — **recreate after a recycle**: PAT from chat +
  `ANNOTAKIT_GH_REPO=melodietexoss/shell-mini-review` +
  `ANNOTAKIT_GH_LABEL=mini` + `ANNOTAKIT_GH_SCOPE=4c1120aa|src/(timeline|shell)/`
  — see the R18h bullet).
- **Upstream contribution filed (R18c):** the vendored `refHasOurReadme`
  patch is reported upstream — melodietexoss/storybook-annotakit **issue
  #16** (full cwd-relative-ls-tree diagnosis + repro + improvement
  candidates: machine-readable git-sync health, POST /sync forcing a git
  cycle, absent-vs-foreign A14 log split, README adoption marker) and
  **PR #17** (`fix/subdir-ref-has-readme-cwd` — same colon-path fix,
  rebuilt tracked dist, new `subdir` regression case in their
  store-robustness suite: unpatched 4/8 FAIL / patched 8/8, full suite
  9/9). NOT pushed to upstream main (user directive: PR-only so the
  author can verify + generalize). When PR #17 merges, drop the local
  vendor patch in favor of upstream v0.5.x.
- **R18e/R18f — the feedback wave (annotakit issues #7-#16, ALL fixed +
  thread-resolved):** ripple edit (toggle, delete/end-trim/start-trim
  follower-shift laws, snapshot-idempotent previews, delta-quantize +
  floor overlap guard); RH cut styles `[`/`]` (裁剪开始/裁剪结束, ripple-aware);
  pool→timeline DnD (drop outline #38bdf8 + insertionAt placement: exact
  spot → next gap → tail); filmstrip↔color-block toggle; audio-lane eye
  (hidden = collapsed restore bar, itself a drop target); REAL waveform
  envelopes (deterministic FNV hash, discrete bars, inline+CSS sized —
  the invisible-SVG replaced-element trap is documented + regression-
  tested); snap OFF by default; playhead Enter no-op; splitters (pool/
  inspector width + timeline height with flex-tall lanes); visual polish
  (panel elevation + borders, vignette bg — dots removed, viewer screen-
  well, lane contrast, group dividers, uppercase heads, desaturated
  filmstrips, 8 pool assets). useKeys moved INTO Timeline (solo stories
  get the shortcuts). 158/158 tests, tsc clean. Two sub-agent review
  waves + VLM passes; wave-2 verdict: only P3s remain (ripple start-trim
  frozen-left drag feel — documented law + tooltip hints; split/cut grid
  quantize; 8px main-row gutter; timeline→shell DnD import coupling).
- **R18c UPDATE — PR #17 MERGED upstream (v0.5.1, then v0.5.2):** the
  maintainer validated + merged our subdir fix and a follow-up
  adoption-hardening PR (#19, the 7 sibling fixes) — upstream HEAD is
  v0.5.2. The vendored kit here is still v0.5.0 + our patch; upgrading
  the vendor to v0.5.2 = drop the local patch (registered as a follow-up
  chore; do it in a quiet window, not mid-feedback-wave).
- **R18g — feedback wave 2 (annotakit issues #17-#25 on OUR stories,
  ALL fixed + thread-resolved, GH issues auto-closed):** pool cards
  natural height + true overflow/scroll (the flex overflow:hidden
  min-height trap — cards were squashed to 57px vertical-fit); radii
  tightened per reviewer (panels 20→8, controls 8→4, clips 2px near-
  square, video frame SQUARE, Export 6px — documented token deviation,
  originals in comments); splitter hover = shaded sky accent bar
  (rgba(56,189,248,.78), RH's own handles light blue) + INSPECTOR DRAG
  DIRECTION BUG fixed (invert prop — boundary semantics: drag right
  shrinks the right-side panel; keyboard follows; regression-tested +
  live-verified); purpose-drawn trim icons replace the lucide arrow-to-
  line pair (clip rect + dim discarded block + playhead line — VLM
  verified they read as trim-head/tail); TRANSPORT MOVED below the video
  (RH grammar grid [1fr auto 1fr]: tc left · play center · name right) —
  topbar is brand+Export only now; pool kind badges are ICONS (Film/
  Image/AudioLines — ported from the reviewer's sibling-app feedback
  #28/#30, "the standard NLE way"). 163/163 tests, tsc clean, build
  green. NOTE: the reviewer is ALSO live-reviewing the SIBLING's
  shell-variants app (threads land in the SHARED store → GH issues
  #26-#36 in our repo) — those are the sibling agent's queue, not ours;
  our timeline scroll-end was checked and does NOT have their #36
  crop-off bug (we keep a min 8s runway + full-width lane surfaces).
- **R18h — WORKSTREAM SEPARATION (user request) + feedback wave 3:**
  the mini's GH feedback now lives in its OWN repo,
  **melodietexoss/shell-mini-review** (private, PAT-owner — the old
  frejogochukwuout/nle-core-spec stream stays as history; the PAT is
  read-only there: label/close/push all 403, which is WHY the repo moved).
  Kit feature added to the vendor (env.ts/routes.ts/ghsync.ts, dist
  rebuilt): **`ghLabel`/`ANNOTAKIT_GH_LABEL`** — issues filed as
  `['annotakit','mini']`, pull universe lists by the workstream label;
  **`ghScope`/`ANNOTAKIT_GH_SCOPE`** — regex over the thread origin key
  (storyId + component source file + story URL); only matching threads
  are created/pulled/counted-stalled by this engine (mapped threads are
  still pushed — a mapping is a commitment). Boot migration ran clean:
  19 historical mini threads 404-healed + re-mirrored closed into the
  new repo (mutex-serialized — heal-all completes before any re-creation,
  no issue-number collisions), 4 open feedback threads → issues #1-#4,
  sibling's 27 threads scoped OUT (old repo untouched — verified).
  Feedback wave 3 (4 threads, ALL fixed + thread-resolved, issues
  auto-closed with evidence): trim HANDLES removed — the clip edge IS
  the trim control (14px zones, dark-scrim shaded edge: quiet when
  selected, strong on hover/focus/drag, invisible when unselected+
  unhovered; buttons kept for pointer+←/→ keyboard trim, tabIndex
  gated by selection; documented RH deviation — the reference draws
  2×10px accent bars); SplitIcon replaces lucide Scissors (same
  clip-rect grammar as the trim glyphs, playhead cuts the MIDDLE, both
  halves solid — VLM-verified). 167/167 tests, tsc clean, build green.
  **SIBLING ADOPTION NOTE:** their engine should set their own
  `ANNOTAKIT_GH_LABEL=variants`-style workstream + scope
  (`4deec8a5|src/components/`) pointing at whatever repo they own
  credentials for, then backfill labels once — the kit README's
  "Workstream separation" section has the recipe.
  **PUSH BLOCKER (open):** the PAT cannot push the nle-core-spec main
  branch (read-only) — commits land locally + /home/sync bundle/tarball;
  origin push needs the frejogochukwuout credential (flag to the user).
- **R18i/R18j — feedback waves 4 + 5 (13 threads, ALL fixed + resolved
  through the kit's loop; mirror issues #24–#36 auto-closed with
  evidence):** wave 4 (#24–#28): pool type TABS (All/Video/Image/Audio
  segmented control, view-only state); trim affordance revised — the
  dark scrim REMOVED (it fought the filmstrip), now a 2px accent line
  AT the edge, hover/press/focus only; clip radius re-tuned 2→6px (the
  reviewer's middle ground, --mini-radius-clip); RULER BUG root-caused
  (labels stopped at contentEnd = 57% bare surface + setPlayhead clamped
  at contentEnd so dragging past the last label pinned the playhead) —
  now full-visible-surface labels (ResizeObserver), playhead scrubs to
  the ruler end, and edge-parked drags AUTO-SCROLL (gesture re-applies
  each frame; live-verified scrollLeft 0→972); snap = MAGNET ONLY (deep
  research: Premiere/Resolve/FCP/Avid snap to edit points + playhead,
  never a beat grid — the 0.5s quantize left the snap path; snap-off is
  fully smooth; live-verified raw 8.04 → exact 8.0 with the guide).
  Wave 5 (#29–#36, the "i have more feedbacks" round): pool + inspector
  COLLAPSE to 30px vertical-label rails (MEDIA / INSPECTOR at 90°,
  mode-aware — a rail click under viewer max EXITS max); VIDEO CARDS
  hover-autoplay (synthetic-media equivalent: animated gradient thumb +
  live ticking timecode chip, wraps at source length; images/audio never
  autoplay; prefers-reduced-motion respected); the transport's right
  slot is now the ASPECT CONTROLLER (16:9/4:3/1:1/9:16/2.39:1 dropdown;
  stage letterboxes via container-query sizing — live-measured 428×241
  = exactly 16:9, 576×241 = exactly 2.39:1); the TOPBAR slimmed 56→36px
  and is a documented DOWNSTREAM CUSTOMIZATION POINT (Topbar.tsx block
  comment + README section + this entry — embedded-use exit/parent
  handshake + export handshake live in the host, not the mini); IMAGES
  carry no duration (no pool chip, no inspector "Source length" — a
  still has none; a placement's extent is an edit decision); the
  TIMELINE MINIMIZES (thread #13, first design pass ready for review):
  one ~59px strip — toolbar hidden, slim every-other-label ruler, V/A
  pill sub-rows (hue tints, no filmstrip bodies) running the SAME
  ClipItem gesture engine so seek/drag/trim/arrange/pool-drops stay
  live (live-verified: ruler scrub to 00:04.2, real-mouse pill drag
  +48px = +1s); the VIEWER MAX button (thread #19) composes all three
  collapse modes and toggle-back restores the exact individual layout
  (flags survive the round-trip — OR-composition, never overwrite).
  Tests 167→204 (+37), tsc clean, build green; VLM rounds on default
  (6/6) and maximized (5/5) frames. The one remaining open thread on
  timeline--default (transition-block styling) pins the SIBLING's
  component tree + their preview URL — their queue, correctly scoped
  out of our mirror.
- **R18k — feedback wave 6 (threads #20–#23 + timeline #2/#3/#4, mirror
  issues #37–#43, ALL fixed + resolved) + the user's storybook
  restructure:** the deep-design item was the TRACK-BINDING model
  (threads #21/#23/#3): the mini is a window onto the project —
  trackMode 'paired'|'video' + boundVideoTrack/boundAudioTrack +
  trackBindingLocked (host-injected: selectors invisible, rebinds
  refused, mode switch gated). The VIDEO-ONLY special mode: pool has no
  tabs (video-only list, plain Media head), ONE lane, no A1 anywhere,
  audio/still inserts refused with honest toasts; ruler extent /
  playback wrap / viewer lookup all follow boundClips. Lane heads moved
  to a FIXED track-head column — the NLE-standard sticky rail at the
  scrollport's left edge (clips scroll UNDER it; RENDER_ORIGIN moved
  10→46 = stage margin 2 + rail 44, the whole ruler/playhead/lane/
  drop/gesture law moved as ONE through the shared constant; the
  minimized strip keeps its own 10px origin via a per-context
  originPx prop). Heads are either track-SELECTOR dropdowns (multi-
  track projects — multiTrackDoc() V1/V2/A1/A2 ships for demo+tests,
  live rebind swaps lane content and clears only selections that left
  the visible world) or invisible (locked / single-pair). The minimized
  strip is now the VIDEO navigation surface (thread #21): A1 sub-row
  gone by design, strip 49px, pills 18px. Quick fixes: Export CTA
  26px for the slim bar (was flush 34px), active chips 15%+white+ring
  (toolbar + pool tabs — deviation from RH's 6.5% registered), minimize
  button LEADS the tools row, collapsed-mode gutter token 6px (measured
  6/6/6 around the viewer in max mode). STORYBOOK RESTRUCTURE (the
  user's ask): 34 stories → 13 in 4 micro→macro groups (Primitives →
  Timeline/Clip|Toolbar|Panel → Panels → Shell) via storySort; state
  variations are CONTROLS re-applied through StoreArgs (JSON round-trip
  patch, useLayoutEffect keyed on the serialized patch — controls win
  over ephemeral in-story interaction); shell--default kept its story
  id. Code-review subagent round found + fixed: P1 (first draft's
  select sat on the t=0 clip's trim zone — the head column IS the fix;
  hit-tested), P2 stale-binding silent empty world (Timeline heals the
  binding on doc swap + refusal toast parity), P2 selection law unified
  (survives iff the clip stays visible), P2 useKeys now skips SELECT
  (also fixed the R18j aspect-select Space hijack), P3s (min-strip
  negative margin scoped to .mini-root, Clip-story demo clip lives in
  the store doc so gestures are real). Tests 204→233 (+29), tsc clean,
  build green; live-verified (origin law: mark t=0 == clip t=0 == rail
  end; sticky pinned at scrollLeft 500; gaps 6/6/6; drag clamp exact)
  + VLM rounds (head rail 9/10, glyphs+clip 9/10, CTA fit, video-only
  mode). A NEW thread landed mid-wrap on the restructured panel story
  (mirror #44: standing filmstrip edge shade) — fixed in the same pass:
  the permanent RH edge fade is gone; the shade returns ONLY in trim
  mode (zone hover via :has() + active gesture via is-trimming-*,
  live-verified both halves + VLM-clean crop; +2 tests → 235/235).
- **R19 — feedback wave 7 (mirror #45–#53, ALL 9 fixed + resolved) + the
  user's four-track directive (OT seams / UI-spec MVP designation / the
  drag deep pass / scrubbing):** the ONE-LANE STREET IS GONE — clips drag
  freely from the pre-drag snapshot; a conflicting drop INSERTS (Premiere
  insert-edit geometry: `insertPlacement` with the ALWAYS-floor, tail
  spacing preserved, no split-at-insert, cross-track law pinned); the
  pushed tail tints `is-pushed` live; commits land at the UP position;
  both clip edges magnet (nearest, ties→left) over a FROZEN gesture-start
  magnet field; the programmatic `moveClip` is the OT timeline.move wire
  law (overlap ⇒ refuse + toast; nudge routes it). SCRUBBING: the viewer
  transport's second row = full-width scrub bar (center measured 0px
  under the play button; drag/click; role=slider ←/→/Home/End) + ⏮ and
  |◀ seek buttons (edit-point walk-back) + Home in useKeys. Trim GHOSTS
  (outward-only, ripple-start suppressed). Track selection: empty-lane +
  head-badge → the inspector's track card (mutual exclusion, heals with
  the binding setters). Track heads: V1/A1 markers on single-pair
  unlocked, hidden when locked, 6px 0 0 6px corners. Rails = whole-
  surface buttons. Zoom = 9 steps [24…384], every hardcode derives from
  the ladder length. **docs/OT-SEAMS.md** = the 14-row mini↔OT op map +
  drop-law matrix + mockup→library swap path (README deviations #22–#27).
  **18-ui-shell.md v1.3 §16** designates shell-mini the FIRST SHIPPABLE
  MVP (embedding contract; canon rules: spec wins, deviations registered).
  302/302 tests, tsc clean, both builds green; live-verified (insert drag
  with tail push + audio untouched, ghost render/clear, scrub 25→60%,
  seek walk-back 7.0→5.5→1.7→0, rails, slot stability) + VLM rounds.
  Committed `952a415` (merge-first with the sibling's R20 W0/W1 — their
  queue is shell-variants, untouched); origin + gitlab pushed;
  /home/sync r19 bundle + tarball. NOTE: the sibling stream is ACTIVE in
  this repo (R20 in flight on shell-variants) — fetch+merge before every
  push, their SKILL items mint fast (#69–#71 are THEIRS; mine are #72–#75).
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
   `python3 scripts/dev3000.py` for the localhost app on :3001). ALSO
   recreate `ui-mock/shell-mini/.env` (gitignored — dies with the clone):
   `ANNOTAKIT_GH_TOKEN=<PAT>` + `ANNOTAKIT_GH_REPO=frejogochukwuout/nle-core-spec`
   — without it the review surface degrades to local mode (REST works, no
   GitHub mirror / orphan-branch durability). Verify PUBLIC liveness with
   the forged-Host probe (see the Host-header law above), not just
   localhost. If port 3000 is already bound by the platform's own Next.js
   dev server (fresh sandboxes with the bootstrap template) or a stale
   tenant, dev.sh inspects its cwd then frees it — the user directive (R18)
   is that the **shell-mini Storybook dev server owns :3000**.
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

## R19 (2026-09-06, shell-variants env) — feedback wave 3 + reference integration

- **State**: HEAD lands R19 on `ui-mock/shell-variants/` (26/26 annotakit
  threads fixed + resolved; the nine user-uploaded reference HTMLs integrated).
  tsc clean, **944/944** tests, build green, **102 stories** (was 83).
- **Live surface**: this env's public preview URL serves Storybook dev +
  annotakit v0.5.0 on the NEW build (booted post-R19; kill→restore→public-200
  cycle re-verified). Runtime copy re-synced from the repo; the live store
  (`.git/annotakit/threads.db`) preserved — 46 threads.
- **New seams for the next round**: insertMediaAt (7 Resolve edit ops, real
  placement laws), marker v2 + captions model ops, source-preview mode,
  LeftDock, color 3-region composition, inspector active-track fallback.
  Gap ledger: `.agents/SPEC-REVISION-CANDIDATES.md` §H (C33-C44).
- **Watch-outs minted this round**: (1) mint gap ids ONLY after reading the
  candidates ledger — R19's design doc minted C29-C40 blind and collided with
  R15's F.2 entries (66 comment citations swept by R19-REV); (2) Storybook
  canvas height in agent-browser sessions defaults to ~478px with the addons
  panel open — append `&nav=false&panel=false` to story URLs when measuring
  layout, or every "not filling vertically" reading is a lie; (3) the eval-in
  manager-vs-iframe trap — story DOM probes must go through
  `document.getElementById('storybook-preview-iframe').contentDocument`.

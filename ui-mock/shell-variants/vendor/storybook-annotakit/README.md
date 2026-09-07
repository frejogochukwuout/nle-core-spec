# storybook-annotakit

**Pin comments on live Storybook stories — with React component awareness, zero setup, two agent surfaces (GitHub mirror + local REST), a production-grade sync engine, and a branch-switch-proof durable store.**

`npm run storybook` is the entire review stack. This addon mounts a comment API **on the Storybook dev server itself** (via the official `experimental_devServer` preset hook), persists threads in an **embedded SQLite store** (`node:sqlite`, JSON-file fallback), and enriches every pin with **React component metadata** — component name, props, and the exact `file:line` where the DOM element was created — parsed from live React 19 fibers.

> Evolution of [AnnotaKit](https://github.com/melodietexoss/annotakit) (private): the standalone-kit direction needed a dashboard, an app host, a proxy, and a db — to see one comment. This is the other direction: **Storybook is the dashboard, the server, and the store.**

```
┌─────────────────────────── storybook dev :6006 ────────────────────────────┐
│  manager (React app)          preview iframe (your stories)                │
│  ┌────────────────────┐      ┌───────────────────────────────────┐         │
│  │ NATIVE TOOLBAR:    │      │  global decorator on every story:  │         │
│  │ 📌pin ▢region 💬   │◄────►│  ⌥C → click element → composer      │         │
│  │ + Annotakit panel: │ post │  ⌥R → drag region                   │         │
│  │ GitHub mirror +    │ msg  │  pins re-anchor on HMR/DOM change  │         │
│  │ export · mirror +  │ + WS │  fiber walk → component + jsx site  │         │
│  │ sync status        │      │  DOM snapshot (plan-b evidence)     │         │
│  └────────────────────┘      │  per-thread “⤴ #N” issue chips     │         │
│           │                    └───────────────────────────────────┘         │
│           ▼ same-origin fetch                                               │
│  /annotakit/api/*  (experimental_devServer middleware)                      │
│  └── SQLite: <git-common-dir>/annotakit/threads.db  (node:sqlite)          │
└─────────────────────────────────────────────────────────────────────────────┘
           │ orphan branch (refs/heads/annotakit: README + threads.db,
           │ zero commits on code branches, pushed to the remote)
           ▼ agent consumption (GET /health → agentSurfaces)
  Path A — GitHub mirror: each thread = ONE issue labeled `annotakit`
  → agent comments fix evidence + closes it → thread resolves in Storybook
  Path B — local REST (always available): /threads + /schema + /export?format=md|json
  → reply + PATCH resolve on the dev server itself
  POST /annotakit/api/sync   (idempotent reconcile, both directions)
```

## Install

```bash
# from a local checkout / tarball (the package is private — not on the registry):
bun add -D file:/path/to/storybook-annotakit       # works if dist/ is built
# or registry-style: `bun pm pack` in the addon repo, then:
bun add -D /path/to/storybook-annotakit-<version>.tgz
```

```ts
// .storybook/main.ts
export default { addons: ['storybook-annotakit'] };
```

That's the entire setup — **local mode works with zero configuration**: pinning, threads, digests, resolve, and a REST surface for co-located agents. Add `ANNOTAKIT_GH_TOKEN` in `.env` to switch on the GitHub mirror (restart required). Requires `storybook dev` (the review API lives on the dev server — static `storybook build` shows a "dev only" note; React projects get fiber metadata; non-React projects still work with DOM selectors + story metadata).

## Reviewer flow

1. `npm run storybook` → any story
2. **Annotakit toolbar buttons** (native Storybook toolbar): pin · region · threads (+count) · show/hide pins — or press **`⌥C`** and click an element (**`⌥R`** → drag a region)
3. The composer shows the exact element identity — `<button#save.primary.btn:nth(2) [testid=save-btn] "Save">` — the SAME string the agent later reads in the digest
4. Type → **Pin it** (⌘/Ctrl+Enter). Saved. Automatically. That's the fix for "Failed to save annotation: do I need to set up a DB?"
5. Threads live in the **Annotakit** panel (bottom dock): reply, resolve, export, sync status, and a 📷 *dom* chip per thread opening the captured DOM evidence
6. Pins follow their element through re-renders, HMR, and DOM changes (multi-selector anchoring with text/attr fallbacks — ported unchanged from AnnotaKit's proven engine)
7. With a GitHub token configured, **every thread mirrors to exactly one GitHub issue, automatically** — create → issue, reply → comment, resolve → close, reopen → reopen, delete → close+note. No publish button, no duplicate issues, ever.

Shortcuts (SB-convention Alt/⌥-prefixed, physical-key matched so macOS Option-compose can't break them): `⌥C` pin · `⌥R` region · `⌥L` show/hide pins · `⌥D` drawer · `Esc` cancel · `?` help. Customize via `parameters.annotakit.hotkeys`. The v0.4 floating launcher is GONE — the canvas DOM stays untouched.

## What a thread knows (the differentiator)

Every pin captures, at click time:

| Signal | Source | Example |
|---|---|---|
| story id / title / name | CSF render context + `/index.json` | `nimbus-components--status-badge` |
| story file | story index `importPath` | `./src/stories/leaf.stories.tsx` |
| component name | React fiber walk (nearest component) | `StatusBadge` |
| **jsx site** | host-fiber `_debugStack` parse (React 19) + **inline-sourcemap correction (v0.4.1)** | `src/components/nimbus/StatusBadge.tsx:12` (TRUE source line) |
| component chain | `fiber.return` walk (SB internals filtered) | `Dashboard > KpiCard > StatusBadge` |
| props | `fiber.memoizedProps` (small values) | `status="pending"` |
| DOM anchor | `@medv/finder` cssSelector + W3C-style textQuote + fragment bbox | `.bg-amber-50`, `"pending"` |
| **exact element identity** (v0.5.0) | id, class list, data-testid, nth-of-tag, form name/label/placeholder/value (password-masked), img alt | `button#save.primary.btn:nth(2) [testid=save-btn label="Save"] "Save"` |
| **React key** (v0.5.0) | nearest fiber `key` — the exact `.map()` item identity | `key="row-42"` |
| **DOM snapshot** (v0.5.0, plan-b) | story-root outerHTML at pin time, pinned element marked `data-annota-snap="1"`; TEXT so any model can read it (no multimodal); `?format=html` renders it for humans | `GET /threads/<id>/snapshot` |

So the digest an agent receives says *"StatusBadge, src/components/nimbus/StatusBadge.tsx:12, props status=pending, selector .bg-amber-50, comment: should pulse when overdue"* — instead of a raw HTML blob.

React 18 fallback: `_debugSource` object + DevTools-hook `findFiberByHostInstance`. React ≤17 / production builds: DOM + story metadata only (fiber fields are pruned in prod by React itself).

## Agent flow (this is you)

**Detect your surface first** — `GET /annotakit/api/health`:

```json
"agentSurfaces": { "rest": true, "digests": ["md","json"], "github": true,
  "githubLabel": "annotakit", "durability": "git-push" }
```

`github: true` → Path A and B are both live. `github: false` → Path B (local REST) is your whole surface — and that's a fully working mode, not a failure state.

```bash
BASE=http://localhost:6006
curl $BASE/annotakit/api/health                          # agentSurfaces + ghSync state
curl $BASE/annotakit/api/threads                         # {"threads": [...]} — unwrap the envelope
curl "$BASE/annotakit/api/export?format=md"              # lean digest (default)
curl "$BASE/annotakit/api/export?format=json&status=open"  # lean JSON bundle
```

- The digest maps every thread to **the file to edit** (`jsx:` line, repo-root-relative) plus story file + component + props + selector. Fix the UI, then resolve:
- **Resolve programmatically (Path B)**: `GET /api/threads` → take the thread OBJECT → set `"status":"resolved"` → `PATCH` the FULL object to `/annotakit/api/threads/<id>` (the server stamps `resolvedAt` on transitions; stale snapshots are merged server-side — omitted comments are never dropped).
- **Create threads programmatically** (idempotent upsert by `id` — replays return 200, new threads 201): POST `/annotakit/api/threads` with `{storyId, story?, component?, target, comments:[{id,author,body,createdAt}]}` — numbers are server-assigned per story. With GH auto-sync on, each POST **creates a real issue within ~1s**.
- **GitHub lifecycle mirror (Path A, v0.4.0 production-grade)** — one issue per thread, forever:
  - The local DB (`threads.db`, git-tracked) is the **status source of truth**; each thread's `gh.issue` field pins its mirror.
  - **Push on every mutation** (debounced, serialized): thread → issue, reply → comment, resolve → close, reopen → reopen, delete → close + note. Idempotent — `POST /annotakit/api/sync` reconciles both directions and creates **zero** duplicates, no matter how often you call it. A thread deleted while its issue is being created self-closes it (no orphans).
  - **Pull every 60s** (configurable): an agent closing the issue on GitHub resolves the thread in Storybook within a minute, importing its comments as replies (`source: "github"`). Reopening re-opens the thread; commenting on a closed issue still imports.
  - **Failure behavior**: 401 → self-healing a/b/c steps, mirror pauses, local mode keeps working. Rate limits → timed backoff (Retry-After respected). Remote issue deleted → mapping resets and heals. Fetch timeouts, pagination (>100), and comment-`since` gating keep the API budget flat as threads grow. Verified live on this repo: [issue #9](https://github.com/melodietexoss/storybook-annotakit/issues/9) (tabular-nums feedback → agent commit `542e7b0` → evidence comment → close → thread resolved in Storybook within one poll).
  - Knobs: `ANNOTAKIT_GH_AUTO=0` (local mode) · `ANNOTAKIT_GH_POLL=<sec>` · `ANNOTAKIT_GH_REPO` · `ANNOTAKIT_GH_API` (GHE) · `ANNOTAKIT_GH_INTERVAL=<ms>`.
  - `POST /gh` is kept as a legacy alias of `POST /sync` — digest publishing is gone (v0.2.0 digest issues in existing repos should be closed manually once).
- Loop: reviewer pins → issue appears → agent fixes code at the `jsx:` path → agent comments evidence + closes → thread resolves in Storybook (60s poll) → reviewer re-checks, may reopen → issue reopens. Hands-free both directions; without GitHub, the same loop runs entirely over Path B.

## Lean exports (feedback-driven)

The previous kit's JSON was "extremely verbose" and the markdown "too cluttered". This one: no W3C envelope, no outerHTML dumps, no anchor forensics — one line per fact, the comment is the headline, `outerHTML` clipped to 200 chars and only in the full thread docs, resolved threads folded into a `<details>` block. 3 threads ≈ 3.2 KB of JSON.

## Configuration (all optional)

| What | Where |
|---|---|
| default GitHub repo | `.storybook/annotakit.config.json` → `{"ghRepo":"owner/name"}` (or `ANNOTAKIT_GH_REPO`, or git-remote/package.json autodetect) |
| GitHub token | env `ANNOTAKIT_GH_TOKEN` (or `ghToken` in config) |
| mirror on/off | env `ANNOTAKIT_GH_AUTO=0` or config `{"ghAuto":false}` (default: on; off = local mode) |
| poll interval | env `ANNOTAKIT_GH_POLL=<sec>` or config `{"ghPoll":60}` (0 = pull on POST /sync only) |
| GHE / custom API | env `ANNOTAKIT_GH_API=<base url>` |
| author name | Annotakit panel input (localStorage `annotakit:author`) |
| disable per story | `parameters: { annotakit: { disabled: true } }` |
| store location (v0.5.0) | `<git-common-dir>/annotakit/threads.db` — immune to branch switches and `git clean -fdx`, structurally un-gitignorable; durability = the `annotakit` orphan branch (see below) |

All env vars are read once at boot — restart `storybook dev` after changing `.env`. `.env` holds a secret: `echo ".env" >> .gitignore` BEFORE writing the token into it (the engine never commits it, but `git add -A` would).

## Demo

`examples/nimbus` — a fresh Storybook 10.6 + React 19 + Tailwind 4 project (the Nimbus Analytics mock from AnnotaKit, 13 stories) with the addon wired by exactly one line in `main.ts`. Run it:

```bash
cd examples/nimbus && bun install && bun run storybook
# → http://localhost:6006 → press C → click an element
node scripts/api-test.mjs          # 42/42 contract tests (run from repo root)
node scripts/ghsync-fake.mjs       # 60/60 lifecycle + stress engine tests
```

## Repo layout

```
preset.js               # Storybook preset: managerEntries, previewAnnotations,
                        #   viteFinal (react dedupe), experimental_devServer, experimental_serverChannel
src/shared/             # types + channel events (identical strings across bundles)
src/server/             # middleware + SQLite store + lean digest + GH lifecycle
                        #   mirror engine ghsync.ts (CJS bundle)
src/preview/            # decorator + overlay UI + fiber inspection + anchor engine (ESM)
src/manager/            # review panel + toolbar tool (ESM)
scripts/api-test.mjs    # 40-check contract test (against a running server)
scripts/ghsync-fake.mjs # 59-check lifecycle+stress engine test (fake GitHub, in-process)
examples/nimbus/        # demo project
```

## Why not a full Storybook fork?

The original direction was "fork storybookjs/storybook and make surgical changes". Research (2026-09) showed SB ≥ 9.1.16 ships the exact hooks a fork would have provided: `experimental_devServer` (mount anything on the dev server), `experimental_serverChannel` (server→client broadcast), `managerEntries`/`previewAnnotations` (full React UI in both surfaces). The result is fork-depth integration that survives every `storybook upgrade`. If a literal fork is ever needed, `src/manager` and `src/preview` transplant directly.

Landscape at time of writing: Chromatic does cloud screenshot-pin comments (not live DOM, no local mode); Greenroom (`@igility/greenroom-addon`, Aug 2026, pre-release) does pins + MCP but needs its unpublished sidecar, anchors by a single CSS selector, and has no React component metadata. Neither is local-first + dev-server-embedded + component-aware.

## Store durability across branches and machines (v0.5.0)

Feedback threads are per-PROJECT, not per-branch — you review `feature-x`'s Storybook on Monday and `main`'s on Tuesday, and nothing may vanish in between:

- **the store lives in the repo's common git dir** (`.git/annotakit/`) — checkouts and `git clean -fdx` physically cannot touch it, and "is the db gitignored" is structurally impossible; all worktrees of one repo share it
- **durability is a dedicated ORPHAN branch** (`refs/heads/annotakit`, tree = `README` + `threads.db`): pure git plumbing (hash-object/mktree/commit-tree/update-ref — no index, no work tree), pushed with the same debounced mutation flow. Zero commits on your code branches (no CI noise, no review pollution); a foreign branch with the same name is detected and avoided (falls back to `annotakit-store`)
- **divergence is a logical merge, not a conflict**: two machines pushing the same branch reconcile by union (threads by id, delete-wins tombstones, resolved-wins, comment union) — committed on top of the remote head, never force-pushed
- **fresh clones / agent sandboxes boot-restore** from the remote branch (offline-capable right after clone via the tracking ref); a legacy v0.4 tracked db is migrated row-by-row, the old file left untouched
- no repo / `autoSync:false` → classic `<configDir>/annotakit/threads.db`, disk-only (your choice, no git flow)

Caveats, documented: `--mirror`/`--all` pushes will carry the orphan branch too (harmless); monorepos share ONE store; `git checkout annotakit` out of curiosity shows a README, not code; branch protection that forbids new refs degrades durability to local-commit with a clear log.

## Static builds — review without a dev server (v0.5.x)

`storybook build` output served as plain files? The addon notices by itself: no `/annotakit/api/health` **but** a baked `annotakit-threads.json` next to `index.html` → static mode, and the browser becomes the store:

```bash
cd your-project
node node_modules/storybook-annotakit/scripts/bake-static-threads.mjs <sb-output-dir>   # seed + marker, ALWAYS written
npx http-server <sb-output-dir> -p 3000   # any static file server — no host-allowlist dance needed
```

- **reads**: pins render from the baked seed (same anchoring engine, same element identity lines)
- **writes**: pin, reply, resolve, delete → localStorage, scoped per deployment — `annotakit:static:<origin><deploy-dir>` — so multiple static deployments on one host never collide, and different hosts are isolated by the browser itself
- **re-bakes merge, they don't clobber**: seed ∪ localStorage uses the same logical union as the git durability layer (newest thread wins, comments union, delete-wins tombstones — idempotent)
- **honest degradation**: a "static · local-only" chip + panel badge (never a silent fake sync); DOM snapshots and the GitHub mirror are OFF in static mode; cross-document updates ride `storage` events instead of WS
- **hand-carry back**: the panel's copy/download md + json exports are built client-side from the local store — paste them into an agent, or reconcile into a dev-server store later
- **what it's NOT** (stage 3, deliberately not shipped): no issue sync from the browser — a PAT in client localStorage is readable by any story code; if static sync is ever needed, the PAT goes behind a tiny sidecar, not into the bundle

## Status

Experiment (v0.5.0), private (not yet on the npm registry — install via `file:`). E2E-verified in-session: pin→save→reply→resolve→re-anchor-after-DOM-change→export→GitHub 1:1 lifecycle mirror (auto create/close/reopen/tombstone + 60s pull-back), including a full remote-agent round trip ([issue #9](https://github.com/melodietexoss/storybook-annotakit/issues/9): fix commit → evidence comment → close → auto-resolve in Storybook). 67/67 API contract tests + 60/60 lifecycle engine tests + 20/20 live-process stress + 8/8 store-robustness cases (branch switch, clean -fdx, fresh-clone restore, two-machine divergence merge, delete-wins tombstones, foreign-branch adoption, empty-store guard, legacy migration) + 26/26 static-store checks — all against real git repos and a local bare remote. Static mode E2E-verified in-session (seeded pins render, create/reply/resolve persist across reloads, scope isolation, re-bake merge, public preview through the sandbox gateway).

**v0.4.1 — hardened by dogfooding the full review loop on a real project** (Deskline, 51 stories, 3 competing design variants, 14 pin threads, fix→verify→reopen→re-resolve round trips): RESTful `DELETE /threads/<id>` (path form, both shapes now work); `jsx:` file:line now **sourcemap-corrected** — raw React `_debugStack` lines reference Vite's esbuild-transformed module (often ~2× source length, causing impossible line numbers); pins on story-owned wrapper DOM report `story render (Storybook wrapper)` + the story file instead of `unboundStoryFn`/preview.tsx internals; `/health` exposes `bootedAt` so agents can verify restarts actually happened (stale-process trap). Known gaps as of v0.4.1: no screenshot evidence per pin, no MCP server (REST + GitHub issues + digests are the agent surface), fiber metadata is dev-mode-only by React's own design.

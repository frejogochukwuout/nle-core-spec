# W1-c — org re-home reconnaissance (aivs-tech)

Task ID: W1-c · Round R35 · Workstream D (fleet re-home to `github.com/aivs-tech`).
Scope: read-only audit of the 6 local fleet clones at `/home/z/r35/{nle-core-spec,nle-engine,nle-test-app,nle-ui,opencut-timeline,web-daw-core}`. Verified snapshot state at audit time: **all 6 repos clean, `main` == `origin/main`, 0 stashes, 0 tags** (last-push dates 2026-09-22 except web-daw-core 2026-09-15).

Current split homes:
- `nle-core-spec` → `github.com/frejogochukwuout/nle-core-spec` (private)
- the other 5 → `github.com/bearachprema/{nle-engine,nle-test-app,nle-ui,opencut-timeline,web-daw-core}` (private)
- EVERY repo ALSO has a second remote `gitlab` → `gitlab.com/ansgareutychisO/<same-name>.git` (WAF-tolerant mirror; a background sync script `/home/z/r35/sync_gitlab.sh` was mid-flight pushing `main`→gitlab at audit time). No `gitlab.com` refs exist in any tracked file content — the GitLab relationship lives only in `.git/config` + the out-of-repo sync script.

New home: `github.com/aivs-tech` (PAT = ADMIN, repo creation verified — orchestrator-side).

---

## §1 The functional-reference inventory (the breakage class)

These are the refs that FETCH/AUTHENTICATE at runtime. Everything else is §2. Counts below use `file:line` in the current `main` of each repo.

### 1.1 nle-engine (2 submodules + the fleet's auth-critical CI)

| # | repo | file:line | what it references | class |
|---|------|-----------|--------------------|-------|
| E1 | nle-engine | `.gitmodules:3` | `url = https://github.com/bearachprema/web-daw-core.git` — submodule `vendor/web-daw-core`, gitlink pin `94f6460` (= wdc `main` HEAD) | **submodule URL — breaks on move** |
| E2 | nle-engine | `.gitmodules:6` | `url = https://github.com/bearachprema/opencut-timeline.git` — submodule `vendor/opencut-timeline`, gitlink pin `17a19f8` (on OT `main`, behind `ccff397`) | **submodule URL — breaks on move** |
| E3 | nle-engine | `.github/workflows/ci.yml:50-64, 88-98, 196-206, 237-251, 319-344` | the "Materialize private submodules" step ×5 jobs (see §3/§4 for mechanics): `git config --global url.${{ vars.CI_VENDOR_URL_PREFIX }}.insteadOf https://github.com/` then `git submodule update --init --recursive` | **CI var + submodule fetch — variable does NOT transfer with a git push; must be recreated in the new repo** |
| E4 | nle-engine | `.github/workflows/perf.yml:60-67` | same materialize step in the nightly perf job | **same as E3** |
| E5 | nle-engine | `.github/workflows/ci.yml:323` | vendored-timeline job: `git fetch --depth=1 origin "$BEFORE"` — authenticated ONLY by the same insteadOf rewrite (origin URL on the runner is the repo itself) | **depends on E3's rewrite covering the repo's own URL too** |
| E6 | nle-engine | `.agents/SKILL.md:16` | bootstrap: `**Repo**: https://github.com/bearachprema/nle-engine (private)` | procedural bootstrap doc — future sessions clone the OLD home |
| E7 | nle-engine | `.agents/SKILL.md:56` | bootstrap: `git remote add origin "https://…@github.com/bearachprema/nle-engine.git"` | same |
| E8 | nle-engine | `.agents/HANDOFF.md:6` | `> **Repo**: https://github.com/bearachprema/nle-engine (private)` | orientation header — same |
| E9 | nle-engine | `.agents/SKILL.md:652, 1697` | the materialize-pattern law + the submodule-PAT law (`git config submodule.<path>.url …@github.com/<org>/<repo>.git` local override) | pattern docs, org-agnostic; update examples opportunistically |

Local-only (not committed, but part of the re-point): `nle-engine/.git/config` has `origin` → `https://<token>@github.com/bearachprema/nle-engine.git` and `[submodule "vendor/*"] url = /home/z/r35/<sibling>` — the R35 sandbox deliberately overrides submodule URLs to the LOCAL sibling clones (law #182, "initialized at the exact pins"). Local overrides do not affect CI or fresh clones.

### 1.2 nle-test-app (3 submodules + a secret-based CI)

| # | repo | file:line | what it references | class |
|---|------|-----------|--------------------|-------|
| T1 | nle-test-app | `.gitmodules:3` | `url = https://github.com/bearachprema/nle-ui.git` — submodule `vendor/nle-ui`, pin `cb04919` (= ui `main` HEAD) | **submodule URL — breaks on move** |
| T2 | nle-test-app | `.gitmodules:6` | `url = https://github.com/bearachprema/nle-engine.git` — submodule `vendor/nle-engine`, pin `60232ea` (= engine `main` HEAD) | **same** |
| T3 | nle-test-app | `.gitmodules:9` | `url = https://github.com/bearachprema/web-daw-core.git` — submodule `vendor/web-daw-core`, pin `94f6460` | **same** |
| T4 | nle-test-app | `.github/workflows/ci.yml:17-20` (job `test`) and `:46-49` (job `storybook`) | `actions/checkout@v4` with `submodules: true` + `token: ${{ secrets.NLE_GH_PAT }}` — NON-recursive by design (engine's nested submodules not consumed yet) | **repo SECRET (does not transfer) + submodule fetch via .gitmodules** |
| T5 | nle-test-app | `scripts/bootstrap.sh:21,24` | local-dev twin: `git config url."https://x-access-token:${PAT}@github.com/".insteadOf "https://github.com/"` then `git submodule update --init` | **org-AGNOSTIC rewrite** (rewrites whatever `.gitmodules` says) — no change needed beyond the PAT having read on the new org |
| T6 | nle-test-app | `vendor/nle-timeline/UPSTREAM.lock.json:2`, `vendor/nle-timeline-ui/UPSTREAM.lock.json:2`, `docs/port-census.md:90` | `"upstream": "https://github.com/bearachprema/opencut-timeline"` (+ pin sha `05d88d9`) — consumed by `scripts/census-check.mjs` as pin IDENTITY ONLY; the census is deliberately "self-contained and network-free" (tree diff + `upstreamHead` equality) | **network-free metadata** — not a fetch; update the URL string at the next re-pin for provenance accuracy |
| T7 | nle-test-app | `README.md:6` | links sibling `nle-ui` at old URL | doc link — informational (see §2), listed here because it is the app's own orientation README |

Note: `vendor/nle-timeline` (49 tracked files) and `vendor/nle-timeline-ui` (42 tracked files) are **plain tracked mirror trees, not submodules** — no remote dependency. `vendor/storybook-annotakit` (24 tracked files) likewise. `package.json` consumes the vendored trees via `file:` refs (see §6.3).

### 1.3 nle-core-spec (no submodules, no CI — but the annotakit/boot-restore tooling FETCHES)

| # | repo | file:line | what it references | class |
|---|------|-----------|--------------------|-------|
| S1 | nle-core-spec | `ui-mock/shell-variants/scripts/boot-restore.sh:50` | `git remote set-url origin https://github.com/frejogochukwuout/nle-core-spec.git` (bundle-clone repair on container recycle) | **functional fetch target — must be re-pointed or it silently goes stale** |
| S2 | nle-core-spec | `ui-mock/shell-variants/scripts/boot-restore.sh:69` | `git fetch "https://${GH_TOK}@github.com/frejogochukwuout/nle-core-spec.git" main` (best-effort fast-forward past the newest bundle) | **same — after the move this fetches the OLD home and misses new commits** |
| S3 | nle-core-spec | `ui-mock/shell-variants/scripts/boot-restore.sh:191` | writes `ANNOTAKIT_GH_REPO=frejogochukwuout/nle-core-spec` into the runtime `.env` (annotakit review-thread backend) | **functional — annotakit posts/reads threads against the old repo** |
| S4 | nle-core-spec | `ui-mock/shell-mini/scripts/boot-restore.sh:61` | `git remote set-url origin https://github.com/frejogochukwuout/nle-core-spec.git` | **same class as S1** |
| S5 | nle-core-spec | `ui-mock/shell-variants/scripts/r26-gh-postclosure.mjs:4` | `const OWNER = 'frejogochukwuout', REPO = 'nle-core-spec'` → `https://api.github.com/...` with `ANNOTAKIT_GH_TOKEN` (post-closure comment sweep) | **functional — GitHub API against the old repo** |
| S6 | nle-core-spec | `ui-mock/shell-variants/scripts/r26-inventory.mjs:5` | same OWNER/REPO constants → issue inventory via API | **same** |
| S7 | nle-core-spec | `.agents/SKILL.md:960, 978` | bootstrap: clone + `git remote add origin …@github.com/frejogochukwuout/nle-core-spec.git` | procedural bootstrap — future sessions land on the OLD home |
| S8 | nle-core-spec | `.agents/SKILL.md:961` | `git remote add gitlab …@gitlab.com/ansgareutychisO/nle-core-spec.git` | gitlab mirror bootstrap (unchanged by the GitHub move) |
| S9 | nle-core-spec | `.agents/PLAN.md:227` | "Canon: this repo, main — https://github.com/frejogochukwuout/nle-core-spec" | canon declaration — update at wrap |

### 1.4 web-daw-core (no submodules anymore — but a LIVE upstream-sync chain)

| # | repo | file:line | what it references | class |
|---|------|-----------|--------------------|-------|
| W1 | web-daw-core | `extraction-manifest.json:3` | `"repo": "https://github.com/bearachprema/web-daw"` (upstream `defaultRef: main`, `srcRoot: apps/web/src`) | **functional for `bun run sync`** — `scripts/sync-from-upstream.mjs:71-76` shallow-clones `manifest.upstream.repo` (token via `WEB_DAW_CORE_UPSTREAM_TOKEN`) when `$UPSTREAM_DIR` is unset. **NOT one of the 6 fleet repos — `web-daw` is NOT moving; this does NOT break in the re-home.** Flagged because the upstream lives on the old account. |
| W2 | web-daw-core | `UPSTREAM.lock.json:2` | same repo URL + synced sha `f5011b3` (provenance lock) | same as W1 |
| W3 | web-daw-core | `.github/workflows/ci.yml:9-13` | header NOTE: repo has NO submodules since 2026-09-04; documents the re-add pattern (CI_VENDOR_URL_PREFIX + global insteadOf — see nle-engine) | comment only — no runtime effect |

`bun run sync -- --check` is deliberately NOT run in CI ("upstream … only reachable from a local checkout").

### 1.5 nle-ui and opencut-timeline — ZERO functional refs

- **nle-ui**: no `.gitmodules`, CI needs no secrets/submodules; `vendor/storybook-annotakit` is tracked plain files. Only doc/worklog cites (§2) + a git-identity line (`.agents/SKILL.md:164`).
- **opencut-timeline**: no `.gitmodules`, **no CI at all**, no scripts fetching siblings. Only doc/worklog/review cites (§2).

### 1.6 Breakage matrix on move (what actually turns red)

| Breakage | Engine | Test-app | Spec | UI | OT | WDC |
|---|---|---|---|---|---|---|
| `.gitmodules` URLs dead (if old repos vanish/private-PAT-rot) | ✔ (2) | ✔ (3) | – | – | – | – |
| Actions VARIABLE `CI_VENDOR_URL_PREFIX` missing in new repo → all 5 ci.yml jobs + perf-nightly HARD-FAIL (`::error::` + exit 1, by design) | ✔ | – | – | – | – | – |
| Actions SECRET `NLE_GH_PAT` missing in new repo → both jobs fail at checkout | – | ✔ | – | – | – | – |
| Branch-protection/required checks not re-created (checks stuck "Expected") | ✔ | ✔(likely) | – | ✔(likely) | – | – |
| Annotakit/boot-restore tooling keeps pointing at old repo (silent staleness, not red) | – | – | ✔ | – | – | – |

The `.gitmodules` URLs only break if the OLD repos become unreachable; CI breaks IMMEDIATELY on move because variables/secrets are per-repo settings that `git push` cannot carry.

---

## §2 The informational-cite inventory (fine to leave)

Fleet-wide: **≈217 occurrences across ≈77 files** (pattern `frejogochukwuout|bearachprema|gitlab.com`). Distribution:

| repo | files / occurrences | nature |
|------|---------------------|--------|
| nle-core-spec | 34 / 110 | the corpus pin canon: numbered spec files (e.g. `15-wire-protocol.md:5001` pins engine `f9ac806`, `04-renderer-color.md:1190`, `20-audio-core.md:6`, `05-timeline.md` ×4, `00-master-spec.md` ×7, `19-code-references.md` ×10, `README.md:44-47` roster incl. the public `cloudcut-nle` ref) + historical `audits/**` (incl. generated `r33-intake/rows.json` ×21, `SCAN-PACK.md` ×33) + `ui-mock/annotakit-review (2).md` ×20. **All historical pin citations — LEAVE AS-IS** (they pin SHAs that survive any move). |
| nle-engine | 13 / 50 | own files: `worklog.md:3071,5802` (the :5802 line is important ORCHESTRATOR INTEL: "the old bearachprema/* is NOT accessible to the new PAT" — GitLab-namespace context). The other 12 files are INSIDE the two vendored submodule working trees (`vendor/opencut-timeline/{README,worklog,reviews/*}` ×35, `vendor/web-daw-core/*` ×13) — they are the siblings' own history, not engine refs. |
| nle-test-app | 16 / ~31 | top-level: `README.md:6`, `docs/{k3-map-geometry,port-census,research-nle-engine}.md` (pin provenance); the rest inside vendor trees. |
| nle-ui | 2 / 9 | `README.md:4,7,27` (sibling links), `worklog.md` history. |
| opencut-timeline | 5 / 35 | `README.md:11,13`, `worklog.md:16`, `reviews/w9-coderabbit-round{1,2}.md` ×31 (CodeRabbit review transcripts), `seal18-r-r28conventions.md`. |
| web-daw-core | 7 / 13 | `README.md:3` (upstream web-daw link), `HANDOFF.md:22,93-94`, `PLAN.md:28,29,207,404`, `docs/design-w1-meter-taps.md:322`, `worklog.md` — mostly the web-daw/web-daw-core provenance story + git identity (`223752503+bearachprema@users.noreply.github.com`). |

Also informational-procedural (update during the wrap, not breakage): engine `.agents/SKILL.md`/`HANDOFF.md` repo headers (E6-E8), spec `.agents/SKILL.md`/`PLAN.md` (S7-S9), OT `.agents/HANDOFF.md:3-4` + `SKILL.md:21`, ui `.agents/SKILL.md:164` identity, README sibling links (ui, test-app, OT).

External repos referenced but NOT part of the fleet / NOT moving: `github.com/walterlow/freecut` (public, engine README), `github.com/opencut-app/opencut-classic` (public, OT SKILL), `github.com/super-z-kits/z-container-kit` (public, SKILL survival guide), `github.com/bearachprema/web-daw` (private upstream, W1/W2), `github.com/frejogochukwuout/cloudcut-nle` (public UX reference, spec README:47).

---

## §3 The CI workflow map (needs/dependencies per repo)

### nle-engine — `.github/workflows/ci.yml` ("CI") — the auth-critical one
- **Triggers**: `push` to `main` (paths-ignore `*.md`, `**/*.md`, `gaps/**`); **ALL** `pull_request` (unfiltered by design — required checks must always report); `workflow_dispatch`. Concurrency `ci-${{ github.ref }}`, no cancel.
- **Jobs** (all `ubuntu-latest`, all `actions/checkout@v4` with `persist-credentials: false`):
  1. `typecheck` (15m) — materialize → bun 1.3.14 → `bun install --frozen-lockfile` → `bunx tsc --noEmit`.
  2. `vitest` (15m) — materialize → bun + node 24 → vitest dual-reporter → **count gate** `scripts/gate-vitest-count.mjs` (789 pinned, both-direction drift) + the gate's self-tests → 10 engine probes (`probe-p114-undo`, `p2s`, `fxa`, `crb`, `crc`, `fx2`, `fx4`, output-gated `rb-p1` + `m30-fixture`) → `lint-layering.mjs`.
  3. `coverage` (25m, non-required) — materialize → `bun run coverage` → artifact `nle-coverage-report`.
  4. `milestones` (90m) — materialize → Xvfb + Playwright Chromium → Next dev server :3000 → `scripts/run-nle-tests.mjs`; env `NLE_TEST_TIMEOUT_MS=3000000`, `NLE_TEST_ARTIFACTS_DIR`, `NEXT_TELEMETRY_DISABLED`; artifact `nle-milestone-artifacts`.
  5. `vendored-timeline` (45m, the OV-12 re-pin gate) — detects gitlink move in push range (fail-safe `changed=true` on non-push/unfetchable before-sha; the before-sha fetch is authenticated by the SAME insteadOf rewrite) → conditional materialize of ONLY `vendor/opencut-timeline` → vendored dev server :3001 (with the postcss/package-lock neutralization dance) → `scripts/run-timeline-tests.mjs`.
- **Sibling repo references**: `vendor/web-daw-core` + `vendor/opencut-timeline` via `.gitmodules` URLs (rewritten by the materialize step). Required-status checks key off job ids/names (comment-pinned: typecheck/vitest/milestones at minimum).

### nle-engine — `.github/workflows/perf.yml` ("perf-nightly")
- **Triggers**: `schedule` cron `0 7 * * *` + `workflow_dispatch`. `permissions: contents: read`.
- **Job `perf`** (30m): materialize (same PREFIX law) → `PERF_ASSERT=1 bun run test:perf` → count gate `--table perf` → `FC_SEED=random` property pass → artifact `nle-perf-nightly` (90-day retention).
- **Laws that matter for the re-home**: schedule runs only on the default branch; GitHub auto-disables cron after 60 idle days (the workflow documents keepalive/dispatch mitigations) → after the move, run one green `workflow_dispatch` FIRST (the FIRST-RUN LAW) and mind the 60-day disable on the NEW repo.

### nle-test-app — `.github/workflows/ci.yml` ("CI")
- **Triggers**: `push` to `main`, `pull_request`.
- **Job `test`**: `actions/checkout@v4` with **`submodules: true` (non-recursive) + `token: secrets.NLE_GH_PAT`** → node 24 (npm cache) → `npm ci` → typecheck → test → **build** (the D23 ultimate boundary validation) → `npm run boundary` → `scripts/census-check.mjs` → `scripts/census-mutation-gate.mjs`.
- **Job `storybook`**: same checkout → `npm run build-storybook` → the Storybook CSS gate (compiled utilities, no raw `@source`).
- **Needs**: the `NLE_GH_PAT` secret must read the 3 vendored sibling repos (nle-ui, nle-engine, web-daw-core) — cross-repo private reads.

### nle-ui — `.github/workflows/ci.yml` ("CI")
- **Triggers**: `push` main, `pull_request`. Plain `actions/checkout@v4` (no submodules, no secrets).
- **Job `test`**: npm ci → typecheck → test → `npm run boundary` (the engine-free law D23).
- **Job `storybook`**: build-storybook + the same CSS gate.
- **Sibling refs**: none functional. Move-safe.

### web-daw-core — `.github/workflows/ci.yml` ("CI")
- **Triggers**: `push` main (paths-ignore `*.md`), `workflow_dispatch`. Concurrency `ci-${{ github.ref }}`.
- **Job `gate`** (30m): checkout (`persist-credentials: false`) → bun 1.3.14 + node 24 → `bun install --frozen-lockfile` → `bun run typecheck` → `bun run test` (vitest, maxWorkers:1, ~1.8GB RSS audio-render).
- **Needs**: NOTHING beyond the repo itself (no submodules since 2026-09-04, no secrets). Move-safe.

### nle-core-spec, opencut-timeline — **NO workflows at all** (no `.github/` beyond nothing; no ISSUE_TEMPLATE, no dependabot, no `.gitlab-ci.yml`, no Makefile/justfile anywhere in the fleet).

### Which workflows break on the move + which reference SIBLINGS by URL
- **Break immediately**: engine ci.yml (all 5 jobs) + perf.yml — the `CI_VENDOR_URL_PREFIX` repo VARIABLE won't exist in `aivs-tech/nle-engine`; the workflows fail-closed by design (`::error:: … exit 1`).
- **Break immediately**: test-app ci.yml (both jobs) — the `NLE_GH_PAT` repo SECRET won't exist in `aivs-tech/nle-test-app`.
- **Reference siblings by URL**: engine (2 submodule URLs) + test-app (3 submodule URLs) — resolved via `.gitmodules` at clone time, authenticated by the var/secret above. No workflow anywhere references a sibling by a literal `github.com/<org>/<repo>` string outside `.gitmodules` + the rewrite.
- **Move-safe as-is**: nle-ui ci.yml, web-daw-core ci.yml.

---

## §4 The engine's "Materialize private submodules" mechanics (exact)

The step (identical in ci.yml ×5 and perf.yml ×1; the vendored-timeline job materializes only `vendor/opencut-timeline`):

```yaml
- name: Materialize private submodules
  run: |
    set -euo pipefail
    PREFIX="${{ vars.CI_VENDOR_URL_PREFIX }}"        # repo Actions VARIABLE
    if [ -z "$PREFIX" ]; then echo "::error::CI needs … CI_VENDOR_URL_PREFIX …"; exit 1; fi
    echo "::add-mask::$PREFIX"                      # mask in logs
    git config --global "url.${PREFIX}.insteadOf" "https://github.com/"
    git submodule update --init --recursive
```

Mechanics, precisely:
1. `CI_VENDOR_URL_PREFIX` is a **repository Actions VARIABLE** (Settings → Secrets and variables → Actions → Variables), an **authenticated https URL prefix** shaped like `https://x-access-token:<PAT>@github.com/` (the header comment says a fine-grained PAT with `Contents:read` on web-daw-core + opencut-timeline suffices; the classic repo PAT also works).
2. The **GLOBAL** (not local) `insteadOf` rewrite matters: `git submodule update` clones each submodule in a **separate git process** that does NOT read the superproject's local config — only system/global config reaches the rewrite (found via the first CI run's "could not read Username for 'https://github.com'").
3. Which URLs get rewritten: **every `https://github.com/` URL in the job** — the two submodule clone URLs from `.gitmodules` (→ `https://x-access-token:<PAT>@github.com/bearachprema/{web-daw-core,opencut-timeline}.git` today) AND, in the vendored-timeline job, the `git fetch --depth=1 origin "$BEFORE"` of the engine repo itself (checkout runs with `persist-credentials: false`, so that fetch is authenticated ONLY by this rewrite).
4. `checkout` itself uses the job's ephemeral `GITHUB_TOKEN` (fine — same-repo); cross-repo private reads are impossible for it, hence the whole mechanism.

**Re-home consequence**: the rewrite is org-agnostic (`https://github.com/` → prefix). Once `.gitmodules` points at `aivs-tech/*` and the variable is recreated with a PAT that can READ the new org's repos, everything works unchanged. The variable and the PAT's reach are the ONLY moving parts.

---

## §5 Git topology per repo

All six: default branch `main` (origin/HEAD → origin/main), **0 tags** (hence 0 signed tags), **no LFS** (no `.git/lfs`, no `.gitattributes` LFS filters), full clones (not shallow), no non-sample hooks, no stashes, working trees CLEAN, `main` == `origin/main` in all six.

| repo | commits (main) | `.git` size | local branches | remote-only branches (all UNMERGED into main unless noted) | main tip (2026-09-22) |
|------|---------------|-------------|----------------|--------------------------------------------------------------|----------------------|
| nle-core-spec | 385 | 49 MB | main | `annotakit`, `shell-mini-review`, `ui-baseline` (ui-baseline IS merged) | `6e2e593` R35 charter |
| nle-engine | 241 | 227 MB | main | `review-base-r1` | `60232ea` P-F4 fix |
| nle-test-app | 173 | 42 MB | main | `r5-review` | `cdc67d8` R34-W5c handoff |
| nle-ui | 124 | 21 MB | main | `r5-review`, `sround-queue` | `cb04919` CR viewer-empty |
| opencut-timeline | 239 | 208 MB | main | `review`, `review-base` | `ccff397` R34-W5c handoff |
| web-daw-core | 46 | ~1 MB | main | `h16-realtime-stop` | `94f6460` (2026-09-15) S-series wrap |

Submodule gitlink pins in HEAD: engine → wdc `94f6460`, OT `17a19f8`; test-app → ui `cb04919`, engine `60232ea`, wdc `94f6460`. (Pins are SHAs — they survive any URL move as long as the objects exist in the new repos, which full-history push guarantees.)

Total history to push: **~547 MB** (engine 227M + OT 208M dominate; expect the two big pushes to take minutes — the GitLab sync script's WAF-retry loop is the proven patience pattern).

---

## §6 npm/bun dependency pinning + config-file survey

1. **No `repository` field in ANY of the 6 root `package.json` files** (nor in the vendored ui-mock sub-packages).
2. **Zero git+ssh / https git-URL dependencies anywhere** — checked every `package.json` AND `bun.lock`/`package-lock.json` (fleet-wide): no `bearachprema`/`frejogochukwuout`/`gitlab`/`git+ssh` resolutions.
3. **The vendored-mirror pattern uses `file:` refs only**:
   - nle-test-app: `"nle-ui": "file:./vendor/nle-ui"` (the submodule), `"storybook-annotakit": "file:vendor/storybook-annotakit"` (tracked plain tree).
   - nle-ui: `"storybook-annotakit": "file:vendor/storybook-annotakit"`.
   - These are network-free — the re-home cannot break installs; only `git submodule update` fetches.
4. `.coderabbit.yaml` exists ONLY in nle-engine (path_filters, `auto_review.enabled: true`) → the CodeRabbit GitHub App is installed on the OLD org/repos (reviews/ dirs in OT confirm live usage) — an org-side reinstall is an orchestrator TODO.
5. `nle-engine/.env` = only `DATABASE_URL=file:/home/z/my-project/db/custom.db` — no URLs. No `.env` in the others. `nle-ui/user-msg` + OT `uer-msg.inbox` = user-message notes, no URLs.
6. No `.gitlab-ci.yml`, no CircleCI, no Makefile/justfile in any repo.
7. **Webhooks / deploy keys / environments: NO in-repo evidence** (`.github/` contains ONLY the 4 workflows files listed in §3). These are org/repo settings invisible to a local clone — orchestrator-side TODO (see §7).

---

## §7 THE RE-HOME RUNBOOK (ordered, zero-breakage)

**Recommended repo naming: KEEP THE EXACT SIX NAMES** (`aivs-tech/{nle-core-spec,nle-engine,nle-test-app,nle-ui,opencut-timeline,web-daw-core}`), all private. Rationale: the names are woven through `.gitmodules` paths, the corpus pin canon, dozens of cross-repo doc cites, and the vendored-mirror locks — renaming buys nothing and breaks string-matching provenance. (If a rename is ever wanted, do it LATER via GitHub's redirect-preserving rename, not during the move.)

**Recommended posture for the old locations: KEEP AS READ-ONLY ARCHIVES.** Do not delete: (a) dozens of historical pin cites point there; (b) `bearachprema/web-daw` — web-daw-core's LIVE upstream — stays on that account regardless; (c) archived repos remain fetchable, so in-flight clones and the boot-restore scripts degrade gracefully. After verification, archive (`Settings → General → Archive`) + add a one-line "MOVED to github.com/aivs-tech/<name>" README banner. NOTE: engine worklog:5802 records that "the old bearachprema/* is NOT accessible to the new PAT" (GitLab-namespace context) — the orchestrator must confirm WHICH GitHub identity currently owns/pushes `bearachprema/*` (local origin pushes were green through 2026-09-22) and who can archive them.

### Phase 0 — preflight (before touching anything)
- **0.1** Let the running `/home/z/r35/sync_gitlab.sh` background pusher FINISH (it pushes `main`→gitlab only; it never touches origin). Check `/home/z/r35/gitlab_sync.log` for "sync finished". The GitLab mirrors are home-agnostic (they mirror whatever `main` is) — no change needed there.
- **0.2** Freeze fleet writes: all six trees are clean and `main==origin/main` (verified in §5) — treat `6e2e593`/`60232ea`/`cdc67d8`/`cb04919`/`ccff397`/`94f6460` as the transfer baseline. No new commits until Phase 4 lands.
- **0.3** Inventory the orchestrator-side settings you must re-create (from §3): engine Actions VARIABLE `CI_VENDOR_URL_PREFIX`; test-app Actions SECRET `NLE_GH_PAT`; branch protections + required checks (engine: at least `typecheck`/`vitest`/`milestones`; test-app + ui: `test`/`storybook`); CodeRabbit app install; Actions enablement.

### Phase 1 — create the org repos (empty)
- **1.1** Under `github.com/aivs-tech`, create the six private repos, SAME names, **default branch `main`, initialized EMPTY** (no README/license/gitignore — an initial commit would make history push non-fast-forward).
- **1.2** Verify: `git ls-remote https://github.com/aivs-tech/<repo>.git` returns empty for each.

### Phase 2 — push full history (all refs, not just main)
Per repo, from `/home/z/r35/<repo>` (tokens live only in `.git/config`/env — the secret-scanner law: NEVER in a commit):
```
git remote add aivs https://<PAT>@github.com/aivs-tech/<repo>.git
git push aivs main
# preserve the non-main branches (remote-tracking only — push by refspec):
git push aivs origin/annotakit:refs/heads/annotakit origin/shell-mini-review:refs/heads/shell-mini-review origin/ui-baseline:refs/heads/ui-baseline   # nle-core-spec
git push aivs origin/review-base-r1:refs/heads/review-base-r1            # nle-engine
git push aivs origin/r5-review:refs/heads/r5-review                      # nle-test-app
git push aivs origin/r5-review:refs/heads/r5-review origin/sround-queue:refs/heads/sround-queue   # nle-ui
git push aivs origin/review:refs/heads/review origin/review-base:refs/heads/review-base           # opencut-timeline
git push aivs origin/h16-realtime-stop:refs/heads/h16-realtime-stop      # web-daw-core
git push aivs --tags   # no tags exist; harmless, keeps the runbook uniform
```
- **2.1 Verify parity per repo**: `git ls-remote aivs` ref set == old `origin` ref set (all branches, same SHAs); `git rev-list --count aivs/main` == the §5 table (385/241/173/124/239/46). Big pushes (engine 227M, OT 208M) may need retries — reuse the WAF-retry pattern from `sync_gitlab.sh`.

### Phase 3 — re-create CI-side settings (BEFORE the first push to the new repos goes through CI)
- **3.1** `aivs-tech/nle-engine` → Settings → Secrets and variables → Actions → **Variables** → add `CI_VENDOR_URL_PREFIX` = the authenticated https prefix (`https://x-access-token:<PAT>@github.com/` style). The PAT inside it needs `Contents:read` on **`aivs-tech/web-daw-core` + `aivs-tech/opencut-timeline`** (fine-grained suffices) — the aivs-tech ADMIN PAT qualifies.
- **3.2** `aivs-tech/nle-test-app` → Actions **Secrets** → add `NLE_GH_PAT` (repo-scope PAT that can read `aivs-tech/{nle-ui,nle-engine,web-daw-core}`).
- **3.3** Enable Actions on all six new repos; (re)install the CodeRabbit app on `aivs-tech` (engine's `.coderabbit.yaml` is in-tree and will activate).
- **3.4** Re-create branch protection + required status checks on `main` (job ids from §3; do this AFTER the first green run so the check names exist to pick).

### Phase 4 — re-point the functional refs (one commit per repo, pushed to the NEW origin)
Order matters: new repos exist (Phase 1-2 ✓), CI vars/secrets exist (Phase 3 ✓) → now flip URLs.
- **4.1 nle-engine**: `.gitmodules` — `bearachprema/web-daw-core.git` → `aivs-tech/web-daw-core.git`; `bearachprema/opencut-timeline.git` → `aivs-tech/opencut-timeline.git`. (Gitlink pins UNCHANGED — no re-pin, so the OV-12 gate correctly skips/verifies.) Update the procedural headers while there: `.agents/SKILL.md:16,56`, `.agents/HANDOFF.md:6`.
- **4.2 nle-test-app**: `.gitmodules` — all three → `aivs-tech/*` (pins unchanged). Update `README.md:6` + the `UPSTREAM.lock.json`/port-census provenance URLs opportunistically (network-free metadata; may also be deferred to the next re-pin).
- **4.3 nle-core-spec**: re-point the fetchers — `ui-mock/shell-variants/scripts/boot-restore.sh:50,69,191`, `ui-mock/shell-mini/scripts/boot-restore.sh:61`, `r26-gh-postclosure.mjs:4`, `r26-inventory.mjs:5` (OWNER='aivs-tech'), `.agents/SKILL.md:960,978`, `.agents/PLAN.md:227`. LEAVE the corpus pin canon + audits cites (§2) untouched.
- **4.4** OT/ui/wdc: no functional refs; optionally update README/sibling links + `.agents` headers in the wrap commit.
- **4.5 Push each repo's re-point commit to the NEW origin (aivs).** This is the first CI-triggering push → watch each workflow.

### Phase 5 — re-point the local working clones
Per repo:
```
git remote rename origin legacy          # keeps the old URL reachable for verification
git remote add origin https://<PAT>@github.com/aivs-tech/<repo>.git
git fetch origin && git branch -u origin/main main
# keep the `gitlab` remote as-is (mirror is home-agnostic)
```
- The local `[submodule "vendor/*"] url = /home/z/r35/<sibling>` overrides stay — they're deliberate (law #182) and unaffected.
- 5.1 Verify: `git status -sb` shows `main...origin/main` clean; `git remote -v` shows origin=aivs, legacy=old, gitlab=mirror.

### Phase 6 — verify (the zero-breakage gates, in order)
- **6.1 Parity**: §2.1 checks pass (refs + commit counts).
- **6.2 Engine CI green on the new home**: after 4.5, all five ci.yml jobs green — CRITICAL: `vitest` AND `milestones` green proves the materialize rewrite + new-org submodule reads work; then dispatch `perf-nightly` manually (the FIRST-RUN LAW) and confirm green before trusting the cron (and note the 60-day auto-disable law applies to the NEW repo).
- **6.3 Test-app CI green**: both jobs — proves `NLE_GH_PAT` + the three re-pointed `.gitmodules` URLs (submodules: true, non-recursive).
- **6.4 UI + WDC CI green** (no secrets — should be green on any push).
- **6.5 Fresh-clone e2e (the real proof)**: on a clean machine, `git clone https://github.com/aivs-tech/nle-engine.git` + apply the materialize rewrite (or `scripts/bootstrap.sh`-style local config) + `git submodule update --init --recursive` → pins `94f6460`/`17a19f8` resolve. Same for test-app with `NLE_GH_PAT` + `scripts/bootstrap.sh`.
- **6.6 Annotakit chain**: boot-restore + r26 scripts run against `aivs-tech/nle-core-spec` (new issues/threads land in the new home).
- **6.7 GitLab mirrors still syncing**: next `git push gitlab main` green from the new origin config.

### Phase 7 — decommission the old homes (only after 6.1-6.7 green)
- **7.1** Add the "MOVED to aivs-tech/<name>" README banner to each old repo (last commit to the old homes).
- **7.2** Archive the five `bearachprema/*` fleet repos + `frejogochukwuout/nle-core-spec` (read-only backups; still fetchable). Do NOT touch `bearachprema/web-daw` (wdc's live upstream) or `frejogochukwuout/cloudcut-nle` (public reference).
- **7.3** Record the re-home in each repo's worklog/HANDOFF (the wrap workstream F picks this up).

---

## §8 Open risks / orchestrator-side TODOs

1. **Identity/PAT reach (BLOCKER-CLASS UNKNOWN)**: engine worklog:5802 says "the old bearachprema/* is NOT accessible to the new PAT" (GitLab-namespace context). The local origin URLs embed a GitHub token whose pushes were green through 2026-09-22 — but the orchestrator must confirm: which GitHub account owns `bearachprema/*` and `frejogochukwuout/*`, whether the aivs-tech PAT can ARCHIVE them (needs admin there), and whether the `CI_VENDOR_URL_PREFIX` PAT is the same credential (if it embeds an old-org-scoped token, recreate it scoped to aivs-tech).
2. **Org settings invisible from a local clone** (the PAT can see them; this audit cannot): existing webhooks, deploy keys, environments, secret-scanning config, Actions permissions/timeout, default-branch protection, CodeRabbit install state on the old repos — inventory and replicate as wanted. No in-repo evidence of webhooks/environments/deploy keys exists (§6.7).
3. **The two CI credentials are per-repo settings and DO NOT transfer with git push**: `CI_VENDOR_URL_PREFIX` (engine variable), `NLE_GH_PAT` (test-app secret). Their VALUES are not visible from the clones — the orchestrator must know/rotate them (the engine workflow header documents the variable's shape and the fine-grained-PAT minimum).
4. **Required status checks**: ci.yml comments confirm required checks key off job ids ("typecheck/vitest/milestones"); the exact protection config on the old repos is org-side — re-create or PRs will show checks stuck at "Expected — Waiting for status".
5. **The active background sync** (`sync_gitlab.sh`, started 21:22:30, 30-attempt WAF retry loop): coordinate — it only pushes `gitlab main`, but a concurrent Phase-2 push from the same clone could interleave. Let it finish (Phase 0.1).
6. **perf-nightly cron**: the 60-day inactivity auto-disable + "first trusted run is a green dispatch" law — schedule runs only on the default branch of the NEW repo; arm it explicitly (Phase 6.2).
7. **Push size/time**: engine 227M + OT 208M (~547M total) — plan for slow first pushes; the WAF-retry pattern is proven on GitLab; GitHub may rate-limit large pushes (retry, don't force).
8. **`web-daw` upstream stays on `bearachprema`**: wdc's `bun run sync` (extraction-manifest URL, W1) is unaffected by the fleet move but is a standing single-account dependency — if that account is ever retired, sync breaks. (Out of scope for the re-home; flagged.)
9. **The engine OT pin (`17a19f8`) is behind OT main (`ccff397`) and behind test-app's mirror pin (`05d88d9`)** — expected ("validated-against" records); no re-home action, but the corpus pin canon will cite old-location repos in prose forever (harmless while the old homes remain archived).
10. **Token hygiene**: origin/gitlab remotes embed credentials in `.git/config`; GitHub's secret scanner blocks token-bearing PUSHES (spec PLAN law). When re-pointing remotes (Phase 5), embed the PAT only in local config/env — never in commits, never in the runbook artifacts.
11. **ui-baseline (spec) is merged into main** — pushing it anyway is harmless and preserves the ref name for any history tooling.
12. **Cloudcut-nle + freecut + opencut-classic + z-container-kit** are external repos referenced informationally — no action.

— W1-c, R35. Sources: full-tree rg sweeps (`frejogochukwuout|bearachprema|gitlab\.com`) per repo; all 4 workflow files read in full; `.gitmodules`/`.git/config`/`git ls-tree -r HEAD` gitlink audit; package.json/lockfile dep sweep; topology via git branch/tag/ls-remote/du.

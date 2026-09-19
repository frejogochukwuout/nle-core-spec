# scout-app — R28 seal round, Wave 0 (the app module card)

Task ID: R28-W0-c · Agent: scout-app · Scope: nle-test-app movement R27 pin `c020b2a` → HEAD `85cff80`.
Research/report-only; every claim carries file:line or commit-hash evidence. Read-order assumed: ARCH-R28 §1 (the delta table), 00-master, 19, 20, 02, 12/17, IMPLEMENTATION-PLAN.

---

## §1 The commit delta `c020b2a..85cff80` (7 commits; verified via `git log --stat` + full-tree diff)

**Net effect: 8 files touched, only 4 code-relevant — ALL from `0fedde6`. The full-tree diff `c020b2a→85cff80` (`git diff --name-only`) is exactly: `src/deliverService.ts`, `src/test/audioContextShim.ts`, `vendor/nle-engine` (gitlink), `vite.config.ts` + 4 docs (`worklog.md`, `.agents/HANDOFF.md`, `.agents/PLAN.md`, `.agents/SKILL.md`).**

| Commit | Class | What it is |
|---|---|---|
| `0fedde6` | **CODE** | The CR round's app folds (see §1.1) + **the engine re-pin `f9ac806` → `74bef08`** (gitlink). Gate line: "252/252, tsc 0, build + dist/worklets (3)". |
| `22a5303` | docs | worklog.md entry (the M2W1-app session record — twin reconciliation, CI root-cause, CR folds). |
| `a8fb756` | docs | `.agents/HANDOFF.md` rewrite: the M2-W1-complete state + the standing queue (§6). |
| `fbd67d0` | docs | `.agents/PLAN.md` +1 row: the M2-W1 phase row CLOSED. |
| `f90d614` | code (net-zero) | The GitLab-only RC-V1 P2 fix: `src/wire-coverage.test.tsx` (AR-2 live-registry fencing + the volume-line dblclick gesture pin). Claims **249/249 (8→9 in wire-coverage)** at ITS landing — explained in §2. |
| `21f4788` | merge | Merge of `f90d614` into the main line. **CONTENT-EMPTY vs its first parent `fbd67d0`** (`git diff fbd67d0 21f4788 --stat` = empty). |
| `85cff80` (HEAD) | docs | `.agents/SKILL.md` +21 lines: the M2-W1 app laws (walk-symlink, subpath+ambient pair, worklet serving scope). |

**The merge forensics (why the merge is content-empty):** `f90d614` is the GitLab twin of `8a3eb35` — identical commit message, identical `wire-coverage.test.tsx` content; `git diff f90d614 8a3eb35 --stat` differs only in the files the GitLab branch lacked (`audioService*`, `deliverService*`, `waveformPeaks*`, `vite.config.ts` — the M2-W1/cascade code that landed GitHub-side after the branch base `8b0189f`). `8a3eb35` is already an ancestor of `c020b2a` (R27: "AR-2 `8a3eb35` 249/249"). So the "mirror-rescue" merge brought **zero net content**; the AR-2 fence + gesture pin were in the R27 pin already (the task brief's "already known to the spec corpus" is confirmed at the tree level).

### 1.1 The one real code commit: `0fedde6` (4 files)

- **`vite.config.ts`** (+59/−27): **CR-F3** the dev-server kill — the middleware's `[\w.-]+` class admitted `..`/`.` → EISDIR unhandled; now exact-filename + known-extension regex (`/^\/worklets\/([\w-]+\.(?:js|wasm))$/`), a `statSync isFile()` belt, and a stream `error` → 404 handler. **CR-F5** — `closeBundle` captures the REAL outDir via `configResolved` (no `dist` hardcode) + a LOUD warn on a missing worklet source dir in builds. **CR-F2** the honest venue scope — the plugin's law comment now states Gate/De-esser ride `/wasm/advanced-processors.js` (NOT vendored → stay passthrough in this browser venue) instead of overclaiming Comp/Gate/De-esser/Limiter coverage.
- **`src/deliverService.ts`** (+14/−8, comment-law only): the `WORKLET_BACKED_INSERT_TYPES` doc-block reworked to the CR-F2 honest scope (the Set itself unchanged: compressor/gate/deesser/limiter). **Line drift: file 418 → 426 lines** — `workletFlushMs :252 → :260`, `WORKLET_BACKED_INSERT_TYPES ~:170 → :178`, `sceneHasWorkletBackedInserts :185`.
- **`src/test/audioContextShim.ts`** (+8/−1): **CR-F1's app half** — the shim's `connect` made spec-conformant (idempotent: "multiple connections … are ignored", `if (!this.connections.includes(node))`), required because the engine bridge's `syncSidechainWires` now connects every wanted duck wire unconditionally; a non-deduping shim would accumulate duplicates and break the connection-graph witnesses.
- **`vendor/nle-engine` gitlink: `f9ac806` → `74bef08`** (the CR-F1 unconditional reconnect + the reworked physical-connectivity pins; engine-side 749/749 per the commit message).

## §2 Test-count truth at `85cff80`

**Method: STATIC census (no `node_modules/` in the checkout → the vitest suite NOT run; `ls node_modules` fails). Count = `^\s*(test|it)(\.each)?\(` per tracked test file at HEAD.**

| Suite | Count |
|---|---|
| GluedShell.test.tsx | 104 |
| audioService.test.tsx | 42 |
| sceneBridge.test.ts | 41 |
| deliverService.test.ts | 20 |
| persistenceService.test.ts | 20 |
| wire-coverage.test.tsx | 9 |
| engineSeam.test.ts | 7 |
| waveformPeaks.test.ts | 9 |
| **Total** | **252** |

**252/252 — the 8-suite roof is UNCHANGED from R27.** No test file changed in the delta (`git diff c020b2a HEAD --name-only` has none). Corroboration: `0fedde6`'s own gate line "Gates: 252/252" + the worklog Stage Summary ("App 252/252 + tsc 0 + build + dist/worklets(3) + boundary + census + mutation 8/8 at 0fedde6") + `.agents/HANDOFF.md:11` ("252/252"). The census-check gate was run LIVE by me (§4); the vitest/tsc/boundary/mutation gates are commit-claimed only (not runnable here).

**The `f90d614` "249/249" claim reconciled:** it branched from `8b0189f` (248/248 at `ed33050`) and added wire-coverage test #9 → 249 on the GitLab line. The GitHub line already carried the SAME test via its twin `8a3eb35` and grew to 252 (`1aebbd5` 251 → `1c43897` 252 → `c020b2a` 252). Both lines converge at the content-empty merge → still 252 at HEAD.

**One app-internal doc nit:** `HANDOFF.md:56` (boot sequence) says "`npm test` (234)" — a stale H2-B-era figure contradicting the same file's session-state 252/252 (`:11`). Truth is 252 (my census + three gate lines). Flag to S-app; no spec impact.

## §3 The submodule/vendor pin set at `85cff80` (`git ls-tree` gitlinks + the lock files)

| Pin | R27 (`c020b2a`) | **R28 (`85cff80`)** | Moved by |
|---|---|---|---|
| `vendor/nle-engine` (gitlink) | `f9ac806` | **`74bef08`** | `0fedde6` (the CR-F1 engine re-pin) |
| `vendor/nle-ui` (gitlink) | `83ff8a8` | **`83ff8a8`** | — |
| `vendor/web-daw-core` (gitlink) | `ec8fd5c` | **`ec8fd5c`** | — |
| OT mirror `vendor/nle-timeline` + `vendor/nle-timeline-ui` (plain trees + `UPSTREAM.lock.json` ×2) | `6e2b91a` | **`6e2b91a`** | — (last vendor touch: `ed33050`, pre-R27) |

`(.gitmodules` declares exactly nle-ui / nle-engine / web-daw-core; the OT mirror is two hand-vendored plain trees whose pin lives in the `UPSTREAM.lock.json` pair — both read `upstreamHead: "6e2b91a"`.)

**The battery's 4th failing check (battery_r27.py:656) re-points to: engine `74bef08` + nle-ui `83ff8a8` + WDC `ec8fd5c` + OT mirror lock `6e2b91a`.** ⚠ Coherence note: the ENGINE repo's own HEAD is `074a2f6` (ARCH-R28 §1); the app's vendored `74bef08` is the CR-F1/F4 code state, one engine step behind (OV-12 vendored-root fix + docs + the `2640a81` mirror-rescue are engine-repo-only, not re-vendored). The battery must encode the app's ACTUAL gitlink (`74bef08`), NOT the engine repo HEAD — the two re-pins are separate rows (engine scout's card covers `074a2f6`).

## §4 The census register at HEAD — **HELD, no amendment needed**

Ran live: `node scripts/census-check.mjs` → *"census: 42 port files vs 41 reference files @ 6e2b91a; computed 6 byte-exact + 30 mechanical-exact (36 zero-action) + 5 carriers + 1 host; register-equality OK"* (exit 0). The declared register (`docs/port-census.md:29-37` + the fenced JSON) is exactly the R27 state: **42 = 36 zero-action (6 byte-exact + 30 mechanical-exact) + 5 carriers + 1 host**, pin `6e2b91a`. The delta touched no `src/timeline-port/` or vendor-mirror file, so the register holds mechanically. (The s17 re-pin, when it lands, is the next census event.)

## §5 The spec-facing citation surface (the re-pin to `85cff80` must touch)

### 5.1 `c020b2a` in the live corpus — **49 lines in 18 files** (numbered specs + IMPLEMENTATION-PLAN.md; `rg -n`, root corpus, audits/ excluded as historical)

| File | Lines |
|---|---|
| 00-master-spec.md | 3, 19, 400 |
| 01-core-engine.md | 14 |
| 02-workers-threading.md | 17, 26 |
| 03-playback-engine.md | 18, 19 |
| 05-timeline.md | 4, 16 |
| 06-nle-ops.md | 14 |
| 09-project-model.md | 4, 15, 16 |
| 10-fcpxml-export.md | 12, 16, 20, 21 |
| 11-cloud-render.md | 1463 |
| 12-testing-strategy.md | 4, 14, 36 |
| 13-subagent-scout-plan.md | 16 |
| 15-wire-protocol.md | 4, 15 |
| 16-keyboard-shortcuts.md | 4, 15, 24, 29, 34, 2148, 2398 |
| 17-test-plan.md | 4, 20 |
| 18-ui-shell.md | 14, 17 |
| 19-code-references.md | 5, 20, 32, 164, 230, 367, 429 |
| 20-audio-core.md | 14, 17, 26 |
| IMPLEMENTATION-PLAN.md | 20, 34, 44 |

### 5.2 `252` (the app count) — **53 lines total, ~47 canonical, 6 incidental**

The count at `85cff80` is **STILL 252** → the numeric claims remain TRUE; only the co-located SHA strings change (same lines as §5.1 in almost all cases + standalone rows in 12:18/:20, 15:33/:735, 16:2148/:2398, 17:37, 19:13/:18/:444, 09:1467, 10:1550). Incidental (NOT app-count; leave alone): 01-core-engine:947 (`timeline-manager.ts:252-259`, engine), 01:1219/:1946 (`renderer-manager.ts` 252 LOC, FreeCut), 03-playback-engine:386/:1757 (`sample.ts:41, 252`, engine), 02-workers-threading:155 (`preview-work-budget.ts:24, 236, 252`, engine).

### 5.3 The app's consumer-pin citations (must become `74bef08`)

The app→engine consumer pin `f9ac806` appears in the app-vendoring context at **00-master-spec.md:3** (fleet ledger, "app→engine `f9ac806`") **+ :19** (repo-map row), **20-audio-core.md:17** ("vendors WDC `ec8fd5c` + engine `f9ac806` + the OT mirror `6e2b91a`"), **19-code-references.md:230** ("`vendor/nle-engine` @ `f9ac806` (at engine HEAD)" — note: no longer at engine HEAD; drop the "(at engine HEAD)" qualifier), and **IMPLEMENTATION-PLAN.md** (the S-app row's consumer-pin enumeration). CAUTION: `f9ac806` in other contexts is the ENGINE repo's own R27 pin (16 hits in 19 alone) — that re-base (→ `074a2f6`) is the engine card's surface, NOT the app's; do not conflate.

### 5.4 Line-number drift casualties (0fedde6 shifted the code the specs cite)

- `deliverService.ts:252` (the flush-args law line) → now **:260**. Cited at **02-workers-threading.md:17** (also cites the family set at "`:170-172`" → now **:178**), **10-fcpxml-export.md:1550**, **19-code-references.md:230**, **20-audio-core.md:17**.
- `vite.config.ts:28-60` / `:28-69` (the serve-vendored-worklets plugin) → now spans **~:31-92** (function at :47; `WORKLET_SRC_DIR` :42). Cited at **20-audio-core.md:17** and **02-workers-threading.md:22**; **20-audio-core.md:27** cites `:38` → now **:42**.
- `audioService.ts:319-322` and `engineService.ts:510-513` / `sceneBridge.ts:229-262/:435-449` citations: files untouched by the delta — HOLD.

### 5.5 The battery fork surface (`scripts/battery_r27.py` → `battery_r28.py`)

App-class checks to re-point: header canon `:5` ("app c020b2a (252/252, …)"), `FLEET_HEAD :133`, the roof checks `:383-394` (counts unchanged — 252 still true), the 00-master pins check `:451`, **`LIVE: the app repo HEAD is c020b2a :651` → `85cff80`**, and **`LIVE: the app's submodules :656-659` → engine `74bef08` + nle-ui `83ff8a8` + WDC `ec8fd5c` + OT lock `6e2b91a`** (the 4th failing check of the current 145/149 baseline).

## §6 Their queue (`.agents/HANDOFF.md` at HEAD — the standing queue, priority order)

1. **The opencut s17 re-pin** (the D-ARCH-6 filings at `c020b2a` PLAN `:104-147`): the mirror re-vendor `6e2b91a` → the s17 tip + the port's gesture-seam switch (`use-timeline-actions.ts:452` / `use-keyframe-drag.ts:96` → the batch wire verbs — the gate-breaking duty; the ported coverage gate goes RED at the re-pin until it lands) + the pool multi-insert riding `insertBatch` + the nle-ui re-pin absorbing AW1-2. "⟸ the freshest upstream movement."
2. **M2 Wave 2** (design-m2-mixer-surface.md §8): the authoring surfaces — bus reverb mapping, EQ param editor, the nle-ui halves.
3. **M2 Wave 3**: PDC — `insertLatencySamples` + the single subtraction site at `adapter.playSegment` + seekSegment's re-anchor.
4. **CR-F6**: the readiness-await flush (Promise.allSettled over the strips' effect-ready promises). (CR-F7 NaN bus domain: deferred-by-documentation, app-unreachable.)
5. K4 (automated e2e) + the K3 store/policy halves (PLAN's ledger).

Session state: "M2 Wave 1 CLOSED end to end (engine `50b91f5`+`74bef08`; app `1aebbd5`+`0fedde6`)"; the CR round folded (F-1 fixed+pinned; F-2/F-3/F-5 fixed; F-6/F-7 deferred-by-documentation).

---

## §7 RE-PIN RECOMMENDATION (R28-W-A, the app row)

- **RE-PIN: `c020b2a` → `85cff80`. PROCEED — clean.** All-green claims at landing (252/252 + tsc 0 + build + dist/worklets(3) + boundary + census + mutation 8/8); my static census + live census-check corroborate the two gates I can run read-only; the delta is one small code commit + docs + a content-empty mirror-rescue merge (no new spec-law surface beyond CR-F2/F3/F5, which are app-internal hardening already absorbed by ARCH-R28 §1's row).
- **Test count at `85cff80`: 252/252, 8 suites** (104+42+41+20+20+9+7+9) — UNCHANGED from R27; every "252" citation in the corpus stays true; only the SHA strings move.
- **Census figures: 42 port files = 36 zero-action (6 byte-exact + 30 mechanical-exact) + 5 carriers + 1 host, @ OT mirror `6e2b91a`** — register-equality live-verified OK at HEAD; no register amendment required by this re-pin.
- **The vendor set (battery's 4th check): engine `74bef08` · nle-ui `83ff8a8` · WDC `ec8fd5c` · OT mirror lock `6e2b91a`.** (Engine gitlink ≠ engine repo HEAD `074a2f6` — separate rows; do not "fix" the app to `074a2f6` without a real re-vendor.)
- **Amendment-wave riders:** (a) the 49 `c020b2a` lines of §5.1; (b) the app→engine consumer-pin sites of §5.3 (incl. dropping 19:230's "(at engine HEAD)"); (c) the line-drift sweep of §5.4 (deliverService :252→:260 / :170-172→:178; vite.config :28-60/:28-69→:31-92, :38→:42); (d) fold CR-F2/F3/F5 as the app's CR-round closure note (20-audio's WDC-host row + 02's worklet rows are the homes); (e) battery_r28 encodes §5.5.
- **Do NOT touch:** the historical audit records (fleet-r24/r25/r27, SCOUT-*, ARCH-*, signoffs) that cite `c020b2a`/`252` — point-in-time records; and the incidental `252`s of §5.2.

**Open items for the orchestrator:** (1) the app's HANDOFF:56 "(234)" stale boot-sequence figure — S-app hygiene, not spec; (2) the engine-vendor lag (74bef08 vs 074a2f6) is a *recorded divergence* worth one battery comment so a future round doesn't mistake it for drift; (3) the s17 re-pin (their queue #1) is the next app-side event that WILL move the census + wire-coverage numbers — the battery's roof checks should anticipate that as a separate, later re-pin.

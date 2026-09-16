# R28-W0-a scout — nle-engine: the CR-Fold code wrap (`f9ac806` → `074a2f6`)

**Agent:** scout-engine · **Round:** R28 THE SEAL ROUND, Wave 0 (module scouts) · **Date:** 2026-09-15
**Range audited:** `f9ac806..074a2f6` — 7 commits (2026-09-13, one session: the M2-W1 CR fold + the venue/gate fixes + the mirror rescue + the SKILL wrap).
**Method:** full commit-log read + per-commit `--stat`/`--name-only` + code read of the one CODE commit (`74bef08`, both files) and the one CI commit (`e7cdede`); the engine's own law docs at HEAD (`.agents/HANDOFF.md`, `.agents/PLAN.md`, `worklog.md`, `.agents/SKILL.md`); spec-corpus greps for the pin figures + the sidechain law. **The suite was NOT run** — `node_modules` absent (fresh install required; vendor submodules uninitialized in this sandbox); counts derived **statically with full arithmetic** (§2), cross-checked against the repo's own gates lines.

---

## §1 The delta — full classification (7 commits, 7 files, +205/−15,236)

| commit | class | files | note |
|---|---|---|---|
| `3122a17` | docs (mirror twin) | `.agents/SKILL.md` +49 | laws 88-91 — the PRE-REBASE form of `f9ac806` (identical content; already on GitHub). Reached HEAD only via the merge below; **net-zero content contribution** to the `f9ac806..HEAD` diff. |
| `74bef08` | **CODE (the only one)** | `src/lib/nle/bridge/scene-mixer.ts` (+34/−13), `tests/vitest/m2-wave1-mixer-surface.test.ts` (reworked + new pin) | **CR-F1/F4**: the sidechain reconnect made UNCONDITIONAL (§3). |
| `e7cdede` | **INFRA (no library behavior)** | `.github/workflows/ci.yml` +15, `package-lock.json` −15,213 (DELETED) | OV-12 gate fix (§4). |
| `ae68aab` | docs | `worklog.md` +15 | the M2W1-engine session entry (the CR fold's own record). |
| `b1888bb` | docs | `.agents/HANDOFF.md` +23 | the M2-W1 addendum (the CR fold + the wdc re-pin + the venue fixes). |
| `2640a81` | merge (docs net-zero) | none | **the GitLab mirror reverse-drift rescue** — merges `3122a17` (the mirror's un-rebased tip) back in so the mirror ref can re-sync; zero net diff. |
| `074a2f6` | docs (HEAD) | `.agents/SKILL.md` +43 | laws 92-95 (worklet venue, **reconnect idempotence**, vendored-ambient tsconfig, mirror reverse-drift rescue). |

**Net diff classes:** ONE code commit (`74bef08`, `src/`+`tests/`), ONE CI/hygiene commit (`e7cdede`), everything else docs/merge. **Code anchor moves: `50b91f5` → `74bef08`.** Submodule lockset UNCHANGED at HEAD: OT `6e2b91a` + WDC `ec8fd5c` (`git submodule status`, both carried from R27 — the WDC cascade was already consumed at `480a216`).

## §2 Test-count truth at `074a2f6` — **749/749 across 25 test files** (static, exact)

**Method: static declaration census + loop-expansion arithmetic** (identical in kind to the R27 scout's and the R28 WDC scout's; no run possible — `node_modules` absent, install needed for a live vitest run).

- **25 test files** (vitest `include: tests/vitest/**/*.test.ts`): 4 top-level (`nle-bridge` 99, `upstream-ports` 25, `nle-bridge-realtime-midi` 8, `m2-wave1-mixer-surface` **10**) + 21 under `tests/vitest/engine/` (largest: `bridge-seams` 151, `planner` 52, `timeline-math` 42, `transform-resolver` 40). **File count and every per-file figure UNCHANGED from R27 except m2-wave1 (9→10).**
- **665 top-level `it(`/`test(` declarations** (line-anchored census; no `it.each`/`test.each`, no generic or function-wrapped generators — verified by scan).
- **4 declaration sites are loop-wrapped** (one `it` registration per iteration — vitest counts each):
  - `timeline-nan-guard.test.ts:71` `for (const bad of nonFinite)` → 12 its × **3** values = 36 tests
  - `timeline-nan-guard.test.ts:255` `for (const row of patchRows)` → **15** tests
  - `timeline-nan-guard.test.ts:380` `for (const row of transformRows)` → **10** tests
  - `timeline-locked-track.test.ts:185` `for (const row of rows)` → **38** tests
- **Arithmetic:** the 665 census already counts each wrapped `it` site once, so the runtime total = 665 + (36−12) + (15−1) + (10−1) + (38−1) = 665 + 24 + 14 + 9 + 37 = **749**.

**Cross-checks (independent, all agree):** (a) the repo's own gates line at `74bef08` — commit message "**Gates: 749/749 (748 + 1 new), tsc 0, fence 52**"; `worklog.md` "Engine 749/749 + tsc 0 + fence 52 + probes 9/9 at 74bef08"; `.agents/HANDOFF.md:46` "749/749 + tsc 0 + fence 52 + probes 9/9"; (b) the R27 arithmetic reproduces exactly: at `f9ac806` the same census gives 664 declarations + 84 expansion = **748** = the R27 pin figure; (c) the changed-test-files arithmetic: exactly ONE test file moved since `f9ac806` (`m2-wave1-mixer-surface.test.ts`), 9 → 10 its (the CR-F4 pin rework kept the connect pin — reworked to the physical-connectivity witness — and ADDED the CR-F1 regression pin), no files added/removed → 748 + 1 = 749, file count 25 holds.

**Test-count truth: 749/749, 25 test files.** (tsc 0 / fence 52 / probes 9/9 are repo-attested only — not re-run here.)

## §3 The CR-F1/F4 seam law — what changed, and the spec-facing staleness

**The bug (probe-proven by the fresh-context CR):** `SceneMixer.syncSidechainWires` severed precisely (per-wire identity diff) but **gated the reconnect on the identity diff** — a wire whose two node identities survived was skipped. But a STRUCTURAL insert edit on the SOURCE track runs `ChannelStrip.rebuildEffects`' structural path, which **arg-less-severs the strip's `sidechainOutput` tap (channel-strip.ts:453) WITHOUT re-creating it** — node identity unchanged, wire dead. Result: the duck stays silently dead on the MONITOR from that edit on (the export, fresh-mixer-per-render, still ducks — M2 Wave 1's own headline law inverted through this door). The app-side `rewireSidechains` that handled exactly this edge had been deleted when the bridge became the single owner.

**The fix (`74bef08`, `scene-mixer.ts:327-357`):** the SEVER loop stays the precise identity diff; the CONNECT becomes **UNCONDITIONAL over the wanted set** — `AudioNode.connect` is idempotent by WebAudio spec ("multiple connections to the same destination are ignored") and in web-audio-api: a no-op on a live wire, the cure when a third party severed it. The one deleted line is the gate `if (this.sidechainWires.has(key)) continue;` in the connect loop.

**The pin rework (CR-F4, same commit, the test file):** the first wiring pin never witnessed the CONNECTION (`sidechainInput !== null` is the vendor's own `buildSidechain`; a connect-spy absence proves nothing on pre-fix code) — replaced by the **physical-connectivity witness** (web-audio-api's own port bookkeeping: the tap's `_outputs[].sinks` contain the sidechain input's `_inputs` member) + the **CR-F1 regression pin** (a structural EQ insert on the source track leaves the wire ALIVE — verified discriminating: fails on the identity-gated form, passes on the fix). (The app's test shim's `connect` was made spec-conformant — 1 line, APP-repo side, not in this delta.)

**Spec-facing staleness found (the corpus = root 00-20; no `specs/` subdir exists):**

| site | staleness | severity |
|---|---|---|
| `20-audio-core.md:129` (§5 law 10) | "with the **per-wire identity diff as the sever law**" — still TRUE for the sever, but the law statement is now INCOMPLETE: it lacks the CR-F1 amendment (the connect is unconditional/idempotent; the `rebuildEffects` arg-less sever door is the reachable case the identity gate missed). The round's charter item ("the CR-F1/F4 sidechain law absorbed into the corpus where cited" — ARCH-R28:79) lands HERE. | **P1 for this round** |
| `20-audio-core.md:189` (§18-adjacent test-matrix row) | "m2-wave1 (**5 pins**: connect/re-point/prune + the REAL offline duck + control)" — now **6 pins** (connect reworked + the CR-F1 regression pin added); the row's parenthetical pin list is stale. | P1 (same edit family) |
| `20-audio-core.md:149/:228`, `:184` | the M2 Wave 1 law citations — same fold as :129 (one edit family) | P2 rider |
| Fleet pin/count figures | the standard re-pin set — see §6 (all pre-R28 by definition, not "findings") | expected W-A work |
| Cosmetic (repo-side, not corpus) | the F-2 describe title in `m2-wave1-mixer-surface.test.ts:205` still reads "(identity diff)" — now describes only the sever half | note only |

## §4 The OV-12 gate fix `e7cdede` — INFRA-ONLY, confirmed

- Files touched: `.github/workflows/ci.yml` (+15) + `package-lock.json` (DELETED, −15,213). **`git show e7cdede -- src/ tests/` → EMPTY.** Zero library behavior change.
- The fix: the engine root's stale `package-lock.json` (npm artifact beside `bun.lock`, unreferenced since the bun migration) made Next 16 infer the ENGINE root as the workspace, where the engine's own `postcss.config.mjs` hijacked the VENDORED OT app's postcss step → `@tailwindcss/postcss` resolved from the vendored node_modules → ENOENT → the OV-12 gate's dev-server never compiled → the 600 s curl wait expired (probed: dispatch run 34754338140). The gate's dev-server step now `mv`s the root configs aside (runner-workspace-only, belt-and-braces) and the lockfile is removed from the repo.
- One caveat for the re-pin text: this commit DOES change the tracked tree (a file deletion) — class it **infra/hygiene**, not docs-only; it is still outside `src/`+`tests/` so the code anchor stays `74bef08`.

## §5 The repo's declared state + next queue (HANDOFF + PLAN + worklog at HEAD)

- **M2 Wave 1 CLOSED + CR-FOLDED**: engine laws @ `50b91f5` + the CR P1 fix @ `74bef08` — **749/749, tsc 0, fence 52, probes 9/9** (HANDOFF:43-47). The WDC re-pin to `ec8fd5c` landed same session (twin fences held); the venue fixes (the `public/worklets` git symlink + the `AudioWorkletNode` global install in the M2 test file) are in.
- **Known deferred (documented):** CR-F6 — the worklet flush is a sleep, not a readiness await (the `Promise.allSettled` over the strips' effect-ready promises is the follow-up in `renderOffline`); CR-F7 — the NaN bus-domain note (informational).
- **Next queue (HANDOFF "Suggested Next Steps", in order):** (1) **the r1-port design round** — the pivotal architecture decision (retire the dual timeline models; inputs: AW1 §3 collision map + NS-4 + D12; design-first discipline); (2) **D-ARCH-6 absorption** (opencut's `insertBatch` + batch keyframe verbs + registry shrink 5→3 + the app's pool switch — watch their repo, then re-pin + absorb); (3) the **NS design queue** (NS-1 transport coupling, NS-2 real-media peaks, NS-3 thumbnails, NS-5 reschedule classification); (4) **M2 Waves 2-3** (the parallel stream's active front: reverb sends + the EQ param editor — nle-ui halves — then PDC); (5) the P3 register cherry-pick (HW1-9 device-lost, the transitionOut sidecar drop, the extrapolation notes).
- **Mirror state:** GitLab redundancy now under `ansgareutychisO/*` (the new PAT's own namespace; `bearachprema/*` unreachable); the `2640a81` merge re-synced the mirror ref after the reverse drift.
- **Stale-head caveat:** HANDOFF's "Immediate Status" block (:14-18) is itself one round behind (still "`c49ddb2`+ … 748/748", pre-CR); the M2-W1 addendum (:41-62) carries the live truth. PLAN.md was NOT touched by this delta (unchanged since `f9ac806`; its RC section + NS queue at :440-502 remain the live queue).

## §6 Citation-site register for the re-pin (the W-A mechanical work)

Union census over the live corpus (root 00-20 + `IMPLEMENTATION-PLAN.md` + signoffs; `audits/fleet-r27/` + ARCH-R27 records stay untouched — the immutability convention):

| figure | live-corpus sites | notes |
|---|---|---|
| `f9ac806` | **76 occurrences / 18 numbered spec files** (+ IMPLEMENTATION-PLAN union) | biggest: 19-code-references 16, 03-playback 8, 01-core 8, 00-master 5, 20-audio 5 |
| `50b91f5` | **28 / 13 numbered spec files** | the code-anchor string; moves to `74bef08` |
| `748/748` (word-bounded) | **36 / 18 live files** (incl. IMPLEMENTATION-PLAN 2) | → `749/749`; beware the NON-count `748` uses (e.g. spec-08's "L748-812" line-range pins — NOT test counts; only `/748`-slash-form sites are count sites) |
| `scripts/battery_r27.py` | 15 union lines (engine figures) | → the battery_r28 re-base (with WDC `83b8850` + app `85cff80`) |
| LOC figures | `57,064/63` under `src/lib/nle` at R27 | → **57,085 / 63 files** at HEAD (+21 net, all in `scene-mixer.ts`; the 74bef08 diff is +34/−13 there) |

## RE-PIN RECOMMENDATION

> **The R28 battery should declare, for nle-engine:**
>
> - **HEAD pin: `074a2f6`** (SKILL laws 92-95 — a docs-only head over the code anchor)
> - **Code anchor: `74bef08`** (the last commit touching `src/` or `tests/`; after it: one CI/hygiene commit, three docs commits, one net-zero merge)
> - **Test count: 749/749** — method: the repo's own gates line at `74bef08` (commit message + worklog + HANDOFF, three attested sites), **cross-checked by static derivation: 665 `it(`/`test(` declarations + 84 loop-generated cases (nan-guard `nonFinite` 12×3, `patchRows` 15, `transformRows` 10, locked-track `rows` 38) = 749**; reconciles exactly with the R27 arithmetic (664+84=748) + the one changed test file (+1 pin). NOT re-run live this session (no `node_modules`).
> - **Test files: 25** (4 top-level + 21 under `tests/vitest/engine/`) — unchanged since `f9ac806`
> - **Gates (repo-attested, not re-run): tsc 0, layer fence 52, probes 9/9**
> - **Submodule lockset: UNCHANGED** — vendors OT `6e2b91a` + WDC `ec8fd5c` (both R27 figures hold; the WDC S-series cascade was consumed at `480a216`, before this range)
> - **LOC: 57,085 / 63 files under `src/lib/nle`** (was 57,064)
> - **Delta class for the charter table: 1 CODE commit (CR-F1/F4) + 1 infra/hygiene commit (OV-12 gate + lockfile removal) + 4 docs + 1 net-zero mirror merge** — NOT a docs-only re-pin (unlike WDC's); the CR-F1/F4 law absorption into spec-20 §5 law 10 + the :189 pin-list re-key (5→6 pins) rides the re-pin edit family.

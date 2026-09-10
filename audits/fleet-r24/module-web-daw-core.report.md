# Module card — web-daw-core (WDC) — Fleet R24-1c

**Auditor:** R24-1c (research-only, ground-truth scout) · **Date:** 2026-09-08
**Repo:** `/home/z/my-project/web-daw-core` · **Baseline audited:** R23 pin `494f6ff` (759 tests) → current HEAD `85b81b0`
**Sources read:** root `HANDOFF.md`, root `PLAN.md`, `worklog.md` (tail), `.agents/SKILL.md` §11, `UPSTREAMING.md`, `UPSTREAM.lock.json`, `extraction-manifest.json`, `package.json`, `docs/design-w2-varispeed.md`, source greps (WDC + nle-engine + nle-test-app), spec `20-audio-core.md` §0, spec `02-workers-threading.md` §0. Local verification runs: `bun install --frozen-lockfile` (143 pkgs, 0.6 s) → `bun run test` → `bunx tsc --noEmit`.

---

## 1. VERIFIED STATE

| Fact | Value | Authority |
|---|---|---|
| HEAD | `85b81b0c56158da1dd2aa4492bb253fa083e7257` (main, 2026-09-07 10:04 UTC, **synced** with `origin/main`, worktree clean) | `git log`/`git status` (read-only) |
| Test count | **759/759 passed, 33 test files, 92 s** — **verified locally** (`vitest run` after a frozen-lockfile install) | local run (this audit) |
| Typecheck | `tsc --noEmit` exit **0** — verified locally | local run (this audit) |
| Drift gate | `sync --check` **not re-runnable here** (needs `--source <web-daw-clone>`; no upstream clone in this sandbox). State per evidence: UPSTREAM.lock pins upstream web-daw `main@eeb3b24` (syncedAt 2026-09-07T00:41Z); HANDOFF: "Upstream web-daw: NO new commits since our eeb3b24… `sync --check` clean. Upstream porting duty: NONE pending"; worklog S4: "drift-gate clean". **Authority: commit + docs evidence, not re-run.** | `UPSTREAM.lock.json` + HANDOFF/worklog |
| Drift-gate semantics | Since `de09c93` (round B P1) the gate **fails on drift** (changed/copied/missing = violations; success line gates on zero drift) — was exit-0-blind the repo's whole life | commit msg `de09c93`; verified by prior CR |
| Vendored-tree discipline | Manifest: **75 copy + 4 copyRepoRoot + 1 rewrite + 11 shims + 11 coreOwned** (`extraction-manifest.json`). Consumers deep-import the vendored tree through their own `@/lib/daw/*` alias (**the D24e law** — the package barrel `src/index.ts` has ZERO importers today; it is the FUTURE web-daw-migration surface, UPSTREAMING Phase C). Current vendor pins: **nle-engine @ `494f6ff`**, **nle-test-app @ `85b81b0`** (app f166027, "docs-only seal-round wrap; opportunistic fleet freshness") | `git submodule status` (both repos) |
| CI | Claimed green across the fleet at the seal (core 494f6ff 759/759, engine 4bebf43 440/440, ui 98c17ff+ 648/648, app de501ed 118/118) — commit-message evidence; fleet has since moved (engine `5036387` 458/458, app `c885ece` 174/174, app-side R8/R9 rounds, zero WDC code delta) | commit msgs |

**Delta vs R23 baseline:** exactly 1 commit, **docs-only** (4 files, +173/−71): `.agents/SKILL.md`, `HANDOFF.md`, `PLAN.md`, `worklog.md`. Zero code change → 759 held.

---

## 2. THE LANDING LIST since `494f6ff`

**The one commit — `85b81b0` "docs: the seal-round wrap":**
- **PLAN:** S4 (seal round) CLOSED + the *honest remaining ledger* (PLAN.md:343-347) + the M2 checklist gains the sealed W2/S4 context.
- **HANDOFF:** rewritten — headline = the mixer surface next; the 4 deferred test ports; the async pre-retime; the P3 ledger.
- **SKILL §11 — 6 new laws** (SKILL.md:415+): (1) the Bash-output `[m`-mangling law (verify bracket-adjacent bytes with `od -c`/Read — cost an hour of phantom debugging); (2) cross-repo fresh-context audits catch twin-drift (every law landing in one repo needs a grep for its TWIN in every consumer); (3) parallel-stream convergence (take their landed form, keep my pins, UNION differing mechanisms, one idempotence key); (4) rate-domain transforms must divide the FADES (fades timeline-authored, sweep wall seconds — pass fadeIn/r) while the skip-floor stays timeline-domain; (5) `toSorted` breaks the CONSUMER's tsc (ES2023 vs lib target) — copy-sort in vendored trees; (6) mixed patch commands REJECT hostile sub-fields on the write path (loud), read-path clamps own hostile persisted state.

**What the docs reveal about the S4 seal-round content itself (all landed BEFORE `494f6ff`, now first fully documented):** two fresh-context cross-repo audits → 3 P1 + 8 P2 fixed with pins — A1 flattener merged-run TAIL fade-out carry (engine 7c73d2b), A2 adapter retime rate-domain guard consuming the core's `RETIME_RATE_MIN/MAX` identity-bail (W2k pin; UNION with the parallel B-P1-1), A4 clampAuthorFadeToSpan at the flattener twin (3 sites, engine d421446), F1 the el.speed EDIT path live end-to-end (nle-ui b1a183c + app ce57b14), F5 setShuttle routing + ⇧J/⇧L double-fire dead, **W3 the JKL audio half CLOSED** (composed varispeed = element × transport; wall = timeline/r; fades ÷ r; #24 offset law element-domain; the rate-change edge = UNION of store-echo + core-notify, one `lastScheduledTr` key; J = pragmatic silent-reverse; design v1.1 lives **app-side** at `nle-test-app/docs/design-jkl-audio-follow.md` — *not* in WDC's `docs/`, despite HANDOFF's phrasing), F3/F7 dB-law convergence (one field, one law), F13 marker palette, A6 barrel hygiene (`hasMasterChain` dropped — dead export), the app CI-red root cause (bf9be13 React nested-update cascade, 8 red commits isolated to one test). Final opus CR: **SEAL-READY (P3/P4-only)**, R1-R5 all addressed (R1 dedup+reject law+pin, R2 core re-pin, R3 nested-submodule sync, R5 disposeAll key reset). Whole-codebase status: **P3-only**.

---

## 3. THE REMAINING LEDGER (WDC's own stated remaining work)

**Order + wording from HANDOFF "Next-session scope" + PLAN's honest ledger (PLAN.md:343-347):**

1. **The mixer surface (the M2 headline, pure new capability).** Live parametric EQ, reverb sends, per-track inserts, external sidechain ducking (the app's ducking UI is a documented sidecar awaiting it), PDC interplay. **Exists today (the DSP substrate):** `EqEffect` — parametric multi-band (effects.ts:68-120); 17 `EffectNode` implementations incl. convolution reverb (`ir-presets.ts`) and the worklet-backed compressor/limiter/stereo-widener; `ChannelStrip` with insert chains + aux sends (`applyAuxBusGain`) + the §7.3 sidechain topology (`sidechainOutput`/`sidechainInput` taps, `rewireSidechains`, `collectSidechainWires` — channel-strip.ts:63-108); PDC (`computePdcDelays`/`applyPdc`, 1 s cap); master-chain; offline render w/ bounce parity. **Planned:** the NLE-scene → strip live-parameter wiring — today `bridgeSceneSettings` (engine conversions.ts:201-228) materializes defaults/unity + solo + masterBusDb + instrument bindings only (inserts/sends/aux unwired; re-verified). The design must ALSO decide the app-side element `effects` field mapping (bufferKey/eq-bake) or its explicit non-audio contract (audit F6: it is a total audio sidecar today). **Design round FIRST** (the W2 process: v1 → fresh-context audit → v2 → implement → CR).
2. **The 4 deferred upstream test ports.** Bodies: `engine.test.ts`, `engine-metronome-automation`, `engine-param-channel`, `dsp-aux-sends`, `wam-effect.test.ts` — **nle-engine-side ports** against the relocated bridge's composition (`src/lib/nle/bridge/scene-mixer.ts`). TEST-PORT round, light process (1 audit round). **Note: the label says "4" but names 5 files** — carried verbatim in PLAN, HANDOFF, and spec-20 §0:21; none ported yet (engine `tests/vitest/` re-verified — no engine.test/dsp-aux-sends/wam-effect bodies). Off-by-one doc nit.
3. **The async pre-retime queue item.** The adapter's sync WSOLA compute on the play edge is O(span) — 3-min stereo @ rate 0.5 ≈ seconds of jank; fix specced in `docs/design-w2-varispeed.md` §4 (async pre-retime + legacy fallback while pending; lines 223, 319). Coordinate with the parallel stream (ACTIVE on nle-engine).
4. **The JKL audio half** — CLOSED in S4 (W3, above). Residue: **R4** (⇧K is a dead key in the engine world) — a P3 document item.
5. **P3 ledger (optional):** upstream-class notes (latency.ts 0-vs-null, music.ts midiToName edges — belong upstream), F12 (lock-all UI reachability), F9 (preserve-pitch toggle dead — rides a future `retime.maintainPitch` threading), F10/F11 (document the mock/engine clock deltas + the main-video-audio scope), F4 (AV-link port gestures bypass the dispatch expansion).
6. **Long-horizon (M2/M3 unchecked):** waveform peaks from `audio-registry` → opencut-timeline `AudioElement` view (PLAN.md:150-152); WAM hosting for the first custom WASM effect; the instrument-provider seam exercise; M3 tempo-map bridge / stems-re-enter / advanced DSP on the same `EffectNode` + `signalLatency()` contract. Plus **N5 real media decode** (in the honest ledger; app/engine-side; spec-02 §0 carries it as the r4 decode-worker row).

**NLE-facing seams — what the app consumes TODAY** (grep-verified deep-imports through consumers' own `@/lib/daw/*` alias into the vendored tree):
- **nle-engine bridge (5 files):** `types` (type-only: EffectInstance/InstrumentType/Track) · `engine-handle` (type EngineHandle) · `master-chain` (buildMasterChain, allocAnalyserArrays) · `meter-tap` (createEngineMeterTaps + types) · `channel-strip` (ChannelStrip) · **`offline-engine` (createOfflineEngine — the app's offline-render path: SceneMixer → ChannelStrips → OfflineAudioContext)** · `effects` (createEffect, EffectNode) · `model/tempo-map` (beatToSeconds, getBpmAtBeat) · `model/location` · **`varispeed` (retimeChannels, RETINE_RATE_MIN/MAX — the adapter's pre-retime branch)**.
- **nle-test-app `audioService.ts`:** `types` (EffectInstance) · `effects` (defaultEffectParams) · **`channel-strip` (collectSidechainWires — the U9 realtime duck-wire rewire, sever-then-connect)**. The app does NOT import varispeed/soundtouch directly — it reaches retime through the engine bridge. The `web-daw-core/test-harness` package export is consumed by nle-engine's vitest.

**The waveform-data seam contract question (spec-20 §0:25 — "K3's HARD prerequisite", owner WDC, acceptance "the contract stated + pinned WDC-side"):** **Nothing stated or queued at session level.** WDC's answer today = the unchecked long-horizon M2 bullet (PLAN.md:150-152: "peaks→view data flow is wired nle-engine-side — the S-layer data contract") + the de-facto API already shipped: `audio-registry.ts` exposes `getAudioBuffer`/`setAudioBuffer`/`getPeaks`/`setPeaks`/`computePeaks(buffer, buckets) → {min,max: Float32Array, buckets}` (lines 24-74). No design doc, no contract statement, no pins, and **the item is absent from HANDOFF's next-session scope** — the K3 dependency edge lives only in the spec's plan, not in WDC's own queue. This is the sharpest spec↔repo queue mismatch found.

---

## 4. THE QUEUE (WDC's own next-step list, in order)

1. **The mixer surface** — design round FIRST (W2 process), incl. the el.effects sidecar decision (F6). (HANDOFF #1)
2. **The 4 (sic, 5 named) deferred upstream test ports** — nle-engine-side, light TEST-PORT round. (HANDOFF #2)
3. **The async pre-retime** — per design-w2 §4; coordinate with the parallel stream (ACTIVE on nle-engine). (HANDOFF #3)
4. **P3 ledger (optional)** — upstream-class notes, F12, F9, F10/F11, R4, F4. (HANDOFF #4)
5. Standing: fetch-before-every-push (parallel-stream convergence); upstream sync routine whenever web-daw moves (none pending); every session ends HANDOFF/PLAN/SKILL/worklog updated + pushed; gates = `bun run test` + `bunx tsc --noEmit` + `sync -- --check`.
6. Long-horizon parking lot: waveform peaks contract, WAM hosting, instrument-provider exercise, M3 convergence, upstream adoption Phases B bootstrap-PR / C.

---

## 5. CENSUS FACTS

- **`src/lib/daw`: 71 files** = 55 non-test `.ts` + 15 `.test.ts` + 1 data (`data/sample-catalog.json`).
- **Test files: 33 `.test.ts` total** (15 in `src/lib/daw/**`, 18 in `src/test/**`) — matches vitest's "33 test files / 759 tests" exactly. `src/test/` = 25 files (harness: real-audio-harness, audio-compare, webaudio-mock, idb-mock, fft-analyzer, setup, index…).
- **LOC:** `src/lib/daw` non-test **16,224**; `src/lib/daw` tests **5,726**; `src/test` **6,895**; **total `src` ≈ 28,967**.
- Manifest: 75 copy + 4 copyRepoRoot + 1 rewrite + 11 shims + **11 coreOwned** (index, meter-tap, soundtouch, varispeed, test/index, 5 test files, setup). Public worklets: 3 (`public/worklets/dsp-effects-worklet.js`, `biquad-processor.js`, `capture-worklet.js`); the varispeed worklet registers via blob-URL (no asset).
- Zero runtime deps; devDeps: typescript, vitest, jsdom, web-audio-api, @types/node; engines node ≥24; license UNLICENSED (private) + COPYING.LESSER/THIRD_PARTY-NOTICES riding the LGPL SoundTouch port.

---

## 6. SPEC-FACING STALENESS (spec-20 + spec-02 §0 vs repo truth; read-only, listed not fixed)

From **`nle-core-spec/20-audio-core.md`** (§0 lines 12-32 + status line 4):

1. **Stale pins (line 4 + §0:15):** "WDC 759/759 @ `494f6ff`… consumed @ `f446512` — BOTH consumers, one docs-only commit behind HEAD." Superseded: HEAD `85b81b0` (docs-only; 759 re-verified locally), and the consumers have DIVERGED — engine vendors `494f6ff`, app vendors `85b81b0` (app f166027). Zero code delta, so substance holds; pins/wording stale. Same for the fleet pins (line 4: engine `b8c6f88`/440, app `70e99f0`/117 → now engine `5036387`/458, app `c885ece`/174).
2. **Missed event (§0 BASE, line 15):** the **S4 seal round is entirely unrecorded** — the spec's last recorded WDC event is W2/whole-CR (`de09c93`). The seal (2 cross-repo audits → 3 P1 + 8 P2 pinned; SEAL-READY P3/P4-only verdict; the honest ledger; SKILL §11) and the "seal queue CLOSED" posture are the round's headline and absent.
3. **Mis-scoped claim (§0:20):** "external sidechain ducking… `collectSidechainWires` exists in the engine." The helper is **WDC's** (`src/lib/daw/channel-strip.ts:63`); grep-verified **zero uses in `nle-engine/src`** — its only consumer today is the **app's** `audioService.ts:56` (the U9 realtime duck-wire rewire). The engine-side sidechain wiring does not exist yet.
4. **Queue mismatch (§0:25, the waveform seam contract — K3's HARD prerequisite, owner WDC, "acceptance: the contract stated + pinned WDC-side"):** WDC has nothing queued at session level — only the unchecked M2 bullet (PLAN.md:150) and the de-facto `getPeaks/setPeaks/computePeaks` shape (audio-registry.ts:48-74). The K3 edge is carried by the spec's plan alone; WDC's HANDOFF queue does not carry it. (The strongest staleness row — a spec-critical dependency invisible to the owning repo's queue.)
5. **Carried off-by-one (§0:21):** "the 4 deferred upstream test ports" names **five** bodies (engine / engine-metronome-automation / engine-param-channel / dsp-aux-sends / wam-effect); none ported (re-verified in `nle-engine/tests/vitest/`). The miscount is now canon in spec AND repo docs.
6. **Confirmed-current rows worth keeping (not contradicted):** §0:22 (bridgeSceneSettings = unity/solo only — re-verified at conversions.ts:201-228, now + masterBusDb/instrument bindings), §0:24 (async pre-retime, WDC design contract — design-w2 §4 confirmed at lines 223/319). Spec-02 §0's "app public/ is empty today — verified R23" **still true** (app `public/worklets` absent, re-verified) — the worklet-asset row stands.

From **`02-workers-threading.md` §0** (same class): WDC pin `494f6ff` (line 14) one docs-commit behind HEAD; engine's vendor line "WDC @ `f446512`" now `494f6ff`; the W2/W1/worklet-serving BASE description itself remains accurate (EqEffect, rate domain, blob-URL venue, LGPL files — all re-verified).

---

**Bottom line:** WDC at `85b81b0` is a sealed, P3-only, 759/759-verified pure audio core with zero upstream drift and zero pending porting duty. Its own ledger is honest and short: the mixer surface (design-first), the 4(=5) test ports, the async pre-retime, then P3s. The one spec-critical exposure: **the K3 waveform seam contract is a spec-side prerequisite with no WDC-side queue presence** — it should be surfaced into HANDOFF (or the spec's dependency re-based) next round.

# Test-scout: nle-engine demonstrated test practice (R28-T1-a)

**Repo:** `/home/z/my-project/nle-engine` — main @ HEAD `074a2f6`, census code anchor `74bef08` (verified: tests/ byte-identical between the two). Read-only scout; the repo tree was restored clean after the live run (submodules left unmaterialized, `git status` empty).

**Mission:** extract the demonstrated patterns by which this repo achieves programmatic rigor for NLE features that are hard to test through regular frontend flows — the pattern library the spec-side test-law design (T2) instantiates per new functional area.

---

## §1 The suite-family census (LIVE counts)

**Method note (the census trap):** static `grep -c '^\s*it('` yields **665** across the 25 files — the true number is **749**, because the two table-loop families register `it()` dynamically inside `for` loops (locked-track: 38 loop-registered; nan-guard: 31 textual its expand ×3 hostile values). Live verification: `bun install --frozen-lockfile` + `git archive` of the pinned submodule SHAs (`ec8fd5c` wdc / `6e2b91a4` ot — neither fetchable over the network) + `vitest run` → **`Test Files 25 passed (25) / Tests 749 passed (749)`** (59.5s wall). `vitest list` enumerates the same 749. No `it.each`/`test.each` anywhere — dynamic registration is hand-rolled so row names land in runner output and stay greppable.

The census pin "Engine 749/749 @ 74bef08" (repo worklog:5824) is CONFIRMED at HEAD 074a2f6.

| Family group | File | Tests (runner) | What it pins |
|---|---|---|---|
| **timeline-edit-op law fleets** | engine/timeline-locked-track.test.ts | **49** (38 table + 11 static) | N3/F1c locked-track op-gate + §5.0 lock>link closure |
| | engine/timeline-nan-guard.test.ts | **78** (31 textual, ×3 hostile loops) | N4/F1c non-finite no-op/throw laws |
| | engine/timeline-mode-clamps.test.ts | 20 | F5 preservation clamps (ROLL-2/N6/G3) |
| | engine/timeline-edit-ops.test.ts | 13 | R1-B4 transition-blocked-split abort |
| | engine/timeline-linked-source-edit.test.ts | 13 | E1/E2 linked insert/overwrite companion laws |
| | engine/timeline-relink-fixes.test.ts | 11 | F6/H2-A relink per-group regression pins |
| **math/kernel oracles** | engine/planner.test.ts | 52 | cut-centered window geometry, curves |
| | engine/timeline-math.test.ts | 42 | the shared frame-bridging kernel |
| | engine/transform-resolver.test.ts | 40 | affine parenting, hand-multiplied |
| | engine/video-sync.test.ts | 31 | drift-correction pure plans + constants |
| **bridge-seams law pins** | engine/bridge-seams.test.ts | **151** | N1-N4/W2.5/F2/R1-R3/S3/P1/OV/AR-2/AW1-3 seam laws |
| **DSP triangle (real audio)** | nle-bridge.test.ts | **99** | H9-H18 scene→segments→mixer, content-verified |
| | nle-bridge-realtime-midi.test.ts | 8 | H18e/f realtime half via recording provider |
| | m2-wave1-mixer-surface.test.ts | 10 | F-1/F-2 Wave-1 mixer parity laws |
| **upstream port disposition** | upstream-ports.test.ts | 25 | G1: every upstream it() filed |
| **persistence/load** | engine/load-validation.test.ts | 33 | the load-time warning finders |
| | engine/persistence.test.ts | 25 | migrations, defensive-clean warnings |
| | engine/undo-serialize.test.ts | 15 | S1-S5 undo/serialize consistency |
| **GPU-degradation & resource lifecycle** | engine/render-abort.test.ts | 9 | AbortSignal plumbing (mock adapter) |
| | engine/audio-codec-ladder.test.ts | 5 | HW1-8 codec-ladder twin parity |
| | engine/media-registry.test.ts | 5 | HW1-4 auto-id collision + epoch |
| | engine/stable-video-grouping.test.ts | 5 | HW1-10 scale/call-form law |
| | engine/mask-manager-view.test.ts | 4 | HW1-5 transient-slot texture lifecycle |
| | engine/compositor-clear.test.ts | 3 | HW1-6 degraded-capability clear |
| **freeze census** | engine/api-surface.test.ts | 3 | A5/D9 barrel export freeze (453 names) |
| | | **749** / 25 files | |

Non-vitest verification surfaces (CI, same repo): `tsc --noEmit` job · the vitest job also runs **9 engine-only bun probe scripts** (probe-p114-undo — the 318-check undo sweep, p2s, fxa, crb, crc, fx2, fx4, rb-p1, m30-fixture; all exit non-zero on failure) · `node scripts/lint-layering.mjs` — the layer fence against `gaps/audit/LAYER-SNAPSHOT.txt` (**52 edges** live) · the OV-12 `vendored-timeline` job (re-pin gate) · the full browser milestone suite (Playwright + Xvfb + SwiftShader WebGPU — the slow venue, ~280 milestone tests, NOT part of the 749).

---

## §2 The pattern library

Each pattern: name · definition · canonical cite · what class of NLE feature it is FOR.

### P1 — HAND-DERIVED ORACLE (math vs implementation)
The expected values are computed by hand from the documented formula/contract — **never copied from the module's output** (the anti-tautology law). The oracle lives in the test file as literal arithmetic, so a regression in the formula itself cannot pass.
> `tests/vitest/engine/timeline-math.test.ts:32-33` — *"Engine-only: no GPU / WebAudio / browser. Every expected number is hand-derived from the documented formula, not copied from the module."* (same sentence at planner.test.ts:65-66; transform-resolver.test.ts:9-12 pins module-private affine primitives **through the exported API**: "every composition below was hand-multiplied on paper from the documented M = T(x,y)·R(θ)·S(w,h)").

FOR: pure kernels — keyframe interpolation, marker/range geometry, edit-domain arithmetic, caption timing. The rule that keeps it honest: no test-only exports; pin private math through the public surface.

### P2 — PARITY-TWIN / ONE-LAW-BOTH-VENUES
The same law is proven at both sides of a seam (realtime vs offline, engine vs vendored, player vs export), either by asserting both call the SAME shared helper or by rendering both paths and comparing content. This is how "the duck the user hears is the duck the user exports" becomes a test.
> `tests/vitest/m2-wave1-mixer-surface.test.ts:14-21` — *"F-2 THE PARITY LAW (the round's P1): sidechain wires are collected … and connected INSIDE materializeStrips — the one fold both consumption paths build through, so the duck the user hears (realtime monitor) is the duck the user exports (offline render)."* And `bridge-seams.test.ts:1475-1484` — *"player↔export parity by construction: both venues call the SAME helper … a future 'fix' that re-inlines one venue's clamp trips THIS test."*

FOR: NS-4 bridge adapter (engine scene vs OT scene), linkage closure (engine expansion vs OT pairwise field), any export/monitor duality.

### P3 — TABLE-LOOP (dynamic it-registration per row)
A fixtures table (`{name, expected, run}` rows) is driven by a `for` loop that registers **one `it()` per row**, so every row is independently reported, individually skippable, and counted by the runner. The assertion body is shared and uniform.
> `tests/vitest/engine/timeline-locked-track.test.ts:185-199` — `for (const row of rows) { it(\`${row.name}: throws the typed error and commits NOTHING…\`, () => { … expect(() => row.run(f)).toThrow(\`[Timeline] ${row.expected}: track … is locked\`); …})}` — 38 rows (the live count at 074a2f6; the earlier census's "39" is stale by one), 49 runner tests total.

FOR: error-envelope conformance (one row per verb × condition), edit-op law fleets (one row per op), constants grids. This is the repo's workhorse for "every X must Y" laws.

### P4 — REFERENTIAL-IDENTITY NO-COMMIT assertion
For rejection/no-op laws, the strongest available "nothing happened" check is object identity: every mutation path replaces `_data` with a new reference, so `expect(tl.data).toBe(before)` proves **zero** commit funnels — stronger than deep-equality, cheaper than snapshot. Always paired with `canUndo()` unchanged (no undo entry).
> `timeline-locked-track.test.ts:194-198` — *"expect(f.tl.data).toBe(before); // No commit funneled through _commit → the data reference is THE SAME object (the strongest 'nothing happened' assertion available"*. Same trio at `timeline-nan-guard.test.ts:77-79`.

FOR: any op-gate (locked tracks, linkage rejection, hostile patches), error-envelope side-effect-freedom clause.

### P5 — TWIN-EQUALITY DRIFT FENCE (adapter ≡ vendored leaf)
The test itself value-imports the **vendored PURE leaf** and asserts the engine's adapter/clamp/constant is equal to upstream over a census grid — interior + both bounds + documented dead zones + the hostile family. If upstream moves, the pin fails BEFORE the twins drift apart.
> `bridge-seams.test.ts:2286-2297` — *"P1 twin-equality: clampOpencutRetimeRate ≡ opencut clampRetimeRate (the drift fence) … const GRID = [-3, 0, 0.001, 0.01, 0.02, 1/32, 0.5, 1, 3.2, 5, 5.0001, 10, Number.NaN]; … expect(clampOpencutRetimeRate(rate)).toBe(clampRetimeRate({ rate }))"*. Ticks fence at :2317-2331 (`OPENCUT_TICKS_PER_SECOND` ≡ upstream, plus 120_000 literal), volume-dB one-home at :2359-2415, fade-curve twins at :2536+.

FOR: **edit-domains constants (A2) — this is the literal template** (OV-01/OV-02 already pin retime + volume-dB); NS-4; any vendored-leaf consumption.

### P6 — CONSTANT-LITERAL pin
Law values pinned as literals (not `expect(X).toBe(Y-constant-from-the-same-module)`) so a semantic change upstream fails loudly and forces **conscious absorption** (SKILL law 82).
> `video-sync.test.ts:50-59` — `expect(VIDEO_BEHIND_DEBOUNCE_MS).toBe(80); …` (nine thresholds, "freecut parity"). `bridge-seams.test.ts:2371-2377` — *"the law is documented as literals: [−60, +20], non-finite → 0 (the DEFAULT fold)"*.

FOR: the constants-module lattice (A2), every tolerance/threshold the spec names.

### P7 — HOSTILE-INPUT FOLD family (never-poison)
NaN / ±Inf / negative / wrong-typed inputs are swept through every fold with an explicit disposition law per family: clamp-to-domain, fold-to-unity, read-as-absent, DROP the poisoned span (neighbors intact), or hostile-THROW. The disposition is itself pinned (which of the five applies is the law).
> `bridge-seams.test.ts:2168-2185` — *"a NaN/negative durationSec source is DROPPED — no segment, no poisoned span, neighbors intact … sandwiched between valids → the valid neighbors still emit"*; nan-guard's whole file (the no-op law vs the throw law, :17-23).

FOR: error envelope + guards research; every new input surface (marker frames, caption times, keyframe values).

### P8 — REGRESSION-PIN-PER-NAMED-BUG
Every audit finding/fix lands as a pin whose describe/it names the bug ID; the header documents the PRE-FIX damage ("was: from=0/dur=1") and the fixture reproduces the audit's live probe, so the pin is provably discriminating (the gates-must-fail law: with the pre-fix form the assertions fail).
> `timeline-relink-fixes.test.ts:5-12` — *"H2-A-1 [P1]: `_performInsertEditImpl`'s ≥2-splits relink was GLOBAL across linked groups — two straddling companions from DIFFERENT groups landed on SHARED fresh L/R groups (cross-group contamination…) Fix: per-group relink"*. Discrimination law stated at `m2-wave1-mixer-surface.test.ts:28-31` — *"every pin is proven against the pre-fix form (the gates-must-fail law)"*.

FOR: every R28-ruled fix (the four absent families, linkage closure bugs, D48/D49 landings).

### P9 — SHARED LAW-BATTERY helper
One exported validator (often the engine's own) is wrapped into a failures-list helper reused by every pin in the family — the invariant is written once and swept, not re-encoded per test.
> `timeline-mode-clamps.test.ts:54-60` — *"The transition-law battery every pin shares: a SURVIVING transition must satisfy the engine's own handle validator (validateTransitionHandles) AND addTransition's creation law … Returns the failure list so pins can print it."* (Same shape: `hasOverlap`/`spans` helpers duplicated across the edit-op fleets.)

FOR: markers (one battery: range law + scene bounds), captions (kind-filter battery), linkage (closure-shape battery).

### P10 — SNAPSHOT-vs-DERIVED round-trip idempotence
Undo/persistence machinery is tested by serialized-equality algebra, not by internal state: `serialize→hydrate→serialize` byte-stable; `base+edit+undo ≡ base (serialized)`; the cap law lands on the state that survived.
> `undo-serialize.test.ts:13-15` — *"S3 undo-state consistency (THE T8 law): base + edit + undo ≡ base (serialized); base + edit + undo + redo ≡ base + edit (serialized)"* (test at :192-209); persistence P4 normalize idempotence (:19-20).

FOR: flat keyframes / markers / captions persistence + their undo behavior (S2: idempotence after edit storms + undo-all).

### P11 — CONTENT-VERIFIED REAL-DSP oracle
Where audio is reachable in Node, the oracle is physical: deterministic sine buffers → real OfflineAudioContext render (web-audio-api = real kernels) → per-window `rms()` and FFT dominant-frequency checks against the authored frequency. The render harness is one shared full-triangle fixture function.
> `nle-bridge.test.ts:509-515` — `expect(Math.abs(findDominantFrequencyInRender(dialogueWin, SAMPLE_RATE) - 440)).toBeLessThan(5)` (imported from `web-daw-core/test-harness`); `makeSine`/`rms`/`renderFixture` harness at :146-198; cold-render budget law at :77-81 (*"Generous per-test timeout, not a global one — keeps the budget honest"*).

FOR: keyframed gain automation, caption/audio burn-in mixes, NS-4 where DSP is reachable.

### P12 — CTX-STUB CALL-ORDER recording (raster without pixels)
jsdom has no Canvas2D, so painting is pinned by a hand-rolled ctx stub that **records every call as a string** (`clear:0,0,1000,500`, `img:IMG:0,-250,1000,1000:0.5`, `filter:blur(12px)`) — order, geometry, and alpha are asserted from the log; state assignments (font/fillStyle) asserted on the stub.
> `bridge-seams.test.ts:696-718` — `function stubCtx(w,h): CanvasRenderingContext2D { const calls: string[] = []; … drawImage: function(…) { calls.push(\`img:${(img as {id:string}).id}:…:${this.globalAlpha}\`); } …}`; used at :932-946 (*"cleared + black-filled … cover-fit … alpha rides the call"*).

FOR: **caption burn-in**, preview painting, any canvas-consuming feature. Complements the pure/raster split (P13).

### P13 — PURE-MATH EXTRACTION (build vs paint split)
Rendering features are split so the fast venue can pin them: `buildCompositionFrame` returns a **data op-list** (dest rect, alpha, sourceSec, z-order — oracle-testable math) while `paintCompositionFrame` is a thin raster layer pinned only via P12 + the documented null-ctx no-op.
> `bridge-seams.test.ts:926-930` — *"N1 seam: paintCompositionFrame (the thin raster layer) … 'null ctx (jsdom without canvas) is a documented no-op — never throws'"*; the build side's op-shape oracle at :721-739 (*"Z-ORDER: main paints first, then overlays reversed"*).

FOR: every visual feature (caption layout, marker lanes, keyframe-driven transforms) — design the feature with a pinnable data core.

### P14 — FAKE-DEVICE / DEGRADATION pin
GPU/WebGPU objects are faked to the minimum shape (flag values on globalThis; bookkeeping stubs for createTexture/destroy; `createRenderPipeline` that THROWS for a selected label) so degradation paths (pipeline-missing clear, resource lifecycle, one-slot transient accounting) are testable without a GPU.
> `compositor-clear.test.ts:42-60` — *"Fake-GPU device (the probe-fxa pattern): createRenderPipeline THROWS for the blit pipeline only (label match) → _blitPipeline stays null …; beginRenderPass records every color attachment (view + loadOp + clearValue)"*; mask-manager-view pins create/destroy **accounting** (steady-state one-live-output) while jsdom's getContext throws harmlessly.

FOR: resource-lifecycle laws of any GPU-adjacent feature (caption textures, marker glyphs).

### P15 — MOCK-SEAM INVERSION (real core, mocked edge)
The unit under test is real; exactly one environmental seam is module-mocked with a recording fake: render-abort uses a **mock RenderAdapter** (typed call log: compositionCalls/audioCalls/gpuProbes) to pin the real headless API's AbortSignal plumbing; audio-codec-ladder mocks **mediabunny** (encodable set + constructed-source log) around the real adapter.
> `render-abort.test.ts:5-6` — *"This suite pins the plumbing with a MOCK RenderAdapter (engine-only — the real adapter needs GPU/mediabunny, browser-pinned…)"*; `audio-codec-ladder.test.ts:12-14` — *"the REAL createRenderAdapter.renderAudioOnly with the browser seams faked (the render-abort suite's mock-adapter pattern inverted — here the adapter is real, mediabunny + the bridge mixdown are mocked)"*.

FOR: **NS-4 bridge adapter**, export paths (SRT/ASS/VTT granularity per language), headless API surfaces.

### P16 — PORT-DISPOSITION census (every upstream it() honestly filed)
When porting tests across a seam/repo, a disposition table files EVERY source test as PORTED (with "PORTS:" header at the test) / NOT-PORTABLE (with the machinery reason) / ALREADY-COVERED (with the covering pin's cite) — zero silent drops.
> `upstream-ports.test.ts:22-24` — *"DISPOSITION TABLE — every upstream it(), honestly filed. PORTED items carry a 'PORTS:' header comment at the test; counts at the bottom."* (rows like :43-46 *"disposeTrack removes the strip … ALREADY-COVERED (CR-A #4 …)"*).

FOR: **the r1 OT port of linkage** (D42 rider 8's "the ported pins re-keyed to the pairwise field" is exactly this pattern), any vendored-suite absorption.

### P17 — API-SURFACE FREEZE census
The public barrel's runtime export set is compared to a committed frozen list; additions require updating the list in the same commit, removals require a DECISIONS entry. Type-only exports excluded (tsc is their gate). Regeneration is a script, run only for conscious moves.
> `api-surface.test.ts:21-24` — *"it('the barrel exposes exactly the frozen export set (453 names)', () => { const live = Object.keys(barrel).sort(); expect(live).toEqual([...FROZEN_API_SURFACE]); })"*.

FOR: any new family joining the engine barrel (caption track APIs, marker v2, flat-keyframe surface).

### P18 — CALL-FORM pin (law-parity polish)
When the true behavioral failure is not CI-viable (a 200k-argument `Math.min(...spread)` stack blowup), the pin spies on the built-in and asserts the **call form** (argument counts stay bounded AND the loop demonstrably ran) — implementation-shape law as a proxy, with the residual (O(n²) scan) honestly registered.
> `stable-video-grouping.test.ts:39-49` — *"SCALE LAW: the group bounds are computed by a LOOP — no unbounded Math.min/max spread call (F2-7 parity) … A literal 200k-item group is not CI-viable … so the pin detects the unbounded-spread CALL FORM directly"* (widest ≤ 4096 args, >19k calls).

FOR: scale/DoS-class laws where the behavioral demo is impractical.

### P19 — ERROR-ENVELOPE conformance
Typed errors are pinned by exact message shape (`toThrow('[Timeline] <op>: track <id> is locked')` — the op name IS the contract), by error-class identity (DOMException name 'AbortError' for cancellation), and by message-content laws (the codec-ladder error must name all four candidates). Warning envelopes are pinned by code set + ordering.
> `timeline-locked-track.test.ts:191-193`; `render-abort.test.ts:8-11` — *"pre-aborted signal on renderTimeline → DOMException('Render cancelled','AbortError') thrown BEFORE any adapter call (fail fast: no GPU probe, no validation, adapter never touched)"*; `persistence.test.ts:14-18` (CLIP_TRACK_MISSING / TRANSITION_CLIP_MISSING / CLIP_DURATION_CLAMPED / KEYFRAME_ORPHAN_PRUNED).

FOR: **the R28 error envelope directly** — verb × condition × message × side-effect-freedom, driven by P3's table.

### P20 — WIRING PROOF (the leaf actually feeds the seam)
Equality pins prove the law is right; a wiring spot-check proves the law is *connected* — the consumer's output is computed through the imported leaf, not a coincidentally-equal local copy.
> `bridge-seams.test.ts:2333-2345` — *"the bridge consumers read element times through the SAME law (flattener spot-check) … this is the wiring proof that the leaf actually feeds the seam (not just that the leaf is correct)"*; cross-module coherence at :990-1004 (preview default ≡ registry declared default ≡ render packUniforms fallback — three sites, one value).

FOR: constants-module consumption (A2), one-home laws.

### P21 — EPOCH/VERSION bump pin
Cache-invalidation surfaces carry a version counter whose bump conditions are pinned (new registration, overwrite, clear; stable when nothing mutates) so downstream GPU caches can detect re-registration.
> `media-registry.test.ts` (R4, header :19-21) — *"the registration epoch (`version`): bumps on new registration, on same-id overwrite, and on clear(); stable when nothing mutates."*

FOR: caption-track re-render invalidation, marker/lane caches.

---

## §3 The jsdom/Node constraint laws

1. **Venue config** (`vitest.config.ts:19-26`): `environment: 'jsdom'`, `css: false`, **`maxWorkers: 1, minWorkers: 1`** (serial — audio renders hit ~1.8 GB anon-rss per worker), **NO setupFiles** — each suite builds its own contexts explicitly (no DOM, no global mock AudioContext; the m2-wave1 exception patches `globalThis.AudioWorkletNode` locally, :41-46, because web-audio-api's worklet is the REAL one).
2. **Alias law** (`vitest.config.ts:27-61`): Vite aliases are INSERTION-ORDERED (unlike tsconfig longest-prefix) — vendored deep paths first, the `opencut-timeline` **regex** subpath form before the bare barrel (the string-find prefix-match hazard), the host `@` LAST.
3. **Canvas2D is absent** — jsdom's `getContext()` throws "Not implemented" (observed live in mask-manager stderr). Consequences: the painter's null-ctx no-op law (P13), the ctx-stub call-order pattern (P12), and lifecycle-accounting-only pins for texture managers (P14). No `canvas` npm package is installed; pixels are NOT verified in this venue.
4. **WebAudio is REAL via `web-audio-api`** — OfflineAudioContext runs real kernels/worklets (first render pays ~13s graph-processor compilation; per-test 30s timeouts, never global; serial workers). A **live** AudioContext is infeasible in Node (currentTime never advances) → realtime surfaces are pinned by RECORDING provider instruments + offline⇄offline parity (`nle-bridge-realtime-midi.test.ts:8-15`).
5. **WebGPU is absent** — fake devices carry only the flag values on globalThis; render passes are recorded, selected pipeline creation is made to throw to force degradation paths (P14).
6. **The two-venue law (SKILL law 51)** — every law is pinned in the FAST venue (vitest, pure data/oracle assertions) whenever the feature has a pinnable pure core; the SLOW venue (browser milestone suite: Playwright + Xvfb + SwiftShader WebGPU) is reserved for pixel/DOM/real-mouse laws. The 4GB sandbox cannot run the slow venue (CI header: 6 of 7 attempts died browser-first) — it lives only in GitHub CI (16GB runners), with private submodules materialized via an authenticated URL-prefix rewrite.
7. **Probes as a third venue** — engine-only bun scripts (`scripts/probe-*.ts`, 9 of them in CI) run check-counter harnesses (pass/fail console + non-zero exit; one gated by grep on output because it lacks its own exit check). Used for sweeps too big or too stateful for vitest (the 318-check undo wrap census).
8. **Headless op testing = data ops, no gestures** — edits/gestures are tested as pure Timeline method calls (split/trim/move/slip/…) with span/overlap/undo assertions; there is no mouse anywhere in the fast venue. The browser suite's "real-mouse phases" (OV-12 gate) are the only true gesture tests, and they live in the vendored tree's own suite.

---

## §4 Applicability map (pattern → R28-ruled area)

| R28 area | Primary patterns | Why / instantiation sketch |
|---|---|---|
| **Linkage closure** (pairwise field + closure + four base-verb laws) | **P3 table-loop** (per-verb rejection + closure rows), **P4 no-commit trio**, **P8 regression pins** (H2-A relink-fixes is the direct precedent — per-group relink, straddler split, re-pair by surviving index), **P5 drift fence** (engine expansion ≡ OT pairwise field), **P16 port-disposition** for the r1 OT port re-key | One table per base verb (delete/rippleDelete/split/duplicate/move): rows = target/companion/locked/hostile shapes; assertion trio = typed error or closure-shape + `data` toBe + canUndo; plus the lock>link closure battery (locked-track:245+ is the template). |
| **Edit-domains constants (A2)** | **P5 twin-equality drift fence** (OV-01/OV-02 are the literal template), **P6 constant-literals**, **P20 wiring proof**, **P7 hostile folds** | Four retime domains + volume-dB one-home: for EACH domain, a grid (interior + bounds + dead zones like [0.01,0.02,1/32] + NaN/±Inf) asserting engine clamp ≡ owning module, literals for min/max/default, and a consumer spot-check that the flattener/bridge reads through the leaf. |
| **Error envelope** | **P19 conformance** driven by **P3 table-loop**, side-effect clause via **P4** | The table's columns become: verb × input class → exact typed message (op name embedded) × commit/no-commit × undo-entry. render-abort's DOMException contract is the shape template for transport-level errors; persistence's warning-code set is the template for load-time degradation (ordered codes, strict-mode throw). |
| **NS-4 bridge adapter** | **P15 mock-seam inversion**, **P2 parity-twin**, **P11 content verification** where DSP reachable, **P16 disposition** for anything ported from WDC | Real adapter logic + faked DSP/buffer seams (recording fakes); one-law-both-venues for realtime vs offline folds; offline⇄offline parity where a live ctx is infeasible. |
| **The four absent families** (append / fit-to-fill / ripple-overwrite / replace) | **P8 named regression pins** (each family lands like relink-fixes: fixture + 4-postcondition pin + no-overlap helper + P9 transition battery), **P1 hand-derived geometry**, **P10 undo algebra** (one undo entry per composite — the nested-op single-step law from probe-p114) | Each family = one file, header filing the spec law + pre-fix absence, fixtures with full-SourceRef headroom (planner's "laws 3/42 trap" fixture law, planner.test.ts:68-70), shared `spans`/`hasOverlap`/transition battery helpers, undo-entry counts asserted. |
| **Flat keyframes** | **P1** (planner F-series curve values, transform-resolver N-series lane interpolation — linear mid, hold easing, vector-over-scalar override), **P10** (keyframes survive serialize/undo storms — undo-serialize's rich fixture already carries scalar+vector lanes), **P5** if a vendored lane kernel is adopted | Hand-derived interpolation values at boundaries (first/cut/last frame; progress never reaches 1 in-window); lane-merge/override discrimination; hostile values (NaN db → unity) via P7. |
| **Markers (D48)** | **P7** (timeline-nan-guard:13-15 already documents the pre-fix NaN marker persisters — extend to the v2 range law), **P1** for `end = time + duration` geometry + scene-bounds clamp, **P9** one range-law battery, **P10** serialize idempotence, **P21** if lanes cache | The NaN-guard addMarker/updateMarker hostile-throw rows exist TODAY — the v2 pin set extends them with duration/notes fields and the keep-and-display-clamp law. |
| **Captions (D49)** | **P13 pure/build split** (caption layout as data ops; burn-in as the thin raster), **P12 ctx-stub** for the burn-in pass, **P15 mock-seam** for per-language SRT/ASS/VTT export granularity (audio-codec-ladder template: real exporter + faked encoders), **P17 api-surface freeze** regeneration for the new track APIs, **P3 table** for the mode-matrix (text membership decides — shape ops apply, source-window ops don't) | The N1 buildCompositionFrame op-shape oracle ("audio elements NEVER produce ops" :756-759) is the exact template for the caption kind filter in `elementAtTime`; lane-position/z-order pins extend the z-order test (:736-739). |
| **Cross-cutting: any new family joining CI** | **P17 freeze census** update in the same commit, layer-fence snapshot update with rationale if a new import edge appears, OV-12-style re-pin gate if a vendored leaf moves | The non-behavioral law stack (below) is part of every landing. |

**Non-behavioral law pinning (the repo's fence stack):**
- `tsc --noEmit` as its own CI job (types are the gate for type-only exports).
- **Layer fence**: `scripts/lint-layering.mjs` diffs the live cross-layer import-edge set against `gaps/audit/LAYER-SNAPSHOT.txt` (52 edges live) — new upward edges fail until the snapshot moves in the same commit WITH a rationale; deliberate inversions are annotated inline (header: "an edge may ONLY be added/removed in the same commit that changes the import AND with a rationale").
- **API freeze**: P17 (a vitest test, not a lint — runs in the ordinary suite).
- **OV-12 vendored-timeline re-pin gate**: a dedicated CI job that detects gitlink movement of `vendor/opencut-timeline` in the push range (fail-safe: unknown before-sha/non-push → verify) and then runs the VENDORED tree's own full suite (headless Chromium, Canvas2D/DOM, no WebGPU) — closing the gap where a re-pin could land a red vendored tree nobody ran. The engine's own twin fences still run on every push (ci.yml:205-216).
- **Probe exit-code discipline**: probes self-abort non-zero; the one that doesn't is text-gated with pipefail (ci.yml:135-138).

---

## §5 What the repo does badly or avoids (honest limits)

1. **No pixels in the fast venue.** The 749 never verify a rendered pixel — compositor/effects/tran­text rendering truth lives in the browser milestone suite, which the sandbox cannot run at all (and which is NOT counted in any suite-count pin). GPU effects correctness rests on the slow venue + registry coherence pins (P20's three-site value equality).
2. **Static censuses undercount.** 665 textual `it(` vs 749 runner tests — any future suite-count battery MUST count via the runner (`vitest list`/`run`), not grep. (This task's live re-run is the demonstration.)
3. **The op-gate table is curated, not derived.** The locked-track fleet covers 38 rows because someone wrote them; a NEW mutating op that forgets the lock guard would only be caught if a row is added — there is no mechanical census of Timeline's mutating surface (the H1-A audit found exactly this class of hole originally). Same shape for the NaN fleet. T2 should consider deriving the row set from a registered op list (the api-surface freeze proves a derived-census is possible).
4. **No property-based/randomized generation.** Every fixture is hand-authored; "property" laws are expressed as enumerated grids + loop sweeps. No fast-check/style generators anywhere; no whole-project JSON fuzzing (persistence hand-mutates named fields instead).
5. **Serial, memory-bound suite.** maxWorkers 1 + real DSP renders ⇒ 60s wall for 749 tests and ~1.8 GB peaks; DSP-heavy families multiply wall time linearly. The README quickstart is stale ("vitest … 31 tests" — it's 749).
6. **jsdom noise is tolerated, not eliminated.** Live stderr shows repeated "Not implemented: HTMLCanvasElement's getContext()" — the mask-manager pins run through the degraded path deliberately (lifecycle accounting), but nothing silences or asserts the degradation itself there.
7. **Fixture duplication across fleets.** `spans`/`hasOverlap`/`SRC` helpers are copy-pasted file-to-file (edit-ops, linked-source-edit, relink-fixes…) rather than shared — a mild maintenance tax; the shared-battery idea (P9) exists but is per-family, not repo-wide.
8. **Vendored-suite trust is gated, not continuous.** The vendored tree's own suite runs ONLY on re-pin (OV-12) — between re-pins, only the engine's twin fences watch the seam. Deliberate and documented, but a real window.

---

## Verification log (for the register)

- Live run: `bun install --frozen-lockfile` (958 pkgs, clean tree) → vendored pins materialized via `git archive` at the pinned SHAs (network fetch of submodules impossible in sandbox) → `vitest run` → **25/25 files, 749/749 tests, 0 failures**; `vitest list` = 749 entries.
- Fence counts live: LAYER-SNAPSHOT = 52 edges; probes = 9 scripts in CI; bridge-seams = 151 its (all static — no dynamic registration in that file).
- Repo restored post-run: vendor dirs emptied to gitlink state, `git status --porcelain` empty, HEAD unchanged at `074a2f6`.
- Stale-pin note: the earlier census's "39-row table loop" is 38 rows live at 074a2f6 (49 = 38 loop + 11 static in the file).

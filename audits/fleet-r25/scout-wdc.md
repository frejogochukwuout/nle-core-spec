# Scout report — web-daw-core (WDC), Fleet R25

**Scout:** R25 WDC ground-truth (read-only) · **Date:** 2026-09-09
**Repo:** `/home/z/my-project/web-daw-core` · **Pin under audit:** `85b81b0` (the R24 pin itself)
**Sources:** `git log/fetch/status`, `HANDOFF.md`, `PLAN.md` (tail + S4 section), `worklog.md` (S4 tail), `src/index.ts`, `src/lib/daw/varispeed.ts`, `src/lib/daw/soundtouch.ts`, `src/lib/daw/audio-registry.ts`, `docs/design-w2-varispeed.md`, spec `20-audio-core.md` §0/status, R24 card `audits/fleet-r24/module-web-daw-core.report.md`, cross-repo read-only greps (nle-engine bridge, nle-test-app audioService + design-jkl-audio-follow.md). Local run: `bun install` → `bun run test` (vitest run) → tree restored (bun.lock checkout, node_modules removed — as-found).

## WDC update card (R25, @ 85b81b0)

| Fact | Value | Authority |
|---|---|---|
| HEAD | `85b81b0c56158da1dd2aa4492bb253fa083e7257` ("docs: the seal-round wrap — PLAN (S4 CLOSED, the honest remaining ledger)") | `git rev-parse HEAD` |
| origin/main | `85b81b0…` — **identical**, local clone NOT stale | `git fetch origin` + `git rev-parse origin/main` |
| Worktree | clean (no modifications, no untracked files after run cleanup) | `git status --short` |
| Posture | sealed, P3-only, pure audio core; zero upstream drift, zero pending porting duty (upstream web-daw `main@eeb3b24` — no movement since) | HANDOFF + UPSTREAM.lock.json (unchanged since R24) |

## Movement since R24 pin (expect none)

**NONE — the seal held exactly.**
- `git log --oneline 85b81b0..HEAD` → **empty** (exit 0).
- `git fetch origin && git log --oneline 85b81b0..origin/main` → **empty**; `origin/main` = `85b81b0` = HEAD. Local and remote agree; the R24 pin commit IS the branch tip.
- Zero code and zero docs delta since R24's verification. The S4 seal round remains the last recorded event (SEAL-READY, P3/P4-only after fixes).

## Test counts

**Re-ran locally** (watched clone ships no node_modules; `bun install` 143 pkgs → `bun run test`):
- **759 / 759 tests passed · 33 test files · 80.9 s** — byte-identical to the R24 seal count. 0 failures, 0 skips reported by the runner.
- Typecheck not re-run (zero code delta since R24's `tsc --noEmit` exit 0 — that evidence carries; the count was the re-verification target).
- Tree restored to as-found after the run (bun.lock tracked-file restored; node_modules removed).

## Varispeed/W2 surface for fit-to-fill

**Where W2 landed** (CoreOwned, design `docs/design-w2-varispeed.md` v2.1; tests `src/test/varispeed.test.ts` + `varispeed-worklet.test.ts`, 20+ pins):
- **`src/lib/daw/varispeed.ts`** — exports: `retimeChannels(channels, rate, sampleRate)` (pure whole-buffer WSOLA retime; output length **EXACTLY `round(inFrames / rate)`** — the F1 flush law: zero-pad `sampleReq + seekWindowLength`, drain, trim/zero-pad), `retimeAudioBuffer(buffer, rate, createBuffer)` (AudioBuffer helper; wrapper created at the **SOURCE** buffer's sampleRate — F7b), `loadVarispeedWorklet(ctx)` (idempotent per-ctx blob-URL loader, never rejects), `VARI_SPEED_WORKLET_SOURCE` + `VARI_SPEED_PROCESSOR_NAME` (`'daw-varispeed'`), `RETIME_RATE_MIN = 1/32` / `RETIME_RATE_MAX = 32` (the rate domain, CR-A1), `BaseAudioContextLike`.
- **`src/lib/daw/soundtouch.ts`** (the typed LGPL port) — `SoundTouch`, `Stretch`, `RateTransposer`, `FifoSampleBuffer` re-exported at barrel `src/index.ts:48`; varispeed barrel `src/index.ts:47`.
- Identity laws: rate 1 / non-finite / ≤ 0 / > 2 channels → the INPUT arrays returned **reference-equal** (the caller's legacy `playbackRate` path stays byte-identical); mono → L=R internally → mono out.

**The varispeedRate composition law the engine consumes — `varispeedRate = elementRate × transportRate`** (the W3 JKL law):
- **Composed at schedule time, app-side scheduler:** `nle-test-app/src/audioService.ts:499` `scheduleAll(playheadSec, transportRate?)` → `:534` `tr = transportRate ?? core.getPlaybackRate()`; `:552` `segRate = seg.varispeedRate ?? 1`; **`:586` `varispeedRate: segRate * tr`**. Fades timeline→wall ÷ r; the skip floor stays timeline-domain; drift law exact by construction (`content = elapsed × elementRate × r`; design-jkl-audio-follow.md: "EXACT"); the #24 offset law element-domain (`offsetSec + into × rate`).
- **Engine flattener:** `scene-to-segments.ts:347` `elementRate(e)` (invalid ≤ 0 reads as 1), `:432` the merge predicate (a retime-LAW boundary splits merged runs), `:516` `varispeedRate: rate` onto the segment.
- **Engine adapter consumes the core via the vendored deep-import (D24e):** `segment-strip-adapter.ts:87` `import { RETIME_RATE_MAX, RETIME_RATE_MIN, retimeChannels } from '@/lib/daw/varispeed'` → `applyMaintainPitch` (`:522`) — the PRE-RETIME branch: retimed buffer / `playbackRate` 1 / `offsetSec` 0 (drift+seek laws stay opts-domain on the ORIGINAL pair), the byte-capped recency-LRU `RetimeSpanCache`, createBuffer-before-compute guard, > 2ch logged fallback, and the **domain guard**: rate outside `[1/32, 32]` → logged fallback to the legacy pitch-affected path (W2k/A2/B-P1-1 — the core identity-bail consumed as a caller duty).
- **Speed-changed video+audio pair: composes correctly.** One law both streams — F1 made the el.speed EDIT path live end-to-end ("the monitor and audio share ONE speed on edits"); the transport rate composes onto the element rate for audio (`segRate × tr`) exactly as the video half scales by the same transport rate (the core's rate; `video-sync.ts`'s `playbackRate` math). For **fit-to-fill** (rate = targetDuration/markedDuration as the element rate): the duration-EXACT retime output + the composed-rate law yield a precisely filling clip.
- **Watch-outs for fit-to-fill:** (1) rate outside `[1/32, 32]` degrades to pitch-affected `playbackRate` (correct length, wrong pitch — logged); (2) the sync O(span) WSOLA compute on the play edge (the queued async pre-retime, design-w2 §4); (3) rate ≈ 0.02-class degenerates are guarded both sides.

**maintainPitch law:** WDC's retime is pitch-preserving **by construction** (SoundTouch `tempo = rate`, pitch untouched). The `maintainPitch` FLAG lives bridge-side: `el.retime.maintainPitch === true` (flattener threads it; a maintainPitch difference is an audible merge boundary) → `SegmentPlayOptions.maintainPitch` → adapter branch eligible iff `maintainPitch ∧ 0 < rate ≠ 1 ∧ rate ∈ [1/32, 32] ∧ 1 ≤ channels ≤ 2`; otherwise the legacy `playbackRate = rate` law (pitch-affected). The app maps `el.speed` → `retime { rate, maintainPitch: true }` (NLE default preserve). F9 (P3, queued): the preserve-pitch TOGGLE is dead — rides a future `retime.maintainPitch` threading.

**Negative rate = silent reverse — YES at the transport level, never varispeed'd.** WDC's `retimeChannels` bails to identity for rate ≤ 0; the adapter's guards read ≤ 0 as ineligible (legacy path also refuses: `varispeedRate > 0` guards at adapter `:662-:681/:993/:1033`). The JKL J key (transport `r < 0`) is the **pragmatic silent-reverse law**: `adapterStop()`, no scheduling — the clock runs backward in silence; baked reverse audio is a queued M2-class capability, not SoundTouch negative rate. `r = 0` unreachable (pause routes `core.pause()`).

## Waveform contract state

- **The code surface is LANDED and stable** — `src/lib/daw/audio-registry.ts:24-74`, untouched since the extraction commit `c515506` (git-verified last-touch): `getAudioBuffer` (:24), `setAudioBuffer` (:29 — recompute when the buffer INSTANCE changes), `deleteAudioBuffer` (:42), **`getPeaks` (:48)**, **`setAudioPeaks` (:58 — pre-computed peaks without a buffer)**, **`computePeaks(buffer, buckets)` (:74) → `{ min, max: Float32Array, buckets }`**; fixed `PEAK_BUCKETS = 2000`; mono mixdown; the sample-driven bucket law `floor(i·buckets/len)` (every sample contributes to exactly one bucket, empty bucket = 0 — the CodeRabbit MAJOR residual fix). Barrel-exported at `src/index.ts:81` ("Out-of-model buffer store").
- **The R24 ruling (ARCH-R24 D29.4, spec-20 §0:25 + §0:151 amendment) promoted the row into WDC's HANDOFF next-session scope, with the contract STATED and pinned WDC-side; acceptance: "CARRIED IN WDC's OWN HANDOFF QUEUE".**
- **R25 finding: NOTHING landed.** Zero commits since the pin; HANDOFF's "Next-session scope" still reads exactly the four pre-promotion items (below) — **no waveform row exists in WDC's own queue**. The D29.4 promotion lives **spec-side only** (nle-core-spec/20-audio-core.md), not in the owning repo. The de-facto API is consumable today (stable, exported, documented in-file), but no contract statement, no pins, and no queue presence materialized in WDC. The K3 hard-prerequisite edge still has **no WDC-side queue presence** — the sharpest spec↔repo queue mismatch persists EXACTLY as R24 left it.

## Queue (WDC's own, unchanged since the seal)

1. **The mixer surface** (the M2 headline, pure new capability — design round FIRST, the W2 process; must decide the app-side el.`effects` sidecar mapping or its explicit non-audio contract, F6).
2. **The deferred upstream test ports** (HANDOFF says "4", names **5** bodies: `engine.test.ts`, `engine-metronome-automation`, `engine-param-channel`, `dsp-aux-sends`, `wam-effect.test.ts` — nle-engine-side ports; the off-by-one is now counted FIVE in spec-20, still "4" in WDC's docs).
3. **The async pre-retime** (adapter's O(span) sync WSOLA on the play edge; specced design-w2 §4 — async pre-retime + legacy fallback while pending; coordinate with the parallel stream, ACTIVE on nle-engine).
4. **P3 ledger (optional):** F12 (lock-all UI reachability), F9 (preserve-pitch toggle dead — rides retime.maintainPitch threading), F10/F11 (mock/engine clock deltas + main-video-audio scope docs), R4 (⇧K dead key in the engine world), F4 (AV-link port gestures bypass the dispatch expansion), upstream-class notes (latency.ts 0-vs-null, music.ts midiToName).
5. **Parking lot / long horizon:** the waveform peaks contract (K3's hard prerequisite — **the D29.4 promotion, still NOT surfaced into HANDOFF**), N5 real media decode, WAM hosting for the first custom WASM effect, the instrument-provider seam exercise, M3 convergence (tempo-map bridge, stems, advanced DSP on the EffectNode + signalLatency() contract).
6. Standing: fetch-before-every-push; upstream sync duty (none pending); gates = `bun run test` + `bunx tsc --noEmit` + `sync --check`.

## Sealed verdict

**SEALED AND HOLDING.** Zero commits since the R24 pin (`85b81b0` = HEAD = origin/main), worktree clean, 759/759 re-verified — the S4 seal round's posture is intact with no post-seal drift, upstream or local. For R25's fit-to-fill edit-mode dependency, the audio side is **unblocked**: W2 varispeed is landed, exported, duration-EXACT, domain-guarded `[1/32, 32]`, and the scheduler composes `varispeedRate = elementRate × transportRate` correctly for a speed-changed video+audio pair (one law both streams; maintainPitch law bridge-side; negative = pragmatic silent reverse, never fed to varispeed). The one exposure carried from R24 is unchanged: **the waveform-contract promotion (D29.4) produced no WDC-side landing** — HANDOFF's queue still lacks the row the ruling demanded, so K3's hard prerequisite remains spec-carried only. Next action for that edge: surface it into WDC's HANDOFF (or re-base the spec's dependency) — nothing else in this repo needs R25 attention.

# Scout report — nle-engine (the runtime-domain core), Fleet R25

**Scout:** R25 engine ground-truth (read-only) · **Date:** 2026-09-09
**Repo:** `/home/z/my-project/nle-engine` · **Pin under audit:** HEAD `3989506` (= `origin/main`, fast-forwarded; clean tree)
**Sources:** `git log 5036387..HEAD` + `git show` (the one delta), `.agents/HANDOFF.md`, `.agents/PLAN.md` (R7/N/R9 queues + S2/S3 sections), `.agents/DECISIONS.md` (tail: D10), `worklog.md` (RR2 tail), `src/lib/nle/timeline/timeline.ts` (7,502 LOC, full public-surface census), `src/lib/nle/headless/api.ts` (2,757 LOC, 19-op wire surface), `src/lib/nle/headless/timeline-adapter.ts`, `vendor/*` gitlinks, `tests/vitest/**` (13 files), `download/nle-test-report.json`, R24 cards (`fleet-r24/module-nle-engine.report.md`, `01-core-engine.report.md`).
**Live verification:** full 13-suite vitest re-run via a **read-only /tmp config** aliasing the vendored paths to `git archive` extractions of the EXACT pinned submodule SHAs (OT `c15a629`, WDC `494f6ff`) — no repo tree touched (engine `git status` clean before and after; only gitignored `node_modules` was installed). Submodules are unmaterialized in this workspace and uncloneable here (private remotes, no PAT), which is why the archives stood in for checkout.

## Engine update card (R25, @ 3989506)

| Fact | Value | Authority |
|---|---|---|
| HEAD | `39895068dfe540c4bb33d8765ef9cdf44e5e288e` — "R9 seam queue (from the nle-test-app zero-no-op round): transform sidecars / maintainPitch threading / the scene-grade seam promotion / the honest-preview widening — 4 attributed entries" (2026-09-07 23:43 UTC, docs-only: `.agents/PLAN.md` +31 lines, nothing else) | `git rev-parse HEAD` / `git show --stat` |
| origin/main | `3989506…` — identical; local not stale | `git rev-parse origin/main` |
| Worktree | clean, zero modified/untracked (after audit run too) | `git status --short` |
| vitest | **458/458 · 13/13 files · 96 s — LIVE-RUN this round** | `npx vitest run --config /tmp/…` |
| Submodule gitlinks | OT `c15a6294…` · WDC `494f6ff7…` — both UNMOVED since the R24 pin | `git submodule status` (gitlink level) |
| A5 frozen barrel | 455 runtime value exports (R24 card's 455 re-confirmed) | `grep -c '^  "' api-surface.frozen.ts` |

### Commits since R24 pin 5036387 (one line each)

Exactly **ONE** commit — the entire R24→R25 delta is a queue filing, zero source:

- `3989506` — docs-only (`.agents/PLAN.md` +31): files the **R9 seam queue**, 4 attributed entries sourced from nle-test-app's zero-no-op app-flow audit (`docs/audit-app-flows-r9.md`, the 9 unexpected-dead list) per the cross-project queueing protocol: **R9-a** transform sidecars in the composition seam (Inspector Position/Scale/Rotation/Flip are mock-local → proposal `CompositionElementParams` gains `{x,y,scale,rotation,flipH,flipV}` + painter translate/rotate/scale), **R9-b** thread `maintainPitch` through the retime patch (engine hardcodes `true`; the Inspector preserve-pitch toggle is dead), **R9-c** promote the scene grade into the shared composition/export law (`paintCompositionFrame(ctx, ops, media, {grade})`), **R9-d** widen the honest CSS-filter preview subset (radial-gradient vignette, shadowBlur glow, LUT-preview v1 riding R9-c's seam). **Category: (c) meta/queue only** — touches NO timeline edit-mode surface, NO vendor pin, NO wire surface, NO fixtures. (b)-seam relevance is *attributional*: this is consumer-audit findings filed INTO the engine's own backlog — the same protocol that produced N1–N4, which all landed as real seams.

### Test counts

- **vitest: 458 / 458 passed, 13 / 13 files, 96 s — live-run in THIS audit**, against the exact pinned submodule SHAs. Per-file: nle-bridge 96 · bridge-seams 113 · planner 52 · timeline-math 42 · transform-resolver 40 · load-validation 32 · video-sync 31 · undo-serialize 15 · persistence 13 · realtime-midi 8 · render-abort 9 · timeline-edit-ops 4 · api-surface 3 = 458. Byte-identical to R24's count (the sole intervening commit is docs-only — arithmetic also demands it). R24 could only static-census 458 (no node_modules, no submodules); **R25 upgrades that evidence to a live green run.**
- `tsc --noEmit`: **0 errors in `src/`**; the only 5 diagnostics are TS2307 "cannot find module" in `tests/vitest/nle-bridge.test.ts` for the unmaterialized vendored paths (`opencut-timeline`, `@/lib/daw/*`, `web-daw-core/test-harness`) — a sandbox artifact (CI materializes submodules via `CI_VENDOR_URL_PREFIX`; `ci.yml` runs `bun run test:vitest` after checkout).
- Browser milestone runner (`download/nle-test-report.json`): 246/246 + 31 milestones — **stale** (timestamp 2026-09-04, pre-R24-pin; not re-runnable in-sandbox per SKILL law 33 — GHA CI is the venue). No drift possible: zero source change since.
- A5 freeze: 455 names in `api-surface.frozen.ts`, `api-surface.test.ts` gate green (additions-only since "453" in PLAN's 2026-09-06 note — the W2.5-era +2, D9-legal).

### Edit-mode census (10-row table: mode | engine method+line | wire op name | verdict)

The engine's Timeline class (7,502 LOC, ~110 public methods) vs the 10 DaVinci edit modes. "Wire op" = the headless JSON-RPC `EditOperationName` set — **exactly 19 ops** (addText, addItem, updateItem, moveItem, removeItems, split, trimStart, trimEnd, addTransition, updateTransition, removeTransition, addTrack, addClip, addKeyframe, removeKeyframes, setTransformParent, addEffect, removeEffect, setTransform), dispatched by `applyOp` (api.ts:785) onto `TimelineActionsAdapter` (api.ts:592) whose canonical binding is `headless/timeline-adapter.ts`. The opencut-timeline wire at the engine's pin (OT `headless/api.ts:182` `WIRE_COMMAND_TYPES`, 30 verbs) is given as context where nearest.

| # | Mode | Engine method + line | Wire op name | Verdict |
|---|---|---|---|---|
| a | Roll trim | `rollingTrimItems(leftClipId, rightClipId, editPointDelta, {linked})` — timeline.ts:2984 (freecut trim-actions.ts:471-565 port) | none (19-op set has no roll; OT wire `timeline.trim` is plain trim) | **EXISTS (class-only, UNWIRED)** |
| b | Ripple trim | `rippleTrimItem(clipId, handle, trimDelta, {linked})` — timeline.ts:2839 (trims + shifts downstream + sync-locked tracks) | none (OT wire has `timeline.rippleDelete` — delete, not trim) | **EXISTS (class-only, UNWIRED)** |
| c | Slip | `slip(clipId, deltaFrames, {linked})` — timeline.ts:4143 (named `slip`, not `slipItem`; doc refs freecut trim-actions.ts:576-639; silent no-op on clamped 0) | none | **EXISTS (class-only, UNWIRED)** |
| d | Slide | `slideItem(clipId, slideDelta, leftNeighborId, rightNeighborId, {linked})` — timeline.ts:4246 (freecut trim-actions.ts:651-878 port) | none | **EXISTS (class-only, UNWIRED)** |
| e | Insert edit | `performInsertEdit(trackId, sourceId, insertAtFrame, sourceStart, sourceEnd, {linked})` — timeline.ts:4702 (3-point: split straddler + shift downstream + insert, one atomic commit) | none (OT wire `timeline.insert` is plain placement, not 3-point insert-edit) | **EXISTS (class-only, UNWIRED)** |
| f | Overwrite edit | `performOverwriteEdit(trackId, sourceId, overwriteAtFrame, sourceStart, sourceEnd, {linked})` — timeline.ts:4860 (region remove/split, no shift, duration preserved) | none | **EXISTS (class-only, UNWIRED)** |
| g | REPLACE edit | — (no verb; overwrite *buries* but there is no same-length-replace-with-auto-source-out semantics, no marked in/out) | none | **ABSENT** |
| h | Append-at-end | — (all clip constructors — `addVideoClip` :1887, `addAudioClip` :1964, `addImageClip` :2039, `addTextClip` :2166, wire `addClip` — require an explicit `from`; no end-relative append, no multi-append verb) | none | **ABSENT** |
| i | Ripple overwrite | — (ripple family = delete only: `rippleDelete` :3574, `rippleDeleteItems` :3606; no replace-with-different-length push/pull verb) | none (OT wire: `timeline.rippleDelete` only) | **ABSENT** |
| j | Fit-to-fill | — (speed is manual: `rateStretchItem` :3155, `rateStretchWithRipple` :6351; zero hits for `markedIn|markedOut|fitToFill` across `src/lib/nle` — no marked-duration, no auto ratio = target/marked) | none | **ABSENT (the primitive is landed: W2 duration-exact varispeed + the retime clamps; the authoring verb is not — see scout-wdc's fit-to-fill row)** |

**Census corollaries (the sharp facts for the spec round):**
1. **6/10 exist as engine class methods; 4/10 are absent** (replace, append-at-end, ripple-overwrite, fit-to-fill).
2. **0/10 have a wire verb.** The headless JSON-RPC surface (19 ops) predates the 3-point-edit port and was never widened for it; `TimelineActionsAdapter` + the canonical `timeline-adapter.ts` binding carry no slip/slide/roll/ripple/insert/overwrite mapping. The six existing modes are reachable only by direct `Timeline` method call (the in-repo runner page.tsx / browser milestones — "Milestone 4: NLE Operations" + "Wave 3D: rate-stretch ripple" rows in the 246-test report), NOT by a headless driver.
3. Vitest pins for the six existing modes are thin: `timeline-edit-ops.test.ts` = 4 tests, all pinning the R1-B4 **transition-blocked abort** law for insert/overwrite (the ops abort empty and commit nothing when the split point lands inside a transition window). The verb math itself (slip/slide/roll/ripple clamps, source-boundary laws) is pinned browser-side only.
4. Notably, OT's own op-surface audit (OT repo `ded43c4`, 2 pins ahead of the engine's vendored pin) claims **"11/11 NLE edit verbs ported (engine+wire+UI+pins)" on the OT side** — the edit-mode action lives in the ops+UI canonical repo, not on the engine's wire. The engine remains the *math owner*; OT is the *verb surface owner*.

### Seam evidence (what improved)

**Nothing code-level moved — and that is the finding.** The R24 seal held exactly:

- **Pin stability = seam stability.** `vendor/opencut-timeline` gitlink UNMOVED at `c15a629` (the a4e971d→c15a629 re-pin was R24's own last act, inside pin `5036387` itself); `vendor/web-daw-core` UNMOVED at `494f6ff`. Zero wire drift, zero fixture drift, zero engine-source drift. **Consumer-pin drift answer: the engine vendors OT as a git submodule at `c15a629` and it has NOT moved since c15a629.** (Upstream context, not engine drift: the standalone OT clone is now 5 commits ahead of the pin — `b02d3c8`/`d40c1f5` session-15 test-app infra, `ded43c4` the op-surface parity audit, `c37844f` the OT R9 seam queue, `fdb771c` the R9-c playhead-guard code fix — so a *future* re-pin wave has content to absorb, one code commit among docs; WDC standalone is 1 docs-only commit ahead (`85b81b0`, the seal wrap — zero source delta).)
- **The one commit IS seam work in the attribution sense:** the R9 queue entries are *cross-repo* findings (nle-test-app's zero-no-op audit) filed into the engine's own PLAN under the cross-project queueing protocol — the engine accepting seam debt from its consumer's audit. Every R9 item is a composition/preview seam (transform sidecars, maintainPitch threading, scene-grade promotion, honest-preview widening), i.e. the *monitor/export* seam, not the edit-mode surface.
- **Evidence upgraded this round:** R24's engine count was static-census-only ("458 by arithmetic"); R25 ran the full 13-suite suite live against the exact pinned submodule trees — 458/458 green, tsc 0 in src. The pin not only parses, it passes.
- **The seam story the R24 pin certified is unchanged:** N1 composition-frame, N2/N2b flattener params + gain automation, N3 transition-inputs, N4 av-link, W1 meter taps, W2.5 effects CSS-filter string, the W11 wire-dispatch test seam (OT-side widenings consumed via the re-pin) — all pre-R24-pin landings that R24 pinned as coherent; R25 re-confirms quiescence on top of them.

### Queue state

The engine's own committed queue (`.agents/PLAN.md` + HANDOFF "Suggested Next Steps", in order):

1. **G1 — the deferred upstream test ports** (from wdc's HANDOFF): `engine.test.ts`, `engine-metronome-automation`, `engine-param-channel`, `dsp-aux-sends`, `wam-effect.test.ts` → nle-engine-side ports onto scene-mixer (wdc counts "4" but names 5).
2. **G2 — the async pre-retime queue** (the adapter's O(span) sync WSOLA on the play edge; design round FIRST — wdc `design-w2 §4` + the 5 seam risks from the S3-B audit).
3. **R9-a..R9-d — the 4 NEW entries filed this round** (transform sidecars · maintainPitch threading · scene-grade promotion · honest-preview widening) — unchecked, no WIP.
4. **N5 — real media decode** (registry + decode → VirtualMediaAsset; the "eventual production milestone", P1.9 deprioritized by user directive).
5. P3 register (by choice) + the P2 feature backlog (ShapeItem SDF, LottieItem, text motion, scopes, CPU transitions…).

**NOT in the queue anywhere: the 4 absent edit modes** (replace, append-at-end, ripple-overwrite, fit-to-fill), nor any widening of the headless wire toward the 6 existing modes. The edit-mode surface is not work the engine has committed to; R9-b's `maintainPitch` is the only queue item that even touches retime, and it is a flag-threading fix, not a new mode.

### Sealed-vs-in-flight verdict

**SEALED — quiescent, queue-only in-flight.** One docs-only commit since the R24 pin; 458/458 re-verified live against the exact pinned submodule SHAs; both vendor gitlinks unmoved; the RR2 convergence posture ("P0: 0, P1: 0, P2: 0, P3: 6 — the bar is MET") stands with nothing to challenge it. The module's own HANDOFF (one wrap-round stale on its HEAD reference, `0208027`, but superseded by later commit messages) declares "the fleet is fully coherent." In-flight work is committed-but-not-started (no branches, no WIP, clean tree): G1, G2, R9-a..d, N5.

For the R25 spec round specifically: the engine demonstrates seam **stability** since R24, not new seam **capability** — the honest characterization of "mostly sealed" is *accurate*: sealed at the R24-verified state, with a freshly-attributed 4-item consumer-seam backlog as the next motion (all composition/preview-side). The edit-mode census is the open surface fact: 6/10 modes live as class math (pinned mostly browser-side), 0/10 on any wire, 4/10 absent — and none of it queued. Any R25+ spec claim of edit-mode coverage must attribute verbs to OT's dispatch surface (the ops+UI canonical, 11/11 per its own parity audit) and math to the engine, not wire coverage to the engine.

# R23 per-file audit — `19-code-references.md` (the pin/line-number register)

**Agent:** fleet-R23 file-19 auditor (fresh context). **Round:** R23 (the 20-agent per-file fleet, user directive 2).
**File audited & edited:** `/home/z/my-project/nle-core-spec/19-code-references.md` → **v3.0 → v3.1** (363 → 421 lines).
**Live repos verified by reading code (no git, no test runs, counts trusted per the round's pin set):** nle-engine `b8c6f88` / opencut-timeline `222532c` / web-daw-core `494f6ff` / nle-ui `85dcf57` / nle-test-app `70e99f0` / in-repo shell-mini + shell-variants.
**Rulings applied:** D23 (plan/spec separation — spec 14 retired), D24 (the K/w/r ladder — every phase tag re-based), D25 (OT's `src/components/timeline/` is THE canonical React tree; the app fork retires).

---

## 1. BASE re-verification — VERIFIED-STRONG (with fixes where the register was stale)

Every pin/count/feature claim re-verified against the live repos; the register's LIVE rows were stale to the R22 pin set — **all fixed**:

| Claim class | Was (R22/v3.0) | Now (R23/v3.1) | Verified by |
|---|---|---|---|
| engine pin/count | `f68ab8c` 356 | `b8c6f88` **440/440** | 14 vitest test files on disk; N2b worklog record @ `37cdd28`; RR1-A = `clampAuthorFadeToSpan` at `audio/audio-scene.ts:803` + `bridge/conversions.ts:137-138` |
| OT pin/count | `05584d8` 459 (329+130) | `222532c` **489/489** | **the report json itself** (`download/timeline-test-report.json`: total/passed 489, 51 milestone entries); 00-master's canon split 359+130 recorded; the json's own census sums 360 in-page/129 real-mouse — noted as a one-test classification nit, the TOTAL is the pinned count |
| WDC pin/count | `fe05d85` 740, consumed `5570321` | `494f6ff` **759/759**, consumed `f446512` | 33 test files; W2 files `src/lib/daw/soundtouch.ts` + `varispeed.ts` + design-w2-varispeed.md on disk; drift-gate `sync --check` fails-on-drift (CR-B1) in `scripts/sync-from-upstream.mjs:298` |
| nle-ui pin/count | `dba8d52` 640, consumer `752991d` | `85dcf57` **648**, consumer `85dcf57` (app at package HEAD) | the kind-aware mute-all pin read in code: `timelineRouter.ts:56` `setAllTracksMuted` + the mixed-state convergence pin `timelineRouterDispatch.test.ts` |
| app pin/count | `e662759` 83 | `70e99f0` **117/117** | W3 JKL: `audioService.ts:295` + `audioService.test.tsx:871/:923` + `docs/design-jkl-audio-follow.md`; `vendor/nle-timeline/UPSTREAM.lock.json` reads `upstreamHead: a4e971d` |
| consumer pins | 3420b5f / 5570321 / 752991d / ea10c42 | engine→OT `a4e971d` + WDC `f446512`; app→engine `4ef0147` + OT-mirror `a4e971d` + nle-ui `85dcf57` | the app's UPSTREAM.lock (a4e971d read directly); the rest per the round's pin set + 00-master v8.0's live re-read |
| mocks | variants 1,334; mini 355 "current-tracked" | variants **1,521+** current-tracked; mini **355 SEALED** | variants `scripts/vlm-*.{mjs,sh,md}` on disk (the R23-G VLM net); mini seal artifacts read: CORE-SEAMS **26 seam rows**, LAW-NET-INVENTORY **8 files/355 tests/128 census units = 13 HOLDS (33 tests) + 115 GAP (322 authored)** |
| engine LOC census | ~52k/58 files (R15) | **~54.7k (54,721)/62 files**; bridge 7→**11 files/4,264 LOC**; timeline.ts 7,480→7,502 | `wc -l` census this round |
| OT components tree | (absent from the register — the R22 row said the React view tree lives APP-side in `timeline-port/`) | **canonical per D25: 39 files / 7,702 LOC** (TimelineView 1,221 + ElementView 883 + 13 view components + 19 hooks + support); zero `next/*` in components/; zero `data-testid`; `data-test` = 58 static + 6 templated (census re-run, still exact) | `wc -l` + census greps |
| headless union | 24 prefixed types | **30** (23 `timeline.*` + 7 `track.*`) | parsed the union at `api.ts:41` — the S/T/S3 rounds added setPlaybackRate/setLoopRegion/advancePlayhead/toggleLock/setAllLocked/setAllMuted/toggleBookmark-color/retimeKeyframe/undo-redo |
| frozen API surface | 453 | **455** (the N2b conscious bump) | `grep -c '^  "' api-surface.frozen.ts` = 455 |
| layer fence | 52 edges / 14 layers | **52 edges / 13 dirs + barrel** (61 raw arrows − 9 comment lines) | LAYER-SNAPSHOT.txt recount |
| FCPXML | zero refs | **still zero refs** at both `b8c6f88` and `70e99f0` | grep both repos |
| projector (D16) | "ENGINE-home … (chartered)" | **still NOT LANDED** — no `src/lib/nle/projector/` dir | directory inspection |
| OT type-only import sites | "scene-to-segments.ts:43, the repo's only OT import" | **4 sites, all `import type`** (scene-to-segments:67, av-link:49, transition-inputs:70, composition-frame:82) | grep |

**Line-number freshness (the core charge):** every LIVE line-number citation re-grepped at the new HEADs — §5 ledger rows 1/2/7/8/9/11/12/13/14/26/27/28/30/31 refreshed (e.g. clock.ts :550/:565/:612/:661 → :137/:568-591/:659/:701; snapshotsEqual :1746 → :1521; enforceMainTrackStart :167 → :175; applyBatch :346-381 → :1518; NOOP :198-208 → :726; insert-landed :169-172 → :553-560; $ref :542 → :544-557; player :3247 → :3287; orchestrator :765 → :796). Ledger #9's player.ts:1038 counter-example marked RETIRED (Wave 4C) — the rule stands, the reference gone. Stable anchors verified unchanged: registry.ts:2249, planner.ts:21-28, handle-utils.ts:302, placeholder-compositor.ts:116, scale.ts:6-8, core/id.ts:15, computeRippleAdjustments :121.

## 2. GAP flips / adds / re-tags — FIXED

**Flips (landed, re-typed as BASE):**
- engine N2b keyframed-volume automation — LANDED @ `37cdd28` (was unstated in the register; the R22 paragraph stopped at N1-N4).
- engine MIDI/instrument (BGM scoring) path — VALIDATED end-to-end (P1.20; `bridge/scored-notes.ts` 400 LOC; H18a-f; the W7 proposal) — **was entirely missing from the register** (the R22 agent's miss).
- engine W2 consumption (flattener maintainPitch + pre-retime branch @ `df6eadf`) — LANDED.
- WDC W2 SoundTouch/varispeed — LANDED @ `de09c93` (was "M2 = SoundTouch offline port (queued)"); the M2 REMAINDER → r2.
- OT S/T/S3 rounds + F1 hardening + M44/M45/M46 — LANDED (the register's last OT record was the R22 S-round only).
- nle-ui patch.transitionOut widening + lock router route (the OT S-round queue) — LANDED with the T-round wave B.
- app W3 JKL + RR1-B + the N2b/W2 app-side waves — LANDED.

**Adds (register rows that did not exist):**
- **§3.2's canonical-tree row** (the D25 mandate): 39 files/7,702 LOC, zero testids, the host seam at `TimelineView.tsx:116`, `/view` + `window.__VIEW_TEST__` at `view/page.tsx:357`.
- **§3.2's runner row**: `scripts/run-timeline-tests.mjs` → the report json (the count authority) + the 14 real-mouse scripts — the K2 in-page family.
- **§3.1's K2 engine-side row**: `timeline-edit-ops`/`video-sync`/`bridge-seams`/`planner` combined tests exist in-repo.
- **§3.3A's K2 WDC-side row**: the integration family (`audio-integration`, `dsp-bounce-parity`, `dsp-effects-integration`, `nle-audio-core-derisk`, `real-audio-e2e`, `offline-parity-wiring`) — the user's "combined test that audio core has done before".
- **§3.3B (nle-ui) + §3.3C (nle-test-app)**: the tier-4 assets previously had NO §3 rows (only §0A/§9 mentions) — now full register rows incl. the app's vendoring record (UPSTREAM.lock, `@vendor/timeline` alias) and the retiring fork's D25 status.
- **§3.6 (ui-mock/shell-mini)**: the file's §0/§0A/Status cited "§3.5/§3.6" for years — §3.6 never existed; now it does (the seal artifacts: OT-SEAMS, CORE-SEAMS 26 seams, LAW-NET-INVENTORY 128 units, RH-skin-extraction; the two-halves grammar note per D25.3).
- **§3.5's VLM net row**: `vlm-capture.mjs`/`vlm-review.mjs`/`vlm-run.sh`/`vlm-rubric.md` — the R23-G tooling K3/w1 adopt (don't fork).
- **§0 GAP new rows**: the D25 bridge (two-path vendoring + fork retirement + the post-swap checklist), the OT-side bridge halves (props upstreaming + testid convention + view-config surface — the retired spec-14 §4.1 C1 OT-side halves re-homed here per D23), the consumer re-pin wave (engine OT a4e971d→222532c AND app engine 4ef0147→b8c6f88), the K2 census registration → S-spec at K2 entry.

**Re-tags per D24 (every phase tag in the file):**
- C7 → W-ops-at-end ⇒ **r1 at END** (+ the one-day app migration sub-gate) — §0, §0A, §2.1, §3.2, §6 C7, §9 item 6, §12 item 7.
- FCPXML → R-fcpxml ⇒ **r5**.
- Mock retirement → post-C4/post-walk ⇒ **post-K4/w1** (the port-then-swap law's 00-master home noted).
- M2 remainder → app A4 (R15 charter) ⇒ **r2** (§3.3A, §8, §12 item 11).
- Op-family port → A2 wave 1 ⇒ **K3-composes-app-side + r1-graduates** per the D24 mapping (§9 item 9).
- The op parity acceptance "OT's 423-test suite" (R15 number) left in the R15-marked §2.4.3 history text; the live counts live in §0/§3.2.
- "per spec 14" phase authority ⇒ the D24 ladder / `IMPLEMENTATION-PLAN.md` (§0 GAP preamble, ACCEPTANCE line, §11's 00/13/14 row, §0A's spec-14 §3 citation marked historical).
- Tier-1 canon row: "14 architectural decisions" ⇒ **the ledger through Decision 25** (D23/D24/D25).
- §12 item 5: OT's decision count 15 ⇒ **23** (verified in its DECISIONS.md).

## 3. Retired spec-14 §4 rows in this file's domain — VERIFIED-STRONG

The reference-register-domain §4 rows all survive in §0 GAP (posture law): the C7 row (§4's protocol naming), the OT-vendor pin bump (§4.1 engine-side), FCPXML (§4's interchange), the projector corpus (§4.1 engine-side), the mock-retirement triggers (§4.6 → post-K4/w1 + 00-master law text). The one orphan risk specific to this file — **spec 14 §4.1's C1 OT-side halves (zoom-ladder config + ripple-toggle semantics exposure)** — is now EXPLICITLY re-homed in §0 GAP's OT-side-bridge-halves row. No reference-domain row was found only in spec 14.

## 4. REMAINS-OPEN (the honest register)

1. **The OT in-page/real-mouse split**: 00-master records 359+130; the report json's own milestone census sums 360+129 (one test's classification). The TOTAL (489) is the pinned count in both files; flag for battery_r23's central re-baseline to settle the split convention.
2. **The variants count**: my file says **1,521+** per this round's pin directive; 00-master v8.0 says 1,470 (the ARCH-R23 evidence base) — the battery re-baselines centrally (my file carries the lineage 596→1,334→1,470→1,521+ to make the reconciliation mechanical).
3. **C7's spec-15 worklist**: spec 15 §13.15 still enumerates the 24-command reality; the union is 30 at `222532c` — flagged in my §6 C7 row + §12 item 7 for the 15-file agent/battery (I do not edit spec 15).
4. The consumer re-pin residuals (engine→OT, app→engine) are REGISTERED (§0 GAP + §9 item 12) but remain unexecuted in the repos — as designed (pin-lockset law).
5. The engine/app worklogs trail their HEADs (engine worklog ends at the S2 session's 414; app's at 83) — their docs, not my file's rows; the register reflects code truth.

## 5. NOTES

- Conventions preserved: the §0 triad + §0A; all R15/R22 point-in-time blocks kept as marked history (the §3.1 R15 verified-state table, the §3.2 R15 module/W8 tables, the R22 lineage paragraph in §9); the W8 UI-surface bullets stay as the R15 register with the live D25 row added above them.
- The count-consistency battery check ("engine 440 in 17+19+00; OT 489 in 17+19+00") is **green for this file**: 440 appears in Status/§0/§0A/§2.1/§3.1/§9; 489 in Status/§0/§0A/§2.1/§3.2/§9.
- Table-pipe validation run over the whole file: only the two pre-existing escaped-pipe codec rows (R15 text, correct markdown) flagged — no structural damage from this round's edits.
- No git commands run; no battery/test suites run (counts trusted per the round's pin set; features/lines verified by reading code — the fresh-grep discipline).

**VERDICT: VERIFIED-STRONG + FIXED** — the register now reflects the R23 pin world (440/489/759/648/117/355/1,521+ and both consumer-pin classes), the D25 canonical-tree ruling, the D24 ladder re-tags, the previously-missing rows (the components/ tree, the runners, the K2 families, the VLM net, the tier-4 §3 rows, §3.6), and every live line anchor re-grepped at the new HEADs.

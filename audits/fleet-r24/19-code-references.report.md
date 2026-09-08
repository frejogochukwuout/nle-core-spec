# R24 per-file audit — `19-code-references.md` (the cross-repo pin/line register)

**Agent:** fleet-R24 file-19 auditor (Task R24-3s, fresh context). **Round:** R24 (the 20-agent per-file fleet).
**File audited & edited:** `/home/z/my-project/nle-core-spec/19-code-references.md` → **v3.1 → v3.2** (420 → 422 lines).
**Live repos verified by reading code at the working trees** (all five at the R24 pins — engine `5036387`, OT `ded43c4` (src == code pin `c15a629`), WDC `85b81b0`, nle-ui `fc4cc35`, app `c885ece`): every line-cite I touched was re-grepped live before writing. No git commands beyond read-only HEAD verification; no test suites run (counts per the module cards' authorities: OT/WDC/nle-ui live-run, engine/app static-census-matched).
**Rulings applied:** D26 (adopt-wholesale convergence census — amends D25.2's mechanism; D25.1 canon stands), D27 (keep nle-ui + the app; cloudcut = dormant predecessor), D28 (evolve in place), D29 (the W11 instruments: 24 routed + 6 exceptions; the K2/K3/K4 gates re-expressed).

---

## 1. BASE re-verification — VERIFIED-STRONG, re-pinned (charge 1, the full register re-base)

| Class | Was (R23/v3.1) | Now (R24/v3.2) | Verified by (live) |
|---|---|---|---|
| engine pin/count | `b8c6f88` 440/440 (14 files) | `5036387` **458/458** (13 files: 2 top-level + 11 in `tests/vitest/engine/`) | file census on disk; lineage +18 (`8a0b7fe` W2.5 +17, `4b2dfd1` +1) |
| OT pin/count | `222532c` 489/489 (51 entries) | HEAD `ded43c4`, **code pin `c15a629`**, **536/536** (59 entries = 41 in-page/386 + 18 real-mouse/150) | report json re-read (`total:536`); 59 entries parsed; the module audit's live run cited |
| WDC pin | `494f6ff` 759, consumed `f446512` | `85b81b0` **759** (docs-only past `494f6ff`); engine consumes `494f6ff`, app `85b81b0` | 33 test files; soundtouch/varispeed on disk |
| nle-ui | `85dcf57` 648 | `fc4cc35` **674** (live-run) | `setAllTracksMuted` now at `timelineRouter.ts:59` (was :56 — drift corrected) |
| app | `70e99f0` 117/117 | `c885ece` **174/174** | static census matches the module card; suites on disk |
| consumer pins | engine→OT `a4e971d`+WDC `f446512`; app→engine `4ef0147`+mirror `a4e971d`+nle-ui `85dcf57` | engine→OT **`c15a629`**+WDC **`494f6ff`**; app→engine **`5036387`**+**OT-lock-copy `c15a629` (byte-exact)**+nle-ui **`fc4cc35`**+WDC **`85b81b0`** | app `UPSTREAM.lock.json` reads `c15a629` (re-read); engine import census |
| counts 440/489/648/117 | live | 458/536/674/174 everywhere live (lineage kept) | grep sweep: zero stale live counts |
| pin-typo law | — | the file already spelled the TRUE R23 engine pin `b8c6f88` (no `b8c6c88` ever present); R23 pins retained only as marked lineage/execution records | grep |

**Line-cite drift corrected (all re-verified live at the new pins):** OT `ops/timeline-core.ts:2108`→**:2145** (`setTracksMuted`; file 2,873→**2,890**); api.ts wire verbs `:1399`→**:1624** (`track.setAllMuted`) + **`:1605`** (`track.setAllLocked`); applyBatch `:1518`→**:1739** (in-batch rejection `:1745`); NOOP `:726`→**:921**; split-edge NOOP `:760/:782`→**:986**; insert-landed `:553-560`→**:558-718** (data block :712-718); engine `composition-frame.ts:82`→**:100** (type-only import), + W2.5 anchors **effects :119 / filter :165 / `buildElementFilterString` :223**; `core/types.ts:1319-1370`→**:1354-1406** (`TimelineData`); `resolveOperationRefs` :544→**:543-556**; `editProject` :1064→**:1065**; pixel-utils :9-11→**:13-15**; `TimelineViewProps` :116→**:177-201** (+ `wire`/`onSaveScene`/`onLoadScene`); `view/page.tsx:357`→**:454**; app `audioService.ts:295`→**:374-382** (S3-C4; tests :871/:923 hold). **Held exactly:** player.ts:3287, orchestrator.ts:796, audio-scene.ts:803, clock.ts :137/:568/:591/:659/:701, video-sync :181-225/:907-913, lut.ts:323-337, pipeline.ts:5135/:5206 (5,320 LOC), registry.ts:2249, planner/handle-utils, scene-assembly :729/:1249-1255, timeline.ts:1521, api.ts:2025, EDIT_OPERATION_NAMES, types/index.ts:116-119, placeholder-compositor.ts:116, enforceMainTrackStart :175, scale.ts:6-8, element-interaction-controller.ts:53, box-select :34, ruler-utils :17-38, core/id.ts:15.

## 2. The new files registered (charge 2) — ADDED

- **OT W11**: `hooks/use-wire-dispatch.ts` (90 LOC — the canonical-tree row + the W11 rounds row), `testing/milestones-w11.ts` (the M49-family pins), `WIRE_COMMAND_TYPES` api.ts:182-213 + lockstep :216-230, the recorder/`applyBatch data.results`/keyframe `lockPreCheck`.
- **app R8**: `persistenceService.ts` (380), `deliverService.ts` (344), the W2.1 sidechain rows (`insertEffects` → external-sidechain compressor + `rewireSidechains()`), `ProgramCanvas.tsx` (242 — `buildElementFilterString` per element + the grade final pass).
- **nle-ui D29 seams**: W2.3 `saveState` (useUiStore.ts:122/:597), W2.4 `exportRequest` (DeliverPage.tsx:37-91, 5 TYPE-ONLY shapes; AppShell.tsx:208-227 the 4th slot), W2.5 `SceneGrade` (useUiStore.ts:42, setGrade :199).
- **engine W2.5**: `CompositionElementParams.effects` :119 / `CompositionElementEffect` :124 / `CompositionDrawOp.filter` :165 / `buildElementFilterString` :223 (+ the honest-subset law + the grade-decline-by-design note).

## 3. The D26 census rows (charge 3) — ADDED (§0 GAP + §3.3C + §2.1/§8)

The port census: `timeline-port/` 40 files / **8,556 LOC** = **39 mirrors of OT's 40** (7 byte-exact + 25 mechanical = **32 zero-action** + **7 documented carriers**: 5 pending W-C/W-D adoptions + 2 port-local keeps) + the host `EngineMount.tsx` (306) + **`use-wire-dispatch` pending W-C**; the lock-copy `vendor/nle-timeline` **byte-exact @ `c15a629` minus `testing/`** (0 diffs/0 missing/0 extra, 14,912 LOC — live-verified by the app module card). The census-law text (CI-gated register-equality, per-pin declared values, carrier-without-rationale = violation) carried per D26.2.

## 4. The D25→D26 canonical-tree row (charge 4) — RE-FRAMED

Every "the fork RETIRES per D25" statement re-cast as the converging mirror under the census discipline (D25.1's single-tree canon stands); OT's tree updated to **40 files / 8,604 LOC** (TimelineView 1,516; 20 hooks); the R23 v3.1 lineage kept. §8's Timeline-UI verdict row re-written; §0A/§2.1 tier rows re-cast.

## 5. K2/VLM/"never-existed" rows (charge 5) — RE-VERIFIED ACCURATE

- K2 engine-side family (4 test files) on disk ✓; K2 WDC-side family (6 test files) on disk ✓; OT runner + **M49C as K2's OT-side completeness instrument (D29.1)** noted in §0 GAP.
- VLM net on disk at `ui-mock/shell-variants/scripts/vlm-*` ✓; mini seal artifacts ✓ (**CORE-SEAMS exactly 26 seam rows** recounted; LAW-NET 128/355 re-read).
- The R23 "never-existed" closures (§3.6, §3.3B/§3.3C "previously carried only in §0A/§9") remain accurate history.
- Mocks unchanged: mini 355 (sealed, recount exact); variants 1,521+ current-tracked (my static census 1,588/61 files — above the floor, battery re-baselines centrally).

## 6. Phase tags + tier-4 (charge 6)

All live phase tags remain the D24 set (r1/r5/r2/post-K4/w1/S-*/K2/K3); the C7 lineage re-based per D29 (24→28→30→24-routed+6-exceptions); tier-4 rows re-verified (nle-ui 674/boundary; app 174 + the D27 keep rulings + the F17 `.agents/`-before-W-C note). No R15/R22/R23 historical blocks damaged (all remain marked history; the pre-existing escaped-pipe codec row is the only table-lint flag, unchanged).

## 7. REMAINS-OPEN (honest register)

1. Engine test count is **static-census authority** in this sandbox (submodules/node_modules absent; the GHA CI venue is live) — flagged in the row.
2. The variants "1,521+" figure vs my 1,588 static count — battery re-baselines centrally; lineage noted in §3.5.
3. The engine `api.ts` LOC differs by one between the module card (2,758) and my `wc -l` (2,757) — I cite only line anchors, not the LOC, so no conflict introduced.
4. Sibling-spec sweeps (the 30-type worklist refresh in spec 15 §13.15; the count rows in 00/17) are their agents' charge — flagged in §11/§12.
5. No mutating git commands; no test suites executed by me (authorities per the module cards).

**VERDICT: VERIFIED-STRONG + FIXED** — the register now carries the full R24 pin world (458/536/759/674/174 + all four consumer-pin classes), the W11/W2.5/D29 surfaces, the D26 census, and every live line anchor re-grepped at the new pins.

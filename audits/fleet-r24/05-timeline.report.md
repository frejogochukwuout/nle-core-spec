# R24 fleet audit — `05-timeline.md` (the timeline / editing-domain UI spec — THE highest-delta file this round)

**Agent:** R24-3f (FLEET AUDIT AGENT, fresh context). **Files owned:** `05-timeline.md` + the one companion note in `ui-mock/shell-mini/docs/OT-SEAMS.md`. **Date:** 2026-09-08. **No git commands** (HEADs established by file-reads of `.git/refs/heads/main`; all feature claims verified by live code reads). **Evidence packs read first:** the OT module card (R24-1a), the app module card (R24-1e), `ARCH-R24-timeline-strategy-and-topology.md` (v2 — D26 is this file's ruling), and the R23 precedent (`fleet-r23/05-timeline.report.md`).

---

## 1. LIVE VERIFICATION (every load-bearing claim re-derived, not trusted)

| Claim | Verification |
|---|---|
| OT HEAD `ded43c431bcc…` (`main`), app HEAD `c885ece…` | file-reads of `.git/refs/heads/main` — both exact |
| Code pin `c15a629` (last 3 commits docs/runner-artifacts) | OT module card §1 (live-run this round); working tree == HEAD, so all code reads below ARE the `c15a629` state |
| 536/536 (386 in-page + 150 real-mouse, 59 entries = 41 + 18) | OT card §1 (RUN LIVE through the dev server; report json); not re-run here (no-mutation posture) |
| Components tree = **40 files / 8,604 LOC** | live: `find src/components/timeline -name "*.ts(x)"` = 40; `wc -l` total = 8,604 |
| TimelineView **1,516L**, TimelineElementView 883L, TimelineTrack 184L, `use-wire-dispatch.ts` 90L, **20 hooks** | live `wc -l` + `ls hooks/` (use-wire-dispatch present; 20 entries) |
| `WIRE_COMMAND_TYPES` = 30 names = **24 routed + 6 exceptions** | live read `api.ts:182-213` + the both-direction tsc-lockstep asserts `:216-230`; routed = 17 `timeline.*` + 7 `track.*`; exceptions = `selectElements`, `upsert/remove/retimeKeyframe`, `advancePlayhead`, `trim` |
| W11 engine widenings (attach/recorder/`data.results`/`TRACK_LOCKED`) | live read `api.ts:240+` (options + recorder) + OT card §3 (verified in code) |
| `TimelineViewProps` @ c15a629 = core/fps/snappingEnabled/initialZoom/isShiftHeld/dragSource/mediaAssets/mediaLookup/`wire`/onSaveScene/onLoadScene | live read `TimelineView.tsx:177-201` — **ZERO D25.2 props upstreamed** (no selection/zoom bridges, no `confirmDelete`, no scroll anchor, no `EMPTY_CONTEXT_ITEMS`); `cancelRegistry` minted internally at `:715-719` |
| `rippleMode` internal, no view-config surface | live: `TimelineView.tsx:237` `useState(false)` → toolbar only; zoom continuous-clamped (per OT card §3c) |
| `data-test=` 68 / `data-testid` 0 in `src/components/` | live grep — both exact |
| Op-parity audit at HEAD | `.agents/OP-COVERAGE.md` present; 11/11 table + extensions read live |
| Port census: 40 files / 8,556 LOC; EngineMount 306L; no `CENSUS.md`; no app `.agents/` | live `find`/`wc`/`ls` on `nle-test-app/src/timeline-port` + `UPSTREAM.lock.json` (`upstreamHead: c15a629`) |
| Census classes spot-checked | live `cmp`: `theme.ts` + `icons.tsx` byte-IDENTICAL; `use-timeline-zoom` mechanical-exact under `@vendor/timeline`→`@/lib/timeline` normalization; `use-playback-ticker` = the documented S1-doc-comment keep — matches the app card's 7/25/7 classification exactly |
| D22 drag-law freeze untouched | live: `TIMELINE_DRAG_THRESHOLD_PX = 5` strict `>` (`:53/:176`); zoom constants 50/0.1/100 (`scale.ts:6-8`); `TIMELINE_INDICATOR_LINE_WIDTH_PX = 2` still (the known-delta note stands) |
| Milestone ledger | `src/lib/timeline/testing/milestones-s3seam.ts` (M46 setTracksMuted) survives at HEAD; W11 `milestones-w11.ts` present |

---

## 2. FIXED (edits applied to `05-timeline.md` — 14 edits, minimal-diff, posture law held)

1. **Header Status line:** R23 framing → **Round 24** (the R24 re-baseline + the D26 census ruling: OT @ HEAD `ded43c4` / code pin `c15a629` 536/536 BASE; the port = census-governed converging mirror; gap = r1 / carrier-reduction / K3; ARCH-R24 D26/D29/D30 cited). R23/R22 kept as lineage with the mechanism-superseded note.
2. **Reference-repos line:** "fork is retired" → the converging-mirror statement; M17-M46 → M17-M49.
3. **§0 BASE OT row:** `222532c` 489/489 (51 suites) → **HEAD `ded43c4` / code pin `c15a629`** — **536/536 (386 + 150, 59 entries)**, the empty `c15a629..ded43c4` src-diff noted. S/T/S3-seam/F1 rounds kept (still true at HEAD). **Added:** W10F M47 (`c5b5b24`) + M48 (`6bb01d3`); **the W11 complete-UI round promoted to BASE** — the wire-dispatch seam (DECISIONS #25; `useWireDispatch` → `HeadlessTimelineApi(fps,{core,onApply})`, ONE engine via attach) with the **24 routed verbs enumerated** (17 `timeline.*` + 7 `track.*`) **+ the 6 exceptions with their rationales**; **the M49C coverage gate** (`ca91223`, LIVE constant read + both-direction tsc drift lock); **the engine widenings** (`56dcd8f`: attach SA-5 + recorder ring-500/coverage-Set + `WIRE_COMMAND_TYPES` + `applyBatch data.results` + keyframe `TRACK_LOCKED`); the M49T/H/R/G rounds (`b64ed5a`/`56f8634`/`fa0c478`/`c9b11e6`); **the op-parity audit** (11/11 NLE edit verbs vs classic @ `cf5e79e`, extensions lock/loop/rate/JKL/ripple-delete/save-load/error-surface).
4. **§0 canonical-tree row:** 39 files/~7,700 LOC → **40 files / 8,604 LOC**; TimelineView 1,221L → **1,516L**; 19-hook → **20-hook** family (`use-wire-dispatch` added W11-b); M17-M49; the tree now hosts the wire-dispatch UI layer; D25.1 canon "unchanged by D26".
5. **§0 app row REVERSED (the fork→mirror charge):** `70e99f0` 117/117 "fork ≥2 waves behind, retires per D25" → `c885ece` **174/174** + **the census-governed converging mirror (D26)**: 40 port files = 39 mirrors of OT's 40 (`use-wire-dispatch` pending W-C) + `EngineMount.tsx` (306L host); **7 byte-exact + 25 mechanical-exact = 32 zero-action + 7 documented carriers** (named); lock-copy `vendor/nle-timeline` @ `c15a629` byte-exact minus `testing/`; D25.2's two-path vendor extension + file-by-file fork deletion RETIRED; 3-way-merge re-pin law; fork retirement = the D30-declared irreducible carrier set; the R23 missed-deltas list marked absorbed-by-construction.
6. **§0 NEW — the census register row (D26.2, REQUIRED):** the spec-side register declaring the per-pin values (40 = 39 mirrors (32+7) + host; `use-wire-dispatch` pending W-C); the app-side home (named app doc `timeline-port/CENSUS.md` or `.agents/` — **verified absent, the D27-F17 filing action due before W-C**); enforcement = the app-side CI-gated script (import-specifier-normalized recomputation, **register-inequality fails the build**) + the battery round-cadence re-verification (per-pin declared values, never constants); **carrier-without-rationale = violation; drifted census = build failure**.
7. **§0 GAP phase tags stripped to the D24 set** (the window closes): "was W-ops" / "was W-ops END" / "was the A2/W-ops wire addition" / "was C1" / "was the W-ops compose half" dual-tags removed from all six rows.
8. **C7 row re-based:** 30 flat → **the 30-name census at `c15a629` = 24 routed + 6 exceptions** with the D29 lineage (24 R15-charter → 28 @ R22 pin → 30 @ R23 → the split) + the tsc-lockstep re-declaration law.
9. **Error-code row re-annotated (R24):** classification half COVERED **and W11-widened** (F1B-4; keyframe `TRACK_LOCKED` lockPreCheck; the UI's NOOP-benign classification per DECISIONS #25 ruling 6); the envelope coarseness stays the r1 gap.
10. **Zoom-ladder / ripple-toggle row (the C1-side re-homed halves):** still GAP, owner **S-ot**, crawl window — **re-verified absent at `c15a629`** (`rippleMode` internal `useState` at TimelineView.tsx:237; zoom continuous-clamped, no ladder); marked adjacent-to-but-not-carried-by the carrier-reduction work order.
11. **`onViewStateChange` row:** r1 additive kept; re-verified absent (internal `useTimelineZoom` option only).
12. **The D25-bridge row REPLACED by the carrier-reduction program (D26.3):** ONE S-ot work order (crawl window, gates nothing — K3 gates on the coverage vocabulary per D29); the props list with the **live-verified ZERO-upstreamed evidence** (TimelineViewProps enumerated; `cancelRegistry` internal at :715-719); the app rides **OT's own W11 injection points** (the `wire` prop — D30 R3 verbatim via EngineMount — + `onSaveScene`/`onLoadScene`); D30's W-G R10(h)-(j) separate + cross-referenced; **the DOM half re-pointed per D26.5** (`data-test=` 68/0 — coverage-of-existing-vocabulary; the three-way map; the mini census mapping row); structural-grammar half (crawl-tail) + token half (w1) stand.
13. **§0 ACCEPTANCE & TEST PLAN:** 489/117 → **536/174** (386+150 across the 59 entries); K3's DOM-structural ordering law re-pointed to the D26.5 mapping row + D30's W-C; K3's routed-verb machine-check = the D30 W-F coverage-gate port (D29.1b).
14. **§16 preamble + §16.5 preamble + §16.5 Headless API row:** pins re-based (R24 pin HEAD `ded43c4`/code `c15a629`, R23 `222532c` kept as lineage); 39/~7,700 → 40/8,604 + M17-M49 + the W11 layer; the §16.5 known-deltas C7 note → the 24+6 split; the Headless API row gains `WIRE_COMMAND_TYPES` (:182-213, tsc-lockstep) + the four W11 widenings as BASE, status CORRECTIVE kept (C7 still pending). §16.5's R15-era LOC/test counts kept for lineage (the R23 precedent's rule). Plus: the §0 law-register row's D22-freeze note extended "untouched by R23/R24" (constants live-verified).

**Companion edit (the one allowed):** `ui-mock/shell-mini/docs/OT-SEAMS.md` — a 6-line **R24 mapping note** in the header area: the census re-base (30 → 24 routed + 6 exceptions at `c15a629`, M49C, tsc-lockstep re-declaration); the D25-bridge citations → the D26 census discipline; the fork characterization → the converging mirror; the 24-name-era op-map rows remain the seam map. (The file's own stale "30-command (R23 census)" line left for its owning track, per the D23 mapping-note rule.)

---

## 3. REMAINS-OPEN (gaps verified still-open at `c15a629` — no repo landed them)

- **r1 family:** slip/slide/roll/rateStretch + wave-2 retime/freezeFrame/rangeRemoval (§16.5A op-port table stands); **C7** (30 prefixed names — CORRECTIVE stands; the split is a re-base, not a fix); the ~24-code error envelope; the element-level toggle wire pair; `onViewStateChange`.
- **S-ot / crawl:** the view-config surface (zoom-ladder config + ripple-toggle semantics — re-verified absent); the carrier-reduction props list (ZERO upstreamed — verified); the structural grammar half (track-head column / minimized strip / compact mode); the `data-test` census-gap closure + freeze ask.
- **w1:** the token half (OT is fixed dark only — `theme.ts` classic 1:1 constants).
- **K3:** the selection projection; the composed ripple family app-side; the DOM-structural three-way census.
- **Filing actions (cross-repo, not this file):** the app-side census register doc (CENSUS.md or `.agents/`) + the CI-gated register-equality script — **both absent** (verified); D30's W-C..W-G waves all pending app-side (per the app card's grep-verified signatures).

---

## 4. CROSS-FILE RESIDUALS (for the owning tracks/agents — NOT edited here)

1. **15-wire-protocol.md** (fleet-15 agent): its §0 BASE pin `222532c`/489 + the 30-flat census rows need the same D29 re-base (24+6; the W11 widenings; the recorder). My §0/§16.5 edits are coherent with whatever lands there.
2. **09-project-model.md / 18-ui-shell.md:** the stale app/OT/nle-ui pins + the "FORK retiring per D25" row (18:17) — the fleet-09/18 agents hold these; my app row cites the same census values they should adopt.
3. **00-master:** the D25-body R24 supersession note (ARCH-R24 F3) — owns the D25.2→D26 amendment text; my rows defer to it.
4. **mini's OT-SEAMS.md body:** the R19/R23-era "30-command" line + the 24-name-era op-map keying — mapping note added (my one allowed edit); the row-level re-key remains the mini/S-spec track's.
5. **The plan (S-app/S-ot rows) + battery_r24:** the census-register CI check, the routed/exceptions coherence check, and the register-equality re-computation — per D26/D29 consequences.
6. **The `≥2 waves behind` / `PORT-LOCAL props upstream` phrasing** may survive in other spec files (18, 09) until their agents land — flagged, not fixed (one-file scope).

---

## 5. POSTURE-COMPLIANCE NOTES

- **No normative damage:** §4-§15 bodies untouched (the contract text — hierarchy, drag laws, snapping, virtualization, zoom — all re-verified still-true at HEAD: drag threshold 5px strict `>`, zoom 50/0.1/100, indicator width 2px); the D22 freeze restated as standing law; the C7 CORRECTIVE status kept; the projector clauses (§16.5A) untouched.
- **Exact shas everywhere** (`ded43c4`, `c15a629`, `222532c`, `05584d8`, `c885ece`, `70e99f0`, plus the W11/W10F landing shas `56dcd8f`/`2acd8b6`/`b64ed5a`/`56f8634`/`fa0c478`/`c9b11e6`/`ca91223`/`c5b5b24`/`6bb01d3` — all from the OT card's landing list, none battery-typo-prone).
- **Honesty markers:** the app's 174 = static census (suite not run in the R24 sandbox, per the app card — marked in the row); the register's app-side home marked absent-pending, not claimed landed.

*No git commands run; no test suites run (counts carry the module cards' live-run authority); tree-clean posture on all repos.*

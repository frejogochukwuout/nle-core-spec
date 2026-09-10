# R24 fleet audit — `06-nle-ops.md` (NLE operations: the op families + the ops-domain register)

**Agent:** R24-3g (fresh context). **File owned:** `06-nle-ops.md` — the ONLY file edited. **Date:** 2026-09-08. **Mode:** audit + edit; zero git commands; read-only against all live repos.

**Evidence packs consumed:** `module-opencut-timeline.report.md` (the op-verb truth) + `module-nle-test-app.report.md` + `module-nle-engine.report.md` + `ARCH-R24-timeline-strategy-and-topology.md` (v2, D29.2/D26) + the R23 precedent `fleet-r23/06-nle-ops.report.md` + OT's own parity matrix (`.agents/OP-COVERAGE.md` at HEAD, located read-only in `/home/z/my-project/opencut-timeline/.agents/`).

---

## VERIFIED-STRONG (live checks against the R24 pin world)

- **Pins/counts, all five:** OT HEAD `ded43c4` = code tip `c15a629` (log shows the three docs/artifact commits; timeline-core/api verified directly in the tree) — report json re-read: **536/536, 59 milestone entries** (386 in-page + 150 real-mouse; M49C gate "PASS — 24 distinct command types … 6 documented exceptions"). Engine `5036387` (458 static-census per module card; **timeline.ts verified UNCHANGED — slip :4143 / slideItem :4246 / rollingTrimItems :2984 / rateStretchItem :3155 / freezeFrame :7185 / removeRanges :6910 / snapshotsEqual :1521, 7,502 LOC** — the engine's post-R23 deltas are composition-frame only). WDC `85b81b0` (759; soundtouch/varispeed present). App `c885ece` (174). nle-ui `fc4cc35` (674).
- **The op-parity audit (`ded43c4` = `.agents/OP-COVERAGE.md`, read in full):** 11/11 NLE edit verbs (insert, move, trim-via-patch-seam, split×3, delete, rippleDelete, duplicate, retime-math, snapping, undo/redo) each with engine op + wire verb + UI affordance + pins; omissions all documented scope cuts (clipboard/app-shell, audio-separation/WASM, effects-masks/compositor, graph editor/W8-f stretch, remove-media-asset/library); extensions: track lock (classic has NONE — grep-verified), lock-all/mute-all, loop region, rate+JKL, rippleDelete-first-class, save/load, wire error surface. M49C machine-verifies 24/24 routed.
- **The W11 line-drift (charge 1, corrected):** `timeline-core.ts` is now 2,890 LOC — duplicateElements `:1254→:1278`, toggleElementsMuted/Visibility `:1341/:1385→:1365/:1409`, setTracksLocked/setTracksMuted `:2060/:2108→:2101/:2145`, rippleDeleteElements `:1218→:1242`, preview/commit `:2242/:2288→:2271/:2317`, moveElements `:993→:1017`, updateElements `:1320→:1344`, UndoStack `:183-316`, TimelineCore `:317-2890`; api.ts case arms still exactly **30**, wire verbs `track.setAllLocked/:1605` + `track.setAllMuted/:1624`, `WIRE_COMMAND_TYPES` `:182-213`, lockPreCheck `:340/:849/:904`, CONFLICT overlap sites `:468/:540`. UNCHANGED rows: split/group-resize/group-move/ripple/placement/retime + keyframe-drag flick `:332`.
- **Milestone attribution corrected:** M46 = the applyBatch redo-outcome matrix + absent-field NOOP predicate (4 pins); **M48 = setTracksMuted + track.setAllMuted (5 pins, the F1C-1-normalized predicate)** — the R23 text had mis-filed setTracksMuted under M46 (report json test names verified).
- **The r1 families still OT-absent at `c15a629`** (grep over `src/lib/timeline/{ops,headless}`: roll/slip/slide/rateStretch-command/freezeFrame/rangeRemoval/syncLock = zero); the app's RR1-B speed-identity fix and the engine's RR1-A fade-clamp are both landed pre-R23 (per app/engine cards) — the retime wave's identity halves are BASE, not gaps.
- **C7 lineage re-based (D29.2):** 24 (R15 charter) → 28 (R22 pin) → 30 (R23) → **24 routed + 6 exceptions at `c15a629`** — the split is a machine-checked BASE fact, not a gap; the rename stays r1-END work.

## FIXED (edits applied to `06-nle-ops.md`)

1. **Status header** → the R24 re-baseline (OT `ded43c4`/`c15a629` 536/536; W10F + W11 + the parity audit; D29.2 C7 re-base; the D24 phase-vocabulary closure); R23/R22 kept as supersession records.
2. **§0 BASE OT row** → `ded43c4`/`c15a629` 536/536 (386+150/59); W10F rounds (M45 r1 + M47 r3 marquee math; M46 redo-outcome matrix), **M48 fix**, the W11 complete-UI round (attach/recorder/WIRE_COMMAND_TYPES/data.results/TRACK_LOCKED + W11-b dispatch migration + W11-f gesture commits + M49T/H/R/G + M49C); the census → 24 routed + 6 exceptions with the four-step lineage.
3. **§0 BASE row ADDED** — the op-parity audit (11/11 + extensions + the honest scope-cut rows). Engine row → `5036387` 458/458 (timeline.ts unchanged, line refs re-verified); WDC row → `85b81b0`.
4. **§0 GAP register:** r1 op-ports row re-checked (grep-verified absent; RR1-A/RR1-B noted as BASE); composed-ripple row re-checked (app-side still zero); **C7 row re-based** (lineage + cross-file residual note — spec 15 NOT edited, per the charge); error-envelope row gains the R24 annotation (TRACK_LOCKED on keyframe verbs + NOOP-benign UI classification; the ~24-code envelope still open); element-toggle row line refs refreshed; the D25-bridge pointer carries the D26 carrier-reduction re-cast.
5. **ACCEPTANCE** → OT 536 (386+150) / engine 458 / WDC 759 / app 174.
6. **§5.2A** (`:993→:1017`, `:1320→:1344`) + **§5.4 note 2** (`:1218→:1242`) refreshed.
7. **§10.4** → R24 re-verify @ `5036387` (line numbers UNCHANGED — noted why); 458/458; three-absent-families re-verified; §7 note re-verified. **§10.5** → R24 re-verify @ `c15a629` (the W11 drift corrected); blockquote gains W10F/W11/parity + the split census; **all drifted line refs refreshed**; two rows ADDED (the W11 wire-dispatch seam row; the W11-b/-f dispatch+gesture-commits row); the closing algorithm-home paragraph gains the parity certification sentence.

## REMAINS-OPEN (verified still-open at the pins)

- **r1 op-family ports** (wave 1 + wave 2) — OT-absent, grep-verified; engine = executable reference with fresh line numbers.
- **C7 rename** — the 30 prefixed names still on the wire at `c15a629`; r1-END.
- **Error-envelope coarseness** — the ~24-code table + F1B-15/18 residuals (enriched coverage noted, gap itself open).
- **Element-level toggle wire verbs** — absent from the 30-name union; ops live at `:1365/:1409`.
- **Composed ripple (K3)** + sync-lock (§6) — unstarted app-side / OT-absent.

## NOTES

- **Cross-file residual (C7):** spec 15's own census rows + §13.15 worklist still carry the R23 30-name flat framing — owned by 15's fleet agent this round (D29.2 fleet wave); noted in-file without touching 15.
- **Phase tags:** every active "(was W-ops)" annotation stripped; the surviving "GAP-W-ops" mention is explicitly labeled the LAW-NET register's historical row-group name. Old pins/counts remain only inside supersession records (posture law).
- No test suites were re-run by me (the OT json was re-read live; the module cards' live runs are the count authority); no git commands.

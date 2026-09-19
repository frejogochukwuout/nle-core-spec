# Scout — nle-test-app (the app) — Fleet R25

- **Scout:** read-only module ground-truth agent (R25). Sole write = this file. No repo modified, no commits, no worklog appends.
- **Pins:** app HEAD `64fb0ab` (main == origin/main, fast-forwarded from R24 pin `c885ece`); consumer pins at HEAD: nle-ui `3026099`, nle-engine `5036387`, web-daw-core `85b81b0`, OT lock-copy `c15a629` (re-verified byte-exact below).
- **Note on round names:** the app's internal round is **R9** (its own worklog/commit vocabulary); the fleet's R24 pin `c885ece` = app-R9 mid-flight (post W-B). The fleet's "D30 waves W-C..W-G" are the app's R9 W-C..W-G.

## App update card (R25, @ 64fb0ab)

| Item | R24 (@ c885ece) | R25 (@ 64fb0ab) | Delta |
|---|---|---|---|
| HEAD | `c885ece` (R9 W-B) | `64fb0ab` (R9-close) | +9 commits (app-R9 total: 12, `d5539ba..82e38d8`) |
| Tests | 174 (static census; suite NOT run at R24) | **206 live-run** | +32, now LIVE-verified |
| Port census | 39 mirrors = 32 zero-action + 7 carriers; 1 OT file missing | 40 mirrors = **35 zero-action + 5 carriers**; 0 missing | carriers 7→5; zero-action 32→35 |
| `.agents/` | absent (OVERDUE) | **still absent** | 2nd consecutive round overdue |
| D30 waves done | W-A, W-B | **W-C, W-D, W-E, W-F, W-G(fired) + 9-G1 REV + close** | all waves landed |
| CI | green (174) | green (206; 7 failed runs during the detached-submodule incident, recovered by clean fast-forward — zero loss, `64fb0ab`) | — |

## Commits since R24 pin c885ece

All 9 (`git log --oneline c885ece..HEAD`), wave-tagged per the app's D30 design (docs/design-r9-d30.md):

1. `f681d34` **R9 W-C — THE INTERLOCKED FIVE** (the wire-dispatch port): `hooks/use-wire-dispatch.ts` **NEW** (byte/mech-exact @ c15a629) + `TimelineView.tsx` 3-way merge (git merge-file: 6 port-local P-layers preserved × 8 upstream W11 zones adopted, 3 both-sides conflicts) + `use-timeline-actions.ts` 3W (M28R jkl ladder, `setLoopFromSelection`/`clearLoopRegion`, dispatch re-base of `performElementDelete`, port-local ⇧L/⇧J shuttle, S2 filterEditable) + `use-element-interaction.ts` + `TimelineToolbar.tsx` adopt-wholesale + `use-keybindings.ts` K1/K5 (jkl rows; r/⇧R withheld to W-D w/ yield-set) + the W11 CSS block (token-adapted into timeline-port.css) + **EngineMount: page-owned wire** (mint + carry + `engineService.attachWire` registry, no window global). 180/180 + tsc + boundary.
2. `78e7283` **R9 W-D — the cross-repo keymap lockstep** (the keymap surgery): nle-ui → `2646d80` (the package's own W-D: yield-set now carries `r`, shortcutMap truth rows, Viewer `data-transport`, StatusStrip storageLabel, Inspector Link toggle, ColorPage Brightness/Hue) + app half: `use-keybindings` K2 un-withheld (r/⇧R loop rows) + the **Z4 `[data-transport]` keymap guard** (the W8 playhead-guard's twin) + truthful storage labels. 185/185 + 674/674 + tsc.
3. `b40216e` **R9 W-E — app seams**: the **loop TWO-WAY bridge** (engine region = truth; tick-domain echo keys, identity-stable value-compare mirror writes, null-region keeps the band + flips loopEnabled, fresh-core seeding on scene switch); **R7 Save/Load affordances — the W2.3 debt CLOSED** (toolbar save/load → `saveSnapshotFile`/`loadSnapshotFile` + toasts + hostile-JSON rejection); **Z2 grade→export** (deliverService scratch final-pass — what you grade is what you get). 189/189 + tsc + boundary.
4. `8f22236` **R9 W-F — THE COVERAGE GATE**: `src/wire-coverage.test.tsx` (M49C's law, app-flavored) — drives ALL 24 routed wire verbs through the REAL mounted UI (transport 4, edits 6, bookmarks 3 incl. moveBookmark DRAG, loop 1, updateElements patch seam, 7 track verbs, element-drag move commit + pool DnD insert commit) and machine-asserts ACCUMULATED ⊇ `WIRE_COMMAND_TYPES` − 6 documented exceptions. **The "fully test every timeline ops" claim is now machine-checked.** + the jsdom DragEvent trap solved (MouseEvent-typed drag + defineProperty dataTransfer). 197/197.
5. `91f6c45` **R9 W-F/Z6 — the app-flow dead-zone sweep** (audit 9-A2's P-series): scene-create/delete, ⇧M marker removal, Viewer transport, scrub-row pointer seek (rect-stubbed), the port toolbar EDIT buttons through the wire, ⌘S real flush, ColorPage Brightness/Hue, volume-line drag COMMIT. 206/206 + tsc.
6. `0328bc0` **R9-REV disposition** (9-G1 fresh-context review, PROCEED-WITH-FIXES): **P1-1 the Z4/W8 guard drops the `!shiftKey` carve-out** (both arrow variants surface-owned; upstream's own W8 guard has the same hole — filed R9-c upstream-back, OT `fdb771c`), P2-2 the S1 stateless-ladder comment law, P3 gate ergonomics / LIFO law frozen / rect stubs. 206/206 + 674/674 + tsc.
7. `c7cc1ae` **R9 close** — worklog entry: 11 R9 commits, 206/206, the gate, the CRs fired, LIVE browser validation (rate segments, r-key loop band, label locks, save/load live, console clean).
8. `82e38d8` **R9 close** — vendor/nle-ui → `3026099` (wrap artifacts: DECISIONS #30, the R9 PLAN section, the R9-close HANDOFF, SKILL R9 laws — all in the **nle-ui repo's** `.agents/`).
9. `64fb0ab` **R9 close** — the detached-submodule incident entry: the package's 6 R9 commits were made on vendor/nle-ui's DETACHED HEAD; push silently advanced stale local main; 7 app CI runs red; recovered by clean fast-forward `git branch -f main 3026099` (pin is an ancestor, no force push); law recorded in SKILL.

**W-G (CR filings) — fired app-side on 2026-09-07 ~23:42-43:** OT `.agents/PLAN.md` +4 attributed entries (`c37844f`: spec-queue endorsement, keyframe-authoring surface gap, upstream-back candidates incl. the playhead-guard hole + the DragEvent trap, WIRE_UI_EXCEPTIONS as a shared constant) + the R9-c amendment (`fdb771c`); nle-engine +4 entries (`3989506`: transform sidecars, maintainPitch threading, scene-grade promotion, honest-preview widening); web-daw-core: none (honest — audio surfaces verified real). **BUT the fleet's ARCH-R24 F1 amended filing list was written 2026-09-08, AFTER the app fired** — the as-filed engine entries do not reflect the amendments (R9-b maintainPitch filed as a proposal vs "closed-LANDED"; R9-c scene-grade promotion filed vs "NOT filed — the decline is the law"). A reconciliation disposition is owed at the engine queue.

## .agents state

- **`.agents/` does NOT exist in the app repo — STILL OVERDUE, 2nd consecutive round.** No git history for any `.agents/*` path (`git log --all --diff-filter=A` = zero). The fleet HANDOFF's next-session step (0) — "create the app's `.agents/` (HANDOFF + PLAN minimum — OVERDUE, before W-C: the cross-repo lockstep needs it)" — was **not executed**, even though W-C..W-G all ran without it.
- The app's de-facto state story: `worklog.md` (R9-open / R9 / R9-close entries — detailed, current, honest) + `README.md` (which is itself stale: "30 glue-law tests", nle-engine/WDC "not imported yet" — both false now) + the **nle-ui repo's `.agents/`** (README:4 says app docs live there; its HANDOFF R9-close carries the app-relevant landmines: jsdom DragEvent trap, LIFO accumulator law, per-core wire mint, the r-key cross-repo lockstep, virtualization, empty-track bridge). So the *content* exists, but in the wrong repo per the fleet order.
- **K3's store/policy halves (the useMini-family re-expression): NOT STARTED app-side** (zero `useMini`/`law-net`/`e2e` hits in src/, docs/, worklog — same as R24). Still future work, now unblocked per the fleet HANDOFF.

## Test counts

**LIVE RUN (vitest 5, `npx vitest run`, after `npm ci` + submodule clones populated at the exact recorded pins):**

| File | Tests |
|---|---|
| GluedShell.test.tsx | 92 |
| audioService.test.tsx | 40 |
| sceneBridge.test.ts | 25 |
| persistenceService.test.ts | 17 |
| deliverService.test.ts | 17 |
| engineSeam.test.ts | 7 |
| **wire-coverage.test.tsx (the gate)** | **8** |
| **Total** | **206 passed (206) / 7 files / 40.3s** |

Also re-run live: `tsc --noEmit` = clean; `npm run boundary` = OK. R24 could only static-census 174 (no node_modules); R25 closes that authority gap. Method note: submodules were absent in this sandbox too; I populated `vendor/nle-ui`/`nle-engine`/`web-daw-core` at their already-recorded gitlink SHAs from the local sibling clones (network clone needs a PAT) — `git status` stays clean; no tracked file touched.

## Port census re-verification (recomputed live vs `git archive c15a629`)

Method: OT `src/components/timeline` @ `c15a629` extracted and diffed per-file against app `src/timeline-port`, normalized only on the `@vendor/timeline` ↔ `@/lib/timeline` import specifier (the census law's normalization).

**OT @ c15a629 = 40 files / 8,604 LOC. App port = 41 files / 9,312 LOC (40 mirrors = 8,899 + EngineMount host = 413).**

| Class | R24 | **R25** | Files |
|---|---|---|---|
| Byte-exact | 7 | **7** | index.ts, theme.ts, use-committed-ref.ts, icons.tsx, hooks/use-cancel-interaction, use-edge-auto-scroll, use-scroll-position |
| Mechanical-exact (specifier-only) | 25 | **28** | + the W-C/W-D convergences: **TimelineToolbar**, **use-element-interaction** (former carriers), and the NEW **use-wire-dispatch** (was OT-only/missing) |
| Zero-action total | 32 | **35** | — |
| Carriers (documented diff) | 7 | **5** | ↓ |
| OT-only missing | 1 | **0** | use-wire-dispatch landed |
| App-only host | 1 | 1 | EngineMount.tsx (413 LOC) |

**The 5 remaining carriers (raw normalized diff-lines, each port-local documented in-file):**
1. `TimelineView.tsx` (255) — the 3W merge residue: R5/D25 selection bridge ×2 (initialSelectedIds/onSelectionChange + the R7 reverse bridge), zoom bridge, R3 confirmDelete, D29 W2.2 effects-drop MIME layer, EMPTY_CONTEXT_ITEMS, #timeline-scroll.
2. `hooks/use-timeline-actions.ts` (160) — port-local shuttle (⇧L/⇧J fixed 2×, kept per D30 R5), R3 performElementDelete extraction (confirm-gate deferral, dispatch re-based: `timeline.delete`/`timeline.rippleDelete`), S2 filterEditable.
3. `hooks/use-keybindings.ts` (77) — port-local: ⇧L/⇧J rows, R3 undo/redo removal (shell owns ⌘Z/⌘Y), `[data-modal]` suppression, **Z4 `[data-transport]` guard with the 9-G1 P1-1 fix** (no shiftKey carve-out; upstream-back filed R9-c).
4. `TimelineContextMenu.tsx` (13) — PL keep: bf9be13 functional `setPos` (the React nested-update CI-red class), fully commented.
5. `hooks/use-playback-ticker.ts` (10) — PL keep: S1 doc comment + import-form delta.

**Carrier count moved 7 → 5 — exactly the declared irreducible set** ("the 3 merges + ContextMenu + ticker", worklog R9). Zero new divergences; no file moved exact→diverged; the R24 missing-file row is closed. Mirrors LOC 8,250 → 8,899 (+649 net adoption; now +295 over OT's 8,604 = the preserved port-local stack, all documented). **Lock-copy re-verified: `vendor/nle-timeline` = byte-exact `c15a629` minus `testing/`, 0 diff / 0 missing / 0 extra, 14,912 LOC both sides** (UPSTREAM.lock.json pins `c15a629`).

**Census-law enforcement gap (finding):** D26/§2A.7 says register-inequality "fails the app build", "CI-enforced app-side". The app's `ci.yml` runs typecheck/test/build/boundary/storybook-CSS-gate only — **no census script or test exists** (scripts/ = dev3000.py, check-boundary.mjs, bootstrap.sh). The census is battery-verified (this card) but NOT machine-enforced app-side as the ruling claims. That enforcement mechanism is still owed.

## Edit-mode census (10-row table) — per DaVinci trim-mode taxonomy, in the APP, end-to-end

| # | Mode | Wired? | What's actually wired (component → engine call) |
|---|---|---|---|
| a | **Roll** (edit-point between 2 clips) | **NO** | No engine op exists (grep: "roll" = undo-rollback contexts only; `trimElements` is single-element). nle-ui's `ToolId` includes `'roll'` but the tool system is edit-inert (9-A2 defect #5 "tool keys V/B/T/Y/U/R edit-inert"; mock Timeline has zero tool-conditional behavior) and the app mounts the port, which has no tool concept. |
| b | **Ripple trim** | **PARTIAL — keyboard only** | Port: ripple MODE toggle (toolbar `toolbar-ripple-mode`) routes **delete only** (⇧Del/ripple-mode → wire `timeline.rippleDelete` → `core.rippleDeleteElements`); edge-drag trims never ripple (zero ripple refs in the port hooks). Shell path: `[`/`]` = non-ripple trim-to-playhead; **⌥[`/⌥] = RIPPLE trim** → `store.trimToPlayhead(edge,true)` → router → `engineService` case `trimToPlayhead` → one `core.updateElements` batch incl. downstream-shift patches (ONE history entry) — **pinned** (GluedShell 361/368). |
| c | **Slip** | **YES — keyboard, engine-true** | `,`/`.` (⇧ = ±10f, spec 16 §3.4) → `store.slipNudge` → router dispatch `slip` → `engineService` case `slip` → `core.updateElements` (trimStart±δ/trimEnd∓δ, source-window guards, A/V-linked partner rides, one batch). ⚠ no app-side pin (nle-ui's 674 pin the mock math only) — a pin gap, not a wiring gap. |
| d | **Slide** | **NO** | No op anywhere; `ToolId 'slide'` inert (as (a)). |
| e | **Insert edit** | **YES (2 of 3 facets), non-rippling** | (1) Split-at-playhead: S/Q/W keys + toolbar ×3 + context "Split" → wire `timeline.split` → `core.splitElements` (gate-pinned). (2) Pool→timeline: AppShell `mediaDragSource` = EngineMount's `timelineDragSource` → port DnD → wire `timeline.insert` strategy `"explicit"` at drop point → `core.insertElements` + placement (5 strategies; **overlap REJECTED-not-shifted**, fall-through/new-track; new-track drop = core-direct, the documented exception) — gate-pinned ("pool DnD insert commit"). (3) Source-mode `,`/`.` rows: **NO** — no source viewer; those keys ARE slip (deliberate spec-16 divergence). No ripple-insert (nothing downstream-shifts on insert; "insert-push RETIRED" per the OT seam law). Pool "Insert at Playhead" menu = honest disabled mock. |
| f | **Overwrite** | **NO (as a mode)** | Placement policy is REJECTED-not-shifted (`placement/index.ts` header law); `moveElements` validates/locks but has no overwrite-collision semantics. No overwrite verb, no mode UI. (`updateElements` patches being overwrite-only per-field is patch semantics, not an edit mode.) |
| g | **Replace** | **NO** | Engine: "media replace is not implemented" (upstream `drag-drop-controller.ts:355`, documented omission). No verb, no UI. |
| h | **Append-at-end** | **NO** | No append verb/affordance; DnD places at the pointer; pool insert menu disabled (as (e)). Closest = dragging to the end. |
| i | **Ripple overwrite** | **NO** | Nothing (no overwrite, no ripple-insert composite). |
| j | **Fit-to-fill** | **NO** | No verb. Raw material exists — speed/retime (Inspector speed → router `patch.speed` → engine retime, rate clamp [0.01,5], F1/S4-round) — but no duration-driven auto-fit mode. |

**Tally: 2.5/10 DaVinci modes wired (split-insert, DnD-insert, slip; ripple-trim keyboard-only). Roll/slide/overwrite/replace/append/ripple-overwrite/fit-to-fill = absent.** This is BY CONSTRUCTION, not regression: the app mirrors OT's canonical tree, whose verb set is opencut-**classic's** 11-verb taxonomy (insert/move/trim/split×3/delete/ripple-delete/duplicate/retime/snapping — OT's own parity audit `.agents/OP-COVERAGE.md` @ `ded43c4`: "11/11 classic verbs ported", and "we exceed classic on: locking, loop region, playback-rate/JKL, ripple-delete, save/load"). The DaVinci trim-mode surface is an **OT-side engine gap**, reachable only through the cross-repo filing protocol — nobody has filed it.

## Seam evidence (better integration since c885ece? — YES)

1. **The wire-dispatch seam (W-C):** EngineMount mints a page-owned `HeadlessTimelineApi` per core (attach option — one engine, no parallel instance), registers it on `engineService.attachWire` (identity-guarded detach, NO window global), carry-forwards the coverage Set across scene switches; `use-wire-dispatch` classifies results (NOOP benign; TRACK_LOCKED/… light the `data-test="wire-error"` chip).
2. **The coverage gate (W-F):** `wire-coverage.test.tsx` — every routed verb driven through the real mounted UI (toolbar/keymap/labels/context/gesture sims incl. the solved jsdom DragEvent trap); final test asserts ACCUMULATED ⊇ `WIRE_COMMAND_TYPES` (30 consts, 24 routed − 6 exceptions) — the user directive "fully test every timeline ops" is now machine-checked, with the LIFO-afterEach law frozen in-file.
3. **The keymap lockstep (W-D + 9-G1):** nle-ui's yield-set (`engineOwnedPlain` 19 keys + cmd set, shifted-yields) vs the port's capture keymap — one key, one owner, cross-repo-pinned (the r-key landmine recorded in nle-ui SKILL). The Z4/W8 guard's shiftKey hole was found AND fixed here first, then upstream-back-filed (OT `fdb771c` — the twin landed upstream).
4. **Loop two-way bridge (W-E/R4):** engine region = truth, tick-domain echo keys both sides, identity-stable value-compare mirror writes (the setLoopRegion no-same-value-NOOP trap documented), fresh-core seeding.
5. **Save/Load (W-E/R7):** the W2.3 debt closed — toolbar → `saveSnapshotFile` (blob→File→`loadSnapshotFile` REAL round-trip pinned; hostile JSON rejected).
6. **Grade→export (W-E/Z2):** deliverService's scratch final-pass = what you monitor is what you export.
7. **Dead-zone sweep (W-F/Z6):** the 9-A2 unexpected-dead findings closed/pinned (4 closed by waves, 4 pinned honest, 1 CR'd per worklog R9).
8. **Live validation:** real-browser pass claimed in the worklog (rate segments, r-key loop band, locks, save/load live, console clean, screenshot `download/r9-live-w11-surfaces.png`) — the artifact is NOT present in this sandbox (previous container); claim carried, not re-verified.

## Queue (app-side, at 64fb0ab)

1. **The `.agents/` bootstrap (HANDOFF + PLAN minimum)** — OVERDUE ×2 rounds; the fleet cross-repo lockstep protocol expects it before further cross-repo waves.
2. **Census-law app-CI enforcement** (D26/§2A.7 register-equality fails-the-build) — ordered, not implemented (no script/test).
3. **Engine-queue reconciliation:** the as-filed R9-b (maintainPitch) / R9-c (scene-grade promotion) entries vs the ARCH-R24 F1 amended dispositions (closed-LANDED / decline-is-the-law) — the filings predate the amendment.
4. **The fleet's five cross-repo filings — partially landed:** engine rows ✓ (3989506); nle-ui DECISIONS #30 ✓ but the C0 row + D30 W-D edits filing ✗; OT got the app's 4 CRs ✓ but the ordered carrier-reduction work order + data-test stability contract ✗; **WDC waveform-contract promotion ✗ (WDC `.agents/` has only SKILL.md — no HANDOFF to promote into)**; app `.agents/` ✗.
5. **K3's store/policy halves** (useMini-family re-expression) — unblocked, not started.
6. **Carried out-of-scope:** frozen-grammar re-pin batch F1-F4 (user-gated), U12 real media decode (N5, r4, user-gated), fcpxml export (spec-10, page-mock), LUT/wheels GPU fidelity (engine CR path), the K2 census registration (spec-side).
7. **README refresh** (30-test/596-test/"not imported yet" staleness) — cosmetic but it's the repo's front door.

## Sealed-vs-in-flight verdict

- **SEALED (seam-grade, machine-checked):** the D30 absorption itself — W-C/W-D/W-E/W-F all landed, reviewed (9-G1 PROCEED-WITH-FIXES, both P1s fixed), and closed (R9-close, CI green, incident recovered). The port census is at its **declared irreducible carrier set (5)**, zero-action 35/40, zero missing, lock-copy byte-exact, no new divergences; the coverage gate machine-checks the "every timeline op" claim; 206/206 + tsc + boundary re-verified live by this scout. The user's "mostly considered sealed" is **accurate for the seam machinery** and the round demonstrably moved toward BETTER seam integration (wire registry, two-way loop, real save/load, grade→export, cross-repo key lockstep with an upstream-back fix).
- **IN-FLIGHT (open items that keep it un-sealable as a product surface):** (1) `.agents/` overdue ×2; (2) census-CI enforcement owed; (3) the W-G filings need the F1-amendment reconciliation; (4) the fleet's five cross-repo filings are ~2/5 landed; (5) K3 halves untouched.
- **HONEST SCOPE CEILING (not a defect, but the user should know):** the app's edit surface = opencut-classic's 11-verb taxonomy, not DaVinci's 10 trim modes — **roll, slide, overwrite, replace, append-at-end, ripple-overwrite, fit-to-fill do not exist end-to-end** (ripple trim exists keyboard-only; slip is engine-true but unpinned app-side). Because the app is a census-governed mirror, these can ONLY arrive as OT engine ops + wire verbs + upstream UI — an OT-side feature queue item that no one has filed yet.

---

*R25 scout — read-only; single artifact: this file. Live verifications: HEAD/pins via git; census + lock-copy via `git archive c15a629` extraction + specifier-normalized per-file diff; suite via live vitest run (206/206, 7 files) after populating submodules at their recorded gitlink SHAs from local sibling clones (no tracked state changed); boundary + tsc re-run green; keymap/verb/edit-mode claims traced to source (use-keybindings.ts rows, engineService.ts dispatch cases, useUiStore slipNudge/trimToPlayhead routing, placement/index.ts overlap law, headless/api.ts WIRE_COMMAND_TYPES).*

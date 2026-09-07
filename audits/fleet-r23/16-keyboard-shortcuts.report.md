# R23 FLEET AUDIT — 16-keyboard-shortcuts.md

**Agent:** R23-fleet-16 (one file, fresh context). **Date:** 2026-09-07 (the fleet's pin day).
**File audited:** `nle-core-spec/16-keyboard-shortcuts.md` (2383 → 2399 lines after this pass).
**Repos read (features verified by code, counts trusted per the round's rules):** mini (`ui-mock/shell-mini` — `src/hooks/useKeys.ts`, `App.test.tsx`, `docs/CORE-SEAMS.md`, `docs/LAW-NET-INVENTORY.md`), OT @ `222532c` (`src/components/timeline/hooks/use-keybindings.ts`, `scripts/m24-keyboard-real-mouse.mjs`, `scripts/m28-actions-real-mouse.mjs`), app @ `70e99f0` (`src/timeline-port/hooks/use-keybindings.ts`, `use-timeline-actions.ts`, `engineService.ts`, `GluedShell.test.tsx`, `docs/design-jkl-audio-follow.md`), nle-ui @ `85dcf57` (`src/hooks/useShortcuts.ts`, `src/lib/shortcutMap.ts`, CheatSheet.tsx), variants (1470 — `src/hooks/useShortcuts.ts`, `src/lib/shortcutMap.ts`), engine @ `b8c6f88` (§17's rows re-verified), `.agents/SPEC-REVISION-CANDIDATES.md` (§C C22), `00-master-spec.md` (the pin canon), `IMPLEMENTATION-PLAN.md` + ARCH-R23 (the rulings).

---

## VERIFIED-STRONG (checked live, kept as-is or re-cited)

1. **Appendix A's 181-row registry** — counted exactly 181 `kbd-` rows; the 13-category TL;DR arithmetic (181 bindings / ~110 unique actions) checks out. The C22 ledger does live in `SPEC-REVISION-CANDIDATES.md` §C.
2. **The mini's editing-keys census** — `useKeys.ts` reads exactly Space/S/[/]/Del/Backspace/±(=,+,-,_)/0/Home/Esc + ⌘Z/⇧⌘Z + the form-control skip (INPUT/TEXTAREA/SELECT/contenteditable — R18k adds SELECT) + the C16 `e.repeat` gate + the C1 native-button yield + the M2 dragActive interaction lock (Esc cancels drag first). The LAW-NET rows exist as pinned tests: `App.test.tsx`'s "PR69 keyboard law (C1/C16/C46/C49)" (5 tests) + C2/C46 in `Timeline.test.tsx`; CORE-SEAMS **S9** states the seam exactly as the spec claims ("MiniShell OWNS the editing keys incl. undo per spec 14 C1(f)").
3. **The app's JKL state (W3, the round's named new work)** — verified end-to-end: the port keymap's ladder (`use-timeline-actions.ts`: 1×→2×→4× inside 500 ms, direction change restarts, ⇧L/⇧J fixed 2×, K pauses with rate persisted), `core.setPlaybackRate` driven directly from the capture-phase keymap, the W3 audio half (audioService composes varispeedRate = elementRate × rate; one stop+reschedule per rate change; r<0 silent reverse — design v1.1 + pins at `3f351bc`), the routed `setShuttle` round-trip (`engineService.setPlaybackRate` — contract surface, no production caller), and the S1 pin in `GluedShell.test.tsx:427`. 117/117 at `70e99f0` (confirmed via log).
4. **nle-ui's keymap surfaces** — `useShortcuts.ts` + `shortcutMap.ts` (53 rows) + the auto-generated CheatSheet (§7.3/§8.6's single-source discipline, live) + the D22b engine-owned yield law incl. the W3/F5 shifted-key yield fix (⇧J/⇧L/⇧Backspace/⇧←→ yield to the port).
5. **The variants' page-key grammar** — ⌘1-⌘5 (Edit/Color/Deliver/Audio/FX), the FX tool joins the radio with no plain key (R23-WA, DESIGN-R23 D-A1/ruling 18), Escape exits the FX tool/audio focus; 56 cheat-sheet rows (adds ⌘5 + the source-mode `,`/`.` insert/overwrite).
6. **OT's keyboard tree (the new census input)** — the canonical `use-keybindings.ts` (24 rows, incl. the ctrl+z/⇧ctrl+z/ctrl+y undo rows OT keeps), M24 (7 real-keyboard tests) + M28's keyboard half (k/l/j, ⇧arrow, q/w, Enter, Backspace, n, ⌘a, Escape, ⌘d, ⌘y/⌘⇧z).
7. **§17's engine verdicts** — all six rows re-verified at `b8c6f88`: still SPEC-ONLY (the only keydown listeners in the engine tree are the shadcn UI kit's sidebar/carousel, not the NLE); the rate machinery exists (`setPlaybackRate` at player.ts:994-995 + the clock's ratechange forwarding).

## FIXED (stale BASE/claims → live truth)

1. **§0 BASE pin:** app `e662759` 83/83 → **`70e99f0` 117/117**; "JKL/split/delete/home per the OT Wave B migration" → the full three-part surface (the 24-row port keymap with the undo rows REMOVED per D22b; the W3 JKL half; the shell-owner undo law through the router facade).
2. **§0's C22 claim:** "~54 of ~178 rows implemented" (stale on BOTH sides) → the ledger's own "42→~60" + the counted live ledgers: **53 rows (nle-ui) / 56 (variants) of the 181-row Appendix A universe**.
3. **§0 BASE expanded to the five live key surfaces** (was 3 bullets): app / mini+registers / nle-ui / variants / OT — each with the file-level census (charge e).
4. **§0 ACCEPTANCE & TEST PLAN:** "app 83" → **app 117; mini 355; nle-ui 648; OT's M24/M28 at `222532c`**.
5. **§17 code references:** file:line refresh (`playback/player.ts:652` → `src/lib/nle/playback/player.ts:994-995`; `headless/api.ts:767/893` → `793/919`; `run-nle-tests.mjs:122` → `167`; `page.tsx` → `:5794`) + the note that the engine's only keydown sites are the UI kit.
6. **Status line:** R23 audit round appended (the re-pin, the re-tags, the census, the new gap).
7. **Appendix C:** an R23 status note — the "0 written" column tracks the planned Playwright enumeration corpus (still true as a named suite); the crawl's keyboard NETS are real and green in their owner repos (the app S1/S2 pins, the mini's LAW-NET, nle-ui 648, the variants 1470, OT's M24/M28).

## GAP re-check (charge b) — flips, re-tags, adds

| Row | Old tag | New (D24) | State |
|---|---|---|---|
| The crawl's editing keyboard surface + undo/redo (C1(f), MiniShell owns the keys) | C1 | **K3** (dual-tag kept) | OPEN — narrowed: the app port keymap, the W3 JKL ladder, and the D22b undo law LANDED; what remains is the mini's key laws re-expressed app-side over the canonical tree (C1/C16/C46/C49 + the history family). The K3↔D25 ordering law cited. |
| **NEW** — the OT-side keyboard-laws census | — | **K3** (disposition: the D25 bridge + K3) | OPEN — three canonical-map divergences vs this spec: **K** (OT/app: play/pause TOGGLE vs §3.1 pause-only), **B** (OT/app: bookmark-at-playhead vs §3.2 razor), **J/L** (OT: discrete ±1 s jumps vs §3.1 shuttle); the app fork's keymap deltas = the bridge's keyboard-class PORT-LOCAL set; the mini's **C16 `e.repeat` gate is absent from the OT/app keymap** (a held S machine-guns splits there — live-proven in the mini). |
| Keymap long tail | R-polish | **r5** (dual-tag) | OPEN — 53/56 of 181 rows implemented; acceptance re-cited to the live counts. |
| W-ops keymap surfaces | W-ops | **r1** (dual-tag) | OPEN — wave 1/wave 2 families named; the S-package r1 queue row cited. |
| **ADDED** — the D25 bridge's view-config halves (was spec-14 §4.1) | (orphaned in this file) | **the D25 bridge** (S-ot) | OPEN — zoom-ladder config + ripple-toggle semantics exposure; the keyboard-side consumers are §3.8's ± rows + §3.2's Option+R. (Charge c: the retired spec-14 §4 row now exists in this §0.) |
| **ADDED** — the page-key grammar reconciliation | — | **K3** + spec-side edit | OPEN — the live ⌘1-⌘5 grammar vs §3.8's ⌘1-⌘4; the ⌘3 collision (Effects workspace vs Deliver) is the pending reconciliation (R23-WA registered ⌘5 only). |

**Retired spec-14 §4 keyboard rows verified present in §0 (charge c):** C1(f) → the K3 row ✓ (was already present, now tagged); the OT-side view-config halves → the D25-bridge row ✓ (ADDED this pass — was missing); the W-ops keymap rows → the r1 row ✓ (present, re-tagged); the C22 long tail → the r5 row ✓ (present, re-tagged). The GAP-W-ops compose-at-crawl half is reflected in Appendix B's scheduling note (K3 composes over `timeline.trim`/`rippleDelete`; r1 graduates the families).

## REMAINS-OPEN (the honest register, post-pass)

1. **The K3 re-expression** — the mini's key laws as app-side tests over the canonical tree (incl. C16's `e.repeat` gate, which no OT/app surface carries today).
2. **The K/B/J-L divergence disposition** — the D25 bridge must decide: upstream the app's JKL rows as OT props (or keep app-side), and reconcile this spec's K/B rows with the opencut-classic map (or register the deviation in SPEC-REVISION-CANDIDATES).
3. **The ⌘3 page-key reconciliation** — spec 16 §3.8 vs the live Deliver page; the variants' wrap note promised the registration at wrap (not found in SPEC-REVISION-CANDIDATES at HEAD — outside this file's edit scope).
4. **The r5 long tail** — ~128 of 181 rows (the C22 remainder: S/Q/W already live app-side; the ⌘L family, ⌥M dialogs, ⌥1-4, F1, the effects/keyframe clusters).
5. **The r1 keymap surfaces** — no keymap rows exist for the W-ops op families yet (the mock's tool keys V/B/T/Y/U/R select tools; the ops themselves are r1).
6. **C20 (K-then-J/L ½× slow-mo)** — still unimplemented everywhere.

## NOTES

- **Preserved:** the §0 triad's shape (BASE/GAP/TEST PLAN); all historical contexts (R15 amendments, the Round-7 §8.3 note, the A1/A6/N8/N11/N12/N15 resolutions, the 181-binding arithmetic, the §6 conflict table, §11's reconciliation) — untouched.
- **Cross-ref sweep:** every "spec 14 §…" citation in this file is now either re-based (§13, Appendix B, §0's register line, the cross-reference list entry) or an intentional lineage reference with the redirect stated. The 17-file corpus sweep (00-master §6 step 1) counts this file as done.
- **Edits are prose+tables only** — no git commands, no test runs (features verified by reading code at the HEADs; counts taken from the round's trusted set: app 117 / OT 489 / nle-ui 648 / mini 355 / variants 1470 / engine 440).
- **One judgment call flagged:** I kept §3.1's `K` = pause and §3.2's `B` = razor as the SPEC rows (spec wins over the live opencut-classic map, per this spec's own normative posture) and registered the divergences as the new K3/bridge gap row rather than amending the tables — the disposition belongs to the D25 bridge + the seal round, not a unilateral spec flip.

## RETURN (the short form)

(1) **BASE fixes:** the app pin e662759/83 → 70e99f0/117 + the three-part key surface; the C22 "~54 of ~178" → 53/56 of 181 (both sides were stale); §0 expanded to the five live key surfaces; §17's engine file:line refresh; the acceptance line re-pinned.
(2) **GAP flips/re-tags/adds:** C1(f)→K3 (narrowed — the port keymap/W3/undo law landed, the re-expression remains); R-polish→r5; W-ops→r1; NEW rows: the OT-side keyboard-laws census (the K/B/J-L divergences + the missing C16 `e.repeat` gate + the fork's keymap deltas = the bridge's PORT-LOCAL set), the D25-bridge view-config row (the retired spec-14 §4.1 row, was missing), the page-key ⌘3 reconciliation row.
(3) **Open items:** the K3 re-expression; the K/B/J-L divergence disposition at the bridge; the ⌘3 reconciliation; the r5 long tail (~128 rows); the r1 surfaces; C20 ½× slow-mo.
(4) **Verdict:** VERIFIED-STRONG on the binding tables and law registers; the §0 was two pins and one census stale — now re-based to the live five-surface world with the D24 tags and the OT-side census registered; the spec is current as of 2026-09-07.

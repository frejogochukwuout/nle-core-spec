# verify-crossfile — R25 cross-file consistency sweep (fresh context)

**Agent:** CROSS-FILE CONSISTENCY VERIFICATION (R25 round). **Scope:** 00/05/06/09/15/16/18 + REFERENCE-REGISTER.md + IMPLEMENTATION-PLAN.md @ the uncommitted state (the verification fleet's folded fixes checked first via `git diff HEAD`; prior attempt failed mid-run — this run completed). **Method:** every cross-file edge grepped at its target; names/chords/tokens/pins/IDs compared verbatim; fixes applied in place; nothing committed.

## citation graph verification

Every live edge resolves to a real heading/row. Edges checked (citing file → target, verdict):

| Edge | Target evidence | Verdict |
|---|---|---|
| 06 §5.0/§5.9x → 05 §12.3 / §14.5 / §14.5A / §8.4 / §16.5 | 05:753 / :846 / :894 / §8.4 / §16.5 | ✅ |
| 06 → 16 §3.4 (`toggleAVLink`, N15) | 16:221 | ✅ |
| 06 → 18 §4.5 (N4 view-gate home) | 18:200 | ✅ |
| 06 → 15 §13.15 / §4.3.9 / §4.3.11 / §6.3 / §7 / §7.1A | 15:4899 / :739 / :822 / :§6.3 / :§7 / :§7.1A | ✅ |
| 06 → 09 §3.1A B1 (`linkedTo`) | 09:321/:335 | ✅ |
| 06 → 00's D30-D36 | 00:437-465 (all 7 headings incl. D31A at :445) | ✅ |
| 16 §3.4A/§3.4B → 06 §5.9 (preamble) + §5.9B-F + §5.7 | 06:1484 / :1571-1662 / §5.7 | ✅ |
| 16 → 18 §4.3 / §4.5 / §4.8 / §4.9 / §5A / §8.5 | 18:167 / :200 / :218 / :224 / :289 / ledger row 8.5 | ✅ (§8.5 = Chrome-Ledger row, resolves) |
| 16:2048 → 05 §19.1 | 05:1485 (the pre-R25 `:1496-1497` anchor re-dated by the 16 verifier) | ✅ |
| 18 → 06 §5.9 + §5.9B; 16 §3.2/§3.1/§7.3; 05 §8A/§5/§8.2/§8.6/§8.7/§8.9/§9/§10/§11.1/§11.2/§12.3/§14.11; 15 §13.15 | all present | ✅ |
| 05 §8A → 06 §5.9 (6-mode family); 18 §4.5 / §5 / §5A / §9; 05 §14.10/§14.11 | 06:1484+; 18:200/:253/:289/:396; 05:979/:§14.11 | ✅ |
| 05's op-port rows → 06 §5.9C/D/E/F | 06:1602/:1622/:1641/:1662 | ✅ |
| 15 §13.15's four r1 rows → 06 §5.9C/D/E/F | same | ✅ |
| plan → 06 §0/§5.9 · 05 §8 · 15 §13.15/§9.5/§6.3 · 18 §0/§9/§11 · 20 §0 | all present | ✅ |
| register → 06 §5.9 · 05 §11.1/§11.2 · 16 §3.1/§3.7/§7.3/§0 · 18 §4.1-4.4/4.8/4.9/5/9/12/16 · 08 §0 · 09 §0/§3.1A/§6.1 · 15 §6.2/§13.15 · 20 §3 | all present | ✅ (one soft anchor fixed — see fixes) |
| 06:432 → 00-master:330 (convergence directive) | 00:330 (D12 "one algorithm home") | ✅ |

Brief-vs-reality note: 06 does **not** cite 05 §8A / 16 §3.4A/§3.4B / 18 §4.3/§5A/§9 by ID (its live citations are the set above), and 18 cites D34.4 rather than "16 §3.4A". No broken edges result — the brief's edge list was a superset of what was actually written.

## consistency tables

**Family naming** (REPLACE / APPEND AT END / RIPPLE OVERWRITE / FIT TO FILL): identical across 00 D30.2/D31.4-31.7 (`REPLACE / APPEND-AT-END / RIPPLE-OVERWRITE / FIT-TO-FILL`), 06 §5.9B-F headings, 15 §13.15 r1 rows (`REPLACE/APPEND-AT-END/RIPPLE-OVERWRITE/FIT-TO-FILL family`), 16 §3.4A, 05 §16.5A op-port, the plan (S-ot row: `replace/append/ripple-overwrite/fit-to-fill`), the register. Section IDs: §5.9 + §5.9B-F everywhere — **two stray `§5.9A-F` found and fixed** (register C45, plan §7 R25 row).

**Chord story**: 16 §3.4A primaries `,` insert-edit / `.` overwrite-edit / `⇧⌥.` ripple-overwrite / `E` append + F-block F9 insert / F10 overwrite / F11 replace / F12 append + "Shift+F10 NOT available (18 §4.9)" + ripple-overwrite primary-chord-only — **identical in 00 D34.1 (as amended by the verification fleet) and ARCH-R25 D34**; 16:283's inline D34.1 quote matches 00's current text verbatim; 16 §6.3 row 20 carries the same resolution.

**Token names** (05 §8A ↔ 18 §9 ↔ `xcut-visual-grammar.md`): all 8 token families match one-for-one — `--trim-edge-active`, `--trim-glow-soft`, `--clip-dim-overlay/border/title`, `--clip-active-edit`, `--ghost-outline`, `--badge-chip-{bg,border,text}`, `--overlay-arrow`, `--source-active-border`; the two token-less rows (`white-box-family`, `in-point-preview-frame`, `cursor-glyph-ladder`) correctly carry "—". The proposal is the source of truth; no fork.

**Pin story** (R25): engine `3989506` (one docs-only commit over R24 `5036387`) / OT HEAD `fdb771c` ≡ code pin `c15a629` / WDC `85b81b0` / nle-ui `3026099` (674) / app `64fb0ab` (206) — consistent across 00 (status + §2 pins), 18 §0 BASE row, 06's ten-mode matrix header, the plan (S-*/R2 rows), 15 §0's R25 re-read. Consumer pins unchanged: app→engine `5036387`, OT lock-copy `c15a629` byte-exact (minus `testing/`), nle-ui consumer pin + suite counts (1521+ / 1,588 it-blocks / 61 files / mini 355) matching the register's suite-count pins. Register carries no repo hashes by design (its pin class is the suite-count baseline).

**GAP-row ID uniqueness**: OW-1..3 / RE-1..2 / AP-1..2 / RO-1..3 / FF-1..2 exist only in 06's new rows (+ mode-ripple-overwrite.md's RO-1..6, same namespace); E1/E2/E3 appear nowhere else as bare IDs (the SCOUT-R8 "E2-5" hit is a different compound form); G-SLIP-*/ROLL-*/ripple-trim-G*/XKB-*/XMOCK-*/VG-* are R25 coinages that resolve to their source reports (mode-slip G-SLIP-1..9, mode-roll ROLL-1..7, xcut-keyboard XKB-1..9, xcut-shell-mocks XMOCK-1..9, xcut-visual-grammar VG-1..7; mode reports' plain G1-G14 rows are cited namespaced). **No collisions.**

**No census reopening**: all four 15 §13.15 new rows carry `**QUEUED (r1-scheduled — NOT in the landed census; the 24 routed + 6 exceptions stand untouched)**`; the §13.15 header says "the landed census UNCHANGED @ `c15a629`"; 06's matrix wire column reads "none (r1: …)"; 16 §3.4A rows are (r1-scheduled)-marked; 18 §4.3 claims "no OT-parity claim until the r1 op ports land (D30.2)"; 05 §8A: "No production repo implements this register today". No file claims the new verbs landed.

**Old teachings dead** (P-list): `ripple-insert-makes-room` / `slide-no-chain-is-noop` / `placement:'overwrite'` survive only as annotated re-key notes (06:1598 OW-1, :3301, :3351, :3370); the SlipCommand `image` phantom is corrected in 15 §4.3.6 (P7); "ripple insert" flag-push claims re-keyed in 15 §4.3.9 + §13.15 (P11) and 16 §3.2 (P11's 16-half). The four 06 verifier flags (§5.4:988, §12-tail:3135, §13 Insert row:3155, §11.3:2669) — all still taught the flag-push unqualified; **fixed this run** (see below).

## fixed directly

1. **REFERENCE-REGISTER.md C45 (row 72)**: `§5.9A-F` → `§5.9B-F` (stray §5.9A — 06 has no §5.9A; the family runs §5.9 + §5.9B-F).
2. **IMPLEMENTATION-PLAN.md §7 R25 row (line 145)**: `06 §5.9A-F` → `06 §5.9 + §5.9B-F` (same stray).
3. **REFERENCE-REGISTER.md C36 (row 63)**: `18 §15.3` → `18 §15 item 3` (soft anchor — 18 §15 has numbered items, no §15.3 heading; item 3 is the color-layout question).
4. **06 §5.4:988** — appended the D31.1 precision note to the "Any command (split, trim, move, delete, insert, rate-stretch) automatically gets ripple behavior" bullet: the flag routes delete + the placement surface's displacement — the source-edit family's push is intrinsic, never flag-routed (freed = ∅ for a pure insert).
5. **06 §12-tail:3135** — same note on the "Universal" bullet.
6. **06 §13:3155 (Insert row)** — `Yes (flag)` → `Yes (flag — D31.1 precision: the flag routes the placement surface's displacement ONLY; the insert-edit splice's push is intrinsic, never flag-routed)`.
7. **06 §11.3:2669** — same precision note scoping the classic-repo description to our law.
8. **00-master D32.6 (:451) + D34.3 (:459), 16 §0 (:32) + §3.4B (:298), plan S-engine E1 row (:20)** — `00:804` → `00:838` (the no-overlap invariant "No overlaps on any track after ripple/move/insert" moved to :838 post-R25; live-verified; 06's two sites were already fixed by the 06 verifier). Zero `00:804` refs remain in the 9 files.
9. **18 §0 app row (:17)** — R25 census re-read annotation: the D30 W-C/W-D adoptions LANDED @ `64fb0ab` (`use-wire-dispatch` ported; the census at its declared irreducible set 35 zero-action + 5 carriers + host); the row's 32+7 figures explicitly kept as the R24 static baseline (fixes an in-file contradiction with 18's own R25 BASE line, which already said "the D30 program landed").
10. **05 §0 (:16 and :17)** — same class: "W-C, in flight" annotated as the R24 baseline with the R25 landing noted (the register row at :17 keeps the R24-declared values with the R25 re-read noted for the next register amendment).

## flagged

1. **The R25 census arithmetic (semantic, battery-owned — annotated, not re-derived):** the R25 state "35 zero-action + 5 carriers + host" (00:3/:19, plan S-app/R2) does not decompose cleanly against the R24 frame "40 port files = 39 mirrors (32+7) + host" (35+5 = 40 *with* host = 41; 39 mirrors would split 35+4). The R24→R25 delta as stated (carriers 7→5, zero-action 32→35) implies +3 zero-action for −2 carriers. The census script/battery is the count authority (per-pin declared values); the app-side register re-declaration should reconcile the mirror/host/carrier arithmetic — flagged for battery_r25's census-coherence check and the next register amendment, not prose-fixed here.
2. **Historical line anchors in decision records (informational, left as-is):** 00 D31.1's "15:4901" (rows now at 15:4918-4921) and D31.3's "06:3110, 06:3175" (now ~06:3370), and 00 D33.2's "05:949" (amber census now at 05:986) are pre-R25 anchors inside ruling text — decision records pin their ruling-time state; each site's live pointer (15 §13.15, 06 §12/§13 re-key notes, 05 §8A's §14.10 pointer) is correct.
3. **The 06 verifier's residual #3 (00's D32.6 self-citation)** — resolved this run by fix #8 (00:804 → 00:838 at 00:451).

## verdict

**PASS.** The R25 amendment fleet's cross-file state is coherent: every live citation edge resolves; the four family names, the chord story, the 8 tokens, the six R25 pins, the consumer byte-lock, and the new ID families are consistent across all nine files; the C7 census is nowhere reopened; the P-list phantoms are dead with only annotated re-key mentions. 15 direct fixes landed (2 stray §5.9A refs, 1 soft anchor, 4 D31.1 precision notes, 5 stale 00:804 anchors, 3 census-state annotations in 18 §0/05 §0); 1 arithmetic flag routed to the battery. No commits made; no semantic disagreements found beyond the flagged census arithmetic.

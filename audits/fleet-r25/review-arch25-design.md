# Adversarial review — ARCH-R25 (DESIGN-CONSISTENCY reviewer, fresh context, round 1)

**Reviewer:** fresh-context design-consistency sub-agent. Read in order: the ruling (all), HANDOFF.md (standing laws), ARCH-R24 (D26-D29), ARCH-R23 (D25), five+ fleet reports read in full or in targeted depth (mode-insert, mode-ripple-overwrite, mode-replace, mode-fit-to-fill, mode-append, mode-ripple-trim, xcut-plan, xcut-keyboard, xcut-linked-companions, xcut-visual-grammar, xcut-shell-mocks, scout-app), and the corpus surface it amends (06 §0/§5.1/§5.6/§5.7/§5.9/§10.4/§11.3/§12; 05 §8/§12.3/§14.5/§14.10; 15 §4.1A/§4.3.2/§4.3.6/§4.3.9/§7.1A/§13.15; 16 §3.2/§3.4/§3.6/§6; 18 §4.9/§5A/§9; 09 §B1; 00 §0/§2; IMPLEMENTATION-PLAN). Live code re-verified where checkable: OT `git diff --stat c15a629..fdb771c -- src/` is EMPTY (src byte-identical ✓), engine `relinkSplitSegments` (timeline.ts:668-694) read directly, `/tmp/freecut`+`/tmp/opencut-classic` confirmed absent (P10's premise ✓).

**The posture of this review:** attack the ruling's DESIGN COHERENCE, not its typing. The ruling's factual spine is strong (verified below); the failures are transcription omissions, a half-executed law split, one unsatisfiable gate, and several under-specified amendments that would fork interpretation.

---

## Findings

### F1 — P1 — D32.1's fan-out table is missing RIPPLE-OVERWRITE (9 of 10 modes)

**The claim:** "32.1 — the fan-out table: 06 §5.0 carries the mode × situation matrix … Per-mode: slip/slide/roll/ripple-trim …; insert …; overwrite …; replace — SEVERS (31.4); append — …; fit-to-fill — the pair takes the SAME rate."

**The attack:** The ten-mode matrix (D30) has ten rows; the companion law's per-mode enumeration covers nine. RIPPLE-OVERWRITE — one of the four families this round creates, and the only one whose companion semantics a composite author must derive from scratch — has no row. D31.6 states the delta law, the pull/push, and "one atomic undo" but is silent on companions, sync-lock, and transitions, so the §5.0 fan-out table is the ONLY place the law could live — and it doesn't.

**The evidence:** xcut-linked-companions' fan-out table HAS the row, with specific semantics the ruling dropped: "Ripple overwrite | the removed set + companion cascade + both tracks' move set at the same delta | included | as overwrite | both halves (link + sync-lock) | PROPOSED (mode-ripple-overwrite)"; mode-ripple-overwrite §3.4 rows 2-3 (companions join the delete set engine-side, :4998-5017; both sync-lock propagations exist private :3475/:3534) and its §4.1 law 2. The fleet also flagged the window-mismatched situation column ("Pair present, window MISMATCHED" — the slip/slide/rate-stretch EXCLUSION law, "stated nowhere — XC-1"), which D32.1's three-situation compression also drops.

**The recommended fold:** add the ripple-overwrite row to D32.1 verbatim from xcut-linked-companions (removed set + companion cascade + both tracks' move set at the same delta + sync-lock both halves); add the mismatched-window situation column (or at minimum the slip/slide exclusion sentence); add the companion/sync-lock clause to D31.6.

### F2 — P1 — D34's `Shift+.` binding collides with live 16 law; the conflict row the fleet planned was dropped

**The claim:** "34.1 — the primary chords are source-mode-gated: `,` insert-edit / `.` overwrite-edit / `Shift+.` ripple-overwrite / `E` append (… zero live risk — no shipped shell has a source viewer yet)"; "34.2 — … §6.1's row 2 becomes the four-meaning row (source-mode insert/overwrite | slip-by-frame | slide-by-frame | plain nudge)."

**The attack:** "Zero live risk" conflates shipped shells with standing spec law. `Shift+.` is ALREADY BOUND in 16: §3.4:235 (`Shift+.` = Slip right 10 frames), §3.6:283 (`Shift+.` = Nudge right 10 frames), and twice in Appendix A (:2176 `kbd-slip-right-10`, :2206 `kbd-nudge-right-10`). The four-meaning row (34.2) resolves only the PLAIN `,`/`.` keys; nothing resolves `Shift+.`'s now-three meanings (source-mode ripple-overwrite | slip-10 | nudge-10). 16 §6's own preamble makes this a law violation, not a nit: "Every conflict is resolved explicitly — there are no implicit 'whichever handler is on top wins' behaviors."

**The evidence:** 16:232-235, 16:280-283, 16:2176/2206 (read directly). xcut-keyboard's amendment shape explicitly planned the missing row — "one §6.1 conflict-table row (the three-way `,`/`.` disambiguation …) **+ one §6.1 row for `Option+`/`Shift+` splits**" — and the ruling carried only the first. (For the record, the claims that DO verify: `,`/`.`'s context-split resolves cleanly via 16 §6.2's actual order — step 3 panel-specific > step 4 tool-specific, exactly as 34.2 claims; `E` is unclaimed (grep 16/18/05: zero `E` rows); F9-F12 are unclaimed; `Shift+F10` IS owned by 18 §4.9 as the normative context-menu keyboard route — 34.1's exclusion is faithful.)

**The recommended fold:** add the `Shift+.` three-meaning row to §6.1 (source-mode → ripple-overwrite; slip tool → slip-10; any other tool → nudge-10) plus the fleet's `Option+/Shift+` splits row; state that the primary chords' phasing follows the fleet's two-tier plan (`,``/`.` ratifiable now; `E`/`Shift+.`/F-alternates land with the verbs at r1) so 16's new rows carry phase tags per the posture law.

### F3 — P1 — the two-semantics split is half-executed: the ripple-insert phantom survives in 15 §4.3.9 and 16 §3.2

**The claim:** "31.1 — placement-insert … and insert-edit … are DISTINCT operations with DISTINCT homes. Placement-insert is LANDED (OT, canonical)." + P1's fix: "06:1509 … the diff can't push (D31.6) | Re-key to the delete+move+insert composite law."

**The attack:** The ruling kills the ripple-insert phantom in 06 (P1/P3) and rules the placement surface never shifts — but the SAME phantom lives in two other files the amendment fleet touches, and no D-clause or P-row dispositions either: (a) 15 §4.3.9 `InsertCommand.ripple: boolean` — "If `true`, ripple the timeline to make room for the new element. Default `false`" — still teaches the push D31.6 declares structurally impossible, and 15:4901's r1 param-alignment row still orders the wire to GAIN the `ripple` param ("wire needs full PlacementStrategy + `ripple` + `idSeed`"); (b) 16 §3.2:183's `Option+R` row still says the ripple mode "affects all delete/insert/trim ops" — insert included. After the fleet runs, 06 would say "the placement surface places," 15 would say "ripple:true makes room," and 16 would say the mode affects insert — three contradictory teachings of the exact conflation D31.1 exists to dissolve. Secondary: P1's re-key points the 06:1509 row at "the delete+move+insert composite law" (D31.6 = ripple-OVERWRITE's composite), but a pure insert has no delete step and no delta law — the honest re-key for ripple-insert is D31.1's split itself (placement never pushes; the splice family's push is intrinsic), with the composite as the replacement-replacement form.

**The evidence:** 15:744-753 and 15:4901 (read directly); 16:183 (read directly); mode-insert S10/S11 (the same rows, fleet-verified); mode-ripple-overwrite §3.2 ("The diff produces NO push — structurally").

**The recommended fold:** add a P-row for 15 §4.3.9 (drop the `ripple` param or re-point it at the r1 insert-edit/composite seam, and amend the :4901 alignment row accordingly); amend 16:183's "delete/insert/trim" list to the flag's real routing (delete/trim); re-word P1's fix to re-key 06:1509 to D31.1's two-semantics sentence + D31.6's composite for the replacement form.

### F4 — P1 — D30.3's K2 gate is unsatisfiable under the ruling's own scheduling

**The claim:** "30.3 — the matrix is a ladder gate: at K2, the engine/OT columns must be LANDED (ported + pinned); at K3, the app column must be wired + pinned."

**The attack:** The ladder is crawl K1-K4 → walk → run r1-r6; the op-family port is r1 wave 1/2 (06 §0 GAP, 15 §13.15) and D30.2 itself schedules the four absent families as "r1-scheduled spec-first families" whose IMPLEMENTATION is "r1 scope the user can trim" (36.6). 36.5 assigns "S-ot the r1 port families." Therefore at K2 the engine column (6/10, plus the pre-r1 exposure rows) and especially the OT column (≈1/10) CANNOT be "LANDED (ported + pinned)" for all ten modes. The gate as written either (a) is false law that battery_r25 would fail forever, or (b) silently pulls the r1 ports into the crawl — which directly contradicts 36.6's "estimates HOLD" (they hold precisely because the mode implementations are r1 scope, +1.5-3 wk only if the user passes the scope gate).

**The evidence:** xcut-plan §3's own registration — "K2's half: the matrix registered + **the wired-subset pairs green** (engine math ↔ OT verbs where they exist — **the pairs close as r1 lands**)" — the fleet's gate is subset-scoped; the ruling hardened it into a contradiction. Compare 06 §0's r1 wave rows and 15 §13.15's "The op-family port is r1 wave 1/2."

**The recommended fold:** re-state 30.3 in the fleet's form: at K2, the matrix is REGISTERED + the wired-subset pairs green + honest-absent verdicts registered; the full engine/OT "LANDED" gates key on the r1 waves (30.2's schedule), and K3's app column on the wired subset. Keep the machine check (per-mode pinned tests at the named files) scoped to the same subset.

### F5 — P2 — D32.4's relink-both-halves fights 06 §5.1's own quoted code and 09 B1's pairwise persistence shape

**The claim:** "32.4 — the split-link ruling: relink-both-halves is the law (Resolve-faithful …; the engine implements this)." + "32.5 — 09's persisted `linkedTo` (pairwise) stays the persistence form; the engine's `linkedGroupId` (groups) is the runtime expansion (pairwise at rest → groups at runtime)."

**The attack:** Two un-amended contradictions: (a) 06 §5.1 QUOTES FreeCut's `relinkSplitSegments` (06:463-473) whose letter severs on single-split — `leftLinkedGroupId = length > 1 ? uuid : undefined` then an UNCONDITIONAL `_updateItem(left, {linkedGroupId: undefined})` — while the engine (timeline.ts:674-687, read directly) added the guard (`if (leftLinkedGroupId !== undefined)`) and the comment "When only ONE linked clip is split … the original linkedGroupId is preserved on both halves." D32.4 rules with the engine but amends nothing in §5.1, so 06 would carry two contradictory split laws (§5.0's fan-out table vs §5.1's quoted code + :587's edge-case row). No P-row covers it. (b) The chosen law is precisely the shape pairwise `linkedTo` cannot express: both halves of V stay linked to companion A means Vl.linkedTo=A AND Vr.linkedTo=A with A.linkedTo naming at most one — 09 B1's "ONE linked companion … the `linkGroupId` alternative was REJECTED" has no mapping for the split-single case, and D32.5's one sentence doesn't supply it. The ≥2-splits case (fresh left/right pairs) round-trips; the 1-split case does not.

**The evidence:** 06:463-473 and 06:587 (read directly); nle-engine timeline.ts:660-694 (read directly); 09:155/:335 (B1, read directly); xcut-linked-companions incoherence flags 3-4.

**The recommended fold:** add a P-row annotating/correcting 06 §5.1's quoted `relinkSplitSegments` + the :587 edge-case row (single-linked-split: the ENGINE's preserve form is the law; the FreeCut quote is the superseded form); extend 32.5 with the split-case persistence mapping (e.g., the bridge sidecar persists the split pair as two pairwise links with a documented asymmetric-restore rule, or B1 gains the n-way escape hatch for split products).

### F6 — P2 — D31's dedicated-vs-composite criterion is ad hoc, not stated; D31.6 omits the fleet's transition and floor laws

**The claim:** "31.4 — Dedicated op (not a naive composite — the transition-remap + sever semantics need atomicity)"; "31.5 — placement-level composite, NO new engine op"; "31.6 — … the composite is `delete + move + insert`"; "31.7 — Compositional first (insert + `updateElements{retime}` — the mocks' mapping); a first-class verb is optional at r2."

**The attack:** Four families, four locally-reasoned postures, no decision rule. The stated rationale for REPLACE's dedicated op ("need atomicity") is also true of ripple-overwrite's composite (applyBatch, one undo) — the REAL distinction (mode-replace §b: composites cannot express transition REMAP without cascade-drop, and two public ops cost two history entries) is in the fleet, not the ruling. A reader cannot re-derive the split; the next family (say, "insert-at-gap") would fork. Worse, D31.6 drops two laws the fleet explicitly recommended as family law: the transition disposition ("BOTH edge transitions die; the source lands clean; the moved downstream forms a hard cut at the OUT side" — mode-ripple-overwrite §3.4 row 1; without it, OT's element-owned `transitionOut` SURVIVES as data and the two homes diverge) and the zero-anchor floor refusal (§4.1 law 2: "floor at 0 (refuse if a floor would be hit — the honest refusal)"). D31.5's "the 6th `PlacementStrategy {type:'append'}`" is also under-specified: `timeline.insert` takes required `startTimeTicks` — does strategy 'append' ignore it (a param-semantics change) or does the client compute the end (making the strategy redundant)?

**The evidence:** mode-replace §b (compositions A/B/C and the three break-reasons); mode-ripple-overwrite §3.4/§4.1; mode-append §2.1 (InsertCommand has 5 strategies, none append; the wire exposes 2); 15 §7.1A invariant 5 (the guard validates against the EVOLVING intermediate state — the delete→move→insert order passes it in both directions, but the ruling never states the order-sensitivity: "Insert must be LAST for the push case (reject-not-shift placement)").

**The recommended fold:** state the criterion once (dedicated op iff a composite of routed verbs cannot preserve the mode's transition/companion semantics in ONE undo; else composite) and re-point each family's rationale at it; add 31.6's transition law + zero-floor refusal + the insert-last order note; add 31.5's strategy-param law.

### F7 — P2 — the 19-family census partition doesn't add up (11+3+8 = 22 ≠ 19) and mis-classes two rows

**The claim:** "19 surface families censused across the two shell mocks — 11 spec-aligned, 3 diverging, 8 MOCK-ONLY (SourceEditBar, SourceRangeBar, the deliver RangeBand, marker v2, the caption track, the FX-page grammar, the 3-vs-5 page shape, context-menu micro-grammar)" (§2.4) and "Seeded with the 19 censused families (11 aligned / 3 diverges / 8 mock-only)" (35.1).

**The attack:** The partition is presented as disjoint but sums to 22 against a 19-row table; the double-count is the mixed-verdict rows (9/10/11/17 carry both aligned and mock-only halves). Two of the named "8 MOCK-ONLY" rows are DIVERGE-class in the ruling's own evidence: marker v2 is "MOCK-DIVERGES→UNADOPTED" (row 5 — the spec pins the OPPOSITE per 09 A2) and the 3-vs-5 page shape is "SPEC'D-DIVERGES" (row 8 — 18 §4.8's three-page ruling is live law). The register is the artifact D35.2 makes battery-enforced; seeding it with an arithmetic that cannot be re-derived guarantees a battery check nobody can satisfy cleanly.

**The evidence:** xcut-shell-mocks' verdict table (rows 1-19, read directly; the MOCK-ONLY class is "rows 1-7, plus the micro-grammars in 9/10/11/17").

**The recommended fold:** re-derive the partition honestly (e.g., 6 mock-only + 2 mock-diverges-unadopted + 2 spec'd-diverges + mixed rows marked as such), or present the seed as verdict-classes per row rather than a three-bucket count; fix both §2.4 and 35.1.

### F8 — P2 — D36's filing set drops the still-open nle-ui filings and leaves ORDER-vs-FILE implicit for the cross-repo code rows

**The claim:** "36.1 — … the live rows become: the app's `.agents/` bootstrap …, the census-CI mechanism …, K3's store/policy halves …, the W-G filing reconciliation (below)." + "36.5 — S-engine the defect fix + the mode exposure rows pre-r1."

**The attack:** (a) The plan's S-package row still carries OPEN filing debt that xcut-plan verified live (mismatch 8): the C0 MiniShell row is STILL not filed in nle-ui's PLAN (grep = 0), D29 was never filed package-side (ledger jumps D28 → #30), and P-widen/P-lock-route are still unticked — R24 ordered these "close them THIS window" and they didn't close; D36 has no S-package row, so the debt survives a second round un-carried. (b) The cross-repo protocol's law is "file cross-repo work as queues, never unilaterally" — D36.2 (engine R9 re-files) and D36.3 (WDC, with a filing-verification gate) are explicit filings, but the E1/E2/E3 engine CODE fixes and the census-CI ci.yml change are stated only as plan rows with owners. The fleet itself demanded the filing form for E1 ("file it in the engine's queue per the cross-repo protocol" — mode-insert G2, repeated in xcut-plan's S-engine track); the ruling drops that instruction, leaving ambiguous whether the spec round will edit engine code "pre-r1" unilaterally or file it.

**The evidence:** HANDOFF.md:38 ("file cross-repo work as queues, never unilaterally"); IMPLEMENTATION-PLAN §0 ("the file-queue protocol: a titled block in the target repo's queue doc"); xcut-plan mismatch 8 + the S-engine track row; mode-insert G2.

**The recommended fold:** add the S-package filing row (C0 row + D29 ledger backfill + the two ticks) to 36.1's live rows; state explicitly that E1/E2/E3 and the census-CI step land as titled blocks in the target repos' queue docs (engine `.agents/PLAN.md`; the app's queue once the bootstrap creates it), executed by the S-* streams — mirroring 36.3's filing-verification gate.

### F9 — P2 — D33 drops the fleet's 18 §5A cursor ruling; the register would collide with a live normative grammar

**The claim:** "33.1 — 05 gains §8A … (… the cursor glyph ladder …) and 18 §9 gains the theme-half tokens."

**The attack:** The fleet's grammar census found 18 §5A's 16-row CSS-cursor table is NORMATIVE and live everywhere ("18 §5A :299-318 is normative… The mock's SVG bracket glyphs: NOWHERE"), and its register proposal carried an explicit ruling: "a cursor-glyph ruling in 18 §5A — whether the mock's SVG bracket-glyph family or the existing 16-row CSS-cursor vocabulary is law (both, layered, is the recommendation: CSS cursors for hit feedback, the glyph only inside an active drag preview)." The ruling's §8A includes "the cursor glyph ladder" as structure but never resolves the collision with §5A — two normative grammars for the same gesture feedback would coexist, the exact fork D33 exists to close.

**The evidence:** xcut-visual-grammar row A7 + its register proposal (item 2b); 18 §5A (headers verified).

**The recommended fold:** add the layering sentence (18 §5A CSS-cursor table stays the hit-feedback law; the bracket glyphs render only inside an active trim preview, per the register's rows) to D33.1 or 33.4.

### F10 — P2 — D34.1's ripple-overwrite F-block alternate is not a binding ("F10's family neighbor")

**The claim:** "`Shift+F10` is NOT available (18 §4.9 owns it as the context-menu route — the ripple-overwrite alternate is F10's family neighbor, not a shift-chord)."

**The attack:** "F10's family neighbor" names no chord. F10 is overwrite-edit's alternate; ripple-overwrite's alternate is left undefined by a phrase an implementer cannot execute. The fleet left it open too ("the source-mode-gated `⇧⌥.` or plain reliance on the Tier-1 `Shift+.`") — the ruling had the chance to close it and instead wrote a gesture at an unset key. Also dropped from 34.4: the fleet's closure note on 15 §4.3.45's `selectTool` enum ("the union must not gain source-edit members") — "the radio does not grow insert modes" covers 18 §4.5's union but not 15's.

**The evidence:** xcut-keyboard §2.3's Tier-2 bullet; 18 §4.9:220 (Shift+F10 verified normative); 15 §4.3.45's enum (the selectTool union).

**The recommended fold:** name the alternate (recommend the fleet's `⇧⌥.`) or rule "none — Tier-1 only"; add the 15 §4.3.45 enum-closure sentence to 34.4.

### F11 — P3 — §5.9B-F lettering skips §5.9A and diverges from the fleet's proposal without a mapping

**The claim:** D31.1 "06 §5.9 states both + the boundary sentence"; D31.3 "§5.9B OVERWRITE EDIT"; 31.4 "§5.9C"; 31.5 "§5.9D"; 31.6 "§5.9E"; 31.7 "§5.9F."

**The attack:** The corpus's letter-suffix convention (§5.2A, §14.5A, §3.4A) reads the A-slot as the first sibling insert; starting at B leaves a hole exactly where insert-edit (the family the round is about) lands "inside §5.9." Meanwhile xcut-plan's S-spec routing proposed §5.9A = append, §5.9B = insert-edit+overwrite+replace — the ruling re-lettered wholesale without a mapping, so the plan-routing of the fleet's gap-row IDs (which cite the fleet's letters) needs a translation nobody wrote.

**The evidence:** 06's headers (§5.2A precedent); xcut-plan §3's S-spec row.

**The recommended fold:** name the insert-edit home §5.9A explicitly (or state "insert-edit lands in §5.9's body; the lettering starts at B"), and add one line mapping the fleet's proposed letters to the ruling's.

### F12 — P3 — P8 is not a phantom row, and D31.3 contradicts its own fix

**The claim:** P8: "07:367 | The ElementParams 'overwrite-only' open-map row cited as a placement strategy | Re-tag as patch-semantics naming collision (hazard note)." vs D31.3: "The phantom `placement:'overwrite'` rows (06:3110, 06:3175, 07:367) re-key to this family."

**The attack:** I verified P1-P7, P9, P10 as REAL phantoms (06:1509 verbatim ✓; 06:3110's "(unless overwrite placement)" ✓; 06:3120 ✓; 06:3160's "sourceStart unchanged" vs 06:1293-1299's continuity-shift law + 15:689-695's `preserveContinuity` ✓; 06:3161's "no-op" vs the chain gating only the source delta ✓; 06:3175's non-existent placement values ✓; 15 §4.3.6's `video/audio/image` vs 06 §5.6's code `video/audio/composition` ✓; 06 10.4:2408's "ALIGNED" against a § teaching the other semantics ✓; 05:949's amber ROLL_COLORS with FreeCut gone from every checkout ✓). P8 is the exception: 07:367's "params keys are overwrite-only" is a true statement about patch semantics (read in context), not a false placement row — the "phantom" is only a naming-collision hazard, and D31.3 nonetheless lists 07:367 among rows that "re-key to this family [§5.9B]," the opposite of P8's re-tag. The amendment fleet receives two conflicting instructions for one line.

**The evidence:** 07:360-372 (read directly); the P-list rows re-verified line-by-line as above.

**The recommended fold:** drop 07:367 from D31.3's re-key list (P8's hazard-note form stands); optionally re-class P8 from "phantom" to "hazard" in the P-list's title.

### F13 — P3 — 36.3's failure narrative is a mild mischaracterization; 36.2's "re-filed" includes "(not filed)"

**The claim:** "36.3 — the R24 promotion was filed against `.agents/HANDOFF.md`, but WDC's actual venue is the repo-ROOT `HANDOFF.md` (its `.agents/` holds only SKILL.md)"; "36.2 — … 3-of-4 stale dispositions that predate ARCH-R24's F1 amendments — re-filed: … R9-c scene-grade → DECLINED-BY-LAW (not filed)."

**The attack:** (a) WDC's `.agents/` holds ONLY SKILL.md — there is no `.agents/HANDOFF.md` for anything to have been "filed against"; xcut-plan's verified truth is that the promotion simply NEVER LANDED anywhere ("no waveform row exists anywhere in WDC's queue"; the R24 order said "WDC's HANDOFF" without a path, and the plan's own S-wdc ORIENTATION cell already said root). The failure was non-execution, not mis-venue — the ruling invents a mis-venue story. (b) 36.2 counts R9-c among the "re-filed" 3-of-4 while itself saying "(not filed)" — the word "re-filed" should scope to a/b only.

**The evidence:** xcut-plan mismatch 4 (read in full, self-verified by that agent); the plan §0's S-wdc orientation note.

**The recommended fold:** re-word 36.3 ("the R24 promotion never landed — the venue truth is the repo-ROOT HANDOFF; the re-filing targets it, with the verification gate") and 36.2's "re-filed" scope.

### F14 — P3 — citation and arithmetic nits (D29.2 vs F8; the "6/4" headline; "~76"; the token names; the boundary sentence; the badge; the missing 17 agent; WDC's pin)

- "30.2 … per the tsc-lockstep/M49C law when they land (the D29.2 pattern)" — the re-declare-mechanically law is the D29 **F8** fold (15:4897 itself calls it "the census re-declare law (D29 F8)"), not clause 2. 
- "the ten-mode matrix splits 6/4" then describes the middle two as "stated in NO spec prose" — the split conflates "spec-specified" (4) with "engine-implemented" (2); the matrix's own cells (§5.9 HALF / §5.9B GAP) are more honest than the headline.
- "~76 posture-law gap rows" vs the fleet's "~70-76" (xcut-plan twice) — the ruling rounds to the top of the range.
- 33.1's eight token names are color-literal (`trim-edge-green`, `active-border-red`, `arrow-white`) — the corpus's token discipline (18 §9 semantic tokens; the fleet's `--trim-edge-active`/`--clip-active-edit`) avoids baking values into names; the ruling also silently drops the fleet's `--clip-dim-border`/`--clip-dim-title`/`--source-active-border` and invents `slot-dash`.
- 31.1's boundary sentence "the placement surface places (rejecting or displacing per strategy)" — "displacing" contradicts the letter of the reject-not-shift law (05:853 "never moved to make room"; OT's header: "falls through to another track or a new track"); write "rejecting or falling through."
- 31.7's "one decimal ('1.7x')" silently overrules the reference impl's `toFixed(2)` (mode-fit-to-fill §3.5/§4.7 — which itself recommends one decimal as the ALIGNMENT direction; say so).
- The amendment fleet's six agents cover 06/05/16/18+09/00+15/REGISTER+PLAN but no 17 agent — xcut-plan's S-spec routing includes 17's battery rows (insert-G7, append-G6, overwrite-G1's set); assign them.
- §7's pin re-bases list four repos; WDC (85b81b0, unmoved) should be listed explicitly like battery_r24's pin set.

### F15 — P3 — the D30 matrix's "15 wire" column conflates the spec union with the routed census

**The claim:** the matrix's column header "15 wire," with cells like "RollCommand §4.3.5," "`TrimCommand{ripple}`," "SlipCommand §4.3.6."

**The attack:** Roll/slip/slide commands are 78-union members, NOT among the 24 routed + 6 exceptions (the C7 census — 15 §13.15); only `timeline.insert` is routed. 30.2's separation ("the landed C7 census … NOT reopened") is the right law and the ruling never re-opens it — but a reader of the matrix could take the "15 wire" column as landed-wire truth. The C7 census's own register is LANDED reality; the matrix is spec+intent — the column should say so ("15 wire form (spec union; routed-truth in the OT column)"). Related: 30.2's "the new verbs … re-declare mechanically" doesn't match the mixed wire postures the ruling itself creates (31.5 strategy-extension + optional wrapper; 31.6 composite with NO verb decision — the fleet's G-RO-2 recommended the InsertCommand replace-placement with the delta-law ripple at r1, which the ruling neither adopts nor declines; 31.7 optional r2 verb).

**The recommended fold:** re-label the column; add one sentence to 30.2 scoping the "new verbs" language to the families that actually gain verbs (replace; optionally append/fit-to-fill) and ruling the ripple-overwrite wire posture (composite-only at crawl, verb decision r1-optional).

---

## The verdict

**GO-WITH-AMENDMENTS.**

The ruling's load-bearing spine survives adversarial re-verification: the four absent families are genuinely absent (re-verified against 06/15/16/18/05/00 and the fleet's grep tables); the 6/4 mode census matches the matrix and the engine (6/10 with methods at the cited lines); the linked-insert defect is real, live-probed, and correctly specified (D32.6's fix matches the fleet's postconditions); the pin world verifies (OT fdb771c src-identical to c15a629 — confirmed by direct git diff; engine 3989506; the app's 35+5+host census); the P-list is 9/10 real phantoms (P8 the exception, F12); the D36 claims (census-CI absent from ci.yml, WDC's venue, the engine's 3-of-4 stale R9 dispositions, K3's unstarted halves) are faithful to xcut-plan's self-verified mismatch table; the estimates arithmetic holds (36.6 matches mismatch 7 exactly, including the r1 +1.5-3 conditional); and the rulings' citations of the fleet are overwhelmingly faithful — I found exactly one transcription omission (F1), one dropped conflict row (F2), and a handful of softened/over-claimed details (F7, F12, F13, F14), no fabricated evidence.

The failures are amendment completeness and internal sequencing, not architecture: four P1s (the missing ripple-overwrite companion row; the unresolved `Shift+.` collision; the half-executed two-semantics split that leaves 15 §4.3.9 and 16:183 teaching the phantom the ruling just killed; and the unsatisfiable K2 gate that contradicts D30.2/36.5/36.6), plus six P2s — all foldable into the v2 without re-opening any standing law. None of the attacks surfaced a conflict with D20/D21/D22/D25+D26 (the census law's register-equality discipline is respected and its missing mechanism is honestly exposed, not papered over), §2A.6/§2A.7, D28.2, or the D26-D29 rulings; the D31 composite is compatible with 06 §11.3's flag law precisely because it refuses to claim the flag can push, and the D31.6 trajectory passes 15 §7.1A's evolving-state overlap guard in the stated order.

**Required before the amendment fleet runs:** fold F1-F4 (P1). **Required before the wrap:** fold F5-F10 (P2). **Polish, fold at will:** F11-F15 (P3).

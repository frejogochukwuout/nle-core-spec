# ARCH-R25 — The DaVinci Edit-Mode Completeness, the Reference Register, and the Execution Wiring

**Round:** R25 (2026-09-09). **Status:** v1 → adversarial review → v2.
**Namespace note:** spec-law decisions continue D1-D29 (ARCH-R22/23/24) as **D30-D36** here. The app repo's own "D30" (docs/design-r9-d30.md, its W-C..W-G waves) is a DIFFERENT namespace — the app design doc — and keeps its name; where ambiguity is possible this doc writes "the app's D30" vs "Decision 30".

---

## 0. The ask (verbatim-tightened)

1. "One more round of deep review / audit, to ensure it is absolutely tight and final. Budget not 5 or not even 10 sub-agents but much larger, potentially 50+… thoughtfully carve out each area, multi-pass, drive all areas."
2. "Check for any updates now from the nle-ui/app repo that may demonstrate better seam integration, so are the core modules that may have evolved a bit. Things should be mostly considered sealed right now."
3. The two new mocks (`ui-mock/trim_edit_modes.html`, `ui-mock/timeline_edit_modes (2).html`) "explain the exact trim and timeline insert mode by davinci resolve. Did we have all these specified? If not deeply analyze these."
4. "The current ux mock of both shell-variant (full) and shell-mini themselves are excellent ui/ux + nle functionality references for anything your spec missed or under-defined."

## 1. The evidence base (the R25 fleet — 20 reports in audits/fleet-r25/)

- **Wave 1 — the five module scouts** (scout-{engine,ot,wdc,nle-ui,app}.md): engine @ `3989506` — ONE docs-only commit past the R24 pin `5036387`, 458/458 live-run, sealed; OT @ `fdb771c` — code byte-identical to the R24 code pin `c15a629`, 536/536 live + the M49C gate 24/24, docs-only movement (the R9 seam queue + the R9-c W8 guard); WDC @ `85b81b0` — ZERO movement, the seal held, 759/759; nle-ui @ `3026099` — 6 shell/keymap/docs commits, the timeline gesture surface byte-identical to R24, 674/674 + mini 355/355; app @ `64fb0ab` — **ALL D30 waves W-C..W-G landed** (the use-wire-dispatch port, the keymap lockstep, the app seams incl. real Save/Load, the coverage gate, the CR filings), 206/206 live, the port census at its declared irreducible set (35 zero-action + 5 carriers + host, down from 7 carriers).
- **Wave 2 — the ten-mode fleet** (mode-{roll,ripple-trim,slip,slide,insert,overwrite,replace,append,ripple-overwrite,fit-to-fill}.md): one agent per DaVinci mode; per-mode sweeps of the spec corpus + the five codebases + the two shell mocks; ~76 posture-law gap rows total.
- **Wave 3 — the five cross-cuts** (xcut-{visual-grammar,keyboard,linked-companions,plan,shell-mocks}.md).

## 2. The headline verdict

**The user's four asks, answered:**

1. **"Did we have all these specified?"** — **NO.** The ten-mode matrix splits 6/4: the four TRIM modes (roll / ripple-trim / slip / slide) are specified (06 §5.2A/§5.5/§5.6/§5.7 + 15's command forms + 16's tool keys) but implemented only engine-side-as-unwired-class-methods + variants-mock-side; the two classic INSERT modes (insert / overwrite) exist as the engine's 3-point edit family (06 §5.9 references them) with the DaVinci semantics deep-implemented in the engine but stated in NO spec prose; and **FOUR families are specified NOWHERE in ANY repo: REPLACE, APPEND-AT-END, RIPPLE-OVERWRITE, FIT-TO-FILL** — total corpus-wide absence, confirmed by ten independent agents with grep evidence.
2. **"Better seam integration?"** — **YES, demonstrated:** the app landed the entire D30 program (wire registry + machine-checked coverage + two-way loop bridge + real save/load + cross-repo key lockstep with an upstream-back fix), the carrier count fell 7→5 exactly to the declared irreducible set, and OT's queue now carries the consumer's asks (R9-a..d) — absorption is queued but not yet landed (docs-only movement).
3. **"Mostly sealed?"** — **YES at the module level** (engine one-docs-commit quiescent; OT code-frozen at the pin; WDC zero-movement; nle-ui's gesture surface byte-identical; the app's D30 sealed) — **but the SPEC's own orders are lagging:** the app's `.agents/` bootstrap is overdue ×2, the D26 "CI-enforced register-equality" has NO mechanism (ci.yml runs no census check), the WDC waveform promotion was filed into a venue that doesn't carry it, and the engine's R9 queue holds 3-of-4 stale dispositions that predate the ARCH-R24 F1 amendments.
4. **"The mocks as references for what the spec missed"** — **a systematic harvest:** 19 surface families censused across the two shell mocks — 11 spec-aligned, 3 diverging, **8 MOCK-ONLY** (SourceEditBar, SourceRangeBar, the deliver RangeBand, marker v2, the caption track, the FX-page grammar, the 3-vs-5 page shape, context-menu micro-grammar) — and a missing meta-mechanism: the mocks' proposal channel (C33-C58) has no adoption tracking, so proposals age for 5+ rounds while fleet audits re-derive them.

**One P1-class defect found and verified live (the mechanism read twice — by the mode-insert agent and by the orchestrator):** the engine's `_performInsertEditImpl` (timeline.ts:4719) with default `linked:true` and a mid-clip insert point — Phase 2's linked expansion pulls the split's LEFT half into the shift set (both halves share the linkage group), shifting it INTO the inserted clip's span (an exact-overlap violation of 00-master:804's no-overlap invariant) while the audio companion shifts whole and unsplit. Unpinned by every suite (all fixtures opt out of linking). The fix row is S-engine, pre-r1, and the law it needs is Decision 32.

---

## 3. The rulings

### Decision 30 — the mode-matrix law (the edit-mode completeness census)

**The ten-mode matrix is the completeness census for the NLE edit-mode family, registered in 06 §0.** Rows: mode | DaVinci semantics (one line) | spec home | wire form | engine form | canonical-UI form | reference impl. The matrix's current state is the R25 census:

| Mode | 06 spec home | 15 wire | engine | OT ops+UI | app | reference |
|---|---|---|---|---|---|---|
| Roll | §5.5 COVERED | RollCommand §4.3.5 | `rollingTrimItems` :2984 UNWIRED | ABSENT | ABSENT | variants (LIVE, 5 pins) |
| Ripple trim | §5.2A COVERED (wire/keys only) | `TrimCommand{ripple}` | `rippleTrimItem` :2839 UNWIRED | ABSENT (ripple-delete only; trim verb has NO ripple param; W11 exception) | ⌥[/⌥] composed-over-patches | variants (the only DaVinci-faithful mouse surface) |
| Slip | §5.6 COVERED | SlipCommand §4.3.6 | `slip` :4143 UNWIRED | ABSENT | `,`/`.` engine-true (app-inline law, unpinned) | variants R15-T4 |
| Slide | §5.7 COVERED | SlideCommand §4.3.7 | `slideItem` :4246 UNWIRED | ABSENT | ABSENT | variants (gesture+bounds; source-capped divergence) |
| Insert edit | §5.9 HALF (placement only; the splice law in NO prose) | `insert` verb (placement-only) | `performInsertEdit` :4702 (splice+push; the linked defect) | placement-insert only (reject-not-shift) | pool-DnD placement + split (2 of 3 facets) | variants insertPlan (the most faithful, honestly-labeled) |
| Overwrite edit | §5.9B GAP (the covered-clip law NOWHERE) | none | `performOverwriteEdit` :4860 (covered-clip law deep) | ABSENT (phantom strategy rows) | ABSENT | variants R20-W2 (the only full impl) |
| Replace | **GAP** | none | ABSENT | ABSENT (deliberate classic-parity no-op, DECISIONS SD-5) | ABSENT | variants (implements it WRONG — 3× specified, 0× correct) |
| Append at end | **GAP** | none | ABSENT | ABSENT | ABSENT | variants + mini (real per-track-end composites) |
| Ripple overwrite | **GAP** | none | ABSENT (the primitives private) | ABSENT | ABSENT | variants (push-only — the pull unreachable) |
| Fit to fill | **GAP** | none | ABSENT (rateStretch manual; `calculateSpeed` exists) | ABSENT | ABSENT | variants (a TESTED planner branch) |

**The law's three clauses:**

- **30.1 — the census is the register:** the matrix lives in 06 §0 and is re-derived at every spec round's fleet pass (like the C7 census); every mode × lens cell cites file:line. A cell that says COVERED must quote its row; a cell that says ABSENT must carry the gap row's ID.
- **30.2 — the four absent families become r1-scheduled spec-first families** (per the corpus's posture law: owner + phase + acceptance): REPLACE (a dedicated OT ops family — Decision 31.4), APPEND-AT-END (a placement-level composite — 31.5), RIPPLE-OVERWRITE (the delete+move+insert composite with the delta law — 31.6), FIT-TO-FILL (a compositional family over insert+retime — 31.7). **The landed C7 census (24 routed + 6 exceptions) is NOT reopened** — the new verbs are r1-scheduled rows that re-declare mechanically per the tsc-lockstep/M49C law when they land (the D29.2 pattern).
- **30.3 — the matrix is a ladder gate:** at K2, the engine/OT columns must be LANDED (ported + pinned); at K3, the app column must be wired + pinned. The gate's machine check = the per-mode pinned tests exist at the named files (the mode reports' acceptance rows), not prose.

### Decision 31 — the source-edit family law (06 §5.9 restructure)

The corpus has TWO insert semantics and ZERO stated reconciliation. The law:

- **31.1 — the two-semantics split is named law:** **placement-insert** (the drag-drop/pool insert: OT's `insertElements` — reject-not-shift, the ripple flag's delete-routing, the main-track zero-anchor, F1A-3 homogeneous batches) and **insert-edit** (the DaVinci source-mode splice: split-at-playhead + intrinsic push-down + multi-clip sequential) are DISTINCT operations with DISTINCT homes. Placement-insert is LANDED (OT, canonical). Insert-edit is the engine's 3-point family (`performInsertEdit` :4702) porting to OT's ops layer at r1 per Decision 12.3. 06 §5.9 states both + the boundary sentence: "the placement surface places (rejecting or displacing per strategy); the source-edit surface splices (splitting and pushing)."
- **31.2 — the mid-clip split law is stated:** "insert-edit at a playhead interior to a clip splits that clip at the playhead, places the source between the halves, shifts the right half and everything after by the source duration; the left half NEVER moves." (This is the sentence the corpus lacks — and the sentence the engine's linked defect violates; see Decision 32.)
- **31.3 — §5.9B OVERWRITE EDIT gains its prose:** the covered-clip law from the engine's verified implementation: fully-contained → removed; straddle-both → split ×2, middle removed, left+right remnants survive; head/tail straddle → trimmed remnant; zero downstream movement; transitions referencing removed clips drop; ONE atomic undo. The phantom `placement:'overwrite'` rows (06:3110, 06:3175, 07:367) re-key to this family.
- **31.4 — REPLACE (new family §5.9C):** contract = exact-length swap: the target clip is replaced by the source with the source's OUT auto-adjusted so duration == target duration; downstream does NOT move; transitions at the target's edges REMAP (the `joinItems` pattern, timeline.ts:7411-7427 — not removeItems' cascade-drop); the linked companion is SEVERED not deleted (`linked:false` default — `removeItems`' default-true would delete it); an unfillable source (marked range shorter than the target, no handles) REFUSES with `INVALID_PARAMS` (honest refusal, the corpus's stance). Dedicated op (not a naive composite — the transition-remap + sever semantics need atomicity).
- **31.5 — APPEND AT END (new family §5.9D):** placement-level composite, NO new engine op: append point = the target track's last-element end (per-track law — both mocks + never creates interior gaps); multi-append = pool display order, sequentially accumulated (OT's `insertElements` relative-offset batch = the primitive, one undo entry free); the playhead is IGNORED (the mode's defining law); never a push (the end is free). Linked-append: an A/V pair lands synced at the video track's append point; an audio-track conflict refuses atomically. Wire: the 6th `PlacementStrategy {type:'append'}` + the already-endorsed r1 `insertBatch` composite; an optional `timeline.append` wrapper per the rippleDelete pattern.
- **31.6 — RIPPLE OVERWRITE (new family §5.9E):** the delta law: the target is fully replaced; the source's own duration stands (NO out-adjustment — that is replace's law); downstream shifts by `newDuration − oldDuration` (push if positive, PULL if negative — pull leaves no gap); upstream untouched; one atomic undo. **The classic §12 diff is asymmetric — it produces the PULL exactly but cannot produce the PUSH (freed = ∅, the intermediate state is overlap-rejected)** — so the composite is `delete + move + insert` (three routed verbs, applyBatch, one undo), NOT "overwrite + the ripple flag". 06:1509's "ripple-insert via the diff" row and :3120/:3175's phantom test rows are corrected by this law.
- **31.7 — FIT TO FILL (new family §5.9F):** speed law: `speed = markedDuration / targetDuration` (a LONGER marked range into a SHORTER span speeds UP); the result's timeline duration = targetDuration EXACTLY; the source window = the full marked range; placement = overwrite-style into the selected span. **The acceptance domain is [0.1, 5]** — the three-domain intersection (engine [0.1,16] ∩ OT [0.01,5] ⊂ WDC [1/32,32] ⇒ pitch preserved for every accepted fit); out-of-domain REFUSES with `INVALID_PARAMS` — **never clamps** (a clamped fit silently violates exact-fill). The badge: one decimal ("1.7x"). Compositional first (insert + `updateElements{retime}` — the mocks' mapping); a first-class verb is optional at r2. The audio half consumes WDC's landed W2 (SoundTouch varispeed, the `varispeedRate = elementRate × transportRate` law) — no new audio work.

### Decision 32 — the linked-companion law (06 §5.0 "Linked-companion propagation")

**The per-mode companion semantics are stated NOWHERE as law today** (seven un-cross-referenced fragments; the best statement is a code comment). The law:

- **32.1 — the fan-out table:** 06 §5.0 carries the mode × situation matrix: linked pair present / transitions at edges / sync-locked tracks. Per-mode: slip/slide/roll/ripple-trim — the pair rides the SAME op (one history entry); insert — the pair splits at the same frame, each half re-pairs, the right half shifts (the left-half-never-moves law of 31.2); overwrite — the pair's coverage mirrors the covered-clip law (removed → cascade; trimmed survivor → the companion trims to match); replace — SEVERS (31.4); append — the linked-append law (31.5); fit-to-fill — the pair takes the SAME rate.
- **32.2 — the precedence:** `lock > sync-lock (track-level, §6) > link (clip-level, §5.0)` — one sentence, stated once, referenced everywhere.
- **32.3 — one canonical param name:** `syncLinked` (the 15 wire name) — the engine's `options.linked` and the app store's toggle re-name to it at their next touch (no forced rename wave).
- **32.4 — the split-link ruling:** **relink-both-halves is the law** (Resolve-faithful: a split clip's halves both stay linked to the companion; the engine implements this). The nle-ui/mini R14 right-half-sever is a registered divergence — the D26 carrier-reduction program's reconciliation row, not an immediate change.
- **32.5 — the model-shape reconciliation:** 09's persisted `linkedTo` (pairwise) stays the persistence form; the engine's `linkedGroupId` (groups) is the runtime expansion (pairwise at rest → groups at runtime). One sentence in 09 §B1 + 06 §5.0's pointer.
- **32.6 — the defect row (S-engine, pre-r1, P1):** fix `_performInsertEditImpl`'s Phase 2: the linked expansion must EXCLUDE target-track clips with `from < insertFrame` (the left half), and linked companions that straddle the insert frame are SPLIT there (only their right half shifts). Pin: a linked mid-clip insert fixture with the 4 postconditions (no overlap on the target track; the left half unmoved; the companion split at the same frame; one undo entry). This is the r1 port's precondition — the port must not carry the defect.

### Decision 33 — the visual-grammar register (05 §8A + 18 §9)

**12 of the 13 grammar elements the mocks define are pinned NOWHERE.** The law:

- **33.1 — the register's home:** 05 gains **§8A "Timeline Affordance Grammar"** (the STRUCTURAL half: geometry, states, z-order, state machines — the edge bands, the glow variants, the dimming law, the white-box family, the red active-border, the ghost, the arrow family, the cursor glyph ladder, the fit-slot, the speed badge) and 18 §9 gains the **theme-half tokens** (8 new semantic tokens, mock-derived — trim-edge-green, glow-green, dim-overlay, active-border-red, ghost-fill, arrow-white, slot-dash, badge-chip). The split rides the D25.3 theme/structural law: colors are tokens (18), geometry+states are structure (05).
- **33.2 — the green ruling:** the mocks' GREEN trim grammar is the pinned reference (over 05:949's amber claim — a FreeCut-era citation whose files are no longer in any checkout; 05's grammar-census rows get the R15-era qualifier, the 20:8 precedent).
- **33.3 — the row form:** `element | states | geometry | token refs | owning spec | reference impl` — the two mocks cited per row as the reference figures; the variants' components as the reference implementations where they exist.
- **33.4 — the composite rulings:** slide's mock boxes are a didactic composite — the implementable reading: the CEDING neighbor's box shrinks toward the shared edge, the GAINING neighbor's grows (one box live per gesture side); slip's arrows are headroom/tailroom indicators; the pull case inverts the ripple arrow.
- **33.5 — the sequencing law:** the register lands BEFORE the r1 wave-1 op ports (the grammar otherwise forks a fifth time — after FreeCut, the variants, the mini, and OT's tree).

### Decision 34 — the keyboard family (16's source-edit block)

- **34.1 — the primary chords are source-mode-gated:** `,` insert-edit / `.` overwrite-edit / `Shift+.` ripple-overwrite / `E` append (Premiere/FCP grammar; the C46 gate; zero live risk — no shipped shell has a source viewer yet). The F9-F12 block lands as documented DaVinci-parity ALTERNATES (F9 insert / F10 overwrite / F11 replace / F12 append) with the preventDefault + browser-hostage law (F11 fullscreen; F1 help; macOS fn-defaults). **`Shift+F10` is NOT available** (18 §4.9 owns it as the context-menu route — the ripple-overwrite alternate is F10's family neighbor, not a shift-chord).
- **34.2 — the `,`/`.` context-split is ratified as written law** (it resolves via 16's own multi-descriptor law + §6.2's order: source-mode (panel context) > slip tool (tool context)): 16 §3.4A gains the descriptors; §6.1's row 2 becomes the four-meaning row (source-mode insert/overwrite | slip-by-frame | slide-by-frame | plain nudge).
- **34.3 — the slide-by-frame rows:** with the slide tool armed, `,`/`.` slide-by-frame preserving the 3-clip invariant (mirroring the slip ladder) — the current "any other tool → nudge" fallthrough is a span-breaking trap (a 00:804 violation class).
- **34.4 — the tool-vs-source-edit boundary (three sentences in 16 §3.2):** the TOOL radio owns POINTER gestures (V/B/H/Z/T/Y/U/R + FX); the source-edit modes are NOT tools — they are source-mode operations driven from the media pool + the source viewer (the SourceEditBar surface, 18 §4.3). The radio does not grow insert modes.
- **34.5 — replace + fit-to-fill stay button-first** (no industry plain key; F11 alternate + Cmd+Option+F fallback for replace).

### Decision 35 — the reference register + the adoption-tracking law

- **35.1 — `REFERENCE-REGISTER.md` at the spec root** (cross-spec ownership — not 18 §0): one row per mock surface family: `surface | mock home (component+store) | test pins (count) | owning spec | citation form | divergence rule`. Seeded with the 19 censused families (11 aligned / 3 diverges / 8 mock-only).
- **35.2 — battery-enforced freshness:** the register's test-pin counts re-derive live at every spec round (the battery scrapes the mocks' suites); a count drift without a register amendment is a battery failure.
- **35.3 — the C-ledger intake discipline:** every proposal in the mocks' `.agents/SPEC-REVISION-CANDIDATES.md` (C33-C58 today) gets either a register row (adopted / queued-with-owner) or an explicit DECLINE with a reason — no proposal ages untracked (the root cause the shell-mocks audit found: five-round-old proposals re-derived by every fleet).
- **35.4 — the four doc-level rulings land this round** (register adoption, not new design): SourceEditBar (18 §4.3 rows — the source-edit surface the keyboard family depends on), SourceRangeBar (the source in/out marks — the 3-point family's missing UI primitive; the marks are surface state, ops stay caller-supplied), the deliver RangeBand's spec rows (the R23 W-F surface, never specced), the 3-vs-5 page ruling (a registered OPEN decision — the divergence is documented, the resolution is a future design round, not this one). Marker v2 vs 09-A2 + captions: registered OPEN decisions (their design rounds are future work; the conflicts are now VISIBLE in the register instead of buried).

### Decision 36 — the execution wiring (the plan + the filings + the mechanism rows)

- **36.1 — S-app re-written to the post-D30 state:** the landed waves fold to history; the live rows become: the app's `.agents/` bootstrap (OVERDUE ×2 — before any further app work), the **census-CI mechanism** (D26.2 claims "CI-enforced register-equality" but the app's ci.yml runs no census check — the law now carries its mechanism row: a `scripts/census-check.ts` step in ci.yml, owner S-app, gate = the register equality fails the build), K3's store/policy halves (unblocked, unstarted), the W-G filing reconciliation (below).
- **36.2 — the W-G filing reconciliation (S-engine + S-spec):** the engine's R9 queue (3989506) carries 3-of-4 stale dispositions that predate ARCH-R24's F1 amendments — re-filed: R9-a transform-sidecars → FUTURE-EXTENSION; R9-b maintainPitch → LANDED engine-side (the residual is the app's engineService hardcode — re-filed app-side); R9-c scene-grade → DECLINED-BY-LAW (not filed); R9-d preview-widening → aligned, stands.
- **36.3 — the WDC waveform filing re-venues:** the R24 promotion was filed against `.agents/HANDOFF.md`, but WDC's actual venue is the **repo-ROOT `HANDOFF.md`** (its `.agents/` holds only SKILL.md) — the promotion re-files at the root HANDOFF with the de-facto contract citation (audio-registry.ts:24-74). Second round this filing has missed; the plan's S-wdc row carries the corrected venue + a filing-verification gate (the row is not done until the target repo's queue SHOWS it).
- **36.4 — OT's R9 seam queue absorbs into S-ot** (the mapping: R9-a already spec-side per 15 §13.15; R9-c's hunks fold into the carrier-reduction program; the W8 guard landed — tick; WIRE_UI_EXCEPTIONS-export is a new small row).
- **36.5 — the mode-matrix ladder rows enter the plan** (per 30.3): K2's completeness gate + the per-track routing of the ~76 gap rows (S-spec authoring THIS round; S-engine the defect fix + the mode exposure rows pre-r1; S-ot the r1 port families; S-app the K3 pins).
- **36.6 — estimates HOLD** (crawl 5-11 wk solo / 3-6 two-dev): the D30 completion offsets the census-CI + filings + registration work; the mode gaps are law-authoring (this round) + r1-ports (scheduled); the engine already holds 6/10 algorithmically. **r1 grows +1.5-3 wk solo ONLY IF the user passes the absent-family scope gate at r1-entry** (the four families are spec-first now; their IMPLEMENTATION is r1 scope the user can trim).

---

## 4. The phantom-row fix list (the P-list — all fold into the amendment fleet)

| ID | File:line | The phantom | The fix |
|---|---|---|---|
| P1 | 06:1509 | "ripple-insert: the diff detects the new element as a joined interval and shifts everything right" — the diff can't push (D31.6) | Re-key to the delete+move+insert composite law |
| P2 | 06:3110 | `OVERLAP_DETECTED` rejected "(unless overwrite placement)" — no overwrite placement exists | Re-key to §5.9B's covered-clip law |
| P3 | 06:3120 | `ripple-insert-makes-room` test row — the unreachable path | Replace with the composite's test row |
| P4 | 06:3160 | "slide: sourceStart unchanged" — contradicts the continuity law (06:1293/1298, 15:689-695) | Fix to the continuity-shift statement |
| P5 | 06:3161 | `slide-no-chain-is-noop` mis-name — the chain gates only the source delta; the slide proceeds | Rename + re-state |
| P6 | 06:3175 | `insert-overwrite-vs-ripple` references non-existent placement values | Re-key to §5.9B/§5.9E |
| P7 | 15 §4.3.6 | SlipCommand's element-type list: allows `image`, omits `composition` (06 + engine say the opposite) | Align to 06+engine |
| P8 | 07:367 | The ElementParams "overwrite-only" open-map row cited as a placement strategy | Re-tag as patch-semantics naming collision (hazard note) |
| P9 | 06 10.4:2408 | `performInsertEdit` marked "ALIGNED" against §5.9 — which teaches the OTHER insert semantics | Split the row: placement vs insert-edit (D31.1) |
| P10 | 05:949 | The amber ROLL_COLORS grammar claim (FreeCut files unverifiable — not in any checkout) | Era-qualify (R15-reference) + the green ruling (D33.2) |

## 5. The defect rows (S-engine, pre-r1)

| ID | Defect | Fix + pin |
|---|---|---|
| E1 | **P1: linked mid-clip insert overlap** (00:804 violation; Phase 2 pulls the left half into the shift set; the companion shifts unsplit) | D32.6's fix + the 4-postcondition fixture |
| E2 | Overwrite's companion asymmetry (removed clips cascade; trimmed survivors' companions don't) | D32.1's overwrite row: the companion trims to match; pin = an A/V overwrite straddle fixture |
| E3 | Insert's silent transition-blocked abort (R1-B4: empty return, no error surface) | Re-surface as the error contract (the r1 port carries it as `INVALID_PARAMS`-class, not a silent no-op) |

## 6. The fleet execution order (this round)

1. **The adversarial review of THIS ruling** (2 fresh-context agents: the design-consistency reviewer + the corpus-faithfulness reviewer) → fold → v2.
2. **The amendment fleet** (6 agents): 06 (D30/D31/D32 + the P-list) · 05 (D33 + P10) · 16 (D34) · 18+09 (D33's token half + D35.4's chrome rows + D32.5) · 00+15 (the decisions + the r1-verb rows + P7) · REFERENCE-REGISTER.md + IMPLEMENTATION-PLAN (D35 + D36).
3. **The verification fleet** (fresh-context per amended file + the battery_r25 build + a red-team).
4. **The integration review + the wrap.**

## 7. The battery_r25 preview (the new check classes)

- The mode-matrix presence checks (06 §0's matrix + the four family sections + the P-list rows gone).
- The register checks (REFERENCE-REGISTER.md exists; the 19-family census; the C-ledger dispositions complete).
- The keyboard family checks (16's source-edit block + the four-meaning row + the slide rows).
- The grammar checks (05 §8A's row count + 18 §9's token count).
- The plan checks (S-app's post-D30 state + the census-CI mechanism row + the WDC root-HANDOFF venue).
- The pin re-bases (engine 3989506 / OT fdb771c-code-c15a629 / nle-ui 3026099 / app 64fb0ab — the R25 pins).
- Everything battery_r24 carried (85 checks), re-based.

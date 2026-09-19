# R28-T4-b — adversarial review of the D45/D46/D47 test-law chain (the T2-b design + the landed T3 fold)

**Task ID:** R28-T4-b · **Agent:** adversarial reviewer, fresh context · **Date:** 2026-09-16
**Tree (read-only on the specs; review artifacts only):** `nle-core-spec` @ **`9ad78fa`** (verified `git rev-parse HEAD`). Targets: `audits/fleet-r28/test-law-d45-d47.md` (the T2-b design, authored @ `4b88f8d`) + the landed fold (17-test-plan v1.6's §13A.5/:2333-2334, §13A.7/:2390-2392 + :2396, §13A.8/:2400-2413, §13A.4.1/:2316, §3.1/:566-568; 12-testing-strategy's §5.5/:441-448, §6.4-6.5/:540-549, §8/:721-727, the K2 census row/:26, the battery-posture row/:37; the prereq sweep's 09/15/10/18/04/08/05 edits; the RE-3 probe's landing state).

---

## §0 VERDICTS

| Target | Verdict | Amendments |
|---|---|---|
| **The design** (`test-law-d45-d47.md`) | **RATIFY-WITH-AMENDMENT** | 4 (A1-A4 — one wording over-breadth, one foresight gap, two nits) |
| **The landed fold** (17/12 + prereq sweep @ `9ad78fa`) | **RATIFY-WITH-AMENDMENT** | 4 (L1-L4 — one MEDIUM missing landing site, one MEDIUM-minor anchor drift set, two registration nits) |

**The strongest finding (L1):** the RE-3 transition-remap probe's ruled spec home — **06 §5.9C's GAP set — is ABSENT at HEAD**. The design (§2.5.1) ruled the probe row lands there ("mirrored by ONE 17 §13A.7 facet row"); the landed 17 §13A.7 D46 row (:2391) cites "the RE-3 transition-remap probe (**06 §5.9C's GAP row** — the two-exit gate…)" in the present tense — a dangling forward-cite (06 §5.9C carries only RE-1/RE-2, verified by grep at HEAD; 06-nle-ops.md was not in the T3 commit's 12-file set). The 12 battery-posture row's D46 class names "the RE-3 probe row" as a check input; implemented per the design's own §2.5.4 words ("06 §5.9C carries RE-3 with the two-exit acceptance"), **that battery check goes RED on the current corpus**. The deferral is registered only in the plan's carve (:87, "r1 Stage 2-4 → … the transition-remap probe's 06 §5.9C GAP home") and in the T3-a worklog — not in the 17/12 rows that cite the row as if landed.

---

## §1 The verification sweep (26 independent checks)

### 1.1 The §13A.8 protocol vs the design's §4.1 table — VERIFIED ✓
Six rows = #0 base + the five additions (D42/D43/D44/D46/D47), content verbatim-adapted, order slots intact (Stage 0 · Stage 0 · riders-ride-verbs · probe@Stage-4-entry+diff@Stage 3 · bump@Stage 2-3). One enrichment: row #1's battery check adds "the 06↔17 pin-vocabulary coherence, drifted members NAMED" (from T2-a's design) — an addition, not a distortion. The acceptance sentence (:2413) carries the ordering law ("in that order, with the battery classes as the round-level check") ✓.

### 1.2 The 78→79→80 + 29→31→32-of-80 arithmetic vs 15's live text — VERIFIED ✓ (with one cite defect, L2)
- 15:14 (§0-BASE) states the convention AND the full derivation: "29 + 1 + 1 = 31 of the post-bump 79-member union; `replace` mints 80th with NO counterpart until `timeline.replace` lands (32 of 80 then…)" — the primary cite in 17 §13A.4.1 ("per the convention stated at spec 15 §0-BASE") **resolves correctly** ✓.
- 15:5035 (counterpart row): "29 of 78 … RULED R28/D47: … 29 → 31 (BOTH `retimeKeyframes`' replacement slot AND `insertBatch`'s own new 79th-member slot…)" ✓.
- 15:5037 (insertBatch row): "the union gains the bare `insertBatch` as the 79th member at this r1 fold — 78→79→80, `replace` the 80th; `insert` stays singular, neither deprecated nor aliased" ✓ — the singular-retirement fix is faithfully carried (17 :4's header fix verified: "the singular remove/retime verbs RETIRED — the R28/D47.3 correction: `insert` stays singular").
- 15:5039 (replace row): "insertBatch mints 79th on its r1 fold, replace is the NEXT new member — the 80th; final count 80" ✓.
- Arithmetic re-derived independently: today 29-of-78 (insertBatch folded into insert's slot; the singular-absolute `retimeKeyframe` has no counterpart) → at the 79-member bump, +1 (retimeKeyframes' replacement slot — OT's landed plural IS the member) +1 (insertBatch's own slot) = 31-of-79 → replace mints the 80th (no counterpart) → 32-of-80 once `timeline.replace` lands. **Coherent.** One precision nit: the "29→31→32-of-80" shorthand compresses the interim **31-of-80** state (between the 80th member's minting at Stage 4 and the verb's OT-side landing); 15:14's full statement carries the landing conditions, so the battery class's reconciliation assert has the whole chain — the shorthand alone would not.
- **DEFECT (L2):** the ":5021-:5025" line-range cites in 17 (:2316, :2392) and the "15:5023/:5025" cites in 12 (:4/:19/:37) are **stale by +14 lines** — the prereq sweep's own 15-side insertions (`git diff 4b88f8d..9ad78fa -- 15-wire-protocol.md`: +18/−4, all at :1575-:1632) pushed the §13.15 rows to :5035-:5042. The cites now land on the §13.15 header/table-top. Same-round self-drift: the T3-a/b executors copied the design-time anchors while the sibling T3-c agent was inserting 14 lines above them.

### 1.3 The §6.5 WDC laws vs `test-scout-ot-wdc.md`'s witnesses — VERIFIED ✓ (all five)
1. **nullDepthDb ≥ 60 dB** — scout :115-118: `THRESHOLDS.indistinguishable = { nullDepthDb: 60, peakAbsDiff: 1.2e-7 }` (audio-compare.ts:15-27) ✓; the **silent-reference guard** (`refEnergy===0` → −∞, "must NOT read as a perfect match", :50-61) ✓ carried in §6.5's first bullet; `onsetDeltaMs` ✓.
2. **The [1/32, 32] guards** — scout :150-151(f): "1e-6 → spin; >1e5 → 350 GB OOM … degrade to IDENTITY — never spin, never throw — rate 1/32 → ×32 length; rate 32 → ÷32" ✓ carried verbatim-faithful in §6.5's third bullet; the acceptance-domain-vs-guard-domain split ([0.1,5] intersection vs [1/32,32] WSOLA engine domain) matches 06:2709's D43.10 ruling ✓.
3. **The exact-duration law** — scout :151(a)-(b): "output length is `round(frames/rate)` with NO tolerance (the F1 flush law: a no-flush regression drops ~90 ms at rate 2 …); the internal sizing law (`flushPadFrames ≥ inputChunkSize`)" ✓ carried in §6.5's second bullet with the timeline-side twin (fit-to-fill's exact-fill).
4. **The goertzel pitch oracle** — scout :151(c): "440/660 Hz survive the retime (bin > 0.4) while the CHIPMUNK frequency (input×rate) stays < 0.05" ✓ carried in §6.5's fourth bullet.
5. **The oracle self-test precondition (P-WDC-4)** — scout :121 ("treat failures here as instrument failures, not test noise") ✓ carried as §6.5's first-bullet precondition; the Node-venue law (P-WDC-1, `web-audio-api`, per-test 30s, serial workers) ✓.

### 1.4 The prereq sweep's per-site dispositions — ALL VERIFIED LANDED ✓
- **09's Marker interface** (:308-327): widened `{id, time, label?, color?, duration?, notes?}`; point/range by `duration`; `end = time + duration` ≥ 1 frame ≤ scene duration; `notes` owns OT's `Bookmark.note`, `label` doc-side-synthesized; **`keyword` REJECTED in-field** ✓.
- **09's SceneTracksJSON** (:119-131): the fourth family `captions: CaptionTrackJSON[]` + BCP-47 descriptive-v1 note + `ElementJSON.text` (:221, "FIRST-CLASS here, NOT in `params`") ✓.
- **15's AddMarkerCommand** (git-diff verified): `duration?` + `notes?` landed; the vestigial `type?: 'note'|'chapter'|'todo'|'custom'` RETIRED with the sweep note; the Maps-to D48 amendment + the F8 OT-verb-surface footnote; UpdateMarkerCommand's `Partial<Marker>` widens-by-construction ✓.
- **18's five-page body**: §4.8 (:226-238) re-keyed to FIVE pages (the D50 preamble; Audio = focus mode with the `DESIGN-audio-mode.md:11` verbatim anchor; FX = the one-flag fifth page with the `page==='fx'` density-exemption; ⌘6-⌘9 reserved; DECISION-closed vs IMPL-half distinct) ✓; :41's TL;DR "carries **five pages** (Edit / Color / Audio / FX / Deliver — R28-D50…)" ✓.
- **04:2293 + 08:2168/:2399**: all three ruled-out ⌘1-9 rows re-keyed to the D50 law (⌘1-⌘5 page switches; ⌘6-⌘9 reserved-inert; panels pointer/inspector-routed) ✓.
- **05's caption rows**: §7.3 :337 (the 24px parchment chip carrying the `text` body; frame-clean; shape-ops apply) ✓; §12.1 :739-751 (lane TOP + the family-filter burn-in exclusion — the composite walk covers overlay+main only; the topmost VISUAL layer via the burn-in pass) ✓; §12.2 :758 (32px full / 20px compact) ✓.
- **10:811** (the blocker flip: model half CLOSED, export corpus r5-SCHEDULED) + **10:544-548** (the body-home note; "the params?.text stand-in RETIRES with it") ✓.

### 1.5 The stale-text-form greps — ALL CLEAN ✓
- "3 pages"/"three pages"/"collapses to 3" in 18: **zero hits**.
- `keyword`: only REJECTION rulings (09:321, 09:370, 15:1587, 16:351) + unrelated FCPXML DTD `keywords` attributes — no live keyword field.
- `params?.text`: only the retirement notes (10:546, 09:221) — no live stand-in.
- `ctx.project.markers`: only the A2-retired note (09:603) — no live project-global read.

### 1.6 Anchor/machinery spot-checks — VERIFIED ✓
- 17 §13A.7 D46 row's 06 anchors: RE-1 :1622 ✓, AP-2 :1642 ✓, RO-1/2/3 :1661-:1663 ✓, FF-1/FF-2 :1681-:1687 ✓ (06 untouched by T3 → stable).
- The 06↔17 D42 vocabulary coherence: E1-c @ 06:440 ✓, OW-4 @ 06:1603 ✓ (the mixed-split / prune-CASCADE wording matches the 17 facet row).
- 15 §6.3's **25-code class-tag table** (:3016-:3020, incl. `RATE_OUT_OF_DOMAIN` constraint `domain` + the A-6 restorations) — the D44-A6 class's scrape source is live ✓.
- The flat zod schemas (`KeyframeRefSchema`/`UpsertKeyframesCommandSchema`/`RemoveKeyframesCommandSchema`/`RetimeKeyframesCommandSchema`) exist — now at **:4349-:4382** (the ":4335-:4378" cite in 17 :2392 is stale, L2) ✓ content-wise.
- 16 §3.12's flat keymap rows (:426-:447, the R28-D47 flat self-addressing forms + the ±1/±10 `<runtime>` deltaTicks rows) ✓.
- The K2 census row's five protocol items (12:26) = §13A.8's five additions, same stage slots ✓.
- 08:24's D45 amendment (the R9-c fold + `buildGradeFilterString` engine-side + the app migration registered + the A3 consumer-preview-tier rewording) ✓ — the design's §1 cites all resolve.
- `scripts/battery_r28.py` does not yet exist (r27 is latest) — the battery classes are spec-side law awaiting the W5/W6 script; the fold's "landing WITH battery_r28" is same-round sequencing, not same-instant (consistent with the registered W5/W6 re-base charge).

---

## §2 ATTACKING THE DESIGN (`test-law-d45-d47.md`)

### 2.1 D45 — the projector + the grade seam
- **Venue-blindness as TWO assertions — the right call.** The static dependency census (the layer-fence poisoned-edge class over the venue file set) and the dynamic P12 Proxy/call-counter probe (mutate-the-scene-post-projection ⇒ the held IR is byte-stable) catch **orthogonal failure modes**: an import-free file can still receive scene objects as parameters/closures (only the probe catches); an import edge with no runtime leak is still an architecture violation (only the census catches). Neither subsumes the other. Landed faithfully at 17 :2333 ✓.
- **Does the parity-twin prove "the duck the user hears is the duck the user exports"?** **Not by itself — and the design never claims it does.** §1.2.5 states the split honestly: the fast-venue twin proves *construction* equality (ONE helper, ONE `{grade}` object, the compose-then-filter ORDER, the neutral law); the pixel truth is r3's fragment-pass parity (≤1-LSB-equivalent, shared fixtures, the instrument self-test, the A∘B≠B∘A discrimination) + the slow venue. The construction pin is the correct fast-venue *form* of the duck law — with both venues routed through one helper with one object, the residual risk is the helper/venue rendering itself, which is exactly what r3's parity owns. The staged claim is properly staged; 12 §5.5's third bullet carries the r3 half ✓.
- **Is `buildGradeFilterString`'s closed-set census coherent with the engine's 44-effect registry?** **Yes — the two tiers are distinct by ruling.** research-ns4 :34/:40: the Canvas2D bridge's element-effects path is the honest CSS subset, **Gaussian-Blur-only** ("everything else is an HONEST SKIP — the GPU effects registry renders them at fidelity"); the 44-effect registry is the GPU venue's fidelity tier (D29.5c/A3: the venue's grade home is the r3 fragment passes; the seam is the consumer-preview tier). The closed set {`contrast`,`saturate`,`brightness`,`hue-rotate`} + {`blur`} pins the SEAM's vocabulary, derived from the builder's own output over the full input census (never a hand-copied list) — a new function joining the builder without a spec row fails the census. Coherent with, and correctly narrower than, the registry. The honest-skip family in the never-loss property (§1.1.3: the sticker/graphic exclusion list — element-KIND skips, asserted as the DOCUMENTED exclusions and only those) is a separate, also-coherent census.
- **Nits (A3):** the NS-5 fail-loud rider sentence ("reprojection only on array identity, never per frame" — 08:24's own words) is specified as a verbatim carry in the design but landed at 17 :2333 only as the compressed "identity, never content, never frame-count" paraphrase — acceptable, but the verbatim form was the design's own anti-drift device.

### 2.2 D46 — the four families + the probe
- **The M58 template per family — no material family-specific law missed.** Cross-checked every family's GAP-row acceptance cell against the design: RE-1's cell (one entry; endpoint REMAP not cascade-drop; `linked:false` default; `_commit` keyframe-prune; Tier-1 ×5; the census re-declare) — all instantiated in §2.1; AP-2's cell (append-at-track-end, playhead-ignored, multi-append order + one-entry, linked pair sync + atomic refusal, empty-track→0) — all in §2.2; RO-1/RO-3's cells (the delta law, the pull discrimination, the law-split, the downstream-set diff) — all in §2.3; FF-1's cell (the 37 per-mode pins re-expressed, the A/V same-rate one-commit pin, the refusal law) — all in §2.4. The per-track-NOT-timeline-content-end law, the never-a-push schema pin, the zero-floor law, the ±1-frame tail-drift tolerance, the badge law — all present. **One soft spot (A3):** replace's `linked:false` **default** (a source WITH a companion still lands unlinked — the default, not an option) is carried only via the twin's op signature and the companion-sever pin's outcome; 06 RE-1's acceptance names it as a law and it deserves its own one-line pin.
- **The RE-3 two-exit protocol — sound.** (i) *Can it silently fail?* No at the spec level: the outcome-filing discipline is pinned both ways — exit (A) requires the green test's cite, exit (B) requires the filed D-entry's cite, and "an unevidenced probe is a spec bug" (landed in 17 :2391's pass criterion ✓) closes the silent-failure mode; §6.3's honest limit #3 correctly concedes the human time-box itself is unpinnable. (ii) *Is the pinned test authored BEFORE the spike?* Yes — §2.5.2: "The test is authored BEFORE the spike (the probe is a test-first gate — the pinned test is the exit criterion, not an afterthought); a red test at the time-box's end IS exit (B)." The test content is specified with a discriminating fixture (replace B with a source of different duration ⇒ the remap is observable), so the tautology risk is closed. Matches ARCH-R28 §4.1 D46-B2's binding ruling (verified at :192) field-for-field.
- **The M49C per-verb instantiation — correct for replace, over-broad for insertBatch (A1).** §2.6 Layer 0: "`insertBatch`'s bare form (79th) + `replace` (80th) join the `TimelineCommand` union ⇒ `_WireTypesCoverUnion`/`_WireTypesHaveNoExtra` fail typecheck until listed in `WIRE_COMMAND_TYPES`." For **replace** this is exactly right (the genuinely new OT verb — the gate goes red until listed/routed). For **insertBatch** it is vacuous as written: `timeline.insertBatch` is already listed AND routed at the 970948a pin (D-ARCH-6 — 15:14's census lineage, the routed-28 list); the spec-15 union's 79th-member fold is spec-side markdown and fires no OT-side typecheck. The honest statement is D29-F8's own form — "when a new verb lands" — which only replace's landing satisfies. **Not inherited by the landed fold** (17/12/PLAN carry the census/projection claims without the insertBatch-tsc claim), so this is a design-wording flaw only.

### 2.3 D47 — the param trio
- **The counterpart-count battery class derives from the CONVENTION, not a hand-copied number — the self-healing property holds.** §3.4 scrapes §0-BASE's stated convention (15:14) + §13.15's counterpart column and RE-DERIVES the arithmetic; the reconciliation assert fails on any drift between stated figures and the re-derivation; the stale-projection check fails a landed `replace` whose count was not re-keyed. The anti-tautology law applied to a COUNT ✓. The spec-side homes: 15:14 (convention + derivation) + 17 §13A.4.1 ("per the convention stated at spec 15 §0-BASE… the count re-keys WITH the landing, never ahead of it") ✓.
- **The TOTAL-span ripple pin is discriminating.** d1≠d2≠d3 with all candidate magnitudes numerically distinct kills the first-element-only (d1), max-magnitude (max d_i), and last-element (d3) implementations; every downstream start hand-derived; the one-element degenerate ≡ insert's D31.6 ties both verbs to one law ✓. Landed at 12 §8 :727 ✓ and 17 :2392 ✓.
- **The old-replay deprecation path HAS a test law** — three homes: §3.1's bullet (one old-replay row per retired form, asserting the deprecation envelope's shape — named, stable, non-crashing, never silent acceptance); 17 :2392 ("the old-replay deprecation rows — the grouped forms + the singular-absolute retire at the bump, a named stable envelope, never silent acceptance, never a crash") ✓; 17 §13A.8 #5 + 12's K2 row ✓. Correctly phased: the pins ride the r1 bump (the grouped forms are still valid pre-bump).

### 2.4 The cross-cut — §13A.8's home + ordering
- **§13A.8 is the right home.** The genus reasoning (§4.2) is sound: a recipe with an ordering law cannot be a §13A.7 matrix row without bloating the table's shape; §13A is where every cross-facet verification law lives; a §13B would name a new ROUND's additions and orphan the protocol from the §14.4 sweep's §13A.7 habit. The pointer facet row (:2396) keeps the step-0 sweep finding it ✓ — the sweep's own rule ("a row in §3.1 or §13A.7") is satisfied by the pointer, and §13A.8 is reachable from it.
- **The ordering matches the plan's r1 row field-for-field** (verified against IMPLEMENTATION-PLAN.md:69): D42 @ Stage 0 ✓ · D43 @ Stage 0 ✓ · D44 riders ride their verbs' stages (replace's rider at Stage 4) ✓ · D46 probe @ Stage-4 entry + downstream-set diff @ Stage 3 ✓ · D47 bump @ the param-alignment wave (Stage 2-3, with insertBatch's fold — consistent with AP-1's "r1 (the param-alignment wave… rides insertBatch's endorsed slot)") ✓. The plan's r1 row carries the same five additions with the same slots (landed by the PLAN carve) ✓.

### 2.5 The stage ladder — no contradiction
- replace → **Stage 4** ✓ (plan: "Stage 4 replace (the one greenfield) + the wave-2 families + sync-lock").
- append / fit-to-fill / ripple-overwrite → **Stage 3** ✓, in the plan's composites order (append → fit-to-fill → ripple-overwrite) — the design's §2.7 and the landed 12 §6.4 note both carry the plan's order verbatim.
- The 17 §13A.7 D46 row's "the families land **r1 Stages 2-4** per the leverage map" is a SPAN statement matching the plan's K2 row's own W4-era tagging ("the four composite family rows carry live scheduled rows at r1 Stage 2-4") — the span includes Stage 2 because the composites' carrier dependencies (insertBatch's fold, the param-alignment wave) land at Stage 2-3. Strictly the four FAMILIES land at Stages 3-4. No contradiction, but see A4.
- **The 12 §6.4/§6.5 stage tag ("r1 Stage 3") is RIGHT.** The T3-b re-base (the task brief said "r1 Stage 4") is verified correct: the plan's r1 row puts the composites ladder at Stage 3; fit-to-fill — the only family with a WDC audio half — is Stage 3; **replace = Stage 4 carries NO WDC law** (design §2.1(d): "WDC-side: none direct (replace is not a retime family)"), so a Stage-4 tag for the WDC laws would have been wrong.

---

## §3 ATTACKING THE LANDED FOLD (@ `9ad78fa`)

### 3.1 The §13A.8 battery-check column vs the current corpus
| Row | Battery check | Holds today? |
|---|---|---|
| #0 | mode-matrix re-derive + census lineage | **YES** — the 10-mode matrix registered in 06/17 (plan :49); the census lineage 24→28→30→24+6→25+5→28+3 stated at 15:14 |
| #1 | D42 class (12 §8's closure invariants + the 06↔17 vocabulary coherence) | **YES** — I6-I8 landed (:715-719); E1-c/OW-4 vocabulary verified live at 06:440/:1603 |
| #2 | D43-A3 (check-2 widened) | **YES** (presence-form) — the 17 D43 facet row + 12's class list carry it; the runtime arm is r1 Stage-0's |
| #3 | D44-A6 (25 codes × one class, scraped from 15 §6.3) | **YES** — the class-tag table live at 15:3016-3020 |
| #4 | D46 class (probe-row presence + disposition + mode-matrix rows) | **RED/AMBIGUOUS** — the probe row is absent from 06 §5.9C (L1); only the 17-side clause exists. Per the design's §2.5.4 wording the check fails; per a 17-only reading it passes — the ambiguity is itself the defect |
| #5 | D47 class (counterpart arithmetic + stale-projection) | **YES** — 15:14 + 15:5035/:5037/:5039 live; 17 §13A.4.1 re-keyed; the landing conditions stated |

### 3.2 The prereq sweep — no OLD-text residue, but the sweep's OWN insertions drifted the sibling cites (L2)
The four greped stale forms are all clean (§1.5). The residue is the inverse: the sweep's +14-line insertion in 15 pushed the §13.15/§11 anchors past the cites T3-a/T3-b landed in 17/12 **in the same commit** — 17 :2316 ("15 §0-BASE/:5021-:5025"), 17 :2392 ("15 §13.15/:5021-:5025" + "15 §11 (the flat zod schemas :4335-:4378)"), 12 :4/:19/:37 ("15:5023/:5025"). The §0-BASE cite resolves (15:14 — the load-bearing half is intact); the line-ranges do not (content now :5035-:5042 and :4349-:4382). The T3-c worklog's own "Anchor drifts (post-edit)" discipline was applied to the prereq sites but not re-run against the 17/12 cites the siblings were landing concurrently.

### 3.3 The 12 §6.5 stage tag — RIGHT (see §2.5); the consolidation re-bases — coherent
- The design's §5 map wanted FOUR §3.1 rows for D46; the landed fold consolidated to ONE (17 :567) with the per-family M58 pin sets carried in the §13A.7 facet row (:2391). This is the documented T3-a re-base (the task's own "eight new rows" count + single-topic enumeration won) — coherent, and the facet row carries every family's set, so no law was lost.
- The design's §5 map wanted "the D45/D46/D47 rows + the r1-protocol row" in 12 §0's GAP register; the landed fold consolidated to ONE R28-test-law-fold row (:27) + the five protocol items inside the K2 census row (:26). The per-D laws have their 12-side homes (§5.5/§6.5/§8); the consolidation is a defensible re-base, not a loss.

---

## §4 THE AMENDMENTS

### The design (`test-law-d45-d47.md`) — 4
- **A1 (wording, §2.6 Layer 0):** restrict the tsc-lockstep/gate-red claim to `replace`'s landing; state insertBatch's 79th-member fold as the already-listed/already-routed vacuous case (the gate-leg fires only for a NEW OT verb per D29-F8's "when a new verb lands").
- **A2 (foresight, §5's landing map):** the map's 15-side cites (":5021-:5028", ":4335-:4378") were live at `4b88f8d` but the same-round prereq sweep inserts +14 lines above them — the map should have carried a post-sweep anchor re-verify instruction for the executors (this is the root cause of L2).
- **A3 (nit, §2.1):** add the explicit `linked:false` DEFAULT pin for replace (a source WITH a companion still lands unlinked — 06 RE-1's acceptance names it as a law; the sever pin covers the outcome but not the default-vs-option discrimination).
- **A4 (nit, §2.7):** state once that "r1 Stages 2-4" is the family ROWS' registered span (the carriers land at Stage 2-3) while the four FAMILIES land at Stages 3-4 — the span-vs-landing distinction the 17 row inherits unqualified.

### The landed fold — 4
- **L1 (MEDIUM — the strongest finding):** land the RE-3 probe row in **06 §5.9C's GAP set** (the design's §2.5.1 carries the verbatim row text — ID/gap/owner/phase/acceptance, the two exits, the "cannot silently fail" clause, the D30.3 zero-orphan exercise form), OR annotate 17 :2391 + 12 :37's "the RE-3 probe row" as forward-cites with the plan's r1-Stage-2-4 landing condition. As landed, 17 :2391's "06 §5.9C's GAP row" is a dangling present-tense cite and the D46 battery class is red-or-ambiguous on the current corpus. The design's own T1-d verdict applies verbatim: the probe is the only test in the corpus that gates a family's INCLUSION — "the row must not live only in an audit doc"; today it lives in 17's facet row + the audit + the plan rider, but not at its ruled home.
- **L2 (MEDIUM-minor):** re-key the five drifted cites to the post-sweep anchors: 17 :2316 + :2392 → "15 §13.15/:5035-:5042" and "15 §11/:4349-:4382"; 12 :4/:19/:37 → "15:5037/:5039". (The §0-BASE cites are fine.) A one-pass mechanical edit; without it the D47 class's reconciliation assert greps the wrong lines.
- **L3 (minor, registration):** the design's §5 per-spec `## Testing` mirrors did not land (06 §Testing's four-family rows + the :3305 `ripple-overwrite-composite-makes-room` re-key to the full set; 08 §19's R9-c seam/migration rows; 15 §15.4's flat-form/bump-migration rows; 16's Appendix-C rides K3 per the design's own note) — nor did 17 §14.2's mapping-table repair (the design's item 7, a T1-d P2 rider). These are mirrors (the 12/17 rows are the load-bearing half; §14.4 step-0 is green without them), but the fold's own GAP row (:27) should name them as deferred-with-phase rather than leave them unregistered.
- **L4 (nit):** 12 :27's prereq cite "15:1566-:1600 params" — the AddMarkerCommand sweep spans :1566-:1632 (T3-c's own anchor-drift ledger); re-cite the end anchor.

---

## §5 What was checked and found SOLID (the no-findings list)
The §13A.5 extension's four properties + the two-assertion venue-blindness (:2333) · the {grade} seam pins (:2334) · the §13A.7 D45/D46/D47 facet rows' content vs the design's named pin sets · the §3.1 rows' tier marks · the singular-retirement header fix · the 12 §5.5 parity rows (construction/ORDER/fragment-pass/string law, the closed set) · the 12 §8 D46 invariants incl. the TOTAL-span property and the computed-intersection domain property · the arithmetic's internal coherence (29+1+1=31-of-79; 32-of-80 once replace lands) · the honest-projection labeling ("the count re-keys WITH the landing, never ahead of it") · the K2 row's five protocol items · the plan carve's r1 rider + per-phase landing rows · every prereq site's landed text · the absence of all four stale text forms · 15 §6.3's 25-code table as the D44-A6 source · 16 §3.12's flat keymap rows · 08:24's D45 amendment.

**Blockers: none.** Both targets are ratifiable with the amendments above; L1 is the only one that changes a battery check's outcome on the current corpus.

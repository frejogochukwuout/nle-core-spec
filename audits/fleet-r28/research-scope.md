# research-scope.md — the r1-entry absent-family scope gate: the cost/dependency/risk model for the four absent edit-mode families + the inclusion ruling (R28-W1-f)

**Task ID:** R28-W1-f · **Agent:** research-scope (general-purpose) · **Round:** R28 seal round, W1 research packs · **Date:** 2026-09-15
**The question (ARCH-R28 §2 Group B):** the r1-entry absent-family scope gate — the cost/dependency/risk model for the four absent edit-mode families (append / fit-to-fill / ripple-overwrite / replace), and the inclusion ruling (inclusion set + the deferral lever's exercise criteria + the reversal protocol) (ARCH-R28-seal-round.md:42-44).

**Method:** read-only; every load-bearing claim cites the corpus. Primary decision material: `audits/fleet-r27/mock-leverage.md` §4 (the leverage map rows #7-#10, :110-113) + §5.2 (the Stage sequencing, :136-151) + §5.4 (:157-161). Cost/risk detail: the four R25 mode reports (`audits/fleet-r25/mode-{append,fit-to-fill,ripple-overwrite,replace}.md`). Corpus blast radius: grep-verified reads of 00/05/06/15/16/18 + IMPLEMENTATION-PLAN + REFERENCE-REGISTER + scripts/battery_r27.py. The prior scope-gate card: `audits/fleet-r27/xcut-matrix.md` §3 (:62-80) — this pack extends, verifies, and refines it. Companion packs: `audits/fleet-r28/research-{linkage-engine,linkage-ot,errors,constants}.md` (the Stage-0 dependency set). No repo state modified; sole write = this file + the worklog append.

**The frame.** The four families are spec-first since R25 (D30.2: "the four absent families… are r1-scheduled spec-first families — owner + phase + acceptance per their §5.9C-F GAP rows", 06-nle-ops.md:29). Their laws are DONE — §5.9C replace (:1603-1621), §5.9D append (:1623-1640), §5.9E ripple-overwrite (:1642-1661), §5.9F fit-to-fill (:1663-1681). This gate is therefore **purely an implementation-scope call** (xcut-matrix :64). The only corpus cost anchor: D36.6's registered figure — "r1 grows +1.5-3 wk solo ONLY IF the user passes the absent-family scope gate at r1-entry" (00-master-spec.md:467); D40.1 later removed estimates from the plan in favor of gates (IMPLEMENTATION-PLAN.md:3), so this ruling is framed in gate terms with D36.6 as the scale reference.

---

## §1 The cost model per family

### 1.1 The master table

| Axis | **#8 Append** (§5.9D, D31.5) | **#10 Fit-to-fill** (§5.9F, D31.7) | **#9 Ripple-overwrite** (§5.9E, D31.6) | **#7 Replace** (§5.9C, D31.4/D31A) |
|---|---|---|---|---|
| **D31A class** | composite — `insertElements` relative-offset batch (06:1633; the criterion at 06:1493) | composite — insert + `updateElements{retime}` (06:1673) | composite — delete+move+insert, one `applyBatch` (06:1652) | **the ONE dedicated op** — transition-remap + sever semantics need single-op atomicity (06:1493, 06:1611) |
| **Implementation surface (new code)** | ~3 OT seams, **0 engine**: the 6th `PlacementStrategy {type:'append'}` in the placement union (2-of-5 exposed today, `api.ts:42-50`) + the resolver (per-track t₀, sequential accumulation, the linked-append law, TRACK_LOCKED refusal) + the optional `timeline.append` wrapper (06:1639-1640; leverage map :111). Carrier `insertBatch` is **LANDED BASE** @ `970948a` (15:4916 — "ONE history entry… M49R inverted to the one-entry law") | ~2 OT seams, **0 engine**: the composite's OT-side landing riding the wave-1 rateStretch port (06:1679 FF-1; leverage map :113). The pure law `calculateSpeed` exists both sides (timeline-math.ts:133; OT inverse `retime.ts:51`); **the audio half is DONE** — WDC W2 SoundTouch varispeed, sealed (06:1673; mode-fit-to-fill G6) | ~2-3 OT seams, **0 engine** (reference only): the 3-verb composite (all constituents routed TODAY — "available TODAY over the routed verbs… at crawl", mode-ripple-overwrite :260-263) + the verb decision (dedicated `timeline.rippleOverwrite` OR the InsertCommand replace-placement with the delta-law ripple param — the law-split stated at 15:4920) | **3 NEW code surfaces**: engine `performReplaceEdit` (a corpus-designed op — freecut has none: its source-edit file implements insert+overwrite only, timeline.ts:4513-4515, per mode-replace :111) + OT `ops/replace.ts` + the wire verb `timeline.replace` = **the NEW 79th union member** (15:4918; 06:1620 RE-1). The transition law = the `joinItems :8817` id-remap pattern **re-implemented**, not ported (05:1277) |
| **Test surface (carried + new)** | 6 new pin classes (AP-2, 06:1640): append-at-track-end / playhead-ignored / multi-append order + one-entry / linked pair sync + atomic refusal / empty-track→0 / locked→TRACK_LOCKED. Mock reference pins: mini `App.test.tsx:52-68` + variants `insertPlan.test.ts:151-163` + PR69 C15 (mode-append :108, G6's reference-case list) | **the largest carried set**: the mock's 37 per-mode pins re-expressed OT-side + the A/V pair sync pin + the out-of-domain refusal pin (06:1679 FF-1; mode-fit-to-fill :85). The [0.1,5] domain refusal gets its own error code — the errors pack's `RATE_OUT_OF_DOMAIN` recommendation (research-errors §5-§6) | carried engine signed-shift family (RO-2 acceptance "carried engine tests green in OT", 06:1660; the reference = `rippleTrimItem :3132`'s private push/pull, 05:1279) + new: delta push/pull pins, the trajectory atomicity pin (delete→move→insert passes F1A-2 by construction, 06:1652), the zero-floor pin, the no-gap pull pin, the G-RO-5 pull-case mock test (06:1661) | **zero carried corpus** (the only family with nothing to carry — "no algorithm anywhere", leverage map :161) + 5 Tier-1 pin classes (RE-1, 06:1620): exact-length / no-move / undo atomicity / transition survival / companion untouched + the refusal paths + the RE-2 mock re-alignment pins (`plan.ghost.dur == target.duration ∧ displaced == ∅`, 06:1621) |
| **Dependency set (what it REQUIRES)** | `insertBatch` LANDED (BASE, 15:4916) ✓; the C7 param-alignment wave's strategy exposure (AP-1 rides 15 §13.15's InsertCommand row, 06:1639); **A1 linkage** for the linked-append A/V pair law only (single-lane append needs nothing) | **Stage 1's rateStretch port** (FF-1's vehicle, 06:1679); **A2 constants** (the [0.1,5] three-domain intersection rides the lattice, 06:1669; xcut-matrix :68); A1 (the pair law — same rate both streams, 06:1671); A3/E3 (the refusal envelope) | delete/move/insert + `applyBatch` — **ALL LANDED** ✓; **A1 linkage** (the companion move set + cascade, 06:1651); the §6 sync-lock propagation (spec'd law, engine methods exist — `_propagateRemovedInterval`/`_propagateInsertedGap`, 05:1279; sync-lock's own op-family decision is Stage 4, AFTER — leverage map :119) | **A1 linkage** (the sever law + the linkage field — replace is named in the E5 chain, plan:114); **A3/E3** (the unfillable-source INVALID_PARAMS refusal, 06:1613); the N3 `lockPreCheck` extension (RE-1); the transition-remap pattern in OT's element-owned `transitionOut` model (the leverage map's §4.1 named open risk: "whether OT's `transitionOut` model can host the… state the clamps need", :121) |
| **Risk profile (the trials-and-errors each row names)** | "LOWEST of the ten: kind-split duty (F1A-3), linked-append A/V pair synced at the video track's point, audio-track conflict refuses atomically" (leverage map :111) | "the acceptance domain [0.1, 5]… with INVALID_PARAMS refusal — never clamps (a clamped fit silently violates exact-fill); the badge one-decimal law; audio half is DONE" (leverage map :113) | "the delta law (push if positive, PULL if negative, zero-floor…); the classic §12 diff is asymmetric — pull-only… do NOT build it as 'overwrite + ripple flag'" (leverage map :112; the proof at mode-ripple-overwrite §3.2 :131-153) | "greenfield BOTH sides (the only mode with no algorithm anywhere); the sever-not-delete companion law (`linked:false`); unfillable-source refusal (`INVALID_PARAMS`, never clamped)" (leverage map :110); + the variants mock implements it **WRONG 3× specified, 0× correct** (RE-2, 06:1621) |
| **Cost rank** (xcut-matrix :75-78) | **1 — the cheapest landing of the four** | **2** | **3** | **4 — the most expensive (the one greenfield)** |

### 1.2 The deferral blast radius (grep-verified — what references each family)

Every family is referenced by the same **~12-15-row shell**; the counts per family differ only in the 16-side and 15-side couplings:

| Corpus site | append | fit-to-fill | ripple-overwrite | replace |
|---|---|---|---|---|
| 06 §0 ten-mode matrix row + D30.2/30.3 (06:24-29) | ✓ | ✓ | ✓ | ✓ |
| 06 §5.9X family section + GAP rows (AP-1/2 :1639-1640; FF-1/2 :1679-1680; RO-1/2/3 :1659-1661; RE-1/2 :1620-1621) | 2 rows | 2 rows | 3 rows | 2 rows |
| 06 §10.4/§10.5 coverage rows (06:12, :37) | ✓ | ✓ | ✓ | ✓ |
| 05 §0 GAP register op-family row (05:21 — "the four R25 families… §16.5A's port table carries the engine-side notes") | ✓ | ✓ | ✓ | ✓ |
| 05 §8A ghost grammar (05:624 — ghost widths: replace == target's width, ripple-overwrite == source's width, append/fit-to-fill == placed span) | ✓ | ✓ | ✓ | ✓ |
| 05 §16.5A port-table row (05:1277-1280) | ✓ | ✓ | ✓ | ✓ |
| 15 §13.15 r1-SCHEDULED row (append :4919; fit-to-fill :4921; ripple-overwrite :4920; replace :4918) | ✓ | ✓ | ✓ | ✓ + the 78→79 union bump (:4918) |
| 16 §3.4A primary `E` + F12 alternate (16:270, :281) | ✓ | — (no key by design, 16:285) | ✓ + the `⇧⌥.` primary + the #19/#20 four-meaning conflict rows (16:653; the resolution rows exist BECAUSE of this chord, 16:32) | F11 only (button-first, 16:285) |
| 18 §4.3 SourceEditBar 7-mode row (18:175 — the bar's contract names all four) | ✓ | ✓ | ✓ | ✓ |
| 00-master: D30 (:437-439), D31/31A (:3), D36.5/36.6 (:467), §2A.8 (:500) | ✓ | ✓ | ✓ | ✓ + the D31A criterion's ONE dedicated example |
| IMPLEMENTATION-PLAN: r1 op-depth Stage 3/4 (:65), the user-gate text (:72), S-spec row (:25), K2 (:104), the E5 dependency chain (:114) | ✓ | ✓ | ✓ (named in E5) | ✓ (named in E5) |
| REFERENCE-REGISTER row 1 (register:24 — the EXECUTABLE-WITNESS mock family, 30 pins) + the D26.4 retirement triggers keyed on the LANDED flips (register:12) | ✓ | ✓ | ✓ | ✓ + RE-2 (the mock's wrong-law branch stays un-fixed — the divergence becomes standing) |
| scripts/battery_r27.py: the 06 family-sections check (:424-427), the mode-matrix homes (:461), the 16 chords (:555-559), **the r1-SCHEDULED ≥ 4 count in 15 (:630)** | ✓ | ✓ | ✓ | ✓ |

**The structural finding:** no reference in the corpus CONSUMES a family's output — every reference is a scheduling/citation row. The one dependency edge in the plan runs the OTHER way: "The linkage-model ruling (Stage 0, D41) → the r1 ports of insert-edit/overwrite/replace/ripple-overwrite + the companion fan-out" (IMPLEMENTATION-PLAN.md:114, the E5 chain). This is the stage-containment claim's proof base (§4 below).

---

## §2 The inclusion analysis

### 2.1 The four variants

| Variant | r1 scope added | The corpus state it yields | What breaks / costs |
|---|---|---|---|
| **A — FULL (all four)** | the D36.6 delta (+1.5-3 wk solo, 00:467 — the registered scale anchor) | **10/10** mode matrix at r1-exit; register row 1 fully consumable; every SourceEditBar button real (18:175); all four mock-retirement triggers reachable (register:12) | the replace greenfield is carried — isolated LAST in Stage 4 (leverage §5.2 :149) |
| **B — three composites (cut replace)** | composites only | 9/10 | the D31A dedicated-op criterion unexercised (its one instance deferred, 06:1493); the F11 button "honest-refusing forever" (xcut-matrix :80); RE-2's wrong-law mock branch never re-aligned (06:1621 — the divergence becomes standing); the 05 §8A replace ghost-width tell unimplementable |
| **C — the cheap pair (append + fit-to-fill)** | append + fit-to-fill | 8/10 | all of B's costs + the `⇧⌥.` primary chord orphaned — 16's #19/#20 four-meaning conflict rows exist BECAUSE of this chord (16:32, :653): a 16-side rework, not a re-tag; the delete→move→insert order law (F1A-2's trajectory proof, 06:1652) unexercised |
| **D — none** | the trim + source-edit ports only (the 6 engine-complete modes) | 6/10 wired at r1-exit | four registered deferrals; register row 1's EXECUTABLE-WITNESS never consumed — the mock surfaces never retire (register:12); the K3 app column never completes the family |

### 2.2 Fidelity per unit of risk

The user's standing ambition is "the full NLE at DaVinci/web-DAW depth" (ARCH-R28 §0 context; the r1-r6 run phases). The corpus's own definition of edit-mode completeness is the ten-mode matrix — D30's census, re-derived every fleet pass (00:437-439), with the K2 zero-orphan law and the K3 app-column-matches-LANDED gate (06:29). Any cut therefore trades directly against the ambition's own census.

Per-unit-risk arithmetic (from §1.1):
- The **three composites** ride landed verbs, carry spec'd laws, and have named pin sets; their combined risk is dominated by ripple-overwrite's delta-law asymmetry — a bounded, documented trap (the mode report PROVES the push half is structurally absent from the classic diff and prescribes the honest 3-verb composite, mode-ripple-overwrite :131-186). Their carriers are BASE (append: `insertBatch` LANDED, 15:4916; fit-to-fill: both verbs routed, 06:1673; ripple-overwrite: all three verbs routed, mode-ripple-overwrite :263).
- **Replace** carries the only unbounded risk (greenfield both sides — no algorithm anywhere, leverage :161) and the only cross-repo new-op cost (engine + OT + the 79th union member). But it is (a) the best-specified gap in the fleet (mode-replace :179 — "the mode pins the semantics, the R20 doc pins the grammar, and the engine already exports every primitive the op needs"), (b) sequenced LAST (Stage 4, leverage :149), and (c) cuttable at Stage-4 entry at zero rework (§4).

**Verdict: variant A maximizes DaVinci-class fidelity per unit of risk.** The composites are cheap-anchored; replace's risk is isolated and reversibly deferred; the marginal cost of inclusion is the D36.6 delta against a completeness census the ambition itself defined. The prior card's recommendation — "pass the gate for all four" (xcut-matrix :80) — is **verified and adopted**; this pack adds the deferral lever's full cut order + exercise criteria + reversal protocol, which the prior card lacks.

### 2.3 The zero-orphan form under each variant

D30.3: "at K2 every matrix row is either LANDED… or carries a live r1-scheduled row with owner + acceptance — zero orphan rows (the completeness is over the REGISTER, not over landed-ness)" (06:29). A cut family's row does NOT become an orphan — it becomes a **registered deferral**: the §5.9X GAP row re-points to a later phase (r2/r5) keeping owner + acceptance. What a cut DOES require: (a) the 06 §0 matrix row's phase cell re-tag, (b) the 15 §13.15 row's marker re-tag (the battery's r1-SCHEDULED ≥ 4 count at battery_r27.py:630 re-calibrates in battery_r28), (c) the plan's Stage-line + user-gate text edit, (d) the K2 registration note. All mechanical; none is a rework of landed anything (nothing is landed).

---

## §3 The deferral lever (the mid-flight trim criteria + the cut order)

### 3.1 The cut order — verified and refined

The prior card names replace "the one defensible cut" (xcut-matrix :80). **Verified as the FIRST cut; refined into the full order** (reverse of the cost ranking, cross-checked against the risk column):

**replace → ripple-overwrite → fit-to-fill → append.**

1. **Replace** — the only greenfield (new engine op + new OT op + the 79th union member + the transition-remap re-implementation; §1.1). Cut cost at any pre-landing point: zero code rework (Stage 4 last, leverage :149). Standing costs if never landed: the F11 honest-refusing button + the D31A criterion unexercised + RE-2 standing (xcut-matrix :80; §2.1 above).
2. **Ripple-overwrite** — the highest-risk composite: the delta law's push/pull asymmetry (the classic diff is pull-only — freed = ∅ on push, the intermediate state overlap-rejected, 06:1652), the verb decision with the law-split (15:4920), and the deepest companion/sync-lock coupling (06:1651). Cutting it additionally orphans the `⇧⌥.` chord and forces the small 16-side rework (§2.1 C).
3. **Fit-to-fill** — bounded risk, but the largest carried-pin set to re-express (37 pins, 06:1679) and two Stage-0 dependencies (A2's domain + A1's pair law).
4. **Append** — cut only under total r1 overrun: the LOWEST cost/risk of the ten modes, its carrier is BASE, and it "can ride any wave" (leverage :111) — it lands at r2 at near-zero marginal cost.

### 3.2 The exercise criteria (measured conditions — when a mid-flight trim becomes the right call)

- **Replace is cut at Stage-4 entry if ANY of:** (a) **Stage 0 slips** — the A1 linkage or A3 error-contract rulings are not folded by the r1-entry fleet round +1 (replace is their heaviest consumer: the sever law + the refusal envelope, plan:114); (b) **upstream budget consumption** — the Stage-2 exit gate (the carried 26-test insert/overwrite pins green in OT, plan:65) is not green at the Stage-4 entry review; (c) **the transition-model probe fails** — the joinItems-pattern endpoint remap cannot be hosted in OT's element-owned `transitionOut` model without a redesign (the leverage map's §4.1 named open question, :121) — a redesign is a new decision round, not an r1 port.
- **Ripple-overwrite is cut at Stage-3 completion if:** (a) the E1-a companion-track-downstream residue ruling (research-linkage-engine's rider — the track-family reading) forces a re-derivation of the delta law's downstream set; or (b) the Stage-3 slot overruns after append + fit-to-fill land.
- **Fit-to-fill is cut if:** the A2 constants ruling fails to register the [0.1,5] intersection domain, or the wave-1 rateStretch port slips past its own exit gate (FF-1's vehicle, 06:1679).
- **Append is cut only if:** r1 as a whole is tripped into its overrun condition (a stage exit gate cannot go green without descoping) — the plan then carries the row to r2 with the strategy + resolver authored spec-side already.

**The gate-failure form (common to all):** a cut is triggered by a STAGE EXIT GATE that cannot go green (the D40.1 law — "a phase ends when its exit gate is green", IMPLEMENTATION-PLAN.md:3), never by a calendar or an estimate.

---

## §4 The reversal protocol (what a cut costs at each point)

### 4.1 The stage-containment claim — VERIFIED

Each family is contained in exactly one stage (append/fit-to-fill/ripple-overwrite = Stage 3; replace = Stage 4, leverage :147-149), and **nothing in the r1-r6 plan depends ON any of the four**:
- The plan's only dependency edge runs INTO them: Stage 0's linkage ruling → the four ports + the companion fan-out (plan:114, the E5 chain).
- Sync-lock (Stage 4) "wraps the TRIM family" — not the composites (leverage :119).
- The wave-2 families are Stage-4 siblings, not composite consumers (leverage :122, :149).
- The C7 rename at r1 END is mechanical either way — a cut family contributes zero names to the rename pass (the census re-declares on LANDING only, D29 F8, 06:29).
- K2 checks the REGISTER (D30.3's explicit form, 06:29); K3's app column matches the LANDED set — a family not landed is simply absent from both checks' landed halves.

Therefore **a cut is a row-flip, not a rework** — the claim in ARCH-R28 Group B (:44) holds.

### 4.2 The cost at each point

| Point | The cut's cost | Form |
|---|---|---|
| **r1-entry review (now)** | ~7 mechanical re-tags: 06 §0 matrix row + §5.9X GAP rows → phase re-point; 15 §13.15 row → deferred marker; 16 §3.4A/F-block rows → dormant (the ripple-overwrite case adds the #19/#20 chord-row edit); the plan's r1 op-depth Stage line + user-gate text; battery_r28's r1-SCHEDULED count re-calibration; the K2 registration note. **Zero code exists; zero rework.** | spec/plan/battery edits only |
| **mid-r1 (pre-landing)** | the same re-tag set + the sunk authoring of any pre-written pin files (pin files are authored WITH the port per the every-port law, plan:65 — a cut before the port's landing loses only the authoring session) | + test-authoring sunk cost |
| **post-r1 (K2+)** | the same re-tag set + the K2 registration's row re-point (the deferral keeps owner + acceptance → zero orphans preserved, 06:29). K3 unaffected (app column = the LANDED set). **The cut surface's mock-retirement trigger never fires** — the register row stays EXECUTABLE-WITNESS and the mock stays the permanent reference (register:12; the mini's standing form, register:41) | register + spec re-tags; the mock-reference state is already law |

### 4.3 The reversal conditions (what re-opens a cut family)

1. **r5-entry** — the polish phase; the register's r5 rows (C12/C11/C14/C15, plan:24) are the natural landing slot.
2. **The D28.2 productization gate's outside-consumer trigger** — any consumer outside the six-stream fleet demanding the verb (IMPLEMENTATION-PLAN.md:72, :135).
3. **A user override** — "a user override later is a cheap amendment, never a blocker" (ARCH-R28 §0.4, :13); the plan's phase cell is a one-line edit.

---

## §5 THE RULING (paste-ready for ARCH-R28 §4, D42+ — the form the orchestrator lifts verbatim)

> ### D4x — the r1-entry absent-family scope gate: INCLUDE ALL FOUR; the deferral lever registered (cut order replace → ripple-overwrite → fit-to-fill → append); the reversal protocol registered
>
> **Decision (the inclusion set):** all four absent families enter r1's scope — append at end (§5.9D, the 6th `PlacementStrategy` riding the LANDED `insertBatch` carrier), fit-to-fill (§5.9F, the insert+`updateElements{retime}` composite riding the wave-1 rateStretch port; audio half DONE — WDC W2), ripple-overwrite (§5.9E, the delete→move→insert composite over three routed verbs, one `applyBatch`), and replace (§5.9C, the one D31A dedicated op — `performReplaceEdit` + `timeline.replace`, the 79th union member). Basis: the cost model (mock-leverage §4 rows #7-#10 + §5.2's stage order; the four R25 mode reports; xcut-matrix §3) — the three composites ride LANDED verbs under spec'd laws with named pin sets; replace's greenfield risk is isolated LAST (Stage 4) and reversibly deferred. The registered scale: D36.6's +1.5-3 wk solo (00:467), the only corpus cost anchor, now gate-framed per D40.1.
>
> **The mid-flight deferral lever (the registered trim, in order):** (1) **replace** — cut at Stage-4 entry if Stage 0's A1/A3 rulings are not folded by the r1-entry fleet round +1, OR the Stage-2 exit gate (the carried 26-test insert/overwrite pins green in OT) is not green at the Stage-4 entry review, OR the transition-remap probe fails in OT's element-owned `transitionOut` model (a redesign, not a port). (2) **ripple-overwrite** — cut at Stage-3 completion if the E1-a companion-track-downstream ruling forces a re-derivation of the delta law's downstream set, or the Stage-3 slot overruns after append + fit-to-fill. (3) **fit-to-fill** — cut if the A2 constants ruling fails to register the [0.1,5] domain or the wave-1 rateStretch port slips its gate. (4) **append** — cut only under a total r1 overrun; it rides any wave and lands at r2 at near-zero cost. **Exercise form:** a cut fires ONLY on a stage exit gate that cannot go green — never a calendar. A cut is a REGISTERED DEFERRAL, not an orphan: the family's §5.9X GAP row re-points to its new phase keeping owner + acceptance (the D30.3 zero-orphan form).
>
> **The reversal protocol:** each family is stage-contained (Stage 3 composites; Stage 4 replace) and nothing in the r1-r6 plan depends on any of them (the E5 chain runs Stage 0 → the ports; sync-lock wraps the trim family; the C7 rename is mechanical either way; K2 checks the register, K3 the landed set). A cut at r1-entry review = ~7 mechanical re-tags (06 §0 + §5.9X, 15 §13.15, 16 §3.4A/F-block, the plan's Stage line + user-gate text, battery_r28's r1-SCHEDULED count, the K2 registration note), zero code rework; mid-r1 adds only sunk pin-authoring; post-r1 adds the K2 row re-point and leaves the mock as the standing reference (its retirement trigger keys on the LANDED flip that never fires). Re-opening conditions: r5-entry; the D28.2 outside-consumer trigger; a user override (a one-line plan amendment — ARCH-R28 §0.4).
>
> **Riders:** (a) the sequencing is the leverage map's Stage 3 order (append → fit-to-fill → ripple-overwrite) with replace in Stage 4 — the internal order IS the cut order reversed; (b) the fit-to-fill refusal lands as `RATE_OUT_OF_DOMAIN` per the errors pack (research-errors §5); (c) cutting ripple-overwrite additionally requires the 16 §3.4A `⇧⌥.` chord + the #19/#20 four-meaning rows to be re-keyed (a 16-side edit, still no code); (d) cutting replace leaves the D31A dedicated-op criterion stated-but-unexercised and the RE-2 mock divergence standing — both registered, neither blocking; (e) the battery_r28 check class re-calibrates the r1-SCHEDULED count to the surviving set (the deferral markers are the new check targets).

---

## §6 Provenance

Read-only round. Sources: audits/fleet-r27/mock-leverage.md (§4 :98-122, §5 :126-161); audits/fleet-r25/mode-{append:1-117, fit-to-fill:1-164, ripple-overwrite:1-347, replace:1-179}.md; audits/fleet-r27/xcut-matrix.md (§1 :14-25, §3 :62-80); audits/ARCH-R28-seal-round.md (:42-44, :13); audits/ARCH-R25-edit-mode-completeness.md (D31A :71); 06-nle-ops.md (:12, :14-29, :1493, :1603-1681); 05-timeline.md (:4, :21, :624, :1262-1283); 15-wire-protocol.md (:31, :4909-4921); 16-keyboard-shortcuts.md (:32, :270, :278-285, :653); 18-ui-shell.md (:4, :18, :175); 00-master-spec.md (:3, :437-439, :467, :500); 09-project-model.md (§B1 via the linkage packs); IMPLEMENTATION-PLAN.md (:3, :25, :65, :72, :83, :104, :114, :135); REFERENCE-REGISTER.md (:9, :12, :24, :41); scripts/battery_r27.py (:424-427, :461, :555-559, :630); the companion packs research-{linkage-engine,linkage-ot,errors,constants}.md. Sole writes: this file + the worklog append (Task ID R28-W1-f).

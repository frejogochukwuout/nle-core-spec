# fleet-r28 — adversarial review: D43 (constants module) + D44 (error envelope)

**Task ID:** R28-W3-2 · **Round:** R28 seal round, W3 (adversarial review) · **Reviewer targets:** ARCH-R28-seal-round.md §4 D43 (`:121-125`) + D44 (`:127-133`) · **Evidence base:** `audits/fleet-r28/research-constants.md`, `research-errors.md`, read live against the corpus tree (OT @ `55c81c0`/`970948a`, engine @ `074a2f6`, WDC `ec8fd5c`, nle-ui, ui-mock). Read-only; no commits.

---

## 1. The verification table (spot-checks, cited)

| # | Claim (ruling → research) | Verified live | Verdict |
|---|---|---|---|
| 1 | OT `core/audio-params.ts` is the volume-dB one-home | `opencut-timeline/src/lib/timeline/core/audio-params.ts:28-30` — `VOLUME_DB_MIN=-60`, `VOLUME_DB_MAX=20`, `DEFAULT_VOLUME_DB=0`; `clampVolumeDb` `:38-43` (non-finite→DEFAULT); `volumeDbToLinear` `:46-48`; header `:14-20` = the zero-import leaf law; barrel re-export at `index.ts:~59-63` | **CONFIRMED** |
| 2 | Engine bridge VALUE-imports the one-home | `nle-engine/src/lib/nle/bridge/opencut-laws.ts:54-61` — 5 names from `opencut-timeline/core/audio-params` + `clampRetimeRate` from `ops/retime`; re-exports `:73-79`; flattener consumes at `scene-to-segments.ts:69/:172/:326/:427/:511/:576/:610` | **CONFIRMED** |
| 3 | The engine's [−60,+12] clamp is ALIVE and divergent | `nle-engine/src/lib/nle/core/timeline-math.ts:410` — `normalized.volume = Math.max(-60, Math.min(12, normalized.volume))`. Divergent from the [−60,+20] one-home (`audio-params.ts:29`; `opencut-laws.ts:78`). The D7 amendment's "no current twin implements it" (`.agents/DECISIONS.md:147`) is **stale** — C1 is real | **CONFIRMED** |
| 4 | Retime domain [0.01,5]; native [0.1,16]; WSOLA [1/32,32] | `ops/retime.ts:11-13` (`MIN=0.01`, `MAX=5`, one type-only import); `timeline-math.ts:51-53` (`MIN_SPEED=0.1`, `MAX_SPEED=16`); `web-daw-core/src/lib/daw/varispeed.ts:36-37` (`1/32`, `32`) | **CONFIRMED** |
| 5 | Spec 15 §6.3 registry = ~24 codes; `SPLIT_INSIDE_TRANSITION` at 15:2884 | Counted at `15-wire-protocol.md:2875-2899`: **exactly 24** codes; `SPLIT_INSIDE_TRANSITION` at **:2884** verbatim; `TRACK_LOCKED` :2881; `NOOP` :2897; `NOT_IMPLEMENTED` :2898 | **CONFIRMED** |
| 6 | OT's `CommandResult` is a flat `{ok, code?, error?, data?}`, no class layer | `opencut-timeline/src/lib/timeline/headless/api.ts:214-228` — flat interface, closed 6-literal `code` enum (INVALID_PARAMS/NOT_FOUND/CONFLICT/NOOP/TRACK_LOCKED/INTERNAL_ERROR); the spec union (`15:2789-2791`) is nowhere in OT. *Citation nit: research says "api.ts" — the file is `headless/api.ts`* | **CONFIRMED** |
| 7 | lockPreCheck: which verbs check locks today | `headless/api.ts:543-554` (helper; comment :536-542); call sites: move :1499, trim :1554, split :1616, delete :1671, rippleDelete :1691, duplicate :1711, updateElements :1897, upsertKeyframe :2139, removeKeyframes :2239, retimeKeyframes :2337 (10 call-sites) + inline: insert :1202-1208, insertBatch, track.remove = **13 TRACK_LOCKED-capable verbs**; 15:4910's "still 12 commands" reconciles | **CONFIRMED** |
| 8 | The insert lock gate fires only on explicit `trackId` | `headless/api.ts:1202` — `if (trackId && this.core.isTrackLocked(trackId))` — a placement resolving its target (append's kind-routing default, `target: ElementRef`) is NOT gated today → the widening is real and necessary | **CONFIRMED** |
| 9 | Cosmetic-exempt element toggles | `nle-engine/src/lib/nle/timeline/timeline.ts:2526-2542` — structural/cosmetic split; "Cosmetic patches (volume, label, transform, effects, fades, …) stay allowed" | **CONFIRMED** |
| 10 | 06 §5.9F's acceptance domain text | `06-nle-ops.md:1669` — "[0.1, 5] — the three-domain intersection: engine freecut-model [0.1, 16] ∩ OT [0.01, 5] ⊂ WDC [1/32, 32]" verbatim | **CONFIRMED** |
| 11 | The mocks diverge (C3) | variants `ui-mock/shell-variants/src/lib/insertPlan.ts:354-356` via `trimLaws.ts:32-33` = **[0.01,5]**; mini `shell-mini/src/lib/insertPlan.ts:54-56` = **[0.1,4]** ("the setClipSpeed pair") vs spec [0.1,5] | **CONFIRMED** |
| 12 | The r1 new-verb set | `15:302` wave 1 (roll/slip/slide/rateStretch), `:303` wave 2 (retime/freezeFrame/rangeRemoval), `:4918` replace (79th member), `:304` the 2 element toggles; `06:19` ripple-trim = **`TrimCommand{ripple}`** (a param on the existing trim verb, not a new verb) | **CONFIRMED** (see F-8) |
| 13 | Supporting lattice facts | `group-resize.ts:162-164` (minDuration = ticks/frame, derived); `media-time.ts:23/:25` (`TICKS_PER_SECOND=120_000`, `ZERO_MEDIA_TIME`); `frame-rate.ts` pure, no imports; `audio-scene.ts:1112-1116` `keyGainLinearNative` inline [−60,+20] literals, unfenced (C4) | **CONFIRMED** |
| 14 | nle-ui authoring rails | `Inspector.tsx:963-964` Speed [10,400]% = [0.1,4]; `:1001-1002` Gain [−60,+20]; `ChannelEditor.tsx:91/:99` [−60,+4]; `:209` aux [−60,+6]; `MixerPrimitives.tsx:95`. *Citation error: ChannelEditor lives in `src/components/mixer/`, not `shell/` (research-constants §1.2/§2.2-C2)* | **CONFIRMED** (path fix owed) |
| 15 | Enforcement citations | `17-test-plan.md:450-454` (rule 8, error-path census), `:2263` (codelist × test-ID script); `06:843` (NOOP law), `:1593` (E3 row) | **CONFIRMED** |

**Base result: 15/15 load-bearing claims verified; zero fabrication found in either research pack. The line numbers are accurate at the pinned code state.**

---

## 2. The FIT_TO_FILL_RATE arithmetic (the check the round exists for)

**Computed live:** the three VENUE domains are wired-OT [0.01, 5], engine-native [0.1, 16], WDC-WSOLA [1/32, 32].

```
lower = max(0.01, 0.1, 1/32=0.03125) = 0.1   ← bound by NATIVE_VENUE_SPEED.min
upper = min(5, 16, 32)               = 5     ← bound by MAX_RETIME_RATE
⇒ [0.1, 5] ✓ — matches 06:1669, 15:4921, and the module code (research-constants §3.2).
```

**The derivation is CORRECT.** The alternative computation in the review brief — `[0.01,5] ∩ [0.1,4] ∩ [0.1,16] = [0.1,4]` — substitutes the **AUTHORING domain [0.1,4]** (nle-ui's Inspector rail) for the WSOLA domain. That substitution is the one real hazard: D43 lists `AUTHORING_SPEED` as a derived lattice fact in the same breath as the intersection, and the ruling text says only "the live three-domain intersection" **without naming the three inputs**. A port implementer who reaches for the wrong namespace gets a silently narrower acceptance domain ([0.1,4] — the mini mock's C3 bug promoted to spec law). **Amendment A-1 (mandatory): the ruling names the inputs — `FIT_TO_FILL_RATE = [MIN_RETIME_RATE, MAX_RETIME_RATE] ∩ NATIVE_VENUE_SPEED ∩ WSOLA_RATE` — and states explicitly that `AUTHORING_SPEED` is NOT an intersection input.**

Two derived observations worth registering: (a) the WSOLA domain is slack at both ends today (1/32 = 0.03125 < 0.1; 32 > 5), so the module's live three-way intersection is strictly stronger than 06:1669's static text (a two-intersection + subset assertion) — if WDC ever narrows, the static text over-promises pitch preservation while the computed intersection refuses correctly; the W4 rewrite of §5.9F should adopt the full three-way formula. (b) [0.1,5] excludes the dead zone [0.01, 1/32) entirely (0.1 > 0.03125), so "pitch preserved for every accepted fit" holds.

---

## 3. Attack findings — D43

**F-1 (shape): re-export+derive vs spec-text-only.** The re-export form is the right shape, and the attack fails: OV-01/OV-02's bridge bindings on `ops/retime.ts` and `core/audio-params.ts` are load-bearing (verified #1/#2) — moving them breaks the engine's deep-import; documenting the lattice in spec text alone leaves C3 (three fit-to-fill domains, verified #11) unenforceable and lets any port re-declare a bound. The derived intersection "can never disagree with its inputs" — that property only exists in code. **The module stands.**

**F-2 (self-contradiction?): the nle-ui local `editDomains.ts`.** The one-home law forbids unfenced copies, not twins: nle-ui cannot import OT (the engine-free chrome package law), so its local file is necessarily a fenced twin — the same legal form as WDC's `WSOLA_RATE` twin and the ticks twin (`opencut-laws.ts:46-51`). The battery ⊂-pin is the fence. **Not a self-contradiction** — but the ruling should add one sentence: on pin failure the fix direction is always align-nle-ui-to-the-one-home, never edit the module to match (otherwise the twin inverts into the home). Minor amendment (A-5).

**F-3 (omission?): the WDC carve-out.** Principled, not an omission: WDC is upstream-synced and imports nothing from OT; the relation is documented as the `WSOLA_RATE` twin + the engine's bridge-seams fence — exactly the proven `OPENCUT_TICKS_PER_SECOND` pattern. **Carve-out stands.**

**F-4 (real gap): `NATIVE_VENUE_SPEED` has no fence.** D43 names a fence for `WSOLA_RATE` ("bridge-seams-fenced") and the nle-ui ⊂-pin covers `AUTHORING_SPEED`/`VOLUME_DB_*` — but nothing pins `NATIVE_VENUE_SPEED` ≡ the engine's `MIN_SPEED`/`MAX_SPEED` (`timeline-math.ts:51-53`). If the freecut venue ever narrows, `FIT_TO_FILL_RATE` silently computes from a stale literal. **Amendment A-2: the bridge-seams test deep-imports `core/edit-domains` (it is a pure leaf) and asserts `NATIVE_VENUE_SPEED ≡ {MIN_SPEED, MAX_SPEED}`.**

**F-5 (battery gap): the C1 fold escapes the import-graph fence.** Battery check (2) greps `engine bridge/` for opencut imports — but C1's fix lands in `core/timeline-math.ts` (core, not bridge), creating the first core-file→OT-leaf edge. As written, the fence does not cover the fold. **Amendment A-3: widen check (2)'s scope to "every engine file that deep-imports an opencut leaf" (bridge/ + the folded core site), still leaf-only, never the barrel.**

**F-6 (citation):** research-constants' ChannelEditor path is `src/components/shell/` — actual `src/components/mixer/ChannelEditor.tsx` (lines :91/:99 correct). Fix at the W4 rider pass.

---

## 4. Attack findings — D44

**F-7 (real bug): the class-mapping table drops 3 of the 24 codes.** The research's §5.1 mapping covers 21 of 24: **`TRIM_BEYOND_SOURCE`, `PROJECT_DIRTY`, `JOB_QUEUE_FULL` are unclassed.** D44's "each code tagged with its class" then fails its own battery coherence check ("every fine code in the registry maps to exactly one class"). **Amendment A-6: the amendment table covers all 24 + `RATE_OUT_OF_DOMAIN` = 25, with `TRIM_BEYOND_SOURCE`→INVALID_PARAMS (constraint `source`), `JOB_QUEUE_FULL`→CONFLICT (retryable resource conflict), `PROJECT_DIRTY`→CONFLICT.**

**F-8 (completeness): the 9 lockPreCheck additions vs the ten-mode set.** Mapped against `06:16-27` + `15:302-304/:4918-4921`: roll/slip/slide/rateStretch/retime/freezeFrame/rangeRemoval/replace = the 8 dedicated new verbs (each gated) ✓; **ripple-trim rides `TrimCommand{ripple}`** (`06:19`) on the existing trim gate (`api.ts:1554`) — correctly absent ✓; insert-edit/overwrite/append ride the widened placement-target gate (verified #8: today's check misses resolved targets) ✓; ripple-overwrite/fit-to-fill ride gated constituents via `applyBatch` ✓; the 2 element toggles cosmetic-exempt (verified #9) ✓. **The 9-count is complete — BUT it silently depends on the 06:19/15:4909 verb forms, and D47.3's parenthetical ("dedicated verbs… roll/ripple-trim/slip/slide/replace/insert-edit") reads ripple-trim and insert-edit as dedicated verbs; if that reading wins, the count becomes 10–11. Amendment A-7: D44 names the riders (ripple-trim→trim{ripple}'s existing gate; insert-edit/overwrite/append→the widened placement gate; the two composites inherited) and registers the D47 dependency.**

**F-9 (real gap): the "two sanctioned exceptions" are actually three ok:true families.** D-T7's same-position `moveElements` returns **TRUE** with zero history (`timeline-core.ts:1059-1066`; pinned `milestones-tround.ts:322-346`; "the return asymmetry … is load-bearing, DECISIONS #23 ruling 2") — a non-mutating `ok:true` on a LAYOUT verb that violates the never-silent law as D44 states it. Also: the first "exception" (the NOOP zero-clamp) is not an exception at all — it returns `ok:false` + code (`06:843`), i.e. the compliant form. **Amendment A-8: restate — the law governs `ok:true`; NOOP is the compliant benign refusal; the sanctioned `ok:true` non-mutations are the benign-echo family (the A9 set-alls `api.ts:2425-2432`, the zero-delta `retimeKeyframes` `:2358-2366`, and D-T7's same-position move), each with an honest `changed:false`/echo payload and no `applyBatch` abort.**

**F-10 (taxonomy): NOOP as a class.** Sound: NOOP is already in OT's closed `code` enum (`api.ts:221`), always emitted `ok:false`, chip-benign (DECISIONS #25 ruling 6 per 15:4910), and the corpus already implies the two-tier grammar (15:330 names the class-level INVALID_PARAMS/NOT_FOUND/CONFLICT/NOOP/INTERNAL_ERROR distinct from the registry). It is a benign-refusal class, not a success shape — the success counterpart is the echo family (F-9). **No change.**

**F-11 (union reconciliation): the "consumer-side view" claim is half-true.** The flat shape carries the failure arm's full content (code+error ↔ `CommandError`), but the union's success arm requires `stateChange` + `undoInfo`, which OT carries **out-of-band** (15:4911: "absent — out-of-band readouts", disposition CORRECTIVE: "Add stateChange to results OR spec-note that readouts serve T1 tests"). The research's own §5.4-2 ("both carry identical information") contradicts its §2.1. **Amendment A-9: the reconciliation sentence says the union is a view of the flat payload PLUS the out-of-band readouts, and the same §6.3 edit resolves 15:4911 (recommend: the spec-note option — readouts serve T1; `stateChange` stays out-of-band v1).**

**F-12 (duplicate check): `RATE_OUT_OF_DOMAIN` is genuinely new.** All 24 registry codes scanned: `TIME_OUT_OF_RANGE` is exportFrame time; `TRIM_BEYOND_SOURCE` is source-window bounds; nothing covers a rate domain. ✓ No duplication. Note: it needs the new constraint type `'domain'` added to `15:2911`'s union (`'overlap'|'source'|'transition'|'lock'|'compatibility'`) — present in the research but unnamed in D44's ruling text; fold into A-6's amendment table.

**F-13 (E3): no new code — confirmed.** `SPLIT_INSIDE_TRANSITION` at 15:2884, class INVALID_PARAMS, constraint `transition` already in the :2911 union; satisfies `06:1593` verbatim. The arm-classified typed-refusal mechanism (option c) is OT's existing pattern (insert :1250-1260, delete :1676-1679). ✓

---

## 5. Verdicts

### D43 — **RATIFY-WITH-AMENDMENT**

The design is verified sound at every load-bearing point: the one-home exists and is bridge-bound (#1/#2); the [−60,+12] divergence is real (#3); the re-export+derive shape is the only form that keeps OV-01's bindings and kills C3 by construction (F-1); the nle-ui local file and the WDC carve-out are lawful twins, not contradictions (F-2/F-3); **the FIT_TO_FILL_RATE arithmetic computes [0.1, 5] correctly** (§2). Amendments (A-1, A-2, A-3, plus the F-6 citation fix and the A-5 sentence) are sentence-level additions, none structural.

### D44 — **RATIFY-WITH-AMENDMENT**

The two-tier taxonomy formalizes what the corpus already implies (15:330 vs the 24-code registry, verified #5/#6); NOOP-as-class is coherent (F-10); E3 reuses an existing code correctly (F-13); `RATE_OUT_OF_DOMAIN` is not a duplicate (F-12); the 9 lockPreCheck additions are complete for the ruled verb forms (F-8). But the amendment set is load-bearing, not cosmetic: **the class map must cover all 24 codes (3 are dropped — F-7), the exception list must generalize to the benign-echo family or D-T7's pinned behavior is a day-one spec violation (F-9), and the union-view sentence must be honest about the success arm (F-11).** Without A-6/A-8/A-9 the ruling's own battery coherence checks fail.

---

## 6. The amendment list (for the W4 corpus pass)

| # | Ruling | Amendment (concrete) |
|---|---|---|
| A-1 | D43 | Name `FIT_TO_FILL_RATE`'s inputs: `[MIN_RETIME_RATE, MAX_RETIME_RATE] ∩ NATIVE_VENUE_SPEED ∩ WSOLA_RATE` → [0.1, 5]; state `AUTHORING_SPEED` is NOT an intersection input (the [0.1,4] trap); note the binding constraints (native min 0.1, wired max 5; WSOLA slack both ends) |
| A-2 | D43 | Add the `NATIVE_VENUE_SPEED` fence: bridge-seams asserts the deep-imported module ≡ engine `MIN_SPEED`/`MAX_SPEED` (the WSOLA/ticks pattern) |
| A-3 | D43 | Widen battery check (2) to cover the C1 fold's core-file→OT-leaf edge (bridge/ + the folded `timeline-math.ts` site), still leaf-only |
| A-4 | D43 | Fix research-constants' citation: ChannelEditor is `src/components/mixer/ChannelEditor.tsx` (not `shell/`) |
| A-5 | D43 | One sentence on the nle-ui twin's failure mode: pin failure → align nle-ui to the one-home, never edit the module to match |
| A-6 | D44 | The class-tag table covers **all 24** registry codes + `RATE_OUT_OF_DOMAIN` (25): add `TRIM_BEYOND_SOURCE`→INVALID_PARAMS/`source`, `JOB_QUEUE_FULL`→CONFLICT, `PROJECT_DIRTY`→CONFLICT; add constraint type `'domain'` to 15:2911's union |
| A-7 | D44 | Name the lock-gate riders: ripple-trim→`TrimCommand{ripple}` on trim's existing gate; insert-edit/overwrite/append→the widened placement-target check; ripple-overwrite/fit-to-fill→inherited via `applyBatch`; register the D47.3 dependency (a dedicated-verb re-shape re-opens the count) |
| A-8 | D44 | Restate the never-silent exceptions: NOOP is the compliant benign refusal (`ok:false`); the sanctioned `ok:true` non-mutations are the benign-echo family — A9 set-alls, zero-delta `retimeKeyframes`, D-T7 same-position `moveElements` — honest echo payload, no batch abort |
| A-9 | D44 | The union-reconciliation sentence: the spec union is a consumer-side view of the flat payload **plus the out-of-band readouts** (`stateChange`/`undoInfo` absent from the wire, 15:4911); resolve 15:4911's disposition in the same edit (recommend the spec-note option) |
| A-10 | D43 (W4 rider) | Rewrite 06 §5.9F/§11.7's formula as the live three-way intersection (the module's form), replacing the two-intersection+subset text |

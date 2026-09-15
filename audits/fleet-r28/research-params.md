# research-params — the r1 param-alignment trio (R28-W1-g, decision Group C)

**Agent:** research-params (the R28 seal round, W1) · **Date:** 2026-09-15 · **Task:** R28-W1-g · **Read-only:** nle-core-spec, opencut-timeline (OT). One output file; no commits; no state-modifying git.

**Mandate** (ARCH-R28 §2 Group C, `audits/ARCH-R28-seal-round.md:46-50`): the three wire-shape decisions pre-filed at R27 (R11, RATIFIED — `audits/fleet-r27/review-rulings.md:73`): (1) singular-absolute vs plural-delta; (2) per-element vs flat lists; (3) `insertBatch`'s bare-verb vs the union's `insert{elements[]}` superset. OT itself left all three open on the record (`api.ts:163-166`, `:183-186` — "the r1 param-alignment decision, not ours to pre-empt").

**Pins:** spec corpus @ R27 fleet state · OT HEAD `55c81c0` (code pin `970948a`, 632/632 — the wire census **31 = 28 routed + 3 exceptions**, M49C machine-checked). Every claim carries file:line.

---

## 1. The extraction — the verb shapes AS THEY EXIST

### 1.1 Spec 15's union (the 78 members, `15-wire-protocol.md:187-283`)

| § | Command | Params (verbatim shape) | Form |
|---|---|---|---|
| 4.3.1 `:423-457` | `split` | `{time, trackIds[] \| null, retainSide?, rightElementIdSeed?}` | plural targets + **absolute** time |
| 4.3.2 `:467-516` | `trim` | `{elementId, edge, delta, ripple, syncLinked?, skipAdjacentClamp?}` | **singular + delta** |
| 4.3.3 `:518-579` | `move` | `{elementIds[], delta, targetTrackId}` **or** `movePlan?: PlannedElementMove[]` (`:555-560` — per-element `{elementId, sourceTrackId, targetTrackId, newStartTime}`) | **plural + shared delta** (simple) **or per-element absolutes** (plan) |
| 4.3.5 `:610-643` | `roll` | `{leftElementId, rightElementId, delta, syncLinked?}` | **pair + delta** |
| 4.3.6 `:645-674` | `slip` | `{elementId, delta, syncLinked?}` | **singular + delta** |
| 4.3.7 `:676-705` | `slide` | `{elementId, delta, preserveContinuity?, syncLinked?}` | **singular + delta** |
| 4.3.8 `:707-737` | `delete` | `{elements: ElementRef[], ripple, cascadeDependents?}` | plural refs |
| 4.3.9 `:739-791` | `insert` | `{element: ElementSpec, placement: PlacementStrategy(5), ripple, idSeed?}` — the R25/P11 law: the flag NEVER produces an insert-edit push (`:751-759`) | **singular + absolute** |
| 4.3.10 `:793-820` | `duplicate` | `{elements: ElementRef[], placement?, timeOffset?, idSeed?}` | plural + placement |
| 4.3.11 `:822-854` | `rateStretch` | `{elementId, newDuration, newStartTime?, ripple}` | singular + **absolute** |
| 4.3.12 `:856-883` | `retime` | `{elementId, rate, maintainPitch, keepStartTime?, ripple}` | singular + **absolute** |
| 4.3.15 `:951-977` | `updateElements` | `{updates: Array<{trackId, elementId, patch: Partial<TimelineElement>}>, pushHistory?}` | **per-element absolutes** |
| 4.3.64 `:1831-1855` | `upsertKeyframes` | `{elementId, keyframes: KeyframeSpec[]}` | **per-element grouping**, absolute time |
| 4.3.65 `:1857-1871` | `removeKeyframes` | `{elementId, keyframeIds[]}` | **per-element grouping** |
| 4.3.66 `:1873-1889` | `retimeKeyframe` | `{elementId, keyframeId, time}` | **singular + absolute time** |
| 4.3.67 `:1891-1906` | `updateKeyframeCurves` | `{elementId, keyframeId, curves}` | singular |

§4.1A Keyframe row (`:320`): "`retimeKeyframe` (§4.3.66's singular-absolute form) has NO OT counterpart — the plural delta form is the OT extension pending the r1 union decision."

### 1.2 OT's wire (the 31-verb `TimelineCommand` union, `headless/api.ts:56-212`)

| Verb | Params (api.ts) | Form |
|---|---|---|
| `timeline.insert` `:57-65` | `{element, startTimeTicks, strategy?(2-of-5), trackId?}` | singular + absolute |
| `timeline.insertBatch` `:66-88` | `{elements: CreateTimelineElement[], startTimeTicks, strategy?, trackId?}` — homogeneous (F1A-3); the FIRST element lands at the anchor, later members keep RELATIVE offsets (`:70-77`) | **per-element absolutes + verb-level anchor** |
| `timeline.move` `:89-92` | `{moves: PlannedElementMove[], createTracks?}` — **only the movePlan form** (§13.15 row `:4906`: "repo implements only the movePlan form") | per-element absolutes |
| `timeline.trim` `:93-100` | `{elements: ElementRef[], side: 'left'\|'right', deltaTicks}` | **plural + shared delta** |
| `timeline.split` `:101-108` | `{elements: ElementRef[], splitTimeTicks, retainSide?}` | plural + absolute |
| `timeline.delete`/`rippleDelete`/`duplicate` `:109-111` | `{elements: ElementRef[]}` | plural refs |
| `timeline.updateElements` `:112` | `{updates: ElementPatch[]}` | per-element absolutes |
| `timeline.upsertKeyframe` `:144-155` | `{elementId, trackId, propertyPath, timeTicks, value, …, keyframeId?}` | singular + absolute |
| `timeline.removeKeyframes` `:156-176` | `{keyframes: Array<{elementId, trackId, propertyPath, keyframeId}>}` — **cross-element flat member list** ("the spec's per-element `{elementId, keyframeIds[]}` shape is the r1 param-alignment decision, not ours to pre-empt", `:163-166`) | **flat 4-tuple refs** |
| `timeline.retimeKeyframes` `:177-197` | `{keyframes: Array<{…4-tuple}>, deltaTicks}` — "the keyframe-drag gesture's native commit… The singular ABSOLUTE-time verb is RETIRED; the capability composes as delta = target − key.time" (`:178-186`) | **flat refs + verb-level shared delta** |

Census machinery: `WIRE_COMMAND_TYPES` `:243-275` + the two-direction tsc-lockstep asserts `:277-297` ("a new verb fails `bun run typecheck` until it is listed here, and the coverage assertion then fails until it is UI-routed or registered as a documented exception", `:238-241`); `WIRE_UI_EXCEPTIONS` `:328-335` (3: selectElements / advancePlayhead / trim); `applyBatch` `:2559-2616` with `data.results` `:2573-2612`; the never-guard `:2537-2545`.

### 1.3 The four live gesture-commit seams (the M49C-routed reality)

| Gesture | Commit | Shape the gesture natively produces |
|---|---|---|
| keyframe drag | `timeline.retimeKeyframes` (`use-keyframe-drag.ts:105-122`, dispatch `:116-119`; the D-ARCH-6 S-1 switch, `reviews/arch-design-s17.md:174-179`) | ONE `deltaTicks` + N selected keyframe refs — **shared delta, cross-element** |
| element resize (trim) | `timeline.updateElements` patches (`use-timeline-resize.ts:78-87`; the exception law `api.ts:333-334` "the UI's resize gesture commits through the updateElements patch seam") | the controller computes `{members, side, deltaTime}` → commits **per-element absolute patches** (`group-resize.ts:131-138` `GroupResizeUpdate{trackId, elementId, patch{trimStart, trimEnd, startTime, duration}}`) |
| element drag (move) | `timeline.move` (`use-element-interaction.ts:140`) | **per-element absolute** `newStartTime` (moves[]) |
| DnD single drop | `timeline.insert` (`use-timeline-drag-drop.ts:98-109`) | singular absolute element |
| library multi-insert | `timeline.insertBatch` per kind-group, staggered absolute starts (`view/page.tsx:535-603`, dispatch `:590-599`) | per-element absolutes, one verb-level anchor |
| keyframe delete | `timeline.removeKeyframes` (`use-timeline-actions.ts:407-422`) | flat 4-tuple refs |

M49G pins these through the real UI (`scripts/m49-gestures.mjs:111/:147/:213/:254/:393`). The variants' `insertPlan.ts` is the placement-family reference: the pure planner's output is per-op **absolute** patches (`InsertPatchOp` createTrack/insertElement/removeElement/patchElement, `insertPlan.ts:60-70`) — "preview == commit" by construction (`mock-trim.md:106/:111`).

---

## 2. Decision 1 — singular-absolute vs plural-delta

**Options.** (a) One global convention (all-singular-absolute or all-plural-delta). (b) Per-family: drag-session verbs take deltas, placement/authoring verbs take absolutes. (c) Per-verb ad hoc.

**Precedents already decided.**
- **D-ARCH-6 D6-2** (`reviews/arch-design-s17.md:130-170`) RETIRED the singular `removeKeyframe`/`retimeKeyframe` and rejected "multiplicity-mirroring" on three recorded grounds: (a) classic parity — "a single removal is a batch of one"; **mirroring cardinality in verb choice is a distinction classic does not make**; (b) "the singular retime is ABSOLUTE-time while the drag gesture is DELTA-shaped — routing it for single-key drags means synthesizing absolute times the gesture never natively computed, two code paths for one gesture semantics"; (c) zero callers. The capability clause: "the singular retime's ABSOLUTE-time capability remains expressible: `retimeKeyframes` with `deltaTicks = target − key.time`" (`:161-165`).
- The union itself is already per-family: every trim-family member (trim/roll/slip/slide, §4.3.2/5/6/7) is delta-shaped; every placement/retime member (insert/duplicate/rateStretch/retime, §4.3.9/10/11/12) is absolute-shaped. The union's OWN verbs never mix.
- FreeCut's trim algorithms are all delta-native (`rollingTrimItems(leftId, rightId, editPointDelta)` — 06 §5.5 `:1050`, the `keepTightestDelta` companion law `:1064-1077`; the F5 binary-search clamps compute "the last delta that preserves" — the clamp ENGINE is delta-in/delta-out).

**Consumer evidence.** The drag sessions commit deltas they clamped ONCE at gesture level (the keyframe drag's shared `deltaTicks`, `use-keyframe-drag.ts:105-122`; the resize session's single `deltaTime` over N members, `group-resize.ts:145-150`, `resize-controller.ts:48-73`). The placement paths commit absolutes the planner computed (insertPlan's per-op absolute patches `:60-70`; move's absolute movePlans). The 16 §3.12 nudge rows already compose delta = target − current (`16-keyboard-shortcuts.md:439-440`).

**M49C census implications.** Verb-count changes self-declare mechanically (D29-F8, fired 24→30→31, §13.15 `:4905`); **param-form changes on surviving verbs are invisible to every gate** — no typecheck assert, no coverage gate reads param types. So the ruling must name its own verification (the battery/W6 coherence class, §5 riders).

**Gesture-path evidence.** Preview-then-commit is the universal session shape: preview mutates a private clone/preview state; commit sends ONE wire verb with either the shared delta (drag families) or per-element absolutes (placement families). No gesture anywhere synthesizes per-member deltas (a shared delta copied N times) or per-member absolutes for a drag family.

**RULED (see §5.1):** per-family law — the param form follows the commit's native shape: drag-session families take a verb-level shared delta; placement/authoring families take absolutes; cardinality never picks the verb.

## 3. Decision 2 — per-element vs flat lists

**Options.** (a) Per-element grouped objects `{elementId, keyframeIds[]}` (the union's §4.3.64/65 shape). (b) Cross-element flat member lists of self-addressing objects (OT's landed shape). (c) Flat parallel arrays `{ids: [], deltas: []}`.

**Precedents already decided.**
- OT landed (b) and explicitly declined to pre-empt: "Cross-element by design — marquee selections span elements; the spec's per-element `{elementId, keyframeIds[]}` shape is the r1 param-alignment decision, not ours to pre-empt" (`api.ts:163-166`); the D-ARCH-6 design doc repeats it (`arch-design-s17.md:98-102`).
- The wire's batch laws are already object-addressed: wire-side dedup by the 4-tuple (`api.ts:2229-2235`, `:2328-2335`); F16's NAMED stale-ref NOT_FOUND needs the full object to name ("keyframe X on path Y (element E, track T) not found", `:2252-2263`); batch-atomic `lockPreCheck` maps member objects (`:2239-2246`, `:2337-2344`).
- The aligned-elsewhere rows: `updateElements` is per-element objects on BOTH sides (union §4.3.15 `:951-977` ≡ OT `:112` — the one verb with zero grouping divergence); `move` is per-element `PlannedElementMove[]` on both sides (`:4906` "field-for-field match"); `insertBatch` is per-element `ElementSpec[]` (`:66-88`).

**Consumer evidence.** The box-select/marquee selection is cross-element by nature (`use-keyframe-box-select.ts`, cited `arch-design-s17.md:99-101`); the delete path maps the selection to flat 4-tuples directly (`use-timeline-actions.ts:415-420`).

**Shared delta without N copies.** The retime answer is the precedent to generalize: the shared scalar HOISTS to verb level (`{keyframes: [...refs], deltaTicks}` — `api.ts:187-196`); never `[{keyframeId, delta}, …]` N copies. The tightest-delta law (the clamp computes ONE delta per gesture, 06 §5.5 `:1064-1077`) is only enforceable at the wire if the delta is singular; N copies invite N-way drift and cannot express "one gesture".

**M49C census implications.** None directly (param shape is gate-invisible) — but the flat form is what the 632/632 suite and the M58 pin family already exercise; the union's grouped form has zero implementations anywhere in the fleet.

**RULED (see §5.2):** cross-element flat member lists of self-addressing objects; shared gesture scalars hoist to verb level; parallel arrays are banned (no corpus precedent; positional pairing is truncation-fragile and unnameable on partial failure).

## 4. Decision 3 — `insertBatch` bare-verb vs `insert{elements[]}` superset

**Options.** (a) The union rewrites `insert` as the superset (`element: ElementSpec | ElementSpec[]`), retiring `insertBatch` into it. (b) The union gains a NEW bare `insertBatch` member (two verbs). (c) Everything becomes dedicated per-mode verbs (insertBatch never grows).

**Precedents already decided.**
- The R25/R27 rows pre-ruled the mode split: **dedicated verbs for the op families** — roll/slip/slide exist in the union (§4.3.5-7, r1 wave 1, `:302`); replace is a NEW union member 78→79 (§13.15 `:4918`, D31.4/D31A single-op atomicity); insert-edit is a dedicated op `ops/insert-edit.ts` NOT a placement strategy (D31.1's two-semantics law — "the placement surface places…; the source-edit surface splices", 06 `:1489`; the leverage map mode 5, `mock-leverage.md:108`). **insertBatch-composites for the placement-family modes** — append rides `insertBatch {placement:'append'}` as the 6th strategy (`:4919`, D31.5); ripple-overwrite = delete+move+insert applyBatch / the InsertCommand replace-placement carrying the delta-law ripple (`:4920`, D31.6); fit-to-fill = `insert + updateElements{retime}` (`:4921`, D31.7; first-class verb optional r2). The leverage map's own summary: "the placement layer stays OUT… the new op is `ops/insert-edit.ts`" vs "the 6th `PlacementStrategy` riding insertBatch".
- The C7 fold plan already says "The C7 rename absorbs it as bare `insertBatch`" (§13.15 `:4916`).

**Consumer evidence.** BOTH verbs have live, distinct consumers: the DnD single-drop routes `timeline.insert` (`use-timeline-drag-drop.ts:98-109`; M49G pins it, `m49-gestures.mjs:254`); the library multi-insert routes `timeline.insertBatch` (`view/page.tsx:590-599`); the app's non-test code "drives only `timeline.insert`" (`arch-design-s17.md:156-158`). The echoes differ by design: insert returns ONE minted ref (`api.ts:1255-1259`); insertBatch returns the refs array (`:1354-1364`).

**M49C census implications (decisive).** New verbs self-declare — tsc-lockstep fails typecheck until listed, the coverage gate fails until routed/registered (`api.ts:238-241`, §13.15 `:4905`, proven three times). A param-type widening on an existing verb (option a) is INVISIBLE to every gate — the two-verb state is machine-checked forever, the superset state would be spec-only. Option (a) also rewrites a ROUTED verb's param type mid-flight (28 routed verbs are pinned by M49C origin-attributed firings — a breaking change to live consumers for zero semantic gain).

**Why two verbs is NOT a cardinality violation.** D-ARCH-6's law retires verbs whose ONLY distinction is cardinality when semantics are identical ("a single removal is a batch of one" — identical semantics). `insert` vs `insertBatch` carry DIFFERENT batch laws: one placement pass for the whole block + relative-offset preservation + F1A-3 homogeneity + intra-batch overlap atomicity + whole-batch refs echo (`api.ts:70-80`, `:1318-1370`) — the N×insert applyBatch divergence M49R pinned and insertBatch resolved (one history entry, `arch-design-s17.md:79-87`).

**RULED (see §5.3):** both — dedicated verbs for the atomic op families, insertBatch-composites for the placement-family modes; the union gains bare `insertBatch` as a new member; `insert` stays the singular placement verb (neither deprecated nor aliased).

---

## 5. THE RULINGS

### 5.1 Ruling C-1 — the param-form law (per family, gesture-native)

**The law:** *The wire verb's param form follows the commit's native shape. Drag-session families (the trim family, keyframe retime) commit a verb-level shared DELTA plus a member-ref list; placement/authoring families (insert/duplicate/replace/retime/rateStretch/updateElements/move) commit per-element ABSOLUTES. Cardinality never picks the verb (a single target is a batch of one); an absolute target composes as `delta = target − current`; a delta never distributes into N per-member copies.*

| Family | Verbs | Shape |
|---|---|---|
| Trim/drag | `roll`, `slip`, `slide`, `trim` (+`ripple` flag), `retimeKeyframes` | verb-level `delta` (+ refs/pair/singular) — union §4.3.5/6/7 already correct; §4.3.2/66 amend |
| Keyframe authoring | `upsertKeyframe(s)` | absolute `timeTicks`/`value` |
| Placement | `insert`, `insertBatch`, `duplicate`, `replace`, append/overwrite placements | per-element `ElementSpec` absolutes |
| Retime/rate | `retime`, `rateStretch`, fit-to-fill composite | absolute `rate`/`newDuration` |
| Patch | `updateElements`, move plans | per-element absolute patches/`newStartTime` |

TypeScript (the amended/ruled forms):

```ts
// §4.3.2 TrimCommand — ALIGNED to the landed group+side shape (api.ts:93-100):
interface TrimCommand { type: 'trim'; params: {
  elements: ElementRef[];            // was: elementId (singular)
  side: 'left' | 'right';           // was: edge (same enum, OT's name)
  delta: MediaTime;                  // verb-level shared delta (clamped once by the caller)
  ripple?: boolean;                 // ripple-trim variant (the union's existing flag rides it)
  syncLinked?: boolean; skipAdjacentClamp?: boolean; } }

// §4.3.66 REPLACED — the singular-absolute retimeKeyframe RETIRES:
interface RetimeKeyframesCommand { type: 'retimeKeyframes'; params: {
  keyframes: KeyframeRef[];          // cross-element flat refs (C-2)
  deltaTicks: MediaTime; } }         // verb-level shared delta; 0 → ok:true {changed:false} (F4)
type KeyframeRef = { trackId: string; elementId: string; propertyPath: string; keyframeId: string };
// absolute retarget composes: deltaTicks = target − key.time (16 §3.12's law)
```

Ripple-trim rides `trim{ripple:true}` (the union's flag already exists `:485-491`; the leverage map mode 2's "extend trim OR compose" resolves to the flag — one verb, one delta).

### 5.2 Ruling C-2 — the member-list law (flat, self-addressing, shared scalars hoisted)

**The law:** *Batch params are cross-element arrays of self-addressing objects — each member carries its full address (trackId, elementId, propertyPath, keyframeId…) plus ONLY per-member data. Shared gesture scalars (the delta, the anchor) hoist to verb level — never N copies, never parallel arrays. Per-element grouping (`{elementId, keyframeIds[]}`) retires: the marquee selection is cross-element by nature and grouping forces caller-side bucketing the wire re-flattens anyway.*

```ts
// §4.3.64/65 amended — the flat cross-element form (api.ts:156-176 landed):
interface RemoveKeyframesCommand { type: 'removeKeyframes'; params: {
  keyframes: KeyframeRef[]; } }      // was: {elementId, keyframeIds[]}
interface UpsertKeyframesCommand { type: 'upsertKeyframes'; params: {
  keyframes: Array<KeyframeRef & { spec: KeyframeSpec }>; } }  // was: {elementId, keyframes[]}
// (the routed singular timeline.upsertKeyframe stays as the authoring convenience — live consumer, AR-2)

// The shared-delta expression rule (generalized from retimeKeyframes api.ts:187-196):
interface BatchDelta<T> { members: T[]; delta: MediaTime }   // NEVER: Array<T & {delta}>
```

`insertBatch` already obeys both halves: per-element `ElementSpec[]` with per-element absolute starts + the verb-level anchor `startTimeTicks` (the relative-offset law, `api.ts:70-77`). `move` keeps its two forms (§4.3.3: the shared-delta simple form + the per-element absolute movePlan) — the simple form is the one sanctioned flat-ids+shared-delta shortcut.

### 5.3 Ruling C-3 — the carrier-seam law (both, per the D31 two-semantics boundary)

**The law:** *An edit mode rides a dedicated verb when its semantics are atomic-op (the placement layer cannot express them); it rides insert/insertBatch as a placement composite when its semantics ARE a placement policy. The union gains bare `insertBatch` as a new member; `insert` stays the singular placement verb — neither deprecated nor aliased; the two-verb state is machine-checked by the census, the superset would be spec-only.*

| Mode | Carrier | Citation |
|---|---|---|
| roll / ripple-trim / slip / slide | **dedicated verbs** (delta-shaped; union rows exist) | leverage map modes 1-4; §4.3.2/5/6/7 |
| replace | **dedicated verb** (new member, 78→79) | §13.15 `:4918` (D31.4/D31A) |
| insert-edit | **dedicated op** `ops/insert-edit.ts`; `insertBatch` is the multi-clip intake carrier | 06 `:1489` (D31.1); leverage map mode 5 |
| append | **insertBatch composite** — the 6th `PlacementStrategy {type:'append'}` + optional `timeline.append` wrapper (the rippleDelete pattern) | §13.15 `:4919` (D31.5) |
| ripple-overwrite | **composite** delete+move+insert (applyBatch) / the InsertCommand replace-placement + delta-law ripple | §13.15 `:4920` (D31.6) |
| fit-to-fill | **composite** insert + updateElements{retime}; first-class verb optional r2 | §13.15 `:4921` (D31.7) |
| overwrite | composite-first (split+delete+insert); the op port optional | leverage map mode 6 |

```ts
// The NEW union member (the C7 fold maps timeline.insertBatch → bare insertBatch 1:1):
interface InsertBatchCommand { type: 'insertBatch'; params: {
  elements: ElementSpec[];            // ≥1, homogeneous (F1A-3), per-element absolute starts
  placement?: PlacementStrategy;      // the 6-strategy union incl. {type:'append'} (D31.5)
  anchor?: MediaTime;                 // first-element start; later members keep relative offsets
  idSeed?: string; } }                // result data: { elements: ElementRef[] } (the minted refs)
// insert (§4.3.9) is UNCHANGED: {element: ElementSpec, placement, ripple, idSeed?}
```

### 5.4 The amendment sites

| Spec | Row | Edit |
|---|---|---|
| 15 §4.3.2 `:467-516` | TrimCommand | rewrite to `{elements[], side, delta, ripple?, syncLinked?, skipAdjacentClamp?}`; note OT's landed shape `api.ts:93-100` (the §13.15 row `:4908` flips CONVERGENT→ALIGNED) |
| 15 §4.3.64-65 `:1831-1871` | keyframe rows | the flat cross-element `KeyframeRef[]` form (C-2); the routed singular upsert noted |
| 15 §4.3.66 `:1873-1889` | retimeKeyframe | RETIRED — replaced by plural delta `retimeKeyframes` (+ the F4 zero-delta law, `api.ts:2358-2366`); §4.1A Keyframe row `:320` re-keys (member list: retimeKeyframes); the counterpart count 29→30 (the convention sentence survives — `fleet-r27/review-rulings.md:68` R4(i)) |
| 15 §4.1 `:187-283` + §4.1A `:294-326` | the union | + `InsertBatchCommand` (+ `replace` already ruled 78→79 → **80**); the §4.1A Timeline row gains insertBatch (home OT) |
| 15 §13.15 `:4905-4921` | the C7 worklist + rows | the insertBatch row `:4916`'s "stays OPEN" clause closes (this ruling); the coverage row `:4914`'s convention sentence re-keys; the keyframe row `:4915`'s (a)/(b) clauses close |
| 16 §3.12 `:439-440` | nudge rows | already carry the delta-composition annotation (verify wording post-ruling) |
| 06 §5.2/§5.9D | trim mapping + kind-split | point at the ruled shapes (the G-SLIP-4 delta-space convention: timeline ticks, per research-constants §3.2) |
| battery_r28 | new checks | (1) presence: the rewritten §4.3 rows cite the flat/group shapes; (2) the 29→30 counterpart flip; (3) the two-verb law (insert + insertBatch both in WIRE_COMMAND_TYPES; the superset `element: ElementSpec[]` never appears); (4) 16 §3.12 composes `retimeKeyframes` |

---

## 6. RECOMMENDATION (paste-ready)

**C-1 (singular-absolute vs plural-delta):** PER-FAMILY, GESTURE-NATIVE — drag-session families (trim/roll/slip/slide, retimeKeyframes) commit a verb-level shared delta; placement/authoring families (insert/insertBatch/replace/retime/rateStretch/updateElements/move) commit per-element absolutes; cardinality never picks the verb; absolute retarget composes as delta = target − current. *Strongest precedent: D-ARCH-6 D6-2's rejection of multiplicity-mirroring — "the singular retime is ABSOLUTE-time while the drag gesture is DELTA-shaped — routing it for single-key drags means synthesizing absolute times the gesture never natively computed" (`arch-design-s17.md:152-155`).*

**C-2 (per-element vs flat):** CROSS-ELEMENT FLAT MEMBER LISTS of self-addressing objects; shared gesture scalars hoist to verb level (never N copies, never parallel arrays); the union's per-element `{elementId, keyframeIds[]}` grouping retires. *Strongest precedent: OT's landed shape + its own refusal to pre-empt — "Cross-element by design — marquee selections span elements" (`api.ts:163-166`); retimeKeyframes' `{keyframes[], deltaTicks}` is the shared-delta-without-N-copies pattern to generalize (`api.ts:187-196`).*

**C-3 (insertBatch vs superset):** BOTH, PER THE D31 TWO-SEMANTICS SEAM — dedicated verbs for the atomic op families (roll/ripple-trim/slip/slide/replace/insert-edit); insertBatch-composites for the placement-family modes (append/ripple-overwrite/fit-to-fill, overwrite composite-first); the union gains bare `insertBatch` as a new member; `insert` stays the singular placement verb (neither deprecated nor aliased — both have live routed consumers). *Strongest precedent: the M49C/tsc-lockstep census machinery — new verbs self-declare mechanically while a param-type widening is gate-invisible (`api.ts:238-241`, D29-F8 fired 24→30→31), so the two-verb state is machine-checked and the superset would be spec-only.*

**Conflict count: 0 corpus-internal contradictions (the union's grouped/singular forms are the r1-pending divergences this ruling closes, not live conflicts); 3 union amendments (§4.3.2 group form; §4.3.64-65 flat form; §4.3.66 plural-delta replacement) + 1 new member (InsertBatchCommand) + the §4.1A/§13.15/16 re-keys.**

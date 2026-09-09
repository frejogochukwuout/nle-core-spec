# Mode audit — FIT TO FILL (Fleet R25, mode-focus series)

**Mode:** Fit to Fill (DaVinci edit-function family, mode *j* of the 10-mode census) · **Date:** 2026-09-09
**Auditor task:** verify the corpus-wide absence, then build the spec-first design analysis + the four-module seam map (this mode has the fleet's deepest cross-module seam: **speed change = retime + varispeed audio**).
**Corpus (read-only, verified this pass):** `nle-core-spec` (00/05/06/15/16 + `ui-mock/timeline_edit_modes (2).html` + `ui-mock/shell-variants` + `ui-mock/shell-mini`), `nle-engine` @ `3989506` (timeline.ts 7,503 LOC re-read at the cited lines), `opencut-timeline` @ code tip `c15a629`, `web-daw-core` @ `85b81b0`, `nle-test-app`, `nle-ui`. No repo modified; no commits.

---

## 1. Mode card (verified from the mock — refined)

Source: `ui-mock/timeline_edit_modes (2).html` `#view-fitfill` (:665-726), CSS :334-395, tab :408.

**Prose (verbatim, :681-686):** "Fit to fill takes the portion of the clip that you have marked and adds a speed change to speed it up or slow it down. The speed change is automatically calculated so it fits into the space you have selected on the timeline."

**Semantics (verified against the mock's geometry):**

| Law | Statement | Mock evidence |
|---|---|---|
| Inputs | (a) source media with a **marked in/out range** (markedDuration); (b) a **selected timeline span** (targetDuration) — the timeline in/out marks | source clip `Sunset.mov` **175px** wide (:208-216); slot **105px** (:346-347); playhead at slot start :155/:718 |
| **Speed law** | **`speed = markedDuration / targetDuration`** (playback-speed multiplier; speed > 1 = speed UP when the marked range is LONGER than the span; speed < 1 = slow down) | 175/105 = 1.6667 → the slot's badge reads **"1.7x"** (:705); the source pool clip carries its own **"1x"** badge (:715) — the *contrast* is the affordance |
| Result duration law | the placed clip's **timeline duration = targetDuration EXACTLY** (frame-snapped); the source window = the **full marked range** | slot width 105 = the span (the removed `turtle` clip's footprint — turtle is absent from this view's DOM, :697-709) |
| Placement | **overwrite-style into the span** — covered clips split/trim, **no downstream movement** | `right-arrow` hidden (:339 — reference shows it only for insert/ripple); `surf` stays at :270 (:336) |
| Speed identity | the source window is NOT re-trimmed to fit — it is **retimed** (rate change is the whole edit) | the slot preview = the SAME sunset gradient, dimmed `brightness(.45)` (:360) |

**Visual grammar (pins for the UI row):** TARGET SLOT = `2px dashed #646464` box (:349), radius 4, containing (i) a **dimmed source frame preview** (`filter: brightness(.45)`), (ii) a slot-title bar (26px, `rgba(107,164,216,.4)` bg, 11.5px/600 — "Sunset.mov" :707), (iii) a **SPEED BADGE** (clock/gauge SVG — 14×12 viewBox, arc + hand :701-704 — + "1.7x", 12px/700, dark chip `rgba(17,17,17,.62)`, radius 10 :379-395, positioned bottom 34px/left 9px inside the slot :376). The source clip in the pool shows its **1x** badge. **Badge precision: one decimal + `x`** ("1.7x"). Header icon (:668-677): side brackets + inward speed chevrons + a small source-clip rect.

**Direction check (the fleet's one real inversion hazard):** every module in this fleet defines rate as a **playback-speed multiplier** ("rate > 1 = faster/shorter" — WDC `varispeed.ts:40`; `sourceTime = clipTime × rate` — OT `retime.ts:29`; engine `calculateSpeed = sourceDuration/timelineDuration` — `timeline-math.ts:129-141`). Therefore fit-to-fill's element rate is **`markedDuration / targetDuration`** — *not* `targetDuration/markedDuration`. ⚠ `audits/fleet-r25/scout-wdc.md:41` states "rate = targetDuration/markedDuration as the element rate" — **inverted**; any spec text that copies that parenthetical would define a mode that slows down when it should speed up. This audit's §4 states the law precisely; the scout-wdc line should be treated as a typo, not a second convention.

---

## 2. Absence verification (grep evidence, this pass)

Pattern family: `fit[-_]?to[-_]?fill | fitToFill | speed[-_]?to[-_]?fit | computeSpeedForDuration | speedForDuration | markedIn | markedOut` (case-insensitive, whole-repo).

| Repo | Hits | Evidence detail |
|---|---|---|
| `nle-engine` | **0** | No `fitToFill`/`markedIn`/`markedOut`/speed-to-fit anywhere in `src/lib/nle` (also verified by scout-engine). Closest landed material — the pure law `calculateSpeed` (`core/timeline-math.ts:133`, *"Calculate playback speed from source duration and desired timeline duration"*) and the 3-point source-edit family `performInsertEdit` :4702 / `performOverwriteEdit` :4833 (source in/out + position, **but duration is implied = source range; no speed, no target span**). |
| `opencut-timeline` | **0** | `ops/retime.ts` = 73 LOC pure math (clamp `[0.01,5]` :12-13, linear source↔clip maps :22-49, `getTimelineDurationForSourceSpan` :51-62). **No rate-for-target-duration computation, no verb** — retime is a field authored via `updateElements` (scout-ot row 10 confirmed). |
| `web-daw-core` | **0** | The audio half is landed *generically* (varispeed knows nothing of fit-to-fill — correctly: it consumes a rate). No fit awareness needed; absence here is by design, not a gap. |
| `nle-test-app` | **0** | Speed surface = manual only: Inspector speed % (via nle-ui) → router `patch.speed` → engine `retime{rate}`; audio composes `segRate × tr`. No duration-driven auto-fit verb (scout-app row j: "NO — raw material exists, no duration-driven auto-fit mode"). |
| `nle-ui` | **0** | `ToolId: 'stretch'` exists (useUiStore :16, toolbar :38) but **selectable-but-inert**; speed edits route only through the Inspector patch. No dashed-slot/badge grammar. |
| `ui-mock/shell-mini` | **0** | No speed/retime/fit surface at all (grep hits are English "fits", not the mode). |
| `ui-mock/shell-variants` (spec-side) | **MANY — by design** | `fitToFill` is the 7th member of `InsertMediaMode` (`insertPlan.ts:44`) with a **mock-real planner branch** (:342-381), SourceEditBar mode button (:70), Timeline speed badge (:1569-1583), and **37 per-mode ok/refusal pins** in `insertPlan.test.ts`. This is DESIGN/SPEC-SIDE material only — zero of it is in a production repo. |
| Specs 00/05/06/15/16 | **0 rows** | No fit-to-fill verb, section, or row anywhere (05 has the `rateStretch :3155` port row :1239; 06 §5.11/§5.12 + §10.5 rows; 15 has `RateStretchCommand`/`RetimeCommand`; 16 has I/O + JKL). |

**Absence verdict: CONFIRMED.** The mode is absent from every production repo and every spec; the only live artifacts are the reference mock + the shell-variants mock (spec-side) + the scouts' census rows.

---

## 3. Seam map — four modules + UI (posture per seam: LANDED / QUEUED / ABSENT)

Fit-to-fill composes **five** seams (the task's four + the wire). The remarkable finding: **the halves are almost entirely landed; only the authoring verb and its affordance are absent.**

### 3.1 The video half (engine retime → compositor)

- **Element rate setting — LANDED (two paths).** (a) *Freecut-model path:* `Timeline.rateStretchItem(clipId, newFrom, newDuration, newSpeed)` (timeline.ts:3155; ripple twin :6351) — takes speed + duration as **inputs**, one undo step, stretches synced companions with the same actualDuration+actualSpeed (:3202-3211), scales keyframes (P1.11). With explicit source bounds it **preserves the source window and DERIVES the speed from the fixed span**: `finalSpeed = clampSpeed(calculateSpeed(fixedSourceSpan, finalDuration, sourceFps, timelineFps))` (:3404-3408) — *this is the fit-to-fill computation, already inside the landed primitive.* (b) *Scene-model path (the app's live path):* `el.speed` → `sceneBridge.ts:208-212` → engine element `retime:{rate, maintainPitch:true}` → OT-style `RetimeConfig` on the element.
- **Compositor honoring the rate — LANDED.** Engine playback maps elapsed timeline frames → source frames through the clip's speed: `player.ts:3199` (`skipSourceFrames = timelineToSourceFrames(elapsed, seg.playbackRate, …)`) and `:3359`; `video-sync.ts:425-431` (`sourceFramesNeeded = timelineToSourceFrames(timelineDuration, speed, …)` — the "stretched longer than the source can fill" guard). The app's `ProgramCanvas` renders through this path.
- **Fit-to-fill verb on this half — ABSENT.** Nothing computes `marked/target` and places a new clip at the span.

### 3.2 The audio half (WDC varispeed, composed)

- **WSOLA varispeed — LANDED + SEALED.** `web-daw-core/src/lib/daw/varispeed.ts`: `retimeChannels` (:44-119) — pure, pitch-preserving, **output length EXACTLY `round(inFrames / rate)`** (the F1 flush law; "rate > 1 = faster/shorter, pitch preserved" :40); `retimeAudioBuffer` :129; exported at `index.ts:45-47`. Rate domain **`RETIME_RATE_MIN = 1/32`, `RETIME_RATE_MAX = 32`** (:36-37, CR-A1).
- **Composition law — LANDED.** `nle-test-app/src/audioService.ts:586`: `varispeedRate: segRate * tr` (element rate × transport rate; `segRate = seg.varispeedRate ?? 1` :552; mid-entry content offset `into × segRate` :572 — one law both streams, W3/S3-C4). The element rate arrives from the flattener: engine `bridge/scene-to-segments.ts` (`varispeedRate` :237/:303, `elementRate()` :347-349) ← the element's `retime.rate`.
- **maintainPitch domain guard — LANDED (bridge-side, loud).** Engine `bridge/segment-strip-adapter.ts:522-590` `applyMaintainPitch`: rate outside **[1/32, 32]** (or >2 channels) → **`console.warn` + fallback to the pitch-affected legacy path** (`playbackRate = rate` — "correct LENGTH, wrong pitch", B-P1-1, :537-550); `maintainPitch` requires `ctx.createBuffer` or throws (CR-P3-6 :575-586). WDC's `retimeChannels` itself degrades to identity outside the domain (the adapter guard makes that unreachable).
- **maintainPitch default — LANDED, with one QUEUED hole.** `sceneBridge.ts:208-212` hardcodes `maintainPitch: true` ("the NLE default; speed changes keep pitch"); the Inspector's preserve-pitch toggle is dead — **engine R9-b (thread maintainPitch through the retime patch) is QUEUED** in the engine's PLAN (scout-engine).
- **Fit-to-fill at extreme ratios:** for any rate in the recommended domain (§4.3) audio is pitch-preserved by construction; outside `[1/32, 32]` the audio degrades LOUDLY to pitch-affected (correct length — the fill still happens, pitch bends). Rate ≈ 0.02-class degenerates are guarded both sides (scout-wdc watch-out 3).

### 3.3 The ops layer (opencut-timeline)

- **Retime math — LANDED (math only).** `ops/retime.ts` (73 LOC): `MIN/MAX_RETIME_RATE = 0.01/5` (:12-13), `clampRetimeRate` (:15-20, NaN/≤0 → DEFAULT 1), linear maps `sourceTime = clipTime × rate` (:29), `getTimelineDurationForSourceSpan = sourceSpan / rate` (:51-62) — **the exact inverse of the fit-to-fill speed law exists as pure math; no verb computes rate from a duration.** No speed-to-fit verb, no marked-range surface — **ABSENT** (06 §10.5 row :2437: "§5.11 Rate-stretch command — (absent) — OT-GAP — nle-engine :3155").
- **The retime patch seam — LANDED.** `updateElements({updates})` (timeline-core :1344) authors the `retime` field on elements (the SC-1 rate-clamped derive rule); wire verb `timeline.updateElements` is one of OT's 24 UI-routed verbs.
- **The insert verb (placement half) — LANDED.** `timeline.insert` (api.ts:558+) with element + strategy/trackId + TRACK_LOCKED gates; `timeline.setLoopRegion` (api.ts:1273-1301, end > start validated) is the **target-span input surface**. The shell-variants planner documents the eventual composite: **`fitToFill = insert + updateElements{retime}`** (`insertPlan.ts:26`, `docs/r20/insert-modes.md:292`) — "NO-SEAM as one command; composable."
- **The fit-to-fill composite — ABSENT** (and correctly *not* claimed: the mock "documents the eventual wire mapping, it does not claim OT parity," insertPlan.ts:26-27). Vehicle: the **r1 wave-1 rateStretch port** (06 §0 / 15 §13.15 rows :301-302 — QUEUED).

### 3.4 The wire + spec layer

- **Spec 15:** `RateStretchCommand` (§4.3.11, :814-846) — *"speed is derived as `sourceSpan / newDuration`"* with clamp `[0.01, 5.0]`; `RetimeCommand` (§4.3.12, :848-873) — `rate`, `maintainPitch`, duration `= sourceSpan / |rate|`. **The duration→speed derivation is already spec'd for per-element stretch; the marked-range→target-span mode verb is ABSENT** (no union member; the 78-member census has no insert-mode family). Composite mapping is legal today (insert + updateElements).
- **Spec 06:** §5.11 Rate Stretch (:1524), §5.12 Retime (:1634), §10.5 rows (:2434/:2437), §11.6 retime presets OVERSTATED (:2517 — only `buildConstantRetime`, no preset table), **§11.7 rate bounds DIVERGENT** (:2523-2528): FreeCut `[0.1, 16]` (rate-stretch only) vs OpenCut `[0.01, 5]` (retime) — decision: adopt OpenCut's. **No fit-to-fill row.**
- **Spec 16:** I/O keys = `setLoop` halves (:156-157; N12 canonical in/out model :165) — the input keys LANDED as spec rows; JKL is transport-rate (orthogonal). **No mode row.**
- **Spec 05:** `rateStretch :3155 | 1 (A2) | OT ops` port row (:1239); in/out model on the engine (`setInPoint`/`setOutPoint`, timeline.ts:6540+ — 05 :1187's `:5642` line cite is stale, the method is at :6540 now).

### 3.5 The UI affordance

- **ABSENT in production** (app, nle-ui): no dashed slot, no speed badge, no 1x/1.7x contrast, no mode button. nle-ui's `stretch` tool is inert; the app has no source-mode bar and **no source in/out marks** (the app port keymap has no I/O rows).
- **LANDED (spec-side, tested):** shell-variants implements the full grammar — SourceEditBar 7-mode row (fitToFill :70, one-shot action, not a radiogroup), Timeline.tsx insert-preview ghost with **speed badge** (gauge SVG verbatim + `g.speed.toFixed(2)}×`, :1569-1583) + mode badge (:1556), overwrite-span shading, and the **planner branch** (insertPlan.ts:342-381): span = `ctx.loop` (the in/out window), `srcDur = ctx.sourceRange ?? media.duration` (R22 #84/#85 — the marked RANGE, not the whole media), `rate = clamp(srcDur/span, 0.01, 5)` with **honest refusal** when the clamp moves the rate > 1e-6 (:355-357), `retarget: false` (never hijacks the lane through the selection, P2-4), element `{duration: snapToFrame(span), speed: rate}`, overwrite spans planned, arrows `{down: true, right: false}`. **Badge-precision divergence:** the reference mock reads "1.7x" (one decimal); shell-variants renders `toFixed(2)` — the spec row should pin the reference's one-decimal form.

**Seam-map one-liner:** audio LANDED (sealed), video LANDED, math LANDED (both sides), input surfaces LANDED (loop region + engine in/out + OT wire) — the **verb** (OT composite + engine overload) and the **affordance** (app/nle-ui) are the only ABSENT rows; r1 wave-1 is the QUEUED vehicle.

---

## 4. Spec-first design analysis (the family contract to write into 06 §5.9/§5.11)

**4.1 Name + identity.** `fitToFill` — a *4-point* edit: three points are the source in/out + timeline in (as in 3-point overwrite); the fourth point (timeline out) **replaces** the implied duration and the speed absorbs the difference. Not a persistent tool: a one-shot edit function from the source-mode family (shell-variants law: no aria-pressed/role=radio).

**4.2 Inputs.**

1. `sourceMedia` + marked range `[markedIn, markedOut)` — **source-duration known and > 0** (refusal otherwise: the mock's info toast "set an In/Out range (I / O) with duration…", insertPlan.ts:352). Source marks surface: the source viewer's range (mock: `ctx.sourceRange`; engine math: `performInsertEdit`'s `sourceStart/sourceEnd` args).
2. Target span `[timelineIn, timelineOut)` = the **timeline in/out marks** — in this fleet, the **loop region halves** (N12: `setLoop` start/end; wire `timeline.setLoopRegion`, end > start validated). Span must be **> 1 frame** (refusal at `span ≤ FRAME`).
3. Target track resolution: the media's kind-lane law (first unlocked lane of the media's kind; **never retargets through the selection** — the 5 shared modes' §5(b) fallback does not apply; pinned by the mock's P2-4 tests).

**4.3 The speed law (the contract's core).**

```
speed = markedDuration / targetDuration            (same-fps form)
     = (markedDuration × timelineFps) / (targetDuration × sourceFps)   (engine calculateSpeed, timeline-math.ts:133)
```

- **Direction:** speed > 1 ⇔ marked range LONGER than the span (speed up); speed < 1 ⇔ slow down. Reference proof: 175px source / 105px slot = 1.667 → "1.7x". Semantics are playback-speed multiplier fleet-wide (§1's direction check); do NOT copy scout-wdc's inverted parenthetical.
- **Result-duration law:** the placed element's `duration = snapToFrame(targetDuration)` — **exactly the span, always**; the source window = the full marked range `[markedIn, markedOut)` (`sourceStart = markedIn`); the element's `speed = speed` (scene model: `retime:{rate: speed, maintainPitch: true}`). The duration field is the TIMELINE law — never re-derived from audio output length (the bridge's own law, segment-strip-adapter :27-30: "element duration is the retimed one; source consumption rate scales").
- **Audio exactness corollary:** WSOLA output = `round(inFrames/rate)` — the audio fills the span sample-exactly; video fills frame-exactly (`roundDuration`). Pin: ±1-frame tail drift between the streams is the frame/sample quantization residue, not an error — the A/V pair consumes ONE rate.

**4.4 Rate-bounds guard (the cross-module ruling — recommend REFUSE, domain = the intersection).**

Fleet domains today: engine freecut-model `clampSpeed` **[0.1, 16]** (`MIN_SPEED/MAX_SPEED`, timeline-math.ts:51-53, applied on every clip write via `normalizeClipFields` :1019); OT retime **[0.01, 5]** (06 §11.7's adopted decision); WDC WSOLA domain **[1/32, 32]** (pitch-preservation bound). These differ in BOTH directions (OT floor 0.01 < engine floor 0.1; WDC ceiling 32 > OT 5).

- **Out-of-bounds behavior observed:** engine = silent clamp; OT = silent clamp (DEFAULT on non-finite); WDC/adapter = loud fallback (pitch-affected, length correct); the shell-variants mock = **honest refusal** (error toast, insertPlan.ts:355-357).
- **Recommendation:** **REFUSE with `INVALID_PARAMS`** (the mock's law). Rationale: a clamped rate silently violates the mode's defining contract — the clip no longer fills the span, and the mode exists *only* to fill exactly. A clamp here is a lie about geometry, which is worse than a pitch bend.
- **Recommended acceptance domain: `[0.1, 5]`** — the intersection of all three (engine floor 0.1, OT ceiling 5, WDC domain ⊇ both). Every accepted fit is then: engine-write-safe, OT-clamp-safe, and **pitch-preserving by construction** (inside WDC's [1/32, 32] — no audio degradation ever fires for an accepted fit). Register as a **06 §11.7 amendment candidate**: the generic retime module keeps [0.01, 5]; the fit-to-fill row pins [0.1, 5] + refusal, and the 0.01–0.1 band is documented as engine-freecut-clamp-unsafe (a rate there would silent-clamp on the engine reference path).
- At the edges *within* the domain: pitch is preserved; extreme ratios (5× / 0.1×) just sound/look aggressively retimed — that is the user's ask.

**4.5 Placement (overwrite-style).** Land at `timelineIn`, duration `targetDuration`: covered clips **split/trim** (the overwrite-span laws — same machinery as the mock's `planOverwriteSpans`/`coveredSpans` shading and OT's overwrite family); **no downstream shift** (arrows: down only). Selection is NOT cleared (replace/fitToFill family law — the mock's `clearSelection: false`). One history entry for the whole edit.

**4.6 Linked audio (the A/V sync law).** The linked companion gets **the same computed rate** and **the same target duration** (both elements: `duration = span`, `speed = marked/target`); one law both streams — video consumes the rate in `timelineToSourceFrames`, audio in `varispeedRate = segRate × tr` (transport composes on top, identically for both). The pair lands as ONE commit. Engine reference behavior: `rateStretchItem` stretches synced companions with the same actualDuration+actualSpeed (:3137-3138, :3202-3211); the 3-point family's scaffold notes callers invoke twice for linked A/V (timeline.ts:4517-4519) — the spec row should pin the pair as one verb, not two calls.

**4.7 Badge display precision.** Reference: **"1.7x" — one decimal, lowercase `x`, clock/gauge SVG** (chip styles §1). The badge appears (a) on the target slot during preview/after commit, and (b) on the placed clip; the source pool clip shows its **"1x"** badge — the contrast teaches the retime. Pin one decimal in the spec (round-half-even, `Math.round(r*10)/10`); note shell-variants' `toFixed(2)` as a deviation to align. (Full precision lives in the element's rate field; the mock's status line uses `toFixed(3)` for the toast — fine, that's a log surface.)

**4.8 Keyboard row.** DaVinci: no single-key default — the mode fires from the edit-mode toolbar button (one-shot). Our spec: **no new single-key in 16**; the row is the *source-mode bar* button (keyboard/pointer parity per SourceEditBar's law) — the family-level disposition belongs to the mode-fleet's shared row, not this mode. The **input** keys already exist in 16 §3.1: `I`/`O` = `setLoop` halves (the target span), clear via ⌘⇧I/⌘⇧O/⌥X. The **source-side** marks need a surface row (16 has none — the source viewer's I/O is a mock-only surface today; flag as a family input-gap, not fit-to-fill-specific).

**4.9 UI affordance.** Target span = **timeline in/out marks (the loop region)** — NOT a selected-clip span (contrast: Replace needs a clip selection; Fit-to-fill needs I/O, per the mock's differing refusal conditions and `retarget:false` law). Preview grammar (pre-commit): dashed-outline slot at the span, dimmed source frame, slot title, speed badge with the computed rate, down-arrow only, overwrite-span shading over covered clips. Commit: preview == commit by construction (the shell-variants planner/preview==commit pin discipline — the same planner computes both).

**4.10 Composite mapping (wire).** Document as the mock does: `fitToFill = timeline.insert + timeline.updateElements{retime}` (both verbs LANDED and UI-routed; one `applyBatch` = one history entry) — **or** the engine overload `performOverwriteEdit(trackId, sourceId, at, sourceStart, sourceEnd, { targetDuration })` deriving speed via `calculateSpeed`. The engine 3-point family is the natural home for the reference implementation; the OT composite is the wire-level form. A first-class wire union member is optional (r2) — do not add it at r1.

---

## 5. GAP ROWS (posture law: LANDED / QUEUED / ABSENT)

| # | Seam | Owner | Posture | Evidence / vehicle |
|---|---|---|---|---|
| G1 | Speed-to-fit math (pure law) | nle-engine | **LANDED** | `calculateSpeed` timeline-math.ts:133 (duration→speed, fps-general); OT inverse `getTimelineDurationForSourceSpan` retime.ts:51 |
| G2 | Rate-stretch primitive (element rate + fixed-span derive) | nle-engine | **LANDED** | `rateStretchItem` :3155 (+ripple :6351); `_rateStretchClip` :3383 (fixed-span speed derive :3404-3408) — engine-only, unwired to any editing wire |
| G3 | Rate-stretch COMMAND in OT (the r1 vehicle) | opencut-timeline | **QUEUED** | 06 §10.5 :2437 "OT-GAP — nle-engine :3155"; 15 §13.15 :301 r1 wave 1; scout-ot row 10 |
| G4 | Fit-to-fill authoring verb (marked range + target span + overwrite + linked pair) | OT composite / engine overload | **ABSENT** | 0 corpus hits; 3-point family :4702/:4833 lacks speed/target; spec 06 §5.9/§5.11 lacks the row — file as a 06 addendum riding r1 wave 1 |
| G5 | Wire surface for the verb | spec 15 | **ABSENT (composable)** | No union member; `insert` + `updateElements{retime}` both LANDED and routed — the mock's documented mapping (insertPlan.ts:26, insert-modes.md:292); first-class member optional r2 |
| G6 | Audio half (pitch-preserving, duration-exact varispeed) | web-daw-core | **LANDED** | `retimeChannels` varispeed.ts:44 (EXACT round(inFrames/rate)); domain [1/32,32] :36; W2 sealed (scout-wdc) |
| G7 | Rate composition + domain guard + loud fallback | nle-test-app / nle-engine bridge | **LANDED** | `varispeedRate = segRate × tr` audioService.ts:586; `applyMaintainPitch` domain guard segment-strip-adapter.ts:537-550 |
| G8 | maintainPitch authoring (Inspector toggle) | nle-engine | **QUEUED** | R9-b (thread maintainPitch through the retime patch — engine PLAN, scout-engine); sceneBridge hardcodes true |
| G9 | Target-span input surface (timeline I/O = loop region) | OT / spec 16 | **LANDED** | `timeline.setLoopRegion` api.ts:1273; 16 §3.1 I/O = setLoop halves (N12); engine `setInPoint` :6540. App port keymap lacks I/O rows — minor consumer gap |
| G10 | Source-mark input surface (source viewer range) | app / shell | **ABSENT (app)** / LANDED (mock) | Mock: `ctx.sourceRange` + SourceRangeBar (W4 #84/#85); app has no source I/O surface |
| G11 | UI affordance (dashed slot + speed badge + 1x/1.7x contrast) | app / nle-ui | **ABSENT** (reference + shell-variants mocks LANDED, spec-side) | view-fitfill :665-726; shell-variants Timeline.tsx :1569-1583 + SourceEditBar :70 + 37 test pins; zero in production repos |
| G12 | Keyboard row for the mode | spec 16 | **ABSENT (by design — recommend none)** | DaVinci parity: toolbar one-shot; input keys I/O exist (§4.8); family-level disposition |
| G13 | Rate-domain unification (fit-to-fill acceptance domain + refusal) | spec 06 | **ABSENT (spec ruling needed)** | Divergent today: [0.1,16] engine / [0.01,5] OT / [1/32,32] WDC; recommend [0.1,5] + INVALID_PARAMS refusal (§4.4); 06 §11.7 amendment candidate |
| G14 | Badge precision law ("1.7x", one decimal) | spec 05/06 + mocks | **ABSENT (divergent)** | Reference: one decimal (:705); shell-variants: toFixed(2) — align to the reference (§4.7) |

---

## 6. Verdict

**ABSENCE CONFIRMED** — fit-to-fill is a true corpus-wide gap: zero hits in nle-engine, opencut-timeline, web-daw-core, nle-test-app, nle-ui, shell-mini, and zero rows in specs 00/05/06/15/16. The only live artifacts are the reference mock, the shell-variants spec-side implementation (planner branch + grammar + 37 pins), and the R25 scouts' census rows.

**But this is the CHEAPEST landing of the four confirmed gaps** — the mode's depth is in its seams, and **the seams are landed**: the pure speed law exists twice (engine `calculateSpeed`, OT's inverse maps), the audio half is sealed and duration-exact (WDC W2 + the bridge's composition/guard laws), the video half composes the same rate, the input surfaces exist (loop region + I/O keys + engine in/out + the 3-point family's source-range args), and a tested spec-side planner already holds the exact branch (`insertPlan.ts:342-381`) with the honest-refusal and no-retarget laws pinned.

**What is actually missing is one verb + one affordance:** (1) the 06 §5.9/§5.11 addendum — the 4-point contract (speed = marked/target, duration = target exactly, overwrite placement, linked pair one-rate-one-commit, domain [0.1,5] + INVALID_PARAMS refusal); (2) the OT composite (insert + updateElements{retime}) or engine `performOverwriteEdit` overload, riding the QUEUED r1 wave-1 rateStretch port; (3) the UI grammar ported from shell-variants (mode button + dashed slot + one-decimal speed badge + 1x contrast). **Watch-items for the spec writer:** the scout-wdc rate-direction typo (§1), the three-way rate-domain divergence (G13), the badge-precision divergence (G14), and R9-b's dead preserve-pitch toggle (G8) — all four are one-line amendments, none block the mode.

**Recommended next actions (in order):** (a) file this audit's §4 as the 06 addendum draft + the G13/G14 amendment candidates; (b) attach the fit-to-fill composite to the r1 wave-1 rateStretch port row in 06 §0 / 15 §13.15 (acceptance: the mock's 37 per-mode pins re-expressed OT-side + A/V pair sync pin); (c) leave WDC untouched (unblocked, sealed); (d) surface the UI grammar as the shell-variants→app port item when the verb lands.

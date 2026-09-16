# research-constants — the constants-module lattice (R28-W1-c, decision A2)

**Agent:** research-constants (the R28 seal round, W1) · **Date:** 2026-09-15 · **Task:** R28-W1-c · **Read-only:** nle-core-spec, opencut-timeline (OT), nle-engine, nle-ui, web-daw-core (WDC). One output file; no commits.

**Mandate** (ARCH-R28 §2 row A2, `audits/ARCH-R28-seal-round.md:38`): the r1-port constants module — D11's four retime domains + the volume-dB [−60,+20] one-home (OT `core/audio-params.ts`), the module's shape, home, and the import law the ports obey. Riders named: 00 (D11) + 15 §13.15 + 06; 19's pins carry the re-base.

---

## 1. The inventory — the constants AS THEY EXIST today

### 1.1 The four retime domains (D11's lattice, each pinned in its venue)

| Domain | Home (file:line) | Shape | Venue semantics |
|---|---|---|---|
| **[0.01, 5]** wired SSOT | OT `src/lib/timeline/ops/retime.ts:11-13` (`DEFAULT_RETIME_RATE=1`, `MIN_RETIME_RATE=0.01`, `MAX_RETIME_RATE=5`) + `clampRetimeRate` `:15-20` (non-finite/≤0 → 1) | const + function | The wired path: the app drives TimelineCore, DERIVE clamps at evaluation (engine `.agents/DECISIONS.md:484`) |
| **[0.1, 4]** authoring subset | nle-ui `src/components/shell/Inspector.tsx:963-964` (Speed row `min={10} max={400}` % — enforced by NumberField validate, per `gaps/audit/ra-round/audit-AW1.md:31`) | JSX literals | UX rail, strictly inside the wired domain; no named constant exists |
| **[0.1, 16]** engine-native venue | engine `src/lib/nle/core/timeline-math.ts:51-53` (`MIN_SPEED=0.1`, `MAX_SPEED=16`, `DEFAULT_SPEED=1`) + `clampSpeed` `:120-126` (NaN → 1) | const + function | The OTHER timeline model (freecut port): test-runner/headless/persistence venues only, OFF the wired path (DECISIONS.md:486; audit-AW1.md R6 `:36`) |
| **[1/32, 32]** WDC DSP | WDC `src/lib/daw/varispeed.ts:36-37` (`RETIME_RATE_MIN = 1/32`, `RETIME_RATE_MAX = 32`, the CR-A1 WSOLA degeneration guard, header `:31-35`) | const | Realtime + export audio; what SegmentStripAdapter can actually render |

**The dead zone** [0.01, 1/32): opencut-legal, WSOLA-illegal → maintainPitch falls back pitch-affected with the loud warn — the seam note at engine `bridge/opencut-laws.ts:112-118`; law 76 (DECISIONS.md:489-495).

**The bridge twin** (the wired SSOT, engine-side): `bridge/opencut-laws.ts:54-61` VALUE-imports `clampRetimeRate` from `opencut-timeline/ops/retime` (OV-01) and re-exposes the flat-number adapter `clampOpencutRetimeRate` `:120-122`; consumed at `bridge/scene-to-segments.ts:326/:576/:610` and `bridge/composition-frame.ts:234` (the AW1-5 inline twins are GONE — the leaf is consumed).

### 1.2 The volume-dB family ([−60, +20] — the ONE home)

- **THE one home:** OT `src/lib/timeline/core/audio-params.ts:28-30` — `VOLUME_DB_MIN=-60`, `VOLUME_DB_MAX=20`, `DEFAULT_VOLUME_DB=0`; `clampVolumeDb` `:38-43` (non-finite → DEFAULT); `volumeDbToLinear` `:46-48`. Zero-import leaf by header law `:14-20` ("do not add imports here"); re-exported by the barrel (`src/lib/timeline/index.ts:61`); the view-layer shim `components/timeline/audio-state.ts` re-exports identity-bound (comment `:7`).
- **The engine's entry:** `bridge/opencut-laws.ts:54-60` VALUE-imports the five names (OV-02) and re-exports them `:73-79`; the flattener consumes at `bridge/scene-to-segments.ts:69` (import), `:172` (keyframe-lane read clamp), `:427` (fade relative gain), `:511` (`seg.level = 10^(clampVolumeDb/20)`).
- **The native fold twin:** engine `audio/audio-scene.ts:1112-1116` `keyGainLinearNative` — inline literals `Math.min(20, Math.max(-60, db))`, documented "the element fold's twin" (NaN → unity). NOT derived from the one-home (layering: audio→bridge would cycle; conversions already runs bridge→audio — audit-AW1.md R4 `:34`).
- **The authoring rails (nle-ui):**
  - Inspector Gain `[−60, +20]` — `Inspector.tsx:1001-1002` (AW1-2 raised it from +4; the commit path `:1007` = `10^(db/20)`).
  - ChannelEditor clip gain `[−60, +4]` — `ChannelEditor.tsx:91` and `:99` — the REGISTERED residual ("the ChannelEditor `max={4}` residual stands", 19-code-references.md:367), justified in-comment `:87-90` as the LINEAR domain [0.001, 1.6] ≈ [−60, +4.08] dB.
  - Mixer strip fader `[−60, +6]` — `MixerPrimitives.tsx:95-96` (aria bounds) + aux return rail `ChannelEditor.tsx:209`.
- **The stale doc-law:** engine `.agents/DECISIONS.md:139-153` (D7 amendment) — domain is [−60,+20], the +4 Inspector ceiling described as the deliberate subset.

### 1.3 The ticks / frame lattice (the quantization grids)

- **TICKS_PER_SECOND = 120_000:** OT `core/media-time.ts:23` (SSOT; divides evenly by every standard rate, header `:10-12`). Engine replica `bridge/opencut-laws.ts:88` (`OPENCUT_TICKS_PER_SECOND`) + `mediaTimeSec()` `:95-97` — the REPLICATED twin WITH the bridge-seams drift fence (header `:46-51`; the branded-type rationale `:24-30`).
- **FrameRate (the rational grid):** OT `core/frame-rate.ts:14-39` (`FPS_23_976`…`FPS_120` + `FRAME_RATES` Record) — no default; project-owned.
- **Frame quantization:** OT `core/media-time.ts:222-231` (`roundFrameTicks`), `:208-219` (`roundFrameTime`); `:278-290` (`snapSeekMediaTime`).
- **Snap threshold:** OT `snapping/index.ts:49` `DEFAULT_TIMELINE_SNAP_THRESHOLD_PX = 10`.
- **The mock grid (mocks only):** variants `lib/timecode.ts:3` (`FPS = 24`) + `snapToFrame` `:32`; mini `lib/geometry.ts:12` `GRID = 0.5` (binary-exact doc grid) + `quantize` `:42-43`.

### 1.4 Min-duration + trim bound families

- **OT (derived, the model law):** `ops/group-resize.ts:162-164` — `minDuration = ticks/frame = TICKS_PER_SECOND·fps.denominator/fps.numerator` (ONE frame, derived from the owning FrameRate — never a seconds literal).
- **Engine native:** `core/timeline-math.ts:67-79` (`roundFrame` fallback 0 / `roundDuration` min 1 frame).
- **nle-ui:** `state/useUiStore.ts:241` `MIN_DUR = 0.25` seconds — a literal, NOT frame-derived (its own comment `:237-240` records the unification of 0.25/0.1).
- **variants mock:** `lib/trimLaws.ts:30` `MIN_DUR = 1/24` (1 frame @ the mock's 24fps; comment `:9` cites spec-06 §5.2).
- **mini mock:** `lib/geometry.ts:13` `MIN_DUR = 0.5`; the trim laws inline the 0.5 (`lib/trimModes.ts:42-43/:77-78`).
- **Neighbor/source-extent bound families:** OT `ops/group-resize.ts:305-349` (`getMinimum/MaximumAllowedDeltaTime`); variants `lib/trimLaws.ts:99-161` (neighbor ∩ source ∩ min intersection); mini `lib/trimModes.ts:37-81`.

### 1.5 The mode-clamp families (the r1 ports' clamp engine)

- **Transition-preserving clamps (F5):** engine `timeline/timeline.ts:3422-3446` (ROLL-3 `_clampDeltaToPreserveTransitions` — the freecut binary-search `clampRollingTrimDeltaToPreserveEditState`, freecut `trim-edit-constraints.ts:126-213`), ripple-trim `:3181`+, slide `:5200` (clampSlideDeltaToPreserveTransitions); `computeClampedSlipDelta` `:990-1003` (the whole slip clamp, 14 LOC); `computeSlideContinuitySourceDelta` `:1051-1074`. Pinned by `tests/vitest/engine/timeline-mode-clamps.test.ts` (20 tests; header `:1-31` = ROLL-2/N6, ROLL-3/ripple-trim-G3/slide-G3, slip-G3).
- **FreeCut sources** (per the leverage map `audits/fleet-r27/mock-leverage.md:104-107`): `clampRollingTrimDeltaToPreserveEditState`, `clampRippleTrimDeltaToPreserveEditState`, `computeClampedSlipDelta` (33 LOC), `computeSlideContinuitySourceDelta` (42 LOC).

### 1.6 Fade/curve constants + the speed-law math

- **Fade curve:** engine `bridge/fade-curve.ts:32-47` — `AUDIO_FADE_CURVE_MIN/MAX` (−1/1), `X_MIN/X_MAX/X_DEFAULT` (0.04/0.96/0.52), `SOLVE_EPSILON` (1e-4), `MAX_EXPONENT` (12), `FADE_CURVE_RAMP_SEGMENTS` (16, the parity anchor). Twin-equality pinned vs the vendored `audio/mixer.ts` copy (AW1-3 → landed by FW-C; `audits/fleet-r27/scout-engine.md:18`).
- **The speed law:** `speed = sourceDuration/timelineDuration` — engine `core/timeline-math.ts:133-143` (`calculateSpeed`); OT's inverse `getTimelineDurationForSourceSpan` `ops/retime.ts:51-62`; spec 06 §5.9F `:1668` names all three fleet sites.
- **FPS defaults:** engine `DEFAULT_TIMELINE_FPS = 30` (`core/timeline-math.ts:57`, native venue) vs the wired world's project-fps (app 24) vs nle-ui mock `FPS = 24` (`lib/timecode.ts:3`) — audit-AW1 R15 `:45` (KEEP-BY-DESIGN, per-venue).
- **Delta conventions (G-SLIP-4):** five conventions live today — timeline-frames vs source-frames vs ticks; `sourceStart/End` (+δ/+δ) vs `trimStart/End` (+δ/−δ) vs `sourceIn/sourceOut` (fleet-r25/mode-slip.md:195). Unpinned; rides the port.

### 1.7 The fit-to-fill acceptance domain (spec'd [0.1, 5] — the three-domain intersection)

- **The law:** spec 06 §5.9F `:1669` — "The acceptance domain is [0.1, 5] — the three-domain intersection: engine freecut-model [0.1, 16] ∩ OT [0.01, 5] ⊂ WDC [1/32, 32] ⇒ pitch preserved for every accepted fit. Out-of-domain REFUSES with INVALID_PARAMS — never clamps." Gap row FF-2 `:1680` (the §11.7 cross-note is owed).
- **The mocks diverge:** variants `lib/insertPlan.ts:354-356` refuses outside `[RATE_MIN, RATE_MAX]` = **[0.01, 5]** (imported from `lib/trimLaws.ts:32-33`); mini `lib/insertPlan.ts:54-56` refuses outside **[0.1, 4]** ("the setClipSpeed pair" — the authoring subset).

---

## 2. The conflict map — where two homes disagree TODAY

### 2.1 Verified CLEAN (the by-design lattice)

The four retime domains are venue-truths, not drift: each clamps at ITS OWN read time (DECISIONS.md:514-519), and the authoring path is wired Inspector [0.1,4] → opencut DERIVE [0.01,5] → flattener at the SAME clamped rate → WSOLA + the dead-zone fallback (DECISIONS.md:497-502). Boundary audit: the engine bridge imports ONLY the opencut domain (the correct one) — `opencut-laws.ts:61`; the engine-native [0.1,16] domain is confined to `core/timeline-math.ts` + its native consumers and appears nowhere on the wired path (verified: zero `MIN_SPEED`/`MAX_SPEED` hits in `bridge/`); the WSOLA domain is consumed only through WDC's own leaf. The ticks twin is fenced (bridge-seams, header `:46-51`). The AW1-5 inline [0.01,5] twins in composition-frame are FIXED (now `clampOpencutRetimeRate`, `composition-frame.ts:231-234`). **Nothing imports the wrong domain.**

### 2.2 Real conflicts (six, ranked)

| # | Conflict | Sites | Class |
|---|---|---|---|
| **C1** | **The engine-native volume clamp is [−60, +12]** — the freecut-era ceiling, ALIVE in code, contradicting the D7 amendment's claim "no current twin implements it" (DECISIONS.md:146-147). Persistence hydrate on the native model clamps +15 → +12 (venue-internal — the wire path never sees it — but the native model IS the persistence substrate, audit-AW1 R6 `:36`). | engine `core/timeline-math.ts:410` (`Math.max(-60, Math.min(12, normalized.volume))`) | **duplicated bound that should derive** — the one-home's ceiling is already imported into the same repo (`opencut-laws.ts:77`); the normalize path can consume it (core→bridge is the existing edge direction? NO — bridge imports core; `timeline-math.ts` is core. The honest fix: import the leaf directly `opencut-timeline/core/audio-params` — the alias exists (opencut-laws.ts:39-44) — or align the literal to +20 with a pin) |
| **C2** | **nle-ui's two Gain surfaces disagree** — Inspector [−60,+20] (`Inspector.tsx:1001-1002`) vs ChannelEditor [−60,+4] (`ChannelEditor.tsx:91/:99`), same field, same repo. The +4 rail is the linear-domain bound 1.6 in dB (+4.08) — itself an unexplained literal. | nle-ui `Inspector.tsx:1001-1002` vs `ChannelEditor.tsx:87-99` | **duplicated bound that should derive or register** (the 19:367 residual) |
| **C3** | **Fit-to-fill: three domains** — spec [0.1,5] (06 `:1669`) vs variants [0.01,5] (`insertPlan.ts:354-356` via `trimLaws.ts:32-33`) vs mini [0.1,4] (`insertPlan.ts:55-56`). A 0.05 rate: spec-REFUSED, mock-ACCEPTED. The port's UX reference enforces the WRONG domain. | 06 §5.9F vs the two mocks | **spec-vs-reference divergence** — the module must DERIVE the intersection so the port lands one law |
| **C4** | **`keyGainLinearNative` inline [−60,+20]** — the native fold twin, hardcoded literals, unpinned to the one-home (layering forbids audio→bridge; the fence is the honest form but none exists for THIS twin specifically). | engine `audio/audio-scene.ts:1112-1116` | **duplicated bound that should pin** |
| **C5** | **Min-duration conventions ×3 in the consumer pair** — nle-ui `MIN_DUR = 0.25`s literal (`useUiStore.ts:241`, not frame-derived) vs OT's derived 1-frame-in-ticks (`group-resize.ts:162-164`) vs the mocks' frame-derived literals (variants 1/24 `trimLaws.ts:30`; mini 0.5 `geometry.ts:13`). | nle-ui vs OT vs mocks | **derivation gap** — the port's trim floors must be frame-derived, and nle-ui's 0.25 must be registered as a UX rail (6 frames @24) or derived |
| **C6** | **The authoring-subset constants are unnamed JSX literals** — Speed [10,400]% (`Inspector.tsx:963-964`), Gain rails (`:1001-1002`), fader [−60,+6] (`MixerPrimitives.tsx:95-96`) — no single nle-ui home, no ⊂-pin (the AW1 P2 proposal's pin never landed: audit-AW1.md:130-131 "constants shared via the port tree"). | nle-ui | **one-home gap inside the authoring repo** |

Plus the registered stale doc-laws: 06 §11.7's two-domain text `:2700-2705` (predates the lattice — the fleet-r27 spec-06 F-7 fix is queued, `audits/fleet-r27/spec-06.md:67`); engine DECISIONS D7's description of the Inspector ceiling as +4 (superseded by AW1-2, DECISIONS.md:147-149).

**Conflict count: 6 real (C1-C6) + 2 stale doc-laws; the lattice itself is clean.**

---

## 3. The module design

### 3.1 Name + home

**`opencut-timeline/src/lib/timeline/core/edit-domains.ts`** — the ONE constants module (the collision map's row 5, `audit-AW1.md:202`; the leverage map's "extend it with the retime-domain law", `mock-leverage.md:140`).

**Why OT, why `core/`, why one file:**
1. **The precedent is exact and proven:** `core/audio-params.ts` is the one-home the engine bridge VALUE-imports (OV-01/02) — the s16 D-ARCH-2 pattern: a pure leaf explicitly built for the consumer's bridge to deep-import (header `:14-20`). The module sits BESIDE it in `core/` (the corpus's leaf directory: `audio-params`, `media-time`, `frame-rate`, `id`).
2. **The enabling constraint:** the engine's zero-runtime-dependency law permits ONLY deep-imports of pure leaves, never the barrel (S3A-P3-1; `opencut-laws.ts:32-37`). A module that re-exports the two existing pure leaves stays runtime-pure (both are zero-runtime-import: `audio-params` zero-import; `ops/retime` one TYPE-only import, `retime.ts:9`) — the bridge's import graph stays a DAG of leaves.
3. **The r1 ports live in OT's ops layer** (Decision 12.3; mock-leverage.md:100) — their constants home must be their own repo, importable without the barrel.
4. nle-ui/WDC cannot be the home (nle-ui is the engine-free chrome package, boundary-gated; WDC is the audio DSP core, upstream-synced — neither may depend on OT).

### 3.2 The export shape — per-domain namespaces, one file, derived lattice facts

```ts
// core/edit-domains.ts — THE constants lattice (D11's four retime domains +
// the volume-dB one-home, extended for the r1 ports). ZERO-RUNTIME leaf:
// re-exports only pure leaves; adds only derived facts + predicates.

// ── The one-homes (RE-EXPORTED — single binding, drift impossible) ──
export * from "./audio-params";                     // VOLUME_DB_* + clampVolumeDb
export { MIN_RETIME_RATE, MAX_RETIME_RATE, DEFAULT_RETIME_RATE,
         clampRetimeRate } from "../ops/retime";    // the wired SSOT [0.01, 5]
export { TICKS_PER_SECOND, ZERO_MEDIA_TIME } from "./media-time";
export * from "./frame-rate";                        // FrameRate + FPS_* (the grid)

// ── The lattice facts (DERIVED — never re-declared literals) ──
/** The engine-native venue domain [0.1, 16] — the OTHER timeline model
 *  (D11 row 3; freecut port; venue-internal, OFF the wired path). */
export const NATIVE_VENUE_SPEED = { min: 0.1, max: 16, default: 1 } as const;
/** The WDC WSOLA DSP domain [1/32, 32] — REPLICATED twin (cross-repo: WDC
 *  imports nothing from OT); pinned ≡ WDC varispeed.ts by the engine's
 *  bridge-seams fence (the OPENCUT_TICKS_PER_SECOND pattern). */
export const WSOLA_RATE = { min: 1 / 32, max: 32 } as const;
/** The authoring subset [0.1, 4] (nle-ui Inspector; strictly inside the
 *  wired domain — the D7 Speed⊂lattice pattern). */
export const AUTHORING_SPEED = { min: 0.1, max: 4 } as const;
/** The dead zone [0.01, 1/32): opencut-legal, WSOLA-illegal → the
 *  pitch-affected fallback (law 76). */
export function inRetimeDeadZone(rate: number): boolean;

// ── The fit-to-fill acceptance domain (06 §5.9F — DERIVED intersection) ──
/** [max(wiredMin, nativeMin, wsolaMin), min(wiredMax, nativeMax, wsolaMax)]
 *  = [0.1, 5] — pitch preserved for every accepted fit; out-of-domain
 *  REFUSES (INVALID_PARAMS), never clamps. */
export const FIT_TO_FILL_RATE = {
  min: Math.max(MIN_RETIME_RATE, NATIVE_VENUE_SPEED.min, WSOLA_RATE.min),
  max: Math.min(MAX_RETIME_RATE, NATIVE_VENUE_SPEED.max, WSOLA_RATE.max),
} as const;                                          // → { min: 0.1, max: 5 }
export function isFitToFillRate(rate: number): boolean;

// ── The port constants (the r1 trim/source-edit families) ──
/** The min-duration law: ONE frame of the OWNING FrameRate (derived in
 *  ticks — group-resize.ts:162-164's law, named once for the ports). */
export function minDurationTicks(fps: FrameRate): MediaTime | null;
/** The delta-space convention (G-SLIP-4, pinned ONCE): port deltas are
 *  TIMELINE ticks; source-space conversion is explicit at the op boundary. */
export const DELTA_EPSILON_TICKS = 1;                // sub-tick deltas are noise
```

Design notes: (a) **re-export, don't move** — `ops/retime.ts` keeps its math (the bridge imports it today; moving breaks OV-01's binding); (b) **namespaced objects** (`NATIVE_VENUE_SPEED.min`) for the NON-wired domains — they are facts ABOUT other venues, not laws OT enforces; the wired domain keeps the corpus's bare-const shape (`MIN_RETIME_RATE` — renaming it would churn every consumer); (c) the fit-to-fill domain is **computed from the domain constants** so the intersection can never disagree with its inputs — the C3 class dies by construction; (d) `AUTHORING_SPEED` is declared HERE (the pin target) even though nle-ui cannot import it — the battery asserts nle-ui's locals ≡ these values (C6's fix).

### 3.3 The import law (who imports what)

| Consumer | Law |
|---|---|
| **OT ops layer (the r1 ports: roll/slip/slide/insert-edit/fit-to-fill composites)** | import from `core/edit-domains` (or the barrel) — the ports' clamps read `MIN_RETIME_RATE`/`minDurationTicks(fps)`/`FIT_TO_FILL_RATE`; NEVER re-declare a bound locally |
| **The engine bridge** | unchanged entry: `bridge/opencut-laws.ts` remains the ONE engine home (leaf law `:32-37`); its VALUE-import set extends to `core/edit-domains` ONLY when a bridge site needs a lattice fact (e.g. the dead-zone predicate for the fallback's warn) — the leaf is runtime-pure so the convention holds |
| **The engine native model** | keeps `core/timeline-math.ts`'s `MIN_SPEED`/`MAX_SPEED` (the OTHER model's venue truth, D11 row 3) — but C1's volume clamp derives from the one-home leaf (import `opencut-timeline/core/audio-params` — the tsconfig alias already exists, opencut-laws.ts:39-44) |
| **nle-ui (authoring)** | CANNOT import OT (engine-free package law). ONE local file (`src/lib/editDomains.ts`) declares the authoring rails (Speed, Gain, fader) as named constants; the ⊂-wired relation is PINNED by a battery check asserting nle-ui's literals ≡ `edit-domains`' `AUTHORING_SPEED`/`VOLUME_DB_*` (the AW1 P2 pin, finally landed at fleet level) |
| **WDC** | stays INDEPENDENT (DSP venue; upstream-synced, imports nothing from OT). The relation is documented in `edit-domains` (`WSOLA_RATE` twin) + pinned by the engine's bridge-seams fence asserting `WSOLA_RATE ≡` WDC's `RETIME_RATE_MIN/MAX` (the ticks-twin pattern, opencut-laws.ts:46-51) |
| **The mocks** | stay design references (19 §3.5/3.6) — registered twins; C3's fit-to-fill domains are corrected at the port (the variants' planner re-points to [0.1,5] semantics or the divergence is registered) |

### 3.4 The naming convention

`{FAMILY}_{MIN|MAX|DEFAULT}` for the wired-domain scalars (matches `VOLUME_DB_MIN/MAX`, `MIN_RETIME_RATE/MAX_RETIME_RATE` — the existing two shapes kept verbatim); `{VENUE}_SPEED`/`{VENUE}_RATE` const-objects for the lattice facts; predicates `is*/in*` camelCase; the derived intersection `FIT_TO_FILL_RATE`. No renaming of the existing leaves (OV-01's binding is load-bearing).

### 3.5 How the port clamps express themselves

The **clamp ALGORITHMS stay in the ported op files** (`ops/roll.ts` etc.) — they are functions, not constants (the binary-search `clampDeltaToPreserveEditState` engine + the F5 family; mock-leverage.md:121 "one generic clamp serves roll + ripple-trim"). The module supplies their **bound inputs**: the wired rate domain, `minDurationTicks(fps)`, the delta convention, the dead-zone predicate. The fit-to-fill composite reads `FIT_TO_FILL_RATE` + `isFitToFillRate` (refusal, never clamp — 06 `:1669`).

### 3.6 What the module is NOT

Not a barrel replacement (the barrel re-exports it, `index.ts:61` pattern); not a config store (no runtime-mutable values); not a home for the fade-curve constants (a DIFFERENT family with its own one-home + twin pin, `bridge/fade-curve.ts:32-47`); not a cross-repo package (nle-ui/WDC keep their venue independence).

---

## 4. The riders (what the ruling lands on)

| Spec | Row | The ruling text |
|---|---|---|
| **00-master** | D11's amendment (the r1-port implication paragraph, engine DECISIONS.md:504-512 mirrored spec-side) | The constants-module ruling: ONE module `core/edit-domains.ts` (the collision-map row 5 disposition); the four domains stay venue-pinned; the import law §3.3; the C1-C6 dispositions |
| **06** | §11.7 (the F-7 upgrade, `audits/fleet-r27/spec-06.md:67`) + §5.9F FF-2 (`:1680`) | The four-domain lattice table WITH the module's file:line as the wired row's home + the [0.1,4] nle-ui venue + the dead zone + the authoring path; §11.7 cross-references §5.9F's acceptance domain (FF-2 closes); §5.9F's acceptance row cites `FIT_TO_FILL_RATE` (the derived intersection) |
| **15 §13.15** | the rateStretch row (`:302`, r1 wave 1) + the fit-to-fill composition row (`:31`/`:4920`) | Each r1-scheduled family row names the constants it consumes from the module (rateStretch → the wired domain; fit-to-fill → `FIT_TO_FILL_RATE` + the refusal law) |
| **19-code-references** | OT's module table + the engine bridge row (`:32`, `:146`) + nle-ui's row (`:367`) | The module joins OT's file table; the 2 VALUE-leaf deep-import count becomes 3 if the bridge extends; nle-ui's row records the local `editDomains.ts` + the residual dispositions (C2's ChannelEditor rail: register or align) |
| **Battery (battery_r28)** | new checks | (1) **Presence:** `core/edit-domains.ts` exists in OT + the barrel re-exports it + the 00/06/15 rows cite it (live grep); (2) **Import-graph:** engine `bridge/` imports only `opencut-timeline/{core/*,ops/*}` leaves (grep `from 'opencut-timeline/` — never the barrel; the S3A-P3-1 fence), OT `ops/` never re-declares a wired-domain literal (grep `0.01|MIN_RETIME` outside the two homes); (3) **Lattice coherence:** the four domain literals appear ONLY at their homes + the documented twins (WDC `varispeed.ts:36-37`; the module's `WSOLA_RATE`); (4) **The ⊂-pins:** nle-ui's authoring literals ≡ the module's `AUTHORING_SPEED`/`VOLUME_DB_*`; (5) the fit-to-fill intersection [0.1,5] present in 06 §5.9F AND the module (cross-file equality). |

---

## 5. Recommendation

**The module:** ONE file, `opencut-timeline/src/lib/timeline/core/edit-domains.ts` — a runtime-pure leaf beside `audio-params.ts`; re-exports the two existing one-home leaves (volume-dB + retime); adds the DERIVED lattice facts (the four-domain table as code: `NATIVE_VENUE_SPEED`, `WSOLA_RATE` twin, `AUTHORING_SPEED`, the dead-zone predicate) and the port constants (`minDurationTicks(fps)`, `DELTA_EPSILON_TICKS`); computes `FIT_TO_FILL_RATE` as the live intersection [0.1, 5]. Per-domain namespaces for the non-wired facts; bare consts for the wired domain (no renames).

**The migration sequence (who lands first):**
1. **OT lands the module FIRST** (Stage 0, before any port — the leverage map's own order, mock-leverage.md:140): pure addition, zero behavior change; the barrel re-exports; the AR-1 milestone battery extends (the M54 pattern, `testing/milestones-ar1.ts:75-127` — constants round-trip + the derived-intersection pins).
2. **The engine folds C1/C4** (the same session): `timeline-math.ts:410`'s [+12] derives from the one-home leaf; `keyGainLinearNative` gets its bridge-seams twin pin (the AW1-3 fade pattern). The bridge's leaf set grows only if a lattice fact is needed.
3. **nle-ui mints `lib/editDomains.ts`** (the C6 fix): the named authoring rails; the Inspector/ChannelEditor/fader literals route through it; the C2 disposition (align ChannelEditor to +20 or register the +4 rail) lands with it; the battery's ⊂-pin goes live.
4. **The r1 ports consume it** (Stage 1+: roll/ripple-trim first — their clamps read the module's bounds; fit-to-fill at Stage 3 reads `FIT_TO_FILL_RATE`); the mocks' C3 divergence is corrected or registered at the port's UX-reference pass.
5. **The spec riders + battery_r28** land with the W4/W5 waves (the rows in §4).

**The criteria (in priority order):** (1) **one-home** — every constant has exactly one declared home; everything else is a documented twin with a fence or a re-export (drift impossible by construction); (2) **derivation over declaration** — the derived facts (the intersection, the dead zone, min-duration-in-ticks) are COMPUTED from the domain constants, never re-stated as literals; (3) **boundary cleanliness** — the import graph keeps the layer laws intact (leaves-only bridge imports; nle-ui/WDC independence; the native venue off the wired path), and the battery enforces the graph, not just the values.

**Strongest design constraint:** the engine's zero-runtime-dependency law — the module must remain a pure leaf (re-exports of pure leaves only), because the bridge's deep-import is the ONE mechanism that makes the one-home binding shared rather than synced (OV-01/02; opencut-laws.ts:22-25: "drift impossible by construction — the engine and upstream share ONE binding"). A constants module that drags the barrel (or any runtime graph) into the engine build re-opens the S3A-P3-1 class.

**Conflict count: 6 (C1 the engine's [−60,+12] volume clamp in code; C2 nle-ui's split Gain rails; C3 the three fit-to-fill domains; C4 the unpinned native fold twin; C5 the min-duration literal family; C6 the unnamed authoring literals) + 2 stale doc-laws (06 §11.7; D7's +4 text). The lattice boundaries themselves are clean — nothing imports the wrong domain.**

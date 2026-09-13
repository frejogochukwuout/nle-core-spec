# DESIGN-R24 — mini-plus: the feature-parity round

**Written:** 2026-09-13, R24-mini wave 2. **Status:** v2 (the adversarial
design review R24-2b folded — 19 findings, all amendments below; v1
superseded).
**User directive (verbatim intent):** push the shell-mini toward feature
parity with the essential NLE feature set — property editing (inspector),
effects, transitions (tool mode: touching seam = cross-transition, detached
head/tail = single transition), the advanced trim modes
(`../trim_edit_modes.html`: Roll/Ripple/Slip/Slide), the advanced insert
modes (`../timeline_edit_modes (2).html`: Insert/Overwrite/Replace/Append/
Ripple-Overwrite/Fit-to-Fill), media-asset preview (dual-mode viewer +
source in/out selection), track-head M/S buttons, and a basic mixer (right
side, under the inspector, fold/unfold) — while preserving the pleasant UX
simplicity. "Ideally use app state variant to control these just like web
app experiments have feature variants to gate things."

**References consumed:** the two HTML mode cards (the 4 + 6 mode
vocabularies), the shell-variants implementation map (R24-2a research),
the R24-2b adversarial review (19 findings folded), the mini's current
surface (357/357, the R18k drag law, the S7 XOR selection law, the 0.5s
grid).

**The v2 amendment log (review findings → sections):** F1 (P0, commit/docChanged
blindness) → D2; F2 (P0, split law incomplete) → D2; F3 (P1, gate must be
additive-by-construction) → D1/D3/D8; F4 (P1, ripple fold-in dropped) →
D6; F5 (P1, the otProject bridge) → D2; F6 (P1, source-extent bounds) →
D2; F7 (P1, pool dblclick collision) → D7; F8 (P1, volume range pair) →
D2; F9 (P1, source playhead) → D7; F10 (P1, replace semantics) → D7;
F11 (P1, freeze articulation + the seam registration) → D6/D11/D13;
F12-F18 (P2s) → D1/D2/D6/D7/D8/D9/D11/D13; F19 (P3 set) → D3/D5/D7/D10.

---

## D1 — In-place + ONE gate (no fork), ADDITIVE-BY-CONSTRUCTION

**Ruling: build in-place, gated by a single store-level `miniPlus` flag
(default ON). No fork.**

- The mini is the crawl's LAW REGISTER — `LAW-NET-INVENTORY.md` is K3's
  acceptance list and keys on THIS app's corpus. A fork forks the law
  register, doubles the census, and orphans the annotakit surface. Zero
  law value.
- The gate is the user's experiment-variant idiom: one toggle restores
  the "pleasant simplicity" surface for UX comparison. It is VIEW state
  (never in a doc snapshot, never an undo entry, drag-gated — joins the
  view-family law) — `miniPlus: boolean`, `toggleMiniPlus()`.
  `reset()` restores it to ON (a session surface).
- **Additive-by-construction (F3, the v1 promise made real):** the
  gate-off surface is the R23 surface BY CONSTRUCTION, not by hope —
  every plus affordance MINTS new DOM (new sections/groups/controls/
  testids); NO existing element is superseded, replaced, re-toggled, or
  re-homed. Specifically:
  - the Inspector facts `dl` KEEPS its Start/Duration/End rows in both
    gate states (the editable Timing group is an ADDITIONAL group with
    its own `mini-field-*` testids — the read-only facts never leave);
  - the track-head M chip KEEPS its only-when-muted conditional law (S
    mints its own button);
  - the ripple toggle STAYS a standalone toggle (F4 — the radio never
    owns it);
  - the tools row keeps every existing button + testid; the trim-mode
    radio is an additional segmented control;
  - the corpus (357 nets) is green under BOTH gate states with no setup
    seam — the gate-off default needs nothing; the gate-on default adds
    DOM that no existing net queries (all new surfaces carry new
    `mini-*` testids that the old nets never reference).
- Gate surface: a chip in the TIMELINE TOOLS ROW (F13 — the Topbar law
  forbids stateful chrome): "Mini+" / aria-pressed /
  `mini-btn-miniplus`. When OFF: the plus sections/groups unmount, the
  radio collapses (select-only), source mode + mixer unmount, S hides,
  wedges/fades hide. The DOC fields stay (inert data).
- Gate-ON is the default (the user asked for the features); gate-OFF is
  the UX-comparison escape hatch.

## D2 — The doc-model superset + the REAL critical path

All fields OPTIONAL, all defaulting to the legacy semantic when absent.
The legacy seeds stay byte-identical (seed-equality nets unaffected —
`toEqual` ignores absent optionals).

```ts
interface Clip {
  id: string; trackId: string; mediaId: string;
  start: number; duration: number;          // the R23 fields (grid law)
  // mini-plus (R24; absent = the legacy semantic):
  sourceStart?: number;   // in-point into the media window; absent = 0
  speed?: number;         // recorded rate; absent = 1
  volume?: number;        // LINEAR [0, 2], absent = 1 (spec-15 ClipJSON
                          //   vocabulary; UI dB −18..+6, 0 dB = 1.0 — F8's
                          //   ONE coherent pair; the ONE map law in
                          //   lib/audioDb.ts)
  opacity?: number;       // 0..1, absent = 1
  fadeIn?: number; fadeOut?: number;  // seconds, 0.5-grid
  effects?: EffectJSON[];               // ported shape
  transitionOut?: TransitionJSON;       // on the LEFT clip of a seam
}
interface Track { id; kind; label; muted?: boolean;   // R23
                  solo?: boolean; }                   // R24 (D8)
```

- **The REAL critical path (F1 — P0): the commit/undo/docChanged trio.**
  1. `commit()`'s draft clone must DEEP-CLONE the nested objects:
     `clips.map(c => ({...c, effects: c.effects?.map(cloneEffect),
     transitionOut: c.transitionOut && {...c.transitionOut}}))` — the
     shallow `{...c}` shares references: a nested mutation writes
     through into the live doc AND every history entry (undo
     corruption).
  2. `docChanged()` must compare the full superset: sourceStart, speed,
     volume, opacity, fadeIn/Out, effects (deep: count + per-effect
     id/enabled/params entries), transitionOut (deep), track solo —
     or every plus-edit computes changed=false and silently no-ops.
  3. The live-preview paths (`previewMove`/`previewTrim` spread-copies)
     gain the same nested handling.
  4. Pinned by the variants' regression net class: the
     nested-mutation-undo round-trip net (edit an effect param → undo →
     the param AND the doc are the pre-edit state; the history entry
     does not alias).
- **The split-law FIELD-DISPOSITION TABLE (F2 — P0; lands with W3, the
  wave that first mints sourceStart):**

  | Field | Left half | Right half |
  |---|---|---|
  | start/duration | start; duration = cut − start | start = cut; duration = end − cut |
  | sourceStart | KEPT | `sourceStart + (cut − start)·rate` (the window advances) |
  | speed | KEPT | KEPT |
  | volume / opacity / effects | KEPT (full list) | KEPT (full list) |
  | fadeIn | KEPT, clamped to new duration | deleted |
  | fadeOut | deleted | KEPT, clamped to new duration |
  | transitionOut | **DELETED** (the seam died) | **KEPT** (from the PRE-mutation shape — the tail rides) |

- **The otProject bridge amendment (F5):** `projectClip` gains the
  real in-point model — `trimStartTicks = round(sourceStart × 120000)`,
  the invariant becomes `sourceStart + duration·rate ≤ extent` (legacy
  clips: byte-identical math), `projectClipBack` round-trips the
  in-point. The 12 pin nets re-pinned; CORE-SEAMS S5 flips from
  "implicit in-point-0" to the real model; OT-SEAMS §1.6 registered.
- **The source-extent bound law (F6):** EVERY source-extent bound —
  `clampTrimStart`/`clampTrimEnd`, the ripple preview + commit paths,
  cutHead/cutTail — becomes `(extent − sourceStart)/rate` (legacy
  defaults make it byte-identical for legacy clips). Net pins per site.
- **The 0.5-grid law restated (F14):** PROGRAMMATIC edits + tool-drag
  DELTAS land on the grid (the `rippleShiftAfter` discipline);
  select-mode POINTER trims keep the R18i raw-pointer law verbatim
  (the pointer's own time commits — the freeze). `speed` is RECORDED
  metadata (fit-to-fill + the Speed field compute
  `duration = quantize0.5(window/rate)`; README deviation).
  `sourceStart`, `volume`, `opacity` are not placement facts (not
  grid-bound).
- **`reset()` (F15):** gains `miniPlus: true, viewerMode: 'program',
  sourceMediaId: null, sourceRanges: {}, sourcePlayhead: 0, mixerOpen:
  false, trimTool: 'select'` (mixer state view-only; reset clears).
- **EffectJSON / EFFECT_DEFS:** the 5 variants defs (Gaussian/Motion
  Blur, Vignette, Glow, Chromatic Aberration) with min/max params.
- **TransitionJSON (mini):** `{type:'crossfade', presentation,
  duration, alignment}` — 8 presentations: Cross Dissolve, Dip to
  Black, Dip to White, Wipe Left, Wipe Right, Wipe Up, Wipe Down,
  Slide Push (F19b — the fade in/out at clip edges are the CLIP
  fadeIn/fadeOut fields, NOT presentations; the list carries no fade
  names). duration ≤ min(l.d, r.d) − MIN, 0.5-grid; alignment 0..1
  (cut-centered 0.5).

## D3 — Property editing (feature #1; wave W1)

The Inspector clip card gains editable groups (gate ON) — the facts dl
STAYS (D1 additive law). Port the variants' field primitives:

- `src/shell/fields.tsx`: `NumberField` (50ms debounce → ONE commit per
  settle; Enter/blur settle; invalid = red border + inline message +
  focus retained + NOTHING dispatched; Escape reverts; double-click
  resets to default through the same commit path), `ParamRow` (slider,
  one commit on release), `Group` (26px caret header, body in DOM via
  `hidden`).
- Timing group: **Start** → routed through `moveClip` (honesty per F19c:
  it REJECTS on conflict with a toast — the field's invalid state is
  that rejection); **Duration** → routed through `trimClip('end')`.
  New testids `mini-field-start` / `mini-field-duration`.
- Clip group: **Volume** (audio clips; dB −18..+6, doc linear [0,2]),
  **Opacity** (visual clips 0..100%), **Speed** (10..400%, duration
  recomputed grid-quantized; images: field absent — an image's duration
  is a pure edit decision), **In-point** (sourceStart — only when the
  media window exceeds the clip; source-clamped, neighbor-inert).
- The nudge row + track card + empty card: exactly as-is.

## D4 — Effects (feature #2; wave W1)

- Store actions (commit-wrapped, the no-op guards — unchanged value = NO
  history entry): `addEffect`, `removeEffect`, `toggleEffect`,
  `setEffectParam`, `reorderEffect(clipId, dir)`.
- Inspector **Effects group**: accordion rows (enabled checkbox, name,
  params expanded-in-place, ChevronUp/Down bounds-disabled, X remove),
  "Add effect" picker filtered to defs not already on the clip, params
  seeded from def defaults.
- Selection: LOCAL accordion state (NO store effect domain; the S7 XOR
  law untouched).
- No FxBrowser, no drag-MIME, no FX page.

## D5 — Transitions (feature #3; wave W2)

**The Transition TOOL:** the trim-mode radio's "Transition" entry
(keyboard **X**). In Transition mode:

- Hovering a **touching seam** (|a.end − b.start| < EPS) highlights a
  12→24px seam zone; **click mints a crossfade** on the LEFT clip —
  default `{crossfade, Cross Dissolve, 0.5, 0.5}`, duration clamped to
  `min(l.d, r.d) − MIN` and grid-quantized. **Honest refusal (F19a):**
  if `min(l.d, r.d) − MIN < MIN` (e.g. a 0.5s clip at the seam) the
  mint refuses with a toast — never a zero-duration transition.
- Hovering a **detached clip's head/tail** highlights the edge; **click
  mints a fade** — `fadeIn`/`fadeOut` = min(0.5, duration).
- A seam WITH a transition renders no mint zone (the wedge answers it);
  clicking the **wedge** selects the owning clip + the Inspector's
  Transition group auto-expands (local state).
- **Visual grammar:** the wedge = an X-crossed box on the seam (width =
  duration × pps), fades = corner triangles, `role="button"` + labels.
- Inspector **Transition group**: presentation `<select>` (8), Duration
  NumberField (0.5..min(l.d,r.d)−MIN), Alignment 0..100%, Remove.
  **Fade group:** fadeIn/fadeOut NumberFields + Remove. The "Hard cut"
  affordance when touching + empty.
- `removeTransition`/`removeFade` are delete-aware (unset the optional
  keys).
- Split law per D2's table. Ripple shifts move the seam pair together
  (the transition rides the LEFT clip's tail).

## D6 — Trim modes (feature #4; wave W3)

**The tool radio (gate ON):** `select(V) · roll(T) · slip(Y) ·
slide(U) · transition(X)` — FIVE entries (F4: ripple is NOT in the
radio; the standalone `rippleOn` toggle keeps its law, its testid, and
its composition with every tool — select + ripple stays reachable).
`role="radiogroup"` with `aria-checked` members (NOT aria-pressed —
F4), roving tabindex, keyboard V/T/Y/U/X.

- **Select** = the R18k law verbatim (the freeze).
- **Roll:** edge-drag on a touching cut — `a.duration += d;
  b.start += d; b.duration −= d` (+ `b.sourceStart += d` when present),
  junction-exact check, bounds `lo = MIN − a.d`, `hi = b.d − MIN` ∩
  the D2 source bounds. A gap = honest refusal (cursor + inert). ONE
  undo entry per gesture.
- **Ripple DRAG (the radio's absence, restated):** ripple TRIM-by-drag
  rides the EXISTING rippleOn toggle + Select tool (the R18e cut
  buttons + ripple delete already cover the head/tail laws; the
  edge-drag ripple preview/commit paths exist — F6's bound amendment
  applies). NO new ripple tool.
- **Slip:** body-drag moves the CONTENT under a fixed clip —
  `sourceStart ∈ [0, (extent − duration·rate)]`, grid-free
  (sourceStart is not a placement fact). Images: inert (no other
  content; title hint). ONE undo entry per gesture.
- **Slide:** body-drag moves the clip; the FACING neighbor edges trim —
  each edge capped by its own MIN bound; **the gap law (F18b — an
  extension beyond the ported `slideStartBounds`, declared):** a
  capped edge opens a GAP, never overlaps; pinned by its own nets +
  deviation #10.
- Pure laws in `src/lib/trimModes.ts` (the trimLaws math re-derived:
  MIN = 0.5, no fps, no locked, no linked; source bounds per D2).
  Store actions `rollTrim`, `slipDrag`, `slideDrag` — clamp via the
  lib, ONE `commit()`.
- **The tool-dispatch seam (F11 — REGISTERED as deviation #9):** the
  gesture start reads the tool ONCE and dispatches via a table
  (`TOOL_GESTURES[tool]`); the select branch is BYTE-IDENTICAL to the
  current routing (the diff gate: the select path's calls unchanged);
  roll/slip/slide add branches. The store header's "preview* mutates
  ONLY the mover — neighbors never move" law is RE-SCOPED to
  select-mode (the comment amended in the same wave).
- The freeze gate is the R18k BEHAVIOR NETS (not a file diff) —
  Timeline.tsx takes diffs for the seam zones, wedges, M/S, radio,
  effectiveMute classes; the select-mode behavior nets must stay green
  through every wave (D11).

## D7 — Insert modes + source mode (features #5+#6; wave W4)

- **Viewer dual mode:** `viewerMode: 'program'|'source'` +
  `sourceMediaId` + `sourceRanges: Record<mediaId, {in,out}|undefined>`
  + **`sourcePlayhead: number` (F9 — the source stage's own position;
  the program playhead is FROZEN while in source mode)**. All VIEW
  state, all drag-gated toggles. Source stage = the media's poster
  (filmstrip head frame / waveform for audio) + `SourceRangeBar` + the
  mode row + Set In/Out/Clear (marking at `sourcePlayhead`) + the
  source scrub law (the bar + the stage's own scrub strip drive
  `sourcePlayhead`; the timeline surfaces never move in source mode).
  "Back to program" exits.
- **Entry (F7 — NOT dblclick):** a hover/focus "Open in source"
  affordance on each pool card (an icon button, `mini-btn-source-open`,
  title "Open in source viewer"; click/Enter/Space opens; the card's
  own click law — append — untouched; the 300ms double-fire guard
  unaffected). The single-click pool law stays byte-identical.
- **SourceRangeBar** ported: dual `role="slider"` handles, absolute
  drag positioning, B7 pointer discipline, keyboard ←/→ ±0.5 (⇧
  ±2.5), Home/End, the in<out clamp law (inverted/equal refuses —
  keeps the previous edge, never silently snaps), grid clamps.
- **The mode row:** the 6 reference modes as ONE-SHOT ACTION buttons
  (the variants' ruling — no persistent insert mode): Insert /
  Overwrite / Replace / Append at End / Ripple Overwrite / Fit to
  Fill. Act on `sourceMediaId` + the in/out. The plan math in
  `src/lib/insertPlan.ts` (pure plan/apply split, preview==commit via
  ONE ctx builder — the variants' preview-omits-sourceRange bug is
  FIXED in the port):
  - `insert`: split straddlers (per D2's disposition table), later
    clips shift right by the placed duration;
  - `overwrite`: fully covered → remove; head/tail straddle → trim
    (sourceStart rides); middle straddle → split;
  - `append`: lane tail, playhead ignored;
  - `replace` (**F10 — the REFERENCE semantics, not v1's**): the
    selected clip, EXACT-LENGTH swap — the source window is adjusted
    to the replaced duration (`sourceStart` slides, `out` fits);
    honest refusal if the window can't cover it; NO downstream trim;
  - `ripple-overwrite`: overwrite + `delta = placed − displaced`
    shifts later clips;
  - `fit-to-fill`: the marked span (in/out window); `rate =
    clamp(window/span)`; honest refusal outside the clamp; `speed`
    recorded, duration = span. **Images (F19e): refuse with a toast
    (an image has no source window to retime).**
  - Target-track routing: the media's kind → the BOUND track of that
    kind (the binding window law); refusal = honest toast.
  - **Per-mode transition/fade disposition table (F19d):** insert's
    straddle-split follows D2's table (right half keeps
    transitionOut); overwrite's covered removal drops the clip's
    transitionOut with it; head-straddle trim KEEPS fadeIn, drops
    nothing at the tail; tail-straddle keeps fadeOut; replace severs
    the replaced clip's transitionOut (the seam died with the clip);
    append/fit-to-fill are inert to transitions.
- Placement duration = `out − in` (clamped to media tail).

## D8 — Track heads M/S (feature #7; wave W5)

- `Track.solo?: boolean` + `toggleTrackSolo` (commit-wrapped).
- The head's M chip KEEPS its only-when-muted conditional law (D1
  additive); **S mints a sibling button** — visible when gate ON
  (inert-looking when the track can't solo? no: always clickable).
  16px buttons stacked in the head's second cell (the 44px head: badge
  + label row, then M(conditional)/S stacked; the collapsed 22px
  audio lane: S drops out, M chip only — the collapsed lane is a
  placeholder bar, F17). S testid `mini-track-solo-${track.id}`;
  the M chip keeps `mini-track-mute-chip-${track.id}` (F17's
  correction: `mini-track-mute` is the Inspector card's button —
  different element, both survive).
- **Solo law (solo-in-place):** `effectiveMute = muted || (anySolo &&
  !solo)` — ONE selector `isTrackAudible(doc, trackId)` in
  geometry.ts; the lane dim + the track card + the meters read it.

## D9 — Mixer (feature #8; wave W6, split 6a/6b per F16)

- **6a — the engine + primitives:** `src/lib/meterEngine.ts` (the
  seeded walk, dB ballistics, useSyncExternalStore cached snapshots,
  idle+settled rAF stop, `__setLevel`/`__reset` hooks) + `Fader`
  (taper + gridlines + headroom) + the stereo `StripMeter` — netted
  standalone (6a's gate: engine nets + primitives render).
- **6b — the dock:** the right column becomes
  `flex-direction: column` (Inspector flex, Mixer dock below).
  `mixerOpen: boolean` — **default FOLDED (F16: the default frame is
  a pinned R23 artifact — it must not change)** — the folded state is
  a 28px header bar ("Mixer" + chevron toggle,
  `mini-btn-mixer-toggle`); open ≈ 220px. **Composed-collapse laws
  (F16):** `viewerMax` hides the whole right rail — the mixer goes
  with it; `inspectorCollapsed` (the thin rail) — the mixer hides
  too (the rail IS the column). Strips: BOUND audio tracks only (the
  window law; video-only mode → the empty-state "no audio tracks
  bound"), one per track + master: name, M/S dots (the D8 selector),
  pan, the Fader, the meter, a "track gain (mock)" label.
- Mixer state is VIEW state (the variants' law: the mock mixer is
  view-state; the real home is spec-20 project data) —
  `mixer: {trackId: {faderDb, pan}}` + master; plain `set`, never in
  snapshots; `reset()` clears (D2).

## D10 — Keyboard (the resolved map)

Existing keys stay EXACTLY (the 357-net corpus pins them: Space/S/`[`/
`]`/Del/±/0/Home/Esc/⌘Z — F18a: the mini has NO alt-bracket bindings;
`[`/`]` keep the R18e cut-head/tail meaning). Additions (gate ON):

| Key | Action | Law |
|---|---|---|
| V/T/Y/U/X | tool radio | roving focus; X = transition tool |
| `,` / `.` | source mode: Insert / Overwrite | gated to `viewerMode==='source'` (program mode: inert — no collision) |
| I / O | source mode: set In / Out at `sourcePlayhead` | gated ditto |
| Esc | the chain: **dragActive-cancel first** → source-mode exit → the existing law | F19f |
| ↑/↓ on the fader | ±1 dB | mixer only |

## D11 — The test + census plan

- Every wave lands discriminating, mutation-verified nets where a law
  is subtle (the commit deep-clone round-trip, the roll junction, the
  slip bounds, the in<out refusal, the split disposition table, the
  anySolo law, the meter ballistics).
- New testids mint per the census grammar; the LAW-NET re-census rows
  grow per wave; the count re-pin lands at each wave's push (declared
  == actual at EVERY push).
- **Gate-off nets:** per feature, at least one asserting the
  plus-surface unmounts AND a base net still passes with the gate off
  (the additive-by-construction claim is TESTED, not asserted).
- **The freeze gate:** the R18k select-mode BEHAVIOR nets stay green
  through every wave (the diff-check is advisory, the nets are the
  law); the tool-dispatch seam's select branch stays byte-identical
  (deviation #9).

## D12 — Wave plan + gates

| Wave | Lands | Gate at push |
|---|---|---|
| W0 | The foundation: model superset + the commit/docChanged/clone trio + the miniPlus gate + fields primitives | tsc 0, suite green, re-pin, push |
| W1 | Property editing + effects (D3+D4) | +nets, push |
| W2 | Transitions (D5) | +nets, push |
| W3 | Trim modes + the split disposition table (D6+D2) | +nets, push |
| W4 | Source mode + insert modes (D7) | +nets, push |
| W5 | Track M/S (D8) | +nets, push |
| W6a | Mixer engine + primitives | +nets, push |
| W6b | Mixer dock integration | +nets, push |
| W7 | Stories + README deviations + LAW-NET re-census + the review loop | battery + census re-pin, push |

Review protocol: every wave reviewed by a fresh-context sub-agent
(code+UX); W7 is the full-surface audit loop (iterate to zero P1/P2,
≤P3 residue only with a registered reason).

## D13 — The deviations register (pre-declared, README #40+)

1. Speed is approximate (grid-quantized duration; the recorded rate is
   the ratio) — the 0.5-grid law wins over exact-rate math.
2. Effects are data-only (no renderer; params + wire-shape only).
3. Transition presentations trimmed 27 → 8.
4. `,`/`.` mean source-mode insert/overwrite ONLY in source mode.
5. ~~The Ripple radio entry ≡ the rippleOn toggle~~ (RETIRED at v2 —
   F4: the toggle stays standalone; no radio entry).
6. The mock mixer is view-state (the real home is spec-20 project
   data); meters are the seeded deterministic walk, not decode.
7. Slip is inert for images.
8. Solo is solo-in-place (no exclusive-solo re-entrancy).
9. **The tool-dispatch seam (F11):** the gesture router gained
   tool-branched dispatch (select branch byte-identical; the
   "mover-only preview" law re-scoped to select-mode).
10. **The slide gap law (F18b):** a capped slide edge opens a gap
    (extends the ported bounds law — new nets).
11. **The volume pair (F8):** doc linear [0,2] ↔ UI dB −18..+6 (0 dB =
    unity) — the ONE map in `lib/audioDb.ts`.
12. **Replace is exact-length (F10):** the source window adjusts to the
    replaced duration; refusal when the window can't cover (the
    reference's semantics, not ripple-overwrite's).
13. **The source stage owns its playhead (F9):** `sourcePlayhead` view
    state; the program playhead freezes in source mode.
14. **The pool "open in source" affordance (F7):** hover/focus icon
    button per card (the click-to-append law untouched).

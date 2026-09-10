# DESIGN-R20 — mixer rebuild, insert modes, real color, type-driven inspector (v2)

Round scope: 16 open annotakit threads (GH #53–#68) + the user's chat directives.
Contracts (normative for measurements): `docs/r20/{mixer-contract,insert-modes,
color-layout,timeline-cluster}.md`. v2 folds BOTH design-review rounds (R20-DESIGN-REV-A
UX + R20-DESIGN-REV-B feasibility; all P1/P2 amendments applied — tier arithmetic,
B1 measurement spec, ⌘M correction, plan/state-home/undo mechanics, wave order swap,
ledger map). Gap ledger: §H C33–C44 continue → **C45–C58** (14 entries; D6 is
AUTHORITATIVE over the draft tables inside the contracts — W0 stamps them).

---

## D1 — MIXER REBUILD (threads #59/#61/#60; biggest item)

**Verdict: rebuild in place (ChannelStrip/MixerDock), keep MixerPrimitives' FADER_TAPER
math (verified correct) and the store surface.**

### D1.1 Fix-first
- **B1 width fix (REV-B P1-2):** measure the **timeline ROW** (AppShell.tsx:292 — the
  definite-width ancestor; NOT the content-sized shrink-0 wrapper which caused B1) via
  ResizeObserver. `budget = min(0.6 × rowWidth, 22 + (N+3)×86)` where N = audio-track
  count; `maxStrips = floor((budget − 22 − 3×86) / 86)`; channel scroll region
  `min-width: 2×86`; aux+master render AFTER (never over) the channel region.
  Belt-and-braces CSS: move the max-width onto the AppShell wrapper row scope.
- **B9 meter/fader disagreement:** meter fill via `1 − dbToPos(db)`, zone stops
  −18→37.2% / −6→69.2% (0dB @ 85% fill = same 15%-headroom law as fader/scale/grid).
  Update MixerPrimitives.test.tsx:456-507 in the same commit (binding).
- **B4 collapse icon:** per-state icon (closed → no chrome; meters → panel-right;
  full → chevrons-left); `aria-pressed` boolean (open/closed) + aria-label/data-tip
  carries the state name.

### D1.2 Spatial fidelity (contract §1-§2 normative)
- Strip width **uniform 86px** (aux/master too); column order **scale | fader | meter**
  (fix mirrored order); cross-strip dB gridlines at 15/28/42/55/68/80/90% drawn inside
  the pinned fader section (token-colored) so alignment reads across strips; db-readout
  9px signed-1dp above scale (README deviation: reference HTML uses 8-9px labels —
  registered, not silently shipped).
- Vertical stack order exactly: header(28, 3px kind-color top border, ID-only) →
  input(22) → fx-rack(5 slots, 105px) → I(26) → graphs(EQ 28 + dyn 28) → pan(48) →
  routing(24) → title(26) → RSM(24) → fader-section(flex terminal). Track name lives
  in the title row (contract divergence D5), header = ID + kind color.

### D1.3 Height tiers — ONE normative row set (REV-A P1-1/P1-2, REV-B P1-3)
Export `MIXER_TIER = { FULL: 560, LEAN: 420, MIN: 340, FLOOR: 280 }` (4 boundaries;
tests pin the exported constants). Travel = section − 24 headroom; floor = 140px
(section 164). **The doc's leaner row set is normative** (contract §4.2 updated in W0):
- **T0 ≥560:** full reference anatomy (big-screen/story state — the live dock at
  1440×894 measures ~376px, so in practice T2 delivers the "faithful silhouette").
- **T1 420–559:** graphs → 1 combined 28px row; pan 48→36; fx-rack 3 slots. Travel
  @420 ≈ 160px ✓.
- **T2 340–419:** graphs hidden; input row hidden; pan compact 36; fx-rack → header
  + count (expandable). Travel @340 ≈ 154px ✓.
- **T3 <340 (to FLOOR 280):** per-channel vertical scroll of the accessory stack only
  (input/fx/graphs/pan/routing/title/RSM scroll inside the strip); fader+scale+meter
  **pinned** at bottom. `faderSection = clamp(H − 53 − scrollMin, 164, 260)` with
  `scrollMin = max(40, H − 53 − 164)` — travel floor WINS, scroll floor yields to 40px.
- **< FLOOR 280:** strip layout not renderable → auto-fallback to **meters** state
  (honest toast once per session). The 50%-of-strip proportion law is T0/reference-scale
  only (registered, not claimed at small tiers).
- Compact-width trigger (was mislabeled "strip width"): **dock width budget < N×86**
  → 72px narrow variant (scale+fader only; meters to the rail).

### D1.4 3-state machine (thread #61)
- **closed** (existing `collapsed`): dock unmounts; F6 region unregisters (exists).
- **meters** (replaces `bridge`): full dock height, thin per-track **24px columns**
  side-by-side (badge row + 2×8px bars + M/S micro dots; horizontal scroll beyond
  capacity; master pinned right). State string, `mixer-dock-bridge` testid and `bridge-*`
  per-track testids RENAME to `mixer-dock-meters` / `meter-col-*` (MixerDock.test,
  useUiStore.test:421, Mixer stories updated in-wave — blast radius per contract §5.3-5.4).
- **full:** strips per D1.2.
- Cycle: **Edit page closed→meters→full→closed; Audio page meters↔full** (page-aware
  branch PRESERVED — useUiStore.ts:1178-1184 behavior, pinned by test :421).
- **Buttons only, NO chord** (REV-B P1-1: ⌘M is focused-track mute per spec 16 §3.5 —
  never the mixer cycle; the doc v1's "⌘M as today" was wrong, there is no cycle key).

### D1.5 Track-head heights (thread #58) + media bay (thread #67)
- Per-track `trackHeightOverrides: Record<string, number>` view-state (name distinct
  from the existing `trackHeights` fn). Resize strip on the track head's bottom edge:
  drag ±, keyboard ±4px (⇧ 16px), dbl-click reset; min 24 (caption 32) / max 240.
  `laneHeight(kind)` → `laneHeight(track)` signature change — consumers enumerated
  (Timeline walks :301-315, header :730, lanes :825, Clip prop :896, ghosts :957,
  marquee :428/:507). Drag math maps display px → override (audio focus: dy ÷ boost).
  **Yield rule (locked):** boost is a page-level transform; overrides participate
  proportionally (custom main >40 may cap in focus — registered behavior).
- Media bay (pool + SoundLibrary) mode filter: audio focus → audio-only assets
  (count chip honest); view-state, not persisted.

---

## D2 — MEDIA INSERT MODES (threads #63/#64/#65/#66/#68)

**Premise (the user's side-by-side question, answered):** we are a single-viewer shell
(no dual source/program pair); source-preview mode IS our source monitor — hence the
transport row per issue #64, not an overlay per #63.

- **Remove** the program-monitor EditOverlay dock — **in W2, same commit as the new
  SourceEditBar** (REV-B P2-6: W0 removal would strand the 7 ops for a whole wave;
  EditOverlay.tsx:81 is insertMediaAt's only UI consumer).
- **SourceEditBar in the source-preview transport** (Viewer.tsx:498-505): left zone =
  Insert + Overwrite (reference icons @16px) + divider + five secondary; duration TC
  right. One-shot actions, NOT a mode radiogroup (no NLE keeps a persistent mode);
  roving tabindex; `,`/`.` = insert/overwrite **gated to source mode** (context-disjoint
  from spec 16 §3.6's nudge-in-select-mode — registered in the deviation register).
  Below ~560px viewer width the five secondary collapse into an overflow menu.
  Buttons act on **sourceMediaId** (fixes the wrong-asset bug: EditOverlay used
  mediaSelection[0] while 'Open in viewer' sets sourceMediaId only).
- **Refactor (REV-B P2-4/P2-5):** `insertMediaAt` → pure `planInsertMedia(scenes,
  mediaId, mode, ctx, idFactory)` returning `InsertPlan` = {ok, reason?, geometry
  (ghost/arrow/speed/overwrite spans/displaced[].to), patchList (FULL mutation
  descriptor incl. markers re-offset, sourceStart shift, transitionOut sever/keep,
  pushedRight double-shift guard, placeOnTop-with-overlaps variant)} + `applyInsertPlan`
  (mints ids via idFactory — planner takes an idFactory so PREVIEW never advances the
  counter; applier preserves today's toast kinds/titles; `set({selection:[]})` only for
  the 5 shared modes — replace/fitToFill do NOT clear selection today).
- **Hover state model (REV-B P2-4):** store **the mode**, not the plan object:
  `hoverInsertPreview: {mediaId, mode} | null` (view-state; verified outside
  withHistory snapshots). Plan computed in a `useMemo`-keyed hook — never in a raw
  zustand selector (fresh-object identity trap). **Hover AND focus both arm the
  preview** (onFocus/onBlur parity — REV-A P2-5); ≥150ms dwell; a11y via
  aria-describedby per button + a dwell-settled status announcement.
- **Timeline preview rendering:** ghost clip at insertion point (dashed, reference
  grammar), white displacement arrows (reference SVG paths verbatim), overwrite-span
  shading, split tick, fit-to-fill speed badge — PLUS **translate-preview for
  displaced clips** (CSS transform to plan.displaced[].to + ghost outline at original
  position — the reference shows FINAL state; REV-A P2-6 adopted). `ok:false` → no
  geometry; button tip shows refusal reason. Hover-out/focus-blur clears (no residue).
  Preview==commit test compares GEOMETRY, not ids. Click applies the SAME plan.
- **Audio routing (thread #65):** type-wins — audio-only source always targets an
  audio lane even when a video clip is selected; retarget to selected clip's track
  when kinds match; **source-mode-only** frozen-lane affordance (video lanes dimmed/
  untargetable while an audio source is loaded; program mode NEVER dims lanes — the
  guard is the law, exitSourcePreview clearing is the side-effect).
- Zoom ladder += `1.25×` (Viewer.tsx:182-186; deviation from spec 18 §3.3 ladder
  registered in README + Viewer.test.tsx:42-57 updated in-commit).
- Audio pool assets: hover-dwell ≥400ms → waveform scrub motion (meterEngine-driven,
  low duty; thread #68). Touch/pen get no hover preview (deviation-register note).
- Pool→timeline drop: wire to `applyInsertPlan` (mode insert; Alt = overwrite) with
  `opts.time` — removes the toast-only lying path (Timeline.tsx:814-871).

## D3 — COLOR GRADING (user: "very broken"; keep viewer, real math)

- **Viewer stays mainbody-center, ALWAYS** — becomes a grade `<canvas>` (state rows
  from spec 18 §4.2 ported: loading skeleton / decode-failure+retry / offline).
  Pipeline per contract §3: sRGB decode LUT → scene-linear → spec-08 §4.2 14-step
  order (verified real) → sRGB encode LUT; per-elementId grade lookup; rAF coalescing;
  ≤960×540 working res. Spec-08 §12 cache-linear strategy.
- **State home (REV-B P2-7, resolved):** G-slice sidecar `mockGrades:
  Record<elementId|'timeline', WheelsParams+curves+qualifier>` — NOT on ElementJSON
  (spec-09 discipline; mockMixer precedent). Undo: withHistory snapshot EXTENDED to
  include the sidecar (one history entry per commit). C50 wording owns this.
- **Right rail = clip-level color sections** rendered with the W3 (new) inspector
  shell + SectionHeader/ControlRow grammar (NOT a forked panel — REV-A P2-11).
  While grade target = Timeline, the rail shows a "Timeline grade" badge + the same
  editors (never stale clip values).
- **Timeline area → ColorConsole** (mixer-console precedent): frozen lane strip
  (ruler 22 + video 24 + audio 16 dimmed; clips clickable = grade target) + tabs
  **[Primaries | Curves | Qualifier]** (compact text tabs, timeline_edit_modes
  tab-nav style) + **Clip⇄Timeline grade-target toggle** (timeline target = the
  ONLY editor of the timeline grade — single owner; the Project sheet never edits it).
  Curves tab gets internal scroll at the 1280×800 floor (registered).
- **Scopes: NOT a tab** (simultaneity law): compact real-data scope strip under the
  viewer (Waveform+Parade+Vectorscope, 10fps throttle, column-histogram; BT.601
  vectorscope, spec-08 §11.3 graticule + 123° skin-tone line). Small-height honesty:
  scopes collapse to headers at the floor BEFORE any viewer shrink (registered).
- **Node graph stays in the left dock** (R19 placement; restyle toward the reference
  anatomy where cheap).
- Wheels = spec-08 WheelsParams; YRGB rows = derived readouts (offset ×1023).
  **REAL math in `src/lib/color/`** with the contract §6 module names:
  `colorSpace.ts` (LUTs), `gradeMath.ts`, `wheels` in gradeMath, `qualifierMath.ts`,
  `gradedImage.ts` (canvas render), `scopesMath.ts` — pure functions, DOM-free.
- Existing local-useState fake controls → sidecar-driven (setGrade ops); qualifier =
  real HSL keying + mask overlay + eyedropper on the graded buffer.
- jsdom canvas: getContext stub in the color test setup (no canvas pkg).

## D4 — INSPECTOR: TYPE-DRIVEN, NO TALL TABS (thread #53)

1. **Remove the 64px tall-icon tab strip.** Inspector = single scroll of SECTIONS by
   selected-entity type (inspectorpanel.tsx grammar: SectionHeader w/ caret/toggle/
   keyframe-slot/reset, ControlRow label/ctrl/actions). Compact text sub-tabs ONLY
   for long families (Audio [Levels | EQ]) — tablist/tab semantics KEPT on those
   (spec 18 §11.6). Deviation from 18 §4.4 (4-tab topology) + §11.6 registered in the
   ledger (extends C58); test debt enumerated: Inspector.test tab tests (:32-:135) +
   `inspectorTab` store surface (useUiStore.ts:351/434/644).
2. **Selection domains + state machine (REV-A P2-10):** `selectedTrackId`,
   `selectedEffectId` mirror the R19 marker domain-swap pattern (useUiStore.ts:781-784,
   :1043-1059). Sheet table: multi-clip → mixed sheet (today) | single clip → type
   sections | track → TrackSheet | effect → EffectEditor (params + toggle/reorder/
   remove) | **empty → active-track fallback KEPT** (R19 feature the reviewer asked
   for — TrackSheet of activeTrackOf, not deleted) | marker/caption → R19 panels.
   selectedEffectId clears when its clip deselects. Track-header hit target = the
   non-interactive residue (name/height area); M/S/L/V buttons keep semantics; click =
   focus + select (16 TrackHeader tests preserved).
3. **Inspector header** = entity chip (icon + name + kind color) + breadcrumb (track >
   effect). Testids: `inspector-entity-chip`, `shell-track-sheet-*`,
   `shell-effect-editor-*`; `shell-inspector-*` preserved.
4. **Project-level (DESCOPED, REV-A P2-9):** this round ships at most a minimal
   Project sheet (single sheet, toolbar button, read-only summary + project color
   space + master bus) — NO per-page persistent tabs, NO viewer-header button. C58
   registers the full design (per-stage tabs cut/color/audio/export) as the follow-up.
   Timeline grade is NEVER edited here (single owner = ColorConsole).

## D5 — TIMELINE CLUSTER (threads #54/#55/#56/#57/#62) — APPROVED by both reviewers

Per contract `docs/r20/timeline-cluster.md`:
1. **Markers free-floating = app.css:174 `[data-tip]{position:relative}` unlayered**
   → move into `@layer base` (verified safe — no data-tip host gets position from a
   layered rule) + pin-edge clamp for markers at t=0. Regression test lands **in W0**
   (layer-placement assertion via `readFileSync(styles/app.css)` — NOT `?raw` import,
   which vitest css:false stubs) + live computed-position probe.
2. **Loop handles:** full-band 12×27 bracket handles anchored INSIDE the loop region
   (bracketH glyphs; clamp+mirror deleted; grab 324px²).
3. **Text clips:** centered thin bar `clamp(20, lane·0.4, 28)`px, label inside.
4. **Track-head heights:** D1.5.
5. **Fades → transition objects** (thread #62): right-half wedge at clip head (mirror
   at tail), width = fade duration, drag-to-resize (slider semantics, ONE
   `setElementField` commit per drag = one undo entry — fields `audioFadeIn/Out`
   exist, mockData.ts:77-78), click selects clip → inspector Fades group; fake curve
   dots REMOVED; per-type glyph slot = documented TODO.

## D6 — gap ledger (AUTHORITATIVE; W0 stamps the contract draft tables + this map)

| draft (in contract) | unified |
|---|---|
| insert-modes C45–C49 | C45–C49 (1:1, no change) |
| color-layout C45 (grade sidecar) | C50 |
| color-layout C46 (console layout) | C51 |
| color-layout C47 (CPU preview) | C52 |
| color-layout C48 (real scopes) | C53 |
| color-layout C49 (qualifier) | C54 |
| color-layout C50 (curves) | C55 |
| color-layout C51 (node binding) | C56 |
| color-layout C52 (clip color inspector rail) | folded into C51 (one sentence) |

- C45 edit-function family OT seams; C46 source-transport insert cluster;
  C47 audio-source routing law; C48 hover-placement preview; C49 audio waveform
  autoplay (extends C42); C50 grade sidecar + undo snapshot extension;
  C51 ColorConsole layout (incl. clip-rail); C52 CPU preview pipeline;
  C53 real scopes (supersedes C43 — noted on C43 at update time, append-only);
  C54 qualifier HSL keying; C55 curves tab; C56 node-graph→grade binding;
  C57 track-height overrides + per-track FX home; C58 project-level properties
  (full per-stage design; also carries the 18 §4.4/§11.6 tab-strip deviation note).

## D7 — wave plan (v2: inspector BEFORE color; W0 gated)

- **W0 (fix-first, self, gated tsc+vitest):** B1 dock-width fix + app.css tooltip
  layering + its regression test (computed-position probe) + zoom 1.25× (test) +
  contract ledger stamping (D6 map) + README deviations. Commit+push.
- **W1 (mixer):** D1 all; gates tsc/vitest + VLM on 1280×800 (**dock ≈266px → T3 —
  the scroll tier is ON the gate**) + 1440×894 (≈376px → T2) + meters state +
  full-state-at-whatever-tier.
- **W2 (insert modes):** D2; gates: plan/apply unit tests (7 modes × ok/refusal ×
  patch fidelity), preview==commit GEOMETRY test, transport a11y, dock-removal +
  SourceEditBar in ONE commit.
- **W3 (inspector):** D4.1-4.3 (+ minimal Project sheet if early); gates:
  section-visibility matrix, domain mutual-exclusivity, mixed-sheet + empty-fallback
  preserved, tablist on sub-tabs.
- **W4 (color):** D3 (3 sub-agents: color-math lib / console+shell / viewer+scopes);
  consumes the W3 inspector shell. Gates: CDL spot values, sRGB round-trip ≤1 LSB,
  vectorscope angle checks, scope snapshot tests, Viewer/AppShell/ColorPage suite
  preservation (AppShell.test:155-160 testid moves enumerated), VLM pass.
- **W5 (timeline cluster):** D5 items 2-5 (item 1 = W0); gates per contract.
- **W6:** adversarial review + spec-compliance + fixes; VLM hardening; 16/16 thread
  resolution with fix notes; docs; commit/push/bundle/runtime-sync.

Deviation law: mock README deviations register updated per wave; spec findings ONLY
via the ledger (never edit specs from the mock).

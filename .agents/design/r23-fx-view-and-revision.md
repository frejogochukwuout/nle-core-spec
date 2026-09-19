# DESIGN-R23 — the FX/transition surface + the all-track revision round

**v2** (2026-09-07) — folded R23-A's adversarial audit (3 BLOCKERs + 17
concerns/notes) + R23-B's grep-verified seam map (10 corrections). The
v2 amendment log is Part IX; every ruling below carries its provenance.
**Written:** 2026-09-07 (R23 opener). **Issues:** #90–#108 (19 new, all on
`shell-appshell--edit`) + the R20 carry-over #70. **Predecessor:**
DESIGN-R22 (v2, landed W0–W5; its W6 sketch is superseded by this doc's
Part I).

Provenance law (SKILL #90): every design element below is labeled
[reference-faithful] (a ui-mock HTML canon fact), [research-informed]
(DaVinci/NLE workflow research, 2026-09-07 web pass), [user-directed]
(the verbatim issue text), or [repo-precedent] (existing shipped grammar).

---

## Part 0 — the corpus and the track map

| # | verbatim core | component (jsx pin) | track |
|---|---|---|---|
| #103 | "transition effect object around the seams of two clips … dedicated workflow view … nothing is done. I have to reiterate." | Timeline.tsx:838 (transition-el-2) | **A — FX** |
| #104 | "the 'head', a half-open transition effect object … dedicated workflow view … reiterate. again." | Clip.tsx:1198 (fade-object-el-6-in) | **A — FX** |
| #105 | "the 'tail' … dedicated transition / effect view … hover between two clips (seam) we can allow transition to be added … same on tail/head. then selecting the clip itself will just inspect Effects instead of Transitions … or we should do both maybe … research / analyze / review till you land on the best direction" | Clip.tsx:1228 (fade-object-el-6-out) | **A — FX** |
| #102 | "when hovering these, it should clearly show me the edit mode too; … most of the timeline visualization are broken / wrong, some can't even be visible (it should scroll / zoom so the actual place being applied are visible); … there should be animated effects now none." | SourceEditBar.tsx:214 | **E — timeline visuals** |
| #90 | "this should be stacked next to the multi-track just like where Mixer console is." | ColorScopeStrip.tsx:133 (26px header) | **B — color** |
| #95 | "this applies to these FOUR views, wfm, rgb, vec, etc. make these multi-tabs so they can render normally instead of being squeezed … move them to a panel not under a preview that is squeezed" | ColorScopeStrip.tsx:189 (canvas) | **B — color** |
| #93 | "Node view might benefit from a larger view, taking the preview window space? spin up a rigorous ux design / review iterations to find the best place … is the node graph an asset that we can save? … fit better on the preview window as well (we can cross it out just like a normal asset preview … to exit the node edit flow) … worst case just do a popup overlay" | NodeGraphDock.tsx:35 | **B — color** |
| #94 | "we need a way to switch back to a larger track view, esp. since previewing on filmstrip is necessary … this super compact mode we should allow to be used everywhere … (the export view is another example)" | TimelineCompact.tsx:89 | **B — color (+ F deliver)** |
| #96 | "trackhead not working in this compact view … ideally it can still move" | TimelineCompact.tsx:89 | **B — color** |
| #91 | "this should be the only tab in Media Bin … we don't need the media bin tab at all. remember filter to the right asset type for each workflow view" | LeftDock.tsx:130 (stills tab) | **B — color (+ D)** |
| #97 | "what exactly should these assets be applied? … do deep research what's the proper workflow in davinci resolve and NLE in general … track level? clip level? etc." | StillsPanel.tsx:79 | **B — color** |
| #92 | "mixer shouldn't be here in Color Grading view" | Toolbar2.tsx:163 (btn-mixer) | **B — color** |
| #98 | "this layout feels strange when only gain has a dialer and the other two are empty … need a major polishing round here" | ChannelEditor.tsx:149 | **C — mixer/inspector** |
| #99 | "if we are selecting channel then you should just show channel editor, then what problem do you have with 'clip not selected'? … full audit on all the inspector panels for things like these" | ChannelEditor.tsx:183 | **C — mixer/inspector** |
| #70 | "probably should have separate collapse / minimize for the master / bus" | MixerDock.tsx:297 (FullDock) | **C — mixer/inspector** |
| #100 | "we can't keep 'Media Pool' here hard coded when the panel below can be many things, in export view it is the export setting for example!" | Toolbar2.tsx:115 | **D — shell semantics** |
| #106 | "this tab is unnecessary if you name things correctly instead of calling it Media Pool above" | LeftDock.tsx:108 | **D — shell semantics** |
| #108 | "be thoughtful what to include here, these should likely differ per view / mode … thorough design / review iterations … research too for nle / davinciResolve best practices" | TimelineToolbar.tsx:115 | **D — shell semantics** |
| #101 | "these are improvements but they look ugly, perhaps make them slightly thinner will help as they are less noticeable in details" | Ruler.tsx:445 (bracket) | **E — timeline visuals** |
| #107 | "use block (compact) timeline style, and make the timeline panel slightly narrower to leave more room for the export preview, just the head range selection should be normal height … the shorter timeline area can leave more room for export settings too." | AppDock.tsx:39 (deliver tab) | **F — deliver** |

Plus the standing R22 HANDOFF next-steps that ride this round: **W6 the
FX view** (= track A, now), the per-mode transition glyphs (R20
carry-forward — folded into track A's object language), C56 node-graph
binding beyond Primary/Secondary (folded into track B's node surface).

---

## Part I — THE FLAGSHIP: the FX/transition surface (#103/#104/#105)

### I.0 The question the user asked

#105 verbatim: "i can also have this being a general tool mode in Edit (so
when activating a tool it become this transition effect only selection and
trimming essentially locking / filtering out the normal timeline clips), in
that case we can not introducing that view. which is better? or we should
do both maybe that make sense still to have an Effect view? you should
research / analyze / review till you land on the best direction."

### I.1 The research verdict (web pass 2026-09-07)

- DaVinci Resolve Edit page: transitions are applied IN the edit timeline
  — "Open Effects > Toolbox > Video Transitions. Drag Cross Dissolve onto
  the edit point, or select the edit point and use the command for adding
  [the default transition]" (davinciresolveclub.com). Params — duration,
  alignment, style — are edited in the INSPECTOR ("Select the transition
  and adjust duration, alignment, and style in the Inspector"). There is
  NO dedicated transitions page in Resolve.
- Resolve's dedicated effects page is FUSION — node-based compositing VFX,
  explicitly NOT clip transitions ("If you only need simple subtitles or
  basic transitions, the Edit page is enough" — tourboxtech.com).
- FCP/Premiere: same shape — a transitions BROWSER panel + apply on the
  normal timeline (FCP: drag onto the cut, the transition renders as an
  object on the seam; double-click → inspector).
- Fade in/out in Resolve Edit: corner FADE HANDLES on the clip itself
  (not transition objects) — video clips fade opacity, audio clips fade
  audio. [research-informed]

**Synthesis:** the industry answer is *apply-on-the-edit-timeline from an
effects browser + inspector for params*. NO major NLE has the user's
"FX-only tool mode", and NO major NLE has a dedicated transitions page —
but our shell ALREADY has a page-per-workflow model the user likes
("just like color grade, audio"), and the user's pain is real (seam/fade
handles fight trim handles at 60px lanes; the user reiterated the view
request THREE times: #82 → #103/#104/#105).

### I.2 THE DECISION — both surfaces, ONE interaction engine

**D-A1 [user-directed + research-informed, the round's central ruling]:**
the FX surface ships BOTH, sharing one engine:

1. **The FX page** (`Page` gains `'fx'`; AppDock order Edit / Color /
   Audio / **FX** / Deliver): the dedicated workflow view —
   [user-directed, iterated 3×]. Composition:
   - left dock = **the FX browser** (EffectsPanel promoted: Effects /
     Video Transitions / Fades categories, the drag payload contract kept);
   - center = the **Viewer** (unchanged engine, shows the frame — honest
     mock: the transition itself is not rendered in the viewer);
   - right rail = the **FX inspector** (transition params: presentation /
     duration / alignment when a seam transition is selected; the clip's
     effect stack when a clip is selected — #105's "selecting the clip
     itself will just inspect Effects instead of Transitions");
   - timeline area = the **Timeline in FX mode** (see the engine) at
     normal lane heights, NOT TimelineCompact — seam hit-zones need real
     pixel geometry.
2. **The FX tool in Edit** (the "general tool mode" path): the
   TimelineToolbar's tool radio gains an **FX tool** (id `'fx'`, icon =
   the transition glyph). Activating it flips the SAME timeline into the
   engine's fx-mode; Escape or re-selecting another tool exits. No page
   switch — [user-directed, the exact quoted mechanism]. This is also the
   research-faithful quick path (Resolve's Ctrl+T / drag-onto-edit-point
   flows all happen in Edit).

**FX-page geometry (v2, pinned — R23-A finding 1):** mainbody default
**40%** on FX (same as Edit; the timeline row then gets ~320px at the
1280×800 floor vs ~336px needed by 4 default lanes + ruler — the same
honest 16px scroll tolerance the SHIPPED Edit page carries today).
NEVER the color-style 55% (that starves the normal-lane timeline by
136px). The fxMode single source of truth (v2, R23-A finding 4):
`setTool('fx') → fxMode=true`, any other tool → false; entering the fx
PAGE sets fxMode=true, leaving it resets to false (the audioLaneBoost
exit-law pattern). The existing Escape rung (`tool !== 'select' →
setTool('select')`) then exits the FX tool for free; the FX PAGE has no
Escape rung (a page, not a mode). Viewer overlay suppression under
`tool !== 'select'` (Viewer.tsx:197) applies to the FX tool exactly as
to blade/roll — intentional, registered.

**Why both:** the view gives the asset browser + inspector + room (the
deep workflow, the page-model consistency the user keeps reinforcing);
the tool gives the in-place quick edit (the Resolve-honest path). The
cost is low because the engine, the inspector domain, and the browser
are shared. [repo-precedent: the color page already demonstrates
page-aware rails/docks at zero extra composition cost]

### I.3 The engine — Timeline `fxMode` (one flag, three behaviors)

**D-A2:** `fxMode: boolean` store field (view state, not doc). While on:

1. **Clips recede** [user-directed: "locking / filtering out the normal
   timeline clips"]: clip bodies dim to 45% opacity, trim handles /
   drag-move / context menus OFF (pointer-events none on those hit
   zones), clip clicks select the clip → the FX inspector shows its
   effect stack (NOT its edit params). The lanes stay visible — you still
   see WHERE things are.
2. **Seam hit-zones** [user-directed: "when mouse is hovering between two
   clips (seam) we can allow transition to be added"]: for every adjacent
   pair (A.endTime === B.startTime, same track) a `shell-fx-seam` zone:
   default 12px wide centered on the cut (grows to 24px on hover);
   hover → the zone glows (`--transition-mark`) + a `+` affordance +
   tooltip "Click to add Cross Dissolve · drag a transition here";
   click → applies the DEFAULT transition (crossfade, 0.5s, centered) to
   A.transitionOut [repo-precedent: setTransition already exists]; if a
   transition already exists, the click SELECTS it instead (the object
   becomes the target).
3. **Head/tail zones** [user-directed #104/#105]: the FIRST element's
   in-edge and LAST element's out-edge per track get half-open zones
   (12px, one-sided): hover → a half fade-object preview; click → apply
   fade (see model below); existing fade object → selected.
4. **Objects are the edit targets (v2-scoped, R23-A finding 2):** the
   fade objects (`fade-object-el-X-in/out`) ALREADY ship selectable +
   edge-drag-trimmable + keyboard-operable under the R20-W5 grammar
   (role=slider, ±1 FRAME steps, ⇧ ×10 frames, Home/End, one
   commit per gesture — pinned at Clip.test:902–920). That grammar is
   ADOPTED UNCHANGED. The NEW work in this wave: (a) the transition
   boxes (Timeline.tsx:971–997 — inert today: title/aria only) become
   selectable + edge-drag-trimmable + keyboard-trimmable under the SAME
   frame-law grammar + Delete-removable; (b) the fade objects JOIN the
   fx selection domain (pointerdown additionally writes
   selectedFxObject; a selection ring when it matches); (c) video clips'
   new fadeIn/fadeOut objects render through the identical grammar. The
   "tools that work exclusively with effects and transitions" = the seam
   /head/tail zones + these objects, nothing else. [research-informed:
   Resolve trims transitions by edge-drag; params live in the inspector]

**Model deltas (D-A3, v2):**
- `ElementJSON` gains `fadeIn?: number; fadeOut?: number` — the
  domain-neutral clip fade (video = opacity ramp, audio = level ramp)
  [research-informed: Resolve's clip fade handles]. `audioFadeIn/Out`
  STAY for audio-clip audio fades [repo-precedent — seeded fixtures +
  mixer laws already read them]; the Clip fade-object renders
  `kind==='audio' ? audioFadeIn : fadeIn` (audio keeps its existing
  objects, video clips gain their own). The effective-fade writer is ONE
  seam: `setFade(elementId, side, seconds)` for BOTH domains (history-
  backed, store-owned clamp [0..clipDuration] — today only the gesture
  clamps). Fixture: main-track video clips (el-1..el-4) gain demo fades
  so the FX view paints objects on first paint (3 seam sites: el-1|el-2
  at 8.5s with the existing transitionOut, el-2|el-3 at 17.0, el-3|el-4
  at 24.0; head zone el-1@0, tail zone el-4@30).
- **`removeTransition(elementId)`** + `removeFade(elementId, side)` —
  NEW delete-aware actions (the `undefined → delete` grammar from
  insertPlan.ts:1173; setElementField's Object.assign can NOT unset —
  R23-B correction 1). Both clear a pointing selectedFxObject (the
  removeEffect belt-and-braces precedent). `setTransition` already
  exists and its `{}` default creates exactly D-A2's Cross Dissolve
  0.5s centered (verified, useUiStore:1963–1966).
- Transition presentations: **27** (not 30 — mockData's
  TRANSITION_PRESENTATIONS registry; 'Fade In'/'Fade Out' are already
  presentation NAMES — the Fades browser category must not conflate
  them with the clip fadeIn/fadeOut model fields).
- New selection domain `selectedFxObject: {kind: 'transition'|'fade',
  elementId, side?} | null` — the mutual-exclusivity law extends ALL
  SIX existing clear-sites (setSelection / selectElement / selectMarker
  / selectTrack / selectEffect / setActiveScene — the R20-W3 domain
  law) + both removes. The Delete-key rung (useShortcuts) checks it
  BEFORE the selection branch.

**D-A4 — where the inspector shows in tool mode:** the Edit page keeps
its right rail; when `selectedFxObject` is set the Inspector's top
section becomes the TRANSITION/Fade editor (the same component the FX
page mounts, embedded in a Group). Single-writer law: the FX page mounts
`FxInspector` as the rail; Edit embeds `FxInspectorSection`. Same
component, two homes [repo-precedent: ColorInspector vs
ColorInspectorRail was exactly the DUPLICATION that R22 killed — the
section is shared, only the frame differs].

### I.4 The FX browser (left dock, FX page)

**D-A5:** the promoted EffectsPanel (extracted to
`src/components/fx/FxBrowser.tsx`) — categories **Effects** (Gaussian
Blur, Motion Blur, Vignette, Glow, Chromatic Aberration), **Video
Transitions** (Cross Dissolve, Dip to Black, Wipe Left … the 27
presentations), **Fades** (Fade In / Fade Out presets at 0.5/1/2s).
- The drag payload contract is EXTENDED the legal way (type string +
  payload keys frozen): `application/x-nle-effect {name, cat}` gains cat
  values `'Transition'` (already exists) and `'Fade'`; the Clip drop
  parser (Clip.tsx:801–833) + the new seam-zone drop target accept them
  — a Fade row dropped on a clip body sets its fadeIn/fadeOut via
  setFade (NOT addEffectToElement — R23-B note 21).
- Click = honest fallback toast explaining the apply path (existing law).
- On the FX page this is the dock's ONLY content (no tab bar — #106's
  law, see Part IV). The Edit page's Effects TAB retires in this wave
  (the #86 ruling — AppShell.test:308 pins "the tab retires with the
  Effect view #82"; the Edit left dock becomes Media Pool ONLY).
- `EffectsSection` (Inspector.tsx:781, module-private today) is EXPORTED
  for the FxInspector's clip-mode (same component, two frames — the
  anti-duplication law).

### I.5 What explicitly does NOT ship in this round

- No viewer-side transition rendering (the canvas stays the honest mock;
  the transition inspector's numeric params are the truth) — registered
  honest boundary, stated in the README deviation row.
- No Fusion-style node graph for effects (the color page's node graph is
  a COLOR domain surface; conflating it with FX was the R22-era mistake).
- No transition curve editor / keyframes (duration + alignment only —
  the model's actual fields).

### I.6 Track A acceptance gates

1. FX page: AppDock 5 pages, ⌘5 binding (spec 16 free), composition
   per D-A2; story `Pages — FX` + `AppShell — FX page`.
2. Engine: seam zones appear ONLY in fxMode; hover glow + + affordance;
   click-applies-default / click-selects-existing (both pinned);
   head/tail half zones on first/last per track; edge-drag trim;
   keyboard trim; Delete removes.
3. Clip recede: dim + no trim/drag in fxMode (existing trim tests run
   with fxMode:false — regression law).
4. Inspector: transition selected → presentation/duration/alignment
   controls (all wired to setTransition); clip selected in FX view →
   effects stack (existing EffectsSection reused); fade selected →
   duration slider + remove.
5. Tool mode: FX tool in the radio group; Escape exits; the same seam
   interactions work on the Edit page timeline.
6. Suite: every gate has pins (component + store); expect +60–90 tests.

---

## Part II — the color view refinements (track B)

**D-B1 — the scopes console MOVES to the timeline-area console row, as
TABS (#90 + #95).** [user-directed, two issues converging]: the
ColorScopeStrip dies as an under-viewer strip; the new **ScopesDock**
(`src/components/pages/color/ScopesDock.tsx`) joins the timeline-area
console row (the row that already carries the MixerDock — "stacked next
to the multi-track just like where Mixer console is"), taking the F6
region slot [6] on color (single-writer preserved; NodeGraphDock's [6]
dies with it). The four scopes become TABS (Luma WFM / RGB Parade /
Vector / Histogram) — one scope renders at the panel's FULL size
("render normally instead of being squeezed"). Console geometry: width
= flex share of the timeline row (min 320px), height = the row's FULL
height via flex/min-h-0 (NEVER `%` — the R22 percentage-in-flex law).
The 4-state machine narrows to **off | open** (row/grid/collapsed all
die — they were the squeeze the user rejected; migration: any non-'off'
state → 'open'; `colorScopesLastVisual` REMOVED). The W4c simultaneity
law's reversal is registered in the README deviation ledger. The
gradedFrameBus is a module singleton (verified) — the dock moves
without breaking the subscribe; while the node graph owns the viewer
region the dock honestly draws the LAST published frame (registered
deviation). The 12 ColorScopeStrip tests + scope testids RE-HOME into
ScopesDock.test (never dropped — the R20-W6 law).

**D-B2 — the node graph takes the VIEWER WINDOW (#93).**
[user-directed, the user's own best candidate]: the Nodes toolbar toggle
(or the dock header's expand button) opens the node graph as a
**viewer-region surface** — the ColorNodeGraph canvas renders IN the
mainbody center (replacing the Viewer while open), with a header bar
carrying the target clip's name + an **× close** that restores the
viewer ("we can cross it out just like a normal asset preview … to exit
the node edit flow"). The timeline-area NodeGraphDock RETIRES (the
48%-width dock dies — "stacking next to multi-track is perhaps not a
great place as we need more space for it"); its `docked` prop dies.
ColorNodeGraph itself survives UNCHANGED (706×268 workspace,
overflow-auto — verified to fit a viewer-region width ≥ 700px and
scroll below). F6 region [6] is freed for the ScopesDock (D-B1).
- The "node graph as a saveable asset" question (#93's musing): the
  graph is per-CLIP doc state (nodes are the clip's grade pipeline) —
  NOT an independent asset in this round; "save as still/PowerGrade"
  covers the reuse story via D-B4. Registered as the honest answer.
- **C56 (node-graph binding beyond Primary/Secondary) is DE-SCOPED
  honestly** (v2, R23-A finding 8): the binding stays Primary/Secondary
  + qualifier; the nodes-in-viewer surface makes the future binding work
  visible, but no binding expansion ships this round. Standing gap
  stays registered in SPEC-REVISION-CANDIDATES.

**D-B3 — compact ↔ full timeline is a TOGGLE, everywhere (#94).**
[user-directed]: the TimelineToolbar gains a **density toggle**
(compact icon, data-tip "Compact strip (frozen) ↔ full tracks"). On the
color page the default is compact; on Edit/Audio the default is
full; **the toggle is available on every page** ("this super compact
mode we should allow to be used everywhere"). Store:
`timelineCompact: 'auto'|'on'|'off'` — 'auto' resolves per-page
(color=on, deliver=on per D-F1, else off); the user toggle overrides
for the session (resets on reload — view state, not a pref).
**The mainbody interaction law (v2, R23-A finding 11):** the color page
defaults to 55% mainbody ONLY while compact; flipping to full tracks on
color drops the default mainbody to 40% (the filmstrip needs the lane
room — 336px of lanes vs a 200px row at 55% would clip 60%). The
user-dragged mainBodyH always wins (the existing mainBodyUserSet law).
Trackhead in compact (#96): the badge cell becomes a real button —
click = select the track (the selectedTrackId domain, the TrackSheet
responds on Edit/FX/Audio; on COLOR the rail stays the grade surface —
the honest registered limit); title carries the track name; the 24px
lane keeps it icon-sized (honest scope: selection + name, no
mute/solo stack at 24px — registered).

**D-B4 — the Stills panel becomes the DaVinci Gallery (#97, #91).**
[research-informed + user-directed]: the left dock on the color page
shows **Stills ONLY** (the pool tab dies there — "this should be the
only tab in Media Bin"; the Toolbar2 left label names the content
correctly per Part IV). The panel re-models per the Resolve workflow:
- **What a still IS:** a captured graded frame of a timeline clip (its
  thumbnail + its grade) [research-informed: "Right click in the viewer,
  save still, open your gallery in the color page"]. The panel's rows
  become still CARDS: gradient thumbnail (the honest mock of the graded
  frame — the gradedFrame palette can tint it), grade name, node count
  chip.
- **What it applies to** (#97's direct question, answered IN the UI): a
  caption line "Applies to the selected clip's grade (clip level)" +
  the apply action applies to the CURRENT grade target (and a
  "Apply to selection" flow when multiple clips are selected —
  [research-informed: "select the clips you want changed, right click
  the still and apply grade"]). Track-level application is NOT offered
  (Resolve does not apply grades at track level either — selection
  sets only) — the honest answer is clip level, stated.
- **Save Still** button (from the current grade target — promotes the
  existing ⌥-click seam to a visible button); **delete**; the .drx/
  PowerGrade export button carries the honest toast (new affordance,
  registered boundary).
- **Store home (v2, R23-A finding 12):** `colorStills: Still[]` +
  `addColorStill` / `removeColorStill` (view-state, never snapshotted —
  the sourceRanges precedent) so saved stills survive page/tab unmounts;
  apply stays the `rec.setGrade` → mockGrades seam (store-backed,
  verified).

**D-B5 — the Mixer toggle is HIDDEN on the color page (#92), shown on
Edit + Audio ONLY (v2 ruling: D-D2's matrix wins — the FX page is the
FX domain, not audio; deliver owns its own layout).**
[user-directed]: Toolbar2 renders the Mixer console toggle on Edit /
Audio only — not color, not deliver, not FX. #92 SUPERSEDES #73's
R22-era "mixer renders on ALL pages" for the color page (the
supersession is registered in the README deviation ledger). Store: on
entering color, mixerState → 'collapsed' (page-aware exit, like
audioLaneBoost's exit law); the Edit-page toggle re-opens it.

**Track B acceptance gates:** ScopesDock tabs (4 tabs, full-size canvas,
one-scope-at-a-time law pinned); nodes-in-viewer (open/close/×, F6
region freed, the timeline-area dock gone); density toggle (per-page
default + user override + compact-on-edit reachable); stills cards
(apply-to-target pinned at store level — the mockGrades seam; save
still round-trip); mixer hidden on color (aria + DOM absence pins);
every deleted surface's tests re-homed (see the test impact table in
Part VII).

---

## Part III — mixer / inspector polish (track C)

**D-C1 — ChannelEditor param-grid polish (#98):** the current
Gain-dialer + empty pan/pitch cells layout becomes a uniform param ROW
grammar: every param row = label + control (dialer for fine values,
slider for wide ranges) + readout; sections with zero real params for
the target are HIDDEN (no empty holes). The EQ section's 4 bands and the
FX section keep the W2 rows. [user-directed "major polishing round"]

**D-C2 — the channel-selected law (#99, v2-corrected):** the channel
focus mechanism is **`stripFocus`** (useUiStore:524, the mixer strip
domain — not selectedTrackId). When a strip is focused AND no clip is
selected, the right rail shows the CHANNEL editor content — never a
"clip not selected" complaint. The routing change: AppShell's
`rightPanel` chain gains a branch (audio-kind track focused + no clip
selection → ChannelEditor content) that applies on ANY page, not just
audio. Selection priority: clip selection (the edit domain) > strip
focus > page default. The "empty" state only appears when NEITHER is
live, and it becomes the honest onboarding line ("Select a clip or
focus a channel") — the no-clip state (ChannelEditor.tsx:182–186, the
#99 pin) dies. [user-directed verbatim]
- **The full inspector audit (#99's directive)** rides Part VII's
  component-by-component review — the Inspector family (Inspector /
  ColorInspector / ChannelEditor / MarkerInspector / CaptionInspector /
  FxInspector) gets ONE dedicated audit agent with the state-priority
  matrix as the rubric.

**D-C3 — master/bus separate minimize (#70):** the FullDock's master
column + bus row gain their own collapse (meters-only) toggle,
independent of the channel strips. [user-directed R20-era]

---

## Part IV — shell / toolbar semantics (track D)

**D-D1 — the left toggle's label = the dock's actual content per page
(#100 + #106 + #91, v2):** a single **`leftDockContent(page)`** table
becomes the one source: Edit = "Media Pool" (**pool only — the Effects
TAB retires in Wave A per the #86 ruling; AppShell.test:308 already
pins the retirement**), Color = "Stills" (stills only), Audio = "Sound
Library", FX = "Effects" (the fx browser only), Deliver = **the toggle
is HIDDEN** (DOM-absent — the deliver mainbody is DeliverPage's own
3-region layout with its own presets rail; a toolbar toggle there would
be the lying control #100 flags). The Toolbar2 button label + icon
follow the table; the LeftDock renders exactly that content (no tab bar
when single-content — #106's "this tab is unnecessary if you name things
correctly"). [user-directed ×3 issues converging on one law]

**D-D2 — TimelineToolbar content per page (#108, the researched
matrix):** [research-informed — Resolve's pages carry different
toolbars: Color has NO timeline toolbar (the filmstrip replaces it),
Deliver has none, Cut/Edit carry the editing tools]. Our matrix:

| cluster | Edit | Color | Audio | FX | Deliver |
|---|---|---|---|---|---|
| edit tools radio | ✔ (+ FX tool) | — | — | — | — |
| snap/link/lock | ✔ | — | snap | — | — |
| markers | ✔ | — | — | — | — |
| density toggle | ✔ | ✔ | ✔ | ✗ (R23-FIX R-b: the FX page forces the full Timeline — D-A1/ruling 8) | ✔ |
| zoom cluster | ✔ | ✔ | ✔ | ✔ | ✔ (read-mostly) |
| mixer state | ✔ | — | ✔ | — | — |
| master audio | ✔ | — | ✔ | — | — |
| FX tool exit (Esc hint) | tip-only | — | — | — | — |

(v2 wrap note: the draft "FX tool exit (Esc hint)" row is DEAD as a page
cluster — Part IX ruling 2 wins (the FX page has no Escape rung; a
page-level Esc hint would advertise a nonexistent exit; the Edit-page FX
tool's tip carries the real hint). W-D's three registered P3s for the
Part VII sweep: markers addable on audio via M with no toolbar control;
the view-options button not matrix-governed (kept on all pages); the
vsep-only-between-present-clusters law.)

The toolbar becomes `clusters={page}`-driven; every hidden cluster is
DOM-absent (not display:none) — the F6/rover laws stay dense. [The
matrix is a design first-pass — the Part VII review agent re-audits it
against the pages' real needs.]

---

## Part V — timeline visuals (track E)

**D-E1 — brackets thinner (#101):** the ruler trim brackets
(shell-ruler-br*) drop to a 1px stem + 40%-lighter fill; the drag
hit-zone (12px) stays — visual weight down, target size unchanged
(the house grammar: hit target ≠ visual size).

**D-E2 — the hover-preview visibility law (#102):** when an insert-mode
button (SourceEditBar) is hovered/dwelled and the preview computation
succeeds, the timeline (a) **auto-scrolls** the preview span into view
(scrollIntoView({inline:'nearest'}) on the insert-preview layer's span,
rAF after paint), (b) if the span is < 24px at current zoom, bumps zoom
to make it ≥ 24px (via the zoom bus — the honest "it should scroll /
zoom so the actual place being applied are visible"), (c) the preview
carries a **mode badge** (the mode's name at the ghost's head — "when
hovering these, it should clearly show me the edit mode too"). The
refusal path (ok:false) gets the same scroll-to-playhead treatment so
the refusal is legible in place. The W3 fade+slide animation stays.

---

## Part VI — the deliver view (track F)

**D-F1 — compact timeline + budget rebalance (#107, v2):**
[user-directed]: the deliver page mounts **TimelineCompact** (via
D-B3's 'auto' → on) in the timeline area; the timeline block's height
default shrinks (page-aware: mainBodyH auto → 50% on deliver, was 40% —
"the shorter timeline area can leave more room for export settings
too"); the **range selection strip stays NORMAL height** above the
compact lanes: a **32px interactive in/out range band** (the export
range = the loop in/out seam it already drives — verified), full-height
hit zones with the bracket grammar (Ruler's clamped in/out handles +
the in≤end ordering law cloned verbatim — the loop-write triple-source
risk is pinned at store level), NOT the 22px compact ruler ("just the
head range selection should be normal height as that's an important
part to work with"). The compact ruler row is REMOVED on deliver (the
range band replaces it).

---

## Part VII — the VLM visual net + the component review program

**D-G1 — the VLM harness (the round's standing instrument):** a script
suite under `scripts/` (repo, not runtime tree):
1. `vlm-capture.mjs` — walks Storybook's `/index.json` (the live
   server), snapshots every story in the registered order
   (Primitives → panels → full shell pages) via agent-browser at the
   registered floor (1280×800) AND 1920×1080; forces the iframe-chain
   width law (SKILL #92-e).
2. `vlm-review.mjs` — feeds each PNG to the VLM (z-ai SDK, in node —
   backend-only law) with a per-story RUBRIC prompt (the story's
   expected surfaces + the "spot issues" checklist: clipped text,
   overlapping elements, dead-looking controls, misaligned rows,
   contrast failures) → JSON findings (severity, element, description).
3. Findings land in `r23-analysis/vlm-findings.json` → the review
   agents' input queue.
[The harness is used by every track for its own live verification, then
by the Part VII sweep.]

**D-G2 — the component-by-component review program:** after the tracks
land, ONE agent per component family (fresh context, self-contained
prompt: the component file + its test + its stories + the VLM findings
for those stories + the issue corpus): Primitives → Chrome (Toolbar2 /
StatusStrip / AppDock / splitters) → panels (Inspector family / LeftDock
family / MediaPool / SoundLibrary / deliver panels) → timeline family
(Ruler / Clip / TrackHeader / TimelineToolbar / Timeline /
TimelineCompact / SceneTabs) → mixer family → color family → the whole
AppShell pages. Each agent returns a findings ledger (P1/P2/P3) → fix
rounds till clean. This is the user's "thorough code / ux review one ui
component at a time".

---

## Part VIII — process, waves, gates

- **Wave order:** A (the FX surface — the flagship, biggest) → B (color)
  → C+D+E+F batch (smaller, one agent each, parallelizable after B) →
  G (VLM harness can land EARLY, ∥ wave A — it only needs the live
  server) → the Part VII sweep.
- **Every wave:** implement agent (self-contained prompt: this doc's
  relevant part + the file map + the test laws) → fresh-context review
  agent → fix round → MY gates (tsc, full suite, build) → commit + push
  (merge-first; NEVER force) → runtime rsync + live visual verify.
- **Test strategy:** expect the suite to grow ~150–220 pins net; the
  deleted-surface tests (ColorScopeStrip 4-state, NodeGraphDock, the
  under-viewer scopes stories) must be RE-HOMED (the dock/tabs/panels
  they become), never silently dropped (the R20-W6 lesson).
- **The thread-resolution round** at the end: all 19 + #70 resolved
  with fix evidence + live story links; the GH mirror closes.

---

## Part IX — the v2 amendment log (the audit rulings, binding)

1. FX-page mainbody default **40%** (R23-A B1) — never 55%.
2. fxMode single source: `setTool` coupling + fx-page enter/exit; the
   existing Escape rung exits the tool; no FX-page Escape rung (B4).
3. Fade-object grammar ADOPTED as shipped (±1 frame, role=slider, one
   commit/gesture); new object work = the transition boxes only (B2).
4. Edit-page Effects TAB retires with Wave A (#86; AppShell.test:308
   already pins it) (B3).
5. `removeTransition` + `removeFade` are required model deltas
   (delete-aware, domain-clearing) (R23-B C1).
6. 27 transition presentations, not 30; 'Fade In/Out' presentations ≠
   the fadeIn/fadeOut clip fields (R23-B C2).
7. `selectedFxObject` joins the 6-site mutual-exclusivity law + both
   removes + scene switch (R23-A C6).
8. TimelineCompact's `seamMode` stub + comment RETIRE (the FX timeline
   is the full Timeline) (R23-B C8).
9. C56 de-scoped honestly (standing gap) (R23-A C8).
10. D-C2's mechanism = `stripFocus`; the rightPanel branch applies on
    any page (R23-A C9).
11. The color-full-tracks interaction law: compact 55% ↔ full 40%
    mainbody (R23-A C11).
12. Stills store home: `colorStills` view-state array (R23-A C12).
13. colorScopesState migration: any non-'off' → 'open';
    `colorScopesLastVisual` removed; the W4c reversal + #92-supersedes-
    #73 registered in the README deviation ledger (R23-A C13).
14. The scopes' stale-frame honesty while nodes own the viewer —
    registered deviation (R23-A C14).
15. Mixer toggle: Edit + Audio only (D-D2 wins over D-B5's draft; FX
    excluded) (R23-B C4).
16. Deliver: the Toolbar2 left toggle is HIDDEN (no lying control);
    deliver owns its presets rail (R23-A C17).
17. The FX tool suppresses viewer overlays via the existing
    `tool !== 'select'` law — intentional, registered (R23-A C4).
18. spec-16's ⌘3 "Effects workspace" row + spec-18's page-count law:
    reconciliation rows appended to SPEC-REVISION-CANDIDATES at wrap
    (the mock's ⌘3=Deliver predates; FX takes ⌘5) (R23-A C15).
19. #96's "move" read as trackhead selection + name (the honest scope);
    if the user meant reordering, it is a follow-up (R23-A C16).
20. #102's "no animated effects" root cause = offscreen preview span;
    D-E2's auto-scroll/zoom is the fix for both clauses (R23-A C10).
21. The drag-law freeze: all new drag gestures (transition trim, range
    band) clone the fade-object/bracket clamp-commit grammar — no
    preview/escape machinery (R23-B R5).
22. The FX-page Delete rung: selectedFxObject first, then the existing
    selection branch (R23-B A9).

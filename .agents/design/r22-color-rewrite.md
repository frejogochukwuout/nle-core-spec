# DESIGN-R22 — The Color View Rewrite + All-View Revision Round

**Written:** 2026-09-07, R22 session start (variants stream).
**Trigger:** the user's verdict — "the color grade view is a disaster. it deviated
severely... no one has the memory of the original reference under ui-mock/ and no
one bothered to look. the whole layout is a mess. need to completely rewrite."
+ 19 fresh annotakit issues (#71–#89, 2026-09-06 21:42–22:10Z, post-R20).

**Reference canon (read in full this session, by the orchestrator):**
- `ui-mock/davinci_resolve_ui_mock.html` — the shell: menubar 30 / toolbar2 34 /
  mainbody 460 (viewer flex + inspector 420 fixed) / timeline-tabs 26 / page-dock.
- `ui-mock/resolvecolorwheels_html.html` — the Primaries panel: 980px; header 36
  (title + target/sliders/LOG icons); top controls 48 (Temp/Tint/Contrast/Pivot/
  Mid-Detail, 48px inputs + 2px gradient color-bars + 4px mini-sliders); wheels
  grid-cols-4 (150px ring, 124px conic disc, ring value-arc + trackball knob,
  4×38px YRGB inputs w/ color bars, 12px knurled thumbwheel); bottom 48 (Color
  Boost/Shadows/Highlights/Saturation/Hue/Lum Mix).
- `ui-mock/color_grading_scopes.html` — the Scopes window: 36px window bar; 2×2
  quadrant grid (Parade/Waveform/Vectorscope/Histogram), 32px headers, gold
  #c29d38 graticule text, grid #3a2e12.
- `ui-mock/color_grading_node_graph.html` — 38px toolbar (arrow/hand, page dots,
  clip dropdown); 64px grid workspace; nodes = title-above + 106×60 thumb + 24px
  footer (num + icons); 7px ports; SVG edge layer; red #ff3b30 selected border.
- `ui-mock/qualifier_ui.html` — Qualifier window: top header + secondary toolbar
  (eyedropper +/-/_ , feather, invert); left HSL controls (hue/sat/lum gradient
  bars with masks + 12px handles); right 320px matte finesse.

**What R20 actually got wrong (the diagnosis; audited R22-A/R22-B):** the
PANELS are reference-faithful (W4b/W4c: WheelsPanel/CurvesPanel/QualifierPanel/
ColorNodeGraph/ColorScopeStrip all follow the reference anatomy, and the math
is REAL — spec-08 pipeline, scopes from actual pixels, #76 praised it). The
COMPOSITION invented a layout that exists in NO reference and starves the
viewer (auditor's measurement: ColorScopeStrip = 26px header + 2×160px panels
≈ 348px inside a 320px-tall mainbody):
- ColorNodeGraph REPLACED the Media Pool in the left dock (#77: "taking space of
  Media Pool it makes zero sense");
- ColorScopeStrip (2×2 grid, ~300px) sat PERMANENTLY under the viewer inside a
  320px-tall mainbody → viewer pushed to a thin line (#77: "Viewer is NOT
  visible");
- ColorConsole REPLACED the timeline with a grading surface (#78/#79: "why do we
  need a color console? ... just multi-tabbing ... under this one inspector
  panel");
- ColorInspectorRail duplicated the grading surface in the right rail (two
  surfaces editing the same grade — the user: "we completely deviated from the
  DOM snapshot, and made things worse too").

---

## Part I — the color view rewrite (W0, the flagship)

### D1 — The composition law (user-directed architecture)

```
mainbody (color page, default height ≈55% — D8):
┌──────────────┬──────────────────────────────────┬─────────────────┐
│ LeftDock     │  Viewer (GradedViewerCanvas)     │ ColorInspector  │
│ Pool | Stills│  BIG — flex-1, the dominant      │ tabs:           │
│ (media pool  │  surface, never starved           │ Primaries |     │
│ STAYS #77)   ├──────────────────────────────────┤ Curves |         │
│              │  ScopesDock (console strip)       │ Qualifier       │
│              │  default OFF = NOT RENDERED       │ (the ONE grading│
│              │  (the mixer's collapsed law)      │  surface, #79)  │
└──────────────┴──────────────────────────────────┴─────────────────┘
timeline area (color page):
┌─────────────────────────────────┬──────────────────────┐
│ TimelineCompact (the #75        │ NodeGraphDock        │
│ generalized compact strip —     │ (console, toggleable │
│ V/A/T color coded, frozen,      │ like the mixer;      │
│ click = grade target)           │ default OFF, #78)    │
└─────────────────────────────────┴──────────────────────┘
```

Provenance labels (the user's core complaint was UNACKNOWLEDGED deviation —
every element declares its origin):
- [reference-faithful] inspector rail 420px on color (davinci mock
  #inspector-panel); the viewer-centered mainbody; the wheels/curves/
  qualifier/scopes/node panels (already reference-faithful, unchanged).
- [repo-precedent] the timeline-area console docks (the mixer's exact
  mechanism); the LeftDock; the compact text tab bar (W2/W3 grammar).
- [user-directed invention] ScopesDock under the viewer (#77's own words
  "below it ... minimized and toggled"); Stills tab (#82); TimelineCompact
  replacing the full timeline on color (#75's praise of the LaneStrip).

Rationale, traced to the user's exact words (each clause mapped; #82 is
quoted IN FULL and reconciled):
- #82 full sentence: "...this view can combine with Effects (so the Effects
  tab next to Media Pool should go away now and should show by default under
  this Effect view just effects assets, just like under Audio view for sound
  library, and under Color Grading view for color grading assets / node graph
  etc.)" — the "/ node graph etc." parenthetical invites the node graph into
  the color left dock; #77 (21:52, LATER ordering not decisive but the
  specific complaint) rejects it there ("taking space of Media Pool ... makes
  zero sense"); #78 (21:54, the tiebreaker with the architecture directive)
  rules: "node editor ... toggled just like mixer console." RECONCILIATION:
  #77+#78 override #82's parenthetical — the node graph is a console, the
  left dock stays media (Pool|Stills); registered as a deviation row.
- #77 "the node on the left to this viewer is taking space of Media Pool it
  makes zero sense" → Media Pool RETURNS to the left dock on the color page
  (with a Stills tab = the color assets, #82's "under Color Grading view for
  color grading assets"). The node graph LEAVES the mainbody entirely.
- #77 "Viewer is NOT visible it is pushed to be a thin line" → the viewer is
  the center's flex-1 with nothing permanently beneath it; the scopes console
  is OFF by default ("shouldn't always be there" — and the MIXER's own
  collapsed law is NOT-rendered, per MixerDock.tsx:7-9; the v1 draft's
  "collapsed 26px row default" mis-cited that precedent — v2 fixes it to the
  real mixer law) and bounded when expanded (D3).
- #78 "it could have been just multi-tabbing with wheel vs other things all
  under this one inspector panel" → the right rail = ColorInspector with
  [Primaries|Curves|Qualifier] text tabs (the timeline_edit_modes tab-nav
  grammar the user already approved on the source bar). ColorConsole is
  DELETED; its node chip + Clip⇄Timeline grade-target toggle migrate to the
  inspector header (D2).
- #78 "what falls out of this inspector panel should be things that are global
  or require a separate view (like node editor, etc.) which should also be
  toggled just like mixer console" → NodeGraphDock = a timeline-area side dock
  (the exact mixer-console mechanism: Toolbar2 toggle + docked + F6 region
  parity), default OFF.
- #73 "for panels that are togglable, mixer console as an example, these can be
  toggled from here, just like the left side" → Toolbar2 right side carries the
  console toggles (see D5).

F6 REGION LAW (the v1 gap — two docks on color would both write regionsRef[6]):
AppShell's regions get an 8th slot: [6] = the FIRST visible timeline-area
console (nodes dock on color; mixer on other pages), [7] = the SECOND when
both are visible. Single-writer per index, deepest-match F6 law unchanged;
the both-open cycle is pinned in AppShell.test.

### D2 — ColorInspector (the right rail, the ONE grading surface)

- The W3 inspector grammar header (type-driven: clip name + kind + duration —
  NOT tall-icon tabs), then a 26px compact text tab bar (tablist + arrow
  roving, aria-selected; the W2 tab-nav grammar), then the active panel.
- TWO compact rows in the header zone (the v1 one-row cram doesn't fit at
  420px): row 1 = tabs; row 2 = the context chips (node chip + Clip⇄Timeline
  grade-target toggle + target label, truncating label).
- **Color-page inspector default width = 420px** (the davinci mock's
  #inspector-panel width, inside the 280–560 clamp), gated by a
  `inspectorWUserSet` flag (same law as D8: user drag always wins and
  persists). The "4-across above 560px" idea is DROPPED (dead spec — the
  clamp max is 560 and 4 columns need ~640px).
- Panels = the EXISTING WheelsPanel / CurvesPanel / QualifierPanel (store-
  driven, reference-faithful — kept, adapted to rail width):
  - WheelsPanel: 2×2 grid below ~560px column width (the 980px reference is
    a wide-panel anatomy; in the 420px rail it stacks 2×2 and scrolls, each
    wheel column keeping the reference geometry: 150px ring, 124px disc,
    4×38px YRGB + 12px thumbwheel).
  - QualifierPanel: the reference is ~1050px wide with a 320px right matte-
    finesse column (qualifier_ui.html); in the rail the matte-finesse column
    STACKS BELOW the HSL controls (registered adaptation — same content,
    vertical order, honest note in README).
  - The inspector rail keeps internal scroll (registered floor: 1280×800).
- Grade-target domain (the old console's law): the Clip⇄Timeline toggle + the
  target label sit in the context row (right-aligned, the compact chip
  grammar). Single-owner law unchanged: the timeline grade's only editor
  is the inspector's timeline-target mode.
- Node chip (C56): lives in the context row; selecting a node in the
  NodeGraphDock routes the inspector tab (setColorNode → colorInspectorTab).

### D3 — ScopesDock (the console under the viewer)

- States in `panels.scopes: 'off' | 'collapsed' | 'row' | 'grid'` (store;
  dedicated `setScopesState` setter — togglePanel is boolean-keyed and cannot
  carry the tri+):
  - off = NOT rendered (the mixer's collapsed law verbatim; DEFAULT — the
    user's "shouldn't always be there" + #77);
  - collapsed = 26px header row only (the minimize state; the dock remembers
    its last visual mode row/grid and restores on expand);
  - row = one horizontal band of the scopes, ~130px total (the compact
    reading);
  - grid = the reference's 2×2 quadrant (Parade/Waveform/Vectorscope/
    Histogram), height = max(240px, 45% of mainbody) — the v1 200px cap
    produced ~30px canvases at the 1280×800 floor (auditor's arithmetic);
    240px floor gives ~75px canvases at the floor and honest sizes above.
- The dock header adopts the REFERENCE's window-bar anatomy (36px in the
  reference; ours 26px to match the shell bars): title "Scopes" + the layout
  toggle icons (the reference's row/maximize/2×2-grid window icons are
  literally layout toggles — color_grading_scopes.html:163-169) + a minimize
  chevron (aria-expanded).
- Toolbar2 "Scopes" button: aria-pressed when state ≠ 'off'; click =
  off ↔ last-visual-state (default grid).
- The scopes internals are UNCHANGED (W4c: real traces from gradedFrameBus —
  #76's praise must survive; the canvas grid + graticule stay the reference's).
- Registered adaptation: at sub-100px cell heights the per-cell 32px headers
  shrink to 22px (labels overlay the canvas) so the grid stays readable at
  the floor; README deviation row.

### D4 — NodeGraphDock (the console beside the compact timeline)

- `panels.nodes: boolean` (store, default false — "require a separate view ...
  toggled just like mixer console").
- Docks in the timeline area's right side (mixer precedent), width ~48% of the
  timeline area (min 420px), height = the timeline area's full height.
- Content = the existing ColorNodeGraph workspace. **Fit law (v1's numbers
  were wrong — the reference workspace is ~1010×250, nodes at x≥670):** the
  dock clips (overflow-hidden — the #74 fix) and the workspace inside is
  SCROLLABLE (overflow-auto) at its natural size; the reference's own hand
  tool + scrollbars pan. Registered: at the 1280×800 floor the dock shows a
  pannable viewport, not the whole chain (honest, no penetration, no
  invisible clipping). ColorNodeGraph's min-w-[640px] relaxes (dock owns
  width).
- The F6 region law: see D1's amendment — [6]/[7] single-writer indices.

### D5 — Toolbar2 (all pages, the toggle home — #73/#80/#86/#87)

```
left:  [Media Pool]  (label per page: Edit/Color→"Media Pool" (LeftDock Pool|Stills),
                       Audio→"Sound Library" per #82's parallel; Effect→"Effects")
center: project title (unchanged)
right: [Scopes ·color] [Nodes ·color] [Mixer] [Inspector]
```
- The Effects BUTTON is REMOVED in W0/W1 (#86: "this should go away", pinned
  on shell-toolbar-btn-effects — unambiguous).
- The LeftDock's Effects TAB is retired **in the same wave as W6** (the FX
  view, its replacement home per #82) — if W6 spills to R23 the tab stays with
  an honest label (sequencing fix from the audit; no orphaned asset home).
  `panels.effects` store field: stays dead-but-harmless with a README row.
- The Project button is REMOVED (#87). The fix note answers the user's
  question HONESTLY: the button WAS functional (a read-only ProjectSheet stub
  — inspectorProjectMode) but read as non-functional; it yields its slot to
  the console toggles. inspectorProjectMode stays in the store (unreachable
  from chrome; README deviation row; Toolbar2.test + AppShell.test pins flip
  to "button absent").
- The Mixer toggle joins Toolbar2 (right side, ALL pages — #73 asks for it on
  color view). It reflects the real mixerState (aria-pressed =
  mixerState !== 'collapsed'), click cycles collapsed→meters→full (the B4
  grammar). On the color page at 55% mainbody the timeline row can be < the
  mixer's 280px FLOOR → the auto-degrade (meters + one honest toast) fires —
  registered, that IS the honest behavior (the user can drag the HSplitter).
- Left button semantics per page: on color view the SAME button toggles the
  media pool dock (with the Stills tab inside); on audio it gates the Sound
  Library (today the "Media Pool" label LIES there — #80's real fix).
- spec 18 §8 chrome-removal ledger row amended (the mixer re-addition
  overturns the old ledger entry — cite #73 as the user directive).

### D6 — TimelineCompact (the generalized compact timeline, #75)

- Extracted from ColorConsole's LaneStrip into
  `src/components/timeline/TimelineCompact.tsx` (generalizable per the user:
  "this is a timeline style that can be generalized").
- Anatomy: 22px ruler (read-only + playhead marker) + per-kind lanes (video 24
  / audio 16 / caption 20, dimmed audio) + 30px badges column + click-to-
  target clips (frozen: no trim/drag/resize handles ever).
- **V/A/T color coding (#75):** video clips = `var(--clip-video)`, audio =
  `var(--clip-audio-a)`, text/caption = `var(--clip-text)` — the EXISTING
  reference-derived tokens (tokens.css:75-83, the davinci mock's own clip
  colors, theme-variant-aware) — applied to the clip border + tint + badge so
  the strip reads at 24px lane height (the current all-grey #2a2b31 dies; no
  invented hexes, no scopes-gold reuse).
- The color page mounts it where Timeline sits (frozen, click = grade target
  + selection); the future Effect/transition view (#82) reuses it (frozen
  tracks, hoverable seams — the component takes a `seamMode` prop stub).

### D7 — Stills tab (the color assets, #82)

- LeftDock on the color page: [Pool | Stills] tabs.
- Stills = a grid of stills ({mediaId, GradeParams snapshot} fixtures in the
  store sidecar — there is NO mockGrades.ts file; the sidecar lives inside
  useUiStore.ts:87-153): click = apply that grade to the CURRENT target via
  setGrade (ONE history entry — the D3 commit law); alt/⌥-click on a targeted
  clip = save a new still (real: reads the target's current GradeParams into
  the stills list). Honest boundary: stills are clip-level presets, not
  node-graph snapshots (data-tip says so; registered gap C59).

### D8 — mainbody height law on the color page

- The color page needs a taller mainbody (the timeline area only carries the
  compact strip): when entering the color page, if the user has never dragged
  the HSplitter (a `mainBodyUserSet` flag), the default becomes 55% (others
  40%). The user's drag always wins and persists across page flips. Read-
  time computation in AppShell (no write-on-navigate side effect); the
  HSplitter's `window.innerHeight * 0.4` fallback becomes page-aware.

### D9 — What gets DELETED (the cleanup the user demanded)

- `ColorConsole.tsx` (+test, 14 cases) — superseded by ColorInspector +
  TimelineCompact.
- `ColorInspectorRail.tsx` — superseded by ColorInspector.
- `ColorPage.tsx` re-export surface + `ColorPage.test.tsx` (rail describe
  retargets `shell-color-inspector*`; the 28 panel-level cases survive —
  they mount the panels solo and are store-driven).
- Store rename `colorConsoleTab` → `colorInspectorTab` (+setter) — consumers:
  ColorNodeGraph.tsx:275/286, ColorConsole.test (deleted), ColorPage.test,
  mockGrades.test, Color.stories (4 seeds).
- Story seam: `Color.stories.tsx` imports ColorConsole (6 stories) +
  ColorInspectorRail (2) + boots colorConsoleTab — rewritten to mount
  ColorInspector/ScopesDock/NodeGraphDock/TimelineCompact.
- Test sweep (R22-B's table): AppShell.test (composition block :152, mixer-
  exclusion pin :174 INVERTS, F6 :448-470, project :255), Toolbar2.test
  (project :62, rovers :104-142), useUiStore.test (defaults +
  mainBodyUserSet + scopes/nodes setters), ColorScopeStrip.test
  (mount/collapse → store-driven), LeftDock.test (stays — effects tab
  retires with W6).
- The runtime tree's orphan WIP files (ColorRailPanel.tsx, ColorScopesDock.tsx,
  scopeTraces.ts, EditOverlay.tsx×2) — never-referenced R20 WIP, deleted in the
  runtime sync (not in the spec repo).

---

## Part II — the other-view waves

### W2 — mixer (#71/#72/#81/#75-color-coding-sweep)
- #71: the dock's horizontal scroll extent must END at the last strip's right
  edge + 8px pad (measure the content width exactly; no phantom gap) — a
  geometry test pins scrollWidth == sum(strip widths) + pads.
- #72: bus/master strips get the SAME tier stack as channel strips (identical
  section tops; only the absent sections differ — fader/meter rows align
  across all strips). The dial+meter lengths unify.
- #81: ChannelEditor gains EQ / FX sections (per-track inserts from the mixer
  sidecar: the two insert slots render as EQ/FX rows, honest-seam mock values
  bound to mixer.tracks[trackId].inserts).

### W3 — insert modes (#83) — CORRECTED (the v1 list was wrong)
- The reference defines SIX modes: Insert / Overwrite / Replace / Append at
  End / Ripple Overwrite / Fit to Fill (tab-nav :403-409, 44×44 header SVGs).
  There is NO "split" insert mode (v1 invented it) — our 7th, placeOnTop,
  comes from nle_edit_workflow.html §3.4.
- The icons are ALREADY extracted verbatim (src/components/timeline/
  editModeIcons.tsx, R20-W2, recolored to tokens). The user's "you only
  showed two buttons" is the 560px collapse hiding 5 modes in a kebab
  (SourceEditBar.tsx:26-27) — FIX: all 7 mode buttons always visible (wrap or
  lower threshold), the kebab carries only non-mode actions.
- Hover preview animation (the real #83 work): adopt the REFERENCE's own
  timing — fadeIn 0.3s ease-in-out + translateY 4px (timeline_edit_modes CSS)
  on the existing insert-preview-layer (Timeline.tsx:1041-1194) + speed badge;
  fades OUT on leave (never instant); the 1.2s pulse loop is an adaptation
  (registered); prefers-reduced-motion honored (app.css:62 + an override in
  the new CSS block).

### W4 — source trim (#84/#85)
- The SOURCE viewer gains the in/out range bar under the preview (dual handles
  + the ranged scrub region; drag handles trim the range; keyboard gated by
  `viewerMode === 'source'` — the `,/.` source-gate precedent — because ⌥[/⌥]
  are ALREADY ripple trim-to-playhead, useShortcuts.ts:330-339). The range
  bar replaces the static 12px source scrub band (Viewer.tsx:432-443).
- NEW SEAM (v1 wrongly claimed it exists): `InsertPlanContext` gains
  `sourceRange?: {start, end}` — placed elements get `dur = end−start`,
  `sourceStart = start` (today sourceStart:0 is hardcoded, dur =
  min(m.duration, 30)); fitToFill's srcDur = the range length; default (no
  range) = today's behavior (backward-compat pin). Drag law: one-clamp-home /
  preview==commit (one history entry per gesture).
- The source transport row gains trim controls ([set-in] [set-out] [clear]) —
  the "play control as well as trim edit controls" the user asked for.

### W5 — deliver (#88/#89) — structural ruling (v1 underspecified)
- The deliver page rejoins the STANDARD mainbody 3-region wiring (today
  `page === 'deliver'` replaces the entire mainbody — AppShell.tsx:247-250,
  which is why there is no preview and no inspector):
  - left dock = presets ONLY (#89: "presets are okay");
  - center = the program Viewer (read-only) when idle, the render QUEUE when
    a render is active (#89: "the center view may be better for these queues
    replacing the video preview when rendering is happening") — render-active
    = any job running/queued (DeliverPage's local jobs state lifts to the
    store);
  - right rail = DeliverInspector (export settings + the selected job's
    metadata — #88: "put those in inspector"); the settings form folds into
    the rail (420px budget, same compact grammar).
- Registered boundary: the render itself stays the honest mock (progress
  rows, no fake video encode).

### W6 — the Effect / transition view (#82) — the biggest, may spill to R23
- New page "FX" in the AppDock (Edit/Color/Audio/FX/Deliver). Timeline area =
  TimelineCompact in seamMode: tracks frozen; seams (between two clips on a
  track) highlight on hover → click applies a transition object; head/tail (no
  neighbor) → fade objects. Transition objects selectable → inspector becomes
  the transition-effect inspector (kind, duration, symmetric/asymmetric). Left
  dock = effects assets. Scope honestly: this is a NEW page (interaction
  model + inspector domain + left dock) — if context runs short, HANDOFF it
  with this design as the map.

---

## Part III — process

- Test strategy: every wave lands with its pins (component + store level);
  the suite currently 1334 — expect net-positive (ColorConsole.test →
  ColorInspector.test + TimelineCompact.test; new ScopesDock/NodeGraphDock/
  Toolbar2 pins; mixer geometry pins; insert-mode icon/animation pins).
- Every wave: tsc + targeted tests + full suite before commit; push origin
  (+gitlab mirror, WAF-retried); runtime rsync + live visual verification of
  the touched stories; the 19 threads resolved with evidence at the END (the
  fix notes reference the live stories).
- The design audit loop: this doc v1 → 2 parallel fresh-context reviewers
  (architecture audit vs the references + user quotes; implementation seam
  audit) → v2 final → then implement.

# DESIGN-R25 — The Reaction Round (v2-FINAL)

**Written:** 2026-09-13, R25-variants. **Status:** BINDING for the R25 waves.
**Inputs:** (a) the user's R25 directives (check new SB feedbacks; deep-apply
`ui-mock/trim_edit_modes.html`; fix the non-functional timeline insert/edit
mode; then 50+ sub-agent rounds of deep UX audit till ≤P3); (b) 19 open
annotakit threads (post-R24-wrap review — the reviewer's SECOND pass over the
R24 state); (c) both reference HTML specs, read in full by the orchestrator
(SKILL #130: orchestrator reads every artifact first).

---

## §0 — The live-probe record (what I verified BEFORE ruling)

The R24 state serves live (runtime == repo HEAD `3db130f`, 124 stories). The
insert-preview pipeline was probed end-to-end in the browser:

- **Insert previews WORK mechanically** — all 7 mode hovers arm the ghost +
  mode badge + displaced ghosts + down-arrow + right-arrows (the full
  `timeline_edit_modes (2).html` grammar is present); the commit inserts
  (fresh `clip-el-*` mints, toast, preview clears); the auto-scroll-into-view
  fires.
- **THE DEFECT (thread 18's "broken now?"): flex starvation of the edit bar.**
  `shell-viewer-transport` (source mode) = [edit-bar wrapper (`flex-1 min-w-0`)]
  + [trim-controls 72px `shrink-0`] + [duration readout 178px `shrink-0`].
  Measured bar widths by canvas: **≤900px → 0px (buttons INVISIBLE)**; 1100 →
  174px (≈1.5 buttons); 1300 → 374px; 1500 → 574px (~4 of 7 buttons; the rest
  behind a horizontal scroll inside a 32px strip). The reviewer's review
  canvas (annotakit drawer open) sits in the 700–1100 band → they SAW a
  0–2-button bar → "previews are broken". The W5b `overflow-x-auto` one-row
  fix was INSUFFICIENT: overflow inside a starved flex row reintroduced the
  R22-#83 "only two buttons visible" class. The row needs PRIORITY-based
  responsive degradation, not overflow.
- **The I/O crop WORKS mechanically** (drag the IN handle → range band +
  readout update; the planner carries `ctx.sourceRange`) — but there is NO
  play control in source mode and NO crop feedback ON THE POSTER (the range
  exists only in a 16px bar) → the reviewer's "no play control and the in/out
  crop is not functional".
- **Wheels:** the 2D puck = balance (hue by direction, amount by distance),
  ONE setGrade per release. What the reference grammar ADDS (Resolve): the
  outer RING = the wheel's master luma, fine-drag modifier, dbl-click reset —
  research A3 verifies before the W3 ruling.
- **Trim tools:** all 8 toolbar tools + drag modes + trimLaws bounds exist;
  the affordance grammar of `trim_edit_modes.html` (cursors, green edges,
  white full-source outline, red-border + glow, shrink boxes, arrows) —
  conformance audited by W2 (probe + implement the gaps).

## §1 — The 19 threads: dispositions (R1–R19)

| # | thread | area | disposition |
|---|--------|------|-------------|
| R1 | th_mtzp8e02 "insert mode previews broken now?" | SourceEditBar | **W1-A** flex-starvation rescue + responsive priority row |
| R2 | th_mtzp83mp "no play control, I/O crop not functional" | Viewer | **W1-B** source transport (scrub + play over poster, honest) + poster crop feedback |
| R3 | th_mtzp94ms "timeline style remembered per view mode" | ViewOptions | **W6-A** per-page view-state memory (store map) |
| R4 | th_mtzp5tvg "inspector refresh after view/editor mode change" | Inspector | **W6-B** stale-entity refresh law + pin |
| R5 | th_mtzors21 "audio tracks not compacted under audio view; hybrid modes" | AppDock/compact | **W6-C** per-kind compact: compact-video / compact-audio / compact-all |
| R6 | th_mtzolu4o "wheels not working correctly — research Resolve first" | WheelsPanel | **W3-A** after A3 research: ring = luma, fine-drag, reset; re-pins |
| R7 | th_mtzonhlu "inspector reacts to clip OR node — needs extreme clarity" | ColorInspector | **W3-B** target-model clarity (A2 research; header + affordances) |
| R8 | th_mtzoo09d "timeline target: one track? all?" | ColorInspector | **W3-C** whole-timeline ruling + tip copy |
| R9 | th_mtzom4xu "what does this mean and do?" (:178) | ColorInspector | **W3-C** target chip redesign (name + scope explainer) |
| R10 | th_mtzomdge "repeat again here too" (:106) | ColorInspector | **W3-C** the Timeline-grade badge gets the same clarity grammar |
| R11 | th_mtzokuem "scopes: panel or under inspector?" | ScopesDock | **W3-D** after A2: scopes → console-row TAB (analysis console law) |
| R12 | th_mtzoi7vr "console multi-tab next to timeline" | Toolbar2/nodes | **W3-D** the console row becomes a TAB strip [Timeline \| Nodes \| Scopes] — one space, thin tabs, toolbar buttons activate their tab |
| R13 | th_mtzou0op "mini toggles for console element visibility + [I] thing" | FullDock | **W4-A** strip element toggles (FX sends, pan, meter) + the [I] audit |
| R14 | th_mtzovsvz "hover causes dialer area to jump" | RsmRow | **W4-B** live repro + layout-stable hover fix |
| R15 | th_mtzoxrhb "wrong icon" (FullDock:364) | MixerDock | **W4-C** icon audit vs Resolve convention |
| R16 | th_mtzoy9f9 "redundant mixer button" | TimelineToolbar | **W4-D** remove the timeline-toolbar mixer toggle (Toolbar2 keeps it) |
| R17 | th_mtzozdvo "responsive design, not mini-style switch" | MetersDock | **W4-E** progressive degradation ladder before the mini fallback |
| R18 | th_mtzp4arw "export summary → separate panel, not inspection" | DeliverPage | **W5-A** summary moves to the console-row panel family |
| R19 | th_mtzp4xeb "add custom JSON format" | DeliverPage | **W5-B** custom JSON preset + the format list |

## §2 — The two reference specs: mode cards (read in full by the orchestrator)

### §2.1 `trim_edit_modes.html` (4 modes) → W2 conformance targets

- **Roll** — both sides of ONE edit move together (A's out + B's in), total
  length constant. Affordances: green-edge on BOTH seam sides (right edge of
  left clip + left edge of right clip), the roll cursor (double bracket), a
  two-way arrow at the seam. Requires an EXACT junction (no gap).
- **Ripple** — ONE edge moves; everything right of the edit shifts by the
  same delta. Affordances: green-edge one side, the dimmed/shifted right
  neighbors, the ripple cursor, a push-right arrow.
- **Slip** — in/out move INSIDE the clip; position + duration unchanged.
  Affordances: the WHITE OUTLINE = the FULL SOURCE duration around the clip
  (the honest "you have this much room" frame), a BRIGHT in-point preview
  frame inside the outline, red border + edge glow on the clip, in/out
  direction arrows inside the outline.
- **Slide** — the clip moves between fixed neighbors; neighbors trade length
  (a roll across 3 clips). Affordances: red-border on the mover, neighbor
  SHRINK BOXES (white dashed) on both sides, direction arrows in the boxes.

W2's contract: probe every mode's live gesture; implement any missing
affordance so each mode carries its reference grammar; pin at the component
level (the affordance DOM + the law-level bounds already pinned).

### §2.2 `timeline_edit_modes (2).html` (6 modes + placeOnTop) → W1 conformance

- Insert — splits a straddling clip; ghost + down-arrow + right-arrows.
  **Present + works; the BAR was the defect (R1).**
- Overwrite — ghost OVER the covered span (nothing pushed). Present.
- Replace — EXACT same length as the replaced clip (out point retimed to
  fit); dual-pane old/new preview. Verify + pin the same-length law live.
- Append at End — after the LAST edit, playhead-independent. Present.
- Ripple Overwrite — different-length swap + push/pull. Present.
- Fit to Fill — speed badge (auto-calculated) on the dimmed target slot;
  needs I/O. Present (speed badge testid exists) — verify the badge math.
- The source-clip-above affordance (the reference shows the active source
  clip elevated above the timeline) — our equivalent is the hover preview's
  down-arrow + ghost; W1 verifies the ghost is IN-VIEW at arm time (the
  scroll-into-view already landed R23-WD).

## §3 — Wave contracts

- **W1 (R1+R2, the insert/edit rescue):** (a) restructure the source-mode
  transport row: the edit bar is the PRIORITY consumer (flex basis + shrink
  rules), the duration readout + trim controls degrade first (readout drops
  below ~360px free width; trim icons keep), mode buttons go icon-only below
  ~140px-per-button availability — 7 buttons ALWAYS visible at every width
  ≥ the shell's min (labels in data-tips/aria-labels); (b) the source viewer
  transport: play/pause + step ±1 + go-to-start + go-to-end + a source
  PLAYHEAD that scrubs the poster within the I/O range (rAF play = honest
  moving playhead over the still; the loop law: play stops at out; J/K/L
  join the program-mode grammar); (c) poster crop feedback: the region
  outside [in,out] dims on the poster itself + the handles' time readouts;
  (d) gates: tsc, full suite, build; re-pin the W5b one-row pins to the new
  priority ladder; NEW pins: bar ≥7 visible buttons at 820px canvas; play
  button works; range affects the poster dim; the insert still commits.
- **W2 (trim conformance):** per §2.1 — probe each mode, implement missing
  affordances (the slip full-source outline + bright in-preview; the slide
  neighbor shrink boxes; roll/ripple arrows + green edges as cursor-follow
  affordances during the gesture), pin each.
- **W3 (color, after A2+A3 research):** the wheels grammar (ring = luma,
  fine-drag, dbl-click reset — per A3's Resolve findings); the target-model
  clarity (R7–R10); the scopes → console-row TAB (R11+R12: the color console
  row = [Timeline | Nodes | Scopes] thin tabs; the under-viewer scopes pane
  RETIRES — the R24-#68 placement superseded by the reviewer's latest); the
  Toolbar2 Scopes/Nodes buttons activate their tabs.
- **W4 (mixer/console):** R13–R17 — the element-visibility toggles; the RsmRow
  hover jump fix (live repro first); the icon corrections; the timeline-toolbar
  mixer toggle REMOVAL (deletion-pinned); the responsive degradation ladder.
- **W5 (deliver):** R18+R19 — the export summary → console-row panel; the
  custom JSON preset.
- **W6 (view-state + refresh):** R3–R5 — per-page timeline view-state memory;
  the inspector refresh law; the per-kind compact modes.
- **W7+ (the audit fleet):** §4.

## §4 — The deep UX audit fleet (the user's 50+ rounds budget)

After W1–W6 land + the runtime sync, dispatch the audit waves — each agent
fresh-context, one AREA, read-everything + live-probe mandate, findings as
P1/P2/P3 with file:line + repro. The fleet grid (each cell ≈ one agent;
iterate until every area re-audits ≤P3):

- **Views (7):** Edit · Color · FX · Audio · Deliver · Media pool ·
  Viewer/source (dual mode).
- **UI groups (12):** Timeline core (ruler/lanes/clips) · Timeline gestures
  (drag/trim/blade/snap/zoom) · TimelineToolbar+popovers · Inspector family ·
  Mixer family (dock/strips/editor) · Console-row + docks · Toolbar2/AppDock ·
  SourceEditBar+insert modes · SourceRangeBar+transport · Color
  wheels/curves/qualifier · Scopes+nodes · Deliver family.
- **Aspects (8):** a11y (roles/keyboard/focus ladder) · CSS layer hygiene ·
  state/store invariants · undo/history seams · shortcut map coverage ·
  test-quality (vacuous pins) · Storybook story truth · console-error sweep.
- **Visual net:** VLM sweep of all 124 stories (resumable, rate-limited) —
  P1s feed the fix waves.

Triage law: every P1/P2 → a fix wave item with a pin; P3s → the residue
register (PLAN) if cosmetic-only. The round ends when a full re-audit pass
returns ≤P3 everywhere.

## §5 — Gates (every wave)

tsc --noEmit clean · full vitest suite green (1740 baseline) · vite build
green · zero console.log · partition clean (files touched = files declared) ·
**commit → push → bundle (HEAD main) — SKILL #143, after EVERY wave** ·
worklog section per wave (SKILL #144: write as if the code will be destroyed).

## §6 — RESEARCH VERDICTS (A1/A2/A3, 2026-09-13 — binding)

**A1 — the source viewer (feeds W1):** Resolve treats STILL sources as
normal clips (default 5s) with the FULL transport — play "plays" the frozen
frame; the honest mock is a moving playhead + running TC over the poster.
I/O marks = bracket flags ON THE SCRUB STRIP + out-of-range dimming ON THE
STRIP (never on the image); duration readout switches to the range. Transport
row: left = TC/jog · center = go-to-start / step / play / step / go-to-end /
loop · right = Mark In / Mark Out. W1-B adopts: 5s-pseudo-duration playhead
scrub + play, I/O flags + strip dimming, the range-driven readout; the
SourceRangeBar merges into a real scrub strip (playhead + flags + dimming).
The 7 edit-mode buttons stay in the row (Premiere's Source-Monitor placement)
behind a clear divider, as the PRIORITY cluster.

**A2 — the color layout (feeds W3):** scopes react to the PLAYHEAD FRAME
(always-on analysis, not selection) → the console-row TAB ruling is CONFIRMED
(beside the node graph; the under-viewer pane RETIRES). Target grammar: a
3-chip breadcrumb header on the inspector — `[clip name · track] ▸ [Clip
grade | Timeline grade] ▸ [Node n · label]` — with the node chip clickable to
focus the graph; the level segmented control mirrors the node-graph header.
Timeline-grade copy: "applies to every clip in this timeline, after clip
grades" (never "one track" — Resolve has no track grade). Orange-dot
affordance on inspector tabs holding adjustments in the current node.

**A3 — the wheels (feeds W3):** disc drags are RELATIVE/ACCUMULATING
(trackball-style: grab anywhere, `v += Δpointer`, clamp at rim) with LIVE
preview + live YRGB readouts — our absolute-vector + commit-on-release model
is WRONG and gets rewritten. Center = neutral; crossing = complementary hue
(continuous, optional ≤3% dead zone). Master luma = a HORIZONTAL DIAL below
the wheel (left darker / right lighter, YRGB moves together) + Ctrl/Cmd+drag
inside the disc = master adjust (Resolve's documented behavior) + Shift+drag
= absolute jump. Dbl-click disc = color-only reset; per-wheel corner button =
color+master reset. 4 YRGB numeric fields per wheel, live, editable
(dbl-click-to-type, ↑/↓ nudge, drag-to-scrub). Hue ring: vectorscope
orientation (red upper-left, 60° spacing). One undo entry per gesture
(the live preview commits once).

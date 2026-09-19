# DESIGN-R24 — the full-audit round: every view, every UI group

**v2-RECON** (2026-09-10) — RECONSTRUCTION NOTICE. The original v1 (written
2026-09-09, never pushed) and the five committed waves (W0 `00a0220` → W4
`654f773`, none pushed) were destroyed by the 2026-09-10 00:54 container
recycle: the overlay clone `/home/z/nle-core-spec` lost its working tree and
object store, the runtime never carried the wave code (sync happens at wrap,
which the abort pre-empted), and the auto-snapshot (`/home/sync/repo.tar`,
19:33) predates the wave commits. This doc re-binds the round from the durable
records: the worklog's A1/A2/A3 research rulings (2026-09-09), the F1–F5
fresh-context audit reports (2026-09-09), the W1–W4R wave contracts, and the
14 issue threads (#58–#71, GH mirror #112–#125, all still open in the
annotakit store + GitHub). Where the reconstruction narrows a detail the lost
commit carried, it is marked `[recon]`. The incident itself produced a new
binding law: **PUSH AFTER EVERY WAVE** (SKILL #138) — wrap-only pushes are
banned; a recycle mid-round must cost at most one wave.

**Issues:** #58–#71 (14, all pinned on `shell-appshell--edit`, reviewer
session 2026-09-09 11:28–11:38, threads th_mtu0kssn…th_mtu0y8kl). **Base:**
GitHub main @ `4ca6768` — the sibling R24/R25 spec-track rounds did NOT touch
`ui-mock/shell-variants` (verified: `git diff 89cc365..4ca6768 -- ui-mock/
shell-variants` is empty; all R23-era line pins in the audit records still
resolve). **Predecessor:** DESIGN-R23 (landed W0–W5, 1597 tests, 123
stories); this round's F-audits audit its output, and its known-deviation
table rows for mixer/view-options/deliver are superseded here.

Provenance law (SKILL #90): every design element is labeled
[reference-faithful] (ui-mock HTML canon fact), [research-informed]
(DaVinci/NLE web research, 2026-09-09 pass), [user-directed] (verbatim issue
text), [repo-precedent] (existing shipped grammar), or [recon] (reconstructed
from worklog after the recycle).

---

## §0 The corpus and the track map

| # | verbatim core | component (pin) | wave |
|---|---|---|---|
| #58 | "when there's already transition can you or should you allow new ones to add? research / review the right ux here" | TransitionBox (Timeline.tsx:270) | **W3** |
| #59 | "this can be similar to davinci resolve actually, you can DnD fx to clips (depend on transition vs. effect and where it drops it can apply to the seam or the clip body)" | FxBrowser.tsx:68 | **W3** |
| #60 | "why is there a mixer floor dialog? makes no sense … restricting / warning user is the right ux we both know the answer. responsive design is the right way but where is it for the mixer?" | MixerDock.tsx (FullDock:372) | **W1** |
| #61 | "this icon is really bad" | AppDock.tsx:60 (ScissorsLineDashed) | **W1** |
| #62 | "do a full audit how many of these icons are truly working correctly vs. no-op vs. broken?" | TimelineToolbar.tsx:221 | **W1** |
| #63 | "after so many times of mentioning this, we still call it Media Pool under color?" | Toolbar2.tsx:121 | **W1+W2** |
| #64 | "why i can't toggle timeline view back to normal in color coding?" | (DOM pin, view-options button) | **W1+W2** |
| #65 | "why mixer can turn on but cannot toggle off?" | Toolbar2.tsx (btn-mixer) | **W1** |
| #66 | "and mixer shouldn't be here when it is not audio workflow either tbh" | Toolbar2.tsx (btn-mixer) | **W1** |
| #67 | "make it a panel like next to the timeline but NOT here blocking the preview as i realize we need to look at preview while changing things" | ColorNodeGraph.tsx | **W2** |
| #68 | "no-op right now" | Toolbar2.tsx (Scopes toggle) | **W2** |
| #69 | "curve can't be right did we checked the reference DOM and research what it should look like?" | CurvesPanel.tsx | **W2** |
| #70 | "look most things here don't make sense, we need a full audit of the color grade view again; why do we need a delete button here? because you want a button?" | StillsPanel.tsx | **W2** |
| #71 | "under export view timeline is compacted but there's no ruler and no range clamp which is like the BIGGEST if not the only thing we need here" | AppDock.tsx (deliver) | **W4** |

Live-probe resolutions recorded 2026-09-09 (before the waves): #63's pin DOM
actually read "Stills" under color (the reviewer remembered the R20-era
"Media Pool"; the ruling is still a rename — to **Gallery** — plus a
table-driven "no Media Pool on any page ≠ edit" pin, so the class dies
permanently). #64's view-options button was a dev-jargon toast no-op; the
scopes toggle DID mount ScopesDock but in the timeline console row (F6 slot
[6]) where the reviewer never looked — #68's "no-op" and #64's complaint both
resolve via W1's popover + W2's composition. #71's RangeBand rendered (5
elements) but with no ruler and an inverted-preview clamp defect — W4.

Plus the standing carry-overs riding this round: the F-audit P1/P2/P3 nets
(§2) — the user: "we need extremely thorough full audit of every view + ui
group as there are many many issues i can't list them all."

---

## §1 The research verdicts (binding)

### §1.1 A1 — transitions & DnD (#58, #59) [research-informed]

Canon answer (FCP / Premiere / Resolve unanimous): **ONE transition per
seam, drag-to-replace** — FCP: "Replace an existing transition: Drag the
transition on top of the existing transition"; Premiere: "drag the new
transition from the Effects panel onto the existing transition"; Resolve:
drop-on-footage application + handles requirement ("insufficient handles"
refusal). Presentation+type swap with **duration and alignment retained**
(presentation swap keeps the user's tuning; the R23 default-duration
overwrite dies). Click on an occupied seam = **select-to-edit** (never a
dialog — no NLE uses dialogs here). No data-model change: `transitionOut`
stays a single object per clip; effects stay a stack (duplicate OFX
instances are legal in Resolve/Premiere).

The routing table (#59, Resolve-style): a frozen `application/x-nle-effect`
row dropped on —
- **empty seam** → set the transition (new mint);
- **occupied seam** → REPLACE (retained duration/alignment; identical
  presentation short-circuits BEFORE `setTransition` with an "Already X"
  toast + fx-domain select — W0's store guard is the belt-and-braces twin);
- **clip body** → the clip's OUT seam (transition rows) / effect stack
  (effect rows — duplicates legal with a ×N toast) / `setFade` (fade rows);
  transition rows on a clip with **no butt-spliced neighbor** refuse with a
  toast ("no clip after this one — transitions need a cut"; 1ms epsilon
  tied to the seams builder's tolerance);
- **empty lane** (no clip under the drop) → pure no-op (no highlight, no
  toast, no commit — the lane's pool-only guard is the law);
- drag-over visual on the SeamZone (HTML5 drag never fires hover):
  24px zone + `--transition-mark` 26% fill + 1px border + '+' on empty
  seams; the OCCUPIED seam's TransitionBox widens to the 24px drop floor,
  drops its paint to the 26% fill and swaps the crossfade glyph to ⇄;
- **double-click a browser row** = apply to the single selected clip
  (zero/multi selection keeps an honest "Select one clip" toast).

### §1.2 A2 — color composition (#67, #68, #69, #70) [research-informed + reference-faithful]

GREP-VERIFIED: ZERO curves-editor DOM in all five reference HTMLs — the #69
premise "check the reference DOM" resolves to: there IS no curves reference;
the panel is rebuilt from Resolve research (BMD: "the default 'custom'
curves let you adjust red, green, blue and luminance curves independently,
while displaying a live histogram"; jayaretv: histogram overlay arrived in
Resolve 16).

Rulings:
- **Nodes** (#67): timeline-area console dock (the F6 console row, slot [6]
  — beside/above the compact strip), NEVER the viewer swap (kills the
  R23-WB stale-frame deviation). The graph keeps its own 26px nodeviewer
  header (Layers/target chip/× → `toggleColorNodesDock`) + 38px toolbar +
  natural-size 706×268 scroll-both workspace in a min-w-[480px] flex-1
  wrapper.
- **Scopes** (#68): an ~160px pane UNDER the viewer, inside F6 region [2]'s
  column (Viewer flex-1 + pane below), `colorScopesState`-gated, never a
  new F6 stop. Scope labels renamed to the reference's exact
  Parade/Waveform/Vectorscope/Histogram. First-paint/10fps/status-line laws
  kept. The 2×2 four-up renders as a one-shot deferred toast (not a mode).
  R23-WB's ruling-14 stale-hint is deleted.
- **NO nodes/scopes tabbed union** — Resolve shows both simultaneously
  (gallery top-left, viewer center, scopes viewer-side, node graph strip
  BELOW the viewer).
- **Curves rebuild** (#69): `CurveSet {y,r,g,b}` (per-channel + the
  y-applies-to-all-3 composition order in `bakeLinearCurveLuts`), `[Y|R|G|B]`
  radiogroup with roving, ~64-bin channel histogram BEHIND the grid (from
  `gradedFrameBus` at the 10fps family throttle, reusing
  `scopesMath.histogram`), 25% grid + center crosshair, solid 25%-white
  reference line (the dashed diagonal dies), 10px white handles w/ 1.5px
  dark ring + accent ring, single-click insert w/ the 8% near-band,
  Delete/right-click interior removal, readout+footer deleted, square
  max-w-[360px], D3 gesture law + lost-pointer-capture commit.
- **Stills → Gallery** (#70): panel renamed Gallery (header + count;
  `leftDockContent` color: 'Gallery' + ImageIcon; surface key + testids
  stable). Per-card delete/.drx buttons DELETED (Resolve has zero per-card
  buttons); a #70 ContextMenu (Apply/Delete/Export PowerGrade) covers both
  §4.9 routes. Stills apply = REPLACE not merge (the F4-P2 fix: a
  curves-free still must reset a non-identity target — reset-then-set in
  ONE `setGrade` patch; wholesale replace when the still HAS curves; a
  curves-free still on an identity target stays a no-op, no history entry).

### §1.3 A3 — mixer / toolbar / deliver (#60–#66, #71, #63, #64) [research-informed]

- **Mixer toggle** (#65/#66): binary toggle WITH lastVisual memory
  (`cycleMixerState` + `mixerStateLabel` + `mixerFloorWarned` all DELETED
  from the store, with store-level deletion pins guarding the deletion).
  Toggle = `toggleMixerOpen`, glyphs AudioLines open / SlidersVertical
  closed (the SlidersHorizontal Inspector-collision glyph dies). Button
  renders on AUDIO page ONLY (R23-WB's edit+audio row is superseded —
  Resolve's Edit page shows a mixer only via Workspace, and the user's
  ruling wins). README deviation row rewritten.
- **Floor** (#60): <280px = SILENT render-level fallback — the container
  (new `mixer-dock` wrapper testid) measures its own height and
  PURE-RENDERS MetersDock below 280px while `mixerState` stays untouched;
  strips return when height grows. No store write, no toast, no flag. B1's
  definite-row lookup moves 3 ancestors up (the wrapper adds one node).
- **View options** (#64/#62): the view-options hamburger becomes a REAL
  APG popover (`ViewOptionsPopover.tsx`, ContextMenu-family: aria-haspopup
  =menu; click/Shift+F10/ArrowDown open; first enabled item focused; ↑/↓
  rove with wrap skipping aria-disabled; Enter/Space native; Esc/Tab/
  outside-click close with focus returning to the opener). Items:
  "Compact tracks" (menuitemcheckbox = the density resolver + override
  write; DOM-ABSENT on FX via the matrix flag), "Clip style:
  Filmstrip|Block" (menuitemradio pair on the variant context — one source
  with the debug overlay), "Audio waveforms" (menuitemcheckbox over the
  per-track view flags via a converging `toggleTrackCmd` flip loop that
  handles the undefined→true fixture quirk; honest aria-disabled + reason
  tip while compact). The R14 dev-jargon toast + the standalone density
  button are DEAD (TimelineToolbar renders `<ViewOptionsPopover
  showCompact={m.density} />`).
- **Edit dock glyph** (#61): Clapperboard (19px/1.6, tip frozen) — the
  reference page dock pairs Cut with the scissors glyph; Edit takes the
  clapperboard. The #115 rationale comment rides the code.
- **Deliver** (#71): the 22px read-only ruler (rulerTiers ticks/TC) is
  UNCONDITIONAL in TimelineCompact's head stack with the 32px RangeBand
  mounted BELOW it on the deliver branch only (54px total; AppShell passes
  `rangeBand={page==='deliver'}`); ruler gains read-only in/out bracket
  FLAGS at the loop edges. Band grammar: solid accent-tint fill (30% into
  the strip base) + 1px top/bottom edges (65% accent), ~40% dark mask
  OUTSIDE in→out (two strips), 12px full-height bracket handles with 3
  grip ticks + cursor-ew-resize + hover-brighten (60%-accent rest stroke →
  full accent + 18% tint wash), live TC readout in the fill, keyboard
  sliders (±1 frame / Shift ×10 / Home-End), the loop seam law unchanged
  (band = s.loop; R23's loop-dim wash is deliberately DEAD on the band).
  Mouse preview CLAMPS against the opposite live edge (in past out pins at
  live out; out past in pins at live in; release commits exactly the
  preview) — the F3 inverted-preview defect dies.
- **Media Pool** (#63): table-driven pin "no 'Media Pool' string on any
  page ≠ edit" + Gallery pinned (W2's rename).

---

## §2 The audit net (F1–F5, fresh-context, 2026-09-09)

Five family auditors, every file read in full + live agent-browser
verification on :3000. Findings not already owned by W1–W4 roll into W5.

**F1 primitives + shell chrome:** P1 — SourceEditBar wraps to 2 rows (46px)
inside the FIXED 32px transport row at the 1280×800 floor (barRect
[300,315,173,46] vs transport [292,322,636,32]; the 7th button occluded by
the HSplitter z-10) — Viewer.tsx:524-528 + SourceEditBar.tsx:228. P2s —
MediaPool PREVIEW hairline never sweeps (mounts at width:100%, the declared
transition never fires; MediaPool.tsx:249-255); source trim-in/out buttons
are no-ops that render enabled with a tip (Viewer.tsx:533-554 — violates the
honest-control law); plain F6 escapes the CheatSheet modal (focus lands on a
background region while aria-modal stays open; AppShell.tsx:213-235 +
CheatSheet.tsx:43-64); Toolbar2 Mixer/Inspector shared the identical
SlidersHorizontal glyph (fixed by W1's swap). P3s — hideOverlays covers only
2 of 4 overlay groups (name/res chips vs text overlay + safe guides; Eye
aria-pressed=true while nothing shows); SourceRangeBar gesture-law drift (no
pointercancel/lostpointercapture — the B7 law; no aria-orientation — B8; dead
`*0; void t` line; Home/End no-ops); hit-floor violations 20/22px vs the 24px
house floor; F6 cycle order visits AppDock before nested regions;
ConfirmDialog never restores focus to the invoker; LeftDock renders
sound-library/fx-browser bare (no shell-leftdock wrapper); CheatSheet comment
cites the dead z-ladder. VLM "P1 empty canvas"/"clipped text" = story-canvas
framing artifacts (live-verified clean).

**F2 panels + inspector:** P1 — app.css:251 `input[type="range"]{height:
14px}` sits OUTSIDE any @layer → outranks Tailwind utilities → the Inspector
EQ's vertical h-[88px] band sliders collapse to 14×11px stubs (live-measured)
and every range height utility in ChannelEditor is dead. P2s — NumberField
w-[64px] clips TC display (client 62 vs scrollWidth 81); ChannelEditor
ClipParamRow re-keys the slider on value → single ArrowRight drops focus to
body; MicroSlider double-click writes the range MIDPOINT not the default
(Gamma luma 1 → 2.125 live); Levels|EQ sub-tab tablist has NO arrow roving;
WheelsPanel Temp/Tint rows render a decorative gradient bar with NO slider;
TransitionSection's mixed "some have a transition" branch renders the els[0]
Hard cut/Add UI (a lying state) and Add on an already-transitioned clip mints
a no-op history entry. P3s — ProjectSheet cites the DELETED ColorConsole;
marker color dots tablist w/o tabpanels; Caption Use-Track-Style checkbox
resets silently on rail swap; fade-domain split (0..10 unclamped vs setFade
clamp); NumCell silent invalid revert; effects-picker menu a11y; hardcoded
hexes; InsertParams module store outlives the editor.

**F3 timeline:** P2 — mouse trim of SHORT transitions impossible (0.10s box
= 14px: a full x-sweep at cy returns 0px of either handle; at 2.0s each
handle has 9px). Root causes stacked: TransitionBox overflow-hidden clips
the handles' 3px outside-offset; SeamZone z8 covers cut±6; adjacent fade
objects claim the rest (→ W3's wrapper/visual split + occupied-seam zone
skip). P3s — RangeBand inverted drag preview ≠ commit (→ W4's clamp);
insert-preview split ghost offscreen (dashed right half at content x 1855,
viewport ends 1280; scrollIntoView targets only the main ghost);
TimelineCompact playhead z-[3] paints OVER the sticky badge chrome z-[2];
Ruler point pins at t≈0 half-clipped (left −pinW/2). Verified sound: ruler
tier math at extremes, virtualization, marker pins, marquee/trim gestures,
scene-switch staleness, insert-ghost geometry.

**F4 mixer + color surfaces:** P2-class — still APPLY is a MERGE not a
replace for curves (→ W2's reset-then-set seam). P3s — parade sharedMax
computed+pinned but NEVER used by the painter (scopesMath.ts:83 vs
scopeDraw.ts:117-119 — the "honest cross-channel compare" contract);
WheelsPanel puck L177 / MicroSlider controls.tsx:119 / QualifierPanel
RangeWidget L132 call setPointerCapture UNGUARDED (the exact inactive-
pointer-id throw Fader/Knob/PanBox guard against); AuxStrip T0 header shows
the bus NAME (dup with the title row — the D5 ID-only header law);
ChannelEditor Aux-returns block edits A1 only; De-esser Freq row linear
2k-9k (log-domain control); scopes parade draws 3 duplicate 10-bit label
sets; setActiveScene clears 7 domains but not stripFocus. Verified sound:
fader/knob/pan math, tier ladder, meters, wheels puck/LGG, qualifier HSL
bars, grade-target resolver, scopes math vs the reference, stills qualifier
round-trip.

**F5 appshell + store + fx + deliver:** P2s — VSplitter/HSplitter have
role=separator + onKeyDown but NO tabIndex (the §11 a11y ladder unreachable;
jsdom fires keyDown directly so tests stay green); setPage exits
fxMode/tool/mixer/boost but NOT selectedFxObject + the ruling-22 Delete
rung runs unscoped (→ W0 store fix + rung scope); deliver jobs/showQueue
component-local useState vs the store's unmount-survival law (→ W4's
deliverViewStore); split moves transitionOut to the right half while
selectedFxObject still points at the left (→ W0's clear-on-split). P3s —
inspector dbl-click reset pins inspectorWUserSet (color reset → edit shows
420 not 340; the mainBody twin was fixed in R23-WB-REV); deliver queue
toggle silent no-op while rendering + the mock-tip promise (→ W4 honest
toggle); toggleEffect/removeEffect mint history entries on unknown ids
(→ W0-class no-op law); Escape dead-key with marker/fx-object domains held;
AppShell.stories Deliver caption "swaps the right rail" (→ W4 re-caption);
pages--fx-page-story omits ToastRegion. VLM family entries all 429 or
disproven live.

**VLM sweep note:** 123 stories captured at 1280×800; 63 entries were 429
rate-limit errors; the surviving P1=27/P2=17/P3=50 triaged by every family
auditor to REAL-BUG / STORY-ARTIFACT / INTENT — the surviving real bugs are
all in the lists above. [recon] The corpus itself (r23-analysis/
vlm-findings.json + shots) was lost with the overlay; the triaged verdicts
above are the durable extract.

---

## §3 THE WAVES

Coordination law: disjoint file partitions (below); only W0 and W1 may edit
`useUiStore.ts`; every wave gates (tsc --noEmit clean for its partition,
its test files green, no console.log) and commits explicit paths only;
**every wave pushes + refreshes /home/sync/nle-core-spec-<date>.bundle
immediately after its commit** (SKILL #138).

### W0 — store prep (useUiStore.ts + useUiStore.test.ts only)

Three store deltas so W2/W3/W4 stay store-free:
1. **setPage exit law** (F5-P2): setPage clears `selectedFxObject` (with
   the fxMode/tool/mixer/boost exits). Re-pin the old law that pinned the
   survival.
2. **setTransition no-op guard** (A1 belt-and-braces): an IDENTICAL
   presentation+duration+alignment patch on an EXISTING transition returns
   without a history entry. The guard must NOT fire on fresh-mint (no
   existing transition → normal mint) — [recon] the original wave's first
   cut broke the fresh-mint path; the guard condition is "transition
   already exists AND the patch changes nothing".
3. **split clears fx-selection** (F5's lying rail): splitElement moves
   transitionOut to the new right-half id; any `selectedFxObject`
   referencing the split element is cleared [recon — the recorded ruling:
   "split drops any existing fx-selection of that element"; simplest safe
   form: clear when selectedFxObject's elementId matches the element being
   split].
Gates: full suite green throughout (1597/1597 at base), deletion/guard
pins added.

### W1 — shell chrome + mixer (12 files)

Files: Toolbar2.tsx, AppDock.tsx, TimelineToolbar.tsx, MixerDock.tsx,
NEW src/components/timeline/ViewOptionsPopover.tsx, useUiStore.ts,
README.md + Toolbar2.test, AppDock.test, TimelineToolbar.test,
MixerDock.test, useUiStore.test.

1. Binary mixer toggle with memory (cycleMixerState + its audio branch +
   mixerStateLabel + mixerFloorWarned deleted — store-level deletion pins
   guard the deletion; Toolbar2 + btn-mixer-state → toggleMixerOpen;
   AudioLines open / SlidersVertical closed; showMixer = audio ONLY).
2. Mixer surfaces audio-only + README's R24-W1 deviation row (R23-WB's
   edit+audio superseded).
3. No live toast in MixerDock (<280px pure render fallback — the
   `mixer-dock` wrapper testid measures height and pure-renders MetersDock
   below 280px; store untouched; B1 definite-row lookup 3 ancestors up).
4. ViewOptionsPopover per §1.3 (density re-homed; clip-style radio pair;
   waveforms honest-disabled-on-compact w/ reason tip) — the standalone
   density button retired from TimelineToolbar.
5. AppDock Edit = Clapperboard (19px/1.6, tip frozen, #115 rationale
   comment; zero ScissorsLineDashed in src).
6. The icon-audit table rides the commit message (every TimelineToolbar
   icon: working / fixed / removed / honest-no-op verdicts — re-derived by
   the implementer).
7. The #63 table-driven pin (no "Media Pool" on any page ≠ edit; Gallery
   pinned from this side too — "pin both names").
Tests: the 5 files' pins re-pinned for the deleted laws (cycle walk, B4
labels, audio branch, floor toast+flag — deletion pins) + binary toggle w/
memory both Toolbars, glyph law (never SlidersHorizontal), audio-only
button DOM, popover open/close/keyboard/items/clip-style/waveforms,
floor render-fallback, Clapperboard, #63 pin. [recon] original landed at
319→328 tests on the 5 files.
Known debt flagged in-commit: AppShell.test's retired-density describes
need the popover re-point (paid by W2), the waveform flag→Clip-body render
gap (W5), the waveforms converging flip can mint 2 undo entries (W5).

### W2 — color view (19 files)

Files: AppShell.tsx, ColorPage.tsx, ScopesDock.tsx, ColorNodeGraph.tsx,
CurvesPanel.tsx, curveMath.ts, StillsPanel.tsx, mockGrades.ts,
gradedFrame.ts, leftDockContent.tsx + AppShell.test, ColorPage.test,
ScopesDock.test, StillsPanel.test, gradedFrame.test, mockGrades.test,
leftDockContent.test (ContextMenu shared component reused, not edited).

1. (A2-R1) The AppShell viewer-swap DELETED (region [2] always
   Viewer-led); ColorNodeGraph re-homed to the console-row slot [6]
   carrying its own 26px nodeviewer header (Layers/target chip/× →
   toggleColorNodesDock) + 38px toolbar + natural-size 706×268
   scroll-both workspace in the min-w-[480px] flex-1 wrapper.
2. (A2-R2/R3) The ~160px scopes pane inside region [2]'s column (Viewer
   flex-1 + pane below), colorScopesState-gated, never a new F6 stop;
   reference-exact tabs; the 2×2 four-up as a one-shot deferred toast;
   first-paint/10fps/status-line laws kept; ruling-14 stale-hint deleted.
3. (A2-R4) The Curves YRGB rebuild per §1.2 (CurveSet {y,r,g,b} +
   DEFAULT_CURVE + mockGrades + gradedFrame per-channel
   bakeLinearCurveLuts w/ the y-applies-to-all-3 composition order;
   [Y|R|G|B] radiogroup w/ roving; ~64-bin histogram behind the grid;
   25% grid + center crosshair; solid 25%-white reference; 10px white
   handles w/ 1.5px dark ring + accent ring; single-click insert w/ 8%
   near-band; Delete/right-click interior removal; readout+footer
   deleted; square max-w-[360px]; D3 gesture law + lost-pointer-capture
   commit).
4. (A2-R5) Gallery rename (header + count; leftDockContent 'Gallery' +
   ImageIcon; surface key + testids stable); per-card delete/.drx buttons
   deleted; the #70 ContextMenu (Apply/Delete/Export PowerGrade) on both
   §4.9 routes.
5. (F4-P2) Stills apply = replace-not-merge: the extracted
   applyStillToTarget seam — reset-then-set in ONE setGrade patch; the
   patch carries curves: {} exactly when the still has no curves AND the
   target's set is non-identity; wholesale replace when the still HAS
   curves; no-op-preserve on an identity target. 3 new pins
   (replace-not-merge + undo round-trip; wholesale replace via menu; the
   no-op-preserve law).
useUiStore.ts diff = 0. Also pays W1's flagged debt: AppShell.test's 7
density describes re-pointed to the ViewOptionsPopover (open
shell-timeline-toolbar-btn-view-options → the 'Compact tracks'
menuitemcheckbox shell-menu-tl-view-options-compact; checked-state
assertions on aria-checked; a flipCompact helper). [recon] original: 191
tests on the 7 files; also re-pinned 2 deliver-ruler describes to W4's
coexistence law.

### W3 — FX / transitions DnD (8 files)

Files: Clip.tsx, Timeline.tsx, FxBrowser.tsx, FxInspector.tsx (test pins
only — code verified sound) + Timeline.test, Clip.test, FxBrowser.test,
FxInspector.test + Timeline.stories caption.

1. (A1-R1 replace-never-stack) ONE shared parser in Clip.tsx —
   `applyFxRowToSeam` / `applyFxRowToClip` / the butt-spliced-follower
   helper (~187 lines [recon: the original block]): replace retains
   duration+alignment via the partial patch; identical presentation
   short-circuits BEFORE setTransition with the 'Already X' toast + the
   fx-domain select; W0's store guard is the belt-and-braces twin. THREE
   doors wired to it: the Clip body drop, the SeamZone drop, the
   OCCUPIED-seam TransitionBox drop — one law, three doors.
   Click-on-occupied-seam = SELECT pinned through the box.
2. (A1-R3 routing) the §1.1 table: transition row + clip body → outgoing
   seam w/ the adjacency guard (1ms epsilon, refusal toast "no clip after
   this one — transitions need a cut"); effect rows STACK w/ the ×N toast
   on duplicates (el-1's seeded Gaussian Blur → ×2); fade rows → setFade;
   empty-lane fx-row drop = pure no-op (no highlight/toast/commit); the
   seam refusal split per row-kind (fade vs effect detail strings).
3. (A1-R4 drag visuals) SeamZone dragOver state (onDragOver/onDragLeave —
   hover never fires mid-HTML5-drag): 24px zone + --transition-mark 26%
   fill + 1px border + '+' on empty seams. The OCCUPIED seam's
   TransitionBox ⇄ surface: widens to the 24px drop floor (a 14px floor
   box becomes a real target), drops its paint to the 26% fill, swaps the
   crossfade glyph to ⇄. The clip body ring stays (the fxMode twin of
   Clip.test's ring pin).
4. (A1-R7 dbl-click) FxBrowser rows onDoubleClick → applyFxRowToClip
   against the SINGLE selected clip (same imported parser — no fork; the
   ×2 pin lands identically through dbl-click); zero/multi selection
   keeps the honest 'Select one clip' toast; the single-click fallback
   toast's copy names both routes ('drag the row onto a timeline clip'
   phrase kept verbatim). The frozen application/x-nle-effect MIME is
   imported from Clip.tsx (its owner) — FxBrowser's local copy deleted.
5. (FxInspector honesty during replace) verified by code-read — no
   defect: the rail's shared TransitionSection reads the element live;
   the Edit-page entity chip's fxObjChip branch derives its transition
   name from the same live transitionOut. NO FxInspector code change;
   pinned at its surface (boots the rail, runs applyFxRowToSeam, asserts
   new presentation + retained fields + surviving fx-object domain + the
   W0 no-op twin).
6. (F3) trim handles mouse-unreachable on short transitions — BOTH
   halves: (a) the TransitionBox split into an UN-clipped WRAPPER
   (testid/role=slider/focus/keyboard/pointerdown-select/DnD target —
   pointer-events INHERITS so visual+handles follow the fxMode gate) +
   an overflow-hidden VISUAL child (testid transition-visual-*; the
   30→70% gradient/1px border/2px radius/glyph grammar kept
   byte-identical) — the 12px handles hang 3px outside the WRAPPER edges
   as siblings of the visual; (b) a seam with a transitionOut renders NO
   SeamZone at all (the EdgeFadeZone law cloned: the object owns its
   edge) — the z-8 strip over the 14px floor box was the F3 root cause.
   Hit-geometry pinned at style/DOM level.
Re-pins: 'fxMode ON' gates — fx-seam-el-2-el-3 now ABSENT (occupied; the
box answers); the occupied-seam click-SELECT test re-pointed at the box's
pointerdown; the transition restyle test split across wrapper
(height/top-[2px]) + visual (border/gradient/rounded/glyph).
Timeline.stories' FxMode caption updated. [recon] original: 228 tests on
the 4 files (Timeline 104→115, Clip 84→87, FxBrowser 5→12, FxInspector
12→14).

### W4 — deliver range (9 files)

Files: RangeBand.tsx, TimelineCompact.tsx, DeliverPage.tsx, NEW
src/state/deliverViewStore.ts, AppShell.tsx (rangeBand prop),
AppShell.stories, Pages.stories + TimelineCompact.test, DeliverPage.test,
deliverViewStore.test.

1. (A3-R7 coexistence) the 22px read-only ruler UNCONDITIONAL in
   TimelineCompact's head stack + the 32px RangeBand mounted BELOW it on
   the deliver branch only (54px total; AppShell passes
   rangeBand={page==='deliver'}); ruler gains read-only in/out bracket
   FLAGS at the loop edges (pointer-events-none thin glyphs).
2. (Band grammar) per §1.3 (solid accent-tint fill 30% + 1px edges 65%,
   ~40% dark mask outside in→out, 12px bracket handles w/ 3 grip ticks +
   cursor-ew-resize + hover-brighten, live TC readout, keyboard sliders,
   loop seam law unchanged — the R23 loop-dim wash deliberately DEAD on
   the band, documented in the header).
3. (DeliverPage readout) the export summary's `shell-deliver-range` reads
   s.loop and follows the band's drag/keyboard commits ('one seam, every
   readout moves' pins); the "drag the in/out range band on the compact
   timeline below" copy stays true.
4. (deliverViewStore) jobs/showQueue in the NEW module-level zustand
   store (NOT a useUiStore edit; survives page switches — pinned via
   unmount+remount + the no-component store pin); the queue toggle
   honest mid-render (showQueue the single writer, allow-collapse); the
   mock render COMPLETES on the store-owned 4×500ms interval (queued →
   running +25%/tick → done 'just now', FIFO, timer walks while
   unmounted + self-stops; resetDeliverView test seam +
   __mockTimerActive containment probe).
5. (F3 P3-2) the mouse preview clamps against the OPPOSITE LIVE edge
   (release commits exactly the preview); keyboard keeps the R14
   drag-along law verbatim.
Story hygiene: AppShell.stories Deliver caption re-captioned to the
R22-W5 whole-mainbody takeover (presets left · preview/queue center ·
inspector right + the ruler+band strip below); Pages.stories deliver
captions re-truthed (presets LEFT ONLY; queue = CENTER view; summary+
settings in the RIGHT inspector; fixture boots IDLE with 1 failed + 3
done); NEW DeliverStrip story (the coexistence head stack + full band
grammar at 860×200) — **the story net grows 123 → 124**.
Test hygiene: act()-wrap resetDeliverView in beforeEach/afterEach (the
file-level hooks run before RTL cleanup — the act() warning storm);
dedupe duplicate min-w-0. [recon] original: 62 tests on the 3 files.

### W5 — the audit-fix waves (F1/F2/F4/F5 leftovers; never started)

Split by family to keep partitions disjoint; each wave gates the same way.

**W5a — inspector/widgets/CSS (F2 + F1's range cascade):**
- THE P1: app.css:251 unlayered `input[type=range]{height:14px}` — move
  it INTO the layer system (or scope it away from utilities) so Tailwind
  h-[88px]/h-[10px] range utilities live again; pin the EQ vertical
  slider geometry (style-level pin: the h-[88px] survives the cascade).
- NumberField w-[64px]→w-[76px] [recon width] (TC display client 62 vs
  scrollWidth 81 — hours digits cut).
- ChannelEditor ClipParamRow: stable slider keys (no re-key on value →
  no focus drop; pin ArrowRight keeps focus).
- MicroSlider double-click writes the DEFAULT (range default, not the
  midpoint).
- Levels|EQ sub-tab tablist gains arrow roving (the ColorInspector/Marker
  pattern).
- WheelsPanel Temp/Tint rows gain REAL sliders (the master bar-slider
  grammar).
- TransitionSection mixed-state branch → honest mixed presentation
  ("Mixed — 2 of 3 have transitions") + Add on an already-transitioned
  clip = honest no-op toast (no history mint).

**W5b — source/transport/viewer (F1):**
- THE P1: SourceEditBar wraps to 2 rows in the fixed 32px transport row —
  compact to a single row at the 1280 floor (h-8 + h-scroll if needed;
  [recon] the exact mechanism is the implementer's call — the law is: NO
  wrap, NO occlusion, all 7 buttons reachable, hit-floor 24px where
  feasible).
- MediaPool PREVIEW hairline actually sweeps (mount at width:0 →
  transition to 100%; the audio sibling's keyframes law).
- Source trim-in/out buttons honest: disabled w/ reason tip until a range
  exists; commit visibly when active (the honest-control law).
- Plain F6 no longer escapes the CheatSheet modal (the ConfirmDialog
  stopPropagation-on-all-keys pattern; focus returns to the opener).
- hideOverlays covers ALL 4 overlay groups (text overlay + safe guides
  hide too; Eye aria-pressed stays truthful — re-pin Viewer.test:73).
- SourceRangeBar gesture laws (B7 pointercancel/lostpointercapture, B8
  aria-orientation, dead `*0; void t` line removal, Home/End
  preventDefault).
- ConfirmDialog restores focus to the invoker on close.

**W5c — mixer/scopes polish (F4 P3s):**
- parade sharedMax USED by the painter (honest cross-channel compare; pin
  the density math).
- unguarded setPointerCapture ×3 (WheelsPanel puck, MicroSlider,
  QualifierPanel RangeWidget) → the Fader/Knob/PanBox guard pattern.
- AuxStrip T0 header ID-only (the D5 law; no bus-name dup).
- ChannelEditor Aux-returns block edits A2 too.
- De-esser Freq row log-domain.
- Parade label dedup (one shared axis).
- setActiveScene clears stripFocus (the 8th domain).

**W5d — store/shortcuts/story hygiene (F5 P3s + debts):**
- VSplitter/HSplitter tabIndex=0 (+ focus ring) — the §11 ladder becomes
  real; live-verify with agent-browser (jsdom can't catch this class).
- The Delete rung scope (shortcutMap documents "on the FX page / in the
  FX tool") enforced — Delete with an fx-object held but page≠fx →
  clears the selection (or a scoped behavior per the W0 exit law; the
  unscoped useShortcuts.test pin re-pointed).
- inspector dbl-click reset un-pins inspectorWUserSet (the mainBody twin
  law).
- toggleEffect/removeEffect no-op (unknown ids → return, no history).
- Escape clears marker/fx-object domains (a rung exists).
- pages--fx-page-story gains ToastRegion.
- Chrome.stories TimelineToolbarDensityOn caption re-truthed to the
  popover (W1's leftover).
- W1's waveform flag → Clip-body render gap (the popover writes §4.7
  per-track view flags; Clip's audio body READS the flag).
- The waveforms converging flip single-undo quirk (a store-level set-all
  batch if cheap; else documented).
- F3's leftovers: insert-preview split ghost scrollIntoView covers the
  straddler; TimelineCompact playhead z under the sticky badge; Ruler
  t≈0 pin centering.

---

## §4 Process, gates, coordination laws

1. **Base + order:** implement on main @ 4ca6768 (sibling rounds untouched
   the app). Order W0 → W1 → W2 → W3 → W4 → W5a..d; W0/W1 own
   useUiStore.ts, W2–W5 never touch it.
2. **Per-wave gates:** `npx tsc --noEmit` clean (whole tree at wave end),
   the wave's test files green, no console.log, commit explicit paths
   only. Full-suite + vite build gates at W4 close and after each W5 wave.
3. **PUSH AFTER EVERY WAVE** (SKILL #138, the 2026-09-10 incident law):
   commit → push GitHub (+ GitLab mirror best-effort) → refresh
   /home/sync/nle-core-spec-<yyyymmdd>-r24wN.bundle. A recycle mid-round
   must cost at most one wave.
4. **Runtime sync + the wrap gate:** after W4 (and finally after W5):
   run the code-sync (rsync per boot-restore rules), verify the public
   index.json story count vs the repo's (SKILL #122 — expect 124 after
   W4), VLM-verify the changed views (mixer/popover/color composition/
   curves/fx dnd/deliver strip), zero console errors.
5. **Thread resolution:** resolve #58–#71 in the annotakit store with fix
   evidence (scripts/r24-resolve-threads.mjs pattern — R23's), verify the
   GH mirror closes #112–#125.
6. **Wrap:** PLAN R24 entry + HANDOFF variants section + SKILL additions
   (#138 push-after-every-wave + the reconstruction-provenance rule),
   push both remotes, final bundle refresh, worklog append.

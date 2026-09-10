# R23 review-sweep findings — the consolidated fix list

Sources: R23-R1 (primitives+chrome), R23-R2 (panels+inspector),
R23-R3 (timeline), R23-R4 (mixer+color), R23-R5 (appshell+store) —
all five fresh-context reviewers, live-verified measurements, 1542-green
baseline. This file is the FIX ROUND's binding input.

## ORCHESTRATOR DESIGN RULINGS (binding for the fix round)

- **R-a (rail priority):** marker/caption branches HOIST above the page
  branches in AppShell's rightPanel chain (an ACTIVE selection is newer
  intent than the page default — D-C2's own philosophy). New chain:
  selectedMarkerId → captionSelected → page rails (color/fx/audio) →
  channelRailLive → Inspector. Pin: marker rail reachable on color/fx.
- **R-b (FX density):** the FX page forces the FULL Timeline
  (`resolveTimelineCompact` returns false on `page === 'fx'`) AND the
  density toggle is DOM-absent on the FX page (D-A1/ruling 8 wins over
  the D-D2 matrix's density row — update the matrix + the test pins).
- **R-c (left dock):** table-driven mount in AppShell:
  `const dock = leftDockContent(page); show = !!dock && (!dock.gatedByPool || panels.mediaPool)`.
  Audio + FX own the slot (gatedByPool: false → always mounted; the
  Toolbar2 left toggle is DOM-absent there); Edit + Color gated by the
  mediaPool flag; Deliver hidden. The `panels.effects` read in AppShell
  dies. Toolbar2's left toggle renders only on edit + color.
- **R-d (z-ladder):** confirm-dialog 94 → 97 (above window-too-small 95);
  cheat-sheet 70 → 86 (above toasts 85).

## P1/P2 — the must-fix list (file:line + the fix)

1. **TransitionBox blocks edit-mode gestures (R3-P1#1).**
   `Timeline.tsx` TransitionBox root (~:262-282): add
   `pointerEvents: fxMode && !locked ? 'auto' : 'none'` to the style.
   Register the loss: the edit-mode `title` tooltip on the box becomes
   click-through-unavailable — the seam zone's data-tip + the fx-mode box
   carry the info (comment it). Pin: elementFromPoint-style assertion is
   jsdom-impossible — pin instead that the box's style.pointerEvents is
   'none' when !fxMode and 'auto' when fxMode (style-level pin), + keep
   the existing trim tests green.
2. **Scene switch leaves stale selectedMarkerId → blank rail (R2-F1 /
   R5-P2-1).** `useUiStore.ts` setActiveScene (~:1029-1052) + deleteScene
   (~:1071-1078): add `selectedMarkerId: null` (the 7th clear-site law).
   `MarkerInspector.tsx` (~:48-49): `return null` → an honest empty state
   (a one-line 'Marker not found — it was removed' panel). Pins: store
   ('scene switch clears the marker domain') + AppShell ('rail never
   blank after scene switch').
3. **selectNeighbors/selectTrackElements bypass the domain clears
   (R5-P2-2).** `useUiStore.ts` ~:1404-1420: both route through the same
   domain-clear spread setSelection uses (marker/track/effect/fxObject/
   inspectorProjectMode). Pins: 'Tab selection clears the marker domain',
   '⌘A exits project mode'.
4. **Inspector chip lies during FX ownership (R2-F2).**
   `Inspector.tsx` chip chain ~:1590-1602: add the fx-object entity branch
   BEFORE the fallbackTrack (icon Sparkles; name = the transition's
   presentation / 'Fade In|Out — {clip name}'; typeLabel
   'transition'|'fade'). Pin: chip text while selectedFxObject set.
5. **Marker/caption rail hoist (R-a above; R2-F3 / R5-P3-4).**
   `AppShell.tsx` rightPanel chain ~:296-303: reorder per R-a. Pins:
   marker rail on color + fx; caption rail on color; the page default
   when no domain live.
6. **ChannelEditor dB mapping is linear, Inspector's is log (R2-F4).**
   `ChannelEditor.tsx` ~:227/232 vs `Inspector.tsx` ~:91-92: export
   volToDb/dbToVol from Inspector (or a small lib/shared module) and use
   in both; align the range (-24..+12). Re-pin BOTH suites' gain tests
   (they currently pin contradictory laws).
7. **Viewer source-range readout non-reactive (R2-F5).**
   `Viewer.tsx` ~:560-563: `const range = useUi((s) => s.sourceRanges[sourceMediaId ?? ''])`.
   Pin: trim via keyboard → readout updates.
8. **DeliverPage narrow row clips, no scroll (R2-F6 / R5-P2-3).**
   `DeliverPage.tsx` :139: add `overflow-x-auto` (+ `min-w-0` where
   needed). Fix the story comment at `Pages.stories.tsx` ~:86-100 (it
   already claims scrolling — now true). Pin: row scrollWidth behavior.
9. **Deliver queue header always 'rendering' (R2-F7).** `DeliverPage.tsx`
   ~:182-183: condition the spinner + 'rendering' label on renderActive;
   idle label 'Render queue'. Pin: idle header honest.
10. **StatusStrip 12px band can't hold its line box (R1-P2-1).**
    `StatusStrip.tsx` ~:67-68: children get `leading-[12px]` (or
    text-[10px] leading-none). Pin: no line-box overflow (style-level).
11. **AppShell left-dock dead-flag gate vs table (R1-P2-2 / R2-F13 /
    R-c above).** AppShell ~:334/339 + Toolbar2: implement R-c. Pins: the
    audio/fx slot mounts with the pool flag OFF; the toggle absent on
    audio/fx/deliver; edit/color gated as before.
12. **--danger contrast pairs (R1-P2-3/4).** tokens.css: add
    `--danger-text` (a lighter tint ~#ec5d62) for text-on-shell uses
    (StatusStrip retry ~:87); app.css `.confirm-btn.danger` ~:560: darker
    bg (~#cf2f37) for 5:1 with white. Register both in the deviation
    ledger row.
13. **Clip trim handles z-order (R3-P2#2).** `Clip.tsx` ~:1363-1365 +
    ~:1380-1382: `z-[4]` on both handle divs (above fade objects z-3,
    level with the affordance). Fix the false comment ~:1252-1255.
    Pin: style-level z assertion.
14. **FX page density strand (R3-P2#3 / R-b above).**
    `useUiStore.ts` resolveTimelineCompact ~:203-207: `page === 'fx'`
    → false. `TimelineToolbar.tsx`: the density toggle DOM-absent on fx
    (matrix update in the design doc is DONE by the orchestrator).
    Pins: fx page keeps the full Timeline; toggle absent.
15. **Transition boxes escape virtualization (R3-P2#4).**
    `Timeline.tsx` ~:1406: `.filter((e) => e.transitionOut && clipVisible(e))`.
    Pin: high zoom + scroll → offscreen box absent.
16. **RangeWidget Home hi-handle inverts lo/hi (R4-P2#1).**
    `QualifierPanel.tsx` ~:155-159: clamp `hi >= lo + 2*span/100` (and
    `>= min + 2*span/100`). Pin: satHigh >= satLow after Home on hi.
17. **Qualifier hint vs res badge collision (R4-P2#2).**
    `GradedViewerCanvas.tsx` ~:317-324: the hint moves to
    `bottom-2 right-2`. Pin: both render, non-intersecting (jsdom: compare
    the class positions or the store's picker flag + badge presence).

## P3 quick-wins (batch into the same round where trivial)

- R3-P3#5: `left: cut - Math.max(w,14)/2` (centering below 0.3s).
- R3-P3#6: box trim handles 6px → 12px (offset ±3 outside box edges).
- R3-P3#7: `id="shell-timeline"` on the Timeline root (aria-controls).
- R3-P3#8: TimelineCompact clipClick per page (color='grade'; else
  selection-only, label 'select clip' not 'set grade target').
- R3-P3#9: applyBracket upper clamp `min(t, duration)` + RangeBand
  comment fix (it claims verbatim clone; the Ruler writes live — fix the
  comment to describe the compliant band).
- R3-P3#11: stale 'tool radio renders on every page' comment fix.
- R4-P3#3: node page dots → 16px hit buttons (6px visual inside).
- R4-P3#4: ScopesDock tabpanel `tabIndex={0}`.
- R4-P3#5: MicroSlider `aria-orientation="horizontal"`.
- R4-P3#7: NumCell clamp at the WheelsPanel fieldPatch seam (min/max).
- R4-P3#9: DeliverPage preset tiles `aria-pressed`.
- R4-P3#11: a pin for the ScopesDock mode-deps repaint.
- R5-P3#5: F6 guard (INPUT/SELECT/TEXTAREA/contentEditable + modifier).
- R5-P3#6: caption lane `>= 32` in audio focus (exempt from the 28 cap).
- R5-P3#7: shortcutMap '1.5×' → '1.7×'; FX-Delete documented in the
  clips-delete desc; an exhaustive twin-parity test.
- R5-P3#8: z-bumps per R-d.
- R1-P3 quick-wins: Toolbar2 stale Chrome caption + effects patch
  cleanup; toast close 24px; StatusStrip label-in-name + aria-live save
  status; PanBox release discipline; Fader touch-none; Knob 24px hit +
  ArrowUp/Down; ErrorBoundary focus; a small ContextMenu.test.tsx.

## Registered-only (do NOT fix this round — deviation ledger)

VLM caption-flush artifact (harness note in the rubric); fade-object
label occlusion; wheel-hue keyboard path; color-family chrome hex debt;
compact-strip playhead follow; scopes canvas stretch; undo leaves FX
rail targetless (view-state law); removeFade/undo; window-too-small vs
toast ordering (partially fixed by R-d); marker Done-button on fx;
SoundLibrary drop-target guidance; F21 MediaPool removedIds local;
F19 DeliverPage hardcoded name; F20 dead audio-filter branch.

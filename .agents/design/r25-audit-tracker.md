# R25 AUDIT TRACKER — the fleet's findings + fix-wave ledger

**Started:** 2026-09-13 (post-W6, baseline 1855/1855, 126 stories public).
**Fleet batches:** B1 = Edit/Color/Audio views. Each finding lands here with
its ID; fix waves cite the IDs they close.

## B1-a — EDIT VIEW (11)

- **E1 [P2]** Program monitor shows the import CTA at the timeline tail — the at-time probe is half-open, at t=duration no element matches (`mainElementAt`, Viewer.tsx:41-48; empty-state row :451-456). Fix: clamp `<=` at the scene-duration edge / hold last frame.
- **E2 [P2]** The 7 edit-mode buttons are icon-only below ~1830px viewport (label floor 660px is measured on the BAR but the bar only gets the row's leftovers; measured 336px@1500, 302px@1280). Fix: floor ~420-480px + label truncation, or shorter labels.
- **E3 [P3]** Source playhead slider aria-valuemin/max wrong when a range is set (domain is [in,out] but aria says 0..dur).
- **E4 [P3]** Program scrub boundary ticks cover only the FIRST main track (`Viewer.tsx:157` uses `.find`, the probe above it scans ALL).
- **E5 [P3]** No hover-TC tooltip on the source strip (program strip has one).
- **E6 [P3]** I/O keys while source open write the PROGRAM loop (ungated in useShortcuts.ts:448-449); source-mode I/O collision.
- **E7 [P3]** A carried reverse shuttle rate makes the first Space press look dead after re-entering source mode (exitSourcePreview doesn't reset sourcePlayRate).
- **E8 [P3]** Below 1280px the STORY starves instead of overlaying (FullShell omits the TooSmall overlay deliberately; app.tsx is correct).
- **E9 [P3]** Marker-color chevron is a 16px hit target (below the 24px house floor).
- **E10 [P3]** No zoom control in the source viewer (program has one).
- **E11 [P3]** Hidden readouts' data-tip fallback claim is unreachable (display:none can't be hovered; the real channel is the strip's aria-label).

## B1-b — COLOR VIEW (11)

- **C1 [P2]** Wheels have NO keyboard path (disc is role=img, no tabIndex; pointer-only tint).
- **C2 [P2]** "Reset primaries" wipes the ENTIRE grade record (curves + qualifier too) — resetGrade deletes the whole key.
- **C3 [P2]** Preview Matte view-toggle materializes the grade record (orange dot, 2N stills, non-identity pass, one undo entry) — a view gesture minting doc history.
- **C4 [P2]** Grade target can silently diverge from the viewer/scopes (clip clicks never seek; overlay/caption targets never displayable).
- **C5 [P2]** Selecting a caption clip on Color swaps the rail to CaptionInspector (grading surface deleted) while the Gallery still writes grades to the caption's record.
- **C6 [P3]** Unguarded setPointerCapture at CurvesPanel.tsx:334 + Viewer.tsx:571 (the F4-P3 law; the Viewer twin threw live).
- **C7 [P3]** Qualifier hue range widget cannot express wraparound (linear bar, circular mask math — half the default mask invisible).
- **C8 [P3]** Stale toast copy ("W4c lands" — it shipped; test caption too).
- **C9 [P3]** Clip-selector button fires an off-topic deferral toast (pan/zoom copy on a clip picker).
- **C10 [P3]** Eyedropper arming feedback inconsistent in source mode (cursor flips, hint doesn't).
- **C11 [P3]** Stale empty-state copy ("click a clip in the lane strip"; compact is no longer the default; ColorPage.tsx:14 header claim stale).

## B1-c — AUDIO/MIXER (9)

- **A1 [P1]** T2 FX-count popover is 100% CLIPPED (invisible) at the default viewport — the popover opens below the 25px overflow-hidden StripHeader; any dock height [340,420) (the default 1600×900 and 700×900 densities). Fix: portal the popover / keep overflow-hidden only on the name span.
- **A2 [P2]** "No audio tracks in this scene" lies after createScene (the mixer sidecar is never seeded; ChannelEditor fallback at :470; fader nudges self-heal via the DEFAULT guard).
- **A3 [P2]** Aux/master bank renders off-screen below ~750px row width (the B1 budget doesn't bind the pinned bank; vw=500 → aux-A2 + master fully clipped, unreachable).
- **A4 [P2]** SoundLibrary "drop files on the library" is a DEAD instruction (no onDrop/onDragOver handler; the MediaPool twin has both).
- **A5 [P3]** Meters-state column 4px misalignment (track columns p-1 vs pinned master py-1).
- **A6 [P3]** "Expand to full strips" is a silent no-op at mini density (writes the store, render stays MetersDock).
- **A7 [P3]** Aux/master strips lack the dB scale column (3 of 5 strips).
- **A8 [P3]** Element-toggle tips lie at lean/core densities ("shown" while the ladder hides it).
- **A9 [P3]** ⌘I on the audio page points at the Media Pool (not mounted there; library tip says "library").

## B2-a — FX VIEW + TRANSITIONS (8)

- **X1 [P2]** Edit-page Inspector "Fades" group renders for VIDEO clips and reads/writes the WRONG fade domain (reads `audioFadeIn ?? 0` while the FX view reads `fadeIn` via effectiveFade; the write is dead data for video; bypasses setFade's clamp+snap) — Inspector.tsx:80/:1278-1303.
- **X2 [P3]** A transition can outlive its cut (orphaned TransitionBox at a non-seam; no adjacency check in the render path; out-trim can open a gap while transitionOut holds).
- **X3 [P3]** FxBrowser has no browse/filter affordance (38 rows, Fades ~3 screens down; no search).
- **X4 [P3]** FxBrowser click toast says "mock drag-to-clip" — the route is fully live now (deflationary staleness).
- **X5 [P3]** EdgeFadeZone is click-only — a dragged fade row over the 12px head/tail zone is a silent dead drop (no drop door on the zone).
- **X6 [P3]** Transition duration renders raw float in title/tooltip ("1.2916666666666667s") vs aria's toFixed(2).
- **X7 [P3]** Duplicate policy inconsistent: browser rows stack duplicates (×2 toast) but the Inspector's Add-effect picker HIDES applied names.
- **X8 [P3]** (harness note, no app change) auditors must use isolated browser sessions; the default session is contended.

## Ledger

- [x] F1 wave: closes A1, E1, E2, C2, C3, C4, C5, A2, A3, A4, X1 (+ the P2s from later batches)
- [x] F2 wave (R25-F2, landed): closes E3, E4, E5, E6, E7, E8, E9, E10, E11, C6, C7, C8, C9, C10, C11, A5, A6, A7, A8, A9, X2, X4, X6, X7. Suite 1901/1901 (baseline 1881 + 20 pins; re-pins: the C7 hue wrap law — ColorPage.test's dual-handle + F4 pins; the E11 hidden-readout channel — Viewer.test's rung-2 + AppShell.test's ladder pin now assert the strip aria-label; the A7 scale test name).
  - **X3 DEFERRED to next round** (FxBrowser browse/filter affordance — search/filter over the 38 rows; deliberately out of this wave's scope per the wave contract).
  - Notable law changes this wave: the hue bar is wrap-aware (two-segment matte, arc clamped [7.2°, 180°] — the mask's 0.5-turn cap); I/O keys are viewer-mode-gated (source mode writes the source range); the exit-source reset covers sourcePlayRate; the orphaned TransitionBox renders DEGRADED (flag + dashed 45% paint, never auto-deleted mid-render); the effects picker re-offers applied names (stacking, ×N toast — ONE duplicate policy with the browser rows).
- Re-dispatch: timeline-gestures audit (agent hit max-turns without returning — tighter scope next time); deliver+inspector audit (pending/TBD)

## B3 — DELIVER / INSPECTOR / TIMELINE-CORE (24)

- **D1 [P2]** Range-band copy points at a surface not mounted by default (the band only mounts in TimelineCompact; deliver defaults to the full Timeline — the ruler brackets are the real affordance).
- **D2 [P3]** Queued-row name hardcodes the timeline (not the active scene) + the metadata row hardcodes the project title.
- **D3 [P3]** "Retry" offered on running/queued jobs (Resolve: Stop for active, Retry for failed).
- **D4 [P3]** Destination row styled as editable but inert.
- **D5 [P3]** fcpxml/frame presets leak inapplicable settings (Range enabled for a single frame; Resolution for FCPXML).
- **D6 [P3]** Export console status strip below the fold at 800px.
- **D7 [P3]** Stale AppShell comments describe a dead deliver layout.
- **D8 [P3]** Stale testids pin wrong names (btn-export-fcpxml is the CTA for all presets; queue = the presets column).
- **I1 [P1]** Fades group dead-field write (X1 re-filed — the F1 claim never landed) → **FIXED in-tree 2026-09-13 (effectiveFade reads + setFade writes + the video-domain pin; ChannelEditor fade rows joined; the mixed-sheet pin re-pinned to getAllBy)**.
- **I2 [P2]** The R24-W5a honest mixed-transition branch is DEAD CODE (showTransition gates multi to all-have; mixed summary unreachable).
- **I3 [P2]** ChannelEditor commitDrag has no drag guard → no-op undo entries on click/Tab.
- **I4 [P2]** ChannelEditor NumField never resyncs on external writes (uncontrolled defaultValue).
- **I5 [P3]** Caption In/Out bypass moveElement/trimElement (no overlap laws).
- **I6 [P3]** Timing rows' dbl-click reset is a no-op lie (resetTo = current value).
- **I7 [P3]** "Hard cut to X" without adjacency (gap → still claims a cut; Add crossfade mints over a gap).
- **I8 [P3]** Add-effect picker ignores the menu law (no Escape/arrow keys/aria-expanded).
- **T1 [P2]** The TC readout scrolls away while the ruler pins (header zone row lacks sticky).
- **T2 [P2]** Header column out-scrolls lanes by the +track row (26px dead zone at bottom).
- **T3 [P2]** Ruler paints phantom TC labels past the sequence end (effectiveDuration includes the runway).
- **T4 [P3]** Plain-wheel path skips deltaMode normalization (zoom path normalizes).
- **T5 [P3]** scrollMax non-monotonic during zoom-out (scrollbar flicker).
- **T6 [P3]** In/out bracket drag has no edge auto-scroll (scrub has it).
- **T7 [P3]** TimelineCompact's ruler is unvirtualized (720 nodes at 5kpps).
- **T8 [P3]** Scroll view-state continuity leaks (scrollTop survives scene switch; scrollLeft dies on compact flip).

## Ledger (updated)

- [x] F1 wave: A1, E1, E2, C2-C5, A2-A4 (X1 CLAIMED but never landed — caught by B3, fixed in-tree)
- [x] F2 wave: E3-E11, C6-C11, A5-A9, X2, X4, X6, X7 (X3 deferred)
- [ ] F3 wave: I2, I3, I4, D1, T1, T2, T3 + the P3 family (I5-I8, D2-D8, T4-T8)

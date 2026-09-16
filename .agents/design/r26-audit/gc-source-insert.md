# R26-W-A3 — GC (source viewer + insert/edit modes) audit report

**Agent:** W-A3 (GC group). **Threads:** T#29, T#30, T#31, T#48, T#89, T#90 (GH #83, #84, #85, #102, #143, #144).
**Method:** DESIGN-R26 §3 — ASK (verbatim from digest) → OVERRIDE SCAN → LIVE PROBE (fresh runtime) → CODE CHECK → VERDICT.
**READ-ONLY.** No source file was edited.

## 0. Freshness + reference ground truth

- Runtime: `http://localhost:3000` index.json = **126 stories** (the R26-OPEN post-remediation count); the serving tree
  (`/home/z/my-project/shell-variants`) is **byte-identical to spec HEAD `46db450`** for all four target files
  (SourceEditBar.tsx / Viewer.tsx / useInsertPreview.ts / insertPlan.ts) — every probe below ran on HEAD.
- Spec ground truth extracted from `ui-mock/timeline_edit_modes (2).html` (743 L) BEFORE judging:
  - **6 mode cards** — Insert / Overwrite / Replace / Append at End / Ripple Overwrite / Fit to Fill; each with a 44×44
    `header-icon` SVG (two-tone: `#ffffff` = the incoming source, `#8c8c8c` = the timeline context, `#111111` knockouts
    on Replace) and a per-mode timeline mini-scene.
  - **Timeline grammar** — `.clip-ghost` = 2px dashed `#646464`; white 16×28 **down-arrow** at the insertion point in
    every mode; 28×16 white **right-arrow** (push) in Insert + Ripple ONLY; Replace narrows the incoming clip with a
    dual-pane split; Append's ghost sits at the track tail; Fit-to-Fill's `fit-slot` is a dashed slot with a dimmed
    (brightness .45) source frame + a **speed badge** (13×11 gauge SVG + `1.7x`); clips animate `left 0.4s ease-in-out`;
    view panels fade in `0.3s ease-in-out` + `translateY(4px)`.
  - `ui-mock/trim_edit_modes.html` read for context (green trim edges, dimmed inactive clips, red-border slip/slide,
    bright in-point previews) — the timeline-trim grammar T#31 references by analogy.

## 1. Verdict table

| Thread | ASK (gist) | Verdict | Evidence |
|---|---|---|---|
| **T#29** (GH #83) | use the ACTUAL SVG icons from `timeline_edit_modes (2).html`; hovering a mode button should animate the timeline effect (gentle fade, motion — not abrupt); missing insert/edit modes (only two buttons shown) | **PROPER** (1 nuance → fix queue P2) | Icons: `editModeIcons.tsx` extracts the 6 reference header-icon SVGs **verbatim** (path data + viewBox 0 0 44 44 byte-identical; only the recolor law `#ffffff→--text-primary`, `#8c8c8c→--text-muted`, `#111111→--bg-panel`). LIVE: rendered buttons' `path d` / `rect` geometry compared against the spec source — Insert `[2,14,10,18]/[32,14,10,18]/[14,4,16,18]` + chevron `M 18 26 L 22 30 L 26 26`; Overwrite `M 6 12 h 18 v 14 h -18 z`…; Replace/Append/Ripple/FitToFill all exact. 7th mode (Place on Top) = lucide `Layers`, documented NOT-in-this-reference deviation (nle_edit_workflow §3.4) — acceptable. Modes: **7 buttons always visible** (live at 1920 AND 1280 canvas; `SourceEditBar.test` pins "ALL SEVEN mode buttons are always visible inline — no kebab"). Animation: `.insert-preview-anim { animation: insert-preview-in 0.3s ease-in-out both }` = the reference's own fadeIn + translateY(4px) (app.css:230-247), `prefers-reduced-motion` honored; LIVE computed style on the armed layer = `insert-preview-in 0.3s ease-in-out`. Nuance: the fade-**out** (hover-out) is an instant unmount — no exit transition (the reference defines only fadeIn; registered P2). |
| **T#30** (GH #84) | allow selecting/trimming the range of the source under the SOURCE preview player | **QUICKFIX** (commit proper; hover preview is range-blind — fix queue F1) | Commit path PROPER: `SourceRangeBar` (in/out pointer-drag handles + keyboard sliders + B7 release discipline), range band + **out-of-range dim on the strip** (`shell-source-dim-left/right`, bg-black/50 — never the poster), live readout `Range 00:00:04:11–00:00:13:21 · 00:00:09:10 of 00:00:18:14`. LIVE end-to-end: dragged IN→4.46 s, OUT→13.88 s, clicked Insert → new clip `el-mu3v5ws8-1` minted at 15.99 s with **dur 9.4 s = out−in** (not the 18.6 s source), straddler `el-2-b…` split half lands at 25.4 s, followers el-3/el-4 shifted +9.42 s — the CROPPED range drives the insert (useUiStore.ts:1711 passes `sourceRange`; insertPlan `sourceDurOf/sourceStartOf`; pinned in SourceRangeBar.test "the W4 seam" 3 tests). **THE GAP:** `useInsertPreview.ts` builds the plan ctx as `{playhead, loop, selection}` — **no `sourceRange`** (file has exactly one commit, R20-W2 a44d715; the R22-W4 commit-path fix was never mirrored). LIVE proof: same armed hover with the range set → ghost `data-dur="18.6"` (full source) while the commit places 9.4 s; status line "Preview: insert drone_launch.mp4 … 2 clips shift" likewise full-length. Preview≠commit exactly in the crop case; no test pins preview-with-range (Timeline.test never combines `sourceRanges` + `hoverInsertPreview`). |
| **T#31** (GH #85) | the source preview is the place for play controls + trim edit controls (like NLE track trims, applied to source for timeline insertion) | **PROPER** (carries T#30's F1 caveat) | Viewer.tsx source transport row (W1-B): [live source TC] [5-button transport — goto-start/step/play/step/goto-end, the program grammar] | divider | [SourceEditBar flex-1 basis-190px] [trim cluster `[` `]` `×`] [duration readout]. LIVE: play toggles to pause icon and the source TC advances 00:00:08:09 → 00:00:09:15 over ~1.1 s (honest moving playhead over the still poster — A1 law); play-at-domain-end is an honest instant stop. Trim cluster: trim-in/out reset the range edges to head/tail, clear removes; each carries the honest `aria-disabled` + reason tip when the commit would be a no-op (Viewer.tsx:806-871). Playhead-domain ruling: with a range set, scrub/Home/End clamp to [in,out] (store `sourceDomainOf`; SourceRangeBar aria domain = live range). |
| **T#48** (GH #102) | hovering the edit-mode buttons should clearly show the edit mode; most timeline visualizations broken/wrong (some can't even be visible — should scroll/zoom so the affected place is visible); animated effects (none) | **PROPER** (1 edge → fix queue P3) | Mode badge: LIVE "Insert" pill at the ghost's head (`insert-preview-mode-badge`, MODE_LABELS single-sourced from the button table — R23-WE D-E2). Reference grammar all live on the armed layer: dashed ghost + white 16×28 down-arrow (SVG path VERBATIM) + right-arrows on displaced followers (insert/ripple only, by construction `arrows:{down,right}`) + overwrite-span hatch + split tick/split ghost + fit-to-fill speed badge (verbatim gauge + computed rate). Scroll/zoom: `scrollIntoView({inline:'nearest'})` on rAF for ghost **and** split ghost (Timeline.tsx:1259-1278) + the **zoom-floor bump** `PREVIEW_MIN_SPAN_PX=24` (one bump per arm via zoomBus) + the refused path scrolls to the playhead. LIVE: playhead parked at 16 s off-screen at zoom → hover → scrollLeft 0 → 2973, the affected region revealed. Edge (P3): when the region is WIDER than the viewport (extreme zoom, long source), the sequential ghost→splitGhost `scrollIntoView` lands on the split ghost and the mode badge / insertion head can sit off-screen (live: ghostStart −686 px, badge out of view); the "union span" the comment claims is not literally computed. Animated: the 0.3s fade+slide (see T#29). |
| **T#89** (GH #143) | "the preview window is strange no play control and the in/out crop is not functional" | **PROPER** (same F1 caveat) | Both halves re-probed live on HEAD: play control = the 5-button transport + ticking TC + 2px poster progress line (T#31 evidence); I/O crop = handle drags commit a range, band/dim/readout live, and the insert commits the CROPPED span (T#30 evidence). The R25-W1 rework (still = normal 5 s clip with honest scrub/play; real SourceRangeBar scrub strip) is the superseding implementation of the original complaint. |
| **T#90** (GH #144) | "the timeline insert mode previews are broken now?" | **PROPER** | Root cause (R25-W1 W1-A: the transport row's flex-1 wrapper starved to 0 px — the edit bar collapsed) is fixed by construction: the wrapper carries `flexBasis:190px` (the 7-icon floor) + the readouts degrade first + SourceEditBar's own ResizeObserver ladder (full labels ≥420 px → icon-only below; ONE row h-8, no wrap; overflow-x-auto only below the ~190 px icon floor). LIVE at the app floor **1280×800**: 7/7 buttons visible, `data-labels="icons"` (names survive in aria-label + data-tip); at 1920: `data-labels="full"`. At **820 px** canvas the honest window-too-small overlay governs (spec 18 §3.2 "overlay, not degradation", app.css:336 `@media (max-width:1279px),(max-height:799px)`) — below 1280 the edit bar is intentionally not the surface; the regression domain [1280,1920] is verified fixed. Preview layer itself: renders + animates (T#48/T#29 evidence). Tests: `RE-PIN W1-A` + `R25-F1-E2` label-threshold pins green. |

**OVERRIDE SCAN:** no later thread redefines the icon set or the mode grammar. T#31 supersedes T#30's placement wording
(same surface); T#89 supersedes the pre-R25 transport state (A1/R2 rework); T#90's root cause is superseded by the
R25-W1 flex rescue. All audited at the superseding contract per §3.2.

## 2. Test status (runtime tree == HEAD)

- `SourceEditBar.test.tsx` + `SourceRangeBar.test.tsx` + `insertPlan.test.ts`: **75/75 green**
- `Viewer.test.tsx`: **47/47 green**
- `Timeline.test.tsx` (preview block): **16/16 green**

## 3. Fix queue (for W-F)

- **F1 (the one real fix — T#30/T#31/T#48/T#89 WYSIWYG seam): `useInsertPreview` must pass the source range.**
  `src/hooks/useInsertPreview.ts` — subscribe `const sourceRanges = useUi((s) => s.sourceRanges)` and add
  `...(sourceRanges[hover.mediaId] ? { sourceRange: { start: sourceRanges[hover.mediaId]!.in, end: sourceRanges[hover.mediaId]!.out } } : {})`
  to the ctx (mirroring useUiStore.ts:1711), with `sourceRanges` in the useMemo deps so an armed preview re-mints when
  the range changes mid-hover. Add a pin test (Timeline.test or hook-level): hover armed with a set range →
  `ghost.dur === out−in` and the committed patch equals the previewed plan. Files: 1 source + 1 test. Closes the only
  QUICKFIX in this group.
- **P2 (polish, optional): preview fade-OUT.** The armed layer animates in (reference grammar) but unmounts instantly on
  disarm; the ask said "fading in/out". Would need a leave state (mount-once + exit class, or a 150 ms delayed unmount).
  Low priority — the reference itself defines only `fadeIn`.
- **P3 (edge, optional): union-span auto-scroll.** When the affected region is wider than the viewport, compute the
  ghost+splitGhost union and set `scrollLeft` once (instead of two sequential `scrollIntoView` calls, where the second
  wins) so the insertion head + mode badge stay in view at extreme zoom.

## 4. Live-probe evidence artifacts

- `shots/gc-insert-hover-preview.png` — armed Insert hover: ghost + mode badge + down/right arrows on the timeline.
- `shots/gc-source-mode-transport.png` — source mode: transport row (5-button + edit bar + trim cluster + readout) +
  range strip with dim outside [in,out].
- Probe log highlights (session `gc-insert-audit`, story `shell-appshell--edit`):
  - 7 buttons: `["Insert","Overwrite","Replace","Append at End","Ripple Overwrite","Place on Top","Fit to Fill"]`, icons verbatim.
  - Range: IN drag → readout `Range 00:00:04:11–00:00:18:14`, dim-left 24 %, band opacity .9; OUT drag → `Range 00:00:04:11–00:00:13:21 · 00:00:09:10 of 00:00:18:14`.
  - Preview vs commit: hover ghost `data-dur="18.6"` (full) vs committed clip dur **9.4 s** at start 15.99 s, split half at 25.4 s, followers +9.42 s.
  - Play: icon → pause, TC 00:00:08:09 → 00:00:09:15; play at out-point = honest instant stop.
  - Auto-scroll: playhead 16 s off-screen at zoom → hover → scrollLeft 0 → 2973 (region revealed); animation computed `insert-preview-in 0.3s ease-in-out`.
  - Narrow canvas: 1280×800 → 7/7 visible, `data-labels="icons"`; 820×820 → the spec-18 §3.2 window-too-small overlay (by design).

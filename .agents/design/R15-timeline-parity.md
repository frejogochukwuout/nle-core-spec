# R15 Design: Timeline UI Parity with opencut-timeline (canonical seam) — v2 FINAL

Status: FINAL after R15-C1 critique round (see worklog R15-C1). Scope: **UI layer only** — match canonical interaction/view contract of opencut-timeline. Keep our store/seconds/24fps/spec-09 JSON.

## Non-goals (explicit)
- No MediaTime ticks port (engine-side; seconds + snapToFrame at boundaries).
- No keyframe lanes on timeline (Inspector owns params in our spec).
- No bookmarks row (markers in ruler are the equivalent).
- Our keyboard map stays spec-16; zoom-factor + wheel-anchor rows get registered spec revisions (below).
- **Zero-anchor: IMPLEMENTED (not a non-goal)** — spec-05 §14.5A already adopts magnetic main-track normatively (C1 finding); the mock was the deviation.

## Registered spec revisions (this round)
1. **spec-16 §3.8**: zoom ± step factor 1.5 → **1.7** (canonical `TIMELINE_ZOOM_BUTTON_FACTOR`; test-anchored M30). Register in SPEC-REVISION-CANDIDATES.
2. **spec-18 §5A**: "zoom toward cursor" → **two-regime playhead-anchored zoom** (spec-05 §5.2 already pins two-regime; the two specs conflict — canonical + 05 win). Register with conflict citation.
3. Spec-05 §5.2 dynamic-min zoom + §14.5A zero-anchor + spec-06 trim constraints (1-frame min, neighbor bounds): **alignment**, no registration needed.

## Decisions

### T1. Zoom & view math
- **Zoom model**: `zoom ∈ [dynamicMin, 100]`, `pps = 50 × zoom`. **Dynamic min = zoom-to-fit with headroom** (spec-05 §5.2 + canonical): `min = clamp((containerW · 0.25)/(max(dur,1) · 50), 0.1, 100)`, recomputed on duration/viewport change (ResizeObserver on lanes scroller; jsdom fallback 900 like measureLanes). Store keeps `pxPerSec`; bounds derived [50·min, 5000]. Default pps 46.
- **Slider log-maps against DYNAMIC min**: `slider = log(z/min)/log(100/min)`; **0.15 threshold measured on this mapping** (fit ⇒ slider 0 ⇒ always no-anchor regime at min). Step 0.005.
- **⌘\\ / toolbar Fit stays fill-style** (spec-16 intent, content ~90% width `(W−24)/(dur+2)`) but clamped ≥ dynamic min — both min-zoom and fit exist (like real NLEs). zoom-to-selection keeps 80% rule.
- **Zoom step ×1.7 / ÷1.7** (registered revision above).
- **Port a stripped ZoomController** (canonical `zoom-controller.ts`, adapted): class owns `preZoomScrollLeft` captured INSIDE setZoomLevel at dispatch (before browser auto-clamps scroll on content shrink), `prePlayheadAnchorScrollLeft`, `isInPlayheadAnchorMode`, `previousZoom`. Layout-effect `applyZoomLayout()` after re-render: slider% ≥ 0.15 → keep playhead viewport offset (`next = timeToPx(playhead, newZoom) − (timeToPx(playhead, prevZoom) − preScroll)`, clamp [0, scrollW − viewW], write lanes + ruler same tick); < 0.15 → no adjustment; crossing up saves pre-anchor scroll + sets mode; crossing down restores + clears. Scene switch clears mode + resets scroll (stale by construction).
- **Wheel**: one non-passive capture listener on the timeline region (lanes scroller). ctrl/meta → zoom: rAF-coalesced (accumulate deltas, one app per frame), `normalizedDelta = deltaMode===1 ? deltaY·16 : deltaY`, **capped ±30**, `factor = exp(−Δ/300)`, preventDefault. Non-zoom: preventDefault + manual scroll — horizontal (shift or |δX|>|δY|) → `scrollLeft += sign·min(|raw|, 40)`; else `scrollTop += deltaY` (canonical exactly; kills trackpad momentum — accepted deviation-free).
- **Device-grid snapping**: `round(px·dpr)/dpr` helper in `lib/pixel.ts`; Clip/Ruler/playhead/marker positions use snapped values. Playhead 2px center-aligned (left = px − 1), head triangle kept.
- **Dynamic content width**: `max(contentPx + padding, viewportW)`; padding = 0.75 → 0.15 of container width as slider% → 0.2. **Single source** in `lib/pixel.ts` (dedup Timeline.tsx:124 / Ruler.tsx:141).
- **Constants consolidation**: zoom bounds/factor/slider-map live in `lib/pixel.ts` (dedup useUiStore:183, TimelineToolbar:41, useShortcuts:15, shortcutMap:75 references import from it).

### T2. Gesture discipline
- **5px threshold** (strict >, both axes) for move/marquee; **drag-back-cancel** (< 5px at release = cancel); **buttons-bitmask** (`buttons & 1 === 0` mid-drag → cancel); **lastGestureWasDrag** flag persists past mouseup.
- **Right-click on clip**: select-if-unselected WITHOUT stopPropagation; **context-menu routing**: single `contextmenu` handler on the scroll surface, `closest('[data-clip]')` → clip menu, else empty-lane menu (replaces per-clip stopPropagation pattern).
- **Seek click gate**: ≤5px && ≤500ms.
- **Escape ladder**: active gesture → selection clear (ladder exists; wire drag-cancel before clear).
- **Edge auto-scroll** during clip drags + playhead scrub: 100px threshold, 15px/frame max, ramp `1 − dist/100`; NOT during marquee.

### T3. Cross-track drag & placement (canonical decision tree — corrected)
- 2D move: horizontal + vertical (≥5px engages track resolution). `clickOffsetTime` from viewport rect.
- **Compatibility** (spec-06 §5.9): video → main + overlay; image/text → overlay; audio → audio. Locked excluded. `laneHeight` uses variant-aware model (clipStyle × trackHeightPref × audioLaneBoost), ruler-zone offset (zoneH) subtracted for Y hit; contiguous lanes (1px borders) — hit row = floor((y − rulerZone)/rowHeight), no gap resolution needed (canonical gap law N/A).
- **Resolution = canonical preferIndex exactly**: hovered track compatible + fits → existing track; **else → NEW track** at hover position (above/below by half-row; pre-minted id at drag start for stable identity). NO invented outward fallback. (Outward mapping applies only to GROUP MEMBERS around the anchor's resolved target.)
- **Group moves**: anchor = dragged clip; members keep time offsets; existing-track path maps members OUTWARD around anchor target (up for above, down for below, skipping used/locked/incompatible); **mixed audio+non-audio group → newTracks path REJECTED** (spec-05 §8.3 note 3 normative) — existing-track path still allowed (linked A/V pair el-2↔el-7 moves fine: video→main, audio→audio).
- **Overlap: REJECTED, never shifted** (half-open [start,end)); virtual removal of movers before revalidation (groups shuffle within themselves); intra-batch overlap → batch rejected.
- **Zero-anchor (magnetic main)**: insert/move targeting main → if main empty → 0; if requested start ≤ earliest main element start → 0. Drag preview shows adjustedStartTime (anchor line). Sole-main group pins at 0. ~20 lines + preview.
- **Anchor clamp**: group left edge ≥ 0 (`min anchor = −min(timeOffsets)`).
- Failed resolution (existing+new both impossible — rare): mouseup no-op, element stays (canonical); honest toast.
- **Store**: `moveElements({moves: [{id, trackId, startTime}], createTracks: [{kind, insertAboveTrackId?}]})` — ONE history entry; overlap revalidation + zero-anchor + anchor clamp inside. `moveElement` delegates. **Alt-drag duplicate + cross-track**: release with Alt → duplicate then moveElements copies to resolved target (one entry).
- **Ripple delete upgrade**: replace single-span shift with canonical **vacated−joined interval diff** (fixes observably-wrong non-contiguous multi-delete: delete el-1+el-3 shifts el-4 correctly). Pure function in store.

### T4. Trim & tool gestures
- **MIN_DUR = 1 frame** (1/24s; spec-06 alignment, no registration).
- **Neighbor bounds + source-extent bounds** on both edges (non-selected neighbors, same track; `sourceDuration` from media pool — mockData fixture has it; fallback ∞).
- **Frame-snap-once + single-owner**: the GESTURE computes final (start, dur) from ONE frame-snapped delta; store trusts (no double re-snap). Trim handles: **selected-only, 8px, offset ±4px OUTSIDE edges** (canonical) — replaces 12px inside strips; active in select/roll/ripple/stretch tools.
- **Batch trim**: `trimElements(members: [{id, edge, delta}])` group API (selection trims together, bounds = intersection); one history entry. `trimElement` delegates.
- **Roll** (roll tool or ⌥drag edge with neighbor): A.right + B.left move same delta; bounds both sources + 1-frame mins; one entry.
- **Ripple trim** (ripple tool edge drag): trim + shift later same-track clips by signed delta; one entry. (Uses same interval math as ripple delete.)
- **Slip** (slip tool): position fixed; trimStart/End slide within [0, sourceDuration − duration]; one entry. (slipNudge exists — add gesture.)
- **Slide** (slide tool): clip moves between neighbors; neighbors trim to make room (bounded by their mins/sources); one entry.
- **Stretch** (stretch tool edge drag): duration changes, `speed = sourceSpan/duration` compensates; **rate clamp [0.01, 5]**; `speed` field already exists (mockData el.speed); one entry.
- Provenance: roll/slip/slide/stretch are spec-06 §10.5 OT-GAP (nle-engine/FreeCut reference) — implemented to spec-06 semantics, not canonical.

### T5. Snap upgrade
- Threshold 10px→time at current pps (zoom clamp ≥ dynamicMin; canonical formula equivalent). **Sources**: element edges **excluding locked tracks AND the dragged group/self** (fix: current includes locked + self on move), playhead, markers, in/out points. Closest-wins strict <.
- **Snap indicator**: 2px accent/40 line, z=40, spans timeline body **in viewport space** (left = labelsW? no — spanning lanes region, positioned by snapped content px − scrollLeft), active-gesture-only + snap-enabled. DropIndicator z=50 above it.
- Shift suppresses snap (all gestures). Head-drag adds marker/in-out targets (marker drag adds element edges).

### T6. Ruler
- CapCut tier tables @24fps (LABEL [2,3,5,10,15]f, TICK [1,2,3,5,10,15]f, SECONDS [1,2,3,5,10,15,30,60,120,300,600,900,1800,3600]); label ≥120px, tick ≥18px; tick divides label evenly; **ε 0.0001** modulo guard.
- Labels `MM:SS` (H:MM:SS at hours), `Xf` between (round(frac·24)).
- **effectiveDuration = max(scene duration, dynamicWidth/pps)** — ticks extend to fill viewport at zoom-out.
- **Virtualization**: render ticks in [scrollLeft − buffer, scrollLeft + viewportW + buffer], `buffer = max(200, (scrollLeft + viewportW)·0.15)`; scrollLeft as reactive state (re-render on scroll — canonical cost).
- Brackets/markers: snapped px positions.

### T7. Marquee
- 5px activation (was 4); additive (shift/ctrl/meta) = live-merge ratchet (grow-only); non-additive replace; follow-up click swallowed one rAF; hit-testing stays interval+lane-band.

### T8. Playhead & playback
- **Seek clamp [0, scene duration]** (replaces 600; head-drag clamps too — currently unclamped).
- Follow-scroll **while playing only** (never mid-scrub): playhead px outside viewport → `scrollLeft = clamp(playheadPx − viewportW/2, 0, scrollW − viewW)`. Home: Timeline effect reading store playhead + playing (scroll DOM via `#timeline-scroll` precedent).
- Ruler-scrub: element-snap off initially (no jump), on after first move; head-drag: on from start; frame-snap always.
- Playhead px device-grid snapped.

### T9. Virtualization & chrome
- Clip virtualization: skip clips outside [scrollLeft − 200, scrollLeft + viewportW + 200]; selected/dragged never skipped. scrollLeft + viewportW reactive (shared with T6).
- z-order: lanes 0 → clips 1 → ghost/insert 10 → snap indicator 40 → **dropIndicator 50** → playhead 100.
- Selection ring 1.5px accent (keep current if equivalent).

## Test-contract changes (deliberate)
Zoom tests (two-regime, dynamic min, 1.7, wheel discipline), ruler tier tests, trim tests (bounds, 1-frame, batch), move tests (cross-track, overlap, zero-anchor, mixed-group), ripple-delete interval-diff tests, snap indicator tests, marquee ratchet, follow-scroll, virtualization, device-grid, seek clamp.

## Waves
T1 (pixel lib + zoom controller + ruler tiers + virtualization — they interlock) → T2 (gesture discipline) → T3 (cross-track + placement + ripple diff) → T4 (trim + tools) → T5 (snap + indicator) → T6/T7/T8/T9 (consolidation: marquee, playhead, virtualization, chrome). Each: implement + tests + commit + push.

## v2 changes from C1 critique
- Zero-anchor inverted → implemented (spec-05 §14.5A normative).
- Dynamic minZoom adopted (spec-05 §5.2); 0.15 on dynamic-min mapping; Fit stays fill-style clamped ≥ min.
- T3 outward fallback removed (canonical preferIndex exact); mixed-group rejection added; Alt-drag + cross-track specified; ripple-delete upgraded to interval-diff.
- ZoomController port specified (pre-capture at dispatch); constants/contentW deduped via lib/pixel.ts.
- MIN_DUR note dropped (alignment); trim batch + snap-single-owner + source-extent bounds added; handles outside-edges; speed field reused + rate clamp.
- Context-menu routing via single handler; seek clamp domain; follow-scroll home + upper clamp; effectiveDuration + ε + buffer formula; dropIndicator z=50.
- Spec-16 §3.8 + spec-18 §5A revisions registered.

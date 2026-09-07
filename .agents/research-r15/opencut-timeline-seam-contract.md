# R15-R1: Canonical Timeline Seam Contract — opencut-timeline

Source: `/home/z/ref-opencut-timeline` (frozen clone, 423/423 tests). Research-only artifact; the authoritative numbers for timeline parity. Maintainer: R15 main agent.

## Layer map
APP SHELL → UI LAYER (`src/components/timeline/**`, React) → CONTROLLERS (framework-free gesture state machines) → ENGINE (`TimelineCore` + pure modules) → RENDER SEAMS. Controllers never import the engine; engine never touches DOM/React.

## 1. Time & data model
- `TICKS_PER_SECOND = 120_000` branded MediaTime; round-half-away-from-zero; Euclidean frame math (`div_euclid`/`rem_euclid`).
- FrameRate rational presets (23.976=24000/1001 … 60). Timecode HH:MM:SS:FF non-drop.
- `SceneTracks = { overlay: OverlayTrack[]; main: VideoTrack (singleton); audio: AudioTrack[] }` — display order overlay…, main, audio….
- 7 element kinds (video/image/text/sticker/graphic/effect/audio), BaseTimelineElement `{id, name, duration, startTime, trimStart, trimEnd, sourceDuration?, animations?, params?}`.
- Track heights: video 65, text 25, audio 50, graphic 25, effect 25; gap 6px; labels col 112px; ruler 22px; bookmarks row 16px; top padding 2px; scrollbar allowance 7px on playhead span.
- IDs: `prefix-<counter base36 padStart 6>`; counter seeded from all existing ids on fromJSON.

## 2. View math
- `BASE_PPS = 50`; `pps = 50 × zoom`, zoom ∈ [0.1, 100]; `TIMELINE_ZOOM_BUTTON_FACTOR = 1.7`.
- Zoom slider exponential: `sliderToZoom = minZoom·(maxZoom/minZoom)^slider`; `zoomToSlider = log(z/min)/log(max/min)`.
- Zoom-to-fit min: `(containerWidth·0.25)/(safeDurationSec·50)` clamped [0.1,100]; safeDuration = max(dur,1).
- Content padding: 0.75→0.15 of container width as zoom-percent reaches 0.2; `dynamicWidth = max(content+padding, viewport)`.
- Device-grid rounding: `snapPixelToDeviceGrid = round(px·dpr)/dpr` — all element/ruler/playhead positions use the snapped variant.
- Playhead line 2px, center-aligned (`left = px − 1`).

## 3. Ruler (CapCut pattern)
- LABEL_FRAME_INTERVALS [2,3,5,10,15]; TICK_FRAME_INTERVALS [1,2,3,5,10,15]; SECOND_MULTIPLIERS [1,2,3,5,10,15,30,60,120,300,600,900,1800,3600].
- MIN_LABEL_SPACING_PX 120; MIN_TICK_SPACING_PX 18; tick interval must divide label interval evenly.
- `pixelsPerFrame = 50·zoom/fps`; pick first frame-interval with pps·interval ≥ spacing, else first second-multiplier, else 60.
- Labels: `MM:SS` at second boundaries (H:MM:SS at hours), `Xf` between (frames within second, round(fraction·fps)).
- Virtualization: buffer `max(200, (scrollLeft+viewportW)·0.15)`; render only visible tick indices.
- Label ε 0.0001 on modulo test.

## 4. Zoom behavior (the two-regime anchor)
- `TIMELINE_ZOOM_ANCHOR_PLAYHEAD_THRESHOLD = 0.15` slider percent.
- setZoomLevel captures preZoomScrollLeft BEFORE zoom change; after re-render (layout-effect):
  - regime ≥ 0.15: keep playhead's viewport offset stable → `nextScrollLeft = timeToPx(playhead, newZoom) − (timeToPx(playhead, prevZoom) − preZoomScrollLeft)`, clamp, write to tracks scroller AND ruler follower same tick.
  - regime < 0.15: NO scroll adjustment.
  - Crossing up saves pre-anchor scroll; crossing down restores it.
- Wheel zoom: ctrl/meta first (preventDefault, non-passive capture listener); `normalizedDelta = deltaMode===1 ? deltaY·16 : deltaY`; capped ±30; `factor = exp(−capped/300)`; rAF-coalesced (one application per frame, event-count independent).
- Plain wheel: horizontal (shift or |δX|>|δY|) → `scrollLeft += sign·min(|raw|,40)`; else vertical.

## 5. Gesture discipline (universal)
- `TIMELINE_DRAG_THRESHOLD_PX = 5` (both axes) for element drag, keyframe drag, marquee, bookmark drag; seek click additionally ≤500ms.
- Document/window listeners attached at session start, removed at end (never React synthetic on drag path).
- Constructor-bound handlers as stable refs; configRef read LIVE (never captured).
- Drag-back-cancel: drag ending within 5px of origin = cancel, not commit.
- Buttons-bitmask: `buttons & 1 === 0` mid-drag → cancel.
- Escape ladder: cancel active gesture → clear keyframe selection → clear element selection.
- Right-click on element: select-if-unselected, NO stopPropagation (context menu needs bubble).
- `lastGestureWasDrag` persists past mouseup — follow-up click never re-toggles.
- Shift on mousedown = additive selection; shift suppresses snapping in every drag/scrub.
- Edge auto-scroll during element drags + scrubs: threshold 100px, max 15px/frame, ramp `1 − dist/threshold`. NOT during marquee.

## 6. Clip drag (element-interaction)
- mousedown: button 2 → select + return; modifiers → additive merge/toggle; drag group = clicked element if selected else selection if isSelected else [element].
- `clickOffsetTime = round((clientX − elementRect.left)/(50·zoom)·120000)` — viewport-space rect.
- pending → dragging at >5px. Then: moveGroup built; frame-snapped mouse time; snapping unless disabled/shift; **reservedNewTrackIds pre-minted** (stable new-track identity across recomputes).
- updateDropTarget: mouseX = clientX − scrollerRect.left + scrollLeft; mouseY = clientY − scrollerRect.top + scrollTop (− header height if any). computeDropTarget → resolveGroupMoveForDrop; newTracks fallback if existing fails.
- mouseup: dragging but back within 5px → cancel; commit `moveElements({moves, createTracks})` only if any member changed track or startTime.
- Drag preview renders from controller view (currentTime + memberTimeOffsets; translateY = mouse ΔY), NOT engine state.

## 7. Drop-target computation (pure)
- Ordered tracks overlay…, main, audio…. `xPosition = startTimeOverride ?? round(mouseX/(50·zoom)·120000)`.
- Y hit: walk cumulative heights (+2px top padding + per-track extra); gap hits (6px) resolve by drag direction: up → track i bottom, down → track i+1 top; above all → new track at 0; below all → last.
- Replace-target: first element with `startTime ≤ t < end` and type ∈ targetElementTypes → drop no-ops.
- `resolveTrackPlacement` preferIndex at hovered track; `hoverDirection = relativeY < height/2 ? above : below`; existingTrack → xPosition overwritten by placement adjustedStartTime (main zero-anchor visible during drag); newTrack → {insertIndex, insertPosition}.

## 8. Snapping
- Threshold in TICKS: `(10px / (50·max(zoom,0.1)))·120000` — 0.2s @ zoom 1; NOT fixed screen px.
- Sources (lazy, no dedup): element edges start+end all tracks (exclude dragged group/self), playhead, bookmarks (exclude dragged), keyframes (element.startTime + key.time), custom seam.
- Closest-wins: `dist ≤ threshold && dist < closest` (strict < → earliest wins ties).
- Snap indicator: 2px primary/40 line over whole timeline body (z 40) while an ACTIVE gesture holds a snap point AND snapping on; playhead handle brightens when snapping to playhead.

## 9. Trim (resize controller)
- Left-button gate before stopPropagation; active session cancelled first; members = selection if clicked ∈ selection else [element].
- rawDelta ticks = round(((clientX − startX)/(50·zoom))·120000); shift or snapping-off → raw; else snap sources = element edges (excluding members) + playhead + keyframes; per-member moving edge, closest-wins; deltaTime = snappedEdge − baseEdge.
- Group resize: per-member neighbor bounds (non-selected elements): left = max end ≤ start; right = min start ≥ end. Min duration 1 frame. Delta bounds intersection; snap-to-frame ONCE then re-clamp (source-extent beats frame alignment). −0 → 0.
- Left patch `{trimStart: max(0, trimStart + srcDelta), startTime + delta, duration − delta}`; right `{trimEnd: max(0, trimEnd − srcDelta), duration + delta}`. Invariant trimStart + duration·rate + trimEnd == sourceDuration.
- mouseup: commit ONLY if any patch field differs (NOOP trims never create history); previewElements on every move; discardPreview on cancel/release.
- Escape cancels → discardPreview.

## 10. Ripple
- Ripple delete = delete, then per-track before/after span diff: vacated (removed spans + tail shrinkage) − joined (new spans) = freed intervals; each freed [s,e) shifts elements with startTime ≥ e LEFT by (e−s), per track, sorted descending.
- Ripple is a VIEW-LEVEL mode routing deleteSelected → rippleDelete, gating split-left seek.

## 11. Split / retime
- Split strictly inside (edge = NOOP); left duration = t−start, trimEnd += rightSourceSpan, name "(left)"; right new id, start = t, duration = end−t, trimStart += leftSourceSpan, name "(right)"; source-span snap-once keeps left+right == total. Split selects right fragments. Q/W remove the NAMED side (retainSide = opposite).
- Retime rate clamp [0.01, 5]; `sourceTime = clipTime·rate`.

## 12. Placement strategies (5)
1. explicit {trackId} — engine guards overlap.
2. firstAvailable — first compatible track where ALL spans fit; else alwaysNew highest.
3. preferIndex {trackIndex, hoverDirection, verticalDragDirection?} — preferred when compatible+free, else new track (audio clamped below main; visual ≤ main index).
4. aboveSource {sourceTrackIndex} — above if compatible+free; else firstAvailable; else new highest.
5. alwaysNew {highest|default} — audio highest = overlayLen+1; visual highest = 0; default: audio overlayLen+1+audioLen, effect 0, else overlayLen.
- Overlap policy: REJECTED not shifted (half-open [start,end)); engine revalidates after virtually removing moving elements (groups can shuffle within themselves); intra-batch overlap → whole batch null.
- Magnetic main: main empty → 0; requested ≤ earliest main start → 0. First insert at t>0 lands at 0. Sole main element can never leave 0. insertElements offsets batch so FIRST element sits at startTime.

## 13. Playhead/seek
- Seek = clamp[0,duration] → frame-snap. Duration = max element end across ALL tracks.
- Scrub from ruler: initial element-snapping DISABLED (no jump); from handle: enabled; shift suppresses. mouseup re-seeks final frame-snapped time.
- Ruler click without movement → one final no-snap scrub.
- Playback follow-scroll only while playing AND not scrubbing: when playhead pixel outside viewport → scrollLeft = clamp(playheadPx − viewport/2).
- play() at end → restart 0; empty timeline play = no-op.
- rAF ticker advances round(elapsedMs/1000·120000) ticks; pause at duration.

## 14. Marquee
- Activation >5px either axis; initialSelectedIds snapshot; additive = ctrl||meta default (view may widen for element marquee to shift||ctrl||meta).
- Hit-testing = PURE layout math in content coordinates (cumulative heights + timeToPixels), not DOM rects; inclusive edges.
- Additive = live-merge ratchet (selection only GROWS). Non-additive = replace.
- justFinishedSelecting (one rAF) swallows follow-up click. No edge auto-scroll. user-select:none from mousedown.

## 15. Engine discipline
- previewElements(patches) stages id-keyed overlay on getTracks(); commitElements = one undo entry per gesture; placement resolution always vs COMMITTED state.
- Snapshot undo 100 deep; NOOPs never create history (same-object or null); redo cleared on commit; selection restore journaled at view layer (depth+label keyed).
- to/fromJSON seeds id counter.

## 16. Keyboard map (capture-phase, overlay gate FIRST, typable guard, focused-playhead arrow ownership)
Space/K play·pause; L/J ±1s (shift ±5s); ←/→ frame-step; Shift+←/→ ±5s; Home/Enter start; End end; S split; Q/W split-side (named side REMOVED); Backspace/Delete delete; Shift+Backspace ripple delete; N snapping; Ctrl+A select all; Escape ladder; Ctrl+D duplicate; Ctrl+Z/Ctrl+Shift+Z/Ctrl+Y undo/redo; B bookmark.

## 17. Visual chrome
- Classic tokens: app-bg hsl(0,0%,5%), background 10%, foreground 85%, primary hsl(200,90%,52%), border 18%, destructive hsl(0,83%,50%). Radii 0.35rem. 0.72rem type.
- Clip type hexes: text #5DBAA0, audio #8F5DBA, graphic #BA5D7A, effect #5d93ba; video/image/sticker = tiled 16:9 thumbnails.
- Selected ring: boxShadow 0 0 0 1.5px primary. Hidden/drop-target: opacity .5.
- Resize handles: selected-only, 8px wide, offset ±4px outside edges, w/e-resize cursors.
- Keyframe diamonds: unrotated 14×14 hit target, 11px rotated-45 glyph; gated at element width ≥ 40px.
- Expanded lanes 20px, bg-muted/50, PROPERTY_GROUPS ordering (transform/opacity → volume/color → background → params → effects).
- Waveform: 1px bars every 2px, bottom-anchored, DPR-scaled, viewport-virtualized, curve ((db+40)/40)^1.5, floor −40dB, burn cap rgba(255,110,20,.9) when output > 1.
- Volume line: x²-in-linear-gain over [−60,+20]dB, 0.1dB snap, 14px hit strip, absolute-position drag, preview→commit, tooltip, suppressed under volume keyframes.
- z-layers: trackRow 0, content 1, dragLine 10, dropIndicator 50, playhead 100, snapIndicator 40, contextMenu 400.
- Context menus: element menu {Split, Duplicate (single-sel), Mute/Unmute, Show/Hide, Expand/Collapse keyframes, Delete}; track menu {Mute, Show/Hide, Delete non-main}; viewport-clamped; ALL shortcuts suppressed while any overlay open.
- Element virtualization 200px buffer; scroll followers (ruler horizontal, labels vertical) synced from onScroll.

## 18. Parity checklist (the 43-point list)
See R15-R1 final message — geometry/scale (1–5), ruler (6–7), zoom (8–10), gestures (11–23), snapping (24–26), engine semantics (27–37), keyboard (38–39), chrome (40–42), testability (43).

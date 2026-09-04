# R15-R3: Current-State Audit — timeline + audio UI (pre-R15 baseline)

Scope: `ui-mock/shell-variants/` (Vite + React 19 + Tailwind 4 + Zustand, 596 tests, 3 skins A/B/C).

## 1. Timeline anatomy (current)
Files: `src/components/timeline/` — Timeline.tsx (443), Clip.tsx (564), Ruler.tsx (322), TrackHeader.tsx (198), TimelineToolbar.tsx (337), SceneTabs.tsx (113). No Track.tsx (lanes inline). `lib/timecode.ts` (24fps NDF + snapToFrame), `lib/waveform.ts` (seeded), `lib/mockData.ts` (spec-09 fixture).

- Pure DOM absolute positioning; `contentW = (duration+4)·pps`; clip `left = startTime·pps; width = duration·pps` (min 6px). **No virtualization.**
- Two synced scroll panes (headers ⇄ lanes, scrollTop mirror with loop guard); ruler sticky top-0.
- Clip modes per variant: filmstrip (80px thumbnails) vs blocks. Audio = SVG waveform bars + fade lines; text = centered label.

### Implemented interactions
| Interaction | Mechanics | Store |
|---|---|---|
| Clip move | Pointer capture; DragState{mode:'move'...}; optimistic; commit on release; Alt = duplicate (ghost, one history entry); Esc cancels | moveElement/duplicateElements |
| Trim | 12px strips L/R, ew-resize; clamp vs 0.25s MIN_DUR; select-tool only | trimElement |
| Ripple | deleteElements(ripple), trimToPlayhead(edge, ripple), ⇧⌫. **No ripple gesture; ripple TOOL pointer-dead** | deleteElements |
| Snap | snapToFrame always; snap on → 10px screen-space vs all clip edges (**incl. locked**)+playhead+0+duration. **No indicator** | read snap flag |
| Marquee | Pointerdown empty lane (button 0, unlocked); <4px = click→deselect; Esc; hit = interval + lane band | setSelection |
| Blade | Click on clip with blade tool | splitElement |
| Scrub | Ruler press-drag (gesture-origin gate) + 18px head drag w/ snap | setPlayhead |
| Zoom | ⌘/Ctrl+wheel anchored-at-pointer exp(−Δ·0.0018) via non-passive native listener + rAF scrollLeft correction; Shift+wheel ×10 pan; log-slider 8–240pps; ± ×1.5; ⌘\ fit; ⌘0=46; zoom-to-selection; magnifier | setZoom/zoomStep/zoomFit (clamp 8–240) |
| Pool drag | HTML5 DnD, per-lane allowed; **drop = honest toast only** | toasts |
| Effects drag | x-nle-effect JSON → addEffectToElement/setTransition | real writes |
| Menus | empty-lane/clip/ruler/track-header (§4.9) incl. split/dup/ripple-delete/marker palette/height/add above-below; multi-delete ≥5 confirms | various |

### View math (current)
One scalar `pxPerSec` 8–240 (default 46), log slider. Float seconds; snapToFrame (1/24s) at commits. Ruler ticks fixed thresholds: labels 2s/5s/15s; minor 1s/5s; frame ticks ≥110pps. No sub-second ticks 20–110pps. Tick DOM linear in duration×zoom.

### Track model
3 kinds (overlay/main/audio); heights trackHeights(kind, clipStyle) (filmstrip 80/60/60, blocks 40/34/28) × trackHeightPref (global; B3 deviation) × audio-focus boost. Per-track muted/solo/locked/visible/waveform via toggleTrackCmd. Add above/below. **No delete, no reorder, no per-track height, no rename.**

### Gaps vs canonical (summary)
No drag threshold; **move horizontal-only (no cross-track)**; **no overlap resolution**; 5/7 tools pointer-dead (roll/ripple/slip/slide/stretch); no snap visuals; no roll trim; no trim-to-neighbor; no zoom anchor regimes; no virtualization; no multi-select batch move gesture; no lastGestureWasDrag persistence.

## 2. Store layer (current)
`src/state/useUiStore.ts` (837). View state + doc slice co-located (scenes spec-09) + mixer sidecar (mockMixer). Commands: moveElement, trimElement, splitElement, deleteElements(ripple), duplicateElements(at), slipNudge, trimToPlayhead, addTrack, toggleTrackCmd, toggleLockAll/MuteAll, setElementField, setTransition, effects, markers, markIn/markOut/clearInOut, scenes, loadSample.
Undo: hand-rolled withHistory, deep-clone snapshots, 50-deep, no-op skip, snapshots carry lockAll+selection. Doc only (view never undoable). Locked-track law double-guarded. Selection = string[]; linked A/V propagation gated by link flag. Playhead float seconds; rAF playback JKL shuttle; loop wrap. **In/out and loop share ONE loop{start,end}** (loopEnabled toggles shading).
Spec drivers: 18 §3.1/§4.5/§4.7/§4.9/§5/§6.2/§9; 05 §7/§9/§10/§12/§14; 16 keys; 06 §5.9; 09 JSON; 20 + DESIGN-audio-mode v2.2.

## 3. Audio/mixer audit (current — CRITICAL)

Components: mixer/MixerPrimitives.tsx (Fader/PanKnob/StripMeter), ChannelStrip.tsx (ChannelStrip/AuxStrip/MasterStrip), ChannelEditor.tsx, MixerDock.tsx (BridgeRail/FullDock), SoundLibrary.tsx; state/mockMixer.ts (MixerTrackSettings{fader −60..+6 dB, pan −100..100, inserts[2], auxA/auxB 0..1, auxPreFader, outputBus 0|1|2}, buses, ducking, roles).

Placement: side dock right of timeline lanes; 3 states collapsed/bridge(44px rail)/full; toggle cycle; Audio focus swaps Inspector→ChannelEditor, MediaPool→SoundLibrary; mixer = 7th F6 region. **This placement is per design-doc v2.2 revision — keep.**

### PanKnob (MixerPrimitives.tsx:81–123) — BROKEN
1. **Pivot = knob's bottom edge** (indicator at `top-full`, origin `50% 0%`) — stick orbits OUTSIDE the 22px dial; at pan=0 hangs straight down into label; ±135° flails below dial.
2. **Double −50% translate** (Tailwind 4 `-translate-x-1/2` emits independent `translate:` property that composes with inline `transform`) — 2px skew on a 2px element.
3. No dial face (no arc, no ticks, no center dot, no detent).
4. Drag horizontal-only (clientX, 1px = 1 unit, shift ×0.25); no detent at C.

### StripMeter (MixerPrimitives.tsx:131–183) — FUNKY
1. Hardcoded `#e8c331 72% / #d9913a 86% / #fa1024 94%` — **no green**, not tokens, identical all 3 skins.
2. **Red zone unreachable** (level capped ≈0.81; red starts 94%).
3. Amplitude-linear scale-y (−20dB → 10% height) — not dB.
4. No peak-hold, segments, dB marks, readout, mute state.
5. No ballistics while playing (instant wobble); L/R same value ×0.97.
6. Well `bg-black/70` hardcoded (clashes on light).

### Fader (MixerPrimitives.tsx:12–78)
14px track, 96px; thumb 12×10 hardcoded `#d8d8d8→#9a9a9e` (no light override). Linear-in-dB taper (db+60)/66 (0.69 dB/px — coarse). −60..+6, −∞ label, 6 ticks. Shift fine ×0.25, dbl-click 0dB, full keyboard grammar. Pointerdown jumps to position then relative.

### Channel strip (current)
badge+name → role chip → meter beside dB fader → PanKnob → M/S/L (16px) → 2 insert selects → A1/A2 send sliders → pre/post → output bus → ducking row (bgm/music). Widths 84/108. All writes via setMixerTrack/setAuxBus/setDucking — **state layer honest+complete; presentation broken.**

### Skin adaptation
Chrome adapts via tokens; hardcoded: meter gradient, fader thumb, meter well.

## 4. Test blast radius
~330/566 tests pin timeline+mixer: Clip 24, Timeline 24, TimelineToolbar 20, Ruler 12, TrackHeader 12, SceneTabs 10, useShortcuts 50, useUiStore 117, MixerPrimitives 11, ChannelStrip 13, ChannelEditor 12, MixerDock 9, SoundLibrary 8, mockMixer+lib 66.
**MixerPrimitives tests pin PanKnob horizontal drag + Fader taper math — audio redesign = deliberate test-contract change. Timeline zoom model change (8–240pps → 50×zoom) touches toolbar cluster tests.**

## 5. Top 10 weaknesses (ranked)
1. PanKnob geometrically broken. 2. StripMeter unprofessional + fake. 3. No overlap/collision semantics. 4. 5/7 tools pointer-dead. 5. No cross-track drag. 6. Snap UX primitive (locked targets, no indicator, fixed 10px). 7. Fader taper/visuals below standard. 8. Ruler fixed-threshold + DOM explosion. 9. In/out + loop share one object. 10. Undo doc-only, no coalescing.

## 6. Baselines to preserve
Optimistic-preview→commit + Esc-cancel; withHistory no-op discipline; locked-track double guards; anchored ⌘-wheel zoom non-passive; full keyboard ARIA grammar; honest-toast discipline; mockMixer G-slice state layer; 3-state dock placement.

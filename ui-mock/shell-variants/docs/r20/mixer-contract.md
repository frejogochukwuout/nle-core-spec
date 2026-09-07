# R20-A1 — MIXER LAYOUT CONTRACT + CURRENT-IMPLEMENTATION DIVERGENCE AUDIT

Task ID: R20-A1 (research, read-only). Input for rebuild agent **R20-W1**.
References audited in full: `ui-mock/audio_mixer.html` (901 lines, THE anatomy reference),
`ui-mock/audio_editor_ui.html` (300), `ui-mock/davinci_resolve_ui_mock.html` (1454, edit-only — no
mixer panel, only a `btn-mixer` toolbar stub at :684 and audio track-head RSM grammar at :429-457,
`AUDIO_ROW_HEIGHT = 34` at :1042). Current implementation audited in full:
`shell-variants/src/components/mixer/{MixerDock,ChannelStrip,MixerPrimitives,StripGraphs,ChannelEditor,SoundLibrary}.tsx`,
`src/state/mockMixer.ts`, `src/lib/meterEngine.ts`, `src/state/useUiStore.ts`, `src/styles/tokens.css`,
`src/stories/Mixer.stories.tsx`, all 5 mixer test files.

**Live-DOM evidence (measured, not guessed):** annotakit snapshot endpoints
`th_mto617w1_o4wqu5w8` (pre-R19 build: strip 108px, meter `w-full`, linear scale — the old "meter too
wide" bug, now fixed) and `th_mtp5yku1_98lrnht4` / `th_mtp63402_vxm5v8d0` (identical partial
fragments — the pinned wrapper, no dock DOM). PLUS a live headless-browser measurement of the CURRENT
build at `http://localhost:3000` (stories `shell-appshell--edit` and `shell-appshell--audio-focus`,
viewport 1440×894) — the numbers that expose the critical bug B1 below. All "MEASURED:" claims are
from that probe.

---

## 1. REFERENCE ANATOMY (normative — audio_mixer.html)

### 1.1 Board + strip frame
- Board `.mixer-board`: flex row, bg `#18191b`, border 1px `#121212`, shadow `0 10px 30px rgba(0,0,0,0.8)` (:43-48).
- Strip `.track`: flex **column**, **width 86px**, border-right 1px `#121212` (last-child none), bg `#242426` (:50-60).
- **All strips are 86px — including the master M1** (:838). Board = 7×86 + 6 dividers = 610px.
- Full strip height ≈ **757px** (sum of fixed rows :155-157 of r19-analysis/audio-cluster.md — my
  recount below gives 757-771 depending on border-box treatment; the fader section is `flex:1` and
  absorbs the remainder, so the strip height is container-driven, not fixed).

### 1.2 Per-strip vertical section stack (top → bottom, exact)
| # | Section (class) | Height | Key styles (quote) |
|---|---|---|---|
| 1 | `.track-header` | 28px (+3px border-top +1px border-bottom) | flex center; font 13px/600 `#ddd`; bg `#2a2b2d`; **`border-top: 3px solid transparent`** — colored per track: `.header-orange #d17528` (A1/A2), `.header-teal #229399` (A3/A5/A6), `.header-gray #4d4d4d` (A4). **Content = track ID only ("A1")**. M1: inline `background:#222`, no color (:839). |
| 2 | `.input-select` | 22px (+1 border-b) | bg `#1f1f1f`, text `#a0a0a0` 10px, padding-left 6px; content "No Input". M1: `visibility:hidden` (space kept). |
| 3 | `.fx-rack` | **105px** | flex column, padding `2px 4px`, gap 2px, bg `#1d1d1f`, border-b `#121212`. **5 slots**: 4 effect + 1 add. |
| 3a | `.fx-slot` | 18px (+1px border ×2) | bg `#272727`, border `#1a1a1a`, radius 2, padding-left 4px, font 10.5px; empty `#555`, `.filled` gold `#ceaa51` + ellipsis. `.add`: centered, `+` 14px `#888`. |
| 4 | `.i-btn-container` | 26px | flex center, bg `#242426`. `.i-btn` **16×16**, border 1px `#ceaa51`, gold text 10px, radius 2, content "I". |
| 5 | `.graphs` | ~66-70px (pad 4 + 28 + 2 + 28 + 4) | bg `#1c1c1e`, padding 4px, gap 2px. **2 × `.graph-box` height 28px**, border `#333`, bg `#222`. |
| 5a | graph strokes | — | EQ curve `#2dbbd2` 1.5; dynamics curve `#a3c42e` 1.5; threshold lines `#467cb4` 1.5. SVG `viewBox="0 0 100 30"`, 100%×100%. |
| 6 | `.pan-box-container` | 58px (pad 4×2 + 48 + 2 border) | bg `#242426`, border-b. `.pan-box` **48×48**, bg `#191919`, border `#333`. Crosshair: 1px `#2a2a2a` at top 50% + left 50%. Dots 4px round: **blue `#2fa1d6`** (mono pan pos, `top:25%`, left 45/50/20/80%) / **green `#62c362`** (stereo extent, A5/A6: green@10% + blue@50% + green@90%). |
| 7 | `.routing-btns` | 24px (+1 border-b) | flex, padding-left 6px, gap 4px. **Two 16×16 buttons**: `.b1` "1" green `#58b258`, `.b2` "2" gold `#ceaa51`, 9px bold, radius 2, transparent bg. |
| 8 | `.track-title` | 26px | flex center; font **11.5px/700 `#fff`**; `.gold` (Music) `#ceaa51`. **Content = track NAME** ("Dialog", "Laughter", …"Main 1"). |
| 9 | `.rsm-row` | 24px | flex center, gap 3px. `.btn-sq` **20×20**, bg `#383838`, border `#1a1a1a`, radius 2, `#aaa` 10px bold, `box-shadow: inset 0 1px 0 rgba(255,255,255,0.1)`. **R S M**; M1 row = **M only** (:868-870). |
| 10 | `.fader-section` | 380px (flex:1 — terminal) | `position:relative; flex:1; height:380px; display:flex; padding:4px 6px; bg:#242426` (:259-266). |

### 1.3 Fader-section geometry (THE centerpiece)
- **Order across the strip: `.scale` (14px) | `.fader-col` (flex:1) | `.meter-col` (14px)** — scale
  LEFT, meter RIGHT (:481-505).
- `.db-readout`: absolute `top:4px; left:6px`, font **9px `#ddd`/500**; format **signed 1dp, no unit**
  (`+0.3`, `−1.4`, `−5.3`, `−5.9`, `−11`, `−2.2`, `−0.5`). Sits in the 24px zone above the columns.
- `.scale`: **width 14px, margin-top 24px, height 340px**. `.scale-lbl`: absolute `right:2px`, font
  8px `#777`, `translateY(-50%)`. Marks (dB → top%): **0→15 · −5→28 · −10→42 · −15→55 · −20→68 ·
  −30→80 · −40→90 · −50→98** (:413-420).
- `.fader-col`: flex:1, margin-top 24px, height 340px, groove centered → **~46px wide hit column**.
- `.fader-groove`: **6px wide, 100% (340px)**, bg `#0c0c0c`, border `#1e1e1e`, radius 3,
  `box-shadow: inset 0 2px 4px rgba(0,0,0,0.8)`. `::after` = **0dB mark: `top:15%`, 1px `#888`,
  extends 2px past both sides** (`left:-2px; right:-2px`, comment `/* 0dB mark */`).
- `.fader-thumb`: `left:50%; translate(-50%,-50%)`, **22×36px**, `linear-gradient(#d6d6d6,#999)`,
  border 1px `#000`, radius 2, `box-shadow: 0 4px 6px rgba(0,0,0,0.5), inset 0 1px 1px #fff`, cursor
  pointer, z 2. Grip: 2px `#111` line at 50% (inset 2px) + 1px `rgba(255,255,255,0.7)` just above.
  **Thumb overhangs the 6px groove 8px each side.** Static thumb positions: 18/25/36/38/48/28%
  (A1-A6), 24% (M1) — decorative, NOT consistent with the readouts (mockup data).
- `.meter-col`: **width 14px, flex, gap 1px, margin-top 24px, height 340px**. Two `.meter-bar`
  (flex:1 → **6.5px each**), bg `#111`, overflow hidden. `.meter-bg` = full-height
  `linear-gradient(to top, green 0-75%, yellow 75-100%)` — **green 75% / yellow top 25%**,
  `--meter-green #1fd61f`, `--meter-yellow #e8e125`. `.meter-mask`: bg `#111` from top, height set
  inline → **bottom-up fill** (mask 20% = 80% level). `.meter-peak`: **1px yellow**, `top:N%` inline
  (M1 peaks explicitly `background: var(--meter-yellow)`).
- **Cross-strip dB gridlines** `.fader-section::before`: 1px `rgba(255,255,255,0.03)` horizontal
  bands at **15, 28, 42, 55, 68, 80, 90%** spanning the ENTIRE section (scale+groove+meter),
  pointer-events none, z0 (:269-285). *The meter has no own ticks — it shares the fader's grid, so
  0dB reads at 15% from top on the meter too.*

### 1.4 Piecewise dB taper (exact math — NORMATIVE)
Anchors (pos from TOP of the 340px travel, dB):
`0%→+10 · 15%→0 · 28%→−5 · 42%→−10 · 55%→−15 · 68%→−20 · 80%→−30 · 90%→−40 · 98%→−50 · 100%→−60`
(the +10 and −60 ends are implied by the travel ends; the reference labels stop at −50@98%).
Segment slopes: **+10→0: 1.5%/dB · 0→−5: 2.6 · −5→−10: 2.8 · −10→−15: 2.6 · −15→−20: 2.6 ·
−20→−30: 1.2 · −30→−40: 1.0 · −40→−50: 0.8 · −50→−60: 0.2 %/dB.** I.e. near-linear 0…−20,
compressing below −20; top 15% = +dB headroom. **This map applies to BOTH the fader thumb AND the
scale labels AND (per the shared gridlines) the meter's 0dB position.**
Current implementation of the map: `FADER_TAPER` / `dbToPos` / `posToDb`
(MixerPrimitives.tsx:40-79) — anchors EXACT, strictly monotonic, round-trips to float precision
(pinned by MixerPrimitives.test.tsx:28-71). **Verified correct.** Model range stays linear −60..+6
(mockMixer.dbToSlider `(db+60)/66`); the taper is display-only, drag routes px→pos→dB and clamps to
the model (MixerPrimitives.tsx:152-157, 214-217) — correct.

### 1.5 Master strip (M1) differences
- Header bg `#222` inline, **no top color**; input row `visibility:hidden` (22px kept); FX rack has
  2 filled slots (Phase/Multiband); I button KEPT; graphs kept (EQ = flat line).
- Pan box replaced by `.m1-empty-space` (**48px**, bg `#242426`) and routing row by
  `.m1-empty-routing` (**24px**) (:423-435, 862-866). NOTE: `.m1-empty-i` (26px) is defined but
  **UNUSED** in the markup. Reference arithmetic leaves the master fader ~10px misaligned vs
  channels — **our 56px/22px spacers (ChannelStrip.tsx:427,450) that align fader tops exactly are an
  improvement; KEEP the alignment, cite as accepted deviation.**
- RSM row = **M only**; title "Main 1" (white); db-readout −0.5; yellow peak lines.

### 1.6 Static data (fixture flavor, not normative geometry)
A1 Dialog(orange) +0.3dB · A2 Laughter(orange) −1.4 · A3 Foley FX 1(teal) −5.3 · A4 Foley FX
2(gray) −5.9 · A5 Ambience(teal, stereo pan) −11 · A6 Music(teal+gold title) −2.2 · M1 −0.5.
Reference track colors: **orange #d17528 = dialog family, teal #229399 = FX/ambience/music, gray
#4d4d4d** — a 3-family ramp, not per-role colors.

### 1.7 audio_editor_ui.html (secondary — clip-level params, not the strip)
CapCut-style clip editor: Volume slider **−24..+12 dB**, Pan **−1..1**, Pitch (semitones −12..12,
cents −100..100), 4-band interactive EQ (cyan `#06b6d4`, points r6 + halo r9, freq axis
62/250/1K/4K/16K, dB rails ±24). Already consumed by the Inspector audio tab (R19). For the mixer
rebuild it only informs ChannelEditor's field ranges; strip fader stays the spec-20 G-surface
(−60..+6).

---

## 2. PROPORTION LAWS (must hold at ANY dock height)

1. **Equal-height trio**: scale column, fader groove, and meter column share ONE height (340/340/340
   in the reference). Current code already enforces this via `--fader-col-h: 100%` on every column
   (ChannelStrip.tsx:175-192) — keep the mechanism.
2. **24px headroom zone above the trio** carries the dB readout (reference margin-top 24 +
   readout at top:4). Ours: `HeadroomReadout` h-24 (MixerPrimitives.tsx:99-109). The +dB region is
   the top 15% of the travel; the readout zone is NOT part of the travel.
3. **0dB at 15% from the top of the trio** — the same line lands on the scale "0" label, the groove
   unity notch, and (reference) the meter grid. The meter fill law must place 0dB at 85%-height, not
   at 100%.
4. **Thumb 22×36 and groove 6px are ABSOLUTE pixels** — they never scale with travel. Endcaps +
   unity notch at 15% (current: fader-endcap-*, fader-unity-notch, MixerPrimitives.tsx:241-250).
5. **Strip width 86 = 6 (fader-section pad) + 14 (scale) + 46 (fader hit col) + 14 (meter) + 6 (pad)**
   (the reference's only horizontal padding is the fader section's `4px 6px`). Meter pair = 2×6.5px +
   1px gap = 14px. Column order **scale | fader | meter**.
6. **Fader section ≈ 50% of the strip height** at reference scale (380/757) and it is the TERMINAL
   flex:1 block — nothing below the fader; accessory rows are fixed-height and sit above. At
   half-height this 50% law is kept by *compressing the accessory stack*, never by shrinking the trio
   below usable travel (see §4).
7. **db-readout: signed 1dp, no unit, 9px, top-left of the fader section.**
8. Accessory row pixels are FIXED (18px fx slots, 26px I row, 28px graph boxes, 48px pan box, 20px
   RSM buttons, 24px rows) — they compress by *hiding rows*, not by scaling them.

---

## 3. CURRENT DIVERGENCE AUDIT + BUG LIST

### 3.1 BUG LIST (functional — the "extremely buggy" evidence)

- **B1 — CRITICAL, live-measured: the channel strips are INVISIBLE and the aux strips render on top
  of them.** `FullDock` root: `max-w-[60%]` (MixerDock.tsx:133) inside a content-sized `shrink-0`
  wrapper (AppShell.tsx:297-301). The percentage resolves against the dock's OWN content
  (~394px) → dock caps at **237px** at 1440×894 (MEASURED on both `shell-appshell--edit` after two
  toolbar clicks and `shell-appshell--audio-focus`): the channel scroll region
  (`flex min-w-0 overflow-x-auto`, MixerDock.tsx:161) collapses to **clientWidth 0** → A1/A2 strips
  are clipped invisible; the pinned `AuxStrip`s (MixerDock.tsx:179-181) then lay out at **the exact
  same x/y/height as the hidden channel strips** (MEASURED: A1 and aux-a1 both 1068-1140×376;
  overlap = true), i.e. the user sees two AUX strips where the channels should be; the master strip
  (1212-1296) **bleeds 14px past the dock's right edge (1282) into the inspector**. This is the
  reviewer's pin (#59, th_mtp5yku1 → AppShell.tsx:298). Fix direction: replace `max-w-[60%]` with an
  explicit dock budget (e.g. `min(60cqw, 640px)` via container query units, or a JS clamp on the row
  width), give the channel scroll region a min-width floor, and never let aux/master overlap the
  channel region (render order + `shrink-0` on all three is not enough when the container is
  over-constrained).
- **B2 — HIGH: bridge rail stacks meters vertically in a 44px rail** (MixerDock.tsx:43-69,
  `flex-col`, each track `flex-1 min-h-[30px]`, StripMeter `width={17.5}`). Thread #61
  (th_mtp63402): "vertical stacking won't work [with many tracks]; show in full height vertically
  but minimized to a thin meter per track". With 4 tracks each meter gets ~¼ of the rail height;
  with 8+ the min-h-30 floor overflows. Redesign: side-by-side full-height thin meters (§4.3).
- **B3 — HIGH: compact dead zone 380-411px.** Compact threshold `< 380` (MixerDock.tsx:117) but
  non-compact minimum content = **412px** (fixed rows 288: 3 top bar + 24 header + 1 + 22 input +
  42 fx rack + 26 I + 66 graphs + 1 + 22 role + 24 RSM + 1 + 56 pan = 288, + fader min 124
  ChannelStrip.tsx:173). Between 380 and 411 the strip's content exceeds its box → the terminal
  fader overflows the strip bottom / a vertical scrollbar appears inside the strip row. (MEASURED at
  376px dock the compact mode engages — 148px fader travel — so the dead zone hits at viewport
  heights ~900-930px.)
- **B4 — MED: collapse icon never changes.** Both dock collapse buttons render a static
  `ChevronsRight` (MixerDock.tsx:90, 146). Thread #60 (th_mtp5yy3u): "when collapsed this icon
  should change". Also the icon lies today: in `full` it says "Collapse mixer" but the Edit-page
  cycle goes full→collapsed... actually `cycleMixerState` on Edit does full→collapsed (useUiStore
  1178-1184) while the bridge button goes bridge→full — two different semantics for the same glyph.
- **B5 — HIGH (visual starvation): the anatomy is a single binary compact flag.** `compact` only
  hides `strip-input` and `strip-graphs` (ChannelStrip.tsx:241, 255) and slims width 86→72 (:221).
  At the half-height budget (376px MEASURED), full anatomy would leave a **88px fader travel**
  (376−288); compact leaves 148px (MEASURED: faderCols 152.4, meter well 148.4). The reference's
  accessory stack (105px rack etc.) cannot exist at 260-400px — needs the §4 tier system.
- **B6 — LOW: R (record-arm) and I (inserts power) are component-local `useState`**
  (ChannelStrip.tsx:71, 137). They reset whenever the dock unmounts (state cycle bridge↔full,
  scene switch). Display-only (gap C40) but the reset is state-by-disappearance; move to the
  mixer sidecar or accept + document.
- **B7 — LOW: Fader lacks pointerup/pointercancel discipline** (MixerPrimitives.tsx:201-232 — no
  `onPointerUp`/`onPointerCancel`; relies on the `e.buttons !== 1` guard; `drag.current` is never
  cleared). `Knob` in the same file has the full release/cancel/detent grammar (324-395) —
  inconsistent; add release + lostpointercapture handling.
- **B8 — LOW (a11y): no `aria-orientation`** on the Fader hit column (vertical, role=slider,
  MixerPrimitives.tsx:202-209) or the PanBox (horizontal, :484-495). Global `:focus-visible`
  outline exists (app.css:51-52), so focus IS visible — orientation is the gap.
- **B9 — LOW: meter fill law ≠ fader taper.** Meter level = dB-linear `clamp((db+60)/60)`
  (meterEngine.ts:87-88 levelOf; StripMeter clipPath 571-585) → 0dB reads at 100% height and
  −18dB at 70%, while the fader's 0dB notch sits at 15% and the scale/grid say 15%. The strip's own
  two instruments disagree about where 0dB is. (Documented as deliberate 3-zone palette, gap C41 —
  but the *position* mismatch is a real coherence bug; see §4.4 for the reference-law fix.)
- **B10 — INFO: peak line styling** — ours 1px `bg-white/90` (MixerPrimitives.tsx:589) vs reference
  1px yellow; also ours sits at the dB-linear position (same law mismatch as B9).
- **B11 — INFO: bridge master meter is a 36px-tall, 4px-bar stub** (MixerDock.tsx:77) — glance
  surface only; replaced by the §4.3 meter-bridge column.

Meter engine ballistics (decay/peak/clip) verified CORRECT: attack instant, decay 20.1 dB/s
time-based, peak hold 1 s → 12 dB/s, clip ≥0 dB 2 s hold (meterEngine.ts:250-270); master
aggregation `min(1, Σ10^(db/20)/√n)` (:279-294); loop stop/re-arm rules hold. No changes required
beyond the display map (B9).

### 3.2 FIDELITY DIVERGENCES (visual, vs the reference anatomy)

| # | Reference | Current (file:line) | Severity |
|---|---|---|---|
| D1 | Column order **scale \| fader \| meter** (audio_mixer.html:481-505) | **meter \| scale+groove** — meter on the LEFT: FaderSection renders FaderCol meter first (ChannelStrip.tsx:290-298), Fader renders scale inside its own column (MixerPrimitives.tsx:181-198). ChannelEditor.tsx:255-260 same mirror. | HIGH — "spatial layout… faithfully reflected" |
| D2 | Cross-strip dB gridlines at 15/28/42/55/68/80/90% (audio_mixer.html:269-285) | absent | MED |
| D3 | FX rack 105px, 5 slots, always-present "+" add row (:90-125) | 2 slots / 42px, "+" only when a slot is empty (ChannelStrip.tsx:74-104); inserts model is 2 slots (mockMixer.ts:14) | MED (see §4 tier compromise) |
| D4 | routing-btns row 24px, 16×16 "1"(green)/"2"(gold) (:201-222) | absent from the strip — outputBus lives only in ChannelEditor (ChannelEditor.tsx:164-169); deliberate R19-B1 move, but the strip row is part of the reference silhouette | MED |
| D5 | Header = track ID only, 28px, 13px/600; NAME lives in the 26px title row (11.5px/700) (:62-73, 224-232) | header = badge chip + name, 24px, 10px (ChannelStrip.tsx:231-236); title row repurposed as ROLE label, 22px (:263-273) | MED |
| D6 | Row order: graphs → **pan → routing → title → RSM** → fader (:455-505) | graphs → role → RSM → **pan** → fader (ChannelStrip.tsx:254-284) — pan/RSM swapped, routing absent | MED |
| D7 | Uniform 86px strips incl. master (:50-56, 838) | channel 86/72 (:221), aux 88/72 (:344), master 96/84 (:414) | LOW |
| D8 | Graph strokes #2dbbd2 / #a3c42e / #467cb4 | --type-audio #5cb87f / --meter-amber / --knob-active (StripGraphs.tsx:63, 79-80) | LOW |
| D9 | Meter 2-color green 75% / yellow 25%, yellow peak, 0dB@15% (:390-410) | 3-zone green/amber@−18/red@−6, white peak, 0dB@100% (MixerPrimitives.tsx:582-589; tokens.css:110-112) | MED (position = bug B9; palette = accepted C41 deviation — keep our zones, fix the GEOMETRY) |
| D10 | M1 header bg #222, no accent | accent gradient top bar (ChannelStrip.tsx:421) | accepted deviation (keep) |
| D11 | M1 spacers 48+24 → ~10px fader-top misalignment | 56+22px spacers → exact fader-top alignment (:427, 450) | accepted deviation (ours is better; keep) |
| D12 | — | "LUFS — v2" extra row on master (:437) | INFO (keep, honest v2 note) |
| D13 | header 28px+3px border (32 total) | 3px TopBar + 24px header = 27 | LOW |
| D14 | 3-family track colors (orange/teal/gray) | per-role --mk-role-* (blue/purple/orange/pink; ChannelStrip.tsx:54-59) | LOW (token law wins; note the reference mapping) |
| D15 | db-readout absolute top:4 left:6, 9px | 24px HeadroomReadout row: fader dB left + LIVE PEAK right (MixerPrimitives.tsx:99-109) | accepted enhancement (keep — peak readout is extra value) |
| D16 | — | 22px "MIXER · G-LAYER" vertical dock header column (MixerDock.tsx:139-156) | ours (keep as the state-control home) |

### 3.3 Already reference-true (PRESERVE in the rebuild — do not regress)
Strip 86px width (ChannelStrip.tsx:221); 6px groove + endcaps + unity notch at 15% w10px
(MixerPrimitives.tsx:236-250); thumb 22×36 gradient + grip (254-262); 14px scale col, 8px labels at
the exact piecewise anchors (124-133, 186-197); 14px meter col (2×6.5+1, :544-564); 16×16 gold I +
26px row (ChannelStrip.tsx:106-126); 20×20 RSM + 24px row + inset highlight (139-159); 48×48 pan
crosshair + 4px blue dot top-25% left=50+pan/2 (MixerPrimitives.tsx:469-527); terminal flex-1
fader section, nothing below (ChannelStrip.tsx:169-184); equal-height trio law (175-192); 24px
headroom; graphs 2×28px viewBox 100×30 deterministic (StripGraphs.tsx:52-83); master M-only RSM;
store-level single sources (toggleTrackCmd, master volume/mute, engine keys).

---

## 4. FIT-AT-HALF-HEIGHT STRATEGY (dock height 260-400px)

Constraint set: dock = at most ~half the screen, same height as the multi-track view; vertical space
tight; per-channel vertical scroll acceptable **if truly needed**; fader always visible; reference
proportions of the dial/scale/meter trio preserved.

### 4.1 Invariants at every tier
- The trio (scale | groove | meter) stays equal-height with the 24px headroom above; 0dB at 15%;
  thumb 22×36; **minimum usable travel 140px** (below that, tier down instead).
- The fader section remains the terminal flex:1 block; nothing renders below it.
- Strip width stays 86px in `full` (72px only as a narrow-window fallback, not a height response —
  decouple width compaction from height compaction).

### 4.2 Height tiers (replace the single `compact` boolean with a `tier` 0-3, measured per strip via
ResizeObserver on the strip container; thresholds measured from this audit's row arithmetic)
| Tier | Strip height H | FX rack | Graphs | Input | Routing | Title/role | Pan | Fixed rows | Fader travel at H |
|---|---|---|---|---|---|---|---|---|---|
| T0 reference | ≥ 560 | 5 slots (2 real + 3 add, 105px) | 2×28 | 22 | 24 (real bus toggles or honest display) | 26 name row | 48 box | ~386 | 150 at 560 (scales up) |
| T1 full | 420-559 | 2 real slots + 1 add = 3 rows (≈62px) | 2×28 | 22 | — | role chip in header | 48 box | 266 | 130-269 |
| T2 lean | 340-419 | 1 row: `Fx ×N` chip + I (26px) | hidden | hidden | — | role chip in header | 48 box | 178 | 138-217 |
| T3 scroll | < 340 | accessory stack becomes a per-channel `overflow-y-auto` region (input/fx/graphs/pan inside it) | | | | | 48 box inside scroll | 3+24+1+24+1 = 53 fixed + scroll region flex-1 (min 64) | fader section FIXED height `clamp(H−80, 140, 260)` |
(travel = section height minus the 24px headroom; section height = H − fixed rows.)
T3 is the ONLY tier with per-channel scroll (user-sanctioned); the fader is pinned below the scroll
region and always visible. T2 keeps pan visible (it is a primary control); everything above RSM is
gone. Thresholds: 560 / 420 / 340 — encode as constants exported next to ChannelStrip so tests can
pin them. Compact-width (72px) stays a separate `narrow` response if the dock's width budget < N×86.

### 4.3 The 3-state machine (thread #61 + #60 redesign)
Store: keep `MixerDockState` but re-semantics (no type change needed — values renamed in meaning):
- **`collapsed` = closed**: dock renders nothing (exists today, MixerDock.tsx:189; F6 region 7
  auto-unregisters via `mixerVisible`, AppShell.tsx:150, 297-301 — PRESERVE).
- **`bridge` = minimized meter-bridge (REDESIGN)**: full dock height, **one thin column per track
  SIDE BY SIDE** (never stacked): column ~24px wide = badge (10px mono, family color) on top +
  full-height thin stereo meter (2×~8px bars or 6px single + 1px peak) + optional M/S/L micro-dots
  bottom; horizontally scrollable when tracks exceed the width budget (reuse the pinned-master
  pattern: channels scroll, master column pinned right, collapse control at the rail head).
  Column geometry follows the SAME 0dB@15% law as the strips if the taper map is adopted (§4.4).
- **`full` = strips** (§4.2 tiers).
Cycle: Edit page `collapsed → bridge → full → collapsed`; Audio page `collapsed → bridge → full →
bridge` (keep the page-aware special case, useUiStore.ts:1178-1184 — update the branch names).
**Collapse icon must change per state** (thread #60): in `full` the dock-header button shows
"minimize" (e.g. `PanelRightClose`/ChevronsRight pair — dock is right-side), in `bridge` it shows
"expand" (`PanelRightOpen`/ChevronsLeft), and the toolbar `btn-mixer-state` (TimelineToolbar.tsx:294-303)
toggles closed↔last-open with `aria-pressed` + a state-reflecting glyph. Every state change must be
announced via the existing `data-tip` + aria-label (no silent relabeling).

### 4.4 Meter display law (fix B9 while keeping our palette)
Map the meter fill through the SAME piecewise taper as the fader: `fillPct = 1 − dbToPos(db)` (with
the −60 floor → 0%). 0dB then lands at 85% height = the 15% gridline, matching the groove notch and
scale. Keep the 3-zone token palette (green/amber@−18/red@−6/clip — deliberate C41 deviation) but
re-anchor the zone stops to the taper positions (dbToPos(−18) = 0.55 + ((−18)−(−15))/((−20)−(−15))×(0.68−0.55) = 0.628 → fill 37.2%; dbToPos(−6) = 0.28 + ((−6)−(−5))/((−10)−(−5))×(0.42−0.28) = 0.308 → fill 69.2%). Peak line
1px, keep white or move to `--meter-yellow` (reference) — either is fine; document the choice. The
engine (meterEngine) is untouched — only StripMeter's level math changes. **Update
MixerPrimitives.test.tsx:456-497 (fill/peak/zone tests) accordingly.**

---

## 5. STORE / TEST SURFACE MAP (what the rebuild must preserve or update)

### 5.1 Store (useUiStore.ts)
- `MixerDockState = 'collapsed' | 'bridge' | 'full'` (:40); `mixerState` (:369, default 'collapsed'
  :664); `setMixerState` (:1177); `cycleMixerState` (:1178-1184, page-aware); `enterAudioFocus`
  forces `'full'` + G-slice sync (:1160-1175); scene switch reseeds the mixer (:1775).
- `stripFocus` (:371, :1187, setStripFocus) + `stripFlash` (:372, :1173) — strip-focus/escalation
  gesture; FullDock flash ring (MixerDock.tsx:123-128) + tests.
- G-slice `mixer: MockMixerScene` (:368, boot :663) with `setMixerTrack` (:1188-1193 — note the
  DEFAULT_MIXER_TRACK merge), `setAuxBus` (:1194-1196), `setDucking` (:1197-1202).
- `toggleTrackCmd(sceneId, trackId, 'muted'|'solo'|'locked')` (:1152-1157) — the UNDOABLE M/S command
  shared with track headers; strips must keep routing S/M through it (ChannelStrip.tsx:38-39, 155-158).
- `masterMuted` / `masterVolume` (0..1 linear) / `toggleMasterMute` / `setMasterVolume`
  (:352-353, 645-646, 1105-1106); dB conversion `masterVolume*66−60` (ChannelStrip.tsx:406, 457;
  Toolbar2 micro-meter TimelineToolbar.tsx:321). Keep one source (bridge/strip/toolbar).
- Meter engine keys: per-track id, `'auxA'`, `'auxB'`, ONE `'master'` (meterEngine.ts:20-25, 162-211).
  Bridge/strip/toolbar/editor all consume `useMeter` — do not fork the keys.

### 5.2 ChannelEditor writes (must keep working against the rebuilt strips)
`setElementField` (clip gain −48..+12, fades), `setMixerTrack` (fader, pan, inserts 2 slots,
outputBus 0/1/2, auxA/auxB, auxPreFader), `setDucking`, `setAuxBus` (ChannelEditor.tsx:100-235).
Its terminal fader block (:249-262) shares HeadroomReadout/Fader/StripMeter — a rebuild of the
primitives must keep the ChannelEditor compiling against them (or update both together).

### 5.3 Testids currently pinned by tests (update deliberately, never silently drop)
`mixer-dock-full`, `mixer-dock-bridge`, `mixer-strip-{badge}`, `mixer-strip-aux-{bus}`,
`mixer-strip-master`, `mixer-topbar-*`, `strip-input`, `fx-rack`, `fx-chip`, `fx-add`, `fx-power`,
`strip-graphs`, `eq-thumb(-path)`, `dyn-thumb(-path)`, `strip-role`, `strip-rec-arm`, `pan-box`,
`pan-dot`, `fader-section-{id}`, `fader-cols-{id}`, `mixer-readout-{id}`, `bridge-{badge}`,
`fader-headroom`, `fader-scale`, `fader-groove`, `fader-endcap-*`, `fader-unity-notch`,
`fader-thumb`, `fader-grip`, `meter-peak`, `knob-*`, `channel-editor-fader`,
`channel-editor-readout`, `channel-ducking-{badge}`, `channel-automation-placeholder`,
`shell-channel-editor(-state-noclip)`, `btn-mixer-state` (TimelineToolbar).

### 5.4 Test files (the rebuild's regression net — 942/944 suite must stay green or be updated
in the same commit)
- `MixerPrimitives.test.tsx` — taper anchors/round-trip/monotonic (28-71), keyboard grammar
  (84-110), drag-through-map (112-143), geometry 6px/22×36/endcaps/notch/scale/headroom (146-214),
  PanKnob grammar (216-367), PanBox (369-419), StripMeter fill/peak/zones (420-503). §4.4 changes
  the fill/zone/peak expectations; everything else should survive verbatim.
- `ChannelStrip.test.tsx` — width 86/72 (124), topbar colors (131-139), input/fx/I/graphs/pan rows
  (141-223), RSM (226-237), terminal fader + equal-height + fixed-14px meter (239-313), AuxStrip
  (315-353), MasterStrip anatomy (MixerDock.test 124-158).
- `MixerDock.test.tsx` — 3-state cycle (18-100), strip focus/flash (89-102), right-edge bank
  pinning (151-162, th_mto63f99), master readout −∞ guard + live peak (166-180).
- `ChannelEditor.test.tsx` — CLIP/TRACK sections, all write paths, terminal fader block (149-188).
- `mockMixer.test.ts` — createMixerScene fixtures + db↔slider math (71-86).
- Stories (Mixer.stories.tsx): FullDock / BridgeRail / levels variants / Collapsed / ChannelStrip
  solo + compact / ChannelEditor / SoundLibrary — the 3-state stories need a `meters`-mode visual
  after the bridge redesign.

### 5.5 Related open threads feeding R20-W1
#59/th_mtp5yku1 (whole-mixer redo — this doc), #61/th_mtp63402 (3-state minimized redesign),
#60/th_mtp5yy3u (collapse icon state), #58/th_mtp5v00u (track-head heights adjustable — timeline
side, feeds the "same height as multi-track view" alignment), #62 (fade/transition objects —
unrelated), #67 (media-bay audio filtering — SoundLibrary side).

---

## 6. REBUILD ORDER SUGGESTION (for R20-W1)
1. Fix B1 (dock width budget + scroll-region min-width) first — nothing else is reviewable until
   the channels are visible.
2. Re-order the trio to scale|fader|meter (D1) + add gridlines (D2) — one PR, geometry only.
3. Adopt the tier system (§4.2) replacing `compact`; pin thresholds in tests.
4. Meter taper fill law (§4.4) + zone re-anchoring.
5. Bridge → meter-bridge columns + state-aware icons (§4.3).
6. Anatomy polish: header/title/routing rows (D4-D6), fx rack slots (D3), master width 86 (D7),
   graph strokes (D8).
7. Move R/I display state into the sidecar (B6) or document the reset; add pointerup/cancel to
   Fader (B7) + aria-orientation (B8).

— R20-A1, research sub-agent. End of contract.

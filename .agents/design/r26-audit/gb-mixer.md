# GB — mixer/audio group audit (R26-W-A2)

**Scope (DESIGN-R26 §2 GB):** the Audio-Focus-era asks inside T#1..T#9 whose story is
Mixer / Channel editor / Audio Focus (T#1 has three such entries; T#2..T#8 one each;
T#9) PLUS T#12,13,14,16,18,27,44,45,55,60,65,66,80,81,82,83,84,85 — 24 threads / 29
verdict rows (T#1 splits into 3 asks; the T#6/T#7/T#8 Audio-Focus entries are included
for completeness but their depth is owned by GG/GH).

**Freshness:** `:3000/index.json` = **126 entries** (post-remediation count); serving
tree byte-diff vs spec HEAD on all 6 mixer files + Toolbar2/AppShell/LeftDock/
MediaPool/TimelineToolbar = **IDENTICAL**. Every probe below ran on the fresh runtime
(agent-browser, isolated `--session gb-mixer-audit`, story
`iframe.html?id=shell-appshell--audio-focus` + page swaps). Zero console errors.

**Method per §3:** ASK (verbatim from /tmp/r26-corpus-digest.md) → OVERRIDE SCAN →
LIVE PROBE → CODE CHECK → VERDICT. Files are under
`ui-mock/shell-variants/src/components/…` (runtime tree == HEAD, so file:line cites
are valid for both).

---

## Verdict table

| Thread (GH) | Ask (gist) | Verdict | Evidence (live probe · code · tests) |
|---|---|---|---|
| **T#1a** (#5) Mixer—ChannelStrip solo: "meter too wide and the rest is too squeezed" | PROPER | Live: meter col **14px fixed** (2 stereo bars + 1px gap), strip **86px** full / 72 narrow, fader+scale own the rest. `mixer/ChannelStrip.tsx:455-471` (FaderCol trio), width law `:555`. ChannelStrip.test pins. |
| **T#1b** (#5) Channel editor: "should be all the way vertically, right now 50%" | PROPER | Live: editor fader block = terminal flex-1 (measured 210px inside the 480px editor, flush to bottom). `mixer/ChannelEditor.tsx:447-466` (R19-B1). ChannelEditor.test pins. |
| **T#1c** (#5) Audio Focus: "right side empty space is weird" | PROPER | Live: aux-a1/aux-a2/master render as real strips at the scroll region's natural end — no dead right zone; at 700px vw the bank stays reachable (`masterFullyVisible:true` after scrollLeft=33). `mixer/MixerDock.tsx:478-523` (R25-F1-A3: the bank rides INSIDE the scroll region). Tests `MixerDock.test:250-296`. |
| **T#2** (#7) Audio Focus: "channel strip only taking ~50% of vertical space" | PROPER | Live: strip height 380 == dock height 380 (`h-full` + terminal FaderSection min-164). `mixer/ChannelStrip.tsx:554` + `:330-356`. |
| **T#3** (#8) Audio Focus: "faders should be same height as meter" | PROPER | Live: fader col **229 == meter col 229 == scale col 229** — one shared `--fader-col-h` under one 24px headroom. `mixer/ChannelStrip.tsx:346-365` (equal-height law, th_mtoyq7jt). MixerPrimitives.test pins. |
| **T#4** (#15) Audio Focus: "remove these" (mac traffic dots) | PROPER | Live: toolbar = project title + toggles only, no dots on any page. `shell/Toolbar2.tsx:165-167` (th_mtoyslr9 cite). |
| **T#5** (#16) Audio Focus: Effects library "use the same area as bin" | PROPER (architecture evolved) | Live: FX page left dock = FxBrowser in the ONE left slot; audio page = Sound Library in the same slot. The R19 "Media Pool \| Effects tab pair" was superseded by the per-page single-surface table (R23-WD D-D1 / R23-WA ruling 4 — Effects' home became the FX view). The ask's core — one slot, no separate side strip — holds. `shell/leftDockContent.ts:43-49`, `shell/LeftDock.tsx:55-63`. |
| **T#6** (#21) Audio Focus: fullscreen toggle "remove to be less confusing" | PROPER | Live: absent from every toolbar probed (edit/audio/color/fx). `shell/Toolbar2.tsx:265-266` (gap C38 removal cite). |
| **T#7** (#24) Audio Focus: loop handles "shouldn't crop by half" | PROPER | Live: `shell-ruler-bracket-in/out` = full-band **12×27** glyphs, in-bracket anchored INSIDE the region (x=252, not edge-cropped). R20-W5 fix; Ruler tests. (GG owns depth.) |
| **T#8** (#25) Audio Focus: "track head height should be adjustable" | PROPER | Live: `track-resize-tr-*` 5px resize strips present on every audio lane head. TrackHeader R20-W5 law (drag ±4px, ⇧16, dbl-click reset, 24–240). (GG owns depth.) |
| **T#9** (#54) Audio Focus: media bay mode-aware, filter to audio | PROPER | Live: audio-page bay = Sound Library, count chip **6/8**, `Audio only` toggle (aria-pressed) ON by default = audio + audio-bearing video; honest footer. `mixer/SoundLibrary.tsx:55-124` (isAudioBearing shared predicate). SoundLibrary.test pins. |
| **T#12** (#59) "mixer extremely buggy… deep pass review / re-implement / audit" | PROPER | The R20-W0+W1 rebuild is real and live: (a) B1 width budget measured on the DEFINITE timeline row (the circular `max-w-[60%]` bug is dead) — dock caps at min(0.6×rowW, 22+(N+3)×86), 2-strip floor; (b) at 700px vw the master strip is fully reachable via the region's own scrollbar. `mixer/MixerDock.tsx:42-48,138-165,478-523`; tests `MixerDock.test:250-296,502`. |
| **T#13** (#60) "when collapsed this icon should change" | PROPER | Live: full dock → **PanelLeft** "Collapse to meter columns"; meters dock → **PanelRight** "Expand to full strips"; both are MODE actions with NO aria-pressed (an action can't lie). `mixer/MixerDock.tsx:50-59,405-418,328-340`. Tests `:133,153,162`. |
| **T#14** (#61) minimized = "full height vertically… thin meter per track" | PROPER | Live: MetersDock = **24px** thin columns, col height **552/560** (full dock height), 2 track cols + master pinned right, horizontal scroll (`meters-scroll`), M/S micro dots. `mixer/MixerDock.tsx:227-344`. Test `:70` ("full-height thin meter COLUMNS… thread #61"). |
| **T#16** (#70) "separate collapse / minimize for the master / bus" | PROPER | Override scan: T#14's dock-level meters state supersedes the dock-collapse reading — but the bank-level separate collapse ALSO exists (R23-WC D-C3, cites #70). Live: `mixer-masterbus-toggle` click → pressed=true, aux/master swap to `mixer-bank-col-a1/a2/master` (full-height 560px meter cols) while the 2 CHANNEL strips stay full (independence law). `mixer/MixerDock.tsx:174-225,507-522`; tests `:524-590`. |
| **T#18** (#72) "separate length on the dialer and meter looks bad; where do EQ/FX slots go → inspector" | PROPER | Live: ALL 5 strips' fader sections start at **exactly y=846, h=300** (channels == aux == master — pixel-identical alignment; the #72 spacer-grammar law + R25-F2 A7 gave aux/master the dB scale column too). EQ/FX surfaced in the inspector: the ChannelEditor's `channel-inserts-*` block (slot selects + per-insert param rows) live-verified. `mixer/ChannelStrip.tsx:611-707`; `mixer/ChannelEditor.tsx:332-361`. Note: the strip FX rack itself is back per the LATER T#80 ask (toggles need elements) — see residue R2. |
| **T#27** (#81) "perhaps FX / EQ stuff can fall under here?" | PROPER | Live: EQ/FX inserts block in the ChannelEditor (2 slots, EQ/Comp/Gate/De-esser + param rows incl. the log-domain De-esser freq). `mixer/ChannelEditor.tsx:332-361` (comment cites #81+#72 together). |
| **T#44** (#98) "only gain has a dialer… layout not well designed, major polish" | PROPER | Live: all three CLIP rows (Gain dB / Fade in / Fade out) carry the IDENTICAL grammar — typed NumberField + slider + live readout (`channel-clip-row-el-2-*` × 3, readouts "0.0 dB"/"0.8 s"/"0.5 s"). `mixer/ChannelEditor.tsx:138-202` (D-C1 uniform row grammar). Tests cite #98. |
| **T#45** (#99) "selecting channel should just show channel editor… 'clip not selected' is bad; full audit on inspector panels" | PROPER | Live: the audio page's right rail IS the ChannelEditor (always — AppShell `:372`); clicking strip A2 swaps the editor to A2 (badge+name), **no "clip not selected" text exists**; the no-clip CLIP section hides entirely when a focus is live and shows the honest onboarding line only when nothing is live (D-C2). `shell/AppShell.tsx:296-318,354-373`; `mixer/ChannelEditor.tsx:222-305`. The "full audit on all inspector panels" half is GH's scope. |
| **T#55** (#109) "fader move is reversed to mouse / drag movement" | **PROPER — real-gesture verified** | Live (real pointer drags on the A1 strip fader): drag **UP** ~80px → readout **−3.0 → +6.0 dB**, thumb followed up (666→628); drag **DOWN** → **+6.0 → −6.7 dB**, thumb followed down to exactly the pointer (688). Up=louder, down=quieter, thumb tracks the cursor 1:1 — the reversal is dead. `mixer/MixerPrimitives.tsx:184-195` (th_mtr0prj5, R23 wrap). Test `MixerPrimitives.test:143` pins it. |
| **T#60** (#114) "why is there a mixer floor dialog? responsive design is the right way" | PROPER | Live: **zero dialogs and zero floor toasts** at every probed size; the dock answered every resize with the silent density ladder (full at 340/540/560; the shell's own console-row floor bottoms out at 340 in practice). Below 200px the container pure-renders MetersDock with `mixerState` untouched (no store write, no toast) — test-pinned (`MixerDock.test:452`). `mixer/MixerDock.tsx:528-592`. |
| **T#65** (#119) "why mixer can turn on but cannot toggle off?" | PROPER | Live: toolbar Mixer click → aria-pressed **false**, title "Show audio mixer", icon SlidersVertical→AudioLines, dock+meters fully unmount; click again → reopens to the remembered visual ('meters' — the lastVisual memory). `shell/Toolbar2.tsx:235-251`; `state/useUiStore.ts:2075-2079`. Toolbar2.test pins. |
| **T#66** (#120) "mixer shouldn't be here when it is not audio workflow" | PROPER | Live: Edit / Color / FX toolbars carry **no Mixer button** (DOM-absent, not display:none), no dock; the setPage exit law collapses an open mixer on leaving audio (stranded-unclosable law) and audio entry re-opens it. `shell/Toolbar2.tsx:117-122`; `state/useUiStore.ts:2062-2066` (exit), `:2039-2041` (entry). |
| **T#80** (#134) "mini toggle buttons to toggle visibility of console elements, esp. FX/pan grid + that [I] thing" | PROPER | Live: the dock header's toggle group (fx/pan/input/graphs) verified — fx click → aria-pressed false, tip "hidden (view state)", **5 fx-racks → 0**; pan click → **2 pan boxes → 0 → 2**; input click at T1 → **2 input rows → 0**; tips compose with the density ladder ("hidden by the density ladder (dock at full / T2 density…)" — honestly explaining ladder-hidden vs user-hidden). `mixer/MixerDock.tsx:120-136,436-468`; `state/useUiStore.ts:648-662`. Residues R1/R2 below. |
| **T#81** (#135) "hover cause the dialer area to jump a bit" | **PROPER — real-hover verified** | Live (real mouse hovers on the pan-knob + RSM areas): strip box IDENTICAL before/during/after (y=466, h=380), channel-scroll scrollWidth stable (430 — no overflow extension), fader col unmoved. Root cause fixed: every strip tooltip carries `data-tip-in` (clamps inside the strip box) so hover can never mint the scrollbar→9px-content-loss→re-layout chain; the knob's value bubble is absolutely positioned. `mixer/ChannelStrip.tsx:242-247`; `mixer/MixerPrimitives.tsx:398-407`. |
| **T#82** (#136) "aux A tracks + Master toggles… same mini button" | PROPER | Override/retract: the reviewer's own ASK2 — "realize we already have that perfect but the icon is wrong i will raise separate issue" — routes the icon half to T#83. The mechanism live-verified (see T#16 row: bank toggle collapses aux+master to meter columns via the same dock-header mini-button group). |
| **T#83** (#137) "wrong icon" | PROPER | Live: the bank toggle's glyph = `lucide-chart-column` (**BarChart3** — the meters-columns shape), replacing the old Gauge speedometer; distinct from the PanelLeft/PanelRight mode-action pair. `mixer/MixerDock.tsx:427-433` (R25-W4-C cite, th_mtzoxrhb). |
| **T#84** (#138) "redundant we already have a Mixer button at top" | PROPER | Live: **0** mixer controls in the timeline toolbar on Edit. The mixer row is DELETED from the toolbar matrix (R25-W4-D) — Toolbar2's Mixer toggle is the ONE control. `timeline/TimelineToolbar.tsx:111-114`. |
| **T#85** (#139) "responsive design to hide elements; only when minimal still cannot fit degrade to mini meter style" | PROPER | The W4-E ladder is exactly that contract, live at the top band and test-pinned for the rest: density full (≥340, tier ladder T0/T1/T2) → lean [280,340) hides optional blocks → core [200,280) meters+fader → mini <200 = MetersDock as the LAST resort, silently, store untouched. `mixer/MixerDock.tsx:79-113,528-592`; tests `:313-522` (each band pinned). |

**Tally: 29 rows — 29 PROPER, 0 QUICKFIX, 0 BROKEN.** (T#5 PROPER-with-evolution;
T#16 PROPER beyond its override; T#82 closed by the reviewer's own retraction + T#83.)

## Fix queue (for W-F)

**No code fixes required from this group.** Three small residues — none block the
reply wave; R1 is a genuine (one-line) W-F candidate, R2/R3 are reply-wording items:

- **R1 (T#80, tip honesty at T2):** at tier T2 (dock 340–419px) the `fx` toggle's tip
  says "FX sends grid — shown" while the tier's native anatomy replaces the rack with
  the fx-count chip. The tip's `tierHides` set covers input+graphs but not fx
  (`mixer/MixerDock.tsx:447`). One-line compose fix (add the T2 note to the fx tip),
  or fold into the next mixer polish wave. Severity: cosmetic honesty gap, T2 only.
- **R2 (T#18/T#80 reply wording):** the strip FX rack is default-visible (T#80's
  toggle set needs elements) — the T#18 reply should say the "without FX/EQ slots"
  look is now the fx toggle (one click), not a forced anatomy, and the inspector
  (ChannelEditor) carries the full EQ/FX editing either way.
- **R3 (T#80 reply wording):** "[I] thing at the top" was read as the No-Input row
  (toggle exists, `input` key — documented in `useUiStore.ts:653`). If the reviewer
  meant the literal inserts-power **I chip** (`ChannelStrip.tsx:225`, gap C40,
  display-only), that chip has no individual toggle (only density hides it). Ask in
  the reply; if the chip reading is confirmed, it's a trivial 5th toggle key.

## Probe artifacts (so W-V doesn't chase ghosts)

- **Same-eval React-flush artifact:** clicking a toggle and counting DOM in ONE
  `eval` shows the pre-render count (React 18 batches; the flush lands between
  commands). Re-verified with separate evals — the fx toggle works (5→0→5).
- The "Drop rejected — target track is locked" toast seen while dragging the
  console-row splitter is the timeline's DnD layer interpreting the drag as a clip
  drop on a locked lane — NOT a mixer-floor toast (T#60 remains dialog/toast-free).
- The shell's console-row splitter floors at ~340px dock height, so the lean/core/mini
  bands are not reachable through the standard shell chrome (they're pinned by
  MixerDock.test's ladder suite + the solo strip-density stories). At 700×400 the
  whole row measures 0 → the guard keeps the deterministic default — by design.
- The audio page auto-opens the mixer on entry (`enterAudioFocus` sets
  `mixerState:'full'`, useUiStore:2039-2041); the toolbar's lastVisual memory applies
  to toggling while ON the page. Not a bug — documented law.
- MediaPool's `page==='audio'` filter branch is unreachable in the full shell (the
  audio page mounts SoundLibrary, not the pool) — live only via the solo story.
  Harmless; note for a future dead-code sweep.

## Test evidence

`npx vitest run src/components/mixer` on the runtime tree (== HEAD): **5 files, 185/185
green.** Issue-cite pins found in MixerDock.test (15 cites: #61/#70/#60 + ladder +
R25-F1-A3 reachability), ChannelStrip.test (6), ChannelEditor.test (6: #98/#99),
MixerPrimitives.test (3: #55 reversal pin at :143), SoundLibrary.test, Toolbar2.test
(6: mixer toggle/audio-only), useUiStore.test (4: toggle laws).

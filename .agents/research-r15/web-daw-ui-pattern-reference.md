# R15-R2: DAW Audio UI Pattern Reference — web-daw-ui (+ web-daw-core)

Source: `/home/z/ref-web-daw-ui` (Studio Charcoal, Tailwind v4 oklch tokens) + `/home/z/ref-web-daw-core`. Research-only artifact. Maintainer: R15 main agent.

## 1. Knob (`src/components/daw/knob.tsx`, 315 LOC, zero deps)

### API
`{value, onChange, min, max, label?, size?=40, unit?, format?, color?='#f97316', className?, logScale?, defaultValue?, step?}`. State: isDragging, showValue (bubble on hover/drag), refs.

### Rotation
- Angle range **−135°..+135° (270° sweep)**; `t = (v−min)/(max−min)` (or log-interp), `angle = −135 + t·270`.
- Log: `t = (log(max(.0001,v)) − log(max(.0001,min)))/(log(max)−log(min))`; inverse exp.

### Drag grammar (debugged details — all borrowed)
- **Pointer capture on `e.currentTarget`** (`setPointerCapture`), NOT the child under the pointer (else releasePointerCapture throws NotFoundError). Release guarded with `hasPointerCapture()`.
- **Vertical-only drag**: `deltaT = −(clientY − startY)/sensitivity`; **sensitivity 200px per full range; Shift = 1000px (5× finer)**. Delta relative to grabbed value (never absolute pointer→value — knob would jump to min).
- `pointercancel` resets drag state.
- **Wheel: non-passive listener via ref** (`addEventListener('wheel', h, {passive:false})`) — React onWheel is passive, preventDefault ignored, page scrolls. Step `(max−min)·0.02`/notch, shift ×0.2; log knobs ×/÷ 2^±0.15 (±0.05 shift).
- **Double-click → defaultValue** (if provided).
- Keyboard (role=slider): ↑/→ +step, ↓/← −step, PageUp/Down ±10·step, Home/End min/max; step = `step ?? (logScale ? 5% : 1% of range)`; all preventDefault.

### Rendering
- Root: `relative cursor-ns-resize select-none touch-none focus-visible:ring-2 rounded-full`, `role=slider tabIndex=0`, aria-valuemin/max/now + **aria-valuetext = format(value)**.
- Body: `radial-gradient(circle at 35% 30%, #3a3a3a, #1a1a1a 60%, #0a0a0a)`, border 1px rgba(255,255,255,.1), inset+drop shadow.
- **Arc (SVG viewBox 0 0 100 100, pointerEvents:none)**: track `d="M 20 80 A 40 40 0 1 1 80 80"`, stroke rgba(255,255,255,.1), width 6, linecap round; active same d, stroke=color, **`strokeDasharray = ((angle+135)/270·188.5) 188.5`** (188.5 ≈ 2π·40·0.75), 0.1s transition (disabled while dragging).
- **Indicator tick**: wrapper `absolute left-1/2 top-1/2` w2 h= size·0.4, `transform: translate(-50%,-50%) rotate(θ)`, `transformOrigin: 50% 100%`; child line at top:0, w2, h=size·0.2, bg=color, glow `0 0 4px ${color}88`.
- Center dot size·0.1 rgba(255,255,255,.2). Label 9px truncate + title. Value bubble (hover/drag): 10px mono tabular-nums.

### Knob breakage diagnosis (why other knobs fail)
1. Pivot math: DAW wrapper centered on knob but transform-origin at wrapper bottom → effective pivot 0.2·size below center. Works visually; the CORRECT patterns: CSS wrapper `left:50% top:50%`, height size·0.4, **`translate(-50%,-100%) rotate(θ)`** + origin `50% 100%` (wrapper bottom lands ON center; tick sweeps [0.2·size, 0.4·size] band) — or SVG `<line x1=50 y1=65 x2=50 y2=80 transform=rotate(θ,50,50)/>` (explicit center).
2. NLE's actual PanKnob bug: indicator `absolute left-1/2 top-full` (BELOW knob) + origin `50% 0%` + `translateX(-50%) rotate(θ)` — pendulum swinging around knob's bottom edge, never on the face. Fix = tick on face, pivot at center.
3. Arc: dasharray against MEASURED path length (DAW's 188.5 vs actual ~183.5 → ~3% lead). Own arcs: polar math around viewBox center, endpoints `50+r·sin(±135°), 50−r·cos(±135°)`, large-arc=1.
4. Tailwind-4 pitfall: `-translate-x-1/2` utility emits independent `translate:` property that COMPOSES with inline `transform:` — double shift (2px on a 2px element).
5. Other solved classics: passive wheel, pointer capture on wrong element, absolute-delta jump, no pointercancel reset.

## 2. Meter system

### Data contract (the seam)
`engine.meterValues: Map<key, {level: 0..1 linear gain, peakDb (20·log10, −Inf silent)}>`; key = trackId | auxId | '__master__'. UI NEVER pushes meter data through zustand; mock sim writes Map at 50ms; `peakDb = 20·log10(level)`.

### useMeter fan-out
One module-level rAF ticker throttled ~30fps (33ms), per-key subscribers via `useSyncExternalStore`; cached snapshot survives gaps (no flicker); SSR-safe silent snapshot; ticker stops when last unsubscribes.

### MeterBar (presentational; consumer supplies `relative overflow-hidden` track)
- Vertical: `height: min(100, level·130)%` (full scale ≈ −2.2dB), `background: linear-gradient(to top, green, amber 70%, red 95%)`, `transition: height .05s`, muted → opacity .2, fill absolute bottom.
- Horizontal: `width: min(1, level·1.4)·100%`.
- **Peak line: 1px white at `bottom: clamp(0,100,(peakDb+60)/60·100)%` — dB-linear −60..0**; omitted at −Inf.
- data-test + data-test-state (muted|active|default) for visual regression.
- Ballistics: CSS 50ms transition on fill; **peak hold + decay live in the SOURCE** (engine: `level = max(peak, rms·1.4)` EMA-smoothed; master peak `max(peak·0.995, level)` ≈0.5%/frame decay).
- Master strip palette (known-good trio): **green #4ade80 → amber #eab308 @85% → red #ef4444 @100%**.

## 3. Mixer

### Layout (mixer-view)
Full-view swap `flex flex-col h-full`; header h-7 "Console" + "{n} tracks · {solo status}"; body `flex-1 overflow-x-auto flex`: track strips | (border-r-2) | add-channel col (60px) | aux bus strips | master (border-l-2). Zustand individual selectors (re-render hygiene).

### Channel strip anatomy (82px, top→bottom)
1. Gain knob h-14 (size 24, format gainToDb 1dp).
2. ProChannel insert thumbnail h-12 (decorative — SKIP for NLE).
3. Sends h-32: 3 slots, FX chip + Pre/Post labels (partly decorative — NLE has real sends).
4. **M/S/R matrix**: 20×18px letter buttons, gap 3px: M red-600/gray, S yellow-500/black, R red-700; `stopPropagation`; aria + data-test.
5. Pan knob size 24, format C/L{n}/R{n}.
6. **Fader + meter pair h-180**: dB scale col (w-3, 6px, right-aligned, `['+6','+3','0','-3','-6','-12','-18','-24','-30','-42','-inf']`) | fader track (w-2, cap w-4 h-3, gradient #777→#444, center hairline; **drag surface = invisible native `<input type=range>` `writingMode:'vertical-lr', direction:'rtl'`**) | meter (w-2 + MeterBar).
7. Readout row: fader dB (signed 1dp) + peak (green / -inf).
8. Footer h-24: type icon, routing chips I:/O:, name plate, id, **h-1 full-width track-color base bar** (strongest branding device).
- Strip selectable (role=button, aria-pressed); alternating bg parity; selected lighter.
- `effectiveMuted = muted || (anySolo && !soloed)` — solo-in-place as boolean.

### Fader notes
- DAW fader range is 0..1 LINEAR GAIN (dB display-only; scale positions decorative). **The NLE's dB-tapered fader (−60..+6) is MORE correct — keep it.**
- Transport master volume = Radix slider (skip for NLE strips).
- Native range gives keyboard/drag free (arrows 0.001 — too fine); no dbl-click reset on strips (knobs have it).

### Master strip (100px) differences
Header "Master" orange; spectrum+scope canvases (skip for NLE); M/S honestly disabled (aria-disabled + title); no pan (removed as fake); fader w-3, cap w-5 h-4 orange gradient + glow; meter w-2.5 inline palette + peak; readout mono orange, **`volume>0 ? dB : '−∞ dB'`** guard; footer gradient base bar. Master meter fed from reactive store props (not useMeter).

### Bus strip (82px) differences
No gain/pan (honest-removal); sends area = selected track's send knob into this bus (purple #7c3aed, disabled "no track" state); extra W (automation write) button — skip for NLE.

### Parameter model
Track: volume 0..1 linear, pan −1..1, muted/soloed/armed, outputBus 0|1..N, auxSends Record, auxSendPreFader Record. Solo = no gain math, binary.

## 4. Transport bar (h-12)
Brand | Snap/Marks status | Transport (RTZ/Play/Stop/Record with 12px red dot, disabled-when-unarmed) | **Timecode panel `min-w-[120px]` 16px mono accent, `bar.beat.sixteenth` padded "02.1.3"** + MBT/SMPTE labels | Loop toggle | BPM input (commit-on-blur/Enter) | spacer | Spectrum 140×32 | Master volume slider + dB readout | master meter horizontal w-24.
Shortcuts: Space, Ctrl+Z/⇧Z/Y, Ctrl+S/O — guarded vs INPUT/TEXTAREA/SELECT.

## 5. Shell
`flex flex-col h-screen`: ShellHeader (= transport, TOP) → ViewSwitcher (ResizablePanels main 75% + inspector 25%) → VirtualKeyboard → ShellFooter h-6 (view tabs Arrangement/Console/Piano Roll/Library, aria-current, active underline; right: undo/redo/save/export + audio status). **Mixer is a full-view swap (footer "Console") — NLE keeps its docked panel instead.**

## 6. Style system (Studio Charcoal)
oklch tokens: surfaces 0.16/0.20/0.25/0.30, inset 0.13, border 0.32, fg-1/2/3 0.95/0.72/0.55, **one accent** orange 0.70 0.18 42, warning yellow, danger red, success green, meter green/amber/red same families. Type: 9/10/11/12/14px scale + 8px tiny. Radii sm on chips, full on knobs. Black hairlines between strip sections. Forced color-scheme dark. Custom dark scrollbars.
**Visual regression mode**: `html.test-mode` + data-test/data-test-state → solid colors (#0F0 active, #F00 muted, #FF0 solo, #00F selected, #F0F armed, #888 default).
**Honest-mock discipline**: dead controls removed or aria-disabled + title; never interactive-looking fakes.

## 7. web-daw-core seams (brief)
Channel graph: input → insert FX → fader (muted?0:volume) → panner → meter tap → analyser (fft 1024, smoothing .6) → pdcDelay → master/aux; post-fader sends lazily. onMeter(level, peakDb) ~60fps; ballistics in source. Parameter descriptors min/max/default + linear curve. NLE bridge lives in consuming app.

## 8. Borrow/skip list for the NLE

### Borrow (high impact, restyle to NLE tokens)
1. **Knob with corrected pivot + SVG dash arc** — fixes PanKnob outright. Borrow interaction grammar: pointer capture on currentTarget + hasPointerCapture guard, pointercancel reset, vertical drag 200px/range + Shift 5×, non-passive wheel, dbl-click reset, role=slider + aria-valuetext, hover value bubble. Keep NLE's existing keyboard grammar.
2. **Meter grammar**: green→amber(70–85%)→red(95–100%) palette (replacing #e8c331/#d9913a/#fa1024), meter immediately right of fader, 1px white peak line at (peakDb+60)/60 dB-linear, transition .05s, muted opacity .2. Keep NLE's rAF idle-stop (better than DAW's always-on); adopt {level, peakDb} contract + shared ticker if multiple meters.
3. **M/S/R button grammar**: fixed-size letter buttons, semantic colors, stopPropagation, aria-pressed.
4. **Channel-strip section rhythm** + constant width + alternating bg + selected lighter + **h-1 track-color base bar** (cheapest professionalism win).
5. **dB scale column + paired readout** next to fader (NLE's dB taper makes it accurate).
6. **Honest-disabled pattern** + **data-test visual regression mode**.
7. **Value formatting**: signed 1dp dB, −∞ guard at 0, pan C/L/R, tabular-nums mono readouts.

### Skip (frankensteining risk)
- Orange accent + oklch token sheet (map the STRUCTURE onto NLE t*/inset/strong palette; don't import #f97316/daw-* names).
- Linear-gain fader taper (keep NLE −60..+6 dB), Radix-only master volume, mismatched decorative scale positions.
- Spectrum/oscilloscope, ProChannel thumbnail, 3-slot decorative send boxes.
- Mixer-as-full-view swap (NLE's docked mixer is right for NLE; borrow column anatomy only).
- Automation-write W button, aux-return rows (no NLE equivalent).

# R15 Design: Audio / DAW UI Overhaul — v2 FINAL

Status: FINAL after R15-C2 critique round (see worklog R15-C2). Borrow web-daw-ui patterns restyled to OUR tokens; no frankensteining (no orange import, no oklch sheet, no full-view swap, no decorative fakes).

## Non-goals
- Mixer placement stays side dock / 3 states (v2.2 revision — correct NLE shape).
- Fader taper stays −60..+6 dB (more correct than DAW's linear-gain).
- No spectrum/scope, ProChannel, decorative sends, W buttons, aux-return rows.
- mockMixer store model unchanged (presentation + metering-engine overhaul).

## Waves (re-ordered: tokens first)
**A0 tokens → A1 knob → A2 meter+engine → A3 fader+scale → A4 strip chrome (+header micro-meters) → A5 storybook.**

### A0. Tokens (load-bearing — must land first)
Add to `src/styles/tokens.css` in **all three skin blocks** (`:root` resolve, `[data-theme="studio"]`, `[data-theme="light"]`):
- `--meter-green`, `--meter-amber`, `--meter-red` (resolve/studio: #22c55e / #eab308 / #ef4444; light: same bright hues — well stays dark so bright contrast is correct; do NOT deepen).
- `--meter-well` (dark near-black all skins; light adds border-strong).
- `--knob-track` (fg/10 equivalent), `--knob-active` (accent-family, NOT --accent-selection which is state-only), `--knob-face-1/2` (radial gradient pair).
- `--fader-thumb-1/2` (dark: light-gray pair; light: darker neutral), `--fader-cap-accent-1/2` (master).
- `--mk-role-*` role colors: reuse the existing `--mk-*` mockMixer ramp family where possible (Dialogue/BGM/SFX/Music) — single set + light overrides, not 12 hexes.

### A1. Knob rewrite (fixes "knob not even rendered correctly")
- **Dial face = SVG** viewBox 0 0 100 100, absolutely inset, pointerEvents:none:
  - Track arc `M 20 80 A 40 40 0 1 1 80 80`, stroke `--knob-track`, width 6, round caps (round caps read as endpoints — **no endpoint ticks**, they're sub-pixel at our sizes).
  - Active arc: same path, stroke `--knob-active`, **strokeDasharray = ((θ+135)/270 · 183.5) 183.5** (183.5 = measured path length; C2 verified), 0.1s transition (off while dragging).
  - **Indicator: `<line x1=50 y1=35 x2=50 y2=20 transform=rotate(θ,50,50)>`** — ABOVE center (C2 correction: y 65→80 was 180° antiphase with the arc), stroke 7 (≈1.5px at 22px), round cap, `--knob-active`.
  - Center dot r 4.5, fg/20. Face circle behind: radial-gradient `--knob-face-1/2` + border token + inner shadow.
- **Angle law** −135..+135 (270° sweep); `θ = −135 + t·270`, `t=(v−min)/(max−min)`. Pan format `C`/`L{n}`/`R{n}`.
- **Drag (DAW-exact)**: vertical `Δv = −(clientY − startY)·range/200`; **Shift ×0.2** (was ×0.25 — documented contract change); pointer capture on currentTarget + `hasPointerCapture` guard (**add stub to test setup.ts** — jsdom lacks it) + `pointercancel` reset.
- **Wheel**: non-passive native via ref; step range·0.02 (shift ×0.2); preventDefault.
- **Detent (pointer-release only)**: snap to 0 when |v| ≤ 2 at drag release — NOT keyboard (C2: keyboard detent breaks the pinned ±1-from-center test and cripples fine steps).
- **Double-click → 0**. Keyboard grammar kept as-is (ours). **Persistent C/L/R label stays** under knob + hover/drag value bubble (mono tabular-nums). Size: 22 compact / **24 full dock** (DAW floor is 24 in strips).
- role=slider + aria-valuetext (pan format). Focus ring token.

### A2. Meter rewrite + shared engine
- **Contract (stereo — C2 correction)**: per key `{l: {level, db, peakDb}, r: {…}}`; keys: trackIds, `auxA/auxB`, **`master` (ONE key — unify 'master'/'master-bridge'/'toolbar-master')**. `level` = display fraction `(db+60)/60` clamped [0,1].
- **`lib/meterEngine.ts`** (module-level): seeded per-track/program sim — **programDb ∈ [−30, −4] dB** (C2: −6 floor made clip unreachable; −4 + fader +6 → max +2 → clip reachable), L/R **independent seeds**; sim step 50ms while playing; **duckAmount** applied per key (v2.2 §5 ducking → gain-reduction viz — reads mockMixer ducking state); **effectiveMuted = muted || (anySolo && !solo)** → level 0 + muted state; master = min(1, Σ/sqrt(active)).
- **Ballistics (dB domain — C2 correction)**: decay **−0.67 dB/frame at 30fps ≈ −20 dB/s**; attack instant; **peak hold 1s then −12 dB/s decay**; clip (db ≥ 0) → full + red, 2s hold.
- **Engine stop rule (C2 correction)**: loop stops when idle + settled (paused, all subscribed keys at floor, no clip/peak timers pending) — NOT subscriber-count-only (R13 pinned test keeps meter mounted while idle); re-arm on `playing` edge; **`__reset()` test hook called in setup.ts afterEach** (module state survives tests); **`__setLevel(key, db, channel?)` debug setter** for stories + vitest determinism.
- **useMeter(key)**: `useSyncExternalStore` with per-key cached snapshot refs (identity discipline — notify only on change; no infinite loops).
- **StripMeter render**: display range **[−60, 0] dBFS dB-linear** (`height% = clamp((db+60)/60)·100`; db ≥ 0 → full + clip state). Palette gradient stops: `--meter-green` 0%, `--meter-amber` 70% (=−18dB), `--meter-red` 90% (=−6dB) — zone boundaries agree with stops (C2 verified coherent). **Segments**: repeating-linear-gradient 1px dark lines every 3px overlay (LED look, no N divs). **Peak line**: 1px white/90 at peak-db position. Muted: opacity 0.2 + data-state. Well `--meter-well`.
- **dB marks**: ticks at −60/−40/−20/−12/−6/0 on the shared scale column (A3), 8px aria-hidden (C2: 6-7px below type floor). **Micro-meter (toolbar, 14px)**: no marks, no segments (4 coarse chunks), same palette/engine.
- **Title contract kept**: title = fader dB + live peak (4 test files pin it — minimal churn).
- BridgeRail: same grammar at 44px (stereo pair per audio track + master cluster, one master key).

### A3. Fader polish
- Thumb: `--fader-thumb-1/2` tokens (dark/light); **stable test hook** (data-testid="fader-thumb"). Track: `--inset` + **0dB unity notch** (2px fg/30) + end caps.
- **dB scale column** between fader and meter: labels `+6/0/−6/−12/−24/−48/−∞` at TRUE taper positions (dB-linear = accurate; better than DAW's decorative scale), 8px aria-hidden right-aligned.
- Readout row: fader dB signed 1dp mono tabular-nums + peak dB (green / `-inf`).

### A4. Strip chrome
- **h-1 role-color base bar** (`--mk-role-*`) at strip bottom; section hairlines `--border-strong`; constant widths (84/108; aux 72/88); subtle alternating bg parity; selected = lighter + ring (flash kept).
- M/S/L: 20×18px letter buttons, semantic tokens, aria-pressed, stopPropagation (grammar already close).
- Master: accent-tinted cap (`--fader-cap-accent-1/2`, **flat — no glow**, C2: resolve's flat language), `−∞ dB` guard readout, honest no-pan, inline meter + peak, h-1 accent base bar.
- **TrackHeader audio micro-meters (v2.2 §3.2 promise — never implemented)**: 4px view-only vertical meter per audio track header, fed by shared engine (nearly free). Register in SPEC-REVISION-CANDIDATES as v2.2 alignment closure.
- All readouts mono tabular-nums, signed 1dp, −∞ guards.

### A5. Storybook sync
- Mixer stories exercise knob states (min/center/max/detent), meter levels via `__setLevel` (normal/peak/clip/mute), strip modes (compact/full, bridge); timeline stories updated for zoom/tier changes. Static build re-synced.

## Test-migration list (C2)
- setup.ts: `hasPointerCapture` stub + meterEngine `__reset()` afterEach.
- MixerPrimitives tests: vertical drag grammar (±range/200 per 100px), arc/line assertions (rotate transform, dasharray), detent pointer-only, wheel, bubble; StripMeter dB mapping/palette/segments/peak/mute/clip + engine lifecycle (idle stop, play re-arm, reset isolation); title contract kept.
- ChannelStrip/MixerDock/TimelineToolbar: master key unification, readout/base-bar/micro-meter assertions, micro-meter no-segments.
- Fader: taper unchanged (tests survive); thumb hook selector.

## v2 changes from C2 critique
Indicator antiphase fixed (y 35→20); stereo contract; detent pointer-only; program range −4 (clip reachable); ballistics in dB domain −0.67dB/frame; engine idle+settled stop + reset hook + debug setter; master key unified; duckAmount + effectiveMuted wired; endpoint ticks dropped; indicator stroke 7; 24px full dock; persistent label + bubble; tokens wave A0 first; --knob-active (not --accent-selection); light meter hues kept bright; master glow dropped; scale labels 8px aria-hidden; fader thumb test hook; header micro-meters added (v2.2 closure).

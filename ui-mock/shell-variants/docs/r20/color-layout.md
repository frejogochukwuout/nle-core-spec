# R20-A3 — Color Grading UI Layout + REAL-Functionality Design Doc (for R20-W3)

Task ID: R20-A3 · Agent: research sub-agent · Status: research complete, implementation-ready
Inputs: web research (sources cited inline, JSONs in `r20-analysis/search-*.json` / `read-*.json`),
prior artifacts (`r19-analysis/color-cluster.md`, search-davinci*.json), the 4 user-uploaded color
reference HTMLs, the current R19 color implementation (full read, file:line below), spec
`08-color-grading.md` (full read of §3–§12/§16/§17/§18), spec `04-renderer-color.md` (skim §5/§6/§9/§11/§15G/§16),
`.agents/SPEC-REVISION-CANDIDATES.md` §H (C33–C44), `docs/DESIGN-audio-mode.md` (mixer-dock precedent).

Labeling: **[FACT]** = researched fact with source URL · **[SPEC]** = our spec canon (spec 08/04, section cited) ·
**[CODE]** = current code, file:line · **[PROPOSAL]** = this doc's design decision (for R20-W3 to implement or amend).

---

## 1. LAYOUT TRUTH — Resolve color page + comparators

### 1.1 DaVinci Resolve color page — canonical region map

**[FACT]** Blackmagic's own product page ("The node editor at the top right is like a flow chart. The image starts
at the left and is passed through each color correction or effect node until it reaches the output on the right";
"The scopes palette, located at the bottom right of the screen, features five different scopes"; "The color page
'gallery' lets you organize, share and re‑use grades … middle click a clip in the film strip to copy its grade to
the current shot") — https://www.blackmagicdesign.com/products/davinciresolve/color

**[FACT]** Larry Jordan's guided tour (Panel 1 = Gallery / LUT Browser / Media Pool — one of three choices,
top-left; Panel 2 = Viewer; Panel 3 = Node Editor / Effects — one of two choices; the **Clips icon toggles the
thumbnail timeline**, the **Timeline icon toggles the mini-timeline**; the tool palette below the thumbnail
timeline selects the color tools; the **Keyframe / Video Scopes / Info panel** sits lower-right; the viewer is
"normally … a small panel" with Opt+F / Shift+F / Cmd+F enlarged/full/cinema modes) —
https://larryjordan.com/articles/get-started-with-the-color-page-in-davinci-resolve

Consolidated region map (Resolve 17–20):

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ thumbnail FILMSTRIP (one thumb per timeline clip; = clip picker + grade nav) │
│ mini-timeline (track lanes, compact)          ← both toggleable (Clips icon) │
├──────────────┬───────────────────────────────────┬──────────────────────────┤
│ TOP-LEFT     │ CENTER-TOP: Viewer                │ TOP-RIGHT:               │
│ one of:      │ (top-center, always visible;      │ Node Editor              │
│ Media Pool / │  enlarged/full modes via keys)    │ ribbon: Clips | Nodes |  │
│ Gallery /    │                                   │ Groups (grade LEVEL)     │
│ LUT Browser  │                                   │ + tracker/stabilize icons│
├──────────────┴───────────────────────────────────┴──────────────────────────┤
│ CENTER-BOTTOM: color-correction PALETTE (tool icon strip + ONE tool at a    │
│ time): Primaries wheels (4-across: Lift/Gamma/Gain/Offset, wide short panel)│
│ / Log wheels / Curves / Qualifier / Window / Blur / FX — per-node params    │
├───────────────────────────────┬─────────────────────────────────────────────┤
│ (palette continues; left half)│ BOTTOM-RIGHT: Keyframes / Video Scopes /    │
│                               │ Info (switchable, 1 scope at a time; all-4  │
│                               │ on dual-screen Workspace > Dual Screen > On)│
└───────────────────────────────┴─────────────────────────────────────────────┘
```

Grounded details that matter for us:

- **[FACT]** The 4 primary wheels are lift/gamma/gain **"also known as shadows, midtones and highlights"**; the
  **offset wheel adjusts the whole image**; the same palette carries "adjustment controls, primary bars and log
  controls" (BMD product page, above). The Log wheels are the same 3 tonal zones in log display space
  (https://www.reddit.com/r/davinciresolve/comments/1g3j6gj/ — "in the color wheels tab … lift/gamma/gain … in
  the log wheels … shadow/midtone/highlights").
- **[FACT]** Clip-level vs timeline-level grading: "Normally all grades happen at the clip [level]"; **Groups**
  collect "groups of clips with similar needs" and shared nodes are locked by default (BMD product page).
  **Post-clip group nodes are the standard timeline-level grading alternative** ("Using Post-Clip Grouping As A
  Timeline Grading Alternative", https://mixinglight.com/color-grading-tutorials/revisiting-resolve-grouping-using-post-clip-as-a-timeline-level-grading-alternative;
  also "Group them on the color page. You can then grade the entire group and use a clip level grade additionally",
  https://www.reddit.com/r/davinciresolve/comments/1b2w6b4/fast_group_different_clips_for_grading).
- **[FACT]** Small-window behavior: panels are **collapsed/switched, not removed** — the lower-right panel switches
  between Scopes/Keyframes/Info; the center palette shows ONE tool at a time; "The lower three color panel display
  layout works just fine at 1920x1080. Switch from Scopes to Keyframe view…" (BMD forum,
  https://forum.blackmagicdesign.com/viewtopic.php?f=21&t=176169); at small heights colorists complain the viewer
  is small and use the panel toggles + OS scaling (https://www.reddit.com/r/davinciresolve/comments/ytfylj/).
- **[FACT]** The palette is WIDE and SHORT: our own reference HTML (`resolvecolorwheels_html.html`, 980px panel,
  4 wheels ×231px columns + 48px scalar rows top/bottom — r19-analysis/color-cluster.md §1.6) is a faithful
  reproduction of exactly this center palette.

### 1.2 Comparators

**Adobe Premiere (Lumetri)** **[FACT]**: color correction happens in the **Lumetri Color panel docked in the
right rail** (tabs: Basic Correction / Creative / Curves / HSL Secondary / Vignette / Settings), and **Lumetri
Scopes** is a separate panel "to the left of the Program Monitor" or wherever docked, presets "All Scopes
RGB / YUV" (https://blog.frame.io/2024/08/25/complete-2024-premiere-pro-color-correction-guide,
https://helpx.adobe.com/premiere/desktop/correct-color/add-color-effects/display-lumetri-scopes.html).
→ Lesson: the grading controls live in an **inspector-class right panel**; the preview never moves; scopes are
a **sibling panel**, never a tab that hides the preview.

**Final Cut Pro** **[FACT]**: color tools live in the **Color Inspector** below/beside the Viewer (⌘6), the color
board exposes Color/Saturation/Exposure as pucks in 4 panes; **Video Scopes replace/join the Viewer area**
("Window > Viewer Display > Show Video Scopes … will appear where the Viewer is located",
https://support.apple.com/guide/final-cut-pro/ + https://www.universalclass.com). → Lesson: scopes adjacency to
the viewer is the FCP answer; the grading params are inspector-shaped.

### 1.3 Our shell's own precedent (audio mode) — the "Mixer Console" pattern

**[CODE]** `AppShell.tsx:289-299`: the timeline block = `TimelineToolbar + SceneTabs + flex row [Timeline |
MixerDock]` — the mixer takes WIDTH beside the lanes; `DESIGN-audio-mode.md` v2.2 (docs/, "the mixer moves BESIDE
the multi-track lanes … sharing the timeline area"). Audio focus also **swaps the left mainbody slot** to
SoundLibrary (`AppShell.tsx` audio branch) and boosts/compresses lanes (`useUiStore.ts:262-281` `audioLaneBoost`
→ audio ×1.6, main clamped ≤40, others ≤28; `trackHeights` `useUiStore.ts:1784-1794` filmstrip 80/60 vs blocks
40/34).
→ Precedent grammar: **(a) focus mode mutates the left slot, (b) a mode console lives in the timeline area,
(c) lane heights are view prefs per mode.** The color console extends (b) to a *bottom* dock because the wheels
palette is wide-and-short (full timeline width) rather than tall-and-narrow like a channel strip.

### 1.4 Which Resolve parts map to our shell

| Resolve region | Our shell equivalent | Basis |
|---|---|---|
| Viewer (top-center, always visible) | Viewer center of mainbody — **untouched, always visible in color mode** | user directive (a) |
| Center palette (4 wheels, wide/short) | **ColorConsole in the timeline area** (full width, tabbed) | user directive (c), mixer-console precedent §1.3 |
| Node editor (top-right, Clips/Nodes/Groups ribbon) | **Node graph in the left dock** (R19 placement kept, improved binding) | user directive (d); R19 AppShell.tsx:255 |
| Keyframe/Scopes/Info (bottom-right) | **Scopes dock under the viewer** (kept from R19, now real + compact default) | user directive (e); Premiere/FCP comparators |
| Thumbnail filmstrip (clip picker) | **Frozen lane strip** (compressed timeline lanes — clip under playhead / selected clip = grade target) | user directive (b) |
| Gallery / groups | out of W3 scope (mock-gap registered, C45-family) | §5 ledger |

---

## 2. OUR COMPOSITION DECISION — color-mode region map [PROPOSAL]

### 2.1 Region map

```
┌ Toolbar2 (34px) ──────────────────────────────────────────────────────────────┐
├ MAINBODY (mainBodyH, color default ~42%, min 320 — HSplitter-draggable) ──────┤
│ [LeftDock slot (mediaW, 280 default):                                        │
│    color page ⇒ ColorNodeGraph (scrollable 64px-grid workspace)]             │
│ [Viewer slot — ALWAYS VISIBLE:                                               │
│    Viewer (flex-1, <canvas> grade preview in color mode)                     │
│    + ColorScopesDock (compact strip default, drag-resize, collapsible)]      │
│ [Inspector rail (inspectorW 340):                                            │
│    ClipColorInspector — CLIP-LEVEL adjustments]                              │
├ HSplitter ────────────────────────────────────────────────────────────────────┤
├ TimelineToolbar (34) + SceneTabs (26) ────────────────────────────────────────┤
│ FROZEN LANE STRIP: [TrackHeaders | lanes] — video lanes 24px blocks-style,   │
│    audio lane(s) 16px minimized+dimmed; ruler zone 22px; playhead live;      │
│    video clips clickable (= grade target select); no drag/trim affordances   │
│ COLORCONSOLE: tab strip (28px) + body (flex-1, min ~200px):                  │
│    [Primaries | Curves | Qualifier]  · grade-target segmented control        │
│    [Clip ⇄ Timeline] (Timeline = post-clip-style overall grade)              │
└ StatusStrip (12) + page dock (42) ────────────────────────────────────────────┘
```

Every user directive honored explicitly:
- (a) **Viewer never leaves the composition** — it keeps the mainbody center slot in color mode exactly as in
  edit mode; only its `<img>` stand-in becomes a grade `<canvas>` (§3.6).
- (b) **Inspector = clip-level adjustments**: the right rail becomes `ClipColorInspector` (clip name, node chain
  list, scalar quick-params, LUT) — the "Lumetri Basic Correction" class of control. Audio lanes in the strip are
  minimized/frozen (16px, dimmed, `pointer-events:none` on their clips).
- (c) **The big grading surfaces sit in the timeline area** in a tabbed console — the Mixer-Console precedent,
  bottom-variant (wide-and-short palette wants full timeline width; the R19 rail placement squeezed a 980px panel
  into a 340px column, which is the "very broken" cramped look). Tabs carry the multi-track/overall surfaces,
  and the **Clip ⇄ Timeline target control** gives the "overall in nature" surfaces a real home
  (timeline grade composes after every clip's grade — Resolve post-clip semantics, §1.1).
- (d) Node graph stays in the left dock (scrollable; audio-page SoundLibrary swap grammar).
- (e) Scopes stay **under the viewer** (never a console tab — colorists must watch scopes while dragging wheels;
  Resolve/Premiere/FCP all keep scopes visible alongside the palette, §1.2).

### 2.2 Tab set and contents

| Tab | Contents (wide layout) | Reference / spec basis |
|---|---|---|
| **Primaries** | 4 wheels side-by-side (Lift/Gamma/Gain/Offset, 124px discs + rings + luma thumbwheel + derived YRGB rows); top scalar row (Temp/Tint/Contrast/Pivot/Mid-Detail); bottom master row (Color Boost/Shadows/Highlights/Saturation/Hue/Lum Mix); **LOG sub-mode** (relabel + log-space gamma stage, §3.4.6). At ≥1000px console width all 4 wheels fit natively (the reference panel is 980px); below that, 2×2 reflow (R19 grid rule) | resolvecolorwheels_html.html (cluster §1); spec 08 §4 |
| **Curves** | Master + R/G/B spline editors (256×256 canvas, draggable control points, real histogram behind), 1D LUT bake per spec 08 §5 | spec 08 §5 (no reference HTML — new surface) |
| **Qualifier** | HSL dual-handle gradient bars (Hue Center/Width/Soft/Sym; Sat/Lum Low/High/L-Soft/H-Soft), eyedropper toolbar (pick/−/+/soft/feather/invert), **Show Matte** toggle → viewer renders the mask, matte-finesse fields (subset: Clean B/W, Blur, Invert — honest subset, rest deferred) | qualifier_ui.html (cluster §2); spec 08 §8 |

Not tabs (and why): **Scopes** (must be simultaneously visible — §2.1(e)); **Nodes** (workspace, left dock);
**Gallery/Stills** (out of W3 scope, gap C45-family).

### 2.3 Vertical budget (floor 1280×800, spec 18 §3.2)

Fixed chrome 88 (dock 42 + toolbar2 34 + status 12) + HSplitter 6 + TimelineToolbar 34 + SceneTabs 26 = 154.
Lane strip: 22 (ruler zone, `Timeline.tsx:259` readout-variant 44 → strip uses the compact 22) + main lane 24 +
audio 16 + overlays 18/row ≈ **80px** (vertical scroll if more lanes). Console: tabs 28 + body min 200 = **228**.
→ timeline block ≈ 338; **mainbody = 800 − 154 − 338 = 308…320** (the existing 320 min almost exactly holds):
viewer ≈ 320 − scopes 140 = 180px tall (letterboxed 16:9 ≈ 320×180 image) with **scopes collapsed → 320px viewer**.
Honest note: Resolve at 1080p is also tight (§1.1 small-window FACT); our answer is the same family — collapse the
scopes dock, shrink the strip, and the HSplitter stays user-draggable. At 1440×900 the viewer gets ~310px + scopes
open comfortably. Console body 200px fits the wheels row at reduced ring (110px disc / 132px ring) with the YRGB
row; at ≥240px body the reference 150/124 geometry fits; the wheels grid auto-reflows (R19 `auto-fit,minmax(150px,1fr)`
rule kept, `WheelsPanel.tsx:360`).

### 2.4 What happens to the timeline lanes [PROPOSAL]

- `trackHeights` gains a **`'frozen'`** clip-style (main 24, audio 16, overlay 18) — the color-mode default;
  the strip keeps ruler + playhead + SceneTabs so scrubbing (which re-targets the graded clip, §3.6) stays live.
- Video clips remain **clickable** (select = set grade target); trim/drag/resize affordances are suppressed in
  color mode (honest no-op removed rather than hidden logic: the clip's handles just don't render).
- Audio lanes render dimmed (`opacity .45`) with waveform at min height — "minimized/frozen" per the user's words.
- The MixerDock does not render in color mode (same as today: `mixerVisible` gates it, AppShell.tsx:297); the
  ColorConsole takes the F6 7th-region slot the mixer dock occupies in audio mode (region-cycle parity).

### 2.5 Layout at small heights

Scopes dock: default compact strip (two scopes side-by-side, Parade + Vectorscope, 140px), expand chevron → 2×2
at ~260px, collapse → 36px header (R19 collapse kept, ColorScopesDock.tsx:66-95). Console body scrolls internally
below 200px. Node graph scrolls (already does, ColorNodeGraph.tsx:1-19). Nothing ever removes the viewer.

---

## 3. REAL COLOR MATH SPEC (the core)

Ground rule: **the mock implements spec 08's engine math, on CPU, on the real JPEG stills.** This is the answer to
"the rendering of color space etc. are not correct either": the pipeline is sRGB decode → scene-linear grade →
sRGB encode, with BT.709 luma and the 0.18 linear mid-gray — i.e. the same color-space discipline the engine
shader (spec 08 §17.A-port) uses.

### 3.1 Operating color space

**[SPEC]** Working space = scene-linear RGB, BT.709/sRGB primaries (spec 04 §5.2 "Working linear-light texture",
§6 color management; spec 08 §4.2 "operates on linear-light values — CORRECT"). The mock's JPEGs are sRGB
(8-bit, 1344×768, `shell-variants/public/media/*.jpg`).

- **Decode (exact, 8-bit input):** for code value c∈[0,255], n=c/255:
  `L = n ≤ 0.04045 ? n/12.92 : ((n+0.055)/1.055)^2.4` — precomputed 256-entry `SrgbToLinear[256]` (float32).
- **Encode:** `n = L ≤ 0.0031308 ? 12.92·L : 1.055·L^(1/2.4) − 0.055`, clamp n to [0,1], `c = round(255·n)` —
  precomputed 4096-entry `LinearToSrgb[4096]` (index `round(L·4095)`, clamped) — quantization ≤ 1/4096, well
  below 8-bit display steps.
- **Luma (linear):** `Y = 0.2126·R + 0.7152·G + 0.0722·B` (BT.709; spec 08 §4.2 key change #1).
- **Zone masks (spec 08 §4.2, exact):**
  `shadow = 1 − smoothstep(0.0, 0.18, Y)`; `highlight = smoothstep(0.18, 1.0, Y)`; `mid = 1 − shadow − highlight`
  (0.18 = 18% mid-gray in linear, spec 08 §4.2 key change #2/3).
- **Display clamp is applied ONLY at encode** (spec 08 §4.2 removed the shader clamp to preserve HDR — the mock's
  8-bit display canvas clamps at the display transfer, matching spec 04 §6.3's display-transfer boundary).
- **HSV** (qualifier + hue rotate): computed on **sRGB-encoded code values** (spec 08 §8.2 "converts linear → sRGB
  before the HSV/luma computation" — HSV is a display-space construct).

Documented tradeoff vs the engine: engine works 10/16-bit float end-to-end (spec 04 §5); the mock works 8-bit
sRGB in, ~12-bit linear internally (LUTs), 8-bit out. Same math, lower precision — registered in §5 ledger.

### 3.2 Per-clip grade state model [PROPOSAL — engine-seam-true]

```ts
/** Spec 08 §4.2 WheelsParams, UI-shaped (the 28 f32 pack 1:1, order §17.A-port). */
export interface WheelTint { hue: number; amount: number } // hue 0..360°, amount 0..1
export interface GradeParams {
  // 4 wheels: puck (angle,mag) ⇒ {hue, amount}; luma thumbwheel ⇒ the scalar
  liftTint: WheelTint; gammaTint: WheelTint; gainTint: WheelTint; offsetTint: WheelTint;
  lift: number; gamma: number; gain: number; offset: number;   // scalars; defaults 0, 1, 1, 0
  temperature: number; tint: number;                            // −100..100, default 0
  contrast: number; pivot: number; midDetail: number;           // 1, 0.435, 0 (ref §1.3 defaults)
  saturation: number; exposure: number; colorBoost: number;     // 0, 0, 0
  shadows: number; highlights: number; hue: number; lumMix: number; // 0, 0, 50, 100
  blackPoint: number; whitePoint: number;                       // 0, 1 (spec 08 levels)
  curves?: CurveSet;                                            // optional (spec 08 §5)
  qualifier?: QualifierParams | null;                           // secondary node (spec 08 §8)
}
```

- **State home [PROPOSAL]:** store G-slice `mockGrades: Record<elementId, GradeParams>` + one
  `timelineGrade: GradeParams` (post-clip analog), *not* on ElementJSON — spec 09 has no color fields; the
  `mockMixer` sidecar (DESIGN-audio-mode §1, keyed by trackId) is the established precedent. Undoable per
  committed edit (pointer-up / field commit), via the existing withHistory pattern. Gap C45.
- **Why (hue, amount) and not Resolve's YRGB 4-vectors [SPEC]:** spec 08 §16.A corrects the seed spec — "Each
  wheel is a (hue, amount) pair that produces a single tint … The scalar lift/gamma/gain/offset (one f32 each)
  are independent RGB multiplier controls." The engine uniform is canon; the mock must match the seam it claims
  to wire. The reference HTML's YRGB value rows become **derived readouts** (below), not the state.

### 3.3 Transform order (canon, with sources)

**[SPEC]** Spec 08 §4.2 (ported `colorWheelsFragment`, lines 165–223) fixes the exact order — this supersedes the
"Resolve order: lift→gamma→gain" folklore, which is itself version- and space-dependent. Documented order:

1. zone masks from luma (linear, §3.1)
2. wheel tints, **shadows → midtones → highlights → offset** (each `c = mix(c, c·mix(1,tint,amount), mask)`; spec 08 §17.A-port L177-180)
3. temperature/tint additive (L182-188)
4. exposure `c *= 2^exposure` (L190)
5. contrast with pivot `c = (c − pivot)·contrast + pivot` (L191)
6. midDetail, mid-masked (L192-197)
7. **levels-as-one: `c = (c + lift + offset) · gain`** (L198) then **`c = max(c,0)^(1/max(gamma,0.05))`** (L199)
8. black/white point: `c = (c − black)/(white − black)` (L200-201)
9. shadows/highlights additive × mask (L202-203)
10. saturation `mix(luma, c, 1 + sat/100)` (L205-207)
11. colorBoost (L208-213) — low-chroma-weighted boost
12. hue rotate ±50→0..1 fract (L214-218)
13. lumMix `mix(luma', c, lumMix/100)` (L219-220)
14. **no output clamp** (L222) — clamp only at display encode

**[FACT]** Context for the reader: the classic *video-grade* formula is `f(x) = lift + gain·x^(1/gamma)` with
`f(0)=S, f(0.5)=M, f(1)=H` (https://filmicworlds.com/blog/minimal-color-grading-tools/ — Karis), and ASC CDL is
`out = (in·slope + offset)^power` per channel + saturation (Slope≈Gain, Offset≈Lift/Offset, Power≈Gamma —
https://pomfort.com/article/an-in-depth-look-at-asc-cdl-based-color-controls,
https://mixinglight.com/color-grading-tutorials/what-is-a-color-decision-list-cdl). Spec 08's step 7 is the
CDL-family variant our engine adopted (offset+lift combined additively, gain multiplicative, power on gamma);
the mock implements it verbatim so the preview IS the engine contract.

### 3.4 Exact pixel math (implementable verbatim)

All ops on linear `[r,g,b]` floats (0..~4 HDR allowed). `smoothstep(a,b,x)` = the standard
`t²(3−2t)` clamp form. `lerp(a,b,t) = a+(b−a)·t`.

```ts
// wheelTint (spec 08 §4.2 L159-163):
function hsv2rgb(hDeg: number, s: number, v: number): [number,number,number]; // standard, hDeg 0..360
function wheelTint(c: RGB, hue: number, amount: number, mask: number): RGB {
  if (amount < 0.001) return c;
  const t = hsv2rgb(hue, 1.0, 1.0);            // tint color, chroma 1
  return c.map((ch, i) => lerp(c[i], c[i] * lerp(1, t[i], amount), mask));
}

// temp/tint (L182-188): temp = temperature/100, ti = tint/100
r += temp*0.1;  b -= temp*0.1;  g -= ti*0.1;  r += ti*0.05;  b += ti*0.05;

// exposure/contrast (L190-191):
c *= 2**exposure;  c = (c - pivot) * contrast + pivot;      // componentwise pivot

// midDetail (L192-197): d = luma(c); adj = d + (c - d)*(1 + midDetail/100); c = lerp(c, adj, midMask);

// the CDL-ish levels step (L198-199):
c = (c + lift + offset) * gain;            // componentwise, lift/offset/gain are scalars
c = Math.max(c, 0) ** (1 / Math.max(gamma, 0.05));

// black/white point (L200-201): c = (c - blackPoint) / max(whitePoint - blackPoint, 0.001);
// shadows/highlights (L202-203): c += shadows/100 * shadowMask; c += highlights/100 * highlightMask;
// saturation (L205-207): g709 = luma(c); c = lerp(g709, c, 1 + saturation/100);
// colorBoost (L208-213): g = luma(c); chroma = c - g; c = g + chroma*(1 + boost*(1 - clamp(|chroma|,0,1)));
// hue (L214-218): if (hue != 50) { hsv = rgb2hsv(c); hsv.h = fract(hsv.h + (hue-50)/100); c = hsv2rgb(hsv); }
// lumMix (L219-220): pl = luma(c); c = lerp(pl, c, clamp(lumMix/100, 0, 1));
```

Sub-points the implementer must not miss:

- **3.4.6 LOG sub-mode [PROPOSAL grounded in [FACT]+[SPEC]]:** Resolve's Log wheels relabel
  Lift/Gamma/Gain → Shadows/Midtones/Highlights (Reddit source §1.1) and operate in log space. Implementation:
  same state, the **gamma stage** evaluates in log: `c = 2^(log2(max(c,eps)) ... )` — concretely
  `lg = log2(max(c, 1e-4) + eps); c = 2^((lg − logPivot)·logContrast + logPivot)` with `logPivot = log2(0.18)`
  (log-space contrast is the filmic-worlds prescription, "logMidpoint … 0.18",
  https://filmicworlds.com/blog/minimal-color-grading-tools/). Scalar row swaps labels; masks unchanged. The
  toggle is display+math mode, one state.
- **Curves (spec 08 §5) [SPEC]:** control points in display code-value space (UI-friendliness); bake a
  **256-entry per-channel LINEAR-domain LUT** at edit time: `lutL[i] = srgbDecode(spline(srgbEncode(i/255)))`
  (spline = monotone cubic through the points; identity when untouched — spec 08 §5.2's 256×1 LUT is the same
  bake, rgba8 in FreeCut, §16.B). Applied in the pixel loop right after step 13 (per corrector node position).
- **Qualifier params (spec 08 §8.1 [SPEC])**: `hueCenter/Width/Softness` + `satLow/High/Soft` +
  `lumaLow/High/Soft` + `invert/showMask/strength`. The reference UI's Hue *Center/Width/Soft/Sym* maps to
  center/width/softness (sym splits softness asymmetrically; keep `sym` as a mock-only display split, default 50
  = symmetric). Sat/Lum Low/High/L-Soft/H-Soft map 1:1.
- **Qualifier math (spec 08 §8.2 [SPEC])** on display-encoded values:
  `hd = min(|h−hC|, 1−|h−hC|)` (circular hue distance);
  `hueMatch = centeredRangeMask(hd, 0, hueWidth/2, hueSoftness)` i.e. `smoothstep` rise/fall at both edges;
  `satMatch = rangeMask(s, satLow−soft, satLow, satHigh, satHigh+soft)`; `lumMatch` same on BT.601 luma
  (spec 08 §8.2 uses luminance601 + rgb2hsv — we match); **`mask = hueMatch·satMatch·lumMatch`**;
  `if invert: mask = 1−mask; mask *= strength`. Secondary grade composition:
  `out = mix(origRGB, gradedRGB, mask)` (spec 08 §17.E-port; showMask renders `gray = mask` grayscale).
- **Eyedropper [PROPOSAL]:** click on the viewer canvas → sample the 3×3 average (display code values) →
  set hueCenter = h·360, satLow/High around s ± 0.08, lumaLow/High around l ± 0.06; drag-swatch (pointer down +
  move ≥6px) accumulates min/max over the swept pixels (pick − narrows, pick + widens — the three dropper modes).
  Sampling reads the **current graded buffer** (what the user sees — Resolve behavior).

### 3.5 Wheel puck → state mapping (the YRGB question, resolved honestly)

- **Puck** (2D drag in the disc): `angle θ` (0° = up, CW — the existing drag code, WheelsPanel.tsx:148-156,
  `atan2(dx,−dy)` already computes exactly this) ⇒ **`hue = θ`**; `magnitude m` (0 at center, 1 at rim) ⇒
  **`amount = m`** (rim = full tint; 0.1 is already visible — the multiplicative mix makes amount ~0.2 a strong
  creative push, which matches Resolve's puck feel). **Direction = the sign**: pushing toward a hue adds that
  hue's tint; pushing the opposite way selects the *complementary* hue (no negative amount — the hue wheel IS
  the sign). **[FACT]** the wheel-as-color-picker + separate-luma-control principle: "moving the color should
  not change the luminance of the chosen color … a separate control for … Offset which only affects luminance"
  (https://filmicworlds.com/blog/minimal-color-grading-tools/); Resolve's trackball is luma-compensated and the
  ring is Y — the (hue,amount)+scalar model is the spec-08 formalization of exactly this split.
- **Luma thumbwheel** (the knurled strip under each disc — ref §1.4): sets the wheel's **scalar**
  (lift −0.2..0.2, gamma 0.25..4.0, gain 0.25..4.0, offset −0.2..0.2). Offset displays **×1023 code values**
  (default 25.00 in the reference = Resolve's 10-bit offset readout; ref §1.4 "Offset … defaults 25.00").
- **YRGB numeric rows (derived readouts [PROPOSAL])**: Y cell = the scalar in that wheel's display unit;
  R/G/B cells = the tint vector's per-channel contribution `t_c · amount` in the same unit — i.e. what that
  wheel will do to a fully-masked pixel's channel. Cells are **read-only with an aria hint** ("derived from
  puck — spec 08 §4.2"); direct per-channel numeric editing is a Resolve feature our engine seam doesn't have
  (spec 08 §16.A) → registered as gap C51 sub-question instead of faked. This is the honest fix for the current
  hand-typed `yrgb: [0,0,0,0]/[1,1,1,1]/[25,25,25,25]` defaults that "mean" nothing (WheelsPanel.tsx:42-47).

### 3.6 Viewer render pipeline + scrub consistency

**[CODE]** Today the viewer is `<img src={thumbnail}>` (Viewer.tsx:320) — no transform possible. **[PROPOSAL]:**

```
renderGraded(mediaId, gradeStack): ImageData   // pure-ish, cached
 1. decode cache per mediaId: Image → work canvas (≤960×540, half of 1344×768 ⇒ 518k px)
    → ImageData → Float32Array linear RGB (via SrgbToLinear LUT)      [cached, immutable]
 2. grade pass: for each pixel run §3.3/§3.4 (skip no-op params: identity checks per stage)
    → encode via LinearToSrgb LUT → out ImageData
 3. qualifier active (secondary node): compute mask per pixel (§3.4) →
    out = showMask ? grayscale(mask) : mix(orig, graded, mask)
 4. write to the visible <canvas> (object-contain letterbox, same chrome/scrub/transport rows)
```

- **Grade stack per frame:** `[clipGrade (element under playhead)] → [timelineGrade (post-clip analog)]`, each a
  full GradeParams application in sequence (multi-node chain in W3 = max 2 nodes: primaries corrector + optional
  qualifier node; the graph's fx nodes stay display-only, honest).
- **Scrub consistency:** the existing `mainElementAt(scene, playhead)` (Viewer.tsx:23-26, topmost main-track
  element) resolves the clip; the grade is looked up **by element id** — scrubbing across clips swaps grades
  atomically with the image. rAF-coalesced redraw on playhead + param changes (spec 08 §12.1 strategy: "Don't
  re-render the whole frame … Cache the linear-light working texture … Coalesce rapid slider events" — the spec
  prescribes exactly this caching strategy; the mock implements it on CPU).
- **Perf budget:** 518k px × ~25 flops + 4 LUT reads ≈ 5–15ms per full grade pass on the main thread; scopes
  pass ≈ +2–4ms (§3.7). Acceptable at rAF cadence; if profiling shows jank, move step 2 to a Web Worker (transferable
  ImageData buffer) — the module boundary (`gradedImage.ts`) is worker-ready by design.
- **Source-preview mode (viewerMode 'source'):** shows the **raw poster, ungraded** (source = un-graded asset —
  Premiere Lumetri comparison-view analog) — one-line divergence note in the component.

### 3.7 Scopes — real plots from the transformed image

Data source: the **post-encode 8-bit display buffer** (display-referred signal — what real NLE scopes show;
Resolve scopes measure the video signal). **[SPEC]** scope inventory + angles are canon in spec 08 §11
(Histogram/Waveform/Vectorscope/RGB-Parade [waveform mode 5]/Zebra-new). Sample the full buffer (518k px is
cheap to scan once; the ≤10k-point cap applies to *drawing*, not statistics):

- **Waveform / RGB Parade:** column bins W′=256 (map source x → bin). Per channel c∈{R,G,B}: per column keep a
  256-level histogram `H[x][y]` (Uint32). Draw per column per level: `alpha = 1 − 0.85·(1 − q)` where
  `q = 1 − (1 − n/max)² ` … simpler implementable spec: `alpha = clamp(log2(1+n)/log2(1+max), 0.06, 1)`,
  `globalCompositeOperation 'lighter'`, `fillRect(x, y, 1, 1.5)` (keeps the reference's density-trace aesthetic,
  cluster §4.4-4.5, now fed by real data). Parade = three sub-panels (R|G|B columns); Waveform = overlaid.
  Luma waveform: same on `Y601 = 0.299R+0.587G+0.114B` (scopes use BT.601 luma for legacy graticule parity).
- **Vectorscope:** per pixel (stride so plotted points ≤ 20k): `Y = 0.299R+0.587G+0.114B`;
  `U = 0.492·(B−Y)`, `V = 0.877·(R−Y)` (BT.601, 0..1 units); plot `x = cx + U·G·r`, `y = cy − V·G·r` with
  scale `G = 1/0.6336` (100%-saturation red vector length = 0.877·0.701 = 0.615; magenta = √(0.299²… )≈0.63 —
  normalize so the 6 100% targets sit just inside the outer ring). Graticule **[SPEC]**: 6 target boxes at
  **103°/61°/−13°/−77°/−119°/167°** (R/Mg/B/Cy/G/Yl) on the **75% ring**, circles at 100/75/25%, crosshair,
  **skin-tone line at 123°** (spec 08 §11.3 — this replaces the mock's decorative −105/−45/… angles, which were
  part of the "color space not correct" complaint). Point alpha low + 'lighter' composite = classic glow.
- **Histogram:** 256 bins × 3 channels over the full buffer, normalized to max bin; three stacked tracks, R/G/B
  fills+strokes (reference style kept, cluster §4.7).
- **Y-axis labels:** keep the reference's 0–1023 graticule labels (10-bit convention, matches Resolve); data
  (8-bit 0-255) maps ×4.01 on the axis. Document in-code.
- **Throttle:** redraw ≤10fps while dragging params (spec 08 §11.4 prescribes a 10fps scope throttle — adopt).

### 3.8 What "correct color space" means here (summary of the fix)

| Broken today | Fixed by |
|---|---|
| scopes draw sin()-shaped seeded traces, 10-bit labels over fake data (scopeTraces.ts:82-179) | real histogram/waveform/vector math §3.7 |
| vectorscope targets at wrong angles, no skin-tone line (scopeTraces.ts:313-320) | spec 08 §11.3 angles + 123° skin line |
| wheels/temps/sat are numbers in a vacuum (no pixel anywhere) | full pixel pipeline §3.6 |
| no decode/encode discipline (an `<img>` element) | sRGB↔linear LUT pipeline §3.1 |
| YRGB cells are hand-typed defaults (WheelsPanel.tsx:42-47) | derived readouts §3.5 |
| qualifier HSL bars unmoored from any image (QualifierPanel.tsx:333-336) | real mask math + viewer matte overlay §3.4 |

---

## 4. CURRENT DIVERGENCE AUDIT (R19 implementation vs §2/§3)

All paths relative to `/home/z/nle-core-spec/ui-mock/shell-variants/src/`.

1. **Composition** — 3-region, no console: right rail = `ColorRailPanel` (AppShell.tsx:219), left dock =
   `ColorNodeGraph` when mediaPool/effects on (AppShell.tsx:253-256), scopes under viewer
   (AppShell.tsx:266-268). Wheels+qualifier crammed into the 340px rail with a 2×2 wheel grid
   (WheelsPanel.tsx:360 `auto-fit,minmax(150px,1fr)`), infinite scroll, scopes eating half the viewer height.
   → §2 replaces rail placement with the timeline-area console; rail becomes clip-level inspector.
2. **Zero functionality** — every value is component-local `useState` (WheelsPanel.tsx:276-280;
   QualifierPanel.tsx:332-337), nothing reaches an image, first interaction fires the one-shot
   "display state (spec 08 §4 render round)" toast (useHonestToast.ts:11-14). The user's verdict ("ZERO
   functionality / logic") is accurate. → §3 store + pixel pipeline make every control real.
3. **Color-space wrongness** — scopeTraces.ts:1-13 documents "deterministic seeded trace buffers… pure display
   data"; the four builders (buildParade L82-96, buildWaveform L104-130, buildVector L142-155,
   buildHistogram L158-174) synthesize sine shapes + a fake clip spike; vectorscope targets (L313-320) at
   −105/−45/15/75/135/195° with no skin-tone line; the "skin-tone smear" is decorative. → §3.7.
4. **Wheels** — DEFAULT_WHEELS hardcodes the reference's decorative puck angles/mags (205°/190°/45°/200°,
   .137/.07/.27/.117) and YRGB hand-values (WheelsPanel.tsx:42-47); the puck drag updates angle+mag only
   (WheelsPanel.tsx:148-156) with no hue/amount consumer; LOG toggle only relabels
   (WheelsPanel.tsx:306-319 — "swaps the wheel labels"); LUT select is display state + toast
   (WheelsPanel.tsx:415-433, L438). → §3.2/§3.4/§3.5; LOG gains the log-gamma stage §3.4.6; LUT deferred (gap
   ledger, CPU 3D-LUT trilinear is doable later).
5. **Qualifier** — pure local bars; masks derive from lo/hi percentages (QualifierPanel.tsx:103-109); no image
   sampling (no eyedropper behavior), no matte render, no invert/showMask effect. Morph op is a `useState('Shrink')`
   that never changes (QualifierPanel.tsx:337). → §3.4 (mask math, dropper, showMatte in the viewer).
6. **Viewer** — `<img>` (Viewer.tsx:320), no canvas; color mode reuses it unchanged; grades can't exist. → §3.6.
7. **Node graph** — static NODES table (ColorNodeGraph.tsx:55-64), click-select only, no relation to any clip or
   grade; honest toasts for hand/pan. Fine as display state, but the composition implies grading happens
   somewhere it doesn't. → node→grade binding §6 (minimal: Corrector 01 editable; 02 = qualifier node).
8. **ColorPage.tsx** — vestigial wrapper (L24-36) + re-exports; AppShell imports the sub-components directly
   (AppShell.tsx:21). → keep re-export shim or retire in W3 (test imports must move).
9. **Timeline untouched by color mode** — no lane compression, no console; the user's "timeline can be shorter"
   directive unimplemented anywhere. → §2.4.
10. **Tests** — ColorPage.test.tsx pins the rail-tab anatomy + one-shot toasts; they get rewritten for the
    console (parity discipline: new tests must cover MORE, per R19-REV's no-weakening rule).

---

## 5. SPEC-LEDGER — engine-real vs mock-only, gap ids continuing §H (C33–C44 read; next = C45)

Ledger: `.agents/SPEC-REVISION-CANDIDATES.md` §H.1 (C33–C44 taken; C43 = scopes dock seeded traces — **C43's
"trace generation = engine round" is now superseded by this design: the mock CAN generate real traces from the
display buffer; the 10-bit readback half of C43 stays engine-side**).

**Engine seams that are REAL (mock wires to the same math):**

| Seam | Spec home | Mock fidelity |
|---|---|---|
| WheelsParams 28-f32 uniform + shader math | 08 §4.2/§17.A-port | CPU port 1:1 (order + formulas §3.3/§3.4) |
| Scene-linear pipeline, BT.709, sRGB transfer | 04 §5.2/§6.3 | 8-bit LUT version §3.1 (precision gap registered) |
| Curves 256×1 LUT bake | 08 §5.2/§17.B-port | same bake §3.4 |
| Qualifier HSL keyer | 08 §8/§17.E-port | same math on display values §3.4 |
| Scopes (4 + zebra) + 103°… targets + 123° skin line | 08 §11.1/§11.3 | real 8-bit readback §3.7 (16-bit engine readback = 08 §18, stays engine) |
| Real-time strategy (cache linear, re-run grade only, coalesce) | 08 §12.1/§12.2 | implemented on CPU §3.6 |
| 10fps scope throttle | 08 §11.4 | adopted §3.7 |

**Mock-only inventions (register C45+):**

| # | Invention / gap | Spec clause touched | Where |
|---|---|---|---|
| **C45** | `mockGrades` G-slice — per-elementId GradeParams records + `timelineGrade` (post-clip analog), undoable; engine round decides the doc-model home (spec 09 has no color fields; mockMixer precedent) | 09 (absent), 08 §4 | useUiStore slice |
| **C46** | Color console — timeline-area tabbed grading console (Primaries/Curves/Qualifier + Clip⇄Timeline target) with frozen lane strip; extends the audio-mode mixer-dock precedent to a bottom console | 18 §4.8 (color-mode composition), §5 (lane view-prefs) | ColorConsole, Timeline frozen style |
| **C47** | REAL CPU grade preview in the mock — sRGB→linear→spec-08 order→sRGB on 2D canvas, per-clip + timeline composition, rAF/worker strategy; engine round replaces with the WebGPU path | 04 §7/§9 (WYSIWYG), 08 §12 | lib/color/*, Viewer canvas |
| **C48** | Real scopes from the graded display buffer (supersedes C43's seeded traces; keeps 08 §11.3 angles/skin line; 10-bit readback stays engine) | 08 §11 | scopesMath, ColorScopesDock |
| **C49** | Real qualifier — HSL mask on pixels, viewer matte overlay (showMask), eyedropper sampling incl. −/+ modes | 08 §8.3 (FreeCut panel had no dropper-on-canvas) | qualifierMath, QualifierPanel, Viewer |
| **C50** | Curves panel (no reference HTML; spec-08 §5-shaped spline editor w/ real histogram) | 08 §5.4 | CurvesPanel |
| **C51** | Node→grade binding — selected corrector node edits its GradeParams; serial chain In→Corrector(+Qualifier)→Out renders; YRGB per-channel numeric editing deferred (engine seam is hue/amount per 08 §16.A) | 18 §15.3, 08 §16.A | ColorNodeGraph |
| **C52** | Clip-level color inspector rail (clip quick-params + node list + LUT display) — interlocks with the R20 type-driven inspector redesign (th_mtp4ytb7): becomes its Color section | 18 §4.4 | ClipColorInspector |

---

## 6. IMPLEMENTATION PLAN (one wave, 3 parallel agents after contract freeze)

**New files** (all under `src/`):
- `lib/color/colorSpace.ts` — SrgbToLinear[256], LinearToSrgb[4096], luma709, luma601, rgb↔hsv, smoothstep (~120 LOC)
- `lib/color/gradeMath.ts` — GradeParams, DEFAULT_GRADE, identity checks, applyGradeStage (§3.3 full order),
  wheelTint, masks, curves bake, log-gamma mode (~260 LOC) — **pure, no DOM**
- `lib/color/qualifierMath.ts` — QualifierParams, computeMask(displayRGB) (§3.4) (~90 LOC)
- `lib/color/gradedImage.ts` — decode cache (mediaId→Float32 linear ≤960×540), renderGraded (grade stack +
  qualifier compose + showMatte), rAF coalescing, sampleAt(x,y) for the dropper (~180 LOC; worker-ready seam)
- `lib/color/scopesMath.ts` — waveform/parade histograms, vector point cloud, channel histograms from ImageData
  (~140 LOC) + draw adapters reusing ColorScopesDock's canvas/DPR/ResizeObserver skeleton (ColorScopesDock.tsx:27-60)
- `components/color/ColorConsole.tsx` — tab strip + Clip⇄Timeline target + body mount (~140 LOC)
- `components/color/CurvesPanel.tsx` — spline editor canvas + real histogram behind (~220 LOC)
- `components/color/ClipColorInspector.tsx` — rail: clip name/node chain/scalars/LUT (~160 LOC)
- tests: `gradeMath.test.ts` (identity; lift raises blacks: f(0)=lift; gain scales: f(1)=gain; gamma pivots
  mid; temp +→R↑B↓; sat→gray; sRGB round-trip ≤1 LSB; mask shape at luma 0/0.18/1; CDL spot values; hue wrap),
  `qualifierMath.test.ts` (hue wraparound at 0/360, soft edges, invert), `scopesMath.test.ts` (synthetic
  buffers → exact waveform bins, vector of pure red at 103°-ish angle, histogram counts),
  `gradedImage.test.ts` (pure parts; canvas mocked), component tests per new/changed surface.

**Changed files:**
- `state/useUiStore.ts` — mockGrades slice + timelineGrade + colorConsole{tab,target} + selectedColorNodeId +
  setGradeParam (withHistory on commit) (~+150 LOC, +25 tests)
- `components/pages/color/WheelsPanel.tsx` — rewire to store (per-wheel hue/amount/scalar), wide 4-across
  layout, derived YRGB readouts, LOG math mode
- `components/pages/color/QualifierPanel.tsx` — rewire to store, eyedropper hooks, showMatte toggle
- `components/pages/color/ColorScopesDock.tsx` + `scopeTraces.ts` — real-data path (seeded builders deleted;
  compact-strip default + expand)
- `components/pages/color/ColorNodeGraph.tsx` — node→grade-record binding + honest fx nodes
- `components/shell/AppShell.tsx` — color composition (console mount in timeline block, lane strip mode,
  ClipColorInspector rail, F6 parity)
- `components/timeline/Timeline.tsx` + `state/useUiStore.ts:1784` — `'frozen'` clip-style lane heights +
  color-mode interaction gating
- `components/shell/Viewer.tsx` — color-mode `<canvas>` path (grade stack, scrub consistency) beside the img
- `ColorPage.test.tsx`/`AppShell.test.tsx`/stories — anatomy updates (parity rule: cover more)

**Wave sizing:** ~3,000–3,600 LOC incl. tests. Split: **W3a** math libs + tests (contract: pure functions,
jsdom-safe); **W3b** console + panels + shell/store; **W3c** viewer canvas + scopes + node binding +
integration. Gates: tsc clean, vitest ≥944 (all existing suites keep passing or are migrated 1:1-or-better),
VLM check of a real grade visible in the viewer (drag lift wheel → blacks visibly shift + parade trace moves),
honesty audit (no lying toasts; per-channel editing deferral visible as aria-hint, not silent).

**Out of W3 scope (explicit):** 3D LUT `.cube` application (CPU trilinear — stretch goal, currently display-state),
gallery/stills, tracker/stabilize, power windows, keyframes, HDR tone mapping, worker offload (seam ready).

---

## LEDGER IDS — AUTHORITATIVE MAP (R20-W0 stamp; supersedes the draft table above)

The C-ids in §5 above are DRAFT ids minted before the unified DESIGN-R20 D6
assignment. The AUTHORITATIVE mapping (use these everywhere — code comments,
ledger, threads):

| draft id (above) | FINAL id | meaning |
|---|---|---|
| C45 (mockGrades sidecar) | **C50** | grade sidecar + undo snapshot extension |
| C46 (console layout) | **C51** | ColorConsole layout (incl. clip-rail) |
| C47 (CPU preview) | **C52** | CPU preview pipeline |
| C48 (real scopes) | **C53** | real scopes (supersedes §H C43) |
| C49 (qualifier) | **C54** | qualifier HSL keying |
| C50 (curves) | **C55** | curves tab |
| C51 (node binding) | **C56** | node-graph→grade binding |
| C52 (clip inspector rail) | folded into **C51** | ClipColorInspector lives in the console design |

C45–C49 (final) are owned by docs/r20/insert-modes.md (edit-function seams,
source-transport cluster, audio routing, hover preview, waveform autoplay).

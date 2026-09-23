# R20-A4 — Timeline Cluster Root-Cause & Fix Design (5 reviewer threads)

Scope: `shell-variants` @ f17b929 (pins taken 2026-09-06 01:53–02:06, AFTER R19 f1ad065 —
snapshots reflect current code exactly). All geometry below was re-derived live against the
running Storybook (`agent-browser` on `shell-appshell--edit` @1280 and `--audio-focus` @1440);
every pin bbox in the annotakit threads reproduces bit-exact (±1px) in the live DOM.

Threads: th_mtp5r6yl (markers free-floating) · th_mtp5rda8 (another free-floating marker) ·
th_mtp5rkfj (text clips full height) · th_mtp5tlgu (loop handles half/cropped) ·
th_mtp5v00u (track-head heights) · th_mtp67hys (fade transition objects).

Reference: `/home/z/nle-core-spec/ui-mock/timeline-marker-only.html` (75px ruler = 40px TC row
+ 35px marker strip; shield pins 12×14 top-anchored `top:6px` + `translateX(-50%)`; range =
flex row [left shield −5px margin][8px bar, 20% fill + 2px rails][right shield]) and
`timeline-marker-transcript-withDialog.html` (32px Sub lanes, 24px parchment chips
`top:4px`; range caps are LEFT/RIGHT-pointing shields 7×12 + 8px band).

---

## THREAD 1 — th_mtp5r6yl + th_mtp5rda8: "all these markers are free floating; the code is extremely wrong not a little bit"

### 1a. ROOT CAUSE (FACT)

**One CSS cascade bug breaks ALL marker anchoring: `[data-tip] { position: relative; }` at
`src/styles/app.css:174` is UNLAYERED and therefore beats Tailwind's `@layer utilities`
`.absolute` on every element that has both.**

Mechanism (Tailwind v4):
- `.absolute` compiles into a `@layer utilities` block (verified live via CSSOM: the matched
  `.absolute` rule is a child of a `CSSLayerBlockRule`).
- `[data-tip] { position: relative; }` (app.css:174, needed so the CSS-only tooltip `::after`
  at app.css:175-191 anchors to its host) sits at root level — **unlayered**.
- Cascade law: unlayered author CSS outranks ANY `@layer` rule regardless of order or
  specificity. So every `data-tip` element silently loses `absolute`/`fixed`/`sticky` from
  its Tailwind classes and computes `position: relative`.
- The codebase already documents this exact hazard class twice and missed this rule:
  app.css:44-46 ("control resets MUST live in @layer base — unlayered author CSS would
  outrank Tailwind's @layer utilities and silently kill bg/border/color…") and app.css:342-344
  ("the unlayered `.icon-btn` rule (height: var(--ctrl-h)) outranks layered utilities").

Consequence — the three marker surfaces all render **in normal flow** (the buttons are
`display:block`, `p-0`, height 13/12px) and their inline `left/top` become *relative offsets
from the flow position*, producing a downward staircase out of the marker band into the lanes:

| site | code | wants | computes (live) |
|---|---|---|---|
| ruler point pins | `Ruler.tsx:489` `className="absolute z-[6] block …"` + `data-tip` `Ruler.tsx:485` | absolute | **relative** |
| ruler range marker | `Ruler.tsx:535` `className="absolute z-[6] …"` + `data-tip` `Ruler.tsx:531` | absolute | **relative** |
| clip markers (per-clip pins) | `Clip.tsx:1212` `className="absolute bottom-[2px] z-[3]"` + `data-tip` `Clip.tsx:1209` | absolute | **relative** |
| (bonus) DebugOverlay FAB | `DebugOverlay.tsx:64` `className="fixed bottom-3 right-3 …"` + `data-tip` `DebugOverlay.tsx:61` | fixed | **relative** |

Snapshot evidence (pin bboxes, quoted from the threads):
- th_mtp5rda8 (pinned the mk-3 shield path, `button:nth-of-type(3) > .block > path`):
  `bbox {x:868, y:482.5, w:10, h:12.2}` — live mk-3 = x 868, y 482.5. With the CSS fixed
  (inline `position:absolute` injected as a simulation) mk-3 snaps to y **456.5** (inside the
  14px marker band at y 455–469). The 26px downward drift = flow position (after 2 stacked
  13px pins) + the intended 30.5px top offset.
- th_mtp5r6yl (pinned the mk-5 range fill, `.z-[6] > span:nth-of-type(1)`):
  `bbox {x:944, y:512.5, w:318, h:8}`, `outerHTML <span class="absolute" … style="inset: 2px;
  background: color-mix(in srgb, var(--mk-purple) 20%, transparent)">` — live = x 944, y 512,
  w 318, h 8; after fix → y **457** (in band). The band's own 12px button floats at y 510–522,
  i.e. ~66px below its intended slot (y 456–468), ON TOP of the first video lane.
- Live staircase (edit story, ruler y 426–470, band y 455–469):
  mk-1 y 456.5 (in band — by luck, first in flow), mk-2 y 469.5, mk-3 y 482.5, mk-4 y 495.5
  (each +13 = pinH), range mk-5 y 510. A 9-element live audit (`[data-tip]` × Tailwind
  position class → computed position) found exactly these 9 broken elements (4 point pins,
  1 range, 3 clip markers, 1 DebugOverlay FAB).
- What the reviewer saw: pins cascading diagonally over the overlay + video lanes ("free
  floating"), the range band floating mid-lane, and clip markers sitting at the top edge of
  their clips instead of bottom-anchored (confirmed by VLM read of a live screenshot: green/
  purple/orange pins "pinned to the top edge" of the interview/drone clips).

Why 944/944 tests never saw it (FACT): `app.css` is imported ONLY by `main.tsx:4` — the
vitest setup (`src/test/helpers.tsx`, `src/test/setup.ts`) never loads it, and the pins'
assertions are inline-style based (Ruler.test.tsx:283-290 asserts `pin.style.top ===
'30.5px'`), which is exactly what the broken cascade does NOT touch. jsdom would not apply
the cascade anyway; a computed-position regression is invisible to this suite.

Secondary bug in the same cluster (FACT): the point pin at t=0 (mk-1) centers on the content
origin — `left = snap(t·pps) − pinW/2` (Ruler.tsx:491) → left = −5 → page x 155, i.e. HALF
the pin is clipped by the scroll viewport (scroller starts at x 160). Live: mk-1 x=155, w=10
→ 5px outside. (Same "crop by half" grammar the reviewer flags on brackets in thread 3.)

### 1b. FIX DESIGN (DESIGN)

1. **Move the tooltip host rule into `@layer base`** — app.css:174 becomes:
   ```css
   @layer base { [data-tip] { position: relative; } }
   ```
   (the `::after` / `:hover::after` / `[data-tip-top]` rules at app.css:175-196 can move with
   it — they never collide with utilities, hygiene only). Result:
   - plain `data-tip` buttons keep `position: relative` from base → tooltips still anchor;
   - `data-tip` + `.absolute`/`.fixed` elements: utilities layer wins → absolute/fixed apply
     (the ::after still anchors — the element is positioned either way).
   - Blast radius: fixes all 9 live-broken elements at once (incl. the DebugOverlay FAB).
2. **Regression coverage (the suite's blind spot):**
   - Unit: a vitest that imports the stylesheet text (`import css from
     '../styles/app.css?raw'`) and asserts the `[data-tip]` position declaration is inside a
     `@layer` block (regex `@layer base[^{]*{[^}]*\[data-tip\]\s*{\s*position:\s*relative`).
     Cheap, CI-able, pins the layering law that jsdom cannot.
   - Live gate: add an agent-browser DOM probe to the verification flow: computed
     `position` of `ruler-marker-mk-2`, `ruler-range-mk-5`, `clip-marker-cm-1` must be
     `absolute` in the served story (the R19 flow already runs DOM probes).
3. **Pin edge clamp (mk-1 half-crop):** `Ruler.tsx:491`
   `left: clamp(snapPxToDeviceGrid(m.time * pxPerSec) - pinW / 2, 0, contentW - pinW)` —
   same clamp law the brackets already use (Ruler.tsx:306-310). Pin stays centered whenever
   it's fully inside; flush-left/right at the extremes. Mirror for the range cap SVGs is NOT
   needed (caps overhang by design, reference §1.4 grammar).
4. No changes to marker DOM/geometry: band 14px, pins 10×13, range top 31/h 12 stay
   (Ruler.test.tsx:273-334 keeps passing — inline styles unchanged). Optional (NOT required):
   a taller band per the 35px reference strip if pins feel cramped — separate polish call.

**Tests that break / to update:** none break (inline-style assertions unchanged). Add: the
app.css layering unit test; a Ruler test asserting `ruler-marker-mk-1` `style.left === '0px'`
(edge clamp); optionally assert `data-tip` still present (Ruler.test.tsx:46 already does).

### 1c. RISKS / INTERACTIONS
- Fix 1 is a **hard dependency** for anything that adds `data-tip` to an absolutely
  positioned element later (thread 3's redesigned handles will want tooltips → land fix 1
  first).
- Moving rules into `@layer base` cannot break other tooltips: base still beats nothing that
  matters (element resets in the same layer lose to it by order; utilities beat it — intended).
- The live VLM marker stories (R19 marker verification) should be re-run post-fix; the
  visual language finally matches the reference (pins IN the strip, range band with caps).
- Marker pins overlapping the loop band's dim fill (z 6 vs band z-auto) — unchanged, fine.

---

## THREAD 2 — th_mtp5rkfj: "these are supposed to be narrower vertically" (TEXT clips)

### 2a. ROOT CAUSE (FACT)
`Clip.tsx:932-940` — the `isText` branch renders the body at FULL clip height:
```jsx
<div className="flex h-full items-center justify-center overflow-hidden"
     style={{ background: 'var(--clip-text)', borderRight: … }}> … </div>
```
`h-full` of the clip box, which spans `top-[2px] bottom-[2px]` of the whole lane
(Clip.tsx:1010). Snapshot: pinned `.inset-0 > .items-center` bbox `{x:562.5, y:472, w:149.5,
h:55}` on el-5 (text, tr-overlay-1, 60px filmstrip lane) — live-verified identical (el-5
55px tall in the 60px lane). Meanwhile the caption grammar 2 tracks below already renders
24px chips in a 32px lane (Clip.tsx:838-848, `h-[24px]`, live cap-1 chip 24px), and the
reference (timeline-marker-transcript §2.5) shows text content as 24px bars in 32px lanes.
So text-on-overlay clips are the only full-height text surface — Resolve renders text/title
clips as thin bars; the reviewer wants exactly that.

### 2b. FIX DESIGN (DESIGN)
Render `type:'text'` elements on non-caption tracks as a **centered thin bar** (caption-chip
grammar, `--clip-text` skin), keeping the clip box (drag/select/trim/marquee surface) at full
lane height:

- `Clip.tsx:932-940` becomes:
  ```jsx
  body = (
    <div className="flex h-full w-full flex-col items-center justify-center overflow-hidden">
      <div data-testid={`text-bar-${el.id}`}
           className="mx-[2px] flex max-w-full shrink-0 items-center justify-center overflow-hidden rounded-[2px] border px-2"
           style={{ height: TEXT_BAR_H, background: 'var(--clip-text)',
                    borderColor: 'rgba(0,0,0,0.35)' }}>
        <span className="truncate text-[11px] font-medium" style={{ color: 'var(--clip-text-label)' }}>
          {el.name}
        </span>
      </div>
    </div>
  );
  ```
- `TEXT_BAR_H = clamp(20, Math.round(laneHeight * 0.4), 28)` → 24px in the 60px filmstrip
  overlay lane (matches the caption chip height), 20px in the 34px blocks lane, 28px at 80px.
  Anchored **vertically centered** (Resolve centers text bars; top-anchor would collide with
  the label strip grammar).
- The blocks branch (Clip.tsx:849-859) routes `isText` through the same bar (blocks keeps
  its compact full-height look for video/audio only).
- Label: drop `clipLabel(…, 'center')` for text — the name lives inside the bar (caption-chip
  grammar; the bottom overlay label reads wrong on a 24px bar).
- Alt-drag ghost (Clip.tsx:980-998): render the ghost as the same-height bar (background +
  label) so the preview matches the drop.
- A11y/testids: clip-level semantics unchanged (`clip-${el.id}`, role=button,
  `aria-label` with TC — Clip.tsx:1006). New `text-bar-${el.id}` testid (visual only,
  `aria-hidden` NOT set — it carries the visible name; keep it non-interactive).
- Tests: add a Clip test: `text-bar-el-5` height `24px` at lane 60, centered content, name
  truncated inside; a blocks-variant case (20px); ghost bar parity. Existing el-5 tests
  (open-in-viewer toast, Clip.test.tsx:895-902) are menu-level — unaffected.

### 2c. RISKS / INTERACTIONS
- `audioLaneBoost` compresses overlay lanes to `min(sized, 28)` (Timeline.tsx:281) → bar
  clamps to 20px — still legible.
- Per-track heights (thread 4) change `laneHeight` → bar recomputes via the clamp — single
  source (`laneHeight` prop, Timeline.tsx:896).
- Clip markers on text clips (none in fixtures, but model allows) anchor bottom-2px of the
  full clip box — visually clear of the centered bar. Fine.
- The linked badge (Clip.tsx:1184-1192) and F badge sit at the clip box top — above the bar;
  no overlap.

---

## THREAD 3 — th_mtp5tlgu: loop in/out handles "shouldn't show half and crop by half … properly address it so it doesn't crop"

### 3a. ROOT CAUSE (FACT)
Three compounding geometry defects in the bracket handles (`Ruler.tsx:437-474`):

1. **Half-height handle.** `bracketTop = 14`, `bracketH = bandTop − bracketTop − 1` =
   `30 − 14 − 1 = 15` (Ruler.tsx:311-312) — the handle covers only y 14–29 of the 44px zone,
  i.e. the middle strip between the labels and the marker band. It reads as a "half" bracket
  (the reviewer's "shouldn't show half"). Pin bbox: `{x:250, y:465.2, w:13, h:15}` = the
  13×15 box; live: y 440–455 in the 426–470 ruler. (Pin y is +25.2 vs live — the reviewer's
  taller window; x is exact.)
2. **The fan glyph is drawn cropped.** The svg is `width="9" height={bracketH}` (15) but the
   path uses ZONE-based coordinates: `M7 0 L1 ${zoneH/4} M7 0 L1 0 M7 0 L1 ${zoneH/2.6}`
   (Ruler.tsx:452) → third blade endpoint y = 44/2.6 ≈ **16.92 > 15** → clipped ~2px by the
   svg viewport (SVG default overflow hidden). Live 8× zoom + VLM: the glyph reads as a
   jagged "7", not a 3-blade fan ("crop by half").
3. **Edge clamp + mirror shifts the glyph off its edge.** Natural in-handle position is
   `bandLeft − 2` (Ruler.tsx:307) so 11 of 13 px sit INSIDE the loop region while the fan
   points left (out); at the content edges the clamp (Ruler.tsx:306-310) + `scaleX(-1)`
   mirror (Ruler.tsx:447, 451) flips the fan inward — the handle then straddles the edge
   with its box, glyph hugging the wrong side. The R19 fix (th_mto2ook8) made it *visible*
   but kept the half-bracket look the reviewer is now rejecting.

The drag/keyboard/slider grammar itself is correct and tested (Ruler.tsx:208-237;
Ruler.test.tsx:134-190) — this is purely a visual-geometry redesign, which the reviewer
explicitly invites ("we do need a handler for range so maybe properly address it so it
doesn't crop").

### 3b. FIX DESIGN (DESIGN)
Replace the fan brackets with **full-band, edge-anchored, never-cropping bracket handles**:

- Geometry (readout mode; slim mirrors with its own numbers):
  - `HANDLE_W = 12`; `handleTop = 2`; `handleH = bandTop − 3` (= 27 in readout) — spans the
    TC band, clear of the marker band (pins/ranges live at y 30–44) and of the labels' 11px
    cap (labels start at top 5 but the handle is 12px wide — overlap with a label is
    acceptable and z-[7] already wins; alternatively `handleTop = 17` under the label row if
    visual noise is a concern — implementer's call, keep 2 for grab area).
  - **Anchor INSIDE the loop region:** in-handle `left = bandLeft` (0–12), out-handle
    `left = bandLeft + bandW − HANDLE_W`. At loop.start=0 / loop.end=contentW the handles are
    automatically fully inside the content bounds → **the clamp and the mirror
    (`data-mirrored`, `scaleX(-1)`) are deleted**; keep only a defensive
    `clamp(x, 0, contentW − HANDLE_W)`.
  - Grab target = the whole 12×27 box (324px² vs today's 195px²) — `cursor-ew-resize`,
    `pointer-events-auto`, z-[7] unchanged.
- Glyph: a real bracket, all coordinates derived from the ACTUAL svg height (never crops):
  - in-handle svg 8×(handleH−2): `M7 1 L2 1 L2 ${H-1} L7 ${H-1}` (an open "[" whose stem
    rides the region edge) + optional 3 short grip ticks `M4 ${h} L7 ${h}` at 25/50/75%.
  - out-handle: the mirrored "]" (`M1 1 L6 1 L6 ${H-1} L1 ${H-1}`).
  - stroke `var(--accent-selection)` 1.6px — same token as today.
- Keep: role="slider", all aria values, tabIndex, the bracketHandlers drag + keyboard laws
  (Ruler.tsx:208-237), stopPropagation so drags never scrub.
- Optional tooltip on the handle (`data-tip={tc(loop.start)}`) — **only after thread-1's
  CSS fix lands** (hard dependency, else the handle itself becomes `position:relative`).
- The reviewer's fallback ("maybe just remove") is NOT taken — comment 2 keeps the handler.

**Tests that break / to update:** `Ruler.test.tsx:386-411` (clamp+mirror block):
- 387-394: replace with — loop start 0 → `left === 0`, `width === 12`, full-height
  `style.height === '27px'`, no `data-mirrored` attribute.
- 396-404: loop end at content edge → `left === contentW − 12`, no mirror.
- Add: glyph containment — every path Y coordinate ≤ svg height (the 16.92>15 regression
  class); handle never intersects the marker band (`top + height ≤ bandTop`).
- `Ruler.test.tsx:134-190` (drag/slider/ordering) unchanged.

### 3c. RISKS / INTERACTIONS
- Handle spanning y 2–29 vs labels: brief overlap with an 11px label at the same x —
  visually fine (accent on dim label), and loop edges usually sit between labels.
- Marker band (thread 1) is untouched (y 30–44); z-order unchanged (brackets 7 > pins 6).
- The loop band fill (Ruler.tsx:431-434) still spans full height — the new handles sit at
  its edges INSIDE it, so "show half" disappears and edge cases need no special-casing.
- `zoneH/4`-style math must be purged — keep ONE source: `bracketH`-derived coordinates.

---

## THREAD 4 — th_mtp5v00u: "this applies to all track head: the height should be adjustable"

### 4a. ROOT CAUSE (FACT)
Heights are kind-based constants + ONE global percentage pref — no per-track control:
- `trackHeights(kind, clipStyle)` (useUiStore.ts:1784-1794): filmstrip main 80 / audio 60 /
  overlay 60; blocks 40/34/28. Caption fixed 32 (Timeline.tsx:268).
- `trackHeightPref: 'compact'|'normal'|'tall'|null` (useUiStore.ts:377, set at 1186 — view
  state, NO history) applies 60%/140% to ALL lanes via `laneHeight()` (Timeline.tsx:264-283),
  reachable only through the header context-menu rows (TrackHeader.tsx:108-110).
- The header itself is a fixed-height block: `style={{ height, minHeight: height,
  overflow:'hidden' }}` (TrackHeader.tsx:184), height passed from `laneHeight` (Timeline.tsx
  :730). No resize affordance anywhere.
- Pin: `.shadow-[inset_2px…]` bbox `{x:0, y:563.2, w:159, h:96}` — the tr-audio-1 header in
  the audio-focus story (audio 60 × 1.6 boost = 96 — live-confirmed), i.e. the reviewer
  pinned the biggest lane and asked for the Resolve drag-resize.

Note the naming trap the task flagged: a per-track store field CANNOT be called
`trackHeights` — that name is already the exported kind-height FUNCTION (Timeline.tsx:16
imports it).

### 4b. FIX DESIGN (DESIGN)
Per-track pixel heights as VIEW state, dragging the track-head bottom edge:

- **Store** (view state, no history — matches the pref precedent and its test
  TrackHeader.test.tsx:140):
  ```ts
  trackHeightOverrides: Record<string, number>; // trackId → px; absent = auto
  setTrackHeight: (trackId: string, px: number | null) => void; // null = reset to auto
  ```
  Name it `trackHeightOverrides` (no collision). Reset on scene delete? Track ids are
  stable per scene; stale ids are harmless (looked up per active scene's tracks).
- **`laneHeight()` composition (Timeline.tsx:264-283):** explicit override REPLACES the
  auto/pref'd size, then `audioLaneBoost` still transforms (audio ×1.6, main cap 40,
  overlay cap 28 — Timeline.tsx:281):
  ```ts
  const auto = pref ? … : base;
  const sized = s.trackHeightOverrides[track.id] ?? auto;
  if (audioLaneBoost) return kind==='audio' ? Math.round(sized*1.6) : … ;
  return sized;
  ```
  Documented judgment: audio-focus is a page-level view transform applied uniformly; a
  custom height participates in it proportionally (a custom 60px audio lane shows 96 in
  focus). Keeps the boost from looking broken when some lanes are customized.
- **Min/max:** `MIN = kind==='caption' ? 32 : 24` (caption floor protects the 24px chip +
  4px insets; 24 matches the pref-law floor, Timeline.tsx:270-278), `MAX = 240`. Step 1px.
- **Resize handle (TrackHeader):** a 6px strip at the header's bottom edge, INSIDE the
  overflow:hidden box:
  ```jsx
  <div data-testid={`track-resize-${track.id}`} role="separator" aria-orientation="horizontal"
       aria-label={`Track height ${track.name}`} tabIndex={0}
       className="absolute inset-x-0 bottom-0 z-[2] cursor-ns-resize" style={{ height: 6 }}
       onPointerDown={capture + start} onPointerMove={dy → setTrackHeight(id, clamp(startH+dy, MIN, MAX))}
       onDoubleClick={() => setTrackHeight(id, null)}   // reset to auto
       onKeyDown={↑/↓ ±4px, ⇧ ×4 = 16px, Home/End = MIN/MAX} />
  ```
  Grammar cloned from the app splitter (AppShell.tsx:68-99: pointer-capture drag, arrows
  8px/⇧×4, double-click reset, role=separator) — lanes use 4/16 for finer control.
  Hover affordance: 2px hairline → accent (`group` + `hover:bg-accent/40`), mirroring the
  splitter's `group-hover:bg-accent` rail.
- **Menu:** add a per-track row `Height: Reset to auto` (checked/disabled state derived from
  `trackHeightOverrides[track.id] != null`) next to the global rows (TrackHeader.tsx:108-110).
- **Everything downstream already derives from `laneHeight()`:** lane divs (Timeline.tsx:825),
  header height prop (730), Clip `laneHeight` prop (896), laneTopAt/laneAtContentY walks
  (301-315), drag ghosts (957), marquee bands (428/507). Single-source change; no other
  wiring needed. `tall = height >= 48` (TrackHeader.tsx:75) auto-flips the header to the
  compact single-row layout below 48 — keep (that's the desired adaptive anatomy).
- **Tests:** new — store: `setTrackHeight('tr-main', 120)` → lane div + header both 120,
  `past` length 0 (view state); clamp at 24/240; reset via null; audioLaneBoost composition
  (custom 60 audio → 96; custom 120 main → capped 40 in focus). TrackHeader: separator a11y
  (role/orientation/label/tab stop), keyboard ±4/⇧×4, double-click reset, menu reset row.
  Existing: Timeline.test.tsx:158-161/164-170 pin default heights — keep passing (no
  overrides by default).

### 4c. RISKS / INTERACTIONS
- audioLaneBoost (above): custom main lane >40 gets capped in audio focus — by design,
  document at the store field; if reviewers object later, switch to "override wins
  absolutely" (one-line change in `laneHeight`).
- Text-bar height (thread 2) and fade-object height (thread 5) both key off `laneHeight` —
  they re-flow on resize automatically (clamps absorb extremes).
- Header `overflow:'hidden'` (TrackHeader.tsx:184) clips the resize strip's hover glow —
  keep the strip inside (inset-x-0 bottom-0), no visual bleed.
- Header/lane vertical scroll sync (`onHeaderScrollSync`, Timeline.tsx:716) already scrolls
  both columns; very tall lanes just scroll — fine.
- A11y note: one extra tab stop per track (the separator). The M/S/L buttons are already
  stops; acceptable, and it's the APG-honest resizable path.

---

## THREAD 5 — th_mtp67hys: fade-in/out handles can't be interacted with → transition OVERLAY OBJECTS

### 5a. ROOT CAUSE (FACT)
- The fade overlays are **pure decoration**: `Clip.tsx:909-928` — both ramp SVGs are
  `className="pointer-events-none absolute …"` with `aria-hidden="true"`; the "handle dots"
  (`<circle r="2.6>` at Clip.tsx:916/926) draw a draggable-looking affordance with NO
  interaction. Nothing in the component or store writes `audioFadeIn/Out` from the timeline
  surface — the only write paths are the Inspector Fades group (Inspector.tsx:1354-1379,
  ParamRow → `setFieldAll({audioFadeIn: v})`) and ChannelEditor (111-117).
- Model already supports everything needed: `ElementJSON.audioFadeIn/audioFadeOut` in
  seconds (mockData.ts:77-78; el-6 = 1.0 in / 2.0 out, mockData.ts:207); the history-wrapped
  `setElementField` (useUiStore.ts:1698).
- The reviewer's proposal (quoted): "show a transition overlay object instead … just like
  cross-fading (which we show one already) … only the right half no left half … you select
  and adjust inspector but can adjust width of that transition object to determine where it
  still apply till the 100% kick-in".
- The existing crossfade block pattern to clone: Timeline.tsx:910-936 — `transition-${e.id}`,
  full-lane-height minus 4px inset, 1px border + vertical 30→70% gradient + centered glyph,
  `title`/`aria-label` with seconds, z 7. (Itself still passive — see Risks.)
- Pin evidence: pinned el-6's audio body (`.clip-box > .relative`) bbox `{x:160, y:565.2,
  w:1380, h:91}` (audio lane 96 in audio focus); live edit-story: el-6 at x160 w1380, fade-in
  svg 46×56 at the clip head (1s × 46pps), fade-out 92px at the tail.

### 5b. FIX DESIGN (DESIGN)
Replace the fake curve handles with **selectable, width-draggable fade transition objects**
(one at head for fade-in, mirrored at tail for fade-out). Data model unchanged.

- **Visual object (inside the clip box, after the body, z-[3]):**
  ```jsx
  {fadeLeftW >= 6 && (
    <div data-testid={`fade-object-${el.id}-in`}
         role="slider" aria-label={`Fade in duration, ${el.audioFadeIn?.toFixed(2)} seconds`}
         aria-valuemin={0} aria-valuemax={Math.round(el.duration*24)}
         aria-valuenow={Math.round((el.audioFadeIn ?? 0)*24)} aria-valuetext={`${el.audioFadeIn}s`}
         tabIndex={0}
         className="absolute bottom-[2px] top-[2px] left-0 z-[3] cursor-ew-resize overflow-hidden rounded-[2px]"
         style={{ width: fadeLeftW, border: '1px solid var(--fade-line)',
                  background: 'linear-gradient(to right, color-mix(in srgb, var(--fade-line) 6%, transparent), color-mix(in srgb, var(--fade-line) 20%, transparent))' }}>
      {/* keep the honest audio semantics INSIDE the object: envelope line + inaudible wedge
          (Clip.tsx:914-915 geometry, unchanged) + a small solid glyph at the full-amplitude
          edge (the crossfade block's half-triangle — "right half only") */}
      <div className="absolute inset-y-0 right-0 w-[8px]" style={{ background: 'var(--fade-line)', opacity: 0.55 }} />
    </div>
  )}
  ```
  Right-half semantics: the object covers exactly the ramp span `[0, audioFadeIn·pps]`; its
  RIGHT edge is the full-amplitude boundary (the bright 8px strip), tapering visually to
  nothing at the clip head — i.e. half of a crossfade block, per the reviewer. Tail mirror:
  `right-0`, width `fadeRightW`, bright strip on its LEFT edge, testid `…-out`.
- **Interaction (bracket grammar, Ruler.tsx:208-237 cloned):**
  - `onPointerDown`: stopPropagation (must not start a clip move/trim), select the clip
    (`selectElement(el.id, false)` — selection domain stays the CLIP; the reviewer's
    "select and adjust inspector" — the Fades group in Inspector.tsx:1354 is the keyboard/
    numeric path and already works), setPointerCapture, arm the drag with the live width in
    LOCAL state.
  - `onPointerMove` (buttons===1): live width preview = `clamp((clientX − clipLeft)/pps,
    0, el.duration)` frame-snapped — rendered from local state, NO store writes mid-drag.
  - `onPointerUp`: ONE commit `setElementField(el.id, { audioFadeIn: v })` → exactly one
    undo entry per gesture (the R15-T4 one-entry-per-gesture law, Clip.tsx:13-15;
    `withHistory` at useUiStore.ts:542 records per call — never call it per pointermove).
  - Keyboard on the slider: ←/→ ±1 frame (⇧ ×10), Home 0 / End duration — each keypress one
    `setElementField` commit (undoable step, like bracket nudges).
  - Clamp: each fade independently to `[0, el.duration]` (overlap of in/out objects allowed;
  visual stacking resolved by z — out object above in when they meet). Object hidden below
  6px (current gate, Clip.tsx:909/919 — a 0-width fade renders no object; creating one = drag
  from the clip edge? Out of scope: the Inspector "Fade in" field creates it).
- **Remove:** the fake handle dots (`circle` at Clip.tsx:916/926) — they promised interaction
  they never had (the thread's core complaint). Keep the envelope line + inaudible wedge
  inside the object (honest audio meaning), keep the waveform ramps.
- **Consistency with the crossfade block:** same chrome language (1px border, 2px radius,
  gradient fill, seconds in aria-label, glyph). Follow-up (not this thread): make the
  crossfade block itself selectable/width-draggable the same way, and per-type glyphs — the
  reviewer files that as a separate issue ("different transition effect should show
  different visual indicator (separate issue, apply here too)"): add the glyph slot now
  (fade = wedge; crossfade = two triangles), leave type dispatch as a documented TODO.
- **Tests that break / to update:** `Clip.test.tsx:751-787` — keep the envelope line/polygon
  coordinate assertions (they move inside the object node), drop the circle-dot assertions
  (782-786), add: object testids/aria (valuenow 24 for 1s), width 46px at 46pps /
  `…-out` 92px; pointer-drag on the in object → `el('el-6').audioFadeIn` committed once,
  `store().past` +1 (not +N); arrows nudge ±1 frame; plain click selects el-6 (selection
  `['el-6']`); objects absent when fade = 0. Inspector tests (226-235) unaffected.

### 5c. RISKS / INTERACTIONS
- Hit-target collision with trim handles: the fade-in object occupies the clip HEAD — the
  same zone as `clip-trim-l` (8px, offset −4 OUTSIDE the edge, Clip.tsx:1127-1131). The
  object is INSIDE (left:0, z 3) and trim handles are outside (left:-4, z auto) — they don't
  overlap; but a 6px-wide fade object + 8px trim zone at a narrow clip gets busy. Mitigation:
  fade object drag arms only on its own box; trim handles keep their zones. Verify with a
  narrow-clip test.
- `pointerdown` select-if-unselected: mirrors the context-menu law (Timeline.tsx:767) so the
  object never fights clip selection; linked A/V pair joins via `selectElement` as usual.
- One undo entry per drag is a HARD law — withHistory (useUiStore.ts:542) would otherwise
  spam the stack per pointermove (loop brackets get away with per-move writes only because
  `loop` is view state with no history).
- Thread-1 dependency: the fade objects get `data-tip` (label + seconds)? Then the CSS layer
  fix must land first. Also the clip-marker pins inside the same clips must be verified
  post-fix (they share the file).
- Lane-height interplay (thread 4): object height = clip box height (top/bottom 2px) —
  reflows with `laneHeight` automatically.
- The waveform `ramp` option (CLIP_WAVEFORM_RAMP) stays — the audio envelope and the object
  width tell the same story from two surfaces; if they ever disagree the store is the single
  owner (el.audioFadeIn).

---

## CONSOLIDATED IMPLEMENTATION CHECKLIST (dependency order)

1. **[T1-fix] CSS layering (app.css:174)** — move `[data-tip]{position:relative}` (and the
   tooltip rules) into `@layer base`. Add the `app.css?raw` layering unit test + the live
   computed-position probe (`ruler-marker-mk-2`, `ruler-range-mk-5`, `clip-marker-cm-1`,
   DebugOverlay FAB). *Unblocks every later data-tip-on-absolute element; zero behavior
   change elsewhere.* (~15 lines + tests)
2. **[T1-edge] Point-pin edge clamp** — `Ruler.tsx:491` clamp into `[0, contentW−pinW]`;
   test `ruler-marker-mk-1` left = 0. (5 lines)
3. **[T3] Loop handle redesign** — `Ruler.tsx:306-312, 437-474`: full-band 12×27 handles
   anchored inside the region, bracket glyph with bracketH-derived coords, DELETE clamp+mirror
   (`data-mirrored`); update Ruler.test.tsx:386-411, add glyph-containment + band-clearance
   tests. Optional handle `data-tip` → requires step 1. (~60 lines)
4. **[T2] Text clip thin bars** — `Clip.tsx:932-940` (+ blocks branch 849-859, ghost
   980-998): centered `text-bar-${el.id}` at `clamp(20, lane*0.4, 28)`; label inside the bar;
   new tests. (~40 lines)
5. **[T4] Per-track heights** — store `trackHeightOverrides` + `setTrackHeight` (view state,
   no history; NOT `trackHeights`); `laneHeight()` override-then-boost composition
   (Timeline.tsx:264-283); TrackHeader resize separator (bottom 6px, splitter grammar,
   keyboard 4/16px, dbl-click reset, `track-resize-${id}`) + menu "Reset track height" row;
   store/Timeline/TrackHeader tests; verify existing height pins keep passing. (~120 lines)
6. **[T5] Fade transition objects** — `Clip.tsx:816-818, 909-928` → `fade-object-${el.id}-in/-out`
   sliders (select-on-press, drag width with local preview + ONE `setElementField` commit,
   arrows ±1 frame), remove fake handle dots, keep envelope+wedge; rewrite
   Clip.test.tsx:751-787; glyph slot for future per-type indicators (documented TODO).
   (~150 lines)
7. **[Verify]** — tsc + full vitest; live agent-browser pass on `shell-appshell--edit` /
   `--audio-focus`: markers all inside the band (y 455–469), mk-1 unclipped, brackets
   full-height & uncropped at loop 0/28/content-end, text bar 24px, drag a lane to 120px,
   drag el-6 fade object head → inspector Fades value follows, one undo entry. VLM re-check
   the marker story (R19 flow). Update gap ledger if per-type transition glyphs deferred.

Cross-cutting FACT worth logging for the team: the jsdom suite cannot see stylesheet-cascade
regressions (app.css isn't even loaded in tests; assertions are inline-style based) — the
`?raw` layering test + live computed-position probes are the durable net for this class.

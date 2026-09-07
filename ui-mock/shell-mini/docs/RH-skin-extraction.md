# RH Skin Extraction — design tokens & DOM anatomy from `RH-timeline-editor.html`

**Written:** 2026-09-05 (R16 / shell-mini bootstrap session)
**Source:** `ui-mock/RH-timeline-editor.html` — a SingleFile DOM snapshot of
`https://rhtv.runninghub.ai/project/canvas/…` (RunningHub "RHTV" AI-video canvas).
**Method:** headless-browser computed-style extraction + CSS-rule dump + VLM
screenshot pass.
**Purpose:** this is the ground-truth reference for the shell-mini "RH skin".
Every token below is copied from the snapshot's own CSS (not eyeballed), so the
mini mock can reproduce the look without the 7.2 MB file.

---

## 1. What the reference app actually is

- A **react-flow node canvas** (`.react-flow.rh-canvas-flow.light`) on a near-black
  board `#0d0d0d` with a dot grid (`--canvas-grid-dot: #383838`).
- Node types seen: `rh-group-node` (rounded group frame `rgba(163,159,159,0.21)`),
  `rh-image-node` / `rh-media-node` (media preview cards).
- The **timeline editor** the file is named for is the `rh-quick-cut-node` — a
  floating node card that contains the `quick-cut-timeline` component + a
  480px-tall preview popover above it.
- Page chrome is minimal: a bottom-left **canvas control pill**
  (`.canvas-bottom-pill`, 36px tall, `rgba(20,20,20,0.95)`) with minimap /
  edge-visibility / snap / reset buttons + an ant-design zoom slider.
- The product feel: *floating translucent dark panels over a dotted canvas,
  monochrome-white accents, 8-28px radii, blur glass, generous air*.

## 2. Token set (verbatim from the snapshot's `:root`)

```css
:root {
  /* page / surfaces */
  --canvas-bg-primary: #0d0d0d;
  --canvas-bg-secondary: #1d1f22;
  --canvas-bg-tertiary: #1d1d1d;
  --canvas-node-bg: #171717;
  --canvas-border-subtle: #383b40;
  --canvas-border-active: #4a4a4a;
  --canvas-grid-dot: #383838;

  /* text */
  --canvas-text-primary: #ffffff;
  --canvas-text-secondary: #a0a0a0;
  --canvas-text-tertiary: #858991;
  --canvas-editor-text-primary: #fff;
  --canvas-editor-text-strong: rgba(255,255,255,.92);
  --canvas-editor-text-default: rgba(255,255,255,.84);
  --canvas-editor-text-muted: rgba(255,255,255,.52);

  /* brand / functional accents */
  --rh-green: #02dba3;
  --rh-green-hover: #03c593;
  --canvas-mention-accent: #ccff00;
  --agent-accent-action: #c0ff00;
  --agent-accent-action-hover: #d0ff43;
  --agent-accent-created: #39d7a5;

  /* chrome + controls */
  --canvas-chrome-control-surface: rgba(20,20,20,.95);
  --canvas-chrome-control-hover: rgba(35,35,35,.95);
  --canvas-editor-control-surface: rgba(255,255,255,.065);
  --canvas-editor-control-hover: rgba(255,255,255,.1);
  --canvas-editor-border-subtle: rgba(255,255,255,.1);
  --canvas-editor-border-clip: rgba(255,255,255,.18);
  --canvas-editor-border-empty: rgba(255,255,255,.2);

  /* quick-cut (timeline) family */
  --canvas-quick-cut-editor-surface: var(--canvas-node-bg);
  --canvas-quick-cut-surface: rgba(11,12,13,.88);
  --canvas-quick-cut-toolbar-surface: rgba(255,255,255,.052);
  --canvas-quick-cut-track-surface: rgba(0,0,0,.18);
  --canvas-quick-cut-lane-surface: rgba(255,255,255,.055);
  --canvas-quick-cut-lane-border: rgba(255,255,255,.035);
  --canvas-quick-cut-border: transparent;
  --canvas-quick-cut-accent: #f2f2f2;          /* playhead — WHITE, not red */
  --canvas-quick-cut-accent-ink: #191919;
  --canvas-quick-cut-control-active: #e6e6e6;
  --canvas-quick-cut-selection: #d0d0d0;
  --canvas-quick-cut-slider-active: rgba(255,255,255,.72);
  --canvas-quick-cut-snap-guide: #8f8f8f;
  --canvas-quick-cut-drop-outline: #38bdf8;
  --canvas-quick-cut-text-label: rgba(229,229,229,1);
  --canvas-quick-cut-item-surface: rgba(255,255,255,.025);
  --canvas-quick-cut-audio-label-surface: rgba(20,20,20,.72);
  --canvas-quick-cut-audio-waveform: rgba(255,255,255,.52);

  /* geometry */
  --canvas-editor-radius-pill: 999px;
  --canvas-editor-radius-frame: 28px;
  --canvas-editor-radius-panel: 20px;
  --canvas-editor-radius-track: 10px;
  --canvas-editor-radius-control: 8px;
  --canvas-radius-md: 10px;
  --canvas-radius-lg: 16px;

  /* spacing / metrics */
  --canvas-editor-space-xs: 4px;
  --canvas-editor-space-sm: 8px;
  --canvas-editor-space-md: 10px;
  --canvas-editor-space-lg: 16px;
  --canvas-editor-space-node: 18px;
  --canvas-editor-space-timeline: 28px;
  --canvas-editor-action-size: 34px;   /* toolbar icon buttons */
  --canvas-editor-track-height: 36px;  /* lane height */
  --canvas-editor-clip-inset: 1px;     /* clip inset within lane */
}
```

## 3. `quick-cut-timeline` DOM anatomy (measured at 1920×1080)

```
.quick-cut-timeline            absolute panel; radius 20px; bg rgba(11,12,13,.88);
                               shadow 0 10px 26px rgba(0,0,0,.12) + inset 0 1px
                               rgba(255,255,255,.024); overflow hidden
├─ __tools                     42px; padding 4px 10px; flex justify-end;
│  border-bottom 1px rgba(0,0,0,.14); z 3
│   └─ .quick-cut-toolbar__zoom  34px tall group (pill radius)
│       ├─ __mini-icon (zoom-out)  34×34; transparent; svg 20px;
│       │                         hover bg rgba(255,255,255,.1); disabled .4
│       ├─ __slider              range input 64px wide; track 4px;
│       │                        fill rgba(255,255,255,.72); thumb 12px round
│       └─ __mini-icon (zoom-in)
├─ .quick-cut-ruler            padding 0 10px; z 2
│   └─ __content               height 34px; cursor pointer; min-width 100%
│       ├─ ::before            minor-tick band: top 21px, height 4px,
│       │                      repeating-linear-gradient(rgba(255,255,255,.16)
│       │                      0 1px, transparent 1px <minor-step>)
│       └─ __mark ×N           absolute; 1px wide; translateX(-50%)
│           ├─ __label         top 7px; font 10px; tabular-nums;
│           │                  color rgba(255,255,255,.52); "00:00"…"00:05"
│           └─ __tick          top 19px; 1×7px; rgba(255,255,255,.34)
├─ __playhead-overlay          absolute; inset 42px 10px 16px; z 4; no pointer
│   └─ __playhead (button)     top 19px→bottom; 12px wide; translateX(-50%);
│                               col-resize
│       ├─ ::after             time pill: top -31px; min-w 38px; h 20px;
│       │                      radius 999px; bg #f2f2f2; ink #191919;
│       │                      font 10px/650 tabular-nums; shows on hover+drag
│       ├─ ::before            4px triangle under the pill (same accent)
│       ├─ __playhead-line     2px wide; #f2f2f2; full height
│       └─ __playhead-handle   8×8 dot; top -4px; bg #f2f2f2;
│                               ring 0 0 0 2px rgba(255,255,255,.14)
└─ .quick-cut-stage            margin 0 2px 16px; overflow hidden
    └─ __track-layout          grid; padding 8px; thin white scrollbars
        └─ __tracks-scroll     radius 10px; overflow auto hidden (x)
            └─ __tracks        flex column; gap 8px; bg rgba(0,0,0,.18);
                             radius 10px; min-width 100%
                └─ __track-row__content  height 36px; radius 8px;
                                        bg rgba(255,255,255,.055);
                                        inset ring 1px rgba(255,255,255,.035)
                    └─ __track-item     absolute; top/bottom inset 1px;
                                        radius 8px; per-clip gradient
                                        background e.g.
                                        linear-gradient(135deg,
                                          rgba(120,120,120,.95),
                                          rgba(72,72,72,.92))
                        ├─ __filmstrip  inset 0; repeat-x; size auto 100%;
                        │               ::after edge fade
                        │               90deg rgba(0,0,0,.2)→14%→86%→.24
                        ├─ __trim--start  14px wide; ew-resize; ::before
                        │                 2×10px bar bg #d0d0d0 at 4px
                        └─ __trim--end    mirrored
```

Selection = `.is-selected::after` → `inset 0 0 0 1px #d0d0d0` (ring, not border).
Clip ids look like `quick_cut_item_<ms>_<rand>`. Track rows carry
`data-track-kind="media"`, `role="group"`, `aria-label="媒体"`.

## 4. Other measured chrome (for the mini shell around the timeline)

- Node card frame: radius 28px; bg `#171717` (or `rgba(23,23,23,.92)` preview);
  shadow `0 14px 36px rgba(0,0,0,.18)`; `backdrop-filter: blur(10px)
  saturate(0.82)` (on `.quick-cut-frame`).
- Preview popover: radius 22px; bg `rgba(23,23,23,.92)`; shadow
  `0 18px 42px rgba(0,0,0,.24)`; centered play button 48px pill
  `rgba(20,20,22,.72)` + `blur(12px)`, icon 18px.
- Focus ring: `outline: rgba(255,255,255,.62) solid 2px; offset 2px`.
- Buttons: 34×34 round (pill), transparent bg, hover `rgba(255,255,255,.1)`;
  active tool: bg `rgba(255,255,255,.065)` + icon `#e6e6e6`.
- Bottom pill (canvas controls): 36px tall, radius pill, bg `rgba(20,20,20,.95)`.
- Drop/drag affordances: drop outline `#38bdf8`; snap guide `#8f8f8f`.
- Zoom slider min/max in the quick-cut: range 1-5, step 1 (5 discrete steps),
  filled portion `rgba(255,255,255,.72)` via `--quick-cut-slider-pct`.

## 5. Type

- No custom font stack beyond `system-ui, -apple-system, sans-serif` on body.
- Timeline labels + time pill: 10px, tabular-nums (pill adds weight 650).
- Icon buttons: 20px SVGs inside 34px buttons.

## 6. Deviations the mini mock will register (skin-faithful ≠ app-faithful)

- The reference is a **node-canvas** app; shell-mini is an **NLE shell** — the
  timeline is docked bottom, not a floating node. Skin (tokens, radii, glass,
  playhead) transfers; the canvas/node metaphor does not.
- RH playhead is **white** (`#f2f2f2`) with ink-on-accent time pill — the
  davinci/spec-18 mock used a red playhead. shell-mini follows RH (this file is
  the user-designated skin).
- Filmstrips in RH are real decoded frames; shell-mini mocks them with
  repeat-x SVG data-URI gradients per media asset.
- RH has no track headers, no status strip, no media pool/inspector in the
  snapshot (they live in other panels of the app). shell-mini adds minimal
  NLE-shell regions in the same token language.

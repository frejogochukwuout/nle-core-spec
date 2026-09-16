# R20-A2 — MEDIA INSERT MODES contract (research → R20-W2 implementation input)

Task ID R20-A2 · research-only (no app files touched). Sources: `ui-mock/timeline_edit_modes (2).html`
(the NEW reference, read in full, 744 lines), `ui-mock/nle_edit_workflow.html` (R19's), opencut-timeline
cloned read-only at `/home/z/r20-ot` @ **4d56c17** (2026-09-04, W9-sealed, 438/438), spec 06 §5.9 / spec 15
§13.15, ledger `.agents/SPEC-REVISION-CANDIDATES.md` §H (C33–C44), live annotakit snapshots
(th_mtp6gosg_f301999j = GH #63, th_mtp8zvvs_c4czv154 = GH #64, th_mtp931bs_xa43vq8h = GH #65), and web
research (URLs inline). Everything labeled **RESEARCHED FACT** vs **PROPOSAL**.

---

## 1. REFERENCE EXTRACTION — `timeline_edit_modes (2).html`

Layout: a tab-nav of 6 modes (Insert / Overwrite / Replace / Append at End / Ripple Overwrite / Fit to
Fill); each view-panel = header (44×44 icon + 32px/800 title) + description + a 600×270 timeline diagram
showing the SAME 4 clips (Desert/Turtle/Surf baseline + Sunset as the incoming source clip) in the mode's
final state. `switchMode()` (line 732-740) just toggles `.active` classes — the "final state" is static CSS
per mode (lines 264-340). This is literally a hover/teaching diagram of placement outcomes — the model for
our hover-placement-preview (§3).

### 1.1 Header icons — verbatim SVG (44×44 viewBox 0 0 44 44 each)

**Insert** (lines 417-422):
```html
<rect x="2" y="14" width="10" height="18" fill="none" stroke="#8c8c8c" stroke-width="2.5" rx="1"/>
<rect x="32" y="14" width="10" height="18" fill="none" stroke="#8c8c8c" stroke-width="2.5" rx="1"/>
<rect x="14" y="4" width="16" height="18" fill="none" stroke="#ffffff" stroke-width="2.5" rx="1"/>
<path d="M 18 26 L 22 30 L 26 26" fill="none" stroke="#8c8c8c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
```
Grammar: white = the incoming source clip (center, raised); gray = timeline context (two flanking clips);
the small chevron = "everything else pushes down" (matches the description's "pushes everything else down").

**Overwrite** (lines 467-471):
```html
<path d="M 6 12 h 18 v 14 h -18 z" fill="none" stroke="#8c8c8c" stroke-width="2.5" rx="1"/>
<path d="M 14 20 h 18 v 14 h -18 z" fill="#111111" stroke="#ffffff" stroke-width="2.5" rx="1"/>
<path d="M 36 6 v 8 m -3 -3 l 3 3 l 3 -3" fill="none" stroke="#8c8c8c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
```
Grammar: gray back-clip partially covered by the white-filled front clip (the overwrite overlap) + a
down-trickle arrow on the right.

**Replace** (lines 512-526):
```html
<rect x="2.5" y="13.5" width="18" height="15" rx="2.5" fill="none" stroke="#8c8c8c" stroke-width="2"/>
<rect x="23.5" y="13.5" width="18" height="15" rx="2.5" fill="none" stroke="#ffffff" stroke-width="2"/>
<line x1="11.5" y1="27" x2="11.5" y2="33.25" stroke="#111111" stroke-width="6.5"/>
<line x1="32.5" y1="10.75" x2="32.5" y2="17" stroke="#111111" stroke-width="6.5"/>
<path d="M 11.5 19.5 L 11.5 31 Q 11.5 33.75 14.25 33.75 L 17.25 33.75 Q 20 33.75 20 31" fill="none" stroke="#8c8c8c" stroke-width="2" stroke-linecap="round"/>
<path d="M 7.25 22 L 11.5 17 L 15.75 22" fill="none" stroke="#8c8c8c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M 32.5 22.5 L 32.5 11 Q 32.5 8.25 29.75 8.25 L 26.75 8.25 Q 24 8.25 24 11" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
<path d="M 28.25 20 L 32.5 25 L 36.75 20" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
```
Grammar: gray = outgoing clip, white = incoming; two curling swap arrows (up-arrow on outgoing, down-arrow
on incoming), with `#111111` knockout lines where arrow shafts cross clip edges.

**Append at End** (lines 567-574):
```html
<rect x="18.6" y="7.9" width="20.2" height="16.7" rx="2.5" fill="none" stroke="#8c8c8c" stroke-width="2"/>
<path d="M 16.5 19.7 L 11.3 19.7 Q 8.3 19.7 8.3 22.7 L 8.3 32.7 Q 8.3 35.7 11.3 35.7 L 26.2 35.7 Q 29.2 35.7 29.2 32.7 L 29.2 27.1" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
<path d="M 31.3 29.5 L 33.7 33.9 L 36.1 29.5" fill="none" stroke="#8c8c8c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
```
Grammar: gray back-clip (the existing timeline tail) + white open-corner front clip sliding in at the end +
a small chevron ("more follows").

**Ripple Overwrite** (lines 615-623):
```html
<path d="M 10.2 19.05 L 5.3 22.6 L 10.2 26.1" fill="none" stroke="#8c8c8c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M 34.4 19.05 L 38.7 22.6 L 34.4 26.1" fill="none" stroke="#8c8c8c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="12.6" y="12.75" width="19.1" height="12.45" rx="2.2" fill="none" stroke="#ffffff" stroke-width="2"/>
<path d="M 13.1 27.3 L 13.1 30.65 Q 13.1 32.25 14.7 32.25 L 30.35 32.25 Q 31.95 32.25 31.95 30.65 L 31.95 27.3" fill="none" stroke="#8c8c8c" stroke-width="2" stroke-linecap="round"/>
```
Grammar: white incoming clip + a gray open-top "ripple tray" beneath (the rest of the timeline that shifts)
+ two outward push chevrons (left+right = "push down / pull in").

**Fit to Fill** (lines 668-677):
```html
<path d="M 17.75 12.75 L 12.4 12.75 Q 9.4 12.75 9.4 15.75 L 9.4 30.1 Q 9.4 33.1 12.4 33.1 L 17.75 33.1" fill="none" stroke="#8c8c8c" stroke-width="2" stroke-linecap="round"/>
<path d="M 26.25 12.75 L 31.6 12.75 Q 34.6 12.75 34.6 15.75 L 34.6 30.1 Q 34.6 33.1 31.6 33.1 L 26.25 33.1" fill="none" stroke="#8c8c8c" stroke-width="2" stroke-linecap="round"/>
<path d="M 16.9 18.75 L 11.9 22.9 L 16.9 27.1" fill="none" stroke="#8c8c8c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M 27.1 18.75 L 32.1 22.9 L 27.1 27.1" fill="none" stroke="#8c8c8c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="20" y="13.1" width="17" height="19.4" rx="2.5" fill="none" stroke="#ffffff" stroke-width="2"/>
```
Grammar: side brackets + outward speed chevrons = "stretch/squeeze the range" + white source clip inside.

**Speed badge gauge icon** (13×11, viewBox 0 0 14 12, used in the Fit-to-Fill timeline, lines 701-704 and
711-714):
```html
<svg width="13" height="11" viewBox="0 0 14 12" xmlns="http://www.w3.org/2000/svg">
  <path d="M 2 10.5 A 5.5 5.5 0 1 1 12 10.5" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>
  <line x1="7" y1="10" x2="9.9" y2="5.9" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>
</svg>
<span>1.7x</span>
```

### 1.2 Descriptions — verbatim

- **Insert** (lines 426-431): "Inserts a clip into the timeline at the location of the playhead and pushes
  everything else down to make room for it. If the playhead is in the middle of a clip, it will split the
  clip and place the new clip in the middle."
- **Overwrite** (lines 475-480): "The overwrite edit is one of the most common types of edits. When you
  perform an overwrite, it will place a new clip on the timeline at the location of the playhead, writing
  over whatever clip or clips were there before."
- **Replace** (lines 530-535): "Replaces a single clip on the timeline with one of the exact same length.
  The "out" point of the clip you are editing into the timeline will be changed so it fits perfectly, making
  it the same duration as the one it replaces."
- **Append at End** (lines 578-583): "Append at end places the source clip after the last edit on your
  timeline, regardless of where the playhead is located. You can also use it to add multiple clips from the
  media pool to the end of your timeline all at once!"
- **Ripple Overwrite** (lines 627-632): "Ripple overwrite replaces a shot of one length with a shot of a
  different length. Longer clips replace the clip in the timeline and push everything down to make room,
  while shorter clips pull things in so there are no gaps."
- **Fit to Fill** (lines 681-686): "Fit to fill takes the portion of the clip that you have marked and adds
  a speed change to speed it up or slow it down. The speed change is automatically calculated so it fits
  into the space you have selected on the timeline."

(7th mode `placeOnTop` is NOT in this reference — it comes from `nle_edit_workflow.html` §3.4 rows 220-227,
whose icon is a 24-box lucide-style two-rect stack; our EditOverlay already uses `Layers` for it — keep.)

### 1.3 Timeline-diagram visual grammar (the ghost/arrow language)

| Token | Spec (verbatim from CSS) |
|---|---|
| Ghost slot | `border: 2px dashed #646464; border-radius: 4px` — no fill (`.clip-ghost`, line 221-229; fit-slot reuses it, line 343-353) |
| Down arrow (clip enters track) | 16×28, path `M 5 0 L 11 0 L 11 16 L 16 16 L 8 28 L 0 16 L 5 16 Z`, fill `#ffffff`, `drop-shadow(0 2px 4px rgba(0,0,0,.6))`, anchored at ghost center-x (e.g. insert: ghost left 155 + 79.5 = 234.5) |
| Right arrow (followers shift) | 28×16, path `M 0 5 L 16 5 L 16 0 L 28 8 L 16 16 L 16 11 L 0 11 Z`, fill `#ffffff`, same shadow; shown ONLY for insert (top 149) and ripple (top 187) — i.e. only when downstream clips move |
| Active (source) clip | `border: 2px solid #6ba4d8`, radius 6, z 10, shadow `0 10px 20px rgba(0,0,0,.5)`, title bar `background: #6ba4d8` (lines 207-218); all inactive clips dimmed `rgba(0,0,0,0.25)` overlay (163-168) |
| Fit-to-fill slot | dashed slot + `slot-image` at `filter: brightness(.45)` + slot-title `rgba(107,164,216,.4)` bg, `color: rgba(255,255,255,.75)` (343-376) |
| Speed badge | `background: rgba(17,17,17,.62); border: 1px solid rgba(255,255,255,.28); border-radius: 10px; padding: 2px 8px 2px 6px; gap 4px; font 12px/700` + gauge icon (378-395); the SOURCE clip's own badge shows `1x` at its natural rate, the slot's shows the computed `1.7x` |
| Playhead | `#ff3b30` 2px line, top handle path `M 0 0 L 14 0 L 14 10 L 7 16 L 0 10 Z` fill `#ff3b30` |
| Canvas | timeline bg `#26272b` radius 12; grid lines `#35373c` every 190px; ruler ticks = two repeating-linear-gradients `#5c5d62` @95px + `#45474c` @9.5px |
| Tab-nav | container `#1c1d21`, padding 6, radius 10, gap 12; buttons: transparent, `#8c8c8c` 15px/600, padding `8px 20px`, radius 6; hover → white; active → `background: #35373c; color: #ffffff` (lines 22-54) |

Per-mode geometry facts worth pinning (lines 264-340): **insert** ghost@playhead + Turtle/Surf shift right
by the source duration + right-arrow; **overwrite** ghost z-8 OVER the covered span, followers NOT moved;
**replace** incoming clip adopts the replaced clip's WIDTH (105px) — exact-length swap; **append** ghost at
lane end (430), nothing else moves; **ripple** ghost@155 + surf shifts right (longer case); **fitfill**
ghost = the fit-slot at the In/Out span width (105) with dimmed slot image + 1.7x badge, source clip retains
its own 1x badge.

### 1.4 Adapting the 44px header icons into transport tool buttons — PROPOSAL

Our transport row is 32px tall (Viewer.tsx:499); the row's icon buttons are `icon-btn !h-[20px] !w-[20px]`
with lucide 13px @ strokeWidth 1.6 (visual stroke ≈ 0.87px). Keep the reference icons **verbatim** (path
data untouched, `viewBox="0 0 44 44"`) rendered at **18–20px**: at 20px the reference's 2.5-unit strokes are
2.5 × (20/44) ≈ **1.14px visual** — already in-family with our lucide look; at 16px ≈ 0.9px = exact match.
No stroke munging needed. Recolor only: `#ffffff` → `var(--text-primary)` (incoming/source), `#8c8c8c` →
`var(--text-muted)` (context), `#111111` (Replace knockouts) → `var(--bg-panel)`. Two-tone semantics survive
at small size (white = what the op adds, gray = what it acts on) — this is the "24px toolbtn grammar": boxed
`h-[24px] w-[24px]` (or 20px in-kind with the row), 18px SVG, `data-tip` = the reference description
condensed to one line, `aria-label` = mode name.

---

## 2. UX PLACEMENT DECISION INPUT (issues #63/#64)

**The reviewer's ruling (RESEARCHED — pinned DOM):** #63 (pin on `shell-viewer-edit-overlay-dock`,
Viewer.tsx:385, bbox 44×223 at the program frame's right edge): "this is a misunderstanding - the original
html mockup has these operations on overlay, but it was supposed to apply to the SOURCE (when in source
preview) as potential insert edits, not for normal timeline preview output". #64 (pin on
`shell-viewer-transport` in the source-mode DOM, Viewer.tsx:507): "related to issue #63, this is actually
the right place to put those new footage insertion mode action buttons".

**NLE conventions (RESEARCHED):**
- **DaVinci Resolve** — Blackmagic's own Edit-page page: "The edit overlay gives you instant access to the
  most popular types of edits, letting you quickly choose between insert, overwrite, replace, fit to fill,
  place on top…" (https://www.blackmagicdesign.com/products/davinciresolve/edit). In the app this overlay
  strip sits **under the SOURCE viewer** of the dual (source+timeline) viewer pair on the Edit page
  (https://forum.blackmagicdesign.com/viewtopic.php?f=21&t=38240 — the source monitor is part of the default
  dual layout; "single viewer" = closing the source half). Ripple-overwrite is a keyboard-shift variant
  (Shift+F10, https://writedirect.co/how-to-insert-overwrite-and-delete-footage-in-resolve).
- **Premiere Pro** — dual Source/Program monitors; "In the Source monitor, you'll find the Insert and
  Overwrite buttons right next to the group of transport controls"
  (https://www.makeuseof.com/how-to-use-premiere-button-editor-buttons-and-shortcuts-explained); keyboard
  `,` = insert, `.` = overwrite (https://www.facebook.com/groups/premierepro/posts/1057743730970021).
  Buttons are **one-shot actions**, not toggles.
- **Final Cut Pro** — single main viewer (+ optional event viewer); edit modes live as keyboard commands +
  menu: "Choose Edit > Insert (or press W)" with skimmer-position insertion
  (https://support.apple.com/guide/final-cut-pro/insert-clips-ver4e2eff6/mac); the canonical four are
  "append, insert, overwrite, and connected" (https://www.peachpit.com/articles/article.aspx?p=3150365&seqNum=4);
  keys E/W/D (https://filmora.wondershare.com/final-cut-pro/final-cut-pro-shortcuts.html).
- **CapCut** — no monitor-level mode buttons; insertion is drag-to-timeline with drop affordances (+ button
  on clips / drop between) (https://www.capcut.com). Not a precedent for a mode row; our row follows the
  pro-NLE grammar instead.
- **Default mode**: no NLE has a persistent "current insert mode" — Insert/Overwrite are independent
  one-shot verbs; Resolve's Smart-Insert family likewise. (RESEARCHED via the button behavior docs above.)

**PROPOSAL (decision input for R20-W2):**
1. **Move**: delete the program-monitor dock (Viewer.tsx:384-391 `<div data-testid="shell-viewer-edit-overlay-dock">…<EditOverlay/></div>` + the import at Viewer.tsx:18). Nothing replaces it — the program monitor becomes a clean full-frame output (the dock also covered ~44px of the program image, snapshot #63 bbox x=740 w=44). The EditOverlay component is reborn as a **horizontal SourceEditBar** rendered inside the source-mode transport row (Viewer.tsx:498-505), which currently renders two EMPTY flex zones flanking the "Source duration" TC — the buttons fill them.
2. **Grouping**: left zone = **Insert, Overwrite** (the universal pair; Premiere puts them next to transport), then a divider, then the secondary four (Replace · Fit to Fill · Place on Top · Append · Ripple Overwrite). 7 boxed 24px buttons ≈ 7×26 + divider ≈ 195px — fits the left flex-1 of an 800px-wide viewer with the duration TC on the right; if the mock's viewer gets narrower, collapse the secondary four behind a single overflow "⋯ more edit modes" menu (PROPOSAL: keep all 7 visible at ≥560px viewer width, overflow menu below).
3. **State**: NO persistent mode, NO radiogroup (would imply a modal editing state that no NLE has). One-shot action buttons; `aria-pressed` is wrong here (nothing is "on"). Keep `role="toolbar"` + `aria-orientation="horizontal"` + roving tabindex with ←/→/Home/End (mirror the vertical rover already written in EditOverlay.tsx:44-68). A "last mode used" may persist ONLY as a tooltip/undo-label nicety, never as UI state.
4. **Keyboard**: `,` / `.` for insert/overwrite (Premiere grammar; F-keys are browser-hostage — F11 fullscreen). Bind only while `viewerMode==='source'` && a source with duration is loaded; otherwise fall through. Log in shortcutMap.ts (currently zero insert-family rows — RESEARCHED, grep of src/lib/shortcutMap.ts).
5. **What the buttons act on**: the SOURCE viewer's asset — `sourceMediaId` — not `mediaSelection[0]` (see §6 bug #2: clip-menu 'Open in viewer' sets sourceMediaId without touching mediaSelection, so the current EditOverlay can insert the WRONG asset). In source mode the two are usually the same (MediaPool syncs selection→source, MediaPool.tsx:421), but sourceMediaId is the truthful single source of truth.
6. **Stays in source mode after insert** (Resolve/Premiere behavior — repeated inserts are the point); the timeline + toast show the result; X button exits. (PROPOSAL)

---

## 3. HOVER-PLACEMENT-PREVIEW DESIGN

**Precedent check (RESEARCHED):** no mainstream NLE previews the edit result on *button hover* — Resolve's
edit-overlay buttons show tooltips only; FCP skims *content*, not placement; a BMD forum thread even argues
"The Timeline viewer must never show the picture" on hover scrub
(https://forum.blackmagicdesign.com/viewtopic.php?f=33&t=166308). The user's own reference HTML **is** the
precedent: it statically demonstrates exactly these final-state diagrams per mode (§1.3). So this is a
**PROPOSAL (novel affordance)** that extends the drag-preview grammar we already ship (R15 T3
`clip-drag-ghost`, Timeline.tsx:941-967 + insert-line :969-978) from "drag previews placement" to "hover
previews the edit op".

### 3.1 The pure planner (plan/apply split) — PROPOSAL

Refactor `insertMediaAt`'s placement math (useUiStore.ts:864-1040) into a **pure planner** + a thin
**applier**, so preview and commit are the SAME computation (preview-WYSIWYG by construction, the same
discipline OT uses with `resolveTrackPlacement` → `applyPlacement`, placement/index.ts:392 / apply.ts:177):

```ts
// src/lib/insertPlan.ts  (new — pure, no store import)
export interface InsertPlan {
  ok: boolean;
  reason?: string;            // honest refusal: locked lanes / replace-needs-selection / fitToFill-needs-range / rate-clamp
  mode: InsertMediaMode;
  mediaId: string;
  targetTrackId: string;      // resolved lane (audio law from §5)
  createTrack?: { index: number };               // placeOnTop mints an overlay lane
  ghost:  { startTime: number; duration: number; speed: number };  // where the new clip lands (+1.7x for fitToFill)
  split?: { id: string; at: number; rightStart: number };          // insert straddler (useUiStore.ts:973-995 dry-run)
  displaced: { id: string; from: number; to: number }[];           // insert/rippleOverwrite follower shifts
  overwrite: { id: string; start: number; duration: number; result: 'head'|'tail'|'split'|'removed' }[];  // applyOverwriteSpans dry-run (useUiStore.ts:568)
}
export function planInsertMedia(
  scene: SceneJSON, mediaId: string, mode: InsertMediaMode,
  ctx: { playhead: number; loop: { start: number; end: number }; selection: string[] },
  opts?: { time?: number },
): InsertPlan;
```

Store changes: `insertMediaAt` becomes `applyInsertPlan(planInsertMedia(...))` (one history entry, existing
toasts — behavior unchanged, existing store tests must stay green), plus two additions:
`hoverInsertPreview: InsertMediaMode | null` and a derived selector
`selectInsertPreview(state): InsertPlan | null` = `state.viewerMode==='source' && state.sourceMediaId &&
state.hoverInsertPreview ? planInsertMedia(scene, sourceMediaId, mode, {playhead, loop, selection}) : null`.
**No mutation on hover** — the plan is only geometry.

### 3.2 Timeline rendering — reuse the drag-ghost layer — PROPOSAL

Timeline subscribes to `selectInsertPreview` and renders, in the same z-10 layer as drag ghosts
(Timeline.tsx:941-978):
- **Ghost clip**: reuse `clip-drag-ghost` + a dashed-border variant (`border: 2px dashed` in
  `var(--border-strong)` ≈ reference `#646464`) at `(ghost.startTime × pxPerSec, laneTop(targetTrackIndex))`;
  fill with `ghostBg(type)` (Timeline.tsx:686-689).
- **Displaced followers** (insert/rippleOverwrite): the reference's white right-arrow (verbatim 28×16 path,
  fill `var(--accent)`) at each displaced clip's ORIGINAL left edge, vertically centered on the lane; the
  real clip gets a `data-displaced` tint + translate-preview is NOT needed (arrow + tint is the reference
  grammar; keep the real clips in place — the diagram reads "these will move").
- **Overwrite span shading** (overwrite/replace/fitToFill): absolute overlay divs over the covered regions
  of the real clips — `background: rgba(0,0,0,.55)` + diagonal hatch — the reference's brightness(.45)
  slot-image treatment, adapted to overlay-on-clip.
- **Split tick** (insert straddler): 2px vertical accent line at `split.at` on the straddling clip (the
  reference's Replace dual-pane edge, `border-left: 1px solid rgba(255,255,255,0.3)` line 303).
- **Speed badge** (fitToFill): chip on the ghost = gauge SVG (verbatim, §1.1) + `${(ghost.speed).toFixed(2)}×`
  styled per reference (§1.3).
- **Refusal**: `ok:false` renders NO geometry; the hovered button's `data-tip` swaps to the plan's `reason`
  (honest: never paint a preview the op won't perform — same law as the store's honest toasts).

All preview layers `aria-hidden` + a single `role="status"` line near the toolbar announcing e.g. "Preview:
insert sunset_timelapse at 00:00:08:12 on V1 — 2 clips shift right" (hover AND focus both arm the preview —
onFocus/onBlur parity so keyboard users get it too).

### 3.3 Lifecycle

- **Hover-in / focus** on a mode button → `setHoverInsertPreview(mode)` → geometry renders.
- **Hover-out / blur** → `null` → geometry unmounts. No toast, no residue (ambient state, like the pool's
  PREVIEW chrome, MediaPool.tsx:220-237).
- **Click** → `insertMediaAt(sourceMediaId, mode)` — since insertMediaAt now applies the same `planInsertMedia`
  output, what the user previewed IS what lands (the strongest possible honesty pin: an R20-W2 test should
  assert preview-plan == applied-scene-diff for all 7 modes × several fixtures). After commit: preview
  clears, existing success toast fires, viewer STAYS in source mode (§2.5).

---

## 4. OT SEAM MAP (opencut-timeline @ 4d56c17) — 7 modes

Wire surface = `HeadlessTimelineApi.apply` (src/lib/timeline/headless/api.ts:148) — 24 prefixed commands
(api.ts:41-127; README: "24 of the 73 specified commands"). Insert-relevant seams verified by code read:

| Our mode | OT seam (name · file:line · signature) | Status |
|---|---|---|
| `insert` | `timeline.insert` — headless/api.ts:41-50 `{element, startTimeTicks, strategy: "firstAvailable"\|"explicit", trackId?}`, handler :265-416 → `TimelineCore.insertElements` ops/timeline-core.ts:509 `insertElements({elements, startTime, strategy})` / `insertElement` :621 | **SEAM EXISTS but semantics differ**: OT insert = REJECT-NOT-SHIFT placement (placement/index.ts:8-15 — "existing elements are never moved to make room") + main-track zero-anchor. Our mock's insert = ripple-split-push (spec 06 §5.9 "Ripple insert", classic `isRippleEnabled`) — **NO OT seam for the ripple half** (no `isRippleEnabled` anywhere in OT — verified by grep). Spec 15 §13.15 row §4.3.9 already lists `ripple` as a wire need ("wire needs full PlacementStrategy + `ripple` + `idSeed`") — SPEC-ONLY today |
| `overwrite` | — | **NO-SEAM** (single command). Composable batch: `timeline.split` (api.ts:63-70, cut at span edges) + `timeline.delete` (:71) + `timeline.insert` (explicit strategy). Spec 06 test battery names it: "`insert-overwrite-vs-ripple` — `placement: 'overwrite'` vs `'ripple'`" (06-nle-ops.md:3148-3149) + `move-overlap-on-target-rejected … (unless overwrite placement)` (:3083). Executable reference lives in nle-engine `performOverwriteEdit` (06 §10.4 table, timeline.ts:4705) — port-scheduled per Decision 12.3 |
| `append` | derived: `timeline.insert` with `startTimeTicks = core.getTotalDuration()` (timeline-core.ts:362 `getTotalDuration()`) | **DERIVABLE, no named seam** (no `append` command). Note our mock appends at the target LANE's end (useUiStore.ts:962-963), not the timeline end — align decision needed (Resolve appends at timeline end for the track type) |
| `placeOnTop` | engine-only: `TimelineCore.insertElementOnNewTrack` timeline-core.ts:1610 `insertElementOnNewTrack({element, trackType, index})` + placement strategies `alwaysNew`/`aboveSource` (placement/index.ts:53-54; the wire exposes only 2 of the 5 strategies, api.ts:47) | **ENGINE SEAM, WIRE-GAP** (not in the 24 commands). One undo entry for add-track+insert — exactly our mock's placeOnTop shape (minus our destructive-overlap ripple variant, see §6) |
| `rippleOverwrite` | — | **NO-SEAM**. Composable: `timeline.rippleDelete` (api.ts:72, engine `rippleDeleteElements` timeline-core.ts:814) + `timeline.insert`; ripple math exists as a lib (`rippleShiftElements`/`applyRippleAdjustments`/`computeRippleAdjustments`, ripple/index.ts:16/:40/:121) but is only consumed by ripple-delete |
| `replace` | — | **NO-SEAM**. Composable: `timeline.delete` + `timeline.insert` (explicit, at the old clip's startTime) + trim/`timeline.updateElements` to exact duration. Spec 06 §5.9-family has no replace row; nle-engine has no `replaceEdit` in the §10.4 coverage table either |
| `fitToFill` | primitives: `timeline.updateElements` with a `retime` patch — engine derive rule clamps rate to **[0.01, 5]** and recomputes duration (timeline-core.ts:2017-2047 `applyElementUpdatePatches`; ops/retime.ts:11-20 `MIN/MAX_RETIME_RATE`, `clampRetimeRate`) | **NO-SEAM as one command; composable** (insert + updateElements{retime}). Spec 06 §10.5 row: "§5.11 Rate-stretch command — (absent) — OT-GAP; nle-engine :3153". Our mock's clamp [0.01, 5] (lib/trimLaws.ts:32-33) is already bit-compatible with OT's |

**insertMediaAt alignment recommendation (PROPOSAL):** keep the app-level name and 7-mode union
(useUiStore.ts:46) — it is an APP-composite, exactly like spec 06 §10.4's engine rows (`freezeFrame` = split
+ insert + move batch). Internally document each mode as its spec-15 command composite (the table above) so
the eventual C7-renamed wire maps 1:1: `insert`→`insert{ripple:true}`; `overwrite`→`split+delete+insert`;
`append`→`insert@totalDuration`; `placeOnTop`→engine `insertElementOnNewTrack` (wire: `insert` with
`alwaysNew` strategy once the 5 strategies are exposed); `rippleOverwrite`→`rippleDelete+insert`; `replace`
→`delete+insert(+trim)`; `fitToFill`→`insert+updateElements{retime}`.

### 4.1 Honest-gap ledger additions (continue §H C33-C44 → propose C45-C49)

| # | Mock invention / gap | Spec clause touched | Where / status |
|---|---|---|---|
| C45 | **7-mode source edit-function family** — insertMediaAt's insert/overwrite/append/placeOnTop/rippleOverwrite/replace/fitToFill mapped to OT: only `timeline.insert` exists (and it is reject-not-shift, not ripple); overwrite/replace/rippleOverwrite/fitToFill are command composites (split+delete+insert / +retime), placeOnTop is engine-only `insertElementOnNewTrack`, append is insert-at-totalDuration | 06 §5.9 (add an "edit functions" subsection enumerating the family as composites), 15 §13.15 (InsertCommand `ripple` param already listed as wire-need) | useUiStore.ts:864-1040 (mock-real, one undo entry per op); OT @4d56c17 verified read-only in /home/z/r20-ot |
| C46 | **Source-transport insertion-mode cluster** — the 7 one-shot mode buttons live in the SOURCE-preview transport row (single-viewer adaptation of Resolve's under-source edit overlay / Premiere's source-monitor Insert/Overwrite next to transport); program monitor hosts no edit ops; NOT a radiogroup (no persistent mode — no NLE has one) | 18 §4.3 v1.2 (source-preview chrome contract) | Viewer.tsx:498-505 target; replaces EditOverlay.tsx vertical dock (Viewer.tsx:384-391 removed per issue #63) |
| C47 | **Audio-source track routing law** — media-type routing overrides selection-kind when incompatible (audio-only source → audio lane even when a video clip is selected); selection of the SAME kind retargets ("target track of selected clip"); frozen/untargetable wrong-kind lanes while an audio source is loaded | 06 §5.9 edge cases, 18 §4.3 | useUiStore.ts:944-957 (type routing exists); targeting/retarget semantics + the freeze affordance are new |
| C48 | **Hover-placement preview** — `planInsertMedia` pure planner + `applyInsertPlan` (plan/apply split so preview == commit), timeline renders ghost/displaced-arrows/overwrite-shading/speed-badge from the plan (reference timeline_edit_modes (2).html grammar); NO NLE precedent for button-hover placement preview (drag-preview grammar extended) | 18 §4.3/§9 (preview-geometry contract), 05 §5 placement (dry-run form) | new lib/insertPlan.ts + Timeline.tsx ghost layer reuse (941-978) + store selector |
| C49 | **Audio hover-dwell autoplay = waveform motion** (extends C42) — pool audio cards get a waveform-motion preview on ≥400ms dwell (sweep line across the deterministic bars over the same 6s window; video gets ken-burns, audio currently motionless though chip+hairline DO render) | 18 §4.2 (C42's poster-frame round extended to audio) | MediaPool.tsx:112-134 (static Thumb) vs :220-237 (chip/hairline render for all types) — gap for issue #68 (th_mtp97ipa) |

(Also noted, NOT ledger-worthy: viewer zoom ladder gains `1.25×` — pure UI pref fix, Viewer.tsx:182-186,
issue #66 / r20-open-threads.txt:17.)

---

## 5. AUDIO ROUTING + CONVENTIONS (thread th_mtp931bs / issue #65)

**Reviewer's question (verbatim):** "same as video but here insertion applies to an audio track (assume
video track is frozen and unelectable, so the audio track is selected)? research the best practice and
convention here for NLE too, mainly because when a video clip is selected it becomes ambigious when
non-video media is applying a timeline add action"

**RESEARCHED conventions:**
- **Premiere** — explicit **track targeting**: "track targeting in Premiere to control which timeline tracks
  are affected by editing actions" (Adobe helpx,
  https://helpx.adobe.com/premiere/desktop/edit-projects/intro-to-editing/work-with-clips-on-the-timeline-using-track-targ).
  Insert/overwrite obey the targeted tracks; a source's audio half lands on the targeted audio track. With
  no audio target, the audio portion is simply not placed.
- **Avid** — source/record **track patching**: green patch buttons per track; "Turn off the audio tracks on
  the source side before you drag to the timeline… The two green A2/A3 boxes in track targeting"
  (https://community.avid.com/forums/p/200732/899956.aspx). Audio-only sources patch to audio tracks only —
  video tracks never receive audio.
- **Resolve** — **track destination control** (patching) for 3-point edits; the destination track is
  highlighted, and an audio-only source can only ever target audio tracks
  (https://creativevideotips.com/tutorials/track-destination-control-in-davinciresolve).
- **Selection-as-targeting trick** (Premiere community): "Simply click a clip or gap that's on the track you
  want to target, then right click > 'Target track of selected clip'"
  (https://forum.knightsoftheeditingtable.com/d/100-target-tracks-based-on-clip-selection).

**Best-practice synthesis (PROPOSAL for our single-viewer mock, no patch-panel UI):**
1. **Type-compatibility is absolute**: audio media never lands on main/overlay lanes (our
   `trackAcceptsElement` law, timelinePlacement.ts:41, already enforced in the drag path; insertMediaAt
   routes by type at useUiStore.ts:955).
2. **Target resolution order for the next insert** (new `insertTargetTrackId` derivation, honest at each
   step): (a) explicit user targeting — clicking a track header while in source mode sets the target IF
   type-compatible, else honest refusal toast ("an audio source targets audio lanes"); (b) selection-kind
   fallback — if the current selection contains an element of the SAME kind as the source, target its lane
   (the "target track of selected clip" convention); (c) media-type default — first unlocked lane of the
   source's type (video→main, image→overlay, audio→first audio). A video clip selected while an audio
   source is loaded is **ignored, not obeyed and not fatal** — media TYPE wins the disambiguation, with the
   target ring making the actual destination visible so it can never be a silent surprise.
3. **The freeze affordance (reviewer's suggestion, PROPOSAL)**: while `viewerMode==='source'` &&
   source media is audio, Timeline renders video/main lanes with a "frozen" treatment (opacity ~0.55 +
   `cursor: not-allowed` on the header + no target ring) and the audio lane(s) selectable; the transport
   row's mode buttons stay enabled. Inverse for video sources (audio lanes frozen). This mirrors Avid's
   "source-side tracks off" state in visual form without a patch panel. Keep it SOURCE-MODE-ONLY — program
   mode must never dim lanes (it's the output view).

---

## 6. CURRENT-CODE AUDIT (file:line facts, all verified by read)

**Viewer.tsx (603 lines):**
- Source-mode chrome: toolbar swap (exit X + name + SOURCE chip + asset res/fps) :196-220; poster
  object-contain / **audio waveform SVG** (96px, getWaveform deterministic bars) :258-299 — the #65 pin
  (ocean_ambience.wav) lands here; static scrub band :419-430 (honest: "no fake scrubbing of a jpg");
  transport row :498-505 = two empty flex zones + "Source duration" TC — **the insertion target per #64**;
  program transport (play/jump/mark/loop/marker) :507-598.
- EditOverlay dock on the PROGRAM frame :384-391 (44px vertical, `page==='edit'` only) — remove per #63.
- Zoom ladder :182-186 `['Fit','1.5×','2×','4×']`, select rendered :223 — add `'1.25×'` (issue #66; keep the
  `m` mapping ternary in sync).
- Bug/quirk: `hideOverlays` (:189) also hides the caption chips + edit dock's *siblings* only via the
  program branch; the EditOverlay dock is OUTSIDE the `!hideOverlays` gate (it renders while a tool drag is
  active — harmless today, moot after the move).

**EditOverlay.tsx (121 lines):** 7 lucide buttons, divider after Fit to Fill (:37, reference §3.4);
vertical roving tabindex :44-68; acts on **`mediaSelection[0]`** :71.
- **BUG for the move**: buttons must act on `sourceMediaId` — Clip.tsx:231 'Open in viewer' does
  `enterSourcePreview(el.mediaId)` WITHOUT setting mediaSelection, so the current bar can insert a
  DIFFERENT asset than the source monitor shows. (MediaPool selection sync is the other path,
  MediaPool.tsx:421.)

**useUiStore.ts — insertMediaAt :864-1040:**
- replace :876-899 (needs compatible selected clip, honest toast; remove + overwrite-place downstream via
  `applyOverwriteSpans` :568); fitToFill :902-937 (loop range + `RATE_MIN/MAX = 0.01/5` from
  lib/trimLaws.ts:32-33 — bit-compatible with OT ops/retime.ts:12-13; honest no-op guard :931-934);
  shared branch :940-1024: placeOnTop overlay-reverse + lane-create :944-953 (audio fall-through per R19-REV
  P2), type routing :955, **append = target-LANE end** :962-963 (per-timeline-end would match Resolve —
  semantics to settle), insert split-straddler + push-right :970-1003 (transition/linkedTo split laws
  :976-992, double-shift guard :972), overwrite/applyOverwriteSpans + ripple delta :1004-1014, ONE history
  entry, `set({selection: []})` :1022 (leaves selectedMarkerId — R19-REV P3(i) still open), toasts :1026-1039.
- `opts.time` honored :965 (used by tests); EditOverlay passes no opts (playhead) — fine.
- insertMediaAt is currently consumed ONLY by EditOverlay.tsx:81 + store tests (grep-verified).

**Timeline.tsx (1094 lines):**
- Preview infra to reuse: `DragPreview` type :40-66 (ghosts + conflict + frozen), `buildGhosts` :406-435,
  ghost render :941-967 (`clip-drag-ghost`, z-10, `ghostBg(type)` :686-689), insert-line :969-978. No
  ripple-preview snapshot infra exists (the task prompt's "R18 ripple preview" is actually R15 T3 drag
  ghosts — grep for ripplePreview/R18 returns nothing); our ripple lib mirror is lib/ripple.ts
  (RippleAdjustment/rippleShiftElements/applyRippleAdjustmentsToElements/computeTrackRippleAdjustments).
- **Audit finding**: pool drag-to-lane drop :814-871 is TOAST-ONLY ("Placed X on Y — mock: insertElement
  lands with the engine round", :857-861) — it never calls insertMediaAt, and the comment at :816 ("the
  store has no insertElement action yet") is STALE (insertMediaAt has existed since R19). This contradicts
  ledger §H.2's claim that "the pool→timeline drop toast is now backed by the same op family". Either wire
  the drop to `insertMediaAt(mediaId,'overwrite',{time: dropTime})` in R20-W2 or fix the ledger/comment —
  flagged as a P2 for the implementation wave.

**MediaPool.tsx (810 lines):** hover-dwell :168-185 (400ms timer, leave = reset); ken-burns img Thumb
:135-151; **audio Thumb is a static waveform** :112-134 — the PREVIEW chip + progress hairline DO render
for audio cards (:223-237, they sit outside Thumb) but nothing moves → gap C49 / issue #68
(th_mtp97ipa): add a waveform-motion autoplay (PROPOSAL: a 2px accent sweep line translating
`left: 0→100%` over the existing `PREVIEW_SWEEP_S = 6s` window, deterministic and toast-free — same ambient
grammar; optionally a subtle amplitude pulse via `opacity` keyframes on the bars).

---

## 7. Summary of recommended R20-W2 work items (implementation order)

1. Remove the program-monitor dock (Viewer.tsx:384-391) + retarget EditOverlay → horizontal SourceEditBar
   in the source transport row (:498-505), acting on `sourceMediaId` (fixes the wrong-asset bug), one-shot
   semantics, horizontal roving tabindex, reference icons verbatim (§1.4).
2. Refactor insertMediaAt → `planInsertMedia` (pure) + `applyInsertPlan` (store tests must stay 100% green —
   they pin all 7 modes' placement laws).
3. Add `hoverInsertPreview` + `selectInsertPreview` + Timeline preview layer (ghost/arrows/shading/speed
   badge/split tick) with refusal honesty; pin preview==commit in tests.
4. Audio routing: type-wins disambiguation + selection-kind fallback + source-mode freeze affordance
   (target ring on the audio lane) per §5.
5. Zoom ladder 1.25× (Viewer.tsx:182-186); audio waveform-motion pool preview (C49).
6. Wire (or honestly re-label) the pool drop path (Timeline.tsx:814-871) — resolves the ledger H.2
   contradiction.

---

## LEDGER IDS — AUTHORITATIVE (R20-W0 stamp)

The C45–C49 ids in this doc ARE the final unified ids (DESIGN-R20 D6, 1:1 —
no renumber needed). color-layout.md's draft C45–C52 were renumbered to
C50–C56/folded; see the map stamped at the end of color-layout.md.

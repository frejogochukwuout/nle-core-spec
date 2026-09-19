# R26-W-A7 — GG (timeline-core + view state) audit report

**Agent:** W-A7 (GG group). READ-ONLY. Runtime: `http://localhost:3000` (126 stories, index.json
verified), serving tree byte-identical to the R25-final bundle on all 7 target files
(TimelineToolbar / ViewOptionsPopover / TimelineCompact / Timeline / Toolbar2 / MixerDock /
useUiStore — cmp against the r25-final clone). Probes: agent-browser, isolated session
`gg-tlcore-audit`, 1920×1080 via `iframe.html?id=shell-appshell--edit` (the `/story` page's
iframe is 1920×658 → the window-too-small overlay is VISIBLE there and blocks the app — probe
artifact). Tests re-run at the runtime tree: ViewOptionsPopover 4 + TimelineCompact 31 +
TimelineToolbar 38 + Timeline 128 = **201/201 green**.

**Thread identity note (for W-R):** the briefing's "T#6 (GH #21), comp=Timeline.tsx:726" entry is
actually thread **th_mto2zq0g = GH #36** (the digest merged several same-story threads under the
T#6/GH#21 header; verified against /tmp/all-threads-full.json). The reply wave must target GH #36.

## §1 Verdict table

| Thread | GH | Ask (verbatim, compressed) | Verdict | Evidence |
|---|---|---|---|---|
| T#6-tl (th_mto2zq0g) | #36 | timeline should never crop off / keep scrolling into nothing — stop scrolling, always show track + timestamp | **PROPER** | Timeline.tsx:719-730 the bounded-runway law (`contentW = min(dynamic, dur·pps + 0.25·vw)`); LIVE @653pps: scrollW 19858 ≤ 19590+440 (dur·pps + 25%·vw), scrollLeft clamps exactly at 18098, sticky ruler row renders at the far right (elementFromPoint = the ruler), 21 lane surfaces + clips visible near the right edge, empty runway past content end = 268px = **15.2% of viewport ≤ the 25% cap**, and the V1 track-head button stays pinned at left=52px at max scroll ("always show track and timestamp" both hold). Pin: Timeline.test.tsx:390; R25-F3 T3 refinement (Ruler.test:87 — labels stop at sequence end, ticks keep painting). |
| T#17 | #71 | gap / empty space after scrolling to the furthest right (comp chain MixerDock→FullDock) | **PROPER** | Both candidate surfaces verified. MIXER: the master/aux bank rides INSIDE `channel-scroll` as scrolling content at its natural end (MixerDock.tsx:480-496, the R24-A4 law that killed the R22-era pinned-bank + trailing-space shape) — LIVE: trailingGap after the Master strip = **0px** at max scroll (seed = 2 audio strips, scrollMax 1px sub-pixel; the dock's own B1 budget keeps the row from overflowing at 1920 and 1280). TIMELINE: the same complaint shape is T#6's bounded runway (above). No dead space on either surface. |
| T#21 | #75 | compact view is nice — keep meaningful V/A/T color coding; generalize this style | **PROPER** (+P3 F1) | TimelineCompact.tsx:72-81 the clipTint token table; LIVE on the color-page strip: video clips border rgb(61,88,112) (--clip-video), audio rgb(63,138,92) (--clip-audio-a), caption --clip-text, selected clip = accent border + 28% mix (el-2). Generalized: Compact "All" mounts the strip on edit/color/deliver (live), fx DOM-absent by the D-A1/ruling-8 law. Pins: TimelineCompact.test:105-125. **F1 (P3):** the "Text 1" track (T1, kind `overlay`) paints the VIDEO token in the strip (30%→22% tint delta is the only V-vs-T cue) while the full Timeline paints its type-text clip `--clip-text` (orange) — strip tints by TRACK KIND, full tints by ELEMENT TYPE; they diverge exactly for text-on-overlay. |
| T#40 | #94 | under color need a way back to a larger track view (filmstrip needed); super-compact usable everywhere incl. export | **PROPER** (chain → R25-W6) | (a) LIVE: color's own default = Compact "Off" → the FULL Timeline with filmstrip thumbs mounts (first color visit: fullTl=true; anatomy verified — filmstrip cell `background-image url(/media/beach_wide.jpg)`, 39px cover-per-cell). (b) Compact "All" available on every page (edit/color/deliver live-probed; fx DOM-absent by design). (c) Superseded/strengthened by T#91's per-page memory (the R23-WB auto-strip heuristic is dead — W6-A). Deliver boots 'off' now (the W6-A pin): GE-A5's R1 wording item, honest to state in the reply. |
| T#42 | #96 | trackhead not working in compact view (should still move/select) | **PROPER** | TimelineCompact.tsx:252-268: the badge cell is a REAL selectTrack button. LIVE: click A1 badge → aria-pressed=true, title = track name, and the el-2 clip selection CLEARED (the selectTrack domain law, TimelineCompact.test:195-213). "Still moves": the badge column is `sticky left-0 z-[2]` — LIVE at scrollLeft 64895 (zoomed strip) badgePinnedLeft=true, ruler renders to the viewport edge. Honest 24px scope (selection + name only, no mute/solo stack) REGISTERED: README deviation ledger row "R23-WB (#96)". |
| T#54 | #108 | be thoughtful what's in the timeline toolbar — differ per view/mode; design/review iterations + NLE/Resolve research | **PROPER** | TimelineToolbar.tsx:105-136 the D-D2 per-page cluster matrix (explicitly research-informed: "Resolve's pages carry different toolbars — Color has no timeline toolbar (filmstrip), Deliver none, Cut/Edit carry the tools"). LIVE enumeration per page: **edit** = view-options + 8-tool radio + snap + link + lock + marker + marker-color + zoom cluster + master (20 buttons + 2 sliders + meter + DIM); **color** = view-options + zoom only (6); **audio** = view-options + snap + zoom + master (9); **fx** = view-options + zoom, compact group DOM-absent; **deliver** = view-options + zoom (read-mostly but live). vsep law (separators only between present clusters), DOM-absent never display:none, the mixer row DELETED (R25-W4-D, th_mtzoy9f9). Pins: TimelineToolbar.test:553-668. |
| T#62 | #116 | full audit — how many of these icons truly work vs no-op vs broken? | **PROPER** | Every control enumerated AND exercised live (see §2). All real actions verified: blade radio flips checked; snap/link aria-pressed flip; lock-all fans out to all 5 track heads (T1/V1/A1/A2/CC pressed=true, live); add-marker +1 (5→6); marker-color opens the shared §4.9 8-color menu; zoom-fit 653→54 px/s (fit-25% math); zoom-to-selection honest "no selection" info toast + zoom untouched; magnifier focuses the zoom slider (activeElement, live); ± step ×1.7 (54→92); master mute flips pressed + icon swap; volume 78% aria-valuetext; view-options = real APG menu; compact/clip-style radios + waveforms gate flip waves 2→0→2. **ZERO no-ops.** The only non-action affordances are the honest display-only pair: the aria-hidden micro-meter (live values) and the DIM chip (aria-disabled + "Master dim is M2 (spec 20 §12)" reason tip) — both pinned contracts (TimelineToolbar.test:240-264, 322), not silent no-ops. The original audit table lives in the R24-W1 commit (645981f) message. |
| T#68 | #122 | "no-op right now" (Toolbar2.tsx:167) | **PROPER** (via R24-W1 + R25-W3) | Line 167 of the R22-era file = the MIXER toggle's aria-pressed line (the 3-state cycle that did nothing visible off-audio). Now: binary `toggleMixerOpen` with lastVisual memory, AUDIO-page-only, aria-pressed live (LIVE: mixerBtn pressed=true + mixer-dock mounted on audio; the setPage exit law collapses it elsewhere — Toolbar2.tsx:117-251). The sibling dead writers (Scopes/Nodes) were re-wired R25-W3 to the console-row tabs. Every Toolbar2 button is a real action (left toggle + inspector verified by GF-A6; mixer by this probe). Same fix family as T#65/#66 (GB group). |
| T#79 | #133 | audio view: Audio tracks should NOT be compacted by default — hybrid: compact-video / compact-audio / compact-all | **PROPER** | The ladder is the reviewer's exact scopes: `off / video / audio / all` (ViewOptionsPopover.tsx:75-80; useUiStore.ts:74). LIVE: audio page boots **compact-VIDEO** (radio "●Video"; the FULL Timeline mounts — hybrid, not the strip): video clips 35px BLOCKS, audio clips **91px filmstrip + waveforms** (60×1.6 audioLaneBoost). Inverse scope 'audio' live: audio clips 49px blocks NO wave, video clips keep filmstrip thumbs (22px strip in the 40px capped lane). Waveforms item honestly aria-disabled with reason tip under 'audio'/'all', enabled under 'video' (live both ways; clicks refused while disabled). Pins: ViewOptionsPopover.test:96, TimelineToolbar.test:99. |
| T#91 | #145 | timeline style mode remembered PER VIEW MODE — switching back restores | **PROPER** | useUiStore.ts:1241-1255 the per-page `pageTimelineView` map + the ONE resolver family (259-282; fx forces 'off'). LIVE round-trip: edit=All (strip mounts) → color shows its OWN Off (full Timeline — **no inheritance**) → color=All → edit back = **All restored** → deliver independent (own Off default → set All → color still All → deliver **All restored** + RangeBand + ruler). The open popover re-reads the ACTIVE page's entry live across page flips (observed: same open menu flipped ●Off→●All→●Off as the page changed). Writes touch only the active page's entry (setTimelineCompact, 2167-2174). Pins: ViewOptionsPopover.test:35-95 (compact + clip-style + waveforms round-trips). |

**Tally: 10/10 PROPER. Zero BROKEN, zero mandatory QUICKFIX.** One P3 polish item (F1) + two
W-R wording items (R1/R2).

## §2 The icon audit (T#62) — full enumeration, per view

Surface = the timeline toolbar (`shell-timeline-toolbar`). "R" = real action (live-verified),
"D" = honest display-only (pinned contract), "—" = DOM-absent on that page.

| Control | Edit | Color | Audio | FX | Deliver | Live evidence |
|---|---|---|---|---|---|---|
| View-options hamburger (APG menu) | R | R | R | R | R | menu opens, 3 groups, keyboard law (GD/GC re-verified) |
| Compact-tracks radios ×4 | R | R | R | — | R | All/Video/Audio/Off flips + strip/lane anatomy changes |
| Clip-style radios ×2 | R | R | R | R | R | page entry ?? variant (W6-A) |
| Audio-waveforms checkbox | R | R | R | R | R | 2→0→2 waveform lanes; honest-disabled under audio/all |
| Tool radio ×8 (select/blade/roll/ripple/slip/slide/stretch/fx) | R | — | — | — | — | blade checked=true; fx couples fxMode (GD-A4) |
| Snap (magnet) | R | — | R | — | — | pressed true→false |
| Link A/V | R | — | — | — | — | pressed flip (store-tested) |
| Lock all | R | — | — | — | — | fan-out: 5/5 track locks pressed=true |
| Add marker | R | — | — | — | — | marker count 5→6 |
| Marker color (§4.9 palette) | R | — | — | — | — | 8-item context menu opens |
| Zoom to fit | R | R | R | R | R | 653→54 px/s (fit-25% math) |
| Zoom to selection | R | R | R | R | R | honest "no selection" toast, zoom untouched |
| Magnifier (focus slider) | R | R | R | R | R | activeElement = zoom slider |
| Zoom − / slider / + | R | R | R | R | R | 54→92 (×1.7); aria-valuetext |
| Master mute | R | — | R | — | — | pressed false→true + Volume2→VolumeX |
| Master volume slider | R | — | R | — | — | 78% aria-valuetext |
| Micro-meter (StripMeter) | D | — | D | — | — | aria-hidden live meter (by design) |
| DIM chip | D | — | — | — | — | aria-disabled + M2 reason tip (by design) |

**No-op count: 0.** Historical no-ops all dead: R14 swept the zoom cluster/marker-color/
magnifier/view-options toast; R24-W1 turned the hamburger into the real popover and retired the
standalone density button; R25-W4-D deleted the mixer cluster; sync-bin/auto-sync/dyntrim never
shipped (reference §8.10/§8.9).

## §3 Fix queue (for W-F / W-R)

- **F1 (P3, optional polish — T#21 fidelity):** the compact strip's `clipTint` is keyed by TRACK
  KIND, so the T1 overlay track's text clip paints `--clip-video` (V and T differ only by the
  30%→22% tint), while the full Timeline paints the same clip `--clip-text` by ELEMENT TYPE.
  Fix shape: give text elements on overlay tracks the `--clip-text` token in
  `TimelineCompact.tsx` `clipTint`/render (or key the tint by element type like Clip.tsx does)
  + extend the TimelineCompact.test:105 color pin. Not a regression of the #75 close — the
  strip does carry meaningful V/A coding + the caption-kind text token; this tightens V-vs-T.
- **R1 (W-R wording, T#40 + T#53):** state the W6-A default evolution honestly — deliver/color
  now boot the FULL timeline (each page's own default); compact is a remembered per-page choice
  via the popover. Cite the per-page memory round-trip as the stronger contract.
- **R2 (W-R wording, T#17):** the comp chain pointed at MixerDock; cover BOTH surfaces in the
  reply — the mixer row (bank inside the scroll region, 0px trailing gap, measured) and the
  timeline's bounded runway (≤25% vw, measured 15.2%) — since the ask is ambiguous between them.
- **W-R targeting:** the "T#6 timeline" entry is thread **th_mto2zq0g / GH #36**, not GH #21
  (digest grouping artifact — see the identity note above).

## §4 Probe artifacts (for W-V — don't re-chase ghosts)

1. Open `iframe.html?id=…&viewMode=story` DIRECTLY for full-viewport probes. On the `/story`
   page the app iframe is 1920×658 → the window-too-small overlay is VISIBLE (z-95, fixed) and
   the app beneath is blocked.
2. In-iframe `eval` `.click()` is UNRELIABLE for some React surfaces (the view-options opener
   refused; AppDock page buttons, marker, zoom, master buttons worked). Use agent-browser's
   trusted `find role <role> click --name "…"` for anything that misbehaves.
3. The ViewOptions menu STAYS OPEN across radio flips AND page switches (by design — settings
   keep-open) and its transparent `fixed inset-0 z-[104]` overlay then BLOCKS trusted clicks on
   anything beneath; press Escape between probe phases.
4. Read-after-click needs a wait (React flush) — a same-eval DOM read can show the pre-click
   state.
5. The zoom state (pxPerSec) is GLOBAL, not per-page — zooming on one page changes scroll
   geometry on the next; re-measure after page flips.
6. CSS attribute selectors with unquoted hyphen values (`[aria-label=Timeline zoom]`) throw in
   querySelector — quote them.

## §5 Screenshots

- `shots/gg-deliver-compact-all-memory.png` — deliver, Compact All restored per-page (54px head
  stack: ruler + range band).
- `shots/gg-edit-bounded-scroll-max.png` — edit, full Timeline at max scroll (ruler + lanes +
  clips at the bound, track heads pinned left).
- `shots/gg-color-compact-far-right-trackheads.png` — color, zoomed compact strip at max scroll
  (badge column pinned, V/A/T tints, ruler full-width).

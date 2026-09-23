# X-CUT AUDIT — VISUAL GRAMMAR (fleet R25, cross-cutting)

**Auditor:** VISUAL-GRAMMAR cross-cutting auditor (the ten per-mode reports are the evidence base; every load-bearing claim re-verified live against the two mocks, the specs, and the six code homes). **Method:** read-only; no repo modified; no commits; this file is the sole write.
**Date:** 2026-09-09. **Pins:** as per the fleet — engine `3989506`, OT `fdb771c` (src ≡ `c15a629`), app `64fb0ab`, nle-ui `3026099`, cloudcut-nle (the freecut extraction, HEAD read live), spec-repo mocks in-tree.

---

## Grammar inventory (verified)

Both mocks re-read line-level; every element below re-verified in markup + CSS this round. The task card's inventory is **CONFIRMED with four refinements** (marked ⚠).

### A. TRIM-MODE grammar — `ui-mock/trim_edit_modes.html` (4 views)

| # | Element | Verified implementation |
|---|---|---|
| A1 | **Crisp green trim edges** | `.green-edge` (CSS `:226-245`): `right` = **21px**, `left` = **18px**, gradient `#55a814→#8ce22e→#a4ef3c`, **9px box-shadow glow** `rgba(150,230,50,.5)`, z-6, `pointer-events:none`. **Roll** = BOTH facing edges of the junction pair (bird `.right` `:469` + sunset `.left` `:474`); **ripple** = ONE edge (bird `.right` `:529`). Slip/slide use A2 instead. |
| A2 | **Soft green glows** | `.glow-l`/`.glow-r` (CSS `:247-264`): **15px wide, `blur(3px)`** ⚠ (the card said "blurred 15px" — it is 15px *wide* with a 3px blur), green `rgba(124,216,38,.7)→rgba(166,242,74,.95)`, height `calc(100% − 32px)` (**title bar excluded**; title is `title-pad`-padded 26px to clear the glow). **Slip only** (`:599-600`), on BOTH in/out edges. |
| A3 | **Dimmed inactive clips** | `.dim` (CSS `:212-221`): border `#4a5a6e`, title bg `#4c5b6f`/color `#9db0c0`, image overlay `rgba(8,10,16,.42)` z-3. **Ripple** (downstream sunset `:531`), **slip** (left bird `:581`), **slide** (both neighbors `:651`/`:658`). **Roll: none** — both clips undimmed (the affordance is on the JUNCTION, no owner). |
| A4 | **Red active border** | `.red-border` (CSS `:223-224`): **3px solid `#e2403c`**, radius 9, z-10. **Slip** (`:596`) and **slide** (`:662`) active clips only. |
| A5 | **White-box outlines** | `.white-box` (CSS `:268-276`): **4px solid `#fbfdff`**, radius 10 (slip) / 9 (slide), z-8, `pointer-events:none` — CSS comment itself says "source-duration ghost / neighbor shrink boxes" (**one class, two semantics**). **Slip** = full-source-duration ghost `440×131` at 278/97 (`:590`) around the frozen 158px slot (440 ≈ 2.8× the slot); **slide** = per-neighbor shrink boxes `147×76` + `141×76`, lower-anchored (top:191), each **abutting the active clip's edge** (`:668-669`) — and a **static composite** ⚠ (both outward shrink previews at once; widths differ; mode-slide R2 — one real Δ shrinks one side only). |
| A6 | **Bright in-point preview frame** | `.preview-frame` (CSS `:278-283`), z-9, overflow hidden. **Slip only** (`:592-594`): `148×123` inside the white box's head region, **bright** (the dimming belongs to the neighbor A3). ⚠ Painted with the *neighbor's* scene art (`#sc-bird`) — an authoring artifact; semantically it should show the slipped clip's own source at the new in-point (mode-slip refinement). |
| A7 | **Cursor glyphs** | `.cursor-svg` z-12, drop-shadow. **Roll** (88×80 `:478-483`): two brackets + arrowheads pointing OUTWARD. **Ripple** (78×78 `:537-543`): dark rect + bracket + right arrow. **Slip** (74×74 `:604-609`): brackets + two arrows INSIDE, diverging. **Slide** (76×68 `:672-677`): arrows OUTSIDE the brackets (roll-shaped) and **sits LOW, over the title bar** (y-center 219 vs slip's 166 ≈ body center — the mock's encoding of 05:972's pointer-position slip/slide detection). |
| A8 | **Arrows** | `.arrow-svg` z-20. **Roll**: two-way, 136×30, BELOW the clip band (top:294, `:486-490`). **Ripple**: push-right, 68×24 (top:297, `:546-549`). **Slip**: two **diverging** arrows INSIDE the outline (head→left `:612-615`, tail→right `:616-619`, z-11) — ⚠ reads as headroom/tailroom range indicators, not slip direction (G-SLIP-1). **Slide**: two outward arrows inside the shrink boxes (`:680-687`, z-11). |

### B. INSERT-MODE grammar — `ui-mock/timeline_edit_modes (2).html` (6 views)

| # | Element | Verified implementation |
|---|---|---|
| B1 | **The ghost** | `.clip-ghost` (CSS `:221-229`): **2px dashed `#646464`**, radius 4, 175×110 default. Insert `:265-266` (z-4 @155); overwrite `:279` (z-8 @155 — over the covered span, z-5 clips under it); replace `:305` (z-4, **width 105 = target width**); append `:316` (z-4, 105 @430 = lane tail); ripple `:325` (z-8 @155, **width 175 ≠ target 105**). |
| B2 | **Down-arrow** | 16×28 white path `M 5 0 … Z` (`:453-455`), **ghost-centered** in every mode (insert 234.5 = 155+175/2; append 474.5 = 430+105/2; replace 202.5; fitfill 199.5) ⚠ (NOT "at the playhead" — mode-insert's correction, confirmed cross-mode). |
| B3 | **Right-arrow (push token)** | 28×16 white (`:457-459`). **Shown ONLY in insert (top 149, at the inserted span's right edge `:270-275`) and ripple-overwrite (top 187, `:327-332`)** — `display:none` in overwrite/replace/append/fitfill. The family law: "shown ONLY for insert and ripple — i.e. only when downstream clips move" (`r20/insert-modes.md:125`). |
| B4 | **Dashed FIT SLOT** | `.fit-slot` (CSS `:343-376`): 2px dashed `#646464`, 105×110 at the I/O span, containing a **dimmed source frame** (`filter: brightness(.45)`), a **slot-title bar** (26px, `rgba(107,164,216,.4)` bg, 11.5px/600) — plus the badge (B5). Fit-to-fill only. |
| B5 | **Speed badge** | `.speed-badge` (CSS `:378-395`): gauge SVG 14×12 (arc + hand, `:701-704`) + **"1.7x"** (12px/700, chip `rgba(17,17,17,.62)`, radius 10, bottom 34px/left 9px) on the slot `:705`; the source pool clip carries its own **"1x"** badge `:715` — the *contrast is the affordance*. **One decimal** precision (175/105 = 1.6667 → "1.7x"). |
| B6 | **Active source clip + inactive dim** | Active source: 2px `#6ba4d8`, z-10, shadow `0 10px 20px rgba(0,0,0,.5)` (`:207-218`); all inactive clips dimmed `rgba(0,0,0,.25)` (`:162-168`) ⚠ (a fifth dim law — distinct from trim mock A3's `.dim`). |
| B7 | **Asymmetric-ghost tell** | **Ripple-overwrite**: ghost = source width ≠ target width (175 vs 105, `:325`) — the different-length replacement tell. **Replace**: ghost = target width exactly (105, `:305`) — the same-length swap. The pair is the modes' *visual discrimination* (mode-replace "exact-length swap", r20:135). |

Shared header-icon grammar (all 10 modes' tab glyphs) verified in both mocks; ported verbatim into `shell-variants/src/components/timeline/editModeIcons.tsx` (incl. the speed-badge gauge `:141`).

---

## The consolidated table

Columns: **element** | **modes** | **defined in spec?** (normative rows only; file:line quote or NOWHERE) | **implemented where?** (variants / mini / nle-ui / OT-tree / engine / cloudcut-nle). "NOWHERE" = no normative row in 00/05/06/15/16/18 names the element's geometry, color, or state. Reference rows (05 §14/§16.5, 06 file-map) count as **REF-only** (census of FreeCut's tree, not law — see Spot-verifications a).

| Element | Modes | Defined in spec? | Implemented where? |
|---|---|---|---|
| A1 crisp trim edges | roll (both edges), ripple (one edge) | **NOWHERE normative.** 05:949 = **REF-only** (FreeCut `TRIM_COLORS` white/`RIPPLE_COLORS` amber/`ROLL_COLORS` amber — *contradicts* the mock's green); 18:258 "dual overlay" (roll gesture row, 4 words); 18:307 `ew-resize`. | **No implementation.** Mock only. Variants = invisible 8px hit zones + 6px *selection-accent* gradient (Clip.tsx:1376/:1393, :1416-1427); mini = 20px zones + 2px accent line + edge shade (timeline.css:810, :725-741); nle-ui/OT = plain `ew-resize` strips. |
| A2 soft glows | slip (in+out) | **NOWHERE.** 05:1374 = REF-only ("`edge-halos.tsx` — soft glow on the *active* edge during trim/roll/slip/slide" — single-edge, not slip's dual). | **No implementation.** Mock only. |
| A3 dimmed inactive clips | ripple (downstream), slip (neighbor), slide (both neighbors); NOT roll | **NOWHERE.** No row in any spec (ripple-trim S14/G5; slip G-SLIP-1; slide 2c — "zero rows"). | **No implementation in any trim path.** Mock only. (OT ships an unrelated replace-target dim `opacity-50` for library drags — U-8, a different affordance; insert-mock has its own B6 dim.) |
| A4 red active border | slip, slide | **NOWHERE.** | **No implementation.** Mock only. (18 §9's selection law = 1px accent outline — a different treatment.) |
| A5 white-box outlines | slip (source-duration ghost), slide (per-neighbor shrink boxes) | **NOWHERE.** 05:952/:1384-1385 = REF-only (`tool-operation-overlay.tsx` "position-only" bounds box + `getSlipOperationBoundsVisual` util — geometry owner named, style/semantics unpinned). | **No implementation.** Mock only. Variants' slip = a THIRD grammar (content `translateX` under a fixed box, Clip.tsx:1235-1244) + optimistic box preview for slide (:461-465). |
| A6 in-point preview frame | slip | **NOWHERE.** Closest is 06:1159/1262 — the FreeCut **viewer-side** 4-up overlay (a different surface). | **No implementation.** Mock only. |
| A7 cursor glyphs | roll, ripple, slip, slide | **PARTIAL, different grammar.** 05:1370 = REF-only (`clip-cursor.ts` resolves a *CSS class*); **18 §5A :299-318 is normative** — a 16-row CSS-cursor vocabulary (`ew-resize`, `col-resize`, `not-allowed`…), roll = `ew-resize` ("dual overlay indicates both"). The mock's SVG bracket glyphs: NOWHERE. | 18's simplified vocabulary is live everywhere (nle-ui/OT/variants/mini hit zones). The bracket glyph family: **nowhere** (mock only). nle-ui's toolbar tool icons (TimelineToolbar.tsx:16-33) echo the bracket family at toolbar scale. |
| A8 arrows | two-way (roll), push-right (ripple-trim, ripple-overwrite, insert), diverging pair (slip), outward pair (slide), down-arrow (all 6 insert modes) | **NOWHERE for trim modes.** For the insert family: r20/insert-modes.md:124-125 pins the down/right-arrow token table — **a mock-repo design doc, not a spec**. 18:562-563 carries the mini's "ripple edit follower laws" by name only. | **Variants only, insert family:** `geometry.arrows = {down, right}` (insertPlan.ts:498) rendered as `insert-preview-arrow-down/right` (Timeline.tsx:1654-1670), test-pinned ("right arrow off" for overwrite, insertPlan.test.ts:122-133). Trim-mode arrows: nowhere. |
| B1 ghost | all 6 insert modes | **NOWHERE normative.** 18:260 gesture table mentions "ghost" as DnD preview; r20 §1.3 = design-doc law (dashed 2px `#646464`, no fill). | **Variants only:** `plan.geometry.ghost` (insertPlan.ts:83/:306) → `insert-preview-ghost` (Timeline.tsx:1535), preview==commit pinned (insertPlan.test.ts:514-576); C48 hover preview (useInsertPreview, 150ms dwell). OT = drag-line + lane ok/bad ring; nle-ui = mock ring + honest toast. |
| B2 down-arrow (ghost-centered) | all 6 insert modes | **NOWHERE** (r20 design doc :124). | Variants (Timeline.tsx:1654-1662). Nowhere else. |
| B3 right-arrow push law | insert, ripple-overwrite only | **NOWHERE** (r20 :125 — "shown ONLY … when downstream clips move"). | Variants (`arrows.right = displaced.length > 0`, insertPlan.ts:498, test-pinned). Nowhere else. |
| B4 fit slot (dimmed frame + title) | fit-to-fill | **NOWHERE** (r20 :127). | Variants partial: ghost + mode badge + overwrite-span shading; **no dimmed slot-image, no slot-title** (Timeline.tsx:1506-1604). |
| B5 speed badge ("1.7x" vs "1x") | fit-to-fill | **NOWHERE** (r20 :128). | Variants: `insert-preview-speed-badge` (Timeline.tsx:1573) + gauge verbatim (editModeIcons.tsx:141) — **divergent precision** `toFixed(2)` vs reference one-decimal (mode-fit-to-fill G14). Nowhere else. |
| B6 active-source clip treatment + inactive dim | all 6 insert modes | **NOWHERE** (r20 :126; 18 §9 has generic selected-state law). | Variants: mode badge + ghostBg per type (Timeline.tsx:1556-1566). |
| B7 asymmetric-ghost tell | ripple-overwrite (≠), replace (=) | **NOWHERE** (r20 :135 states replace's equal-width law — design doc). | Variants: ripple-overwrite ghost = source width ✓ (span-form); **replace branch diverges** — places at the SOURCE's own duration and trims downstream (insertPlan.ts:311-340), contradicting its own tip + r20:135 (mode-replace G-R6). |
| A0 tool radio (the shell half) | roll/ripple/slip/slide tools | **FULLY-STATED** — 18:198 (§4.5, nine-tool radio, all dispatch `selectTool`); 16 §3.2 T/R/Y/U. | nle-ui TimelineToolbar.tsx:28-33 (live, **inert view-state** — zero `activeTool` consumers); variants (live, routes gestures); OT: **no tool concept at all**; mini: none (ripple toggle instead). |

**Census: 12 of 13 grammar elements are pinned NOWHERE in normative spec text.** The only normative visual rows the corpus carries are 18 §5A's CSS-cursor table and 18 §9's state/token language — both a *simplified substitute* grammar, not the DaVinci overlay grammar. The single place the grammar is fully tabulated is `ui-mock/shell-variants/docs/r20/insert-modes.md` §1.3 — a mock-repo research doc for the insert family only (the trim family's grammar has no table anywhere, in any repo).

---

## Spot-verifications

### (a) Does 05's reference-tree row set pin a grammar, or just list FreeCut's files?

**It lists files that are not even in the corpus.** Verified live:

- 05:942-953 (§14.10) and 05:1366-1425 (§16.5B/§17 census) quote FreeCut's `components/timeline-item/` tree — `trim-handles.tsx` (267 LOC, mode-aware `TRIM_COLORS`/`RIPPLE_COLORS`/`ROLL_COLORS`/`FREE_COLORS`/`CONSTRAINED_COLORS`), `edge-halos.tsx` (76 LOC), `tool-operation-overlay.tsx` (61 LOC) + `-utils.ts` (553 LOC), `clip-cursor.ts` (75 LOC), `trim-constants.ts` (24 LOC). **None of these files exists in any local tree.** cloudcut-nle (the freecut extraction) carries `src/freecut/shared/timeline/` = `defaults.ts`, `item-clamps.ts`, `timeline-annotations.ts`, `transitions/` only (live `ls`, this round — matches mode-slide's finding); its own `src/components/nle/Timeline.tsx` has zero trim-handle code (grep: no handle/hitZone/ew-resize). 06:2367's file-map row cites the same absent files.
- **Therefore the amber-vs-green divergence (05:949) is second-hand and locally unresolvable.** The row says FreeCut used amber for ripple/roll edges and green only for "FREE (actively trimming with headroom)" — contradicting the mock's green `green-edge` on roll AND ripple. Since FreeCut's source is not in the corpus, nobody can check which is stale; the row is a *census of a foreign tree*, taken on faith, and the R25 fleet's mode reports correctly read it as REFERENCE, not law (05's own R22-era audit, `audits/05-timeline.audit.md:149`, already found the census's arithmetic untrustworthy).
- **Verdict: 05's rows are an inventory, not a grammar.** What they pin is *that some component owns each affordance* (overlay box, halos, cursor class, mode-aware colors) — names of files and functions, zero geometry, zero state machines, zero z-order, and a color palette that conflicts with the corpus's own reference mock. Nothing in the corpus implements against them.

### (b) What do the variants' components actually implement?

Grep + read of `ui-mock/shell-variants/src/`:

- **Insert family — implemented and tested (the fleet's only live grammar):** ghost `insert-preview-ghost` (Timeline.tsx:1535, dashed box, `ghostBg` per mode), mode badge (:1556), **speed badge** (:1573) with the gauge verbatim (editModeIcons.tsx:141), overwrite-span shading (:1586-1592), split-tick (:1606-1610), split-ghost (:1613-1623), displaced ghosts (:1633-1639), **down-arrow** (:1654-1662), **right-arrow** (:1664-1670) — all driven by the pure planner's `geometry.{ghost, arrows, overwriteSpans}` (insertPlan.ts:498) so **preview == commit by construction** (C48; insertPlan.test.ts:514-576 pins ghost == applied element). **SourceEditBar** (SourceEditBar.tsx:61-77): the 7 one-shot edit functions (insert/overwrite/replace/append/rippleOverwrite/placeOnTop/fitToFill), NO radiogroup, roving-tabindex ARIA toolbar, hover-preview arming with honest refusals. The B4 fit-slot's dimmed frame + slot-title are NOT ported; B5's precision diverges (toFixed(2)); B7's replace tell inverted by G-R6.
- **Trim family — a THIRD grammar, not the mock's:** trim handles = invisible 8px hit zones ±4px OUTSIDE the edges, `w/e-resize` cursors, SELECTED clips only, tools select/roll/ripple/stretch (Clip.tsx:1359-1408); affordance = a 6px *selection-accent* gradient on hover (:1416-1427) — mode-agnostic, no green edges, no dual-edge law, no glows, no dimming, no red border, no white boxes, no arrows. Slip = content `translateX` under a fixed box (Clip.tsx:1235-1244); slide = optimistic box + neighbors jump on commit. No SVG cursor glyphs.

### (c) The mini's grammar (`ui-mock/shell-mini`)

A FOURTH grammar, law-net-sealed but visually minimal: 20px trim hit zones (`.qc-track-item__trim`, timeline.css:810-824 — PR69 C11, WCAG 2.5.8 target-enhancement tier; 10px in pill mode :1064-1074); the standing edge shade was removed and returns **only as a trim affordance** — hover/active on an edge shades exactly that edge (`:725-741`) alongside a 2px accent line; purpose-drawn trim glyphs (TrimStartIcon/TrimEndIcon/SplitIcon, Timeline.tsx:60-64); ripple mode = **tooltip swap only** ("handle hints change under ripple" — the `title` attribute changes, Timeline.tsx:684-688/:719-724; the ripple toggle button `:234-239`). No insert family at all (gap-fit insert is placement, no ghost/arrows; OT-SEAMS row 5), no speed badge, no source bar. The mini's `design/testid` discipline (59-static + 15-templated census) is, however, the corpus's best instrument for pinning whatever grammar gets adopted.

**Net:** the corpus contains **four mutually incompatible trim grammars** (mock green-edge family; FreeCut's quoted amber/white/red palette — absent code; variants' hit-zone + accent gradient; mini's zone + edge-shade) and **one-and-a-half insert grammars** (the mock's full token set; variants' ghost/badge/arrows subset — tested; nothing in any production repo).

---

## The register proposal (theme-half vs structural-half split)

### Where it lives — recommendation

**A new normative register inside 05-timeline.md — "§8A Timeline Affordance Grammar" — plus two amendments: new semantic tokens in 18 §9, and a cursor-glyph ruling in 18 §5A.** Reasoning against the three candidates:

1. **05 (recommended owner).** The corpus's standing law already assigns this surface to 05: 18:212 ("The region's internals belong to spec 05 — component hierarchy, zoom, clip rendering, interactions"); 18:415's color-strip precedent states the split outright — "**tokens live here [18 §9], geometry there [05]**". D25.1 (ARCH-R23) makes OT's `src/components/timeline/` THE canonical tree, and 05 is that tree's law. Every grammar element but the tool radio (A0) renders *inside* the timeline canvas — edges, boxes, ghosts, overlays, arrows on lanes and clips — so 05's §8 (Interactions) is their natural neighbor: the register becomes §8A, the per-mode overlay law keyed to the same tool enum 05 §8.1/18 §4.5 share.
2. **18 keeps exactly two things:** (a) **the TOKEN half** — new semantic tokens in §9's table (see below), because 18 §9 is the corpus's only token system and OT's real token surface (`globals.css` `:root` + `theme.ts`, verified live) is the D25.3a mechanism; (b) **§5A's cursor ruling** — whether the mock's SVG bracket-glyph family or the existing 16-row CSS-cursor vocabulary is law (both, layered, is the recommendation: CSS cursors for hit feedback, the glyph only inside an active drag preview). The tool radio (A0) and the SourceEditBar contract (one-shot 7-mode bar, C46) stay 18's — already the fleet's consensus (mode-replace G-R5, mode-overwrite G5, mode-ripple-overwrite G-RO-4).
3. **A new spec file is rejected.** D23 (R23) retired spec 14 and ruled that gap registers live in the *owning domain spec*; adding a 21st spec for one register would violate the posture law and re-fragment exactly the surface 05/18 already partition. The mock-repo docs (`r20/insert-modes.md` §1.3, the only existing grammar table) get **ratified into** the register rather than remaining a design doc, and `trim_edit_modes.html` views are cited per row as the reference figure (G-SLIP-1's acceptance already asks for exactly this).

### The split (per ARCH-R23 D25.3 — note: the task card's "D23" is the plan/spec-separation ruling; the theme/structural half split is **D25.3**, the same R23 round)

**THEME half → 18 §9 (new semantic tokens, mock-derived values, contrast-verified per 18 §9's existing rules):**

| Token (proposed name) | Value source (mock) | Covers |
|---|---|---|
| `--trim-edge-active` (+ gradient ramp) | `#55a814→#8ce22e→#a4ef3c` (A1) | A1 edge bands, A2 glow ramp |
| `--trim-glow-soft` | `rgba(124,216,38,.7)→rgba(166,242,74,.95)` (A2) | slip's blurred variant |
| `--clip-dim-overlay` / `--clip-dim-border` / `--clip-dim-title` | `rgba(8,10,16,.42)` / `#4a5a6e` / `#4c5b6f`+`#9db0c0` (A3) | inactive-clip treatment |
| `--clip-active-edit` | `#e2403c` (A4) | slip/slide red border |
| `--ghost-outline` | `#646464` dashed (B1/B4) | ghost + fit-slot |
| `--badge-chip-{bg,border,text}` | `rgba(17,17,17,.62)` / `rgba(255,255,255,.28)` / white (B5) | speed badge, mode badge |
| `--overlay-arrow` | `#ffffff` + drop-shadow (A8/B2/B3) | arrows |
| `--source-active-border` | `#6ba4d8` (B6) | active source clip |

One decision rides the tokens (already flagged by ROLL-1): **mock green vs FreeCut amber.** Recommendation: **pin the mock's green** — it is the corpus's own reference figure (re-verifiable, in-repo), FreeCut's amber is second-hand and unverifiable (Spot-verification a); amber is recorded in the row's Notes as the historical FreeCut alternative.

**STRUCTURAL half → 05 §8A (geometry, states, z-order, state machines):** A1 edge widths (21/18px, ±outside placement — or the carriers' 8/20px hit zones: **the register must state hit-zone size AND visible band separately**, resolving the four-grammar divergence), which edges per mode (roll = both facing / ripple = one / slip = both soft), A2's title-bar exclusion, A3's overlay inset + which clips dim per mode + roll's no-owner rule, A4's 3px/z-10 + which clip, A5's two white-box semantics + geometry sources (slip: `[0, sourceDuration]` mapped at pxPerSec around the FIXED slot; slide: per-neighbor Δ regions at shared edit points — with the static-composite ruling G-SLIP-1/mode-slide G6 demand), A6's preview frame, A7's glyph geometry + slip-vs-slide cursor posture (the visual encoding of 05:972's pointer detection law), A8/B3's arrow-direction state machine (two-way ⇔ roll; push-right ⇔ downstream-moves — the r20:125 law, promoted to spec), B1's ghost width laws per mode incl. **B7's asymmetric tell** (replace ghost width == target duration; ripple-overwrite ghost == source duration), B2's ghost-centering law, B4's slot anatomy, B5's one-decimal badge precision (fixing variants' toFixed(2) per G14), z-order stack (zones z4 < clips z5 < edges z6 < boxes z8 < preview z9 < active clip z10 < arrows z20), and the **preview==commit discipline** (the planner computes both — already the variants' law, adopt as the register's implementation contract).

### The register's row format

```
| element | states | geometry | token refs | owning spec | reference impl |
```

- **element** — the affordance (e.g. `trim-edge-crisp`, `inactive-clip-dim`, `ghost`, `push-arrow`).
- **states** — the state machine (e.g. ghost: `hover-armed(≥150ms) / ok:true / ok:false(refusal: no geometry) / commit-cleared`; dim: `preview-only, per-mode participant set`).
- **geometry** — sizes, placement, z-order, precision laws, and the geometry SOURCE (what data computes it: ghost width = placed duration; slip box = source extent; slide box = neighbor Δ).
- **token refs** — names from 18 §9's table (theme half).
- **owning spec** — 05 §8A (most rows), 18 §4.5/§5A (tool radio, cursor ruling), 18 §9 (tokens).
- **reference impl** — `trim_edit_modes.html` view-X (:lines) or `timeline_edit_modes (2).html` view-Y (:lines) as the reference figure; the carrier to cite once it lands (today: shell-variants' component + test ids, e.g. `insert-preview-speed-badge` Timeline.tsx:1573).

Worked rows (two exemplars the adopting round can copy):

| element | states | geometry | token refs | owning spec | reference impl |
|---|---|---|---|---|---|
| trim-edge-crisp | visible when a trim gesture is live on the edge; roll = BOTH facing edges of the junction pair; ripple = the one active edge; roll renders NO dim, NO owner | band 18-21px flush to the clip edge (visible), z-6, pointer-events:none; hit zone law stated separately (carrier: 8px ±4 outside / mini: 20px — the register unifies) | `--trim-edge-active` + ramp | 05 §8A | trim_edit_modes.html view-roll :469/:474, CSS :226-245 |
| push-arrow | rendered IFF the plan displaces downstream (Δ≠0); inverted (left-pointing) when Δ<0 (pull — stated inference, needs ruling) | 28×16 glyph at the displaced span's leading edge, z-20, drop-shadow | `--overlay-arrow` | 05 §8A (18:260 gesture row cites it) | timeline_edit_modes (2).html :270-275/:327-332; variants Timeline.tsx:1664-1670; r20:125 law |

---

## Gap rows (posture law: owner / phase / acceptance)

| ID | Gap | Owner | Phase | Acceptance |
|---|---|---|---|---|
| **VG-1** | **The grammar register is unpinned:** 12 of 13 elements defined NOWHERE in normative spec text; the only full grammar table lives in a mock-repo design doc (`r20/insert-modes.md` §1.3, insert family only); the trim family's grammar has no table in any repo, spec or code. | S-spec (05 §8A new section + 18 §5A/§9 amendments) | R25 authoring → r1-prep (the law must exist BEFORE the wave-1 op ports land UIs on top of it) | 05 §8A exists with the 6-column row format; every row cites its mock reference figure (file:line); r20 §1.3's token table ratified into it; 10 of the ten mode reports' grammar gap rows (ROLL-1, G-SLIP-1, mode-slide G5/G6, G5-ripple, G6-insert, mode-append G4, mode-replace G-R5, G-RO-4, mode-fit-to-fill G11/G14) re-point at the register as their single home. |
| **VG-2** | **The token half is absent** — no semantic tokens for trim edges, glows, dim overlay, active border, ghost outline, badge chip, overlay arrows anywhere (18 §9 has shell chrome tokens only). The green-vs-amber palette conflict (mock A1 vs FreeCut 05:949) is undecided. | S-spec (18 §9, with 05's token-ref column consuming it) | with VG-1 | 18 §9 gains the 8 semantic tokens (mock-derived values, contrast-verified per §9's existing rules); one written decision resolves green (mock) vs amber (FreeCut quote) with rationale; OT's token surface (`globals.css` `:root` + `theme.ts`, D25.3a mechanism) named as the landing surface. |
| **VG-3** | **The structural half is unruled where the mocks are didactic composites:** slide's twin outward shrink boxes (one Δ can shrink only one side), slip's diverging arrows (headroom indicators vs direction), ripple-overwrite's pull-case arrow (inverted, never drawn in the reference). | S-spec (05 §8A rows) | with VG-1 | Each composite has ONE canonical reading written into its row (recommended: slide = shrink region on the ceding side + grow region on the gaining side; slip arrows = headroom/tailroom range indicators; pull = inverted arrow iff Δ<0); shell-variants implements the ruled readings + one test each. |
| **VG-4** | **Cursor law is two grammars with no ruling:** 18 §5A's 16-row CSS-cursor vocabulary (normative, live) vs the mocks' SVG bracket-glyph family (nowhere). nle-ui's toolbar already ships bracket-flavored tool icons. | S-spec (18 §5A) + S-ot (impl) | R25 ruling / r1 landing | One layered ruling: CSS cursors remain the hover/hit law; the bracket glyph renders ONLY inside an active-drag preview (or is rejected with rationale); the slip-high/slide-low cursor posture (05:972's pointer-position detection) is pinned as the slip-vs-slide affordance tell; computed-style + glyph-presence tests. |
| **VG-5** | **FreeCut reference rows masquerade as a grammar:** 05:949/§14.10/§16.5B and 06:2367 quote files that are not in the corpus (verified live — cloudcut-nle carries none of them), and their palette contradicts the corpus's own mock. | S-spec (05 + 06 file-map rows) | R25 text-only (crawl-class) | The rows re-tagged REFERENCE with an explicit "foreign tree, not in corpus, unimplemented, palette diverges from the reference mock" note; nobody downstream can again read them as law (this fleet's ROLL-1/S17/G-SLIP-1 misreads all trace to them). |
| **VG-6** | **No implementation carrier in any production repo; four incompatible mock-side grammars** (mock / FreeCut-quote / variants / mini). The r1 wave-1 op ports (roll/slip/slide + insert-edit-3-point) will land UIs with no grammar law to land against. | S-ot (the D25.1 canonical tree — the port home per D12.3) + S-app (census-gated mirror) | r1 (rides the op-port wave) | OT's `src/components/timeline/` implements the register rows for the ported modes with the D25.3b testid convention (`insert-preview-ghost`-class ids); computed-style/pixel tests per row (dual-edge presence, dim overlay, ghost width == law); the app re-pins via its wire-coverage gate; variants/mini divergences re-registered per the OT-SEAMS pattern. |
| **VG-7** | **Grammar testability has no instrument:** no data-testids for any mock-side grammar element except variants' insert-preview family; the VLM net (r23-analysis) has no rubric rows for the grammar. | S-spec (17 §battery rows) + S-app (VLM net) | with VG-1 (rows) / r1 (green) | Spec 17 battery rows per register element (computed style / geometry assertions); the variants' VLM rubric gains a grammar section; the mini's 59-static testid census pattern named as the convention. |

---

## Verdict

The ten mode audits all found the same hole, and the cross-cut confirms it is one hole, not ten: **the DaVinci edit-mode visual grammar — 13 elements spanning the trim family (green edge bands, soft glows, dimming, red border, white source/shrink boxes, in-point preview, bracket cursors, directional arrows) and the insert family (ghost, fit-slot, speed badge, down/push arrows, the asymmetric-ghost tell) — is defined by exactly two reference HTML files and by nothing else.** No normative spec row pins any element's geometry, color, state, or z-order; the only tabulated grammar in the corpus sits in a mock-repo design doc (r20 §1.3, insert family only); 05's "mode-aware colors" rows quote a FreeCut tree that is not even present in the corpus, with a palette that contradicts our own mock; and the four live code homes ship four different, mutually incompatible simplified grammars — the only tested implementation of any of it is shell-variants' insert-preview family (ghost/arrows/badge, preview==commit). The corpus's own law already contains the perfect seam for closing this: 05 owns the timeline canvas, 18 owns the tokens, cursors, and the tool bar, and 18:415's "tokens live here, geometry there" states the split in one line — ratified as a register this becomes 05 §8A (structural half) + 18 §9/§5A amendments (theme half + cursor ruling), with the row format *element | states | geometry | token refs | owning spec | reference impl* and the two mocks cited per row as the reference figures. The decision load is small — one color ruling (recommend the mock's green over the unverifiable FreeCut amber), three didactic-composite readings, one cursor-layering ruling — and the vehicle already exists: the r1 wave-1 op ports are the moment the grammar either becomes law or silently forks a fifth time. Gap rows VG-1..VG-7 carry owner/phase/acceptance for that adoption; VG-1 and VG-2 are the movers (write the register and the tokens *before* r1), VG-5 is the one-day honesty fix (re-tag the phantom FreeCut grammar rows), and VG-6/VG-7 bind the register to the canonical tree and to real tests.

---

*Method: all ten mode reports read in full; both mocks re-read line-level (CSS + every view's markup); spot-verifications run live — cloudcut-nle's tree listed and grepped (FreeCut grammar files absent), shell-variants' grammar classes grepped + components read (Clip.tsx, Timeline.tsx, SourceEditBar.tsx, editModeIcons.tsx, insertPlan.ts), shell-mini's timeline.css + Timeline.tsx read, OT's theme.ts/globals.css read, nle-ui's TimelineToolbar.tsx read, 05 §7.3/§8/§14.10/§16.5B and 18 §4.5/§5/§5A/§9 read, ARCH-R23 D23/D24/D25 re-read. No repo modified; no commits; this file is the sole write.*

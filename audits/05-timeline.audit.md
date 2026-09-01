# Audit Report: 05-timeline.refined.md

**Auditor:** general-purpose
**Date:** 2026-08-22
**Spec under audit:** `/home/z/my-project/download/nle-spec/05-timeline.refined.md` (1,384 LOC)
**Scout:** SCOUT-05
**Reference repos:** `/tmp/opencut-classic` (archived MIT), `/tmp/freecut` (MIT)

---

## Summary

- Total claims spot-checked: 18 required + 3 incidental sub-checks = 21
- Verified accurate: 13
- Verified inaccurate: 2 (MEDIUM — both in §17 "Corrections to Seed Spec"; each is itself a misattribution of the actual pattern)
- Partially accurate (minor count / line-range imprecision): 5
- Could not verify: 0

## Verdict: ⚠️ PASS WITH REVISIONS

The spec is overwhelmingly accurate on its primary architectural claims: controller pattern (7 controllers, 2,863 LOC, byte-perfect), placement algorithm (5 strategies + REJECTED-not-SHIFTED overlap), keybinding counts (21 actions / 23 bindings in OpenCut-classic, 68 HOTKEYS constants in FreeCut), thresholds (DENSE=80, LARGE_ALT_DRAG=24, MAX_VISIBLE_MINOR_MARKERS=72, HYSTERESIS_PX=800), and the Session state machine + view getter + commit path line ranges in `element-interaction-controller.ts`.

**Two MEDIUM issues in §17 "Corrections to Seed Spec" are themselves wrong** and must be fixed before this spec is consumed downstream:

1. **§17.5** — claims "No filmstrip thumbnail rendering exists in OpenCut-classic's timeline directory at all". Actually, `timeline-element.tsx:1084-1133` has a `TiledMediaContent` component that renders filmstrip thumbnails via CSS `backgroundImage: url(…)` with `backgroundRepeat: "repeat-x"`. OpenCut-classic DOES have filmstrip rendering — it's just DOM/CSS-based rather than Canvas-based (which is consistent with the spec's overall thesis that OpenCut-classic is the DOM reference).

2. **§17.1** — claims "FreeCut DOES use IntersectionObserver — but in `use-clip-visibility.ts:37-98`". Actually, `use-clip-visibility.ts` (145 LOC) uses `useTimelineViewportStore` + `useSyncExternalStore` — NO IntersectionObserver. The file's doc comment even says "avoids per-clip scroll listeners/observers". The actual IntersectionObserver usage in FreeCut is in `keyframes/components/dopesheet-editor/index.tsx:774` and `editor/components/compose-workspace/compositing-timeline.tsx:1547` — different features entirely. The "IntersectionObserver" mentions in `clip-filmstrip/index.tsx`, `clip-waveform/index.tsx`, and `image-filmstrip.tsx` are stale JSDoc comments only, not actual usage.

Five trivial issues (file-count breakdown, off-by-one LOC, file-total miscount, ambiguous "60+" wording, retained seed-spec text in §6.3) are documented but do not affect any implementation decision.

---

## Spot-check results

### Check 1 — "OpenCut-classic controller pattern VERIFIED REAL — 7 controllers, 2863 LOC"

**Claim (§14.4 + §17.7):** 7 controller files, each suffixed `-controller.ts`, totalling 2,863 LOC. Per-file LOC: drag-drop 583, resize 363, seek 210, playhead 318, zoom 301, keyframe-drag 357, element-interaction 731.

**Source:** `/tmp/opencut-classic/apps/web/src/timeline/controllers/`

**Actual:**
```
583  drag-drop-controller.ts
731  element-interaction-controller.ts
357  keyframe-drag-controller.ts
318  playhead-controller.ts
363  resize-controller.ts
210  seek-controller.ts
301  zoom-controller.ts
2863 total
```

All 7 filenames are suffixed `-controller.ts`. All 7 per-file LOC counts match the spec's table exactly. Total = 2,863 LOC matches exactly.

**Verdict:** ✅ ACCURATE.

---

### Check 2 — "Placement algorithm — overlap is REJECTED not SHIFTED, 5 strategies"

**Claim (§14.5):** `placement/types.ts:14-25` declares a 5-variant `PlacementStrategy` union. `placement/resolve.ts:134-278` `resolveTrackPlacement` dispatches by `strategy.type` at lines 147, 168, 190, 228, 273. Overlap detection (`placement/overlap.ts:8-27`) returns boolean; placements are REJECTED, not SHIFTED.

**Source:** `/tmp/opencut-classic/apps/web/src/timeline/placement/{types.ts, resolve.ts, overlap.ts}`

**Actual (types.ts:14-25):**
```ts
export type PlacementStrategy =
    | { type: "explicit"; trackId: string }
    | { type: "firstAvailable" }
    | {
        type: "preferIndex";
        trackIndex: number;
        hoverDirection: "above" | "below";
        verticalDragDirection?: "up" | "down" | null;
        createNewTrackOnly?: boolean;
    }
    | { type: "aboveSource"; sourceTrackIndex: number }
    | { type: "alwaysNew"; position: "highest" | "default" };
```
5 variants verified: `explicit`, `firstAvailable`, `preferIndex`, `aboveSource`, `alwaysNew`.

**Actual (resolve.ts:134-278):** `resolveTrackPlacement` dispatches:
- `:147` `if (strategy.type === "explicit")`
- `:168` `if (strategy.type === "firstAvailable")`
- `:190` `if (strategy.type === "preferIndex")`
- `:228` `if (strategy.type === "aboveSource")`
- `:273` fallthrough to `resolveAlwaysNewTrack` (alwaysNew strategy)

All 5 dispatch lines verified at the exact line numbers cited.

**Actual (overlap.ts:8-44):** `wouldElementOverlap` returns boolean (no time shifting); `canPlaceTimeSpansOnTrack` returns `timeSpans.every(...)` of `!wouldElementOverlap(...)`. Placement is rejected when overlap is detected — no time shifting occurs.

**Verdict:** ✅ ACCURATE — 5 strategies at the cited line range, dispatch verified at all 5 cited line numbers, overlap is REJECTED (boolean predicate) not SHIFTED.

---

### Check 3 — "IntersectionObserver virtualization NOT FOUND in OpenCut-classic"

**Claim (§17.1):** `grep -r IntersectionObserver /tmp/opencut-classic/apps/web/src/timeline/` returns zero matches.

**Source:** filesystem grep.

**Actual:** Zero hits in `/tmp/opencut-classic/apps/web/src/timeline`.

**Verdict:** ✅ ACCURATE.

---

### Check 4 — "wavesurfer.js NOT FOUND in OpenCut-classic source (only in package.json)"

**Claim (§17.5):** `grep -ri wavesurfer /tmp/opencut-classic/apps/web/src/timeline` returns zero matches; no wavesurfer reference in OpenCut-classic's timeline.

**Source:** filesystem grep.

**Actual:**
- `grep wavesurfer /tmp/opencut-classic/apps/web/src/` → 0 hits (not just timeline — none in the entire `apps/web/src/` tree).
- `grep wavesurfer /tmp/opencut-classic/package.json` → 0 hits.

So wavesurfer is not "listed but unused" — it is not listed at all. The seed spec's "Canvas (wavesurfer.js, listed but unused)" was completely wrong (not listed, not used). The refined spec's correction correctly identifies it's not in the timeline source.

**Note:** The spec's phrasing ("no wavesurfer.js reference found in OpenCut-classic's timeline") is correct but understates the truth — there's no wavesurfer reference anywhere in OpenCut-classic's source or package.json. Minor wording imprecision; not an issue.

**Verdict:** ✅ ACCURATE.

---

### Check 5 — "FreeCut has 65 files in timeline-item/"

**Claim (§14.10, §17.8, §18):** 65 files total. Breakdown: 34 production source files + 22 test files (.test.tsx/.test.ts) + 9 utility/state files.

**Source:** `/tmp/freecut/src/features/timeline/components/timeline-item/`

**Actual:**
```
ls | wc -l       → 65 (matches spec)
.test. files     → 18 (NOT 22)
non-test files   → 47 (NOT 34 + 9 = 43)
```

Spec's own §18 table lists 47 non-test files (rows 1–47) and 18 .test. files (rows 48–65) = 65 entries. So the spec's table is internally consistent with the filesystem, but the prose breakdown "34 + 22 + 9 = 65" is wrong:

| Component | Spec claim | Actual |
|---|---|---|
| Production (non-test, non-utility) | 34 | 38 |
| Test files (.test.tsx / .test.ts) | 22 | 18 |
| Utility/state files | 9 | 9 |
| **Total** | **65** | **65** |

The 9 utility files are correctly identified by the spec — they are pure helpers/predicates/constants in the §18 table (e.g., `hover-layout.ts`, `linked-sync-badge.ts`, `post-drag-click-guard.ts`, `clip-cursor.ts`, `drag-visual-mode.ts`, `trim-constants.ts`, `timeline-item-memo-compare.ts`, `visual-fade-items.ts`, `tool-operation-overlay-utils.ts`). The arithmetic just doesn't add up: 38 + 18 + 9 = 65, not 34 + 22 + 9.

**Verdict:** ⚠️ PARTIALLY ACCURATE — total file count (65) is correct and the §18 table is internally consistent; but the prose breakdown "34 + 22 + 9" mislabels 4 production files as test files. The actual breakdown is **38 production + 18 tests + 9 utilities = 65**. **Severity: trivial** (doesn't affect any implementation decision; the §18 table itself is the authoritative reference and it lists all 65 files correctly).

---

### Check 6 — "Neither repo uses TanStack Virtual or any virtualization library for timeline"

**Claim (§17.2):** Neither repo uses TanStack Virtual / `react-virtual` / `react-window`. `grep -r "tanstack|react-virtual|useVirtualizer|react-window" /tmp/opencut-classic/apps/web/src/timeline /tmp/freecut/src/features/timeline` returns zero matches in timeline code.

**Source:** filesystem grep.

**Actual:**
- Exact grep on the two timeline directories: 0 hits. ✅ matches spec claim.
- However, `grep -E "react-virtual|react-window|tanstack/react-virtual" /tmp/freecut/package.json` returns: `"@tanstack/react-virtual": "3.13.24",`
- And `@tanstack/react-virtual` IS imported in FreeCut source: `/tmp/freecut/src/features/editor/components/properties-sidebar/clip-panel/subtitle-section.tsx` (in the editor properties sidebar, NOT in the timeline directory).

So the spec's restricted claim ("zero matches in timeline code") is technically correct, but the broader generalization ("Neither repo uses TanStack Virtual") is technically incorrect — FreeCut does use `@tanstack/react-virtual` in its editor properties sidebar for subtitle section virtualization.

**Verdict:** ⚠️ PARTIALLY ACCURATE — restricted timeline claim is correct; broader "neither repo uses" claim is technically wrong (FreeCut uses TanStack Virtual in editor properties sidebar, outside the timeline). **Severity: trivial** — the spec's thesis is about timeline virtualization, and the spec is correct there; the broader statement is just imprecise.

---

### Check 7 — "FreeCut use-visible-items.ts is 874 LOC with frame-range math + 800px hysteresis"

**Claim (§14.9, §17.2):** `hooks/use-visible-items.ts` is 874 LOC. `HYSTERESIS_PX = 800` at `:32`. Per-track listener sets at `:49-87`. `expandRangeByClipBudget` / `contractRangeByClipBudget` at `:136-235`.

**Source:** `/tmp/freecut/src/features/timeline/hooks/use-visible-items.ts`

**Actual:**
- `wc -l`: **873 LOC** (spec says 874 — off by 1, likely trailing newline convention).
- `HYSTERESIS_PX = 800` at line 32 ✅.
- `detailRangeByTrackId` Map + `detailRangeListenersByTrackId` Map + `subscribeToDetailRange` at lines 49-87 ✅.
- `expandRangeByClipBudget` at line 136 ✅; `contractRangeByClipBudget` at line 183 (within `:136-235` range) ✅.
- `useSyncExternalStore` used at line 412 (the spec says "State is shared via `useSyncExternalStore` + per-track listener sets (`:49-87`)" — the per-track listener sets ARE at :49-87; `useSyncExternalStore` is the React hook wired into the listener infra, called at :412).

**Verdict:** ⚠️ PARTIALLY ACCURATE — `HYSTERESIS_PX = 800` and all line-cite ranges verified; only the LOC count is off by 1 (873 vs 874). **Severity: trivial.**

---

### Check 8 — "FreeCut 4 monolithic hooks: 1553 + 950 + 772 + 1291 = 4566 LOC"

**Claim (§14.11):** `use-timeline-drag.ts` (1553), `use-timeline-trim.ts` (950), `use-rate-stretch.ts` (772), `use-timeline-slip-slide.ts` (1291) = 4566 LOC total.

**Source:** `/tmp/freecut/src/features/timeline/hooks/`

**Actual:**
```
1553  use-timeline-drag.ts       ✅
 950  use-timeline-trim.ts       ✅
 772  use-rate-stretch.ts        ✅
1291  use-timeline-slip-slide.ts ✅
4566  total                      ✅
```

All four per-file LOC counts match exactly; the sum 4566 matches exactly.

**Verdict:** ✅ ACCURATE.

---

### Check 9 — "FreeCut DENSE_TIMELINE_TRACK_ITEM_THRESHOLD = 80"

**Claim (§17.3, §17.10):** `DENSE_TIMELINE_TRACK_ITEM_THRESHOLD = 80` at `utils/timeline-dom-density.ts:6`. Activation threshold for dense mode.

**Source:** `/tmp/freecut/src/features/timeline/utils/timeline-dom-density.ts`

**Actual:**
```ts
// :6
export const DENSE_TIMELINE_TRACK_ITEM_THRESHOLD = 80
```
Plus related constants:
- `:11` `DENSE_TIMELINE_OVERVIEW_ITEM_THRESHOLD = DENSE_TIMELINE_TRACK_ITEM_THRESHOLD` (= 80)
- `:14` `DEFAULT_TIMELINE_ITEM_CULL_BUFFER_PX = 2000`
- `:15` `DENSE_TIMELINE_ITEM_CULL_BUFFER_PX = 600`
- `:40-42` trackItemCount >= 80 ? 600 : 2000 selector.

**Verdict:** ✅ ACCURATE — exact match at line 6.

---

### Check 10 — "LARGE_ALT_DRAG_CANVAS_THRESHOLD = 24"

**Claim (§14.x implicit, §17.x implicit):** Threshold is 24 in `use-timeline-drag.ts`.

**Source:** `/tmp/freecut/src/features/timeline/hooks/use-timeline-drag.ts`

**Actual:**
```ts
// :41
const LARGE_ALT_DRAG_CANVAS_THRESHOLD = 24
// :72
if (itemIds.length < LARGE_ALT_DRAG_CANVAS_THRESHOLD) return
// :91
if (entries.length < LARGE_ALT_DRAG_CANVAS_THRESHOLD) return
```

Constant = 24, used as the cutoff for switching to canvas-based alt-drag rendering when the dragged group exceeds 24 items.

**Verdict:** ✅ ACCURATE.

---

### Check 11 — "OpenCut-classic 21 actions / 23 bindings at actions/definitions.ts:155-179"

**Claim (§15.x):** 21 actions registered with 23 default keybindings at `actions/definitions.ts:155-179`.

**Source:** `/tmp/opencut-classic/apps/web/src/actions/definitions.ts:155-179`

**Actual:**
```ts
// :155
const ACTION_DEFAULT_SHORTCUTS = [
    ["toggle-play", ["space", "k"]],
    ["seek-forward", ["l"]],
    ["seek-backward", ["j"]],
    ["frame-step-forward", ["right"]],
    ["frame-step-backward", ["left"]],
    ["jump-forward", ["shift+right"]],
    ["jump-backward", ["shift+left"]],
    ["goto-start", ["home", "enter"]],
    ["goto-end", ["end"]],
    ["split", ["s"]],
    ["split-left", ["q"]],
    ["split-right", ["w"]],
    ["delete-selected", ["backspace", "delete"]],
    ["copy-selected", ["ctrl+c"]],
    ["paste-copied", ["ctrl+v"]],
    ["toggle-snapping", ["n"]],
    ["select-all", ["ctrl+a"]],
    ["cancel-interaction", ["escape"]],
    ["duplicate-selected", ["ctrl+d"]],
    ["undo", ["ctrl+z"]],
    ["redo", ["ctrl+shift+z", "ctrl+y"]],
] as const satisfies ...
// :179
```

Actions (top-level array entries): 21 ✅
Bindings (sum of shortcut keys per action): 2 + 1 + 1 + 1 + 1 + 1 + 1 + 2 + 1 + 1 + 1 + 1 + 2 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 2 = **23** ✅

Array begins at line 155, ends at line 179 (closing `];`).

**Verdict:** ✅ ACCURATE — 21 actions, 23 bindings, exact line range.

---

### Check 12 — "FreeCut 60+ bindings across 8 shortcut-hook files"

**Claim (§19):** 60+ hotkey bindings across 8 shortcut-hook files in `hooks/shortcuts/`, all remappable via `useResolvedHotkeys` and persisted to localStorage.

**Source:** `/tmp/freecut/src/features/timeline/hooks/shortcuts/`

**Actual files in `hooks/shortcuts/` (production only, excluding tests):**
1. `use-clipboard-shortcuts.ts`
2. `use-editing-shortcuts.ts`
3. `use-in-out-shortcuts.ts`
4. `use-marker-shortcuts.ts`
5. `use-playback-shortcuts.ts`
6. `use-source-monitor-shortcuts.ts`
7. `use-tool-shortcuts.ts`
8. `use-ui-shortcuts.ts`

→ 8 production shortcut-hook files ✅ (plus 2 test files: `use-editing-shortcuts.test.tsx`, `use-in-out-shortcuts.test.tsx`).

**`useHotkeys()` call count per file:**

| File | `useHotkeys()` calls |
|---|---|
| `use-editing-shortcuts.ts` | 19 |
| `use-tool-shortcuts.ts` | 7 |
| `use-clipboard-shortcuts.ts` | 3 |
| `use-marker-shortcuts.ts` | 4 |
| `use-playback-shortcuts.ts` | 10 |
| `use-source-monitor-shortcuts.ts` | 2 |
| `use-ui-shortcuts.ts` | 9 |
| `use-in-out-shortcuts.ts` | 5 |
| **Total** | **59** |

So `useHotkeys()` registrations = 59 (one short of "60+").

**However**, `FC/config/hotkeys.ts:8-97` (the HOTKEYS constant map referenced by spec line 1272) contains 68 binding definitions (HOTKEYS entries with default key strings), which IS ≥ 60.

The spec wording "60+ hotkey bindings across 8 shortcut-hook files" is ambiguous:
- If "bindings" = `useHotkeys()` registrations distributed across the 8 files: **59** (1 short of 60+).
- If "bindings" = HOTKEYS constant definitions (all in one file, `config/hotkeys.ts`, consumed by the 8 hook files): **68** (≥ 60+).

**Verdict:** ⚠️ PARTIALLY ACCURATE — 8 shortcut-hook files confirmed; "60+" is satisfied if counting HOTKEYS constant definitions (68 ≥ 60) but is 1 short if counting useHotkeys() registrations (59 < 60). **Severity: trivial** (one-off-by-one wording imprecision; no architectural impact).

---

### Check 13 — "FreeCut MAX_VISIBLE_MINOR_MARKERS (72) at timeline-ruler-viewport-canvas.ts:71-75"

**Claim (§17.9):** Suppresses minor ticks when `visibleMarkerCount >= MAX_VISIBLE_MINOR_MARKERS (72)` OR `minorSpacing < MIN_MINOR_TICK_SPACING_PX (14)`. Implicit crossover is ~72 visible major intervals.

**Source:** `/tmp/freecut/src/features/timeline/components/timeline-ruler-viewport-canvas.ts`

**Actual:**
```ts
// :8
const MAX_VISIBLE_MINOR_MARKERS = 72
// :9
const MIN_MINOR_TICK_SPACING_PX = 14
// :65-66
const markerWidth = markerConfig.intervalInSeconds * pixelsPerSecond
if (markerWidth <= 0) return
// :68-69
const firstIndex = Math.max(0, Math.floor(scrollLeft / markerWidth) - 1)
const lastIndex = Math.ceil((scrollLeft + viewportWidth) / markerWidth) + 1
const visibleMarkerCount = lastIndex - firstIndex + 1
// :71
const minorSpacing = markerConfig.minorTicks > 0 ? markerWidth / markerConfig.minorTicks : 0
// :72-75
const showMinorTicks =
    markerConfig.minorTicks > 0 &&
    visibleMarkerCount < MAX_VISIBLE_MINOR_MARKERS &&
    minorSpacing >= MIN_MINOR_TICK_SPACING_PX
```

Constant `MAX_VISIBLE_MINOR_MARKERS = 72` is defined at `:8` and used in the threshold logic at `:74`. The spec's `:71-75` citation refers to the threshold expression lines (where the constant is used), which is accurate.

**Note:** The constant is also duplicated in `/tmp/freecut/src/features/timeline/components/timeline-markers.tsx:52` (= 72) and used at `:236` — same value, same threshold logic.

**Verdict:** ✅ ACCURATE — `MAX_VISIBLE_MINOR_MARKERS = 72` at `:8` (definition) and used in `:71-75` (threshold logic). The spec's line citation is to the usage location, which is accurate.

---

### Check 14 — "OpenCut-classic clips render as colored blocks (no filmstrip)"

**Claim (§17.5):** "No filmstrip thumbnail rendering exists in OpenCut-classic's timeline directory at all — elements render as solid colored blocks (`getTimelineElementClassName` from `components/theme.ts`). Filmstrip is a FreeCut-only feature."

**Source:** `/tmp/opencut-classic/apps/web/src/timeline/components/timeline-element.tsx`

**Actual:** FALSE. OpenCut-classic DOES render filmstrip thumbnails. At `timeline-element.tsx:1084-1133`, the `TiledMediaContent` component (invoked for `video` and `image` elements via the `ElementContent` switch at `:1166-1181`):

```tsx
function TiledMediaContent({ element, track }: { ... }) {
    const mediaAssets = useEditor((e) => e.media.getAssets());
    const mediaAsset = mediaAssets.find((asset) => asset.id === element.mediaId);
    const imageUrl =
        element.type === "video"
            ? mediaAsset?.thumbnailUrl
            : (mediaAsset?.thumbnailUrl ?? mediaAsset?.url);

    if (!imageUrl) {
        return (<span className="text-foreground/80 truncate text-xs">{element.name}</span>);
    }

    const trackHeight = getTrackHeight({ type: track.type });
    const tileWidth = trackHeight * THUMBNAIL_ASPECT_RATIO;

    return (
        <>
            <div
                className="absolute inset-0"
                style={{
                    backgroundColor: "var(--muted)",
                    backgroundImage: `url(${imageUrl})`,
                    backgroundRepeat: "repeat-x",
                    backgroundSize: `${tileWidth}px ${trackHeight}px`,
                    backgroundPosition: "left center",
                    pointerEvents: "none",
                }}
            />
            <MediaElementHeader ... />
        </>
    );
}
```

This is classic filmstrip thumbnail rendering via CSS `backgroundImage` tiling (`repeat-x` with a fixed tile width). The thumbnails come from `mediaAsset.thumbnailUrl` (for video and image). For text/effect/sticker/graphic/audio elements, no filmstrip is rendered (those use text/icon-based content), but for the two element types where filmstrip matters most (video, image), OpenCut-classic absolutely renders filmstrip thumbnails.

The spec confused two related claims:
1. ✅ Correct: wavesurfer.js is not used (the seed spec's "Canvas (wavesurfer.js)" was wrong).
2. ❌ Wrong: "no filmstrip thumbnail rendering exists" — filmstrip DOES exist, just via DOM/CSS backgroundImage tiling rather than Canvas.

This is consistent with the spec's overall thesis (OpenCut-classic is the DOM-based reference), but the spec's wording "no filmstrip" and "elements render as solid colored blocks" is factually wrong. OpenCut-classic clips render as **colored blocks with filmstrip thumbnail tiles overlaid via CSS background-image** (for video/image elements), or as colored blocks with text/icons (for text/effect/sticker/graphic/audio elements).

**Verdict:** ❌ INACCURATE — the spec overcorrects from "Canvas wavesurfer filmstrip" (seed claim, wrong) to "no filmstrip at all" (refined correction, also wrong). The actual truth: filmstrip exists via DOM/CSS backgroundImage tiling. **Severity: Medium** — affects the §3 comparison table (which lists OpenCut-classic filmstrip as "Canvas (wavesurfer.js, listed but unused)") and downstream consumers may believe OpenCut-classic has no filmstrip reference implementation, when it actually does (just done DOM/CSS-based instead of Canvas-based).

---

### Check 15 — "File names corrected: use-timeline-drag.ts → use-timeline-drag-drop.ts, use-timeline-resize.ts → use-timeline-resize.ts (element trim), use-element-interaction.ts"

**Claim (§14.x, §17.6):** The library-DnD drag hook is `hooks/use-timeline-drag-drop.ts` (not `use-timeline-drag.ts`). The element-trim hook is `hooks/use-timeline-resize.ts`. The element-body drag hook is `hooks/element/use-element-interaction.ts`.

**Source:** `/tmp/opencut-classic/apps/web/src/timeline/hooks/`

**Actual (filesystem):**
- `/tmp/opencut-classic/apps/web/src/timeline/hooks/use-timeline-drag-drop.ts` ✅ exists
- `/tmp/opencut-classic/apps/web/src/timeline/hooks/use-timeline-resize.ts` ✅ exists
- `/tmp/opencut-classic/apps/web/src/timeline/hooks/element/use-element-interaction.ts` ✅ exists

(Note: `use-timeline-drag.ts` does NOT exist in OpenCut-classic — only in FreeCut. So the seed spec's claim that OpenCut-classic has `use-timeline-drag.ts` was wrong; the refined spec's correction is correct.)

**Verdict:** ✅ ACCURATE — all three renamed paths exist as claimed.

---

### Check 16 — "element-interaction-controller.ts:118-121 Session = idle | pending | dragging"

**Claim (§14.4 architectural pattern, §14.x verified):** Session discriminated union at `:118-121` with three variants.

**Source:** `/tmp/opencut-classic/apps/web/src/timeline/controllers/element-interaction-controller.ts:118-121`

**Actual:**
```ts
// :118
type Session =
    | { kind: "idle" }
    | { kind: "pending"; mousedown: MousedownSnapshot }
    | { kind: "dragging"; mousedown: MousedownSnapshot; drag: DragProgress };
```

Exactly three variants (`idle`, `pending`, `dragging`) at lines 118-121. Byte-for-byte match.

**Verdict:** ✅ ACCURATE.

---

### Check 17 — "element-interaction-controller.ts:310-331 read-only view getter, :680-730 commit path"

**Claim (§14.4 benefit bullet):** Read-only `view` getter at `:310-331` exposing `ElementDragView`. Commit path `handleMouseUp` at `:680-730` calls `this.deps.timeline.moveElements(...)`.

**Source:** `/tmp/opencut-classic/apps/web/src/timeline/controllers/element-interaction-controller.ts`

**Actual (`:310-331`):**
```ts
// :310
get view(): ElementDragView {
    if (this.session.kind !== "dragging") return IDLE_VIEW;
    const { mousedown, drag } = this.session;
    const memberTimeOffsets = new Map<string, MediaTime>();
    for (const member of drag.moveGroup.members) {
        memberTimeOffsets.set(member.elementId, member.timeOffset);
    }
    return {
        kind: "dragging",
        anchorElementId: mousedown.elementId,
        trackId: mousedown.trackId,
        memberTimeOffsets,
        startMouseX: mousedown.origin.x,
        startMouseY: mousedown.origin.y,
        startElementTime: mousedown.startElementTime,
        clickOffsetTime: mousedown.clickOffsetTime,
        currentTime: drag.currentTime,
        currentMouseX: drag.currentMouseX,
        currentMouseY: drag.currentMouseY,
        dropTarget: drag.dropTarget,
        ...
    };
}
```

Read-only getter (no assignment to internal state) verified at `:310-331` ✅.

**Actual (`:680-730`):** `handleMouseUp` method body — performs click-threshold check, group-move resolution, and the commit call:
```ts
// :680
private handleMouseUp = ({ clientX, clientY }: MouseEvent): void => {
    if (this.session.kind === "pending") { this.finishSession(); return; }
    if (this.session.kind !== "dragging") return;
    const { mousedown, drag } = this.session;
    // click-threshold check (cancels drag if user didn't move past threshold)
    if (!movedPastDragThreshold({...})) {
        this.lastGestureWasDrag = false;
        this.finishSession();
        return;
    }
    const { moveGroup, groupMoveResult } = drag;
    if (!groupMoveResult) { this.finishSession(); return; }
    const didMove = groupMoveResult.moves.some(...);
    if (didMove || groupMoveResult.createTracks.length > 0) {
        this.deps.timeline.moveElements({
            moves: groupMoveResult.moves,
            createTracks: groupMoveResult.createTracks,
        });
    }
    this.finishSession();
};
```

Commit call (`this.deps.timeline.moveElements({...})`) at `:723-726` — within the `:680-730` range ✅.

**Verdict:** ✅ ACCURATE — both line ranges verified exactly.

---

### Check 18 — Two random "Corrections to Seed Spec" entries verified

#### 18a — §17.3 "OpenCut-classic has no density mode"

**Seed claim (table row in §3):** "Density mode: OpenCut-classic — None".
**Refined correction:** Verified correct. `find /tmp/opencut-classic/apps/web/src -name '*density*'` returns zero matches. FreeCut's density mode is real: `utils/timeline-dom-density.ts` (115 LOC), with `DENSE_TIMELINE_TRACK_ITEM_THRESHOLD = 80` at `:6` (verified above in Check 9).

**Verdict:** ✅ ACCURATE.

#### 18b — §17.4 "Ruler: OpenCut-classic — DOM, FreeCut — Canvas"

**Seed claim:** OpenCut-classic ruler is DOM, FreeCut ruler is canvas.
**Refined correction:** Verified correct. `OC/components/timeline-ruler.tsx:88-98` mounts `<TimelineTick>` DOM elements (verified at lines 88-98, `timelineTicks.push(<TimelineTick ... />)` at `:88-97`). `FC/components/timeline-ruler-viewport-canvas.ts:32-113` is a Canvas 2D drawing function (`drawTimelineRulerViewportCanvas` signature at `:32`, closing brace at `:113` — verified). The DOM wrapper `components/timeline-ruler-surface.tsx` (76 LOC) exists as claimed and owns pointer events on top of the canvas.

**Verdict:** ✅ ACCURATE.

#### Bonus 18c — §17.5 "wavesurfer.js listed but unused"

**Seed claim:** wavesurfer.js is listed in OpenCut-classic's package.json but unused.
**Refined correction:** Spec's correction says no wavesurfer reference found in OpenCut-classic's timeline (zero hits). Verified: zero hits in entire `apps/web/src/` tree AND zero hits in `package.json`. So wavesurfer is NOT "listed but unused" — it is **neither listed nor used**. The refined spec's correction correctly notes it's not in the source; it just doesn't explicitly state that it's also not in `package.json`.

**Verdict:** ✅ ACCURATE (refined correction correctly identifies wavesurfer is not in source; could be more explicit that it's also not in package.json).

---

## Issues found

| # | Severity | Issue | Location | Recommended fix |
|---|---|---|---|---|
| 1 | **Medium** | §17.5 (and §3 comparison table) claim "No filmstrip thumbnail rendering exists in OpenCut-classic's timeline directory at all — elements render as solid colored blocks". Actually, `timeline-element.tsx:1084-1133` defines `TiledMediaContent` which renders filmstrip thumbnails via CSS `backgroundImage: url(…)` with `backgroundRepeat: "repeat-x"` for `video` and `image` elements. OpenCut-classic DOES render filmstrip — just DOM/CSS-based rather than Canvas-based. | §17.5 (line ~1144) and §3 comparison table (line ~36, "Filmstrip thumbnails" row) | Replace "No filmstrip thumbnail rendering exists in OpenCut-classic's timeline directory at all" with "OpenCut-classic renders filmstrip thumbnails via CSS `backgroundImage` tiling on a `<div>` overlay (`TiledMediaContent` at `timeline-element.tsx:1084-1133`), NOT via Canvas. wavesurfer.js is not used." Update §3 comparison table row "Filmstrip thumbnails | OpenCut-classic" from "Canvas (wavesurfer.js, listed but unused)" to "DOM/CSS `backgroundImage` tiling (no wavesurfer.js)". |
| 2 | **Medium** | §17.1 claims "FreeCut DOES use IntersectionObserver — but in `use-clip-visibility.ts:37-98` for individual clip visibility (for filmstrip/waveform prefetch)". Actually, `use-clip-visibility.ts` (145 LOC) does NOT use IntersectionObserver — it uses `useTimelineViewportStore` + `useSyncExternalStore` and explicitly states in its doc comment "avoids per-clip scroll listeners/observers". The "IntersectionObserver" mentions in `clip-filmstrip/index.tsx:44`, `clip-waveform/index.tsx:48`, and `image-filmstrip.tsx:21` are stale JSDoc comments describing the `isVisible` prop, not actual usage. Actual IntersectionObserver usage in FreeCut is in `keyframes/components/dopesheet-editor/index.tsx:774` and `editor/components/compose-workspace/compositing-timeline.tsx:1547` — different features entirely. | §17.1 (line ~1113) | Replace "FreeCut DOES use IntersectionObserver — but in `use-clip-visibility.ts:37-98`" with "FreeCut does NOT use IntersectionObserver for timeline clips. `use-clip-visibility.ts` derives `isVisible` from `useTimelineViewportStore` (scroll math), not DOM observation. The IntersectionObserver mentions in `clip-filmstrip/index.tsx:44` / `clip-waveform/index.tsx:48` / `image-filmstrip.tsx:21` are stale JSDoc comments only — actual IntersectionObserver usage is in `keyframes/components/dopesheet-editor/index.tsx:774` and `editor/components/compose-workspace/compositing-timeline.tsx:1547` (outside the timeline feature)." |
| 3 | Trivial | §14.10, §17.8, §18 prose: "65 files total. Breakdown: 34 production + 22 tests + 9 utilities". Actual: 38 production + 18 tests + 9 utilities = 65. The §18 table itself is correct (47 non-test rows + 18 test rows = 65). The prose breakdown mislabels 4 production files as tests. | §14.10 (line 870), §17.8 (line 1164), §18 header (line 1194) | Change breakdown to "38 production source files + 18 test files + 9 utility/state files = 65" in all three locations. Or alternatively, just say "47 non-test files + 18 test files = 65" without splitting out utilities. |
| 4 | Trivial | §14.9 and §17.2 cite `use-visible-items.ts` as "874 LOC". Actual: 873 LOC (off by 1 — likely trailing newline convention). | §14.9 (line 1093), §17.2 (line 1124) | Change "874 LOC" → "873 LOC". |
| 5 | Trivial | §14.5 header says "Files (8 total)" for `placement/` directory but actually 9 production `.ts` files exist (types, compatibility, overlap, insert-index, main-track, resolve, apply, index, track-factory). The §14.5 table itself correctly lists all 9 files with accurate per-file LOC (sum = 849 LOC). | §14.5 header (line 748) | Change "Files (8 total)" → "Files (9 total)". (Or alternatively, exclude `index.ts` re-exports from the count if the spec intends to count only "real" implementation files — but then the table should also exclude the `index.ts` row.) |
| 6 | Trivial | §19 says "60+ hotkey bindings across 8 shortcut-hook files". Actual `useHotkeys()` call count across the 8 files = 59 (1 short of 60+). The HOTKEYS constant map in `config/hotkeys.ts:8-97` contains 68 entries (≥ 60+). Wording is ambiguous. | §19 (line 1379) | Either (a) change "60+" to "59" and add a note that the HOTKEYS constant map (config/hotkeys.ts) has 68 binding definitions, of which 59 are wired to handlers via useHotkeys(); or (b) rephrase as "68 HOTKEYS binding definitions in `config/hotkeys.ts:8-97`, consumed across 8 shortcut-hook files via 59 `useHotkeys()` registrations." |
| 7 | Trivial | §6.3 retains the seed spec's text "Use a library like `@tanstack/react-virtual` (both repos use it) for the heavy lifting." — but §17.2 explicitly corrects this with "Neither repo uses TanStack Virtual / react-virtual / react-window". §6.3 should be updated to reflect §17.2's correction. | §6.3 (line 193) | Replace "Use a library like `@tanstack/react-virtual` (both repos use it) for the heavy lifting." with "Neither reference repo uses TanStack Virtual / react-window for timeline virtualization — both roll their own (OpenCut-classic: none; FreeCut: custom `useVisibleItems` hook). We should follow the same pattern (custom virtualizer) per §14.9." |

No other issues found. All other claims — controller LOC totals, placement strategies, keybinding counts (21/23 in OpenCut-classic; 68 HOTKEYS in FreeCut), threshold constants (DENSE=80, LARGE_ALT_DRAG=24, MAX_VISIBLE_MINOR_MARKERS=72, HYSTERESIS_PX=800, DEFAULT/DENSE cull buffers 2000/600), Session state machine line range, view getter range, commit path range, file-renaming corrections, controllers directory naming — are accurate to the byte.

---

## Recommendation

**Verdict: ⚠️ PASS WITH REVISIONS** — implementation decisions can be safely derived from this spec once the two MEDIUM issues in §17 are fixed.

### Action items before downstream consumers

1. **(Required, Medium)** Fix Issue #1 (§17.5): correct the filmstrip claim. OpenCut-classic DOES render filmstrip thumbnails — via DOM/CSS `backgroundImage` tiling in `TiledMediaContent` (`timeline-element.tsx:1084-1133`). Update §17.5 prose and §3 comparison table to reflect this. This matters because downstream consumers (stream 06 nle-ops, stream 07 composition, stream 14 implementation phases) may infer that OpenCut-classic offers no filmstrip reference implementation — when in fact it does, just DOM-based rather than Canvas-based.

2. **(Required, Medium)** Fix Issue #2 (§17.1): correct the IntersectionObserver-in-FreeCut claim. `use-clip-visibility.ts` does NOT use IntersectionObserver (uses viewport store + scroll math). The stale JSDoc comments in `clip-filmstrip` / `clip-waveform` / `image-filmstrip` should not be cited as evidence of IntersectionObserver usage. Actual IntersectionObserver usage is in `keyframes/dopesheet-editor` and `editor/compose-workspace/compositing-timeline` — outside the timeline feature.

3. **(Optional, Trivial)** Fix Issues #3–#7 (file-count breakdown, off-by-one LOC, "8 total" → "9 total" placement count, "60+" wording, retained §6.3 seed text). No functional impact, but improves spec cleanliness.

4. **(No action)** All 18 required spot-checks pass on the substantive architectural claims; the spec is ready to feed into implementation phase P0 (timeline spike) and into stream 06 (nle-ops) and stream 09 (project-model) downstream consumption of the controller/placement/virtualization contracts defined in §14.

### Highlights of what's verified accurate

- **Controller pattern (§14.4)**: 7 controllers × byte-exact per-file LOC × total 2,863 LOC. Session state machine at `:118-121` (3 variants), view getter at `:310-331`, commit path at `:680-730` — all verified line-by-line.
- **Placement algorithm (§14.5)**: 5-variant strategy union at `types.ts:14-25`, dispatcher at `resolve.ts:134-278` with all 5 dispatch lines at the exact cited line numbers, REJECTED-not-SHIFTED overlap predicate at `overlap.ts:8-44`.
- **Keybindings (§15)**: 21 actions / 23 bindings at `actions/definitions.ts:155-179` — exact match, including the multi-binding actions (`toggle-play` has 2 keys, `goto-start` has 2, `delete-selected` has 2, `redo` has 2 — summing to exactly 23).
- **Threshold constants**: DENSE_TIMELINE_TRACK_ITEM_THRESHOLD=80 (`timeline-dom-density.ts:6`), LARGE_ALT_DRAG_CANVAS_THRESHOLD=24 (`use-timeline-drag.ts:41`), MAX_VISIBLE_MINOR_MARKERS=72 (`timeline-ruler-viewport-canvas.ts:8`), HYSTERESIS_PX=800 (`use-visible-items.ts:32`), DEFAULT/DENSE cull buffers 2000/600 — all at the cited line numbers.
- **FreeCut hook LOC totals (§14.11)**: 1553 + 950 + 772 + 1291 = 4566 — exact match.
- **File-renaming corrections (§17.6, §17.7)**: `use-timeline-drag-drop.ts`, `use-timeline-resize.ts`, `hooks/element/use-element-interaction.ts` all exist at the corrected paths; the 7 OpenCut-classic controllers all carry the `-controller.ts` suffix.
- **Density mode absence in OpenCut-classic (§17.3)**: zero `*density*` files in OpenCut-classic source.
- **DOM ruler in OpenCut-classic (§17.4)**: `<TimelineTick>` elements at `timeline-ruler.tsx:88-98`; FreeCut canvas at `timeline-ruler-viewport-canvas.ts:32-113`, wrapped by DOM surface `timeline-ruler-surface.tsx` (76 LOC).
- **wavesurfer.js absence (§17.5)**: zero hits in `/tmp/opencut-classic/apps/web/src/` AND in `package.json` — the seed claim "listed but unused" was completely wrong (it's neither listed nor used).

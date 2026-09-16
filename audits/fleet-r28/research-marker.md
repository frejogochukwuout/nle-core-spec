# research-marker — the marker v2 design round (R28-W1-h / ARCH-R28 Group D, D1)

**Task:** R28-W1-h. **Question:** register OPEN row 5 — "Marker v2 vs 09-A2 (C33 — the flat per-scene marker vs range/notes/keyword + clip markers)". **Ruled by:** ARCH-R28-seal-round.md §2 Group D row D1 (owners 09 lead + 05/16/18; the XMOCK-4 ruling ask). This pack is the W2 ruling drafter's evidence. Read-only research; one output file (this one) + the worklog append.

---

## 1. The spec's current marker law (the A2 flat model)

### 1.1 The data model — 09 §3.1/§3.1A

- **09 §3.1 (`Marker` interface, 09-project-model.md:284-289):** `Marker { id: string; time: MediaTime; label?: string; color?: string }` — "the ONE marker type, PER SCENE (`SceneJSON.markers`) — absorbs Bookmark". `SceneJSON.markers: Marker[]` (:115-116); the project-level `markers` array is RETIRED (:77-78 comment).
- **09 §3.1A A2 ruling text (:333):** "ONE type — `Marker {id, time, label?, color?}` — stored PER SCENE (`SceneJSON.markers`), absorbing `Bookmark`… The wire form is spec 15 §13.3's `addMarker`/`deleteMarker`/`updateMarker` command family; 16 §3.7's `toggleBookmark`/`removeBookmark`/`updateBookmark` trio and 15 §13.15's bookmark rows RENAME into this family (toggle ≈ add/delete, move ≈ update position). No project-level marker surface remains (ARCH-R15 §2.4 sub-gate (c))."
- **Latent inconsistency found (amendment rider regardless of ruling):** 09 §3.3's illustrative zod example still carries `markers: z.array(MarkerSchema)` at the **project** level (09:382) — contradicting A2's own retirement comment at :77-78. The example predates the A2 edit and was never swept.

### 1.2 The timeline surface — 05 §11.1

- 05-timeline.md:705-720: markers per scene; plain click/drag on the ruler **SEEKS** (N10 — "click on ruler to add marker" retired R15); added via `M` (16 §3.7), the toolbar marker button + color presets, the command palette, and 18 §4.9's ruler menu. Markers are snap points (05 §9, :643/:666-669).
- 05's engine code-reference table pins `addMarker` at engine `timeline.ts:7708` (05:1223, the R8-era table).

### 1.3 The keyboard — 16 §3.7

16-keyboard-shortcuts.md:337-351 — `M` add (always adds, N8), `⇧M` delete at playhead, `⌥M` edit dialog (UI-only, `updateMarker` fires on save), `⌘⌥M` delete all (batch), `⌥⇧M` add with cycled color, Up/Down in marker-nav-mode jump prev/next (`seekToMarker`); §3.1 :155 also binds `⌘⇧←/⌥→`-class `Cmd+Shift+Left` = jump to previous marker. **8-color palette** (red/orange/yellow/green/blue/purple/pink/gray, FCP cycle order) pinned at :349. The `⌥M` dialogs sit in the r5 keymap long tail (fleet-r23/16-report.md:47, the C22 ledger).

### 1.4 The UI — 18's rows

- Transport row: add-marker `M` button (18:173). Toolbar §4.5 marker cluster: add-marker button + color presets (18:203). Ruler menu §4.9: Add Marker / Go to Marker › (submenu, first 5 + More) / Clear Markers in View — `Clear Markers in View` documented as batched `deleteMarker` (18:233). A11y: marker submenus walk with arrow keys + `aria-activedescendant` (18:469).
- 18 §4.4 (Inspector) has NO marker row today — the rail swap is un-specced (mock-only).

### 1.5 The wire — 15

- The union carries BOTH blocks: Bookmark (4 members: toggle/remove/update/move, §4.3.39-42) + Marker (3 members: add/delete/update, §4.3.49-51) = 7 of the 78, both r1-tagged in §4.1A's disposition table (15:314/:316), both folding into the unified family at the C7 rename (r1 END).
- `AddMarkerCommand` params already carry time/label/color (15:1543-1555); `UpdateMarkerCommand.updates: Partial<Marker>` (15:1586-1588) — **any field added to `Marker` rides the existing verbs; no new union members needed.**
- OT's live wire surface: `timeline.toggleBookmark/removeBookmark/moveBookmark` are 3 of the 28 ROUTED verbs (15:14; OT `api.ts` WIRE_COMMAND_TYPES @ `970948a`). The shell-path keys (M/⇧M etc.) are the app's registered blind spot (15:28, R2/D29.1).

### 1.6 What the SSOT (opencut-timeline) actually has — the decisive extraction

OT `src/lib/timeline/types/index.ts:30-35` @ `55c81c0`:

```ts
export interface Bookmark {
  time: MediaTime;      // time-KEYED — no ids ("the bookmark at frame X")
  note?: string;
  color?: string;      // opaque — CSS color by consumer convention
  duration?: MediaTime; // the RANGE field — end = time + duration
}
```

`src/lib/timeline/bookmarks/utils.ts` — toggle/remove/update/move array ops (time-keyed, one-per-tick toggle, duplicate-destination move REJECTED as NOOP); **`getBookmarksActiveAtTime` (:175-190) already implements the range read** (`duration > 0` → active across `[start, start+duration]`). OT's bookmark row UI exists (`TimelineBookmarksRow.tsx` + `use-bookmark-drag.ts`). **OT has NO element-level marker field and no keyword anywhere** (grep-verified: types/index.ts has no `markers`/`keyword`; elements carry effects/params/transitionOut/retime/animations only).

**The app bridge today** (nle-test-app `src/sceneBridge.ts`): forward `Marker → Bookmark {time, note: label, color: MARKER_HEX[color]}` (:375-379; MARKER_HEX 8-name⇄hex law, :121-127), backward `Bookmark → Marker {id: mk-N synthesized, time, label: note ?? '', color: hex→name, foreign → 'blue'}` (:557-560). **The bridge silently drops OT's `duration`** — the R23 09-fleet already flagged exactly this: "OT's Bookmark has a `duration?` field the spec's Marker does not carry — the bridge ignores it today; a marker-family widening decision will be needed when OT-side bookmark ranges surface" (audits/fleet-r23/09-project-model.report.md:55). This round is that decision.

---

## 2. The mock's marker v2 (the variants, R19 era — C33's ask)

### 2.1 The data model (mockData.ts)

- `Marker` (mockData.ts:106-117): `{id, time, label, color: 8-token union, duration?, notes?, keyword?}` — "duration => RANGE marker (end = time + duration, >= 1 frame); notes/keyword carry the marker-inspector fields (reference mock)".
- `ClipMarker` (mockData.ts:121-126): `{id, offset (seconds from the element's startTime — pinned inside the clip box), label, color}` on `ElementJSON.markers?: ClipMarker[]` (:75-76).
- Fixtures: sc-1 `mk-1..mk-5` (mk-3 carries notes+keyword; **mk-5 is the range marker 17→24s, purple**), sc-2 `s2-mk-1` (scene-scoping), clip markers cm-1/cm-2 on el-2 + cm-3 on el-3 (mockData.ts:254-258 + element fixtures).

### 2.2 The ops (useUiStore.ts — line numbers at the live tree; the register's R25 census pins have drifted)

- `addMarker(time, color?)` (:1496-1502) — withHistory, snapToFrame, palette cycles by scene marker count; `removeMarkersAt(time)` (:1982-1987, the ⇧M verb — frame-width match, true no-op law); `selectMarker(id)` (:1506-1520 — one selection DOMAIN: clears clip/track/effect/fx-object selections); `updateMarker(id, patch)` (:1521-1556) — **the identical-patch no-op guard (R25-F4 SS3: identity judged AFTER normalization)** + the range law (`duration >= 1/24`, end clamped to scene duration, `null` → point); `removeMarker(id)` (:1557-1564, clears selection if it pointed there). Scene-switch/clip-selection clear-site laws clear `selectedMarkerId` (:1337-1341, :1804-1851, :1898-1930 — the 7th clear-site law).
- Clip markers: `addClipMarker(elementId, offset, color?)` (:1566-1578 — offset clamped into `[0, duration - 1 frame]`), `removeClipMarker` (:1581-1589 — prunes empty arrays).
- **The structural family (insertPlan.ts):** head trim filters+re-offsets (`offset >= cut → offset - cut`, :213-215), tail trim filters (`offset <= duration`, :227-229), split partitions markers to both halves with re-offsets (:243, :444) — the "marker re-offsets" the planner owns (store comment :1697). Clip markers ride EVERY structural op through the pure planner (preview == commit by construction).
- Undo: nested marker arrays + ClipMarker clones ride the history snapshots (cloneEl :132-134, :160).

### 2.3 The surfaces

- **Ruler.tsx (the marker band):** the ruler splits into two bands — tick band + a DEDICATED marker band at the bottom (14px readout / 10px slim, bandTop 30, zoneH 44; :52, :135-137, :423-443). POINT pins = clickable shield buttons (10×13 readout) inside the band, `aria-label "Marker {label}"`, click/Enter → `selectMarker` (never scrubs — :538-579); t=0 pins clamp to the start edge (F3 P3-4). RANGE markers = a span band in the band: 20% translucent fill + 2px solid rails + shield end caps, `aria-label "(range)"`, tooltip `label · tc–tc` (:581-599). Selected pin gets the accent ring. "Markers never visually enter lane territory."
- **MarkerInspector.tsx (the rail-swap):** embedded right-rail panel (the reference's dialog → panel per the user directive) — header (color dot + TC chip), fields Time (NumberField TC, clamped 0..sceneDuration), Duration (ONLY for range markers, `min 1/24`, end readout), Name, Notes (70px textarea), Keyword (free-text pseudo-select), Color (8-dot role="tablist", R25-F4/AA6 roving tabindex — one tab stop, ←/→ move selection+focus), footer Remove Marker / Done. Stale-id → the HONEST one-line empty panel (R23-FIX R2-F1), never a silent null. The AppShell rail priority: `markerRailLive = !!selectedMarkerId && page !== 'color'`, hoisted above page rails (AppShell.tsx:352-368).
- **Clip.tsx:** clip-marker pins inside the clip box (8px, `offset·pps`, data-tip `label · tc`) — click BUBBLES to select the clip (no separate domain, :1716-1728); the clip context menu adds "Add clip marker here" (at playhead if inside, else clip mid) + per-marker remove rows (:435-447).
- **Ruler menu §4.9:** REAL "Go to Marker ›" inline submenu (label + tc rows; range rows navigate to the marker start; empty scenes keep an honest `aria-disabled` row) — the spec's "first 5 + More" placeholder is superseded; **"Clear Markers in View" stays honestly disabled** (view-range tracking not built — `⇧M` deletes at playhead; Ruler.tsx:282).
- **Keys (useShortcuts.ts):** M/⇧M/⌥⇧M/⌘⇧←/→ marker nav (nearest-before/after, :399-406), Escape clears the marker domain (the R24-W5d ladder rung). The ⌥M dialog key is NOT bound (pin-click routes the rail instead — the r5 C22 tail).
- **Stories (the VLM net's surfaces):** `RulerMarkers` + `MarkersAndCaptions` (Timeline.stories.tsx:194-268; the VLM findings json carries both shots).
- **exportJson.ts:** the interchange doc carries scene `markers` AND element `markers` (clip markers ride the element — :82/:97/:137-138/:181).

### 2.4 The test pins (live line-start counts, battery method)

| Suite | Family | Pins |
|---|---|---|
| MarkerInspector.test.tsx | field set / honest-empty / name+notes+keyword round-trips / Time clamp / Duration range-only / color tablist / **AA6 roving** / Remove+undo / Done | **10** (register declares **9** — the AA6 pin added mid-flight R25-F4; recorded not chased per §35.2's WRAP law — the re-key picks it up) |
| useUiStore.test.ts | `describe('markers')` :456-509 (add snap+palette, explicit color, removeMarkersAt ±, the SS3 identical-patch no-op) + `describe('R19: marker v2')` :2155-2200 (domain swap, range-law patch + undo round-trip, remove-clears-selection, clip-marker clamp/prune) | **9** |
| Clip.test.tsx | `R19 clip markers` :1198-1244 (pins render + tooltips, click-bubble, clip-menu add/remove, playhead-outside fallback) | **4** |
| Ruler.test.tsx | fixture pins :43 / menu add :96 / palette :107 / roving menu :125 / band+point pins :327-380 (6) / RANGE :383-415 (3) / Go-to-Marker :417-451 (2) / bracket-band coexistence :516 | **16** |
| useShortcuts.test.tsx | M/⇧M :338, ⌥⇧M :346, marker nav :485, Escape-domain :788 | **4** |
| TimelineToolbar.test.tsx | marker button :183, marker-color palette :266 | **2** |

**Total ≈ 45 direct marker-family pins** (the register's row-5 form cites "9 (MarkerInspector) + the useUiStore/Clip families"; the store line pins cited :1900-1935/:987-1007 were the R25 census positions — now :2155-2200/:1198-1244, line-drift only).

### 2.5 C33's proposal text (the ask)

`.agents/SPEC-REVISION-CANDIDATES.md` §H.1 (R19, 2026-09-06): "**Marker v2 model** — `Marker.duration` (range markers, end = time+duration, ≥1 frame, clamped to scene), `notes`, `keyword` fields + per-clip markers (`ElementJSON.markers`: {id, offset, label, color}); ruler gains a dedicated MARKER BAND… clickable pins → MarkerInspector rail swap… 'Go to Marker ›' real navigation" — spec clause touched: **05 §11.1, 09 §3.1A (point-marker-only today)**; "spec ruling needed for range/clip markers". Five rounds unadopted at R25 (xcut-shell-mocks D4); eight rounds queued at R27 (xcut-register :76).

---

## 3. The DaVinci-class reference (what the corpus itself holds)

The corpus's Resolve-shaped evidence is **two user-uploaded reference HTMLs (R19) + the shipped mock**, not external docs:

1. **`ui-mock/timeline-marker-transcript-withDialog.html`** — the Markers dialog (§2.2): fields **Time / Duration / Name / Notes (70px textarea) / Keyword (dropdown-affordance text input) / Color (15 shield swatches)**, footer Remove Marker / Done; the timeline shows point + range markers. This is Resolve's marker-dialog shape nearly verbatim (Time+Duration on one row; Duration is how Resolve marks ranges).
2. **`ui-mock/timeline-marker-only.html`** — the marker track area BELOW the ruler (§1.3/§1.4): global point markers (12×14 shields), **a range marker (shield + range-bar + shield)**, and **clip markers** (smaller 10×12 shields INSIDE clip boxes). This is the source of the mock's marker band + clip-marker grammar.
3. `ui-mock/davinci_resolve_ui_mock.html` :885-889 — the timeline toolbar's marker presets + marker color buttons (18 §4.5's marker cluster source).
4. The mock's own research trail: the C33 registration (above), the R23-FIX/R24-W5d/R25-F4 hardening notes in-code, and the fleet reads (xcut-shell-mocks.md :30/:54/:100-104; fleet-r25/verify-00-15-register-plan.md:20 — C33 the R19-era QUEUED).

**Corpus quotes on Resolve's key grammar:** thin — 16 §3.7's palette + M-family derive from FCP/FreeCut (05 §19.2: FreeCut's `m`/`shift+m`/`[`/`]`); the ⌥M dialog is named in 16 §3.7 + the C22 r5 tail. No corpus text quotes Resolve's ⌥M/M semantics, marker panel, or clear-all beyond 16's own `⌘⌥M` delete-all row (:344, resolved from the FCP conflict at :648). **The reference weight for range/notes/keyword/clip-markers is therefore the two HTMLs + the mock, not corpus prose** — stated plainly per the task's instruction.

---

## 4. The options

### (a) ADOPT wholesale (range + notes + keyword + clip markers into 09/05/16/18)

- **SceneTracks SSOT:** `duration` aligns with OT's existing `Bookmark.duration` (zero OT change); `notes` ≈ `Bookmark.note`; **`keyword` has NO OT home** (would need an OT type widening or an app-side-only field — the spec would then define a field its own SSOT cannot round-trip, the exact D2e-class hole the bridge field-law exists to prevent); **ids** — OT is time-keyed, no ids; the bridge already synthesizes them (acceptable: id is doc-side, time is the OT key — but two same-time markers become ambiguous in OT's toggle semantics).
- **Clip markers:** OT elements carry NO marker field. The structural re-offset family (trim filter/shift, split partition — insertPlan :213-229/:243/:444) has no OT op surface; adopting the doc field ahead of the op laws means **any 09-faithful implementation silently corrupts offsets on split/trim** (the WYSIWYG violation class). The C35 precedent (per-clip audio params — equally mock-real, doc-side, engine-consumes-none) was QUEUED, not adopted.
- Cost: OT type changes (keyword) + op-surface work + bridge widening + 5 spec files; the keyword half buys nothing (no consumer, no vocabulary — the reference's dropdown was inert; the mock's is free text).

### (b) ADOPT the SUBSET — point + range + notes; keyword declined; clip markers queued

- `duration?` + `notes?` are the fields **the OT SSOT already carries** (`Bookmark.duration` + `Bookmark.note` + `getBookmarksActiveAtTime`); adopting them makes 09's Marker exactly as expressive as the SSOT it mirrors and un-drops the bridge's silent `duration` loss. Zero OT change. Zero new wire verbs (`Partial<Marker>` rides `updateMarker`).
- `keyword`: registered REJECTION (the honest-limited half of this option) — no OT home, no consumer, no fixed vocabulary.
- Clip markers: re-queued to the r5 marker round where the field AND its re-offset op-laws land together (the corrupt-on-split argument forbids the field alone).
- Cost: 09/05/16/18 doc edits only; the bridge widening (duration+notes mapping, 2 lines) rides the r5 port.

### (c) REGISTERED REJECTION (flat model stands; honest-limited inspector)

- Zero amendment cost beyond the register flip — but it leaves **the spec's Marker NARROWER than the OT SSOT it claims to mirror** (OT's `Bookmark.duration` exists, is readable via `getBookmarksActiveAtTime`, and the bridge drops it). The R23 09-report's own flagged "widening decision" would resolve to "never" while OT's type keeps inviting it. It also strands ~45 tested pins + 2 VLM stories as permanently un-adoptable reference, and freezes the marker band/range UI out of 05 — the one grammar §8A does NOT cover. Weakest coherence-per-cost of the three.

---

## 5. RECOMMENDATION — the ruling (paste-ready)

> **R28-D1 (the marker v2 ruling): ADOPT THE OT-ALIGNED SUBSET — range + notes join the A2 family; keyword is a registered rejection; clip markers re-queue to r5.**
>
> 1. **The model (09 §3.1, the A2 v2 widening):**
>    ```ts
>    interface Marker {        // per scene (SceneJSON.markers) — A2 v2 (R28-D1)
>      id: string;             // doc-side key; OT stays time-keyed (the bridge synthesizes mk-N)
>      time: MediaTime;
>      label?: string;        // the short name (ruler tooltip + inspector Name)
>      color?: string;        // 16 §3.7's 8-token palette; the bridge's MARKER_HEX name⇄hex law
>      duration?: MediaTime;   // RANGE marker: end = time + duration; >= 1 frame; end <= scene
>                              // duration; absent/0 = point (the taxonomy split)
>      notes?: string;         // free-text annotation (the inspector's Notes field)
>    }
>    ```
>    The point/range taxonomy is one family: `duration` absent or 0 = point marker; `duration > 0` = range marker. Range end clamps to the scene duration; the minimum is one frame.
> 2. **`keyword` is REJECTED (registered rejection):** no OT home, no fixed vocabulary, no consumer; the reference's dropdown affordance was inert and the mock's field is free text duplicating notes' role. The mock's keyword field + inspector row become a REGISTERED-DEVIATION (mock-only nicety, slated for removal at the mock's next marker-family touch — or retained as inert display state, never law).
> 3. **Clip markers (`ElementJSON.markers: ClipMarker[]`) re-queue to r5-entry** (C33's second half, one bundle): the doc field and its structural laws (head/tail trim filter+re-offset; split partition with re-offset — insertPlan.ts:213-229/:243/:444 the reference) land TOGETHER at the r5 marker round; landing the field ahead of the laws silently corrupts offsets on split. The mock's family + its 8 pins (Clip.test :1198-1244 + the addClipMarker/removeClipMarker store rows) remain the registered reference. The C35 precedent is the model: mock-real doc extensions queue to the owning round, they do not pre-land in 09.
> 4. **The wire needs NO new verbs:** `addMarker`/`updateMarker` carry `duration`/`notes` in params (15 §4.3.49-51 — `Partial<Marker>` already the update shape); OT's routed `toggleBookmark/removeBookmark/moveBookmark` fold at the C7 rename as already scheduled (r1 END, unchanged). The bridge gains the duration+note mapping at the r5 port (today it drops OT's duration — fleet-r23/09-report:55 — flagged, now dispositioned).
> 5. **The port cost is r5 by plan and stays r5:** markers are absent from the leverage map (fleet-r27/mock-leverage.md — zero marker rows) and the ten-mode r1 contract; the plan already phase-tags marker v2 at **r5-entry** (IMPLEMENTATION-PLAN.md S-spec row 3: "marker v2 + captions at r5-entry"). This ruling is the MODEL decision only; execution (bridge widening + the band UI at the app) rides r5/wave order.

### 5.1 The amendment map (9 sites, 5 spec files + the register)

| # | Site | The edit |
|---|---|---|
| 1 | 09 §3.1 (:284-289) | `Marker` gains `duration?` + `notes?` with the range-law comment |
| 2 | 09 §3.1A A2 (:333) | The ruling text: the v2 widening sentence + the keyword rejection + the clip-marker r5 queue + the OT-alignment rationale (Bookmark.duration/note, getBookmarksActiveAtTime) |
| 3 | 09 §3.3 (:382) | CLEANUP RIDER (rules-independent): drop the stale project-level `markers: z.array(MarkerSchema)` from the illustrative zod example — it contradicts A2's own retirement |
| 4 | 05 §11.1 (:705-720) | The interface copy syncs; the range semantics (end law); the marker band (the ruler's DEDICATED band below the tick band — point pins + range bands, 20% fill + rails + shield caps; pins never enter lane territory; pin click SELECTS, never scrubs; t=0 clamps visible); pins are snap points (§9 already covers) |
| 5 | 16 §3.7 (:343) | The `⌥M` row's "opens marker dialog" → "opens the marker inspector (18 §4.4's rail swap; `updateMarker` fires on commit)" — one-line pointer; keys otherwise unchanged |
| 6 | 18 §4.4 | NEW row: the marker inspector rail — `selectedMarkerId` the marker selection domain (the AppShell rail priority: marker rail above page rails); the field set (Time / Duration [range-only] / Name / Notes / Color 8-dot roving tablist); the honest-empty law; the domain-clear laws (scene switch, clip selection, Escape) |
| 7 | 18 §4.9 (:233) | The Go-to-Marker submenu becomes REAL (inline label+tc rows; range rows navigate to start; empty scene = honest `aria-disabled`); "Clear Markers in View" stays registered-honest-disabled until view-range tracking exists (⇧M remains the at-playhead delete) |
| 8 | 15 §4.3.49-51 | One-line note: `duration`/`notes` ride the existing params (no new union members; the C7 fold unchanged) |
| 9 | REFERENCE-REGISTER | Row 5 split-flip + the OPEN table row + the C-ledger C33 row (texts below) |

### 5.2 The register flip texts (paste-ready)

- **Register row 5 →** `| 5 | **Marker v2** (range duration + notes; keyword REJECTED; clip markers r5-queued) · **RULED-R28-D1** | variants: MarkerInspector.tsx + mockData.ts:106-117 + Ruler.tsx (the marker band) · store: useUiStore.ts marker family (addMarker :1496 / updateMarker :1521 / removeMarker :1557 / removeMarkersAt :1982) | **10** (MarkerInspector.test — the AA6 pin added mid-flight; re-key at WRAP) + the useUiStore (9) / Ruler (16) / Clip (4) / useShortcuts (4) / TimelineToolbar (2) families (~45 total) | 09 §3.1A A2-v2 (LANDED-R28) + 05 §11.1 + 16 §3.7 + 18 §4.4/§4.9 | LAW-REGISTER (the adopted half) + PROPOSAL (the clip-marker half, r5-queued) | **MOCK-IS-REFERENCE** for the adopted half (the band + inspector grammar become contract at the r5 port); the keyword field + the clip-marker family are REGISTERED DEVIATIONS (mock-only until r5) |`
- **OPEN table row 5 →** `| **Marker v2 vs 09-A2** (C33) | row 5 | **RULED (R28 — D1: OT-ALIGNED SUBSET)** — range+notes adopted into the A2 family; keyword rejected (registered); clip markers re-queued to r5-entry with their re-offset law bundle; the bridge's duration-drop dispositioned |`
- **C-ledger C33 →** `| C33 | Marker v2 model (range/clip markers, the inspector rail) | row 5 | **SPLIT-ADOPTED (R28-D1)** — range+notes LANDED into 09 A2-v2; keyword DECLINED (no OT home/consumer); clip markers RE-QUEUED r5-entry (C33b, the field+laws bundle) |`

### 5.3 The ruling's riders (acceptance gates — pins the mock already carries)

1. **The range law:** `duration >= 1 frame`; `time + duration <= sceneDuration` (store clamp); `null`/absent → point (useUiStore.test :2164-2181; MarkerInspector.test :79-92).
2. **The taxonomy split:** point markers never render as ranges and vice versa (Ruler.test :410-414).
3. **The pin laws:** pin/range click SELECTS the marker (rail swap) and NEVER scrubs the playhead (Ruler.test :346-352/:403-408); t=0 pins clamp fully visible (F3 P3-4, :372-380); pins live inside the band, never in lane territory (:337-344).
4. **The inspector contract:** the honest-empty stale-id row (R2-F1); every edit through `updateMarker` (undoable); Duration row renders ONLY for range markers; the color tablist roves (AA6 — ONE tab stop).
5. **The history laws:** undo round-trips marker edits (nested clones); the identical-patch no-op guard (SS3 — identity AFTER normalization mints no entry; useUiStore.test :491-509).
6. **The selection-domain laws:** `selectMarker` clears the clip/track/effect/fx domains; scene switch + clip selection + Escape clear `selectedMarkerId` (the 7th clear-site law).
7. **Navigation:** the Go-to-Marker submenu is real (seek to marker; range rows → marker start; empty scene = honest disabled); `⌘⇧←/→` nearest-marker nav.
8. **The register re-key:** row 5's MarkerInspector pin re-keys 9→10 at the sibling's WRAP (the AA6 mid-flight addition — §35.2's recorded-not-chased law).

---

## 6. Sources (primary citations)

- Spec: 09-project-model.md:77-78/:115-117/:284-289/:327-333/:382; 05-timeline.md:705-720/:643/:1223; 16-keyboard-shortcuts.md:337-351/:155/:318/:648; 18-ui-shell.md:173/:203/:233/:278/:469; 15-wire-protocol.md:14/:28/:231-246/:296/:314/:316/:378-390/:1362-1421/:1543-1593/:4814.
- Register/plan/rounds: REFERENCE-REGISTER.md:8-14/:28/:52/:64; audits/ARCH-R28-seal-round.md:52-58/:89; IMPLEMENTATION-PLAN.md:25 (S-spec row 3 — r5-entry tag)/:65/:69; audits/fleet-r25/xcut-shell-mocks.md:30/:54/:100-104/:156/:173 (XMOCK-4); audits/fleet-r25/integration-review-r25.md:19; audits/fleet-r27/xcut-register.md:76/:102-105/:174; audits/fleet-r27/review-plan.md:36/:81; audits/fleet-r23/09-project-model.report.md:12/:18/:55; audits/fleet-r23/16-keyboard-shortcuts.report.md:47.
- Mock (variants): mockData.ts:75-76/:106-126/:254-258; useUiStore.ts:132-137/:1496-1589/:1697/:1982-1987 + clear-site rows :1337-1341/:1804-1930; MarkerInspector.tsx (whole, 229 ln); Ruler.tsx:34-52/:135-149/:270-287/:423-443/:538-599; Clip.tsx:435-447/:1716-1728; insertPlan.ts:152-164/:209-229/:243/:444; exportJson.ts:82/:97/:137-138/:181; AppShell.tsx:352-368; useShortcuts.ts:399-406/:461-470/:527-532; shortcutMap.ts:34/:75-78; stories/Timeline.stories.tsx:194-268.
- Mock tests: MarkerInspector.test.tsx (10 it); useUiStore.test.ts:456-509/:2155-2200; Clip.test.tsx:1198-1244; Ruler.test.tsx:323-451/:516; useShortcuts.test.tsx:338/:346/:485/:788; TimelineToolbar.test.tsx:183/:266.
- OT (SSOT): `opencut-timeline@55c81c0` src/lib/timeline/types/index.ts:30-42; bookmarks/utils.ts:35-190 (esp. :67-93 toggle-create-with-color/note, :175-190 getBookmarksActiveAtTime); no element-marker/keyword fields (grep-verified).
- App bridge: nle-test-app `sceneBridge.ts` @ `c020b2a`:121-127/:375-379/:557-567.
- Proposal: `.agents/SPEC-REVISION-CANDIDATES.md` §H.1 C33 (:415-419) + §H.2.
- References (DaVinci-class): ui-mock/timeline-marker-transcript-withDialog.html:82-136 (the Markers dialog) + :299-324 (point/range markers); ui-mock/timeline-marker-only.html:107-138/:198-207/:241-322 (marker track area, range marker, clip markers); ui-mock/davinci_resolve_ui_mock.html:885-889.

# research-captions — the track-kind vs element-type model decision (R28-W1-i, decision D2 / C34)

**Agent:** research-captions (the R28 seal round, W1) · **Date:** 2026-09-15 · **Task:** R28-W1-i · **Read-only:** nle-core-spec, opencut-timeline (OT), the mocks. One output file; no commits.

**Mandate** (ARCH-R28 §2 Group D row 2, `audits/ARCH-R28-seal-round.md:57`; the register's OPEN row 6, `REFERENCE-REGISTER.md:53`): **Captions C34 — the track-kind (with chips) vs element-type model decision**; owners S-spec 09 + 05 (the XMOCK-5 ruling ask, `audits/fleet-r25/xcut-shell-mocks.md:174`). Deliverable: the extraction + the analysis + the paste-ready ruling (model, exact data shape, spec amendment map, register flip text, riders).

---

## 1. The extraction — the law as it exists today

### 1.1 The ask, verbatim

- **Register row 6** (`REFERENCE-REGISTER.md:29`): "**Caption track system** (`kind:'caption'`, addCaption first-free-slot, CaptionInspector + computed CPS) · MOCK-ONLY · variants: `src/components/panels/CaptionInspector.tsx` + `src/lib/mockData.ts:12` (TrackKind) · store: `useUiStore.ts:1233-1239` (addCaption) · **9** (CaptionInspector.test) · 09 (TrackJSON kinds: overlay/main/audio — no caption; OT's teacher model: `SubtitleSegmentItem` as an ELEMENT type) · PROPOSAL (C34 — unadopted) · SPEC-WINS-UNADOPTED (the pending ruling is NAMED: the caption OPEN decision — track-kind vs element-type; XMOCK-5/D5)."
- **OPEN table** (`REFERENCE-REGISTER.md:53`): "09's shape ruling (caption TRACK kind with chips, or the element-level mapping + a registered deviation) is future work."
- **C-ledger** (`REFERENCE-REGISTER.md:65`): "C34 | Captions track kind + body field | row 6 | QUEUED."
- **XMOCK-5 acceptance** (`audits/fleet-r25/xcut-shell-mocks.md:174`): "09 rules the shape (track-kind adopted or the element-level mapping + registered deviation); 05/18 gain the rendering/inspector rows on the adopt path."
- "Chips" = the compact caption representation: **24px-high parchment chips** (`CAPTION_PARCHMENT = '#c1b59c'`, `Clip.tsx:52`) inside the 32px caption lane (`Clip.tsx:1147-1163`) — the timeline's per-caption render; plus the viewer's bottom-anchored burn-in chips (`Viewer.tsx:547-571`).

### 1.2 09's model today (the model owner)

- `SceneTracksJSON = { overlay: OverlayTrackJSON[]; main: VideoTrackJSON; audio: AudioTrackJSON[] }` — **three track families, no caption** (`09-project-model.md:119-123`; the singleton-`main` law at `:977`).
- `ElementJSON.type: 'video' | 'audio' | 'text' | 'image' | 'shape' | 'adjustment'` — **six element types; `'text'` EXISTS but carries NO body field** (no `text`/`params` on ElementJSON; `09-project-model.md:151-205`).
- The lineage: OpenCut-classic's teacher `src/types/timeline.ts` (508 LOC) has **ten** element types **including `SubtitleSegmentItem`** (`09-project-model.md:1988` — the register's "OT's teacher model" citation); the seed's adoption decision collapsed to 6 and **omitted the subtitle element** (`09-project-model.md:979-991`). The in-tree OT trim dropped it too (§1.3).
- 09's only other subtitle trace: none (grep caption/subtitle in 09 → the two §10/§8 citations only). The exporter's text-body read is a pre-ruling stand-in: `(el as any).params?.text || 'Text'` (`10-fcpxml-export.md:544`).

### 1.3 OT's types today (the track/element types the wire speaks)

- `TrackType = "video" | "text" | "audio" | "graphic" | "effect"` — **five kinds, no caption** (`opencut-timeline/src/lib/timeline/types/index.ts:47`; mirrored spec-side at `05-timeline.md:933`).
- `SceneTracks = { overlay: OverlayTrack[]; main: VideoTrack; audio: AudioTrack[] }` where `OverlayTrack = VideoTrack | TextTrack | GraphicTrack | EffectTrack` (`types/index.ts:102-120`).
- `TextElement { type: "text", hidden? }` — the element-level text payload on `TextTrack` (`types/index.ts:70-76`, `:207-210`); the 7-way element union has **no subtitle member** (`:231-238`). `RETIMABLE_ELEMENT_TYPES = ["video","audio"]` (`:257` — text is NOT retimable); `VISUAL_ELEMENT_TYPES` includes text (`:264-270`).
- The wire: `AddTrackCommand { type: 'addTrack', … }` → `engine.timeline.addTrack({type, index})` — the **kind param rides the union** (`15-wire-protocol.md:1076-1094`, `:359`).
- The FreeCut teacher (not in-tree) treated subtitles as **element-side cues**: "Subtitle cue partitioning at split point (`items-store.ts:525-556`)" (`06-nle-ops.md:484`, `:641`, `:2354`) — the split law partitions subtitle cues like clip content.

### 1.4 The mocks' implementation (the living, tested answer)

**The model the mock actually ships is the HYBRID: a caption TRACK kind whose elements are `type:'text'` with a `text` body field.**

| Surface | Evidence (file:line) | The law |
|---|---|---|
| Track kind | `shell-variants/src/lib/mockData.ts:12` — `TrackKind = 'overlay' \| 'main' \| 'audio' \| 'caption'` (R19, gap C34, registered in the candidates ledger) | The 4th kind; a "text-bearing lane that renders as caption chips + drives the captions inspector" |
| Element payload | `mockData.ts:73-74` — `text?: string` on ElementJSON ("R19 caption body"); caption elements are `type: 'text'` (`mockData.ts:245-250`, `useUiStore.ts:1604-1607`) | **No new element type** — the track carries semantics; the text element carries the body |
| Track fields | `mockData.ts:102` — `language?: string` (display-only tag); badge `CC` (`mockData.ts:242`) | Per-track language home |
| Placement | `timelinePlacement.ts:44` — `trackAcceptsElement('text') → overlay OR caption` | Caption lanes hold text elements (and nothing else) |
| Creation | `useUiStore.ts:1590-1609` — `addCaption(prevId)`: first-free-slot gap scan (frame-snapped, 1.5s default, no-overlap), one undoable `withHistory` entry | Captions are MINTED on the track, not pool-inserted (no caption routing in `insertPlan.ts` — grep-verified) |
| Chip render | `Clip.tsx:1147-1163` — 24px parchment chips, black 11px truncated `el.text ?? el.name`, 2px radius, centered in the 32px lane; the clip-box keeps the standard gesture grammar | "CAPTION CHIPS, not generic text clips (timeline-marker-transcript §2.5)" |
| Lane laws | `Timeline.tsx:755-783` — 32px lane (24px chip + 4px insets), exempt from the audio-focus 28px cap and from compact compaction (`useUiStore.ts:257-282`); height clamp min 32 (`useUiStore.ts:2093-2113`); compact strip lane 20px (`TimelineCompact.tsx:63-70`); dedicated lane tint (`Timeline.tsx:1190-1195`) | The chips' own height/exemption family |
| Track head | `TrackHeader.tsx:27,131-192` — CC badge in parchment identity, language-as-meta, "N captions" right-edge count, add-above/below routes `addTrack('caption')` ("Captions n") | The head rows |
| Inspector | `CaptionInspector.tsx:1-246` — editor (textarea → `setElementField(text)`, live char-count chip), In/Out routed through the REAL `moveElement`/`trimElement` (R25-F3 I5 — overlap law rejects, neighbor clamp), Use-Track-Style honest toast, Add New/Prev/Next (honest-disabled boundaries), list table (# / In-Out / Caption / **computed CPS** `round(chars/duration)`, `CaptionInspector.tsx:28`) | The reference's Subtitles sidebar converted to the embedded rail |
| Routing | `AppShell.tsx:270-271,366-369` — a single caption-track selection swaps the inspector for CaptionInspector (gated OFF on the color page, R25-F1-C5) | The selection-domain routing |
| Viewer burn-in | `Viewer.tsx:71-76` (`captionHitsAt` — ALL caption tracks, track order = language order), `:547-571` — bottom-anchored chips, second-language yellow styling; bilingual pairing is a TODO (`:551-553`) | The render consumer, mock-side |
| **Source resolution EXCLUDED** | `mockData.ts:353-363` — `elementAtTime` scans `['overlay','main']` ONLY: caption elements never feed the program monitor's clip resolution | Captions burn in; they never own the viewer's source window |
| Export | `exportJson.ts:57,81,150-163` — the interchange JSON round-trips `kind`, `language`, `text` verbatim (view state stays out) | The nle-interchange/1 precedent |
| Undo/ops | caption elements are ordinary elements for move/trim/split/delete/duplicate (the I5 re-pins prove the clamps); `type:'text'` pins in `useUiStore.test.ts:2213` | Full op-surface citizenship |

**Test pins (live read, battery line-start method):** `CaptionInspector.test.tsx` — **10 it-blocks** (lines 22/32/42/54/65/76/112/126/140/153; the register's census figure is **9** — the R25-F3 I5 re-pin added the In/Out routing pair; a count re-key rides the flip). Plus: `useUiStore.test.ts:2202-2218` (the addCaption gap-scan + undo pin), `mockData.test.ts:63-80` (the 5-caption fixture pins), `useUiStore.test.ts:402` ("the caption lane is the bottom track now"), `:1035-1046/:1519-1521` (kind arrays incl. caption), and the Clip/TrackHeader/Timeline/TimelineCompact/Viewer/AppShell caption rows.

**The reference** (the design source, Resolve-styled): `ui-mock/timeline-marker-transcript-withDialog.html` — the Subtitles inspector (§:184-231: In/Out TCs, char count, Use Track Style, Add New/Prev/Next, the #/In-Out/Caption/CPS table), the viewer's bilingual burn-in (`:144-152`), and **dedicated "Sub 1"/"Sub 2" TRACKS at the TOP of the lane stack — 32px lanes, 24px parchment chips — above V2/V1, audio at the bottom** (`:343-367` vs `:369-460`). One track per language.

### 1.5 The consumer surface today

- **Render (07):** a text render path EXISTS — `scene-builder` builds `TextNode` for `element.type === 'text'` (`07-composition.md:210`, `:1016`); `collectTextNode` emits the rendered text texture (`:1032`, `:1697`, `:1742`); the N1 v1 floor registers "text ops dest = full frame (no spatial transforms)" (`:20`). **Nothing caption-specific.**
- **Export (10/11):** FCPXML 1.10 HAS `<caption>` ("Caption/subtitle element", `10-fcpxml-export.md:121-122`) and `<title>` for text (`:134`, §4.6 `:526-560`); **§8's limitation list says verbatim: "❌ Subtitles/captions. FCPXML 1.10 has `<caption>` support, but our project model doesn't yet"** (`:797`) — the export hook is BLOCKED ON THIS RULING. The SRT↔FCPXML ecosystem exists (`:876`). 11's render pipeline has one `// ...subtitle handling...` placeholder (`11-cloud-render.md:1839`).
- **Persistence (09):** ProjectJSON/SceneJSON as §1.2 — no home for captions (the mock's flat `tracks[]` is the registered delta, `09-project-model.md:15`).
- **Deliver (18 §4.8):** the page's rows are presets/FCPXML/cloud-master/range-band (`18-ui-shell.md:221-223`) — **no captions row**. §4.10's sample project: "3 video clips + 1 text + 1 audio" (`:241-243`) — no captions (the mock's own fixture adds 5).
- **Keys (16):** zero caption rows (grep-verified). **00:** only the D35.4 pointer (`00-master-spec.md:463`).

---

## 2. The analysis — track-kind vs element-type

### 2.1 The SceneTracks SSOT (what a kind costs)

Adding `'caption'` is a **union extension at four sites**: OT's `TrackType` + `SceneTracks` (a `captions: CaptionTrack[]` family or an OverlayTrack member), the wire's `addTrack` kind param (`15-wire-protocol.md:1079-1092`), 09's `SceneTracksJSON`, and 05 §12.1's ordering law. The element-type alternative (a 7th `'subtitle'` member, the OpenCut-classic `SubtitleSegmentItem` path) moves the same number of unions — **the cost is symmetric; the difference is where the SEMANTICS live**, and every consumer below breaks the tie.

### 2.2 The timeline UX (the reference's answer)

The Resolve-styled reference ships **dedicated per-language Sub tracks** (§1.4) — one track per language, 32px chip lanes, a track-scoped inspector, "Use Track Style" (style follows the TRACK), a per-track language tag. The mock implements exactly this shape (chips, CC badge, language meta, CPS table scoped to the track's rows, `CaptionInspector.tsx:46`). The element-type model (subtitle elements loose on text tracks) has **no home for: the language tag, the track style, the chips lane, the per-track export file, or the inspector's scoping** — all five would need per-element fields that re-derive what a track is. **The element-type model loses on every UX surface the reference actually drew.**

### 2.3 The render pipeline

A caption element IS a text element (`type:'text'`) — the existing `TextNode` path (`07-composition.md:1016-1032`) is the painter, so the element-type half comes FREE under either model. The mock adds the decisive law: **captions never feed `elementAtTime`** (`mockData.ts:353-363`) — they burn in via a separate topmost overlay pass (`Viewer.tsx:547-571`), z-order ABOVE overlays in the composite while their LANE position is its own axis. A dedicated track kind is what makes that exclusion a one-line rule (a kind filter) instead of a per-element style decision.

### 2.4 The export (the SRT/ASS class)

SRT/ASS/VTT granularity is **one file per language** — the track-kind model maps a `CaptionTrackJSON` (with `language`) 1:1 to an export target; the element-type model must group elements by a re-derived key. FCPXML's `<caption>` rides a lane (`10-fcpxml-export.md:121-122`); §8's own blocker is the model, not the format (`:797`). The mock's interchange JSON already round-trips `kind/language/text` (`exportJson.ts:150-163`) — the shape is proven.

### 2.5 The A/V track model interplay (D32)

`linkedTo` (09 §3.1A B1) is the A/V-pair field; D32's fan-out (`06-nle-ops.md:407-433`) is video↔audio. **A caption track does not join the A/V pair family** — subtitle timing is authored against timeline time, not cut companions (the industry norm; the mock authors no caption links). The model PERMITS `linkedTo` on a caption element (nothing forbids it); the v1 caption surface (the inspector) simply doesn't author it. **Sync-lock (06 §6, track-level) participates unchanged** — a caption track carries `syncLock` like any track.

### 2.6 The mode matrix (D30)

Captions are **not an edit mode — zero port cost**. Element-level mode applicability is decided by ELEMENT TYPE, and captions are text: the timeline-shape families apply in full (move/trim/split/roll/ripple/slide/delete/duplicate — the mock's I5 pins are the executable proof: the overlap law REJECTS an overlapping move; the right-edge trim CLAMPS at the next caption's start, `CaptionInspector.test.tsx:112-138`), while the source-window families do NOT (slip/rate-stretch/fit-to-fill need a source extent; caption elements carry none — `RETIMABLE_ELEMENT_TYPES = ["video","audio"]`, `types/index.ts:257` — text's membership already covers captions). **The mode matrix needs no new rows; text's row decides.** Insert modes exclude captions by construction: captions are minted (`addCaption`'s gap scan), never pool-dropped (`insertPlan.ts` has zero caption routing — grep-verified).

### 2.7 The one open sub-decision — the LANE POSITION

The reference puts Sub 1/Sub 2 at the **TOP** of the stack (above V2/V1; `timeline-marker-transcript-withDialog.html:343-367`); the mock's fixture puts the caption lane at the **BOTTOM** (below A2: `mockData.ts:244-251`, `useUiStore.test.ts:402`) and its own `addTrack` default inserts a caption track **between main and audio** (`useUiStore.ts:2844-2846`) — three positions in one codebase; never ruled. The z-mirror coherence argument (05 §12.1's lane order mirrors composite z; captions paint topmost → lane topmost) + reference faithfulness decide: **TOP, above overlays**. Mock churn: the fixture reorder + the `addTrack` caption branch + ~5 mechanical re-pins (the kind arrays, `mockData.test.ts:63`, the focused-track read) — W4-wave-sized. Fallback (zero churn): keep the mock's bottom, registered as the deviation — rejected here because it contradicts the reference the corpus defers to AND the mirror law.

---

## 3. The recommendation — the paste-ready ruling

### 3.1 THE RULING (D-D2 at the fold; the seal round's D-number assigned at the fold)

**TRACK-KIND ADOPTED — the hybrid the mock proves:** a fourth `SceneTracksJSON` family, `captions: CaptionTrackJSON[]` (0..n, **one per language**), carrying **`type:'text'` elements with a `text` body field** (C34's "track kind + body field" — both halves). **NO new element type** — OpenCut-classic's `SubtitleSegmentItem` path is REJECTED for v1: the track carries the semantics (language, style, chips lane, export file, inspector scope); the text element carries the payload. The mock's model IS the ruled shape; its two deviations register: (a) the flat `tracks[]` persistence form (the standing registered delta), (b) the lane position (bottom → re-normalizes to top, §2.7).

### 3.2 The exact data shape (09 §3.1)

```ts
interface SceneTracksJSON {
  overlay: OverlayTrackJSON[];
  main: VideoTrackJSON;
  audio: AudioTrackJSON[];
  captions: CaptionTrackJSON[];   // (R28/D-D2) 0..n — one per language; renders as
                                  // the TOPMOST lane family (above overlays) and the
                                  // TOPMOST composite layer (the burn-in pass)
}

interface CaptionTrackJSON extends TrackJSON {
  language: string;              // BCP-47 tag ('en', 'fr'); display-only v1
                                  // (per-caption style overrides are engine-round)
}

// ElementJSON: type stays 'video'|'audio'|'text'|'image'|'shape'|'adjustment'
//   + text?: string  — the TEXT BODY (the caption body on caption tracks; the
//                      title body on overlay text elements). 10's exporter
//                      reads THIS field (retiring the `params?.text` stand-in).
```

**Laws riding the shape:** (1) a `type:'text'` element on a caption track is a caption; anywhere else it is a title — the TRACK decides (mock: `timelinePlacement.ts:44`). (2) Caption elements never feed program-monitor source resolution — they render only via the caption burn-in pass, z-above overlays (mock: `mockData.ts:353-363`, `Viewer.tsx:71-76`). (3) Lane order: captions top (§2.7). (4) Lane geometry: 32px (24px chip + 4px insets); compact strip 20px; exempt from compact compaction (mock: `Timeline.tsx:761`, `useUiStore.ts:257-282`, `:2110`, `TimelineCompact.tsx:66`). (5) Full op-surface citizenship; the source-window families (slip/rate-stretch/fit-to-fill) do not apply (§2.6). (6) `linkedTo` permitted-not-authored v1; sync-lock participates (§2.5). (7) Creation: the caption family (`addCaption`-class verb, first-free-slot, one undo entry) — never a pool insert mode. (8) CPS is COMPUTED `round(chars/duration)` — display-only (mock: `CaptionInspector.tsx:28`).

### 3.3 The spec amendment map (11 sites / 5 files)

| # | Site | The edit |
|---|---|---|
| 1 | **09 §3.1** | The schema block: `captions: CaptionTrackJSON[]` + `CaptionTrackJSON` + `ElementJSON.text` (§3.2 verbatim) |
| 2 | **09 §3.1A** | The ruling paragraph (C34's amendment entry — the A2/B1 pattern): the hybrid, the SubtitleSegmentItem rejection, the 8 laws |
| 3 | **05 §7.3** | The caption chip render row (24px parchment chips, `el.text ?? el.name`, 32px lane) beside the existing text `ClipLabel` |
| 4 | **05 §12.1** | The lane-ordering amendment: captions TOP (the z-mirror + reference ruling; the mock's bottom registers + re-normalizes) |
| 5 | **05 §12.2** | Track heights: caption 32px (+ the compact 20px row) |
| 6 | **18 §4.7** | The track-head rows: CC badge identity, language-as-meta, "N captions" count, the height-exemption + compact-exemption laws |
| 7 | **18 §4.4** | The CaptionInspector routing row (single caption selection swaps the inspector; the color-page gate; the CPS/char-count/Use-Track-Style/honest-boundary contract) |
| 8 | **10 §8** | The limitation row flips: "Subtitles/captions — the project model now HAS captions; `<caption>`/SRT/ASS export is r5-scheduled" (the blocker sentence retires) |
| 9 | **REFERENCE-REGISTER row 6** | The flip (§3.4) + the test-pin re-key 9→10 + the mock-home line re-key (`useUiStore.ts:1233-1239` → `:1590-1609` live) |
| 10 | **REFERENCE-REGISTER OPEN table** | The Captions C34 row → RULED (D-D2), the D35.4 pointer retires |
| 11 | **REFERENCE-Register C-ledger** | C34 QUEUED → **ADOPTED** (R28) |

*Optional riders (not counted; phase-tagged): 15 §13.15 gains the `addCaption` wire row at r1 (the verb census re-declares mechanically per D29-F8); 11's `// subtitle handling` row (burn-in vs soft-subs) rides r5's render round; 18 §4.10's sample project may grow the caption track (the mock's fixture is the reference).*

### 3.4 The register row flip text (paste-ready)

> \| 6 | **Caption track system** (`captions: CaptionTrackJSON[]`, per-language, `type:'text'` + `text` body; addCaption first-free-slot, CaptionInspector + computed CPS, chips) · **RULED R28 (D-D2)** | variants: `src/components/panels/CaptionInspector.tsx` + `src/lib/mockData.ts:12` (TrackKind) · store: `useUiStore.ts:1590-1609` (addCaption) | **10** (CaptionInspector.test — re-keyed; the R25-F3 I5 pair) | 09 §3.1/§3.1A (the law home) + 05 §7.3/§12.1/§12.2 + 18 §4.4/§4.7 | EXECUTABLE-WITNESS (the ruled shape's implementation evidence) | **LANDED-SPEC-R28** (track-kind ADOPTED — the mock's model; registered deviations: the flat `tracks[]` persistence form + the lane position re-normalization; OT's TrackType extension is r1) |

> OPEN table: \| **Captions C34** | row 6 | **RULED (R28 — D-D2: TRACK-KIND)** — the hybrid shape (caption track kind + `type:'text'` payload + `text` body field); 09 §3.1 the law home; the SubtitleSegmentItem element path rejected v1 \|

> C-ledger: \| C34 | Captions track kind + body field | row 6 | **ADOPTED — R28** (D-D2; 09 §3.1/§3.1A + 05 + 18 + 10 riders) \|

### 3.5 The riders — the mock's test pins as acceptance

1. **The 10 CaptionInspector pins** are the ruled surface's executable witness: the editor round-trip (`el.text` via `setElementField`), the computed-CPS law (26 chars / 35/24s → 18), the Add-New gap-scan, Prev/Next honest boundaries (AA8), **the I5 In/Out routing through the REAL `moveElement`/`trimElement`** (the overlap-reject + neighbor-clamp laws = caption elements' op-surface citizenship), the Use-Track-Style honest toast.
2. **The store pin:** `addCaption` inserts at the first free slot, one undo entry (`useUiStore.test.ts:2202-2218`).
3. **The fixture pins:** 5 text elements with frame-clean timings + bodies on the caption track (`mockData.test.ts:63-80`).
4. **The re-keys:** the register's row-6 count 9→10; the mock-home store lines re-keyed to live; the lane-position re-pins if §2.7's top ruling lands in the mock (the kind arrays + the focused-track read + the fixture reorder).
5. **battery_r28 check:** 09's §3.1 block contains `captions:`; the register row carries RULED; the OPEN table's Captions row is gone/flipped; the C-ledger C34 = ADOPTED.

---

## 4. Criteria + conflict count

**Criteria (in priority order):** (1) **the consumer surfaces decide** — export granularity (file-per-language), the track-scoped inspector/style/language, the burn-in pass's kind-level exclusion all require a TRACK; (2) **the reference is the design source** — it drew dedicated per-language Sub tracks with chips; (3) **the tested implementation already answers** — 10+ live pins over the hybrid shape, zero pins over the pure-element shape; (4) **one union, no churn** — the element-type union stays at 6 (`'text'` suffices as payload); the track union grows one family exactly once, at the model's one home.

**Conflict count: 3** — (C-a) the lane position (reference top vs mock bottom vs mock addTrack mid-stack: ruled TOP, §2.7); (C-b) the mock's flat `tracks[]` persistence form vs the spec's nested `SceneTracksJSON` (the standing registered delta, unchanged by this ruling); (C-c) the register's stale census figures (9 pins / store lines) vs live (10 / :1590-1609) — re-keyed by the flip. **No engine-world conflict: nothing in nle-engine/OT/wire contradicts the ruling; the OT TrackType extension is r1-scheduled and additive.**

— end of report —

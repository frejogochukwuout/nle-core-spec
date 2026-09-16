# test-law-d48-d50 — the R28 T2-c spec-side test law (markers v2 · captions · the five pages + the plan's test-track carve + the SIGNOFF re-stamp)

**Task ID:** R28-T2-c · **Agent:** test-law DESIGN agent (spec-side) · **Date:** 2026-09-16
**Tree (read-only, main):** `nle-core-spec` @ `980920b`; witness trees read for oracle grounding: `nle-test-app` @ `85cff80` (sceneBridge markers :375/:557), `ui-mock/shell-variants` (useUiStore `removeMarkersAt` :1982-1987 · mockData `elementAtTime` :353-363).
**Inputs:** `test-scout-app-ui-mocks.md` (T1-c — §2.1 the completeness machine-check, §2.2 the DOM-attribute contract, §4.8 the two-tier VLM net, §5 the applicability map) · `test-audit-coverage.md` (T1-d — §2's D48/D49/D50 minimal statements, §3 the cross-cuts, §4 the signoff disposition, §5 the ranked fixes) · `ARCH-R28-seal-round.md` §4 D48/D49/D50 + §4.1 addenda (the ruled law) · the landed law sites: 16:342/:351 (⇧M start-match + the delete law), 05:722 (scene-shrink), 10:586-619 (per-scene marker export), 15:1092-1110 (addTrack 'caption'+language), 10:544-548 (ElementJSON.text), 18:4 (v1.8 bump), 16:365-379 (the five-page law).
**Mission:** design the COMPLETE test law for the three design-round areas + the plan's test-track carve + the SIGNOFF re-stamp. Spec-side design — it lands in the corpus at W6 (12/17 + the owning `## Testing` sections) and in `IMPLEMENTATION-PLAN.md`; it is NOT test code. Every pin below names its tier (T1 model / T2 seam / T3 UI / battery), its demonstrated-pattern oracle (T1-c §2/§4 + T1-a's engine library), and its phase+owner.

**The design's three grounding laws** (from the scouts; every area below instantiates them):
1. **The completeness machine-check** (T1-c §2.1): closed sets are consumed as LIVE imports from the one home, accumulated through the real mounted surface, closed by direct array diffs that NAME the drifted member (`missing`/`stale` both `[]` + the size identity) — never a hand-mirrored copy (the RC-V1 stale-mirror incident is the canonical failure). Declaration-order/LIFO words are copied verbatim into the spec-side law (fail-loud or the first refactor neuters the gate).
2. **The DOM-attribute rendering contract** (T1-c §2.2): where jsdom has no raster/layout, the rendering law is asserted through attribute- or string-level contract surfaces (`data-ops`/`data-filters`/`data-grade`, joined filter strings, aria-labels, the ghost's `style.left`). "The ops' filter strings ARE the preview contract" is portable spec-law prose.
3. **The two-tier visual net with exit gates** (T1-c §4.8): VLM story net at the registered 1280×800 floor + console-clean mounts + battery zero-error + fresh 0-P1-0-P2 probes before WRAP; reserved for the layout/legibility class the jsdom battery cannot see; BOTH collector figures recorded (runner vs line-start — the 1,950/1,939 reconciliation law).

Plus the engine-scout oracles this design reuses: **HAND-DERIVED ORACLE** (every expected number derived from the documented formula), **TABLE-LOOP** with dynamic registration, **REFERENTIAL-IDENTITY no-commit trio** (`expect(data).toBe(before)` + canUndo unchanged — the strongest "nothing happened"), **REGRESSION-PIN-per-named-law**, **the benign-family discrimination** (ok:true non-mutations never counted as refusals — D44's benign-echo sibling pattern).

---

## §1 D48 — the marker v2 subset (duration+notes; keyword REJECTED; clip markers re-queued r5)

**The ruled law being tested** (ARCH-R28 §4 D48 + §4.1 D48 addenda): `Marker {id, time, label?, color?, duration?, notes?}` per scene — one family, point/range by `duration` (absent = point; `end = time + duration`, ≥1 frame, ≤ scene duration); `notes` owns OT's `Bookmark.note`, `label` is doc-side-synthesized (D48/F1 — the `id` pattern); the scene-shrink keep-and-display-clamp (05:722 — "only marker writes clamp"); ⇧M deletes by START-match ±1 frame, strictly-inside-span deletes nothing (16:342+351, the mock's `removeMarkersAt` witness useUiStore.ts:1982-1987); the per-scene export read with duration/note attrs (10:586-619); keyword REJECTED (no OT home, no consumer — the ~3-pin mock churn registered in register row 5's deviation text); clip markers re-queued r5-entry as ONE field+re-offset-laws bundle (C33b's acceptance pins; the C35 precedent's STRONGER form).

### 1.1 Test surface (where the pins live, by tier)

| Tier | Surface | The law it owns |
|---|---|---|
| T1 model | 09 §3.1A's `Marker` zod + the SceneJSON ⇄ store round-trip (the mock's `useUiStore` marker family; the app's `sceneBridge.ts:375/:557` once widened) | (a) duration validation + the notes/label field law |
| T1 model | the scene-shrink path (any write that shortens `SceneJSON.duration`) | (b) keep-and-display-clamp |
| T3 UI | ⇧M through the real mounted shell (the wire-coverage grammar; the mock's `useShortcuts` twin) | (c) the START-match delete law |
| T2 seam | the FCPXML generator's `buildMarkers` (10:586-619) | (d) the export row |
| register | REFERENCE-REGISTER row 5's deviation text | (e) the keyword registered-deviation |
| r5 bundle | `ElementJSON.markers` + `insertPlan` (C33b) | (f) the clip-marker acceptance bundle |

### 1.2 Fixtures

- **`marker-v2-grid`** (the canonical fixture, 17 §5 registration): one scene @ 24 fps (1 frame = 5000 ticks), duration 10 s, carrying the six-marker ladder — point@1s; range{1 frame}@2s; range{2s→4s}@2s; range ending exactly at scene tail; range whose stored end exceeds the CURRENT scene tail (the shrink-state fixture); point+notes+label@7s. Every time/duration on the frame grid (the fixture frame-clean discipline, mockData.test's law). Hand-derived expectations: `end` figures computed from `time + duration` in the test, never read back from the module (the anti-tautology law).
- **`scene-shrink`**: the grid fixture + a duration write to 3 s (drops under the 2s→4s range's end and the tail-ending range).
- **The ⇧M playhead ladder**: playhead positions {start-exact, start+1 frame, start−1 frame, start+2 frames (inside span), mid-span, end-of-span} over one range marker — six rows, one table-loop.
- **The export clip window**: a two-clip scene so `markersInClip` filter rows exist (marker before/at/after each clip boundary — `m.time >= clipStart && m.time < clipEnd`).

### 1.3 Oracle instantiation (the demonstrated pattern each pin family copies)

- **(a) duration validation → the TABLE-LOOP + hand-derived oracle** (the engine's locked-track 38-row table pattern): rows {absent → point; `null` → point (the mock's null→point law, useUiStore.ts:1534-1549); `< 1 frame` → rejected INVALID_PARAMS (or normalized-up per the mock's ≥1/24 grid — the W6 model-fold picks ONE and the row pins it); `= 1 frame` → valid; `end > sceneDuration` at WRITE → clamped to tail (write-clamp ≠ shrink-clamp: 05:722's "only marker writes clamp"); `end == sceneDuration` → valid}. Expected `end` values derived in-test from the documented formula.
- **(a) notes/label → the D2e field-law round-trip** (the parity-twin pattern): serialize `Marker{notes:'N', label:'L'}` → the OT-bound payload carries `Bookmark.note === 'N'` and **NO label field** (doc-side-synthesized — the `id` pattern: like `id`, `label` never crosses); deserialize back → `notes` preserved byte-equal, `label` re-synthesized (or absent — the W6 fold picks the synthesis site and the row pins it). Both directions asserted (the sceneBridge :375 forward + :557 backward sites — **the bridge is the named assertion site**, per T1-c §5's D48 row: the bridge currently DROPS `duration` both directions, so the widened bridge's forward AND backward duration mapping is the app-tier half of this same pin).
- **(b) scene-shrink → the REGRESSION-PIN + referential-identity no-commit trio**: shrink to 3 s → the marker array is referentially UNCHANGED (`markers` length + ids + stored `duration` toBe-before); the DISPLAY range (the ruler band's clamped end) reads `min(end, sceneDuration)`; re-grow to 10 s → the full band returns (the clamp is computed at read, never written). The "never a delete trigger" half is the no-commit trio: no history entry mints for the shrink-with-markers path beyond the shrink's own single entry.
- **(c) ⇧M → the two-sided window table + the no-commit trio**: the six-row ladder — {start-exact deletes; ±1 frame deletes (the mock's `Math.abs(m.time − snapToFrame(time)) > 1/24` filter is the design-of-record witness); start+2 frames (strictly inside span) deletes NOTHING; mid-span nothing; end-of-span nothing}. The nothing-rows assert the trio (`markers` referentially equal + `past` length unchanged + canUndo unchanged — the mock's own `if (sc.markers.length === before) return; // nothing removed — no history entry` law pinned spec-side). Plus the id-addressed remove (the inspector's Remove button / `removeMarker{id}`) deletes a range marker regardless of playhead — the two delete grammars stay two laws.
- **(d) export → the string-law oracle** (the `buildElementFilterString` precedent: canonical form, presence/absence): the generated `<marker>` string asserted attr-by-attr — `start` RELATIVE to the clip's local timeline (`m.time − clipStart`, hand-derived); range → the REAL `duration` attr; point → the one-frame form; `note` attr present IFF `notes` present (#IMPLIED semantics); `value` keeps `label`. Plus the per-scene read pin: the generator reads `ctx.project.scenes.find(currentSceneId).markers` — a **negative pin** that the retired `ctx.project.markers` project-global read cannot reappear (a source-level assertion, the AA5_SITES pattern: read the generator source, assert the anchor).
- **(e) keyword → the REGISTERED-DEVIATION shape** (not a behavior pin): the spec-side law states keyword has NO OT home, NO consumer, NO export attr — the mock keeps its field and its **~3 pins as mock-law only** (register row 5's deviation text names the churn figure). The test law is the registration itself: the battery asserts the deviation text carries the churn figure (§1.6), so a future round re-derives the disposition instead of re-litigating it. Cross-model drift on `keyword` is explicitly OUT of scope — the honest-limit law (T1-c §6.1) recorded as spec prose.
- **(f) the r5 bundle → the bundle-acceptance gate** (one gate, two halves, landing together — the C35 precedent's STRONGER form): the field (`ElementJSON.markers`) NEVER lands ahead of the re-offset laws (split/trim corrupt offsets on a bare field). Acceptance = C33b's enumerated pins as ONE work order.

### 1.4 Acceptance pins (the named rows that land in 17 §3.1 + §13A.7 + the owning `## Testing` sections)

1. `marker-v2-point-range-family` (T1): the validation table above.
2. `marker-notes-owns-note-round-trip` (T1+T2): the D2e field law, both bridge directions.
3. `marker-label-doc-side-synthesized` (T1): label never in the OT payload; re-synthesized on import.
4. `marker-bridge-duration-round-trip` (T2, app tier): sceneBridge :375/:557 carry `duration` forward AND backward (the drift gate closes the fleet-r23 hole).
5. `scene-shrink-keeps-marker-clamps-display` (T1): the keep-and-display-clamp + the re-grow restoration.
6. `shift-m-start-match-delete` (T3): the six-row window table.
7. `shift-m-inside-span-is-noop` (T3): the no-commit trio rows.
8. `remove-marker-by-id-playhead-independent` (T3): the id-addressed grammar.
9. `fcpxml-marker-per-scene-read` (T2): the current-scene read + the negative source pin.
10. `fcpxml-marker-duration-note-attrs` (T2): the string-law rows (range real duration / point one-frame / note iff notes / value=label).
11. `keyword-rejected-registered-deviation` (register): the deviation text carries the ~3-pin churn.
12. `clip-markers-r5-bundle` (r5, registered): **the 4 Clip.test pins** (the mock's Clip marker family — add/remove/at-playhead/navigate, re-keyed onto `ElementJSON.markers`) **+ the insertPlan re-offset laws** (markers before/at/after a split point land in the correct halves; trim head/tail re-offset the carried markers; one history entry per op).

**Pin count estimate: ~30** (≈ 20 near-term at the W6 model-fold + the r1 wire-surface riders; ≈ 10 registered r5 in the C33b bundle).

### 1.5 Phase + owner

- **The model-fold prereqs (W6 delta sweep, owner S-spec — the coverage audit's §5 item 5):** 09:286-292/:335 (the `Marker` interface + A2 text + zod widening), 15:1566-1600 (§4.3.49-51 params gain `duration?`/`notes?`; the stale `type?` field dispositioned), 18 §4.4 (the marker-inspector rail swap + the v2 field set). These BLOCK pins 1-4, 6-8 — the test law names them as the prereq gate.
- **Pins 1-5, 9-11: land with the W6 fold** (the S-spec(6) row's first wave — the facet rows + the owning `## Testing` rows in 05 §11.1/09/10 §4.7/16 §3.7/18 §4.4).
- **Pins 6-8's wire surface: rides the r1 union bump if the model fold lands there** (the `updateMarker` `Partial<Marker>` payload — zero new verbs, 15 §4.3.49's existing family); the keymap rows ride 16's K3 corpus (16:342's own text).
- **Pin 12: r5-entry, owner S-ot + S-package** (the registered phase — the register row 5 deviation text + the plan's r5 rows), acceptance = the bundle's two halves green TOGETHER.

### 1.6 Battery check (battery_r28 class)

- **The step-0 facet class** (this design's new battery class, §4.5): 17 §3.1 + §13A.7 carry the D48 marker rows (substring/anchor scrape — `marker` + `duration` + `notes` present in §13A.7's D48 facet row; §3.1's marker row re-keyed from point-era to "point + range v2").
- **The model-fold prereq discriminator** (same class's prereq leg): 09 §3.1A's Marker interface text carries `duration?` + `notes?`; 15 §4.3.49-51's params carry them; 16 Appendix C's marker row re-keys 5 → the v2 enumeration set (the coverage audit's P3 item 14).
- **The register deviation leg:** row 5's deviation text carries the `~3-pin` keyword churn figure + the C33b bundle citation (substring check — the registered-deviation law is machine-checked, not prose trust).

---

## §2 D49 — the captions track-kind hybrid

**The ruled law being tested** (ARCH-R28 §4 D49 + §4.1 addenda): `SceneTracksJSON.captions: CaptionTrackJSON[]` (0..n, one per language, BCP-47) carrying `type:'text'` elements with a first-class `text` body (`ElementJSON.text` — 10:544-548, the `params?.text` stand-in retires); `addTrack` gains the `'caption'` kind + `language?` (15:1092-1110); one-track-per-language is DESCRIPTIVE v1 — addTrack does NOT reject a duplicate; export merges deterministically; enforced uniqueness registered to r5 (D49/F1); the burn-in exclusion — `elementAtTime` scans `['overlay','main']` only (the one-line kind filter, mockData.ts:353-363); the lane position is TOP / the topmost visual layer via the burn-in pass (TextNode is the r5 vehicle); SRT/ASS/VTT file-per-language is r5-forward.

### 2.1 Test surface

| Tier | Surface | The law it owns |
|---|---|---|
| T1 model | 09 §3.1's `SceneTracksJSON.captions` + `ElementJSON.text` + the zod family | (c) the text round-trip |
| T2 seam | 15 §4.3.22's `AddTrackCommand` (the wire row) + the OT `addTrack` machinery at r1 | (a) the kind+language law |
| T2 seam | `elementAtTime` / the ops pipeline's kind filter (app: ProgramCanvas's ops source; mock: mockData.ts:353) | (b) the burn-in exclusion |
| T2/T3 | the track-order law + the Viewer burn-in pass (mock: Viewer.tsx:71-76/:547-571 `captionHitsAt`) | (d) the z-mirror |
| T2 seam | 10's title/text export path | (c)'s export half |
| register | row 6's flip text (the FULL OT r1 cost) | (f) the acceptance set |

### 2.2 Fixtures

- **`caption-bilingual`**: one scene, two caption tracks (`en`, `fr`) each carrying frame-clean text elements (the mock's 5-element/`language:'en'`/CC-badge fixture law, mockData.test.ts:63-80, re-normalized by its own suite); plus one `overlay` and one `main` video element at overlapping times — the exclusion fixture.
- **The duplicate-language fixture**: a third `addTrack {type:'caption', language:'en'}` applied to it (the DESCRIPTIVE law's trigger).
- **The z-order fixture**: caption + overlay + main elements at the SAME time (the topmost-visual probe).
- **BCP-47 grid**: `{'en', 'fr-CA', 'zh-Hans', 'x-invalid-tag!!', absent}` — valid rows pass; the malformed row's disposition (reject vs default) pinned by the W6 fold.

### 2.3 Oracle instantiation

- **(a) the kind+language law → the validation table + the benign-family discrimination**: `addTrack {type:'caption', language:'en'}` → a track minted (kind union `'video'|'text'|'audio'|'graphic'|'effect'|'caption'` — the six-kind pin, tsc-lockstep both directions on the union); malformed BCP-47 → the W6-folded disposition; **the duplicate-language row asserts `ok:true` + a SECOND track minted** — the DESCRIPTIVE law is a *benign non-rejection*, never a silent swallow: the response carries the new track id; the family is asserted as the D44 benign-echo sibling (an `ok:true` that IS a mutation — distinct from the echo family's non-mutations; the test law says which side of that line it sits on). **The export-merge determinism pin**: two `en` tracks → the export output is byte-stable across runs (sorted by time, then track index — the merge key registered by the W6 fold; a determinism oracle, hand-derived expected order). **The r5 enforcement registration**: the flip duplicate→reject at r5 is a REGISTERED behavior change (register row 6 + 15:1102's comment) — the spec-side row states it so the r5 port's work order carries the migration note, and the v1 pin is marked with the r5 reversal condition.
- **(b) the burn-in exclusion → the two-sided pin (presence AND absence — the dormancy fence pattern)**: the ABSENCE half — `elementAtTime(scene, t)` returns the `overlay`/`main` hit with caption elements present at `t`; the ops COUNT is unchanged by adding caption elements (the DOM-attribute form: `data-ops={N}` stays N — "the ops' filter strings ARE the preview contract" instantiated as the caption-exclusion law); the PRESENCE half — the same `t` yields the burn-in hit (`captionHitsAt`-class read: the chip's text + language badge). Both halves in ONE table row per time position — the whole rendering contract is "participates in burn-in, NEVER in the composition ops", pinned as one law, both venues.
- **(c) the text round-trip → the parity-twin + the negative stand-in pin**: `ElementJSON.text` round-trips through SceneJSON ⇄ OT `TextElement` byte-equal; the serialized form carries **NO `params.text`** (the stand-in retired — a negative pin on the serialized shape); the export reads `el.text || 'Text'` (10:544's law — the title element's `<text>` content asserted against the fixture's body).
- **(d) the z-mirror → the ordering oracle** (the fixture re-normalization pattern): the `captions` family sits ABOVE `overlay` in the track order (05 §12.1's order law); the burn-in pass paints ABOVE the composed program image (the DOM/z-order contract: the burn-in layer's paint order after the grade final pass — asserted at whatever attribute/DOM-order surface the W6 fold registers, per grounding law 2). The mock's bottom-lane fixture re-normalizes TOP (the one churn item — the register's own note).
- **(e) SRT/ASS/VTT → the registration row** (r5-forward): the file-per-language granularity is the RATIONALE the track-kind exists for; v1 pins only the merge-determinism half (above). The spec-side row records the rationale so the r5 export corpus's shape is pre-ruled (one file per language — the acceptance key already fixed).
- **(f) the OT r1 cost acceptance set → the enumerated cold-executable gate** (register row 6's flip text): the r1 port's widening is accepted ONLY when all four cost items carry pins: (1) **TrackType** — the six-kind union live in OT's type; (2) **SceneTracks.captions** — the family serializes/deserializes; (3) **the `TextElement` body field** — `text` first-class OT-side; (4) **the addTrack machinery branches** — the `'caption'` kind + `language` param route through the real `addTrack` (the carried engine-truth assertion: the track EXISTS after the call, not just `ok:true`).

### 2.4 Acceptance pins

1. `caption-track-kind-union-six` (T1/T2): the TrackType pin, tsc-lockstep.
2. `addtrack-caption-language-bcp47` (T2): the validation grid.
3. `addtrack-duplicate-language-descriptive-no-reject` (T2): `ok:true` + second track + the r5 reversal registered.
4. `caption-export-merge-deterministic` (T2): byte-stable merge, the registered key.
5. `captions-excluded-from-elementattime` (T2): the absence half + `data-ops` invariance.
6. `captions-present-in-burnin` (T2/T3): the presence half (chip text + language badge).
7. `caption-burnin-duality-one-law` (T2): the two-sided table row (the fence).
8. `elementjson-text-round-trip` (T1): byte-equal both directions.
9. `params-text-stand-in-retired` (T1, negative): the serialized shape.
10. `fcpxml-title-text-reads-el-text` (T2): the export half.
11. `caption-lane-topmost-z-mirror` (T2/T3): the order + paint law.
12. `caption-ot-r1-cost-set` (r1, the four-item acceptance).

**Pin count estimate: ~24** (≈ 12 near-term at W6 + the r1 seam set; ≈ 4 the r5 SRT/ASS/VTT corpus registration; ≈ 8 the r1 OT cost pins).

### 2.5 Phase + owner

- **Prereqs (W6, owner S-spec):** 09:119-124 (the `captions` family in SceneTracksJSON + `ElementJSON.text`), 10:811 (the §8.1 blocker flip), 18 §4.4/§4.7 (the inspector + track-head), 05 §7.3/§12.1/§12.2 (chips/order/heights). Block pins 1-2, 5-11.
- **Pins 1-11: the W6 fold + 17's facet row** (S-spec(6)); the burn-in/exclusion pins are mock-backed NOW (the 10 live register-side pins + the elementAtTime law) — the spec rows mirror them with the two-sided shape.
- **Pin 12 (the OT rows): r1, owner S-ot** — the register flip's stated cost; lands with the r1 port's Stage ladder (the plan's S-ot row).
- **The export corpus: r5, owner S-app** (the FCPXML fixture corpus row's window) + the SRT/ASS/VTT rationale pre-ruled.

### 2.6 Battery check

- **The step-0 facet class:** 17 §3.1 + §13A.7 carry the caption row (substring: `caption` + `language` + `burn-in`).
- **The register cost leg:** row 6's flip text carries the four-item enumeration (TrackType + SceneTracks.captions + TextElement body + addTrack machinery — substring check) so the r1 work order is verifiable cold.
- **The wire-row leg:** 15 §4.3.22's `AddTrackCommand` carries `'caption'` + `language?` + the DESCRIPTIVE comment (the stale-`'video'|'audio'|'overlay'` comment cannot reappear — negative substring).

---

## §3 D50 — the five pages (Edit/Color/Audio/FX/Deliver; Audio = focus mode; FX = fifth page)

**The ruled law being tested** (ARCH-R28 §4 D50 + §4.1 addenda + 16:365-379 + 18:4): five pages — Edit/Color/Audio/FX/Deliver; Audio = a focus mode (⌘4 toggle, re-click/Esc exits — a Page-union member whose activation grammar is a toggle); FX = the fifth page per the one-flag law (⌘5; `fxMode` written ONLY by `setTool` and `setPage` — two doors, one engine); the fx density exemption keys `page === 'fx'` (NOT `fxMode` — the Edit-page FX tool keeps the Edit page's compact entry); the per-page view-state memory (`pageTimelineView: Record<Page, PageTimelineView>`); the ⌘-number namespace belongs to the page law UNCONDITIONALLY (the three-claimant resolution: 16 §3.11's color-panel set and §5.4's track-focus set RULED OUT; §6.1 row 11 is the ruling row); the nle-ui FX-page absorption + the app's page-key tests ride XMOCK-6's r5/K3 impl half (the DECISION closed; the IMPL window registered — D50/F6).

### 3.1 Test surface

| Tier | Surface | The law it owns |
|---|---|---|
| T1 store | the `Page` union + `page` + `fxMode` + `pageTimelineView` (mock useUiStore :563-567/:748/:1249-1252; the nle-ui twin) | (a) the closed set, (b) the toggle, (c) the exemption key, (d) the memory |
| T3 UI | the real mounted shell's dock + keymap dispatch (the wire-coverage grammar; AppDock.tsx:57-60's toggle) | (a)/(b) driven |
| T3 UI | the keymap twin (shortcutMap.test + useShortcuts.test.tsx — the pages-audio-focus-escape family) | (f) the ⌘1-⌘5 coherence |
| corpus | 16 Appendix A (182 rows) + 08:2168/04:2293/16:417/16:621 (the claimant rows) + 18 §4.8/:41 | (e)/(f) the corpus coherence |
| r5/K3 | the nle-ui FX-page absorption + the app page-key suite | (e) the registered impl half |

### 3.2 Fixtures

- **The page-boot grid**: `boot({page})` for each of the five keys (the mock's ColorInspector boot grammar — `useUi.setState` pre-state), plus the `fxMode × page` cross product (`{page:'fx', fxMode:true}`, `{page:'edit', fxMode:true}` — the FX tool on the Edit page, the discriminator's decisive cell).
- **The view-state ladder**: per-page zoom/scroll states seeded distinct (pageTimelineView seeded per page); the switch-around sequence ⌘1→⌘2→⌘1.
- **The claimant probe set**: ⌘6-⌘9 (reserved), `1`-`9` no-modifier (effect presets — stay), ⌘1-⌘5 (pages).

### 3.3 Oracle instantiation

- **(a) the page-key family → THE COMPLETENESS MACHINE-CHECK** (the flagship pattern instantiated verbatim, grounding law 1): a **module-scope accumulator** unioned in afterEach over every test that drives a page surface (the 5 keymap dispatches `⌘1`-`⌘5` as real KeyboardEvents through the mounted shell + the dock's 5 button clicks + the Audio re-click toggle + the Esc exit); the **LIFO law's fail-loud words copied into the spec-side law** (the union reads null and the gate fails MISSING if the ordering flips — never silently green); the gate = the direct array diffs against the **LIVE-imported `Page` union** (never a hand-mirrored five-string copy — the RC-V1 stale-mirror incident is cited in the law's own text): `missing` ⊓ `stale` both `[]` + the size identity `ACCUMULATED.size === Page union size` (5). **The Audio duality's BOTH-families law** (T1-c §5's D50 row): the closed-set gate proves MEMBERSHIP; the toggle grammar needs its own family — `page === 'audio'` is a valid Page value (the page-keyed store laws) AND activation is a TOGGLE (the activation-grammar laws) — the spec row states both families exist and neither substitutes for the other.
- **(b) the Audio focus-mode toggle → the state-machine pin** (the JKL/Esc-ladder pattern): ⌘4 enters (page='audio'); ⌘4 again exits to Edit (the dock tab is a TOGGLE — AppDock.tsx:57-60's law); Esc exits (its ladder rung ordered before panel-level escapes — the Esc-ladder family row); the mode duality asserted both ways (enter-from-every-page × exit-to-Edit).
- **(c) the fx density exemption → THE DISCRIMINATOR PIN** (the two-doors-one-key law): with `page==='fx'` → the FULL-Timeline density exemption applies (the ViewOptionsPopover DOM-ABSENCE law — `queryByTestId('shell-view-options')` null, the registered surface); with `fxMode===true` but `page==='edit'` (the FX tool armed on Edit) → NO exemption (the popover present, the compact entry stays). The pin's law sentence: **the density exemption reads the page key only — `fxMode` is written by both doors but read by neither the density nor any other page-scoped surface** (the one-flag law's read-side half).
- **(d) the per-page view-state memory → the seeded-Record oracle**: the switch-around sequence asserts each page's view state survives the round trip (zoom/scroll values referentially restored per key); a write on one page never bleeds to another (the isolation row).
- **(e) the XMOCK-6 impl half → the REGISTERED IMPL-half shape**: the facet rows land NOW (17 §13A.6/§13A.7 — the gate can key on them); the impl (nle-ui's FX-page absorption: the 4-page union + FX = 5; the app-side page-key suite) rides r5/K3 with the acceptance = **the app-side page-key suite green + the completeness gate closing at 5/5** — the register row 7/8 flip texts keep DECISION-closed vs IMPL-half distinct (16:28's own registration).
- **(f) the 16-side dispatch coherence → the keymap TWIN CONTRACT** (three gates, one law — the doc-map integrity + family coverage + behavioral twin): (i) 16 Appendix A's five page rows render verbatim in the cheat sheet (doc-map integrity: unique action ids, declared groups, keys+desc); (ii) the **pages-audio-focus-escape family list** enumerates the five switches + the toggle + the Esc exits (a binding added to the hook without a doc row fails the family list); (iii) the behavioral twin fires real KeyboardEvents and asserts the store's `page` reaction. **The three-claimant resolution pins**: ⌘1-⌘5 dispatch to page switches ONLY — the ruled-out claimants asserted INERT (⌘1-⌘9 never open color-grading panels [08:2168's row re-keyed]; never focus tracks [16:621]); ⌘6-⌘9 reserved (no dispatch, registered-reserved); effect presets stay `1`-`9` NO-modifier. The corpus coherence is battery-checked (§3.6), the behavior is twin-checked.

### 3.4 Acceptance pins

1. `page-union-completeness-gate` (T3): the accumulator + array-diff gate + size identity, LIVE-imported union.
2. `page-dock-five-buttons-driven` (T3): the dock leg of the accumulator.
3. `cmd-1-through-5-dispatch-pages` (T3): the keymap leg (the behavioral twin).
4. `audio-focus-toggle-re-click-exits` (T3): the toggle grammar.
5. `audio-focus-esc-exits-ladder-rung` (T3): the Esc family.
6. `audio-page-mode-duality-both-families` (T1/T3): membership + activation, neither substituting.
7. `fx-density-exemption-keys-page-not-fxmode` (T3): THE discriminator pin (the cross-product's decisive cell).
8. `fx-tool-on-edit-keeps-compact-entry` (T3): the negative half.
9. `per-page-view-state-memory` (T1): the seeded-Record round trip + isolation.
10. `cmd-6-through-9-reserved-inert` (T3): the reserved namespace.
11. `keymap-page-rows-verbatim-appendix-a` (corpus/twin): the doc-map integrity leg.
12. `pages-audio-focus-escape-family-coverage` (twin): the family list leg.
13. `three-claimant-resolution-inert-claimants` (T3 + corpus): the ruled-out sets never dispatch.

**Pin count estimate: ~30** (≈ 6 near-term corpus/facet rows at W6 [7's prereq flips, 11-13's corpus re-keys]; ≈ 24 the K3/r5 suite — the registered IMPL half).

### 3.5 Phase + owner

- **Prereqs (W6, owner S-spec):** 18 §4.8's body + :41 re-key to the five-page ruling (the v1.8 header announced it; the body still carries the three-page OPEN registration); 08:2168 + 04:2293's ruled-out rows re-keyed; 16:417/:621 re-homed/registered (the three missed 16-sites, per the D50 addendum).
- **Pins 11-13 + the facet rows: the W6 fold** (S-spec(6)); the corpus coherence is battery-checked immediately.
- **Pins 1-10, 12's twin legs: r5/K3, owner S-package (the nle-ui absorption) + S-app (the app-side page-key suite)** — XMOCK-6's registered impl half; the plan's K3 gate cites the facet rows as the acceptance key (16:28's own text: "Remaining at K3: the app-side page-key tests + the nle-ui FX-page absorption").

### 3.6 Battery check

- **The site-19 OPEN-table class** (one of the audit's five named classes): the register's round-final state — rows 5-8 closed via D48/D49/D50 → **0 open design rows**; the class asserts the four closed dispositions + the A3 RULED row.
- **The 182-row keymap coherence class** (this design's addition): 16 Appendix A's footer count ≡ 16 §16's matrix header ≡ 16 §0's census (182 across the three sites); 15 §13.5's `181` pinned as the KNOWN-STALE citation (flagged, not failed — its repair rides the W6 cross-file sweep; the flag's repair is then verifiable).
- **The ruled-out-claimant negative class** (this design's addition): 08:2168's `keyboard-cmd-1-through-9-switches-color-grading-panel` row and 04:2293's twin must carry the RULED-OUT/resolved wording (the resolved-form substring present; the bare claimant form absent) — the three-claimant resolution enforced corpus-wide, not just in 16.

---

## §4 CROSS-CUT 1 — the plan's TEST-TRACK CARVE (`IMPLEMENTATION-PLAN.md`)

**The user's law:** *"all the implementation plan should have clear track."* The carve makes the test track FIRST-CLASS at three levels — §0 (the owner row + the carve law), §2 (every K-gate's test-law citation), §3 (every stream's per-phase amendment rows) — plus the battery as the machine. Not a ninth stream: the test track is the verification spine every stream's gates column keys on, with ONE owning row (S-spec) and per-phase landing rows in the executor streams.

### 4.1 §0 — the track table's carve

**(a) The first-class statement** (one paragraph, appended to the lane statement after the track table):

> **The test track (first-class, R28 — the T2-c carve):** the verification spine = (i) the K-ladder (§2 — every gate is a predicate over the repos at their pins), (ii) the per-round battery (`scripts/battery_r2N.py` — the machine), (iii) **the test-law corpus itself** (`12-testing-strategy.md` + `17-test-plan.md` + every spec's `## Testing` section — the law the gates cite). Owner: the S-spec track's standing duty (6). **The carve law (the plan-side twin of 17 §14.4 step-0): a stream row whose gates column cites no test law — no suite count, no battery class, no 12/17 row — is a spec bug; a phase's exit gate must name the 12/17 rows that MUST have landed by that gate.** The R28 lesson is the carve's reason: the W4 fold amended 14 law-side files and ZERO test-side files — the design law moved, the test law did not, and 17's own step-0 rule convicted every D42-D50 facet (`audits/fleet-r28/test-audit-coverage.md` §1.1).

**(b) The S-spec(6) row** (appended to the S-spec track's First-action cell, after item (5)):

> **(6) the R28 test-law fold (the T2-c carve's owner — the corpus's test law catches up to its design law, ONCE):** the 12/17 amendments for D42-D50 + the model-fold prereq sweep, landing WITH battery_r28 (never after it): (i) 17 §3.1's eight new matrix rows (linkage/edit-domains/error-envelope re-key/the four D46 families/markers v2/captions/pages + the D47 re-keys) + §13A.7's facet rows + §13A.4.1's 78→**80** re-key + §2.5 rule-8's two-tier census re-key (the coverage audit §5's P1 items 1-6, instantiated per `audits/fleet-r28/test-law-d48-d50.md` §§1-3); (ii) 12 §0's BASE/GAP re-key to the R28 pins + §8's new property invariants (linkage closure/no-dead-pointers; the D46 families); (iii) the prereq sweep (09:286-:335 marker interface; 15:1566-:1600 params; 09:119-:124 captions; 10:811 flip; 18 §4.4/§4.8/:41; 08:2168 + 04:2293 ruled-out rows). **GATE: the 17 §14.4 step-0 audit green — every D42-D50 facet has a matrix/facet row (machine-checked: battery_r28's step-0 class); battery_r28 green with the R28 check classes.**

### 4.2 §3 — the workstreams' per-phase test-law landing rows (the stream table's 12/17 amendments)

The S-spec paragraph gains the fold row; each executor stream's row gains its per-phase amendment citations (the carve law's "must have landed by that gate" made concrete):

| Phase (the owning stream's gate) | The 12/17 rows that MUST have landed | Owner |
|---|---|---|
| **r1 Stage 0** (S-ot: the linkage field + the constants module) | 17 §3.1's D42 linkage row + 12 §8's three linkage properties + the D43 edit-domains facet row (the fence/intersection/⊂-twin pins) | S-spec (the fold lands BEFORE the stage's port work orders run) |
| **r1 Stage 2-4** (S-ot: source-edit → composites → replace) | 17 §3.1's four D46 family rows + the transition-remap PROBE row's spec home (06 §5.9C's GAP set — the two-exit gate) + the D44 lockPreCheck riders' census | S-spec |
| **r1 the OT captions rows** (S-ot: the register flip's cost) | 17 §3.1's caption row + the D49/F1 DESCRIPTIVE law + the four-item OT cost acceptance set (this design §2.4 pin 12) | S-spec + S-ot |
| **r1 the union bump** (S-ot/S-app: insertBatch + replace land) | 17 §13A.4.1's 80-member sweep examples (bare `insertBatch`, `replace`) + the insertBatch TOTAL-span pin + the D48 wire-surface rows if the model fold rides the bump | S-spec |
| **r3** (S-app/S-engine: the {grade} seam) | 17 §13A.5's NS-4 extension (the render-plan projector's four properties + the venue-blindness check + the buildGradeFilterString string law) | S-spec |
| **K3** (S-app: the corpus row-by-row + the VLM net) | 17 §13A.6's page-system facet rows (the gate keys on them — 16:28's registration) + the app-side page-key suite's acceptance + the D48 bridge-drift gate (sceneBridge duration) + the D49 burn-in app-twin | S-spec + S-app |
| **r5** (S-app/S-package: the FCPXML corpus + polish) | the D48 clip-marker bundle rows + the D49 export corpus rows (SRT/ASS/VTT + the merge determinism) + the keymap long tail's 17 facet rows + the D49 enforced-uniqueness flip's migration note | S-spec |
| **W5/W6** (S-spec: the battery + the sweep) | 12 §0's battery-posture row gains battery_r28's class list (one edit); 17 §0A/header re-key to the R28 pins | S-spec |

### 4.3 §2 — the K-gate re-keys

- **K1**: the pin world re-keyed centrally by battery_r28 (engine 749/749 @ `074a2f6` code anchor `74bef08` / OT 632 @ `55c81c0` code pin `970948a` / WDC 777 @ `83b8850` / nle-ui 690 @ `32abd58` / app 252 @ `85cff80`; variants register-declared 1,939/68 + the declared pair 1,950/126; mini 495/12 sibling-maintained) — the gate's test-law citation: 12 §0's BASE rows equal 00's fleet table (the coherence class).
- **K2**: gains the D46-widened 10-mode-matrix twin row in 17 (S-spec(2)'s existing duty, widened: four family rows with live scheduled rows + the deferral lever) + the census projection note (31 = 28+3 today; the ruled r1 projection 78→79→80 re-keys the sweep at the bump).
- **K3**: gains the page-key tests + the D43-A3 battery check-2 widening + the D48 bridge gate + the D49 burn-in twin (the citations above).
- **K4**: shape unchanged; the exit adds the battery's zero-error class + BOTH collector figures recorded (the reconciliation law).

### 4.4-4.5 battery_r28's new check classes (the five named + this design's five)

**The five named (the coverage audit §3.2, from the ARCH addenda):**
1. **D43-A3** — check-2 widened to the C1-fold core-file→OT-leaf edge (bridge/ + the folded timeline-math.ts site), still leaf-only.
2. **D44-A6** — the class-tag completeness class: 25 codes × one class each, scraped from 15 §6.3's table + the census-script re-key.
3. **D47** — the 78→79→80 counterpart arithmetic + the insertBatch-ripple/replace §13.15 rows.
4. **D50 site 19** — the register's round-final OPEN-table state (rows 5-8 closed → 0; the four closed dispositions + the A3 RULED row).
5. **R16** — the dead constants drop (battery_r27:310-311's 1796/65).

**The five this design adds (T2-c's own):**
6. **The §14.4 step-0 facet-completeness class** — THE load-bearing addition: scrape 17 §3.1 + §13A.7 for the D42-D50 facet rows (per-area anchors: linkage/domains/two-tier-census/four-families/80-member/marker-v2/captions/pages); the S-spec(6) acceptance becomes machine-checked — the audit's own instrument joins the battery, so the one-round lag cannot recur silently.
7. **The suite-census coherence class** — 12 §0/17 §0A's BASE rows equal the R28 pin set (749/632/777/690/252; variants 1,939/68 with the declared pair 1,950/126 recorded; mini 495/12), with the runner-vs-line-start reconciliation law as a RECORDED figure (a collector difference is a battery-recorded pair, never a drift).
8. **The 182-row keymap coherence class** — 16 Appendix A ≡ §16 matrix ≡ §0 census (182); 15 §13.5's 181 pinned as known-stale (flag until the W6 sweep repairs it — then the flag's repair is verifiable).
9. **The ruled-out-claimant negative class** — 08:2168/04:2293/16:417/16:621's ⌘1-⌘9 claimant rows carry the resolved wording (the bare claimant forms absent).
10. **The signoff-rider freshness class** — TESTABILITY-SIGNOFF.md + FINAL-SIGNOFF.md carry the R28 re-rider with the re-keyed numbers (31=28+3 + the 78→79→80 projection; the 182-row registry; the 25-code two-tier registry) — the re-stamp's precondition is machine-checked.

---

## §5 CROSS-CUT 2 — the TESTABILITY-SIGNOFF re-stamp

**Standing** (the coverage audit §4): the R7-era certification, rider'd R27 with four re-stamp conditions; R28 changed the board — condition (3) is now MET (the register's OPEN design table at 0 rows); the two stale-number riders are themselves stale again. **The disposition: re-RIDER now (W6); full re-stamp after battery_r28 green + K4 — with a NEW certification clause the R27 form lacked.**

### 5.1 The re-rider (lands at W6, one paragraph at TESTABILITY-SIGNOFF.md :3-:5 + the FINAL-SIGNOFF twin; same form as the R27 rider)

> **[2026-09-16 — the R28 re-rider note.]** The four re-stamp conditions' R28 state: **(1)** the R28 corpus fold (W4, 14 law-side files @ `980920b`) — LANDED, with the registered residues: the D48/D49/D50 model-fold prereqs (09 §3.1/§3.1A's marker interface + captions family; 15 §4.3.49-51's params; 10 §8.1's blocker; 18 §4.4/§4.8) are the W6 delta-sweep's charge, tracked as S-spec(6)(iii); **(2)** battery_r28 — pending (W5/W6; the fork carries the R28 check classes incl. the step-0 facet-completeness class); **(3)** the register's OPEN design decisions — **MET: 0 open design rows** (D48/D49/D50 closed rows 5-8 at W4; the implementation halves keep their phase tags — the FX-page nle-ui absorption at r5/K3, the clip-marker bundle at r5-entry, the captions OT rows at r1); **(4)** K4's crawl exit — pending. The pin world re-keyed: K1 at the R28 pins — engine 749/749 @ `074a2f6` (code anchor `74bef08`) / OT 632 @ `55c81c0` (code pin `970948a`) / WDC 777 @ `83b8850` / nle-ui 690 @ `32abd58` / app 252 @ `85cff80` / variants register-declared 1,939/68 (the declared pair 1,950/126) / mini 495/12 (sibling-maintained). **The stale-number riders re-keyed a second time:** "73 EngineCommand types" → the live census **31 = 28 routed + 3 exceptions** (M49C via the live registry read), with the ruled r1 projection **78 → 79 → 80** (15:5023/:5025 — the replace/insertBatch members); "~180 keyboard bindings" → **the 182-row canonical registry** (16 Appendix A, re-keyed R28-D50; 15 §13.5's 181 is the known-stale citation the W6 sweep rides); **new third rider:** the error registry is **25 codes, two-tier** (15 §6.3 — 24 + `RATE_OUT_OF_DOMAIN`, class-tagged, with the benign-echo family and the 9 lockPreCheck riders). Until the full re-stamp: implementation-ready in architecture; the test law closes at W6.

### 5.2 The full re-stamp (after battery_r28 green + K4) — the certification statement

The re-stamp certifies, beyond the R27 form's four conditions, **test-law completeness** — the clause that closes the repeating one-round lag:

> **The corpus is sealed.** (i) The R7 refinement process's verdicts stand, re-verified at the R28 pin world. (ii) The K-ladder is the operative acceptance contract: K1 green at the R28 pins (engine 749/749 / OT 632 / WDC 777 / nle-ui 690 / app 252; variants 1,939 register-declared, 1,950 runner-count); K2-K4 green per their gates, each gate's test-law citations landed at its phase. (iii) The register's OPEN design table is at 0 rows — every design decision D1-D50 is ruled, with reversal conditions registered; no executor return-trips to the meta lane remain. (iv) **Test-law completeness:** every facet the corpus declares — D42-D50 included — carries a row in 17 §3.1/§13A.7 (the §14.4 step-0 sweep, machine-checked by battery_r28's facet class); the battery is green with the R28 check classes (the census coherence with both collector figures, the 25-code class-tag census, the 78→79→80 arithmetic, the ruled-out claimants, the OPEN-table closure, the signoff freshness); the two-tier error registry, the 182-row keymap registry, and the 31=28+3 wire census are the count authorities, cross-cited coherently. **The design law and the test law moved in the same round — the corpus is implementation-ready in architecture AND in verification law.**

**The gating ladder for the re-stamp:** (a) battery_r28 green (incl. the step-0 class + the signoff-rider freshness class — the re-rider of §5.1 must be on disk for the class to pass); (b) the W6 prereq sweep complete (the model-fold sites of §§1-3); (c) K4's crawl exit; (d) the register's round-final state re-verified (0 open design rows). The re-stamp lands at the R28 WRAP or the first subsequent wrap where (a)-(d) all hold — never partial.

---

## §6 The consolidated landing order (the W6/W5 sequence)

1. **The prereq sweep first** (the model-fold sites — they block half the pins): 09×2, 15 §4.3.49-51, 10:811, 18 §4.4/§4.8/:41, 08:2168, 04:2293, 16:417/:621.
2. **The facet rows + the matrix rows** (17 §3.1/§13A — the step-0 law satisfied; the near-term pins of §§1-3 land with them).
3. **The plan carve** (S-spec(6) + the first-class statement + the per-phase amendment rows + the K-gate re-keys) — same edit wave, so the plan and 12/17 cannot drift apart again.
4. **battery_r28's class list** (the five + the five; 12 §0's posture row's one edit).
5. **The re-rider** (both signoff files).
6. **The full re-stamp** waits for the ladder of §5.2.

**Design verdict (one line):** three areas, ~84 named pins (≈ 38 near-term W6/r1 · ≈ 8 r3-registered · ≈ 38 r5/K3-registered), every one grounded in a demonstrated pattern with a file:line witness; the carve makes the test track first-class at three plan levels + the battery; the re-stamp gains the test-law-completeness clause that breaks the one-round-lag pattern the R27 and R28 audits both found.

---

*Output of Task R28-T2-c. Companion inputs: `test-scout-app-ui-mocks.md` (the pattern library), `test-audit-coverage.md` (the gap inventory this design closes), `ARCH-R28-seal-round.md` §4/§4.1 (the ruled law). The executors' work orders key on the per-area acceptance-pin tables (§§1.4/2.4/3.4) and the per-phase landing rows (§4.2).*

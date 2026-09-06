# SPEC-REVISION CANDIDATES — surfaced by the ui-mock (R13 review round)

**What this file is:** the direction-2 output of the UX review waves — places
where building/reviewing the mock exposed that the SPEC SET itself is
internally inconsistent, stale, or missing a canon answer. The mock does NOT
amend specs (Decision 14: contract+gap+acceptance); these are the proposed
amendments for the seal round, each with the mock's evidence.

**ROUND 15 STATUS: §A (A1-A6) + §B (B1-B4) + §E.2 (N1-N15) + the §13.15-side
C7/N5 rows are PROCESSED — landed as in-place spec amendments (09/05/16/18/20/15,
each carrying "(Round 15 amendment)" markers; see the R15-AM1/AM2/AM3 worklog
entries and git log `aa54c81..` for the edit ledger). §C (C1-C29) and §D remain
the LIVE deviation ledger: the mock is the UX review surface through the app's
A7 phase, so new deviations keep registering here — now measured against the
APP rather than the mock alone. The E.4 fixed-list is closed.**

**Provenance:** R13-W1b spec-compliance review (opus) against specs 05/09/16/18/20
at commit `ebc1604`; cross-checked with `.agents/PLAN.md` seal items 14–25.
**R14 deep re-audit** (both directions, 2 verification + 2 spec-scan agents + a
zero-no-op wiring sweep) at `2c4423c`: every entry below re-verified (all
confirmed accurate; strengthenings noted in §E), plus 15 net-new findings
(N1–N15) and 19 new registrations (C10–C28) appended in §E. Editorial: the file
carries 19 numbered entries + D (the "17 entries" claim in the PR reply and
issue #2 undercounted — B/C-series rows are the mock-deviation ledger; several
known deviations live only in PLAN items 19–25 / code comments, not here).

---

## A. Spec-vs-spec conflicts (one of the two clauses must change)

### A1. Delete-key chords: 16 §3.4 vs 18 §4.9
- **Conflict:** spec 16 §3.4 makes `Backspace` the ripple delete and `Delete` the
  plain delete; spec 18 §4.9 labels `⇧⌫` (Shift+Delete) as ripple delete. The mock
  implements 18's version (`Delete`/`Backspace` plain, `⇧Delete` ripple) — a
  spec-vs-spec conflict the mock had to pick a side on.
- **Evidence:** `src/hooks/useShortcuts.ts` Delete/Backspace branch; cheat-sheet row
  `clips-ripple-delete` = `⇧Delete`.
- **Proposed amendment (16 §3.4):** `Backspace` = delete selection (alias of
  `Delete`); ripple delete = `Shift+Delete`/`⇧⌫` only; drop the `Cmd+Delete` alt row.

### A2. Marker model three-way split: 05 §11.1 / 09 §3.1 / 16 §3.7
- **Conflict:** 05 §11.1 stores markers **on the project**; 09 §3.1 types a
  project-level `Marker` AND a separate `Bookmark`; 16 §3.7 binds `toggleBookmark`.
  The mock stores per-scene `{id,time,label,color}` (markers per scene, no bookmark).
- **Evidence:** `src/lib/mockData.ts` SceneJSON.markers; store `addMarker`/`removeMarkersAt`.
- **Proposed amendment (09 §3.1):** unify to ONE type — `Marker {id, time, label?,
  color?}` stored **per scene** (absorbing Bookmark; 16 §3.7's `toggleBookmark`
  renames into the marker family) — or keep project-level and forbid per-scene
  markers; delete the other shape.

### A3. Track-gain double home: 09 TrackJSON.volume vs 20 §4.2 G fader
- **Conflict:** 09 §3.1 puts per-track gain on `TrackJSON.volume`; 20 §4.2 gives the
  G-layer mixer the per-track fader. The mock keeps gain ONLY in the G-slice.
- **Evidence:** `src/state/mockMixer.ts` MixerTrackSettings.fader; TrackJSON has no volume.
- **Proposed amendment (09 §3.1):** remove `TrackJSON.volume` (the G layer owns
  per-track gain per 20 §4.2) or type it explicitly as the persisted projection
  of the G fader.

### A4. Mute/solo S-vs-G placement: 09 TrackJSON vs 20 §4.2
- **Conflict:** both layers can claim mute/solo. The mock authors them on the S-side
  (TrackJSON) and projects them into headers AND strips via ONE command family
  (`toggleTrackCmd`).
- **Evidence:** `src/components/mixer/ChannelStrip.tsx` consumes track flags directly.
- **Proposed amendment (20 §4.2):** note mute/solo are authored on the S layer
  (09 TrackJSON) and projected into G at materialization — the G slice carries no
  second copy.

### A5. Solo on video tracks: 05 §10 vs 18 §4.7
- **Conflict:** 05 §10 says video tracks carry "M/V/L (no S)"; 18 §4.7 lists
  unqualified M/S/L/V. The mock ships S on all track kinds (18's shape).
- **Evidence:** `src/components/timeline/TrackHeader.tsx` renders S for every kind.
- **Proposed amendment:** either 05 §10 permits S on all kinds (monitor-solo
  semantics for video — 18 wins), or 18 §4.7 is qualified to "M/S/L + V where
  supported".

### A6. R key semantics: 16 §3.2 ripple MODE vs 18 §4.5 ripple TOOL
- **Conflict:** 16 §3.2 binds R to a ripple *mode* toggle; 18 §4.5 lists ripple as a
  *tool*. The mock binds R to the tool (adjacent to seal item 11's pick-one, but
  semantically distinct).
- **Evidence:** `src/hooks/useShortcuts.ts` case 'r' → setTool('ripple').
- **Proposed amendment (16 §3.2):** `R` → `selectTool {tool:'ripple'}` (matching
  18 §4.5's tool list); ripple *mode* rides a separate toggle or ⌥R. Folds into
  seal item 11.

---

## B. Missing canon answers (field/behavior the mock had to invent)

### B1. A/V link field missing from 09
- **Gap:** 05 §12.3 specifies linked selection ("selecting one selects both") and
  06 §6 sync-lock, but 09 §3.1 has no link field. The mock invented
  `linkedTo?: string` on ElementJSON.
- **Proposed amendment (09 §3.1):** add `linkedTo?: string` (or `linkGroupId`)
  backing 05 §12.3 linked selection and 06 §6 sync-lock.

### B2. Audio-tab field surface: 18 §4.4 "Gain dB, pan" vs 09 fields
- **Gap:** 18 §4.4's inspector audio tab says "Gain dB, pan"; 09's ElementJSON has
  `volume` (linear 0..1) and NO pan. The mock keeps gain-dB/pan component-local.
- **Proposed amendment (09 §3.1):** add `pan?: number` (−100..100) and state the
  volume unit (linear 0..1 vs dB) — or reword 18 §4.4 to "Volume %, pan".

### B3. Per-track height home: 05 §12.2 vs 18 §4.9
- **Gap:** 05 §12.2 defines a 24 px collapsed track row and 18 §4.9 has Height
  presets in the timeline menu; neither says where per-track height STATE lives.
  The mock uses global view-pref heights + audioLaneBoost only.
- **Proposed amendment (18 §4.9):** declare the height pref a per-track UI-store
  map (the mock's direction) vs doc state, and give 05 §12.2's 24 px collapsed
  row an owner.

### B4. 18 §4.2 vs §4.3 — the SAME GESTURE (double-click) claimed twice
- **Conflict (not a missing answer):** §4.3:147 specifies the trigger —
  "double-clicking a media-pool asset (or the inspector's source card) can
  play the raw asset" — while §4.2 assigns double-click = reveal. Two clauses
  claim the same gesture. The mock's clip-menu toast cites the conflict
  honestly.
- **Proposed amendment (18 §4.3):** the v1 fallback source-preview is
  triggered from the clip menu's *Open in viewer* / the source card's play
  button; double-click on a pool card remains §4.2's reveal — one gesture,
  one meaning.

---

## C. Mock simplifications to REGISTER (not spec changes — seal ledger)

| # | Simplification | Spec clause | Where |
|---|---|---|---|
| C1 | Text-input guard suppresses Cmd-combos too (real shell keeps ⌘Z/⌘S alive mid-field per §8.5) | 16 §8.5 | `useShortcuts.ts` guard comment |
| C2 | ↑/↓ = single-level track focus (spec has two levels: plain = select clip above/below, ⌘↑/↓ = focus) | 16 §3.3/§5.4 | `useShortcuts.ts` ArrowUp/Down |
| C3 | Linked MOVES not carried (selection propagates as of R13; sync-lock moves = 06 §6, seal item) | 05 §12.3 / 06 §6 | `selectElement` comment |
| C4 | `,`/`.` always slip (spec: select-mode nudge / tool-disambiguated) | 16 §3.6/§6 | `useShortcuts.ts` |
| C5 | ⌘B splits the main-track clip under playhead (spec: focused track only; ⌘⇧B all-tracks absent) | 16 §3.4 | `useShortcuts.ts` ⌘B |
| C6 | e.key-primary dispatch (spec 16 §8.4 prefers event.code lookup) | 16 §8.4 | `useShortcuts.ts` |
| C7 | Viewer zoom ladder = Fit/1.5×/2×/4× magnification labels (R13 honesty fix); spec 18 §3.3 enumerates Fit/50%/100%/200% whose "percent" semantics are unanchored (the old mock's "100%" was 2× fit) — spec should adopt magnification or pixel-anchored semantics at seal | 18 §3.3 | `Viewer.tsx` zoom select |
| C8 | `role="application"` on the shell root is spec-MANDATED (18 §11.3) but kills SR browse-mode app-wide; the maintainer review flagged it. With full keyboard coverage + F6 cycling the landmark is defensible, but the seal round should either bless it explicitly (with the keyboard-coverage caveat) or scope application-mode to the timeline region | 18 §11.3 | `AppShell.tsx` root div |
| C9 | 12px splitter/trim hit targets are spec-MANDATED (18 §3.2: "12px interactive hit; visual line is 6px") but sit under the §11 a11y floor's 24px minimum — spec-internal tension; R13 mitigation: splitters are now keyboard-resizable (arrow keys = 8px steps) | 18 §3.2 vs §11 | `AppShell.tsx` SPLIT_HIT, `Clip.tsx` trim handles |

## D. Seal-item staleness flags (from R13-W1b)

- **Item 16 STALE:** "always-on master micro-meter **+ header micro-meters**" —
  header micro-meters do not exist in the code (only the toolbar master meter +
  dock strips); DESIGN-audio-mode.md §3.2/§11.3/§11.7 presuppose them. Re-scope
  the seal question to the master micro-meter, or re-implement header meters.
- **Item 13:** PLAN is right ("12px strip"), the mock README was wrong (fixed in
  R13 W3).

---

## E. R14 addendum — deep re-audit (both directions)

Provenance: two spec-scan agents (direction 1: spec→mock coverage of 18 §0–§15
+ 16 keymap; direction 2: mock→spec with verification of A1–A6/B1–B4/C1–C9/D
above) at `2c4423c`, plus the R14 fix wave (`bd7cfc7`→R14 HEAD). All R13
entries re-verified accurate; strengthenings below.

### E.1 Strengthenings to existing entries

- **A2:** 16 §3.7 types `Bookmark.color: string` but 09's Bookmark has no
  color field; 15 §13.3 pins project-level markers + an `addMarker/deleteMarker/
  updateMarker` command family — a FOURTH naming family vs 16's bookmark verbs.
  Fold all into the one unification amendment.
- **A5:** the mock also ships V only on non-audio headers (per 05 §10), so 18
  §4.7's unqualified "visibility" is wrong for audio tracks in both directions.
- **A6:** 15 §13.5's example maps `R` → `selectTool razor` (a third claimant);
  09 §3.1 `TimelineViewState.rippleMode` persists ripple as a UI pref — a
  third semantic home. Amendment should collapse all three.
- **B1:** 06 §6's sync-lock needs `tracks[].syncLock` — ALSO absent from 09
  §3.1; the amendment should add both `linkedTo` and `syncLock`.
- **B2:** same gap class covers `preservePitch` (18 §4.4 specced; mock notes
  "no ElementJSON field") and the volume unit (linear vs dB).
- **B3:** the track-header menu shipped NO Height rows at all (R14 fixed:
  Compact/Normal/Tall now drive a GLOBAL pref — per-track remains the open
  state-home question; see C25).
- **C9:** re-cite as "WCAG 2.2 AA 2.5.8 via §11's AA floor + §9's 24px
  icon-button heights" (the 24px minimum is not a written §11 row).
- **C2 extension:** ⇧↑/↓ (add clip above/below), ⌘⇧↑/↓ (move clips between
  tracks) and `F` (find-playhead) are also unimplemented (16 §3.3).

### E.2 Net-new spec-side findings (N-series)

**N1 (P1 — schema).** `ElementJSON` records have no home in the ProjectJSON
tree: 09 §3.1 `TrackJSON.elements: string[]` (IDs), but no field anywhere
holds the records — while 05 §6.1/§7.3's own examples read
`track.elements.filter(el => el.startTime…)` as INLINE objects. Mock:
`mockData.ts` inlines `elements: ElementJSON[]` (the 05 direction).
Amendment: 09 §3.1 declares the container (inline array, or scene-level
`Record<id, ElementJSON>`); 05's examples and 09's `string[]` line reconcile.

**N2 (P2 — enum).** Tool inventory three-way split: 15 §4.3.45 = 9 tools
(`select|razor|ripple|slip|slide|roll|rate-stretch|hand|zoom`); 18 §4.5 lists
7 while claiming it "mirrors spec 15's tool enum exactly" (no hand, no zoom);
05 §8.1's ToolMode = 4. Mock implements 18's 7 with `blade` naming.
Amendment: 15's enum wins; 18 §4.5 lists all nine or moves hand/zoom to its
§8 removal ledger; 05 §8.1 re-points at the 15 enum.

**N3 (P2 — fields).** 18 §4.2 requires what 09 §3.1 MediaRecord lacks: sort
mode "import date" + metadata `importedAt`; `size: number` (bytes) with no
display format. Mock invented `importedAt: string` + display strings
("1.8 GB"). Amendment: MediaRecord gains `importedAt` (ISO 8601); `size`
stays numeric and 18 §4.2 states the shell formats it.

**N4 (P1 — behavior vacuum).** The Link A/V toggle (18 §4.5 `btn-linklock`)
has NO contract in any spec: 05 §12.3's linked selection is data-driven, 06
§6 sync-lock is per-track, 16 §3.4 has per-element `toggleAVLink`. The mock's
flag was provably inert until R14 — now it gates linked-selection propagation
(OFF = plain select), the DaVinci-meaning answer. Amendment: 18 §4.5 states
the gate: link-off suspends linked-selection propagation AND sync-lock
move-following; the flag is view-level, links are doc-level.

**N5 (P2 — invariant).** Loop/in-out inversion is undefined everywhere: 15
§4.3.29 SetLoopCommand has no ordering constraint; an inverted window hung
the mock's playback tick (R13 found, R14 fixed: mark-in/out now move the
other half — start ≤ end always; zero-width = no-op loop). Amendment: 15
§4.3.29 adds "end > start is a validation invariant (INVALID_PARAMS
otherwise) — or the engine swaps halves"; 18 §4.3 states the band renders
empty and playback ignores an inverted window.

**N6 (P2 — view state).** Lock-all: 18 §4.5 says "fan-out, undoable as a
batch" but nothing about (a) the pressed state under MIXED lock states, or
(b) what engine undo does to the view flag (18 §6.2 keeps view state in the
UI store, which undo doesn't touch — the mock's R13 bug). Mock: `lockAll`
derived `every(track.locked)`, re-derived on scene switch, carried in history
snapshots. Amendment: lock-all is set-all; pressed = all-locked; the shell
re-derives view flags from the restored snapshot after undo/redo.

**N7 (P3 — taxonomy).** 18 §6.4 enumerates success/warning/error toast kinds
but its own rows need `info` ("Nothing to undo", import/deliver notices).
Mock: `info` 4s + `persist` 6s (warning-class). Amendment: §6.4 adds
`info = 4 s, role="status"`.

**N8 (P3 — keymap).** 16 §3.7: `M` = toggle/edit existing marker at playhead;
`⌥⇧M` = cycle color of the marker at playhead. Mock: M always adds;
⌥⇧M adds-with-cycled-color (pinned by tests). Registered deviation — seal
decides whether M toggles.

**N9 (P2 — panel).** Effects panel: 18 §4.1 ships the toggle (`btn-effects`)
but the §4 inventory has NO Effects-panel entry (contents, dock slot, width,
drag contract). Mock invented a 220px rail; R14 wired real drag-to-clip
(`addEffectToElement`/`setTransition` on drop) + click-toast fallback.
Amendment: 18 §4 gains the Effects entry (registry list, drag-to-clip,
Option+2 toggle, F6 region?) — or the toggle moves to the §8 removal ledger.

**N10 (P2 — gesture).** Ruler click: 05 §11.1 "Click on ruler to add marker"
vs 18 §4.9 (markers via M / menu / palette) + 05 §8.6 (ruler drag = seek).
Mock: click/drag seeks. Amendment: 05 §11.1 — plain click/drag on the ruler
seeks; markers via M, the button + palette, and the §4.9 menu.

**N11 (P2 — focus).** 16 §5.3: exactly one focused track (default TOPMOST),
Tab walks the FOCUSED track; §3.3 marks Tab "Always" while §6.1 #12 says
"timeline focused" (internal 16 conflict). Mock: focus starts null (⇘
fallbacks invented), Tab walks the MAIN track, scoped to the timeline region
(= §6.1 #12). Amendment: focus initialized to topmost; Tab's context column
says "timeline region focused".

**N12 (P2 — model).** In/out: 05 §11.2 defines `InOutPoints` + `G`-to-clear;
16 §3.1 note + 18 §4.3/§4.9 make in/out = setLoop halves (⌘⇧I/O, ⌥X) — no `G`
binding in 16. Mock: setLoop halves only (R14: + ⌘⇧I/O clear halves).
Amendment: delete 05 §11.2's dedicated model (16/18's setLoop-halves win), or
promote InOutPoints across 15/16/18.

**N13 (P3 — ladder).** Timeline zoom: 05 §5.2 floor 5 px/s, max 100×
(5,000 px/s ≈ frame-accurate at max); mock 8–240 px/s (≈10 px/frame at max).
Frame-grid discipline only exercised at coarse zoom. Registration for the
seal (C7 covers the VIEWER ladder; this is the timeline one).

**N14 (P3 — shape).** Mixer G-surface vs 20 §4.2: `buses: {a1,a2}` fixed pair
(no per-bus return chains) vs `AuxBusSettings[]` (1..4); `outputBus: 0|1|2`
vs 0=master/1..4=aux; masterVolume lives in the UI store (PLAN 24) vs scene
slice. All registered; R14 made auxPreFader/auxB/aux-on REAL controls.

**N15 (P2 — targeting).** Trim-to-playhead targeting: 16 §3.4 `[`/`]` say
"elementId: <selected>", context "When clip selected" — silent on
multi-select fan-out, no-selection fallback, scene scoping. Mock's R13 P1 fix
is the reference contract: all selected elements when ≥1 selected, else the
clip under the playhead on the focused/main track, ACTIVE scene only.
Amendment: 16 §3.4 (or 06's trim family) states that resolution.

### E.3 New registrations (C10–C28)

| # | Simplification | Spec clause | Where / status |
|---|---|---|---|
| C10 | Plain wheel on lanes = native vertical scroll (spec: horizontal); Alt+wheel vertical track scroll not implemented; ⌘/⇧ wheel rows ARE implemented | 18 §5A | `Timeline.tsx` wheel handler |
| C11 | Tooltip: 500ms delay + fade, NO 4s auto-dismiss, no pointer-down suppression | 18 §9 | `app.css` tooltip rules |
| C12 | UI strings inline (no locale module from day 1) | 18 §9 i18n posture | mock-wide |
| C13 | removeMediaAsset hard-blocks with an error toast (mock has no command); spec wants a counting confirm dialog | 18 §6.4 | `MediaPool.tsx` |
| C14 | Type-scale deltas: dialog titles 14px (spec 16px), empty-state headings 12px (spec 20px), ruler labels 11px vs the 12px TC floor | 18 §9 | `ConfirmDialog.tsx`/`MediaPool.tsx`/`Ruler.tsx` |
| C15 | Track-type 2px header strips + clip 3px label strips + T/S/♪ fade/effect badges absent (only the F badge exists) | 18 §9 color strips | `TrackHeader.tsx`/`Clip.tsx` |
| C16 | Locked-gesture store guards reject silently (no named-blocker message, no not-allowed toast on the keyboard surface) | 18 §6.4 state-conflict row | `useUiStore.ts` guards |
| C17 | Panel-toggle focus-into-panel + dialog-close focus-restore absent (ContextMenu DOES restore) | 18 §11.2 | `AppDock.tsx`/`ConfirmDialog.tsx` |
| C18 | Program canvas aria-label static (spec: ≤1Hz playing-state updates + throttled TC live region) | 18 §11.8 | `Viewer.tsx` |
| C19 | Clipboard family (⌘X/C/V, ⌘⇧V, ⌘⌥V) unimplemented — menu rows honest-disabled with tips | 16 §3.4 | `Clip.tsx`/`Timeline.tsx` menus |
| C20 | K-then-J/L ½× slow-mo unimplemented (⇧J/⇧L 2× + tap-accel ARE real, R14) | 16 §3.1 | `useShortcuts.ts` JKL |
| C21 | Go-to-Marker: ⌘⇧←/→ key navigation (R14) but no §4.9 "Go to Marker ›" submenu (ContextMenu has no submenu primitive) | 18 §4.9 | `useShortcuts.ts` |
| C22 | Spec-16 edit-shell keymap: 42→~60 bindings implemented (R14 added ⌘\, ±, ⌘0, ⌘⇧←/→, ⌘⇧I/O, ⌘S, ⌘E, ⌘⇧M, [, ], ⌘←/→, ⇧J/L, ⇧,/.); remainder deliberately scoped out (S/Q/W long tail, ⌘L family, ⌥M dialogs, ⌥1-4, F1...) | 16 §3.1–§3.13 | `shortcutMap.ts` (the cheat sheet is the honest implemented-set ledger) |
| C23 | Tool set = 18's 7 (no hand/zoom) — see N2 | 16 §3.2 / 18 §4.5 | `useUiStore.ts` ToolId |
| C24 | Sound Library roles = second component-local mediaId map (DESIGN §7's single map is aspirational; doc corrected R14); sort control NOW matches the pool | DESIGN-audio §7 | `SoundLibrary.tsx` |
| C25 | Height pref is GLOBAL (compact/normal/tall × kind base), not per-track — B3's state-home answer; menu rows added R14 | 18 §4.9 / 05 §12.2 | `useUiStore.ts` trackHeightPref |
| C26 | Buses fixed pair {a1,a2} + outputBus 0|1|2 (see N14); auxPreFader/auxB/aux-on now REAL toggles | 20 §4.2 | `mockMixer.ts`/`ChannelStrip.tsx` |
| C27 | Fader taper linear-in-dB (unity 0dB at 91% travel, dbl-click reset) — DESIGN doc corrected R14 (was claiming mid-scale) | DESIGN-audio §6 | `mockMixer.ts` dbToSlider |
| C28 | Timeline zoom ladder 8–240 px/s vs 05 §5.2's 5–5,000 (see N13) | 05 §5.2 | `useUiStore.ts` MIN_PPS/MAX_PPS |
| C29 | Mock 09-shape deltas beyond N1/N3: `MediaRecord.size` display strings ("1.8 GB") vs numeric bytes; `colorInfo`/`storage` omitted; `SceneJSON.isMain` dropped (flat tracks); transition presentations stored as display names vs 09's registry keys | 09 §3.1 | `mockData.ts` docblock + shapes |

### E.4 Fixed-not-registered this round (evidence the seal round can cite)

The R14 wave CLOSED (implemented, not registered): zoom cluster + ⌘\ binding
(tooltip lies → real), marker-color dropdown, marker nav keys, ⌘⇧I/O, ⌘S/⌘E,
⌘⇧M, [ ] non-ripple trim, ⇧J/L 2×, ⇧,/. ×10, tool-radiogroup arrows (§11.1),
Toolbar2 roving tabindex (§11.1), loop inversion law (N5's mock answer),
link-toggle gating (N4's mock answer), ⌘M any-kind focused track, split
linkedTo law, MIN_DUR unification, duplicate-at single undo, loadSample
mixer rebuild, multi-track viewer resolution, two-way scroll sync, height
menu rows, add-track above/below, bracket drag + slider grammar, Clip
Enter/Space, effects drag-to-clip, Deliver empty/failed state rows (§4.2),
Viewer loading/error state rows (§4.2), ColorPage/Deliver settings wiring,
auxPreFader/auxB/aux-on toggles, SoundLibrary sort, DebugOverlay copy-failure
state + save-fail drill, SceneTabs aria-controls (§11.6), splitter ⇧×4
ladder, Ruler Tab reachability, ToastRegion timing doc sync.

---

## F. R15 audio-overhaul registrations (R15-A3/A4 round)

Provenance: R15 audio waves A0–A4 in the ui-mock (design doc
`.agents/design/R15-audio-overhaul.md` v2 FINAL; worklog R15-A1 + R15-A3).
The §A/§B/§E.2 processing above predates the audio overhaul; these rows are
the net-new ledger entries that overhaul surfaced, registered the same way
(mock does NOT amend specs — contract + gap + evidence per Decision 14).

### F.1 Closed in the mock — seal evidence (the "re-implement" branch taken)

- **Header micro-meters — v2.2 §3.2 promise CLOSED (seal item 16 / §D
  above).** DESIGN-audio-mode §3.2/§11.3/§11.7 (and the R15 audio design's
  A4) presuppose per-audio-track header micro-meters; §D item 16 flagged
  them as non-existent ("re-scope the seal question to the master
  micro-meter, or re-implement header meters"). The mock now takes the
  re-implement branch: a 4px view-only vertical level meter per AUDIO track
  header (`TrackHeader.tsx`), fed by the shared metering engine
  (`lib/meterEngine.ts` → `useMeter(trackId)` — the SAME key the channel
  strips, bridge rail, aux returns and master read, so header and strip can
  never disagree), mono-collapsed to the louder channel, clip latches red,
  effectiveMute dims, aria-hidden + pointer-events-none, no LED segments,
  and hidden on compact lanes (height < 48 — the single-row layout has no
  vertical room; documented in the component). Evidence:
  `src/components/timeline/TrackHeader.test.tsx` ("audio micro-meters
  (v2.2 §3.2)"). **Amendment for the seal:** spec 18 §4.7 (or
  DESIGN-audio §3.2, whichever home wins) blesses the grammar — view-only
  level display on audio headers, shared-engine key, decorative (aria-hidden)
  role, compact-lane suppression — and seal item 16 closes as implemented.

### F.2 New registrations (C30–C32)

| # | Simplification | Spec clause | Where / status |
|---|---|---|---|
| C30 | Strip chrome now carries h-1 role-color base bars at every strip bottom (--mk-role-* mapped to Dialogue/BGM/SFX/Music; master = accent gradient; aux = type-audio) — spec 18 §9's "type color strips" clause describes 2px TRACK-HEADER strips, which remain absent (C15 stays half-open: header-side strips + clip label strips still unimplemented) | 18 §9 | `ChannelStrip.tsx` (R15-A4) |
| C31 | Fader dB scale column: labels +6/0/−6/−12/−24/−48/−∞ at TRUE (db+60)/66 taper positions, 8px aria-hidden right-aligned, channel strips only (not the bridge) — no spec pins ANY mixer scale grammar; invention registered so the seal can bless or replace it | 20 §4.2 (absent) | `MixerPrimitives.tsx` Fader `scale` (R15-A3) |
| C32 | Aux "no source" honest-disabled chip, derived live from (any auxN send > 0 ∨ outputBus route to the bus) — no spec defines a no-source/return-inactive visual state; engine side already honest (bus OFF → silent return, R15-A2) | 20 §4.2 (absent) | `ChannelStrip.tsx` AuxStrip (R15-A4) |

## G. R15 timeline-parity registrations (R15 main + review rounds)

Canonical source: bearachprema/opencut-timeline (the timeline seam the
nle-core-spec UI layer is normatively bridging to — see
`.agents/research-r15/opencut-timeline-seam-contract.md` for the 43-point
parity extraction).

### G.1 Spec-16 §3.8 — zoom step factor 1.5 → 1.7 (canonical)

The spec pins `+`/`=` = ×1.5, `−` = ×0.667 (and the toolbar matched). The
canonical seam pins `TIMELINE_ZOOM_BUTTON_FACTOR = 1.7` (opencut
`components/timeline/layout.ts:37`, test-anchored in their M30 suite). R15
adopted 1.7 everywhere (toolbar ± buttons, keyboard +/−, bus `zoomStep`) —
tests migrated (`TimelineToolbar.test`, `useShortcuts.test`). **Ask: amend
spec 16 §3.8's zoom row to ×1.7 / ÷1.7 citing the canonical constant.**

### G.2 Spec-18 §5A — zoom-toward-cursor → two-regime playhead anchor

Spec 18 §5A pins "zoom toward cursor" as normative for ⌘-wheel; spec 05
§5.2 pins the two-regime playhead-anchored layout (both cannot hold — the
18↔05 conflict is pre-existing). The canonical seam implements two-regime
for ALL zoom paths (slider percent ≥ 0.15 → keep the playhead's viewport
offset; < 0.15 → no adjustment; crossing save/restore). R15 adopted
two-regime (controller port + rAF-coalesced wheel). **Ask: amend spec 18
§5A to the two-regime law and note the 05/18 conflict resolved in 05's
favor; cursor-anchored zoom may be registered as a future preference flag.**

### G.3 Delivered alignment (no registration needed, recorded for the seal)

- **MIN_DUR = 1 frame** (spec 06 trim constraints) — the mock's 0.25s was
  the deviation; R15 T4 aligned (lib/trimLaws.ts).
- **Magnetic main zero-anchor** (spec 05 §14.5A normative, §8.3 note 4) —
  now implemented in both the drag resolution and the batch API through ONE
  pure law (`timelinePlacement.zeroAnchorShift`, group-wide, R15-F1 unified).
- **Ripple interval diff** (vacated−joined) — non-contiguous multi-delete
  now spec-05-correct (lib/ripple.ts).
- **Half-open overlap rejection + virtual removal + mixed A/V group
  rejection** (spec 05 §8.3) — `timelinePlacement.resolveGroupMove`.

### G.4 Known deferrals (honest ledger)

| Item | Status |
|---|---|
| Roll trim B-source-tail bound for rate ≠ 1 | Partially bounded (V1 P3 → rollDeltaBounds got A's; B's tail remains) — engine question for nle-engine |
| Scene-switch scrollLeft reset policy | Reset implemented (R15-F1); restore-to-edit-position not modeled (canonical has no equivalent either — view-state persistence is the shell's job) |
| Preview batch-atomicity vs commit per-move drop (non-drag callers) | Drag seam is atomic; raw `moveElements` NON-atomic path documented in-code (locked/compatibility per-move drops) — registering the divergence for the engine contract |
| Seek-click ≤500ms finalize | Implemented as a no-snap final re-seek; the 500ms time gate itself omitted (our ruler has no long-press semantics to disambiguate) — deviation comment in Ruler.tsx |

## H. R19 reference-integration + feedback-wave-3 registrations (shell-variants round)

Round R19 integrated nine user-uploaded reference mock HTMLs (audio editor/mixer, Resolve
color wheels/qualifier/node-graph/scopes, timeline markers/captions/transcript, NLE edit
workflow) + worked the 26-thread annotakit wave. Registering the mock's inventions so the
seal can bless, replace, or promote them into the spec track. (Numbering note: R19's
in-repo comments originally cited C29-C40 — those ids collided with ledger F.2's; the
R19-REV review caught it and the whole tree was swept to C33-C44. Lesson minted as a
SKILL meta-learning: check the ledger BEFORE minting gap ids in a design doc.)

### H.1 New registrations (C33–C44)

| # | Mock invention / gap | Spec clause touched | Where / status |
|---|---|---|---|
| C33 | **Marker v2 model** — `Marker.duration` (range markers, end = time+duration, ≥1 frame, clamped to scene), `notes`, `keyword` fields + per-clip markers (`ElementJSON.markers`: {id, offset, label, color}); ruler gains a dedicated MARKER BAND (distinct from tick band — pins never read as lane content), clickable pins → MarkerInspector rail swap, range = 20% fill + 2px rails + shield caps, "Go to Marker ›" real navigation | 05 §11.1, 09 §3.1A (point-marker-only today) | mockData.ts Marker/ElementJSON, useUiStore marker ops, Ruler.tsx, MarkerInspector.tsx — mock-real CRUD (undoable); spec ruling needed for range/clip markers |
| C34 | **Captions track kind + body field** — `TrackKind 'caption'` + `TrackJSON.language` + `ElementJSON.text`; caption lane renders 24px parchment chips; CaptionInspector (embedded panel — the reference's DIALOG converted per user directive) with list table (#/In-Out/Caption/CPS-computed) + live editor + Add New/Prev/Next; viewer caption overlay chips under the playhead | 09 (teacher repo has SubtitleSegmentItem as an ELEMENT type; no caption TRACK-kind ruling; auto-transcript engine surface not modeled) | mockData.ts, Timeline/Clip caption lane, CaptionInspector.tsx, Viewer overlay — mock-real text/timing edits; gap: engine transcript/consolidation round |
| C35 | **Per-clip audio params** — `pan` (−1..1), `pitchSemitones`/`pitchCents`, `eq` 4-band ±24 dB on ElementJSON; Inspector audio tab edits them for real (doc model, undoable) — the ENGINE consumes none (spec 20 scopes mixing per-track via MixerTrackSettings; per-clip pan/pitch/EQ have no G-surface home) | 20 §3-§4 (per-track only), 06 (varispeed is speed, not pitch) | mockData.ts, Inspector.tsx audio tab — display-state honesty comment at the site; engine round decides the field homes |
| C36 | **Color node graph layout** — spec 18 §15.3 deferred the node graph to a seal question; the references now define it: left-dock graph (Master In → Primary → {Secondary ∥ Water mask} → Mixer → Tilt Shift → Lens Flare fx → Master Out), 106×86 cards, square/triangle ports, selection state, straight 2px edges; static topology + click-select only (drag/pan/zoom = gesture round) | 18 §15.3, 08 (node pipeline implied by the effect chain) | pages/color/ColorNodeGraph.tsx — upgrade §15.3 from "deferred" to the proposed 3-region color composition (graph left / viewer+scopes center / wheels+qualifier rail) |
| C37 | **Deliver whole-view page** — the deliver page repurposes the ENTIRE mainbody (queue left / summary+range center / settings right) instead of the right-rail panel; the timeline stays live with loop in/out as the export range selection | 18 §8 deliver (single-panel today) | AppShell.tsx deliver routing, DeliverPage.tsx 3-region layout — layout amendment for the seal |
| C38 | **Fullscreen-viewer toggle REMOVED** from toolbar2 per reviewer (th_mtoyu8bl: confusing in a browser, no clear strong use) — spec 18 §4.1's right cluster listed it; mock now: pool/effects/inspector only | 18 §4.1 | Toolbar2.tsx — spec text should drop the clause |
| C39 | **Source-preview trigger widened** — spec 18 §4.3 v1.1 lists clip-menu + source-card-play triggers; the mock ALSO enters source mode on single pool-card SELECTION (reviewer th_mto3504c: "dual-purpose as asset preview") + exits on multi/empty; static poster + source TC (no fake playback) | 18 §4.3 (B4's one-gesture-one-meaning law kept: dbl-click stays reveal-only) | MediaPool.tsx, Viewer.tsx source mode — trigger-list amendment |
| C40 | **Strip chrome beyond the G-surface** — input label row ("No Input"), record-arm R (display-only), insert-power "I" (display-only), + add-insert chips, EQ/dynamics sparkline thumbnails, 3px role-color TOP bar (F.2's bars moved bottom→top per reference); inserts stay 2 slots (model-scoped) | 20 §4.2 (no recordArm/input/inserts-power fields) | ChannelStrip.tsx — Fairlight-surface question for the seal |
| C41 | **Meter palette** — reference is continuous green→yellow with 1px peak line; mock keeps OUR 3-zone + clip semantics at the reference's fixed 14px width | 20 (unpinned) | MixerPrimitives.tsx StripMeter — keep-ours decision, documented |
| C42 | **Pool hover-to-autoplay** — ≥400ms dwell triggers a ken-burns object-position pan + PREVIEW chip + progress hairline (ambient, toast-free); real impl = poster frames from a thumb-specific asset, NEVER full-res | 18 §4.2, 03/09 (poster-frame decode surface) | MediaPool.tsx — engine round: poster-frame timeline |
| C43 | **Scopes 2×2 embedded dock** — Parade/Waveform/Vectorscope/Histogram as a collapsible dock UNDER the viewer on the color page; deterministic seeded traces (scopes need the render readback — spec 08 §scope-accuracy pins 10-bit data the mock cannot produce) | 08 (scopes exist; layout 18), 04 | pages/color/ColorScopesDock.tsx — trace generation = engine round |
| C44 | **Inspector empty-state → active-track fallback** — research (R19): Resolve/Premiere CLEAR the inspector on empty selection; track inspection is the Fairlight/mixer precedent. The mock derives an active track (focusedTrack → topmost-under-playhead → main) and shows a REAL track sheet (flags + mixer slice for audio) instead of a dead rail | 18 §4.4 (inspector is clip-scoped today) | Inspector.tsx via useUiStore.activeTrackOf — seal question: bless the fallback or keep the blank |

### H.2 Real wiring delivered (no registration — the seams existed)

- **insertMediaAt**: the 7 Resolve edit functions (insert/overwrite/append/placeOnTop/
  rippleOverwrite/replace/fitToFill) — REAL placement against timelinePlacement laws
  (frame-snap, half-open spans, split-with-transition/linkedTo laws, displaced-delta
  ripple), one undoable history entry per op; replace/fitToFill degrade to honest
  refusals when selection/range inputs are missing. The pool→timeline drop toast is now
  backed by the same op family (EditOverlay buttons consume it).
- **LeftDock** ("use the same area as bin", th_mtoyt5fv): pool+effects share the mediaW
  slot as an ARIA tab pair — spec 18 §4.11's left-dock ruling refined (no side-by-side
  strip).
- Fader/scale/meter equal-height law + 86px strips + piecewise dB display taper (model
  stays linear −60..+6; view-layer map), FX chip rack on real inserts.

---

## I. R20 registrations (shell-variants round 2 — the unified C45–C58 ledger)

Round R20 minted its gap ledger in two contract drafts (insert-modes C45–C49,
color-layout C45–C52) before DESIGN-R20 D6 unified them into ONE **C45–C58**
series. This §I block is the ledger's authoritative copy for the seal round
(source: DESIGN-R20.md D6 + the two contracts' detail rows; status reflects
the shipped W0–W5 implementation). The D6 map, verbatim:

| draft (in contract) | unified |
|---|---|
| insert-modes C45–C49 | C45–C49 (1:1, no change) |
| color-layout C45 (grade sidecar) | C50 |
| color-layout C46 (console layout) | C51 |
| color-layout C47 (CPU preview) | C52 |
| color-layout C48 (real scopes) | C53 |
| color-layout C49 (qualifier) | C54 |
| color-layout C50 (curves) | C55 |
| color-layout C51 (node binding) | C56 |
| color-layout C52 (clip color inspector rail) | folded into C51 (one sentence) |

| # | Mock invention / gap | Spec clause touched | Where / status |
|---|---|---|---|
| C45 | **7-mode source edit-function family** — insert/overwrite/append/placeOnTop/rippleOverwrite/replace/fitToFill mapped to OT: only `timeline.insert` exists (and it is reject-not-shift, not ripple); overwrite/replace/rippleOverwrite/fitToFill are command composites (split+delete+insert / +retime), placeOnTop is engine-only `insertElementOnNewTrack`, append is insert-at-totalDuration | 06 §5.9 (add an "edit functions" subsection enumerating the family as composites), 15 §13.15 (InsertCommand `ripple` param already listed as wire-need) | lib/insertPlan.ts (pure plan/apply split, R20-W2) + useUiStore.applyInsertPlan — mock-real, ONE undo entry per op; OT @4d56c17 verified read-only |
| C46 | **Source-transport insertion-mode cluster** — the 7 one-shot mode buttons live in the SOURCE-preview transport row (single-viewer adaptation of Resolve's under-source edit overlay / Premiere's source-monitor Insert/Overwrite); program monitor hosts no edit ops; NOT a radiogroup (no persistent mode — no NLE has one) | 18 §4.3 v1.2 (source-preview chrome contract) | components/shell/SourceEditBar.tsx (replaces the R19 program-monitor EditOverlay dock, removed per issue #63); kebab overflow <560px carries the APG menu keyboard law (R20-W6FIX P2-3) |
| C47 | **Audio-source track routing law** — media-type routing overrides selection-kind when incompatible (audio-only source → audio lane even when a video clip is selected); selection of the SAME element kind retargets ("target track of selected clip" — R20-W6FIX P2-4 tightened to exact element-type equality per contract §5(b); fitToFill never retargets); frozen/untargetable wrong-kind lanes while an audio source is loaded | 06 §5.9 edge cases, 18 §4.3 | lib/insertPlan.ts resolveTargetTrack + Timeline.tsx frozen-lane affordance (source-mode only) |
| C48 | **Hover-placement preview** — plan/apply split so preview == commit BY CONSTRUCTION (the same pure planner); timeline renders ghost/displaced-arrows/overwrite-shading/split-tick/speed-badge from the plan (reference timeline_edit_modes (2).html grammar); NO NLE precedent for button-hover placement preview (drag-preview grammar extended) | 18 §4.3/§9 (preview-geometry contract), 05 §5 placement (dry-run form) | hooks/useInsertPreview.ts + Timeline.tsx insert-preview layer; preview ids via a counting-only fake factory (never advances the store counter); R20-W6FIX P2-1 added ghost.insertLineAfter so a minted track's ghost renders at the planned insert line |
| C49 | **Audio hover-dwell autoplay = waveform motion** (extends C42) — pool audio cards get a waveform-motion preview on ≥400ms dwell (sweep line across the deterministic bars; video gets ken-burns) | 18 §4.2 (C42's poster-frame round extended to audio) | MediaPool.tsx (thread #68 / th_mtp97ipa) |
| C50 | **mockGrades sidecar + undo snapshot extension** — `Record<elementId|'timeline', GradeParams & {curves}>` beside the doc (mockMixer precedent, NEVER on ElementJSON); withHistory snapshots the sidecar so grades undo/redo round-trip | 08 §4.2 (verbatim field names), 09 (no color fields on the model — sidecar ruling needed) | state/mockGrades.ts + useUiStore setGrade/resetGrade; the `'timeline'` key is a POST-clip sequential second pass (README deviation) |
| C51 | **ColorConsole layout (incl. clip-rail)** — the color page's timeline area is a console (frozen lane strip, click-to-target clips, [Primaries|Curves|Qualifier] tabs) + the clip color inspector rail folded in | 18 §4.8 (color-mode composition) | pages/color/ColorConsole.tsx |
| C52 | **CPU preview pipeline** — decode → linear → §4.2 grade stack (clip then timeline) + curve-LUT bake + qualifier → encode, ≤960×540 working res, rAF-coalesced, per-mediaId decode cache | 08 §4.2/§5.2/§12 (cache strategy) | pages/color/GradedViewerCanvas.tsx + lib/color/* (W4a math libs) |
| C53 | **Real scopes** — Waveform/Parade/Vectorscope plotting REAL data from the graded buffer (density-alpha cells, BT.601 + §11.3 graticule, 10fps throttle) — **SUPERSEDES §H C43** (the seeded-trace ColorScopesDock/scopeTraces.ts were deleted in R20-W4b; C43's deterministic-trace stopgap is retired, append-only note on C43's row above) | 08 §11 (scope accuracy), 04 (render readback) | pages/color/ColorScopeStrip.tsx + lib/color/scopesMath.ts |
| C54 | **Qualifier HSL keying** — circular hue distance w/ wraparound, soft sat/lum windows, mask+invert+strength; viewer matte overlay + eyedropper sampling the graded buffer | 08 §8.1 | pages/color/QualifierPanel.tsx + lib/color/qualifierMath.ts |
| C55 | **Curves tab** — REAL monotone piecewise-cubic spline editor (Fritsch–Carlson, no overshoot); points in GradeParams.curves; the 256-entry LUT bake composes in the viewer | 08 §5 (curves as a separate bake), §5.2 | pages/color/CurvesPanel.tsx + curveMath.ts |
| C56 | **Node-graph → grade binding** — the graph's primaries/qualifier nodes bind to the target grade record; other node types honest-toast | 08 (node pipeline implied by the effect chain), 18 §15.3 | pages/color/ColorNodeGraph.tsx |
| C57 | **Per-track height overrides + per-track FX home** — trackHeightOverrides view-state (5px resize strip, drag/±4px ⇧16/dbl-click reset, min 24/32 max 240) composed pref×boost with the yield rule; view state, never snapshotted | 05 §12.2, 18 §4.9 (Height rows/pref) | useUiStore.setTrackHeight + TrackHeader.tsx + Timeline.tsx laneHeightOf |
| C58 | **Project-level properties** — read-only ProjectSheet (D4.4 descoped); full per-stage design pending; also carries the 18 §4.4/§11.6 tab-strip deviation note (type-driven inspector, R20-W3) | 18 §4.4/§11.6, 09 (project-level property home) | components/shell/Toolbar2.tsx ProjectSheet (registered in README) |

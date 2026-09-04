# SPEC-REVISION CANDIDATES — surfaced by the ui-mock (R13 review round)

**What this file is:** the direction-2 output of the UX review waves — places
where building/reviewing the mock exposed that the SPEC SET itself is
internally inconsistent, stale, or missing a canon answer. The mock does NOT
amend specs (Decision 14: contract+gap+acceptance); these are the proposed
amendments for the seal round, each with the mock's evidence.

**Provenance:** R13-W1b spec-compliance review (opus) against specs 05/09/16/18/20
at commit `ebc1604`; cross-checked with `.agents/PLAN.md` seal items 14–25.

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

## D. Seal-item staleness flags (from R13-W1b)

- **Item 16 STALE:** "always-on master micro-meter **+ header micro-meters**" —
  header micro-meters do not exist in the code (only the toolbar master meter +
  dock strips); DESIGN-audio-mode.md §3.2/§11.3/§11.7 presuppose them. Re-scope
  the seal question to the master micro-meter, or re-implement header meters.
- **Item 13:** PLAN is right ("12px strip"), the mock README was wrong (fixed in
  R13 W3).

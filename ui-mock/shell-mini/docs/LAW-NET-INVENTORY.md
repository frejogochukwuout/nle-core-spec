# LAW-NET-INVENTORY — the mini's law corpus as the crawl's acceptance lists

**What this is:** the pre-C1 / pre-C4 deliverable registered in spec 14 §3.1
(the "inventory, spec-side — REQUIRED BEFORE C1 entry") and spec 17 line 3:
the mini's test corpus distilled into the two checklists the crawl consumes —
**Part A: the timeline-law subset** (every law marked HOLDS-on-OT /
GAP-with-owner — C1's entry list), and **Part B: the full corpus** (adding
the chrome/App/MediaPool/timecode/waveform laws — C4's entry list) plus
**Part C: the testid census** (C1's testid-mapping source, C2's viewer-testid
check). The crawl app re-expresses this corpus as app-side tests; this file
is the acceptance list those tests are checked against, row by row.

**Corpus state (sealed at the R23 seal round):** **8 files / 355 tests /
122 law families** — `src/lib/geometry.test.ts` (15 families / 47),
`src/state/useMini.test.ts` (29 / 107), `src/timeline/Timeline.test.tsx`
(47 / 95), `src/App.test.tsx` (18 / 60), `src/shell/MediaPool.test.tsx`
(5 / 19), `src/lib/timecode.test.ts` (3 / 8), `src/lib/waveform.test.ts`
(2 / 7), `src/lib/otProject.test.ts` (3 / 12 — the R23 bridge + fix-round nets).
Lineage: 358 (R21e) → 333 (the R22 drag-machinery retirement, user
directive) → 343 (the R22 review-loop nets) → **355** (the R23 seal
round: the otProject bridge nets + the audit-fix discrimination/guard
nets).

## 0. Counting + classification rules (read before using the tables)

- **Census unit = the law family** (a `describe` block). The app-side
  authoring scope is reported in BOTH columns — families and tests — and
  the test column always sums to exactly 355, so the census is auditable
  against `npx vitest run` at any time.
- **Split rule:** no family carries two dispositions. Where a describe
  block mixes wire-semantics tests with app-policy tests (e.g. `history
  (commit laws)` spans the OT-wire reject AND the app no-op guard), the
  family is SPLIT into sub-rows, each with its own disposition. The split
  is stated inline so C1's executor can port the describe block wholesale
  and still know which assertions are conformance pins and which are
  authored law.
- **Evidence-citation rule:** a law may be marked **HOLDS-on-OT** ONLY if
  an OT-SEAMS row (`docs/OT-SEAMS.md` §1) registers the matching semantics.
  Laws with no OT-SEAMS coverage get **GAP-with-owner** — "verify at
  C1 entry" when the fact is plausibly OT-side but unregistered — never a
  bare HOLDS. (The OT repo is not vendored here; the registered study is
  the only admissible evidence.)
- **Disposition vocabulary:**
  - **HOLDS-on-OT (row N)** — OT's own 459-test suite carries the wire
    semantics; the app's re-pinned version is a *projection conformance*
    test (the app may keep the mini's pin verbatim — it will pass because
    OT implements the same law).
  - **GAP-app-C1** — a view/interaction law OT does not cover; the crawl
    app authors it (the C1 view port reproduces it).
  - **GAP-app-C2 / C3** — a law whose real owner is the engine playback
    boundary (C2) or the audio crawl (C3); the app authors the app-side
    half at that phase.
  - **GAP-W-ops** — a composed edit law (ripple family) whose OT-side
    owner is the W-ops interval-diff family, not C1; the app composes it
    over `timeline.trim`/`timeline.move` at crawl and it graduates at W-ops.
  - **GAP-verify-C1** — plausibly OT-side but NOT registered in OT-SEAMS;
    C1 entry must verify against the vendored OT snapshot and re-file the
    row as HOLDS or GAP.
- **The drag-law freeze (spec 00 Decision D22, spec 14, spec 18 §16.2):**
  the R18k law verbatim is the WHOLE drag law. Every Part A drag row below
  is a *pin of that frozen law* — C1 ports them as-is; nothing here
  re-opens the retired machinery (ghosts / commit-at-UP / pending-gesture /
  tick freeze / scrub edge auto-scroll stay retired; tombstoned OT-SEAMS
  rows re-open ONLY by user request).

## 1. PART A — the timeline-law subset (C1's entry list)

The timeline-side corpus: geometry (15 families / 47 tests) + useMini
(29 / 107) + Timeline (47 / 95) = **91 families / 249 tests**. Split-rule
sub-rows are indented under their family.

### 1.1 geometry.test.ts — the pure interaction laws (`src/lib/geometry.ts`)

| Family | Tests | Disposition | OT-SEAMS | Owner |
|---|---:|---|---|---|
| zoom ladder (9 steps, anchors, default 2) | 4 | GAP-app-C1 (view policy — no OT zoom surface) | — | C1 view port |
| ruler labelStep (≥1s, ≥64px apart) | 3 | GAP-app-C1 (view) | — | C1 view port |
| time↔px | 1 | GAP-app-C1 (view) | — | C1 view port |
| grid + quantize (0.5s) | 2 | GAP-app-C1 (§3.4: the grid becomes the fps quantizer's rounding step when real media lands) | §3.4 | C1 |
| contentEnd (program extent) | 2 | GAP-app-C2 (the engine's composition flatten owns the real program duration) | — | C2 |
| neighborBounds | 2 | GAP-app-C1 (the clamp helper over the app's OT snapshot) | row 3 | C1 |
| **wouldOverlap (the wire validation law)** | 3 | **HOLDS-on-OT** (reject-on-conflict = OT `placement.wouldElementOverlap`) | row 4 | OT 459 |
| clampMove (R18k) | 4 | GAP-app-C1 (the app's drop policy over OT's drag session — the deliberate R18k law) | rows 1+3 | C1 |
| magnetTarget (nearest ≤12px) | 2 | GAP-app-C1 (the single-edge law is the REGISTERED deliberate delta from OT's both-edges `snapGroupEdges`) | row 2 | C1 |
| trim clamps — media-bound both edges | 2 | **HOLDS-on-OT** (the trim bounds law is the surviving seam) | row 6 | OT 459 |
| trim clamps — neighbor + MIN_DUR | 1 | GAP-verify-C1 (OT's min-duration constant is not registered) | row 6 | C1 entry |
| splitPoint — window + quantize | 2 | **HOLDS-on-OT** (split semantics parity) | row 7 | OT 459 |
| splitPoint — MIN_DUR=0.5 constant | 2 | GAP-verify-C1 (row 7 registers the both-halves law itself; only the constant's VALUE is unregistered OT-side) | row 7 | C1 entry |
| resolveSnap (magnet-only snap convention) | 6 | GAP-app-C1 (the R18i pro-NLE convention is app policy) | row 2 | C1 |
| playhead scrub clamp ([0, rulerEnd]) | 1 | GAP-app-C2 (the view clamp; the seek seam itself is OT's) | row 10 | C2 |
| insertionAt (gap-fit) | 6 | GAP-app-C1 (the REGISTERED deviation — OT `firstAvailable` never hunts same-track gaps; C1 disposition: the app computes gap-fit over the snapshot it holds) | row 5 | C1 |
| rippleShiftAfter (+ quantize + floor) | 4 | GAP-W-ops (the follower laws; OT's rippleDelete exists, the interval-diff family is W-ops) | row 9 | W-ops |

### 1.2 useMini.test.ts — the store/operation laws (`src/state/useMini.ts`)

| Family | Tests | Disposition | OT-SEAMS | Owner |
|---|---:|---|---|---|
| seed + reset (the deterministic fixture) | 1 | GAP-app-C1 (the fixture the sceneBridge consumes; see `src/lib/otProject.ts`) | §3 | C1 (d) |
| history — one-entry + nudge-refuses | 2 | **HOLDS-on-OT** (one entry per gesture/commit = snapshot-family parity; nudge conflict = the wire reject) | rows 4+12 | OT 459 |
| history — no-op guard + selection healing | 2 | GAP-app-C1 (app history policy) | row 12 | C1 |
| drag session (preview/end/cancel/lock) | 4 | GAP-app-C1 (the R18k preview law = the app's rendering of OT's never-mutate-during-drag session — the registered micro-delta) | row 1 | C1 |
| splitAtPlayhead — split semantics + sub-1s reject | 2 | **HOLDS-on-OT** | row 7 | OT 459 |
| splitAtPlayhead — fallback/toast laws | 3 | GAP-app-C1 (app selection + feedback policy) | — | C1 |
| append routing (kind → lane) | 1 | GAP-app-C1 (D3.2 app insert policy) | row 5 | C1 |
| playback (wrap, empty guards, scrub extents) | 5 | GAP-app-C2 (engine playhead ownership; the R22 tick-mid-gesture live-magnet law included) | row 10 | C2 |
| history cap + undo/redo honesty | 3 | GAP-app-C1 (MAX_HISTORY=50 is an app budget; undo/redo SEMANTICS hold — row 12) | row 12 | C1 |
| trimClip end-trim media bound | 1 | **HOLDS-on-OT** | row 6 | OT 459 |
| view toggles (snap/ripple/filmstrip/lane) | 3 | GAP-app-C1 (pure view) | — | C1 view port |
| cutHeadAtPlayhead / cutTailAtPlayhead | 6 | GAP-W-ops (composed app-side over `timeline.trim` + the ripple family) | row 9 | W-ops |
| ripple delete — close-the-gap | 1 | **HOLDS-on-OT** (OT `timeline.rippleDelete` semantics) | row 8 | OT 459 |
| ripple delete — off-follower laws | 2 | GAP-app-C1 (app default + same-track law) | row 9 | C1 |
| ripple trim (committed) | 3 | GAP-W-ops | row 9 | W-ops |
| ripple trim (preview, snapshot-relative) | 1 | GAP-app-C1 (view preview law) | row 9 | C1 |
| insertMediaAt — the insert shape | 1 | **HOLDS-on-OT** (the explicit-strategy place) | row 5 | OT 459 |
| insertMediaAt — gap-fit + routing re-validation | 3 | GAP-app-C1 (the registered §1.5 deviation + D3.2 re-validation) | row 5 | C1 |
| ripple quantize law (off-grid follower) | 3 | GAP-W-ops | row 9 | W-ops |
| undo/redo round-trips (exact ripple/insert restores) | 3 | **HOLDS-on-OT** (snapshot-family parity, spec 15 §6.2 strategy 2) | row 12 | OT 459 |
| R18j layout state (collapse/max/aspect) | 5 | GAP-app-C1 (view chrome — C0's port family) | — | C0/C1 |
| R18k track binding + video-only mode | 15 | GAP-app-C1 (the embedding seam — THE C1(c) deliverable) | row 13 | C1 (c) |
| R19 moveClip (overlap-REJECT wire law) | 4 | **HOLDS-on-OT** (the `timeline.move` CONFLICT reject + negative-start reject, verbatim) | row 4 | OT 459 |
| R21 previewMove (the R18k clamp at store level) | 5 | GAP-app-C1 (app drop policy) | rows 1+3 | C1 |
| R21 endDrag (the last-preview seal) | 5 | GAP-app-C1 (app policy; OT's up-within-threshold=cancel is the registered delta) | row 1 | C1 |
| R19 track selection (XOR + healing) | 6 | GAP-app-C1 (the pre-registered single-subject projection) | row 11 | C1 |
| R19 seekToClipHead (edit-point walk-back) | 5 | GAP-app-C2 (transport family; the seek seam is row 10) | row 10 | C2 |
| R19 zoom ladder (store level) | 1 | GAP-app-C1 (view) | — | C1 |
| PR69 C15 (append never below tail) | 2 | GAP-app-C1 (app placement floor) | row 5 | C1 |
| R22 tick mid-gesture (live playhead) | 1 | GAP-app-C2 (the engine playback law) | row 10 | C2 |
| PR69 C52/C4 (bound-world fallbacks) | 3 | GAP-app-C1 (app selection policy) | row 13 | C1 |
| PR69 C48 (left-half selection after split) | 2 | GAP-app-C1 (app policy) | row 11 | C1 |
| R6 XOR post-edit (one inspector subject) | 3 | GAP-app-C1 (app policy) | row 11 | C1 |

### 1.3 Timeline.test.tsx — the component/view laws (`src/timeline/Timeline.tsx`)

All 47 families / 95 tests are **GAP-app-C1** (the view port reproduces
them; OT covers none of the component layer). The bullets below are the
SELECTED families with OT-SEAMS citations for their SEAM half (the
full 47-family enumeration is the file's own describe map — the census
counts it exactly):

- Drag/gesture families (rows 1/2/3 cited): drag-move · single-edge LIVE
  magnet ×2 · neighbors-never-move ×2 · the plain commit law · untrusted
  capture · single-gesture law · pointercancel ×2 · C9 unmount lock
  release · snap-off raw commits.
- DnD families (row 5 cited): pool→timeline DnD · dataTransfer-only
  fallback · collapsed-audio-bar routing.
- Scrub families (row 10 cited): ruler scrub · playhead handle ·
  stateless ruler · edge-park-no-glide · ruler extent re-publish.
- Binding/head families (rows 13/14 cited): track binding rendering ·
  track heads (markers/selectors/hidden) · lane track selection ·
  minimized timeline · video-only rendering.
- Pure view families (no citation): render · selection · trim zones ·
  split glyph · tools row · zoom tiers/anchor/slider · coordinate law ·
  cut styles · ripple/filmstrip/audio-lane toggles · waveform sizing ·
  trim-mode edge shade · keyboard [ / ] · the clip-is-a-button law
  (C2/C46) · scroll preservation · surface swaps · the R18k review-fix
  hardening family · the R18f collapsed-audio-lane placeholder family
  (distinct from C47's routing family above).

**Part A totals:** 91 describes / 249 tests → **97 census units** (6
families split per the split rule) = **10 HOLDS units (21 tests)** + **2
GAP-verify units (3 tests)** + **85 GAP units (225 tests)**. Exact
disposition totals corpus-wide are in §2.3 (the audited arithmetic).

## 2. PART B — the full corpus (C4's entry list)

### 2.1 The chrome-side files (Part A + these = the whole 355)

| File | Families | Tests | Disposition summary |
|---|---:|---:|---|
| `src/App.test.tsx` | 18 | 60 | GAP-app — C0/C1/C2 chrome: shell regions, keyboard-on-shell (the C1(f) keymap surface: C1/C16/C46/C49), inspector (incl. the track card = C2's real subjects), topbar (the C4 export CTA seam), viewer + scrub bar (C2), toast region (the OT error-code rendering surface), splitters (C0), collapse/max/aspect, rails, pool-card guards |
| `src/shell/MediaPool.test.tsx` | 5 | 19 | GAP-app — C2 import flow: type tabs, collapse rail, hover autoplay (C2 real-video seam), image duration honesty (the synthetic-extent law — see otProject's stills caveat), video-only mode |
| `src/lib/timecode.test.ts` | 3 | 8 | GAP-app — C1/C2: fmtTimecode/fmtRulerLabel = the DECLARED single seam for the no-fps decision (flips to frame-accurate TC when fps lands) + the filmstrip determinism smoke |
| `src/lib/waveform.test.ts` | 2 | 7 | GAP-C3 — the WDC/engine decode seam (the synth envelope laws pin the RENDER grammar; C3 replaces the data source) |
| `src/lib/otProject.test.ts` | 3 | 12 | **HOLDS-on-OT** — the registered bridge laws (§3.4 time base + §1.6 element model), the C1(d) fixture-bridge acceptance floor |

### 2.2 The testid census (Part C)

**60 static testids** (from the source census; C1's testid-mapping source,
C2's 12 viewer testids included). NOTE: `mini-clip-harness` is
STORY-SURFACE-ONLY (the Clip-anatomy story's render harness,
`src/stories/Timeline.stories.tsx` — no app component emits it, no test
queries it): the C1 DOM-structural gate checks the **59 app-emitted**
static ids + the 15 templated families; the harness id is a
storybook-only anatomy surface (excluded from the app gate, kept in the
census for completeness):

`mini-root, mini-topbar, mini-btn-export, mini-pool, mini-pool-collapsed,
mini-pool-empty, mini-pool-head-video, mini-pool-list, mini-viewer,
mini-viewer-empty, mini-viewer-frame, mini-viewer-transport,
mini-viewer-aspect, mini-viewer-aspect-select, mini-viewer-scrub,
mini-tc, mini-btn-play, mini-btn-seek-start, mini-btn-seek-cliphead,
mini-btn-viewer-max, mini-inspector, mini-inspector-collapsed,
mini-inspector-empty, mini-inspector-name, mini-inspector-start,
mini-inspector-track, mini-inspector-track-count, mini-timeline,
mini-timeline-scroll, mini-timeline-tools, mini-timeline-zoom,
mini-timeline-min, mini-btn-timeline-min, mini-btn-timeline-expand,
mini-ruler, mini-playhead, mini-snap-guide, mini-clip-harness,
mini-track-mute, mini-toast, mini-toast-close, mini-zoom-slider,
mini-btn-undo, mini-btn-redo, mini-btn-split, mini-btn-cuthead,
mini-btn-cuttail, mini-btn-delete, mini-btn-snap, mini-btn-ripple,
mini-btn-filmstrip, mini-btn-audiolane, mini-btn-nudge-left,
mini-btn-nudge-right, mini-btn-zoomin, mini-btn-zoomout,
mini-btn-pool-collapse, mini-btn-pool-expand, mini-btn-inspector-collapse,
mini-btn-inspector-expand` (the C2 viewer set: `mini-viewer*` (7 — incl. -aspect-select and -empty), `mini-tc`,
`mini-btn-play/seek-start/seek-cliphead/viewer-max` (4) — **12 total**, the
audited count; spec 14's C2 row enumerates them).

**15 templated families** (cardinality = the live doc; expansion rule
stated per family — C1's DOM-structural gate ("the enumerated testid
census present") checks the 59 APP-EMITTED static ids + the families'
presence — mini-clip-harness is story-surface-only, per the note above):

| Template | Expansion | Where |
|---|---|---|
| `mini-clip-${clip.id}` | one per rendered clip | Timeline ClipItem |
| `mini-lane-${track.id}` | per visible track | Timeline Lane |
| `mini-lane-${track.id}-collapsed` | per audio track with the lane collapsed (the placeholder bar) — pinned by the R18f collapsed-lane + C47 routing families | Timeline Lane |
| `mini-min-lane-${track.id}` | per visible track (minimized strip) | Timeline MinLane |
| `mini-track-head-${track.id}` | per visible track — the head CELL renders in every expanded mode; only its select/marker CONTENTS hide when locked (the R18f placeholder keeps the cell) | Timeline head column |
| `mini-track-marker-${track.id}` | per visible track (single-pair unlocked) | marker-badge law |
| `mini-track-select-${track.kind}` | exactly 2 (video+audio) — multi-track unlocked | binding selector |
| `mini-track-mute-chip-${track.id}` | per muted track | lane head |
| `mini-trim-start-${clip.id}` / `mini-trim-end-${clip.id}` | per selected clip (2 families) | ClipItem handles |
| `mini-drop-outline-${track.id}` | per lane during a pool drag | DnD ghost |
| `mini-media-${media.id}` | per pool card | MediaPool |
| `mini-dur-${media.id}` | per video/audio pool card | MediaPool |
| `mini-pool-tab-${t.id}` | per filter tab (4: all/video/image/audio) | MediaPool head |
| `mini-splitter-${axis-}` | 3 (pool/inspector/timeline) | Splitter |

### 2.3 The disposition totals (the audited arithmetic)

Census units = top-level describes, with the 6 split families counting
their sub-rows (122 describes → 128 units); the test column sums to 355
(auditable against `npx vitest run`).

| Disposition | Census units | Tests |
|---|---:|---:|
| HOLDS-on-OT (projection conformance) | 13 | 33 |
| GAP-app-C0/C1/C2 (view + policy; authored across the crawl's view phases) | 102 | 282 |
| GAP-C2/C3 (engine/audio boundary) | 7 | 21 |
| GAP-W-ops (composed ripple family) | 4 | 16 |
| GAP-verify-C1 (constant verification) | 2 | 3 |
| **Total** | **128** | **355** |

(The four GAP classes are all "GAP-with-owner" in the spec-14 vocabulary —
the owner is the phase in the class name.)

### 2.4 The app-side authoring count + the ARCH-R22 reconciliation

**The exact app-side authoring scope: 322 tests across 115 GAP census
units** (355 − 33 HOLDS tests; 128 − 13 HOLDS units). The crawl app
re-authors these as app-side tests; the 33 HOLDS tests may be kept
near-verbatim as projection conformance pins (they will pass over real
OT for the same reasons the mini's pass over the mock).

**Reconciliation with ARCH-R22's "~130-180 view/chrome/window/policy
laws" bound (the C4 gate text):** that estimate counted LAWS, not tests,
at the 333-test corpus. The exact census at the census-unit level is
**115 GAP units** (within the estimate's intent — the estimate was honest
but coarse); at the test unit it is 322. **The C4 gate should consume the
census-unit count (115) as the scope headline and the test count (322)
as the corpus total** — this file supersedes the ~130-180 bound (spec 14's
C4 row is amended to point here; ARCH-R22 line 51 carries the supersession
note). No scope blowout occurred: the mini's many-cases-per-law test style
(e.g. 95 component tests over ~47 view laws) was always the corpus shape;
the estimate simply predated the census.

## 3. How the crawl consumes this (the gate wording)

- **C1 entry (spec 14 §3.1):** every Part A row is HOLDS-on-OT or
  GAP-with-owner — nothing un-owned. The GAP-verify rows (trim MIN_DUR,
  split MIN_DUR) are verified against the vendored OT snapshot at entry
  and re-filed. The testid census (§2.2) is the DOM-structural gate's
  enumeration source.
- **C2 entry:** the viewer/transport rows (scrub bar, seek controls,
  transport grammar) + the C2-flagged families (playback, seekToClipHead,
  contentEnd, scrub clamps) bind to engine playhead ownership; the 12
  viewer testids are the enumerated check.
- **C3 entry (audio):** `src/lib/waveform.test.ts` (the 2 GAP-C3
  families — the bar grammar + envelope laws) + the mute laws (the flag
  + visual law live in `src/state/useMini.test.ts`'s toggleTrackMute
  coverage + `src/App.test.tsx`'s "R19 — inspector track card" family —
  2 of its 3 tests carry the mute-chip assertions); C3 binds them to
  WDC/engine (the one-owner law, CORE-SEAMS S17).
- **C4 exit (the mini-parity gate):** this whole file checked row-by-row
  — the app's re-expressed corpus satisfies every law; the arithmetic in
  §2.3/§2.4 is the authoring-count audit; the demo (import → cut → play
  → export) rides on top.
- 
> **R23 mapping note (ARCH-R23 D23/D24):** spec 14 is RETIRED — the plan is `IMPLEMENTATION-PLAN.md` and the phases are the D24 verification ladder. This file's C0-C4/spec-14 citations map: C1(b,d,e,f)+C1(c)→K3; C1(a)/C2-frames→w1; C3→K3; C4→K4 (+ the human side-by-side→w1-entry); the 'crawl' below means the K3 corpus authoring, not the R22 C-ladder. The disposition vocabulary (HOLDS-on-OT / GAP-app-C1 / GAP-C2/C3 / GAP-W-ops) maps to K3 / w1 / K3 / K3-compose+r1-graduate respectively.
**Standing law:** this file is generated from the live corpus — if the
  mini's tests change, THIS FILE MUST BE RE-CENSUSED (the counts are
  battery-checkable: `npx vitest run` == 355 tests / 8 files; 122
describes → 128 census units).

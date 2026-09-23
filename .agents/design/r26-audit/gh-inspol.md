# R26-W-A8 — GH (inspector + early-polish residue) audit report

**Auditor:** the orchestrator itself (three sub-agent dispatches died at launch — backend
adapter saturation; SKILL #147 applied: the tight-scope work was done directly).
**Freshness:** :3000 = 126 stories at HEAD `5e71895`; probes on isolated session
`gh-orcho` @1600×1000; real typecheck clean (`node_modules/.bin/tsc --noEmit`, exit 0).

## Part 1 — the inspector threads

| Thread | Ask | Verdict | Evidence |
|---|---|---|---|
| T#7 (Inspector.tsx:804) | "when nothing to inspect this shouldn't be here either" + the Resolve-research ask (clear? track fallback?) | **PROPER** | Live: Escape (clear selection) → the inspector renders the ACTIVE-TRACK fallback — `Track — V1 · Main · active / Select a clip to edit clip parameters / TrackKind Main 4 clips Mute Solo Lock Visible…` — exactly the reviewer's own suggested direction ("perhaps it is the track (current active one)"), via the same TrackSheet component (Inspector.tsx:567, :1705; th_mto5fdf6 pin). Matches the research verdict (Resolve/Premiere clear; track-level = the Fairlight pattern). |
| T#88 (GH #142) | "make sure the inspector content refresh after view / editor mode change" | **PROPER** | Live: text-clip selected under Edit (inspector = MARINA text grammar: TextContent/Language/CPS) → switch to Color → the slot mounts `shell-color-inspector` (breadcrumb + 3-chip GRADE TARGET clip/timeline/node + [Primaries\|Curves\|Qualifier] tabs) — no stale Transform/text content. Structural: each page mounts its own inspector (AppShell), "one component, two frames" for the FX domain (Inspector.tsx:1907-1912). |
| T#34 clause | "if you absolutely need to surface these info, put those in inspector or a separate console panel" | **PROPER** | GE-audited: deliver inspector = settings-only; the export summary lives on the console row's Export tab. |
| Shared law | inspector reacts to selection TYPE across views | **PROPER** | Code: the domain-swap law (selectedTrackId / selectedEffectId composite / selectedMarkerId — one domain at a time, Inspector.tsx:10-22); marker/caption rail panels reuse the exported field contracts; the audio view's channel selection → ChannelEditor (GB-audited live). |

## Part 2 — the R18-era regression sweep

| Claim (R18e-g) | Live/code check at HEAD | Holds? |
|---|---|---|
| Clip corners near-square 2px | computed `borderRadius: 2px` on clip-el (live) | ✓ |
| Panel elevation + hairlines, no dot-grid | tokens + GA/GF live probes (elevated surfaces across pages) | ✓ |
| Media cards natural height + scroll | GF live probe (pool list scrolls; PREVIEW chip sweep) | ✓ |
| Radii ladder (panels 8 / controls 4 / tracks 4) | tokens.css (spot: clip 2px live; controls 4px code) | ✓ |
| Splitter hover accent + boundary semantics | GB live (splitter-drop toast; drag semantics) | ✓ |
| Video frame square | code (`border-radius 0` on stage) + GA viewer probes | ✓ |
| Transport below video, centered | live: Play/pause + loop at y≈406-408 (viewer transport row) | ✓ |
| Topbar = brand + Export only | GF probe (transport gone from topbar) | ✓ |
| Playhead Enter no-op + arrows scrub | code (swallowed preventDefault; ±0.5s arrows) — R18e pin | ✓ |
| Waveform real envelopes ≥1 bar | GG live (audio 91px filmstrip+wave; R19 negative-width fix pinned) | ✓ |
| S splits; [ ] cut head/tail | code + R18e/R20 pins (useKeys; e.code guards) | ✓ |
| Ripple edit toggle law | code (delete closes gap; frozen-left-edge) + pins | ✓ |
| **Snap OFF by default (T-snap story ask)** | **REGRESSION**: live `aria-pressed="true"` at boot; `useUiStore.ts:1173` `snap: true` — the R18e OFF-default was lost in the R20 store reorganization, and `TimelineToolbar.test.tsx:167` now PINS the regressed default as law | **✗ F2** |
| Loop brackets clamp at edges | GE live (in/out pinned + clamped, both surfaces) | ✓ |
| Markers in dedicated ruler band | live (In/Mid/Out pins at y=150-196 = ruler band region, above lanes) + R19/W0 fix | ✓ |
| Filmstrip toggle + color-block bodies | GG (filmstrip/compact ladder; color tokens measured) | ✓ |
| Audio-lane eye toggle | code + R18f pin (collapsed 'A1 · N hidden' restore) | ✓ |
| Text clips thin centered bars | live (clip-el-5 = the text clip; clamp(20, lane·0.4, 28) code) | ✓ |
| Track-head height adjustable | GG live (A1 badge) + drag-strip code (R20-W5) | ✓ |
| Marker floating pins | fixed R20-W0 (unlayered CSS) — regression-pinned | ✓ |

## Fix queue (merged into the round's W-F)

- **F2 (this group, P2): the snap-default regression** — `useUiStore.ts:1173`
  `snap: true` → `false`, and RE-PIN `TimelineToolbar.test.tsx:164-171` (the test
  currently asserts `'true'` at boot — pinning the bug; flip to `'false'` + the
  toggle path unchanged). This is the reviewer's own ask, live-broken.
- No other Part-1/Part-2 failures.

## Probe artifacts (for W-V)

- The `[data-testid=shell-inspector]` is the EDIT-view testid; Color mounts
  `shell-color-inspector` (the T#88 probe must target per-page testids).
- **The display-layer escape-eating false-corruption**: `Inspector.tsx:1691`
  `const [mockT, setMockT]` DISPLAYS as `const ockT, setMockT]` through every
  Read/grep/cat path (an ANSI-ish `[m` artifact in the tool-output renderer) while
  tsc/tests/build/app are all green. Settled by `od -c` (bytes correct). LAW: a
  "corruption" that contradicts ALL gates gets a byte-level dump before it's a
  finding — never debug the display layer from rendered text.

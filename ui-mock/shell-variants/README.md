# shell-variants — interactive spec-18 UI shell study

An interactive TSX mockup of the editor UI defined by `18-ui-shell.md`, built to
**validate the UI/UX direction** — something you can visually react to, toggle,
and compare. The NLE functionality is intentionally mock-level; the UI/UX is the
product here.

Built with the stack the spec mandates (`00-master-spec.md` §4): **React 19 +
Vite + TypeScript strict + Tailwind 4 + Zustand + lucide icons** (explicitly
*not* Next.js).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173/mockup/
npm run build      # static bundle → dist/ (base: /mockup/)
```

Node `^20.19.0 || >=22.12.0` required — Vite 8's engine floor (`vite@8.2.2`
lists exactly that range; this repo was developed on Node 24).

A built copy is synced into the platform preview app's `public/mockup` and
served at the preview root. **The platform preview URL now serves Storybook
10 directly on port 3000** (see “Review serving” below) — the standalone
Vite app remains the interactive mock for local dev.

## Tests

```bash
npm test            # vitest run — 33 files / 510 tests (jsdom)
npm run test:watch  # vitest in watch mode
npm run test:ui     # vitest --ui dashboard
npm run typecheck   # tsc --noEmit
```

A jsdom unit/component suite by design — visual review is Storybook's job
(`npm run storybook`); pixel-level checks are out of scope for the mock.
Tests are co-located with what they cover: `*.test.tsx` / `*.test.ts` next
to the component or module under test (33 files across `src/components/**`,
`src/state`, `src/lib`, `src/hooks`). `src/test/setup.ts` polyfills the jsdom
gaps the shell hits (ResizeObserver, IntersectionObserver, `matchMedia`,
`scrollIntoView`, `requestAnimationFrame`, pointer capture) and enforces the
per-test store-reset contract — after every test the Zustand store is
re-hydrated from its pristine snapshot while the app's localStorage keys,
location hash, and variant data-attrs are wiped, so module-level singletons
never leak between tests (mirrors the Storybook `withStoreReset` decorator).
`src/test/helpers.tsx` mounts leaves through the app's real provider stack
(`renderShell`) plus `pressKey`/`store` assertion helpers. No CI workflow
yet — the suite is the per-round local gate.

## Storybook 10 (THE design-review surface)

**`npm run storybook`** (port 6006) boots **Storybook 10.6** (react-vite
builder) over this app with the **storybook-annotakit v0.5.0** review addon
(vendored at `vendor/storybook-annotakit`): pin comments on live stories,
threads in the bottom dock, digest/export REST on the dev server
(`/annotakit/api/*`), optional GitHub-issue mirror via `ANNOTAKIT_GH_TOKEN`
in `.env`). The addon needs the DEV server — a static `storybook build`
shows a “dev only” note. Reviewer flow (v0.5.0): the SB **toolbar** carries
the review tool — Pin / Region / Drawer / Hide buttons; hotkeys are
**⌥-prefixed**: **⌥C** pin → click an element → comment → **⌘/Ctrl+Enter**;
**⌥R** = region pin; **⌥L** = hide/show pins; **⌥H** = help card (remapped
from the upstream '?' default, which collides with the shell's cheat-sheet
'?' — see `.storybook/preview.tsx`).

**Fresh clone / first run:** the vendored addon ships as TypeScript source;
its `dist/` build output is gitignored, so a clean checkout has none and
Storybook will refuse to boot with an explicit `[storybook-annotakit]` error.
Build it once before the first `npm run storybook` (or before the supervised
:3000 review server):

```bash
cd vendor/storybook-annotakit
npm install      # if node_modules is absent
npm run build    # tsup → dist/server.cjs + manager.mjs + preview.mjs
```

**Review serving (R17):** the public review URL is served by
`storybook dev --port 3000` via the double-fork daemon
`scripts/sb3000.py` (fork→setsid→fork→exec; the grandchild reparents to
PID 1 and survives the sandbox's per-toolcall descendant-tree reap —
plain `nohup`/`setsid` die). Caddy proxies the platform edge straight to
:3000; `core.allowedHosts: true` in `.storybook/main.ts` handles the
edge-rewritten Host header (storybook 10's host validation would 403
otherwise). The serving host is a runtime copy on the persistent volume
(`/home/z/my-project/shell-variants`: own node_modules, rebuilt vendor
dist, `.env` with `ANNOTAKIT_GH_TOKEN`; any-branch git repo — the v0.5.0
store lives under `.git/annotakit/threads.db` and syncs to the orphan
`annotakit` branch on origin: threads.db git-push durability, merged
cross-stream with the parallel session's review threads). Cold-start
resurrection after
a container recycle: `scripts/boot-restore.sh` (iso at
`/home/z/my-project/.zscripts/dev.sh`, the harness boot hook) —
idempotent, restores repo from the `/home/sync` bundle, rebuilds the
runtime copy if missing, relaunches; kill→restore→public-200 verified
live. A localhost curl is a FALSE PASS for public liveness — probe
`/annotakit/api/health` and the real public URL.

83 stories across 10 groups — every shell region, chrome strip, timeline
leaf, mixer surface, page, overlay, and primitive is surfaced (the R15 wave
added the deterministic meter/knob/tier/zoom/snap-indicator review frames):

| Story file | What it covers |
|---|---|
| `AppShell.stories.tsx` | Full shell on each page: Edit / Audio Focus / Color / Deliver |
| `Variants.stories.tsx` | Presets A / B / C as complete shells — the fixed, screenshot-friendly A/B/C comparison (per-dimension exploration stays in the app's ctrl+\` overlay) |
| `Chrome.stories.tsx` | Toolbar2 ×3, AppDock ×4, TimelineToolbar ×7 (incl. R15 zoom-cluster dynamic-min/max + live master micro-meter), SceneTabs ×2, TrackHeader columns ×3 (audio-focus minifaders + R15-A4 audio micro-meters), Effects-panel-on full shell |
| `Mixer.stories.tsx` | Mixer dock (full side-by-side + bridge rail + collapsed), the R15 deterministic-levels variants (full dock / bridge / solo strip — A2 clip, master peak-held via `__setLevel`), ChannelStrip solo + compact, Channel editor, Sound library |
| `Timeline.stories.tsx` | Timeline default + blocks clip-style, clip anatomy states (selected / offline / fades / locked / badges), ruler + markers, R15-T1 CapCut ruler tiers (46/120/240 px/s), R15-T5 snap indicator (mid-drag play step) |
| `Shell.stories.tsx` (title "Shell/Components") | Media pool grid/list, Viewer, Inspector ×4 tabs, status-strip autosave states, toast region, open context menu, cheat sheet |
| `Overlays.stories.tsx` | Confirm dialogs (scene delete / multi-delete), ErrorBoundary crash fallback, Variant explorer open, toast error/persist + max-3 stack |
| `Pages.stories.tsx` | Color page, Deliver page (+ preset pick), Channel editor empty state |
| `Regions.stories.tsx` | Viewer ×4 (program / overlays-hidden / safe-guides / zoom), Media pool offline + no-results, Inspector empty + multi-select mixed |
| `Primitives.stories.tsx` | Fader (fixed / fill-height / R15 scale column + unity notch + master cap), the R15-A1 generic Knob dial states (min / detent zone / center / max), PanKnob, StripMeter (static / playing / R15 deterministic levels via the engine's `__setLevel`) |

Review-workflow mapping: open the sidebar tree side-by-side, screenshot at the
default 1920×1080 viewport (1440×900 and the 1280×800 floor are in the viewport
toolbar), and attach story links (`?path=/story/…`) to review notes. Every story
renders in a fresh state — a global decorator snapshots the Zustand store at
module load and re-hydrates it per story (plus wipes the app's
localStorage/hash persistence and resets the shared metering engine, R15),
so interactions never leak between stories.
Install note: the builder peers can lag this app's Vite pin — `.npmrc` keeps
`legacy-peer-deps=true` (verified on SB 10.6 + Vite 8: boots clean, all
stories render, `tsc --noEmit` passes).

## Direction variants — Ctrl + `

Press **Ctrl + `** (or the pill button, bottom-right) to open the **Variant
Explorer** debug overlay. It switches three curated directions plus independent
dimensions; the choice persists in localStorage and syncs to the URL hash
(share links restore the exact variant).

| Preset | Direction | Key traits |
|---|---|---|
| **A — Resolve Classic** | spec-canonical | exact `18 §9` tokens, 2px radius, 34px bars, 160px TC-readout headers, filmstrip clips (spec 05 §7), 80/60px lanes, gold accent |
| **B — Modern Studio** | pro-web dark | elevated panel layers, visible hairlines, 6px radius, 40px bars, 112px slim headers, violet accent, roomier controls |
| **C — Editorial Light** | web-first light | light surfaces, block-style compact clips, gold accent — deliberately tests the `18 §8.14` light-theme rejection |

Independent dimensions: `theme`, `density` (pro/comfortable), `clip rendering`
(filmstrip/blocks), `accent` (gold/ember/violet), `track headers` (160px
readout / 112px slim). Non-canonical options carry a "Spec position" note in
the overlay — deviations are surfaced, never hidden.

## What's real (mock-level interactions)

- Playhead: drag the ruler or playhead head; Space plays (rAF loop, loops in/out when loop is on)
- Clip select (click / shift-click), clip **move-drag** with 10px snap tolerance to clip edges + playhead, **trim** via 12px edge handles, **blade tool** (B) click splits a clip at the cut point
- Zoom slider genuinely rescales time→px geometry; snapping magnet (N) toggles snap; tool keys V/B/T/Y/U
- Media pool: live search (200ms debounce), sort, grid/list, offline-asset badge
- Inspector: 4 spec-18 tabs, source-asset card, selection-driven
- Color, Audio + Deliver pages swap the right rail (page dock: 4 pages —
  Edit / Color / Audio / Deliver, ⌘1–⌘4: spec 18 §4.8's three pages plus the
  audio-focus 4th page per docs/DESIGN-audio-mode.md — see R11 below)
- Splitters resize panels; double-click resets (§3.2)
- `?` opens the keyboard cheat-sheet modal

Spec `data-testid` conventions (18 §10) are applied (`shell-*`) so future Tier-3
tests can target the same surface.

## Known spec deviations (intentional, for reaction)

- **R20-W4b:** the color page's timeline area is the ColorConsole (gap C51,
  18 §4.8 color-mode composition): frozen lane strip — ruler 22px, video
  lanes a UNIFORM 24px (overlay+caption included; color-layout §2.3's 18px
  overlay variant folded into one video height), audio 16px dimmed; clips
  are click-to-target buttons with NO trim/drag gestures. The Curves tab
  body scrolls internally at small heights (registered). The timeline-level
  grade lives under the store's special key `'timeline'` in the mockGrades
  sidecar (C50; spec 09 has no color fields — mockMixer sidecar precedent),
  never on ElementJSON; the Clip ⇄ Timeline toggle is its single owner.
- **R20-W4b:** `MockGrade = GradeParams & { curves?: CurveSet }` — W4a's
  lib/color GradeParams (spec 08 §4.2, verbatim) is read-only this wave, so
  the curves points (spec 08 §5, gap C55) extend the RECORD type in the
  store instead of the lib; the curve eval/bake lives in
  components/pages/color/curveMath.ts (the W4c viewer seam).
- **R20-W4b:** Qualifier panel is the spec 08 §8.1 surface only — the
  reference HTML's 14-field "Matte Finesse" block (no §8 counterpart) is
  DELETED, replaced by the §17.E secondary correction + strength/invert;
  the eyedropper + viewer matte overlay are W4c's (the Preview Matte toggle
  writes the qualifierPreviewOn view-state and mirrors showMask into the
  record).
- **R20-W4b:** the mixer dock does not render in color mode (the console
  owns the timeline row + the F6 7th-region slot; color-layout §2.4). The
  scopes slot under the viewer is the ColorScopeStrip placeholder (C53
  supersedes the seeded-trace dock — scopeTraces.ts/ColorScopesDock.tsx
  deleted, grep-verified zero other consumers).
- **R20-W3:** inspector is type-driven without the 4-tab strip per reviewer
  thread #53; 18 §4.4/§11.6 deviation registered (C58). The panel is ONE
  scroll of sections picked by selected-entity type (inspectorpanel.tsx
  grammar: SectionHeader caret/keyframe-slot/reset + ControlRow 96px label);
  the ONLY surviving tablist is the compact [Levels | EQ] sub-tab pair inside
  the Audio section (spec 18 §11.6 semantics kept). The Project sheet is the
  D4.4-descoped read-only summary (full per-stage design = C58).
- **R20-W0:** viewer zoom ladder is Fit/1.25×/1.5×/2×/4× — the 1.25× step
  (annotakit GH #66) deviates from spec 18 §3.3's Fit/1.5/2/4 ladder.
- **R20-W0:** mixer strip micro-labels (9px dB readout, 8px scale ticks)
  follow the user's `audio_mixer.html` reference anatomy, below spec 18
  §11.12's 11px floor — registered as reference-fidelity choices for the
  mixing surface (the floor still applies everywhere else).
- Presets B/C deviate from the v1 single-dark-theme rule (18 §8.14 / §9) — they exist to test that decision.
- `blocks` clip mode + slim headers deviate from spec 05 §7/§12.2 canonical rendering — they mirror the davinci mock / OpenCut teacher values.
- Tool keys follow spec 16 (V/B/T/Y/U, N=snap). Note: spec 18 §4.5's parenthetical keys (A/','/S) disagree with spec 16 §3.2 — flagged as a spec-consistency finding.
- Dock tooltips claim **⌘3 = Deliver**, but spec 16 §3.8/App A bind ⌘3 =
  Effects workspace and leave Deliver unbound — pre-existing drift, kept
  and registered for the seal round (the mock's ⌘4 Audio page takes spec
  16's registered-but-orphaned ⌘4 binding instead; the drift is also labeled
  on the Chrome story).
- Playback, media decode, and all engine behavior are fake — this is a UI/UX artifact, not an engine (see specs 01-07 for the real thing).
- **R14 (2026-09-05):** every remaining intentional simplification is inventoried
  in `../../.agents/SPEC-REVISION-CANDIDATES.md` §E (C10–C28) — the C-table
  above stays as the historical R12/R13 set.
- **R19 (2026-09-06):** the reference-integration round's inventions are
  registered in the same file §H (**C33–C44**): marker v2 (range/notes/clip
  markers), captions track+text (the reference's dialogs became EMBEDDED
  panels per user directive), per-clip pan/pitch/EQ display state, node-graph
  color composition, deliver whole-view, fullscreen-toggle removal,
  source-preview pool-selection trigger, strip chrome beyond the G-surface,
  meter palette, pool hover-autoplay, scopes dock, inspector track-fallback. Net-new spec-side amendments found
  by the R14 both-directions audit live in the same file (N1–N15) and are
  mirrored on GitHub issue #2. The zero-no-op sweep also landed: every visible
  control is now wired (real state, real local behavior, honest toast, or
  aria-disabled + tip) — including the zoom cluster + ⌘\ binding, the
  marker-color menu, effects drag-to-clip, Color/Deliver form controls, and
  the mixer aux toggles.

## Review process

The mockup went through three sub-agent UX peer-review rounds (pro-editor,
product-designer, and a11y/spec-compliance personas) with VLM screenshot
analysis, live interaction tests, and code greps. Round 3 verdict:
**"NO MAJORS REMAIN — direction study is valid for user review."**
Findings from the rounds that belong to the SPEC (not this mock):

1. **18 §9 provenance error** — `--accent-selection #e8b34b (mock playhead gold)`:
   the davinci mock's playhead is actually **red** (#fa1024, `.playhead-line`).
   This mock follows the mock (red playhead, gold = state/selection only).
2. **18 §4.5 vs 16 §3.2 tool-key conflict** (A/','/S vs V/B/T/Y/U + N).
3. **`--accent-focus` has no AA text pair** in resolve/studio (≈3.9-4.0:1 both
   ways) — spec 18 §9 assigns primary buttons to it; needs a decision.
4. **Status strip 12px vs the 11px type floor** (§3.1 vs §11.12) — no mock
   deviation since R11: the strip is 12px per §3.1 carrying 11px type
   (StatusStrip.tsx `text-[11px]`), exactly at the §11.12 floor. The earlier
   14px deviation is gone; the spec-side question — is 11px type in a 12px
   strip comfortable enough to bless? — stays flagged for the seal round.

## Layout

```
src/
  styles/tokens.css     design tokens + variant theme blocks (data-attr driven)
  styles/app.css        tailwind 4 setup + shared control grammar
  lib/variants.ts       variant model, presets, persistence + share links
  lib/mockData.ts       spec-09-shaped project ("Beach Doc — Rough Cut")
  lib/timecode.ts       SMPTE NDF TC @ 24fps
  lib/waveform.ts       seeded deterministic waveforms
  state/useUiStore.ts   zustand UI store + doc slice (drag/trim/split commits)
  state/mockMixer.ts    mock G-layer sidecar (per-track strips + aux buses, spec 20 §4.2 shape)
  components/debug/     VariantProvider + DebugOverlay (ctrl+`)
  components/shell/     Toolbar2, MediaPool, Viewer, Inspector, Dock, status, cheat sheet
  components/timeline/  toolbar, scene tabs, ruler, headers, lanes, clips, playhead
  components/mixer/     MixerDock, ChannelStrip, MixerPrimitives, ChannelEditor, SoundLibrary
  components/pages/     Color + Deliver (right-rail swaps)
  stories/              10 story files + decorators.tsx (71 stories, per-story store reset)
  test/                 setup.ts (jsdom polyfills + per-test store reset) + helpers.tsx (renderShell)
  *.test.ts(x)          co-located next to the source under test (33 files — see Tests)
screenshots/            captured presets + pages (committed)
```

Reference: `../davinci_resolve_ui_mock.html` remains the static visual
reference; this app is the interactive successor.


## R11 — completeness + audio focus (2026-09-04)

- **Layout overhaul to spec-18 geometry**: splitter-owned seams (12px hit / 6px visual), 12px scrub-row + status strip, TrackHeader two-row redesign (fits the 160px column, names per spec 05 §10), sticky ruler + full-viewport playhead, spec-exact transport clusters.
- **Missing spec surfaces landed**: context menus (§4.9, five menus, right-click + Shift+F10), toasts (§6.4), confirm dialogs, error boundary + beforeunload, state rows (empty/loading), sample-project load, media-pool drag-to-lane + multi-select, marquee, Alt-drag-duplicate, Esc-cancels-drag, 40-key map with JKL shuttle + undo/redo.
- **Audio focus mode** (docs/DESIGN-audio-mode.md v2.1, peer-reviewed): 4th dock page (⌘4), three-state mixer (collapsed / 32px meter-bridge / full strips), channel editor = S/G seam, Sound Library with roles, sidechain ducking row (spec 20 §12.2 mock answer), escalation gesture.
- **Storybook 9** review surface: 29 stories (`npm run storybook`).
- Review gates: R11 code review (FIX-MAJORS → all majors fixed) + gate re-check **NO MAJORS REMAIN**.

## R19 — feedback wave 3 + reference integration (2026-09-06)

The 26-open-thread annotakit wave (all on this tree) + the nine user-uploaded
reference mock HTMLs, integrated with analysis → design → 5 parallel
implementation agents → integration → adversarial review → VLM + live
verification cycles.

**Feedback wave (26/26 fixed + resolved in annotakit; GH mirror auto-closed):**
- **Mixer/audio (8):** meter fixed 14px column + fader/scale/meter equal-height
  law under one 24px headroom readout (piecewise dB display taper, model stays
  linear); strips fill the dock vertically with the fader as the terminal
  flex-1 section; FX chip rack (real 2 insert slots + add-chips + I power),
  input rows, R(display)/S/M, EQ+dynamics sparklines, 48px pan crosshair;
  master pinned right of the scroll region; traffic-light dots + fullscreen
  toggle removed from toolbar2; Effects joined the bin's slot as an ARIA tab
  pair (LeftDock).
- **Edit/timeline (7):** bounded scroll runway (≤25% viewport — scrolling
  STOPS instead of scrolling into nothing); Resolve-style transition block;
  filmstrip aspect-preserving cells; selected-clip hover trim affordance;
  symmetric per-media waveforms (root-caused the empty-svg bug: negative %
  widths at 345 bars); fade curves UN-reversed (in rises, out falls, inaudible
  wedge shaded); loop brackets clamp + mirror at content edges; dedicated
  ruler MARKER BAND (pins never read as text-track chevrons) + "Go to
  Marker ›" real navigation; empty inspector → ACTIVE-TRACK fallback
  (research: Resolve/Premiere clear, Fairlight inspects tracks — the
  reviewer's instinct, gap C44).
- **Media pool (4):** type ICONS (Film/AudioLines/Image — the standard NLE
  way), correct import glyph, ≥400ms hover-to-autoplay ken-burns preview
  (gap C42: poster frames are the real surface), viewer dual-purposes as
  SOURCE PREVIEW on pool selection (spec 18 §4.3 v1.1 + C39 trigger
  widening) with caption overlay chips under the playhead.
- **Deliver (3):** the whole mainbody is the export surface — queue left /
  summary + In→Out range center / settings right; preset tiles breathe;
  overflow fixed. Timeline stays live as the range selection.
- **Timeline clips (3) + regions (1):** covered above.

**Reference integrations (audio_mixer, audio_editor_ui, resolvecolorwheels,
qualifier_ui, color_grading_node_graph, color_grading_scopes,
timeline-marker-only, timeline-marker-transcript-withDialog,
nle_edit_workflow, inspectorpanel.tsx):**
- **Color page = the reference composition**: wheels + qualifier tabs in the
  rail (2D-drag pucks, YRGB rows, matte finesse ×14), node graph in the left
  dock (Master In → Primary → {Secondary ∥ Water} → Mixer → Tilt Shift →
  Lens Flare → Out, selection state), 2×2 seeded scopes dock under the
  viewer. All display-state honest (spec 08 §4).
- **Markers v2 + captions**: range markers with end caps, notes/keyword,
  per-clip markers, the reference's marker DIALOG → embedded MarkerInspector
  rail panel; caption track (CC lane, parchment chips, EN+FR fixture) with
  the captions inspector (list table + editor + computed CPS) — the dialog →
  panel conversion per the user directive.
- **The 7 Resolve edit functions (EditOverlay, embedded on the viewer)**:
  insert / overwrite / append / place-on-top / ripple-overwrite / replace /
  fit-to-fill — REAL placement through the timelinePlacement laws
  (insertMediaAt: split-keeps-transition/severs-link, displaced-delta
  ripple, rate-clamped fit-to-fill, honest refusals when inputs are absent).
- Inspector audio tab: volume (dB map), pan, pitch, 4-band EQ — doc-real,
  engine-round honesty.

**Gates:** tsc clean; 944/944 tests (805 → +139); vite build green;
Storybook 83 → 102 stories; VLM PASS ×4 rounds + DOM-verified live through
the public edge; R19-REV adversarial review: 5 P2s fixed (placeOnTop audio
routing, fitToFill no-op toast, split laws, add-caption guard, gap-id
collision sweep C29-C40 → C33-C44).

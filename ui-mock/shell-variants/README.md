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
npm test            # vitest run — 33 files / 461 tests (jsdom)
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
builder) over this app with the **storybook-annotakit** review addon
(vendored at `vendor/storybook-annotakit`): pin comments on live stories,
threads in the bottom dock, digest/export REST on the dev server
(`/annotakit/api/*`), optional GitHub-issue mirror via `ANNOTAKIT_GH_TOKEN`
in `.env`). The addon needs the DEV server — a static `storybook build`
shows a “dev only” note. Reviewer flow: press **C** → click an element →
comment → **⌘/Ctrl+Enter**; **R** = region pin; **L** = hide/show pins.

**Review serving (R12):** the public review URL is served by
`storybook dev --port 3000` under a supervisor (`scripts/sb-supervisor.mjs`
in the platform workspace) that replaces the old `next dev` on :3000 —
Caddy proxies the platform edge straight to it. `core.allowedHosts: true`
in `.storybook/main.ts` (the edge rewrites the Host header; storybook 10's
host validation would 403 otherwise).

71 stories across 10 groups — every shell region, chrome strip, timeline
leaf, mixer surface, page, overlay, and primitive is surfaced:

| Story file | What it covers |
|---|---|
| `AppShell.stories.tsx` | Full shell on each page: Edit / Audio Focus / Color / Deliver |
| `Variants.stories.tsx` | Presets A / B / C as complete shells — the fixed, screenshot-friendly A/B/C comparison (per-dimension exploration stays in the app's ctrl+\` overlay) |
| `Chrome.stories.tsx` | Toolbar2 ×3, AppDock ×4, TimelineToolbar ×4, SceneTabs ×2, TrackHeader columns ×2 (incl. audio-focus minifaders), Effects-panel-on full shell |
| `Mixer.stories.tsx` | Mixer dock (full side-by-side + bridge rail + collapsed), ChannelStrip solo + compact, Channel editor, Sound library |
| `Timeline.stories.tsx` | Timeline default + blocks clip-style, clip anatomy states (selected / offline / fades / locked / badges), ruler + markers |
| `Shell.stories.tsx` (title "Shell/Components") | Media pool grid/list, Viewer, Inspector ×4 tabs, status-strip autosave states, toast region, open context menu, cheat sheet |
| `Overlays.stories.tsx` | Confirm dialogs (scene delete / multi-delete), ErrorBoundary crash fallback, Variant explorer open, toast error/persist + max-3 stack |
| `Pages.stories.tsx` | Color page, Deliver page (+ preset pick), Channel editor empty state |
| `Regions.stories.tsx` | Viewer ×4 (program / overlays-hidden / safe-guides / zoom), Media pool offline + no-results, Inspector empty + multi-select mixed |
| `Primitives.stories.tsx` | Fader (fixed + fill-height), PanKnob, StripMeter (static / playing / duck-under) |

Review-workflow mapping: open the sidebar tree side-by-side, screenshot at the
default 1920×1080 viewport (1440×900 and the 1280×800 floor are in the viewport
toolbar), and attach story links (`?path=/story/…`) to review notes. Every story
renders in a fresh state — a global decorator snapshots the Zustand store at
module load and re-hydrates it per story (plus wipes the app's
localStorage/hash persistence), so interactions never leak between stories.
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

- Presets B/C deviate from the v1 single-dark-theme rule (18 §8.14 / §9) — they exist to test that decision.
- `blocks` clip mode + slim headers deviate from spec 05 §7/§12.2 canonical rendering — they mirror the davinci mock / OpenCut teacher values.
- Tool keys follow spec 16 (V/B/T/Y/U, N=snap). Note: spec 18 §4.5's parenthetical keys (A/','/S) disagree with spec 16 §3.2 — flagged as a spec-consistency finding.
- Dock tooltips claim **⌘3 = Deliver**, but spec 16 §3.8/App A bind ⌘3 =
  Effects workspace and leave Deliver unbound — pre-existing drift, kept
  and registered for the seal round (the mock's ⌘4 Audio page takes spec
  16's registered-but-orphaned ⌘4 binding instead; the drift is also labeled
  on the Chrome story).
- Playback, media decode, and all engine behavior are fake — this is a UI/UX artifact, not an engine (see specs 01-07 for the real thing).

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

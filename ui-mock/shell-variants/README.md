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

A built copy is synced into the platform preview app's `public/mockup` and
served at the preview root.

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
- Color + Deliver pages swap the right rail (page dock: 3 pages per §4.8)
- Splitters resize panels; double-click resets (§3.2)
- `?` opens the keyboard cheat-sheet modal

Spec `data-testid` conventions (18 §10) are applied (`shell-*`) so future Tier-3
tests can target the same surface.

## Known spec deviations (intentional, for reaction)

- Presets B/C deviate from the v1 single-dark-theme rule (18 §8.14 / §9) — they exist to test that decision.
- `blocks` clip mode + slim headers deviate from spec 05 §7/§12.2 canonical rendering — they mirror the davinci mock / OpenCut teacher values.
- Tool keys follow spec 16 (V/B/T/Y/U, N=snap). Note: spec 18 §4.5's parenthetical keys (A/','/S) disagree with spec 16 §3.2 — flagged as a spec-consistency finding.
- Playback, media decode, and all engine behavior are fake — this is a UI/UX artifact, not an engine (see specs 01-07 for the real thing).

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
  components/debug/     VariantProvider + DebugOverlay (ctrl+`)
  components/shell/     Toolbar2, MediaPool, Viewer, Inspector, Dock, status, cheat sheet
  components/timeline/  toolbar, scene tabs, ruler, headers, lanes, clips, playhead
  components/pages/     Color + Deliver (right-rail swaps)
screenshots/            captured presets + pages (committed)
```

Reference: `../davinci_resolve_ui_mock.html` remains the static visual
reference; this app is the interactive successor.

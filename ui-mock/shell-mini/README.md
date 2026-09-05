# shell-mini — the minimal NLE shell mockup (RH skin)

A minimal shell UI mockup for simplicity and initial MVP stage targeting.
Only the most basic / essential NLE features, skinned with the RunningHub
"quick-cut" design language extracted verbatim from
[`../RH-timeline-editor.html`](../RH-timeline-editor.html) (see
[`docs/RH-skin-extraction.md`](docs/RH-skin-extraction.md) for the token
set + DOM anatomy).

The build contract is [`docs/DESIGN-mvp.md`](docs/DESIGN-mvp.md) (v2.1
FINAL — design-audit + code-review rounds folded). `../shell-variants/`
remains the full spec-18 study; this app is the deliberately small sibling:
~14 source files vs 100+, 93 tests vs 596, 30 stories vs 83.

## Run it

```bash
npm install         # Node ^20.19 || >=22.12 (Vite 8 floor); .npmrc sets legacy-peer-deps
npm run dev         # http://localhost:3000/ — dedicated port; on the Z-container
                    # Caddy :81 reverse-proxies :3000, so the public preview URL IS this app
                    # (requires server.allowedHosts — see vite.config.ts; the FC edge
                    # rewrites Host to ...fcapp.run, which Vite 403s by default).
                    # Run it via `python3 scripts/dev3000.py` (double-fork daemon) so it
                    # survives the per-toolcall process reaping; plain nohup/setsid die.
npm test            # vitest — 4 files / 93 tests (jsdom)
npm run typecheck   # tsc --noEmit (strict)
npm run build       # static bundle → dist/ (base: '/')
npm run storybook   # http://localhost:6007 — 30 stories, 4 groups
                    # (externally: /?XTransformPort=6007 while running)
```

**Cold-start resurrection (container recycle):** `scripts/boot-restore.sh`
(iso: `/home/z/my-project/.zscripts/dev.sh`) — idempotent; restores the repo
from the latest `/home/sync/nle-core-spec-*.bundle` (PAT-free), runs `npm ci`
if needed, re-launches the daemon, and re-frees :3000 from half-dead tenants.
Run it at boot or any time; safe twice.

## What's in (the whole MVP surface)

- **Timeline** (the RH quick-cut port): tools row (undo/redo · split ·
  delete · snap · 5-step zoom), 34px ruler with whole-second labels + minor
  tick band, white playhead with hover/drag time pill, 2 lanes (V1+A1,
  36px, badges).
- **Clips:** filmstrip video clips + waveform audio clips, selection ring,
  move-drag (neighbor-clamped, 5px threshold, grab-offset anchoring),
  edge trim (media-duration + neighbor clamped, ± arrows when focused),
  split at playhead (quantized + clamped), delete, click-to-append from
  the media pool (audio→A1, video/image→V1).
- **Playback:** Space plays (rAF, wraps at content end; stops honestly on
  empty); ruler scrub + playhead drag + arrow keys.
- **Undo/redo:** whole-doc snapshots (max 50), one entry per gesture,
  Esc cancels a live drag, interaction lock mid-gesture.
- **Shell:** topbar (transport + TC + honest Export toast), media pool
  (4 assets, gradient cards), viewer (clip-under-playhead + TC), inspector
  (read-only facts + nudge ±0.5s), toasts.

## What's OUT (deliberate — the deviations register)

1. **annotakit skipped** (the sibling's vendored pin-comment review addon);
   wire later = vendored dir + 3 config lines.
2. **Drag-DnD media→timeline cut to v0.2** (top candidate: the loop is
   complete via click-append + move + snap); drop-outline token deferred
   with it.
3. **White playhead** (`#f2f2f2`, RH-faithful) — NOT the spec-18/davinci
   red. This app follows the user-designated RH skin.
4. **No fps** — float seconds on a 0.5s grid, `MM:SS.d` timecode
   (registered deviation from spec-05 frames). Magnet commits may be
   off-grid (documented exception).
5. Fixed layout (no splitters), read-only inspector (except nudge),
   no scenes/variants/mixer/pages/effects/markers/context menus/
   multi-select/ripple/track-editing/localStorage.
6. Snap-guide indicator deferred with DnD; uniform 12px gutters (the RH
   18px node-space is the registered alternative for pixel-compare passes).

## Layout

```
src/
  styles/tokens.css      RH token set (extraction §2, verbatim)
  styles/app.css         Tailwind 4 + shared chrome grammar
  timeline/timeline.css  the qc- quick-cut anatomy port (hand-CSS)
  timeline/Timeline.tsx  tools/ruler/lanes/clips/playhead (one file)
  lib/geometry.ts        the interaction laws (pure, fully tested)
  lib/timecode.ts        MM:SS.d formatting
  lib/mockData.ts        seed doc + media (deterministic)
  lib/filmstrip.ts       SVG filmstrip/thumbnail generators
  state/useMini.ts       doc + ui + history + drag session (Zustand)
  shell/                 Topbar, MediaPool, Viewer, Inspector, Toast
  hooks/                 usePlayhead (rAF), useKeys (shortcuts)
  stories/               4 story files + decorators in preview.tsx
  test/setup.ts          jsdom pointer shims + store reset + RTL cleanup
```

`data-testid` grammar: `mini-*`. Storybook viewports: 1920×1080 (default),
1440×900, 1280×800 (floor).

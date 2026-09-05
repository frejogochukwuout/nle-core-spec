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
npm run dev         # the APP — http://localhost:3001/ (localhost dev surface;
                    #   run via `python3 scripts/dev3000.py` double-fork daemon so it
                    #   survives the per-toolcall process reaping — plain nohup/setsid die)
npm test            # vitest — 4 files / 93 tests (jsdom)
npm run typecheck   # tsc --noEmit (strict)
npm run build       # static bundle → dist/ (base: '/')
npm run storybook   # the FULL dev server on :3000 (run via `python3
                    #   scripts/sb3000.py` double-fork daemon)
```

**Serving layout (R18, user directive — same as the sibling stream):** the
FULL Storybook dev server owns **:3000**, which the Z-container's Caddy :81
reverse-proxies to the public preview URL — so
`https://preview-chat-<chat-id>.space-z.ai/` **IS the Storybook manager**
(manager UI, story tree, HMR, deep links `/?path=/story/…`, single story
canvases `/iframe.html?id=<story-id>&viewMode=story` — all same-origin, all
verified through the real edge). `core.allowedHosts: true` in
`.storybook/main.ts` is belt-and-braces (SB 10.6 allows all hosts by
default). The app is NOT public in this layout — it's the :3001 localhost
dev loop (its vite.config keeps `allowedHosts` so it's edge-ready if a
future harness maps a proxy to :3001).

**Pin-comment review surface (storybook-annotakit v0.5, vendored):**
`vendor/storybook-annotakit/` — the addon is FIRST in
`.storybook/main.ts` addons, so `npm run storybook` mounts the review API on
the dev server itself: `/annotakit/api/*` (health, threads, export digests,
sync), the toolbar pin/region/threads buttons (⌥C / ⌥R / ⌥D), and the
bottom-dock threads panel. Reviewer pins at the public URL are same-origin
fetches — they work directly through the edge. The store lives INSIDE the
repo's git dir (`/home/z/nle-core-spec/.git/annotakit/threads.db`) —
branch-switch-proof — and syncs to an **orphan `annotakit`** branch on
GitHub (shared with the sibling stream's shell-variants env; the kit's
logical merge reconciles both), plus a 1:1 GitHub-issue mirror per thread.
Token comes from `.env` (`ANNOTAKIT_GH_TOKEN` / `ANNOTAKIT_GH_REPO` —
gitignored, never committed; recreate after a recycle, PAT from chat).
dist/ IS tracked in the vendor dir (kit v0.5 "dogfood #6" — boots without
building; `npm run vendor:build` rebuilds from src).

> **Local patch on the vendored kit (v0.5.0):** `refHasOurReadme` in
> `src/server/sync.ts` originally used `git ls-tree <tree> -- README`,
> which is pathspec-relative to the PROJECT dir — when the Storybook
> project is a SUBDIRECTORY of the repo (our `ui-mock/shell-mini`), the
> pathspec never matches, so every remote orphan branch reads as
> "foreign", sync never parents on it, and every push after the first is
> rejected non-fast-forward forever. Patched to `git rev-parse
> <ref>:README` (cwd-independent; verified: kill→mutation→fetch→merge→push
> cycle live, remote branch converged, tombstones propagated). Upstream
> fix worth contributing back to melodietexoss/storybook-annotakit.

**Cold-start resurrection (container recycle):** `scripts/boot-restore.sh`
(iso: `/home/z/my-project/.zscripts/dev.sh`) — idempotent; restores the repo
from the latest `/home/sync/nle-core-spec-*.bundle` (PAT-free), runs `npm ci`
if needed, re-launches the storybook daemon (must-succeed, gated on the
`/index.json` asset-chain probe) and the app (best-effort, :3001), and
re-frees :3000 from half-dead tenants (inspecting their cwd first).
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

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
> cycle live, remote branch converged, tombstones propagated).
> **Reported upstream: [melodietexoss/storybook-annotakit#16](https://github.com/melodietexoss/storybook-annotakit/issues/16)** (full diagnosis + improvement candidates) — fix delivered as **[PR #17](https://github.com/melodietexoss/storybook-annotakit/pull/17)** (`fix/subdir-ref-has-readme-cwd`: the same colon-path patch, rebuilt dist, and a new `subdir` regression case in their store-robustness suite; proven both ways — unpatched dist fails 4/8 checks, patched 8/8; full suite 9/9). Until it merges, the vendored patch stays authoritative here; after it merges, the vendor dir can track upstream v0.5.x again.

**Cold-start resurrection (container recycle):** `scripts/boot-restore.sh`
(iso: `/home/z/my-project/.zscripts/dev.sh`) — idempotent; restores the repo
from the latest `/home/sync/nle-core-spec-*.bundle` (PAT-free), runs `npm ci`
if needed, re-launches the storybook daemon (must-succeed, gated on the
`/index.json` asset-chain probe) and the app (best-effort, :3001), and
re-frees :3000 from half-dead tenants (inspecting their cwd first).
Run it at boot or any time; safe twice.

## What's in (the whole MVP surface)

- **Timeline** (the RH quick-cut port): tools row (undo/redo · split S ·
  cut-head [ · cut-tail ] · delete · snap · ripple · filmstrip · audio-eye
  · 5-step zoom, hairline group dividers), 34px ruler with whole-second
  labels + minor tick band, white playhead with hover/drag time pill,
  2 lanes (V1+A1, 36px base, badges) that FLEX-TALL when the timeline is
  resized.
- **Ripple edit** (R18e, feedback #16): toggle in the toolbar; delete and
  trim close the gap — same-track followers shift left/right with the
  edit. Committed + preview paths are snapshot-relative (idempotent, no
  wobble drift); the ripple quantize law (delta quantized, followers
  floored at the edited clip's new end) keeps off-grid docs overlap-free.
- **Cut styles** (R18e, feedback #7 — the RH 裁剪开始 / 裁剪结束
  operations): `[` discards the selected clip's head at the playhead, `]`
  discards the tail; both ripple-aware; keyboard + toolbar buttons. The
  toolbar glyphs are purpose-drawn trim marks (clip rect + dim discarded
  block + playhead line — R18g, feedback #23: the lucide arrow-to-line
  pair read as jump-to-start/end).
- **Clips:** filmstrip video clips (toggleable to media-kind color
  blocks — feedback #15), waveform audio clips with REAL deterministic
  envelope bars (feedback #12, discrete-bar RH grammar kept), selection
  ring, move-drag (neighbor-clamped, 5px threshold, grab-offset
  anchoring, snap guide at the engaged magnet), edge trim (media-duration
  + neighbor clamped, ± arrows when focused, ripple hints when ripple is
  on), split at playhead (quantized + clamped), delete, click-to-append
  from the media pool (audio→A1, video/image→V1), and DRAG-TO-PLACE:
  pool cards drag onto lanes with a drop-outline ghost (RH's deferred
  #38bdf8 token, now live) + placement at the cursor (exact spot when
  free, next gap otherwise — honest toasts either way).
- **Playback:** Space plays (rAF, wraps at content end; stops honestly on
  empty); ruler scrub + playhead drag + arrow keys; Enter on the playhead
  is a no-op (no focus bounding box — feedback #11).
- **Undo/redo:** whole-doc snapshots (max 50), one entry per gesture,
  Esc cancels a live drag, interaction lock mid-gesture. Ripple ops and
  inserts round-trip exactly.
- **Shell:** topbar (brand + honest Export toast — the transport moved
  down, R18g feedback #24/#25), media pool (8 assets at NATURAL card
  height, genuinely overflow+scroll — R18g feedback #17: the old cards
  squashed to vertical-fit), viewer (clip-under-playhead in a SQUARE
  screen-well + an RH-grammar transport row below the video: timecode
  left · play center · media name right, grid [1fr auto 1fr]), inspector
  (read-only facts + nudge ±0.5s + a structured empty state), toasts,
  and RESIZABLE PANELS (R18d, feedback #13): pool/inspector width
  splitters + a timeline-height splitter (drag up → lanes grow taller,
  real NLE behavior; double-click resets; keyboard ±8px / shift ±32px).
  Splitter hover shows a shaded SKY accent bar (R18g feedback #19 —
  RH's own handles light blue; same accent family as the drop outline)
  and the inspector splitter drags with boundary semantics (drag right
  shrinks — R18g feedback #20 fixed the inverted direction). Snap is
  OFF by default (feedback #10 — the magnet is a deliberate opt-in now).
- **Radii** (R18g, feedback #18/#21/#22): panels 20→8px, controls 8→4px,
  clips near-square (2px — big clip corners read as gaps between cuts),
  the video frame square (screen content is never rounded), Export CTA
  6px. Documented deviation from the RH-verbatim token set (see
  tokens.css — original values kept in comments).

## What's OUT (deliberate — the deviations register)

1. ~~annotakit skipped~~ — **DONE (R18b):** the vendored pin-comment
   review addon is wired (see the kit section above).
2. ~~Drag-DnD media→timeline cut to v0.2~~ — **DONE (R18e):** pool cards
   drag onto lanes with a drop outline + placement at the drop time; the
   drop-outline token is live.
3. **White playhead** (`#f2f2f2`, RH-faithful) — NOT the spec-18/davinci
   red. This app follows the user-designated RH skin.
4. **No fps** — float seconds on a 0.5s grid, `MM:SS.d` timecode
   (registered deviation from spec-05 frames). Magnet commits and
   snap-off drags may be off-grid (documented exceptions; snap is OFF by
   default since R18e). Split/cut quantize to the grid (≤0.25s offset
   from the playhead — documented).
5. ~~Fixed layout (no splitters)~~ — **DONE (R18d):** pool/inspector
   width + timeline height splitters. Read-only inspector (except nudge),
   no scenes/variants/mixer/pages/effects/markers/context menus/
   multi-select/track-editing/localStorage. Ripple EXISTS now (R18e) —
   single-track follower shift only, no multi-select ripple.
6. ~~Snap-guide indicator deferred~~ — **DONE (R18e):** the 2px guide
   paints at the engaged magnet target. The main-row gutter is 8px
   (splitters live in it) vs the root's 12px — registered.
7. **Tightened radii** (R18g, feedback #18/#21/#22): the RH-verbatim
   geometry tokens are overridden (panel 20→8, control 8→4, clip 2, video
   frame 0) — the reviewer's live judgment over the snapshot's roundness.
   Original values kept inline in tokens.css for provenance.

## Layout

```
src/
  styles/tokens.css      RH token set (extraction §2) + documented R18g
                         radius deviations (original values in comments)
  styles/app.css         Tailwind 4 + shared chrome grammar
  timeline/timeline.css  the qc- quick-cut anatomy port (hand-CSS)
  timeline/Timeline.tsx  tools/ruler/lanes/clips/playhead (one file)
  lib/icons.tsx          purpose-drawn trim-start/trim-end glyphs (R18g)
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

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
  · 9-step zoom (R19, thread #52), hairline group dividers), 34px ruler with whole-second
  labels + minor tick band, white playhead with hover/drag time pill,
  2 lanes (V1+A1, 36px base, markers) that FLEX-TALL when the timeline is
  resized.
- **R20 drag law — the OT-faithful pass** (`docs/OT-SEAMS.md` §1.1–1.3,
  `.agents/design/r20-drag-ot-law.md`): clips drag FREELY across the lane
  and NOTHING ELSE MOVES mid-gesture (OT's drag view — the R19
  insert-push law teleported neighbors per pointermove and is RETIRED);
  overlap is allowed visually, the mover rendering above its lane with the
  live drop verdict (amber dashed ring + `→ V2` chip while the drop will
  escape; red ring + `no room · locked` chip while it will refuse). At the
  UP: free span → plain commit (one history entry); conflicting span → OT's
  escape THROUGH the window — an existing free same-kind track hosts the
  drop when one fits, else a MINTED track (V/A series), and the window
  REBINDS to follow the clip (undo restores doc AND binding — history
  entries are binding-aware); `trackBindingLocked` → REFUSE (doc restored,
  no history, honest toast — the mini's CONFLICT). Free spans land at the
  PREVIEW-rendered position (magnet included, commit at the UP); Esc
  restores the pre-drag doc; both clip edges magnet (OT snapGroupEdges
  parity, nearest-wins) and a snap-induced conflict flows through the same
  drop law; the magnet field freezes at gesture start. All six
  `setPointerCapture` sites guarded (untrusted pointers throw NotFoundError
  — live-caught). Programmatic `moveClip` keeps the OT wire law: overlap ⇒
  REFUSE + honest toast (nudge routes it too).
- **R19 trim ghosts** (thread #51): while trimming OUTWARD, the dotted
  ghost edge shows how much further the clip can extend (the
  source/neighbor bound — "how far you can go before you max out the
  source"); inward trims and maxed bounds never ghost; ripple start-trim
  suppresses it (frozen-left law).
- **R19 viewer scrub bar + seek controls** (thread #53 + the scrubbing
  item): the transport's second row is a full-width scrub bar (progress
  fill + playhead tick, its center exactly under the centered play
  button — measured 0px); drag/click scrubs; the focusable slider carries
  ←/→ 0.5s + Home/End; the left transport slot gains to-start (⏮) and
  to-current-clip-head (|◀, repeated taps walk back edit by edit) —
  purpose-drawn glyphs in the trim/split family grammar.
- **R19 track selection + inspector track card** (thread #26): the lane's
  empty surface and the head badge select the TRACK — the inspector's
  second subject (name, kind, clip count, total content, bound role);
  clip vs track selection are mutually exclusive (one subject at a time)
  and heal with the same survive-iff-visible law as clips.
- **R19 track heads** (thread #28): single-pair projects show V1/A1
  MARKER badges (click = select the track); multi-track projects keep the
  binding selector; a LOCKED (embedded) host hides the head entirely.
  Head chips are rounded on the outer side, flat where they touch the
  track (thread #50).
- **R19 rails** (threads #24/#25): the collapsed pool/inspector rails are
  whole-surface buttons (flex-fill the rail height — the lower area was
  dead to clicks).
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
- **Ruler + scrubbing** (R18i, threads #11/#12): the ruler populates the
  FULL visible surface (ResizeObserver-measured), the playhead scrubs
  past the last clip to the ruler's end (Premiere/Resolve/FCP behavior),
  and drags parked at the scroll edge AUTO-SCROLL with the gesture
  re-applying each frame — dragging past the last shown timestamp stays
  visible instead of going blind off-viewport.
- **Pool tabs + collapse + hover-preview** (R18i/R18j): segmented
  All/Video/Image/Audio filter in the pool head (view-only state); the
  pool and inspector each COLLAPSE to a 30px vertical-label rail
  (MEDIA / INSPECTOR at 90°, mode-aware under viewer max); video cards
  play a hover preview (animated thumb + live ticking timecode; images
  and audio never autoplay; keyboard focus parity).
- **Viewer max + aspect ratio** (R18j): a max button at the viewer
  head's right edge composes full-screen — side panels to rails, the
  timeline MINIMIZES (never hides), toggle-back restores the exact
  layout (individual collapse flags survive the round-trip); the
  transport's right slot is an aspect-ratio controller (16:9 / 4:3 /
  1:1 / 9:16 / 2.39:1) and the stage letterboxes to it exactly at any
  size (container-query sizing).
- **Minimized timeline** (R18j thread #13 → R18k thread #21): one
  compact strip (49px) — slim every-other-label ruler + a SINGLE video
  pill row (the A1 sub-row is gone by design: audio can de-sync from
  video in the doc, so its editing happens EXPANDED; pills grew 12→18px,
  more selectable); seek, drag, trim, arrange, selection and pool-drops
  all still work (same gesture engine); an expand button at the strip's
  left restores the full panel.
- **Track binding + the video-only special mode** (R18k, threads
  #21/#23/#3): the mini is a WINDOW onto the project, not the whole
  project — it binds ONE video track (+ ONE audio track in paired
  mode). Lane heads live in a FIXED track-head column (the NLE-standard
  rail: sticky at the scrollport's left edge while clips scroll under
  it) and are either a track-SELECTOR dropdown (multi-track projects,
  live rebind with honest selection clearing) or completely invisible
  (host-injected `trackBindingLocked`, single-pair projects). The
  `video` mode is the simplified special mode: no pool tabs
  (video-only list with a plain Media head), ONE lane, no A1 anywhere,
  audio/still inserts refused with honest toasts; ruler extent,
  playback wrap and the viewer all follow the bound world. A multi-track
  mock doc (V1/V2/A1/A2) ships for the demo + tests.
- **Radii** (R18g, feedback #18/#21/#22 → re-tuned R18i, thread #11):
  panels 20→8px, controls 8→4px, clips at the reviewer's middle ground
  6px (2px read too sharp for shell-mini's casual language; 10px read
  as gaps between cuts), the video frame square (screen content is never
  rounded), Export CTA 6px. Documented deviation from the RH-verbatim
  token set (see tokens.css — original values kept in comments).
- **Storybook: 13 stories in 4 micro→macro groups** (R18k, the user's
  restructure ask): Primitives (the glyph family) → Timeline (clip /
  toolbar / panel) → Panels (topbar / pool / viewer / inspector / toast)
  → Shell (app compositions). State variations are CONTROLS on each
  story (zoom tiers, toggles, playhead, selection, project variant,
  track binding, layout states, toast kind+text) — re-applied to the
  store on every control change — instead of sibling list items (the
  old file had 34).

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
8. **Trim affordance: edge lines, no handle bars** (R18h → revised
   R18i, threads #8/#9/#10 + the #10 repost): the RH reference draws
   2×10px accent bars at clip edges; user feedback overrode twice — first
   to a dark-scrim shaded edge (R18h), then (R18i, "the current one
   messes up the filmstrip too much") to NO standing affordance at all:
   a 2px accent line AT the very edge, visible ONLY on hover/press/focus.
   The clip edge IS the trim control — 14px drag zones per edge, real
   buttons with ←/→ keyboard trim, tabIndex only when selected. The RH
   originals remain in timeline.css comments for provenance.
9. **Split glyph joins the trim family** (R18h, thread #9): the lucide
   Scissors is replaced by a purpose-drawn clip-rect glyph with the
   playhead cutting through the MIDDLE (both halves solid — a split
   discards nothing), matching the TrimStart/TrimEnd grammar beside it.
10. **Snap = magnet only** (R18i, thread #12): the pro-NLE convention —
   the toggle governs the edit-point magnet (same-track neighbor edges +
   playhead) and NOTHING else; the 0.5s beat-quantize left the snap path
   entirely (snap OFF = fully smooth raw drag). Beat-stepping, if ever
   wanted, would be a separate consumer-editor feature (v0.2 candidate).
11. **Aspect controller replaces the transport's name slot** (R18j,
   thread #16): the transport row's right slot is an aspect-ratio
   dropdown (16:9/4:3/1:1/9:16/2.39:1) instead of the media name — the
   name lives in the pool card + inspector (one place). The stage
   letterboxes via container-query sizing (always fits, always on-ratio).
12. **Minimized timeline = pills** (R18j, thread #13): the compact strip
   renders clips as label-only hue-tinted pills (no filmstrip/waveform
   bodies) with V/A in separate 14px sub-rows inside one strip — the
   same ClipItem gesture engine runs underneath, so seek/drag/trim/
   arrange stay live. The playhead's hover time pill is suppressed in
   the strip (the viewer transport tc is the live read).
13. **Images carry no duration** (R18j, thread #18): stills show no
   duration chip in the pool and no "Source length" row in the
   inspector — a still has no intrinsic length; a placement's extent is
   an edit decision (shown as the clip Duration).
14. **Topbar is a downstream customization point** (R18j, thread #17 —
   see the section below): slim 36px chrome-only bar; the placeholder
   brand + Export stub are EXPLICITLY meant to be swapped by the host
   product, not extended. R18k (thread #22): the Export CTA is sized
   FOR the slim bar (26px — 5px breathing room top/bottom; the old 34px
   sat flush against the borders and read as overflow).
15. **Active chip contrast over RH's own** (R18k, thread #4): RH's
   active tool chip is 6.5% white on a 5.2% toolbar surface — the
   reviewer found it too subtle to read, so the mini's active chips
   (toolbar toggles + pool tabs) are 15% white + white ink + hairline
   inset ring. Deliberate deviation from skin fidelity; the extraction
   doc's original value stays in the register.
16. **Minimized strip = video pills only** (R18k, thread #21): the A1
   sub-row is hidden in minimized mode BY DESIGN (audio editing happens
   expanded; the strip is the video navigation surface). Pro-NLE
   collapsed tracks hide audio bodies the same way.
17. **Plain track labels are gone — selector or invisible** (R18k,
   thread #3): lane heads live in the fixed head column and are either
   dropdowns (multi-track projects) or nothing (locked/single-pair).
   The first draft put the select over the first clip's trim zone — the
   review round caught it; the head column is the proper fix.
18. **Collapsed-mode gutter = 6px everywhere** (R18k, thread #20):
   --mini-gutter-collapsed token; every boundary around the viewer in a
   collapsed state (rails left/right, min strip below) nets exactly 6px
   (measured). Expanded panels keep 2px splitter gaps + 12px root gaps.
19. **The keyboard surface skips SELECT** (R18k, review P2-4): a
   focused track-binding or aspect dropdown keeps its own keys — Space
   opens it, letters pick options — instead of firing global
   split/zoom. (Also fixed the R18j aspect select's Space hijack.)
20. **Storybook story-count diet** (R18k, the user's ask): 34 stories
   → 13 in 4 ordered groups, controls for state variations. The two
   long-lived review surfaces kept their IDs (`shell--default`);
   state-clone stories (zoom tiers, snap off, ripple on…) became args.
21. **Filmstrip edge shade = trim-mode only** (R18k, panel thread #1):
   the permanent RH-style edge fade (rgba(0,0,0,.2)→.24) is gone from
   every clip — it read as a subtle dim over the filmstrip. The same
   shade returns ONLY while trimming: hovering an edge drag zone
   (:has()) or actively dragging it (is-trimming-* from the gesture
   engine) shades exactly that edge, alongside the 2px accent line.
22. **Windowed drag escape** (R20 — SUPERSEDES the R19 insert-push
   deviation, `docs/OT-SEAMS.md` §1.3): OT's move law is overlap-reject
   with a new-track escape; the mini now follows it THROUGH the window —
   a conflicting drop escapes to an existing free same-kind track, else a
   minted one, and the window rebinds (locked ⇒ refuse). The R19
   insert-push improvisation (Premiere insert-edit via a per-event doc
   mutation — the "comically buggy" neighbor teleportation) is retired
   from the register: it was a redesign masquerading as a seam delta. The
   OT wire law survives verbatim in the programmatic `moveClip` (refuse +
   toast).
23. **9-step zoom ladder** (R19, thread #52): [24, 36, 48, 72, 96, 144,
   192, 288, 384] — the five R18 anchors preserved with a new rung
   between each (×1.5); default step 2 (48pps unchanged).
24. **Same-track gap hunt on pool drops** (R19, OT-SEAMS §1.5): OT's
   `firstAvailable` insert never hunts same-track gaps; the mini's
   `insertionAt` does (exact → next gap → tail) — a mock affordance.
25. **Implicit in-point-0 element model** (R19, OT-SEAMS §1.6): the mini's
   clip is a full window over its source (media.duration = extent); OT
   elements carry trimStart/trimEnd/sourceDuration. Conversion at swap:
   `{trimStart: 0, trimEnd: sourceDuration − duration}`.
26. **Head law revised** (R19, thread #28): single-pair unlocked shows
   V1/A1 markers (supersedes the R18k "invisible when single-pair"
   reading — the newer thread asked for the marker back); locked hides
   the head; corner law rounded-outer/flat-track-side (thread #50).
27. **Nudge refuses instead of parking** (R19): nudging into a neighbor
   is refused with a toast (was: silent clamp-park). Precise edits get
   honest refusal — the drag path owns the rearrange affordance.

## The topbar is a downstream customization point (R18j, thread #17)

shell-mini is a UI template meant to be EMBEDDED in a host product, not
a standalone app. This bar is where a downstream integration replaces
our placeholder brand + Export with ITS chrome: the exit / "back to
parent" affordance (cross button, breadcrumb, ESC-to-parent handshake),
the host's project identity, and the real Export flow (render →
progress → host artifact handoff). The current Export CTA is an honest
mock stub on purpose. Keep this bar minimal and stateless so a host can
swap it without touching the rest of the shell; anything richer belongs
in the host, not here. (Mirrored in Topbar.tsx and .agents/HANDOFF.md.)

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

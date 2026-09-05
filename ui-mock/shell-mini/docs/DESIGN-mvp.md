# DESIGN — shell-mini MVP (R16 bootstrap)

**Status:** v2 FINAL — post-audit (adversarial audit folded: 5 majors M1-M5,
14 minors m1-m14, Q1-Q4 answered; verdict was SHIP-WITH-FIXES, all fixes
applied below)
**Author:** orchestrating agent, 2026-09-05
**Task:** bootstrap a minimal version of the spec-18 NLE shell under
`ui-mock/shell-mini/` — simplified from `shell-variants`, skinned with the
`RH-timeline-editor.html` (RunningHub quick-cut) design language, with a
similar overall setup incl. Storybook.
**Inputs:** `docs/RH-skin-extraction.md`, `shell-variants` (complex
predecessor), user README intent, fresh-context subagent audit.

This document is the build contract for the implementation phase.

---

## D1 — Mission & success criteria

**Decision.** shell-mini is a *separate, minimal* React mock that reproduces
the essential NLE editing loop (view media → place clips → arrange → play) in
the RH visual language. It is NOT a reduction of shell-variants' code; it is a
from-scratch small app that borrows shell-variants' *stack and conventions*.

**Success criteria:**
1. `npm run dev` boots a shell that renders at 1280×800+ without layout breakage.
2. A user can: scrub/play, select a clip, drag-move it (clamped to neighbors),
   trim its edges, split at playhead, delete, undo/redo, zoom 5 steps.
3. The timeline block is visually recognizable as the RH quick-cut.
4. `npm run storybook` boots; every shell region (topbar, media pool, viewer,
   inspector, timeline, toast) has ≥1 story; stories reset state.
5. `npm test` + `npm run typecheck` green; suite covers geometry laws, store
   actions incl. undo/redo + interaction-lock + selection validation, and a
   component smoke pass.
6. Scope: ~14 source files, ~4 story files, ~4 test files. If a feature is not
   in D3's cut-list, it is out.

**Rationale.** The user's words: the current one is "quite complex and too
hard to aim at for initial mvp". The mini must be *aimable-at*: one screenful
of behavior, one design language, no variant machinery.

## D2 — Stack (mirror shell-variants, minus review-tooling)

| Choice | Same as shell-variants? | Rationale |
|---|---|---|
| React 19 + Vite 8 + TS strict (ES2022) | ✅ | spec 00 §4 mandate; identical dev-loop |
| Tailwind 4 (`@tailwindcss/vite`) | ✅ | same styling pipeline as sibling |
| Zustand 5 (single store) | ✅ | small state; store-reset contract transfers |
| lucide-react | ✅ | icon parity with sibling |
| clsx | ✅ | cheap, used heavily in sibling |
| Storybook 10.6 (react-vite) + a11y + docs addons | ✅ (minus annotakit) | "overall setup should be similar (incl storybook)" |
| `storybook-annotakit` | ❌ skipped | vendored TS-source addon + prebuild + .env + GH-mirror; pure review-workflow weight. Deliberate deviation; wiring later = vendored dir + 3 config lines. |
| Vitest 5 + RTL + jsdom, co-located tests | ✅ (small suite) | same conventions, fewer cases |
| `.npmrc legacy-peer-deps=true` | ✅ | proven resolution on this exact dep set |
| `base: '/mini/'` | ❌ (sibling: /mockup/) | own preview namespace |

## D3 — Feature cut-list (the whole MVP surface)

**IN (mock-real: working local state, no engine):**
1. **Timeline panel** (RH quick-cut anatomy, D10): tools row (undo/redo ·
   split · delete · snap toggle · zoom-out/-in + 5-step slider), 34px ruler,
   white playhead + time pill, 2 lanes (V1 video, A1 audio, 36px each).
2. **Clips:** filmstrip video clips (repeat-x SVG gradient data-URI per
   media asset), audio clips (waveform bar pattern), selection ring, move-drag
   (same-track, clamped between neighbors + track bounds), edge trim handles,
   split-at-playhead (button + S), delete (button + Del), **click-to-append**
   from media pool (audio→A1, video/image→V1). V1/A1 10px lane badges.
3. **Playback:** Space toggles play/pause (rAF loop; **wraps to 0 and
   continues** at `contentEnd = max(clip ends, 0)`; empty doc → immediate
   pause, never a zero-length loop). No JKL.
4. **Undo/redo:** ⌘Z / ⌘⇧Z + toolbar buttons; whole-doc snapshot stack (max
   50), one entry per committed gesture; nudge = one entry per click.
5. **Media pool (left, 260px):** 4 mock assets (2 video + 1 image + 1 audio),
   rounded gradient cards, click = append to the correct lane.
6. **Viewer (center):** dark stage showing the media card of the clip under
   the playhead (title + gradient + big timecode); play overlay pill in RH's
   dark-translucent style (`rgba(20,20,22,.72)` + blur) — NOT green.
7. **Inspector (right, 240px):** read-only facts for the selection + one real
   control: Nudge ±0.5s (neighbor-clamped, one history entry per click).
8. **Keyboard:** Space, S (split), Del, ⌘Z/⌘⇧Z, +/- zoom, 0 = zoom step 1,
   Esc (cancel active drag FIRST, else deselect). No tool modes.
9. **Toasts:** minimal single toast (bottom center, RH pill style) — honest
   feedback surface ("Clip added", "Nothing to undo", "Export isn't wired in
   the mini").

**OUT (registered in README deviations):** drag-DnD media→timeline (v0.2
candidate #1 — cut per audit Q2: second drag machine not worth it when
click-append + move + snap complete the loop), drop-outline token (deferred
with it), variants/themes, scenes, mixer/meters, color/deliver pages,
effects, transitions, markers, context menus, confirm dialogs, cheat sheet,
splitters, multi-select/marquee, cross-track moves, ripple/slide/slip/roll,
JKL, in/out points, track headers, track add/remove, status strip, media
search, offline assets, localStorage persistence, annotakit.

## D4 — Layout & geometry (1920×1080 target, 1280×800 floor)

```
┌────────────────────────────────────────────────────────────┐
│ topbar 56px: project · undo/redo · transport + TC · Export │
├──────────┬──────────────────────────────┬──────────────────┤
│ media    │ viewer (stage, #000, radius   │ inspector 240px  │
│ pool     │ 16, letterboxed media card)   │ read-only+nudge  │
│ 260px    │                               │                  │
├──────────┴──────────────────────────────┴──────────────────┤
│ timeline panel (RH quick-cut): tools 42 · ruler 34 ·       │
│ 2×36px lanes + 8px gaps/padding ≈ 190px total              │
└────────────────────────────────────────────────────────────┘
```

- App root: `#0d0d0d` + dot grid (radial-gradient dots @ 24px pitch `#383838`).
- Panels float: **uniform 12px gutters** (one gutter constant — the extraction
  doc's 18px node-space registered as the alternative if a pixel-comparison
  pass is wanted), radius 20, `rgba(11,12,13,.88)` + `blur(10px) saturate(.82)`.
- Fixed proportions, no splitters. Vertical math @1280×800 with 12px outer
  gutters: 12+56+12+mainRow+12+~190+12 → **mainRow = 506px**; horizontal:
  viewer = 732px. @1920×1080: viewer 1372 × mainRow 786. Floor verified:
  even a real-world ~1280×660 effective viewport keeps mainRow ≥ 366px.
- Timeline block height budget: 42 tools + 34 ruler + (8 pad + 36 + 8 gap +
  36 + 8 pad = 88... using extraction metrics 42+34+96+16 = 188) ≈ 190px.

## D5 — Data model (spec-09-shaped, subset)

```ts
type TrackKind = 'video' | 'audio';
interface Track  { id: string; kind: TrackKind; label: string; }   // V1, A1
interface Media  { id: string; name: string; kind: 'video'|'audio'|'image';
                   duration: number; hue: number; }                // hue → gradient thumb
interface Clip   { id: string; trackId: string; mediaId: string;
                   start: number; duration: number; }
interface Doc    { tracks: Track[]; media: Media[]; clips: Clip[]; }
```

- **Grid invariant (binary-exact):** all doc times (starts, durations,
  media durations) are exact multiples of 0.5s — tests may use strict
  equality, no epsilon. `ui.playhead` is UNQUANTIZED (free scrub); only
  committed doc mutations live on the grid (split quantizes, D7).
- No fps in v0.1 — registered deviation from spec-05 (frames); `timecode.ts`
  formats `MM:SS.d` (single seam).
- 2 fixed tracks. Clip = whole media placement; trimming changes the placed
  duration only, clamped by media duration (D7).

**Seed document (deterministic, on-grid):** V1 = 3 video/image clips
back-to-back spanning 12.5s (`0→4.5`, `4.5→9`, `9→12.5`); A1 = 1 audio clip
`1.5→8.5`; 4 media assets with hues. contentEnd = 12.5s.

## D6 — Store shape (Zustand, one file)

```
useMini = {
  doc: { tracks, media, clips },
  ui:  { playhead, playing, zoomStep (0-4), snapOn (default true),
         selectedId, toast, dragActive,
         history: { past: Doc[], future: Doc[] } },
  actions: commit(mutator)  // snapshot→past (max 50), clear future
          moveClip / trimClip / splitClip / deleteClip / addClipFromMedia
          undo / redo / setPlayhead / togglePlay / setZoom / nudge / toast
}
```

- **Selection validation:** after every history op (undo/redo/commit),
  `selectedId ∉ doc.clips` → clear (no dangling ids, undoing a delete is safe).
- **Interaction lock (audit M2):** while `dragActive` (drag/trim preview),
  the ONLY honored input is Esc (cancel); keyboard commands + selection
  changes are suppressed until pointerup/cancel.
- Playback: `usePlayhead` rAF hook writes playhead via action (wrap law in
  D3.3); history = whole-doc snapshots (docs are ~5 clips — trivial cost,
  correct by construction).

## D7 — Geometry & interaction laws

- `pps = [24, 48, 96, 192, 384]` × zoomStep (5 steps, RH slider parity).
  **Default zoomStep = 1 (48pps)** — at 24pps a min-duration clip is 12px,
  smaller than its own 14px trim handles (registered constraint). `0` key =
  step 1.
- `x = start*pps`, `w = duration*pps`. **One shared horizontal scroll
  wrapper** contains ruler + lanes + playhead-overlay (tools row fixed above)
  — deviation from RH's single-scroll anatomy (their ruler/playhead don't
  scroll; copying that verbatim desyncs under scroll). Registered deviation.
- Ruler: `labelStep = max(1s, ceil(64/pps))` — labels never sub-second;
  labels `MM:SS` 10px tabular-nums `rgba(255,255,255,.52)`; minor-tick band
  repeating-linear-gradient (CSS var step, RH-verbatim).
- **Scrub:** click/drag on ruler or playhead sets playhead, clamped to
  `[0, contentEnd]`, unquantized.
- **Drag (move):** 5px activation threshold; live preview; clamp to
  `[prevEnd, nextStart − duration]` (track bounds when no neighbor); snap
  toggle governs BOTH grid quantization (0.5s) AND the 12px magnet (neighbor
  edges + playhead) — one switch, honest off; commit on pointerup = one
  history entry; **Esc cancels** (restores pre-drag doc); mid-drag the
  interaction lock (D6) suppresses everything else.
- **Trim:** handles 14px; min duration 0.5s; start-trim bounded by prev
  neighbor AND ≥ start − ... (start decreases) — full law:
  `start' ∈ [prevEnd, end − 0.5]` and `duration' = end − start'`; end-trim:
  `end' ∈ [start + 0.5, min(nextStart, start + media.duration)]`. One
  history entry per completed trim.
- **Split:** `p = clamp(round(playhead/0.5)*0.5, start+0.5, end−0.5)`; no-op
  when clip duration < 1s or playhead ∉ [start, end) (half-open). Applies to
  the selected clip (or topmost clip under playhead when none selected).
- **Nudge:** ±0.5s, same neighbor clamp as move, one history entry per click.
- All pointer work via Pointer Events + setPointerCapture (jsdom-stubbable).

## D8 — Storybook surface (v0.1)

- `.storybook/main.ts` ≈ sibling minus annotakit; `preview.tsx`: fullscreen
  layout, 3 viewports (1920/1440/1280), `withStoreReset` decorator
  (store-snapshot reset per story; no LS keys to wipe in mini).
- Stories (4 files, ~16 stories):
  - `Shell.stories.tsx` — full shell (default / empty timeline / after-split
    patch / zoomed-in).
  - `Timeline.stories.tsx` — solo panel (default, each zoom tier, clip
    selected, audio clip, empty, **scrolled** — reviews the scroll model).
  - `Regions.stories.tsx` — topbar (default / playing / undo-redo-disabled),
    media pool, viewer (playing/stopped/empty), inspector (video/audio/empty).
  - `Overlays.stories.tsx` — toast states.

## D9 — Test plan (law-focused)

- `geometry.test.ts` — time↔px, labelStep tiers (incl. ≥1s cap), move/trim
  clamp laws (neighbor + min duration + **media duration clamp**), **split
  quantization + invalid window**, snap (magnet + grid), contentEnd.
- `store.test.ts` — every action's doc effect; history (undo/redo cycles,
  no-op guard, max-50); split edge cases; nudge clamp; append routing by
  media kind (audio→A1, video/image→V1); play wrap + empty-doc pause;
  **selection-survives-undo**; interaction-lock suppression.
- `Timeline.test.tsx` — renders clips/lanes (testids), click-select,
  drag-move clamps (pointer-event sim), trim clamps via end-handle, split
  button, **Esc-cancel-drag**, **shortcut suppression mid-drag**.
- `Shell.test.tsx` — smoke: all regions present; media click appends to the
  correct lane; keyboard (Space/Del/⌘Z) on the real shell.
- jsdom setup: pointer-capture stub + per-test store reset.

## D10 — RH-skin fidelity checklist (the "apply this skin" contract)

1. Timeline panel = quick-cut anatomy (class-for-class, prefixed `qc-`:
   `qc-timeline`, `qc-ruler`, `qc-playhead`, …), hand-CSS in a single
   `timeline.css`; Tailwind for shell layout. Structure deviates only at the
   shared scroll wrapper (D7).
2. Token set = extraction §2 **carried verbatim, used selectively** (mention/
   agent accents intentionally unused; drop-outline deferred with the DnD cut).
3. Playhead: white `#f2f2f2` 2px line + 8×8 dot handle + hover/drag time
   pill with triangle pointer — RH-verbatim.
4. Clip bodies: per-clip grey gradient + repeat-x filmstrip + edge fade +
   selection = `::after` inset ring 1px `#d0d0d0` (ring, not border);
   audio clip bars use `--canvas-quick-cut-audio-waveform`.
5. Chrome: 34px round icon buttons, hover `rgba(255,255,255,.1)`, active
   `rgba(255,255,255,.065)` + `#e6e6e6`; green `#02dba3` ONLY for the Export
   CTA (+ `--rh-green-hover #03c593` hover); Export is honest (toast, m6);
   focus ring `rgba(255,255,255,.62) 2px`.
6. Media-pool cards: `--canvas-quick-cut-item-surface` + control radius;
   viewer stage `#000` radius 16 (RH preview radius 22 → 16 at mini scale,
   registered nuance); play overlay = RH's dark translucent pill.
7. Type: 10px tabular-nums timeline text; 11px panel labels; 12px body;
   13px buttons. System UI stack.

## D11 — Repo/infra decisions

- Lives at `ui-mock/shell-mini/` (own package.json, independent install;
  Node floor `^20.19 || >=22.12`).
- `.gitignore`: node_modules, dist, storybook-static, *.log (no .env needed —
  no annotakit; if wired later, TRACK .env per the user's GIT-ISM-DISK law).
- README: run/test/storybook commands, IN/OUT feature ledger, deviations
  register (annotakit skip, white playhead, no-frames, fixed layout,
  read-only inspector, DnD cut + deferred drop-outline, loop playback,
  shared scroll wrapper, uniform 12px gutters, 24pps handle constraint).
- `data-testid` grammar: `mini-*` (e.g. `mini-timeline`, `mini-clip-*`,
  `mini-lane-V1`...).
- Commits on `main`, milestone pushes (gitlab mirror configured; GitHub
  blocked on missing PAT this session — flagged in HANDOFF).

## Audit round record

- v1 → audit (fresh-context subagent, 2026-09-05): verdict SHIP-WITH-FIXES;
  5 majors (trim/split bounds M1, drag lifecycle lock M2, scroll model M3,
  DnD hedge M4, test-plan gaps M5), 14 minors (m1-m14), Q1-Q4 answered
  (keep 2 tracks; cut DnD; MM:SS.d; floating card + 12px gutters).
- v2 = this document: all majors + minors folded (M1→D7, M2→D6, M3→D7,
  M4→D3 OUT, M5→D8/D9; m1-m14 → D3/D4/D5/D7/D9/D10/D11).
- Build order (audit-recommended): scaffold+skin port → pure lib+tests →
  store → timeline → shell regions → storybook → README/close.

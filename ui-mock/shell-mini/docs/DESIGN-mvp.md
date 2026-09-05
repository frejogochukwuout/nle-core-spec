# DESIGN — shell-mini MVP (R16 bootstrap)

**Status:** v1 — pre-audit (subagent peer-review round pending)
**Author:** orchestrating agent, 2026-09-05
**Task:** bootstrap a minimal version of the spec-18 NLE shell under
`ui-mock/shell-mini/` — simplified from `shell-variants`, skinned with the
`RH-timeline-editor.html` (RunningHub quick-cut) design language, with a
similar overall setup incl. Storybook.
**Inputs:** `docs/RH-skin-extraction.md` (this folder), `shell-variants`
(the complex predecessor), user README intent ("only the most basic /
essential NLE features").

This document records each design decision with its rationale, per the
project's decision discipline. After audit + refinement it becomes the build
contract for the implementation phase.

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
3. The timeline block is visually recognizable as the RH quick-cut (side-by-side
   comparison with the extraction doc's token list passes).
4. `npm run storybook` boots; every shell region has ≥1 story; stories reset state.
5. `npm test` + `npm run typecheck` green; suite covers geometry laws, store
   actions incl. undo/redo, and a component smoke pass.
6. Total scope stays small: ~10 source files + ~6 story files + ~6 test files
   (vs shell-variants' 100+ files). If a feature is not in D3's cut-list, it is
   out.

**Rationale.** The user's words: the current one is "quite complex and too hard
to aim at for initial mvp". The mini must be *aimable-at*: one screenful of
behavior, one design language, no variant machinery.

## D2 — Stack (mirror shell-variants, minus review-tooling)

| Choice | Same as shell-variants? | Rationale |
|---|---|---|
| React 19 + Vite 8 + TS strict (ES2022) | ✅ | spec 00 §4 mandate; identical dev-loop |
| Tailwind 4 (`@tailwindcss/vite`) | ✅ | same styling pipeline as sibling |
| Zustand 5 (single store) | ✅ | small state; store-reset contract transfers |
| lucide-react | ✅ | icon parity with sibling |
| clsx | ✅ | cheap, used heavily in sibling |
| Storybook 10.6 (react-vite) + a11y + docs addons | ✅ (minus annotakit) | "overall setup should be similar (incl storybook)"; a11y cheap, docs addon is one line |
| `storybook-annotakit` | ❌ skipped | vendored TS-source addon + prebuild + .env + GH-mirror; pure review-workflow weight, not MVP. Register as deliberate deviation; can be wired in a later round (the vendored copy is portable). |
| Vitest 5 + RTL + jsdom, co-located tests | ✅ (small suite) | same conventions, fewer cases |
| `.npmrc legacy-peer-deps=true` | ✅ | proven resolution on this exact dep set |
| `base: '/mockup/'` | ❌ `/mini/` | its own preview namespace if synced later |

**Annotakit deviation note:** the sibling's Storybook carries pin-comment
review tooling vendored in-repo. shell-mini v0.1 reviews via stories +
screenshots; wiring annotakit later = add the vendored dir + 3 config lines.

## D3 — Feature cut-list (the whole MVP surface)

**IN (mock-real: working local state, no engine):**
1. **Timeline panel** (the RH quick-cut look): tools row (undo/redo · split ·
   delete · snap toggle · zoom-out/-in + 5-step slider), 34px ruler with
   minute:second labels + minor tick band, playhead (white 2px line + 8×8 dot
   + hover/drag time pill), 2 tracks (V1 video, A1 audio).
2. **Clips:** filmstrip video clips (repeat-x SVG gradient data-URI per media
   asset), audio clips (waveform-ish bar pattern), selection ring, move-drag
   (same-track, clamped between neighbors + track bounds), edge trim handles
   (min 0.5s, neighbor-clamped), split-at-playhead (button + S key), delete
   (button + Del key), add via media pool click (append to track end) and
   drag-to-track (pointer DnD, drop at position, snapped to 0.5s grid).
3. **Playback:** Space toggles play/pause (rAF loop advancing playhead;
   stops+wraps at content end). J/K/L: shuttle per sibling conventions
   (L = play, K = pause, J = reverse visual only? **NO — cut J/K/L, only
   Space**, keep the keyboard surface honest and tiny).
4. **Undo/redo:** ⌘Z / ⌘⇧Z + toolbar buttons; snapshot-stack over the doc
   slice (clip list), max 50, coalesced per committed gesture.
5. **Media pool (left):** 4 mock assets (2 video + 1 image + 1 audio) as
   rounded cards with gradient thumbs, duration, click = append, drag = place.
6. **Viewer (center):** dark stage that shows the media card of the clip under
   the playhead (title + gradient + big timecode), play/pause pill overlay in
   RH style; no video decode.
7. **Inspector (right, 240px):** read-only facts for selection (name, track,
   start/duration/end, media) + a couple of live controls? **NO — read-only
   v0.1** (fields would be no-ops; the zero-no-op discipline from R14 applies:
   don't ship dead controls). One control that IS real: Nudge (±0.5s buttons).
8. **Keyboard:** Space, S (split), Del, ⌘Z/⌘⇧Z, +/- zoom, 0 = zoom-to-fit,
   Esc = deselect. That's all. No tool modes (V/B cut — split is modeless).
9. **Toasts:** single minimal toast surface (bottom center, RH pill style) for
   honest feedback ("Clip added", "Nothing to undo"). Replaces dialogs.

**OUT (deliberately, all registered in README deviations):** variants/themes,
scenes, mixer/meters, color/deliver pages, effects, transitions, markers,
context menus, confirm dialogs, cheat sheet, splitters (fixed layout),
multi-select/marquee, cross-track moves, ripple/slide/slip/roll, JKL, in/out
points, loop, magnet-snap-tolerance tuning (fixed 12px?), track headers,
track add/remove, status strip, media search, offline assets, localStorage
persistence, share links, window-too-small overlay (a CSS floor is enough),
ErrorBoundary (mock-level OK), annotakit.

**Rationale.** The sibling's 596-test surface exists because it models the
full spec-18 shell. The mini models the *editing loop* only. Every OUT item
above maps to a named sibling subsystem — the point is the cut, not the list.

## D4 — Layout & geometry (1920×1080 target, 1280×800 floor)

```
┌────────────────────────────────────────────────────────────┐
│ topbar 56px: project name · undo/redo · | · transport    │  floating panel style
│           (play pill + timecode) · ……… · Export (green)  │  (radius 20, blur)
├──────────┬──────────────────────────────┬──────────────────┤
│ media    │ viewer (stage, #000, radius  │ inspector 240px  │
│ pool     │ 16, letterboxed media card,  │ read-only facts  │
│ 260px    │  timecode + play overlay)    │ + nudge          │
├──────────┴──────────────────────────────┴──────────────────┤
│ timeline panel (the RH quick-cut component, full width):  │
│   tools row 42px · ruler 34px · 2 lanes @ 36px + pad 8    │
└────────────────────────────────────────────────────────────┘
```

- App root: `#0d0d0d` + dot grid (radial-gradient dots @ 24px pitch, `#383838`).
- Panels float with 12px gutters: topbar/media/viewer/inspector/timeline are
  separate radius-20 `rgba(11,12,13,.88)` + `blur(10px) saturate(.82)` cards.
- Fixed proportions, no splitters; flex column with fixed heights (topbar 56,
  timeline block ~200: 42+34+36*2+8*3+16 ≈ 176 + padding, media/inspector
  fixed widths). At 1280×800 it still works (viewer flexes).
- **Why fixed:** splitters were a whole subsystem in the sibling (keyboard
  ladders, persistence, reset). MVP needs none of that cost.

## D5 — Data model (spec-09-shaped, subset)

```ts
type TrackKind = 'video' | 'audio';
interface Track  { id: string; kind: TrackKind; label: string; }        // V1, A1
interface Media  { id: string; name: string; kind: 'video'|'audio'|'image';
                   duration: number; hue: number; }                     // hue → gradient thumb
interface Clip   { id: string; trackId: string; mediaId: string;
                   start: number; duration: number; }                   // seconds, 0.5s grid
interface Doc    { tracks: Track[]; media: Media[]; clips: Clip[]; }
```

- Times are **float seconds** on a 0.5s grid (RH labels are whole seconds;
  the mock's durations are 2.5-6s). No fps/frame quantization in v0.1 —
  register as deviation from spec-05 (spec uses frames); keep the seam
  (`timecode.ts` formats MM:SS.d).
- 2 tracks only, fixed. Clip = the whole media (no sourceStart trimming in
  v0.1; trimming only changes timeline placement duration ≥ 0.5s).

## D6 — Store shape (Zustand, one file)

```
useMini = {
  doc: { tracks, media, clips },
  ui:  { playhead, playing, zoomStep (0-4), snapOn, selectedId,
         toast, history: { past: Doc[], future: Doc[] } },
  actions: commit(mutator) // wraps doc changes: snapshot→past, clear future
          moveClip / trimClip / splitClip / deleteClip / addClipFromMedia
          undo / redo / setPlayhead / togglePlay / setZoom / nudge / toast
}
```

- Playback is a `usePlayhead` rAF hook (not in store, writes playhead via
  action; loop wraps to 0 at content end).
- History = whole-doc snapshots (docs are ~5 clips; snapshot cost is trivial
  vs the sibling's structured patches — and correct by construction).

## D7 — Geometry & interaction laws (the "real" in mock-real)

- `pps` (px per second) = `[24, 48, 96, 192, 384]` × zoomStep (5 steps like
  RH's slider 1-5). `x = start*pps`, `w = duration*pps`.
- Ruler labels every `labelStep` seconds where `labelStep` chosen from pps so
  labels are ≥ 64px apart; minor tick band via repeating-linear-gradient
  (CSS var step, RH-verbatim).
- **Drag:** 5px threshold (activation) then move with neighbor clamping:
  `[prevEnd, nextStart - duration]`; drop lands on 0.5s grid when snap on
  (default on); 12px magnetic pull toward neighbor edges + playhead.
- **Trim:** min duration 0.5s; start-trim bounded by prev neighbor; end-trim
  by next. Commit on pointerup (preview live during drag, one history entry).
- **Split:** at playhead when inside a selected (or topmost) clip ≥ 1s.
- **Esc cancels** a live drag (restores pre-drag doc slice).
- All pointer work via Pointer Events + setPointerCapture (jsdom-stubbable,
  same as sibling).

## D8 — Storybook surface (v0.1)

- `.storybook/main.ts` ≈ sibling's minus annotakit; `preview.tsx` with
  fullscreen layout, 3 viewports (1920/1440/1280), `withStoreReset`
  decorator (store-snapshot reset, no LS to wipe).
- Stories (~4 files, ~14 stories):
  - `Shell.stories.tsx` — full shell (default / empty timeline / after-split
    store patch / zoomed-in).
  - `Timeline.stories.tsx` — solo timeline panel (default, zoom steps, clip
    selected, audio clip, empty), ruler (pps tiers), playhead (at start /
    mid / dragging).
  - `Regions.stories.tsx` — media pool, viewer (playing / stopped / empty),
    inspector (selected / empty / audio clip).
  - `Overlays.stories.tsx` — toast states.

## D9 — Test plan (small but law-focused)

- `geometry.test.ts` — time↔px, labelStep tiers, clamp/overlap laws, snap.
- `store.test.ts` — every action's doc effect + history (undo/redo cycles,
  no-op guard: empty history never pushes), play wrap, split edge cases.
- `Timeline.test.tsx` — renders clips/lane testids, click-select, drag-move
  (pointer-event sim) clamps, trim end-handle, split button.
- `Shell.test.tsx` — smoke: all regions present; media click appends clip;
  keyboard (Space, Del, ⌘Z) on the real shell.
- jsdom setup: pointer capture stub + store reset (borrowed pattern).

## D10 — RH-skin fidelity checklist (the "apply this skin" contract)

1. Timeline panel = quick-cut anatomy 1:1 (class-for-class: `qc-timeline`,
   `qc-ruler`, `qc-playhead`, … prefixed `qc-` to avoid collisions) with the
   extracted CSS adapted to CSS modules? **No — single `timeline.css` with
   `qc-` BEM names**, plain CSS file (tokens in `tokens.css`). Tailwind stays
   for shell layout, the timeline block is hand-CSS for fidelity.
2. Token set = extraction doc §2 verbatim (renamed `--qc-*` / `--rh-*` only
   where needed).
3. Playhead: white + time pill with triangle (hover/drag reveal) — RH-verbatim.
4. Clip gradient bodies + repeat-x filmstrip + edge fade — RH-verbatim.
5. Chrome: 34px round icon buttons, hover `rgba(255,255,255,.1)`, active
   `rgba(255,255,255,.065)`+`#e6e6e6`; green `#02dba3` ONLY for the Export
   CTA and play-while-playing affordance (brand accents used sparingly, as RH
   does); focus ring `rgba(255,255,255,.62) 2px`.
6. Drop outline `#38bdf8` + snap guide `#8f8f8f` when dragging media in.
7. Type: 10px tabular-nums timeline text; 11px panel labels; 12px body; 13px
   buttons. System UI stack.

## D11 — Repo/infra decisions

- Lives at `ui-mock/shell-mini/` (own package.json; independent install —
  sibling's lockfile is not shared; document Node floor `^20.19 || >=22.12`).
- `.gitignore`: node_modules, dist, storybook-static, *.log (NO .env needed —
  no annotakit; if wired later, track .env per the user's GIT-ISM-DISK law).
- README: what it is, run/test/storybook commands, IN/OUT feature ledger,
  deviations register (incl. annotakit skip, white playhead, no-frames, fixed
  layout, read-only inspector).
- Commits on `main` (small step commits, push each milestone; gitlab mirror
  second remote; fetch-before-push per standing rules).

## Open questions for the audit round

- Q1: Is 2 tracks (V1+A1) the right minimal count, or 1 video track only?
- Q2: Pointer-DnD media→timeline in v0.1 — or is click-to-append enough for
  the loop? (DnD adds ~80 lines of edge-case handling.)
- Q3: Timecode display format: `MM:SS.d` (mono, 10px, pill) vs `MM:SS:FF`
  (needs an fps fiction). Leaning MM:SS.d.
- Q4: Should the timeline panel be full-width docked or a floating card with
  18px side margins (RH `--canvas-editor-space-node`)? Leaning floating card
  (skin-faithful, matches "panels over canvas" feel).

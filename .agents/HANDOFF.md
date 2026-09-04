# HANDOFF — Next Session Scope (nle-core-spec)

**Written:** 2026-09-04, end of the R11 mockup-completeness + audio-focus session (pushed through `e0eaed2`)
**Scope of this file:** IMMEDIATE next session ONLY. Long horizon lives in `.agents/PLAN.md`. Process meta-lessons live in `.agents/SKILL.md`.

---

## What this session produced

`ui-mock/shell-variants/` — the mockup grew from "direction study" to near-spec-complete shell:

- **Layout overhauled to spec-18 geometry** (splitter-owned 12px seams, 12px scrub/status, TrackHeader 2-row fit in 160px with names, sticky ruler, full-viewport playhead).
- **The five missing v1.1 surfaces**: context menus (§4.9), toasts + confirms + error boundary (§6.4), state rows, wheel/pointer grammar (native non-passive listener), sample project + 40-key cheat-sheet-generated map (JKL, undo, ripple-trim, marquee, Alt-dup, Esc-cancel).
- **Audio focus mode** — the answer to "where's the mixer / DAW↔NLE switch": peer-reviewed design in `ui-mock/shell-variants/docs/DESIGN-audio-mode.md` v2.1, implemented: 4th dock page (⌘4), 3-state mixer row (collapsed/bridge/full), channel strips + ducking row (spec 20 §12.2 mock answer), ChannelEditor (Clip S-layer + Track G-layer), Sound Library with roles, escalation gesture, Esc exit.
- **Storybook 9** review surface (29 stories, `npm run storybook`).
- Review gates passed: R11 code review majors all fixed; re-check verdict **NO MAJORS REMAIN** (remaining minors: 10px floor in dense strips vs 11px normative — documented deviation; ⌘M focuses audio tracks only).

## Next session's task: THE USER REACTION (this is the gate)

1. **Tour**: preview panel (port 3000 root route) or `cd ui-mock/shell-variants && npm i && npm run dev` → :5173/mockup/. Presets A/B/C via Ctrl+\`; **Audio focus** via dock button or ⌘4; mixer 3-state via the timeline-toolbar AudioLines button; escalation = dbl-click an audio clip.
2. **Capture decisions** (each is a DESIGN-audio-mode.md §11 question): focus mode vs page split; mixer states/defaults; levels redundancy; channel-editor shape; ducking row; escalation gesture; Sound Library. Plus the standing A/B/C direction choice.
3. **Then**: feed decisions into tokens/mixer; the surviving audio design gets lifted into the spec-18 mixer-panel section at seal (PLAN items 14-18 register the spec-side findings).

## Repo state at handoff

| Repo | Commit | Notes |
|---|---|---|
| nle-core-spec (canon) | `e0eaed2` | 21 specs unchanged; `ui-mock/shell-variants/` (app + storybook + docs/DESIGN-audio-mode.md + screenshots incl. preset-a-audio-focus.png) |

## Mechanics to reuse (this session's working patterns)

- **Design-decision loop**: write the design doc → fresh-context peer reviewer (general-purpose agent) → fold refinements → resume the SAME reviewer for the re-check (verdict-gated: "SOUND WITH REFINEMENTS" → "APPROVED FOR IMPLEMENTATION"). Cheap, keeps context, extremely effective.
- **Parallel implementation on disjoint files**: the orchestrator pre-adds ALL store state/actions first (one big store edit), then dispatches feature agents that consume (never edit) the store + own disjoint file sets. Zero merge conflicts.
- **Zustand v5 law** (SKILL #24): selectors MUST return stable references — `?? {…}` / `.filter()` in the selector loops useSyncExternalStore (React infinite update). Module-level constants or select the container object.
- **Wheel grammar**: React onWheel is passive — preventDefault is a no-op; use a native `addEventListener('wheel', fn, {passive:false})` in a useEffect.
- **Env gotchas** (unchanged): clone at `/home/z/nle-core-spec` (watchdog!), `bash /home/z/my-project/scripts/vite-up.sh` (server reaped between calls; pkill pattern is `node_modules/vite`), agent-browser screenshots need ABSOLUTE paths + `set viewport 1920 1080` first; restart vite (pkill + up) after big file changes — HMR goes stale and lies (reports module errors that a restart clears).

## Standing cautions

- Never edit web-daw-core's `copy`-class files (file-class law).
- The spec set is CONTRACT + GAP + ACCEPTANCE (Decision 14): the mock does NOT amend specs — R11 spec findings are registered as PLAN items 14-18 for the seal round.
- Push at every micro milestone; `git fetch` before push; never force push.

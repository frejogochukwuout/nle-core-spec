# HANDOFF — Next Session Scope (nle-core-spec)

**Written:** 2026-09-03, end of the shell-variants mockup session (pushed through the final wrap-up commit)
**Scope of this file:** IMMEDIATE next session ONLY. Long horizon lives in `.agents/PLAN.md`. Process meta-lessons live in `.agents/SKILL.md`.

---

## The artifact this session produced

`ui-mock/shell-variants/` — an interactive TSX mockup of the spec-18 UI shell with a **direction-variant system** (Ctrl + ` Variant Explorer):

- **A — Resolve Classic**: spec-18 §9 canon tokens, flush chrome, gold state accents, red playhead, filmstrip clips (spec 05 §7), 160px TC-readout headers.
- **B — Modern Studio**: elevated dark — floating rounded panels on a darker base, violet accents, comfortable density, slim 112px headers, 8px clip radius.
- **C — Editorial Light**: light surfaces with near-black monitor surround, banded lanes, dark-on-light clip labels — the living test of 18 §8.14's light-theme rejection.
- Independent dimensions (theme / density / clip rendering / accent / header style), persistence + URL-hash share links, mock-level interactions (clip move/trim/blade-split with 10px snap, playhead drag + transport, media search/sort, scene tabs, color + deliver pages, cheat sheet `?`).

Three sub-agent UX peer-review rounds landed at: **"NO MAJORS REMAIN — direction study is valid for user review."** Screenshots of every preset/page are committed under `ui-mock/shell-variants/screenshots/`.

## Next session's task: THE USER REACTION (this is the gate)

1. **Tour the three presets** (or the dimension toggles): the platform preview serves the static build at the root route; locally `cd ui-mock/shell-variants && npm i && npm run dev` → http://localhost:5173/mockup/. Ctrl + ` opens the Variant Explorer; the pill button bottom-right is the fallback. Per-preset screenshots: `screenshots/preset-{a,b,c}-*.png`.
2. **Capture the direction decision** (A / B / C / hybrid + dimension preferences). If the user wants tuning, edit `src/lib/variants.ts` presets + `src/styles/tokens.css` — everything is token-driven; no layout surgery needed for palette/radius/density changes.
3. **Then** (only after the decision): fold it into PLAN's UI/UX track step 3 — the chosen token set becomes the blueprint for P1's shell wiring — and register the four spec-side findings (PLAN items 10-13: playhead provenance, tool-key conflict, accent-focus AA pair, status-strip size) as seal-round checklist rows.

## Repo state at handoff

| Repo | Commit | Notes |
|---|---|---|
| nle-core-spec (canon) | final wrap-up commit after `390fd48` | 21 specs unchanged + `ui-mock/shell-variants/` (app + media + screenshots + README with deviations & review log) |

No other repo was touched this session. The mock's stack follows spec 00 §4 (React 19 + Vite + Tailwind 4 + Zustand) — the platform's Next.js app is only the preview vehicle (static build synced to its `public/mockup/`).

## Mechanics to reuse (this session's working patterns)

- **Variant system**: `data-theme/density/clipstyle/accent/headerstyle` attributes drive CSS-variable token blocks; presets are plain data in `lib/variants.ts`; share links = `#v=theme:studio,...` (parsed on boot, localStorage fallback).
- **Sub-agent review loop**: 3 personas (pro editor / product designer / a11y+spec), each with screenshots + repo paths + the `z-ai vision` CLI; REQUIRE live interaction tests (agent-browser) — R2's worst bug (drag teleport) and R3's (dead CSS class) were only catchable live. Iterate until an explicit "NO MAJORS REMAIN" verdict; resume the same reviewer agent for re-checks (Task tool `resume`).
- **Environment gotchas** (see SKILL #19-22): work in the clone at `/home/z/repos/nle-core-spec` (watchdog); `bash /home/z/my-project/scripts/vite-up.sh` re-raises the dev server (it is reaped between tool calls); agent-browser screenshots need ABSOLUTE paths (relative paths resolve in the daemon's cwd); set viewport 1920×1080 before testing or the window-too-small overlay blocks everything; rebuild + `cp -r dist /home/z/my-project/public/mockup` after changes to refresh the preview.

## Standing cautions

- Never edit web-daw-core's `copy`-class files by hand (file-class law; sync overwrites).
- The spec set is CONTRACT + GAP + ACCEPTANCE (Decision 14): the mock deliberately does NOT amend specs — its findings are registered in PLAN items 10-13 for the seal round instead.
- Push at every micro milestone (never lose work to infra failure); `git fetch` before push.

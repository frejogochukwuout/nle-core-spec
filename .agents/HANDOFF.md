# HANDOFF — Next Session Scope (nle-core-spec)

**Written:** 2026-09-05 ~03:00, end of the R15-UI round (mockup timeline parity + audio overhaul; pushed through `1ae0f58`; the PARALLEL spec-side R15 assembly round is also complete — see its own prior HANDOFF content in git history `b0583a6` if needed)
**Scope of this file:** IMMEDIATE next session ONLY. Long horizon: `.agents/PLAN.md`. Process meta-lessons: `.agents/SKILL.md` (#47-51 are this round's).

---

## What this session produced (R15-UI)

The mockup's UI layer is now on par with the canonical timeline seam + has a professional audio/mixer surface:

- **Research artifacts** (`.agents/research-r15/`): opencut-timeline seam contract (43-point parity extraction), web-daw-ui pattern reference (knob breakage diagnosis), mockup current-state audit (18 defects)
- **Design docs** (`.agents/design/`): R15-timeline-parity + R15-audio-overhaul, v2 FINAL after adversarial C1/C2 critique (the zero-anchor inversion + antiphase indicator were caught pre-implementation)
- **Timeline parity (T1-T9):** canonical zoom (50×zoom [5,5000], ×1.7, dynamic fit-min spec-05 §5.2, two-regime playhead-anchored zoom via lib/zoomController + rAF-coalesced wheel), CapCut ruler tiers + virtualization (lib/rulerTiers), full gesture discipline (5px threshold, drag-back-cancel, buttons-mask, right-click routing), 2D cross-track drag with preferIndex resolution + half-open overlap rejection + magnetic zero-anchor + mixed-group rejection (lib/timelinePlacement), ripple interval-diff (lib/ripple), trim laws 1-frame + neighbor/source bounds (lib/trimLaws) + all 5 tool gestures live (roll/ripple/slip/slide/stretch), snap upgrade + indicator, clip virtualization, follow-scroll
- **Audio overhaul (A0-A5):** tokens in all 3 skins, SVG Knob (270° arc, above-center indicator — the broken pendulum is dead), stereo meterEngine (shared rAF ticker, duckAmount + effectiveMuted, ballistics in dB), dB-linear StripMeter (green/amber@−18/red@−6 + segments + peak + clip), fader scale column, strip chrome + role base bars, TrackHeader micro-meters (v2.2 §3.2 closed), Storybook 83 stories with deterministic levels
- **Verification:** 596→**788 tests** (+192), tsc clean, storybook build green; review rounds V1 (4 verified bugs) → F1 fixes → V2 **SHIP**; PR #1 summary comment posted; spec registrations §G (spec-16 §3.8 ×1.7; spec-18 §5A two-regime, 18↔05 conflict resolved)
- **Preview runtime:** static build re-synced (`/home/z/my-project/public/mockup`), runtime copy synced, **supervisor crash fixed** (numeric-fd write), **NEW `src/instrumentation.ts` auto-boot chain** (platform next-server start → supervisor → storybook :3000 → verified 200) — opening the preview URL now reliably brings Storybook up

## Next session's task

1. **CodeRabbit re-review harvest:** the 14-commit range on PR #1 will have fresh findings (it re-reviews on push) — triage to P3-only as usual, fix real ones, post the audit table
2. **Deferred P3s (V2):** duplicateAndMove raw-API misuse edges (unreachable from the gesture seam); snap-ON head-drag raw fallthrough
3. **G.4 deferral ledger** (engine-team questions): roll B-source-tail bound rate≠1, preview batch-atomicity vs raw per-move drops, seek-click 500ms gate deviation
4. **Cross-round integration:** the spec-side R15 landed the assembly plan (spec 14) + 17 re-baselined all four repos — the mock's new libs (timelinePlacement/trimLaws/ripple/pixel) are the UI-side projection of OT's engine; when the assembly A-phases start wiring the REAL engine, these libs become the adapter seam to verify against OT's 24-command headless API
5. **Runtime check on session start:** verify :3000 storybook via the preview URL (instrumentation chain), and `git fetch` FIRST — the spec-side session works in parallel

## Restoration recipe (fresh sandbox)

1. `git clone https://<PAT>@github.com/frejogochukwuout/nle-core-spec` → `cd nle-core-spec && npm ci` in `ui-mock/shell-variants` (node_modules is NOT in git)
2. Baseline: `npx vitest run` (expect **788/788**) + `npx tsc --noEmit` (clean)
3. Add the gitlab backup remote: `git remote add gitlab https://ansgareutychisO:<GLPAT>@gitlab.com/ansgareutychisO/nle-core-spec.git` (WAF blocks ~1/3 of pushes — retry loop)
4. Reference repos (PAT-accessible, private): `git clone https://<PAT>@github.com/bearachprema/opencut-timeline` + `zmmac1/web-daw-ui` + `bearachprema/web-daw-core`
5. Runtime: rsync repo `ui-mock/shell-variants/{src,.storybook,package.json,...}` → `/home/z/my-project/shell-variants/` (node_modules already there), `npx vite build` → copy `dist/*` + `public/*` → `/home/z/my-project/public/mockup/`; the supervisor (`scripts/sb-supervisor.mjs`) + `src/instrumentation.ts` in my-project boot storybook on :3000 when the platform server starts
6. Read `.agents/PLAN.md` (R15-UI entry) + this file + `SKILL.md` #47-51 + `/home/z/my-project/worklog.md` tail

# Scout report — nle-ui (R25 fleet audit)

## nle-ui update card (R25, @ 3026099)

- **Repo:** `/home/z/my-project/nle-ui` — HEAD `3026099` == `origin/main`, tree clean (node_modules reinstalled via bun from the committed lockfile; gitignored, `git status` clean before/after).
- **Identity (ground-truth correction):** nle-ui is the **shell-variants-derived PACKAGE** (`ui-mock/shell-variants` subtree split, 34 commits preserved) — the engine-free React shell package + its own mock timeline, 674 tests. The **MiniShell (C0, 355/355, R23 seal) lives in the SPEC repo** at `nle-core-spec/ui-mock/shell-mini`, NOT here. The task brief's "nle-ui is the shell-mini home" conflates the two; both are covered below (the census is run against BOTH surfaces, nle-ui mock primary, shell-mini as the R18e/R23-sealed reference).
- **R25 delta vs R24 pin `fc4cc35`:** 6 commits, **all shell-surface / keymap-lockstep / docs — ZERO commits touch `src/components/timeline/` (the mini's trim/split/ripple gesture surface is byte-identical to R24)**, and `src/state/timelineRouter.ts` (the OT-consumption seam) is unchanged. The vendored OT timeline is NOT in this repo — it lives in the consumer (`nle-test-app` → `vendor/nle-timeline` @ c15a629, byte-exact lock-copy); nle-ui's half of that seam is the router contract + yield-set.
- **Gates re-run LIVE at 3026099:** vitest **674/674** (37 files, 150s, 0 fail) · `tsc --noEmit` exit 0 · boundary check OK (engine-free law). Bonus: spec-repo shell-mini re-run **355/355** (17.8s). Stories: 74 (documented/CI-gated; build not re-run this round).

### Commits since R24 pin fc4cc35 (6 — the R9 "W-D lockstep + laws" round)

| Commit | What it did | Surface touched |
|---|---|---|
| `2646d80` | **D30 W-D cross-repo lockstep wave (package half):** (1) useShortcuts yield-set gains `'r'` (engineOwnedPlain + shiftedYields — the port's r/⇧R loop-from-selection rows own r in the engine world; ripple tool keeps it mock-world); (2) shortcutMap truth rows (W11 JKL-ladder annotations + tool-ripple dual-world row); (3) Viewer scrub row data-transport (Z4 double-apply guard target); (4) StatusStrip `storageLabel` PROP seam + `shell-status-storage` testid (Z7 — app passes truthful 'localStorage'); (5) Inspector video-tab **Link A/V toggle** (Z5 — store.link view state, gates the app's N4 dispatch); (6) ColorPage Brightness + Hue sliders (CR e). 674/674 | **Shell surfaces + keymap/shortcut seam.** NOT the timeline edit-mode surface; NOT the vendored-OT seam directly (the lockstep partner lives in nle-test-app) |
| `604ec79` | 9-G1 P1-2 fix: ColorPage hue domain packed into the Slider's ±100 clamp (v = deg/360×200 − 100; first cut left half the wheel unreachable + readback clamp-lay >180). 674/674 | ColorPage only |
| `95304e9` | worklog R9-close entry | docs |
| `d22e4e9` | DECISIONS #30 (D30 ruling set: wire-dispatch absorption, coverage gate, Z-series, CR protocol) | docs |
| `8075255` | R9 wrap: PLAN R9 section + HANDOFF rewritten to R9-close (fleet pins c15a629/5036387/85b81b0, gate, CR state, landmines) | docs |
| `3026099` | SKILL R9 laws: jsdom DragEvent trap, LIFO accumulator law, setLoopRegion notify-always class, merge-file 3-way discipline + tail-cut bug class, cross-repo key lockstep, focused-surface arrow law, virtualization + empty-track bridge law, census law | docs (new `.agents/SKILL.md` section) |

**Edit-mode surface touched? NO.** OT-consumption seam touched? Only its SHELL-side keymap halves (yield-set + truth rows). Shell surfaces touched? Yes (StatusStrip/Inspector/Viewer/ColorPage/AppShell threading).

### Test counts

- **674/674 — RUN LIVE** at `3026099` (`npx vitest run`: 37 files / 150.4s / 0 failures). Matches commit claims 674/674 @ 2646d80 and @ 604ec79 exactly. No repo test-report JSON exists (no committed reporter output) — live run is the authority.
- tsc exit 0; `scripts/check-boundary.mjs` → OK (no engine/vendor imports in package src). 74 stories (docs + CI storybook/CSS gate; static build not re-run).
- Context: spec-repo `ui-mock/shell-mini` re-run live **355/355** (the R23 seal number still exact).

### Edit-mode census (10 DaVinci modes — the nle-ui MINI/mock shell, engine-free world)

Primary surface = `MockTimelineRegion` (`src/components/timeline/`: Timeline.tsx, Clip.tsx) + `src/state/useUiStore.ts` + `src/hooks/useShortcuts.ts`. Tool ids exist for select/blade/roll/ripple/slip/slide/stretch (`TimelineToolbar.tsx:31-39`, keys V/B/T/R/Y/U — `useShortcuts.ts:412-417`), **but Clip.tsx only branches on `blade` (split) and `select` (trim handles, `Clip.tsx:522,534`); all other tools = inert view-state (body drag stays a plain move, `Clip.tsx:114-120`).**

| # | Mode | nle-ui mini verdict | Evidence (component + behavior) |
|---|---|---|---|
| a | **Roll trim** | **ABSENT as gesture** (tool selectable, no behavior) | `Clip.tsx:522/534` trim handles refuse any tool ≠ select; no both-edges / edit-point-between-clips handler anywhere; no roll branch in `useUiStore.ts`. Tool row: `TimelineToolbar.tsx:34`, `shortcutMap.ts:52`, `useShortcuts.test.tsx:185` pins the key only |
| b | **Ripple trim** | **IMPLEMENTED via keyboard/command surface** (ripple TOOL gesture absent) | `trimToPlayhead(edge, ripple)` — `useUiStore.ts:889-961`: ⌥[ / ⌥] (`useShortcuts.ts:380-387`) ripple end/start-trim with follower-shift laws (ripple-l keeps start + shifts everything from old end left by the removed head; ripple-r downstream abuts new end; lane re-sort); ripple delete ⇧⌫ / menu (`deleteElements(ids, true)`, `useUiStore.ts:819-842`, `Clip.tsx:257-258`); R25 delta added the dual-world truth row (`shortcutMap.ts:55-56`). No `rippleShiftAfter`-style pointer gesture |
| c | **Slip** | **PARTIAL — keyboard nudges only** (tool inert) | `slipNudge` (`,`/`.` ±1 frame, ⇧ ×10 — `useShortcuts.ts:431-432`): shifts `sourceStart` (source window) keeping placement, clips without sourceStart skipped (`useUiStore.ts:870-887`); routed as `{type:'slip'}` engine command when attached. Slip TOOL (Y) has no pointer gesture |
| d | **Slide** | **ABSENT** | Tool id + icon + key exist (`TimelineToolbar.tsx:37`, `useShortcuts.ts:416`) but zero slide behavior: no store action, no neighbor-preserving move-with-trim, no dispatch verb (`timelineRouter.ts` has no slide command). Only references are the radio row + shortcut row |
| e | **Insert edit** | **SPLIT implemented; media-pool INSERT absent (honest-mock)** | Mid-clip split at playhead: ⌘B + blade click + clip-menu row → `splitElement` (`Clip.tsx:177-184,233-237`, `useUiStore.ts:757-784` — link/sever + transitionOut laws). Pool→timeline: lane drop = **toast only** — "mock: insertElement lands with the engine round (spec 15 §5.4/06 §5.9)" (`Timeline.tsx:317-338`); pool menu 'Insert at Playhead' is a disabled honest row (`MediaPool.tsx:377`). No push-later-clips insert verb anywhere |
| f | **Overwrite edit** | **ABSENT** | No overwrite verb (no store action / router command / menu row); pool placement never commits |
| g | **Replace** | **ABSENT** | No replace verb in any surface (grep: no such command) |
| h | **Append-at-end** | **PARTIAL — clip duplicate-adjacent only** | `duplicateElements` with no `at` lands the copy at `startTime + duration` (adjacent after original, `useUiStore.ts:858`); Alt+drag duplicate at drop point (one history entry, `Clip.tsx:151-159`). No pool-append-into-timeline, no append-at-track-end-of-new-media |
| i | **Ripple overwrite** | **ABSENT** | No such verb (no store action / router command) |
| j | **Fit-to-fill** | **ABSENT** | No such verb. Closest cousin — the rate-stretch TOOL — is likewise selectable-but-inert (no speed gesture; speed edits route only through Inspector `setElementField` patch) |

**Net: 1 implemented (b, command-surface), 3 partial (c, e-split, h), 1 absent-with-honest-scaffolding (e pool-insert), 5 outright absent (a, d, f, g, i, j) — and 5 of 7 TOOL buttons (roll/ripple/slip/slide/stretch) are view-state radios with no gesture semantics in this repo.**

Reference row — the SPEC repo's MiniShell (`nle-core-spec/ui-mock/shell-mini`, R18e, 355/355): (a) roll ABSENT; (b) ripple trim IMPLEMENTED as real gesture+preview (ripple toggle in toolbar, follower shift committed AND on the live preview path, quantize/floor laws — `src/state/useMini.ts:839+,515`, tests `useMini.test.ts:390-434,476-509`); (c) slip ABSENT (no source-window verb — its clips carry no sourceStart); (d) slide ABSENT; (e) split IMPLEMENTED (`splitAtPlayhead`, `useMini.ts:891`) + **pool insert IMPLEMENTED** (`insertMediaAt` — kind-routed drop with gap placement: exact spot when free, next open spot otherwise, honest toasts; `useMini.ts:1073-1111`, R18e feedback #13 closed); (f–j) absent; (h) append PARTIAL (click-to-append from pool: audio→A1, video/image→V1 at track end — `useMini.test.ts:171-169`). RH cut styles 裁剪开始/裁剪结束 = `[`/`]` cutHead/cutTail at playhead, ripple-aware (`useMini.ts:978,1005`).

### Trim visual grammar (what the R18e ripple-preview laws look like on each surface)

**nle-ui mini** (`src/components/timeline/Clip.tsx` + `src/styles/app.css`):
- Trim affordance: **12px invisible hit strips, `ew-resize` cursor** at clip edges (spec 05 §14.2 — `Clip.tsx:514-542`); no painted edge marks at rest.
- During a trim: **optimistic live geometry** (the dragged edge moves in DOM, spec 18 §5) + **live TC bubble** (`clip-drag-tc` — start·dur readout, `Clip.tsx:497-512`) + z-10/drop-shadow lift.
- Selection: 1.5px **accent outline + 12% accent tint** (`Clip.tsx:463-469`); Alt-drag duplicate: **50%-opacity ghost** pinned at origin (`clip-drag-ghost`, `app.css:358-360`).
- **NOT present: green trim edges, dimming of to-be-discarded regions, white outline preview boxes, directional arrows, follower-highlight previews.** Ripple-awareness is textual only (toast "Later clips shifted left", `Clip.tsx:201-202`) — the mock's trim preview never moves followers.
- Pool DnD feedback: lane inset ring — `pool-lane-ok` (accent 2px inset) / `pool-lane-bad` (danger) (`app.css:587-588`, `Timeline.tsx:285-295`).

**shell-mini (spec repo, the R18e/R18g grammar):** 2px accent trim line only on hover/press/focus (`Timeline.tsx:675-679`); ripple ON swaps the trim-handle **tooltips** to follower-language ("later clips follow left", `Timeline.tsx:685,721`) + the preview path **shifts followers live** (floored at the edited clip's new end); cut-style toolbar glyphs are purpose-drawn clip-rect + **dim discarded block** + playhead marks; pool drag paints a `qc-drop-outline` placement ghost (`Timeline.tsx:1064-1067`). Also no green-edge/white-box grammar — the "R18e ripple-preview laws" as built = tooltip hints + live follower shift, not Resolve's full edge grammar.

### Seam evidence (does R25 show BETTER OT-timeline seam integration?)

Yes — on the shell/contract half, demonstrably: the 6 commits are exactly seam hygiene for the app repo's opencut-timeline port:
- **`src/state/timelineRouter.ts`** (unchanged this round, the contract): 13-verb `TimelineEditCommand` dispatch vocabulary (split/trim/trimToPlayhead/move/slip/delete/duplicate/patch/addTrack/addMarker/removeMarkers + transport/track methods), single-writer law, seconds-at-seam; `setTimelineRouter` mount-time registration; contract pinned by `timelineRouterDispatch.test.ts`. Store actions route through it when attached (`useUiStore.ts:718-961`), mock-law fallbacks when null — 674 tests run router-less by construction.
- **The r-key cross-repo lockstep (D28-A5/D30-R6, NEW this round):** `useShortcuts.ts:69,81` — 'r' joins `engineOwnedPlain` + `shiftedYields`; the mock ripple tool keeps r router-less. The port's r/⇧R loop rows own it in the engine world — re-pinning either repo alone reintroduces the double-fire (the law is now in SKILL.md + shortcutMap's dual-world truth row).
- **Truth rows** (`shortcutMap.ts:26-58,63-77,90-91`): cheat-sheet rows carry `engine:` annotations (JKL W11 ladder, delete, undo facade, blade/bookmark, tool-ripple) rendered live iff a router is attached — the split-brain is documented at the user surface.
- **New shell prop seams (Z5/Z7):** StatusStrip `storageLabel` prop (`StatusStrip.tsx:31-38` — host owns the storage truth), Inspector A/V link toggle (`Inspector.tsx:661-664,850-862` — store.link gates the app's N4 dispatch expansion), Viewer scrub data-transport row (`Viewer.tsx`, the Z4 double-apply guard target).
- **Consumer-side (documented, not in this repo):** app repo port EXACT upstream c15a629 (35/40 byte-exact, 5 port-locals 3-way merged), page-owned wire + attachWire registry, 24/24 coverage gate, 206/206 — nle-ui's package contract is the stable half that consumption rides.
- **Boundary law intact:** zero engine/vendor imports in package src (live check).

### Queue (nle-ui's own, post-R9 — from `.agents/HANDOFF.md` "Next-session scope" + PLAN R9 unchecked)

1. PR follow-ups: poll both PR #1s (coderabbit on R8/R9 waves; `gh-poll.py`); fold post-snapshot doc commits.
2. **Upstream session-15 harvest** (opencut-timeline main > c15a629 — the standing test app + op-surface parity audit); re-pin lock-copy + port per the R9 3-way procedure.
3. Engine CR follow-ups fired R10: opencut R9-a..d (spec-queue endorsement, keyframe-authoring gap, upstream-back candidates incl. W8 playhead guard + the jsdom DragEvent trap, WIRE_UI_EXCEPTIONS shared constant) + nle-engine R9-a..d (transform sidecars, maintainPitch, scene-grade seam promotion, preview widening); web-daw-core: none.
4. T1 view-math port (R6-b, carried; re-evaluate vs the W11 view work) + frozen-grammar re-pin batch F1–F4 (maintainer's call).
5. W3 remainder (D15–D17) + LUT/wheels GPU path (rides nle-engine R9-d CR) + U12 real decode (N5).
6. PLAN-carried debts visible in code: P-widen (patch member grows `transitionOut` — router already carries it, doc-side staleness documented) and P-lock-route (toggleTrackLock engine routing) are queued into the ENGINE repos' trackers.

### Sealed-vs-in-flight verdict

- **SEALED:** the mini's timeline edit-mode gesture surface — **zero diff since the R24 pin fc4cc35** (no commit touches `src/components/timeline/`); the mock-law suite (613-class pins) untouched and green. The MiniShell proper (spec repo, 355/355) likewise re-verified exact. "Mostly considered sealed" is accurate for the edit-mode surface: the census verdict (1 implemented / 3 partial / 6 absent in nle-ui's mock) is unchanged since R24 — the 10-mode gap is the standing honest-subset state, pinned by honest-mock rows (pool-insert toast, disabled Insert-at-Playhead, inert tool radios).
- **IN FLIGHT (and moving in the right direction):** the R9 round was pure **seam integration** on the package's contracts — the r-key lockstep, dual-world truth rows, and three new host-truth prop seams (storageLabel, link, scrub transport) all harden the OT-consumption surface the app's ported timeline rides, with fleet pin coherence (c15a629/5036387/85b81b0) and the coverage gate on the consumer side. Nothing regressed; nothing edit-mode-related advanced either.
- **Watch items:** the upstream session-15 harvest (opencut main > c15a629) is the next real seam-motion event; the r-key lockstep is a cross-repo landmine (re-pin one repo without the other → double-fire); SKILL's census law now institutionalizes exactly this per-mode counting — the mini's next edit-mode advance (roll/slide/fit-to-fill or a real insert verb) is queued NOWHERE in nle-ui's own PLAN (it would ride the engine repos' CRs or a spec directive).

---
*Scout: R25 fleet round, read-only + this file. Tests/tsc/boundary run live (bun install from committed lockfile; node_modules gitignored). Nothing committed; no worklogs appended; nothing served.*

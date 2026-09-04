# nle-core-spec

Implementation specification for a browser-based NLE (Non-Linear Editor) — rough-cut editor with FCPXML handoff to flagship NLEs (Final Cut Pro, DaVinci Resolve, Premiere Pro).

## What's in this repo

This repo contains the **architectural and implementation specification** for a browser-based NLE. It is NOT a code project — it's the design document set that an implementation team (human or AI) would build from. The visual reference for the UI lives under `./ui-mock` (see spec 18).

### Spec set

| File | Subject |
|---|---|
| `00-master-spec.md` | Executive summary, **17 architectural decisions** (R9 three-domain D12/D13/D14 + R15: D15 evolve-in-place, D16 `nle-app` assembly, D17 four-walls-one-roof), doc governance §2.5, tech stack, WYSIWYG contract |
| `01-core-engine.md` | `EditorCore` singleton, 12 managers, contract seams, two entry points |
| `02-workers-threading.md` | 10 Web Workers + 1 AudioWorklet, `ManagedWorker` abstraction, memory discipline |
| `03-playback-engine.md` | `AudioContext.currentTime` clock, `MediaTime`/`FrameRate`, 6 sync plans, varispeed |
| `04-renderer-color.md` | WebGPU, 10-bit P010/I420P10 pipeline, scene-linear color management, WGSL shaders |
| `05-timeline.md` | DOM-based timeline, virtualization, all interactions |
| `06-nle-ops.md` | Full NLE op inventory (split/trim/move/ripple/roll/slip/slide/etc.) |
| `07-composition.md` | `FrameDescriptor` builder, layer/transition/effect/mask resolution |
| `08-color-grading.md` | Resolve-style wheels/curves/LUT/qualifier/power window/scopes |
| `09-project-model.md` | Pure JSON schema, OPFS storage, kimdogyeom bug hardening |
| `10-fcpxml-export.md` | FCPXML 1.10 DTD mapping, colorSpace triplets, round-trip |
| `11-cloud-render.md` | Headless Chrome + real GPU + ffmpeg at edges, WYSIWYG |
| `12-testing-strategy.md` | Test infrastructure (Playwright, pixelmatch, virtual framebuffer) |
| `13-subagent-scout-plan.md` | How the specs were refined (process documentation) |
| `14-implementation-phases.md` | The Round-15 assembly plan: week −1 pre-flight + phases A0-A7b + per-domain gap registers (the R9-era P0-P6 bodies retired to git history) |
| `15-wire-protocol.md` | JSON wire protocol: 78 `EngineCommand` types (incl. export commands) + the §4.1A routing-disposition table (all 78 members → one home), Zod schemas, HTTP API |
| `16-keyboard-shortcuts.md` | **181 keyboard bindings** (180 at v1.0 + ⌥R from the R15/A6 amendment), every one mapping to an `EngineCommand` |
| `17-test-plan.md` | Three-tier testing methodology + per-module template |
| `18-ui-shell.md` | UI shell: DaVinci-derived layout (from `ui-mock/`), panels, gesture→command contracts |
| `19-code-references.md` | Canon hierarchy + three-domain reference map (engine/OT/web-daw-core): insight ledger, corrective register C1-C9, ROI table, watch list; R15 re-baselines (engine 274+265+318, OT 423, WDC 721, ui-mock 596) |
| `20-audio-core.md` | The AUDIO domain: web-daw-core adoption, the S/G/E three-layer track model, bridge laws, M1.5 convergence + retirement gates, M2/M3 roadmap |

### Reference teachers and code references

The spec was produced by deep analysis of two open-source browser NLEs:

- **FreeCut** (`github.com/walterlow/freecut`) — primary system-level teacher (workers, threading, sync, audio-clock, grading toolset)
- **OpenCut-classic** (`github.com/opencut-app/opencut-classic`) — primary type-design teacher (`MediaTime`, `FrameRate`, `SceneTracks`, `EditorCore`) and DOM-timeline teacher

The four foundational codebases are the product's code baseline, inherited and evolved in place (Decisions 14-15; mapped and governed by `19-code-references.md` — the spec is the CONTRACT layer; where code and the spec conflict, the spec wins):

- **nle-engine** (`github.com/bearachprema/nle-engine`, private) — clean-room FreeCut port; **~52k LOC (51,968), 274/274 vitest + 265/265 browser milestone rows (31 milestones, real WebGPU) + 318 probe checks, real A/V export decode-verified, API freeze + layer fences live, review ledger closed** @ `f526e67` (R15 baseline); the **RUNTIME-domain core** (player, WebGPU compositor, transitions, export, media, fonts, audio bridge) per Decision 12 — one-audio-engine end-to-end via the vendored web-daw-core bridge (M1.6: the NLE bridge lives engine-side, `src/lib/nle/bridge/` + `tests/vitest/nle-bridge.test.ts`), and the ENGINE home of the SceneTracks→ingestion projector (Decision 16 law 1).
- **opencut-timeline** (`github.com/bearachprema/opencut-timeline`, private — landed Round 8) — clean-room OpenCut-classic distill: **423/423 tests (303 in-page + 120 real-mouse), classic-parity timeline UI landed (W8), W9 review-terminal** @ `0412e41` (R15 baseline); the **EDITING-domain core** (SceneTracks state, ops, controllers, React timeline UI, headless editing commands — 24-command surface, C7 rename pending) per Decision 12 — the single algorithm home, port target for the engine's FreeCut-side op families.
- **web-daw-core** (`github.com/bearachprema/web-daw-core`, private — landed Round 9) — web-daw's DAW-grade engine extracted as a package (**721/721 tests, 30 files, zero runtime deps, PURE core @ `374711c` (R15 baseline), null-test-hardened ≥60 dB**): channel strips, 20+ DSP effects, PDC, aux/sidechain, WAM hosting, offline render. The **AUDIO-domain core** per Decision 13 — contract in spec 20; the NLE bridge relocated to nle-engine per M1.6 (7 files, 6 verbatim, now engine-side); continuously re-synced from the living web-daw upstream.
- **cloudcut-nle** (`github.com/frejogochukwuout/cloudcut-nle`, public — main branch) — the UX/app-scope reference codebase from the prior iteration (messier, lower quality; used only for UX-surface patterns per spec 18 §13) + the `ux-spec` branch's 28-file UX spec integrated into spec 18 v1.1 under the ours-wins policy.
- **ui-mock/davinci_resolve_ui_mock.html** — the visual/layout reference for spec 18 (DaVinci Resolve Edit-page clone, deliberately simplified).
- **ui-mock/shell-variants/** — the interactive TSX successor: a React 19 + Vite mockup of the spec-18 shell with three toggleable UI/UX direction variants (Ctrl + \` variant explorer) for validating the visual direction before implementation — **596/596 tests (34 files), 71 stories, Storybook 10 review surface, 14 review rounds, PR #1 open** @ `d42693e` (R15 baseline); the shell design + chrome layer to be ported into `nle-app` (Decision 16). See its own README.

**Reading order for future sessions:** `00-master-spec.md` → `19-code-references.md` → `20-audio-core.md` → the stream specs (01-18) as needed. **One file per spec — the `.refined.md` era ended in Round 9** (00-master §2.5: edits happen in place; historical round records keep their point-in-time paths by design).

### Process documentation

- `FINAL-SIGNOFF.md` — final sign-off for the initial spec refinement process
- `INTEGRATION-REVIEW.md` — cross-stream consistency review (found 7 issues)
- `INTEGRATION-REAUDIT.md` — verification that all integration fixes were applied
- `TEST-INTEGRATION-REVIEW.md` — testability refinement integration review
- `TESTABILITY-SIGNOFF.md` — final sign-off for the testability refinement
- `audits/` — 28 documents: 16 audit reports documenting every claim verification against source code, plus 12 round-process artifacts (ARCH-R9 three-domain strategy, ROUND-7-AUDITS, SCOUT-R8-A/B/C, ARCH-R15 assembly-and-path, SCOUT-R15-A/B/C/D, REVIEW-R15-ARCH/EXEC)
- `INTEGRATION-REVIEW-R15.md` — Round 15 (2026-09-06) final-gate cross-stream consistency review (13 issues found; all fixed in the R15 fix wave), alongside the R7/R8/R9 integration reviews in the root
- `audits/ROUND-7-AUDITS.md` + `INTEGRATION-REVIEW-R7.md` — Round 7 (2026-09-02): five parallel auditors, per-spec engine code-reference tables (all citations machine-verified), the spec 15 export-command amendment, and the integration re-review

### Agent meta doc

- `.agents/SKILL.md` — generalized know-how for multi-round codebase analysis + spec refinement (recurring value for future agent sessions)

## Key architectural decisions

1. **FreeCut as primary system-level teacher** (workers, threading, sync, lifecycle)
2. **OpenCut-classic as primary type-design teacher** (`MediaTime` integer ticks, rational `FrameRate`, `SceneTracks`)
3. **Pure TypeScript** — no Rust, no WASM toolchain
4. **WebGPU-only** (Chromium 113+, no WebGL2 fallback)
5. **10-bit color end-to-end, scene-linear working space**
6. **One engine, two entry points** (browser interactive + cloud render) — WYSIWYG by construction
7. **No native desktop** (deferred; rebuild later if needed)
8. **Cloud render via headless Chrome + ffmpeg** (same engine, bit-identical output)
9. **Data-driven engine architecture** (JSON-in/JSON-out, three identical consumers: UI/cloud/test)
10. **Code-reference architecture** (Rounds 7-8) — the spec set is canon; nle-engine, opencut-timeline, and cloudcut-nle (UX scope) are de-risking references whose legacy-pattern deltas are documented and corrected (C1-C9), never adopted; ~~Decision 11 binds them with one state model, one wire protocol, two algorithm homes, one render seam~~ — **amended Round 9 (Decision 12)**: three domains, ONE editing core + one runtime core + one audio core, a one-way projector, one render seam, one audio seam (see `19-code-references.md` §2.4)
11. **Three-domain architecture** (Round 9, Decision 12) — opencut-timeline is the editing core (SceneTracks single truth + UI/controllers, engine ops port-scheduled in); nle-engine is the runtime core (its timeline re-typed as a one-way render-scheduling projection)
12. **web-daw-core audio adoption** (Round 9, Decision 13) — the S/G/E three-layer track model is spec law (spec 20); AudioMixer retires at the M1.5 parity gate
13. **Contract + gap + acceptance** (Round 9, Decision 14) — the spec set is re-typed as the contract layer over the three-repo code baseline; inherit, don't rebuild; the only greenfield surface is the app shell (spec 18)
14. **Single-file canon + code-reference rule** (Round 9, §2.5) — one file per spec (the `.refined.md` suffix era is over); inline code only for protocol shapes / prescriptive pseudo-code / corrective shapes — existing code is cited, never duplicated
15. **Evolve-in-place** (Round 15, Decision 15) — the four foundational repos are the product's code, not its references; fork-in/inherit and close the spec-identified gaps in place (~65-70% product coverage measured; the spec is the gap register + acceptance harness)
16. **Assembly architecture** (Round 15, Decision 16) — a fifth repo `nle-app` composes the three cores as a pinned-submodule lockset; ENGINE-home one-way projector (`nle-engine/src/lib/nle/projector/`); commands DOWN one union at the app bus (spec 15 §4.1A routing-disposition); telemetry UP a separate event staircase; multi-scene app-level; the app contains no domain code
17. **Four walls, one roof** (Round 15, Decision 17) — every repo keeps its full test gates undiluted; the app adds only the seams + the wired whole as five suites (S1-S5); the port-then-swap regression-continuity law governs every rewire

## The WYSIWYG contract

For any project state and frame N:
- **State WYSIWYG**: keyboard path == direct API path → identical `SceneState`
- **Pixel WYSIWYG**: browser render == cloud render → 0% pixel diff
- **Audio WYSIWYG**: `AudioContext` == `OfflineAudioContext` → bit-identical PCM

## How this spec was produced

The spec was produced via a multi-round sub-agent process:

1. **Round 1**: Architect wrote seed specs (00-14) based on conversation with the user
2. **Round 2**: 12 scout sub-agents refined each spec by reading actual source code from FreeCut and OpenCut-classic
3. **Round 3**: 12 auditor sub-agents independently verified each scout's claims against source code
4. **Round 4**: Revision agents applied audit fixes surgically
5. **Round 5**: Integration review verified cross-stream consistency
6. **Round 6**: Testability refinement added data-driven architecture (spec 15), keyboard shortcuts (spec 16), overall test plan (spec 17), and per-spec Testing sections
7. **Round 7** (2026-09-02): code-reference integration — five parallel auditors mapped every stream spec to the nle-engine reference repo (all citations machine-verified), the UI shell (spec 18) and reference architecture (spec 19) were authored, the spec 15 export-command amendment landed (73→78 types), 15 fixture registrations + all known MINOR issues were resolved, and the master/README/phases were updated
8. **Rounds 8-15**: R8 landed opencut-timeline + the seam contract; R9 the three-domain architecture (D12/D13/D14) + web-daw-core adoption; R10-R14 the ui-mock shell workstream (spec 18 validated, 596 tests, 14 review rounds); **R15 (2026-09-05) the final architecture push** — Decisions 15/16/17 (evolve-in-place + `nle-app` assembly + roof verification), spec 14 rewritten as the assembly plan, spec 15 §4.1A routing-disposition table, all four repos scout-re-baselined, and the A/N/B amendment sweep across 09/05/16/18/20

Every claim in the refined specs has a file:line citation to actual source code. See `audits/` for verification reports.

## License

MIT (for this spec document set). The reference repos (FreeCut, OpenCut-classic) have their own licenses — see the spec for attribution.

## Status

**The spec final push landed Round 15; the assembly plan is chartered.**
The spec set is implementation-ready — execution follows the assembly plan
in `14-implementation-phases.md` (the week −1 pre-flight + phases A0-A7b
over the pinned three-core baseline of Decisions 12-16: nle-engine runtime
+ opencut-timeline editing + web-daw-core audio, composed in the `nle-app`
assembly repo). The full testability layer is in place: three-tier
methodology + the facet coverage matrix + NFR recipes (spec 17 §13A,
00-master §6A) + the Round-15 roof suites S1-S5 (spec 17 §17A).

Round 15 (2026-09-05) landed the closing rulings — Decision 15
(evolve-in-place), Decision 16 (assembly: pinned-submodule lockset,
ENGINE-home projector, two-staircase bus/events), Decision 17
(four-walls-one-roof verification) — with all four repos scout-re-baselined
(engine 274+265+318 @ `f526e67`; OT 423/423 @ `0412e41`; WDC 721/721 @
`374711c`; ui-mock 596/596 @ `d42693e`), spec 15's routing-disposition
table (§4.1A — all 78 union members assigned one home), and spec 14
rewritten as the assembly plan. `audits/ARCH-R15-assembly-and-path.md`
(v2.1 — re-review gate passed) is the round's decision record.

Alongside the specs, `ui-mock/shell-variants/` grew through R1–R14: the
interactive spec-18 shell mockup with direction variants, the Storybook 10
review surface (71 stories), and a vitest test suite (34 files / 596
tests). **PR #1 — the ui-mock work — is open for review** (R14: the full
90-comment review corpus re-audited, zero-no-op wiring sweep landed, and the
both-directions UX-spec scan filed via `.agents/SPEC-REVISION-CANDIDATES.md`
§E + issue #2).

The next step is executing the assembly plan: week −1 (TS one-compiler +
Vite HMR spikes) → A0 (the `nle-app` scaffold) → A1/A2 (projector + bus).
Start with `14-implementation-phases.md` §3 and ARCH-R15 §3.4's exit gates.

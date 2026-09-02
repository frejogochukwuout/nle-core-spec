# nle-core-spec

Implementation specification for a browser-based NLE (Non-Linear Editor) — rough-cut editor with FCPXML handoff to flagship NLEs (Final Cut Pro, DaVinci Resolve, Premiere Pro).

## What's in this repo

This repo contains the **architectural and implementation specification** for a browser-based NLE. It is NOT a code project — it's the design document set that an implementation team (human or AI) would build from. The visual reference for the UI lives under `./ui-mock` (see spec 18).

### Spec set

| File | Subject |
|---|---|
| `00-master-spec.md` | Executive summary, 14 architectural decisions (incl. Round-9's three-domain architecture D12/D13/D14), doc governance §2.5, tech stack, WYSIWYG contract |
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
| `14-implementation-phases.md` | Phased rollout: P0 (playback) → P6 (cloud render) |
| `15-wire-protocol.md` | JSON wire protocol: 78 `EngineCommand` types (incl. export commands), Zod schemas, HTTP API |
| `16-keyboard-shortcuts.md` | ~180 keyboard bindings, every one mapping to an `EngineCommand` |
| `17-test-plan.md` | Three-tier testing methodology + per-module template |
| `18-ui-shell.md` | UI shell: DaVinci-derived layout (from `ui-mock/`), panels, gesture→command contracts |
| `19-code-references.md` | Canon hierarchy + three-domain reference map (engine/OT/web-daw-core): insight ledger, corrective register C1-C9, ROI table, watch list |
| `20-audio-core.md` | The AUDIO domain: web-daw-core adoption, the S/G/E three-layer track model, bridge laws, M1.5 convergence + retirement gates, M2/M3 roadmap |

### Reference teachers and code references

The spec was produced by deep analysis of two open-source browser NLEs:

- **FreeCut** (`github.com/walterlow/freecut`) — primary system-level teacher (workers, threading, sync, audio-clock, grading toolset)
- **OpenCut-classic** (`github.com/opencut-app/opencut-classic`) — primary type-design teacher (`MediaTime`, `FrameRate`, `SceneTracks`, `EditorCore`) and DOM-timeline teacher

Reference codebases are **domain cores** orbiting the spec's contracts (mapped and governed by `19-code-references.md`, Decisions 10-14 — the spec is the CONTRACT layer; where reference code and the spec conflict, the spec wins):

- **nle-engine** (`github.com/bearachprema/nle-engine`, private) — clean-room FreeCut port; **~47k LOC, 202/202 tests, 25/25 milestones, real A/V export decode-verified** after Waves 4A-5C; the **RUNTIME-domain core** (player, WebGPU compositor, transitions, export, media, fonts) per Decision 12; its M1.5 audio wiring is the next convergence duty.
- **opencut-timeline** (`github.com/bearachprema/opencut-timeline`, private — landed Round 8) — clean-room OpenCut-classic distill: **297/297 tests, 30 milestones + 10 real-mouse phases, "FINAL as a distilled opencut timeline"** (its own HANDOFF); the **EDITING-domain core** (SceneTracks state, ops, controllers, React timeline UI, headless editing commands) per Decision 12 — the single algorithm home, port target for the engine's FreeCut-side op families.
- **web-daw-core** (`github.com/bearachprema/web-daw-core`, private — landed Round 9) — web-daw's DAW-grade engine extracted as a package (**737/737 tests, null-test-hardened ≥60 dB**): channel strips, 20+ DSP effects, PDC, aux/sidechain, WAM hosting, offline render, plus the NLE bridge (three-layer track model). The **AUDIO-domain core** per Decision 13 — contract in spec 20; continuously re-synced from the living web-daw upstream.
- **cloudcut-nle** (`github.com/frejogochukwuout/cloudcut-nle`, public — main branch) — the UX/app-scope reference codebase from the prior iteration (messier, lower quality; used only for UX-surface patterns per spec 18 §13) + the `ux-spec` branch's 28-file UX spec integrated into spec 18 v1.1 under the ours-wins policy.
- **ui-mock/davinci_resolve_ui_mock.html** — the visual/layout reference for spec 18 (DaVinci Resolve Edit-page clone, deliberately simplified).

**Reading order for future sessions:** `00-master-spec.md` → `19-code-references.md` → `20-audio-core.md` → the stream specs (01-18) as needed. **One file per spec — the `.refined.md` era ended in Round 9** (00-master §2.5: edits happen in place; historical round records keep their point-in-time paths by design).

### Process documentation

- `FINAL-SIGNOFF.md` — final sign-off for the initial spec refinement process
- `INTEGRATION-REVIEW.md` — cross-stream consistency review (found 7 issues)
- `INTEGRATION-REAUDIT.md` — verification that all integration fixes were applied
- `TEST-INTEGRATION-REVIEW.md` — testability refinement integration review
- `TESTABILITY-SIGNOFF.md` — final sign-off for the testability refinement
- `audits/` — 16 audit reports documenting every claim verification against source code
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

Every claim in the refined specs has a file:line citation to actual source code. See `audits/` for verification reports.

## License

MIT (for this spec document set). The reference repos (FreeCut, OpenCut-classic) have their own licenses — see the spec for attribution.

## Status

**Implementation-ready, Round 8 complete.** Begin with Phase 0 (Playback Spike) per `14-implementation-phases.md` — now the two-repo strategy: nle-engine (engine side) + opencut-timeline (timeline side), bound by the Decision-11 seam (P1's mandatory adapter). The full testability layer is in place: three-tier methodology + the facet coverage matrix + NFR recipes (spec 17 §13A, 00-master §6A). One **seal round** remains (spec 19 §12 has the checklist): the engine's convergence adapters (C2/C8), opencut-timeline's C7 rename + W4/W5/W6, the 22-decision reconciliation audit, and a final citation sweep. Both reference repos are actively worked — hold final judgment on their states until then.

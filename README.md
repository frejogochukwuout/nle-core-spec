# nle-core-spec

Implementation specification for a browser-based NLE (Non-Linear Editor) — rough-cut editor with FCPXML handoff to flagship NLEs (Final Cut Pro, DaVinci Resolve, Premiere Pro).

## What's in this repo

This repo contains the **architectural and implementation specification** for a browser-based NLE. It is NOT a code project — it's the design document set that an implementation team (human or AI) would build from. The visual reference for the UI lives under `./ui-mock` (see spec 18).

### Spec set

| File | Subject |
|---|---|
| `00-master-spec.md` | Executive summary, 10 architectural decisions (incl. Round-7's code-reference architecture), tech stack, WYSIWYG contract |
| `01-core-engine.refined.md` | `EditorCore` singleton, 12 managers, contract seams, two entry points |
| `02-workers-threading.refined.md` | 10 Web Workers + 1 AudioWorklet, `ManagedWorker` abstraction, memory discipline |
| `03-playback-engine.refined.md` | `AudioContext.currentTime` clock, `MediaTime`/`FrameRate`, 6 sync plans, varispeed |
| `04-renderer-color.refined.md` | WebGPU, 10-bit P010/I420P10 pipeline, scene-linear color management, WGSL shaders |
| `05-timeline.refined.md` | DOM-based timeline, virtualization, all interactions |
| `06-nle-ops.refined.md` | Full NLE op inventory (split/trim/move/ripple/roll/slip/slide/etc.) |
| `07-composition.refined.md` | `FrameDescriptor` builder, layer/transition/effect/mask resolution |
| `08-color-grading.refined.md` | Resolve-style wheels/curves/LUT/qualifier/power window/scopes |
| `09-project-model.refined.md` | Pure JSON schema, OPFS storage, kimdogyeom bug hardening |
| `10-fcpxml-export.refined.md` | FCPXML 1.10 DTD mapping, colorSpace triplets, round-trip |
| `11-cloud-render.refined.md` | Headless Chrome + real GPU + ffmpeg at edges, WYSIWYG |
| `12-testing-strategy.refined.md` | Test infrastructure (Playwright, pixelmatch, virtual framebuffer) |
| `13-subagent-scout-plan.md` | How the specs were refined (process documentation) |
| `14-implementation-phases.md` | Phased rollout: P0 (playback) → P6 (cloud render) |
| `15-wire-protocol.md` | JSON wire protocol: 78 `EngineCommand` types (incl. export commands), Zod schemas, HTTP API |
| `16-keyboard-shortcuts.md` | ~180 keyboard bindings, every one mapping to an `EngineCommand` |
| `17-test-plan.md` | Three-tier testing methodology + per-module template |
| `18-ui-shell.md` | UI shell: DaVinci-derived layout (from `ui-mock/`), panels, gesture→command contracts |
| `19-code-references.md` | Canon hierarchy + nle-engine reconciliation: reference map, insight ledger, corrective mapping, ROI table |

### Reference teachers and code references

The spec was produced by deep analysis of two open-source browser NLEs:

- **FreeCut** (`github.com/walterlow/freecut`) — primary system-level teacher (workers, threading, sync, audio-clock, grading toolset)
- **OpenCut-classic** (`github.com/opencut-app/opencut-classic`) — primary type-design teacher (`MediaTime`, `FrameRate`, `SceneTracks`, `EditorCore`) and DOM-timeline teacher

Two private code references orbit the spec (mapped and governed by `19-code-references.md`, Decision 10 — the spec is canon; where reference code and the spec conflict, the spec wins):

- **nle-engine** (`github.com/bearachprema/nle-engine`, private) — clean-room FreeCut port; 37,958 LOC, 124 tests, 43-44 GPU effects, 27 transitions, 102 NLE-op methods; actively closing its own gap charter. De-risks the engine side; inherits FreeCut patterns the spec corrects (8-bit sRGB, JSON-RPC+$ref, class-API surface, single-tier tests, procedural media, zero workers).
- **timeline-distill** (forthcoming) — OpenCut-classic's timeline minus the NLE core; the UI-region counterpart.
- **ui-mock/davinci_resolve_ui_mock.html** — the visual/layout reference for spec 18 (DaVinci Resolve Edit-page clone, deliberately simplified).

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
10. **Code-reference architecture** (Round 7) — the spec set is canon; nle-engine and timeline-distill are de-risking references whose FreeCut-pattern deltas are documented and corrected, never adopted (see `19-code-references.md`)

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

**Implementation-ready, Round 7 complete.** Begin with Phase 0 (Playback Spike) per `14-implementation-phases.md` — which now accounts for the nle-engine reference (per-subsystem refactor-vs-rebuild guidance in `19-code-references.md` §8). One **seal round** remains after the engine's current gap-closure waves land (spec 19 §12 has the checklist): re-baseline the engine watch list, wire the timeline-distill repo when it exists, and final-sweep all citations. The engine is actively being worked — hold final judgment on its state until then.

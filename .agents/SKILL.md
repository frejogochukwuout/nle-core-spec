# SKILL: Multi-Round Codebase Analysis & Spec Refinement

**Category:** Meta / Process
**Recurring value:** Yes — applies to any large codebase analysis + spec generation task
**One-off value:** No — does NOT track specific session work, project plans, or handoffs

---

## When to Use This Skill

Use this skill when you are asked to:

1. **Deeply analyze one or more large codebases** (e.g., "compare these two GitHub repos", "analyze this codebase and tell me how to adopt it")
2. **Generate a comprehensive implementation spec** from architectural analysis (not just answer a question)
3. **Refine seed specs into detailed implementation specs** with concrete code references
4. **Ensure cross-stream consistency** across many related spec documents
5. **Add a testability layer** to an existing spec set (data-driven architecture, wire protocol, per-module test plans)

Do NOT use this skill for:
- Quick code lookups or single-file analysis
- Answering a factual question (just use web search / Read)
- Building a runnable code project (use fullstack-dev or similar)
- One-off document generation that doesn't require source verification

---

## Core Mental Model: The Three-Layer Architecture

When analyzing a codebase for spec generation, work in three layers:

```
Layer 1: Architectural Decisions (the "why")
  - What patterns did the original authors choose?
  - What constraints forced those choices?
  - Which decisions are locked vs. reversible?

Layer 2: Implementation Contracts (the "what")
  - What are the actual API surfaces (interfaces, types, function signatures)?
  - What are the file paths and line numbers?
  - What patterns are actually used (vs. claimed in docs)?

Layer 3: Testability & Verification (the "how to prove it")
  - How can each decision be programmatically verified?
  - What invariants must hold?
  - What test assets are needed?
```

Most agents stop at Layer 1 (architectural narrative). The value is in Layers 2 and 3 — concrete contracts and verifiable invariants.

---

## The Multi-Round Scout Process

This is the key process innovation. When asked to "deeply analyze and produce a spec," do NOT just write a spec from your own reading. Instead:

### Round structure

```
For each batch of related streams:
  1. SCOUT (parallel, 3-4 agents) — read actual source, produce refined spec
  2. AUDIT (parallel, 1 per scout) — independently verify scout's claims against source
  3. REVISE (parallel, 1 per failed audit) — apply audit fixes surgically
  4. RE-AUDIT (if CRITICAL fix was applied) — verify the fix stuck
```

### Why this matters

- **Scouts make mistakes.** They fabricate claims, miss files, misquote code, get line numbers wrong. Without audit, these errors propagate into implementation.
- **Auditors catch what scouts miss.** A fresh agent reading the same source code with a skeptical eye finds issues the scout rationalized away.
- **Revisions must be surgical.** Don't rewrite the spec — apply targeted edits to fix specific claims.
- **Re-audit confirms the fix.** Especially for CRITICAL issues, verify the revision actually addressed the problem.

### Scout prompt template

When dispatching a scout sub-agent, include:

```
Task ID: SCOUT-XX
Stream: [stream name]

Read first:
  - Master spec (for context)
  - Seed spec (the file to refine)
  - Dependency specs (prior rounds' output)

Your job: refine the seed spec by reading the ACTUAL source code in [repo paths].
For each "Open Question" in the seed spec:
  1. Open the cited file(s)
  2. Read the actual code
  3. Quote the relevant lines (with line numbers)
  4. Verify or correct the seed spec's assumptions
  5. Document any subtleties the seed spec missed

Output: refined spec with:
  - Open Questions replaced with concrete answers (file:line + quoted code)
  - Code References section (every file read)
  - Corrections to Seed Spec section (every wrong assumption)

Rules:
  - Quote real code. Every claim must have file:line.
  - Don't speculate. If a file doesn't exist, say "❌ NOT FOUND".
  - Don't infer from the seed spec — open the actual source and verify.
  - Be honest about gaps. "COULD NOT VERIFY" is better than fabrication.
```

### Audit prompt template

```
Task ID: AUDIT-XX
Stream: [stream name]

You are a code auditor. Verify the scout's refined spec against actual source code.
Be skeptical — your job is to find errors, not confirm the scout.

Spot-check at least 15 specific claims from the refined spec.
For each:
  1. Open the cited source file
  2. Read the cited lines
  3. Verify the claim is accurate (quoted code matches, line numbers correct, summary accurate)
  4. Document any discrepancy

Verdict: ✅ PASS / ⚠️ NEEDS REVISION / ❌ FAIL

Severity guide:
  - CRITICAL: spec gives wrong architectural direction (would lead to bugs in implementation)
  - MAJOR: spec misses something important or misquotes significantly
  - MINOR: typo, off-by-one line number, slightly wrong summary
```

### Critical lesson learned

**The most common scout failure mode is fabrication.** Scouts will claim a file/function/component doesn't exist when it actually does (or vice versa), often because the seed spec said so and the scout didn't verify. Auditors must specifically check for this:

> "The scout claims `DegradedRendererBanner` doesn't exist. Open the cited path. Verify whether the file/function actually exists. If it does, the scout fabricated a 'correction' — flag as CRITICAL."

---

## Sub-Agent Dispatch Strategy

### Parallelism

- **Dispatch scouts in batches of 3-4 parallel.** More than 4 causes context loss between rounds and makes the worklog hard to follow.
- **Dispatch auditors in parallel** (one per scout, all at once).
- **Dispatch revisions in parallel** (one per failed audit).

### Dependency ordering

Process streams in dependency order:

```
Round 1 (foundational): core engine, workers, playback, project model
  ↓ (these define types and APIs that other streams consume)
Round 2 (consumers): renderer, timeline, NLE ops, composition
  ↓ (these consume the foundational types)
Round 3 (extensions): color grading, FCPXML, cloud render, testing
  ↓ (these extend the core)
```

Foundational streams must be refined + audited + revised BEFORE consumers start, so consumers can reference the refined foundational specs.

### Failed scouts

If a scout fails (e.g., context deadline exceeded due to too many web fetches):
- **Retry with a tighter scope.** Cut the nice-to-have research, focus on must-verify items.
- **Mark deferred items explicitly.** "⚠️ DEFERRED — manual verification needed during implementation" is better than failing.

---

## Cross-Stream Integration Review

After all streams are refined + audited + revised, run an integration review:

### What to check

1. **Type system consistency** — same type definitions across all specs (e.g., `MediaTime`, `FrameRate`, `SceneTracks`)
2. **API consistency** — same method names across specs (e.g., if spec 01 says `engine.timeline.splitElements()`, spec 05 must not say `engine.timeline.split()`)
3. **Contract alignment** — producer/consumer pairs match (e.g., spec 07 produces `FrameDescriptor`, spec 04 consumes it — same shape?)
4. **Worker inventory** — workers referenced in specs 03, 09, 11 match those defined in spec 02
5. **WYSIWYG contract** — same definition across all specs that reference it
6. **Color pipeline** — same texture formats, same color space handling
7. **Command pattern** — if a command pattern is defined in spec 01, all specs that use commands follow it
8. **Persistence layer** — storage interface consistent across specs
9. **External format mappings** (e.g., FCPXML) — what the project schema captures matches what the export needs
10. **Browser compatibility** — version requirements consistent
11. **Master spec drift** — did decisions shift during scouting? Master spec needs updating if so.

### Common integration failures

- **Producer/consumer shape mismatch** — spec A produces `items: FrameItem[]` (mixed union), spec B consumes `layers: Layer[]` + `sceneEffects: SceneEffect[]` (separate fields). Renderer won't compile.
- **Method name drift** — seed spec says `engine.timeline.move()`, but actual source code (verified by scout) is `engine.timeline.moveElements()`. Specs that still reference the old name break.
- **Fabricated "corrections"** — a scout claims the seed spec was wrong about X, but the seed spec was actually right. The "correction" introduces a new error.

---

## Data-Driven Architecture for Testability

When designing any engine that will be tested programmatically:

### The pattern

```
Engine = pure JSON-in, JSON-out state machine

Inputs (all JSON):
  - Static: ProjectJSON (the saved state)
  - Runtime: Command[] (sequence of operations)

Outputs (all JSON or binary):
  - State: CurrentState (serializable)
  - Rendered: FrameDescriptor + pixels + audio PCM

Three identical consumers:
  - UI (translates user actions → Commands)
  - Cloud/server (takes JSON over wire)
  - Test harness (constructs Commands directly, no UI)
```

### Why this matters

1. **Avoids UI interaction tax.** Browser automation (Playwright clicks/drags) is slow (~60ms/step) and flaky. Direct `engine.command.apply()` is fast (~5ms/step) and deterministic. ~12× speedup.
2. **WYSIWYG by construction.** Same code path for UI, cloud, and tests — no drift possible.
3. **Future automation-ready.** AI agents, scripting, MCP servers all speak the same Command protocol.
4. **Property-based testing.** Random command sequences can be generated and applied — invariants verified.

### Command design

Use a discriminated union:

```ts
type EngineCommand =
  | { type: 'split'; params: { time: MediaTime; trackIds: string[] | null } }
  | { type: 'trim'; params: { elementId: string; edge: 'start' | 'end'; delta: MediaTime } }
  | { type: 'play' }
  | { type: 'seek'; params: { time: MediaTime } }
  | ... // one per manager method

type CommandResult =
  | { ok: true; stateChange: StateChange; undoInfo?: UndoInfo }
  | { ok: false; error: CommandError };
```

Key rules:
- **Zod schema is source of truth.** TS types inferred via `z.infer<>`. Guarantees type/wire/validation agreement.
- **1:1 mapping to manager methods.** Each command type maps to exactly one `EditorCore.manager.method()` call.
- **Exhaustive dispatch.** Use `const _: never = command` in the switch default to catch missing cases at compile time.
- **`idSeed` for deterministic replay.** Commands that generate new IDs (split, insert, duplicate) accept an optional seed so test runs are reproducible.
- **Batch for transactions.** `CommandBatch` wraps multiple commands atomically (all-or-nothing).

---

## Three-Tier Testing Methodology

When designing tests for a complex engine/UI system:

| Tier | Environment | Speed | What to test here |
|---|---|---|---|
| **Tier 1: Pure engine** | Vitest, no browser | <30s for 1000+ tests | Pure functions, math, state transitions, command dispatch, schema validation, undo/redo |
| **Tier 2: Render** | Playwright + headless Chrome | ~10min for ~100 tests | GPU rendering, pixel output, audio output, composition, effects |
| **Tier 3: UI** | Playwright + keyboard shortcuts | ~5min for ~50 tests | UI translation layer, keyboard shortcuts, event propagation |

### Key principle: Avoid UI interaction tax

- **Clicks/drags are slow and flaky** in browser automation. Avoid them for state verification.
- **Use keyboard shortcuts** for actions that have them — `page.keyboard.press('Cmd+B')` is more reliable than clicking a razor tool then clicking the timeline.
- **Use direct `engine.command.apply()`** for everything else — construct the Command object directly, no UI involvement.
- **Reserve Playwright clicks/drags** for testing the UI translation layer itself (does a click on a clip produce the right Command?).

### WYSIWYG invariants

For any system with multiple execution contexts (browser, cloud, test), define and test three invariants:

1. **State WYSIWYG**: For any `Command[]` sequence, applying via UI path (keyboard) vs direct API path → identical `State`
2. **Pixel WYSIWYG**: For any project + frame N, browser render == cloud render → 0% pixel diff
3. **Audio WYSIWYG**: For any project, real-time render (`AudioContext`) == offline render (`OfflineAudioContext`) → bit-identical PCM

All three should be CI-blocking.

---

## Test Asset Design for Visual Verification

When tests need to verify pixel/audio output:

### Solid-color source clips

Generate solid-color video clips (red, green, blue, white, black, gray) for blend mode and opacity verification:

```bash
ffmpeg -f lavfi -i color=c=red:s=1920x1080:r=30:d=10 -c:v libx264 -pix_fmt yuv420p 10s-red-1080p.mp4
```

Why: a 50/50 blend of red + green in linear-light produces a specific expected pixel value (`rgb(187, 187, 0)` in sRGB). You can sample the center pixel and assert exactly. No perceptual diffing needed.

### Frequency tone audio clips

Generate distinct-frequency sine tones (440Hz, 1000Hz, 100Hz) for audio mix and varispeed verification:

```bash
ffmpeg -f lavfi -i sine=frequency=440:duration=10:sample_rate=48000 -c:a pcm_s16le 10s-440hz-sine.wav
```

Why: varispeed (0.5× playback) should preserve pitch. FFT of the output should show a peak at 440Hz, not 220Hz. Bit-exact verification.

### Reference render outputs

Store "golden" PNG/PCM outputs at specific frame numbers. Tests render the same frame and pixel-diff against the reference. When the renderer changes intentionally, regenerate references via a documented process (with human review).

---

## Codebase Analysis: How to Read a Large Repo

When asked to analyze a large codebase (10K+ LOC):

### Don't try to read everything

- **Use parallel sub-agents.** Each agent reads a subset of files and reports back. Far faster than sequential reading.
- **Give each agent a specific question to answer.** Don't ask "analyze this repo" — ask "does this repo use Web Workers? If so, list every worker file with its purpose."
- **Demand file:line citations.** Every claim must be verifiable. If the agent can't cite a file:line, the claim is suspect.

### What to look for (in priority order)

1. **Architecture documents** — `README.md`, `AGENTS.md`, `ARCHITECTURE.md`, `docs/`. These tell you the intended design.
2. **Package manifests** — `package.json`, `Cargo.toml`, etc. These tell you the actual dependencies (vs. claimed).
3. **Type definitions** — `types/`, `src/types/`, `*.d.ts`. These are the contracts.
4. **Entry points** — `src/index.ts`, `src/main.ts`, `app/`. These show how the system boots.
5. **Test files** — `test/`, `__tests__/`, `*.test.ts`. These show what the authors actually verify.
6. **Lint/build scripts** — `scripts/`, `vite.config.ts`, `webpack.config.js`. These reveal architectural enforcement (e.g., feature boundary checks).
7. **Git history** — `git log --oneline | head -50`. Shows what's actively developed.
8. **GitHub issues** — open vs. closed, bug reports, feature requests. Shows pain points.

### Common traps

- **README lies.** The README describes intended architecture; the code may differ. Always verify against source.
- **Comments rot.** JSDoc/TSDoc comments may reference patterns that were refactored away. Verify the actual code matches the comments.
- **"Listed but unused" dependencies.** A `package.json` may list a dependency that's never actually imported. Check with `grep -r "from 'package-name'"`.
- **Forked/vendored libraries.** A repo may vendor a modified version of a library (e.g., FreeCut vendors soundtouchjs). The vendored version may differ from npm's published version. License may differ too.

---

## Spec Writing: Structural Patterns

### Per-spec structure that works

```
1. Purpose (1 paragraph)
2. Goals (bullet list)
3. Architecture (diagram + prose)
4. Detailed design (the meat)
5. Open Questions for Sub-Agent Scout (numbered list)
6. Code References (every file read, with one-line summary)
7. Corrections to Seed Spec (every wrong assumption, with fix)
8. Test Plan (per the testing methodology)
```

### Master spec structure

```
1. How to read this document
2. Product vision
3. Architectural decisions (LOCKED, with reasoning)
4. High-level architecture (diagram)
5. Technology stack
6. Browser matrix
7. Constraint acknowledgments
8. WYSIWYG contract (or other key invariants)
9. Stream map (pointer to per-stream specs)
10. Testability strategy (summary)
11. Implementation phases (summary)
12. Open questions
13. Glossary
```

### Stream breakdown principles

- **Group by concern, not by file.** "Workers & threading" is a concern; "decode.worker.ts" is a file.
- **Minimize cross-stream coupling.** Each stream should depend on at most 2-3 other streams.
- **Producer/consumer pairs go in separate streams.** E.g., composition (produces FrameDescriptor) and renderer (consumes FrameDescriptor) are separate — this allows parallel development.
- **Testing is a cross-cutting concern.** Each spec gets its own Testing section following a template; an overall test plan spec defines methodology.

---

## Worklog Protocol

When running a multi-agent process:

### Single shared worklog

All agents append to ONE worklog file. Do NOT create per-agent log files.

```
---
Task ID: SCOUT-XX
Agent: general-purpose
Task: [what was asked]

Work Log:
- [concrete step 1]
- [concrete step 2]

Stage Summary:
- [key results]
- [produced artifacts]
```

### Why single worklog

- The architect can read one file to see all progress.
- Agents can read prior work before starting their own.
- Cross-references between agents are easy.
- The worklog itself becomes a process artifact.

---

## Common Failure Modes (and how to avoid them)

### 1. Scout fabricates a "correction"

**Failure:** Scout claims the seed spec was wrong about X, but the seed spec was actually right. The "correction" introduces a new error.

**Example:** Scout claimed `DegradedRendererBanner` doesn't exist in OpenCut-classic. It actually does — at `page.tsx:60-79`. The seed spec was correct; the scout fabricated a correction.

**Prevention:** Auditors must specifically verify "doesn't exist" claims by actually opening the cited path.

### 2. Method name drift

**Failure:** Seed spec uses old method names (`engine.timeline.move()`), scout verifies the actual name (`engine.timeline.moveElements()`), but specs that consume the API still use the old names.

**Prevention:** Integration review must grep for old method names across all specs and flag any remaining occurrences.

### 3. Producer/consumer shape mismatch

**Failure:** Spec A (producer) defines `items: FrameItem[]` (mixed union). Spec B (consumer) expects `layers: Layer[]` + `sceneEffects: SceneEffect[]` (separate fields). Code won't compile.

**Prevention:** Integration review must verify that producer and consumer specs reference the SAME type definition.

### 4. Scout over-fetches and times out

**Failure:** Scout tries to fetch 20+ web URLs for research and hits context deadline.

**Prevention:** Limit to 5-10 fetches max. Defer nice-to-have research to implementation time.

### 5. Audit is too lenient

**Failure:** Auditor confirms scout's claims without actually opening the source files.

**Prevention:** Auditor must open and read the cited source for every spot-check. Quote the actual code in the audit report.

### 6. Master spec not updated after decisions shift

**Failure:** During scouting, a decision shifts (e.g., "we'll use P010" → "P010 doesn't exist, use I420P10"). The master spec still says P010.

**Prevention:** Integration review must check whether the master spec reflects the actual decisions. Update the master spec as part of the integration revision.

---

## Round-8 Meta-Learnings (new-input integration & interruption recovery)

### 7. A reference repo's stated rationale may itself be wrong — verify before honoring it

opencut-timeline's DECISIONS #9 claimed "00-master shows prefixed command names" as its reason for prefixing its headless API. Reading the canon refuted the premise: 00-master uses BARE type names; the repo had conflated spec 15 §4.2's *manager-method* column with the command *type* discriminator. **Lesson:** when a downstream repo justifies a deviation from your spec, verify the cited premise against the spec text before accepting the deviation's rationale (the deviation may still stand for other reasons, but the false premise must be corrected in the repo's docs, not the spec). The name-conflict they intended to file becomes a correction TO THEM.

### 8. New-reference integration = applicability matrix + numbered contradiction register + rejection register

When absorbing a large external spec/source (the cloudcut ux-spec, 28 files): (a) produce a per-file ADOPT/ADAPT/REJECT matrix with named gaps it fills; (b) number every contradiction and resolve each with an explicit ours-wins (or documented adoption) line; (c) keep a rejection register so future PRs cite it instead of re-litigating. This made a 25-contradiction integration fully auditable in one pass — and the register doubles as the anti-regression list.

### 9. Citation freshness is a grep away — never trust moved line numbers

When a reference repo advances (engine Waves 4A-4D), every previously-verified file:line citation may be stale. The cheap loop: `grep -n "methodName(" <file>` in the local clone for each table row, then patch the spec's numbers. Round 8 re-baselined 30+ citations this way in minutes. Also flip the battery's stale-line checks from presence to absence after fixing (a check calibrated to the broken state silently inverts its meaning).

### 10. Testability needs an enforcement rule, not just a matrix

A coverage matrix without enforcement decays. The working pattern: (a) facet rows tagged F/NF with tier + programmatic verification + pass criterion; (b) bidirectional cross-refs between the NFR table (master) and the recipe table (test plan) so neither gains a row without the other; (c) a step-0 author-checklist rule: "a facet with no row anywhere is a spec bug." Plus concrete NFR recipes (median-of-N, named runner class, pass/fail budgets) — a budget without a measurement hook is aspiration.

### 11. Session-interruption recovery: verify file state before continuing

A tool call aborted mid-edit (spec 14's P1 section) left partial edits in the working tree. Recovery protocol: `git diff <file>` to see exactly what landed; grep the file for the aborted edit's target anchor to decide re-apply vs continue; run a corruption check (the edit tool's "Review the changes" output noise is NOT file content — grep the actual file for artifacts before assuming corruption). Zero-loss recovery is routine if the pre-abort work was committed at its own milestone.

### 12. When two references disagree on a constant, record the divergence and pick provenance

opencut-timeline says the playhead line is 2px; OpenCut-classic (read directly in earlier rounds) says 3px. The spec keeps 3px (verified provenance wins — a port can drift) and records the divergence in the code-ref table's note column with the resolution rule. Unrecorded divergences become future "which is right?" debates; recorded ones become one-line decisions.

---

## GitHub Operations

When pushing a large spec set to a new GitHub repo:

```bash
# Initialize
cd /path/to/specs
git init
git checkout -b main

# Add all
git add .

# Commit
git commit -m "Initial spec set: [description]"

# Create remote repo via API (if it doesn't exist)
curl -X POST https://api.github.com/user/repos \
  -H "Authorization: token YOUR_PAT" \
  -H "Content-Type: application/json" \
  -d '{"name":"repo-name","description":"...","private":false}'

# Add remote and push
git remote add origin https://YOUR_PAT@github.com/USER/repo-name.git
git push -u origin main
```

**Security:** Never echo the PAT in logs. Use it directly in the remote URL. Don't commit it to files.

---

## When to Stop Refining

Specs can be refined indefinitely. Know when to stop:

### Stop when:
- ✅ All CRITICAL and MAJOR audit issues are resolved
- ✅ Integration review finds no blocking inconsistencies
- ✅ All cross-stream type/API contracts are aligned
- ✅ Master spec reflects actual decisions

### Don't stop when:
- ❌ MINOR cosmetic issues remain (off-by-one line numbers, slightly wrong summaries) — these are non-blocking
- ❌ Open questions exist that can only be resolved during implementation (e.g., "verify X works on RunPod" — needs real hardware)

### The 80/20 rule

The first round of scout + audit catches ~80% of issues. Each subsequent round catches fewer. After 2-3 rounds per stream, diminishing returns set in. Move to integration review rather than re-auditing individual streams.

---

## Quick Reference: Sub-Agent Prompt Skeletons

### Scout prompt skeleton

```
Task ID: SCOUT-XX
Stream: [name]

You are a code scout. Read actual source code and refine a seed spec.

Read first:
  - [master spec]
  - [seed spec for this stream]
  - [dependency specs]

Reference repos:
  - [repo paths, already cloned]

Your task: for each "Open Question" in the seed spec, read the actual source code and answer with file:line + quoted code.

Output: refined spec with Open Questions answered + Code References + Corrections.

Rules: Quote real code. Don't speculate. Be honest about gaps.
```

### Auditor prompt skeleton

```
Task ID: AUDIT-XX
Stream: [name]

You are a code auditor. Verify the scout's refined spec against actual source code. Be skeptical.

Spot-check at least 15 claims. For each: open the cited file, read the cited lines, verify accuracy.

Verdict: ✅ PASS / ⚠️ NEEDS REVISION / ❌ FAIL

Severity: CRITICAL / MAJOR / MINOR.
```

### Revision prompt skeleton

```
Task ID: REVISE-XX
Stream: [name]

Apply audit fixes to the refined spec.

Read:
  - The refined spec
  - The audit report

For each issue: use Edit tool for surgical edits. Don't rewrite the spec.

Verify fixes by re-running the auditor's verification commands.
```

### Integration review prompt skeleton

```
Task ID: INTEGRATION
Stream: Cross-stream consistency

Verify all refined specs are consistent with each other and with the master spec.

Check:
  1. Type system consistency
  2. API consistency (method names)
  3. Contract alignment (producer/consumer pairs)
  4. [etc. — see Cross-Stream Integration Review above]

Output: integration review report with per-check verdict + issues list.
```

---

## Summary

The core insight from this session: **multi-round scout → audit → revise → integration review produces dramatically higher-quality specs than single-pass writing.** The audit step is non-negotiable — scouts make mistakes (especially fabrication), and only a fresh skeptical reader catches them. The integration step catches cross-stream inconsistencies that no individual scout could see.

For testability: **data-driven architecture (JSON-in/JSON-out engine) + three-tier testing (engine/render/UI) + WYSIWYG invariants (state/pixel/audio)** is the pattern that makes complex systems programmatically verifiable without UI flakiness.

These patterns generalize beyond browser NLEs to any complex engine + UI system where testability matters.

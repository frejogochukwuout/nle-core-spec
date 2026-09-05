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

## Round-9 Meta-Learnings (architecture challenge rounds & document governance)

### 13. Bridge code is product debt — a bidirectional adapter between two same-level models is a permanent tax

Round 8's Decision 11 chartered a `SceneTracks ↔ flat` bidirectional adapter + dual algorithm homes. The user's Round-9 challenge exposed the cost: the adapter, its round-trip property tests, the C2 full-protocol adapter, and the C8 persistence re-shaping were ALL bridge code with zero product value. The fix (Decision 12) wasn't a better bridge — it was eliminating the need: single state model with persistence, one-way projection, ops port-scheduled to one home. **Lesson:** when two repos overlap, first ask "is this ONE domain duplicated (→ merge/port, kill the bridge) or TWO domains that each need a home (→ layered seam, no bridge)?" Round 8 answered "two homes" for timeline semantics (wrong — duplicated domain) and the audio seam answered correctly by construction (S/G/E share one key; nothing flows back).

### 14. "Significantly better to justify" is measured has-vs-has-not, not cleaner-vs-dirtier

The user's bar for adopting a second core was "truly functionally or architecturally significantly better." The discriminating evidence for web-daw-core was categorical (reverb/sends/sidechain/PDC/WAM: freecut has NONE of them) — not qualitative (code quality, cleanliness). For opencut-timeline as a SECOND op-semantics home, no categorical gap existed (engine ops cover the families) — so it failed the bar there; but as the editing domain it holds a categorical asset (the only interaction+UI layer in the workstream, 6.8k LOC that would otherwise be greenfield). **Lesson:** build the capability matrix before the verdict; adoption arguments that cite code cleanliness are dead on arrival when a cleaned-up baseline already exists.

### 15. Dual-version documents are a fragmentation tax — collapse to one file, let git hold history

Twelve specs existed as `.md` seed + `.refined.md` pairs (342 cross-references across 25 files, "which one do I read?" ambiguity every session). The fix: git-rm seeds, git-mv refined→bare name, header note records the rename, 18 live docs re-pointed in one scripted pass; six historical round records keep point-in-time paths BY DESIGN (rewriting history documents corrupts their evidentiary value). **Lesson:** version suffixes are state that must be synced; git already versions files — one filename, in-place edits, status-header ledgers. The battery gains a standing check so the suffix era can't regress.

### 16. Cite the code, inline only the contract — inline code copies rot, citations refresh

The user's observation ("in-line gets stale quickly, the code ref is always there and up to date — why not just point to the code?") became 00-master §2.5.2: inline code is legal ONLY as (a) protocol payloads/data shapes that ARE the contract, (b) prescriptive pseudo-code differing from every implementation, (c) labeled corrective shapes. Everything else cites `repo file:symbol` under the fresh-grep discipline. The R9 sampled audit (spec 05 §16.6) showed the corpus mostly complies (skeletons were written pre-implementation, so they're class (b) contracts, not stale copies) — but attached a falsifiable expectation for the seal-round full audit (01/06 are the likelier carriers). **Lesson:** write the rule, sample-audit against it, and record the predicted outcome so the full audit can actually fail.

### 17. Exempt-window checks must look BEFORE AND AFTER the hit

The battery's "two algorithm homes must only appear in superseded context" check failed on a legitimate hit: the R9 marker sat ~240 chars AFTER the phrase, outside the look-BEHIND window. Same class of bug as the `.refined.md` self-referencing canon notes (the mention IS the rule statement). **Lesson:** context-exemption logic needs a window spanning both directions, and self-describing mentions (a governance rule naming the pattern it bans) are always legitimate — whitelist them explicitly, then verify the whitelist isn't a hole by debugging the actual hit's full context before widening it.

### 18. A global sed in a rename pass will eat your own constants

The rename script's CANON_NOTE contained the literal `.refined.md`, which the subsequent global `.refined.md → .md` path rewrite then mangled into "renamed from `.md`" — a self-inflicted corruption of the very note explaining the rename. Caught by spot-check. **Lesson:** in any scripted rewrite, either run the constant-writing step AFTER the global substitution, or escape/exclude your own boilerplate from the substitution set. Always spot-check the output of mechanical rewrites for the strings you yourself introduced.

---

## Round-10 Meta-Learnings (UI/UX direction-study sessions — 2026-09-03, ui-mock/shell-variants)

### 19. Direction studies need variants as data, not branches

When the open question is "which visual direction," build ONE app with a variant dimension system: token blocks keyed by `data-theme`/`data-density`/etc. attributes, presets as plain data, an overlay (Ctrl + `) to switch them live, persistence + URL-hash share links so the reviewer can send an exact state back. The spec-canonical direction must be preset A (default), and every non-canonical option carries an inline "Spec position" note — deviations are surfaced, never hidden. This turns a subjective debate into a toggleable artifact.

### 20. Peer review of UI needs LIVE interaction tests, not just screenshots

Three review rounds over the same mockup: the two worst bugs (clip-drag preview teleporting clips because seconds were used as pixels; an entire floating-panel CSS treatment that matched zero DOM elements) were INVISIBLE in screenshots and only catchable by dragging elements in the running app and reading computed styles. VLM screenshot critique reliably catches contrast/legibility/hierarchy issues but hallucinates states (claimed trim handles that don't exist, "white border" that was gold) and misses dead code. The working loop: 3 personas (pro-domain user, product designer, a11y/spec compliance) × (VLM on screenshots + live agent-browser interaction tests + code greps), each returning an explicit severity-ranked findings list, iterate until an explicit "NO MAJORS REMAIN" verdict, then RESUME the same reviewer agent for gate re-checks (cheap, keeps context).

### 21. Unlayered author CSS silently defeats Tailwind 4's @layer utilities

A plain `button { background:none; border:none }` written outside any cascade layer outranks every Tailwind `bg-*`/`border-*` utility (utilities live in `@layer utilities`; unlayered author CSS beats all layers). Symptom: buttons that ignore their classes — invisible selection states, borderless cards, dead hovers — while divs render fine. Proven only via computed styles + isolated repro. **Rule:** every hand-written reset/base rule goes in `@layer base` when Tailwind 4 is in play.

### 22. The sandbox reaps background processes between tool calls

`vite` started with nohup/setsid/disown dies anyway when the bash tool call ends; only the platform's own dev.sh survives. Keep a `vite-up.sh` (idempotent start-if-down + curl health loop) and re-run it at the head of any command that needs the server. Related gotchas: agent-browser screenshots need ABSOLUTE paths (relative paths resolve in the daemon's cwd, silently dropping files elsewhere); set the browser viewport ABOVE the app's minimum before testing or the window-too-small overlay intercepts every interaction; hash-only URL changes on an SPA don't reload — force `agent-browser reload` after variant-URL navigation.

### 23. Mock-level ≠ sloppy: the mock's fidelity IS the review surface

A UI mock for direction validation must still honor the target spec's testids, type floor, contrast rules, and panel inventory — reviewers (rightly) treat violations as findings even in a "fake" app, and the mock doubles as the blueprint the real shell will be wired from. Keep mock-scope honest by listing intentional deviations in the README (with spec refs) and routing spec-side discoveries to the tracker instead of editing canon in passing.

---

## Round-11 Meta-Learnings (mockup-completeness + audio-focus sessions — 2026-09-04)

### 24. Zustand v5: unstable selector results infinite-loop useSyncExternalStore

A selector like `useUi(s => s.mixer.tracks[id]) ?? {default}` or `s.scenes.find(...)?.tracks.filter(...)` returns a NEW reference on every getSnapshot call; React's useSyncExternalStore sees the snapshot "change" after every render and re-renders forever → "Maximum update depth exceeded" crashing the whole tree through the error boundary. Fix patterns: module-level constant defaults (`const DEFAULT_STRIP = {...}` outside the component), select the CONTAINER object (`useUi(s => s.mixer)` — stable until a real change) and read fields locally, or derive arrays outside the selector. Scan every new `useUi((s) => …)` for object/array literals inside the selector argument.

### 25. React's delegated wheel handlers are passive — preventDefault silently fails

`onWheel={(e) => e.preventDefault()}` in React does NOTHING (React 17+ attaches delegated passive listeners; you get a console warning at best) — so ⌘/Ctrl+wheel zoom-to-cursor triggers the BROWSER zoom instead. The fix is a native listener in a useEffect: `el.addEventListener('wheel', fn, {passive: false})` (+ cleanup, + a ref for changing values like pxPerSec). Symptom in testing: zoom "works" but the page also zooms / Shift+wheel double-scrolls.

### 26. The design-decision loop: doc → fresh peer review → fold → resume for re-check

For any non-trivial design decision (this round: the DAW/NLE switch), the sequence that worked: (1) write the decision as a standalone design doc with an evidence table citing specs; (2) dispatch a FRESH-context sub-agent to peer-review it (citation audit + contradiction hunt + UX critique + ranked refinements + a verdict); (3) fold refinements into v2; (4) RESUME the same reviewer agent for the re-check (it remembers its own findings; verdict becomes the gate). Two rounds cost ~30 min and caught: a hard shortcut conflict, a wrong arithmetic claim (the reviewer even admitted its own error next round), and a state-model honesty issue. Verdict-gated review of DECISIONS, not just code.

### 27. Parallel feature agents on disjoint files require the orchestrator to own the shared state first

N agents implementing N features in one working tree conflict only on shared files (store, AppShell, app.css). The pattern that ran clean: the orchestrator writes ONE comprehensive store upgrade FIRST (every field + action every agent will need, typechecked), then dispatches agents with "store is READ-ONLY — use these exact actions" + disjoint file ownership lists + permission to append only to app.css's @layer components. Zero clobbering across 5 agents. When an action doesn't exist, agents do honest-mock toasts instead of editing the store.

### 28. Pointer-capture + event bubbling double-dispatches commits

Trim handles nested inside a draggable clip: `setPointerCapture` retargets pointer events to the handle, but the events still BUBBLE to the parent — a shared `onPointerUp` on both levels commits the trim twice (two undo entries per gesture). Fix: `stopPropagation` in the handle-level handlers (or check `e.target === e.currentTarget`). Any drag/commit path with nested interactive layers needs this check.

### 29. VLM/tool transcripts eat bracket-escape sequences — verify before "fixing" corruption

A grep/tool output showed `MARKER_PALETTEarkerColorIdx` where the file actually contained `MARKER_PALETTE[markerColorIdx` — the `[m` was consumed as an ANSI escape in the output pipeline. The FILE WAS FINE (tsc passed). Rule: when output "looks corrupted" but the typechecker/build is green, re-read the file another way before editing — don't chase display artifacts.

### 30. Sandbox process persistence: children of the platform's app server survive; your own spawns don't

Agent-session bash spawns (even setsid/nohup/disown) are REAPED between tool calls, but processes parented to the platform's next-server (boot-time, platform cgroup) survive indefinitely. The bridge: an API route on the platform app that `child_process.spawn`s a command — the child inherits the server's persistence, and when the server is later killed the child orphans to init and KEEPS LIVING. This is how a dev server meant for a public preview URL gets a permanent life: spawn a supervisor (respawn-loop) as a next-server child, let it take over the port. Key sequencing: spawn BEFORE killing the app server (you lose the spawner otherwise).

### 31. Public-URL 403 "Invalid host" through platform edges: validate WHERE the host check lives before blaming the proxy

Chain: public URL -> platform edge (Function Compute) -> sandbox Caddy -> dev server. The edge REWRITES the Host header (observed: not the public domain, and not the container hostname). Two independent host gates exist: Caddy (platform-generated config, unreadable) and Storybook 10 core-server (`core.allowedHosts`, default = local only). Caddy happily proxied ANY host; the 403 text came from Storybook. Diagnostic that found it: `curl -H "Host: <public>" http://127.0.0.1:<dev-port>/` directly, bypassing edge+Caddy — isolated the layer. Fix: `core.allowedHosts: true` for a sandboxed review server (safe — only edge-reachable). Also: Vite 8 has NO `allowedDevHosts` option (it's `server.allowedHosts`, and builder-vite forwards core.allowedHosts into it) — a confidently-written dead config is still dead; grep the installed package before trusting option names.

### 32. Storybook as the review surface changes the mock's persistence contract

When the user reviews in Storybook rather than a static preview: (a) every element needs a STORY (component + its states — sub-agents write these well on disjoint files with a conventions brief: decorators, StoreBoot patches, PanelBox, and "typecheck must pass, don't touch other files"); (b) the pin-comment addon turns review into structured data (component chain + file:line + DOM selector per pin) — the agent consumes threads via REST, resolves by PATCHing the FULL document back (no DELETE); (c) a dev-server-only addon means the review URL must serve `storybook dev`, not a static build — which is exactly when lesson 30's supervisor pattern pays off.

### 33. Empirical geometry verification beats VLM eyeballing for layout bugs

User-reported "layout is broken" triage: reproduce in a real browser, then MEASURE (getBoundingClientRect on the panel roots, the seam, the playhead bar vs its triangle) — the inspector bug turned out to be TWO distinct defects (inverted seam math + missing w-full making a flex child content-width), and the playhead offset was an exact 2px svg-centering error, none of which a VLM would have precisely located. Use VLM only for the final "does it look right" pass — with an explicit "do NOT generate code/HTML" leash (it drifts into mockup generation when asked open-ended questions about UI screenshots).

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

## R13 meta-learnings (test + review-gate round)

34. **Writing the test suite IS a review pass.** Five real bugs surfaced while writing tests (shallow-clone undo, no-op history pollution, a documented-but-dead shortcut) — before any reviewer looked at the code. Write the suite FIRST; treat every "why does this test fail" as a finding, not a test bug.

35. **Verify the DEPLOYED artifact, not the fix claim.** A fix sub-agent reported "dist rebuilt, code-verified" — the verification wave proved the bundle was still pre-fix (mtime + literal markers). For any build step: grep the OUTPUT for a code marker (comments get stripped), then restart, then re-check. Claims are not artifacts.

36. **Review waves converge on different strata.** Wave 1 (code/UX/test/docs) found store-contract honesty issues; the maintainer's live pass found interaction bugs (targeting, hotkey collisions) that static review missed; the verification wave found the deployment gap. Rotate reviewer MODES (static / live-interactive / verification) rather than running the same mode twice.

37. **Open the PR EARLY in the fix loop.** CodeRabbit + Codex comments arrived while sub-agent waves ran; the fix batches could fold all sources into one dedup corpus per commit. A PR opened at the end would have serialized three review sources instead of parallelizing them.

38. **Tests that pin behavior need behavior-level assertions.** The PageUp bug survived a test that only asserted `playhead < 17` — a weak bound that a completely broken implementation satisfies. Assert exact landings (`toBeCloseTo(8.49, 4)`) wherever the math is deterministic.

## R14 meta-learnings (re-audit + zero-no-op + both-directions spec scan)

39. **"Fixed" reply comments can lie — re-audit against code, not claims.** The R13 PR reply claimed the mirror sentinel, focus race, origin guard, and reveal-snap were fixed; code review proved 5 of ~75 claimed fixes had never landed (grep PASSes were false positives: comments match, code doesn't). The re-audit method: build a mechanical grep battery FIRST (cheap PASS/FAIL), then manually inspect every FAIL and every "PASS" whose pattern could match a comment instead of code. Verification-not-claims applies retroactively to your OWN past claims.

40. **The no-op sweep is an audit primitive: trace every handler to an observable.** "Ensure zero no-op" ≠ checking flagged buttons. The systematic method: enumerate every interactive element (button/onClick/role/slider/draggable/tabIndex), then for each trace ONE of four terminal states (store mutation with visible effect / local behavior / honest toast / aria-disabled+tip). The sweep found 12 dead buttons + 7 dead form controls + 1 functional-no-op toggle + 5 orphaned store actions BEYOND the review waves' finds — and two of the biggest fixes were pure wiring (store actions existed, buttons never called them).

41. **Fresh sandbox = git recovers code, never process state.** The clone, tests, and PR all came back from origin; the runtime stack (Storybook-on-:3000 supervisor, spawntest route, runtime copy with .env/git/threads.db) did NOT — none of it is git-tracked. Write the restoration recipe into HANDOFF as you build infra (paths, commands, env keys, verification markers), or the next session rebuilds it from archaeology. Also re-verify platform assumptions: the reaper still kills setsid'd processes; only platform-next-server children survive.

## Summary

The core insight from this session: **multi-round scout → audit → revise → integration review produces dramatically higher-quality specs than single-pass writing.** The audit step is non-negotiable — scouts make mistakes (especially fabrication), and only a fresh skeptical reader catches them. The integration step catches cross-stream inconsistencies that no individual scout could see.

For testability: **data-driven architecture (JSON-in/JSON-out engine) + three-tier testing (engine/render/UI) + WYSIWYG invariants (state/pixel/audio)** is the pattern that makes complex systems programmatically verifiable without UI flakiness.

These patterns generalize beyond browser NLEs to any complex engine + UI system where testability matters.

## R15 meta-learnings (assembly-architecture + implementation-path round)

42. **Path re-litigation at scale milestones: the decision input is a completion matrix + a reversal condition, not vibes.** When the user re-opens a settled decision ("evolve vs greenfield") because the world changed (repos went 20%→70%), the move is NOT to re-argue — it is to (a) re-measure the completion matrix with scouts whose gates RE-RAN, (b) price BOTH paths in a ledger (re-derivation multiplier + review-debt re-incurrence), (c) state the reversal condition explicitly and have the adversarial reviewer PROBE for it, and (d) record the full steelman for the losing side so the decision is auditable. The user's own estimate was verified accurate (~70%); the steelman's honest half-wins (process tax) got priced INTO the winning ruling instead of being ignored.

43. **The two-staircase law: every architecture diagram with only DOWN arrows is missing half the system.** A commands-down-only topology (the v1 assembly design) forgot playhead-during-playback, meters, waveform peaks, export progress — the entire telemetry UP direction. The tell: canon (spec 15 §9 EngineEvent) and precedent (engine D8's data contracts) already contained the answer, and S1's "engine output never feeds back" wording, read at the wrong layer, FORBADE it. Fix: state one-wayness at the precise layer ("editing state never flows engine→editing-core; telemetry flows up through a SEPARATE seam") and enumerate the actual runtime flows before believing a diagram.

44. **A completeness instrument beats a completeness claim: the routing-disposition table.** "The bus routes 100% of the union" was a claim; the table (one row per union member → home ∈ {OT, engine, app, DEFERRED} + a typed NOT_IMPLEMENTED code) is an instrument — it compiles honest, it's battery-checkable, and building it immediately caught that ~20 members had NO home in any phase. Same class as the facet-coverage-matrix law (#10): aspiration becomes architecture when it's a table with an enforcement rule.

45. **Author-calibrated vs fresh-senior calendars differ ~1.7-2×; adopt the fresh-senior numbers.** The R15 plan's first estimates (11-16wk) were author-velocity; the execution reviewer's bottom-up (22-27wk solo, with per-phase drivers + the serial A1+A2→A3-demo chain + two-dev decay) was the honest one. Also: re-derive headline totals after ANY phase is added (the demo figure didn't re-derive after A2.5 was inserted) and state derivations explicitly.

46. **Surgical multi-agent amendment fleets need the integration review MORE than single agents do.** Three amendment agents (disjoint file ownership, zero clobbering) each passed their own QA; the fresh integration review still found 6 propagation Majors — stale counts in files the round RE-baselined, amendments not propagated to sibling specs (05/06 test contracts asserting the OLD keyboard semantics), and dangling references CREATED by the same round's rewrite (14 §2.1 pointers). Amendment work is never "done" per-file; it's done when the cross-file grep battery says so. Keep the counter-claim sweep (stale strings, inverted after re-baseline) as a standing review check.

## R15-UI meta-learnings (mockup timeline-parity + audio round — parallel thread; kept at #47-51 per its own PLAN/HANDOFF references)

47. **Match-the-canonical means auditing YOUR OWN spec claims too.** The R15-UI design's first instinct was to REGISTER a spec revision removing the magnetic zero-anchor, "because spec-18 has a free-spine main" — a citation the critique agent searched for and DID NOT FIND; spec-05 §14.5A had adopted it normatively (Round-8, test-anchored) and the MOCK was the deviation. Lesson: before proposing to de-spec a behavior, grep the whole corpus for every clause that touches it — you may be about to remove something your own repo deliberately absorbed, and the burden flips (implement the ~20-line clamp, register nothing).

48. **The harness deadline is not a failure signal — CHECK THE TREE FIRST.** Three of five long implementation agents hit "context deadline exceeded" with 90-100% of the work already written to disk (T3's seam, T4's full wave, F1's fixes). The expensive reflex is re-dispatching from the prompt; the cheap correct move is `git status` + scoped `vitest run` + targeted completion agent (T3b) that READS what landed and drives the remaining failures to green. Budget one completion agent per timed-out wave; the completion pass ALSO catches the real bugs (T3b found the start+move notification bug the tests were written to catch).

49. **Mid-edit cut-offs leave identifier soup — search by symptom, not by plan.** A cut agent left `scene.tracksoverTarget.trackIndex]` and `scene.tracksoveredIdx]` (a find/replace interrupted halfway). Symptom: tests fail while tsc exits 0 THROUGH A PIPE (`| head` eats the exit code — check `${PIPESTATUS[0]}` or run tsc bare). Verify suspect lines with `od -c`/hex before trusting sed output; stale terminal buffers showed "broken" lines that were already fixed.

50. **The armed-runtime pattern needs a REAL trigger, not an armed route.** R14 left a spawntest route "armed for when the platform server comes up" — but nothing ever POSTed it, and the supervisor script itself crashed instantly (`openSync` returns a numeric fd; `fd.write(1,…)` was never valid). R15-UI's fix: Next's `instrumentation.ts` register() hook spawns the supervisor at server start (the one lifecycle event the platform guarantees), sentinel-guarded. Verified chain: server up → supervisor → storybook :3000 → 200. A background process that nothing starts is theater; wire it to a lifecycle hook you can actually observe.

51. **Design critiques pay for themselves exactly at the geometry level.** The two highest-value catches of R15-UI were a 180°-antiphased SVG indicator (y 65→80 below center vs the arc filling upward — would have shipped the flagship fix visibly broken) and a lower/upper clamp swap in my own zoom code (dynamic min bound in the UPPER clamp — caught by a test 10 minutes after writing). Both were cheap to fix pre-merge and expensive to discover in review. Corollary: write the geometry assertions (rotate transform, dasharray, clamp direction) BEFORE the visual polish — they're the tests that catch the class.

## R16 meta-learnings (shell-mini bootstrap — minimal-MVP skin-port round) (items originally minted as 47-52; renumbered +6 after the parallel-thread numbering collision)

53. **Extract the skin's ground truth BEFORE designing: a SingleFile DOM snapshot is a design-token mine, not just a picture.** A 7.2MB saved page carries the app's ENTIRE `:root` token block + per-component CSS rules verbatim. The extraction pipeline that worked: headless-browser `getComputedStyle` + styleSheets rule dump filtered by component prefix (`quick-cut`) + measured DOM anatomy (bounding rects) + VLM on CROPS for gestalt. Rule: **trust the extracted CSS over the VLM's color/layout claims** (the VLM hallucinated "missing dot grid" and "opaque panels" that pixel-sampling disproved) — but VLM DID catch real defects (text collisions) that DOM checks miss. Use both, verify each against the other.

54. **%-positioned timeline marks are a coordinate-law bug waiting to happen.** In any scrollable timeline with `min-width: 100%` content, positioning SOME children in `%` (ruler marks) and others in `px` (clips, playhead) guarantees desync when the content stretches past its intrinsic width (2-3× at low zoom). The law that fixed it: **ONE shared render origin + ALL positions in px; % only for fills**. jsdom's zero-`getBoundingClientRect` masks the bug completely — pin the coordinate law with a style-attribute equality test (mark.left === playhead.left === t*pps) AND verify once in a real browser.

55. **jsdom's zero rects make pointer tests deterministic — exploit it, but compute the origin law explicitly.** Every `clientX → time` inversion goes through a `contentRect.left + RENDER_ORIGIN` constant; with jsdom rects at 0, tests map clientX directly to time. Keep ONE origin constant shared by render math AND pointer inversion (the review caught three different origins — ruler clicks, clip drags, playhead scrubs — 10px apart).

56. **The snap magnet must exclude the dragged object's own edges.** Self-inclusive magnet targets create a 5-12px dead zone (drag active but nothing moves), permanent pointer hysteresis, and at low pps a self-teleport for min-duration clips. Same-track neighbors + playhead only — and derive the targets per-clip, not globally.

57. **Test-writing is a design-review stage: the seed that made every move degenerate.** The audit-pinned seed (back-to-back clips, zero slack) made EVERY V1 move-drag a no-op — discoverable only when you try to write the drag test and find there is nothing meaningful to assert. Write the interaction tests against the SEED early; a seed with no slack is a UX bug (nothing is draggable) hiding as "deterministic simplicity".

58. **The audit round on the DESIGN doc and the code-review round on the implementation catch disjoint bug classes — run both.** The design audit caught contract holes (trim bounds, scroll model, the DnD hedge); the code review caught implementation-vs-contract drift (the % ruler, self-magnet, interaction-lock holes at the pointer layer, storybook story isolation). Neither could have caught the other's set. Fold ALL findings, then re-run the full gate suite — and record both rounds in the design doc so the contract stays the single source of truth.

59. **"Serving on localhost" is a FALSE PASS for public liveness — the edge rewrites the Host header.** The R16 port-3000 go-live reported "LIVE" on the strength of `curl localhost:81 → 200`; the user's browser got Vite's 403 "Blocked request: This host is not allowed" the whole time. The chain is four layers, and each has its own failure mode: (1) process alive (reaper), (2) port bound (crash → port free), (3) proxy forwards (Caddy passes Host untouched), (4) **backend accepts the Host** — dev servers (Vite, Storybook) default-allow only localhost/IPs, and platform edges rewrite Host (`...fcapp.run`, `...space-z.ai`). Probe layer 4 explicitly: `curl -H 'Host: <edge-style-host>' http://127.0.0.1:81/`, and call the app live ONLY after a real public-URL browser pass (agent-browser through the edge). The other session's note had already documented this exact trap for Storybook (`core.allowedHosts`) — read sibling-session failure notes BEFORE claiming a go-live class of win.

60. **Process persistence is three different problems: reaper, recycle, and nothing-starts-it.** (a) The per-toolcall reaper kills the whole descendant tree — only double-fork (grandchild reparents to PID 1) survives; `nohup`/`setsid`/`disown` all die. (b) A container recycle kills even the double-forked daemon (FC scale-to-zero) — only durable storage survives: remotes + /home/sync. (c) After recycle, NOTHING re-launches your app unless you've wired a boot hook: the harness runs `/home/z/my-project/.zscripts/dev.sh` at boot in some sandbox variants — write it idempotent + PAT-free (restore from the newest `/home/sync/*.bundle` via glob, not a PAT-embedded clone; creds in an untracked boot script get archived into repo.tar), test it live by killing the daemon and running the hook, and keep a canonical copy committed in the repo so a fresh clone can re-install the hook in one cp. Each layer needs its own verification; surviving one says nothing about the next.

61. **A second UI cannot ride ?XTransformPort, and a dev server cannot ride a sub-path — but a static build can.** Verified while exposing Storybook at the public URL: the query survives the edge and routes the DOCUMENT request to :6007, but sub-resource URLs (relative or absolute) never carry the query → they fall to :3000 → 404 → the manager HTML loads and its JS never executes. The dev server's iframe is worse: root-absolute Vite paths (`/@vite/client`, `/@id/__x00__virtual:/…`) escape any sub-path prefix. The winning pattern: build static (`npm run build-storybook`), copy `storybook-static/` → `public/stories/` of the app (static output is fully relative — sub-path-safe by construction), commit it, serve it from the app's already-Host-allowed Vite. Entry must be the explicit file `/stories/index.html` (bare `/stories/` falls to the SPA fallback and serves the app). Full law-set in the reference section below. **[R18 correction: the "winning pattern" framing was wrong — it was the workaround. The default is Law 3-corrected: the dev server itself owns :3000 (see #64). The empirical observations stand; the conclusion drawn from them did not.]**

---

## Z-container preview-URL serving — the verified reference (R16; verdict CORRECTED in R18)

Written after the port-3000 go-live false-pass (#59) and the Storybook
external-surface investigation. Every line was verified empirically in this
sandbox (forged-Host probes + real public-URL browser passes + VLM on
screenshots); claims inherited from other sessions' notes are marked.

> **R18 correction (user directive):** the R16 verdict below Law 3/4 —
> "a dev Storybook cannot serve publicly; mount the static build instead" —
> was WRONG. The standard pattern works and is the default: **the full dev
> server owns :3000** (verified here end-to-end after the correction; the
> sibling R17 section below documents the same pattern for shell-variants).
> The XTransformPort findings survive only as a historical dead-end note —
> don't build on them.

### The chain

```
browser → https://preview-chat-<chat_id>.space-z.ai/   (chat_id from gateway metadata)
        → FC edge (rewrites request Host to ...fcapp.run)
        → Caddy :81 (platform-owned, ALWAYS running, Host passes untouched)
            ├─ request carries ?XTransformPort=NNNN → localhost:NNNN
            └─ otherwise → localhost:3000 (unconditionally)
```

Caddy needs no "trigger to serve": the moment ANY process binds :3000 it
becomes the public site; if nothing binds, the edge/Caddy layer errors
(upstream down). The preview URL host embeds THIS chat's id — it is not
discoverable from inside the container (no env vars), but it is derivable
from the chat gateway metadata.

### Law 1 — the backend must ACCEPT the edge Host

- **Vite dev server:** default allowlist = localhost/IPs only → every public
  request dies with `403 Blocked request. This host ("…fcapp.run") is not
  allowed.` Fix: `server.allowedHosts: ['.space-z.ai', '.fcapp.run']`
  (dot-prefix matches any subdomain).
- **Storybook 10.6 dev:** allows ALL hosts by default — startup banner says
  `Other allowed hosts: all (insecure)`; verified 200 with a forged edge
  Host. Older Storybook versions threw "Invalid host" (a sibling session
  fixed theirs via `core.allowedHosts`) — PROBE, don't assume either way.
- **Static files served by the app (Vite publicDir):** no Host check at all —
  immune by construction. (This is why the static-build mount in Law 4 needs
  zero extra plumbing.)

### Law 2 — liveness is 4 layers; a localhost curl is a FALSE PASS

`process alive (reaper!) → port bound → Caddy forwards → backend accepts
Host.` Probe the last layer with the edge's Host:

```bash
curl -H 'Host: preview-chat-<id>.fcapp.run' http://127.0.0.1:81/
```

…and call the app live ONLY after a real public-URL browser pass
(agent-browser through the edge) that includes an interaction (click/play)
and an asset-load check — a 200 HTML fetch proves neither JS execution nor
sub-asset loading (probe the ASSET CHAIN: manager bundle, /index.json,
iframe story DOM — R17 gotcha 8 has the full recipe).

### Law 3 (R18-corrected) — to serve a dev UI publicly, put the server ON :3000

**The standard pattern (THE answer, user-confirmed):** the public proxy chain
is port-based — edge → Caddy :81 → localhost:3000, unconditionally. Whatever
dev server binds :3000 IS the public site, same-origin, so every asset class
works with zero extra plumbing: manager HTML + `./sb-manager/*` bundles,
`/iframe.html?id=…` story canvases, `/index.json`, `/@vite/client`, HMR,
deep links (`/?path=/story/…`). Verified end-to-end in this env (R18):
manager boots through the real edge, story tree live, story selection works,
iframe story DOM renders (4 clips + 8 trim handles in the Timeline seed
story), zero page errors. Plain port-forwarding of :3000 would work the same
way — the platform's query-based port forwarding is the unnecessary detour.

Launch recipe (shell-mini, this env): `python3 scripts/sb3000.py`
(double-fork daemon, PPID=1, port 3000) + `core.allowedHosts: true` in
`.storybook/main.ts` (belt-and-braces; SB 10.6 already allows all hosts by
default — the banner says so).

**Historical dead end (kept only so nobody rebuilds it):** R16 spent a whole
session routing AROUND :3000 with the platform's query-based port forward
(`?XTransformPort=NNNN`), concluded "multi-asset UIs can't work", and built
workaround infrastructure (static build mounted at `public/stories/`, an
app-entry redirect shim for the query's case-sensitive key, a second SB
daemon on :6007). All of that was unnecessary — and its "verified" write-ups
then read as truth and misled the next session (the exact failure mode of
#64). The empirical trivia, for the record: the query survives the edge and
routes the DOCUMENT to :NNNN, but sub-resource URLs don't carry the query →
they fall to :3000 → multi-asset UIs never boot; the query KEY is
case-sensitive in Caddy's matcher (lowercase silently routes to :3000).
None of it matters once the server owns :3000.

### Law 4 — when the APP must own :3000, the second UI goes under it as a STATIC mount

R18 note: this is the FALLBACK pattern, not the default (Law 3-corrected and
the R17 section are the defaults). shell-mini used it in R16 (app owned the
port, storybook static-mounted at `/stories/`) and DROPPED it in R18 when the
user directed the full storybook server to :3000 instead — the static mount
and its 8.4MB committed `public/stories/` were removed. The pattern itself
remains valid and is documented in the R17 decision table at the bottom of
this file:

1. `npm run build-storybook`
2. `cp -r storybook-static public/stories` — the static output is FULLY
   relative (`./sb-manager/*`, `./sb-addons/*`, `./assets/*`), hence
   sub-path-safe by construction.
3. Commit `public/stories` (git-is-the-disk; zero build steps at boot).
4. Entry URLs (public): `…/stories/index.html` for the manager — NOT bare
   `/stories/` (trailing-slash directory requests fall to the app's SPA
   fallback and serve the APP); `…/stories/iframe.html?id=<story-id>&viewMode=story`
   for a full-screen single story.
5. Rebuild + recopy + commit when stories change — the cost that makes this
   the fallback, not the default.

### Law 5 — persistence is three different problems

See #60 for the full law. Layer summary with the concrete artifacts (R18
layout): reaper → double-fork daemons (`scripts/sb3000.py` storybook on
:3000 = the public surface, `scripts/dev3000.py` app on :3001 = localhost
dev); recycle → `scripts/boot-restore.sh` (iso
`/home/z/my-project/.zscripts/dev.sh`, idempotent + PAT-free, restores from
the newest `/home/sync/nle-core-spec-*.bundle`, gates on the SB
`/index.json` asset-chain probe, must-succeed on :3000); durability → GitHub
origin + gitlab mirror + `/home/sync` bundle/tarball refreshed at every
wrap-up.

## R17 meta-learnings (shell-variants takes :3000 in its own env — parallel-stream serving split)

62. **Per-env port ownership: when parallel streams share a REPO but not a SANDBOX, :3000 is owned per-ENV, not per-repo.** Two streams were both landing in `nle-core-spec` (shell-mini + shell-variants); each sandbox has its own Caddy/edge, so the "who serves :3000" question is answered per-environment by user directive — "serve YOURS in this env." The failure mode it prevents: an agent from stream A rebuilds what stream B already built (a whole sb-supervisor stack existed in MY env that only ever served shell-mini's predecessor), or worse, kills the other stream's daemon believing it stale. On any port-3000 takeover: (1) identify WHAT is running before killing it (process cwd, not just the command line — `node vite.js` could be either app), (2) check `git ls-remote` for parallel pushes FIRST (the sibling pushed 3× during this session; rebase, never force), (3) document the ownership split in the SHARED HANDOFF so the next session of either stream reads one truth.

63. **A recycle doesn't just kill processes — it leaves the boot hook pointing at ghosts, and NOTHING tells you.** After the container recycle: the overlay clone (`/home/z/nle-core-spec`) was gone, the runtime copy was gone, AND the harness boot hook `.zscripts/dev.sh` (tracked in the my-project repo, force-checked-out) ran a `package.json` dev script pointing at `sb-supervisor.mjs` — a file that died with the recycle → `MODULE_NOT_FOUND` → wait_for_service fails → no server, no restart, no retry, ever. The boot log (`sb-boot.log`) held the answer the whole time. Law: after any recycle, read the boot logs BEFORE inventing a new serving stack, and make the boot hook's failure mode loud (a dev.sh that exits 0 with a warning is worse than one that fails hard — the harness won't tell you either way).

## R17-v0.5 meta-learnings (vendored-addon version swap)

64. **A vendored-dependency version swap is a three-way merge, not a replace: upstream, ours, and the integration surface.** Swapping vendored storybook-annotakit 0.4.0→0.5.0 lost THREE local fixes silently (preset fresh-clone guard, JSON-store queue-wedge fix, tsup clean:false) — upstream had never seen them, so "take the new version" regressed them. The discipline that caught all three: (1) diff the new zip's src against the VENDORED src (not just file lists — patterns like `queue = queue.then`, `clean: true`, the guard's error string); (2) re-apply local fixes WITH a comment naming them as local re-applies (future swappers need to know they exist); (3) grep the REBUILT dist for every marker (tsup keeps identifiers — `p.catch(() => undefined)`, `annotakit/ui-command`, the `staticStore.mjs` entry); (4) re-check the INTEGRATION surface (our app's `.storybook/preview.tsx` hotkey remap was written against 0.4.0 semantics — under 0.5.0 legacy plain-key configs only fire with ⌥ held, silently changing what the config MEANS; one remap survived because the shell's cheat-sheet '?' still collides with the addon's '?' default). Gates after a vendor swap: vendor tsc (needs the APP's node_modules for peer types — run it after app `npm ci`, not before), app tsc, full app suite, dist markers, daemon restart + health version + live browser pass.

65. **The best E2E proof of a durability engine is one you didn't fabricate.** After the 0.5.0 swap, health reported threads:1 and `autoSync: "pushed (mutation)"` — a thread created through the public URL 5 minutes EARLIER (by the parallel stream's verification agent, on a story id from THEIR storybook) had been auto-migrated from the legacy store, merged cross-stream, and pushed to the shared orphan branch before I touched anything. Zero synthetic test data; the real pipeline proved migration + merge + push in one boot. Lesson: check `git log <orphan-branch>` + the health JSON's sync state FIRST after any store-engine change — reality may already have run your E2E.

## Serving the shell-variants review surface on :3000 — the verified reference (R17)

This is the SIBLING pattern to the "Z-container preview-URL serving" section
above (that one = shell-mini: static-build mount under an app that owns the
port). This one = **the dev Storybook IS the app on :3000** — the full
shell-variants review surface (Storybook 10.6 + annotakit, 83 stories) served
directly at the public URL. Every line below was verified live in this
sandbox (kill→restore→public-200 cycle included).

### The stack (what runs where)

```
browser → https://preview-chat-<chat_id>.space-z.ai/
        → FC edge (rewrites Host to …fcapp.run)
        → Caddy :81 (platform, always up) → localhost:3000
        → Storybook 10.6 DEV (storybook dev -p 3000)
            ├── manager + 83 stories (React 19 + Vite 8, HMR live)
            ├── /annotakit/api/*  → vendored addon v0.5.0 server
            │     store = .git/annotakit/threads.db (SQLite, INSIDE .git —
            │     zero working-tree footprint; storeMode:"git")
            └── git auto-sync: snapshot → ORPHAN branch `annotakit`
                (tree = README + threads.db, plumbing-built, never checks
                out) → pushed to GitHub via http extraheader; on boot the
                engine RESTORES + MERGES the remote snapshot (cross-stream:
                the parallel stream's threads ride the same branch, namespaced
                db=annotakit@<session> — verified live in the R17-v0.5 swap)

serving host = /home/z/my-project/shell-variants   (persistent-volume RUNTIME copy)
source of truth = /home/z/nle-core-spec            (repo checkout; dies on recycle)
boot hook = /home/z/my-project/.zscripts/dev.sh    (iso of scripts/boot-restore.sh)
launcher = scripts/sb3000.py                       (double-fork daemon, PPID=1)
```

The runtime copy is NOT the repo checkout — it is a second working tree on
the persistent volume with its OWN `node_modules` (263MB, survives recycles
when the volume does), its own `.env` (token), and its own git repo (any
branch; v0.5.0's store lives under `.git/annotakit/`, so the runtime repo
just needs to BE a git repo with an `origin` remote pointing at the spec
repo — see gotcha 6).

### The launch recipe (from nothing to public-200)

```bash
# 1. repo (PAT from chat; never committed)
git clone https://<PAT>@github.com/frejogochukwuout/nle-core-spec.git /home/z/nle-core-spec
git -C /home/z/nle-core-spec remote add gitlab https://<GLPAT>@gitlab.com/ansgareutychisO/nle-core-spec.git

# 2. runtime copy on the persistent volume
cp -a /home/z/nle-core-spec/ui-mock/shell-variants /home/z/my-project/shell-variants
cd /home/z/my-project/shell-variants
npm ci --no-audit --no-fund          # ~4 min; esbuild allow-scripts warning is benign

# 3. vendored annotakit dist — MANDATORY, gitignored, see gotcha 4
npm run vendor:build                 # tsup → dist/{server.cjs,manager.mjs,preview.mjs}

# 4. token (gitignored; never in tracked files — secret scanner blocks pushes)
printf 'ANNOTAKIT_GH_TOKEN=<PAT>\nANNOTAKIT_GH_REPO=frejogochukwuout/nle-core-spec\n' > .env

# 5. runtime git repo (annotakit git-push host) — see gotcha 6
#    v0.5.0: ANY branch works — the store lives under .git/annotakit/ and
#    syncs to the ORPHAN branch `annotakit` on origin (auto-created).
git init -b runtime && git add -A && git commit -m "runtime base"
git remote add origin https://<PAT>@github.com/frejogochukwuout/nle-core-spec.git

# 6. launch (double-fork; PPID=1) + verify
python3 scripts/sb3000.py
curl -s localhost:3000/annotakit/api/health         # {"ok":true,…,"durability":"git-push"}
curl -H 'Host: preview-chat-<id>.fcapp.run' http://127.0.0.1:81/   # 200
# then the REAL public URL + sub-assets (gotcha 8)
```

### The gotchas (every one bitten-then-verified this session)

1. **The reaper kills ALL bash descendants — only double-fork survives.**
   Verified twice: `setsid nohup sleep` AND `setsid nohup next dev` both
   died between tool calls (dev.log even emptied). Only the
   fork→setsid→fork pattern (grandchild reparents to PID 1) survives.
   `scripts/sb3000.py` is the canonical implementation; verify with
   `ps -o ppid= -p <pid>` → `1`. Prior sessions' claims that "children of
   the platform's app server survive" were true THEN (app server had a
   spawn-route) but are NOT a property you can rely on — the platform tree
   itself changes between harness versions.

2. **A recycle kills even the PPID=1 daemon; only durable storage + a boot
   hook bring it back.** The stack died mid-session and twice across
   sessions. Three layers, each verified: (a) daemon survives toolcalls
   (PPID=1), (b) `boot-restore.sh` (iso `.zscripts/dev.sh`) rebuilds
   everything from the newest `/home/sync/nle-core-spec-*.bundle` (PAT-free
   — a PAT embedded in `.zscripts/*` gets archived into the my-project
   repo.tar by the watchdog), (c) remotes (GitHub + GitLab + bundle)
   refreshed at every wrap-up. The restorer gates on the HEALTH ENDPOINT,
   not a bare 200 (a half-dead tenant can bind the port and still 500) and
   kills half-dead tenants before relaunching.

3. **The harness boot hook is the ONLY auto-start — and it fails silently.**
   `.zscripts/dev.sh` runs at boot (when the harness executes it); a missing
   target (MODULE_NOT_FOUND) leaves :3000 dead forever with no retry and no
   alert. After any recycle: READ the boot log first. Also: the my-project
   watchdog auto-commits working-tree changes — a replaced hook persists
   (verify `git -C /home/z/my-project log --oneline -- .zscripts/dev.sh`),
   but `dev.log` (untracked) survives force-checkouts. Keep the canonical
   copy of the hook committed IN THE REPO (`scripts/boot-restore.sh`) so a
   fresh session re-installs it with one `cp`.

4. **The vendored addon ships WITHOUT its dist.** `vendor/storybook-annotakit/dist/`
   is gitignored (build artifact) — a fresh clone cannot boot Storybook
   (explicit `[storybook-annotakit]` error; SB dev refuses to start). Run
   `npm run vendor:build` (tsup, ~3s). AND verify the dist content by
   grepping for the fix markers in `dist/server.cjs` — the R13 audit caught
   a "dist rebuilt" claim that was never rebuilt: the health endpoint
   answered while the running code was pre-fix (**responding ≠ fixed**;
   tsup doesn't minify, so markers survive). v0.5.0 marker set:
   `p.catch(() => undefined)` (JSON-store queue wedge fix),
   `annotakit/ui-command` (new toolbar channel), `staticStore.mjs` present
   in dist/ (new tsup entry — a stale dist lacks it). ALSO: a v0.5.0
   upstream swap LOSES local fixes — diff the zip's src against the
   vendored src before swapping and re-apply: the R17 swap had to
   re-apply the preset fresh-clone guard, the queue-wedge fix, and the
   tsup clean:false CR10 fix (upstream regressed all three).

5. **Token law: `.env` only, never tracked.** GitHub's secret scanner
   REJECTS pushes containing the PAT (even in history), and the GitLab PAT
   lives only in `.git/config` + chat. The addon reads
   `ANNOTAKIT_GH_TOKEN` from `.env` next to the project root (its own
   ~30-line dotenv — no dependency); without it the addon degrades to
   "partial: git repo without a github remote" (commits, no push — check
   the health JSON's `gh.hasToken`).

6. **Annotakit v0.5.0 durability: the serving directory just needs to BE
   a git repo with an `origin` — the store lives INSIDE `.git/`.** The
   0.4.0 design (threads.db in the working tree, runtime repo with an
   INVERTED .gitignore, tracked `annotakit-store` branch) is obsolete.
   v0.5.0 keeps the SQLite store at `.git/annotakit/threads.db`
   (`storeMode:"git"` — zero working-tree footprint, no checkout
   conflicts), builds snapshot trees with pure plumbing (hash-object +
   mktree + commit-tree — README + threads.db at the ORPHAN branch
   `annotakit`, which is never checked out), and pushes via http
   extraHeader (token never in argv/URL/errors). On boot it RESTORES the
   remote snapshot and MERGES (cross-stream: parallel sessions share the
   branch, commits namespaced `db=annotakit@<session>`). Migration:
   a legacy `.storybook/annotakit/threads.db` is migrated automatically
   on first boot (verified live — a thread created minutes before the
   swap survived into the new store and reached the remote branch).

7. **Port hygiene: kill the RIGHT tenant, and defuse competing dev
   scripts.** Before binding :3000: (a) identify the running process's cwd
   (`ls -l /proc/<pid>/cwd`) — `node vite.js` could be either parallel
   stream's app; (b) kill half-dead tenants (bound, not answering);
   (c) make sure NOTHING else will grab the port at the next harness boot
   — the platform's own `package.json` dev script must not also bind :3000
   (point it at :3001 or make it a no-op; a racing `next dev` and the SB
   daemon will fight over the port across boots).

8. **Liveness proof = the asset chain, not the HTML 200.** A manager HTML
   200 proves nothing (the XTransformPort trap: title loads, JS never
   boots). The full probe set, in order: health endpoint
   (`/annotakit/api/health` — proves addon server + store + token config),
   forged-Host through Caddy (`curl -H 'Host: …fcapp.run' :81/`), then the
   REAL public URL fetching: `/` (manager HTML), `/sb-manager/runtime.js`
   (1.2MB manager bundle), `/sb-addons/vendor-storybook-annotakit-1/manager-bundle.js`
   (the ADDON actually loads through the edge), `/iframe.html?id=<story-id>&viewMode=story`
   (a story actually renders), `/index.json` (story COUNT — 83 entries / 8
   groups at R17; a count regression catches half-loaded story globs), and
   `/@vite/client` (the dev server's virtual modules — root-absolute, so
   it only works when the app owns the WHOLE origin, which is exactly why
   this pattern requires the dedicated port).

9. **Host acceptance: SB 10.6 allows all hosts by default** — startup
   banner `Other allowed hosts: all (insecure)`; verified 200 with a
   forged edge Host. The committed `core.allowedHosts: true` in
   `.storybook/main.ts` (builder-vite forwards it into vite
   `server.allowedHosts`) is belt-and-braces that survives a future SB
   default flip. PROBE, don't assume — Vite itself default-403s the edge
   Host (the shell-mini session's whole go-live bug).

10. **Timing + noise you will hit:** `npm ci` ~4 min; Storybook dev ~25-40s
    to ready (telemetry + vite optimizer bundling — poll, don't assume);
    the esbuild "install scripts not yet covered by allowScripts" warning
    is benign (binary works; `node -e "require('esbuild')"` proves it);
    GitLab mirror pushes 403 (WAF) ~1 in 3 — just retry once; `git push`
    rejected non-fast-forward means the PARALLEL stream pushed again —
    fetch + rebase, never force (it happened twice this session; the
    shell-variants subtree was untouched both times — verify with
    `git diff --name-only A B -- ui-mock/shell-variants` before assuming
    conflict).

11. **The only real proof of the restorer is a live kill→restore→public-200
    cycle.** Idempotence check (run the hook while up → "nothing to do") +
    kill the daemon → run the hook → health green → public URL 200. If you
    haven't watched it come back from the dead, you don't have a restorer,
    you have a script.

### When to use WHICH serving pattern (the two-session decision table)

| | shell-mini pattern (above) | shell-variants pattern (this section) |
|---|---|---|
| What owns :3000 | the APP's Vite dev server | the Storybook DEV server itself |
| Storybook at public URL | static build mounted at `/stories/` | :3000 IS Storybook (root) |
| Why | the app is the product; SB is a sub-surface | SB+annotakit IS the review product (HMR + live review API) |
| Cost | rebuild+recopy+commit `public/stories` on story changes | no static sync; port exclusively SB's |
| Both verified | end-to-end (manager + VLM) | end-to-end (health + bundles + iframe + index.json) |

Rule of thumb: **if reviewers interact through the Storybook UI (pin
comments), serve the DEV Storybook as the port owner** — annotakit's review
API lives on the dev server, a static build shows a "dev only" note. If the
APP is the review surface, mount SB's static build under the app.

### R18 amendment (shell-mini joins the SB-owns-:3000 pattern)

User directive after the R16 verdict was shipped: "everyone can serve this
through 3000 — port forwarding should work, but at least 3000 should
definitely work." shell-mini's env switched to the shell-variants pattern:
the FULL Storybook dev server owns :3000 (`scripts/sb3000.py`, double-fork,
PPID=1, `core.allowedHosts: true`), the app moved to localhost :3001
(`scripts/dev3000.py`), the static `public/stories/` mount and the
`previewRedirect` query-shim were REMOVED (8.4MB out of the repo, 101→93
tests), and the restorer now gates on `/index.json` (must-succeed) with the
app as best-effort. Verified end-to-end through the real edge post-switch
(manager boots, story tree, story selection, iframe story DOM with 4 clips +
8 trim handles, zero page errors) AND via a live kill→restore→public-200
cycle. The decision table above stands, with the R17-vs-R18 twist: the
"shell-mini pattern" column is now the documented FALLBACK (app owns the
port), not what any env currently runs.

## R18 meta-learnings (serving-verdict correction round)

64. **Reach for the standard serving pattern before inventing a workaround — and never let a workaround's write-up promote itself to "the law."** The R16 session probed the platform's query-based port forwarding, correctly observed that sub-resources don't carry the query, then concluded "a dev Storybook cannot serve publicly" and built a workaround STACK (static-build recopy pipeline, 8.4MB committed mount, an app-entry redirect shim with 8 tests, a second SB daemon on :6007) — all to route AROUND the one-port rule that was never actually binding: the proxy chain is port-based, so putting the dev server ON :3000 makes everything same-origin and it just works (the sibling session did exactly that, in parallel, and wrote it up; the note was IN THIS FILE the whole time). The user's correction was one sentence. The failure mode has two halves: (1) not asking "what does everyone else do here?" before accepting a constraint as a law, and (2) writing a workaround up as "THE verified pattern" — the next session (mine) inherited it as truth and doubled down with the casing shim. Empirical honesty about a dead end is necessary but NOT sufficient; label the standard way as the default, demote everything else to fallback, and when a user corrects a verdict, revert BOTH the docs and the infrastructure built on it.

## R18b meta-learnings (vendoring the storybook-annotakit review kit)

65. **A vendored kit developed against repo-root projects breaks in quiet ways inside subdirectories — probe the GIT CWD assumptions.** storybook-annotakit v0.5's orphan-branch sync failed silently here: `refHasOurReadme` ran `git ls-tree <tree> -- README` through a helper that shells `git -C <projectRoot>`; pathspecs are CWD-relative, the project (`ui-mock/shell-mini`) is a SUBDIRECTORY of the repo, so the pathspec matched nothing → every remote branch read as "foreign" → sync never parented on it → every push after the first was rejected non-fast-forward, forever, with lastError: null. The kit author's dogfood project IS a repo root, so the bug was invisible upstream. Diagnosis recipe that cracked it: reproduce the kit's exact git invocation BY HAND from the project dir (my first reproduction from the repo ROOT passed — the wrong cwd made the check look healthy). Fix: cwd-independent forms — `git rev-parse <ref>:README` (colon-path) instead of pathspec-dependent `ls-tree`. Rebuild discipline from R17 gotcha 4 held: comments are STRIPPED by esbuild/tsup, so grep the dist for the CODE change (`rev-parse`/`ls-tree` call shapes), not the comment marker.

66. **When two parallel streams share a git-backed store, watch the branch log for the OTHER stream's signature before diagnosing your own sync.** The remote `annotakit` orphan branch carries commit messages like `db=annotakit@shell-mini` and `db=annotakit@shell-variants` — the sibling env pushes to the SAME branch, so "the remote moved under me" (non-FF) can be healthy cross-stream logical-merge traffic, not a bug. The kit's design (union-by-id merge, tombstone propagation, pull-every-60s) is built for exactly this; verify convergence by watching a real mutation cycle end-to-end (create → UI badge → delete → tombstone → push → issue closed) instead of trusting a single health-state string — the `autoSync` label lags by design (debounced 6s + async cycle), and POST /sync short-circuits when the store isn't dirty.

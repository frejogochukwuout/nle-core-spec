# REVIEW-R15-ARCH — Peer review (adversarial audit) of ARCH-R15-assembly-and-path

**Task ID:** R15-PR1 · **Agent:** senior architecture auditor, fresh context, read-only · **Date:** 2026-09-06
**Object under review:** ARCH-R15 (D15 evolve-in-place · D16 assembly topology · D17 roof-test strategy + A0-A8).
**Method:** every load-bearing claim below was re-verified against the four repos and the spec canon by opening files (not trusting the scouts or ARCH-R15); ~20 claims spot-checked (§1). Canon sections read in full: 00-master Decisions 9-14 + §2.5 + §4 + position statement; 14-implementation §2.1; 15-wire §4.1/§9/§13.15/§14.11; 05-timeline §16.5/§16.6; 17-test §2; 18-ui-shell §12.

---

## 0. VERDICT

**SOUND-WITH-AMENDMENTS** — split per ruling:

- **D15 (evolve-in-place): SOUND.** The completion matrix, the greenfield ledger, and the reversal condition ("a discovered structural defect in a sealed core cheaper to rebuild than contain") all survive adversarial re-checking. This review found assembly-layer under-specification — fixable in the document — and **no structural defect in any sealed core** (independently probed: engine fences/freeze/pins, OT seams/props, WDC boundary, mock store).
- **D17 (roof-test strategy): SOUND with amendments** — the module-gates-stay principle, the port-then-swap law, and the CI composition are right; the S-suite size arithmetic, the A3 dependency chain, and the missing event-suite rows need fixes (M1, m2).
- **D16 (assembly topology): NOT landable as drafted.** One internal contradiction with cascading consequences (the projector's home — CRITICAL-1), a missing half of the architecture (the event/telemetry channel — MAJOR-1), a routing-completeness claim the plan cannot satisfy (MAJOR-2), an understated double-vendoring hazard (MAJOR-3), a silent canon conflict on JSON-RPC (MAJOR-4), and an unargued rejection of the workspace alternative (MAJOR-5).

The A0-A8 skeleton is executable after the amendments; durations are roughly right but optimistic at the top end (m2). Nothing found here reverses D15; several things found here would have bitten during A1-A3.

---

## 1. Claim verification (spot-checks against repos/canon)

| # | ARCH-R15 claim | Verdict | Evidence |
|---|---|---|---|
| 1 | Bridge already consumes SceneTracks-shaped structure via `opencutSceneToAudioSources` (`bridge/scene-to-segments.ts:284-369`, TYPE-ONLY import) | **TRUE** | Flattener section opens at :285; `import type {SceneTracks, AudioElement, VideoElement} from 'opencut-timeline'` at scene-to-segments.ts:43; file is 369 lines |
| 2 | Engine Timeline op methods: `rollingTrimItems`:2984, `slip`:4143, `slideItem`:4246, `rateStretchItem`:3155, `freezeFrameAtPosition`:7163, `closeGapAtPosition`:6158, `joinItems`:7319 | **TRUE (all 7)** | Re-grepped each; all signatures at the cited lines (timeline.ts, 7,480 lines) |
| 3 | OT `apply()` never-throws `CommandResult{ok,code…}` envelope, `api.ts:127-165` | **TRUE** | `CommandResult` at :127-140; try/catch → INTERNAL_ERROR at :154-165; 5 codes exactly |
| 4 | Engine ci.yml materializes submodules via `CI_VENDOR_URL_PREFIX` (ci.yml:39-53) | **TRUE** | `Materialize private submodules` step, GLOBAL `url.insteadOf`, `--init --recursive` at ci.yml:38-53 |
| 5 | OT `toJSON`/`fromJSON` per scene at `timeline-core.ts:1769/:1773` | **TRUE** | `toJSON()` at :1769 (deep copy, committed-only), `static fromJSON` at :1773 |
| 6 | OT = 24 prefixed wire commands (`api.ts:39-125`) | **TRUE** | Counted the union: 24 `type:` literals, all `timeline.*`/`track.*`-prefixed |
| 7 | Engine headless = 19 JSON-RPC ops + `editProject` (`api.ts:378-406`); `probeMedia` exists | **TRUE** | `EditOperationName` union of exactly 19 at :378-396; `probeMedia` at :127 |
| 8 | Engine `.gitmodules` (2 submodules) + tsconfig longest-prefix aliases | **TRUE** | OT + WDC entries; paths `@/lib/daw/*`, `opencut-timeline(+/*)` in tsconfig.json:26-41 |
| 9 | Engine timeline = 8.9k LOC | **TRUE** | 7,480 + 817 (keyframe-store) + 639 (sync-lock) = 8,936 (scout-measured; consistent) |
| 10 | OT `TimelineViewProps` with `mediaLookup?` seam (TimelineView.tsx:115-127); `onViewStateChange` NOT plumbed through props | **TRUE** | Props block at :115-127 incl. `mediaLookup?`; `onViewStateChange` exists only at hooks/use-timeline-zoom.ts:70 — absent from TimelineView.tsx |
| 11 | Spec 15 §13.15 worklist is stale (says "18 types"; actual OT union = 24 since W5) | **TRUE** | 15-wire-protocol.md:4825 — "`headless/api.ts:38-87` — 18 types"; rename list omits the 6 bookmark/keyframe commands |
| 12 | Spec 15 union = 78 types / 16 categories | **TRUE** | §4.1 :161-259, "Total: 78 command types" at :259 |
| 13 | "Projector laws (per SCOUT-A §2 + spec 05 §16.5A)" (S1 row) | **FALSE — two citation defects** | (a) **spec 05 §16.5A does not exist** — 05 has §16.5 (code refs) and §16.6 (inline-block classification) only; the projector law lives in 00-master Decision 12.1 and spec 14 §2.1. (b) SCOUT-A §2 is "The vendored submodules"; the projector evidence is **§4** |
| 14 | §1.3: "the engine gains a projector + a command façade" vs §2.1 topology: `nle-app/src/projector/` | **CONTRADICTORY** | The document assigns the projector to two different repos (see CRITICAL-1) |
| 15 | Engine emits runtime events / metering / progress (needed for backflow audit) | **TRUE (and unmentioned in ARCH-R15)** | player.ts:587-608 emits `framechange`/`timeupdate`/`ratechange`/`statechange`/`ended`/`error`; realtime-engine.ts:44-58 `masterAnalyser`/`masterMeter`; orchestrator.ts:111 `onProgress?: (NleRenderProgress)` |
| 16 | Canon has an event contract ("EngineEvent") | **TRUE** | spec 15 §9.1 :3253-3280 — `playbackTimeUpdate`, `renderProgress`, `exportJobStarted`, `exportArtifactReady`…; §2 goal 9: "the only sanctioned channel for UI/engine state sync" |
| 17 | Spec 18 §12 command-capture suite ≈ 60 tests | **TRUE** | 18-ui-shell.md §12 Tier 3: "the core shell suite (~60 tests)" |
| 18 | Mock stack = Zustand 5 / Vite / Tailwind 4 / React 19; view-state slice transfers near-verbatim | **TRUE with caveat** | package.json:24-44; SCOUT-D §2's own caveat: mock times are float seconds vs 09's MediaTime frames (unregistered delta) — "near-verbatim" needs a units-conversion note |
| 19 | Engine 52k LOC / 274 vitest / 265 rows / 453-name freeze / 52-edge fences / page.tsx runner at :129 | **TRUE** | Scout-verified; re-spot-checked LAYER-SNAPSHOT.txt (66 lines / 52 edges), api-surface.frozen.ts (453), `MILESTONES` at page.tsx:129 |
| 20 | Engine's D8 is the precedent for D16's one-way law | **TRUE but selectively quoted** | D8's full data-contract clause (DECISIONS.md:335-338) routes **waveform peaks, metering, and transport/playhead state as data the app feeds back to the timeline UI** — the telemetry half ARCH-R15 drops (see MAJOR-1) |

**Score: 17 true / 1 true-with-caveat / 2 defective citations / 1 internal contradiction.** The evidence base is unusually honest; the defects concentrate exactly where the doc is weakest — the projector and the event channel.

---

## 2. FINDINGS (ranked)

### CRITICAL-1 — The projector's home is self-contradictory, and each choice has unstated consequences

**Evidence.** §1.3 point 3: "the engine gains a projector + a command façade (its D9 freeze allows additive changes…)". §2.1 topology: `nle-app/src/projector/` (app-owned). §2.2 and A1 never name the repo. The two halves of the document disagree.

**Why it matters — three consequences, none stated:**

1. **App-home contradicts D16's own charter.** §2.1: "What the app does NOT contain: any DSP, any timeline semantics, any WGSL, any codec logic." But §2.2's projector owns rate/timebase reconciliation, transition-window translation (two-tier type/presentation ↔ element-hung), keyframe normalization, and composition/adjustment mapping — that IS timeline semantics. Under app-home, nle-app becomes the third timeline-semantics home, the exact thing D12 was written to eliminate.
2. **App-home breaks the retirement gate.** §2.2: the engine's `Timeline` (8.9k LOC) is "RETIRED (deleted)… when the parity gate is green and the headless wire re-points." The doc's consumer census stops at "the headless wire." Actual consumers (SCOUT-A §4, verified): headless `timeline-adapter.ts` (all 19 wire ops), `editProject` serialization, export orchestrator (`buildTimelineData`, orchestrator.ts:56), Player `syncTimeline` (player.ts:3092), persistence (`NLE_SCHEMA_VERSION = 2` + migrations + 32 load-validation vitest), the browser runner `page.tsx:8` (the 265-row suite drives the Timeline class), and 7 engine vitest suites. If the replacement projector lives in nle-app, the engine post-deletion **cannot ingest SceneTracks at all** — its own tests, persistence, and render stack would depend on code in a repo it cannot import. The C8/C9 precedent the doc cites breaks here: AudioMixer/direct-mix retirements replaced in-repo code with an in-repo bridge, gated in-repo. This retirement replaces engine code with another repo's code, gated in a third venue (app S4, nightly).
3. **Engine-home makes everything cheaper and the precedent actually apply.** The engine already type-imports `SceneTracks` (scene-to-segments.ts:43 — the exact pattern a projector needs: type-only, zero runtime dep, D8-lawful). An additive `src/lib/nle/projector/` under D9's additive-change rule puts the parity corpus AND the parity gate inside engine CI (its WebGPU milestones venue is the proven 8-min run), lets the headless adapter/orchestrator/Player/persistence re-point in-repo, and shrinks `nle-app/src/projector/` to thin orchestration — preserving "app = assembly only."

**Amendment.** Resolve to **engine-home** in the text: `projector/` lands in nle-engine as a fenced additive module (SceneTracks type-only import per the scene-to-segments precedent); A1 becomes "engine-repo phase, app pin bumps after"; the parity corpus + S4-parity gate live in engine CI; nle-app keeps only the call site. **If app-home is genuinely preferred**, then re-scope §2.2's "RETIRED (deleted)" to "the app stops consuming the engine Timeline; the class remains the engine's permanent internal test substrate" and add the engine-side consumers to the gate's exit checklist — deletion must be struck. Either resolution is defensible; the current half-and-half is not.

---

### MAJOR-1 — The backflow/event channel is missing from D16: the architecture has a down-staircase and no up-staircase

**Evidence.** D16's dataflow diagram shows commands only (UI → bus → OT → engine); §2.3 unifies the command direction only; the words *event, telemetry, playhead-during-playback, meter, waveform, progress* appear nowhere in the topology (grep: only "viewer via engine renderFrame" once, in A3, and `playheadTime` inside a quoted view-state type). S1 even pins "one-wayness (engine output never feeds back)" — which, read at the wrong layer, forbids exactly what the app must have.

**The runtime engine→UI flows the doc ignores (enumerated, each verified to exist):**

| Flow | Reality today | Canon | ARCH-R15 |
|---|---|---|---|
| Playhead position during playback | Player emits `framechange`/`timeupdate` (player.ts:587-608) from the Clock; OT's core holds only a *logical* playhead ("real clocking lives downstream", timeline-core.ts:20/:360) | spec 15 §9.1 `playbackTimeUpdate` | **absent** |
| Rendered frame for the viewer | `renderFrame`/`renderFrameOffscreen` (api.ts, player.ts:2995) | §9.1 render events | mentioned once (A3), no seam |
| Waveform peaks for clip visuals | OT `computeWaveformPeaks` input shape expects the audio side to supply PCM peaks; engine/virtual-media renders PCM; D8: "waveform peaks and metering are signal-derived DATA the app feeds the timeline UI" (DECISIONS.md:335) | — | **absent** (mediaLookup covers identity, not the data path) |
| Audio meters | `masterAnalyser`/`masterMeter` in realtime-engine.ts:44-58; mock's StripMeters expect per-strip levels | — | **absent** (A4 wires G-settings downward only) |
| Export progress | orchestrator `onProgress?: NleRenderProgress` (orchestrator.ts:111/226); mock Deliver queue states proven | `renderProgress`/`exportJobStarted`/`exportArtifactReady` | **absent** |
| Drift state | H16 surface (player.ts:3296-3346) — internal, arguably stays | — | absent (acceptable) |

Three event models exist and none is unified: engine Player's DOM-style emitter, OT's `core.subscribe()` (preview-layered readouts, not events), and spec 15 §9's `EngineEvent` union — while the mock's store contract was explicitly designed to consume "SceneState snapshots + EngineEvents" (useUiStore.ts:1-8, SCOUT-D §2). ARCH-R15 reconciles the three COMMAND surfaces and never touches the three EVENT surfaces. Note the precedent inversion: engine D8 — cited as the basis for "D8's law, generalized" — explicitly routes peaks/meters/playhead **upward as data**; ARCH-R15 kept the down-arrow and dropped the up-arrow.

**Amendment.** Give D16 an explicit event half: (i) restate the law at the right layer — "engine-derived **state** never becomes an editing input (D12); **telemetry is one-way UP through a separate seam**"; rewrite S1's one-wayness row accordingly. (ii) Add `nle-app/src/events/`: an adapter normalizing Player emitter + export onProgress + metering + OT `subscribe` into one app event stream shaped like spec-15 `EngineEvent` (the engine-name↔spec-name mapping is a small C-register row, same discipline as C7). (iii) Rule playhead ownership: during playback the engine Clock is truth; mirror time into the view via the **imperative** TimelinePlayhead API (not `core.seek` — that fires `subscribe` → full React re-render per frame); commit time into the OT core on pause/scrub. (iv) Name the peaks path (engine PCM → `computeWaveformPeaks` shape via the app's MediaLookup) and the meters polling contract. (v) Add S1/S2 rows for event-completeness and event-mapping; export progress feeds the mock-proven Deliver queue states.

---

### MAJOR-2 — The union-routing completeness claim is not achievable by the plan that surrounds it

**Evidence.** S1: "bus routing completeness (**every spec-15 union member → exactly one handler** — exhaustive-switch compile…)". A2's exit gate: "app bus routes **100% of the implemented union**." These contradict each other inside one document. The census (SCOUT-B §5, verified against the union): 78 spec types; OT implements 24; op-port wave 1 = 4 of 7 trim-family variants. **Families with no home in any phase A0-A8:** effects ×5, masks ×4, transitions ×3, clipboard ×3, markers ×3 (spec 09's markers are project-level — the app slice doesn't own them either), `selectTool/selectTrack/marqueeSelect`, `setRate/setLoop`, `toggleTrackSolo/Lock`, `reorderTrack`, `toggleElementMuted/Visibility` (ops exist at timeline-core.ts:906/:950 but are not on the wire), and wave-2 ops (`retime`, `freezeFrame`, `rangeRemoval`). Per D12.2, editing-state commands must route to OT — but OT has **no effect/mask/transition/clipboard model**, so those 15+ members are blocked on SceneTracks-shape spec work (06/07) that no phase owns. Also unscoped: error-code reconciliation (OT's 5 coarse codes vs spec's ~24, SCOUT-B §4) and `stateChange`/readouts (spec 15 §13.15's own open row).

**Amendment.** Add a routing-disposition table to D16: one row per union member, home ∈ {OT, engine, app, **DEFERRED**}; DEFERRED members dispatch to a typed `NOT_IMPLEMENTED` CommandResult code (register the code in spec 15 §6.3 as an amendment) so the exhaustive-switch check compiles and is honest. Move the table into S5's battery (it half-exists there as "union-coverage table"). Give wave-2 ops + the OT model extensions an explicit phase (A7 or a new A2.5) or an explicit user-signed deferral. Fold the error-code expansion into A2's C7 pass.

---

### MAJOR-3 — Double-vendoring is "accepted (bounded: types + test fixtures)" — the bound is wrong; the compile couples the pins regardless

**Evidence.** A0's exit gate "tsc clean across all vendored sources" compiles the engine's 52k LOC **against the app's pins**: the engine's type-only `opencut-timeline` import (scene-to-segments.ts:43) resolves through the app's tsconfig paths to the app's OT clone; the engine's runtime `@/lib/daw/*` imports (7 sites in bridge/realtime/index) resolve to the app's WDC clone in the app build — i.e., **the app ships the app's WDC pin for vendored engine runtime code that the engine validated against its own pin**. Consequences: (a) bumping the app's OT pin ahead of the engine's breaks tsc **inside read-only vendored engine code** — loud, but unfixable in-app; (b) a WDC semantic change between pins passes tsc and ships an unvalidated engine×WDC combination; (c) §2.5's "app tracks module HEADs within one business day" presumes independent bumps, and §2.5's claim that re-exporting "couples pin states across repos, which is worse" is moot — the compile already couples them; only the engine's own CI/test fixtures are decoupled.

**Amendment.** Adopt a **pin-lockset rule**: app OT/WDC pins must be ≥ the engine pin's SHAs and move only together with the engine pin (mechanically asserted in S5: parse the engine's `git submodule status` at the app's engine SHA and compare); re-word §2.5 to "pins travel as a lockset; the app never advances OT/WDC beyond the engine's validated combination without an explicit compat run." Add A0 checklist items for the alias hazards the scouts already paid for: engine's `@/lib/*` absolute imports (10 sites) mean the app must not use `@/lib/...` for its own code (longest-prefix mapping stays unambiguous), and the vitest/vite alias table is insertion-ordered (SCOUT-C §8's documented trap).

---

### MAJOR-4 — "Engine JSON-RPC stays as internal transport" silently contradicts canon (D12.2 / spec 15 §13.15)

**Evidence.** D16 §2.3: "The engine's internal JSON-RPC layer remains the headless/cloud transport (unchanged — it is freecut-pattern that the spec already corrected INTO the union at the app layer…)." Canon: Decision 12.2 (00-master:327) — "The JSON-RPC+$ref **retirement stands**"; spec 15 §13.15's binding statement — the engine converges via the C2 dispatcher "scoped… to the RUNTIME command subset… its JSON-RPC+$ref surface retires." The parenthetical also misstates canon history: the spec never "corrected INTO the union at the app layer"; it scheduled the engine-side retirement. The façade approach itself is defensible (it avoids an engine-internal rewrite and D9 makes the façade additive) — but as drafted it lands as a silent contradiction that a future round will "discover" as drift.

**Amendment.** 00-master's Decision 16 text must carry an explicit supersession clause: "Decision 12.2/C2 amended: the engine's JSON-RPC+$ref surface is re-typed as INTERNAL transport (headless/cloud); the 78-union contract is enforced at the app bus and the engine's union façade." Re-baseline the C2 ledger row and spec 15 §13.15 accordingly (the impact map's 15-wire row already gestures at this — make it normative, and decide once what the headless/cloud wire *speaks* long-term, since spec 11's cloud consumer needs one answer).

---

### MAJOR-5 — The topology section argues against a strawman: the workspace-monorepo alternative is never weighed

**Evidence.** §2.1's "Why a new repo rather than growing the app inside nle-engine" rebuts grafting the app onto the engine (fences/Next.js/identity) — a framing nobody proposed. The live alternative for four private, single-consumer, source-vendored repos is a **single workspace monorepo** (`apps/web` + `packages/{engine,timeline,audio}`, per-package CI via path filters). What it buys: cross-repo changes become atomic (the §2.5 "one business day" pin-bump rule becomes "same commit"), the PAT-authenticated `CI_VENDOR_URL_PREFIX` machinery disappears, and the double-vendoring type divergence (M3) dissolves — one OT/WDC copy. What it costs (arguments the doc should have written down): heterogeneous toolchains (Next.js engine harness vs Vite app vs serial-vitest WDC) must unify; the seals' per-repo CI configs + review ledgers + PR histories migrate; HEAD-follow isolation (a bad OT commit cannot break the app until pinned) is lost. None of these appears in the document.

**Amendment.** Add §2.1bis "Alternatives weighed" with the honest trade-off table (submodules vs workspace vs npm packages — the last is already documented as the escape hatch). Submodules remain defensible at 1-2 devs given the seals' momentum and engine CI's proven pattern; but the decision must be argued, not assumed. (This is also the one place the greenfield instinct in §5 is directionally right about a real cost.)

---

### MINOR findings

- **m1 — Citation defects** (evidence in §1 #13): "spec 05 §16.5A" does not exist (projector law lives in 00 D12.1 + 14 §2.1 — the impact-map row "§16.5A projector clauses extended" must become "§16.5 amended/§16.5A created"); S1's "SCOUT-A §2" → SCOUT-A §4. Also §3.1 implies gate parity across "module repos," but the mock has **no CI workflow** (SCOUT-D §1 — local suite only); say so.
- **m2 — Plan arithmetic.** Single-dev serial sum: 0.5+2.5+2.5+3.5+1.5+1.25+1.5+2.5 ≈ **15.25 wk mid (12.5-19.5 range)** vs claimed 11-16; A3's end-to-end exit gate (import→cut→play→export) is serially dependent on A1+A2 (the ∥ note covers only the chrome port — say "A3's first ~2 wk parallel; its exit gate blocked on A1+A2"); S3's estimate (180-260) contradicts its own composition (120 OT real-mouse + ~300 surviving mock chrome tests + ~60 capture ≈ 480) — fix the port-survival fraction or the estimate; "~45 min nightly" and "<5 min fast lane" are plausible but the fast lane is tight once tsc spans ~80k vendored LOC.
- **m3 — Multi-scene semantics under-specified.** Per-core undo means undo never crosses a scene switch (UX decision needed); snapshot-undo memory = N scenes × 100-entry history (eviction policy for inactive cores?); spec 09's **project-level** markers have no home in the app slice (A2's "markers per-scene" resolves the mock delta, not the spec's project-level family). Add these as A5 sub-gates.
- **m4 — Missing sections a real architect would add:** error strategy across modules (who translates engine JSON-RPC errors into the bus's CommandResult?); `ProtocolVersion`/union versioning at the bus (spec 15 §15.1 envelope — unmentioned); **dev-loop story** (HMR across vendored sources; the actual A3 workflow is "fix OT while developing the app" — the vite/vitest alias traps from M3 apply here); the annotakit review loop chartered for the **app** (SCOUT-D §8: "a config change, not a port" — the strongest reusable mock asset, currently only a non-goal footnote); mock float-seconds vs MediaTime at the store boundary (SCOUT-D delta #7) as a caveat on "near-verbatim transfer."
- **m5 — Nomenclature/consistency nits.** "L1/L2/L3 (spec 17)" vs spec 17's Tier-1/2/3 naming; "the engine never writes back" should consistently say "editing state" (see M1); D15's "the repos are the product" vs Decision 10's "de-risking references" — the impact map updates the position statement but Decision 10's body text needs a supersession note too, else 00 self-conflicts (same class as M4, lower stakes).

---

## 3. Canon-consistency matrix

| New ruling | vs prior canon | Verdict |
|---|---|---|
| D15 evolve-in-place | D14 (inherit-as-baseline), 14 §2.1 | **Consistent** — executes D14; the 8-13wk → 11-16wk supersession is honestly flagged |
| D15 "repos are the product" | 00 D10 "reference implementations are de-risking references" | **Tension** — needs a D10 supersession note (m5), otherwise 00 contradicts itself |
| D16 one-way projector | D12.1 | **Consistent in law** (engine state never an editing input); the law is stated at the wrong layer for telemetry (M1) and the projector home conflicts with D12's one-semantics-home spirit (C1) |
| D16 op-port INTO OT | D12.3, 14 §2.1 P2 | **Consistent** — same families, same acceptance discipline |
| D16 "JSON-RPC stays as internal transport" | D12.2, 15 §13.15 ("retirement stands") | **CONTRADICTION** — needs explicit supersession (M4) |
| D16 app-level union + façade | 15 §13.15 binding statement, 00 D9 (identical JSON consumers) | **Consistent if amended** — the union moves to the app bus; D9's "three identical consumers" survives via the bus; façade approach itself is fine |
| D16 multi-scene app-level, per-scene cores | 09 project model, OT SEAMS | **Consistent**; cross-scene undo/markers gaps (m3) |
| D16 fifth repo + submodules | 14 §2.1 posture table ("App shell… the one greenfield surface") | **Extension** — handled by the 14 rewrite in the impact map; the workspace alternative unweighed (M5) |
| D17 roof tests, module gates stay | 17 tier methodology | **Consistent**; S3 re-running OT's real-mouse suite is justified by §3.3's port-then-swap law (in tension with "the app NEVER re-tests module internals" as worded, but the doc itself resolves it) |
| D17 "one-wayness: engine output never feeds back" | 15 §9 (EngineEvent is the sanctioned UI-sync channel), engine D8 data contracts | **CONTRADICTION as worded** — must be re-scoped to editing state (M1) |

---

## 4. Counter-arguments to D15 (the strongest honest case FOR greenfield)

**Steelman:**

1. **The reconciliation machinery is pure overhead.** A1+A2 (4-6 wk) plus permanent taxes — pin locksets, nightly HEAD-follow, exhaustive-switch maintenance, three event models unified, three error models reconciled, double-vendoring checks — buy zero user-visible feature. A greenfield with the spec set as contract pays none of it.
2. **"Verified" is verified at module boundaries under scaffolding.** Virtual media, Canvas2D placeholder compositor, a 4GB-conditional audio venue, and a parity story that is a *composition* of gates (SCOUT-C §6: no single realtime-vs-offline null test exists). The composed whole gets re-verified by S1-S5 (~330-530 tests) either way — the roof is the same size over four foundations or one.
3. **Review debt is only re-incurred for NEW code.** A greenfield can keep Decision 10's posture — cite the repos as references, inherit their reviewed *semantics* through the spec's contracts — and re-derive the implementation uniformly. The doc's own §1.2 multiplier (3-5×) prices LOC, but uniformity has a quality multiplier in the other direction.
4. **Process reality: 1-2 devs, five repos.** Five CI configs, five review cadences, five HANDOFF/SEAMS docs, PAT-authenticated submodule CI. The seals assumed per-repo scout rounds; assembly multiplies coordination surface exactly when the work becomes one product.
5. **The middle path the doc never prices:** inherit ONLY the runtime core (nle-engine) and build editing+app fresh in ONE repo against spec 05/06/15 — SceneTracks is small and spec'd; vendor OT's interaction source in as a starting point without keeping its repo boundary. That deletes the projector/pin machinery while keeping the two hardest assets (engine, interaction code).

**Why it loses (on the evidence):**

- The interaction layer is un-re-derivable, and the steelman's step 5 quietly concedes it: "vendor OT's interaction source" is evolve-in-place with worse tooling — you would re-home 423 tests, OT's fences, and its review cadence for zero functional gain, and the classic-parity ledger (DECISIONS #20/#21, real-mouse-pinned) is precisely the tacit knowledge the spec deliberately does not duplicate (00 §2.5.2).
- The 3-5× re-derivation factor is *conservative* against the engine's own history (31 milestones / 265 rows / 318 probes / 52 fences took 61 commits and multiple waves), and the WDC null-test harness is upstream-synced — a rewrite orphans the only living ancestor relationship in the program.
- The failure-mode asymmetry holds: this audit probed all four cores and found **bounded integration gaps, no structural defect** — which is D15's own stated reversal condition, now independently checked. What this audit DID find is assembly-layer under-specification (C1, M1-M5) — fixable in the document, and identical work under either path (the 0% rows).
- The spec set is already re-typed CONTRACT+GAP+ACCEPTANCE; greenfield re-types it a third time.

**Where the steelman half-wins:** points 1 and 4 are real costs the doc under-admits, and point 4 is partially *fixable inside D15* by taking M5's workspace alternative seriously. The greenfield conclusion loses; its discomfort should be converted into the amendments above rather than ignored.

---

## 5. Recommended amendments before landing (D15/16/17)

1. **C1:** Resolve the projector to engine-home (or strike "RETIRED (deleted)"); add the full consumer census to the retirement gate (headless adapter, editProject, orchestrator, Player syncTimeline, persistence/NLE_SCHEMA_VERSION, page.tsx runner, 7 vitest suites); move the parity corpus+gate to engine CI.
2. **M1:** Add the event/telemetry half of D16 (law re-scoped to editing state; events/ adapter; playhead ownership ruling via the imperative TimelinePlayhead API; peaks + meters + progress paths; S1/S2 event rows).
3. **M2:** Routing-disposition table for all 78 union members incl. typed `NOT_IMPLEMENTED`; own wave-2 ops + OT model extensions in a phase; fold error-code expansion into A2.
4. **M3:** Pin-lockset rule + A0 alias-hazard checklist; re-word §2.5.
5. **M4:** Explicit supersession of D12.2's JSON-RPC retirement clause in the Decision 16 text + C2 ledger re-baseline.
6. **M5:** §2.1bis "alternatives weighed" (submodules vs workspace vs packages).
7. **m1-m5:** citation fixes (§16.5A, SCOUT-A §4), plan arithmetic restated (13-19 single-dev; A3 exit gated on A1+A2; S3 size), A5 sub-gates (cross-scene undo, history budget, project-level markers), missing sections (error strategy, union versioning, dev-loop/HMR, annotakit-for-app charter, units conversion), Tier-1/2/3 naming.

None of these reverses D15; all of them change D16's text. With 1-6 applied, this reviewer would sign off on landing D15/D16/D17.

---

*Review R15-PR1 — read-only; no repo files modified (this review + worklog append excepted).*

---

## RE-REVIEW (v2)

**Task ID:** R15-PR1b · same adversarial auditor (verdict-gate round) · **Date:** 2026-09-06
**Object:** ARCH-R15 v2 (status line: "post peer-review… all amendments folded; re-review gate pending"). Full file re-read; every amendment traced to its landing site; new PR2-derived factual claims independently spot-verified against the repos.

### Per-amendment verdict table

| # | Amendment (from §5 of my original review) | Verdict | Landing evidence (v2) |
|---|---|---|---|
| C1 | Projector home → ENGINE-home; full consumer census; retirement re-scoped | **LANDED** | §2.2 "ENGINE-HOME (amended per PR1 CRITICAL-1)": `nle-engine/src/lib/nle/projector/`, D9 additive rule, SceneTracks TYPE-ONLY per the scene-to-segments.ts:43 precedent; **all 7 consumer classes named** (headless adapter 19 ops, editProject, orchestrator buildTimelineData, Player syncTimeline :3092, persistence NLE_SCHEMA_VERSION 2, 265-row runner, 7 vitest suites); retirement = "permanent internal test substrate… Deletion is an engine-internal call, not an app-round promise"; §2.1 topology marks app `projector/` as THIN call site; A1 is engine-repo work gated in engine CI; §2.1 charter clause updated ("timeline semantics (the projector is engine-home)") — the internal contradiction is gone |
| M1 | Event/telemetry up-staircase (§2.3bis) | **LANDED** | §2.3bis exists with the law re-scoped to *editing state* (telemetry UP, citing engine D8 DECISIONS.md:335-338 — my exact framing); `nle-app/src/events/` normalizes Player emitter (player.ts:587-608) + export onProgress (orchestrator.ts:111) + meters (realtime-engine.ts:44-58) + OT subscribe into spec-15 §9 shape; **playhead ownership ruling verbatim as recommended** (Clock = truth; imperative playhead API, NOT core.seek → no per-frame React re-render; commit on pause/scrub); peaks via MediaLookup → computeWaveformPeaks; engine-name↔spec-name mapping as a C-register row; S1 row ("event-completeness + mapping") + S2 rows ("playhead mirror, progress, meters") both present; S1's one-wayness row now reads "EDITING state (telemetry excluded — §2.3bis)" — the mis-stated law is fixed |
| M2 | Routing-disposition table + NOT_IMPLEMENTED + wave-2 ownership | **LANDED** | §2.3: normative table, one row per union member, home ∈ {OT, engine, app, DEFERRED}; ≈20+ DEFERRED members → typed `NOT_IMPLEMENTED` CommandResult code registered as a spec-15 §6.3 amendment; S5 battery-checks it (implemented rows cite pin SHAs, DEFERRED rows cite phase/user-signed deferral); **wave 2 (retime/freezeFrame/rangeRemoval) owned by phase A2.5**; impact map lands it as spec 15 §4.1A (78 rows); A2 exit gate says "dispatch-complete + NOT_IMPLEMENTED honest" — the S1-vs-A2 self-contradiction is resolved |
| M3 | Pin-lockset rule + mechanical S5 assertion | **LANDED** | §2.5 "The pin-lockset protocol (amended per PR1 M3)": app OT/WDC pins ≥ engine pin's SHAs, move only WITH the engine pin; rationale stated (the app compiles vendored engine code against app-level pins — my coupling argument); **S5 mechanically parses the engine's `git submodule status` at the app's engine SHA and compares**; compat runs required to advance beyond; risk register #3 |
| M4 | Explicit D12.2/C2 JSON-RPC re-typing supersession | **LANDED** | §2.3 pt 3: "Supersession made explicit (amended per PR1 M4): Decision 12.2/C2 amended — the engine's JSON-RPC+$ref surface is re-typed as INTERNAL transport…; the 'retire JSON-RPC' clause of D12.2 is superseded by this re-typing (headless/cloud consumers speak the union façade long-term — spec 11 gets one answer)" — both halves of my amendment (00-master text + one long-term wire answer for spec 11); impact-map 00 row carries it |
| M5 | §2.1bis alternatives-weighed table | **LANDED** | §2.1bis: three columns (submodules / workspace monorepo / npm packages) × seven honest rows incl. the ones the v1 omitted (atomicity, HEAD-follow isolation, double-vendoring dissolved, toolchain unification, migration cost); ruling + **two escape hatches with trigger conditions** (pin-friction >1 day median or team >4 → re-weigh monorepo; second consumer → npm). The steelman's half-win (§1.2 "Where the steelman half-wins") is explicitly admitted into D15 — better than my ask |
| Minors | Citations, arithmetic, S3, A5 gates, missing sections, naming, D10, mock-no-CI | **LANDED (all 10)** | §16.5A fixed (S1 cites "00 D12.1 + 14 §2.1 + SCOUT-A §4"; impact map: "§16.5 amended") · arithmetic restated (PR2's 22-27 wk solo adopted; A3 demo 11-13; "A3's exit gate is serially gated on A1+A2" verbatim) · S3 relabeled Tier-3 and re-sized ~380-440 with an honest 4-part decomposition (120 + ~200 + ~60 + 3-5 ≈ 384 — internally consistent now) · A5 sub-gates: cross-scene-undo law, history-budget eviction, markers home resolved by the A2 spec-09 amendment (per-scene Marker absorbs Bookmark) · error envelope (5-code now, ~24-code refinement queued as §6.3 amendment, "not an A2 blocker") · ProtocolVersion at the bus day 1 · HMR dev-loop section + **A0 exit gate includes a live HMR round-trip** (the unproven claim is now a gate, correctly) · annotakit chartered as the app's review loop (impact-map 18 row) · Tier-1/2/3 naming throughout · D10 supersession note in §1.4 + impact map · mock no-CI stated twice with disposition (ported at A3, retires as repo) · float-seconds→MediaTime conversion named at the store boundary |

**Amendment score: 7/7 LANDED.** Notably, the author went beyond the ask in three places: the steelman's process-tax point is admitted into D15's own ruling text (§1.2), A4 is split into A4-v1/A4-v2 to honestly schedule the net-new realtime-vs-offline null rig (fixing a scout-precision gap PR1 noticed but did not require), and the dev-loop/CSS-alias machinery (PR2's) is adopted as normative A0 artifacts with measurement-not-assertion discipline.

### New-defect hunt (v2 rewrite)

Spot-verified the new PR2-derived load-bearing claims rather than trusting them: engine `src/lib/nle` has **zero react/next imports** (grep: TRUE); OT's only `next` import is type-only in `src/app/layout.tsx:1` (TRUE); the m17-vs-other-12 env-name inconsistency is real (`TIMELINE_VIEW_URL` in m17-real-mouse.mjs:26 vs `TIMELINE_TEST_VIEW_URL` in the other 12 phase modules — TRUE). No false imported claims found. Residual defects, all non-blocking:

1. **MINOR (cosmetic) — §2.6 numbering gap:** §2.5 jumps to §2.7; the v1 media-layer section was folded into the topology tree + punch list without renumbering. No dangling §2.6 references exist (grep-clean), so it confuses only the TOC. *Fix at landing: renumber §2.7 → §2.6.*
2. **NIT — totals arithmetic at the high end:** the phase table sums serially (excluding the explicitly-parallel A4-v2 and A7b) to ~22.5-29.5 wk mid ≈ 26; the "22-27 wk solo" line reconciles at low/mid only if A2.5 (1.5-2 wk) also rides parallel with A3 (different-repo work — plausible, but unmarked). Full-serial high end is ~29-30. *Suggest one clause: "A2.5 may ride parallel with A3" — or widen the range to 22-29.*
3. **NIT — residual wording tension (pre-existing, improved):** §3.1 "the app NEVER re-tests module internals" vs S3(a) re-running OT's 120 real-mouse phases in app context. v2's "(catches… NOT app-path integration)" parenthetical makes the intent honest; soften "NEVER re-tests module internals" to "never re-tests module logic; host-context re-runs of view components are the one sanctioned exception (S3a)".
4. **NIT — viewer-frame path still implicit:** §2.3bis enumerates playhead/progress/meters/peaks/subscribe; the viewer's frame pull (`renderFrame` at the mirrored playhead) is wired only via A3's "player/export e2e wiring". It is a pull driven by the mirror events, so the design is sound — one sentence naming it would close the enumeration I opened.

No new internal contradictions found: the two-staircase law is stated consistently in the D16 title, §2.3 ("DOWN-staircase only"), and §2.3bis; the projector home is consistent across §2.1/§2.2/§1.3/A1; the lockset is consistent across §2.5/S5/risk-3; the routing table is consistent across §2.3/A2/S1/S5/impact-map.

### FINAL VERDICT

**SIGNED OFF — D15/D16/D17 may land.** All 7 amendments and all 10 minors landed faithfully; the v2 also incorporates the execution review (PR2) without introducing internal contradictions or unverifiable claims; the four residual defects are cosmetic/nit-class (renumber §2.6, one parallelism clause, one softened principle sentence, one enumeration sentence) and can be folded into the landing edit without re-review.

*Re-review R15-PR1b — read-only; no repo files modified (this append + worklog entry excepted).*

# Round 7 Audits — Code-Reference Integration Round (2026-09-02)

> **Session:** Round 7 of the nle-core-spec refinement process.
> **Method:** five parallel auditor agents (2-a through 2-e) over all 18 spec files, each briefed with the canon hierarchy (spec = canon; nle-engine = in-between reference, NOT canon), followed by five parallel revision agents (3-a through 3-e) applying surgical fixes, followed by coordinator-authored new specs (18, 19) and the spec 15 amendment.
> **Anti-fabrication protocol:** every nle-engine citation in the new code-reference tables was verified by the auditing/revision agents by opening the file, and the coordinator machine-verified 54 load-bearing citations (`scripts/verify_citations.py`-style check: file exists + quote within ±3 lines of the cited line) — **53/54 exact, 1 in-file line offset** (MASTER.md P0.1 at :63 vs cited :57). Two line-number corrections propagated from revision agents: `planner.ts:21` (not :27) for the cut-centered quote; `MASTER.md:85` (not :86) for the `restore()` finding.
> **Baseline:** nle-engine at commit `8754533` (2026-09-01) — 37,958 LOC / 30 files / 124 tests / 19 milestones / 13 decisions / master gap charter (P0.1-P0.8, waves 4A→7, decisions D1-D5).

---

## 1. What Round 7 was for

Six prior rounds produced a verified, internally consistent spec set grounded in two public teacher repos (FreeCut, OpenCut-classic). Round 7 integrated four net-new inputs:

1. **nle-engine** (private, active) — a clean-room FreeCut port that de-risks the engine side but inherits FreeCut patterns the spec corrects. Cross-pollination between the two workstreams was real but shallow (an early spec snapshot handed over mid-build), so the engine is NOT spec-conformant: the spec is canon, and the value is in the documented delta.
2. **timeline-distill** (forthcoming) — OpenCut-classic's timeline minus the NLE core, the UI-region counterpart to nle-engine.
3. **The DaVinci mockup** (`ui-mock/davinci_resolve_ui_mock.html`, committed by the user post-Round-6) — the visual reference for the long-under-specified UI shell.
4. **The engine's own 7-track deep audit** (gaps/audit/MASTER.md, 2026-09-01) — including five blocking decisions (D1-D5) that the spec set turns out to already answer.

## 2. New artifacts

| Artifact | What it is |
|---|---|
| `18-ui-shell.md` (new, ~320 lines) | The application shell: DaVinci-derived layout from the mockup, deliberately simplified (menu bar removed, inspector 6→4 tabs, 7-page dock→3 pages: Edit/Color/Deliver); full panel inventory; a normative gesture→`EngineCommand` interaction-contract table; state-binding rules (zero engine state in the shell, UI-store/UI-extension split per spec 16 §0.2); a 13-row Chrome Removal Ledger with rationale; theming tokens from the mock; `data-testid` conventions; a11y floor; a ~60-test Tier 3 suite per spec 17's template |
| `19-code-references.md` (new, ~340 lines) | The canon hierarchy (5 tiers) + workstream history; the reference-repo map (engine state table with verified citations; timeline-distill recommended shape); the link-vs-inline policy (link + distilled callout, three mandatory-inline cases); the **25-row insight-preservation ledger** (the "never drop a hard-won insight" enforcement mechanism); the **6-row corrective mapping** (inherited FreeCut patterns → spec mandates); **answers to the engine's D1-D5 blocking decisions**; the **16-subsystem refactor-vs-rebuild ROI table**; the engine watch list for the seal round; 5 implementer usage rules |
| `15-wire-protocol.md` (amended) | The Export category (§4.3.74-76: `exportFCPXML`/`exportMaster`/`exportFrame`) + `renameProject`/`deleteProject` (§4.3.77-78) — 73→**78 types**, 16 categories; §14.11 resolves the output-command design question (sanctioned OUTPUT exception, artifacts ride `CommandResult.data`); `CommandResultData` type; new error codes; §8.10 export-over-the-wire; 2 new `EngineEvent`s; Zod schemas; §13.11-13.14; dispatcher cases; §13.5/§13.6 un-TBD'd; successor list gains 18/19; `window.editor`→`window.__engine` |
| Per-spec "Code References — nle-engine (reference, NOT canon)" tables | Inserted in ALL stream specs: 01 §13A, 02 §13B, 03 §13E, 04 §13D, 05 §16.4, 06 §10.4 (the 102-method op-coverage table — ~20 ALIGNED families), 07 §12.A.1, 08 §15A, 09 §10.3, 10 §12.8, 11 §14R, 12 §13.7, 15 §13.14, 16 §17, 17 §18.5, 18 §13 |
| Spec 07 amendments | §5.5 occlusion cutoff (adopted from FreeCut via engine scene-assembly.ts:1243) + §6.1A transition model corrected (two-tier structural/presentation, cut-centered planner, hidden handles, alignment, binary-search max duration) — the engine's planner/handle math is now spec canon, superseding the seed's overlap-region model |

## 3. Audit findings and resolutions (per auditor)

### AUDIT-R7-A (specs 01, 02, 03) — all resolved by REVISE-R7-A
- Spec 01: six stale "Sub-agent scout task:" markers → verified forms; ProjectManager method names reconciled to spec 15's surface (createNewProject/loadProject/saveCurrentProject/closeProject + loadFromJSON/serialize/updateSettings — closing the unfulfilled "deferred update" promise); **MediaManager §3.3 amendment** adds the four greenfield I/O helpers (probe/persistBlob/generateThumbnail/extractFrame) — closes spec 15 §5.4/§14.2's deferred-update loop; PlaybackManager subscription split (subscribe/onUpdate/onSeek per §14.7); RendererManager §14.10 surface; ExportManager made the single exportFCPXML home (ProjectManager copy removed — resolving the 01/10/16 three-way divergence); `useEditor` §10.4 dangling ref → spec 18.
- Spec 02: the mediabunny `pixelFormat` TODO/CAVEAT resolved in place (2026-09-02 resolution note citing spec 03 §5.2/§14.D); "19 formats"→"23 (19 YUV + 4 packed RGB)"; zero-workers counter-example note after §3.
- Spec 03: **§10 "Frame Rendering Loop" was `(unchanged from seed spec §10)` — the weakest section in the set — now a real refined section** (5-stage loop, engine's player.ts:1038 skip as the documented counter-example); clock + video-sync reference notes; engine code-refs (14 rows, strongest ALIGNED pair in the repo).

### AUDIT-R7-B (specs 04, 05, 06) — all resolved by REVISE-R7-B
- Spec 04: stale scout warning → verified (§11.8 Q8); `wysiwg`→`wysiwyg` test name; §10 vs §16.6 memory-budget duplication resolved (§16.6 canonical, ~340MB); canvas feature-detect aligned to §11.9's try-configure; **normative pass-discipline rule** added to §7.1 (the engine's two live P0 bugs are the documented counter-examples); 12-row code-refs table (8-bit totality: 29 rgba8unorm sites/7 files, independently counted).
- Spec 05: SceneManager→ScenesManager + `engine.command.apply` in goal 5 and all seven remaining `engine.timeline.*` call sites converted to command form (coordinator follow-up); "map 1:1" overstatement fixed; timeline-distill mentions (3 spots + §16 TD legend entry); 160px track-headers canonized (OpenCut's 112px noted as teacher value); 10-row code-refs table (no-React-timeline absence map).
- Spec 06: `440hz-tone-10s.wav`→`10s-440hz-sine.wav` (×2 — TEST-INTEGRATION Issue #2 closed); `multi-track.json`/`all-ops.json` registered in spec 17 §5.3 + false blend-test attribution fixed (Issue #3 closed); `window.editor`→`window.__engine`; the **op-coverage table** (24 rows, all 24 citations verified — ~20 op families ALIGNED).

### AUDIT-R7-C (specs 07, 08, 10) — all resolved by REVISE-R7-C + coordinator
- Meta-finding: the "~25 WIP markers in spec 07" was a grep artifact — case-insensitive "wip" matches "wipe" 24 times; actual graffiti count: zero. The real work was structural.
- Spec 07: Layer `mask`→`masks[]` (§4/§5.4/§14 ripple); duplicate §12 heading → §12.A; EOF §13.11 duplicate merged into the corrections catalog; `## Testing`→`## 17. Testing`; **Amendments A/B** (occlusion cutoff + cut-centered transition model — see §2 above); 17-row code-refs table.
- Spec 08: LUT parser test type fixed (Float32Array(33³×3) → Uint16Array(33³×4) rgba16uint per §7.2 — an internal contradiction); `resetEffects` re-attributed to spec 16 (UI-layer composite, not spec 15 §4.3.52-56); fixture registrations; Color-page scope note; 12-row code-refs table; 2 more `wysiwg` test-name typos fixed (coordinator sweep).
- Spec 10: **the MAJOR Issue #1 un-gating** (5 edits — gate note → Round-7 update, T3.2 runs as written, function-path mapping preserved); `/download/nle-spec/` paths updated; `## Testing`→`## 16. Testing`; Deliver-page cross-refs; the zero-surface FCPXML verification (grep: 0 matches) + 10-row field-presence table.

### AUDIT-R7-D (specs 09, 11, 12) — all resolved by REVISE-R7-D
- Spec 09: `version`→`schemaVersion` ×4 (internal contradiction with §3.1/§5.1); **NEW Issue-#1-class finding: `renameProject`/`deleteProject` referenced as spec 15 commands without existing — resolved by the coordinator's §4.3.77-78 amendment**; storage-layer parse ordering fixed (migrate-then-parse, not parse-in-OPFS); 5 namespaced fixtures registered; 12-row code-refs table (the persistence-gap register).
- Spec 11: mono→multi-channel `renderAudio` (the §15.I placeholder retired; interface + impl + Tier-2 wording reconciled by coordinator follow-up); §15.J VRAM table merged into §5.2; Xvfb-CI fallback note (engine-validated); 9-row code-refs table (cloud render SPEC-ONLY, Xvfb ALIGNED).
- Spec 12: stale seed-status header → refined status; `/download/nle-spec/` paths updated; SwiftShader/lavapipe naming reconciled (test names `software-vulkan-*`; two-flavors note); 4 wrong internal refs fixed; seed-era fixture names renamed to canonical; 12-row code-refs table.

### AUDIT-R7-E (specs 15, 16, 17) — resolved by coordinator (15/16) + REVISE-R7-E (17)
- Spec 15: the full amendment (§2 above); five stale TBD markers cleared (line 7, §13.5, §13.6, §16 items 4-5); §13.7 extended with exportMaster content; `window.editor`→`window.__engine` (3 spots); successor-specs list gains 18/19.
- Spec 16: F1-F10 export edits (bindings now canonical `format: 'fcpxml-1.10'` default — fixing the 1.10/1.11 inconsistency with spec 10's DTD pin); C1 count drift (60→78, two spots); C2 local-union drift fixed (setLoop start/end, tool enum 9 values, selectElements elements/mode, trim delta, slip single-element, delete/duplicate/paste param renames — all aligned to spec 15 canon); C3 migration-window note (§8.3's illustrative `execute()` bodies flagged for seal-round textual migration); C4 `single-clip.json` fixture registered + recipe updated; C6 dangling §13.7 refs resolved via new §13.11; §17 code-refs table (keyboard layer SPEC-ONLY).
- Spec 17: four stale `§X` placeholders → real anchors (12 per-spec Testing locations independently re-verified); **14 fixture registrations** (8 §5.3 rows + 5 namespaced 09-fixtures + 1 §5.5 LUT row; + green-screen.json added by coordinator = 15 total); process-specs exemption note; spec 18/19 integration points (Tier 3 coverage, matrix row, §14.2 row); §18.5 code-refs table.

## 4. Known issues going into the seal round

1. Spec 16 §8.3's older resolver bodies still use the `execute({command})` class-API form in places (normatively superseded by the §0.2 Round-7 note; textual migration deferred).
2. Spec 07 §12.7's Test-Plan item 7 still quotes the seed's `rgb(127,127,0)` (the §13.11 correction documents the right value; the plan item is a historical quote).
3. Spec 18 §15's five open questions (source preview, context-menu enumeration, Color-page arrangement, deferral list confirmation, touch).
4. Spec 19 §12's seal-round checklist (engine watch list re-baseline, timeline-distill wiring, text-stack spec coverage, 22-decision reconciliation sign-off, citation re-sweep).
5. Engine-side items (not spec defects): the engine's D1 wire-shape and D5 storage decisions now have spec answers (spec 19 §7) that its workstream should consume; its test-count and effects-count documentation drift (124 vs 128; 43 vs 44) is its own meta-test material.

## 5. Verdict

✅ **Round 7 complete.** All TEST-INTEGRATION-REVIEW issues resolved (including the MAJOR), one new same-class gap found and closed, all five auditors' findings applied (audit → revision → coordinator follow-ups), both new specs authored, the amendment landed, and every new engine citation machine-verified. The set is ready for the seal round once the engine's active waves land (spec 19 §12).

**Addendum (post-integration-review):** the Round-7 final gate (INTEGRATION-REVIEW-R7.md) returned HOLD PUSH (1 BLOCKING Transition-contract break, 4 MAJOR); the coordinator applied all fixes via scripted passes (TransitionSpec/TransitionJSON propagation, 78-member union, §3 + §8.3 resolver C2 re-alignment incl. families the review under-counted, Appendix A export rows, I/O-points-as-setLoop-halves note, fixture registrations, anchor fixes, README count) — post-fix battery green, resolution addendum in the review file, push cleared.

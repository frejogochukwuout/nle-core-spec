# R23 fleet audit — `01-core-engine.md` (the nle-engine runtime-core spec)

**Agent:** R23-fleet-01 (fresh context). **File owned:** `01-core-engine.md`. **Date:** 2026-09-07.
**Repos audited against (all read at their synced HEADs, no fetch/clone):** nle-engine `b8c6f88`, nle-test-app `70e99f0` (consumes engine `4ef0147` + nle-ui `85dcf57`), engine vendor submodules OT `a4e971d` + WDC `f446512`. Test counts trusted per the round's live-verified numbers (440/440, 117/117); FEATURES verified by reading code/git log.

---

## VERIFIED-STRONG (claims that checked out against the live repos)

- **Engine HEAD & architecture contract:** `b8c6f88` = "fix(RR1-A review round): the fade-clamp SPAN law aligned to the native twins (P2) + 5 P3s" — confirmed via `git log`. The A5/D9 API freeze + layer fence live (`tests/vitest/engine/api-surface.frozen.ts`, `api-surface.test.ts`, `scripts/lint-layering.mjs`; DECISIONS.md D9).
- **The frozen surface count moved 453 → 455, both additions D9-legal:** `git diff f68ab8c..HEAD` on the frozen list shows exactly two added names — `clampAuthorFadeToSpan` (the RR1-A fade-clamp SPAN law) and `foldVolumeKeyframesToAutomation` (the N2b native fold). Commit d8cc5a4 independently states "surface 455".
- **N1-N4 + W1 seams all live in `src/lib/nle/bridge/`:** composition-frame.ts (N1), scene-mixer/segment-strip-adapter volume/mute folds (N2), transition-inputs.ts (N3, cut-centered windows), av-link.ts (N4); W1 meter push @ `6a232b7` (+ W1n severed-window pin @ `9e4519b`).
- **N2b LANDED @ `37cdd28` (the S2 seam round) — flipped from GAP to BASE this audit:** flattener folds `animations["volume"]` → gainAutomation breakpoints (lane replaces the clip static, merge-blocking both directions); the adapter's dedicated automation gain node (exp-ramp exact for linear-in-dB, mid-entry/rate/hold, disposal at 3 sites); the native core path (`foldVolumeKeyframesToAutomation` + `ScheduleClipOptions.gainAutomation`, R1-B2). **18 bridge pins + 2 REAL offline-render sample-level parity pins**; design doc `gaps/audit/design-n2b-gain-automation.md` **v2** (v1 REJECTED by the audit agent — 3 P0s folded). Verified via `.agents/PLAN.md` §N2 closure, `.agents/HANDOFF.md`, and the commit chain (`f5c70fe` → `3c11ac8` → `37cdd28` → wrap `b7fc5c2`).
- **RR1-A verified:** d421446 (`clampAuthorFadeToSpan` at the flattener twin — mkSegment both-fades clamp, merged-run tail carry, transition-window restore) + the review round b8c6f88 (SPAN law aligned to the native twins + 5 P3s). Companion bridge-A fixes: A1 merged-run tail-fade carry (7c73d2b), A2 out-of-domain retime legacy fallback (b7c7c2e).
- **W2 on the engine bridge verified:** 0d61964 (maintainPitch varispeed: 3-site schedule law, byte-capped recency-LRU span cache, 10 pins W2a-j) — consumes WDC's typed LGPL WSOLA port; engine WDC vendor pin chain 5570321 → 1b40fd4 → … → `f446512` (W2 + the whole-CR drift-gate-that-FAILS-on-drift included: de09c93 = CR round B, f446512 = docs-only wrap after it).
- **Vendor pins at HEAD:** `git submodule status` → OT `a4e971d`, WDC `f446512` (the spec's old `3420b5f`/`5570321` were two and four re-pins stale).
- **Consumer-compat toSorted fix** `798104e` verified (planner windows sort — consumer lib-target TS2550 class).
- **The S3 engine seam-audit wave** `eda6e2f` verified (2 P1 + 4 P2 + 6 P3, 23 tests).
- **The K2 seeds verified as files:** `tests/vitest/engine/{timeline-edit-ops,video-sync,bridge-seams,planner}.test.ts` all present at HEAD.
- **App consumption proof verified:** app HEAD `70e99f0` (RR1-B); `src/ProgramCanvas.tsx` + EngineMount exist; W3 JKL @ `3f351bc` (both rate-change entry paths reschedule, one idempotence key); N2b app glue (scheduleAll + segmentSignature, 2 pins @ c8c875e). App consumes engine @ `4ef0147` (one commit behind engine HEAD — the consumer re-pin wave is the live queue item, matching the plan's S-engine row).
- **§13A still-true corrective rows re-checked at HEAD:** rgba8unorm still everywhere in the GPU path (10-bit remains a spec win); the headless JSON-RPC is still the 19-case op family (union façade still a gap); zero `new Worker` in engine src (the "zero Web Workers" inheritance claim stands — AudioWorklets only).
- **D25 check:** this file makes NO "React view tree lives app-side"-class claims (grepped: timeline-port / components/timeline / view tree / fork — zero hits) — no D25 edits required. The engine's OT vendoring stays core-only via alias; the file never claimed otherwise.

## FIXED (edits applied to `01-core-engine.md`)

1. **Status line:** R22 → R23 re-audit framing; engine pin/count `f68ab8c` 356/356 → `b8c6f88` 440/440; "453-name API freeze" → "frozen API surface (455, +2 additive)"; forward list re-keyed to the D24 vocabulary; the R22 lineage kept as an explicit supersession record (N2b noted as the landed member).
2. **§0 BASE engine row:** re-pinned `b8c6f88` 440/440 + vendor pins OT `a4e971d` / WDC `f446512`; the freeze re-counted 455 (with the two named additions); added the R23-window features — **N2b LANDED** (full seam description + pins + design-doc v2), **RR1-A fade-clamp SPAN law** + A1/A2 companions, **W2 varispeed on the bridge**, the S3 engine wave, the toSorted consumer-compat fix, and the K2 seed suites (timeline-edit-ops et al.).
3. **§0 BASE app row:** `e662759` 83/83 → `70e99f0` 117/117; added W3 JKL + RR1-B + the N2b app-side glue; stated the app's consumer pins (engine `4ef0147`, nle-ui `85dcf57`) and the one-commit lag (the consumer re-pin wave).
4. **§0 GAP register:** header re-pointed from "per spec 14" → the D24 ladder per `IMPLEMENTATION-PLAN.md`; **N2b row flipped out of GAP into BASE** (per the charge); phase tags re-based with both forms: parity corpus `S-engine, crawl (was ∥ crawl)`, union façade `r1 (was W-ops)`, N5 `r4 (was W-n5)`, color instruments `S-engine ∥ crawl, consumed at r3 (was … W-color)`, P2 remainder `r6 (was R-engine-p2)`.
5. **§0 GAP rows ADDED (posture law — retired spec-14 §4.2 rows re-homed):** the **color instruments** row (scopes/qualifier/power-window — S-engine authors ∥ crawl, consumed r3; was missing from this file's register; found only in the retired spec-14 §4.2, a posture violation now fixed) and **K2's engine-side combined pairs** (OT-ops→engine-decode round-trips at the app's seam shapes — new at R23/D24, from the plan's S-engine row).
6. **§0 ACCEPTANCE & TEST PLAN:** "the R22 battery's posture checks" → "the battery's posture checks (battery_r23)".
7. **§13A header:** live repo description updated (54,739 src/lib LOC, 440 vitest + 9 CI-wired probes @ `b8c6f88`); the scout-era 37,958/124/single-tier snapshot kept as the explicit point-in-time record; "zero Web Workers" re-verified and kept.
8. **§13A undo row:** ENGINE-GAP → SUPERSEDED (scout-era "zero callers, P1.5" is dead — P1.14 closed 2026-09-04: 59 ops wrapped via `execute()`, undo-by-default, probe-p114 318 checks CI-wired, 61 `execute(` call sites at HEAD).
9. **§13A render-loop row:** supersession note added (the visual loop now admits video + image per Wave 4C P1.3; text via the text layer, audio via the audio path — the all-types WYSIWYG demand stands).
10. **§0 heading:** posture-law label clarified ("the R22 posture law, D20 … re-baselined at R23 per the D24 ladder").

## REMAINS-OPEN (gaps verified still-open at HEAD — no repo landed them)

- **The projector parity corpus** (N1 family's formal S4 suite) — no S4 parity suite in the repo; the engine HANDOFF/PLAN and the plan's S-engine row both still queue it.
- **The union façade** (78-union slice; JSON-RPC re-typed internal) — headless `api.ts` still the 19-op dispatch; dispatch-complete + typed NOT_IMPLEMENTED not started.
- **N5 real media decode** — engine PLAN P1.9 DEPRIORITIZED (user directive 2026-09-02); r4 user-gated per D6.
- **The color instruments** — no scopes/vectorscope code anywhere in `src/`; the effects pipeline's `powerWindow`/`secondaryQualifier` GPU-effect params (present since ≤ R22) are the seed, not the instruments.
- **ShapeItem/Lottie/Subtitle/Controller + CPU transition renderers** — unchanged (r6 tail).
- **K2's engine-side pairs** — the round-trip pairs at the app's seam shapes are not authored (the seeds exist: timeline-edit-ops/video-sync).

## NOTES

- **Count discipline:** every count written is from the verified set — 440/440 (engine), 117/117 (app), 455 (frozen surface names, repo-verified), 453 (freeze-open count, DECISIONS.md D9), 61/59 (execute sites / P1.14 wrapped ops, repo-verified), 23 (S3 wave tests, commit-verified), 18+2 / 10 (N2b / W2 pins, repo-verified).
- **Internal spec tension observed (NOT fixed — out of audit scope):** the `## Testing` property test `manager-initialization-is-acyclic` still mandates `madge` in CI "per §3.7", while §14.16's SCOUT-01 correction says drop the madge reference (FreeCut doesn't use it). A future editorial pass should pick one.
- **The union-façade GAP row's "where it lands"** differs between the retired spec-14 §4.2 ("engine, additive") and this file's old row ("W-ops (OT)"). The re-based row states both halves (engine-additive, OT's op families graduate in-phase at r1) to keep the §4.2 row resolvable.
- **The app's engine pin (4ef0147) trails engine HEAD (b8c6f88) by exactly one commit** — the "14+ commits behind" figure in the engine's own HANDOFF is pre-re-pin-era; the consumer re-pin wave is now a one-commit bump (still the plan's S-engine first action).
- **Line-number drift** in the §13A table (scout-era `file:line` quotes) is inherent to a point-in-time reference and was left as-is except the two rows whose *behavioral* claims the repo has since moved (undo; render loop) — those carry supersession notes.
- **No D25/R25-bridge edits were needed** — this file never claimed the React view tree lives app-side (that claim class lived in spec 05's territory).

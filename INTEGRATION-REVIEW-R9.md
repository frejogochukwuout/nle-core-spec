# INTEGRATION-REVIEW-R9 — Round 9 Integration Review (three-domain strategy round)

**Date:** 2026-09-02 · **Reviewer:** main agent · **Verdict: PASS** (0 BLOCKING / 0 MAJOR / 5 MINOR — 5 fixed in-session, 2 were tooling false-positives)
**Scope:** the Round-9 deliverable set — ARCH-R9 ruling, Decisions 12/13/14 + §2.5 governance (00-master v5.0), spec 20 (new), spec 14 §2.1 rewrite, Decision-12 landing in 05/06/15/19/17/03, the .refined.md single-file canon collapse, README v-R9, battery_r9.

---

## 1. Checks performed (12)

| # | Check | Method | Result |
|---|---|---|---|
| 1 | **Battery R9 (48 checks)** — inherited R7/R8 core (union=78, elementAId, FCPXML, resolver, timeline-distill, table integrity) + R9 governance (single-file canon, zero live `.refined` refs, D12/13/14 anchors, projector-not-adapter, spec-20 anchors, stale-count purge) | `scripts/battery_r9.py` | **0 failures** (after 2 tooling false-positives fixed: backward-window exemption, canon-note self-reference) |
| 2 | **Cross-referencing integrity** — spec 20 referenced bidirectionally from 00/README/19/17/03/14/15 | grep both directions | PASS (9 refs in 19; ≥1 each in 17/14/15; 00 §8 + README table) |
| 3 | **Decision consistency** — D12/D13/D14 statements in 00 §2 vs ARCH-R9 §2-4 vs 19 §2.4 vs spec 14 §2.1 | side-by-side read | PASS — the five seam clauses, postures table, and retirement gates match clause-for-clause |
| 4 | **Projector naming + semantics** — `scene-projector.ts` (one-way, idempotent, no-readback) replaces `scene-adapter.ts` everywhere normative | battery check + grep | PASS — adapter survives only in retired/R8-context (14 P1 deliverable rewritten; 00 D11 carries R9 markers) |
| 5 | **C9 (audio-mix transitional)** — consistent story in 19 §6 C9 row, spec 20 §6.5, spec 14 §2.1, spec 03 §9 note | grep + read | PASS — retire-at-gate + fallback discipline stated identically |
| 6 | **Retirement-gate numbers** — AudioMixer 2,426 LOC; ≥60 dB null; 737/737; 297/297; 202/202 | regex extraction across 00/14/19/20/README | PASS — one consistent number set |
| 7 | **web-daw-core citation validity** — the 4 bridge files + test suites + SKILL/track-model/UPSTREAMING referenced in spec 20 §11 exist at `bc68ee0` | filesystem check on the local clone | PASS (4/4 bridge files; both suites; all docs) |
| 8 | **StructuralAudioSource field count** — spec 19 §3.3A claimed "11 fields" | read the interface at `scene-to-segments.ts:26` | **MINOR-1: actual = 9 fields** → FIXED (19 corrected; spec 20's §4.1 table already listed 9 rows — no other site claimed 11) |
| 9 | **Stale engine counts** — 41k/38k LOC, 144 tests in live docs | grep + context | **MINOR-2: 00-master Decision-10 body carried R7-era "~41k LOC, 144 tests reported"** → FIXED (re-typed to the three-domain form with 47k/202; the R8-era README rows fixed in the README milestone) |
| 10 | **OT/engine re-baseline claims** — 297/297 "FINAL", 202/202, Waves 4D-B→5C, SEAMS.md, D2 mediabunny, D7 codec ladder, M31 follow-scroll all match the repos' own HANDOFF/DECISIONS at the pulled heads | read `.agents/HANDOFF.md`/`DECISIONS.md`/`SEAMS.md` in both clones | PASS (every claim sourced from the repo docs; effects-count drift (43 vs 44) deliberately preserved as an open watch item) |
| 11 | **Audio-seam structural soundness** — the claim "nothing bidirectional exists to maintain" vs web-daw-core's actual bridge code | read `scene-to-segments.ts` header + `track-model.md` §1 | PASS — S-layer input is a flat 9-field array (type-only opencut imports); G keyed by trackId; no return path into SceneTracks in any bridge file |
| 12 | **Inline-code rule feasibility** — 00 §2.5.2's (a)/(b)/(c)/(d) classes apply to the existing corpus without absurd results | stratified sample of 15 blocks in spec 05 (new §16.6) | PASS — sample classifies cleanly: 2×(a), 13×(b); 0×(d); full audit scheduled as a seal-round item with a falsifiable expectation (01/06 likelier (d) carriers) |

## 2. The 5 MINOR findings and their fixes

1. **"11 fields" → 9** (19 §3.3A) — fixed in-session; the spec 20 §4.1 table was already correct.
2. **Decision-10 stale counts** (00-master) — fixed in-session (re-typed to Decision-14 language; counts refreshed).
3. **spec 14 P1 deliverable 2 still described the retired bidirectional adapter** (found by battery) — rewritten as the projector deliverable with the no-persistence-duty note.
4. **spec 14 P1 deliverable 3 described UI as greenfield** ("minimal", "no filmstrip yet") despite OT's landed components — rewritten as wiring-the-inherited-`TimelineView`.
5. **README carried the R8 snapshot** (136/136, 11,375 LOC, "components pending", Decision-11-only phrasing) — full R9 rewrite in the README milestone (three-domain rows, spec 20, decisions 10-14, reading order, single-file canon note).

Plus 2 tooling false-positives (battery window logic) — fixed in the script, not the specs.

## 3. Residual observations (non-blocking, tracked)

- **The user's "which file do future sessions read" question is now closed operationally**: battery check 2/63 enforces the single-file canon; the README reading order is explicit; the 6 historical round records intentionally keep point-in-time paths.
- **spec 05 §16.6 documents the inline-rule audit's expected outcome** — the seal round's full classification has a falsifiable prediction attached (few-to-zero class (d) in 05; 01/06 likelier), which keeps the audit honest.
- **ARCH-R9 §7 (7 watch items) ↔ 19 §12 item 10 cross-reference verified** — the seal-round scope is fully derivable from the spec set alone (HANDOFF will carry it into the next session's entry point).
- The engine's **effects-count drift (43 vs 44)** remains a live watch item (19 §9.3) — it is a repo-side documentation bug, not a spec bug; "tell the engine" is the standing action.

## 4. Gate status

- Mechanical battery: **48/48 green** (`scripts/battery_r9.py`).
- Cross-references: bidirectional spec-20 wiring verified.
- Canon count: 21 specs (00-20) + ARCH-R9 + README; single-file canon enforced.
- Round-9 milestone chain pushed: `3a7c093` (ruling) → `0141d59` (rename) → `54d140d` (D12/13/14 + spec 20) → `9ae6c35` (spec 14) → `a3a6b9b` (05/06/15) → `8db31ad` (19/17/03) → `001da6d`/`060a7e0` (battery fixes) → this review.

**Verdict: PASS — the Round-9 deliverable set is internally consistent and seal-ready pending the ARCH-R9 §7 watch items (which are, by design, repo-side events to verify at seal).**

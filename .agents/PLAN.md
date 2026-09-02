# PLAN — Long-Horizon Task Tracker (nle-core-spec)

**Created:** 2026-09-02 (Round 8 wrap-up — user directive: push/backup every micro milestone; PLAN tracks the long horizon, HANDOFF tracks the next session only)
**Current round:** 8 COMPLETE (pushed @ `f1a261c`)
**Canon:** this repo, `main` — https://github.com/frejogochukwuout/nle-core-spec

---

## Round history (completed)

| Round | What landed | Tip commit |
|---|---|---|
| 1-6 | Seed → scout-refined (12 streams) → audited (19 audit docs) → integrated (TEST-INTEGRATION-REVIEW) → testability layer (15/16/17) | through `356f135` |
| 7 | Full audit-and-refinement pass: spec 18 (UI shell), spec 19 (code-references), export-command amendment (union 73→78), TransitionSpec 2-layer, INTEGRATION-REVIEW-R7 gate (1 BLOCKING + 4 MAJOR fixed), resolver drift battery | `82ca2c1` |
| 8 | Three-repo integration: opencut-timeline landed (Decision 11 seam; specs 05 §14.5A/§16.5, 06 §5.2A/§10.5, 15 §7.1A/§13.15, 19 v2.0); engine Waves 4A-4D re-baseline (D1 escalation → C8; specs 06 §10.4, 09 §10.3); cloudcut UX-spec integrated ours-wins (spec 18 v1.1: context menus, state rows, a11y floor, error UX, visual language, pointer grammar; 00-master §6A NFRs); testability facet matrix (spec 17 v1.1 §13A); INTEGRATION-REVIEW-R8 PASS | `f1a261c` |

---

## The next round: SEAL (spec 19 §12 is the authoritative checklist)

Nine items, in priority order:

1. **Engine C8 + C2 convergence verification** (highest priority) — the engine's persistence adapter (spec-09-shaped serializer over `serializeTimeline`/`hydrateTimeline`) + its command-layer adapter (JSON-RPC → spec 15 union). Verify when its waves 4D-B+ land. Hold the spec line on D1 (the v2 shape is an internal intermediate, NOT canon).
2. **opencut-timeline C7 rename + W5/W6** — its 18 prefixed headless types renamed to the bare spec-15 union; the 60 absent commands grown. Update spec 15 §13.15 + spec 19 §3.2 when landed.
3. **opencut-timeline W4 (React components)** — upgrades spec 05 §4 (component hierarchy) + spec 18 §4.7 from "greenfield with OC as shape-teacher" to live component references.
4. **D3 text-stack decision** (before engine 4D-B starts) — absorb its A2 glyph-atlas plan as a spec section vs keep engine-led. Phase A landed clean, which strengthens the absorb option.
5. **Full decision reconciliation** — 13 engine + 10 opencut-timeline + 11 spec decisions each get a "no spec conflict" sign-off line (D1-D5 engine answered; D1 escalated; C7 and OT-D1/D2 covered).
6. **Final citation sweep** — every per-spec code-ref table re-verified against the reference clones (engine line numbers moved this round; they will move again).
7. **Source-preview question** (spec 18 §15.1) — v1.1's fallback `<video>` mode is the interim; decide if a command-surfaced source monitor is v2.
8. **cloudcut ux-spec maintenance** — if the branch evolves, re-run the applicability matrix deltas against SCOUT-R8-C's baseline.
9. **Seal verdicts** — final judgment on both reference repos' conformance state; regenerate audit totals; declare the spec set sealed (or open Round 10).

## After the seal: implementation (spec 14 is the plan)

- **P0** playback spike (1-2 wks) → **P1** multi-track + UI shell + **the seam adapter (mandatory, blocks exit)** (2-3 wks) → **P2** NLE ops (3-4 wks, split across both repos per Decision 11.3) → **P3** composition/transitions (2-3 wks) → **P4** color grading (3-4 wks) → **P5** FCPXML export (1-2 wks, can start early) → **P6** cloud render (optional)
- Total: 14-21 weeks single-dev / ~2-3 months with 2-3 devs
- Every phase's tests: spec 17 §3.1 matrix + §13A facet matrix govern coverage; per-module `## Testing` sections are the contract

## Standing rules (every round)

- Push at every micro milestone (never lose work to infra failure)
- `git fetch` before push (user works in parallel)
- Mechanical battery after every fix round (scripts/battery_r8.py — recalibrate stale checks)
- A facet with no coverage-matrix row is a spec bug (spec 17 §14.4 step 0)
- Reference repos converge toward the spec, never the reverse (Decisions 10/11)

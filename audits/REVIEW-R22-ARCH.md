# REVIEW-R22-ARCH — Adversarial Review Round 1 (Architecture)

**Reviewed:** `audits/ARCH-R22-finality.md` v1 (the five rulings), 2026-09-07.
**Reviewer:** sub-agent (opus-class, fresh context), charter: attack the rulings (fold-vs-keep, the crawl vehicle, the estimates, the posture law's exhaustiveness bar), verify the claims against the repos.
**Verdict: GO-WITH-AMENDMENTS** (10 required amendments, 7 registered-but-acceptable risks).

## Verified claims (spot-checks against the repos)
- D23 user-corrected provenance (`nle-ui/.agents/DECISIONS.md`, worklog); the queue protocol operating (`dba8d52`).
- The crawl vehicle real: `nle-test-app/src/App.tsx` composes `AppShell timelineRegion={<EngineMount/>} programMonitor={() => <ProgramCanvas/>}`; nle-ui engine-free (boundary script).
- OT-SEAMS rows 5/6/13 dispositions accurate; the R21 drag-revert note matches.
- Spec 14 R15-era plan + 00 Decision 16 still describe a fifth repo "to be created" — confirmed stale.
- Census corrections: **0 of 20** domain specs have acceptance sections (the doc's "14 of 21" was wrong both ways); the R15 pin families live in **7 files** (not "all 21"); spec 17 baselined to dead COUNTS, not SHAs.

## The 10 required amendments (all folded into ARCH v2)
1. C2's gate cited a fabricated "21-state row set" (spec 18 §4.2 is the 5-row media-pool table) → replaced with the actual §4.3 viewer rows + the mini's testids enumerated at execution.
2. Pin table re-typed: repo-HEAD pins AND consumer pins as separate classes (nle-ui HEAD `dba8d52` / app pin `752991d`; WDC HEAD `fe05d85` / pin `5570321`).
3. §0 census corrections (above).
4. C0/C1 gates self-contained: the package-owned placeholder mock region (no mini-store port); the seed-fixture bridge named as a C1 deliverable + the comparison rubric defined; C1 re-cost 3-5 wk.
5. Row-5 mechanism resolved: the app computes gap-fit over the OT snapshot (OT's headless api exports insert strategies, not placement queries).
6. Law-net ownership de-duplicated: S-app implements the re-expressed net; S-spec owns the inventory.
7. N5 real media decode added to the walk (PENDING the user's re-affirmation of D6).
8. Estimates re-baselined (then again by review 2): crawl arithmetic, C4 itemized.
9. The re-typing's own execution plan staged + estimated (spec 14 first → meta specs → domain-spec waves; battery enablement staged).
10. A3's rationale strengthened via the spec 18 §16.1 embedding-vehicle citation.

## Registered risks (accepted)
Unquantified "weeks ahead" rhetoric; walk estimate optimistic (corrected by review 2); the app rename stales cross-repo `.agents` refs (bounded); timeline.ts LOC drift (folded); the VLM-gate workflow dependency (mini stays alive per the retirement law); OT-SEAMS row 11's selection delta (pre-registered); C0 grammar-mixing risk (placeholder declared minimal).

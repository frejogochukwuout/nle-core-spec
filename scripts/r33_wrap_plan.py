#!/usr/bin/env python3
"""r33_wrap_plan.py — W7: the PLAN round record (the R33 entry) + the
INCOMING-FILING absorption markers."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
p = ".agents/PLAN.md"
text = open(p, encoding="utf-8").read()

# --- 1. mark both INCOMING FILINGs absorbed -----------------------------
a = "## INCOMING FILING — from nle-engine seal-round R28-exec (THE 87-ROW REVISION-NOTES REGISTER + the testing-aspect disposition) [filed 2026-09-19]"
b = ("## INCOMING FILING — from nle-engine seal-round R28-exec (THE 87-ROW REVISION-NOTES "
     "REGISTER + the testing-aspect disposition) [filed 2026-09-19] — **ABSORBED R33 (the intake "
     "fold: 87/87 rows dispositioned — 84 marker-applied + P3-29 discharged-verified + P3-36 "
     "discharged upstream [the engine W0 pull_request fold] + P1-6 unmarked-but-landed; the "
     "testing-aspect counterpart rows P2-1/P2-23/P2-27 DISCHARGE-SHAPED to the landed W0-W4 "
     "waves; the fold commits c818de7 + 5be0101 + cfe183c; battery_r33 214/214)**")
assert text.count(a) == 1
text = text.replace(a, b)

a2 = "## INCOMING FILING — from opencut-timeline seal18 (the Stage-0 landing + the wire-reality revision notes) [filed 2026-09-19]"
b2 = ("## INCOMING FILING — from opencut-timeline seal18 (the Stage-0 landing + the wire-reality "
      "revision notes) [filed 2026-09-19] — **ABSORBED R33 (the wire-reality fold @ 6e557e2: "
      "TRACK_LOCKED 13-not-12 all four live claims + the §13.15 row; F1B-2 four verbs "
      "(validateWireTrim); HA-2-7 member-guard; HA-2-11 value narrowing; the 15:14 census to "
      "the report-json truth; the bookmark/marker EDIT residual registered as the r1 A2/C7 "
      "input; the D43-A3 + D42 drift-fence battery classes ACTIVATED @ battery_r33 R33-I)**")
assert text.count(a2) == 1
text = text.replace(a2, b2)

# --- 2. the R33 round entry (inserted before the R32 entry) -------------
R33 = """**Current round (spec track):** 33 COMPLETE (THE INTAKE FOLD ROUND — both post-R32 sibling filings absorbed + the pin world re-keyed; the user's ask: "check the full spec plan and fully re-orient the current state" → the re-orientation confirmed a full autonomous R33 queue, then executed to the context limit). **LANDED (@ 5eb4bb5 spec, the orchestrator + the 15-agent fleet: the scanner + 7 P2 batches + 8 P3 batches + 3 re-key batches + 2 adversarial reviewers + 1 sample auditor):** (1) **THE 87-ROW ENGINE REGISTER APPLIED 87/87** (the P1 wave c818de7 — 8/8 orchestrator-applied with live premise verification: the R1-B8/R2-5 scrub-pause re-attribution to player.ts:793-804 + the missing pins REGISTERED; the D29.5c twin rows' Z2 flip to LANDED + 04:24's D45-ordered flip EXECUTED; spec 05's §8.10 the AR-2 keyframe-gesture normative family LANDED; the Gaussian-Blur default 4→10 (the live FALSE law killed both sites); the OV-05 one-input-source law block + the F1 END-based pairing fix; 07's K4/K3 GAP rows un-staled; the NFR GAP row FILED + 17 §13A.1's venue-status note [the engine perf.yml nightly recorded, the app-side recipes' venue NOT YET]; the P2 wave 5be0101 — 31/31 via the 7 file-disjoint batches; the P3 wave cfe183c — 46 landed + P3-36/P3-43a discharged upstream + P3-29 discharged-verified; every premise re-verified against the CURRENT trees — the register's R31-vintage evidence re-located by content, the line cites re-anchored at the live pins [P2-14's §10.4 table: all 26 cites exact @ 2a0ecf4]). (2) **THE OT SEAL18 WIRE-REALITY FOLD** @ 6e557e2: TRACK_LOCKED is 13 COMMANDS not 12 (insertBatch's arm gate :1414-1420 + track.remove's self-removal refusal :2729 join the old 12 — the full set enumerated live); F1B-2 is FOUR verbs (timeline.trim joined the wire-side overlap validation — validateWireTrim closes "the lone reshape verb with NO overlap check"); the HA-2-7 member-guard generalization; HA-2-11 upsertKeyframe.value narrowed to number; the 15:14 census to the report-json truth (632 classic incl. the 3-test M58R family + 17 M60 + 11 M61 + 11 M63 + 4 M62 = 675, 77 entries — the seal18-FINAL commit prose's "10 M63" a typo); the bookmark/marker EDIT residual registered (updateBookmarkInArray exists, NO wire verb — the r1 A2/C7 fold's input). (3) **THE PIN RE-KEY** @ 08a6995: rekey_r33.py the row-aware scanner (54 LIVE-stale hits enumerated → ZERO residual) applied via the 3-batch fleet + the code-anchor precision fix (28aa387 the last src-touching commit; 2a0ecf4 the docs-only HEAD); the layered convention held (the R30/R31/R32 layers verbatim beneath). (4) **battery_r33 214/214 ALL GREEN** (the r32 successor: the 9 stale LIVE/B-3/B-6/R32 checks re-keyed; the OT registry scrape to the seal18 shape; the line-pin anchors to the PUBLIC methods [the :6055 impl-cite finding — performOverwriteEdit the public :6039]; **the D43-A3 leaf-edge + the D42 drift-fence classes ACTIVATED** — the pre-r1 REGISTERED-SKIP retires, edit-domains.ts + linkage.ts live-checked; the R33-A..L classes incl. the distinct-id marker census). (5) **THE ADVERSARIAL GATE**: W6b APPROVE-WITH-AMENDMENTS (all amendments folded: the 4 scanner-missed residuals re-keyed [03:16/16:15/17:22/18:15 — the row-new-pin-filter laundering fixed, 1e0c30b/94f6460 join NEW_PINS]; R33-A strengthened to the distinct-id census + the 3 recorded exceptions; the cite nits; the provenance footnote) + W6a APPROVE (the 6-row sample all TRUE at the live trees — "R33 re-verified at the live pins instead of copying the register's evidence, the correct behavior in all three cases where the trees had moved"); re-gated ALL GREEN @ 5eb4bb5. **THE ENVIRONMENT EVENTS:** the GitHub PAT died mid-round (worked for the P1/W2 pushes c818de7/5be0101, 401 after) — the GitLab mirror carried the round (all 6 R33 commits pushed + the /home/sync bundles; GitHub re-push pending a fresh PAT from the user); the app+engine submodules re-initialized in this sandbox (protocol.file.allow — the R30-3/R30-5 battery fails were environmental, not corpus); 5 sub-agents hit context deadlines after finishing their edits (the worklogs reconstructed from the audited worktrees — the R32 lesson's recovery pattern held). **The horizon (the next round):** THE HUMAN ROUNDS THEMSELVES (w1's core — the USER's track, fully staged: the round-1 scripted edit session per PROTOCOL.md + the annotakit loop + the three open decisions) ∥ the spec-side standing residuals (the /view fps-param resolution; the D25.3b structural-gap components [OT's queue]; the per-spec Testing mirrors + 17 §14.2's mapping repair; the app hygiene rows; the OT carrier-reduction program) ∥ the sibling lanes' next filings (the engine's perf.yml item 0 + the first perf disposition; the OT L2/L3/L5/L6 waves) → w2's full-scope demo (extends the K4 suite).

"""
anchor = "**Current round (spec track):** 32 COMPLETE (THE K4-EXIT + W1-ENTRY + D52 ROUND"
i = text.find(anchor)
assert i >= 0
text = text[:i] + R33 + text[i:]
open(p, "w", encoding="utf-8").write(text)
print("PLAN updated: both filings marked ABSORBED + the R33 round entry inserted")

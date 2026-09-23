#!/usr/bin/env python3
"""r33_apply_w6_amendments.py — the W6b adversarial-review amendments.

W6b verdict: APPROVE-WITH-AMENDMENTS. Findings applied here:
  A1. The 4 scanner-missed LIVE-stale residuals: 03:16 (the OT row headline),
      16:15 + 17:22 (the OT layer tails laundered by the row-new-pin filter),
      18:15 (the nle-ui consumer pin 6754979/691 — the pattern missing).
  A2. The scanner tightened: "6754979" joins STALE_PATTERNS.
  A3. R33-A strengthened to a DISTINCT-ID census + the P1-6 unmarked
      application recorded + the comment arithmetic fixed (P3-43a is a
      clause of P3-43, not a row; the unmarked row is P1-6).
  A4. The :1415-1421 -> :1414-1420 cite nit (my W4 text).
  A5. The P3-43b disposition note (the marker covers clause (c) only).
  A6. The build-script provenance footnote (4 post-build amendments).
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

EDITS = []


def E(row, fname, anchor, repl):
    EDITS.append((row, fname, anchor, repl))


# A1a. 03:16 — the OT row headline
E("A1a", "03-playback-engine.md",
  "- opencut-timeline (OT) @ HEAD **`39003d3`** (R32: the code pin MOVED — the D25.3a mini-theme wave: theme.ts mode maps + the TimelineAudioWaveform mode resolution + the Tier-2 residual overrides",
  "- opencut-timeline (OT) @ HEAD **`008e7f3`** (R33 — the seal18 close: the Stage-0 mechanism set [D42 linkage + D43 edit-domains + D44 ERROR_CODES] + the real-defect wave + the M61/M62/M63 families + the M58R flake fix; **675/675 = 632 classic [incl. the 3-test M58R family] + 17 M60 + 11 M61 + 11 M63 + 4 M62, 77 report entries**; the code pin `344123a`; the R32 layer: `39003d3` — the code pin MOVED — the D25.3a mini-theme wave: theme.ts mode maps + the TimelineAudioWaveform mode resolution + the Tier-2 residual overrides")

# A1b. 16:15 — the OT tail
E("A1b", "16-keyboard-shortcuts.md",
  "+ OT HEAD `39003d3` (the code pin MOVED off `970948a` — the D25.3a mini-theme wave, 649/649)**]",
  "+ OT HEAD `39003d3` (the code pin MOVED off `970948a` — the D25.3a mini-theme wave, 649/649) → R33: OT @ `008e7f3` **675/675** (the seal18 close — the census 31 = 28 routed + 3 exceptions UNCHANGED; the code pin `344123a`; re-keyed R33)**]")

# A1c. 17:22 — the OT tail
E("A1c", "17-test-plan.md",
  "+ OT HEAD `39003d3` (the code pin MOVED off `970948a` — the D25.3a mini-theme wave: theme.ts + waveform + Tier-2 + the M60 pins; 649/649 = 632 classic",
  "+ OT HEAD `39003d3` (the code pin MOVED off `970948a` — the D25.3a mini-theme wave: theme.ts + waveform + Tier-2 + the M60 pins; 649/649 = 632 classic → R33: OT @ `008e7f3` 675/675, the seal18 close, the census 31=28+3 UNCHANGED, re-keyed R33")

# A1d. 18:15 — the nle-ui consumer pin
E("A1d", "18-ui-shell.md",
  "consumer pin: the app's `vendor/nle-ui` @ `6754979` — the AW1-2 absorb LANDED, the vendor re-converged at the package HEAD; **691 tests**",
  "consumer pin: the app's `vendor/nle-ui` @ `6754979` — the AW1-2 absorb LANDED, the vendor re-converged at the package HEAD (the R29 record; **R33 re-key: the app's vendor/nle-ui @ `1e0c30b` — the R32 D52 re-pin, UNCHANGED at R33; the package at 743/743 [the C0 MiniShell 701→737 + the D52 twin 737→743]; the 691-era figures above are the R29 layer**) — **691 tests**")

# A4. the :1415-1421 cite nit
E("A4", "15-wire-protocol.md",
  "`timeline.insertBatch`'s gate at api.ts:1415-1421 was missed by the old 12-count",
  "`timeline.insertBatch`'s gate at api.ts:1414-1420 was missed by the old 12-count")

# A5. the P3-43b disposition note
E("A5", "15-wire-protocol.md",
  "(a) The \"30→31 wire command types\" doc-comment fix **already landed** (OT `d9582d5`)",
  "(a) The \"30→31 wire command types\" doc-comment fix **already landed** (OT `d9582d5`) — the clause-(b) ARCH-R28:133 cite fix was DISCHARGED-BY-VENUE (the audits/ record is point-in-time frozen; the live cite is 15:2971)")


def main():
    ok = fail = 0
    for row, fname, anchor, repl in EDITS:
        text = open(fname, encoding="utf-8").read()
        c = text.count(anchor)
        if c != 1:
            print("FAIL  %s  %s  anchor count %d" % (row, fname, c))
            fail += 1
            continue
        open(fname, "w", encoding="utf-8").write(text.replace(anchor, repl))
        print("PASS  %s  %s" % (row, fname))
        ok += 1

    # A2. the scanner pattern
    p = "scripts/rekey_r33.py"
    t = open(p, encoding="utf-8").read()
    old = '    "@ the 39003d3 re-pin",\n]'
    new = '    "@ the 39003d3 re-pin", "6754979",\n]'
    if t.count(old) == 1:
        open(p, "w", encoding="utf-8").write(t.replace(old, new))
        print("PASS  A2   rekey_r33.py +6754979")
        ok += 1
    else:
        print("FAIL  A2   scanner anchor")
        fail += 1

    # A3. R33-A distinct-id census (battery_r33.py)
    p = "scripts/battery_r33.py"
    t = open(p, encoding="utf-8").read()
    old = '''def _r33_markers():
    import glob
    total = 0
    per_file = []
    for f in sorted(glob.glob("*.md")):
        t = open(f, encoding="utf-8").read()
        n = t.count("engine seal-round register P")
        if n:
            per_file.append(f"{f}:{n}")
            total += n
    want_p1 = sum(open(f, encoding="utf-8").read().count("engine seal-round register P1-") for f in glob.glob("*.md"))
    # 87 rows dispositioned: 84 marker-carrying applications + P3-36/P3-43a discharged upstream + P3-29 discharged-verified
    ok = (total >= 84 and want_p1 >= 8)
    return ok, f"markers={total} across {len(per_file)} files; P1 markers={want_p1}; {';'.join(per_file[:8])}"
check("R33-A: the 87-row engine register APPLIED (the marker census: >= 84 marker sites + the 8 P1s; 3 rows discharged [P3-36/P3-43a upstream + P3-29 verified])", _r33_markers, "register fold")'''
    new = '''def _r33_markers():
    import glob, re as _re
    ids = set()
    per_file = []
    for f in sorted(glob.glob("*.md")):
        t = open(f, encoding="utf-8").read()
        found = set(_re.findall(r"engine seal-round register (P[123]-\\d+)", t))
        if found:
            per_file.append(f"{f}:{len(found)}")
            ids |= found
    p1_ids = {i for i in ids if i.startswith("P1-")}
    # The honest census: 87 register rows = the distinct marker-carrying ids + the
    # recorded exceptions — P3-29 discharged-verified, P3-36 discharged upstream
    # (the engine W0 pull_request fold), P3-43 clause (b) discharged-by-venue
    # (clause (a) upstream d9582d5, clause (c) marker-covered), and P1-6 applied
    # WITHOUT a marker (its edit reads "BEGUN @ R31, SEALED @ R32" — verified
    # landed by the W6b audit; recorded here as the exception).
    exceptions = {"P3-29", "P3-36", "P1-6"}
    ok = (len(ids) + len(exceptions) >= 87 and len(p1_ids) >= 7)
    return ok, f"distinct ids={len(ids)} (+{len(exceptions)} recorded exceptions = {len(ids)+len(exceptions)}); P1 ids={sorted(p1_ids)}; {';'.join(per_file[:8])}"
check("R33-A: the 87-row engine register APPLIED (the DISTINCT-ID census: >= 84 marker ids + the 3 recorded exceptions [P3-29 verified / P3-36 upstream / P1-6 unmarked-but-landed] = 87)", _r33_markers, "register fold")'''
    if t.count(old) == 1:
        open(p, "w", encoding="utf-8").write(t.replace(old, new))
        print("PASS  A3   battery_r33 R33-A distinct-id census")
        ok += 1
    else:
        print("FAIL  A3   battery anchor")
        fail += 1

    # A6. the provenance footnote
    p = "scripts/build_battery_r33.py"
    t = open(p, encoding="utf-8").read()
    old = "open(DST, \"w\", encoding=\"utf-8\").write(text)"
    new = ("# PROVENANCE NOTE (R33-W6b): the built battery received 4 post-build amendments\n"
           "# applied directly to battery_r33.py (the :6039 public-method anchor for\n"
           "# performOverwriteEdit; the _lock13 gate-census strengthening [the build's\n"
           "# emit-count read 5 live, would have failed]; the R33-B correction-note leg\n"
           "# [the naive default-4 absence probe false-positived on the honest correction\n"
           "# note itself]; the R33-I 'Stage-0 EXECUTED in OT' wording). This builder\n"
           "# reproduces the PRE-amendment fork; battery_r33.py is the round's record.\n"
           "open(DST, \"w\", encoding=\"utf-8\").write(text)")
    if t.count(old) == 1 and "PROVENANCE NOTE" not in t:
        open(p, "w", encoding="utf-8").write(t.replace(old, new))
        print("PASS  A6   build_battery_r33 provenance footnote")
        ok += 1
    else:
        print("FAIL  A6   builder anchor")
        fail += 1

    print("---\\nAmendments: %d pass / %d fail" % (ok, fail))
    sys.exit(1 if fail else 0)


if __name__ == "__main__":
    main()

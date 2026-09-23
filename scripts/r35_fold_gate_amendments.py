#!/usr/bin/env python3
"""R35 W5b: fold the adversarial gates' amendments (GATE-1 + GATE-2).
P0: the 7 vacuous nested-IIFE checks (flatten + the inner heuristic fixes + the census-42 fossil).
P1: 12/17/18's R35 layers (law #190) + cb04919 in STALE_PATTERNS + the 18:167 residual.
P2: the IP rows + the scanner sets + R35-H strengthening."""
import re

B = "scripts/battery_r35.py"
txt = open(B, encoding="utf-8").read()
n0 = len(txt)

# ---------- P0-1: LINEAGE_CTX gains the round markers ----------
old = '''LINEAGE_CTX = ["superseded", "lineage", "history", "was the", "retired", "re-base",
               "re-based", "re-pin", "re-keyed", "R24", "R22", "R23", "R15", "at R2",
               "(R2", "prior ledger", "old ", "point-in-time", "D-ARCH-6", "at AR-2",
               "historical", "the charter's", "superseded in-file"]'''
new = '''LINEAGE_CTX = ["superseded", "lineage", "history", "was the", "retired", "re-base",
               "re-based", "re-pin", "re-keyed", "R24", "R22", "R23", "R15", "at R2",
               "(R2", "prior ledger", "old ", "point-in-time", "D-ARCH-6", "at AR-2",
               "historical", "the charter's", "superseded in-file",
               # GATE-2 P0 fold: the layered rows cite the round names + the era markers
               "Round 24", "Round 22", "Round 15", "R25", "R26", "R27", "R28", "R29",
               "R30", "R31", "R32", "R33", "R34", "R35", "module card", "Prior ledger"]'''
assert txt.count(old) == 1; txt = txt.replace(old, new, 1)

# ---------- P0-2: the retired-singulars discriminator excludes the live plurals ----------
old = '''    n = 0
    for m in re.finditer(re.escape(word), t):
        ctx = t[max(0, m.start()-260):m.start()+260]
        if any(k in ctx for k in LINEAGE_CTX + ["RETIRED", "never-guard", "absence pin",
                                                 "r1", "GONE", "singular", "rename", "per-key",
                                                 "plural", "mapping"]):
            continue
        n += 1
    return n'''
new = '''    n = 0
    # GATE-2 P0 fold: the SINGULAR must not substring-match the live PLURAL verb
    pat = re.compile(re.escape(word) + r"(?!s)\\b" if not word.endswith("s") else re.escape(word))
    for m in pat.finditer(t):
        ctx = t[max(0, m.start()-260):m.start()+260]
        if any(k in ctx for k in LINEAGE_CTX + ["RETIRED", "never-guard", "absence pin",
                                                 "r1", "GONE", "singular", "rename", "per-key",
                                                 "plural", "mapping"]):
            continue
        n += 1
    return n'''
assert txt.count(old) == 1, "singulars discriminator not found"
txt = txt.replace(old, new, 1)

# ---------- P0-3: flatten the 7 nested-IIFE shapes ----------
# the B-1 group loop
old = '''for grp in [(15,), (6, 5), (12, 17, 19), (0, 3, 9, 13, 16, 18)]:
    check(f"B-1: zero live stale-census reads in {grp} (the 24+6/30-name era is dead)", lambda grp=grp: (
        (lambda bad: (not bad, ",".join(bad) or "clean"))([f"{n}:{_stale_census(CENSUS_SPECS[n])}" for n in grp if _stale_census(CENSUS_SPECS[n])]), "census"))'''
new = '''for grp in [(15,), (6, 5), (12, 17, 19), (0, 3, 9, 13, 16, 18)]:
    def _b1_grp(grp=grp):
        bad = [f"{n}:{_stale_census(CENSUS_SPECS[n])}" for n in grp if _stale_census(CENSUS_SPECS[n])]
        return (not bad), (",".join(bad) or "clean")
    check(f"B-1: zero live stale-census reads in {grp} (the 24+6/30-name era is dead)", _b1_grp, "census")'''
assert txt.count(old) == 1, "B-1 group loop not found"
txt = txt.replace(old, new, 1)

# the M49C check
old = '''check("B-1: the M49C reading is the 28/3 form everywhere (zero live '24/24'; 10's 24024/24000 is boundary-exempt)", lambda: (
    (lambda bad: (not bad, ",".join(str(b) for b in bad) or "clean"))([k for k, t in list(CENSUS_SPECS.items()) + [("plan", plan)]
                                                      if _lineage_free(t, "24/24")]), "M49C"))'''
new = '''def _m49c():
    bad = [k for k, t in list(CENSUS_SPECS.items()) + [("plan", plan)] if _lineage_free(t, "24/24")]
    return (not bad), (",".join(str(b) for b in bad) or "clean")
check("B-1: the M49C reading is the 28/3 form everywhere (zero live '24/24'; 10's 24024/24000 is boundary-exempt)", _m49c, "M49C")'''
assert txt.count(old) == 1, "M49C not found"
txt = txt.replace(old, new, 1)

# the retired singulars
old = '''check("B-1: the retired singulars appear ONLY in lineage/retirement/r1 contexts (Ruling B)", lambda: (
    (lambda bad: (not bad, ",".join(bad) or "clean"))([f"{k}" for k, t in CENSUS_SPECS.items()
                                                      if (_stale_census_text(t, "removeKeyframe") + _stale_census_text(t, "retimeKeyframe"))]), "retirement"))'''
new = '''def _retired_singulars():
    bad = [f"{k}" for k, t in CENSUS_SPECS.items()
           if (_stale_census_text(t, "removeKeyframe") + _stale_census_text(t, "retimeKeyframe"))]
    return (not bad), (",".join(bad) or "clean")
check("B-1: the retired singulars appear ONLY in lineage/retirement/r1 contexts (Ruling B)", _retired_singulars, "retirement")'''
assert txt.count(old) == 1, "retired singulars not found"
txt = txt.replace(old, new, 1)

# the census-42 LIVE fossil (re-key to the R35 census + flatten)
old = '''check("LIVE: the app's census register reads 42 = 36 zero-action (6 byte + 30 mechanical) + 5 carriers + the host @ 55c81c0", lambda: (
    (lambda t: ("42" in t and "36 zero-action" in t and "55c81c0" in t, t[:80]))(read("../nle-test-app/docs/port-census.md")), "app census LIVE"))'''
new = '''def _app_census_live():
    """GATE-2 P0 fold: the R29-era fossil (42 = 36+5+host @ 55c81c0) re-keyed to the R35
    register truth (45 = 33 zero-action + 8 carriers + 4 app-host; the edit-styles pair
    joined the app-host class R35) + the vacuous nested shape flattened."""
    t = read("../nle-test-app/docs/port-census.md")
    return ('"totalPortFiles": 45' in t and '"appHost": 4' in t and "33 zero-action" in t), t[:80]
check("LIVE: the app's census register reads 45 = 33 zero-action + 8 carriers + 4 app-host (the R35 state; the 42/55c81c0 fossil re-keyed)", _app_census_live, "app census LIVE")'''
assert txt.count(old) == 1, "census-42 fossil not found"
txt = txt.replace(old, new, 1)

open(B, "w", encoding="utf-8").write(txt)
print(f"battery P0 folds applied ({len(txt)-n0:+} bytes)")

# ---------- P1: the 12/17/18 R35 layers (law #190) ----------
def layer(path, pairs):
    t = open(path, encoding="utf-8").read()
    ok = 0
    for old, new in pairs:
        if old in t and t.count(old) == 1:
            t = t.replace(old, new, 1); ok += 1
        else:
            print(f"  !! {path}: MISS/{t.count(old)}x — {old[:60]}")
    open(path, "w", encoding="utf-8").write(t)
    print(f"[{path}] {ok}/{len(pairs)}")

# find the 12/17/18 fleet-posture tails: their R34 layers' last segments

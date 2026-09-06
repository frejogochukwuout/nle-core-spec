#!/usr/bin/env python3
"""battery_r22.py — the Round-22 FINALITY battery (the S5-successor's posture + plan + pin checks).
Replaces battery_r15.py's calibration (R15 checks retired with the plan they checked — the A-series is superseded by crawl/walk/run).
Every check: PASS/FAIL with context-aware exemptions (historical records keep their point-in-time pins by design).
"""
import re, os, sys

REPO = os.path.dirname(os.path.abspath(__file__)) + "/.."

def read(f):
    with open(os.path.join(REPO, f), encoding="utf-8") as fh:
        return fh.read()

results = []
def check(name, fn, tag=""):
    try:
        ok, detail = fn()
    except Exception as e:
        ok, detail = False, f"exception: {e}"
    results.append((name, ok, detail if not tag else tag))

def live_stale(text, stale):
    """Count occurrences of `stale` NOT in a historical/supersession context."""
    hits = [m.start() for m in re.finditer(re.escape(stale), text)]
    live = 0
    for h in hits:
        ctx = text[max(0, h-260):h+260]
        if any(k in ctx for k in ["superseded", "supersession", "R15-era", "historical", "point-in-time",
                                  "retired", "was the", "old ", "history", "v2.1 history", "prior ledger",
                                  "R15 counts", "(Round 15", "R22 re-baseline", "retired to history"]):
            continue
        live += 1
    return live

specs = {n: read(f"{n:02d}-" + {
    1:"core-engine",2:"workers-threading",3:"playback-engine",4:"renderer-color",5:"timeline",6:"nle-ops",
    7:"composition",8:"color-grading",9:"project-model",10:"fcpxml-export",11:"cloud-render",12:"testing-strategy",
    13:"subagent-scout-plan",14:"implementation-phases",15:"wire-protocol",16:"keyboard-shortcuts",17:"test-plan",
    18:"ui-shell",19:"code-references",20:"audio-core"}[n] + ".md") for n in range(1, 21)}
s00 = read("00-master-spec.md")
arch = read("audits/ARCH-R22-finality.md")

# === A. POSTURE (the inversion law — every spec carries the triad) ============
DOMAIN = [n for n in range(1, 21) if n not in (14, 17)]
def triad(n):
    t = specs[n]
    return ("## 0. FORWARD INVENTORY" in t and "**BASE (accepted, pinned 2026-09-07):**" in t
            and "**GAP (the work" in t and "**ACCEPTANCE & TEST PLAN:**" in t)
for n in DOMAIN:
    check(f"{n:02d} has the §0 FORWARD INVENTORY triad", lambda n=n: (triad(n), "§0"))
check("17 has the §0A acceptance-executability law", lambda: ("## 0A. The acceptance-executability law" in specs[17] and "BASE rows state their regression role" in specs[17], "§0A"))
check("14 is the crawl/walk/run plan (BASE table + C + W + R phases)", lambda: (
    "## 2. The BASE" in specs[14] and "C0" in specs[14] and "C4" in specs[14] and "W-ops" in specs[14]
    and "W-media" in specs[14] and "R-fcpxml" in specs[14] and "## 3.4" in specs[14], "plan"))
check("14 pre-C1 inventory precedes C1 (no circularity)", lambda: (
    specs[14].find("Pre-C1 (the inventory") < specs[14].find("C0 grammar extraction") or
    specs[14].find("Pre-C1 (the inventory") < specs[14].find("| **C1 timeline crawl**"), "pre-C1"))
check("00 carries the posture law (D20)", lambda: ("### Decision 20: Spec posture law" in s00, "D20"))

# === B. PINS (the seven-repo pin world, both classes) ==========================
FLEET_HEAD = {"engine": "f68ab8c", "ot": "05584d8", "wdc": "fe05d85", "ui": "dba8d52", "app": "e662759"}
check("14 BASE table pins all five repos (HEAD class)", lambda: (all(v in specs[14] for v in FLEET_HEAD.values()), "HEAD pins"))
check("consumer pins present where they differ (WDC 5570321 + nle-ui 752991d)", lambda: (
    "5570321" in specs[14] and "752991d" in specs[14] and "consumer pin" in specs[14].lower(), "consumer"))
check("19 re-baselined (v3.0 + the R22 fleet paragraph)", lambda: (
    "v3.0 (Round 22" in specs[19] and "R22 fleet re-baseline" in specs[19], "19"))
R15_PINS = ["f526e67", "0412e41", "374711c", "d42693e"]
STALE_FILESET = {0: s00, 5: specs[5], 6: specs[6], 14: specs[14], 15: specs[15], 19: specs[19], 20: specs[20]}
for pin in R15_PINS:
    n_live = sum(live_stale(t, pin) for t in STALE_FILESET.values())
    check(f"no LIVE R15 pin {pin} (historical context exempt)", lambda n_live=n_live: (n_live == 0, f"live={n_live}"))
check("00 has Decisions 18-22 (five R22 rows)", lambda: (
    all(f"### Decision {d}:" in s00 for d in range(18, 23)), "D18-D22"))
check("00 decision count = 22", lambda: (
    len(re.findall(r"^### Decision ", s00, re.M)) == 22, f"count={len(re.findall(r'^### Decision ', s00, re.M))}"))

# === C. THE DRAG LAW FREEZE (D22 + spec 18 §16.2) ==============================
check("18 §16.2 carries the R22 drag-law notice", lambda: (
    "R22 (user directive — the full drag-machinery retirement)" in specs[18] and "RETIRED" in specs[18], "notice"))
check("18 §16.3 re-pointed at the crawl app as the MVP vehicle", lambda: (
    "The MVP vehicle (R22 amendment" in specs[18], "vehicle"))
check("18 test count re-baselined to 333", lambda: ("333 vitest tests" in specs[18], "count"))
check("14 drag law = the R22 R18k verbatim (retired machinery stays retired)", lambda: (
    "R22-directive R18k law verbatim" in specs[14] and "stays retired" in specs[14], "freeze"))

# === D. THE PLAN'S GATES (acceptance testability) ==============================
check("14 C4 gate is the mini-parity demo + corpus", lambda: (
    "import(virtual) → cut (drag/trim/split/ripple) → play → export" in specs[14]
    and "LAW-NET-INVENTORY" in specs[14], "C4"))
check("14 W-color gate = binding parity (instruments are S-engine's)", lambda: (
    "grade-math parity pins" in specs[14] and "S-engine deliverables consumed here" in specs[14], "W-color"))
check("14 W-audio threshold stated (≤ −60 dBFS)", lambda: ("−60 dBFS" in specs[14], "W-audio"))
check("14 C7 at W-ops end + migration sub-gate", lambda: (
    "C7 rename sequenced to W-ops END" in specs[14] or "C7 rename at W-ops END" in specs[14]
    or "**C7 rename sequenced to W-ops END**" in specs[14], "C7"))
check("14 walk totals honest (16.5-23 solo)", lambda: ("16.5-23 wk solo" in specs[14], "walk"))
check("14 crawl totals honest (10-14 solo / 7-9 two-dev)", lambda: (
    "10-14 wk solo / 7-9 wk two-dev" in specs[14], "crawl"))
check("14 parallelization map carries the six streams", lambda: (
    all(k in specs[14] for k in ["S-engine", "S-ot", "S-wdc", "S-package", "S-app", "S-spec"]), "streams"))
check("ARCH-R22 final (both review rounds + sibling directive folded)", lambda: (
    "FINAL (both adversarial review rounds held + folded" in arch and "Round 2 (adversarial, plan/executability) — HELD" in arch, "arch"))
check("ARCH-R22 review trail counts (10 + 13 amendments)", lambda: (
    "×10" in arch and "×13" in arch, "trail"))

# === E. COUNTS (the regression-role discipline) =================================
check("17 re-tier row carries the R22 counts", lambda: (
    "R22 re-baseline: engine 356" in specs[17], "re-tier"))
check("17 §17A fleet counts re-baselined", lambda: ("R22 counts" in specs[17], "17A"))
check("19 tier-4 assets present (nle-ui + nle-test-app THE APP)", lambda: (
    "nle-ui" in specs[19] and "THE APP" in specs[19], "tier-4"))
check("mini law count current (333) in 18 + 14 + ARCH", lambda: (
    "333" in specs[18] and "333" in specs[14] and "333" in arch, "mini count"))

# === F. SURVIVING R15 CHECKS (still-current canon) ==============================
check("15 §4.1A routing-disposition table survives", lambda: ("Routing-disposition table" in specs[15] or "routing-disposition table" in specs[15], "§4.1A"))
check("15 §9.5 event staircase register survives", lambda: ("§9.5" in specs[15] and "staircase" in specs[15].lower(), "§9.5"))
check("13.15 C7 worklist survives (W-ops-tagged)", lambda: ("§13.15" in specs[15] and "W-ops" in specs[15], "13.15"))
check("single-file canon (no .refined.md files)", lambda: (
    not [f for f in os.listdir(REPO) if f.endswith(".refined.md")], "canon"))

# === REPORT ====================================================================
fails = [r for r in results if not r[1]]
print(f"\nbattery_r22: {len(results) - len(fails)}/{len(results)} PASS")
for name, ok, detail in results:
    print(f"  {'PASS' if ok else 'FAIL'}  {name}  [{detail}]")
sys.exit(1 if fails else 0)

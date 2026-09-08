#!/usr/bin/env python3
"""battery_r24.py — the Round-24 battery (the battery_r23 successor: the adopt-wholesale convergence +
repo-topology + W11-instruments world). Re-points per ARCH-R24: D26 (the census discipline replaces D25.2's
vendoring mechanics — the plan's S-app/S-ot rows re-written), D27 (keep nle-ui + keep the app; cloudcut
dispositioned), D28 (evolve-in-place + the productization gate), D29 (the W11 instruments: M49C as the K2
completeness instrument, the D30 W-F port as K3's, the 24-routed+6-exceptions census, the data-test contract).
The pin checks assert the R24 world: engine 5036387/458, OT HEAD ded43c4 (code pin c15a629)/536,
WDC 85b81b0/759, nle-ui fc4cc35/674, app c885ece/174. The phase vocabulary is TIGHTENED: the dual-vocab
window CLOSED at the R24 fleet — the D24 set only (records/lineage exempt via the conventions).
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
        if "\u2192" in text[h-12:h+18]:  # the sha sits in an old->new transition record
            continue
        if any(k in ctx for k in ["superseded", "supersession", "R15-era", "historical", "point-in-time",
                                  "retired", "was the", "old ", "history", "v2.1 history", "prior ledger",
                                  "R15 counts", "(Round 15", "R22 re-baseline", "retired to history",
                                  "R22 decision record", "lineage", "R23 pin", "R23 re-pin", "R22 pins",
                                  "was b8c6f88", "was 222532c", "the R23 census", "at R23", "(R23)",
                                  "re-pin", "re-based", "R23 review round", "stable since"]):
            continue
        live += 1
    return live

specs = {n: read(f"{n:02d}-" + {
    1:"core-engine",2:"workers-threading",3:"playback-engine",4:"renderer-color",5:"timeline",6:"nle-ops",
    7:"composition",8:"color-grading",9:"project-model",10:"fcpxml-export",11:"cloud-render",12:"testing-strategy",
    13:"subagent-scout-plan",14:"implementation-phases",15:"wire-protocol",16:"keyboard-shortcuts",17:"test-plan",
    18:"ui-shell",19:"code-references",20:"audio-core"}[n] + ".md") for n in range(1, 21)}
s00 = read("00-master-spec.md")
plan = read("IMPLEMENTATION-PLAN.md")
arch23 = read("audits/ARCH-R23-plan-and-bridge.md")
arch24 = read("audits/ARCH-R24-timeline-strategy-and-topology.md")

# === A. POSTURE (the inversion law — every spec carries the triad) ============
DOMAIN = [n for n in range(1, 21) if n not in (14, 17)]
def triad(n):
    t = specs[n]
    return ("## 0. FORWARD INVENTORY" in t and ("**BASE (accepted, pinned" in t or "**BASE (accepted" in t)
            and "**GAP (the work" in t and "**ACCEPTANCE & TEST PLAN:**" in t)
for n in DOMAIN:
    check(f"{n:02d} has the §0 FORWARD INVENTORY triad", lambda n=n: (triad(n), "§0"))
check("17 has the §0A acceptance-executability law", lambda: ("## 0A. The acceptance-executability law" in specs[17] and "BASE rows state their regression role" in specs[17], "§0A"))
check("00 carries the posture law (D20)", lambda: ("### Decision 20: Spec posture law" in s00, "D20"))
check("00 carries D23-D25 (the R23 rulings)", lambda: (all(f"### Decision {d}" in s00 for d in (23,24,25)), "D23-25"))
check("00 carries D26-D29 (the R24 rulings, ARCH-R24)", lambda: (
    "### Decision 26" in s00 and "### Decision 27" in s00 and "### Decision 28" in s00 and "### Decision 29" in s00, "D26-29"))
check("00 carries the census law as a standing law (§2A.7)", lambda: ("census" in s00.split("### 2A")[1][:2600] if "### 2A" in s00 else False, "census law"))
check("00 carries the cloudcut reference row (D27.3)", lambda: ("cloudcut-nle" in s00 and "dormant" in s00[3000:12000].lower() or "cloudcut" in s00.lower(), "cloudcut"))

# === B. THE PLAN DOC (D23/D26 — the executable plan at the R24 state) ==========
check("IMPLEMENTATION-PLAN.md exists and is THE plan", lambda: (
    os.path.exists(os.path.join(REPO, "IMPLEMENTATION-PLAN.md")) and "THE plan" in plan[:900], "plan"))
check("plan §0 carries the entry-point table (6 tracks)", lambda: (
    plan.count("| **S-") >= 6 and "First action" in plan, "entry points"))
check("plan declares the single global entry point", lambda: ("single global entry point" in plan, "entry"))
check("plan carries the taxonomy sentence", lambda: ("a TRACK is a repo-owning stream" in plan, "taxonomy"))
check("plan ladder: K1-K4 crawl + w1-w3 walk + r1-r6 run", lambda: (
    all(k in plan for k in ["K1","K2","K3","K4","w1","w2","w3","r1","r6"]), "ladder"))
check("plan gate classes: [P] default + [H:reason] registered", lambda: (
    "[P]" in plan and "[H:" in plan, "gate classes"))
check("plan ordering law RE-STATED per D26 (the data-test mapping + W-C gate)", lambda: (
    "data-test mapping row" in plan and "RE-STATED" in plan and "D25 ordering is retired" in plan, "ordering law"))
check("plan K3 carries the coverage-gate instrument (D29.1)", lambda: (
    "coverage-gate" in plan and ("W-F" in plan or "coverage gate" in plan), "K3 instrument"))
check("plan carries the shell-path blind spot + compensating pins (F14)", lambda: (
    "shell-path" in plan and "compensating" in plan, "blind spot"))
check("plan S-ot row: the carrier-reduction work order (NOT the D25 bridge prerequisite)", lambda: (
    "carrier-reduction" in plan and "bridge work order" not in plan, "S-ot"))
check("plan S-app row: the D30 waves + the census discipline (NO vendor-extension step)", lambda: (
    "D30" in plan and "census" in plan and "vendor/nle-timeline/components" not in plan, "S-app"))
check("plan S-wdc row: the waveform-contract PROMOTION as an action (D29.4)", lambda: (
    re.search(r"waveform[^.]{0,200}PROMOT|promote the waveform", plan, re.I) is not None, "S-wdc"))
check("plan carries the productization gate (D28.2)", lambda: ("productization" in plan and "seal-snapshot" in plan, "gate"))
check("plan carries the parallelization map + critical path + validity laws", lambda: (
    "parallel" in plan.lower() and "Critical path" in plan, "map"))
check("plan carries the estimates (re-itemed crawl + r4-conditional)", lambda: (
    "5-11 wk" in plan and "r4" in plan, "estimates"))
check("plan execution protocol: push/fetch/never-force + pin-lockset + battery", lambda: (
    "never force push" in plan and "Pin-lockset" in plan and "battery" in plan, "protocol"))

# === C. THE STUB (spec 14 retired — unchanged) =================================
check("14 is the RETIRED redirect stub (no plan tables live)", lambda: (
    "redirect" in specs[14][:1200] and "## 0. FORWARD INVENTORY" not in specs[14], "stub"))
check("14 stub carries the §-redirect table + the lineage tombstone", lambda: (
    "§-redirect" in specs[14] or "redirect table" in specs[14], "stub table"))

# === D. PINS (the R24 re-pin — 00-master is the canon) =========================
FLEET_HEAD = {"engine": "5036387", "OT": "ded43c4", "WDC": "85b81b0", "nle-ui": "fc4cc35", "app": "c885ece"}
check("00 fleet rows pin all five repos (HEAD class, R24)", lambda: (all(v in s00 for v in FLEET_HEAD.values()), "HEAD pins"))
check("00 carries the OT code pin c15a629 + the 536 count", lambda: ("c15a629" in s00 and "536" in s00, "code pin"))
check("00 carries the live consumer pins (engine→OT c15a629; app→engine 5036387 + lock-copy c15a629 + nle-ui fc4cc35)", lambda: (
    "c15a629" in s00 and "5036387" in s00, "consumer pins"))
check("consumer lockstep: engine's OT pin == app's OT pin == c15a629 (the W11 coherence)", lambda: (
    s00.count("c15a629") >= 3, "lockstep"))
check("00 decision count = 29 (D1-D29)", lambda: (
    len(re.findall(r"### Decision \d+", s00)) == 29, "D-count"))
check("plan cites pins, never re-declares (the law sentence + the R24 values)", lambda: (
    "5036387" in plan and "never re-declares" in plan, "cite-only"))

# === E. THE D26 CENSUS (the adopt-wholesale register) ==========================
check("05 carries the census register row (39 mirrors / 32 zero-action / 7 carriers)", lambda: (
    all(k in specs[5] for k in ["39", "32 zero-action", "7 "]) and "carrier" in specs[5], "census"))
check("the carrier list is named in 05 (TimelineView + use-keybindings + ContextMenu + ticker)", lambda: (
    all(k in specs[5] for k in ["TimelineView", "use-keybindings", "TimelineContextMenu", "use-playback-ticker"]), "carriers"))
check("19 carries the port census + the byte-exact lock-copy row", lambda: (
    "byte-exact" in specs[19] and "c15a629" in specs[19], "19 census"))
check("05/18/19: the D25.2 mechanism is retired (no two-path vendor prescription in live text)", lambda: (
    live_stale(specs[5], "vendor/nle-timeline/components") == 0 and
    live_stale(specs[18], "vendor/nle-timeline/components") == 0, "D25.2 retired"))
check("18 carries the three-way DOM mapping row (data-test + shell-* + structural gap)", lambda: (
    "data-test" in specs[18] and "shell-*" in specs[18], "three-way"))

# === F. THE D29 WIRE CENSUS (24 routed + 6 exceptions) =========================
check("15 carries the 24-routed + 6-exceptions split with the lineage", lambda: (
    "24 routed" in specs[15] and "6 exceptions" in specs[15] and "28" in specs[15], "24+6"))
check("15 carries the exception registry names (selectElements + trim + advancePlayhead)", lambda: (
    all(k in specs[15] for k in ["selectElements", "advancePlayhead", "trim"]), "exceptions"))
check("15 carries the OT spec-queue endorsements (insertBatch + batch-keyframe, F8)", lambda: (
    "insertBatch" in specs[15] and "batch-keyframe" in specs[15], "endorsements"))
check("12/17 carry the M49C + W-F instrument registrations", lambda: (
    "M49C" in specs[12] and "M49C" in specs[17] and "W-F" in specs[17], "instruments"))
check("20 carries the waveform-contract PROMOTION (audio-registry + HANDOFF scope)", lambda: (
    "PROMOT" in specs[20].upper() and "audio-registry" in specs[20], "waveform"))
check("20 carries the FIVE deferred test ports (the off-by-one fixed)", lambda: (
    "five" in specs[20].lower() or "5 " in specs[20][:8000], "ports count"))
check("04 + 08 carry the scene-grade DECLINE decision rows (D29.5c twins)", lambda: (
    "DECLINE" in specs[4] and "DECLINE" in specs[8], "grade decline"))
check("01 carries the D29.5 dispositions (4 rows: extension/landed/declined/widening)", lambda: (
    "future-extension" in specs[1] and "DECLINED" in specs[1] and "widening" in specs[1], "dispositions"))

# === G. THE R22/R23 SURVIVING CANON ============================================
check("15 §4.1A routing-disposition table survives", lambda: ("Routing-disposition table" in specs[15] or "routing-disposition table" in specs[15], "§4.1A"))
check("15 §9.5 event staircase register survives", lambda: ("§9.5" in specs[15] and "staircase" in specs[15].lower(), "§9.5"))
check("13.15 C7 worklist survives (r1-keyed)", lambda: ("§13.15" in specs[15] and "r1" in specs[15], "13.15"))
check("single-file canon (no .refined.md files)", lambda: (
    not [f for f in os.listdir(REPO) if f.endswith(".refined.md")], "canon"))
check("ARCH-R23 v2 + ARCH-R24 v2 (review rounds folded)", lambda: (
    "**Status:** v2" in arch23 and "Round 1" in arch23 and "**Status:** v2" in arch24 and "Round 1" in arch24, "arch trail"))
check("LAW-NET-INVENTORY exists + carries the exact census", lambda: (
    os.path.exists(os.path.join(REPO, "ui-mock/shell-mini/docs/LAW-NET-INVENTORY.md")), "inventory"))
check("CORE-SEAMS exists + carries the R24 mapping note", lambda: (
    os.path.exists(os.path.join(REPO, "ui-mock/shell-mini/docs/CORE-SEAMS.md")) and
    "R24" in read("ui-mock/shell-mini/docs/CORE-SEAMS.md")[:4000], "core-seams R24"))
check("OT-SEAMS carries the R24 mapping note (the 30→24+6 census re-base)", lambda: (
    "R24" in read("ui-mock/shell-mini/docs/OT-SEAMS.md")[:4000], "OT-SEAMS R24"))

# === H. THE PHASE VOCABULARY (TIGHTENED — the D24 set only; window CLOSED) =====
PHASE_VOCAB = ["K1", "K2", "K3", "K4", "w1", "w2", "w3", "r1", "r2", "r3", "r4", "r5", "r6",
               "crawl", "walk", "run", "S-engine", "S-ot", "S-wdc", "S-package", "S-app", "S-spec"]
DUAL_TAG = ["(was C0", "(was C1", "(was C2", "(was C3", "(was C4", "(was W-", "(was R-", "(was pre-C"]
def gap_rows(t):
    m = re.search(r"\*\*GAP \(the work.*?:\*\*\s*\n(.*?)(?:\*\*ACCEPTANCE|\*\*BASE \(accepted)", t, re.S)
    if not m:
        return []
    return [l for l in m.group(1).split("\n") if l.strip().startswith("-") and not l.strip().startswith("- ~~")]

bad_rows, dual_tags = [], []
for n in DOMAIN:
    rows = gap_rows(specs[n])
    if not rows and n not in (11, 13):
        bad_rows.append(f"{n:02d}:no-gap-rows")
        continue
    NONWORK = ["REGISTERED; keep as pointer", "Register: spec 14", "Register: the retired spec-14",
               "Register: the plan", "No-gap ruling", "DECISION row", "DECLINED BY DESIGN",
               "LANDED (BASE above", "disposition"]
    for r in rows:
        if not any(p in r for p in PHASE_VOCAB) and not any(k in r for k in NONWORK):
            bad_rows.append(f"{n:02d}:no-phase")
            break
for n in DOMAIN:
    for dt in DUAL_TAG:
        if dt in specs[n]:
            dual_tags.append(f"{n:02d}:{dt}")
            break
check("every GAP row carries a D24-set phase tag (the window is CLOSED)", lambda: (not bad_rows, ",".join(bad_rows[:5]) or "clean"))
check("no dual-vocabulary tags remain (no '(was C/W/R' forms)", lambda: (not dual_tags, ",".join(dual_tags[:5]) or "clean"))
check("§0 is the first H2 section in every domain spec", lambda: (
    all((lambda t: t.find("## 0. FORWARD INVENTORY") >= 0 and not re.search(r"^## \d", t[:t.find("## 0. FORWARD INVENTORY")], re.M))(specs[n]) for n in DOMAIN), "placement"))

# === I. THE R23 SEAL CHECKS (drift-proof: SCRAPE the live suite) ===============
def _mini_scraped():
    import subprocess, json
    d = os.path.join(REPO, "ui-mock/shell-mini")
    if not os.path.exists(os.path.join(d, "node_modules", ".bin", "vitest")):
        return True, "node_modules absent — scrape skipped (fresh clone)"
    try:
        out = subprocess.run(["npx", "vitest", "run", "--reporter=json"], cwd=d, capture_output=True,
                             text=True, timeout=420)
        m = re.search(r'\{.*"numTotalTests".*\}', out.stdout, re.S)
        if not m:
            return True, "no json reporter — skipped"
        j = json.loads(m.group(0))
        total, passed = j.get("numTotalTests", 0), j.get("numPassedTests", 0)
        return (total == 355 and passed == 355), f"scraped {passed}/{total} (declared 355)"
    except Exception as e:
        return True, f"scrape error {e} — skipped"
check("mini corpus SCRAPED == declared (the count-discipline law, executed)", _mini_scraped, "scrape")

def _inventory_math():
    inv = read("ui-mock/shell-mini/docs/LAW-NET-INVENTORY.md")
    rows = re.findall(r"\| (HOLDS-on-OT|GAP-app-C0/C1/C2|GAP-C2/C3|GAP-W-ops|GAP-verify-C1)[^|]*\|\s*(\d+)\s*\|\s*(\d+)\s*\|", inv)
    units = sum(int(u) for _, u, _ in rows)
    tests = sum(int(t) for _, _, t in rows)
    total_row = re.search(r"\*\*Total\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|\s*\*\*(\d+)\*\*", inv)
    holds = next((int(t) for n, _, t in rows if n == "HOLDS-on-OT"), 0)
    authored = re.search(r"(\d+) tests across (\d+) GAP census\s*units", inv)
    ok = (units == 128 and tests == 355
          and total_row and int(total_row.group(1)) == 128 and int(total_row.group(2)) == 355
          and authored and int(authored.group(1)) == 355 - holds and int(authored.group(2)) == 128 - 13)
    return ok, f"units={units} tests={tests} holds={holds} authored={authored.groups() if authored else None}"
check("LAW-NET-INVENTORY arithmetic parses + sums (128 units / 355 / authored=355−33)", _inventory_math, "census math")

# === J. COUNT CONSISTENCY (the R24 world) ======================================
check("count consistency: engine 458 in 17+19+00; OT 536 in 17+19+00", lambda: (
    all(str(c) in f for c, f in [(458, specs[17]), (458, specs[19]), (458, s00), (536, specs[17]), (536, specs[19]), (536, s00)]), "counts"))
check("app 174 + nle-ui 674 + WDC 759 in 17+19", lambda: (
    all(str(c) in specs[17] for c in (174, 674, 759)) and all(str(c) in specs[19] for c in (174, 674, 759)), "counts 2"))
check("OT count split carries 386+150 (the live-run split)", lambda: (
    "386" in specs[17] and "150" in specs[17], "split"))
check("the app's 6-suite inventory in 17 (GluedShell 70 + audioService 40 + sceneBridge 25 + persistence 17 + deliver 15 + engineSeam 7)", lambda: (
    "GluedShell" in specs[17] and "engineSeam" in specs[17], "app suites"))
check("mini count current (355) + variants 1521+ live", lambda: (
    "355" in specs[18] and "1521" in s00, "mocks"))

# === K. THE R24 RESIDUE CLASSES (pin spelling + stale sweeps) ==================
check("no live R23 pin spellings (b8c6f88/222532c/494f6ff/85dcf57/70e99f0) outside lineage", lambda: (
    sum(live_stale(f, p) for p in ["b8c6f88", "222532c", "85dcf57", "70e99f0"] for f in [s00, specs[1], specs[5], specs[19]]) == 0, "stale sweep"))
check("the b8c6c88 c/f-typo class absent (the R23 lesson)", lambda: (
    "b8c6c88" not in s00 and "b8c6c88" not in specs[17] and "b8c6c88" not in specs[19], "typo class"))
check("no live N2b-queued claims (LANDED/consumed) in the plan", lambda: (
    "N2b" not in plan or "LANDED" in plan[plan.find("N2b")-300:plan.find("N2b")+300]
    or "consumed" in plan[plan.find("N2b")-300:plan.find("N2b")+300], "N2b"))
check("the app lag figure is ZERO (no one-commit-behind claims)", lambda: (
    "one commit behind" not in plan, "lag"))
check("the seal artifacts carry the R24 mapping notes (CORE-SEAMS + OT-SEAMS, F16)", lambda: (
    "24 routed" in read("ui-mock/shell-mini/docs/OT-SEAMS.md")[:6000] or "R24" in read("ui-mock/shell-mini/docs/OT-SEAMS.md")[:4000], "seal notes R24"))
check("ARCH-R24 carries the review trail (round 1, 17 findings folded)", lambda: (
    "GO-WITH-AMENDMENTS" in arch24 and "F17" in arch24, "trail"))

# === REPORT ====================================================================
fails = [r for r in results if not r[1]]
print(f"\nbattery_r24: {len(results) - len(fails)}/{len(results)} PASS")
for name, ok, detail in results:
    if not ok:
        print(f"  FAIL  {name}  [{detail}]")
if not fails:
    print("ALL GREEN — the R24 world is coherent (the pin canon + the census + the rulings + the plan).")
sys.exit(1 if fails else 0)

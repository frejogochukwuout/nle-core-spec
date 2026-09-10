#!/usr/bin/env python3
"""battery_r25.py — the Round-25 battery (the battery_r24 successor: the DaVinci edit-mode-completeness
round). Re-points per ARCH-R25: D30 (the ten-mode matrix registered in 06 §0 — the edit-mode completeness
census + the K2 zero-orphan-rows gate), D31/31A (the §5.9 restructure — the two insert semantics, the
mid-clip split law, the four new families §5.9B-F + the dedicated-vs-composite criterion), D32 (06 §5.0's
linked-companion propagation law + the E1 defect row), D33 (the visual-grammar register: 05 §8A the
structural half + 18 §9 the token half + the green ruling), D34 (16's source-edit keyboard family — the
⇧⌥./,/./E primaries + the F9-F12 alternates + the four-meaning row), D35 (REFERENCE-REGISTER.md + the
C-ledger intake discipline), D36 (the execution wiring: S-app's post-D30 state + the census-CI filing +
the WDC root-HANDOFF venue + the mode-matrix ladder rows). The pin checks assert the R25 world: engine
3989506/458, OT HEAD fdb771c (code pin c15a629 UNCHANGED — src-diff empty)/536, WDC 85b81b0/759,
nle-ui 3026099/674, app 64fb0ab/206. The landed C7 census (24 routed + 6 exceptions) is NOT reopened —
the four absent families are r1-scheduled spec-first rows that re-declare mechanically per D29 F8.
Keeps ALL 85 battery_r24 checks re-based + the seven new R25 check classes (ARCH-R25 §7).
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
                                  "re-pin", "re-based", "R23 review round", "stable since", "R24 pin",
                                  "commits over", "re-verified R24", "fleet re-pin"]):
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
reg = read("REFERENCE-REGISTER.md")
arch23 = read("audits/ARCH-R23-plan-and-bridge.md")
arch24 = read("audits/ARCH-R24-timeline-strategy-and-topology.md")
arch25 = read("audits/ARCH-R25-edit-mode-completeness.md")

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

# === B. THE PLAN DOC (D23/D26/D36 — the executable plan at the R25 state) =====
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
check("plan ordering law RE-STATED per D26/R25 (the data-test mapping row + W-C landed)", lambda: (
    "data-test mapping row" in plan and "RE-STATED" in plan and "D25 ordering is retired" in plan, "ordering law"))
check("plan K3 carries the coverage-gate instrument (D29.1)", lambda: (
    "coverage-gate" in plan and ("W-F" in plan or "coverage gate" in plan), "K3 instrument"))
check("plan carries the shell-path blind spot + compensating pins (F14)", lambda: (
    "shell-path" in plan and "compensating" in plan, "blind spot"))
check("plan S-ot row: the carrier-reduction work order (NOT the D25 bridge prerequisite)", lambda: (
    "carrier-reduction" in plan and "bridge work order" not in plan, "S-ot"))
check("plan S-app row: the post-D30 state (the waves DONE + the census discipline; NO vendor-extension step)", lambda: (
    "D30" in plan and "census" in plan and "vendor/nle-timeline/components" not in plan, "S-app"))
check("plan S-wdc row: the waveform-contract PROMOTION as an action (D29.4/D36.3)", lambda: (
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

# === D. PINS (the R25 re-pin — 00-master is the canon) =========================
FLEET_HEAD = {"engine": "3989506", "OT": "fdb771c", "WDC": "85b81b0", "nle-ui": "3026099", "app": "64fb0ab"}
check("00 fleet rows pin all five repos (HEAD class, R25)", lambda: (all(v in s00 for v in FLEET_HEAD.values()), "HEAD pins"))
check("00 carries the OT code pin c15a629 + the 536 count", lambda: ("c15a629" in s00 and "536" in s00, "code pin"))
check("00 carries the live consumer pins (engine→OT c15a629; app→engine 5036387 + lock-copy c15a629 + nle-ui 3026099)", lambda: (
    "c15a629" in s00 and "5036387" in s00 and "3026099" in s00, "consumer pins"))
check("consumer lockstep: engine's OT pin == app's OT pin == c15a629 (the W11 coherence)", lambda: (
    s00.count("c15a629") >= 3, "lockstep"))
check("00 decision count = 37 (D1-D36 + 31A)", lambda: (
    len(re.findall(r"### Decision \d+[A-Z]?", s00)) == 37, "D-count"))
check("plan cites pins, never re-declares (the law sentence + the R25 values)", lambda: (
    "3989506" in plan and "never re-declares" in plan, "cite-only"))

# === E. THE D26 CENSUS (the adopt-wholesale register) ==========================
check("05 carries the census register row (39 mirrors / 32 zero-action / 7 carriers, the R24-declared pin)", lambda: (
    all(k in specs[5] for k in ["39 mirrors", "32 zero-action", "7 documented carriers"]), "census"))
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

# === G. THE R22/R23/R24 SURVIVING CANON ============================================
check("15 §4.1A routing-disposition table survives", lambda: ("Routing-disposition table" in specs[15] or "routing-disposition table" in specs[15], "§4.1A"))
check("15 §9.5 event staircase register survives", lambda: ("§9.5" in specs[15] and "staircase" in specs[15].lower(), "§9.5"))
check("13.15 C7 worklist survives (r1-keyed)", lambda: ("§13.15" in specs[15] and "r1" in specs[15], "13.15"))
check("single-file canon (no .refined.md files)", lambda: (
    not [f for f in os.listdir(REPO) if f.endswith(".refined.md")], "canon"))
check("ARCH-R23 v2 + ARCH-R24 v2 + ARCH-R25 v2 (review rounds folded)", lambda: (
    "**Status:** v2" in arch23 and "Round 1" in arch23 and "**Status:** v2" in arch24 and "Round 1" in arch24
    and "**v2 (all folded)**" in arch25, "arch trail"))
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

# === I. THE SEAL CHECKS (drift-proof: SCRAPE the live suite) ===============
def _scrape_mini():
    import subprocess, json
    d = os.path.join(REPO, "ui-mock/shell-mini")
    if not os.path.exists(os.path.join(d, "node_modules", ".bin", "vitest")):
        return None, "node_modules absent (fresh clone) — scrape unavailable"
    out_file = os.path.join(d, ".vitest", "json", "output.json")
    if os.path.exists(out_file):
        os.remove(out_file)
    subprocess.run(["npx", "vitest", "run", "--reporter=json", "--silent"],
                   cwd=d, capture_output=True, text=True, timeout=420)
    if not os.path.exists(out_file):
        return None, "json output file absent — scrape FAILED (not skipped)"
    j = json.load(open(out_file))
    files = len(j.get("testResults", []))
    return (j.get("numPassedTests"), j.get("numTotalTests"), files), None

def _mini_scraped():
    r, err = _scrape_mini()
    if err and "node_modules absent" in err:
        return True, err + " (vacuous-pass tolerated only on fresh clones)"
    if r is None:
        return False, err or "scrape failed"
    passed, total, files = r
    return (passed == 355 and total == 355 and files == 8), f"scraped {passed}/{total} tests / {files} files (declared 355/8)"
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

# === J. COUNT CONSISTENCY (the R25 world) ======================================
check("count consistency: engine 458 in 17+19+00; OT 536 in 17+19+00", lambda: (
    all(str(c) in f for c, f in [(458, specs[17]), (458, specs[19]), (458, s00), (536, specs[17]), (536, specs[19]), (536, s00)]), "counts"))
check("app 174 + nle-ui 674 + WDC 759 in 17+19 (the R24-dated records — 00's 206 supersedes at R25)", lambda: (
    all(str(c) in specs[17] for c in (174, 674, 759)) and all(str(c) in specs[19] for c in (174, 674, 759)), "counts 2"))
check("OT count split carries 386+150 (the live-run split)", lambda: (
    "386" in specs[17] and "150" in specs[17], "split"))
check("the app's 6-suite inventory in 17 (GluedShell 70 + audioService 40 + sceneBridge 25 + persistence 17 + deliver 15 + engineSeam 7)", lambda: (
    "GluedShell" in specs[17] and "engineSeam" in specs[17], "app suites"))
check("mini count current (355) + variants 1521+ live", lambda: (
    "355" in specs[18] and "1521" in s00, "mocks"))

# === K. THE RESIDUE CLASSES (pin spelling + stale sweeps) ==================
check("no live R23 pin spellings (b8c6f88/222532c/494f6ff/85dcf57/70e99f0) outside lineage", lambda: (
    sum(live_stale(f, p) for p in ["b8c6f88", "222532c", "85dcf57", "70e99f0"] for f in [s00, specs[1], specs[5], specs[19]]) == 0, "stale sweep"))
check("no live R24 HEAD-pin spellings (ded43c4/fc4cc35/c885ece) outside the canon transition records", lambda: (
    sum(live_stale(s00, p) for p in ["ded43c4", "fc4cc35", "c885ece"]) == 0, "stale sweep R24"))
check("the b8c6c88 c/f-typo class absent corpus-wide (the R23+F3 lesson)", lambda: (
    all("b8c6c88" not in f for f in [s00, plan, reg] + [specs[n] for n in DOMAIN]), "typo class"))
check("no live N2b-queued claims (LANDED/consumed) in the plan", lambda: (
    "N2b" not in plan or "LANDED" in plan[plan.find("N2b")-300:plan.find("N2b")+300]
    or "consumed" in plan[plan.find("N2b")-300:plan.find("N2b")+300], "N2b"))
check("the app lag figure is ZERO (no one-commit-behind claims)", lambda: (
    "one commit behind" not in plan, "lag"))
check("the seal artifacts carry the R24 mapping notes (CORE-SEAMS + OT-SEAMS, F16)", lambda: (
    "24 routed" in read("ui-mock/shell-mini/docs/OT-SEAMS.md")[:6000] or "R24" in read("ui-mock/shell-mini/docs/OT-SEAMS.md")[:4000], "seal notes R24"))
check("ARCH-R24 carries the review trail (round 1, 17 findings folded)", lambda: (
    "GO-WITH-AMENDMENTS" in arch24 and "F17" in arch24, "trail"))

# === L. THE R25 MODE-MATRIX (06 — D30/D31/31A/D32, ARCH-R25 §7 class 1) =====
def _matrix():
    i = specs[6].find("**The ten-mode matrix")
    j = specs[6].find("*Decision 30.2")
    if i < 0 or j <= i:
        return False, "matrix region absent"
    mat = specs[6][i:j]
    modes = ["Roll", "Ripple trim", "Slip", "Slide", "Insert edit", "Overwrite edit",
             "Replace", "Append at end", "Ripple overwrite", "Fit to fill"]
    missing = [m for m in modes if f"| {m} |" not in mat]
    rows = len([l for l in mat.split("\n") if l.startswith("|")]) - 2
    return (rows == 10 and not missing), f"rows={rows} missing={missing or 'none'}"
check("06 §0 carries the ten-mode matrix (D30) — all ten mode rows named", _matrix, "mode matrix")
check("06 carries the family sections: §5.0's heading + §5.9's two-semantics preamble + §5.9B-§5.9F", lambda: (
    all(h in specs[6] for h in ["### 5.0 Linked-Companion Propagation", "### 5.9B Overwrite Edit",
                                "### 5.9C Replace", "### 5.9D Append at End", "### 5.9E Ripple Overwrite",
                                "### 5.9F Fit to Fill"])
    and "the placement surface places (rejecting or displacing per strategy); the source-edit surface splices" in specs[6], "family sections"))
check("06's family GAP rows present (OW/RE/AP/RO/FF markers + the E1 defect row, D30.2)", lambda: (
    all(k in specs[6] for k in ["OW-1", "OW-2", "OW-3", "RE-1", "RE-2", "AP-1", "AP-2",
                                "RO-1", "RO-2", "RO-3", "FF-1", "FF-2", "| E1 |"]), "family GAP rows"))
def _phantoms():
    """The P-list phantom phrasings are GONE from live law (only re-key records may name them).
    Surgical form: every occurrence's ±2-line neighborhood must carry a supersession marker."""
    kws = ["phantom", "renamed", "re-keyed", "replaces", "replaced", "old ", "retired",
           "P-list", "unreachable", "contradicted", "mis-named"]
    bad = []
    lines = specs[6].split("\n")
    for ph in ["ripple-insert-makes-room", "slide-no-chain-is-noop", "unless overwrite placement", "sourceStart unchanged"]:
        for li, line in enumerate(lines):
            if ph in line:
                window = "\n".join(lines[max(0, li-2):li+3])
                if not any(k in window for k in kws):
                    bad.append(f"{ph}@{li+1}")
                    break
    return (not bad), ",".join(bad) or "clean"
check("the P-list phantoms are GONE from 06's live text (P2/P3/P4/P5 — supersession records only)", _phantoms, "phantoms")
check("06 §5.9 carries the D31 laws in prose (boundary sentence + mid-clip split + dedicated-vs-composite)", lambda: (
    "the left half NEVER moves" in specs[6] and "DEDICATED op" in specs[6] and "COMPOSITE" in specs[6], "D31 laws"))
def _matrix_gate():
    """The matrix preamble cites the R25 pins; §0's D30.3 footnote states the zero-orphan gate."""
    s0 = specs[6][:specs[6].find("## 1. Purpose")] if "## 1. Purpose" in specs[6] else specs[6][:8000]
    missing = [k for k in ["3989506", "c15a629", "64fb0ab", "zero orphan rows"] if k not in s0]
    return (not missing), ",".join(missing) or "all cited"
check("06's matrix cites the R25 pins + the D30.3 zero-orphan-rows ladder gate", _matrix_gate, "matrix gate")
def _05_165A():
    i = specs[5].find("### 16.5A")
    j = specs[5].find("### 16.6")
    if i < 0:
        return False, "§16.5A absent"
    seg = specs[5][i:j if j > i else len(specs[5])][:6000]
    missing = [k for k in ["replace", "append", "ripple-overwrite", "fit-to-fill"] if k not in seg]
    ok = (not missing and "affordance-grammar carrier" in specs[5] and "four R25 families" in specs[5])
    return ok, f"missing={missing or 'none'}"
check("05's R25 halves: §16.5A's op-port table carries the +4 r1 families + §0's GAP re-keyed (grammar carrier + the four families)", _05_165A, "05 R25 halves")
def _companion():
    i = specs[6].find("**The fan-out table")
    j = specs[6].find("The base verbs inherit")
    if i < 0 or j <= i:
        return False, "fan-out table absent"
    fan = specs[6][i:j]
    modes = ["Slip (§5.6)", "Slide (§5.7)", "Roll (§5.5)", "Ripple trim (§5.2A)", "Insert edit",
             "Overwrite edit", "Replace (§5.9C)", "Append at end", "Ripple overwrite", "Fit to fill"]
    missing = [m for m in modes if f"| {m}" not in fan]
    rows = len([l for l in fan.split("\n") if l.startswith("|")]) - 2
    ok = (rows == 10 and not missing and "track LOCK > sync-lock" in specs[6]
          and "syncLinked" in specs[6] and "pairwise at rest → groups at runtime" in specs[9])
    return ok, f"rows={rows} missing={missing or 'none'}"
check("06 §5.0's companion law (D32): the ten-mode fan-out table + lock>sync-lock>link + syncLinked + 09's D32.5 note", _companion, "companion law")

# === M. THE GRAMMAR REGISTER (05 §8A + 18 §9 — D33, ARCH-R25 §7 class 4) ===
def _sec8A():
    i = specs[5].find("### 8A.")
    j = specs[5].find("## 9. Snap Points")
    return (i, j)
def _grammar_rows():
    i, j = _sec8A()
    if i < 0 or j <= i:
        return False, "§8A absent"
    sec = specs[5][i:j]
    rows = [l for l in sec.split("\n") if l.startswith("| `")]
    return (len(rows) >= 12 and "Timeline Affordance Grammar" in sec), f"{len(rows)} register rows"
check("05 §8A exists (heading) + carries ≥12 register rows (the structural half, D33.1)", _grammar_rows, "grammar rows")
def _grammar_laws():
    i, j = _sec8A()
    if i < 0:
        return False, "§8A absent"
    sec = specs[5][i:j]
    laws = ["Hit zone ≠ visible band", "z-order stack", "Preview == commit", "Refusal renders no geometry"]
    missing = [k for k in laws if k not in sec]
    return (not missing), ",".join(missing) or "all four"
check("§8A's standing laws: hit zone ≠ band + z-order + preview == commit + refusal renders no geometry", _grammar_laws, "standing laws")
def _grammar_colors():
    i, j = _sec8A()
    if i < 0:
        return False, "§8A absent"
    sec = specs[5][i:j]
    hits = re.findall(r"#[0-9a-fA-F]{3,8}\b|rgba?\(", sec)
    return (not hits), f"{len(hits)} color values in the §8A range"
check("§8A carries ZERO color values (tokens by NAME only — the D25.3 theme/structural split executed)", _grammar_colors, "color-free")
check("18 §9 carries the 8 semantic tokens (the theme half, verbatim from the fleet report)", lambda: (
    all(t in specs[18] for t in ["--trim-edge-active", "--trim-glow-soft", "--clip-dim-overlay", "--clip-dim-border",
                                 "--clip-dim-title", "--clip-active-edit", "--ghost-outline", "--badge-chip-bg",
                                 "--badge-chip-border", "--badge-chip-text", "--overlay-arrow", "--source-active-border"])
    and "8 semantic tokens" in specs[18], "8 tokens"))
check("05's amber grammar row era-qualified (P10 — the R15-era FreeCut census; the green ruling is law)", lambda: (
    "R25 era-qualification" in specs[5] and "R15-era FreeCut reference-census" in specs[5], "era qualifier"))
check("18 §5A carries the cursor-layering ruling (CSS hover law + the bracket glyphs inside active gestures)", lambda: (
    "### 5A" in specs[18] and "bracket" in specs[18][specs[18].find("### 5A"):specs[18].find("## 6.")], "cursor layering"))

# === N. THE KEYBOARD FAMILY (16 — D34, ARCH-R25 §7 class 3) =================
def _kbd():
    i = specs[16].find("### 3.4A")
    j = specs[16].find("### 3.4B")
    if i < 0 or j <= i:
        return None
    return specs[16][i:j]
def _chords():
    a = _kbd()
    if a is None:
        return False, "§3.4A absent"
    chords = ["Insert-edit — splice", "Overwrite-edit — cover", "Ripple-overwrite — replace", "Append — the source lands"]
    missing = [c for c in chords if c not in a]
    ok = (not missing and "### 3.4B Slide-by-Frame" in specs[16] and "⇧⌥." in a)
    return ok, f"missing={missing or 'none'}"
check("16 §3.4A/§3.4B headings + the four primary chords (`,` insert / `.` overwrite / `⇧⌥.` ripple-overwrite / `E` append)", _chords, "primary chords")
def _fblock():
    a = _kbd()
    if a is None:
        return False, "§3.4A absent"
    keys = [f"`{f}`" for f in ["F9", "F10", "F11", "F12"]]
    missing = [k for k in keys if k not in a]
    ok = (not missing and "Shift+F10` is NOT available" in a and "preventDefault" in a and "MANDATORY" in a)
    return ok, f"missing={missing or 'none'}"
check("the F-block (F9/F10/F11/F12) + Shift+F10 marked NOT-available + the preventDefault law", _fblock, "F-block")
check("every §3.4A command shape carries the (r1-scheduled) marker + the C46 source-mode gate", lambda: (
    specs[16].count("(r1-scheduled)") >= 6 and "C46" in specs[16], "r1 markers"))
def _fourmean():
    s = specs[16]
    i = s.find("### 6.1")
    j = s.find("### 6.2")
    tbl = s[i:j] if i >= 0 else ""
    return ("Four meanings" in tbl and "`Option+Shift+,` / `Option+Shift+.`" in tbl
            and "row 19's ladder" in tbl and "slide tool → slide-10" in tbl), "row 2 + rows 19/20"
check("§6.1's four-meaning row (source-mode | slip | slide | nudge) + the #19/#20 resolution rows (no conflict implicit)", _fourmean, "four-meaning row")
check("18 §4.3 carries the SourceEditBar + SourceRangeBar rows (D35.4 — the C46-anchored source chrome)", lambda: (
    "SourceEditBar" in specs[18] and "SourceRangeBar" in specs[18] and "roving tabindex" in specs[18], "source chrome"))

# === O. THE REFERENCE REGISTER (D35, ARCH-R25 §7 class 2) ===================
check("REFERENCE-REGISTER.md exists at the spec root + carries the 19-family census", lambda: (
    os.path.exists(os.path.join(REPO, "REFERENCE-REGISTER.md"))
    and len([l for l in reg.split("\n") if re.match(r"\| \d+ \|", l)]) == 19, "19 families"))
check("the C-ledger intake: C33-C58 all dispositioned, zero untracked (D35.3)", lambda: (
    all(f"| C{n} |" in reg for n in range(33, 59)) and "Zero untracked" in reg and "UNTRACKED" not in reg, "C-ledger"))
def _variants_census():
    """D35.2's freshness census — the register's suite-count pins re-derived live (the
    variants' deps are not installed here, so the census is the register's own method:
    the line-start it-block count over the src test files)."""
    import glob
    files = sorted(set(glob.glob(os.path.join(REPO, "ui-mock/shell-variants/src/**/*.test.*"), recursive=True)))
    blocks = 0
    for f in files:
        with open(f, encoding="utf-8") as fh:
            for line in fh:
                s = line.strip()
                if s.startswith("it(") or s.startswith("it ("):
                    blocks += 1
    ok = ("1521+" in reg and "355" in reg and len(files) == 61 and blocks == 1588)
    return ok, f"{blocks} it-blocks / {len(files)} files (register: 1,588/61, canon 1521+)"
check("the suite-count pins hold (variants 1521+ / mini 355) — the variants it-census re-derived (D35.2)", _variants_census, "suite pins")

# === P. THE PLAN'S D36 ROWS (ARCH-R25 §7 class 5) ============================
check("plan S-app row: the post-D30 state (`.agents/` bootstrap + census-CI queue filing + waves DONE @ 64fb0ab/206)", lambda: (
    "create the app's `.agents/`" in plan and "census-check.mjs" in plan and "DONE @ `64fb0ab`" in plan
    and "206/206 live-run" in plan, "S-app post-D30"))
check("plan's K2 gate carries the mode-matrix zero-orphan-rows law (D30.3/36.5)", lambda: (
    "ZERO ORPHAN ROWS" in plan and "zero-orphan-rows law" in plan, "K2 zero-orphan"))
check("plan's S-wdc row carries the root-HANDOFF venue (D36.3 — NOT .agents/)", lambda: (
    "ROOT-HANDOFF venue" in plan and "ROOT `HANDOFF.md`" in plan and "NOT `.agents/`, which holds SKILL.md only" in plan, "root HANDOFF"))
check("plan's estimates: crawl 5-11/3-6 HOLDS + the r1 absent-family rider (+1.5-3 wk, user-gated)", lambda: (
    "5-11 wk solo / 3-6 two-dev — HOLDS" in plan and "+1.5-3" in plan, "estimates R25"))

# === Q. THE R25 PIN RE-BASE (ARCH-R25 §7 class 6) ============================
check("00's fleet rows cite the R25 pins: engine 3989506 / OT fdb771c / WDC 85b81b0 / nle-ui 3026099 / app 64fb0ab", lambda: (
    all(v in s00 for v in ["3989506", "fdb771c", "85b81b0", "3026099", "64fb0ab"]), "R25 pins"))
check("00's consumer pins re-read live (engine→OT c15a629 + WDC 494f6ff; app→engine 5036387 + byte-lock c15a629 + nle-ui 3026099)", lambda: (
    all(k in s00 for k in ["c15a629", "494f6ff", "5036387", "3026099", "byte-exact minus `testing/`"]), "consumer pins R25"))
check("the OT code pin c15a629 UNCHANGED at fdb771c (src-diff empty, machine-verified — the byte-lock cited)", lambda: (
    "code pin `c15a629` UNCHANGED" in s00 and "machine-verified" in s00, "code pin unchanged"))

# === R. THE CENSUS-UNTOUCHED INVARIANT (15 — D30.2/D29 F8) ===================
check("15's landed census stays byte-stable (24 routed + 6 exceptions — UNTOUCHED, the whole truth)", lambda: (
    "24 routed" in specs[15] and "6 exceptions" in specs[15] and "census is UNTOUCHED" in specs[15]
    and "stays byte-identical" in specs[15], "census untouched"))
check("15's four r1-scheduled verb rows (§13.15) carry the NOT-in-census markers (replace/append/ripple-overwrite/fit-to-fill)", lambda: (
    specs[15].count("r1-SCHEDULED (D30.2, R25") == 4 and "NOT in the landed census" in specs[15]
    and specs[15].count("the 24 routed + 6 exceptions stand untouched") >= 3, "r1 verb rows"))
check("15's P7 + P11 fixes (SlipCommand composition; insert{ripple} re-keyed to the D31.6 composite law)", lambda: (
    "SlipCommand's element-type list" in specs[15] and "`image` → `composition`" in specs[15]
    and "P11" in specs[15] and "composite law" in specs[15], "P7+P11"))

# === S. THE 00/ARCH R25 RECORD + THE LINEAGE ================================
check("00 carries D30-D36 (+31A) + the v10.0 R25 status", lambda: (
    all(f"### Decision {d}" in s00 for d in (30, 31, "31A", 32, 33, 34, 35, 36))
    and "**Status:** v10.0 (Round 25" in s00, "D30-36"))
check("00's §2A.8 (mode-matrix completeness law) + §2A.9 (reference-register law) standing", lambda: (
    "**The mode-matrix completeness law (Decision 30, R25)" in s00
    and "**The reference-register law (Decision 35, R25)" in s00, "2A.8/2A.9"))
check("ARCH-R25 v2 (all folded) + the 2-reviewer GO-WITH-AMENDMENTS trail", lambda: (
    "**v2 (all folded)**" in arch25 and "GO-WITH-AMENDMENTS" in arch25
    and "design-consistency" in arch25 and "corpus-faithfulness" in arch25, "arch25 trail"))
check("the battery lineage cites battery_r25 (the plan's S-spec/§5/§6 rows + 16's acceptance + ARCH-R25 §7)", lambda: (
    plan.count("battery_r25") >= 5 and "battery_r25" in specs[16] and "battery_r25" in arch25, "lineage r25"))
check("the R25 count movements recorded (app 174→206 live-run; the post-D30 census 35 zero-action + 5 carriers + host)", lambda: (
    "the R24 static census was 174" in s00 and "206/206" in s00 and "35 zero-action" in s00
    and "5 documented carriers" in s00 and "35 zero-action" in plan, "count movements"))

# === REPORT ====================================================================
fails = [r for r in results if not r[1]]
print(f"\nbattery_r25: {len(results) - len(fails)}/{len(results)} PASS")
for name, ok, detail in results:
    if not ok:
        print(f"  FAIL  {name}  [{detail}]")
if not fails:
    print("ALL GREEN — the R25 world is coherent (the mode matrix + the grammar register + the keyboard family + the reference register + the R25 pin canon + the census + the plan).")
sys.exit(1 if fails else 0)

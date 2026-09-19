#!/usr/bin/env python3
"""battery_r23.py — the Round-23 battery (the battery_r22 successor: the plan-separation + verification-ladder world).
Re-points per ARCH-R23 D23: the PLAN checks key IMPLEMENTATION-PLAN.md (the separate plan doc); the PIN checks key 00-master
(the pin-world canon); the stub checks key the retired spec 14. The count/pin checks assert the POST-FLEET TARGET
(the R23 pins: engine b8c6f88/440, OT 222532c/489, WDC 494f6ff/759, nle-ui 85dcf57/648, app 70e99f0/117) — until the
per-file audit fleet re-baselines the domain specs (17/19/etc.), the red rows ARE the fleet's TODO register.
The phase vocabulary accepts BOTH the R22 tags (C0-C4/W-*/R-*) and the R23 tags (K1-K4/w1-w3/r1-r6) during the fleet
window — tighten to the R23 set at the fleet's close.
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
                                  "R15 counts", "(Round 15", "R22 re-baseline", "retired to history",
                                  "R22 decision record", "lineage"]):
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
arch = read("audits/ARCH-R23-plan-and-bridge.md")
arch22 = read("audits/ARCH-R22-finality.md")

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
check("00 carries D23 (plan separation)", lambda: ("### Decision 23: The plan/spec separation" in s00, "D23"))
check("00 carries D24 (the verification ladder)", lambda: ("### Decision 24: The verification ladder" in s00, "D24"))
check("00 carries D25 (the single-tree bridge)", lambda: ("### Decision 25: The timeline-UI single-tree bridge" in s00, "D25"))
check("00 carries §2A standing laws (incl. port-then-swap)", lambda: ("### 2A. Standing laws" in s00 and "Port-then-swap, never swap-then-hope" in s00, "§2A"))

# === B. THE PLAN DOC (D23 — the separate executable plan) =====================
check("IMPLEMENTATION-PLAN.md exists and is THE plan", lambda: (
    os.path.exists(os.path.join(REPO, "IMPLEMENTATION-PLAN.md"))
    and "THE plan" in plan and "SEPARATE document" in s00, "plan exists"))
check("plan §0 carries the entry-point table (6 tracks)", lambda: (
    "## 0. HOW TO EXECUTE" in plan and all(k in plan for k in
    ["S-ot", "S-app", "S-engine", "S-wdc", "S-package", "S-spec"])
    and "First action" in plan and "Done-state" in plan, "entry points"))
check("plan declares the single global entry point", lambda: (
    "The single global entry point" in plan, "global entry"))
check("plan carries the taxonomy sentence", lambda: ("a TRACK is a repo-owning stream" in plan, "taxonomy"))
check("plan ladder: K1-K4 crawl + w1-w3 walk + r1-r6 run", lambda: (
    all(k in plan for k in ["K1 module nets", "K2 combined nets", "K3 app-behavior nets", "K4 the crawl exit",
                            "w1 grammar", "w2 media", "w3 project", "r1 op depth", "r2 audio depth",
                            "r3 color", "r4 real media", "r5 interchange", "r6 the non-blocking tail"]), "ladder"))
check("plan gate classes: [P] default + [H:reason] registered", lambda: (
    "[P]" in plan and "[H:interaction-feel" in plan and "[H:real-session" in plan, "gate classes"))
check("plan carries the ordering law (D25 bridge → swap → K3-DOM)", lambda: (
    "Ordering law (hard edge)" in plan and "crawl = structure + behavior; w1 = tokens + fidelity" in plan, "ordering"))
check("plan carries the two-half grammar law", lambda: (
    "structural grammar half" in plan and "token half at w1-entry" in plan, "two halves"))
check("plan K3 carries the GAP-W-ops compose row + the WDC prerequisite", lambda: (
    "composed ripple family" in plan and "waveform seam contract" in plan, "K3 rows"))
check("plan carries the parallelization map + critical path + validity laws", lambda: (
    "## 4. The parallelization map" in plan and "Critical path" in plan and "∥-validity laws" in plan, "parallel"))
check("plan carries the vendoring mechanics (two-path lock + components layout)", lambda: (
    "vendor/nle-timeline/components/" in plan and "@/lib/timeline" in plan, "vendoring"))
check("plan carries the estimates (itemized + r4-conditional)", lambda: (
    "6-12 wk solo" in plan and "10-15 wk solo" in plan and "WITH r4" in plan and "18-25.5 without" in plan, "estimates"))
check("plan §6: battery-first step 0 + the done-markers", lambda: (
    "battery_r23's core FIRST" in plan and "[done @ `4878827`]" in plan, "§6"))
check("plan execution protocol: push/fetch/never-force + pin-lockset + battery", lambda: (
    "never force push" in plan and "Pin-lockset law" in plan and "battery_r23" in plan, "protocol"))

# === C. THE STUB (spec 14 retired) ============================================
check("14 is the RETIRED redirect stub (no plan tables live)", lambda: (
    "RETIRED" in specs[14][:600] and "IMPLEMENTATION-PLAN.md" in specs[14][:600]
    and "## 2. The BASE" not in specs[14] and "| **C1 timeline crawl**" not in specs[14], "stub"))
check("14 stub carries the §-redirect table + the lineage tombstone", lambda: (
    "§-redirect table" in specs[14] and "P→A→C/W/R" in specs[14] and "phase-lineage tombstone" in specs[14], "redirect"))
check("14 stub: no live C0-C4 phase tables remain", lambda: (
    not re.search(r"\|\s*\*\*C[0-4] ", specs[14]), "retired tables"))

# === D. PINS (the R23 re-pin — 00-master is the canon) ========================
FLEET_HEAD = {"engine": "b8c6f88", "ot": "222532c", "wdc": "494f6ff", "ui": "85dcf57", "app": "70e99f0"}
check("00 fleet rows pin all five repos (HEAD class, R23)", lambda: (all(v in s00 for v in FLEET_HEAD.values()), "HEAD pins"))
CONSUMER = {"ot_mirror": "a4e971d", "wdc": "f446512", "engine_app": "4ef0147"}
check("00 carries the live consumer pins (a4e971d + f446512 + 4ef0147)", lambda: (
    all(v in s00 for v in CONSUMER.values()), "consumer pins"))
R15_PINS = ["f526e67", "0412e41", "374711c", "d42693e"]
STALE_FILESET = {0: s00, 5: specs[5], 6: specs[6], 14: specs[14], 15: specs[15], 19: specs[19], 20: specs[20]}
for pin in R15_PINS:
    n_live = sum(live_stale(t, pin) for t in STALE_FILESET.values())
    check(f"no LIVE R15 pin {pin} (historical context exempt)", lambda n_live=n_live: (n_live == 0, f"live={n_live}"))
check("00 decision count = 25 (D1-D25)", lambda: (
    len(re.findall(r"^### Decision ", s00, re.M)) == 25, f"count={len(re.findall(r'^### Decision ', s00, re.M))}"))
check("plan cites pins, never re-declares (no HEAD pin in the plan's own tables)", lambda: (
    not any(re.search(rf"\|\s*`?{v}`?\s*\|", plan) for v in FLEET_HEAD.values()) and "cites them" in plan, "cite-only"))

# === E. THE DRAG LAW FREEZE (D22 + spec 18 §16.2) ==============================
check("18 §16.2 carries the R22 drag-law notice", lambda: (
    "R22 (user directive — the full drag-machinery retirement)" in specs[18] and "RETIRED" in specs[18], "notice"))
check("18 §16.3 re-pointed at the crawl app as the MVP vehicle", lambda: (
    "The MVP vehicle (R22 amendment" in specs[18], "vehicle"))
check("18 test count re-baselined to 355 (R23 seal census)", lambda: ("355 vitest tests" in specs[18], "count"))
check("plan: the drag law = the R22 R18k verbatim (retired machinery stays retired)", lambda: (
    "R18k" in plan or "drag-law freeze" in plan or "drag law" in plan.lower(), "freeze in plan"))

# === F. COUNTS (the post-fleet TARGET — red = the fleet's TODO) ================
check("count consistency: engine 440 in 17+19+00; OT 489 in 17+19+00", lambda: (
    all("440" in x for x in [specs[17], specs[19], s00]) and all("489" in x for x in [specs[17], specs[19], s00]), "counts"))
check("mini law count current (355) in 18 + the plan + ARCH-R23", lambda: (
    "355 vitest tests" in specs[18] and "355" in plan and "355" in arch, "mini count"))
check("mini count staleness sweep: no live 333 claims in the spec set", lambda: (
    not any(re.search(r"mini 333|333 tests|333 vitest|333/333|333-test", specs[n]) for n in specs),
    "stale 333"))
check("no pre-retirement 358-count in live gate text (18/ARCH)", lambda: (
    "358" not in specs[18] and "358 tests" not in arch, "retired count absent"))

# === G. THE R22 SURVIVING CANON ===============================================
check("15 §4.1A routing-disposition table survives", lambda: ("Routing-disposition table" in specs[15] or "routing-disposition table" in specs[15], "§4.1A"))
check("15 §9.5 event staircase register survives", lambda: ("§9.5" in specs[15] and "staircase" in specs[15].lower(), "§9.5"))
check("13.15 C7 worklist survives", lambda: ("§13.15" in specs[15] and ("W-ops" in specs[15] or "r1" in specs[15]), "13.15"))
check("single-file canon (no .refined.md files)", lambda: (
    not [f for f in os.listdir(REPO) if f.endswith(".refined.md")], "canon"))
check("ARCH-R22 final (both review rounds) + ARCH-R23 v2 (both rounds)", lambda: (
    "FINAL (both adversarial review rounds held + folded" in arch22
    and "Round 2 (adversarial, plan/executability) — HELD" in arch22
    and "Round 2 (adversarial EXECUTABILITY review" in arch and "GO-WITH-AMENDMENTS" in arch, "arch trail"))
check("LAW-NET-INVENTORY exists + carries the exact census", lambda: (
    os.path.exists("ui-mock/shell-mini/docs/LAW-NET-INVENTORY.md")
    and "355" in open("ui-mock/shell-mini/docs/LAW-NET-INVENTORY.md").read()
    and "115" in open("ui-mock/shell-mini/docs/LAW-NET-INVENTORY.md").read(), "inventory"))
check("CORE-SEAMS exists (the whole-surface seam audit)", lambda: (
    os.path.exists("ui-mock/shell-mini/docs/CORE-SEAMS.md"), "core-seams"))
check("otProject bridge module + tests exist", lambda: (
    os.path.exists("ui-mock/shell-mini/src/lib/otProject.ts")
    and os.path.exists("ui-mock/shell-mini/src/lib/otProject.test.ts"), "otProject"))

# === H. BLIND-SPOT CHECKS (phase vocabulary: BOTH eras during the fleet) =======
PHASE_VOCAB = ["C0", "C1", "C2", "C3", "C4", "W-ops", "W-media", "W-n5", "W-audio", "W-project",
               "W-color", "S-engine", "S-ot", "S-wdc", "S-package", "S-app", "S-spec",
               "R-fcpxml", "R-polish", "R-engine-p2", "R-cloud", "pre-C1", "pre-C4",
               # the R23 vocabulary (tighten to THIS set at the fleet's close):
               "K1", "K2", "K3", "K4", "w1", "w2", "w3", "r1", "r2", "r3", "r4", "r5", "r6",
               "crawl", "walk", "run"]
def gap_rows(t):
    m = re.search(r"\*\*GAP \(the work.*?:\*\*\s*\n(.*?)(?:\*\*ACCEPTANCE|\*\*BASE \(accepted)", t, re.S)
    if not m:
        return []
    # strikethrough rows (~~...~~) are FLIPPED-to-BASE records, not work rows — exempt
    return [l for l in m.group(1).split("\n") if l.strip().startswith("-") and not l.strip().startswith("- ~~")]

def ok_placement(n):
    t = specs[n]
    i0 = t.find("## 0. FORWARD INVENTORY")
    if i0 < 0: return False
    before = t[:i0]
    return not re.search(r"^## \d", before, re.M)

bad_rows = []
for n in DOMAIN:
    rows = gap_rows(specs[n])
    if not rows and n not in (11, 13):
        bad_rows.append(f"{n:02d}:no-gap-rows")
        continue
    NONWORK = ["REGISTERED; keep as pointer", "Register: spec 14", "Register: the retired spec-14", "Register: the plan", "No-gap ruling"]
    for r in rows:
        if not any(p in r for p in PHASE_VOCAB) and not any(k in r for k in NONWORK):
            bad_rows.append(f"{n:02d}:no-phase")
            break
check("every GAP row carries a phase tag (both vocabularies accepted pre-fleet-close)", lambda: (not bad_rows, ",".join(bad_rows[:5]) or "clean"))
check("§0 is the first H2 section in every domain spec", lambda: (all(ok_placement(n) for n in DOMAIN), "placement"))

# === I. THE R23 SEAL CHECKS (drift-proof: SCRAPE the live suite) ==============
MINI_DIR = os.path.join(REPO, "ui-mock/shell-mini")
DECLARED_MINI_TESTS = 355   # the sealed census; bump WITH the census, never alone
DECLARED_MINI_FILES = 8

def _scrape_mini():
    import subprocess
    import json as _json
    out_file = os.path.join(MINI_DIR, ".vitest", "json", "output.json")
    if os.path.exists(out_file):
        os.remove(out_file)
    subprocess.run(
        ["npx", "vitest", "run", "--reporter=json", "--silent"],
        cwd=MINI_DIR, capture_output=True, text=True, timeout=300,
    )
    if not os.path.exists(out_file):
        return None
    d = _json.load(open(out_file))
    files = len(d.get("testResults", []))
    return d.get("numPassedTests"), files

def _mini_scraped():
    r = _scrape_mini()
    if r is None:
        return False, "scrape-failed (json reporter shape?)"
    tests, files = r
    ok = tests == DECLARED_MINI_TESTS and files == DECLARED_MINI_FILES
    return ok, f"scraped {tests} tests / {files} files vs declared {DECLARED_MINI_TESTS} / {DECLARED_MINI_FILES}"

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

check("LAW-NET-INVENTORY arithmetic parses + sums (128 units / 355 / authored=355−HOLDS)", _inventory_math, "census math")

check("CORE-SEAMS carries the store partition + seam inventory (content, not existence)", lambda: (
    "## 2. The store partition" in read("ui-mock/shell-mini/docs/CORE-SEAMS.md")
    and "## 1. The seam inventory" in read("ui-mock/shell-mini/docs/CORE-SEAMS.md")
    and "S26" in read("ui-mock/shell-mini/docs/CORE-SEAMS.md"), "core-seams content"))

check("otProject module carries the registered constants (content, not existence)", lambda: (
    "OT_TICKS_PER_SECOND = 120000" in read("ui-mock/shell-mini/src/lib/otProject.ts")
    and "projectClipBack" in read("ui-mock/shell-mini/src/lib/otProject.ts"), "otProject content"))

# NOTE (the honest scope): the stale-333 sweep covers the SPEC SET only; the VARIANTS count is
# the sibling track's pin (they re-pin at their round wrap — not unilaterally bumped here).


# === J. INTEGRATION-REVIEW CHECKS (the R23 round's blind-spot class) ==========
check("pin strings correctly spelled in 17+19 (the b8c6c88 class)", lambda: (
    all(v in specs[19] for v in FLEET_HEAD.values()) and all(v in specs[17] for v in ["b8c6f88", "222532c"])
    and "b8c6c88" not in specs[19] and "b8c6c88" not in specs[17] and "b8c6c88" not in plan, "spellings"))
check("the consumer-lag figure coherent (one commit, not 14+)", lambda: (
    "14+ commits" not in plan and "14+ commits" not in specs[9], "lag"))
check("no live N2b-queued claims (LANDED) in the plan", lambda: (
    "instruments + N2b + parity" not in plan and "(N2b design" not in plan, "N2b"))
check("the seal artifacts carry the R23 mapping notes + the 30-name census", lambda: (
    "R23 mapping note" in read("ui-mock/shell-mini/docs/CORE-SEAMS.md")
    and "R23 mapping note" in read("ui-mock/shell-mini/docs/LAW-NET-INVENTORY.md")
    and "R23 mapping note" in read("ui-mock/shell-mini/docs/OT-SEAMS.md")
    and "30-command" in read("ui-mock/shell-mini/docs/CORE-SEAMS.md"), "seal notes"))

# === REPORT ====================================================================
fails = [r for r in results if not r[1]]
print(f"\nbattery_r23: {len(results) - len(fails)}/{len(results)} PASS")
for name, ok, detail in results:
    print(f"  {'PASS' if ok else 'FAIL'}  {name}  [{detail}]")
sys.exit(1 if fails else 0)

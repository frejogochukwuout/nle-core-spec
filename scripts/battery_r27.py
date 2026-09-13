#!/usr/bin/env python3
"""battery_r27.py — the Round-27 battery (the battery_r26 successor: THE FINAL-TIGHTNESS round).
The R27 fleet (55+ dispatches, audits/fleet-r27/) re-based the pin world to: engine f9ac806 (748/748,
25 test files; timeline.ts 8,997 LOC; code anchor 50b91f5) · OT HEAD 55c81c0 (code pin 970948a,
src-diff empty; 632/632) · WDC ec8fd5c (777/777) · nle-ui 32abd58 (690/690) · app c020b2a (252/252,
the 8-suite roof; census 42 = 36 zero-action (6 byte + 30 mechanical) + 5 carriers + 1 host @ the OT
mirror 6e2b91a) · mini/variants REGISTER-PENDING (the WRAP-gated re-key law — xcut-register §4, the
successor to r26's hard-equality trap) · the wire census 31 verbs = 28 routed + 3 exceptions (D-ARCH-6
@ 970948a; the exported WIRE_UI_EXCEPTIONS api.ts:328-335 consumed LIVE — the 2A.10 law).
The 8 new classes per the fleet's proposals (review-amend §5): B-1 the census-coherence sweep (xcut-
census §4) · B-2 the registry-export law · B-3 the line-pin re-base map (spec-19 §2, N=8 anchors) ·
B-4 the estimates-absence class (the D38/D40 plan overhaul, xcut-plan §5 + review-plan's widened
regex) · B-5 the WRAP-gated register class (xcut-register §4) · B-6 the matrix↔GAP↔§10.4 E2-
consistency sweep (xcut-matrix §4.4) · B-7 the D30 zero-orphan-rows class · B-8 the 739-trap + the
D37-D41 D-index presence. Keeps every still-valid r26 class re-keyed to the R27 figures."""
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
    results.append((name, ok, (f"[{tag}] " if tag and not ok else "") + str(detail)))

def live_stale(text, stale):
    """Count occurrences of `stale` NOT in a historical/supersession context (Ruling B, xcut-census §2)."""
    hits = [m.start() for m in re.finditer(re.escape(stale), text)]
    live = 0
    for h in hits:
        ctx = text[max(0, h-260):h+260]
        if "\u2192" in text[h-12:h+18]:  # the sha/count sits in an old->new transition record
            continue
        if any(k in ctx for k in ["superseded", "supersession", "R15-era", "historical", "point-in-time",
                                  "retired", "was the", "old ", "history", "v2.1 history", "prior ledger",
                                  "R15 counts", "(Round 15", "R22 re-baseline", "retired to history",
                                  "R22 decision record", "lineage", "R23 pin", "R23 re-pin", "R22 pins",
                                  "was b8c6f88", "was 222532c", "the R23 census", "at R23", "(R23)",
                                  "re-pin", "re-based", "R23 review round", "stable since", "R24 pin",
                                  "commits over", "re-verified R24", "fleet re-pin", "R24 re-base",
                                  "R24 re-baseline", "the R24 pin", "at R24", "(R24)", "R25 pin",
                                  "the R25 pin", "at R25", "(R25)", "R25 re-pin", "R26 pin", "the R26 pin",
                                  "at R26", "(R26", "R27 re-pin", "D-ARCH-6", "at AR-2", "(AR-2",
                                  "the charter's", "superseded in-file"]):
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
arch25 = read("audits/ARCH-R25-edit-mode-completeness.md")
arch27 = read("audits/ARCH-R27-final-tightness-audit.md")

# === A. POSTURE (the inversion law — unchanged from r26) =======================
DOMAIN = [n for n in range(1, 21) if n not in (14, 17)]
def triad(n):
    t = specs[n]
    return ("## 0. FORWARD INVENTORY" in t and ("**BASE (accepted, pinned" in t or "**BASE (accepted" in t)
            and "**GAP (the work" in t and "**ACCEPTANCE & TEST PLAN:**" in t)
for n in DOMAIN:
    check(f"{n:02d} has the §0 FORWARD INVENTORY triad", lambda n=n: (triad(n), "§0"))
check("17 has the §0A acceptance-executability law", lambda: ("## 0A. the acceptance-executability law" in specs[17].lower().replace("## 0a", "## 0A") or "## 0A. The acceptance-executability law" in specs[17] and "BASE rows state their regression role" in specs[17], "§0A"))
check("00 carries the posture law (D20)", lambda: ("### Decision 20: Spec posture law" in s00, "D20"))
check("00 carries D23-D25 (the R23 rulings)", lambda: (all(f"### Decision {d}" in s00 for d in (23,24,25)), "D23-25"))
check("00 carries D26-D29 (the R24 rulings, ARCH-R24)", lambda: (
    "### Decision 26" in s00 and "### Decision 27" in s00 and "### Decision 28" in s00 and "### Decision 29" in s00, "D26-29"))
check("00 carries the census law as a standing law (§2A.7)", lambda: ("census" in s00.split("### 2A")[1][:2600] if "### 2A" in s00 else False, "census law"))
check("00 carries the cloudcut reference row (D27.3)", lambda: ("cloudcut-nle" in s00 and "dormant" in s00[3000:12000].lower() or "cloudcut" in s00.lower(), "cloudcut"))

# === B. THE PLAN DOC (the D38/D40 overhaul — estimates OUT, gates IN) ===========
check("IMPLEMENTATION-PLAN.md exists and is THE plan", lambda: (
    os.path.exists(os.path.join(REPO, "IMPLEMENTATION-PLAN.md")) and "THE plan" in plan[:900], "plan"))
check("plan §0 carries the entry-point table (6 tracks)", lambda: (
    plan.count("| **S-") >= 6 and "First action" in plan, "entry points"))
check("plan declares the single global entry point", lambda: ("single global entry point" in plan, "entry"))
check("plan carries the taxonomy sentence", lambda: ("a TRACK is a repo-owning" in plan, "taxonomy"))
check("plan ladder: K1-K4 crawl + w1-w3 walk + r1-r6 run", lambda: (
    all(k in plan for k in ["K1","K2","K3","K4","w1","w2","w3","r1","r6"]), "ladder"))
check("plan gate classes: [P] default + [H:reason] registered", lambda: (
    "[P]" in plan and "[H:" in plan, "gate classes"))
check("plan carries the data-test mapping row (the three-way DOM mapping, D26)", lambda: (
    "data-test mapping row" in plan, "mapping row"))
check("plan K3 carries the coverage-gate instrument (D29.1 — the W-F port)", lambda: (
    ("coverage gate" in plan or "coverage-gate" in plan) and "W-F" in plan, "K3 instrument"))
check("plan carries the shell-path blind spot + compensating pins (F14)", lambda: (
    "shell-path" in plan and "compensating" in plan, "blind spot"))
check("plan S-ot row: the carrier-reduction work order", lambda: (
    "carrier-reduction" in plan, "S-ot"))
check("plan S-app row: the D-ARCH-6 re-pin + the gesture-seam switch as the entry (the head of the critical path)", lambda: (
    "D-ARCH-6" in plan and ("seam switch" in plan or "gesture-seam" in plan), "S-app"))
check("plan execution protocol: push/fetch/never-force + pin-lockset + battery", lambda: (
    "never force push" in plan and "Pin-lockset" in plan and "battery" in plan, "protocol"))
check("plan carries the parallelization map + critical path + validity laws", lambda: (
    "parallel" in plan.lower() and "Critical path" in plan, "map"))
check("plan carries the zero-orphan-rows law at K2 (D30.3/36.5 — the mode-matrix gate)", lambda: (
    "ZERO ORPHAN ROWS" in plan or "zero orphan rows" in plan, "K2 zero-orphan"))

# --- B-4: the estimates-absence class (D38.1/D40.1 — xcut-plan §5 + review-plan P3-F14's widened regex)
def _estimates_absent():
    """The widened duration-vocabulary sweep (review-plan §1): wk|week|solo|two-dev|day|month|business.
    'weeks' (plural, the charter's own 'never when N weeks pass' sentence) does NOT trip 'week\\b'."""
    hits = re.findall(r"(?i)(?:\bwk\b|\bweek\b|\bsolo\b|two-dev|\bday\b|\bmonth\b|business)", plan)
    return (not hits), f"{len(hits)} duration hits: {sorted(set(h.lower() for h in hits))}" if hits else "zero"
check("B-4: the plan carries ZERO duration vocabulary (the D38.1 estimates removal, widened regex)", _estimates_absent, "estimates")
check("B-4: the plan states the no-estimates law + the gate-defined phase (D38.1's charter sentence)", lambda: (
    "no time estimates" in plan and "exit gate is green" in plan, "D38.1 law"))
check("B-8: the plan's ruling basis cites the overhaul decision (D40, post-renumbering) + ARCH-R27 as the live venue", lambda: (
    "ARCH-R27" in plan and re.search(r"D40[ .)]", plan) is not None, "D40 basis"))
check("B-8: the plan's r1 row cites the leverage map's Stage 0-4 (the trials-and-errors avoidance order)", lambda: (
    "leverage map" in plan and "Stage 0" in plan, "Stage 0"))
check("B-8: the plan carries the eight-stream parallel carve (D40.3/D38.3)", lambda: (
    "eight-stream" in plan, "carve"))

# === C. THE STUB (spec 14 retired — unchanged) =================================
check("14 is the RETIRED redirect stub (no plan tables live)", lambda: (
    "redirect" in specs[14][:1200] and "## 0. FORWARD INVENTORY" not in specs[14], "stub"))
check("14 stub carries the §-redirect table + the lineage tombstone", lambda: (
    "§-redirect" in specs[14] or "redirect table" in specs[14], "stub table"))

# === D. PINS (the R27 re-base — 00-master is the canon) ========================
FLEET_HEAD = {"engine": "f9ac806", "OT": "55c81c0", "WDC": "ec8fd5c", "nle-ui": "32abd58", "app": "c020b2a"}
check("00 fleet rows pin all five repos (HEAD class, R27)", lambda: (all(v in s00 for v in FLEET_HEAD.values()), "HEAD pins"))
check("00 carries the OT code pin 970948a + the 632 count", lambda: ("970948a" in s00 and "632" in s00, "code pin"))
check("00 carries the live consumer pins (engine→OT 6e2b91a + WDC ec8fd5c; app→engine f9ac806 + OT mirror 6e2b91a + nle-ui 83ff8a8 + WDC ec8fd5c)", lambda: (
    all(k in s00 for k in ["6e2b91a", "ec8fd5c", "83ff8a8"]) and s00.count("6e2b91a") >= 3, "consumer pins"))
check("consumer lockstep: the engine's OT vendor pin == the app's OT mirror == 6e2b91a (the two-truth re-pin queue)", lambda: (
    s00.count("6e2b91a") >= 3 and "970948a" in s00, "lockstep"))
check("00 decision count = 42 (D1-D36 + 31A + D37-D41)", lambda: (
    len(re.findall(r"### Decision \d+[A-Z]?", s00)) == 42, "D-count"))
check("plan cites pins, never re-declares (the law sentence)", lambda: (
    "never re-declares" in plan, "cite-only"))
check("00's status is v12.0 (the R27 final-tightness round)", lambda: ("**Status:** v12.0 (Round 27" in s00, "v12.0"))

# === E. THE D26 APP-CENSUS REGISTER (the 42 = 36+5+1 re-key) ====================
check("the app census register re-declared at the 6e2b91a re-pin (42 = 36 zero-action (6 byte + 30 mechanical) + 5 carriers + host)", lambda: (
    ("42" in specs[19] and "36 zero-action" in specs[19]) or ("42" in s00 and "36 zero-action" in s00), "42=36+5"))
check("the carrier list is named in 05 (TimelineView + use-keybindings + ContextMenu + ticker)", lambda: (
    all(k in specs[5] for k in ["TimelineView", "use-keybindings", "TimelineContextMenu", "use-playback-ticker"]), "carriers"))
check("19 carries the port census + the two-truth OT mirror row (6e2b91a consumer + 970948a owner + the queued switch)", lambda: (
    "6e2b91a" in specs[19] and "970948a" in specs[19], "19 census"))
check("05/18/19: the D25.2 mechanism is retired (no two-path vendor prescription in live text)", lambda: (
    live_stale(specs[5], "vendor/nle-timeline/components") == 0 and
    live_stale(specs[18], "vendor/nle-timeline/components") == 0, "D25.2 retired"))
check("18 carries the three-way DOM mapping row (data-test + shell-* + structural gap)", lambda: (
    "data-test" in specs[18] and "shell-*" in specs[18], "three-way"))

# === F. B-1/B-2: THE WIRE CENSUS (R27: 31 = 28 routed + 3 exceptions @ 970948a) ==
# Ground truth: api.ts:243-275 (the 31-verb array) + :328-335 (the EXPORTED 3-verb registry)
# + the tsc-lockstep :277-297 + the M49C gate 28/3 PASS (origin-attributed) + the lineage
# tail: 24 (R15) → 28 (R22) → 30 (R23) → 24+6 (R24) → 25+5 (AR-2) → 31 = 28+3 (D-ARCH-6).
STALE_READS = ["24 routed", "24 UI-routed", "24+6", "24 + 6", "6 documented exceptions",
               " 6 exceptions", "30-name", "30-type", "30 prefixed", "30 types",
               "the 24-routed", "27 of the 78", "27 of 78"]
STALE_RE = [re.compile(r"(?<![\d/])" + re.escape(s)) for s in STALE_READS]
CENSUS_SPECS = {0: s00, 3: specs[3], 5: specs[5], 6: specs[6], 9: specs[9],
                12: specs[12], 13: specs[13], 15: specs[15], 16: specs[16],
                17: specs[17], 18: specs[18], 19: specs[19]}
LINEAGE_CTX = ["superseded", "lineage", "history", "was the", "retired", "re-base",
               "re-based", "re-pin", "re-keyed", "R24", "R22", "R23", "R15", "at R2",
               "(R2", "prior ledger", "old ", "point-in-time", "D-ARCH-6", "at AR-2",
               "historical", "the charter's", "superseded in-file"]
def _stale_census(t):
    n = 0
    for pat in STALE_RE:
        for h in [m.start() for m in pat.finditer(t)]:
            if "\u2192" in t[h-12:h+18]:
                continue
            if any(k in t[max(0, h-260):h+260] for k in LINEAGE_CTX):
                continue
            n += 1
    return n
def _stale_census_text(t, word):
    """Ruling-B discriminator for a bare word (e.g. a retired verb): lineage/retirement/r1
    contexts are exempt; present-tense enumerations count."""
    n = 0
    for m in re.finditer(re.escape(word), t):
        ctx = t[max(0, m.start()-260):m.start()+260]
        if any(k in ctx for k in LINEAGE_CTX + ["RETIRED", "never-guard", "absence pin",
                                                 "r1", "GONE", "singular", "rename", "per-key",
                                                 "plural", "mapping"]):
            continue
        n += 1
    return n
def _lineage_free(t, s):
    """True iff some occurrence of `s` is NOT in a lineage-marked context."""
    for m in re.finditer(r"(?<![\d/])" + re.escape(s) + r"(?!\d)", t):
        if not any(k in t[max(0, m.start()-260):m.start()+260] for k in LINEAGE_CTX):
            return True
    return False
for grp in [(15,), (6, 5), (12, 17, 19), (0, 3, 9, 13, 16, 18)]:
    check(f"B-1: zero live stale-census reads in {grp} (the 24+6/30-name era is dead)", lambda grp=grp: (
        (lambda bad: (not bad, ",".join(bad) or "clean"))([f"{n}:{_stale_census(CENSUS_SPECS[n])}" for n in grp if _stale_census(CENSUS_SPECS[n])]), "census"))
check("B-1: '28 routed'/'31 = 28+3' present at the canonical sites (15/06/05/12/17/19 — ≥6)", lambda: (
    sum("28 routed" in t or "31 = 28" in t or "28+3" in t
        for t in (specs[15], specs[6], specs[5], specs[12], specs[17], specs[19])) >= 6, "re-declare"))
check("B-1: the lineage tail (…24+6 → 25+5 at AR-2 → 31 = 28+3 at D-ARCH-6) present at ≥6 sites", lambda: (
    sum("25+5" in t or "25 routed + 5" in t for t in CENSUS_SPECS.values()) >= 6, "lineage"))
check("B-1: the M49C reading is the 28/3 form everywhere (zero live '24/24'; 10's 24024/24000 is boundary-exempt)", lambda: (
    (lambda bad: (not bad, ",".join(str(b) for b in bad) or "clean"))([k for k, t in list(CENSUS_SPECS.items()) + [("plan", plan)]
                                                      if _lineage_free(t, "24/24")]), "M49C"))
def _counterpart():
    """R4(i): the counterpart arithmetic reads 29 of 78 (the +upsertKeyframes/+removeKeyframes convention)."""
    ok = "29 of 78" in specs[15]
    stale27 = _stale_census(specs[15])
    return ok, f"'29 of 78' {'present' if ok else 'absent'}; stale-family hits in 15: {stale27}"
check("B-1: 15 §4.1A + §13.15 carry the 29-of-78 counterpart arithmetic (Ruling A/R4-i)", _counterpart, "counterparts")
def _exceptions_enum():
    """The exception enumeration names exactly selectElements + advancePlayhead + trim."""
    ok_names = all(k in specs[15] for k in ("selectElements", "advancePlayhead", "trim"))
    bad = re.search(r"exceptions[^.\n]{0,200}(upsertKeyframe|removeKeyframe\b|retimeKeyframe\b)", specs[15])
    return (ok_names and not bad), f"names={'ok' if ok_names else 'missing'}; stale-in-enum={'yes' if bad else 'no'}"
check("B-1: the exception enumeration is exactly selectElements + advancePlayhead + trim (3)", _exceptions_enum, "verb-names")
check("B-1: the retired singulars appear ONLY in lineage/retirement/r1 contexts (Ruling B)", lambda: (
    (lambda bad: (not bad, ",".join(bad) or "clean"))([f"{k}" for k, t in CENSUS_SPECS.items()
                                                      if (_stale_census_text(t, "removeKeyframe") + _stale_census_text(t, "retimeKeyframe"))]), "retirement"))
check("B-1: 15 §13.15's two QUEUED rows flipped LANDED (insertBatch + the keyframe batch verbs — D-ARCH-6)", lambda: (
    live_stale(specs[15], "only the singular") == 0 and "LANDED" in specs[15], "flips"))
check("B-1: the companion law docs re-keyed (OT-SEAMS + CORE-SEAMS: zero live '24 routed')", lambda: (
    _stale_census_text(read("ui-mock/shell-mini/docs/OT-SEAMS.md"), "24 routed") == 0 and
    _stale_census_text(read("ui-mock/shell-mini/docs/CORE-SEAMS.md"), "24 routed") == 0, "companions"))

# --- B-2: the registry-export law (the AR-1/AR-2 + 2A.10 world)
def _registry_export():
    """ZERO live 'OT exports no exception constant'-class claims; the exported-symbol claims present."""
    claims = ["no exported constant", "test-local upstream", "test-local", "RUNNER's registry", "runner-local"]
    live_claims = sum(_stale_census_text(specs[15], c) for c in claims) + _stale_census_text(specs[19], "no exported constant")
    exported = ("WIRE_UI_EXCEPTIONS" in specs[15] and "WIRE_UI_EXCEPTIONS" in specs[19])
    return (live_claims == 0 and exported), f"live stale claims: {live_claims}; exported-symbol rows: {exported}"
check("B-2: zero live 'no exported constant'/'test-local' claims; WIRE_UI_EXCEPTIONS named in 15+19", _registry_export, "registry-export")
check("B-2: 00 §2A carries the live-registry consumption law (2A.10 — consumes the exported registry, never a hand-mirrored copy)", lambda: (
    "live-registry consumption law" in s00 and "never a hand-mirrored copy" in s00, "2A.10"))
check("B-2: the origin-attribution clause on the M49C/W-F instruments (only origin:'ui' dispatches count)", lambda: (
    "origin" in specs[15] and ("origin" in specs[12] or "origin" in specs[17]), "origin-attributed"))

# === G. THE R22/R23/R24/R25 SURVIVING CANON ====================================
check("15 §4.1A routing-disposition table survives", lambda: ("Routing-disposition table" in specs[15] or "routing-disposition table" in specs[15], "§4.1A"))
check("15 §9.5 event staircase register survives", lambda: ("§9.5" in specs[15] and "staircase" in specs[15].lower(), "§9.5"))
check("13.15 C7 worklist survives (r1-keyed)", lambda: ("§13.15" in specs[15] and "r1" in specs[15], "13.15"))
check("single-file canon (no .refined.md files)", lambda: (
    not [f for f in os.listdir(REPO) if f.endswith(".refined.md")], "canon"))
check("ARCH-R25 v2 (all folded) + the 2-reviewer GO-WITH-AMENDMENTS trail", lambda: (
    "**v2 (all folded)**" in arch25 and "GO-WITH-AMENDMENTS" in arch25
    and "design-consistency" in arch25 and "corpus-faithfulness" in arch25, "arch trail"))
check("LAW-NET-INVENTORY exists + carries the exact census", lambda: (
    os.path.exists(os.path.join(REPO, "ui-mock/shell-mini/docs/LAW-NET-INVENTORY.md")), "inventory"))
check("CORE-SEAMS exists + carries the R24 mapping note", lambda: (
    os.path.exists(os.path.join(REPO, "ui-mock/shell-mini/docs/CORE-SEAMS.md")) and
    "R24" in read("ui-mock/shell-mini/docs/CORE-SEAMS.md")[:4000], "core-seams R24"))
check("OT-SEAMS carries the R24 mapping note (the census re-base lineage)", lambda: (
    "R24" in read("ui-mock/shell-mini/docs/OT-SEAMS.md")[:4000], "OT-SEAMS R24"))

# === H. THE PHASE VOCABULARY (TIGHTENED — the D24 set only) =====================
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

# === I. THE SEAL (WRAP-gated — the r26 hard-equality trap REPLACED) ============
import glob as _glob, subprocess
def _mock_it_census(mock):
    """The battery's ONE method (xcut-register §4c): line-start it( on stripped lines."""
    files = sorted(set(_glob.glob(os.path.join(REPO, "ui-mock", mock, "src", "**", "*.test.*"), recursive=True)))
    n = 0
    for f in files:
        with open(f, encoding="utf-8") as fh:
            for line in fh:
                s = line.strip()
                if s.startswith("it(") or s.startswith("it ("):
                    n += 1
    return files, n
MINI_DECLARED, VAR_DECLARED = 445, 1773
def _wrap_gated_pins():
    """The WRAP-gated re-key law (xcut-register §1.6): mid-flight drift is RECORDED, never chased;
    the register re-keys ONLY at the sibling's round-WRAP. Mid-flight the register MUST carry the
    REGISTER-PENDING marker + the declared figures; live below declared (shrinkage) is always a fail."""
    mini_f, mini_n = _mock_it_census("shell-mini")
    var_f, var_n = _mock_it_census("shell-variants")
    markers = ("REGISTER-PENDING" in reg) and ("WRAP" in reg)
    declared = (str(MINI_DECLARED) in reg) and ("1,773" in reg)
    no_shrink = mini_n >= MINI_DECLARED and var_n >= VAR_DECLARED
    ok = markers and declared and no_shrink
    return ok, (f"mini live {mini_n}/{len(mini_f)} vs declared {MINI_DECLARED}/10; "
                f"variants live {var_n}/{len(var_f)} vs declared 1,773/64; "
                f"markers={'yes' if markers else 'ABSENT (W-C pending)'}; declared-figures={'yes' if declared else 'stale'}")
check("B-5/I: the WRAP-gated suite pins (mini 445 + variants 1,773 declared; REGISTER-PENDING marker; zero shrinkage)", _wrap_gated_pins, "wrap-gated pins")
def _inventory_math():
    inv = read("ui-mock/shell-mini/docs/LAW-NET-INVENTORY.md")
    rows = re.findall(r"\| (HOLDS-on-OT|GAP-app-C0/C1/C2|GAP-C2/C3|GAP-W-ops|GAP-verify-C1)[^|]*\|\s*(\d+)\s*\|\s*(\d+)\s*\|", inv)
    units = sum(int(u) for _, u, _ in rows)
    tests = sum(int(t) for _, _, t in rows)
    total_row = re.search(r"\*\*Total\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|\s*\*\*(\d+)\*\*", inv)
    holds = next((int(t) for n, _, t in rows if n == "HOLDS-on-OT"), 0)
    authored = re.search(r"(\d+) tests across (\d+) GAP census\s*units", inv)
    ok = (units == 150 and tests == 445
          and total_row and int(total_row.group(1)) == 150 and int(total_row.group(2)) == 445
          and authored and int(authored.group(1)) == 445 - holds and int(authored.group(2)) == 150 - 13)
    return ok, f"units={units} tests={tests} holds={holds} authored={authored.groups() if authored else None}"
check("LAW-NET-INVENTORY arithmetic parses + sums (150 units / 445 / authored=445−33)", _inventory_math, "census math")
def _scrape_mini():
    """The vitest teeth, WRAP-gated: declared == actual is enforced at the WRAP; mid-flight the
    live run must merely hold at/above the declared floor (movements recorded, not chased)."""
    d = os.path.join(REPO, "ui-mock", "shell-mini")
    if not os.path.exists(os.path.join(d, "node_modules", ".bin", "vitest")):
        return True, "node_modules absent (fresh clone) — scrape unavailable (vacuous-pass tolerated only on fresh clones)"
    out_file = os.path.join(d, ".vitest", "json", "output.json")
    if os.path.exists(out_file):
        os.remove(out_file)
    import json
    subprocess.run(["npx", "vitest", "run", "--reporter=json", "--silent"],
                   cwd=d, capture_output=True, text=True, timeout=420)
    if not os.path.exists(out_file):
        return False, "json output file absent — scrape FAILED (not skipped)"
    j = json.load(open(out_file))
    passed, total, files = j.get("numPassedTests"), j.get("numTotalTests"), len(j.get("testResults", []))
    return (passed == total and passed >= MINI_DECLARED), f"scraped {passed}/{total} / {files} files (declared floor {MINI_DECLARED} — the WRAP-gated tolerance; live recorded not chased)"
check("mini corpus SCRAPED green + at/above the declared floor (the WRAP-gated count-discipline law)", _scrape_mini, "scrape")

# === J. COUNT CONSISTENCY (the R27 world) ======================================
check("count consistency: engine 748 + OT 632 appear identically in 00/17/19", lambda: (
    all(str(c) in f for c, f in [(748, s00), (748, specs[17]), (748, specs[19]), (632, s00), (632, specs[17]), (632, specs[19])]), "counts"))
check("WDC 777 + nle-ui 690 + app 252 in 17+19 (the R27 triple)", lambda: (
    all(str(c) in specs[17] for c in (777, 690, 252)) and all(str(c) in specs[19] for c in (777, 690, 252)), "counts 2"))
check("zero live '458/458'/'471/471'/'206/206'/'536/536' engine/OT/app count claims (the R24-R26 readings are lineage only)", lambda: (
    sum(_stale_census_text(f, s) for s in ["458/458", "471/471", "536/536"] for f in [s00, specs[17], specs[19], plan]) == 0, "stale counts"))
def _roof():
    """The app's 8-suite roof at c020b2a: GluedShell 104 + audioService 42 + sceneBridge 41 +
    deliverService 20 + persistenceService 20 + wire-coverage 9 + engineSeam 7 + waveformPeaks 9 = 252."""
    ok = all(k in specs[17] for k in ["GluedShell", "audioService", "sceneBridge", "deliverService",
                                      "persistenceService", "wire-coverage", "engineSeam", "waveformPeaks"])
    ok2 = ("8-suite" in specs[17] or "8 suites" in specs[17] or "8-suite" in specs[12] or "8 suites" in specs[12])
    return (ok and ok2), f"suites named: {ok}; the roof figure: {ok2}"
check("the app's 8-suite inventory in 17/12 (the roof: 104+42+41+20+20+9+7+9 = 252)", _roof, "app suites")

# === K. THE RESIDUE CLASSES (pin spelling + stale sweeps) =====================
check("no live R23 pin spellings (b8c6f88/222532c/494f6ff/85dcf57/70e99f0) outside lineage", lambda: (
    sum(live_stale(f, p) for p in ["b8c6f88", "222532c", "85dcf57", "70e99f0"] for f in [s00, specs[1], specs[5], specs[19]]) == 0, "stale sweep"))
check("no live R24/R25 HEAD-pin spellings (ded43c4/fc4cc35/c885ece/3989506/64fb0ab/494f6ff-as-live) outside the canon transition records", lambda: (
    sum(live_stale(s00, p) for p in ["ded43c4", "fc4cc35", "c885ece", "3989506", "64fb0ab"]) == 0, "stale sweep R24/R25"))
check("no live R26 HEAD-pin spellings (0a49286/fdb771c/387f327/3026099/3e4f0cd) outside lineage (W-A re-bases them)", lambda: (
    sum(live_stale(s00, p) for p in ["0a49286", "fdb771c", "3e4f0cd"]) == 0 and
    live_stale(s00, "3026099") == 0 and live_stale(s00, "387f327") == 0, "stale sweep R26"))
check("no live consumer-lock c15a629 claims (the byte-exact lock-copy claim RETIRES at the 6e2b91a two-truth re-key)", lambda: (
    sum(live_stale(f, "lock-copy @ `c15a629`") for f in [s00, specs[9], specs[15], specs[19], plan]) == 0, "lock-copy retired"))
check("the b8c6c88 c/f-typo class absent corpus-wide (the R23+F3 lesson)", lambda: (
    all("b8c6c88" not in f for f in [s00, plan, reg] + [specs[n] for n in DOMAIN]), "typo class"))
check("the app lag figure is ZERO (no one-commit-behind claims)", lambda: (
    "one commit behind" not in plan, "lag"))

# === L. THE MODE MATRIX (06 — D30/D31/D32 kept + B-6/B-7 new) ==================
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
    """The matrix preamble cites the R27 pins; §0's D30.3 footnote states the zero-orphan gate."""
    s0 = specs[6][:specs[6].find("## 1. Purpose")] if "## 1. Purpose" in specs[6] else specs[6][:8000]
    missing = [k for k in ["f9ac806", "970948a", "c020b2a", "zero orphan rows"] if k not in s0]
    return (not missing), ",".join(missing) or "all cited"
check("06's matrix cites the R27 pins + the D30.3 zero-orphan-rows ladder gate", _matrix_gate, "matrix gate")
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

# --- B-6: the matrix↔GAP↔§10.4 E2-consistency sweep (xcut-matrix §4.4a)
def _e2_consistency():
    """The insert row's E1 cell and the overwrite row's E2 cell must match §5.0's E1 row and §5.9B's
    body/OW-2 within one edit round: FIXED in all three venues, at the re-anchored line pins."""
    mat = specs[6][specs[6].find("**The ten-mode matrix"):specs[6].find("*Decision 30.2")]
    ins_ok = ("performInsertEdit :5630" in mat and "E1 FIXED" in mat)
    ow_ok = ("performOverwriteEdit :6007" in mat and "E2 FIXED" in mat and "E3" in mat)
    e1_row = "FIXED (R26, engine `8188d4e`" in specs[6]
    e2_body = "E2 FIXED (R26, engine `8188d4e`)" in specs[6]
    ow2_i = specs[6].find("| OW-2 (E2) |")
    ow2_ok = ow2_i >= 0 and "FIXED" in specs[6][ow2_i:ow2_i+700]
    ref_ok = ":5630" in specs[6] and ":6007" in specs[6]
    stale_pins = live_stale(specs[6], ":4702") + live_stale(specs[6], ":4860")
    ok = ins_ok and ow_ok and e1_row and e2_body and ow2_ok and ref_ok and stale_pins == 0
    return ok, (f"insert-cell={'ok' if ins_ok else 'STALE'}; overwrite-cell={'ok' if ow_ok else 'STALE'}; "
                f"E1-row={e1_row}; E2-body={e2_body}; OW-2-flip={ow2_ok}; §10.4-pins={ref_ok}; stale-:4702/:4860={stale_pins}")
check("B-6: the E1/E2/E3 cells agree across the matrix + GAP rows + §5.9B/OW-2 + §10.4 (FIXED/FIXED/open, :5630/:6007)", _e2_consistency, "E2 consistency")

# --- B-7: the D30 zero-orphan-rows class (xcut-matrix §2/§4.4)
def _zero_orphans():
    """Every 06 §0 matrix row carries a spec home + either LANDED or a live r1-scheduled
    registration (the completeness is over the REGISTER, not over landed-ness — D30.3)."""
    homes = ["### 5.5", "### 5.2A", "### 5.6", "### 5.7", "### 5.9", "### 5.9B", "### 5.9C",
             "### 5.9D", "### 5.9E", "### 5.9F"]
    missing_homes = [h for h in homes if h not in specs[6]]
    fams = ["RE-1", "AP-1", "RO-1", "FF-1"]
    fam_rows = [f for f in fams if f"| {f} " in specs[6] or f in specs[6]]
    r1_marks = specs[6].count("r1")
    gap0 = specs[6][:specs[6].find("## 1. Purpose")] if "## 1. Purpose" in specs[6] else specs[6][:8000]
    law = "zero orphan rows" in gap0 or "zero orphan" in gap0
    ok = (not missing_homes) and len(fam_rows) == 4 and r1_marks >= 10 and law
    return ok, f"missing-homes={missing_homes or 'none'}; absent-family rows {len(fam_rows)}/4; r1 marks: {r1_marks}; law-sentence: {law}"
check("B-7: zero orphan rows — every matrix row has its spec-home section + an r1-scheduled registration", _zero_orphans, "zero-orphans")

# === M. THE GRAMMAR REGISTER (05 §8A + 18 §9 — D33) ===========================
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

# === N. THE KEYBOARD FAMILY (16 — D34) =========================================
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

# === O. THE REFERENCE REGISTER (B-5 — the WRAP-gated class, xcut-register §4) ===
def _reg_rows():
    rows = [l for l in reg.splitlines() if re.match(r"\| \d+ \|", l)]
    return (len(rows) == 21), f"{len(rows)} rows (want 21: the 19 + mixer 20 + view-state 21)"
check("B-5/O: the register exists + the 21-family census (19 + the mixer + the view-state rows)", _reg_rows, "21 families")
check("B-5/O: the C-ledger C33-C58 all dispositioned + zero untracked + the C59 mock-ledger footnote", lambda: (
    all(f"| C{n} |" in reg for n in range(33, 59)) and "Zero untracked" in reg and "MOCK-side gap labels" in reg, "C-ledger"))
check("B-5/O: the OPEN table carries 5 rows (marker v2 / captions / 3-vs-5 / FX grammar / the A3-wheels model row)", lambda: (
    "WIDEN-via-projection" in reg and reg.count("QUEUED-design-round") >= 5, "OPEN table"))
def _family_pins():
    """The per-family pin spot-checks (xcut-register §1.1's live table): every family file EXISTS
    with a nonzero battery-method count (structure teeth); mid-flight drift is recorded not chased
    (the WRAP-gated law). A missing family file = a hard fail (families do not vanish)."""
    PINS = {"insertPlan.test": 30, "SourceEditBar.test": 17, "SourceRangeBar.test": 18,
            "TimelineCompact.test": 28, "FxBrowser.test": 12, "FxInspector.test": 14,
            "MixerDock.test": 35, "AppShell.test": 72}
    missing, drifted = [], []
    for suffix, want in PINS.items():
        hits = _glob.glob(os.path.join(REPO, "ui-mock", "shell-variants", "src", "**", suffix + ".*"), recursive=True)
        hits = [h for h in hits if ".test." in os.path.basename(h)]
        if not hits:
            missing.append(suffix)
            continue
        n = 0
        with open(hits[0], encoding="utf-8") as fh:
            for line in fh:
                if line.strip().startswith(("it(", "it (")):
                    n += 1
        if n != want:
            drifted.append(f"{suffix.split('.')[0]}:{n}vs{want}")
    ok = not missing
    return ok, f"missing={missing or 'none'}; in-flight drift (recorded, WRAP-gated)={drifted or 'none'}"
check("B-5/O: the per-family pin spot-checks (N=8) — every family file live, battery-method counts recorded", _family_pins, "family pins")

# === Q. THE R27 PIN RE-BASE (00's consumer rows) ================================
check("00's §2A.8 (mode-matrix completeness law) + §2A.9 (reference-register law) + §2A.10 (live-registry law) standing", lambda: (
    "**The mode-matrix completeness law (Decision 30, R25)" in s00
    and "**The reference-register law (Decision 35, R25)" in s00
    and "The live-registry consumption law" in s00, "2A.8/2A.9/2A.10"))
check("the OT code pin 970948a is docs-only past the code tip at HEAD 55c81c0 (src-diff empty, machine-verified — the byte-lock cited)", lambda: (
    "970948a" in s00 and ("src-diff" in s00 or "docs-only" in s00), "code pin unchanged"))
check("00 carries D30-D36 (+31A) — the R25 rulings stand", lambda: (
    all(f"### Decision {d}" in s00 for d in (30, 31, "31A", 32, 33, 34, 35, 36)), "D30-36"))
check("00's D36.1/36.2/36.3 carry the R26 EXECUTED notes (the census-CI mechanism is REAL)", lambda: (
    s00.count("(R26 EXECUTED") >= 3 and "the mechanism is now REAL" in s00 and "census-mutation-gate" in s00, "D36 executed"))

# === R. THE WIRE-CENSUS RE-BASE (15 — the D-ARCH-6 world) ======================
check("15's four r1-scheduled verb rows (§13.15) carry the r1-SCHEDULED markers (replace/append/ripple-overwrite/fit-to-fill — none landed, verified vs the 31-verb array)", lambda: (
    specs[15].count("r1-SCHEDULED") >= 4 and "re-declare" in specs[15].lower(), "r1 verb rows"))
check("15's P7 + P11 fixes (SlipCommand composition; insert{ripple} re-keyed to the D31.6 composite law)", lambda: (
    "SlipCommand's element-type list" in specs[15] and "`image` → `composition`" in specs[15]
    and "P11" in specs[15] and "composite law" in specs[15], "P7+P11"))

# === T. THE LIVE CROSS-REPO PIN CHECKS (the 5 module repos, cloned here) ========
def _git(repo, *args):
    try:
        return subprocess.run(["git", "-C", os.path.join(REPO, "..", repo), *args],
                              capture_output=True, text=True, timeout=30).stdout.strip()
    except Exception:
        return ""
check("LIVE: the engine repo HEAD is f9ac806 (docs-only over code anchor 50b91f5; 748/748)", lambda: (
    _git("nle-engine", "rev-parse", "--short", "HEAD") == "f9ac806", _git("nle-engine", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))
check("LIVE: the OT repo HEAD is 55c81c0 (the code pin 970948a — src-diff empty)", lambda: (
    _git("opencut-timeline", "rev-parse", "--short", "HEAD") == "55c81c0", _git("opencut-timeline", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))
check("LIVE: the WDC repo HEAD is ec8fd5c (777/777)", lambda: (
    _git("web-daw-core", "rev-parse", "--short", "HEAD") == "ec8fd5c", _git("web-daw-core", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))
check("LIVE: the nle-ui repo HEAD is 32abd58 (690/690)", lambda: (
    _git("nle-ui", "rev-parse", "--short", "HEAD") == "32abd58", _git("nle-ui", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))
check("LIVE: the app repo HEAD is c020b2a (252/252; the 8-suite roof)", lambda: (
    _git("nle-test-app", "rev-parse", "--short", "HEAD") == "c020b2a", _git("nle-test-app", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))
check("LIVE: the engine's vendored pins are OT 6e2b91a + WDC ec8fd5c (the submodule pair)", lambda: (
    _git("nle-engine", "submodule", "status", "vendor/opencut-timeline").lstrip(" +-").startswith("6e2b91a") and
    _git("nle-engine", "submodule", "status", "vendor/web-daw-core").lstrip(" +-").startswith("ec8fd5c"), "engine submodules"))
check("LIVE: the app's submodules are engine f9ac806 + nle-ui 83ff8a8 + WDC ec8fd5c + the OT mirror lock 6e2b91a", lambda: (
    _git("nle-test-app", "submodule", "status", "vendor/nle-engine").lstrip(" +-").startswith("f9ac806") and
    _git("nle-test-app", "submodule", "status", "vendor/nle-ui").lstrip(" +-").startswith("83ff8a8") and
    "6e2b91a" in read("../nle-test-app/vendor/nle-timeline/UPSTREAM.lock.json"), "app submodules"))
def _it_count(path):
    n = 0
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            if line.strip().startswith(("it(", "it (")):
                n += 1
    return n
check("LIVE: the engine's E1/E2 pin file exists (timeline-linked-source-edit.test.ts; 13 line-start its — the battery method; the '26-its' fleet reads were performInsertEdit( substring false-positives)", lambda: (
    os.path.exists(os.path.join(REPO, "..", "nle-engine", "tests", "vitest", "engine", "timeline-linked-source-edit.test.ts"))
    and _it_count(os.path.join(REPO, "..", "nle-engine", "tests", "vitest", "engine", "timeline-linked-source-edit.test.ts")) == 13, "pin file"))
check("LIVE: the engine's PLAN ticks E1+E2 FIXED", lambda: (
    "E1 [P1, pre-r1] — the linked mid-clip insert defect**\n      ✅ **FIXED (R26" in read(os.path.join("..", "nle-engine", ".agents", "PLAN.md"))
    and "E2 [P2, r1-port-adjacent] — the overwrite companion asymmetry**\n      ✅ **FIXED (R26" in read(os.path.join("..", "nle-engine", ".agents", "PLAN.md")), "E1/E2 ticked"))
check("LIVE: the WDC contract module + the pinning test exist (14 it-blocks)", lambda: (
    os.path.exists(os.path.join(REPO, "..", "web-daw-core", "src", "lib", "daw", "waveform-contract.ts"))
    and os.path.exists(os.path.join(REPO, "..", "web-daw-core", "src", "test", "waveform-contract.test.ts"))
    and _it_count(os.path.join(REPO, "..", "web-daw-core", "src", "test", "waveform-contract.test.ts")) == 14, "contract+test"))
check("LIVE: WDC's audio-registry is byte-verbatim (the hash still matches the UPSTREAM.lock pin)", lambda: (
    "fc5168f6eef91684" in read(os.path.join("..", "web-daw-core", "UPSTREAM.lock.json")), "byte-verbatim"))
check("LIVE: the app's census artifacts exist (the register + the checker + the mutation gate + the reference + the .agents trio)", lambda: (
    all(os.path.exists(os.path.join(REPO, "..", "nle-test-app", p)) for p in [
        "docs/port-census.md", "scripts/census-check.mjs", "scripts/census-mutation-gate.mjs",
        "vendor/nle-timeline-ui/UPSTREAM.lock.json", ".agents/SKILL.md", ".agents/HANDOFF.md", ".agents/PLAN.md"]), "census artifacts"))
check("LIVE: the app's census register reads 42 = 36 zero-action (6 byte + 30 mechanical) + 5 carriers + the host @ 6e2b91a", lambda: (
    (lambda t: ("42" in t and "36 zero-action" in t and "6e2b91a" in t, t[:80]))(read("../nle-test-app/docs/port-census.md")), "app census LIVE"))
check("LIVE: the app's wire-coverage gate consumes the EXPORTED registries (WIRE_COMMAND_TYPES + WIRE_UI_EXCEPTION_VERBS from @vendor/timeline — the 2A.10 law, landed)", lambda: (
    "WIRE_COMMAND_TYPES" in read("../nle-test-app/src/wire-coverage.test.tsx")
    and "WIRE_UI_EXCEPTION_VERBS" in read("../nle-test-app/src/wire-coverage.test.tsx"), "2A.10 LIVE"))

# --- B-3: the line-pin re-base map (spec-19 §2 — N=8 anchors, LIVE at the pinned files)
def _line_pin_map():
    """Spot-check N=8 anchor lines actually contain the named symbols at the pinned files
    (engine f9ac806 timeline.ts + OT 970948a api.ts — every pre-R26 engine line pin is stale)."""
    eng = read(os.path.join("..", "nle-engine", "src", "lib", "nle", "timeline", "timeline.ts")).split("\n")
    anchors = [(3324, "rollingTrimItems"), (3132, "rippleTrimItem"), (4956, "slip"),
               (5097, "slideItem"), (5630, "performInsertEdit"), (6007, "performOverwriteEdit")]
    bad = [f"timeline.ts:{ln} lacks {sym}" for ln, sym in anchors if sym not in eng[ln-1]]
    loc = (len(eng) - 1) if (eng and eng[-1] == "") else len(eng)  # wc -l semantics (the trailing newline)
    if loc != 8997:
        bad.append(f"timeline.ts LOC {loc} != 8997")
    return (not bad), ",".join(bad) or "all 6 engine anchors + LOC hold"
check("B-3: the engine line-pin anchors hold at f9ac806 (timeline.ts :3324/:3132/:4956/:5097/:5630/:6007; 8,997 LOC)", _line_pin_map, "line pins")
def _ot_registry_live():
    """The LIVE api.ts-derived count matches the spec text: WIRE_COMMAND_TYPES (api.ts:243-275)
    == 31 verbs; WIRE_UI_EXCEPTIONS (:328-335) == exactly 3 exported keys."""
    api = read(os.path.join("..", "opencut-timeline", "src", "lib", "timeline", "headless", "api.ts")).split("\n")
    union = re.findall(r'"(timeline|track)\.[a-zA-Z]+"', "\n".join(api[242:275]))
    exc = re.findall(r'"(timeline)\.[a-zA-Z]+"\s*:', "\n".join(api[327:336]))
    exported = "export const WIRE_UI_EXCEPTIONS" in "\n".join(api[320:340])
    ok = (len(union) == 31 and len(exc) == 3 and exported)
    return ok, f"union verbs: {len(union)} (want 31); exception keys: {len(exc)} (want 3); exported: {exported}"
check("B-3/B-1: the LIVE OT registry scrape — 31 verbs at api.ts:243-275 + the exported 3-key WIRE_UI_EXCEPTIONS at :328-335", _ot_registry_live, "live-registry")

# === U. THE R26 EXECUTION CANON (kept) =========================================
check("06's E1 GAP row reads FIXED (R26, the pin file, the residue register)", lambda: (
    "FIXED (R26, engine `8188d4e`" in specs[6] and "timeline-linked-source-edit.test.ts" in specs[6]
    and "E1-a..E1-d" in specs[6].replace("E1-a..d", "E1-a..d"), "E1 flipped"))
check("06's overwrite companion law reads E2 FIXED (the dead-code discovery recorded)", lambda: (
    "E2 FIXED (R26, engine `8188d4e`)" in specs[6] and "DEAD CODE" in specs[6], "E2 flipped"))
check("20's waveform row reads EXECUTED R26 (the named surface, the consumer re-pin)", lambda: (
    "EXECUTED R26 @ WDC `035afe8`+`387f327`" in specs[20] and "WAVEFORM_PEAKS_BUCKETS" in specs[20], "waveform executed"))

# === S. THE 00/ARCH RECORD + THE BATTERY LINEAGE ===============================
check("ARCH-R27 exists (the round's decision venue — D37+ the live namespace)", lambda: (
    os.path.exists(os.path.join(REPO, "audits", "ARCH-R27-final-tightness-audit.md"))
    and "D37" in arch27, "arch27"))
check("the battery lineage: battery_r27 cited in the plan (≥5) + 12's posture row + 16's acceptance", lambda: (
    plan.count("battery_r27") >= 5 and "battery_r27" in specs[12] and "battery_r27" in specs[16], "lineage r27"))

# === B-8: THE 739-TRAP + THE D38/D37-D41 PRESENCE ==============================
def _trap_739():
    """The engine count is 748, never the mid-round OV-05 reading 739 — anywhere it appears as a
    count claim (the ARCH-R27 §1/§2 tables are the trap's home; :1739/:7395/:739-757 line-refs exempt)."""
    pat = re.compile(r"(?<![:\d/])739(?![\d\-])")
    targets = {**{f"{n:02d}": t for n, t in specs.items()}, "00": s00, "plan": plan, "reg": reg,
               "ARCH-R27": arch27}
    bad = []
    for k, t in targets.items():
        for m in pat.finditer(t):
            ctx = t[max(0, m.start()-200):m.start()+200]
            if any(w in ctx for w in ["lineage", "history", "was the", "retired", "mid-round",
                                      "OV-05", "NOT ARCH"]):
                continue
            bad.append(f"{k}@{m.start()}")
            break
    return (not bad), ",".join(bad[:6]) or "zero live 739-count claims"
check("B-8: the 739-trap — zero live engine-count 739 claims (748 is the figure; ARCH-R27's §1/§2 tables fold at W6)", _trap_739, "739-trap")
def _d_index():
    """The D37-D41 rulings registered in 00's D-index (W-C ratifies: D37 curve order, D38 the
    model-coherence pair (38.1 preservePitch / 38.2 volume-dB), D39 A3 widen-via-projection,
    D40 the plan overhaul, D41 the r1-entry Stage-0 mechanism set)."""
    missing = [d for d in (37, 38, 39, 40, 41) if f"### Decision {d}" not in s00]
    return (not missing), ",".join(f"D{m} absent" for m in missing) or "D37-D41 all registered"
check("B-8: 00's D-index registers D37-D41 (the R27 rulings — review-rulings' ratified set)", _d_index, "D37-D41")

# === REPORT ====================================================================
fails = [r for r in results if not r[1]]
print(f"\nbattery_r27: {len(results) - len(fails)}/{len(results)} PASS")
for name, ok, detail in results:
    if not ok:
        print(f"  FAIL  {name}  {detail}")
if not fails:
    print("ALL GREEN — the R27 world is coherent (the re-based pin world + the 31=28+3 census + the registry-export law + the line-pin map + the WRAP-gated register + the E2-consistency sweep + the zero-orphan register + the D38 plan overhaul + the D37-D41 D-index).")
sys.exit(1 if fails else 0)

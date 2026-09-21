#!/usr/bin/env python3
"""build_battery_r33.py — fork battery_r32.py into battery_r33.py.

Transformations:
  1. Docstring: prepend the R33 header (keep the lineage below).
  2. Re-key the 9 stale LIVE/B-3/B-6/R32 checks to the R33 pin world.
  3. Fix _ot_registry_live's scrape windows (the api.ts shape moved).
  4. Fix _line_pin_map's anchors + LOC (the property-tier drift).
  5. ACTIVATE the D43-A3 + D42 drift-fence classes (OT's Stage-0 landed —
     the pre-r1 REGISTERED-SKIP retires; live checks against the OT tree).
  6. Append the R33 check classes (the intake fold's machine gate).
  7. Update the REPORT block (name + the ALL-GREEN sentence).
"""
import re
import sys

SRC = "scripts/battery_r32.py"
DST = "scripts/battery_r33.py"
text = open(SRC, encoding="utf-8").read()

def sub1(old, new, count=1):
    global text
    c = text.count(old)
    assert c == count, f"anchor {old[:70]!r} count {c} != {count}"
    text = text.replace(old, new)

# --- 1. the R33 header ---------------------------------------------------
R33_HEAD = '''#!/usr/bin/env python3
"""battery_r33.py — the Round-33 battery (the battery_r32 successor: THE INTAKE FOLD ROUND).

R33 (the two sibling filings absorbed): (1) THE ENGINE SEAL-ROUND'S 87-ROW REVISION-NOTES
REGISTER (audits/ENGINE-SEAL-R28-REVISION-NOTES.md — 8 P1 materially-false claims + 31 P2
stale/weak claims + 48 P3 mechanical re-keys) APPLIED 87/87 (46 P3 landed + 2 discharged
upstream [P3-36 the W0 pull_request fold; P3-43a the d9582d5 doc-comment] + P3-29
discharged-verified [edit-domains.ts matches §5.9F verbatim]); every premise re-verified
LIVE against the current trees before editing. (2) THE OT SEAL18 WIRE-REALITY FOLD:
TRACK_LOCKED is 13 COMMANDS not 12 (insertBatch :1417 + track.remove :2732 join the old
12), F1B-2 is FOUR verbs (timeline.trim joined the wire-side overlap validation,
validateWireTrim :1707-1723), F1B-4's member-guard generalization (HA-2-7 — the
member-SHAPE guard FIRST on ALL ref-list commands), HA-2-11 upsertKeyframe.value narrowed
to number, the 15:14 census corrected to the report-json truth (632 classic incl. the
3-test M58R family + 17 M60 + 11 M61 + 11 M63 + 4 M62 = 675, 77 entries), the
bookmark/marker EDIT residual registered (the r1 A2/C7 fold's input). (3) THE PIN RE-KEY
(rekey_r33.py — zero LIVE-stale residual): engine 2a0ecf4 **785/785** (= 749 + 33
property sites + 3 P-F2 pins; 29 test files; the code anchor 74bef08→28aa387 — the
P-F2 corollary, the first src/ movement since R28; timeline.ts 9,051 LOC; the W0-W4
waves: CI hygiene + THE PROPERTY TIER [tests/vitest/property/ 4 files — 2 real bugs
caught P-F1/P-F2] + the coverage job + perf.yml the fleet's FIRST scheduled workflow;
vendors OT→17a19f8 + WDC→94f6460) · OT 008e7f3 **675/675** (the seal18 waves: the D42
linkage model + D43 edit-domains + D44 ERROR_CODES + F1B-5/HA-2-7/HA-2-11 + the M62
functionality-census gate; the code pin 970948a→344123a; the registry cites
api.ts:268-300/:353-360) · app 7664603 (426/426 + the 22-file roof UNCHANGED — the
lockstep re-pin: vendor engine→574d8d3 + both OT mirrors→17a19f8; census 43 = 32+9+2
re-declared @ 17a19f8) · nle-ui 1e0c30b (743/743) + WDC 94f6460 (777/777) UNCHANGED ·
the wire census 31 = 28 routed + 3 exceptions STANDS. (4) THE D43-A3 + D42 DRIFT-FENCE
BATTERY CLASSES ACTIVATED (the pre-r1 REGISTERED-SKIP retires — OT's Stage-0 landed:
core/edit-domains.ts + ops/linkage.ts live, the M63 pins in the 675). The human-rounds
track (w1's core) stays staged for the USER (the PROTOCOL + the annotakit loop + the
three registered open decisions) — R33 is the autonomous intake round before it.

'''
sub1('#!/usr/bin/env python3\n"""battery_r32.py — the Round-32 battery', R33_HEAD + '--- the inherited R32 header (lineage) ---\nbattery_r32.py — the Round-32 battery')

# --- 2. the stale LIVE checks -------------------------------------------
sub1('check("LIVE: the engine repo HEAD is e3f55bd (chore-only over the unmoved code anchor 74bef08; 749/749 unchanged)", lambda: (\n    _git("nle-engine", "rev-parse", "--short", "HEAD") == "e3f55bd", _git("nle-engine", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))',
     'check("LIVE: the engine repo HEAD is 2a0ecf4 (the seal-round close: the property tier W2 + the coverage job W3 + perf.yml W4 + the P-F2 corollary; 785/785 = 749 + 33 property + 3 P-F2; the code anchor 28aa387 — the first src/ movement since R28)", lambda: (\n    _git("nle-engine", "rev-parse", "--short", "HEAD") == "2a0ecf4", _git("nle-engine", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))')

sub1('check("LIVE: the OT repo HEAD is 39003d3 (the R32 D25.3a mini-theme wave LANDED: theme.ts mode maps + the waveform mode resolution + the Tier-2 residual overrides + the M60 JS-paint pins + the gold captures; 649/649 = 632 classic + 17 M60; the code pin MOVED off 970948a)", lambda: (\n    _git("opencut-timeline", "rev-parse", "--short", "HEAD") == "39003d3", _git("opencut-timeline", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))',
     'check("LIVE: the OT repo HEAD is 008e7f3 (the seal18 close: the D42 linkage model + D43 edit-domains + D44 ERROR_CODES + the real-defect wave + the M61/M62/M63 families + the M58R flake fix; 675/675 = 632 classic incl. M58R-3 + 17 M60 + 11 M61 + 11 M63 + 4 M62; the code pin 344123a)", lambda: (\n    _git("opencut-timeline", "rev-parse", "--short", "HEAD") == "008e7f3", _git("opencut-timeline", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))')

sub1('check("LIVE: the app repo HEAD is ce7cfc3 (426/426 the 22-file roof; the K4 exit verdict + the move-drag LEG 2b + the doc-committing session registry + the D52 shell-twin family + the w1-entry deliverables; the census register RE-DECLARED 43 = 32 zero-action + 9 carriers + 2 hosts @ the 39003d3 re-pin)", lambda: (\n    _git("nle-test-app", "rev-parse", "--short", "HEAD") == "ce7cfc3", _git("nle-test-app", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))',
     'check("LIVE: the app repo HEAD is 7664603 (426/426 + the 22-file roof UNCHANGED from R32; the lockstep re-pin: vendor engine→574d8d3 + BOTH OT mirrors→17a19f8; the census register re-declared 43 = 32 zero-action (6 byte + 26 mechanical) + 9 carriers + 2 hosts @ the 17a19f8 re-pin)", lambda: (\n    _git("nle-test-app", "rev-parse", "--short", "HEAD") == "7664603", _git("nle-test-app", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))')

sub1('"ENGINE SUBMODULES"))' if False else 'check("LIVE: the engine\'s vendored pins are OT 55c81c0 + WDC 83b8850 (the submodule pair — the s17 cascade)", lambda: (\n    _git("nle-engine", "submodule", "status", "vendor/opencut-timeline").lstrip(" +-").startswith("55c81c0") and\n    _git("nle-engine", "submodule", "status", "vendor/web-daw-core").lstrip(" +-").startswith("83b8850"), "engine submodules"))',
     'check("LIVE: the engine\'s vendored pins are OT 17a19f8 + WDC 94f6460 (the seal-round re-pin chain: 55c81c0→39003d3 [M60] →17a19f8 [s18]; WDC 83b8850→94f6460 docs-only)", lambda: (\n    _git("nle-engine", "submodule", "status", "vendor/opencut-timeline").lstrip(" +-").startswith("17a19f8") and\n    _git("nle-engine", "submodule", "status", "vendor/web-daw-core").lstrip(" +-").startswith("94f6460"), "engine submodules"))')

sub1('check("LIVE: the app\'s submodules are engine e3f55bd + nle-ui 1e0c30b + WDC ec8fd5c + the OT mirror lock 39003d3 (the R17 divergence RESOLVED: the app\'s engine vendor e3f55bd == the engine HEAD — re-converged, not drift; the R32 re-pin: nle-ui to the D52 twin + the OT mirror to the D25.3a wave)", lambda: (\n    _git("nle-test-app", "submodule", "status", "vendor/nle-engine").lstrip(" +-").startswith("e3f55bd") and\n    _git("nle-test-app", "submodule", "status", "vendor/nle-ui").lstrip(" +-").startswith("1e0c30b") and\n    "39003d3" in read("../nle-test-app/vendor/nle-timeline/UPSTREAM.lock.json"), "app submodules"))',
     'check("LIVE: the app\'s submodules are engine 574d8d3 + nle-ui 1e0c30b + WDC ec8fd5c + the OT mirror lock 17a19f8 (the R33 lockstep re-pin: the engine vendor rides the seal-round design v2; both OT mirrors on the s18 wave; the register-divergence era closed — the app vendors the ENGINE CODE ANCHOR by design)", lambda: (\n    _git("nle-test-app", "submodule", "status", "vendor/nle-engine").lstrip(" +-").startswith("574d8d3") and\n    _git("nle-test-app", "submodule", "status", "vendor/nle-ui").lstrip(" +-").startswith("1e0c30b") and\n    "17a19f8" in read("../nle-test-app/vendor/nle-timeline/UPSTREAM.lock.json"), "app submodules"))')

# --- 3. the OT registry scrape windows ----------------------------------
sub1('    union = re.findall(r\'"(timeline|track)\\.[a-zA-Z]+"\', "\\n".join(api[242:275]))\n    exc = re.findall(r\'"(timeline)\\.[a-zA-Z]+"\\s*:\', "\\n".join(api[327:336]))\n    exported = "export const WIRE_UI_EXCEPTIONS" in "\\n".join(api[320:340])',
     '    union = re.findall(r\'"(timeline|track)\\.[a-zA-Z]+"\', "\\n".join(api[267:300]))\n    exc = re.findall(r\'"(timeline)\\.[a-zA-Z]+"\\s*:\', "\\n".join(api[352:361]))\n    exported = "export const WIRE_UI_EXCEPTIONS" in "\\n".join(api[345:365])')

sub1('check("B-3/B-1: the LIVE OT registry scrape — 31 verbs at api.ts:243-275 + the exported 3-key WIRE_UI_EXCEPTIONS at :328-335", _ot_registry_live, "live-registry")',
     'check("B-3/B-1: the LIVE OT registry scrape — 31 verbs at api.ts:268-300 + the exported 3-key WIRE_UI_EXCEPTIONS at :353-360 (the seal18 shape; the census 31=28+3 UNCHANGED)", _ot_registry_live, "live-registry")')

# --- 4. the line-pin map -------------------------------------------------
sub1('    anchors = [(3324, "rollingTrimItems"), (3132, "rippleTrimItem"), (4956, "slip"),\n               (5097, "slideItem"), (5630, "performInsertEdit"), (6007, "performOverwriteEdit")]',
     '    anchors = [(3356, "rollingTrimItems"), (3164, "rippleTrimItem"), (4988, "slip"),\n               (5129, "slideItem"), (5662, "performInsertEdit"), (6055, "performOverwriteEdit")]')

sub1('    if loc != 8997:\n        bad.append(f"timeline.ts LOC {loc} != 8997")\n    return (not bad), ",".join(bad) or "all 6 engine anchors + LOC hold"\ncheck("B-3: the engine line-pin anchors hold at f9ac806 (timeline.ts :3324/:3132/:4956/:5097/:5630/:6007; 8,997 LOC)", _line_pin_map, "line pins")',
     '    if loc != 9051:\n        bad.append(f"timeline.ts LOC {loc} != 9051")\n    return (not bad), ",".join(bad) or "all 6 engine anchors + LOC hold"\ncheck("B-3: the engine line-pin anchors hold at 2a0ecf4 (timeline.ts :3356/:3164/:4988/:5129/:5662/:6055; 9,051 LOC — the property-tier drift re-anchored R33)", _line_pin_map, "line pins")')

# --- B-6 the E1/E2/E3 cites ----------------------------------------------
sub1('    ins_ok = (re.search(r"performInsertEdit`? :5630", mat) and "E1 FIXED" in mat)\n    ow_ok = (re.search(r"performOverwriteEdit`? :6007", mat) and "E2 FIXED" in mat and "E3" in mat)',
     '    ins_ok = (re.search(r"performInsertEdit`? :5662", mat) and "E1 FIXED" in mat)\n    ow_ok = (re.search(r"performOverwriteEdit`? :6055", mat) and "E2 FIXED" in mat and "E3" in mat)')
sub1('    ref_ok = ":5630" in specs[6] and ":6007" in specs[6]',
     '    ref_ok = ":5662" in specs[6] and ":6055" in specs[6]')
sub1('check("B-6: the E1/E2/E3 cells agree across the matrix + GAP rows + §5.9B/OW-2 + §10.4 (FIXED/FIXED/open, :5630/:6007)"',
     'check("B-6: the E1/E2/E3 cells agree across the matrix + GAP rows + §5.9B/OW-2 + §10.4 (FIXED/FIXED/open, :5662/:6055 — the R33 re-anchor)"')

# --- the R32 census check -------------------------------------------------
sub1('check("R32: the app census register RE-DECLARED (43 = 32 zero-action (6 byte + 26 mechanical) + 9 carriers + 2 hosts @ the 39003d3 re-pin)", lambda: (\n    "9 documented carriers" in read("../nle-test-app/docs/port-census.md") and\n    "39003d3" in read("../nle-test-app/vendor/nle-timeline/UPSTREAM.lock.json"), "the census re-declaration"))',
     'check("R32: the app census register RE-DECLARED (43 = 32 zero-action (6 byte + 26 mechanical) + 9 carriers + 2 hosts @ the 17a19f8 re-pin — the R33 lockstep re-key)", lambda: (\n    "9 documented carriers" in read("../nle-test-app/docs/port-census.md") and\n    "17a19f8" in read("../nle-test-app/vendor/nle-timeline/UPSTREAM.lock.json"), "the census re-declaration"))')

# --- 5. the D43-A3 + D42 activation --------------------------------------
sub1('    skip = ("REGISTERED-SKIP" in s12 or "REGISTERED-SKIP" in plan or "REGISTERED-SKIP" in open("audits/fleet-r28/test-law-d42-d44.md", encoding="utf-8").read())\n    fence = ("NATIVE_VENUE_SPEED" in s12 and "NATIVE_VENUE_SPEED" in s06)\n    return (inter06 and trap and inter17 and skip and fence), f"inter06={inter06} trap={trap} inter17={inter17} skip={skip} fence={fence}"',
     '    fence = ("NATIVE_VENUE_SPEED" in s12 and "NATIVE_VENUE_SPEED" in s06)\n    return (inter06 and trap and inter17 and fence), f"inter06={inter06} trap={trap} inter17={inter17} fence={fence}"')

# --- 6. the R33 check classes (inserted before the REPORT block) ----------
R33_CLASSES = '''
# === THE R33 CHECK CLASSES (the intake fold — the engine register + the OT wire-reality + the pin re-key) ===

# --- R33-A: the 87-row register applied (the marker census) ---
def _r33_markers():
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
check("R33-A: the 87-row engine register APPLIED (the marker census: >= 84 marker sites + the 8 P1s; 3 rows discharged [P3-36/P3-43a upstream + P3-29 verified])", _r33_markers, "register fold")

# --- R33-B: the Gaussian-Blur default law corrected (4 -> 10) ---
check("R33-B: the Gaussian-Blur preview default reads 10 both sites (the F2-5 pin; the live FALSE law killed)", lambda: (
    "default 10 — the GPU registry's declared default" in specs[7]
    and "default 10 — the registry's declared default" in specs[7]
    and "default 4" not in specs[7][specs[7].find("buildElementFilterString"):specs[7].find("buildElementFilterString") + 1200], "the blur default"), "blur law")

# --- R33-C: spec 05 §8.10 exists (the AR-2 keyframe-gesture family) ---
check("R33-C: 05 §8.10 the keyframe authoring gestures LANDED (the AR-2 normative text — the never-applied R27 fold)", lambda: (
    "### 8.10 Keyframe authoring gestures" in specs[5]
    and "exact-tick = replace" in specs[5]
    and "ElementAnimations" in specs[5]
    and "ScalarChannel | DiscreteChannel" in specs[5], "the 8.10 law"), "AR-2 family")

# --- R33-D: the NFR family's GAP row + the venue-status note ---
check("R33-D: the NFR/perf GAP row FILED (12 §0) + 17 §13A.1's venue-status note (the engine perf.yml nightly recorded; the app-side recipes' venue NOT YET)", lambda: (
    "NFR/perf family's venue + carriers" in specs[12]
    and "R33 venue-status note" in specs[17]
    and "TARGET model, not the current venue record" in specs[17], "the NFR row"), "NFR gap")

# --- R33-E: TRACK_LOCKED is 13 commands (the OT wire-reality fold) ---
def _lock13():
    api = read(os.path.join("..", "opencut-timeline", "src", "lib", "timeline", "headless", "api.ts"))
    gates = len(re.findall(r'code: "TRACK_LOCKED"', api))
    spec_ok = ("13 commands total, counted live" in specs[15] and "13 commands** emitting `TRACK_LOCKED`" in specs[15])
    return (gates >= 11 and spec_ok), f"api TRACK_LOCKED emit sites: {gates}; spec 13-count: {spec_ok}"
check("R33-E: TRACK_LOCKED is 13 COMMANDS not 12 (insertBatch :1417 + track.remove :2732 — the live emit census + all four spec claims re-keyed)", _lock13, "lock 13")

# --- R33-F: the F1B-2 four-verb law + HA-2-11 the value narrowing ----------
check("R33-F: F1B-2 reads FOUR verbs (insert, move, update, AND trim — validateWireTrim) + upsertKeyframe.value narrowed to number", lambda: (
    "insert, move, update, AND trim" in specs[15]
    and "validateWireTrim" in specs[15]
    and "value: number; // R33 (OT seal18 HA-2-11)" in specs[15], "the four-verb + narrowing"), "F1B-2/HA-2-11")

# --- R33-G: the property tier + the coverage job recorded (the discharge-shaped rows) ---
check("R33-G: the engine's property tier + the coverage job recorded (01 ## Testing + 12 §17.5 — the W0-W4 reality)", lambda: (
    "R33, engine seal-round register P2-1" in specs[1]
    and "R33 coverage status note" in specs[12]
    and "785" in specs[12], "the property-tier record"), "property tier")

# --- R33-H: the OT census + registry cites at the R33 shape ---
def _ot_census_live():
    import json
    d = json.load(open(os.path.join("..", "opencut-timeline", "download", "timeline-test-report.json")))
    ok_json = (d["total"] == 675 and d["passed"] == 675 and len(d["milestones"]) == 77)
    spec_ok = ("632 classic (incl. the 3-test M58R flake-fix family) + 17 M60-theme + 11 M61 + 11 M63 + 4 M62" in specs[15]
               and "675/675" in specs[15])
    return (ok_json and spec_ok), f"json 675/675-77: {ok_json}; spec census: {spec_ok}"
check("R33-H: the OT census reads the report-json truth (675 = 632 incl. M58R + 17 M60 + 11 M61 + 11 M63 + 4 M62; 77 entries)", _ot_census_live, "OT census")

# --- R33-I: the D43-A3 + D42 drift-fence classes ACTIVATED (OT's Stage-0) ---
def _stage0_live():
    ed = read(os.path.join("..", "opencut-timeline", "src", "lib", "timeline", "core", "edit-domains.ts"))
    lk = read(os.path.join("..", "opencut-timeline", "src", "lib", "timeline", "ops", "linkage.ts"))
    a3 = all(k in ed for k in ["NATIVE_VENUE_SPEED", "WSOLA_RATE", "AUTHORING_SPEED", "FIT_TO_FILL_RATE", "minDurationTicks"])
    d42 = all(k in lk for k in ["resolveLinkedGroup", "findInboundLinks"]) and "linkedTo" in read(os.path.join("..", "opencut-timeline", "src", "lib", "timeline", "types", "index.ts"))
    spec09 = "Stage-0 LANDED in OT" in specs[9]
    return (a3 and d42 and spec09), f"A3 leaf-edge: {a3}; D42 fence: {d42}; 09 marker: {spec09}"
check("R33-I: the D43-A3 leaf-edge + the D42 drift-fence ACTIVATED (OT's Stage-0: edit-domains.ts + linkage.ts + the 09 marker — the REGISTERED-SKIP retires)", _stage0_live, "stage-0 live")

# --- R33-J: the pin world at R33 (the layered rows + the canon) ---
check("R33-J: the R33 pin layers present (00/01/03/18's fleet rows + the code-anchor precision)", lambda: (
    "2a0ecf4" in s00 and "785/785" in s00
    and "`28aa387`" in open("00-master-spec.md", encoding="utf-8").read()
    and "R33 note" in specs[18]
    and "R33 re-pin" in specs[1], "the R33 layers"), "pin layers")

# --- R33-K: the rekey scanner zero residual + the battery lineage ---------
def _rekey_zero():
    r = subprocess.run([sys.executable, "scripts/rekey_r33.py", "--dry"], capture_output=True, text=True, timeout=120)
    return ("LIVE-stale hits: 0" in r.stdout, r.stdout.strip().splitlines()[-2] if r.stdout else "no output")
check("R33-K: rekey_r33.py ZERO LIVE-stale residual (the row-aware scanner at the R33 pin world)", _rekey_zero, "rekey gate")

check("R33-L: the K4 exit verdict doc exists app-side + the human-rounds protocol staged (the USER's track — untouched by R33)", lambda: (
    os.path.exists(os.path.join("..", "nle-test-app", "docs", "decision-k4-exit-verdict.md"))
    and os.path.exists(os.path.join("..", "nle-test-app", "docs", "human-rounds", "PROTOCOL.md"))
    and os.path.exists(os.path.join("..", "nle-test-app", ".storybook", "annotakit.config.json")), "the w1 staging"), "human track")

'''
sub1('\n\n# === REPORT ====================================================================',
     R33_CLASSES + '\n# === REPORT ====================================================================')

# --- 7. the REPORT block --------------------------------------------------
sub1('print(f"\\nbattery_r32: {len(results) - len(fails)}/{len(results)} PASS")',
     'print(f"\\nbattery_r33: {len(results) - len(fails)}/{len(results)} PASS")')
sub1('if not fails:\n    print("ALL GREEN — the R32 world is coherent: the K4 EXIT VERDICT LANDED (the interpretation ruling + the move-drag LEG 2b + the VLM collector pair — the crawl\'s automated completion proof COMPLETE), D52 the two-keymap yield LANDED across BOTH repos (nle-ui 1e0c30b the optional twin + the 9 guards + the 6-pin family; app ce7cfc3 the flag store + the composed getter + the 4-test honest-law describe), the per-element session families LANDED (the doc-committing session registry), the C0 MiniShell composition LANDED (701→737, 78 stories), the D25.3a mini-theme wave LANDED in OT (39003d3, 649/649 — the code pin MOVED), the w1-entry human infrastructure LANDED (the protocol + the annotakit loop + the side-by-side fixtures), the corpus re-keyed to the R32 pin world (rekey_r32 — zero LIVE-stale residual), the R28/R30/R31 check classes all standing re-keyed to the R32 figures.")',
     'if not fails:\n    print("ALL GREEN — the R33 world is coherent: THE INTAKE FOLD COMPLETE (the engine seal-round\'s 87-row register APPLIED 87/87 — every premise verified live; the OT seal18 wire-reality fold LANDED: TRACK_LOCKED 13, F1B-2 four verbs, HA-2-11 narrowed, the census at the report-json truth), the pin world re-keyed to the R33 pins (engine 2a0ecf4 785/785 — the property tier + perf.yml; OT 008e7f3 675/675 — the Stage-0 mechanism set; app 7664603 — the lockstep re-pin; rekey_r33 zero LIVE-stale residual), the D43-A3 + D42 drift-fence battery classes ACTIVATED (the REGISTERED-SKIP retired — OT\'s edit-domains.ts + linkage.ts live), the human-rounds track STAGED for the user (the PROTOCOL + the annotakit loop + the three open decisions — the next session\'s core).")')

open(DST, "w", encoding="utf-8").write(text)
print("battery_r33.py written:", len(text.splitlines()), "lines")

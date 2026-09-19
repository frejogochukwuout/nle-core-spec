#!/usr/bin/env python3
"""battery_r15.py — the Round-15 standing mechanical battery (spec-corpus invariants).
Replaces battery_r9.py's calibration (R9 checks retired with the canon they checked).
Every check: PASS/FAIL + live-hit counting with supersession-context exemption.
"""
import re, subprocess, sys, os

REPO = os.path.dirname(os.path.abspath(__file__)) + "/.."
results = []

def read(f):
    with open(os.path.join(REPO, f), encoding="utf-8") as fh:
        return fh.read()

def check(name, fn):
    try:
        ok, detail = fn()
    except Exception as e:
        ok, detail = False, f"exception: {e}"
    results.append((name, ok, detail))

def count_in(text, pattern, flags=0):
    return len(re.findall(pattern, text, flags))

def live_stale(text, stale):
    hits = [m.start() for m in re.finditer(re.escape(stale), text)]
    live = 0
    for h in hits:
        ctx = text[max(0, h-260):h+260]
        if any(k in ctx for k in ["superseded", "supersession", "R9-era", "R8-era", "historical", "point-in-time", "Baseline:", "R15 note", "old ", "retired", "was the"]):
            continue
        live += 1
    return live

s00, s05, s06, s09 = read("00-master-spec.md"), read("05-timeline.md"), read("06-nle-ops.md"), read("09-project-model.md")
s10, s14, s15, s16 = read("10-fcpxml-export.md"), read("14-implementation-phases.md"), read("15-wire-protocol.md"), read("16-keyboard-shortcuts.md")
s17, s18, s19, s20 = read("17-test-plan.md"), read("18-ui-shell.md"), read("19-code-references.md"), read("20-audio-core.md")
readme = read("README.md")
arch = read("audits/ARCH-R15-assembly-and-path.md")

# --- D15/D16/D17 anchors -----------------------------------------------------
check("D15 present + evolve-in-place", lambda: ("Decision 15" in s00 and "EVOLVE-IN-PLACE" in s00, "header"))
check("D16 present + engine-home projector", lambda: ("Decision 16" in s00 and "ENGINE-home" in s00, "header"))
check("D17 present + roof", lambda: ("Decision 17" in s00 and "four walls" in s00.lower(), "header"))
check("D12.2 re-typing supersession present", lambda: ("re-typed as INTERNAL transport" in s00 and "superseded by this re-typing" in s15, "00 D16 law2 + 15 binding"))
check("00 has exactly 17 decisions", lambda: (count_in(s00, r"^### Decision ", re.M) == 17, f"count={count_in(s00, r'^### Decision ', re.M)}"))
check("D10/D12/D13 bodies carry R15 supersession annotations", lambda: (s00.count("superseded at R15") >= 3, "annotations"))

# --- 14 assembly plan ---------------------------------------------------------
check("14 is the assembly plan (A-phases + week-1)", lambda: ("A0" in s14 and "A7b" in s14 and ("week −1" in s14 or "week -1" in s14), "phases"))
check("14 carries the per-domain gap register w/ pins", lambda: ("gap register" in s14.lower() and "opencut-timeline @ `0412e41`" in s14, "register"))
check("14 totals present (22-27 honest)", lambda: ("22-27" in s14, "totals"))
check("14 P-phase bodies retired", lambda: ("Phase 0: Playback Spike" not in s14, "retired"))
check("no LIVE 'spec 14 §2.1' pointers (annotated supersession exempt)", lambda: (
    all(live_stale(t, "spec 14 §2.1") == 0 for t in [s00, s05, s06, s09, s15, s16, s17, s18, s19, s20, readme]), "swept"))

# --- 15 routing table ---------------------------------------------------------
check("15 §4.1A exists", lambda: ("Routing-disposition table" in s15, "section"))
check("15 NOT_IMPLEMENTED registered (§4.1B + §6.3)", lambda: (s15.count("NOT_IMPLEMENTED") >= 4, "code"))
check("15 §13.15 refreshed to 24-command reality", lambda: ("24 types" in s15 and "refreshed Round 15" in s15, "13.15"))
check("15 §9.5 event-name mapping register exists", lambda: ("mapping register" in s15 or "Event-name mapping" in s15, "9.5"))
check("15 §10.1 versioning-at-bus note exists", lambda: ("versioning" in s15.lower() and "§10.1" in s15 or "10.1" in s15, "10.1"))

# --- re-baseline counts (inverted to the R15 canon; live-hit discipline) -------

for label, text, stale in [
    ("README", readme, "202/202"), ("README", readme, "297/297"), ("README", readme, "737/737"),
    ("19", s19, "202/202"), ("19", s19, "297/297"), ("05", s05, "297/297"), ("06", s06, "297/297"),
    ("05", s05, "18-type"), ("19", s19, "18 prefixed"),
]:
    check(f"{label}: no LIVE '{stale}' (re-baselined)", lambda t=text, s=stale: (live_stale(t, s) == 0, f"live_hits={live_stale(t, s)}"))

check("README carries R15 SHAs", lambda: ("f526e67" in readme and "0412e41" in readme and "374711c" in readme, "pins"))
check("19 carries R15 SHAs (all four)", lambda: ("f526e67" in s19 and "0412e41" in s19 and "374711c" in s19 and "d42693e" in s19, "pins"))
check("19 projector = ENGINE-home", lambda: ("nle-engine/src/lib/nle/projector" in s19, "home"))
check("05 §16.5A projector law exists", lambda: ("16.5A" in s05 and "projector" in s05.lower(), "16.5A"))

# --- amendment propagation ------------------------------------------------------
check("A1 landed in 16", lambda: ("ONLY ripple-delete chord" in s16 or "only ripple-delete chord" in s16.lower(), "A1"))
check("A1 propagated to 05", lambda: ("keyboard-delete-chord-family" in s05, "A1-05"))
check("A6 propagated to 05 (R = ripple tool)", lambda: ("keyboard-r-selects-ripple-tool" in s05, "A6-05"))
check("A2 marker unification in 09 (per-scene)", lambda: ("per-scene" in s09 or "per scene" in s09, "A2"))
check("A2 marker verbs in 16", lambda: ("deleteMarker" in s16 and "updateMarker" in s16, "A2-16"))
check("N1 inline elements in 09", lambda: ("ElementJSON[]" in s09.replace(" ", "") or "elements: ElementJSON" in s09, "N1"))
check("N5 loop invariant in 15", lambda: ("N5" in s15 and "end > start" in s15, "N5"))
check("N4 link-gate contract in 18", lambda: ("link-OFF" in s18 or "link-off" in s18, "N4"))
check("09 multi-scene ruling (app-level)", lambda: ("app-level" in s09 or "app level" in s09, "multi-scene"))

# --- 17/19/20 R15 additions -----------------------------------------------------
check("17 roof-suite section exists", lambda: ("roof" in s17.lower() and "S1" in s17 and "S5" in s17, "17A"))
check("17 regression-continuity law", lambda: ("port-then-swap" in s17, "law"))
check("17 pin-lockset assertion", lambda: ("pin-lockset" in s17, "lockset"))
check("19 C9 EXECUTED", lambda: ("EXECUTED" in s19, "C9"))
check("20 M1.6 correction (bridge at engine, pure core)", lambda: ("src/lib/nle/bridge" in s20 and "PURE" in s20, "M1.6"))

# --- ARCH-R15 state --------------------------------------------------------------
check("ARCH-R15 v2.1 + re-review PASSED", lambda: ("v2.1" in arch and "PASSED" in arch, "status"))
check("ARCH-R15 engine-home projector", lambda: ("ENGINE-HOME" in arch or "ENGINE-home" in arch, "home"))

# --- governance (standing laws) --------------------------------------------------
check("no .refined.md files", lambda: (subprocess.run(["bash", "-c", f"ls {REPO}/*.refined.md 2>/dev/null | wc -l"], capture_output=True, text=True).stdout.strip() == "0", "canon"))
check("candidates file processed-status present", lambda: ("ROUND 15 STATUS" in read(".agents/SPEC-REVISION-CANDIDATES.md"), "processed"))

fails = [(n, d) for n, ok, d in results if not ok]
for n, ok, d in results:
    print(f"{'PASS' if ok else 'FAIL'}  {n}" + ("" if ok else f"  -> {d}"))
print(f"\n{len(results) - len(fails)}/{len(results)} green")
sys.exit(1 if fails else 0)

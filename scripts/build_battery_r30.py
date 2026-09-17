#!/usr/bin/env python3
"""build_battery_r30.py — forks battery_r29.py → battery_r30.py (the R30 K3-corpus round).

Patches: the docstring header; the LIVE pins (app 8f12cf9 377/377 12-file roof,
nle-ui 5779295 701/701, the app's nle-ui submodule); the roof-inventory scrape;
appends the EIGHT R30 check classes (the K3 corpus + maps + C16 twins + slip +
the dead-entry fix + the LAW-NET R30 note + the GAP-verify re-files).
"""
import re

SRC = "scripts/battery_r29.py"
DST = "scripts/battery_r30.py"

s = open(SRC, encoding="utf-8").read()

# 1. The header docstring: replace the first docstring block's opening
old_head = '"""battery_r29.py — the Round-29 battery (the battery_r28 successor: THE EXECUTION-ROUND re-base).'
new_head = '"""battery_r30.py — the Round-30 battery (the battery_r29 successor: THE K3-CORPUS ROUND — the crawl\'s bulk begun).'
assert old_head in s
s = s.replace(old_head, new_head, 1)

# Trim the R29 docstring body: insert the R30 summary after the R29 body's close.
r30_body = '''
The R30 round (THE K3 CORPUS ROUND): the crawl's bulk begun — the app's K3 re-expression:
the FOUR maps (docs/k3-map-{store,geometry,libchrome,timeline}.md — 160 rows / the whole 495-test
corpus audited) + the two authoring waves LANDED (the app suite 256/256 8-suite → **377/377 across
12 files**: engineService 31 + timeline-geometry 38 + history-laws 15 + keybindings-repeat 4 as the
NEW files; the GluedShell + wire-coverage extensions) + the C16 auto-repeat guards BOTH trees (the
port's use-keybindings.ts:220 + the package's useShortcuts.ts:52 — the held-key machine-gun bug
found + fixed + mutation-verified) + the SLIP family + the patch-path refusals + the adversarial
review (13/13 mutations caught, zero tautologies; the Part-A hole mapped) + the 3-verb
dead-history-entry package defect FIXED (nle-ui @ 5779295 — 701/701). The pin world: app 8f12cf9 ·
nle-ui 5779295 · engine e3f55bd · OT 3e18722 · WDC 94f6460 · the wire census 31=28+3 stands · the
mini 495/12 sealed (the LAW-NET R30 note; the two GAP-verify rows RE-FILED with the verified OT
values: the trim floor 1-frame fps-derived, the split floor NONE, the snap 10px).
'''
# Insert before the closing docstring quotes of the module docstring (the first """)
end = s.index('"""', len(new_head) + 1)
s = s[:end] + r30_body + s[end:]

# 2. The LIVE checks
s = s.replace(
    'check("LIVE: the nle-ui repo HEAD is 6754979 (691/691 — AW1-2 + AW1-4 + ENG-1)", lambda: (\n    _git("nle-ui", "rev-parse", "--short", "HEAD") == "6754979", _git("nle-ui", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))',
    'check("LIVE: the nle-ui repo HEAD is 5779295 (701/701 — the C16 package twin 83af958 + the K3 FIX-2 dead-entry class)", lambda: (\n    _git("nle-ui", "rev-parse", "--short", "HEAD") == "5779295", _git("nle-ui", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))')
s = s.replace(
    'check("LIVE: the app repo HEAD is 876f2b8 (256/256; the 8-suite roof; the census 42=36+5+1 @ 55c81c0)", lambda: (\n    _git("nle-test-app", "rev-parse", "--short", "HEAD") == "876f2b8", _git("nle-test-app", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))',
    'check("LIVE: the app repo HEAD is 8f12cf9 (377/377 the 12-file roof; the K3 corpus round; the census register UNCHANGED @ 55c81c0)", lambda: (\n    _git("nle-test-app", "rev-parse", "--short", "HEAD") == "8f12cf9", _git("nle-test-app", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))')
# the app's submodule pin: nle-ui 6754979 → 5779295
s = s.replace(
    '_git("nle-test-app", "submodule", "status", "vendor/nle-ui").lstrip(" +-").startswith("6754979")',
    '_git("nle-test-app", "submodule", "status", "vendor/nle-ui").lstrip(" +-").startswith("5779295")')
s = s.replace(
    'check("LIVE: the app\'s submodules are engine e3f55bd + nle-ui 6754979 + WDC ec8fd5c + the OT mirror lock 55c81c0',
    'check("LIVE: the app\'s submodules are engine e3f55bd + nle-ui 5779295 + WDC ec8fd5c + the OT mirror lock 55c81c0')

# 3. The roof-inventory scrape class → the 12-file roof
s = s.replace(
    '''def _roof():
    """The app's 8-suite roof at c020b2a: GluedShell 104 + audioService 42 + sceneBridge 41 +
    deliverService 20 + persistenceService 20 + wire-coverage 9 + engineSeam 7 + waveformPeaks 9 = 252."""
    ok = all(k in specs[17] for k in ["GluedShell", "audioService", "sceneBridge", "deliverService",
                                      "persistenceService", "wire-coverage", "engineSeam", "waveformPeaks"])
    ok2 = ("8-suite" in specs[17] or "8 suites" in specs[17] or "8-suite" in specs[12] or "8 suites" in specs[12])
    return (ok and ok2), f"suites named: {ok}; the roof figure: {ok2}"
check("the app's 8-suite inventory in 17/12 (the roof: 104+42+41+20+20+9+7+9 = 252)", _roof, "app suites")''',
    '''def _roof():
    """The app's 12-file roof at 8f12cf9: GluedShell 124 + wire-coverage 26 + audioService 42 +
    deliverService 20 + keybindings-repeat 4 + waveformPeaks 9 + history-laws 15 + persistenceService 20 +
    engineService 31 + sceneBridge 41 + timeline-geometry 38 + engineSeam 7 = 377 (the R30 K3 corpus round)."""
    ok = all(k in specs[12] for k in ["GluedShell 124", "wire-coverage 26", "audioService 42", "deliverService 20",
                                      "keybindings-repeat 4", "waveformPeaks 9", "history-laws 15", "persistenceService 20",
                                      "engineService 31", "sceneBridge 41", "timeline-geometry 38", "engineSeam 7"])
    ok2 = "377/377" in specs[12] and "12 files" in specs[12]
    ok3 = "377/377" in specs[17] and "8f12cf9" in specs[17]
    return (ok and ok2 and ok3), f"inventory in 12: {ok}; 377/12-file in 12: {ok2}; 17 re-key: {ok3}"
check("the app's 12-file roof inventory in 12/17 (124+26+42+20+4+9+15+20+31+41+38+7 = 377 @ 8f12cf9)", _roof, "app suites")''')

# 4. Append the EIGHT R30 check classes (before the final summary block)
r30_classes = '''
# === V. THE EIGHT R30 CHECK CLASSES (the K3-corpus round) =====================
_app = lambda *p: os.path.join(REPO, "..", "nle-test-app", *p)
def _app_read(*p):
    try:
        with open(_app(*p), encoding="utf-8") as fh: return fh.read()
    except Exception:
        return ""
def _app_it(*p):
    n = 0
    try:
        with open(_app(*p), encoding="utf-8") as fh:
            for line in fh:
                if line.strip().startswith(("it(", "it (")): n += 1
    except Exception:
        pass
    return n

check("R30-1: the FOUR K3 re-expression maps exist in the app repo (store/geometry/libchrome/timeline)", lambda: (
    all(os.path.isfile(_app("docs", f"k3-map-{n}.md")) for n in ["store", "geometry", "libchrome", "timeline"])
    and all("Disposition" in _app_read("docs", f"k3-map-{n}.md") or "| Disposition" in _app_read("docs", f"k3-map-{n}.md") or "disposition" in _app_read("docs", f"k3-map-{n}.md") for n in ["store", "geometry", "libchrome", "timeline"]),
    "the four maps"), "k3 maps")

check("R30-2: the K3 corpus test files with the exact counts (engineService 31 / timeline-geometry 38 / history-laws 15 / keybindings-repeat 4)", lambda: (
    (_app_it("src", "engineService.test.ts"), _app_it("src", "timeline-geometry.test.ts"),
     _app_it("src", "history-laws.test.ts"), _app_it("src", "keybindings-repeat.test.ts")) == (31, 38, 15, 4),
    f"counts: {_app_it('src', 'engineService.test.ts')}/{_app_it('src', 'timeline-geometry.test.ts')}/{_app_it('src', 'history-laws.test.ts')}/{_app_it('src', 'keybindings-repeat.test.ts')}"), "k3 corpus")

check("R30-3: the C16 auto-repeat guards BOTH trees (the port use-keybindings + the package useShortcuts)", lambda: (
    "event.repeat" in _app_read("src", "timeline-port", "hooks", "use-keybindings.ts")
    and "e.repeat" in _app_read("vendor", "nle-ui", "src", "hooks", "useShortcuts.ts")
    and "repeat" in _app_read("src", "keybindings-repeat.test.ts"), "the two guards"), "c16 guards")

check("R30-4: the SLIP family pinned (the store-map row 34 closure — the engineService SLIP describe)", lambda: (
    "SLIP" in _app_read("src", "engineService.test.ts") and "slip" in _app_read("src", "engineService.ts"), "the slip describe"), "slip family")

check("R30-5: the 3-verb dead-history-entry fix LANDED in the package (the unknown-fx miss-guards)", lambda: (
    _app_read("vendor", "nle-ui", "src", "state", "useUiStore.ts").count("if (!fx) return;") >= 2
    and "if (!fxs?.some" in _app_read("vendor", "nle-ui", "src", "state", "useUiStore.ts"), "the miss-guards"), "dead-entry fix")

check("R30-6: the LAW-NET R30 K3-progress note + the two GAP-verify rows RE-FILED (the verified OT values)", lambda: (
    "R30 K3-progress note" in read("ui-mock/shell-mini/docs/LAW-NET-INVENTORY.md")
    and "RE-FILED R30" in read("ui-mock/shell-mini/docs/LAW-NET-INVENTORY.md")
    and "1 FRAME, fps-derived" in read("ui-mock/shell-mini/docs/LAW-NET-INVENTORY.md")
    and "NO split min-duration exists OT-side" in read("ui-mock/shell-mini/docs/LAW-NET-INVENTORY.md"), "the R30 note + re-files"), "lawnet r30")

check("R30-7: the store-map row-19 two-surface ruling amended (the review's P2 — the map no longer teaches dispatch-returns-false)", lambda: (
    "REVIEW-R30 AMENDMENT" in _app_read("docs", "k3-map-store.md")
    and "REVIEW-R30" in _app_read("docs", "k3-map-store.md"), "the amendments"), "map amendments")

check("R30-8: the app's GluedShell + wire-coverage extensions present (the W-B1 view-toggle re-homes + the W-B3 mixed-kind laws)", lambda: (
    "K3 W-B1" in _app_read("src", "GluedShell.test.tsx")
    and "K3 W-B3" in _app_read("src", "wire-coverage.test.tsx")
    and "FRESH-ADDITIVE" in _app_read("src", "wire-coverage.test.tsx"), "the W-B1/W-B3 describes"), "wb1 wb3")

'''
# Insert before the summary block
anchor = "print()"
idx = s.rfind(anchor)
if idx == -1:
    idx = len(s)
s = s[:idx] + r30_classes + s[idx:]

# 5. Rename the banner
s = s.replace("battery_r29:", "battery_r30:").replace("battery_r29 ", "battery_r30 ")

open(DST, "w", encoding="utf-8").write(s)
print(f"wrote {DST} ({len(s.splitlines())} lines)")

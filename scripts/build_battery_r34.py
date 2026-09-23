#!/usr/bin/env python3
"""build_battery_r34.py — fork battery_r33.py → battery_r34.py with the R34 re-keys
(the pin world: engine 60232ea/789 · OT 8f96ab2/714-83 · app d28847c/census-33+8+2 ·
nle-ui cb04919/747 · WDC 94f6460 unchanged) + the R34 check classes (A-L)."""
import io, os, re

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "battery_r33.py")
DST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "battery_r34.py")
t = io.open(SRC, encoding="utf-8").read()

# 0. the identity swaps
t = t.replace("battery_r33", "battery_r34")
t = t.replace('"""battery_r33.py', '"""battery_r34.py', 1) if '"""battery_r33.py' in t else t

R = []  # (label, old, new)

# 1. the four LIVE HEAD checks + their descriptions
R.append(("engine HEAD", '"LIVE: the engine repo HEAD is 2a0ecf4 (the seal-round close: the property tier W2 + the coverage job W3 + perf.yml W4 + the P-F2 corollary; 785/785 = 749 + 33 property + 3 P-F2; the code anchor 28aa387 — the first src/ movement since R28)", lambda: (\n    _git("nle-engine", "rev-parse", "--short", "HEAD") == "2a0ecf4", _git("nle-engine", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))',
          '"LIVE: the engine repo HEAD is 60232ea (the R34 seal round: perf.yml FIXED [the :79 unquoted-colon quote fix] + the two §B.5 steps restored [the count-gate --table perf mode + test:property:explore] + the CI_VENDOR_URL_PREFIX variable set → the nightly GREEN + the CI GREEN; P-F4 caught on the FIRST random-seed nightly run + closed same-round; 789/789 = 785 + the 4 P-F4 pins; the code anchor MOVED to 60232ea [the P-F4 src fix])", lambda: (\n    _git("nle-engine", "rev-parse", "--short", "HEAD") == "60232ea", _git("nle-engine", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))'))
R.append(("OT HEAD", '"LIVE: the OT repo HEAD is 008e7f3 (the seal18 close: the D42 linkage model + the D43 edit-domains + the D44 ERROR_CODES + the real-defect wave + the M61/M62/M63 families + the M58R flake fix; 675/675 = 632 classic incl. M58R-3 + 17 M60 + 11 M61 + 11 M63 + 4 M62; the code pin 344123a)", lambda: (\n    _git("opencut-timeline", "rev-parse", "--short", "HEAD") == "008e7f3", _git("opencut-timeline", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))',
          '"LIVE: the OT repo HEAD is 8f96ab2 (the R34 L2 carrier wave: CR-1/2/3/4/5/8/9 LANDED — the M59/59A/59B/59C/59D families + the M64 /view fps param + the SURFACE_OWNED_KEYS export rider; 714/714 @ 83 entries = 632 classic + 17 M60 + 11 M61 + 11 M63 + 4 M62 + 12 M64 + 7 M59 + 5 M59A + 4 M59B + 5 M59C + 6 M59D; the code pin 8f96ab2)", lambda: (\n    _git("opencut-timeline", "rev-parse", "--short", "HEAD") == "8f96ab2", _git("opencut-timeline", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))'))
R.append(("nle-ui HEAD", '"LIVE: the nle-ui repo HEAD is 1e0c30b (743/743 — the R32 landings: the C0 MiniShell composition 701→737 with 78 stories + the ConfirmProvider/MiniShell exports; the D52 twin 737→743 — the optional TimelineRouter.isInteractionActive + the 9 doc-mutating row guards + the 6-pin family)", lambda: (\n    _git("nle-ui", "rev-parse", "--short", "HEAD") == "1e0c30b", _git("nle-ui", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))',
          '"LIVE: the nle-ui repo HEAD is cb04919 (747/747 = 743 + the CR pair — the DeliverPage blob-URL supersede contract [the reveal-after-supersede degradation + the no-accumulation law + the lying comment rewritten ×3] + the viewer-state-empty testid row [the loading/error rows sibling shape; the programMonitor path untouched]", lambda: (\n    _git("nle-ui", "rev-parse", "--short", "HEAD") == "cb04919", _git("nle-ui", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))'))
R.append(("app HEAD", '"LIVE: the app repo HEAD is 7664603 (426/426 + the 22-file roof UNCHANGED from R32; the lockstep re-pin: vendor engine→574d8d3 + BOTH OT mirrors→17a19f8; the census register re-declared 43 = 32 zero-action (6 byte + 26 mechanical) + 9 carriers + 2 hosts @ the 17a19f8 re-pin)", lambda: (\n    _git("nle-test-app", "rev-parse", "--short", "HEAD") == "7664603", _git("nle-test-app", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))',
          '"LIVE: the app repo HEAD is d28847c (426/426 + the 22-file roof UNCHANGED; the R34 re-pin wave: vendor engine 574d8d3→60232ea [the P-F4 code anchor] + nle-ui 1e0c30b→cb04919 + WDC ec8fd5c→94f6460 + BOTH OT mirrors 17a19f8→05d88d9; the CR-2 carrier FLIP — TimelineContextMenu.tsx byte-exact, the census re-declared 43 = 33 zero-action (7 byte + 26 mechanical) + 8 carriers + 2 hosts; scrollAnchorId wired)", lambda: (\n    _git("nle-test-app", "rev-parse", "--short", "HEAD") == "d28847c", _git("nle-test-app", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))'))

# 2. the app submodule check
R.append(("app submodules", '"LIVE: the app\'s submodules are engine 574d8d3 + nle-ui 1e0c30b + WDC ec8fd5c + the OT mirror lock 17a19f8 (the R33 lockstep re-pin: the engine vendor rides the seal-round design v2; both OT mirrors on the s18 wave; the register-divergence era closed — the app vendors the ENGINE CODE ANCHOR by design)", lambda: (\n    _git("nle-test-app", "submodule", "status", "vendor/nle-engine").lstrip(" +-").startswith("574d8d3") and\n    _git("nle-test-app", "submodule", "status", "vendor/nle-ui").lstrip(" +-").startswith("1e0c30b") and\n    "17a19f8" in read("../nle-test-app/vendor/nle-timeline/UPSTREAM.lock.json"), "app submodules"))',
          '"LIVE: the app\'s submodules are engine 60232ea + nle-ui cb04919 + WDC 94f6460 + the OT mirror lock 05d88d9 (the R34 re-pin wave: the engine vendor at the P-F4 code anchor; the CR-2 carrier flip consumed; the app vendors the ENGINE CODE ANCHOR by design)", lambda: (\n    _git("nle-test-app", "submodule", "status", "vendor/nle-engine").lstrip(" +-").startswith("60232ea") and\n    _git("nle-test-app", "submodule", "status", "vendor/nle-ui").lstrip(" +-").startswith("cb04919") and\n    "05d88d9" in read("../nle-test-app/vendor/nle-timeline/UPSTREAM.lock.json"), "app submodules"))'))

# 3. the census register re-declaration check
R.append(("census re-decl", 'check("R32: the app census register RE-DECLARED (43 = 32 zero-action (6 byte + 26 mechanical) + 9 carriers + 2 hosts @ the 17a19f8 re-pin — the R33 lockstep re-key)", lambda: (',
          'check("R34: the app census register RE-DECLARED (43 = 33 zero-action (7 byte + 26 mechanical) + 8 carriers + 2 hosts @ the 05d88d9 re-pin — the CR-2 carrier FLIP, the program\'s first full file-flip)", lambda: ('))
R.append(("census lock", '    "17a19f8" in read("../nle-test-app/vendor/nle-timeline/UPSTREAM.lock.json"), "the census re-declaration"))',
          '    "05d88d9" in read("../nle-test-app/vendor/nle-timeline/UPSTREAM.lock.json"), "the census re-declaration"))'))

# 4. R33-H the OT census shape
R.append(("OT census head", '# --- R33-H: the OT census + registry cites at the R33 shape ---',
          '# --- R33-H: the OT census + registry cites (re-keyed R34 to the 714/83 shape) ---'))

ok, miss = 0, []
for label, old, new in R:
    n = t.count(old)
    if n != 1:
        miss.append("%s: %d hits" % (label, n))
        continue
    t = t.replace(old, new, 1)
    ok += 1

io.open(DST, "w", encoding="utf-8", newline="").write(t)
print("re-keys applied %d/%d" % (ok, len(R)))
for m in miss:
    print("MISS:", m)

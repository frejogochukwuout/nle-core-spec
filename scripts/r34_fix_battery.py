#!/usr/bin/env python3
"""r34_fix_battery.py — the battery_r34 shape fixes (B-3 anchors, the census body,
the lineage re-key, the R34-class tuple shapes) + the plan's 4-column table."""
import io, os
REPO = os.path.dirname(os.path.abspath(__file__)) + "/.."

# ---------- 1. battery_r34.py ----------
f = os.path.join(REPO, "scripts", "battery_r34.py")
t = io.open(f, encoding="utf-8").read()
E = [
    # B-3: the anchors + LOC + description (the P-F4 +27 shift)
    ('    anchors = [(3356, "rollingTrimItems"), (3164, "rippleTrimItem"), (4988, "slip"),\n               (5129, "slideItem"), (5662, "performInsertEdit"), (6039, "performOverwriteEdit")]',
     '    anchors = [(3383, "rollingTrimItems"), (3191, "rippleTrimItem"), (5015, "slip"),\n               (5156, "slideItem"), (5689, "performInsertEdit"), (6066, "performOverwriteEdit")]'),
    ('    if loc != 9051:\n        bad.append(f"timeline.ts LOC {loc} != 9051")',
     '    if loc != 9078:\n        bad.append(f"timeline.ts LOC {loc} != 9078")'),
    ('check("B-3: the engine line-pin anchors hold at 2a0ecf4 (timeline.ts :3356/:3164/:4988/:5129/:5662/:6039 — the PUBLIC methods; 9,051 LOC — the property-tier drift re-anchored R33)", _line_pin_map, "line pins")',
     'check("B-3: the engine line-pin anchors hold at 60232ea (timeline.ts :3383/:3191/:5015/:5156/:5689/:6066 — the PUBLIC methods; 9,078 LOC — the P-F4 +27 shift re-anchored R34)", _line_pin_map, "line pins")'),
    # the census body: 9 → 8 documented carriers
    ('    "9 documented carriers" in read("../nle-test-app/docs/port-census.md") and',
     '    "8 documented carriers" in read("../nle-test-app/docs/port-census.md") and'),
    # the battery lineage: the current fork cited in the plan
    ('check("the battery lineage: battery_r27 cited in the plan (≥5) + 12\'s posture row + 16\'s acceptance", lambda: (\n    plan.count("battery_r27") >= 5 and "battery_r27" in specs[12] and "battery_r27" in specs[16], "lineage r27"))',
     'check("the battery lineage: the CURRENT fork cited in the plan (battery_r34 ≥3) + the lineage rows in 12/16 (the r27 ancestors as dated history)", lambda: (\n    plan.count("battery_r34") >= 3 and "battery_r27" in specs[12] and "battery_r27" in specs[16], "lineage fork"))'),
]
# the R34-class tuple shapes: bool -> (bool, detail)
SHAPE = [
    ('    "no engine-resident round-trip suites claimed" in specs[17]), "K2 flip")',
     '    "no engine-resident round-trip suites claimed" in specs[17]), "the K2 markers + census records")'),
    ('    "the K3 VLM net LANDED @ the app\'s `57dce6a`" in specs[12]), "K3 VLM markers")',
     '    "the K3 VLM net LANDED @ the app\'s `57dce6a`" in specs[12]), "the K3 markers in 17:29 + 12:30")'),
    ('    "RATIFIED R34" in read("../nle-test-app/.agents/PLAN.md"), "K4 ratification"))',
     '    "RATIFIED R34" in read("../nle-test-app/.agents/PLAN.md"), "the app PLAN tick + the ratification record")'),
    ('            os.path.exists(os.path.join("..", "opencut-timeline", "scripts", "m64-fps-param-pins.mjs"))), "page.tsx + the M64 pins script")',
     '            os.path.exists(os.path.join("..", "opencut-timeline", "scripts", "m64-fps-param-pins.mjs"))), "the viewFps threading + the M64 script")'),
    ('            "createCancelRegistry" in idx), "the CR surfaces")',
     '            "createCancelRegistry" in idx), "all seven carrier surfaces at the live tree")'),
    ('            "windowEnd - 1" in tl or "windowEnd − 1" in tl), "the P-F4 record + the fix")',
     '            "windowEnd - 1" in tl or "windowEnd − 1" in tl), "the finding record + the mirror clamp")'),
    ('            any("Randomized-seed" in s.get("name", "") for j in y.get("jobs", {}).values() for s in j.get("steps", []))), "perf.yml + the §B.5 steps")',
     '            any("Randomized-seed" in s.get("name", "") for j in y.get("jobs", {}).values() for s in j.get("steps", []))), "the yaml parses + both §B.5 steps wired")'),
    ('    return ("33 zero-action" in d and "8 carriers" in d and "05d88d9" in d), "the census doc")',
     '    return ("33 zero-action" in d and "8 documented carriers" in d and "05d88d9" in d), "the census doc reads 33+8+2 @ 05d88d9")'),
    ('    return ("superseded" in dp and "revoke" in dp and\n            "shell-viewer-state-empty" in vw), "the CR surfaces")',
     '    return ("superseded" in dp and "revoke" in dp and\n            "shell-viewer-state-empty" in vw), "the supersede contract + the empty testid")'),
    ('    "| R34 |" in plan), "the plan overhaul")',
     '    "| R34 |" in plan), "THE plan + the carve law + the register + the lineage row")'),
    ('    os.path.exists(os.path.join(REPO, "scripts", "battery_r34.py"))), "the scanner fork")',
     '    os.path.exists(os.path.join(REPO, "scripts", "battery_r34.py"))), "both forks exist")'),
    ('    "(R34, W1-a — the location column re-based" in specs[17]), "the §14.2 repair")',
     '    "(R34, W1-a — the location column re-based" in specs[17]), "all three §14.2 markers")'),
]
ok, miss = 0, []
for old, new in E + SHAPE:
    n = t.count(old)
    if n != 1:
        miss.append("%d hits: %r" % (n, old[:70]))
        continue
    t = t.replace(old, new, 1)
    ok += 1
io.open(f, "w", encoding="utf-8", newline="").write(t)
print("battery fixes: %d/%d" % (ok, len(E) + len(SHAPE)))
for m in miss:
    print("MISS:", m)

# ---------- 2. IMPLEMENTATION-PLAN.md: the 4-column table ----------
pf = os.path.join(REPO, "IMPLEMENTATION-PLAN.md")
p = io.open(pf, encoding="utf-8").read()
ACC = {
    "| vitest 426+ @ the pin; census register-equality; boundary; build; the e2e re-gate by extension |":
        "| vitest 426+ @ the pin; census register-equality; boundary; build | the e2e suite re-gates GREEN by extension; the census register-equality holds at every pin |",
    "| the report json (count authority); M-family pins per landing; tsc 0 |":
        "| the report json (count authority); tsc 0; the M-family pins | every carrier landing green with its pin family; the census moves only by declared milestones |",
    "| 789 vitest count gate (both directions); tsc 0; the nightly; the §13A.8 acceptance protocol |":
        "| 789 vitest count gate (both directions); tsc 0; the nightly | the §13A.8 acceptance protocol green per stage; the count gate pins the suite |",
    "| vitest 747+; tsc 0; boundary |":
        "| vitest 747+; tsc 0; boundary | the package suite + the boundary green at every pin |",
    "| 777; the drift-gate; byte-verbatim pins |":
        "| 777; the drift-gate; byte-verbatim pins | the drift-gate green; the contract pins byte-verbatim |",
    "| battery_r34 ALL GREEN; rekey ZERO residual |":
        "| battery_r34 ALL GREEN; rekey ZERO residual | every wrap gates ALL GREEN + ZERO LIVE-stale |",
    "| none — retired-tier (the retirement flips ride S-spec's battery_r34 gate) |":
        "| none — retired-tier | the retirement flips recorded in the battery_r34 wrap |",
}
hdr_old = "| Track | The remaining work (R34) | Gates |"
hdr_new = "| Track | The remaining work (R34) | Gates | Acceptance |"
n = p.count(hdr_old)
assert n == 1, n
p = p.replace(hdr_old, hdr_new, 1)
ok2, miss2 = 0, []
for old, new in ACC.items():
    n = p.count(old)
    if n != 1:
        miss2.append("%d hits: %r" % (n, old[:60]))
        continue
    p = p.replace(old, new, 1)
    ok2 += 1
io.open(pf, "w", encoding="utf-8", newline="").write(p)
print("plan table: %d/%d acceptance columns" % (ok2, len(ACC)))
for m in miss2:
    print("MISS:", m)

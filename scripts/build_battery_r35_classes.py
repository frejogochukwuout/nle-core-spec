#!/usr/bin/env python3
"""Append the R35 check classes to battery_r35.py + update the summary."""
import re

P = "scripts/battery_r35.py"
txt = open(P, encoding="utf-8").read()

R35_CLASSES = '''

# ═════════════════════════════════════════════════════════════════════════════
# THE R35 CHECK CLASSES (the final seal + fleet re-home round)
# ═════════════════════════════════════════════════════════════════════════════

def _read_repo(name, *path):
    with open(os.path.join(REPO, "..", name, *path), encoding="utf-8") as fh:
        return fh.read()

# --- R35-A: THE REGISTER RESOLVED (the four decision inputs folded corpus-wide) ---
check("R35-A1: the operational plan's register RESOLVED (fps both + playhead frame-snapped + viewer-state app-state-first; the WALK exit re-framed)", lambda: (
    "RESOLVED R35" in plan[:2200] and
    "SUPPORT BOTH 24 AND 30" in plan and
    "FRAME-SNAPPED" in plan and
    "APP-STATE LEVEL ALWAYS" in plan and
    "never as blockers" in plan, "the folded register"))
check("R35-A2: the HANDOFF's register section carries the R35 resolutions", lambda: (
    "RESOLVED R35" in read(".agents/HANDOFF.md") and
    "RULED: SUPPORT BOTH 24 AND 30" in read(".agents/HANDOFF.md") and
    "the unquantized display path RETIRED" in read(".agents/HANDOFF.md"), "handoff register"))
check("R35-A3: the app PROTOCOL's three registered decisions RULED (the rounds collect feel-verdicts, never gate)", lambda: (
    "RULED R35" in _read_repo("nle-test-app", "docs", "human-rounds", "PROTOCOL.md") and
    "never gate on them" in _read_repo("nle-test-app", "docs", "human-rounds", "PROTOCOL.md"), "protocol folds"))
check("R35-A4: the S-app track row gains the R35-unblocked pair (the viewer-state wiring + the edit-styles wave)", lambda: (
    "(2R) **the R35-unblocked pair**" in plan and
    "the shell-mini edit-styles wave" in plan, "worklist gains"))

# --- R35-B: THE SKILL LAWS #192-193 (the two standing principles) ---
check("R35-B: SKILL carries laws #192-193 (the NLE-conventions gold standard + the app-state-first law)", lambda: (
    "192. **The NLE-conventions gold-standard law" in read(".agents/SKILL.md") and
    "193. **The app-state-first law" in read(".agents/SKILL.md") and
    "close open items that way, never by asking" in read(".agents/SKILL.md"), "both laws"))

# --- R35-C: the playhead ratification + the viewer-state ruling in the corpus ---
check("R35-C1: 18:461's playhead row carries the R35 convention ratification (W1-a's unanimous verdict)", lambda: (
    "RATIFIED R35 as the industry convention" in specs[18], "the 461 ratification"))
check("R35-C2: 18:167's viewer-state census carries the app-state-first ruling", lambda: (
    "R35 ruling (the app-state-first principle)" in specs[18], "the 167 ruling"))

# --- R35-D: THE CONVENTIONS PROGRAM (the four W1 research artifacts) ---
check("R35-D: the four W1 research artifacts exist under audits/r35/ (playhead + catalog + inventory + decomposition)", lambda: (
    all(os.path.exists(os.path.join(REPO, "audits", "r35", f)) for f in [
        "W1-a-playhead-cadence-research.md",
        "W1-b-nle-edit-conventions-catalog.md",
        "W1-d-shellmini-edit-inventory.md",
        "W1-e-shellfull-decomposition-recon.md",
        "W1-c-org-rehome-recon.md"]), "all five W1 artifacts"))

# --- R35-E: THE SF-0..SF-7 FACE CARVE (the plan's RUN-era product-surface map) ---
check("R35-E: the operational plan carries the SF face carve (the 8 faces + the non-collision law + the sequencing)", lambda: (
    "### 2A. The shell-variant/full mountain" in plan and
    "**SF-2 EDIT VIEW" in plan and
    "**SF-6 DELIVER VIEW" in plan and
    "The non-collision law:" in plan and
    "SF-7 Dropped-pages register" in plan, "the carve"))

# --- R35-F: THE FLEET RE-HOME (the aivs-tech org) ---
check("R35-F1: the engine's + app's .gitmodules point at aivs-tech (the re-point commits; pins unchanged)", lambda: (
    "github.com/aivs-tech/web-daw-core.git" in _read_repo("nle-engine", ".gitmodules") and
    "github.com/aivs-tech/opencut-timeline.git" in _read_repo("nle-engine", ".gitmodules") and
    "github.com/aivs-tech/nle-ui.git" in _read_repo("nle-test-app", ".gitmodules") and
    "github.com/aivs-tech/nle-engine.git" in _read_repo("nle-test-app", ".gitmodules"), "the gitmodules re-points"))
check("R35-F2: the spec's functional fetchers re-pointed (boot-restore + the r26 OWNER constants + the PLAN canon line)", lambda: (
    "aivs-tech/nle-core-spec" in read("ui-mock/shell-variants/scripts/boot-restore.sh") and
    "aivs-tech" in read("ui-mock/shell-variants/scripts/r26-inventory.mjs") and
    "github.com/aivs-tech/nle-core-spec" in read(".agents/PLAN.md"), "the fetcher re-points"))
check("R35-F3: the control-plane repo exists (aivs-tech/nle — the shared project skill + plan + handoff + the re-home record)", lambda: (
    all(os.path.exists(os.path.join(REPO, "..", "nle", *p)) for p in [
        ("README.md",), (".agents", "SKILL.md"), (".agents", "PLAN.md"), (".agents", "HANDOFF.md"),
        ("records", "r35-org-rehome.md")]), "the control plane"))
check("R35-F4: the control-plane skill carries the fleet model + the hard laws + the R35 principles", lambda: (
    "The session spine" in _read_repo("nle", ".agents", "SKILL.md") and
    "GIT IS THE DISK" in _read_repo("nle", ".agents", "SKILL.md") and
    "NLE-conventions gold standard" in _read_repo("nle", ".agents", "SKILL.md"), "the project skill"))

# --- R35-G: THE EDIT-STYLES WAVE (the design + batches A/B + the census) ---
def _app(f):
    return _read_repo("nle-test-app", *f.split("/"))
check("R35-G1: the edit-styles design doc exists (the C-1 blueprint: composites + affordances + the batch carve)", lambda: (
    os.path.exists(os.path.join(REPO, "..", "nle-test-app", "docs", "design-r35-edit-styles.md")) and
    "batch carve" in _app("docs/design-r35-edit-styles.md"), "the design"))
check("R35-G2: batch A landed (edit-style-composites.ts + the EngineMount request(mediaIds, mode) bridge + the recipe tests)", lambda: (
    "InsertMode" in _app("src/timeline-port/edit-style-composites.ts") and
    "request(" in _app("src/timeline-port/EngineMount.tsx") and
    os.path.exists(os.path.join(REPO, "..", "nle-test-app", "src", "edit-style-composites.test.ts")), "batch A"))
check("R35-G3: batch B landed (use-edge-style-session.ts + the engineService wire re-route + the session tests)", lambda: (
    os.path.exists(os.path.join(REPO, "..", "nle-test-app", "src", "timeline-port", "hooks", "use-edge-style-session.ts")) and
    os.path.exists(os.path.join(REPO, "..", "nle-test-app", "src", "edge-style-session.test.tsx")), "batch B"))
check("R35-G4: the census register declares the R35 state (45 = 33 zero-action + 8 carriers + 4 app-host)", lambda: (
    '"totalPortFiles": 45' in _app("docs/port-census.md") and
    '"appHost": 4' in _app("docs/port-census.md") and
    "edit-style-composites.ts" in _app("docs/port-census.md") and
    "use-edge-style-session.ts" in _app("docs/port-census.md"), "the census register"))
check("R35-G5: the nle-ui seam landed (the mediaInsert(mediaIds, mode) widening + the 4 pool rows + the 5 shortcutMap rows)", lambda: (
    "mediaInsert" in _read_repo("nle-ui", "src", "components", "shell", "MediaPool.tsx") and
    "F9" in _read_repo("nle-ui", "src", "lib", "shortcutMap.ts"), "the nle-ui batch"))
check("R35-G6: the app's .agents/HANDOFF carries the R35 state (the re-home + the register + the wave)", lambda: (
    "R35" in _read_repo("nle-test-app", ".agents", "HANDOFF.md") and
    "REGISTER RESOLVED" in _read_repo("nle-test-app", ".agents", "HANDOFF.md"), "the app handoff"))

# --- R35-H: the per-track artifact truth-ups (all 6 repos at the R35 state) ---
check("R35-H: the sibling HANDOFFs carry the R35 sections (engine + OT + ui + wdc)", lambda: (
    "aivs-tech" in _read_repo("nle-engine", ".agents", "HANDOFF.md") and
    "aivs-tech" in _read_repo("opencut-timeline", ".agents", "HANDOFF.md") and
    "aivs-tech" in _read_repo("nle-ui", ".agents", "HANDOFF.md") and
    "aivs-tech" in _read_repo("web-daw-core", "HANDOFF.md"), "all four truth-ups"))

# --- R35-I: the rekey_r35 scanner (the wrap's gate; the K1 convention) ---
check("R35-I: rekey_r35.py exists (the R35 wrap re-key's instrument)", lambda: (
    os.path.exists(os.path.join(REPO, "scripts", "rekey_r35.py")), "the scanner fork"))
'''

# insert the classes before the summary print
SUMMARY_OLD = 'print(f"\\nbattery_r34: {len(results) - len(fails)}/{len(results)} PASS")'
assert SUMMARY_OLD in txt, "summary print not found"
txt = txt.replace(SUMMARY_OLD, R35_CLASSES + "\n" + SUMMARY_OLD, 1)

# update the summary block
txt = txt.replace(
    'print(f"\\nbattery_r34: {len(results) - len(fails)}/{len(results)} PASS")',
    'print(f"\\nbattery_r35: {len(results) - len(fails)}/{len(results)} PASS")', 1)
txt = txt.replace(
    'print("ALL GREEN — the R34 world is coherent: THE SEAL ROUND — the K4 RATIFIED',
    'print("ALL GREEN — the R35 world is coherent: THE FINAL SEAL + FLEET RE-HOME — THE REGISTER RESOLVED (fps both 24+30 · the playhead frame-snapped per the unanimous convention · the viewer-state rows app-state-first · the human rounds the user\'s own lane) · THE FLEET RE-HOMED to aivs-tech (origin everywhere; the CI credentials recreated; the engine CI GREEN on the new home; the control plane live with the shared project skill + plan) · THE EDIT-STYLES WAVE landed (the design + batches A/B + the nle-ui affordances; the census 45 = 33+8+4) · the SF-0..SF-7 face carve in the plan · SKILL #192-193 · (the R34 record: the K4 RATIFIED', 1)

open(P, "w", encoding="utf-8").write(txt)
import ast
ast.parse(txt.replace("{APP_PIN}", "XXXXXXX"))
print("R35 classes appended + summary updated; syntax OK")

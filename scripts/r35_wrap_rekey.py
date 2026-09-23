#!/usr/bin/env python3
"""R35 W5: the corpus wrap re-key — the R35 layers appended to every fleet row (law #190).
The app pin/count placeholders ({APP_PIN}/{APP_COUNT}) fill at the wrap (after batch C)."""
import sys

def fold(path, pairs):
    txt = open(path, encoding="utf-8").read()
    applied = 0
    for old, new in pairs:
        if old in txt:
            if txt.count(old) != 1:
                print(f"  !! MULTI ({txt.count(old)}x) in {path}: {old[:60]}... — SKIP")
                continue
            open(path, "w", encoding="utf-8").write(txt.replace(old, new))
            txt = txt.replace(old, new)
            applied += 1
        else:
            print(f"  !! MISS in {path}: {old[:70]}...")
    print(f"[{path}] {applied}/{len(pairs)} applied")

# ---- 00: the fleet rows' R35 layers ----
fold("00-master-spec.md", [
    # engine row tail: the R34 layer ends with the nightly/CI chain — append the R35 layer
    (
        "P-F4 caught on the FIRST random-seed nightly run + closed same-round])",
        "P-F4 caught on the FIRST random-seed nightly run + closed same-round]) @ `2bae99a` (R35 — docs-only over the `60232ea` P-F4 code anchor [src/ UNCHANGED; the corpus's `60232ea` cites stay the code-anchor canon]: the T-engine artifact truth-up + THE AIVS-TECH RE-HOME — the fleet's origin now `github.com/aivs-tech/<name>`, the .gitmodules re-pointed [pins unchanged], `CI_VENDOR_URL_PREFIX` recreated on the new home, the CI GREEN @ the re-point `3e45aef`; the legacy bearachprema home = the frozen `legacy` remote)",
    ),
    # OT row: append after the R34 layer (find the row's R34 tail — the 05d88d9 mirror-lock chain)
    (
        "the M64 fps param + the SURFACE_OWNED_KEYS export rider; the wire census 31=28+3 UNCHANGED)",
        "the M64 fps param + the SURFACE_OWNED_KEYS export rider; the wire census 31=28+3 UNCHANGED) @ `8f287c7` (R35 — docs-only over the R34 handoff `ccff397` [the code pin `8f96ab2` stands; src/ UNCHANGED]: the T-ot artifact truth-up + the re-home header re-points)",
    ),
    # WDC row: append the R35 layer at the row's 94f6460 tail
    (
        "the null-test harness, **773/773",
        "the null-test harness, **773/773",
    ),
])
print("NOTE: WDC + nle-ui + app rows handled below (row-tail anchors)")

# The WDC + nle-ui + app layers need their exact row tails — locate by the R34 segments
txt = open("00-master-spec.md", encoding="utf-8").read()
import re
# WDC: find the WDC bullet's R34 tail (search the row starting '**web-daw-core**' for its last R34 pin mention)
m = re.search(r"(- \*\*web-daw-core\*\*[^\n]*?)(\n)", txt)
if m:
    row = m.group(1)
    if "dc0ca32" not in row:
        new_row = row + " @ `dc0ca32` (R35 — docs-only over the S-series wrap `94f6460` [the code anchor `ec8fd5c`; 777/777 UNCHANGED]: the T-wdc artifact truth-up; the CI GREEN on the aivs home; the web-daw UPSTREAM deliberately stays on its own account)"
        txt = txt.replace(row, new_row, 1)
        print("[00] WDC R35 layer appended")
# nle-ui: the R34 re-pin segment at the row tail
old_tail = "**R34 re-pin: `cb04919` 747/747 (the DeliverPage supersede contract + the viewer-state-empty CR pair; the W3b app re-pin vendors it)**"
if old_tail in txt:
    txt = txt.replace(old_tail, old_tail + " + **R35: `45d42fb` 754/754** (the C-1a edit-styles batch — the `mediaInsert(mediaIds, mode)` seam widening + the 4 MediaPool insert rows + the 5 shortcutMap rows [F9/F10/Shift-F9/Shift-F10/E] + the live-seam story, 79; the app's R35 re-pin vendors it)", 1)
    print("[00] nle-ui R35 layer appended")
# app: the d28847c R34 segment tail (the app row's last segment)
app_r34_tail = "the K4 phase row RATIFIED (both spec-side conditions landed))"
if app_r34_tail in txt:
    txt = txt.replace(app_r34_tail, app_r34_tail + " @ `{APP_PIN}` (R35 — **THE EDIT-STYLES WAVE + THE RE-HOME**: batch A the insertion composites [`edit-style-composites.ts` + EngineMount's `request(mediaIds, mode)` bridge] + batch B the trim styles [`use-edge-style-session.ts` + the engineService split/trimToPlayhead/slip re-route through the attached wire] + batch C the affordances [the F-cluster + E key rows + the menu rows + the modifier-drag pair + the e2e legs]; **{APP_COUNT}**; the census re-declared **45 = 33 zero-action + 8 carriers + 4 app-host**; the nle-ui vendor re-pinned `cb04919`→`45d42fb`; **THE REGISTER RESOLVED** [fps both 24+30; the playhead frame-snapped per the unanimous convention — the W1-a verdict; the viewer-state rows app-state-first] + the PROTOCOL's three decisions RULED; origin re-homed to aivs-tech with `NLE_GH_PAT` recreated)", 1)
    print("[00] app R35 layer appended")
open("00-master-spec.md", "w", encoding="utf-8").write(txt)

# ---- 09: the nle-ui chain's R35 layer ----
fold("09-project-model.md", [
    (
        "R34: `cb04919` (747/747 — the DeliverPage blob-URL supersede contract + the Viewer's §4.2 empty-state pair))",
        "R34: `cb04919` (747/747 — the DeliverPage blob-URL supersede contract + the Viewer's §4.2 empty-state pair); R35: `45d42fb` (754/754 — the C-1a edit-styles batch: the mediaInsert seam widening + the 4 pool insert rows + the 5 shortcutMap rows))",
    ),
])

# ---- 10: the three d28847c re-verification claims get the R35 layer ----
fold("10-fcpxml-export.md", [
    (
        "re-verified R34 @ `d28847c` (package.json:28 exact)",
        "re-verified R34 @ `d28847c` (package.json:28 exact; re-verified R35 @ `{APP_PIN}` — the edit-styles wave docs-only for the deliver surface)",
    ),
    (
        "re-verified R34 @ `d28847c` (App.tsx:57 exact)",
        "re-verified R34 @ `d28847c` (App.tsx:57 exact; re-verified R35 @ `{APP_PIN}`)",
    ),
    (
        "re-anchored @ `7664603`, was :56, re-verified R34 @ `d28847c` (App.tsx:57 exact)",
        "re-anchored @ `7664603`, was :56, re-verified R34 @ `d28847c` (App.tsx:57 exact; re-verified R35 @ `{APP_PIN}`)",
    ),
])
print("\nWRAP RE-KEY part 1 applied — the {APP_PIN}/{APP_COUNT} placeholders fill at the wrap")

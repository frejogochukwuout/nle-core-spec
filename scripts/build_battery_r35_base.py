#!/usr/bin/env python3
"""Build battery_r35.py from battery_r34.py: the fork + the LIVE re-keys + the R35 classes."""
import re

SRC = "scripts/battery_r34.py"
DST = "scripts/battery_r35.py"

txt = open(SRC, encoding="utf-8").read()

# ---- 1. the R35 header (prepended docstring) ----
R35_HEADER = '''#!/usr/bin/env python3
"""battery_r35.py — the Round-35 battery (the battery_r34 successor: THE FINAL SEAL + FLEET RE-HOME ROUND).

R35 (the user's four decision inputs + the setup mandate): (1) THE REGISTER RESOLVED — fps
BOTH 24 AND 30 (the either/or framing retired; the /view fps-param mechanism carries either
rate) · the playhead cadence FRAME-SNAPPED (W1-a's research: the unanimous industry
convention — no NLE tweens the playhead; the only sub-frame flavors are audio-domain display
variants; the unquantized display path RETIRED; the audio-units variant = the deferred
r2/audio pref-toggle) · the programMonitor viewer-state rows APP-STATE-FIRST (the rows land
agent-actionable; surfacing a settings-tier toggle, default surfaced) · the human rounds
remain the USER's own lane (never a blocker). (2) THE NLE-CONVENTIONS GOLD-STANDARD PROGRAM
(W1-a playhead research + W1-b the edit-conventions catalog [the 10 insertion + 10 trim
styles, the T/P table-stakes verdict] + W1-d the shell-mini inventory [the gap = STYLE-level
not verb-level] + W1-e the SF-0..SF-7 shell-full decomposition — all four artifacts under
audits/r35/). (3) THE FLEET RE-HOME to github.com/aivs-tech (6 repos + the control-plane
repo nle: full-history parity, CI credentials recreated BEFORE the first CI push
[CI_VENDOR_URL_PREFIX + NLE_GH_PAT], the re-point commits [.gitmodules ×5 + the spec's
boot-restore/r26 fetchers + the .agents bootstrap headers], the remote flips [origin=aivs,
legacy=frozen, gitlab retained]; the engine CI GREEN on the new home @ the re-point
3e45aef — the coverage-job flake on the baseline run was non-required); the shared project
skill + plan + the re-home record live in aivs-tech/nle. (4) THE EDIT-STYLES WAVE (the
owner's "add a few more timeline insertion style + trim / clip editing style"): the C-1
design (wire-first, zero wire-surface drift, census 31=28+3 untouched) + batch A the
insertion composites (edit-style-composites.ts 545 LOC + EngineMount's request(mediaIds,
mode) bridge + 20 tests) + batch B the trim styles (use-edge-style-session.ts 754 LOC +
engineService's split/trimToPlayhead/slip re-route through activeWire + 17 tests) + batch
C the affordances (the nle-ui seam widening mediaInsert(mediaIds, mode) + the 4 MediaPool
rows + the 5 shortcutMap rows [F9/F10/⇧F9/⇧F10/E] + the app-side keymap/menu/modifier
surfaces + the e2e legs + the re-pin). (5) THE PER-TRACK ARTIFACT TRUTH-UPS (all 6 repos'
.agents/ at the R35 state) + THE SF-0..SF-7 FACE CARVE folded into the operational plan's
§2A + SKILL laws #192-193 (the conventions gold standard + the app-state-first law).

--- the inherited R34 header (lineage) ---
"""

_INHERITED_R34 = """battery_r34.py — the Round-33 battery'''
txt = txt.replace('#!/usr/bin/env python3\n"""battery_r34.py — the Round-33 battery', R35_HEADER, 1)

# ---- 2. the LIVE re-keys ----
# engine: 60232ea -> 2bae99a (docs-only: the T-engine truth-up over the P-F4 anchor)
txt = txt.replace(
    'check("LIVE: the engine repo HEAD is 60232ea (the R34 seal round:',
    'check("LIVE: the engine repo HEAD is 2bae99a (docs-only over the P-F4 anchor 60232ea; the T-engine R35 truth-up; 789/789; the CI GREEN on the aivs home @ the re-point 3e45aef (the R34 seal round:')
txt = txt.replace('_git("nle-engine", "rev-parse", "--short", "HEAD") == "60232ea", _git("nle-engine", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))',
                  '_git("nle-engine", "rev-parse", "--short", "HEAD") == "2bae99a", _git("nle-engine", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))')
# OT: ccff397 -> 8f287c7 (docs-only: the T-ot truth-up)
txt = txt.replace('check("LIVE: the OT repo HEAD is ccff397 (docs-only over the 8f96ab2 carrier wave:',
                  'check("LIVE: the OT repo HEAD is 8f287c7 (docs-only over the R34 handoff ccff397 [itself docs-only over the 8f96ab2 carrier wave]:')
txt = txt.replace('_git("opencut-timeline", "rev-parse", "--short", "HEAD") == "ccff397", _git("opencut-timeline", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))',
                  '_git("opencut-timeline", "rev-parse", "--short", "HEAD") == "8f287c7", _git("opencut-timeline", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))')
# WDC: 94f6460 -> dc0ca32 (docs-only: the T-wdc truth-up)
txt = txt.replace('check("LIVE: the WDC repo HEAD is 94f6460 (the ENG-2 docs wrap, docs-only over code anchor ec8fd5c; 777/777 unchanged)"',
                  'check("LIVE: the WDC repo HEAD is dc0ca32 (docs-only over the S-series wrap 94f6460 [code anchor ec8fd5c]; the T-wdc R35 truth-up; 777/777 unchanged; CI GREEN on the aivs home)"')
txt = txt.replace('_git("web-daw-core", "rev-parse", "--short", "HEAD") == "94f6460", _git("web-daw-core", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))',
                  '_git("web-daw-core", "rev-parse", "--short", "HEAD") == "dc0ca32", _git("web-daw-core", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))')
# nle-ui: cb04919 -> 45d42fb (the C-1a batch: the seam widening + the pool rows + the shortcutMap)
txt = txt.replace('check("LIVE: the nle-ui repo HEAD is cb04919 (747/747 = 743 + the CR pair',
                  'check("LIVE: the nle-ui repo HEAD is 45d42fb (754/754 = 747 + the C-1a edit-styles batch [the mediaInsert(mediaIds, mode) seam widening + the 4 MediaPool insert rows + the 5 shortcutMap rows F9/F10/⇧F9/⇧F10/E + the live-seam pool story] over the CR pair @ cb04919')
txt = txt.replace('_git("nle-ui", "rev-parse", "--short", "HEAD") == "cb04919", _git("nle-ui", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))',
                  '_git("nle-ui", "rev-parse", "--short", "HEAD") == "45d42fb", _git("nle-ui", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))')
# app: cdc67d8 -> APP_PIN (re-keyed at the wrap after batch C lands)
txt = txt.replace('check("LIVE: the app repo HEAD is cdc67d8 (docs-only over the d28847c re-pin wave:',
                  'check("LIVE: the app repo HEAD is {APP_PIN} (the R35 edit-styles wave + the folds over the R34 re-pin d28847c:')
txt = txt.replace('_git("nle-test-app", "rev-parse", "--short", "HEAD") == "cdc67d8", _git("nle-test-app", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))',
                  '_git("nle-test-app", "rev-parse", "--short", "HEAD") == "{APP_PIN}", _git("nle-test-app", "rev-parse", "--short", "HEAD") or "HEAD unreadable"))')

open(DST, "w", encoding="utf-8").write(txt)
print(f"built {DST} ({len(txt)} bytes) — the APP_PIN placeholder awaits the wrap re-key")

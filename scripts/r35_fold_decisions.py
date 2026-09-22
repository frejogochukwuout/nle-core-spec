#!/usr/bin/env python3
"""R35 W2: the decision folds — the user's 3 product verdicts + the principles.
Each edit: exact old string -> new string, verified before/after."""
import sys

def fold(path, pairs):
    with open(path) as f:
        txt = f.read()
    applied = 0
    for old, new in pairs:
        if old in txt:
            if txt.count(old) != 1:
                print(f"  !! MULTI-MATCH in {path}: {old[:60]}... ({txt.count(old)}x) — SKIPPING")
                continue
            txt = txt.replace(old, new)
            applied += 1
        else:
            print(f"  !! MISS in {path}: {old[:70]}...")
    with open(path, "w") as f:
        f.write(txt)
    print(f"[{path}] {applied}/{len(pairs)} applied")
    return applied

total = 0

# ---- 1. IMPLEMENTATION-PLAN.md:11 — the register (the layered fold: item anchors kept, verdicts appended) ----
total += fold("IMPLEMENTATION-PLAN.md", [
    (
        "**The user-gated register (the ONLY items awaiting the user — everything else is agent-actionable):** (1) **fps 24-vs-30** — the product frame-rate verdict (the `/view` fps-param MECHANISM landed R34 [OT `c4c04f1`'s M64]; the product default stays user-gated; until the verdict the app side is the fps-honest rendering); (2) **the playhead cadence** — frame-snapped ~fps publish (current, 18:461-conformant) vs an unquantized display path (the mini's D5 model) — recorded each human round (keep = default; switch = registered); (3) **the programMonitor viewer-state rows around ProgramCanvas** — the app-side decision (the nle-ui empty-testid CR landed R34 @ `cb04919`; the app-side row wiring is the gated call); (4) **THE HUMAN ROUNDS THEMSELVES** — the round-1 scripted edit session per `nle-test-app/docs/human-rounds/PROTOCOL.md` (the annotakit loop live on :6007, the side-by-side fixtures, the C/G/H/F/Q capture keys; everything staged, zero agent-blocked prerequisites).",
        "**The user-gated register (RESOLVED R35 — the user's four decision inputs received + folded; the register is now EMPTY of product calls; nothing blocks on the user):** (1) **fps 24-vs-30 → RULED R35: SUPPORT BOTH 24 AND 30** — \"no NLE can work with ONLY one of them\"; fps is a first-class configurable (the `/view` fps-param MECHANISM landed R34 [OT `c4c04f1`'s M64]); the supported default set carries both rates; the either/or framing RETIRED (the app side renders fps-honest at either rate; the human rounds still collect per-round rate preferences as feel-data, never as a gate); (2) **the playhead cadence → RULED R35: FRAME-SNAPPED, per the NLE-convention gold standard** (W1-a's research verdict, `audits/r35/W1-a-playhead-cadence-research.md`: frame-snapped playhead IS the unanimous industry convention — Resolve/Premiere/FCP all frame-quantize; the \"smooth playhead\" settings move the TIMELINE VIEW, never tween the playhead; the only true flavor-split is sub-frame AUDIO [Resolve's align-audio-to-frames pref, Premiere's Show Audio Time Units, FCP's subframe nav] — the unquantized display path is NOT a convention and is RETIRED; the audio-units display variant registers as the deferred pref-toggle item, r2/audio-era [SF-4's face], per the owner's \"if truly different flavor then support all with app setting/user pref toggling\"); (3) **the programMonitor viewer-state rows → RULED R35: APP-STATE LEVEL ALWAYS, SURFACING A SEPARATE CALL** (the owner's general principle: \"always safe to have it at app state level and then decide whether to surface or not\") — the app-side rows land as agent-actionable wiring (S-app's worklist gains the row wiring: loading/error/empty around ProgramCanvas at app-state level, surfaced by default, surfacing itself a settings-tier toggle); (4) **THE HUMAN ROUNDS THEMSELVES** — the round-1 scripted edit session per `nle-test-app/docs/human-rounds/PROTOCOL.md` (the annotakit loop live on :6007, the side-by-side fixtures, the C/G/H/F/Q capture keys; everything staged, zero agent-blocked prerequisites) — the rounds remain the USER's own lane (a lane, never a blocker; the plan never blocks on them)."
    ),
    (
        "**USER-GATED (the R34 register, top of this doc): fps · the playhead cadence · the programMonitor rows · the human rounds.** No agent silently resolves a gated row.",
        "**USER-GATED (the R34 register, top of this doc — RESOLVED R35: fps [both 24+30] · the playhead cadence [frame-snapped, convention-ruled] · the programMonitor rows [app-state-first]; the human rounds remain the user's own lane). No agent silently resolved a gated row — the user's R35 decision inputs are the register's resolutions of record.**"
    ),
    (
        "- **The WALK exit:** the human sessions run + the registered verdicts collected + w2's extension green.",
        "- **The WALK exit:** the human sessions run + w2's extension green (the three REGISTERED decisions are RULED R35 — the rounds now collect per-round feel-verdicts + confirmation/flip signals through the registered-decision mechanism, never as blockers)."
    ),
])

# ---- 2. HANDOFF.md — the register section (the seam doc must reflect the resolved state) ----
total += fold(".agents/HANDOFF.md", [
    (
        "## The user-gated register (the ONLY items awaiting the user — everything else is agent-actionable)\n\n1. **fps 24-vs-30** — the product frame-rate verdict (the `/view` fps-param MECHANISM landed R34; the product default stays user-gated; until the verdict the app side is the fps-honest rendering).\n2. **The playhead cadence** — frame-snapped ~fps publish (current, 18:461-conformant) vs an unquantized display path — recorded each human round (keep = default; switch = registered).\n3. **The programMonitor viewer-state rows around ProgramCanvas** — the app-side decision (the nle-ui empty-testid CR landed R34; the app-side row wiring is the gated call).\n4. **THE HUMAN ROUNDS THEMSELVES** — the round-1 scripted edit session; fully staged, zero agent-blocked prerequisites.",
        "## The user-gated register (RESOLVED R35 — the four decision inputs received + folded; NOTHING product-level awaits the user)\n\n1. **fps 24-vs-30 → RULED: SUPPORT BOTH 24 AND 30** — fps a first-class configurable; both rates in the supported set; the either/or framing retired.\n2. **The playhead cadence → RULED: FRAME-SNAPPED (the NLE-convention gold standard)** — W1-a's research: frame-snapped is the unanimous convention; the unquantized display path RETIRED; the audio-units display variant = the deferred pref-toggle item (r2/audio-era).\n3. **The programMonitor viewer-state rows → RULED: APP-STATE LEVEL ALWAYS, surfacing a separate settings-tier call** — the app-side row wiring is now AGENT-ACTIONABLE (S-app's worklist).\n4. **THE HUMAN ROUNDS THEMSELVES** — remain the user's own lane (never a blocker); the rounds collect feel-verdicts through the registered-decision mechanism."
    ),
])

# ---- 3. 18-ui-shell.md:461 — the playhead row gains the convention-ratification note ----
total += fold("18-ui-shell.md", [
    (
        "**playhead never animates** (position is per-frame state, not a tween);",
        "**playhead never animates** (position is per-frame state, not a tween — **RATIFIED R35 as the industry convention**, W1-a's research: all three reference NLEs frame-quantize the playhead; the only sub-frame flavors are audio-domain display variants [Premiere's Show Audio Time Units; Resolve's align-audio-edits pref], registered as the deferred r2/audio-era toggle, never an unquantized playhead);"
    ),
])

# ---- 4. 18-ui-shell.md:167 — the viewer-state rows gain the app-state-first ruling ----
total += fold("18-ui-shell.md", [
    (
        "`shell-viewer-state-empty` joins the census explicitly (the mock shipped loading/error rows but rendered the empty row without its testid; ARCH-R15 §2.6 registers the mock patch, and Tier-3 empty-state assertions target this id).",
        "`shell-viewer-state-empty` joins the census explicitly (the mock shipped loading/error rows but rendered the empty row without its testid; ARCH-R15 §2.6 registers the mock patch, and Tier-3 empty-state assertions target this id). **R35 ruling (the app-state-first principle):** the state rows exist at app-state level ALWAYS — around ProgramCanvas in the app composition too (loading/error/empty), surfaced by default with surfacing itself a settings-tier toggle; the app-side wiring rides S-app's worklist (the nle-ui CR pair landed R34 @ `cb04919`)."
    ),
])

print(f"\nTOTAL: {total} edits applied")

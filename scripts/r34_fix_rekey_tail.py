#!/usr/bin/env python3
"""r34_fix_rekey_tail.py — the last 18 LIVE-stale sites (10/12/15/16) the rekey-rest
agent left when its deadline hit. Anchors exact; every edit asserts once."""
import io, os, sys
REPO = os.path.dirname(os.path.abspath(__file__)) + "/.."

E = []

# --- 10-fcpxml-export.md ---
f = "10-fcpxml-export.md"
E += [(f, "package.json:28 — R33, engine seal-round register P3-33, re-anchored @ `7664603`, was :23; the 1.50.8-EXACT claim unchanged)",
        "package.json:28 — R33, engine seal-round register P3-33, re-anchored @ `7664603`, was :23; the 1.50.8-EXACT claim unchanged — re-verified R34 @ `d28847c` (package.json:28 exact)"),
      (f, "re-anchored @ `7664603`, was App.tsx:56, substance unchanged)",
        "re-anchored @ `7664603`, was App.tsx:56, substance unchanged — re-verified R34 @ `d28847c` (App.tsx:57 exact)"),
      (f, "seal-round register P3-33: re-anchored @ `7664603`, was :56,",
        "seal-round register P3-33: re-anchored @ `7664603`, was :56, re-verified R34 @ `d28847c` (App.tsx:57 exact),")]

# --- 12-testing-strategy.md ---
f = "12-testing-strategy.md"
E += [(f, "(verified at engine `2a0ecf4` + app `7664603`;",
        "(verified at engine `2a0ecf4` + app `7664603` — re-verified R34 @ engine `60232ea` + app `d28847c`;"),
      (f, "**Engine side: coverage LANDED at W3** (`2a0ecf4`)",
        "**Engine side: coverage LANDED at W3** (`2a0ecf4`; re-keyed R34: the pin `60232ea` — the job's runs GREEN since the R34 variable fix)")]

# --- 15-wire-protocol.md ---
f = "15-wire-protocol.md"
E += [(f, "file:line @ **`008e7f3`** — the R33 live re key",
        "file:line @ **`8f96ab2`** (re-keyed R34, was `008e7f3` — the api.ts src diff EMPTY through the R34 CR waves, the cites stand) — the R33 live re key"),
      (f, "`17a19f8..008e7f3` src-diff EMPTY; **the census UNCHANGED — 31 = 28 routed + 3 exceptions, machine-checked**",
        "`17a19f8..008e7f3` src-diff EMPTY — **R34: `008e7f3..8f96ab2` the CR waves touch the components tree (TimelineView/context-menu/keybindings/actions) but api.ts EMPTY; the wire census UNCHANGED through R34 — 31 = 28 routed + 3 exceptions, machine-checked (the carriers are props, not verbs)**"),
      (f, "(verified live @ `008e7f3`)",
        "(verified live @ `008e7f3`; re-verified R34 @ `8f96ab2`)")]

# --- 16-keyboard-shortcuts.md ---
f = "16-keyboard-shortcuts.md"
E += [(f, "- OT @ HEAD **`008e7f3`** — **675/675** (77 milestone entries — the total only,",
        "- OT @ HEAD **`008e7f3`** — **675/675** (77 milestone entries — the total only, — **R34: OT @ `8f96ab2` — 714/714 @ 83 entries** (the M64 /view fps param + the M59/59A/59B/59C/59D carrier families [CR-1/2/3/4/5/8/9 LANDED]; the wire census 31 = 28+3 UNCHANGED — the carriers are props, not verbs),"),
      (f, "consumers nle-ui @ `1e0c30b` (743/743 — the C0 MiniShell composition LANDED 701→737 + the D52 twin 737→743) + OT HEAD `39003d3`",
        "consumers nle-ui @ `cb04919` (747/747 — re-keyed R34, was `1e0c30b`/743: the DeliverPage supersede contract + the viewer-state-empty CR pair; the C0 MiniShell + the D52 twin beneath) + OT HEAD `39003d3`"),
      (f, "**[R32: the D52 two-keymap yield LANDED — the twin became REAL: nle-ui `1e0c30b` gains",
        "**[R32: the D52 two-keymap yield LANDED — the twin became REAL: nle-ui at its R32 pin `1e0c30b` gains"),
      (f, "`useShortcuts.ts:98/:114` at the current pin `1e0c30b`",
        "`useShortcuts.ts:98/:114` at the then-current pin `1e0c30b` (R34: `cb04919` — the cites re-verified exact, the D52 block unmoved by the CR pair)"),
      (f, "the app `ce7cfc3` implements the member over the app-layer flag store",
        "the app `ce7cfc3` (R32's pin of record; `d28847c` at R34 — the flag store unmoved) implements the member over the app-layer flag store")]

ok, miss = 0, []
files = {}
for f, old, new in E:
    if f not in files:
        files[f] = io.open(os.path.join(REPO, f), encoding="utf-8").read()
    n = files[f].count(old)
    if n != 1:
        miss.append("%s: %d hits for %r..." % (f, n, old[:60]))
        continue
    files[f] = files[f].replace(old, new, 1)
    ok += 1
for f, t in files.items():
    io.open(os.path.join(REPO, f), "w", encoding="utf-8", newline="").write(t)
print("applied %d/%d" % (ok, len(E)))
for m in miss:
    print("MISS:", m)

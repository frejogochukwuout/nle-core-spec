#!/usr/bin/env python3
"""R34 W2 fix — collapse the 9 append-form edits that the second run of r34_apply_w2.py
doubled (run 2 re-found each appended edit's old-anchor inside its own new text), and
apply the corrected row-07 (the table's current cell is `## Testing`, the real heading
is `## 17. Testing`)."""

import io, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib.util
spec = importlib.util.spec_from_file_location("m", os.path.join(os.path.dirname(os.path.abspath(__file__)), "r34_apply_w2.py"))
m = importlib.util.module_from_spec(spec)
try:
    spec.loader.exec_module(m)
except SystemExit:
    pass

REPO = os.path.dirname(os.path.abspath(__file__)) + "/.."

def load(f):
    with io.open(os.path.join(REPO, f), encoding="utf-8") as fh:
        return fh.read()

def save(f, t):
    with io.open(os.path.join(REPO, f), "w", encoding="utf-8", newline="") as fh:
        fh.write(t)

# The 9 append-form edits that run 2 doubled (label -> (file, old, new))
DOUBLED = {"A1 §14.2 preamble marker", "A16 K2 census record", "A18 K2 tier-row touch-up",
           "A20 §0A app R33 layer", "B2 OT R33 layer", "B3 app R33 layer",
           "B11 battery-posture R34 layer", "B12 K2 marker flip", "B13 K2 census record"}

files = {}
fixed, problems = [], []

for f, label, old, new in m.EDITS:
    if label not in DOUBLED:
        continue
    if f not in files:
        files[f] = load(f)
    t = files[f]
    tail = new[len(old):]
    doubled_form = new + tail
    n = t.count(doubled_form)
    if n == 1:
        files[f] = t.replace(doubled_form, new, 1)
        fixed.append(label)
    elif n == 0 and t.count(new) == 1:
        problems.append("%s: not doubled (already clean)" % label)
    else:
        problems.append("%s: UNEXPECTED state (doubled_form=%d, new=%d)" % (label, n, t.count(new)))

# row 07: the table's current cell is `## Testing` -> the real heading `## 17. Testing`
t = files.get("17-test-plan.md", load("17-test-plan.md"))
old07 = "`07-composition.md` `## Testing` (≈1655)"
new07 = "`07-composition.md` `## 17. Testing` (≈1760)"
n = t.count(old07)
if n == 1:
    files["17-test-plan.md"] = t.replace(old07, new07, 1)
    fixed.append("row-07 corrected")
else:
    problems.append("row-07: %d hits" % n)

for f, t in files.items():
    save(f, t)
print("fixed: %s" % ", ".join(fixed))
for p in problems:
    print("NOTE:", p)

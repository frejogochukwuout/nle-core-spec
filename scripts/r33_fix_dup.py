#!/usr/bin/env python3
"""r33_fix_dup.py — remove the duplicated (R33 @ 2a0ecf4 ...) parenthetical
at 02-workers-threading.md line 15's tail (a W2-6 wave artifact flagged by
the W3-1 agent: the same insertion applied twice)."""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
p = "02-workers-threading.md"
text = open(p, encoding="utf-8").read()

marker = "(R33 @ `2a0ecf4` — the exhaustive-testing waves LANDED"
i = text.find(marker)
assert i >= 0, "marker not found"
# the parenthetical runs to the closing ')'
j = text.find(")", text.find("the engine still has ZERO `new Worker(` sites at `2a0ecf4`.", i))
assert j >= 0, "tail not found"
dup = text[i:j+1]
c = text.count(dup)
print("dup block count:", c)
if c == 2:
    k = text.find(dup, i + len(dup))
    # also swallow one leading space of the second copy
    start = k - 1 if text[k-1] == " " else k
    text = text[:start] + text[k+len(dup):]
    open(p, "w", encoding="utf-8").write(text)
    print("second occurrence removed; residual count:", text.count(dup))
else:
    print("UNEXPECTED COUNT — no edit made")

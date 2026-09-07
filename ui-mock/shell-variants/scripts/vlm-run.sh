#!/usr/bin/env bash
# vlm-run.sh — R23 visual test harness one-shot: capture -> review -> summary.
#
# Usage:
#   bash scripts/vlm-run.sh                          # every story, 1280x800 floor
#   bash scripts/vlm-run.sh --filter primitives      # just a slice
#   bash scripts/vlm-run.sh --filter "primitives,shell-appshell--edit" --limit 12
#
# Flags are forwarded to both steps (each step consumes what it knows and
# ignores the rest): --filter, --viewport (capture), --limit, --layer (review),
# --model-rate (review), --base-url (capture).
#
# Artifacts (relative to the shell-variants repo root):
#   r23-analysis/manifest.json       capture manifest (append-style, kill-safe)
#   r23-analysis/shots/<group>/<id>.png
#   r23-analysis/vlm-findings.json   structured findings
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root: shell-variants

echo "=== [1/3] vlm-capture (screenshots @ floor) ==="
node scripts/vlm-capture.mjs "$@"

echo ""
echo "=== [2/3] vlm-review (vision LLM + rubric) ==="
node scripts/vlm-review.mjs "$@"

echo ""
echo "=== [3/3] summary ==="
node -e '
const fs = require("fs");
const p = "r23-analysis/vlm-findings.json";
if (!fs.existsSync(p)) { console.log("no findings file yet"); process.exit(0); }
const list = JSON.parse(fs.readFileSync(p, "utf8"));
const order = { primitive: 0, panel: 1, shell: 2 };
const sorted = [...list].sort((a, b) => (order[a.layer] ?? 9) - (order[b.layer] ?? 9));
const tot = { P1: 0, P2: 0, P3: 0, ERR: 0 };
console.log(["STORY".padEnd(52), "LAYER".padEnd(10), "P1", "P2", "P3", "ERR"].join(" "));
for (const f of sorted) {
  const c = { P1: 0, P2: 0, P3: 0, ERR: 0 };
  for (const it of f.findings || []) { if (it && it.error) c.ERR++; else if (it) c[it.severity]++; }
  for (const k of Object.keys(tot)) tot[k] += c[k];
  console.log([f.story.slice(0, 51).padEnd(52), String(f.layer).padEnd(10),
    String(c.P1).padStart(2), String(c.P2).padStart(2), String(c.P3).padStart(2), String(c.ERR).padStart(3)].join(" "));
}
console.log("-".repeat(76));
console.log(`TOTAL stories=${sorted.length}  P1=${tot.P1}  P2=${tot.P2}  P3=${tot.P3}  ERR=${tot.ERR}`);
console.log("findings file: " + p);
'

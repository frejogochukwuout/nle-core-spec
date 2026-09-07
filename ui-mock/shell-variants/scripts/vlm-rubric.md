# VLM Visual Test Harness — R23

The reusable instrument that screenshots every Storybook story of the
shell-variants mockup and feeds the PNGs to a vision LLM with a per-story
rubric, filing structured findings. Used all round for live verification and
the final component review sweep.

## Pieces

| file | role |
|---|---|
| `scripts/vlm-capture.mjs` | walks `/index.json` of the live dev server, screenshots every story at the floor, writes `r23-analysis/manifest.json` + `r23-analysis/shots/<group>/<id>.png` |
| `scripts/vlm-review.mjs` | reads the manifest, feeds each PNG to the VLM with the rubric, writes `r23-analysis/vlm-findings.json`, prints a P1/P2/P3 summary table |
| `scripts/vlm-run.sh` | one-shot: capture → review → summary table (forwards flags to both steps) |

Artifacts live under `r23-analysis/` (repo-relative), **not** in `src/`.
No new npm dependencies; nothing in `src/` is touched; the `:3000` dev server
is only ever read (never restarted).

## How to run

```bash
# from the shell-variants repo root
bash scripts/vlm-run.sh                                # everything, 1280x800
node scripts/vlm-capture.mjs --filter primitives       # just a slice, capture only
node scripts/vlm-review.mjs --filter shell-appshell--edit --layer shell
node scripts/vlm-review.mjs --layer shell --model-rate 500
```

Flags (each script consumes what it knows, ignores the rest):

- `--filter subs` — comma-separated substrings; a story matches if any hits
  its **id**, kind (**title**) or **name**. e.g. `--filter "primitives,shell-appshell--edit"`.
- `--viewport WxH` — capture target, default **`1280x800`** (the registered floor).
- `--limit N` — cap story count (capture and review both honor it).
- `--layer primitive|panel|shell` — review filter (layer taxonomy below).
- `--model-rate ms` — delay between VLM calls, default 300.
- `--base-url url` — capture target, default `http://localhost:3000`.

Everything is deterministic and re-runnable: re-capturing a story overwrites
its PNG and upserts its manifest entry; re-reviewing upserts its findings
entry. Manifest and findings are written **append-style with an atomic
tmp+rename after every story** — a killed run always leaves a consistent
file covering the stories that finished.

## Layer taxonomy (drives review order)

Every manifest entry is tagged `layer`, and `vlm-review` reviews in
**primitive → panel → shell** order (the final component review sweep order):

- **primitive** — `Primitives.stories` (faders, knobs, strip meters).
- **panel** — component stories: `Mixer`, `Color`, `Pages`, `Chrome`,
  `Overlays`, `Regions`, `Timeline`, `Shell/Components`. One panel/region
  isolated on the canvas.
- **shell** — full-shell composites: `Shell/AppShell`, `Shell/Variants`, and
  any story whose name starts with `Full Shell` (e.g. Chrome's
  "Full Shell — Effects (FX page)").

## Known laws (do not "fix" these away)

1. **The iframe width law.** The story renders inside
   `#storybook-preview-iframe`; in Storybook 10.6 its width can lock at a
   stale **1920px** even on a fresh 1280 viewport (observed live). Before
   every screenshot the capture script forces the whole chain — outer iframe
   `width`/`height` attributes + inline styles (with `!important`), plus the
   inner `#storybook-root` canvas width — to the exact target viewport,
   re-verifies the width stuck, and re-forces up to 3 times if the manager
   UI snaps it back. If you write a new capture path, keep this.
2. **The 1280x800 floor.** Every layout claim in this repo is budgeted at
   1280x800 — that is the primary (default) capture viewport. The screenshot
   is an **element screenshot of the preview iframe itself**, so the PNG is
   exactly 1280x800 of story pixels: no Storybook sidebar/toolbar noise, and
   the app lays out at true floor dimensions (height forced to 800 too —
   `100%`/`100vh` inside the iframe resolve against the forced height).
   Clipping you see at this size is a *real* floor finding, not an artifact.
3. **VLM strictness calibration.** The rubric says "Be strict but do not
   invent issues." Severity scale: **P1** = visibly broken/blocker (clipped
   primary content, overlap, dead controls), **P2** = rough but functional
   (minor misalignment, tight contrast), **P3** = polish. An empty array `[]`
   is a valid, common answer. The reply is parsed defensively (code fences
   stripped, first-balanced-`[...]` extracted, severities coerced), and a VLM
   call that fails 3 attempts (1 + 2 retries) yields a
   `findings: [{error: "…"}]` entry — the batch never crashes. Count those
   under the `ERR` column and re-run; they are not component bugs.
4. **Backend-only SDK law.** The VLM calls run in node scripts via
   `z-ai-web-dev-sdk` (`zai.chat.completions.createVision`, thinking
   disabled, image as `data:image/png;base64,…`). Never client code.
5. **Browser path (what actually works here).** Playwright resolves through
   the `/home/z/node_modules → /home/z/.npm-global/lib/node_modules` symlink
   (global install, no repo dep added), with Chromium binaries in
   `~/.cache/ms-playwright` (chromium-1200/1234). Fallbacks, in order, if
   that ever breaks: the `agent-browser` CLI (snapshot/screenshot/eval), then
   system chromium `--headless --screenshot`. The SDK resolves from the bun
   global tree `/home/z/.bun/install/global/node_modules/z-ai-web-dev-sdk`
   (loader tries local → bun → npm-global paths).

## Output schemas

`r23-analysis/manifest.json` — array in index.json order:

```json
{ "id": "shell-appshell--edit", "title": "Shell/AppShell", "name": "Full Shell — Edit",
  "layer": "shell", "group": "shell-appshell", "shot": "r23-analysis/shots/shell-appshell/shell-appshell--edit.png",
  "viewport": "1280x800", "iframe": { "w": 1280, "h": 800, "rootW": 1280, "stuck": true },
  "capturedAt": "…" }
```

`r23-analysis/vlm-findings.json` — array in layer order (upserted per story):

```json
{ "story": "shell-appshell--edit", "title": "Shell/AppShell", "layer": "shell",
  "shot": "r23-analysis/shots/shell-appshell/shell-appshell--edit.png",
  "findings": [{ "severity": "P1", "element": "…", "description": "…" }], "reviewedAt": "…" }
```

A findings array of `[{ "error": "…" }]` means the VLM call itself failed —
retry, don't file it as a component bug.

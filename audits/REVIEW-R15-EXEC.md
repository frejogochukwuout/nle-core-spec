# REVIEW-R15-EXEC — Peer review of ARCH-R15 §2/§3 (practical execution / dev-experience audit)

**Task ID:** R15-PR2 · **Agent:** peer reviewer (senior engineer, fresh context, read-only) · **Date:** 2026-09-06
**Doc under review:** `audits/ARCH-R15-assembly-and-path.md` — focus §2 (topology), §3.2 (suites), §3.4 (A0–A8), §3.5 (risks)
**Lens:** can a real senior dev — one who did NOT write these four repos — actually build this, in these durations, with this dev-loop, without going insane?
**Method:** every load-bearing claim below was re-verified against the working trees (engine `f526e67`, OT `0412e41`, WDC `5243c49`-materialized, mock `d42693e`): read `.gitmodules`/`tsconfig.json`/`vitest.config.ts`/`ci.yml`/`package.json` of each repo; read `TimelineView.tsx` import surface in full; grepped OT `src/` for `next` imports (exactly one, type-only, in the fixture `layout.tsx` — NOT in the view layer); read `view/page.tsx` + `m17-real-mouse.mjs` + `run-timeline-tests.mjs`; grepped the OT phase scripts for URL env binding; read WDC `effects.ts` worklet URL candidates + `public/worklets/`; grepped engine `src/lib/nle` for external imports, WGSL, worklet and mediabunny usage; read mock `vite.config.ts`/`tokens.css`/`app.css`; read the Player event surface (`player.ts:587-608`).

---

## Verdict: **BUILDABLE-WITH-CHANGES**

The architecture is sound and precedented: the app-as-fifth-repo + pinned submodules + alias discipline is the engine's own proven pattern (`ci.yml:39-53` materialization, `tsconfig.json:26-41` paths, `vitest.config.ts:25-52` insertion-order warning) generalized one level up. The roof-test strategy (module gates stay, app tests only the seams) and the port-then-swap law are genuinely good engineering culture.

What is NOT sound is the **calendar** and two **honest-of-labeling** items:

1. The A0–A8 durations are author-velocity numbers. Bottom-up, for a senior dev new to ~90k LOC across four repos, the plan is ~1.7–2× longer (§5). The "2 devs = 7–9 wk" figure is credible **only for the A3 demo milestone**, not for A7-complete.
2. §3.2 S3's "120 real-mouse tests RE-RUN against the app's timeline region" is mechanically real but proves less than the label says, and the plan does not cost either the fixture replica or its permanent drift-maintenance (§6.1).
3. The dev-loop's TypeScript story ("tsc clean across all vendored sources" in 0.5 wk at A0) is under-specified: three alias dialects, two TypeScript majors, a strictness mismatch, and a vitest major split must be reconciled before day 2, or A0 fails (§2 — with the concrete config).

None of these change the D15/D16/D17 rulings. They change the schedule, one suite's label, and one phase gate.

---

## 1. What I verified that makes the plan REAL (positive evidence)

A peer review that only inflates estimates is useless; here is what checked out, with the receipts a nervous senior dev would want:

- **The dev-loop's core bet is verified: OT's view layer is bundler-agnostic.** `src/components/timeline/**` imports exactly: `react`, `@/lib/timeline` (its own lib barrel), and relative files (grep over all 34 view files). The **only** `next` import in all of OT `src/` is a type-only `Metadata` in the fixture `src/app/layout.tsx:1`. `"use client"` directives are inert strings under Vite. `TimelineView` mounts with `core` + `fps` and nothing else required (`TimelineView.tsx:115-127`). **TimelineView will render under plain Vite + React 19.** The doc never actually verified this; it is true.
- **The engine lib is a clean Vite citizen.** `src/lib/nle` has zero react/next imports (grep = 0 hits). External imports: `@/lib/daw/*` (WDC via alias), one type-only `opencut-timeline` import (`scene-to-segments.ts:43`), `zod` (`headless/api.ts:50`), and `mediabunny` — strictly lazy `await import(...)` (5 sites, all in `export/`). WGSL is inline template strings (zero asset files, verified across `gpu/` + `effects/`); the SoundTouch worklet is a **Blob-URL** load needing no served asset (`soundtouch-processor.worklet.ts:205-214`). So the app's build obligations are: install `zod`+`mediabunny`, alias two import names, copy WDC's 3 worklet files. That is an unusually clean vendoring story.
- **The engine Player is UI-ready.** It has a DOM-style event emitter — `framechange`, `statechange`, `timeupdate`, `seeked`, `ratechange`, `ended`, `error` (`player.ts:587-608`) — and the runner drives it exactly that way (`page.tsx:575`). A3's viewer wiring is real, not hopeful.
- **OT's real-mouse runner is genuinely reusable from the app.** The 13 phase modules are standalone ESM (import only `playwright` + the passed `page`), each navigates a **fresh page load per scenario** to an env-overridable `/view` URL and binds only the `__VIEW_TEST__` contract + `data-test` selectors (`m17-real-mouse.mjs:64-80`). No Next-specific coupling.
- **Token namespaces do not collide.** OT `globals.css:1-14` defines `--bg --panel --panel-1/2 --border --text --muted --pass --fail --accent`; mock `tokens.css` uses `--bg-app --bg-shell --bg-panel --border-hairline --text-primary…`. Disjoint sets. The CSS risk is cascade order + Tailwind preflight, not name collisions (§4).
- **The 2-dev split A1∥A2 is real.** A1 lands in the engine repo (projector), A2 in the OT repo + spec — different repos, different review streams, genuinely parallel.

---

## 2. The dev-loop: the concrete config (MANDATE 1)

### 2.1 The three traps and their fixes

**Trap 1 — three alias dialects.** Engine sources import `@/lib/daw/*` and (type-only) `opencut-timeline`; OT view sources import `@/lib/timeline` and `@/components/timeline` (fixture pages only); the mock ported into `src/` uses `@/*`-style relative-free imports of its own modules. In the ONE app these must coexist. The engine already solved the two-repo version of this (`tsconfig.json:26-41` longest-prefix + `vitest.config.ts` insertion-order). The app must reserve `@/lib/daw`, `@/lib/timeline`, `@/components/timeline` as vendored namespaces — **the app's own `src/lib/` may never contain `daw/` or `timeline/`** — and must NOT run `next` anything (nothing needs it; the engine's Next app stays in the engine repo).

**Trap 2 — TypeScript major + strictness split.** Engine/OT pin `typescript ^5`; the mock pins `^7.0.2`. Engine compiles with `noImplicitAny: false` + `allowJs: true` (its 52k LOC were authored under that); OT is plain `strict`. One flat app tsconfig at full strict **will fail on engine sources** (implicit-any count unknown, plausibly dozens–hundreds over 52k LOC). One flat config at the engine's looseness degrades the app's own rigor. There is no per-directory compilerOptions in a single TS program. The pragmatic answer (and the engine's own precedent — it typechecks vendored OT/WDC only *through its own looser config via the import graph*): **the app config adopts the engine's settings** (`strict: true, noImplicitAny: false, allowJs, skipLibCheck`) and covers app + everything the app imports; each module repo keeps its own stricter gate in its own CI. Cross-module type errors then surface in the app editor (good DX) and in app CI, never silently.

**Trap 3 — dependency skew.** react `^19.0.0` (engine, OT) vs `^19.2.8` (mock) — same major, one copy via `dedupe`, pin exact in the app. vitest `^3.2` (engine) vs `^5` (mock) — the app runs only ITS OWN suites, so `^5`; engine's suite is never run from the app. `mediabunny` must be the **exact** engine pin (`1.50.8`). And a hard workspace rule: **never `bun install` inside `vendor/*`** — an engine-local `node_modules` would shadow `react`/`zod`/`mediabunny` and give you dual instances at runtime (Vite resolves from the importing file upward). `resolve.dedupe` is the belt; the workspace rule is the suspenders.

### 2.2 The config itself (drop-in for A0)

```jsonc
// nle-app/tsconfig.json (excerpt) — longest-prefix semantics, order-independent
{
  "compilerOptions": {
    "target": "ES2022",                        // OT's target; engine's ES2017 is a subset
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext", "moduleResolution": "bundler", "jsx": "react-jsx",
    "strict": true, "noImplicitAny": false,    // ← MATCH THE ENGINE (52k LOC authored under this)
    "allowJs": true, "skipLibCheck": true, "noEmit": true, "isolatedModules": true,
    "types": ["vite/client"],
    "baseUrl": ".",
    "paths": {
      // app-facing module names
      "nle-engine":          ["./vendor/nle-engine/src/lib/nle/index.ts"],
      "nle-engine/*":        ["./vendor/nle-engine/src/lib/nle/*"],
      "opencut-timeline":    ["./vendor/opencut-timeline/src/lib/timeline/index.ts"],
      "opencut-timeline/*":  ["./vendor/opencut-timeline/src/lib/timeline/*"],
      "ot-view":             ["./vendor/opencut-timeline/src/components/timeline/index.ts"],
      "ot-view/*":           ["./vendor/opencut-timeline/src/components/timeline/*"],
      // vendored repos' OWN import names, re-pointed at the APP's pins (engine tsconfig.json:26-41 pattern)
      "@/lib/daw/*":             ["./vendor/web-daw-core/src/lib/daw/*"],
      "web-daw-core/test-harness": ["./vendor/web-daw-core/src/test/index.ts"],
      "@/lib/timeline":          ["./vendor/opencut-timeline/src/lib/timeline/index.ts"],
      "@/lib/timeline/*":        ["./vendor/opencut-timeline/src/lib/timeline/*"],
      "@/components/timeline":   ["./vendor/opencut-timeline/src/components/timeline/index.ts"],
      // app tree LAST — tsconfig longest-prefix makes the specific entries win anyway
      "@/*":                      ["./src/*"]
    }
  },
  "include": ["src/**/*", "tests/**/*", "vendor/nle-engine/src/lib/nle/**/*",
              "vendor/opencut-timeline/src/lib/timeline/**/*",
              "vendor/opencut-timeline/src/components/timeline/**/*",
              "vendor/web-daw-core/src/lib/daw/**/*"]
}
```

```ts
// nle-app/vite.config.ts — aliases are INSERTION-ORDERED (engine vitest.config.ts:13-18 law):
// every specific entry MUST precede '@'; use regex finds, not prefix strings, so
// '@/lib/timeline' can never shadow-match into '@/lib/timeline-foo' or vice versa.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^@\/lib\/daw\/(.*)/, replacement: resolve(__dirname, 'vendor/web-daw-core/src/lib/daw/$1') },
      { find: 'web-daw-core/test-harness', replacement: resolve(__dirname, 'vendor/web-daw-core/src/test/index.ts') },
      { find: /^@\/lib\/timeline$/, replacement: resolve(__dirname, 'vendor/opencut-timeline/src/lib/timeline/index.ts') },
      { find: /^@\/lib\/timeline\/(.*)/, replacement: resolve(__dirname, 'vendor/opencut-timeline/src/lib/timeline/$1') },
      { find: /^@\/components\/timeline$/, replacement: resolve(__dirname, 'vendor/opencut-timeline/src/components/timeline/index.ts') },
      { find: /^opencut-timeline$/, replacement: resolve(__dirname, 'vendor/opencut-timeline/src/lib/timeline/index.ts') },
      { find: /^opencut-timeline\/(.*)/, replacement: resolve(__dirname, 'vendor/opencut-timeline/src/lib/timeline/$1') },
      { find: /^nle-engine$/, replacement: resolve(__dirname, 'vendor/nle-engine/src/lib/nle/index.ts') },
      { find: /^nle-engine\/(.*)/, replacement: resolve(__dirname, 'vendor/nle-engine/src/lib/nle/$1') },
      { find: /^@\/(.*)/, replacement: resolve(__dirname, 'src/$1') },   // app tree LAST
    ],
    dedupe: ['react', 'react-dom', 'zustand', 'zod', 'mediabunny'],
  },
  optimizeDeps: { include: ['zod'] },
});
```

App `package.json` deps: `react`/`react-dom` ^19.2.x **pinned exact**, `zustand ^5`, `clsx`, `lucide-react ^1` (mock's major — engine's `^0.525` is used only by the engine's unused shadcn scaffold, not by `src/lib/nle`), `zod ^4`, `mediabunny 1.50.8` **exact**, `@tailwindcss/vite`+`tailwindcss ^4`, `@vitejs/plugin-react`, `typescript` **one version** (see week -1 spike), `vite ^8`, `vitest ^5`, `playwright ^1.62`, `jsdom`, `@webgpu/types`. **NOT `next`** — nothing in the vendored surface needs it (verified §1).

**HMR specifically:** vendored `.tsx` under `vendor/` are inside the project root, so Vite watches them and `@vitejs/plugin-react` Fast-Refreshes them like app code — an edit in `vendor/opencut-timeline/src/components/timeline/TimelineElementView.tsx` hot-swaps in the running app. This WORKS, but nobody has ever proven it in this program — which is why A0's exit gate must include it (§5). One caveat: `server.fs.allow` never bites (real dirs, not symlinks), but do NOT symlink the submodules to sibling clones for convenience — materialize them properly.

---

## 3. The build/bundle story (MANDATE 2)

**The good news first — it is much simpler than the doc implies:**

- **WGSL:** inline template literals in engine source (verified: 30+ sites, zero `.wgsl` files). Nothing to serve, nothing to configure.
- **Engine worklet:** SoundTouch loads from a **Blob URL** (`soundtouch-processor.worklet.ts:205-214`). Nothing to serve.
- **mediabunny:** strictly `await import()` inside `export/` — Vite code-splits it automatically; it never loads unless the user exports. The app just installs the exact version.
- **zod:** one static import in `headless/api.ts` — normal chunk.

**The one real asset obligation — WDC worklets.** WDC ships 3 **prebuilt JS files** in `public/worklets/` (`dsp-effects-worklet.js`, `biquad-processor.js`, `capture-worklet.js`) and loads them by absolute path with a Node-cwd fallback (`effects.ts:156-159`: `'/worklets/dsp-effects-worklet.js'` then `'public/worklets/dsp-effects-worklet.js'`; same pattern for SF2 in `audio-engine.ts:203`). The app must:

1. copy `vendor/web-daw-core/public/worklets/*.js` → `nle-app/public/worklets/` (a `predev`/`prebuild` script + an explicit CI step; a symlink also works on dev but is Windows-hostile — copy is safer);
2. keep the app served at root base — the absolute `/worklets/...` path **breaks under any non-root `base`** (register this: it forecloses sub-path deploys without an upstream WDC change);
3. note the Node fallback `public/worklets/...` resolves against **process cwd** — the app's vitest must run from the app root, which the copy satisfies for free.

Note the asymmetry the doc gets right (§2.7): the engine's current mixdown passes **empty insert chains**, so today the app serves these worklets for future M2 inserts, not for v1 playback. Do the copy at A0 anyway — it's one line and it kills a whole class of "works in dev, silently unity-passthrough in CI" bugs (WDC's own fallback contract means a missing worklet **fails silently to a passthrough**, which is exactly the kind of bug you want structurally impossible).

**CSS — the actual bundle risk.** One document will contain OT's `globals.css` (1,298 lines: a `:root` token block + view styles + ~half runner-page styles like `.runner`/`.milestone`) AND the ported mock's `app.css` (`@import "tailwindcss"` → preflight + `body{user-select:none;overflow:hidden}` etc.). Token names are disjoint (verified §1), but base-element rules overlap (`body` in both; Tailwind preflight resets `button` backgrounds that OT's toolbar relies on being set by its own classes — they are, but pixel drift is possible). Rules:

1. Import order: OT's css **first**, app/Tailwind css **second** (Vite injects in import-graph order; make the app entry import `vendor/opencut-timeline/src/app/globals.css` before `./styles/app.css`).
2. Tailwind-4 auto content detection only needs to scan the ported mock components — which now live in app `src/` (the mock is **ported, not vendored** — §2.1 has only 3 submodules; correct). No `@source` directives needed *unless* mock code is kept under `vendor/` — don't.
3. Add 3–5 Playwright screenshot rows to S3 that pin the timeline region's pixels against OT's own `/view` screenshots — the only honest guard against preflight/token drift. (OT's own suite already writes full-page screenshots to `download/` — same pattern.)
4. Ask OT (small additive PR, their seal rules allow it) to split `globals.css` into `view.css` + `runner.css` — else the app carries ~600 lines of dead runner styles forever. Cosmetic, MINOR.

---

## 4. Ranked findings

### CRITICAL

**C1 — The A0–A8 durations are author-calibrated, not fresh-senior-calibrated.**
Bottom-up (§5 has the table): A2's op-port wave is the worst offender — 4 op families ported *into OT's preview/journal/history invariant system* with carried tests and a re-convened peer round (risk #2's own mitigation). OT's own W9 history is the calibration point: each review round was a full session, 3 peer + 2 external rounds for the port itself. 4 families × (port + invariant reconciliation + carried tests + review latency) ≈ **3–4 wk alone**; add C7 (rename is mechanical, but it touches the 12k-LOC in-page harness + M29 parade + 13 real-mouse scripts — 0.5–1 wk), the engine façade + dispatch-completeness tests (~1 wk), and the §13.15 refresh (0.5 wk) → A2 ≈ 5–6 wk, not 2–3. Same shape for A1 (4–5 wk — no ingestion path exists today: the audio flattener is type-only and the render path consumes engine `TimelineData`, so the projector is a full SceneTracks→TimelineData translator over two unfamiliar 9k-LOC data models, plus the corpus and a Vite+SwiftShader parity harness) and A3 (5–6 wk). **Fix:** adopt §5's table; re-baseline "2 devs = 7–9 wk" to *the A3 demo milestone*; full A7 is ~13–16 wk with 2 devs / ~22–27 wk solo. Also absorb ~1 wk of onboarding ramp (the four SCOUT docs are genuinely excellent onboarding material — cite them as required day-1 reading and A0 becomes the onboarding).

**C2 — S3's "120 real-mouse tests RE-RUN against the app's timeline region" overstates what the mechanism can prove, and costs nothing in the plan.**
What the runner actually binds (verified, `m17-real-mouse.mjs:64-80` + `view/page.tsx:348-373`): a **deterministic fixture page** — fixed insertion order, `resetIdCounterForTests()`, a virtual `MediaRegistry` seeded with `TEST_COLORS`/`TEST_TONES_HZ`, hardcoded layout metrics (50 px/s, track heights), and tests that mutate `__VIEW_TEST__.core` **directly**, bypassing any app bus/store/projector. An app page can honestly reproduce this — but only as a dedicated **dev fixture page** that re-creates the contract, which verifies *the view component under the app's bundler/CSS/React*, not the app's command paths. That is worth doing (it catches CSS cascade drift, alias breakage, React version issues) — but (a) it is ~0.5–1 wk of work inside A3 that the plan doesn't line-item, (b) it is a **permanent drift surface**: any OT change to the `/view` contract must be mirrored in the app's fixture or the pin-bump goes red (nightly HEAD-follow catches this — good — but the plan should say the fixture is maintained, not free), and (c) app-path coverage must come from S2 + the spec-18 §12 command-capture suite, which the doc already lists — so the label just needs honesty. **Fix:** rename the S3 row to "OT's 120 real-mouse phases re-run against an app-owned `/dev/view-fixture` page replicating the `__VIEW_TEST__` contract (view-component verification in app context)"; line-item the fixture in A3; state that integration coverage lives in S2+S3-capture.

**C3 — "tsc clean across all vendored sources" at A0 (0.5 wk) is under-specified and will fail as written.**
Three alias dialects, two TypeScript majors (5 vs 7), a strictness mismatch (`noImplicitAny:false` in the engine), vitest 3-vs-5, react dedupe — §2.1 above is the fix, but it must be *decided* before A0 starts, and the TS-version choice needs a measured spike (does engine+OT source compile under TS7? does mock source compile under TS5? — pick whichever direction is green; my prior is TS 5.x, since both 90k-LOC trees are green under it and only the mock's ~9k is at ^7). **Fix:** §2.2 config becomes an A0 deliverable; the spike becomes a week-(-1) gate (§7); A0's exit gate adds "TimelineView renders in the app with a working HMR round-trip" — the single cheapest de-risk in the whole plan, currently deferred to A3.

### MAJOR

**M1 — "~half of the mock's 596 tests survive the store swap" conflates *portable* with *cheap*.**
The surviving half is view-state/chrome (panel toggles, toasts, dialogs, status rows, geometry — assertions against fields that transfer near-verbatim per SCOUT-D §2). The doc-slice half (snapshot undo `past/future`, scenes mutations, MIN_DUR/link/locked-track laws over the **mock data model**) does not survive at all — each such test needs its assertions re-pointed at the bus/OT-core/engine, which is hand-porting, not reuse. ~300 tests × careful assertion rewrites ≈ 2–3 wk hidden inside A3's 3–4. **Fix:** scope the S3 mock-port to view-state/chrome only (~200 tests, genuinely near-verbatim), and declare the spec-18 §12 command-capture suite (~60) the *replacement* for doc-behavior coverage — it already is, in spirit. Drop the "half of 596" framing from §3.2.

**M2 — A4's headline gate does not exist anywhere and cannot be assembled from existing gates.**
"S4 audio null test (realtime vs offline)" — SCOUT-C's own correction (#4): today's parity evidence is *composed* (H3 component nulls + 29.1 offline≡offline + m30 realtime *behavioral*); no end-to-end realtime-vs-offline null test exists, and the CR-A #6 one-engine-per-mixer guard forbids the cheap "one mixer, two renders" route. Building it (MediaStream tap on the realtime chain, or a same-graph offline re-render through a fresh handle) is ~1 wk of the 1–2 wk budget before any mixer-surface wiring happens. **Fix:** A4 = 2–3 wk, or explicitly split A4-v1 (offline parity + behavioral realtime pins, gap registered) from the true null gate (A4-v2, later).

**M3 — A7 hides engine-repo net-new as "app polish".**
Scopes (waveform/vectorscope), secondary qualifier + power window, CPU transition fallbacks are engine **P2 backlog** items (SCOUT-A §7, `PLAN.md:82-89`) — they land in the ENGINE repo under its gates (API freeze additions, layer fences, milestone browser tests), then surface in the app. A7-as-written bills 2–3 wk for work that is two repos' worth. **Fix:** split A7a (app surface: keymap long tail, i18n posture, a11y residuals — 1–1.5 wk) from A7b (engine P2 line items: scopes ~1 wk, secondary qualifier ~1–1.5 wk — own estimates, own pin bumps, can slip independently of the app).

**M4 — CI composition is directionally right but under-specified where it hurts.**
(a) **Nightly HEAD-follow "bumps pins + runs"** implies CI *write* access to the app repo. Spec it as *opens a bump PR* (GitHub App or a write-scoped PAT distinct from the read PAT) + alerting on drift; "bump main directly" is a footgun. (b) **Where S4 runs:** copy the engine's milestones recipe verbatim — `ubuntu-latest`, `apt-get install xvfb`, `playwright install chromium --with-deps`, then the engine's runner law (`run-nle-tests.mjs:8-12,62-83`): dedicated **Xvfb on :99 + Chromium `headless: false` + `--use-webgpu-adapter=swiftshader --enable-unsafe-swiftshader --use-vulkan=swiftshader`**. GH runners have no GPU; the app's S4 must do exactly this. (c) **The "8 min proven" figure is the wrong venue** — SCOUT-A's 8-min run was *real* WebGPU (`isSwiftShader: false`) in-sandbox; SwiftShader-on-GH is slower and unmeasured for the app's corpus. Measure one S4-shaped job at A0. (d) **PAT rotation:** the read PAT now spans 3 private repos (engine + OT + WDC) with `Contents:read`; rotation = one variable update (`ci.yml:39-53` pattern, `persist-credentials: false` + `::add-mask::` — copy verbatim); write the runbook before the first rotation emergency. (e) Fast lane <5 min: plausible (tsc ~90k LOC ≈ 1–2 min + S1/S2 vitest ≈ 1–2 min) — measure, don't assert. (f) Vite dev-server startup in CI is *faster* than the engine's Next/Turbopack first-compile (`ci.yml:186-191` waits up to 600 s; Vite cold-start is seconds) — wall-time improves, and the 60–600 s curl-wait can shrink.

**M5 — CSS cascade + Tailwind preflight over the vendored view is a real, unlisted risk.**
§3 above: import order, screenshot parity rows in S3, ideally an OT `view.css` split. Not architecture-threatening; pixel-drift-threatening. The doc's §2.7 punch list has the test-attr gap but not this one.

### MINOR

**m1** — A0 0.5 wk → 1 wk (spike fallout + PAT/CI + worklet copy + css order + strictness reconciliation + the HMR gate).
**m2** — OT `globals.css` is monolithic (~½ runner styles); request the additive split or carry dead CSS.
**m3** — Dependency hygiene: exact-pin `mediabunny`/react; `resolve.dedupe`; never install inside `vendor/`; one package manager (bun — engine/OT precedent; the mock's npm is irrelevant post-port).
**m4** — WDC worklets: root-base-only law (register); copy not symlink; the silent-unity-passthrough fallback makes a missing worklet a *quality* bug, not an error — the copy step is a correctness requirement in disguise.
**m5** — Double-vendoring acceptance (§2.5 #4) verified consistent: engine imports OT type-only, so app-level alias shadowing is sound; keep the engine's nested `vendor/` **un-materialized** in the app (non-recursive `submodule update`) and let S1's type-identity check (risk #3) catch divergence — as designed.
**m6** — The OT runner env var is inconsistent: **12 phases read `TIMELINE_TEST_VIEW_URL` but m17 reads `TIMELINE_VIEW_URL`** (verified across all 13 scripts). An app wrapper setting only one silently sends m17 to `localhost:3001` or into connection failure. Set BOTH, or fix OT's m17 (one-line, additive). Also `run-timeline-tests.mjs` cannot be reused wholesale: it forces phase 1 (303 in-page tests against OT's `/` runner page, which the app does not serve) and writes `download/` artifacts **into the submodule tree** (dirty submodule → pin-bump noise). The app's S3 wrapper should import the 13 phase modules directly and re-implement the ~80-LOC aggregation loop, keeping artifacts in the app.
**m7** — FCPXML A6: "export contracts exist engine-side" is generous — engine has *zero* FCPXML references repo-wide (SCOUT-A §6). The phase is pure greenfield + a reference-parser harness that itself needs a choice (xmllint+DTD? a fixture corpus?). 2–3 wk honest; pick the parser at week -1 so the exit gate is testable on day 1.
**m8** — Engine `layout.tsx` "Z.ai Code Scaffold" + "~280 rows" drift (doc §2.7) — confirmed still present at `f526e67`; fold into the next engine commit as planned.

---

## 5. Corrected bottom-up estimate table (fresh senior dev)

| Phase | Doc §3.4 | Corrected | Bottom-up drivers |
|---|---|---|---|
| week -1 pre-flight | — | **0.5–1** | §7 list; doubles as onboarding |
| A0 scaffold + HMR proof | 0.5 | **1** | §2.2 config + TS spike fallout + PAT/CI + worklet copy + css order; exit gate ADDS "TimelineView renders + HMR round-trip" |
| A1 projector v1 + S4 | 2–3 | **4–5** | SceneTracks→TimelineData full translation (rate/timebase, transition two-tier↔element-hung, leaf-channel keyframes, composition/adj families — §2.2's own list, × two unfamiliar 9k-LOC models); parity corpus authoring ~1; Vite+SwiftShader parity harness ~0.5; oracle retirement plumbing |
| A2 bus + C7 + op wave 1 | 2–3 | **5–6** | C7 0.5–1 (harness-wide + M29 + 13 scripts); façade + exhaustive-dispatch tests ~1; **op-port 3–4** (4 families × preview/journal/history invariants + carried tests + peer round + first pin-bump cycle); §13.15 refresh 0.5 |
| A3 shell + first e2e | 3–4 | **5–6** | chrome port + store swap 2–3 (with M1's re-scoping); view mount + mediaLookup + `onViewStateChange` OT patch 0.5–1; player/export e2e wiring 1.5–2; `/dev/view-fixture` 0.5–1 |
| A4 audio surface | 1–2 | **2–3** | M2: the null-test rig is net-new |
| A5 project + scenes | 1–1.5 | **1.5–2** | round-trip + scene-switch preservation tests |
| A6 FCPXML | 1–2 | **2–3** | m7: greenfield, zero engine refs, parser harness |
| A7 color + polish | 2–3 | **1–1.5 (A7a app)** + **2–2.5 (A7b engine P2)** | M3 split |
| **Total** | **11–16** | **~22–27 solo / ~13–16 two-dev (A7-complete)** | demo (A3) lands ~11–13 solo / ~7–8 two-dev |

**Where the 2-dev math actually breaks (MANDATE 6):**
- **A3's e2e gate is preceded by BOTH A1 and A2** (render needs the projector; commands need the bus+rename). Only the chrome port parallelizes; the "first end-to-end" milestone does not.
- **The projector is single-context work** — one head holding both data models; splitting A1 across two devs produces interface churn, not speed.
- **One app repo = one integration point.** With both devs landing module-repo PRs, pin-bump PRs serialize; the §2.5 one-day tracking rule is right but unpriced — assign an integration owner and a daily bump ritual.
- **A4→A5→A6 chain after A3** — the second dev's tail is the mock/engine backlogs (or A7b), which is fine, but means the 2-dev speedup decays after A3.
- Net: 2 devs ≈ 0.55× solo wall-time to the demo, ≈ 0.6–0.65× to A7. The doc's 7-9/11-16 ratio (≈0.58) is only honest for the demo.

---

## 6. Test-port friction, honestly (MANDATE 5)

**6.1 OT's 120 real-mouse tests.** Reproducible, with three named frictions: (a) the fixture contract — deterministic ids via `resetIdCounterForTests()` + fixed insertion order + the virtual registry + layout metrics; the app fixture should *import OT's layout constants* rather than hardcoding them (better than OT's own `/view`, which hardcodes — `view/page.tsx:364-371`); (b) the env-var split (m6: `TIMELINE_VIEW_URL` vs `TIMELINE_TEST_VIEW_URL`) + artifact-dir pollution + phase-1 coupling → write an app wrapper, don't reuse the runner; (c) the drift surface (C2). Verdict: **buildable, honest as a view-component harness, mislabeled as app integration.**

**6.2 The mock's 596 → "~half survive".** What specifically breaks (SCOUT-D §2, verified in `useUiStore.ts` structure): (i) `past/future` snapshot-undo assertions — the app's undo is OT's op-log via wire commands; every undo test's assertion target changes; (ii) doc-mutation assertions (`moveElement`/`trimElement`/`splitElement`/... over the mock's float-seconds `SceneJSON` with 24-fps-hardcoded TC math) — replaced by bus commands against OT's tick-based `SceneTracks`; (iii) the mixer sidecar (`MockMixerScene`) → engine `MixerTrackSettings` — shape-adjacent but semantically different homes; (iv) save-sim + `playRate` transport — replaced by engine events. What survives verbatim: view-state (panels, geometry clamps, tool mirror, JKL rates, toasts, cheat sheet, testids). Verdict: **~200 near-verbatim ports + ~60 new command-capture tests replace the "~300 survive" framing** (M1).

---

## 7. Week -1 pre-flight list (MANDATE 7 — what a senior demands before starting)

1. **TS one-compiler spike (gate):** run `tsc` over app + engine-lib + OT lib+view + mock shell under the §2.2 config, with TS 5.x and TS 7 both tried; pick the green one; record the implicit-any count that justified `noImplicitAny:false`.
2. **Vite HMR spike (gate):** throwaway app page mounting OT's `TimelineView` next to mock `Toolbar2`; verify Fast-Refresh on a vendored-file edit; verify CSS import order; screenshot vs OT's `/view`. Half a day, retires the plan's biggest unverified bet.
3. **Alias strategy decision (write it down):** adopt §2.2 verbatim; reserve `@/lib/daw`, `@/lib/timeline`, `@/components/timeline` as vendored namespaces; forbid `src/lib/{daw,timeline}` in app code.
4. **Test-attr unification:** recommend the harness-side dual selector (`[data-test=]` ∪ `[data-testid=]` locator helper) — zero churn in two sealed repos. Dual-emit touches OT + the mock for no test-level gain.
5. **Error-envelope decision:** bus adopts OT's `CommandResult{ok,code}` 5-code set now; the ~24-code refinement queues as a spec-15 amendment. Don't block A2 on it.
6. **State-boundary contract (app store ↔ OT core):** app Zustand holds **view state only**; scene/doc reads are selectors over `core.getScene()` refreshed by `core.subscribe()`; the store is never written by the projector or the engine; undo flows through wire commands. Pin it with an S2 test (undo via wire == via store) on day one of A3.
7. **C7 direction:** bare names (spec 15 wins the 00-vs-15 conflict); refresh §13.15 to the 24-command reality *before* the rename (SCOUT-B §4 — the spec's own worklist is stale at 18).
8. **PAT + CI dry-run:** create the repo + 3 submodules + copy engine `ci.yml:39-53` materialization; one green run; write the PAT rotation runbook (read PAT: 3 repos, Contents:read; write credential: separate, opens bump PRs only).
9. **FCPXML reference-parser choice:** pick and vendor the validator/fixture corpus so A6's exit gate is executable from day 1.
10. **S4 venue calibration:** run one trivial app page through the engine's Xvfb+SwiftShader job config; record wall-time; re-derive the nightly budget from measurement.
11. **Onboarding pack:** the four SCOUT docs = required day-1/2 reading (they are the best onboarding this program has); A0 doubles as the first week of context.
12. **W8-f/W9 panel re-convene for the op-port wave:** book the reviewers' calendars now (risk #2's mitigation has lead time).

---

## 8. Answers to the mandate questions, one line each

1. **Dev-loop:** yes — verified OT's view has zero Next deps; the §2.2 config makes all three vendored sources typecheck+serve under one app; react 19.0/19.2 dedupe to one copy; the real conflicts are TS 5-vs-7 (spike) and vitest 3-vs-5 (app runs only its own suites — moot).
2. **Build/bundle:** one Vite build serves all — WGSL inline, engine worklet Blob-URL, mediabunny code-split; the only asset obligation is copying WDC's 3 worklet files to `public/worklets/`; the only genuine risk is CSS cascade/preflight order.
3. **A0–A8 realism:** no — A2 and A1 are ~2× the estimates; corrected table in §5.
4. **CI composition:** split is right; HEAD-follow must open PRs not push; S4 runs on GH ubuntu + Xvfb + SwiftShader exactly per engine `ci.yml`/`run-nle-tests.mjs`; fast-lane <5 min plausible-unmeasured; nightly <45 min plausible-with-margin; PAT spans 3 repos, rotation runbook required.
5. **Test-port friction:** the 120 re-run is real but is fixture-contract replication (view-component verification, not app integration); "~half of 596" is really "~200 verbatim + ~60 new command-capture"; details §6.
6. **Team size:** the A3 gate serializes on A1+A2; the projector is single-threaded; one integration repo serializes pin bumps; 2-dev 7–9 wk = the demo milestone, not A7.
7. **Week -1:** §7, twelve items, two of them gates.

**Review state:** read-only respected on all four repos; this file + the worklog entry are the only writes.

**Recommendation to the author:** land D15/D16/D17 with §5's corrected table, C2's S3 relabel, M1's S3 re-scope, M3's A7 split, and §2.2's config as an A0 artifact. The plan's *structure* survives review intact; only its calendar and two labels need surgery.

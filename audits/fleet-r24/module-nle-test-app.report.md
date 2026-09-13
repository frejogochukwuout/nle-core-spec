# Module Card — nle-test-app (the APP layer) — Fleet R24, Task R24-1e

- **Auditor:** research-only sub-agent (R24-1e). No repo files edited; no mutating git commands; this file is the sole write.
- **Audited at:** working tree == HEAD, `main` synced with `origin/main`.
- **Sandbox note:** `vendor/nle-engine`, `vendor/nle-ui`, `vendor/web-daw-core` submodules are **not checked out** here (empty dirs; `git submodule status` prefixes `-`) and `node_modules/` does not exist — **vitest not runnable in this sandbox**. Test count is verified by static `it/test` census of the 6 suite files + commit-message claims; authority is marked accordingly. The OT upstream repo IS available locally (`/home/z/my-project/opencut-timeline`), so the port census and lock-copy byte-exactness were verified **LIVE** against a `git archive c15a629` extraction (read-only).

---

## 1. VERIFIED STATE

| Item | Value | Authority |
|---|---|---|
| HEAD | `c885ece` ("R9 W-B: the 7 no-conflict adopt-wholesale files…") — `main` == `origin/main` | live git |
| Test count | **174** — static census: GluedShell 70 + audioService 40 + sceneBridge 25 + persistence 17 + deliverService 15 + engineSeam 7 = 174 | live grep (matches commit claim "174/174 + tsc" at `c885ece` and `45c00d1`; suite NOT executed here) |
| `.agents/` | **STILL ABSENT** in this repo (as at R23) — README:1-4 says the `.agents/` docs live in the nle-ui repo (confirmed: nle-ui tree has `.agents/`) | live ls |
| Baseline delta | R23 pin `70e99f0` (117 tests) → `c885ece` (174 tests): +57 tests, 20 commits | git log |
| vendor/nle-timeline (lock-copy) | **upstreamHead `c15a629`** (`UPSTREAM.lock.json`); **verified byte-exact** vs `git archive c15a629 src/lib/timeline` minus `testing/`: 0 diff files, 0 missing, 0 extra, 14,912 LOC both sides | live cmp |
| vendor/nle-engine (submodule) | **`5036387c7a9cdb969f5234754c3a012bfed58187`** (re-pinned at R9 W-A `45c00d1`, "its own submodule re-pin, 458/458") | git submodule status (recorded pin; dir empty here) |
| vendor/nle-ui (submodule) | **`fc4cc35ec85333617e6f22f4acedce804bb83aaf`** (R8 wrap re-pin `868db66`; local clone at /home/z/my-project/nle-ui confirms HEAD == `fc4cc35`) | git submodule status + local clone |
| vendor/web-daw-core (submodule) | **`85b81b0c56158da1dd2aa4492bb253fa083e7257`** (R9 W-A tail `f166027`, "docs-only seal-round wrap; opportunistic fleet freshness") | git submodule status |
| Other vendors | `vendor/storybook-annotakit` (in-tree file: dep); `mediabunny@1.50.8` EXACT in package.json:23 | live read |

---

## 2. THE LANDING LIST since `70e99f0` (20 commits)

**Pre-R8 docs/audit wave (4):**
- `2a47b16` CR round (SEAL-READY, 4 P3+3 P4): R1 speed→retime dedup + REJECT law + hostile-speed pin; R2 web-daw re-pin f446512→494f6ff; R3 nested opencut submodule→a4e971d; R5 disposeAll tr/sig resets. 117/117.
- `de501ed` merge origin/main; `ec9444d` docs: seal-round worklog entry.
- `869b544` R8 audits: port-convergence R8-A (22 missing upstream hunks/12 files) + remaining-wiring R8-B.
- `a81e438` D29 FINAL (R8-C design): wave-1 re-convergence + W2.1-W2.5 wiring plan; 3 P1 law fixes.

**R8 — the D29 "REAL wiring" round (10):**
- `51592cf` **W2.3 REAL autosave/persistence** — persistenceService.ts (engine-free: nle-ui store + localStorage); 2s debounce keyed on syncSettings-gate identity (NEVER docVersion); boot hydrate at App.tsx module scope; ⌘S/beforeunload/load/save file snapshots; nle-ui re-pin 85dcf57→db2a37b (saveState seam). 132/132.
- `d112b7c` **wave-1 port re-convergence b1+2** — wholesale-adopt 10 upstream component files (P2-6 Y-geometry, P2-8 stable useCallback, P2-9 Escape cancellers) + 2 P2-3 split hunks. 36/40 exact.
- `3d9475c` **wave-1 batch 4** — TimelineView 3-way merge + 4 acceptance pins (F1A-1 marquee-over-lanes, S2 lock-menu, P2-3 mixed-split, P2-9 volume-line Esc). 37/40 exact @ ea10c42. 136.
- `efd8243` **W2.1 REAL sidechain ducking** (U9) — insertEffects maps ducking sidecar→external-sidechain compressor (−30 dB, ratio 1+amount×7); rewireSidechains() after every materializeStrips (sever-all zero-arg + collectSidechainWires shared contract). Pins ×5. 141.
- `278b95b` **W2.4 REAL deliver export** — deliverService.ts + mediabunny@1.50.8: master preset via renderCompositionCore deep import, spec-dims OffscreenCanvas painter, SceneMixer.renderOffline over the real segment pipeline, ranged/abort/frame-PNG paths; nle-ui→3f78df4 (exportRequest seam). Pins ×17. 158.
- `5d72470` **W2.2 EffectsPanel drop targets** — port-local x-nle-effect drop layer + EngineMount routing (Transition→setTransition; else→addEffectToElement). Pins ×3. 161.
- `41f5bc9` **W2.5 effects/color preview v1** — ProgramCanvas maps el.effects (enabled-only, id-dropped) via buildElementFilterString (Gaussian Blur honest CSS) + per-scene GRADE final pass (contrast/saturate/brightness/hue-rotate); persistence color sidecar; engine re-pin→8a0b7fe + nle-ui→7280372 (setGrade + ColorPage sliders). Pins ×11. 172.
- `c2be330` **R8-b1 FIX (the scene-switch infinite rebuild)** — load effect dropped `core` from deps; prior-rate read via useCommittedRef; dedicated real-scene-switch regression pin. Root cause: setCore self-retrigger (live since R5; no test ever did a real setActiveScene round-trip). 173.
- `82ce66d` **R8-REV disposition** — all 6 findings fixed (self-duck guard + explicit sidechainSource:undefined vs merge-preserve trap; StrictMode double-boot lastBuilt form; Safari deferred revoke; engine re-pin→4b2dfd1 blur-clamp; nle-ui→1360d78 retryJob revoke). 174.
- `868db66` **R8 wrap** — worklog R8 entry + nle-ui re-pin → `fc4cc35`. 174/174 + tsc + build + boundary + CI green.

**R9 — the D30 "W11 absorption + zero-no-op proof" round (6, MID-FLIGHT):**
- `d5539ba` R9-open: dual fresh-context audits (9-A1 port-convergence ea10c42→c15a629; 9-A2 app-flow zero-no-op).
- `f88935e` D30 FINAL design (audited 9-C1 PROCEED-WITH-AMENDMENTS — all 7 P1s folded).
- `45c00d1` **W-A fleet re-pin** — lock-copy a4e971d→c15a629 (byte-exact, verified live above) + nle-engine→`5036387`; behavior-delta gate (setTracksMuted/setTracksLocked/R3B-8/F1A-3) PASS.
- `f166027` W-A tail — web-daw-core→`85b81b0`.
- `c885ece` **W-B** — the 7 no-conflict adopt-wholesale files @ c15a629 (bookmark-drag, drag-drop, resize, keyframe-box-select, Ruler, BookmarksRow, icons); all new props optional, TimelineView passes none (zero behavior change). 174/174 + tsc.

---

## 3. THE PORT CENSUS (live-verified vs `git archive c15a629`)

**Counts: OT `src/components/timeline` @ c15a629 = 40 files / 8,604 LOC. Port `src/timeline-port` = 40 files / 8,556 LOC.**

| Class | Count | Detail |
|---|---|---|
| **Byte-exact** | **7** | `index.ts`, `theme.ts`, `use-committed-ref.ts`, `icons.tsx`, `hooks/use-cancel-interaction.ts`, `hooks/use-edge-auto-scroll.ts`, `hooks/use-scroll-position.ts` (no `@/lib/timeline` import → identical bytes) |
| **Mechanical-exact** (differ ONLY by `@/lib/timeline` ↔ `@vendor/timeline` specifier) | **25** | incl. the 7 W-B adopt-wholesale files (bookmark-drag, drag-drop, resize, keyframe-box-select, Ruler, BookmarksRow land mechanical/bucket-exact post-adopt) + the R8 wave-1 set |
| **Real-diverged** | **7** | see carrier list below |
| **OT-only (missing)** | **1** | `hooks/use-wire-dispatch.ts` (90 LOC) — **NOT present; D30 W-C pending, as expected** |
| **App-only host file** | **1** | `EngineMount.tsx` (306 LOC — the integration layer; audit 9-A1 §7) |

**The 7 real-diverged carriers (why each diverges):**
1. `TimelineView.tsx` (555 diff-lines) — the R8 6-layer port-local stack (D25 zoom/selection bridges, W2.2 effects-drop layer, confirmDelete, #timeline-scroll, EMPTY_CONTEXT_ITEMS, functional setPos + P2-6/P2-8/P2-9 adoptions) vs upstream W11 zones (wire dispatch, loop band, save/load, error chip). **W-C 3W pending.**
2. `hooks/use-timeline-actions.ts` (369) — confirmDelete gate × wire dispatch; shuttle × M28R jkl. **W-C 3W pending.**
3. `hooks/use-keybindings.ts` (60) — port S1/z-yield/modal surgery vs upstream JKL ladder + loop rows; Z4 `[data-transport]` guard not yet present. **W-D 3W pending.**
4. `TimelineToolbar.tsx` (125) — still ea10c42 form; upstream W11 adds rate segments, loop buttons, save/load, error chip (all optional props). **W-C AW pending.**
5. `hooks/use-element-interaction.ts` (14) — upstream makes `dispatch` a REQUIRED arg; gated on TimelineView W-C. **AW pending.**
6. `TimelineContextMenu.tsx` (11) — **documented port-local KEEP**: bf9be13 functional `setPos` (the React nested-update CI-red class); upstream unchanged since ea10c42.
7. `hooks/use-playback-ticker.ts` (6) — **documented port-local KEEP**: S1 doc comment + import-form delta only.

Arithmetic: 7 byte + 25 mech = **32 zero-action**; +7 diverged (5 pending W-C/W-D + 2 PL keep) + 1 missing NEW + 1 app host = the 40/40 mirror. **LOC: port shared-39 = 8,250 vs OT shared-39 (8,604 − 90) = 8,514** — the 264-line gap = the 5 pending adoptions (TimelineView +555 raw-diff target ≈1,730 per 9-A1 §5.1, use-timeline-actions, keybindings, Toolbar, element-interaction) minus preserved port-locals.

**Lock-copy engine tree verified separately:** `vendor/nle-timeline` (the `src/lib/timeline` engine) = **byte-exact c15a629 minus `testing/`** — 0 diffs / 0 missing / 0 extra, 14,912 LOC both sides (UPSTREAM.lock.json upstreamHead `c15a629`, mirroredAt 2026-09-08, one localChange = REMOVED testing/).

---

## 4. THE D30 REMAINING WORK (design-r9-d30.md wave plan; verified absent in tree)

- **W-C (the interlocked five)** — `use-wire-dispatch.ts` NEW + TimelineView 3W + use-timeline-actions 3W + use-element-interaction (AW, gated) + TimelineToolbar (AW) + the W11 CSS block (token-adapted into timeline-port.css) + **EngineMount wire mint + `wire` prop + `engineService.attachWire` registry + the wireCoverage carry-forward**. Acceptance pins: wire-routing observability, TRACK_LOCKED chip, rate segments, labels-lock-all, bookmark-remove round-trip. **VERIFIED PENDING:** no `useWireDispatch`/`attachWire`/`wireHandle`/`WIRE_COMMAND_TYPES`/`wireCoverage` hits anywhere in src/; no `rate-seg|wire-error|timeline-loop-band|labels-header-toggles|rate-control|rate-readback` classes in `timeline-port.css`.
- **W-D** — use-keybindings 3W (R5 JKL M28R stateless ladder + **Z4 `[data-transport]` scrub guard**) + ONE nle-ui package commit + re-pin (R6 `r`-key yield-set; Z5 Inspector video-tab link toggle; Z7 StatusStrip truth prop + dirty-dot removal; cheat-sheet truth rows; Viewer scrub `data-transport` attr; Brightness/Hue sliders if cheap). **VERIFIED PENDING:** no `data-transport` in use-keybindings.ts.
- **W-E (app seams)** — R4 loop two-way bridge (3 echo laws, engine-tick domain); **R7 Save/Load wiring** (onSaveScene→saveSnapshotFile, onLoadScene→loadSnapshotFile via port toolbar); Z2 grade→export. **VERIFIED PENDING:** zero `onSaveScene`/`onLoadScene` hits in src/; zero `grade`/`color` terms in deliverService.ts.
- **W-F (the proof)** — the **coverage-gate test module** (drive every routed wire verb via real UI events, assert accumulated ⊇ WIRE_COMMAND_TYPES − exceptions, module-scope accumulator Set) + 3 NEW gesture sims + per-op echo pins + Z6 dead-zone pin sweep (P-series). **VERIFIED PENDING:** no such module; no wire symbols in any test file.
- **W-G (queues + wrap)** — R10 change requests to the three engine repos + spec; DECISIONS D30 entry; SKILL/HANDOFF/PLAN refresh ×2; review round; PR/mirrors. **PENDING** (the 9-A2 CR table = the content).

---

## 5. THE ZERO-NO-OP AUDIT STATE (audit-app-flows-r9.md, at pin 868db66)

- **The census:** 30 surface groups / **177 controls** (inventory rows #1-177): ~127 REAL / 13 DEGR / 21 honest-MOCK / 16 NO-OP, of which **9 unexpected-dead** (worklog R9-open). Verified-clean: transport, JKL, loop, seek, split/trim/delete/duplicate/slip/speed/volume/transition chains, markers, A/V-link, locks, mirror, audio scheduling, ducking DSP+wires, all meters, autosave, monitor composition+effects+grade, deliver master/frame/abort, effects drops, scene switching.
- **The unexpected-dead/defect verdict table (§2, 12 findings ranked):** #1 Save As/Load built+pinned but NO affordance; #2 scene grade never reaches export; #3 A/V-link + lock-all have no app-world surface; #4 scrub-row arrows double-apply; #5 tool keys V/B/T/Y/U/R edit-inert; #6 media-drop unpinned + addTrack unreachable; #7 Inspector transform/pan/preserve-pitch mock-local (pitch misleading — engine hardcodes maintainPitch:true); #8 scene-level dead state cluster (audioLaneBoost, store snap, Tab, focusedTrackId, OPFS mislabel, simulateSaveFail); #9 port undo engine-only; #10 ⌘D/⌘A divergent laws; #11 ColorPage brightness/hue producers + 27 render-neutral transition presentations; #12 keyframe authoring has no UI.
- **The 26-pin plan (§3 P1-P26) + the Z1-Z7 fixes: ALL STILL PENDING** — nothing from the verdict table has landed since the audit (only W-A/W-B vendor/file re-pins landed, which change zero behavior). The 11 engine-seam CRs (§4: nle-engine×5 incl. transform sidecar/maintainPitch/grade-in-composition-law/CSS-subset/LUT-preview, nle-ui×4, opencut×1, spec×1) are queued for W-G.
- The 9-C1 amendments are folded into D30 (loop 3-laws, coverage accumulation+carry, wire-mint→W-C, 3 new gesture sims, Z4/Z5 mechanism fixes, cheat-sheet truth, census arithmetic 40=35+3+2).

---

## 6. THE QUEUE + ROLE

**Role:** the consumer-side validation app — the real shell (nle-ui pinned submodule) + real vendored engines (opencut-timeline lock-copy byte-exact @ c15a629; nle-engine @ 5036387; web-daw-core @ 85b81b0 staged) + the timeline-port. Post-R8 it is "a thin host over real engines for EVERY editing/audio/preview/output surface the engines can back" (worklog R8).

**Next steps (the D30 queue, in order):** W-C → W-D → W-E → W-F → W-G. Then out-of-scope carried items: frozen-grammar re-pin batch F1-F4 (maintainer's call), U12 real decode (N5, r4, user-gated), fcpxml (spec-10), LUT/wheels GPU fidelity (engine CR), T1 view-math port (superseded-in-part by W11 view work).

**The honest-mock ledger (what remains mock, by design):** LUT select + wheels (display-only, CR5); real media decode U12 / video import / ⌘I (toast); fcpxml export (page-mock); Inspector Transform/Flip/Pan mock-local (CR1/CR9); preserve-pitch toggle (engine hardcodes true, CR2); transition presentations (render-neutral); tool system edit-inert; ColorPage Brightness/Hue producers (CR6); StatusStrip "OPFS" mislabel + retry drill dead (CR7/Z7); Save As/Load service built but affordance-less until W-E/R7.

**K3/K4 state:** **NO LAW-NET re-expression exists app-side; NO e2e** (grep `law-net|lawnet|e2e` over src/, docs/, worklog.md = zero hits). As expected — that's the spec plan's K3 (the 322-authored corpus re-expression) / K4 (mini-parity e2e) work, still future. The app's machine-check corpus today = the 174-test glue suite; the "every timeline op" coverage gate (W-F) is the app-side approximation, still pending.

---

## 7. SPEC-FACING STALENESS (best-effort; read-only, nle-core-spec)

Top contradictions/supersessions/misses (line refs to the spec files):

1. **09-project-model.md:15** — "nle-test-app @ `70e99f0` — 117/117 … (Consumer pins at this HEAD: nle-ui @ `85dcf57` … OT vendored mirror @ `a4e971d`, engine @ `4ef0147`)" — **STALE ×4:** app is `c885ece`/174; pins are nle-ui `fc4cc35`, OT mirror `c15a629` (byte-exact, live-verified), engine `5036387`, + web-daw-core `85b81b0`. Also "sceneBridge … 503 LOC" has drifted (suite now 25 tests → unchanged, but the R8-R9 rounds re-touched the tree).
2. **09-project-model.md:20** — "ProjectJSON persistence … STILL OPEN at `70e99f0`: **no OPFS/IndexedDB/localStorage surface exists anywhere app-side** — the store's `saveNow` is the mock ⌘S toast drill" — **CONTRADICTED** by R8 W2.3 (`51592cf`): persistenceService.ts is REAL localStorage autosave + boot hydration + ⌘S flush + beforeunload + Save-As/Load snapshots, 17 pins, saveState real machine. OPFS itself + migrations + locks remain open; the row needs a rewrite, not just a pin bump.
3. **09-project-model.md:14** — "OT @ `222532c` — 489/489 … the app consumes the vendored mirror @ `a4e971d`" — **STALE + MISSED:** OT's W11 (wire dispatch / HeadlessTimelineApi / coverage gate M49C) landed and the app re-pinned to c15a629 (W-A); the spec's BASE row misses the whole W11 seam that D30 is built on.
4. **18-ui-shell.md:17** — "the timeline port is a **FORK** of OT's canonical tree (39 files) — retiring per D25 … the drift evidence: **the fork is ≥2 upstream waves behind**" — **SUPERSEDED:** the port is now a *converged mirror* under exact-upstream discipline (32/40 zero-diff at c15a629, 5 files pending W-C/W-D adoptions, 2 documented port-local keeps, 1 missing NEW file); "39 files" is now 40. The D25 retire-the-fork framing and the "≥2 waves behind" evidence row no longer describe reality.
5. **18-ui-shell.md:15** — "PRODUCTIZED as the nle-ui package (`85dcf57` … consumer pin re-read live: the app's vendor/nle-ui @ `85dcf57`; **648 tests**" — **STALE:** pin `fc4cc35`, suite 674/674 (worklog R9-open), with the R8 seam additions (saveState, exportRequest, setGrade sidecar, retryJob).
6. **18-ui-shell.md:28** — "The color page's REAL engine binding — the mock's W4 math bound to the engine pipeline (**W-color → r3**)" — **PARTIALLY SUPERSEDED/MISSED:** the app landed the scene-grade final-pass + Contrast/Saturation sliders LIVE (R8 W2.5, monitor-side) and the effects honest-CSS preview subset; what remains is LUT/wheels + the monitor↔export grade divergence (9-A2 defect #2 / CR3). Also **18-ui-shell.md:25** ("P-widen transitionOut — the registered staleness … P-lock-route … Verified still-open @ `85dcf57`") needs re-verification: the app-side symptoms it cites (engine-carried transitionOut, lock-SSOT mirror clobber) landed in the S-round — only the package-side patch-widening half may still be open.

*(Bonus, below the 6 cap: 09-project-model.md:16 "nle-engine @ `b8c6f88` — 440/440" → stale, fleet now `5036387` 458/458; 18-ui-shell.md:26's "~54 of ~178 rows" keymap-long-tail census is superseded by 9-A2's 177-control / 16-no-op / 9-unexpected-dead census.)*

---

*R24-1e — read-only; single artifact: this file. Live verifications: HEAD/submodules via git; port census + lock-copy byte-exactness via `git archive c15a629` extraction + normalized diff; D30 pending-work signatures via grep (use-wire-dispatch, wire symbols, W11 CSS classes, data-transport, onSaveScene/onLoadScene, deliverService grade — all absent); test count via static it/test census = 174.*

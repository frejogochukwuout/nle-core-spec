# W1-e — The shell-variant/full Mountain: Decomposition Recon (R35)

**Task ID:** W1-e · **Agent:** shell-full decomposition recon · **Round:** 35 (workstream E)
**Question (the PO's carve directive, verbatim anchors):** "a much bigger mountain which is shell-variant / full (which is almost a davinci resolve equivalent) which we may even need to carve out into sub-sections (per view, ui group, major feature group, e.g. color workflow, NLE editing, sound, effect / transition, etc.)."
**Posture:** RECON + DESIGN. This doc maps the gold standard (§1-§2), maps our corpus + ladder (§3), proposes the carve (§4), sequences it (§5), and lists sources (§6). No code touched; no other file edited.

---

## §1 The gold-standard map I — DaVinci Resolve's PAGE structure

Resolve organizes the product as **seven hard-switched pages** (bottom app-dock, ⌘1-⌘8-ish per version), each a full-screen environment with its own UI regions and feature groups. Sources: [S1]-[S11].

| Page | Major UI regions (panels/viewers/bins/timeline variants) | Major feature groups |
|---|---|---|
| **Media** | Media Storage panel, Media Pool (bins), preview viewer, clone tool palette | ingest/import, metadata & bin organization, clone/backup, media-pool housekeeping [S1][S5] |
| **Cut** | dual timeline (compact whole-timeline strip + full edit timeline), source tape, single viewer + media pool, fast-review strip, transitions browser | fast assembly, source-tape skimming, fast review (variable-speed skim), quick transitions (drag-to-seam), B-roll splice/slip-slide, on-the-go export [S5][S6][S11] |
| **Edit** | Media Pool (left), dual viewers (source+program), Inspector (right), full multi-track Timeline + track headers, Effects Library rail (Effects/Transitions/Titles), audio meters, toolbar tool cluster | the classic NLE: trim/edit modes, edit overlays, retime controls & speed-ramp curves, Inspector transform/composite/stabilization/lens correction, tracker, effects+transitions DnD, markers, multicam [S7][S8][S9] |
| **Fusion** | node editor (canvas), dual viewers A/B, Inspector (tool params), spline editor, keyframe/curve editor, media pool | node-based compositing, macros/**templates** (Fusion titles/effects applied from the Edit page), trackers/planar, paint/masks, keying [S10] |
| **Color** | clip filmstrip (top), node graph (top right), Viewer (center), color console (wheels/curves/levels/qualifier/windows tabs), **scopes** dock, **Gallery/legacy stills + PowerGrade LUT browser** (right), timeline mini-track (bottom) | color correction & grading: nodes (serial/parallel/layer), Lift/Gamma/Gain/Offset wheels (+Log), curves (Custom/HSI/Hue-vs-*), LUTs & color management, HSL qualifier, power windows + tracking, scopes (waveform/parade/vectorscope/histogram), stills/gallery (a still stores the whole node graph), shot match/version/grade management [S2][S3][S4] |
| **Fairlight** | Mixer (channel strips for every track AND bus: fader, pan, EQ, dynamics, sends, mute/solo/record-arm), track index (headers), full audio timeline, Inspector, sound library, meters, loudness panel | audio post: dialogue editing/cleanup, bus/aux/sub routing, EQ/dynamics/FX rack (per-strip + bus), metering, loudness normalization, Foley/sound-effects library, automation, ADR-style workflows [S3][S12][S13] |
| **Deliver** | Render Settings (left: presets, format/codec/resolution/filename/location), timeline + viewer preview (center), Render Queue (right: jobs, Render All) | export/finish: render presets, custom settings, render queue + batch timelines, remote monitoring, burn-ins [S14][S15] |

Version drift note: Resolve 21 adds a **Photo** page (Photo Albums passing stills into Cut/Edit/Color/Fusion) [S5] — evidence that the page set is a *growing* dock, not a fixed seven.

## §2 The gold-standard map II — Premiere Pro's WORKSPACE structure

Premiere is **panel-based**, not page-based: one panel inventory (~25 panels [S18]), remembered arrangements saved as **workspaces** — **16 default workspaces** in current builds, "based on specific post-production tasks like color, audio, or graphics" [S16]; the classic factory set is Assembly / Editing / Color / Effects / Audio / Graphics / (Titles / Libraries / Metalogging / All-panels, version-dependent) [S17][S19].

| Workspace | Panel arrangement (the panels it foregrounds) |
|---|---|
| **Assembly** | large Project panel (bin/ingest focus), Source Monitor, minimal timeline |
| **Editing** (default) | the four-panel core: Source Monitor / Program Monitor / Project / Timeline [S18] |
| **Color** | Lumetri Color panel (Basic/Creative/Wheels/curves/vignette), Lumetri Scopes, program monitor, timeline |
| **Effects** | Effects panel (video/audio effects + transitions repository [S18]), Effect Controls (the inspector), program monitor, timeline |
| **Audio** | Audio Track Mixer / Audio Clip Mixer, Essential Sound, audio-timeline-heavy layout, meters |
| **Graphics** | Essential Graphics (titles/motion-graphics templates), program monitor, timeline |
| (others) | Captions, Libraries, Metalogging/ingest, Review, Deliver (export via the **externalized** Media Encoder queue — Premiere has no in-app Deliver page) |

**Convergence (the de-facto industry structure).** Both products, read structurally, agree on the same six functional stations: **(1) media/bin (Media page / Project panel), (2) edit (Edit page / Editing workspace: source+program viewers, timeline, inspector), (3) color (Color page / Color workspace + Lumetri), (4) audio (Fairlight / Audio workspace + mixers), (5) effects+transitions (Edit-page Effects Library + Fusion / Effects workspace), (6) deliver (Deliver page / Media Encoder).** Every pro NLE's surface decomposes into these stations — they are the load-bearing skeleton for our carve.

**Divergence (the design axis we already ruled on).** Resolve = **page-per-discipline** (hard switches, full environments, deep vertical tools like the node graph and the Fairlight mixer); Premiere = **same panels, different arrangements** (workspaces are layout presets; discipline depth lives in panels; export is external). Our corpus already ruled its position: **18 §4.8's D50/ARCH-R28 five-page law** — the Resolve page model, simplified (Media/Cut dropped, Fusion→FX, Fairlight→Audio focus mode) — so the carve below is Resolve-shaped, with Premiere as the cross-check reference for panel inventory and the "workspace as preset" idea (our A/B/C direction presets, `variants.ts`, already play this role).

---

## §3 Our corpus + ladder map (what exists where)

**The spec corpus (00-20):**
- **18-ui-shell.md v1.8** — the shell spec: layout regions (§3), panel inventory (§4: toolbar2, MediaPool, Viewer, Inspector-4-tabs, timeline-toolbar/tabs/area/track-headers, app-dock, 5 context menus §4.9, EffectsPanel rail §4.11), gestures→EngineCommand (§5), state binding (§6), chrome-removal ledger (§8 — where Media/Cut dropped, Fusion→FX, Fairlight→Audio-focus are recorded), theming (§9), testids (§10), a11y (§11), shell-mini MVP (§16). **§4.8 is the page law: FIVE pages — Edit ⌘1 / Color ⌘2 / Deliver ⌘3 / Audio ⌘4 (focus mode) / FX ⌘5 (one-flag).**
- **Feature-group specs:** 05 (timeline), 06 (NLE ops — the 10-mode edit matrix), 07 (composition: transitions §6, effect resolution §7, masks §8, audio composition §9), 08 (color grading: wheels §4, curves §5, levels §6, LUT §7, qualifier §8, power windows §9, scopes §11), 09 (project model), 10 (FCPXML export), 11 (cloud render), 03 (playback, A/V sync), 04 (renderer+color pipeline), 15 (wire protocol — incl. `addEffect`/`updateTransition`/`setFade`/`setGrade`/`exportFCPXML`/`exportMaster`), 16 (keyboard — the page keys ⌘1-⌘5 at §3.8), 20 (audio core: the S/G/E model, WDC mixer), 17/12 (test plans).
- **00-master-spec.md** — the stream map (§8) + the decision ledger (D24 ladder, D30 mode matrix, D50 page shape); §10 points at IMPLEMENTATION-PLAN.md.

**The retired shell-variants mock (the shell-full prototype, R17-R26; the code remains under `ui-mock/shell-variants/` + git history as the design-of-record):** built, per PLAN.md round records + the tree — the **COLOR VIEW** (R22 rewrite: ColorPage, ColorInspector Primaries|Curves|Qualifier, WheelsPanel, CurvesPanel y∘r, QualifierPanel, ColorNodeGraph, ScopesDock 4-state, StillsPanel=Gallery), **FX/TRANSITION VIEW** (R23 flagship: FxBrowser / FxInspector / full Timeline in fxMode; seam hit-zones, fades, three-doors routing table, replace-never-stack), **DELIVER VIEW** (DeliverPage, deliverViewStore, TimelineCompact + the 32px RangeBand, presets/queue), **MIXER family** (R20/R24: MixerDock, ChannelStrip, ChannelEditor with EQ/FX, SoundLibrary, StripGraphs, the audio focus mode ⌘4), **TIMELINE family** (Timeline, Clip, TrackHeader, Ruler, TrimAffordances, editModeIcons, SceneTabs, TimelineToolbar, ViewOptionsPopover, TimelineCompact, RangeBand), **SHELL CHROME** (AppShell, AppDock, Toolbar2, LeftDock, Inspector, Viewer, GradedViewerCanvas, MediaPool, ContextMenu, CheatSheet, StatusStrip, ToastRegion, ErrorBoundary) + direction presets A Resolve Classic / B Modern Studio / C Editorial Light + the VLM visual review net. **1,613 it-blocks at retirement** (D35.2 census).

**The live wired BASE (what the mocks became):** `nle-ui` (the shell package: shell/*, pages/ColorPage + DeliverPage, mixer/*, timeline/*, mini/*) and `nle-test-app` (the app, D18) mount the four-page BASE (FX page absorption rides XMOCK-6's r5/K3 per 18 §4.8's IMPL-half registration); `opencut-timeline` (OT) is the canonical timeline tree (D25/D26). `ui-mock/shell-mini` = "the casual bar" (the R35 user ruling) — fully wired mini shell; its harvest ledger lives at `nle-ui/.agents/SHELL-MINI.md` (9 UX laws L1-L9 + ranked harvest candidates). No `nle-test-app/.agents/SHELL-MINI.md` exists (verified).

**The execution ladder (IMPLEMENTATION-PLAN.md §2 — the rails the carve must NOT collide with):** CRAWL K1-K4 **COMPLETE** → WALK (w1 human rounds STAGED; w2 demo legs; w3 project) → **RUN: r1 the port** (the 10-mode trim/insert matrix + the engine-home §4.1A union façade: Effect 5 + Mask 4 + Transition 3 + Export 3), **r2 audio** (G2 async pre-retime + M2 Wave 2/3 — the real mixer surface, 20 §7), **r3 color + NS-4** (the D45 venue table), **r4 media** (deprioritized-by-user), **r5 FCPXML**, **r6 workers**. Critical path: the r1-port EXECUTION round.

---

## §4 THE PROPOSED CARVE

### 4.1 The three structure options weighed

- **(a) BY VIEW** (edit/color/audio/fx/deliver): matches the user's first-mentioned axis, the D50 five-page law, the Resolve page model, and the retired mocks' own file structure (`components/pages/*`). Weakness alone: hides the cross-page UI groups (viewer, chrome, pool) that every page shares — they'd be claimed five times over or by nobody.
- **(b) BY UI GROUP** (viewer/timeline/inspector/browser/chrome): matches the R24 audit fleet's family reviewers and the VLM story families — excellent for *audit* passes, wrong for *plan tracking*: it cuts across the ladder rungs, fragments feature coherence (a color wheel is "inspector"?!), and re-opens settled page law.
- **(c) BY FEATURE GROUP** (color workflow / NLE editing / sound / effects-transitions / media / export): matches the ladder rungs 1:1 (r3=color, r2=audio, r5=export) — the safest against collision, but feature groups without view anchoring lose the "shell" character of this mountain: the mountain IS surface + workflow, not just capability.

### 4.2 The recommendation — a two-level hybrid: **VIEW faces at the top, UI-group + feature-group tracks inside**

**Rationale:** (1) the top level honors the D50 five-page law — no agent can re-litigate page shape while carving the mountain; (2) the second level absorbs the user's "ui group / major feature group" axes *inside* each face where they are coherent (the Color face's feature groups are grade-math/scopes/stills; the Edit face's are the 10-mode matrix/retime/inspector-tabs); (3) the two cross-cutting UI groups that no page owns (shell chrome, shared panels) become their own faces rather than being smeared; (4) the ladder rungs r1-r6 stay the *execution rails* — each rung is a supplier to one or more faces, so the carve extends the plan's RUN-era extension (PLAN.md R35 workstream E's own words) instead of competing with it. This is exactly the Resolve page→panels/feature-groups structure (§1), cross-checked against Premiere's panel inventory (§2).

### 4.3 The carve table (the mountain's named faces)

| Face | Scope (UI groups + feature groups it owns) | Gold-standard anchor | Existing spec coverage | Ladder rungs touching it | Size |
|---|---|---|---|---|---|
| **SF-0 Shell chrome & navigation** | app-dock + five-page law, toolbar2, page-scoped view-state memory, page keys ⌘1-⌘5, direction presets A/B/C, theming/tokens, context menus, toast/notification UX, status strip, cheat sheet, a11y floor, F6 cycle, ErrorBoundary | Resolve app chrome + page dock; Premiere workspace presets | 18 §3, §4.1/§4.8/§4.9, §5A, §6.4, §9-§11; 16 §3.8 | XMOCK-6 r5/K3 (the FX-page absorption — the IMPL half); w2 legs (page routing) | **M** |
| **SF-1 Shared panel families** (cross-page UI groups) | Viewer family (source/program, graded canvas, transport, scrub-row, aspect/CQ letterbox, viewer-max), Media Pool / browser, Inspector framework (4-tab chassis + per-page tab sets), EffectsPanel rail, SourceEditBar/SourceRangeBar | Resolve: shared pool/viewer/inspector chassis across pages; Premiere: Project/Monitors/Effect Controls panels | 18 §4.2-§4.4, §4.11, §4.3 source chrome; SHELL-MINI harvest ledger (viewer-max, aspect, pool tabs, rails) | w2 (the journey legs: pool insert, multi-select); r1 (source-edit family keys) | **M** |
| **SF-2 EDIT VIEW — NLE editing** | the editing surface: timeline grammar (10-mode matrix: trim/insert families, slip/slide/roll/replace/append/ripple-overwrite/fit-to-fill), visual-grammar register, edit overlays, markers/bookmarks, Inspector edit tabs (transform/composite/retime-speed-ramp/stabilization-lite), Edit-page FX tool + effect stack, basic audio handling in-Edit, scene tabs, snapping, link/lock | Resolve Edit page; Premiere Editing workspace | 05 (esp. §8A), 06 (§5.0/§5.9 the mode laws), 16 (§3.4A/B), 18 §4.5-§4.7; mocks: timeline family + shell-mini; OT canonical tree | **r1 (the port — the long pole)**; K1-K4 regression law; w1 human rounds | **L** |
| **SF-3 COLOR VIEW — color workflow** | grade console (wheels, curves, levels), LUT + color management, HSL qualifier, power windows (+tracking), node graph, scopes (waveform/parade/vector/histogram), Gallery stills + PowerGrade-style presets, shot-match/version, clip filmstrip, graded viewer pipeline | Resolve Color page; Premiere Color workspace (Lumetri + scopes) as the reduced mode | 08 §4-§11 (wheels/curves/levels/LUT/qualifier/windows/scopes); 04 (renderer pipeline, 10-bit linear); 18 §4.8 Color entry; mocks: ColorPage family; nle-ui pages/ColorPage (live BASE) | **r3 (color + NS-4, the D45 venue table)**; engine binding blocker noted R27 (46 rgba8unorm sites) | **L** |
| **SF-4 AUDIO VIEW — sound** | the mixer family (channel strips: fader/pan/meters/EQ/dynamics/sends), bus/aux routing, master strip + meters-only collapse, track index/audio timeline surface, Sound Library, loudness/normalization posture, waveform + audioDb display, channel-selected rail law | Resolve Fairlight page; Premiere Audio workspace (Track/Clip Mixer + Essential Sound) | 20 (S/G/E model, M2/M3 roadmap, WDC canon); 03 (A/V sync); 07 §9 (audio composition); 18 §4.8 Audio focus mode; DESIGN-audio-mode ("ONE timeline, ONE clock, ONE command stream"); mocks+BASE: mixer/* | **r2 (audio — G2 + M2 Waves 2/3, the real mixer surface)** | **L** |
| **SF-5 FX/TRANSITION VIEW — effects & transitions** | FxBrowser, FxInspector, fxMode timeline (clips recede, seam hit-zones, head/tail fade zones), the three-doors routing table (seam-mint/replace, clip-body→effect stack, fade→setFade), transition boxes (select/edge-drag/Delete), effect param editing, masks, keyframes, (compositing-depth: spec 07's pipeline, Fusion-scale nodes OUT of scope, registered) | Resolve Fusion page + Edit-page Effects Library; Premiere Effects workspace | 07 §6-§8 (transitions/effects/masks); 08 §3/§10 (effect inventory); 15 (`addEffect`/`updateTransition`/`setFade`); 18 §4.8 FX + §4.11; DESIGN-R23 (the flagship ruling); mocks: fx/* | **r1 Stage-0 engine-home rows (Effect 5 + Transition 3)**; r6 (workers pipeline); XMOCK-6 r5/K3 (page mount) | **M-L** |
| **SF-6 DELIVER VIEW — export/finish** | render settings + presets, the RangeBand export range (loop-seam three-writers law), queue + progress, FCPXML handoff surface, cloud master render | Resolve Deliver page; Premiere/Media Encoder queue | 10 (FCPXML), 11 (cloud render), 15 (`exportFCPXML`/`exportMaster`/`setLoop`), 18 §4.8 Deliver + RangeBand amendment; mocks+BASE: DeliverPage, deliverViewStore | **r5 (FCPXML)** + 11's cloud path; r4 residue (transcode presets) | **M** |
| **SF-7 Dropped-pages register (Media & Cut)** | the negative face: WHY Media/Cut are dropped (chrome-removal ledger), what re-entry would cost, the standing homes of their surviving features (ingest→SF-1 pool; fast-cut/dual-timeline→SF-2; TimelineCompact already lives in SF-3/SF-6 heads) | Resolve Media/Cut pages; Premiere Assembly/Metalogging as ingest-mode analogs | 18 §8.2-§8.4 (the ledger), §4.8's drop ruling; PLAN.md R35 (r4 deprioritized) | **r4 (media — deprioritized-by-user; the supplier rung if re-litigated)** | **S** (registration gate only) |

**The two-level reading:** SF-0/SF-1 = the *ui-group* axis (cross-page); SF-2…SF-6 = the *view* axis, each carrying its *feature groups* (the italicized lists in the scope column — the user's "color workflow, NLE editing, sound, effect/transition" examples land one-per-face); SF-7 = the explicit non-goals ledger. Total: 8 trackable faces, 3 L / 1 M-L / 3 M / 1 S.

### 4.4 Non-collision law with the r1-r6 rails

The ladder stays the *execution* mechanism (engine-side + wiring, gate-defined per D40); the faces are the *product-surface* map the plan tracks. Mapping: **r1 → SF-2 + SF-5's engine-home rows; r2 → SF-4; r3 → SF-3; r4 → SF-7; r5(+11) → SF-6; r6 → SF-5's pipeline depth.** No face gets its own engine workstream — every face's engine demand routes to an existing rung; conversely every rung's UI surface lands in exactly one face (or SF-1 for shared panels). New work discovered during execution files into its face's §0-style forward inventory, never a new mountain.

---

## §5 Recommended sequencing of the sub-sections

1. **SF-0 → SF-1 first (the spine).** Both are largely *hardening + truth-up* passes over the existing nle-ui BASE (the four-page shell is live; the fifth page rides XMOCK-6 r5/K3). They unblock every other face: page routing, panel homes, preset system, the viewer/pool/inspector chassis. Cheap, high-leverage, and they retire the mocks-vs-BASE vocabulary drift the corpus keeps re-reconciling.
2. **SF-2 (Edit View) is the long pole — starts immediately, rides r1.** Design v2 is COMPLETE + audited; Stage 0 → 4 already sequenced. The Edit face absorbs r1's landing surface and the w1 human rounds. Nothing else blocks on its *completion* (r3/r2 can build against contracts), but its engine-home façade (Effect/Transition rows) is SF-5's precondition.
3. **SF-5 (FX/Transition) lands early-mid** — its design is DONE (DESIGN-R23, thrice-iterated: both surfaces, one engine), its engine rows are r1 Stage-0 items, its page mount is XMOCK-6. It unblocks SF-2's Edit-page FX tool coupling and consumes SF-1's EffectsPanel rail.
4. **SF-4 (Audio) ∥ SF-3 (Color) run in parallel mid-ladder**, each gated by its supplier rung (r2's G2/M2 waves; r3's D45 venue table + the engine rgba8→linear binding). The Color face additionally owns the largest *mock→BASE reconciliation* (the R22/R24 rewrite rulings — composition, scopes console states, stills gallery) since nle-ui's ColorPage is the thinnest page in the live BASE.
5. **SF-6 (Deliver) last among the big faces** — its UI exists end-to-end (presets/RangeBand/queue), so it waits on content worth delivering: r5's FCPXML + the graded/audio surfaces upstream. Smallest incremental risk.
6. **SF-7 stays a standing register row** — flips to a real face only by user ruling (the r4 re-entry or a Cut-style fast mode ask). Every round's battery keeps its drop-ruling assertions alive.

**The one-line dependency chain:** SF-0/SF-1 (spine) → SF-2 via r1 (long pole) → {SF-5 via r1-Stage-0 ∥ SF-4 via r2 ∥ SF-3 via r3} → SF-6 via r5 → SF-7 always-open register.

---

## §6 Source list

**Web (searched + read via the web-search/page-reader skills, 2026-09-22):**
- [S1] 2pop.calarts.edu — "DaVinci Resolve Interface and Pages" (the page list; Media/Cut/Color/Fairlight purposes; Media Pool description)
- [S2] blackmagicdesign.com — "Color – DaVinci Resolve" product page (nodes as flow chart; layer-vs-node grading)
- [S3] pixflow.net — Resolve Color Grading for Beginners (log wheels, curves, qualifiers, LUTs, gallery stills) + Fairlight Audio guide (dialogue cleanup, music mixing, bussing)
- [S4] davinciresolve21.com — "How to Color Grade" (gallery stills store the node graph, bottom-right placement) + Cut-vs-Edit differences + Fusion page tutorial + Fairlight mixing/bussing
- [S5] documents.blackmagicdesign.com — DaVinci Resolve 21 New Features Guide (Photo Albums/page set drift)
- [S6] tourboxtech.com — "DaVinci Resolve Pages Explained" (Edit/Color/Deliver as the beginner three)
- [S7] blackmagicdesign.com — "Edit – DaVinci Resolve" (Inspector stabilization/lens correction; effects library drag-to-clip)
- [S8] davinciresolve21.com — Retime curve/speed points (retime + speed ramp affordances)
- [S9] davinciresolveclub.com — Color Grading nodes/LUTs/scopes hub (scopes: waveform, RGB parade, vectorscope)
- [S10] blackmagicdesign.com — "Fusion – DaVinci Resolve" (macros/templates via create-macro) + pie.med.utoronto.ca + pixflow (Fusion clips, clip-level effects are compositions)
- [S11] blackmagicdesign.com — "Cut – DaVinci Resolve" (dual timeline) + rippletraining.com (dual timeline, source tape) + premiumbeat (Cut-page positioning)
- [S12] blackmagicdesign.com — "Fairlight" product page (mixer with channel strips for tracks AND busses; fader/levels)
- [S13] jayaretv.com — Fairlight bussing (bus strip = combined level/processing/effects)
- [S14] davinciresolveclub.com — "Export in Resolve: the Deliver page in seven steps" (Render Settings → timeline/viewer → Render Queue)
- [S15] store.hollyland.com — Deliver render queue mechanics (Add to Render Queue / Render All)
- [S16] helpx.adobe.com — "Premiere workspaces and home screen overview" (16 default workspaces; Assembly's large Project panel)
- [S17] filtergrade.com — Premiere workspace list (Assembly/Editing/Color/Effects/Audio/Graphics/Titles/Libraries)
- [S18] agitraining.com — Premiere workspace tutorial (25 panels; Effects panel as effects+transitions repository; four-panel editing core) + helpwiki.evergreen.edu (Timeline/Project/Program Monitor) + helpx Source/Program Monitor overview
- [S19] skillshare (Cavolo) — nine factory workspaces list
- Search artifacts: `/tmp/w1e-s1…s11.json` (this round's session)

**Local (read this round):**
- `nle-core-spec/18-ui-shell.md` v1.8 (§0A, §3.1, §4.8-§4.11, §16) · `00-master-spec.md` (§8 stream map, §10, Decision index) · `IMPLEMENTATION-PLAN.md` (§2 ladder, §3 workstreams, §6 lineage)
- `.agents/PLAN.md` (the round history: R35 workstream E, R27/R25/R24 spec records, R24/R23/R22 shell-variants records — COLOR VIEW REWRITE, FX/TRANSITION VIEW, deliver/mixer tracks, the recycle reconstruction)
- `nle-ui/.agents/SHELL-MINI.md` (the R7 harvest ledger + L1-L9 UX laws; `nle-test-app/.agents/SHELL-MINI.md` verified absent)
- The trees: `ui-mock/shell-variants/` (design-of-record), `ui-mock/shell-mini/`, `nle-ui/src/components/*` (the live BASE), spec headings of 07/08/10/20

**Next actions (for the orchestrator):** (1) ratify or amend the face set (SF-0…SF-7) at the plan level as RUN-era extension tracks; (2) mint per-face §0-style forward inventories (each face's rows citing its supplier rung); (3) register SF-7's drop-ruling assertions in battery_r35; (4) schedule SF-0/SF-1 as the first face work (the spine hardening) with the XMOCK-6 FX-page mount as its flagship row.

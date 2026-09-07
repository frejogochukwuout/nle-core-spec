# CORE-SEAMS — the shell-mini ↔ core-systems seam audit (R23 seal round)

**What this is:** the complete audit of every interface between the mini UI
and the core systems it will be transported onto (the user's R23 directive:
"audit of all the ui vs. core system seams with NLE engine / timeline /
audio core / project asset etc. and ensure those interfaces are fully
polished and cleaned, expecting to be integrated / transported"). Where
`OT-SEAMS.md` maps the timeline OPS only, this file maps the WHOLE surface —
the timeline, the engine, the audio core, the project/asset model, the
chrome, the view infrastructure, and the transport artifacts themselves —
each with: the exact current interface (code symbols), the target core-side
interface (as registered in the spec set / OT-SEAMS), the polish state, and
the owner+phase for anything not yet clean.

**The audit frame:** the mini is a MOCK — but its LAWS are not improvised
(the OT-SEAMS discipline). The crawl (spec 14 §3.1) ports the mini's UI
grammar onto REAL modules: timeline ops → opencut-timeline (OT), playback →
nle-engine, audio → web-daw-core (WDC) + engine, assets → the project model
(spec 09). Nothing here ships; everything here transports or registers its
own retirement. The port-then-swap law (spec 14 §4.6) governs.

**State vocabulary:** **CLEAN** — the seam is registered, tested, and
transport-ready as-is. **REGISTERED-DELTA** — the mini deliberately diverges
from the core surface; the divergence + the swap path are written down.
**GAP-with-owner** — the target side of the seam does not exist yet; the
owner + phase + acceptance are stated (the posture law, spec 00 D20).

---

> **R24 mapping note (ARCH-R24 D26/D29, fleet R24):** the wire census re-based — the
> 30-name count is now **24 routed verbs + 6 documented exceptions** (`WIRE_COMMAND_TYPES`
> @ OT `c15a629`, M49C machine-checked); this file's "30-command wire surface" citations
> read accordingly. The D25-bridge citations (port-local-props upstreaming; the S1/S7 swap
> paths) are superseded by D26's **census/carrier discipline** — the app's timeline-port is
> a converging mirror (39 mirrors + host), and the structural-half instrument is OT's frozen
> `data-test=` convention (68 sites), not a new testid emission. The R23 note (below) still
> governs the phase mapping.

## 1. The seam inventory

### A. Timeline-domain seams (target: opencut-timeline @ `05584d8`)

| # | Seam | Current interface (mini) | Target (core) | State | Swap path |
|---|---|---|---|---|---|
| S1 | **Doc ops → wire commands** | `useMini` doc actions: `moveClip` `trimClip` `splitAtPlayhead` `deleteSelected` `cutHead/cutTailAtPlayhead` `addClipFromMedia` `insertMediaAt` `nudge` `toggleTrackMute` (`src/state/useMini.ts`) | OT `src/lib/timeline/headless/api.ts` — the 30-command wire surface (the R23 census — was 24 at the R22 pin), `{ok, code}` contract (OT-SEAMS §1 rows 4-9) | **CLEAN** (the 14-row op map + validation-outcome parity: reject/conflict, media-bounded trims, split windowing) | OT-SEAMS §3.1 — renames + param shapes only; `toggleTrackMute` maps to OT's TRACK-level command (prefixed today, C7 rename pending — spec 15 §4.1A Track row, implemented; the ELEMENT-level `toggleElementMuted/Visibility` pair is the separate A2/W-ops wire addition) |
| S2 | **Interaction laws** | `geometry.ts` (pure, 47-test net): `clampMove` `wouldOverlap` `neighborBounds` `clampTrimStart/End` `splitPoint` `insertionAt` `rippleShiftAfter` `magnetTarget`/`resolveSnap` | OT `ops/group-move.ts` + `placement/index.ts` + `snapping/` | **CLEAN** (every law carries its OT-SEAMS row; the law net is the acceptance list — `LAW-NET-INVENTORY.md` Part A) | the app re-implements over the OT snapshot it holds (gap-fit = the registered app affordance, row 5) |
| S3 | **Gesture session discipline** | `ClipItem` pointer session in `Timeline.tsx`: 5px threshold, guarded capture, live previews, clip edge auto-scroll (R18i), C9 unmount lock-release | OT `controllers/element-interaction-controller.ts` (idle→pending→dragging; doc never mutated during drag) | **REGISTERED-DELTA** (the R18k preview-mutates-the-live-mover — view ≡ doc under the neighbor clamp; the frozen law, D22) | OT-SEAMS §3.2 — the gesture engine is the VIEW layer OT's controllers occupy; the seams resolve to S1 commands |
| S4 | **Time base** | float seconds on the 0.5 grid (`geometry.ts` GRID/quantize; `toTicks` in `otProject.ts`) | OT ticks (×120000 — registered §3.4); fps frame-snap when real media lands | **CLEAN** (executable: `src/lib/otProject.ts` — the nearest-tick policy, unit-pinned) | `otProject.toTicks/fromTicks` — the C1 bridge copies it verbatim |
| S5 | **Element model** | implicit in-point-0 full-window Clip (`mockData.ts`) | OT element `trimStart/trimEnd/sourceDuration` (§1.6) | **CLEAN** (executable: `otProject.projectClip` — the registered formula, tick-arithmetic invariant, unit-pinned; stills' synthetic extent registered as a C1 open question) | `otProject.projectClip/projectClipBack` — both directions, tested |
| S6 | **Track/window model** | `Doc.tracks` + `visibleTracks`/`boundClips`/`boundTrackOfKind` (`useMini.ts`) + `trackMode`/`boundVideoTrack`/`boundAudioTrack`/`trackBindingLocked` | OT SceneTracks `{overlay[], main singleton, audio[]}` — the WHOLE project | **REGISTERED-DELTA** (the embedding seam: the mini is a window onto the project, host-injected — OT-SEAMS §1.13) | the mini's `doc` becomes a projection of the bound window; OT arrives behind it via `setTracks()`. **C1-ENTRY DECISION (not code):** the track-shape mapping — which mini video track becomes the OT `main` singleton vs `overlay[]` (recommended: the BOUND video track → main; other video → overlay; audio → audio[]; duration-sorted) — pinned when the OT snapshot is vendored |
| S7 | **Selection** | single-subject XOR: `selectedId` ⇄ `selectedTrackId` + survive-iff-visible healing (`useMini.ts`) | OT `timeline.selectElements` (ElementRef[], multi) | **REGISTERED-DELTA** (pre-registered, spec 14 C1 disposition row 11: app-level selection projection) | the app projects the OT multi-ref selection down to its single inspector subject |
| S8 | **History/undo** | whole-doc snapshots, MAX_HISTORY=50, one-entry-per-gesture (`useMini` past/future) | OT `timeline.undo/redo` (snapshot family, spec 15 §6.2 strategy 2) | **CLEAN** (parity registered §1.12) | the mini's commit becomes the OT snapshot transaction batch (§3.1) |
| S9 | **Keyboard surface** | `useKeys.ts` (Space/S/[/]/Del/±/0/Home/Esc + the form-control skip + C1/C16 laws) | — (the app's own surface; MiniShell OWNS the editing keys incl. undo per spec 14 C1(f)) | **REGISTERED-DELTA** (the shell-vs-port ownership gap closes at C1) | port with the MiniShell keymap; the C53 pending-window branches are retired (D22) |
| S10 | **Error/feedback rendering** | `ToastMsg {kind,text,seq}` + TTLs (2.6s/8s) + role=alert/status laws + every `pushToast('error'|'info', …)` site | OT wire error codes (`{ok:false, code}`) → user-facing copy | **REGISTERED-DELTA** — the COPY hardcodes what spec 15 §6.3's error-envelope refinement (W-ops) will type; the code→message mapping is the seam | C1 maps OT codes to the toast surface; W-ops types the envelope |

### B. Engine-domain seams (target: nle-engine @ `f68ab8c`)

| # | Seam | Current interface (mini) | Target (core) | State | Swap path |
|---|---|---|---|---|---|
| S11 | **Playback clock** | `tick(dt)` (rAF wrap law D3.3) + `usePlayhead` mount-safe singleton loop (`src/hooks/usePlayhead.ts`) | the engine's playhead/composition clock (N1-N4 bridge family; OT's S-round transport policy is the likely in-timeline home) | **GAP-with-owner — C2** (engine playhead ownership; the mini's clock is a view-side mock; the R22 tick-mid-gesture live-magnet law is the app's rendering of a live clock) | C2 binds the transport to the engine playhead; the wrap/empty guards become engine-law + app-toast |
| S12 | **Program extent** | `contentEnd(clips)` (the wrap extent) + `rulerEnd` (the R18i scrub surface) | the engine's composition flatten (program duration) | **GAP-with-owner — C2** | C2: the app's extent reads the engine's flattened program; the ruler-surface law stays app-side |
| S13 | **Viewer render** | `thumbGradientFor(media)` CSS-gradient frame + `mini-viewer__frame` letterbox law (`src/shell/Viewer.tsx`) | the app's ProgramCanvas (engine N1 composition frames) | **GAP-with-owner — C2** (the mock's gradient frame is honest-mock by design; the letterbox/aspect laws are the transportable view grammar) | C2: ProgramCanvas in the mini's viewer frame; the frame/aspect/letterbox CSS ports as-is |
| S14 | **Clip bodies / thumbnails** | `filmstripFor` (SVG data-URI strips) + `thumbGradientFor` (CSS gradient frames) (`src/lib/filmstrip.ts`) + MediaCard hover preview (gradient-pan + ticking timecode) | the engine's decoded frame-cache thumbnails; a real `<video>` scrub preview | **GAP-with-owner — C2** (the RENDER grammar — discrete strips, hover autoplay — is the transportable law; the DATA is mock) | C2: same components, real data source; the determinism smoke tests port as generator-contract tests |
| S15 | **Export** | the honest stub CTA (`mini-btn-export` → toast; `src/shell/Topbar.tsx`) | the engine's real A/V export (app-side wiring is C4) | **GAP-with-owner — C4** | the topbar is the documented downstream customization point (README §topbar); the host owns the real flow |

### C. Audio-domain seams (target: web-daw-core @ `fe05d85` + engine)

| # | Seam | Current interface (mini) | Target (core) | State | Swap path |
|---|---|---|---|---|---|
| S16 | **Waveform data** | `waveformFor`/`envelopeAt` — deterministic FNV-hashed synth envelopes (`src/lib/waveform.ts`) | WDC/engine decoded amplitude data (C3: offline-render + call-spy pins — the Node venue has no audio device, WDC's own law) | **GAP-with-owner — C3** | the bar GRAMMAR + sizing laws port; the data source swaps; spec 14 C3 row is the acceptance |
| S17 | **Mute** | `Track.muted` — saved doc edit-state + the visual law (lane dims + M chip) + `toggleTrackMute` (one history entry) | OT's TRACK-level mute command (prefixed, C7 rename pending — spec 15 §4.1A) + the engine audio law at render (N2 flatten); the ELEMENT-level muted/visibility pair is the separate A2/W-ops wire addition | **REGISTERED-DELTA** (shape: mini = track-level saved edit state — exactly the OT track command's granularity; the rendered audio behavior is the C3 one-owner law) | C1 maps the flag to the OT track command; C3 makes the audible behavior the engine's law (one owner); the edit-state flag persists as the project-model field |

### D. Project/asset-domain seams (target: spec 09 project model + the C1 fixture bridge)

| # | Seam | Current interface (mini) | Target (core) | State | Swap path |
|---|---|---|---|---|---|
| S18 | **The mock project model** | `Media`/`Track`/`Clip`/`Doc` + `seedDoc`/`multiTrackDoc`/`mintClipId` (`src/lib/mockData.ts`) — spec-09-shaped subset (DESIGN D5) | the spec 09 project model (ProjectJSON) | **REGISTERED-DELTA** (the mock is the declared subset; every field is the honest minimal shape) | C1(d): the sceneBridge family — `multiTrackDoc` ⇄ OT SceneTracks; the projection laws are executable (`otProject.ts`) |
| S19 | **Fixture bridge** | `src/lib/otProject.ts` — toTicks/fromTicks/projectClip/projectClipBack, the registered formulas, 12-test floor | the app's sceneBridge (copies this module verbatim at C1) | **CLEAN** (executable + unit-pinned; the honest role: a TESTED REFERENCE, not an import target — this repo is not a package) | C1 copies + binds the real OT element field names (the C1-entry decision, S6) |
| S20 | **Media kinds / lane routing** | `laneForMedia` (audio→A1, video/image→V1) + the video-only re-validation laws | the app's import policy (spec 09 media kinds; W-media for real decode) | **REGISTERED-DELTA** (D3.2 app policy) | C2's import flow (virtual media → pool → the C1 gap-fit drop law) |
| S21 | **Pool→timeline DnD transport** | `POOL_DRAG_TYPE='application/x-mini-media'` + the `poolDrag` module singleton + `isDroppable()` (`src/shell/MediaPool.tsx`) + the `useLaneDnd` ghost/drop-outline law (`Timeline.tsx`) | the MiniShell `mediaDragSource` slot contract (spec 14 C0) — mock-grade by design (the singleton is documented) | **REGISTERED-DELTA** (inter-component drag TRANSPORT, distinct from S1's insert op-semantics; frozen with the drag law) | C0 ports the slot contract; C2 binds real media; the HTML5 dataTransfer fallback law (registry miss) ports with it |

### E. Chrome/view-infrastructure seams (target: nle-ui MiniShell @ C0, then the app)

| # | Seam | Current interface (mini) | Target (core) | State | Swap path |
|---|---|---|---|---|---|
| S22 | **Store instantiation** | `useMini` — a module-level Zustand singleton; every component reads it directly | C0's MiniShell is explicitly "NO mini-store port, NO op logic" (spec 14 C0 row) — host state reaches the ported chrome via SLOTS/props, not the mini's store | **GAP-with-owner — C0** (the architectural transport seam: which state becomes props/context at port time — the partition below is the map) | C0 ports chrome as slot-compatible families; the app owns the real store (OT-backed) |
| S23 | **View geometry / scroll / zoom** | `RENDER_ORIGIN_PX`/`MIN_ORIGIN_PX`/`TRACK_HEAD_W`/`EDGE_PX`/`SCROLL_SPEED_PX` constants + the ruler-extent ResizeObserver law (`setRulerEnd` publication, `endTime = max(contentEnd, 8, viewportTime)`) + C7a zoom-anchoring + minimize/expand scroll preservation + `labelStepFor` (all in `Timeline.tsx`/`geometry.ts`) | the app's timeline view (the C1 port tree ~2,400 LOC + the ~1,100-line qc- CSS translation) | **GAP-with-owner — C1** (component-local laws, uncataloged until now — this row is their registration) | C1's port reproduces them; the LAW-NET-INVENTORY Timeline families are the nets |
| S24 | **CSS/token surface** | `styles/tokens.css` (RH-verbatim `--canvas-*` + `--mini-*` aliases + the documented radius deviations w/ provenance) + `timeline/timeline.css` (the qc- anatomy port — C1's CSS translation source) + `shell/shell.css` + `styles/app.css` | nle-ui's package-owned tokens (C0) + the app's qc- tree (C1) | **CLEAN** (the extraction provenance chain: RH-skin-extraction.md → tokens.css → the deviation register README #7) | C0/C1 port the CSS files directly (the largest ported artifact class) |
| S25 | **Test/review infrastructure** | `test/setup.ts` (PointerEvent/capture/rAF shims + store reset + `__resetClipIds`) + `stories/storyKit.tsx` (`StoreArgs` global-store patching, `docFor` variants) | the app's re-expressed corpus (C4) + the annotakit review surface config (C4 row) | **CLEAN** (the shims are the corpus's documented contracts; the story kit is the stories' control law) | C4 re-expresses the corpus against the app; the annotakit config is "the strongest reusable mock asset" (spec 14 C4) |
| S26 | **Testids** | 60 static `mini-*` + 15 templated families (the census: LAW-NET-INVENTORY §2.2 — 59 of the 60 are app-emitted; `mini-clip-harness` is story-surface-only, excluded from the app DOM gate) | the app's testid emission (7 exist today → the C1 mapping) | **CLEAN** (the census is the mapping source) | C1(b): the app emits the same ids (the DOM-structural gate checks the census) |

## 2. The store partition (the transport map for `useMini`)

Every `MiniState` field/action, classified by where it lands at transport
time (five honest classes — the review's amendment: `dragActive`/`dragSnapshot`
are SESSION, not view; the `_`-prefixed surface is TEST):

| Field / action | Class | Lands as |
|---|---|---|
| `doc` (`tracks`/`media`/`clips`) | **DOC** | the OT document (SceneTracks behind the window projection, S6) |
| `toggleTrackMute` | DOC action | OT's track-level mute command (prefixed; C7 rename pending — spec 15 §4.1A) |
| `moveClip` `trimClip` `splitAtPlayhead` `deleteSelected` `insertMediaAt` `addClipFromMedia` `nudge` `cutHeadAtPlayhead` `cutTailAtPlayhead` | DOC actions | OT wire commands (S1) — `cutHead/cutTail` compose app-side over `timeline.trim` + the ripple family (GAP-W-ops) |
| `past`/`future` (+ the commit discipline: one-entry-per-gesture, no-op guard) | **HISTORY** | OT undo/redo + the app's entry-granularity policy (S8) |
| `undo` `redo` | HISTORY actions | OT `timeline.undo/redo` |
| `playhead` `playing` `tick` `setPlayhead` `togglePlay` `seekToClipHead` | **PLAYBACK** (engine boundary) | the engine playhead + transport (S11; C2) |
| `rulerEnd`/`setRulerEnd` | VIEW (measured) | the app's timeline view (S23; the R18i publication law ports) |
| `zoomStep`/`setZoomStep`/`zoomIn`/`zoomOut` · `snapOn`/`toggleSnap` · `rippleOn`/`toggleRipple` · `filmstripOn`/`toggleFilmstrip` · `audioLaneVisible`/`toggleAudioLane` | VIEW | the app's editor view-state (C1) |
| `poolCollapsed`/`inspectorCollapsed`/`timelineMinimized`/`viewerMax`/`viewerAspect` + their setters/togglers | VIEW (chrome) | the MiniShell chrome family (C0) |
| `trackMode`/`boundVideoTrack`/`boundAudioTrack`/`trackBindingLocked` + setters | VIEW (the embedding window) | the app's window/binding module — C1(c), host-injected (S6) |
| `selectedId`/`selectedTrackId` + `select`/`selectTrack` | VIEW (selection projection) | the app's selection over the OT multi-ref (S7) |
| `toast`/`pushToast`/`dismissToast` | VIEW (feedback) | the toast surface — the OT error-code renderer (S10) |
| `dragActive`/`dragSnapshot` + `beginDrag`/`endDrag`/`cancelDrag`/`previewMove`/`previewTrim` | **SESSION** (the gesture state) | the app's drag session — the view layer over OT's controllers (S3; the frozen R18k law) |
| `reset` `_commit` `_validateSelection` (+ `mockData.__resetClipIds`) | **TEST-SURFACE** | the corpus's own contracts (S25); `reset` becomes the app's fixture loader |

## 3. The transport map (which mini files feed which crawl phase)

| Phase | Consumes from the mini | The exit gate (spec 14) |
|---|---|---|
| **C0 (nle-ui MiniShell)** | `shell/Topbar` `Inspector` (frame + track card) `MediaPool` (frame) `Splitter` (+ the R18j collapse laws) `ToastRegion` (role=alert law) `Viewer` (frame) + `styles/tokens.css` + the qc- CSS grammar — via `docs/RH-skin-extraction.md` + the components | package tests green incl. the ported chrome laws; MiniShell renders in the package Storybook; ZERO engine imports (boundary script) |
| **C1 (timeline crawl)** | `Timeline.tsx` (the port tree) + `timeline.css` (the ~1,100-line qc- translation) + `geometry.ts` laws + `useKeys` surface + the window/binding module + `mockData.multiTrackDoc` + `otProject.ts` (copied verbatim) + the testid census + OT-SEAMS row dispositions | side-by-side at the same seed doc: DOM-structural census + VLM visual pass + every LAW-NET-INVENTORY Part A row HOLDS-on-OT or GAP-with-owner |
| **C2 (viewer/transport + inspector/pool)** | `Viewer.tsx` (frame + ScrubBar + seek controls + transport grammar) + `Inspector` subjects + `MediaPool` import flow + `timecode.ts` + `filmstrip.ts` grammar | scrub/play/seek REAL (no mock clock); the 12 viewer testids; the inspector/pool laws from the inventory corpus |
| **C3 (audio crawl)** | `waveform.ts` (the bar grammar) + the mute laws | WDC meter taps + engine audio in the mini's waveform/mute laws; offline-render + call-spy pins |
| **C4 (mini-parity gate)** | the whole LAW-NET-INVENTORY corpus re-expressed + the annotakit review config + the topbar export CTA → engine export | the demo (import → cut → play → export); zero mock paths; the corpus checked row-by-row |

## 4. Audited-absent surfaces (the negative-result register)

Interfaces a reviewer might expect that the mini deliberately does NOT
carry (each with the phase that owns it — completeness is provable only by
enumerating the absences):

- **Transitions / crossfades** — engine N3 (transition windows → real audio
  crossfades); the mini has no transition surface (spec 18 §16 scope).
- **Color/grading instruments** — S-engine scopes/qualifier (W-color
  binding); the mini's viewer is a single frame.
- **Audio meters** — W1 meter taps (landed engine-side); no meter UI here.
- **JKL/shuttle transport** — the OT S-round transport policy (C2 verifies);
  the mini's transport is play/pause/seek only.
- **Timeline edit-position markers/bookmarks** — OT has them (the magnet
  row notes OT's keyframe+bookmark magnets); the mini has none (NOT the
  track-head marker BADGES — `mini-track-marker-${track.id}` is the
  V1/A1 lane-head selection surface, present and censused) — C1-entry
  scope decision.
- **fps/frame-snap** — the registered no-fps decision (deviation #4);
  `timecode.ts` is the declared single seam; flips at W-media.
- **Multi-select / marquee** — the single-subject XOR law (S7) is the
  deliberate counter-position; W-ops re-files it.
- **Effects/FX page** — the mini has none; the variants track's FX
  surface landed at its R23 W-A (`e2d5990`, the FX page + FX tool —
  DESIGN-R23 supersedes the DESIGN-R22 W6 sketch).

## 5. Gap register (the posture-law view of this audit)

| Gap | Owner | Phase | Acceptance |
|---|---|---|---|
| The engine playhead/transport binding (S11/S12) | app+engine | C2 | scrub/play/seek real, no mock clock; the mini's transport laws pass against the engine clock |
| Real viewer frames + thumbnails (S13/S14) | app+engine | C2 | ProgramCanvas in the mini's frame; the letterbox/aspect laws port verbatim |
| Real waveform data (S16) | app+WDC | C3 | offline-render + call-spy pins; the bar grammar unchanged |
| The sceneBridge copy + OT field-name binding (S6/S19) | app | C1-entry | `otProject.ts` copied; the main/overlay/audio mapping decided + pinned against the vendored OT types |
| The MiniShell store-slots architecture (S22) | nle-ui | C0 | MiniShell renders with package-owned state; zero engine imports (boundary script) |
| Export wiring (S15) | app+engine | C4 | the CTA → engine export call; the demo's export leg |
| The C4 corpus re-expression (S25) | app | C4 | 322 tests / 115 census units authored app-side; the row-by-row check |


> **R23 mapping note (ARCH-R23 D23/D24):** spec 14 is RETIRED — the plan is `IMPLEMENTATION-PLAN.md` and the phases are the D24 verification ladder. This file's C0-C4/spec-14 citations map: C1(b,d,e,f)+C1(c)→K3; C1(a)/C2-frames→w1; C3→K3; C4→K4 (+ the human side-by-side→w1-entry); the 'crawl' below means the K3 corpus authoring, not the R22 C-ladder. The disposition vocabulary (HOLDS-on-OT / GAP-app-C1 / GAP-C2/C3 / GAP-W-ops) maps to K3 / w1 / K3 / K3-compose+r1-graduate respectively.
**Standing cross-refs:** the timeline-op reasoning lives in
`docs/OT-SEAMS.md`; the law corpus + testid census in
`docs/LAW-NET-INVENTORY.md`; the deviation register in `README.md` §"What's
OUT"; the embedding contract in spec 18 §16; the phase gates in spec 14
§3.1. This file supersedes nothing — it is the umbrella catalog the crawl's
executor reads first.

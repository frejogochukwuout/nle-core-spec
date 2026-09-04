# 20 — Audio Core: web-daw-core, the Three-Layer Track Model, and Audio-Domain Convergence

**Stream:** Audio engine (mixing graph, DSP, offline render) — the AUDIO domain of Decision 12
**Status:** v1.0 (Round 9 — new spec per Decision 13; source analysis: `audits/ARCH-R9-three-domain-strategy.md` §1.4/§3, web-daw-core `README.md`/`PLAN.md`/`HANDOFF.md`/`docs/track-model.md`, all read at `bc68ee0`)
**Spec file:** `20-audio-core.md` (single canon file per 00-master §2.5)
**Primary teacher:** web-daw-core (`github.com/bearachprema/web-daw-core`, private) — the DAW-grade engine extracted from web-daw `main@913d0d7`
**Baseline:** 737/737 tests green in Node (~70 s), `tsc --noEmit` clean, zero runtime deps, manifest-synced from the only LIVING ancestor (web-daw)
**R15 re-baseline + amendments (SCOUT-R15-C, verified by running):** web-daw-core @ `374711c` — **721/721** re-run, `tsc --noEmit` clean, **zero submodules** (the bridge relocated to nle-engine at M1.6); nle-engine @ `f526e67` — **274/274** vitest + **265/265** browser rows + **318** probe checks (its `vendor/web-daw-core` pin `5243c49` sits one docs-only commit behind WDC HEAD). Amendments: §4.1/§4.2/§5/§6.2/§11 bridge-home corrections (M1.6 relocation), §4.2 G-surface authoring contract (A4), §6.5/§10/§12.4 retirement rows CLOSED (AudioMixer deleted @`20fa266`; direct mix retired @`abdf9ee`), §7 M2 re-scoped as the app's A4 phase (ARCH-R15 §3.4)

---

## 1. Purpose

Define the audio domain: which repo owns audio (and why), the contracts at its boundaries (how a timeline drives it, how mixing state is keyed, what the running graph is), the laws the NLE bridge must hold (split-merge, crossfades, varispeed, pan law), the convergence plan for nle-engine's legacy freecut audio path, and the programmatic acceptance for every facet. This spec is the CONTRACT layer (00-master Decision 14) for audio; web-daw-core is the implementation it converges to and inherits from.

What this spec deliberately does NOT own: playback clock law (`AudioContext.currentTime` ground truth — spec 03 §3), audio streaming chunking during scrub (spec 03 §9.2), the SoundTouch worklet's playback behavior (spec 03 §8 — its DSP kernel is consumed by the bridge, see §5.4), and timeline editing semantics (spec 05/06 — structure only feeds the S layer).

---

## 2. Why web-daw-core (the adoption verdict)

**The capability gap is has-vs-has-not, not quality.** nle-engine carries freecut's `AudioMixer` (`src/lib/nle/audio/mixer.ts`, 2,426 LOC): a scalar mix — per-track volume/mute, baked EQ, no reverb, no aux sends, no sidechain ducking, no live parametric EQ, no PDC (plugin-directionality compensation), no WAM/WASM plugin hosting, and no mixdown-grade export path (Wave-5B's `export/audio-mix.ts` is a 275-LOC offline mix that exists only so A/V mux had an audio stream before M1.5). web-daw-core has the full DAW stack — channel strips with insert chains + aux sends + sidechain, 20+ DSP effects including convolution reverb and worklet-backed compressor/limiter/stereo-widener, PDC, offline render with bounce parity, WAM hosting — all null-test-hardened: the AES null-test convention (≥60 dB indistinguishable, ≥40 acceptable) gates every render comparison, and the analytic-oracle programme proves DSP kernels against closed forms rather than against other implementations.

**The separability risk is already retired, structurally.** The concern with pairing a second core (the freecut+opencut lesson) does not apply here because the audio seam is a layered contract, not a same-level duplicate: the timeline and the audio graph share exactly one key (`trackId`), the NLE semantics already live on the core side (the bridge implements nle-engine's Wave-5A split-merge laws — nothing was invented), and the legacy mixer is scheduled for deletion at a measured parity gate rather than maintained alongside. **(Round 15 amendment — EXECUTED: the `AudioMixer` class was deleted @`20fa266` and the direct-mix path retired @`abdf9ee`, both tombstones verified R15 per SCOUT-C §7 — the gate passed and the deletion happened.)** There is no bidirectional bridge to keep honest: `StructuralAudioSource` flows one way (timeline → audio), and `MixerTrackSettings` is a sidecar the timeline never needs to understand.

---

## 3. The three-layer track model (S / G / E) — spec law

The answer to "do we need a broader track than video/audio (MIDI, buses, signal passing)?" is: **track is three coordinated layers that meet at a single key** (web-daw-core `docs/track-model.md` §1, de-risked by `test/nle-bridge.test.ts` C1/H8-H12):

```
Layer S — STRUCTURE   opencut-timeline SceneTracks        (editing: what/where)
                       │  shares ONLY trackId
Layer G — SIGNAL      MixerTrackSettings (the bridge)     (mixing: how it sounds)
                       │  materialized via toDawTrack()
Layer E — ENGINE      web-daw ChannelStrip                (the running graph)
```

- **S** owns placement, trim, split, ripple, snapping — the closed editing union. It knows nothing about sound; that is its virtue and the reason it stays 1:1 aligned with spec 05.
- **G** owns fader, pan, mute/solo, insert chain, aux sends (pre/post), output bus, instrument type/params, MIDI channel — keyed by `trackId`. A full web-daw `Track` round-trips through the settings surface losslessly (pinned by test C1).
- **E** is verbatim upstream engine code. The bridge materializes one ChannelStrip per trackId that has content (S) or settings (G); strips self-apply mute/solo (`setSoloEffectively`) and send positions (`updateFromTrack`).

**The seam law:** S and G share only the `trackId` string. Consequences (all pinned by tests): opencut-timeline can adopt DAW-grade mixing with **zero type changes**; the signal model evolves in web-daw-core (continuously synced from upstream web-daw) without timeline releases; nle-engine's freecut-shaped timeline drives the SAME G/E layers through the same bridge (its `AudioScene` produces `StructuralAudioSource`s directly — the merge laws are identical).

**The TrackType rule (binding):** the timeline's `TrackType` union must NOT grow signal fields. Of the three options considered (web-daw-core `docs/track-model.md` §2): (A) sidecar signal model keyed by trackId — **adopted**; (B) extend SceneTracks with a `midi` section — **deferred to opencut W7**, correct only when MIDI *editing* (piano-roll, note ops) lands in the timeline, dead weight in every placement/ripple/snap predicate until then; (C) `Track<T extends TrackKind>` with inline signal fields — **rejected**, breaks the 1:1 spec-05 alignment and drags DSP notions into pure edit ops. Rule of thumb: **structure holds WHEN/WHERE, signal holds HOW LOUD, routing answers WHERE TO.** A fade is the boundary case that proves the seam: opencut has no fade fields (structure-pure), nle-engine carries author fades on clips — both express them at the `StructuralAudioSource` boundary (`fadeInSec`/`fadeOutSec`), where the merge law can *see* them (author fades block split-merge — the ramps ARE the edit).

---

## 4. Layer contracts (the shapes that ARE the contract)

### 4.1 Layer S input — `StructuralAudioSource` (`nle-engine/src/lib/nle/bridge/scene-to-segments.ts:51` — Round 15 amendment: bridge relocated to nle-engine at M1.6; was web-daw-core `src/lib/nle/…`)

Any timeline that can produce this flat per-element shape can drive the bridge. This is the whole S-facing surface:

| Field | Meaning | Merge consequence |
|---|---|---|
| `trackId` | track identity | strips keyed here |
| `mediaId` | "same buffer" identity (opencut upload mediaId; nle-engine sourceId) | **the merge key** |
| `startTimeSec` | timeline placement start | adjacency window |
| `durationSec` | timeline duration (post-retime) | adjacency window |
| `trimStartSec` | source-side offset at play start | phase continuity |
| `sourceDurationSec?` | optional clamp | — |
| `fadeInSec?` / `fadeOutSec?` | author fades | **block the respective merge side** |
| `varispeedRate?` | retime rate (1 = normal) | **rate boundary never merges** |

Two flatteners ship ENGINE-side (Round 15 amendment — the bridge relocated to `nle-engine/src/lib/nle/bridge/` at M1.6; web-daw-core is a PURE core with zero submodules): `opencutSceneToAudioSources` (TYPE-ONLY imports from the vendored opencut-timeline submodule — zero runtime dependency) and nle-engine's `AudioScene`-shaped producer. A spec-05-conformant host may add its own; the interface above is the contract.

### 4.2 Layer G — `MixerTrackSettings` / `MixerSceneSettings` (`nle-engine/src/lib/nle/bridge/mixer-track-model.ts:45` — Round 15 amendment: relocated M1.6)

Per-track signal: fader, pan, mute/solo, insert chain, aux sends (+pre/post), output bus, and (for DAS-grade tracks) `kind: 'instrument' | 'midi'` with instrument type/params + MIDI channel — a structural subset of web-daw's `Track`, which round-trips through it losslessly (C1). Scene-level: `tracks[]`, `buses: AuxBusSettings[]` (per-bus 1..4: return gain + return chain), `masterVolume`.

**Canonical send/return wiring law (H11d):** a bus with an insert chain gets its default direct-to-master connection **severed** — `bus → fx → … → masterInput` — so a wet-only return effect carries only the processed return (no unprocessed send leak). A bus without effects stays a plain unity summing path. Per-track routing: `outputBus` (0 = master, 1..4 = aux) for bus-assign semantics; `auxSends` + `auxSendPreFader` for send/return semantics.

**(Round 15 amendment — the G-surface authoring contract, A4 + ARCH-R15 §3.4):** `MixerTrackSettings` keyed by `trackId` is the G-layer shape (fader/pan/mute/solo/inserts/sends/outputBus). Where each field is AUTHORED: **mute/solo project IN from the S layer** — authored on 09 §3.1's TrackJSON flags (A4) and projected into G at materialization; the G slice carries no second authored copy (the mock's one-command-family pattern: `toggleTrackMute`/`toggleTrackSolo` mutate S, strips read the projection). **fader/pan/inserts/sends/outputBus are G-authored** — by the app's mixer UI (the A4-phase wiring; §7's re-scope). **masterVolume lives in the scene slice** (`MixerSceneSettings.masterVolume` — this section's own ruling); the mock's UI-store home is the registered deviation N14 (its fixed `{a1,a2}` bus pair + `outputBus: 0|1|2` registered as C26).

### 4.3 Layer E — the ChannelStrip graph (`src/lib/daw/channel-strip.ts`, verbatim upstream)

One strip per trackId; insert chains; aux sends; solo/mute self-application; `scheduleAudioClip(clipId, buffer, atTime, offsetSec, durationSec)` as the segment entry point. Instruments (the MIDI path) inject via `setInstrumentProvider()` — the shim constructors delegate to registered real classes with `Symbol.hasInstance` answering for them, so verbatim strip code drives app instruments unchanged (pinned by `test/instrument-provider.test.ts`). The strip's instrument slot + `noteOn/noteOff` IS the MIDI pipeline — H12 schedules A4 on an instrument-kind track through the same scene render as audio segments, and a MIDI file importer becomes a host-side concern that flattens to `NoteEvent { trackId, pitch, velocity, atTime, durationSec }`.

---

## 5. The NLE-bridge laws (nle-engine Wave-5A semantics, distilled)

All pinned by web-daw-core `src/test/nle-audio-core-derisk.test.ts` (H0-H7, H1b) and `nle-engine/tests/vitest/nle-bridge.test.ts` (C1, H8-H12) (Round 15 amendment: the bridge test relocated to the engine at M1.6; the derisk suite stays in the pure core):

1. **Split-merge (H1/H9):** consecutive elements on one track that reference the SAME `mediaId`, are TIME-ADJACENT, with NO author fades at the boundary and matching varispeed, MERGE into one segment — one buffer play, phase-continuous at the old seam (< 1e-6 sample delta). This is what makes split/trim/ripple edits click-free without per-boundary crossfades.
2. **Transition windows (H1b):** OVERLAPPING elements with author fades (left fadeOut, right fadeIn) are the crossfade case — two segments with equal-power ramps spanning the overlap (window-anchored: left's fade spans the window END, right's spans the window START).
3. **Varispeed (H8):** retime survives the merge pass as a per-segment playback rate; segments with different rates never merge (a rate boundary IS an audible edit). SoundTouch worklet runs in OfflineAudioContext (per spec 02-workers) — 2× rate = 880 Hz A4, half duration.
4. **Pan law (H0):** −3 dB normalization on mono tracks, applied at the STRIP, not the source.
5. **Onset (H2) / seek phase-exactness (H5):** sample-accurate scheduling; seek cancels and reschedules phase-exact.
6. **Null parity (H3):** offline render null-matches realtime at ≥60 dB — the standing gate for every change to this domain (web-daw-core PLAN standing rule 2: never merge a change that weakens the de-risk gates).
7. **The triangle (C1/H8-H12):** opencut-timeline's REAL types and its own `splitElementsOnTracks` op feed the bridge; a real `SceneTracks` scene renders offline through per-track strips; volume/mute/solo + canonical send/return hold; instrument notes mix with audio segments in one render; retime flows end to end.

---

## 6. M1.5 — nle-engine convergence and the retirement gates

The engine's audio path converges onto this core per web-daw-core `PLAN.md` M1.5 / `HANDOFF.md` (its own plan, adopted here as canon):

1. **Submodule wiring:** `vendor/web-daw-core` in nle-engine (PAT-remote), tsconfig path mapping `web-daw-core` → `./vendor/web-daw-core/src` (+ `/test-harness`), worklet bundles served from the app's `public/worklets/` (browser path `/worklets/dsp-effects-worklet.js`).
2. **(Round 15 amendment — M1.6 relocation, SCOUT-C §4/§7):** the bridge was RELOCATED from web-daw-core to **nle-engine** — `src/lib/nle/bridge/`, 7 files (6 moved verbatim at `b837d60`, byte-identical; the 7th, `conversions.ts`, is engine-born from review-R1 fix A4). web-daw-core is now a **PURE core** (zero submodules, zero NLE types under `src/lib/daw/**`); the three-layer S/G/E contract remains documented in web-daw-core `docs/track-model.md`. nle-engine consumes `SceneMixer` + `buildAudioSegments` for offline mixdown and `SegmentStripAdapter` + `materializeStrips` for realtime playback. (The pre-M1.6 text — "the bridge already IS core-owned code (`src/lib/nle/` in web-daw-core)" — described the R9-era topology and is superseded.)
3. **Player integration:** `_scheduleAudioForFrame` routes the existing mixer-shaped calls to the bridge behind the current call sites; `AudioContext.currentTime` stays the ground-truth clock (spec 03's law is untouched — nle-engine law).
4. **Export Stage 2:** bridge offline render → mediabunny `AudioSampleSource` → m24 mux. Standing acceptance: the offline render of the mixed-down audio null-matches the realtime render at ≥60 dB via `web-daw-core/test-harness` `compareAudioRigorous`.
5. **Retirement gate (with teeth — Decision 13):** ONLY when the ported m23 audio expectations + the null-parity gate are green: delete `AudioMixer` (2,426 LOC) + the pre-baked EQ path + the 22,050 Hz preview-bin conventions; reduce `export/audio-mix.ts` to a mux-side adapter or delete it (corrective C9 — it is Wave-5B transitional, not a third mixer). **Freecut audio behavior remains the fallback until the gate passes** — no premature deletion. **(Round 15 amendment — CLOSED/EXECUTED, verified R15 per SCOUT-C §7: the `AudioMixer` class was deleted @`20fa266`; the direct-mix path (`export/audio-mix.ts`) was retired @`abdf9ee` — C9's resolution is DELETION, not the mux-side adapter. Both tombstones verified; both mixers are dead and every audio path renders through the one bridge — the freecut-fallback clause is spent.)**

AudioMixer's successor surface during the transition is dual-path behind a flag if needed (the engine's own HANDOFF's words); the parity gate, not a date, decides the cutover.

---

## 7. M2 / M3 roadmap (recorded, not committed)

**M2 — mixer surface + multi-track:** live parametric EQ, reverb sends (aux buses), per-track inserts, solo/mute, external sidechain ducking (BGM under dialogue — `collectSidechainWires` exists in the engine; the preset needs a scene-level helper), PDC coordination across strips (offline renders are latency-transparent today only because fixture chains report 0 — `applyPdc` is the seam), automation curves (web-daw's automation model rides `Track` params; hosts supply curves when materializing G). Port the 4 deferred upstream tests. Waveform peaks from the audio-registry feed the timeline's `AudioElement` view (opencut owns editing, not sound). WAM hosting for the first custom WASM effect with the Node degradation ladder documented in web-daw-core `.agents/SKILL.md` §3 and browser-level coverage via the engine's Playwright suite.

**(Round 15 amendment — M2 re-scope, ARCH-R15 §3.4):** the mixer G-surface wiring is the APP's A4 phase (A4-v1): mock mixer intent (ui-mock `mockMixer.ts`) → the engine's `MixerTrackSettings` sidecar → ChannelStrips. The honest gap (SCOUT-C §7): today's engine `bridgeSceneSettings` materializes UNITY faders + solo only — `conversions.ts:172-189` sets `name`/`kind: 'audio'`/`soloed`, folds volume into segment level, pre-bakes EQ into buffers, and takes master from `masterBusDb`; no insert chains, no aux sends, no reverb are materialized from the NLE data model, and the offline mixdown passes empty insert chains. The realtime-vs-offline e2e NULL test is A4-v2, NET-NEW rig work (the strongest existing gate, 29.1, compares the two offline recipes; the realtime surface is pinned behaviorally by m30 — SCOUT-C §6).

**M3 — convergence ("full DAW on the NLE timeline"):** tempo-map bridge over the NLE timeline for scoring (DAW-quality audio tracks co-timed with video on the shared clock — proven feasible by H2); mixed-down stems re-enter as NLE audio tracks; double-click a mixed-down track → upgrade to full DAW experience. Advanced DSP lands as WAM effects or vendored worklets on the same `EffectNode` + `signalLatency()` contract so PDC keeps holding.

---

## 8. Wire-protocol surface (spec 15 association)

The G layer is the natural home of the spec-15 audio command family: track-level volume/mute/solo and audio-effect commands operate on `MixerTrackSettings` (the sidecar), NOT on timeline elements — command payloads address `trackId` and the signal field, the bridge applies them via `updateFromTrack`, and the timeline state is untouched (zero invalidation cascades). **(Round 15 amendment, A4):** mute/solo are the EXCEPTION — they are authored on the S layer (09 §3.1's TrackJSON flags; one command family, `toggleTrackMute`/`toggleTrackSolo`) and projected into G at materialization; the G slice carries no second copy (see §4.2's authoring contract). Track-level fader/pan and audio-effect commands remain G-authored. The S-layer fields that reach commands (`fadeInSec`/`fadeOutSec`/rate) travel as element edits per spec 06. Command names and error codes follow spec 15 §4/§6 unchanged; this spec adds no protocol shapes of its own. (Exact per-command mapping is spec 15 §13.15's table extended by the audio rows — a seal-round conformance deliverable once OT's C7 rename lands.)

## 9. Boundaries with sibling specs

| Sibling | They own | This spec owns |
|---|---|---|
| 03 playback | clock law, streaming chunks, scrubbing, varispeed playback behavior | the graph that plays; the DSP; offline render |
| 01 core engine | manager seams, EditorCore shape | audio core's position as the E layer behind the player's audio calls |
| 05 timeline | SceneTracks structure, element semantics | the S→`StructuralAudioSource` flattening contract |
| 06 nle-ops | split/trim/ripple/retiming as EDITS | their AUDIBLE consequences (merge laws §5) |
| 02 workers | worker/abstraction discipline | the audio worklet specifics that run under it |
| 17 test plan | tier methodology, facet matrix | audio facet rows + null-test gates as the audio T1 |

## 10. Testability (facet rows for spec 17 §13A — the audio domain)

| Facet | Type | Tier | Programmatic verification | Pass criterion |
|---|---|---|---|---|
| Merge laws (split-merge/transition/varispeed) | F | T1 | `nle-audio-core-derisk.test.ts` H1/H1b/H8/H9 + `nle-bridge.test.ts` H9 on real SceneTracks fixtures | click-free (<1e-6 seam delta), equal-power windows, rate boundaries unmerged |
| Offline/realtime parity | NF+F | T1 | null-test `compareAudioRigorous` (H3; standing gate) | ≥60 dB |
| Pan law | F | T1 | H0 strip-level assertion | −3 dB mono normalization |
| Onset/seek exactness | F | T1 | H2/H5 | sample-accurate; phase-exact reschedule |
| Send/return routing | F | T1 | H11a-d (no dry leak; return arrives; canonical sever law) | routing table asserts |
| MIDI path | F | T1 | H12 instrument notes through the same graph | mixed render audible content |
| Triangle conformance | F | T1 | C1/H8-H12 with opencut's real types+ops | all green (721 suite — Round 15 re-baseline, WDC @ `374711c`) |
| DSP kernel correctness | F | T1 | analytic-oracle programme (fft/metrics/transfer closed forms) | closed-form bounds |
| Upstream drift | NF | T1 | `bun run sync -- --check` (lock hashes + import validation) | clean; new seams FAIL LOUDLY |
| Retirement gate | F | T1/T2 | m23 ported expectations + null parity, then LOC asserts on AudioMixer deletion | gate green before deletion (§6.5) — **CLOSED/EXECUTED (Round 15)**: deleted @`20fa266`, direct mix retired @`abdf9ee`, verified R15 |
| Player/export integration | F | T2 | nle-engine m24 decode-verified audio mux through the bridge | decode-verified file; ≥60 dB vs realtime |
| Mixer surface UX | NF | T3 | shell-level real-mouse (spec 18 panels) | per spec 17 §13A UI rows |

## 11. Code references — web-daw-core (canon for this stream per Decision 13)

> **(Round 15 amendment — M1.6 relocation):** the four `bridge/` rows below now live in NLE-ENGINE (`src/lib/nle/bridge/`, 7 files); the `nle-bridge.test.ts` row moved to `nle-engine/tests/vitest/`. web-daw-core itself is a PURE core (zero submodules); all other rows are web-daw-core paths, unchanged.

| Artifact | What it pins |
|---|---|
| `nle-engine/src/lib/nle/bridge/scene-to-segments.ts` (Round 15 amendment: relocated M1.6) | §4.1 S interface; §5.1-5.3 merge laws (Wave-5A semantics) |
| `nle-engine/src/lib/nle/bridge/mixer-track-model.ts` (Round 15 amendment: relocated M1.6) | §4.2 G layer; C1 round-trip; track-kind union |
| `nle-engine/src/lib/nle/bridge/segment-strip-adapter.ts` (Round 15 amendment: relocated M1.6) | playSegment + equal-power curves; strip-level pan law |
| `nle-engine/src/lib/nle/bridge/scene-mixer.ts` (Round 15 amendment: relocated M1.6) | scene materialization; canonical send/return; master |
| `src/lib/daw/channel-strip.ts` (verbatim) | §4.3 E layer; scheduleAudioClip; solo/mute self-apply |
| `src/lib/daw/` engine + effects + model + offline-render (verbatim, 33-file closure) | the DSP surface; PDC; WAM; bounce parity |
| `src/lib/daw/instruments/*` (shims) + `setInstrumentProvider` | provider injection seam (Phase B upstreaming) |
| `src/test/nle-audio-core-derisk.test.ts` | H0-H7 acceptance suite (stays in the pure core) |
| `nle-engine/tests/vitest/nle-bridge.test.ts` (Round 15 amendment: relocated M1.6) | C1/H8-H12 triangle suite (37 bridge tests in engine vitest) |
| `src/test/real-audio-harness.ts` + `audio-compare.ts` | the waveform gates (nullDepthDb etc.) — importable as `web-daw-core/test-harness` |
| `scripts/sync-from-upstream.mjs` + `extraction-manifest.json` + `UPSTREAM.lock.json` | the continuous inheritance mechanism (file-class law: copy/shims/coreOwned) |
| `docs/track-model.md` | the three-layer design record (normative-adjacent per 00-master §2.5.3) |
| `public/worklets/*` | built worklet bundles (Compressor/Limiter/StereoWidener really run in tests) |

## 12. Open questions

1. **Automation curves over NLE timelines** (M2): web-daw's automation rides `Track` params; the NLE side needs the host-supplied curve shape at G materialization. Shape TBD at M2 kickoff — likely a per-`trackId` param-curve array with the same interpolation vocabulary as spec 06 keyframes (shared easing grammar, different domain).
2. **Sidechain source selection** (M2): the scene-level helper must choose a sidechain source track; UX for that lives in spec 18's mixer panel (unwritten section — flag for the seal round).
3. **MIDI editing scope (W7/M3)**: if the timeline gains a `midi` section, this spec's §4.3 note surface is the contract; the piano-roll editing spec does not exist yet and is NOT chartered (per Decision 13's deferral).
4. **`export/audio-mix.ts` end-state** — **(Round 15 amendment) RESOLVED by DELETION @`abdf9ee`** (SCOUT-C §7, verified R15): the file was retired outright; the mediabunny glue lives in the export orchestrator. C9's resolution is CLOSED.

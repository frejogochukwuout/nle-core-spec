# 20 — Audio Core: web-daw-core, the Three-Layer Track Model, and Audio-Domain Convergence

**Stream:** Audio engine (mixing graph, DSP, offline render) — the AUDIO domain of Decision 12
**Status:** v-next-2 (Round 23 — the fleet audit: the R23 re-pins are BASE — WDC 759/759 @ `494f6ff` with **W2 varispeed LANDED** (the SoundTouch offline pitch half of M2 + `retimeChannels`; consumers landed the same round), engine 440/440 @ `b8c6f88` with **N2b keyframed volume LANDED @ `37cdd28`**, app 117/117 @ `70e99f0` with the **W3 JKL audio half**; the §0 GAP register re-based per ARCH-R23 D24 (W-audio→r2, C3→K3) + the retired spec-14 §4.3 rows re-homed; the drift-gate now fails-on-drift); v-next (Round 22 — the §0 forward inventory + the R22 re-baseline: WDC 740/740 @ `fe05d85` + the engine bridge family + the app's WDC audio host were BASE; M2 / the mixer G-surface full wiring / N2b (W-audio) were the forward work — superseded by this round's flips); v1.0 (Round 9 — new spec per Decision 13; source analysis: `audits/ARCH-R9-three-domain-strategy.md` §1.4/§3, web-daw-core `README.md`/`PLAN.md`/`HANDOFF.md`/`docs/track-model.md`, all read at `bc68ee0`)
**Spec file:** `20-audio-core.md` (single canon file per 00-master §2.5)
**Primary teacher:** web-daw-core (`github.com/bearachprema/web-daw-core`, private) — the DAW-grade engine extracted from web-daw `main@913d0d7`
**Baseline:** 737/737 tests green in Node (~70 s), `tsc --noEmit` clean, zero runtime deps, manifest-synced from the only LIVING ancestor (web-daw) — *(R9-era field; superseded by the R15 re-baseline line below — 721/721 PURE core after the M1.6 bridge relocation)*
**R15 re-baseline + amendments (SCOUT-R15-C, verified by running):** web-daw-core @ `374711c` — **721/721** re-run, `tsc --noEmit` clean, **zero submodules** (the bridge relocated to nle-engine at M1.6); nle-engine @ `f526e67` — **274/274** vitest + **265/265** browser rows + **318** probe checks (R15-era pin — superseded by the R22 pin `f68ab8c` 356/356, then the R23 pin `b8c6f88` 440/440) (its `vendor/web-daw-core` pin `5243c49` sits one docs-only commit behind WDC HEAD — the standing pattern: consumers ride one docs-only commit behind, today @ `f446512`). Amendments: §4.1/§4.2/§5/§6.2/§11 bridge-home corrections (M1.6 relocation), §4.2 G-surface authoring contract (A4), §6.5/§10/§12.4 retirement rows CLOSED (AudioMixer deleted @`20fa266`; direct mix retired @`abdf9ee`), §7 M2 re-scoped as the app's A4 phase (ARCH-R15 §3.4)

---

## 0. FORWARD INVENTORY (R22 posture, R23 re-based — what needs to be done; the BASE is accepted, not re-explained)

**BASE (accepted, re-pinned 2026-09-07 @ the R23 HEADs):**
- web-daw-core (WDC) @ `494f6ff` (consumed @ `f446512` — BOTH consumers, one docs-only commit behind HEAD) — **759/759**, tsc 0, drift-gate green — the PURE core: the E layer (ChannelStrip graph, DSP surface, offline render); W1 canonical meter taps (with the CR-A3 offline-guard fix — meters are a LIVE-push law) + the first upstream-direction push; **W2 varispeed LANDED** (the SoundTouch offline pitch half of M2, closed @ `de09c93` through the whole-CR rounds: `src/lib/daw/soundtouch.ts` the typed LGPL WSOLA port, bit-exact vs freecut's reference; `src/lib/daw/varispeed.ts` `retimeChannels` with the F1 flush law EXACT round(inFrames/rate); the general worklet + the Node blob-URL venue PROVEN; the [1/32, 32] rate domain with identity degradation; degenerate-setter guards on Stretch/RateTransposer/SoundTouch; consumers landed the same round — engine `df6eadf`, app `0ac3f15`); the whole-CR rounds A+B (**the drift-gate now FAILS on drift** — `sync --check` exit 1, was exit-0-blind the repo's whole life; package.json ships `public/` worklets + COPYING.LESSER/THIRD-PARTY-NOTICES + peerDeps; the barrel's consumption reality documented — the D24e law, zero importers today, the FUTURE web-daw-migration surface).
- The engine bridge family @ nle-engine `b8c6f88` — **440/440** vitest, tsc 0 — N2 volume/mute flatten, N3 cut-centered transition windows (real audio crossfades), W1 meter bridge; **the W2 bridge consumption** (the flattener's `maintainPitch` thread + the merge predicate; the adapter's pre-retime branch with the three-site schedule law + the byte-capped LRU span cache; the W2a-k pins incl. the out-of-domain → LEGACY-pair fallback); **N2b keyframed volume LANDED @ `37cdd28`** (the volume keyframe lane → per-segment gain automation: the source-frame fold with dB clamp/NaN sanitize, merge-blocking both directions, the adapter's dedicated automation gain node with the dB-domain exact law (exponentialRamp + geometric entry) + the snapshot law; **18 bridge pins + 2 REAL offline-render sample-level parity pins**); the RR1-A fade-clamp SPAN round.
- The app's WDC audio host @ nle-test-app `70e99f0` — **117/117**, tsc 0 — real strips/meters/transport; the W2 app consumption (el.speed → retime {rate, maintainPitch} on BOTH the load-time and the edit paths; the REVIEW-R5 #24 offset law LIVE, straddling call-spy pin); **the W3 JKL audio half** (both rate-change entry paths reschedule with ONE idempotence key — the store echo + the core-notify edge, whichever fires first; composed varispeedRate = segRate × tr; the #24 offset law stays ELEMENT-domain (into × segRate, NOT × tr); silent-reverse J (nothing schedules); timeline-authored fades ÷ tr clamped to the wall span; the routed setShuttle round-trip through the mirror; `audioService.ts` + `mediaTone.ts` — the ONE deterministic virtual-audio law, tones keyed by mediaId hash through the engine's own `renderFullVirtualAudio`).

**GAP (the work — owner + phase per the D24 ladder (r1-r6 run / K1-K4 crawl; the tags re-based from the retired spec-14 W-audio/C3 rows); acceptance in parentheses):**
- **M2 REMAINDER — the mixer surface** — live parametric EQ, reverb sends (aux buses), per-track inserts, external sidechain ducking (BGM under dialogue — the scene-level helper; `collectSidechainWires` exists in the engine), PDC coordination across strips, automation shapes (the VOLUME lane landed as N2b; the other param surfaces remain — §12.1). WDC(+engine); **r2** (was W-audio; design round first per WDC's live queue) (acceptance: offline parity pins ≤ −60 dBFS any channel + realtime behavioral pins).
- **M2 REMAINDER — the 4 deferred upstream test ports** — the upstream test bodies (engine / engine-metronome-automation / engine-param-channel / dsp-aux-sends / wam-effect) land as nle-engine-side ports (the relocated bridge provides the composition; a TEST-PORT round — no new capability, one audit round). WDC+engine; **r2** (acceptance: the ported bodies green in the engine's vitest).
- **Mixer G-surface FULL wiring** — inserts/sends/aux real (today: `bridgeSceneSettings` materializes unity faders + solo only, §7's honest gap). app+engine; **r2** (was W-audio) (acceptance: offline parity pins (max deviation ≤ −60 dBFS any channel)).
- **The realtime-vs-offline e2e NULL rig (A4-v2)** — net-new rig work (the strongest existing gate, 29.1, compares two OFFLINE recipes; the realtime surface is pinned behaviorally only). app rig; **r2** (was W-audio; the spec-14 §4.3 row re-homed) (acceptance: max deviation ≤ −60 dBFS any channel).
- **The async pre-retime queue item (NEW — surfaced by W2)** — the adapter's sync WSOLA compute on the play edge is O(span): a 3-min stereo span at rate 0.5 ≈ seconds of main-thread jank (accepted for the validation app); the fix — async pre-retime + legacy fallback while pending — is specced in WDC `docs/design-w2-varispeed.md` §4. engine; **r2** (acceptance: the play edge never blocks >1 frame; the pending-fallback law pinned).
- **The waveform seam contract (K3's HARD prerequisite)** — the offline-render + call-spy pin SHAPES the app authors K3's audio half against (the S16 waveform-data seam → CORE-SEAMS; the LAW-NET 2 GAP-C3 families — the bar grammar + envelope laws; the Node-venue law — no audio device, WDC's own law). WDC; **K3** (acceptance: the contract stated + pinned WDC-side; the plan's dependency graph carries the edge — the only K3 sub-half with an external prerequisite).
- **K3's audio pins** — the offline-render + call-spy pins authored APP-side: waveform data (the mini's bar grammar ports; the data source swaps to WDC/engine decode) + the mute laws (the rendered audio behavior is the ENGINE's law — one owner, S17). app; **K3** (was C3) (acceptance: the pins green in the app's vitest).
- **Worklet asset serving** — the 3 files (biquad-processor.js / capture-worklet.js / dsp-effects-worklet.js) copied to the app's `public/worklets/` (the `/worklets/` root-base-only law; WDC's package now SHIPS `public/` so the copy is mechanical; the varispeed worklet needs NO asset — it registers via blob-URL; the app's `public/` is empty today — verified R23). app; **K3** (was C3 (verify); the spec-14 §4.3 row re-homed) (acceptance: the browser paths load; the strips' worklet effects run app-side).
- ~~**N2b keyframed volume**~~ — **LANDED @ `37cdd28`** (the engine's S2 seam round; flipped into BASE above — the R22 GAP row spent).
- ~~SoundTouch offline pitch~~ (the M2 first half) — **LANDED as W2** (BASE above; consumed by the engine `df6eadf` + the app `0ac3f15`, same round).
- Register: the retired spec-14 §4.3 rows are ALL re-homed above (the posture law, D23.3 — a row found only in spec 14 is a violation); THE plan is `IMPLEMENTATION-PLAN.md` (D23); acceptance lives here.

**ACCEPTANCE & TEST PLAN:** §10 (the facet rows for spec 17 §13A — the audio T1, incl. the W2/N2b rows) + §5's H3 null-parity standing gate (≥60 dB) + the battery's posture checks; BASE acceptance = the cited suites at the cited pins (regression role).

---

## 1. Purpose

Define the audio domain: which repo owns audio (and why), the contracts at its boundaries (how a timeline drives it, how mixing state is keyed, what the running graph is), the laws the NLE bridge must hold (split-merge, crossfades, varispeed, pan law), the convergence plan for nle-engine's legacy freecut audio path, and the programmatic acceptance for every facet. This spec is the CONTRACT layer (00-master Decision 14) for audio; web-daw-core is the implementation it converges to and inherits from.

What this spec deliberately does NOT own: playback clock law (`AudioContext.currentTime` ground truth — spec 03 §3), audio streaming chunking during scrub (spec 03 §9.2), the SoundTouch worklet's playback behavior (spec 03 §8 — its DSP kernel is consumed by the bridge, see §5.3; the core's own W2 worklet + pure retime surface is §0/§5.3/§11's), and timeline editing semantics (spec 05/06 — structure only feeds the S layer).

---

## 2. Why web-daw-core (the adoption verdict)

**The capability gap is has-vs-has-not, not quality.** nle-engine carries freecut's `AudioMixer` (`src/lib/nle/audio/mixer.ts`, 2,426 LOC): a scalar mix — per-track volume/mute, baked EQ, no reverb, no aux sends, no sidechain ducking, no live parametric EQ, no PDC (plugin-directionality compensation), no WAM/WASM plugin hosting, and no mixdown-grade export path (Wave-5B's `export/audio-mix.ts` is a 275-LOC offline mix that exists only so A/V mux had an audio stream before M1.5). web-daw-core has the full DAW stack — channel strips with insert chains + aux sends + sidechain, 20+ DSP effects including convolution reverb and worklet-backed compressor/limiter/stereo-widener, PDC, offline render with bounce parity, WAM hosting — all null-test-hardened: the AES null-test convention (≥60 dB indistinguishable, ≥40 acceptable) gates every render comparison, and the analytic-oracle programme proves DSP kernels against closed forms rather than against other implementations.

**The separability risk is already retired, structurally.** The concern with pairing a second core (the freecut+opencut lesson) does not apply here because the audio seam is a layered contract, not a same-level duplicate: the timeline and the audio graph share exactly one key (`trackId`), the NLE semantics already live on the core side (the bridge implements nle-engine's Wave-5A split-merge laws — nothing was invented), and the legacy mixer is scheduled for deletion at a measured parity gate rather than maintained alongside. **(Round 15 amendment — EXECUTED: the `AudioMixer` class was deleted @`20fa266` and the direct-mix path retired @`abdf9ee`, both tombstones verified R15 per SCOUT-C §7 — the gate passed and the deletion happened.)** There is no bidirectional bridge to keep honest: `StructuralAudioSource` flows one way (timeline → audio), and `MixerTrackSettings` is a sidecar the timeline never needs to understand.

---

## 3. The three-layer track model (S / G / E) — spec law

The answer to "do we need a broader track than video/audio (MIDI, buses, signal passing)?" is: **track is three coordinated layers that meet at a single key** (web-daw-core `docs/track-model.md` §1, de-risked by the NLE bridge tests — now at `nle-engine/tests/vitest/nle-bridge.test.ts` per the M1.6 relocation, C1/H8-H12):

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
| `maintainPitch?` | W2 (LANDED): pitch-preserving retime (the element's `retime.maintainPitch`) — the adapter pre-retimes the span through the core's WSOLA law instead of rate-scheduling the source | **a maintainPitch boundary between same-rate neighbors never merges** (a retime-LAW difference is an audible edit — W2b) |
| `volumeDb?` | folded clip+track volume in dB (Wave-5A P1.4; converted to a linear `level` on the segment) | **a volume boundary never merges** (the 0.0001 dB law) |
| `gainAutomation?` | N2b (LANDED @ `37cdd28`): the volume KEYFRAME lane folded to source-frame breakpoints (linear, sanitized; the lane REPLACES the clip's static volume — keyframes win) | **a keyframed source is merge-blocking both directions** (per-element authored intent) |
| `bufferKey?` | baked-buffer resolution key when the same mediaId needs per-segment BAKED variants (pre-baked EQ chains) | **different keys never merge** (an EQ boundary is an edit) |
| `fadeInCurve?`/`fadeOutCurve?` + `CurveX?` | H15: fade curve shapes [-1, 1] + control-point bias (0/undefined = linear; curves only shape EXISTING fades) | curve differences alone never block (the fades already do) |

*(Round 23 amendment — the table grown to the live shape: the last five rows landed with W2/N2b/H15 since the R22 baseline — `nle-engine/src/lib/nle/bridge/scene-to-segments.ts`'s `StructuralAudioSource` is the canon; the R9-era eight-field table was the frozen snapshot.)*

Two flatteners ship ENGINE-side (Round 15 amendment — the bridge relocated to `nle-engine/src/lib/nle/bridge/` at M1.6; web-daw-core is a PURE core with zero submodules): `opencutSceneToAudioSources` (TYPE-ONLY imports from the vendored opencut-timeline submodule — zero runtime dependency) and nle-engine's `AudioScene`-shaped producer. A spec-05-conformant host may add its own; the interface above is the contract.

### 4.2 Layer G — `MixerTrackSettings` / `MixerSceneSettings` (`nle-engine/src/lib/nle/bridge/mixer-track-model.ts:45` — Round 15 amendment: relocated M1.6)

Per-track signal: fader, pan, mute/solo, insert chain, aux sends (+pre/post), output bus, and (for DAS-grade tracks) `kind: 'instrument' | 'midi'` with instrument type/params + MIDI channel — a structural subset of web-daw's `Track`, which round-trips through it losslessly (C1). Scene-level: `tracks[]`, `buses: AuxBusSettings[]` (per-bus 1..4: return gain + return chain), `masterVolume`.

**Canonical send/return wiring law (H11d):** a bus with an insert chain gets its default direct-to-master connection **severed** — `bus → fx → … → masterInput` — so a wet-only return effect carries only the processed return (no unprocessed send leak). A bus without effects stays a plain unity summing path. Per-track routing: `outputBus` (0 = master, 1..4 = aux) for bus-assign semantics; `auxSends` + `auxSendPreFader` for send/return semantics.

**(Round 15 amendment — the G-surface authoring contract, A4 + ARCH-R15 §3.4):** `MixerTrackSettings` keyed by `trackId` is the G-layer shape (fader/pan/mute/solo/inserts/sends/outputBus). Where each field is AUTHORED: **mute/solo project IN from the S layer** — authored on 09 §3.1's TrackJSON flags (A4) and projected into G at materialization; the G slice carries no second authored copy (the mock's one-command-family pattern: `toggleTrackMute`/`toggleTrackSolo` mutate S, strips read the projection). **fader/pan/inserts/sends/outputBus are G-authored** — by the app's mixer UI (the A4-phase wiring; §7's re-scope). **masterVolume lives in the scene slice** (`MixerSceneSettings.masterVolume` — this section's own ruling); the mock's UI-store home is the registered deviation N14 (its fixed `{a1,a2}` bus pair + `outputBus: 0|1|2` registered as C26).

### 4.3 Layer E — the ChannelStrip graph (`src/lib/daw/channel-strip.ts`, verbatim upstream)

One strip per trackId; insert chains; aux sends; solo/mute self-application; `scheduleAudioClip(clipId, buffer, atTime, offsetSec, durationSec)` as the segment entry point. Instruments (the MIDI path) inject via `setInstrumentProvider()` — the shim constructors delegate to registered real classes with `Symbol.hasInstance` answering for them, so verbatim strip code drives app instruments unchanged (pinned by `src/test/instrument-provider.test.ts`). The strip's instrument slot + `noteOn/noteOff` IS the MIDI pipeline — H12 schedules A4 on an instrument-kind track through the same scene render as audio segments, and a MIDI file importer becomes a host-side concern that flattens to `NoteEvent { trackId, pitch, velocity, atTime, durationSec }`.

---

## 5. The NLE-bridge laws (nle-engine Wave-5A semantics, distilled)

All pinned by web-daw-core `src/test/nle-audio-core-derisk.test.ts` (H0-H7, H1b), `nle-engine/tests/vitest/nle-bridge.test.ts` (C1, H8-H12, the W2a-k varispeed pins, the N2b family — 96 bridge tests at the R23 pin, grown from the R15-era 37), and WDC `src/test/varispeed*.test.ts` (the W2 retime law, 16 pins) (Round 15 amendment: the bridge test relocated to the engine at M1.6; the derisk suite stays in the pure core):

1. **Split-merge (H1/H9):** consecutive elements on one track that reference the SAME `mediaId`, are TIME-ADJACENT, with NO author fades at the boundary and matching varispeed, MERGE into one segment — one buffer play, phase-continuous at the old seam (< 1e-6 sample delta). This is what makes split/trim/ripple edits click-free without per-boundary crossfades.
2. **Transition windows (H1b):** OVERLAPPING elements with author fades (left fadeOut, right fadeIn) are the crossfade case — two segments with equal-power ramps spanning the overlap (window-anchored: left's fade spans the window END, right's spans the window START).
3. **Varispeed (H8):** retime survives the merge pass as a per-segment playback rate; segments with different rates never merge (a rate boundary IS an audible edit). Legacy path: the source's `playbackRate` — 2× rate = 880 Hz A4, half duration. **W2 maintainPitch path (LANDED @ `de09c93`):** the element's `retime.maintainPitch` pre-retimes the span through the core's `retimeChannels` (the SoundTouch WSOLA port, bit-exact vs freecut's reference) — the segment schedules the RETIMED buffer at playbackRate 1 with start offset 0 (the three-site law; drift/seek laws stay opts-domain on the ORIGINAL pair), output length EXACTLY round(inFrames/rate) (the F1 flush law), pitch PRESERVED (2× maintainPitch renders 440 Hz in half the time — W2d). The retime RATE DOMAIN is [1/32, 32] (out-of-domain WSOLA math degenerates: unbounded spin or an impossible pad) — out-of-domain degrades to identity and the adapter falls back to the LEGACY pitch-affected pair (W2k — never an identity-retimed buffer scheduled at 1× with the timeline duration). A maintainPitch boundary between same-rate neighbors is itself an audible edit (merge-blocking — W2b). The SoundTouch worklet (the streaming consumer) runs via a blob-URL loader, Node-venue PROVEN; the bridge consumes the PURE path instead (parity by construction, zero latency — design §4).
4. **Pan law (H0):** −3 dB normalization on mono tracks, applied at the STRIP, not the source.
5. **Onset (H2) / seek phase-exactness (H5):** sample-accurate scheduling; seek cancels and reschedules phase-exact.
6. **Null parity (H3):** offline render null-matches realtime at ≥60 dB — the standing gate for every change to this domain (web-daw-core PLAN standing rule 2: never merge a change that weakens the de-risk gates).
7. **The triangle (C1/H8-H12):** opencut-timeline's REAL types and its own `splitElementsOnTracks` op feed the bridge; a real `SceneTracks` scene renders offline through per-track strips; volume/mute/solo + canonical send/return hold; instrument notes mix with audio segments in one render; retime flows end to end.
8. **Gain automation (N2b, LANDED @ `37cdd28`):** the volume keyframe lane folds to per-segment `gainAutomation` breakpoints in the SOURCE frame (`atSec = trimStartSec + keyTimelineSec × rate` — invariant under seeks, mid-entries, and the N3 seam's trim rewriting), dB→linear at fold with the [−60, +20] clamp + NaN→unity; the lane REPLACES the clip's static volume (keyframes win — `params.volume` is the empty-channel fallback); keyframed sources are MERGE-BLOCKING both directions (per-element authored intent — the CR-A #3 crossfade fades still ride). The adapter walks them on a DEDICATED series gain node (source → [insert] → autoGain → envelope → strip — series gains multiply; the envelope branches stay byte-identical, NO node when absent): the dB-domain law rendered EXACTLY via `exponentialRampToValueAtTime` with geometric entry interpolation, rate-aware context times, kept ramp targets past the window end; linear fallback for backends without expRamp; the SNAPSHOT law (the array is copied — caller mutation cannot rewrite the seek template); disposal at all three teardown sites. Parity by construction: `scheduleSegments` threads the field — pinned by 2 REAL offline-render sample-level parity pins (the dB-domain law + the trimmed mid-entry/source-frame law, maxDiff < 0.002).

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

**(Round 23 amendment — W2 LANDED, the M2 split):** the SoundTouch offline pitch half of M2 is LANDED as W2 (WDC @ `de09c93` closed through the whole-CR rounds: `lib/daw/soundtouch.ts` + `lib/daw/varispeed.ts` + the worklet; consumers the same round — engine `df6eadf`, app `0ac3f15`) — see §5.3's law and §0's BASE; it is consumed, never re-done (the plan's r2 row says so explicitly). **The M2 REMAINDER** (WDC's live queue, the S-wdc track): (1) the 4 deferred upstream test ports — nle-engine-side ports of the upstream bodies (r2; a TEST-PORT round, one audit round); (2) the mixer surface — live parametric EQ, reverb sends, per-track inserts, external sidechain ducking, PDC, automation shapes (r2; pure new capability, design round first — the W2 process); (3) the async pre-retime queue item (r2 — the adapter's O(span) sync WSOLA on the play edge; design-w2 §4's specced fix: async pre-retime + legacy fallback while pending). The waveform-peaks sentence above (audio-registry peaks → the timeline's `AudioElement` view) now feeds **K3's audio half** (S-wdc's waveform seam contract — the hard prerequisite; the plan's dependency edge), not M2.

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
| Varispeed / maintainPitch (W2) | F | T1 | WDC `varispeed.test.ts` + `varispeed-worklet.test.ts` (the pure retime law + the worklet parity contract) + engine W2a-k pins | EXACT round(N/rate) output length; class parity bit-exact vs the port; prefix bit-exact to the flush-trim region (tail at the documented ~25 dB class); rate domain [1/32, 32]; out-of-domain → the legacy-pair fallback |
| Gain automation (N2b) | F | T1 | engine N2b family: 18 bridge pins + 2 REAL offline-render sample-level parity pins | the dB-domain law exact (linear-in-dB ≡ exponential-in-linear, maxDiff < 0.002); source-frame invariance; merge-block; snapshot law |
| Triangle conformance | F | T1 | C1/H8-H12 with opencut's real types+ops | all green (759 suite — WDC @ `494f6ff`, the R23 pin [supersedes the R22 `fe05d85` 740/740 and the R15 `374711c` 721/721]) |
| DSP kernel correctness | F | T1 | analytic-oracle programme (fft/metrics/transfer closed forms) | closed-form bounds |
| Upstream drift | NF | T1 | `bun run sync -- --check` (lock hashes + import validation) | clean; new seams FAIL LOUDLY; **drift itself now FAILS the gate** (exit 1 — fixed `de09c93`; was exit-0-blind the repo's whole life) |
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
| `src/lib/daw/soundtouch.ts` (W2, coreOwned — LANDED; feat @ `1b40fd4`, closed through the CR rounds @ `de09c93`) | the typed LGPL WSOLA port — bit-exact vs freecut's reference (float-op order preserved); the SimpleFilter streaming driver NOT ported (the pure path is whole-buffer; the worklet has its own pull loop) |
| `src/lib/daw/varispeed.ts` (W2, coreOwned) | `retimeChannels` — the F1 flush law (EXACT round(inFrames/rate)); the [1/32, 32] rate domain (out-of-domain → identity degradation, RETIME_RATE_MIN/MAX consumed by the engine's adapter); the general worklet + the blob-URL loader (Node venue PROVEN) |
| `src/lib/daw/meter-tap.ts` (W1, coreOwned) | the canonical push-mode metering law (taps for any node / an existing analyser / the EngineHandle composition) + the OFFLINE guard (the `startRendering` marker, CR-A3 — meters are a LIVE-push law, the offline handle no-ops) |
| `src/test/varispeed.test.ts` + `src/test/varispeed-worklet.test.ts` (W2 pins) | the retime law (16 pins W2a-r: duration EXACT, pitch (goertzel), identity, mono/stereo, tempo-flip, wrapper-sr, worklet content+registration, rate-domain + degenerate setters); the worklet parity contract (string-eval classes bit-exact vs the port; prefix bit-exact to the flush-trim region, tail at the documented ~25 dB class) |
| `src/index.ts` (the barrel) | the consumption reality (the D24e law: ZERO importers today — both consumers deep-import the vendored tree via their own `@/lib/daw/*` alias; the FUTURE web-daw-migration surface, UPSTREAMING Phase C; the exports that ARE consumed cross-repo ride the deep-import paths: retimeChannels + RETIME_RATE_MIN/MAX, createEngineMeterTaps, the test harness) |
| `src/lib/daw/instruments/*` (shims) + `setInstrumentProvider` | provider injection seam (Phase B upstreaming) |
| `src/test/nle-audio-core-derisk.test.ts` | H0-H7 acceptance suite (stays in the pure core) |
| `nle-engine/tests/vitest/nle-bridge.test.ts` (Round 15 amendment: relocated M1.6; grown R23: 96 bridge tests) | C1/H8-H12 triangle suite + the W2a-k varispeed pins + the N2b gain-automation family (18 pins + 2 REAL offline-render sample-level parity pins) + the R1/RR1-A review-round families |
| `src/test/real-audio-harness.ts` + `audio-compare.ts` | the waveform gates (nullDepthDb etc.) — importable as `web-daw-core/test-harness` |
| `scripts/sync-from-upstream.mjs` + `extraction-manifest.json` + `UPSTREAM.lock.json` | the continuous inheritance mechanism (file-class law: copy/shims/coreOwned) |
| `docs/track-model.md` | the three-layer design record (normative-adjacent per 00-master §2.5.3) |
| `public/worklets/*` (3 files: biquad-processor / capture-worklet / dsp-effects-worklet — SHIPPED in package.json `files` since the CR-B round, with COPYING.LESSER/THIRD-PARTY-NOTICES) | built worklet bundles (Compressor/Limiter/StereoWidener really run in tests); the app-side copy to `public/worklets/` is the K3 worklet-serving row (the app's `public/` is empty today — verified R23; the varispeed worklet needs NO asset — blob-URL) |

## 12. Open questions

1. **Automation curves over NLE timelines** (the M2 REMAINDER, r2): **the VOLUME lane is LANDED (N2b @ `37cdd28`)** — with a DIFFERENT shape than web-daw's `Track`-param model: the engine's own ScalarChannel keyframe lane folds to per-segment source-frame `gainAutomation` breakpoints (§5.8's law — a host-supplied curve at G materialization, exactly this question's mechanism, for one param). The question generalizes to the OTHER mixer params (EQ/reverb/sends curves, the M2 surface): the likely shape remains per-`trackId` param-curve arrays with the same interpolation vocabulary as spec 06 keyframes (shared easing grammar, different domain); N2b's fold is the working precedent, and web-daw's `Track`-param automation model (WDC `src/lib/daw/model/automation.ts`) is the upstream reference to reconcile against at M2's design round.
2. **Sidechain source selection** (M2): the scene-level helper must choose a sidechain source track; UX for that lives in spec 18's mixer panel (unwritten section — flag for the seal round).
3. **MIDI editing scope (W7/M3)**: if the timeline gains a `midi` section, this spec's §4.3 note surface is the contract; the piano-roll editing spec does not exist yet and is NOT chartered (per Decision 13's deferral).
4. **`export/audio-mix.ts` end-state** — **(Round 15 amendment) RESOLVED by DELETION @`abdf9ee`** (SCOUT-C §7, verified R15): the file was retired outright; the mediabunny glue lives in the export orchestrator. C9's resolution is CLOSED.

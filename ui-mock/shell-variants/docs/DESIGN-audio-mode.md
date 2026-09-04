# DESIGN PROPOSAL — Audio Focus Mode & Mixer Surface (mock-level)

**Status:** v2 — peer-reviewed (verdict: SOUND WITH REFINEMENTS); refinements folded in; ready for mock implementation.
**What this is:** the mockup's concrete take on the user question *"the switch between DAW (handle bgm and sfx) and NLE could be thought out"* — written in the grammar the spec set expects for the **missing spec-18 mixer-panel section** (spec 20 §12.2 / 19 §12.11 flag it as unwritten; PLAN item 7).
**What this is NOT:** a canon amendment. The mock does not edit specs (Decision 14 posture). Where this design touches registered removals/rejections, §9 re-litigates them explicitly; §10 registers the new spec-side findings for the seal round.

---

## 1. The decision in one paragraph

**No Fairlight-style hard page split. Audio is a *focus mode* in the existing page-dock grammar, plus a mixer surface that lives with the timeline.** The app keeps ONE timeline, ONE clock, ONE command stream (Decisions 12/13, spec 03 §3). A 4th dock page **"Audio" (⌘4)** enters audio-focus: audio lanes grow, a **mixer strip row** opens under the timeline, the media pool becomes a **Sound Library**, and the inspector becomes a **channel editor** that shows the S/G seam (clip params + track strip params). Mode/collapse/heights are view-state (UI store); audio *parameters* ride a **mock G-layer sidecar** (`mockMixer`, mirroring spec 20 §4.2's MixerTrackSettings shape) — never UI prefs, never TrackJSON fields. A **meter-bridge state** (~32px) is available in Edit for per-track level detail beyond the always-on micro-meters.

## 2. Why this shape (evidence, review-corrected)

| Design driver | Source |
|---|---|
| One editing core, one-way projection | 00-master Decision 12 |
| One transport/clock — no separate audio transport | spec 03 §3, reaffirmed 20 §6.3 |
| G-layer sidecar keyed by `trackId`; S and G share only `trackId` | spec 20 §3 |
| Audio commands apply with zero timeline invalidation | spec 15 §13.15 (normative home: 20 §8) |
| Page-dock grammar precedent — Color swaps the inspector **for the grading stack** while the timeline stays live (one region mutates; Audio focus intentionally extends this precedent to a fuller mutation — flagged as an extension, not a citation) | spec 18 §4.8 |
| Escalation *inspiration* — M3's "double-click a mixed-down track → upgrade to full DAW experience" (that gesture is stem-level + document-level; our mock preview generalizes it to any audio clip + view-level — the lineage is inspiration, not identity) | spec 20 §7 |
| ⌘4 "Audio workspace" binding is registered (spec 16 §3.8 + App A `kbd-workspace-audio`) but **orphaned** — spec 18's 3-page dock dropped its surface; this design gives it a home | spec 16 §3.8 |
| Mixer surface is spec-18 territory, explicitly unwritten | spec 20 §10 facet table; §12.2 |
| Removal ledger requires explicit re-litigation when reasons change (done in §9) | spec 18 §8.4/§8.8/§8.13; SCOUT-R8-C C15 |
| Fader/knob drag grammar: Shift+drag fine mode, double-click reset | SCOUT-R8-C component table ("the only portable part") |

Scope honesty: this surface covers the *core* of spec 20's recorded M2 scope (mixer surface, per-track strips, inserts, solo/mute, sidechain ducking) but NOT all of it — automation curves, live parametric EQ editors, PDC UI, WAM hosting are absent (§8 non-goals).

## 3. The mode switch — exact UX

### 3.1 Entry points (four, all converging)
1. **Page dock button "Audio"** between Color and Deliver — same grammar as Edit/Color/Deliver, `aria-current="page"`, tooltip "Audio focus (⌘4)".
2. **⌘4** — occupies the orphaned-but-registered binding. (The larger workspace-keymap mismatch — spec 16 binds ⌘3 = Effects, spec 18's dock ships Deliver with no ⌘ binding — is a PRE-EXISTING drift this design does not claim to close; registered in §10.)
3. **Escalation gesture (mock preview of M3):** double-click an **audio clip** in Edit mode → Audio focus + that clip's track strip focused+flashed. Discoverability backstops: a cheat-sheet row and a clip context-menu item **"Mix this track…"** (mock-level; would amend spec 18 §4.9's menu list at seal). Single-click stays selection. Note: if dual-viewer (18 §8.5, deferred) ever lands, its natural dbl-click-to-source gesture would compete for this binding — flagged, not resolved.
4. **Mixer toggle in the timeline toolbar** — opens the mixer dock without leaving Edit (button-only; no new chord — see §6).

### 3.2 What changes in Audio focus (and nothing else does)
| Region | Edit mode | Audio focus |
|---|---|---|
| Page dock | Edit active | Audio active |
| Media pool | all media | **Sound Library view**: audio media + audio-bearing video, grouped by role (Dialogue/BGM/SFX/Music), role chips, "Import sound…" CTA, same search/sort |
| Viewer | program monitor | **unchanged** (audio work needs picture context; one clock) |
| Inspector | 4-tab inspector | **Channel editor** with two sections: **Clip** (selected element: gain/pan/fades — the SAME fields and commands as the inspector Audio tab, 17 §6.1 parity) above **Track** (focused track's G strip: fader/pan/inserts/sends/outputBus + ducking row for BGM/Music roles). The panel literally displays the S/G seam. |
| Timeline lanes | heights per user pref | **audio lanes ×1.6, video lanes compress to blocks style** (structure identical; heights are view prefs) |
| Track headers (all modes) | M/S/L(/V) + **audio micro-meters** (4px, view-only G projection) + waveform toggle | Audio focus adds: **mini gain fader** + **automation-lane placeholder toggle** |
| Timeline toolbar | master mute + volume + **master micro-meter** (2 bars, always-on levels — zero new regions) | same + **Mixer state button** (cycles collapsed/bridge/full) |
| Under timeline | mixer row available (default **collapsed** — toolbar master micro-meter + header micro-meters already keep levels visible; see §11.6) | mixer row **full** (default; auto-compact below ~850px viewport height) |
| Status/dock/transport/keys | — | **unchanged** — Space, JKL, I/O, Home/End identical (one clock) |

### 3.3 Exit
Dock button, ⌘1 (Edit), or **Esc always exits Audio→Edit** (one rule, no path-dependence; Esc's other meanings apply only when already in Edit). Mode is view-state, persisted with UI prefs, never in the project doc; switching modes changes no data.

### 3.4 What deliberately does NOT exist
- No separate audio transport or audio timebase (tempo-map bridge is M3 material; it would layer *under* the timeline, not split it).
- No MIDI/piano-roll (Decision 13 deferral). No plugin modal, no bus-routing graph editor, no LUFS metering (post territory).
- No dual documents: leaving Audio focus keeps every edit; nothing bounces/commits at mode level.

## 4. The mixer strip row — three states (the 1280×800 arithmetic)

> **[SUPERSEDED by the v2.2 revision (end of file) — read both]:** the mixer is now a RIGHT-SIDE DOCK beside the multi-track lanes, not a bottom row. The state machine, strip anatomy vocabulary, and drag grammar below remain the source for those aspects; the placement, heights, and compact trigger changed.**

Vertical budget at the spec floor 1280×800: chrome = dock 42 + status 12 + toolbar2 34 + HSplitter 6 + timeline-toolbar 34 + tabs 26 = **154px** (already includes toolbar+tabs); main body min 320px per 18 §3.2 → timeline block ≈ 326px, minus ~26px ruler → **~300px for lanes+mixer**. A full 176px mixer leaves ~150px of lanes — tight (~1.5 boosted audio lanes) but workable; the bridge leaves ~294px. Therefore the row is a **three-state machine** (auto-compact below ~850px viewport height):

| State | Height | Contents | Default |
|---|---|---|---|
| **Collapsed** | 0 | — | never default |
| **Meter bridge** | ~32px | per-audio-track: badge + name + stereo meter + M/S/L chips; master: meter + mute + volume (synced) | **Edit focus default** |
| **Full** | ~176px (auto-**compact ~120px** when viewport height < ~850px) | complete strips (below) | **Audio focus default** |

Full strip anatomy (top→bottom): badge+name+role chip · stereo meter · **fader** (dB-tapered, −∞…+6, dbl-click = 0 dB unity) · **pan** knob (dbl-click = center) · **M/S/L** (same toggles/commands as track headers — one source of truth) · insert slot chips (2, mock picker) · aux send knobs + pre/post · output bus select (Master/A1/A2). Plus **Aux A1/A2 return strips** and the **MASTER strip** (master fader = the same store value as timeline-toolbar master volume + master mute — the 18 §4.5 "master bus gain" parameter, mock-level).

**Mixer state button semantics** (one definition): in Edit it cycles **collapsed → bridge → full-compact**; in Audio focus it toggles **bridge ↔ full**. The bridge's M/S/L chips emit the **same toggle commands as the track headers** (one source of truth, 17 §6.1 parity).

Drag grammar on faders/knobs: **Shift+drag = fine mode, double-click = reset**. A11y: strips `role="group"`; faders are keyboard-operable sliders; meters `aria-hidden` with a textual dB exposed **on focus/query only** (never aria-live — no 60fps announcement spam); the mixer row joins the F6 region cycle — a 7th region, which amends 18 §11.5's enumerated six (registered in §10).

## 5. Sidechain ducking — the spec 20 §12.2 answer, concretized

On BGM/Music-role strips and in the channel editor's Track section, a **"Duck under…" row**: source picker (default `A1 Dialogue` — the scene-level helper's stand-in), **amount** (0-100%), **attack** + **release** (ms chips), hold (fixed mock). Drives the meter's gain-reduction visualization while playing; in reality it would drive `collectSidechainWires` + the scene-level preset (spec 20 §7).

## 6. Keyboard

- ⌘4 → Audio focus; ⌘1-3 unchanged from the current mock (Edit/Color/Deliver — noting the pre-existing ⌘3/Deliver drift registered in §10).
- **No new chords.** ⌘⇧M is spec 16 §3.5's "mute all tracks" (conflict resolution #17 — closed, not reopenable). The mixer state cycles via its toolbar button and F6+keyboard once focused; if a chord is wanted, it gets registered at seal (candidates: none currently unbound and sane).
- Faders/pan are sliders: arrow keys ±1 dB / ±5%, Home = −∞, End = **+6 dB max**, page keys = coarse steps. Taper honesty (R14 correction): `dbToSlider = (db+60)/66` is linear-in-dB, so unity 0 dB sits at **91% travel** (the tick confirms) — NOT mid-scale. Double-click reset to 0 dB is the unity gesture.

## 7. Roles: Dialogue / BGM / SFX / Music

Spec 09 has no role field (only the FCPXML `<sequence role>` attr echoes it; BGM/SFX appear as use-cases in 14 §2.1 + 20 §7). The mock keeps roles OUT of TrackJSON/MediaRecord (mockData's discipline: spec-09-shaped fields only) — they live in the mock G-slice as a `roles: Record<trackId, Role>` map, commented "seal decision: spec-09 field vs client tag". Roles drive Sound Library grouping, ducking default source, strip chips. R14 correction: media-level roles (Sound Library grouping) are a SECOND, component-local mediaId-keyed map (`MEDIA_ROLES` in SoundLibrary.tsx) — the "single Record<trackId|mediaId, Role>" wording above was aspirational. Registered as candidate N-net (two-registry deviation); merging them is a seal decision.

## 8. Declared non-goals (visible questions, not silence)

- **Automation curves** — NOT in this surface. Spec 20 §12.1 stays open. Visible placeholder: the automation-lane toggle in Audio-focus track headers renders an empty lane strip with "Automation — M2" watermark, so the seal round inherits a visible question.
- Live parametric EQ editing (insert slot chips open a mock picker, not an editor), PDC UI, WAM hosting, tempo map — all out.

## 9. Re-litigation closure (the ledger, answered)

- **SCOUT-R8-C C15** ruled: "Ours wins. Reject the mixer; audio params live in the inspector Audio tab + timeline-toolbar master controls." Pillars: 18 §8.4 + **00 §1** ("no broadcast audio routing") + 03 §9. **Answer:** the reason changed AFTER the ruling — Decision 13 (Round 9) adopted the DAW core; spec 20 §7 records an M2 mixer surface; §10 assigns its UX to spec 18. 00 §1's "broadcast audio routing" means monitoring/SDI/ASIO (00 §5 NFRs #4/#5) — in-graph aux send/return is not that. 03 §9's audio graph is re-pointed to web-daw-core per D13. The rejection is respectfully superseded, not silently ignored.
- **18 §8.8 (Mixer/Metadata toolbar panels removed)** — re-litigated in §1: the surface returns as timeline-docked, spec-20-shaped, M2-scoped.
- **18 §8.13 (audio meters DEFERRED — "meters need the meter worker tap (spec 02) — v2")** — the mock's meters are mock-animated visualizations; the deferral's *reason* (worker dependency) still stands for the real app. Mock-level re-litigation only; flagged for seal.
- **18 §4.1 dropped the reference mock's "Sound Library" toolbar button** — the name returns here for the media-pool's audio view; noted so the seal round sees the resurrection.

## 10. Seal-round registrations (new spec-side findings from this design)

1. **Workspace keymap mismatch**: spec 16 §3.8/App A binds ⌘3 = Effects workspace, no Deliver binding; spec 18's dock ships Edit/Color/Deliver. The mock's tooltips claim ⌘3=Deliver (pre-existing drift, now surfaced). → new PLAN seal item.
2. **F6 region count**: 18 §11.5 enumerates six regions; the mixer row is a seventh. Amendment or fold-into-timeline-region decision at seal.
3. **Meter deferral (§8.13) vs always-on master micro-meter**: seal must decide whether the toolbar micro-meter counts as "meters panel."
4. **Automation-curve UX home (20 §12.1)** — this surface's placeholder lane is the conversation starter.

## 11. What the user should react to

1. Focus mode (4th dock page, ⌘4) vs. hard page split — right weight?
2. ~~Mixer under the timeline~~ **[superseded by v2.2: mixer BESIDE the lanes]** — three states (collapsed default in Edit, full in Audio) — vs. only-in-Audio-page.
3. Always-on levels: master micro-meter in the timeline toolbar + track micro-meters in headers (every mode).
4. Channel editor as the S/G seam (Clip section + Track section) — and ducking row (source/amount/attack/release) as the sidechain UX.
5. Escalation gesture (dbl-click audio clip → Audio focus + strip focus) as the M3 preview.
6. Sound Library = audio-filtered pool with role grouping (includes audio-bearing video).
7. **Levels redundancy**: master micro-meter + header micro-meters + optional bridge — triple coverage right, or should Edit default to bridge instead of collapsed?

---

# REVISION v2.2 (R12) — the mixer moves BESIDE the multi-track lanes

**Trigger:** direct user review feedback — "mixer layout makes no sense it should be side by side with multi-track." The bottom-row placement (§4 above) starved the strips: 176px of height meant faders crammed next to pan knobs, meters squeezed to 84px, the whole console vocabulary compressed into a strip of UI that also had to compete with lanes for vertical budget (the 1280×800 arithmetic above existed BECAUSE the row stole height from lanes).

## What changed

- **MixerRow (bottom row) → MixerDock (right-side dock).** The mixer now sits side by side with the multi-track lanes: `[track headers | lanes | mixer dock]`, sharing the timeline area's full HEIGHT instead of stealing its width-and-height from below. The dock spans the timeline block's lane region (below TimelineToolbar/SceneTabs, right of the lanes).
- **Strip anatomy gets real room.** The centerpiece is now a fill-height stereo meter beside a fill-height dB fader (min 80px, grows with the dock); pan sits below; inserts/sends/bus/ducking stack in a scrollable lower section. Compact mode (dock < 260px tall — main-body drag) drops the lower stack and slims strips 108px → 84px.
- **Three states preserved (same store machine, same button):**
  - **collapsed** — not rendered.
  - **bridge** — was a 32px bottom row, now a **44px right rail**: per-track vertical stereo meters (badge + fill-height meter) + master cluster pinned bottom (meter + mute + collapse).
  - **full** — classic console row: strips side by side, aux returns + master, 22px vertical-label header column (collapse chevron).
- **Cycle semantics unchanged:** Edit cycles collapsed → bridge → full; Audio focus toggles bridge ↔ full. Escalation (dbl-click audio clip) still expands to full + strip focus flash.
- **F6 7th-region registration unchanged** (the dock takes over the old row's slot in the cycle).
- **1280×800 arithmetic revised:** the dock takes WIDTH, not height. Lanes keep ~1280 − 160 (headers) − 22 − strips×84/108. With scene 1's 2 audio tracks + 2 aux + master ≈ 490px full / 44px bridge — lanes ≈ 630px full at the floor. Acceptable; the dock collapses in one click.

## What did NOT change

Store shape (`mixerState`, mock G-slice, ducking, roles), single-source-of-truth toggles (M/S/L emit the same commands as track headers), drag grammar (Shift+drag fine, dbl-click reset), a11y posture (role=group, keyboard faders, meters aria-hidden + title-only), ChannelEditor, SoundLibrary, escalation, Esc.

## Bridge-state trade, declared

The old bridge carried per-track M/S/L chips; the 44px rail is meters-only (the track headers carry the same commands at the same height, one click away). If review misses the chips, the rail can widen to ~64px and take them back — registered as a §11 reaction question.

## §11 additions for user reaction

8. Side-by-side dock vs. the old bottom row — is THIS the right adjacency (mixer beside lanes), and is full-dock width (~490px at scene-1 scale) acceptable at your window size?
9. Bridge as a meters-only rail (44px) — keep slim, or widen to bring back per-track M/S/L?

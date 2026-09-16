# amend-B1 — R27 Wave 6-B part 1 (the model-law clusters)

**Task ID:** R27-W6-B1 | **Agent:** amend-B1 | **Round:** R27 final-tightness, Wave 6 (W-B part 1) | **Date:** 2026-09-14
**Scope:** the model-law cluster set, applied as ONE authored byte-coherent set: `09-project-model.md` (the B2 rewrite + the §3.3A D-HB2 law + B1's F4 clause), `06-nle-ops.md` (§5.12's companion law + §5.10/§5.0's sever law), `03-playback-engine.md` (the new §8.5), `10-fcpxml-export.md` (FIX-4b/c). Sources: `spec-09.md` §4-A/§4-B/§4-D-5 (the paste-ready drafts), `review-rulings.md` §2 D38 (the two amendments — sub-numbering + the absent-defaults; the review wins where it amends), `spec-06.md` F-4 + F-6, `spec-03.md` F-8 (F-7 SKIPPED per the task's law-heavy rule — the HA-3-2 seek-commit seam is the gesture cluster's row, not the model-law cluster), `spec-10.md` FIX-4b/c. Editing-only: no commits, no branches, no pushes; stayed on main.

**Ground-truth pins consumed:** OT HEAD `55c81c0` / code pin `970948a` (`timeline-core.ts:2443-2537`; `core/audio-params.ts:4/:28-47`) · nle-engine `f9ac806` (`bridge/scene-to-segments.ts:170-173/:596/:623`; `bridge/opencut-laws.ts:54-79`) · app `c020b2a` (`sceneBridge.ts:229-262/:435-447`; `engineService.ts:510-513`) · nle-ui `32abd58` (`mockData.ts` R9-b law; `useUiStore.ts:937-945`; `Inspector.tsx:1007`).

---

## §1 What landed (19 string-edits: 09 ×6 · 06 ×4 · 03 ×1 · 10 ×4+1 structural rider)

### 09-project-model.md — the model home (6 edits)

| Site | Edit |
|---|---|
| §3.1 :173-178 | The `volume` field comment re-keyed: persisted unit is LINEAR **gain (1 = unity**; the R15 "0..1" reading corrected); authoring/display domain dB **[−60,+20]** — ONE home opencut's `core/audio-params`; ABSENT ≡ unity (1 linear / 0 dB). Marked **D38.2** |
| §3.1 :180-184 | The `preservePitch` field comment: ABSENT ≡ TRUE (the NLE default); explicit false = pitch-affected varispeed; A PROJECTION of the engine retime's `maintainPitch`. Marked **D38.1** |
| §3.1A B2 :343-347 | **The full rewrite** — "the model-coherence pair, registered D38.1/D38.2": **preservePitch (D38.1** — the R9-b ruling; absent≡true; the D-T5 projection pattern; back-projection writes ONLY explicit false; the dormant-false-at-rate-1 drop = the APP load-bridge identity law, NOT engine law — the engine stores a committed `{rate:1}` retime verbatim and `fromJSON` never normalizes retimes, now §3.3A-tied; absent-≡-default writes are identity; 06 §5.12 the ops law, 18 §4.4 the editor). **volume (D38.2** — LINEAR gain 1=unity, span [0.001,10]; authoring dB [−60,+20]; ONE HOME `audio-params.ts` (`VOLUME_DB_MIN/-MAX`, `DEFAULT_VOLUME_DB=0`, `clampVolumeDb`, `volumeDbToLinear`; the engine's OV-01/OV-02 value-import); `params.volume` the runtime dB projection (D28-A2: display dB, commit linear); **the review's amendment (ii) folded — the two-field law: absent ≡ unity on BOTH sides with two numerically distinct defaults (`el.volume` LINEAR absent≡**1**; OT `params.volume` dB absent≡**0 dB**, the D-S5 header) — the one-home owns the dB domain + conversions, NOT the persistence shape**; NaN→DEFAULT (0 dB) at the clamp + read-as-absent at the engine fold + the 0.001 linear floor; cross-refs 20 §4.1/§N2b, 18 §4.4, **10 §4.4 (the export fold — the cluster's fourth consumer, added)**) |
| §3.1A B1 :341 | The **F4 duplicate-severs clause** appended after the split sentence: a DUPLICATE severs the copy's `linkedTo` — the copy enters unlinked, the original keeps its pair (the F4/R14 twin of the split law; mock `useUiStore.ts:938-945`; OT-side severing by construction — new ids carry no sidecar meta) |
| NEW §3.3A :402-412 | **The D-HB2 scene-load boundary law**: `TimelineCore.fromJSON(scene, fps)` — the SECOND JSON boundary; rejects the scene WHOLE with the typed error form `[Timeline] fromJSON: <reason>` (never partial-loads; the throw precedes any normalization/counter-seeding); the REJECTED class list (dup element/track ids; dup keyframe ids within an element; non-positive/non-integer/non-finite durations; negative startTime; non-finite structural ticks; overlaps; keyframes outside `[0, duration]`; invalid retime/transitionOut shapes); the NORMALIZED-kept list (id-counter seeding incl. keyframes; missing trims→0; strict-boolean lock; opaque extras; animation canonicalization — **never retimes**, the preservePitch B2/D38.1 attribution); THE ROUND-TRIP LAW (toJSON output must always pass; M53 + M49R pins @ `970948a`; the raw constructor the escape hatch); the project-layer composition (§5.1 `migrateProject` → `ProjectSchema.parse`, then per-scene re-validation at engine mount); the 17 round-trip-matrix mirror noted as cross-spec |
| §0 :14 | The companion pointer: "`static fromJSON(scene, fps)` — **the scene-load boundary (§3.3A, D-HB2)**: the typed structural gate FIRST (rejected-whole), then the normalization set (…)" |

### 06-nle-ops.md — the ops halves (4 edits: F-4 + F-6 in full)

| Site | Edit |
|---|---|
| §5.12 :1917 | **The companion-field law (R9-b, registered R27 — D38.1):** the doc flag `ElementJSON.preservePitch` (09 §3.1A B2) absent≡TRUE; the engine's `RetimeConfig.maintainPitch` the runtime projection with the CLASSIC absent≡false convention (`shouldMaintainPitch` requires `=== true`); the bridge conversion both directions (`sceneBridge.ts:262` load, `:435-447` back-projection writes only explicit false); the dormant-false-at-rate-1 drop = the APP load-bridge identity law, not engine law (committed `{rate:1}` verbatim; `scene-to-segments.ts:596/:623`); the preservePitch-only patch keeps the rate (read-merge-write, `engineService.ts:510-513`); absent-≡-default writes are identity (no history entry); UI home 18 §4.4; **the playback-side chain cross-ref added — 03 §8.5 (the byte-coherence rider)** |
| §5.10 :1695 | **The link law (F4 — the D32.1 fan-out family's duplicate twin):** duplicate SEVERS — the copy carries no `linkedTo`; the original keeps its pair (a verbatim copy would form a one-way pair and the next companion edit would fan out to a clip the user never linked); mock `useUiStore.ts:937-945` (the splitElement R14 law's twin); routed sever-by-construction; the 09 B1 model-home cross-ref (one law, two homes) |
| §5.0 :427 | The fan-out table's **Duplicate row**: SEVERED on the copy; the original keeps its pair (F4); n/a (new track); n/a |
| §5.0 :429 | The base-verb sentence extended: "…, duplicate (§5.10's sever law — the copy severs `linkedTo`, the original keeps its pair)" |

### 03-playback-engine.md — the playback half (1 edit: F-8)

| Site | Edit |
|---|---|
| NEW §8.5 :915-919 | **The composed transport×element rate law (W3/S3-C4, LANDED):** `varispeedRate = segRate × tr` (content per wall second); future anchors `(S−P)/tr`; played spans `remaining/tr`; fades timeline-authored but the envelope sweeps wall seconds (÷ tr; the R3-3 clamp in the timeline domain first); the mid-entry content offset ELEMENT-domain (`offsetSec = trim + into × segRate`); ONE reschedule per rate change (the `lastScheduledTr` idempotence key — the mirror's playRate echo must not re-fire); `tr ≤ 0` the honest silent-reverse degradation; the composed domain [1/32, 32] by construction (element clamp [0.01,5] × ladder {1,2,4}); reference `audioService.ts:498-606` + `docs/design-jkl-audio-follow.md` §1; engine halves scene-mixer.ts:365 (element) + realtime-bridge.ts:328 (transport). **The pitch half (R9-b — D38.1):** `el.preservePitch` ElementJSON law (absent≡true, 09 §3.1A B2) → the bridge projects `retime.maintainPitch` → `seg.maintainPitch` → the adapter's WSOLA pre-retime branch (`segment-strip-adapter.ts:526-547`; the [1/32,32] guard + the >2ch fallback); false leaves the legacy pitch-affected path; the SoundTouch venue WDC W2 (§13E); the 06 §5.12 companion + 06:1670's pair-law + D31.7's fit-to-fill consumers named |

### 10-fcpxml-export.md — the export fold (FIX-4b/c, 4 edits)

| Site | Edit |
|---|---|
| :400-402 | `buildTimeMap(…)` gains the `el.preservePitch` pass-through (FIX-4c's §4.4 half) |
| :404-418 | The volume sketch re-keyed to **the B2 set's form (D38.2)**: `el.volume == null` → **OMIT `<adjust-volume>` entirely** (FCP's default `"0dB"` — absent≡unity; `el.volume` the persisted LINEAR form, absent ≡ 1); else `amount = clamp(20·log10(el.volume), −60, +20)` dB (the fleet [−60,+20] domain; ONE home opencut core/audio-params; NaN→unity at that clamp — **never the −96 floor**). Structural rider: only the `<adjust-volume>` emission is guarded — the `<mute>`/fade children stay unconditional (the earlier draft-shape bug caught in self-review) |
| :460-464 | `gainToDb`'s `gain <= 0 → -96` floor **DELETED** → the one-home `clampVolumeDb(20·log10(gain))` wrapper (the linear unity floor 0.001 ≡ −60 dB replaces the floor) |
| :1350 | §11.6's pattern line: **emit `preservesPitch="0"` only when `el.preservePitch === false`** (absent≡true ⇔ the DTD default `"1"`; D38.1; §4.4's `buildTimeMap` passes the flag through) |

### The D-index pointers (cluster item 7 — minimal, inline)

- **D38.1**: 09 (B2 + the §3.1 field comment + §3.3A's attribution line) · 06 §5.12 · 03 §8.5 · 10 (§11.6's pattern + the §4.4 comment family).
- **D38.2**: 09 (B2 + the §3.1 field comment) · 10 (§4.4's volume comment + the `gainToDb` note). 06 carries NO volume-domain citation site (its half of the pair is preservePitch-only) — correctly pointer-free.
- **D-HB2**: 09 §3.3A + the §0:14 pointer. (10:15's serialization-clause D-HB2 pointer is spec-10 FIX-3's remainder — NOT this agent's rows; left for its owner.)

---

## §2 Verification greps (run post-edit — all PASS)

| Check | Result |
|---|---|
| `grep -c "preservePitch" 09-project-model.md` | **6** (> 0 ✓) |
| `grep -c "fromJSON" 09-project-model.md` | **7** (> 0 ✓) |
| the [−60,+20] domain present in 09 | ✓ — "dB **[−60, +20]**" (B2) + "dB in [−60,+20]" (the §3.1 field comment) |
| `grep -n "LINEAR 0..1"` over 09 + 10 | **0 hits** (the R15 reading retired everywhere) |
| D38.1 present | 09 ×4 · 06 ×1 · 03 ×1 · 10 ×1 lines ✓ |
| D38.2 present | 09 ×3 · 10 ×3 lines ✓ |
| D-HB2 present in 09 | ×2 (§3.3A title + §0:14) ✓ |
| 10's live `−96` floor | **0 live hits** (only the deletion note names it) ✓ |
| The byte-coherence cross-ref ring | 09 B2 → {06 §5.12, 18 §4.4, 20 §4.1, 10 §4.4} · 06 §5.12 → {09 B2, 03 §8.5} · 03 §8.5 → {09 B2, 06 §5.12} · 10 → 09 §3.1A B2 — all four files cite the B2 home + the D-number ✓ |
| Working-tree hygiene | `git diff` touches ONLY the 4 mandated files (sibling W-B agents' 02/20 edits left untouched); zero merge markers; 09/06/10 diffs byte-inspected ✓ |

---

## §3 Handoff + notes for the fold

1. **D-register (W-C's charge):** register **D38.1** = the preservePitch dual-representation ruling (law home 09 §3.1A B2; ops half 06 §5.12; playback half 03 §8.5; export half 10 §11.6) and **D38.2** = the volume-dB [−60,+20] one-home law (one home `core/audio-params.ts`; law home 09 B2; export fold 10 §4.4) — the pair title order in review-rulings §2 ("preservePitch + volume-dB") is the sub-number authority; B2's title now states the mapping explicitly, so downstream readers cannot invert it. **D-HB2** = the scene-load boundary (09 §3.3A).
2. **The cluster's remaining halves (other agents' rows):** 18 §4.4 (the Gain-dB rail rewrite + the absent≡true append — cluster-a's 18-half), 20 §4.1 (the `volumeDb` coherence row — the 20-half), 02 §7.4 (the stall law), 17's round-trip-matrix D-HB2 mirror line, 10's FIX-3 :15 serialization clause. The 02/20 files are already being edited by siblings in the shared tree (observed live; untouched here).
3. **Skipped by rule:** spec-03's F-7 (the §7.7 HA-3-2 seek-commit seam — law-heavy, the gesture cluster's row); 09's P1-4 (the toolbar GAP flip — DONE by W-A, verified not re-touched); spec-10's FIX-4a/d/e + FIX-5/7/8 (not this cluster; 4b/c were the named riders on 09's B2 set); 06's F-1..F-3/F-5/F-7/F-9/F-10 (the mechanical/lattice waves — other rows).
4. **The review's D38 amendment (iii)** held: the ChannelEditor `max={4}` residual stays routed to the plan (R12) — no 09/06/03/10 text touches it.
5. The battery (`battery_r27.py`) has no B-class consuming these four files' law text directly; the D38/D37-D41 presence checks consume 00's D-index (W-C) and the plan's D40 renumbering (W-C) — this set supplies the spec-side D38.1/D38.2 citations those checks will cite against.

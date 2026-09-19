# Spec-09 audit — R27 Wave 3 (final-tightness, per-spec fleet)

**Task ID:** R27-W3-09 · **Agent:** spec-09 · **Date:** 2026-09-13
**Spec:** `nle-core-spec/09-project-model.md` (3,102 lines, corpus @ `cdc4e94`-era) — audited section by section at sub-spec depth.
**Ground truth (the R27 pin world):** nle-ui `32abd58` (690/690, live-verified by the W1 scout) · opencut-timeline HEAD `55c81c0` / code pin `970948a` (632/632) · nle-engine `f9ac806` (748/748; code anchor `50b91f5`) · nle-test-app `c020b2a` (252/252) · WDC `ec8fd5c` (777/777). Consumer pins: app→nle-ui `83ff8a8`, app/engine→OT mirror `6e2b91a` (the D-ARCH-6 re-pin queued).
**Method:** every claim re-derived against the live trees (`/home/z/my-project/*`) — nle-ui `src/lib/mockData.ts:49-86` + `Inspector.tsx:998-1008` + `useUiStore.ts:923-954`; OT `types/index.ts:116-312` + `ops/timeline-core.ts:2433-2537` + `core/audio-params.ts:28-48`; engine `bridge/scene-to-segments.ts` + `bridge/opencut-laws.ts:54-97`; app `sceneBridge.ts:1-75` + `engineService.ts:478-527` + `EngineMount.tsx:352-380` + `App.tsx:38-39` + `persistenceService.test.ts`. Scout reports consumed: scout-nle-ui, scout-ot, scout-engine, scout-app (fleet-r27).

---

## §2 Per-section verdict table

| § | Section | Verdict | Evidence (file:line) |
|---|---|---|---|
| 0 | FORWARD INVENTORY | **P1 ×2 + P2** | The GAP row's file-affordance claim is FALSE now (F-1 below); the volume/preservePitch/D-HB2 laws are missing from the §0-recorded truth as well. Stale: all five repo pins (OT `ded43c4`/`c15a629` 536→`55c81c0`/`970948a` 632; app `c885ece` 174→`c020b2a` 252; engine `5036387` 458→`f9ac806` 748; nle-ui `fc4cc35` 674→`32abd58` 690; WDC `85b81b0` 759→`ec8fd5c` 777), the census "24 routed verbs + 6 documented exceptions" (:14) → **31 = 28 routed + 3 exceptions** (OT `api.ts:243-275`/:328-335), the OT vendored pin `c15a629` → `6e2b91a`, sceneBridge "503 LOC + 25-test" → 582 LOC + 41 tests, persistenceService "380 LOC + 17-test" → 410 + 20, the D2e field-law list at :15 omits `preservePitch` + still lists `speed` as sidecar-owned (live law: `sceneBridge.ts:7-24` — speed engine-owned since W2/F1). |
| 0A | Refined-spec notes | SOUND | Historical scout framing; no live claims. |
| 1 | Purpose | SOUND | Overrides both reference repos' storage — still the law (app localStorage + w3 OPFS target). |
| 2 | Goals | SOUND | Goal 5 (kimdogyeom) + Goal 6 (WYSIWYG) unchanged; both embodied app-side (App.tsx:38-39). |
| 3.1 | Project JSON schema | **P1 ×2 + P2 ×2 + P3** | Volume `// unit is LINEAR 0..1 as persisted` (:173) — FALSE as the domain statement (the linear span of the [−60,+20] dB domain is [0.001, 10]; `Inspector.tsx:1000-1007`). `preservePitch` (:177-178) carries no default/projection law (R9-b landed: `mockData.ts:60-72`). `transitionIn?` (:193) — NO live model has it (OT/nle-ui/engine/bridge all transitionOut-only). `TransitionJSON` (:235-244) is the pre-S3 pair-anchored shape (`leftElementId`/`rightElementId`/`timing`) vs the landed element-anchored `ElementTransition {type, duration, presentation?, alignment?}` (OT `types/index.ts:145-150`). `isSourceAudioEnabled` missing (OT `types/index.ts:196`; the engine's NLE law `scene-to-segments.ts:532-566`). P3: `pan?` specced-but-unconsumed (live home is the strip layer, mock-local per 18); required-vs-optional drift (`muted`/`visible`/`volume`/`opacity`/`speed` required here, absent≡default in the live models). |
| 3.1A | Round-15 rulings | **P1 + P2** | B2 (:337) is the R15 text — the R9-b preservePitch ruling + the volume-domain law are absent (the amendment text is drafted in §4-A below). The D32.5 note in B1 (:335) LANDED and is coherent (06 `06-nle-ops.md:432` carries the pointer: "pairwise at rest, groups at runtime" ✓) — but the **duplicate-severs twin is missing** (F4: `useUiStore.ts:938-945` `delete copy.linkedTo`; 09's B1 records only the split-relinks law). A2/A3/A4/A5/N1/N3 + the multi-scene ruling + the loop note all verified SOUND (A3→20 §4.2 `MixerTrackSettings` @ `20:100` ✓; A2→15 §4.3.39-42 Bookmark block @ `15:231-233` ✓; the multi-scene ruling matches the live EngineMount: ONE core keyed `[activeSceneId, docVersion]`, same-scene switch bumps NEITHER — `GluedShell.test.tsx:672-676`). |
| 3.2 | MediaTime serialization | SOUND + P3 | Branded-number claim ✓; but the UNIT is never stated — 01 `:744` says "i64 ticks", the mock doc uses float seconds (the registered delta; `sceneBridge.ts:1-2` "float seconds ⇄ ticks @ 120k/s"). §3.3's `duration: z.number().int()` implies ticks unstated. |
| 3.3 | Zod validation | **P1 + P2** | The scene-load boundary law is MISSING entirely (D-HB2 — the natural insertion point; drafted in §4-B). The Zod sample carries project-level `markers: z.array(MarkerSchema)` (:372) — contradicts §3.1's own A2 retirement (:77-78) — an internal inconsistency. |
| 4 | Persistence (OPFS) | SOUND | Spec-first w3 target; §4.1's parse-before-migrate sequencing comment (:421) is coherent with §5.1; the atomic-write/lock/correction set unchanged by any R25-R27 landing. |
| 5 | Migrations | SOUND | The gate order + MAX ceiling (Correction #11) verified engine-side R23 (persistence.test.ts P1-P4 per §0:17); no movement since. |
| 6 | Autosave | SOUND | Embodied app-side: the 2s identity-keyed debounce, ⌘S real-dirty flush, beforeunload last-chance flush, module-scope boot hydrate — `App.tsx:38-39` + `persistenceService.test.ts:106` ("NO docVersion bump at boot") — all match §6's laws. |
| 7 | Media library | SOUND + P2 | §7.2's MediaRecord promise (numeric size, ISO importedAt, colorInfo, storage ref) is intact and the w2 GAP row (:24) is accurate — only its re-verify pin is stale (`fc4cc35` → `32abd58`; the display-shaped mock records re-verified: `mockData.ts:10-22` — `size: string`, `duration: number \| null`, `thumbnail` path, `offline?`). |
| 8 | Open questions (scout) | SOUND + P2 | Historical reference; §8.2's "We omit LibraryAudioElement — out of scope for v1" (:967) is stale as an OT-fact: OT's live union CARRIES it (`types/index.ts:297-302` `LibraryAudioElement {sourceType: 'library', sourceUrl}`) and WDC landed library-audio-proxy (S-series). |
| 9 | Test plan (intent) | SOUND | Intent list intact; gains the D-HB2 mirror line (cross-spec: 17's round-trip matrix). |
| 10 | Code references | SOUND | Historical tables; the nle-engine §10.3 re-cites stand (no engine persistence movement since R23). |
| 11 | Corrections | SOUND | Correction #3's spec-10 alignment verified (10 `:1576` Correction #4 + the #7 reference back to 09 §8.13 at 10:1419). |
| 12 | Migration summary | SOUND | Historical. |
| 13 | kimdogyeom checklist | SOUND | The three hardening patterns still hold app-side (the persistenceService 20-pin suite + the tombstone/lock laws). |
| 14 | Summary of notable findings | SOUND | Historical. |
| Testing | Executable contract | SOUND | Tier rows verified against the live app suites (persistenceService 20, sceneBridge 41, GluedShell 104 — the census re-key is 12/17's charge). |

**Counts: P1 ×4 · P2 ×6 · P3 ×5.** (P1s: the volume-domain law missing; the preservePitch ruling missing; the D-HB2 scene-load boundary missing; the file-affordance GAP row false.)

---

## §3 The ElementJSON field inventory — 09's model vs the live models (focus #5)

Three live models compared: **nle-ui** `mockData.ts:49-86` (the consumed spec-09-shaped doc model), **OT** `types/index.ts:179-240` (the engine-SSOT TScene element), **the bridge** field law D2e (`nle-test-app/src/sceneBridge.ts:7-24`). Fields in **bold** = divergent.

| Field | 09 §3.1 | nle-ui (doc) | OT (engine) | Verdict |
|---|---|---|---|---|
| id / name / type / trackId / startTime / duration / mediaId | ✓ | ✓ | ✓ | SOUND. Type unions differ by design: 09's 6 kinds vs mock's 4 (no shape/adjustment) vs OT's 7 (sticker/graphic/effect + audio split upload/library) — the §8.2 collapse decision, registered. |
| sourceStart / sourceDuration | required | optional | — (uses **trimStart/trimEnd** + sourceDuration) | Representation difference, RECORDED (the source-window law, §0:15 + `sceneBridge.ts:26-31`). SOUND. |
| speed | required | optional | **retime.rate** (RetimeConfig) | The W2 projection — specced ✓; the derive/clamp law is 06 §5.11/5.12 + D11's lattice. |
| **preservePitch** | `?: boolean` (no law) | `?: boolean` + the 12-line R9-b law (`mockData.ts:60-72`) | **retime.maintainPitch** (`:122-125`) | P1 — the ruling is missing from 09 (§4-A). |
| **volume** | linear "0..1" | linear, absent≡unity (commit `max(0.001, 10^(dB/20))`, display `20·log10`) | **params.volume in dB** (D28-A2; `ElementParams :170-177`) | P1 — the dual-representation + [−60,+20] domain law missing (§4-A). |
| muted | required `boolean` | `?: boolean` (absent = not muted, S3-C6) | **params.muted** | Specced ✓; the absent≡not-muted default is the live normalization (P3 note). |
| audioFadeIn/Out | ✓ | ✓ | fadeInSec/fadeOutSec at the bridge's StructuralAudioSource | Specced ✓ (the S-layer fold). |
| opacity | required | optional (sidecar) | — (visual seam) | Specced ✓ (sidecar-owned per D2e). |
| **visible** | required `boolean` | — (no field) | **`hidden?: boolean`** (visual kinds) | Inverse-polarity + optionality drift — the bridge maps; P3 (state the absent≡visible default + the polarity note). |
| transform / masks / color | ✓ | — (mock-local) | — (engine-venue) | Specced, unconsumed by the doc round-trip (sidecar `effects` carries the live subset). P3. |
| effects (EffectJSON) | `{id, type, enabled, params, keyframes?}` | **`{id, name, enabled, params?}`** | — (sidecar) | Shape drift (type-vs-name); specced ✓. |
| **transitionIn** | `?: TransitionJSON` | — | — | **NO live model has it** — retire (§4-D). |
| **transitionOut** | `?: TransitionJSON` (pair-anchored: id/timing/leftElementId/rightElementId) | `?: {type, presentation, duration, alignment}` | `ElementTransition {type, duration, presentation?, alignment?}` — the S3 engine-SSOT data home | P2 — 09's TransitionJSON shape predates S3/D-T5 (element-anchored, no neighbor ids; the null-clear patch law + split-left-drops law live in OT's type header `:127-150`). |
| linkedTo | `?: string` (B1) | `?: string` | — (no link field; runtime `linkedGroupId` groups) | Specced ✓ — B1's D32.5 pairwise-at-rest/groups-at-runtime reconciliation LANDED (:335 + 06:432). The duplicate-severs twin missing (§4-D). |
| pan | `?: number` (B2) | — (mock-local, non-persisting) | — (strip layer: 20 §4.2) | P3 — specced-but-unconsumed; annotate the G-layer home. |
| **isSourceAudioEnabled** | — | — | `?: boolean` (VideoElement `:196`; absent≡true — "video carries its audio unless disabled", `scene-to-segments.ts:532-539/:559-566`) | P2 — the A/V-detach toggle has no doc home + no bridge mapping (§4-D). |
| keyframes | nested KeyframeTrackJSON (transform/effects) | — | **animations** (element-level channel map, W5; incl. the 'volume' lane N2b) | Equivalent in law; the property-string mapping ('volume' ⇄ the lane) is the bridge's. SOUND. |
| TrackJSON solo/syncLock | ✓ / `?` | ✓ / — | — / — | solo = the G-projection (A4) ✓; syncLock = 06 §6 ✓. OT's tracks carry neither (sidecar/group runtime) — consistent with D2e. |

**Net:** the fields the task named — transitionOut ✓ (shape stale), effects ✓ (shape drift), fades ✓, solo ✓ (track-level), opacity ✓, sourceStart ✓, speed ✓, preservePitch ✓ (law missing) — plus three real findings: `transitionIn` (retire), `isSourceAudioEnabled` (add), `pan` (annotate).

---

## §4 Fix-list — the exact edits (mechanically applicable)

### A. (P1) The preservePitch ruling + the volume-domain law — one B2 amendment + the §3.1 field comments

**Edit 1 — 09:177-178** (the ElementJSON field comment). Replace:
```
  preservePitch?: boolean;       // (Round 15 amendment, B2) retime keeps pitch (18
                                 // §4.4's preserve-pitch toggle)
```
with:
```
  preservePitch?: boolean;       // (Round 15 amendment, B2; the R9-b ruling, R27
                                 // fold) retime keeps pitch. ABSENT ≡ TRUE (the
                                 // NLE default); explicit false = pitch-affected
                                 // varispeed. A PROJECTION of the engine retime's
                                 // maintainPitch — see §3.1A B2
```

**Edit 2 — 09:173-175** (the volume field comment). Replace:
```
  volume: number;                // (Round 15 amendment, B2) unit is LINEAR 0..1 as
                                 // persisted; the shell displays dB (conversion at
                                 // the UI boundary — 18 §4.4 reword cross-ref)
```
with:
```
  volume: number;                // (Round 15 amendment, B2; the volume-domain law,
                                 // R27 fold) persisted unit is LINEAR gain (1 =
                                 // unity; the R15 "0..1" reading is corrected).
                                 // The authoring/display domain is dB in [−60,+20]
                                 // — ONE home: opencut's core/audio-params (see
                                 // §3.1A B2). ABSENT ≡ 0 dB ≡ unity
```

**Edit 3 — 09:337** (the B2 ruling). Replace the whole ruling with:
> **B2 — audio element fields (R27 amendment: the R9-b preservePitch ruling + the volume-domain law).** `ElementJSON.pan?: number` (−100..100) and `preservePitch?: boolean` join `volume`.
>
> *preservePitch (the R9-b model ruling — the R26-filed ask, resolved in code: nle-ui `af32e69` + app `94d5a2e`/`2de34ac`/`d8d1b2b`):* **ABSENT ≡ TRUE** — the NLE default (speed changes keep pitch); explicit `false` is pitch-affected varispeed (the chipmunk law). The doc field is a **PROJECTION of the engine's `retime.maintainPitch`** (the D-T5 pattern): authored through the engine patch surface, carried back by the mirror — the back-projection writes ONLY explicit `false` (true/absent project no doc field). A dormant `false` at rate 1 does not survive reload: that drop is the **APP's load-bridge identity law** (sceneBridge skips authoring retimes at speed 1 — `sceneBridge.ts:229-262`), NOT engine law: the engine stores a committed `{rate: 1}` retime verbatim and `fromJSON` never normalizes retimes (§3.3A). Writing the default onto an absent field is identity (the absent-≡-default class — no history entry). The toggle is the retime's COMPANION, not an independent element property; 06 §5.12 carries the op-side law; 18 §4.4 the Video-tab editor.
>
> *volume (the D28-A2 dual-representation + the [−60, +20] domain law):* the persisted unit is LINEAR gain (**1 = unity**; the linear span of the dB domain is [0.001, 10]). The AUTHORING/display domain is dB **[−60, +20]** — the fleet-coherent domain with **ONE HOME: opencut-timeline's `src/lib/timeline/core/audio-params.ts`** (`VOLUME_DB_MIN/-MAX`, `DEFAULT_VOLUME_DB = 0`, `clampVolumeDb`, `volumeDbToLinear` — the zero-import leaf every consumer bridge deep-imports; nle-engine's OV-01/OV-02 collapsed its replicas onto it: `opencut-laws.ts:54-79`). The engine's `params.volume` is the RUNTIME PROJECTION in dB (the bridge converts linear⇄dB both directions — D28-A2: **display dB, commit linear**). **ABSENT ≡ 0 dB ≡ unity.** Non-finite never poisons the fold: **NaN → DEFAULT (0 dB) at the clamp** (`audio-params.ts:39-43`) and **read-as-absent at the engine fold** (`scene-to-segments.ts:170-173`), plus the UI's linear floor 0.001 (≡ −60 dB, `Inspector.tsx:1007`). Cross-refs: 20 §4.1/§N2b (the fold law, incl. the lane-replaces-static rule), 18 §4.4 (the authoring rail).

### B. (P1) The D-HB2 scene-load boundary — new §3.3A (after §3.3, before §4)

Insert:
> ### 3.3A The scene-load boundary (D-HB2 — Round 27 amendment)
>
> The per-scene load boundary is opencut-timeline's `TimelineCore.fromJSON(scene, fps)` — wire-equivalent validation discipline at the SECOND JSON boundary (the wire being the first). It validates the STRUCTURAL invariants and **rejects the scene WHOLE** with the typed error form `[Timeline] fromJSON: <reason>` — never partial-loads (the throw fires before any normalization/counter-seeding; a rejected scene leaves nothing behind; the Load surface shows the message, exactly like a `JSON.parse` throw).
>
> **REJECTED (whole):** duplicate element/track ids (global — ids are lookup keys); duplicate keyframe ids WITHIN one element; non-positive / non-integer / non-finite durations; negative `startTime`; non-finite (or negative) structural tick fields (trims, `sourceDuration`, key times); overlapping elements on a track; keyframes outside the element's `[0, duration]` bounds; structurally invalid `retime` / `transitionOut` shapes.
>
> **NORMALIZED (kept):** id-counter seeding (element + track + **keyframe** ids), missing trims → 0, strict-boolean lock coercion, unknown extra fields ride opaque, animation canonicalization — but **never retimes** (a committed `{rate: 1}` retime survives verbatim — the preservePitch B2 attribution).
>
> **THE ROUND-TRIP LAW:** `toJSON()` output must ALWAYS pass this validation — the validator may never reject anything our own scenes contain (pinned: OT M53 hostile-class table + M49R load-surface pins @ `970948a`). The raw constructor remains the documented escape hatch (test-fixture / synthetic-state venues).
>
> Code: OT `ops/timeline-core.ts:2443-2537` @ `970948a`. The PROJECT-layer boundary composes with this: project JSON validates + migrates at the ProjectManager (§5.1 `migrateProject` → `ProjectSchema.parse`), then each scene re-validates at `fromJSON` on engine mount. (Mirror one line in spec 17's round-trip matrix row — cross-spec.)

**Companion edit — 09:14** (the §0 OT row's fromJSON sentence). Replace "…`static fromJSON(scene, fps)` with the load-time normalization set (…)" with "…`static fromJSON(scene, fps)` — **the scene-load boundary (§3.3A, D-HB2)**: the typed structural gate FIRST (rejected-whole), then the normalization set (…)…".

### C. (P1) The file-affordance GAP row — flip to CLOSED

**09:21** (the w3-remainder row). Replace:
> the D30 W-E/R7 file-affordance wiring (zero `onSaveScene`/`onLoadScene` hits in src/ at `c885ece` — the service APIs are complete + pinned, the toolbar affordance is NOT; the mock ⌘S theater survives only in the package's `'idle'` default world);
with:
> ~~the D30 W-E/R7 file-affordance wiring~~ **CLOSED (R9 W-E `b40216e`; re-verified R27 at `c020b2a`):** the toolbar Save/Load affordances are wired — `EngineMount.tsx:352-380` (toolbar-save → `saveSnapshotFile`; toolbar-load → the hidden file input → `loadSnapshotFile` + toasts; hostile JSON rejected) + the W-E b REAL save→blob→File→load round-trip pin (`GluedShell.test.tsx:1969`). The package's standalone `'idle'` ⌘S default world remains mock-only (the package has no persistence layer by design);
and drop the affordance clause from the "What REMAINS for w3" enumeration (the OPFS layer + the persistence-format formalization remain).

### D. (P2) The schema-block corrections

1. **09:193** — delete the `transitionIn?: TransitionJSON;` line (no live model carries it; the S3/one-input-source law is out-edge-only). If a v2 wants it, it re-enters as a ruling, not silently.
2. **09:235-244** — replace `TransitionJSON` with the S3 element-anchored shape: `{ type: 'crossfade'; duration: MediaTime; presentation?: string; alignment?: number }` + a ruling note: "(S3/D-T5, R27 fold) element-anchored on the OUT edge — no neighbor ids (the planner owns window clamping); `presentation` is the renderer registry key, opaque to the engine; split drops it from the LEFT product; patch `null` CLEARS the field (the only delete path in the patch surface). OT `types/index.ts:127-150`." (The old `id`/`timing?`/`leftElementId`/`rightElementId` fields retire.)
3. **09:151-199** — add to the Audio block: `isSourceAudioEnabled?: boolean; // (R27) video's embedded-audio toggle — ABSENT ≡ true (the NLE law: video carries its audio unless disabled; engine scene-to-segments.ts:532-566)`. (No bridge mapping yet — register as the w2 audio-side fold.)
4. **09:372** — delete the `markers: z.array(MarkerSchema),` line from `ProjectSchema` (contradicts A2's retirement at :77-78).
5. **09:335** (B1) — append after the split sentence: "A DUPLICATE severs the copy's `linkedTo` — the copy enters unlinked, the original keeps its pair (the F4/R14 twin of the split law; mock `useUiStore.ts:938-945`; OT-side severing is by construction — new ids carry no sidecar meta)."
6. **09:967** — annotate: "*(R27: OT's live element union has since grown `LibraryAudioElement {sourceType: 'library', sourceUrl}` — types/index.ts:297-302, WDC's library-audio-proxy landed — the omission is now a v1 doc-model scope note, not an OT-fact.)*"
7. **§3.2** — add one sentence: "`MediaTime` is TICKS (i64 @ 120,000/s — spec 01's media-time module, OT's D1); the nle-ui doc model's float-seconds is the registered mock delta (the bridge converts, `sceneBridge.ts:1-2`)."

### E. (P2) The §0 re-pin batch (mechanical, rides the W6 wave)

- :14 OT row → HEAD `55c81c0`, code pin `970948a`, **632/632**, census "**31 verbs = 28 routed + 3 exceptions**" (the D-ARCH-6 batch verbs + the singular retirement; the M49C gate 28/3), fromJSON → the §3.3A pointer.
- :15 app row → `c020b2a` **252/252**; sceneBridge "582 LOC + a 41-test suite"; the D2e list → the live field law (`sceneBridge.ts:7-24`: engine-owned …/speed/preservePitch/volume+muted(params); sidecar opacity/audioFades/effects/linkedTo+solo/waveform); nle-ui → `32abd58` (ElementJSON carries `preservePitch`, R9-b).
- :16 persistence row → "410 LOC + a 20-test suite".
- :17 engine row → `f9ac806` **748/748**; "the engine's own vendored OT is re-pinned to `6e2b91a`".
- :24 media row → "re-verified R27 at `32abd58`".
- :4 status line → the R27 round note (this audit's flips).
- Status header pins (`c15a629` consumer rows) → the queue's target (`55c81c0` mirror) per the D-ARCH-6 filing.

### F. (P3) Polish

1. `pan` — add the annotation to B2: "(the live authoring home is the strip layer — 20 §4.2's MixerTrackSettings.pan; the doc field awaits the w2 audio side; the mock's Inspector pan is mock-local, non-persisting)".
2. The registered-delta sentence (:15) — extend: "…display-shaped `MediaRecord` extras — see the GAP register's media row" → "…display-shaped `MediaRecord` extras + the element-field deltas (4 kinds; optional fields with absent≡default normalization; no transform/masks/pan/visible) — see the GAP register's media row + §3.1's inventory".
3. `SceneJSON` — note OT's TScene carries `createdAt`/`updatedAt` per scene (09's SceneJSON lacks them; the bridge fabricates — the project-level timestamps only). Optional.

---

## §5 Cross-spec notes (for the cross-cut wave — NOT my edits)

1. **06 §5.12** (Retime) needs the companion-field law (absent≡true ⇄ `retime.maintainPitch`; the bridge's conversion `el.preservePitch !== false`; the preservePitch-only-patch merge law) — the nle-ui scout's P1; 09 B2 (§4-A) is the model home, byte-coherent with it. The §5.11/§5.12 citation split (code cites §5.11) resolves to §5.12.
2. **18 §4.4** (:184/:189) — the "Volume %" + "'Gain dB' is withdrawn" text is FALSE (the live rail is Gain dB [−60,+20], AW1-2); the reword must land in the same amendment set as 09's B2 (the engine scout's open Q5: one cross-spec author, three byte-coherent statements — 09 model law / 18 authoring rail / 20 fold law).
3. **20 §4.1/§N2b** — the `volumeDb` entry gains the coherence row (one-home + NaN→unity is already stated at 20:125); 09 B2 cross-refs it.
4. **00-master** — a D37+ DECISIONS entry for the R9-b ruling (the R26 HANDOFF's "file it as a DECISIONS entry" ask) + the fleet re-pin rows + the §2A consumer-pin class (nle-ui `83ff8a8` w/ the AW1-2 absorb queued).
5. **17** — the D-HB2 mirror line in the round-trip matrix row (the M53/M49R pins as the executable acceptance).
6. **15 §13.15/§4.1A** — the census + batch-verb flips (the OT scout's rows #1-#10); 09 §0:14's census rides the same edit family.
7. **10:1419** — cites "09-project-model.md | 2379" lines; 09 is 3,102 (stale count in 10's reference table).
8. **05:17 / 12 / 19** — the census re-key + the app re-baseline rows (the app scout's P1s) — not 09's charge but the same wave.
9. The WDC diagnostics/heartbeat law (briefing fact #7) has no 09 home by design (audio-engine venue) — 09's engine row (:17) could carry one evidence clause at the re-pin, nothing more.

---

## §6 What 09 uniquely sees

1. **The §0 register runs ahead of the §3 schema text.** Every round's findings were absorbed into §0's prose (the OT row, the bridge field law, the R8/R9 landings) but the §3.1/§3.3 code blocks were last amended at R15 — so the spec now contains BOTH the truth (§0:14 "transitionOut — the engine-SSOT data home") and the contradicted pre-S3 text (§3.1's pair-anchored TransitionJSON + transitionIn + the Zod markers). The amendment wave must touch the schema blocks, not only the rulings — otherwise the "schema IS the contract" framing (§0:13) keeps shipping two models.
2. **The GAP register can rot in the FALSE direction too.** The file-affordance row was true at its R24 verification pin and has been false since R9 W-E (`b40216e`, three rounds ago) — the same duplicate-landing risk the app scout flagged in IMPLEMENTATION-PLAN. GAP rows that assert "zero hits in src" need a re-verification pin attached, or they age into P1s.
3. **The absent-≡-default normalization is the model's real field law now** (preservePitch≡true, volume≡0 dB, muted≡false, isSourceAudioEnabled≡true, trims≡0) — 09's required-field declarations (§3.1) predate it. The inventory table (§3 above) is the reconciliation.
4. **09 is the only spec that owns the persisted-model field inventory** — the volume/preservePitch/transitionOut/linkedTo field laws all have their MODEL home here; 18 (display), 20 (G-layer), 06 (ops), 05 (selection) are consumers. The one-home laws (audio-params for volume; 09 B2 for the field rulings) are what keep the five repos from drifting — the R27 fleet's three scout P1s against 09 are all "the landed model law has no 09 home" findings.

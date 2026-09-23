# R28-T2-a — the test law for D42 / D43 / D44 (the spec-side design)

**Task ID:** R28-T2-a · **Agent:** test-law DESIGN agent (general-purpose) · **Date:** 2026-09-16
**Tree:** `nle-core-spec` @ main (read-only; the law lands in 12/17 at the S-spec(6) fold — this file is the design those edits execute).
**Mission:** the COMPLETE test law for the three ruled areas — per area: the test surface (suites/repos/families), the fixture shapes, the oracle instantiation (from the T1 pattern library), the acceptance pins, the phase + owner (the D24 ladder), and the battery_r28 machine-check that verifies the SPEC carries the law. Spec-side design only — no test code.

**Inputs (all read in full, live-verified):** `test-scout-engine.md` (T1-a — the 21-pattern library; engine 749/749 @ `74bef08`) · `test-scout-ot-wdc.md` (T1-b — the M49C four-layer gate, P-OT-4 history-depth arithmetic, P-OT-9 seeded fuzz, P-OT-11 never-silent family) · `test-audit-coverage.md` (T1-d — §2's D42/D43/D44 verdict rows: MISSING / MISSING / STALE; §5's ranked fixes 1, 2, 10) · `ARCH-R28-seal-round.md` §4 + §4.1 (the rulings + the binding addenda D42/F2-F4, D43/A-1..A-10, D44/A-6..A-9) · the landed law sites: 06:411 (rider 12's uniform predicate), 06:420-421 (D42.1 track-family rows), 06:431 (relink-both-halves), 06:440 (E1-c), 06:1592 (E2-a prune/CASCADE), 06:1603 (OW-4), 06:1671 (D43.10's live three-way intersection), 06:1697 (F4 duplicate-sever), 09:343 (B1's D42 note), 15:962-971 (the `linkedTo` patch key), 15:2965-3014 (the two-tier envelope + the 25-code class-tag table + the never-silent law).

**Method notes (the two scout-trap laws this design bakes in):** (1) *the census trap* — every suite-count pin must be runner-derived (`vitest list` / the OT report json), never grep (T1-a §1: 665 textual vs 749 real); the OT count authority is the report TOTAL only, no in-page/real-mouse split re-declared (R4ii). (2) *the tautology trap* — every expected value is hand-derived from the ruled formula (P1), every census table derives from the live registry (the M49C live-read law — D-ARCH-3 deleted the test-local copy so the gate and the UI read ONE module), never a mirrored hand-copy.

---

## §0 The pattern→area map (which library members each area instantiates)

| Area | Engine library (T1-a) | OT library (T1-b) | The load-bearing instantiation |
|---|---|---|---|
| **D42 linkage** | P3 table-loop · P4 no-commit trio · P5 twin-equality drift fence · P8 regression-pin-per-named-bug · P9 shared battery · P10 undo algebra · P16 port-disposition | P-OT-4 history-depth arithmetic · P-OT-5 STATE-WYSIWYG · P-OT-9 seeded fuzz | Per-verb rejection/closure tables × the no-commit trio; the closure battery written ONCE and swept (P9); depth = the canonical observable; the engine≡OT closure fence (P5) |
| **D43 constants** | P1 hand-derived oracle · P5 twin-equality (OV-01/OV-02 the literal template) · P6 constant-literal · P7 hostile fold · P20 wiring proof | (none direct — the module is OT-side pure) | The per-domain grid (interior + bounds + dead zone + hostile); literals never module-vs-module; the intersection re-computed from live imports (P1's anti-tautology applied to a derivation) |
| **D44 envelope** | P3 table-loop · P4 no-commit trio · P7 hostile fold · P19 error-envelope conformance | P-OT-2 never-throws wire · P-OT-3 M49C live-read + tsc-lockstep · P-OT-4 NOOP honesty · P-OT-11 never-silent family | The 25-row census table (code+class+constraint) generated from the live registry; the benign-echo family pinned `ok:true`; the riders' TRACK_LOCKED-before-NOT_FOUND precedence |

---

## D42 — the linkage pairwise field + runtime closure

**The ruled law being tested (the sites this law serves):** `linkedTo?: string` on OT's `BaseTimelineElement` (09:343 B1's D42 note); the runtime group derived per op by a PURE closure helper in `ops/` — symmetric, live-id-only, order-stable, cycle-free, locked-partner-skip; rider 12's uniform predicate at 06:411 (**locked ⇒ skip now** — lands with the field; **sync-lock ⇒ skip when §6 owns the track** — slots at the Stage-4 sync-lock port); E1-c's mixed-split constructible case at 06:440; the E2-a prune/CASCADE law at 06:1592 + the OW-4 pin row at 06:1603; relink-both-halves at 06:431; duplicate-severs (F4) at 06:1697 + 09:343's correction (OT's `duplicateElements` must DELETE the field explicitly — the `{...element}` spread would carry it); the patch key + null-clears at 15:962-971.

### §D42.1 The test surface

Four surfaces, four repos, one spec-side fold:

1. **OT in-page milestone family** (opencut-timeline, `src/lib/timeline/testing/`) — a NEW milestone file **`milestones-linkage.ts`** (the append-only suite-tree convention: every landing wave adds a file; the 49-entry family gains a file and the 451-test count grows with it — the two figures are different censuses, never one count). It carries: the closure battery (P9 — one shared validator, failures-list form), the per-verb table-loops (P3 — dynamic `it()`-per-row registration so row names land in the harness report and stay greppable), the named regression pins (P8), and the WYSIWYG twin (the link gesture through `useWireDispatch` vs the direct `updateElements` patch — P-OT-5). Runs on the `/` page mount; the report scrape is the count authority.
2. **OT fuzz net** (M25's family, `milestones-fuzz.ts` or a parallel `milestones-linkage-fuzz.ts`) — the seeded-PRNG op-sequence net EXTENDED: the generator gains the link mutations (`updateElements{linkedTo}` set/null patches; duplicate/split/delete/move already present), and the after-every-op invariant set gains three rows (I6-I8 below). mulberry32, seeds 1..4, `resetIdCounterForTests` for id-determinism — the M25 shape verbatim.
3. **Engine-side drift fence** (nle-engine, `tests/vitest/engine/bridge-seams.test.ts` — the P5 family; 151 its today) — a new linkage-drift-fence block: the engine's `bridge/av-link.ts` expansion ≡ the OT pairwise-field closure over a census grid of scene shapes. **Timing law:** the vendored OT mirror (`6e2b91a`) does not yet carry the field — this fence goes live at the OV-12 re-pin that carries the Stage-0 port into the vendored tree; until then the carried engine pins (13+11) stay green as-is and the fence is authored but red-gated on the vendored export's existence (fail-safe skip with the reason named, the OV-12 fail-safe form).
4. **App-side retirement suite** (nle-test-app, the `sceneBridge` 41-test family + `engineSeam` 7) — the sidecar-retirement pins (§D42.4 D-pins).
5. **Spec-side fold** (S-spec(6), this repo): 12 §8's three property rows + 17 §3.1's matrix row + 17 §13A.7's facet row — the mirror of 06's GAP-row pin sets (T1-d §2's D42 row: "the pin set already exists in 06's GAP rows — this is a mirror, not authorship").

**No M49C change** (T1-b's D42 call): the closure is derived per op, not a wire verb — the patch rides the already-routed `timeline.updateElements`; the census arithmetic (28/3) is untouched unless a link verb is minted, in which case the gate self-extends via tsc-lockstep (the registry-reconciliation law).

### §D42.2 The fixture shapes (concrete)

- **PAIR** — the base fixture: video track V [0,100), audio track A [0,100), `V.linkedTo=A.id ∧ A.linkedTo=V.id` (the mutual pair — the normal shape every other fixture builds on).
- **CHAIN-3 (E1-c's constructible case)** — split V at 50 (V-left [0,50) + V-right [50,100), BOTH relinked to A); then a LATER op splits V-left + the companion A (not V-right): the untouched third member V-right keeps its ORIGINAL link verbatim; the four fresh halves re-pair by side (fresh pointers); the pre-op state is the spec-mandated 3-member runtime closure group {V-left, V-right, A} (the undirected closure's derived shape).
- **LOCKED-COMPANION** — PAIR with track A locked: the anchor edit on V proceeds; A never enters the closure (E1-b's locked-partner-skip).
- **SYNC-LOCKED-COMPANION** — PAIR with A's track sync-locked: A takes §6's interval/gap propagation, never link-following (rider 12's second branch).
- **HOSTILE pointer zoo** — self-pointer (`X.linkedTo=X.id`); dangling (`X.linkedTo='dead'`); directed 3-cycle (A→B→C→A); one-way pointer (A→B, B absent/null) — each swept through the closure.
- **PRUNE/CASCADE (OW-4's mixed-fate fixture)** — split one side of PAIR (constructing ≥3 members), then an overwrite FULLY covering one member while TRIMMING another: the fully-removed member's companion cascades WHOLE; zero dead `linkedTo` on survivors; survivors of other pairs keep theirs.
- **E1 carried fixture** (the re-key) — mid-clip insert on V with companion A straddling; the 4 postconditions (no target-track overlap; the left half unmoved; the companion split at the same frame; ONE undo entry restoring the exact pre-state).
- **DUPLICATE-CARRY trap** — duplicate V (linked to A): the `{...element}` spread would carry the field — the copy must land with `linkedTo === undefined`.
- **PATCH shapes** — `{linkedTo: A.id}` (establish); `{linkedTo: null}` (clear); the same patch on a locked track; the patch pointing at a dead id; the patch pointing at the element itself.
- **Fence grid (engine-side)** — PAIR / CHAIN-3 / severed-copy / one-way / dangling / locked — six scene shapes serialized identically into both venues.

### §D42.3 The oracle instantiation

- **P3 TABLE-LOOP** → one table per base verb (`deleteElements` / `rippleDeleteElements` / `splitElements` / `duplicateElements` / `moveElements`), rows = target-only / pair-present / companion-locked / companion-sync-locked / `syncLinked:false` / hostile-dangling. The locked-track fleet's 38-row shape (T1-a `timeline-locked-track.test.ts:185-199`) is the template — rows hand-rolled, NOT derived from a registry (the closure is not a verb surface; the honest limit T1-a §5.3 registers).
- **P4 NO-COMMIT TRIO** → every rejection row asserts `expect(scene).toBe(before)` + history depth unchanged + no phantom entry (P-OT-4: "phantom history entry" is a named failure mode) — the strongest "nothing happened" available; the depth arithmetic is the canonical observable for the accept rows too (ONE entry per composite op — one command, one ⌘Z, 06:409).
- **P8 REGRESSION-PIN-PER-NAMED-BUG** → E1-c, OW-4, relink-both-halves, duplicate-severs, the R14 divergence's retirement (the mock's `delete right.linkedTo` + the bridge's by-structure sever are SUPERSEDED — the pins name the retired behavior as the pre-fix form; gates-must-fail discrimination per `m2-wave1-mixer-surface.test.ts:28-31`).
- **P9 SHARED BATTERY** → the closure-shape battery written ONCE (returns a failure list pins can print): given a post-op state, derive the closure; assert symmetric / live-id-only / order-stable / terminates / locked-skip — swept by every pin in the file rather than re-encoded per test (the `timeline-mode-clamps.test.ts:54-60` shape).
- **P5 TWIN-EQUALITY DRIFT FENCE** → engine-side: `expandEngine(scene)` ≡ `closureOT(field)` as PARTITIONS over the six-shape grid — if either derivation drifts, the pin fails before the twins diverge (the OV-01 template's linkage twin).
- **P10 SNAPSHOT-vs-DERIVED** → `base+edit+undo ≡ base (serialized, linkedTo fields included)`; `toJSON→fromJSON→toJSON` byte-stable carrying the field — the E1/E2/F6 pins' assertion form, re-keyed to the field (09:345: "the carried pins assert link values through undo/redo/serialization — impossible without a field in the SSOT").
- **P16 PORT-DISPOSITION** → the carried corpus (13 `timeline-linked-source-edit` + 11 `timeline-relink-fixes` = 24) files EVERY source it() as PORTED (re-keyed to the pairwise field) / NOT-PORTABLE (machinery reason) / ALREADY-COVERED (covering pin's cite) — zero silent drops; the count reconciliation (rider 9: 25→13, 26→13, 14→12+table, +11, decomposition unknown) lands at the port's acceptance row.
- **P-OT-9 SEEDED FUZZ** → invariants I6-I8 after EVERY op (below); deterministic by seed.
- **P-OT-5 WYSIWYG** → the UI's link gesture dispatches the patch through the wire (`origin:'ui'`); the direct engine-op path yields the identical `SceneTracks` ignoring minted ids.

### §D42.4 The acceptance pins (numbered; each assertable)

**A. The closure battery (OT, `milestones-linkage.ts`, ~10 pins)**
1. Symmetric: for every derived group, x∈group(y) ⇒ y∈group(x) — a mutual pair expands to one 2-member group; the one-way pointer derives NO link (the mutual-only reading — pinned so a one-way fan-out can never happen; flagged: the port's design note states the reading).
2. Live-id-only: a dangling pointer is DROPPED by the derivation (the element still edits normally — read-as-absent, P7's disposition law).
3. Order-stable: the group's member order is the scene's element order, never map-iteration order (assertable: two derivations over key-shuffled but element-order-equal scenes agree).
4. Terminates (cycle-free): the hostile zoo (self / 3-cycle / one-way) derives a well-defined group in bounded time — the never-hang law.
5. Locked-partner-skip (rider 12 branch 1): a locked companion never enters the closure — with the no-commit trio on the companion's track.
6. Sync-lock-skip (rider 12 branch 2, Stage-4): when §6 owns the track, the sync-locked companion takes §6's propagation, never link-following — never double-applied (06:421's D42.12 sentence).
7. The predicate is UNIFORM: the same closure-helper decision at every consumer — pinned by the battery being the ONE shared validator (the structural form of "never per-op improvisation").
8-10. The closure is PURE: same input ⇒ same output reference-shape; no scene mutation during derivation (`toBe(before)` on the input).

**B. The per-verb tables (OT, ~30 rows)**
11-40. For each of the 5 base verbs × 6 shapes: the fan-out law of 06:429's base-verb sentence holds (split = relink-both-halves; trim = the tightest-δ discipline; delete/range-removal = linked expansion + prune; move = offset-preserving pair move; duplicate = sever) — each accept row asserts the closure-shape battery + ONE history entry; each reject row asserts the typed error + the no-commit trio. The hostile-dangling row asserts the read-as-absent fold (the op succeeds over the live ids only).

**C. The named regression pins (OT, ~10 pins)**
41. **E1-c** (06:440): the CHAIN-3 fixture — the untouched third member's ORIGINAL link survives verbatim; the split halves re-pair by side (fresh pointers); NO member orphans.
42. **OW-4 prune/CASCADE** (06:1603): the mixed-fate fixture — the companion cascades WHOLE (a mere unlink is a defective port — the discrimination clause); ZERO dead `linkedTo` on survivors; survivors of other pairs keep theirs.
43. **E2-a's "op code" qualification** (06:1592): split's `...element` spread carries the field to both halves by construction, but the fresh by-side pointers are minted by the split CONSUMER — the pin mutates the consumer's relink step and fails (the spread alone does not relink).
44. **Relink-both-halves** (06:431): a single linked split preserves the link on BOTH halves (the FreeCut single-side-sever is the named pre-fix form — gates-must-fail).
45. **Duplicate-severs** (F4, 06:1697): the copy lands with `linkedTo === undefined`; the original keeps its pair (the phantom-carry trap — the `{...element}` spread is the pre-fix form).
46. **Replace-severs** (rider 7, D31.4): `syncLinked:false` by law — the companion keeps position + duration; the naive-composition trap (`removeItems` default expansion deleting the companion) is the pre-fix form.
47. **The patch family** (15:962-971): `{linkedTo: id}` establishes (one entry); `{linkedTo: null}` CLEARS the pairwise link (mutual dissolution — both sides read unlinked after); the patch on a locked track → `TRACK_LOCKED`; the dead-id patch → `ELEMENT_NOT_FOUND` (the honest refusal — the live-id-only invariant holds post-op either way; the port's design note owns the choice); the self-patch → rejected.
48. **The carried corpus re-keyed** (P16): the 24 ported pins (13 E1/E2 + 11 F6/H2-A) green in OT, re-keyed to assert link VALUES through undo/redo/serialization; the disposition table filed with counts at the bottom.
49. **WYSIWYG twin**: the link gesture through the wire ≡ the direct patch (ignoring minted ids).
50. **The count reconciliation row** (rider 9): the port's acceptance row records the reconciled figures (24 on-disk across the two files; the "26 sites" figure re-derived — 24 on-disk).

**D. The invariant sweep (OT fuzz, 3 properties — 12 §8's rows)**
51. **I6 closure-shape after ANY op**: the post-op closure is symmetric, live-id-only, order-stable, terminating — for every state reachable by the seeded op sequence (the closure battery swept per step).
52. **I7 NO dead `linkedTo` after ANY op**: every **NON-NULL** `linkedTo` on every live element points at a live id — `null` is the legal CLEARED state (15:962-971: a null-clears patch legitimately produces a null field; the invariant reads non-null pointers only, never flags null as a dead pointer) — after every op in the sequence (the dead-pointer sweep; this is the invariant that catches a forgotten prune in ANY future verb — the class the curated tables miss).
53. **I8 undo/serialize preserves the field**: snapshot-at-checkpoint; `base+edit+undo ≡ base (serialized)` incl. every `linkedTo`; `toJSON→fromJSON→toJSON` byte-identical carrying the field.

**E. The drift fence (engine, ~6 pins) + the retirement (app, ~4 pins)**
54. The six-shape grid: `expandEngine(scene) ≡ closureOT(field)` as partitions — the P5 fence.
55. The fence's fail-safe skip form pre-re-pin (names the reason; never a silent green).
56-57. **The app-side retirement**: (i) `sceneToTScene` emits NO `linkedTo` sidecar (the field rides the OT element — the identity law re-pinned minus the sidecar); (ii) the dispatch-level expansion call sites are GONE (the wiring proof inverted, P20's negative form) while (iii) link fan-out still behaves end-to-end (the parity pin that guards the retirement — retire the mechanism, never the law) and (iv) save/load round-trips links via the field alone.

**Pin-count estimate: ~95** (≈80 OT-side: 10 battery + 30 table rows + 10 named + 24 carried + 3 fuzz + 2 WYSIWYG + 1 reconciliation; ≈6 engine-side; ≈4 app-side) + the 3 spec-side property rows (12 §8) + the 17 matrix/facet rows.

### §D42.5 Phase + owner (the D24 ladder)

| Work | Phase | Owner |
|---|---|---|
| The field + closure + 5 base-verb consumers + patch key + locked-skip branch + the closure battery + per-verb tables + the carried 24 re-keyed (P16) — ONE additive OT change (ARCH D42's filed first step) | **r1 Stage 0** | **S-ot** |
| E1-c + OW-4 + relink-both-halves + the E1/E2 carried pins — they ARE the Stage-2 exit gate ("the carried insert/overwrite pins green in OT") | **r1 Stage 2** | **S-ot** |
| The sync-lock-skip branch (rider 12's second slot) | **r1 Stage 4** (the sync-lock port) | **S-ot** |
| The drift fence + the C1-fold wiring (goes live at the OV-12 re-pin carrying the field) | **r1** (the re-pin wave) | **S-engine** |
| The sidecar/expansion retirement pins | **r1 Stage-0 exit → the app session after the field lands** | **S-app** |
| 12 §8's three property rows + 17 §3.1/§13A.7 rows (the mirror) | **the R28 test-law fold, WITH battery_r28** | **S-spec** (the proposed S-spec(6)) |
| The battery check below | **W5/W6** | **S-spec** |

### §D42.6 The battery_r28 check (the spec-text machine gate)

**Check `D42-test-law`** (battery_r27's `check(name, fn, tag)` idiom; three sub-assertions, all spec-text; **ALL token regexes in this design's checks match case-insensitively/normalized** — the corpus's rows capitalize lead words, so a bare `edit-domains|editDomains` misses "Edit-domains" and a bare order-sensitive alternation misses the landed row orders):

1. **Presence in 12 §8** — the property block (the span between `## 8.` and `## 9.`) contains `linkedTo` and the three invariant names: a closure-shape row (regex `symmetric.*cycle-free|closure.*symmetric`), a dead-pointer row (`no dead .?linkedTo|dead-pointer`), a round-trip row in EITHER order — `(linkedTo.*(undo|serialize|round-trip))|((undo|serialize|round-trip).*linkedTo)`, row-local both-orders (the landed I8 leads "Undo/serialize" before `linkedTo`; an order-sensitive one-way regex reds on the doc's own natural row).
2. **Presence in 17** — §3.1 carries a row matching `Linked-companion|linkedTo` with T1/T3/Property cells; §13A.7 carries a linkage facet row citing `06` + `§5.0` (or §5.9B).
3. **Coherence 06 ↔ 17** — the facet row's pin vocabulary {`E1-c`, `OW-4` OR `prune`/`CASCADE`, `relink-both-halves` OR `relink`, `duplicate-sever` OR `sever`, `null-clears` OR `null`} appears in 17's facet row AND at the facet row's CITED pin sites — all five members' own homes: 06:440 + 06:1603 (the GAP-row acceptance cells, which carry ONLY the E1-c/OW-4 members), 06:431 (relink-both-halves), 06:1697 (duplicate-sever), 15:962-:971 (null-clears) — the vocabulary scope is the CITED SITES, never the two GAP cells alone (the over-narrow GAP-only scope failed 3 of 5 members at review); AND both sites' phase tags agree (r1/Stage-0-family); AND 12 §8's three rows do NOT contradict 06 §5.0's closure adjectives (the four adjectives `symmetric`, `live-id-only|live ids`, `order-stable`, `cycle-free` present at 06:411-area and echoed in 12 §8's row).

Fails loud with the drifted member NAMED (the direct-diff law): "12 §8 lacks <invariant-name>" / "17's facet row lacks <term>" — never a bare boolean.

---

## D43 — the `edit-domains.ts` constants module

**The ruled law being tested:** ONE file `opencut-timeline/src/lib/timeline/core/edit-domains.ts` — per-domain namespaces RE-EXPORTING the two existing one-home leaves verbatim (volume-dB from `core/audio-params`; retime from `ops/retime` — OV-01's bridge binding is load-bearing), then only DERIVED lattice facts: `NATIVE_VENUE_SPEED` [0.1,16], `WSOLA_RATE` [1/32,32], `AUTHORING_SPEED` [0.1,4], the dead-zone predicate, `minDurationTicks(fps)`, `FIT_TO_FILL_RATE` computed as the live three-domain intersection → **[0.1,5]** (06:1671: `[MIN_RETIME_RATE, MAX_RETIME_RATE] ∩ NATIVE_VENUE_SPEED ∩ WSOLA_RATE`; binding constraints native-min 0.1 + wired-max 5; WSOLA slack both ends; `AUTHORING_SPEED` NOT an input — the [0.1,4] trap; refusal, never clamp). Import law: OT's ops import the module; the engine bridge keeps leaf-only deep-imports; **nle-ui mints a local `editDomains.ts` pinned ⊂** (A-5: pin failure ⇒ align nle-ui to the one-home, NEVER edit the module); WDC independent. Migration: OT first (Stage 0, ZERO behavior change), the engine folds C1/C4, nle-ui lands its file, the ports consume from Stage 1.

### §D43.1 The test surface

1. **The one-home's own suite** (OT, in-page milestone family — a NEW `milestones-edit-domains.ts`): the constant-literal pins + the per-domain grids + the dead-zone truth table + `minDurationTicks` + the live-intersection property + the Stage-0 verbatim-re-export check. The in-page harness is the right venue because its `assertEqual` is hardened for exactly this class (Object.is: NaN===NaN, −0≠0; key-sorted deep stringify — the round-6 F-16 footguns, `harness.ts:29-59`).
2. **The NATIVE_VENUE_SPEED fence** (engine, `bridge-seams.test.ts` — the P5 family, the OV-01/OV-02 literal template at `:2286-2297`/`:2359-2415`): the deep-imported module ≡ the engine's `MIN_SPEED`/`MAX_SPEED` + the C1-fold wiring proof (P20).
3. **The nle-ui twin's pin** (nle-ui's own vitest suite — 690 today): the local `editDomains.ts` literal grid + the ⊂ arithmetic; PLUS the battery's live cross-repo ⊂ check (§D43.6 — the pin that cannot be bypassed because it reads both files).
4. **Consumer wiring spot-checks** (OT ops + engine bridge): the consumers' outputs computed through the imported leaf (P20 — equality pins prove the law; the spot-check proves the connection).
5. **Spec-side fold**: 17 §13A.7's facet row (T1-d §2's D43 row: the fence + the computed-intersection property + the ⊂ pin + the Stage-0 verbatim check + the battery check-2 widening) + 06 §5.9F/§11.7 already carry the intersection (the coherence side of the battery check).

### §D43.2 The fixture shapes (concrete)

- **THE GRID** (one per domain, the OV-01 template extended): `[-3, 0, 0.001, 0.01, 0.02, 1/32, 0.5, 1, 3.2, 5, 5.0001, 10, 16, 32, NaN, +Infinity, -Infinity]` — interior + both bounds + the **dead zone [0.01, 0.02, 1/32]** + the hostile family. Per domain the expected disposition is HAND-TABLED (P1: the expected value hand-derived from the ruled bounds, never copied from the module).
- **The intersection fixture** — the three live inputs imported (`MIN_RETIME_RATE`, `MAX_RETIME_RATE`, `NATIVE_VENUE_SPEED`, `WSOLA_RATE`) + the recomputed intersection `[max(0.01, 0.1, 1/32), min(5, 16, 32)] = [0.1, 5]` as literal arithmetic in the test.
- **The narrows-refusal mutation probe** — a fixture-local narrowed copy (e.g. `WSOLA_RATE' = [1/8, 8]`): the recomputed intersection `[0.1, 5] ∩ [1/8, 8] = [0.125, 5] ≠ [0.1, 5]` — the property's failure mode demonstrated in-test (the probe proves the pin is derived, not static text).
- **The ⊂ fixture** — nle-ui's local literal set vs the one-home's parsed literal set; the subset arithmetic printed with the offending member named.
- **`minDurationTicks` grid** — `{24, 30, 60, 120}` fps → hand-derived tick literals; `{0, -30, NaN}` fps → the hostile fold (P7 disposition pinned: clamp-or-throw, whichever the module's doc declares — the disposition itself is the law).

### §D43.3 The oracle instantiation

- **P6 CONSTANT-LITERAL** → every law value pinned as a literal (`expect(NATIVE_VENUE_SPEED.min).toBe(0.1)` …) — never `X === Y-constant-from-the-same-module`; a semantic change upstream fails loudly and forces conscious absorption (SKILL law 82; `video-sync.test.ts:50-59`'s nine-threshold form).
- **P1 HAND-DERIVED ORACLE (the anti-tautology law applied to a DERIVATION)** → `FIT_TO_FILL_RATE`'s expected `[0.1, 5]` is hand-computed IN THE TEST from the three documented bounds (the intersection arithmetic), then compared to the module's export — a module that substitutes `AUTHORING_SPEED` (the [0.1,4] trap) or hardcodes a stale text value cannot pass.
- **P5 TWIN-EQUALITY DRIFT FENCE** → engine-side: the deep-imported leaf ≡ the engine's `MIN/MAX_SPEED` + the C1 clamp's output ≡ the leaf's clamp over the GRID (if WDC/OT moves a bound, the pin fails BEFORE the twins drift apart).
- **P7 HOSTILE FOLD** → NaN/±Inf/out-of-domain swept through every fold with the disposition per family pinned (clamp-to-domain / fold-to-unity / read-as-absent / hostile-throw — WHICH applies is the law).
- **P20 WIRING PROOF** → the consumer spot-check: the flattener/ops/bridge compute through the imported leaf (spy or output-identity form, `bridge-seams.test.ts:2333-2345`'s flattener spot-check template) — the leaf actually feeds the seam, not a coincidentally-equal local copy.
- **P17-lite (the module's export freeze)** → the Stage-0 verbatim-re-export check: the volume-dB + retime namespaces re-export the source leaves' values VERBATIM (identity over the imported references) + the module's export set is the declared lattice (additions require the same-commit list update).

### §D43.4 The acceptance pins (numbered)

**A. The one-home's own suite (OT, ~54 pins)**
1-6. **Per-domain literal + bounds** (×6 domains: volume-dB [−60,+20], retime-generic [0.01,5], `NATIVE_VENUE_SPEED` [0.1,16], `WSOLA_RATE` [1/32,32], `AUTHORING_SPEED` [0.1,4], `FIT_TO_FILL_RATE` [0.1,5]): min/max/default pinned as LITERALS; interior values accepted; below-min and above-max disposed per the domain's law (clamp for the authoring domains; refuse-never-clamp for the acceptance domain).
7-12. **The GRID per domain**: the OV-01 grid values each dispositioned (hand-tabled expectations); the dead-zone triple [0.01, 0.02, 1/32] exercised where it is interior to one domain and dead in another (the cross-domain boundary law).
13-18. **The hostile folds** (×6 domains): NaN / +Inf / −Inf / negative — the disposition pinned per domain (the never-poison law; a NaN rate must never reach WSOLA).
19-24. **Membership predicates**: `inDomain(x)` total over the grid incl. hostile (NaN ⇒ false everywhere — Object.is-safe).
25-30. **The dead-zone predicate's truth table** (6 rows over [0.001, 0.01, 0.015, 0.02, 0.03, 1/32] + hostile).
31-35. **`minDurationTicks(fps)`**: the fps grid's literals + the hostile fold + the monotonicity law (higher fps ⇒ ≥ ticks... as hand-derived literals, not a relation-copy).
36-38. **The Stage-0 verbatim-re-export check**: volume-dB values ≡ `core/audio-params`'s exports (reference identity or value equality over the full literal set); retime ≡ `ops/retime`'s; the export set = the declared lattice (freeze).
39-42. **The live-intersection property**: (39) `FIT_TO_FILL_RATE == [0.1, 5]` where the EXPECTED side is the test's own hand-computed intersection of the three LIVE imports; (40) the binding constraints identified (native min 0.1, wired max 5 — WSOLA slack both ends, asserted by the inputs themselves); (41) **the [0.1,4] trap guard**: the property does NOT read `AUTHORING_SPEED` — the mutation probe (swap the input set to include it) fails the recomputation (the trap's mechanical form); (42) **the narrows-refusal probe**: a fixture-narrowed `WSOLA_RATE'` changes the recomputed intersection ⇒ the pin REFUSES (fails loudly) rather than over-promising — the property that kills static text.
43. The refusal-never-clamp law: an out-of-domain fit rate REFUSES (`INVALID_PARAMS`, `constraint:{type:'domain'}` — the D44 crossover row), never clamps (a clamped fit silently violates exact-fill — 06:1671).

**B. The NATIVE_VENUE_SPEED fence (engine, ~4 pins)**
44-45. The deep-imported module's `NATIVE_VENUE_SPEED.min/.max` ≡ the engine's `MIN_SPEED`/`MAX_SPEED` literals (the WSOLA/ticks pattern, `bridge-seams.test.ts:2317-2331`).
46. The C1 clamp's output ≡ the leaf's clamp over the GRID (the drift fence's behavioral half).
47. The wiring proof: the engine's clamp site READS THROUGH the leaf (P20 — the fold, not a synced copy).

**C. The nle-ui twin (nle-ui + battery, ~3 pins)**
48. The local `editDomains.ts` literals == the one-home's published values for every shared domain (P6).
49. **The ⊂ pin**: the local set ⊆ the one-home's set — a strict superset member named and refused (the authoring domain stays a subset; the failure mode sentence is LAW: pin failure ⇒ align nle-ui to the one-home, NEVER edit the module — A-5).
50. The battery's live cross-repo ⊂ check green (§D43.6 — the unbypassable twin, parsed from both files).

**D. The consumer wiring spot-checks (OT + engine, ~3 pins)**
51-53. The flattener/ops/bridge consumers' outputs computed through the imported leaf (spot-check form; a regression that re-inlines a local copy trips the pin).

**Pin-count estimate: ~64** (54 OT-side + 4 engine-side + 3 nle-ui-side + 3 wiring) + the spec-side facet row.

### §D43.5 Phase + owner (the D24 ladder)

| Work | Phase | Owner |
|---|---|---|
| The module + its own suite + the Stage-0 verbatim-re-export check (ZERO behavior change — the Stage-0 exit form) | **r1 Stage 0** | **S-ot** |
| The C1/C4 clamp folds + the bridge-seams fence + the wiring proof | **r1 Stage 0→1** (the engine fold rides the port's entry) | **S-engine** |
| The local twin + the ⊂ pin | **r1 Stage 0→1** (nle-ui lands its file) | **S-package** |
| The ports consume from the module (the wiring spot-checks re-target) | **r1 Stage 1+** | **S-ot** |
| 17 §13A.7's facet row | **the R28 test-law fold, WITH battery_r28** | **S-spec** (S-spec(6)) |
| The battery check-2 widening (the spec-text half) + the ⊂ live check (**pre-r1: REGISTERED-SKIP** — the subjects `core/edit-domains.ts` + nle-ui's `editDomains.ts` are absent until Stage 0; the skip carries its expiry, mirroring the D42 fence's fail-safe-skip) | **W5/W6 — the skip registered; the LIVE check arms at the r1 Stage-0 exit** | **S-spec** |

### §D43.6 The battery_r28 check (the spec-text machine gate)

**Check `D43-test-law`** (three sub-assertions; the third is the LIVE class):

1. **The facet row** — 17 §13A.7 (the §13A span) contains a row matching `edit-domains|editDomains` **case-insensitively** (the row reads "Edit-domains one-home lattice" — the both-case form `[Ee]dit-domains|editDomains`, or `re.IGNORECASE`; per the §D42.6 header law ALL token regexes match normalized/case-insensitively) AND the five tokens: `NATIVE_VENUE_SPEED`, `FIT_TO_FILL_RATE`, the three-input intersection (regex `MIN_RETIME_RATE.*NATIVE_VENUE_SPEED.*WSOLA_RATE|three-way intersection`), the nle-ui ⊂ pin (`⊂|subset`), the Stage-0 verbatim check (`verbatim|re-export`).
2. **The cross-file [0.1,5] coherence** — the intersection arithmetic appears IDENTICALLY at 06 §5.9F (the `:1671`-area) AND 06 §11.7 AND 17's facet row: each site carries `[0.1, 5]` (or `[0.1,5]`) + the three input names; AND 06 §5.9F carries the exclusion sentence (`AUTHORING_SPEED` + `NOT` + `input|intersection` — the trap law); AND no site carries the trap form `[0.1, 4]` as the ACCEPTANCE domain (a live-stale scan for `\[0\.1, ?4\]` outside the AUTHORING_SPEED naming context — the R27 `live_stale` method reused).
3. **The LIVE import-edge check (the check-2 widening, A-3) — with its PRE-r1 REGISTERED-SKIP window** (the D42 fence's fail-safe-skip shape, so the two areas' checks share one disposition law — the asymmetry was the review's tell): the check's subjects (`core/edit-domains.ts`, nle-ui's `editDomains.ts`) do not exist until **r1 Stage 0** (both verified absent today), so pre-r1 the check files **REGISTERED-PENDING — the module absent — never a red battery on a missing file** (the skip names its reason AND its expiry, the r1 Stage-0 exit; never a silent green), and from the Stage-0 exit it runs live: in the cloned engine tree, the vendored deep path `core/edit-domains` is imported by the bridge/ fold sites + the folded `timeline-math.ts` site, AND no non-leaf OT import appears at those sites (still leaf-only) — the battery's existing repo-clone machinery (the `LIVE:` check class, battery_r27's T-block); PLUS the parsed-literal ⊂ arithmetic: nle-ui's local `editDomains.ts` literal set ⊆ the one-home's parsed literal set, the offender NAMED on failure.

---

## D44 — the two-tier error envelope

**The ruled law being tested:** the two-tier taxonomy on the flat `CommandResult {ok, code?, error?, data?}` (**15:3016** at the current fold — the two-tier taxonomy paragraph; :3002 at this design's commit, drifted by the T3 prereq sweep's +14 15-side insertions): the CLASS layer (closed enum `INVALID_PARAMS / NOT_FOUND / CONFLICT / NOOP / TRACK_LOCKED / INTERNAL_ERROR` + `NOT_IMPLEMENTED` at the app bus) — the abort-logic + chip key; the FINE layer (the 25-code registry: 24 + `RATE_OUT_OF_DOMAIN`) each tagged with exactly ONE class + constraint type (`'domain'` joins the constraint union at **15:3005** at the current fold — the design's original ":2911" was the PRE-W4 anchor inherited verbatim from ARCH-R28 §4.1 A-6, which drifted with the W4 insertions; ARCH:190 carries the same stale form and re-keys alongside this one). The emission law (fine when the §4.3 section declares one, else class). **The never-silent law** (**15:3028** at the current fold; :3014 at the design commit): a refusal returns `{ok:false, code}` — never a silent identity `ok:true`; NOOP is the compliant benign refusal (`ok:false`); the sanctioned `ok:true` non-mutations are the **benign-echo family** (A9 set-alls `data:{changed:false,…}`; zero-delta `retimeKeyframes` `data:{changed:false}`; D-T7 same-position `move` — zero history entry); no other `ok:true` non-mutation is spec-legal. **The 9 lockPreCheck riders** (A-7): ripple-trim→`TrimCommand{ripple}` on trim's existing gate; insert-edit/overwrite/append→the widened placement-target check; roll/slip/slide/rateStretch/retime/freezeFrame/rangeRemoval/replace→their own gates; ripple-overwrite/fit-to-fill→**inherited via `applyBatch`**. The enforcement triad: the wire dispatch arm (runtime) + the never-guard/tsc-lockstep (compile) + **17 §2.5's rule-8 error-path census (audit)**.

### §D44.1 The test surface

1. **OT in-page milestone family** — a NEW **`milestones-error-envelope.ts`**: the 25-row census table (P3 dynamic registration — one `it()` per code) + the benign-echo family + the rider triggers + the two-tier shape pins. The trigger rows fire through `HeadlessTimelineApi.apply` (P-OT-2 — the JSON wire, never-throws: malformed refs return `{ok:false, code}`, never a throw).
2. **OT compile-time surface (api.ts itself, not a test file)** — the tsc-lockstep extension: the fine→class map as a `as const` record + the type-level exhaustiveness asserts (every registry key has exactly one class; every class value ∈ the enum) — the P-OT-3 Layer-0 form (`_WireTypesCoverUnion`'s template); `bun run typecheck` is the gate, the declaration site is where a typo'd or retired code fails.
3. **OT real-mouse family** — the error-chip codes already have M57R pins (four codes real-mouse); the class-keyed chip family extends them as the class layer lands (the `data-test="wire-error"` chip + the class-based retry/abort classification).
4. **App-side** — the wire-error chip family (GluedShell/wire suites): the class taxonomy drives the chip + retry classification (the abort-logic consumer); `NOT_IMPLEMENTED` at the app bus (§4.1B's honest member).
5. **Spec-side fold (the CHEAPEST P1 — the mechanism exists, T1-d §5.1)** — 17 §2.5 rule-8 (:452-:470 at the landed v1.6; :450-454 at the design commit) + §13A.4.2's census row (:2317 landed; :2293 design-commit) + §13A.1's discipline row (:2287 landed; :2263 design-commit) re-keyed to the two-tier law; 05:25's GAP row re-keyed (~24-code → the LANDED 25-code two-tier envelope). The census re-key lands NOW; the riders' triggers ride the r1 ports.

### §D44.2 The fixture shapes (concrete)

- **The census table's rows** (the fixture is the ROW, not a scene): `{code, class, constraintType?, verb, condition}` — e.g. `{code:'TRACK_LOCKED', class:'TRACK_LOCKED', verb:'timeline.split', condition:'target track locked'}`; `{code:'SPLIT_INSIDE_TRANSITION', class:'INVALID_PARAMS', constraint:'transition', verb:'timeline.split', condition:'split frame inside a transition's consumed window'}`; `{code:'RATE_OUT_OF_DOMAIN', class:'INVALID_PARAMS', constraint:'domain', verb:'fit-to-fill composite', condition:'marked/target ratio ∉ [0.1,5]'}` … one row per code, 25 rows.
- **The locked-track rider fixture** — one clip on a locked track + the rider verb: `TRACK_LOCKED` BEFORE the op runs (the no-commit trio).
- **The applyBatch-inheritance fixture** — the ripple-overwrite composite (delete+move+insert) with ONE locked downstream member: the whole batch rejects `TRACK_LOCKED`; depth-anchored rollback; redo preserved (F1B-7's shape).
- **The benign-echo fixtures** — `setAllLocked` on an all-locked scene (`changed:false`, no entry); `retimeKeyframes{deltaTicks:0}`; `moveElements` to the same position (zero history entry — D-T7).
- **The NOOP fixture** — a trim whose delta is fully absorbed by the source-bounds clamp (state-dependent zero-clamp): `ok:false`, code `NOOP`, chip-benign.
- **The hostile fold fixture** — NaN/±Inf params through the wire: `SCHEMA_INVALID` (the zod arm) — the never-throws law's outermost fold (an internal exception → `INTERNAL_ERROR`, never a crash at the JSON caller).

### §D44.3 The oracle instantiation

- **P19 ERROR-ENVELOPE CONFORMANCE** (the area's primary pattern) → exact message shape per row (the op name IS the contract — `'[Timeline] <op>: track <id> is locked'`), error-class identity, constraint-type presence where declared.
- **P3 TABLE-LOOP** → the census table: 25 rows dynamically registered, each independently reported + counted by the runner; the assertion body uniform (code + class + constraint + the commit/no-commit clause).
- **P4 NO-COMMIT TRIO** → every refusal row: `data` reference unchanged + history depth unchanged + no phantom entry (P-OT-4: NOOP honesty — a TRUE noop creates NO entry; the zero-delta retime is BENIGN `ok:true` with NO entry — the two must never be conflated, which is exactly what the A-8 reclassification pins).
- **P-OT-3's LIVE-READ LAW (the M49C inheritance)** → **the table DERIVES from the live registry, not a mirrored copy**: the row set is generated from the exported code→class registry (or scraped from the wire module's export), so a new code fails the census until a trigger row is authored, and a retired code fails with the STALE name (the registry-reconciliation law's self-healing form — proven twice in OT's history). The direct array diff NAMES the drifted member (the app-scout's completeness law).
- **P-OT-11 (the never-silent family)** → the lock pre-checks emit `TRACK_LOCKED` BEFORE the op and before the stale-ref `NOT_FOUND` (api.ts:536-554's precedence) — "locked" is distinguishable from "missing".
- **P7 HOSTILE FOLD** → the NaN/±Inf wire params; the disposition (SCHEMA_INVALID) pinned as the outermost fold.
- **P-OT-2 (never-throws)** → the whole family asserts through the JSON boundary: no row may throw at the caller; internal exceptions map to `INTERNAL_ERROR`.

### §D44.4 The acceptance pins (numbered)

**A. The class-tag census (OT, ~26 pins)**
1-25. **One row per fine code** (25): fire the verb+condition that triggers the code; assert (i) `ok:false`, (ii) `error.code == <fine code>`, (iii) the class tag == the 15 §6.3 class-tag table's class for that code, (iv) `constraint.type` where the table declares one (`source` for TRIM_BEYOND_SOURCE; `transition` for SPLIT_INSIDE_TRANSITION; `domain` for RATE_OUT_OF_DOMAIN; `overlap`/`lock`/`compatibility` where declared), (v) the message carries the verb name, (vi) the no-commit trio. The A-6 restorations are load-bearing rows: `TRIM_BEYOND_SOURCE`→INVALID_PARAMS/`source`, `JOB_QUEUE_FULL`→CONFLICT, `PROJECT_DIRTY`→CONFLICT (the three the W1 mapping dropped — their rows prove the table, not the mapping's memory).
26. **The derivation pin**: the test's row set ≡ the live registry's code set (generated, never mirrored) — a direct diff that NAMES the drifted member; a new registry code fails the census until authored; a retired code fails stale.

**B. The never-silent law + the benign-echo family (OT, ~5 pins)**
27. **NOOP = the compliant benign refusal**: the absorbed-clamp trim → `ok:false` + code `NOOP` + no history entry + chip-benign (never lights the error surface's refusal styling).
28-30. **The benign-echo family, each member pinned `ok:true` with honest echo**: A9 `setAllLocked`/`setAllMuted` → `data:{changed:false,…}`; zero-delta `retimeKeyframes` → `data:{changed:false}` + NO entry (milestones-darch6.ts:508-513's landed form, re-keyed to the family); D-T7 same-position `moveElements` → zero history entry (the return asymmetry is load-bearing).
31. **The family is CLOSED**: the audit-side census (17 §2.5 rule-8's re-keyed form) — every `ok:true` non-mutation row in the wire test corpus is a member of the three-member family; any other is a spec bug (the audit's own instrument; the runner-side guard is the registry annotation).

**C. The 9 lockPreCheck riders (OT, ~12 pins)**
32-40. **One rider pin each** (9): roll / slip / slide / rateStretch / retime / freezeFrame / rangeRemoval / replace / the widened placement-target (insert-edit + overwrite + append share the widened check — one pin per verb at its own port): a locked target track → `TRACK_LOCKED` BEFORE the op; the no-commit trio; the message names the verb.
41-42. **The inherited-via-applyBatch chain** (2): the ripple-overwrite and fit-to-fill composites with a locked member → whole-batch `TRACK_LOCKED`, depth-anchored rollback, redo preserved (the D47.3 dependency registered: the batch carrier must propagate the lock gate to its members).
43. **The precedence pin**: a locked track + a stale ref → `TRACK_LOCKED`, never `NOT_FOUND` (locked is distinguishable from missing — the api.ts:536-554 law).

**D. The two-tier shape law (OT + app, ~4 pins)**
44. **The emission law**: a verb with a declared fine code emits the FINE code; a verb without emits its CLASS code — never worse than today's granularity (pinned by a pair of rows: one declared, one undeclared).
45. **The class enum is closed** (compile-time: the tsc-lockstep assert — a class value outside the enum fails `bun run typecheck` at the declaration site; the runner-side pin asserts the observed classes ⊆ the 7).
46. **The class is the abort-logic key**: `applyBatch` aborts on class membership (a NOOP-class member does NOT abort the batch; a CONFLICT-class member does) — the taxonomy is behavioral, not cosmetic.
47. **The consumer-side view reconciliation** (A-9): the flat payload on the wire + the out-of-band readouts (`stateChange`/`undoInfo`, 15:4911) — the spec's discriminated union is the consumer's view, never a second wire (the shape pin: one `code` field, the class derived).

**Pin-count estimate: ~47 runner pins + the compile-time lockstep asserts** (the tsc job counts, not the runner) + the spec-side re-keys (17's three sites + 05:25 — the cheapest P1: the mechanism exists, only the shape re-keys).

### §D44.5 Phase + owner (the D24 ladder)

| Work | Phase | Owner |
|---|---|---|
| The census re-key (17 §2.5 rule-8 + §13A.4.2 + §13A.1 + 05:25) — the audit mechanism exists; the shape re-keys NOW | **the R28 test-law fold** (with battery_r28) | **S-spec** (S-spec(6)) |
| The wire dispatch arm's post-classification + the tsc-lockstep map + the never-silent/benign-echo family + the census table (live-read form) | **r1 Stage 0** (the error-envelope refinement — "spec 15 §6.3 first" is already LANDED; the runtime arm lands with the mechanism wave) | **S-ot** |
| The trim-family riders (roll/slip/slide/rateStretch/retime — rateStretch rides WAVE 1) | **r1 Stage 1** | **S-ot** |
| The placement-target widening (insert-edit/overwrite) | **r1 Stage 2** | **S-ot** |
| The applyBatch-inherited riders (ripple-overwrite/fit-to-fill) + append's placement-target | **r1 Stage 3** | **S-ot** |
| freezeFrame/rangeRemoval/replace riders | **r1 Stage 4** | **S-ot** |
| The class-keyed chip/retry family + `NOT_IMPLEMENTED` at the bus | **the app consumption point** (post-Stage-0) | **S-app** |
| The battery check below | **W5/W6** | **S-spec** |

### §D44.6 The battery_r28 check (the spec-text machine gate)

**Check `D44-A6-class-tag-census`** (the registered battery class — T1-d §3.2 names it; three sub-assertions):

1. **The 25-code completeness (parse + set-equality)** — parse 15 §6.3's registry bullet list (the `'CODE'` strings in the `CommandError` doc block) → set R; parse the class-tag table's rows → set T; assert `R == T` and `|R| == 25`; assert each code appears in EXACTLY ONE class row (a code in two rows fails naming both); assert the three A-6 restorations (`TRIM_BEYOND_SOURCE` in the INVALID_PARAMS row, `JOB_QUEUE_FULL` + `PROJECT_DIRTY` in the CONFLICT row); assert `RATE_OUT_OF_DOMAIN` present in INVALID_PARAMS with the `domain` constraint note; assert the constraint-type union at **15:3005-area** (the post-T3 position; ":2911-area" was the pre-W4 anchor) contains `'domain'`.
2. **The two-tier re-key** — 17 §2.5 rule-8's span contains: `class` + `fine` + `25` + `NOOP` + the benign-echo family (regex `benign-echo|setAllLocked.*changed:false|echo`); §13A.4.2's census row re-keyed (no bare "78 union members" census without the class layer — the 78→80 re-key is D47's battery class, here only the error-path shape); §13A.1's discipline row cites the two-tier registry.
3. **The coherence sweep (05 ↔ 15 ↔ 17)** — 05:25's GAP row no longer carries the stale `~24-code` phrasing (a `live_stale`-style scan for `~24-code|24-code envelope` outside historical context — **scope ruling**: the scan's mandated target is 05:25; the sibling stale cells 06:43 + 15:22 carry the same figure and are the W5/W6 disposition's charge (re-key to the 25-code two-tier shape OR register as historical lineage) — the scan extends to them only after that disposition lands, else it flags three sites where one was mandated); 15 §6.3's never-silent paragraph (**:3028** at the current fold; :3014 at the design commit) names all three echo members (A9 set-alls / zero-delta retimeKeyframes / same-position move) — the same three the 17 re-key names (cross-file term matching); the 9 riders enumerated at the D44 ruling's sites appear in 17's census row or the facet row (the audit's trigger surface declared).

The LIVE counterpart (registered, fires at the port's acceptance — the self-healing form): once the OT registry export lands, the battery adds the repo-side twin of sub-assertion 1 (the exported map ≡ the spec table) — the same re-declaration law as the M49C census (D29-F8).

---

## §4 Cross-cutting laws (every family above carries these)

1. **The count discipline** — every suite-count pin is runner-derived (vitest list / the OT report json TOTAL); static grep undercounts by the loop-registered rows (665 vs 749 demonstrated). The OT count authority re-keys via the report TOTAL only (R4ii); the WRAP-gated register law (R16) owns the variants' counts — never a bare live count.
2. **The append-only suite tree** — OT's milestone files are history; the three new files (`milestones-linkage.ts`, `milestones-edit-domains.ts`, `milestones-error-envelope.ts`) ADD entries; none rewrite a prior milestone (the report's per-entry arithmetic re-declares at the next WRAP).
3. **The port-disposition law (P16)** — every carried engine pin files PORTED / NOT-PORTABLE / ALREADY-COVERED with counts at the bottom; the D42 reconciliation (rider 9) lands at the port's acceptance row.
4. **The gates-must-fail law** — every P8 regression pin is proven against its pre-fix form (the retired mock's sever, the spread-carry, the naive-composition trap, the W1 mapping's dropped codes).
5. **The false-green hardening** (P-OT-10) — the new milestone files inherit the runner's four named guards (report invalidation, zero-test FAIL, browser close on every exit, superseded-generation); a linkage milestone whose rows were silently emptied prints FAIL (0/0) and gates the exit code.
6. **The non-behavioral fence stack rides every landing** — tsc job · layer-fence snapshot (a new import edge moves the snapshot in the same commit WITH a rationale) · the API-freeze regeneration if a new family joins the engine barrel · the OV-12 re-pin gate for the vendored tree (the D42 fence's timing law).
7. **The r1-port acceptance protocol (T1-d §3.1)** — the five R28 additions (D42's pairwise re-key + D43's Stage-0 fence + D44's riders + the D46 probe + D47's bump migration) consolidate into **17 §13A.8 (the r1-port acceptance protocol) + ONE §13A.7 pointer row** (the T2-b genus ruling the landing followed — a recipe with an ordering law is not a matrix row); this document's three areas supply their halves of that protocol's content.

## §5 Honest limits

1. **The curated-table trap survives by design in D42** — the per-verb closure tables are hand-authored rows, not a derived census (the closure is not a verb surface); the compensations are the fuzz invariant sweep (I7 catches any future verb's forgotten prune) and the battery's spec-text coherence check. The residual: a NEW base verb with a closure bug is caught only by I7, not a named row.
2. **The one-way-pointer reading is a DESIGN CHOICE this law makes** (mutual-only derivation + the writer-side null-clears-both) — it is coherent with 06:409's "symmetric over the link relation" but the port's design note must state it; the MUTUAL-ONLY pin is the one listed (06:409's "symmetric" is the corpus's law); the one-way-as-link alternative is REJECTED, not pinned (the battery's coherence check does not adjudicate it).
3. **The D43 fence is dead code until the re-pin** — the vendored mirror predates the field; the fail-safe skip (named reason, never silent green) is the honest form, and the OV-12 gate runs the vendored suite on the re-pin that activates it.
4. **The D44 census's runner-side half is deferred to the port** — at W5/W6 the battery checks the SPEC TEXT only (the registry export lands with the Stage-0 arm); the LIVE counterpart is registered, not built — the same projection form as the 78→79→80 arithmetic.
5. **The app-side retirement pins depend on the app session's timing** — the field lands OT-side first; between the two, the app's sidecar and the OT field coexist (the registered migration window; the parity pin D-(iii) is the guard that the window never widens into a dual-home).
6. **No pixels, no gestures in the fast venues** — the linkage closure, the constants grids, and the error census are all pure-data laws; the real-mouse half rides the existing phases (the link gesture's origin-attributed dispatch; the error-chip codes) and adds no new pixel claims.
7. **The D43 WDC-narrowing catch chain** — a WDC narrowing is caught at the ABSORPTION BOUNDARY, never as a live cross-repo read (no cross-repo read exists at OT test time — OT's `WSOLA_RATE` literal does not move when WDC narrows): WDC's own suite fails → the absorption consciously edits OT's literal → the module recomputes → the test's hand-derived `[0.1,5]` literal FAILS → the three-site spec re-key (06:1671 + 06:2709 + 17's D43 facet row — the review-time 06 anchors; the same-wave RE-3 landing at 06 §5.9C :1624 shifts 06's below-:1624 anchors by +1 (:1671→:1672, :2709→:2710) — re-verify live) that check-2 then catches. What the live-intersection property catches DIRECTLY: the [0.1,4] input-substitution trap and any static-text hardcoding.
8. **The ⊂ pin's direction is one-way by design** — ⊂ catches nle-ui OVER-MINTING (a domain the one-home doesn't sanction — the offender is named and refused) but NOT nle-ui LAGGING (the one-home gains a member nle-ui hasn't absorbed; ⊂ still holds and pin 48's shared-domain equality doesn't fire). Feature lag is not a law violation; the direction choice is owned here.

---

## Verification log (for the register)

- All five inputs read in full at main (`980920b`-lineage worktree, read-only); every law-site cite in this file was re-read live: 06:407-440 (§5.0 + the fan-out table + E1/E1-c GAP rows), 06:1575-1603 (§5.9B + E2-a + OW-4), 06:1605-1683 (§5.9C-F), 06:1697 (F4), 09:343 (B1's D42 note), 15:950-979 (the patch key), 15:2940-3014 (§6.3 + the class-tag table + the never-silent law), 12:585-690 (§8), 17:446-461 (§2.5 rule-8), IMPLEMENTATION-PLAN.md:38-107 (the D24 ladder + the streams), ARCH-R28 §4/§4.1.
- Pin counts are DESIGN estimates (the runner-derived count law applies at landing; the battery never hardcodes them — the register is the authority).
- The battery checks are designed in battery_r27's `check(name, fn, tag)` idiom (scripts/battery_r27.py:25-30 read live); the LIVE-class machinery (repo clones) exists in r27's T-block and is reused by the D43 widening.
- No test code was written; no spec file was edited (read-only task; the law lands in 12/17 at the S-spec(6) fold).

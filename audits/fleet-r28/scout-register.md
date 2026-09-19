# scout-register — the R28 register re-key verification (Task R28-W0-d)

**Agent:** scout-register (register verifier, the R28 seal round) · **Date:** 2026-09-14 · **Repo HEAD read:** `0515c46` (R28 launch) — read-only, no commits, no corpus edits.
**Scope:** extract the battery's suite-count method, apply it live to both in-repo mocks, read the sibling's R25 WRAP artifacts, and produce the exact §2A.11 re-key values + the citation-site list for the W1 register editor.

---

## 1. The method (battery_r27.py — the ONE method, xcut-register §4c)

`scripts/battery_r27.py:299-309`, `_mock_it_census(mock)`:

```python
files = sorted(set(glob.glob(os.path.join(REPO, "ui-mock", mock, "src", "**", "*.test.*"), recursive=True)))
n = 0
for f in files:
    for line in open(f, encoding="utf-8"):
        s = line.strip()
        if s.startswith("it(") or s.startswith("it ("):
            n += 1
return files, n
```

- **Glob:** `ui-mock/<mock>/src/**/*.test.*` (recursive, deduped) — the test-file count = `len(files)`.
- **it-block:** a line whose **stripped** form starts with `it(` or `it (` (line-start method). `it.each(`/loop-wrapped/inline `it(` are NOT counted; prose "…it (…)" in comments is avoided by the line-start rule.
- The declared figures are parsed LIVE from the register pin text (`:317-318`): variants `` `ui-mock/shell-variants` **N it-blocks / N test files`` and mini `` `ui-mock/shell-mini` **N / N test files`` — the register is the authority (never a battery-side hardcode).
- Check `:324-342` (B-5/I): markers (`REGISTER-PENDING` + `WRAP` present in the register text) + **zero shrinkage** (live ≥ declared for both mocks, blocks and files).

## 2. The live scrape (this agent, the battery's method verbatim, @ `0515c46`)

| Mock | it-blocks (line-start) | test files | Notes |
|---|---|---|---|
| `ui-mock/shell-variants` | **1,939** | **68** | 68 files listed individually in the verification run |
| `ui-mock/shell-mini` | **495** | **12** | == declared 495/12 — **NO MOVEMENT** since the R24-2 W4-fix wrap re-key (`15ec32d`) ✓ |

**Stories (variants):** **126** — 11 `src/stories/*.stories.tsx` files; 123 `export const X: StoryObj` exports + 3 `PresetStory` exports (PresetA/B/C in `Variants.stories.tsx:31/34/37` — the `PresetStory` alias is why a bare `StoryObj` count reads 123). No story-typed exports outside `src/stories/`. **126 == the WRAP's declared public count.** (The on-disk VLM manifest `r23-analysis/vlm-r25/manifest.json` carries 124 entries — the pre-refresh sweep; the `9c32663` commit message's "127 stories" is the findings-sweep prose figure. The WRAP's declared figure is 126 and the source count confirms it.)

## 3. The declared figures (their R25 WRAP, `0c7bf01`, 2026-09-13)

- Wrap commit `0c7bf01` ("R25 WRAP: HANDOFF"): **19/19 reviewer threads resolved; exit gates PASS; "1950/1950, 126 stories"** — touches `.agents/HANDOFF.md` + `.agents/PLAN.md` only.
- `.agents/HANDOFF.md:10` (the wrap state): "Gates: tsc 0 · **1950/1950 tests (R24's 1740 → 1950, +210)** · build green · zero console.log · **public URL serves 126 stories** (SKILL #122 holds)." — `:22` repeats "1950/1950; 126 stories".
- `.agents/design/r25-audit-tracker.md` — fleet ledger: `:3` "baseline **1855/1855, 126 stories public** (post-W6)"; `:121-122` fix waves F1-F4 closed; `:125-131` **B5 exit-gate record: BOTH GATES PASS** (views 0-P1-0-P2 across all 10 fix-class probes; console 28/28 mount-clean + the interaction battery zero-error); round bar met (≤P3; residue X3/T5/T8 registered, all P3).
- Wave lineage (all verified in git): W1 `a83d4d2` / W2 `685edba` / W3 `b08b83a` / W5 `068b2af` / W6 `dd2c524` / F1 `6a0fdce` (+ F2-F4, X1), then `9c32663` (wrap artifacts: VLM corpus + shots + resolve-threads script, "GATES FINAL: tsc 0, 1950/1950… public URL serves 126 stories") → **`0c7bf01` the WRAP**.
- **The WRAP declares NO test-file count** — the file count for the pin comes from this live scrape: **68**.

## 4. Mismatch analysis — declared 1,950 (runner) vs scraped 1,939 (line-start)

The 11-test gap is **fully mechanical, zero shrinkage**:

| Source | Line-start counts | Runner counts |
|---|---|---|
| line-start `it(` lines | 1,939 | 1,939 |
| `it.each(REPLAY_CASES)('$name', …)` — `src/lib/insertPlan.test.ts:458` (7 cases, line starts `it.each(` — invisible to line-start) | 0 | **7** |
| `for (const [file, anchor] of AA5_SITES) { it(…)` — `src/styles/appLayers.test.ts:131-132` (5 sites, 1 line-start `it(`) | 1 | **5** |
| **Total** | **1,939** | **1,939 + 7 + 4 = 1,950** ✓ |

1,939 + 7 + 4 = **1,950 exactly** — the WRAP's declared runner count reconciles perfectly with the battery's line-start method. (The 3 bare `test(` hits are comment prose; the only other line-start-it-inside-a-loop in the tree is the AA5_SITES one.) Conclusion: **declared ≠ scraped by unit, not by substance** — the runner count and the line-start count measure the same suites through different collectors; both are recorded at WRAP per the 35.2-rider law.

**Battery consequence (critical for the W1 editor):** B-5/I enforces `live_line_start ≥ pin_headline`. If the pin headline reads "1,950 it-blocks", the check FAILS (1,939 < 1,950). **The pin headline must carry the scraped pair (1,939/68); the declared runner pair (1,950 + 126 stories) is recorded in the pin's parenthetical.** The B-5/I marker check keeps passing: the term REGISTER-PENDING remains in the rider law text (`:9`) and the pin's WRAP note carries "WRAP".

## 5. The re-key values (paste-ready)

**The variants pin (REFERENCE-REGISTER.md:14, replace the `ui-mock/shell-variants` half):**

> `ui-mock/shell-variants` **1,939 it-blocks / 68 test files REGISTERED** (the **R28 WRAP re-key** — the sibling's R25 round WRAPPED 2026-09-13 @ `0c7bf01`: 19/19 threads resolved, exit gates PASS (0 P1/0 P2; console 28/28 clean), tsc 0, build green; **the WRAP's declared figures: 1,950/1,950 tests (the runner count — the battery's line-start method reads 1,939; the 11-test gap = the `it.each(REPLAY_CASES)` 7-case fan-out @ insertPlan.test.ts:458 + the 4 extra loop iterations of the AA5_SITES-registered it @ appLayers.test.ts:131; 1,939+7+4=1,950 exactly) + 126 stories** (live source count: 11 .stories.tsx files, 123 StoryObj + 3 PresetStory exports — the declared public count confirmed; the R24-era 124 and the mid-flight reads 1,773/1,796/1,874 superseded; the canon "1521+" already retired at the R27 edit))

**The mini pin (unchanged — this round's verification only):**

> `ui-mock/shell-mini` **495 / 12 test files — IN FLIGHT, sibling-maintained live-current** (live scrape 495/12 at the R28 read — **no movement**; census 163 units / 150 GAP / 462 authored per LAW-NET-INVENTORY §2.3)

**The rider edit (REFERENCE-REGISTER.md:9):** retire the variants mid-flight marker sentence — "Current mid-flight markers: variants REGISTER-PENDING (…the declared figure stands at 1,762/64)" becomes the WRAP record: "variants **WRAPPED @ `0c7bf01`** (R25, 2026-09-13 — re-keyed R28: declared 1,950 runner / 126 stories; scraped 1,939/68 battery-method, both recorded per the rider); mini **IN FLIGHT** (495/12; retirement is post-K4/w1)".

**Per-family spot-check (bonus, for the row re-derivation):** battery PINS vs live — insertPlan 30=30 · SourceEditBar 17→**18** · SourceRangeBar 18→**20** · TimelineCompact 28→**31** · FxBrowser 12=12 · FxInspector 14=14 · MixerDock 35→**45** · AppShell 72→**78** (5 of 8 drifted; B-5/O is drift-tolerant — "recorded, WRAP-gated" — so no battery failure, but the register's 21 row-level test-pin counts are R25-census reads and should be re-derived in the same W1 edit per 35.2).

## 6. The citation-site list

### 6a. LIVE law — must re-key (20 file:line sites)

| # | Site | What's there |
|---|---|---|
| 1 | `REFERENCE-REGISTER.md:9` | the 35.2-rider: "variants REGISTER-PENDING … the declared figure stands at 1,762/64" |
| 2 | `REFERENCE-REGISTER.md:14` | **the pin line** — 1,762/64 REGISTERED + REGISTER-PENDING + the recorded 1,874/67 W6-C read |
| 3 | `REFERENCE-REGISTER.md:100` | §O' battery-enforcement summary: "the variants pin carries the declared figure + the REGISTER-PENDING marker" |
| 4 | `00-master-spec.md:3` | status header: "the in-repo mocks REGISTER-PENDING (the WRAP-gated re-key law, §2A.11)" |
| 5 | `00-master-spec.md:19` | fleet-table variants row: "@ 1521+ tests (live; the register re-derived 1,796 it-blocks / 64 test files at the 2026-09-13 re-read over the R25 census's 1,588 …)" |
| 6 | `17-test-plan.md:4` | status: "variants 1,733/64 at the R24-wrap `3db130f`, higher and moving (REGISTER-PENDING…)" (+ stale mini 441) |
| 7 | `17-test-plan.md:20` | BASE line: "variants 1,733/64 at the R24-wrap, higher and moving (64 test files; …)" |
| 8 | `12-testing-strategy.md:14` | "**shell-variants 1,796 registered / 64 test files** (live 1,796 … in flight, re-keys at the sibling's WRAP; supersedes 61 files / 1,521+)" |
| 9 | `16-keyboard-shortcuts.md:4` | pin line: "mini 428→441 in flight, variants 1,762 in flight" |
| 10 | `16-keyboard-shortcuts.md:2398` | "the variants' useShortcuts/shortcutMap tests (1,762 registered, live higher — in flight)" |
| 11 | `19-code-references.md:5` | "variants **register 1,762/64, live 1,773** … re-keys at WRAP only" (+ stale mini 428/10) |
| 12 | `19-code-references.md:13` | "variants 1,762 register / 1,773 live (the R25 waves in flight…)" |
| 13 | `19-code-references.md:32` | "the register reading 1,762 it-blocks / 64 files … live 1,773 at the R27 audit" |
| 14 | `19-code-references.md:52` | "the register reading 1,762 it-blocks / 64 files (re-derived at the R24-2 W2 re-pin) … live count 1,773" |
| 15 | `19-code-references.md:244` | "the register reading is **1,762 it-blocks / 64 files** … live count **1,773**" |
| 16 | `19-code-references.md:367` | "shell-variants register 1,762/64 (live 1,773 …); shell-mini in flight 428/10" |
| 17 | `19-code-references.md:440` | "the variants' README count ('33 files / 510 tests' — the R15 text) remains behind the 1,762-register current state" |
| 18 | `IMPLEMENTATION-PLAN.md:25` | "variants the register-declared 1,762/64 + REGISTER-PENDING; mini 495 in-flight" |
| 19 | `IMPLEMENTATION-PLAN.md:26` | "variants R25 in flight past the register-declared 1,762/64" |
| 20 | `IMPLEMENTATION-PLAN.md:34` | "variants **in flight** (the register-declared 1,762/64 + **REGISTER-PENDING** …)" |

Adjacent staleness the same edit should sweep (mini figures behind the 495/12 pin): `17-test-plan.md:4` (mini 441), `16-keyboard-shortcuts.md:4` ("mini 428→441"), `19-code-references.md:5/:13/:367` (mini 428/10), and the conflicting 1,796/64 lineage at `00-master-spec.md:19` + `12-testing-strategy.md:14` (vs the register's 1,762) — unify all at the WRAP figures. `00-master-spec.md:503` (§2A.11 law text, marker mechanism, no figures) is law to RETAIN, not re-key.

### 6b. Historical audit records — STAY (do not amend)

- `audits/ARCH-R27-final-tightness-audit.md:32, :38` — the R24-wrap census record (64 files / 1,734 it-blocks / 1,740 green / **124 stories**).
- `audits/ARCH-R28-seal-round.md:26, :80` — this round's own charter (already records the re-key as DUE; audits never amend).
- `audits/fleet-r27/` (the R27 fleet's own reads, ~50 sites): BRIEFING:12 · amend-B2:28 · mock-insert:4 · mock-variants:5/59/98 · mock-verdicts:45/92/96/100/103/115 · review-plan:58 · spec-00:20/85 · spec-03:46 · spec-04:79 · spec-05:5 · spec-07:17/88 · spec-08:122 · spec-12-13:4/17/66/68/86/108 · spec-16:5/14/18/65 · spec-17:6/14/16/21/23/57/70/82/123 · spec-18:137 · spec-19:15/29/111/141/171 · xcut-amend:23/232/354/376 · xcut-plan:5/41/54/143/152 · xcut-register:14/121/122.
- "124 stories" appears ONLY in these audit records + the sibling's round-plan docs — **no live-law site pins 124**; it retires at the re-key only as history.

### 6c. False positives (no action)

- `03-playback-engine.md:378` — "1734" is `media-sink.ts:1734` (a code line anchor, not the 1,734 pin).
- `INTEGRATION-REAUDIT.md:60` — "1950" is "lines 1950-1968" (a spec-09 line range).
- `audits/SCOUT-R8-A-opencut-timeline.md:169` — "1874" is a line number.

### 6d. Sibling-maintained artifacts (in-repo, not spec law — the fleet does not edit)

- `.agents/HANDOFF.md:10, :22` — the WRAP declaration itself (1950/1950 + 126 stories; the source of the declared figures).
- `.agents/PLAN.md:16, :19` (124 stories — R24-era), `:390` (126) · `.agents/design/r25-audit-tracker.md:3, :129` · `.agents/design/r25-reaction-round.md:15, :164`.
- `ui-mock/shell-variants/README.md` — the "33 files / 510 tests" R15-era text, already flagged behind at 19-code-references:440 (the sibling folds it into their next mock commit).

## 7. Next actions

1. **W1 register editor** lands the re-key at the 20 live sites (§6a) with the §5 paste-ready values; retire the variants REGISTER-PENDING marker; keep the mini pin at 495/12 IN FLIGHT.
2. **Pin-headline rule:** the battery-method pair (1,939/68) is the headline; the runner pair (1,950 + 126 stories) is the recorded WRAP declaration — never the reverse (B-5/I no-shrinkage).
3. Re-derive the register's 21 row-level test-pin counts in the same edit (35.2; the §5 per-family table shows 5 of 8 spot-checks drifted).
4. `battery_r28` follow-ups: the dead constants at `battery_r27.py:310-311` (`MINI_DECLARED/VAR_DECLARED` — 1796/65 contradicts the register's own 1,762/64; unused except the MINI fallback at `:364`) should be dropped or re-keyed at the next battery fork; the B-5/I check itself needs no change (it reads the register live).
5. The mini movement watch continues (retirement post-K4/w1); re-verify 495/12 at the next round.

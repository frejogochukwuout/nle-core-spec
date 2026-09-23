# R27-W4 — the register + signoff maintenance (xcut-register)

**Task ID:** R27-W4-REGISTER · **Agent:** xcut-register · **Round:** R27 final-tightness, Wave 4 (cross-cuts) · **Date:** 2026-09-13
**Scope:** REFERENCE-REGISTER.md's paste-ready update (the 19 rows' pins + descriptions vs the live mock trees; the 2 NEW rows; the C59+ intake; the in-flight re-key rule) + the C-ledger discipline check (D35.3) + FINAL-SIGNOFF/TESTABILITY-SIGNOFF state + the battery_r27 register-class draft (D35.2) + the retirement triggers (D35.4/D26.4). Report-only: no corpus/mock file touched outside this report + the worklog; no commits; stayed on main.

**Ground truth (re-derived live this session, ⭐):** variants **65 test files / 1,796 it-blocks** (line-start ⭐; register declares 1,773/64; mid-flight — the sibling's R25 **W1 `a83d4d2` 12:17 / W2 `685edba` 12:38 / W3 `b08b83a` 13:25 landed TODAY**, W4/W5/W6 + their fleet pending); mini **10 files / 445 it-blocks / census 150 units · 137 GAP · 412 authored** (⭐ — the register's 445 pin is LIVE-CURRENT; the sibling's R24-2 W5 `64d8682` 13:27 re-keyed it; W4 absent from the log); the per-family it-counts below all re-derived by the battery's own line-start method (stripped line startswith `it(`). The mocks have **no `.agents/` of their own** — the C-ledger is the spec repo's `.agents/SPEC-REVISION-CANDIDATES.md` (ends at **C58**, verified).

---

## §1 The paste-ready REFERENCE-REGISTER.md update

### 1.0 The header suite-count pin (line 13) — full replacement

> **The suite-count pins (the battery's freshness baseline — R27):** `ui-mock/shell-variants` **1,773 it-blocks / 64 test files REGISTERED** (the sibling's own W3-census re-key, `285eca5`; **mid-flight: the R25 waves W1-W3 landed 2026-09-13 — live scrape reads 1,796/65 at this round's read, RECORDED NOT CHASED; re-key ONLY at the sibling's round-WRAP, recording BOTH the declared AND the scraped figures — the census-method divergence (~1, their wrap-method vs our line-start) is registered; the canon "1521+" retires at the same edit**) · `ui-mock/shell-mini` **445 / 10 test files — LIVE-CURRENT** (sibling-maintained: their R24-2 wave commits re-key this pin + 12/17's rows per-wave — W0-W3 + W5 landed 2026-09-13, 357→377→396→415→428→441→445; census 150 units / 137 GAP / 412 authored; W4 pending). A drift in the mini pin vs live, or a WRAP-declared variants figure left un-re-keyed for more than one round, = a battery failure; a mid-flight variants drift WITHOUT the REGISTER-PENDING marker = a battery failure.

### 1.1 The row edits — count refreshes (battery-method, live ⭐; "census" = the R25-seeded cell)

| Row | Cell today | Live (this read) | Note |
|---|---|---|---|
| 1 | 31 (insertPlan) | **30** line-start (31 by loose-rg — one `split('` false positive at insertPlan.test.ts:490) | the register's cell was censused by the loose method; the battery's line-start method reads 30 — **pin the battery method** (see §4c) |
| 2 | 15 + 56 | **17** SourceEditBar + **63** useShortcuts | W1's transport pins (the census's 16+59 was pre-W1) |
| 3 | 8 | **18** SourceRangeBar | W1's scrub-strip merge landed (mock-verdicts V5) |
| 4 | 24 | **28** TimelineCompact | holds vs mock-variants' read |
| 5 | 9 | **9** MarkerInspector | HOLDS |
| 6 | 9 | **9** CaptionInspector | HOLDS |
| 7 | 5 + 12 | **12** FxBrowser + **14** FxInspector (= **26**) | the W3 DnD routing pins |
| 8 | 4 | **6** AppDock | the audio-toggle + fxMode coupling rows grew |
| 9 | 11 + 56 | **12** CheatSheet + **63** useShortcuts | |
| 16 | — (not re-swept) | **ColorPage 45 · ScopesDock 22 · StillsPanel 19 · ColorInspector 16 · GradedViewerCanvas 15 · WheelsPanel 16 · ConsoleTabs 5 · controls 6 · mockGrades 21 · lib/color 167** (colorSpace 31 / gradeMath 56 / gradedImage 26 / qualifierMath 28 / scopesMath 20 / index 6) | the W3 color wave moved ColorInspector 10→16 + WheelsPanel 6→16 + ColorPage 43→45 + ConsoleTabs NEW |
| 17 | 20 | **24** DeliverPage + **10** deliverViewStore | the new module `src/state/deliverViewStore.ts` |
| 18 | 445 (149 units) | **445 (10 files; census 150 units / 137 GAP / 412 authored)** | the number holds; the census decomposition re-keys (149→150 units, 136→137 GAP, 408→412 authored — W3+W5) |

### 1.2 The description rewrites (paste-ready row replacements)

**Row 2 (Source-preview chrome)** — append to the mock-home cell: *"+ the W5b one-row law (h-8, no wrap, overflow-x-auto, 24px hit floor — superseded in-round by W1's priority ladder: the edit bar is the transport row's PRIORITY consumer, the readout/trim degrade first, all 7 buttons visible at every width ≥ the shell's min; a horizontal-scroll bar is a defect, r25:114-119) + the R25-A1 contract LANDED as their W1 (`a83d4d2`: stills get the full transport with 5s pseudo-duration; the SourceRangeBar merges into a real scrub strip — playhead + I/O bracket flags + strip dimming; play stops at out; JKL join the program grammar)"*. Pins: **17 + 63**. Owning-spec cell gains: *"18 §4.3's W6 amendments (V1-V6) absorb the stills-transport + strip-flags + priority-ladder laws — REGISTERED, this round's amendment wave"*.

**Row 3 (Source in/out marks)** — rewrite the family description: *"**Source in/out marks** — the source scrub strip (the W1 merge: playhead + per-media I/O bracket flags + out-of-range dimming ON THE STRIP, never the poster; the duration readout switches to the [in,out] range; stills load at a 5s pseudo-duration — the honest static band clause is DEAD, V1) + the B7/B8 gesture laws (pointercancel/lostpointercapture, aria-orientation, Home/End on either handle, absolute drag)"*. Mock home unchanged; pins **18**.

**Row 4 (Deliver RangeBand)** — rewrite the family description (mock-variants §3 item 3, the P1): *"**Deliver RangeBand + the coexistence law** — the 22px read-only ruler UNCONDITIONAL in TimelineCompact's head stack + the 32px band BELOW it on the deliver branch (54px total; the ruler's read-only in/out bracket FLAGS `shell-timeline-compact-flag-in/out`); the loop-seam three-writer law (ruling-21 drag, R14 ordering, [0,duration] clamp) with the SPLIT semantics: MOUSE preview clamps against the opposite LIVE edge (release commits exactly the preview); KEYBOARD keeps the R14 drag-along verbatim"* — replaces "in place of the compact ruler's head row". Pins **28**.

**Row 7 (FX page)** — pins → **26** (FxBrowser 12 + FxInspector 14); the density note re-keys to the popover (row 21); grow the MOCK-IS-REFERENCE cell: *"+ the R24-A1 DnD routing canon: replace-never-stack (a presentation swap retains duration+alignment; identical short-circuits with the 'Already X' toast), one law three doors (clip body / SeamZone / occupied TransitionBox), effect rows stack w/ ×N toast, empty-lane PURE no-op, adjacency refusal (SEAM_EPSILON 1ms), occupied-seam ⇄ surface (14→24px drop floor), dbl-click apply"* (the W6 18 §4.11a absorption is the spec-side home).

**Row 15 (Transport)** — append: *"+ the source-mode half LANDED mock-side (W1: J/K/L drive the source playhead; play stops at out) — 18 §4.3's W6 amendment (V4) registers it spec-side"*.

**Row 16 (Color surfaces)** — full rewrite of the census description: *"**Color surfaces** (the W2+W3 composition: the color console row = thin TAB strip [Timeline | Nodes | Scopes] with the Toolbar2 buttons activating their tabs — `ConsoleTabs.tsx` NEW, the under-viewer pane RETIRED, region [2] ALWAYS viewer-led; scopes react to the PLAYHEAD FRAME (always-on, never selection); Gallery in the left dock (apply = REPLACE not merge, one setGrade patch); the YRGB curves rebuild (CurveSet {y,r,g,b}, y∘ch composition, ~64-bin histogram behind the grid); the wheels per R25-A3 (relative/accumulating drags, live preview + live YRGB readouts, master = horizontal dial + Ctrl/Cmd+drag, Shift = absolute jump, dbl-click = color-only reset, corner button = full reset, one undo per gesture); the 3-chip target breadcrumb [clip · track] ▸ [Clip grade | Timeline grade] ▸ [Node n]; the timeline-grade copy 'applies to every clip in this timeline, after clip grades')"* + the pins block (§1.1 row 16) + the OPEN pointer: *"the A3 YRGB-editable-vs-08 §16.A model question = the OPEN table's 5th row"*. Citation stays **DESIGN-REFERENCE**; the R25-A2/A3 registrations are now **LANDED-MOCK** (`b08b83a`) — 08's W6 amendments F1/F8/F9 are the spec-side absorption.

**Row 17 (Deliver page)** — pins → **24 + 10**; append: *"+ the deliverViewStore laws (module zustand: jobs/showQueue single-writer, the store-owned 4×500ms mock render timer, unmount-survival); the W5 halves registered mock-only (the export-summary → console-row panel = placement detail; the custom JSON preset = DECLINE-class absent a 10/11 export-target ask, V18)"*.

**Row 18 (mini)** — pins cell: *"**445** (10 test files — sibling-maintained, live-current; LAW-NET-INVENTORY: 150 units / 445 tests / 137 GAP / 412 authored — K3's acceptance list; the R24-2 rework's W0-W3+W5 landed, W4 pending)"*.

### 1.3 The two NEW rows (paste-ready; appended as 20/21 — zero renumbering churn, the battery's row-count check moves 19→21; mock-variants' "mixer after row 15" placement is the alternative IF the amendment wave renumbers in the same edit)

> | 20 | **Mixer family** — the audio-page mixer dock (binary toggle w/ lastVisual memory, the <280px pure-render floor, strip tiers T0-T2, aux-returns BOTH buses a1+a2, the de-esser Freq log-domain slider (√(2k·9k)≈4.24kHz midpoint), stripFocus clearing on scene switch, SoundLibrary) · **MOCK-ONLY** (18 §8.8 dropped the mixer panels under the 3-page ruling — the registered 3-vs-5 OPEN decision's audio half) | variants: `src/components/mixer/{MixerDock,ChannelEditor,ChannelStrip,MixerPrimitives,StripGraphs,SoundLibrary}.tsx` · store: `src/state/mockMixer.ts` (the module sidecar — never on ElementJSON, C50's precedent) | **MixerDock 35 + ChannelEditor 27 + ChannelStrip 42 + MixerPrimitives 49 + SoundLibrary 11 + mockMixer 15** (live ⭐) | 20 (§7's M2 design round — r2-pending) | EXECUTABLE-WITNESS + PROPOSAL (the M2 queue) | MOCK-YIELDS-REGISTERED (rides row 8's 3-vs-5 OPEN decision; 20's M2-remainder owns the real mixer surface at r2; C40's strip-chrome queue grows the element-visibility toggles, V17) |
> | 21 | **Timeline view-state / ViewOptionsPopover** — the APG popover (Compact-tracks menuitemcheckbox DOM-ABSENT on fx, Clip style Filmstrip\|Block menuitemradio, Audio waveforms menuitemcheckbox w/ honest aria-disabled + reason while compact) + `setAllTrackWaveforms` (ONE withHistory write converges every audio track's flag — a converged no-change mints nothing) + the per-track flag→Clip-body render gate (flag false = no waveform band; thumbnail + name stay) · **MOCK-ONLY** (C57's B3 height-home seam) | variants: `src/components/timeline/ViewOptionsPopover.tsx` (+ TimelineToolbar's hamburger) · store: `useUiStore.ts` (the resolver + per-track flags + the batch :775/:1634) | **TimelineToolbar 39 + AppShell 72 (incl. the 7 density describes re-pointed W1) + TimelineCompact 28** (live ⭐) | 18 §4.5/§4.7 (the view-options contract) + 05 §7.2/§12.2 (the render gate + the height home) | PROPOSAL (C57's B3 height-home rides; the popover contract is a W6 absorption item) | MOCK-IS-REFERENCE |

### 1.4 The OPEN decisions table — +1 row

> | **A3 wheels: 4 live EDITABLE YRGB fields vs 08 §16.A's verified (hue, amount)+scalar 28-f32 uniform** (r25:210-212; spec-08's F2) | row 16 (+ row 21 adjacent) | **QUEUED-design-round** — the model must rule BEFORE r3 parity fixtures + the sibling's W3-port: (a) NARROW (derived read-only), (b) WIDEN-via-projection (recommended — Y writes the scalar, R/G/B solve (hue,amount) via the luma-neutral derivation; zero shader change), (c) true param widening (a §4.2 breaking change); owner S-spec 08 |

### 1.5 The C-ledger riders (cell appends, no new C-rows — see §2)

- **C40**: append *"+ the R13 element-visibility toggles (FX sends/pan/meter strips) — V17"*.
- **C44**: append *"+ the refresh law rides V19's 18 §4.4 amendment (W6): on any view/editor-mode transition the inspector re-resolves its target; unresolvable = the empty state, never stale data"*.
- **C57**: append *"+ the R3 per-page view-state memory + the R5 per-kind compact (compact-video / compact-audio / compact-all) — the W6 view-state row 21's design round carries them"*.

### 1.6 The in-flight re-key rule (the standing marker, paste into the register's law block 35.2)

> *35.2-rider — the WRAP-gated re-key (the R27 coordination law, mock-verdicts §3.2): the sibling's R24-2 (mini) + R25 (variants) waves land continuously; **per-wave movements are RECORDED, never chased**; the register re-keys a suite-count pin ONLY at the sibling's round-WRAP declaration, recording both the declared and the scraped figure; rows touched by in-flight waves carry a **REGISTER-PENDING** marker and NEVER a premature LANDED flip (the flip is the D26.4 retirement key). Current mid-flight markers: variants W1-W3 LANDED (a83d4d2/685edba/b08b83a, 2026-09-13), W4-W6 + their fleet pending; mini R24-2 W0-W3+W5 LANDED (445), W4 pending.*

---

## §2 The C-ledger intake state (D35.3) — the discipline check

- **Zero new C-rows since C58.** The ledger (`.agents/SPEC-REVISION-CANDIDATES.md`, 483 L — the mocks have no `.agents/` of their own; the spec repo's is THE ledger) ends at C58; greps for C59/C60/C61+ find no ledger rows. **Intake: 26 rows — 3 ADOPTED · 8 LANDED · 12 QUEUED-with-owner · 2 DECLINED · 1 SUPERSEDED — zero untracked. The discipline HOLDS.**
- **The C59 dangle (spec-08's finding):** 08:16 + the variants' README:222 cite "gap C59" — which lives in the **mock's own README deviation ledger**, NOT this register's C-ledger. Fix: the register's ledger section gains one footnote — *"C59+ (the mock's own README deviation-ledger family — e.g. C59 the .drx/PowerGrade render-round boundary + the clip-level-stills gap) are MOCK-side gap labels, not C-ledger rows; corpus citations must name the ledger they mean"* — and 08:16's W-B edit (spec-08 F8) carries the same one-liner.
- **The aging audit (the XMOCK-9 law — zero un-tagged rows older than two rounds — passes; the honest-aging note):** every row is tagged. The oldest QUEUED items are C33/C34 (R19-era, **eight rounds queued** — both are OPEN-table design rounds with named owners, so compliant, but the fleet should either schedule their rounds or re-verify the asks at the next register pass); C38 (18 §4.1 fullscreen clause — still in-tree at 18:137 per the R25 verify) + C39 (the widened source-preview trigger list) + C44 are R25-verified QUEUEDs whose owning edits are now W6-amendment candidates — fold C39 into 18 §4.3's V-row edit and C44 into V19's refresh-law row this round.
- **The A2 supersession registered forward (the task's named item):** the R25-A2 "console-row TAB retires the under-viewer pane" verdict supersedes R24-W2's placement EXACTLY as C53 superseded C43 — register the lineage on row 16's cell (§1.2): *R23 W-B (console row beside MixerDock) → R24-A2 (under-viewer pane, `0196c22`) → **R25-A2 (the TAB strip, LANDED `b08b83a` — the pane never lands in a spec)***, so the row cannot go stale twice.

---

## §3 The signoff state + the re-stamp language

**What they promise.** FINAL-SIGNOFF.md (2026-08-22, the R7 era): "✅ COMPLETE — All 12 streams refined, audited, revised, and integrated… **SPEC SET IS COMPLETE, CONSISTENT, AND IMPLEMENTATION-READY**", with an honest caveat tail (2 CANNOT-VERIFY items, the deferred list). TESTABILITY-SIGNOFF.md (same date): "✅ TESTABILITY REFINEMENT COMPLETE… ready for implementation with testability baked in", caveats: exportFCPXML absent from spec 15's 73 types (gated), 6 minor, the 2 CANNOT-VERIFYs.

**The current state vs the promise.** Both are ~20 rounds stale (R7 → R27) and now **overclaim by omission**: the corpus grew 12 → 21 numbered specs + REFERENCE-REGISTER + IMPLEMENTATION-PLAN; D8-D37 landed (the D12 venue model, D22b engine-wins, D26 census, D29/D30-D36 wire/modes/register); the acceptance contract moved from "implementation-ready" to the plan's **K-tier ladder** — K1 LANDED (module nets green at the R27 pins: 748/632/777/690/252), **K2-K4 + w1-r6 all pending**; the register carries **5 OPEN decisions**; the R27 fleet filed P1 fix-lists in all 20 specs (the W6 amendment wave exists because of them — the corpus was NOT final at R25/R26, and is not final now); battery_r26 runs 135/141. The one still-open R7-era caveat: spec 10's audit confirms `importFCPXML` remains undefined (the exportFCPXML wire-verb ask survives). The signoffs are honest about their own process but are the ONLY corpus docs still claiming finality — the re-stamp makes the supersession visible without rewriting history.

**The re-stamp language (paste-ready banner, top of each file):**

> **[2026-09-13 — the R27 re-stamp note.]** This signoff certifies the **R7 refinement process** (2026-08-22) — the scout→audit→revise cycles it describes completed, and its verdicts stand **as of that date**. It is **not the corpus's current seal**: the spec set has since grown to 21 numbered specs + `REFERENCE-REGISTER.md` + `IMPLEMENTATION-PLAN.md` (Decisions D8-D37; the fleet rounds R8-R27 at `audits/`), and the operative acceptance contract is the plan's **K-tier ladder** (K1 LANDED — the module nets green at the R27 pins; K2-K4 + w1-r6 pending), enforced by the per-round battery (`scripts/battery_r2N.py`). The R27 final-tightness fleet's per-spec P1 fix-lists (`audits/fleet-r27/spec-*.md`) are pre-implementation corrections this signoff could not see; the mock-surface OPEN decisions live in the register's table. **The re-stamp (the corpus-final seal) lands after: the R27 amendment wave (W6) + battery_r27 green + the register's OPEN decisions ruled + K4's crawl exit.** Until then: implementation-ready **in architecture**, not yet sealed.

TESTABILITY-SIGNOFF additionally needs two stale-number riders on the banner: its "73 EngineCommand types" and "~180 keyboard bindings" figures are R7-era (the live wire census is 31 verbs = 28 routed + 3 exceptions per D-ARCH-6; the 10-mode matrix is D30's growth) — point at 15 §4.1A/§13.15 + 16 §0 as the current count authorities.

---

## §4 The battery_r27 register-class draft (D35.2 — pseudo-code; the r26 §O class re-keyed)

```python
# === O'. THE REFERENCE REGISTER (D35; ARCH-R25 §7 class 2 — the R27 re-key) ======
REG = read("REFERENCE-REGISTER.md")
rows = [l for l in REG.splitlines() if re.match(r"\| \d+ \|", l)]
check("register exists + the 21-family census (19 + mixer + view-state)", len(rows) == 21, f"{len(rows)} rows")
check("C-ledger C33-C58 all dispositioned + zero untracked + the C59 mock-ledger footnote",
      all(f"| C{n} |" in REG for n in range(33, 59)) and "Zero untracked" in REG
      and "MOCK-side gap labels" in REG)
check("OPEN table: 5 rows (marker v2 / captions / 3-vs-5 pages / FX grammar / A3-wheels model)",
      REG.count("| **") >= 5 and "WIDEN-via-projection" in REG)

def scrape(mock):   # the battery's ONE method: line-start it( on stripped lines
    files = sorted(set(glob(f"ui-mock/{mock}/src/**/*.test.*", recursive=True)))
    n = sum(1 for f in files for ln in open(f, encoding="utf-8")
            if ln.strip().startswith(("it(", "it (")))
    return files, n

# (a) the suite-count pins — WRAP-GATED (the §1.6 rider; mock-verdicts rule 3):
mini_f, mini_n = scrape("shell-mini")          # sibling-maintained → must equal LIVE
check("mini pin == live (sibling-maintained, per-wave re-keyed)",
      "445" in REG and (len(mini_f), mini_n) == (10, 445), f"live {mini_n}/{len(mini_f)}")
var_f, var_n = scrape("shell-variants")        # re-keys ONLY at the sibling's WRAP
wrap = declared_wrap("shell-variants")         # read their round-doc/PLAN declaration
if wrap is None:                                # mid-flight: drift is RECORDED, not failed
    check("variants pin: REGISTER-PENDING marker + the declared/scraped pair present",
          "REGISTER-PENDING" in REG and "1,773" in REG and "1,796" in REG,
          f"live {var_n}/{len(var_f)} (recorded)")
else:                                           # wrap declared → the register re-keys ≤1 round
    check("variants pin re-keyed at the wrap (declared + scraped figures both carried)",
          wrap.figure in REG and str(var_n) in REG, f"wrap {wrap.figure} vs live {var_n}")

# (b) the per-row pin re-derivation — every countable cell vs the live per-family count:
FAMILY_PINS = {   # row -> {file-suffix: battery-method count}   (§1.1's live table)
  1: {"insertPlan.test": 30},                # NOT 31 — the loose-rg split(' false positive
  2: {"SourceEditBar.test": 17, "useShortcuts.test": 63},
  3: {"SourceRangeBar.test": 18},  4: {"TimelineCompact.test": 28},
  5: {"MarkerInspector.test": 9},  6: {"CaptionInspector.test": 9},
  7: {"FxBrowser.test": 12, "FxInspector.test": 14},  8: {"AppDock.test": 6},
  9: {"CheatSheet.test": 12},
  16: {"ColorPage.test": 45, "ScopesDock.test": 22, "StillsPanel.test": 19,
       "ColorInspector.test": 16, "GradedViewerCanvas.test": 15, "WheelsPanel.test": 16,
       "ConsoleTabs.test": 5, "controls.test": 6, "mockGrades.test": 21,
       "colorSpace.test": 31, "gradeMath.test": 56, "gradedImage.test": 26,
       "qualifierMath.test": 28, "scopesMath.test": 20, "index.test": 6},
  17: {"DeliverPage.test": 24, "deliverViewStore.test": 10},
  20: {"MixerDock.test": 35, "ChannelEditor.test": 27, "ChannelStrip.test": 42,
       "MixerPrimitives.test": 49, "SoundLibrary.test": 11, "mockMixer.test": 15},
  21: {"TimelineToolbar.test": 39, "AppShell.test": 72},
}
for row, pins in FAMILY_PINS.items():
    for suffix, want in pins.items():
        f = glob_one(f"ui-mock/shell-variants/src/**/{suffix}")
        got = count_line_start_its(f)
        check(f"row {row}: {suffix} == {want}", got == want, f"{got} vs {want}")
# rows 10-15's uncensused "—" cells: check the 35.2 debt marker instead ("freshness pass fills it")

# (c) the METHOD law (the census-method divergence, mock-verdicts OQ-7): register cells carry
#     BATTERY-method counts (line-start, stripped). The loose rg overcounts (~+1/file where code
#     contains `split('` — insertPlan 31-any vs 30-line-start). One method, everywhere, forever.

# (d) the mini's LAW-NET census coherence (sibling-maintained): the register's decomposition
#     (150 units / 137 GAP / 412 authored) == LAW-NET-INVENTORY §2.3's live header.
```

The r26 class's three checks (the 19-family census, the C-ledger, the `len(files)==64 and blocks==1773` hard pin) become: the 21-family census, the C-ledger + the C59 footnote, and the **wrap-gated pair** — the r26 form's hard equality is exactly the check that failed 135/141 (the 6th fail: the variants it-census); the r27 form converts it from a pin-lag trap into the coordination law's enforcement.

---

## §5 The retirement triggers (D35.4 / D26.4 — "a mock surface retires when its owning spec row lands AND its row flips")

**Flip candidates THIS round (the W6 amendment wave lands the owning rows):**
1. **Row 3 (Source in/out marks)** — 18 §4.3's V1/V2/V5 amendments (the stills-transport + strip-flags + the scrub-strip surface) land in W6 → the row flips **LANDED-SPEC-R27** (the mock stays the reference implementation; the marks remain surface state, ops caller-supplied).
2. **Row 4 (Deliver RangeBand)** — 18 §4.8's coexistence-law rewrite + the 15 §13.15 pointer row land in W6 → flips **LANDED-SPEC-R27**.
3. **Row 2** — already LANDED-SPEC-R25; W6's V1-V6 rows extend it (a re-pin, not a flip).

**Growth-but-not-flip this round:** row 7 (the 18 §4.11a DnD routing table absorbs the A1 canon in W6 — the row's EXECUTABLE-WITNESS content grows, but the page-shape OPEN decision keeps it QUEUED); row 16 (stays DESIGN-REFERENCE by class — it never "lands"; the 08 W6 amendments F1/F8-F11 + the D37 curve-order ruling keep it current); rows 20/21 (NEW — QUEUED/PROPOSAL by construction); row 15 (the source-mode half registers, ENGINE-WINS stands).

**Not candidates (by law):** rows 5/6 (marker v2, captions — OPEN design rounds), row 8 (3-vs-5 pages — OPEN), rows 13/14 (ENGINE-WINS — the mock yields, it does not retire on spec landings), rows 9-12 (aligned rows — already citable, no flip semantics).

**The post-K4/w1 set (D26.4's named triggers, unchanged):** rows **18 (mini)** + **19 (annotakit/VLM)** — the mocks-as-repos retire when the app matches their fidelity AND their rows flip; the mini's LAW-NET census (150 units / 137 GAP) is the acceptance list the crawl must exhaust. The W1-W3+W5 landings today move the mini FURTHER from retirement (the corpus grows faster than the crawl re-expresses it) — the honest retirement forecast: not before the K3 store/policy halves land app-side.

**The flip protocol reminder (the register's own law):** no premature LANDED flips mid-flight — rows 3/4's flips key on the W6 amendments actually landing, and the sibling's in-flight waves never flip a row by themselves (their W1-W3 landings are recorded REGISTER-PENDING on rows 1/2/3/14/15/16 until the wrap).

---

## Verification log

- REFERENCE-REGISTER.md read in full (96 L); battery_r26.py's §O register class read (lines 424-445); the r26 census check's exact form (`len(files)==64 and blocks==1773`) confirmed as the live-failing class.
- Live re-derivations ⭐: the variants census (65 files / 1,796 line-start its; the per-family counts in §1.1 — every file individually rg-counted); the mini census (10 / 445; LAW-NET 150/137/412 per the W5 commit `64d8682`); the wave timelines (variants W1 `a83d4d2` 12:17 / W2 `685edba` 12:38 / W3 `b08b83a` 13:25; mini W0 `e391239` / W1 `1e21511` / W2 `2420d7e` / W2-fix `fb05540` / W3 `285eca5` / W5 `64d8682` — all 2026-09-13; W4 absent from the log); the C-ledger tail (`.agents/SPEC-REVISION-CANDIDATES.md` :448-483 — ends C58; no C59+); the mocks' `.agents/` absence verified; the insertPlan 31-vs-30 method artifact located (insertPlan.test.ts:490 `split('-')`); 12/17's mini rows confirmed sibling-maintained (last commit `64d8682` re-keyed both).
- Consumed: mock-variants.md (the 16-row harvest map + the §3 worklist), mock-verdicts.md (V1-V19 + the 6 coordination rules + the OQs), spec-12-13.md (the 1,796/65 live read + the battery 135/141), spec-08.md (the C59 dangle + F2's OPEN decision), spec-17.md (the sibling-maintained mini numbers + the wrap-only re-key rule), BRIEFING.md, ARCH-R25 D35, the D26.4 retirement citations (IMPLEMENTATION-PLAN :121, 18:32), FINAL-SIGNOFF.md + TESTABILITY-SIGNOFF.md (both in full).

*Report-only: no file modified outside this report + the worklog; no commits or pushes; stayed on main.*

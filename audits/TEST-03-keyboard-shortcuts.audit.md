# Audit Report: TEST-03 Keyboard Shortcuts Spec
**Auditor:** general-purpose
**Spec:** `16-keyboard-shortcuts.md` (1,801 LOC)
**Date:** 2026-08-22
**Stream:** AUDIT-TEST-03

---

## Summary

- Spot-checks performed: 15 (per task spec)
- Sub-claims verified: 56
- Verified accurate: 39
- Verified with issues: 7
- Verified inaccurate: 10
- Issues found: 22 (8 high / 7 medium / 7 low)

## Verdict: ⚠ PASS-WITH-CONDITIONS — substantial content, structural + cross-spec alignment defects block unqualified acceptance

The spec is comprehensive in *scope* (152–180 keyboard bindings, 13 categories, 4 test patterns, 12 conflicts, accessibility, implementation architecture, appendices) but suffers from three classes of defect that must be resolved before downstream consumers (spec 15 reconciliation, test plan 17, implementation) can rely on it:

1. **Stale cross-reference to spec 15** — spec 16 was authored under TEST-03 *before* TEST-02 shipped `15-wire-protocol.md`. Spec 16 still treats `15-engine-commands.md (TBD)` as forward-looking and self-defines an `EngineCommand` discriminated union in §8.3 that diverges from spec 15's canonical 60-type union (27 type-name mismatches). This is the single largest issue.

2. **Internal binding-count inconsistency** — four different counts appear across §0, §3 tables, §6, Appendix A, and §16 test matrix (110 / 152 / 160 / 170 / 178 / 180). No single number is correct everywhere.

3. **Conflict table (§6.1) contradicts binding tables (§3.x) and Appendix A** — several conflicts are "resolved" in §6.1 but the underlying §3.x tables still show the *un-resolved* binding. Worse, Appendix A registers at least 6 key combinations twice with overlapping (non-disjoint) contexts, which would crash the §8.6 `register()` "throws on duplicate" invariant.

The spec is *salvageable* — most issues are textual/cross-reference fixes rather than architectural. But until issues #1, #3, #5, #6, #22 are resolved, downstream specs cannot treat §8.3 or §12 as normative.

---

## Spot-check results

### 1. ~110 unique actions / 152 bindings claimed — ⚠ PARTIAL PASS (counts disagree)

**Claims audited (4 different ones in the spec):**

| Location | Claimed | Actual |
|---|---|---|
| §0 TL;DR table (line 16) | "~110 bindings across 13 categories" | (binding count claim) |
| §0.1 (line 30) | "every shortcut maps to `EngineCommand`" | (architecture claim) |
| Appendix A line 1722 | "Total bindings: 152 rows (including alt bindings and per-preset rows). Unique actions: ~110" | **Actual Appendix A row count: 180** |
| §16 test matrix Total row (line 1783) | 170 tests planned | **Sum of category rows: 160** (18+10+14+22+14+10+7+16+12+5+11+16+5) |

**Reconciliation table:**

| Count source | Number | Notes |
|---|---|---|
| §3.x table rows (sum across §3.1–§3.13) | 178 | §3.1=32, §3.2=10, §3.3=14, §3.4=27, §3.5=13, §3.6=10, §3.7=7, §3.8=18, §3.9=12, §3.10=5, §3.11=9, §3.12=16, §3.13=5 |
| Appendix A flat registry (lines 1540–1719) | 180 | Includes 9 effect-preset rows + 9 effect-toggle rows that §3.11 collapses to 2 table rows |
| Spec text claim (line 1722) | 152 | **Off by 28** |
| §16 test matrix sum | 160 | **Off by 20 from Appendix A** |
| §16 test matrix Total row | 170 | **Off by 10 from sum** |
| §0 TL;DR ("~110 bindings") | ~110 | **Off by ~70** |

**Unique action count:** The "~110 unique actions" claim is plausible *only* if effect presets (9 rows) are counted as 1 action, effect toggles (9 rows) as 1, panel toggles (4 rows) as 1, workspace switches (4 rows) as 1, and alt bindings (~15 rows) are merged with their primaries — that collapses 180 → ~144 → ~120 → ~110. But the spec does not state this collapsing rule, so the number reads as wrong on its face. All 180 Appendix A rows have unique `action` strings (verified via `awk | sort -u | wc -l` → 180 unique labels).

**Verdict:** ⚠ Multiple inconsistent counts. The 180-row Appendix A is canonical (it's the "flat shortcut registry (for Test Enumeration)" per §14 header); spec text claims should be updated to 180 bindings, ~150 unique action labels, ~110 unique action *types* (after parameterizing presets/panels/workspaces).

---

### 2. 13 categories claimed — ✅ PASS

**Evidence:** Appendix A's `category` column (column 4) yields exactly 13 distinct values:

```
playback, tools, selection, editing, track, nudge, markers,
view, project, undo, effects, keyframes, help
```

**Cross-check with §8.6 `ShortcutCategory` type (line 1040–1043):**

```ts
export type ShortcutCategory =
  | 'playback' | 'tools' | 'selection' | 'editing'
  | 'track' | 'nudge' | 'markers' | 'view'
  | 'project' | 'undo' | 'effects' | 'keyframes' | 'help';
```

= 13 categories. ✓ Type union matches flat registry.

**Per-category binding counts (from Appendix A):**

| Category | Rows | §16 matrix claim | §3.x table rows | Matrix vs Appendix delta |
|---|---|---|---|---|
| playback | 22 | 18 | 32 | -10 (multi-tap + Home/End + Shift+I/O omitted from registry) |
| tools | 10 | 10 | 10 | 0 ✓ |
| selection | 16 | 14 | 14 | -2 |
| editing | 26 | 22 | 27 | -1 |
| track | 13 | 14 | 13 | +1 |
| nudge | 10 | 10 | 10 | 0 ✓ |
| markers | 5 | 7 | 7 | +2 |
| view | 18 | 16 | 18 | -2 |
| project | 10 | 12 | 12 | +2 |
| undo | 3 | 5 | 5 | +2 |
| effects | 22 | 11 | 9 | -11 (Appendix expands 9 presets + 9 toggles; matrix counts unique) |
| keyframes | 20 | 16 | 16 | -4 (Appendix expands view-mode + nudge rows) |
| help | 5 | 5 | 5 | 0 ✓ |
| **Total** | **180** | **160 (sum) / 170 (claim)** | **178** | inconsistent |

**Verdict:** ✅ 13 categories verified. ⚠ Per-category counts disagree across §3 / Appendix A / §16 — see Issue #2.

---

### 3. Every shortcut maps to EngineCommand — spot-check 15 random shortcuts — ⚠ PARTIAL PASS (3 of 15 have divergence vs spec 15)

15 shortcuts sampled at regular intervals through Appendix A, each verified against (a) spec 16 §8.3 self-defined `EngineCommand` union, (b) spec 15 canonical `EngineCommand` union (`15-wire-protocol.md` §4.1), (c) spec 01 manager method name.

| # | Key | Action | Spec 16 §8.3 type | In spec 15? | Spec 16 §12 manager method | Spec 01 method | OK? |
|---|---|---|---|---|---|---|---|
| 1 | `Space` | Play/Pause | `play`/`pause` | ✅ both | `playback.play()` / `playback.pause()` | `playback.play()` (line 228) / `pause()` (229) | ✅ |
| 2 | `Cmd+B` | Split | `split` | ✅ both | `timeline.splitElements({elements, splitTime, retainSide})` | `timeline.splitElements(...)` (line 164) | ✅ |
| 3 | `Cmd+Z` | Undo | `undo` | ✅ both | `command.undo()` | `command.undo()` (line 214) | ✅ |
| 4 | `Cmd+S` | Save | `saveProject` | ✅ both | `project.saveCurrentProject()` | `project.saveCurrentProject()` (line 1131) | ✅ |
| 5 | `Cmd+W` | Close | `closeProject` | ✅ both | `project.closeCurrentProject()` | **`project.closeProject()`** (line 1141, 2016) | ❌ wrong method name |
| 6 | `M` | Add marker | `toggleBookmark` | ✅ both | `scenes.toggleBookmark({time})` | `scenes.toggleBookmark({time})` (line 266) | ✅ |
| 7 | `Cmd+M` | Mute track | `toggleTrackMute` | ✅ both | `timeline.toggleTrackMute({trackId})` | `timeline.toggleTrackMute({trackId})` (line 187) | ✅ |
| 8 | `Tab` | Select next | `selectElements` | ✅ both | `selection.setElements(ids, mode)` | SelectionManager methods not in spec 01 (greenfield per §14.12) | ⚠ unverifiable |
| 9 | `B` | Razor tool | `selectTool` | ✅ both | `engine.ui.setTool(...)` | **`engine.ui` does not exist on EditorCore** (spec 01 §3.2 lines 82–93 — no `ui` field on the 12-manager class) | ❌ UIManager not in spec 01 |
| 10 | `Cmd+C` | Copy | `copy` | ✅ both | `clipboard.copy({elements})` | **spec 15 uses `clipboard.copyClipboardEntry({elementIds})`** (§4.2 line 334) | ❌ method name diverges from spec 15 |
| 11 | `Cmd+V` | Paste | `paste` | ✅ both | `clipboard.paste({time, mode})` | **spec 15 uses `clipboard.buildPasteClipboardCommand({atTime, targetTrackId})`** (§4.2 line 336) | ❌ method name diverges from spec 15 |
| 12 | `Cmd+Delete` | Ripple delete | `delete` | ✅ both | `timeline.deleteElements({elements})` (+ ripple BatchCommand) | `timeline.deleteElements(...)` (line 171) | ✅ |
| 13 | `K` (keyframe panel) | Add keyframe | `addKeyframe` | ❌ spec 15 uses `upsertKeyframes` (§4.2 line 330) | `timeline.updateElements({updates: {keyframes: [..., kf]}})` | spec 15 maps `upsertKeyframes` → `engine.timeline.upsertKeyframes({elementId, keyframes})` | ❌ type name diverges from spec 15 |
| 14 | `R` (color page) | Reset color grade | `resetColorGrade` | ❌ not in spec 15 (spec 15 has no color-grade reset command) | `timeline.updateElements({updates: {colorGrade: default}})` | n/a (greenfield) | ⚠ command not in spec 15 |
| 15 | `Cmd+E` | Export FCPXML | `exportFCPXML` | ❌ not in spec 15 (spec 15 has no export commands — `export` is out of wire-protocol scope) | `renderer.exportProject({format:'fcpxml'})` | spec 01 §14.11: ExportManager is greenfield; RendererManager.exportProject is for video/MP4, not FCPXML | ❌ method attribution wrong |

**Spot-check summary:**
- 7 of 15 fully consistent ✅
- 2 unverifiable (greenfield, spec 01 doesn't define) ⚠
- 6 of 15 with material mismatches ❌ (Issues #4, #5, #6, #7)

**Verdict:** ⚠ Spot-check reveals ~40% failure rate against spec 15 / spec 01 canonical types and method names. Most failures stem from spec 16 being authored before spec 15 (TEST-02) shipped.

---

### 4. Conflict resolution (§6) — ✅ PASS for documented conflicts; ⚠ internal inconsistencies

**Required verifications:**

| # | Conflict | Documented? | Resolution correct? | Internal consistency? |
|---|---|---|---|---|
| L (playback vs lock) | §6.1 #1 (line 540) | ✅ | ✅ "L = playback (always). Track lock is Cmd+L" | ✅ matches §3.1 line 112 and §3.5 line 225 |
| M (marker vs mute) | §6.1 #3 (line 542) | ✅ | ✅ "M = marker (always). Mute is Cmd+M" | ✅ matches §3.7 line 257 and §3.5 line 220 |
| B (razor tool vs split) | §6.1 #5 (line 544) | ✅ | ✅ "Tool-mode determines op" | ✅ matches §3.2 line 149 and §3.4 line 186 |
| `,` / `.` (slip vs nudge) | §6.1 #2 (line 541) | ✅ | ✅ "Slip tool → slip; any other → nudge" | ✅ matches §3.4 lines 196–197 and §3.6 lines 240–241 |
| `Shift+arrows` (10-frame nudge vs 5-sec jump) | §6.1 #8 (line 547) | ✅ | ✅ "10-frame nudge; 5-sec jump removed" | ✅ matches §3.1 lines 123–124 (now seek) and §3.6 lines 242–243 |

**§6.1 table completeness:** 12 numbered conflict rows (lines 540–551). All 5 required conflicts plus 7 more (`S`, `Cmd+Shift+V`, `K`, `Cmd+Shift+F`, `Cmd+L`, `Cmd+1`–`Cmd+9`, `Tab`). ✓ Count matches §0 TL;DR claim of "12 disambiguation cases".

**However — internal inconsistencies (see Issues #11, #12, #22):**

- §6.1 #4 (line 543) says `Cmd+S` = save (always), solo is `Cmd+Option+S`. But §3.5 line 223 still lists `Cmd+S (track focused) | Solo toggle`. §3.5 was not updated to reflect the §6.1 resolution. Appendix A line 1617 has the correct `Cmd+Option+S` for solo.
- §6.1 #6 (line 545) for `Cmd+Shift+V` is *internally contradictory*: it says "`Cmd+Shift+V` = paste overwrite (always)" then immediately says "Final: visibility is `V` when a track header has focus, `Cmd+Shift+V` elsewhere" — which would mean `Cmd+Shift+V` *is* visibility when the track header doesn't have focus, contradicting the "always paste overwrite" claim.
- §3.5 line 228 still lists `Cmd+Shift+V | Toggle track visibility` — directly contradicts §6.1 #6 and Appendix A line 1622 (which correctly says visibility is `V` when track header focused).

**Verdict:** ✅ All 5 required conflicts documented and the 12-row conflict table is comprehensive. ⚠ §3.x binding tables were not updated to match §6.1 resolutions; §6.1 #6 has an internal contradiction (Issue #11).

---

### 5. 4 test patterns — ✅ PASS (with one missing benchmark)

**Required patterns and their locations:**

| Pattern | Spec location | Speed benchmark given? |
|---|---|---|
| Pattern 1 — real keyboard via Playwright | §4 (line 374) | ✅ "~10 ms per keypress + ~50 ms settle. Total ~60 ms per assertion step." |
| Pattern 2 — direct `engine.command.apply(EngineCommand)` (fast path) | §4 (line 394) | ✅ "~2 ms per command. Total ~5 ms per assertion step. 12× faster than Pattern 1." |
| Pattern 3 — hybrid (keyboard + direct API) | §4 (line 422) | ✅ "~10 ms per keypress + ~2 ms per state query. Total ~12 ms per step." |
| Pattern 4 — mouse only (mouse-mechanics tests) | §4 (line 448) | ❌ No benchmark — only descriptive text |

**Verdict:** ✅ All 4 patterns present with code examples and "when to use which pattern" decision table (line 470). ⚠ Pattern 4 lacks an explicit benchmark (Issue #13).

---

### 6. Reconciliation with spec 05 §19 — ✅ PASS

**§11 reconciliation table (lines 1423–1439) verifies:**

| §19 recommendation | This spec | FCP-convention rationale documented? |
|---|---|---|
| `s` = split at playhead | `Cmd+B` = split; `S` = alt binding | ✅ "FCP uses `Cmd+B` for blade-split — better muscle-memory match for FCPXML handoff target" |
| `c` = razor tool | `B` = razor tool | ✅ "FCP uses `B` for blade — matches FCP convention; `C` freed for future use" |
| `n` = snap toggle | `N` = snap toggle | ✅ agreed |
| `shift+arrows` = nudge 1px (FreeCut) | `Shift+Left/Right` = 10-frame nudge | ✅ "Frames > pixels — pixel nudging is a UI concept, frame nudging is a media concept" |
| `k` = pause / add keyframe | Same — context-determined | ✅ agreed (§6 conflict #7) |
| `m` = marker | Same | ✅ agreed |
| `i`/`o` = mark in/out | Same | ✅ agreed |
| `mod+z`/`mod+shift+z` = undo/redo | `Cmd+Z`/`Cmd+Shift+Z` | ✅ agreed |
| `mod+=` / `mod+-` = zoom in/out | `+`/`=` / `-` (no Cmd) | ✅ "Single-key zoom is faster for common zoom" |
| `\` = zoom to fit | `Cmd+\` | ✅ "Avoid single-key `\` (layout-dependent, easy to mistype)" |
| `ctrl+a` = select all | `Cmd+A` = select all on focused track | ✅ "FCP convention: Cmd+A selects all on focused track" |
| `escape` = cancel / deselect | `Escape` = deselect + return to select tool | ✅ §3.2 + §3.3 |
| `q`/`w` = split + remove | Same | ✅ agreed |
| `alt+c` (FreeCut) = split at cursor | `B` (razor) + click = split at click | ✅ "Razor tool + click is more discoverable than a chord" |
| (none) | `Cmd+Shift+B` = split all tracks | ✅ "New — addresses test need for split everything at playhead" |

**§11 closing claim (line 1441):** "this spec defines ~110 bindings (vs §19's ~50)" — ✅ Spec 05 §19.3 confirms "~50 actions". Binding count claim has the same Issue #1 inaccuracy (~110 vs actual 180 in Appendix A).

**Verdict:** ✅ Reconciliation table is thorough, every §19 departure is documented with rationale, FCP-convention justification is present (cross-references spec 10 FCPXML handoff target). 

---

### 7. Context-resolution order (7 steps) — ✅ PASS

**§6.2 (lines 555–563) documents the 7-step order:**

| Step | Context | Description |
|---|---|---|
| 1 | Modal open | Only `Escape`, `Enter`, `Tab` (focus trap) active |
| 2 | Text input focused | Only `Cmd+` shortcuts active (see §8.5) |
| 3 | Panel-specific context | Keyframe/effects panel bindings take precedence |
| 4 | Tool-specific context | Tool-specific bindings take precedence |
| 5 | Selection context | Selection-required bindings active when ≥1 clip selected |
| 6 | Track focus context | Track-focus bindings active when track has focus |
| 7 | Always | Catch-all bindings (playback, navigation, file ops) |

**Required order:** modal > text-input > panel > tool > selection > track-focus > always ✅ matches §6.2 exactly.

**Implementation hook:** §8.2 `KeyboardHandler.onKeyDown` (lines 694–713) implements the order via:
1. `isModalOpen()` gate (line 696)
2. `isTextInput()` gate (line 699)
3. `descriptor.contextPredicate(engine)` gate (line 707)

The 7-step order is encoded in the order of these predicate checks + per-descriptor `contextPredicate` composition. ✅ Architecturally sound.

**Verdict:** ✅ All 7 steps present in correct order, with implementation reference.

---

### 8. Effect presets (1-9) — ✅ PASS

**§3.11 line 325:**
```
| `1`–`9` | Apply effect preset N to selected clip | { type: 'addEffect', params: { elementId: <selected>, effect: <presetN> } } | When clip selected | (none) |
| `Shift+1`–`Shift+9` | Toggle effect N on/off | { type: 'toggleEffect', params: { elementId: <selected>, effectIndex: <N> } } | When clip selected | (none) |
```

**Appendix A lines 1673–1690:** 18 individual rows (`kbd-effect-preset-1` through `kbd-effect-preset-9`, `kbd-effect-toggle-1` through `kbd-effect-toggle-9`). ✓ Each preset row has unique testId.

**Conflict awareness:** §6.1 #11 (line 550) explicitly addresses the `Cmd+1`–`Cmd+9` (workspace) vs `1`–`9` (effect preset) overlap and resolves via different modifiers. ✓

**Verdict:** ✅ Effect presets 1-9 verified in §3.11 and Appendix A.

---

### 9. Keyframe panel navigation — ✅ PASS

**§3.12 (lines 335–354) documents 16 keyframe shortcuts:**

| Operation | Keys documented? |
|---|---|
| Add/delete keyframe | `K`, `Shift+K` ✓ |
| Toggle keyframe nav mode | `Option+K` ✓ |
| Clear all keyframes on property | `Cmd+Shift+K` ✓ |
| Jump to prev/next keyframe (focused property) | `[`, `]` ✓ |
| Jump to prev/next keyframe (any property) | `Option+[`, `Option+]` ✓ |
| Nudge keyframe value ±1 / ±10 | `Up`/`Down`, `Shift+Up`/`Shift+Down` ✓ |
| Nudge keyframe time ±1 frame / ±10 frames | `Left`/`Right`, `Shift+Left`/`Shift+Right` ✓ |
| View mode switch (graph/dopesheet/split) | `1`, `2`, `3` ✓ |
| Fit panel to selection | `F` ✓ |

**Appendix A category "keyframes" rows: 20** (lines 1695–1714). ✓ All 16 §3.12 entries present (extra 4 rows are the parameterized view-mode and nudge variants).

**Verdict:** ✅ Comprehensive keyframe navigation coverage.

---

### 10. Workspace switching — ✅ PASS

**§3.8 lines 279–289 documents workspace + panel switching:**

| Key | Action |
|---|---|
| `Cmd+1` | Switch to Edit workspace |
| `Cmd+2` | Switch to Color workspace |
| `Cmd+3` | Switch to Effects workspace |
| `Cmd+4` | Switch to Audio workspace |
| `Option+1` | Toggle Inspector panel |
| `Option+2` | Toggle Effects panel |
| `Option+3` | Toggle Media library panel |
| `Option+4` | Toggle Markers panel |
| `Cmd+'` | Toggle timeline ruler units |
| `Cmd+;` | Toggle grid overlay in preview |

**Appendix A "view" category rows 1650–1659:** All 10 entries present. ✓

**Verdict:** ✅ Workspace + panel switching documented.

---

### 11. Cheat sheet (`?`) — ✅ PASS

**§3.13 line 360:** "`?` (Shift+/) | Open keyboard cheat sheet modal | (UI only — opens modal) | Always"

**§7.3 (lines 604–614) details the cheat-sheet modal:**
- Searchable ✓
- Conflict warnings (`⚠ context-dependent` badge) ✓
- Per-shortcut `data-testid="shortcut-<action-id>"` ✓
- Export to JSON via `Cmd+E` (within modal) ✓
- ARIA focus trap (Tab cycles within, Escape closes) ✓
- Single source of truth: `ShortcutMap.getDescriptors()` ✓

**Alt bindings documented:** `Cmd+?` (alt), `Cmd+Shift+?` (v2 settings). ✓

**Verdict:** ✅ Cheat sheet modal fully specified with `?` as primary trigger.

---

### 12. Accessibility (ARIA + screen reader) — ✅ PASS

**§7 Accessibility (lines 580–623) documents:**

| Concern | Coverage |
|---|---|
| §7.1 ARIA labels | Toolbar buttons `aria-label="Razor tool (B)"`, menu items `aria-keyshortcuts="Cmd+S"`, timeline clips with action hints. Hidden `aria-live="polite"` region for shortcuts without UI elements (JKL shuttle). ✓ |
| §7.2 Screen reader announcements | `KeyboardShortcutFired` event with ≤6-word state-based announcements ("Split at playhead, frame 1250"). ✓ |
| §7.3 Cheat-sheet ARIA | Focus trap, Tab cycles, Escape closes. ✓ |
| §7.4 Customization (v2) | `localStorage` persistence under `nle.shortcuts.userMap`, conflict-detection remap UI deferred to v2. ✓ |

**Verdict:** ✅ ARIA + screen reader support documented across 4 subsections.

---

### 13. Test verification section (§9) — ✅ PASS

**§9 (lines 1140–1395) documents:**

| Subsection | Content |
|---|---|
| §9.1 Coverage goal | Meta-test reads `ShortcutMap.default().getDescriptors()` and asserts each has a corresponding `test()` block (line 1150). ✓ |
| §9.2 Test recipes | 8 worked examples: split at playhead, razor+click split, JKL shuttle, Option-held nudge coalescing, multi-track split-all, Tab selection walking, Cmd+M mute, direct EngineCommand (Pattern 2). ✓ |
| §9.3 Test helpers | `getEngineState()`, `getSelectedElements()`, `getFocusedTrackId()`, `expectPlaybackState()`. ✓ |
| §9.4 Frame-rate-aware assertions | `frameTicks(n, fps)` helper, "never hardcode `4000` for 1 frame". ✓ |
| §9.5 Handler unit tests | 3 examples: Space→play when not playing, suppress Space in text input, Cmd+B→split at currentTime. ✓ |

**Verdict:** ✅ §9 comprehensive with code examples at unit + e2e levels.

---

### 14. Implementation section (§8) — ✅ PASS (with implementation gaps)

**§8 (lines 627–1137) documents the keyboard handler architecture:**

| Subsection | Content |
|---|---|
| §8.1 Architecture | ASCII diagram: Browser → KeyboardHandler → EngineCommandResolver → EditorCore. ✓ |
| §8.2 KeyboardHandler | Full `handler.ts` code with `attach()`, `dispose()`, `onKeyDown()`, `keyFromEvent()`, `codeToKey()`, `isModalAllowedKey()`. Calls `preventDefault()` on match (line 710). ✓ |
| §8.3 EngineCommandResolver | `EngineCommand` discriminated union (60 types, lines 759–819) + `resolveEngineCommand()` switch with ~20 implemented cases. ✓ (abbreviated — see Issue #10) |
| §8.4 Non-US keyboard | `event.code` primary, `event.key` fallback for symbols. ✓ |
| §8.5 Text-input handling | `isTextInput()` helper, single-key suppressed, `Cmd+` active. ✓ |
| §8.6 ShortcutMap | `Map<ShortcutKey, ShortcutDescriptor>`, `register()` throws on duplicate (line 1083), `lookup()`, `getDescriptors()`, `mergeOverrides()` for v2. ✓ |
| §8.7 Multi-tap (JKL) | `jklState` closure with 500ms window, rate caps at 4×. ✓ |

**Required elements: ShortcutMap, dispatch, preventDefault — all present.**

**Verdict:** ✅ Architecture documented; ⚠ Resolver switch implementation incomplete (Issue #10) and `batch` case uses undefined `resolveToCommandInstance` (Issue #9).

---

### 15. Cross-reference with spec 15 — ❌ FAIL (stale reference + union divergence)

**This is the largest single issue in the spec.** Spec 16 was authored under TEST-03 *before* TEST-02 shipped `15-wire-protocol.md`. The spec 16 author verified (per worklog line 2098): "Verified spec 15 (engine-commands) does NOT exist in /home/z/my-project/download/nle-spec/". Spec 15 has since been authored under TEST-02 as `15-wire-protocol.md` (4,747 LOC, 60 EngineCommand types).

**Stale references in spec 16 (9 occurrences):**

| Line | Reference | Problem |
|---|---|---|
| 8 | "Forward reference: `15-engine-commands.md` (TBD — this spec defines the `EngineCommand` shape that spec 15 will formalize)" | Wrong filename (`15-wire-protocol.md`), wrong status (spec 15 has shipped) |
| 33 | "### 0.2 Forward reference to spec 15" | Section premise is wrong (spec 15 exists) |
| 43 | "Until spec 15 exists, **this spec's §8.3 + §12 are the normative definition**" | False premise (spec 15 exists and is canonical) |
| 90 | "Cross-ref spec 15 (TBD; see §0.2)" | Wrong status |
| 404 | "engine.command.apply(cmd); // spec 15 contract (§0.2)" | Spec 15 contract IS `engine.command.apply()` per §4.2 line 263 — but spec 16 references it as TBD |
| 420 | "Until spec 15 ships, the resolver lives in `src/ui/keyboard/engine-command-resolver.ts`" | Spec 15 has shipped |
| 712 | "this.engine.command.apply(command); // spec 15 contract" | Comment is OK but the surrounding "until spec 15 ships" framing is stale |
| 757 | "Forward reference to spec 15. This is the canonical definition until spec 15 ships." | Stale |
| 1801 | "Spec 15 (engine commands — TBD): `EngineCommand` type formalization; until it ships, this spec's §8.3 + §12 are normative" | Stale |

**EngineCommand union divergence (27 type-name mismatches):**

Spec 16 §8.3 (lines 759–819) defines its own 60-type `EngineCommand` union. Comparing against spec 15 §4.1 (lines 161–249) canonical 60-type union:

| Spec 16 type | Spec 15 type | Status |
|---|---|---|
| `play`, `pause`, `seek`, `setRate`, `setLoop` | (same) | ✅ match |
| `selectTool`, `selectElements`, `selectTrack` | (same) | ✅ match |
| `split`, `trim`, `slip`, `move`, `delete`, `duplicate`, `freezeFrame` | (same) | ✅ match |
| `copy`, `paste`, `undo`, `redo`, `batch` | (same) | ✅ match |
| `toggleBookmark`, `removeBookmark`, `updateBookmark` | (same) | ✅ match |
| `toggleTrackMute`, `toggleTrackSolo`, `toggleTrackLock`, `toggleTrackVisibility`, `addTrack` | (same) | ✅ match |
| `saveProject`, `closeProject` | (same) | ✅ match |
| `addEffect`, `toggleEffect` | (same) | ✅ match |
| `seekToMarker` | (none in spec 15) | ❌ spec 16 only |
| `toggleLoopPlayback` | (none in spec 15) | ❌ spec 16 only |
| `toggleSnap` | (none in spec 15) | ❌ spec 16 only |
| `toggleRipple` | spec 15 has `ripple` (meta wrapper) | ❌ divergent |
| `findPlayhead` | (none in spec 15) | ❌ spec 16 only |
| `splitAndRemove` | (none — spec 15 uses `batch` of `split`+`delete`) | ❌ spec 16 only |
| `pasteAttributes` | (none in spec 15) | ❌ spec 16 only |
| `join` | (none in spec 15) | ❌ spec 16 only |
| `toggleAVLink` | (none in spec 15) | ❌ spec 16 only |
| `removeTrack` | spec 15 uses `deleteTrack` | ❌ type name diverges |
| `beginRenameTrack` | (none in spec 15) | ❌ spec 16 only |
| `editMarker` | spec 15 uses `updateMarker` (and also has `updateBookmark` separately) | ❌ type name diverges |
| `zoom`, `zoomToFit`, `zoomToSelection` | (none — UI state in spec 15) | ❌ spec 16 only |
| `resetEffects` | (none — spec 15 has `removeEffect` per-effect) | ❌ spec 16 only |
| `resetColorGrade` | (none in spec 15) | ❌ spec 16 only |
| `matchColor` | (none in spec 15) | ❌ spec 16 only |
| `addKeyframe` | spec 15 uses `upsertKeyframes` | ❌ type name diverges |
| `deleteKeyframe` | spec 15 uses `removeKeyframes` (plural) | ❌ type name diverges |
| `clearKeyframes` | (none — spec 15 uses `removeKeyframes` with all IDs) | ❌ spec 16 only |
| `seekToKeyframe` | (none in spec 15) | ❌ spec 16 only |
| `nudgeKeyframe` | (none in spec 15) | ❌ spec 16 only |
| `moveKeyframe` | spec 15 uses `retimeKeyframe` | ❌ type name diverges |
| `toggleKeyframeNav` | (none in spec 15) | ❌ spec 16 only |
| `exportFCPXML`, `exportMaster`, `exportFrame` | (none — exports out of wire-protocol scope per spec 15) | ❌ spec 16 only |

**Tally:** 33 types match spec 15; 6 diverge in name; 18 are spec-16-only (UI-state, composite, or commands spec 15 doesn't model). ~27 of 60 (~45%) of spec 16's `EngineCommand` types either don't exist in spec 15 or use different names.

**Verdict:** ❌ Major cross-spec alignment failure. Spec 16's §8.3 `EngineCommand` union cannot be normative while spec 15 defines a divergent canonical union. Either:
(a) Spec 16 must update to defer to spec 15's canonical union for the 33 overlapping types, and explicitly justify the 18 spec-16-only additions (UI-state commands like `zoom`, `findPlayhead` could remain UI-only and *not* EngineCommands), OR
(b) Spec 15 must be revised to absorb the spec 16 additions (likely the cleaner long-term path, since UI-state commands and composite helpers like `splitAndRemove` are legitimately missing from spec 15's command-bus scope).

---

## Issues found

### HIGH severity

#### Issue #1 — Stale cross-reference to spec 15 (9 occurrences)
**Location:** lines 8, 33, 43, 90, 404, 420, 712, 757, 1801
**Problem:** Spec 16 references `15-engine-commands.md (TBD)` throughout. Actual file is `15-wire-protocol.md` (4,747 LOC, authored TEST-02). All "until spec 15 ships" / "TBD" / "this spec's §8.3 is normative" framing is stale.
**Fix:** Replace all 9 references. Change §0.2 from "Forward reference to spec 15" to "Alignment with spec 15" — defer to spec 15 §4 as canonical for the 33 overlapping EngineCommand types; document spec 16's additional 18 types (UI-state, composite, export) as either (a) UI-only (not EngineCommands) or (b) extensions to be promoted into spec 15 in a future revision.

#### Issue #2 — EngineCommand union divergence from spec 15 (27 type-name mismatches)
**Location:** §8.3 lines 759–819; §12 lines 1449–1510
**Problem:** ~27 of spec 16's 60 EngineCommand types either don't exist in spec 15 or use different names (`removeTrack` vs `deleteTrack`, `addKeyframe` vs `upsertKeyframes`, `deleteKeyframe` vs `removeKeyframes`, `moveKeyframe` vs `retimeKeyframe`, `editMarker` vs `updateMarker`). Spec 16 §12 manager-method cross-reference uses spec 16's type names, diverging from spec 15 §4.2's canonical mapping.
**Fix:** Update §8.3 union to align with spec 15 §4.1 names for overlapping types. For spec-16-only types (UI state, exports, composites), either drop them from the `EngineCommand` union (treating as UI-only) or formally request spec 15 add them. Reconcile §12 manager-method table with spec 15 §4.2.

#### Issue #3 — Binding count inconsistency (4 different numbers across spec)
**Location:** §0 TL;DR (line 16: "~110"), §0.1 (line 30: "all 12 conflicts"), Appendix A (line 1722: "152 rows"), §16 test matrix (line 1783: "170"; sum of rows: 160)
**Problem:** Actual Appendix A row count is 180. §3.x table sum is 178. Spec text claims are 110/152/160/170 — none match. See spot-check #1 reconciliation table.
**Fix:** Pick one canonical number (recommend 180, matching Appendix A row count). Update §0 TL;DR, Appendix A footer, §16 test matrix Total row, and §16 test matrix per-category rows. Separately, document the "unique action" count (~110 after parameterizing presets/panels/workspaces) with the collapsing rule explicit.

#### Issue #4 — `engine.ui` references don't exist on EditorCore (per spec 01)
**Location:** §8.3 lines 845 (`engine.ui.setTool`), 940 (`engine.ui.timelineViewport.zoom`), 941 (`engine.ui.timelineViewport.zoomToFit`); §12 line 1462 (`ui.focusTrack`), 1483 (`ui.beginRenameTrack`), 1488–1490 (`ui.timelineViewport.zoom/zoomToFit/zoomToElements`), 1504 (`ui.toggleKeyframeNav`); §9.3 line 1317 (`engine.ui.focusedTrackId`)
**Problem:** Spec 01's `EditorCore` class (§3.2 lines 82–93) defines 12 managers and NO `ui` field. UIManager is not in spec 01's roster. Spec 16 silently invents `engine.ui.*` across 8+ locations.
**Fix:** Either (a) add a §X to spec 01 defining a `UIManager` (or `UIStore`) on EditorCore covering setTool, focusTrack, timelineViewport, focusedTrackId, beginRenameTrack, toggleKeyframeNav — with proper cross-references from spec 16; or (b) refactor spec 16 to use Zustand stores directly (per spec 01 §3.5 contract seams, where UI state lives in deps/ contracts not on EditorCore).

#### Issue #5 — `engine.project.closeCurrentProject()` is wrong method name
**Location:** §8.3 line 925, §12 line 1506
**Problem:** Spec 01 §14.2 (line 2016) confirms actual method is `closeProject()`, not `closeCurrentProject()`. Spec 16 §12 line 1506 and §8.3 line 925 both call `closeCurrentProject()`.
**Fix:** Change `engine.project.closeCurrentProject()` → `engine.project.closeProject()` at both locations. (Note: §12 line 1505 correctly uses `saveCurrentProject()` which IS in spec 01 line 1131 — only the close variant is wrong.)

#### Issue #6 — `clipboard.copy`/`paste` method names diverge from spec 15
**Location:** §12 lines 1470–1472
**Problem:** Spec 16 §12 attributes `copy` → `clipboard.copy({ elements })` and `paste` → `clipboard.paste({ time, mode })`. Spec 15 §4.2 (lines 334, 336) attributes `copy` → `engine.clipboard.copyClipboardEntry({ elementIds })` and `paste` → `engine.clipboard.buildPasteClipboardCommand({ atTime, targetTrackId })`. Method names diverge.
**Fix:** Align spec 16 §12 with spec 15 §4.2 names (`copyClipboardEntry`, `buildPasteClipboardCommand`). Note: spec 15's `paste` returns a Command (build pattern), spec 16's `paste` is fire-and-forget — semantic divergence may also need resolution.

#### Issue #7 — `exportFCPXML`/`exportMaster` attributed to RendererManager; conflates FCPXML with video export
**Location:** §12 lines 1507–1508, §8.3 lines 926–929
**Problem:** Spec 16 §12 attributes `exportFCPXML` → `renderer.exportProject({ format: 'fcpxml' })` and `exportMaster` → `renderer.exportProject({ format: 'master' })`. Spec 01 §14.11 says `ExportManager` is greenfield (no FCPXML/cloud-render orchestration exists in OpenCut-classic) and that `RendererManager.exportProject` is for *video/MP4* export — not FCPXML. Spec 16 conflates the two.
**Fix:** Either (a) introduce `ExportManager` (greenfield per spec 01 §14.11) and attribute FCPXML/master/frame export there, or (b) clarify in spec 16 §12 that `renderer.exportProject({ format: 'fcpxml' })` is a *planned* extension to RendererManager (since spec 01 §14.11 currently says FCPXML is greenfield). Also note: spec 15 doesn't define export commands at all (out of wire-protocol scope).

#### Issue #8 — Appendix A duplicate-key bindings contradict §8.6 `register()` "throws on duplicate" invariant
**Location:** Appendix A lines 1540–1719 (30 keys duplicated, 61 duplicate rows total); §8.6 lines 1083–1087 (register throws)
**Problem:** §8.6 `register()` throws `Duplicate shortcut` if the same `ShortcutKey` is registered twice. But Appendix A registers 30 keys more than once. Some are legitimate context-dependent bindings (e.g., `K` = pause / add-keyframe depending on panel focus) — but the `register()` API takes only `key: ShortcutKey`, not a context discriminator, so the second registration would crash handler init. Worse, several duplicates have *overlapping* (non-disjoint) contexts:
  - `Cmd+Option+L` — "Toggle A/V link" (When clip selected, line 1613) AND "Unlock all tracks" (Always, line 1621). Both active when clip selected — real conflict.
  - `Cmd+Option+E` — "Reset all effects" (When clip selected, line 1691) AND "Export current frame" (Always, line 1669). Both active when clip selected.
  - `Cmd+Option+M` — "Unmute all tracks" (Always, line 1616) AND "Delete all markers" (Always, line 1640). Both Always — direct conflict.
  - `Cmd+Option+S` — "Solo focused track" (When track focused, line 1617) AND "Save a copy" (Always, line 1662). Both active when track focused.
  - `Cmd+Shift+M` — "Mute all tracks" (Always, line 1615) AND "Cycle marker color" (When marker at playhead, line 1641). Both active when marker at playhead.
  - `Cmd+Shift+S` — "Clear all solos" (Always, line 1618) AND "Save as" (Always, line 1661). Both Always — direct conflict.

These 6 direct conflicts are not documented in §6.1's conflict table.
**Fix:** (a) Refactor `ShortcutMap` to allow multiple descriptors per key (e.g., `Map<ShortcutKey, ShortcutDescriptor[]>`) and dispatch the first one whose `contextPredicate` returns true. Update §8.6 accordingly. (b) For the 6 overlapping-context duplicates, either reassign one of the bindings to a different key or add them to §6.1 with explicit resolution. (c) Verify §8.6's `register()` invariant is compatible with the new Map-of-arrays structure.

### MEDIUM severity

#### Issue #9 — Resolver `batch` case uses undefined function
**Location:** §8.3 line 933
**Problem:** `command.commands.map((c) => resolveToCommandInstance(c, engine))` calls `resolveToCommandInstance` which is not defined anywhere in the spec. Likely meant to be `resolveEngineCommand` (the function being defined) — but that returns `void | Promise<void>`, not a `Command` instance, so passing results to `BatchCommand(commands)` (which expects `Command[]`) is type-incorrect.
**Fix:** Either (a) define a separate `resolveToCommandInstance(command, engine): Command` helper that returns the Command instance without executing it (so batch can wrap), or (b) have batch recursively call `resolveEngineCommand` for each sub-command (skipping the `BatchCommand` wrapper entirely, since each sub-command already executes via `engine.command.execute()`). Approach (a) is cleaner — define `resolveToCommandInstance` explicitly.

#### Issue #10 — Resolver implementation incomplete (~40 of 60 cases missing)
**Location:** §8.3 lines 836–948
**Problem:** The `switch (command.type)` block has explicit cases for only ~20 of the 60 `EngineCommand` types defined in lines 759–819. Missing cases include: `seekToMarker`, `toggleLoopPlayback`, `selectTrack`, `findPlayhead`, `splitAndRemove`, `slip`, `copy`, `paste`, `pasteAttributes`, `freezeFrame`, `join`, `toggleAVLink`, `removeTrack`, `beginRenameTrack`, `editMarker`, `zoomToSelection`, `addEffect`, `toggleEffect`, `resetEffects`, `resetColorGrade`, `matchColor`, `addKeyframe`, `deleteKeyframe`, `clearKeyframes`, `seekToKeyframe`, `nudgeKeyframe`, `moveKeyframe`, `toggleKeyframeNav`, `exportFrame`. These fall through to `default` which throws `Unknown EngineCommand type`. The `// ... other Command imports` ellipsis (line 830) suggests abbreviation, but the spec text at line 951 says "The resolver is **pure** (no side effects beyond calling engine methods), so tests can call it directly" — which would fail for ~40 types.
**Fix:** Either (a) implement all 60 cases explicitly, or (b) add a note at line 830: "The resolver is abbreviated for brevity; the full implementation handles all 60 EngineCommand types per §8.3 union. The pattern for each missing case follows the established `engine.<manager>.<method>(command.params)` form."

#### Issue #11 — §6.1 #6 `Cmd+Shift+V` resolution is internally contradictory; §3.5 line 228 contradicts §6.1 + Appendix A
**Location:** §6.1 line 545 (conflict #6); §3.5 line 228; Appendix A lines 1607, 1622
**Problem:** §6.1 #6 says: "Cmd+Shift+V = paste overwrite (always). Visibility is Cmd+Option+V. But Cmd+Option+V = paste attributes (§3.4). Final: visibility is `V` when a track header has focus, `Cmd+Shift+V` elsewhere." The "Final" sentence contradicts the first sentence — if Cmd+Shift+V is "always paste overwrite", it can't also be "visibility when track header not focused". Meanwhile, §3.5 line 228 still lists `Cmd+Shift+V | Toggle track visibility (focused track)` — which is the un-resolved binding. Appendix A line 1622 correctly says visibility is `V` (track header focused), and Appendix A line 1607 correctly says `Cmd+Shift+V` is paste-overwrite (Always).
**Fix:** (a) Rewrite §6.1 #6 resolution to be unambiguous: "Cmd+Shift+V = paste-overwrite (always). Track visibility is `V` when a track header has focus, otherwise `V` = select tool. The track-header-focus context disambiguates." (b) Update §3.5 line 228 to remove the stale `Cmd+Shift+V | Toggle track visibility` row.

#### Issue #12 — §3.5 line 223 (`Cmd+S` solo) contradicts §6.1 #4 and Appendix A
**Location:** §3.5 line 223; §6.1 line 543; Appendix A line 1617
**Problem:** §3.5 line 223 lists `Cmd+S (track focused) | Solo toggle (focused track)` — but §6.1 #4 resolution says "Cmd+S = save (always). Solo is Cmd+Option+S". Appendix A line 1617 has the correct `Cmd+Option+S` for solo. §3.5 was not updated to reflect the §6.1 resolution.
**Fix:** Change §3.5 line 223 from `Cmd+S (track focused)` to `Cmd+Option+S` for solo. The `⚠ conflict` note can be removed (resolution is final).

#### Issue #13 — Spec 14 phase names diverge
**Location:** §13 lines 1522–1527
**Problem:** Spec 16 §13 invents phase labels "Phase 2 (timeline MVP)", "Phase 3 (full ops)", "Phase 4 (effects + color)", "Phase 5 (keyframes)", "Phase 6 (polish)". Spec 14 §2 (lines 19–25) actual phases are: P0 Playback spike / P1 Multi-track / P2 NLE ops / P3 Composition & transitions / P4 Color grading / P5 FCPXML export / P6 Cloud render. None of spec 16's labels match spec 14's phase names or content scope.
**Fix:** Update §13 to use spec 14's actual phase names and align shortcut categories to spec 14's phase content:
  - P1 Multi-track → §3.1, §3.2 (V, B), §3.3, §3.4 (basic), §3.10, §3.8 (view basics)
  - P2 NLE ops → §3.4 (full), §3.5, §3.6, §3.7
  - P3 Composition & transitions → (transitions not in spec 16's scope; defer)
  - P4 Color grading → §3.11 (color subset)
  - P5 FCPXML export → §3.9 (export subset)
  - P6 Cloud render → (cloud render shortcuts; minimal)
  - Post-P6 polish → §3.11 (effects), §3.12 (keyframes), §3.13, §7

#### Issue #14 — `toggleSnap` calls non-existent `engine.timeline.toggleSnap()`
**Location:** §8.3 line 846
**Problem:** Spec 01's `TimelineManager` interface (lines 138–200) does not have a `toggleSnap` method. Spec 06 §3 (line 70) documents snap as a module (`timeline/snapping/...`) not a manager method. Spec 16 invents `engine.timeline.toggleSnap()`.
**Fix:** Either (a) add `toggleSnap()` to spec 01's `TimelineManager` interface as a greenfield method (with §14.5 update), or (b) move snap toggle to UI state (`engine.ui.toggleSnap()`) consistent with Issue #4's UIManager addition, or (c) refactor `toggleSnap` EngineCommand to a UI-state command (not on engine).

#### Issue #15 — Multi-tap JKL combos not in Appendix A
**Location:** §3.1 lines 115–120 (J×2, J×3, L×2, L×3, K+J, K+L); Appendix A playback rows (22)
**Problem:** §3.1 documents 6 multi-tap / sequence combos as table rows. Appendix A omits all 6 (registry playback entries = 22 vs §3.1 = 32). The 10-row delta also includes 2 `Home`/`End` alt bindings (lines 127–128) and 2 `Shift+I`/`Shift+O` preview-in/out bindings (lines 135–136) omitted from Appendix A.
**Fix:** Either (a) add 10 rows to Appendix A (4 multi-tap, 2 K-then-J/L sequences, 2 Home/End alts, 2 preview in/out), or (b) document that multi-tap sequences are tested via the base `J`/`L`/`K` keys (not separate testIds), and add the 4 omitted single-key rows.

### LOW severity

#### Issue #16 — §3.5 line 228 `Cmd+Shift+V` (visibility) contradicts §6.1 #6 (paste overwrite)
Already covered under Issue #11. Listed separately for tracking.

#### Issue #17 — Pattern 4 (mouse-only) lacks speed benchmark
**Location:** §4 line 448–466
**Problem:** Patterns 1–3 each include explicit speed benchmarks (60ms, 5ms, 12ms per step). Pattern 4 has only descriptive text ("200–800 ms" for drag is mentioned in §1 line 54, but Pattern 4 itself has no per-step benchmark).
**Fix:** Add a benchmark line under Pattern 4, e.g., "Speed: ~200–800 ms per drag (20 mousemove events with `waitForTimeout` between moves). ~10× slower than Pattern 2."

#### Issue #18 — `Cmd+E` re-used in cheat-sheet modal conflicts with `Cmd+E` for FCPXML export
**Location:** §7.3 line 611 ("Export — `Cmd+E` in the modal exports the map as JSON"); §3.9 line 303 (`Cmd+E` = Export FCPXML)
**Problem:** When the cheat-sheet modal is open, `Cmd+E` would be intercepted by the modal focus trap (per §6.2 context-resolution order step 1: modal > always). This is *intended* behavior (modal catches Cmd+E) but is not documented in §6.1's conflict table.
**Fix:** Either (a) add a §6.1 row #13 for `Cmd+E` (modal-export vs FCPXML-export), or (b) change the modal's export key to something non-conflicting (e.g., `Cmd+Shift+E` — but that conflicts with `Cmd+Shift+E` for export master per §3.9 line 304). Cleanest fix: use `Cmd+S` in the modal to "save the map as JSON" (matching "save" semantics).

#### Issue #19 — §3.11 `R` (in color page) for "Reset color grade" conflicts with `R` (tools) for "Ripple mode toggle"
**Location:** §3.2 line 155 (`R | Ripple mode toggle`); §3.11 line 332 (`R (in color page) | Reset color grade`); Appendix A lines 1569, 1693
**Problem:** Two different actions on `R`. §3.2 context = Always; §3.11 context = "When clip selected, color page active". Per §6.2 context-resolution order (panel > always), color-page-R wins when color page is active — but this is not in §6.1's conflict table. Also would crash §8.6 `register()` per Issue #8.
**Fix:** Add to §6.1 conflict table as #13: "`R` (ripple-mode toggle vs reset-color-grade) — Panel focus determines op. Color page active → reset color grade; otherwise → ripple toggle." Refactor `ShortcutMap` per Issue #8.

#### Issue #20 — `S` (split alt binding) not in §6.1 conflict table
**Location:** §3.4 line 189 (`S | Split at playhead (alt, single-key)`); §6.1 #4 covers `S` only as solo/save
**Problem:** §3.4 introduces `S` as a third binding for split (alongside `Cmd+B` and `Cmd+Shift+B`). §6.1 #4 addresses `S` only in the solo/save context, not the three-way split/solo/save ambiguity. The `S` for split alt is mentioned in §11 (line 1425) but its disambiguation with solo (`Cmd+Option+S` post-#4 resolution) is not explicit.
**Fix:** Extend §6.1 #4 to cover the three-way: "`S` = split-at-playhead (alt binding). Solo is `Cmd+Option+S`. Save is `Cmd+S`. No conflict — `S` and `Cmd+S` and `Cmd+Option+S` are distinct."

#### Issue #21 — §0 TL;DR row "Test integration" claims "3 named patterns" but §4 documents 4
**Location:** §0 line 19 ("3 named patterns"); §4 (4 patterns)
**Problem:** §0 says "3 named patterns + Playwright recipes (§4, §9)" but §4 actually documents 4 patterns (Pattern 4 = mouse-only).
**Fix:** Change §0 line 19 from "3 named patterns" to "4 named patterns".

#### Issue #22 — Resolver signature mismatch: returns `void | Promise<void>` but text says "converts to Command instance"
**Location:** §8.3 lines 750–753 (text), 832–835 (signature)
**Problem:** §8.3 text says resolver "converts a serializable `EngineCommand` into either: (1) A direct manager method call, OR (2) A `Command` instance pushed through `CommandManager.execute()`". But the actual `resolveEngineCommand(command, engine): void | Promise<void>` signature returns void — it directly dispatches (calling `engine.command.execute({command: cmd})` internally) rather than returning a Command. This means `batch` case (line 933) cannot get Command instances from recursive calls (Issue #9).
**Fix:** Either (a) split into two functions: `resolveToCommandInstance(command, engine): Command` (for undoable ops) + `applyDirectly(command, engine): void | Promise<void>` (for non-undoable ops), with `resolveEngineCommand` choosing between them — and have `batch` use `resolveToCommandInstance`; or (b) change the §8.3 prose to match the actual signature: "The resolver dispatches the command — either calling the manager method directly (for non-undoable ops) or constructing a Command instance and immediately executing it via `engine.command.execute()` (for undoable ops). The resolver returns void/Promise<void>; the Command instance is not exposed to callers."

---

## Recommendation

**Conditionally accept TEST-03 as PASS-WITH-CONDITIONS.** The spec demonstrates comprehensive scope and architectural soundness in its treatment of keyboard interaction patterns, conflict resolution methodology, accessibility, and test-friendliness. However, the stale cross-reference to spec 15 (Issue #1) and the resulting EngineCommand union divergence (Issue #2) are blocking: spec 16's §8.3 cannot be normative while spec 15 defines a different canonical union. Issue #8 (Appendix A duplicate-key bindings vs §8.6 register-throws invariant) is a self-contradiction that would crash handler init if the spec were implemented literally.

**Blocking issues (must fix before downstream consumption):**
- #1 (stale spec 15 references) — required for spec 15/16 consistency
- #2 (EngineCommand union divergence) — required for spec 15/16 consistency
- #4 (`engine.ui` not in spec 01) — required for spec 01/16 consistency
- #5 (`closeCurrentProject` wrong method name) — required for spec 01/16 consistency
- #6 (`clipboard.copy/paste` divergence from spec 15) — required for spec 15/16 consistency
- #8 (Appendix A duplicates vs §8.6 invariant) — required for self-consistency
- #11 (§6.1 #6 internal contradiction + §3.5 stale row) — required for self-consistency

**Non-blocking follow-ups (can be deferred to a spec 16 v1.1 revision):**
- #3 (binding count harmonization) — cosmetic, but should be fixed for clarity
- #7 (export attribution) — requires coordination with spec 01 §14.11 (ExportManager greenfield)
- #9, #10, #22 (resolver implementation completeness) — the spec is documentation, not literal code; can be clarified with "abbreviated for brevity" notes
- #12, #13, #14, #15, #17, #18, #19, #20, #21 — minor inconsistencies and missing entries

**Downstream readiness:** Spec 17 (test plan, TEST-04) references spec 16 indirectly via the three-tier methodology. Spec 12 (testing strategy) doesn't directly reference spec 16. Spec 15 (wire protocol, TEST-02) refers to spec 16 as "TBD" in its successor list (line 7) — that reference is also stale on spec 15's side and should be updated when spec 16 is revised.

**Suggested fix order:**
1. Resolve Issues #1, #2, #4, #5, #6 (cross-spec alignment) in a single revision pass.
2. Resolve Issue #8 by refactoring `ShortcutMap` to Map-of-arrays (or document the merge-descriptors approach).
3. Resolve Issue #11, #12 by updating §3.x tables to match §6.1 resolutions.
4. Resolve Issues #3, #21 (count harmonization) — pick 180 as canonical, update all references.
5. Resolve remaining medium/low issues as time permits.

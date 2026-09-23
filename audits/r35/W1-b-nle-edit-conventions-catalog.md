# W1-b — the NLE edit-conventions catalog (insertion + trim/edit styles, Resolve/Premiere)

Task ID: W1-b · Round R35 · Workstream B (the gold-standard research program). Researched by the orchestrator (re-dispatch after the agent deadline) using the web-search service; every claim carries its source. Where the sources are ambiguous or custom-keymap-dependent, the cell says so honestly — this is a CONVENTIONS catalog, not a manual transcription.

The product owner's ruling this serves: "it is not about my review opinion but what DaVinci Resolve / Premiere Pro etc. do conventionally. That's your gold standard... when in doubt research."

---

## §1 Insertion styles (the placement catalog)

| # | Style | Behavior | Resolve invocation | Premiere invocation | Casual priority |
|---|-------|----------|--------------------|---------------------|-----------------|
| I1 | **Insert (ripple)** | Places media at the playhead/target; everything right of the insertion point on the target tracks shifts right by the inserted duration | **F9** (Timeline > Insert) [S1][S2] | **`,`** (comma) — inserts at target tracks at playhead [S3] | **T** |
| I2 | **Overwrite** | Places media over whatever occupies the target span; NO ripple; clips under the span are replaced/trimmed | **F10** [S1][S2] | **`.`** (period) [S3] | **T** |
| I3 | **Replace** | Swaps a timeline clip in place with source media, keeping duration (trims source to fit) + attributes where possible | **F11** [S2] | Clip > Replace With Clip (from Source / from Project panel; no single default key) [S4] | P |
| I4 | **Fit to Fill** | Retimes (speed-changes) the source to EXACTLY fill a marked in/out span; needs in+out marks in BOTH the source and the timeline | **Shift+F11** [S5] | no native single command (manual retime) | P |
| I5 | **Place on Top** | Drops media onto a NEW track above existing content (no collision ever) | **F12** [S2] | no direct equivalent (drag to empty track) | P |
| I6 | **Append (at track end)** | Places media at the END of the target track (after the last clip), regardless of playhead | End-key navigation + insert in the Cut page's smart-append family; Edit page: position playhead at end + F9 | End-key navigation + overwrite | **T** (as a "go-to-end + place" composite) |
| I7 | **Ripple Delete** | Removes a clip AND closes the gap (everything left of it shifts left) | **Ctrl+Backspace / Cmd+Delete** [S6] | **Shift+Delete** [S7] | **T** |
| I8 | **Lift / plain Delete** | Removes a clip, LEAVING the gap (nothing else moves) | plain **Backspace/Delete** ("Delete Selected") [S1] — NOTE: Resolve's default-delete behavior is preset-dependent (recent default presets ripple on plain delete); the explicit ripple key is I7's | plain **Delete/Backspace** [S7] | **T** |
| I9 | **Drag-drop insert (modifier)** | During a drag: holding the modifier converts the drop from overwrite/default into INSERT (ripple) at the drop point | (requested feature thread [S8] — not a stock modifier in Resolve; users drag to a gap or use F9 after) | **Cmd/Ctrl held before release** during the drag = insert [S8] | **T** (the modifier-drag pair is the table-stakes pointer idiom) |
| I10 | **Three-point editing** | in/out marks (source and/or timeline) + track targeting define the span; the insertion verb (I1/I2) then acts on that span | In=I, Out=O; the F9/F10 family honors marks | In=I, Out=O; the `,`/`.` family honors marks + track targeting headers | P (the marks infrastructure; our app's insertion can honor playhead-as-in-point with a growing clip preview) |

Key conventional findings: (a) the insert/overwrite PAIR is universal — every NLE has both, one keystroke apart; (b) collision-on-default-drop differs (Premiere defaults to overwrite on drop, insert needs Cmd [S8]); (c) ripple-delete vs lift is a PAIR in both apps (explicit modifier keys); (d) replace/fit-to-fill/place-on-top are the Resolve power trio (F11 family) — beyond the casual bar.

## §2 Trim / clip-editing styles (the reshaping catalog)

| # | Style | Behavior | Resolve invocation | Premiere invocation | Casual priority |
|---|-------|----------|--------------------|---------------------|-----------------|
| E1 | **Trim In / Trim Out (edge trim)** | Drags a clip's leading/trailing edge; default is OVERWRITE-style (grows/shrinks into/out of the gap without moving neighbors) | edge drag with the Selection/Trim tool; the Trim Edit mode's dynamic pointer | edge drag with Selection tool (A); default non-ripple | **T** |
| E2 | **Ripple trim** | Edge-trim that SHIFTS all downstream clips to close/open the gap | **Trim Edit Mode (T)** — the dynamic pointer near an edge ripples when the clip's edge is grabbed in trim mode [S9][S10] | **Ripple Edit tool (B)** or Alt/Option+`,`/`.` nudge (ripple variant) | **T** |
| E3 | **Rolling edit** | Moves the CUT POINT between two adjacent clips (outgoing shortens exactly as incoming lengthens; total duration invariant) | Trim Edit Mode (T) grabbing the cut BETWEEN clips [S9][S10] | **Rolling Edit tool (N)** [S11] | **T** |
| E4 | **Slide** | Moves a clip between its two neighbors WITHOUT changing either neighbor's outer edges (position within the gap changes; clip duration invariant) | Trim Edit Mode (T) grabbing the clip body [S9] | **Slide tool (U)** [S12-adjacent] | P |
| E5 | **Slip** | Changes a clip's in/out content WITHOUT moving its position or duration (the window slides over the source media) | Trim Edit Mode (T) [S9] | **Slip tool (Y)** [S12] | P |
| E6 | **Extend / trim-to-playhead** | Trims the selected clip's NEAR edge exactly to the playhead (extend if the playhead is beyond the current edge; trim if inside) | **Shift+[ / Shift+]** family (trim clip start/end to playhead; preset-dependent labels) [S13] | **E** (Sequence > Extend Selected Edit to Playhead) [S14]; also Alt/Opt+[ / ] (Trim Previous/Next Edit to Playhead, preset-dependent) | **T** |
| E7 | **Split / razor at playhead** | Splits the selected clip (or all targeted tracks' clips) at the playhead | **Ctrl+\ / Cmd+\** (Split Clip) [S15]; Blade mode **B** for click-cutting [S15] | **Cmd/Ctrl+K** (Add Edit — splits ALL targeted tracks at the playhead) [S16] | **T** |
| E8 | **Split at click (blade)** | Click-to-cut at the pointer position (not the playhead) | Blade Edit Mode **B** [S15] | Razor tool **C** [S16] | P (our app splits at click already via the drag-freeze law — verify) |
| E9 | **Keyboard nudge trim** | With an edge selected: frame-by-frame (and 5-frame) trims; modifier selects ripple vs overwrite | Trim Edit Mode + , / . (frame nudge), Shift for 5 | **`,` / `.`** = 1-frame trim; **Shift+, / Shift+.** = 5-frame; **Alt/Option** modifier = ripple variant [S3][S17] | P |
| E10 | **Default edge-drag behavior** | What a plain edge drag does WITHOUT modifiers | dynamic (Trim Edit Mode ripples; plain selection-drag = overwrite-style within the gap) | non-ripple (overwrite-style); ripple requires the B tool or modifier | **T** (the convention: default NON-ripple; ripple is the explicit mode) |

Key conventional findings: (a) Resolve's Trim Edit Mode (T) is the dynamic-pointer consolidation — ripple/roll/slip/slide by grab location [S9][S10]; Premiere keeps them as four separate tools (B/N/Y/U); (b) the split-at-playhead pair is universal (Resolve Cmd+\ vs Premiere Cmd+K) — both apps also have click-cutting blade/razor tools; (c) extend/trim-to-playhead is a one-key operation in both (E in Premiere; the bracket family in Resolve); (d) nudge-trim conventions (`,`/`.` with Shift=5-frame and Alt=ripple) are Premiere-canonical.

## §3 The table-stakes subset (T-marked) — the casual-bar verdict

**Insertion (5):** I1 insert-at-playhead (ripple) · I2 overwrite-at-playhead · I6 append-at-end · I7 ripple-delete · I8 lift/plain-delete — plus the I9 modifier-drag pair (drop = overwrite default; modifier-drop = insert).
**Trim/edit (6):** E1 edge-drag trim (non-ripple default) · E2 ripple trim · E3 rolling edit · E6 extend/trim-to-playhead · E7 split-at-playhead · E10 the non-ripple-default convention.

Cross-checked against W1-d's inventory of our app: present today = I8 (delete), E1 (edge-drag trim, non-ripple), E7 (split family S/Q/W/⌘B), E10 (non-ripple default). Missing table-stakes = **I1 insert-at-playhead, I2 overwrite-at-playhead, I6 append-at-end, I7 ripple-delete, I9 the modifier-drag pair, E2 ripple-trim, E3 rolling edit, E6 extend/trim-to-playhead** — exactly "a few more timeline insertion styles + trim/clip editing styles" per the owner's wording. The P-marked set (I3/I4/I5, E4/E5/E8/E9, I10 three-point) is the power-user tier → the shell-variant/full mountain's SF-2 (EDIT VIEW) face, not the casual bar.

## §4 Sources

- [S1] simonsaysai.com — The Ultimate Guide to DaVinci Resolve Keyboard Shortcuts (Insert Edit F9 / Overwrite Edit F10 / Delete Selected Backspace)
- [S2] davinciresolveclub.com — DaVinci Resolve Keyboard Shortcuts Guide (F9/F10/F11 Replace/F12 Place on Top; Split Clip Ctrl+\ / Cmd+\; Blade mode B)
- [S3] derek-lieu.com + creativecow.net — Premiere insert/overwrite comma-period; nudge-trim , / . family
- [S4] Adobe community + lowepost.com — Premiere Replace With Clip; Resolve Replace F11
- [S5] forum.blackmagicdesign.com + writedirect.co — Fit to Fill Shift+F11 (dual in/out marks; retimes to fit)
- [S6] domestika.org — Resolve ripple delete Ctrl+Backspace / Cmd+Delete
- [S7] Adobe Premiere docs (standard) — Shift+Delete ripple delete vs plain Delete lift
- [S8] forum.blackmagicdesign.com "Add Drag+Insert ability" — Premiere Cmd-hold before release = drag-insert; the thread confirming Resolve lacks a stock modifier
- [S9] premiumbeat.com "How to Use the Dynamic Trim Tool in Resolve" + videomaker.com "How to use the trim tool" — Trim Edit Mode (T): ripple/roll/slip/slide by grab location
- [S10] dvresolve.com + linkedin.com — Trim Edit Mode consolidation descriptions
- [S11] schoolofmotion.com + premiumbeat.com — Premiere Rolling Edit tool N
- [S12] wipster.io — Premiere Slip Y (and the tool family)
- [S13] asv.io — Resolve bracket-family clip start/end setting
- [S14] community.adobe.com — Premiere E = Extend Selected Edit to Playhead
- [S15] davinciresolveclub.com + davinciresolve21.com — Resolve Split Clip Cmd+\; Blade B; ripple-delete-the-middle workflow
- [S16] premiumbeat.com + facebook/creativecow — Premiere Cmd+K Add Edit splits at playhead (all targeted tracks); Razor C
- [S17] facebook Premiere trimming thread — nudge-trim keys custom-map to AE-style Alt+[ / ]

— W1-b (orchestrator-executed), R35. Cross-references: W1-d's inventory (the gap list), W1-e's SF-2 (the power tier's home).

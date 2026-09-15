# research-pagefx — the 3-vs-5 page shape + the FX-page grammar (R28-W1-j, decision D3)

**Agent:** research-pagefx (the R28 seal round, W1 research pack) · **Date:** 2026-09-15 · **Task:** R28-W1-j · **Read-only:** nle-core-spec (+ the in-repo mocks), nle-ui, nle-test-app. One output file; no commits.

**Mandate** (ARCH-R28 §2 Group D row D3, `audits/ARCH-R28-seal-round.md:58`): the register's OPEN rows 7-8 as ONE joint decision — (a) amend 18 to five pages with audio-focus pinned as a mode, or (b) the 3-page stands with both extra pages registered deviations; the FX grammar (fifth page vs FX-as-a-mode per the mock's one-flag law), the FxBrowser row grammar, the fx-selection domain, ruling 22, and the 16 ⌘3 reconciliation all land with it. Owners: 18 + 16 (+07 cross-ref). The mixer family (register row 20) rides row 8.

---

## 1. The current 18-side law — what "three pages" owns today

### 1.1 The page structure (§4.8)

- **18 §4.8** (`18-ui-shell.md:219-221`): "page dock — **three pages, not seven**" — `Edit` / `Color` / `Deliver`. The divergence is already documented **as three-way**: this spec's 3 vs "the BASE nle-ui's 4 (+Audio — `Page = 'edit'|'color'|'audio'|'deliver'`…)" vs "the variants mock's 5 (+Audio +FX) — registered OPEN, D35.4; a future design round's call". Dropped pages: Media, Cut, Fusion, Fairlight (§8.2-8.4, `:388-390`).
- **18 §2.1/§2.2** (`:55-84`): the reference is the DaVinci Resolve Edit-page clone (`ui-mock/davinci_resolve_ui_mock.html`) — whose own dock draws the **full 7-tab page set** Media/Cut/Edit/Fusion/Color/Fairlight/Deliver (`davinci_resolve_ui_mock.html:987-1005`). Simplification rule 1 (`:80`): "Remove chrome whose only job is discovery of **features we don't have** (menu bar, Fusion/Fairlight pages…)". The 3-page cut was a v1.0 scope call (no DAW core, no compositing), made **before** Decision 13 adopted the DAW core and before the mixer/effects surfaces grew.
- **18 §3.1 diagram** (`:111`): the app-dock row reads "page dock (Edit/Color/Deliver)".
- **18 §0** (`:33`): "The 3-vs-5-page dock divergence stays a REGISTERED OPEN DECISION (D35.4 — …§4.8's three-page ruling is untouched; 16 §0's K3 row carries the ⌘3 key half)."
- **18 §8.8** (`:394`): Mixer/Metadata "Removed… **REGISTERED DIVERGENCE (R27):** the accepted BASE ships an Audio page (`Page = 'edit'|'color'|'audio'|'deliver'` — nle-ui useUiStore.ts:17) with the full mixer family (ChannelEditor/ChannelStrip/MixerDock — AppShell.tsx:308-330/:373), and the variants mock adds an FX page (5-page set); the register's mixer-family row owns the law… the removal ledger records the v1.0 chrome decision, **not a ban on the BASE's landed surface**."

### 1.2 The FX rows 18 already has (16-side landed, 18-side half-absent)

- **18 §4.11** (`:245-253`): the EffectsPanel — a **220px Edit-page rail** (`shell-effects`), ⌥2 keyboard route, registry list (effects from 08 §3 + "transitions from **spec 07 §6.3's 27-entry presentation registry**", `:249`), the frozen drag MIME `application/x-nle-effect {name, cat}` (`:250`), and the **R24-A1 DnD routing canon already landed** (`:251` — replace-never-stack, one law three doors, fade rows → `setFade`, SEAM_EPSILON 1ms adjacency refusal, empty-lane pure no-op, dbl-click apply). What 18 does NOT have: the FX **page** (browser + inspector + timeline-in-fxMode), the fx-selection domain, ruling 22, the density exemption.
- **18 §4.5** (`:203`): the FX tool — "a seventh radio member… reachable via the radio + the ⌘5 FX-page chord; **implies fxMode; leaving the FX page re-seats a stranded fx tool to select**" — the spec already speaks the page-coupling grammar while denying the page exists.
- **18 §4.7** (`:217`): the ViewOptionsPopover row already names the FX page: "Compact-tracks checkbox — **DOM-absent on the FX page**" (the density exemption, absorbed R27-W6 with no FX-page rows to hang it on).
- **18 §4.4** (`:199`): the inspector refresh law covers "any view/editor-mode/**page** transition" — page vocabulary with a 3-page inventory.

### 1.3 The page-adjacent rows (dock, keys, per-page state)

- **The ⌘-keymap (16 §3.8, `16-keyboard-shortcuts.md:365-368`):** ⌘1 Edit / ⌘2 Color / **⌘3 "Effects workspace"** / ⌘4 Audio workspace; **no ⌘5 row, no Deliver key**. The R23 reconciliation note (`:378`): the live grammar is "⌘1 Edit / ⌘2 Color / ⌘3 **Deliver** / ⌘4 Audio / ⌘5 **FX** (R23-WA) — this table's ⌘3 = 'Effects workspace' collides with the live ⌘3 = Deliver… the ⌘3 reconciliation… is the pending edit." 16 §0's K3 row (`:28`) carries the same PENDING. The ⌘5 chord exists only inside §3.2's FX-tool note (`:194`), not as a §3.8 row. App A mirrors the collision (`kbd-workspace-effects` ⌘3, `:2276`).
- **The per-page timeline view memory (R25-W6, mock-side; the C57 R3/R5 halves):** the variants' `pageTimelineView` — `useUiStore.ts:1241-1252` — seeds **one entry per page for all five pages** (`edit/color/audio/fx/deliver`), each `{compact, clipStyle, waveforms}` (`:75-87`); `compact` is the 4-way scope `'off' | 'video' | 'audio' | 'all'` (audio page defaults `'video'` — video compacts, audio lanes stay full for waveforms; every other page `'off'`); the resolvers are the single writers (`:239-267`), with `resolveTimelineCompactScope` **forcing `'off'` on `page === 'fx'`** (the R-b law: the FX timeline is the FULL Timeline — seam hit-zones need real lane pixel geometry). 18 §4.7 absorbed the popover contract (register row 21) but not the per-page map — the map presupposes the 5-page world.
- **The console-row TAB strips (R25-W3/W5):** `consoleTab: 'timeline' | 'nodes' | 'scopes' | 'export'` (`useUiStore.ts:725`, `:1239`) — Timeline on every page; **Nodes/Scopes = color-page surfaces; Export = the deliver surface**; the exit law resets to `'timeline'` when leaving the owning page (`:1300-1310`). The left-dock table: Edit = Media Pool, Color = Gallery, **Audio = Sound Library, FX = Effects (the FxBrowser), Deliver = hidden (null)** — `leftDockContent.ts:36-43`.

### 1.4 What "amend to five pages" would concretely change

The page list (18 §4.8 + §3.1 diagram + §8.2-8.4/§8.8 ledger re-litigations); the keymap (16 §3.8's ⌘3 row + the new ⌘5 row + App A); the per-page state (18 §4.7 gains the pageTimelineView law, five entries); and the page specs — 18 has **no AudioPage or FXPage section at all** today (nle-ui ships no `AudioPage.tsx`/`FXPage.tsx` components either: the audio page is composed in `AppShell` branches — `nle-ui/AppShell.tsx:308-311` `page === 'audio' ? <ChannelEditor />`, `:329` `<SoundLibrary />`; the FX page exists **only in the variants mock**).

---

## 2. The live reality (the three trees + the reference)

### 2.1 The variants mock — the design of record (5 pages)

- **The dock:** `AppDock.tsx:11-27` — Edit (⌘1) / Color (⌘2) / **Audio** (⌘4, "Audio focus — BGM / SFX mixing") / **FX** (⌘5, "transitions & fades", between Audio and Deliver) / **Deliver** (⌘3). The Audio page is a **TOGGLE** — re-clicking the active audio tab **exits** focus mode (`:53-60`, the R13 re-entry law); all other pages are plain `setPage`.
- **The store:** `Page = 'edit' | 'color' | 'audio' | 'fx' | 'deliver'` (`useUiStore.ts:58`); `ToolId` gains `'fx'` (`:52`).
- **The one-flag law (the FX engine):** `fxMode: boolean` — "**written ONLY by setTool** (fx tool ⇔ fxMode off the FX page) **and setPage** (fx page owns it; leaving resets)" (`useUiStore.ts:563-567`, the writers at `:1264-1273` setPage and `:1421-1437` setTool). **Two doors, one engine**: the FX page (browser / viewer / FX inspector / full timeline in fxMode) AND the Edit-page FX tool (README.md:158-160). The exit laws: leaving the FX page re-seats a stranded fx tool to select (`:1271`); the fx-selection domain dies with the page-exit, widened to the whole fx SCOPE `page === 'fx' || fxMode` (R24-W0 F5 + R25-W6-B, `:1281-1288`).
- **The FX page layout:** left dock = **FxBrowser** (`components/fx/FxBrowser.tsx`), right rail = **FxInspector** (`AppShell.tsx:341`, `:371` `page === 'fx' ? <FxInspector />`), timeline = the FULL Timeline in fxMode (density exemption, §1.3 above), mainbody at the 40% Edit default (ruling 1, `AppShell.tsx:318-325`).
- **The audio page:** right rail = **ChannelEditor** (the S/G seam: Clip section over Track section), left dock = **Sound Library** (audio-filtered pool with role grouping), the **MixerDock** beside the lanes — and the Toolbar2 mixer toggle is **AUDIO-ONLY**: "entering a page whose toolbar carries NO mixer toggle collapses the console… the exit law keeps every console closable on the page that owns it (audio)" (`useUiStore.ts:1294-1296`, the R23-WB D-B5/#92 → R24-W1 A3-R3 law; README.md:195-197 cites Resolve's own posture: "the Edit page can show a mixer only via Workspace"). `enterAudioFocus(trigger: 'dock'|'shortcut'|'escalation', trackId?)` / `exitAudioFocus` (`:2015-2062`) — a **mode with a page button**, not a hard page split: "No Fairlight-style hard page split. Audio is a *focus mode* in the existing page-dock grammar… The app keeps ONE timeline, ONE clock, ONE command stream" (`docs/DESIGN-audio-mode.md:11`); Esc always exits Audio→Edit (`:52`).
- **The keymap:** `shortcutMap.ts:92-97` — ⌘1/⌘2/⌘3 = Edit/Color/Deliver; **⌘4 = "Toggle Audio focus"**; **⌘5 = "FX page — transitions, fades & effect stacks"**; Esc rows for both exits.
- **Test evidence:** AppDock.test 6 pins (the audio-toggle + fxMode-coupling rows, incl. "the FX page button sits between Audio and Deliver; its click couples fxMode on", `AppDock.test.tsx:65`); FxBrowser 12 + FxInspector 14; TimelineCompact 30 (the density law); MixerDock 42 + ChannelEditor 28 + ChannelStrip 49 + MixerPrimitives 49 + SoundLibrary 11 + mockMixer 15 (register rows 7/8/20's pins). The VLM corpus carries the page shots: `r23-analysis/shots/shell-appshell/{edit,color,audio-focus,deliver}.png` + `timeline/timeline--fx-mode.png`.

### 2.2 The accepted BASE (nle-ui, the productized package — 4 pages) and the app

- nle-ui: `Page = 'edit' | 'color' | 'audio' | 'deliver'` (`src/state/useUiStore.ts:17`); the dock renders 4 (`AppDock.tsx:11-14`); ⌘4 = "Toggle Audio focus (BGM / SFX mixer)" (`shortcutMap.ts:99`); the audio page = ChannelEditor rail + SoundLibrary dock + MixerDock (`AppShell.tsx:308-311`, `:329`, `:373-377`). No FX page (the absorption is XMOCK-6's r5 rider).
- nle-test-app renders nle-ui's `<AppShell />` (`src/App.tsx:15,52`) — the app's live dock TODAY is the 4-page BASE grammar (⌘1/⌘2/⌘3 Deliver/⌘4; the r9 audit's "⌘1/2/3/4 pages" row, `docs/audit-app-flows-r9.md:70`). The K3 acceptance ("the app-side page-key tests at K3", 16:28) needs the page inventory ruled to even write.

### 2.3 The FX adoption content (register row 7's named payload)

- **The FxBrowser row grammar** (`FxBrowser.tsx:41-55`): sections Effects (5 rows) / Video Transitions (**ALL 27 registry presentations** — `TRANSITION_PRESENTATIONS`, mirroring the engine's 27 built-ins) / Fades (6 presets: "Fade In/Out 0.5/1/2s"); the frozen drag payload `application/x-nle-effect {name, cat}`; rows `shell-fxbrowser-row-<slug>` (`:119`). **Fade rows route to `setFade`, NOT `addEffectToElement`** — "a fade is a model field, not a stack entry" (Part IX ruling 6, `FxBrowser.tsx:6-12`). The 27-row source is **07 §6.3's presentation registry** (`07-composition.md:348` — "registry, not union. …27 entries in the reference… nle-engine `transitions/registry.ts:2249`"), which is why 07 carries the cross-ref in this ruling.
- **The fx-selection domain** (`useUiStore.ts:88-103`): `SelectedFxObject {kind: 'transition'|'fade', elementId, side?}` — mutually exclusive with every other selection domain, kept alive while its element stays selected, cleared by removeTransition/removeFade, the scene switch, and the page-exit law; the FxInspector is its param surface (transition duration/alignment/presentation + fade duration with the store-owned clamp [0, clip duration]).
- **Ruling 22** (delete-transition-first, `useShortcuts.ts:207-231`): on the FX page / in the FX tool, Delete deletes the **selected transition or fade object FIRST** (scoped `page === 'fx' || fxMode`, R24-W5d), then the clip-selection law; the shortcutMap's clips-delete row documents it (`shortcutMap.ts:56`).
- **The R24-A1 DnD routing canon** — already absorbed spec-side at 18 §4.11 (`:251`, the W3 `0a45d17` landing); the FX-page door only adds WHERE the browser lives.

---

## 3. The option space

**(a) FIVE PAGES (18 amended).** Edit/Color/Audio/FX/Deliver as dock peers; Audio **pinned as a focus mode** (a toggle button in a page dock — the mock's own law); FX the fifth page **driven by the one-flag law** (fxMode, two doors: the page + the Edit-page FX tool); 16's ⌘3 → Deliver, ⌘5 row added; the FxBrowser grammar + fx-selection domain + ruling 22 land in 18; the mixer dock is the Audio (focus-mode) page's surface.

**(b) THREE PAGES + registered deviations.** Edit/Color/Deliver stand; Audio+FX registered as **modes-of-Edit** (FX-as-a-mode per the one-flag law — the FX page demoted to a mode label; audio-focus already is a mode); the ⌘ rows reconciled differently (⌘3 stays Effects-workspace or is re-registered as a mode chord; ⌘4/⌘5 become mode toggles).

---

## 4. Analysis against the named criteria

1. **The register row-20 mixer coupling.** The audio page IS the mixer's home — the mock's law is explicit: the Toolbar2 mixer toggle is audio-page-only; entering any non-audio page **collapses an open mixer** (the "every console closable on the page that owns it" law, `useUiStore.ts:1294-1296`). Under (b), the mixer would have to be re-homed as an Edit-page surface — a direct re-litigation of the R23-WB D-B5/#92 ruling that chose audio-page-only precisely because "Resolve's Edit page shows a mixer only via Workspace" (README.md:195-197), and it would strand 20's M2 design round (r2) against a surface the spec refuses to name. Under (a), the mixer's home is simply the Audio focus-mode page; 20 §7 keeps the real-mixer surface ownership at r2 with a named address.
2. **The C16/⌘-keymap coherence.** The live grammar (⌘1/⌘2/⌘3-Deliver/⌘4-Audio/⌘5-FX) is identical in nle-ui, the variants, and the app port; only 16's table diverges (its ⌘3 "Effects workspace" is a dead letter — no such workspace exists in ANY tree; its ⌘4 "Audio workspace" already matches). Option (a) reconciles by **two row edits** (⌘3 re-homed to Deliver; the ⌘5 row promoted from §3.2's note to a table row). Option (b) preserves the collision as a permanent registered deviation and leaves the K3 app-side page-key tests (16:28's acceptance) pinned against off-spec behavior — the corpus would keep "ruling 3 pages and validating a 5-page mock" (xcut-shell-mocks.md D7's own words, `:127`).
3. **The VLM/register rows.** The register's rows are the crawl's verification worklist (the K3/VLM tie, register `:13`): the VLM corpus already shoots `shell-appshell--audio-focus` + `timeline--fx-mode`; row 8's MOCK-YIELDS-REGISTERED can never flip LANDED under (b) (the mock never yields — it is "the design of record" per 18 §0), so the **D26.4 mock-retirement triggers (post-K4/w1) would deadlock on rows 7/8**. Under (a) both rows flip at the amendment.
4. **The w1-entry phase tag.** The plan pins "the register's OPEN decisions phase-tagged: **page-shape + FX grammar at w1-entry**" (IMPLEMENTATION-PLAN.md:25) — because "the page-shape + FX-grammar pair plausibly gates w1's chrome/token wiring (the MiniShell C0 consumes 18's page model)" (fleet-r27/review-plan.md:36, P2-F5). Both options close the gate; but (b) closes it by teaching w1's chrome wiring a page model that contradicts every live tree the wiring will render against.
5. **The app's real implementation path.** The app renders nle-ui's AppShell (4 pages, ⌘1-⌘4) today; the r9 audit's 3-page reading (`audit-app-flows-r9.md:43`) is the pre-audio era. Under (a), the app is already conformant minus the FX page (XMOCK-6's r5 absorption). Under (b), the app's dock is a permanent deviation from spec law.
6. **Resolve's own page model.** The corpus's reference (the committed Resolve clone) draws a **7-page dock** — Media/Cut/Edit/Fusion/Color/Fairlight/Deliver (`davinci_resolve_ui_mock.html:987-1005`): the reference's own grammar is **page-per-workflow**, including a Fusion (FX) page and a Fairlight (audio) page. The mock's 5-page set is exactly that model minus the two pages §8.2 drops (Media/Cut), with Fusion→FX and Fairlight→Audio-focus simplified under §2.2's rule (remove only what discovers features we don't have — the DAW core now EXISTS, Decision 13). This does not settle it alone (the corpus deliberately simplified, and DESIGN-audio-mode.md:11 rejects the "Fairlight-style hard page split"), but it settles the DIRECTION: the mock's answer (page buttons, mode semantics) is the Resolve-faithful middle.
7. **The one-flag law makes the page-vs-mode question cheap.** `fxMode` is a single boolean with two writers; the FX "page" is one door onto the same engine as the FX tool. The fifth-page-vs-mode-of-Edit distinction is therefore **nomenclature + dock inventory**, not architecture — which is exactly why it must be ruled ONCE, in 18 §4.8, rather than left to fork again (the D33.5 sequencing law: the register precedes the ports).
8. **What (b) would cost anyway.** Even under (b), 18 would still need the FX-grammar rows (browser/inspector/domain/ruling-22/density), the per-page view-state law, the audio-focus mode rows, and the mixer home — i.e., nearly the same amendment, landing it under a name that contradicts the BASE, the mock, and the reference.

**Verdict: (a) wins on every criterion.** The only argument for (b) — spec minimalism ("three pages, not seven" as a scope statement) — was a v1.0 scope fact, superseded by Decision 13 (the DAW core), the mixer family's BASE landing, and the R23-WA FX surface; and 18 §8's own ledger law requires re-litigation "when reasons change" (DESIGN-audio-mode.md:25, §9's closure).

---

## 5. RECOMMENDATION — the paste-ready ruling (for the W2 fold, D42+ namespace; Group D row 3)

> **D4x — FIVE PAGES, two pinned as modes (the joint 3-vs-5 + FX-grammar ruling).**
>
> 18 §4.8's page inventory amends from three to **five: Edit / Color / Audio / FX / Deliver** — the dock shape of the accepted BASE (nle-ui's `Page` union + the mixer family), the design-of-record variants mock, and the corpus's own Resolve reference (page-per-workflow; the clone's 7-tab dock simplified per §2.2: Media/Cut dropped per §8.2, Fusion→FX, Fairlight→Audio-focus). The two new members are **modes with page buttons, not hard page-splits** — the one-timeline/one-clock law stands (Decisions 12/13; 03 §3):
>
> - **Audio = a focus mode** (the mock's law, `docs/DESIGN-audio-mode.md` §1): ⌘4; a **toggle** (re-click the active audio tab exits; re-entry never resets user state — the R13 re-entry law); Esc exits; the ChannelEditor rail (the S/G seam) + the Sound Library left dock + the **MixerDock as the Audio page's surface** (audio-page-only per the R23-WB D-B5/#92 ruling — entering any non-audio page collapses an open mixer). Spec 20 §7's M2 design round keeps the real-mixer surface ownership at r2; the strip-chrome queue (C40) rides it unchanged.
> - **FX = the fifth page, one flag** (the one-flag law): ⌘5; `fxMode` — one boolean, written ONLY by the tool (the FX tool) and the page (setPage): **two doors, one engine**; entering sets, leaving resets and re-seats a stranded fx tool to select and clears the fx-selection domain (scope `page === 'fx' || fxMode`); the FX-page timeline is the **FULL Timeline** (the density exemption: compact forces 'off'; the Compact-tracks checkbox is DOM-absent on fx); left dock = FxBrowser, right rail = FxInspector, mainbody at the 40% Edit default.
>
> **Riders (same edit):** (1) the FxBrowser row grammar lands in 18 §4.11 — the frozen `application/x-nle-effect {name, cat}` MIME, sections Effects / Video Transitions (**ALL 27 presentations of 07 §6.3's registry** — the 07 cross-ref lands with this ruling) / Fades (Fade In/Out 0.5/1/2s), **fade rows → `setFade`, never `addEffect`** (a fade is a model field, not a stack entry); the R24-A1 DnD canon stays as landed. (2) The **fx-selection domain** (`SelectedFxObject`) + the rail-priority chain land in 18 §4.4. (3) **Ruling 22** (Delete deletes the selected transition/fade FIRST, scoped `page === 'fx' || fxMode`) lands in 18 §6.4 + the Escape ladder in 16 §3.3's row. (4) The **per-page view-state memory** (`pageTimelineView`, five entries; compact ∈ {off, video, audio, all}; audio defaults 'video'; fx forces 'off') lands in 18 §4.7 — C57's R3/R5 halves close. (5) **16's ⌘3 reconciliation**: §3.8's ⌘3 → **Deliver**; the ⌘5 FX row added; ⌘4 re-worded "Toggle Audio focus"; App A re-keyed (`kbd-workspace-effects` → `kbd-workspace-deliver`; + `kbd-page-fx`); §0's K3 page-key half flips DONE. (6) The **removal-ledger re-litigations**: §8.3/§8.4 record the supersession (the FX page is NOT Fusion compositing; the Audio focus page is NOT Fairlight audio post — reasons changed with Decision 13); §8.8's REGISTERED DIVERGENCE resolves (the mixer family is the Audio page's surface). (7) **The register**: rows 7/8 flip (XMOCK-6/7 close — ADOPTED/LANDED-SPEC-R28); row 20 re-keys (the Audio page is the mixer's spec'd home); the OPEN table drops to 3 rows; 35.4's fourth clause retires; battery_r28's B-5/O re-keys (5→3).
>
> **Impl posture:** doc-level NOW (this round's W4); the nle-ui FX-page absorption + the app's page-key K3 tests ride r5/K3 (XMOCK-6's impl half). **Reversal registered:** a user override back to a leaner dock is ONE cheap amendment (18 §4.8 + 16 §3.8 + the register flip) — nothing else in the corpus keys on the page count. The 1280×800 floor question (mock-verdicts §4) stays a separate registered row, untouched by this ruling.

---

## 6. The amendment map (site count — one W4 commit)

| # | Site | The edit |
|---|---|---|
| 1 | 18 §0 (`:33`) | the "stays a REGISTERED OPEN DECISION" row → RULED (this D-entry) |
| 2 | 18 §0A/§2.2 (`:41`, `:80`) | the "collapses to 3 pages" sentence → five (two as modes) |
| 3 | 18 §3.1 (`:111`) | the diagram's dock row → Edit/Color/Audio/FX/Deliver |
| 4 | 18 §4.8 (`:219-221`) | THE rewrite: five pages; Audio = focus-mode block (toggle/Esc/rail/dock/mixer + the 20-M2 pointer); FX = fifth-page block (one-flag law, exit laws, FULL-Timeline exemption, 40% default); the three-way divergence note retired |
| 5 | 18 §4.11 (`:245-253`) | the FX-page door + the FxBrowser row grammar (MIME, 27-registry source = 07 §6.3, Fade→setFade) — the routing canon stays |
| 6 | 18 §4.4 (`:199`) | the fx-selection domain + the rail-priority chain (marker/caption hoist, color-gate) |
| 7 | 18 §4.7 (`:217`) | the per-page view-state memory (pageTimelineView, 4-way compact, audio 'video' default, fx 'off' force) |
| 8 | 18 §8.2-8.4 + §8.8 (`:388-394`) | the re-litigation closures (Fusion→FX, Fairlight→Audio-focus, mixer divergence → resolved) |
| 9 | 18 §6.4 (+§12 row) | ruling 22's Delete law + the Escape ladder rung + a Tier-3 pin row |
| 10 | 16 §3.8 (`:365-368`) | ⌘3 → Deliver; + ⌘5 row; ⌘4 wording |
| 11 | 16 §3.8 note (`:378`) | the R23 reconciliation PENDING → RESOLVED (this ruling) |
| 12 | 16 §0 K3 (`:28`) | the page-key half flips DONE (the app-side tests ride K3) |
| 13 | 16 App A (`:2274-2277`) | kbd-workspace re-keys + kbd-page-fx |
| 14 | 07 §6.3 (`:348`) | the one-line cross-ref: the FX page's Transition rows render all 27 presentations (the FX-page consumer pointer) |
| 15 | REFERENCE-REGISTER rows 7/8 (`:30-31`) | flip ADOPTED / LANDED-SPEC-R28 (XMOCK-6/7 closed) |
| 16 | REFERENCE-REGISTER row 20 (`:43`) | re-key: the Audio page is the mixer's spec'd home (M2 keeps r2 surface ownership) |
| 17 | REFERENCE-REGISTER OPEN + 35.4 (`:54-55`, `:35`, `:100`) | rows 7/8 struck (5→3); the maintenance note re-keys |
| 18 | IMPLEMENTATION-PLAN S-spec (3) (`:25`) | the phase tag "page-shape + FX grammar at w1-entry" → RULED-R28 |
| 19 | battery_r28 (B-5/O; cf `battery_r27.py:589-591`) | the OPEN-table check re-keys (5→3 rows; QUEUED count 4→2) + the new ruling's presence/coherence checks |
| 20 | 00-master D-ledger | the D-entry registered (the fold's numbering) |

**Count: 20 amendment sites** — 14 spec-corpus sites (9 in 18, 4 in 16, 1 in 07) + 3 register sites + 1 plan site + 1 battery site + the 00 D-entry; one W4 commit. NOT amendment sites (tracked riders): 20 §0's M2-remainder pointer; the nle-ui FX-page absorption (r5, XMOCK-6); the app's K3 page-key tests; the mini stays single-page (18 §16 unaffected — MiniShell has no page dock).

## 7. Residual risks

- **The FX tool enum (15 §4.3.45):** 18 §4.5's registered divergence ("either the enum grows the member at r1 or the fx tool stays a 16 §0.2 UI-layer extension") is untouched by this ruling — it rides r1 as filed.
- **The C47 audio-source routing + C35 per-clip audio fields:** unchanged (20's r2 round owns them).
- **The 1280×800 floor** (mock-verdicts §4): explicitly out of scope here; the page-shape round's registered rider stays open at 18's next natural edit.
- **Battery freshness:** rows 7/8's test-pin counts re-derive live (35.2) — the flips above are register amendments, so no count drift.

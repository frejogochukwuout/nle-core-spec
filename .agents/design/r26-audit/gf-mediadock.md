# R26-W-A6 — GF media pool / left dock / labels group (audit verdicts)

**Agent:** W-A6 (GF). **Scope:** T#32, T#33, T#37, T#46, T#52, T#61 (GH #86/#87/#91/#100/#106/#115) + the media-pool entries in T#1/T#2/T#4/T#5 (story "Media pool — list") + T#9's mode-aware media bay (story "Full Shell — Audio Focus"). READ-ONLY per §3.

**Freshness (first, per the R26 mandate):** `:3000/index.json` = **126 stories**; serving tree (`/home/z/my-project/shell-variants`) byte-diff vs spec HEAD `46db450` = **IDENTICAL** on all 6 target files (MediaPool.tsx, LeftDock.tsx, leftDockContent.ts, AppDock.tsx, Toolbar2.tsx, SoundLibrary.tsx). Every probe below ran on the fresh runtime (agent-browser, isolated `--session gf-mediadock-audit`, viewport 1600×1000, `shell-appshell--edit` iframe.html direct).

**Code+test evidence:** vitest on the runtime tree (== HEAD): LeftDock + AppDock + Toolbar2 + leftDockContent = **51/51 green**; MediaPool + SoundLibrary = **42/42 green**. Issue-cite pins verified in all 6 test files (T#32/#86, T#33/#87, T#37/#91, T#46/#100, T#52/#106, T#61/#61→#115, th_mto2qzoh/sako/s2nc/t03u, thread #67).

---

## 1 — The per-view left-dock truth (specific check #1, live-probed)

| Page | Toolbar buttons (live, in DOM order) | Left dock region + content (live) | Tab bar | Says "Media Pool"? |
|---|---|---|---|---|
| **Edit** | `[Media Pool] [Inspector]` | region "Media Pool" → the Media Pool (8 cards) | **none** | yes — and it IS the media pool |
| **Color** | `[Gallery] [Scopes] [Nodes] [Inspector]` | region "Gallery" → StillsPanel (4 stills: Marina cool / Golden hour / Bleach lift / Night teal, Save Still, clip-level footer) | **none** | **zero** "Media Pool" text anywhere on the page |
| **Audio** | `[Mixer] [Inspector]` | region "Sound Library" → SoundLibrary (no pool mounted) | **none** | no |
| **FX** | `[Inspector]` | region "Effects" → FxBrowser | **none** | no |
| **Deliver** | `[Inspector]` | **no dock at all** — mainbody = DeliverPage's own 3-region layout (left = Queue·4 + PRESETS rail: FCPXML / Master H.264 / Current frame PNG / Custom JSON) | n/a | no |

The whole grammar is driven by ONE table (`leftDockContent.ts:43-49`): edit=Media Pool / color=Gallery / audio=Sound Library / fx=Effects / **deliver=null**. Toolbar2 reads the same table for label+icon+render (`Toolbar2.tsx:99-102`), so the button can never lie about the dock (T#46) and no tab bar exists anywhere (T#52/T#37). Live binary-toggle check: the Edit "Media Pool" button click → dock unmounts + `aria-pressed=false`; click again → returns + `true`. Same verified for Inspector. The pool toggle is DOM-ABSENT on audio/fx/deliver (those pages own the slot unconditionally / DeliverPage owns the mainbody) — the lying-control law.

**Shared-law corroboration (GA's T#26/T#63):** the reviewer asked 3× "we still call it Media Pool under color?" — live at HEAD the color toolbar says **Gallery**, the region says **Gallery**, and `document.body.innerText.includes('Media Pool')` = **false** on the color page. Label law closed.

## 2 — Verdict table

| Thread (GH) | Ask (verbatim, abridged) | Override scan | Live probe (HEAD) | Code evidence | Verdict |
|---|---|---|---|---|---|
| **T#32** (#86) Toolbar2:76 | "just a reminder per my earlier issue feedback this should go away" (the Effects toolbar button) | chains into the FX-view migration (T#28/49/50/51 → R23-WA ruling 4) | Edit toolbar = `[Media Pool|Inspector]` only; no Effects button in ANY view | Toolbar2.tsx:186-188 removal note ("the slot it toggled moves to the Effect view"); Toolbar2.test:78 pins absence | **PROPER** |
| **T#33** (#87) Toolbar2:109 | "this button is non-functional? if so remove… you can use this space for other panels we want to toggle" (the Project button) | the space-reuse ask chains into R22-D5 → R24-W1 → R25-W3 (the real console toggles) | the space now carries `[Scopes] [Nodes]` on color and `[Mixer]` on audio — all real toggles (GA/GB live-verified; Inspector + pool toggles re-verified this session) | Toolbar2.tsx:262-266 ("the Project button is GONE… the space carries the console toggles above"); Toolbar2.test:78 | **PROPER** |
| **T#37** (#91) LeftDock:130 | "this should be the only tab in Media Bin… filter to the right asset type for each workflow view, under color grading only what's relevant for that" | R23-WB D-B4 lands it STRONGER than asked: color dock = Stills Gallery ALONE (no tab bar to prune); R23-WD's per-view table lands the filtering as per-view SURFACES | color dock = 4 stills, 0 pool cards, 0 tabs; audio = audio-only default (see T#9); edit = full pool; fx = FxBrowser | LeftDock.tsx:64-74 (stills-only, no tab bar); leftDockContent.ts table; LeftDock.test:58 + :120 (`queryByRole('tablist')` null pin) | **PROPER** (shape superseded — no-tabs + per-view surface ≥ single-tab + filtering) |
| **T#46** (#100) Toolbar2:115 | "we can't keep 'Media Pool' here hard coded when the panel below can be many things, in export view it is the export setting for example!" | R23-WD D-D1: the ONE table drives label+icon+render-or-not (A2-R5/#70 renamed Stills→Gallery) | label follows content per page (Media Pool / Gallery / — / — / —); on deliver the toggle is DOM-absent and the left side IS the export presets rail; binary toggle live-verified | leftDockContent.ts:43-49; Toolbar2.tsx:99-102 + :169-185; leftDockContent.test:15 | **PROPER** |
| **T#52** (#106) LeftDock:108 | "this tab is unnecessary if you name things correctly instead of calling it Media Pool above" | same chain as T#46 (single content per page) | zero `[role=tab]` inside any left dock (edit/color/audio/fx); region aria-labels match the mounted surface exactly | LeftDock.tsx (no tablist in any branch); LeftDock.test:120 | **PROPER** |
| **T#61** (#115) AppDock:60 | "this icon is really bad" (the old dashed-scissors Edit glyph) | — | AppDock Edit = `lucide-clapperboard`; full set = clapperboard / palette / audio-lines / blend / send — no bad glyphs | AppDock.tsx:12-19 (the #115 rationale: reference pairs scissors with the Cut page; ours is the rough-cut workspace); AppDock.test:79 + :91 (repo-wide zero-scissors grep pin) | **PROPER** |
| **T#1-pool** (GH #5) MediaPool:204 | "an icon would be better i think… movie clip vs. audio etc. the standard NLE way" | — | 8/8 cards render `role=img` SVG badges: Video:svg ×5, Audio:svg ×2, Image:svg ×1, colored with `--type-*` tokens; **list view rows carry the same icons** (T#3's "same here") | MediaPool.tsx:79-92 (TYPE_ICONS + TypeIconBadge); MediaPool.test:163/:182 | **PROPER** |
| **T#2-pool** (GH #7) MediaPool:104 | "hover to autoplay would be a nice feature… thumbs should load from a thumb specific asset never full res" | thumb-asset half = registered gap **C42** (README:455) | native mouse hover ≥400ms → PREVIEW chip + progress hairline **sweeping** (11.89px @ ~0.9s into the 6s window — the R24-W5b next-frame mount fix is live) + ken-burns (objectPosition 50%→53.4% heading to 85%, scale(1.06)); leave = instant reset, chip unmounts | MediaPool.tsx:103-133 (dwell + PreviewHairline), :206-223 (dwell law), :173-189 (ken-burns); MediaPool.test:203 | **PROPER** (autoplay) — thumb-specific assets **DEFERRED** (gap C42, honest-mock note in code :108-111) |
| **T#4-pool** (GH #15) MediaPool:525 | "this is EXPORT icon" | — | pool Import button = `lucide-download`, zero upload glyphs in the pool | MediaPool.tsx:670-681; MediaPool.test:192-198 (`not.toContain('lucide-upload')` pin) | **PROPER** for the pool — **residue F1**: the SoundLibrary sibling still uses `lucide-upload` (below) |
| **T#5-pool** (GH #16) MediaPool:253 | "hovering on audio assets should have autoplay too for audio, the waveform should move to indicate that" | — | audio-card dwell → `pool-audio-sweep` mounted, `animationName: pool-audio-sweep`, `6s`, playhead at 12.05px mid-sweep + PREVIEW chip on the audio card | MediaPool.tsx:156-169 (Thumb preview sweep); header :14-17 cites thread #68/C49 | **PROPER** |
| **T#9** (GH #54) SoundLibrary:150 | "change the media bay according to the editing mode… in Audio mode we filter to audio related assets only, this help declutter" | the audio-page pool IS the SoundLibrary (the R19 dock swap); both surfaces honor the one `poolModeFilter` atom | audio page: count chip **6/8**, "Audio only" toggle default ON (aria-pressed=true); OFF → **8/8** + honest footer "all media — Audio only is off"; ON again → 6/8; the 6 = Dialogue (marina .mp4 V+A, .wav), BGM (ocean_ambience.wav), SFX (drone_launch.mp4 V+A, sunset_timelapse.mp4 V+A), Music (beach_wide.mp4 V+A) — audio + audio-bearing video only, zero stills | SoundLibrary.tsx:55-60 (shared `isAudioBearing`), :107-124 (chip + toggle); SoundLibrary.test:104; MediaPool.tsx:327-337 + :719-743 (the pool's own page-gated twin) | **PROPER** |

**Tally: 11 PROPER (+1 half DEFERRED on gap C42 inside T#2). Zero BROKEN. One QUICKFIX-class residue filed from this group (F1 below — new finding, not a thread regression).**

## 3 — Dead controls + icon enumeration (specific check #3, live)

Every Toolbar2/AppDock button at HEAD, per view (all live-verified functional unless noted):

- **Toolbar2 edit** `[Media Pool]` `[Inspector]` — both real binary toggles (probed on/off/on this session).
- **Toolbar2 color** `[Gallery]` `[Scopes]` `[Nodes]` `[Inspector]` — Scopes/Nodes = console-tab routers (GA-verified live), Inspector + dock-gate verified.
- **Toolbar2 audio** `[Mixer]` `[Inspector]` — Mixer = binary open/close w/ memory (GB-verified live).
- **Toolbar2 fx / deliver** `[Inspector]` — only.
- **AppDock** — 5 page buttons (all navigate; Audio is a re-clickable toggle per the ⌘4 law), `Keyboard cheat sheet` (opens CheatSheet), `Project home` + `Settings` = **aria-disabled honest no-ops** with reason tips ("mock: project home is the media pool round (spec 18 §4.7)" / "Settings (deferred §8.12)") — the R14 honest-affordance treatment, NOT silent dead buttons. No T#32/T#33-class pretend-controls remain.
- **Bad icons:** none in AppDock/Toolbar2 (clapperboard/palette/audio-lines/blend/send + PanelLeft/ImageIcon/AudioWaveform/Sparkles per the table). The ONE bad glyph left in the group's scope = **SoundLibrary's Upload** (F1).

## 4 — Fix queue (for W-F)

- **F1 (QUICKFIX, the only mandatory item):** `SoundLibrary.tsx:131` — the "Import sound…" CTA renders `lucide-upload`, the exact export-reading glyph T#4 (GH #15) flagged on the pool's import button. The pool was fixed + pinned (MediaPool.test:198) but the pin covers only the pool; the audio page's media bay (the same media-bay family, and the ONLY bay visible in Audio Focus) still violates the law. Fix: `Upload` → `Download` in the import + drop the unused import; extend the pin (SoundLibrary.test or a repo-wide no-upload-on-import grep pin like AppDock's scissors pin). One line + one test. Live-verified: `button[aria-label="Import sound"] svg` = `lucide lucide-upload` at HEAD.
- **R2 (P3, optional hygiene):** `LeftDock.tsx:83` — the edit media-pool wrapper carries `role="tabpanel"` (`#leftdock-panel-pool`) with no controlling tablist (the Pool|Effects tabs are gone). An orphaned tabpanel is an ARIA fib; drop the role (keep the id if a shortcut targets it).
- **R3 (note, no action):** `MediaPool.tsx:719-743` (the pool's own audio-page "Audio only" toggle + count chip) is unreachable in the shell — LeftDock swaps to SoundLibrary on audio, so the pool never mounts with `page==='audio'`. Harmless duplicate of the T#9 law kept for the solo-story surface; either leave (comment already explains the split) or remove in a cleanup wave.
- **DEFERRED (registered):** T#2's thumb-specific poster assets = gap **C42** (README:455; the real shell runs spec 15 §5.4 probe→persistBlob→thumbnail strip). Do not reopen the thread for it; cite the register row in the reply.

## 5 — Probe artifacts (so W-V doesn't chase ghosts)

1. **The window-too-small overlay is always in the DOM** (CSS media-query gate) — `querySelector('.window-too-small')` finds it at 1600×1000 but `display:none`. agent-browser's click-guard tripped on it while the session viewport was still small; `set viewport 1600 1000` + retry clears it. Not an app bug.
2. **Synthetic `mouseenter` does NOT arm the hover-dwell** (dispatched `mouseenter` with `bubbles:false` is invisible to React's root delegation, which synthesizes enter/leave from mouseover/out). Must use native `mouse move` to the card's coordinates — the dwell, chip, hairline and ken-burns all fire correctly that way.
3. The story URL carries variant params in the hash (`#v=theme:resolve,…`) — the reload preserves them; all results above are the resolve theme.

## 6 — Reply-evidence blocks (for W-R, cite verbatim)

- **T#37/#46/#52 (+#26/#63 corroboration):** "The left dock is now per-view, driven by one table (`leftDockContent.ts`): Edit = Media Pool, Color = Gallery (the stills gallery — the word 'Media Pool' appears nowhere on the color page), Audio = Sound Library, FX = Effects, Deliver = no dock at all (the export presets rail owns that side). No tab bar exists in any dock — the dock IS the one surface its toolbar button names, and on pages where the slot isn't togglable the button is simply absent. Live-verified on the fresh runtime (R26-W-A6, gf-mediadock.md §1)."
- **T#32/#33:** "The Effects button is gone (its content moved to the FX page, ⌘5) and the Project button is gone — that space now carries the panel toggles you asked for: Scopes + Nodes under Color, Mixer under Audio, each a real toggle wired to its console."
- **T#61:** "The Edit page glyph is now a clapperboard (the scissors read as Resolve's Cut page); a repo-wide test pins that no scissors glyph can return."
- **T#1/T#2/T#4/T#5 (pool list):** "Type badges are icons (Film/AudioLines/Image) in both grid and list; hovering a video card ≥400ms runs the ken-burns preview with a PREVIEW chip and sweeping progress hairline; audio cards sweep the waveform the same way; the import button uses the proper Download (into-the-project) glyph. The thumb-specific poster-strip source is registered as gap C42 for the real shell."
- **T#9:** "In Audio Focus the media bay is the Sound Library and filters to audio + audio-bearing video by default — the 6/8 count chip says what's hidden, and the 'Audio only' toggle shows the full 8/8 with an honest footer when off."
- **F1 to disclose if asked (or fold into the T#4 reply):** the SoundLibrary's own "Import sound…" button still carries the old export-style arrow — fixed in the follow-up wave (one-line icon swap).

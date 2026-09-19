# DESIGN-R26 — the full-issue verification sweep (every GH/SB issue, proper-resolution audit)

**Written:** 2026-09-16, start of the R26-variants round. **Binding for all R26 waves.**
**Driver (user, verbatim):** "i found multiple GH issues (filed from SB) are not resolved yet closed - we need to do a full sweep for every issue, to verify they are addressed not just as a quick fix as a proper ux solution, of course some issues may be overriden in later Issues so they should look at a given issue and scan overrides. figure out how to dispatch them perhaps by a particular ux feature group or related scope to group issues and audit deeply. send as many rounds / waves as needed. unless what i am seeing right now in the hosted SB is stale? in any case worth doing a full audit anyway and confirm."

## §0 — The two root causes found BEFORE any auditing (the round's first deliverable)

### §0.1 THE HOSTED SB WAS STALE (confirmed; now fixed)

- The container recycled uncleanly after R25. `/home/sync/repo.tar` (written at the last
  clean pre-stop = R24-era, 2026-09-10) resurrected `/home/z/my-project` including an
  **R18b-era `.zscripts/dev.sh`** — the version WITHOUT the checkout guard, the GitHub
  fast-forward, and the entire code-sync step.
- Today's 07:31 boot: repo restored correctly from the r25-final bundle, but the daemon
  launched against the **R24-era runtime tree** (stamp `3db130f`, 124 stories, 78 files
  behind HEAD). The annotakit store self-healed from the GH orphan branch — threads
  current, CODE stale — the maximally confusing state.
- The reviewer's live 07:33 comment on T#72 ("this is NOT fixed what's going on and
  never responded either") was judging UI **two rounds behind the fixes**.
- **Remediation (done, verified):** code-sync re-run (stamp → `243b04d`); public URL
  serves **126 stories** (verified live + via index.json). Boot chain hardened:
  `.zscripts/dev.sh` is now a stub → `boot-restore.sh`; boot-restore gained step 1b-2
  (**boot-chain self-heal** — repo copy is the single source of truth; drift healed +
  re-exec'd at every boot, `SB_CHAIN_HEALED` loop guard). Committed: repo `3fae3dc`
  (GitHub + GitLab mirror with the NEW PAT — mirror was at R24 `cd08b1b`, now current),
  watchdog repo `00c4055`.

### §0.2 RESOLUTIONS WERE SILENT (the "never responded" complaint)

- The R24 + R25 batch-resolution scripts (`r24-…`/`r25-resolve-threads.mjs`) PATCHed
  thread status → resolved and the GH mirror closed the issues — **but posted NO reply
  comments on the threads** (threads T#18–T#91: 1 comment each = the reviewer's own ask;
  zero agent replies). The evidence lived only in worklogs/commit messages — invisible
  to the reviewer.
- **Law for this round:** a resolution is NOT done until the thread carries a visible
  evidence reply. Every thread in the corpus gets an honest reply (what landed, where,
  how to verify) before its status is (re-)confirmed. Reply-first, then status.

## §1 — The corpus (ground truth, orchestrator-read)

- **138 annotakit threads ↔ 140 GH review issues** (GH also carries 2 spec-track
  issues; 2 threads died pre-mirror). GH state: 139 closed / 1 open (T#72 = GH #126,
  the reviewer's live complaint). Annotakit: 137 resolved / 1 open.
- Digest: `/tmp/r26-corpus-digest.md` (446 lines, every ask verbatim + every EVID on
  record). Inventory JSON: `/tmp/r26-inventory.json`; full payloads:
  `/tmp/all-threads-full.json`; GH bodies: `/tmp/gh-all-issues.json`.
- Reference specs (binding for their clusters): `ui-mock/trim_edit_modes.html` (4 trim
  modes), `ui-mock/timeline_edit_modes (2).html` (6 insert/edit modes + the SVG icon
  set), `ui-mock/davinci_resolve_ui_mock.html` (the RH/shell reference).

## §2 — The feature-group dispatch (the user's grouping directive)

Eight groups, each ONE tight-scoped audit agent (SKILL #148: tight scopes return,
full-scope die). Issue numbers = THREAD numbers (T#n); GH = +54 offset roughly.

| Group | Scope | Threads (T#) | Focus questions |
|---|---|---|---|
| **GA color** | Color-view architecture: layout, console tabs, inspector-rail, scopes, wheels, curves, node graph, stills/gallery, grade target | 20,22,23,24,25,26,36,38,39,40,41,42,63,64,67,69,70,72,73,74,75,76,77,78 | Does the console-row tab grammar satisfy the "panel next to timeline" asks (36/41/67/72/73)? Is the inspector-rail the ONE grading surface (24/25/73/77/78)? Wheels = Resolve grammar (74)? Curves = reference DOM (69)? Stills make sense (43,70)? |
| **GB mixer** | Mixer dock, channel strips/editor, faders/meters, density ladder, element toggles, mixer-in-view rules | 1p,2p,3p,4p,5p,9p,12,13,14,16,18,27,44,45,55,60,65,66,80,81,82,83,84,85 | Full-height minimized meters (14)? Collapse icon states (13)? FX/EQ surfaced via inspector/editor (18/27/44/45)? Fader direction (55)? Toggle-off (65)? Responsive-before-mini (85)? Aux/master visibility (82)? |
| **GC source+insert** | Source viewer transport, I/O range, SourceEditBar 7 modes, previews, animations | 29,30,31,48,89,90 | Spec SVG icons (29)? Source transport + honest still playback (89/31)? I/O crop + flags (30/89)? 7 modes + hover previews + scroll-into-view + animated affordance (29/48/90)? |
| **GD transitions** | Transition objects (seam/head/tail), the dedicated FX/transition workflow, DnD, already-transition rules | 15,28,49,50,51,58,59 | The REITERATED dedicated-effects-view ask (28/49/50/51 — asked 4x!): is the FX view the real workflow? Hover-seam affordance? Head/tail half-objects (15/50/51)? Existing-transition rule (58)? DnD application (59)? |
| **GE deliver** | Deliver page composition, presets/queue, ruler+range, export formats | 34,35,53,71,86,87 + 1p(crammed),1p(overflow) | Video preview retained (34)? Queue placement (35/86)? Compact timeline + full-height range head + ruler + clamp (53/71)? Custom JSON real export (87)? |
| **GF media/left-dock** | Media pool, left dock tabs, per-view filtering, labels | 37,46,52,32,33,61 + 2p(autoplay) | Single-tab + per-view asset filtering (37)? Label truth per view (46/52/63→GA)? Non-functional buttons removed/reused (32/33/61/68)? |
| **GG timeline-core** | Timeline gestures/scroll/zoom, compact styles, view options, per-view memory, toolbar contents, icon audit | 6p,17,21,40p,42p,54,62,68,79,91 | Bounded scroll (6/17)? Compact generalized + hybrid audio density (21/40/79)? Per-view style memory (91)? Per-view toolbar curation (54)? Icon audit verdicts honest (62)? No-ops gone (68)? |
| **GH inspector+polish** | Inspector selection-model, refresh laws, empty states, and the R18-era visual-polish residue | 7p,88,34p + the T#1–T#17 polish set (contrast/radii/splitters/waveforms/markers/transport placement) | Type-driven inspector (7p/34p)? Refresh after view/mode change (88)? The R18-era fixes still hold after 8 rounds of churn (regression sweep)? |

## §3 — The audit methodology (EVERY issue, same protocol)

Per issue, the auditor MUST produce a verdict row:
1. **ASK** — re-read the ask verbatim from the digest (never from memory).
2. **OVERRIDE SCAN** — list later threads that redefine/supersede it (known chains:
   T#24's color-rewrite supersedes T#23's layout complaints; T#72's console-tab ask
   supersedes T#36/T#41's placement asks; T#39's node-view debate is settled by the
   console-tab grammar; T#53's deliver-compact is superseded by T#71's ruler+clamp ask;
   T#14's minimized-meters supersedes T#16's separate-collapse ask). If overridden, the
   verdict cites the superseding thread and audits THAT contract instead.
3. **LIVE PROBE** — verify on the fresh runtime (agent-browser against localhost:3000,
   `?path=/story/shell-appshell--edit` + the solo stories). The stale-runtime incident
   means EVERY prior "verified live" claim from R24/R25 must be re-probed now.
4. **CODE CHECK** — proper UX solution vs quick fix: does the implementation carry the
   interaction law (state, feedback, honest affordance) or just a visual patch? Are
   there tests pinning the behavior? Does the code comment cite the issue?
5. **VERDICT** — one of: `PROPER` (real UX solution, live-verified) / `QUICKFIX`
   (partially works, needs rework — say exactly what's missing) / `BROKEN` (not
   resolved at HEAD) / `OVERRIDDEN→T#n` (audit the superseding contract) / `DEFERRED`
   (registered residue — cite the register row) / `N-A` (reviewer retracted / platform
   question). Evidence line: file:line or live-probe result for EVERY non-PROPER verdict.

## §4 — Wave plan (as many as needed; exit gate = every issue re-verified)

- **W-A1..W-A8**: the eight group auditors (parallel, 2-3 per batch per SKILL #148).
  Output: `.agents/design/r26-audit/<group>.md` — the verdict table.
- **W-F1..W-Fn**: fix waves for every QUICKFIX/BROKEN verdict, grouped by area,
  commit→push→bundle per wave (#143).
- **W-R**: the reply wave — evidence replies on ALL 138 threads (reply-first law §0.2),
  T#72 first (the live complaint), then re-resolve; GH mirror follows the threads.
- **W-V**: fresh verification agents on the fix classes + the console sweep (exit gate).
- **Gates per wave:** tsc 0 · full suite green (1950+ at HEAD) · build green · public
  index.json story count matches repo (#122) · console zero errors on touched stories.

## §5 — Non-negotiables

- Push after EVERY wave (#143). Fetch-before-commit (#129). Never force push.
- Tight agent scopes; the digest file IS the briefing core (agents must not re-derive
  the corpus; they verify and deepen — SKILL #130).
- Verdicts are claims: the fix waves + W-V re-probe them (SKILL #146 — verify claims
  in the diff; a claimed-but-never-landed fix is the R25 lesson).
- The reviewer's T#72 thread gets a human-grade answer, not a template reply.

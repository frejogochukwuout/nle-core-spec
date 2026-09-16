# HANDOFF — Next Session Scope (nle-core-spec)

**Written:** 2026-09-16, end of the R26-variants round (THE FULL-ISSUE VERIFICATION SWEEP + the stale-serve incident round). **Read this FIRST; the spec-track state below the divider is R29-era background still accurate as environment context.**

## Current state (R26-variants — COMPLETE: 138/138 threads verified + replied; the stale-SB incident root-caused + hardened)

- **The round's driver:** the user found "multiple GH issues (filed from SB) not resolved yet closed" and ordered a full sweep of every issue — proper UX solutions not quick fixes, override scanning, grouped by feature scope, as many waves as needed — plus "is the hosted SB stale?"
- **YES IT WAS STALE (the round's first finding):** the container's unclean recycle had resurrected an R18b-era `.zscripts/dev.sh` (no code-sync) via a stale repo.tar; the public SB served R24-era code (124 stories, 78 files behind) while the annotakit store self-healed from GitHub — threads current, code stale. The reviewer's live "this is NOT fixed" (T#72, 07:33 today) judged two-rounds-old UI. FIXED: runtime re-synced (126 stories public, verified); the boot chain now SELF-HEALS (stub dev.sh → boot-restore.sh; boot-restore 1b-2 refreshes .zscripts from the GitHub-authoritative copy + re-execs). Session-start ritual: check `.code-sync-stamp` == repo HEAD + public story count.
- **The silent-resolution finding:** R24/R25 resolve scripts' PATCH `comment` payloads were silently IGNORED by the annotakit API (only `POST /threads/:id/comments` lands) — threads closed with zero visible replies ("never responded either"). FIXED: the reply wave posted evidence replies on ALL 138 threads (T#72 hand-written with the incident explanation + verification path; the 72 historical r22-r25 notes finally delivered; era threads stamped with R26 group verifications; the 5 fix-notable threads updated). 0 open threads; GH mirror propagates (spot-verified).
- **The audit:** 8 feature-group auditors (GA color / GB mixer / GC source+insert / GD transitions / GE deliver / GF media-dock / GG timeline-core / GH inspector+polish — the last orchestrator-run after 3 dispatch kills) over the full 138-thread corpus with the verdict taxonomy (PROPER/QUICKFIX/BROKEN/OVERRIDDEN/DEFERRED). Result: ~95 verdict rows, overwhelmingly PROPER with live probes on the FRESH runtime; reports in `.agents/design/r26-audit/`.
- **The fix wave (W-F1, agent + orchestrator recovery):** F1 the insert-preview sourceRange threading (preview==commit for cropped sources — live-verified: ghost 26.483s = the range); F2 snap boots OFF again (the R18e law lost in the R20 store reorg; test had pinned the regression — both fixed); F3 the deliver Inspector toggle DOM-absent (was state-only); F4 SoundLibrary Import = Download glyph; F5 the fx-tip tier wording; P3-2 union-span auto-scroll; P3-3 transition label compose; P3-4 compact-strip type-based tint; P3-5 orphaned tabpanel removed; P3-1 fade-out REVERTED (violated the pinned D-E2 absence law — SKILL #153).
- **Gates: tsc 0 · 1960/1960 (R25's 1950 → 1960) · vite + storybook builds green · public serves 126 stories.** Commits: boot-hardening 3fae3dc → DESIGN 46db450 → audits 77b2253 → W-F1 ec543d5 → reply-wave a5fea7b → SKILL bf9b94f, all pushed (GitHub; GitLab mirror CURRENT with the new PAT — first successful mirror push since R24).

## Next session scope (immediate)

1. **The user's / reviewer's reaction round** — the 138 evidence replies + T#72's direct answer are live; expect the reviewer's next pass. Pull ALL open threads first (`curl :3000/annotakit/api/threads`); any new comment on a RESOLVED thread may need the reopen flow honored (the mirror handles GH↔SB both ways).
2. **The reply-first law is standing:** any resolution = POST the evidence comment FIRST, then PATCH the status (SKILL #150; the PATCH comment field is a no-op).
3. **Session-start ritual (SKILL #149):** verify `.code-sync-stamp` == repo HEAD, public story count matches, THEN trust the runtime.
4. **Registered residue (all P3, deliberate):** X3 FxBrowser search/filter; T5 scrollMax monotonicity; T8 scroll view-state continuity; the r5 shortcut long tail; the C16 GAP-row update; C59 stills-as-node-snapshots (the T#39 asset musing); C42 thumb-specific poster assets.
5. **Process reminders:** fetch-before-commit (#129 — 2 sibling races absorbed this round); commit→push→bundle after every wave (#143); the secret scanner REJECTS pushes containing the PAT (strip tokens from scripts before `git add` — use `process.env.ANNOTAKIT_GH_TOKEN`).

## VARIANTS-TRACK state (supersedes the sections below)

- R24: COMPLETE + reconstructed. R25: COMPLETE. R26: COMPLETE (this round — the sweep + the incident hardening; 138/138 replied+resolved; 1960/1960; the boot chain self-heals).
- The GitLab mirror PAT works again (glpat-… re-issued by the user 2026-09-16; WAF 403 ≈ 1/3 — retry twice).

## Standing laws (battery-enforced)

- The posture law (D20), the pin world (D21), the drag law (D22), the single-tree law (D25 + amendments), the plan-executability law (§2A.6), the census law (§2A.7), the productization gate (D28.2), the mode-matrix completeness law (§2A.8), the reference-register law (§2A.9) — all as at R28 (spec-track). Variants-side: SKILL #121-#154.

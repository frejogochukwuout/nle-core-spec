# R21 — P0 forensics, the interpretation ruling, and the race record

**Author:** the R21-2 session (this round). The P0 code revert itself was
executed by the sibling mini-stream session as `c8b174d` (R21b) on top of
`0bc5fc4` (R21, the PR #69 review round); this document records how the
directive was decoded, the adversarial review that validated the
interpretation, and the parallel-session race — so the next session (and
the user) can audit the chain of reasoning that produced R21b.

## 1. The directive and its timeline forensics

The P0 (verbatim, `ui-mock/shell-mini/user-msg`):

> P0: revert all the recent 'drag' related timeline 'fixes' those are not
> fixes they are making things worse. the last two rounds of changes
> related to timeline drag support should be all reverted. related to new
> issue opened issue#57 from annotekit too.

Decoding "the last two rounds" required server-side evidence, because the
user-msg's commit dates display as 00:44–00:45 (local) while the mini
rounds display as 06:04/07:13 (UTC):

| Event | Commit | Author date | UTC |
|---|---|---|---|
| R18k (pre-revert baseline) | `9b5d194` | 04:29 +0000 | 04:29Z |
| R19 (insert-push drag law) | `3316dc2` | 06:04 +0000 | 06:04Z |
| R20 (OT-faithful escape law) | `d40dfe9` | 07:13 +0000 | 07:13Z |
| user-msg | `eff9bed`/`1fe9cee`/`5105a7b` | 00:44–00:45 **-0700** | 07:44–07:45Z |
| GitHub push event (server) | — | — | **07:46:00Z** |

**Ruling:** the user-msg landed 32 minutes AFTER R20 — the user saw both
rewrites and rejected them; "the last two rounds" = **R19 + R20** (the only
coherent reading: they are the two most recent mini rounds and the only two
that rewrote the drag law). The author-date `-0700` offset is the user's
Pacific clock; `git log` display alone mixes the two timezones and will
mislead you — always check `%ai` offsets + the events API push timestamps.

Corroborating context: the R20 design doc records the prior verdict
("your timeline drag logic is extremely buggy almost comical"); the P0 is
the second, terminal rejection — "those are not fixes they are making
things worse". A third re-architecture was explicitly NOT an option; this
is a revert order. Issue #57 (nle-core-spec, a shell-variants review
thread, "shouldn't show half and crop by half") is the variants stream's
queue — related symptom class, different tree (the R17 cross-stream-serve
prohibition stands).

## 2. The R21-R1 adversarial review (the interpretation audit)

Before implementation, an independent reviewer agent audited the revert
design (worklog R21-R1): verdict **GO-WITH-AMENDMENTS** — timeline
interpretation confirmed ("the only coherent reading"), keep/revert
classification audited per file, symbol-consumer sweep produced, mixed-test
surgery list produced. The R21b execution matches its findings on every
point of overlap (clampMove restored, escape machinery deleted, plain-doc
history, verdict affordances removed, capture guards kept).

## 3. The strict-vs-pragmatic divergence — resolved by the user

The R21-2 session's own execution (later discarded, see §4) took the
STRICT reading ("revert ALL drag-related changes from R19/R20"):
last-pointermove commit (not commit-at-UP), first-in-array magnet (not
nearest), silent-clamp moveClip/nudge (not refuse+toast). R21b took the
PRAGMATIC reading and kept those three. The user adjudicated ON THE PR
(`pulls/69` inline replies, 08:44Z):

> "The nearest law survives the drag revert — it's a PR-69 C17
> requirement." (comment 3943454629, re: magnetTarget nearest-wins)

So: **nearest-magnet is user-endorsed to survive the revert** (PR #69
C17 asked for it at 06:30Z, the user re-affirmed it at 08:44Z). The
commit-at-UP and moveClip-refusal keeps are the sibling session's
documented judgment (drag-law-neutral / user-approved); if the user wants
the stricter variants, they are one small commit each — registered here,
not re-litigated.

## 4. The race record (why a duplicate revert was discarded)

The R21-2 session restored context from a fetch taken at ~08:1xZ (HEAD
`542a9d0`), executed the full P0 revert + gates + live verification, and
committed at 08:56Z — 17 minutes after the sibling's `c8b174d` (08:39Z)
had already landed the same directive on a RICHER base (their R21 PR-69
round, `0bc5fc4`, which this session never had). Push rejected →
`git reset --hard origin/main` (the remote is canon; never force push).
Unique value that survived the reset: this forensics record, the
R21-R1 review record, and the wrap artifacts (PLAN/HANDOFF/SKILL — the
sibling session had not updated them).

**Lesson (SKILL #81): fetch immediately before executing any P0-class
directive — the user runs parallel sessions that may have already acted.**

## 5. Verification performed on the synced state (this session, this sandbox)

- `tsc --noEmit`: 0 errors. `vitest run`: **343/343** (7 files).
- `vite build` + `storybook build`: green.
- Live browser pass (:3001, real drags): c2 dragged leftward across c1 —
  **c1/c3 frozen, c2 clamps at 168px (3.5s), no drop-chip, zero page
  errors** — the restored clamp law behaves exactly as the P0 demands.

# HANDOFF — Next Session Scope (nle-core-spec)

**Written:** 2026-09-17, end of the R30 K3-corpus round. **Read this FIRST.**

## Current state (R30 — COMPLETE: the crawl's bulk begun)

- **The round:** the K3 re-expression — the mini's law corpus (495 tests / 163 census units, the acceptance list at `ui-mock/shell-mini/docs/LAW-NET-INVENTORY.md`) re-expressed over the app's REAL surfaces. **The app suite 256/256 (8-suite) → 377/377 across 12 files.**
- **The four maps are the work orders** (in the APP repo, `nle-test-app/docs/`): `k3-map-store.md` (36 rows), `k3-map-geometry.md` (17), `k3-map-libchrome.md` (55), `k3-map-timeline.md` (52 — the Part-A hole the review caught, mapped last). Every row: the law, the app-side target surface (grep-verified), the test home, the disposition (RE-EXPRESS / SUPERSEDED / N-A-DIFFERENT / OVERLAP-LANDED / DOM-GATED). ~96% of the store/geometry/libchrome maps' RE-EXPRESS target is now LANDED; the timeline map is UNSTARTED authoring.
- **The C16 auto-repeat guards landed BOTH trees** (the port's `use-keybindings.ts:220` + the package's `useShortcuts.ts:52` — holding `s` machine-gunned `timeline.split`; fixed, zero exemptions, mutation-verified). The 3-verb dead-history-entry defect class fixed in the package (`5779295`, 701/701).
- **Pins:** app `8f12cf9` · nle-ui `5779295` · engine `e3f55bd` · OT `3e18722` (code `970948a`) · WDC `94f6460` · spec sealed @ `6de3fca`. battery_r30 **166/166**.
- **The adversarial review verdict:** 13/13 mutations caught (zero tautologies); every finding folded or filed.

## Next session scope (immediate, ranked)

1. **The DOM-structural tranche** per `nle-test-app/docs/k3-map-timeline.md`: FIRST ratify the D26.5 testid mapping row (the map's mapping table — 21 clean / 4 partial / 18 gaps; the 4 partial rows are the real decisions, e.g. add `data-element-id` to ResizeHandle), THEN author the 13 RE-EXPRESS-PORT rows (rows 5/6/10/11/19/24/38/39/40/41/42/47/49 — incl. the scrub-session family and the clip-auto-scroll twin). Each family's tests land in the app's vitest beside the surface they pin.
2. **The row-40 fix-first:** the port's zoom-slider lacks `aria-valuetext` (the package's mock-world slider has it — spec 18 §11.3). Fix + pin (the C16 precedent).
3. **The mid-drag keyboard yield ruling** (Reviewer A's P2-1): the mini's M2 interaction-lock has NO app implementation — an S mid-drag splits today. Either implement (the keymap yields during an active drag session) or register the divergence. Also rule the scrub-row/playhead hold-to-scrub question (mini-parity, currently un-owned).
4. **K4's e2e legs** (import(virtual) → cut → play → export through the real UI) + the w1 approach (the engine playhead binding) per IMPLEMENTATION-PLAN S-app steps (7)-(8).
5. **Standing quick wins:** OT's carrier-reduction work order STILL UNFILED (S-ot step 1 — file it in OT's PLAN as the queue head); nle-ui's D29 DECISIONS entry + C0 MiniShell row (S-package step 2, 3 rounds overdue); the app hygiene rows (the stale maintainPitch PLAN row tick; the DeliverPage blob contract CR).

## Process reminders (the round's lessons)

- **The saturation pattern held again:** 3 of the 7 wave-2/fix agents "timed out" AFTER landing their edits — ALWAYS check the tree before re-dispatching (the worklog + `git status` are the truth).
- **The jsdom drag-math traps** (pinned in the corpus comments): the zero element rect skews clickOffsetTime (stub the hit node's rect); the collapsed render window hides deeper elements (only el-1/el-2/el-6 render); main is fully packed tail-to-tail (no small same-track move is free — el-6 on A1 is the clean mover); snap must be OFF at BOOT for threshold pins (the patch boots the store pre-render — a toggle + settle does NOT reliably reach the port's prop).
- **Fetch-first held** (zero force-pushes); the package edits go through `vendor/nle-ui` (the submodule clone — push there, then bump the app's pin in the same app commit; the symlink validates live).
- The battery re-baselines ONCE per round (battery_r30 is current); the corpus re-key rides the wrap (the K1 convention: layered appends, history preserved — `scripts/rekey_r30.py` is the scanner).

## VARIANTS-TRACK state (the sibling session's lane — do not collide)

- The shell-variants stream (R26-variants) wrapped AFTER R29: 138/138 threads verified + replied; the SB stale-serve incident hardened (the boot chain self-heals). Its HANDOFF notes live in this file's history (git). The sibling may still be active — fetch-first everywhere.

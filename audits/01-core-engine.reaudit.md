# Re-Audit Report: 01-core-engine.refined.md (after REVISE-01)

**Auditor:** general-purpose
**Date:** 2026-08-22
**Spec under audit:** `/home/z/my-project/download/nle-spec/01-core-engine.refined.md` (1,962 lines after revision)
**Original audit verdict:** ⚠️ NEEDS REVISION (1 CRITICAL + 5 MINOR, plus 1 no-action ISSUE-2 note)
**Revision applied:** REVISE-01

---

## Verification of CRITICAL fix (ISSUE-1)

- **Fix claim (from REVISE-01 worklog):**
  > "Fixed ISSUE-1 (CRITICAL): Removed fabricated claim about DegradedRendererBanner; verified component exists at page.tsx:60-79 and is rendered at line 46. Corrected both the Q7 inline mention (line 1628) and §14.15 'correction' entry (line 1895→1922). Replaced with verified-true statement and embedded the actual component source for reference."

- **Spec text now says (Q7, line 1628):**
  > "There is no WebGL2 fallback. ✅ VERIFIED — `DegradedRendererBanner` exists at `apps/web/src/app/editor/[project_id]/page.tsx:60-79` and is rendered at line 46 of the same file. The master spec was correct in its mention of 'borrow OpenCut-classic's `DegradedRendererBanner`' — no correction needed. The component reads the `isDegraded` flag via `useEditor((e) => e.renderer.isDegraded)` (the same boolean flag the rest of the editor reads, e.g., at `editor-provider.tsx:42`)."

  Followed by an embedded code block (lines 1630-1655) showing:
  - `// page.tsx:46 (rendered inside EditorProvider, before EditorHeader)` → `<DegradedRendererBanner />`
  - `// page.tsx:60-79` → full `function DegradedRendererBanner() { … }` definition

- **Spec text now says (§14.15, lines 1922–1924):**
  > "…✅ VERIFIED — `DegradedRendererBanner` exists at `apps/web/src/app/editor/[project_id]/page.tsx:60-79` and is rendered at line 46 of the same file. The master spec was correct — borrow OpenCut-classic's `DegradedRendererBanner` component directly. Components read `useEditor((e) => e.renderer.isDegraded)` and the banner component decides what (and whether) to render."
  >
  > **Correction:** Keep the "DegradedRendererBanner" reference. Borrow the existing OpenCut-classic component at `page.tsx:60-79` (renders a dismissible "For the best experience, open OpenCut in Chrome" banner when `isDegraded` is true). Implement degraded mode as a boolean flag + UI-side conditional rendering, with the banner as the canonical pattern. Implement `onDeviceLost` as greenfield (OpenCut has no equivalent). Adopt OpenCut's "not found → auto-create untitled project" recovery flow as a fallback pattern.

- **Source verification (`/tmp/opencut-classic/apps/web/src/app/editor/[project_id]/page.tsx`, 209 LOC):**
  - Line 46: `<DegradedRendererBanner />` rendered inside `<EditorProvider>` before `<EditorHeader />` ✅
  - Lines 60–79: `function DegradedRendererBanner() { const isDegraded = useEditor((e) => e.renderer.isDegraded); … }` ✅
  - Body matches spec quote **character-for-character** including the className string `"bg-accent border-b h-9 flex items-center justify-center gap-2 text-xs text-muted-foreground"`, the dismiss Button with `variant="text"` / `size="icon"` / `className="p-0 w-auto [&_svg]:size-3.5"`, and the `<HugeiconsIcon icon={Cancel01Icon} />` icon.

- **Absence check (negative phrases from original audit, must be GONE):**
  - `grep -nE "no DegradedRendererBanner|no such component|does NOT exist.*Degraded|generous.*Degraded|inaccurate.*Degraded"` → **0 matches** in the revised spec. The only "generous" hit (line 1059) refers to "GPU device loss is handled via try/catch" — unrelated. ✅

- **Verdict:** ✅ **FIXED** — Both Q7 (line 1628) and §14.15 (lines 1922–1924) now positively verify the component's existence, cite the exact source path/line range, embed the actual component body (verbatim), and the §14.15 "Correction" explicitly says "Keep the 'DegradedRendererBanner' reference. Borrow the existing OpenCut-classic component at `page.tsx:60-79`" rather than dropping it. The fabricated correction has been fully retracted and replaced with a verified-true statement aligned with the master spec.

---

## Verification of MINOR fixes

### ISSUE-2 (MINOR) — Systematic off-by-one LOC counts

- **Fix claim:** "Corrected LOC counts in §13 table — 8 OpenCut-classic rows and 14 FreeCut rows had systematic +1 errors (now match `wc -l` exactly). Also corrected inline LOC mentions at lines 622, 1144, 1145, 1178-1182, 1264, 1273, 1356, 1363-1364, 1559-1561. Total: 22 table-cell + 14 inline = 36 LOC corrections."
- **Spec text now says:** §13 table reports LOC values without +1 bias.
- **Verification (10 random files from §13 table):**

  | File | Spec LOC | `wc -l` actual | Match |
  |---|---|---|---|
  | `apps/web/src/core/index.ts` | 81 | 81 | ✅ |
  | `apps/web/src/commands/index.ts` | 8 | 8 | ✅ |
  | `apps/web/src/editor/use-editor.ts` | 76 | 76 | ✅ |
  | `apps/web/src/editor/editor-store.ts` | 24 | 24 | ✅ |
  | `apps/web/src/services/renderer/gpu-renderer.ts` | 90 | 90 | ✅ |
  | `apps/web/src/core/managers/save-manager.ts` | 112 | 112 | ✅ |
  | `src/runtime/player/clock/Clock.ts` | 641 | 641 | ✅ |
  | `src/headless/main.ts` | 1292 | 1292 | ✅ |
  | `scripts/check-feature-boundaries.mjs` | 112 | 112 | ✅ |
  | `src/features/timeline/stores/items-store.ts` | 960 | 960 | ✅ |

  All 10 spot-checks match `wc -l` exactly. The previous systematic +1 bias is gone.
- **Verdict:** ✅ **FIXED**

---

### ISSUE-3 (MAJOR → MINOR after fix) — "46 domain stores" count is wrong

- **Fix claim:** "Updated '46 domain stores' → '41 domain stores (counted from LS, non-test `.ts` files directly in the directory)' at line 1354, with clarifying note that ~20 additional test files exist in the same directory."
- **Spec text now says (line 1354):**
  > "The `src/features/timeline/stores/` directory contains **41 domain stores** (counted from LS, non-test `.ts` files directly in the directory) … (An additional ~20 test files exist in the same directory and are not counted here.)"
- **Verification:**
  - `ls /tmp/freecut/src/features/timeline/stores/*.ts | grep -v test | wc -l` → **41** ✅
  - The clarifying "~20 test files" note is consistent with the original audit's "61 including tests" (= 41 non-test + 20 test).
- **Verdict:** ✅ **FIXED**

---

### ISSUE-4 (MINOR) — FreeCut deps/ "(15 files)" header is wrong

- **Fix claim:** "Updated '15 files' → '14 files' in deps/ header at line 1137."
- **Spec text now says (line 1137):**
  > "**Directory:** `/tmp/freecut/src/runtime/composition-runtime/deps/` (14 files)"
- **Verification:**
  - `ls /tmp/freecut/src/runtime/composition-runtime/deps/ | wc -l` → **14** ✅
  - The 14-row table at lines 1766-1779 (7 contract + 7 wrapper pairs) now matches the header count.
- **Verdict:** ✅ **FIXED**

---

### ISSUE-5 (MINOR) — Inconsistent line range for `window.freecut` assignment

- **Fix claim:** "Standardized window.freecut line range to 1281-1291 at line 1297 (was previously 1281-1292 in one place and 1281-1291 in another — now both consistent). 1281-1291 is the correct range (line 1281 is `window.freecut = {`, line 1291 is the closing `}`)."
- **Spec text now says:**
  - Line 1297: "(`headless/main.ts:1281-1291`)" ✅
  - Line 1313: "// headless/main.ts:1281-1291" ✅
- **Verification:**
  - `grep "1281-1292"` → **0 matches** in revised spec (the old wrong range is gone)
  - `grep "1281-1291"` → 2 matches (lines 1297 and 1313) — both consistent
  - Source check: `/tmp/freecut/src/headless/main.ts` line 1281 is `window.freecut = {` and line 1291 is the closing `}`. Line 1292 is `log.info('Headless harness ready')` (a separate statement, correctly excluded). ✅
- **Verdict:** ✅ **FIXED**

---

### ISSUE-6 (MINOR) — `SaveManager` construction pattern not noted in generalization prose

- **Fix claim:** "Updated §3.4 description at line 699 to acknowledge both manager construction patterns: dominant `new XxxManager(this)` (11 managers) plus `SaveManager`'s `new SaveManager({ editor: this })` options-object pattern (allows default overrides like `debounceMs = 800`)."
- **Spec text now says (line 699, in Q2 "Key findings the seed spec missed"):**
  > "The dominant pattern is `new XxxManager(this)` (11 of 12 managers — e.g., `TimelineManager` constructor at line 73 of `timeline-manager.ts`: `constructor(private editor: EditorCore) {}`). The single exception is **`SaveManager`**, which is constructed as `new SaveManager({ editor: this })` (`core/index.ts:42`) — an options-object pattern that allows default overrides like `debounceMs = 800` (`save-manager.ts:3-23`)."
- **Verification:**
  - Line 655 (constructor code quote): `this.save = new SaveManager({ editor: this });` ✅ (was already correct; still correct)
  - Line 699 (generalization prose): now correctly enumerates both patterns ✅
  - Source check: `/tmp/opencut-classic/apps/web/src/core/index.ts:42` matches the spec quote.
- **Residual note (non-blocking):** The same generalization also appears at §14.2 (line 1810): "Every manager is constructed as `new XxxManager(this)` — passing the entire `EditorCore` instance, not specific peers." This line was NOT updated by REVISE-01 and still has the unqualified "Every manager is constructed as `new XxxManager(this)`" prose that misses the `SaveManager` exception. The original audit only flagged line 699, so REVISE-01 met its mandate — but for full consistency, line 1810 should be softened in the same way. This is a follow-up nit, not a blocker.
- **Verdict:** ✅ **FIXED** (per audit's specific recommendation; one residual consistency nit at §14.2/line 1810 noted for future cleanup)

---

## Final Verdict: ✅ PASS

The CRITICAL fabrication has been fully retracted and replaced with a verified-true statement backed by the actual OpenCut-classic source. All 5 MINOR issues have been addressed in line with the audit's recommendations. Spot-checks confirm:

- 10/10 LOC counts in the §13 table now match `wc -l` exactly
- Domain-store count (41) verified
- Deps/ file count (14) verified
- window.freecut line range (1281-1291) standardized and consistent
- SaveManager construction exception documented at the targeted location

The spec is now internally consistent on the issues originally flagged.

## Recommendation

**Ready for integration review.**

The revised `01-core-engine.refined.md` is suitable for use as the implementation reference for the core engine stream. The architectural direction (12 managers, zero-arg constructor, `ScenesManager` plural/async, `performance.now()` clock, FreeCut `deps/` 7-contract pattern, WYSIWYG-by-construction headless entry) was already sound in REVISE-01's predecessor; the only blocking defect (the fabricated `DegradedRendererBanner` correction) has been removed.

### Optional follow-up (non-blocking, can be deferred to integration review)

1. **§14.2 / line 1810 consistency nit:** Soften "Every manager is constructed as `new XxxManager(this)`" at line 1810 to match the softened prose at line 699 (i.e., acknowledge the `SaveManager` options-object exception here too). This is a 1-line edit and removes the last residual echo of the same generalization that ISSUE-6 targeted.
2. **Future-spotcheck discipline:** When REVISE-01 added the embedded `DegradedRendererBanner` code block (lines 1630-1655), it correctly preserved the source's tab indentation. Future spec revisions should keep this discipline so embedded code quotes remain `diff`-able against source.

No blockers remain for integration review of this stream.

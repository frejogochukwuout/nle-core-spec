/* CheatSheet — spec 16 §7.3 modal opened via "?". AUTO-GENERATED from
   SHORTCUT_MAP (single source of truth — the hook is the behavioral twin):
   searchable (200 ms debounce, matches action/desc/keys), sections in
   SHORTCUT_GROUPS order, per-row data-testid={`shortcut-${action}`} so
   tests can assert cheat-sheet completeness. Esc closes (capture — beats
   the shell handler); the footer offers the 30s sample project (spec 18
   §4.10) as a one-click way to try every shortcut — it also doubles as the
   deterministic test fixture (see the footer's code comment). */

import { useEffect, useMemo, useState } from 'react';
import { X, Search, FolderOpen } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { SHORTCUT_MAP, SHORTCUT_GROUPS } from '../../lib/shortcutMap';

const SEARCH_DEBOUNCE_MS = 200;

export function CheatSheet() {
  const open = useUi((s) => s.cheatOpen);
  const close = useUi((s) => s.setCheatOpen);
  const loadSampleProject = useUi((s) => s.loadSampleProject);
  const pushToast = useUi((s) => s.pushToast);

  const [input, setInput] = useState(''); // immediate (controlled field)
  const [query, setQuery] = useState(''); // debounced filter value

  /* 200 ms debounce on the filter state */
  useEffect(() => {
    const id = window.setTimeout(() => setQuery(input.trim().toLowerCase()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [input]);

  /* reset the search whenever the modal closes */
  useEffect(() => {
    if (!open) {
      setInput('');
      setQuery('');
    }
  }, [open]);

  /* Esc closes (capture — beats the shell deselect handler) + Tab is
     trapped inside the modal (spec 16 §7.3: "the modal is a focus trap;
     Tab cycles within"). Same two-stop wrap pattern as ConfirmDialog.
     R24-W5b (DESIGN-R24 §2 F1-P2): F6 is CONSUMED here too — plain F6
     used to sail through to the AppShell's region cycler (a window
     BUBBLE listener), so focus landed on a background shell region while
     the aria-modal dialog stayed open. Capture-at-window beats every
     bubble listener, so the stop kills the cycle before any region
     handler can fire — the ConfirmDialog "modal owns the keyboard" law,
     applied to the one key ConfirmDialog's element-level shield pattern
     (the dialog onKeyDown below) can only cover when focus is inside. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F6') {
        e.preventDefault(); // F6's browser-default pane hop is not ours to keep under a modal
        e.stopPropagation(); // no region cycling under an open aria-modal dialog
        return;
      }
      if (e.key === 'Escape') { e.stopPropagation(); close(false); }
      if (e.key === 'Tab') {
        const sheet = document.querySelector('[data-testid="shell-cheatsheet"]');
        if (!sheet) return;
        const focusables = Array.from(
          sheet.querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])'),
        ).filter((el) => !el.hasAttribute('disabled'));
        if (focusables.length === 0) return;
        e.preventDefault();
        const idx = focusables.indexOf(document.activeElement as HTMLElement);
        const next = e.shiftKey
          ? (idx <= 0 ? focusables.length - 1 : idx - 1)
          : (idx === focusables.length - 1 || idx === -1 ? 0 : idx + 1);
        focusables[next].focus();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, close]);

  /* filter by action / desc / keys, then bucket into ordered sections */
  const filtered = useMemo(() => {
    const q = query;
    if (!q) return SHORTCUT_MAP;
    return SHORTCUT_MAP.filter(
      (r) =>
        r.action.includes(q) ||
        r.desc.toLowerCase().includes(q) ||
        r.keys.toLowerCase().includes(q),
    );
  }, [query]);

  const sections = useMemo(
    () =>
      SHORTCUT_GROUPS.map((g) => ({ title: g, rows: filtered.filter((r) => r.group === g) })).filter(
        (g) => g.rows.length > 0,
      ),
    [filtered],
  );

  if (!open) return null;
  return (
    <div
      data-testid="shell-cheatsheet"
      /* R23-FIX (review-sweep R-d, R5-P3#8): z 70 → 86 — above the toast
         region (85) so an error toast can no longer sit ON the modal the
         user is trying to close (the toast's own close button overlapped
         the sheet's search row). Still below menus (93) / confirm (97) /
         the failure boundary (99). */
      className="fixed inset-0 z-[86] flex items-center justify-center bg-black/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard cheat sheet"
      onClick={() => close(false)}
    >
      <div
        className="max-h-[80vh] w-[640px] max-w-[92vw] overflow-hidden rounded-lg border border-strong bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        /* R24-W5b (F1-P2): the ConfirmDialog pattern — the dialog element
           stops EVERY keydown from bubbling out (focus is trapped inside,
           so every key the user presses dies here; no window-level shell
           listener — the AppShell F6 cycler, the useShortcuts ladder —
           ever sees a key while the sheet is open). Typing in the search
           field is unaffected: input events are their own event stream. */
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-hairline bg-raised px-4 py-2.5">
          <span className="text-[14px] font-semibold text-tprimary">Keyboard cheat sheet</span>
          <span className="text-[11px] text-tmuted">
            spec 16 · {SHORTCUT_MAP.length} bindings · auto-generated from ShortcutMap
          </span>
          <div className="grow" />
          <button onClick={() => close(false)} aria-label="Close cheat sheet" className="icon-btn !h-7 !w-7"><X size={14} strokeWidth={1.6} /></button>
        </div>

        {/* search — filters by action / description / keys */}
        <div className="flex items-center gap-2 border-b border-hairline bg-raised px-4 py-2">
          <Search size={13} strokeWidth={1.6} className="shrink-0 text-tmuted" aria-hidden="true" />
          <input
            data-testid="cheatsheet-search"
            className="field min-w-0 flex-1"
            type="text"
            placeholder="Search shortcuts (key, action or description)…"
            aria-label="Search shortcuts"
            value={input}
            autoFocus
            onChange={(e) => setInput(e.target.value)}
          />
          <span className="mono shrink-0 text-[11px] text-tmuted" aria-live="polite">
            {filtered.length}/{SHORTCUT_MAP.length}
          </span>
        </div>

        <div className="scroll-y grid max-h-[60vh] grid-cols-2 gap-x-6 gap-y-4 px-5 py-4">
          {sections.map((g) => (
            <div key={g.title}>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-tmuted">{g.title}</div>
              <div className="flex flex-col gap-1">
                {g.rows.map((r) => (
                  <div key={r.action} data-testid={`shortcut-${r.action}`} className="flex items-baseline justify-between gap-3">
                    <span className="mono shrink-0 rounded border border-soft bg-inset px-1.5 py-0.5 text-[11px] text-tprimary">{r.keys}</span>
                    <span className="text-[11px] text-tmuted">{r.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {sections.length === 0 && (
            <div className="col-span-2 py-6 text-center text-[12px] text-tfaint" data-testid="cheatsheet-empty">
              No shortcuts match “{input.trim()}”.
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-hairline bg-raised px-4 py-2.5 text-[11px] text-tmuted">
          <FolderOpen size={13} strokeWidth={1.6} />
          Try it with the 30 s sample project (spec 18 §4.10)
          {/* dev note: the loader is ALSO the deterministic store fixture
              under src/lib/mockData.ts (§4.10 counts) — test suites boot
              through loadSampleProject(); user-facing copy stays clean */}
          <button
            data-testid="cheatsheet-load-sample"
            className="ml-auto rounded-[var(--radius-sm)] text-accent underline-offset-2 hover:underline"
            onClick={() => {
              loadSampleProject();
              close(false);
              pushToast({ kind: 'success', title: 'Sample project loaded' });
            }}
          >
            Load sample project
          </button>
        </div>
      </div>
    </div>
  );
}

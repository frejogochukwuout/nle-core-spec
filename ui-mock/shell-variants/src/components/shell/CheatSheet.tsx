/* CheatSheet — spec 16 §7.3 modal opened via "?". AUTO-GENERATED from
   SHORTCUT_MAP (single source of truth — the hook is the behavioral twin):
   searchable (200 ms debounce, matches action/desc/keys), sections in
   SHORTCUT_GROUPS order, per-row data-testid={`shortcut-${action}`} so
   tests can assert cheat-sheet completeness. Esc closes (capture — beats
   the shell handler); footer loads the 30s sample project (spec 18 §4.10),
   doubling as the test fixture. */

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

  /* Esc closes (capture — beats the shell deselect handler) */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(false); }
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
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard cheat sheet"
      onClick={() => close(false)}
    >
      <div
        className="max-h-[80vh] w-[640px] max-w-[92vw] overflow-hidden rounded-lg border border-strong bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
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
          Footer: load the 30s sample project (spec 18 §4.10) — doubles as the test fixture.
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

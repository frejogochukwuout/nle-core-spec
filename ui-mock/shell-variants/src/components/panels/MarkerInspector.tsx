/* MarkerInspector — R19 B5: the reference's marker EDIT DIALOG (timeline-
   marker-transcript-withDialog.html §2.2) converted to an EMBEDDED right-rail
   panel per the user directive (dialog → panel, same swap pattern as the
   page routing in AppShell). Reads selectedMarkerId + the active scene's
   markers; every edit routes through updateMarker (withHistory — clamped in
   the store: time 0..scene duration, duration >= 1 frame, end <= duration).
   Fields reuse the Inspector's exported contracts: NumberField (shared
   parseTc + 50ms debounce + TC display) and LiveText (same settle law).

   Color: the canonical 8-token palette (spec 16 §3.7 --mk-*), NOT the
   reference's 15 shields — rendered locally with the same dot classes as
   Ruler's markerColorItems row, as a role="tablist" of 8 selectable dots. */

import { ChevronDown } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { sceneDuration, type Marker } from '../../lib/mockData';
import { tc } from '../../lib/timecode';
import { NumberField, LiveText } from '../shell/Inspector';

/* the 8-token marker palette (mirrors Ruler's MARKER_COLORS/ORDER — rendered
   locally so the panel owns its a11y shape: tablist tabs, not menu items) */
const MARKER_COLORS: Record<Marker['color'], string> = {
  red: 'var(--mk-red)', orange: 'var(--mk-orange)', yellow: 'var(--mk-yellow)', green: 'var(--mk-green)',
  blue: 'var(--mk-blue)', purple: 'var(--mk-purple)', pink: 'var(--mk-pink)', gray: 'var(--mk-gray)',
};
const MARKER_COLOR_ORDER: Marker['color'][] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'];

/** the marker inspector's field row — label column + control (reference:
    75px right-aligned label column) */
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-[64px] shrink-0 pt-[3px] text-right text-[11px] text-tmuted">{label}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">{children}</div>
    </div>
  );
}

export function MarkerInspector() {
  const scenes = useUi((s) => s.scenes);
  const activeSceneId = useUi((s) => s.activeSceneId);
  const selectedMarkerId = useUi((s) => s.selectedMarkerId);
  const updateMarker = useUi((s) => s.updateMarker);
  const removeMarker = useUi((s) => s.removeMarker);
  const selectMarker = useUi((s) => s.selectMarker);

  const scene = scenes.find((x) => x.id === activeSceneId) ?? scenes[0];
  const m = scene?.markers.find((x) => x.id === selectedMarkerId);
  /* R23-FIX (review-sweep item 2, R2-F1): the stale-id state gets an HONEST
     one-line panel, never a silent `return null` — the rail swap mounted
     this panel for a REASON (selectedMarkerId holds), so a blank rail was
     a lie about why. The store now clears the domain at every scene-switch
     clear-site, so this row is belt-and-braces for any future stale path
     (the honest-empty law, same shape as the Inspector's empty row). */
  if (!scene || !m) {
    return (
      <div data-testid="shell-marker-inspector-empty" className="flex h-full w-full items-center justify-center bg-shell px-4 text-center">
        <p className="text-[11.5px] text-tmuted">Marker not found — it was removed</p>
      </div>
    );
  }

  const dur = sceneDuration(scene) || 30;
  const isRange = m.duration !== undefined && m.duration > 0;

  return (
    <div data-testid="shell-marker-inspector" className="flex h-full w-full min-h-0 min-w-0 flex-col bg-shell">
      {/* header — "Marker" + color dot + the SMPTE chip (reference: "Markers"
          dialog title; ours names the domain and the selection) */}
      <div className="flex items-center gap-2 border-b border-hairline px-3" style={{ height: 30, minHeight: 30 }}>
        <span
          aria-hidden="true"
          className="h-[10px] w-[10px] shrink-0 rounded-full border border-black/45"
          style={{ background: MARKER_COLORS[m.color] }}
        />
        <span className="text-[12.5px] font-semibold text-tprimary">Marker</span>
        <span className="mono ml-auto text-[11px] text-tmuted" data-testid="shell-marker-inspector-tc">{tc(m.time)}</span>
      </div>

      {/* fields — keyed by marker id so every field resyncs on selection swap */}
      <div key={m.id} className="scroll-y flex min-h-0 flex-1 flex-col gap-3 px-3 py-3">
        <FieldRow label="Time">
          <NumberField
            value={m.time}
            min={0}
            max={dur}
            timeField
            tcDisplay
            resetTo={0}
            ariaLabel="Marker time"
            testId="shell-marker-inspector-time"
            onCommit={(v) => updateMarker(m.id, { time: v })}
          />
        </FieldRow>

        {isRange && (
          <FieldRow label="Duration">
            <NumberField
              value={m.duration!}
              min={1 / 24}
              max={dur - m.time}
              timeField
              tcDisplay
              resetTo={1 / 24}
              ariaLabel="Marker duration"
              testId="shell-marker-inspector-duration"
              onCommit={(v) => updateMarker(m.id, { duration: v })}
            />
            <span className="text-[10px] text-tfaint">Range marker — end {tc(m.time + m.duration!)}</span>
          </FieldRow>
        )}

        <FieldRow label="Name">
          <LiveText
            value={m.label}
            ariaLabel="Marker name"
            testId="shell-marker-inspector-name"
            placeholder="Marker name"
            onCommit={(v) => updateMarker(m.id, { label: v })}
          />
        </FieldRow>

        <FieldRow label="Notes">
          {/* reference geometry: 70px textarea, resize-none */}
          <LiveText
            value={m.notes ?? ''}
            textarea
            className="h-[70px] resize-none text-[12px] leading-snug"
            ariaLabel="Marker notes"
            testId="shell-marker-inspector-notes"
            placeholder="Producer note…"
            onCommit={(v) => updateMarker(m.id, { notes: v })}
          />
        </FieldRow>

        <FieldRow label="Keyword">
          {/* pseudo-select: text input + inert caret (reference's dropdown
              handle; the store takes free text — no fixed vocabulary exists) */}
          <div className="relative">
            <LiveText
              value={m.keyword ?? ''}
              ariaLabel="Marker keyword"
              testId="shell-marker-inspector-keyword"
              placeholder="keyword"
              className="pr-6"
              onCommit={(v) => updateMarker(m.id, { keyword: v })}
            />
            <ChevronDown size={12} strokeWidth={1.8} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-tmuted" aria-hidden="true" />
          </div>
        </FieldRow>

        <FieldRow label="Color">
          {/* 8-dot palette — role=tablist per the R19 contract (arrow keys
              cycle, aria-selected marks the current color; the store write is
              updateMarker({color}), undoable like every field) */}
          <div
            role="tablist"
            aria-label="Marker color"
            data-testid="shell-marker-inspector-color"
            className="flex flex-wrap items-center gap-1.5 pt-1"
            onKeyDown={(e) => {
              if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
              e.preventDefault();
              const dots = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
              if (dots.length === 0) return;
              const idx = dots.findIndex((d) => d === document.activeElement);
              const dir = e.key === 'ArrowRight' ? 1 : -1;
              dots[(idx + dir + dots.length) % dots.length]?.focus();
            }}
          >
            {MARKER_COLOR_ORDER.map((c) => {
              const selected = m.color === c;
              return (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-label={`Marker color ${c}`}
                  data-testid={`shell-marker-inspector-color-${c}`}
                  title={`Marker color ${c}`}
                  onClick={() => updateMarker(m.id, { color: c })}
                  className={`h-[14px] w-[14px] shrink-0 rounded-full border border-black/45 transition-transform ${
                    selected ? 'ring-1 ring-[var(--accent-selection)] ring-offset-1 ring-offset-[var(--bg-shell)]' : 'hover:scale-125'
                  }`}
                  style={{ background: MARKER_COLORS[c] }}
                />
              );
            })}
          </div>
        </FieldRow>
      </div>

      {/* footer — the reference's pill pair: ghost Remove + filled Done */}
      <div className="flex items-center justify-between gap-2 border-t border-hairline bg-inset px-3 py-2.5">
        <button
          type="button"
          className="rounded-full border border-strong bg-transparent px-4 py-1.5 text-[11px] text-tmuted hover:border-accent hover:text-tprimary"
          data-testid="shell-marker-inspector-remove"
          aria-label="Remove marker"
          /* removeMarker is undoable + clears selectedMarkerId in-store */
          onClick={() => removeMarker(m.id)}
        >
          Remove Marker
        </button>
        <button
          type="button"
          className="rounded-full border border-strong bg-[var(--active-overlay)] px-6 py-1.5 text-[11px] font-medium text-tprimary hover:brightness-125"
          data-testid="shell-marker-inspector-done"
          aria-label="Done editing marker"
          onClick={() => selectMarker(null)}
        >
          Done
        </button>
      </div>
    </div>
  );
}

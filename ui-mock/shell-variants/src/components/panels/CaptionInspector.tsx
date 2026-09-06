/* CaptionInspector — R19 B5: the reference's Subtitles sidebar (timeline-
   marker-transcript-withDialog.html §2.4) converted to an EMBEDDED right-rail
   panel. Two halves, exactly like the reference:
   (a) EDITOR — the selected caption's textarea (el.text via setElementField,
       live 50ms settle), In/Out TC fields (REAL startTime/duration writes,
       frame-snapped by typing TC — the shared parseTc grammar), the live
       char-count chip, the Use-Track-Style row (display state + honest toast
       — track styling is gap C34), and Add New / Prev / Next.
   (b) LIST TABLE — every caption on the track in time order: # / Time In/Out
       / Caption / CPS. CPS is COMPUTED (round(chars / duration)) — the
       reference's values were partly decorative (row 3 shows 12 vs computed
       17, row 5 shows 23 vs computed 14 — timeline-cluster §2.4/§5.2); we
       render the honest law. Active row = inset accent ring; click selects
       (setSelection — which also clears the marker selection domain). */

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, Plus } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { sceneDuration, type ElementJSON, type TrackJSON } from '../../lib/mockData';
import { snapToFrame, tc } from '../../lib/timecode';
import { NumberField, LiveText } from '../shell/Inspector';

/** CPS law — chars per second, computed (reference values were decorative) */
const cps = (e: ElementJSON) => Math.round((e.text ?? '').length / Math.max(e.duration, 1 / 24));

export function CaptionInspector() {
  const scenes = useUi((s) => s.scenes);
  const activeSceneId = useUi((s) => s.activeSceneId);
  const selection = useUi((s) => s.selection);
  const setSelection = useUi((s) => s.setSelection);
  const setElementField = useUi((s) => s.setElementField);
  const addCaption = useUi((s) => s.addCaption);
  const setPlayhead = useUi((s) => s.setPlayhead);
  const pushToast = useUi((s) => s.pushToast);

  /* display-only ui state (reference shows it checked) — per-caption style
     overrides are engine-spec (gap C34), so the toggle answers honestly */
  const [useTrackStyle, setUseTrackStyle] = useState(true);

  const scene = scenes.find((x) => x.id === activeSceneId) ?? scenes[0];
  const track: TrackJSON | undefined = scene?.tracks.find((t) => t.kind === 'caption');
  const rows = track ? [...track.elements].sort((a, b) => a.startTime - b.startTime) : [];
  const current = rows.find((e) => e.id === selection[0]) ?? null;
  const currentIndex = current ? rows.indexOf(current) : -1;
  const dur = scene ? sceneDuration(scene) || 30 : 30;

  /* Add New inserts after the edited caption — or after the last one when
     nothing is selected (the store's addCaption law) */
  const addNew = () => {
    const prevId = current?.id ?? rows[rows.length - 1]?.id;
    if (!prevId) {
      // empty caption track (all captions deleted): honest answer, never a
      // silent no-op (R19-REV P2 — the store op needs a predecessor)
      pushToast({ kind: 'info', title: 'Add caption', detail: 'add-after needs an existing caption — use the track menu (Add caption track inserts a first caption) or undo the deletes' });
      return;
    }
    addCaption(prevId);
  };

  const goTo = (i: number) => {
    const next = rows[i];
    if (!next) return;
    setSelection([next.id]); // row-click semantics: select the caption…
    setPlayhead(next.startTime); // …and park the playhead on it (extraction §5.2)
  };

  return (
    <div data-testid="shell-caption-inspector" className="flex h-full w-full min-h-0 min-w-0 flex-col bg-shell">
      {/* header — the reference's "Subtitle N" panel title */}
      <div className="flex items-center gap-2 border-b border-hairline px-3" style={{ height: 30, minHeight: 30 }}>
        <span className="text-[12.5px] font-semibold text-tprimary">Captions</span>
        {current && <span className="mono text-[11px] text-tmuted">{current.name}</span>}
        {track?.language && <span className="mono ml-auto text-[10px] text-tfaint" title="Track language tag (display-only)">{track.language}</span>}
      </div>

      {/* ---------- (a) EDITOR — the reference's caption editor block ---------- */}
      {current ? (
        <div key={current.id} className="flex flex-col gap-2 border-b border-hairline px-3 py-2.5" data-testid="shell-caption-inspector-editor">
          {/* time row: In / Out TC + live char-count chip (the reference's
              "25 Characters" — exact length, the mock's 25 was off-by-one) */}
          <div className="flex items-center gap-2">
            <span className="w-[22px] shrink-0 text-[11px] text-tmuted">In</span>
            <NumberField
              value={current.startTime}
              min={0}
              max={dur}
              timeField
              tcDisplay
              ariaLabel="Caption in timecode"
              testId="shell-caption-inspector-in"
              onCommit={(v) => setElementField(current.id, { startTime: snapToFrame(Math.max(0, v)) })}
            />
            <span className="w-[26px] shrink-0 text-[11px] text-tmuted">Out</span>
            <NumberField
              value={current.startTime + current.duration}
              min={current.startTime + 1 / 24}
              max={dur}
              timeField
              tcDisplay
              ariaLabel="Caption out timecode"
              testId="shell-caption-inspector-out"
              onCommit={(v) => setElementField(current.id, { duration: snapToFrame(v - current.startTime) })}
            />
            <span className="mono ml-auto shrink-0 text-[10px] text-tmuted" data-testid="shell-caption-inspector-charcount">
              {(current.text ?? '').length} Characters
            </span>
          </div>

          {/* the caption body — REAL live write (50ms settle) */}
          <LiveText
            value={current.text ?? ''}
            textarea
            className="h-[60px] resize-none text-[13px] leading-snug"
            ariaLabel="Caption text"
            testId="shell-caption-inspector-textarea"
            placeholder="Caption text…"
            onCommit={(v) => setElementField(current.id, { text: v })}
          />

          {/* track-style row: display state + honest toast (per-caption style
              overrides are engine-spec — gap C34) */}
          <label className="flex cursor-pointer items-center gap-2 text-[11px] text-tprimary">
            <input
              type="checkbox"
              checked={useTrackStyle}
              aria-label="Use track style"
              data-testid="shell-caption-inspector-use-track-style"
              className="accent-[var(--accent-focus)]"
              onChange={() => {
                setUseTrackStyle((v) => !v);
                pushToast({
                  kind: 'info',
                  title: 'Track style',
                  detail: 'caption styling follows the track (gap C34) — per-caption overrides are engine-spec, display-only in the mock',
                });
              }}
            />
            Use Track Style
          </label>

          {/* action row: Add New / Prev / Next (reference's flex-1 trio) */}
          <div className="flex gap-2">
            <button
              type="button"
              className="mini-btn flex-1"
              data-testid="shell-caption-inspector-add-new"
              aria-label="Add new caption"
              onClick={addNew}
            >
              <Plus size={11} strokeWidth={1.7} className="mr-1" aria-hidden="true" /> Add New
            </button>
            <button
              type="button"
              className="mini-btn flex-1"
              data-testid="shell-caption-inspector-prev"
              aria-label="Previous caption"
              disabled={currentIndex <= 0}
              onClick={() => goTo(currentIndex - 1)}
            >
              <ChevronLeft size={11} strokeWidth={1.7} className="mr-1" aria-hidden="true" /> Prev
            </button>
            <button
              type="button"
              className="mini-btn flex-1"
              data-testid="shell-caption-inspector-next"
              aria-label="Next caption"
              disabled={currentIndex === -1 || currentIndex >= rows.length - 1}
              onClick={() => goTo(currentIndex + 1)}
            >
              Next <ChevronRight size={11} strokeWidth={1.7} className="ml-1" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div className="border-b border-hairline px-3 py-2.5 text-[11px] text-tmuted" data-testid="shell-caption-inspector-state-noselect">
          {rows.length > 0 ? 'Select a caption row to edit it' : 'No captions on this track'}
        </div>
      )}

      {/* ---------- (b) LIST TABLE — the reference's caption list view ---------- */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-[11px]" data-testid="shell-caption-inspector-table">
        {/* header row — # (25px) · Time In/Out (95px) · Caption (flex) · CPS (30px) */}
        <div className="flex shrink-0 items-center border-b border-hairline bg-inset px-2 py-1.5 text-[10px] uppercase tracking-wide text-tfaint">
          <span className="w-[25px] shrink-0">#</span>
          <span className="w-[95px] shrink-0">Time In/Out</span>
          <span className="min-w-0 flex-1">Caption</span>
          <span className="w-[30px] shrink-0 text-center">CPS</span>
        </div>
        <div className="scroll-y min-h-0 flex-1">
          {rows.map((e, i) => {
            const active = current?.id === e.id;
            return (
              <button
                key={e.id}
                type="button"
                data-testid={`shell-caption-inspector-row-${e.id}`}
                aria-current={active ? 'true' : undefined}
                aria-label={`Caption ${i + 1}: ${e.text ?? ''}`}
                className={`flex w-full items-center border-b border-hairline px-2 py-1.5 text-left ${
                  active ? 'bg-[var(--active-overlay)] text-tprimary' : 'bg-panel text-tmuted hover:bg-[var(--hover-overlay)]'
                }`}
                /* active row law: inset 1px accent ring (reference's
                   .active-list-item) */
                style={active ? { boxShadow: 'inset 0 0 0 1px var(--accent-selection)' } : undefined}
                onClick={() => setSelection([e.id])}
              >
                <span className="mono w-[25px] shrink-0 text-[10px]">{i + 1}</span>
                <span className="mono w-[95px] shrink-0 text-[10px] leading-[1.35]">
                  <span className="flex items-center gap-1">
                    <ChevronsLeft size={9} strokeWidth={1.6} className="shrink-0 text-tfaint" aria-hidden="true" />
                    {tc(e.startTime)}
                  </span>
                  <span className="flex items-center gap-1 text-tfaint">
                    <ChevronsLeft size={9} strokeWidth={1.6} className="shrink-0 rotate-180 text-tfaint" aria-hidden="true" />
                    {tc(e.startTime + e.duration)}
                  </span>
                </span>
                <span className="min-w-0 flex-1 truncate px-1">{e.text ?? ''}</span>
                <span className="mono w-[30px] shrink-0 text-center text-[10px]" data-testid={`shell-caption-inspector-cps-${e.id}`}>
                  {cps(e)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

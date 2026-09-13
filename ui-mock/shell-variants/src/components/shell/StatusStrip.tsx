/* StatusStrip — spec 18 §3.1/§6.3: 12px strip, autosave state machine
   (Saving… / Saved Ns ago / Save failed — retry), selection + zoom readouts.
   Mock autosave: doc mutations flip "Saving…" briefly, then stamp the save
   time; the debug overlay's "Simulate save failure" toggle (Save drill row)
   arms the store flag so the next attempt lands in the failure state for
   state-row testing — retry clears it. */

import { useEffect, useRef, useState } from 'react';
import { useUi } from '../../state/useUiStore';
import { sceneDuration } from '../../lib/mockData';
import { tc } from '../../lib/timecode';

export type SaveState = 'saving' | 'saved' | 'failed';

export function StatusStrip() {
  const scenes = useUi((s) => s.scenes);
  const activeSceneId = useUi((s) => s.activeSceneId);
  const selection = useUi((s) => s.selection);
  const pxPerSec = useUi((s) => s.pxPerSec);
  const simulateSaveFail = useUi((s) => s.simulateSaveFail);
  const retrySave = useUi((s) => s.retrySave);
  const saveAttempt = useUi((s) => s.saveAttempt);
  const scene = scenes.find((s) => s.id === activeSceneId) ?? scenes[0];

  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [savedAt, setSavedAt] = useState(Date.now());
  const [tick, setTick] = useState(0);
  const firstRun = useRef(true);

  // doc mutation → "Saving…" → saved stamp (mock ~600ms write)
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setSaveState('saving');
    const t = setTimeout(() => {
      if (useUi.getState().simulateSaveFail) {
        setSaveState('failed');
      } else {
        setSaveState('saved');
        setSavedAt(Date.now());
      }
    }, 600);
    return () => clearTimeout(t);
  }, [scenes]);

  // explicit retry (click) or any new saveAttempt re-runs the save cycle
  useEffect(() => {
    if (saveAttempt === 0) return;
    setSaveState('saving');
    const t = setTimeout(() => {
      if (useUi.getState().simulateSaveFail) setSaveState('failed');
      else { setSaveState('saved'); setSavedAt(Date.now()); }
    }, 600);
    return () => clearTimeout(t);
  }, [saveAttempt]);

  // "Saved Ns ago" ticker
  useEffect(() => {
    const i = setInterval(() => setTick((x) => x + 1), 5000);
    return () => clearInterval(i);
  }, []);

  const secsAgo = Math.max(0, Math.round((Date.now() - savedAt) / 1000));
  void tick;

  return (
    <div
      className="flex shrink-0 items-center gap-3 border-t border-hairline bg-shell px-2 text-[11px] text-tmuted"
      style={{ height: 12, minHeight: 12 }}
      data-testid="shell-status"
    >
      {/* R23-FIX (R1-P3): the SAVE chip is one persistent role=status live
          region — Saving… → Saved/failed transitions are announced politely
          (the old three siblings unmounted/remounted per state, so a state
          flip was never a content change a live region could announce).
          R23-FIX (item 10, R1-P2-1): leading-[12px] everywhere — the 12px
          band cannot hold an 11px font's default ~15px line box, so the
          strip's children overflowed it vertically. Text size stays at the
          spec's 11px floor (§3.1). */}
      <span role="status" data-testid="shell-status-save" className="flex items-center gap-1 leading-[12px]">
        {saveState === 'saving' && (
          <>
            <span className="h-[5px] w-[5px] animate-pulse rounded-full bg-[var(--mk-yellow)]" aria-hidden="true" />
            <span className="text-tmuted">Saving…</span>
          </>
        )}
        {saveState === 'saved' && (
          <>
            <span className="h-[5px] w-[5px] rounded-full bg-[var(--mk-green)]" aria-hidden="true" />
            <span>Saved {secsAgo === 0 ? 'just now' : `${secsAgo}s ago`}</span>
          </>
        )}
        {saveState === 'failed' && (
          /* R23-FIX (item 12, R1-P2-3): the retry control's text uses
             --danger-text (the lighter #ec5d62 tint) — raw --danger
             (#e5484d) measures ~4.0:1 on the shell bg, under WCAG AA for
             11px text; the tint clears 4.5:1 (deviation-registered: a
             text-tint fork of the danger token). The aria-label carries
             the full label-in-name (the visible text + the action,
             WCAG 2.5.3). */
          <button
            onClick={retrySave}
            className="flex items-center gap-1 rounded-[2px] px-1 text-[var(--danger-text)] underline decoration-dotted hover:bg-[var(--hover-overlay)]"
            aria-label="Save failed — click to retry save"
          >
            <span className="h-[5px] w-[5px] rounded-full bg-[var(--danger)]" aria-hidden="true" />
            Save failed — click to retry
          </button>
        )}
      </span>
      <span aria-live="polite" className="mono leading-[12px]">
        {selection.length > 0 ? `${selection.length} clip${selection.length > 1 ? 's' : ''} selected` : 'no selection'}
      </span>
      <span className="mono leading-[12px]">{tc(sceneDuration(scene))}</span>
      <span className="grow" />
      <span className="mono leading-[12px]">{Math.round(pxPerSec)} px/s</span>
      <span className="mono leading-[12px]">OPFS · local</span>
    </div>
  );
}

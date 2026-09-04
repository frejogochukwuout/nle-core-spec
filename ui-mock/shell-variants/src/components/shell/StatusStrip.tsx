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
      {saveState === 'saving' && (
        <span data-testid="shell-status-save" className="flex items-center gap-1 text-tmuted">
          <span className="h-[5px] w-[5px] animate-pulse rounded-full bg-[var(--mk-yellow)]" />
          Saving…
        </span>
      )}
      {saveState === 'saved' && (
        <span data-testid="shell-status-save" className="flex items-center gap-1">
          <span className="h-[5px] w-[5px] rounded-full bg-[var(--mk-green)]" />
          Saved {secsAgo === 0 ? 'just now' : `${secsAgo}s ago`}
        </span>
      )}
      {saveState === 'failed' && (
        <button
          data-testid="shell-status-save"
          onClick={retrySave}
          className="flex items-center gap-1 rounded-[2px] px-1 text-[var(--danger)] underline decoration-dotted hover:bg-[var(--hover-overlay)]"
          aria-label="Save failed — retry"
        >
          <span className="h-[5px] w-[5px] rounded-full bg-[var(--danger)]" />
          Save failed — click to retry
        </button>
      )}
      <span aria-live="polite" className="mono">
        {selection.length > 0 ? `${selection.length} clip${selection.length > 1 ? 's' : ''} selected` : 'no selection'}
      </span>
      <span className="mono">{tc(sceneDuration(scene))}</span>
      <span className="grow" />
      <span className="mono">{Math.round(pxPerSec)} px/s</span>
      <span className="mono">OPFS · local</span>
    </div>
  );
}

/* useInsertPreview — R20-W2 (DESIGN-R20 D2 / contract §3.1 / C48): computes
   the CURRENT hover-placement preview plan via planInsertMedia with a
   counting-only fake idFactory.

   Identity law (REV-B P2-4, binding): NEVER compute the plan inside a raw
   zustand selector — `planInsertMedia` allocates a fresh object per call,
   which traps v5 useSyncExternalStore selectors into an infinite re-render.
   The plan is computed in a useMemo keyed on the store atoms it reads; the
   store itself only ever holds {mediaId, mode} (hoverInsertPreview), never
   a plan object.

   Preview==commit by construction: this hook and insertMediaAt call the
   SAME pure planner over the same live doc; the only difference is the id
   factory (fake here, real at commit) — geometry is id-independent. */

import { useMemo } from 'react';
import { useUi } from '../state/useUiStore';
import { makePreviewIdFactory, planInsertMedia, type InsertPlan } from '../lib/insertPlan';

export function useInsertPreview(): InsertPlan | null {
  const scenes = useUi((s) => s.scenes);
  const activeSceneId = useUi((s) => s.activeSceneId);
  const hover = useUi((s) => s.hoverInsertPreview);
  const playhead = useUi((s) => s.playhead);
  const loop = useUi((s) => s.loop);
  const selection = useUi((s) => s.selection);

  return useMemo(() => {
    if (!hover) return null;
    return planInsertMedia(
      scenes,
      activeSceneId,
      hover.mediaId,
      hover.mode,
      { playhead, loop, selection },
      makePreviewIdFactory(), // counting-only — never advances the store id counter
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the exact store atoms the planner reads
  }, [scenes, activeSceneId, hover, playhead, loop, selection]);
}

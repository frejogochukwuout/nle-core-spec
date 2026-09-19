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
   factory (fake here, real at commit) — geometry is id-independent.
   R26-W-F1 (F1): the ctx now carries the source range too (the R22-W4
   commit fix mirrored here) — a cropped source previews exactly what the
   commit places, the WYSIWYG seam the GC audit caught (ghost 18.6 vs
   placed 9.4). Pinned in useInsertPreview.test. */

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
  /* R26-W-F1 (F1, GC's T#30 WYSIWYG seam): the SOURCE viewer's trimmed range
     rides the PREVIEW plan through the SAME ctx shape the commit thread
     builds (useUiStore.insertMediaAt's `sourceRange` spread) — the hover
     ghost paints out−in, never the full source duration. Absent/null range
     keeps the full-media default (the pinned backward-compat law). */
  const sourceRanges = useUi((s) => s.sourceRanges);

  return useMemo(() => {
    if (!hover) return null;
    return planInsertMedia(
      scenes,
      activeSceneId,
      hover.mediaId,
      hover.mode,
      {
        playhead, loop, selection,
        ...(sourceRanges[hover.mediaId]
          ? { sourceRange: { start: sourceRanges[hover.mediaId]!.in, end: sourceRanges[hover.mediaId]!.out } }
          : {}),
      },
      makePreviewIdFactory(), // counting-only — never advances the store id counter
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the exact store atoms the planner reads
  }, [scenes, activeSceneId, hover, playhead, loop, selection, sourceRanges]);
}

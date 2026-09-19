/* useInsertPreview — R26-W-F1 (F1, the GC audit's T#30 WYSIWYG seam): the
   hover-placement preview must carry the SOURCE viewer's trimmed range
   through the SAME ctx shape the commit thread builds
   (useUiStore.insertMediaAt's `sourceRange` spread). Before the fix the
   hook passed NO sourceRange: the hover ghost painted the FULL source
   duration (18.6s) while the commit placed the cropped range (9.4s) — the
   live-probe numbers in .agents/design/r26-audit/gc-source-insert.md §1
   (T#30, QUICKFIX). Pinned here:
     1. a set range → the ghost's dur = out−in, and the COMMIT
        (insertMediaAt) places exactly the previewed start/duration
        (preview==commit, the hook header's own contract);
     2. NO range → the full-media default survives (min(duration, 30));
     3. a range change MID-HOVER re-mints the plan (sourceRanges is a
        useMemo dep — the ghost never shows a stale length). */

import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useInsertPreview } from './useInsertPreview';
import { useUi } from '../state/useUiStore';

const S = () => useUi.getState();
const mainEls = () => S().scenes.find((sc) => sc.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-main')!.elements;
const mainIds = () => new Set(mainEls().map((e) => e.id));

describe('R26-W-F1 (F1): useInsertPreview carries the source range (preview==commit)', () => {
  it('a set range: the ghost paints out−in (9.4s — never the 18.6s full source), and the COMMIT places exactly the previewed geometry', () => {
    // the live probe's crop shape: IN 4.5 → OUT 13.9 of drone_launch's 18.6s
    act(() => {
      S().setSourceRangeIn('m-03', 4.5);
      S().setSourceRangeOut('m-03', 13.9);
      useUi.setState({ playhead: 12, selection: [], hoverInsertPreview: { mediaId: 'm-03', mode: 'insert' } });
    });
    const { result } = renderHook(() => useInsertPreview());
    const plan = result.current!;
    expect(plan.ok).toBe(true);
    expect(plan.geometry.ghost!.start).toBe(12);
    expect(plan.geometry.ghost!.dur).toBeCloseTo(9.4, 5); // out−in
    expect(plan.geometry.ghost!.dur).not.toBe(18.6); // the pre-fix full-source lie, pinned dead

    /* the commit half: insertMediaAt runs the SAME planner with the REAL id
       factory — the placed element's geometry must equal the previewed ghost
       (el-3 is the fixture's own m-03 clip, so the NEW element is the id
       diff, not a mediaId lookup). */
    const before = mainIds();
    act(() => { S().insertMediaAt('m-03', 'insert'); });
    const placed = mainEls().find((e) => !before.has(e.id))!;
    expect(placed.startTime).toBeCloseTo(plan.geometry.ghost!.start, 5);
    expect(placed.duration).toBeCloseTo(plan.geometry.ghost!.dur, 5);
    expect(placed.sourceStart).toBeCloseTo(4.5, 5); // the trimmed-in offset rides the placed clip
    // disarm — hygiene for the siblings below (the hover atom is shared state)
    act(() => { S().setHoverInsertPreview(null); });
  });

  it('NO range: the full-media default survives the threading (dur = min(duration, 30) = 18.6)', () => {
    act(() => {
      S().clearSourceRange('m-03');
      useUi.setState({ playhead: 12, selection: [], hoverInsertPreview: { mediaId: 'm-03', mode: 'insert' } });
    });
    const { result } = renderHook(() => useInsertPreview());
    const plan = result.current!;
    expect(plan.ok).toBe(true);
    expect(plan.geometry.ghost!.dur).toBeCloseTo(18.6, 5); // the pinned backward-compat law
    act(() => { S().setHoverInsertPreview(null); });
  });

  it('a range change MID-HOVER re-mints the plan (sourceRanges is a dep — the ghost never shows a stale length)', () => {
    act(() => {
      S().setSourceRangeIn('m-03', 4.5);
      S().setSourceRangeOut('m-03', 13.9);
      useUi.setState({ playhead: 12, selection: [], hoverInsertPreview: { mediaId: 'm-03', mode: 'insert' } });
    });
    const { result } = renderHook(() => useInsertPreview());
    expect(result.current!.geometry.ghost!.dur).toBeCloseTo(9.4, 5);
    // drag the OUT point back to 9.9 → 5.4s of source, WHILE the hover holds
    act(() => { S().setSourceRangeOut('m-03', 9.9); });
    expect(result.current!.ok).toBe(true);
    expect(result.current!.geometry.ghost!.dur).toBeCloseTo(5.4, 5);
    act(() => { S().setHoverInsertPreview(null); S().clearSourceRange('m-03'); });
  });
});

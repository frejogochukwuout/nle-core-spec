/* mockGrades.test — R20-W4b (DESIGN-R20 D3, gap C50): the grade sidecar +
   undo mechanics. The G-slice law: per-elementId GradeParams records + the
   special 'timeline' key (the post-clip grade — NEVER on ElementJSON,
   mockMixer precedent); setGrade/resetGrade are withHistory-able; the
   snapshot EXTENSION round-trips grades through undo/redo without breaking
   the doc-slice snapshot contract; console view-state (tab/target/preview/
   node) never mints history.
   R24-W2 (A2-R4, issue #69): the per-channel YRGB curve pins — the
   sidecar's seam shape. [recon] the contract's `mockGrades.ts` fixture
   module does not exist as a file (the sidecar + its seeds live in the
   FROZEN useUiStore), so the per-channel fixtures (a non-identity Y curve
   + an R channel curve in the seeds) live HERE, exercised through the
   same setGrade/undo seams the app writes. */

import { describe, expect, it, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useUi, TIMELINE_GRADE_KEY, resolveGradeTargetId, gradeOf } from './useUiStore';
import { DEFAULT_GRADE, DEFAULT_QUALIFIER } from '../lib/color';
import {
  DEFAULT_CURVE,
  channelCurve,
  isIdentityCurve,
  withChannelCurve,
  type CurveSet,
} from '../components/pages/color/curveMath';

const S = () => useUi.getState();

const resetColorSlice = () => useUi.setState({
  mockGrades: {}, past: [], future: [], colorInspectorTab: 'primaries',
  colorGradeTarget: 'clip', qualifierPreviewOn: false, selectedColorNodeId: 'primary',
  selection: ['el-2'],
});

beforeEach(() => {
  resetColorSlice();
});

describe('mockGrades sidecar (C50) — boot + read model', () => {
  it('boots EMPTY: absent key = identity grade (gradeOf default), console view-state defaults', () => {
    expect(S().mockGrades).toEqual({});
    expect(gradeOf(S(), 'el-2')).toEqual({ ...DEFAULT_GRADE });
    expect(S().colorInspectorTab).toBe('primaries');
    expect(S().colorGradeTarget).toBe('clip');
    expect(S().qualifierPreviewOn).toBe(false);
    expect(S().selectedColorNodeId).toBe('primary');
  });

  it('resolveGradeTargetId: clip mode → selection[0]; timeline mode → the special key; empty → null', () => {
    expect(resolveGradeTargetId(S())).toBe('el-2');
    act(() => { S().setColorGradeTarget('timeline'); });
    expect(resolveGradeTargetId(S())).toBe(TIMELINE_GRADE_KEY);
    act(() => { S().setColorGradeTarget('clip'); S().setSelection([]); });
    expect(resolveGradeTargetId(S())).toBeNull();
  });
});

describe('setGrade — partial merge + history mechanics', () => {
  it('writes a PARTIAL record onto the identity default (spec 08 §4.2 field names verbatim)', () => {
    act(() => { S().setGrade('el-2', { shHue: 205, shAmount: 0.137, lift: 0.02 }); });
    const g = S().mockGrades['el-2'];
    expect(g).toBeDefined();
    expect(g.shHue).toBe(205);
    expect(g.shAmount).toBeCloseTo(0.137, 5);
    expect(g.lift).toBeCloseTo(0.02, 5);
    // every other field stays the spec default (the record is partial)
    expect(g.contrast).toBe(DEFAULT_GRADE.contrast);
    expect(g.pivot).toBe(DEFAULT_GRADE.pivot);
    expect(g.lumMix).toBe(DEFAULT_GRADE.lumMix);
    // ONE history entry
    expect(S().past).toHaveLength(1);
  });

  it('merges follow-up patches deep for qualifier, shallow for scalars', () => {
    act(() => { S().setGrade('el-2', { qualifier: { hueCenter: 120, invert: true } }); });
    act(() => { S().setGrade('el-2', { qualifier: { hueWidth: 60 } }); });
    const q = S().mockGrades['el-2'].qualifier;
    expect(q).toMatchObject({ hueCenter: 120, hueWidth: 60, invert: true });
    expect(q?.satLow).toBe(DEFAULT_QUALIFIER.satLow); // untouched defaults survive the merge
  });

  it('qualifier: null patch clears the secondary node (gradeOf falls back)', () => {
    act(() => { S().setGrade('el-2', { qualifier: { invert: true } }); });
    expect(S().mockGrades['el-2'].qualifier).not.toBeNull();
    act(() => { S().setGrade('el-2', { qualifier: null }); });
    expect(S().mockGrades['el-2'].qualifier).toBeNull();
  });

  it('curves patch replaces the set wholesale (the point model is atomic)', () => {
    const pts = [{ x: 0, y: 0 }, { x: 0.5, y: 0.7 }, { x: 1, y: 1 }];
    act(() => { S().setGrade('el-2', { curves: { master: pts } }); });
    expect(S().mockGrades['el-2'].curves).toEqual({ master: pts });
  });

  it('R24-W2 (A2-R4): a per-channel YRGB set round-trips through setGrade verbatim (y + r in the seeds)', () => {
    /* the per-channel fixture: a non-identity Y curve + an R channel curve —
     the tagged storage seam (curveMath's header: master carries all four
     channels' points, ch-tagged; untagged = y) */
    const set: CurveSet = {
      master: [
        { x: 0, y: 0 }, { x: 0.5, y: 0.25 }, { x: 1, y: 1 },                        // the Y curve (untagged)
        { x: 0, y: 0, ch: 'r' }, { x: 0.5, y: 0.75, ch: 'r' }, { x: 1, y: 1, ch: 'r' }, // the R channel curve
      ],
    };
    act(() => { S().setGrade('el-2', { curves: set }); });
    const stored = S().mockGrades['el-2'].curves!;
    // the deep copy kept the tags — both channels survive the store's seam
    expect(stored.master.filter((p) => (p.ch ?? 'y') === 'y')).toHaveLength(3);
    expect(stored.master.filter((p) => p.ch === 'r')).toHaveLength(3);
    expect(isIdentityCurve(stored)).toBe(false);
    // the per-channel read model (the editor's view)
    expect(channelCurve(stored, 'y')).toEqual([{ x: 0, y: 0 }, { x: 0.5, y: 0.25 }, { x: 1, y: 1 }]);
    expect(channelCurve(stored, 'r')).toEqual([{ x: 0, y: 0, ch: 'r' }, { x: 0.5, y: 0.75, ch: 'r' }, { x: 1, y: 1, ch: 'r' }]);
    expect(channelCurve(stored, 'g')).toEqual(DEFAULT_CURVE.master); // absent = identity pair
    expect(S().past).toHaveLength(1);
  });

  it('R24-W2 (A2-R4): undo/redo round-trip the per-channel set (the tagged points survive cloneGrades)', () => {
    act(() => { S().setGrade('el-2', { curves: { master: [{ x: 0, y: 0.25 }, { x: 1, y: 1 }, { x: 0.5, y: 0.8, ch: 'b' }] } }); });
    act(() => { S().undo(); });
    expect(S().mockGrades).toEqual({});
    act(() => { S().redo(); });
    const g = S().mockGrades['el-2'].curves!;
    expect(g.master.find((p) => p.ch === 'b')).toEqual({ x: 0.5, y: 0.8, ch: 'b' });
    expect(g.master.find((p) => p.x === 0)).toEqual({ x: 0, y: 0.25 });
  });

  it('R24-W2 (A2-R4): withChannelCurve edits ONE channel through the same seam (the y curve survives an r edit)', () => {
    const yCurve = [{ x: 0, y: 0 }, { x: 0.5, y: 0.25 }, { x: 1, y: 1 }];
    act(() => { S().setGrade('el-2', { curves: { master: yCurve } }); });
    // the editor's r edit rebuilds the storage keeping y
    const next = withChannelCurve(S().mockGrades['el-2'].curves, 'r', [{ x: 0, y: 0, ch: 'r' }, { x: 1, y: 0.9, ch: 'r' }]);
    act(() => { S().setGrade('el-2', { curves: next }); });
    const stored = S().mockGrades['el-2'].curves!;
    expect(channelCurve(stored, 'y')).toEqual(yCurve); // y untouched
    expect(channelCurve(stored, 'r')).toEqual([{ x: 0, y: 0, ch: 'r' }, { x: 1, y: 0.9, ch: 'r' }]);
  });

  it('a no-op patch (same values) mints NO history entry', () => {
    act(() => { S().setGrade('el-2', { shHue: 100 }); });
    const before = S().past.length;
    act(() => { S().setGrade('el-2', { shHue: 100 }); });
    expect(S().past).toHaveLength(before);
    expect(S().mockGrades['el-2'].shHue).toBe(100);
  });

  it('the timeline key is a FIRST-CLASS record, independent of clip grades', () => {
    act(() => { S().setGrade(TIMELINE_GRADE_KEY, { exposure: 1 }); });
    act(() => { S().setGrade('el-2', { exposure: -1 }); });
    expect(S().mockGrades[TIMELINE_GRADE_KEY].exposure).toBe(1);
    expect(S().mockGrades['el-2'].exposure).toBe(-1);
    expect(Object.keys(S().mockGrades).sort()).toEqual(['el-2', TIMELINE_GRADE_KEY]);
  });

  it('independent of the mockMixer sidecar: no cross-writes, no cross-history', () => {
    act(() => { S().setMixerTrack('tr-audio-1', { fader: -20 }); });
    expect(S().mockGrades).toEqual({});
    expect(S().past).toHaveLength(0); // mixer faders are view-state (the G-slice law)
    act(() => { S().setGrade('el-2', { saturation: 20 }); });
    const strip = S().mixer.tracks['tr-audio-1'];
    expect(strip.fader).toBe(-20); // untouched by the grade write
    expect(S().past).toHaveLength(1);
  });
});

describe('resetGrade', () => {
  it('deletes the record (absence = identity) — ONE history entry', () => {
    act(() => { S().setGrade('el-2', { shHue: 205 }); });
    act(() => { S().resetGrade('el-2'); });
    expect(S().mockGrades['el-2']).toBeUndefined();
    expect(S().past).toHaveLength(2);
  });

  it('resetting an absent (already-default) key is a no-op — no history', () => {
    const before = S().past.length;
    act(() => { S().resetGrade('el-2'); });
    expect(S().past).toHaveLength(before);
  });
});

describe('undo/redo round-trip (the snapshot EXTENSION, C50)', () => {
  it('undo restores the pre-edit grades; redo restores the edit', () => {
    act(() => { S().setGrade('el-2', { shHue: 205, shAmount: 0.137 }); });
    expect(S().mockGrades['el-2'].shHue).toBe(205);
    act(() => { S().undo(); });
    expect(S().mockGrades).toEqual({});
    act(() => { S().redo(); });
    expect(S().mockGrades['el-2'].shHue).toBe(205);
    expect(S().mockGrades['el-2'].shAmount).toBeCloseTo(0.137, 5);
  });

  it('undo round-trips DEEP structures (qualifier + curves) without ref-sharing', () => {
    act(() => { S().setGrade('el-2', { qualifier: { invert: true }, curves: { master: [{ x: 0, y: 0.25 }, { x: 1, y: 1 }] } }); });
    act(() => { S().undo(); });
    expect(S().mockGrades).toEqual({});
    act(() => { S().redo(); });
    const g = S().mockGrades['el-2'];
    expect(g.qualifier?.invert).toBe(true);
    expect(g.curves?.master[0]).toEqual({ x: 0, y: 0.25 });
    // mutating the restored record must not leak into the redo stack
    act(() => { S().setGrade('el-2', { qualifier: { invert: false } }); });
    act(() => { S().undo(); });
    expect(S().mockGrades['el-2'].qualifier?.invert).toBe(true);
  });

  it('a doc mutation after a grade write: undo restores grades only; undo again restores the doc', () => {
    act(() => { S().setGrade('el-2', { shHue: 205 }); });
    act(() => { S().splitElement('el-1', 2); });
    expect(S().past).toHaveLength(2);
    act(() => { S().undo(); });
    // doc restored (split undone) — grades SURVIVE (carried in the snapshot)
    expect(S().mockGrades['el-2'].shHue).toBe(205);
    const el1 = S().scenes.find((s) => s.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-main')!.elements;
    expect(el1.find((e) => e.id === 'el-1')?.duration).toBe(8.5);
    act(() => { S().undo(); });
    expect(S().mockGrades).toEqual({});
  });

  it('undo of a doc-only mutation carries the CURRENT grades forward (no grade loss)', () => {
    act(() => { S().setGrade('el-2', { exposure: 1.5 }); });
    act(() => { S().splitElement('el-1', 2); });
    act(() => { S().undo(); }); // undo the split
    expect(S().mockGrades['el-2'].exposure).toBe(1.5);
    act(() => { S().redo(); }); // redo the split
    expect(S().mockGrades['el-2'].exposure).toBe(1.5);
  });
});

describe('console view-state never mints history', () => {
  it('tab / target / qualifierPreview / node selection are plain set()', () => {
    act(() => { S().setColorInspectorTab('curves'); });
    act(() => { S().setColorGradeTarget('timeline'); });
    act(() => { S().setQualifierPreviewOn(true); });
    act(() => { S().setColorNode('secondary'); });
    expect(S().colorInspectorTab).toBe('curves');
    expect(S().colorGradeTarget).toBe('timeline');
    expect(S().qualifierPreviewOn).toBe(true);
    expect(S().selectedColorNodeId).toBe('secondary');
    expect(S().past).toHaveLength(0);
    expect(S().future).toHaveLength(0);
  });
});

describe('gradeOf + identity model', () => {
  it('absent record reads as the identity grade (isIdentity-true shape)', () => {
    const g = gradeOf(S(), 'el-9');
    expect(g).toEqual({ ...DEFAULT_GRADE });
    expect(g.curves).toBeUndefined(); // curves absent = DEFAULT_CURVE (identity)
    expect(g.qualifier).toBeNull();
  });

  it('DEFAULT_CURVE is the 2-point identity diagonal', () => {
    expect(DEFAULT_CURVE.master).toEqual([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
  });
});

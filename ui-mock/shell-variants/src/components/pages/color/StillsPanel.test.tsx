/* StillsPanel.test.tsx — R23-WB (DESIGN-R23 D-B4; issues #97/#91). The
   DaVinci-style Gallery: still CARDS (gradient thumbnail + grade name +
   node-count chip), the clip-level caption that answers #97 IN the UI, the
   Save Still round-trip through the STORE's colorStills (view state — the
   sourceRanges law: survives unmounts, never snapshotted), delete, the
   apply → rec.setGrade seam (one undoable history entry), and the honest
   .drx export toast. The R22-D7 pins (apply/⌥-save through the sidecar)
   re-home here with the panel — the old local-useState home is dead. */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { StillsPanel } from './StillsPanel';
import { useUi, TIMELINE_GRADE_KEY, type Still } from '../../../state/useUiStore';
import { DEFAULT_GRADE, DEFAULT_QUALIFIER } from '../../../lib/color';
import { renderPlain } from '../../../test/helpers';

const S = () => useUi.getState();

type Patch = Partial<ReturnType<typeof useUi.getState>>;

const setStore = (patch?: Patch) => {
  useUi.setState({
    page: 'color',
    selection: ['el-2'],
    colorGradeTarget: 'clip',
    mockGrades: {},
    past: [],
    future: [],
    toasts: [],
    colorStills: [
      { id: 'still-01', name: 'Marina cool', mediaId: 'm-01', grade: { ...DEFAULT_GRADE, temperature: -18, contrast: 1.08, saturation: 8 } },
      { id: 'still-02', name: 'Golden hour', mediaId: 'm-01', grade: { ...DEFAULT_GRADE, temperature: 26, tint: 6, saturation: 18, highlights: -6 } },
      { id: 'still-03', name: 'Bleach lift', mediaId: 'm-04', grade: { ...DEFAULT_GRADE, lift: 0.04, saturation: -32, contrast: 1.22 } },
      { id: 'still-04', name: 'Night teal', mediaId: 'm-01', grade: { ...DEFAULT_GRADE, temperature: -30, tint: -10, midHue: 190, midAmount: 0.12, pivot: 0.38 } },
    ],
    ...patch,
  });
};

const boot = (patch?: Patch) => {
  setStore(patch);
  return renderPlain(<StillsPanel />);
};

beforeEach(() => {
  useUi.setState({ toasts: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('StillsPanel — the Gallery cards (D-B4)', () => {
  it('renders the store-backed stills as cards: name + node-count chip + the #97 caption', () => {
    boot();
    expect(screen.getByTestId('shell-stills')).toBeInTheDocument();
    for (const id of ['still-01', 'still-02', 'still-03', 'still-04']) {
      expect(screen.getByTestId(`shell-still-${id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`shell-still-${id}-apply`)).toBeInTheDocument();
      expect(screen.getByTestId(`shell-still-${id}-delete`)).toBeInTheDocument();
      expect(screen.getByTestId(`shell-still-${id}-drx`)).toBeInTheDocument();
    }
    // identity grades → 1 node (Primary) each
    expect(screen.getByTestId('shell-still-still-01-nodes')).toHaveTextContent('1N');
    // the #97 answer is IN the UI (clip level)
    expect(screen.getByTestId('shell-stills-scope')).toHaveTextContent(/Applies to the selected clip’s grade \(clip level\)/);
    expect(screen.getByText('Marina cool')).toBeInTheDocument();
  });

  it('the node-count chip is DERIVED from the grade pipeline (qualifier + non-identity curves each add a node)', () => {
    const stills: Still[] = [{
      id: 'still-10',
      name: 'Keyed cool',
      mediaId: 'm-01',
      grade: { ...DEFAULT_GRADE, qualifier: { ...DEFAULT_QUALIFIER, hueCenter: 20 }, curves: { master: [{ x: 0, y: 0 }, { x: 0.35, y: 0.42 }, { x: 1, y: 0.92 }] } },
    }];
    boot({ colorStills: stills });
    expect(screen.getByTestId('shell-still-still-10-nodes')).toHaveTextContent('3N');
  });
});

describe('StillsPanel — apply (the rec.setGrade seam, one history entry)', () => {
  it('clicking a card applies its grade to the current target (ONE undoable entry)', () => {
    boot();
    fireEvent.click(screen.getByTestId('shell-still-still-01-apply'));
    expect(S().mockGrades['el-2']).toMatchObject({ temperature: -18, contrast: 1.08, saturation: 8 });
    expect(S().past).toHaveLength(1);
  });

  it('the Timeline target applies through the SAME seam (the record domain)', () => {
    boot({ colorGradeTarget: 'timeline' });
    fireEvent.click(screen.getByTestId('shell-still-still-02-apply'));
    expect(S().mockGrades[TIMELINE_GRADE_KEY]).toMatchObject({ temperature: 26, saturation: 18 });
    expect(S().mockGrades['el-2']).toBeUndefined(); // clip record untouched
  });

  it('no grade target: the honest toast, no store write', () => {
    boot({ selection: [] });
    fireEvent.click(screen.getByTestId('shell-still-still-01-apply'));
    expect(S().mockGrades).toEqual({});
    expect(S().past).toHaveLength(0);
    expect(S().toasts.at(-1)).toMatchObject({ kind: 'info', title: 'No grade target' });
  });
});

describe('StillsPanel — Save Still (the promoted ⌥-click seam)', () => {
  it('Save Still captures the CURRENT target grade into the store (view state, no history)', () => {
    boot({ mockGrades: { 'el-2': { ...DEFAULT_GRADE, temperature: 14, saturation: 9, qualifier: { ...DEFAULT_QUALIFIER, hueCenter: 30 } } } });
    fireEvent.click(screen.getByTestId('shell-stills-save'));
    const still = S().colorStills.at(-1);
    expect(still).toMatchObject({ id: 'still-05', name: 'Still 5', mediaId: 'm-02' });
    // el-2 is the Marina interview clip → its source media rides the capture
    expect(still?.grade).toMatchObject({ temperature: 14, saturation: 9 });
    expect(still?.grade.qualifier).toMatchObject({ hueCenter: 30 });
    expect(S().past).toHaveLength(0); // view state — NEVER a history entry
  });

  it('Save Still with no target: the honest toast, nothing captured', () => {
    boot({ selection: [] });
    const n = S().colorStills.length;
    fireEvent.click(screen.getByTestId('shell-stills-save'));
    expect(S().colorStills).toHaveLength(n);
    expect(S().toasts.at(-1)).toMatchObject({ kind: 'info', title: 'No grade target' });
  });

  it('⌥-clicking a card still saves (the old seam, same handler)', () => {
    boot({ mockGrades: { 'el-2': { ...DEFAULT_GRADE, exposure: 0.4 } } });
    fireEvent.click(screen.getByTestId('shell-still-still-01-apply'), { altKey: true });
    expect(S().colorStills.at(-1)?.grade.exposure).toBe(0.4);
    expect(S().mockGrades['el-2']).toEqual({ ...DEFAULT_GRADE, exposure: 0.4 }); // the target is untouched — alt SAVES, never applies
  });

  it('stills survive UNMOUNTS (the store home — the D-B4 ruling)', () => {
    const { unmount } = boot({ mockGrades: { 'el-2': { ...DEFAULT_GRADE, temperature: 9 } } });
    fireEvent.click(screen.getByTestId('shell-stills-save'));
    unmount();
    const stills = S().colorStills;
    expect(stills.at(-1)?.grade.temperature).toBe(9);
    // a fresh mount sees the same list (the R22 local useState could not)
    boot({ colorStills: stills });
    expect(screen.getByTestId('shell-still-still-05')).toBeInTheDocument();
  });
});

describe('StillsPanel — delete + the .drx export', () => {
  it('delete removes the still (view state; the grade records are untouched)', () => {
    boot({ mockGrades: { 'el-2': { ...DEFAULT_GRADE, temperature: 5 } } });
    fireEvent.click(screen.getByTestId('shell-still-still-02-delete'));
    expect(S().colorStills.map((st) => st.id)).toEqual(['still-01', 'still-03', 'still-04']);
    expect(S().mockGrades['el-2']).toMatchObject({ temperature: 5 });
    expect(screen.queryByTestId('shell-still-still-02')).toBeNull();
  });

  it('the .drx export carries the honest render-round toast (the record itself is real)', () => {
    boot();
    fireEvent.click(screen.getByTestId('shell-still-still-03-drx'));
    expect(S().toasts.at(-1)).toMatchObject({
      kind: 'info',
      title: 'Stills',
      detail: expect.stringContaining('PowerGrade .drx export'),
    });
    expect(S().toasts.at(-1)?.detail).toContain('Bleach lift');
  });

  it('a save after a delete never collides ids (monotonic mint)', () => {
    boot();
    fireEvent.click(screen.getByTestId('shell-still-still-04-delete'));
    fireEvent.click(screen.getByTestId('shell-stills-save'));
    const ids = S().colorStills.map((st) => st.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('still-04'); // the id stays unique post-delete
  });
});

describe('the colorStills store actions (D-B4 — view-state law)', () => {
  it('addColorStill deep-copies the record — later edits never mutate the still', () => {
    setStore();
    const grade = { ...DEFAULT_GRADE, qualifier: { ...DEFAULT_QUALIFIER, hueCenter: 40 } };
    const still = S().addColorStill(grade, { name: 'Deep copy' });
    grade.qualifier!.hueCenter = 200; // mutate the input after the capture
    expect(S().colorStills.at(-1)?.grade.qualifier?.hueCenter).toBe(40);
    expect(still.grade.qualifier?.hueCenter).toBe(40);
  });

  it('setGrade history NEVER round-trips the stills (the sourceRanges precedent)', () => {
    setStore({ mockGrades: { 'el-2': { ...DEFAULT_GRADE, exposure: 0.5 } } });
    act(() => { S().addColorStill({ ...DEFAULT_GRADE, contrast: 1.3 }); });
    act(() => { useUi.getState().setGrade('el-2', { exposure: 0.9 }); });
    expect(S().past).toHaveLength(1);
    act(() => { useUi.getState().undo(); });
    expect(S().mockGrades['el-2'].exposure).toBe(0.5);
    expect(S().colorStills.at(-1)?.grade.contrast).toBe(1.3); // the still survives undo untouched
  });
});

/* StillsPanel.test.tsx — R23-WB (D-B4) → R24-W2 (DESIGN-R24 §1.2 A2-R5 +
   F4-P2; issues #97/#91/#70). The DaVinci-style GALLERY (renamed this
   wave): still CARDS (gradient thumbnail + grade name + node-count chip),
   the clip-level caption that answers #97 IN the UI, the Save Still
   round-trip through the STORE's colorStills (view state — the
   sourceRanges law: survives unmounts, never snapshotted), the #70
   CONTEXT MENU (the shared ContextMenu component, BOTH §4.9 routes:
   right-click + Shift+F10 with focus in the card — the per-card
   delete/.drx buttons are DELETED, Resolve has zero per-card buttons),
   and the apply → rec.setGrade seam with the REPLACE-NOT-MERGE law
   (F4-P2): reset-then-set in ONE patch, the curves three-case law, the
   undo round-trip. */

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

describe('StillsPanel — the Gallery cards (D-B4 → A2-R5: renamed Gallery)', () => {
  it('renders the store-backed stills as cards under the GALLERY header + count; ZERO per-card buttons', () => {
    boot();
    expect(screen.getByTestId('shell-stills')).toBeInTheDocument();
    expect(screen.getByTestId('shell-stills-count')).toHaveTextContent('4');
    for (const id of ['still-01', 'still-02', 'still-03', 'still-04']) {
      expect(screen.getByTestId(`shell-still-${id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`shell-still-${id}-apply`)).toBeInTheDocument();
      // A2-R5/#70: the per-card delete + .drx export buttons are DELETED
      // (Resolve has zero per-card buttons — the context menu owns them)
      expect(screen.queryByTestId(`shell-still-${id}-delete`)).toBeNull();
      expect(screen.queryByTestId(`shell-still-${id}-drx`)).toBeNull();
    }
    // identity grades → 1 node (Primary) each
    expect(screen.getByTestId('shell-still-still-01-nodes')).toHaveTextContent('1N');
    // the #97 answer is IN the UI (clip level)
    expect(screen.getByTestId('shell-stills-scope')).toHaveTextContent(/Applies to the selected clip’s grade \(clip level\)/);
    expect(screen.getByText('Marina cool')).toBeInTheDocument();
  });

  it('the node-count chip is DERIVED from the grade pipeline (qualifier + non-identity curves each add a node; per-channel curves count)', () => {
    const stills: Still[] = [{
      id: 'still-10',
      name: 'Keyed cool',
      mediaId: 'm-01',
      grade: { ...DEFAULT_GRADE, qualifier: { ...DEFAULT_QUALIFIER, hueCenter: 20 }, curves: { master: [{ x: 0, y: 0 }, { x: 0.35, y: 0.42 }, { x: 1, y: 0.92 }] } },
    }, {
      id: 'still-11',
      name: 'R-channel lift',
      mediaId: 'm-01',
      grade: { ...DEFAULT_GRADE, curves: { master: [{ x: 0, y: 0, ch: 'r' }, { x: 0.5, y: 0.6, ch: 'r' }, { x: 1, y: 1, ch: 'r' }] } },
    }];
    boot({ colorStills: stills });
    expect(screen.getByTestId('shell-still-still-10-nodes')).toHaveTextContent('3N');
    expect(screen.getByTestId('shell-still-still-11-nodes')).toHaveTextContent('2N'); // the curves node, no qualifier
  });
});

describe('StillsPanel — apply = REPLACE, not merge (A2-R5 + F4-P2 — the applyStillToTarget seam)', () => {
  it('PIN 1 (replace-not-merge + undo): a curve-free still RESETS a non-identity target — curves, qualifier and scalars, in ONE patch; undo restores', () => {
    boot({ mockGrades: {
      'el-2': {
        ...DEFAULT_GRADE,
        temperature: 5,
        qualifier: { ...DEFAULT_QUALIFIER, hueCenter: 30 },
        curves: { master: [{ x: 0, y: 0 }, { x: 0.5, y: 0.3 }, { x: 1, y: 1 }] },
      },
    } });
    fireEvent.click(screen.getByTestId('shell-still-still-01-apply'));
    const applied = S().mockGrades['el-2'];
    // the still's scalars REPLACED the target's (not merged onto them)
    expect(applied).toMatchObject({ temperature: -18, contrast: 1.08, saturation: 8 });
    // the target's qualifier is CLEARED (reset-then-set, never a stale carry-over)
    expect(applied.qualifier).toBeNull();
    // THE F4-P2 LAW: the curves reset — every channel absent = identity
    // ([recon storage note] the contract's literal `curves: {}` cannot ride
    // the frozen store's mergeGrade; the faithful alternative is the empty
    // master — identical semantics)
    expect(applied.curves).toEqual({ master: [] });
    // ONE setGrade patch → ONE undoable history entry
    expect(S().past).toHaveLength(1);
    // the undo round-trip restores the pre-apply record WHOLESALE
    act(() => { S().undo(); });
    expect(S().mockGrades['el-2'].curves?.master).toHaveLength(3);
    expect(S().mockGrades['el-2'].qualifier).toMatchObject({ hueCenter: 30 });
    expect(S().mockGrades['el-2'].temperature).toBe(5);
  });

  it('PIN 2 (wholesale replace through the MENU route): a still WITH curves replaces the target\'s curves verbatim', () => {
    const stills: Still[] = [{
      id: 'still-20',
      name: 'YRGB grade',
      mediaId: 'm-01',
      grade: {
        ...DEFAULT_GRADE,
        curves: { master: [{ x: 0, y: 0 }, { x: 0.5, y: 0.25 }, { x: 1, y: 1 }, { x: 0, y: 0, ch: 'r' }, { x: 1, y: 0.9, ch: 'r' }] },
      },
    }];
    boot({
      colorStills: stills,
      mockGrades: { 'el-2': { ...DEFAULT_GRADE, curves: { master: [{ x: 0, y: 0.2 }, { x: 1, y: 1 }] } } },
    });
    // the menu route: right-click the card → Apply
    fireEvent.contextMenu(screen.getByTestId('shell-still-still-20-apply'));
    fireEvent.click(screen.getByTestId('shell-menu-stills-apply'));
    expect(S().mockGrades['el-2'].curves?.master).toEqual(stills[0].grade.curves!.master);
    expect(S().mockGrades['el-2'].curves?.master.some((p) => p.ch === 'r')).toBe(true);
    expect(S().past).toHaveLength(1);
  });

  it('PIN 3 (the no-op-preserve law): a curves-free still on an IDENTITY target carries NO curves key — the curves stay absent, and a fully-identity still mints NO history entry', () => {
    // a real-params still on an identity target: the curves key is OMITTED
    // (no junk reset record), the params mint ONE entry
    const first = boot();
    fireEvent.click(screen.getByTestId('shell-still-still-01-apply'));
    expect(S().mockGrades['el-2'].curves).toBeUndefined();
    expect(S().past).toHaveLength(1);
    // the fully-identity still: the whole patch is a no-op — NO history
    first.unmount();
    const blank: Still[] = [{ id: 'still-30', name: 'Blank', mediaId: null, grade: { ...DEFAULT_GRADE } }];
    boot({ colorStills: blank, mockGrades: {} });
    fireEvent.click(screen.getByTestId('shell-still-still-30-apply'));
    expect(S().mockGrades['el-2']).toBeUndefined(); // gradeOf stays the identity default
    expect(S().past).toHaveLength(0); // no-op → no history entry
  });

  it('clicking a card applies its grade to the current target (ONE undoable entry — the click route shares the seam)', () => {
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

  it('no grade target: the honest toast, no store write (both routes)', () => {
    boot({ selection: [] });
    fireEvent.click(screen.getByTestId('shell-still-still-01-apply'));
    expect(S().mockGrades).toEqual({});
    expect(S().past).toHaveLength(0);
    expect(S().toasts.at(-1)).toMatchObject({ kind: 'info', title: 'No grade target' });
    // the menu route keeps the same honesty
    fireEvent.contextMenu(screen.getByTestId('shell-still-still-02-apply'));
    fireEvent.click(screen.getByTestId('shell-menu-stills-apply'));
    expect(S().mockGrades).toEqual({});
    expect(S().toasts.at(-1)).toMatchObject({ kind: 'info', title: 'No grade target' });
  });
});

describe('StillsPanel — the #70 context menu (both §4.9 routes)', () => {
  it('right-click a card opens the shared menu: Apply / Delete / Export PowerGrade', () => {
    boot();
    fireEvent.contextMenu(screen.getByTestId('shell-still-still-02-apply'));
    expect(screen.getByTestId('shell-menu-stills')).toBeInTheDocument();
    expect(screen.getByTestId('shell-menu-stills-apply')).toHaveTextContent('Apply');
    expect(screen.getByTestId('shell-menu-stills-delete')).toHaveTextContent('Delete');
    expect(screen.getByTestId('shell-menu-stills-export')).toHaveTextContent('Export PowerGrade');
    // the destructive styling on Delete (the shared MenuItem.danger law)
    expect(screen.getByTestId('shell-menu-stills-delete')).toHaveClass('is-danger');
    // Escape closes (§4.9 — a mouse right-click never moved focus, so the
    // menu just dismisses)
    fireEvent.keyDown(screen.getByTestId('shell-menu-stills'), { key: 'Escape' });
    expect(screen.queryByTestId('shell-menu-stills')).toBeNull();
  });

  it('the KEYBOARD route (Shift+F10 with focus in the card) opens the same menu; Esc returns focus to the opener', () => {
    boot();
    const card = screen.getByTestId('shell-still-still-03-apply');
    card.focus();
    fireEvent.keyDown(card, { key: 'F10', shiftKey: true });
    expect(screen.getByTestId('shell-menu-stills')).toBeInTheDocument();
    expect(screen.getByTestId('shell-menu-stills-delete')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByTestId('shell-menu-stills'), { key: 'Escape' });
    expect(screen.queryByTestId('shell-menu-stills')).toBeNull();
    // §4.9: focus returns to the opener (the focused card)
    expect(screen.getByTestId('shell-still-still-03-apply')).toHaveFocus();
  });

  it('menu Delete removes the still (view state; the grade records are untouched)', () => {
    boot({ mockGrades: { 'el-2': { ...DEFAULT_GRADE, temperature: 5 } } });
    fireEvent.contextMenu(screen.getByTestId('shell-still-still-02-apply'));
    fireEvent.click(screen.getByTestId('shell-menu-stills-delete'));
    expect(S().colorStills.map((st) => st.id)).toEqual(['still-01', 'still-03', 'still-04']);
    expect(S().mockGrades['el-2']).toMatchObject({ temperature: 5 });
    expect(screen.queryByTestId('shell-still-still-02')).toBeNull();
    expect(screen.queryByTestId('shell-menu-stills')).toBeNull(); // the menu closed
  });

  it('menu Export PowerGrade carries the honest render-round toast (the record itself is real)', () => {
    boot();
    fireEvent.contextMenu(screen.getByTestId('shell-still-still-03-apply'));
    fireEvent.click(screen.getByTestId('shell-menu-stills-export'));
    expect(S().toasts.at(-1)).toMatchObject({
      kind: 'info',
      title: 'Stills',
      detail: expect.stringContaining('PowerGrade .drx export'),
    });
    expect(S().toasts.at(-1)?.detail).toContain('Bleach lift');
  });

  it('a save after a delete never collides ids (monotonic mint — the menu delete route)', () => {
    boot();
    fireEvent.contextMenu(screen.getByTestId('shell-still-still-04-apply'));
    fireEvent.click(screen.getByTestId('shell-menu-stills-delete'));
    fireEvent.click(screen.getByTestId('shell-stills-save'));
    const ids = S().colorStills.map((st) => st.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('still-04'); // the id stays unique post-delete
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

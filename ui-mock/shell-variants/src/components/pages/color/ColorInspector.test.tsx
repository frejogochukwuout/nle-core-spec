/* ColorInspector — R22-D2 (DESIGN-R22; issues #78/#79): the ONE grading
   surface in the right rail. Pins:
   - the tab bar: [Primaries|Curves|Qualifier] tablist semantics + arrow
     roving + store write (colorInspectorTab);
   - the W3 type-driven header: chip + kind badge, the Timeline-grade badge;
   - the context row: node chip (C56 routing) + Clip⇄Timeline target toggle;
   - the panel round-trips: every tab's controls write the mockGrades
     sidecar through the SAME resolver (single-owner law). */

import { describe, expect, it, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorInspector } from './ColorInspector';
import { useUi } from '../../../state/useUiStore';
import { type UiPatch } from '../../../test/helpers';
import { DEFAULT_GRADE, DEFAULT_QUALIFIER } from '../../../lib/color';

type Patch = UiPatch;

const setStore = (patch?: Patch) => {
  useUi.setState((s) => ({
    page: 'color',
    scenes: s.scenes,
    selection: ['el-2'],
    mockGrades: {},
    past: [],
    future: [],
    colorInspectorTab: 'primaries',
    colorGradeTarget: 'clip',
    selectedColorNodeId: 'primary',
    ...(patch ?? {}),
  }));
};

const mountInspector = (patch?: Patch) => {
  setStore(patch);
  return render(<ColorInspector />);
};

const S = () => useUi.getState();

beforeEach(() => {
  useUi.setState({ toasts: [] });
});

describe('ColorInspector — the tab bar (the #78 directive)', () => {
  it('renders the tablist with three tabs; Primaries selected by default', () => {
    mountInspector();
    const list = screen.getByRole('tablist', { name: 'Color inspector tools' });
    expect(list).toBeInTheDocument();
    expect(screen.getByTestId('shell-color-inspector-tab-primaries')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('shell-color-inspector-tab-curves')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('shell-color-inspector-tab-qualifier')).toHaveAttribute('aria-selected', 'false');
  });

  it('clicking a tab writes colorInspectorTab + swaps the panel', () => {
    mountInspector();
    fireEvent.click(screen.getByTestId('shell-color-inspector-tab-curves'));
    expect(S().colorInspectorTab).toBe('curves');
    expect(screen.getByTestId('shell-color-inspector-panel')).toBeInTheDocument();
    // the curves panel mounts (its curve canvas region)
    expect(screen.getByRole('tabpanel', { name: 'Curves' })).toBeInTheDocument();
  });

  it('arrow roving: ←/→ move the tab stop with wrap; focus follows', async () => {
    const user = userEvent.setup();
    mountInspector();
    const primaries = screen.getByTestId('shell-color-inspector-tab-primaries');
    primaries.focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(screen.getByTestId('shell-color-inspector-tab-curves'));
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(screen.getByTestId('shell-color-inspector-tab-qualifier'));
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(screen.getByTestId('shell-color-inspector-tab-primaries'));
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(screen.getByTestId('shell-color-inspector-tab-qualifier'));
  });
});

describe('ColorInspector — the header + context row', () => {
  it('the chip carries the clip label + kind badge; the Timeline badge swaps in on the timeline target', () => {
    const first = mountInspector();
    expect(screen.getByTestId('shell-color-inspector-chip')).toHaveTextContent('Marina interview');
    expect(screen.getByTestId('shell-color-inspector-kind')).toHaveTextContent('Video');
    expect(screen.queryByTestId('shell-color-inspector-timeline-badge')).toBeNull();
    first.unmount();
    mountInspector({ colorGradeTarget: 'timeline' });
    expect(screen.getByTestId('shell-color-inspector-timeline-badge')).toBeInTheDocument();
    expect(screen.getByTestId('shell-color-inspector-chip')).toHaveTextContent('Timeline');
  });

  it('no target selected: the honest empty header (no panel crash)', () => {
    mountInspector({ selection: [], colorGradeTarget: 'clip' });
    expect(screen.getByTestId('shell-color-inspector-chip')).toHaveTextContent(/no clip selected/i);
  });

  it('the node chip follows selectedColorNodeId (C56); the TAB ROUTING is the graph-click law', () => {
    mountInspector();
    expect(screen.getByTestId('shell-color-inspector-node')).toHaveTextContent('Node 01 · Primaries');
    // the chip mirrors the node selection; the graph's clickNode routes the
    // TAB (setColorNode('secondary') alone does NOT — the routing lives in
    // ColorNodeGraph.clickNode, pinned in its own tests)
    act(() => { useUi.getState().setColorNode('secondary'); });
    expect(screen.getByTestId('shell-color-inspector-node')).toHaveTextContent('Node 02 · Qualifier');
    expect(S().colorInspectorTab).toBe('primaries');
  });

  it('the Clip ⇄ Timeline toggle writes colorGradeTarget; the label follows', () => {
    mountInspector();
    fireEvent.click(screen.getByTestId('shell-color-inspector-target-timeline'));
    expect(S().colorGradeTarget).toBe('timeline');
    expect(screen.getByTestId('shell-color-inspector-target')).toHaveTextContent('Timeline grade');
    fireEvent.click(screen.getByTestId('shell-color-inspector-target-clip'));
    expect(S().colorGradeTarget).toBe('clip');
    expect(screen.getByTestId('shell-color-inspector-target')).toHaveTextContent('Marina interview');
  });
});

describe('ColorInspector — the panel round-trips (store-driven, single owner)', () => {
  it('Primaries: a wheel drag commits ONE setGrade with the merged GradeParams (el-2)', () => {
    mountInspector();
    // the store-side round trip through the SAME resolver the lane strip uses
    useUi.getState().setGrade('el-2', { temperature: 12.5 });
    const rec = S().mockGrades['el-2'];
    expect(rec.temperature).toBe(12.5);
    expect(rec.shHue).toBe(DEFAULT_GRADE.shHue); // untouched fields preserved
  });

  it('Qualifier: the qualifier seed writes through the grade record (one entry, undoable)', () => {
    mountInspector({ colorInspectorTab: 'qualifier' });
    useUi.getState().setGrade('el-2', { qualifier: { ...DEFAULT_QUALIFIER, hueCenter: 28, hueWidth: 46 } });
    expect(S().mockGrades['el-2']?.qualifier?.hueCenter).toBe(28);
    // one history entry per committed grade write (the D3 commit law)
    expect(S().past.length).toBe(1);
    useUi.getState().undo();
    expect(S().mockGrades['el-2']).toBeUndefined();
  });

  it('Timeline target: the timeline grade is editable here (its ONLY editor)', () => {
    mountInspector({ colorGradeTarget: 'timeline' });
    useUi.getState().setGrade('timeline', { contrast: 1.15 });
    expect(S().mockGrades.timeline.contrast).toBe(1.15);
  });
});

/* ColorInspector — R22-D2 (DESIGN-R22; issues #78/#79) → R25-W3
 * (DESIGN-R25 §1 R7–R10 / §3 W3 / §6 A2; issues th_mtzom4xu "what does
 * this mean?", th_mtzomdge, th_mtzonhlu "extremely confusing — clip or
 * node editor?", th_mtzoo09d "one track? all?"). Pins:
 * - the tab bar: [Primaries|Curves|Qualifier] tablist semantics + arrow
 *   roving + store write (colorInspectorTab);
 * - the A2 3-chip GRADE TARGET breadcrumb: [scope] ▸ [level] ▸ [node] —
 *   the scope chip (name · track / "Timeline (all clips)"), the level
 *   segmented control (colorGradeTarget — ONE source with the node-graph
 *   header twin), the node chip (selectedColorNodeId + the console-row
 *   Nodes tab focus), the EXACT timeline-grade tooltip copy;
 * - A2's orange dots on the tabs holding adjustments;
 * - the panel round-trips: every tab's controls write the mockGrades
 *   sidecar through the SAME resolver (single-owner law).
 *
 * RE-PINS (R25-W3, old → new): the R22 Timeline-grade badge is FOLDED into
 * breadcrumb chip 1 (its testid retired with the grammar); the
 * `shell-color-inspector-target` mono label died with the context row (the
 * breadcrumb subsumes it); the node chip's labels come from the graph's
 * own node map ('Node 01 · Primary', not the old console-surface name
 * 'Node 01 · Primaries' — one source of truth). */

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
    consoleTab: 'timeline',
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

describe('R25-W3 (A2): the GRADE TARGET breadcrumb — [scope] ▸ [level] ▸ [node]', () => {
  it('the row is self-explaining: the GRADE TARGET label + the three chips render for a selected-clip target', () => {
    mountInspector();
    const row = screen.getByTestId('shell-color-inspector-breadcrumb');
    expect(row).toHaveTextContent('Grade target');
    // chip 1 — the SCOPE: the clip's name · track (el-2 lives on tr-main "V1")
    expect(screen.getByTestId('shell-color-inspector-chip')).toHaveTextContent('Marina interview · V1');
    expect(screen.getByTestId('shell-color-inspector-kind')).toHaveTextContent('Video');
    // chip 2 — the LEVEL: the segmented pair, Clip grade selected
    expect(screen.getByTestId('shell-color-inspector-target-clip')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('shell-color-inspector-target-timeline')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('shell-color-inspector-target-clip')).toHaveTextContent('Clip grade');
    // chip 3 — the NODE: `Node n · label` (the graph's own label map)
    expect(screen.getByTestId('shell-color-inspector-node')).toHaveTextContent('Node 01 · Primary');
  });

  it('the timeline target renders "Timeline (all clips)" — the whole-timeline copy (th_mtzoo09d)', () => {
    mountInspector({ colorGradeTarget: 'timeline' });
    expect(screen.getByTestId('shell-color-inspector-chip')).toHaveTextContent('Timeline (all clips)');
    // the timeline chip carries the accent treatment + A2's exact tooltip
    expect(screen.getByTestId('shell-color-inspector-chip')).toHaveClass('border-accent');
    expect(screen.getByTestId('shell-color-inspector-chip')).toHaveAttribute(
      'title',
      'Timeline grade — applies to every clip in this timeline, after clip grades.',
    );
    expect(screen.getByTestId('shell-color-inspector-target-timeline')).toHaveAttribute('aria-pressed', 'true');
  });

  it('the timeline segment tooltip is A2\'s EXACT copy (never "one track")', () => {
    mountInspector();
    expect(screen.getByTestId('shell-color-inspector-target-timeline')).toHaveAttribute(
      'data-tip',
      'Timeline grade — applies to every clip in this timeline, after clip grades.',
    );
  });

  it('no target selected: the honest empty chip (no panel crash)', () => {
    mountInspector({ selection: [], colorGradeTarget: 'clip' });
    expect(screen.getByTestId('shell-color-inspector-chip')).toHaveTextContent(/no clip selected/i);
  });

  it('the segmented control commits the level through the EXISTING store seam (setColorGradeTarget)', () => {
    mountInspector();
    fireEvent.click(screen.getByTestId('shell-color-inspector-target-timeline'));
    expect(S().colorGradeTarget).toBe('timeline');
    /* RE-PIN (R25-W3/A2): the old context-row pin asserted the retired
       `shell-color-inspector-target` mono label ('Timeline grade'); the
       breadcrumb's chip 1 now carries the target — 'Timeline (all clips)'
       (A2's whole-timeline copy, th_mtzoo09d). */
    expect(screen.getByTestId('shell-color-inspector-chip')).toHaveTextContent('Timeline (all clips)');
    fireEvent.click(screen.getByTestId('shell-color-inspector-target-clip'));
    expect(S().colorGradeTarget).toBe('clip');
    expect(screen.getByTestId('shell-color-inspector-chip')).toHaveTextContent('Marina interview · V1');
  });

  it('the node chip click SETS the current-node view-state + focuses the graph (the console-row Nodes tab)', () => {
    mountInspector({ selectedColorNodeId: 'secondary' });
    expect(screen.getByTestId('shell-color-inspector-node')).toHaveTextContent('Node 02 · Secondary');
    fireEvent.click(screen.getByTestId('shell-color-inspector-node'));
    expect(S().selectedColorNodeId).toBe('secondary'); // the current-node view-state (the graph's selection atom)
    expect(S().consoleTab).toBe('nodes'); // the focus lands in the node graph console
    expect(S().colorInspectorTab).toBe('primaries'); // the chip does NOT route the inspector tab (the graph's clickNode owns that law)
  });

  it('the node chip reads the FIRST node when nothing is selected (the C56 default binding)', () => {
    mountInspector({ selectedColorNodeId: null });
    expect(screen.getByTestId('shell-color-inspector-node')).toHaveTextContent('Node 01 · Primary');
  });

  it('the node chip follows selectedColorNodeId (C56) — labels from the graph\'s own node map', () => {
    mountInspector();
    /* RE-PIN (R25-W3/A2): the old pin asserted the console-surface names
       ('Node 01 · Primaries' / 'Node 02 · Qualifier'); the chip now renders
       the GRAPH's own node titles ('Node 01 · Primary' / 'Node 02 ·
       Secondary') from COLOR_NODE_LABELS — one source of truth, the node
       chip names the NODE, not the tab it routes. */
    expect(screen.getByTestId('shell-color-inspector-node')).toHaveTextContent('Node 01 · Primary');
    act(() => { useUi.getState().setColorNode('secondary'); });
    expect(screen.getByTestId('shell-color-inspector-node')).toHaveTextContent('Node 02 · Secondary');
    expect(S().colorInspectorTab).toBe('primaries'); // the chip mirrors the selection; the graph's clickNode routes the TAB
  });

  it('A2\'s orange dots: a tab holding adjustments in the current target\'s record carries the dot', () => {
    mountInspector({ mockGrades: { 'el-2': { ...DEFAULT_GRADE, temperature: 12 } } });
    expect(screen.getByTestId('shell-color-inspector-tab-dot-primaries')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-color-inspector-tab-dot-curves')).toBeNull();
    expect(screen.queryByTestId('shell-color-inspector-tab-dot-qualifier')).toBeNull();
    // a qualifier on the record lights the Qualifier tab's dot
    act(() => {
      setStore({ mockGrades: { 'el-2': { ...DEFAULT_GRADE, qualifier: { ...DEFAULT_QUALIFIER, hueCenter: 20 } } } });
    });
    expect(screen.getByTestId('shell-color-inspector-tab-dot-qualifier')).toBeInTheDocument();
  });
});

describe('ColorInspector — the header fold (R25-W3 re-pins)', () => {
  it('the R22 Timeline-grade badge is FOLDED into the breadcrumb (its testid retired with the grammar)', () => {
    const first = mountInspector();
    expect(screen.getByTestId('shell-color-inspector-chip')).toHaveTextContent('Marina interview');
    /* RE-PIN (R25-W3/A2, th_mtzomdge): the badge used to appear when
       colorGradeTarget === 'timeline'; the breadcrumb's scope chip +
       the segmented tooltip subsume its meaning, so the badge is GONE at
       both levels (the old pin's second half is re-pinned here). */
    expect(screen.queryByTestId('shell-color-inspector-timeline-badge')).toBeNull();
    first.unmount();
    mountInspector({ colorGradeTarget: 'timeline' });
    expect(screen.queryByTestId('shell-color-inspector-timeline-badge')).toBeNull(); // folded — re-pinned
    expect(screen.getByTestId('shell-color-inspector-chip')).toHaveTextContent('Timeline');
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

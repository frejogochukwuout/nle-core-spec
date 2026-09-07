/* FxInspector — R23-WA (DESIGN-R23 D-A4/#105): the FX surface's parametric
   rail. ONE component, THREE modes, TWO frames (the FX page's rail; the Edit
   page's embedded section — pinned in Inspector.test). Pinned here at the
   component level:
   - transition mode: the shared TransitionSection (presentation / duration /
     alignment) with a LIVE Remove (removeTransition);
   - fade mode: duration row routes setFade + Remove routes removeFade
     (the delete-aware seams);
   - clip mode: the shared EffectsSection (#105 "selecting the clip itself
     will just inspect Effects") — the exact Inspector stack, no fork;
   - the empty state + the stale-id second net (renders nothing). */

import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FxInspector, FxInspectorSection } from './FxInspector';
import { useUi } from '../../state/useUiStore';
import { findElement } from '../../lib/mockData';
import type { UiPatch } from '../../test/helpers';

const S = () => useUi.getState();
const el = (id: string) => findElement(S().scenes, id)!.element;

/** boot a scenario then render the RAIL frame (the FX page's mount) */
function bootRail(patch: UiPatch = {}) {
  useUi.setState(patch);
  return render(<FxInspector />);
}

describe('FxInspector — the rail frame (the FX page)', () => {
  it('empty state: no FX object, no selection → the honest onboarding line', () => {
    bootRail({ selection: [] });
    expect(screen.getByTestId('shell-fxinspector')).toBeInTheDocument();
    expect(screen.getByTestId('shell-fxinspector-state-empty')).toHaveTextContent(/select a transition, fade, or clip/i);
  });
});

describe('FxInspector — transition mode (the shared TransitionSection)', () => {
  it('a selected seam transition shows presentation / duration / alignment + LIVE Remove', () => {
    bootRail({ selection: [], selectedFxObject: { kind: 'transition', elementId: 'el-2' } });
    // the shared section's own fields (Inspector.tsx rows — no fork)
    expect(screen.getByTestId('transition-presentation')).toHaveValue('Cross Dissolve');
    expect(screen.getByLabelText('Duration value')).toHaveValue('0.75s');
    // Remove is LIVE now — removeTransition is a real delete-aware action
    fireEvent.click(screen.getByRole('button', { name: 'Remove transition' }));
    expect(el('el-2').transitionOut).toBeUndefined();
    expect(S().selectedFxObject).toBeNull(); // the pointing selection cleared
  });

  it('presentation + duration writes route setTransition', () => {
    bootRail({ selection: [], selectedFxObject: { kind: 'transition', elementId: 'el-2' } });
    fireEvent.change(screen.getByTestId('transition-presentation'), { target: { value: 'Dip to Black' } });
    expect(el('el-2').transitionOut!.presentation).toBe('Dip to Black');
    const dur = screen.getByLabelText('Duration value');
    fireEvent.change(dur, { target: { value: '1.25' } });
    fireEvent.keyDown(dur, { key: 'Enter' });
    expect(el('el-2').transitionOut!.duration).toBe(1.25);
  });
});

describe('FxInspector — fade mode (the FadeSection)', () => {
  it('a selected fade object shows the duration row + Remove; commits route setFade/removeFade', () => {
    bootRail({ selection: [], selectedFxObject: { kind: 'fade', elementId: 'el-1', side: 'in' } });
    expect(screen.getByText(/A012_C034_beach_wide/)).toBeInTheDocument(); // names the clip + side
    expect(screen.getByText(/opacity ramp — the fadeIn\/fadeOut domain/)).toBeInTheDocument();
    const dur = screen.getByLabelText('Duration value');
    expect(dur).toHaveValue('0.50s'); // the fixture demo fade (ParamRow 2-decimals form)
    fireEvent.change(dur, { target: { value: '1.5' } });
    fireEvent.keyDown(dur, { key: 'Enter' });
    expect(el('el-1').fadeIn).toBe(1.5); // setFade wrote the VIDEO domain
    fireEvent.click(screen.getByRole('button', { name: 'Remove fade in' }));
    expect('fadeIn' in el('el-1')).toBe(false); // delete-aware — the key is gone
    expect(S().selectedFxObject).toBeNull();
  });

  it('an AUDIO fade object names the audioFade domain and routes it', () => {
    bootRail({ selection: [], selectedFxObject: { kind: 'fade', elementId: 'el-6', side: 'out' } });
    expect(screen.getByText(/audio level ramp — the audioFadeIn\/Out domain/)).toBeInTheDocument();
    const dur = screen.getByLabelText('Duration value');
    expect(dur).toHaveValue('2.00s'); // el-6's seeded audioFadeOut
    fireEvent.change(dur, { target: { value: '0.75' } });
    fireEvent.keyDown(dur, { key: 'Enter' });
    expect(el('el-6').audioFadeOut).toBe(0.75);
  });

  it('the remove only clears the selection when it points at THAT side', () => {
    bootRail({ selection: [], selectedFxObject: { kind: 'fade', elementId: 'el-1', side: 'out' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove fade out' }));
    expect('fadeOut' in el('el-1')).toBe(false);
    // the pointing selection was side 'out' — cleared
    expect(S().selectedFxObject).toBeNull();
  });
});

describe('FxInspector — clip mode (#105: the effect stack, shared EffectsSection)', () => {
  it('a single clip selection (no FX object) shows the clip\'s EFFECT stack — not its edit params', () => {
    bootRail({ selection: ['el-1'], selectedFxObject: null }); // el-1 carries fx-1 Gaussian Blur
    expect(screen.getByRole('button', { name: 'Add effect' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Gaussian Blur' })).toBeInTheDocument();
    // NOT the clip's edit-domain sections (Transform etc. are the Edit rail's)
    expect(screen.queryByTestId('shell-inspector-group-transform-caret')).not.toBeInTheDocument();
  });

  it('multi-selection shows the aggregate message (the shared section\'s own law)', () => {
    bootRail({ selection: ['el-1', 'el-2'], selectedFxObject: null });
    expect(screen.getByText(/2 clips · 1 effects total/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add effect' })).not.toBeInTheDocument();
  });

  it('the FX object WINS over a clip selection (one sub-domain at a time)', () => {
    bootRail({ selection: ['el-1'], selectedFxObject: { kind: 'fade', elementId: 'el-1', side: 'in' } });
    expect(screen.getByRole('button', { name: 'Remove fade in' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add effect' })).not.toBeInTheDocument();
  });
});

describe('FxInspectorSection — the section form (the Edit page embeds this)', () => {
  it('renders NOTHING for a stale element id (the store guard\'s second net)', () => {
    useUi.setState({ selection: [], selectedFxObject: { kind: 'transition', elementId: 'el-gone' } });
    const { container } = render(<FxInspectorSection />);
    expect(container.firstElementChild).toBeNull();
  });

  it('renders NOTHING with no selection and no FX object', () => {
    useUi.setState({ selection: [], selectedFxObject: null });
    const { container } = render(<FxInspectorSection />);
    expect(container.firstElementChild).toBeNull();
  });

  it('a live selection re-render: selecting a fade object after a clip keeps the section honest', () => {
    useUi.setState({ selection: ['el-1'], selectedFxObject: null });
    const { rerender } = render(<FxInspectorSection />);
    expect(screen.getByRole('button', { name: 'Add effect' })).toBeInTheDocument();
    act(() => { useUi.setState({ selectedFxObject: { kind: 'fade', elementId: 'el-1', side: 'in' } }); });
    rerender(<FxInspectorSection />);
    expect(screen.getByRole('button', { name: 'Remove fade in' })).toBeInTheDocument();
  });
});

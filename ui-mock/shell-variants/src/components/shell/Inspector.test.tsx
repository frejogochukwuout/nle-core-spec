/* Inspector — spec 18 §4.4: 4-tab visibility (hidden-not-disabled), the
   NumberField field contract (shared parseTc time parser, invalid = aria-
   invalid + role=alert + nothing dispatched, Enter settles immediately, Esc
   reverts, 50 ms-debounced live preview), the effects stack editor, the
   transition editor, quick-seek, group Reset, and mixed multi-select
   aggregation (blank field writes ALL selected). Store-wiring only. */

import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Inspector } from './Inspector';
import { useUi } from '../../state/useUiStore';
import { findElement } from '../../lib/mockData';
import type { UiPatch } from '../../test/helpers';

const S = () => useUi.getState();
const el = (id: string) => findElement(S().scenes, id)!.element;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** boot a scenario then render the panel (store patch pre-paint) */
function boot(patch: UiPatch) {
  useUi.setState(patch);
  return render(<Inspector />);
}

describe('Inspector (spec 18 §4.4)', () => {
  /* ---- empty state + tab strip ---- */

  it('empty selection → empty state + a Video-only tab strip', () => {
    const { getByTestId, queryByTestId, getAllByText } = boot({ selection: [] });
    expect(getByTestId('shell-inspector-state-empty')).toBeInTheDocument();
    // header + empty-state both carry the label
    expect(getAllByText('Nothing to inspect')).toHaveLength(2);
    expect(getByTestId('shell-inspector-tab-video')).toBeInTheDocument();
    // §4.4 hidden-not-disabled: absent tabs, not disabled tabs
    expect(queryByTestId('shell-inspector-tab-audio')).not.toBeInTheDocument();
    expect(queryByTestId('shell-inspector-tab-effects')).not.toBeInTheDocument();
    expect(queryByTestId('shell-inspector-tab-transition')).not.toBeInTheDocument();
  });

  it('single video clip: 4 tabs, clip-name header, quick-seek writes the playhead', () => {
    // boot default selection el-2 (video, transitionOut, mediaId) → all 4 tabs legal
    render(<Inspector />);
    expect(screen.getAllByText('Marina interview')).toHaveLength(2); // header + SourceCard
    for (const t of ['video', 'audio', 'effects', 'transition']) {
      expect(screen.getByTestId(`shell-inspector-tab-${t}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('shell-inspector-tab-video')).toHaveAttribute('aria-selected', 'true');
    // §4.4 quick-seek rows are pure setPlayhead commands
    fireEvent.click(screen.getByTestId('quick-seek-in'));
    expect(S().playhead).toBe(8.5);
    fireEvent.click(screen.getByTestId('quick-seek-out'));
    expect(S().playhead).toBe(17);
  });

  it('tab clicks write inspectorTab; a booted tab wins on mount', () => {
    render(<Inspector />);
    fireEvent.click(screen.getByTestId('shell-inspector-tab-effects'));
    expect(S().inspectorTab).toBe('effects');
    expect(screen.getByTestId('shell-inspector-tab-effects')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'tab-effects');
  });

  it('a booted inspectorTab is the selected tab on first paint', () => {
    useUi.setState({ selection: ['el-2'], inspectorTab: 'audio' });
    render(<Inspector />);
    expect(screen.getByTestId('shell-inspector-tab-audio')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'insp-audio');
  });

  it('text element: Video+Effects tabs only (§4.4 hidden-not-disabled)', () => {
    boot({ selection: ['el-5'] }); // text on the overlay track, no following cut
    expect(screen.getByTestId('shell-inspector-tab-video')).toBeInTheDocument();
    expect(screen.getByTestId('shell-inspector-tab-effects')).toBeInTheDocument();
    // text is not audio-bearing → Audio hidden; no transition + no following cut → Transition hidden
    expect(screen.queryByTestId('shell-inspector-tab-audio')).not.toBeInTheDocument();
    expect(screen.queryByTestId('shell-inspector-tab-transition')).not.toBeInTheDocument();
  });

  it('audio element: Audio+Effects tabs only (Video needs a visual type)', () => {
    boot({ selection: ['el-6'] }); // audio element on tr-audio-1
    expect(screen.getByTestId('shell-inspector-tab-audio')).toBeInTheDocument();
    expect(screen.getByTestId('shell-inspector-tab-effects')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-inspector-tab-video')).not.toBeInTheDocument();
    expect(screen.queryByTestId('shell-inspector-tab-transition')).not.toBeInTheDocument();
  });

  it('multi-select Transition tab follows the common-subset rule', () => {
    boot({ selection: ['el-1', 'el-2'] }); // el-1 carries no transitionOut
    expect(screen.queryByTestId('shell-inspector-tab-transition')).not.toBeInTheDocument();
    // every selected clip now has one → the tab appears (no reload needed)
    act(() => { S().setTransition('el-1', {}); });
    expect(screen.getByTestId('shell-inspector-tab-transition')).toBeInTheDocument();
  });

  /* ---- mixed multi-select aggregation (§4.4) ---- */

  it('multi-select header + Mixed chip + blank field, slider hidden', () => {
    boot({ selection: ['el-1', 'el-4'] }); // opacity 100% vs 90% → mixed
    expect(screen.getByText('2 clips selected')).toBeInTheDocument();
    expect(screen.getByTestId('chip-mixed-values')).toHaveTextContent('Mixed values');
    expect(screen.queryByRole('slider', { name: 'Opacity slider' })).not.toBeInTheDocument();
    const field = screen.getByLabelText('Opacity — mixed values; typing sets all selected');
    expect(field).toHaveValue('');
    expect(field).toHaveAttribute('placeholder', '—');
  });

  it('typing into a mixed field writes ALL selected elements (50 ms debounce)', async () => {
    const user = userEvent.setup();
    boot({ selection: ['el-1', 'el-4'] });
    const field = screen.getByLabelText('Opacity — mixed values; typing sets all selected');
    await user.type(field, '80');
    // live preview: one store write per settle, never per keystroke (§4.4)
    await act(async () => { await sleep(70); });
    expect(el('el-1').opacity).toBe(0.8);
    expect(el('el-4').opacity).toBe(0.8);
  });

  it("mixed regression: entering EXACTLY the first element's value still fans out (R13 CodeRabbit fix)", () => {
    boot({ selection: ['el-1', 'el-4'] }); // opacity 100% vs 90% → mixed, value = 100 (first)
    const field = screen.getByLabelText('Opacity — mixed values; typing sets all selected');
    // one change to '100' — it equals the aggregate (= el-1's own value); the
    // old r.v !== value guard short-circuited the settle so el-4 kept 0.9.
    // The mixed field must commit unconditionally so the write reaches BOTH.
    fireEvent.change(field, { target: { value: '100' } });
    fireEvent.blur(field);
    expect(el('el-1').opacity).toBe(1);
    expect(el('el-4').opacity).toBe(1);
    // settled: the field is no longer mixed and shows the common value
    expect(screen.getByLabelText('Opacity value')).toHaveValue('100%');
  });

  it('blurring an UNTOUCHED mixed field writes nothing (no phantom fan-out)', () => {
    boot({ selection: ['el-1', 'el-4'] });
    fireEvent.blur(screen.getByLabelText('Opacity — mixed values; typing sets all selected'));
    expect(el('el-1').opacity).toBe(1);
    expect(el('el-4').opacity).toBe(0.9);
  });

  /* ---- NumberField contract (§4.4) ---- */

  it('invalid input: aria-invalid + alert + no dispatch; blur reverts the display', () => {
    render(<Inspector />); // el-2, Video tab
    const field = screen.getByLabelText('Opacity value');
    expect(field).toHaveValue('100%');
    fireEvent.change(field, { target: { value: 'abc' } });
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Not a number');
    fireEvent.keyDown(field, { key: 'Enter' }); // Enter on invalid → stays, no commit
    expect(el('el-2').opacity).toBe(1);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.blur(field); // invalid on blur → revert, nothing dispatched
    expect(field).toHaveValue('100%');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('out-of-range input shows the Range message and dispatches nothing', () => {
    render(<Inspector />);
    const field = screen.getByLabelText('Opacity value');
    fireEvent.change(field, { target: { value: '999' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Range 0…100%');
    expect(el('el-2').opacity).toBe(1);
  });

  it('Enter settles the commit immediately; Escape aborts without committing', () => {
    render(<Inspector />);
    const field = screen.getByLabelText('Opacity value');
    fireEvent.change(field, { target: { value: '50' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(el('el-2').opacity).toBe(0.5); // no debounce wait needed
    expect(field).toHaveValue('50%');
    fireEvent.change(field, { target: { value: '25' } });
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(field).toHaveValue('50%'); // aborted edit reverts
    expect(el('el-2').opacity).toBe(0.5);
  });

  it('time-based fields parse through the ONE shared TC parser (SS.s | Nf | HH:MM:SS:FF)', () => {
    boot({ selection: ['el-6'], inspectorTab: 'audio' }); // el-6 has audioFadeIn 1.0
    const field = screen.getByLabelText('Fade in value');
    expect(field).toHaveValue('1.00s');
    fireEvent.change(field, { target: { value: '12f' } }); // 12 frames @ 24 fps
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(el('el-6').audioFadeIn).toBe(0.5);
    fireEvent.change(field, { target: { value: 'nope' } });
    // the grammar hint comes from the shared parser's error branch
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid — HH:MM:SS:FF, SS.s or Nf');
    expect(el('el-6').audioFadeIn).toBe(0.5); // invalid = no dispatch
  });

  it('group Reset restores store-backed AND mock-local fields through the write path', () => {
    render(<Inspector />); // el-2
    const posX = screen.getByLabelText('Position X value');
    const opacity = screen.getByLabelText('Opacity value');
    fireEvent.change(posX, { target: { value: '500' } });
    fireEvent.keyDown(posX, { key: 'Enter' }); // mock-local transform (no ElementJSON field)
    fireEvent.change(opacity, { target: { value: '50' } });
    fireEvent.keyDown(opacity, { key: 'Enter' }); // store-backed, undoable
    expect(el('el-2').opacity).toBe(0.5);
    fireEvent.click(screen.getByRole('button', { name: 'Reset Transform' }));
    expect(el('el-2').opacity).toBe(1); // real store write, not a re-render
    expect(screen.getByLabelText('Position X value')).toHaveValue('960px'); // spec 09 default
  });

  /* ---- Effects tab ---- */

  it('effects: enable checkbox toggles the store; slider commits on release', () => {
    boot({ selection: ['el-1'] }); // fx-1 Gaussian Blur, disabled, param-less
    fireEvent.click(screen.getByTestId('shell-inspector-tab-effects'));
    const cb = screen.getByLabelText('Enable Gaussian Blur');
    expect(cb).not.toBeChecked();
    fireEvent.click(cb);
    expect(el('el-1').effects!.find((f) => f.id === 'fx-1')!.enabled).toBe(true);
    expect(cb).toBeChecked();
    // Radius: seeded display 12 px (nominal default), drag 50 → one setEffectParam on pointerup
    expect(screen.getByTestId('fx-param-value')).toHaveTextContent('12 px');
    const slider = screen.getByRole('slider', { name: 'Gaussian Blur Radius slider' });
    fireEvent.change(slider, { target: { value: '50' } });
    expect(screen.getByTestId('fx-param-value')).toHaveTextContent('50 px'); // live preview
    fireEvent.pointerUp(slider);
    expect(el('el-1').effects!.find((f) => f.id === 'fx-1')!.params!.radius).toBe(50);
  });

  it('effects picker: adds a registry effect seeded with param defaults, then closes', () => {
    boot({ selection: ['el-1'] });
    fireEvent.click(screen.getByTestId('shell-inspector-tab-effects'));
    fireEvent.click(screen.getByRole('button', { name: 'Add effect' }));
    const menu = screen.getByRole('menu', { name: 'Add effect' });
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Vignette' }));
    const fx = el('el-1').effects!;
    expect(fx.map((f) => f.name)).toEqual(['Gaussian Blur', 'Vignette']);
    expect(fx[1].params).toEqual({ amount: 50, feather: 50 }); // nominal defaults
    expect(screen.queryByRole('menu')).not.toBeInTheDocument(); // picker closed after add
    expect(screen.getByRole('button', { name: 'Add effect' })).toBeInTheDocument();
  });

  it('effects stack: reorder (first pinned), remove deletes; multi-select shows the aggregate', () => {
    useUi.setState({ selection: ['el-1'] });
    act(() => {
      S().addEffectToElement('el-1', { name: 'Vignette', enabled: true, params: { amount: 50, feather: 50 } });
    });
    render(<Inspector />);
    fireEvent.click(screen.getByTestId('shell-inspector-tab-effects'));
    expect(screen.getByRole('button', { name: 'Move Gaussian Blur up' })).toBeDisabled(); // pinned top
    fireEvent.click(screen.getByRole('button', { name: 'Move Vignette up' }));
    expect(el('el-1').effects!.map((f) => f.name)).toEqual(['Vignette', 'Gaussian Blur']);
    expect(screen.getByRole('button', { name: 'Move Vignette up' })).toBeDisabled(); // now first
    fireEvent.click(screen.getByRole('button', { name: 'Remove Gaussian Blur' }));
    expect(el('el-1').effects!.map((f) => f.name)).toEqual(['Vignette']);
  });

  it('effects multi-select: per-clip aggregate message, no single-clip editors', () => {
    boot({ selection: ['el-1', 'el-2'] }); // 1 + 0 effects
    fireEvent.click(screen.getByTestId('shell-inspector-tab-effects'));
    expect(screen.getByText(/2 clips · 1 effects total/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add effect' })).not.toBeInTheDocument();
  });

  /* ---- Transition tab ---- */

  it('hard cut offers Add crossfade → the spec 09 default lands in the store', () => {
    boot({ selection: ['el-3'] }); // no transitionOut, el-4 follows on tr-main
    fireEvent.click(screen.getByTestId('shell-inspector-tab-transition'));
    expect(screen.getByText(/Hard cut/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add crossfade' }));
    expect(el('el-3').transitionOut).toEqual({
      type: 'crossfade', presentation: 'Cross Dissolve', duration: 0.5, alignment: 0.5,
    });
    expect(screen.getByTestId('transition-presentation')).toHaveValue('Cross Dissolve');
  });

  it('transition editor: presentation select + duration commit + disabled Remove (mock boundary)', () => {
    boot({ selection: ['el-2'] }); // fixture transitionOut on el-2
    fireEvent.click(screen.getByTestId('shell-inspector-tab-transition'));
    const select = screen.getByTestId('transition-presentation');
    expect(select).toHaveValue('Cross Dissolve');
    fireEvent.change(select, { target: { value: 'Dip to Black' } });
    expect(el('el-2').transitionOut!.presentation).toBe('Dip to Black');
    const dur = screen.getByLabelText('Duration value');
    expect(dur).toHaveValue('0.75s');
    fireEvent.change(dur, { target: { value: '1.5' } }); // seconds form of the shared parser
    fireEvent.keyDown(dur, { key: 'Enter' });
    expect(el('el-2').transitionOut!.duration).toBe(1.5);
    // mock: removal has no store action → aria-disabled with the reason
    expect(screen.getByRole('button', { name: 'Remove transition (unavailable in mock)' }))
      .toHaveAttribute('aria-disabled', 'true');
  });

  it('mixed transition multi-select: __mixed__ sentinel, one change writes both', () => {
    S().setTransition('el-3', { presentation: 'Dip to Black' });
    boot({ selection: ['el-2', 'el-3'] }); // Cross Dissolve vs Dip to Black
    fireEvent.click(screen.getByTestId('shell-inspector-tab-transition'));
    const select = screen.getByTestId('transition-presentation') as HTMLSelectElement;
    expect(select).toHaveValue('__mixed__');
    expect(within(select).getByRole('option', { name: 'Mixed values' })).toBeDisabled();
    fireEvent.change(select, { target: { value: 'Wipe Left' } });
    // fan-out: one write per element (mock; real shell = coalesced batch)
    expect(el('el-2').transitionOut!.presentation).toBe('Wipe Left');
    expect(el('el-3').transitionOut!.presentation).toBe('Wipe Left');
  });

  /* ---- toolbar actions (R14 no-op wiring: honest toasts) ---- */

  it('Inspector history + More buttons answer with honest toasts, not silence', () => {
    render(<Inspector />);
    fireEvent.click(screen.getByRole('button', { name: 'Inspector history' }));
    expect(S().toasts.at(-1)).toMatchObject({
      kind: 'info',
      title: 'History',
      detail: 'panel not built in the mock — ⌘Z / ⇧⌘Z work (cheat sheet, spec 16 §3.10)',
    });
    fireEvent.click(screen.getByRole('button', { name: 'More inspector actions' }));
    expect(S().toasts.at(-1)).toMatchObject({
      kind: 'info',
      title: 'More inspector actions',
      detail: 'the inspector surface is complete for the mock (spec 18 §4.4)',
    });
  });
});

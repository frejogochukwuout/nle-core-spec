/* Inspector — R20-W3 (DESIGN-R20 D4): the TYPE-DRIVEN contract. The 4-tab
   strip is GONE (thread #53 / 18 §4.4 deviation registered): the inspector
   is ONE scroll of sections picked by selected-entity type. Pins:
   - section-visibility matrix (video / audio / text / track / effect /
     multi / empty / project),
   - selection-domain mutual exclusivity (selectTrack / selectEffect /
     setSelection — the selectedMarkerId law's mirrors),
   - the entity chip + breadcrumb (D4.3),
   - the compact [Levels | EQ] sub-tab tablist pairing (spec 18 §11.6),
   - the minimal read-only Project sheet (D4.4 descoped),
   - the R19 field contracts carried over verbatim: NumberField §4.4 commit
     semantics, mixed multi-select fan-out, effects accordion + param rows,
     transition editor, EQ bands, group Reset/collapse, quick-seek,
     ACTIVE-TRACK fallback sheet (th_mto5fdf6). Store-wiring only. */

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

/** section presence probe — the caret testid exists iff the section renders
 *  (the section-visibility matrix's spine; hidden-not-visible, §4.4 law) */
const hasSection = (slug: string) => !!screen.queryByTestId(`shell-inspector-group-${slug}-caret`);
const SECTION_MATRIX = [
  'transform', 'composite', 'speed-change', 'effects', 'transition', 'text', 'timing',
] as const;

/** expect EXACTLY the given sections from the matrix (+ audio subtabs) */
function expectSections(visible: readonly (typeof SECTION_MATRIX)[number][], audio: boolean) {
  for (const slug of SECTION_MATRIX) {
    if (visible.includes(slug)) expect(hasSection(slug)).toBe(true);
    else expect(hasSection(slug)).toBe(false);
  }
  expect(!!screen.queryByTestId('shell-inspector-subtab-levels')).toBe(audio);
  expect(!!screen.queryByTestId('shell-inspector-subtab-eq')).toBe(audio);
}

describe('Inspector (R20-W3 D4 — type-driven, no tab strip)', () => {
  /* ---- section-visibility matrix ---- */

  it('matrix · video clip: Transform/Composite/Speed Change/Audio/Effects/Transition + entity chip', () => {
    // el-2: video, transitionOut present, audio-bearing (default selection)
    render(<Inspector />);
    expectSections(['transform', 'composite', 'speed-change', 'effects', 'transition'], true);
    // entity chip: kind-colored icon + name + type label (D4.3)
    const chip = screen.getByTestId('inspector-entity-chip');
    expect(chip).toHaveAttribute('data-entity', 'clip');
    expect(screen.getByTestId('inspector-entity-name')).toHaveTextContent('Marina interview');
    expect(screen.getByTestId('inspector-entity-type')).toHaveTextContent('video');
    // §4.4 quick-seek rows are pure setPlayhead commands
    expect(screen.getAllByText('Marina interview')).toHaveLength(2); // chip + SourceCard
    fireEvent.click(screen.getByTestId('quick-seek-in'));
    expect(S().playhead).toBe(8.5);
    fireEvent.click(screen.getByTestId('quick-seek-out'));
    expect(S().playhead).toBe(17);
    // the Speed Change duration readout derives from the model
    expect(screen.getByTestId('shell-inspector-speed-duration')).toHaveTextContent('00:00:08:12');
  });

  it('matrix · audio clip: Audio + Effects only (the spatial family is hidden-not-visible)', () => {
    boot({ selection: ['el-6'] }); // audio element on tr-audio-1
    expectSections(['effects'], true);
    expect(screen.getByTestId('inspector-entity-name')).toHaveTextContent('ocean_ambience');
    expect(screen.getByTestId('inspector-entity-type')).toHaveTextContent('audio');
    // no transitionOut + no following cut → no Transition section
    expect(hasSection('transition')).toBe(false);
  });

  it('matrix · text clip: Text + Timing + Effects (no Transform/Composite/Speed/Audio)', () => {
    boot({ selection: ['el-5'] }); // text on the overlay track
    expectSections(['text', 'timing', 'effects'], false);
    expect(screen.getByTestId('inspector-entity-type')).toHaveTextContent('text');
  });

  it('matrix · multi-select: the mixed sheet (commonOf) preserved + mixed chip header', () => {
    boot({ selection: ['el-1', 'el-4'] }); // two video clips → audio-bearing common set
    expectSections(['transform', 'composite', 'speed-change', 'effects'], true);
    expect(screen.getByTestId('inspector-entity-chip')).toHaveAttribute('data-entity', 'multi');
    expect(screen.getByTestId('inspector-entity-name')).toHaveTextContent('2 clips selected');
    expect(screen.getByTestId('chip-mixed-values')).toHaveTextContent('Mixed values');
    expect(screen.queryByRole('slider', { name: 'Opacity slider' })).not.toBeInTheDocument();
    const field = screen.getByLabelText('Opacity — mixed values; typing sets all selected');
    expect(field).toHaveValue('');
    expect(field).toHaveAttribute('placeholder', '—');
  });

  it('matrix · empty selection: the R19 ACTIVE-TRACK fallback sheet (same TrackSheet)', () => {
    // playhead 16 lands inside el-2 (8.5–17) on tr-main → the main track is "active"
    const { getByText } = boot({ selection: [] });
    expect(screen.getByTestId('shell-inspector-state-track')).toBeInTheDocument();
    expect(screen.getByTestId('shell-track-sheet')).toHaveAttribute('data-via', 'fallback');
    expect(getByText('Track — V1')).toBeInTheDocument(); // the entity chip titles the sheet
    expect(screen.getByTestId('inspector-entity-chip')).toHaveAttribute('data-entity', 'track');
    expect(screen.getByTestId('shell-track-sheet-hint'))
      .toHaveTextContent('Select a clip to edit clip parameters');
    expect(screen.getByText('Main')).toBeInTheDocument(); // Kind row value
    // NO clip sections render — the Transform group is gone
    expect(screen.queryByRole('button', { name: 'Reset Transform' })).not.toBeInTheDocument();
    // not an audio track → no mixer slice
    expect(screen.queryByTestId('shell-track-sheet-output')).not.toBeInTheDocument();
  });

  it('matrix · track domain: selectedTrackId renders the TrackSheet (selected, not fallback)', () => {
    boot({ selection: [], selectedTrackId: 'tr-audio-1' });
    expect(screen.getByTestId('shell-track-sheet')).toHaveAttribute('data-via', 'selected');
    expect(screen.getByTestId('inspector-entity-name')).toHaveTextContent('Track — A1');
    expect(screen.getByTestId('shell-track-sheet-hint'))
      .toHaveTextContent('Track selected — click a clip to edit clip parameters');
    expect(screen.queryByTestId('shell-inspector-state-empty')).not.toBeInTheDocument();
    expect(hasSection('transform')).toBe(false); // no clip sections in the track domain
  });

  it('matrix · effect domain: the EffectEditor — params expand in place, chip + breadcrumb', () => {
    boot({ selection: ['el-1'], selectedEffectId: 'fx-1', selectedEffectClipId: 'el-1' });
    // chip switches to the effect entity + the nested breadcrumb (track > clip > effect)
    expect(screen.getByTestId('inspector-entity-chip')).toHaveAttribute('data-entity', 'effect');
    expect(screen.getByTestId('inspector-entity-name')).toHaveTextContent('Gaussian Blur');
    const bc = screen.getByTestId('inspector-breadcrumb');
    expect(bc).toHaveTextContent('V1');
    expect(bc).toHaveTextContent('A012_C034_beach_wide');
    expect(bc).toHaveTextContent('Gaussian Blur');
    // the row carries the accordion law; the editor panel renders in place
    const row = screen.getByTestId('shell-effect-row-fx-1');
    expect(row).toHaveAttribute('aria-expanded', 'true');
    expect(row).toHaveAttribute('aria-current', 'true');
    expect(screen.getByTestId('shell-effect-editor-fx-1')).toBeInTheDocument();
  });

  /* ---- domain mutual exclusivity (D4.2 — the selectedMarkerId mirrors) ---- */

  it('domains: selectTrack clears the clip selection; selecting a clip clears the track', () => {
    render(<Inspector />);
    act(() => { S().selectTrack('tr-audio-1'); });
    expect(S().selectedTrackId).toBe('tr-audio-1');
    expect(S().selection).toEqual([]);
    expect(screen.getByTestId('shell-track-sheet')).toBeInTheDocument();
    // selecting a clip swaps the sheet back and clears the track domain
    // (spec 05 §12.3 linked selection: el-2 selects its A/V pair el-7 too)
    act(() => { S().selectElement('el-2', false); });
    expect(S().selectedTrackId).toBe(null);
    expect(S().selection).toEqual(['el-2', 'el-7']);
    expect(hasSection('effects')).toBe(true);
    expect(screen.queryByTestId('shell-track-sheet')).not.toBeInTheDocument();
  });

  it('domains: effect selection KEEPS its clip selected; the clip deselecting clears the effect', () => {
    boot({ selection: ['el-1'] });
    act(() => { S().selectEffect('el-1', 'fx-1'); });
    expect(S().selectedEffectId).toBe('fx-1');
    expect(S().selection).toEqual(['el-1']); // the clip stays selected (accordion in place)
    expect(screen.getByTestId('shell-effect-editor-fx-1')).toBeInTheDocument();
    // the clip deselects → the effect domain dies with it
    act(() => { S().setSelection(['el-2']); });
    expect(S().selectedEffectId).toBe(null);
    expect(S().selectedEffectClipId).toBe(null);
    // rail back on the plain clip sheet — no editor, no effect chip
    expect(screen.queryByTestId('shell-effect-editor-fx-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('inspector-entity-chip')).toHaveAttribute('data-entity', 'clip');
  });

  it('domains: a stale effect id (effect removed) collapses the accordion — removeEffect clears it', () => {
    boot({ selection: ['el-1'], selectedEffectId: 'fx-1', selectedEffectClipId: 'el-1' });
    fireEvent.click(screen.getByRole('button', { name: 'Remove Gaussian Blur' }));
    expect(el('el-1').effects).toHaveLength(0);
    expect(S().selectedEffectId).toBe(null);
    expect(screen.getByTestId('inspector-entity-chip')).toHaveAttribute('data-entity', 'clip');
  });

  /* ---- entity chip + project sheet (D4.3 / D4.4 descoped) ---- */

  it('project sheet: read-only summary + the honest C58 note; selecting an entity exits', () => {
    boot({ inspectorProjectMode: true });
    expect(screen.getByTestId('inspector-entity-chip')).toHaveAttribute('data-entity', 'project');
    const sheet = screen.getByTestId('shell-inspector-project');
    expect(within(sheet).getByText('Beach Doc — Rough Cut')).toBeInTheDocument();
    expect(within(sheet).getByText('24')).toBeInTheDocument(); // fps
    expect(within(sheet).getByText('1920×1080')).toBeInTheDocument();
    expect(screen.getByTestId('shell-inspector-project-note'))
      .toHaveTextContent(/Project-level editing lands with C58/);
    // no clip/track sections render in project mode
    expect(hasSection('transform')).toBe(false);
    // selecting ANY entity exits project mode (the store law)
    act(() => { S().setSelection(['el-2']); });
    expect(S().inspectorProjectMode).toBe(false);
    expect(screen.queryByTestId('shell-inspector-project')).not.toBeInTheDocument();
    expect(hasSection('transform')).toBe(true);
  });

  /* ---- the compact [Levels | EQ] sub-tab tablist (spec 18 §11.6 KEPT) ---- */

  it('Audio sub-tabs: tablist semantics with tab/tabpanel pairing (spec 18 §11.6)', () => {
    boot({ selection: ['el-6'] });
    const tabs = screen.getByRole('tablist', { name: 'Audio sections' });
    const levels = within(tabs).getByTestId('shell-inspector-subtab-levels');
    const eq = within(tabs).getByTestId('shell-inspector-subtab-eq');
    expect(levels).toHaveAttribute('role', 'tab');
    expect(levels).toHaveAttribute('aria-selected', 'true');
    expect(levels).toHaveAttribute('aria-controls', 'insp-audio-levels');
    expect(eq).toHaveAttribute('aria-selected', 'false');
    expect(eq).toHaveAttribute('aria-controls', 'insp-audio-eq');
    // both panels mount; only the selected one is visible (§11.6 pairing).
    // The hidden panel is fetched by id (RTL's a11y tree prunes hidden
    // subtrees) — the pairing law is pinned from BOTH sides: tab aria-controls
    // → panel id, panel aria-labelledby → tab id.
    const levelsPanel = screen.getByRole('tabpanel', { name: 'Levels' });
    const eqPanel = document.getElementById('insp-audio-eq') as HTMLElement;
    expect(eqPanel).not.toBeNull();
    expect(eqPanel).toHaveAttribute('role', 'tabpanel');
    expect(eqPanel).toHaveAttribute('aria-labelledby', 'tab-audio-eq');
    expect(screen.getByTestId('shell-inspector-subtab-eq')).toHaveAttribute('id', 'tab-audio-eq');
    expect(levelsPanel).toBeVisible();
    expect(eqPanel).not.toBeVisible();
    // switching hides/shows the pair (aria-labelledby back-references)
    fireEvent.click(eq);
    expect(eq).toHaveAttribute('aria-selected', 'true');
    expect(levelsPanel).not.toBeVisible();
    expect(eqPanel).toBeVisible();
    expect(screen.getByTestId('shell-inspector-eq')).toBeVisible();
    // sub-tab state is LOCAL — no store surface (inspectorTab is gone)
    expect('inspectorTab' in S()).toBe(false);
  });

  /* ---- the §4.4 field contracts, carried over from the tab era ---- */

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

  it("mixed regression: entering EXACTLY the first element's value still fans out (R13 fix)", () => {
    boot({ selection: ['el-1', 'el-4'] }); // opacity 100% vs 90% → mixed, value = 100 (first)
    const field = screen.getByLabelText('Opacity — mixed values; typing sets all selected');
    fireEvent.change(field, { target: { value: '100' } });
    fireEvent.blur(field);
    expect(el('el-1').opacity).toBe(1);
    expect(el('el-4').opacity).toBe(1);
    expect(screen.getByLabelText('Opacity value')).toHaveValue('100%');
  });

  it('blurring an UNTOUCHED mixed field writes nothing (no phantom fan-out)', () => {
    boot({ selection: ['el-1', 'el-4'] });
    fireEvent.blur(screen.getByLabelText('Opacity — mixed values; typing sets all selected'));
    expect(el('el-1').opacity).toBe(1);
    expect(el('el-4').opacity).toBe(0.9);
  });

  it('invalid input: aria-invalid + alert + no dispatch; blur reverts the display', () => {
    render(<Inspector />); // el-2
    const field = screen.getByLabelText('Opacity value');
    expect(field).toHaveValue('100%');
    fireEvent.change(field, { target: { value: 'abc' } });
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Not a number');
    fireEvent.keyDown(field, { key: 'Enter' }); // Enter on invalid → stays, no commit
    expect(el('el-2').opacity).toBe(1);
    fireEvent.blur(field); // invalid on blur → revert, nothing dispatched
    expect(field).toHaveValue('100%');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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
    boot({ selection: ['el-6'] }); // el-6 has audioFadeIn 1.0
    const field = screen.getByLabelText('Fade in value');
    expect(field).toHaveValue('1.00s');
    fireEvent.change(field, { target: { value: '12f' } }); // 12 frames @ 24 fps
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(el('el-6').audioFadeIn).toBe(0.5);
    fireEvent.change(field, { target: { value: 'nope' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid — HH:MM:SS:FF, SS.s or Nf');
    expect(el('el-6').audioFadeIn).toBe(0.5); // invalid = no dispatch
  });

  it('section Reset restores store-backed AND mock-local fields through the write path', () => {
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

  it('section collapse: the caret hides the section body (aria-expanded law, all sections)', () => {
    boot({ selection: ['el-6'] });
    const caret = screen.getByTestId('shell-inspector-group-clip-volume-caret');
    expect(screen.getByLabelText('Volume value')).toBeVisible();
    fireEvent.click(caret);
    expect(caret).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Volume value')).not.toBeVisible();
    fireEvent.click(caret);
    expect(screen.getByLabelText('Volume value')).toBeVisible();
  });

  /* ---- Text + Timing sections (text clips) ---- */

  it('Text section: content LiveText writes el.text; CPS is derived; timing rides the real commands', () => {
    boot({ selection: ['el-5'] });
    // CPS = characters / duration (derived readout — empty text clips read 0)
    expect(screen.getByTestId('shell-inspector-text-cps')).toHaveTextContent('0.0 cps');
    // content — the §4.4 free-text commit contract (textarea: blur settles,
    // Enter is a newline)
    const content = screen.getByTestId('shell-inspector-text-content');
    fireEvent.change(content, { target: { value: 'FISHERWOMAN OF THE COAST' } });
    fireEvent.blur(content);
    expect(el('el-5').text).toBe('FISHERWOMAN OF THE COAST');
    // after the content commit: 24 chars / 3.25 s
    expect(screen.getByTestId('shell-inspector-text-cps')).toHaveTextContent('7.4 cps');
    // Timing: In via moveElement (real overlap-law command)
    const inField = screen.getByTestId('shell-inspector-timing-in');
    expect(inField).toHaveValue('00:00:08:18'); // 8.75 s
    fireEvent.change(inField, { target: { value: '7' } });
    fireEvent.keyDown(inField, { key: 'Enter' });
    expect(el('el-5').startTime).toBe(7);
    // Duration via trimElement right edge (neighbor/source-extent bounds)
    const durField = screen.getByTestId('shell-inspector-timing-duration');
    expect(durField).toHaveValue('00:00:03:06'); // 3.25 s
    fireEvent.change(durField, { target: { value: '2' } });
    fireEvent.keyDown(durField, { key: 'Enter' });
    expect(el('el-5').duration).toBe(2);
  });

  /* ---- Effects section (accordion + param rows + stack ops) ---- */

  it('effects: the row click selects the effect; enable checkbox + slider commit through the store', () => {
    boot({ selection: ['el-1'] }); // fx-1 Gaussian Blur, disabled
    // the params render ONLY when the row is selected (the accordion law)
    expect(screen.queryByTestId('shell-effect-editor-fx-1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('shell-effect-row-fx-1'));
    expect(S().selectedEffectId).toBe('fx-1');
    const cb = screen.getByLabelText('Enable Gaussian Blur');
    expect(cb).not.toBeChecked();
    fireEvent.click(cb);
    expect(el('el-1').effects!.find((f) => f.id === 'fx-1')!.enabled).toBe(true);
    // Radius: seeded display 12 px (nominal default), drag 50 → one setEffectParam on pointerup
    expect(screen.getByTestId('fx-param-value')).toHaveTextContent('12 px');
    const slider = screen.getByRole('slider', { name: 'Gaussian Blur Radius slider' });
    fireEvent.change(slider, { target: { value: '50' } });
    expect(screen.getByTestId('fx-param-value')).toHaveTextContent('50 px'); // live preview
    fireEvent.pointerUp(slider);
    expect(el('el-1').effects!.find((f) => f.id === 'fx-1')!.params!.radius).toBe(50);
    // clicking the selected row again collapses (selectEffect null)
    fireEvent.click(screen.getByTestId('shell-effect-row-fx-1'));
    expect(S().selectedEffectId).toBe(null);
    expect(screen.queryByTestId('shell-effect-editor-fx-1')).not.toBeInTheDocument();
  });

  it('effects picker: adds a registry effect seeded with param defaults, then closes', () => {
    boot({ selection: ['el-1'] });
    fireEvent.click(screen.getByRole('button', { name: 'Add effect' }));
    const menu = screen.getByRole('menu', { name: 'Add effect' });
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Vignette' }));
    const fx = el('el-1').effects!;
    expect(fx.map((f) => f.name)).toEqual(['Gaussian Blur', 'Vignette']);
    expect(fx[1].params).toEqual({ amount: 50, feather: 50 }); // nominal defaults
    expect(screen.queryByRole('menu')).not.toBeInTheDocument(); // picker closed after add
  });

  it('effects stack: reorder (first pinned), remove deletes; multi-select shows the aggregate', () => {
    useUi.setState({ selection: ['el-1'] });
    act(() => {
      S().addEffectToElement('el-1', { name: 'Vignette', enabled: true, params: { amount: 50, feather: 50 } });
    });
    render(<Inspector />);
    expect(screen.getByRole('button', { name: 'Move Gaussian Blur up' })).toBeDisabled(); // pinned top
    fireEvent.click(screen.getByRole('button', { name: 'Move Vignette up' }));
    expect(el('el-1').effects!.map((f) => f.name)).toEqual(['Vignette', 'Gaussian Blur']);
    expect(screen.getByRole('button', { name: 'Move Vignette up' })).toBeDisabled(); // now first
    fireEvent.click(screen.getByRole('button', { name: 'Remove Gaussian Blur' }));
    expect(el('el-1').effects!.map((f) => f.name)).toEqual(['Vignette']);
  });

  it('effects multi-select: per-clip aggregate message, no single-clip editors', () => {
    boot({ selection: ['el-1', 'el-2'] }); // 1 + 0 effects
    expect(screen.getByText(/2 clips · 1 effects total/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add effect' })).not.toBeInTheDocument();
  });

  /* ---- Transition section ---- */

  it('hard cut offers Add crossfade → the spec 09 default lands in the store', () => {
    boot({ selection: ['el-3'] }); // no transitionOut, el-4 follows on tr-main
    expect(screen.getByText(/Hard cut/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add crossfade' }));
    expect(el('el-3').transitionOut).toEqual({
      type: 'crossfade', presentation: 'Cross Dissolve', duration: 0.5, alignment: 0.5,
    });
    expect(screen.getByTestId('transition-presentation')).toHaveValue('Cross Dissolve');
  });

  it('transition editor: presentation select + duration commit + LIVE Remove (R23-WA removeTransition)', () => {
    boot({ selection: ['el-2'] }); // fixture transitionOut on el-2
    const select = screen.getByTestId('transition-presentation');
    expect(select).toHaveValue('Cross Dissolve');
    fireEvent.change(select, { target: { value: 'Dip to Black' } });
    expect(el('el-2').transitionOut!.presentation).toBe('Dip to Black');
    const dur = screen.getByLabelText('Duration value');
    expect(dur).toHaveValue('0.75s');
    fireEvent.change(dur, { target: { value: '1.5' } }); // seconds form of the shared parser
    fireEvent.keyDown(dur, { key: 'Enter' });
    expect(el('el-2').transitionOut!.duration).toBe(1.5);
    /* R23-WA (DESIGN-R23 D-A3): Remove is LIVE now — removeTransition is a
       real delete-aware store action; the old "unavailable in mock" pin died
       with the boundary (R23-B correction 1: the patch type can't unset). */
    const remove = screen.getByRole('button', { name: 'Remove transition' });
    expect(remove).not.toHaveAttribute('aria-disabled');
    fireEvent.click(remove);
    expect(el('el-2').transitionOut).toBeUndefined();
  });

  it('mixed transition multi-select: __mixed__ sentinel, one change writes both', () => {
    S().setTransition('el-3', { presentation: 'Dip to Black' });
    boot({ selection: ['el-2', 'el-3'] }); // Cross Dissolve vs Dip to Black
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

  /* ---- the R19 audio sections (real store writes, carried over) ---- */

  it('Clip Volume: linear model displays as dB; dB edits write 10^(dB/20)', () => {
    boot({ selection: ['el-6'] });
    const field = screen.getByLabelText('Volume value');
    expect(field).toHaveValue('-9.1 dB'); // 20·log10(0.35)
    fireEvent.change(field, { target: { value: '0' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(el('el-6').volume).toBe(1); // 0 dB = unity
    fireEvent.change(field, { target: { value: '12' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(el('el-6').volume).toBeCloseTo(10 ** (12 / 20), 5);
    fireEvent.click(screen.getByRole('button', { name: 'Reset Clip Volume' }));
    expect(el('el-6').volume).toBe(1);
    expect(screen.getByLabelText('Volume value')).toHaveValue('0.0 dB');
  });

  it('Clip Pan + Clip Pitch write el.pan / pitchSemitones / pitchCents', () => {
    boot({ selection: ['el-6'] });
    fireEvent.change(screen.getByLabelText('Pan value'), { target: { value: '0.5' } });
    fireEvent.keyDown(screen.getByLabelText('Pan value'), { key: 'Enter' });
    expect(el('el-6').pan).toBe(0.5);
    fireEvent.click(screen.getByRole('button', { name: 'Reset Clip Pan' }));
    expect(el('el-6').pan).toBe(0);
    fireEvent.change(screen.getByLabelText('Semi Tones value'), { target: { value: '3' } });
    fireEvent.keyDown(screen.getByLabelText('Semi Tones value'), { key: 'Enter' });
    expect(el('el-6').pitchSemitones).toBe(3);
    fireEvent.change(screen.getByLabelText('Cents value'), { target: { value: '-40' } });
    fireEvent.keyDown(screen.getByLabelText('Cents value'), { key: 'Enter' });
    expect(el('el-6').pitchCents).toBe(-40);
    fireEvent.click(screen.getByRole('button', { name: 'Reset Clip Pitch' }));
    expect(el('el-6').pitchSemitones).toBe(0);
    expect(el('el-6').pitchCents).toBe(0);
  });

  it('Clip Equalizer: 4 bands ±24 dB — band write preserves the other bands; per-band + section reset', () => {
    boot({ selection: ['el-6'] }); // eq [2, -1, 0, -2]
    fireEvent.click(screen.getByTestId('shell-inspector-subtab-eq'));
    const b1 = screen.getByTestId('shell-inspector-eq-slider-1');
    expect(b1).toHaveValue('2');
    expect(screen.getByTestId('shell-inspector-eq-value-4')).toHaveTextContent('-2');
    fireEvent.change(b1, { target: { value: '6' } });
    expect(screen.getByTestId('shell-inspector-eq-value-1')).toHaveTextContent('+6'); // live preview
    fireEvent.pointerUp(b1);
    expect(el('el-6').eq).toEqual([6, -1, 0, -2]); // other bands preserved
    fireEvent.click(screen.getByTestId('shell-inspector-eq-reset-1'));
    expect(el('el-6').eq).toEqual([0, -1, 0, -2]); // per-band reset zeroes ONLY band 1
    fireEvent.click(screen.getByRole('button', { name: 'Reset Clip Equalizer' }));
    expect(el('el-6').eq).toEqual([0, 0, 0, 0]);
    for (const hz of ['62', '250', '1K', '4K', '16K']) expect(screen.getByText(hz)).toBeInTheDocument();
  });

  it('EQ multi-select: mixed bands hide the sliders; a band reset writes ALL selected', () => {
    // el-6 eq [2,-1,0,-2] vs el-2 (no eq → [0,0,0,0]) → mixed
    boot({ selection: ['el-6', 'el-2'] });
    fireEvent.click(screen.getByTestId('shell-inspector-subtab-eq'));
    expect(screen.getAllByTestId('chip-mixed-values').length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByTestId('shell-inspector-eq-slider-1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('shell-inspector-eq-reset-2'));
    expect(el('el-6').eq).toEqual([2, 0, 0, -2]); // only band 2 written, bands 1/4 kept
    expect(el('el-2').eq).toEqual([0, 0, 0, 0]); // fanned out to the whole selection
  });

  /* ---- the fallback sheet's REAL toggles (th_mto5fdf6, carried over) ---- */

  it('fallback toggles are REAL: toggleTrackCmd flips the track (undoable)', () => {
    boot({ selection: [] }); // tr-main (playhead 16)
    const mute = screen.getByTestId('shell-track-sheet-muted');
    expect(mute).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(mute);
    const track = () => S().scenes.find((sc) => sc.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-main')!;
    expect(track().muted).toBe(true);
    expect(mute).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTestId('shell-track-sheet-locked'));
    expect(track().locked).toBe(true);
    // withHistory — one undo per toggle (lock was the last)
    act(() => { S().undo(); });
    expect(track().locked).toBe(false);
    expect(track().muted).toBe(true); // still flipped — separate history entry
    act(() => { S().undo(); });
    expect(track().muted).toBe(false);
  });

  it('audio track sheet: mixer slice (fader/pan/outputBus) + Track FX inserts + role + lane height', () => {
    boot({ selection: [], selectedTrackId: 'tr-audio-1' });
    expect(screen.getByText('Dialogue')).toBeInTheDocument(); // mixer role tag
    // lane height: the GLOBAL pref select (B3 seal) — real view-state write
    fireEvent.change(screen.getByTestId('shell-track-sheet-height'), { target: { value: 'tall' } });
    expect(S().trackHeightPref).toBe('tall');
    // fader: slider live preview + commit on release
    const slider = screen.getByRole('slider', { name: 'Fader slider' });
    expect(slider).toHaveValue('-3'); // createMixerScene seeds A1 at −3 dB
    fireEvent.change(slider, { target: { value: '-12' } });
    fireEvent.pointerUp(slider);
    expect(S().mixer.tracks['tr-audio-1'].fader).toBe(-12);
    // Track FX inserts + output bus are REAL setMixerTrack writes
    fireEvent.change(screen.getByTestId('shell-track-sheet-insert-2'), { target: { value: 'Comp' } });
    expect(S().mixer.tracks['tr-audio-1'].inserts).toEqual(['EQ', 'Comp']);
    fireEvent.change(screen.getByTestId('shell-track-sheet-output'), { target: { value: '1' } });
    expect(S().mixer.tracks['tr-audio-1'].outputBus).toBe(1);
  });

  /* ---- Composite section (blend, mock-local honesty) ---- */

  it('Composite: opacity writes the model; blend is the documented mock-local select', () => {
    render(<Inspector />); // el-2
    const blend = screen.getByTestId('shell-inspector-blend') as HTMLSelectElement;
    expect(blend).toHaveValue('Normal');
    fireEvent.change(blend, { target: { value: 'Screen' } });
    expect(blend).toHaveValue('Screen'); // local state — no model field (documented)
    expect(el('el-2').opacity).toBe(1); // blend never touches the doc slice
    expect(screen.getByLabelText('Opacity value')).toHaveValue('100%');
  });
});

/* ---------- R23-WA (DESIGN-R23 D-A4): the FX editor embedded in the Edit rail ---------- */

describe('R23-WA: the FX section embeds at the TOP of the Edit-page rail (D-A4)', () => {
  it('a selected fade object: the Fade editor rides FIRST, the clip\'s own sections stay below', () => {
    boot({ selection: ['el-1'], selectedFxObject: { kind: 'fade', elementId: 'el-1', side: 'in' } });
    // the shared section form (the FX page's rail mounts the SAME component)
    expect(screen.getByRole('button', { name: 'Remove fade in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Duration value')).toHaveValue('0.50s');
    // the clip's edit sections still render below (one scroll, D4.1)
    expect(hasSection('transform')).toBe(true);
  });

  it('a selected transition with NO clip selection OWNS the body (no track-sheet fallback, no empty state)', () => {
    boot({ selection: [], selectedFxObject: { kind: 'transition', elementId: 'el-2' } });
    expect(screen.getByTestId('transition-presentation')).toHaveValue('Cross Dissolve');
    expect(screen.queryByTestId('shell-track-sheet')).not.toBeInTheDocument();
    expect(screen.queryByTestId('shell-inspector-state-empty')).not.toBeInTheDocument();
  });

  it('the embed clears when the FX domain clears (selectMarker law) — the normal rail returns', () => {
    boot({ selection: [], selectedFxObject: { kind: 'transition', elementId: 'el-2' } });
    act(() => { S().selectMarker('mk-1'); });
    // the marker domain took over — the FX editor unmounts, the empty-selection
    // fallback sheet returns (the AppShell swaps the whole rail for markers;
    // this panel's own fallback law is the observable here)
    expect(screen.queryByTestId('transition-presentation')).not.toBeInTheDocument();
    expect(screen.getByTestId('shell-track-sheet')).toHaveAttribute('data-via', 'fallback');
  });

  /* R23-FIX (review-sweep item 4, R2-F2): the entity chip names the FX OBJECT
     while the FX domain holds — the branch rides BEFORE the fallbackTrack, so
     the chip never claims the playhead-derived active-track sheet while the
     FX rail is editing a transition/fade (the lying-chip-during-FX-ownership
     bug). */
  it('R23-FIX item 4: a transition-owned chip — entity fx-object, name = the presentation, typeLabel transition (never the fallback track)', () => {
    boot({ selection: [], selectedFxObject: { kind: 'transition', elementId: 'el-2' } });
    const chip = screen.getByTestId('inspector-entity-chip');
    expect(chip).toHaveAttribute('data-entity', 'fx-object');
    expect(screen.getByTestId('inspector-entity-name')).toHaveTextContent('Cross Dissolve');
    expect(screen.getByTestId('inspector-entity-type')).toHaveTextContent('transition');
    expect(chip.querySelector('[data-testid="inspector-entity-name"]')).not.toHaveTextContent('V1'); // not the fallback track sheet title
  });

  it('R23-FIX item 4: a fade-owned chip — "Fade In — {clip name}", typeLabel fade', () => {
    boot({ selection: [], selectedFxObject: { kind: 'fade', elementId: 'el-1', side: 'in' } });
    expect(screen.getByTestId('inspector-entity-chip')).toHaveAttribute('data-entity', 'fx-object');
    expect(screen.getByTestId('inspector-entity-name')).toHaveTextContent('Fade In — A012_C034_beach_wide'); // el-1's clip name
    expect(screen.getByTestId('inspector-entity-type')).toHaveTextContent('fade');
  });
});
